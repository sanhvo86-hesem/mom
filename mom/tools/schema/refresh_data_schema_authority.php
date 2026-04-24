<?php

declare(strict_types=1);

use MOM\Api\Controllers\SchemaStudioController;
use MOM\Database\DataLayer;

ini_set('memory_limit', '1G');

require dirname(__DIR__, 2) . '/database/DataLayer.php';
require dirname(__DIR__, 2) . '/api/controllers/BaseController.php';
require dirname(__DIR__, 2) . '/api/controllers/SchemaStudioController.php';
require dirname(__DIR__, 2) . '/api/services/DataSchemaService.php';

$portalRoot = dirname(__DIR__, 2);
$projectRoot = dirname($portalRoot);
$dataDir = $portalRoot . '/data';
$actor = 'schema_authority_refresh_cli';
$args = array_slice($argv, 1);
$skipPublication = false;
$designId = 'system_contract_registry';

foreach ($args as $arg) {
    if ($arg === '--skip-publication') {
        $skipPublication = true;
        continue;
    }
    if (strncmp((string)$arg, '--', 2) === 0) {
        continue;
    }
    $designId = preg_replace('/[^A-Za-z0-9_-]+/', '_', (string)$arg) ?: 'workspace';
    break;
}

if (!function_exists('ensure_dir')) {
    function ensure_dir(string $dir): void
    {
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        if (is_dir($dir) && !is_writable($dir)) {
            try {
                @chmod($dir, 0775);
            } catch (Throwable) {
            }
        }
    }
}

if (!function_exists('read_json_file')) {
    function read_json_file(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode((string)$raw, true);
        return is_array($decoded) ? $decoded : null;
    }
}

if (!function_exists('write_json_file')) {
    function write_json_file(string $path, array $data): void
    {
        $dir = dirname($path);
        ensure_dir($dir);
        $tmp = $path . '.tmp';
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode json');
        }
        $tmpWriteOk = @file_put_contents($tmp, $json, LOCK_EX);
        if ($tmpWriteOk !== false && @rename($tmp, $path)) {
            return;
        }
        @unlink($tmp);
        if (@file_put_contents($path, $json, LOCK_EX) === false) {
            throw new RuntimeException('Cannot write json');
        }
    }
}

