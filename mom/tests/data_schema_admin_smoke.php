<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
restore_exception_handler();
restore_error_handler();

use MOM\Api\Controllers\AdminMetadataStudioController;
use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\SchemaStudioController;
use MOM\Database\DataLayer;
use MOM\Services\DataSchemaService;

$dataSchemaSmokeTraceEnabled = getenv('DATA_SCHEMA_SMOKE_TRACE') !== false;
$dataSchemaSmokeLastStep = 'boot';

function data_schema_smoke_trace(string $step): void
{
    global $dataSchemaSmokeTraceEnabled, $dataSchemaSmokeLastStep;
    $dataSchemaSmokeLastStep = $step;
    if (!$dataSchemaSmokeTraceEnabled) {
        return;
    }
    fwrite(STDERR, "[data-schema-smoke] {$step}\n");
}

register_shutdown_function(static function (): void {
    global $dataSchemaSmokeTraceEnabled, $dataSchemaSmokeLastStep;
    if (!$dataSchemaSmokeTraceEnabled) {
        return;
    }
    $lastError = error_get_last();
    fwrite(STDERR, "[data-schema-smoke] shutdown step={$dataSchemaSmokeLastStep}\n");
    if (is_array($lastError)) {
        fwrite(STDERR, '[data-schema-smoke] last-error=' . json_encode($lastError, JSON_UNESCAPED_SLASHES) . "\n");
    }
});

function data_schema_smoke_reset_request_state(): void
{
    $_GET = [];
    $_POST = [];
    $_FILES = [];
    $_SERVER = [
        'REQUEST_METHOD' => 'GET',
        'REQUEST_URI' => '/',
        'REMOTE_ADDR' => '127.0.0.1',
    ];
    $_SESSION = [];
}

function data_schema_smoke_exit_payload(callable $callback): array
{
    try {
        $callback();
    } catch (ExitException $e) {
        return [
            'status' => $e->getStatusCode(),
            'payload' => $e->getPayload(),
            'headers' => $e->getHeaders(),
            'body' => $e->getBody(),
        ];
    }

    throw new RuntimeException('Expected controller call to terminate via ExitException.');
}

function data_schema_smoke_set_json_body(object $controller, array $body): void
{
    $ref = new ReflectionObject($controller);
    while ($ref->getParentClass() !== false) {
        if ($ref->hasProperty('jsonBodyCache')) {
            break;
        }
        $ref = $ref->getParentClass();
    }
    $property = $ref->getProperty('jsonBodyCache');
    $property->setAccessible(true);
    $property->setValue($controller, $body);
}

function data_schema_smoke_remove_dir(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }
    $items = scandir($dir);
    if (!is_array($items)) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $dir . '/' . $item;
        if (is_dir($path)) {
            data_schema_smoke_remove_dir($path);
            continue;
        }
        @unlink($path);
    }
    @rmdir($dir);
}

$dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
$service = new DataSchemaService($dataLayer, QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
$traceWorkspaceStart = 'workspace-load';
data_schema_smoke_trace($traceWorkspaceStart);
$workspace = $service->getWorkspace();
data_schema_smoke_trace('workspace-loaded');

smoke_assert(is_array($workspace['metrics'] ?? null), 'Data schema workspace should expose metrics.');
smoke_assert(is_array($workspace['connection'] ?? null), 'Data schema workspace should expose connection state.');
smoke_assert(is_array($workspace['lists'] ?? null), 'Data schema workspace should expose list collections.');
smoke_assert(is_array($workspace['operational'] ?? null), 'Data schema workspace should expose operational hardening state.');
smoke_assert(count((array)($workspace['lists']['apis'] ?? [])) > 0, 'Data schema workspace should expose API catalog entries.');
smoke_assert(count((array)($workspace['lists']['tables'] ?? [])) > 0, 'Data schema workspace should expose table coverage entries.');
smoke_assert(count((array)($workspace['actions'] ?? [])) >= 6, 'Data schema workspace should expose operational schema actions.');
smoke_assert(array_key_exists('db_present_table_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include DB presence counts.');
smoke_assert(array_key_exists('operational_risk_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include operational risk counts.');
smoke_assert(array_key_exists('dependency_outdated_artifact_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include dependency drift counts.');
smoke_assert(array_key_exists('db_structural_drift_table_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include live DB structural drift counts.');
smoke_assert(array_key_exists('db_probe_applicable', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose whether live DB probing is actually applicable.');
smoke_assert(array_key_exists('db_probe_reachable', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose whether the DB probe actually reached PostgreSQL.');
smoke_assert(array_key_exists('db_probe_resolved', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose whether DB presence truth has actually been resolved.');
smoke_assert(array_key_exists('migration_tracking_present', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose whether schema_migrations tracking exists.');
smoke_assert(array_key_exists('applied_migration_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose how many migrations are recorded as applied.');
smoke_assert(array_key_exists('migration_backlog_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose the migration backlog count.');
smoke_assert(array_key_exists('business_contract_domain_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose business contract domain counts.');
smoke_assert(array_key_exists('business_contract_package_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose authored business contract package counts.');
smoke_assert(array_key_exists('business_contract_object_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose business contract object counts.');
smoke_assert(array_key_exists('business_contract_state_model_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose business contract state model counts.');
smoke_assert(array_key_exists('business_contract_deprecation_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose business contract deprecation counts.');
smoke_assert(array_key_exists('operational_blind_spot_critical_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include critical operational blind-spot counts.');
smoke_assert(array_key_exists('operational_stress_critical_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include critical operational stress counts.');
smoke_assert(array_key_exists('global_capability_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include global ERP+MOM capability counts.');
smoke_assert(array_key_exists('global_capability_blocking_gap_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should include global ERP+MOM blocking gap counts.');
smoke_assert(array_key_exists('present_lookup', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose DB table lookup data.');
smoke_assert(array_key_exists('db_probe_applicable', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether the DB probe is active or intentionally not applicable.');
smoke_assert(array_key_exists('db_probe_reachable', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether the DB probe reached PostgreSQL.');
smoke_assert(array_key_exists('db_probe_resolved', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether DB presence truth has actually been resolved.');
smoke_assert(array_key_exists('migration_table_present', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether the schema_migrations ledger table exists.');
smoke_assert(array_key_exists('applied_migration_count', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose the applied migration count.');
smoke_assert(array_key_exists('pending_migration_count', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose pending migration backlog count.');
smoke_assert(array_key_exists('structural_drift_table_count', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose structural drift counts.');
smoke_assert(array_key_exists('runtime_path_active', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether the application runtime is actually on the PostgreSQL path.');
smoke_assert(array_key_exists('releaseGate', (array)($workspace['operational'] ?? [])), 'Workspace operational state should expose a release gate.');
smoke_assert(array_key_exists('saveGuard', (array)($workspace['operational'] ?? [])), 'Workspace operational state should expose save guardrails.');
smoke_assert(is_array(($workspace['operational']['freshness']['artifacts'] ?? null)), 'Workspace operational state should expose artifact freshness.');
smoke_assert(is_array(($workspace['audits']['blind_spots'] ?? null)), 'Workspace should expose operational blind-spot audit summaries.');
smoke_assert(is_array(($workspace['audits']['stress'] ?? null)), 'Workspace should expose operational stress audit summaries.');
smoke_assert(is_array(($workspace['highlights']['structural_drift'] ?? null)), 'Workspace highlights should expose structural DB drift items.');
smoke_assert(
    !in_array('derived_artifacts_outdated', array_map(static fn(array $risk): string => (string)($risk['id'] ?? ''), array_values(array_filter((array)($workspace['operational']['risks'] ?? []), 'is_array'))), true),
    'Workspace operational risks should not flag source-vs-artifact drift once only non-blocking reference artifacts remain outdated.'
);
smoke_assert(
    !in_array('operational_blind_spots_critical', array_map(static fn(array $risk): string => (string)($risk['id'] ?? ''), array_values(array_filter((array)($workspace['operational']['risks'] ?? []), 'is_array'))), true),
    'Workspace operational risks should clear critical blind-spot governance findings once the report reaches zero critical scenarios.'
);
smoke_assert(
    !in_array('operational_stress_unhandled', array_map(static fn(array $risk): string => (string)($risk['id'] ?? ''), array_values(array_filter((array)($workspace['operational']['risks'] ?? []), 'is_array'))), true),
    'Workspace operational risks should clear critical stress-path governance findings once the report reaches zero critical scenarios.'
);
smoke_assert((int)($workspace['metrics']['operational_blind_spot_critical_count'] ?? -1) === 0, 'Workspace metrics should show zero critical blind spots after hardening.');
smoke_assert((int)($workspace['metrics']['operational_stress_critical_count'] ?? -1) === 0, 'Workspace metrics should show zero critical stress paths after hardening.');

$firstApi = (array)($workspace['lists']['apis'][0] ?? []);
$firstTable = (array)($workspace['lists']['tables'][0] ?? []);
$firstSchema = (array)($workspace['lists']['schemas'][0] ?? []);
$firstVariable = (array)($workspace['lists']['variables'][0] ?? []);

smoke_assert(isset($firstApi['key']), 'At least one API summary should expose a key.');
smoke_assert(array_key_exists('registry_present', $firstTable), 'Table summaries should expose registry presence.');
smoke_assert(array_key_exists('db_present', $firstTable), 'Table summaries should expose DB presence.');
smoke_assert(array_key_exists('column_drift_count', $firstTable), 'Table summaries should expose structural drift counts.');
smoke_assert(array_key_exists('pk_drift', $firstTable), 'Table summaries should expose primary-key drift posture.');
smoke_assert(isset($firstSchema['key']), 'At least one schema blueprint should expose a key.');
smoke_assert(isset($firstVariable['key']), 'At least one variable category should expose a key.');
$schemaDesigns = array_values(array_filter((array)($workspace['lists']['designs'] ?? []), 'is_array'));
$schemaDesignIds = array_map(static fn(array $design): string => (string)($design['id'] ?? ''), $schemaDesigns);
smoke_assert(in_array('workspace', $schemaDesignIds, true), 'Data Schema workspace should expose workspace as the editable design layer.');
smoke_assert(in_array('system_contract_registry', $schemaDesignIds, true), 'Data Schema workspace should expose the full system contract registry as a read-only schema layer.');
$registryDesignSummary = null;
foreach ($schemaDesigns as $schemaDesign) {
    if ((string)($schemaDesign['id'] ?? '') === 'system_contract_registry') {
        $registryDesignSummary = $schemaDesign;
        break;
    }
}
smoke_assert(is_array($registryDesignSummary), 'Data Schema registry design summary should be present.');
smoke_assert(!empty($registryDesignSummary['readOnly']), 'Data Schema registry design summary should be read-only.');
smoke_assert((int)($registryDesignSummary['tableCount'] ?? 0) >= 600, 'Data Schema registry design summary should expose full platform table coverage.');
smoke_assert(is_array(($workspace['artifacts']['business_contract_bundle'] ?? null)), 'Data Schema workspace should expose the business contract bundle summary.');
smoke_assert(is_array(($workspace['artifacts']['global_capability_audit'] ?? null)), 'Data Schema workspace should expose the global ERP+MOM capability audit summary.');
smoke_assert((int)($workspace['artifacts']['global_capability_audit']['summary']['capabilityCount'] ?? 0) >= 15, 'Global capability audit should cover the broad ERP+MOM process map.');
smoke_assert((int)($workspace['artifacts']['global_capability_audit']['summary']['blockingGapCount'] ?? -1) === 0, 'Global capability audit should have zero blocking gaps before frontend build-out.');
smoke_assert((int)($workspace['artifacts']['business_contract_bundle']['summary']['packageCount'] ?? 0) > 0, 'Business contract bundle summary should expose authored package coverage.');
smoke_assert((int)($workspace['artifacts']['business_contract_bundle']['summary']['objectCount'] ?? 0) > 0, 'Business contract bundle summary should expose canonical object coverage.');
smoke_assert((float)($workspace['artifacts']['business_contract_bundle']['summary']['authoredCoverageRatio'] ?? 0) >= 0.50, 'Business contract bundle summary should keep at least 50% authored coverage across canonical objects.');
smoke_assert((float)($workspace['artifacts']['business_contract_bundle']['summary']['lifecycleLikeCoverageRatio'] ?? 0) >= 0.60, 'Business contract bundle summary should keep at least 60% authored coverage across lifecycle-like objects.');
smoke_assert((float)($workspace['artifacts']['business_contract_bundle']['summary']['coreValueStreamCoverageRatio'] ?? 0) >= 0.90, 'Business contract bundle summary should keep near-total authored coverage for core value-stream objects.');
smoke_assert((int)($workspace['artifacts']['business_contract_bundle']['summary']['priorityGapCount'] ?? -1) >= 0, 'Business contract bundle summary should expose the remaining priority gap count.');
smoke_assert((int)($workspace['artifacts']['business_contract_bundle']['summary']['stateModelCount'] ?? 0) > 0, 'Business contract bundle summary should expose state model coverage.');

$buildTableSummaries = new ReflectionMethod(DataSchemaService::class, 'buildTableSummaries');
$buildTableSummaries->setAccessible(true);
$tableSummaryRows = $buildTableSummaries->invoke(
    $service,
    [
        'tables' => [
            'inventory_transactions' => [
                'label' => 'Inventory Transactions',
                'primaryKey' => ['txn_id', 'recorded_at'],
                'columns' => [
                    'txn_id' => ['pk' => true],
                    'recorded_at' => ['pk' => true],
                ],
            ],
            'risk_register' => [
                'label' => 'Risk Register',
                'primaryKey' => 'risk_id',
                'columns' => [
                    'risk_id' => ['pk' => true],
                    'risk_register_id' => ['pk' => false, 'unique' => true],
                    'risk_domain' => [],
                    'status_code' => [],
                ],
            ],
        ],
    ],
    [
        'entities' => [
            'inventory_transactions' => [
                'label' => 'Inventory Transactions',
                'primaryKeyFields' => ['txn_id', 'recorded_at'],
                'fields' => ['txn_id', 'recorded_at'],
            ],
            'risk_register' => [
                'label' => 'Risk Register',
                'primaryKey' => 'risk_id',
                'recordAddressing' => 'scalar',
                'primaryKeyFields' => ['risk_id'],
                'fields' => ['risk_id', 'risk_register_id', 'risk_domain', 'status_code'],
            ],
        ],
    ],
    [
        'db_probe_applicable' => true,
        'db_probe_resolved' => true,
        'present_lookup' => [
            'inventory_transactions' => true,
            'risk_register' => true,
        ],
        'column_lookup' => [
            'inventory_transactions' => ['txn_id' => true, 'recorded_at' => true],
            'risk_register' => ['risk_id' => true, 'risk_register_id' => true, 'risk_domain' => true, 'status_code' => true],
        ],
        'pk_lookup' => [
            'inventory_transactions' => ['txn_id', 'recorded_at'],
            'risk_register' => ['risk_id'],
        ],
    ],
);
$tableSummaryLookup = [];
foreach ($tableSummaryRows as $row) {
    if (is_array($row) && isset($row['key'])) {
        $tableSummaryLookup[(string)$row['key']] = $row;
    }
}
smoke_assert(($tableSummaryLookup['inventory_transactions']['pk_drift'] ?? true) === false, 'Composite partitioned keys should not be flagged as drift when PostgreSQL reports the expected PK order.');
smoke_assert(($tableSummaryLookup['risk_register']['pk_drift'] ?? true) === false, 'Risk register should be treated as a scalar-key runtime table after the authority reconciliation.');

$store = [
    'settings' => ['require_mfa' => false],
    'users' => [
        ['username' => 'admin-user', 'name' => 'Admin User', 'role' => 'admin', 'active' => true],
        ['username' => 'viewer-user', 'name' => 'Viewer User', 'role' => 'production_planner', 'active' => true],
    ],
];

$schemaStudioStore = [
    'settings' => ['require_mfa' => false],
    'users' => [
        ['username' => 'admin-user', 'name' => 'Admin User', 'role' => 'admin', 'active' => true],
    ],
];

$controller = (new AdminMetadataStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('summary-admin');
set_authenticated_session('admin-user', ['role' => 'admin']);
$response = data_schema_smoke_exit_payload(static function () use ($controller): void {
    $controller->getSummary();
});
smoke_assert($response['status'] === 200, 'Admin data schema summary should succeed for admin users.');
smoke_assert(is_array(($response['payload']['workspace'] ?? null)), 'Admin data schema summary should include the workspace payload.');
smoke_assert(
    count((array)($response['payload']['workspace']['lists']['tables'] ?? [])) > 0,
    'Admin data schema summary payload should include table summaries.'
);

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('summary-viewer');
set_authenticated_session('viewer-user', ['role' => 'production_planner']);
$response = data_schema_smoke_exit_payload(static function () use ($controller): void {
    $controller->getSummary();
});
smoke_assert($response['status'] === 403, 'Non-admin users should be blocked from the Data Schema admin workspace.');
smoke_assert(($response['payload']['error'] ?? null) === 'forbidden', 'Non-admin Data Schema summary should fail with forbidden.');

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('detail-api');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_GET['type'] = 'api';
$_GET['key'] = (string)$firstApi['key'];
$response = data_schema_smoke_exit_payload(static function () use ($controller): void {
    $controller->getDetail();
});
smoke_assert($response['status'] === 200, 'API detail should load for admin users.');
smoke_assert((string)($response['payload']['type'] ?? '') === 'api', 'API detail should keep the requested type.');
smoke_assert(is_array(($response['payload']['item'] ?? null)), 'API detail should return the registry endpoint document.');
smoke_assert(array_key_exists('fields', (array)($response['payload'] ?? [])), 'API detail should include endpoint field packs.');
smoke_assert(is_array(($response['payload']['revision'] ?? null)), 'API detail should expose a revision fingerprint.');
smoke_assert((bool)(($response['payload']['save_policy'] ?? [])['requiresRevision'] ?? false), 'API detail should advertise revision-guarded saves.');

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('detail-table');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_GET['type'] = 'table';
$_GET['key'] = (string)$firstTable['key'];
$response = data_schema_smoke_exit_payload(static function () use ($controller): void {
    $controller->getDetail();
});
smoke_assert($response['status'] === 200, 'Table detail should load for admin users.');
smoke_assert((string)($response['payload']['type'] ?? '') === 'table', 'Table detail should keep the requested type.');
smoke_assert(is_array(($response['payload']['item'] ?? null)), 'Table detail should return a table document.');
smoke_assert(is_array(($response['payload']['revision'] ?? null)), 'Table detail should expose a revision fingerprint.');

$relationOnlyKey = '';
foreach ((array)($workspace['lists']['tables'] ?? []) as $table) {
    if (!is_array($table)) {
        continue;
    }
    if (($table['registry_present'] ?? true) === false && ($table['relation_present'] ?? false) === true) {
        $relationOnlyKey = (string)($table['key'] ?? '');
        break;
    }
}

if ($relationOnlyKey !== '') {
    data_schema_smoke_reset_request_state();
    data_schema_smoke_trace('detail-relation-only-table');
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['type'] = 'table';
    $_GET['key'] = $relationOnlyKey;
    $response = data_schema_smoke_exit_payload(static function () use ($controller): void {
        $controller->getDetail();
    });
    smoke_assert($response['status'] === 200, 'Relation-only tables should still resolve through admin detail.');
    smoke_assert(
        (string)(($response['payload']['item'] ?? [])['source'] ?? '') === 'relation-map',
        'Relation-only table detail should synthesize a table document from the relation map.'
    );
    smoke_assert(is_array(($response['payload']['relation_entity'] ?? null)), 'Relation-only table detail should include the original relation entity.');
}

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('detail-schema');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_GET['type'] = 'schema';
$_GET['key'] = (string)$firstSchema['key'];
$response = data_schema_smoke_exit_payload(static function () use ($controller): void {
    $controller->getDetail();
});
smoke_assert($response['status'] === 200, 'Schema blueprint detail should load for admin users.');
smoke_assert((string)($response['payload']['type'] ?? '') === 'schema', 'Schema detail should keep the requested type.');

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('detail-variable');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_GET['type'] = 'variable';
$_GET['key'] = (string)$firstVariable['key'];
$response = data_schema_smoke_exit_payload(static function () use ($controller): void {
    $controller->getDetail();
});
smoke_assert($response['status'] === 200, 'Variable library detail should load for admin users.');
smoke_assert((string)($response['payload']['type'] ?? '') === 'variable', 'Variable detail should keep the requested type.');

$tempDataDir = sys_get_temp_dir() . '/mom_data_schema_revision_' . bin2hex(random_bytes(6));
@mkdir($tempDataDir . '/registry', 0775, true);
@mkdir($tempDataDir . '/config', 0775, true);
data_schema_smoke_trace('temp-table-revision-setup');
copy(QMS_TEST_DATA_DIR . '/registry/table-registry.json', $tempDataDir . '/registry/table-registry.json');
copy(QMS_TEST_DATA_DIR . '/registry/relation-map.json', $tempDataDir . '/registry/relation-map.json');

$tempController = (new AdminMetadataStudioController(new DataLayer($tempDataDir, QMS_TEST_ROOT_DIR), QMS_TEST_ROOT_DIR, $tempDataDir))
    ->setStore($store);

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('temp-table-revision-detail');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_GET['type'] = 'table';
$_GET['key'] = (string)$firstTable['key'];
$detailResponse = data_schema_smoke_exit_payload(static function () use ($tempController): void {
    $tempController->getDetail();
});
smoke_assert($detailResponse['status'] === 200, 'Temp controller should load table detail before stale-save simulation.');
$staleRevision = (array)($detailResponse['payload']['revision'] ?? []);
$tableItem = (array)($detailResponse['payload']['item'] ?? []);

$tableRegistryDoc = read_json_file($tempDataDir . '/registry/table-registry.json') ?? [];
$tableRegistryDoc['_meta'] = is_array($tableRegistryDoc['_meta'] ?? null) ? $tableRegistryDoc['_meta'] : [];
$tableRegistryDoc['_meta']['generatedAt'] = gmdate('c');
$tableRegistryDoc['_meta']['staleWriteProbe'] = true;
write_json_file($tempDataDir . '/registry/table-registry.json', $tableRegistryDoc);

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('temp-table-revision-save');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-csrf';
$_SESSION['csrf'] = 'schema-smoke-csrf';
$savePayload = [
    'type' => 'table',
    'key' => (string)$firstTable['key'],
    'item' => $tableItem,
    'revision' => $staleRevision,
];
$_SERVER['CONTENT_LENGTH'] = (string)strlen(json_encode($savePayload));
data_schema_smoke_set_json_body($tempController, $savePayload);
$saveResponse = data_schema_smoke_exit_payload(static function () use ($tempController): void {
    $tempController->saveDetail();
});
smoke_assert($saveResponse['status'] === 409, 'Saving with a stale revision should be rejected.');
smoke_assert(($saveResponse['payload']['error'] ?? null) === 'stale_workspace_revision', 'Stale revision saves should fail with stale_workspace_revision.');
smoke_assert(is_array(($saveResponse['payload']['current_revision'] ?? null)), 'Stale revision responses should return the current revision fingerprint.');

data_schema_smoke_remove_dir($tempDataDir);

$schemaStudioController = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($schemaStudioStore);
$designId = 'workspace';
foreach ((array)($workspace['lists']['designs'] ?? []) as $schemaDesign) {
    if (is_array($schemaDesign) && (string)($schemaDesign['id'] ?? '') === 'workspace') {
        $designId = 'workspace';
        break;
    }
}

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('design-get');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-csrf';
$_SESSION['csrf'] = 'schema-smoke-csrf';
$_GET['id'] = $designId;
$designResponse = data_schema_smoke_exit_payload(static function () use ($schemaStudioController): void {
    $schemaStudioController->getDesign();
});
smoke_assert($designResponse['status'] === 200, 'Schema Studio getDesign should load for admin users.');
smoke_assert(is_array(($designResponse['payload']['revisions'] ?? null)), 'Schema Studio getDesign should expose revision fingerprints.');
smoke_assert((bool)(($designResponse['payload']['save_policy'] ?? [])['requiresRevision'] ?? false), 'Schema Studio getDesign should advertise revision-guarded writes.');

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('design-compile-missing-revision');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-csrf';
$_SESSION['csrf'] = 'schema-smoke-csrf';
$compilePayload = [
    'design_id' => $designId,
    'schema' => (array)($designResponse['payload']['schema'] ?? []),
];
$_SERVER['CONTENT_LENGTH'] = (string)strlen(json_encode($compilePayload));
data_schema_smoke_set_json_body($schemaStudioController, $compilePayload);
$compileResponse = data_schema_smoke_exit_payload(static function () use ($schemaStudioController): void {
    $schemaStudioController->compileRegistryBundle();
});
smoke_assert($compileResponse['status'] === 409, 'Compile should reject missing revision tokens for persisted designs.');
smoke_assert(($compileResponse['payload']['error'] ?? null) === 'missing_design_revision_token', 'Compile should fail with missing_design_revision_token when revisions are omitted.');
smoke_assert(is_array(($compileResponse['payload']['current_revisions'] ?? null)), 'Compile missing-revision responses should expose current revisions.');

$tempSchemaDataDir = sys_get_temp_dir() . '/mom_schema_studio_revision_' . bin2hex(random_bytes(6));
@mkdir($tempSchemaDataDir . '/schema-studio/designs', 0775, true);
@mkdir($tempSchemaDataDir . '/schema-studio/snapshots', 0775, true);
data_schema_smoke_trace('design-temp-setup');
copy(QMS_TEST_DATA_DIR . '/schema-studio/designs/' . $designId . '.json', $tempSchemaDataDir . '/schema-studio/designs/' . $designId . '.json');
if (is_file(QMS_TEST_DATA_DIR . '/schema-studio/snapshots/' . $designId . '.baseline.json')) {
    copy(QMS_TEST_DATA_DIR . '/schema-studio/snapshots/' . $designId . '.baseline.json', $tempSchemaDataDir . '/schema-studio/snapshots/' . $designId . '.baseline.json');
}
$tempSchemaController = (new SchemaStudioController(new DataLayer($tempSchemaDataDir, QMS_TEST_ROOT_DIR), QMS_TEST_ROOT_DIR, $tempSchemaDataDir))
    ->setStore($schemaStudioStore);

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('design-temp-get');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-csrf';
$_SESSION['csrf'] = 'schema-smoke-csrf';
$_GET['id'] = $designId;
$tempDesignResponse = data_schema_smoke_exit_payload(static function () use ($tempSchemaController): void {
    $tempSchemaController->getDesign();
});
smoke_assert($tempDesignResponse['status'] === 200, 'Temp Schema Studio getDesign should load before stale-save simulation.');
$staleDesignRevisions = (array)($tempDesignResponse['payload']['revisions'] ?? []);
$tempDesignSchema = (array)($tempDesignResponse['payload']['schema'] ?? []);
$tempDesignSchema['_meta'] = is_array($tempDesignSchema['_meta'] ?? null) ? $tempDesignSchema['_meta'] : [];
$tempDesignSchema['_meta']['name'] = (string)($tempDesignSchema['_meta']['name'] ?? $designId);

$tempDesignPath = $tempSchemaDataDir . '/schema-studio/designs/' . $designId . '.json';
$mutatedDesign = read_json_file($tempDesignPath) ?? [];
$mutatedDesign['_meta'] = is_array($mutatedDesign['_meta'] ?? null) ? $mutatedDesign['_meta'] : [];
$mutatedDesign['_meta']['staleWriteProbe'] = gmdate('c');
write_json_file($tempDesignPath, $mutatedDesign);

data_schema_smoke_reset_request_state();
data_schema_smoke_trace('design-temp-save');
set_authenticated_session('admin-user', ['role' => 'admin']);
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-csrf';
$_SESSION['csrf'] = 'schema-smoke-csrf';
$designSavePayload = [
    'schema' => $tempDesignSchema,
    'revisions' => $staleDesignRevisions,
];
$_SERVER['CONTENT_LENGTH'] = (string)strlen(json_encode($designSavePayload));
data_schema_smoke_set_json_body($tempSchemaController, $designSavePayload);
$designSaveResponse = data_schema_smoke_exit_payload(static function () use ($tempSchemaController): void {
    $tempSchemaController->saveDesign();
});
smoke_assert($designSaveResponse['status'] === 409, 'Saving a design with stale revisions should be rejected.');
smoke_assert(($designSaveResponse['payload']['error'] ?? null) === 'stale_design_workspace_revision', 'Stale design writes should fail with stale_design_workspace_revision.');
smoke_assert(is_array(($designSaveResponse['payload']['current_revisions'] ?? null)), 'Stale design responses should return current revisions.');

data_schema_smoke_remove_dir($tempSchemaDataDir);

data_schema_smoke_trace('done');
echo "data_schema_admin_smoke: ok\n";
