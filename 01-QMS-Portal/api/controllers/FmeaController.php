<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Services\FmeaService;
use Throwable;

/**
 * FMEA & Control Plan controller for HESEM QMS Portal.
 *
 * Provides API endpoints for FMEA management (DFMEA/PFMEA per
 * AIAG/VDA 2019), failure mode CRUD, recommended actions with
 * Action Priority tracking, Control Plan generation, RPN trend
 * analysis, and NCR cross-linking.
 *
 * Access requires 'quality' or 'engineering' role.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class FmeaController extends BaseController
{
    /** @var FmeaService|null Lazy-loaded FMEA service. */
    private ?FmeaService $fmeaSvc = null;

    /** @var array|null Cached FMEA access-control config. */
    private ?array $fmeaConfig = null;

    // ── Service Access ──────────────────────────────────────────────────────

    /**
     * Get or create the FmeaService instance.
     *
     * @return FmeaService
     */
    private function fmeaService(): FmeaService
    {
        if ($this->fmeaSvc === null) {
            $this->fmeaSvc = new FmeaService($this->dataDir);
        }
        return $this->fmeaSvc;
    }

    /**
     * Load the FMEA access-control configuration.
     *
     * @return array<string, mixed>
     */
    private function loadFmeaConfig(): array
    {
        if ($this->fmeaConfig !== null) {
            return $this->fmeaConfig;
        }

        $configFile = $this->confDir . '/fmea_config.json';
        $this->fmeaConfig = $this->readJsonFile($configFile) ?? [
            'roles' => [
                'admin'       => ['fmea_read', 'fmea_write', 'fmea_action', 'fmea_control_plan', 'fmea_link'],
                'quality'     => ['fmea_read', 'fmea_write', 'fmea_action', 'fmea_control_plan', 'fmea_link'],
                'engineering' => ['fmea_read', 'fmea_write', 'fmea_action', 'fmea_control_plan', 'fmea_link'],
                'production'  => ['fmea_read'],
                'viewer'      => ['fmea_read'],
            ],
        ];

        return $this->fmeaConfig;
    }

    /**
     * Check if the user has a specific FMEA permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return bool
     */
    private function hasFmeaPermission(array $user, string $permission): bool
    {
        $role = (string)($user['role'] ?? 'viewer');
        if (in_array($role, ['ceo', 'it_admin', 'qa_manager', 'production_director', 'engineering_manager'], true)) {
            return true;
        }
        $config = $this->loadFmeaConfig();
        $roles  = $config['roles'] ?? [];
        $perms  = $roles[$role] ?? $roles['viewer'] ?? [];
        return in_array($permission, $perms, true);
    }

    /**
     * Require an FMEA permission, terminating with 403 if missing.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return void
     */
    private function requireFmeaPermission(array $user, string $permission): void
    {
        if (!$this->hasFmeaPermission($user, $permission)) {
            $this->error('forbidden', 403, "Missing permission: {$permission}");
        }
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

    // ── Endpoints ───────────────────────────────────────────────────────────

    /**
     * GET listFmeas — List FMEA records with optional filters.
     *
     * Query params:
     *   - type   (string, optional): DFMEA or PFMEA.
     *   - status (string, optional): draft, active, closed.
     *   - item   (string, optional): Filter by item/part ID.
     *   - offset (int, optional): Pagination offset.
     *   - limit  (int, optional): Page size (max 200).
     *
     * @return never
     */
    public function listFmeas(): never
    {
        $user = $this->requireAuth();
        $this->requireFmeaPermission($user, 'fmea_read');

        $filters = [];

        $type = $this->query('type');
        if ($type !== null && $type !== '') {
            $filters['type'] = strtoupper($type);
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $item = $this->query('item');
        if ($item !== null && $item !== '') {
            $filters['item'] = $item;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->fmeaService()->listFmeas($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('fmeas', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('fmea_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getFmeaDetail — Get a single FMEA with all failure modes and actions.
     *
     * Query params:
     *   - fmea_id (string, required): FMEA record ID.
     *
     * @return never
     */
    public function getFmeaDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireFmeaPermission($user, 'fmea_read');

        $fmeaId = $this->query('fmea_id');
        if ($fmeaId === null || trim($fmeaId) === '') {
            $this->error('missing_fmea_id', 400);
        }

        $fmeaId = trim($fmeaId);

        try {
            $record = $this->fmeaService()->getDetail($fmeaId);
            if ($record === null) {
                $this->error('not_found', 404, "FMEA {$fmeaId} not found.");
            }

            $this->success(['fmea' => $record]);
        } catch (Throwable $e) {
            $this->error('fmea_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createFmea — Create a new FMEA record.
     *
     * Body fields:
     *   - type         (string, required): DFMEA or PFMEA.
     *   - title        (string, required)
     *   - item_id      (string, required): Part or process ID.
     *   - process_name (string, required)
     *   - team_lead    (string, required)
     *
     * @return never
     */
    public function createFmea(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['type', 'title', 'item_id', 'process_name', 'team_lead']);

        $userId = $this->userId($user);

        try {
            $fmea = $this->fmeaService()->createFmea([
                'type'         => strtoupper(trim((string)($body['type'] ?? ''))),
                'title'        => trim((string)($body['title'] ?? '')),
                'item_id'      => trim((string)($body['item_id'] ?? '')),
                'process_name' => trim((string)($body['process_name'] ?? '')),
                'team_lead'    => trim((string)($body['team_lead'] ?? '')),
            ], $userId);

            $this->auditLog('fmea_create', [
                'fmea_id' => $fmea['fmea_id'] ?? $fmea['id'] ?? '',
                'type'    => $fmea['type'] ?? '',
                'title'   => $fmea['title'] ?? '',
            ], $userId);

            $this->success(['fmea' => $fmea], 201);
        } catch (Throwable $e) {
            $this->error('fmea_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateFmea — Update an existing FMEA record.
     *
     * Body fields:
     *   - fmea_id (string, required): FMEA record ID.
     *   - Any updatable fields (title, status, team_lead, etc.).
     *
     * @return never
     */
    public function updateFmea(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['fmea_id']);

        $fmeaId = trim((string)($body['fmea_id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->fmeaService()->updateFmea($fmeaId, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "FMEA {$fmeaId} not found.");
            }

            $this->auditLog('fmea_update', [
                'fmea_id' => $fmeaId,
                'fields'  => array_keys($body),
            ], $userId);

            $this->success(['fmea' => $updated]);
        } catch (Throwable $e) {
            $this->error('fmea_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST addFailureMode — Add a failure mode to an FMEA.
     *
     * Body fields:
     *   - fmea_id          (string, required)
     *   - function         (string, required): Process/design function.
     *   - failure_mode     (string, required)
     *   - failure_effect   (string, required)
     *   - severity         (int, required): 1-10 severity rating.
     *   - failure_cause    (string, required)
     *   - occurrence       (int, required): 1-10 occurrence rating.
     *   - current_controls (string, optional)
     *   - detection        (int, required): 1-10 detection rating.
     *
     * @return never
     */
    public function addFailureMode(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['fmea_id', 'function', 'failure_mode', 'failure_effect', 'severity', 'failure_cause', 'occurrence', 'detection']);

        $fmeaId = trim((string)($body['fmea_id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $failureMode = $this->fmeaService()->addFailureMode($fmeaId, [
                'function'         => trim((string)($body['function'] ?? '')),
                'failure_mode'     => trim((string)($body['failure_mode'] ?? '')),
                'failure_effect'   => trim((string)($body['failure_effect'] ?? '')),
                'severity'         => (int)($body['severity'] ?? 0),
                'failure_cause'    => trim((string)($body['failure_cause'] ?? '')),
                'occurrence'       => (int)($body['occurrence'] ?? 0),
                'current_controls' => trim((string)($body['current_controls'] ?? '')),
                'detection'        => (int)($body['detection'] ?? 0),
                'created_by'       => $userId,
            ]);

            if ($failureMode === null) {
                $this->error('not_found', 404, "FMEA {$fmeaId} not found.");
            }

            $this->auditLog('fmea_add_failure_mode', [
                'fmea_id'         => $fmeaId,
                'failure_mode_id' => $failureMode['id'],
            ], $userId);

            $this->success(['failure_mode' => $failureMode], 201);
        } catch (Throwable $e) {
            $this->error('failure_mode_add_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateFailureMode — Update a failure mode entry.
     *
     * Body fields:
     *   - failure_mode_id (string, required)
     *   - Any updatable fields (severity, occurrence, detection, etc.).
     *
     * @return never
     */
    public function updateFailureMode(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['failure_mode_id']);

        $failureModeId = trim((string)($body['failure_mode_id'] ?? ''));
        $userId        = $this->userId($user);

        try {
            $updated = $this->fmeaService()->updateFailureMode($failureModeId, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "Failure mode {$failureModeId} not found.");
            }

            $this->auditLog('fmea_update_failure_mode', [
                'failure_mode_id' => $failureModeId,
                'fields'          => array_keys($body),
            ], $userId);

            $this->success(['failure_mode' => $updated]);
        } catch (Throwable $e) {
            $this->error('failure_mode_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST addAction — Add a recommended action to a failure mode.
     *
     * Body fields:
     *   - failure_mode_id (string, required)
     *   - action_type     (string, required): preventive, detection.
     *   - description     (string, required)
     *   - responsible     (string, required)
     *   - target_date     (string, required): YYYY-MM-DD.
     *
     * @return never
     */
    public function addAction(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_action');

        $body = $this->jsonBody();
        $this->requireFields($body, ['failure_mode_id', 'action_type', 'description', 'responsible', 'target_date']);

        $failureModeId = trim((string)($body['failure_mode_id'] ?? ''));
        $userId        = $this->userId($user);

        try {
            $action = $this->fmeaService()->addAction($failureModeId, [
                'action_type' => strtolower(trim((string)($body['action_type'] ?? ''))),
                'description' => trim((string)($body['description'] ?? '')),
                'responsible' => trim((string)($body['responsible'] ?? '')),
                'target_date' => trim((string)($body['target_date'] ?? '')),
                'created_by'  => $userId,
            ]);

            if ($action === null) {
                $this->error('not_found', 404, "Failure mode {$failureModeId} not found.");
            }

            $this->auditLog('fmea_add_action', [
                'failure_mode_id' => $failureModeId,
                'action_id'       => $action['id'],
            ], $userId);

            $this->success(['action' => $action], 201);
        } catch (Throwable $e) {
            $this->error('action_add_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST completeAction — Complete an action with new S/O/D ratings.
     *
     * Body fields:
     *   - action_id      (string, required)
     *   - new_severity   (int, required): Revised severity 1-10.
     *   - new_occurrence (int, required): Revised occurrence 1-10.
     *   - new_detection  (int, required): Revised detection 1-10.
     *   - notes          (string, optional)
     *
     * @return never
     */
    public function completeAction(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_action');

        $body = $this->jsonBody();
        $this->requireFields($body, ['action_id', 'new_severity', 'new_occurrence', 'new_detection']);

        $actionId = trim((string)($body['action_id'] ?? ''));
        $userId   = $this->userId($user);

        try {
            $result = $this->fmeaService()->completeAction($actionId, [
                'new_severity'   => (int)($body['new_severity'] ?? 0),
                'new_occurrence' => (int)($body['new_occurrence'] ?? 0),
                'new_detection'  => (int)($body['new_detection'] ?? 0),
                'notes'          => trim((string)($body['notes'] ?? '')),
                'completed_by'   => $userId,
            ]);

            if ($result === null) {
                $this->error('not_found', 404, "Action {$actionId} not found.");
            }

            $this->auditLog('fmea_complete_action', [
                'action_id' => $actionId,
                'new_rpn'   => $result['new_rpn'] ?? null,
            ], $userId);

            $this->success(['action' => $result]);
        } catch (Throwable $e) {
            $this->error('action_complete_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST generateControlPlan — Auto-generate a control plan from an FMEA.
     *
     * Body fields:
     *   - fmea_id (string, required): Source FMEA record ID.
     *
     * @return never
     */
    public function generateControlPlan(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_control_plan');

        $body = $this->jsonBody();
        $this->requireFields($body, ['fmea_id']);

        $fmeaId = trim((string)($body['fmea_id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $controlPlan = $this->fmeaService()->generateControlPlanFromFmea($fmeaId, $userId);
            if ($controlPlan === null) {
                $this->error('not_found', 404, "FMEA {$fmeaId} not found.");
            }

            $this->auditLog('fmea_generate_control_plan', [
                'fmea_id'         => $fmeaId,
                'control_plan_id' => $controlPlan['id'],
            ], $userId);

            $this->success(['control_plan' => $controlPlan], 201);
        } catch (Throwable $e) {
            $this->error('control_plan_generate_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listControlPlans — List control plans with optional filters.
     *
     * Query params:
     *   - status  (string, optional): draft, active, superseded.
     *   - item    (string, optional): Filter by item/part ID.
     *   - offset  (int, optional): Pagination offset.
     *   - limit   (int, optional): Page size (max 200).
     *
     * @return never
     */
    public function listControlPlans(): never
    {
        $user = $this->requireAuth();
        $this->requireFmeaPermission($user, 'fmea_read');

        $filters = [];

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $item = $this->query('item');
        if ($item !== null && $item !== '') {
            $filters['item'] = $item;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $fmeaDir  = $this->dataDir . '/fmea';
            $allItems = $this->readJsonFile($fmeaDir . '/control_plans.json') ?? [];

            // Apply filters
            if (!empty($filters)) {
                $allItems = array_filter($allItems, function (array $cp) use ($filters) {
                    if (isset($filters['status']) && ($cp['status'] ?? '') !== $filters['status']) {
                        return false;
                    }
                    if (isset($filters['item']) && ($cp['item_id'] ?? '') !== $filters['item']) {
                        return false;
                    }
                    return true;
                });
                $allItems = array_values($allItems);
            }

            $total = count($allItems);
            $items = array_slice($allItems, $offset, $limit);

            $this->paginated('control_plans', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('control_plan_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getControlPlanDetail — Get a single control plan with all characteristics.
     *
     * Query params:
     *   - control_plan_id (string, required)
     *
     * @return never
     */
    public function getControlPlanDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireFmeaPermission($user, 'fmea_read');

        $controlPlanId = $this->query('control_plan_id');
        if ($controlPlanId === null || trim($controlPlanId) === '') {
            $this->error('missing_control_plan_id', 400);
        }

        $controlPlanId = trim($controlPlanId);

        try {
            $fmeaDir  = $this->dataDir . '/fmea';
            $allPlans = $this->readJsonFile($fmeaDir . '/control_plans.json') ?? [];
            $record   = null;

            foreach ($allPlans as $cp) {
                if (($cp['id'] ?? '') === $controlPlanId) {
                    $record = $cp;
                    break;
                }
            }

            if ($record === null) {
                $this->error('not_found', 404, "Control plan {$controlPlanId} not found.");
            }

            $this->success(['control_plan' => $record]);
        } catch (Throwable $e) {
            $this->error('control_plan_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getRpnTrend — Get RPN trend data for an FMEA over time.
     *
     * Query params:
     *   - fmea_id (string, required)
     *
     * @return never
     */
    public function getRpnTrend(): never
    {
        $user = $this->requireAuth();
        $this->requireFmeaPermission($user, 'fmea_read');

        $fmeaId = $this->query('fmea_id');
        if ($fmeaId === null || trim($fmeaId) === '') {
            $this->error('missing_fmea_id', 400);
        }

        $fmeaId = trim($fmeaId);

        try {
            $trend = $this->fmeaService()->getRpnTrend($fmeaId);
            if ($trend === null) {
                $this->error('not_found', 404, "FMEA {$fmeaId} not found.");
            }

            $this->success(['rpn_trend' => $trend]);
        } catch (Throwable $e) {
            $this->error('rpn_trend_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST linkNcrToFmea — Cross-link an NCR to a specific failure mode.
     *
     * Body fields:
     *   - ncr_id          (string, required): NCR record ID.
     *   - failure_mode_id (string, required): Target failure mode ID.
     *
     * @return never
     */
    public function linkNcrToFmea(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireFmeaPermission($user, 'fmea_link');

        $body = $this->jsonBody();
        $this->requireFields($body, ['ncr_id', 'failure_mode_id']);

        $ncrId         = trim((string)($body['ncr_id'] ?? ''));
        $failureModeId = trim((string)($body['failure_mode_id'] ?? ''));
        $userId        = $this->userId($user);

        try {
            $link = $this->fmeaService()->linkToNcr($ncrId, $failureModeId, $userId);
            if ($link === null) {
                $this->error('link_failed', 400, "Cannot link NCR {$ncrId} to failure mode {$failureModeId}.");
            }

            $this->auditLog('fmea_link_ncr', [
                'ncr_id'          => $ncrId,
                'failure_mode_id' => $failureModeId,
            ], $userId);

            $this->success(['link' => $link], 201);
        } catch (Throwable $e) {
            $this->error('ncr_link_failed', 500, $e->getMessage());
        }
    }
}
