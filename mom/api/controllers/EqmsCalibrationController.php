<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Calibration Controller — Calibration Records + MSA lifecycle.
 *
 * Sub-module 1: Calibration Records
 *   State machine:
 *     scheduled        → start
 *     in_progress      → record-result, declare-oot
 *     results_recorded → submit-review, declare-oot
 *     under_review     → approve, declare-oot
 *     approved         → close
 *     oot_declared     → close
 *     closed           → (terminal)
 *
 * Sub-module 2: MSA (Measurement System Analysis)
 *
 * Electronic Signature:
 *   approve REQUIRES signature (regulated instruments).
 *   close   REQUIRES signature (regulated instruments).
 *   msaActionApprove REQUIRES signature.
 *
 * Standards: ISO 10012, ISO/IEC 17025, IATF 16949 §7.1.5
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsCalibrationController extends EqmsBaseController
{
    // ── Calibration constants ─────────────────────────────────────────────────

    private const ENTITY_TYPE = 'calibration';
    private const MODULE      = 'calibration';
    private const TABLE       = 'eqms_calibration_records';
    protected const PK          = 'calibration_id';

    private const STATE_MACHINE = [
        'scheduled'        => ['start'],
        'in_progress'      => ['record-result', 'declare-oot'],
        'results_recorded' => ['submit-review', 'declare-oot'],
        'under_review'     => ['approve', 'declare-oot'],
        'approved'         => ['close'],
        'oot_declared'     => ['close'],
        'closed'           => [],
    ];

    private function calWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_engineer', 'qa_manager', 'calibration_lab', 'metrology_engineer',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadCalibration(string $calId): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE calibration_id = :id LIMIT 1",
            [':id' => $calId]
        );
        if (empty($row)) {
            $this->error('calibration_not_found', 404, "Calibration record '{$calId}' not found.");
        }
        return $row[0];
    }

    // ── Calibration: Query & Metrics ──────────────────────────────────────────

    /**
     * POST /eqms/calibration/query — Paginated calibration record list.
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(calibration_number ILIKE :search OR equipment_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'equipment_id', 'pass_fail'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        if (!empty($q['filters']['overdue'])) {
            $conditions[] = "next_due_date < now() AND status NOT IN ('closed')";
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['calibration_number', 'equipment_name', 'calibration_date', 'next_due_date', 'status', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT calibration_id, calibration_number, equipment_id, equipment_name,
                    calibration_date, next_due_date, pass_fail, oot_declared,
                    performed_by, status, version, created_at
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

        $this->paginated('calibration_records', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/calibration/metrics — Calibration KPIs.
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $ootCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE oot_declared = true"
        ) ?? 0);

        $overdueCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE next_due_date < now() AND status NOT IN ('closed')"
        ) ?? 0);

        $failCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE pass_fail = false"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'     => $byStatus,
                'oot_count'     => $ootCount,
                'overdue_count' => $overdueCount,
                'fail_count'    => $failCount,
            ],
        ]);
    }

    /**
     * POST /eqms/calibration/lookup — Lightweight ID→number lookup.
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
            "SELECT calibration_id, calibration_number, equipment_name, status, pass_fail
             FROM " . self::TABLE . " WHERE calibration_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── Calibration: CRUD ─────────────────────────────────────────────────────

    /**
     * POST /eqms/calibration — Create a new calibration record in scheduled state.
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());

        $body          = $this->jsonBody();
        $equipmentId   = trim((string)($body['equipment_id'] ?? ''));
        $equipmentName = trim((string)($body['equipment_name'] ?? ''));

        if ($equipmentId === '') {
            $this->error('equipment_id_required', 400);
        }
        if ($equipmentName === '') {
            $this->error('equipment_name_required', 400);
        }

        $calId     = $this->newUuid();
        $calNumber = 'CAL-' . strtoupper(substr($calId, 0, 8));
        $now       = $this->nowIso();
        $actor     = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (calibration_id, calibration_number, equipment_id, equipment_name,
              calibration_standard, calibration_procedure, performed_by, lab_ref,
              calibration_date, next_due_date, results, pass_fail,
              oot_declared, oot_reason, status, version, created_at)
             VALUES
             (:id, :num, :eq_id, :eq_name,
              :std, :proc, :by_user, :lab,
              :cal_date, :next_due, '[]'::jsonb, NULL,
              false, NULL, 'scheduled', 1, :now)",
            [
                ':id'       => $calId,
                ':num'      => $calNumber,
                ':eq_id'    => $equipmentId,
                ':eq_name'  => $equipmentName,
                ':std'      => $body['calibration_standard'] ?? null,
                ':proc'     => $body['calibration_procedure'] ?? null,
                ':by_user'  => $body['performed_by'] ?? $actor,
                ':lab'      => $body['lab_ref'] ?? null,
                ':cal_date' => $body['calibration_date'] ?? null,
                ':next_due' => $body['next_due_date'] ?? null,
                ':now'      => $now,
            ]
        );

        $this->emitQualityEvent('eqms.calibration.created', self::ENTITY_TYPE, $calId, [
            'calibration_number' => $calNumber,
            'equipment_id'       => $equipmentId,
        ], $user);

        $this->success(['calibration' => $this->loadCalibration($calId)], 201);
    }

    /** GET /eqms/calibration/{id} */
    public function detail(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    /** PATCH /eqms/calibration/{id} */
    public function update(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);
        $this->requireVersionMatch((int)$cal['version'], $calId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $calId, ':ver' => ((int)$cal['version']) + 1];
        $updatable = ['equipment_name', 'calibration_standard', 'calibration_procedure',
                      'performed_by', 'lab_ref', 'calibration_date', 'next_due_date', 'certificate_ref'];

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
            " WHERE calibration_id = :id AND version = " . (int)$cal['version'],
            $params
        );

        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $this->loadCalibration($calId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $calId);
    }

    public function signatures(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $this->loadCalibration($calId);
        $this->serveSignatures(self::ENTITY_TYPE, $calId, $user);
    }

    public function availableActions(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);
        $this->serveAvailableActions((string)$cal['status'], self::STATE_MACHINE);
    }

    public function export(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $this->loadCalibration($calId);
        $this->serveExport(self::MODULE, $calId, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── Calibration State Machine Actions ─────────────────────────────────────

    /** POST /eqms/calibration/{id}/actions/start */
    public function actionStart(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);

        $this->requireValidTransition((string)$cal['status'], 'start', self::STATE_MACHINE, $calId);
        $this->requireVersionMatch((int)$cal['version'], $calId);

        $body   = $this->jsonBody();
        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$cal['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'in_progress', performed_by = COALESCE(:by, performed_by),
                 calibration_date = COALESCE(:cal_date, calibration_date), version = :ver
             WHERE calibration_id = :id AND version = :oldver",
            [
                ':by'       => $body['performed_by'] ?? $actor,
                ':cal_date' => $body['calibration_date'] ?? $this->nowIso(),
                ':ver'      => $newVer,
                ':id'       => $calId,
                ':oldver'   => (int)$cal['version'],
            ]
        );

        $this->emitQualityEvent('eqms.calibration.started', self::ENTITY_TYPE, $calId, [], $user);
        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    /** POST /eqms/calibration/{id}/actions/record-result */
    public function actionRecordResult(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);

        $this->requireValidTransition((string)$cal['status'], 'record-result', self::STATE_MACHINE, $calId);
        $this->requireVersionMatch((int)$cal['version'], $calId);

        $body      = $this->jsonBody();
        $results   = $body['results'] ?? [];
        $passFail  = trim((string)($body['pass_fail'] ?? ''));

        if (!in_array($passFail, ['pass', 'fail'], true)) {
            $this->error('invalid_pass_fail', 400, "'pass_fail' must be 'pass' or 'fail'.");
        }

        $newVer = ((int)$cal['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET results = :results::jsonb, pass_fail = :pf,
                 status = 'results_recorded', version = :ver
             WHERE calibration_id = :id AND version = :oldver",
            [
                ':results' => json_encode($results),
                ':pf'      => $passFail,
                ':ver'     => $newVer,
                ':id'      => $calId,
                ':oldver'  => (int)$cal['version'],
            ]
        );

        $this->emitQualityEvent('eqms.calibration.result_recorded', self::ENTITY_TYPE, $calId, [
            'pass_fail' => $passFail,
        ], $user);

        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    /** POST /eqms/calibration/{id}/actions/submit-review */
    public function actionSubmitReview(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);

        $this->requireValidTransition((string)$cal['status'], 'submit-review', self::STATE_MACHINE, $calId);
        $this->requireVersionMatch((int)$cal['version'], $calId);

        $newVer = ((int)$cal['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET status = 'under_review', version = :ver
             WHERE calibration_id = :id AND version = :oldver",
            [':ver' => $newVer, ':id' => $calId, ':oldver' => (int)$cal['version']]
        );

        $this->emitQualityEvent('eqms.calibration.submitted_for_review', self::ENTITY_TYPE, $calId, [], $user);
        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    /**
     * POST /eqms/calibration/{id}/actions/approve
     * REQUIRES electronic signature (regulated instruments).
     */
    public function actionApprove(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);

        $this->requireValidTransition((string)$cal['status'], 'approve', self::STATE_MACHINE, $calId);
        $this->requireVersionMatch((int)$cal['version'], $calId);
        $this->requireElectronicSignature($user, 'approve', $calId);

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$cal['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'approved', reviewed_by = :by, reviewed_at = now(), version = :ver
             WHERE calibration_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $calId, ':oldver' => (int)$cal['version']]
        );

        $this->emitQualityEvent('eqms.calibration.approved', self::ENTITY_TYPE, $calId, [
            'approved_by' => $actor,
        ], $user);

        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    /** POST /eqms/calibration/{id}/actions/declare-oot */
    public function actionDeclareOot(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);

        $this->requireValidTransition((string)$cal['status'], 'declare-oot', self::STATE_MACHINE, $calId);
        $this->requireVersionMatch((int)$cal['version'], $calId);

        $body      = $this->jsonBody();
        $ootReason = trim((string)($body['oot_reason'] ?? ''));
        if ($ootReason === '') {
            $this->error('oot_reason_required', 400, "'oot_reason' is required when declaring OOT.");
        }

        $newVer = ((int)$cal['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET oot_declared = true, oot_reason = :reason,
                 status = 'oot_declared', version = :ver
             WHERE calibration_id = :id AND version = :oldver",
            [':reason' => $ootReason, ':ver' => $newVer, ':id' => $calId, ':oldver' => (int)$cal['version']]
        );

        $this->emitQualityEvent('eqms.calibration.oot_declared', self::ENTITY_TYPE, $calId, [
            'oot_reason' => $ootReason,
        ], $user);

        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    /**
     * POST /eqms/calibration/{id}/actions/close
     * REQUIRES electronic signature (regulated instruments).
     */
    public function actionClose(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $calId = $this->requirePathId('id', 'calibration_id');
        $cal   = $this->loadCalibration($calId);

        $this->requireValidTransition((string)$cal['status'], 'close', self::STATE_MACHINE, $calId);
        $this->requireVersionMatch((int)$cal['version'], $calId);
        $this->requireElectronicSignature($user, 'close', $calId);

        $newVer = ((int)$cal['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'closed', version = :ver
             WHERE calibration_id = :id AND version = :oldver",
            [':ver' => $newVer, ':id' => $calId, ':oldver' => (int)$cal['version']]
        );

        $this->emitQualityEvent('eqms.calibration.closed', self::ENTITY_TYPE, $calId, [], $user);
        $this->success(['calibration' => $this->loadCalibration($calId)]);
    }

    // ── MSA Sub-Module ────────────────────────────────────────────────────────

    private const MSA_TABLE  = 'eqms_msa_records';
    private const MSA_ENTITY = 'msa';
    private const MSA_MODULE = 'msa';

    private function loadMsa(string $msaId): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::MSA_TABLE . " WHERE msa_id = :id LIMIT 1",
            [':id' => $msaId]
        );
        if (empty($row)) {
            $this->error('msa_not_found', 404, "MSA record '{$msaId}' not found.");
        }
        return $row[0];
    }

    /** POST /eqms/msa/query */
    public function msaQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(msa_number ILIKE :search OR equipment_id::text ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'study_type', 'equipment_id', 'passed'] as $f) {
            if (isset($q['filters'][$f]) && $q['filters'][$f] !== '') {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where = implode(' AND ', $conditions);

        $items = $this->data->query(
            "SELECT msa_id, msa_number, equipment_id, study_type, grr_percent, ndc_count,
                    passed, status, version, created_at, conducted_by
             FROM " . self::MSA_TABLE . "
             WHERE {$where}
             ORDER BY created_at DESC
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::MSA_TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('msa_records', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/msa/metrics */
    public function msaMetrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStudyType = $this->data->query(
            "SELECT study_type, COUNT(*) AS count, AVG(grr_percent) AS avg_grr
             FROM " . self::MSA_TABLE . " GROUP BY study_type"
        ) ?? [];

        $passRate = $this->data->query(
            "SELECT passed, COUNT(*) AS count FROM " . self::MSA_TABLE . " GROUP BY passed"
        ) ?? [];

        $this->success([
            'metrics' => [
                'by_study_type' => $byStudyType,
                'pass_rate'     => $passRate,
            ],
        ]);
    }

    /** POST /eqms/msa — Create a new MSA record. */
    public function msaCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());

        $body        = $this->jsonBody();
        $equipmentId = trim((string)($body['equipment_id'] ?? ''));
        $studyType   = trim((string)($body['study_type'] ?? ''));

        if ($equipmentId === '') {
            $this->error('equipment_id_required', 400);
        }
        if (!in_array($studyType, ['gauge_rr', 'linearity', 'bias', 'stability'], true)) {
            $this->error('invalid_study_type', 400,
                "'study_type' must be one of: gauge_rr, linearity, bias, stability.");
        }

        $msaId     = $this->newUuid();
        $msaNumber = 'MSA-' . strtoupper(substr($msaId, 0, 8));
        $now       = $this->nowIso();
        $actor     = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::MSA_TABLE . "
             (msa_id, msa_number, equipment_id, study_type,
              operator_count, part_count, repeat_count,
              results, grr_percent, ndc_count, passed,
              approval_threshold_grr, conducted_by, conducted_at,
              status, version, created_at)
             VALUES
             (:id, :num, :eq, :stype,
              NULL, NULL, NULL,
              '[]'::jsonb, NULL, NULL, NULL,
              10.0, :by, NULL,
              'draft', 1, :now)",
            [
                ':id'    => $msaId,
                ':num'   => $msaNumber,
                ':eq'    => $equipmentId,
                ':stype' => $studyType,
                ':by'    => $actor,
                ':now'   => $now,
            ]
        );

        $this->emitQualityEvent('eqms.msa.created', self::MSA_ENTITY, $msaId, [
            'msa_number' => $msaNumber,
            'study_type' => $studyType,
        ], $user);

        $this->success(['msa' => $this->loadMsa($msaId)], 201);
    }

    /** GET /eqms/msa/{id} */
    public function msaDetail(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $msaId = $this->requirePathId('id', 'msa_id');
        $this->success(['msa' => $this->loadMsa($msaId)]);
    }

    /** PATCH /eqms/msa/{id} */
    public function msaUpdate(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());
        $msaId = $this->requirePathId('id', 'msa_id');
        $msa   = $this->loadMsa($msaId);
        $this->requireVersionMatch((int)$msa['version'], $msaId);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $msaId, ':ver' => ((int)$msa['version']) + 1];
        $updatable = ['equipment_id', 'study_type', 'approval_threshold_grr'];

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
            "UPDATE " . self::MSA_TABLE . " SET " . implode(', ', $sets) .
            " WHERE msa_id = :id AND version = " . (int)$msa['version'],
            $params
        );

        $this->success(['msa' => $this->loadMsa($msaId)]);
    }

    public function msaAudit(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $msaId = $this->requirePathId('id', 'msa_id');
        $this->loadMsa($msaId);
        $this->serveAuditTrail(self::MSA_ENTITY, $msaId);
    }

    public function msaSignatures(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $msaId = $this->requirePathId('id', 'msa_id');
        $this->loadMsa($msaId);
        $this->serveSignatures(self::MSA_ENTITY, $msaId, $user);
    }

    public function msaExport(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $msaId = $this->requirePathId('id', 'msa_id');
        $this->loadMsa($msaId);
        $this->serveExport(self::MSA_MODULE, $msaId, $user);
    }

    public function msaExportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MSA_MODULE, 'bulk', $user);
    }

    /**
     * POST /eqms/msa/{id}/actions/record-study
     * Record full MSA study results including GR&R %, NDC.
     */
    public function msaActionRecordStudy(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->calWriteRoles());
        $msaId = $this->requirePathId('id', 'msa_id');
        $msa   = $this->loadMsa($msaId);
        $this->requireVersionMatch((int)$msa['version'], $msaId);

        $body        = $this->jsonBody();
        $studyType   = trim((string)($body['study_type'] ?? $msa['study_type'] ?? ''));
        $grrPercent  = isset($body['grr_percent'])  ? (float)$body['grr_percent']  : null;
        $ndcCount    = isset($body['ndc_count'])     ? (int)$body['ndc_count']      : null;
        $passed      = isset($body['passed'])        ? (bool)$body['passed']        : null;
        $results     = $body['results'] ?? [];

        if (!in_array($studyType, ['gauge_rr', 'linearity', 'bias', 'stability'], true)) {
            $this->error('invalid_study_type', 400);
        }

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$msa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::MSA_TABLE . "
             SET study_type = :stype,
                 operator_count = :ops, part_count = :parts, repeat_count = :repeats,
                 results = :results::jsonb, grr_percent = :grr, ndc_count = :ndc,
                 passed = :passed, conducted_by = :by, conducted_at = now(),
                 status = 'study_recorded', version = :ver
             WHERE msa_id = :id AND version = :oldver",
            [
                ':stype'   => $studyType,
                ':ops'     => isset($body['operator_count']) ? (int)$body['operator_count'] : null,
                ':parts'   => isset($body['part_count'])     ? (int)$body['part_count']     : null,
                ':repeats' => isset($body['repeat_count'])   ? (int)$body['repeat_count']   : null,
                ':results' => json_encode($results),
                ':grr'     => $grrPercent,
                ':ndc'     => $ndcCount,
                ':passed'  => $passed === null ? null : ($passed ? 'true' : 'false'),
                ':by'      => $actor,
                ':ver'     => $newVer,
                ':id'      => $msaId,
                ':oldver'  => (int)$msa['version'],
            ]
        );

        $this->emitQualityEvent('eqms.msa.study_recorded', self::MSA_ENTITY, $msaId, [
            'study_type'  => $studyType,
            'grr_percent' => $grrPercent,
            'passed'      => $passed,
        ], $user);

        $this->success(['msa' => $this->loadMsa($msaId)]);
    }

    /**
     * POST /eqms/msa/{id}/actions/approve
     * REQUIRES electronic signature.
     */
    public function msaActionApprove(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());
        $msaId = $this->requirePathId('id', 'msa_id');
        $msa   = $this->loadMsa($msaId);
        $this->requireVersionMatch((int)$msa['version'], $msaId);
        $this->requireElectronicSignature($user, 'approve', $msaId);

        $actor  = (string)($user['username'] ?? 'unknown');
        $newVer = ((int)$msa['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::MSA_TABLE . "
             SET status = 'approved', approved_by = :by, approved_at = now(), version = :ver
             WHERE msa_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $msaId, ':oldver' => (int)$msa['version']]
        );

        $this->emitQualityEvent('eqms.msa.approved', self::MSA_ENTITY, $msaId, [
            'approved_by' => $actor,
        ], $user);

        $this->success(['msa' => $this->loadMsa($msaId)]);
    }

    // ── Cross-module Actions ──────────────────────────────────────────────────

    /**
     * POST /eqms/calibration/{id}/actions/create-lab-investigation
     * Escalate a calibration out-of-tolerance finding to an NCR for lab investigation.
     * Body requires: { oot_description }
     * Body optional: { assigned_to, severity }
     *
     * Business rule: calibration must have status 'out_of_tolerance' or 'overdue'.
     */
    public function actionCreateLabInvestigation(): never
    {
        $user    = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsWriteRoles());

        $calId   = $this->requirePathId('id', 'calibration_id');
        $cal     = $this->loadCalibration($calId);

        $allowedStatuses = ['out_of_tolerance', 'overdue', 'failed'];
        if (!in_array($cal['status'], $allowedStatuses, true)) {
            $this->error('invalid_status_for_lab_investigation', 409,
                "Lab investigation can only be created for calibrations with status: "
                . implode(', ', $allowedStatuses) . ". Current: '{$cal['status']}'.");
        }

        // Prevent duplicate investigations
        $existing = $this->data->scalar(
            "SELECT ncr_id FROM eqms_ncr_records
             WHERE source_type = 'calibration' AND source_id = :id
               AND status NOT IN ('closed') LIMIT 1",
            [':id' => $calId]
        );
        if ($existing) {
            $this->error('investigation_already_open', 409,
                "An open NCR investigation (ID: {$existing}) already exists for this calibration.");
        }

        $body     = $this->jsonBody();
        $ootDesc  = trim((string)($body['oot_description'] ?? ''));
        if ($ootDesc === '') {
            $this->error('oot_description_required', 400,
                "'oot_description' (out-of-tolerance description) is required.");
        }

        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $ncrId      = $this->newUuid();
        $ncrNumber  = 'NCR-CAL-' . strtoupper(substr($ncrId, 0, 6));
        $now        = $this->nowIso();
        $severity   = in_array($body['severity'] ?? '', ['minor','major','critical'], true)
                      ? $body['severity'] : 'major';
        $title      = 'Lab Investigation: OOT calibration — ' . ($cal['instrument_id'] ?? $calId);

        $this->data->execute(
            "INSERT INTO eqms_ncr_records
             (ncr_id, ncr_number, title, description, source, source_type, source_id,
              severity, assigned_to, status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, 'calibration', 'calibration', :src_id,
              :sev, :assigned, 'submitted', 1, :now, :by)",
            [
                ':id'       => $ncrId,
                ':num'      => $ncrNumber,
                ':title'    => $title,
                ':desc'     => $ootDesc,
                ':src_id'   => $calId,
                ':sev'      => $severity,
                ':assigned' => $body['assigned_to'] ?? null,
                ':now'      => $now,
                ':by'       => $actor,
            ]
        );

        $this->data->execute(
            "INSERT INTO eqms_record_links
             (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'calibration', :cal_id, 'ncr', :ncr_id, 'oot_investigation', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':cal_id' => $calId, ':ncr_id' => $ncrId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.calibration.lab_investigation_created', 'calibration', $calId, [
            'ncr_id'     => $ncrId,
            'ncr_number' => $ncrNumber,
        ], $user);

        $ncr = $this->data->query(
            "SELECT ncr_id, ncr_number, title, status FROM eqms_ncr_records WHERE ncr_id = :id",
            [':id' => $ncrId]
        )[0] ?? [];

        $this->success(['calibration' => $this->loadCalibration($calId), 'created_ncr' => $ncr], 201);
    }
}
