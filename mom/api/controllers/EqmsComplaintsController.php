<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Complaints Controller — world-class customer complaint management.
 *
 * Implements the full complaint lifecycle from intake through investigation,
 * customer response, and closure. Complies with FDA 21 CFR Part 820.198,
 * ISO 13485 §8.2.2, and IATF 16949 §10.2.3.
 *
 * State machine:
 *   draft              → [intake]
 *   open               → [triage, assign, record-containment, start-investigation]
 *   under_investigation→ [record-containment, link-capa, initiate-field-action, issue-response]
 *   response_issued    → [close, reopen]
 *   closed             → [reopen]
 *   reopened           → [triage, assign, start-investigation]
 *
 * Electronic signature required for: close, approve
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsComplaintsController extends EqmsBaseController
{
    // ── State Machine ────────────────────────────────────────────────────────

    /** @var array<string, list<string>> */
    private const STATE_MACHINE = [
        'draft'               => ['intake'],
        'open'                => ['triage', 'assign', 'record-containment', 'start-investigation'],
        'under_investigation' => ['record-containment', 'link-capa', 'initiate-field-action', 'issue-response'],
        'response_issued'     => ['close', 'reopen'],
        'closed'              => ['reopen'],
        'reopened'            => ['triage', 'assign', 'start-investigation'],
    ];

    // ── Role Shortcuts ───────────────────────────────────────────────────────

    /** @return list<string> */
    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'customer_service', 'sales_manager',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * Fetch a complaint record by ID. Returns 404 if not found.
     */
    private function fetchComplaint(string $id): array
    {
        $row = $this->data->query(
            "SELECT complaint_id, complaint_number, customer_id, customer_name, subject, description,
                    received_date, severity, category, assigned_to, department, status, version,
                    containment_action, investigation_summary, customer_response, capa_id,
                    field_action_id, resolution_date, closed_by, closed_at,
                    created_at, created_by, updated_at, updated_by
             FROM eqms_complaints
             WHERE complaint_id = :id
             LIMIT 1",
            [':id' => $id]
        );

        if (empty($row)) {
            $this->error('complaint_not_found', 404, "Complaint '{$id}' does not exist.");
        }

        return $row[0];
    }

    /**
     * Generate a human-readable complaint number: COMP-YYYYMMDD-XXXX.
     */
    private function generateComplaintNumber(): string
    {
        $date = date('Ymd');
        $seq  = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_complaints WHERE DATE(created_at) = CURRENT_DATE"
        ) ?? 0) + 1;
        return sprintf('COMP-%s-%04d', $date, $seq);
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /**
     * POST /eqms/complaints/query — Paginated list with filters.
     *
     * Body: { offset, limit, search, sort_by, sort_dir, filters: { status, severity, category, customer_id } }
     *
     * @return never
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q      = $this->parseQueryBody();
        $offset = $q['offset'];
        $limit  = $q['limit'];
        $search = $q['search'];
        $sortBy = in_array($q['sort_by'], [
            'complaint_number', 'received_date', 'severity', 'status',
            'customer_name', 'created_at', 'updated_at',
        ], true) ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];
        $filters = $q['filters'];

        $where  = ['1=1'];
        $params = [];

        if ($search !== '') {
            $where[]           = "(complaint_number ILIKE :search OR subject ILIKE :search OR customer_name ILIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }
        if (!empty($filters['status'])) {
            $where[]           = "status = :status";
            $params[':status'] = (string)$filters['status'];
        }
        if (!empty($filters['severity'])) {
            $where[]             = "severity = :severity";
            $params[':severity'] = (string)$filters['severity'];
        }
        if (!empty($filters['category'])) {
            $where[]             = "category = :category";
            $params[':category'] = (string)$filters['category'];
        }
        if (!empty($filters['customer_id'])) {
            $where[]               = "customer_id = :customer_id";
            $params[':customer_id'] = (string)$filters['customer_id'];
        }

        $whereClause = implode(' AND ', $where);

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_complaints WHERE {$whereClause}",
            $params
        ) ?? 0);

        $items = $this->data->query(
            "SELECT complaint_id, complaint_number, customer_id, customer_name, subject,
                    received_date, severity, category, assigned_to, status, version,
                    created_at, updated_at
             FROM eqms_complaints
             WHERE {$whereClause}
             ORDER BY {$sortBy} {$sortDir}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $limit, ':off' => $offset])
        ) ?? [];

        $this->paginated('complaints', $items, $total, $offset, $limit);
    }

    /**
     * GET /eqms/complaints/metrics — Aggregate metrics for dashboards.
     *
     * Returns open count, avg resolution days, counts by severity and status,
     * and top complaint categories.
     *
     * @return never
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $openCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_complaints WHERE status NOT IN ('closed','voided')"
        ) ?? 0);

        $avgResolutionDays = (float)($this->data->scalar(
            "SELECT ROUND(AVG((resolution_date - received_date))::numeric, 1)
             FROM eqms_complaints
             WHERE resolution_date IS NOT NULL AND received_date IS NOT NULL"
        ) ?? 0.0);

        $bySeverity = $this->data->query(
            "SELECT severity, COUNT(*) AS count
             FROM eqms_complaints
             WHERE status NOT IN ('closed')
             GROUP BY severity
             ORDER BY count DESC"
        ) ?? [];

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count
             FROM eqms_complaints
             GROUP BY status
             ORDER BY count DESC"
        ) ?? [];

        $topCategories = $this->data->query(
            "SELECT category, COUNT(*) AS count
             FROM eqms_complaints
             WHERE category IS NOT NULL
             GROUP BY category
             ORDER BY count DESC
             LIMIT 10"
        ) ?? [];

        $criticalOpen = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_complaints WHERE severity = 'critical' AND status NOT IN ('closed')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'open_count'           => $openCount,
                'critical_open'        => $criticalOpen,
                'avg_resolution_days'  => $avgResolutionDays,
                'by_severity'          => $bySeverity,
                'by_status'            => $byStatus,
                'top_categories'       => $topCategories,
            ],
        ]);
    }

    /**
     * POST /eqms/complaints/lookup — Fast ID or complaint number lookup.
     *
     * Body: { ids?: string[], numbers?: string[] }
     *
     * @return never
     */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body    = $this->jsonBody();
        $ids     = array_filter(array_map('strval', (array)($body['ids'] ?? [])));
        $numbers = array_filter(array_map('strval', (array)($body['numbers'] ?? [])));

        if (empty($ids) && empty($numbers)) {
            $this->error('lookup_criteria_required', 400, "Provide 'ids' or 'numbers' array.");
        }

        $where  = [];
        $params = [];

        if (!empty($ids)) {
            $placeholders = implode(',', array_map(
                fn($i) => ":id{$i}",
                array_keys($ids)
            ));
            $where[] = "complaint_id IN ({$placeholders})";
            foreach (array_values($ids) as $i => $v) {
                $params[":id{$i}"] = $v;
            }
        }
        if (!empty($numbers)) {
            $placeholders = implode(',', array_map(
                fn($i) => ":num{$i}",
                array_keys($numbers)
            ));
            $where[] = "complaint_number IN ({$placeholders})";
            foreach (array_values($numbers) as $i => $v) {
                $params[":num{$i}"] = $v;
            }
        }

        $rows = $this->data->query(
            "SELECT complaint_id, complaint_number, subject, customer_name, severity, status, version
             FROM eqms_complaints
             WHERE " . implode(' OR ', $where),
            $params
        ) ?? [];

        $this->success(['complaints' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /**
     * POST /eqms/complaints — Create a new complaint record.
     *
     * Required body fields: subject, description, received_date, severity (minor|major|critical).
     * One of: customer_id, customer_name.
     *
     * @return never
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $body = $this->jsonBody();

        $subject       = trim((string)($body['subject'] ?? ''));
        $description   = trim((string)($body['description'] ?? ''));
        $receivedDate  = trim((string)($body['received_date'] ?? ''));
        $severity      = trim((string)($body['severity'] ?? ''));
        $customerId    = trim((string)($body['customer_id'] ?? ''));
        $customerName  = trim((string)($body['customer_name'] ?? ''));

        if ($subject === '') {
            $this->error('subject_required', 400, "'subject' is required.");
        }
        if ($description === '') {
            $this->error('description_required', 400, "'description' is required.");
        }
        if ($receivedDate === '') {
            $this->error('received_date_required', 400, "'received_date' is required.");
        }
        if (!in_array($severity, ['minor', 'major', 'critical'], true)) {
            $this->error('invalid_severity', 400, "'severity' must be minor, major, or critical.");
        }
        if ($customerId === '' && $customerName === '') {
            $this->error('customer_required', 400, "Provide 'customer_id' or 'customer_name'.");
        }

        $id     = $this->newUuid();
        $number = $this->generateComplaintNumber();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now    = $this->nowIso();

        $this->data->execute(
            "INSERT INTO eqms_complaints (
                complaint_id, complaint_number, customer_id, customer_name,
                subject, description, received_date, severity,
                category, status, version,
                created_at, created_by, updated_at, updated_by
             ) VALUES (
                :id, :number, :customer_id, :customer_name,
                :subject, :description, :received_date, :severity,
                :category, 'draft', 1,
                :now, :actor, :now, :actor
             )",
            [
                ':id'            => $id,
                ':number'        => $number,
                ':customer_id'   => $customerId !== '' ? $customerId : null,
                ':customer_name' => $customerName !== '' ? $customerName : null,
                ':subject'       => $subject,
                ':description'   => $description,
                ':received_date' => $receivedDate,
                ':severity'      => $severity,
                ':category'      => trim((string)($body['category'] ?? '')),
                ':now'           => $now,
                ':actor'         => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.complaint.created', 'complaint', $id, [
            'complaint_number' => $number,
            'severity'         => $severity,
        ], $user);

        $record = $this->fetchComplaint($id);
        $this->success(['complaint' => $record], 201);
    }

    /**
     * GET /eqms/complaints/{id} — Full complaint record.
     *
     * @return never
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->success(['complaint' => $record]);
    }

    /**
     * PATCH /eqms/complaints/{id} — Update editable fields on draft/open records.
     *
     * Requires If-Match version header for optimistic concurrency.
     *
     * @return never
     */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        if (!in_array($record['status'], ['draft', 'open', 'reopened'], true)) {
            $this->error('record_not_editable', 409,
                "Complaint '{$id}' in status '{$record['status']}' cannot be updated via PATCH.");
        }

        $this->requireVersionMatch((int)$record['version'], $id);

        $body    = $this->jsonBody();
        $actor   = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now     = $this->nowIso();
        $updates = [];
        $params  = [':id' => $id, ':version_new' => (int)$record['version'] + 1, ':now' => $now, ':actor' => $actor];

        $editableFields = [
            'subject', 'description', 'received_date', 'category',
            'customer_id', 'customer_name',
        ];

        foreach ($editableFields as $field) {
            if (array_key_exists($field, $body)) {
                $updates[]        = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        if (array_key_exists('severity', $body)) {
            $sev = trim((string)($body['severity'] ?? ''));
            if (!in_array($sev, ['minor', 'major', 'critical'], true)) {
                $this->error('invalid_severity', 400, "'severity' must be minor, major, or critical.");
            }
            $updates[]          = "severity = :severity";
            $params[':severity'] = $sev;
        }

        if (empty($updates)) {
            $this->error('no_fields_to_update', 400, 'No updatable fields provided in request body.');
        }

        $setClauses = implode(', ', array_merge(
            $updates,
            ['version = :version_new', 'updated_at = :now', 'updated_by = :actor']
        ));

        $this->data->execute(
            "UPDATE eqms_complaints SET {$setClauses} WHERE complaint_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.complaint.updated', 'complaint', $id, ['fields' => array_keys($body)], $user);

        $updated = $this->fetchComplaint($id);
        $this->success(['complaint' => $updated]);
    }

    // ── Cross-cutting Delegates ───────────────────────────────────────────────

    /**
     * GET /eqms/complaints/{id}/audit
     *
     * @return never
     */
    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id); // existence check
        $this->serveAuditTrail('complaint', $id);
    }

    /**
     * GET|POST /eqms/complaints/{id}/comments
     *
     * @return never
     */
    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id);
        $this->serveComments('complaint', $id, $user);
    }

    /**
     * GET|POST /eqms/complaints/{id}/attachments
     *
     * @return never
     */
    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id);
        $this->serveAttachments('complaint', $id, $user);
    }

    /**
     * GET /eqms/complaints/{id}/relationships
     *
     * @return never
     */
    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id);
        $this->serveRelationships('complaint', $id, $user, 'list');
    }

    /**
     * POST /eqms/complaints/{id}/relationships/link
     *
     * @return never
     */
    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id);
        $this->serveRelationships('complaint', $id, $user, 'link');
    }

    /**
     * POST /eqms/complaints/{id}/relationships/unlink
     *
     * @return never
     */
    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id);
        $this->serveRelationships('complaint', $id, $user, 'unlink');
    }

    /**
     * GET /eqms/complaints/{id}/available-actions
     *
     * @return never
     */
    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);
        $this->serveAvailableActions($record['status'], self::STATE_MACHINE);
    }

    /**
     * GET|POST /eqms/complaints/{id}/signatures
     *
     * @return never
     */
    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id);
        $this->serveSignatures('complaint', $id, $user);
    }

    /**
     * POST /eqms/complaints/{id}/export — Single record export.
     *
     * @return never
     */
    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchComplaint($id);
        $this->serveExport('complaints', $id, $user);
    }

    /**
     * POST /eqms/complaints/export — Bulk export job.
     *
     * Body: { ids?: string[], filters?: array, format: string }
     *
     * @return never
     */
    public function exportBulk(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body   = $this->jsonBody();
        $format = strtolower(trim((string)($body['format'] ?? 'xlsx')));
        if (!in_array($format, ['pdf', 'xlsx', 'csv', 'json'], true)) {
            $this->error('invalid_export_format', 400, "Allowed formats: pdf, xlsx, csv, json.");
        }

        $jobId = $this->newUuid();
        $this->data->execute(
            "INSERT INTO eqms_export_jobs (job_id, module, entity_id, format, requested_by, requested_at, status, job_params)
             VALUES (:jid, 'complaints', 'bulk', :fmt, :by, now(), 'queued', :params::jsonb)",
            [
                ':jid'    => $jobId,
                ':fmt'    => $format,
                ':by'     => (string)($user['username'] ?? 'unknown'),
                ':params' => json_encode(['ids' => $body['ids'] ?? null, 'filters' => $body['filters'] ?? []]),
            ]
        );

        $this->emitQualityEvent('eqms.complaints.bulk_export_requested', 'complaint', 'bulk', [
            'job_id' => $jobId, 'format' => $format,
        ], $user);

        $this->success(['job_id' => $jobId, 'status' => 'queued', 'format' => $format], 202);
    }

    // ── Action Methods ───────────────────────────────────────────────────────

    /**
     * POST /eqms/complaints/{id}/actions/intake — Transition draft → open.
     *
     * @return never
     */
    public function actionIntake(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'intake', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body  = $this->jsonBody();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET status = 'open', version = version + 1,
                 updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [':now' => $now, ':actor' => $actor, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.complaint.intake', 'complaint', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'open',
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/triage — Classify severity and category.
     *
     * Body: { severity?, category?, triage_notes? }
     *
     * @return never
     */
    public function actionTriage(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'triage', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body     = $this->jsonBody();
        $actor    = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now      = $this->nowIso();
        $updates  = ['version = version + 1', 'updated_at = :now', 'updated_by = :actor'];
        $params   = [':now' => $now, ':actor' => $actor, ':id' => $id];

        if (!empty($body['severity'])) {
            $sev = trim((string)$body['severity']);
            if (!in_array($sev, ['minor', 'major', 'critical'], true)) {
                $this->error('invalid_severity', 400, "'severity' must be minor, major, or critical.");
            }
            $updates[]          = "severity = :severity";
            $params[':severity'] = $sev;
        }
        if (!empty($body['category'])) {
            $updates[]           = "category = :category";
            $params[':category'] = trim((string)$body['category']);
        }
        if (!empty($body['triage_notes'])) {
            $updates[]              = "triage_notes = :triage_notes";
            $params[':triage_notes'] = trim((string)$body['triage_notes']);
        }

        $setClauses = implode(', ', $updates);
        $this->data->execute(
            "UPDATE eqms_complaints SET {$setClauses} WHERE complaint_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.complaint.triage', 'complaint', $id, [
            'severity' => $body['severity'] ?? null,
            'category' => $body['category'] ?? null,
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/assign — Assign to user or department.
     *
     * Body: { assigned_to: string, department?: string, assignment_note?: string }
     *
     * @return never
     */
    public function actionAssign(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'assign', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body       = $this->jsonBody();
        $assignedTo = trim((string)($body['assigned_to'] ?? ''));
        if ($assignedTo === '') {
            $this->error('assigned_to_required', 400, "'assigned_to' is required.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now    = $this->nowIso();
        $params = [
            ':assigned_to' => $assignedTo,
            ':department'  => trim((string)($body['department'] ?? '')),
            ':now'         => $now,
            ':actor'       => $actor,
            ':id'          => $id,
        ];

        $this->data->execute(
            "UPDATE eqms_complaints
             SET assigned_to = :assigned_to, department = :department,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.complaint.assign', 'complaint', $id, [
            'assigned_to' => $assignedTo,
            'department'  => $body['department'] ?? null,
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/record-containment — Record immediate containment action.
     *
     * Body: { containment_action: string, containment_date?: string }
     *
     * @return never
     */
    public function actionRecordContainment(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'record-containment', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body             = $this->jsonBody();
        $containmentAction = trim((string)($body['containment_action'] ?? ''));
        if ($containmentAction === '') {
            $this->error('containment_action_required', 400, "'containment_action' is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET containment_action = :containment_action,
                 containment_date = :containment_date,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [
                ':containment_action' => $containmentAction,
                ':containment_date'   => trim((string)($body['containment_date'] ?? $now)),
                ':now'                => $now,
                ':actor'              => $actor,
                ':id'                 => $id,
            ]
        );

        $this->emitQualityEvent('eqms.complaint.record-containment', 'complaint', $id, [
            'containment_action' => $containmentAction,
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/start-investigation — Transition to under_investigation.
     *
     * Body: { investigation_plan?: string }
     *
     * @return never
     */
    public function actionStartInvestigation(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'start-investigation', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body  = $this->jsonBody();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET status = 'under_investigation',
                 investigation_plan = :plan,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [
                ':plan'  => trim((string)($body['investigation_plan'] ?? '')),
                ':now'   => $now,
                ':actor' => $actor,
                ':id'    => $id,
            ]
        );

        $this->emitQualityEvent('eqms.complaint.start-investigation', 'complaint', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'under_investigation',
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/link-capa — Link complaint to a CAPA record.
     *
     * Body: { capa_id: string }
     *
     * @return never
     */
    public function actionLinkCapa(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'link-capa', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body   = $this->jsonBody();
        $capaId = trim((string)($body['capa_id'] ?? ''));
        if ($capaId === '') {
            $this->error('capa_id_required', 400, "'capa_id' is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET capa_id = :capa_id, version = version + 1, updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [':capa_id' => $capaId, ':now' => $now, ':actor' => $actor, ':id' => $id]
        );

        // Also create a formal record link for bi-directional traceability
        $this->data->execute(
            "INSERT INTO eqms_record_links (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'complaint', :sid, 'capa', :tid, 'linked_capa', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':sid' => $id, ':tid' => $capaId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.complaint.link-capa', 'complaint', $id, [
            'capa_id' => $capaId,
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/initiate-field-action — Create field action link.
     *
     * Body: { field_action_id?: string, field_action_type?: string, field_action_description?: string }
     *
     * @return never
     */
    public function actionInitiateFieldAction(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'initiate-field-action', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body          = $this->jsonBody();
        $fieldActionId = trim((string)($body['field_action_id'] ?? $this->newUuid()));
        $actionType    = trim((string)($body['field_action_type'] ?? ''));
        $actionDesc    = trim((string)($body['field_action_description'] ?? ''));

        if ($actionType === '' && $actionDesc === '') {
            $this->error('field_action_details_required', 400,
                "Provide 'field_action_type' and/or 'field_action_description'.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET field_action_id = :field_action_id, version = version + 1,
                 updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [':field_action_id' => $fieldActionId, ':now' => $now, ':actor' => $actor, ':id' => $id]
        );

        $this->data->execute(
            "INSERT INTO eqms_record_links (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'complaint', :sid, 'field_action', :tid, 'field_action', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':sid' => $id, ':tid' => $fieldActionId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.complaint.initiate-field-action', 'complaint', $id, [
            'field_action_id'   => $fieldActionId,
            'field_action_type' => $actionType,
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id), 'field_action_id' => $fieldActionId]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/issue-response — Send customer response and transition to response_issued.
     *
     * Body: { customer_response: string, response_date?: string, response_method?: string }
     *
     * @return never
     */
    public function actionIssueResponse(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'issue-response', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body             = $this->jsonBody();
        $customerResponse = trim((string)($body['customer_response'] ?? ''));
        if ($customerResponse === '') {
            $this->error('customer_response_required', 400, "'customer_response' text is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET status = 'response_issued',
                 customer_response = :response,
                 response_date = :response_date,
                 response_method = :response_method,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [
                ':response'        => $customerResponse,
                ':response_date'   => trim((string)($body['response_date'] ?? $now)),
                ':response_method' => trim((string)($body['response_method'] ?? '')),
                ':now'             => $now,
                ':actor'           => $actor,
                ':id'              => $id,
            ]
        );

        $this->emitQualityEvent('eqms.complaint.issue-response', 'complaint', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'response_issued',
            'response_method' => $body['response_method'] ?? null,
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/close — Close complaint.
     *
     * Requires electronic signature (regulated action per 21 CFR Part 11).
     * Body: { closure_reason: string, esig: { reason: string, password: string } }
     *
     * @return never
     */
    public function actionClose(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsCloseRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'close', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'close', $id);

        $body          = $this->jsonBody();
        $closureReason = trim((string)($body['closure_reason'] ?? ''));
        if ($closureReason === '') {
            $this->error('closure_reason_required', 400, "'closure_reason' is required for complaint closure.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET status = 'closed',
                 closure_reason = :closure_reason,
                 resolution_date = :resolution_date,
                 closed_by = :actor,
                 closed_at = :now,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [
                ':closure_reason'  => $closureReason,
                ':resolution_date' => trim((string)($body['resolution_date'] ?? $now)),
                ':now'             => $now,
                ':actor'           => $actor,
                ':id'              => $id,
            ]
        );

        $this->emitQualityEvent('eqms.complaint.close', 'complaint', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'closed',
            'closure_reason'  => $closureReason,
            'esig_reason'     => ($this->jsonBody()['esig']['reason'] ?? null),
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    /**
     * POST /eqms/complaints/{id}/actions/reopen — Reopen from closed or response_issued.
     *
     * Body: { reopen_reason: string }
     *
     * @return never
     */
    public function actionReopen(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchComplaint($id);

        $this->requireValidTransition($record['status'], 'reopen', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body         = $this->jsonBody();
        $reopenReason = trim((string)($body['reopen_reason'] ?? ''));
        if ($reopenReason === '') {
            $this->error('reopen_reason_required', 400, "'reopen_reason' is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_complaints
             SET status = 'reopened',
                 reopen_reason = :reopen_reason,
                 closed_at = NULL,
                 closed_by = NULL,
                 resolution_date = NULL,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE complaint_id = :id",
            [
                ':reopen_reason' => $reopenReason,
                ':now'           => $now,
                ':actor'         => $actor,
                ':id'            => $id,
            ]
        );

        $this->emitQualityEvent('eqms.complaint.reopen', 'complaint', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'reopened',
            'reopen_reason'   => $reopenReason,
        ], $user);

        $this->success(['complaint' => $this->fetchComplaint($id)]);
    }

    // ── Cross-module Actions ──────────────────────────────────────────────────

    /**
     * POST /eqms/customer-complaints/{id}/actions/escalate-risk
     * Escalate a high-severity complaint to the Risk Register.
     * Body optional: { risk_title, probability, impact, assigned_to }
     */
    public function actionEscalateRisk(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId('id', 'complaint_id');
        $record = $this->fetchComplaint($id);

        if (in_array($record['status'], ['closed'], true)) {
            $this->error('record_terminal', 409, "Cannot escalate a closed complaint to risk.");
        }

        $existing = $this->data->scalar(
            "SELECT risk_id FROM eqms_risk_register
             WHERE source_type = 'complaint' AND source_id = :id LIMIT 1",
            [':id' => $id]
        );
        if ($existing) {
            $this->error('risk_already_escalated', 409,
                "Complaint already escalated to Risk Register (risk_id: {$existing}).");
        }

        $body       = $this->jsonBody();
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $riskId     = $this->newUuid();
        $riskNumber = 'RISK-' . strtoupper(substr($riskId, 0, 8));
        $now        = $this->nowIso();
        $title      = !empty($body['risk_title'])
                      ? trim((string)$body['risk_title'])
                      : 'Risk escalated from Complaint ' . ($record['complaint_number'] ?? $id);

        $this->data->execute(
            "INSERT INTO eqms_risk_register
             (risk_id, risk_number, title, description, risk_category, source_type, source_id,
              probability, impact, risk_score, assigned_to,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, 'customer', 'complaint', :src_id,
              :prob, :impact, (:prob::int * :impact2::int), :assigned,
              'identified', 1, :now, :by)",
            [
                ':id'       => $riskId,
                ':num'      => $riskNumber,
                ':title'    => $title,
                ':desc'     => (string)($record['description'] ?? ''),
                ':src_id'   => $id,
                ':prob'     => (int)($body['probability'] ?? 3),
                ':impact'   => (int)($body['impact'] ?? 4),
                ':impact2'  => (int)($body['impact'] ?? 4),
                ':assigned' => $body['assigned_to'] ?? null,
                ':now'      => $now,
                ':by'       => $actor,
            ]
        );

        $this->data->execute(
            "INSERT INTO eqms_record_links
             (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'complaint', :comp_id, 'risk', :risk_id, 'escalated_risk', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':comp_id' => $id, ':risk_id' => $riskId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.complaint.risk_escalated', 'complaint', $id, [
            'risk_id'     => $riskId,
            'risk_number' => $riskNumber,
        ], $user);

        $risk = $this->data->query(
            "SELECT risk_id, risk_number, title, status, risk_score FROM eqms_risk_register WHERE risk_id = :id",
            [':id' => $riskId]
        )[0] ?? [];

        $this->success(['complaint' => $this->fetchComplaint($id), 'created_risk' => $risk], 201);
    }
}
