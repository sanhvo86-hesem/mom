<?php

declare(strict_types=1);

use MOM\Database\DataLayer;

require_once __DIR__ . '/../database/Connection.php';
require_once __DIR__ . '/../database/RuntimeShadowSync.php';
require_once __DIR__ . '/../database/DataLayer.php';

/**
 * CLI importer for pushing governed runtime master-data JSON into the
 * PostgreSQL System Registry / system database mirrors.
 *
 * Usage:
 *   php tools/sync_master_data_to_system_registry.php --dry-run
 *   php tools/sync_master_data_to_system_registry.php --host=... --database=... --user=... --password=...
 *
 * Recognized environment variables:
 *   QMS_DB_HOST / DB_HOST
 *   QMS_DB_PORT / DB_PORT
 *   QMS_DB_NAME / DB_NAME
 *   QMS_DB_USER / DB_USER
 *   QMS_DB_PASS / DB_PASS
 *   QMS_DB_SCHEMA / DB_SCHEMA
 */

function stderr(string $message): void
{
    fwrite(STDERR, $message . PHP_EOL);
}

function loadJsonFile(string $path): array
{
    if (!is_file($path)) {
        throw new RuntimeException("Master-data file not found: {$path}");
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        throw new RuntimeException("Could not read file: {$path}");
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new RuntimeException("Invalid JSON in file: {$path}");
    }

    return $decoded;
}

function firstEnv(string ...$names): ?string
{
    foreach ($names as $name) {
        $value = getenv($name);
        if ($value !== false && trim((string)$value) !== '') {
            return trim((string)$value);
        }
    }
    return null;
}

function parseArgs(array $argv): array
{
    $options = [
        'dry-run' => false,
    ];

    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--dry-run') {
            $options['dry-run'] = true;
            continue;
        }
        if (!str_starts_with($arg, '--')) {
            continue;
        }
        $parts = explode('=', substr($arg, 2), 2);
        $key = $parts[0] ?? '';
        $value = $parts[1] ?? '1';
        if ($key !== '') {
            $options[$key] = $value;
        }
    }

    return $options;
}

function summarizeStore(array $store): array
{
    $collections = [
        'customers',
        'suppliers',
        'parts',
        'revisions',
        'work_centers',
        'machines',
        'tooling_assets',
        'capas',
        'operators',
        'nc_program_releases',
        'downtime_reason_codes',
        'downtime_resolution_codes',
        'mes_connectivity_adapters',
        'mes_alarm_catalog',
        'mes_alarm_playbooks',
        'tool_assemblies',
    ];

    $summary = [];
    $total = 0;

    foreach ($collections as $collection) {
        $count = count((array)($store[$collection] ?? []));
        $summary[$collection] = $count;
        $total += $count;
    }

    $summary['_total'] = $total;
    return $summary;
}

function buildConfig(array $options): array
{
    $config = require __DIR__ . '/../database/config.php';

    $config['host'] = $options['host']
        ?? firstEnv('QMS_DB_HOST', 'DB_HOST')
        ?? (string)($config['host'] ?? 'localhost');

    $config['port'] = (int)(
        $options['port']
        ?? firstEnv('QMS_DB_PORT', 'DB_PORT')
        ?? (string)($config['port'] ?? 5432)
    );

    $config['database'] = $options['database']
        ?? $options['db']
        ?? firstEnv('QMS_DB_NAME', 'DB_NAME')
        ?? (string)($config['database'] ?? 'mom');

    $config['username'] = $options['user']
        ?? firstEnv('QMS_DB_USER', 'DB_USER')
        ?? (string)($config['username'] ?? 'mom_app');

    $config['password'] = $options['password']
        ?? firstEnv('QMS_DB_PASS', 'DB_PASS')
        ?? (string)($config['password'] ?? '');

    $config['schema'] = $options['schema']
        ?? firstEnv('QMS_DB_SCHEMA', 'DB_SCHEMA')
        ?? (string)($config['schema'] ?? 'public');

    $config['use_postgres'] = true;
    $config['shadow_write'] = true;
    $config['json_fallback'] = true;

    return $config;
}

function printJson(array $payload): void
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
}

try {
    $options = parseArgs($argv);

    if (!extension_loaded('pdo_pgsql')) {
        throw new RuntimeException(
            'pdo_pgsql is not loaded. Enable php_pdo_pgsql/php_pgsql before running this importer.'
        );
    }

    $projectRoot = realpath(__DIR__ . '/..');
    if ($projectRoot === false) {
        throw new RuntimeException('Could not resolve project root.');
    }

    $dataDir = str_replace('\\', '/', $options['data-dir'] ?? ($projectRoot . '/data'));
    $masterFile = str_replace('\\', '/', $options['file'] ?? ($dataDir . '/master-data/master-data.json'));
    $store = loadJsonFile($masterFile);
    $summary = summarizeStore($store);
    $config = buildConfig($options);

    $report = [
        'ok' => true,
        'dry_run' => (bool)($options['dry-run'] ?? false),
        'source_file' => $masterFile,
        'counts' => $summary,
        'target' => [
            'host' => $config['host'],
            'port' => $config['port'],
            'database' => $config['database'],
            'schema' => $config['schema'],
            'username' => $config['username'],
        ],
    ];

    if ($report['dry_run']) {
        printJson($report);
        exit(0);
    }

    $layer = new DataLayer($dataDir, $projectRoot, $config);
    $modeSummary = $layer->getModeSummary();
    if (!$modeSummary['postgres_reachable']) {
        throw new RuntimeException(
            'Could not reach PostgreSQL: ' . ($modeSummary['postgres_error'] ?: 'unknown_error')
        );
    }

    $syncOk = $layer->syncMasterDataStore($store);
    if (!$syncOk) {
        throw new RuntimeException('syncMasterDataStore returned false.');
    }

    $db = $layer->getConnection();
    $tableCounts = [];
    if ($db !== null) {
        $tables = [
            'customers',
            'vendors',
            'items',
            'item_revisions',
            'work_centers',
            'equipment',
            'tools',
            'employees',
            'mes_connectivity_adapters',
            'mes_alarm_catalog',
            'mes_alarm_playbooks',
            'mes_tool_assemblies',
        ];

        foreach ($tables as $table) {
            $tableCounts[$table] = (int)$db->queryScalar("SELECT COUNT(*) FROM {$table}");
        }
    }

    $report['mode'] = $layer->getMode();
    $report['postgres'] = $modeSummary;
    $report['target_table_counts'] = $tableCounts;
    $report['message'] = 'Master data synced to System Registry database.';

    printJson($report);
    exit(0);
} catch (Throwable $e) {
    stderr('[sync_master_data_to_system_registry] ' . $e->getMessage());
    printJson([
        'ok' => false,
        'error' => $e->getMessage(),
    ]);
    exit(1);
}
