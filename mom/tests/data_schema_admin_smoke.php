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
    if (PHP_VERSION_ID < 80100) {
        $property->setAccessible(true);
    }
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
smoke_assert(array_key_exists('db_target_status', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose the classified DB target status.');
smoke_assert(array_key_exists('db_target_healthy', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose whether the DB target is healthy enough to trust as authority.');
smoke_assert(array_key_exists('db_authority_coverage_ratio', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose DB-to-authority coverage ratio.');
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
smoke_assert(array_key_exists('runtime_ready_endpoint_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose endpoint implementation linkage counts.');
smoke_assert(array_key_exists('api_implementation_linked_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose API implementation linkage counts.');
smoke_assert(array_key_exists('unlinked_endpoint_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose unlinked endpoint counts.');
smoke_assert(array_key_exists('api_backed_table_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose API-backed table counts.');
smoke_assert(array_key_exists('schema_authority_linked_table_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose migration authority-linked table counts.');
smoke_assert(array_key_exists('runtime_contract_linked_table_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose runtime contract-linked table counts.');
smoke_assert(array_key_exists('unlinked_table_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose unlinked table counts.');
smoke_assert(array_key_exists('governance_direct_gap_count', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose classified direct governance posture counts.');
smoke_assert(array_key_exists('workspace_design_available', (array)($workspace['metrics'] ?? [])), 'Workspace metrics should expose whether the editable workspace design source exists.');
smoke_assert(($workspace['metrics']['workspace_design_available'] ?? false) === true, 'Normal Data Schema workspace should find the editable workspace design source.');
smoke_assert(($workspace['metrics']['workspace_design_artifact_orphaned'] ?? true) === false, 'Normal Data Schema workspace should not mark Schema Studio artifacts orphaned.');
smoke_assert(array_key_exists('present_lookup', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose DB table lookup data.');
smoke_assert(array_key_exists('db_probe_applicable', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether the DB probe is active or intentionally not applicable.');
smoke_assert(array_key_exists('db_probe_reachable', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether the DB probe reached PostgreSQL.');
smoke_assert(array_key_exists('db_probe_resolved', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose whether DB presence truth has actually been resolved.');
smoke_assert(array_key_exists('db_target_status', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose the DB target root-cause status.');
smoke_assert(array_key_exists('db_target_reason', (array)($workspace['connection'] ?? [])), 'Workspace connection should explain why the DB target is or is not authoritative.');
smoke_assert(array_key_exists('db_target_next_action', (array)($workspace['connection'] ?? [])), 'Workspace connection should expose the next safe action for DB target gaps.');
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
smoke_assert((int)($workspace['metrics']['runtime_ready_endpoint_count'] ?? -1) === (int)($workspace['metrics']['endpoint_count'] ?? -2), 'Every endpoint in Data Schema should link to a real backend path/controller/handler.');
smoke_assert((int)($workspace['metrics']['unlinked_endpoint_count'] ?? -1) === 0, 'Data Schema should not expose unlinked endpoint labels as runtime contracts.');
smoke_assert((int)($workspace['metrics']['api_backed_table_count'] ?? -1) === (int)($workspace['metrics']['table_count'] ?? -2), 'Every active system table should be API-backed before frontend build-out.');
smoke_assert((int)($workspace['metrics']['runtime_contract_linked_table_count'] ?? -1) === (int)($workspace['metrics']['table_count'] ?? -2), 'Every active system table should link to migration, registry, relation map and API controller truth.');
smoke_assert((int)($workspace['metrics']['unlinked_table_count'] ?? -1) === 0, 'Data Schema should not expose unlinked table labels as active system tables.');
smoke_assert((int)($workspace['metrics']['governance_gap_count'] ?? -1) === 0, 'Actionable governance gaps should be closed; inherited/root-scope direct posture is reported separately.');
smoke_assert(count((array)($workspace['highlights']['governance_gaps'] ?? [])) === 0, 'Workspace highlights should not report classified inherited/root-scope governance posture as actionable gaps.');
smoke_assert(count((array)($workspace['highlights']['unlinked_components'] ?? [])) === 0, 'Workspace highlights should not expose unlinked active components.');

$firstApi = (array)($workspace['lists']['apis'][0] ?? []);
$firstTable = (array)($workspace['lists']['tables'][0] ?? []);
$firstSchema = (array)($workspace['lists']['schemas'][0] ?? []);
$firstVariable = (array)($workspace['lists']['variables'][0] ?? []);

smoke_assert(isset($firstApi['key']), 'At least one API summary should expose a key.');
smoke_assert(array_key_exists('implementation_linked', $firstApi), 'API summaries should expose real controller/handler linkage.');
smoke_assert(array_key_exists('truth_status', $firstApi), 'API summaries should expose truth status.');
smoke_assert(array_key_exists('truthBinding', $firstApi), 'API summaries should expose truth binding details.');
smoke_assert(array_key_exists('registry_present', $firstTable), 'Table summaries should expose registry presence.');
smoke_assert(array_key_exists('db_present', $firstTable), 'Table summaries should expose DB presence.');
smoke_assert(array_key_exists('column_drift_count', $firstTable), 'Table summaries should expose structural drift counts.');
smoke_assert(array_key_exists('pk_drift', $firstTable), 'Table summaries should expose primary-key drift posture.');
smoke_assert(array_key_exists('truth_status', $firstTable), 'Table summaries should expose truth status.');
smoke_assert(array_key_exists('truthBinding', $firstTable), 'Table summaries should expose truth binding details.');
smoke_assert(array_key_exists('db_status', $firstTable), 'Table summaries should expose classified DB status instead of only a generic missing label.');
smoke_assert(array_key_exists('runtime_contract_linked', $firstTable), 'Table summaries should expose runtime contract linkage.');
smoke_assert(array_key_exists('endpoint_count', $firstTable), 'Table summaries should expose endpoint linkage counts.');
smoke_assert(array_key_exists('linked_endpoint_count', $firstTable), 'Table summaries should expose linked endpoint counts.');
smoke_assert(array_key_exists('migration_source_present', $firstTable), 'Table summaries should expose migration source proof.');
smoke_assert(array_key_exists('operationalRole', $firstTable), 'Table summaries should expose operational role classification.');
smoke_assert(array_key_exists('governance_mode', $firstTable), 'Table summaries should expose governance classification mode.');
smoke_assert(isset($firstSchema['key']), 'At least one schema blueprint should expose a key.');
smoke_assert((string)($firstSchema['truth_status'] ?? '') === 'reference_blueprint', 'Schema blueprints should be explicitly marked as non-runtime reference metadata.');
smoke_assert(($firstSchema['runtimeLinked'] ?? true) === false, 'Schema blueprints should not be reported as runtime-linked authority.');
smoke_assert(isset($firstVariable['key']), 'At least one variable category should expose a key.');
smoke_assert((string)($firstVariable['truth_status'] ?? '') === 'config_library', 'Variable libraries should be explicitly marked as config metadata.');
smoke_assert(($firstVariable['runtimeLinked'] ?? false) === true, 'Variable libraries should be reported as runtime-used config metadata.');
$schemaDesigns = array_values(array_filter((array)($workspace['lists']['designs'] ?? []), 'is_array'));
$schemaDesignIds = array_map(static fn(array $design): string => (string)($design['id'] ?? ''), $schemaDesigns);
smoke_assert(in_array('workspace', $schemaDesignIds, true), 'Data Schema workspace should expose workspace as the editable design layer.');
smoke_assert(in_array('system_contract_registry', $schemaDesignIds, true), 'Data Schema workspace should expose the full system contract registry as a read-only schema layer.');
$workspaceDesignSummary = null;
$registryDesignSummary = null;
foreach ($schemaDesigns as $schemaDesign) {
    if ((string)($schemaDesign['id'] ?? '') === 'workspace') {
        $workspaceDesignSummary = $schemaDesign;
    }
    if ((string)($schemaDesign['id'] ?? '') === 'system_contract_registry') {
        $registryDesignSummary = $schemaDesign;
    }
}
smoke_assert(is_array($workspaceDesignSummary), 'Data Schema workspace design summary should be present.');
smoke_assert(!empty($workspaceDesignSummary['blankDraft']), 'Workspace design summary should explicitly declare the active draft as blank.');
smoke_assert((int)($workspaceDesignSummary['tableCount'] ?? -1) === 0, 'Workspace design summary should stay empty so it cannot be confused with system schema authority.');
smoke_assert((string)($workspaceDesignSummary['runtimeAuthority'] ?? '') === 'system_contract_registry', 'Workspace design summary should point runtime authority to the system contract registry.');
smoke_assert((string)($workspaceDesignSummary['truth_status'] ?? '') === 'non_runtime_design_draft', 'Workspace design summary should declare itself as a non-runtime design draft.');
smoke_assert(($workspaceDesignSummary['runtimeLinked'] ?? true) === false, 'Workspace design summary should not be runtime-linked authority.');
smoke_assert(is_array($registryDesignSummary), 'Data Schema registry design summary should be present.');
smoke_assert(!empty($registryDesignSummary['readOnly']), 'Data Schema registry design summary should be read-only.');
smoke_assert((int)($registryDesignSummary['tableCount'] ?? 0) >= 600, 'Data Schema registry design summary should expose full platform table coverage.');
smoke_assert((string)($registryDesignSummary['truth_status'] ?? '') === 'runtime_contract_authority', 'System contract registry should declare itself as runtime contract authority.');
smoke_assert(($registryDesignSummary['runtimeLinked'] ?? false) === true, 'System contract registry should be runtime-linked authority.');
smoke_assert((int)($workspace['metrics']['system_contract_table_count'] ?? 0) >= 600, 'Data Schema metrics should expose full system contract table coverage.');
smoke_assert((int)($workspace['metrics']['system_contract_endpoint_count'] ?? 0) >= 3000, 'Data Schema metrics should expose full system contract endpoint coverage.');
smoke_assert((int)($workspace['metrics']['system_contract_workflow_count'] ?? 0) >= 250, 'Data Schema metrics should expose full system contract workflow coverage.');
smoke_assert((int)($workspace['metrics']['system_contract_critical_gap_count'] ?? -1) === 0, 'System contract diagnostics should have zero critical gaps.');
smoke_assert(is_array(($workspace['artifacts']['system_contract_registry'] ?? null)), 'Data Schema workspace should expose the DB-derived system contract registry summary.');
smoke_assert((string)($workspace['artifacts']['system_contract_registry']['authorityLayer'] ?? '') === 'system_contract_registry', 'System contract artifact should declare the registry authority layer.');
smoke_assert((int)($workspace['artifacts']['system_contract_registry']['summary']['tableCount'] ?? 0) >= 600, 'System contract artifact summary should expose full platform table coverage.');
smoke_assert(is_array(($workspace['artifacts']['schema_studio_manifest'] ?? null)), 'Workspace design manifest should remain visible as a non-runtime design artifact.');
smoke_assert(($workspace['artifacts']['schema_studio_manifest']['sourceAvailable'] ?? false) === true, 'Workspace design manifest should expose source availability.');
smoke_assert(($workspace['artifacts']['schema_studio_manifest']['orphaned'] ?? true) === false, 'Workspace design manifest should not be orphaned while workspace.json exists.');
smoke_assert((int)($workspace['artifacts']['schema_studio_manifest']['summary']['projectionCount'] ?? -1) === 0, 'Workspace design manifest should compile the intentional blank draft to zero design projections.');
$artifactItemsById = [];
foreach ((array)($workspace['operational']['freshness']['artifacts'] ?? []) as $artifactItem) {
    if (is_array($artifactItem) && isset($artifactItem['id'])) {
        $artifactItemsById[(string)$artifactItem['id']] = $artifactItem;
    }
}
smoke_assert(!empty($artifactItemsById['system_contract_manifest']['requiredForRelease']), 'System contract manifest should be required for release decisions.');
smoke_assert(empty($artifactItemsById['schema_manifest']['requiredForRelease']), 'Workspace design manifest should not be required for runtime release decisions.');
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
if (PHP_VERSION_ID < 80100) {
    $buildTableSummaries->setAccessible(true);
}
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
smoke_assert(($tableSummaryLookup['inventory_transactions']['db_status'] ?? '') === 'verified', 'Present tables should be classified as DB verified.');

$partialTargetRows = $buildTableSummaries->invoke(
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
                'primaryKeyFields' => ['risk_id'],
                'fields' => ['risk_id'],
            ],
        ],
    ],
    [
        'db_probe_applicable' => true,
        'db_probe_resolved' => true,
        'db_table_count' => 1,
        'present_table_count' => 1,
        'migration_table_present' => true,
        'applied_migration_count' => 0,
        'present_lookup' => [
            'inventory_transactions' => true,
        ],
        'column_lookup' => [
            'inventory_transactions' => ['txn_id' => true, 'recorded_at' => true],
        ],
        'pk_lookup' => [
            'inventory_transactions' => ['txn_id', 'recorded_at'],
        ],
    ],
);
$partialTargetLookup = [];
foreach ($partialTargetRows as $row) {
    if (is_array($row) && isset($row['key'])) {
        $partialTargetLookup[(string)$row['key']] = $row;
    }
}
smoke_assert(($partialTargetLookup['risk_register']['db_status'] ?? '') === 'missing_from_untracked_target', 'Missing table status should point to the untracked DB target root cause when the migration ledger is empty.');
smoke_assert(($partialTargetLookup['risk_register']['truthBinding']['dbProbe'] ?? '') === 'missing_from_untracked_target', 'Truth binding should preserve DB target root-cause classification for missing tables.');

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
smoke_assert(!empty($designResponse['payload']['schema']['_meta']['blankDraft']), 'Schema Studio getDesign should expose that the active workspace draft is intentionally blank.');
smoke_assert(count((array)($designResponse['payload']['schema']['tables'] ?? [])) === 0, 'Schema Studio active workspace should load with zero design tables.');
smoke_assert(count((array)($designResponse['payload']['baseline']['tables'] ?? [])) === 0, 'Schema Studio active workspace baseline should load with zero design tables.');

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
