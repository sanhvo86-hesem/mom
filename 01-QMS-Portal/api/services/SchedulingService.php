<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * APS Lite Scheduling Service for HESEM QMS Portal.
 *
 * Manages production schedule slots, conflict detection/resolution,
 * capacity heatmaps, and promise-date suggestions.
 *
 * Uses JSON file storage in `qms-data/scheduling/`.
 *
 * @package HESEM\QMS\Services
 * @since   3.0.0
 */
final class SchedulingService
{
    /** Valid slot types. */
    private const SLOT_TYPES = ['production', 'setup', 'maintenance', 'idle', 'reserved'];

    /** Valid conflict types. */
    private const CONFLICT_TYPES = ['machine_overlap', 'operator_overlap', 'material_unavailable', 'tooling_unavailable', 'maintenance_window'];

    /** Default shift definitions (minutes). */
    private const SHIFTS = [
        'day'   => ['start' => '06:00', 'end' => '14:00', 'minutes' => 480],
        'swing' => ['start' => '14:00', 'end' => '22:00', 'minutes' => 480],
        'night' => ['start' => '22:00', 'end' => '06:00', 'minutes' => 480],
    ];

    /** @var string Absolute path to qms-data directory. */
    private readonly string $dataDir;

    /** @var string Absolute path to scheduling directory. */
    private readonly string $scheduleDir;

    /** @var string Absolute path to slots file. */
    private readonly string $slotsFile;

    /** @var string Absolute path to conflicts file. */
    private readonly string $conflictsFile;

