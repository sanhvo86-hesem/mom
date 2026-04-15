<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Lab Investigations Controller — OOS/OOT 2-phase investigation lifecycle.
 *
 * State machine:
 *   draft          → intake-oos, intake-oot
 *   phase1         → start-phase1, request-retest, request-resample
 *   phase1_complete→ start-phase2, close
 *   phase2         → link-capa, close
 *   closed         → (terminal)
 *
 * Electronic Signature: close REQUIRES signature.
 *
 * Standards: USP <1010>, FDA OOS Guidance (2006), ICH Q10
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsLabInvestigationsController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'lab_investigation';
    private const MODULE      = 'lab_investigation';
    private const TABLE       = 'eqms_lab_investigations';
    protected const PK          = 'investigation_id';

    private const STATE_MACHINE = [
        'draft'          => ['intake-oos', 'intake-oot'],
        'phase1'         => ['start-phase1', 'request-retest', 'request-resample'],
        'phase1_complete' => ['start-phase2', 'close'],
        'phase2'         => ['link-capa', 'close'],
        'closed'         => [],
    ];

    private function labWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_engineer', 'qa_manager', 'laboratory_analyst', 'qms_manager',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadInvestigation(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE investigation_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('investigation_not_found', 404, "Lab investigation '{$id}' not found.");
        }
        return $row[0];
    }

    // ── Query & Metrics ───────────────────────────────────────────────────────

    /** POST /eqms/lab-investigations/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(investigation_number ILIKE :search OR product_id::text ILIKE :search OR test_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'investigation_type', 'product_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['investigation_number', 'investigation_type', 'status', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT investigation_id, investigation_number, investigation_type, product_id,
                    lot_number, test_name, status, version, created_at, created_by
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

        $this->paginated('lab_investigations', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/lab-investigations/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT investigation_type, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY investigation_type"
        ) ?? [];

        $phase2Required = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE phase2_required = true AND status NOT IN ('closed')"
        ) ?? 0);

        $labErrorCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE lab_error_identified = true"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'        => $byStatus,
                'by_type'          => $byType,
                'phase2_required'  => $phase2Required,
                'lab_error_count'  => $labErrorCount,
            ],
        ]);
    }

    /** POST /eqms/lab-investigations/lookup */
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
            "SELECT investigation_id, investigation_number, investigation_type, status
             FROM " . self::TABLE . " WHERE investigation_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    /**
     * POST /eqms/lab-investigations — Create a new investigation in draft state.
     */
    public function create(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());

        $body  = $this->jsonBody();
        $invId = $this->newUuid();
        $invNumber = 'LAB-' . strtoupper(substr($invId, 0, 8));
        $now   = $this->nowIso();
        $actor = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (investigation_id, investigation_number, investigation_type,
              product_id, lot_number, test_name, specification, actual_result,
              lab_error_identified, phase1_conclusion, phase2_required,
              phase1_notes, phase2_notes, retest_results, resample_results,
              root_cause, capa_id, status, version, created_at, created_by)
             VALUES
             (:id, :num, NULL,
              NULL, NULL, NULL, NULL, NULL,
              NULL, NULL, false,
              NULL, NULL, '[]'::jsonb, '[]'::jsonb,
              NULL, NULL, 'draft', 1, :now, :by)",
            [':id' => $invId, ':num' => $invNumber, ':now' => $now, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.lab_investigation.created', self::ENTITY_TYPE, $invId, [
            'investigation_number' => $invNumber,
        ], $user);

        $this->success(['investigation' => $this->loadInvestigation($invId)], 201);
    }

    /** GET /eqms/lab-investigations/{id} */
    public function detail(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->success(['investigation' => $this->loadInvestigation($invId)]);
    }

    /** PATCH /eqms/lab-investigations/{id} */
    public function update(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $invId, ':ver' => ((int)$inv['version']) + 1];
        $updatable = ['product_id', 'lot_number', 'test_name', 'specification', 'actual_result', 'phase1_notes', 'phase2_notes'];

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
            " WHERE investigation_id = :id AND version = " . (int)$inv['version'],
            $params
        );

        $this->success(['investigation' => $this->loadInvestigation($invId)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $invId);
    }

    public function comments(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveComments(self::ENTITY_TYPE, $invId, $user);
    }

    public function attachments(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveAttachments(self::ENTITY_TYPE, $invId, $user);
    }

    public function relationships(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveRelationships(self::ENTITY_TYPE, $invId, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveRelationships(self::ENTITY_TYPE, $invId, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveRelationships(self::ENTITY_TYPE, $invId, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);
        $this->serveAvailableActions((string)$inv['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveSignatures(self::ENTITY_TYPE, $invId, $user);
    }

    public function export(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $this->loadInvestigation($invId);
        $this->serveExport(self::MODULE, $invId, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /**
     * POST /eqms/lab-investigations/{id}/actions/intake-oos
     * Intake an OOS result and begin Phase 1 investigation.
     */
    public function actionIntakeOos(): never
    {
        $this->performIntake('OOS');
    }

    /**
     * POST /eqms/lab-investigations/{id}/actions/intake-oot
     * Intake an OOT result and begin Phase 1 investigation.
     */
    public function actionIntakeOot(): never
    {
        $this->performIntake('OOT');
    }

    private function performIntake(string $type): never
    {
        $action = $type === 'OOS' ? 'intake-oos' : 'intake-oot';

        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);

        $this->requireValidTransition((string)$inv['status'], $action, self::STATE_MACHINE, $invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);

        $body          = $this->jsonBody();
        $productId     = trim((string)($body['product_id'] ?? ''));
        $lotNumber     = trim((string)($body['lot_number'] ?? ''));
        $testName      = trim((string)($body['test_name'] ?? ''));
        $specification = trim((string)($body['specification'] ?? ''));
        $actualResult  = trim((string)($body['actual_result'] ?? ''));

        if ($productId === '') {
            $this->error('product_id_required', 400);
        }
        if ($testName === '') {
            $this->error('test_name_required', 400);
        }

        $newVer = ((int)$inv['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET investigation_type = :type, product_id = :pid,
                 lot_number = :lot, test_name = :test,
                 specification = :spec, actual_result = :result,
                 status = 'phase1', version = :ver
             WHERE investigation_id = :id AND version = :oldver",
            [
                ':type'   => $type,
                ':pid'    => $productId,
                ':lot'    => $lotNumber,
                ':test'   => $testName,
                ':spec'   => $specification,
                ':result' => $actualResult,
                ':ver'    => $newVer,
                ':id'     => $invId,
                ':oldver' => (int)$inv['version'],
            ]
        );

        $this->emitQualityEvent("eqms.lab_investigation.{$type}_intake", self::ENTITY_TYPE, $invId, [
            'product_id' => $productId,
            'test_name'  => $testName,
            'type'       => $type,
        ], $user);

        $this->success(['investigation' => $this->loadInvestigation($invId)]);
    }

    /** POST /eqms/lab-investigations/{id}/actions/start-phase1 */
    public function actionStartPhase1(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);

        $this->requireValidTransition((string)$inv['status'], 'start-phase1', self::STATE_MACHINE, $invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);

        $body          = $this->jsonBody();
        $investigator  = trim((string)($body['investigator'] ?? ''));
        $phase1Scope   = trim((string)($body['phase1_scope'] ?? ''));

        if ($investigator === '') {
            $this->error('investigator_required', 400);
        }

        $newVer = ((int)$inv['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET phase1_notes = COALESCE(phase1_notes, '') || :scope, version = :ver
             WHERE investigation_id = :id AND version = :oldver",
            [
                ':scope'  => $phase1Scope,
                ':ver'    => $newVer,
                ':id'     => $invId,
                ':oldver' => (int)$inv['version'],
            ]
        );

        $this->emitQualityEvent('eqms.lab_investigation.phase1_started', self::ENTITY_TYPE, $invId, [
            'investigator' => $investigator,
        ], $user);

        $this->success(['investigation' => $this->loadInvestigation($invId)]);
    }

    /** POST /eqms/lab-investigations/{id}/actions/start-phase2 */
    public function actionStartPhase2(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);

        $this->requireValidTransition((string)$inv['status'], 'start-phase2', self::STATE_MACHINE, $invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);

        // Precondition: phase1_conclusion must be set
        if (empty($inv['phase1_conclusion'])) {
            $this->error('phase1_conclusion_required', 409,
                "Phase 1 conclusion must be set before starting Phase 2.");
        }

        $body                 = $this->jsonBody();
        $phase2Justification  = trim((string)($body['phase2_justification'] ?? ''));
        if ($phase2Justification === '') {
            $this->error('phase2_justification_required', 400);
        }

        $newVer = ((int)$inv['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET phase2_required = true, phase2_notes = :just,
                 status = 'phase2', version = :ver
             WHERE investigation_id = :id AND version = :oldver",
            [
                ':just'   => $phase2Justification,
                ':ver'    => $newVer,
                ':id'     => $invId,
                ':oldver' => (int)$inv['version'],
            ]
        );

        $this->emitQualityEvent('eqms.lab_investigation.phase2_started', self::ENTITY_TYPE, $invId, [], $user);
        $this->success(['investigation' => $this->loadInvestigation($invId)]);
    }

    /** POST /eqms/lab-investigations/{id}/actions/request-retest */
    public function actionRequestRetest(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);

        $this->requireValidTransition((string)$inv['status'], 'request-retest', self::STATE_MACHINE, $invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);

        $body                 = $this->jsonBody();
        $retestJustification  = trim((string)($body['retest_justification'] ?? ''));
        if ($retestJustification === '') {
            $this->error('retest_justification_required', 400);
        }

        $retestEntry = [
            'retest_id'      => $this->newUuid(),
            'justification'  => $retestJustification,
            'result'         => $body['result'] ?? null,
            'requested_at'   => $this->nowIso(),
            'requested_by'   => (string)($user['username'] ?? 'unknown'),
        ];

        $newVer = ((int)$inv['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET retest_results = retest_results || :entry::jsonb, version = :ver
             WHERE investigation_id = :id AND version = :oldver",
            [
                ':entry'  => json_encode($retestEntry),
                ':ver'    => $newVer,
                ':id'     => $invId,
                ':oldver' => (int)$inv['version'],
            ]
        );

        $this->emitQualityEvent('eqms.lab_investigation.retest_requested', self::ENTITY_TYPE, $invId, [
            'retest_id' => $retestEntry['retest_id'],
        ], $user);

        $this->success(['investigation' => $this->loadInvestigation($invId), 'retest' => $retestEntry]);
    }

    /** POST /eqms/lab-investigations/{id}/actions/request-resample */
    public function actionRequestResample(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);

        $this->requireValidTransition((string)$inv['status'], 'request-resample', self::STATE_MACHINE, $invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);

        $body                   = $this->jsonBody();
        $resampleJustification  = trim((string)($body['resample_justification'] ?? ''));
        if ($resampleJustification === '') {
            $this->error('resample_justification_required', 400);
        }

        $resampleEntry = [
            'resample_id'    => $this->newUuid(),
            'justification'  => $resampleJustification,
            'result'         => $body['result'] ?? null,
            'requested_at'   => $this->nowIso(),
            'requested_by'   => (string)($user['username'] ?? 'unknown'),
        ];

        $newVer = ((int)$inv['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET resample_results = resample_results || :entry::jsonb, version = :ver
             WHERE investigation_id = :id AND version = :oldver",
            [
                ':entry'  => json_encode($resampleEntry),
                ':ver'    => $newVer,
                ':id'     => $invId,
                ':oldver' => (int)$inv['version'],
            ]
        );

        $this->emitQualityEvent('eqms.lab_investigation.resample_requested', self::ENTITY_TYPE, $invId, [
            'resample_id' => $resampleEntry['resample_id'],
        ], $user);

        $this->success(['investigation' => $this->loadInvestigation($invId), 'resample' => $resampleEntry]);
    }

    /** POST /eqms/lab-investigations/{id}/actions/link-capa */
    public function actionLinkCapa(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->labWriteRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);

        $this->requireValidTransition((string)$inv['status'], 'link-capa', self::STATE_MACHINE, $invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);

        $body   = $this->jsonBody();
        $capaId = trim((string)($body['capa_id'] ?? ''));
        if ($capaId === '') {
            $this->error('capa_id_required', 400);
        }

        $newVer = ((int)$inv['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET capa_id = :capa, version = :ver
             WHERE investigation_id = :id AND version = :oldver",
            [':capa' => $capaId, ':ver' => $newVer, ':id' => $invId, ':oldver' => (int)$inv['version']]
        );

        $this->emitQualityEvent('eqms.lab_investigation.capa_linked', self::ENTITY_TYPE, $invId, [
            'capa_id' => $capaId,
        ], $user);

        $this->success(['investigation' => $this->loadInvestigation($invId)]);
    }

    /**
     * POST /eqms/lab-investigations/{id}/actions/close
     * REQUIRES electronic signature.
     */
    public function actionClose(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsCloseRoles());
        $invId = $this->requirePathId('id', 'investigation_id');
        $inv   = $this->loadInvestigation($invId);

        $this->requireValidTransition((string)$inv['status'], 'close', self::STATE_MACHINE, $invId);
        $this->requireVersionMatch((int)$inv['version'], $invId);
        $this->requireElectronicSignature($user, 'close', $invId);

        $body              = $this->jsonBody();
        $rootCause         = trim((string)($body['root_cause'] ?? ''));
        $labErrorIdentified = isset($body['lab_error_identified']) ? (bool)$body['lab_error_identified'] : null;
        $finalConclusion   = trim((string)($body['final_conclusion'] ?? ''));

        if ($rootCause === '') {
            $this->error('root_cause_required', 400);
        }
        if ($labErrorIdentified === null) {
            $this->error('lab_error_identified_required', 400, "'lab_error_identified' (bool) is required.");
        }
        if ($finalConclusion === '') {
            $this->error('final_conclusion_required', 400);
        }

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$inv['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET root_cause = :rc, lab_error_identified = :lei,
                 phase1_conclusion = COALESCE(phase1_conclusion, :conc),
                 closed_by = :by, closed_at = now(),
                 status = 'closed', version = :ver
             WHERE investigation_id = :id AND version = :oldver",
            [
                ':rc'    => $rootCause,
                ':lei'   => $labErrorIdentified ? 'true' : 'false',
                ':conc'  => $finalConclusion,
                ':by'    => $actor,
                ':ver'   => $newVer,
                ':id'    => $invId,
                ':oldver' => (int)$inv['version'],
            ]
        );

        $this->emitQualityEvent('eqms.lab_investigation.closed', self::ENTITY_TYPE, $invId, [
            'root_cause'          => $rootCause,
            'lab_error_identified' => $labErrorIdentified,
            'closed_by'           => $actor,
        ], $user);

        $this->success(['investigation' => $this->loadInvestigation($invId)]);
    }
}
