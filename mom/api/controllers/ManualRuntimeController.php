<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * Manual Runtime Controller
 *
 * Handles the admin "Manual runtime" workspace that provides a read-only
 * summary of machine/MES runtime tables and order counts, used by the
 * admin panel's "Manual runtime" tab.
 *
 * Previously these actions lived in the legacy api.php switch statement
 * and were unreachable through the MVC router.
 */
class ManualRuntimeController extends BaseController
{
    /**
     * GET manual_runtime_summary
     * Returns counts and recent rows for machine/MES runtime tables plus
     * order counts, read-source metadata, and current runtime mode.
     * Requires an admin-level role.
     *
     * @return never
     */
    public function summary(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, admin_roles());

        $bundle  = runtime_read_model_bundle(false);
        $summary = build_manual_runtime_summary(
            (array)($bundle['master'] ?? []),
            (array)($bundle['orders'] ?? []),
            $this->store,
        );

        $this->success([
            'data'         => $summary,
            'read_sources' => $bundle['sources'],
            'runtime_mode' => $bundle['runtime_mode'],
        ]);
    }

    /**
     * GET manual_runtime_endpoint_contracts
     * Returns machine runtime entity keys and frontend/process endpoint contracts
     * for the manual runtime workspace.
     * Requires an admin-level role.
     *
     * @return never
     */
    public function endpointContracts(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, admin_roles());

        $this->success([
            'data' => [
                'machine_runtime_entities'     => manual_runtime_machine_entity_keys(),
                'frontend_endpoint_contracts'  => manual_runtime_frontend_endpoint_contracts(),
                'process_endpoint_contracts'   => order_runtime_frontend_endpoint_contracts(),
            ],
        ]);
    }
}
