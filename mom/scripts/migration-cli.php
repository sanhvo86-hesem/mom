#!/usr/bin/env php
<?php

/**
 * HESEM MOM Portal - PostgreSQL Migration CLI
 *
 * Operational tooling for managing the 4-stage JSON→PostgreSQL migration.
 *
 * Usage:
 *   php scripts/migration-cli.php status     - Show current migration stage
 *   php scripts/migration-cli.php preflight  - Run pre-flight checks for next stage
 *   php scripts/migration-cli.php parity     - Check data parity between JSON and PG
 *   php scripts/migration-cli.php backfill   - Run shadow sync backfill
 *   php scripts/migration-cli.php runbook    - Show runbook for next stage transition
 *   php scripts/migration-cli.php env [stage] - Show env vars for a stage
 *
 * @package MOM\Database
 * @since   2.1.0
 */

declare(strict_types=1);

// Bootstrap
$baseDir = dirname(__DIR__);
$dataDir = $baseDir . '/data';

// Load Composer autoloader if available
$autoloader = $baseDir . '/vendor/autoload.php';
if (is_file($autoloader)) {
    require $autoloader;
} else {
    // Fallback manual autoloader
    spl_autoload_register(function (string $class): void {
        $baseDir = dirname(__DIR__);
        $prefixes = [
            'MOM\\Database\\' => $baseDir . '/database/',
            'MOM\\Api\\'      => $baseDir . '/api/',
        ];
        foreach ($prefixes as $prefix => $dir) {
            if (str_starts_with($class, $prefix)) {
                $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
                $file = $dir . $relative . '.php';
                if (is_file($file)) {
                    require_once $file;
                    return;
                }
            }
        }
    });
}

use MOM\Database\MigrationStageManager;
use MOM\Database\DataLayer;

// ── CLI ─────────────────────────────────────────────────────────────────────

$command = $argv[1] ?? 'status';
$rootDir = dirname($baseDir);

echo "\n";
echo "╔══════════════════════════════════════════════════════╗\n";
echo "║  HESEM MOM Portal - PostgreSQL Migration Manager    ║\n";
echo "╚══════════════════════════════════════════════════════╝\n\n";

try {
    $manager = new MigrationStageManager($dataDir, $rootDir);
} catch (\Throwable $e) {
    echo "ERROR: Cannot initialize migration manager: {$e->getMessage()}\n\n";
    exit(1);
}

switch ($command) {
    case 'status':
        cmdStatus($manager);
        break;

    case 'preflight':
        cmdPreflight($manager);
        break;

    case 'parity':
        cmdParity($manager);
        break;

    case 'backfill':
        cmdBackfill($manager);
        break;

    case 'runbook':
        cmdRunbook($manager);
        break;

    case 'env':
        $stage = $argv[2] ?? null;
        cmdEnv($manager, $stage);
        break;

    default:
        echo "Unknown command: {$command}\n\n";
        echo "Available commands:\n";
        echo "  status     - Show current migration stage\n";
        echo "  preflight  - Run pre-flight checks for next stage\n";
        echo "  parity     - Check data parity between JSON and PG\n";
        echo "  backfill   - Run shadow sync backfill\n";
        echo "  runbook    - Show runbook for next stage transition\n";
        echo "  env [stage] - Show env vars for a stage\n";
        echo "\n";
        exit(1);
}

echo "\n";
exit(0);

// ── Command Handlers ────────────────────────────────────────────────────────

function cmdStatus(MigrationStageManager $manager): void
{
    $stage = $manager->getCurrentStage();

    echo "Current Stage:\n";
    echo "  " . $stage['stage_label'] . "\n";
    echo "  Mode: " . $stage['current_stage'] . "\n\n";

    if ($stage['next_stage']) {
        echo "Next Stage:\n";
        echo "  " . $stage['next_label'] . "\n\n";
    } else {
        echo "  ** Final stage reached **\n\n";
    }

    echo "PostgreSQL:\n";
    echo "  Configured: " . ($stage['postgres_configured'] ? 'Yes' : 'No') . "\n";
    echo "  Reachable:  " . ($stage['postgres_reachable'] ? 'Yes' : 'No') . "\n";
    echo "  Database:   " . $stage['database_name'] . "\n";
}

