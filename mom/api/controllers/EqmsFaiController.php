<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS FAI Controller — First Article Inspection reports.
 *
 * Manages the full FAI lifecycle per IATF 16949 §8.3.5 and AS9102B.
 * An FAI verifies that a part or assembly fully meets all design and
 * engineering requirements before volume production.
 *
 * State machine:
 *   draft              → submit
 *   submitted          → start-review, withdraw
 *   under_review       → approve, reject, request-revision
 *   revision_required  → submit-revision, withdraw
 *   approved           → close, revoke
 *   rejected           → withdraw
 *   closed             → (terminal)
 *   revoked            → (terminal)
 *   withdrawn          → (terminal)
 *
 * Standards: IATF 16949 §8.3.5, AS9102B, AS9100D §8.3.5
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsFaiController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'fai_report';
    private const MODULE      = 'fai';
    private const TABLE       = 'eqms_fai_reports';
    private const CHAR_TABLE  = 'eqms_fai_characteristics';
    protected const PK        = 'fai_id';

    private const STATE_MACHINE = [
        'draft'             => ['submit'],
        'submitted'         => ['start-review', 'withdraw'],
        'under_review'      => ['approve', 'reject', 'request-revision'],
        'revision_required' => ['submit-revision', 'withdraw'],
        'approved'          => ['close', 'revoke'],
        'rejected'          => ['withdraw'],
        'closed'            => [],
        'revoked'           => [],
        'withdrawn'         => [],
    ];

    private const TERMINAL_STATES = ['closed', 'revoked', 'withdrawn'];

    private const FAI_TYPES = ['full', 'partial', 're_fai', 'delta_fai', 'design_change', 'supplier_change'];
    private const FAI_RESULTS = ['pass', 'fail', 'conditional_approval', 'pending'];

    private function faiWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'process_engineer', 'manufacturing_engineer',
        ])));
    }

    private function faiApproveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'engineering_manager', 'production_director',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    private function loadFai(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE fai_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('fai_not_found', 404, "FAI report '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('FAI-%s-%04d', $year, (int)$seq);
    }

    private function recomputeCharacteristicCounts(string $faiId): void
    {
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET characteristic_count = (SELECT COUNT(*)          FROM " . self::CHAR_TABLE . " WHERE fai_id = :id),
                 pass_count            = (SELECT COUNT(*) FILTER (WHERE result = 'pass')  FROM " . self::CHAR_TABLE . " WHERE fai_id = :id),
                 fail_count            = (SELECT COUNT(*) FILTER (WHERE result = 'fail')  FROM " . self::CHAR_TABLE . " WHERE fai_id = :id),
                 open_discrepancy_count= (SELECT COUNT(*) FILTER (WHERE result = 'fail' AND discrepancy_notes IS NOT NULL AND discrepancy_notes <> '') FROM " . self::CHAR_TABLE . " WHERE fai_id = :id),
                 updated_at            = now()
             WHERE fai_id = :id",
            [':id' => $faiId]
        );
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /** POST /eqms/fai/query */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[]      = "(fai_number ILIKE :search OR title ILIKE :search
                                   OR part_number ILIKE :search OR supplier_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'fai_type', 'overall_result', 'vendor_id', 'customer_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[]    = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }
        if (!empty($q['filters']['part_number'])) {
            $conditions[]          = 'part_number ILIKE :part';
            $params[':part']       = '%' . $q['filters']['part_number'] . '%';
        }
        if (!empty($q['filters']['internal_part'])) {
            $internalPart = filter_var($q['filters']['internal_part'], FILTER_VALIDATE_BOOLEAN);
            $conditions[] = 'internal_part = ' . ($internalPart ? 'TRUE' : 'FALSE');
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], [
            'fai_number', 'title', 'part_number', 'status', 'fai_type', 'overall_result',
            'inspection_date', 'created_at',
        ], true) ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT fai_id, fai_number, title, part_number, part_revision,
                    vendor_id, supplier_name, fai_type, inspection_date,
                    characteristic_count, pass_count, fail_count, overall_result,
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

        $this->paginated('fai_reports', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/fai/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT fai_type, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY fai_type ORDER BY fai_type"
        ) ?? [];

        $byResult = $this->data->query(
            "SELECT overall_result, COUNT(*) AS count FROM " . self::TABLE . "
             WHERE overall_result IS NOT NULL GROUP BY overall_result ORDER BY overall_result"
        ) ?? [];

        $openCount  = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status NOT IN ('closed','revoked','withdrawn')"
        ) ?? 0);

        $passRate = $this->data->scalar(
            "SELECT ROUND(
                COUNT(*) FILTER (WHERE overall_result = 'pass')::NUMERIC
                / NULLIF(COUNT(*) FILTER (WHERE overall_result IS NOT NULL), 0) * 100, 1
             ) FROM " . self::TABLE
        ) ?? 0;

        $this->success([
            'metrics' => [
                'by_status'  => $byStatus,
                'by_type'    => $byType,
                'by_result'  => $byResult,
                'open_count' => $openCount,
                'pass_rate'  => (float)$passRate,
            ],
        ]);
    }

    /** POST /eqms/fai/lookup */
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
            "SELECT fai_id, fai_number, title, part_number, status, overall_result
             FROM " . self::TABLE . " WHERE fai_id IN ({$ph})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /** POST /eqms/fai */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());

        $body       = $this->jsonBody();
        $title      = trim((string)($body['title'] ?? ''));
        $partNumber = trim((string)($body['part_number'] ?? ''));
        $faiType    = trim((string)($body['fai_type'] ?? 'full'));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if ($partNumber === '') {
            $this->error('part_number_required', 400, "'part_number' is required.");
        }
        if (!in_array($faiType, self::FAI_TYPES, true)) {
            $this->error('invalid_fai_type', 400,
                "'fai_type' must be one of: " . implode(', ', self::FAI_TYPES) . '.');
        }

        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (fai_id, fai_number, title, description, part_number, part_revision,
              part_description, drawing_number, drawing_revision,
              vendor_id, supplier_name, customer_id, customer_name, internal_part,
              fai_type, fai_reason, previous_fai_id, ballooned_drawing_ref,
              inspection_date, inspector, inspection_location,
              ppap_level, ppap_submission_id, requires_esig, regulatory_basis,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :part, :part_rev,
              :part_desc, :drawing, :drawing_rev,
              :vendor_id, :supplier, :cust_id, :cust_name, :internal,
              :fai_type, :reason, :prev_fai, :drawing_ref,
              :insp_date, :inspector, :insp_loc,
              :ppap_lvl, :ppap_sub, :req_esig, :reg_basis,
              'draft', 1, :now, :by)",
            [
                ':id'          => $id,
                ':num'         => $number,
                ':title'       => $title,
                ':desc'        => trim((string)($body['description'] ?? '')),
                ':part'        => $partNumber,
                ':part_rev'    => $body['part_revision'] ?? null,
                ':part_desc'   => $body['part_description'] ?? null,
                ':drawing'     => $body['drawing_number'] ?? null,
                ':drawing_rev' => $body['drawing_revision'] ?? null,
                ':vendor_id'   => $body['vendor_id'] ?? null,
                ':supplier'    => $body['supplier_name'] ?? null,
                ':cust_id'     => $body['customer_id'] ?? null,
                ':cust_name'   => $body['customer_name'] ?? null,
                ':internal'    => !isset($body['internal_part']) || (bool)$body['internal_part'],
                ':fai_type'    => $faiType,
                ':reason'      => $body['fai_reason'] ?? null,
                ':prev_fai'    => $body['previous_fai_id'] ?? null,
                ':drawing_ref' => $body['ballooned_drawing_ref'] ?? null,
                ':insp_date'   => $body['inspection_date'] ?? null,
                ':inspector'   => $body['inspector'] ?? null,
                ':insp_loc'    => $body['inspection_location'] ?? null,
                ':ppap_lvl'    => isset($body['ppap_level']) ? (int)$body['ppap_level'] : null,
                ':ppap_sub'    => $body['ppap_submission_id'] ?? null,
                ':req_esig'    => !empty($body['requires_esig']),
                ':reg_basis'   => $body['regulatory_basis'] ?? null,
                ':now'         => $now,
                ':by'          => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.fai.created', self::ENTITY_TYPE, $id, [
            'fai_number'  => $number,
            'part_number' => $partNumber,
            'fai_type'    => $faiType,
        ], $user);

        $record = $this->loadFai($id);
        $this->success(['fai_report' => $record], 201);
    }

    /** GET /eqms/fai/{id} */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $id = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        // Load characteristics inline
        $characteristics = $this->data->query(
            "SELECT * FROM " . self::CHAR_TABLE . " WHERE fai_id = :id ORDER BY sort_order, balloon_number",
            [':id' => $id]
        ) ?? [];

        $fai['characteristics'] = $characteristics;

        $this->success(['fai_report' => $fai]);
    }

    /** PATCH /eqms/fai/{id} */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireVersionMatch((int)$fai['version'], $id);

        if (in_array($fai['status'], self::TERMINAL_STATES, true)) {
            $this->error('record_locked', 409,
                "FAI in terminal state '{$fai['status']}' cannot be updated.");
        }

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $id, ':ver' => ((int)$fai['version']) + 1];
        $updatable = [
            'title', 'description', 'part_number', 'part_revision', 'part_description',
            'drawing_number', 'drawing_revision', 'vendor_id', 'supplier_name',
            'customer_id', 'customer_name', 'internal_part', 'fai_type', 'fai_reason',
            'previous_fai_id', 'ballooned_drawing_ref',
            'inspection_date', 'inspector', 'inspection_location',
            'overall_result', 'conditional_approval_ref',
            'ppap_level', 'ppap_submission_id', 'requires_esig', 'regulatory_basis',
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
            " WHERE fai_id = :id AND version = " . (int)$fai['version'],
            $params
        );

        $this->emitQualityEvent('eqms.fai.updated', self::ENTITY_TYPE, $id, [], $user);

        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    // ── Characteristics Sub-resource ──────────────────────────────────────────

    /**
     * GET  /eqms/fai/{id}/characteristics
     * POST /eqms/fai/{id}/characteristics
     * Manage characteristic line items for this FAI report.
     */
    public function characteristics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);

        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        if ($method === 'GET') {
            $rows = $this->data->query(
                "SELECT * FROM " . self::CHAR_TABLE . "
                 WHERE fai_id = :id ORDER BY sort_order, balloon_number",
                [':id' => $id]
            ) ?? [];
            $this->success(['characteristics' => $rows]);
        }

        // POST — add a new characteristic
        $this->requireAnyRole($user, $this->faiWriteRoles());

        $body    = $this->jsonBody();
        $charName = trim((string)($body['characteristic_name'] ?? ''));
        if ($charName === '') {
            $this->error('characteristic_name_required', 400, "'characteristic_name' is required.");
        }

        $result = trim((string)($body['result'] ?? ''));
        if ($result !== '' && !in_array($result, ['pass', 'fail', 'pending'], true)) {
            $this->error('invalid_result', 400, "'result' must be pass, fail, or pending.");
        }

        $charId = $this->newUuid();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::CHAR_TABLE . "
             (char_id, fai_id, balloon_number, characteristic_name, characteristic_type,
              nominal_value, tolerance_upper, tolerance_lower, unit_of_measure,
              measurement_method, measured_value, measurement_tool_id,
              result, discrepancy_notes, sort_order, created_at, created_by)
             VALUES
             (:char_id, :fai_id, :balloon, :name, :type,
              :nominal, :tol_up, :tol_lo, :uom,
              :method, :measured, :tool_id,
              :result, :notes, :sort, now(), :by)",
            [
                ':char_id'  => $charId,
                ':fai_id'   => $id,
                ':balloon'  => $body['balloon_number'] ?? null,
                ':name'     => $charName,
                ':type'     => $body['characteristic_type'] ?? null,
                ':nominal'  => isset($body['nominal_value']) ? (float)$body['nominal_value'] : null,
                ':tol_up'   => isset($body['tolerance_upper']) ? (float)$body['tolerance_upper'] : null,
                ':tol_lo'   => isset($body['tolerance_lower']) ? (float)$body['tolerance_lower'] : null,
                ':uom'      => $body['unit_of_measure'] ?? null,
                ':method'   => $body['measurement_method'] ?? null,
                ':measured' => isset($body['measured_value']) ? (float)$body['measured_value'] : null,
                ':tool_id'  => $body['measurement_tool_id'] ?? null,
                ':result'   => $result !== '' ? $result : null,
                ':notes'    => $body['discrepancy_notes'] ?? null,
                ':sort'     => (int)($body['sort_order'] ?? 0),
                ':by'       => $actor,
            ]
        );

        $this->recomputeCharacteristicCounts($id);

        $char = $this->data->query(
            "SELECT * FROM " . self::CHAR_TABLE . " WHERE char_id = :id LIMIT 1",
            [':id' => $charId]
        )[0] ?? [];

        $this->success(['characteristic' => $char], 201);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'list');
    }

    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $fai  = $this->loadFai($id);
        $this->serveAvailableActions((string)$fai['status'], self::STATE_MACHINE);
    }

    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'fai_id');
        $this->loadFai($id);
        $this->serveExport(self::MODULE, $id, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /** POST /eqms/fai/{id}/actions/submit */
    public function actionSubmit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'submit', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);

        // Must have at least one characteristic to submit
        $charCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::CHAR_TABLE . " WHERE fai_id = :id",
            [':id' => $id]
        ) ?? 0);
        if ($charCount === 0) {
            $this->error('characteristics_required', 409,
                "At least one characteristic must be recorded before submitting an FAI report.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'submitted', submitted_by = :by, submitted_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.submitted', self::ENTITY_TYPE, $id, [
            'fai_number'          => $fai['fai_number'],
            'characteristic_count' => $charCount,
        ], $user);

        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/start-review */
    public function actionStartReview(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiApproveRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'start-review', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'under_review', reviewed_by = :by, reviewed_at = now(),
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.review_started', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/approve */
    public function actionApprove(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiApproveRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'approve', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);
        $this->requireElectronicSignature($user, 'approve_fai', $id);

        $body   = $this->jsonBody();
        $result = trim((string)($body['overall_result'] ?? 'pass'));
        if (!in_array($result, self::FAI_RESULTS, true)) {
            $this->error('invalid_result', 400,
                "'overall_result' must be one of: " . implode(', ', self::FAI_RESULTS) . '.');
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $sets   = [
            "status = 'approved'",
            "overall_result = :result",
            "approved_by = :by",
            "approved_at = now()",
            "version = :ver",
            "updated_at = now()",
            "updated_by = :by",
        ];
        $params = [
            ':result'  => $result,
            ':by'      => $actor,
            ':ver'     => $newVer,
            ':id'      => $id,
            ':oldver'  => (int)$fai['version'],
        ];

        if (!empty($body['conditional_approval_ref'])) {
            $sets[]                          = 'conditional_approval_ref = :cond_ref';
            $params[':cond_ref']             = $body['conditional_approval_ref'];
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE fai_id = :id AND version = :oldver",
            $params
        );

        $this->emitQualityEvent('eqms.fai.approved', self::ENTITY_TYPE, $id, [
            'overall_result' => $result,
            'approved_by'    => $actor,
        ], $user);

        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/reject */
    public function actionReject(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiApproveRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'reject', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['rejected_reason'] ?? ''));
        if ($reason === '') {
            $this->error('rejected_reason_required', 400, "'rejected_reason' is required when rejecting.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'rejected', overall_result = 'fail', rejected_reason = :reason,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':reason' => $reason, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.rejected', self::ENTITY_TYPE, $id, [
            'rejected_reason' => $reason,
        ], $user);

        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/request-revision */
    public function actionRequestRevision(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiApproveRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'request-revision', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);

        $body  = $this->jsonBody();
        $notes = trim((string)($body['revision_required_notes'] ?? ''));
        if ($notes === '') {
            $this->error('revision_notes_required', 400, "'revision_required_notes' must describe what needs to be corrected.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'revision_required', revision_required_notes = :notes,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':notes' => $notes, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.revision_required', self::ENTITY_TYPE, $id, [
            'notes' => $notes,
        ], $user);

        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/submit-revision */
    public function actionSubmitRevision(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'submit-revision', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'submitted', revision_required_notes = NULL,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.revision_submitted', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/close */
    public function actionClose(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'close', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'closed', version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.closed', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/withdraw */
    public function actionWithdraw(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiWriteRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'withdraw', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'withdrawn', version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.withdrawn', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['fai_report' => $this->loadFai($id)]);
    }

    /** POST /eqms/fai/{id}/actions/revoke */
    public function actionRevoke(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->faiApproveRoles());

        $id  = $this->requirePathId('id', 'fai_id');
        $fai = $this->loadFai($id);

        $this->requireValidTransition((string)$fai['status'], 'revoke', self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$fai['version'], $id);
        $this->requireElectronicSignature($user, 'revoke_fai', $id);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['revoke_reason'] ?? ''));
        if ($reason === '') {
            $this->error('revoke_reason_required', 400, "'revoke_reason' is required.");
        }

        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$fai['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'revoked', rejected_reason = :reason,
                 version = :ver, updated_at = now(), updated_by = :by
             WHERE fai_id = :id AND version = :oldver",
            [':reason' => $reason, ':by' => $actor, ':ver' => $newVer, ':id' => $id, ':oldver' => (int)$fai['version']]
        );

        $this->emitQualityEvent('eqms.fai.revoked', self::ENTITY_TYPE, $id, [
            'revoke_reason' => $reason,
        ], $user);

        $this->success(['fai_report' => $this->loadFai($id)]);
    }
}
