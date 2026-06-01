<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use MOM\Api\Services\GateContextBuilder;
use MOM\Api\Services\RuntimeRequirementGateException;
use MOM\Api\Services\RuntimeRequirementResolverService;
use MOM\Api\Services\Uom\UomRuntimeAuthorityService;
use MOM\Api\Services\WorkforceQualificationException;
use MOM\Database\Connection;
use MOM\Services\MobileWorkQueueService;
use Throwable;

/**
 * Mobile Shop Floor controller for HESEM MOM Portal.
 *
 * Provides API endpoints for operator work queues, time clock
 * (clock-in/clock-out), first-piece and in-process inspection
 * captures from tablets, offline batch sync with conflict
 * resolution, and shop floor overview dashboards.
 *
 * Any authenticated user can access mobile functions (operators,
 * setup technicians, supervisors). Operator identification uses
 * the session user mapped to employee_id via users.json.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class MobileController extends BaseController
{
    /** @var MobileWorkQueueService|null Lazy-loaded mobile work queue service. */
    private ?MobileWorkQueueService $mobileSvc = null;

    // â”€â”€ Service Access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Get or create the MobileWorkQueueService instance.
     *
     * @return MobileWorkQueueService
     */
    private function mobileService(): MobileWorkQueueService
    {
        if ($this->mobileSvc === null) {
            $db = Connection::getInstance();
            $gateContextBuilder = new GateContextBuilder(
                new RuntimeRequirementResolverService($db),
                new UomRuntimeAuthorityService($db)
            );
            $this->mobileSvc = new MobileWorkQueueService($this->dataDir, $this->data, null, $gateContextBuilder);
        }
        return $this->mobileSvc;
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    /**
     * @return array<int, string>
     */
    private function mobileAccessRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'production_planner',
                'cnc_workshop_manager',
                'engineering_manager',
                'engineering_lead',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'supervisor',
                'shift_leader',
                'setup_technician',
                'operator',
                'cnc_operator',
            ]
        )));
    }

    /**
     * @return array<int, string>
     */
    private function mobileOverviewRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'production_planner',
                'cnc_workshop_manager',
                'engineering_manager',
                'engineering_lead',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'supervisor',
                'shift_leader',
            ]
        )));
    }

    /**
     * @return array<int, string>
     */
    private function inspectionOverrideRoles(): array
    {
        return $this->mobileOverviewRoles();
    }

    /**
     * @return array<int, string>
     */
    private function mobileConflictOverrideRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'cnc_workshop_manager',
                'quality_manager',
                'qa_manager',
                'supervisor',
                'shift_leader',
            ]
        )));
    }

    /**
     * @return void
     */
    private function requireMobileAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->mobileAccessRoles());
    }

    /**
     * @return void
     */
    private function requireMobileOverviewAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->mobileOverviewRoles());
    }

    /**
     * Resolve employee_id from user record via users.json mapping.
     *
     * MES-R6-014 FIX: Throws exception if no explicit employee_id exists instead of falling back to username.
     *
     * @param array $user User record.
     * @return string Employee identifier.
     * @throws \RuntimeException If employee_id is not provisioned
     */
    private function resolveEmployeeId(array $user): string
    {
        $employeeId = $user['employee_id'] ?? null;
        if ($employeeId !== null && (string)$employeeId !== '') {
            return (string)$employeeId;
        }

        // Attempt lookup from users.json mapping
        $usersFile = $this->confDir . '/users.json';
        $usersMap  = $this->readJsonFile($usersFile);
        if ($usersMap !== null) {
            $username = $this->userId($user);
            foreach ($usersMap as $entry) {
                if (($entry['username'] ?? '') === $username && isset($entry['employee_id'])) {
                    return (string)$entry['employee_id'];
                }
            }
        }

        // MES-R6-014 FIX: Throw exception instead of silently falling back to username
        throw new \RuntimeException('employee_id_not_provisioned_for_user');
    }

    // â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET getMyQueue â€” Get the current operator's work queue for today.
     *
     * Returns tasks assigned to the authenticated user's employee_id,
     * sorted by priority and scheduled sequence.
     *
     * @return never
     */
    public function getMyQueue(): never
    {
        $user       = $this->requireAuth();
        $this->requireMobileAccess($user);
        $employeeId = $this->resolveEmployeeId($user);

        try {
            $queue = $this->mobileService()->getOperatorQueue($employeeId);

            $this->success(['queue' => $queue, 'employee_id' => $employeeId]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('queue_fetch_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST startTask â€” Start working on a queued task.
     *
     * Body fields:
     *   - queue_id (string, required): Work queue entry ID.
     *
     * @return never
     */
    public function startTask(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody(50 * 1024 * 1024);
        $this->requireFields($body, ['queue_id']);

        $queueId    = trim((string)($body['queue_id'] ?? ''));
        $employeeId = $this->resolveEmployeeId($user);
        $userId     = $this->userId($user);

        try {
            $task = $this->mobileService()->startTask($queueId, $employeeId);

            $this->auditLog('mobile_start_task', [
                'queue_id'    => $queueId,
                'employee_id' => $employeeId,
            ], $userId);

            $this->success(['task' => $task]);
        } catch (WorkforceQualificationException $e) {
            $this->error($e->reasonCode(), 403, $e->getMessage(), [
                'qualification_gate' => $e->details(),
            ]);
        } catch (RuntimeRequirementGateException $e) {
            $this->error($e->reasonCode(), 409, $e->getMessage(), [
                'runtime_requirement_gate' => $e->gateContext(),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('task_start_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST completeTask â€” Complete a queued task with result.
     *
     * Body fields:
     *   - queue_id      (string, required)
     *   - result        (string, required): pass, fail, partial.
     *   - qty_completed (int, optional)
     *   - qty_scrap     (int, optional)
     *   - notes         (string, optional)
     *
     * @return never
     */
    public function completeTask(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody(50 * 1024 * 1024);
        $this->requireFields($body, ['queue_id', 'result']);

        $queueId    = trim((string)($body['queue_id'] ?? ''));
        $employeeId = $this->resolveEmployeeId($user);
        $userId     = $this->userId($user);

        try {
            $task = $this->mobileService()->completeTask($queueId, $employeeId, [
                'result'        => strtolower(trim((string)($body['result'] ?? ''))),
                'qty_completed' => (int)($body['qty_completed'] ?? 0),
                'qty_scrap'     => (int)($body['qty_scrap'] ?? 0),
                'reason_code'   => trim((string)($body['reason_code'] ?? $body['completion_reason_code'] ?? $body['defect_code'] ?? '')),
                'idempotency_key' => trim((string)($body['idempotency_key'] ?? '')),
                'notes'         => trim((string)($body['notes'] ?? '')),
            ]);

            $this->auditLog('mobile_complete_task', [
                'queue_id'    => $queueId,
                'employee_id' => $employeeId,
                'result'      => $body['result'],
            ], $userId);

            $this->success(['task' => $task]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('task_complete_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST clockIn â€” Clock in for a work order operation.
     *
     * Body fields:
     *   - wo_number     (string, required): Work order number.
     *   - operation_seq (string, required): Operation sequence.
     *   - machine_id    (string, required): Machine/work center ID.
     *   - labor_type    (string, required): setup, run, rework, inspection.
     *
     * @return never
     */
    public function clockIn(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['wo_number', 'operation_seq', 'machine_id', 'labor_type']);

        $employeeId = $this->resolveEmployeeId($user);
        $userId     = $this->userId($user);

        try {
            $entry = $this->mobileService()->clockIn(
                $employeeId,
                trim((string)($body['wo_number'] ?? '')),
                (int)($body['operation_seq'] ?? 0),
                trim((string)($body['machine_id'] ?? '')),
                strtolower(trim((string)($body['labor_type'] ?? 'run'))),
                [
                    'idempotency_key' => trim((string)($body['idempotency_key'] ?? '')),
                    'device_id' => trim((string)($body['device_id'] ?? '')),
                    'metadata' => is_array($body['metadata'] ?? null) ? (array)$body['metadata'] : [],
                ],
            );

            $this->auditLog('mobile_clock_in', [
                'entry_id'      => $entry['entry_id'] ?? '',
                'employee_id'   => $employeeId,
                'wo_number'     => $body['wo_number'],
                'operation_seq' => $body['operation_seq'],
                'machine_id'    => $body['machine_id'],
            ], $userId);

            $this->success(['entry' => $entry], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('clock_in_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST clockOut â€” Clock out from a time entry.
     *
     * Body fields:
     *   - entry_id      (string, required): Time clock entry ID.
     *   - qty_completed (int, required): Quantity completed during this period.
     *   - qty_scrap     (int, optional): Scrap quantity.
     *   - idempotency_key (string, optional): Client replay key for retry-safe clock-out.
     *
     * @return never
     */
    public function clockOut(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['entry_id', 'qty_completed']);

        $entryId    = trim((string)($body['entry_id'] ?? ''));
        // SECURITY: Always use session user, never accept operator_id from request body
        $operatorId = $this->resolveEmployeeId($user);
        $userId     = $this->userId($user);

        try {
            $entry = $this->mobileService()->clockOut(
                $entryId,
                (int)($body['qty_completed'] ?? 0),
                (int)($body['qty_scrap'] ?? 0),
                $operatorId,  // Always use authenticated session user
                [
                    'idempotency_key' => trim((string)($body['idempotency_key'] ?? '')),
                    'device_id' => trim((string)($body['device_id'] ?? '')),
                    'metadata' => is_array($body['metadata'] ?? null) ? (array)$body['metadata'] : [],
                ],
            );

            $this->auditLog('mobile_clock_out', [
                'entry_id'      => $entryId,
                'employee_id'   => $operatorId,
                'qty_completed' => $body['qty_completed'],
                'qty_scrap'     => $body['qty_scrap'] ?? 0,
                'idempotency_key' => trim((string)($body['idempotency_key'] ?? '')),
            ], $userId);

            $this->success(['entry' => $entry]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('clock_out_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST captureInspection â€” Capture inspection data from a tablet.
     *
     * Body fields:
     *   - wo_number    (string, required): Work order number.
     *   - capture_type (string, required): first_piece, in_process, final.
     *   - measurements (array, required): Array of measurement data objects.
     *   - photos       (array, optional): Array of base64-encoded photo data.
     *   - notes        (string, optional)
     *
     * @return never
     */
    public function captureInspection(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['wo_number', 'capture_type', 'measurements']);

        $employeeId = $this->resolveEmployeeId($user);
        $userId     = $this->userId($user);
        $inspectorId = trim((string)($body['inspector_id'] ?? $employeeId));
        $inspectorOverrideReason = trim((string)($body['inspector_override_reason'] ?? ''));
        if ($inspectorId === '') {
            $inspectorId = $employeeId;
        }
        if ($inspectorId !== $employeeId) {
            if (!$this->userHasAnyRole($user, $this->inspectionOverrideRoles())) {
                $this->error('inspector_override_forbidden', 403);
            }
            if ($inspectorOverrideReason === '') {
                $this->error('inspector_override_reason_required', 400);
            }
        }

        // MES-R6-002 FIX: Validate photo size to prevent DoS
        $photosArray = (array)($body['photos'] ?? []);
        if (!empty($photosArray)) {
            $totalPhotoSize = 0;
            foreach ($photosArray as $photo) {
                if (is_string($photo)) {
                    $totalPhotoSize += strlen($photo);
                } elseif (is_array($photo) && isset($photo['data'])) {
                    $totalPhotoSize += strlen((string)$photo['data']);
                }
            }
            if ($totalPhotoSize > 52428800) { // 50MB
                $this->error('photo_size_exceeded', 413, 'Total photo data exceeds 50MB limit.');
            }
        }

        try {
            $capture = $this->mobileService()->captureInspection($employeeId, [
                'wo_number'    => trim((string)($body['wo_number'] ?? '')),
                'jo_number'    => trim((string)($body['jo_number'] ?? '')),
                'operation_seq' => $body['operation_seq'] ?? null,
                'inspection_plan_id' => trim((string)($body['inspection_plan_id'] ?? '')),
                'machine_id' => trim((string)($body['machine_id'] ?? $body['equipment_id'] ?? '')),
                'equipment_id' => trim((string)($body['equipment_id'] ?? $body['machine_id'] ?? '')),
                'work_center_id' => trim((string)($body['work_center_id'] ?? '')),
                'cnc_program_id' => trim((string)($body['cnc_program_id'] ?? $body['nc_program_id'] ?? '')),
                'cnc_program_revision' => trim((string)($body['cnc_program_revision'] ?? $body['program_revision'] ?? '')),
                'setup_sheet_id' => trim((string)($body['setup_sheet_id'] ?? '')),
                'setup_sheet_revision' => trim((string)($body['setup_sheet_revision'] ?? '')),
                'part_revision' => trim((string)($body['part_revision'] ?? '')),
                'org_plant_id' => trim((string)($body['org_plant_id'] ?? $body['plant_id'] ?? $_SESSION['org_plant_id'] ?? $_SESSION['plant_id'] ?? '')),
                'org_site_id' => trim((string)($body['org_site_id'] ?? $body['site_id'] ?? $_SESSION['org_site_id'] ?? '')),
                'capture_type' => strtolower(trim((string)($body['capture_type'] ?? ''))),
                'measurements' => (array)($body['measurements'] ?? []),
                'overall_result' => array_key_exists('overall_result', $body) || array_key_exists('result', $body)
                    ? strtolower(trim((string)($body['overall_result'] ?? $body['result'] ?? '')))
                    : null,
                'inspector_id' => $inspectorId,
                'photos'       => (array)($body['photos'] ?? []),
                'notes'        => trim((string)($body['notes'] ?? '')),
                'offline_created' => $body['offline_created'] ?? false,
                'sync_status' => trim((string)($body['sync_status'] ?? 'synced')),
                'device_id' => trim((string)($body['device_id'] ?? '')),
                'capture_id' => trim((string)($body['capture_id'] ?? '')),
                'client_capture_id' => trim((string)($body['client_capture_id'] ?? $body['client_record_id'] ?? '')),
                'client_record_id' => trim((string)($body['client_record_id'] ?? '')),
                'idempotency_key' => trim((string)($body['idempotency_key'] ?? '')),
                'captured_at' => trim((string)($body['captured_at'] ?? $body['created_at'] ?? '')),
                'metadata' => array_merge(
                    is_array($body['metadata'] ?? null) ? (array)$body['metadata'] : [],
                    $inspectorId !== $employeeId ? [
                        'inspector_override' => true,
                        'inspector_override_reason' => $inspectorOverrideReason,
                        'override_actor_employee_id' => $employeeId,
                    ] : [],
                ),
            ]);

            $this->auditLog('mobile_capture_inspection', [
                'capture_id'   => $capture['capture_id'] ?? '',
                'employee_id'  => $employeeId,
                'wo_number'    => $body['wo_number'],
                'capture_type' => $body['capture_type'],
                'measurement_count' => count($body['measurements'] ?? []),
                'inspector_id' => $inspectorId,
                'inspector_override' => $inspectorId !== $employeeId ? '1' : '0',
            ], $userId);

            $this->success(['capture' => $capture], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('inspection_capture_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST submitOfflineBatch â€” Batch sync of offline-created records.
     *
     * Body fields:
     *   - entries (array, required): Array of offline records to sync.
     *     Each entry must include: type, data, client_timestamp.
     *
     * @return never
     */
    public function submitOfflineBatch(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['entries']);

        $entries    = (array)($body['entries'] ?? []);
        $employeeId = $this->resolveEmployeeId($user);
        $userId     = $this->userId($user);

        if (empty($entries)) {
            $this->error('empty_batch', 400, 'No entries provided for sync.');
        }

        try {
            $result = $this->mobileService()->submitOfflineBatch($entries, $employeeId);

            $this->auditLog('mobile_offline_sync', [
                'employee_id'   => $employeeId,
                'total_entries'  => count($entries),
                'synced'         => $result['synced'] ?? 0,
                'conflicts'      => $result['conflicts'] ?? 0,
            ], $userId);

            $this->success(['sync_result' => $result]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('offline_sync_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getSyncStatus â€” Get pending items and conflict list for the operator.
     *
     * @return never
     */
    public function getSyncStatus(): never
    {
        $user       = $this->requireAuth();
        $this->requireMobileAccess($user);
        $employeeId = $this->resolveEmployeeId($user);

        try {
            $status = $this->mobileService()->getPendingSyncItems($employeeId);

            $this->success(['sync_status' => $status, 'employee_id' => $employeeId]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('sync_status_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST resolveConflict â€” Resolve an offline sync conflict.
     *
     * Body fields:
     *   - entry_id   (string, required): Conflicting entry ID.
     *   - resolution (string, required): keep_local, keep_server, merge.
     *   - merge_data (array, optional): Merged data if resolution is 'merge'.
     *
     * @return never
     */
    public function resolveConflict(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['entry_id', 'resolution']);

        $entryId    = trim((string)($body['entry_id'] ?? ''));
        $resolution = strtolower(trim((string)($body['resolution'] ?? '')));
        $employeeId = $this->resolveEmployeeId($user);
        $userId     = $this->userId($user);

        try {
            $allowOverride = $this->userHasAnyRole($user, $this->mobileConflictOverrideRoles());
            $overrideReason = trim((string)($body['override_reason'] ?? $body['reason_code'] ?? ''));
            $result = $this->mobileService()->resolveConflict($entryId, $resolution, $employeeId, $allowOverride, $overrideReason);

            $this->auditLog('mobile_resolve_conflict', [
                'entry_id'    => $entryId,
                'employee_id' => $employeeId,
                'resolution'  => $resolution,
                'override'    => $allowOverride ? '1' : '0',
                'override_reason' => $overrideReason,
            ], $userId);

            $this->success(['resolved' => $result]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('conflict_resolve_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getShopFloorOverview â€” Get all operators and machine status.
     *
     * Returns a real-time view of all active operators, their current
     * tasks, machine utilization, and overall shop floor status.
     *
     * @return never
     */
    public function getShopFloorOverview(): never
    {
        $user = $this->requireAuth();
        $this->requireMobileOverviewAccess($user);

        try {
            $overview = $this->mobileService()->getShopFloorOverview();

            $this->success(['overview' => $overview]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('shop_floor_overview_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getOperatorDashboard â€” Get KPIs for the current operator.
     *
     * Returns efficiency metrics, completed tasks today, scrap rate,
     * active time entries, and personal quality performance.
     *
     * @return never
     */
    public function getOperatorDashboard(): never
    {
        $user       = $this->requireAuth();
        $this->requireMobileAccess($user);
        $employeeId = $this->resolveEmployeeId($user);

        try {
            $dashboard = $this->mobileService()->getOperatorDashboard($employeeId);

            $this->success(['dashboard' => $dashboard, 'employee_id' => $employeeId]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('operator_dashboard_failed', 500, $e->getMessage());
        }
    }
}
