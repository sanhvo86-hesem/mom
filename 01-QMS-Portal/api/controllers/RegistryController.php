<?php
declare(strict_types=1);
namespace HESEM\QMS\Api\Controllers;
use Throwable;

/**
 * Registry Controller â€” Centralized data registry for the entire platform.
 *
 * Serves: data field definitions, API parameters, field types, status options,
 * computed formulas, IoT connectors. All modules and the Module Builder
 * access this single source of truth via API.
 */
class RegistryController extends BaseController
{
    /**
     * @return void
     */
    private function requireRegistryWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, array_merge(admin_roles(), ['qms_engineer', 'quality_manager']));
    }

    private function registryDir(): string
    {
        $dir = $this->dataDir . '/registry';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir;
    }

    /**
     * GET registry_data_fields â€” All data field definitions per API endpoint.
     * Optional: ?api=order_so_list to get fields for specific API.
     */
    public function getDataFields(): never
    {
        $this->requireAuth();
        $api = $this->query('api');

        try {
            $file = $this->registryDir() . '/data-fields.json';
            $data = $this->readJsonFile($file) ?? [];

            if ($api && $api !== '') {
                $result = $data[$api] ?? null;
                if (!$result) $this->error('api_not_found', 404, "No field definitions for: {$api}");
                $this->success(['api' => $api, 'fields' => $result]);
            }

            $this->success(['registry' => $data, 'count' => count($data)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_api_params â€” Input parameters + response schema per API.
     * Optional: ?api=order_so_create to get params for specific API.
     */
    public function getApiParams(): never
    {
        $this->requireAuth();
        $api = $this->query('api');

        try {
            $file = $this->registryDir() . '/api-params.json';
            $data = $this->readJsonFile($file) ?? [];

            if ($api && $api !== '') {
                $result = $data[$api] ?? null;
                if (!$result) $this->error('api_not_found', 404);
                $this->success(['api' => $api, 'params' => $result]);
            }

            $this->success(['registry' => $data, 'count' => count($data)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_field_types â€” Field type definitions (string, number, date, badge...).
     */
    public function getFieldTypes(): never
    {
        $this->requireAuth();
        try {
            $file = $this->registryDir() . '/field-types.json';
            $data = $this->readJsonFile($file) ?? [];
            $this->success(['field_types' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_status_options â€” All enum/dropdown option sets.
     * Optional: ?key=so_status to get specific set.
     */
    public function getStatusOptions(): never
    {
        $this->requireAuth();
        $key = $this->query('key');

        try {
            $file = $this->registryDir() . '/status-options.json';
            $data = $this->readJsonFile($file) ?? [];

            if ($key && $key !== '') {
                $result = $data[$key] ?? null;
                if (!$result) $this->error('key_not_found', 404);
                $this->success(['key' => $key, 'options' => $result]);
            }

            $this->success(['registry' => $data, 'count' => count($data)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_computed_formulas â€” Pre-built formula presets.
     */
    public function getComputedFormulas(): never
    {
        $this->requireAuth();
        try {
            $file = $this->registryDir() . '/computed-formulas.json';
            $data = $this->readJsonFile($file) ?? [];
            $this->success(['formulas' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_iot_connectors â€” IoT connector definitions.
     */
    public function getIotConnectors(): never
    {
        $this->requireAuth();
        try {
            $file = $this->registryDir() . '/iot-connectors.json';
            $data = $this->readJsonFile($file) ?? [];
            $this->success(['connectors' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_full â€” Load entire registry in one call (for Module Builder init).
     */
    public function getFull(): never
    {
        $this->requireAuth();
        try {
            $dir = $this->registryDir();
            $this->success([
                'data_fields'       => $this->readJsonFile($dir . '/data-fields.json') ?? [],
                'api_params'        => $this->readJsonFile($dir . '/api-params.json') ?? [],
                'field_types'       => $this->readJsonFile($dir . '/field-types.json') ?? [],
                'status_options'    => $this->readJsonFile($dir . '/status-options.json') ?? [],
                'domain_field_packs'=> $this->readJsonFile($dir . '/domain-field-packs.json') ?? [],
                'schema_library'    => $this->readJsonFile($dir . '/schema-library.json') ?? [],
                'registry_manifest' => $this->readJsonFile($dir . '/registry-manifest.json') ?? [],
                'endpoint_catalog'  => $this->readJsonFile($dir . '/endpoint-catalog.json') ?? [],
                'validation_rules'  => $this->readJsonFile($dir . '/validation-rules.json') ?? [],
                'relation_map'      => $this->readJsonFile($dir . '/relation-map.json') ?? [],
                'workflow_library'  => $this->readJsonFile($dir . '/workflow-library.json') ?? [],
                'compliance_crosswalk' => $this->readJsonFile($dir . '/compliance-crosswalk.json') ?? [],
                'registry_quality_report' => $this->readJsonFile($dir . '/registry-quality-report.json') ?? [],
                'unit_library'      => $this->readJsonFile($dir . '/unit-library.json') ?? [],
                'identifier_patterns' => $this->readJsonFile($dir . '/identifier-patterns.json') ?? [],
                'computed_formulas' => $this->readJsonFile($dir . '/computed-formulas.json') ?? [],
                'iot_connectors'    => $this->readJsonFile($dir . '/iot-connectors.json') ?? [],
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST registry_update â€” Admin updates a registry file.
     * Body: { registry: 'data-fields'|'api-params'|..., data: {...} }
     */
    public function updateRegistry(): never
    {
        $user = $this->requireAuth();
        $this->requireRegistryWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $registry = trim((string)($body['registry'] ?? ''));
        $data = $body['data'] ?? null;

        $allowed = [
            'data-fields',
            'api-params',
            'field-types',
            'status-options',
            'domain-field-packs',
            'schema-library',
            'registry-manifest',
            'endpoint-catalog',
            'validation-rules',
            'relation-map',
            'workflow-library',
            'compliance-crosswalk',
            'registry-quality-report',
            'unit-library',
            'identifier-patterns',
            'computed-formulas',
            'iot-connectors',
        ];
        if (!in_array($registry, $allowed, true)) {
            $this->error('invalid_registry', 400, 'Allowed: ' . implode(', ', $allowed));
        }
        if (!is_array($data) && !is_object($data)) {
            $this->error('invalid_data', 400);
        }

        try {
            $file = $this->registryDir() . '/' . $registry . '.json';
            $this->writeJsonFile($file, (array)$data);
            $this->auditLog('registry_update', ['registry' => $registry], (string)($user['username'] ?? ''));
            $this->success(['updated' => $registry, 'count' => count((array)$data)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_update_failed', 500, $e->getMessage());
        }
    }
}
