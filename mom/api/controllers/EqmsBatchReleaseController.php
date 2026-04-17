<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Batch Release Controller — Regulated batch release workflow.
 *
 * State machine:
 *   initiated          → aggregate-data
 *   data_aggregated    → review-exceptions
 *   exceptions_reviewed→ approve-release, hold-release
 *   hold               → review-exceptions, approve-release
 *   approved           → market-ship
 *   shipped            → (terminal)
 *
 * Electronic Signature:
 *   approve-release ALWAYS required (fully regulated).
 *   market-ship REQUIRES signature.
 *
 * Standards: 21 CFR Part 211.192, ICH Q7, ISO 13485 §8.3, EU GMP Annex 16
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsBatchReleaseController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'batch_release';
    private const MODULE      = 'batch_release';
    private const TABLE       = 'eqms_batch_release';
    protected const PK          = 'batch_release_id';

    private const STATE_MACHINE = [
        'initiated'          => ['aggregate-data'],
        'data_aggregated'    => ['review-exceptions'],
        'exceptions_reviewed' => ['approve-release', 'hold-release'],
        'hold'               => ['review-exceptions', 'approve-release'],
        'approved'           => ['market-ship'],
        'shipped'            => [],
    ];

    private function releaseWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'qms_manager',
            'production_director', 'regulatory_affairs',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadBatchRelease(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE batch_release_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('batch_release_not_found', 404, "Batch release '{$id}' not found.");
        }
        return $row[0];
    }

    // ── Query & Metrics ───────────────────────────────────────────────────────

    /** POST /eqms/batch-release/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(batch_release_number ILIKE :search OR batch_number ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'release_type', 'product_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['batch_release_number', 'batch_number', 'manufacture_date', 'expiry_date', 'status', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT batch_release_id, batch_release_number, lot_id, product_id,
                    batch_number, release_type, manufacture_date, expiry_date,
                    status, version, created_at, created_by
             FROM " . self::TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('batch_releases', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/batch-release/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byReleaseType = $this->data->query(
            "SELECT release_type, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY release_type"
        ) ?? [];

        $onHoldCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status = 'hold'"
        ) ?? 0);

        $pendingApproval = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status = 'exceptions_reviewed'"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'       => $byStatus,
                'by_release_type' => $byReleaseType,
                'on_hold_count'   => $onHoldCount,
                'pending_approval' => $pendingApproval,
            ],
        ]);
    }

    /** POST /eqms/batch-release/lookup */
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
            "SELECT batch_release_id, batch_release_number, batch_number, product_id, status
             FROM " . self::TABLE . " WHERE batch_release_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    /** POST /eqms/batch-release — Initiate a new batch release record. */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseWriteRoles());

        $body        = $this->jsonBody();
        $productId   = trim((string)($body['product_id'] ?? ''));
        $batchNumber = trim((string)($body['batch_number'] ?? ''));
        $releaseType = trim((string)($body['release_type'] ?? 'standard'));

        if ($productId === '') {
            $this->error('product_id_required', 400);
        }
        if ($batchNumber === '') {
            $this->error('batch_number_required', 400);
        }
        if (!in_array($releaseType, ['standard', 'expedited', 'conditional'], true)) {
            $this->error('invalid_release_type', 400,
                "'release_type' must be standard, expedited, or conditional.");
        }

        $brId     = $this->newUuid();
        $brNumber = 'BR-' . strtoupper(substr($brId, 0, 8));
        $now      = $this->nowIso();
        $actor    = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (batch_release_id, batch_release_number, lot_id, product_id,
              batch_number, release_type, manufacture_date, expiry_date,
              release_package, exceptions, exception_dispositions,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :lot, :prod,
              :batch, :type, :mfg, :exp,
              '{}'::jsonb, '[]'::jsonb, '{}'::jsonb,
              'initiated', 1, :now, :by)",
            [
                ':id'    => $brId,
                ':num'   => $brNumber,
                ':lot'   => $body['lot_id'] ?? null,
                ':prod'  => $productId,
                ':batch' => $batchNumber,
                ':type'  => $releaseType,
                ':mfg'   => $body['manufacture_date'] ?? null,
                ':exp'   => $body['expiry_date'] ?? null,
                ':now'   => $now,
                ':by'    => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.batch_release.created', self::ENTITY_TYPE, $brId, [
            'batch_release_number' => $brNumber,
            'product_id'           => $productId,
            'batch_number'         => $batchNumber,
        ], $user);

        $this->success(['batch_release' => $this->loadBatchRelease($brId)], 201);
    }

    /** GET /eqms/batch-release/{id} */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->success(['batch_release' => $this->loadBatchRelease($brId)]);
    }

    /** PATCH /eqms/batch-release/{id} */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseWriteRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);
        $this->requireVersionMatch((int)$br['version'], $brId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $brId, ':ver' => ((int)$br['version']) + 1];
        $updatable = ['manufacture_date', 'expiry_date', 'release_type'];

        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]           = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (empty($sets)) {
            $this->error('no_fields_to_update', 400);
        }

        $sets[] = 'version = :ver';
        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE batch_release_id = :id AND version = " . (int)$br['version'],
            $params
        );

        $this->success(['batch_release' => $this->loadBatchRelease($brId)]);
    }

    /**
     * GET /eqms/batch-release/{id}/release-package
     * Return the assembled evidence package for this batch.
     */
    public function releasePackage(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);

        // Decode jsonb release_package
        $pkg = is_string($br['release_package']) ? json_decode($br['release_package'], true) : ($br['release_package'] ?? []);

        $this->success([
            'batch_release_id'     => $brId,
            'batch_release_number' => $br['batch_release_number'],
            'status'               => $br['status'],
            'release_package'      => $pkg,
        ]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $brId);
    }

    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveComments(self::ENTITY_TYPE, $brId, $user);
    }

    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveAttachments(self::ENTITY_TYPE, $brId, $user);
    }

    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveRelationships(self::ENTITY_TYPE, $brId, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseWriteRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveRelationships(self::ENTITY_TYPE, $brId, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseWriteRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveRelationships(self::ENTITY_TYPE, $brId, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);
        $this->serveAvailableActions((string)$br['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveSignatures(self::ENTITY_TYPE, $brId, $user);
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $this->loadBatchRelease($brId);
        $this->serveExport(self::MODULE, $brId, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /**
     * POST /eqms/batch-release/{id}/actions/aggregate-data
     * Auto-collect evidence from linked lot and build release_package jsonb.
     */
    public function actionAggregateData(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseWriteRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);

        $this->requireValidTransition((string)$br['status'], 'aggregate-data', self::STATE_MACHINE, $brId);
        $this->requireVersionMatch((int)$br['version'], $brId);

        $lotId     = $br['lot_id'];
        $productId = $br['product_id'];

        // Aggregate evidence from linked entities
        $pkg = [];

        // IQC results
        $pkg['iqc_results'] = $this->data->query(
            "SELECT * FROM incoming_inspections WHERE lot_number = :lot LIMIT 50",
            [':lot' => $br['batch_number']]
        ) ?? [];

        // In-process inspections
        $pkg['in_process_inspections'] = $lotId ? ($this->data->query(
            "SELECT * FROM inspection_lot WHERE lot_id = :lot LIMIT 50",
            [':lot' => $lotId]
        ) ?? []) : [];

        // Deviations (EQMS) are linked to batches/lots in the schema, not product_id.
        $pkg['deviations'] = [];
        if ($lotId) {
            $pkg['deviations'] = $this->data->query(
                "SELECT deviation_id, deviation_number, status, severity FROM eqms_deviations
                 WHERE batch_id = :batch_id AND created_at > NOW() - INTERVAL '2 years' LIMIT 20",
                [':batch_id' => $lotId]
            ) ?? [];
        } elseif (!empty($br['batch_number'])) {
            $pkg['deviations'] = $this->data->query(
                "SELECT deviation_id, deviation_number, status, severity FROM eqms_deviations
                 WHERE batch_number = :batch_number AND created_at > NOW() - INTERVAL '2 years' LIMIT 20",
                [':batch_number' => $br['batch_number']]
            ) ?? [];
        }

        // Lab investigations
        $pkg['lab_investigations'] = $productId ? ($this->data->query(
            "SELECT investigation_id, investigation_number, investigation_type, status
             FROM eqms_lab_investigations
             WHERE product_id = :prod AND created_at > NOW() - INTERVAL '2 years' LIMIT 20",
            [':prod' => $productId]
        ) ?? []) : [];

        // Calibration records (equipment used)
        $pkg['calibration_records'] = $this->data->query(
            "SELECT calibration_id, calibration_number, equipment_name, pass_fail, approved_at
             FROM eqms_calibration_records WHERE status = 'approved'
             ORDER BY approved_at DESC LIMIT 20"
        ) ?? [];

        // CAPA evidence must be explicitly linked to the batch release or its deviations.
        $deviationIds = array_values(array_filter(array_map(
            static fn(array $row): string => (string)($row['deviation_id'] ?? ''),
            $pkg['deviations']
        )));
        $capaConditions = ["(source_type = 'batch_release' AND source_id = :release_id)"];
        $capaParams = [':release_id' => $brId];
        if ($deviationIds !== []) {
            $devPlaceholders = [];
            foreach ($deviationIds as $idx => $deviationId) {
                $key = ":deviation_id_{$idx}";
                $devPlaceholders[] = $key;
                $capaParams[$key] = $deviationId;
            }
            $capaConditions[] = "(source_type = 'deviation' AND source_id IN (" . implode(',', $devPlaceholders) . "))";
        }
        $pkg['capa_items'] = $this->data->query(
            "SELECT capa_id, capa_number, status FROM eqms_capa_records
             WHERE " . implode(' OR ', $capaConditions) . "
             ORDER BY created_at DESC LIMIT 10",
            $capaParams
        ) ?? [];

        $pkg['aggregated_at'] = $this->nowIso();
        $pkg['aggregated_by'] = (string)($user['username'] ?? 'unknown');

        $newVer = ((int)$br['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET release_package = :pkg::jsonb,
                 status = 'data_aggregated', version = :ver
             WHERE batch_release_id = :id AND version = :oldver",
            [
                ':pkg'    => json_encode($pkg),
                ':ver'    => $newVer,
                ':id'     => $brId,
                ':oldver' => (int)$br['version'],
            ]
        );

        $this->emitQualityEvent('eqms.batch_release.data_aggregated', self::ENTITY_TYPE, $brId, [
            'sections_count' => count($pkg),
        ], $user);

        $this->success(['batch_release' => $this->loadBatchRelease($brId), 'release_package' => $pkg]);
    }

    /** POST /eqms/batch-release/{id}/actions/review-exceptions */
    public function actionReviewExceptions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseWriteRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);

        $this->requireValidTransition((string)$br['status'], 'review-exceptions', self::STATE_MACHINE, $brId);
        $this->requireVersionMatch((int)$br['version'], $brId);

        $body          = $this->jsonBody();
        $excpReviewed  = isset($body['exceptions_reviewed']) ? (bool)$body['exceptions_reviewed'] : false;
        $excpDispositions = is_array($body['exception_dispositions'] ?? null) ? $body['exception_dispositions'] : [];

        if (!$excpReviewed) {
            $this->error('exceptions_reviewed_required', 400,
                "'exceptions_reviewed' must be true to proceed.");
        }

        $newVer = ((int)$br['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET exception_dispositions = :disps::jsonb,
                 status = 'exceptions_reviewed', version = :ver
             WHERE batch_release_id = :id AND version = :oldver",
            [
                ':disps'  => json_encode($excpDispositions),
                ':ver'    => $newVer,
                ':id'     => $brId,
                ':oldver' => (int)$br['version'],
            ]
        );

        $this->emitQualityEvent('eqms.batch_release.exceptions_reviewed', self::ENTITY_TYPE, $brId, [], $user);
        $this->success(['batch_release' => $this->loadBatchRelease($brId)]);
    }

    /**
     * POST /eqms/batch-release/{id}/actions/approve-release
     * ALWAYS requires electronic signature — batch release is fully regulated.
     */
    public function actionApproveRelease(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReleaseRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);

        $this->requireValidTransition((string)$br['status'], 'approve-release', self::STATE_MACHINE, $brId);
        $this->requireVersionMatch((int)$br['version'], $brId);
        $this->requireElectronicSignature($user, 'approve-release', $brId);

        $body              = $this->jsonBody();
        $approvalStatement = trim((string)($body['approval_statement'] ?? ''));
        if ($approvalStatement === '') {
            $this->error('approval_statement_required', 400);
        }

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$br['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET approved_by = :by, approved_at = now(),
                 status = 'approved', version = :ver
             WHERE batch_release_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $brId, ':oldver' => (int)$br['version']]
        );

        $this->emitQualityEvent('eqms.batch_release.approved', self::ENTITY_TYPE, $brId, [
            'approved_by'       => $actor,
            'approval_statement' => $approvalStatement,
        ], $user);

        $this->success(['batch_release' => $this->loadBatchRelease($brId)]);
    }

    /** POST /eqms/batch-release/{id}/actions/hold-release */
    public function actionHoldRelease(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseWriteRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);

        $this->requireValidTransition((string)$br['status'], 'hold-release', self::STATE_MACHINE, $brId);
        $this->requireVersionMatch((int)$br['version'], $brId);

        $body       = $this->jsonBody();
        $holdReason = trim((string)($body['hold_reason'] ?? ''));
        if ($holdReason === '') {
            $this->error('hold_reason_required', 400);
        }

        $newVer = ((int)$br['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET hold_reason = :reason, status = 'hold', version = :ver
             WHERE batch_release_id = :id AND version = :oldver",
            [':reason' => $holdReason, ':ver' => $newVer, ':id' => $brId, ':oldver' => (int)$br['version']]
        );

        $this->emitQualityEvent('eqms.batch_release.held', self::ENTITY_TYPE, $brId, [
            'hold_reason' => $holdReason,
        ], $user);

        $this->success(['batch_release' => $this->loadBatchRelease($brId)]);
    }

    /**
     * POST /eqms/batch-release/{id}/actions/market-ship
     * REQUIRES electronic signature.
     */
    public function actionMarketShip(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReleaseRoles());
        $brId = $this->requirePathId('id', 'batch_release_id');
        $br   = $this->loadBatchRelease($brId);

        $this->requireValidTransition((string)$br['status'], 'market-ship', self::STATE_MACHINE, $brId);
        $this->requireVersionMatch((int)$br['version'], $brId);
        $this->requireElectronicSignature($user, 'market-ship', $brId);

        $body                    = $this->jsonBody();
        $marketShipAuthorization = trim((string)($body['market_ship_authorization'] ?? ''));
        if ($marketShipAuthorization === '') {
            $this->error('market_ship_authorization_required', 400);
        }

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$br['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET market_ship_authorization = :auth,
                 shipped_by = :by, shipped_at = now(),
                 status = 'shipped', version = :ver
             WHERE batch_release_id = :id AND version = :oldver",
            [
                ':auth'   => $marketShipAuthorization,
                ':by'     => $actor,
                ':ver'    => $newVer,
                ':id'     => $brId,
                ':oldver' => (int)$br['version'],
            ]
        );

        $this->emitQualityEvent('eqms.batch_release.shipped', self::ENTITY_TYPE, $brId, [
            'shipped_by' => $actor,
        ], $user);

        $this->success(['batch_release' => $this->loadBatchRelease($brId)]);
    }
}
