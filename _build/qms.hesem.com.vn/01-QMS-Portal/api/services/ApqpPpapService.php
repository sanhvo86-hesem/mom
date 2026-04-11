<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * APQP & PPAP Service for HESEM MOM Portal.
 *
 * Manages APQP projects (AS9145 Advanced Product Quality Planning),
 * phase gate reviews, PPAP submissions, and deliverable tracking.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class ApqpPpapService
{
    private readonly string $dataDir;
    private readonly string $apqpDir;
    private ?object $db = null;

    /** APQP phases in order. */
    private const PHASES = [
        'phase1_planning',
        'phase2_product_design',
        'phase3_process_design',
        'phase4_validation',
        'phase5_production',
    ];

    /** Gate statuses. */
    private const GATE_STATUSES = ['not_started', 'in_progress', 'pending_review', 'approved', 'conditional', 'rejected'];

    /** PPAP element statuses. */
    private const PPAP_STATUSES = ['not_required', 'pending', 'submitted', 'approved', 'rejected', 'interim'];

    /** PPAP submission levels. */
    private const PPAP_LEVELS = ['level1', 'level2', 'level3', 'level4', 'level5'];

    /** Phase deliverables (AS9145). */
    private const PHASE_DELIVERABLES = [
        'phase1_planning' => [
            'voice_of_customer',
            'business_case',
            'product_requirements',
            'feasibility_study',
            'project_plan',
            'reliability_quality_targets',
        ],
        'phase2_product_design' => [
            'dfmea',
            'design_reviews',
            'prototype',
            'test_plans',
            'material_specs',
            'drawing_spec_approval',
        ],
        'phase3_process_design' => [
            'pfmea',
            'process_flow_diagram',
            'control_plan',
            'floor_plan',
            'packaging_standard',
            'msa_plan',
            'production_tooling',
        ],
        'phase4_validation' => [
            'trial_run',
            'msa',
            'initial_process_capability',
            'ppap_submission',
            'production_validation_testing',
        ],
        'phase5_production' => [
            'reduced_variation',
            'customer_satisfaction',
            'lessons_learned',
            'continuous_improvement',
        ],
    ];

    /** PPAP elements per submission level (AS9145 aerospace, 11 elements). */
    private const PPAP_ELEMENTS = [
        'design_records',
        'engineering_change_documents',
        'customer_engineering_approval',
        'dfmea',
        'process_flow_diagram',
        'pfmea',
        'control_plan',
        'msa_studies',
        'dimensional_results',
        'material_performance_test_results',
        'psw',
    ];

    /** Elements required per PPAP level. */
    private const PPAP_LEVEL_REQUIREMENTS = [
        'level1' => ['psw'],
        'level2' => ['psw', 'design_records', 'engineering_change_documents'],
        'level3' => [
            'design_records', 'engineering_change_documents', 'customer_engineering_approval',
            'dfmea', 'process_flow_diagram', 'pfmea', 'control_plan',
            'msa_studies', 'dimensional_results', 'material_performance_test_results', 'psw',
        ],
        'level4' => [
            'design_records', 'engineering_change_documents', 'customer_engineering_approval',
            'dfmea', 'process_flow_diagram', 'pfmea', 'control_plan',
            'msa_studies', 'dimensional_results', 'material_performance_test_results', 'psw',
        ],
        'level5' => [
            'design_records', 'engineering_change_documents', 'customer_engineering_approval',
            'dfmea', 'process_flow_diagram', 'pfmea', 'control_plan',
            'msa_studies', 'dimensional_results', 'material_performance_test_results', 'psw',
        ],
    ];

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->apqpDir = $this->dataDir . '/apqp';
        $this->db      = $db;

        foreach (['projects', 'gates', 'ppap'] as $sub) {
            $dir = $this->apqpDir . '/' . $sub;
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
            error_log("[ApqpPpapService] Shadow write to {$table} failed: " . $e->getMessage());
        }
    }

    // ── Projects ──────────────────────────────────────────────────────────

    /**
     * Create a new APQP project.
     *
     * @param array  $data   Project data.
     * @param string $userId Creating user.
     * @return array Created project.
     */
    public function createProject(array $data, string $userId): array
    {
        $apqpNumber = $this->generateNumber('apqp', 'APQP', 3);
        $now        = $this->nowIso();
        $apqpId     = $this->generateUuidV4();

        $record = [
            'apqp_id'               => $apqpId,
            'apqp_number'           => $apqpNumber,
            'title'                 => $data['title'] ?? '',
            'title_vi'              => $data['title_vi'] ?? '',
            'item_id'               => $data['item_id'] ?? null,
            'customer_id'           => $data['customer_id'] ?? null,
            'npi_id'                => $data['npi_id'] ?? null,
            'current_phase'         => 'phase1_planning',
            'overall_status'        => 'not_started',
            'project_lead'          => $data['project_lead'] ?? $userId,
            'team_members'          => $data['team_members'] ?? [],
            'target_ppap_date'      => $data['target_ppap_date'] ?? null,
            'actual_ppap_date'      => null,
            'ppap_submission_level' => $data['ppap_submission_level'] ?? 'level3',
            'linked_fmea_id'        => $data['linked_fmea_id'] ?? null,
            'linked_control_plan_id' => $data['linked_control_plan_id'] ?? null,
            'linked_so_number'      => $data['linked_so_number'] ?? null,
            'metadata'              => $data['metadata'] ?? new \stdClass(),
            'created_at'            => $now,
            'updated_at'            => $now,
            'created_by'            => $userId,
        ];

        $projects   = $this->loadFile('projects');
        $projects[] = $record;
        $this->saveFile('projects', $projects);

        return $record;
    }

    /**
     * Update an existing APQP project.
     */
    public function updateProject(string $apqpId, array $updates, string $userId): array
    {
        $projects = $this->loadFile('projects');
        $now      = $this->nowIso();

        foreach ($projects as $idx => $rec) {
            if (!is_array($rec)) {
                continue;
            }
            if (($rec['apqp_id'] ?? '') !== $apqpId) {
                continue;
            }

            unset($updates['apqp_id'], $updates['apqp_number'], $updates['created_at']);

            $projects[$idx] = array_merge($rec, $updates, [
                'updated_at' => $now,
                'updated_by' => $userId,
            ]);

            $this->saveFile('projects', $projects);
            return $projects[$idx];
        }

        throw new RuntimeException("APQP project {$apqpId} not found.");
    }

    /**
     * Advance project to the next phase (validates gate is approved first).
     *
     * @param string $apqpId     APQP project ID.
     * @param string $targetPhase Target phase to advance to.
     * @param string $userId     Requesting user.
     * @return array Updated project.
     */
    public function advancePhase(string $apqpId, string $targetPhase, string $userId): array
    {
        $project = $this->findRecord('projects', 'apqp_id', $apqpId);

        $currentPhase = $project['current_phase'] ?? 'phase1_planning';
        $currentIdx   = array_search($currentPhase, self::PHASES, true);
        $targetIdx    = array_search($targetPhase, self::PHASES, true);

        if ($targetIdx === false) {
            throw new RuntimeException("Invalid target phase: {$targetPhase}.");
        }
        if ($targetIdx <= $currentIdx) {
            throw new RuntimeException("Target phase must be after current phase ({$currentPhase}).");
        }

        // Validate that the current phase gate is approved or conditional
        $gates = $this->loadFile('gates');
        $currentGate = null;
        foreach ($gates as $gate) {
            if (is_array($gate) && ($gate['apqp_id'] ?? '') === $apqpId && ($gate['phase'] ?? '') === $currentPhase) {
                $currentGate = $gate;
                break;
            }
        }

        if ($currentGate === null || !in_array($currentGate['status'] ?? '', ['approved', 'conditional'], true)) {
            throw new RuntimeException("Gate for phase {$currentPhase} must be approved before advancing.");
        }

        return $this->updateProject($apqpId, [
            'current_phase'  => $targetPhase,
            'overall_status' => 'in_progress',
        ], $userId);
    }

    // ── Gate Reviews ──────────────────────────────────────────────────────

    /**
     * Submit a gate review for a phase.
     */
    public function submitGateReview(string $apqpId, string $phase, array $reviewData, string $userId): array
    {
        // Verify project exists
        $this->findRecord('projects', 'apqp_id', $apqpId);

        if (!in_array($phase, self::PHASES, true)) {
            throw new RuntimeException("Invalid phase: {$phase}.");
        }

        $gates = $this->loadFile('gates');
        $now   = $this->nowIso();

        // Find existing gate or create new
        $existingIdx = null;
        foreach ($gates as $idx => $gate) {
            if (is_array($gate) && ($gate['apqp_id'] ?? '') === $apqpId && ($gate['phase'] ?? '') === $phase) {
                $existingIdx = $idx;
                break;
            }
        }

        $phaseIdx   = array_search($phase, self::PHASES, true);
        $gateNumber = $phaseIdx !== false ? $phaseIdx + 1 : 1;

        $gateRecord = [
            'gate_id'             => $existingIdx !== null ? ($gates[$existingIdx]['gate_id'] ?? $this->generateUuidV4()) : $this->generateUuidV4(),
            'apqp_id'             => $apqpId,
            'phase'               => $phase,
            'gate_number'         => $gateNumber,
            'review_date'         => $reviewData['review_date'] ?? date('Y-m-d'),
            'status'              => 'pending_review',
            'reviewers'           => $reviewData['reviewers'] ?? [],
            'deliverables_status' => $reviewData['deliverables_status'] ?? new \stdClass(),
            'conditions'          => $reviewData['conditions'] ?? null,
            'action_items'        => $reviewData['action_items'] ?? [],
            'approved_by'         => null,
            'approved_at'         => null,
            'meeting_minutes'     => $reviewData['meeting_minutes'] ?? null,
            'evidence_refs'       => $reviewData['evidence_refs'] ?? [],
            'metadata'            => $reviewData['metadata'] ?? new \stdClass(),
            'created_at'          => $existingIdx !== null ? ($gates[$existingIdx]['created_at'] ?? $now) : $now,
            'submitted_by'        => $userId,
            'submitted_at'        => $now,
        ];

        if ($existingIdx !== null) {
            $gates[$existingIdx] = $gateRecord;
        } else {
            $gates[] = $gateRecord;
        }

        $this->saveFile('gates', $gates);

        return $gateRecord;
    }

    /**
     * Approve a gate review.
     */
    public function approveGate(string $apqpId, string $phase, string $userId, ?string $conditions = null): array
    {
        $gates = $this->loadFile('gates');
        $now   = $this->nowIso();

        foreach ($gates as $idx => $gate) {
            if (!is_array($gate)) {
                continue;
            }
            if (($gate['apqp_id'] ?? '') !== $apqpId || ($gate['phase'] ?? '') !== $phase) {
                continue;
            }

            $status = $conditions !== null ? 'conditional' : 'approved';

            $gates[$idx] = array_merge($gate, [
                'status'      => $status,
                'conditions'  => $conditions ?? $gate['conditions'],
                'approved_by' => $userId,
                'approved_at' => $now,
            ]);

            $this->saveFile('gates', $gates);

            // Update project overall status
            $this->updateProject($apqpId, ['overall_status' => 'in_progress'], $userId);

            return $gates[$idx];
        }

        throw new RuntimeException("Gate review for APQP {$apqpId} phase {$phase} not found.");
    }

    /**
     * Reject a gate review.
     */
    public function rejectGate(string $apqpId, string $phase, string $userId, string $reason): array
    {
        $gates = $this->loadFile('gates');
        $now   = $this->nowIso();

        foreach ($gates as $idx => $gate) {
            if (!is_array($gate)) {
                continue;
            }
            if (($gate['apqp_id'] ?? '') !== $apqpId || ($gate['phase'] ?? '') !== $phase) {
                continue;
            }

            $gates[$idx] = array_merge($gate, [
                'status'          => 'rejected',
                'conditions'      => $reason,
                'rejected_by'     => $userId,
                'rejected_at'     => $now,
            ]);

            $this->saveFile('gates', $gates);
            return $gates[$idx];
        }

        throw new RuntimeException("Gate review for APQP {$apqpId} phase {$phase} not found.");
    }

    // ── PPAP Submissions ──────────────────────────────────────────────────

    /**
     * Create a PPAP submission.
     */
    public function createPpapSubmission(string $apqpId, array $data, string $userId): array
    {
        $project = $this->findRecord('projects', 'apqp_id', $apqpId);

        $now          = $this->nowIso();
        $submissionId = $this->generateUuidV4();
        $level        = $data['submission_level'] ?? $project['ppap_submission_level'] ?? 'level3';

        // Initialize elements structure
        $requiredElements = self::PPAP_LEVEL_REQUIREMENTS[$level] ?? self::PPAP_LEVEL_REQUIREMENTS['level3'];
        $elements         = [];
        foreach (self::PPAP_ELEMENTS as $element) {
            $elements[$element] = [
                'status'   => in_array($element, $requiredElements, true) ? 'pending' : 'not_required',
                'ref'      => null,
                'notes'    => null,
            ];
        }

        $record = [
            'submission_id'          => $submissionId,
            'apqp_id'               => $apqpId,
            'item_id'               => $data['item_id'] ?? $project['item_id'] ?? null,
            'customer_id'           => $data['customer_id'] ?? $project['customer_id'] ?? null,
            'submission_level'      => $level,
            'submission_date'       => $data['submission_date'] ?? null,
            'overall_status'        => 'pending',
            'customer_response'     => null,
            'customer_response_date' => null,
            'elements'              => $elements,
            'psw_number'            => $data['psw_number'] ?? null,
            'psw_signed_by'         => null,
            'psw_signed_date'       => null,
            'interim_approval_expiry' => null,
            'metadata'              => $data['metadata'] ?? new \stdClass(),
            'created_at'            => $now,
            'updated_at'            => $now,
            'created_by'            => $userId,
        ];

        $submissions   = $this->loadFile('ppap');
        $submissions[] = $record;
        $this->saveFile('ppap', $submissions);

        return $record;
    }

    /**
     * Update a specific PPAP element status.
     */
    public function updatePpapElement(string $submissionId, string $element, string $status, ?string $ref = null): array
    {
        if (!in_array($element, self::PPAP_ELEMENTS, true)) {
            throw new RuntimeException("Invalid PPAP element: {$element}.");
        }
        if (!in_array($status, self::PPAP_STATUSES, true)) {
            throw new RuntimeException("Invalid PPAP element status: {$status}.");
        }

        $submissions = $this->loadFile('ppap');
        $now         = $this->nowIso();

        foreach ($submissions as $idx => $sub) {
            if (!is_array($sub)) {
                continue;
            }
            if (($sub['submission_id'] ?? '') !== $submissionId) {
                continue;
            }

            $elements = $sub['elements'] ?? [];
            if (!is_array($elements)) {
                $elements = [];
            }

            $elements[$element] = [
                'status'     => $status,
                'ref'        => $ref ?? ($elements[$element]['ref'] ?? null),
                'notes'      => $elements[$element]['notes'] ?? null,
                'updated_at' => $now,
            ];

            $submissions[$idx]['elements']   = $elements;
            $submissions[$idx]['updated_at'] = $now;

            // Check if all required elements are approved -> overall approved
            $allApproved = true;
            foreach ($elements as $elName => $elData) {
                if (!is_array($elData)) {
                    continue;
                }
                $elStatus = $elData['status'] ?? 'pending';
                if ($elStatus !== 'not_required' && $elStatus !== 'approved') {
                    $allApproved = false;
                    break;
                }
            }
            if ($allApproved) {
                $submissions[$idx]['overall_status'] = 'approved';
            }

            $this->saveFile('ppap', $submissions);
            return $submissions[$idx];
        }

        throw new RuntimeException("PPAP submission {$submissionId} not found.");
    }

    /**
     * Record customer response to a PPAP submission.
     */
    public function recordCustomerResponse(string $submissionId, string $response, ?string $date = null): array
    {
        $submissions = $this->loadFile('ppap');
        $now         = $this->nowIso();

        foreach ($submissions as $idx => $sub) {
            if (!is_array($sub)) {
                continue;
            }
            if (($sub['submission_id'] ?? '') !== $submissionId) {
                continue;
            }

            $submissions[$idx]['customer_response']      = $response;
            $submissions[$idx]['customer_response_date']  = $date ?? date('Y-m-d');
            $submissions[$idx]['updated_at']              = $now;

            // Map customer response to overall status
            $responseMap = [
                'approved'  => 'approved',
                'rejected'  => 'rejected',
                'interim'   => 'interim',
            ];
            if (isset($responseMap[$response])) {
                $submissions[$idx]['overall_status'] = $responseMap[$response];
            }

            $this->saveFile('ppap', $submissions);
            return $submissions[$idx];
        }

        throw new RuntimeException("PPAP submission {$submissionId} not found.");
    }

    // ── Deliverables & Elements Reference ─────────────────────────────────

    /**
     * Return checklist of required deliverables per APQP phase.
     */
    public function getPhaseDeliverables(string $phase): array
    {
        if (!isset(self::PHASE_DELIVERABLES[$phase])) {
            throw new RuntimeException("Invalid APQP phase: {$phase}.");
        }

        return [
            'phase'        => $phase,
            'deliverables' => self::PHASE_DELIVERABLES[$phase],
        ];
    }

    /**
     * Return required PPAP elements per submission level (AS9145).
     */
    public function getPpapElements(string $level): array
    {
        if (!isset(self::PPAP_LEVEL_REQUIREMENTS[$level])) {
            throw new RuntimeException("Invalid PPAP level: {$level}.");
        }

        $required = self::PPAP_LEVEL_REQUIREMENTS[$level];
        $result   = [];

        foreach (self::PPAP_ELEMENTS as $element) {
            $result[] = [
                'element'  => $element,
                'required' => in_array($element, $required, true),
            ];
        }

        return [
            'level'    => $level,
            'elements' => $result,
        ];
    }

    // ── Queries ───────────────────────────────────────────────────────────

    /**
     * List APQP projects with optional filters.
     */
    public function listProjects(array $filters = []): array
    {
        $projects = $this->loadFile('projects');
        $result   = [];

        foreach ($projects as $rec) {
            if (!is_array($rec)) {
                continue;
            }
            if (isset($filters['current_phase']) && $filters['current_phase'] !== '') {
                if (($rec['current_phase'] ?? '') !== $filters['current_phase']) {
                    continue;
                }
            }
            if (isset($filters['overall_status']) && $filters['overall_status'] !== '') {
                if (($rec['overall_status'] ?? '') !== $filters['overall_status']) {
                    continue;
                }
            }
            if (isset($filters['customer_id']) && $filters['customer_id'] !== '') {
                if (($rec['customer_id'] ?? '') !== $filters['customer_id']) {
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
     * Get full APQP project detail with gate reviews and PPAP submissions.
     */
    public function getDetail(string $apqpId): array
    {
        $project = $this->findRecord('projects', 'apqp_id', $apqpId);

        // Attach gate reviews
        $allGates = $this->loadFile('gates');
        $gates    = [];
        foreach ($allGates as $gate) {
            if (is_array($gate) && ($gate['apqp_id'] ?? '') === $apqpId) {
                $gates[] = $gate;
            }
        }
        usort($gates, fn(array $a, array $b) => ($a['gate_number'] ?? 0) <=> ($b['gate_number'] ?? 0));
        $project['gate_reviews'] = $gates;

        // Attach PPAP submissions
        $allPpap      = $this->loadFile('ppap');
        $submissions  = [];
        foreach ($allPpap as $sub) {
            if (is_array($sub) && ($sub['apqp_id'] ?? '') === $apqpId) {
                $submissions[] = $sub;
            }
        }
        usort($submissions, fn(array $a, array $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
        $project['ppap_submissions'] = $submissions;

        return $project;
    }

    /**
     * Dashboard: projects by phase, overdue gates, PPAP pending.
     */
    public function getDashboard(): array
    {
        $projects = $this->loadFile('projects');
        $gates    = $this->loadFile('gates');
        $ppap     = $this->loadFile('ppap');
        $today    = date('Y-m-d');

        // Projects by phase
        $byPhase = [];
        foreach (self::PHASES as $phase) {
            $byPhase[$phase] = 0;
        }
        $totalProjects = 0;
        foreach ($projects as $proj) {
            if (!is_array($proj)) {
                continue;
            }
            $totalProjects++;
            $phase = $proj['current_phase'] ?? 'phase1_planning';
            if (isset($byPhase[$phase])) {
                $byPhase[$phase]++;
            }
        }

        // Overdue gates (pending_review or in_progress past review_date)
        $overdueGates = [];
        foreach ($gates as $gate) {
            if (!is_array($gate)) {
                continue;
            }
            $status     = $gate['status'] ?? '';
            $reviewDate = $gate['review_date'] ?? null;
            if (in_array($status, ['pending_review', 'in_progress', 'not_started'], true)
                && $reviewDate !== null && $reviewDate < $today) {
                $overdueGates[] = [
                    'apqp_id'     => $gate['apqp_id'] ?? '',
                    'phase'       => $gate['phase'] ?? '',
                    'review_date' => $reviewDate,
                    'status'      => $status,
                ];
            }
        }

        // PPAP pending
        $ppapPending  = 0;
        $ppapApproved = 0;
        $ppapRejected = 0;
        foreach ($ppap as $sub) {
            if (!is_array($sub)) {
                continue;
            }
            $os = $sub['overall_status'] ?? '';
            if ($os === 'pending' || $os === 'submitted') {
                $ppapPending++;
            } elseif ($os === 'approved') {
                $ppapApproved++;
            } elseif ($os === 'rejected') {
                $ppapRejected++;
            }
        }

        // Overdue PPAP (target_ppap_date past today)
        $overduePpap = 0;
        foreach ($projects as $proj) {
            if (!is_array($proj)) {
                continue;
            }
            $targetDate  = $proj['target_ppap_date'] ?? null;
            $actualDate  = $proj['actual_ppap_date'] ?? null;
            if ($targetDate !== null && $targetDate < $today && $actualDate === null) {
                $overduePpap++;
            }
        }

        return [
            'total_projects'   => $totalProjects,
            'by_phase'         => $byPhase,
            'overdue_gates'    => $overdueGates,
            'ppap_pending'     => $ppapPending,
            'ppap_approved'    => $ppapApproved,
            'ppap_rejected'    => $ppapRejected,
            'overdue_ppap'     => $overduePpap,
            'generated_at'     => $this->nowIso(),
        ];
    }

    // ── Private Helpers ───────────────────────────────────────────────────

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
        $file = $this->apqpDir . '/' . $name . '.json';
        return $this->readJson($file) ?? [];
    }

    private function saveFile(string $name, array $data): void
    {
        $file = $this->apqpDir . '/' . $name . '.json';
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
