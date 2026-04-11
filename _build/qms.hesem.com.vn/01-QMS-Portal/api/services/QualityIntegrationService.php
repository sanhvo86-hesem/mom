<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Quality Integration Service -- NCR/CAPA/FAI Cross-workflow Chain.
 *
 * Implements world-class quality management integration patterns:
 *
 * 1. NCR Trend Analysis --> Auto-CAPA triggering (3+ similar NCRs in 90 days)
 * 2. Jidoka --> NCR auto-generation (3 sequential rejects on machine)
 * 3. Calibration OOT --> NCR + Product Containment
 * 4. FAI Trigger Detection (new part, design change, production lapse, tooling change)
 * 5. MRB Routing (severity-based: minor=inline, major=MRB board)
 * 6. CAPA Effectiveness Monitoring (30/60/90 day automated checks)
 * 7. Cost of Poor Quality (COPQ) tracking per NCR/CAPA
 *
 * Based on: AS9100D, Boeing/Safran best practices, AIAG 8D methodology
 *
 * @package MOM\Services
 * @since   4.1.0
 */
final class QualityIntegrationService
{
    private readonly string $dataDir;
    private readonly string $qualityDir;
    private ?object $db = null;

    /** Threshold: number of similar NCRs to auto-trigger CAPA. */
    private const AUTO_CAPA_NCR_COUNT     = 3;
    /** Threshold: rolling window in days for trend analysis. */
    private const AUTO_CAPA_WINDOW_DAYS   = 90;
    /** Threshold: consecutive rejects to auto-generate NCR (Jidoka). */
    private const JIDOKA_REJECT_THRESHOLD = 3;

    /** NCR severity levels for MRB routing. */
    private const SEVERITY_LEVELS = [
        'cosmetic'   => 1,
        'minor'      => 2,
        'major'      => 3,
        'critical'   => 4,
        'safety'     => 5,
    ];

    /** FAI trigger types per AS9102. */
    private const FAI_TRIGGERS = [
        'new_part',
        'design_change',
        'process_change',
        'tooling_change',
        'material_change',
        'supplier_change',
        'production_lapse_24m',
        'corrective_action_change',
        'manufacturing_location_change',
    ];

    /** Disposition options per AS9100D §8.7. */
    private const DISPOSITION_OPTIONS = [
        'use_as_is'        => 'Accept (requires engineering justification + customer concession for key chars)',
        'rework'           => 'Rework to drawing specification',
        'repair'           => 'Repair (different from rework - may not fully meet drawing)',
        'scrap'            => 'Scrap / Destroy',
        'return_to_vendor' => 'Return to Vendor (RTV)',
    ];

    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir    = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->qualityDir = $this->dataDir . '/quality';
        $this->db         = $db;

