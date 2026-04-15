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
 * Tables: spc_control_charts, spc_observations (migrations M24/024)
 *
 * Standards: IATF 16949 §9.1.1.3, AS9100D §9.1, ISO 7870
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsSpcController extends EqmsBaseController
{
    private const CHART_TABLE = 'spc_control_charts';
    private const OBS_TABLE   = 'spc_observations';
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
            "SELECT * FROM " . self::CHART_TABLE . " WHERE chart_id = :id LIMIT 1",
            [':id' => $chartId]
        );
        if (empty($row)) {
            $this->error('spc_chart_not_found', 404, "SPC control chart '{$chartId}' not found.");
        }
        return $row[0];
    }

    // ── Query & Metrics ───────────────────────────────────────────────────────

    /** POST /eqms/spc/query — Paginated SPC chart list. */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(chart_name ILIKE :search OR characteristic ILIKE :search OR process_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'chart_type', 'process_name', 'product_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        if (isset($q['filters']['has_violation'])) {
            $conditions[] = "has_active_violation = :hav";
            $params[':hav'] = $q['filters']['has_violation'] ? 'true' : 'false';
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['chart_name', 'characteristic', 'process_name', 'status', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT chart_id, chart_name, chart_type, characteristic, process_name,
                    product_id, ucl, lcl, cl, sample_size,
                    has_active_violation, status, created_at
             FROM " . self::CHART_TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::CHART_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('spc_charts', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/spc/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::CHART_TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $violationCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::CHART_TABLE . " WHERE has_active_violation = true"
        ) ?? 0);

        $byChartType = $this->data->query(
            "SELECT chart_type, COUNT(*) AS count FROM " . self::CHART_TABLE . " GROUP BY chart_type"
        ) ?? [];

        $recentViolations = $this->data->query(
            "SELECT o.chart_id, o.observed_at, o.value, o.rule_violated, c.chart_name
             FROM " . self::OBS_TABLE . " o
             JOIN " . self::CHART_TABLE . " c ON c.chart_id = o.chart_id
             WHERE o.rule_violated IS NOT NULL
             ORDER BY o.observed_at DESC LIMIT 10"
        ) ?? [];

        $this->success([
            'metrics' => [
                'by_status'        => $byStatus,
                'violation_count'  => $violationCount,
                'by_chart_type'    => $byChartType,
                'recent_violations' => $recentViolations,
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
            "SELECT chart_id, chart_name, characteristic, status, has_active_violation
             FROM " . self::CHART_TABLE . " WHERE chart_id IN ({$placeholders})",
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
            "SELECT observation_id, observed_at, value, sample_number,
                    rule_violated, acknowledged, acknowledged_by, acknowledged_at
             FROM " . self::OBS_TABLE . "
             WHERE chart_id = :id
             ORDER BY observed_at DESC
             LIMIT :lim",
            [':id' => $chartId, ':lim' => $limit]
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
        $updatable = ['chart_name', 'characteristic', 'process_name', 'sample_size',
                      'sampling_frequency', 'specification_usl', 'specification_lsl'];

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
            "UPDATE " . self::CHART_TABLE . " SET " . implode(', ', $sets) . " WHERE chart_id = :id",
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

        $this->requireValidTransition((string)$chart['status'], 'recalculate-limits', self::STATE_MACHINE, $chartId);

        $body        = $this->jsonBody();
        $dataSource  = trim((string)($body['data_source'] ?? 'historical'));
        $sampleSize  = isset($body['sample_size']) ? (int)$body['sample_size'] : (int)($chart['sample_size'] ?? 5);

        if ($sampleSize < 2) {
            $this->error('invalid_sample_size', 400, "'sample_size' must be >= 2 for control limit calculation.");
        }

        // Compute stats from recent observations
        $stats = $this->data->query(
            "SELECT
                 AVG(value)             AS grand_mean,
                 STDDEV_POP(value)      AS pop_stddev,
                 COUNT(*)              AS obs_count,
                 MAX(value)            AS max_val,
                 MIN(value)            AS min_val
             FROM " . self::OBS_TABLE . "
             WHERE chart_id = :id
               AND observed_at > NOW() - INTERVAL '90 days'",
            [':id' => $chartId]
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
             SET cl = :cl, ucl = :ucl, lcl = :lcl,
                 limits_recalculated_at = now(), sample_size = :ss
             WHERE chart_id = :id",
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

        $this->requireValidTransition((string)$chart['status'], 'acknowledge-violation', self::STATE_MACHINE, $chartId);

        $body                   = $this->jsonBody();
        $violationPointId       = trim((string)($body['violation_point_id'] ?? ''));
        $acknowledgementReason  = trim((string)($body['acknowledgement_reason'] ?? ''));
        $actionTaken            = trim((string)($body['action_taken'] ?? ''));

        if ($violationPointId === '') {
            $this->error('violation_point_id_required', 400, "'violation_point_id' (observation ID) is required.");
        }
        if ($acknowledgementReason === '') {
            $this->error('acknowledgement_reason_required', 400);
        }

        $actor = (string)($user['username'] ?? 'unknown');

        // Mark the specific observation as acknowledged
        $this->data->execute(
            "UPDATE " . self::OBS_TABLE . "
             SET acknowledged = true,
                 acknowledged_by = :by,
                 acknowledged_at = now(),
                 acknowledgement_reason = :reason,
                 action_taken = :action
             WHERE observation_id = :oid AND chart_id = :cid",
            [
                ':by'     => $actor,
                ':reason' => $acknowledgementReason,
                ':action' => $actionTaken,
                ':oid'    => $violationPointId,
                ':cid'    => $chartId,
            ]
        );

        // Check whether all violations on this chart are now acknowledged
        $unacknowledgedCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::OBS_TABLE . "
             WHERE chart_id = :id AND rule_violated IS NOT NULL AND acknowledged = false",
            [':id' => $chartId]
        ) ?? 0);

        $newStatus = $unacknowledgedCount === 0 ? 'violation_acknowledged' : 'violation_acknowledged';

        $this->data->execute(
            "UPDATE " . self::CHART_TABLE . "
             SET status = :status,
                 has_active_violation = :hav
             WHERE chart_id = :id",
            [
                ':status' => $newStatus,
                ':hav'    => $unacknowledgedCount > 0 ? 'true' : 'false',
                ':id'     => $chartId,
            ]
        );

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

        $this->requireValidTransition((string)$chart['status'], 'create-deviation', self::STATE_MACHINE, $chartId);

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
                    ':desc'   => "SPC control chart violation detected. Chart: {$chart['chart_name']} ({$chartId}). "
                                 . "Characteristic: " . ($chart['characteristic'] ?? 'N/A'),
                    ':src_id' => $chartId,
                    ':now'    => $now,
                    ':by'     => $actor,
                ]
            );
        } catch (\Throwable $e) {
            $this->error('deviation_creation_failed', 500,
                "Failed to create deviation record: " . $e->getMessage());
        }

        // Update chart status to deviation_raised and link back
        $this->data->execute(
            "UPDATE " . self::CHART_TABLE . "
             SET status = 'deviation_raised',
                 linked_deviation_id = :devid
             WHERE chart_id = :id",
            [':devid' => $deviationId, ':id' => $chartId]
        );

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
