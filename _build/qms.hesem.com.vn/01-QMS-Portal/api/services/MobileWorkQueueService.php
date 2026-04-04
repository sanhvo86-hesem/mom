<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Mobile Work Queue Service for HESEM QMS Portal.
 *
 * Manages operator work queues, time clock entries, first-piece and
 * in-process inspection captures from tablets, offline sync, and
 * shop floor overview dashboards.
 *
 * @package HESEM\QMS\Services
 * @since   4.0.0
 */
final class MobileWorkQueueService
{
    private readonly string $dataDir;
    private readonly string $mobileDir;
    private ?object $db = null;

    /** Valid task types. */
    private const TASK_TYPES = [
        'clock_in', 'clock_out', 'first_piece', 'in_process_inspection',
        'final_inspection', 'material_move', 'tool_request', 'ncr_report',
        'setup_complete', 'operation_complete',
    ];

    /** Valid task statuses. */
    private const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'blocked'];

    /** Valid labor types. */
    private const LABOR_TYPES = ['setup', 'run', 'rework', 'inspection', 'indirect', 'idle'];

    /** Valid capture types. */
    private const CAPTURE_TYPES = ['first_piece', 'in_process', 'final', 'receiving'];

    /** Valid sync statuses. */
    private const SYNC_STATUSES = ['synced', 'pending_sync', 'conflict'];

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir   = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->mobileDir = $this->dataDir . '/mobile';
        $this->db        = $db;

        foreach (['work_queue', 'time_entries', 'inspections'] as $sub) {
            $dir = $this->mobileDir . '/' . $sub;
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
            error_log("[MobileWorkQueueService] Shadow write to {$table} failed: " . $e->getMessage());
        }
    }

    // ── Work Queue ────────────────────────────────────────────────────────

    /**
     * Get operator's work queue for a specific date (default: today).
     *
     * @param string      $operatorId Operator/employee ID.
     * @param string|null $date       Date in YYYY-MM-DD format.
     * @return array Tasks sorted by priority (lower number = higher priority).
     */
    public function getOperatorQueue(string $operatorId, ?string $date = null): array
    {
        $targetDate = $date ?? date('Y-m-d');
        $queue      = $this->loadFile('work_queue');
        $result     = [];

        foreach ($queue as $task) {
            if (!is_array($task)) {
                continue;
            }
            if (($task['operator_id'] ?? '') !== $operatorId) {
                continue;
            }

            // Match tasks assigned on target date
            $assignedDate = substr($task['assigned_at'] ?? $task['created_at'] ?? '', 0, 10);
            if ($assignedDate !== $targetDate) {
                continue;
            }

            $result[] = $task;
        }

        usort($result, function (array $a, array $b) {
            // Sort by priority (ascending), then by assigned_at
            $pA = (int)($a['priority'] ?? 50);
            $pB = (int)($b['priority'] ?? 50);
            if ($pA !== $pB) {
                return $pA <=> $pB;
            }
            return strcmp($a['assigned_at'] ?? '', $b['assigned_at'] ?? '');
        });

        return $result;
    }

    /**
     * Assign a task to an operator.
     */
    public function assignTask(string $operatorId, string $woNumber, string $taskType, array $data): array
    {
        if (!in_array($taskType, self::TASK_TYPES, true)) {
            throw new RuntimeException("Invalid task type: {$taskType}.");
        }

        $now = $this->nowIso();
        $id  = $this->generateUuidV4();

        $record = [
            'queue_id'          => $id,
            'operator_id'       => $operatorId,
            'wo_number'         => $woNumber,
            'jo_number'         => $data['jo_number'] ?? null,
            'operation_seq'     => $data['operation_seq'] ?? null,
            'task_type'         => $taskType,
            'task_status'       => 'pending',
            'priority'          => (int)($data['priority'] ?? 50),
            'assigned_at'       => $now,
            'started_at'        => null,
            'completed_at'      => null,
            'machine_id'        => $data['machine_id'] ?? null,
            'work_center_id'    => $data['work_center_id'] ?? null,
            'estimated_minutes' => isset($data['estimated_minutes']) ? (float)$data['estimated_minutes'] : null,
            'actual_minutes'    => null,
            'notes'             => $data['notes'] ?? null,
            'offline_created'   => (bool)($data['offline_created'] ?? false),
            'sync_status'       => $data['sync_status'] ?? 'synced',
            'metadata'          => $data['metadata'] ?? new \stdClass(),
            'created_at'        => $now,
            'updated_at'        => $now,
        ];

        $queue   = $this->loadFile('work_queue');
        $queue[] = $record;
        $this->saveFile('work_queue', $queue);

        return $record;
    }

    /**
     * Start a task (set started_at, status = in_progress).
     */
    public function startTask(string $queueId, string $operatorId): array
    {
        $queue = $this->loadFile('work_queue');
        $now   = $this->nowIso();

        foreach ($queue as $idx => $task) {
            if (!is_array($task)) {
                continue;
            }
            if (($task['queue_id'] ?? '') !== $queueId) {
                continue;
            }
            if (($task['operator_id'] ?? '') !== $operatorId) {
                throw new RuntimeException("Task {$queueId} is not assigned to operator {$operatorId}.");
            }

            $queue[$idx] = array_merge($task, [
                'task_status' => 'in_progress',
                'started_at'  => $now,
                'updated_at'  => $now,
            ]);

            $this->saveFile('work_queue', $queue);
            return $queue[$idx];
        }

        throw new RuntimeException("Work queue task {$queueId} not found.");
    }

    /**
     * Complete a task (set completed_at, actual_minutes, status = completed).
     */
    public function completeTask(string $queueId, string $operatorId, array $result): array
    {
        $queue = $this->loadFile('work_queue');
        $now   = $this->nowIso();

        foreach ($queue as $idx => $task) {
            if (!is_array($task)) {
                continue;
            }
            if (($task['queue_id'] ?? '') !== $queueId) {
                continue;
            }
            if (($task['operator_id'] ?? '') !== $operatorId) {
                throw new RuntimeException("Task {$queueId} is not assigned to operator {$operatorId}.");
            }

            // Calculate actual minutes if started_at is set
            $actualMinutes = $result['actual_minutes'] ?? null;
            if ($actualMinutes === null && !empty($task['started_at'])) {
                $startedAt = new \DateTimeImmutable($task['started_at']);
                $nowDt     = new \DateTimeImmutable($now);
                $diff      = $nowDt->getTimestamp() - $startedAt->getTimestamp();
                $actualMinutes = round($diff / 60, 2);
            }

            $queue[$idx] = array_merge($task, [
                'task_status'    => 'completed',
                'completed_at'   => $now,
                'actual_minutes'  => $actualMinutes,
                'notes'          => $result['notes'] ?? $task['notes'],
                'updated_at'     => $now,
            ]);

            $this->saveFile('work_queue', $queue);
            return $queue[$idx];
        }

        throw new RuntimeException("Work queue task {$queueId} not found.");
    }

    // ── Time Entries ──────────────────────────────────────────────────────

    /**
     * Clock in an operator to a WO operation.
     */
    public function clockIn(
        string $operatorId,
        string $woNumber,
        int $operationSeq,
        string $machineId,
        string $laborType = 'run'
    ): array {
        if (!in_array($laborType, self::LABOR_TYPES, true)) {
            throw new RuntimeException("Invalid labor type: {$laborType}.");
        }

        $now = $this->nowIso();
        $id  = $this->generateUuidV4();

        $entry = [
            'entry_id'           => $id,
            'operator_id'        => $operatorId,
            'wo_number'          => $woNumber,
            'jo_number'          => null,
            'operation_seq'      => $operationSeq,
            'machine_id'         => $machineId,
            'entry_type'         => 'clock_in',
            'entry_time'         => $now,
            'duration_minutes'   => null,
            'labor_type'         => $laborType,
            'quantity_completed' => null,
            'quantity_scrap'     => null,
            'offline_created'    => false,
            'sync_status'        => 'synced',
            'device_id'          => null,
            'metadata'           => new \stdClass(),
            'created_at'         => $now,
        ];

        $entries   = $this->loadFile('time_entries');
        $entries[] = $entry;
        $this->saveFile('time_entries', $entries);

        return $entry;
    }

    /**
     * Clock out (creates clock_out entry, calculates duration on the clock_in).
     */
    public function clockOut(string $entryId, ?int $qtyCompleted = null, ?int $qtyScrap = null): array
    {
        $entries = $this->loadFile('time_entries');
        $now     = $this->nowIso();

        // Find the clock_in entry
        $clockInIdx = null;
        foreach ($entries as $idx => $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if (($entry['entry_id'] ?? '') === $entryId && ($entry['entry_type'] ?? '') === 'clock_in') {
                $clockInIdx = $idx;
                break;
            }
        }

        if ($clockInIdx === null) {
            throw new RuntimeException("Clock-in entry {$entryId} not found.");
        }

        $clockIn = $entries[$clockInIdx];

        // Calculate duration
        $inTime    = new \DateTimeImmutable($clockIn['entry_time']);
        $outTime   = new \DateTimeImmutable($now);
        $duration  = round(($outTime->getTimestamp() - $inTime->getTimestamp()) / 60, 2);

        // Update clock_in with duration
        $entries[$clockInIdx]['duration_minutes']   = $duration;
        $entries[$clockInIdx]['quantity_completed']  = $qtyCompleted;
        $entries[$clockInIdx]['quantity_scrap']      = $qtyScrap;

        // Create clock_out entry
        $outEntry = [
            'entry_id'           => $this->generateUuidV4(),
            'operator_id'        => $clockIn['operator_id'],
            'wo_number'          => $clockIn['wo_number'],
            'jo_number'          => $clockIn['jo_number'],
            'operation_seq'      => $clockIn['operation_seq'],
            'machine_id'         => $clockIn['machine_id'],
            'entry_type'         => 'clock_out',
            'entry_time'         => $now,
            'duration_minutes'   => $duration,
            'labor_type'         => $clockIn['labor_type'],
            'quantity_completed' => $qtyCompleted,
            'quantity_scrap'     => $qtyScrap,
            'offline_created'    => false,
            'sync_status'        => 'synced',
            'device_id'          => $clockIn['device_id'],
            'metadata'           => ['clock_in_entry_id' => $entryId],
            'created_at'         => $now,
        ];

        $entries[] = $outEntry;
        $this->saveFile('time_entries', $entries);

        return $outEntry;
    }

    // ── Inspection Captures ───────────────────────────────────────────────

    /**
     * Capture an inspection record (first-piece, in-process, final, receiving).
     *
     * @param string $operatorId Operator performing the inspection.
     * @param array  $data       Inspection data including measurements, photos, etc.
     * @return array Created inspection capture.
     */
    public function captureInspection(string $operatorId, array $data): array
    {
        $captureType = $data['capture_type'] ?? 'in_process';
        if (!in_array($captureType, self::CAPTURE_TYPES, true)) {
            throw new RuntimeException("Invalid capture type: {$captureType}.");
        }

        $now = $this->nowIso();
        $id  = $this->generateUuidV4();

        // Determine overall result from measurements
        $measurements  = $data['measurements'] ?? [];
        $overallResult = $data['overall_result'] ?? null;
        if ($overallResult === null && !empty($measurements)) {
            $hasFail = false;
            foreach ($measurements as $m) {
                if (is_array($m) && strtolower($m['pass_fail'] ?? '') === 'fail') {
                    $hasFail = true;
                    break;
                }
            }
            $overallResult = $hasFail ? 'fail' : 'pass';
        }

        $record = [
            'capture_id'         => $id,
            'operator_id'        => $operatorId,
            'wo_number'          => $data['wo_number'] ?? null,
            'jo_number'          => $data['jo_number'] ?? null,
            'operation_seq'      => $data['operation_seq'] ?? null,
            'capture_type'       => $captureType,
            'inspection_plan_id' => $data['inspection_plan_id'] ?? null,
            'measurements'       => $measurements,
            'overall_result'     => $overallResult,
            'photos'             => $data['photos'] ?? [],
            'notes'              => $data['notes'] ?? null,
            'inspector_id'       => $data['inspector_id'] ?? $operatorId,
            'approved_by'        => null,
            'approved_at'        => null,
            'linked_ncr_id'      => $data['linked_ncr_id'] ?? null,
            'offline_created'    => (bool)($data['offline_created'] ?? false),
            'sync_status'        => $data['sync_status'] ?? 'synced',
            'device_id'          => $data['device_id'] ?? null,
            'metadata'           => $data['metadata'] ?? new \stdClass(),
            'created_at'         => $now,
        ];

        $inspections   = $this->loadFile('inspections');
        $inspections[] = $record;
        $this->saveFile('inspections', $inspections);

        return $record;
    }

    // ── Offline Sync ──────────────────────────────────────────────────────

    /**
     * Submit a batch of offline-created entries for sync.
     *
     * @param array  $entries    Array of entries (work_queue, time_entries, or inspections).
     * @param string $operatorId Operator who created them offline.
     * @return array Sync results with counts.
     */
    public function submitOfflineBatch(array $entries, string $operatorId): array
    {
        $now     = $this->nowIso();
        $synced  = 0;
        $errors  = [];

        foreach ($entries as $idx => $entry) {
            if (!is_array($entry)) {
                $errors[] = ['index' => $idx, 'error' => 'Invalid entry format'];
                continue;
            }

            $type = $entry['_type'] ?? 'work_queue';

            try {
                $entry['offline_created'] = true;
                $entry['sync_status']     = 'synced';
                $entry['synced_at']       = $now;

                switch ($type) {
                    case 'work_queue':
                        $queue = $this->loadFile('work_queue');
                        $entry['queue_id']    = $entry['queue_id'] ?? $this->generateUuidV4();
                        $entry['operator_id'] = $operatorId;
                        $entry['created_at']  = $entry['created_at'] ?? $now;
                        $entry['updated_at']  = $now;
                        $queue[] = $entry;
                        $this->saveFile('work_queue', $queue);
                        break;

                    case 'time_entry':
                        $timeEntries = $this->loadFile('time_entries');
                        $entry['entry_id']    = $entry['entry_id'] ?? $this->generateUuidV4();
                        $entry['operator_id'] = $operatorId;
                        $entry['created_at']  = $entry['created_at'] ?? $now;
                        $timeEntries[] = $entry;
                        $this->saveFile('time_entries', $timeEntries);
                        break;

                    case 'inspection':
                        $inspections = $this->loadFile('inspections');
                        $entry['capture_id']  = $entry['capture_id'] ?? $this->generateUuidV4();
                        $entry['operator_id'] = $operatorId;
                        $entry['created_at']  = $entry['created_at'] ?? $now;
                        $inspections[] = $entry;
                        $this->saveFile('inspections', $inspections);
                        break;

                    default:
                        $errors[] = ['index' => $idx, 'error' => "Unknown entry type: {$type}"];
                        continue 2;
                }

                $synced++;
            } catch (\Throwable $e) {
                $errors[] = ['index' => $idx, 'error' => $e->getMessage()];
            }
        }

        return [
            'total'     => count($entries),
            'synced'    => $synced,
            'errors'    => $errors,
            'synced_at' => $now,
        ];
    }

    /**
     * Resolve a sync conflict.
     */
    public function resolveConflict(string $entryId, string $resolution): array
    {
        // Search across all stores
        foreach (['work_queue', 'time_entries', 'inspections'] as $store) {
            $records = $this->loadFile($store);
            $idKey   = $store === 'work_queue' ? 'queue_id'
                     : ($store === 'time_entries' ? 'entry_id' : 'capture_id');

            foreach ($records as $idx => $rec) {
                if (!is_array($rec)) {
                    continue;
                }
                if (($rec[$idKey] ?? '') !== $entryId) {
                    continue;
                }

                $now = $this->nowIso();

                if ($resolution === 'accept_server') {
                    // Keep server version, mark synced
                    $records[$idx]['sync_status']  = 'synced';
                    $records[$idx]['updated_at']   = $now;
                } elseif ($resolution === 'accept_client') {
                    // Client version is already in the entry, just mark synced
                    $records[$idx]['sync_status']  = 'synced';
                    $records[$idx]['updated_at']   = $now;
                } else {
                    throw new RuntimeException("Invalid resolution: {$resolution}. Use 'accept_server' or 'accept_client'.");
                }

                $this->saveFile($store, $records);
                return $records[$idx];
            }
        }

        throw new RuntimeException("Entry {$entryId} not found in any store.");
    }

    /**
     * Get pending sync items for an operator.
     */
    public function getPendingSyncItems(string $operatorId): array
    {
        $pending = [];

        foreach (['work_queue', 'time_entries', 'inspections'] as $store) {
            $records = $this->loadFile($store);
            foreach ($records as $rec) {
                if (!is_array($rec)) {
                    continue;
                }
                if (($rec['operator_id'] ?? '') !== $operatorId) {
                    continue;
                }
                $syncStatus = $rec['sync_status'] ?? 'synced';
                if ($syncStatus !== 'synced') {
                    $pending[] = array_merge($rec, ['_store' => $store]);
                }
            }
        }

        return $pending;
    }

    // ── Dashboards ────────────────────────────────────────────────────────

    /**
     * Get operator dashboard KPIs.
     *
     * @param string $operatorId Operator/employee ID.
     * @return array KPIs: tasks today, completed, hours worked, quality rate.
     */
    public function getOperatorDashboard(string $operatorId): array
    {
        $today = date('Y-m-d');
        $queue = $this->getOperatorQueue($operatorId, $today);

        $totalTasks     = count($queue);
        $completedTasks = 0;
        $inProgressTasks = 0;
        foreach ($queue as $task) {
            $status = $task['task_status'] ?? '';
            if ($status === 'completed') {
                $completedTasks++;
            } elseif ($status === 'in_progress') {
                $inProgressTasks++;
            }
        }

        // Calculate hours worked today
        $entries      = $this->loadFile('time_entries');
        $hoursWorked  = 0.0;
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if (($entry['operator_id'] ?? '') !== $operatorId) {
                continue;
            }
            $entryDate = substr($entry['entry_time'] ?? $entry['created_at'] ?? '', 0, 10);
            if ($entryDate !== $today) {
                continue;
            }
            if (($entry['entry_type'] ?? '') === 'clock_in' && isset($entry['duration_minutes'])) {
                $hoursWorked += (float)$entry['duration_minutes'] / 60;
            }
        }

        // Quality rate (from inspections today)
        $inspections    = $this->loadFile('inspections');
        $totalInsp      = 0;
        $passedInsp     = 0;
        $totalQty       = 0;
        $scrapQty       = 0;

        foreach ($inspections as $insp) {
            if (!is_array($insp)) {
                continue;
            }
            if (($insp['operator_id'] ?? '') !== $operatorId) {
                continue;
            }
            $inspDate = substr($insp['created_at'] ?? '', 0, 10);
            if ($inspDate !== $today) {
                continue;
            }
            $totalInsp++;
            if (($insp['overall_result'] ?? '') === 'pass') {
                $passedInsp++;
            }
        }

        // Scrap from time entries
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if (($entry['operator_id'] ?? '') !== $operatorId) {
                continue;
            }
            $entryDate = substr($entry['entry_time'] ?? $entry['created_at'] ?? '', 0, 10);
            if ($entryDate !== $today) {
                continue;
            }
            $totalQty += (int)($entry['quantity_completed'] ?? 0);
            $scrapQty += (int)($entry['quantity_scrap'] ?? 0);
        }

        $qualityRate = $totalQty > 0
            ? round((($totalQty - $scrapQty) / $totalQty) * 100, 1)
            : 100.0;

        $inspPassRate = $totalInsp > 0
            ? round(($passedInsp / $totalInsp) * 100, 1)
            : 100.0;

        return [
            'operator_id'       => $operatorId,
            'date'              => $today,
            'tasks_total'       => $totalTasks,
            'tasks_completed'   => $completedTasks,
            'tasks_in_progress' => $inProgressTasks,
            'tasks_pending'     => $totalTasks - $completedTasks - $inProgressTasks,
            'hours_worked'      => round($hoursWorked, 2),
            'quantity_completed' => $totalQty,
            'quantity_scrap'    => $scrapQty,
            'quality_rate'      => $qualityRate,
            'inspection_pass_rate' => $inspPassRate,
            'generated_at'      => $this->nowIso(),
        ];
    }

    /**
     * Get shop floor overview: all operators, current status, machine assignments.
     */
    public function getShopFloorOverview(): array
    {
        $today   = date('Y-m-d');
        $queue   = $this->loadFile('work_queue');
        $entries = $this->loadFile('time_entries');

        // Collect unique operators active today
        $operators = [];

        foreach ($queue as $task) {
            if (!is_array($task)) {
                continue;
            }
            $assignedDate = substr($task['assigned_at'] ?? $task['created_at'] ?? '', 0, 10);
            if ($assignedDate !== $today) {
                continue;
            }

            $opId = $task['operator_id'] ?? '';
            if ($opId === '') {
                continue;
            }

            if (!isset($operators[$opId])) {
                $operators[$opId] = [
                    'operator_id'     => $opId,
                    'current_status'  => 'idle',
                    'current_machine' => null,
                    'current_wo'      => null,
                    'tasks_total'     => 0,
                    'tasks_completed' => 0,
                    'clocked_in'      => false,
                ];
            }

            $operators[$opId]['tasks_total']++;
            $taskStatus = $task['task_status'] ?? '';
            if ($taskStatus === 'completed') {
                $operators[$opId]['tasks_completed']++;
            }
            if ($taskStatus === 'in_progress') {
                $operators[$opId]['current_status']  = 'working';
                $operators[$opId]['current_machine']  = $task['machine_id'] ?? null;
                $operators[$opId]['current_wo']       = $task['wo_number'] ?? null;
            }
        }

        // Check clock-in status from time entries
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $entryDate = substr($entry['entry_time'] ?? $entry['created_at'] ?? '', 0, 10);
            if ($entryDate !== $today) {
                continue;
            }

            $opId = $entry['operator_id'] ?? '';
            if ($opId === '' || !isset($operators[$opId])) {
                continue;
            }

            if (($entry['entry_type'] ?? '') === 'clock_in' && !isset($entry['duration_minutes'])) {
                // Still clocked in (no duration = not yet clocked out)
                $operators[$opId]['clocked_in']     = true;
                $operators[$opId]['current_machine'] = $operators[$opId]['current_machine'] ?? ($entry['machine_id'] ?? null);
            }
        }

        // Determine machine utilization
        $machines = [];
        foreach ($operators as $op) {
            if ($op['current_machine'] !== null && $op['current_status'] === 'working') {
                $machineId = $op['current_machine'];
                if (!isset($machines[$machineId])) {
                    $machines[$machineId] = [
                        'machine_id' => $machineId,
                        'status'     => 'running',
                        'operators'  => [],
                    ];
                }
                $machines[$machineId]['operators'][] = $op['operator_id'];
            }
        }

        return [
            'date'              => $today,
            'operators'         => array_values($operators),
            'operator_count'    => count($operators),
            'working_count'     => count(array_filter($operators, fn($o) => $o['current_status'] === 'working')),
            'idle_count'        => count(array_filter($operators, fn($o) => $o['current_status'] === 'idle')),
            'machines_active'   => array_values($machines),
            'generated_at'      => $this->nowIso(),
        ];
    }

    // ── Private Helpers ───────────────────────────────────────────────────

    private function loadFile(string $name): array
    {
        $file = $this->mobileDir . '/' . $name . '.json';
        return $this->readJson($file) ?? [];
    }

    private function saveFile(string $name, array $data): void
    {
        $file = $this->mobileDir . '/' . $name . '.json';
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
