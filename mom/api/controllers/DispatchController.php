<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use InvalidArgumentException;
use MOM\Api\Services\ConnectedGovernanceException;
use MOM\Api\Services\ConnectedGovernanceService;
use MOM\Services\ShopfloorExecutionService;
use MOM\Services\ShopfloorExecutionPersistenceService;
use RuntimeException;
use Throwable;

/**
 * Production Dispatch Controller.
 *
 * Manages shift targets, operator dispatch, production output reporting,
 * and timeline/Gantt views for the shop floor.
 */
class DispatchController extends BaseController
{
    private ?ShopfloorExecutionService $shopfloorSvc = null;
    private ?ShopfloorExecutionPersistenceService $persistenceSvc = null;

    private function dispatchDir(): string
    {
        $dir = $this->dataDir . '/dispatch';
        // PROC-034: Ensure explicit permissions after mkdir
        if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
            throw new RuntimeException('Failed to create dispatch directory');
        }
        @chmod($dir, 0775);
        return $dir;
    }

    private function shopfloor(): ShopfloorExecutionService
    {
        if ($this->shopfloorSvc === null) {
            $this->shopfloorSvc = new ShopfloorExecutionService(
                $this->dataDir,
                $this->data,
                connectedGovernance: new ConnectedGovernanceService($this->dataDir, $this->data),
            );
        }

        return $this->shopfloorSvc;
    }

    private function persistence(): ShopfloorExecutionPersistenceService
    {
        if ($this->persistenceSvc === null) {
            $this->persistenceSvc = new ShopfloorExecutionPersistenceService($this->data);
        }

        return $this->persistenceSvc;
    }

    /**
     * @return resource
     */
    private function acquireExecutionStateLock(int $operation = LOCK_EX)
    {
        $lockFile = $this->dispatchDir() . '/dispatch_state.lock';
        $lockHandle = @fopen($lockFile, 'c');
        if (!is_resource($lockHandle)) {
            throw new RuntimeException('dispatch_state_lock_unavailable');
        }

        if (!flock($lockHandle, $operation)) {
            @fclose($lockHandle);
            throw new RuntimeException('dispatch_state_lock_failed');
        }

        return $lockHandle;
    }

    private function dispatchExecutionEventFile(): string
    {
        return $this->dispatchDir() . '/execution_events.json';
    }

    private function releaseExecutionStateLock(mixed $lockHandle): void
    {
        if (!is_resource($lockHandle)) {
            return;
        }

        @flock($lockHandle, LOCK_UN);
        @fclose($lockHandle);
    }

    /**
     * @param array<int|string, mixed> $logs
     * @param array<int|string, mixed> $targets
     * @param array<int|string, mixed> $events
     * @param array<int|string, mixed> $originalLogs
     * @param array<int|string, mixed> $originalTargets
     * @param array<int|string, mixed> $originalEvents
     */
    private function writeExecutionState(
        string $logFile,
        array $logs,
        string $targetFile,
        array $targets,
        string $eventFile,
        array $events,
        array $originalLogs,
        array $originalTargets,
        array $originalEvents,
        ?string $dispatchEventFile = null,
        ?array $dispatchEvents = null,
        ?array $originalDispatchEvents = null,
    ): void {
        try {
            $this->writeJsonFile($logFile, $logs);
            $this->writeJsonFile($targetFile, $targets);
            $this->writeJsonFile($eventFile, $events);
            if ($dispatchEventFile !== null && is_array($dispatchEvents)) {
                $this->writeJsonFile($dispatchEventFile, $dispatchEvents);
            }
        } catch (Throwable $e) {
            try {
                $this->writeJsonFile($logFile, $originalLogs);
                $this->writeJsonFile($targetFile, $originalTargets);
                $this->writeJsonFile($eventFile, $originalEvents);
                if ($dispatchEventFile !== null && is_array($originalDispatchEvents)) {
                    $this->writeJsonFile($dispatchEventFile, $originalDispatchEvents);
                }
            } catch (Throwable $rollback) {
                @error_log('[DispatchController] dispatch state rollback failed: ' . $rollback->getMessage());
            }
            throw $e;
        }
    }

    /**
     * @param array<int|string, mixed> $targets
     * @param array<int|string, mixed> $events
     * @param array<int|string, mixed> $originalTargets
     * @param array<int|string, mixed> $originalEvents
     */
    private function writeTargetState(
        string $targetFile,
        array $targets,
        string $eventFile,
        array $events,
        array $originalTargets,
        array $originalEvents,
    ): void {
        try {
            $this->writeJsonFile($targetFile, $targets);
            $this->writeJsonFile($eventFile, $events);
        } catch (Throwable $e) {
            try {
                $this->writeJsonFile($targetFile, $originalTargets);
                $this->writeJsonFile($eventFile, $originalEvents);
            } catch (Throwable $rollback) {
                @error_log('[DispatchController] dispatch target rollback failed: ' . $rollback->getMessage());
            }
            throw $e;
        }
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    /**
     * @return list<string>
     */
    private function dispatchActorIdentifiers(array $user): array
    {
        $ids = [];
        foreach (['employee_id', 'username', 'user', 'user_id', 'id'] as $field) {
            $value = trim((string)($user[$field] ?? ''));
            if ($value !== '') {
                $ids[] = $value;
            }
        }

        $username = $this->userId($user);
        $usersFile = $this->confDir . '/users.json';
        $usersMap = $this->readJsonFile($usersFile);
        if (is_array($usersMap)) {
            foreach ($usersMap as $entry) {
                if (!is_array($entry) || (string)($entry['username'] ?? '') !== $username) {
                    continue;
                }
                foreach (['employee_id', 'user_id', 'id'] as $field) {
                    $value = trim((string)($entry[$field] ?? ''));
                    if ($value !== '') {
                        $ids[] = $value;
                    }
                }
            }
        }

        $ids[] = $username;
        return array_values(array_unique(array_filter($ids, static fn(string $id): bool => $id !== '')));
    }

    /**
     * @param array<string, mixed> $target
     */
    private function dispatchExecutionActorId(array $user, array $target): string
    {
        $assigned = trim((string)($target['operator_id'] ?? ''));
        if ($assigned !== '' && in_array($assigned, $this->dispatchActorIdentifiers($user), true)) {
            return $assigned;
        }

        $ids = $this->dispatchActorIdentifiers($user);
        return $ids[0] ?? $this->userId($user);
    }

    private function sessionPlantScope(): string
    {
        return trim((string)($_SESSION['org_plant_id'] ?? $_SESSION['plant_id'] ?? $_SESSION['org_id'] ?? ''));
    }

    /**
     * @param array<string, mixed> $target
     */
    private function targetPlantScope(array $target): string
    {
        return trim((string)($target['org_plant_id'] ?? $target['plant_id'] ?? ''));
    }

    /**
     * @param array<string, mixed> $before
     * @param array<string, mixed> $after
     * @return list<string>
     */
    private function changedTargetFields(array $before, array $after): array
    {
        $fields = array_values(array_unique(array_merge(array_keys($before), array_keys($after))));
        $changed = [];
        foreach ($fields as $field) {
            if (in_array($field, ['updated_at', 'reference_validation'], true)) {
                continue;
            }
            $beforeValue = $before[$field] ?? null;
            $afterValue = $after[$field] ?? null;
            $beforeJson = json_encode($beforeValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $afterJson = json_encode($afterValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($beforeJson !== $afterJson) {
                $changed[] = (string)$field;
            }
        }

        sort($changed);
        return $changed;
    }

    private function dispatchReadRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'cnc_workshop_manager',
            'production_planner',
            'shift_leader',
            'qa_manager',
            'process_engineer',
            'engineering_lead',
            'quality_engineer',
        ];
    }

    private function dispatchWriteRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'cnc_workshop_manager',
            'production_planner',
            'shift_leader',
            'process_engineer',
            'engineering_lead',
        ];
    }

    private function dispatchOperatorRoles(): array
    {
        return array_values(array_unique(array_merge(
            $this->dispatchWriteRoles(),
            [
                'operator',
                'cnc_operator',
                'setup_technician',
                'cam_nc_programmer',
                'cleaning_packaging_supervisor',
                'cleaning_packaging_technician',
            ]
        )));
    }

    private function requireDispatchReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->dispatchReadRoles());
    }

    private function requireDispatchWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->dispatchWriteRoles());
    }

    private function requireDispatchOperatorAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->dispatchOperatorRoles());
    }

    // nowIso() inherited from BaseController

    // â”€â”€ Shift Targets (Planner creates dispatch plan) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET getTimeline â€” Gantt-style timeline for a date range.
     * Shows all machines, their assigned WOs per shift, operators, targets.
     */
    public function getTimeline(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchReadAccess($user);

        $startDate = $this->query('start_date') ?? date('Y-m-d');
        $endDate   = $this->query('end_date') ?? date('Y-m-d', strtotime('+7 days'));
        $lockHandle = null;

        try {
            $lockHandle = $this->acquireExecutionStateLock(LOCK_SH);

            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];

            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            // Filter by date range
            $filtered = array_filter($targets, function ($t) use ($startDate, $endDate) {
                $d = $t['shift_date'] ?? '';
                return $d >= $startDate && $d <= $endDate;
            });

            // Group by machine â†’ date â†’ shift
            $timeline = [];
            foreach ($filtered as $t) {
                $mid = $t['machine_id'] ?? '';
                $d   = $t['shift_date'] ?? '';
                $s   = $t['shift_code'] ?? 'morning';
                if (!isset($timeline[$mid])) {
                    $timeline[$mid] = ['machine_id' => $mid, 'days' => []];
                }
                if (!isset($timeline[$mid]['days'][$d])) {
                    $timeline[$mid]['days'][$d] = [];
                }
                $timeline[$mid]['days'][$d][] = $this->shopfloor()->targetResponse($t);
            }

            // Load production logs for actual data
            $logMap  = [];
            foreach ($logs as $log) {
                $key = ($log['target_id'] ?? '');
                if ($key) $logMap[$key] = $log;
            }

            $this->success([
                'timeline'   => array_values($timeline),
                'logs'       => $logMap,
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('timeline_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * POST createTarget â€” Create shift production target (planner dispatches work).
     */
    public function createTarget(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();

        $uid = $this->userId($user);
        $now = $this->nowIso();
        $lockHandle = null;

        try {
            $target = $this->shopfloor()->normalizeTargetForCreate($body, $uid, $now);

            $lockHandle = $this->acquireExecutionStateLock();

            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $originalTargets = $targets;
            $eventFile = $this->dispatchExecutionEventFile();
            $events = $this->readJsonFile($eventFile) ?? [];
            $originalEvents = $events;

            $targets[] = $target;
            $dispatchEvent = $this->shopfloor()->buildTargetLifecycleEvent($target, 'dispatch.target_created', $uid, $now, [
                'source_action' => 'dispatch_create_target',
            ]);
            $events[] = $dispatchEvent;
            $this->writeTargetState($file, $targets, $eventFile, $events, $originalTargets, $originalEvents);
            $bridge = $this->persistence()->shadowTarget($target);
            $eventBridge = $this->persistence()->shadowExecutionEvent($dispatchEvent);

            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $this->auditLog('dispatch_create_target', [
                'target_id'  => $target['target_id'],
                'wo_number'  => $target['wo_number'],
                'machine_id' => $target['machine_id'],
                'shift_date' => $target['shift_date'],
                'target_qty' => $target['target_quantity'],
            ], $uid);

            $this->success([
                'target' => $this->shopfloor()->targetResponse($target),
                'storage_bridge' => $bridge,
                'execution_event' => $dispatchEvent,
                'execution_event_bridge' => $eventBridge,
            ], 201);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('create_target_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * POST dispatchTarget â€” Mark target as dispatched (sent to operator).
     */
    public function dispatchTarget(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchWriteAccess($user);
        $this->requireCsrf();

        $body     = $this->jsonBody();
        $targetId = trim((string)($body['target_id'] ?? ''));
        if ($targetId === '') $this->error('missing_target_id', 400);

        $uid = $this->userId($user);
        $now = $this->nowIso();
        $lockHandle = null;

        try {
            $lockHandle = $this->acquireExecutionStateLock();

            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $originalTargets = $targets;
            $eventFile = $this->dispatchExecutionEventFile();
            $events = $this->readJsonFile($eventFile) ?? [];
            $originalEvents = $events;
            $found   = false;
            $previousStatus = '';

            foreach ($targets as &$t) {
                if (($t['target_id'] ?? '') === $targetId) {
                    $this->shopfloor()->assertTargetDispatchable($t);
                    $previousStatus = (string)($t['status'] ?? '');
                    $t['status']        = 'dispatched';
                    $t['dispatched_at'] = $now;
                    $t['updated_at']    = $now;
                    $found = true;
                    break;
                }
            }
            unset($t);

            if (!$found) $this->error('target_not_found', 404);

            $updatedTarget = null;
            foreach ($targets as $candidate) {
                if (is_array($candidate) && ($candidate['target_id'] ?? '') === $targetId) {
                    $updatedTarget = $candidate;
                    break;
                }
            }
            $dispatchEvent = is_array($updatedTarget) ? $this->shopfloor()->buildTargetLifecycleEvent($updatedTarget, 'dispatch.target_dispatched', $uid, $now, [
                'source_action' => 'dispatch_target',
                'previous_status' => $previousStatus,
            ]) : null;
            if (is_array($dispatchEvent)) {
                $events[] = $dispatchEvent;
            }
            $this->writeTargetState($file, $targets, $eventFile, $events, $originalTargets, $originalEvents);
            $bridge = is_array($updatedTarget) ? $this->persistence()->shadowTarget($updatedTarget) : ['backend' => 'json_only', 'status' => 'skipped'];
            $eventBridge = is_array($dispatchEvent) ? $this->persistence()->shadowExecutionEvent($dispatchEvent) : ['backend' => 'json_only', 'status' => 'skipped'];

            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $this->auditLog('dispatch_target', ['target_id' => $targetId], $uid);
            $this->success(['dispatched' => true, 'storage_bridge' => $bridge, 'execution_event' => $dispatchEvent, 'execution_event_bridge' => $eventBridge]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('dispatch_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * GET getOperatorDispatch â€” Get all dispatched targets for an operator today.
     * This is what the operator sees on their phone.
     */
    public function getOperatorDispatch(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchOperatorAccess($user);

        $currentUserId = $this->userId($user);
        $actorIds = $this->dispatchActorIdentifiers($user);
        $requestedOperatorId = trim((string)($this->query('operator_id') ?? ''));
        $operatorId = $requestedOperatorId !== '' ? $requestedOperatorId : ($actorIds[0] ?? $currentUserId);
        // PROC-017: Validate operator_id format to prevent injection attacks
        if (!preg_match('/^[a-zA-Z0-9_\-\.@]{1,128}$/', $operatorId)) {
            $operatorId = $actorIds[0] ?? $currentUserId; // fallback to self
        }
        $selfLookup = $requestedOperatorId === '';
        $operatorLookupIds = $selfLookup ? $actorIds : [$operatorId];
        if (!$selfLookup && !in_array($operatorId, $actorIds, true) && !$this->userHasAnyRole($user, $this->dispatchWriteRoles())) {
            $this->error('forbidden', 403);
        }

        $plantId = $this->sessionPlantScope();

        $date = $this->query('date') ?? date('Y-m-d');
        $shiftCode = $this->query('shift_code');
        $lockHandle = null;

        try {
            $date = $this->shopfloor()->normalizeDateFilter($date, 'date');
            $shiftCode = $this->shopfloor()->normalizeOptionalShiftCode($shiftCode);

            $lockHandle = $this->acquireExecutionStateLock(LOCK_SH);

            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];

            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $logMap  = [];
            foreach ($logs as $l) {
                if (is_array($l) && ($l['target_id'] ?? '') !== '') {
                    $logMap[(string)$l['target_id']] = $l;
                }
            }

            // P1: Filter targets to only include those belonging to the current plant
            $myTasks = [];
            $operatorFound = false;
            foreach ($targets as $t) {
                $status = (string)($t['status'] ?? 'planned');
                if (!in_array($status, ['dispatched', 'in_progress', 'completed'], true)) {
                    continue;
                }
                if (in_array((string)($t['operator_id'] ?? ''), $operatorLookupIds, true) && ($t['shift_date'] ?? '') === $date) {
                    // P1: Verify target belongs to current plant if plant_id is available
                    if ($plantId !== '' && $this->targetPlantScope($t) !== $plantId) {
                        continue;
                    }
                    $operatorFound = true;
                    if ($shiftCode !== null && $shiftCode !== '' && ($t['shift_code'] ?? '') !== $shiftCode) {
                        continue;
                    }
                    $log = $logMap[(string)($t['target_id'] ?? '')] ?? null;
                    $task = $this->shopfloor()->targetResponse($t);
                    $task['production_log'] = $log;
                    $myTasks[] = $task;
                }
            }

            // P1: Return 403 if trying to access an operator outside current plant
            if (!$selfLookup && !in_array($operatorId, $actorIds, true) && $plantId !== '' && !$operatorFound) {
                $this->error('forbidden', 403);
            }

            // Sort by dispatch_sequence, then priority
            usort($myTasks, function ($a, $b) {
                $seqA = (int)($a['dispatch_sequence'] ?? 99);
                $seqB = (int)($b['dispatch_sequence'] ?? 99);
                if ($seqA !== $seqB) return $seqA <=> $seqB;
                return (int)($b['priority'] ?? 50) <=> (int)($a['priority'] ?? 50);
            });
            $taskCards = array_map(
                fn(array $task): array => $this->shopfloor()->operatorTaskCard(
                    $task,
                    is_array($task['production_log'] ?? null) ? $task['production_log'] : null,
                ),
                $myTasks,
            );

            $this->success([
                'operator_id' => $operatorId,
                'operator_aliases' => $selfLookup ? $actorIds : [],
                'date'        => $date,
                'shift_code'  => $shiftCode,
                'tasks'       => $myTasks,
                'task_cards'  => $taskCards,
                'task_count'  => count($myTasks),
            ]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('operator_dispatch_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * POST reportProduction - Operator reports shift output.
     */
    public function reportProduction(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchOperatorAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['target_id', 'quantity_good']);
        $this->recordProductionReport($body, $user);
    }

    /**
     * POST pauseTarget - Command-level pause capture using the same report ledger.
     */
    public function pauseTarget(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchOperatorAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['target_id', 'idempotency_key']);
        if (!isset($body['quantity_good'])) {
            $body['quantity_good'] = 0;
        }
        $body['execution_event_type'] = 'pause';
        $body['completion_intent'] = 'none';

        $reasonCode = trim((string)($body['downtime_reason_code'] ?? $body['reason_code'] ?? ''));
        $minutes = (float)($body['actual_idle_minutes'] ?? $body['downtime_minutes'] ?? $body['minutes'] ?? 0);
        if (!isset($body['downtime_events']) && $reasonCode !== '') {
            $body['downtime_events'] = [[
                'reason_code' => $reasonCode,
                'minutes' => $minutes,
                'notes' => trim((string)($body['notes'] ?? '')),
            ]];
        }

        // P6: Check idempotency - if already paused, return success
        try {
            $lockHandle = $this->acquireExecutionStateLock(LOCK_SH);
            $tFile   = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($tFile) ?? [];
            $targetId = trim((string)($body['target_id'] ?? ''));
            foreach ($targets as $t) {
                if (is_array($t) && ($t['target_id'] ?? '') === $targetId) {
                    $currentState = (string)($t['execution_state'] ?? '');
                    if ($currentState === 'paused') {
                        $this->releaseExecutionStateLock($lockHandle);
                        $this->success(['target' => $t, 'idempotent' => true, 'message' => 'Target already paused']);
                    }
                    break;
                }
            }
            $this->releaseExecutionStateLock($lockHandle);
        } catch (Throwable) {
            // Continue to record the pause even if idempotency check fails
        }

        $this->recordProductionReport($body, $user);
    }

    /**
     * POST resumeTarget - Command-level resume capture using the same report ledger.
     */
    public function resumeTarget(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchOperatorAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['target_id', 'idempotency_key', 'resumed_from_event_id']);
        if (!isset($body['quantity_good'])) {
            $body['quantity_good'] = 0;
        }
        $body['execution_event_type'] = 'resume';
        $body['completion_intent'] = 'none';

        // P6: Check idempotency - if already running, return success
        try {
            $lockHandle = $this->acquireExecutionStateLock(LOCK_SH);
            $tFile   = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($tFile) ?? [];
            $targetId = trim((string)($body['target_id'] ?? ''));
            foreach ($targets as $t) {
                if (is_array($t) && ($t['target_id'] ?? '') === $targetId) {
                    $currentState = (string)($t['execution_state'] ?? '');
                    if ($currentState === 'running' || $currentState === 'in_progress') {
                        $this->releaseExecutionStateLock($lockHandle);
                        $this->success(['target' => $t, 'idempotent' => true, 'message' => 'Target already running']);
                    }
                    break;
                }
            }
            $this->releaseExecutionStateLock($lockHandle);
        } catch (Throwable) {
            // Continue to record the resume even if idempotency check fails
        }

        $this->recordProductionReport($body, $user);
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $user
     */
    private function recordProductionReport(array $body, array $user): never
    {
        $uid = $this->userId($user);
        $now = $this->nowIso();
        $lockHandle = null;

        try {
            $lockHandle = $this->acquireExecutionStateLock();

            $tFile   = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($tFile) ?? [];
            $originalTargets = $targets;
            $target = null;
            $targetIdx = null;

            foreach ($targets as $idx => $t) {
                if (is_array($t) && ($t['target_id'] ?? '') === trim((string)($body['target_id'] ?? ''))) {
                    $target = $t;
                    $targetIdx = $idx;
                    break;
                }
            }

            if (!$target) $this->error('target_not_found', 404);

            $hasPlannerOverride = $this->userHasAnyRole($user, $this->dispatchWriteRoles());
            $actorIds = $this->dispatchActorIdentifiers($user);
            if (!$hasPlannerOverride && !in_array((string)($target['operator_id'] ?? ''), $actorIds, true)) {
                $this->error('forbidden', 403);
            }
            $executionActorId = $this->dispatchExecutionActorId($user, $target);

            $this->shopfloor()->assertProductionReportGovernance($body, $target, $hasPlannerOverride, $now);
            $entitlement = $this->shopfloor()->assertReportActorCanSubmit($target, $executionActorId, $hasPlannerOverride, [
                'actor_aliases' => $actorIds,
                'action' => 'dispatch.report_production',
                'request_id' => trim((string)($body['client_report_id'] ?? $body['idempotency_key'] ?? '')),
                'idempotency_key' => trim((string)($body['idempotency_key'] ?? '')),
                'correlation_id' => (string)($target['target_id'] ?? ''),
            ]);

            if ($targetIdx !== null && is_array($targets[$targetIdx] ?? null)) {
                $status = (string)($target['status'] ?? 'planned');
                if ($status === 'planned' || $status === 'dispatched') {
                    $targets[$targetIdx]['status'] = 'in_progress';
                    $targets[$targetIdx]['started_at'] = $targets[$targetIdx]['started_at'] ?? $now;
                }
                $targets[$targetIdx]['updated_at'] = $now;
                $target = $targets[$targetIdx];
            }

            if (is_array($entitlement)) {
                $target['execution_entitlement'] = $entitlement;
            }

            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];
            $originalLogs = $logs;
            $eventFile = $this->dispatchDir() . '/production_report_events.json';
            $events = $this->readJsonFile($eventFile) ?? [];
            $originalEvents = $events;
            $dispatchEventFile = $this->dispatchExecutionEventFile();
            $dispatchEvents = $this->readJsonFile($dispatchEventFile) ?? [];
            $originalDispatchEvents = $dispatchEvents;

            $existingIdx = -1;
            $previousLog = null;
            foreach ($logs as $idx => $l) {
                if (($l['target_id'] ?? '') === $target['target_id']) {
                    $existingIdx = $idx;
                    $previousLog = is_array($l) ? $l : null;
                    break;
                }
            }

            $log = $this->shopfloor()->buildProductionLog($body, $target, $previousLog, $executionActorId, $now, $hasPlannerOverride);

            $replayedLog = $this->shopfloor()->replayProductionLogForIdempotency($log, $logs, $events);
            if ($replayedLog !== null) {
                $replayedEvent = $this->findProductionReportEventForReplay($events, $log);
                $replayedDispatchEvent = $this->findDispatchExecutionEventForReplay(
                    $dispatchEvents,
                    $replayedLog,
                    is_array($replayedEvent) ? $replayedEvent : [],
                );
                $this->auditLog('dispatch_report_production_replay', [
                    'target_id' => (string)($replayedLog['target_id'] ?? ''),
                    'idempotency_key' => (string)($log['idempotency_key'] ?? ''),
                ], $uid);
                $this->success([
                    'production_log' => $replayedLog,
                    'production_event' => $replayedEvent,
                    'dispatch_execution_event' => $replayedDispatchEvent,
                    'storage_bridge' => ['backend' => 'json_only', 'status' => 'replayed'],
                    'execution_event_bridge' => ['backend' => 'json_only', 'status' => 'replayed'],
                    'replayed' => true,
                ]);
            }

            if ($existingIdx >= 0) {
                $logs[$existingIdx] = $log;
            } else {
                $logs[] = $log;
            }

            $event = $this->shopfloor()->buildProductionReportEvent($log, $target, $previousLog, $uid, $now);
            $events[] = $event;

            if ($targetIdx !== null && is_array($targets[$targetIdx] ?? null)) {
                $targets[$targetIdx] = $this->shopfloor()->applyExecutionStateFromReport($targets[$targetIdx], $log, $now);
                $target = $targets[$targetIdx];
            }

            $shouldCompleteTarget = $this->shopfloor()->shouldCompleteTarget($log, $body);
            if ($shouldCompleteTarget) {
                foreach ($targets as &$t2) {
                    if (($t2['target_id'] ?? '') === $target['target_id']) {
                        $t2['status'] = 'completed';
                        $t2['completed_at'] = $now;
                        $t2['execution_state'] = 'completed';
                        $t2['updated_at'] = $now;
                        $target = $t2;
                        break;
                    }
                }
                unset($t2);
            }
            $dispatchEventType = match ((string)($log['execution_event_type'] ?? 'progress')) {
                'pause' => 'dispatch.target_paused',
                'resume' => 'dispatch.target_resumed',
                'downtime' => 'dispatch.downtime_reported',
                'blocked' => 'dispatch.production_blocked',
                default => $shouldCompleteTarget ? 'dispatch.target_completed' : 'dispatch.production_reported',
            };
            $dispatchEvent = $this->shopfloor()->buildTargetLifecycleEvent($target, $dispatchEventType, $uid, $now, [
                'source_action' => 'dispatch_report_production',
                'source_report_event_id' => (string)($event['event_id'] ?? ''),
                'source_log_id' => (string)($log['log_id'] ?? ''),
                'execution_event_type' => (string)($log['execution_event_type'] ?? 'progress'),
                'report_mode' => (string)($log['report_mode'] ?? 'snapshot'),
                'quality_gate_status' => is_array($log['quality_gate'] ?? null) ? (string)($log['quality_gate']['status'] ?? '') : '',
            ]);
            $dispatchEvents[] = $dispatchEvent;

            $this->writeExecutionState(
                $logFile,
                $logs,
                $tFile,
                $targets,
                $eventFile,
                $events,
                $originalLogs,
                $originalTargets,
                $originalEvents,
                $dispatchEventFile,
                $dispatchEvents,
                $originalDispatchEvents,
            );
            $bridge = $this->persistence()->shadowProductionReport($target, $log, $event);
            $eventBridge = $this->persistence()->shadowExecutionEvent($dispatchEvent);

            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $this->shopfloor()->appendProductionReportEvent($log, $target, $uid);

            $this->auditLog('dispatch_report_production', [
                'target_id' => $target['target_id'],
                'qty_good'  => $log['quantity_good'],
                'qty_ng'    => $log['quantity_ng'],
                'achieve'   => $log['achievement_pct'] . '%',
                'execution_event_type' => $log['execution_event_type'],
            ], $uid);

            $this->success([
                'production_log' => $log,
                'production_event' => $event,
                'dispatch_execution_event' => $dispatchEvent,
                'storage_bridge' => $bridge,
                'execution_event_bridge' => $eventBridge,
            ]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (ConnectedGovernanceException $e) {
            $this->error($e->reasonCode(), 409, $e->getMessage(), ['entitlement' => $e->details()]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            if (in_array($e->getMessage(), ['forbidden_operator_assignment', 'missing_operator_assignment'], true)) {
                $this->error('forbidden', 403);
            }
            if (in_array($e->getMessage(), ['correction_override_required', 'backdate_override_required'], true)) {
                $this->error($e->getMessage(), 403);
            }
            if ($e->getMessage() === 'target_not_dispatched') {
                $this->error('target_not_dispatched', 409);
            }
            if ($e->getMessage() === 'idempotency_conflict') {
                $this->error('idempotency_conflict', 409);
            }
            $this->error('report_production_failed', 500, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('report_production_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * @param array<int|string, mixed> $events
     * @param array<string, mixed> $log
     * @return array<string, mixed>|null
     */
    private function findProductionReportEventForReplay(array $events, array $log): ?array
    {
        $idempotencyKey = trim((string)($log['idempotency_key'] ?? ''));
        $targetId = trim((string)($log['target_id'] ?? ''));
        $fingerprint = trim((string)($log['report_fingerprint'] ?? ''));
        foreach ($events as $event) {
            if (!is_array($event)) {
                continue;
            }
            if (
                trim((string)($event['idempotency_key'] ?? '')) === $idempotencyKey
                && trim((string)($event['target_id'] ?? '')) === $targetId
                && trim((string)($event['report_fingerprint'] ?? '')) === $fingerprint
            ) {
                /** @var array<string, mixed> $event */
                return $event;
            }
        }

        return null;
    }

    /**
     * @param array<int|string, mixed> $dispatchEvents
     * @param array<string, mixed> $log
     * @param array<string, mixed> $productionEvent
     * @return array<string, mixed>|null
     */
    private function findDispatchExecutionEventForReplay(array $dispatchEvents, array $log, array $productionEvent): ?array
    {
        $targetId = trim((string)($log['target_id'] ?? ''));
        $eventId = trim((string)($productionEvent['event_id'] ?? ''));
        $logId = trim((string)($log['log_id'] ?? ''));
        foreach ($dispatchEvents as $event) {
            if (!is_array($event)) {
                continue;
            }
            $context = is_array($event['context'] ?? null) ? $event['context'] : [];
            if (trim((string)($event['target_id'] ?? '')) !== $targetId) {
                continue;
            }
            if ($eventId !== '' && trim((string)($context['source_report_event_id'] ?? '')) === $eventId) {
                /** @var array<string, mixed> $event */
                return $event;
            }
            if ($logId !== '' && trim((string)($context['source_log_id'] ?? '')) === $logId) {
                /** @var array<string, mixed> $event */
                return $event;
            }
        }

        return null;
    }

    /**
     * GET getDashboard â€” Dispatch overview with shift summary.
     */
    public function getDashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchReadAccess($user);

        $date = $this->query('date') ?? date('Y-m-d');
        $lockHandle = null;

        try {
            $lockHandle = $this->acquireExecutionStateLock(LOCK_SH);

            $tFile   = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($tFile) ?? [];
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];

            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $today = array_filter($targets, fn($t) => ($t['shift_date'] ?? '') === $date);
            $logMap = [];
            foreach ($logs as $l) {
                $logMap[$l['target_id'] ?? ''] = $l;
            }

            $totalTarget  = 0;
            $totalGood    = 0;
            $totalNg      = 0;
            $totalRework  = 0;
            $machines     = [];
            $operators    = [];

            foreach ($today as $t) {
                $totalTarget += (int)($t['target_quantity'] ?? 0);
                $log = $logMap[$t['target_id'] ?? ''] ?? null;
                if ($log) {
                    $totalGood   += (int)($log['quantity_good'] ?? 0);
                    $totalNg     += (int)($log['quantity_ng'] ?? 0);
                    $totalRework += (int)($log['quantity_rework'] ?? 0);
                }
                $machines[$t['machine_id'] ?? '']  = true;
                $operators[$t['operator_id'] ?? ''] = true;
            }

            $overallAchieve = $totalTarget > 0 ? round(($totalGood / $totalTarget) * 100, 1) : 0;
            $totalProduced  = $totalGood + $totalNg + $totalRework;
            $overallNgRate  = $totalProduced > 0 ? round(($totalNg / $totalProduced) * 100, 1) : 0;

            $this->success([
                'date'               => $date,
                'total_tasks'        => count($today),
                'planned'            => count(array_filter($today, fn($t) => ($t['status'] ?? '') === 'planned')),
                'dispatched'         => count(array_filter($today, fn($t) => ($t['status'] ?? '') === 'dispatched')),
                'in_progress'        => count(array_filter($today, fn($t) => ($t['status'] ?? '') === 'in_progress')),
                'completed'          => count(array_filter($today, fn($t) => ($t['status'] ?? '') === 'completed')),
                'machines_active'    => count($machines),
                'operators_active'   => count($operators),
                'total_target'       => $totalTarget,
                'total_good'         => $totalGood,
                'total_ng'           => $totalNg,
                'total_rework'       => $totalRework,
                'achievement_pct'    => $overallAchieve,
                'ng_rate_pct'        => $overallNgRate,
                'targets'            => array_map(
                    fn(array $target): array => $this->shopfloor()->targetResponse($target),
                    array_values($today),
                ),
                'logs'               => $logMap,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('dashboard_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * GET listTargets â€” List all targets with filters.
     */
    public function listTargets(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchReadAccess($user);

        $startDate  = $this->query('start_date');
        $endDate    = $this->query('end_date');
        $machineId  = $this->query('machine_id');
        $operatorId = $this->query('operator_id');
        $status     = $this->query('status');
        $lockHandle = null;

        // PROC-001: Add mandatory plant_id/org_id filter from session
        $sessionPlantId = $this->sessionPlantScope();

        try {
            $lockHandle = $this->acquireExecutionStateLock(LOCK_SH);
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $filtered = array_filter($targets, function ($t) use ($startDate, $endDate, $machineId, $operatorId, $status, $sessionPlantId) {
                // PROC-001: Filter results only for targets where plant_id matches session
                if ($sessionPlantId !== '' && $this->targetPlantScope($t) !== $sessionPlantId) return false;
                if ($startDate && ($t['shift_date'] ?? '') < $startDate) return false;
                if ($endDate && ($t['shift_date'] ?? '') > $endDate) return false;
                if ($machineId && ($t['machine_id'] ?? '') !== $machineId) return false;
                if ($operatorId && ($t['operator_id'] ?? '') !== $operatorId) return false;
                if ($status && ($t['status'] ?? '') !== $status) return false;
                return true;
            });

            usort($filtered, function ($a, $b) {
                $cmp = ($a['shift_date'] ?? '') <=> ($b['shift_date'] ?? '');
                if ($cmp !== 0) return $cmp;
                return ($a['dispatch_sequence'] ?? 99) <=> ($b['dispatch_sequence'] ?? 99);
            });

            $offset = max(0, (int)($this->query('offset') ?? 0));
            $limit  = min(200, max(1, (int)($this->query('limit') ?? 50)));

            $page = array_map(
                fn(array $target): array => $this->shopfloor()->targetResponse($target),
                array_slice(array_values($filtered), $offset, $limit),
            );

            $this->paginated('targets', $page, count($filtered), $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('list_targets_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * POST updateTarget â€” Update an existing target.
     */
    public function updateTarget(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchWriteAccess($user);
        $this->requireCsrf();

        $body     = $this->jsonBody();
        $targetId = trim((string)($body['target_id'] ?? ''));
        if ($targetId === '') $this->error('missing_target_id', 400);

        $uid = $this->userId($user);
        $now = $this->nowIso();
        $lockHandle = null;

        // PROC-001: Add mandatory plant_id/org_id filter from session
        $sessionPlantId = $this->sessionPlantScope();

        try {
            $lockHandle = $this->acquireExecutionStateLock();

            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $originalTargets = $targets;
            $eventFile = $this->dispatchExecutionEventFile();
            $events = $this->readJsonFile($eventFile) ?? [];
            $originalEvents = $events;
            $updated = null;
            $previousTarget = null;

            foreach ($targets as &$t) {
                if (($t['target_id'] ?? '') === $targetId) {
                    // PROC-001: Validate ownership check BEFORE modifying
                    if ($sessionPlantId !== '' && $this->targetPlantScope($t) !== $sessionPlantId) {
                        $this->error('forbidden', 403, 'Cannot modify dispatch targets outside your plant');
                    }
                    $previousTarget = is_array($t) ? $t : null;
                    $t = $this->shopfloor()->applyTargetUpdates($t, $body, $now);
                    $updated = $t;
                    break;
                }
            }
            unset($t);

            if (!$updated) $this->error('target_not_found', 404);

            $dispatchEvent = $this->shopfloor()->buildTargetLifecycleEvent($updated, 'dispatch.target_updated', $uid, $now, [
                'source_action' => 'dispatch_update_target',
                'previous_status' => is_array($previousTarget) ? (string)($previousTarget['status'] ?? '') : '',
                'changed_fields' => $this->changedTargetFields(is_array($previousTarget) ? $previousTarget : [], $updated),
                'supervisor_override_reason' => trim((string)($body['supervisor_override_reason'] ?? $body['override_reason'] ?? '')),
            ]);
            $events[] = $dispatchEvent;
            $this->writeTargetState($file, $targets, $eventFile, $events, $originalTargets, $originalEvents);
            $bridge = $this->persistence()->shadowTarget($updated);
            $eventBridge = $this->persistence()->shadowExecutionEvent($dispatchEvent);

            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $this->auditLog('dispatch_update_target', ['target_id' => $targetId], $uid);
            $this->success([
                'target' => $this->shopfloor()->targetResponse($updated),
                'storage_bridge' => $bridge,
                'execution_event' => $dispatchEvent,
                'execution_event_bridge' => $eventBridge,
            ]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('update_target_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }

    /**
     * POST bulkDispatch — Dispatch multiple targets in a single request.
     *
     * Body: { target_ids: string[] }
     * Response: { dispatched: int, failed: string[], results: object[] }
     *
     * Legacy action: `dispatch_bulk_send`
     */
    public function bulkDispatch(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchWriteAccess($user);
        $this->requireCsrf();

        $body      = $this->jsonBody();
        $targetIds = array_values(array_filter(
            array_map('strval', (array)($body['target_ids'] ?? [])),
            static fn(string $id): bool => $id !== '',
        ));

        if (empty($targetIds)) {
            $this->error('missing_target_ids', 400);
        }

        $uid       = $this->userId($user);
        $now       = $this->nowIso();
        $lockHandle = null;

        try {
            $lockHandle = $this->acquireExecutionStateLock();

            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $originalTargets = $targets;
            $eventFile = $this->dispatchExecutionEventFile();
            $events    = $this->readJsonFile($eventFile) ?? [];
            $originalEvents = $events;

            $dispatched = 0;
            $failed     = [];
            $results    = [];

            foreach ($targetIds as $targetId) {
                $found = false;
                foreach ($targets as &$t) {
                    if (($t['target_id'] ?? '') === $targetId) {
                        try {
                            $this->shopfloor()->assertTargetDispatchable($t);
                            $previousStatus = (string)($t['status'] ?? '');
                            $t['status']        = 'dispatched';
                            $t['dispatched_at'] = $now;
                            $t['updated_at']    = $now;
                            $dispatchEvent = $this->shopfloor()->buildTargetLifecycleEvent($t, 'dispatch.target_dispatched', $uid, $now, [
                                'source_action'   => 'dispatch_bulk_send',
                                'previous_status' => $previousStatus,
                            ]);
                            if (is_array($dispatchEvent)) {
                                $events[] = $dispatchEvent;
                            }
                            $results[] = ['target_id' => $targetId, 'ok' => true];
                            $dispatched++;
                        } catch (InvalidArgumentException $e) {
                            $results[] = ['target_id' => $targetId, 'ok' => false, 'error' => $e->getMessage()];
                            $failed[]  = $targetId;
                        }
                        $found = true;
                        break;
                    }
                }
                unset($t);
                if (!$found) {
                    $results[] = ['target_id' => $targetId, 'ok' => false, 'error' => 'not_found'];
                    $failed[]  = $targetId;
                }
            }

            $this->writeTargetState($file, $targets, $eventFile, $events, $originalTargets, $originalEvents);
            $this->releaseExecutionStateLock($lockHandle);
            $lockHandle = null;

            $this->auditLog('dispatch_bulk_send', ['target_ids' => $targetIds, 'dispatched' => $dispatched], $uid);
            $this->success([
                'dispatched' => $dispatched,
                'failed'     => $failed,
                'results'    => $results,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('bulk_dispatch_failed', 500, $e->getMessage());
        } finally {
            $this->releaseExecutionStateLock($lockHandle);
        }
    }
}
