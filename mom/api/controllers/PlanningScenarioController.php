<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\PlanningScenarioService;
use Throwable;

final class PlanningScenarioController extends BaseController
{
    public function calculate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->planningRoles());
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $this->rejectRequestScopeFields();
            $this->applySessionOrgScope($body, true);
            $body['calculated_by'] = (string)($body['calculated_by'] ?? $user['username'] ?? $user['id'] ?? 'planner');
            $this->success(['planning_scenario' => $this->service()->calculateScenario($body)], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_scenario_calculate_failed', 500, $e->getMessage());
        }
    }

    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['planning_scenario_detail' => $this->service()->scenarioDetail($this->scenarioId(), $this->sessionOrgId(), $this->planningScope())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_scenario_detail_failed', 500, $e->getMessage());
        }
    }

    public function feasibility(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['planning_feasibility' => $this->service()->feasibility($this->scenarioId(), $this->sessionOrgId(), $this->planningScope())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_scenario_feasibility_failed', 500, $e->getMessage());
        }
    }

    public function capacityLoad(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['planning_capacity_load' => $this->service()->capacityLoad($this->scenarioId(), $this->sessionOrgId(), $this->planningScope())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_scenario_capacity_failed', 500, $e->getMessage());
        }
    }

    public function approve(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->planningRoles());
        $this->requireCsrf();

        try {
            $this->success(['planning_scenario' => $this->service()->approveScenario($this->scenarioId(), [
                'approved_by' => (string)($user['username'] ?? $user['id'] ?? 'planner'),
            ], $this->sessionOrgId(), $this->planningScope())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_scenario_approve_failed', 500, $e->getMessage());
        }
    }

    public function publish(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->planningRoles());
        $this->requireCsrf();

        try {
            $this->success(['planning_scenario' => $this->service()->publishScenario($this->scenarioId(), [
                'published_by' => (string)($user['username'] ?? $user['id'] ?? 'planner'),
            ], $this->sessionOrgId(), $this->planningScope())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_scenario_publish_failed', 500, $e->getMessage());
        }
    }

    public function dispatchReadiness(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $criteria = $this->criteria();
            $this->success(['dispatch_readiness' => $this->service()->dispatchReadiness($criteria)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_dispatch_readiness_failed', 500, $e->getMessage());
        }
    }

    public function recordSignal(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->planningRoles());
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $this->rejectRequestScopeFields();
            $this->applySessionOrgScope($body, true);
            $body['created_by'] = (string)($body['created_by'] ?? $user['username'] ?? $user['id'] ?? 'planner');
            $this->success(['replanning_signal' => $this->service()->recordReplanningSignal($body)], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_replanning_signal_failed', 500, $e->getMessage());
        }
    }

    public function replanningSignals(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $criteria = $this->criteria();
            $this->success(['replanning_signals' => $this->service()->replanningSignals($criteria)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_replanning_signals_failed', 500, $e->getMessage());
        }
    }

    public function probe(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $this->success(['planning_scenario' => $this->service()->probe()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('planning_scenario_probe_failed', 500, $e->getMessage());
        }
    }

    private function service(): PlanningScenarioService
    {
        return new PlanningScenarioService($this->dataDir, $this->data);
    }

    private function scenarioId(): string
    {
        $id = trim((string)($this->input('scenario_id') ?? $this->input('scenario_key') ?? ''));
        if ($id === '') {
            $this->error('missing_planning_scenario_id', 400);
        }
        return $id;
    }

    private function sessionOrgId(): ?string
    {
        $orgId = $_SESSION['org_id'] ?? null;
        return is_scalar($orgId) && trim((string)$orgId) !== '' ? trim((string)$orgId) : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function planningScope(): array
    {
        $scope = [];
        $this->applySessionOrgScope($scope, true);
        return $scope;
    }

    /**
     * @return array<string, mixed>
     */
    private function criteria(): array
    {
        $body = $this->jsonBody();
        $criteria = is_array($body['criteria'] ?? null) ? $body['criteria'] : $body;
        foreach (array_unique(array_merge(
            PlanningScenarioService::scenarioFilterFields(),
            PlanningScenarioService::signalFilterFields(),
            ['limit'],
        )) as $field) {
            $value = $this->input($field);
            if ($value !== null && trim($value) !== '') {
                $criteria[$field] = trim($value);
            }
        }
        $this->rejectPayloadScopeFields($criteria);
        $this->rejectRequestScopeFields();
        $this->applySessionOrgScope($criteria, true);
        return $criteria;
    }

    /**
     * @return list<string>
     */
    private function readRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'planner',
                'planning_manager',
                'cnc_workshop_manager',
                'shift_leader',
                'quality_manager',
                'maintenance_manager',
            ],
        )));
    }

    /**
     * @return list<string>
     */
    private function planningRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'planner',
                'planning_manager',
                'cnc_workshop_manager',
                'maintenance_manager',
                'quality_manager',
                'it_admin',
            ],
        )));
    }
}
