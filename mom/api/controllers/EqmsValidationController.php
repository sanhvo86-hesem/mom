<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Validation Controller — CSV/CQV/Process/Equipment/Cleaning validation lifecycle.
 *
 * Project state machine:
 *   planning          → approve-protocol
 *   protocol_approved → start-execution
 *   execution         → record-result, log-deviation, generate-summary
 *   summary_generated → close
 *   closed            → (terminal)
 *
 * Protocol state machine:
 *   draft    → approve
 *   approved → (terminal)
 *
 * Execution state machine:
 *   pending     → start
 *   in_progress → record-result, log-deviation
 *   completed   → generate-summary
 *
 * Electronic Signature:
 *   Protocol approve REQUIRES signature.
 *   Project close REQUIRES signature.
 *   generate-summary REQUIRES signature.
 *
 * Standards: GAMP 5, 21 CFR Part 11, EU Annex 11, ICH Q9, ISO 13485 §7.5.6
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsValidationController extends EqmsBaseController
{
    // ── Project constants ─────────────────────────────────────────────────────

    private const PROJECT_TABLE    = 'eqms_validation_projects';
    private const REQ_TABLE        = 'eqms_validation_requirements';
    private const PROTOCOL_TABLE   = 'eqms_validation_protocols';
    private const EXECUTION_TABLE  = 'eqms_validation_executions';

    protected const PROJECT_STATE_MACHINE = [
        'planning'          => ['approve-protocol'],
        'protocol_approved' => ['start-execution'],
        'execution'         => ['record-result', 'log-deviation', 'generate-summary'],
        'summary_generated' => ['close'],
        'closed'            => [],
    ];

    private const PROTOCOL_STATE_MACHINE = [
        'draft'    => ['approve'],
        'approved' => [],
    ];

    private const EXECUTION_STATE_MACHINE = [
        'pending'     => ['start'],
        'in_progress' => ['record-result', 'log-deviation'],
        'completed'   => ['generate-summary'],
    ];

    private function valWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'validation_engineer', 'quality_manager', 'qa_manager',
            'qms_manager', 'compliance_manager',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadProject(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::PROJECT_TABLE . " WHERE project_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('validation_project_not_found', 404, "Validation project '{$id}' not found.");
        }
        return $row[0];
    }

    private function loadProtocol(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::PROTOCOL_TABLE . " WHERE protocol_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('validation_protocol_not_found', 404, "Protocol '{$id}' not found.");
        }
        return $row[0];
    }

    private function loadExecution(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::EXECUTION_TABLE . " WHERE execution_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('execution_not_found', 404, "Execution '{$id}' not found.");
        }
        return $row[0];
    }

    // ── Projects: Query & Metrics ─────────────────────────────────────────────

    /** POST /eqms/validation/projects/query */
    public function projectsQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(project_number ILIKE :search OR project_name ILIKE :search OR system_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'validation_type', 'risk_category'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['project_number', 'project_name', 'validation_type', 'status', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT project_id, project_number, project_name, validation_type,
                    system_name, risk_category, status, version, created_at
             FROM " . self::PROJECT_TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::PROJECT_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('validation_projects', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/validation/metrics */
    public function projectsMetrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::PROJECT_TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT validation_type, COUNT(*) AS count FROM " . self::PROJECT_TABLE . " GROUP BY validation_type"
        ) ?? [];

        $highRisk = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::PROJECT_TABLE . " WHERE risk_category = 'high' AND status NOT IN ('closed')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status' => $byStatus,
                'by_type'   => $byType,
                'high_risk_open' => $highRisk,
            ],
        ]);
    }

    /**
     * GET /eqms/validation/inventory — Summary of all validated systems.
     */
    public function inventory(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $systems = $this->data->query(
            "SELECT system_name, validation_type, risk_category,
                    COUNT(*) AS project_count,
                    MAX(status) AS latest_status,
                    MAX(created_at) AS last_activity
             FROM " . self::PROJECT_TABLE . "
             GROUP BY system_name, validation_type, risk_category
             ORDER BY system_name"
        ) ?? [];

        $this->success(['systems' => $systems, 'total' => count($systems)]);
    }

    /** POST /eqms/validation/requirements/query */
    public function requirementsQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q         = $this->parseQueryBody();
        $projectId = $q['filters']['project_id'] ?? null;

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($projectId) {
            $conditions[] = "project_id = :pid";
            $params[':pid'] = $projectId;
        }

        if ($q['search'] !== '') {
            $conditions[] = "(req_number ILIKE :search OR description ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        $where = implode(' AND ', $conditions);

        $items = $this->data->query(
            "SELECT requirement_id, project_id, req_number, description,
                    acceptance_criteria, category
             FROM " . self::REQ_TABLE . "
             WHERE {$where}
             ORDER BY req_number
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::REQ_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('requirements', $items, $total, $q['offset'], $q['limit']);
    }

    /** POST /eqms/validation/protocols/query */
    public function protocolsQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q         = $this->parseQueryBody();
        $projectId = $q['filters']['project_id'] ?? null;

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($projectId) {
            $conditions[] = "project_id = :pid";
            $params[':pid'] = $projectId;
        }

        if (!empty($q['filters']['protocol_type'])) {
            $conditions[] = "protocol_type = :ptype";
            $params[':ptype'] = $q['filters']['protocol_type'];
        }

        $where = implode(' AND ', $conditions);

        $items = $this->data->query(
            "SELECT protocol_id, project_id, protocol_number, protocol_type, description, status
             FROM " . self::PROTOCOL_TABLE . "
             WHERE {$where}
             ORDER BY protocol_number
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::PROTOCOL_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('protocols', $items, $total, $q['offset'], $q['limit']);
    }

    // ── Project CRUD ──────────────────────────────────────────────────────────

    /** POST /eqms/validation — Create a new validation project. */
    public function projectCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->valWriteRoles());

        $body            = $this->jsonBody();
        $projectName     = trim((string)($body['project_name'] ?? ''));
        $validationType  = trim((string)($body['validation_type'] ?? ''));
        $systemName      = trim((string)($body['system_name'] ?? ''));
        $riskCategory    = trim((string)($body['risk_category'] ?? 'medium'));

        if ($projectName === '') {
            $this->error('project_name_required', 400);
        }
        if (!in_array($validationType, ['CSV', 'CQV', 'process', 'equipment', 'cleaning'], true)) {
            $this->error('invalid_validation_type', 400,
                "'validation_type' must be one of: CSV, CQV, process, equipment, cleaning.");
        }
        if (!in_array($riskCategory, ['high', 'medium', 'low'], true)) {
            $this->error('invalid_risk_category', 400, "'risk_category' must be high, medium, or low.");
        }

        $projectId     = $this->newUuid();
        $projectNumber = 'VAL-' . strtoupper(substr($projectId, 0, 8));
        $now           = $this->nowIso();

        $this->data->execute(
            "INSERT INTO " . self::PROJECT_TABLE . "
             (project_id, project_number, project_name, validation_type,
              system_name, risk_category, status, version, created_at)
             VALUES (:id, :num, :name, :type, :sys, :risk, 'planning', 1, :now)",
            [
                ':id'   => $projectId,
                ':num'  => $projectNumber,
                ':name' => $projectName,
                ':type' => $validationType,
                ':sys'  => $systemName,
                ':risk' => $riskCategory,
                ':now'  => $now,
            ]
        );

        $this->emitQualityEvent('eqms.validation.project_created', 'validation_project', $projectId, [
            'project_number'  => $projectNumber,
            'validation_type' => $validationType,
        ], $user);

        $this->success(['project' => $this->loadProject($projectId)], 201);
    }

    /** GET /eqms/validation/{id} */
    public function projectDetail(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $projectId = $this->requirePathId('id', 'project_id');
        $project   = $this->loadProject($projectId);

        $protocols = $this->data->query(
            "SELECT protocol_id, protocol_number, protocol_type, description, status
             FROM " . self::PROTOCOL_TABLE . " WHERE project_id = :id ORDER BY protocol_number",
            [':id' => $projectId]
        ) ?? [];

        $requirements = $this->data->query(
            "SELECT requirement_id, req_number, description, category
             FROM " . self::REQ_TABLE . " WHERE project_id = :id ORDER BY req_number",
            [':id' => $projectId]
        ) ?? [];

        $this->success([
            'project'      => $project,
            'protocols'    => $protocols,
            'requirements' => $requirements,
        ]);
    }

    /** PATCH /eqms/validation/{id} */
    public function projectUpdate(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->valWriteRoles());
        $projectId = $this->requirePathId('id', 'project_id');
        $project   = $this->loadProject($projectId);
        $this->requireVersionMatch((int)$project['version'], $projectId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $projectId, ':ver' => ((int)$project['version']) + 1];
        $updatable = ['project_name', 'system_name', 'risk_category'];

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
            "UPDATE " . self::PROJECT_TABLE . " SET " . implode(', ', $sets) .
            " WHERE project_id = :id AND version = " . (int)$project['version'],
            $params
        );

        $this->success(['project' => $this->loadProject($projectId)]);
    }

    public function projectAudit(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $projectId = $this->requirePathId('id', 'project_id');
        $this->loadProject($projectId);
        $this->serveAuditTrail('validation_project', $projectId);
    }

    public function projectSignatures(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $projectId = $this->requirePathId('id', 'project_id');
        $this->loadProject($projectId);
        $this->serveSignatures('validation_project', $projectId, $user);
    }

    /**
     * GET /eqms/validation/{id}/trace-matrix
     * Return requirement → protocol → execution coverage matrix.
     */
    public function traceMatrix(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $projectId = $this->requirePathId('id', 'project_id');
        $this->loadProject($projectId);

        $requirements = $this->data->query(
            "SELECT r.requirement_id, r.req_number, r.description, r.category, r.acceptance_criteria
             FROM " . self::REQ_TABLE . " r WHERE r.project_id = :pid ORDER BY r.req_number",
            [':pid' => $projectId]
        ) ?? [];

        $matrix = [];
        foreach ($requirements as $req) {
            $protocols = $this->data->query(
                "SELECT p.protocol_id, p.protocol_number, p.protocol_type, p.status AS protocol_status
                 FROM " . self::PROTOCOL_TABLE . " p
                 WHERE p.project_id = :pid
                 ORDER BY p.protocol_number",
                [':pid' => $projectId]
            ) ?? [];

            $protocolsWithExecutions = [];
            foreach ($protocols as $proto) {
                $executions = $this->data->query(
                    "SELECT e.execution_id, e.step_number, e.pass_fail, e.status AS execution_status
                     FROM " . self::EXECUTION_TABLE . " e
                     WHERE e.protocol_id = :pid ORDER BY e.step_number",
                    [':pid' => $proto['protocol_id']]
                ) ?? [];
                $proto['executions'] = $executions;
                $protocolsWithExecutions[] = $proto;
            }

            $matrix[] = [
                'requirement'  => $req,
                'protocols'    => $protocolsWithExecutions,
            ];
        }

        $this->success(['trace_matrix' => $matrix, 'requirement_count' => count($requirements)]);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport('validation', 'bulk', $user);
    }

    // ── Protocol Actions ──────────────────────────────────────────────────────

    /**
     * POST /eqms/validation/protocols/{id}/actions/approve
     * REQUIRES electronic signature.
     */
    public function protocolActionApprove(): never
    {
        $user       = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $protocolId = $this->requirePathId('id', 'protocol_id');
        $protocol   = $this->loadProtocol($protocolId);

        $this->requireValidTransition((string)$protocol['status'], 'approve', self::PROTOCOL_STATE_MACHINE, $protocolId);
        $this->requireVersionMatch((int)$protocol['version'], $protocolId);
        $this->requireElectronicSignature($user, 'approve-protocol', $protocolId);

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$protocol['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::PROTOCOL_TABLE . "
             SET status = 'approved', approved_by = :by, approved_at = now(), version = :ver
             WHERE protocol_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $protocolId, ':oldver' => (int)$protocol['version']]
        );

        // Advance parent project if this is the first approved protocol
        $project = $this->loadProject($protocol['project_id']);
        if ($project['status'] === 'planning') {
            $projVer = ((int)$project['version']) + 1;
            $this->data->execute(
                "UPDATE " . self::PROJECT_TABLE . "
                 SET status = 'protocol_approved', version = :ver
                 WHERE project_id = :id AND version = :oldver",
                [':ver' => $projVer, ':id' => $protocol['project_id'], ':oldver' => (int)$project['version']]
            );
        }

        $this->emitQualityEvent('eqms.validation.protocol_approved', 'validation_protocol', $protocolId, [
            'approved_by' => $actor,
            'project_id'  => $protocol['project_id'],
        ], $user);

        $this->success(['protocol' => $this->loadProtocol($protocolId)]);
    }

    // ── Execution Actions ─────────────────────────────────────────────────────

    /** POST /eqms/validation/executions/{id}/actions/start */
    public function executionActionStart(): never
    {
        $user        = $this->requireAuth();
        $this->requireAnyRole($user, $this->valWriteRoles());
        $executionId = $this->requirePathId('id', 'execution_id');
        $execution   = $this->loadExecution($executionId);

        $this->requireValidTransition((string)$execution['status'], 'start', self::EXECUTION_STATE_MACHINE, $executionId);
        $this->requireVersionMatch((int)$execution['version'], $executionId);

        $body     = $this->jsonBody();
        $executor = trim((string)($body['executor'] ?? ''));
        if ($executor === '') {
            $this->error('executor_required', 400, "'executor' is required.");
        }

        $newVer = ((int)$execution['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::EXECUTION_TABLE . "
             SET status = 'in_progress', executed_by = :exec,
                 executed_at = now(), version = :ver
             WHERE execution_id = :id AND version = :oldver",
            [':exec' => $executor, ':ver' => $newVer, ':id' => $executionId, ':oldver' => (int)$execution['version']]
        );

        $this->emitQualityEvent('eqms.validation.execution_started', 'validation_execution', $executionId, [
            'executor' => $executor,
        ], $user);

        $this->success(['execution' => $this->loadExecution($executionId)]);
    }

    /** POST /eqms/validation/executions/{id}/actions/record-result */
    public function executionActionRecordResult(): never
    {
        $user        = $this->requireAuth();
        $this->requireAnyRole($user, $this->valWriteRoles());
        $executionId = $this->requirePathId('id', 'execution_id');
        $execution   = $this->loadExecution($executionId);

        $this->requireValidTransition((string)$execution['status'], 'record-result', self::EXECUTION_STATE_MACHINE, $executionId);
        $this->requireVersionMatch((int)$execution['version'], $executionId);

        $body         = $this->jsonBody();
        $actualResult = trim((string)($body['actual_result'] ?? ''));
        $passFail     = trim((string)($body['pass_fail'] ?? ''));

        if ($actualResult === '') {
            $this->error('actual_result_required', 400);
        }
        if (!in_array($passFail, ['pass', 'fail'], true)) {
            $this->error('invalid_pass_fail', 400, "'pass_fail' must be 'pass' or 'fail'.");
        }

        $newVer     = ((int)$execution['version']) + 1;
        $newStatus  = 'completed'; // single-step execution completes on result

        $this->data->execute(
            "UPDATE " . self::EXECUTION_TABLE . "
             SET actual_result = :result, pass_fail = :pf,
                 executed_at = COALESCE(executed_at, now()),
                 status = :status, version = :ver
             WHERE execution_id = :id AND version = :oldver",
            [
                ':result' => $actualResult,
                ':pf'     => $passFail,
                ':status' => $newStatus,
                ':ver'    => $newVer,
                ':id'     => $executionId,
                ':oldver' => (int)$execution['version'],
            ]
        );

        $this->emitQualityEvent('eqms.validation.result_recorded', 'validation_execution', $executionId, [
            'pass_fail' => $passFail,
        ], $user);

        $this->success(['execution' => $this->loadExecution($executionId)]);
    }

    /** POST /eqms/validation/executions/{id}/actions/log-deviation */
    public function executionActionLogDeviation(): never
    {
        $user        = $this->requireAuth();
        $this->requireAnyRole($user, $this->valWriteRoles());
        $executionId = $this->requirePathId('id', 'execution_id');
        $execution   = $this->loadExecution($executionId);

        $this->requireValidTransition((string)$execution['status'], 'log-deviation', self::EXECUTION_STATE_MACHINE, $executionId);
        $this->requireVersionMatch((int)$execution['version'], $executionId);

        $body                 = $this->jsonBody();
        $deviationDescription = trim((string)($body['deviation_description'] ?? ''));
        if ($deviationDescription === '') {
            $this->error('deviation_description_required', 400);
        }

        $newVer = ((int)$execution['version']) + 1;
        $existing = trim((string)($execution['deviation_notes'] ?? ''));
        $append   = ($existing !== '' ? $existing . "\n\n" : '') .
                    '[' . $this->nowIso() . '] ' . $deviationDescription;

        $this->data->execute(
            "UPDATE " . self::EXECUTION_TABLE . "
             SET deviation_notes = :notes, version = :ver
             WHERE execution_id = :id AND version = :oldver",
            [':notes' => $append, ':ver' => $newVer, ':id' => $executionId, ':oldver' => (int)$execution['version']]
        );

        $this->emitQualityEvent('eqms.validation.deviation_logged', 'validation_execution', $executionId, [
            'deviation_description' => $deviationDescription,
        ], $user);

        $this->success(['execution' => $this->loadExecution($executionId)]);
    }

    /**
     * POST /eqms/validation/executions/{id}/actions/generate-summary
     * REQUIRES electronic signature.
     */
    public function executionActionGenerateSummary(): never
    {
        $user        = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $executionId = $this->requirePathId('id', 'execution_id');
        $execution   = $this->loadExecution($executionId);

        $this->requireValidTransition((string)$execution['status'], 'generate-summary', self::EXECUTION_STATE_MACHINE, $executionId);
        $this->requireVersionMatch((int)$execution['version'], $executionId);
        $this->requireElectronicSignature($user, 'generate-summary', $executionId);

        $body               = $this->jsonBody();
        $overallConclusion  = trim((string)($body['overall_conclusion'] ?? ''));
        $recommendations    = trim((string)($body['recommendations'] ?? ''));

        if ($overallConclusion === '') {
            $this->error('overall_conclusion_required', 400);
        }

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$execution['version']) + 1;

        // Append summary to deviation_notes field (repurposed as summary field if no dedicated column)
        $summaryNote = '[SUMMARY ' . $this->nowIso() . '] Conclusion: ' . $overallConclusion .
                       ($recommendations !== '' ? ' | Recommendations: ' . $recommendations : '');

        $this->data->execute(
            "UPDATE " . self::EXECUTION_TABLE . "
             SET deviation_notes = COALESCE(deviation_notes, '') || :summary,
                 status = 'completed', version = :ver
             WHERE execution_id = :id AND version = :oldver",
            [':summary' => "\n\n" . $summaryNote, ':ver' => $newVer, ':id' => $executionId, ':oldver' => (int)$execution['version']]
        );

        // Advance parent project
        $protocol = $this->loadProtocol($execution['protocol_id']);
        $project  = $this->loadProject($protocol['project_id']);

        if ($project['status'] === 'execution') {
            $projVer = ((int)$project['version']) + 1;
            $this->data->execute(
                "UPDATE " . self::PROJECT_TABLE . "
                 SET status = 'summary_generated', version = :ver
                 WHERE project_id = :id AND version = :oldver",
                [':ver' => $projVer, ':id' => $project['project_id'], ':oldver' => (int)$project['version']]
            );
        }

        $this->emitQualityEvent('eqms.validation.summary_generated', 'validation_execution', $executionId, [
            'overall_conclusion' => $overallConclusion,
            'signed_by'          => $actor,
        ], $user);

        $this->success(['execution' => $this->loadExecution($executionId)]);
    }
}
