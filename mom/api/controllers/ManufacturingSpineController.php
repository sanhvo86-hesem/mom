<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\CanonicalManufacturingSpineService;
use Throwable;

final class ManufacturingSpineController extends BaseController
{
    public function model(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['manufacturing_spine' => $this->service()->model()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('manufacturing_spine_model_failed', 500, $e->getMessage());
        }
    }

    public function probe(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $this->success(['manufacturing_spine' => $this->service()->probe()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('manufacturing_spine_probe_failed', 500, $e->getMessage());
        }
    }

    private function service(): CanonicalManufacturingSpineService
    {
        return new CanonicalManufacturingSpineService(dirname($this->dataDir));
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
                'production_planner',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'qms_engineer',
                'engineering_manager',
                'engineering_lead',
                'it_admin',
            ],
        )));
    }
}