function run_refresh_command(array $parts, string $cwd, bool $required = true): void
{
    $command = implode(' ', array_map('escapeshellarg', $parts));
    $descriptor = [
        0 => ['file', '/dev/null', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $process = proc_open($command, $descriptor, $pipes, $cwd);
    if (!is_resource($process)) {
        throw new RuntimeException('Unable to start refresh command: ' . $command);
    }

    $stdout = stream_get_contents($pipes[1]) ?: '';
    $stderr = stream_get_contents($pipes[2]) ?: '';
    fclose($pipes[1]);
    fclose($pipes[2]);

    $code = proc_close($process);
    if ($stdout !== '') {
        fwrite(STDOUT, $stdout);
    }
    if ($stderr !== '') {
        fwrite(STDERR, $stderr);
    }
    if ($code !== 0 && $required) {
        fwrite(STDERR, "[refresh_data_schema_authority] required command failed: {$command}" . PHP_EOL);
        exit($code > 0 ? $code : 1);
    }
    if ($code !== 0 && !$required) {
        fwrite(STDERR, "[refresh_data_schema_authority] skipped optional command after failure: {$command}" . PHP_EOL);
    }
}

function invoke_private(object $target, string $method, array $args = []): mixed
{
    $reflection = new ReflectionMethod($target, $method);
    if (PHP_VERSION_ID < 80100) {
        $reflection->setAccessible(true);
    }
    return $reflection->invokeArgs($target, $args);
}

function refresh_portal_only_migration_gap_report(string $portalRoot, string $dataDir, string $projectRoot): void
{
    $registryDir = $dataDir . '/registry';
    $reportPath = $registryDir . '/migration-gap-report.json';
    $tableRegistry = read_json_file($registryDir . '/table-registry.json');
    $relationMap = read_json_file($registryDir . '/relation-map.json');
    $portalTableCount = count(array_filter((array)($tableRegistry['tables'] ?? []), 'is_array'));
    if ($portalTableCount === 0) {
        $portalTableCount = count(array_filter((array)($relationMap['entities'] ?? []), 'is_array'));
    }

    write_json_file($reportPath, [
        '_meta' => [
            'generatedAt' => gmdate('c'),
            'sourceMode' => 'portal_only',
            'sourceAvailable' => false,
            'sourceRoot' => $projectRoot . '/../my-project',
            'portalTables' => $portalTableCount,
            'myProjectTables' => 0,
            'gaps' => 0,
            'note' => 'External my-project source is unavailable in this workspace; migration-gap comparison is intentionally skipped.',
        ],
        'missingTables' => [],
        'missingColumns' => [],
        'missingConstraints' => [],
    ]);
}

$myProjectRoot = $projectRoot . '/../my-project';
if (!$skipPublication) {
    if (is_dir($myProjectRoot)) {
        run_refresh_command(['node', $portalRoot . '/tools/registry/generate-registry-v3.mjs'], $projectRoot, false);
    } else {
        fwrite(STDOUT, "[refresh_data_schema_authority] skipped generate-registry-v3.mjs because my-project source is unavailable." . PHP_EOL);
        refresh_portal_only_migration_gap_report($portalRoot, $dataDir, $projectRoot);
    }

    run_refresh_command(['python3', $portalRoot . '/tools/registry/canonical_publication_orchestrator.py'], $projectRoot);
} elseif (!is_dir($myProjectRoot)) {
    refresh_portal_only_migration_gap_report($portalRoot, $dataDir, $projectRoot);
}

$dataLayer = new DataLayer($dataDir, $projectRoot);
$controller = new SchemaStudioController($dataLayer, $projectRoot, $dataDir);
$schema = invoke_private($controller, 'loadDesignDocument', [$designId]);

if (!is_array($schema)) {
    throw new RuntimeException('Unable to load schema-studio design: ' . $designId);
}

$schema = invoke_private($controller, 'normalizeEnterpriseSchema', [$schema, $actor]);
$bundle = invoke_private($controller, 'buildCompilerBundle', [$schema, $designId, $actor]);
$manifest = invoke_private($controller, 'updateEnterpriseRegistryArtifacts', [$bundle, null]);

// The authority refresh defaults to the read-only system contract registry, but
// schema-studio-* artifacts remain the editable workspace draft surface. Restore
// that draft after compiling authority projections so Data Schema cannot confuse
// runtime authority with a user-editable design layer.
$workspaceManifest = null;
if ($designId === 'system_contract_registry') {
    $workspaceSchema = invoke_private($controller, 'loadDesignDocument', ['workspace']);
    if (is_array($workspaceSchema)) {
        $workspaceSchema = invoke_private($controller, 'normalizeEnterpriseSchema', [$workspaceSchema, $actor]);
        $workspaceBundle = invoke_private($controller, 'buildCompilerBundle', [$workspaceSchema, 'workspace', $actor]);
        $workspaceManifest = invoke_private($controller, 'updateEnterpriseRegistryArtifacts', [$workspaceBundle, null]);
    }
}
run_refresh_command(['php', $portalRoot . '/database/build_schema_snapshot.php'], $projectRoot);
run_refresh_command(['node', $portalRoot . '/tools/registry/generate-table-architecture.mjs'], $projectRoot);
run_refresh_command(['php', $portalRoot . '/tools/schema/refresh_schema_authority_summary.php'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_canonical_backend_standardization_catalog.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_data_fields_from_table_registry.py'], $projectRoot);
run_refresh_command(['node', $portalRoot . '/tools/registry/generate-workflow-governance.mjs'], $projectRoot);
run_refresh_command(['node', $portalRoot . '/tools/registry/generate-module-builder-registry.mjs'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_operational_blind_spot_report.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_operational_stress_report.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/enterprise_registry_doctor.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/enterprise_frontend_simulator.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_global_erp_mom_capability_audit.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_system_contract_authority.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_publication_truth_summaries.py'], $projectRoot);
if (!is_dir($myProjectRoot)) {
    refresh_portal_only_migration_gap_report($portalRoot, $dataDir, $projectRoot);
}

fwrite(STDOUT, json_encode([
    'designId' => $designId,
    'manifestGeneratedAt' => $manifest['_meta']['generatedAt'] ?? '',
    'projectionCount' => $manifest['summary']['projectionCount'] ?? 0,
    'releaseReadinessScore' => $manifest['summary']['releaseReadinessScore'] ?? 0,
    'workspaceManifestRestored' => is_array($workspaceManifest),
    'workspaceProjectionCount' => is_array($workspaceManifest) ? (int)($workspaceManifest['summary']['projectionCount'] ?? 0) : null,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
