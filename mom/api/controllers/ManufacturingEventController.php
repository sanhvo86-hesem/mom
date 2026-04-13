<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\ManufacturingEventBackboneService;
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

    private function service(): ManufacturingEventBackboneService
    {
        return new ManufacturingEventBackboneService($this->dataDir, $this->data);
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
