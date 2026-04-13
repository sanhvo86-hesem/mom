<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
restore_exception_handler();
restore_error_handler();

use MOM\Api\Services\GenericCrudService;

function enterprise_registry_read_json(string $path): array
{
    $payload = json_decode((string)file_get_contents($path), true);
    smoke_assert(is_array($payload), "JSON artifact must decode: {$path}");
    return $payload;
}

$standard = enterprise_registry_read_json(QMS_TEST_BASE_DIR . '/contracts/registry-authority-standard.json');
$tableRegistry = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/table-registry.json');
$overlay = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/table-governance-overlay.json');
$endpointClassification = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/endpoint-governance-classification.json');
$quarantine = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/destructive-endpoint-quarantine.json');
$commandBindings = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/command-runtime-bindings.json');
$doctor = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/enterprise-registry-doctor-report.json');
$simulation = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/enterprise-frontend-simulation-report.json');
$manifest = enterprise_registry_read_json(QMS_TEST_DATA_DIR . '/registry/registry-manifest.json');
$aiAuthority = enterprise_registry_read_json(QMS_TEST_BASE_DIR . '/contracts/ai-authority-chain.json');

foreach ((array)($standard['authorityLayers'] ?? []) as $layer) {
    smoke_assert(!empty($layer['mustProvide']) && is_array($layer['mustProvide']), 'Every authority layer must declare machine-readable mustProvide requirements.');
}

$tableCount = count((array)($tableRegistry['tables'] ?? []));
smoke_assert($tableCount >= 600, 'System registry should expose full platform table coverage.');
smoke_assert(count((array)($overlay['tables'] ?? [])) === $tableCount, 'Table governance overlay must cover every registry table.');
smoke_assert((int)($doctor['scorecard']['tables']['missingOwnerRole'] ?? -1) === 0, 'Doctor must clear table owner-role gaps through the governance overlay.');
smoke_assert((int)($doctor['scorecard']['tables']['missingSystemOfRecord'] ?? -1) === 0, 'Doctor must clear table source-of-record gaps through the governance overlay.');
smoke_assert((int)($doctor['scorecard']['endpoints']['classified'] ?? 0) >= 3000, 'Endpoint governance classification must cover generated runtime endpoints.');
smoke_assert((int)($doctor['scorecard']['endpoints']['quarantinedDelete'] ?? -1) === count((array)($quarantine['rows'] ?? [])), 'Doctor and destructive endpoint quarantine must agree on quarantined delete count.');
smoke_assert((int)($doctor['scorecard']['businessContracts']['boundRuntimeCommandRoutes'] ?? 0) > 0, 'Command contracts must bind to executable runtime routes where routes exist.');
smoke_assert(count((array)($commandBindings['rows'] ?? [])) >= 200, 'Command runtime binding map must cover the command catalog.');
smoke_assert(count((array)($aiAuthority['authorityOrder'] ?? [])) >= 4, 'AI authority chain must define ordered authority layers.');
smoke_assert((int)($simulation['summary']['scenarioCount'] ?? 0) >= 10, 'Frontend simulator must cover the main ERP+MOM+MES+eQMS personas.');

foreach ([
    'registry-authority-standard.json',
    'endpoint-governance-classification.json',
    'table-governance-overlay.json',
    'enterprise-event-contract-map.json',
    'destructive-endpoint-quarantine.json',
    'command-runtime-bindings.json',
    'enterprise-registry-doctor-report.json',
    'enterprise-frontend-simulation-report.json',
    'ai-authority-chain.json',
] as $assetName) {
    smoke_assert(array_key_exists($assetName, (array)($manifest['assets'] ?? [])), "Registry manifest must register {$assetName}.");
}

$crudService = new GenericCrudService(QMS_TEST_DATA_DIR);
$deleteContractMethod = new ReflectionMethod($crudService, 'deleteContract');
if (PHP_VERSION_ID < 80100) {
    $deleteContractMethod->setAccessible(true);
}
$apsTable = $crudService->resolveTable('advanced_planning', 'aps_capacity_buckets');
$deleteContract = $deleteContractMethod->invoke($crudService, 'aps_capacity_buckets', $apsTable);
smoke_assert(($deleteContract['mode'] ?? '') === 'archive_only', 'Generic CRUD delete must respect table-governance-overlay and block hard delete for governed APS data.');

echo "enterprise_registry_authority_smoke: ok\n";
