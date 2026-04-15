<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Audits Controller — Internal, external, supplier, and regulatory audits.
 *
 * Manages full audit lifecycle including planning, execution, findings,
 * and formal report issuance per ISO 9001 §9.2, AS9100D §9.2, IATF 16949 §9.2.
 *
 * State machine:
 *   planned          → schedule, cancel
 *   scheduled        → start, cancel
 *   in_progress      → record-finding, issue-report, close-audit
 *   report_issued    → assign-response, close-finding, close-audit
 *   response_pending → close-finding, assign-response, close-audit
 *   closed           → (terminal)
 *   cancelled        → (terminal)
 *
 * Business rule: Cannot close audit if open major findings remain.
 * Signature required for: issue-report, close-audit
 *
 * Tables: eqms_audits, eqms_audit_findings
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsAuditsController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'audit';
    private const MODULE      = 'audits';

    /** @var array<string,list<string>> */
    private const STATE_MACHINE = [
        'planned'          => ['schedule', 'cancel'],
        'scheduled'        => ['start', 'cancel'],
        'in_progress'      => ['record-finding', 'issue-report', 'close-audit'],
        'report_issued'    => ['assign-response', 'close-finding', 'close-audit'],
        'response_pending' => ['close-finding', 'assign-response', 'close-audit'],
        'closed'           => [],
        'cancelled'        => [],
    ];

    protected const SIGNATURE_REQUIRED_ACTIONS = ['issue-report', 'close-audit'];

    // ── Role Helpers ─────────────────────────────────────────────────────────

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'auditor', 'qms_manager', 'compliance_manager',
        ])));
    }

    private function readRoles(): array
    {
        return $this->eqmsReadRoles();
    }

    // ── List / Query ──────────────────────────────────────────────────────────

    /**
     * POST /audits/query — Paginated audit list.
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $q      = $this->parseQueryBody();
        $f      = $q['filters'];
        $where  = ['1=1'];
        $params = [];

        if (!empty($f['audit_type'])) {
            $where[]             = 'a.audit_type = :audit_type';
            $params[':audit_type'] = (string)$f['audit_type'];
        }
        if (!empty($f['status'])) {
            $where[]          = 'a.status = :status';
            $params[':status'] = (string)$f['status'];
        }
        if (!empty($f['standard'])) {
            $where[]            = 'a.standard = :standard';
            $params[':standard'] = (string)$f['standard'];
        }
        if (!empty($f['lead_auditor'])) {
            $where[]                = 'a.lead_auditor = :lead_auditor';
            $params[':lead_auditor'] = (string)$f['lead_auditor'];
        }
        if ($q['search'] !== '') {
            $where[]           = "(a.audit_number ILIKE :search OR a.scope ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['created_at', 'planned_date', 'audit_number', 'status'], true)
            ? $q['sort_by'] : 'created_at';

        $rows = $this->data->query(
            "SELECT a.audit_id, a.audit_number, a.audit_type, a.scope, a.standard,
                    a.lead_auditor, a.auditee_dept, a.planned_date, a.actual_start,
                    a.actual_end, a.status, a.version, a.created_at
             FROM eqms_audits a
             WHERE {$whereClause}
             ORDER BY a.{$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audits a WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('audits', $rows, $total, $q['offset'], $q['limit']);
    }

    // ── Metrics ───────────────────────────────────────────────────────────────

    /**
     * GET /audits/metrics — Aggregate audit stats.
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $inProgress  = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_audits WHERE status = 'in_progress'") ?? 0);
        $overdue     = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audits WHERE status IN ('planned','scheduled') AND planned_date < now()"
        ) ?? 0);
        $openFindings = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audit_findings WHERE status NOT IN ('closed')"
        ) ?? 0);
        $majorOpen   = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audit_findings WHERE category = 'major' AND status != 'closed'"
        ) ?? 0);
        $closedThisYear = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audits WHERE status = 'closed' AND actual_end >= date_trunc('year', now())"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'in_progress'         => $inProgress,
                'overdue_planned'     => $overdue,
                'open_findings'       => $openFindings,
                'open_major_findings' => $majorOpen,
                'closed_this_year'    => $closedThisYear,
            ],
        ]);
    }

    // ── Lookup ────────────────────────────────────────────────────────────────

    /**
     * GET /audits/lookup — Fast lookup by audit_number.
     */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $auditNumber = $this->query('audit_number');
        if ($auditNumber === null) {
            $this->error('lookup_param_required', 400, "Provide 'audit_number' query parameter.");
        }

        $row = $this->data->query(
            "SELECT * FROM eqms_audits WHERE audit_number = :an LIMIT 1",
            [':an' => $auditNumber]
        );

        $this->success(['audit' => $row[0] ?? null]);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * POST /audits — Create a new audit record.
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $body = $this->jsonBody();
        $this->requireFields($body, ['audit_type', 'scope']);

        $auditId     = $this->newUuid();
        $auditNumber = 'AUD-' . strtoupper(substr($auditId, 0, 8));
        $now         = $this->nowIso();
        $actor       = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO eqms_audits
             (audit_id, audit_number, audit_type, scope, standard, lead_auditor,
              team_members, auditee_dept, planned_date, audit_report_ref,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :atype, :scope, :std, :lead,
              :team::jsonb, :dept, :planned, :ref,
              'planned', 1, :now, :by)",
            [
                ':id'      => $auditId,
                ':num'     => $auditNumber,
                ':atype'   => (string)($body['audit_type'] ?? ''),
                ':scope'   => (string)($body['scope'] ?? ''),
                ':std'     => (string)($body['standard'] ?? ''),
                ':lead'    => (string)($body['lead_auditor'] ?? ''),
                ':team'    => json_encode($body['team_members'] ?? [], JSON_THROW_ON_ERROR),
                ':dept'    => (string)($body['auditee_dept'] ?? ''),
                ':planned' => (string)($body['planned_date'] ?? ''),
                ':ref'     => (string)($body['audit_report_ref'] ?? ''),
                ':now'     => $now,
                ':by'      => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.audit.created', self::ENTITY_TYPE, $auditId, [
            'audit_number' => $auditNumber,
            'audit_type'   => (string)($body['audit_type'] ?? ''),
        ], $user);

        $this->success([
            'audit' => [
                'audit_id'     => $auditId,
                'audit_number' => $auditNumber,
                'status'       => 'planned',
                'version'      => 1,
            ],
        ], 201);
    }

    // ── Detail ────────────────────────────────────────────────────────────────

    /**
     * GET /audits/{id} — Full audit record detail.
     */
    public function detail(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();

        $row = $this->data->query(
            "SELECT * FROM eqms_audits WHERE audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($row)) {
            $this->error('audit_not_found', 404);
        }

        $this->success(['audit' => $row[0]]);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * PATCH /audits/{id} — Update mutable fields.
     */
    public function update(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $existing = $this->data->query(
            "SELECT audit_id, version, status FROM eqms_audits WHERE audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($existing)) {
            $this->error('audit_not_found', 404);
        }
        $rec = $existing[0];
        $this->requireVersionMatch((int)$rec['version'], $auditId);

        $body    = $this->jsonBody();
        $allowed = ['scope', 'standard', 'auditee_dept', 'audit_report_ref', 'planned_date'];
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
            "UPDATE eqms_audits SET " . implode(', ', $sets) . " WHERE audit_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.audit.updated', self::ENTITY_TYPE, $auditId, [], $user);
        $this->success(['updated' => true, 'audit_id' => $auditId, 'version' => (int)$rec['version'] + 1]);
    }

    // ── Checklist & Findings Sub-queries ─────────────────────────────────────

    /**
     * POST /audits/{id}/checklists/query — Query checklist items for this audit.
     */
    public function checklistsQuery(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();

        $q      = $this->parseQueryBody();
        $offset = $q['offset'];
        $limit  = $q['limit'];

        $rows = $this->data->query(
            "SELECT checklist_item_id, audit_id, section, clause_reference, question,
                    response, evidence_ref, checked_by, checked_at
             FROM eqms_audit_checklist_items
             WHERE audit_id = :aid
             ORDER BY section ASC, clause_reference ASC
             LIMIT :lim OFFSET :off",
            [':aid' => $auditId, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audit_checklist_items WHERE audit_id = :aid",
            [':aid' => $auditId]
        ) ?? 0);

        $this->paginated('checklist_items', $rows, $total, $offset, $limit);
    }

    /**
     * POST /audits/{id}/findings/query — List findings for this audit.
     */
    public function findingsQuery(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();

        $q      = $this->parseQueryBody();
        $f      = $q['filters'];
        $where  = ['f.audit_id = :aid'];
        $params = [':aid' => $auditId];

        if (!empty($f['category'])) {
            $where[]            = 'f.category = :category';
            $params[':category'] = (string)$f['category'];
        }
        if (!empty($f['status'])) {
            $where[]          = 'f.status = :status';
            $params[':status'] = (string)$f['status'];
        }

        $whereClause = implode(' AND ', $where);

        $rows = $this->data->query(
            "SELECT f.finding_id, f.finding_number, f.category, f.description,
                    f.clause_reference, f.evidence, f.response_required_by,
                    f.response, f.response_by, f.closed_at, f.status
             FROM eqms_audit_findings f
             WHERE {$whereClause}
             ORDER BY f.category DESC, f.finding_number ASC
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audit_findings f WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('findings', $rows, $total, $q['offset'], $q['limit']);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /audits/{id}/audit */
    public function audit(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveAuditTrail(self::ENTITY_TYPE, $auditId);
    }

    /** GET|POST /audits/{id}/comments */
    public function comments(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveComments(self::ENTITY_TYPE, $auditId, $user);
    }

    /** GET|POST /audits/{id}/attachments */
    public function attachments(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveAttachments(self::ENTITY_TYPE, $auditId, $user);
    }

    /** GET /audits/{id}/available-actions */
    public function availableActions(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();

        $row = $this->data->query(
            "SELECT status FROM eqms_audits WHERE audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($row)) {
            $this->error('audit_not_found', 404);
        }

        $this->serveAvailableActions((string)$row[0]['status'], self::STATE_MACHINE);
    }

    /** GET|POST /audits/{id}/signatures */
    public function signatures(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveSignatures(self::ENTITY_TYPE, $auditId, $user);
    }

    /** POST /audits/{id}/export */
    public function export(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $auditId = $this->requirePathId();
        $this->serveExport(self::MODULE, $auditId, $user);
    }

    /** POST /audits/export — Bulk export */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── Action Helpers ────────────────────────────────────────────────────────

    private function loadAudit(string $auditId): array
    {
        $rows = $this->data->query(
            "SELECT * FROM eqms_audits WHERE audit_id = :id LIMIT 1",
            [':id' => $auditId]
        );
        if (empty($rows)) {
            $this->error('audit_not_found', 404);
        }
        return $rows[0];
    }

    private function transition(string $auditId, string $newStatus, array $fields, array $user): void
    {
        $curVer = (int)($this->data->scalar(
            "SELECT version FROM eqms_audits WHERE audit_id = :id",
            [':id' => $auditId]
        ) ?? 1);

        $sets   = ['status = :status', 'version = :ver'];
        $params = [':id' => $auditId, ':status' => $newStatus, ':ver' => $curVer + 1];

        foreach ($fields as $col => $val) {
            $sets[]            = "{$col} = :{$col}";
            $params[":{$col}"] = $val;
        }

        $this->data->execute(
            "UPDATE eqms_audits SET " . implode(', ', $sets) . " WHERE audit_id = :id",
            $params
        );
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * POST /audits/{id}/actions/schedule
     *
     * Body: { planned_date, lead_auditor, team_members }
     */
    public function actionSchedule(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'schedule', self::STATE_MACHINE, $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['planned_date', 'lead_auditor']);

        $this->transition($auditId, 'scheduled', [
            'planned_date'  => (string)$body['planned_date'],
            'lead_auditor'  => (string)$body['lead_auditor'],
            'team_members'  => json_encode($body['team_members'] ?? [], JSON_THROW_ON_ERROR),
        ], $user);

        $this->emitQualityEvent('eqms.audit.scheduled', self::ENTITY_TYPE, $auditId, [
            'planned_date' => (string)$body['planned_date'],
            'lead_auditor' => (string)$body['lead_auditor'],
        ], $user);

        $this->success(['audit_id' => $auditId, 'status' => 'scheduled']);
    }

    /**
     * POST /audits/{id}/actions/start — Begin the audit; record actual_start.
     */
    public function actionStart(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'start', self::STATE_MACHINE, $auditId);

        $this->transition($auditId, 'in_progress', ['actual_start' => $this->nowIso()], $user);

        $this->emitQualityEvent('eqms.audit.started', self::ENTITY_TYPE, $auditId, [], $user);
        $this->success(['audit_id' => $auditId, 'status' => 'in_progress']);
    }

    /**
     * POST /audits/{id}/actions/record-finding
     *
     * Body: { category, description, clause_reference }
     * Inserts a row into eqms_audit_findings.
     */
    public function actionRecordFinding(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireValidTransition((string)$rec['status'], 'record-finding', self::STATE_MACHINE, $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['category', 'description', 'clause_reference']);

        $validCategories = ['major', 'minor', 'observation', 'opportunity'];
        if (!in_array((string)$body['category'], $validCategories, true)) {
            $this->error('invalid_finding_category', 400, "Category must be one of: " . implode(', ', $validCategories));
        }

        $findingId     = $this->newUuid();
        $findingNumber = 'FND-' . strtoupper(substr($findingId, 0, 8));

        $this->data->execute(
            "INSERT INTO eqms_audit_findings
             (finding_id, audit_id, finding_number, category, description,
              clause_reference, evidence, response_required_by, status)
             VALUES
             (:fid, :aid, :fnum, :cat, :desc,
              :clause, :evidence, :rby, 'open')",
            [
                ':fid'      => $findingId,
                ':aid'      => $auditId,
                ':fnum'     => $findingNumber,
                ':cat'      => (string)$body['category'],
                ':desc'     => (string)$body['description'],
                ':clause'   => (string)$body['clause_reference'],
                ':evidence' => (string)($body['evidence'] ?? ''),
                ':rby'      => (string)($body['response_required_by'] ?? ''),
            ]
        );

        // Move audit to response_pending if it was report_issued
        if ((string)$rec['status'] === 'report_issued') {
            $this->transition($auditId, 'response_pending', [], $user);
        }

        $this->emitQualityEvent('eqms.audit.finding_recorded', self::ENTITY_TYPE, $auditId, [
            'finding_id'      => $findingId,
            'finding_number'  => $findingNumber,
            'category'        => (string)$body['category'],
        ], $user);

        $this->success([
            'finding' => [
                'finding_id'     => $findingId,
                'finding_number' => $findingNumber,
                'category'       => (string)$body['category'],
                'status'         => 'open',
            ],
        ], 201);
    }

    /**
     * POST /audits/{id}/actions/issue-report
     *
     * Body: { audit_report_ref } + esig
     * REQUIRES electronic signature.
     */
    public function actionIssueReport(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'issue-report', self::STATE_MACHINE, $auditId);
        $this->requireElectronicSignature($user, 'issue-report', $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['audit_report_ref']);

        $this->transition($auditId, 'report_issued', [
            'audit_report_ref' => (string)$body['audit_report_ref'],
            'actual_end'       => $this->nowIso(),
        ], $user);

        $this->emitQualityEvent('eqms.audit.report_issued', self::ENTITY_TYPE, $auditId, [
            'audit_report_ref' => (string)$body['audit_report_ref'],
        ], $user);

        $this->success(['audit_id' => $auditId, 'status' => 'report_issued']);
    }

    /**
     * POST /audits/{id}/actions/assign-response
     *
     * Body: { finding_id, responsible_party, response_due_date }
     */
    public function actionAssignResponse(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireValidTransition((string)$rec['status'], 'assign-response', self::STATE_MACHINE, $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['finding_id', 'responsible_party', 'response_due_date']);

        $findingId = (string)$body['finding_id'];

        // Validate finding belongs to this audit
        $finding = $this->data->query(
            "SELECT finding_id, status FROM eqms_audit_findings WHERE finding_id = :fid AND audit_id = :aid LIMIT 1",
            [':fid' => $findingId, ':aid' => $auditId]
        );
        if (empty($finding)) {
            $this->error('finding_not_found', 404, "Finding '{$findingId}' not found on audit '{$auditId}'.");
        }

        $this->data->execute(
            "UPDATE eqms_audit_findings
             SET response_required_by = :rby, status = 'response_assigned'
             WHERE finding_id = :fid",
            [':fid' => $findingId, ':rby' => (string)$body['response_due_date']]
        );

        // Move audit status if needed
        if ((string)$rec['status'] === 'report_issued') {
            $this->transition($auditId, 'response_pending', [], $user);
        }

        $this->emitQualityEvent('eqms.audit.response_assigned', self::ENTITY_TYPE, $auditId, [
            'finding_id'         => $findingId,
            'responsible_party'  => (string)$body['responsible_party'],
            'response_due_date'  => (string)$body['response_due_date'],
        ], $user);

        $this->success(['finding_id' => $findingId, 'assigned' => true]);
    }

    /**
     * POST /audits/{id}/actions/close-finding
     *
     * Body: { finding_id, response }
     */
    public function actionCloseFinding(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireValidTransition((string)$rec['status'], 'close-finding', self::STATE_MACHINE, $auditId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['finding_id', 'response']);

        $findingId = (string)$body['finding_id'];

        $finding = $this->data->query(
            "SELECT finding_id, category, status FROM eqms_audit_findings
             WHERE finding_id = :fid AND audit_id = :aid LIMIT 1",
            [':fid' => $findingId, ':aid' => $auditId]
        );
        if (empty($finding)) {
            $this->error('finding_not_found', 404);
        }
        if ((string)$finding[0]['status'] === 'closed') {
            $this->error('finding_already_closed', 409, "Finding '{$findingId}' is already closed.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "UPDATE eqms_audit_findings
             SET response = :resp, response_by = :by, closed_at = now(), status = 'closed'
             WHERE finding_id = :fid",
            [':fid' => $findingId, ':resp' => (string)$body['response'], ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.audit.finding_closed', self::ENTITY_TYPE, $auditId, [
            'finding_id' => $findingId,
        ], $user);

        $this->success(['finding_id' => $findingId, 'status' => 'closed']);
    }

    /**
     * POST /audits/{id}/actions/close-audit
     *
     * REQUIRES electronic signature.
     * Business rule: Cannot close if open major findings remain.
     */
    public function actionCloseAudit(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'close-audit', self::STATE_MACHINE, $auditId);
        $this->requireElectronicSignature($user, 'close-audit', $auditId);

        // Business rule: block if open major findings remain
        $openMajors = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_audit_findings
             WHERE audit_id = :aid AND category = 'major' AND status != 'closed'",
            [':aid' => $auditId]
        ) ?? 0);

        if ($openMajors > 0) {
            $this->error('open_major_findings', 409, sprintf(
                "Cannot close audit '%s': %d open major finding(s) must be closed first.",
                $auditId, $openMajors
            ));
        }

        $this->transition($auditId, 'closed', ['actual_end' => $this->nowIso()], $user);

        $this->emitQualityEvent('eqms.audit.closed', self::ENTITY_TYPE, $auditId, [], $user);
        $this->success(['audit_id' => $auditId, 'status' => 'closed']);
    }

    /**
     * POST /audits/{id}/actions/cancel — Cancel a planned or scheduled audit.
     */
    public function actionCancel(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $auditId = $this->requirePathId();

        $rec = $this->loadAudit($auditId);
        $this->requireVersionMatch((int)$rec['version'], $auditId);
        $this->requireValidTransition((string)$rec['status'], 'cancel', self::STATE_MACHINE, $auditId);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['reason'] ?? ''));

        $this->transition($auditId, 'cancelled', $reason !== '' ? ['audit_report_ref' => 'CANCELLED: ' . $reason] : [], $user);

        $this->emitQualityEvent('eqms.audit.cancelled', self::ENTITY_TYPE, $auditId, ['reason' => $reason], $user);
        $this->success(['audit_id' => $auditId, 'status' => 'cancelled']);
    }
}
