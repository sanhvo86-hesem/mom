<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Inspection Controller — IQC (Incoming Quality Control) + In-Process Inspection lifecycle.
 *
 * Sub-module 1: IQC
 *   State machine:
 *     pending       → start
 *     in_progress   → record-result, submit-review
 *     under_review  → accept, reject, hold
 *     accepted      → void
 *     rejected      → void
 *     on_hold       → accept, reject, void
 *     voided        → (terminal)
 *   Signature: accept, reject (for critical items)
 *
 * Sub-module 2: In-Process Inspection
 *   State machine:
 *     pending       → start
 *     in_progress   → record-value, flag-nonconformance, submit-review
 *     under_review  → accept, reject, hold
 *     accepted      → (terminal)
 *     rejected      → (terminal)
 *     on_hold       → accept, reject
 *
 * Standards: IATF 16949 §8.4.3, AS9100D §8.4, ISO 9001 §8.4
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsInspectionController extends EqmsBaseController
{
    // ── IQC constants ─────────────────────────────────────────────────────────

    private const IQC_TABLE  = 'incoming_inspections';
    private const IQC_ENTITY = 'iqc';
    private const IQC_MODULE = 'iqc';

    private const IQC_STATE_MACHINE = [
        'pending'      => ['start'],
        'in_progress'  => ['record-result', 'submit-review'],
        'under_review' => ['accept', 'reject', 'hold'],
        'accepted'     => ['void'],
        'rejected'     => ['void'],
        'on_hold'      => ['accept', 'reject', 'void'],
        'voided'       => [],
    ];

    // ── In-Process constants ──────────────────────────────────────────────────

    private const IP_TABLE  = 'inspection_lot';
    private const IP_ENTITY = 'in_process_inspection';
    private const IP_MODULE = 'in_process_inspection';

    private const IP_STATE_MACHINE = [
        'pending'      => ['start'],
        'in_progress'  => ['record-value', 'flag-nonconformance', 'submit-review'],
        'under_review' => ['accept', 'reject', 'hold'],
        'accepted'     => [],
        'rejected'     => [],
        'on_hold'      => ['accept', 'reject'],
    ];

    private function iqcWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_engineer', 'qa_manager', 'incoming_inspector', 'quality_manager',
        ])));
    }

    private function ipWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_engineer', 'qa_manager', 'quality_manager',
            'process_engineer', 'production_director', 'shift_leader',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadIqc(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::IQC_TABLE . " WHERE inspection_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('iqc_not_found', 404, "IQC inspection '{$id}' not found.");
        }
        return $row[0];
    }

    private function loadInProcess(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::IP_TABLE . " WHERE lot_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('inspection_not_found', 404, "In-process inspection '{$id}' not found.");
        }
        return $row[0];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IQC Sub-Module
    // ═══════════════════════════════════════════════════════════════════════════

    /** POST /eqms/iqc/query */
    public function iqcQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(inspection_number ILIKE :search OR vendor_id::text ILIKE :search OR item_id::text ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'vendor_id', 'item_id', 'result'] as $f) {
            // support legacy 'supplier_id' filter alias
            $colName = ($f === 'vendor_id' && !isset($q['filters']['vendor_id']) && !empty($q['filters']['supplier_id']))
                       ? 'vendor_id' : $f;
            $filterKey = ($f === 'vendor_id') ? ($q['filters']['vendor_id'] ?? $q['filters']['supplier_id'] ?? null) : ($q['filters'][$f] ?? null);
            if (!empty($filterKey)) {
                $conditions[] = "{$colName} = :{$f}";
                $params[":{$f}"] = $filterKey;
            }
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['inspection_number', 'vendor_id', 'status', 'received_date', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT inspection_id, inspection_number, vendor_id, item_id,
                    qty_received AS quantity, result, status, received_date, created_at
             FROM " . self::IQC_TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::IQC_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('iqc_inspections', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/iqc/metrics */
    public function iqcMetrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::IQC_TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byResult = $this->data->query(
            "SELECT result, COUNT(*) AS count FROM " . self::IQC_TABLE . " WHERE result IS NOT NULL GROUP BY result"
        ) ?? [];

        $pendingCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::IQC_TABLE . " WHERE status IN ('pending', 'in_progress', 'on_hold')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'     => $byStatus,
                'by_result'     => $byResult,
                'pending_count' => $pendingCount,
            ],
        ]);
    }

    /** POST /eqms/iqc/lookup */
    public function iqcLookup(): never
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
            "SELECT inspection_id, inspection_number, vendor_id, result, status
             FROM " . self::IQC_TABLE . " WHERE inspection_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    /** GET /eqms/iqc/{id} */
    public function iqcDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    /** PATCH /eqms/iqc/{id} */
    public function iqcUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->iqcWriteRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $id];
        $updatable = ['inspection_number', 'qty_received', 'received_date', 'notes'];

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
            "UPDATE " . self::IQC_TABLE . " SET " . implode(', ', $sets) .
            " WHERE inspection_id = :id",
            $params
        );

        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    public function iqcAudit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $this->loadIqc($id);
        $this->serveAuditTrail(self::IQC_ENTITY, $id);
    }

    public function iqcSignatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $this->loadIqc($id);
        $this->serveSignatures(self::IQC_ENTITY, $id, $user);
    }

    public function iqcExport(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $this->loadIqc($id);
        $this->serveExport(self::IQC_MODULE, $id, $user);
    }

    public function iqcExportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::IQC_MODULE, 'bulk', $user);
    }

    // ── IQC State Machine Actions ─────────────────────────────────────────────

    /** POST /eqms/iqc/{id}/actions/start */
    public function iqcActionStart(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->iqcWriteRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $this->requireValidTransition((string)$iqc['status'], 'start', self::IQC_STATE_MACHINE, $id);

        $body     = $this->jsonBody();
        $inspector = trim((string)($body['inspector'] ?? (string)($user['username'] ?? '')));

        $this->data->execute(
            "UPDATE " . self::IQC_TABLE . "
             SET status = 'in_progress', inspector = COALESCE(:insp, inspector), started_at = now()
             WHERE inspection_id = :id",
            [':insp' => $inspector, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.iqc.started', self::IQC_ENTITY, $id, [], $user);
        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    /** POST /eqms/iqc/{id}/actions/record-result */
    public function iqcActionRecordResult(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->iqcWriteRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $this->requireValidTransition((string)$iqc['status'], 'record-result', self::IQC_STATE_MACHINE, $id);

        $body    = $this->jsonBody();
        $result  = trim((string)($body['result'] ?? ''));
        $remarks = trim((string)($body['remarks'] ?? ''));

        if (!in_array($result, ['pass', 'fail', 'conditional'], true)) {
            $this->error('invalid_result', 400, "'result' must be pass, fail, or conditional.");
        }

        $this->data->execute(
            "UPDATE " . self::IQC_TABLE . "
             SET result = :result, remarks = :remarks
             WHERE inspection_id = :id",
            [':result' => $result, ':remarks' => $remarks, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.iqc.result_recorded', self::IQC_ENTITY, $id, [
            'result' => $result,
        ], $user);

        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    /** POST /eqms/iqc/{id}/actions/submit-review */
    public function iqcActionSubmitReview(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->iqcWriteRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $this->requireValidTransition((string)$iqc['status'], 'submit-review', self::IQC_STATE_MACHINE, $id);

        $this->data->execute(
            "UPDATE " . self::IQC_TABLE . " SET status = 'under_review' WHERE inspection_id = :id",
            [':id' => $id]
        );

        $this->emitQualityEvent('eqms.iqc.submitted_for_review', self::IQC_ENTITY, $id, [], $user);
        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    /**
     * POST /eqms/iqc/{id}/actions/accept
     * Signature required for critical items.
     */
    public function iqcActionAccept(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $this->requireValidTransition((string)$iqc['status'], 'accept', self::IQC_STATE_MACHINE, $id);

        $body     = $this->jsonBody();
        $critical = isset($body['critical']) ? (bool)$body['critical'] : false;

        if ($critical) {
            $this->requireElectronicSignature($user, 'accept', $id);
        }

        $actor = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::IQC_TABLE . "
             SET status = 'accepted', accepted_by = :by, accepted_at = now()
             WHERE inspection_id = :id",
            [':by' => $actor, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.iqc.accepted', self::IQC_ENTITY, $id, [
            'accepted_by' => $actor,
            'critical'    => $critical,
        ], $user);

        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    /**
     * POST /eqms/iqc/{id}/actions/reject
     * Signature required for critical items.
     */
    public function iqcActionReject(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $this->requireValidTransition((string)$iqc['status'], 'reject', self::IQC_STATE_MACHINE, $id);

        $body         = $this->jsonBody();
        $critical     = isset($body['critical']) ? (bool)$body['critical'] : false;
        $rejectReason = trim((string)($body['reject_reason'] ?? ''));

        if ($critical) {
            $this->requireElectronicSignature($user, 'reject', $id);
        }

        $actor = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::IQC_TABLE . "
             SET status = 'rejected', rejected_by = :by, rejected_at = now(),
                 reject_reason = :reason
             WHERE inspection_id = :id",
            [':by' => $actor, ':reason' => $rejectReason, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.iqc.rejected', self::IQC_ENTITY, $id, [
            'rejected_by'  => $actor,
            'reject_reason' => $rejectReason,
        ], $user);

        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    /** POST /eqms/iqc/{id}/actions/hold */
    public function iqcActionHold(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->iqcWriteRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $this->requireValidTransition((string)$iqc['status'], 'hold', self::IQC_STATE_MACHINE, $id);

        $body       = $this->jsonBody();
        $holdReason = trim((string)($body['hold_reason'] ?? ''));

        $this->data->execute(
            "UPDATE " . self::IQC_TABLE . "
             SET status = 'on_hold', hold_reason = :reason
             WHERE inspection_id = :id",
            [':reason' => $holdReason, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.iqc.held', self::IQC_ENTITY, $id, [], $user);
        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    /** POST /eqms/iqc/{id}/actions/void */
    public function iqcActionVoid(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $id   = $this->requirePathId('id', 'inspection_id');
        $iqc  = $this->loadIqc($id);

        $this->requireValidTransition((string)$iqc['status'], 'void', self::IQC_STATE_MACHINE, $id);

        $body       = $this->jsonBody();
        $voidReason = trim((string)($body['void_reason'] ?? ''));
        if ($voidReason === '') {
            $this->error('void_reason_required', 400);
        }

        $this->data->execute(
            "UPDATE " . self::IQC_TABLE . "
             SET status = 'voided', void_reason = :reason, voided_at = now()
             WHERE inspection_id = :id",
            [':reason' => $voidReason, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.iqc.voided', self::IQC_ENTITY, $id, [
            'void_reason' => $voidReason,
        ], $user);

        $this->success(['inspection' => $this->loadIqc($id)]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // In-Process Inspection Sub-Module
    // ═══════════════════════════════════════════════════════════════════════════

    /** POST /eqms/in-process/query */
    public function inprocessQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(lot_id::text ILIKE :search OR work_order_id::text ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'work_order_id', 'product_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['lot_id', 'work_order_id', 'status', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT lot_id, work_order_id, product_id, operation_code,
                    status, created_at
             FROM " . self::IP_TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::IP_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('in_process_inspections', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/in-process/metrics */
    public function inprocessMetrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::IP_TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $ncFlaggedCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::IP_TABLE . " WHERE nc_flagged = true"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'       => $byStatus,
                'nc_flagged_count' => $ncFlaggedCount,
            ],
        ]);
    }

    /** POST /eqms/in-process/lookup */
    public function inprocessLookup(): never
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
            "SELECT lot_id, work_order_id, product_id, status
             FROM " . self::IP_TABLE . " WHERE lot_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    /** GET /eqms/in-process/{id} */
    public function inprocessDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $this->success(['inspection' => $this->loadInProcess($id)]);
    }

    /** PATCH /eqms/in-process/{id} */
    public function inprocessUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->ipWriteRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $id];
        $updatable = ['notes', 'operation_code'];

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
            "UPDATE " . self::IP_TABLE . " SET " . implode(', ', $sets) . " WHERE lot_id = :id",
            $params
        );

        $this->success(['inspection' => $this->loadInProcess($id)]);
    }

    public function inprocessAudit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $this->loadInProcess($id);
        $this->serveAuditTrail(self::IP_ENTITY, $id);
    }

    public function inprocessExport(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $this->loadInProcess($id);
        $this->serveExport(self::IP_MODULE, $id, $user);
    }

    // ── In-Process State Machine Actions ──────────────────────────────────────

    /** POST /eqms/in-process/{id}/actions/start */
    public function inprocessActionStart(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->ipWriteRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $this->requireValidTransition((string)$ip['status'], 'start', self::IP_STATE_MACHINE, $id);

        $this->data->execute(
            "UPDATE " . self::IP_TABLE . " SET status = 'in_progress', started_at = now() WHERE lot_id = :id",
            [':id' => $id]
        );

        $this->emitQualityEvent('eqms.in_process_inspection.started', self::IP_ENTITY, $id, [], $user);
        $this->success(['inspection' => $this->loadInProcess($id)]);
    }

    /** POST /eqms/in-process/{id}/actions/record-value */
    public function inprocessActionRecordValue(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->ipWriteRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $this->requireValidTransition((string)$ip['status'], 'record-value', self::IP_STATE_MACHINE, $id);

        $body        = $this->jsonBody();
        $characteristic = trim((string)($body['characteristic'] ?? ''));
        $measuredValue  = $body['measured_value'] ?? null;
        $nominal        = $body['nominal'] ?? null;
        $usl            = $body['usl'] ?? null;
        $lsl            = $body['lsl'] ?? null;

        $entry = [
            'characteristic'  => $characteristic,
            'measured_value'  => $measuredValue,
            'nominal'         => $nominal,
            'usl'             => $usl,
            'lsl'             => $lsl,
            'recorded_at'     => $this->nowIso(),
            'recorded_by'     => (string)($user['username'] ?? 'unknown'),
        ];

        $this->data->execute(
            "UPDATE " . self::IP_TABLE . "
             SET measurement_values = COALESCE(measurement_values, '[]'::jsonb) || :val::jsonb
             WHERE lot_id = :id",
            [':val' => json_encode($entry), ':id' => $id]
        );

        $this->emitQualityEvent('eqms.in_process_inspection.value_recorded', self::IP_ENTITY, $id, [
            'characteristic' => $characteristic,
        ], $user);

        $this->success(['inspection' => $this->loadInProcess($id), 'entry' => $entry]);
    }

    /** POST /eqms/in-process/{id}/actions/flag-nonconformance */
    public function inprocessActionFlagNc(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->ipWriteRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $this->requireValidTransition((string)$ip['status'], 'flag-nonconformance', self::IP_STATE_MACHINE, $id);

        $body        = $this->jsonBody();
        $ncDesc      = trim((string)($body['nc_description'] ?? ''));
        if ($ncDesc === '') {
            $this->error('nc_description_required', 400);
        }

        $this->data->execute(
            "UPDATE " . self::IP_TABLE . "
             SET nc_flagged = true, nc_description = :desc
             WHERE lot_id = :id",
            [':desc' => $ncDesc, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.in_process_inspection.nc_flagged', self::IP_ENTITY, $id, [
            'nc_description' => $ncDesc,
        ], $user);

        $this->success(['inspection' => $this->loadInProcess($id)]);
    }

    /** POST /eqms/in-process/{id}/actions/submit-review */
    public function inprocessActionSubmitReview(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->ipWriteRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $this->requireValidTransition((string)$ip['status'], 'submit-review', self::IP_STATE_MACHINE, $id);

        $this->data->execute(
            "UPDATE " . self::IP_TABLE . " SET status = 'under_review' WHERE lot_id = :id",
            [':id' => $id]
        );

        $this->emitQualityEvent('eqms.in_process_inspection.submitted_for_review', self::IP_ENTITY, $id, [], $user);
        $this->success(['inspection' => $this->loadInProcess($id)]);
    }

    /** POST /eqms/in-process/{id}/actions/accept */
    public function inprocessActionAccept(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $this->requireValidTransition((string)$ip['status'], 'accept', self::IP_STATE_MACHINE, $id);

        $actor = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::IP_TABLE . "
             SET status = 'accepted', accepted_by = :by, accepted_at = now()
             WHERE lot_id = :id",
            [':by' => $actor, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.in_process_inspection.accepted', self::IP_ENTITY, $id, [
            'accepted_by' => $actor,
        ], $user);

        $this->success(['inspection' => $this->loadInProcess($id)]);
    }

    /** POST /eqms/in-process/{id}/actions/reject */
    public function inprocessActionReject(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $this->requireValidTransition((string)$ip['status'], 'reject', self::IP_STATE_MACHINE, $id);

        $body        = $this->jsonBody();
        $rejectReason = trim((string)($body['reject_reason'] ?? ''));
        $actor        = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::IP_TABLE . "
             SET status = 'rejected', rejected_by = :by, rejected_at = now(),
                 reject_reason = :reason
             WHERE lot_id = :id",
            [':by' => $actor, ':reason' => $rejectReason, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.in_process_inspection.rejected', self::IP_ENTITY, $id, [
            'rejected_by'   => $actor,
            'reject_reason' => $rejectReason,
        ], $user);

        $this->success(['inspection' => $this->loadInProcess($id)]);
    }

    /** POST /eqms/in-process/{id}/actions/hold */
    public function inprocessActionHold(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->ipWriteRoles());
        $id   = $this->requirePathId('id', 'lot_id');
        $ip   = $this->loadInProcess($id);

        $this->requireValidTransition((string)$ip['status'], 'hold', self::IP_STATE_MACHINE, $id);

        $body       = $this->jsonBody();
        $holdReason = trim((string)($body['hold_reason'] ?? ''));

        $this->data->execute(
            "UPDATE " . self::IP_TABLE . "
             SET status = 'on_hold', hold_reason = :reason
             WHERE lot_id = :id",
            [':reason' => $holdReason, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.in_process_inspection.held', self::IP_ENTITY, $id, [], $user);
        $this->success(['inspection' => $this->loadInProcess($id)]);
    }
}
