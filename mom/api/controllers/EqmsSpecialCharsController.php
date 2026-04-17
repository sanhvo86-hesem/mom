<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Special Characteristics Controller — KPC/KCC/SC/CC management.
 *
 * Manages Key Product Characteristics (KPC), Key Control Characteristics (KCC),
 * Special Characteristics (SC), and Critical Characteristics (CC) per IATF 16949 §8.3.5.2.
 *
 * These records define which part/process characteristics require special controls,
 * capability monitoring, and documented reaction plans.
 *
 * State machine:
 *   draft       → submit-for-review
 *   under_review → approve, reject, request-revision
 *   revision_required → submit-revision
 *   approved    → obsolete
 *   rejected    → (terminal — create new)
 *   obsolete    → (terminal)
 *
 * Standards: IATF 16949 §8.3.5.2, ISO/TS 16949, Ford Q1 SC/CC designation
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsSpecialCharsController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'special_characteristic';
    private const MODULE      = 'special-characteristics';
    private const TABLE       = 'eqms_special_characteristics';
    protected const PK        = 'sc_id';

    private const STATE_MACHINE = [
        'draft'             => ['submit-for-review'],
        'under_review'      => ['approve', 'reject', 'request-revision'],
        'revision_required' => ['submit-revision'],
        'approved'          => ['obsolete'],
        'rejected'          => [],
        'obsolete'          => [],
    ];

    private const TERMINAL_STATES = ['rejected', 'obsolete'];

    private const SC_TYPES = ['KPC', 'KCC', 'SC', 'CC', 'SL', 'other'];

    private function scWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'process_engineer', 'manufacturing_engineer',
        ])));
    }

    private function scApproveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'engineering_manager',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    private function loadSc(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE sc_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('sc_not_found', 404, "Special characteristic '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('SC-%s-%04d', $year, (int)$seq);
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /** POST /eqms/special-characteristics/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[]      = "(sc_number ILIKE :search OR title ILIKE :search
                                   OR part_number ILIKE :search OR characteristic_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'characteristic_type', 'customer_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[]    = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }
        if (!empty($q['filters']['part_number'])) {
            $conditions[]      = 'part_number ILIKE :part';
            $params[':part']   = '%' . $q['filters']['part_number'] . '%';
        }
        if (!empty($q['filters']['safety_critical'])) {
            $conditions[] = 'safety_critical = TRUE';
        }
        if (!empty($q['filters']['cpk_below'])) {
            $cpk              = (float)$q['filters']['cpk_below'];
            $conditions[]     = 'current_cpk IS NOT NULL AND current_cpk < :cpk_below';
            $params[':cpk_below'] = $cpk;
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], [
            'sc_number', 'title', 'part_number', 'characteristic_type', 'status',
            'current_cpk', 'cpk_requirement', 'created_at',
        ], true) ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT sc_id, sc_number, title, characteristic_type, symbol, safety_critical,
                    part_number, part_revision, characteristic_name,
                    nominal_value, tolerance_upper, tolerance_lower, unit_of_measure,
                    cpk_requirement, current_cpk, measurement_frequency,
                    status, version, created_at, created_by
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

        $this->paginated('special_characteristics', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/special-characteristics/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byType = $this->data->query(
            "SELECT characteristic_type, COUNT(*) AS count FROM " . self::TABLE . "
             WHERE status = 'approved'
             GROUP BY characteristic_type ORDER BY characteristic_type"
        ) ?? [];

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $safetyCriticalCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE safety_critical = TRUE AND status = 'approved'"
        ) ?? 0);

        $cpkAtRiskCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status = 'approved' AND current_cpk IS NOT NULL
               AND cpk_requirement IS NOT NULL AND current_cpk < cpk_requirement"
        ) ?? 0);

        $openCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status NOT IN ('approved','rejected','obsolete')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_type'             => $byType,
                'by_status'           => $byStatus,
                'safety_critical'     => $safetyCriticalCount,
                'cpk_at_risk'         => $cpkAtRiskCount,
                'open_count'          => $openCount,
            ],
        ]);
    }

    /** POST /eqms/special-characteristics/lookup */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body = $this->jsonBody();
        $ids  = is_array($body['ids'] ?? null) ? $body['ids'] : [];

        if (empty($ids)) {
            $this->success(['records' => []]);
        }

        $ph     = implode(',', array_map(fn($i) => ":id{$i}", array_keys($ids)));
        $params = [];
        foreach ($ids as $i => $id) {
            $params[":id{$i}"] = $id;
        }

        $rows = $this->data->query(
            "SELECT sc_id, sc_number, title, characteristic_type, part_number, status
             FROM " . self::TABLE . " WHERE sc_id IN ({$ph})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /** POST /eqms/special-characteristics */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->scWriteRoles());

        $body           = $this->jsonBody();
        $title          = trim((string)($body['title'] ?? ''));
        $partNumber     = trim((string)($body['part_number'] ?? ''));
        $charName       = trim((string)($body['characteristic_name'] ?? ''));
        $charType       = trim((string)($body['characteristic_type'] ?? 'SC'));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if ($partNumber === '') {
            $this->error('part_number_required', 400, "'part_number' is required.");
        }
        if ($charName === '') {
            $this->error('characteristic_name_required', 400, "'characteristic_name' is required.");
        }
        if (!in_array($charType, self::SC_TYPES, true)) {
            $this->error('invalid_characteristic_type', 400,
                "'characteristic_type' must be one of: " . implode(', ', self::SC_TYPES) . '.');
        }

        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (sc_id, sc_number, title, description,
              characteristic_type, symbol, safety_critical, regulatory_basis,
              part_number, part_revision, part_description, process_name, operation_number,
              drawing_number, balloon_number, characteristic_name,
              nominal_value, tolerance_upper, tolerance_lower, unit_of_measure, target_value,
              control_method, measurement_system, gage_id, measurement_frequency,
              sample_size, reaction_plan, cpk_requirement, ppk_requirement,
              control_plan_id, control_plan_ref, pfmea_id, pfmea_ref,
              customer_id, customer_requirement_ref, customer_symbol,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc,
              :type, :symbol, :safety, :reg_basis,
              :part, :part_rev, :part_desc, :process, :op_num,
              :drawing, :balloon, :char_name,
              :nominal, :tol_up, :tol_lo, :uom, :target,
              :control, :msys, :gage, :freq,
              :sample, :reaction, :cpk_req, :ppk_req,
              :cp_id, :cp_ref, :pfmea_id, :pfmea_ref,
              :cust_id, :cust_req, :cust_sym,
              'draft', 1, :now, :by)",
            [
                ':id'         => $id,
                ':num'        => $number,
                ':title'      => $title,
                ':desc'       => trim((string)($body['description'] ?? '')),
                ':type'       => $charType,
                ':symbol'     => $body['symbol'] ?? null,
                ':safety'     => !empty($body['safety_critical']),
                ':reg_basis'  => $body['regulatory_basis'] ?? null,
                ':part'       => $partNumber,
                ':part_rev'   => $body['part_revision'] ?? null,
                ':part_desc'  => $body['part_description'] ?? null,
                ':process'    => $body['process_name'] ?? null,
                ':op_num'     => $body['operation_number'] ?? null,
                ':drawing'    => $body['drawing_number'] ?? null,
                ':balloon'    => $body['balloon_number'] ?? null,
                ':char_name'  => $charName,
                ':nominal'    => isset($body['nominal_value']) ? (float)$body['nominal_value'] : null,
                ':tol_up'     => isset($body['tolerance_upper']) ? (float)$body['tolerance_upper'] : null,
                ':tol_lo'     => isset($body['tolerance_lower']) ? (float)$body['tolerance_lower'] : null,
                ':uom'        => $body['unit_of_measure'] ?? null,
                ':target'     => isset($body['target_value']) ? (float)$body['target_value'] : null,
                ':control'    => $body['control_method'] ?? null,
                ':msys'       => $body['measurement_system'] ?? null,
                ':gage'       => $body['gage_id'] ?? null,
                ':freq'       => $body['measurement_frequency'] ?? null,
                ':sample'     => isset($body['sample_size']) ? (int)$body['sample_size'] : null,
                ':reaction'   => $body['reaction_plan'] ?? null,
                ':cpk_req'    => isset($body['cpk_requirement']) ? (float)$body['cpk_requirement'] : null,
                ':ppk_req'    => isset($body['ppk_requirement']) ? (float)$body['ppk_requirement'] : null,
                ':cp_id'      => $body['control_plan_id'] ?? null,
                ':cp_ref'     => $body['control_plan_ref'] ?? null,
                ':pfmea_id'   => $body['pfmea_id'] ?? null,
                ':pfmea_ref'  => $body['pfmea_ref'] ?? null,
                ':cust_id'    => $body['customer_id'] ?? null,
                ':cust_req'   => $body['customer_requirement_ref'] ?? null,
                ':cust_sym'   => $body['customer_symbol'] ?? null,
                ':now'        => $now,
                ':by'         => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.sc.created', self::ENTITY_TYPE, $id, [
            'sc_number'          => $number,
            'characteristic_type' => $charType,
            'part_number'        => $partNumber,
            'safety_critical'    => !empty($body['safety_critical']),
        ], $user);

        $record = $this->loadSc($id);
        $this->success(['special_characteristic' => $record], 201);
    }

    /** GET /eqms/special-characteristics/{id} */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->success(['special_characteristic' => $record]);
    }

    /** PATCH /eqms/special-characteristics/{id} */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->scWriteRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->requireVersionMatch((int)$record['version'], $id);

        if (in_array($record['status'], self::TERMINAL_STATES, true)) {
            $this->error('record_locked', 409,
                "Special characteristic in terminal state '{$record['status']}' cannot be updated.");
        }

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $id, ':ver' => ((int)$record['version']) + 1];
        $updatable = [
            'title', 'description', 'characteristic_type', 'symbol', 'safety_critical', 'regulatory_basis',
            'part_number', 'part_revision', 'part_description', 'process_name', 'operation_number',
            'drawing_number', 'balloon_number', 'characteristic_name',
            'nominal_value', 'tolerance_upper', 'tolerance_lower', 'unit_of_measure', 'target_value',
            'control_method', 'measurement_system', 'gage_id', 'measurement_frequency',
            'sample_size', 'reaction_plan', 'cpk_requirement', 'ppk_requirement',
            'current_cpk', 'last_capability_study_date',
            'control_plan_id', 'control_plan_ref', 'pfmea_id', 'pfmea_ref',
            'customer_id', 'customer_requirement_ref', 'customer_symbol',
        ];

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

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
        $sets[] = 'updated_at = now()';
        $sets[] = "updated_by = :actor";
        $params[':actor'] = $actor;

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE sc_id = :id AND version = " . (int)$record['version'],
            $params
        );

        $this->emitQualityEvent('eqms.sc.updated', self::ENTITY_TYPE, $id, [], $user);

        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }

    /** PATCH /eqms/special-characteristics/{id}/cpk — Update current Cpk from SPC system */
    public function updateCpk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->scWriteRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $body       = $this->jsonBody();
        $currentCpk = isset($body['current_cpk']) ? (float)$body['current_cpk'] : null;
        $studyDate  = $body['last_capability_study_date'] ?? null;

        if ($currentCpk === null) {
            $this->error('current_cpk_required', 400, "'current_cpk' is required.");
        }

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET current_cpk = :cpk,
                 last_capability_study_date = :study_date,
                 updated_at = now(), updated_by = :by
             WHERE sc_id = :id",
            [
                ':cpk'        => $currentCpk,
                ':study_date' => $studyDate,
                ':by'         => $actor,
                ':id'         => $id,
            ]
        );

        $this->emitQualityEvent('eqms.sc.cpk_updated', self::ENTITY_TYPE, $id, [
            'current_cpk'               => $currentCpk,
            'cpk_requirement'           => $record['cpk_requirement'],
            'cpk_at_risk'               => $currentCpk < (float)($record['cpk_requirement'] ?? 1.33),
            'last_capability_study_date' => $studyDate,
        ], $user);

        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->scWriteRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->scWriteRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);
        $this->serveAvailableActions((string)$record['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'sc_id');
        $this->loadSc($id);
        $this->serveExport(self::MODULE, $id, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /** POST /eqms/special-characteristics/{id}/actions/submit-for-review */
    public function actionSubmitForReview(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->scWriteRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->requireValidTransition((string)$record['status'], 'submit-for-review', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        // Minimum completeness check
        if (empty($record['characteristic_name'])) {
            $this->error('incomplete_sc', 409, "'characteristic_name' must be set before submitting for review.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'under_review', version = :ver, updated_at = now(), updated_by = :by
             WHERE sc_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.sc.submitted_for_review', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }

    /** POST /eqms/special-characteristics/{id}/actions/approve */
    public function actionApprove(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->scApproveRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->requireValidTransition((string)$record['status'], 'approve', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'approve_special_characteristic', $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'approved', approved_by = :by, approved_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE sc_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.sc.approved', self::ENTITY_TYPE, $id, [
            'sc_number'   => $record['sc_number'],
            'approved_by' => $actor,
        ], $user);

        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }

    /** POST /eqms/special-characteristics/{id}/actions/reject */
    public function actionReject(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->scApproveRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->requireValidTransition((string)$record['status'], 'reject', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['rejected_reason'] ?? ''));
        if ($reason === '') {
            $this->error('rejected_reason_required', 400, "'rejected_reason' is required when rejecting.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'rejected', version = :ver, updated_at = now(), updated_by = :by
             WHERE sc_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.sc.rejected', self::ENTITY_TYPE, $id, [
            'rejected_reason' => $reason,
        ], $user);

        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }

    /** POST /eqms/special-characteristics/{id}/actions/request-revision */
    public function actionRequestRevision(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->scApproveRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->requireValidTransition((string)$record['status'], 'request-revision', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $body  = $this->jsonBody();
        $notes = trim((string)($body['revision_notes'] ?? ''));
        if ($notes === '') {
            $this->error('revision_notes_required', 400, "'revision_notes' must describe what needs to be corrected.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'revision_required', version = :ver, updated_at = now(), updated_by = :by
             WHERE sc_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.sc.revision_required', self::ENTITY_TYPE, $id, [
            'notes' => $notes,
        ], $user);

        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }

    /** POST /eqms/special-characteristics/{id}/actions/submit-revision */
    public function actionSubmitRevision(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->scWriteRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->requireValidTransition((string)$record['status'], 'submit-revision', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'under_review', version = :ver, updated_at = now(), updated_by = :by
             WHERE sc_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.sc.revision_submitted', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }

    /** POST /eqms/special-characteristics/{id}/actions/obsolete */
    public function actionObsolete(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->scApproveRoles());

        $id     = $this->requirePathId('id', 'sc_id');
        $record = $this->loadSc($id);

        $this->requireValidTransition((string)$record['status'], 'obsolete', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$record['version'], $id);
        $this->requireElectronicSignature($user, 'obsolete_special_characteristic', $id);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['obsolete_reason'] ?? ''));
        if ($reason === '') {
            $this->error('obsolete_reason_required', 400, "'obsolete_reason' is required when obsoleting.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$record['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'obsolete', obsolete_reason = :reason,
                 obsoleted_by = :by, obsoleted_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE sc_id = :id AND version = :oldver",
            [':reason' => $reason, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$record['version']]
        );

        $this->emitQualityEvent('eqms.sc.obsoleted', self::ENTITY_TYPE, $id, [
            'obsolete_reason' => $reason,
        ], $user);

        $this->success(['special_characteristic' => $this->loadSc($id)]);
    }
}
