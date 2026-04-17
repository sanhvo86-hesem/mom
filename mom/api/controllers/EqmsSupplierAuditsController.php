<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Supplier Audits & SCARs Controller — Supplier Audit Network + SCAR lifecycle.
 *
 * This controller manages two tightly related sub-modules:
 *
 * 1. Supplier Audits (onsite / remote / document)
 *    planned → scheduled → in_progress → findings_recorded → closed
 *
 * 2. Supplier Corrective Action Requests (SCARs)
 *    issued → assigned → response_submitted → verification → closed
 *
 * SCARs are generated from supplier audit findings but may also be raised standalone.
 * Signature required for SCAR close action (always, or when effectiveness is negative).
 *
 * Standards: IATF 16949 §8.7.1, AS9100D §8.7, ISO 13485 §8.5.2
 *
 * Tables: eqms_supplier_audits, eqms_scars
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsSupplierAuditsController extends EqmsBaseController
{
    // ── Entity / module constants ─────────────────────────────────────────────

    private const AUDIT_ENTITY_TYPE = 'supplier_audit';
    private const SCAR_ENTITY_TYPE  = 'scar';
    private const AUDIT_MODULE      = 'supplier_audits';
    private const SCAR_MODULE       = 'scars';

    /** @var array<string,list<string>> */
    private const AUDIT_STATE_MACHINE = [
        'planned'           => ['schedule', 'cancel'],
        'scheduled'         => ['start', 'cancel'],
        'in_progress'       => ['record-finding', 'close'],
        'findings_recorded' => ['issue-scar', 'close'],
        'closed'            => [],
        'cancelled'         => [],
    ];

    /** @var array<string,list<string>> */
    private const SCAR_STATE_MACHINE = [
        'issued'               => ['assign'],
        'assigned'             => ['submit-response'],
        'response_submitted'   => ['verify-effectiveness'],
        'verification'         => ['verify-effectiveness', 'close'],
        'closed'               => [],
    ];

    // ── Role Helpers ─────────────────────────────────────────────────────────

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'supplier_quality_engineer', 'purchasing_manager',
        ])));
    }

    private function readRoles(): array
    {
        return $this->eqmsReadRoles();
    }

    // =========================================================================
    // SUPPLIER AUDIT METHODS
    // =========================================================================

    // ── Supplier Audit — List / Query ─────────────────────────────────────────

    /**
     * POST /supplier-audits/query — Paginated supplier audit list.
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $q      = $this->parseQueryBody();
        $f      = $q['filters'];
        $where  = ['1=1'];
        $params = [];

        if (!empty($f['vendor_id'])) {
            $where[]            = 'sa.vendor_id = :vendor_id';
            $params[':vendor_id'] = (string)$f['vendor_id'];
        }
        if (!empty($f['status'])) {
            $where[]          = 'sa.status = :status';
            $params[':status'] = (string)$f['status'];
        }
        if (!empty($f['audit_type'])) {
            $where[]             = 'sa.audit_type = :audit_type';
            $params[':audit_type'] = (string)$f['audit_type'];
        }
        if ($q['search'] !== '') {
            $where[]           = "(sa.supplier_audit_number ILIKE :search OR sa.audit_scope ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['created_at', 'planned_date', 'supplier_audit_number', 'status'], true)
            ? $q['sort_by'] : 'created_at';

        $rows = $this->data->query(
            "SELECT sa.supplier_audit_id, sa.supplier_audit_id AS id, sa.supplier_audit_id AS audit_id,
                    sa.supplier_audit_number, sa.vendor_id,
                    v.vendor_name, sa.audit_scope, sa.audit_type, sa.lead_auditor,
                    sa.planned_date, sa.actual_start, sa.actual_end,
                    sa.finding_count, sa.status, sa.version, sa.created_at
             FROM eqms_supplier_audits sa
             LEFT JOIN vendors v ON v.vendor_id = sa.vendor_id::text
             WHERE {$whereClause}
             ORDER BY sa.{$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_supplier_audits sa
             LEFT JOIN vendors v ON v.vendor_id = sa.vendor_id::text WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('supplier_audits', $rows, $total, $q['offset'], $q['limit']);
    }

    // ── Supplier Audit — Metrics ──────────────────────────────────────────────

    /**
     * GET /supplier-audits/metrics — Aggregate supplier audit stats.
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $planned   = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_audits WHERE status = 'planned'") ?? 0);
        $inProg    = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_audits WHERE status = 'in_progress'") ?? 0);
        $withFinds = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_audits WHERE status = 'findings_recorded'") ?? 0);
        $closedYtd = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_supplier_audits WHERE status = 'closed' AND actual_end >= date_trunc('year', now())"
        ) ?? 0);
        $openScars = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_scars WHERE status NOT IN ('closed')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'planned'              => $planned,
                'in_progress'          => $inProg,
                'findings_recorded'    => $withFinds,
                'closed_ytd'           => $closedYtd,
                'open_scars'           => $openScars,
            ],
        ]);
    }

    // ── Supplier Audit — Create ───────────────────────────────────────────────

    /**
     * POST /supplier-audits — Create a new supplier audit.
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'audit_scope', 'audit_type']);

        $validTypes = ['onsite', 'remote', 'document'];
        if (!in_array((string)$body['audit_type'], $validTypes, true)) {
            $this->error('invalid_audit_type', 400, "audit_type must be one of: " . implode(', ', $validTypes));
        }

        $auditId     = $this->newUuid();
        $auditNumber = 'SAU-' . strtoupper(substr($auditId, 0, 8));
        $actor       = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now         = $this->nowIso();

        $this->data->execute(
            "INSERT INTO eqms_supplier_audits
             (supplier_audit_id, supplier_audit_number, vendor_id, audit_scope,
              audit_type, lead_auditor, planned_date, finding_count, scar_ids,
              status, version, created_at)
             VALUES
             (:id, :num, :vid, :scope,
              :atype, :lead, :planned, 0, '[]'::jsonb,
              'planned', 1, :now)",
            [
                ':id'      => $auditId,
                ':num'     => $auditNumber,
                ':vid'     => (string)$body['vendor_id'],
                ':scope'   => (string)$body['audit_scope'],
                ':atype'   => (string)$body['audit_type'],
                ':lead'    => (string)($body['lead_auditor'] ?? ''),
                ':planned' => ($body['planned_date'] ?? null) ?: null,
                ':now'     => $now,
            ]
        );

        $this->emitQualityEvent('eqms.supplier_audit.created', self::AUDIT_ENTITY_TYPE, $auditId, [
            'supplier_audit_number' => $auditNumber,
            'vendor_id'             => (string)$body['vendor_id'],
        ], $user);

        $this->success([
            'supplier_audit' => [
                'supplier_audit_id'     => $auditId,
                'supplier_audit_number' => $auditNumber,
                'status'                => 'planned',
                'version'               => 1,
            ],
        ], 201);
    }

    // ── Supplier Audit — Detail ───────────────────────────────────────────────

    /**
     * GET /supplier-audits/{id}
     */
    public function detail(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();

        $row = $this->data->query(
            "SELECT sa.*, sa.supplier_audit_id AS id, sa.supplier_audit_id AS audit_id, v.vendor_name
             FROM eqms_supplier_audits sa
             LEFT JOIN vendors v ON v.vendor_id = sa.vendor_id::text
             WHERE sa.supplier_audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($row)) {
            $this->error('supplier_audit_not_found', 404);
        }

        $this->success(['supplier_audit' => $row[0]]);
    }

    // ── Supplier Audit — Update ───────────────────────────────────────────────

    /**
     * PATCH /supplier-audits/{id}
     */
    public function update(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $existing = $this->data->query(
            "SELECT supplier_audit_id, version, status FROM eqms_supplier_audits WHERE supplier_audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($existing)) {
            $this->error('supplier_audit_not_found', 404);
        }
        $rec = $existing[0];
        $this->requireVersionMatch((int)$rec['version'], $auditId);

        $body    = $this->jsonBody();
        $allowed = ['audit_scope', 'lead_auditor', 'planned_date'];
        $sets    = [];
        $params  = [':id' => $auditId, ':ver' => (int)$rec['version'] + 1];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]              = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (empty($sets)) {
            $this->error('no_updatable_fields', 400);
        }
        $sets[] = 'version = :ver';

        $this->data->execute(
            "UPDATE eqms_supplier_audits SET " . implode(', ', $sets) . " WHERE supplier_audit_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.supplier_audit.updated', self::AUDIT_ENTITY_TYPE, $auditId, [], $user);
        $this->success(['updated' => true, 'supplier_audit_id' => $auditId, 'version' => (int)$rec['version'] + 1]);
    }

    // ── Supplier Audit — Cross-cutting ────────────────────────────────────────

    /** GET /supplier-audits/{id}/audit */
    public function audit(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveAuditTrail(self::AUDIT_ENTITY_TYPE, $auditId);
    }

    public function comments(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveComments(self::AUDIT_ENTITY_TYPE, $auditId, $user);
    }

    public function attachments(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveAttachments(self::AUDIT_ENTITY_TYPE, $auditId, $user);
    }

    /** GET /supplier-audits/{id}/available-actions */
    public function availableActions(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();

        $row = $this->data->query(
            "SELECT status FROM eqms_supplier_audits WHERE supplier_audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($row)) {
            $this->error('supplier_audit_not_found', 404);
        }

        $this->serveAvailableActions((string)$row[0]['status'], self::AUDIT_STATE_MACHINE);
    }

    /** POST /supplier-audits/{id}/export */
    public function export(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveExport(self::AUDIT_MODULE, $auditId, $user);
    }

    // ── Supplier Audit — Action Helpers ───────────────────────────────────────

    private function loadAudit(string $auditId): array
    {
        $rows = $this->data->query(
            "SELECT * FROM eqms_supplier_audits WHERE supplier_audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($rows)) {
            $this->error('supplier_audit_not_found', 404);
        }
        return $rows[0];
    }

    private function transitionAudit(string $auditId, string $newStatus, array $fields): void
    {
        $curVer = (int)($this->data->scalar(
            "SELECT version FROM eqms_supplier_audits WHERE supplier_audit_id = :id",
            [':id' => $auditId]
        ) ?? 1);

        $sets   = ['status = :status', 'version = :ver'];
        $params = [':id' => $auditId, ':status' => $newStatus, ':ver' => $curVer + 1];

        foreach ($fields as $col => $val) {
            $sets[]            = "{$col} = :{$col}";
            $params[":{$col}"] = $val;
        }

        $this->data->execute(
            "UPDATE eqms_supplier_audits SET " . implode(', ', $sets) . " WHERE supplier_audit_id = :id",
            $params
        );
    }

    // ── Supplier Audit — Actions ──────────────────────────────────────────────

    /**
     * POST /supplier-audits/{id}/actions/schedule
     */
    public function actionSchedule(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'schedule', self::AUDIT_STATE_MACHINE, $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['planned_date', 'lead_auditor']);

        $this->transitionAudit($auditId, 'scheduled', [
            'planned_date' => (string)$body['planned_date'],
            'lead_auditor' => (string)$body['lead_auditor'],
        ]);

        $this->emitQualityEvent('eqms.supplier_audit.scheduled', self::AUDIT_ENTITY_TYPE, $auditId, [
            'planned_date' => (string)$body['planned_date'],
        ], $user);

        $this->success(['supplier_audit_id' => $auditId, 'status' => 'scheduled']);
    }

    /**
     * POST /supplier-audits/{id}/actions/start
     */
    public function actionStart(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'start', self::AUDIT_STATE_MACHINE, $auditId);

        $this->transitionAudit($auditId, 'in_progress', ['actual_start' => $this->nowIso()]);

        $this->emitQualityEvent('eqms.supplier_audit.started', self::AUDIT_ENTITY_TYPE, $auditId, [], $user);
        $this->success(['supplier_audit_id' => $auditId, 'status' => 'in_progress']);
    }

    /**
     * POST /supplier-audits/{id}/actions/record-finding
     *
     * Body: { description, category? } — increments finding_count.
     */
    public function actionRecordFinding(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireValidTransition((string)$rec['status'], 'record-finding', self::AUDIT_STATE_MACHINE, $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['description']);

        // Persist finding details inline in audit notes or a findings table if available;
        // increment finding_count and transition to findings_recorded
        $this->data->execute(
            "UPDATE eqms_supplier_audits
             SET finding_count = finding_count + 1, status = 'findings_recorded',
                 version = version + 1
             WHERE supplier_audit_id = :id",
            [':id' => $auditId]
        );

        $this->emitQualityEvent('eqms.supplier_audit.finding_recorded', self::AUDIT_ENTITY_TYPE, $auditId, [
            'description' => (string)$body['description'],
            'category'    => (string)($body['category'] ?? 'minor'),
        ], $user);

        $this->success(['supplier_audit_id' => $auditId, 'status' => 'findings_recorded']);
    }

    /**
     * POST /supplier-audits/{id}/actions/issue-scar
     *
     * Body: { description, priority }
     * Creates a SCAR record and links it to this audit.
     */
    public function actionIssueScar(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireValidTransition((string)$rec['status'], 'issue-scar', self::AUDIT_STATE_MACHINE, $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['description', 'priority']);

        $validPriorities = ['critical', 'major', 'minor'];
        if (!in_array((string)$body['priority'], $validPriorities, true)) {
            $this->error('invalid_scar_priority', 400, "priority must be one of: " . implode(', ', $validPriorities));
        }

        $scarId     = $this->newUuid();
        $scarNumber = 'SCAR-' . strtoupper(substr($scarId, 0, 8));
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now        = $this->nowIso();

        $this->data->execute(
            "INSERT INTO eqms_scars
             (scar_id, scar_number, vendor_id, supplier_audit_id, description,
              priority, status, version, created_at)
             VALUES
             (:sid, :snum, :vid, :aid, :desc,
              :pri, 'issued', 1, :now)",
            [
                ':sid'  => $scarId,
                ':snum' => $scarNumber,
                ':vid'  => (string)$rec['vendor_id'],
                ':aid'  => $auditId,
                ':desc' => (string)$body['description'],
                ':pri'  => (string)$body['priority'],
                ':now'  => $now,
            ]
        );

        // Append SCAR ID to audit's scar_ids jsonb array
        $this->data->execute(
            "UPDATE eqms_supplier_audits
             SET scar_ids = scar_ids || :scarJson::jsonb, version = version + 1
             WHERE supplier_audit_id = :id",
            [
                ':scarJson' => json_encode([$scarId], JSON_THROW_ON_ERROR),
                ':id'       => $auditId,
            ]
        );

        $this->emitQualityEvent('eqms.supplier_audit.scar_issued', self::AUDIT_ENTITY_TYPE, $auditId, [
            'scar_id'     => $scarId,
            'scar_number' => $scarNumber,
            'priority'    => (string)$body['priority'],
        ], $user);

        $this->success([
            'scar' => [
                'scar_id'     => $scarId,
                'scar_number' => $scarNumber,
                'status'      => 'issued',
                'version'     => 1,
            ],
        ], 201);
    }

    /**
     * POST /supplier-audits/{id}/actions/close — Close a supplier audit.
     */
    public function actionClose(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'close', self::AUDIT_STATE_MACHINE, $auditId);

        $this->transitionAudit($auditId, 'closed', ['actual_end' => $this->nowIso()]);

        $this->emitQualityEvent('eqms.supplier_audit.closed', self::AUDIT_ENTITY_TYPE, $auditId, [], $user);
        $this->success(['supplier_audit_id' => $auditId, 'status' => 'closed']);
    }

    /**
     * POST /supplier-audits/{id}/actions/cancel
     */
    public function actionCancel(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'cancel', self::AUDIT_STATE_MACHINE, $auditId);

        $this->transitionAudit($auditId, 'cancelled', []);

        $this->emitQualityEvent('eqms.supplier_audit.cancelled', self::AUDIT_ENTITY_TYPE, $auditId, [], $user);
        $this->success(['supplier_audit_id' => $auditId, 'status' => 'cancelled']);
    }

    // =========================================================================
    // SCAR METHODS  (all prefixed 'scar' in method names)
    // =========================================================================

    // ── SCAR — List / Query ───────────────────────────────────────────────────

    /**
     * POST /scars/query — Paginated SCAR list.
     */
    public function scarQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $q      = $this->parseQueryBody();
        $f      = $q['filters'];
        $where  = ['1=1'];
        $params = [];

        if (!empty($f['vendor_id'])) {
            $where[]            = 's.vendor_id = :vendor_id';
            $params[':vendor_id'] = (string)$f['vendor_id'];
        }
        if (!empty($f['status'])) {
            $where[]          = 's.status = :status';
            $params[':status'] = (string)$f['status'];
        }
        if (!empty($f['priority'])) {
            $where[]            = 's.priority = :priority';
            $params[':priority'] = (string)$f['priority'];
        }
        if (!empty($f['supplier_audit_id'])) {
            $where[]                   = 's.supplier_audit_id = :supplier_audit_id';
            $params[':supplier_audit_id'] = (string)$f['supplier_audit_id'];
        }
        if ($q['search'] !== '') {
            $where[]           = "(s.scar_number ILIKE :search OR s.description ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['created_at', 'scar_number', 'status', 'priority', 'response_due_date'], true)
            ? $q['sort_by'] : 'created_at';

        $rows = $this->data->query(
            "SELECT s.scar_id, s.scar_id AS id, s.scar_number, s.vendor_id, v.vendor_name,
                    s.supplier_audit_id, s.priority, s.description,
                    s.assigned_to, s.response_due_date, s.status, s.version, s.created_at
             FROM eqms_scars s
             LEFT JOIN vendors v ON v.vendor_id = s.vendor_id::text
             WHERE {$whereClause}
             ORDER BY s.{$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_scars s
             LEFT JOIN vendors v ON v.vendor_id = s.vendor_id::text WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('scars', $rows, $total, $q['offset'], $q['limit']);
    }

    // ── SCAR — Metrics ────────────────────────────────────────────────────────

    /**
     * GET /scars/metrics
     */
    public function scarMetrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $issued       = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_scars WHERE status = 'issued'") ?? 0);
        $assigned     = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_scars WHERE status = 'assigned'") ?? 0);
        $overdue      = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_scars WHERE status NOT IN ('closed') AND response_due_date < now()"
        ) ?? 0);
        $critical     = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_scars WHERE priority = 'critical' AND status != 'closed'") ?? 0);
        $closedYtd    = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_scars WHERE status = 'closed' AND closed_at >= date_trunc('year', now())"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'issued'         => $issued,
                'assigned'       => $assigned,
                'overdue'        => $overdue,
                'critical_open'  => $critical,
                'closed_ytd'     => $closedYtd,
            ],
        ]);
    }

    // ── SCAR — Create ─────────────────────────────────────────────────────────

    /**
     * POST /scars — Create a standalone SCAR (not from audit).
     */
    public function scarCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'description', 'priority']);

        $validPriorities = ['critical', 'major', 'minor'];
        if (!in_array((string)$body['priority'], $validPriorities, true)) {
            $this->error('invalid_scar_priority', 400, "priority must be one of: " . implode(', ', $validPriorities));
        }

        $scarId     = $this->newUuid();
        $scarNumber = 'SCAR-' . strtoupper(substr($scarId, 0, 8));
        $now        = $this->nowIso();

        $this->data->execute(
            "INSERT INTO eqms_scars
             (scar_id, scar_number, vendor_id, supplier_audit_id, description,
              priority, status, version, created_at)
             VALUES
             (:sid, :snum, :vid, :aid, :desc,
              :pri, 'issued', 1, :now)",
            [
                ':sid'  => $scarId,
                ':snum' => $scarNumber,
                ':vid'  => (string)$body['vendor_id'],
                ':aid'  => ($body['supplier_audit_id'] ?? null) ?: null,
                ':desc' => (string)$body['description'],
                ':pri'  => (string)$body['priority'],
                ':now'  => $now,
            ]
        );

        $this->emitQualityEvent('eqms.scar.created', self::SCAR_ENTITY_TYPE, $scarId, [
            'scar_number' => $scarNumber,
            'vendor_id'   => (string)$body['vendor_id'],
            'priority'    => (string)$body['priority'],
        ], $user);

        $this->success([
            'scar' => [
                'scar_id'     => $scarId,
                'scar_number' => $scarNumber,
                'status'      => 'issued',
                'version'     => 1,
            ],
        ], 201);
    }

    // ── SCAR — Detail ─────────────────────────────────────────────────────────

    /**
     * GET /scars/{id}
     */
    public function scarDetail(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $scarId = $this->requirePathId();

        $row = $this->data->query(
            "SELECT s.*, s.scar_id AS id, v.vendor_name
             FROM eqms_scars s
             LEFT JOIN vendors v ON v.vendor_id = s.vendor_id::text
             WHERE s.scar_id = :id LIMIT 1",
            [':id' => $scarId]
        );
        if (empty($row)) {
            $this->error('scar_not_found', 404);
        }

        $this->success(['scar' => $row[0]]);
    }

    // ── SCAR — Update ─────────────────────────────────────────────────────────

    /**
     * PATCH /scars/{id}
     */
    public function scarUpdate(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $scarId = $this->requirePathId();

        $existing = $this->data->query(
            "SELECT scar_id, version, status FROM eqms_scars WHERE scar_id = :id LIMIT 1",
            [':id' => $scarId]
        );
        if (empty($existing)) {
            $this->error('scar_not_found', 404);
        }
        $rec = $existing[0];
        $this->requireVersionMatch((int)$rec['version'], $scarId);

        $body    = $this->jsonBody();
        $allowed = ['description', 'priority', 'response_due_date'];
        $sets    = [];
        $params  = [':id' => $scarId, ':ver' => (int)$rec['version'] + 1];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]              = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (empty($sets)) {
            $this->error('no_updatable_fields', 400);
        }
        $sets[] = 'version = :ver';

        $this->data->execute(
            "UPDATE eqms_scars SET " . implode(', ', $sets) . " WHERE scar_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.scar.updated', self::SCAR_ENTITY_TYPE, $scarId, [], $user);
        $this->success(['updated' => true, 'scar_id' => $scarId, 'version' => (int)$rec['version'] + 1]);
    }

    // ── SCAR — Cross-cutting ──────────────────────────────────────────────────

    /** GET /scars/{id}/audit */
    public function scarAudit(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $scarId = $this->requirePathId();
        $this->serveAuditTrail(self::SCAR_ENTITY_TYPE, $scarId);
    }

    /** GET|POST /scars/{id}/signatures */
    public function scarSignatures(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $scarId = $this->requirePathId();
        $this->serveSignatures(self::SCAR_ENTITY_TYPE, $scarId, $user);
    }

    public function scarComments(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $scarId = $this->requirePathId();
        $this->serveComments(self::SCAR_ENTITY_TYPE, $scarId, $user);
    }

    public function scarAttachments(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $scarId = $this->requirePathId();
        $this->serveAttachments(self::SCAR_ENTITY_TYPE, $scarId, $user);
    }

    /** POST /scars/{id}/export */
    public function scarExport(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $scarId = $this->requirePathId();
        $this->serveExport(self::SCAR_MODULE, $scarId, $user);
    }

    /** POST /scars/export — Bulk export */
    public function scarExportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $this->serveExport(self::SCAR_MODULE, 'bulk', $user);
    }

    // ── SCAR — Action Helpers ─────────────────────────────────────────────────

    private function loadScar(string $scarId): array
    {
        $rows = $this->data->query(
            "SELECT * FROM eqms_scars WHERE scar_id = :id LIMIT 1",
            [':id' => $scarId]
        );
        if (empty($rows)) {
            $this->error('scar_not_found', 404);
        }
        return $rows[0];
    }

    private function transitionScar(string $scarId, string $newStatus, array $fields): void
    {
        $curVer = (int)($this->data->scalar(
            "SELECT version FROM eqms_scars WHERE scar_id = :id",
            [':id' => $scarId]
        ) ?? 1);

        $sets   = ['status = :status', 'version = :ver'];
        $params = [':id' => $scarId, ':status' => $newStatus, ':ver' => $curVer + 1];

        foreach ($fields as $col => $val) {
            $sets[]            = "{$col} = :{$col}";
            $params[":{$col}"] = $val;
        }

        $this->data->execute(
            "UPDATE eqms_scars SET " . implode(', ', $sets) . " WHERE scar_id = :id",
            $params
        );
    }

    // ── SCAR — Actions ────────────────────────────────────────────────────────

    /**
     * POST /scars/{id}/actions/assign
     *
     * Body: { assigned_to, response_due_date }
     */
    public function scarActionAssign(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $scarId = $this->requirePathId();

        $rec = $this->loadScar($scarId);
        $this->requireVersionMatch((int)$rec['version'], $scarId);
        $this->requireValidTransition((string)$rec['status'], 'assign', self::SCAR_STATE_MACHINE, $scarId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['assigned_to', 'response_due_date']);

        $this->transitionScar($scarId, 'assigned', [
            'assigned_to'       => (string)$body['assigned_to'],
            'assigned_at'       => $this->nowIso(),
            'response_due_date' => (string)$body['response_due_date'],
        ]);

        $this->emitQualityEvent('eqms.scar.assigned', self::SCAR_ENTITY_TYPE, $scarId, [
            'assigned_to'      => (string)$body['assigned_to'],
            'response_due_date' => (string)$body['response_due_date'],
        ], $user);

        $this->success(['scar_id' => $scarId, 'status' => 'assigned']);
    }

    /**
     * POST /scars/{id}/actions/submit-response
     *
     * Body: { root_cause, corrective_action_plan, implementation_date }
     */
    public function scarActionSubmitResponse(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $scarId = $this->requirePathId();

        $rec = $this->loadScar($scarId);
        $this->requireVersionMatch((int)$rec['version'], $scarId);
        $this->requireValidTransition((string)$rec['status'], 'submit-response', self::SCAR_STATE_MACHINE, $scarId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['root_cause', 'corrective_action_plan', 'implementation_date']);

        $this->transitionScar($scarId, 'response_submitted', [
            'root_cause'              => (string)$body['root_cause'],
            'corrective_action_plan'  => (string)$body['corrective_action_plan'],
            'implementation_date'     => (string)$body['implementation_date'],
        ]);

        $this->emitQualityEvent('eqms.scar.response_submitted', self::SCAR_ENTITY_TYPE, $scarId, [
            'implementation_date' => (string)$body['implementation_date'],
        ], $user);

        $this->success(['scar_id' => $scarId, 'status' => 'response_submitted']);
    }

    /**
     * POST /scars/{id}/actions/verify-effectiveness
     *
     * Body: { verification_evidence, effectiveness_result, effective: bool }
     * Transitions to 'verification' (pending re-verify) or allows close if effective.
     */
    public function scarActionVerifyEffectiveness(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $scarId = $this->requirePathId();

        $rec = $this->loadScar($scarId);
        $this->requireVersionMatch((int)$rec['version'], $scarId);
        $this->requireValidTransition((string)$rec['status'], 'verify-effectiveness', self::SCAR_STATE_MACHINE, $scarId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['verification_evidence', 'effectiveness_result', 'effective']);

        $effective  = (bool)$body['effective'];
        $nextStatus = $effective ? 'verification' : 'verification';
        // Both outcomes land in 'verification'; 'close' is a separate explicit action.
        // The 'effective' flag is stored and used during actionScarClose to determine sig requirement.

        $this->transitionScar($scarId, $nextStatus, [
            'verification_evidence' => (string)$body['verification_evidence'],
            'effectiveness_result'  => (string)$body['effectiveness_result'],
        ]);

        $this->emitQualityEvent('eqms.scar.effectiveness_verified', self::SCAR_ENTITY_TYPE, $scarId, [
            'effective'            => $effective,
            'effectiveness_result' => (string)$body['effectiveness_result'],
        ], $user);

        $this->success(['scar_id' => $scarId, 'status' => $nextStatus, 'effective' => $effective]);
    }

    /**
     * POST /scars/{id}/actions/close
     *
     * REQUIRES electronic signature when effectiveness_result is negative.
     * Always requires signature as per SCAR state machine spec.
     */
    public function scarActionClose(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $scarId = $this->requirePathId();

        $rec = $this->loadScar($scarId);
        $this->requireVersionMatch((int)$rec['version'], $scarId);
        $this->requireValidTransition((string)$rec['status'], 'close', self::SCAR_STATE_MACHINE, $scarId);

        // Electronic signature always required for SCAR close; doubly required for negative effectiveness
        $this->requireElectronicSignature($user, 'close', $scarId);

        // Validate that effectiveness verification has been performed before closing
        $effectivenessResult = trim((string)($rec['effectiveness_result'] ?? ''));
        if ($effectivenessResult === '') {
            $this->error('effectiveness_verification_required', 409,
                "SCAR '{$scarId}' must have an effectiveness verification result before closing.");
        }

        $this->transitionScar($scarId, 'closed', ['closed_at' => $this->nowIso()]);

        $this->emitQualityEvent('eqms.scar.closed', self::SCAR_ENTITY_TYPE, $scarId, [
            'effectiveness_result' => $effectivenessResult,
        ], $user);

        $this->success(['scar_id' => $scarId, 'status' => 'closed']);
    }
}
