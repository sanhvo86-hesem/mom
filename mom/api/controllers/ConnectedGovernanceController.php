<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\ConnectedGovernanceException;
use MOM\Api\Services\ConnectedGovernanceService;
use Throwable;

final class ConnectedGovernanceController extends BaseController
{
    public function releaseRevision(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->governanceRoles());
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();

            // GOV-004: Verify the governance record's org_id matches the user's org
            $userOrgId = $_SESSION['org_id'] ?? null;
            $governanceOrgId = is_array($body['scope'] ?? null)
                ? ($body['scope']['org_id'] ?? null)
                : ($body['org_id'] ?? null);

            if ($userOrgId === null || $governanceOrgId === null || $userOrgId !== $governanceOrgId) {
                // Cross-org release not allowed
                $this->error('governance_scope_mismatch', 403);
            }

            $body['released_by'] = (string)($body['released_by'] ?? $user['username'] ?? $user['id'] ?? 'system');
            $this->success(['connected_governance' => $this->service()->releaseControlledRevision($body)], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('connected_governance_release_failed', 500, $e->getMessage());
        }
    }

    public function activeRevision(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['active_revision' => $this->service()->activeRevision($this->criteria())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('connected_governance_active_revision_failed', 500, $e->getMessage());
        }
    }

    public function operatorReadiness(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $actorId = trim((string)($this->input('actor_id') ?? $this->input('employee_id') ?? $user['username'] ?? $user['id'] ?? ''));
            if ($actorId === '') {
                $this->error('missing_actor_id', 400);
            }

            // GOV-003: IDOR protection - validate user is authorized to query this actor's data
            $isAdmin = $this->userHasAnyRole($user, admin_roles());
            $requestedUserId = (string)($user['user_id'] ?? $user['id'] ?? '');
            if (!$isAdmin && $actorId !== $requestedUserId && $actorId !== $user['username']) {
                // Non-admin users can only query their own actor data
                $this->error('actor_authorization_required', 403);
            }

            $criteria = $this->criteria();
            $this->success(['operator_readiness' => $this->service()->checkExecutionEntitlement($actorId, $criteria, [
                'action' => $this->input('action', 'dispatch.report_production') ?? 'dispatch.report_production',
                'request_id' => $this->input('request_id', '') ?? '',
                'correlation_id' => $this->input('correlation_id', '') ?? '',
                'traceparent' => $this->input('traceparent', '') ?? '',
            ])]);
        } catch (ConnectedGovernanceException $e) {
            $this->error($e->reasonCode(), 409, $e->getMessage(), ['entitlement' => $e->details()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('connected_governance_operator_readiness_failed', 500, $e->getMessage());
        }
    }

    public function rolloutReadiness(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['rollout_readiness' => $this->service()->rolloutReadiness($this->criteria())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('connected_governance_rollout_readiness_failed', 500, $e->getMessage());
        }
    }

    public function enterpriseRollout(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['enterprise_rollout' => $this->service()->enterpriseRollout($this->criteria())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('connected_governance_enterprise_rollout_failed', 500, $e->getMessage());
        }
    }

    public function blockers(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $actorId = trim((string)($this->input('actor_id') ?? $this->input('employee_id') ?? $user['username'] ?? $user['id'] ?? ''));
            if ($actorId === '') {
                $this->error('missing_actor_id', 400);
            }

            // GOV-003: IDOR protection - validate user is authorized to query this actor's data
            $isAdmin = $this->userHasAnyRole($user, admin_roles());
            $requestedUserId = (string)($user['user_id'] ?? $user['id'] ?? '');
            if (!$isAdmin && $actorId !== $requestedUserId && $actorId !== $user['username']) {
                // Non-admin users can only query their own actor data
                $this->error('actor_authorization_required', 403);
            }

            $this->success(['execution_blockers' => $this->service()->executionBlockers($actorId, $this->criteria(), [
                'action' => $this->input('action', 'dispatch.report_production') ?? 'dispatch.report_production',
                'request_id' => $this->input('request_id', '') ?? '',
                'correlation_id' => $this->input('correlation_id', '') ?? '',
                'traceparent' => $this->input('traceparent', '') ?? '',
            ])]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('connected_governance_blockers_failed', 500, $e->getMessage());
        }
    }

    public function probe(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $this->success(['connected_governance' => $this->service()->probe()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('connected_governance_probe_failed', 500, $e->getMessage());
        }
    }

    private function service(): ConnectedGovernanceService
    {
        return new ConnectedGovernanceService($this->dataDir, $this->data);
    }

    /**
     * @return array<string, mixed>
     */
    private function criteria(): array
    {
        $body = $this->jsonBody();
        $criteria = is_array($body['criteria'] ?? null) ? $body['criteria'] : $body;
        foreach (array_unique(array_merge(
            ConnectedGovernanceService::rolloutFilterFields(),
            ConnectedGovernanceService::decisionFilterFields(),
            ['target_id', 'equipment_id', 'task_type', 'item_id', 'limit'],
        )) as $field) {
            $value = $this->input($field);
            if ($value !== null && trim($value) !== '') {
                $criteria[$field] = trim($value);
            }
        }
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
                'cnc_workshop_manager',
                'shift_leader',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'qms_engineer',
                'training_coordinator',
                'internal_auditor',
                'auditor',
            ],
        )));
    }

    /**
     * @return list<string>
     */
    private function governanceRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'process_engineer',
                'engineering_lead',
                'quality_manager',
                'qa_manager',
                'qms_engineer',
                'training_coordinator',
                'it_admin',
            ],
        )));
    }
}

