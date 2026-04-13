<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use InvalidArgumentException;
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
            $this->shopfloorSvc = new ShopfloorExecutionService($this->dataDir, $this->data);
        }

        return $this->shopfloorSvc;
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
                $timeline[$mid]['days'][$d][] = $t;
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
        $this->requireFields($body, ['wo_number', 'shift_date', 'cycle_time_minutes', 'target_quantity']);
        if (trim((string)($body['machine_id'] ?? $body['equipment_id'] ?? '')) === '') {
            $this->error('missing_machine_id', 400);
        }

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

            $this->success(['target' => $target], 201);
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
                if (($t['operator_id'] ?? '') === $operatorId && ($t['shift_date'] ?? '') === $date) {
                    if ($shiftCode !== null && $shiftCode !== '' && ($t['shift_code'] ?? '') !== $shiftCode) {
                        continue;
                    }
                    $log = $logMap[(string)($t['target_id'] ?? '')] ?? null;
                    $t['production_log'] = $log;
                    $myTasks[] = $t;
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
     * Can be called multiple times (updates existing log for same target).
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
            $target  = null;

            foreach ($targets as &$t) {
                if (($t['target_id'] ?? '') === trim((string)($body['target_id'] ?? ''))) {
                    $status = (string)($t['status'] ?? 'planned');
                    if ($status === 'planned' || $status === 'dispatched') {
                        $t['status']    = 'in_progress';
                        $t['started_at'] = $t['started_at'] ?? $now;
                    }
                    $t['updated_at'] = $now;
                    $target = $t;
                    break;
                }
            }
            unset($t);

            if (!$target) $this->error('target_not_found', 404);
            $this->shopfloor()->assertReportActorCanSubmit($target, $uid, $this->userHasAnyRole($user, $this->dispatchWriteRoles()));

            // Create or update production log
            $logFile = $this->dispatchDir() . '/production_logs.json';
            $logs    = $this->readJsonFile($logFile) ?? [];

            $existingIdx = -1;
            foreach ($logs as $idx => $l) {
                if (($l['target_id'] ?? '') === $target['target_id']) {
                    $existingIdx = $idx;
                    break;
                }
            }

            $log = $this->shopfloor()->buildProductionLog(
                $body,
                $target,
                $existingIdx >= 0 && is_array($logs[$existingIdx] ?? null) ? $logs[$existingIdx] : null,
                $uid,
                $now,
            );

            if ($existingIdx >= 0) {
                $logs[$existingIdx]     = $log;
            } else {
                $logs[] = $log;
            }

            $this->writeJsonFile($tFile, $targets);
            $this->writeJsonFile($logFile, $logs);
            $this->shopfloor()->appendProductionReportEvent($log, $target, $uid);

            // Auto-complete target if achievement >= 100%
            if ($log['achievement_pct'] >= 100) {
                foreach ($targets as &$t2) {
                    if (($t2['target_id'] ?? '') === $target['target_id']) {
                        $t2['status']       = 'completed';
                        $t2['completed_at'] = $now;
                        $t2['updated_at']   = $now;
                        break;
                    }
                }
                unset($t2);
                $this->writeJsonFile($tFile, $targets);
            }

            $this->auditLog('dispatch_report_production', [
                'target_id' => $target['target_id'],
                'qty_good'  => $log['quantity_good'],
                'qty_ng'    => $log['quantity_ng'],
                'achieve'   => $log['achievement_pct'] . '%',
            ], $uid);

            $this->success(['production_log' => $log]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'forbidden_operator_assignment') {
                $this->error('forbidden', 403);
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
                'targets'            => array_values($today),
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

            $this->paginated('targets', array_slice(array_values($filtered), $offset, $limit), count($filtered), $offset, $limit);
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
            $this->success(['target' => $updated]);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('update_target_failed', 500, $e->getMessage());
        }
    }
}
