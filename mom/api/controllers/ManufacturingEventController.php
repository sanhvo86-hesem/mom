<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\CanonicalManufacturingSpineService;
use MOM\Api\Services\ProductionHistoryReadModelService;
use Throwable;

final class ManufacturingEventController extends BaseController
{
    public function timeline(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $filters = [];
            foreach (ManufacturingEventBackboneService::timelineFilterFields() as $field) {
                $value = $this->input($field);
                if ($value !== null && trim($value) !== '') {
                    $filters[$field] = trim($value);
                }
            }
            $this->rejectCallerScopeFields();
            $filters += $this->sessionScopeFilters($user);
            $filters['limit'] = (int)($this->input('limit', '100') ?? '100');

            $timeline = $this->service()->productionTimeline($filters);
            $this->success([
                'timeline' => $timeline,
                'events' => $timeline['events'],
                'count' => $timeline['count'],
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('manufacturing_event_timeline_failed', 500, $e->getMessage());
        }
    }

    public function probe(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $this->success(['manufacturing_events' => $this->service()->authorityProbe()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('manufacturing_event_probe_failed', 500, $e->getMessage());
        }
    }

    public function productionHistory(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $filters = [];
            foreach (ManufacturingEventBackboneService::timelineFilterFields() as $field) {
                $value = $this->input($field);
                if ($value !== null && trim($value) !== '') {
                    $filters[$field] = trim($value);
                }
            }
            $this->rejectCallerScopeFields();
            $filters += $this->sessionScopeFilters($user);
            $filters['limit'] = (int)($this->input('limit', '100') ?? '100');

            $packet = (new ProductionHistoryReadModelService(
                $this->service(),
                new CanonicalManufacturingSpineService(dirname($this->dataDir)),
            ))->packet($filters);

            $this->success(['production_history' => $packet]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('production_history_packet_failed', 500, $e->getMessage());
        }
    }

    private function service(): ManufacturingEventBackboneService
    {
        return new ManufacturingEventBackboneService($this->dataDir, $this->data);
    }

    private function rejectCallerScopeFields(): void
    {
        foreach (['plant_id', 'org_plant_id', 'org_company_code', 'org_legal_entity_code', 'org_site_id'] as $scopeField) {
            $value = $this->input($scopeField);
            if ($value !== null && trim($value) !== '') {
                $this->error('unauthorized_scope_field_in_request', 403, 'Scope fields cannot be provided in request. Scope is derived from user session.');
            }
        }
    }

    /**
     * @return array<string, string>
     */
    private function sessionScopeFilters(array $user): array
    {
        $scope = array_filter([
            'plant_id' => (string)($_SESSION['plant_id'] ?? ''),
            'org_plant_id' => (string)($_SESSION['plant_id'] ?? ''),
            'org_company_code' => (string)($_SESSION['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($_SESSION['org_legal_entity_code'] ?? ''),
            'org_site_id' => (string)($_SESSION['org_site_id'] ?? ''),
        ], static fn(string $value): bool => $value !== '');
        if ($scope === [] && !$this->isAdminUser($user)) {
            $this->error('scope_context_required', 403, 'MES and traceability reads require an authenticated session scope.');
        }

        return $scope;
    }

    /**
     * @param array<string, mixed> $user
     */
    private function isAdminUser(array $user): bool
    {
        $roles = is_array($user['roles'] ?? null) ? $user['roles'] : [(string)($user['role'] ?? '')];
        $roles = array_values(array_filter(array_map(static fn(mixed $role): string => strtolower(trim((string)$role)), $roles)));
        return array_intersect($roles, admin_roles()) !== [];
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
                'internal_auditor',
                'auditor',
            ],
        )));
    }
}
