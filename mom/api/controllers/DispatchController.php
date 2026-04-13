<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use InvalidArgumentException;
use MOM\Api\Services\ConnectedGovernanceException;
use MOM\Api\Services\ConnectedGovernanceService;
use MOM\Services\ShopfloorExecutionService;
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

    private function dispatchDir(): string
    {
        $dir = $this->dataDir . '/dispatch';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
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
    ): void {
        $lockFile = dirname($logFile) . '/dispatch_state.lock';
        $lockHandle = @fopen($lockFile, 'c');
        if (!is_resource($lockHandle)) {
            throw new RuntimeException('dispatch_state_lock_unavailable');
        }

        try {
            if (!flock($lockHandle, LOCK_EX)) {
                throw new RuntimeException('dispatch_state_lock_failed');
            }
            $this->writeJsonFile($logFile, $logs);
            $this->writeJsonFile($targetFile, $targets);
            $this->writeJsonFile($eventFile, $events);
        } catch (Throwable $e) {
            try {
                $this->writeJsonFile($logFile, $originalLogs);
                $this->writeJsonFile($targetFile, $originalTargets);
                $this->writeJsonFile($eventFile, $originalEvents);
            } catch (Throwable $rollback) {
                @error_log('[DispatchController] dispatch state rollback failed: ' . $rollback->getMessage());
            }
            throw $e;
        } finally {
            @flock($lockHandle, LOCK_UN);
            @fclose($lockHandle);
        }
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
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

        try {
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];

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
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];
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

        try {
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];

            $target = $this->shopfloor()->normalizeTargetForCreate($body, $uid, $now);

            $targets[] = $target;
            $this->writeJsonFile($file, $targets);

            $this->auditLog('dispatch_create_target', [
                'target_id'  => $target['target_id'],
                'wo_number'  => $target['wo_number'],
                'machine_id' => $target['machine_id'],
                'shift_date' => $target['shift_date'],
                'target_qty' => $target['target_quantity'],
            ], $uid);

            $this->success(['target' => $this->shopfloor()->targetResponse($target)], 201);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('create_target_failed', 500, $e->getMessage());
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

        try {
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $found   = false;

            foreach ($targets as &$t) {
                if (($t['target_id'] ?? '') === $targetId) {
                    $t['status']        = 'dispatched';
                    $t['dispatched_at'] = $now;
                    $t['updated_at']    = $now;
                    $found = true;
                    break;
                }
            }
            unset($t);

            if (!$found) $this->error('target_not_found', 404);

            $this->writeJsonFile($file, $targets);
            $this->auditLog('dispatch_target', ['target_id' => $targetId], $uid);
            $this->success(['dispatched' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('dispatch_failed', 500, $e->getMessage());
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
        $operatorId    = trim((string)($this->query('operator_id') ?? $currentUserId));
        if ($operatorId === '') {
            $operatorId = $currentUserId;
        }
        if ($operatorId !== $currentUserId && !$this->userHasAnyRole($user, $this->dispatchWriteRoles())) {
            $this->error('forbidden', 403);
        }
        $date = $this->query('date') ?? date('Y-m-d');
        $shiftCode = $this->query('shift_code');

        try {
            $date = $this->shopfloor()->normalizeDateFilter($date, 'date');
            $shiftCode = $this->shopfloor()->normalizeOptionalShiftCode($shiftCode);
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];
            $logMap  = [];
            foreach ($logs as $l) {
                if (is_array($l) && ($l['target_id'] ?? '') !== '') {
                    $logMap[(string)$l['target_id']] = $l;
                }
            }

            $myTasks = [];
            foreach ($targets as $t) {
                $status = (string)($t['status'] ?? 'planned');
                if (!in_array($status, ['dispatched', 'in_progress', 'completed'], true)) {
                    continue;
                }
                if (($t['operator_id'] ?? '') === $operatorId && ($t['shift_date'] ?? '') === $date) {
                    if ($shiftCode !== null && $shiftCode !== '' && ($t['shift_code'] ?? '') !== $shiftCode) {
                        continue;
                    }
                    $log = $logMap[(string)($t['target_id'] ?? '')] ?? null;
                    $task = $this->shopfloor()->targetResponse($t);
                    $task['production_log'] = $log;
                    $myTasks[] = $task;
                }
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
        }
    }

    /**
     * POST reportProduction â€” Operator reports shift output (qty good, NG, rework).
     * Appends report history and updates the latest per-target snapshot.
     */
    public function reportProduction(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchOperatorAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['target_id', 'quantity_good']);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            // Update target status
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
            $this->shopfloor()->assertProductionReportGovernance($body, $target, $hasPlannerOverride, $now);
            $entitlement = $this->shopfloor()->assertReportActorCanSubmit($target, $uid, $hasPlannerOverride, [
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

            // Create or update production log
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];
            $originalLogs = $logs;
            $eventFile = $this->dispatchDir() . '/production_report_events.json';
            $events = $this->readJsonFile($eventFile) ?? [];
            $originalEvents = $events;

            $existingIdx = -1;
            $previousLog = null;
            foreach ($logs as $idx => $l) {
                if (($l['target_id'] ?? '') === $target['target_id']) {
                    $existingIdx = $idx;
                    $previousLog = is_array($l) ? $l : null;
                    break;
                }
            }

            $log = $this->shopfloor()->buildProductionLog(
                $body,
                $target,
                $previousLog,
                $uid,
                $now,
            );

            $replayedLog = $this->shopfloor()->replayProductionLogForIdempotency($log, $logs, $events);
            if ($replayedLog !== null) {
                $this->auditLog('dispatch_report_production_replay', [
                    'target_id' => (string)($replayedLog['target_id'] ?? ''),
                    'idempotency_key' => (string)($log['idempotency_key'] ?? ''),
                ], $uid);
                $this->success(['production_log' => $replayedLog, 'replayed' => true]);
            }

            if ($existingIdx >= 0) {
                $logs[$existingIdx]     = $log;
            } else {
                $logs[] = $log;
            }

            $event = $this->shopfloor()->buildProductionReportEvent($log, $target, $previousLog, $uid, $now);
            $events[] = $event;

            if ($this->shopfloor()->shouldCompleteTarget($log, $body)) {
                foreach ($targets as &$t2) {
                    if (($t2['target_id'] ?? '') === $target['target_id']) {
                        $t2['status']       = 'completed';
                        $t2['completed_at'] = $now;
                        $t2['updated_at']   = $now;
                        break;
                    }
                }
                unset($t2);
            }

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
            );
            $this->shopfloor()->appendProductionReportEvent($log, $target, $uid);

            $this->auditLog('dispatch_report_production', [
                'target_id' => $target['target_id'],
                'qty_good'  => $log['quantity_good'],
                'qty_ng'    => $log['quantity_ng'],
                'achieve'   => $log['achievement_pct'] . '%',
            ], $uid);

            $this->success(['production_log' => $log, 'production_event' => $event]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (ConnectedGovernanceException $e) {
            $this->error($e->reasonCode(), 409, $e->getMessage(), ['entitlement' => $e->details()]);
        } catch (RuntimeException $e) {
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
        }
    }

    /**
     * GET getDashboard â€” Dispatch overview with shift summary.
     */
    public function getDashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireDispatchReadAccess($user);

        $date = $this->query('date') ?? date('Y-m-d');

        try {
            $tFile   = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($tFile) ?? [];
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];

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

        try {
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];

            $filtered = array_filter($targets, function ($t) use ($startDate, $endDate, $machineId, $operatorId, $status) {
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

        try {
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];
            $updated = null;

            foreach ($targets as &$t) {
                if (($t['target_id'] ?? '') === $targetId) {
                    $t = $this->shopfloor()->applyTargetUpdates($t, $body, $now);
                    $updated = $t;
                    break;
                }
            }
            unset($t);

            if (!$updated) $this->error('target_not_found', 404);

            $this->writeJsonFile($file, $targets);
            $this->auditLog('dispatch_update_target', ['target_id' => $targetId], $uid);
            $this->success(['target' => $this->shopfloor()->targetResponse($updated)]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('update_target_failed', 500, $e->getMessage());
        }
    }
}
