<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS AML Controller — Approved Manufacturer / Approved Supplier List.
 *
 * Manages the AML lifecycle: controlling which manufacturers/suppliers are
 * approved to supply specific parts. Integrates with supplier audits (SCAR block)
 * and FAI qualification evidence.
 *
 * State machine:
 *   draft       → submit-for-approval
 *   submitted   → approve, reject, request-info
 *   info_requested → submit-info, withdraw
 *   approved    → block, obsolete
 *   rejected    → withdraw
 *   blocked     → unblock, obsolete
 *   obsolete    → (terminal)
 *   withdrawn   → (terminal)
 *
 * Standards: IATF 16949 §8.4.1, AS9100D §8.4.1
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsAmlController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'aml';
    private const MODULE      = 'aml';
    private const TABLE       = 'eqms_aml_records';
    protected const PK        = 'aml_id';

    private const STATE_MACHINE = [
        'draft'          => ['submit-for-approval'],
        'submitted'      => ['approve', 'reject', 'request-info'],
        'info_requested' => ['submit-info', 'withdraw'],
        'approved'       => ['block', 'obsolete'],
        'rejected'       => ['withdraw'],
        'blocked'        => ['unblock', 'obsolete'],
        'obsolete'       => [],
        'withdrawn'      => [],
    ];

    private const TERMINAL_STATES = ['obsolete', 'withdrawn'];

    private const APPROVAL_TYPES = ['full', 'conditional', 'developmental', 'prototype'];

    private function amlWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'supplier_quality_engineer',
            'purchasing_manager', 'engineering_manager',
        ])));
    }

    private function amlApproveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'engineering_manager',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    private function loadAml(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE aml_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('aml_not_found', 404, "AML record '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('AML-%s-%04d', $year, (int)$seq);
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /** POST /eqms/aml/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[]      = "(aml_number ILIKE :search OR title ILIKE :search
                                   OR part_number ILIKE :search OR manufacturer_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'approval_type', 'vendor_id', 'customer_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[]    = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }
        if (!empty($q['filters']['part_number'])) {
            $conditions[]    = 'part_number ILIKE :part';
            $params[':part'] = '%' . $q['filters']['part_number'] . '%';
        }
        if (!empty($q['filters']['customer_approved'])) {
            $conditions[] = 'customer_approved = TRUE';
        }
        if (!empty($q['filters']['expiring_days'])) {
            $days         = max(1, (int)$q['filters']['expiring_days']);
            $conditions[] = "expiry_date IS NOT NULL AND expiry_date BETWEEN now()::date AND (now() + INTERVAL '{$days} days')::date";
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], [
            'aml_number', 'title', 'part_number', 'vendor_id', 'approval_type',
            'status', 'expiry_date', 'created_at',
        ], true) ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT aml_id, aml_number, title, part_number, part_revision,
                    vendor_id, manufacturer_name, manufacturer_site,
                    approval_type, customer_approved, restricted,
                    effective_date, expiry_date, status, version, created_at, created_by
             FROM " . self::TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$sortDir}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('aml_records', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/aml/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT approval_type, COUNT(*) AS count FROM " . self::TABLE . "
             WHERE status = 'approved' GROUP BY approval_type ORDER BY approval_type"
        ) ?? [];

        $activeCount  = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status = 'approved'"
        ) ?? 0);

        $blockedCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status = 'blocked'"
        ) ?? 0);

        $expiringCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status = 'approved' AND expiry_date IS NOT NULL
               AND expiry_date BETWEEN now()::date AND (now() + INTERVAL '60 days')::date"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'     => $byStatus,
                'by_type'       => $byType,
                'active_count'  => $activeCount,
                'blocked_count' => $blockedCount,
                'expiring_60d'  => $expiringCount,
            ],
        ]);
    }

    /** POST /eqms/aml/lookup */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body = $this->jsonBody();
        $ids  = is_array($body['ids'] ?? null) ? $body['ids'] : [];

        if (empty($ids)) {
            $this->success(['records' => []]);
        }

        $ph     = implode(',', array_map(fn($i) => ":id{$i}", array_keys($ids)));
        $params = [];
        foreach ($ids as $i => $id) {
            $params[":id{$i}"] = $id;
        }

        $rows = $this->data->query(
            "SELECT aml_id, aml_number, title, part_number, vendor_id, approval_type, status
             FROM " . self::TABLE . " WHERE aml_id IN ({$ph})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    /** GET /eqms/aml/check — Quick lookup: is vendor approved for part? */
    public function checkApproval(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body       = $this->jsonBody() + $_GET;
        $partNumber = trim((string)($body['part_number'] ?? ''));
        $vendorId   = trim((string)($body['vendor_id'] ?? ''));

        if ($partNumber === '' || $vendorId === '') {
            $this->error('params_required', 400, "'part_number' and 'vendor_id' are required.");
        }

        $record = $this->data->query(
            "SELECT aml_id, aml_number, approval_type, status, expiry_date,
                    restricted, restrictions_notes, customer_approved
             FROM " . self::TABLE . "
             WHERE part_number = :part AND vendor_id = :vendor
               AND status = 'approved'
             ORDER BY effective_date DESC NULLS LAST
             LIMIT 1",
            [':part' => $partNumber, ':vendor' => $vendorId]
        );

        $approved = !empty($record);
        $this->success([
            'approved'   => $approved,
            'aml_record' => $approved ? $record[0] : null,
        ]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /** POST /eqms/aml */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlWriteRoles());

        $body         = $this->jsonBody();
        $title        = trim((string)($body['title'] ?? ''));
        $partNumber   = trim((string)($body['part_number'] ?? ''));
        $vendorId     = trim((string)($body['vendor_id'] ?? ''));
        $approvalType = trim((string)($body['approval_type'] ?? 'full'));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if ($partNumber === '') {
            $this->error('part_number_required', 400, "'part_number' is required.");
        }
        if ($vendorId === '') {
            $this->error('vendor_id_required', 400, "'vendor_id' is required.");
        }
        if (!in_array($approvalType, self::APPROVAL_TYPES, true)) {
            $this->error('invalid_approval_type', 400,
                "'approval_type' must be one of: " . implode(', ', self::APPROVAL_TYPES) . '.');
        }

        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (aml_id, aml_number, title, description, part_number, part_revision,
              part_description, item_id, commodity_code,
              vendor_id, manufacturer_name, manufacturer_site,
              manufacturer_part_number, manufacturer_part_revision,
              approval_type, approval_basis, qualification_standard,
              customer_approved, customer_id, customer_approval_ref,
              restricted, restrictions_notes, max_annual_quantity, max_quantity_unit,
              effective_date, expiry_date, renewal_required,
              qualification_fai_id, qualification_ppap_id, qualification_audit_id,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :part, :part_rev,
              :part_desc, :item_id, :commodity,
              :vendor, :mfr_name, :mfr_site,
              :mfr_part, :mfr_rev,
              :atype, :basis, :qual_std,
              :cust_appr, :cust_id, :cust_ref,
              :restricted, :restrict_notes, :max_qty, :max_qty_unit,
              :eff_date, :exp_date, :renewal,
              :fai_id, :ppap_id, :audit_id,
              'draft', 1, :now, :by)",
            [
                ':id'             => $id,
                ':num'            => $number,
                ':title'          => $title,
                ':desc'           => trim((string)($body['description'] ?? '')),
                ':part'           => $partNumber,
                ':part_rev'       => $body['part_revision'] ?? null,
                ':part_desc'      => $body['part_description'] ?? null,
                ':item_id'        => $body['item_id'] ?? null,
                ':commodity'      => $body['commodity_code'] ?? null,
                ':vendor'         => $vendorId,
                ':mfr_name'       => $body['manufacturer_name'] ?? null,
                ':mfr_site'       => $body['manufacturer_site'] ?? null,
                ':mfr_part'       => $body['manufacturer_part_number'] ?? null,
                ':mfr_rev'        => $body['manufacturer_part_revision'] ?? null,
                ':atype'          => $approvalType,
                ':basis'          => $body['approval_basis'] ?? null,
                ':qual_std'       => $body['qualification_standard'] ?? null,
                ':cust_appr'      => !empty($body['customer_approved']),
                ':cust_id'        => $body['customer_id'] ?? null,
                ':cust_ref'       => $body['customer_approval_ref'] ?? null,
                ':restricted'     => !empty($body['restricted']),
                ':restrict_notes' => $body['restrictions_notes'] ?? null,
                ':max_qty'        => isset($body['max_annual_quantity']) ? (float)$body['max_annual_quantity'] : null,
                ':max_qty_unit'   => $body['max_quantity_unit'] ?? null,
                ':eff_date'       => $body['effective_date'] ?? null,
                ':exp_date'       => $body['expiry_date'] ?? null,
                ':renewal'        => !empty($body['renewal_required']),
                ':fai_id'         => $body['qualification_fai_id'] ?? null,
                ':ppap_id'        => $body['qualification_ppap_id'] ?? null,
                ':audit_id'       => $body['qualification_audit_id'] ?? null,
                ':now'            => $now,
                ':by'             => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.aml.created', self::ENTITY_TYPE, $id, [
            'aml_number'    => $number,
            'part_number'   => $partNumber,
            'vendor_id'     => $vendorId,
            'approval_type' => $approvalType,
        ], $user);

        $record = $this->loadAml($id);
        $this->success(['aml' => $record], 201);
    }

    /** GET /eqms/aml/{id} */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->success(['aml' => $this->loadAml($id)]);
    }

    /** PATCH /eqms/aml/{id} */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlWriteRoles());

        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);

        $this->requireVersionMatch((int)$record['version'], $id);

        if (in_array($record['status'], self::TERMINAL_STATES, true)) {
            $this->error('record_locked', 409, "AML record in terminal state cannot be updated.");
        }

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $id, ':ver' => ((int)$record['version']) + 1];
        $updatable = [
            'title', 'description', 'part_revision', 'part_description', 'commodity_code',
            'manufacturer_name', 'manufacturer_site', 'manufacturer_part_number', 'manufacturer_part_revision',
            'approval_type', 'approval_basis', 'qualification_standard',
            'customer_approved', 'customer_id', 'customer_approval_ref',
            'restricted', 'restrictions_notes', 'max_annual_quantity', 'max_quantity_unit',
            'effective_date', 'expiry_date', 'renewal_required',
            'qualification_fai_id', 'qualification_ppap_id', 'qualification_audit_id',
        ];

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]              = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        if (empty($sets)) {
            $this->error('no_fields_to_update', 400, "No updatable fields provided.");
        }

        $sets[] = 'version = :ver';
        $sets[] = 'updated_at = now()';
        $sets[] = "updated_by = :actor";
        $params[':actor'] = $actor;

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE aml_id = :id AND version = " . (int)$record['version'],
            $params
        );

        $this->emitQualityEvent('eqms.aml.updated', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlWriteRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlWriteRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->serveAvailableActions((string)$record['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'aml_id');
        $this->loadAml($id);
        $this->serveExport(self::MODULE, $id, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    public function actionSubmitForApproval(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlWriteRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'submit-for-approval', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'submitted', version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.submitted', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionApprove(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlApproveRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'approve', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'approve_aml', $id);
        $body   = $this->jsonBody();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $sets   = ["status = 'approved'", "approved_by = :by", "approved_at = now()", "version = :ver", "updated_at = now()", "updated_by = :by"];
        $params = [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']];
        foreach (['effective_date', 'expiry_date'] as $f) {
            if (array_key_exists($f, $body)) {
                $sets[]              = "{$f} = :{$f}";
                $params[":{$f}"]     = $body[$f];
            }
        }
        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE aml_id = :id AND version = :oldver",
            $params
        );
        $this->emitQualityEvent('eqms.aml.approved', self::ENTITY_TYPE, $id, ['approved_by' => $actor], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionReject(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlApproveRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'reject', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body   = $this->jsonBody();
        $reason = trim((string)($body['rejected_reason'] ?? ''));
        if ($reason === '') {
            $this->error('rejected_reason_required', 400, "'rejected_reason' is required.");
        }
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'rejected', version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.rejected', self::ENTITY_TYPE, $id, ['reason' => $reason], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionRequestInfo(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlApproveRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'request-info', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'info_requested', version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.info_requested', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionSubmitInfo(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlWriteRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'submit-info', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'submitted', version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.info_submitted', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionBlock(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlApproveRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'block', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body   = $this->jsonBody();
        $reason = trim((string)($body['blocked_reason'] ?? ''));
        if ($reason === '') {
            $this->error('blocked_reason_required', 400, "'blocked_reason' is required.");
        }
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'blocked', blocked_reason = :reason,
                 blocked_by = :by, blocked_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':reason' => $reason, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.blocked', self::ENTITY_TYPE, $id, ['reason' => $reason], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionUnblock(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlApproveRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'unblock', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'unblock_aml', $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'approved', blocked_reason = NULL,
                 blocked_by = NULL, blocked_at = NULL,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.unblocked', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionObsolete(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlApproveRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'obsolete', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'obsolete_aml', $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'obsolete', obsoleted_by = :by, obsoleted_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.obsoleted', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }

    public function actionWithdraw(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->amlWriteRoles());
        $id     = $this->requirePathId('id', 'aml_id');
        $record = $this->loadAml($id);
        $this->requireValidTransition((string)$record['status'], 'withdraw', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'withdrawn', version = :ver, updated_at = now(), updated_by = :by
             WHERE aml_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.aml.withdrawn', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['aml' => $this->loadAml($id)]);
    }
}
