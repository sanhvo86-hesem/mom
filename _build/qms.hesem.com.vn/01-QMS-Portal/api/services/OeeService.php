<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * OEE (Overall Equipment Effectiveness) Calculation Service.
 *
 * Implements world-class OEE tracking per TPM/Lean Manufacturing standards.
 * OEE = Availability x Performance x Quality
 *
 * World-class target: 85%+
 * - Availability >= 90% (uptime vs planned production time)
 * - Performance >= 95% (actual vs ideal cycle time)
 * - Quality >= 99.9% (good parts vs total parts, first-pass yield)
 *
 * Integration points:
 * - MES: Machine signals, downtime events, cycle times
 * - Quality: NCR auto-trigger when Quality factor drops below threshold
 * - Kaizen: Auto-generate improvement event when OEE < target
 * - Tier Meetings: Feed SQDCP daily management boards
 *
 * @package HESEM\QMS\Services
 * @since   4.1.0
 */
final class OeeService
{
    private readonly string $dataDir;
    private readonly string $oeeDir;

    /** OEE thresholds for escalation. */
    private const THRESHOLD_WORLD_CLASS  = 85.0;
    private const THRESHOLD_ACCEPTABLE   = 60.0;
    private const THRESHOLD_CRITICAL     = 40.0;

    /** Six Big Losses categories (TPM). */
    private const SIX_BIG_LOSSES = [
        'availability' => [
            'equipment_failure'     => 'Unplanned downtime / breakdown',
            'setup_adjustment'      => 'Setup & adjustment (changeover)',
        ],
        'performance' => [
            'idling_minor_stops'    => 'Idling & minor stoppages (< 5 min)',
            'reduced_speed'         => 'Running below ideal cycle time',
        ],
        'quality' => [
            'process_defects'       => 'Scrap & rework during production',
            'startup_rejects'       => 'Yield loss during startup/warmup',
        ],
    ];

    /** Optional database connection for PostgreSQL dual-write. */
    private ?object $db = null;

    /**
     * @param string      $dataDir Absolute path to qms-data directory.
     * @param object|null $db      Optional database connection for PostgreSQL dual-write.
     */
    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->oeeDir  = $this->dataDir . '/oee';
        $this->db      = $db;

