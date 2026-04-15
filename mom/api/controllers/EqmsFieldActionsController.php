<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Field Actions Controller — Recall / Field Safety Notice / Advisory lifecycle.
 *
 * State machine (FDA/EU MDR recall pattern):
 *   draft              → evaluate
 *   under_evaluation   → evaluate, plan
 *   planned            → launch, evaluate
 *   launched           → notify-customers, record-effectiveness
 *   notifications_sent → record-effectiveness
 *   effectiveness_review → record-effectiveness, close
 *   closed             → (terminal)
 *
 * Electronic Signature:
 *   launch REQUIRES signature (triggers official recall/field action).
 *   close  REQUIRES signature.
 *
 * Standards: 21 CFR Part 7, EU MDR Article 83-87, ISO 13485 §8.5.3, MEDDEV 2.12/1
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsFieldActionsController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'field_action';
    private const MODULE      = 'field_action';
    private const TABLE       = 'eqms_field_actions';
    protected const PK          = 'field_action_id';

    private const STATE_MACHINE = [
        'draft'                => ['evaluate'],
        'under_evaluation'     => ['evaluate', 'plan'],
        'planned'              => ['launch', 'evaluate'],
        'launched'             => ['notify-customers', 'record-effectiveness'],
        'notifications_sent'   => ['record-effectiveness'],
        'effectiveness_review' => ['record-effectiveness', 'close'],
        'closed'               => [],
    ];

    private function fieldActionWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'qms_manager',
            'regulatory_affairs', 'production_director',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadFieldAction(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE field_action_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('field_action_not_found', 404, "Field action '{$id}' not found.");
        }
        return $row[0];
    }

    // ── Query & Metrics ───────────────────────────────────────────────────────

    /** POST /eqms/field-actions/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(field_action_number ILIKE :search OR action_type ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'action_type', 'classification'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['field_action_number', 'action_type', 'classification', 'status', 'launch_date', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT field_action_id, field_action_number, action_type, classification,
                    launch_date, regulatory_notification_date,
                    status, version, created_at, created_by
             FROM " . self::TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('field_actions', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/field-actions/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT action_type, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY action_type"
        ) ?? [];

        $openRecalls = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE action_type = 'recall' AND status NOT IN ('closed')"
        ) ?? 0);

        $launchedCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status IN ('launched', 'notifications_sent', 'effectiveness_review')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'      => $byStatus,
                'by_type'        => $byType,
                'open_recalls'   => $openRecalls,
                'launched_count' => $launchedCount,
            ],
        ]);
    }

    /** POST /eqms/field-actions/lookup */
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
            "SELECT field_action_id, field_action_number, action_type, classification, status
             FROM " . self::TABLE . " WHERE field_action_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    /** POST /eqms/field-actions — Create a new field action in draft state. */
    public function create(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());

        $faId     = $this->newUuid();
        $faNumber = 'FA-' . strtoupper(substr($faId, 0, 8));
        $now      = $this->nowIso();
        $actor    = (string)($user['username'] ?? 'unknown');

        $body = $this->jsonBody();

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (field_action_id, field_action_number, action_type, classification,
              affected_products, affected_lot_ids, customer_notification_list,
              evaluation_summary, action_plan,
              launch_date, regulatory_notification_date,
              effectiveness_criteria, effectiveness_result,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, NULL, NULL,
              '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
              NULL, NULL,
              NULL, NULL,
              NULL, NULL,
              'draft', 1, :now, :by)",
            [':id' => $faId, ':num' => $faNumber, ':now' => $now, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.field_action.created', self::ENTITY_TYPE, $faId, [
            'field_action_number' => $faNumber,
        ], $user);

        $this->success(['field_action' => $this->loadFieldAction($faId)], 201);
    }

    /** GET /eqms/field-actions/{id} */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->success(['field_action' => $this->loadFieldAction($faId)]);
    }

    /** PATCH /eqms/field-actions/{id} */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);
        $this->requireVersionMatch((int)$fa['version'], $faId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $faId, ':ver' => ((int)$fa['version']) + 1];
        $updatable = ['regulatory_notification_date', 'effectiveness_criteria'];

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
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE field_action_id = :id AND version = " . (int)$fa['version'],
            $params
        );

        $this->success(['field_action' => $this->loadFieldAction($faId)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $faId);
    }

    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveComments(self::ENTITY_TYPE, $faId, $user);
    }

    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveAttachments(self::ENTITY_TYPE, $faId, $user);
    }

    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveRelationships(self::ENTITY_TYPE, $faId, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveRelationships(self::ENTITY_TYPE, $faId, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveRelationships(self::ENTITY_TYPE, $faId, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);
        $this->serveAvailableActions((string)$fa['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveSignatures(self::ENTITY_TYPE, $faId, $user);
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $this->loadFieldAction($faId);
        $this->serveExport(self::MODULE, $faId, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /** POST /eqms/field-actions/{id}/actions/evaluate */
    public function actionEvaluate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);

        $this->requireValidTransition((string)$fa['status'], 'evaluate', self::STATE_MACHINE, $faId);
        $this->requireVersionMatch((int)$fa['version'], $faId);

        $body              = $this->jsonBody();
        $evaluationSummary = trim((string)($body['evaluation_summary'] ?? ''));
        $actionType        = trim((string)($body['action_type'] ?? ''));
        $classification    = trim((string)($body['classification'] ?? ''));
        $affectedProducts  = is_array($body['affected_products'] ?? null) ? $body['affected_products'] : [];

        if ($evaluationSummary === '') {
            $this->error('evaluation_summary_required', 400);
        }
        if ($actionType !== '' && !in_array($actionType, ['recall', 'field_safety_notice', 'advisory', 'investigation'], true)) {
            $this->error('invalid_action_type', 400,
                "'action_type' must be recall, field_safety_notice, advisory, or investigation.");
        }
        if ($classification !== '' && !in_array($classification, ['voluntary', 'mandatory'], true)) {
            $this->error('invalid_classification', 400, "'classification' must be voluntary or mandatory.");
        }

        $sets   = ["evaluation_summary = :eval", "status = 'under_evaluation'", "version = :ver"];
        $params = [
            ':eval'   => $evaluationSummary,
            ':ver'    => ((int)$fa['version']) + 1,
            ':id'     => $faId,
            ':oldver' => (int)$fa['version'],
        ];

        if ($actionType !== '') {
            $sets[]          = 'action_type = :atype';
            $params[':atype'] = $actionType;
        }
        if ($classification !== '') {
            $sets[]              = 'classification = :class';
            $params[':class']     = $classification;
        }
        if (!empty($affectedProducts)) {
            $sets[]              = 'affected_products = :ap::jsonb';
            $params[':ap']        = json_encode($affectedProducts);
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE field_action_id = :id AND version = :oldver",
            $params
        );

        $this->emitQualityEvent('eqms.field_action.evaluated', self::ENTITY_TYPE, $faId, [
            'action_type'    => $actionType,
            'classification' => $classification,
        ], $user);

        $this->success(['field_action' => $this->loadFieldAction($faId)]);
    }

    /** POST /eqms/field-actions/{id}/actions/plan */
    public function actionPlan(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);

        $this->requireValidTransition((string)$fa['status'], 'plan', self::STATE_MACHINE, $faId);
        $this->requireVersionMatch((int)$fa['version'], $faId);

        $body                = $this->jsonBody();
        $actionPlan          = trim((string)($body['action_plan'] ?? ''));
        $effectivenessCriteria = trim((string)($body['effectiveness_criteria'] ?? ''));

        if ($actionPlan === '') {
            $this->error('action_plan_required', 400);
        }

        $newVer = ((int)$fa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET action_plan = :plan,
                 effectiveness_criteria = COALESCE(:ec, effectiveness_criteria),
                 status = 'planned', version = :ver
             WHERE field_action_id = :id AND version = :oldver",
            [
                ':plan'   => $actionPlan,
                ':ec'     => $effectivenessCriteria !== '' ? $effectivenessCriteria : null,
                ':ver'    => $newVer,
                ':id'     => $faId,
                ':oldver' => (int)$fa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.field_action.planned', self::ENTITY_TYPE, $faId, [], $user);
        $this->success(['field_action' => $this->loadFieldAction($faId)]);
    }

    /**
     * POST /eqms/field-actions/{id}/actions/launch
     * REQUIRES electronic signature. Triggers official recall / field action.
     * Emits urgent quality event.
     */
    public function actionLaunch(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);

        $this->requireValidTransition((string)$fa['status'], 'launch', self::STATE_MACHINE, $faId);
        $this->requireVersionMatch((int)$fa['version'], $faId);
        $this->requireElectronicSignature($user, 'launch', $faId);

        $actor  = (string)($user['username'] ?? 'unknown');
        $now    = $this->nowIso();
        $newVer = ((int)$fa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET launch_date = :date, status = 'launched', version = :ver
             WHERE field_action_id = :id AND version = :oldver",
            [':date' => $now, ':ver' => $newVer, ':id' => $faId, ':oldver' => (int)$fa['version']]
        );

        // Emit URGENT quality event — recall notifications require immediate attention
        $this->emitQualityEvent('eqms.field_action.launched', self::ENTITY_TYPE, $faId, [
            'action_type'    => $fa['action_type'],
            'classification' => $fa['classification'],
            'launched_by'    => $actor,
            'launch_date'    => $now,
            'urgency'        => 'CRITICAL',
        ], $user);

        $this->success(['field_action' => $this->loadFieldAction($faId)]);
    }

    /** POST /eqms/field-actions/{id}/actions/notify-customers */
    public function actionNotifyCustomers(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);

        $this->requireValidTransition((string)$fa['status'], 'notify-customers', self::STATE_MACHINE, $faId);
        $this->requireVersionMatch((int)$fa['version'], $faId);

        $body                = $this->jsonBody();
        $notificationMethod  = trim((string)($body['notification_method'] ?? ''));
        $notificationContent = trim((string)($body['notification_content'] ?? ''));

        if ($notificationMethod === '') {
            $this->error('notification_method_required', 400);
        }

        $notificationEntry = [
            'method'         => $notificationMethod,
            'content'        => $notificationContent,
            'sent_at'        => $this->nowIso(),
            'sent_by'        => (string)($user['username'] ?? 'unknown'),
        ];

        // Append to customer_notification_list jsonb
        $existingList = is_string($fa['customer_notification_list'])
            ? json_decode($fa['customer_notification_list'], true)
            : ($fa['customer_notification_list'] ?? []);
        if (!is_array($existingList)) {
            $existingList = [];
        }
        $existingList[] = $notificationEntry;

        $newVer = ((int)$fa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET customer_notification_list = :list::jsonb,
                 status = 'notifications_sent', version = :ver
             WHERE field_action_id = :id AND version = :oldver",
            [
                ':list'   => json_encode($existingList),
                ':ver'    => $newVer,
                ':id'     => $faId,
                ':oldver' => (int)$fa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.field_action.customers_notified', self::ENTITY_TYPE, $faId, [
            'notification_method' => $notificationMethod,
        ], $user);

        $this->success(['field_action' => $this->loadFieldAction($faId), 'notification' => $notificationEntry]);
    }

    /** POST /eqms/field-actions/{id}/actions/record-effectiveness */
    public function actionRecordEffectiveness(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->fieldActionWriteRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);

        $this->requireValidTransition((string)$fa['status'], 'record-effectiveness', self::STATE_MACHINE, $faId);
        $this->requireVersionMatch((int)$fa['version'], $faId);

        $body                = $this->jsonBody();
        $effectivenessResult = trim((string)($body['effectiveness_result'] ?? ''));
        $evidenceRef         = trim((string)($body['evidence_ref'] ?? ''));

        if ($effectivenessResult === '') {
            $this->error('effectiveness_result_required', 400);
        }

        $newVer = ((int)$fa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET effectiveness_result = :result,
                 status = 'effectiveness_review', version = :ver
             WHERE field_action_id = :id AND version = :oldver",
            [
                ':result' => $effectivenessResult,
                ':ver'    => $newVer,
                ':id'     => $faId,
                ':oldver' => (int)$fa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.field_action.effectiveness_recorded', self::ENTITY_TYPE, $faId, [
            'effectiveness_result' => $effectivenessResult,
            'evidence_ref'         => $evidenceRef,
        ], $user);

        $this->success(['field_action' => $this->loadFieldAction($faId)]);
    }

    /**
     * POST /eqms/field-actions/{id}/actions/close
     * REQUIRES electronic signature.
     */
    public function actionClose(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsCloseRoles());
        $faId = $this->requirePathId('id', 'field_action_id');
        $fa   = $this->loadFieldAction($faId);

        $this->requireValidTransition((string)$fa['status'], 'close', self::STATE_MACHINE, $faId);
        $this->requireVersionMatch((int)$fa['version'], $faId);
        $this->requireElectronicSignature($user, 'close', $faId);

        $body              = $this->jsonBody();
        $closureRationale  = trim((string)($body['closure_rationale'] ?? ''));
        if ($closureRationale === '') {
            $this->error('closure_rationale_required', 400);
        }

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$fa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET closed_by = :by, closed_at = now(),
                 status = 'closed', version = :ver
             WHERE field_action_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $faId, ':oldver' => (int)$fa['version']]
        );

        $this->emitQualityEvent('eqms.field_action.closed', self::ENTITY_TYPE, $faId, [
            'closed_by'         => $actor,
            'closure_rationale' => $closureRationale,
        ], $user);

        $this->success(['field_action' => $this->loadFieldAction($faId)]);
    }
}
