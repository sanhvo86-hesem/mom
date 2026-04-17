<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Training Controller — Training records, curricula, and training matrix.
 *
 * Manages the full lifecycle of training records per FDA 21 CFR Part 11,
 * ISO 13485 §6.2, AS9100D §7.2, and IATF 16949 §7.2 requirements.
 *
 * State machine:
 *   assigned            → launch-session, waive, expire
 *   in_progress         → record-completion, record-assessment, expire
 *   completed           → verify-effectiveness, expire
 *   effectiveness_review → verify-effectiveness, expire
 *   verified            → expire
 *   expired             → assign
 *   waived              → (terminal)
 *
 * Tables: eqms_training_records, eqms_training_curricula, eqms_training_matrix
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsTrainingController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'training_record';
    private const MODULE      = 'training';

    /** @var array<string,list<string>> */
    private const STATE_MACHINE = [
        'assigned'             => ['launch-session', 'waive', 'expire'],
        'in_progress'          => ['record-completion', 'record-assessment', 'expire'],
        'completed'            => ['verify-effectiveness', 'expire'],
        'effectiveness_review' => ['verify-effectiveness', 'expire'],
        'verified'             => ['expire'],
        'expired'              => ['assign'],
        'waived'               => [],
    ];

    // ── Role Helpers ─────────────────────────────────────────────────────────

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'hr_manager', 'training_manager', 'document_controller',
        ])));
    }

    private function readRoles(): array
    {
        return array_values(array_unique(array_merge($this->eqmsReadRoles(), ['employee'])));
    }

    // ── List / Query ──────────────────────────────────────────────────────────

    /**
     * POST /training/query — Paginated training record list.
     *
     * Filters: employee_id, status, due_before, curriculum_id
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $q = $this->parseQueryBody();
        $f = $q['filters'];

        $where  = ['1=1'];
        $params = [];

        if (!empty($f['employee_id'])) {
            $where[]               = 'tr.employee_id = :employee_id';
            $params[':employee_id'] = (string)$f['employee_id'];
        }
        if (!empty($f['status'])) {
            $where[]          = 'tr.status = :status';
            $params[':status'] = (string)$f['status'];
        }
        if (!empty($f['due_before'])) {
            $where[]             = 'tr.due_date <= :due_before';
            $params[':due_before'] = (string)$f['due_before'];
        }
        if (!empty($f['curriculum_id'])) {
            $where[]                = 'tr.curriculum_id = :curriculum_id';
            $params[':curriculum_id'] = (string)$f['curriculum_id'];
        }
        if ($q['search'] !== '') {
            $where[]           = "(tr.training_number ILIKE :search OR tr.employee_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['created_at', 'due_date', 'employee_name', 'status', 'training_number'], true)
            ? $q['sort_by'] : 'created_at';

        $rows = $this->data->query(
            "SELECT tr.training_id, tr.training_number, tr.employee_id, tr.employee_name,
                    tr.curriculum_id, tr.document_id, tr.document_revision, tr.training_type,
                    tr.assigned_by, tr.assigned_at, tr.due_date, tr.completed_at,
                    tr.assessment_score, tr.assessment_passed, tr.status, tr.version, tr.created_at
             FROM eqms_training_records tr
             WHERE {$whereClause}
             ORDER BY tr.{$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_training_records tr WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('training_records', $rows, $total, $q['offset'], $q['limit']);
    }

    // ── Metrics ───────────────────────────────────────────────────────────────

    /**
     * GET /training/metrics — Aggregate training stats.
     *
     * Returns both the legacy compact block and the richer analytics contract
     * expected by the frontend Analytics screen:
     *   completion_rate, overdue_count, avg_effectiveness, total_hours,
     *   completion_trend[], overdue_trend[], effectiveness_by_curriculum[],
     *   qualification_coverage[], hours_trend[]
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $now  = $this->nowIso();
        $soon = date('Y-m-d', strtotime('+30 days'));

        $overdue = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_training_records
             WHERE status NOT IN ('completed','verified','waived','expired') AND due_date < :now",
            [':now' => $now]
        ) ?? 0);

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_training_records WHERE status NOT IN ('expired','waived')"
        ) ?? 0);

        $completed = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_training_records WHERE status IN ('completed','verified')"
        ) ?? 0);

        $expiringSoon = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_training_records
             WHERE status = 'completed' AND due_date BETWEEN :now AND :soon",
            [':now' => $now, ':soon' => $soon]
        ) ?? 0);

        $completionRate = $total > 0 ? round($completed / $total * 100, 1) : 0.0;

        // Completion trend — last 6 months
        $completionTrend = [];
        try {
            $completionTrend = $this->data->query(
                "SELECT TO_CHAR(DATE_TRUNC('month', assigned_at), 'YYYY-MM') AS period,
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE status IN ('completed','verified')) AS completed,
                        ROUND(
                          COUNT(*) FILTER (WHERE status IN ('completed','verified'))::numeric
                          / NULLIF(COUNT(*),0) * 100, 1
                        ) AS completion_rate
                 FROM eqms_training_records
                 WHERE assigned_at >= NOW() - INTERVAL '6 months'
                 GROUP BY 1 ORDER BY 1"
            ) ?? [];
        } catch (\Throwable) {}

        // Overdue trend — last 6 months
        $overdueTrend = [];
        try {
            $overdueTrend = $this->data->query(
                "SELECT TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') AS period,
                        COUNT(*) FILTER (WHERE status NOT IN ('completed','verified','waived','expired')
                                         AND due_date < NOW()) AS overdue,
                        COUNT(*) FILTER (WHERE status IN ('completed','verified')
                                         OR due_date >= NOW()) AS on_time
                 FROM eqms_training_records
                 WHERE due_date >= NOW() - INTERVAL '6 months'
                 GROUP BY 1 ORDER BY 1"
            ) ?? [];
        } catch (\Throwable) {}

        // Effectiveness by curriculum
        $effectivenessByCurriculum = [];
        try {
            $effectivenessByCurriculum = $this->data->query(
                "SELECT COALESCE(c.curriculum_name, tr.curriculum_id) AS curriculum,
                        ROUND(AVG(tr.assessment_score), 1)              AS avg_score,
                        ROUND(
                          COUNT(*) FILTER (WHERE tr.assessment_passed = 'true')::numeric
                          / NULLIF(COUNT(*) FILTER (WHERE tr.assessment_score IS NOT NULL), 0) * 100, 1
                        )                                               AS effective_pct,
                        COUNT(*) FILTER (WHERE tr.assessment_score IS NOT NULL) AS sample_size
                 FROM eqms_training_records tr
                 LEFT JOIN eqms_training_curricula c ON c.curriculum_id = tr.curriculum_id
                 WHERE tr.curriculum_id IS NOT NULL AND tr.curriculum_id != ''
                 GROUP BY 1 ORDER BY 1"
            ) ?? [];
        } catch (\Throwable) {}

        // Qualification coverage (role × curriculum)
        $qualificationCoverage = [];
        try {
            $qualificationCoverage = $this->data->query(
                "SELECT COALESCE(c.applicable_roles, 'Unassigned') AS entity,
                        'role'                           AS type,
                        COUNT(*) FILTER (WHERE tr.status IN ('completed','verified')) AS qualified,
                        COUNT(*)                                                       AS total,
                        ROUND(
                          COUNT(*) FILTER (WHERE tr.status IN ('completed','verified'))::numeric
                          / NULLIF(COUNT(*), 0) * 100, 1
                        )                                                              AS coverage
                 FROM eqms_training_records tr
                 LEFT JOIN eqms_training_curricula c ON c.curriculum_id = tr.curriculum_id
                 GROUP BY 1 ORDER BY coverage ASC LIMIT 20"
            ) ?? [];
        } catch (\Throwable) {}

        // Average effectiveness score (across all verified records)
        $avgEffectiveness = 0.0;
        try {
            $avgEffectiveness = (float)($this->data->scalar(
                "SELECT ROUND(AVG(assessment_score), 1) FROM eqms_training_records
                 WHERE status IN ('completed','verified') AND assessment_score IS NOT NULL"
            ) ?? 0.0);
        } catch (\Throwable) {}

        // Total training hours (sum of duration_hours if column exists)
        $totalHours = 0;
        try {
            $totalHours = (int)($this->data->scalar(
                "SELECT COALESCE(SUM(duration_hours), 0) FROM eqms_training_records
                 WHERE status IN ('completed','verified')"
            ) ?? 0);
        } catch (\Throwable) {}

        // Hours trend
        $hoursTrend = [];
        try {
            $hoursTrend = $this->data->query(
                "SELECT TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') AS period,
                        COALESCE(SUM(duration_hours), 0) AS hours,
                        COUNT(*) AS sessions,
                        ROUND(COALESCE(AVG(duration_hours), 0), 1) AS avg_per_session
                 FROM eqms_training_records
                 WHERE completed_at IS NOT NULL
                   AND completed_at >= NOW() - INTERVAL '6 months'
                 GROUP BY 1 ORDER BY 1"
            ) ?? [];
        } catch (\Throwable) {}

        $this->success([
            'metrics' => [
                // Legacy compact block (backward compat)
                'overdue_count'       => $overdue,
                'total_active'        => $total,
                'completed_count'     => $completed,
                'completion_rate_pct' => $completionRate,
                'expiring_soon_30d'   => $expiringSoon,
                // Analytics contract fields expected by the frontend
                'completion_rate'          => $completionRate,
                'avg_effectiveness'        => $avgEffectiveness,
                'total_hours'              => $totalHours,
                'completion_trend'         => $completionTrend,
                'overdue_trend'            => $overdueTrend,
                'effectiveness_by_curriculum' => $effectivenessByCurriculum,
                'qualification_coverage'   => $qualificationCoverage,
                'hours_trend'              => $hoursTrend,
            ],
        ]);
    }

    // ── Lookup ────────────────────────────────────────────────────────────────

    /**
     * GET /training/lookup — Fast lookup by training_number or employee_id.
     */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $trainingNumber = $this->query('training_number');
        $employeeId     = $this->query('employee_id');

        if ($trainingNumber === null && $employeeId === null) {
            $this->error('lookup_param_required', 400, "Provide 'training_number' or 'employee_id' query parameter.");
        }

        if ($trainingNumber !== null) {
            $row = $this->data->query(
                "SELECT * FROM eqms_training_records WHERE training_number = :tn LIMIT 1",
                [':tn' => $trainingNumber]
            );
            $this->success(['training_record' => $row[0] ?? null]);
        }

        $rows = $this->data->query(
            "SELECT training_id, training_number, curriculum_id, document_id, training_type,
                    due_date, status, completed_at, version
             FROM eqms_training_records WHERE employee_id = :eid ORDER BY due_date ASC",
            [':eid' => $employeeId]
        ) ?? [];

        $this->success(['training_records' => $rows]);
    }

    // ── Training Matrix ───────────────────────────────────────────────────────

    /**
     * GET /training/matrix — Full training matrix (employees × curricula).
     */
    public function matrix(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $rows = $this->data->query(
            "SELECT tm.employee_id, tm.curriculum_id, c.curriculum_name, c.department, c.applicable_roles AS role,
                    tm.required, tm.completion_status, tm.last_completed_at, tm.next_due_at
             FROM eqms_training_matrix tm
             JOIN eqms_training_curricula c ON c.curriculum_id = tm.curriculum_id
             ORDER BY tm.employee_id, c.curriculum_name"
        ) ?? [];

        $this->success(['matrix' => $rows]);
    }

    // ── Curricula ─────────────────────────────────────────────────────────────

    /**
     * GET /training/curricula — List training curricula.
     *
     * Returns canonical field aliases consumed by the frontend card renderer:
     *   name                   ← curriculum_name
     *   description            ← description (or null)
     *   linked_documents       ← doc_ids parsed as JSON array
     *   qualification_requirements ← qualification_requirements
     *   validity_period        ← validity_period_months
     *   recurrence             ← recurrence_months
     */
    public function curricula(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $rows = $this->data->query(
            "SELECT curriculum_id, curriculum_name, department, applicable_roles AS role, effective_date,
                    doc_ids, description, qualification_requirements,
                    validity_period_months, recurrence_months, status
             FROM eqms_training_curricula
             ORDER BY curriculum_name ASC
             LIMIT :lim OFFSET :off",
            [':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_training_curricula") ?? 0);

        // Normalize field aliases for frontend card renderer
        foreach ($rows as &$row) {
            $row['name']  = $row['curriculum_name'] ?? '';
            $row['id']    = $row['curriculum_id'] ?? '';
            $row['title'] = $row['curriculum_name'] ?? '';

            // Parse doc_ids JSON array
            $docIds = $row['doc_ids'] ?? null;
            if (is_string($docIds) && $docIds !== '') {
                $parsed = json_decode($docIds, true);
                $row['linked_documents'] = is_array($parsed) ? $parsed : [];
            } else {
                $row['linked_documents'] = [];
            }

            // Validity / recurrence
            $row['validity_period'] = $row['validity_period_months'] ?? null;
            $row['recurrence']      = $row['recurrence_months'] ?? null;
        }
        unset($row);

        $this->paginated('curricula', $rows, $total, $offset, $limit);
    }

    /**
     * POST /training/curricula/{id}/assignments/query — Assignments for a curriculum.
     */
    public function curriculaAssignmentsQuery(): never
    {
        $user         = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $curriculumId = $this->requirePathId('id', 'curriculum_id');

        $q      = $this->parseQueryBody();
        $f      = $q['filters'];
        $where  = ['tr.curriculum_id = :curriculum_id'];
        $params = [':curriculum_id' => $curriculumId];

        if (!empty($f['status'])) {
            $where[]          = 'tr.status = :status';
            $params[':status'] = (string)$f['status'];
        }

        $whereClause = implode(' AND ', $where);

        $rows = $this->data->query(
            "SELECT tr.training_id, tr.training_number, tr.employee_id, tr.employee_name,
                    tr.due_date, tr.completed_at, tr.status, tr.version
             FROM eqms_training_records tr
             WHERE {$whereClause}
             ORDER BY tr.employee_name ASC
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_training_records tr WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('assignments', $rows, $total, $q['offset'], $q['limit']);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * POST /training — Create a training record (single or bulk).
     *
     * When body contains `employees` array, creates one record per employee.
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $body = $this->jsonBody();
        $this->requireFields($body, ['training_type', 'due_date']);

        $employees = is_array($body['employees'] ?? null) ? $body['employees'] : null;

        if ($employees !== null) {
            // Bulk assignment
            if (count($employees) === 0) {
                $this->error('employees_required', 400, "Provide at least one employee for bulk assignment.");
            }
            $created = [];
            foreach ($employees as $emp) {
                $created[] = $this->insertTrainingRecord($body, $emp, $user);
            }
            $this->success(['created' => $created, 'count' => count($created)], 201);
        }

        // Single assignment
        $this->requireFields($body, ['employee_id', 'employee_name']);
        $record = $this->insertTrainingRecord($body, [
            'employee_id'   => $body['employee_id'],
            'employee_name' => $body['employee_name'],
        ], $user);

        $this->success(['training_record' => $record], 201);
    }

    private function insertTrainingRecord(array $body, array $emp, array $user): array
    {
        $trainingId     = $this->newUuid();
        $trainingNumber = 'TRN-' . strtoupper(substr($trainingId, 0, 8));
        $now            = $this->nowIso();
        $actor          = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $record = [
            'training_id'       => $trainingId,
            'training_number'   => $trainingNumber,
            'employee_id'       => (string)($emp['employee_id'] ?? ''),
            'employee_name'     => (string)($emp['employee_name'] ?? ''),
            'curriculum_id'     => (string)($body['curriculum_id'] ?? ''),
            'document_id'       => (string)($body['document_id'] ?? ''),
            'document_revision' => (string)($body['document_revision'] ?? ''),
            'training_type'     => (string)($body['training_type'] ?? 'read_and_sign'),
            'assigned_by'       => $actor,
            'assigned_at'       => $now,
            'due_date'          => (string)($body['due_date'] ?? ''),
            'effectiveness_criteria' => (string)($body['effectiveness_criteria'] ?? ''),
            'status'            => 'assigned',
            'version'           => 1,
            'created_at'        => $now,
        ];

        $this->data->execute(
            "INSERT INTO eqms_training_records
             (training_id, training_number, employee_id, employee_name, curriculum_id,
              document_id, document_revision, training_type, assigned_by, assigned_at,
              due_date, effectiveness_criteria, status, version, created_at)
             VALUES
             (:tid, :tnum, :eid, :ename, :cid,
              :did, :drev, :ttype, :aby, :aat,
              :due, :ecrit, :status, :ver, :cat)",
            [
                ':tid'    => $record['training_id'],
                ':tnum'   => $record['training_number'],
                ':eid'    => $record['employee_id'],
                ':ename'  => $record['employee_name'],
                ':cid'    => $record['curriculum_id'],
                ':did'    => $record['document_id'],
                ':drev'   => $record['document_revision'],
                ':ttype'  => $record['training_type'],
                ':aby'    => $record['assigned_by'],
                ':aat'    => $record['assigned_at'],
                ':due'    => $record['due_date'],
                ':ecrit'  => $record['effectiveness_criteria'],
                ':status' => $record['status'],
                ':ver'    => $record['version'],
                ':cat'    => $record['created_at'],
            ]
        );

        $this->emitQualityEvent('eqms.training_record.assigned', self::ENTITY_TYPE, $trainingId, [
            'training_number' => $trainingNumber,
            'employee_id'     => $record['employee_id'],
        ], $user);

        return $record;
    }

    // ── Detail ────────────────────────────────────────────────────────────────

    /**
     * GET /training/{id} — Full training record detail with enriched fields.
     *
     * Joins eqms_training_curricula to populate curriculum_name and
     * normalizes field aliases used by the frontend workspace:
     *   trainee            ← employee_name
     *   curriculum_name    ← joined from curricula
     *   method             ← training_type
     *   training_date      ← completed_at ?? assigned_at
     */
    public function detail(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();

        $rows = $this->data->query(
            "SELECT tr.*,
                    c.curriculum_name,
                    c.description            AS curriculum_description,
                    c.department             AS curriculum_department,
                    c.applicable_roles       AS curriculum_role,
                    c.doc_ids                AS curriculum_doc_ids,
                    c.validity_period_months AS validity_period,
                    c.recurrence_months      AS recurrence,
                    c.qualification_requirements
             FROM eqms_training_records tr
             LEFT JOIN eqms_training_curricula c ON c.curriculum_id = tr.curriculum_id
             WHERE tr.training_id = :id
             LIMIT 1",
            [':id' => $trainingId]
        );

        if (empty($rows)) {
            $this->error('training_record_not_found', 404);
        }

        $rec = $rows[0];

        // Normalize aliases expected by the frontend workspace
        $rec['trainee']       = $rec['employee_name'] ?? '';
        $rec['curriculum']    = $rec['curriculum_name'] ?? ($rec['curriculum_id'] ?? '');
        $rec['method']        = $rec['training_type'] ?? '';
        $rec['training_date'] = $rec['completed_at'] ?? $rec['assigned_at'] ?? null;
        $rec['id']            = $rec['training_id'];   // frontend uses rec.id in some places

        // Linked document triggers — query from eqms_document_training_triggers if table exists
        $triggers = [];
        try {
            $triggers = $this->data->query(
                "SELECT dt.doc_id, d.title, d.revision, dt.change_type, dt.triggered_at
                 FROM eqms_document_training_triggers dt
                 LEFT JOIN eqms_documents d ON d.doc_id = dt.doc_id
                 WHERE dt.training_id = :tid
                 ORDER BY dt.triggered_at DESC",
                [':tid' => $trainingId]
            ) ?? [];
        } catch (\Throwable) {
            // Table may not exist yet; return empty
        }
        $rec['document_triggers'] = $triggers;

        $this->success(['training_record' => $rec]);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * PATCH /training/{id} — Update mutable fields of a training record.
     */
    public function update(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $trainingId = $this->requirePathId();

        $existing = $this->data->query(
            "SELECT training_id, version, status FROM eqms_training_records WHERE training_id = :id LIMIT 1",
            [':id' => $trainingId]
        );
        if (empty($existing)) {
            $this->error('training_record_not_found', 404);
        }
        $rec = $existing[0];
        $this->requireVersionMatch((int)$rec['version'], $trainingId);

        $body    = $this->jsonBody();
        $allowed = ['due_date', 'document_id', 'document_revision', 'effectiveness_criteria'];
        $sets    = [];
        $params  = [':id' => $trainingId, ':ver' => (int)$rec['version'] + 1];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]            = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        if (empty($sets)) {
            $this->error('no_updatable_fields', 400, "Provide at least one of: " . implode(', ', $allowed));
        }

        $sets[] = 'version = :ver';
        $this->data->execute(
            "UPDATE eqms_training_records SET " . implode(', ', $sets) . " WHERE training_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.training_record.updated', self::ENTITY_TYPE, $trainingId, ['fields' => array_keys(array_intersect_key($body, array_flip($allowed)))], $user);
        $this->success(['updated' => true, 'training_id' => $trainingId, 'version' => (int)$rec['version'] + 1]);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /training/{id}/audit */
    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();
        $this->serveAuditTrail(self::ENTITY_TYPE, $trainingId);
    }

    /** GET|POST /training/{id}/comments */
    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();
        $this->serveComments(self::ENTITY_TYPE, $trainingId, $user);
    }

    /** GET|POST /training/{id}/attachments */
    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();
        $this->serveAttachments(self::ENTITY_TYPE, $trainingId, $user);
    }

    /** GET /training/{id}/available-actions */
    public function availableActions(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();

        $row = $this->data->query(
            "SELECT status FROM eqms_training_records WHERE training_id = :id LIMIT 1",
            [':id' => $trainingId]
        );
        if (empty($row)) {
            $this->error('training_record_not_found', 404);
        }

        $this->serveAvailableActions((string)$row[0]['status'], self::STATE_MACHINE);
    }

    /** GET|POST /training/{id}/signatures */
    public function signatures(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();
        $this->serveSignatures(self::ENTITY_TYPE, $trainingId, $user);
    }

    /** GET|POST /training/{id}/relationships */
    public function relationships(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();
        $body   = $this->jsonBody();
        $action = trim((string)($body['_action'] ?? 'list'));
        if ($action === 'link' || $this->method() === 'POST') {
            $action = 'link';
        }
        $this->serveRelationships(self::ENTITY_TYPE, $trainingId, $user, $action);
    }

    /** POST /training/{id}/export */
    public function export(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $trainingId = $this->requirePathId();
        $this->serveExport(self::MODULE, $trainingId, $user);
    }

    /** POST /training/export — Bulk export */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── Action Helpers ────────────────────────────────────────────────────────

    private function loadRecord(string $trainingId): array
    {
        $rows = $this->data->query(
            "SELECT * FROM eqms_training_records WHERE training_id = :id LIMIT 1",
            [':id' => $trainingId]
        );
        if (empty($rows)) {
            $this->error('training_record_not_found', 404);
        }
        return $rows[0];
    }

    private function transition(string $trainingId, string $newStatus, array $fields, array $user): void
    {
        $sets    = ['status = :status', 'version = :ver'];
        $params  = [':id' => $trainingId, ':status' => $newStatus];

        // Fetch current version for increment
        $curVer = (int)($this->data->scalar(
            "SELECT version FROM eqms_training_records WHERE training_id = :id",
            [':id' => $trainingId]
        ) ?? 1);
        $params[':ver'] = $curVer + 1;

        foreach ($fields as $col => $val) {
            $sets[]             = "{$col} = :{$col}";
            $params[":{$col}"]  = $val;
        }

        $this->data->execute(
            "UPDATE eqms_training_records SET " . implode(', ', $sets) . " WHERE training_id = :id",
            $params
        );
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * POST /training — Assign training (delegates to create for bulk).
     */
    public function actionAssign(): never
    {
        $this->create();
    }

    /**
     * POST /training/{id}/actions/launch-session — Start the training session.
     */
    public function actionLaunchSession(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $trainingId = $this->requirePathId();

        $rec = $this->loadRecord($trainingId);
        $this->requireVersionMatch((int)$rec['version'], $trainingId);
        $this->requireValidTransition((string)$rec['status'], 'launch-session', self::STATE_MACHINE, $trainingId);

        $this->transition($trainingId, 'in_progress', ['completion_method' => 'started'], $user);
        $this->emitQualityEvent('eqms.training_record.session_launched', self::ENTITY_TYPE, $trainingId, [
            'employee_id' => $rec['employee_id'],
        ], $user);

        $this->success(['training_id' => $trainingId, 'status' => 'in_progress']);
    }

    /**
     * POST /training/{id}/actions/record-completion
     *
     * Body: { completed_at, completion_method }
     */
    public function actionRecordCompletion(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $trainingId = $this->requirePathId();

        $rec  = $this->loadRecord($trainingId);
        $this->requireVersionMatch((int)$rec['version'], $trainingId);
        $this->requireValidTransition((string)$rec['status'], 'record-completion', self::STATE_MACHINE, $trainingId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['completed_at', 'completion_method']);

        $nextStatus = !empty($rec['effectiveness_criteria']) ? 'effectiveness_review' : 'completed';

        $this->transition($trainingId, $nextStatus, [
            'completed_at'      => (string)$body['completed_at'],
            'completion_method' => (string)$body['completion_method'],
        ], $user);

        $this->emitQualityEvent('eqms.training_record.completed', self::ENTITY_TYPE, $trainingId, [
            'employee_id'       => $rec['employee_id'],
            'completion_method' => (string)$body['completion_method'],
        ], $user);

        $this->success(['training_id' => $trainingId, 'status' => $nextStatus]);
    }

    /**
     * POST /training/{id}/actions/record-assessment
     *
     * Body: { assessment_score, assessment_passed }
     */
    public function actionRecordAssessment(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $trainingId = $this->requirePathId();

        $rec  = $this->loadRecord($trainingId);
        $this->requireVersionMatch((int)$rec['version'], $trainingId);
        $this->requireValidTransition((string)$rec['status'], 'record-assessment', self::STATE_MACHINE, $trainingId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['assessment_score', 'assessment_passed']);

        $passed = (bool)$body['assessment_passed'];

        $this->transition($trainingId, $passed ? 'completed' : 'in_progress', [
            'assessment_score'  => (float)$body['assessment_score'],
            'assessment_passed' => $passed ? 'true' : 'false',
        ], $user);

        $this->emitQualityEvent('eqms.training_record.assessment_recorded', self::ENTITY_TYPE, $trainingId, [
            'employee_id'      => $rec['employee_id'],
            'assessment_score' => (float)$body['assessment_score'],
            'assessment_passed' => $passed,
        ], $user);

        $this->success([
            'training_id'      => $trainingId,
            'assessment_passed' => $passed,
            'status'           => $passed ? 'completed' : 'in_progress',
        ]);
    }

    /**
     * POST /training/{id}/actions/verify-effectiveness
     *
     * Body: { effectiveness_criteria, effectiveness_result }
     */
    public function actionVerifyEffectiveness(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $trainingId = $this->requirePathId();

        $rec  = $this->loadRecord($trainingId);
        $this->requireVersionMatch((int)$rec['version'], $trainingId);
        $this->requireValidTransition((string)$rec['status'], 'verify-effectiveness', self::STATE_MACHINE, $trainingId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['effectiveness_criteria', 'effectiveness_result']);

        $this->transition($trainingId, 'verified', [
            'effectiveness_criteria' => (string)$body['effectiveness_criteria'],
            'effectiveness_result'   => (string)$body['effectiveness_result'],
        ], $user);

        $this->emitQualityEvent('eqms.training_record.effectiveness_verified', self::ENTITY_TYPE, $trainingId, [
            'employee_id'           => $rec['employee_id'],
            'effectiveness_result'  => (string)$body['effectiveness_result'],
        ], $user);

        $this->success(['training_id' => $trainingId, 'status' => 'verified']);
    }

    /**
     * POST /training/{id}/actions/expire — Mark training as expired.
     */
    public function actionExpire(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $trainingId = $this->requirePathId();

        $rec = $this->loadRecord($trainingId);
        $this->requireVersionMatch((int)$rec['version'], $trainingId);
        $this->requireValidTransition((string)$rec['status'], 'expire', self::STATE_MACHINE, $trainingId);

        $this->transition($trainingId, 'expired', [], $user);

        $this->emitQualityEvent('eqms.training_record.expired', self::ENTITY_TYPE, $trainingId, [
            'employee_id' => $rec['employee_id'],
        ], $user);

        $this->success(['training_id' => $trainingId, 'status' => 'expired']);
    }

    /**
     * POST /training/{id}/actions/waive — Waive a training record.
     *
     * Body: { waiver_reason, waiver_approved_by }
     * Requires electronic signature from a manager-level role.
     */
    public function actionWaive(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $trainingId = $this->requirePathId();

        $rec = $this->loadRecord($trainingId);
        $this->requireVersionMatch((int)$rec['version'], $trainingId);
        $this->requireValidTransition((string)$rec['status'], 'waive', self::STATE_MACHINE, $trainingId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['waiver_reason', 'waiver_approved_by']);

        // Waiver requires electronic signature from a manager
        $this->requireElectronicSignature($user, 'waive', $trainingId);

        $this->transition($trainingId, 'waived', [
            'waiver_reason'       => (string)$body['waiver_reason'],
            'waiver_approved_by'  => (string)$body['waiver_approved_by'],
        ], $user);

        $this->emitQualityEvent('eqms.training_record.waived', self::ENTITY_TYPE, $trainingId, [
            'employee_id'        => $rec['employee_id'],
            'waiver_approved_by' => (string)$body['waiver_approved_by'],
        ], $user);

        $this->success(['training_id' => $trainingId, 'status' => 'waived']);
    }
}
