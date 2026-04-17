<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Deviation Controller — world-class quality deviation / non-conformance management.
 *
 * Implements the full deviation lifecycle from detection and classification
 * through investigation, containment, and regulated closure. Handles both
 * planned and unplanned deviations, process deviations, and emergency events.
 *
 * Complies with FDA 21 CFR Part 211.192, ISO 9001 §10.2, ISO 13485 §8.3,
 * AS9100D §10.2, and IATF 16949 §10.2.
 *
 * State machine:
 *   draft               → [classify]
 *   classified          → [record-containment, start-investigation, link-batch, link-change-control]
 *   under_investigation → [link-capa, link-batch, link-change-control, close, void]
 *   pending_closure     → [close, void]
 *   closed              → []
 *   voided              → []
 *
 * Electronic signature required for: close, void
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsDeviationController extends EqmsBaseController
{
    // ── State Machine ────────────────────────────────────────────────────────

    /** @var array<string, list<string>> */
    private const STATE_MACHINE = [
        'draft'               => ['classify'],
        'classified'          => ['record-containment', 'start-investigation', 'link-batch', 'link-change-control'],
        'under_investigation' => ['link-capa', 'link-batch', 'link-change-control', 'close', 'void'],
        'pending_closure'     => ['close', 'void'],
        'closed'              => [],
        'voided'              => [],
    ];

    // ── Role Shortcuts ───────────────────────────────────────────────────────

    /** @return list<string> */
    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer', 'process_engineer',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * Fetch a deviation record by ID. Returns 404 if not found.
     */
    private function fetchDeviation(string $id): array
    {
        $row = $this->data->query(
            "SELECT deviation_id, deviation_number, title, description, severity,
                    deviation_type, department, affected_process, batch_id,
                    detected_at, detected_by, status, version,
                    containment_action, containment_date,
                    investigation_summary, root_cause,
                    capa_id, change_control_id,
                    closure_reason, voided_reason,
                    closed_by, closed_at,
                    created_at, created_by, updated_at, updated_by
             FROM eqms_deviations
             WHERE deviation_id = :id
             LIMIT 1",
            [':id' => $id]
        );

        if (empty($row)) {
            $this->error('deviation_not_found', 404, "Deviation '{$id}' does not exist.");
        }

        return $row[0];
    }

    /**
     * Generate a human-readable deviation number: DEV-YYYYMMDD-XXXX.
     */
    private function generateDeviationNumber(): string
    {
        $date = date('Ymd');
        $seq  = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_deviations WHERE DATE(created_at) = CURRENT_DATE"
        ) ?? 0) + 1;
        return sprintf('DEV-%s-%04d', $date, $seq);
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /**
     * POST /eqms/deviations/query — Paginated list with filters.
     *
     * Body: { offset, limit, search, sort_by, sort_dir, filters: { status, severity, deviation_type, department } }
     *
     * @return never
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q       = $this->parseQueryBody();
        $offset  = $q['offset'];
        $limit   = $q['limit'];
        $search  = $q['search'];
        $sortBy  = in_array($q['sort_by'], [
            'deviation_number', 'detected_at', 'severity', 'status',
            'deviation_type', 'department', 'created_at', 'updated_at',
        ], true) ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];
        $filters = $q['filters'];

        $where  = ['1=1'];
        $params = [];

        if ($search !== '') {
            $where[]           = "(deviation_number ILIKE :search OR title ILIKE :search OR description ILIKE :search)";
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
        if (!empty($filters['deviation_type'])) {
            $where[]                 = "deviation_type = :deviation_type";
            $params[':deviation_type'] = (string)$filters['deviation_type'];
        }
        if (!empty($filters['department'])) {
            $where[]               = "department = :department";
            $params[':department'] = (string)$filters['department'];
        }
        if (!empty($filters['batch_id'])) {
            $where[]            = "batch_id = :batch_id";
            $params[':batch_id'] = (string)$filters['batch_id'];
        }

        $whereClause = implode(' AND ', $where);

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_deviations WHERE {$whereClause}",
            $params
        ) ?? 0);

        $items = $this->data->query(
            "SELECT deviation_id, deviation_number, title, severity, deviation_type,
                    department, affected_process, batch_id, detected_at, detected_by,
                    status, version, created_at, updated_at
             FROM eqms_deviations
             WHERE {$whereClause}
             ORDER BY {$sortBy} {$sortDir}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $limit, ':off' => $offset])
        ) ?? [];

        $this->paginated('deviations', $items, $total, $offset, $limit);
    }

    /**
     * GET /eqms/deviations/metrics — Aggregate metrics for dashboards.
     *
     * Returns open count, counts by type/severity/status/department,
     * avg investigation days, and batch impact summary.
     *
     * @return never
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $openCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_deviations WHERE status NOT IN ('closed','voided')"
        ) ?? 0);

        $avgInvestigationDays = (float)($this->data->scalar(
            "SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - detected_at)) / 86400)::numeric, 1)
             FROM eqms_deviations
             WHERE closed_at IS NOT NULL AND detected_at IS NOT NULL"
        ) ?? 0.0);

        $byType = $this->data->query(
            "SELECT deviation_type, COUNT(*) AS count
             FROM eqms_deviations
             GROUP BY deviation_type
             ORDER BY count DESC"
        ) ?? [];

        $bySeverity = $this->data->query(
            "SELECT severity, COUNT(*) AS count
             FROM eqms_deviations
             WHERE status NOT IN ('closed','voided')
             GROUP BY severity
             ORDER BY count DESC"
        ) ?? [];

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count
             FROM eqms_deviations
             GROUP BY status
             ORDER BY count DESC"
        ) ?? [];

        $byDepartment = $this->data->query(
            "SELECT department, COUNT(*) AS count
             FROM eqms_deviations
             WHERE department IS NOT NULL AND status NOT IN ('closed','voided')
             GROUP BY department
             ORDER BY count DESC
             LIMIT 10"
        ) ?? [];

        $batchImpactCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_deviations WHERE batch_id IS NOT NULL AND status NOT IN ('closed','voided')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'open_count'              => $openCount,
                'avg_investigation_days'  => $avgInvestigationDays,
                'batch_impacted_open'     => $batchImpactCount,
                'by_type'                 => $byType,
                'by_severity'             => $bySeverity,
                'by_status'               => $byStatus,
                'by_department'           => $byDepartment,
            ],
        ]);
    }

    /**
     * POST /eqms/deviations/lookup — Fast ID or deviation number lookup.
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
            $where[] = "deviation_id IN ({$placeholders})";
            foreach (array_values($ids) as $i => $v) {
                $params[":id{$i}"] = $v;
            }
        }
        if (!empty($numbers)) {
            $placeholders = implode(',', array_map(
                fn($i) => ":num{$i}",
                array_keys($numbers)
            ));
            $where[] = "deviation_number IN ({$placeholders})";
            foreach (array_values($numbers) as $i => $v) {
                $params[":num{$i}"] = $v;
            }
        }

        $rows = $this->data->query(
            "SELECT deviation_id, deviation_number, title, severity, deviation_type, status, version
             FROM eqms_deviations
             WHERE " . implode(' OR ', $where),
            $params
        ) ?? [];

        $this->success(['deviations' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /**
     * POST /eqms/deviations — Create a new deviation record.
     *
     * Required body fields: title, description, severity, deviation_type (planned|unplanned|emergency),
     * detected_at, detected_by.
     *
     * @return never
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $body = $this->jsonBody();

        $title         = trim((string)($body['title'] ?? ''));
        $description   = trim((string)($body['description'] ?? ''));
        $severity      = trim((string)($body['severity'] ?? ''));
        $deviationType = trim((string)($body['deviation_type'] ?? ''));
        $detectedAt    = trim((string)($body['detected_at'] ?? ''));
        $detectedBy    = trim((string)($body['detected_by'] ?? ''));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if ($description === '') {
            $this->error('description_required', 400, "'description' is required.");
        }
        if (!in_array($severity, ['minor', 'major', 'critical'], true)) {
            $this->error('invalid_severity', 400, "'severity' must be minor, major, or critical.");
        }
        if (!in_array($deviationType, ['planned', 'unplanned', 'emergency'], true)) {
            $this->error('invalid_deviation_type', 400, "'deviation_type' must be planned, unplanned, or emergency.");
        }
        if ($detectedAt === '') {
            $this->error('detected_at_required', 400, "'detected_at' is required.");
        }
        if ($detectedBy === '') {
            $this->error('detected_by_required', 400, "'detected_by' is required.");
        }

        $id     = $this->newUuid();
        $number = $this->generateDeviationNumber();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now    = $this->nowIso();

        $this->data->execute(
            "INSERT INTO eqms_deviations (
                deviation_id, deviation_number, title, description,
                severity, deviation_type, department, affected_process,
                batch_id, detected_at, detected_by,
                status, version,
                created_at, created_by, updated_at, updated_by
             ) VALUES (
                :id, :number, :title, :description,
                :severity, :deviation_type, :department, :affected_process,
                :batch_id, :detected_at, :detected_by,
                'draft', 1,
                :now, :actor, :now, :actor
             )",
            [
                ':id'               => $id,
                ':number'           => $number,
                ':title'            => $title,
                ':description'      => $description,
                ':severity'         => $severity,
                ':deviation_type'   => $deviationType,
                ':department'       => trim((string)($body['department'] ?? '')),
                ':affected_process' => trim((string)($body['affected_process'] ?? '')),
                ':batch_id'         => trim((string)($body['batch_id'] ?? '')) ?: null,
                ':detected_at'      => $detectedAt,
                ':detected_by'      => $detectedBy,
                ':now'              => $now,
                ':actor'            => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.deviation.created', 'deviation', $id, [
            'deviation_number' => $number,
            'severity'         => $severity,
            'deviation_type'   => $deviationType,
        ], $user);

        $record = $this->fetchDeviation($id);
        $this->success(['deviation' => $record], 201);
    }

    /**
     * GET /eqms/deviations/{id} — Full deviation record.
     *
     * @return never
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchDeviation($id);

        $this->success(['deviation' => $record]);
    }

    /**
     * PATCH /eqms/deviations/{id} — Update editable fields on draft/classified records.
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
        $record = $this->fetchDeviation($id);

        if (!in_array($record['status'], ['draft', 'classified'], true)) {
            $this->error('record_not_editable', 409,
                "Deviation '{$id}' in status '{$record['status']}' cannot be updated via PATCH.");
        }

        $this->requireVersionMatch((int)$record['version'], $id);

        $body    = $this->jsonBody();
        $actor   = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now     = $this->nowIso();
        $updates = [];
        $params  = [':id' => $id, ':version_new' => (int)$record['version'] + 1, ':now' => $now, ':actor' => $actor];

        $editableFields = [
            'title', 'description', 'department', 'affected_process',
            'detected_at', 'detected_by', 'batch_id',
        ];

        foreach ($editableFields as $field) {
            if (array_key_exists($field, $body)) {
                $updates[]           = "{$field} = :{$field}";
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

        if (array_key_exists('deviation_type', $body)) {
            $dt = trim((string)($body['deviation_type'] ?? ''));
            if (!in_array($dt, ['planned', 'unplanned', 'emergency'], true)) {
                $this->error('invalid_deviation_type', 400, "'deviation_type' must be planned, unplanned, or emergency.");
            }
            $updates[]               = "deviation_type = :deviation_type";
            $params[':deviation_type'] = $dt;
        }

        if (empty($updates)) {
            $this->error('no_fields_to_update', 400, 'No updatable fields provided in request body.');
        }

        $setClauses = implode(', ', array_merge(
            $updates,
            ['version = :version_new', 'updated_at = :now', 'updated_by = :actor']
        ));

        $this->data->execute(
            "UPDATE eqms_deviations SET {$setClauses} WHERE deviation_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.deviation.updated', 'deviation', $id, ['fields' => array_keys($body)], $user);

        $updated = $this->fetchDeviation($id);
        $this->success(['deviation' => $updated]);
    }

    // ── Cross-cutting Delegates ───────────────────────────────────────────────

    /**
     * GET /eqms/deviations/{id}/audit
     *
     * @return never
     */
    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveAuditTrail('deviation', $id);
    }

    /**
     * GET|POST /eqms/deviations/{id}/comments
     *
     * @return never
     */
    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveComments('deviation', $id, $user);
    }

    /**
     * GET|POST /eqms/deviations/{id}/attachments
     *
     * @return never
     */
    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveAttachments('deviation', $id, $user);
    }

    /**
     * GET /eqms/deviations/{id}/relationships
     *
     * @return never
     */
    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveRelationships('deviation', $id, $user, 'list');
    }

    /**
     * POST /eqms/deviations/{id}/relationships/link
     *
     * @return never
     */
    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveRelationships('deviation', $id, $user, 'link');
    }

    /**
     * POST /eqms/deviations/{id}/relationships/unlink
     *
     * @return never
     */
    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveRelationships('deviation', $id, $user, 'unlink');
    }

    /**
     * GET /eqms/deviations/{id}/available-actions
     *
     * @return never
     */
    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id     = $this->requirePathId();
        $record = $this->fetchDeviation($id);
        $this->serveAvailableActions($record['status'], self::STATE_MACHINE);
    }

    /**
     * GET|POST /eqms/deviations/{id}/signatures
     *
     * @return never
     */
    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveSignatures('deviation', $id, $user);
    }

    /**
     * POST /eqms/deviations/{id}/export — Single record export.
     *
     * @return never
     */
    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->fetchDeviation($id);
        $this->serveExport('deviations', $id, $user);
    }

    /**
     * POST /eqms/deviations/export — Bulk export job.
     *
     * Body: { ids?: string[], filters?: array, format: string }
     *
     * @return never
     */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body   = $this->jsonBody();
        $format = strtolower(trim((string)($body['format'] ?? 'xlsx')));
        if (!in_array($format, ['pdf', 'xlsx', 'csv', 'json'], true)) {
            $this->error('invalid_export_format', 400, "Allowed formats: pdf, xlsx, csv, json.");
        }

        $jobId = $this->newUuid();
        $this->data->execute(
            "INSERT INTO eqms_export_jobs (job_id, module, entity_id, format, requested_by, requested_at, status, job_params)
             VALUES (:jid, 'deviations', 'bulk', :fmt, :by, now(), 'queued', :params::jsonb)",
            [
                ':jid'    => $jobId,
                ':fmt'    => $format,
                ':by'     => (string)($user['username'] ?? 'unknown'),
                ':params' => json_encode(['ids' => $body['ids'] ?? null, 'filters' => $body['filters'] ?? []]),
            ]
        );

        $this->emitQualityEvent('eqms.deviations.bulk_export_requested', 'deviation', 'bulk', [
            'job_id' => $jobId, 'format' => $format,
        ], $user);

        $this->success(['job_id' => $jobId, 'status' => 'queued', 'format' => $format], 202);
    }

    // ── Action Methods ───────────────────────────────────────────────────────

    /**
     * POST /eqms/deviations/{id}/actions/classify — Classify deviation and transition to classified.
     *
     * Body: { severity?, deviation_type?, department?, affected_process?, classification_notes? }
     *
     * @return never
     */
    public function actionClassify(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchDeviation($id);

        $this->requireValidTransition($record['status'], 'classify', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body    = $this->jsonBody();
        $actor   = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now     = $this->nowIso();
        $updates = ['status = \'classified\'', 'version = version + 1', 'updated_at = :now', 'updated_by = :actor'];
        $params  = [':now' => $now, ':actor' => $actor, ':id' => $id];

        if (!empty($body['severity'])) {
            $sev = trim((string)$body['severity']);
            if (!in_array($sev, ['minor', 'major', 'critical'], true)) {
                $this->error('invalid_severity', 400, "'severity' must be minor, major, or critical.");
            }
            $updates[]          = "severity = :severity";
            $params[':severity'] = $sev;
        }
        if (!empty($body['deviation_type'])) {
            $dt = trim((string)$body['deviation_type']);
            if (!in_array($dt, ['planned', 'unplanned', 'emergency'], true)) {
                $this->error('invalid_deviation_type', 400, "'deviation_type' must be planned, unplanned, or emergency.");
            }
            $updates[]               = "deviation_type = :deviation_type";
            $params[':deviation_type'] = $dt;
        }
        if (!empty($body['department'])) {
            $updates[]             = "department = :department";
            $params[':department'] = trim((string)$body['department']);
        }
        if (!empty($body['affected_process'])) {
            $updates[]                = "affected_process = :affected_process";
            $params[':affected_process'] = trim((string)$body['affected_process']);
        }
        if (!empty($body['classification_notes'])) {
            $updates[]                    = "classification_notes = :classification_notes";
            $params[':classification_notes'] = trim((string)$body['classification_notes']);
        }

        $setClauses = implode(', ', $updates);
        $this->data->execute(
            "UPDATE eqms_deviations SET {$setClauses} WHERE deviation_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.deviation.classify', 'deviation', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'classified',
            'severity'        => $body['severity'] ?? null,
            'deviation_type'  => $body['deviation_type'] ?? null,
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    /**
     * POST /eqms/deviations/{id}/actions/record-containment — Record immediate containment action.
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
        $record = $this->fetchDeviation($id);

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
            "UPDATE eqms_deviations
             SET containment_action = :containment_action,
                 containment_date = :containment_date,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE deviation_id = :id",
            [
                ':containment_action' => $containmentAction,
                ':containment_date'   => trim((string)($body['containment_date'] ?? $now)),
                ':now'                => $now,
                ':actor'              => $actor,
                ':id'                 => $id,
            ]
        );

        $this->emitQualityEvent('eqms.deviation.record-containment', 'deviation', $id, [
            'containment_action' => $containmentAction,
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    /**
     * POST /eqms/deviations/{id}/actions/start-investigation — Transition to under_investigation.
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
        $record = $this->fetchDeviation($id);

        $this->requireValidTransition($record['status'], 'start-investigation', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body  = $this->jsonBody();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_deviations
             SET status = 'under_investigation',
                 investigation_plan = :plan,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE deviation_id = :id",
            [
                ':plan'  => trim((string)($body['investigation_plan'] ?? '')),
                ':now'   => $now,
                ':actor' => $actor,
                ':id'    => $id,
            ]
        );

        $this->emitQualityEvent('eqms.deviation.start-investigation', 'deviation', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'under_investigation',
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    /**
     * POST /eqms/deviations/{id}/actions/link-batch — Link deviation to a production batch.
     *
     * Body: { batch_id: string }
     * Can be called from classified or under_investigation states.
     *
     * @return never
     */
    public function actionLinkBatch(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchDeviation($id);

        $this->requireValidTransition($record['status'], 'link-batch', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body    = $this->jsonBody();
        $batchId = trim((string)($body['batch_id'] ?? ''));
        if ($batchId === '') {
            $this->error('batch_id_required', 400, "'batch_id' is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_deviations
             SET batch_id = :batch_id, version = version + 1, updated_at = :now, updated_by = :actor
             WHERE deviation_id = :id",
            [':batch_id' => $batchId, ':now' => $now, ':actor' => $actor, ':id' => $id]
        );

        // Formal bi-directional record link for traceability
        $this->data->execute(
            "INSERT INTO eqms_record_links (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'deviation', :sid, 'batch', :tid, 'linked_batch', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':sid' => $id, ':tid' => $batchId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.deviation.link-batch', 'deviation', $id, [
            'batch_id' => $batchId,
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    /**
     * POST /eqms/deviations/{id}/actions/link-change-control — Link to a change control record.
     *
     * Body: { change_control_id: string }
     * Can be called from classified or under_investigation states.
     *
     * @return never
     */
    public function actionLinkChangeControl(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchDeviation($id);

        $this->requireValidTransition($record['status'], 'link-change-control', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body            = $this->jsonBody();
        $changeControlId = trim((string)($body['change_control_id'] ?? ''));
        if ($changeControlId === '') {
            $this->error('change_control_id_required', 400, "'change_control_id' is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_deviations
             SET change_control_id = :change_control_id,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE deviation_id = :id",
            [':change_control_id' => $changeControlId, ':now' => $now, ':actor' => $actor, ':id' => $id]
        );

        $this->data->execute(
            "INSERT INTO eqms_record_links (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'deviation', :sid, 'change_control', :tid, 'linked_change_control', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':sid' => $id, ':tid' => $changeControlId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.deviation.link-change-control', 'deviation', $id, [
            'change_control_id' => $changeControlId,
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    /**
     * POST /eqms/deviations/{id}/actions/link-capa — Link deviation to a CAPA record.
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
        $record = $this->fetchDeviation($id);

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
            "UPDATE eqms_deviations
             SET capa_id = :capa_id, version = version + 1, updated_at = :now, updated_by = :actor
             WHERE deviation_id = :id",
            [':capa_id' => $capaId, ':now' => $now, ':actor' => $actor, ':id' => $id]
        );

        $this->data->execute(
            "INSERT INTO eqms_record_links (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'deviation', :sid, 'capa', :tid, 'linked_capa', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':sid' => $id, ':tid' => $capaId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.deviation.link-capa', 'deviation', $id, [
            'capa_id' => $capaId,
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    /**
     * POST /eqms/deviations/{id}/actions/close — Close deviation.
     *
     * Requires electronic signature (regulated action per 21 CFR Part 11).
     * Body: { closure_reason: string, root_cause?: string, investigation_summary?: string,
     *         esig: { reason: string, password: string } }
     *
     * @return never
     */
    public function actionClose(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsCloseRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchDeviation($id);

        $this->requireValidTransition($record['status'], 'close', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'close', $id);

        $body          = $this->jsonBody();
        $closureReason = trim((string)($body['closure_reason'] ?? ''));
        if ($closureReason === '') {
            $this->error('closure_reason_required', 400, "'closure_reason' is required for deviation closure.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_deviations
             SET status = 'closed',
                 closure_reason = :closure_reason,
                 root_cause = COALESCE(:root_cause, root_cause),
                 investigation_summary = COALESCE(:investigation_summary, investigation_summary),
                 closed_by = :actor,
                 closed_at = :now,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE deviation_id = :id",
            [
                ':closure_reason'        => $closureReason,
                ':root_cause'            => trim((string)($body['root_cause'] ?? '')) ?: null,
                ':investigation_summary' => trim((string)($body['investigation_summary'] ?? '')) ?: null,
                ':now'                   => $now,
                ':actor'                 => $actor,
                ':id'                    => $id,
            ]
        );

        $this->emitQualityEvent('eqms.deviation.close', 'deviation', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'closed',
            'closure_reason'  => $closureReason,
            'esig_reason'     => ($this->jsonBody()['esig']['reason'] ?? null),
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    /**
     * POST /eqms/deviations/{id}/actions/void — Void a deviation record.
     *
     * Requires electronic signature (regulated action per 21 CFR Part 11).
     * Body: { voided_reason: string, esig: { reason: string, password: string } }
     *
     * @return never
     */
    public function actionVoid(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsCloseRoles());

        $id     = $this->requirePathId();
        $record = $this->fetchDeviation($id);

        $this->requireValidTransition($record['status'], 'void', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'void', $id);

        $body         = $this->jsonBody();
        $voidedReason = trim((string)($body['voided_reason'] ?? ''));
        if ($voidedReason === '') {
            $this->error('voided_reason_required', 400, "'voided_reason' is required to void a deviation.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_deviations
             SET status = 'voided',
                 voided_reason = :voided_reason,
                 closed_by = :actor,
                 closed_at = :now,
                 version = version + 1, updated_at = :now, updated_by = :actor
             WHERE deviation_id = :id",
            [
                ':voided_reason' => $voidedReason,
                ':now'           => $now,
                ':actor'         => $actor,
                ':id'            => $id,
            ]
        );

        $this->emitQualityEvent('eqms.deviation.void', 'deviation', $id, [
            'previous_status' => $record['status'],
            'new_status'      => 'voided',
            'voided_reason'   => $voidedReason,
            'esig_reason'     => ($this->jsonBody()['esig']['reason'] ?? null),
        ], $user);

        $this->success(['deviation' => $this->fetchDeviation($id)]);
    }

    // ── Cross-module Actions ──────────────────────────────────────────────────

    /**
     * POST /eqms/deviations/{id}/actions/escalate-risk
     * Escalate a high-severity deviation to the Risk Register.
     * Body optional: { risk_title, probability, impact, assigned_to }
     */
    public function actionEscalateRisk(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $id     = $this->requirePathId('id', 'deviation_id');
        $record = $this->fetchDeviation($id);

        if (in_array($record['status'], ['closed', 'voided'], true)) {
            $this->error('record_terminal', 409,
                "Cannot escalate a closed or voided deviation to risk.");
        }

        // Check if already escalated
        $existing = $this->data->scalar(
            "SELECT risk_id FROM eqms_risk_register
             WHERE source_type = 'deviation' AND source_id = :id LIMIT 1",
            [':id' => $id]
        );
        if ($existing) {
            $this->error('risk_already_escalated', 409,
                "Deviation already escalated to Risk Register (risk_id: {$existing}).");
        }

        $body       = $this->jsonBody();
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $riskId     = $this->newUuid();
        $riskNumber = 'RISK-' . strtoupper(substr($riskId, 0, 8));
        $now        = $this->nowIso();
        $title      = !empty($body['risk_title'])
                      ? trim((string)$body['risk_title'])
                      : 'Risk escalated from Deviation ' . ($record['deviation_number'] ?? $id);

        $this->data->execute(
            "INSERT INTO eqms_risk_register
             (risk_id, risk_number, title, description, risk_category, source_type, source_id,
              probability, impact, risk_score, assigned_to,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, 'process', 'deviation', :src_id,
              :prob, :impact,
              (:prob::int * :impact2::int),
              :assigned,
              'identified', 1, :now, :by)",
            [
                ':id'       => $riskId,
                ':num'      => $riskNumber,
                ':title'    => $title,
                ':desc'     => (string)($record['description'] ?? ''),
                ':src_id'   => $id,
                ':prob'     => (int)($body['probability'] ?? 3),
                ':impact'   => (int)($body['impact'] ?? 3),
                ':impact2'  => (int)($body['impact'] ?? 3),
                ':assigned' => $body['assigned_to'] ?? null,
                ':now'      => $now,
                ':by'       => $actor,
            ]
        );

        $this->data->execute(
            "INSERT INTO eqms_record_links
             (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'deviation', :dev_id, 'risk', :risk_id, 'escalated_risk', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':dev_id' => $id, ':risk_id' => $riskId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.deviation.risk_escalated', 'deviation', $id, [
            'risk_id'     => $riskId,
            'risk_number' => $riskNumber,
        ], $user);

        $risk = $this->data->query(
            "SELECT risk_id, risk_number, title, status, risk_score FROM eqms_risk_register WHERE risk_id = :id",
            [':id' => $riskId]
        )[0] ?? [];

        $this->success(['deviation' => $this->fetchDeviation($id), 'created_risk' => $risk], 201);
    }
}
