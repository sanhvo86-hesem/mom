<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Change Control Controller — world-class Change Control management.
 *
 * Manages the full lifecycle of change control records per ISO 13485 §7.3.9,
 * FDA 21 CFR Part 820.70, AS9100D §8.5.6, and IATF 16949 §8.5.6.
 *
 * State machine:
 *   draft → classified → impact_assessed → pending_approval → approved
 *       → implementation → effectiveness_review → closed
 *
 * Signature required: approve, close
 * Standards: FDA 21 CFR Part 11, ISO 13485, AS9100D, IATF 16949.
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsChangeControlController extends EqmsBaseController
{
    private const MODULE      = 'change_control';
    private const ENTITY_TYPE = 'change_control';
    private const TABLE       = 'eqms_change_controls';
    protected const PK          = 'change_control_id';

    // ── State Machine ────────────────────────────────────────────────────────

    /** @return array<string, list<string>> */
    private function stateMachine(): array
    {
        return [
            'draft'                => ['classify'],
            'classified'           => ['assess-impact', 'route-approval'],
            'impact_assessed'      => ['route-approval'],
            'pending_approval'     => ['approve', 'classify'],
            'approved'             => ['launch-implementation'],
            'implementation'       => ['verify-effectiveness', 'close'],
            'effectiveness_review' => ['verify-effectiveness', 'close'],
            'closed'               => [],
        ];
    }

    /** Actions that require an electronic signature. */
    protected function signatureRequiredActions(): array
    {
        return ['approve', 'close'];
    }

    // ── Role Helpers ─────────────────────────────────────────────────────────

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'engineering_manager',
            'process_engineer', 'qms_manager',
        ])));
    }

    private function approveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'production_director', 'qms_manager',
        ])));
    }

    // ── Fetch Helper ─────────────────────────────────────────────────────────

    private function fetchRecord(string $id): array
    {
        $rec = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE " . self::PK . " = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($rec)) {
            $this->error('change_control_not_found', 404, "Change control '{$id}' not found.");
        }
        return $rec[0];
    }

    // ── Standard CRUD Endpoints ───────────────────────────────────────────────

    /**
     * POST /eqms/change-controls/query
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $q = $this->parseQueryBody();

        $where  = ['1=1'];
        $params = [];

        if ($q['search'] !== '') {
            $where[]             = "(title ILIKE :search OR change_control_number ILIKE :search)";
            $params[':search']   = '%' . $q['search'] . '%';
        }
        foreach (['status', 'change_type', 'change_category', 'risk_level'] as $f) {
            if (!empty($q['filters'][$f])) {
                $where[]          = "{$f} = :{$f}";
                $params[":{$f}"]  = $q['filters'][$f];
            }
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['created_at', 'change_control_number', 'title', 'status', 'risk_level'], true)
            ? $q['sort_by'] : 'created_at';
        $sortDir     = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT change_control_id, change_control_number, title, change_type, change_category,
                    risk_level, status, version, created_at, created_by, approved_at
             FROM " . self::TABLE . "
             WHERE {$whereClause}
             ORDER BY {$sortBy} {$sortDir}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('change_controls', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/change-controls/metrics
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byRisk = $this->data->query(
            "SELECT risk_level, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY risk_level ORDER BY risk_level"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT change_type, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY change_type ORDER BY change_type"
        ) ?? [];

        $this->success([
            'metrics' => [
                'by_status'    => $byStatus,
                'by_risk_level' => $byRisk,
                'by_type'      => $byType,
            ],
        ]);
    }

    /**
     * GET /eqms/change-controls/lookup
     */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $search = trim((string)($this->query('q', '')));
        $items  = $this->data->query(
            "SELECT change_control_id AS id, change_control_number AS code, title, status
             FROM " . self::TABLE . "
             WHERE title ILIKE :s OR change_control_number ILIKE :s
             ORDER BY change_control_number
             LIMIT 50",
            [':s' => '%' . $search . '%']
        ) ?? [];

        $this->success(['items' => $items]);
    }

    /**
     * POST /eqms/change-controls
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'change_type', 'change_category', 'justification']);

        $id     = $this->newUuid();
        $number = 'CC-' . strtoupper(substr($id, 0, 8));
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (change_control_id, change_control_number, title, description, change_type, change_category,
              justification, risk_level, linked_document_ids, training_impact_ids,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :ctype, :ccat,
              :just, :risk, :ldocs::jsonb, :tids::jsonb,
              'draft', 1, :now, :actor)",
            [
                ':id'    => $id,
                ':num'   => $number,
                ':title' => trim((string)($body['title'] ?? '')),
                ':desc'  => trim((string)($body['description'] ?? '')),
                ':ctype' => $body['change_type'],
                ':ccat'  => $body['change_category'],
                ':just'  => $body['justification'],
                ':risk'  => $body['risk_level'] ?? 'medium',
                ':ldocs' => json_encode($body['linked_document_ids'] ?? []),
                ':tids'  => json_encode($body['training_impact_ids'] ?? []),
                ':now'   => $now,
                ':actor' => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.change_control.created', self::ENTITY_TYPE, $id, ['number' => $number], $user);
        $this->success(['change_control_id' => $id, 'change_control_number' => $number], 201);
    }

    /**
     * GET /eqms/change-controls/{id}
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);
        $this->success(['change_control' => $rec]);
    }

    /**
     * PATCH /eqms/change-controls/{id}
     */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        if (in_array($rec['status'], ['closed'], true)) {
            $this->error('record_immutable', 409, "Closed change controls cannot be edited.");
        }

        $this->requireVersionMatch((int)$rec['version'], $id);
        $body = $this->jsonBody();

        $allowed = ['title', 'description', 'justification', 'risk_level',
                    'linked_document_ids', 'training_impact_ids', 'implementation_plan', 'effectiveness_criteria'];
        $sets    = ["version = version + 1"];
        $params  = [':id' => $id];

        foreach ($allowed as $field) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            if (in_array($field, ['linked_document_ids', 'training_impact_ids', 'impact_assessment', 'approval_route'], true)) {
                $sets[]           = "{$field} = :{$field}::jsonb";
                $params[":{$field}"] = json_encode($body[$field]);
            } else {
                $sets[]           = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) . " WHERE " . self::PK . " = :id",
            $params
        );

        $this->emitQualityEvent('eqms.change_control.updated', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['updated' => true]);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /eqms/change-controls/{id}/audit */
    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    /** GET|POST /eqms/change-controls/{id}/comments */
    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    /** GET|POST /eqms/change-controls/{id}/attachments */
    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    /** GET /eqms/change-controls/{id}/relationships */
    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user);
    }

    /** POST /eqms/change-controls/{id}/relationships/link */
    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    /** POST /eqms/change-controls/{id}/relationships/unlink */
    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    /** GET /eqms/change-controls/{id}/available-actions */
    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id  = $this->requirePathId();
        $rec = $this->fetchRecord($id);
        $this->serveAvailableActions((string)$rec['status'], $this->stateMachine());
    }

    /** GET|POST /eqms/change-controls/{id}/signatures */
    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    /** POST /eqms/change-controls/{id}/export */
    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveExport(self::MODULE, $id, $user);
    }

    /** POST /eqms/change-controls/export-bulk */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── Domain-specific Endpoints ─────────────────────────────────────────────

    /**
     * POST /eqms/change-controls/{id}/documents/link
     * Link a document to this change control.
     */
    public function documentsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);
        $body = $this->jsonBody();

        $docId = trim((string)($body['doc_id'] ?? ''));
        if ($docId === '') {
            $this->error('doc_id_required', 400, "'doc_id' is required.");
        }

        $linked = is_array($rec['linked_document_ids'])
            ? $rec['linked_document_ids']
            : (json_decode((string)($rec['linked_document_ids'] ?? '[]'), true) ?? []);

        if (!in_array($docId, $linked, true)) {
            $linked[] = $docId;
            $this->data->execute(
                "UPDATE " . self::TABLE . " SET linked_document_ids = :docs::jsonb WHERE " . self::PK . " = :id",
                [':docs' => json_encode($linked), ':id' => $id]
            );
        }

        $this->emitQualityEvent('eqms.change_control.document_linked', self::ENTITY_TYPE, $id, ['doc_id' => $docId], $user);
        $this->success(['linked' => true, 'doc_id' => $docId]);
    }

    /**
     * POST /eqms/change-controls/{id}/training-impact/query
     * Query training records impacted by this change control.
     */
    public function trainingImpactQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id  = $this->requirePathId();
        $rec = $this->fetchRecord($id);
        $q   = $this->parseQueryBody();

        $trainingIds = is_array($rec['training_impact_ids'])
            ? $rec['training_impact_ids']
            : (json_decode((string)($rec['training_impact_ids'] ?? '[]'), true) ?? []);

        if (empty($trainingIds)) {
            $this->paginated('training_records', [], 0, $q['offset'], $q['limit']);
        }

        $placeholders = implode(',', array_map(static fn($i) => ":tid{$i}", array_keys($trainingIds)));
        $params       = [':lim' => $q['limit'], ':off' => $q['offset']];
        foreach ($trainingIds as $i => $tid) {
            $params[":tid{$i}"] = $tid;
        }

        $items = $this->data->query(
            "SELECT * FROM training_records WHERE training_id IN ({$placeholders})
             ORDER BY created_at DESC LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = count($trainingIds);
        $this->paginated('training_records', $items, $total, $q['offset'], $q['limit']);
    }

    // ── Workflow Action Endpoints ─────────────────────────────────────────────

    /**
     * POST /eqms/change-controls/{id}/actions/classify
     * Classify the change type and category; transitions draft → classified.
     */
    public function actionClassify(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'classify', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body        = $this->jsonBody();
        $changeType  = trim((string)($body['change_type'] ?? (string)$rec['change_type']));
        $changeCat   = trim((string)($body['change_category'] ?? (string)$rec['change_category']));

        $validTypes = ['quality', 'regulatory', 'process', 'product', 'system', 'facility'];
        $validCats  = ['major', 'minor', 'administrative'];

        if (!in_array($changeType, $validTypes, true)) {
            $this->error('invalid_change_type', 400, "Valid types: " . implode(', ', $validTypes));
        }
        if (!in_array($changeCat, $validCats, true)) {
            $this->error('invalid_change_category', 400, "Valid categories: " . implode(', ', $validCats));
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'classified', change_type = :ctype, change_category = :ccat, version = version + 1
             WHERE " . self::PK . " = :id",
            [':ctype' => $changeType, ':ccat' => $changeCat, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.change_control.classified', self::ENTITY_TYPE, $id,
            ['change_type' => $changeType, 'change_category' => $changeCat], $user);
        $this->success(['status' => 'classified']);
    }

    /**
     * POST /eqms/change-controls/{id}/actions/assess-impact
     * Record impact assessment; transitions classified or pending_approval → impact_assessed.
     * Body: { impact_assessment: {...}, risk_level: 'high'|'medium'|'low' }
     */
    public function actionAssessImpact(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'assess-impact', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body = $this->jsonBody();
        $this->requireFields($body, ['impact_assessment', 'risk_level']);

        $validRisks = ['high', 'medium', 'low'];
        if (!in_array($body['risk_level'], $validRisks, true)) {
            $this->error('invalid_risk_level', 400, "Valid values: " . implode(', ', $validRisks));
        }
        if (!is_array($body['impact_assessment'])) {
            $this->error('invalid_impact_assessment', 400, "'impact_assessment' must be an object.");
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'impact_assessed',
                 impact_assessment = :ia::jsonb,
                 risk_level = :risk,
                 version = version + 1
             WHERE " . self::PK . " = :id",
            [':ia' => json_encode($body['impact_assessment']), ':risk' => $body['risk_level'], ':id' => $id]
        );

        $this->emitQualityEvent('eqms.change_control.impact_assessed', self::ENTITY_TYPE, $id,
            ['risk_level' => $body['risk_level']], $user);
        $this->success(['status' => 'impact_assessed']);
    }

    /**
     * POST /eqms/change-controls/{id}/actions/route-approval
     * Set up the approval route; transitions classified|impact_assessed → pending_approval.
     * Body: { approver_ids: [] }
     */
    public function actionRouteApproval(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'route-approval', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body = $this->jsonBody();
        $this->requireFields($body, ['approver_ids']);

        if (!is_array($body['approver_ids']) || count($body['approver_ids']) === 0) {
            $this->error('approver_ids_required', 400, "'approver_ids' must be a non-empty array.");
        }

        $approvalRoute = array_map('strval', $body['approver_ids']);

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'pending_approval', approval_route = :route::jsonb, version = version + 1
             WHERE " . self::PK . " = :id",
            [':route' => json_encode($approvalRoute), ':id' => $id]
        );

        $this->emitQualityEvent('eqms.change_control.routed_for_approval', self::ENTITY_TYPE, $id,
            ['approver_count' => count($approvalRoute)], $user);
        $this->success(['status' => 'pending_approval', 'approver_count' => count($approvalRoute)]);
    }

    /**
     * POST /eqms/change-controls/{id}/actions/approve
     * Approve the change control; transitions pending_approval → approved.
     * REQUIRES electronic signature. Approver must be in approval_route.
     */
    public function actionApprove(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'approve', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'approve', $id);

        // Approver must be listed in approval_route
        $actor        = (string)($user['username'] ?? $user['user'] ?? '');
        $approvalRoute = is_array($rec['approval_route'])
            ? $rec['approval_route']
            : (json_decode((string)($rec['approval_route'] ?? '[]'), true) ?? []);

        if (!empty($approvalRoute) && !in_array($actor, $approvalRoute, true)) {
            $userId = (string)($user['user_id'] ?? '');
            if (!in_array($userId, $approvalRoute, true)) {
                $this->error('not_in_approval_route', 403,
                    "User '{$actor}' is not listed in the approval route for this change control.");
            }
        }

        $now = $this->nowIso();
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'approved', approved_by = :by, approved_at = :at, version = version + 1
             WHERE " . self::PK . " = :id",
            [':by' => $actor, ':at' => $now, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.change_control.approved', self::ENTITY_TYPE, $id,
            ['approved_by' => $actor, 'approved_at' => $now], $user);
        $this->success(['status' => 'approved', 'approved_by' => $actor, 'approved_at' => $now]);
    }

    /**
     * POST /eqms/change-controls/{id}/actions/launch-implementation
     * Launch the implementation phase; transitions approved → implementation.
     * Body: { implementation_plan: '...', implementation_date: 'YYYY-MM-DD' }
     */
    public function actionLaunchImplementation(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'launch-implementation', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body = $this->jsonBody();
        $this->requireFields($body, ['implementation_plan', 'implementation_date']);

        $implPlan = trim((string)$body['implementation_plan']);
        $implDate = trim((string)$body['implementation_date']);

        if ($implPlan === '') {
            $this->error('implementation_plan_required', 400, "'implementation_plan' must not be empty.");
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'implementation',
                 implementation_plan = :plan,
                 implementation_date = :date,
                 version = version + 1
             WHERE " . self::PK . " = :id",
            [':plan' => $implPlan, ':date' => $implDate, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.change_control.implementation_launched', self::ENTITY_TYPE, $id,
            ['implementation_date' => $implDate], $user);
        $this->success(['status' => 'implementation']);
    }

    /**
     * POST /eqms/change-controls/{id}/actions/verify-effectiveness
     * Record effectiveness verification; transitions implementation|effectiveness_review → effectiveness_review.
     * Body: { effectiveness_criteria: '...', effectiveness_result: '...' }
     */
    public function actionVerifyEffectiveness(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'verify-effectiveness', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body = $this->jsonBody();
        $this->requireFields($body, ['effectiveness_criteria', 'effectiveness_result']);

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'effectiveness_review',
                 effectiveness_criteria = :crit,
                 effectiveness_result = :result,
                 version = version + 1
             WHERE " . self::PK . " = :id",
            [
                ':crit'   => trim((string)$body['effectiveness_criteria']),
                ':result' => trim((string)$body['effectiveness_result']),
                ':id'     => $id,
            ]
        );

        $this->emitQualityEvent('eqms.change_control.effectiveness_reviewed', self::ENTITY_TYPE, $id,
            ['effectiveness_result' => $body['effectiveness_result']], $user);
        $this->success(['status' => 'effectiveness_review']);
    }

    /**
     * POST /eqms/change-controls/{id}/actions/close
     * Close the change control; transitions implementation|effectiveness_review → closed.
     * REQUIRES electronic signature.
     */
    public function actionClose(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'close', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'close', $id);

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET status = 'closed', version = version + 1 WHERE " . self::PK . " = :id",
            [':id' => $id]
        );

        $this->emitQualityEvent('eqms.change_control.closed', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['status' => 'closed']);
    }
}
