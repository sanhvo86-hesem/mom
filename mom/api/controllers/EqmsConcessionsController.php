<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Concessions Controller — Material and process concession/deviation dispositions.
 *
 * Implements the full concession lifecycle per IATF 16949 §8.7.
 * A concession authorises use of nonconforming material under defined conditions.
 *
 * State machine:
 *   draft            → submit
 *   submitted        → start-review, withdraw
 *   under_review     → approve, reject, request-info
 *   info_requested   → submit-info, withdraw
 *   approved         → close, revoke
 *   rejected         → withdraw
 *   closed           → (terminal)
 *   revoked          → (terminal)
 *   withdrawn        → (terminal)
 *
 * Standards: IATF 16949 §8.7, ISO 9001:2015 §8.7, AS9100D §8.7
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsConcessionsController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'concession';
    private const MODULE      = 'concessions';
    private const TABLE       = 'eqms_concession_records';
    protected const PK        = 'concession_id';

    private const STATE_MACHINE = [
        'draft'          => ['submit'],
        'submitted'      => ['start-review', 'withdraw'],
        'under_review'   => ['approve', 'reject', 'request-info'],
        'info_requested' => ['submit-info', 'withdraw'],
        'approved'       => ['close', 'revoke'],
        'rejected'       => ['withdraw'],
        'closed'         => [],
        'revoked'        => [],
        'withdrawn'      => [],
    ];

    private const TERMINAL_STATES = ['closed', 'revoked', 'withdrawn'];

    private const CONCESSION_TYPES  = ['material', 'process', 'design', 'documentation', 'other'];
    private const DISPOSITION_TYPES = [
        'use_as_is', 'rework', 'repair', 'sort', 'scrap',
        'return_to_vendor', 're_grade', 'pending',
    ];

    private function concessionWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'process_engineer', 'production_supervisor',
        ])));
    }

    private function concessionApproveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'engineering_manager', 'production_director',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    private function loadConcession(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE concession_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('concession_not_found', 404, "Concession '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('CON-%s-%04d', $year, (int)$seq);
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /** POST /eqms/concessions/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[]      = "(concession_number ILIKE :search OR title ILIKE :search
                                   OR affected_part_number ILIKE :search OR affected_lot_number ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'concession_type', 'disposition'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[]       = "{$f} = :{$f}";
                $params[":{$f}"]    = $q['filters'][$f];
            }
        }
        foreach (['affected_part_number', 'affected_lot_number', 'source_ncr_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[]    = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }
        if (!empty($q['filters']['customer_approval_required'])) {
            $conditions[] = 'customer_approval_required = TRUE';
        }
        if (!empty($q['filters']['expiring_days'])) {
            $days         = max(1, (int)$q['filters']['expiring_days']);
            $conditions[] = "expiry_date IS NOT NULL AND expiry_date BETWEEN now()::date AND (now() + INTERVAL '{$days} days')::date";
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], [
            'concession_number', 'title', 'status', 'concession_type', 'expiry_date', 'created_at',
        ], true) ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT concession_id, concession_number, title, concession_type, disposition,
                    affected_part_number, affected_lot_number, quantity_affected, quantity_unit,
                    source_ncr_number, customer_approval_required, expiry_date,
                    status, version, created_at, created_by
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

        $this->paginated('concession_records', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/concessions/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT concession_type, COUNT(*) AS count FROM " . self::TABLE . "
             GROUP BY concession_type ORDER BY concession_type"
        ) ?? [];

        $byDisposition = $this->data->query(
            "SELECT disposition, COUNT(*) AS count FROM " . self::TABLE . "
             GROUP BY disposition ORDER BY disposition"
        ) ?? [];

        $openCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status NOT IN ('closed','revoked','withdrawn')"
        ) ?? 0);

        $expiringCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status = 'approved' AND expiry_date IS NOT NULL
               AND expiry_date BETWEEN now()::date AND (now() + INTERVAL '30 days')::date"
        ) ?? 0);

        $pendingCustomerApproval = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status IN ('submitted','under_review') AND customer_approval_required = TRUE
               AND customer_approval_date IS NULL"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'                => $byStatus,
                'by_type'                  => $byType,
                'by_disposition'           => $byDisposition,
                'open_count'               => $openCount,
                'expiring_30_days'         => $expiringCount,
                'pending_customer_approval' => $pendingCustomerApproval,
            ],
        ]);
    }

    /** POST /eqms/concessions/lookup */
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
            "SELECT concession_id, concession_number, title, status, concession_type, disposition
             FROM " . self::TABLE . " WHERE concession_id IN ({$ph})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /** POST /eqms/concessions */
    public function create(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());

        $body = $this->jsonBody();

        $title           = trim((string)($body['title'] ?? ''));
        $concessionType  = trim((string)($body['concession_type'] ?? 'material'));
        $disposition     = trim((string)($body['disposition'] ?? 'pending'));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if (!in_array($concessionType, self::CONCESSION_TYPES, true)) {
            $this->error('invalid_concession_type', 400,
                "'concession_type' must be one of: " . implode(', ', self::CONCESSION_TYPES) . '.');
        }
        if (!in_array($disposition, self::DISPOSITION_TYPES, true)) {
            $this->error('invalid_disposition', 400,
                "'disposition' must be one of: " . implode(', ', self::DISPOSITION_TYPES) . '.');
        }

        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (concession_id, concession_number, title, description, concession_type, disposition,
              affected_part_number, affected_part_revision, affected_lot_number,
              quantity_affected, quantity_unit, affected_process,
              source_ncr_id, source_ncr_number, nonconformance_description,
              proposed_disposition, disposition_rationale, containment_action, rework_instructions,
              customer_approval_required, customer_id, effective_date, expiry_date,
              max_quantity, requires_ncr, regulatory_notification_required, regulatory_ref,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :type, :disp,
              :part, :part_rev, :lot,
              :qty, :qty_unit, :process,
              :ncr_id, :ncr_num, :nc_desc,
              :proposed, :rationale, :containment, :rework,
              :cust_req, :cust_id, :eff_date, :exp_date,
              :max_qty, :req_ncr, :reg_notif, :reg_ref,
              'draft', 1, :now, :by)",
            [
                ':id'          => $id,
                ':num'         => $number,
                ':title'       => $title,
                ':desc'        => trim((string)($body['description'] ?? '')),
                ':type'        => $concessionType,
                ':disp'        => $disposition,
                ':part'        => $body['affected_part_number'] ?? null,
                ':part_rev'    => $body['affected_part_revision'] ?? null,
                ':lot'         => $body['affected_lot_number'] ?? null,
                ':qty'         => isset($body['quantity_affected']) ? (float)$body['quantity_affected'] : null,
                ':qty_unit'    => $body['quantity_unit'] ?? null,
                ':process'     => $body['affected_process'] ?? null,
                ':ncr_id'      => $body['source_ncr_id'] ?? null,
                ':ncr_num'     => $body['source_ncr_number'] ?? null,
                ':nc_desc'     => trim((string)($body['nonconformance_description'] ?? '')),
                ':proposed'    => trim((string)($body['proposed_disposition'] ?? '')),
                ':rationale'   => trim((string)($body['disposition_rationale'] ?? '')),
                ':containment' => $body['containment_action'] ?? null,
                ':rework'      => $body['rework_instructions'] ?? null,
                ':cust_req'    => !empty($body['customer_approval_required']),
                ':cust_id'     => $body['customer_id'] ?? null,
                ':eff_date'    => $body['effective_date'] ?? null,
                ':exp_date'    => $body['expiry_date'] ?? null,
                ':max_qty'     => isset($body['max_quantity']) ? (float)$body['max_quantity'] : null,
                ':req_ncr'     => !empty($body['requires_ncr']),
                ':reg_notif'   => !empty($body['regulatory_notification_required']),
                ':reg_ref'     => $body['regulatory_ref'] ?? null,
                ':now'         => $now,
                ':by'          => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.concession.created', self::ENTITY_TYPE, $id, [
            'concession_number' => $number,
            'concession_type'   => $concessionType,
            'disposition'       => $disposition,
        ], $user);

        $record = $this->loadConcession($id);
        $this->success(['concession' => $record], 201);
    }

    /** GET /eqms/concessions/{id} */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->success(['concession' => $record]);
    }

    /** PATCH /eqms/concessions/{id} */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireVersionMatch((int)$record['version'], $id);

        if (in_array($record['status'], self::TERMINAL_STATES, true)) {
            $this->error('record_locked', 409,
                "Concession in terminal state '{$record['status']}' cannot be updated.");
        }

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $id, ':ver' => ((int)$record['version']) + 1];
        $updatable = [
            'title', 'description', 'concession_type', 'disposition',
            'affected_part_number', 'affected_part_revision', 'affected_lot_number',
            'quantity_affected', 'quantity_unit', 'affected_process',
            'nonconformance_description', 'proposed_disposition', 'disposition_rationale',
            'containment_action', 'rework_instructions',
            'customer_approval_required', 'customer_id', 'customer_approval_ref',
            'customer_approval_date', 'customer_approver',
            'effective_date', 'expiry_date', 'max_quantity',
            'requires_ncr', 'regulatory_notification_required', 'regulatory_ref',
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
            " WHERE concession_id = :id AND version = " . (int)$record['version'],
            $params
        );

        $this->emitQualityEvent('eqms.concession.updated', self::ENTITY_TYPE, $id, [
            'fields_updated' => array_intersect_key($body, array_flip($updatable)),
        ], $user);

        $updated = $this->loadConcession($id);
        $this->success(['concession' => $updated]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);
        $this->serveAvailableActions((string)$record['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'concession_id');
        $this->loadConcession($id);
        $this->serveExport(self::MODULE, $id, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /**
     * POST /eqms/concessions/{id}/actions/submit
     * Submit concession for quality review. Transitions draft → submitted.
     * Requires: proposed_disposition and nonconformance_description populated.
     */
    public function actionSubmit(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'submit', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        if (empty(trim((string)$record['nonconformance_description']))) {
            $this->error('nonconformance_description_required', 409,
                "'nonconformance_description' must be set before submitting.");
        }
        if (empty(trim((string)$record['proposed_disposition']))) {
            $this->error('proposed_disposition_required', 409,
                "'proposed_disposition' must be set before submitting.");
        }

        $actor   = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer  = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'submitted', submitted_by = :by, submitted_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE concession_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.concession.submitted', self::ENTITY_TYPE, $id, [
            'concession_number' => $record['concession_number'],
        ], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/start-review
     * Quality reviewer accepts the concession for review. submitted → under_review.
     */
    public function actionStartReview(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionApproveRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'start-review', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'under_review', reviewed_by = :by, reviewed_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE concession_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.concession.review_started', self::ENTITY_TYPE, $id, [], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/approve
     * Approve the concession with electronic signature. under_review → approved.
     * Body requires: { esig: { reason, password|sig_token }, disposition, effective_date }
     */
    public function actionApprove(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionApproveRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'approve', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'approve_concession', $id);

        $body       = $this->jsonBody();
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer     = ((int)$record['version']) + 1;

        $sets   = [
            "status = 'approved'",
            "approved_by = :by",
            "approved_at = now()",
            "version = :ver",
            "updated_at = now()",
            "updated_by = :by",
        ];
        $params = [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']];

        // Allow setting final disposition and dates at approval time
        foreach (['disposition', 'effective_date', 'expiry_date', 'max_quantity'] as $f) {
            if (array_key_exists($f, $body)) {
                $sets[]              = "{$f} = :{$f}";
                $params[":{$f}"]     = $body[$f];
            }
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE concession_id = :id AND version = :oldver",
            $params
        );

        $this->emitQualityEvent('eqms.concession.approved', self::ENTITY_TYPE, $id, [
            'concession_number' => $record['concession_number'],
            'approved_by'       => $actor,
        ], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/reject
     * Reject the concession. under_review → rejected.
     * Body requires: { rejected_reason }
     */
    public function actionReject(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionApproveRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'reject', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['rejected_reason'] ?? ''));
        if ($reason === '') {
            $this->error('rejected_reason_required', 400, "'rejected_reason' is required when rejecting.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'rejected', rejected_reason = :reason,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE concession_id = :id AND version = :oldver",
            [':reason' => $reason, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.concession.rejected', self::ENTITY_TYPE, $id, [
            'rejected_reason' => $reason,
        ], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/request-info
     * Request additional information. under_review → info_requested.
     */
    public function actionRequestInfo(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionApproveRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'request-info', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body   = $this->jsonBody();
        $note   = trim((string)($body['info_request_note'] ?? ''));
        if ($note === '') {
            $this->error('info_request_note_required', 400, "'info_request_note' is required.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'info_requested', version = :ver, updated_at = now(), updated_by = :by
             WHERE concession_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.concession.info_requested', self::ENTITY_TYPE, $id, [
            'note' => $note,
        ], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/submit-info
     * Originator provides additional information. info_requested → submitted.
     */
    public function actionSubmitInfo(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'submit-info', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'submitted', version = :ver, updated_at = now(), updated_by = :by
             WHERE concession_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.concession.info_submitted', self::ENTITY_TYPE, $id, [], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/close
     * Close an approved concession once material is fully processed.
     * Body optional: { closing_notes, quantity_used }
     */
    public function actionClose(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'close', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body   = $this->jsonBody();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $sets   = ["status = 'closed'", "version = :ver", "updated_at = now()", "updated_by = :by"];
        $params = [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']];

        if (isset($body['quantity_used'])) {
            $sets[]               = 'quantity_used = :qty_used';
            $params[':qty_used']  = (float)$body['quantity_used'];
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE concession_id = :id AND version = :oldver",
            $params
        );

        $this->emitQualityEvent('eqms.concession.closed', self::ENTITY_TYPE, $id, [], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/revoke
     * Revoke an approved concession (e.g. safety concern). approved → revoked.
     * Body requires: { esig, revoke_reason }
     */
    public function actionRevoke(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionApproveRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'revoke', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'revoke_concession', $id);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['revoke_reason'] ?? ''));
        if ($reason === '') {
            $this->error('revoke_reason_required', 400, "'revoke_reason' is required.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'revoked', rejected_reason = :reason,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE concession_id = :id AND version = :oldver",
            [':reason' => $reason, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.concession.revoked', self::ENTITY_TYPE, $id, [
            'revoke_reason' => $reason,
        ], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }

    /**
     * POST /eqms/concessions/{id}/actions/withdraw
     * Originator withdraws the concession before approval.
     */
    public function actionWithdraw(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->concessionWriteRoles());

        $id     = $this->requirePathId('id', 'concession_id');
        $record = $this->loadConcession($id);

        $this->requireValidTransition((string)$record['status'], 'withdraw', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'withdrawn', version = :ver, updated_at = now(), updated_by = :by
             WHERE concession_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.concession.withdrawn', self::ENTITY_TYPE, $id, [], $user);

        $this->success(['concession' => $this->loadConcession($id)]);
    }
}