function cmdPreflight(MigrationStageManager $manager): void
{
    $result = $manager->preflightCheck();

    echo "Pre-flight Check: " . ($result['current'] ?? '?') . " → " . ($result['target'] ?? 'N/A') . "\n";
    echo str_repeat('─', 60) . "\n\n";

    foreach ($result['checks'] as $check) {
        $icon = match ($check['status']) {
            'pass' => '[PASS]',
            'fail' => '[FAIL]',
            'warn' => '[WARN]',
            'info' => '[INFO]',
            'skip' => '[SKIP]',
            default => '[????]',
        };
        echo "  {$icon} {$check['name']}\n";
        echo "         {$check['message']}\n\n";
    }

    echo str_repeat('─', 60) . "\n";
    echo "Result: " . ($result['ready'] ? 'READY to proceed' : 'NOT READY - resolve issues above') . "\n";

    if (!empty($result['env_vars'])) {
        echo "\nRequired environment variables:\n";
        foreach ($result['env_vars'] as $key => $value) {
            echo "  {$key}={$value}\n";
        }
    }
}

function cmdParity(MigrationStageManager $manager): void
{
    echo "Data Parity Report (JSON vs PostgreSQL)\n";
    echo str_repeat('─', 60) . "\n\n";

    $report = $manager->checkDataParityReport();

    foreach ($report['stores'] as $name => $store) {
        $icon = $store['parity'] ? '[OK]' : '[!!]';
        echo "  {$icon} {$name}\n";
        echo "      JSON: " . ($store['json_exists'] ? "{$store['json_records']} records" : 'NOT FOUND') . "\n";
        echo "      PG:   ";
        if ($store['pg_error']) {
            echo "ERROR: {$store['pg_error']}\n";
        } else {
            $details = [];
            foreach ($store['pg_counts'] as $table => $count) {
                $details[] = "{$table}={$count}";
            }
            echo implode(', ', $details) . " (total: {$store['pg_total']})\n";
        }
        echo "\n";
    }

    echo str_repeat('─', 60) . "\n";
    echo "Overall Parity: " . ($report['parity'] ? 'OK' : 'ISSUES DETECTED') . "\n";
    echo "Checked at: {$report['checked_at']}\n";
}

function cmdBackfill(MigrationStageManager $manager): void
{
    echo "Running Shadow Sync Backfill...\n";
    echo str_repeat('─', 60) . "\n\n";

    $result = $manager->runShadowSyncBackfill();

    if (!empty($result['synced'])) {
        echo "Synced:\n";
        foreach ($result['synced'] as $store) {
            echo "  [OK] {$store}\n";
        }
    }

    if (!empty($result['errors'])) {
        echo "\nErrors:\n";
        foreach ($result['errors'] as $store => $error) {
            echo "  [FAIL] {$store}: {$error}\n";
        }
    }

    if (empty($result['synced']) && empty($result['errors'])) {
        echo "  No data stores to sync.\n";
    }

    echo "\nCompleted at: {$result['completed_at']}\n";
}

function cmdRunbook(MigrationStageManager $manager): void
{
    $stage = $manager->getCurrentStage();
    $current = $stage['current_stage'];
    $next = $stage['next_stage'];

    if (!$next) {
        echo "Already at final stage (POSTGRES_ONLY). No further transitions needed.\n";
        return;
    }

    $runbook = $manager->runbookForTransition($current, $next);

    echo "Runbook: {$runbook['from']} → {$runbook['to']}\n";
    echo str_repeat('─', 60) . "\n\n";

    foreach ($runbook['steps'] as $step) {
        echo "  {$step}\n";
    }
}

function cmdEnv(MigrationStageManager $manager, ?string $stage): void
{
    $stages = [
        'json_only'        => DataLayer::MODE_JSON_ONLY,
        'shadow_write'     => DataLayer::MODE_SHADOW_WRITE,
        'postgres_primary' => DataLayer::MODE_POSTGRES_PRIMARY,
        'postgres_only'    => DataLayer::MODE_POSTGRES_ONLY,
    ];

    if ($stage !== null && isset($stages[$stage])) {
        $mode = $stages[$stage];
        $vars = $manager->envVarsForStage($mode);
        echo "Environment variables for: {$stage}\n\n";
        foreach ($vars as $key => $value) {
            echo "  export {$key}={$value}\n";
        }
        return;
    }

    echo "Environment variables for all stages:\n\n";
    foreach ($stages as $label => $mode) {
        $vars = $manager->envVarsForStage($mode);
        echo "  [{$label}]\n";
        foreach ($vars as $key => $value) {
            echo "    {$key}={$value}\n";
        }
        echo "\n";
    }
}
