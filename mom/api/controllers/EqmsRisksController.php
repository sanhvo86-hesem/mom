<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Risks Controller — Risk Register + FMEA lifecycle.
 *
 * Sub-module 1: Risk Register
 *   State machine:
 *     identified  → assess
 *     assessed    → add-control, accept-residual-risk, review
 *     controlled  → verify-control, review
 *     verification→ verify-control
 *     accepted    → review
 *     closed      → review
 *
 * Sub-module 2: FMEA (Failure Mode & Effects Analysis)
 *   Exposes existing fmea_records / failure_modes tables on the EQMS surface.
 *
 * Electronic Signature:
 *   accept-residual-risk with residual_risk_score >= 12 REQUIRES QM signature.
 *   fmea approve REQUIRES signature.
 *
 * Standards: ISO 14971, IATF 16949 §9.1.3, AS9100D §6.1
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsRisksController extends EqmsBaseController
{
    // ── Risk Register constants ───────────────────────────────────────────────

    private const ENTITY_TYPE = 'risk';
    private const MODULE      = 'risk';
    private const TABLE       = 'eqms_risk_register';
    protected const PK          = 'risk_id';

    private const STATE_MACHINE = [
        'identified'   => ['assess'],
        'assessed'     => ['add-control', 'accept-residual-risk', 'review'],
        'controlled'   => ['verify-control', 'review'],
        'verification' => ['verify-control'],
        'accepted'     => ['review'],
        'closed'       => ['review'],
    ];

    private function riskWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'process_engineer', 'risk_manager',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadRisk(string $riskId): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE risk_id = :id LIMIT 1",
            [':id' => $riskId]
        );
        if (empty($row)) {
            $this->error('risk_not_found', 404, "Risk '{$riskId}' not found.");
        }
        return $row[0];
    }

    // ── Risk Register: Query & Metrics ────────────────────────────────────────

    /**
     * POST /eqms/risks/query — Paginated risk register list.
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(risk_number ILIKE :search OR risk_title ILIKE :search OR risk_description ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'risk_category'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        if (!empty($q['filters']['min_score'])) {
            $conditions[] = "risk_score >= :min_score";
            $params[':min_score'] = (int)$q['filters']['min_score'];
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], ['risk_number', 'risk_title', 'risk_score', 'status', 'review_due', 'created_at'], true)
                   ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT risk_id, risk_number, risk_title, risk_category, likelihood, severity,
                    risk_score, residual_risk_score, status, review_due, version, created_at, created_by
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

        $this->paginated('risks', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/risks/metrics — Aggregate risk KPIs.
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byCategory = $this->data->query(
            "SELECT risk_category, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY risk_category ORDER BY risk_category"
        ) ?? [];

        $scoreDistribution = $this->data->query(
            "SELECT
                CASE WHEN risk_score <= 4 THEN 'low'
                     WHEN risk_score <= 9 THEN 'medium'
                     WHEN risk_score <= 16 THEN 'high'
                     ELSE 'critical' END AS level,
                COUNT(*) AS count
             FROM " . self::TABLE . "
             WHERE status NOT IN ('closed')
             GROUP BY 1 ORDER BY 1"
        ) ?? [];

        $overdueReviews = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE review_due < NOW() AND status NOT IN ('closed')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'          => $byStatus,
                'by_category'        => $byCategory,
                'score_distribution' => $scoreDistribution,
                'overdue_reviews'    => $overdueReviews,
            ],
        ]);
    }

    /**
     * POST /eqms/risks/lookup — Lightweight ID→number lookup.
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
            "SELECT risk_id, risk_number, risk_title, risk_score, status
             FROM " . self::TABLE . " WHERE risk_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    /**
     * GET /eqms/risks/heatmap — Aggregate risk heatmap data by category/score.
     */
    public function heatmap(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $cells = $this->data->query(
            "SELECT likelihood, severity, risk_category, COUNT(*) AS count,
                    AVG(risk_score) AS avg_score
             FROM " . self::TABLE . "
             WHERE status NOT IN ('closed')
             GROUP BY likelihood, severity, risk_category
             ORDER BY likelihood, severity"
        ) ?? [];

        $summary = $this->data->query(
            "SELECT
                COUNT(*) FILTER (WHERE risk_score <= 4)  AS low_count,
                COUNT(*) FILTER (WHERE risk_score BETWEEN 5 AND 9)  AS medium_count,
                COUNT(*) FILTER (WHERE risk_score BETWEEN 10 AND 16) AS high_count,
                COUNT(*) FILTER (WHERE risk_score > 16) AS critical_count
             FROM " . self::TABLE . " WHERE status NOT IN ('closed')"
        );

        $this->success([
            'heatmap' => $cells,
            'summary' => $summary[0] ?? [],
        ]);
    }

    // ── Risk Register: CRUD ───────────────────────────────────────────────────

    /**
     * POST /eqms/risks — Create a new risk in identified state.
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());

        $body     = $this->jsonBody();
        $title    = trim((string)($body['risk_title'] ?? ''));
        $category = trim((string)($body['risk_category'] ?? ''));

        if ($title === '') {
            $this->error('risk_title_required', 400, "'risk_title' is required.");
        }
        if (!in_array($category, ['product', 'process', 'supplier', 'regulatory', 'system'], true)) {
            $this->error('invalid_risk_category', 400,
                "'risk_category' must be one of: product, process, supplier, regulatory, system.");
        }

        $riskId     = $this->newUuid();
        $riskNumber = 'RISK-' . strtoupper(substr($riskId, 0, 8));
        $now        = $this->nowIso();
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (risk_id, risk_number, risk_title, risk_description, risk_category,
              likelihood, severity, risk_score, residual_risk_score, controls,
              review_due, status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :cat,
              NULL, NULL, NULL, NULL, '[]'::jsonb,
              :review_due, 'identified', 1, :now, :by)",
            [
                ':id'         => $riskId,
                ':num'        => $riskNumber,
                ':title'      => $title,
                ':desc'       => trim((string)($body['risk_description'] ?? '')),
                ':cat'        => $category,
                ':review_due' => $body['review_due'] ?? null,
                ':now'        => $now,
                ':by'         => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.risk.created', self::ENTITY_TYPE, $riskId, [
            'risk_number' => $riskNumber,
            'risk_category' => $category,
        ], $user);

        $risk = $this->loadRisk($riskId);
        $this->success(['risk' => $risk], 201);
    }

    /**
     * GET /eqms/risks/{id} — Full risk detail.
     */
    public function detail(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);
        $this->success(['risk' => $risk]);
    }

    /**
     * PATCH /eqms/risks/{id} — Update mutable risk fields.
     */
    public function update(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);
        $this->requireVersionMatch((int)$risk['version'], $riskId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $riskId, ':ver' => ((int)$risk['version']) + 1];
        $updatable = ['risk_title', 'risk_description', 'risk_category', 'review_due'];

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
            " WHERE risk_id = :id AND version = " . (int)$risk['version'],
            $params
        );

        $this->emitQualityEvent('eqms.risk.updated', self::ENTITY_TYPE, $riskId, [], $user);
        $this->success(['risk' => $this->loadRisk($riskId)]);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /eqms/risks/{id}/audit */
    public function audit(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $this->loadRisk($riskId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $riskId);
    }

    /** GET|POST /eqms/risks/{id}/comments */
    public function comments(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $this->loadRisk($riskId);
        $this->serveComments(self::ENTITY_TYPE, $riskId, $user);
    }

    /** GET /eqms/risks/{id}/available-actions */
    public function availableActions(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);
        $this->serveAvailableActions((string)$risk['status'], self::STATE_MACHINE);
    }

    /** GET|POST /eqms/risks/{id}/signatures */
    public function signatures(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $this->loadRisk($riskId);
        $this->serveSignatures(self::ENTITY_TYPE, $riskId, $user);
    }

    /** POST /eqms/risks/{id}/export */
    public function export(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $this->loadRisk($riskId);
        $this->serveExport(self::MODULE, $riskId, $user);
    }

    /** POST /eqms/risks/export-bulk */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions: Risk Register ─────────────────────────────────

    /**
     * POST /eqms/risks/{id}/actions/assess
     * Assess a risk by setting likelihood and severity.
     * Calculates risk_score = likelihood * severity.
     */
    public function actionAssess(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);

        $this->requireValidTransition((string)$risk['status'], 'assess', self::STATE_MACHINE, $riskId);
        $this->requireVersionMatch((int)$risk['version'], $riskId);

        $body       = $this->jsonBody();
        $likelihood = isset($body['likelihood']) ? (int)$body['likelihood'] : 0;
        $severity   = isset($body['severity'])   ? (int)$body['severity']   : 0;

        if ($likelihood < 1 || $likelihood > 5) {
            $this->error('invalid_likelihood', 400, "'likelihood' must be an integer between 1 and 5.");
        }
        if ($severity < 1 || $severity > 5) {
            $this->error('invalid_severity', 400, "'severity' must be an integer between 1 and 5.");
        }

        $riskScore  = $likelihood * $severity;
        $newVersion = ((int)$risk['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET likelihood = :l, severity = :s, risk_score = :score,
                 status = 'assessed', version = :ver
             WHERE risk_id = :id AND version = :oldver",
            [
                ':l'      => $likelihood,
                ':s'      => $severity,
                ':score'  => $riskScore,
                ':ver'    => $newVersion,
                ':id'     => $riskId,
                ':oldver' => (int)$risk['version'],
            ]
        );

        $this->emitQualityEvent('eqms.risk.assessed', self::ENTITY_TYPE, $riskId, [
            'likelihood' => $likelihood,
            'severity'   => $severity,
            'risk_score' => $riskScore,
        ], $user);

        $this->success(['risk' => $this->loadRisk($riskId)]);
    }

    /**
     * POST /eqms/risks/{id}/actions/add-control
     * Append a control to the controls jsonb array. Transitions to 'controlled'.
     */
    public function actionAddControl(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);

        $this->requireValidTransition((string)$risk['status'], 'add-control', self::STATE_MACHINE, $riskId);
        $this->requireVersionMatch((int)$risk['version'], $riskId);

        $body             = $this->jsonBody();
        $controlDesc      = trim((string)($body['control_description'] ?? ''));
        $controlType      = trim((string)($body['control_type'] ?? ''));
        $responsible      = trim((string)($body['responsible'] ?? ''));
        $dueDate          = $body['due_date'] ?? null;

        if ($controlDesc === '') {
            $this->error('control_description_required', 400);
        }
        if (!in_array($controlType, ['preventive', 'detective', 'corrective'], true)) {
            $this->error('invalid_control_type', 400, "'control_type' must be preventive, detective, or corrective.");
        }

        $control = [
            'control_id'          => $this->newUuid(),
            'control_description' => $controlDesc,
            'control_type'        => $controlType,
            'responsible'         => $responsible,
            'due_date'            => $dueDate,
            'verified'            => false,
            'added_at'            => $this->nowIso(),
            'added_by'            => (string)($user['username'] ?? 'unknown'),
        ];

        $newVersion = ((int)$risk['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET controls = controls || :ctrl::jsonb,
                 status = 'controlled', version = :ver
             WHERE risk_id = :id AND version = :oldver",
            [
                ':ctrl'   => json_encode($control),
                ':ver'    => $newVersion,
                ':id'     => $riskId,
                ':oldver' => (int)$risk['version'],
            ]
        );

        $this->emitQualityEvent('eqms.risk.control_added', self::ENTITY_TYPE, $riskId, [
            'control_id'   => $control['control_id'],
            'control_type' => $controlType,
        ], $user);

        $this->success(['risk' => $this->loadRisk($riskId), 'control' => $control]);
    }

    /**
     * POST /eqms/risks/{id}/actions/verify-control
     * Verify effectiveness of a specific control.
     */
    public function actionVerifyControl(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);

        $this->requireValidTransition((string)$risk['status'], 'verify-control', self::STATE_MACHINE, $riskId);
        $this->requireVersionMatch((int)$risk['version'], $riskId);

        $body               = $this->jsonBody();
        $controlId          = trim((string)($body['control_id'] ?? ''));
        $verificationEvidence = trim((string)($body['verification_evidence'] ?? ''));
        $effective          = isset($body['effective']) ? (bool)$body['effective'] : null;

        if ($controlId === '') {
            $this->error('control_id_required', 400);
        }
        if ($verificationEvidence === '') {
            $this->error('verification_evidence_required', 400);
        }
        if ($effective === null) {
            $this->error('effective_required', 400, "'effective' (bool) is required.");
        }

        $newVersion = ((int)$risk['version']) + 1;
        $actor      = (string)($user['username'] ?? 'unknown');

        // Update the specific control in the jsonb array
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET controls = (
                 SELECT jsonb_agg(
                     CASE WHEN c->>'control_id' = :cid
                          THEN c || jsonb_build_object(
                              'verified', :effective::bool,
                              'verification_evidence', :evidence,
                              'verified_by', :by,
                              'verified_at', :now
                          )
                          ELSE c
                     END
                 ) FROM jsonb_array_elements(controls) AS c
             ),
             control_verification_evidence = :evidence,
             status = 'verification', version = :ver
             WHERE risk_id = :id AND version = :oldver",
            [
                ':cid'      => $controlId,
                ':effective' => $effective ? 'true' : 'false',
                ':evidence' => $verificationEvidence,
                ':by'       => $actor,
                ':now'      => $this->nowIso(),
                ':ver'      => $newVersion,
                ':id'       => $riskId,
                ':oldver'   => (int)$risk['version'],
            ]
        );

        $this->emitQualityEvent('eqms.risk.control_verified', self::ENTITY_TYPE, $riskId, [
            'control_id' => $controlId,
            'effective'  => $effective,
        ], $user);

        $this->success(['risk' => $this->loadRisk($riskId)]);
    }

    /**
     * POST /eqms/risks/{id}/actions/accept-residual-risk
     * Accept the residual risk. Requires QM signature if residual_risk_score >= 12.
     */
    public function actionAcceptResidualRisk(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);

        $this->requireValidTransition((string)$risk['status'], 'accept-residual-risk', self::STATE_MACHINE, $riskId);
        $this->requireVersionMatch((int)$risk['version'], $riskId);

        $body                 = $this->jsonBody();
        $acceptanceRationale  = trim((string)($body['acceptance_rationale'] ?? ''));
        $residualRiskScore    = isset($body['residual_risk_score']) ? (int)$body['residual_risk_score'] : 0;

        if ($acceptanceRationale === '') {
            $this->error('acceptance_rationale_required', 400);
        }
        if ($residualRiskScore < 1 || $residualRiskScore > 25) {
            $this->error('invalid_residual_risk_score', 400, "'residual_risk_score' must be between 1 and 25.");
        }

        // High/critical residual risk (>=12) requires quality manager signature
        if ($residualRiskScore >= 12) {
            $qmRoles = ['quality_manager', 'qa_manager'];
            $userRoles = (array)($user['roles'] ?? []);
            $hasQmRole = false;
            foreach ($qmRoles as $r) {
                if (in_array($r, $userRoles, true)) {
                    $hasQmRole = true;
                    break;
                }
            }
            if (!$hasQmRole) {
                $this->error('qm_role_required', 403,
                    "Residual risk score >= 12 (high/critical) requires a quality_manager or qa_manager role.");
            }
            $this->requireElectronicSignature($user, 'accept-residual-risk', $riskId);
        }

        $newVersion = ((int)$risk['version']) + 1;
        $actor      = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET residual_risk_score = :rrs, acceptance_rationale = :rationale,
                 accepted_by = :by, accepted_at = now(),
                 status = 'accepted', version = :ver
             WHERE risk_id = :id AND version = :oldver",
            [
                ':rrs'      => $residualRiskScore,
                ':rationale' => $acceptanceRationale,
                ':by'       => $actor,
                ':ver'      => $newVersion,
                ':id'       => $riskId,
                ':oldver'   => (int)$risk['version'],
            ]
        );

        $this->emitQualityEvent('eqms.risk.residual_risk_accepted', self::ENTITY_TYPE, $riskId, [
            'residual_risk_score' => $residualRiskScore,
            'accepted_by'         => $actor,
        ], $user);

        $this->success(['risk' => $this->loadRisk($riskId)]);
    }

    /**
     * POST /eqms/risks/{id}/actions/review
     * Record a periodic risk review.
     */
    public function actionReview(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);

        $this->requireValidTransition((string)$risk['status'], 'review', self::STATE_MACHINE, $riskId);
        $this->requireVersionMatch((int)$risk['version'], $riskId);

        $body           = $this->jsonBody();
        $reviewNotes    = trim((string)($body['review_notes'] ?? ''));
        $nextReviewDue  = $body['next_review_due'] ?? null;

        if ($reviewNotes === '') {
            $this->error('review_notes_required', 400);
        }

        $newVersion = ((int)$risk['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET review_due = :next, version = :ver
             WHERE risk_id = :id AND version = :oldver",
            [
                ':next'   => $nextReviewDue,
                ':ver'    => $newVersion,
                ':id'     => $riskId,
                ':oldver' => (int)$risk['version'],
            ]
        );

        $this->emitQualityEvent('eqms.risk.reviewed', self::ENTITY_TYPE, $riskId, [
            'review_notes'  => $reviewNotes,
            'next_review_due' => $nextReviewDue,
        ], $user);

        $this->success(['risk' => $this->loadRisk($riskId)]);
    }

    // ── FMEA Sub-Module ───────────────────────────────────────────────────────

    private const FMEA_TABLE  = 'fmea_records';
    private const FMEA_ENTITY = 'fmea';
    private const FMEA_MODULE = 'fmea';

    private function loadFmea(string $fmeaId): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::FMEA_TABLE . " WHERE fmea_id = :id LIMIT 1",
            [':id' => $fmeaId]
        );
        if (empty($row)) {
            $this->error('fmea_not_found', 404, "FMEA '{$fmeaId}' not found.");
        }
        return $row[0];
    }

    /**
     * POST /eqms/fmea/query — Paginated FMEA list.
     */
    public function fmeaQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(fmea_number ILIKE :search OR title ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'fmea_type'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where = implode(' AND ', $conditions);

        $items = $this->data->query(
            "SELECT fmea_id, fmea_number, title, fmea_type, status, version, created_at
             FROM " . self::FMEA_TABLE . "
             WHERE {$where}
             ORDER BY created_at DESC
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::FMEA_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('fmea_records', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/fmea/metrics — FMEA KPIs.
     */
    public function fmeaMetrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::FMEA_TABLE . " GROUP BY status"
        ) ?? [];
        $byType = $this->data->query(
            "SELECT fmea_type, COUNT(*) AS count FROM " . self::FMEA_TABLE . " GROUP BY fmea_type"
        ) ?? [];

        $this->success(['metrics' => ['by_status' => $byStatus, 'by_type' => $byType]]);
    }

    /**
     * POST /eqms/fmea — Create a new FMEA record.
     */
    public function fmeaCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());

        $body      = $this->jsonBody();
        $title     = trim((string)($body['title'] ?? ''));
        $fmeaType  = trim((string)($body['fmea_type'] ?? ''));

        if ($title === '') {
            $this->error('fmea_title_required', 400);
        }
        if (!in_array($fmeaType, ['design', 'process', 'system', 'msf', 'supplemental'], true)) {
            $this->error('invalid_fmea_type', 400,
                "'fmea_type' must be one of: design, process, system, msf, supplemental.");
        }

        $fmeaId     = $this->newUuid();
        $fmeaNumber = 'FMEA-' . strtoupper(substr($fmeaId, 0, 8));
        $now        = $this->nowIso();
        $actor      = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::FMEA_TABLE . "
             (fmea_id, fmea_number, title, fmea_type, description, scope,
              status, version, created_at, created_by)
             VALUES (:id, :num, :title, :type, :desc, :scope, 'draft', 1, :now, :by)",
            [
                ':id'    => $fmeaId,
                ':num'   => $fmeaNumber,
                ':title' => $title,
                ':type'  => $fmeaType,
                ':desc'  => trim((string)($body['description'] ?? '')),
                ':scope' => trim((string)($body['scope'] ?? '')),
                ':now'   => $now,
                ':by'    => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.fmea.created', self::FMEA_ENTITY, $fmeaId, [
            'fmea_number' => $fmeaNumber,
            'fmea_type'   => $fmeaType,
        ], $user);

        $this->success(['fmea' => $this->loadFmea($fmeaId)], 201);
    }

    /**
     * GET /eqms/fmea/{id} — Full FMEA with failure modes.
     */
    public function fmeaDetail(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $fmeaId = $this->requirePathId('id', 'fmea_id');
        $fmea   = $this->loadFmea($fmeaId);

        // Load failure modes
        $failureModes = $this->data->query(
            "SELECT * FROM failure_modes WHERE fmea_id = :id ORDER BY item_function, failure_mode",
            [':id' => $fmeaId]
        ) ?? [];

        $this->success(['fmea' => $fmea, 'failure_modes' => $failureModes]);
    }

    /**
     * PATCH /eqms/fmea/{id} — Update FMEA record.
     */
    public function fmeaUpdate(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $fmeaId = $this->requirePathId('id', 'fmea_id');
        $fmea   = $this->loadFmea($fmeaId);
        $this->requireVersionMatch((int)$fmea['version'], $fmeaId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $fmeaId, ':ver' => ((int)$fmea['version']) + 1];
        $updatable = ['title', 'description', 'scope'];

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
            "UPDATE " . self::FMEA_TABLE . " SET " . implode(', ', $sets) .
            " WHERE fmea_id = :id AND version = " . (int)$fmea['version'],
            $params
        );

        $this->success(['fmea' => $this->loadFmea($fmeaId)]);
    }

    /** GET /eqms/fmea/{id}/audit */
    public function fmeaAudit(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $fmeaId = $this->requirePathId('id', 'fmea_id');
        $this->loadFmea($fmeaId);
        $this->serveAuditTrail(self::FMEA_ENTITY, $fmeaId);
    }

    /** GET|POST /eqms/fmea/{id}/signatures */
    public function fmeaSignatures(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $fmeaId = $this->requirePathId('id', 'fmea_id');
        $this->loadFmea($fmeaId);
        $this->serveSignatures(self::FMEA_ENTITY, $fmeaId, $user);
    }

    /** POST /eqms/fmea/{id}/export */
    public function fmeaExport(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $fmeaId = $this->requirePathId('id', 'fmea_id');
        $this->loadFmea($fmeaId);
        $this->serveExport(self::FMEA_MODULE, $fmeaId, $user);
    }

    /** POST /eqms/fmea/export-bulk */
    public function fmeaExportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::FMEA_MODULE, 'bulk', $user);
    }

    /**
     * POST /eqms/fmea/{id}/actions/recalculate-rpn
     * Recompute RPN (Risk Priority Number) for all failure modes of this FMEA.
     * RPN = Severity * Occurrence * Detection
     */
    public function fmeaActionRecalculateRpn(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->riskWriteRoles());
        $fmeaId = $this->requirePathId('id', 'fmea_id');
        $this->loadFmea($fmeaId);

        try {
            // Update RPN for all failure modes; columns may vary by schema version
            $this->data->execute(
                "UPDATE failure_modes
                 SET rpn = COALESCE(severity, 1) * COALESCE(occurrence, 1) * COALESCE(detection, 1),
                     updated_at = now()
                 WHERE fmea_id = :id",
                [':id' => $fmeaId]
            );
        } catch (\Throwable $e) {
            $this->error('rpn_recalculate_failed', 500, "RPN recalculation failed: " . $e->getMessage());
        }

        $failureModes = $this->data->query(
            "SELECT failure_mode_id, failure_mode, severity, occurrence, detection, rpn
             FROM failure_modes WHERE fmea_id = :id ORDER BY rpn DESC",
            [':id' => $fmeaId]
        ) ?? [];

        $this->emitQualityEvent('eqms.fmea.rpn_recalculated', self::FMEA_ENTITY, $fmeaId, [
            'modes_updated' => count($failureModes),
        ], $user);

        $this->success(['failure_modes' => $failureModes, 'recalculated' => true]);
    }

    /**
     * POST /eqms/fmea/{id}/actions/approve
     * Approve a FMEA record. REQUIRES electronic signature.
     */
    public function fmeaActionApprove(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $fmeaId = $this->requirePathId('id', 'fmea_id');
        $fmea   = $this->loadFmea($fmeaId);

        $this->requireVersionMatch((int)$fmea['version'], $fmeaId);
        $this->requireElectronicSignature($user, 'approve', $fmeaId);

        $actor      = (string)($user['username'] ?? 'unknown');
        $newVersion = ((int)$fmea['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::FMEA_TABLE . "
             SET status = 'approved', approved_by = :by, approved_at = now(), version = :ver
             WHERE fmea_id = :id AND version = :oldver",
            [
                ':by'     => $actor,
                ':ver'    => $newVersion,
                ':id'     => $fmeaId,
                ':oldver' => (int)$fmea['version'],
            ]
        );

        $this->emitQualityEvent('eqms.fmea.approved', self::FMEA_ENTITY, $fmeaId, [
            'approved_by' => $actor,
        ], $user);

        $this->success(['fmea' => $this->loadFmea($fmeaId)]);
    }

    // ── Cross-module Actions ──────────────────────────────────────────────────

    /**
     * POST /eqms/risks/{id}/actions/request-validation-scope-update
     * Flag this risk as requiring a validation scope update (GAMP 5 §5, FDA 21 CFR Part 11).
     * Creates a linked record in the validation management system or escalates existing FMEA.
     * Body requires: { scope_update_description }
     * Body optional: { validation_impact, assigned_to }
     */
    public function actionRequestValidationScopeUpdate(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsValidationRoles());

        $riskId = $this->requirePathId('id', 'risk_id');
        $risk   = $this->loadRisk($riskId);

        if (in_array($risk['status'], ['closed', 'mitigated', 'accepted'], true)) {
            // Allow requesting scope update even on mitigated risks — regulatory requirement
        }

        $body       = $this->jsonBody();
        $scopeDesc  = trim((string)($body['scope_update_description'] ?? ''));
        if ($scopeDesc === '') {
            $this->error('scope_update_description_required', 400,
                "'scope_update_description' is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        // Record the validation scope update request as a risk treatment note
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET mitigation_notes = COALESCE(mitigation_notes, '') || E'\n[VALIDATION SCOPE UPDATE REQUEST " . date('Y-m-d') . "] ' || :desc,
                 updated_at = now(), updated_by = :by
             WHERE risk_id = :id",
            [':desc' => $scopeDesc, ':by' => $actor, ':id' => $riskId]
        );

        // Emit event so validation management system can pick it up via outbox
        $this->emitQualityEvent('eqms.risk.validation_scope_update_requested', self::ENTITY_TYPE, $riskId, [
            'risk_number'              => $risk['risk_number'] ?? $riskId,
            'scope_update_description' => $scopeDesc,
            'validation_impact'        => $body['validation_impact'] ?? 'tbd',
            'requested_by'             => $actor,
        ], $user);

        $this->success([
            'risk'    => $this->loadRisk($riskId),
            'message' => 'Validation scope update request recorded and dispatched to validation management.',
        ]);
    }
}