    /** @var string Absolute path to capacity snapshots file. */
    private readonly string $capacityFile;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to qms-data directory.
     */
    public function __construct(string $dataDir)
    {
        $this->dataDir      = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->scheduleDir  = $this->dataDir . '/scheduling';
        $this->slotsFile    = $this->scheduleDir . '/slots.json';
        $this->conflictsFile = $this->scheduleDir . '/conflicts.json';
        $this->capacityFile = $this->scheduleDir . '/capacity.json';

        // Ensure directories exist
        if (!is_dir($this->scheduleDir)) {
            @mkdir($this->scheduleDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Get schedule slots grouped by machine and date for Gantt rendering.
     *
     * @param string      $startDate  Start date (YYYY-MM-DD).
     * @param string      $endDate    End date (YYYY-MM-DD).
     * @param string|null $machineId  Optional machine filter.
     * @return array<string, array<string, array>> Grouped as [machine_id => [date => slots[]]].
     */
    public function getSchedule(string $startDate, string $endDate, ?string $machineId = null): array
    {
        $slots  = $this->readJsonFile($this->slotsFile) ?? [];
        $result = [];

        foreach ($slots as $slot) {
            if (!is_array($slot)) {
                continue;
            }

            $slotDate = $slot['slot_date'] ?? '';
            $slotMachine = $slot['machine_id'] ?? '';

            // Date range filter
            if ($slotDate < $startDate || $slotDate > $endDate) {
                continue;
            }

            // Machine filter
            if ($machineId !== null && $slotMachine !== $machineId) {
                continue;
            }

            $result[$slotMachine][$slotDate][] = $slot;
        }

        // Sort slots within each day by start_time
        foreach ($result as $machine => &$dates) {
            foreach ($dates as $date => &$daySlots) {
                usort($daySlots, fn(array $a, array $b) =>
                    strcmp($a['start_time'] ?? '00:00', $b['start_time'] ?? '00:00'));
            }
            unset($daySlots);
            ksort($dates);
        }
        unset($dates);

        return $result;
    }

    /**
     * Create a new schedule slot, validating for conflicts.
     *
     * @param array<string, mixed> $data   Slot data.
     * @param string               $userId Creating user UUID.
     * @return array<string, mixed> Created slot with any detected conflicts.
     */
    public function createSlot(array $data, string $userId): array
    {
        $slots = $this->readJsonFile($this->slotsFile) ?? [];

        $slot = [
            'slot_id'          => $this->generateUuidV4(),
            'machine_id'       => $data['machine_id'] ?? '',
            'wo_number'        => $data['wo_number'] ?? null,
            'jo_number'        => $data['jo_number'] ?? null,
            'slot_date'        => $data['slot_date'] ?? '',
            'start_time'       => $data['start_time'] ?? null,
            'end_time'         => $data['end_time'] ?? null,
            'shift'            => $data['shift'] ?? null,
            'duration_minutes' => $data['duration_minutes'] ?? null,
            'slot_type'        => $data['slot_type'] ?? 'production',
            'operator_id'      => $data['operator_id'] ?? null,
            'priority'         => (int)($data['priority'] ?? 50),
            'is_locked'        => false,
            'locked_by'        => null,
            'locked_reason'    => null,
            'metadata'         => $data['metadata'] ?? [],
            'created_at'       => gmdate('c'),
            'updated_at'       => gmdate('c'),
            'created_by'       => $userId,
        ];

        // Validate required fields
        if ($slot['machine_id'] === '' || $slot['slot_date'] === '') {
            throw new RuntimeException('machine_id and slot_date are required.');
        }

        // Validate slot_type
        if (!in_array($slot['slot_type'], self::SLOT_TYPES, true)) {
            throw new RuntimeException('Invalid slot_type. Must be one of: ' . implode(', ', self::SLOT_TYPES));
        }

        // Auto-calculate duration if start/end provided
        if ($slot['start_time'] !== null && $slot['end_time'] !== null && $slot['duration_minutes'] === null) {
            $slot['duration_minutes'] = $this->calculateDurationMinutes($slot['start_time'], $slot['end_time']);
        }

        // Check for conflicts before inserting
        $conflicts = $this->detectSlotConflicts($slot, $slots);

        $slots[] = $slot;
        $this->writeJsonFileAtomic($this->slotsFile, $slots);

        // Store any detected conflicts
        if (!empty($conflicts)) {
            $existingConflicts = $this->readJsonFile($this->conflictsFile) ?? [];
            foreach ($conflicts as $conflict) {
                $existingConflicts[] = $conflict;
            }
            $this->writeJsonFileAtomic($this->conflictsFile, $existingConflicts);
        }

        return [
            'slot'      => $slot,
            'conflicts' => $conflicts,
        ];
    }

    /**
     * Update an existing schedule slot (supports drag-and-drop rescheduling).
     *
     * @param string               $slotId  Slot UUID.
     * @param array<string, mixed> $updates Fields to update.
     * @param string               $userId  Updating user UUID.
     * @return array<string, mixed> Updated slot with any new conflicts.
     */
    public function updateSlot(string $slotId, array $updates, string $userId): array
    {
        $slots = $this->readJsonFile($this->slotsFile) ?? [];
        $found = false;
        $updatedSlot = null;

        foreach ($slots as &$slot) {
            if (($slot['slot_id'] ?? '') === $slotId) {
                // Check if locked
                if (($slot['is_locked'] ?? false) && $userId !== ($slot['locked_by'] ?? '')) {
                    throw new RuntimeException('Slot is locked by another user.');
                }

                // Apply updates (only allowed fields)
                $allowedFields = [
                    'machine_id', 'wo_number', 'jo_number', 'slot_date',
                    'start_time', 'end_time', 'shift', 'duration_minutes',
                    'slot_type', 'operator_id', 'priority', 'is_locked',
                    'locked_by', 'locked_reason', 'metadata',
                ];

                foreach ($allowedFields as $field) {
                    if (array_key_exists($field, $updates)) {
                        $slot[$field] = $updates[$field];
                    }
                }

                $slot['updated_at']  = gmdate('c');
                $slot['updated_by']  = $userId;

                // Recalculate duration if times changed
                if (isset($updates['start_time']) || isset($updates['end_time'])) {
                    if ($slot['start_time'] !== null && $slot['end_time'] !== null) {
                        $slot['duration_minutes'] = $this->calculateDurationMinutes(
                            $slot['start_time'],
                            $slot['end_time']
                        );
                    }
                }

                $updatedSlot = $slot;
                $found       = true;
                break;
            }
        }
        unset($slot);

        if (!$found) {
            throw new RuntimeException('Slot not found: ' . $slotId);
        }

        // Re-validate conflicts after move
        $conflicts = $this->detectSlotConflicts($updatedSlot, $slots, $slotId);

        $this->writeJsonFileAtomic($this->slotsFile, $slots);

        // Store any new conflicts (remove old ones for this slot first)
        $existingConflicts = $this->readJsonFile($this->conflictsFile) ?? [];
        $existingConflicts = array_values(array_filter($existingConflicts, function (array $c) use ($slotId) {
            return ($c['slot_id_a'] ?? '') !== $slotId && ($c['slot_id_b'] ?? '') !== $slotId;
        }));

        foreach ($conflicts as $conflict) {
            $existingConflicts[] = $conflict;
        }
        $this->writeJsonFileAtomic($this->conflictsFile, $existingConflicts);

        return [
            'slot'      => $updatedSlot,
            'conflicts' => $conflicts,
        ];
    }

    /**
     * Delete a schedule slot.
     *
     * @param string $slotId Slot UUID.
     * @param string $userId Deleting user UUID.
     * @return void
     */
    public function deleteSlot(string $slotId, string $userId): void
    {
        $slots = $this->readJsonFile($this->slotsFile) ?? [];
        $found = false;

        $filtered = [];
        foreach ($slots as $slot) {
            if (($slot['slot_id'] ?? '') === $slotId) {
                if (($slot['is_locked'] ?? false) && $userId !== ($slot['locked_by'] ?? '')) {
                    throw new RuntimeException('Slot is locked by another user.');
                }
                $found = true;
                continue;
            }
            $filtered[] = $slot;
        }

        if (!$found) {
            throw new RuntimeException('Slot not found: ' . $slotId);
        }

        $this->writeJsonFileAtomic($this->slotsFile, $filtered);

        // Remove related conflicts
        $conflicts = $this->readJsonFile($this->conflictsFile) ?? [];
        $conflicts = array_values(array_filter($conflicts, function (array $c) use ($slotId) {
            return ($c['slot_id_a'] ?? '') !== $slotId && ($c['slot_id_b'] ?? '') !== $slotId;
        }));
        $this->writeJsonFileAtomic($this->conflictsFile, $conflicts);
    }

    /**
     * Detect all scheduling conflicts in a date range.
     *
     * Checks for: machine overlaps, operator overlaps, maintenance window
     * conflicts.
     *
     * @param string $startDate Start date (YYYY-MM-DD).
     * @param string $endDate   End date (YYYY-MM-DD).
     * @return array<int, array<string, mixed>> Detected conflicts.
     */
    public function detectConflicts(string $startDate, string $endDate): array
    {
        $slots      = $this->readJsonFile($this->slotsFile) ?? [];
        $conflicts  = [];

        // Filter slots in range
        $rangeSlots = [];
        foreach ($slots as $slot) {
            $date = $slot['slot_date'] ?? '';
            if ($date >= $startDate && $date <= $endDate) {
                $rangeSlots[] = $slot;
            }
        }

        $n = count($rangeSlots);

        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                $a = $rangeSlots[$i];
                $b = $rangeSlots[$j];

                // Machine overlap: same machine, same date, overlapping times
                if (($a['machine_id'] ?? '') === ($b['machine_id'] ?? '')
                    && ($a['slot_date'] ?? '') === ($b['slot_date'] ?? '')
                    && $this->timesOverlap($a, $b)
                ) {
                    $conflicts[] = [
                        'conflict_id'    => $this->generateUuidV4(),
                        'conflict_type'  => 'machine_overlap',
                        'severity'       => 'warning',
                        'slot_id_a'      => $a['slot_id'] ?? null,
                        'slot_id_b'      => $b['slot_id'] ?? null,
                        'machine_id'     => $a['machine_id'] ?? '',
                        'conflict_date'  => $a['slot_date'] ?? '',
                        'description'    => 'Machine ' . ($a['machine_id'] ?? '') . ' double-booked on '
                                          . ($a['slot_date'] ?? '') . ' (' . ($a['start_time'] ?? '') . '-'
                                          . ($a['end_time'] ?? '') . ' vs ' . ($b['start_time'] ?? '') . '-'
                                          . ($b['end_time'] ?? '') . ').',
                        'description_vi' => 'May ' . ($a['machine_id'] ?? '') . ' bi dat trung vao '
                                          . ($a['slot_date'] ?? '') . '.',
                        'resolved'       => false,
                        'metadata'       => [],
                        'created_at'     => gmdate('c'),
                    ];
                }

                // Operator overlap: same operator, same date, overlapping times, different machines
                $opA = $a['operator_id'] ?? '';
                $opB = $b['operator_id'] ?? '';
                if ($opA !== '' && $opA === $opB
                    && ($a['slot_date'] ?? '') === ($b['slot_date'] ?? '')
                    && ($a['machine_id'] ?? '') !== ($b['machine_id'] ?? '')
                    && $this->timesOverlap($a, $b)
                ) {
                    $conflicts[] = [
                        'conflict_id'    => $this->generateUuidV4(),
                        'conflict_type'  => 'operator_overlap',
                        'severity'       => 'warning',
                        'slot_id_a'      => $a['slot_id'] ?? null,
                        'slot_id_b'      => $b['slot_id'] ?? null,
                        'machine_id'     => null,
                        'conflict_date'  => $a['slot_date'] ?? '',
                        'description'    => 'Operator ' . $opA . ' scheduled on both '
                                          . ($a['machine_id'] ?? '') . ' and ' . ($b['machine_id'] ?? '')
                                          . ' on ' . ($a['slot_date'] ?? '') . '.',
                        'description_vi' => 'Cong nhan ' . $opA . ' bi xep lich tren 2 may cung luc vao '
                                          . ($a['slot_date'] ?? '') . '.',
                        'resolved'       => false,
                        'metadata'       => [],
                        'created_at'     => gmdate('c'),
                    ];
                }

                // Maintenance window conflict: production slot vs maintenance slot
                $typeA = $a['slot_type'] ?? 'production';
                $typeB = $b['slot_type'] ?? 'production';
                if (($typeA === 'maintenance' && $typeB === 'production')
                    || ($typeA === 'production' && $typeB === 'maintenance')
                ) {
                    if (($a['machine_id'] ?? '') === ($b['machine_id'] ?? '')
                        && ($a['slot_date'] ?? '') === ($b['slot_date'] ?? '')
                        && $this->timesOverlap($a, $b)
                    ) {
                        $conflicts[] = [
                            'conflict_id'    => $this->generateUuidV4(),
                            'conflict_type'  => 'maintenance_window',
                            'severity'       => 'critical',
                            'slot_id_a'      => $a['slot_id'] ?? null,
                            'slot_id_b'      => $b['slot_id'] ?? null,
                            'machine_id'     => $a['machine_id'] ?? '',
                            'conflict_date'  => $a['slot_date'] ?? '',
                            'description'    => 'Production slot conflicts with planned maintenance on '
                                              . ($a['machine_id'] ?? '') . ' on ' . ($a['slot_date'] ?? '') . '.',
                            'description_vi' => 'Lich san xuat xung dot voi lich bao tri tren may '
                                              . ($a['machine_id'] ?? '') . ' vao ' . ($a['slot_date'] ?? '') . '.',
                            'resolved'       => false,
                            'metadata'       => [],
                            'created_at'     => gmdate('c'),
                        ];
                    }
                }
            }
        }

        return $conflicts;
    }

    /**
     * Resolve a scheduling conflict.
     *
     * @param string $conflictId Conflict UUID.
     * @param string $action     Resolution action description.
     * @param string $userId     Resolving user UUID.
     * @return array<string, mixed> Updated conflict record.
     */
    public function resolveConflict(string $conflictId, string $action, string $userId): array
    {
        $conflicts = $this->readJsonFile($this->conflictsFile) ?? [];

        foreach ($conflicts as &$conflict) {
            if (($conflict['conflict_id'] ?? '') === $conflictId) {
                $conflict['resolved']          = true;
                $conflict['resolved_by']       = $userId;
                $conflict['resolved_at']       = gmdate('c');
                $conflict['resolution_action'] = $action;

                $this->writeJsonFileAtomic($this->conflictsFile, $conflicts);
                return $conflict;
            }
        }
        unset($conflict);

        throw new RuntimeException('Conflict not found: ' . $conflictId);
    }

    /**
     * Get a capacity heatmap for machines over a date range.
     *
     * Returns per-machine per-day utilisation with colour coding:
     *   green  = < 70%
     *   amber  = 70-90%
     *   red    = > 90%
     *
     * @param string $startDate Start date (YYYY-MM-DD).
     * @param string $endDate   End date (YYYY-MM-DD).
     * @return array<string, array<string, array{utilization_pct: float, color: string, scheduled_minutes: float, available_minutes: float}>>
     */
    public function getCapacityHeatmap(string $startDate, string $endDate): array
    {
        $slots   = $this->readJsonFile($this->slotsFile) ?? [];
        $heatmap = [];

        // Default available minutes per machine per day (3 shifts = 1440 min)
        $defaultAvailable = 1440.0;

        foreach ($slots as $slot) {
            if (!is_array($slot)) {
                continue;
            }

            $date    = $slot['slot_date'] ?? '';
            $machine = $slot['machine_id'] ?? '';

            if ($date < $startDate || $date > $endDate || $machine === '') {
                continue;
            }

            if (!isset($heatmap[$machine][$date])) {
                $heatmap[$machine][$date] = [
                    'scheduled_minutes' => 0.0,
                    'available_minutes' => $defaultAvailable,
                ];
            }

            $duration = (float)($slot['duration_minutes'] ?? 0);
            if ($duration <= 0 && $slot['start_time'] !== null && $slot['end_time'] !== null) {
                $duration = $this->calculateDurationMinutes($slot['start_time'], $slot['end_time']);
            }

            $heatmap[$machine][$date]['scheduled_minutes'] += $duration;
        }

        // Calculate utilisation and assign colour
        foreach ($heatmap as $machine => &$dates) {
            foreach ($dates as $date => &$info) {
                $pct = $info['available_minutes'] > 0
                    ? round(($info['scheduled_minutes'] / $info['available_minutes']) * 100, 1)
                    : 0.0;

                $info['utilization_pct'] = $pct;

                if ($pct > 90) {
                    $info['color'] = 'red';
                } elseif ($pct >= 70) {
                    $info['color'] = 'amber';
                } else {
                    $info['color'] = 'green';
                }
            }
            unset($info);
            ksort($dates);
        }
        unset($dates);

        return $heatmap;
    }

    /**
     * Calculate and store a daily capacity snapshot for all machines.
     *
     * @param string $date Date (YYYY-MM-DD).
     * @return void
     */
    public function snapshotCapacity(string $date): void
    {
        $slots     = $this->readJsonFile($this->slotsFile) ?? [];
        $snapshots = $this->readJsonFile($this->capacityFile) ?? [];

        // Aggregate by machine for the given date
        $machineData = [];

        foreach ($slots as $slot) {
            if (($slot['slot_date'] ?? '') !== $date) {
                continue;
            }

            $machine = $slot['machine_id'] ?? '';
            if ($machine === '') {
                continue;
            }

            if (!isset($machineData[$machine])) {
                $machineData[$machine] = [
                    'scheduled_minutes'   => 0.0,
                    'setup_minutes'       => 0.0,
                    'idle_minutes'        => 0.0,
                    'maintenance_minutes' => 0.0,
                    'production_minutes'  => 0.0,
                    'jobs_completed'      => 0,
                    'parts_produced'      => 0,
                ];
            }

            $duration = (float)($slot['duration_minutes'] ?? 0);
            $type     = $slot['slot_type'] ?? 'production';

            $machineData[$machine]['scheduled_minutes'] += $duration;

            switch ($type) {
                case 'setup':
                    $machineData[$machine]['setup_minutes'] += $duration;
                    break;
                case 'idle':
                    $machineData[$machine]['idle_minutes'] += $duration;
                    break;
                case 'maintenance':
                    $machineData[$machine]['maintenance_minutes'] += $duration;
                    break;
                default:
                    $machineData[$machine]['production_minutes'] += $duration;
                    break;
            }

            // Count completed jobs from metadata
            $machineData[$machine]['jobs_completed'] += (int)($slot['metadata']['jobs_completed'] ?? 0);
            $machineData[$machine]['parts_produced'] += (int)($slot['metadata']['parts_produced'] ?? 0);
        }

        // Remove old snapshots for this date
        $snapshots = array_values(array_filter($snapshots, function (array $s) use ($date) {
            return ($s['snapshot_date'] ?? '') !== $date;
        }));

        // Create new snapshots
        $availableMinutes = 1440.0; // 24 hours

        foreach ($machineData as $machine => $data) {
            $utilPct = $availableMinutes > 0
                ? round(($data['scheduled_minutes'] / $availableMinutes) * 100, 1)
                : 0.0;

            $snapshots[] = [
                'snapshot_id'         => $this->generateUuidV4(),
                'machine_id'          => $machine,
                'snapshot_date'       => $date,
                'available_minutes'   => $availableMinutes,
                'scheduled_minutes'   => $data['scheduled_minutes'],
                'actual_minutes'      => $data['production_minutes'],
                'utilization_pct'     => $utilPct,
                'setup_minutes'       => $data['setup_minutes'],
                'idle_minutes'        => $data['idle_minutes'],
                'maintenance_minutes' => $data['maintenance_minutes'],
                'downtime_minutes'    => 0.0,
                'jobs_completed'      => $data['jobs_completed'],
                'parts_produced'      => $data['parts_produced'],
                'metadata'            => [],
                'created_at'          => gmdate('c'),
            ];
        }

        $this->writeJsonFileAtomic($this->capacityFile, $snapshots);
    }

    /**
     * Suggest the earliest promise date for a job, given required duration.
     *
     * Searches forward from today for available slot blocks on any machine
     * that fit the required duration.
     *
     * @param string $joNumber         Job order number (for reference).
     * @param int    $estimatedMinutes Required production minutes.
     * @return array{suggested_date: string, machine_id: string, confidence: float, alternatives: array}
     */
    public function suggestPromiseDate(string $joNumber, int $estimatedMinutes): array
    {
        $slots    = $this->readJsonFile($this->slotsFile) ?? [];
        $today    = date('Y-m-d');
        $maxDays  = 60; // Search up to 60 days ahead
        $available = 1440.0; // minutes per day

        // Collect all machines
        $machines = [];
        foreach ($slots as $slot) {
            $m = $slot['machine_id'] ?? '';
            if ($m !== '' && !in_array($m, $machines, true)) {
                $machines[] = $m;
            }
        }

        if (empty($machines)) {
            return [
                'suggested_date' => $today,
                'machine_id'     => '',
                'confidence'     => 50.0,
                'alternatives'   => [],
            ];
        }

        // Build scheduled-minutes lookup: [machine][date] => total minutes
        $scheduledMap = [];
        foreach ($slots as $slot) {
            $m = $slot['machine_id'] ?? '';
            $d = $slot['slot_date'] ?? '';
            if ($m === '' || $d === '') {
                continue;
            }
            $scheduledMap[$m][$d] = ($scheduledMap[$m][$d] ?? 0.0) + (float)($slot['duration_minutes'] ?? 0);
        }

        $bestDate    = null;
        $bestMachine = '';
        $alternatives = [];

        foreach ($machines as $machine) {
            // Accumulate available minutes scanning forward day by day
            $accumulatedFree = 0.0;
            $startDate       = $today;

            for ($dayOffset = 0; $dayOffset < $maxDays; $dayOffset++) {
                $checkDate = date('Y-m-d', strtotime($today . ' +' . $dayOffset . ' days'));
                $scheduled = $scheduledMap[$machine][$checkDate] ?? 0.0;
                $freeToday = max(0.0, $available - $scheduled);
                $accumulatedFree += $freeToday;

                if ($accumulatedFree >= $estimatedMinutes) {
                    $promiseDate = $checkDate;

                    if ($bestDate === null || $promiseDate < $bestDate) {
                        // Move previous best to alternatives
                        if ($bestDate !== null) {
                            $alternatives[] = [
                                'date'       => $bestDate,
                                'machine_id' => $bestMachine,
                            ];
                        }
                        $bestDate    = $promiseDate;
                        $bestMachine = $machine;
                    } else {
                        $alternatives[] = [
                            'date'       => $promiseDate,
                            'machine_id' => $machine,
                        ];
                    }
                    break;
                }
            }
        }

        // Limit alternatives
        $alternatives = array_slice($alternatives, 0, 5);

        return [
            'suggested_date' => $bestDate ?? date('Y-m-d', strtotime($today . ' +' . $maxDays . ' days')),
            'machine_id'     => $bestMachine,
            'confidence'     => $bestDate !== null ? 85.0 : 30.0,
            'alternatives'   => $alternatives,
        ];
    }

    /**
     * Find available time blocks on a machine that fit the required duration.
     *
     * @param string $machineId       Machine identifier.
     * @param string $startDate       Start date (YYYY-MM-DD).
     * @param string $endDate         End date (YYYY-MM-DD).
     * @param int    $durationMinutes Required block duration in minutes.
     * @return array<int, array{date: string, start_time: string, end_time: string, available_minutes: float}>
     */
    public function getAvailableSlots(string $machineId, string $startDate, string $endDate, int $durationMinutes): array
    {
        $slots     = $this->readJsonFile($this->slotsFile) ?? [];
        $available = [];

        // Group existing slots by date for this machine
        $occupiedByDate = [];
        foreach ($slots as $slot) {
            if (($slot['machine_id'] ?? '') !== $machineId) {
                continue;
            }
            $date = $slot['slot_date'] ?? '';
            if ($date >= $startDate && $date <= $endDate) {
                $occupiedByDate[$date][] = [
                    'start' => $slot['start_time'] ?? '00:00',
                    'end'   => $slot['end_time'] ?? '23:59',
                ];
            }
        }

        // Scan each day in range
        $current = $startDate;
        while ($current <= $endDate) {
            $dayOccupied = $occupiedByDate[$current] ?? [];

            // Sort occupied slots by start time
            usort($dayOccupied, fn(array $a, array $b) => strcmp($a['start'], $b['start']));

            // Find gaps between occupied slots (working day: 06:00 - 22:00)
            $dayStart = '06:00';
            $dayEnd   = '22:00';
            $cursor   = $dayStart;

            foreach ($dayOccupied as $occ) {
                if ($occ['start'] > $cursor) {
                    // Gap found between cursor and this slot's start
                    $gapMinutes = $this->calculateDurationMinutes($cursor, $occ['start']);
                    if ($gapMinutes >= $durationMinutes) {
                        $available[] = [
                            'date'              => $current,
                            'start_time'        => $cursor,
                            'end_time'          => $occ['start'],
                            'available_minutes' => $gapMinutes,
                        ];
                    }
                }
                // Move cursor to end of this occupied slot
                if ($occ['end'] > $cursor) {
                    $cursor = $occ['end'];
                }
            }

            // Check remaining gap at end of day
            if ($cursor < $dayEnd) {
                $gapMinutes = $this->calculateDurationMinutes($cursor, $dayEnd);
                if ($gapMinutes >= $durationMinutes) {
                    $available[] = [
                        'date'              => $current,
                        'start_time'        => $cursor,
                        'end_time'          => $dayEnd,
                        'available_minutes' => $gapMinutes,
                    ];
                }
            }

            $current = date('Y-m-d', strtotime($current . ' +1 day'));
        }

        return $available;
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    /**
     * Detect conflicts for a single slot against existing slots.
     *
     * @param array  $newSlot      The slot to check.
     * @param array  $existingSlots All existing slots.
     * @param string|null $excludeSlotId Slot ID to exclude (for updates).
     * @return array<int, array<string, mixed>> Detected conflicts.
     */
    private function detectSlotConflicts(array $newSlot, array $existingSlots, ?string $excludeSlotId = null): array
    {
        $conflicts = [];

        foreach ($existingSlots as $existing) {
            $existingId = $existing['slot_id'] ?? '';

            // Skip self
            if ($excludeSlotId !== null && $existingId === $excludeSlotId) {
                continue;
            }

            // Skip if different date
            if (($existing['slot_date'] ?? '') !== ($newSlot['slot_date'] ?? '')) {
                continue;
            }

            // Check time overlap
            if (!$this->timesOverlap($newSlot, $existing)) {
                continue;
            }

            // Machine overlap
            if (($existing['machine_id'] ?? '') === ($newSlot['machine_id'] ?? '')) {
                $conflicts[] = [
                    'conflict_id'   => $this->generateUuidV4(),
                    'conflict_type' => 'machine_overlap',
                    'severity'      => 'warning',
                    'slot_id_a'     => $newSlot['slot_id'] ?? null,
                    'slot_id_b'     => $existingId,
                    'machine_id'    => $newSlot['machine_id'] ?? '',
                    'conflict_date' => $newSlot['slot_date'] ?? '',
                    'description'   => 'Machine overlap on ' . ($newSlot['machine_id'] ?? '') . '.',
                    'description_vi' => 'Trung lich may ' . ($newSlot['machine_id'] ?? '') . '.',
                    'resolved'      => false,
                    'metadata'      => [],
                    'created_at'    => gmdate('c'),
                ];
            }

            // Operator overlap (different machines, same operator)
            $newOp = $newSlot['operator_id'] ?? '';
            $exOp  = $existing['operator_id'] ?? '';
            if ($newOp !== '' && $newOp === $exOp
                && ($existing['machine_id'] ?? '') !== ($newSlot['machine_id'] ?? '')
            ) {
                $conflicts[] = [
                    'conflict_id'   => $this->generateUuidV4(),
                    'conflict_type' => 'operator_overlap',
                    'severity'      => 'warning',
                    'slot_id_a'     => $newSlot['slot_id'] ?? null,
                    'slot_id_b'     => $existingId,
                    'machine_id'    => null,
                    'conflict_date' => $newSlot['slot_date'] ?? '',
                    'description'   => 'Operator ' . $newOp . ' double-booked.',
                    'description_vi' => 'Cong nhan ' . $newOp . ' bi xep lich trung.',
                    'resolved'      => false,
                    'metadata'      => [],
                    'created_at'    => gmdate('c'),
                ];
            }
        }

        return $conflicts;
    }

    /**
     * Check whether two slots have overlapping time ranges.
     *
     * @param array $a First slot.
     * @param array $b Second slot.
     * @return bool True if times overlap.
     */
    private function timesOverlap(array $a, array $b): bool
    {
        $aStart = $a['start_time'] ?? null;
        $aEnd   = $a['end_time'] ?? null;
        $bStart = $b['start_time'] ?? null;
        $bEnd   = $b['end_time'] ?? null;

        // If either slot has no times, assume potential overlap
        if ($aStart === null || $aEnd === null || $bStart === null || $bEnd === null) {
            return true;
        }

        // Standard interval overlap: A.start < B.end AND B.start < A.end
        return $aStart < $bEnd && $bStart < $aEnd;
    }

    /**
     * Calculate duration in minutes between two HH:MM time strings.
     *
     * @param string $startTime Start time (HH:MM).
     * @param string $endTime   End time (HH:MM).
     * @return float Duration in minutes.
     */
    private function calculateDurationMinutes(string $startTime, string $endTime): float
    {
        $startParts = explode(':', $startTime);
        $endParts   = explode(':', $endTime);

        $startMinutes = ((int)($startParts[0] ?? 0)) * 60 + ((int)($startParts[1] ?? 0));
        $endMinutes   = ((int)($endParts[0] ?? 0)) * 60 + ((int)($endParts[1] ?? 0));

        // Handle overnight slots
        if ($endMinutes <= $startMinutes) {
            $endMinutes += 1440; // add 24 hours
        }

        return (float)($endMinutes - $startMinutes);
    }

    /**
     * Read a JSON file from disk.
     *
     * @param string $path Absolute path.
     * @return array<string, mixed>|null
     */
    private function readJsonFile(string $path): ?array
    {
        if (!file_exists($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Write a JSON file atomically (tmp + rename).
     *
     * @param string $path File path.
     * @param array  $data Data to encode.
     * @return void
     */
    private function writeJsonFileAtomic(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }

        $tmpFile = $path . '.tmp.' . getmypid();
        if (@file_put_contents($tmpFile, $json, LOCK_EX) === false) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to write ' . basename($path));
        }

        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmpFile, $path)) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    /**
     * Generate a UUID v4.
     *
     * @return string UUID in lowercase 8-4-4-4-12 format.
     */
    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant RFC 4122

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
