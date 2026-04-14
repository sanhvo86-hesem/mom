<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Api\Services\WorkforceQualificationGateService;
use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;
use Throwable;

/**
 * Mobile Work Queue Service for HESEM MOM Portal.
 *
 * Manages operator work queues, time clock entries, first-piece and
 * in-process inspection captures from tablets, offline sync, and
 * shop floor overview dashboards.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class MobileWorkQueueService
{
    private readonly string $dataDir;
    private readonly string $mobileDir;
    private WorkforceQualificationGateService $qualificationGate;
    private ?object $db;

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

    /** Valid inspection results. */
    private const INSPECTION_RESULTS = ['pass', 'fail', 'conditional'];

    /** Valid mobile task completion results. */
    private const TASK_RESULTS = ['pass', 'fail', 'partial'];

    /** Append-only mobile task event types. */
    private const TASK_EVENT_TYPES = [
        'mobile.task_assigned',
        'mobile.task_started',
        'mobile.task_completed',
    ];

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(
        string $dataDir,
        ?object $db = null,
        ?WorkforceQualificationGateService $qualificationGate = null,
    )
    {
        $this->dataDir   = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->mobileDir = $this->dataDir . '/mobile';
        $this->db = $db;
        $this->qualificationGate = $qualificationGate ?? new WorkforceQualificationGateService($this->dataDir);

        foreach (['work_queue', 'time_entries', 'inspections'] as $sub) {
            $dir = $this->mobileDir . '/' . $sub;
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
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
        $syncStatus = (string)($data['sync_status'] ?? self::SYNC_STATUSES[0]);
        if (!in_array($syncStatus, self::SYNC_STATUSES, true)) {
            throw new RuntimeException("Invalid sync status: {$syncStatus}.");
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
            'task_status'       => self::TASK_STATUSES[0],
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
            'sync_status'       => $syncStatus,
            'metadata'          => $data['metadata'] ?? new \stdClass(),
            'created_at'        => $now,
            'updated_at'        => $now,
        ];

        $this->withStoreLock('work_queue', function () use ($record): void {
            $queue   = $this->loadFile('work_queue');
            $queue[] = $record;
            $this->saveFile('work_queue', $queue);
        });
        $this->appendTaskEvent($record, 'mobile.task_assigned');

        return $record;
    }

    /**
     * Start a task (set started_at, status = in_progress).
     * Uses file locking to prevent race conditions in multi-process environments.
     */
    public function startTask(string $queueId, string $operatorId): array
    {
        $lockPath = $this->mobileDir . '/work_queue.lock';
        $lockHandle = fopen($lockPath, 'c');
        if ($lockHandle === false) {
            throw new RuntimeException("Cannot open lock file: {$lockPath}");
        }

        try {
            // Acquire exclusive lock — blocks until available
            if (!flock($lockHandle, LOCK_EX)) {
                throw new RuntimeException("Cannot acquire exclusive lock on work queue.");
            }

            try {
                // Read data inside lock to prevent TOCTOU
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
                    $currentStatus = (string)($task['task_status'] ?? self::TASK_STATUSES[0]);
                    if ($currentStatus === self::TASK_STATUSES[1]) {
                        return $task;
                    }
                    if ($currentStatus !== self::TASK_STATUSES[0]) {
                        throw new RuntimeException('invalid_task_start_transition');
                    }
                    $qualification = $this->qualificationGate->assertCanStartTask($operatorId, $task);

                    $queue[$idx] = array_merge($task, [
                        'task_status' => self::TASK_STATUSES[1],
                        'started_at'  => $now,
                        'updated_at'  => $now,
                        'qualification_gate' => $qualification,
                    ]);

                    // Write data while still holding lock
                    $this->saveFile('work_queue', $queue);
                    $this->appendTaskEvent($queue[$idx], 'mobile.task_started', [
                        'previous_status' => $currentStatus,
                        'qualification_gate' => $qualification,
                    ]);
                    return $queue[$idx];
                }

                throw new RuntimeException("Work queue task {$queueId} not found.");
            } finally {
                flock($lockHandle, LOCK_UN);
            }
        } finally {
            fclose($lockHandle);
        }
    }

    /**
     * Complete a task (set completed_at, actual_minutes, status = completed).
     * Uses file locking to prevent race conditions in multi-process environments.
     */
    public function completeTask(string $queueId, string $operatorId, array $result): array
    {
        $lockPath = $this->mobileDir . '/work_queue.lock';
        $lockHandle = fopen($lockPath, 'c');
        if ($lockHandle === false) {
            throw new RuntimeException("Cannot open lock file: {$lockPath}");
        }

        try {
            // Acquire exclusive lock — blocks until available
            if (!flock($lockHandle, LOCK_EX)) {
                throw new RuntimeException("Cannot acquire exclusive lock on work queue.");
            }

            try {
                // Read data inside lock to prevent TOCTOU
                $queue = $this->loadFile('work_queue');
                $now   = $this->nowIso();
                $completionResult = $this->normalizeTaskResult($result['result'] ?? null);
                $qtyCompleted = $this->nonNegativeInt($result['qty_completed'] ?? 0, 'qty_completed');
                $qtyScrap = $this->nonNegativeInt($result['qty_scrap'] ?? 0, 'qty_scrap');
                if ($qtyScrap > $qtyCompleted) {
                    throw new RuntimeException('qty_scrap_exceeds_completed');
                }
                if ($completionResult === 'pass' && $qtyScrap > 0) {
                    throw new RuntimeException('pass_result_cannot_have_scrap');
                }
                $completionReasonCode = $this->normalizeCompletionReasonCode($result['reason_code'] ?? null, $completionResult, $qtyScrap);

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
                    $currentStatus = (string)($task['task_status'] ?? self::TASK_STATUSES[0]);
                    if ($currentStatus === self::TASK_STATUSES[2]) {
                        throw new RuntimeException('task_already_completed');
                    }
                    // Auto-start pending tasks for backward compatibility with
                    // clients that call completeTask without an explicit startTask.
                    if ($currentStatus === self::TASK_STATUSES[0]) {
                        $task['task_status'] = self::TASK_STATUSES[1];
                        $task['started_at'] = $now;
                        $currentStatus = self::TASK_STATUSES[1];
                    }
                    if ($currentStatus !== self::TASK_STATUSES[1]) {
                        throw new RuntimeException('task_not_started');
                    }

                    // Calculate actual minutes if started_at is set
                    $actualMinutes = $result['actual_minutes'] ?? null;
                    if ($actualMinutes !== null) {
                        $actualMinutes = $this->nonNegativeFloat($actualMinutes, 'actual_minutes');
                    }
                    if ($actualMinutes === null && !empty($task['started_at'])) {
                        $startedAt = new \DateTimeImmutable($task['started_at']);
                        $nowDt     = new \DateTimeImmutable($now);
                        $diff      = $nowDt->getTimestamp() - $startedAt->getTimestamp();
                        $actualMinutes = round($diff / 60, 2);
                    }

                    $queue[$idx] = array_merge($task, [
                        'task_status'    => self::TASK_STATUSES[2],
                        'completed_at'   => $now,
                        'actual_minutes'  => $actualMinutes,
                        'result'          => $completionResult,
                        'qty_completed'   => $qtyCompleted,
                        'qty_scrap'       => $qtyScrap,
                        'quantity_completed' => $qtyCompleted,
                        'quantity_scrap'  => $qtyScrap,
                        'completion_reason_code' => $completionReasonCode,
                        'notes'          => $result['notes'] ?? $task['notes'],
                        'updated_at'     => $now,
                    ]);

                    // Write data while still holding lock
                    $this->saveFile('work_queue', $queue);
                    $this->appendTaskEvent($queue[$idx], 'mobile.task_completed', [
                        'previous_status' => $currentStatus,
                        'result' => $completionResult,
                        'qty_completed' => $qtyCompleted,
                        'qty_scrap' => $qtyScrap,
                        'completion_reason_code' => $completionReasonCode,
                    ]);
                    return $queue[$idx];
                }

                throw new RuntimeException("Work queue task {$queueId} not found.");
            } finally {
                flock($lockHandle, LOCK_UN);
            }
        } finally {
            fclose($lockHandle);
        }
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

        $this->withStoreLock('time_entries', function () use ($entry): void {
            $entries   = $this->loadFile('time_entries');
            $entries[] = $entry;
            $this->saveFile('time_entries', $entries);
        });

        return $entry;
    }

    /**
     * Clock out (creates clock_out entry, calculates duration on the clock_in).
     */
    public function clockOut(string $entryId, ?int $qtyCompleted = null, ?int $qtyScrap = null, ?string $operatorId = null): array
    {
        return $this->withStoreLock('time_entries', function () use ($entryId, $qtyCompleted, $qtyScrap, $operatorId): array {
            $entries = $this->loadFile('time_entries');
            $now     = $this->nowIso();
            $completed = $qtyCompleted === null ? null : $this->nonNegativeInt($qtyCompleted, 'qty_completed');
            $scrap = $qtyScrap === null ? null : $this->nonNegativeInt($qtyScrap, 'qty_scrap');
            if ($completed !== null && $scrap !== null && $scrap > $completed) {
                throw new RuntimeException('qty_scrap_exceeds_completed');
            }

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
            if ($operatorId !== null && $operatorId !== '' && ($clockIn['operator_id'] ?? '') !== $operatorId) {
                throw new RuntimeException('forbidden_clock_out_operator');
            }
            if (($clockIn['duration_minutes'] ?? null) !== null) {
                throw new RuntimeException('clock_in_already_closed');
            }

            // Calculate duration
            $inTime    = new \DateTimeImmutable($clockIn['entry_time']);
            $outTime   = new \DateTimeImmutable($now);
            $duration  = round(($outTime->getTimestamp() - $inTime->getTimestamp()) / 60, 2);

            // Update clock_in with duration
            $entries[$clockInIdx]['duration_minutes']   = $duration;
            $entries[$clockInIdx]['quantity_completed']  = $completed;
            $entries[$clockInIdx]['quantity_scrap']      = $scrap;

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
                'quantity_completed' => $completed,
                'quantity_scrap'     => $scrap,
                'offline_created'    => false,
                'sync_status'        => 'synced',
                'device_id'          => $clockIn['device_id'],
                'metadata'           => ['clock_in_entry_id' => $entryId],
                'created_at'         => $now,
            ];

            $entries[] = $outEntry;
            $this->saveFile('time_entries', $entries);

            return $outEntry;
        });
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
        $operatorId = $this->requiredString($operatorId, 'missing_operator_id');
        $captureType = strtolower($this->stringValue($data['capture_type'] ?? 'in_process'));
        if (!in_array($captureType, self::CAPTURE_TYPES, true)) {
            throw new RuntimeException("Invalid capture type: {$captureType}.");
        }
        $syncStatus = strtolower($this->stringValue($data['sync_status'] ?? 'synced'));
        if (!in_array($syncStatus, self::SYNC_STATUSES, true)) {
            throw new RuntimeException("Invalid sync status: {$syncStatus}.");
        }

        $now = $this->nowIso();
        $id  = $this->stringValue($data['capture_id'] ?? '');
        if ($id === '') {
            $id = $this->generateUuidV4();
        }

        $measurements = $this->normalizeInspectionMeasurements($data['measurements'] ?? [], $captureType);
        $overallResult = $this->normalizeInspectionResult($data['overall_result'] ?? $data['result'] ?? null, $measurements);
        if ($captureType === 'first_piece' && $overallResult === null) {
            throw new RuntimeException('first_piece_result_required');
        }

        $offlineCreated = $this->truthy($data['offline_created'] ?? false);
        $clientCaptureId = $this->stringValue($data['client_capture_id'] ?? $data['client_record_id'] ?? '');
        $idempotencyKey = $this->stringValue($data['idempotency_key'] ?? '');
        if ($offlineCreated && $clientCaptureId === '' && $idempotencyKey === '') {
            throw new RuntimeException('offline_inspection_requires_replay_key');
        }

        $record = [
            'capture_id'         => $id,
            'operator_id'        => $operatorId,
            'wo_number'          => $this->requiredString($data['wo_number'] ?? null, 'missing_wo_number'),
            'jo_number'          => $this->nullableString($data['jo_number'] ?? null),
            'operation_seq'      => $this->nullablePositiveInt($data['operation_seq'] ?? null, 'operation_seq'),
            'capture_type'       => $captureType,
            'inspection_plan_id' => $this->nullableString($data['inspection_plan_id'] ?? null),
            'machine_id'         => $this->nullableString($data['machine_id'] ?? $data['equipment_id'] ?? null),
            'equipment_id'       => $this->nullableString($data['equipment_id'] ?? $data['machine_id'] ?? null),
            'work_center_id'     => $this->nullableString($data['work_center_id'] ?? null),
            'cnc_program_id'     => $this->nullableString($data['cnc_program_id'] ?? $data['nc_program_id'] ?? null),
            'cnc_program_revision' => $this->nullableString($data['cnc_program_revision'] ?? $data['program_revision'] ?? null),
            'setup_sheet_id'     => $this->nullableString($data['setup_sheet_id'] ?? null),
            'setup_sheet_revision' => $this->nullableString($data['setup_sheet_revision'] ?? null),
            'part_revision'      => $this->nullableString($data['part_revision'] ?? null),
            'org_plant_id'       => $this->nullableString($data['org_plant_id'] ?? $data['plant_id'] ?? null),
            'org_site_id'        => $this->nullableString($data['org_site_id'] ?? $data['site_id'] ?? null),
            'measurements'       => $measurements,
            'overall_result'     => $overallResult,
            'photos'             => $this->normalizeStringList($data['photos'] ?? [], 'photos'),
            'notes'              => $this->nullableString($data['notes'] ?? null),
            'inspector_id'       => $this->nullableString($data['inspector_id'] ?? $operatorId),
            'approved_by'        => null,
            'approved_at'        => null,
            'linked_ncr_id'      => $this->nullableString($data['linked_ncr_id'] ?? null),
            'offline_created'    => $offlineCreated,
            'sync_status'        => $syncStatus,
            'device_id'          => $this->nullableString($data['device_id'] ?? null),
            'client_capture_id'  => $clientCaptureId,
            'idempotency_key'    => $idempotencyKey,
            'metadata'           => is_array($data['metadata'] ?? null) ? (array)$data['metadata'] : new \stdClass(),
            'captured_at'        => $this->optionalTimestamp($data['captured_at'] ?? $data['created_at'] ?? $now, 'captured_at'),
            'created_at'         => $now,
        ];
        $record['inspection_fingerprint'] = $this->inspectionFingerprint($record);
        if ($record['idempotency_key'] === '') {
            $record['idempotency_key'] = 'inspection:' . hash('sha256', $record['inspection_fingerprint']);
        }

        [$savedRecord, $isNew] = $this->withStoreLock('inspections', function () use ($record): array {
            $inspections = $this->loadFile('inspections');
            $existing = $this->findExistingOfflineRecord($inspections, $record, 'capture_id');
            if ($existing !== null) {
                return [$existing, false];
            }
            $inspections[] = $record;
            $this->saveFile('inspections', $inspections);
            return [$record, true];
        });
        if ($isNew) {
            $this->shadowInspectionCapture($record);
        }

        return $savedRecord;
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

            $type = $this->normalizeOfflineType($entry['_type'] ?? $entry['type'] ?? 'work_queue');

            try {
                $entry['offline_created'] = true;
                $entry['sync_status']     = 'synced';
                $entry['synced_at']       = $now;
                $entry['idempotency_key'] = $this->offlineEntryKey($entry, $operatorId, $type);

                switch ($type) {
                    case 'work_queue':
                        $queue = $this->loadFile('work_queue');
                        $entry['queue_id']    = $entry['queue_id'] ?? $this->generateUuidV4();
                        $entry['operator_id'] = $operatorId;
                        $entry['created_at']  = $entry['created_at'] ?? $now;
                        $entry['updated_at']  = $now;
                        $queue = $this->appendOfflineRecord($queue, $entry, 'queue_id');
                        $this->saveFile('work_queue', $queue);
                        break;

                    case 'time_entry':
                        $timeEntries = $this->loadFile('time_entries');
                        $entry['entry_id']    = $entry['entry_id'] ?? $this->generateUuidV4();
                        $entry['operator_id'] = $operatorId;
                        $entry['created_at']  = $entry['created_at'] ?? $now;
                        $timeEntries = $this->appendOfflineRecord($timeEntries, $entry, 'entry_id');
                        $this->saveFile('time_entries', $timeEntries);
                        break;

                    case 'inspection':
                        $entry['operator_id'] = $operatorId;
                        $entry['created_at']  = $entry['created_at'] ?? $now;
                        $this->captureInspection($operatorId, $entry);
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
    public function resolveConflict(string $entryId, string $resolution, string $operatorId, bool $allowOverride = false, string $overrideReason = ''): array
    {
        $resolution = match ($resolution) {
            'keep_server' => 'accept_server',
            'keep_local' => 'accept_client',
            default => $resolution,
        };

        foreach (['work_queue', 'time_entries', 'inspections'] as $store) {
            $resolved = $this->withStoreLock($store, function () use ($store, $entryId, $resolution, $operatorId, $allowOverride, $overrideReason): ?array {
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
                    if (!$allowOverride && $this->stringValue($rec['operator_id'] ?? '') !== $operatorId) {
                        throw new RuntimeException('forbidden_conflict_operator');
                    }
                    if ($allowOverride && $this->stringValue($rec['operator_id'] ?? '') !== $operatorId && trim($overrideReason) === '') {
                        throw new RuntimeException('conflict_override_reason_required');
                    }

                    $now = $this->nowIso();

                    if ($resolution === 'accept_server' || $resolution === 'accept_client') {
                        $records[$idx]['sync_status'] = 'synced';
                        $records[$idx]['updated_at'] = $now;
                        if ($allowOverride && $this->stringValue($rec['operator_id'] ?? '') !== $operatorId) {
                            $records[$idx]['conflict_override'] = [
                                'resolved_by' => $operatorId,
                                'resolved_at' => $now,
                                'reason' => $overrideReason,
                            ];
                        }
                    } else {
                        throw new RuntimeException("Invalid resolution: {$resolution}. Use 'accept_server', 'accept_client', 'keep_server', or 'keep_local'.");
                    }

                    $this->saveFile($store, $records);
                    return $records[$idx];
                }

                return null;
            });

            if ($resolved !== null) {
                return $resolved;
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

    /**
     * @return list<array<string, mixed>>
     */
    private function normalizeInspectionMeasurements(mixed $value, string $captureType): array
    {
        if (!is_array($value) || !array_is_list($value)) {
            throw new RuntimeException('invalid_inspection_measurements');
        }
        if ($captureType === 'first_piece' && $value === []) {
            throw new RuntimeException('first_piece_measurements_required');
        }

        $measurements = [];
        foreach ($value as $idx => $row) {
            if (!is_array($row)) {
                throw new RuntimeException('invalid_inspection_measurement_' . $idx);
            }
            $characteristic = $this->stringValue($row['characteristic_id'] ?? $row['characteristic'] ?? $row['measurement_name'] ?? '');
            if ($characteristic === '') {
                throw new RuntimeException('inspection_measurement_characteristic_required');
            }
            $measuredValue = $row['measured_value'] ?? $row['value'] ?? null;
            if ($measuredValue === null || !is_scalar($measuredValue) || !is_numeric($measuredValue)) {
                throw new RuntimeException('inspection_measurement_value_required');
            }
            $passFail = strtolower($this->stringValue($row['pass_fail'] ?? $row['result'] ?? ''));
            if ($passFail === '') {
                throw new RuntimeException('inspection_measurement_result_required');
            }
            if (!in_array($passFail, self::INSPECTION_RESULTS, true)) {
                throw new RuntimeException('invalid_inspection_measurement_result');
            }

            $normalized = [
                'characteristic_id' => $characteristic,
                'measured_value' => (float)$measuredValue,
                'unit' => $this->stringValue($row['unit'] ?? ''),
                'nominal' => $this->nullableFloat($row['nominal'] ?? null, 'inspection_measurements.nominal'),
                'lower_spec' => $this->nullableFloat($row['lower_spec'] ?? $row['lsl'] ?? null, 'inspection_measurements.lower_spec'),
                'upper_spec' => $this->nullableFloat($row['upper_spec'] ?? $row['usl'] ?? null, 'inspection_measurements.upper_spec'),
                'pass_fail' => $passFail,
                'method' => $this->stringValue($row['method'] ?? ''),
                'gage_id' => $this->stringValue($row['gage_id'] ?? $row['gauge_id'] ?? ''),
                'notes' => $this->stringValue($row['notes'] ?? ''),
            ];

            $lower = $normalized['lower_spec'];
            $upper = $normalized['upper_spec'];
            if ($lower !== null && $upper !== null && $lower > $upper) {
                throw new RuntimeException('inspection_measurement_spec_range_invalid');
            }

            $measurements[] = $normalized;
        }

        return $measurements;
    }

    /**
     * @param list<array<string, mixed>> $measurements
     */
    private function normalizeInspectionResult(mixed $value, array $measurements): ?string
    {
        $result = strtolower($this->stringValue($value));
        if ($result === '') {
            if ($measurements === []) {
                return null;
            }
            foreach ($measurements as $measurement) {
                if (($measurement['pass_fail'] ?? '') === 'fail') {
                    return 'fail';
                }
                if (($measurement['pass_fail'] ?? '') === 'conditional') {
                    return 'conditional';
                }
            }
            return 'pass';
        }
        if (!in_array($result, self::INSPECTION_RESULTS, true)) {
            throw new RuntimeException('invalid_inspection_result');
        }

        return $result;
    }

    /**
     * @return list<string>
     */
    private function normalizeStringList(mixed $value, string $field): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (!is_array($value) || !array_is_list($value)) {
            throw new RuntimeException('invalid_' . $field);
        }

        $rows = [];
        foreach ($value as $row) {
            if (!is_scalar($row)) {
                throw new RuntimeException('invalid_' . $field);
            }
            $text = trim((string)$row);
            if ($text !== '') {
                $rows[] = $text;
            }
        }

        return $rows;
    }

    /**
     * @param array<string, mixed> $record
     */
    private function inspectionFingerprint(array $record): string
    {
        $fingerprint = [];
        foreach ([
            'operator_id',
            'wo_number',
            'jo_number',
            'operation_seq',
            'capture_type',
            'inspection_plan_id',
            'machine_id',
            'equipment_id',
            'work_center_id',
            'cnc_program_id',
            'cnc_program_revision',
            'setup_sheet_id',
            'setup_sheet_revision',
            'part_revision',
            'org_plant_id',
            'org_site_id',
            'measurements',
            'overall_result',
            'device_id',
            'client_capture_id',
        ] as $field) {
            $fingerprint[$field] = $record[$field] ?? null;
        }

        return hash('sha256', $this->canonicalJson($fingerprint));
    }

    /**
     * @param array<int, mixed> $records
     * @param array<string, mixed> $candidate
     * @return array<string, mixed>|null
     */
    private function findExistingOfflineRecord(array $records, array $candidate, string $idField): ?array
    {
        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }
            /** @var array<string, mixed> $record */
            $sameIdentity = false;
            foreach ([$idField, 'idempotency_key', 'client_capture_id', 'client_record_id'] as $field) {
                $candidateValue = $this->stringValue($candidate[$field] ?? '');
                if ($candidateValue !== '' && $candidateValue === $this->stringValue($record[$field] ?? '')) {
                    $sameIdentity = true;
                    break;
                }
            }
            if (!$sameIdentity) {
                continue;
            }

            $candidateFingerprint = $this->stringValue($candidate['inspection_fingerprint'] ?? $candidate['offline_fingerprint'] ?? '');
            $recordFingerprint = $this->stringValue($record['inspection_fingerprint'] ?? $record['offline_fingerprint'] ?? '');
            if ($candidateFingerprint !== '' && $recordFingerprint !== '' && !hash_equals($recordFingerprint, $candidateFingerprint)) {
                throw new RuntimeException('offline_replay_conflict');
            }

            $record['dedupe_status'] = 'replayed';
            return $record;
        }

        return null;
    }

    /**
     * @param array<int, mixed> $records
     * @param array<string, mixed> $entry
     * @return array<int, mixed>
     */
    private function appendOfflineRecord(array $records, array $entry, string $idField): array
    {
        $entry['offline_fingerprint'] = $this->offlineFingerprint($entry);
        if ($this->findExistingOfflineRecord($records, $entry, $idField) !== null) {
            return $records;
        }

        $records[] = $entry;
        return $records;
    }

    /**
     * @param array<string, mixed> $task
     * @param array<string, mixed> $context
     */
    private function appendTaskEvent(array $task, string $eventType, array $context = []): void
    {
        if (!in_array($eventType, self::TASK_EVENT_TYPES, true)) {
            throw new RuntimeException('invalid_mobile_task_event_type');
        }

        $now = $this->nowIso();
        $event = [
            'event_id' => 'MTE-' . bin2hex(random_bytes(8)),
            'event_type' => $eventType,
            'event_schema_version' => 'mobile_task_event.v1',
            'queue_id' => $this->stringValue($task['queue_id'] ?? ''),
            'operator_id' => $this->stringValue($task['operator_id'] ?? ''),
            'wo_number' => $this->stringValue($task['wo_number'] ?? ''),
            'jo_number' => $this->nullableString($task['jo_number'] ?? null),
            'operation_seq' => $task['operation_seq'] ?? null,
            'task_type' => $this->stringValue($task['task_type'] ?? ''),
            'task_status' => $this->stringValue($task['task_status'] ?? ''),
            'machine_id' => $this->nullableString($task['machine_id'] ?? null),
            'work_center_id' => $this->nullableString($task['work_center_id'] ?? null),
            'occurred_at' => $now,
            'recorded_at' => $now,
            'source_store' => 'mobile/work_queue.json',
            'operational_truth' => true,
            'context' => $context,
        ];
        $event['event_fingerprint'] = hash('sha256', $this->canonicalJson([
            'event_type' => $event['event_type'],
            'queue_id' => $event['queue_id'],
            'operator_id' => $event['operator_id'],
            'task_status' => $event['task_status'],
            'context' => $context,
        ]));

        $this->withStoreLock('task_events', function () use ($event): void {
            $events = $this->loadFile('task_events');
            $events[] = $event;
            $this->saveFile('task_events', $events);
        });
    }

    /**
     * @param array<string, mixed> $entry
     */
    private function offlineEntryKey(array $entry, string $operatorId, string $type): string
    {
        $explicit = $this->stringValue($entry['idempotency_key'] ?? '');
        if ($explicit !== '') {
            return $explicit;
        }
        $clientId = $this->stringValue($entry['client_record_id'] ?? $entry['client_capture_id'] ?? $entry['queue_id'] ?? $entry['entry_id'] ?? $entry['capture_id'] ?? '');
        if ($clientId !== '') {
            return 'offline:' . $type . ':' . $operatorId . ':' . $clientId;
        }

        return 'offline-derived:' . $type . ':' . hash('sha256', $this->canonicalJson([
            'operator_id' => $operatorId,
            'type' => $type,
            'entry' => $entry,
        ]));
    }

    private function offlineFingerprint(array $entry): string
    {
        $copy = $entry;
        unset($copy['synced_at'], $copy['updated_at']);

        return hash('sha256', $this->canonicalJson($copy));
    }

    private function normalizeOfflineType(mixed $value): string
    {
        $type = strtolower($this->stringValue($value));
        return match ($type) {
            'time_entries', 'time' => 'time_entry',
            'inspections', 'inspection_capture' => 'inspection',
            'queue', 'work_queue' => 'work_queue',
            default => $type,
        };
    }

    /**
     * @param array<string, mixed> $record
     */
    private function shadowInspectionCapture(array $record): void
    {
        $db = $this->connection();
        if ($db === null || !$this->tableAvailable($db, 'mobile_inspection_captures')) {
            return;
        }

        $captureId = $this->stringValue($record['capture_id'] ?? '');
        if (!$this->isUuid($captureId)) {
            return;
        }

        $metadata = is_array($record['metadata'] ?? null) ? (array)$record['metadata'] : [];
        $metadata['inspection_plan_external_id'] = $this->stringValue($record['inspection_plan_id'] ?? '');
        $metadata['machine_id'] = $this->stringValue($record['machine_id'] ?? '');
        $metadata['equipment_id'] = $this->stringValue($record['equipment_id'] ?? '');
        $metadata['work_center_id'] = $this->stringValue($record['work_center_id'] ?? '');
        $metadata['cnc_program_id'] = $this->stringValue($record['cnc_program_id'] ?? '');
        $metadata['cnc_program_revision'] = $this->stringValue($record['cnc_program_revision'] ?? '');
        $metadata['setup_sheet_id'] = $this->stringValue($record['setup_sheet_id'] ?? '');
        $metadata['setup_sheet_revision'] = $this->stringValue($record['setup_sheet_revision'] ?? '');
        $metadata['part_revision'] = $this->stringValue($record['part_revision'] ?? '');
        $metadata['org_plant_id'] = $this->stringValue($record['org_plant_id'] ?? '');
        $metadata['org_site_id'] = $this->stringValue($record['org_site_id'] ?? '');
        $metadata['idempotency_key'] = $this->stringValue($record['idempotency_key'] ?? '');
        $metadata['client_capture_id'] = $this->stringValue($record['client_capture_id'] ?? '');
        $metadata['inspection_fingerprint'] = $this->stringValue($record['inspection_fingerprint'] ?? '');

        try {
            $db->queryOne(
                "INSERT INTO mobile_inspection_captures (
                    capture_id, operator_id, wo_number, jo_number, operation_seq,
                    capture_type, inspection_plan_id, measurements, overall_result,
                    photos, notes, inspector_id, linked_ncr_id, offline_created,
                    sync_status, device_id, metadata, created_at
                ) VALUES (
                    :capture_id, :operator_id, :wo_number, :jo_number, :operation_seq,
                    :capture_type, :inspection_plan_id, :measurements::jsonb, :overall_result,
                    :photos::jsonb, :notes, :inspector_id, :linked_ncr_id, :offline_created,
                    :sync_status, :device_id, :metadata::jsonb, COALESCE(:created_at::timestamptz, now())
                )
                ON CONFLICT (capture_id) DO UPDATE SET
                    measurements = EXCLUDED.measurements,
                    overall_result = EXCLUDED.overall_result,
                    photos = EXCLUDED.photos,
                    notes = EXCLUDED.notes,
                    sync_status = EXCLUDED.sync_status,
                    device_id = EXCLUDED.device_id,
                    metadata = EXCLUDED.metadata
                RETURNING capture_id::text AS capture_id",
                [
                    ':capture_id' => $captureId,
                    ':operator_id' => $this->stringValue($record['operator_id'] ?? ''),
                    ':wo_number' => $this->nullableString($record['wo_number'] ?? null),
                    ':jo_number' => $this->nullableString($record['jo_number'] ?? null),
                    ':operation_seq' => $record['operation_seq'] ?? null,
                    ':capture_type' => $this->stringValue($record['capture_type'] ?? ''),
                    ':inspection_plan_id' => $this->isUuid($this->stringValue($record['inspection_plan_id'] ?? ''))
                        ? $this->stringValue($record['inspection_plan_id'] ?? '')
                        : null,
                    ':measurements' => $this->canonicalJson($record['measurements'] ?? []),
                    ':overall_result' => $this->nullableString($record['overall_result'] ?? null),
                    ':photos' => $this->canonicalJson($record['photos'] ?? []),
                    ':notes' => $this->nullableString($record['notes'] ?? null),
                    ':inspector_id' => $this->nullableString($record['inspector_id'] ?? null),
                    ':linked_ncr_id' => $this->nullableString($record['linked_ncr_id'] ?? null),
                    ':offline_created' => (bool)($record['offline_created'] ?? false),
                    ':sync_status' => $this->stringValue($record['sync_status'] ?? 'synced'),
                    ':device_id' => $this->nullableString($record['device_id'] ?? null),
                    ':metadata' => $this->canonicalJson($metadata),
                    ':created_at' => $this->nullableString($record['captured_at'] ?? $record['created_at'] ?? null),
                ],
            );
            $this->updateInspectionBridgeColumns($db, $record);
        } catch (Throwable $e) {
            @error_log('[MobileWorkQueueService] mobile inspection DB bridge failed: ' . $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $record
     */
    private function updateInspectionBridgeColumns(Connection $db, array $record): void
    {
        if (!$this->columnAvailable($db, 'mobile_inspection_captures', 'idempotency_key')) {
            return;
        }

        $db->queryOne(
            'UPDATE mobile_inspection_captures
                SET equipment_id = :equipment_id,
                    work_center_id = :work_center_id,
                    client_capture_id = :client_capture_id,
                    idempotency_key = :idempotency_key,
                    inspection_fingerprint = :inspection_fingerprint
              WHERE capture_id = :capture_id
              RETURNING capture_id::text AS capture_id',
            [
                ':equipment_id' => $this->nullableString($record['equipment_id'] ?? null),
                ':work_center_id' => $this->nullableString($record['work_center_id'] ?? null),
                ':client_capture_id' => $this->nullableString($record['client_capture_id'] ?? null),
                ':idempotency_key' => $this->nullableString($record['idempotency_key'] ?? null),
                ':inspection_fingerprint' => $this->nullableString($record['inspection_fingerprint'] ?? null),
                ':capture_id' => $this->stringValue($record['capture_id'] ?? ''),
            ],
        );
    }

    private function connection(): ?Connection
    {
        if ($this->db instanceof DataLayer) {
            if ($this->db->getMode() === DataLayer::MODE_JSON_ONLY) {
                return null;
            }
            return $this->db->getConnection();
        }
        if ($this->db instanceof Connection) {
            return $this->db;
        }
        if (is_object($this->db) && method_exists($this->db, 'getConnection')) {
            $candidate = $this->db->getConnection();
            return $candidate instanceof Connection ? $candidate : null;
        }

        return null;
    }

    private function tableAvailable(Connection $db, string $table): bool
    {
        try {
            $row = $db->queryOne('SELECT to_regclass(:table_name) AS table_name', [':table_name' => $table]);
            return is_array($row) && $this->stringValue($row['table_name'] ?? '') !== '';
        } catch (Throwable) {
            return false;
        }
    }

    private function columnAvailable(Connection $db, string $table, string $column): bool
    {
        try {
            $row = $db->queryOne(
                'SELECT 1 AS ok
                   FROM information_schema.columns
                  WHERE table_schema = current_schema()
                    AND table_name = :table
                    AND column_name = :column
                  LIMIT 1',
                [':table' => $table, ':column' => $column],
            );
            return is_array($row);
        } catch (Throwable) {
            return false;
        }
    }

    private function requiredString(mixed $value, string $errorCode): string
    {
        $text = $this->stringValue($value);
        if ($text === '') {
            throw new RuntimeException($errorCode);
        }

        return $text;
    }

    private function nullableString(mixed $value): ?string
    {
        $text = $this->stringValue($value);
        return $text === '' ? null : $text;
    }

    private function stringValue(mixed $value): string
    {
        if (is_string($value)) {
            return trim($value);
        }
        if (is_int($value) || is_float($value)) {
            return trim((string)$value);
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return '';
    }

    private function nullablePositiveInt(mixed $value, string $field): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value) || (int)$value <= 0) {
            throw new RuntimeException('invalid_' . $field);
        }

        return (int)$value;
    }

    private function nonNegativeInt(mixed $value, string $field): int
    {
        if ($value === null || $value === '') {
            return 0;
        }
        if (!is_numeric($value) || (int)$value < 0) {
            throw new RuntimeException('invalid_' . $field);
        }

        return (int)$value;
    }

    private function nonNegativeFloat(mixed $value, string $field): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        if (!is_numeric($value) || (float)$value < 0.0) {
            throw new RuntimeException('invalid_' . $field);
        }

        return round((float)$value, 2);
    }

    private function normalizeTaskResult(mixed $value): string
    {
        $result = strtolower($this->stringValue($value));
        if (!in_array($result, self::TASK_RESULTS, true)) {
            throw new RuntimeException('invalid_task_result');
        }

        return $result;
    }

    private function normalizeCompletionReasonCode(mixed $value, string $result, int $qtyScrap): string
    {
        $reasonCode = strtoupper($this->stringValue($value));
        $reasonRequired = $result !== 'pass' || $qtyScrap > 0;
        if ($reasonRequired && $reasonCode === '') {
            throw new RuntimeException('completion_reason_code_required');
        }
        if ($reasonCode === '') {
            return '';
        }
        if (preg_match('/^[A-Z0-9][A-Z0-9._-]{1,63}$/', $reasonCode) !== 1) {
            throw new RuntimeException('invalid_completion_reason_code');
        }

        $catalog = (new ShopfloorExecutionService($this->dataDir))->activeReasonCatalog();
        $knownCodes = [];
        foreach (['ng' => 'defect_code', 'rework' => 'defect_code', 'blocking' => 'reason_code'] as $domain => $field) {
            foreach ((array)($catalog[$domain] ?? []) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $code = strtoupper($this->stringValue($row[$field] ?? ''));
                if ($code !== '') {
                    $knownCodes[$code] = true;
                }
            }
        }

        if ($knownCodes !== [] && !isset($knownCodes[$reasonCode])) {
            throw new RuntimeException('unknown_completion_reason_code');
        }

        return $reasonCode;
    }

    private function nullableFloat(mixed $value, string $field): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            throw new RuntimeException('invalid_' . $field);
        }

        return (float)$value;
    }

    private function optionalTimestamp(mixed $value, string $field): string
    {
        $text = $this->stringValue($value);
        if ($text === '') {
            return '';
        }
        try {
            return (new \DateTimeImmutable($text))->format('c');
        } catch (\Throwable) {
            throw new RuntimeException('invalid_' . $field);
        }
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return (float)$value !== 0.0;
        }

        return in_array(strtolower($this->stringValue($value)), ['1', 'true', 'yes', 'y', 'on'], true);
    }

    private function canonicalJson(mixed $value): string
    {
        $normalized = $this->sortForHash($value);
        $json = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }

        return $json;
    }

    private function sortForHash(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        if (!array_is_list($value)) {
            ksort($value);
        }
        foreach ($value as $key => $child) {
            $value[$key] = $this->sortForHash($child);
        }

        return $value;
    }

    private function isUuid(string $value): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value) === 1;
    }

    private function loadFile(string $name): array
    {
        $file = $this->mobileDir . '/' . $name . '.json';
        return $this->readJson($file) ?? [];
    }

    /**
     * @template T
     * @param callable():T $callback
     * @return T
     */
    private function withStoreLock(string $name, callable $callback): mixed
    {
        if (!in_array($name, ['work_queue', 'time_entries', 'inspections', 'task_events'], true)) {
            throw new RuntimeException('invalid_mobile_store_lock');
        }

        $lockPath = $this->mobileDir . '/' . $name . '.lock';
        $lockHandle = @fopen($lockPath, 'c');
        if ($lockHandle === false) {
            throw new RuntimeException("Cannot open lock file: {$lockPath}");
        }

        try {
            if (!flock($lockHandle, LOCK_EX)) {
                throw new RuntimeException("Cannot acquire exclusive lock on {$name}.");
            }

            try {
                return $callback();
            } finally {
                flock($lockHandle, LOCK_UN);
            }
        } finally {
            fclose($lockHandle);
        }
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
