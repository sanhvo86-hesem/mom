<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Warranty Controller — Customer warranty and field return claims.
 *
 * Manages warranty claim lifecycle per IATF 16949 §8.7.1 with full 8D traceability
 * and integration to NCR, CAPA, SCAR, and complaint modules.
 *
 * State machine:
 *   open              → assign, record-containment, reject-claim
 *   under_investigation → record-root-cause, link-ncr, link-capa, issue-8d, close, reject-claim
 *   awaiting_parts     → record-return-received, reject-claim
 *   parts_received     → record-root-cause, close, reject-claim
 *   closed             → reopen
 *   rejected           → (terminal)
 *
 * Standards: IATF 16949 §8.7.1, ISO 9001:2015 §8.7
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsWarrantyController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'warranty_claim';
    private const MODULE      = 'warranty';
    private const TABLE       = 'eqms_warranty_claims';
    protected const PK        = 'claim_id';

    private const STATE_MACHINE = [
        'open'                 => ['assign', 'record-containment', 'reject-claim'],
        'under_investigation'  => ['record-root-cause', 'link-ncr', 'link-capa', 'issue-8d', 'close', 'reject-claim'],
        'awaiting_parts'       => ['record-return-received', 'reject-claim'],
        'parts_received'       => ['record-root-cause', 'close', 'reject-claim'],
        'closed'               => ['reopen'],
        'rejected'             => [],
    ];

    private const CLAIM_TYPES  = ['warranty', 'goodwill', 'field_return', 'recall', 'debit_note'];
    private const CLAIM_SOURCES = ['customer', 'field_service', 'distribution', 'internal'];

    private function warrantyWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'customer_service', 'sales_manager', 'field_service',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    private function loadClaim(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE claim_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('warranty_claim_not_found', 404, "Warranty claim '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('WC-%s-%05d', $year, (int)$seq);
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /** POST /eqms/warranty/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[]      = "(claim_number ILIKE :search OR title ILIKE :search
                                   OR customer_name ILIKE :search OR part_number ILIKE :search
                                   OR serial_number ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'claim_type', 'customer_id', 'disposition'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[]    = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }
        if (!empty($q['filters']['part_number'])) {
            $conditions[]    = 'part_number ILIKE :part';
            $params[':part'] = '%' . $q['filters']['part_number'] . '%';
        }
        if (!empty($q['filters']['lot_number'])) {
            $conditions[]    = 'lot_number = :lot';
            $params[':lot']  = $q['filters']['lot_number'];
        }
        if (!empty($q['filters']['date_from'])) {
            $conditions[]         = 'claim_date >= :date_from';
            $params[':date_from'] = $q['filters']['date_from'];
        }
        if (!empty($q['filters']['date_to'])) {
            $conditions[]       = 'claim_date <= :date_to';
            $params[':date_to'] = $q['filters']['date_to'];
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], [
            'claim_number', 'title', 'claim_date', 'customer_name', 'claim_amount',
            'status', 'claim_type', 'created_at',
        ], true) ? $q['sort_by'] : 'claim_date';
        $sortDir = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT claim_id, claim_number, title, claim_type, claim_source,
                    customer_id, customer_name, claim_date,
                    part_number, serial_number, lot_number, quantity_claimed, quantity_unit,
                    claim_amount, claim_currency, disposition,
                    return_required, parts_returned,
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

        $this->paginated('warranty_claims', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/warranty/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT claim_type, COUNT(*) AS count FROM " . self::TABLE . "
             GROUP BY claim_type ORDER BY claim_type"
        ) ?? [];

        $openAmount = $this->data->scalar(
            "SELECT COALESCE(SUM(claim_amount), 0) FROM " . self::TABLE . "
             WHERE status NOT IN ('closed', 'rejected') AND claim_amount IS NOT NULL"
        ) ?? 0;

        $awaitingParts = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status = 'awaiting_parts'"
        ) ?? 0);

        $avgCycleTimeDays = $this->data->scalar(
            "SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400), 1)
             FROM " . self::TABLE . " WHERE status = 'closed' AND closed_at IS NOT NULL"
        ) ?? null;

        $ytdCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE created_at >= date_trunc('year', now())"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'           => $byStatus,
                'by_type'             => $byType,
                'open_claim_amount'   => (float)$openAmount,
                'awaiting_parts'      => $awaitingParts,
                'avg_cycle_time_days' => $avgCycleTimeDays !== null ? (float)$avgCycleTimeDays : null,
                'ytd_count'           => $ytdCount,
            ],
        ]);
    }

    /** POST /eqms/warranty/lookup */
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
            "SELECT claim_id, claim_number, title, customer_name, claim_type, status
             FROM " . self::TABLE . " WHERE claim_id IN ({$ph})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /** POST /eqms/warranty */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());

        $body        = $this->jsonBody();
        $title       = trim((string)($body['title'] ?? ''));
        $claimType   = trim((string)($body['claim_type'] ?? 'warranty'));
        $claimSource = trim((string)($body['claim_source'] ?? 'customer'));
        $claimDate   = trim((string)($body['claim_date'] ?? date('Y-m-d')));
        $failDesc    = trim((string)($body['failure_description'] ?? ''));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if (!in_array($claimType, self::CLAIM_TYPES, true)) {
            $this->error('invalid_claim_type', 400,
                "'claim_type' must be one of: " . implode(', ', self::CLAIM_TYPES) . '.');
        }
        if (!in_array($claimSource, self::CLAIM_SOURCES, true)) {
            $this->error('invalid_claim_source', 400,
                "'claim_source' must be one of: " . implode(', ', self::CLAIM_SOURCES) . '.');
        }

        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (claim_id, claim_number, title, description,
              claim_type, claim_source, customer_id, customer_name,
              customer_claim_ref, claim_date,
              part_number, part_revision, serial_number, lot_number,
              quantity_claimed, quantity_unit, failure_description,
              failure_mode, failure_date, failure_mileage, vehicle_vin,
              claim_amount, claim_currency,
              disposition, return_required,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc,
              :ctype, :csource, :cust_id, :cust_name,
              :cust_ref, :claim_date,
              :part, :part_rev, :serial, :lot,
              :qty, :qty_unit, :fail_desc,
              :fail_mode, :fail_date, :mileage, :vin,
              :amount, :currency,
              :disposition, :return_req,
              'open', 1, :now, :by)",
            [
                ':id'          => $id,
                ':num'         => $number,
                ':title'       => $title,
                ':desc'        => trim((string)($body['description'] ?? '')),
                ':ctype'       => $claimType,
                ':csource'     => $claimSource,
                ':cust_id'     => $body['customer_id'] ?? null,
                ':cust_name'   => $body['customer_name'] ?? null,
                ':cust_ref'    => $body['customer_claim_ref'] ?? null,
                ':claim_date'  => $claimDate,
                ':part'        => $body['part_number'] ?? null,
                ':part_rev'    => $body['part_revision'] ?? null,
                ':serial'      => $body['serial_number'] ?? null,
                ':lot'         => $body['lot_number'] ?? null,
                ':qty'         => isset($body['quantity_claimed']) ? (float)$body['quantity_claimed'] : null,
                ':qty_unit'    => $body['quantity_unit'] ?? null,
                ':fail_desc'   => $failDesc,
                ':fail_mode'   => $body['failure_mode'] ?? null,
                ':fail_date'   => $body['failure_date'] ?? null,
                ':mileage'     => isset($body['failure_mileage']) ? (int)$body['failure_mileage'] : null,
                ':vin'         => $body['vehicle_vin'] ?? null,
                ':amount'      => isset($body['claim_amount']) ? (float)$body['claim_amount'] : null,
                ':currency'    => $body['claim_currency'] ?? 'USD',
                ':disposition' => $body['disposition'] ?? null,
                ':return_req'  => !empty($body['return_required']),
                ':now'         => $now,
                ':by'          => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.warranty.created', self::ENTITY_TYPE, $id, [
            'claim_number' => $number,
            'claim_type'   => $claimType,
            'customer_id'  => $body['customer_id'] ?? null,
        ], $user);

        $record = $this->loadClaim($id);
        $this->success(['warranty_claim' => $record], 201);
    }

    /** GET /eqms/warranty/{id} */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    /** PATCH /eqms/warranty/{id} */
    public function update(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());

        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);

        $this->requireVersionMatch((int)$record['version'], $id);

        if ($record['status'] === 'rejected') {
            $this->error('record_locked', 409, "Rejected warranty claims cannot be updated.");
        }

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $id, ':ver' => ((int)$record['version']) + 1];
        $updatable = [
            'title', 'description', 'claim_type', 'claim_source',
            'customer_id', 'customer_name', 'customer_claim_ref',
            'part_number', 'part_revision', 'serial_number', 'lot_number',
            'quantity_claimed', 'quantity_unit', 'failure_description',
            'failure_mode', 'failure_date', 'failure_mileage', 'vehicle_vin',
            'claim_amount', 'claim_currency', 'approved_amount', 'debit_note_ref',
            'disposition', 'return_required', 'return_tracking_number',
            'root_cause_category', 'root_cause_description', 'containment_action',
            'corrective_action_ref', 'eight_d_ref',
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
            " WHERE claim_id = :id AND version = " . (int)$record['version'],
            $params
        );

        $this->emitQualityEvent('eqms.warranty.updated', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->serveAvailableActions((string)$record['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'claim_id');
        $this->loadClaim($id);
        $this->serveExport(self::MODULE, $id, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /** POST /eqms/warranty/{id}/actions/assign */
    public function actionAssign(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->requireValidTransition((string)$record['status'], 'assign', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body   = $this->jsonBody();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $sets   = ["status = 'under_investigation'", "version = :ver", "updated_at = now()", "updated_by = :by"];
        $params = [':ver' => $newVer, ':by' => $actor, ':id' => $id, ':oldver' => (int)$record['version']];
        if (!empty($body['return_required'])) {
            $sets[]               = 'return_required = TRUE';
            $sets[]               = "status = 'awaiting_parts'";
        }
        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE claim_id = :id AND version = :oldver",
            $params
        );
        $this->emitQualityEvent('eqms.warranty.assigned', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    /** POST /eqms/warranty/{id}/actions/record-containment */
    public function actionRecordContainment(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->requireValidTransition((string)$record['status'], 'record-containment', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body        = $this->jsonBody();
        $containment = trim((string)($body['containment_action'] ?? ''));
        if ($containment === '') {
            $this->error('containment_action_required', 400, "'containment_action' is required.");
        }
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET containment_action = :cont, status = 'under_investigation',
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE claim_id = :id AND version = :oldver",
            [':cont' => $containment, ':ver' => $newVer, ':by' => $actor, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.warranty.containment_recorded', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    /** POST /eqms/warranty/{id}/actions/record-return-received */
    public function actionRecordReturnReceived(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->requireValidTransition((string)$record['status'], 'record-return-received', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body   = $this->jsonBody();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'parts_received', parts_returned = TRUE,
                 return_received_date = :recv_date,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE claim_id = :id AND version = :oldver",
            [
                ':recv_date' => $body['return_received_date'] ?? date('Y-m-d'),
                ':ver'       => $newVer, ':by' => $actor,
                ':id'        => $id, ':oldver' => (int)$record['version'],
            ]
        );
        $this->emitQualityEvent('eqms.warranty.return_received', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    /** POST /eqms/warranty/{id}/actions/record-root-cause */
    public function actionRecordRootCause(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->requireValidTransition((string)$record['status'], 'record-root-cause', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body     = $this->jsonBody();
        $rcDesc   = trim((string)($body['root_cause_description'] ?? ''));
        $rcCat    = trim((string)($body['root_cause_category'] ?? ''));
        if ($rcDesc === '') {
            $this->error('root_cause_description_required', 400, "'root_cause_description' is required.");
        }
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET root_cause_description = :rc_desc, root_cause_category = :rc_cat,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE claim_id = :id AND version = :oldver",
            [':rc_desc' => $rcDesc, ':rc_cat' => $rcCat, ':ver' => $newVer, ':by' => $actor, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.warranty.root_cause_recorded', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    /** POST /eqms/warranty/{id}/actions/close */
    public function actionClose(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->requireValidTransition((string)$record['status'], 'close', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body   = $this->jsonBody();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $sets   = ["status = 'closed'", "closed_by = :by", "closed_at = now()", "version = :ver", "updated_at = now()", "updated_by = :by"];
        $params = [':ver' => $newVer, ':by' => $actor, ':id' => $id, ':oldver' => (int)$record['version']];
        foreach (['closure_notes', 'approved_amount', 'customer_acceptance_ref', 'debit_note_ref'] as $f) {
            if (array_key_exists($f, $body)) {
                $sets[]              = "{$f} = :{$f}";
                $params[":{$f}"]     = $body[$f];
            }
        }
        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE claim_id = :id AND version = :oldver",
            $params
        );
        $this->emitQualityEvent('eqms.warranty.closed', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    /** POST /eqms/warranty/{id}/actions/reject-claim */
    public function actionRejectClaim(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->requireValidTransition((string)$record['status'], 'reject-claim', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $body   = $this->jsonBody();
        $reason = trim((string)($body['rejection_reason'] ?? ''));
        if ($reason === '') {
            $this->error('rejection_reason_required', 400, "'rejection_reason' is required.");
        }
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'rejected', closure_notes = :reason,
                 closed_by = :by, closed_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE claim_id = :id AND version = :oldver",
            [':reason' => $reason, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.warranty.claim_rejected', self::ENTITY_TYPE, $id, ['reason' => $reason], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }

    /** POST /eqms/warranty/{id}/actions/reopen */
    public function actionReopen(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->warrantyWriteRoles());
        $id     = $this->requirePathId('id', 'claim_id');
        $record = $this->loadClaim($id);
        $this->requireValidTransition((string)$record['status'], 'reopen', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'under_investigation', closed_by = NULL, closed_at = NULL,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE claim_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );
        $this->emitQualityEvent('eqms.warranty.reopened', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['warranty_claim' => $this->loadClaim($id)]);
    }
}
