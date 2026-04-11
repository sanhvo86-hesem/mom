<?php

declare(strict_types=1);

/**
 * HESEM MOM Database Migration Runner.
 *
 * Executes SQL migration files in order against the configured PostgreSQL database.
 * Tracks applied migrations in a `schema_migrations` table.
 *
 * Usage:
 *   php migrate.php                    # Run all pending migrations
 *   php migrate.php --status                       # Show migration status
 *   php migrate.php --dry-run                      # Show what would be executed
 *   php migrate.php --file=069_*                   # Run a specific migration
 *   php migrate.php --allow-untracked-live-db      # Dangerous: only for disposable probes
 *
 * @package MOM\Database
 * @since   4.1.0
 */

require_once __DIR__ . '/Connection.php';

use MOM\Database\Connection;

function migrate_load_runtime_env_from_pool(): void
{
    $explicitDbName = getenv('DB_NAME');
    $explicitDbUser = getenv('DB_USER');
    $explicitDbPass = getenv('DB_PASS');
    if (
        is_string($explicitDbName) && $explicitDbName !== ''
        && is_string($explicitDbUser) && $explicitDbUser !== ''
        && is_string($explicitDbPass) && $explicitDbPass !== ''
    ) {
        return;
    }

    $candidates = array_values(array_filter([
        getenv('MOM_FPM_POOL_FILE') ?: null,
        '/etc/php/8.2/fpm/pool.d/mom.conf',
        '/etc/php/8.3/fpm/pool.d/mom.conf',
        '/etc/php/8.1/fpm/pool.d/mom.conf',
    ], static fn($path) => is_string($path) && $path !== ''));

    foreach ($candidates as $poolFile) {
        if (!is_file($poolFile) || !is_readable($poolFile)) {
            continue;
        }
        $lines = file($poolFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!is_array($lines)) {
            continue;
        }
        foreach ($lines as $line) {
            if (!preg_match('/^env\[([^\]]+)\]\s*=\s*(.+)$/', trim($line), $matches)) {
                continue;
            }
            $key = trim((string)($matches[1] ?? ''));
            $value = trim((string)($matches[2] ?? ''));
            if ($key === '') {
                continue;
            }
            $existing = getenv($key);
            if (is_string($existing) && $existing !== '') {
                continue;
            }
            $value = trim($value, "\"'");
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
        return;
    }
}

// ── Configuration ────────────────────────────────────────────────────────────

migrate_load_runtime_env_from_pool();

$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    echo "ERROR: Database config not found at {$configFile}\n";
    echo "Copy config.sample.php to config.php and configure PostgreSQL connection.\n";
    exit(1);
}

$config = require $configFile;
$migrationUser = getenv('DB_MIGRATION_USER') ?: getenv('MOM_MIGRATION_USER') ?: '';
$migrationPass = getenv('DB_MIGRATION_PASS') ?: getenv('MOM_MIGRATION_PASS') ?: '';
if (is_string($migrationUser) && trim($migrationUser) !== '') {
    $config['username'] = trim($migrationUser);
    if (is_string($migrationPass) && $migrationPass !== '') {
        $config['password'] = $migrationPass;
    }
}
$migrationsDir = __DIR__ . '/migrations';

// ── Parse CLI arguments ──────────────────────────────────────────────────────

$dryRun    = in_array('--dry-run', $argv ?? [], true);
$statusOnly = in_array('--status', $argv ?? [], true);
$allowUntrackedLiveDb = in_array('--allow-untracked-live-db', $argv ?? [], true);
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

// ── Migration ledger and safety guards ───────────────────────────────────────

function migration_ledger_exists(Connection $db): bool
{
    $exists = $db->queryScalar("
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = current_schema()
              AND table_name = 'schema_migrations'
        )
    ");

    return filter_var($exists, FILTER_VALIDATE_BOOLEAN);
}

function migration_live_table_count(Connection $db): int
{
    return max(0, (int)$db->queryScalar("
        SELECT COUNT(*)::int
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_type = 'BASE TABLE'
          AND table_name <> 'schema_migrations'
    "));
}

function migration_ensure_ledger(Connection $db): void
{
    if (migration_ledger_exists($db)) {
        return;
    }

    try {
        $db->execute("
            CREATE TABLE schema_migrations (
                migration_id    VARCHAR(200)    PRIMARY KEY,
                applied_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                checksum        VARCHAR(64)     NOT NULL,
                execution_ms    INT             DEFAULT 0
            )
        ");
    } catch (\Throwable $e) {
        throw new RuntimeException(
            "Cannot create schema_migrations with the current DB user. "
            . "Run migrations with DB_MIGRATION_USER/DB_MIGRATION_PASS or a database owner account. "
            . "Application runtime users should not own DDL privileges. Original error: "
            . $e->getMessage(),
            0,
            $e,
        );
    }
}

$ledgerExists = migration_ledger_exists($db);
if (!$ledgerExists && !$statusOnly && !$dryRun) {
    migration_ensure_ledger($db);
    $ledgerExists = true;
}

// ── Load applied migrations ──────────────────────────────────────────────────

$applied = [];
$liveTableCount = migration_live_table_count($db);
if ($ledgerExists) {
    $rows = $db->query("SELECT migration_id, applied_at, checksum FROM schema_migrations ORDER BY migration_id");
    foreach ($rows as $row) {
        $applied[$row['migration_id']] = $row;
    }
} elseif ($statusOnly || $dryRun) {
    echo "WARNING: schema_migrations ledger is missing; status is advisory only.\n";
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

    $pending = 0;
    foreach ($files as $file) {
        $name = basename($file, '.sql');
        $status = isset($applied[$name]) ? 'APPLIED' : 'PENDING';
        $at = $applied[$name]['applied_at'] ?? '';
        if ($status === 'PENDING') {
            $pending++;
        }
        printf("%-50s %-10s %-25s\n", $name, $status, $at);
    }

    $totalApplied = count($applied);
    $totalPending = $pending;
    echo "\nTotal: " . count($files) . " migrations ({$totalApplied} applied, {$totalPending} pending)\n";
    if ($liveTableCount > 0 && $totalApplied === 0) {
        echo "WARNING: Target DB already contains {$liveTableCount} live tables but has no applied migration ledger.\n";
        echo "         Do not run live migrations directly. Use a no-data-loss promotion/baseline workflow.\n";
    }
    exit(0);
}

if (!$dryRun && !$allowUntrackedLiveDb && $liveTableCount > 0 && count($applied) === 0) {
    echo "ERROR: Target DB contains {$liveTableCount} live tables but schema_migrations has zero applied migrations.\n";
    echo "Refusing to run ordered migrations over an untracked production-like schema because this can corrupt or partially apply DDL.\n";
    echo "Use the no-data-loss DB promotion/baseline workflow, or pass --allow-untracked-live-db only against a disposable cloned probe.\n";
    exit(2);
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
        $db->executeScript($sql);
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
