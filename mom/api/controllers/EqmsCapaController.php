<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS CAPA Controller — Corrective and Preventive Action lifecycle.
 *
 * Implements the full CAPA state machine covering root cause analysis,
 * action planning, approval, implementation, effectiveness review, and close.
 *
 * State machine:
 *   draft                → start-analysis
 *   initiated            → start-analysis, record-root-cause, cancel
 *   analysis             → record-root-cause, add-action-plan, cancel
 *   action_planning      → add-action-plan, assign-action, submit-approval, cancel
 *   pending_approval     → submit-approval, assign-action, cancel
 *   approved             → assign-action, submit-verification, cancel
 *   implementation       → submit-verification, record-effectiveness, cancel
 *   effectiveness_review → record-effectiveness, close, cancel
 *   closed               → (terminal)
 *   cancelled            → (terminal)
 *
 * Standards: FDA 21 CFR Part 11, ISO 13485 §8.5.2, ISO 9001:2015 §10.2, AS9100D §10.2
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsCapaController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'capa';
    private const MODULE      = 'capa';
    private const TABLE       = 'eqms_capa_records';
    protected const PK          = 'capa_id';

    /** CAPA state machine. */
    private const STATE_MACHINE = [
        'draft'                => ['start-analysis'],
        'initiated'            => ['start-analysis', 'record-root-cause', 'cancel'],
        'analysis'             => ['record-root-cause', 'add-action-plan', 'cancel'],
        'action_planning'      => ['add-action-plan', 'assign-action', 'submit-approval', 'cancel'],
        'pending_approval'     => ['submit-approval', 'assign-action', 'cancel'],
        'approved'             => ['assign-action', 'submit-verification', 'cancel'],
        'implementation'       => ['submit-verification', 'record-effectiveness', 'cancel'],
        'effectiveness_review' => ['record-effectiveness', 'close', 'cancel'],
        'closed'               => [],
        'cancelled'            => [],
    ];

    /** Write roles for CAPA records. */
    private function capaWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer', 'process_engineer',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * Load a single CAPA record or emit 404.
     */
    private function loadCapa(string $capaId): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE capa_id = :id LIMIT 1",
            [':id' => $capaId]
        );
        if (empty($row)) {
            $this->error('capa_not_found', 404, "CAPA '{$capaId}' not found.");
        }
        return $row[0];
    }

    /**
     * Decode the action_plan JSONB column (handles string or already-decoded array).
     */
    private function decodeActionPlan(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /**
     * POST /eqms/capa/query — Paginated CAPA list with filters and search.
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(capa_number ILIKE :search OR title ILIKE :search OR description ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'severity', 'source_type', 'assigned_to'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        // Source linkage filter
        if (!empty($q['filters']['source_id'])) {
            $conditions[]            = 'source_id = :source_id';
            $params[':source_id']    = $q['filters']['source_id'];
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], ['capa_number', 'title', 'severity', 'status', 'due_date', 'created_at'], true)
                   ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT capa_id, capa_number, title, source_type, source_id, severity,
                    status, assigned_to, due_date, created_at, created_by, version
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

        $this->paginated('capa_records', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/capa/metrics — Aggregate CAPA KPIs.
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $bySourceType = $this->data->query(
            "SELECT source_type, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY source_type ORDER BY source_type"
        ) ?? [];

        $bySeverity = $this->data->query(
            "SELECT severity, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY severity ORDER BY severity"
        ) ?? [];

        $openCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status NOT IN ('closed','cancelled')"
        ) ?? 0);

        $overdueCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status NOT IN ('closed','cancelled') AND due_date < NOW()"
        ) ?? 0);

        $pendingApprovalCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status = 'pending_approval'"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'             => $byStatus,
                'by_source_type'        => $bySourceType,
                'by_severity'           => $bySeverity,
                'open_count'            => $openCount,
                'overdue_count'         => $overdueCount,
                'pending_approval_count' => $pendingApprovalCount,
            ],
        ]);
    }

    /**
     * POST /eqms/capa/lookup — Lightweight ID→number lookup for linking.
     */
    public function lookup(): never
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
            "SELECT capa_id, capa_number, title, status, severity FROM " . self::TABLE . "
             WHERE capa_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /**
     * POST /eqms/capa — Create a new CAPA in initiated state.
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $body = $this->jsonBody();

        $title      = trim((string)($body['title'] ?? ''));
        $sourceType = trim((string)($body['source_type'] ?? ''));
        $severity   = trim((string)($body['severity'] ?? 'major'));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if (!in_array($sourceType, ['ncr', 'complaint', 'audit', 'deviation', 'spc', 'other'], true)) {
            $this->error('invalid_source_type', 400,
                "'source_type' must be one of: ncr, complaint, audit, deviation, spc, other.");
        }
        if (!in_array($severity, ['minor', 'major', 'critical'], true)) {
            $this->error('invalid_severity', 400, "'severity' must be minor, major, or critical.");
        }

        $capaId     = $this->newUuid();
        $capaNumber = 'CAPA-' . strtoupper(substr($capaId, 0, 8));
        $now        = $this->nowIso();
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (capa_id, capa_number, title, description, source_type, source_id,
              severity, assigned_to, due_date, action_plan,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :srctype, :srcid,
              :sev, :assigned, :due, '[]'::jsonb,
              'initiated', 1, :now, :by)",
            [
                ':id'      => $capaId,
                ':num'     => $capaNumber,
                ':title'   => $title,
                ':desc'    => trim((string)($body['description'] ?? '')),
                ':srctype' => $sourceType,
                ':srcid'   => $body['source_id'] ?? null,
                ':sev'     => $severity,
                ':assigned' => $body['assigned_to'] ?? null,
                ':due'     => $body['due_date'] ?? null,
                ':now'     => $now,
                ':by'      => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.capa.created', self::ENTITY_TYPE, $capaId, [
            'capa_number' => $capaNumber,
            'source_type' => $sourceType,
            'severity'    => $severity,
        ], $user);

        $capa = $this->loadCapa($capaId);
        $this->success(['capa' => $capa], 201);
    }

    /**
     * GET /eqms/capa/{id} — Retrieve full CAPA detail.
     */
    public function detail(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->success(['capa' => $capa]);
    }

    /**
     * PATCH /eqms/capa/{id} — Update mutable CAPA fields with optimistic concurrency.
     */
    public function update(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireVersionMatch((int)$capa['version'], $capaId);

        if (in_array($capa['status'], ['closed', 'cancelled'], true)) {
            $this->error('record_locked', 409, "Closed or cancelled CAPA records cannot be updated.");
        }

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $capaId, ':ver' => ((int)$capa['version']) + 1];
        $updatable = [
            'title', 'description', 'severity', 'source_type', 'source_id',
            'assigned_to', 'due_date', 'effectiveness_criteria',
        ];

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
        $sql    = "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
                  " WHERE capa_id = :id AND version = " . (int)$capa['version'];

        $this->data->execute($sql, $params);

        $this->emitQualityEvent('eqms.capa.updated', self::ENTITY_TYPE, $capaId, [
            'fields_updated' => array_intersect_key($body, array_flip($updatable)),
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /eqms/capa/{id}/audit */
    public function audit(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $capaId);
    }

    /** GET|POST /eqms/capa/{id}/comments */
    public function comments(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveComments(self::ENTITY_TYPE, $capaId, $user);
    }

    /** GET|POST /eqms/capa/{id}/attachments */
    public function attachments(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveAttachments(self::ENTITY_TYPE, $capaId, $user);
    }

    /** GET /eqms/capa/{id}/relationships */
    public function relationships(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveRelationships(self::ENTITY_TYPE, $capaId, $user, 'list');
    }

    /** POST /eqms/capa/{id}/relationships/link */
    public function relationshipsLink(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveRelationships(self::ENTITY_TYPE, $capaId, $user, 'link');
    }

    /** POST /eqms/capa/{id}/relationships/unlink */
    public function relationshipsUnlink(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveRelationships(self::ENTITY_TYPE, $capaId, $user, 'unlink');
    }

    /** GET /eqms/capa/{id}/available-actions */
    public function availableActions(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);
        $this->serveAvailableActions((string)$capa['status'], self::STATE_MACHINE);
    }

    /** GET|POST /eqms/capa/{id}/signatures */
    public function signatures(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveSignatures(self::ENTITY_TYPE, $capaId, $user);
    }

    /** POST /eqms/capa/{id}/export */
    public function export(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $capaId = $this->requirePathId('id', 'capa_id');
        $this->loadCapa($capaId);
        $this->serveExport(self::MODULE, $capaId, $user);
    }

    /** POST /eqms/capa/export-bulk */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /**
     * POST /eqms/capa/{id}/actions/start-analysis
     * Begin RCA work. Transitions to 'analysis'.
     */
    public function actionStartAnalysis(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'start-analysis', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        $body       = $this->jsonBody();
        $newVersion = ((int)$capa['version']) + 1;

        $sets   = ["status = 'analysis'", "version = :ver"];
        $params = [':ver' => $newVersion, ':id' => $capaId, ':oldver' => (int)$capa['version']];

        $rootCauseMethod = trim((string)($body['root_cause_method'] ?? ''));
        if ($rootCauseMethod !== '' && in_array($rootCauseMethod, ['5why', 'fishbone', 'fault_tree', 'other'], true)) {
            $sets[]                   = 'root_cause_method = :method';
            $params[':method']        = $rootCauseMethod;
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE capa_id = :id AND version = :oldver",
            $params
        );

        $this->emitQualityEvent('eqms.capa.analysis_started', self::ENTITY_TYPE, $capaId, [
            'root_cause_method' => $rootCauseMethod,
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    /**
     * POST /eqms/capa/{id}/actions/record-root-cause
     * Record root cause analysis findings. Transitions to 'action_planning'.
     * Body requires: { root_cause_method, root_cause_description }
     */
    public function actionRecordRootCause(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'record-root-cause', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        $body                  = $this->jsonBody();
        $rootCauseMethod       = trim((string)($body['root_cause_method'] ?? ''));
        $rootCauseDescription  = trim((string)($body['root_cause_description'] ?? ''));

        if ($rootCauseMethod === '') {
            $this->error('root_cause_method_required', 400, "'root_cause_method' is required.");
        }
        if (!in_array($rootCauseMethod, ['5why', 'fishbone', 'fault_tree', 'other'], true)) {
            $this->error('invalid_root_cause_method', 400,
                "'root_cause_method' must be one of: 5why, fishbone, fault_tree, other.");
        }
        if ($rootCauseDescription === '') {
            $this->error('root_cause_description_required', 400, "'root_cause_description' is required.");
        }

        $newVersion = ((int)$capa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET root_cause_method = :method, root_cause_description = :desc,
                 status = 'action_planning', version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':method' => $rootCauseMethod,
                ':desc'   => $rootCauseDescription,
                ':ver'    => $newVersion,
                ':id'     => $capaId,
                ':oldver' => (int)$capa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.capa.root_cause_recorded', self::ENTITY_TYPE, $capaId, [
            'root_cause_method'      => $rootCauseMethod,
            'root_cause_description' => $rootCauseDescription,
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    /**
     * POST /eqms/capa/{id}/actions/add-action-plan
     * Append a corrective action item to the action_plan JSONB array.
     * Body requires: { action_description, responsible, due_date }
     *
     * Business rule: root_cause_description must be set first.
     */
    public function actionAddActionPlan(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'add-action-plan', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        // Business rule: root cause must be documented before adding action plan
        if (empty($capa['root_cause_description'])) {
            $this->error('root_cause_required_for_action_plan', 409,
                "A root cause description must be recorded before adding action plan items.");
        }

        $body               = $this->jsonBody();
        $actionDescription  = trim((string)($body['action_description'] ?? ''));
        $responsible        = trim((string)($body['responsible'] ?? ''));
        $dueDate            = trim((string)($body['due_date'] ?? ''));

        if ($actionDescription === '') {
            $this->error('action_description_required', 400, "'action_description' is required.");
        }
        if ($responsible === '') {
            $this->error('responsible_required', 400, "'responsible' is required.");
        }
        if ($dueDate === '') {
            $this->error('due_date_required', 400, "'due_date' is required for each action item.");
        }

        $existingPlan = $this->decodeActionPlan($capa['action_plan']);
        $newItem      = [
            'action_index'       => count($existingPlan),
            'action_description' => $actionDescription,
            'responsible'        => $responsible,
            'due_date'           => $dueDate,
            'assigned_to'        => null,
            'status'             => 'open',
            'added_by'           => (string)($user['username'] ?? 'unknown'),
            'added_at'           => $this->nowIso(),
        ];

        $existingPlan[] = $newItem;
        $newVersion     = ((int)$capa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET action_plan = :plan::jsonb, version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':plan'   => json_encode($existingPlan, JSON_UNESCAPED_UNICODE),
                ':ver'    => $newVersion,
                ':id'     => $capaId,
                ':oldver' => (int)$capa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.capa.action_item_added', self::ENTITY_TYPE, $capaId, [
            'action_index'       => $newItem['action_index'],
            'action_description' => $actionDescription,
            'responsible'        => $responsible,
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated, 'added_item' => $newItem], 201);
    }

    /**
     * POST /eqms/capa/{id}/actions/assign-action
     * Assign a specific action plan item to an owner.
     * Body requires: { action_index, assigned_to }
     */
    public function actionAssignAction(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'assign-action', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        $body         = $this->jsonBody();
        $actionIndex  = $body['action_index'] ?? null;
        $assignedTo   = trim((string)($body['assigned_to'] ?? ''));

        if ($actionIndex === null || !is_numeric($actionIndex)) {
            $this->error('action_index_required', 400, "'action_index' (integer) is required.");
        }
        if ($assignedTo === '') {
            $this->error('assigned_to_required', 400, "'assigned_to' is required.");
        }

        $plan = $this->decodeActionPlan($capa['action_plan']);
        $idx  = (int)$actionIndex;

        if (!array_key_exists($idx, $plan)) {
            $this->error('action_index_out_of_range', 400,
                "No action item at index {$idx}. Plan has " . count($plan) . " item(s).");
        }

        $plan[$idx]['assigned_to'] = $assignedTo;
        $newVersion                = ((int)$capa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET action_plan = :plan::jsonb, version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':plan'   => json_encode($plan, JSON_UNESCAPED_UNICODE),
                ':ver'    => $newVersion,
                ':id'     => $capaId,
                ':oldver' => (int)$capa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.capa.action_assigned', self::ENTITY_TYPE, $capaId, [
            'action_index' => $idx,
            'assigned_to'  => $assignedTo,
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    /**
     * POST /eqms/capa/{id}/actions/submit-approval
     * Submit CAPA for management approval. REQUIRES electronic signature.
     * Body requires: { approver }
     */
    public function actionSubmitApproval(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'submit-approval', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        $body     = $this->jsonBody();
        $approver = trim((string)($body['approver'] ?? ''));

        if ($approver === '') {
            $this->error('approver_required', 400, "'approver' is required to submit for approval.");
        }

        // Electronic signature mandatory for approval submission
        $this->requireElectronicSignature($user, 'submit-approval', $capaId);

        $newVersion = ((int)$capa['version']) + 1;
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'pending_approval', approved_by = :approver, version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':approver' => $approver,
                ':ver'      => $newVersion,
                ':id'       => $capaId,
                ':oldver'   => (int)$capa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.capa.submitted_for_approval', self::ENTITY_TYPE, $capaId, [
            'submitted_by' => $actor,
            'approver'     => $approver,
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    /**
     * POST /eqms/capa/{id}/actions/submit-verification
     * Submit implementation evidence for verification review.
     * Body requires: { verification_evidence }
     */
    public function actionSubmitVerification(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'submit-verification', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        $body                  = $this->jsonBody();
        $verificationEvidence  = trim((string)($body['verification_evidence'] ?? ''));

        if ($verificationEvidence === '') {
            $this->error('verification_evidence_required', 400, "'verification_evidence' is required.");
        }

        $newVersion = ((int)$capa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'effectiveness_review', version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':ver'    => $newVersion,
                ':id'     => $capaId,
                ':oldver' => (int)$capa['version'],
            ]
        );

        // Store verification evidence as a comment for traceability
        $this->data->execute(
            "INSERT INTO eqms_comments (comment_id, entity_type, entity_id, text, author, is_internal, created_at)
             VALUES (:cid, :etype, :eid, :text, :author, true, now())",
            [
                ':cid'    => $this->newUuid(),
                ':etype'  => self::ENTITY_TYPE,
                ':eid'    => $capaId,
                ':text'   => '[Verification Evidence] ' . $verificationEvidence,
                ':author' => (string)($user['username'] ?? 'unknown'),
            ]
        );

        $this->emitQualityEvent('eqms.capa.verification_submitted', self::ENTITY_TYPE, $capaId, [
            'verification_evidence' => $verificationEvidence,
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    /**
     * POST /eqms/capa/{id}/actions/record-effectiveness
     * Record effectiveness review result.
     * Body requires: { effectiveness_criteria, effectiveness_result, effective: bool }
     */
    public function actionRecordEffectiveness(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'record-effectiveness', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        $body                    = $this->jsonBody();
        $effectivenessCriteria   = trim((string)($body['effectiveness_criteria'] ?? ''));
        $effectivenessResult     = trim((string)($body['effectiveness_result'] ?? ''));

        if ($effectivenessCriteria === '') {
            $this->error('effectiveness_criteria_required', 400, "'effectiveness_criteria' is required.");
        }
        if ($effectivenessResult === '') {
            $this->error('effectiveness_result_required', 400, "'effectiveness_result' is required.");
        }
        if (!array_key_exists('effective', $body)) {
            $this->error('effective_flag_required', 400, "'effective' (boolean) is required.");
        }

        $effective  = (bool)$body['effective'];
        $newVersion = ((int)$capa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET effectiveness_criteria = :criteria, effectiveness_result = :result,
                 version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':criteria' => $effectivenessCriteria,
                ':result'   => $effectivenessResult,
                ':ver'      => $newVersion,
                ':id'       => $capaId,
                ':oldver'   => (int)$capa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.capa.effectiveness_recorded', self::ENTITY_TYPE, $capaId, [
            'effectiveness_criteria' => $effectivenessCriteria,
            'effectiveness_result'   => $effectivenessResult,
            'effective'              => $effective,
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    /**
     * POST /eqms/capa/{id}/actions/close
     * Close the CAPA. REQUIRES electronic signature.
     * Only allowed from effectiveness_review state.
     */
    public function actionClose(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsCloseRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'close', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        // Business rule: effectiveness review must be completed (result recorded)
        if (empty($capa['effectiveness_result'])) {
            $this->error('effectiveness_review_required', 409,
                "CAPA cannot be closed until an effectiveness review result has been recorded.");
        }

        // Electronic signature required for close
        $this->requireElectronicSignature($user, 'close', $capaId);

        $newVersion = ((int)$capa['version']) + 1;
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'closed', closed_by = :by, closed_at = now(), version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':by'     => $actor,
                ':ver'    => $newVersion,
                ':id'     => $capaId,
                ':oldver' => (int)$capa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.capa.closed', self::ENTITY_TYPE, $capaId, [
            'closed_by'              => $actor,
            'effectiveness_result'   => $capa['effectiveness_result'],
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }

    /**
     * POST /eqms/capa/{id}/actions/cancel
     * Cancel a CAPA that has not yet reached closed state.
     * Body requires: { cancellation_reason }
     */
    public function actionCancel(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->capaWriteRoles());

        $capaId = $this->requirePathId('id', 'capa_id');
        $capa   = $this->loadCapa($capaId);

        $this->requireValidTransition((string)$capa['status'], 'cancel', self::STATE_MACHINE, $capaId);
        $this->requireVersionMatch((int)$capa['version'], $capaId);

        $body               = $this->jsonBody();
        $cancellationReason = trim((string)($body['cancellation_reason'] ?? ''));

        if ($cancellationReason === '') {
            $this->error('cancellation_reason_required', 400, "'cancellation_reason' is required.");
        }

        $newVersion = ((int)$capa['version']) + 1;
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'cancelled', version = :ver
             WHERE capa_id = :id AND version = :oldver",
            [
                ':ver'    => $newVersion,
                ':id'     => $capaId,
                ':oldver' => (int)$capa['version'],
            ]
        );

        // Record cancellation reason as a permanent comment
        $this->data->execute(
            "INSERT INTO eqms_comments (comment_id, entity_type, entity_id, text, author, is_internal, created_at)
             VALUES (:cid, :etype, :eid, :text, :author, true, now())",
            [
                ':cid'    => $this->newUuid(),
                ':etype'  => self::ENTITY_TYPE,
                ':eid'    => $capaId,
                ':text'   => '[Cancellation Reason] ' . $cancellationReason,
                ':author' => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.capa.cancelled', self::ENTITY_TYPE, $capaId, [
            'cancelled_by'        => $actor,
            'cancellation_reason' => $cancellationReason,
            'previous_status'     => $capa['status'],
        ], $user);

        $updated = $this->loadCapa($capaId);
        $this->success(['capa' => $updated]);
    }
}
