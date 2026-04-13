<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * FMEA & Control Plan Service for HESEM MOM Portal.
 *
 * Manages FMEA records (DFMEA/PFMEA per AIAG/VDA 2019), failure modes,
 * recommended actions with Action Priority calculation, Control Plans,
 * and cross-links to NCR/NPI.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class FmeaService
{
    private readonly string $dataDir;
    private readonly string $fmeaDir;
    private ?object $db = null;

    /** Valid FMEA types. */
    private const FMEA_TYPES = ['design', 'process', 'system', 'msf', 'supplemental'];

    /** Valid FMEA statuses. */
    private const FMEA_STATUSES = ['draft', 'in_analysis', 'reviewed', 'approved', 'active', 'superseded'];

    /** Valid action statuses. */
    private const ACTION_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

    /** Characteristic classifications (AIAG). */
    private const CLASSIFICATIONS = ['CC', 'SC', 'HI', 'YC'];

    /** Control plan types. */
    private const CP_TYPES = ['prototype', 'pre_launch', 'production'];

    /** Control methods. */
    private const CONTROL_METHODS = [
        'visual', 'gage', 'cmm', 'spc', 'attribute',
        'functional_test', 'ndt', 'destructive', 'automated',
    ];

    /** Reaction plan types. */
    private const REACTION_TYPES = [
        'stop_production', 'segregate', 'notify_supervisor',
        'adjust_process', '100_percent_inspection', 'containment',
    ];

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->fmeaDir = $this->dataDir . '/fmea';
        $this->db      = $db;

        foreach (['records', 'failure_modes', 'actions', 'revisions', 'control_plans', 'control_plan_chars'] as $sub) {
            $dir = $this->fmeaDir . '/' . $sub;
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }

        $countersDir = $this->dataDir . '/counters';
        if (!is_dir($countersDir)) {
            @mkdir($countersDir, 0775, true);
        }
    }

    // ── Shadow Write ────────────────────────────────────────────────────────

    private function shadowWriteToDb(string $table, string $idColumn, string $idValue, array $row): void
    {
        if ($this->db === null) return;
        try {
            $meta = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $this->db->execute(
                "INSERT INTO {$table} ({$idColumn}, metadata, created_at) VALUES (:id, :meta::jsonb, NOW())
                 ON CONFLICT ({$idColumn}) DO UPDATE SET metadata = EXCLUDED.metadata",
                [':id' => $idValue, ':meta' => $meta]
            );
        } catch (\Throwable $e) {
            error_log("[FmeaService] Shadow write to {$table} failed: " . $e->getMessage());
        }
    }

    // ── FMEA Records ──────────────────────────────────────────────────────

    /**
     * Create a new FMEA record.
     *
     * @param array  $data   FMEA data (fmea_type, title, item_id, etc.).
     * @param string $userId Creating user.
     * @return array Created FMEA record.
     */
    public function createFmea(array $data, string $userId): array
    {
        $fmeaNumber = $this->generateNumber('fmea', 'FMEA', 3);
        $now        = $this->nowIso();
        $fmeaId     = $this->generateUuidV4();

        $record = [
            'fmea_id'                => $fmeaId,
            'fmea_number'            => $fmeaNumber,
            'fmea_type'              => $data['fmea_type'] ?? 'process',
            'status'                 => 'draft',
            'title'                  => $data['title'] ?? '',
            'title_vi'               => $data['title_vi'] ?? '',
            'item_id'                => $data['item_id'] ?? null,
            'process_name'           => $data['process_name'] ?? null,
            'process_step'           => $data['process_step'] ?? null,
            'team_lead'              => $data['team_lead'] ?? $userId,
            'team_members'           => $data['team_members'] ?? [],
            'scope'                  => $data['scope'] ?? null,
            'boundary_diagram_ref'   => $data['boundary_diagram_ref'] ?? null,
            'revision'               => 1,
            'approved_by'            => null,
            'approved_at'            => null,
            'linked_control_plan_id' => $data['linked_control_plan_id'] ?? null,
            'linked_npi_id'          => $data['linked_npi_id'] ?? null,
            'metadata'               => $data['metadata'] ?? new \stdClass(),
            'created_at'             => $now,
            'updated_at'             => $now,
            'created_by'             => $userId,
        ];

        $records   = $this->loadFile('records');
        $records[] = $record;
        $this->saveFile('records', $records);

        return $record;
    }

    /**
     * Update an existing FMEA record.
     */
    public function updateFmea(string $fmeaId, array $updates, string $userId): array
    {
        $records = $this->loadFile('records');
        $now     = $this->nowIso();

        foreach ($records as $idx => $rec) {
            if (!is_array($rec)) {
                continue;
            }
            if (($rec['fmea_id'] ?? '') !== $fmeaId) {
                continue;
            }

            // Prevent overwriting system fields
            unset($updates['fmea_id'], $updates['fmea_number'], $updates['created_at']);

            $records[$idx] = array_merge($rec, $updates, [
                'updated_at' => $now,
                'updated_by' => $userId,
            ]);

            $this->saveFile('records', $records);
            return $records[$idx];
        }

        throw new RuntimeException("FMEA record {$fmeaId} not found.");
    }

    /**
     * List FMEA records with optional filters (fmea_type, status, item_id).
     * Q5: Pagination is enforced at the controller level with max limit of 200 rows.
     */
    public function listFmeas(array $filters = []): array
    {
        $records = $this->loadFile('records');
        $result  = [];

        foreach ($records as $rec) {
            if (!is_array($rec)) {
                continue;
            }
            if (isset($filters['fmea_type']) && $filters['fmea_type'] !== '') {
                if (($rec['fmea_type'] ?? '') !== $filters['fmea_type']) {
                    continue;
                }
            }
            if (isset($filters['status']) && $filters['status'] !== '') {
                if (($rec['status'] ?? '') !== $filters['status']) {
                    continue;
                }
            }
            if (isset($filters['item_id']) && $filters['item_id'] !== '') {
                if (($rec['item_id'] ?? '') !== $filters['item_id']) {
                    continue;
                }
            }
            $result[] = $rec;
        }

        usort($result, fn(array $a, array $b) => strcmp($b['updated_at'] ?? '', $a['updated_at'] ?? ''));

        return $result;
    }

    /**
     * Get full FMEA detail with all failure modes and actions.
     */
    public function getDetail(string $fmeaId): array
    {
        $records = $this->loadFile('records');
        $fmea    = null;

        foreach ($records as $rec) {
            if (is_array($rec) && ($rec['fmea_id'] ?? '') === $fmeaId) {
                $fmea = $rec;
                break;
            }
        }

        if ($fmea === null) {
            throw new RuntimeException("FMEA record {$fmeaId} not found.");
        }

        // Attach failure modes
        $allModes = $this->loadFile('failure_modes');
        $modes    = [];
        foreach ($allModes as $fm) {
            if (is_array($fm) && ($fm['fmea_id'] ?? '') === $fmeaId) {
                // Attach actions per failure mode
                $fm['actions'] = $this->getActionsForFailureMode($fm['failure_mode_id'] ?? '');
                $modes[] = $fm;
            }
        }
        usort($modes, fn(array $a, array $b) => ($a['sequence'] ?? 0) <=> ($b['sequence'] ?? 0));

        $fmea['failure_modes'] = $modes;

        // Attach revisions
        $allRevs = $this->loadFile('revisions');
        $revs    = [];
        foreach ($allRevs as $rev) {
            if (is_array($rev) && ($rev['fmea_id'] ?? '') === $fmeaId) {
                $revs[] = $rev;
            }
        }
        usort($revs, fn(array $a, array $b) => ($b['revision_number'] ?? 0) <=> ($a['revision_number'] ?? 0));
        $fmea['revisions'] = $revs;

        return $fmea;
    }

    // ── Failure Modes ─────────────────────────────────────────────────────

    /**
     * Add a failure mode to an FMEA with auto Action Priority calculation.
     *
     * @param string $fmeaId FMEA record ID.
     * @param array  $data   Failure mode data (severity, occurrence, detection, etc.).
     * @return array Created failure mode.
     */
    public function addFailureMode(string $fmeaId, array $data): array
    {
        // Verify FMEA exists
        $this->findRecord('records', 'fmea_id', $fmeaId);

        $severity   = (int)($data['severity'] ?? 1);
        $occurrence = (int)($data['occurrence'] ?? 1);
        $detection  = (int)($data['detection'] ?? 1);

        $this->validateRating($severity, 'severity');
        $this->validateRating($occurrence, 'occurrence');
        $this->validateRating($detection, 'detection');

        $now = $this->nowIso();
        $id  = $this->generateUuidV4();

        // Determine next sequence
        $allModes = $this->loadFile('failure_modes');
        $maxSeq   = 0;
        foreach ($allModes as $fm) {
            if (is_array($fm) && ($fm['fmea_id'] ?? '') === $fmeaId) {
                $maxSeq = max($maxSeq, (int)($fm['sequence'] ?? 0));
            }
        }

        $record = [
            'failure_mode_id'          => $id,
            'fmea_id'                  => $fmeaId,
            'sequence'                 => $data['sequence'] ?? ($maxSeq + 1),
            'process_step'             => $data['process_step'] ?? null,
            'process_function'         => $data['process_function'] ?? null,
            'process_function_vi'      => $data['process_function_vi'] ?? null,
            'failure_mode'             => $data['failure_mode'] ?? '',
            'failure_mode_vi'          => $data['failure_mode_vi'] ?? null,
            'failure_effect'           => $data['failure_effect'] ?? null,
            'failure_effect_vi'        => $data['failure_effect_vi'] ?? null,
            'failure_cause'            => $data['failure_cause'] ?? null,
            'failure_cause_vi'         => $data['failure_cause_vi'] ?? null,
            'severity'                 => $severity,
            'occurrence'               => $occurrence,
            'detection'                => $detection,
            'rpn'                      => $severity * $occurrence * $detection,
            'action_priority'          => $this->calculateActionPriority($severity, $occurrence, $detection),
            'current_prevention_control' => $data['current_prevention_control'] ?? null,
            'current_detection_control'  => $data['current_detection_control'] ?? null,
            'classification'           => $data['classification'] ?? null,
            'metadata'                 => $data['metadata'] ?? new \stdClass(),
            'created_at'               => $now,
            'updated_at'               => $now,
        ];

        $allModes[] = $record;
        $this->saveFile('failure_modes', $allModes);

        return $record;
    }

    /**
     * Update a failure mode (recalculates RPN and AP if ratings change).
     */
    public function updateFailureMode(string $failureModeId, array $updates): array
    {
        $allModes = $this->loadFile('failure_modes');
        $now      = $this->nowIso();

        foreach ($allModes as $idx => $fm) {
            if (!is_array($fm)) {
                continue;
            }
            if (($fm['failure_mode_id'] ?? '') !== $failureModeId) {
                continue;
            }

            unset($updates['failure_mode_id'], $updates['fmea_id'], $updates['created_at']);

            $merged = array_merge($fm, $updates, ['updated_at' => $now]);

            // Recalculate if any rating changed
            $s = (int)($merged['severity'] ?? 1);
            $o = (int)($merged['occurrence'] ?? 1);
            $d = (int)($merged['detection'] ?? 1);

            $this->validateRating($s, 'severity');
            $this->validateRating($o, 'occurrence');
            $this->validateRating($d, 'detection');

            $merged['rpn']             = $s * $o * $d;
            $merged['action_priority'] = $this->calculateActionPriority($s, $o, $d);

            $allModes[$idx] = $merged;
            $this->saveFile('failure_modes', $allModes);
            return $merged;
        }

        throw new RuntimeException("Failure mode {$failureModeId} not found.");
    }

    // ── Actions ───────────────────────────────────────────────────────────

    /**
     * Add a recommended action to a failure mode.
     */
    public function addAction(string $failureModeId, array $data): array
    {
        // Verify failure mode exists
        $this->findRecord('failure_modes', 'failure_mode_id', $failureModeId);

        $now = $this->nowIso();
        $id  = $this->generateUuidV4();

        $record = [
            'action_id'              => $id,
            'failure_mode_id'        => $failureModeId,
            'action_description'     => $data['action_description'] ?? '',
            'action_description_vi'  => $data['action_description_vi'] ?? null,
            'responsible_person'     => $data['responsible_person'] ?? null,
            'target_date'            => $data['target_date'] ?? null,
            'completion_date'        => null,
            'status'                 => 'open',
            'new_severity'           => null,
            'new_occurrence'         => null,
            'new_detection'          => null,
            'new_rpn'                => null,
            'new_action_priority'    => null,
            'effectiveness_verified' => false,
            'verified_by'            => null,
            'verified_at'            => null,
            'metadata'               => $data['metadata'] ?? new \stdClass(),
            'created_at'             => $now,
        ];

        $actions   = $this->loadFile('actions');
        $actions[] = $record;
        $this->saveFile('actions', $actions);

        return $record;
    }

    /**
     * Complete an action with new S/O/D ratings (recalculates AP).
     *
     * @param string $actionId   Action identifier.
     * @param array  $newRatings ['new_severity'=>int, 'new_occurrence'=>int, 'new_detection'=>int].
     * @param string $userId     Completing user.
     * @return array Updated action.
     */
    public function completeAction(string $actionId, array $newRatings, string $userId): array
    {
        $actions = $this->loadFile('actions');
        $now     = $this->nowIso();

        foreach ($actions as $idx => $act) {
            if (!is_array($act)) {
                continue;
            }
            if (($act['action_id'] ?? '') !== $actionId) {
                continue;
            }

            $ns = isset($newRatings['new_severity'])  ? (int)$newRatings['new_severity']  : null;
            $no = isset($newRatings['new_occurrence']) ? (int)$newRatings['new_occurrence'] : null;
            $nd = isset($newRatings['new_detection'])  ? (int)$newRatings['new_detection']  : null;

            if ($ns !== null) {
                $this->validateRating($ns, 'new_severity');
            }
            if ($no !== null) {
                $this->validateRating($no, 'new_occurrence');
            }
            if ($nd !== null) {
                $this->validateRating($nd, 'new_detection');
            }

            $newRpn = ($ns ?? 1) * ($no ?? 1) * ($nd ?? 1);
            $newAp  = ($ns !== null && $no !== null && $nd !== null)
                ? $this->calculateActionPriority($ns, $no, $nd)
                : null;

            $actions[$idx] = array_merge($act, [
                'status'              => 'completed',
                'completion_date'     => substr($now, 0, 10),
                'new_severity'        => $ns,
                'new_occurrence'      => $no,
                'new_detection'       => $nd,
                'new_rpn'             => $newRpn,
                'new_action_priority' => $newAp,
                'completed_by'        => $userId,
                'completed_at'        => $now,
            ]);

            $this->saveFile('actions', $actions);
            return $actions[$idx];
        }

        throw new RuntimeException("FMEA action {$actionId} not found.");
    }

    // ── Action Priority (AIAG/VDA 2019) ───────────────────────────────────

    /**
     * Calculate Action Priority per AIAG/VDA FMEA Handbook (2019).
     *
     * HIGH:   S>=9 OR (S>=7 AND O>=4 AND D>=4) OR (S>=5 AND O>=7 AND D>=4)
     * MEDIUM: (S>=5 AND O>=4) OR (S>=3 AND O>=7) OR D>=7
     * LOW:    everything else
     *
     * @param int $severity   Severity rating (1-10).
     * @param int $occurrence Occurrence rating (1-10).
     * @param int $detection  Detection rating (1-10).
     * @return string 'high', 'medium', or 'low'.
     */
    public function calculateActionPriority(int $severity, int $occurrence, int $detection): string
    {
        // HIGH conditions
        if ($severity >= 9) {
            return 'high';
        }
        if ($severity >= 7 && $occurrence >= 4 && $detection >= 4) {
            return 'high';
        }
        if ($severity >= 5 && $occurrence >= 7 && $detection >= 4) {
            return 'high';
        }

        // MEDIUM conditions
        if ($severity >= 5 && $occurrence >= 4) {
            return 'medium';
        }
        if ($severity >= 3 && $occurrence >= 7) {
            return 'medium';
        }
        if ($detection >= 7) {
            return 'medium';
        }

        // LOW: everything else
        return 'low';
    }

    // ── RPN Trend ─────────────────────────────────────────────────────────

    /**
     * Get RPN trend for an FMEA: before and after optimization.
     */
    public function getRpnTrend(string $fmeaId): array
    {
        $allModes   = $this->loadFile('failure_modes');
        $allActions = $this->loadFile('actions');

        $trend = [];

        foreach ($allModes as $fm) {
            if (!is_array($fm) || ($fm['fmea_id'] ?? '') !== $fmeaId) {
                continue;
            }

            $fmId       = $fm['failure_mode_id'] ?? '';
            $beforeRpn  = (int)($fm['rpn'] ?? 0);
            $beforeAp   = $fm['action_priority'] ?? 'low';

            // Find completed actions for this failure mode with lowest new RPN
            $bestNewRpn = null;
            $bestNewAp  = null;
            foreach ($allActions as $act) {
                if (!is_array($act) || ($act['failure_mode_id'] ?? '') !== $fmId) {
                    continue;
                }
                if (($act['status'] ?? '') !== 'completed') {
                    continue;
                }
                $actRpn = $act['new_rpn'] ?? null;
                if ($actRpn !== null && ($bestNewRpn === null || $actRpn < $bestNewRpn)) {
                    $bestNewRpn = (int)$actRpn;
                    $bestNewAp  = $act['new_action_priority'] ?? null;
                }
            }

            $trend[] = [
                'failure_mode_id'    => $fmId,
                'failure_mode'       => $fm['failure_mode'] ?? '',
                'sequence'           => $fm['sequence'] ?? 0,
                'before_rpn'         => $beforeRpn,
                'before_ap'          => $beforeAp,
                'after_rpn'          => $bestNewRpn,
                'after_ap'           => $bestNewAp,
                'rpn_reduction'      => $bestNewRpn !== null ? $beforeRpn - $bestNewRpn : null,
                'rpn_reduction_pct'  => ($bestNewRpn !== null && $beforeRpn > 0)
                    ? round(($beforeRpn - $bestNewRpn) / $beforeRpn * 100, 1)
                    : null,
            ];
        }

        usort($trend, fn(array $a, array $b) => ($a['sequence'] ?? 0) <=> ($b['sequence'] ?? 0));

        return $trend;
    }

    // ── Cross-Linking ─────────────────────────────────────────────────────

    /**
     * Link an FMEA to a Control Plan.
     */
    public function linkToControlPlan(string $fmeaId, string $controlPlanId): void
    {
        $records = $this->loadFile('records');
        $now     = $this->nowIso();
        $found   = false;

        foreach ($records as $idx => $rec) {
            if (is_array($rec) && ($rec['fmea_id'] ?? '') === $fmeaId) {
                $records[$idx]['linked_control_plan_id'] = $controlPlanId;
                $records[$idx]['updated_at']             = $now;
                $found = true;
                break;
            }
        }

        if (!$found) {
            throw new RuntimeException("FMEA record {$fmeaId} not found.");
        }

        $this->saveFile('records', $records);
    }

    /**
     * Link an NCR to a failure mode (reverse FMEA from NCR).
     */
    public function linkToNcr(string $ncrId, string $failureModeId): void
    {
        // Verify failure mode exists
        $this->findRecord('failure_modes', 'failure_mode_id', $failureModeId);

        // Store link in failure mode metadata
        $allModes = $this->loadFile('failure_modes');
        $now      = $this->nowIso();

        foreach ($allModes as $idx => $fm) {
            if (is_array($fm) && ($fm['failure_mode_id'] ?? '') === $failureModeId) {
                $meta = $fm['metadata'] ?? [];
                if (!is_array($meta)) {
                    $meta = [];
                }
                $linkedNcrs = $meta['linked_ncr_ids'] ?? [];
                if (!in_array($ncrId, $linkedNcrs, true)) {
                    $linkedNcrs[] = $ncrId;
                }
                $meta['linked_ncr_ids']       = $linkedNcrs;
                $allModes[$idx]['metadata']    = $meta;
                $allModes[$idx]['updated_at']  = $now;
                break;
            }
        }

        $this->saveFile('failure_modes', $allModes);
    }

    // ── Control Plan Generation ───────────────────────────────────────────

    /**
     * Auto-generate a Control Plan from FMEA failure modes.
     *
     * Creates a control plan with one characteristic per failure mode
     * that has classification CC or SC, or action_priority high/medium.
     *
     * @param string $fmeaId Source FMEA record ID.
     * @return array Created control plan with characteristics.
     */
    public function generateControlPlanFromFmea(string $fmeaId): array
    {
        $fmea = $this->findRecord('records', 'fmea_id', $fmeaId);

        $cpNumber = $this->generateNumber('control_plan', 'CP', 3);
        $now      = $this->nowIso();
        $cpId     = $this->generateUuidV4();

        $controlPlan = [
            'control_plan_id'          => $cpId,
            'plan_number'              => $cpNumber,
            'plan_type'                => 'production',
            'title'                    => 'Control Plan from ' . ($fmea['fmea_number'] ?? $fmeaId),
            'title_vi'                 => 'Ke hoach kiem soat tu ' . ($fmea['fmea_number'] ?? $fmeaId),
            'item_id'                  => $fmea['item_id'] ?? null,
            'revision'                 => 1,
            'status'                   => 'draft',
            'linked_fmea_id'           => $fmeaId,
            'linked_pfmea_number'      => $fmea['fmea_number'] ?? null,
            'approved_by'              => null,
            'approved_at'              => null,
            'effective_date'           => null,
            'superseded_date'          => null,
            'customer_approval_required' => false,
            'customer_approved'        => false,
            'metadata'                 => new \stdClass(),
            'created_at'               => $now,
            'updated_at'               => $now,
        ];

        $plans   = $this->loadFile('control_plans');
        $plans[] = $controlPlan;
        $this->saveFile('control_plans', $plans);

        // Generate characteristics from failure modes
        $allModes = $this->loadFile('failure_modes');
        $chars    = $this->loadFile('control_plan_chars');
        $seq      = 0;

        foreach ($allModes as $fm) {
            if (!is_array($fm) || ($fm['fmea_id'] ?? '') !== $fmeaId) {
                continue;
            }

            $classification = $fm['classification'] ?? null;
            $ap             = $fm['action_priority'] ?? 'low';

            // Include if classified or medium/high AP
            if (!in_array($classification, ['CC', 'SC'], true) && !in_array($ap, ['high', 'medium'], true)) {
                continue;
            }

            $seq++;
            $char = [
                'characteristic_id'       => $this->generateUuidV4(),
                'control_plan_id'         => $cpId,
                'sequence'                => $seq,
                'process_step'            => $fm['process_step'] ?? null,
                'process_name'            => $fm['process_function'] ?? null,
                'machine_device'          => null,
                'characteristic_name'     => $fm['failure_mode'] ?? '',
                'characteristic_name_vi'  => $fm['failure_mode_vi'] ?? null,
                'classification'          => $classification,
                'product_spec'            => null,
                'process_spec'            => null,
                'evaluation_method'       => null,
                'sample_size'             => null,
                'sample_frequency'        => null,
                'control_method'          => $fm['current_detection_control'] ?? null,
                'reaction_plan'           => ($ap === 'high') ? 'stop_production' : 'notify_supervisor',
                'reaction_plan_detail'    => null,
                'responsible_role'        => null,
                'linked_failure_mode_id'  => $fm['failure_mode_id'] ?? null,
                'linked_inspection_plan_id' => null,
                'metadata'                => new \stdClass(),
                'created_at'              => $now,
            ];

            $chars[] = $char;
        }

        $this->saveFile('control_plan_chars', $chars);

        // Link FMEA to control plan
        $this->linkToControlPlan($fmeaId, $cpId);

        $controlPlan['characteristics'] = array_values(array_filter(
            $chars,
            fn($c) => is_array($c) && ($c['control_plan_id'] ?? '') === $cpId
        ));

        return $controlPlan;
    }

    // ── Revisions ─────────────────────────────────────────────────────────

    /**
     * Create a revision snapshot for an FMEA.
     */
    public function createRevision(string $fmeaId, string $userId, string $description): array
    {
        $detail   = $this->getDetail($fmeaId);
        $revs     = $this->loadFile('revisions');
        $now      = $this->nowIso();

        // Determine next revision number
        $maxRev = 0;
        foreach ($revs as $rev) {
            if (is_array($rev) && ($rev['fmea_id'] ?? '') === $fmeaId) {
                $maxRev = max($maxRev, (int)($rev['revision_number'] ?? 0));
            }
        }

        $newRevNum = $maxRev + 1;

        $revision = [
            'revision_id'       => $this->generateUuidV4(),
            'fmea_id'           => $fmeaId,
            'revision_number'   => $newRevNum,
            'changed_by'        => $userId,
            'change_description' => $description,
            'snapshot'          => $detail,
            'created_at'        => $now,
        ];

        $revs[] = $revision;
        $this->saveFile('revisions', $revs);

        // Update revision counter on FMEA record
        $records = $this->loadFile('records');
        foreach ($records as $idx => $rec) {
            if (is_array($rec) && ($rec['fmea_id'] ?? '') === $fmeaId) {
                $records[$idx]['revision']   = $newRevNum;
                $records[$idx]['updated_at'] = $now;
                break;
            }
        }
        $this->saveFile('records', $records);

        return $revision;
    }

    // ── Private Helpers ───────────────────────────────────────────────────

    private function getActionsForFailureMode(string $failureModeId): array
    {
        $actions = $this->loadFile('actions');
        $result  = [];

        foreach ($actions as $act) {
            if (is_array($act) && ($act['failure_mode_id'] ?? '') === $failureModeId) {
                $result[] = $act;
            }
        }

        return $result;
    }

    private function findRecord(string $file, string $key, string $value): array
    {
        $records = $this->loadFile($file);
        foreach ($records as $rec) {
            if (is_array($rec) && ($rec[$key] ?? '') === $value) {
                return $rec;
            }
        }
        throw new RuntimeException(ucfirst(str_replace('_', ' ', $file)) . " with {$key}={$value} not found.");
    }

    private function validateRating(int $value, string $name): void
    {
        if ($value < 1 || $value > 10) {
            throw new RuntimeException("{$name} must be between 1 and 10, got {$value}.");
        }
    }

    private function generateNumber(string $counterName, string $prefix, int $digits): string
    {
        $year        = date('Y');
        $counterFile = $this->dataDir . '/counters/' . $counterName . '_' . $year . '.json';

        $counter = 0;
        if (is_file($counterFile)) {
            $raw     = @file_get_contents($counterFile);
            $data    = json_decode($raw ?: '', true);
            $counter = (int)($data['counter'] ?? 0);
        }
        $counter++;

        $this->writeJson($counterFile, ['counter' => $counter, 'updated' => $this->nowIso()]);

        return $prefix . '-' . $year . '-' . str_pad((string)$counter, $digits, '0', STR_PAD_LEFT);
    }

    private function loadFile(string $name): array
    {
        $file = $this->fmeaDir . '/' . $name . '.json';
        return $this->readJson($file) ?? [];
    }

    private function saveFile(string $name, array $data): void
    {
        $file = $this->fmeaDir . '/' . $name . '.json';
        $this->writeJson($file, array_values($data));
    }

    private function readJson(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $tmp  = $path . '.tmp.' . getmypid();
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Cannot write ' . basename($path));
        }
        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }

    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
