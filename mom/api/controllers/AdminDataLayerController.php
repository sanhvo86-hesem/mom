<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * Admin Data Layer Controller
 *
 * Handles runtime data-layer configuration (PostgreSQL connection overrides,
 * shadow-sync health, Epicor transport health, and MES connector snapshot).
 *
 * All five handlers live here rather than in AdminController to keep the
 * runtime-mode surface isolated.  These were previously in the legacy
 * api.php switch statement and unreachable through the MVC router.
 */
class AdminDataLayerController extends BaseController
{
    /**
     * GET admin_data_layer_config_get
     * Returns the active runtime data-layer configuration (base + overrides + effective).
     * Admin-only.
     *
     * @return never
     */
    public function getConfig(): never
    {
        if ($this->store === null) {
            $this->error('system_not_initialized', 500);
        }
        $me = $this->requireAuth();
        $this->requireAdmin($me);

        $base      = runtime_data_layer_base_config();
        $overrides = load_runtime_data_layer_overrides();
        $effective = runtime_data_layer_effective_config();

        $this->success([
            'base_config'     => runtime_data_layer_admin_projection($base),
            'overrides'       => $overrides,
            'override_meta'   => load_runtime_data_layer_override_meta(),
            'effective_config' => runtime_data_layer_admin_projection($effective),
            'runtime_mode'    => runtime_data_layer_summary(),
            'updated_at'      => now_iso(),
        ]);
    }

    /**
     * POST admin_data_layer_config_save
     * Persists runtime data-layer overrides (host, port, mode, etc.).
     * Admin-only; requires CSRF.
     *
     * @return never
     */
    public function saveConfig(): never
    {
        if ($this->store === null) {
            $this->error('system_not_initialized', 500);
        }
        $me = $this->requireAuth();
        $this->requireAdmin($me);
        $this->requireCsrf();

        $body     = $this->jsonBody();
        $incoming = is_array($body['config'] ?? null) ? $body['config'] : [];
        $overrides = runtime_data_layer_sanitize_overrides($incoming);
        save_runtime_data_layer_overrides(
            $overrides,
            (string)($me['username'] ?? $_SESSION['user'] ?? 'system'),
        );

        $effective = runtime_data_layer_effective_config();

        $this->success([
            'overrides'       => $overrides,
            'override_meta'   => load_runtime_data_layer_override_meta(),
            'effective_config' => runtime_data_layer_admin_projection($effective),
            'runtime_mode'    => runtime_data_layer_summary(),
            'updated_at'      => now_iso(),
        ]);
    }

    /**
     * GET mes_shadow_status
     * Returns shadow-sync observability data (failures, fallbacks, blockers).
     * Requires login.
     *
     * @return never
     */
    public function shadowStatus(): never
    {
        $this->requireAuth();

        $observability = load_runtime_observability_store();

        $this->success([
            'shadow_sync'               => (array)($observability['shadow_sync'] ?? []),
            'primary_reads'             => (array)($observability['primary_reads'] ?? []),
            'connector_ingest'          => (array)($observability['connector_ingest'] ?? []),
            'shadow_sync_failures'      => mes_shadow_failure_rows($observability),
            'primary_read_fallbacks'    => mes_primary_read_rows($observability),
            'recent_connector_failures' => mes_recent_connector_ingest_failures($observability),
            'launch_blockers'           => mes_launch_blocker_rows($observability),
            'runtime_mode'              => runtime_data_layer_summary(),
            'updated'                   => (string)($observability['_meta']['updated'] ?? ''),
        ]);
    }

    /**
     * GET epicor_transport_health
     * Returns Epicor ERP transport adapter health snapshot.
     * Requires login.
     *
     * @return never
     */
    public function epicorTransportHealth(): never
    {
        $this->requireAuth();

        $this->success([
            'health'       => epicor_transport_adapter()->healthSnapshot(),
            'runtime_mode' => runtime_data_layer_summary(),
            'updated_at'   => now_iso(),
        ]);
    }

    /**
     * GET mes_connector_snapshot
     * Returns MES connector status: connector summary, KPIs, shadow state,
     * connectivity events, and recent failures.
     * Requires login.
     *
     * @return never
     */
    public function connectorSnapshot(): never
    {
        $this->requireAuth();

        $bundle       = runtime_read_model_bundle(true);
        $orders       = $bundle['orders'];
        $master       = $bundle['master'];
        $mes          = $bundle['mes'];
        $snapshot     = build_mes_snapshot($orders, $master, $mes);
        $observability = load_runtime_observability_store();

        $this->success([
            'items'                     => array_values((array)($snapshot['connector_summary'] ?? [])),
            'kpis'                      => [
                'connectors_total'   => (int)($snapshot['kpis']['connectors_total'] ?? 0),
                'connectors_healthy' => (int)($snapshot['kpis']['connectors_healthy'] ?? 0),
                'connectors_stale'   => (int)($snapshot['kpis']['connectors_stale'] ?? 0),
                'manual_bridges'     => (int)($snapshot['kpis']['manual_bridges'] ?? 0),
            ],
            'shadow_status'             => (array)($snapshot['shadow_status'] ?? []),
            'connector_ingest_status'   => (array)($snapshot['connector_ingest_status'] ?? []),
            'connectivity_events'       => array_values((array)($mes['mes_connectivity_events'] ?? [])),
            'recent_connector_failures' => mes_recent_connector_ingest_failures($observability),
            'data'                      => $snapshot,
            'read_sources'              => $bundle['sources'],
            'runtime_mode'              => $bundle['runtime_mode'],
            'updated'                   => (string)($mes['_meta']['updated'] ?? ''),
        ]);
    }
}
