<?php

declare(strict_types=1);

use MOM\Api\Controllers\SchemaStudioController;
use MOM\Database\DataLayer;

require dirname(__DIR__, 2) . '/database/DataLayer.php';
require dirname(__DIR__, 2) . '/api/controllers/BaseController.php';
require dirname(__DIR__, 2) . '/api/controllers/SchemaStudioController.php';
require dirname(__DIR__, 2) . '/api/services/DataSchemaService.php';

$portalRoot = dirname(__DIR__, 2);
$projectRoot = dirname($portalRoot);
$dataDir = $portalRoot . '/data';
$designId = preg_replace('/[^A-Za-z0-9_-]+/', '_', (string)($argv[1] ?? 'workspace')) ?: 'workspace';
$actor = 'schema_authority_refresh_cli';

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
        throw new RuntimeException('Refresh command failed: ' . $command);
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

run_refresh_command(['node', $portalRoot . '/tools/registry/generate-registry-v3.mjs'], $projectRoot, false);
run_refresh_command(['python3', $portalRoot . '/tools/registry/canonical_publication_orchestrator.py'], $projectRoot);

$dataLayer = new DataLayer($dataDir, $projectRoot);
$controller = new SchemaStudioController($dataLayer, $projectRoot, $dataDir);
$schema = invoke_private($controller, 'loadDesignDocument', [$designId]);

if (!is_array($schema)) {
    throw new RuntimeException('Unable to load schema-studio design: ' . $designId);
}

$schema = invoke_private($controller, 'normalizeEnterpriseSchema', [$schema, $actor]);
$bundle = invoke_private($controller, 'buildCompilerBundle', [$schema, $designId, $actor]);
$manifest = invoke_private($controller, 'updateEnterpriseRegistryArtifacts', [$bundle, null]);
run_refresh_command(['php', $portalRoot . '/tools/schema/refresh_schema_authority_summary.php'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_operational_blind_spot_report.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_operational_stress_report.py'], $projectRoot);
run_refresh_command(['python3', $portalRoot . '/tools/registry/generate_publication_truth_summaries.py'], $projectRoot);

fwrite(STDOUT, json_encode([
    'designId' => $designId,
    'manifestGeneratedAt' => $manifest['_meta']['generatedAt'] ?? '',
    'projectionCount' => $manifest['summary']['projectionCount'] ?? 0,
    'releaseReadinessScore' => $manifest['summary']['releaseReadinessScore'] ?? 0,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
