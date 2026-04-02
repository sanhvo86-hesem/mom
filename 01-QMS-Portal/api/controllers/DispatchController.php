<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use Throwable;

/**
 * Production Dispatch Controller.
 *
 * Manages shift targets, operator dispatch, production output reporting,
 * and timeline/Gantt views for the shop floor.
 */
class DispatchController extends BaseController
{
    private function dispatchDir(): string
    {
        $dir = $this->dataDir . '/dispatch';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir;
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    // nowIso() inherited from BaseController

    // â”€â”€ Shift Targets (Planner creates dispatch plan) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET getTimeline â€” Gantt-style timeline for a date range.
     * Shows all machines, their assigned WOs per shift, operators, targets.
     */
    public function getTimeline(): never
    {
        $this->requireAuth();

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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['wo_number', 'machine_id', 'shift_date', 'cycle_time_minutes', 'target_quantity']);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];

            $target = [
                'target_id'             => 'TGT-' . bin2hex(random_bytes(8)),
                'wo_number'             => trim((string)($body['wo_number'] ?? '')),
                'jo_number'             => trim((string)($body['jo_number'] ?? '')),
                'item_id'               => trim((string)($body['item_id'] ?? '')),
                'item_description'      => trim((string)($body['item_description'] ?? '')),
                'machine_id'            => trim((string)($body['machine_id'] ?? '')),
                'operator_id'           => trim((string)($body['operator_id'] ?? '')),
                'shift_date'            => trim((string)($body['shift_date'] ?? '')),
                'shift_code'            => strtolower(trim((string)($body['shift_code'] ?? 'morning'))),
                'cycle_time_minutes'    => (float)($body['cycle_time_minutes'] ?? 0),
                'setup_time_minutes'    => (float)($body['setup_time_minutes'] ?? 0),
                'shift_duration_minutes'=> (float)($body['shift_duration_minutes'] ?? 480),
                'target_quantity'       => (int)($body['target_quantity'] ?? 0),
                'priority'              => (int)($body['priority'] ?? 50),
                'dispatch_sequence'     => (int)($body['dispatch_sequence'] ?? 1),
                'status'                => 'planned',
                'notes'                 => trim((string)($body['notes'] ?? '')),
                'created_by'            => $uid,
                'created_at'            => $now,
                'updated_at'            => $now,
            ];

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

        $operatorId = $this->query('operator_id') ?? $this->userId($user);
        $date       = $this->query('date') ?? date('Y-m-d');

        try {
            $file    = $this->dispatchDir() . '/targets.json';
            $targets = $this->readJsonFile($file) ?? [];

            $myTasks = [];
            foreach ($targets as $t) {
                if (($t['operator_id'] ?? '') === $operatorId && ($t['shift_date'] ?? '') === $date) {
                    // Load production log if exists
                    $logFile = $this->dispatchDir() . '/production_logs.json';
                    $logs    = $this->readJsonFile($logFile) ?? [];
                    $log     = null;
                    foreach ($logs as $l) {
                        if (($l['target_id'] ?? '') === ($t['target_id'] ?? '')) {
                            $log = $l;
                            break;
                        }
                    }
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

            $this->success([
                'operator_id' => $operatorId,
                'date'        => $date,
                'tasks'       => $myTasks,
                'task_count'  => count($myTasks),
            ]);
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
                    if ($t['status'] === 'planned' || $t['status'] === 'dispatched') {
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

            $this->writeJsonFile($tFile, $targets);

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

            $log = [
                'log_id'              => $existingIdx >= 0 ? $logs[$existingIdx]['log_id'] : 'LOG-' . bin2hex(random_bytes(8)),
                'target_id'           => $target['target_id'],
                'wo_number'           => $target['wo_number'],
                'jo_number'           => $target['jo_number'] ?? '',
                'machine_id'          => $target['machine_id'],
                'operator_id'         => $uid,
                'shift_date'          => $target['shift_date'],
                'shift_code'          => $target['shift_code'],
                'quantity_good'       => (int)($body['quantity_good'] ?? 0),
                'quantity_ng'         => (int)($body['quantity_ng'] ?? 0),
                'quantity_rework'     => (int)($body['quantity_rework'] ?? 0),
                'target_quantity'     => $target['target_quantity'],
                'actual_start'        => (string)($body['actual_start'] ?? $target['started_at'] ?? $now),
                'actual_end'          => (string)($body['actual_end'] ?? ''),
                'actual_setup_minutes'=> (float)($body['actual_setup_minutes'] ?? 0),
                'actual_run_minutes'  => (float)($body['actual_run_minutes'] ?? 0),
                'actual_idle_minutes' => (float)($body['actual_idle_minutes'] ?? 0),
                'ng_details'          => is_array($body['ng_details'] ?? null) ? $body['ng_details'] : [],
                'notes'               => trim((string)($body['notes'] ?? '')),
                'issues_encountered'  => trim((string)($body['issues_encountered'] ?? '')),
                'offline_created'     => (bool)($body['offline_created'] ?? false),
                'sync_status'         => 'synced',
                'updated_at'          => $now,
            ];

            // Calculate derived fields
            $total = $log['quantity_good'] + $log['quantity_ng'] + $log['quantity_rework'];
            $log['quantity_total']     = $total;
            $log['achievement_pct']    = $log['target_quantity'] > 0 ? round(($log['quantity_good'] / $log['target_quantity']) * 100, 1) : 0;
            $log['ng_rate_pct']        = $total > 0 ? round(($log['quantity_ng'] / $total) * 100, 1) : 0;

            if ($existingIdx >= 0) {
                $log['created_at']      = $logs[$existingIdx]['created_at'];
                $logs[$existingIdx]     = $log;
            } else {
                $log['created_at'] = $now;
                $logs[] = $log;
            }

            $this->writeJsonFile($logFile, $logs);

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
        $this->requireAuth();

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
        $this->requireAuth();

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
                    $editable = ['operator_id', 'cycle_time_minutes', 'setup_time_minutes', 'target_quantity',
                                 'priority', 'dispatch_sequence', 'shift_code', 'notes', 'machine_id'];
                    foreach ($editable as $field) {
                        if (isset($body[$field])) $t[$field] = $body[$field];
                    }
                    $t['updated_at'] = $now;
                    $updated = $t;
                    break;
                }
            }
            unset($t);

            if (!$updated) $this->error('target_not_found', 404);

            $this->writeJsonFile($file, $targets);
            $this->auditLog('dispatch_update_target', ['target_id' => $targetId], $uid);
            $this->success(['target' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('update_target_failed', 500, $e->getMessage());
        }
    }
}