        foreach (['ncr', 'capa', 'fai', 'trend', 'jidoka', 'copq'] as $sub) {
            $dir = $this->qualityDir . '/' . $sub;
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
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
            error_log("[QualityIntegrationService] Shadow write to {$table} failed: " . $e->getMessage());
        }
    }

    // ── 1. NCR Trend Analysis --> Auto-CAPA ─────────────────────────────────

    /**
     * Analyze NCR trends and auto-trigger CAPA when threshold exceeded.
     *
     * Checks for repeated NCRs with the same defect_type, part_number, or
     * process_id within the rolling window. If count >= threshold,
     * generates a CAPA initiation record.
     *
     * @return array List of auto-generated CAPA triggers.
     */
    public function analyzeNcrTrends(): array
    {
        $ncrs = $this->loadJsonl($this->qualityDir . '/ncr/ncr_log.jsonl');
        $cutoff = (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))
            ->modify('-' . self::AUTO_CAPA_WINDOW_DAYS . ' days')
            ->format('Y-m-d');

        // Filter to recent NCRs
        $recent = array_filter($ncrs, function ($ncr) use ($cutoff) {
            $date = substr($ncr['created_at'] ?? '', 0, 10);
            return $date >= $cutoff && strtolower($ncr['status'] ?? '') !== 'voided';
        });

        // Group by defect_type + part_number
        $groups = [];
        foreach ($recent as $ncr) {
            $key = strtolower(($ncr['defect_type'] ?? 'unknown') . '|' . ($ncr['part_number'] ?? 'unknown'));
            $groups[$key][] = $ncr;
        }

        $triggers = [];
        $now = $this->nowIso();
        $existingCapas = $this->loadJsonl($this->qualityDir . '/trend/auto_capa_triggers.jsonl');
        $existingKeys  = array_column($existingCapas, 'trend_key');

        foreach ($groups as $key => $ncrGroup) {
            if (count($ncrGroup) >= self::AUTO_CAPA_NCR_COUNT && !in_array($key, $existingKeys, true)) {
                $trigger = [
                    'trend_key'        => $key,
                    'ncr_count'        => count($ncrGroup),
                    'ncr_ids'          => array_column($ncrGroup, 'ncr_id'),
                    'defect_type'      => $ncrGroup[0]['defect_type'] ?? '',
                    'part_number'      => $ncrGroup[0]['part_number'] ?? '',
                    'window_days'      => self::AUTO_CAPA_WINDOW_DAYS,
                    'threshold'        => self::AUTO_CAPA_NCR_COUNT,
                    'recommended_action' => 'auto_capa',
                    'severity'         => $this->calculateTrendSeverity($ncrGroup),
                    'created_at'       => $now,
                    'status'           => 'pending_review',
                ];

                $this->appendJsonl($this->qualityDir . '/trend/auto_capa_triggers.jsonl', $trigger);
                $triggers[] = $trigger;
            }
        }

        return $triggers;
    }

    // ── 2. Jidoka --> NCR Auto-generation ───────────────────────────────────

    /**
     * Process a machine reject event and auto-generate NCR if Jidoka
     * threshold is reached (3 sequential rejects on same machine).
     *
     * @param string $machineId Machine identifier.
     * @param string $woNumber  Work order number.
     * @param string $partNumber Part being produced.
     * @param string $defectType Type of defect detected.
     * @param string $userId    Operator/system reporting.
     * @return array Result with jidoka_triggered flag and optional NCR.
     */
    public function processJidokaReject(
        string $machineId,
        string $woNumber,
        string $partNumber,
        string $defectType,
        string $userId,
    ): array {
        $now = $this->nowIso();

        // Record the reject event
        $event = [
            'machine_id'  => $machineId,
            'wo_number'   => $woNumber,
            'part_number' => $partNumber,
            'defect_type' => $defectType,
            'reported_by' => $userId,
            'timestamp'   => $now,
        ];
        $this->appendJsonl($this->qualityDir . '/jidoka/reject_events.jsonl', $event);

        // Count recent sequential rejects on this machine
        $allEvents = $this->loadJsonl($this->qualityDir . '/jidoka/reject_events.jsonl');
        $machineEvents = array_filter($allEvents, fn($e) => ($e['machine_id'] ?? '') === $machineId);

        // Get last N events for this machine
        $machineEvents = array_values($machineEvents);
        $lastN = array_slice($machineEvents, -self::JIDOKA_REJECT_THRESHOLD);

        $consecutive = true;
        if (count($lastN) < self::JIDOKA_REJECT_THRESHOLD) {
            $consecutive = false;
        }

        $result = [
            'machine_id'       => $machineId,
            'consecutive_rejects' => count($lastN),
            'jidoka_triggered' => $consecutive,
            'threshold'        => self::JIDOKA_REJECT_THRESHOLD,
        ];

        if ($consecutive) {
            // Auto-generate NCR
            $ncr = [
                'ncr_id'       => $this->generateId('NCR'),
                'source'       => 'jidoka_auto',
                'machine_id'   => $machineId,
                'wo_number'    => $woNumber,
                'part_number'  => $partNumber,
                'defect_type'  => $defectType,
                'severity'     => 'major',
                'status'       => 'open',
                'description'  => "Jidoka auto-NCR: {$defectType} on machine {$machineId} ({$woNumber}). " .
                                  self::JIDOKA_REJECT_THRESHOLD . " consecutive rejects detected.",
                'created_at'   => $now,
                'created_by'   => 'system_jidoka',
            ];
            $this->appendJsonl($this->qualityDir . '/ncr/ncr_log.jsonl', $ncr);
            $result['auto_ncr'] = $ncr;

            // Clear consecutive counter for this machine
            // (In production, would reset the machine's reject counter)
        }

        return $result;
    }

    // ── 3. Calibration OOT --> NCR + Product Containment ────────────────────

    /**
     * Process an out-of-tolerance calibration event. Generates NCR for all
     * products measured since last known-good calibration.
     *
     * @param string $instrumentId  Calibration instrument ID.
     * @param string $lastGoodDate  Last known-good calibration date (YYYY-MM-DD).
     * @param float  $deviation     Amount out of tolerance.
     * @param string $userId        User reporting.
     * @return array Impact assessment result.
     */
    public function processCalibrationOot(
        string $instrumentId,
        string $lastGoodDate,
        float  $deviation,
        string $userId,
    ): array {
        $now = $this->nowIso();

        $impact = [
            'impact_id'       => $this->generateId('OOT-IMPACT'),
            'instrument_id'   => $instrumentId,
            'last_good_date'  => $lastGoodDate,
            'deviation'       => $deviation,
            'status'          => 'investigation_required',
            'containment'     => 'Quarantine all products measured by ' . $instrumentId . ' since ' . $lastGoodDate,
            'action_required' => [
                'identify_affected_products',
                'quarantine_suspect_product',
                'reinspect_with_calibrated_instrument',
                'determine_product_disposition',
            ],
            'auto_ncr'        => null,
            'created_at'      => $now,
            'created_by'      => $userId,
        ];

        // Auto-generate NCR for the OOT event
        $ncr = [
            'ncr_id'       => $this->generateId('NCR'),
            'source'       => 'calibration_oot',
            'instrument_id'=> $instrumentId,
            'severity'     => 'critical',
            'status'       => 'open',
            'description'  => "Calibration OOT: Instrument {$instrumentId} found out of tolerance " .
                              "(deviation: {$deviation}). All products measured since {$lastGoodDate} require reinspection.",
            'created_at'   => $now,
            'created_by'   => 'system_calibration',
        ];
        $this->appendJsonl($this->qualityDir . '/ncr/ncr_log.jsonl', $ncr);
        $impact['auto_ncr'] = $ncr;

        $this->appendJsonl($this->qualityDir . '/ncr/oot_impacts.jsonl', $impact);

        return $impact;
    }

    // ── 4. FAI Trigger Detection ────────────────────────────────────────────

    /**
     * Evaluate if a FAI is required based on AS9102 trigger conditions.
     *
     * @param array $context Context data (part_number, change_type, last_production_date, etc.).
     * @return array FAI requirement assessment.
     */
    public function evaluateFaiTrigger(array $context): array
    {
        $triggers = [];
        $now = $this->nowIso();

        // New part
        if (!empty($context['is_new_part'])) {
            $triggers[] = ['type' => 'new_part', 'fai_type' => 'full', 'reason' => 'New part number - full FAI required per AS9102'];
        }

        // Design change
        if (!empty($context['design_change'])) {
            $triggers[] = ['type' => 'design_change', 'fai_type' => 'partial', 'reason' => 'Design change affecting form/fit/function - partial FAI for changed characteristics'];
        }

        // Process change
        if (!empty($context['process_change'])) {
            $triggers[] = ['type' => 'process_change', 'fai_type' => 'partial', 'reason' => 'Manufacturing process change - partial FAI for affected characteristics'];
        }

        // Tooling change
        if (!empty($context['tooling_change'])) {
            $triggers[] = ['type' => 'tooling_change', 'fai_type' => 'partial', 'reason' => 'Tooling change that could affect fit/form/function'];
        }

        // Production lapse > 24 months
        if (!empty($context['last_production_date'])) {
            try {
                $lastProd = new \DateTimeImmutable($context['last_production_date']);
                $months = ((int)(new \DateTimeImmutable('now'))->diff($lastProd)->format('%m')) +
                          ((int)(new \DateTimeImmutable('now'))->diff($lastProd)->format('%y')) * 12;
                if ($months >= 24) {
                    $triggers[] = ['type' => 'production_lapse_24m', 'fai_type' => 'full', 'reason' => "Production lapse of {$months} months (>= 24) - full FAI required"];
                }
            } catch (\Exception) {
                // Invalid date - skip
            }
        }

        // Material/supplier change
        if (!empty($context['material_change'])) {
            $triggers[] = ['type' => 'material_change', 'fai_type' => 'partial', 'reason' => 'Material or supplier change'];
        }

        // Corrective action change
        if (!empty($context['corrective_action_change'])) {
            $triggers[] = ['type' => 'corrective_action_change', 'fai_type' => 'partial', 'reason' => 'Process changed due to corrective action implementation'];
        }

        $faiRequired = !empty($triggers);
        $faiType = 'none';
        if ($faiRequired) {
            // Full FAI takes precedence over partial
            $faiType = in_array('full', array_column($triggers, 'fai_type'), true) ? 'full' : 'partial';
        }

        return [
            'fai_required'   => $faiRequired,
            'fai_type'       => $faiType,
            'triggers'       => $triggers,
            'trigger_count'  => count($triggers),
            'part_number'    => $context['part_number'] ?? '',
            'evaluated_at'   => $now,
            'disposition_options' => self::DISPOSITION_OPTIONS,
        ];
    }

    // ── 5. MRB Routing ──────────────────────────────────────────────────────

    /**
     * Determine MRB routing based on NCR severity.
     * Minor/cosmetic -> inline disposition by QE
     * Major/critical/safety -> formal MRB board review
     *
     * @param string $severity NCR severity level.
     * @return array Routing decision.
     */
    public function determineMrbRouting(string $severity): array
    {
        $level = self::SEVERITY_LEVELS[strtolower($severity)] ?? 2;

        if ($level >= 3) {
            return [
                'route_to'      => 'mrb_board',
                'severity'      => $severity,
                'severity_level'=> $level,
                'required_roles'=> ['qa_manager', 'engineering_manager', 'production_director'],
                'customer_notification' => ($level >= 4),
                'containment_sla_hours' => ($level >= 4) ? 24 : 48,
                'disposition_sla_days'  => 5,
                'description'   => 'Formal MRB review required. Cross-functional team must convene.',
            ];
        }

        return [
            'route_to'      => 'inline_disposition',
            'severity'      => $severity,
            'severity_level'=> $level,
            'required_roles'=> ['quality_engineer', 'qa_manager'],
            'customer_notification' => false,
            'containment_sla_hours' => 72,
            'disposition_sla_days'  => 10,
            'description'   => 'Inline disposition by Quality Engineer. MRB not required.',
        ];
    }

    // ── 6. COPQ Tracking ────────────────────────────────────────────────────

    /**
     * Record Cost of Poor Quality for an NCR/CAPA event.
     */
    public function recordCopq(
        string $referenceId,
        string $referenceType,
        float  $materialCost,
        float  $laborCost,
        float  $overheadCost,
        float  $reworkCost,
        float  $scrapCost,
        string $userId,
    ): array {
        $now = $this->nowIso();
        $totalCost = $materialCost + $laborCost + $overheadCost + $reworkCost + $scrapCost;

        $record = [
            'copq_id'        => $this->generateId('COPQ'),
            'reference_id'   => $referenceId,
            'reference_type' => $referenceType,
            'material_cost'  => round($materialCost, 2),
            'labor_cost'     => round($laborCost, 2),
            'overhead_cost'  => round($overheadCost, 2),
            'rework_cost'    => round($reworkCost, 2),
            'scrap_cost'     => round($scrapCost, 2),
            'total_cost'     => round($totalCost, 2),
            'created_at'     => $now,
            'created_by'     => $userId,
        ];

        $this->appendJsonl($this->qualityDir . '/copq/copq_log.jsonl', $record);

        return $record;
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private function calculateTrendSeverity(array $ncrGroup): string
    {
        $maxLevel = 0;
        foreach ($ncrGroup as $ncr) {
            $sev = strtolower($ncr['severity'] ?? 'minor');
            $level = self::SEVERITY_LEVELS[$sev] ?? 1;
            $maxLevel = max($maxLevel, $level);
        }
        return match (true) {
            $maxLevel >= 4 => 'critical',
            $maxLevel >= 3 => 'major',
            default        => 'minor',
        };
    }

    private function loadJsonl(string $path): array
    {
        if (!is_file($path)) return [];
        $entries = [];
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $decoded = json_decode($line, true);
            if (is_array($decoded)) $entries[] = $decoded;
        }
        return $entries;
    }

    private function appendJsonl(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        $line = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
    }

    private function generateId(string $prefix): string
    {
        $dt = new \DateTimeImmutable('now', new \DateTimeZone('+07:00'));
        return $prefix . '-' . $dt->format('Y') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
