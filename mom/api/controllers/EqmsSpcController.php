<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS SPC Controller — Statistical Process Control chart management.
 *
 * Control chart state machine:
 *   active                → recalculate-limits, acknowledge-violation, create-deviation
 *   violation_acknowledged → recalculate-limits, create-deviation, acknowledge-violation
 *   deviation_raised       → acknowledge-violation, recalculate-limits
 *
 * Key actions:
 *   recalculate-limits: recompute UCL/LCL/CL from historical data
 *   acknowledge-violation: record acknowledgement of an OOC/OOS SPC violation
 *   create-deviation: raise an eqms_deviations record from a SPC violation
 *
 * Tables: mes_spc_control_limits (chart config), spc_data (observations),
 *         mes_spc_violations (violations), eqms_spc_violation_acks (acks)
 *
 * Standards: IATF 16949 §9.1.1.3, AS9100D §9.1, ISO 7870
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsSpcController extends EqmsBaseController
{
    private const CHART_TABLE = 'mes_spc_control_limits';
    private const OBS_TABLE   = 'spc_data';
    private const ENTITY_TYPE = 'spc_chart';
    private const MODULE      = 'spc';

    private const STATE_MACHINE = [
        'active'                 => ['recalculate-limits', 'acknowledge-violation', 'create-deviation'],
        'violation_acknowledged' => ['recalculate-limits', 'create-deviation', 'acknowledge-violation'],
        'deviation_raised'       => ['acknowledge-violation', 'recalculate-limits'],
    ];

    private function spcWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_engineer', 'qa_manager', 'process_engineer',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadChart(string $chartId): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::CHART_TABLE . " WHERE limit_id = :id LIMIT 1",
            [':id' => $chartId]
        );
        if (empty($row)) {
            $this->error('spc_chart_not_found', 404, "SPC control limit record '{$chartId}' not found.");
        }
        return $row[0];
    }

    // ── Query & Metrics ───────────────────────────────────────────────────────

    /** POST /eqms/spc/query — Paginated SPC control limit records. */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(cl.item_id ILIKE :search OR cl.characteristic_id ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['chart_type', 'item_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "cl.{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }
        // legacy product_id filter maps to item_id
        if (!empty($q['filters']['product_id']) && empty($q['filters']['item_id'])) {
            $conditions[] = "cl.item_id = :item_id";
            $params[':item_id'] = $q['filters']['product_id'];
        }
        if (isset($q['filters']['is_current'])) {
            $conditions[] = "cl.is_current = :is_current";
            $params[':is_current'] = $q['filters']['is_current'] ? 'true' : 'false';
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['item_id', 'characteristic_id', 'chart_type', 'valid_from'], true)
                  ? "cl.{$q['sort_by']}" : 'cl.valid_from';

        $items = $this->data->query(
            "SELECT cl.limit_id AS chart_id, cl.item_id, cl.characteristic_id AS characteristic,
                    cl.chart_type, cl.subgroup_size AS sample_size,
                    cl.ucl_xbar AS ucl, cl.lcl_xbar AS lcl, cl.cl_xbar AS cl,
                    cl.cp, cl.cpk, cl.ppk, cl.is_current, cl.valid_from AS created_at
             FROM " . self::CHART_TABLE . " cl
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::CHART_TABLE . " cl WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('spc_charts', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/spc/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byChartType = $this->data->query(
            "SELECT chart_type, COUNT(*) AS count FROM " . self::CHART_TABLE . " WHERE is_current = true GROUP BY chart_type"
        ) ?? [];

        $totalCurrent = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::CHART_TABLE . " WHERE is_current = true"
        ) ?? 0);

        $violationCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM mes_spc_violations WHERE acknowledged = false"
        ) ?? 0);

        $recentViolations = $this->data->query(
            "SELECT v.violation_id, v.detected_at, v.item_id, v.characteristic_id,
                    v.rule_violated, v.violation_value, v.acknowledged
             FROM mes_spc_violations v
             ORDER BY v.detected_at DESC LIMIT 10"
        ) ?? [];

        $byItem = $this->data->query(
            "SELECT item_id, COUNT(*) AS count FROM " . self::OBS_TABLE . "
             WHERE recorded_at > NOW() - INTERVAL '30 days'
             GROUP BY item_id ORDER BY count DESC LIMIT 10"
        ) ?? [];

        $this->success([
            'metrics' => [
                'by_chart_type'     => $byChartType,
                'total_current'     => $totalCurrent,
                'violation_count'   => $violationCount,
                'recent_violations' => $recentViolations,
                'active_items_30d'  => $byItem,
            ],
        ]);
    }

    /** POST /eqms/spc/lookup */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body = $this->jsonBody();
        $ids  = is_array($body['ids'] ?? null) ? $body['ids'] : [];
        if (empty($ids)) {
            $this->success(['records' => []]);
        }

        $placeholders = implode(',', array_map(fn($i) => ":id{$i}", array_keys($ids)));
        $params       = [];
        foreach ($ids as $i => $id) {
            $params[":id{$i}"] = $id;
        }

        $rows = $this->data->query(
            "SELECT limit_id AS chart_id, item_id, characteristic_id AS characteristic, is_current
             FROM " . self::CHART_TABLE . " WHERE limit_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── Detail & Update ───────────────────────────────────────────────────────

    /** GET /eqms/spc/{id} — Full chart with recent observations. */
    public function detail(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $chartId = $this->requirePathId('id', 'chart_id');
        $chart   = $this->loadChart($chartId);

        $limit = min(500, max(1, (int)($this->query('obs_limit', '100'))));

        $observations = $this->data->query(
            "SELECT spc_id AS observation_id, recorded_at AS observed_at,
                    sample_value AS value, subgroup_number AS sample_number,
                    out_of_control, item_id, characteristic
             FROM " . self::OBS_TABLE . "
             WHERE item_id = :id
             ORDER BY recorded_at DESC
             LIMIT :lim",
            [':id' => $chart['item_id'] ?? $chartId, ':lim' => $limit]
        ) ?? [];

        $this->success(['chart' => $chart, 'observations' => $observations]);
    }

    /** PATCH /eqms/spc/{id} — Update chart configuration. */
    public function update(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcWriteRoles());
        $chartId = $this->requirePathId('id', 'chart_id');
        $chart   = $this->loadChart($chartId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $chartId];
        $updatable = ['characteristic_id', 'subgroup_size', 'ucl_xbar', 'lcl_xbar', 'cl_xbar',
                      'ucl_range', 'lcl_range', 'cl_range'];

        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]           = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (empty($sets)) {
            $this->error('no_fields_to_update', 400);
        }

        $this->data->execute(
            "UPDATE " . self::CHART_TABLE . " SET " . implode(', ', $sets) . " WHERE limit_id = :id",
            $params
        );

        $this->success(['chart' => $this->loadChart($chartId)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $chartId = $this->requirePathId('id', 'chart_id');
        $this->loadChart($chartId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $chartId);
    }

    public function export(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $chartId = $this->requirePathId('id', 'chart_id');
        $this->loadChart($chartId);
        $this->serveExport(self::MODULE, $chartId, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /**
     * POST /eqms/spc/{id}/actions/recalculate-limits
     * Recompute UCL/LCL/CL from historical observations.
     */
    public function actionRecalculateLimits(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcWriteRoles());
        $chartId = $this->requirePathId('id', 'chart_id');
        $chart   = $this->loadChart($chartId);

        $body        = $this->jsonBody();
        $dataSource  = trim((string)($body['data_source'] ?? 'historical'));
        $sampleSize  = isset($body['sample_size']) ? (int)$body['sample_size'] : (int)($chart['subgroup_size'] ?? 5);

        if ($sampleSize < 2) {
            $this->error('invalid_sample_size', 400, "'sample_size' must be >= 2 for control limit calculation.");
        }

        // Compute stats from recent observations for this item/characteristic
        $stats = $this->data->query(
            "SELECT
                 AVG(sample_value)      AS grand_mean,
                 STDDEV_POP(sample_value) AS pop_stddev,
                 COUNT(*)               AS obs_count,
                 MAX(sample_value)      AS max_val,
                 MIN(sample_value)      AS min_val
             FROM " . self::OBS_TABLE . "
             WHERE item_id = :item_id
               AND characteristic = :char
               AND recorded_at > NOW() - INTERVAL '90 days'",
            [':item_id' => (string)($chart['item_id'] ?? ''), ':char' => (string)($chart['characteristic_id'] ?? '')]
        );

        if (empty($stats) || $stats[0]['obs_count'] < $sampleSize) {
            $this->error('insufficient_data', 422,
                "Insufficient observations to recalculate control limits. Need at least {$sampleSize} data points.");
        }

        $s   = $stats[0];
        $mean    = (float)($s['grand_mean'] ?? 0);
        $stddev  = (float)($s['pop_stddev'] ?? 0);

        // 3-sigma control limits
        $cl  = round($mean, 6);
        $ucl = round($mean + 3 * $stddev, 6);
        $lcl = round($mean - 3 * $stddev, 6);

        $this->data->execute(
            "UPDATE " . self::CHART_TABLE . "
             SET cl_xbar = :cl, ucl_xbar = :ucl, lcl_xbar = :lcl,
                 subgroup_size = :ss
             WHERE limit_id = :id",
            [':cl' => $cl, ':ucl' => $ucl, ':lcl' => $lcl, ':ss' => $sampleSize, ':id' => $chartId]
        );

        $this->emitQualityEvent('eqms.spc.limits_recalculated', self::ENTITY_TYPE, $chartId, [
            'cl'          => $cl,
            'ucl'         => $ucl,
            'lcl'         => $lcl,
            'obs_count'   => (int)$s['obs_count'],
            'data_source' => $dataSource,
        ], $user);

        $this->success([
            'chart'      => $this->loadChart($chartId),
            'new_limits' => ['cl' => $cl, 'ucl' => $ucl, 'lcl' => $lcl],
            'statistics' => [
                'grand_mean'  => $mean,
                'pop_stddev'  => $stddev,
                'obs_count'   => (int)$s['obs_count'],
                'sample_size' => $sampleSize,
            ],
        ]);
    }

    /**
     * POST /eqms/spc/{id}/actions/acknowledge-violation
     * Acknowledge an OOC/OOS SPC rule violation point.
     */
    public function actionAcknowledgeViolation(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcWriteRoles());
        $chartId = $this->requirePathId('id', 'chart_id');
        $chart   = $this->loadChart($chartId);

        $body                   = $this->jsonBody();
        $violationPointId       = trim((string)($body['violation_point_id'] ?? ''));
        $acknowledgementReason  = trim((string)($body['acknowledgement_reason'] ?? ''));
        $actionTaken            = trim((string)($body['action_taken'] ?? ''));

        if ($violationPointId === '') {
            $this->error('violation_point_id_required', 400, "'violation_point_id' (mes_spc_violations.violation_id) is required.");
        }
        if ($acknowledgementReason === '') {
            $this->error('acknowledgement_reason_required', 400);
        }

        $actor = (string)($user['username'] ?? 'unknown');

        // Mark the specific violation as acknowledged in mes_spc_violations
        $this->data->execute(
            "UPDATE mes_spc_violations
             SET acknowledged = true,
                 acknowledged_by = :by,
                 acknowledged_at = now(),
                 corrective_action = :action
             WHERE violation_id = :oid",
            [
                ':by'     => $actor,
                ':action' => $actionTaken ?: $acknowledgementReason,
                ':oid'    => $violationPointId,
            ]
        );

        // Check whether all violations for this item/characteristic are now acknowledged
        $unacknowledgedCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM mes_spc_violations
             WHERE item_id = :item_id AND characteristic_id = :char AND acknowledged = false",
            [':item_id' => (string)($chart['item_id'] ?? ''), ':char' => (string)($chart['characteristic_id'] ?? '')]
        ) ?? 0);

        $this->emitQualityEvent('eqms.spc.violation_acknowledged', self::ENTITY_TYPE, $chartId, [
            'violation_point_id'   => $violationPointId,
            'acknowledged_by'      => $actor,
            'action_taken'         => $actionTaken,
            'remaining_violations' => $unacknowledgedCount,
        ], $user);

        $this->success([
            'chart'               => $this->loadChart($chartId),
            'remaining_violations' => $unacknowledgedCount,
        ]);
    }

    /**
     * POST /eqms/spc/{id}/actions/create-deviation
     * Raise an eqms_deviations record from a SPC rule violation.
     * Returns the new deviation_id.
     */
    public function actionCreateDeviation(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcWriteRoles());
        $chartId = $this->requirePathId('id', 'chart_id');
        $chart   = $this->loadChart($chartId);

        $body            = $this->jsonBody();
        $deviationTitle  = trim((string)($body['deviation_title'] ?? ''));

        if ($deviationTitle === '') {
            $this->error('deviation_title_required', 400, "'deviation_title' is required for creating a deviation.");
        }

        $deviationId     = $this->newUuid();
        $deviationNumber = 'DEV-SPC-' . strtoupper(substr($deviationId, 0, 8));
        $actor           = (string)($user['username'] ?? 'unknown');
        $now             = $this->nowIso();

        // Insert into eqms_deviations table (standard EQMS deviation)
        try {
            $this->data->execute(
                "INSERT INTO eqms_deviations
                 (deviation_id, deviation_number, title, description, source,
                  source_ref_id, source_ref_type, severity, status,
                  version, created_at, created_by)
                 VALUES
                 (:id, :num, :title, :desc, 'spc_violation',
                  :src_id, 'spc_chart', 'major', 'open',
                  1, :now, :by)",
                [
                    ':id'     => $deviationId,
                    ':num'    => $deviationNumber,
                    ':title'  => $deviationTitle,
                    ':desc'   => "SPC control limit violation detected. Item: {$chart['item_id']} ({$chartId}). "
                                 . "Characteristic: " . ($chart['characteristic_id'] ?? 'N/A'),
                    ':src_id' => $chartId,
                    ':now'    => $now,
                    ':by'     => $actor,
                ]
            );
        } catch (\Throwable $e) {
            $this->error('deviation_creation_failed', 500,
                "Failed to create deviation record: " . $e->getMessage());
        }

        // Update metadata on the control limit record (best-effort)
        try {
            $this->data->execute(
                "UPDATE " . self::CHART_TABLE . "
                 SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{linked_deviation_id}', to_jsonb(:devid::text))
                 WHERE limit_id = :id",
                [':devid' => $deviationId, ':id' => $chartId]
            );
        } catch (\Throwable) {
            // Non-critical; proceed
        }

        // Also create an EQMS cross-link
        try {
            $this->data->execute(
                "INSERT INTO eqms_record_links (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
                 VALUES (:lid, 'spc_chart', :cid, 'deviation', :did, 'spc_violation', :by, now())",
                [
                    ':lid' => $this->newUuid(),
                    ':cid' => $chartId,
                    ':did' => $deviationId,
                    ':by'  => $actor,
                ]
            );
        } catch (\Throwable) {
            // Link creation is best-effort; do not fail the primary operation
        }

        $this->emitQualityEvent('eqms.spc.deviation_raised', self::ENTITY_TYPE, $chartId, [
            'deviation_id'     => $deviationId,
            'deviation_number' => $deviationNumber,
            'raised_by'        => $actor,
        ], $user);

        $this->success([
            'chart'            => $this->loadChart($chartId),
            'deviation_id'     => $deviationId,
            'deviation_number' => $deviationNumber,
        ], 201);
    }
}
