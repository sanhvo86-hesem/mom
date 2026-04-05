<?php
declare(strict_types=1);
namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Services\RegistryService;
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
    private ?RegistryService $registry = null;

    private function registry(): RegistryService
    {
        if ($this->registry === null) {
            $this->registry = new RegistryService($this->dataDir);
        }

        return $this->registry;
    }

    /**
     * @return void
     */
    private function requireRegistryReadAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['registry.read', 'registry.write']);
    }

    /**
     * @return void
     */
    private function requireRegistryWriteAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['registry.write']);
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
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        $api = $this->query('api');

        try {
            $data = $this->registry()->raw('data-fields');

            if ($api && $api !== '') {
                $result = $data[$api] ?? null;
                if (!$result) $this->error('api_not_found', 404, "No field definitions for: {$api}");
                $this->success(['api' => $api, 'data' => $result, 'fields' => $result]);
            }

            $this->success([
                'data' => $data,
                'registry' => $data,
                'count' => count(array_filter(array_keys($data), static fn(string $key): bool => $key !== '_meta')),
            ]);
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
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
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
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('field-types');
            $this->success(['data' => $data, 'field_types' => $data]);
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
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        $key = $this->query('key');

        try {
            $data = $this->registry()->raw('status-options');

            if ($key && $key !== '') {
                $result = $data[$key] ?? null;
                if (!$result) $this->error('key_not_found', 404);
                $this->success(['key' => $key, 'data' => $result, 'options' => $result]);
            }

            $this->success([
                'data' => $data,
                'registry' => $data,
                'count' => count(array_filter(array_keys($data), static fn(string $itemKey): bool => $itemKey !== '_meta')),
            ]);
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
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('computed-formulas');
            $this->success(['data' => $data, 'formulas' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_validation_rules â€” Validation rules registry.
     */
    public function getValidationRules(): never
    {
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('validation-rules');
            $this->success(['data' => $data, 'rules' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_workflow_library â€” Workflow registry.
     */
    public function getWorkflowLibrary(): never
    {
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('workflow-library');
            $this->success(['data' => $data, 'workflow_library' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_domain_field_packs â€” Domain pack registry.
     */
    public function getDomainFieldPacks(): never
    {
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('domain-field-packs');
            $this->success(['data' => $data, 'domain_field_packs' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_relation_map â€” Relation map registry.
     */
    public function getRelationMap(): never
    {
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('relation-map');
            $this->success(['data' => $data, 'relation_map' => $data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('registry_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET registry_endpoint_catalog â€” Endpoint catalog registry.
     */
    public function getEndpointCatalog(): never
    {
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('endpoint-catalog');
            $this->success(['data' => $data, 'endpoint_catalog' => $data]);
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
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $data = $this->registry()->raw('iot-connectors');
            $this->success(['data' => $data, 'connectors' => $data]);
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
        $user = $this->requireAuth();
        $this->requireRegistryReadAccess($user);
        try {
            $registry = $this->registry();
            $data = [
                'data_fields' => $registry->raw('data-fields'),
                'api_params' => $registry->raw('api-params'),
                'field_types' => $registry->raw('field-types'),
                'status_options' => $registry->raw('status-options'),
                'domain_field_packs' => $registry->raw('domain-field-packs'),
                'schema_library' => $registry->raw('schema-library'),
                'registry_manifest' => $registry->raw('registry-manifest'),
                'endpoint_catalog' => $registry->raw('endpoint-catalog'),
                'validation_rules' => $registry->raw('validation-rules'),
                'relation_map' => $registry->raw('relation-map'),
                'workflow_library' => $registry->raw('workflow-library'),
                'compliance_crosswalk' => $registry->raw('compliance-crosswalk'),
                'registry_quality_report' => $registry->raw('registry-quality-report'),
                'unit_library' => $registry->raw('unit-library'),
                'identifier_patterns' => $registry->raw('identifier-patterns'),
                'computed_formulas' => $registry->raw('computed-formulas'),
                'iot_connectors' => $registry->raw('iot-connectors'),
            ];
            $this->success([
                'data' => $data,
                'data_fields' => $data['data_fields'],
                'api_params' => $data['api_params'],
                'field_types' => $data['field_types'],
                'status_options' => $data['status_options'],
                'domain_field_packs' => $data['domain_field_packs'],
                'schema_library' => $data['schema_library'],
                'registry_manifest' => $data['registry_manifest'],
                'endpoint_catalog' => $data['endpoint_catalog'],
                'validation_rules' => $data['validation_rules'],
                'relation_map' => $data['relation_map'],
                'workflow_library' => $data['workflow_library'],
                'compliance_crosswalk' => $data['compliance_crosswalk'],
                'registry_quality_report' => $data['registry_quality_report'],
                'unit_library' => $data['unit_library'],
                'identifier_patterns' => $data['identifier_patterns'],
                'computed_formulas' => $data['computed_formulas'],
                'iot_connectors' => $data['iot_connectors'],
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