        if (!is_dir($this->oeeDir)) {
            @mkdir($this->oeeDir, 0775, true);
        }
    }

    // ── OEE Calculation ────────────────────────────────────────────────────

    /**
     * Calculate OEE for a specific machine and shift/period.
     *
     * @param string $machineId       Machine identifier.
     * @param float  $plannedMinutes  Planned production time in minutes.
     * @param float  $downtimeMinutes Total downtime in minutes (planned + unplanned stops).
     * @param float  $idealCycleTime  Ideal cycle time per part in seconds.
     * @param int    $totalParts      Total parts produced (good + bad).
     * @param int    $goodParts       Good parts (first-pass, no rework).
     * @param string $shiftDate       Date "YYYY-MM-DD".
     * @param string $shiftId         Shift identifier (e.g. "morning", "afternoon", "night").
     * @param string $userId          User recording the data.
     * @return array Calculated OEE record.
     */
    public function calculateOee(
        string $machineId,
        float  $plannedMinutes,
        float  $downtimeMinutes,
        float  $idealCycleTime,
        int    $totalParts,
        int    $goodParts,
        string $shiftDate,
        string $shiftId,
        string $userId,
    ): array {
        $now = $this->nowIso();

        // Prevent division by zero
        if ($plannedMinutes <= 0) {
            throw new RuntimeException('Planned production time must be > 0.');
        }

        // ── Availability = Run Time / Planned Production Time
        $runTimeMinutes = max(0, $plannedMinutes - $downtimeMinutes);
        $availability   = $runTimeMinutes / $plannedMinutes;

        // ── Performance = (Ideal Cycle Time × Total Parts) / Run Time
        $performance = 0.0;
        if ($runTimeMinutes > 0 && $idealCycleTime > 0) {
            $idealRunMinutes = ($idealCycleTime * $totalParts) / 60;
            $performance     = min(1.0, $idealRunMinutes / $runTimeMinutes);
        }

        // ── Quality = Good Parts / Total Parts (First Pass Yield)
        $quality = ($totalParts > 0) ? ($goodParts / $totalParts) : 1.0;

        // ── OEE = A × P × Q
        $oee = $availability * $performance * $quality;

        // Determine status level
        $oeePercent = round($oee * 100, 1);
        $status = match (true) {
            $oeePercent >= self::THRESHOLD_WORLD_CLASS => 'world_class',
            $oeePercent >= self::THRESHOLD_ACCEPTABLE  => 'acceptable',
            $oeePercent >= self::THRESHOLD_CRITICAL     => 'below_target',
            default                                     => 'critical',
        };

        $record = [
            'oee_id'             => $this->generateId('OEE'),
            'machine_id'         => $machineId,
            'shift_date'         => $shiftDate,
            'shift_id'           => $shiftId,
            'planned_minutes'    => round($plannedMinutes, 1),
            'downtime_minutes'   => round($downtimeMinutes, 1),
            'run_time_minutes'   => round($runTimeMinutes, 1),
            'ideal_cycle_time_s' => round($idealCycleTime, 2),
            'total_parts'        => $totalParts,
            'good_parts'         => $goodParts,
            'reject_parts'       => $totalParts - $goodParts,
            'availability'       => round($availability * 100, 1),
            'performance'        => round($performance * 100, 1),
            'quality'            => round($quality * 100, 1),
            'oee'                => $oeePercent,
            'status'             => $status,
            'six_big_losses'     => self::SIX_BIG_LOSSES,
            'created_at'         => $now,
            'created_by'         => $userId,
        ];

        // Persist
        $this->appendRecord($shiftDate, $record);

        // Trigger escalation if needed
        $escalations = $this->evaluateEscalations($record);
        if (!empty($escalations)) {
            $record['escalations'] = $escalations;
        }

        return $record;
    }

    /**
     * Record a downtime event with reason coding per Six Big Losses.
     */
    public function recordDowntimeEvent(
        string $machineId,
        string $category,
        string $reasonCode,
        float  $durationMinutes,
        string $shiftDate,
        string $userId,
        string $description = '',
    ): array {
        $now = $this->nowIso();

        $event = [
            'event_id'         => $this->generateId('DT'),
            'machine_id'       => $machineId,
            'category'         => $category,
            'reason_code'      => $reasonCode,
            'duration_minutes' => round($durationMinutes, 1),
            'description'      => $description,
            'shift_date'       => $shiftDate,
            'created_at'       => $now,
            'created_by'       => $userId,
        ];

        $this->appendEvent('downtime', $shiftDate, $event);

        return $event;
    }

    // ── Dashboard / Analytics ───────────────────────────────────────────────

    /**
     * Get OEE summary for a date range, optionally filtered by machine.
     */
    public function getSummary(string $dateFrom, string $dateTo, ?string $machineId = null): array
    {
        $records = $this->loadRecordsInRange($dateFrom, $dateTo);

        if ($machineId !== null) {
            $records = array_filter($records, fn($r) => ($r['machine_id'] ?? '') === $machineId);
        }

        if (empty($records)) {
            return [
                'period'      => ['from' => $dateFrom, 'to' => $dateTo],
                'machine_id'  => $machineId,
                'record_count'=> 0,
                'avg_oee'     => 0,
                'avg_availability' => 0,
                'avg_performance'  => 0,
                'avg_quality'      => 0,
            ];
        }

        $count = count($records);
        $sumOee = $sumA = $sumP = $sumQ = 0.0;

        foreach ($records as $r) {
            $sumOee += (float)($r['oee'] ?? 0);
            $sumA   += (float)($r['availability'] ?? 0);
            $sumP   += (float)($r['performance'] ?? 0);
            $sumQ   += (float)($r['quality'] ?? 0);
        }

        return [
            'period'           => ['from' => $dateFrom, 'to' => $dateTo],
            'machine_id'       => $machineId,
            'record_count'     => $count,
            'avg_oee'          => round($sumOee / $count, 1),
            'avg_availability' => round($sumA / $count, 1),
            'avg_performance'  => round($sumP / $count, 1),
            'avg_quality'      => round($sumQ / $count, 1),
            'world_class_target' => self::THRESHOLD_WORLD_CLASS,
            'gap_to_world_class' => round(self::THRESHOLD_WORLD_CLASS - ($sumOee / $count), 1),
        ];
    }

    /**
     * Get Pareto analysis of downtime reasons for a date range.
     */
    public function getDowntimePareto(string $dateFrom, string $dateTo, ?string $machineId = null): array
    {
        $allEvents = [];
        $current = new \DateTimeImmutable($dateFrom);
        $end     = new \DateTimeImmutable($dateTo);

        while ($current <= $end) {
            $date = $current->format('Y-m-d');
            $file = $this->oeeDir . '/downtime_' . $date . '.jsonl';
            if (is_file($file)) {
                foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                    $event = json_decode($line, true);
                    if (!is_array($event)) continue;
                    if ($machineId !== null && ($event['machine_id'] ?? '') !== $machineId) continue;
                    $allEvents[] = $event;
                }
            }
            $current = $current->modify('+1 day');
        }

        // Group by reason_code
        $grouped = [];
        foreach ($allEvents as $e) {
            $code = $e['reason_code'] ?? 'unknown';
            if (!isset($grouped[$code])) {
                $grouped[$code] = ['reason_code' => $code, 'category' => $e['category'] ?? '', 'total_minutes' => 0, 'count' => 0];
            }
            $grouped[$code]['total_minutes'] += (float)($e['duration_minutes'] ?? 0);
            $grouped[$code]['count']++;
        }

        // Sort descending by total_minutes
        usort($grouped, fn($a, $b) => $b['total_minutes'] <=> $a['total_minutes']);

        // Calculate cumulative percentage
        $totalMinutes = array_sum(array_column($grouped, 'total_minutes'));
        $cumulative = 0;
        foreach ($grouped as $idx => $item) {
            $pct = ($totalMinutes > 0) ? ($item['total_minutes'] / $totalMinutes * 100) : 0;
            $cumulative += $pct;
            $grouped[$idx]['percentage']  = round($pct, 1);
            $grouped[$idx]['cumulative']  = round($cumulative, 1);
        }

        return [
            'period'        => ['from' => $dateFrom, 'to' => $dateTo],
            'machine_id'    => $machineId,
            'total_downtime_minutes' => round($totalMinutes, 1),
            'event_count'   => count($allEvents),
            'pareto'        => $grouped,
        ];
    }

    // ── Escalation Logic ────────────────────────────────────────────────────

    /**
     * Evaluate OEE record against thresholds and generate escalation actions.
     */
    private function evaluateEscalations(array $record): array
    {
        $actions = [];
        $oee = (float)($record['oee'] ?? 0);
        $quality = (float)($record['quality'] ?? 0);
        $now = $this->nowIso();

        // Critical OEE -> generate kaizen trigger
        if ($oee < self::THRESHOLD_CRITICAL) {
            $actions[] = [
                'action'     => 'kaizen_trigger',
                'severity'   => 'critical',
                'message'    => "OEE {$oee}% is CRITICAL (< " . self::THRESHOLD_CRITICAL . "%). Kaizen event recommended.",
                'machine_id' => $record['machine_id'] ?? '',
                'timestamp'  => $now,
            ];
        }

        // Below-target OEE -> tier meeting escalation
        if ($oee < self::THRESHOLD_ACCEPTABLE) {
            $actions[] = [
                'action'     => 'tier_meeting_escalation',
                'severity'   => 'warning',
                'message'    => "OEE {$oee}% below acceptable threshold (" . self::THRESHOLD_ACCEPTABLE . "%). Escalate to Tier 2 meeting.",
                'machine_id' => $record['machine_id'] ?? '',
                'timestamp'  => $now,
            ];
        }

        // Quality factor < 95% -> potential NCR auto-trigger
        if ($quality < 95.0) {
            $rejects = (int)($record['reject_parts'] ?? 0);
            $actions[] = [
                'action'     => 'quality_alert',
                'severity'   => ($quality < 90.0) ? 'critical' : 'warning',
                'message'    => "First-pass yield {$quality}% with {$rejects} rejects. Quality investigation recommended.",
                'machine_id' => $record['machine_id'] ?? '',
                'timestamp'  => $now,
            ];
        }

        // Persist escalation queue
        if (!empty($actions)) {
            $queueFile = $this->oeeDir . '/escalation_queue.jsonl';
            foreach ($actions as $action) {
                $action['oee_id'] = $record['oee_id'] ?? '';
                $line = json_encode($action, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
                @file_put_contents($queueFile, $line, FILE_APPEND | LOCK_EX);
            }
        }

        return $actions;
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private function appendRecord(string $date, array $record): void
    {
        // JSON file (primary)
        $file = $this->oeeDir . '/oee_' . $date . '.jsonl';
        $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

        // Shadow-write to mes_oee_snapshots (PostgreSQL)
        if ($this->db !== null) {
            try {
                $this->db->execute(
                    "INSERT INTO mes_oee_snapshots (equipment_id, snapshot_date, shift_code,
                        planned_production_time_sec, actual_run_time_sec, downtime_sec,
                        availability, ideal_cycle_time_sec, total_pieces, performance,
                        good_pieces, defect_pieces, rework_pieces, quality,
                        primary_job_number, metadata)
                     VALUES (:equip, :date::date, :shift,
                        :planned * 60, :run * 60, :down * 60,
                        :avail / 100.0, :ict, :total, :perf / 100.0,
                        :good, :reject, 0, :qual / 100.0,
                        :job, :meta::jsonb)
                     ON CONFLICT (equipment_id, snapshot_date, shift_code) DO UPDATE SET
                        availability = EXCLUDED.availability,
                        performance = EXCLUDED.performance,
                        quality = EXCLUDED.quality,
                        total_pieces = EXCLUDED.total_pieces,
                        good_pieces = EXCLUDED.good_pieces,
                        defect_pieces = EXCLUDED.defect_pieces,
                        metadata = EXCLUDED.metadata",
                    [
                        ':equip'   => $record['machine_id'] ?? '',
                        ':date'    => $record['shift_date'] ?? $date,
                        ':shift'   => $record['shift_id'] ?? 'default',
                        ':planned' => $record['planned_minutes'] ?? 0,
                        ':run'     => $record['run_time_minutes'] ?? 0,
                        ':down'    => $record['downtime_minutes'] ?? 0,
                        ':avail'   => $record['availability'] ?? 0,
                        ':ict'     => $record['ideal_cycle_time_s'] ?? 0,
                        ':total'   => $record['total_parts'] ?? 0,
                        ':perf'    => $record['performance'] ?? 0,
                        ':good'    => $record['good_parts'] ?? 0,
                        ':reject'  => $record['reject_parts'] ?? 0,
                        ':qual'    => $record['quality'] ?? 0,
                        ':job'     => '',
                        ':meta'    => json_encode($record, JSON_UNESCAPED_UNICODE),
                    ],
                );
            } catch (\Throwable $e) {
                error_log('[OeeService] Shadow write mes_oee_snapshots failed: ' . $e->getMessage());
            }
        }
    }

    private function appendEvent(string $type, string $date, array $event): void
    {
        // JSON file (primary)
        $file = $this->oeeDir . '/' . $type . '_' . $date . '.jsonl';
        $line = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

        // Shadow-write downtime events to mes_oee_loss_events (PostgreSQL)
        if ($this->db !== null && $type === 'downtime') {
            try {
                $this->db->execute(
                    "INSERT INTO mes_oee_loss_events (loss_time, equipment_id, loss_category, loss_reason_code, loss_reason_text, duration_seconds, shift_code, metadata)
                     VALUES (NOW(), :equip, :cat::oee_loss_category, :code, :text, :dur * 60, :shift, :meta::jsonb)",
                    [
                        ':equip' => $event['machine_id'] ?? '',
                        ':cat'   => $this->mapLossCategory($event['category'] ?? ''),
                        ':code'  => $event['reason_code'] ?? '',
                        ':text'  => $event['description'] ?? '',
                        ':dur'   => $event['duration_minutes'] ?? 0,
                        ':shift' => '',
                        ':meta'  => json_encode($event, JSON_UNESCAPED_UNICODE),
                    ],
                );
            } catch (\Throwable $e) {
                error_log('[OeeService] Shadow write mes_oee_loss_events failed: ' . $e->getMessage());
            }
        }
    }

    /**
     * Map service loss category to PostgreSQL enum oee_loss_category.
     */
    private function mapLossCategory(string $category): string
    {
        $map = [
            'equipment_failure'  => 'equipment_failure',
            'setup_adjustment'   => 'setup_adjustment',
            'idling_minor_stops' => 'idling_minor_stops',
            'reduced_speed'      => 'reduced_speed',
            'process_defects'    => 'process_defects',
            'startup_rejects'    => 'startup_rejects',
        ];
        return $map[strtolower($category)] ?? 'equipment_failure';
    }

    private function loadRecordsInRange(string $from, string $to): array
    {
        $records = [];
        $current = new \DateTimeImmutable($from);
        $end     = new \DateTimeImmutable($to);

        while ($current <= $end) {
            $date = $current->format('Y-m-d');
            $file = $this->oeeDir . '/oee_' . $date . '.jsonl';
            if (is_file($file)) {
                foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                    $decoded = json_decode($line, true);
                    if (is_array($decoded)) {
                        $records[] = $decoded;
                    }
                }
            }
            $current = $current->modify('+1 day');
        }

        return $records;
    }

    private function generateId(string $prefix): string
    {
        $dt = new \DateTimeImmutable('now', new \DateTimeZone('+07:00'));
        return $prefix . '-' . $dt->format('YmdHis') . '-' . substr(bin2hex(random_bytes(3)), 0, 6);
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
