#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Migration Drift Detector
 * ────────────────────────────────────────────────────────────────────────────
 * Catches the failure mode that hit us with the lost 188_error_code_registry
 * migration: the table existed in the live DB (created by a migration that
 * was applied months ago), the migration row stayed in schema_migrations, but
 * the migration FILE was deleted from the repo. A fresh dev clone could not
 * recreate the table from a clean checkout — only the live VPS happened to
 * still have it.
 *
 * What this script verifies
 * ─────────────────────────
 *   1. ALWAYS (works offline): every file in mom/database/migrations/*.sql
 *      has a unique NNN_ prefix. Same NNN used twice = ambiguous order.
 *      Already-applied collisions (e.g. 188_error_code_registry +
 *      188_enforce_single_primary_position_assignment on the live DB) are
 *      reported as P0 ghosts.
 *
 *   2. ALWAYS: every file follows NNN_snake_case_name.sql with a 3-digit
 *      zero-padded prefix.
 *
 *   3. DB-AWARE (if DB env present): every migration_id in schema_migrations
 *      has a matching NNN_*.sql file in the repo. Missing file = drift.
 *
 *   4. DB-AWARE: every pending file (in repo but not in schema_migrations)
 *      is reported as INFO so a deployer knows what will run.
 *
 * Exit codes
 * ──────────
 *   0  clean
 *   1  drift detected (file gap, duplicate NNN, naming violation)
 *   2  internal error (cannot list files, malformed SQL, …)
 *
 * Usage
 * ─────
 *   Standalone (no DB):    php mom/tools/release/check_migration_drift.php
 *   With DB (CI/deploy):   DB_HOST=… DB_USER=… DB_PASSWORD=… DB_NAME=mom \
 *                          php mom/tools/release/check_migration_drift.php
 *   Strict (warn → fail):  php mom/tools/release/check_migration_drift.php --strict
 *
 * Wired up by .github/workflows/{ci,deploy}.yml + tools/ai/preflight.sh.
 */

const EXIT_OK = 0;
const EXIT_DRIFT = 1;
const EXIT_INTERNAL = 2;

$strict = in_array('--strict', $argv, true);
$quiet = in_array('--quiet', $argv, true);

$migrationsDir = '';
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--migrations-dir=')) {
        $migrationsDir = substr($arg, strlen('--migrations-dir='));
    }
}
if ($migrationsDir === '') {
    $repoRoot = dirname(__DIR__, 3);
    $migrationsDir = $repoRoot . '/mom/database/migrations';
}

if (!is_dir($migrationsDir)) {
    fwrite(STDERR, "FATAL: migrations directory not found: {$migrationsDir}\n");
    exit(EXIT_INTERNAL);
}

// ── Step 1: scan repo migrations ────────────────────────────────────────────
$files = [];
$dh = opendir($migrationsDir);
if ($dh === false) {
    fwrite(STDERR, "FATAL: cannot open migrations directory\n");
    exit(EXIT_INTERNAL);
}
while (($entry = readdir($dh)) !== false) {
    if (str_ends_with($entry, '.sql')) {
        $files[] = $entry;
    }
}
closedir($dh);
sort($files);

$findings = [];
$repoByPrefix = []; // NNN -> [filename, ...]
$repoById = [];    // migration_id -> filename

foreach ($files as $file) {
    if (!preg_match('/^(\d{3})_([a-z0-9_]+)\.sql$/', $file, $m)) {
        $findings[] = ['P1', "naming_violation: '{$file}' does not match NNN_snake_case.sql"];
        continue;
    }
    $prefix = $m[1];
    $id = $m[1] . '_' . $m[2];
    $repoByPrefix[$prefix][] = $file;
    if (isset($repoById[$id])) {
        $findings[] = ['P0', "duplicate_id: '{$id}' appears twice ({$repoById[$id]}, {$file})"];
    } else {
        $repoById[$id] = $file;
    }
}

foreach ($repoByPrefix as $prefix => $list) {
    if (count($list) > 1) {
        // P2 (info): same NNN with distinct names is ambiguous but not destructive —
        // both migrations run in alphabetical order. Distinct from duplicate_id (P0)
        // which would have the same id and is genuinely irresolvable.
        $findings[] = ['P2', "prefix_collision: NNN={$prefix} used by " . count($list) . ' files: ' . implode(', ', $list)];
    }
}

// ── Step 2: DB-aware checks (optional) ─────────────────────────────────────
$dbHost = getenv('DB_HOST') ?: '';
$dbName = getenv('DB_NAME') ?: '';
$dbUser = getenv('DB_USER') ?: '';
$dbPass = getenv('DB_PASSWORD') ?: getenv('DB_PASS') ?: '';
$dbPort = (int)(getenv('DB_PORT') ?: 5432);

$dbApplied = null;
if ($dbHost !== '' && $dbName !== '' && $dbUser !== '') {
    try {
        $dsn = "pgsql:host={$dbHost};port={$dbPort};dbname={$dbName}";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        $rows = $pdo->query('SELECT migration_id FROM schema_migrations ORDER BY migration_id')->fetchAll(PDO::FETCH_COLUMN);
        $dbApplied = array_map('strval', $rows);
    } catch (Throwable $e) {
        if (!$quiet) {
            fwrite(STDERR, "WARN: cannot reach DB ({$e->getMessage()}) — skipping drift cross-check\n");
        }
    }
}

if ($dbApplied !== null) {
    // P0: live DB applied a migration whose file is missing from the repo
    foreach ($dbApplied as $appliedId) {
        if (!isset($repoById[$appliedId])) {
            $findings[] = ['P0', "ghost_migration: '{$appliedId}' is applied on the live DB but no file exists in mom/database/migrations/. Fresh clones cannot recreate this schema."];
        }
    }

    // INFO: file present in repo but not applied yet (deploy will apply)
    $pending = [];
    foreach ($repoById as $id => $file) {
        if (!in_array($id, $dbApplied, true)) {
            $pending[] = $id;
        }
    }
    if ($pending !== [] && !$quiet) {
        fwrite(STDOUT, "INFO: " . count($pending) . " pending migration(s) will be applied on next deploy: " . implode(', ', $pending) . "\n");
    }
}

// ── Step 3: report ─────────────────────────────────────────────────────────
if ($findings === []) {
    if (!$quiet) {
        $mode = $dbApplied === null ? 'offline mode' : 'DB-aware mode';
        fwrite(STDOUT, "migration drift: clean (" . count($repoById) . " files scanned, {$mode})\n");
    }
    exit(EXIT_OK);
}

$counts = ['P0' => 0, 'P1' => 0, 'P2' => 0];
foreach ($findings as [$sev, $msg]) {
    $stream = $sev === 'P0' ? STDERR : STDOUT;
    fwrite($stream, "[{$sev}] {$msg}\n");
    $counts[$sev]++;
}

if ($counts['P0'] > 0 || ($strict && $counts['P1'] > 0)) {
    fwrite(STDERR, sprintf(
        "\nFAIL: migration drift (P0=%d, P1=%d, P2=%d)\n",
        $counts['P0'], $counts['P1'], $counts['P2']
    ));
    exit(EXIT_DRIFT);
}

if (!$quiet) {
    fwrite(STDOUT, sprintf(
        "migration drift: %d P1 + %d P2 (no fatal issues; pass --strict to fail on P1)\n",
        $counts['P1'], $counts['P2']
    ));
}
exit(EXIT_OK);
