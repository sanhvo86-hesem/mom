<?php

declare(strict_types=1);

/**
 * HESEM QMS Database Migration Runner.
 *
 * Executes SQL migration files in order against the configured PostgreSQL database.
 * Tracks applied migrations in a `schema_migrations` table.
 *
 * Usage:
 *   php migrate.php                    # Run all pending migrations
 *   php migrate.php --status           # Show migration status
 *   php migrate.php --dry-run          # Show what would be executed
 *   php migrate.php --file=069_*       # Run a specific migration
 *
 * @package HESEM\QMS\Database
 * @since   4.1.0
 */

require_once __DIR__ . '/Connection.php';

use HESEM\QMS\Database\Connection;

// ── Configuration ────────────────────────────────────────────────────────────

$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    echo "ERROR: Database config not found at {$configFile}\n";
    echo "Copy config.sample.php to config.php and configure PostgreSQL connection.\n";
    exit(1);
}

$config = require $configFile;
$migrationsDir = __DIR__ . '/migrations';

// ── Parse CLI arguments ──────────────────────────────────────────────────────

$dryRun    = in_array('--dry-run', $argv ?? [], true);
$statusOnly = in_array('--status', $argv ?? [], true);
$specific  = null;
foreach (($argv ?? []) as $arg) {
    if (str_starts_with($arg, '--file=')) {
        $specific = substr($arg, 7);
    }
}

// ── Connect ──────────────────────────────────────────────────────────────────

try {
    $db = Connection::getInstance($config);
    echo "Connected to PostgreSQL.\n";
} catch (\Throwable $e) {
    echo "ERROR: Cannot connect to PostgreSQL: " . $e->getMessage() . "\n";
    exit(1);
}

// ── Ensure schema_migrations table exists ────────────────────────────────────

$db->execute("
    CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id    VARCHAR(200)    PRIMARY KEY,
        applied_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
        checksum        VARCHAR(64)     NOT NULL,
        execution_ms    INT             DEFAULT 0
    )
");

// ── Load applied migrations ──────────────────────────────────────────────────

$applied = [];
$rows = $db->query("SELECT migration_id, applied_at, checksum FROM schema_migrations ORDER BY migration_id");
foreach ($rows as $row) {
    $applied[$row['migration_id']] = $row;
}

// ── Discover migration files ─────────────────────────────────────────────────

$files = glob($migrationsDir . '/*.sql');
sort($files);

if ($specific) {
    $files = array_filter($files, fn($f) => fnmatch("*{$specific}*", basename($f)));
}

// ── Status mode ──────────────────────────────────────────────────────────────

if ($statusOnly) {
    echo "\n=== Migration Status ===\n\n";
    printf("%-50s %-10s %-25s\n", "Migration", "Status", "Applied At");
    echo str_repeat('-', 90) . "\n";

    foreach ($files as $file) {
        $name = basename($file, '.sql');
        $status = isset($applied[$name]) ? 'APPLIED' : 'PENDING';
        $at = $applied[$name]['applied_at'] ?? '';
        printf("%-50s %-10s %-25s\n", $name, $status, $at);
    }

    $totalApplied = count($applied);
    $totalPending = count($files) - $totalApplied;
    echo "\nTotal: " . count($files) . " migrations ({$totalApplied} applied, {$totalPending} pending)\n";
    exit(0);
}

// ── Execute pending migrations ───────────────────────────────────────────────

echo "\n=== Running Migrations ===\n\n";

$executed = 0;
$failed   = 0;

foreach ($files as $file) {
    $name     = basename($file, '.sql');
    $checksum = hash('sha256', file_get_contents($file));

    if (isset($applied[$name])) {
        // Check for modified migration
        if ($applied[$name]['checksum'] !== $checksum) {
            echo "  WARNING: {$name} has been modified since application!\n";
        }
        continue; // Already applied
    }

    echo "  Migrating: {$name} ... ";

    if ($dryRun) {
        echo "DRY RUN (would execute)\n";
        $executed++;
        continue;
    }

    $sql = file_get_contents($file);
    $startMs = hrtime(true);

    try {
        $db->execute($sql);
        $elapsedMs = (int)((hrtime(true) - $startMs) / 1e6);

        // Record migration
        $db->execute(
            "INSERT INTO schema_migrations (migration_id, checksum, execution_ms) VALUES (:name, :checksum, :ms)",
            [':name' => $name, ':checksum' => $checksum, ':ms' => $elapsedMs],
        );

        echo "OK ({$elapsedMs}ms)\n";
        $executed++;
    } catch (\Throwable $e) {
        echo "FAILED\n";
        echo "    Error: " . $e->getMessage() . "\n";
        $failed++;

        // Stop on first failure
        echo "\n  Migration stopped due to error. Fix the issue and re-run.\n";
        break;
    }
}

echo "\n=== Summary ===\n";
echo "  Executed: {$executed}\n";
echo "  Failed:   {$failed}\n";
echo "  Mode:     " . ($dryRun ? 'DRY RUN' : 'LIVE') . "\n\n";

exit($failed > 0 ? 1 : 0);
