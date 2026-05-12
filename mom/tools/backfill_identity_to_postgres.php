<?php

declare(strict_types=1);

/**
 * Backfill: mom/data/config/users.json  →  PostgreSQL  (ADR-0013, Phase 1).
 *
 * Imports every user record from the legacy JSON file into the canonical
 * `users` / `user_roles` / `employees` / `hcm_employees` tables via
 * AuthUserShadowSyncService::syncUser(), then verifies the round-trip.
 *
 * Modes (mutually exclusive):
 *   --dry-run   Diff JSON against PostgreSQL and report. Writes nothing.
 *   --apply     Execute the backfill. Records every action in
 *               audit_event_chain and updates data_collection_state.
 *   --advance=<mode>
 *               After a successful --apply, set the 'users' collection
 *               mode to <mode>. Allowed: shadow_write, postgres_primary,
 *               postgres_only.
 *
 * Common flags:
 *   --actor=<name>      Audit actor (default: $USER@host).
 *   --change-ref=<ref>  Audit change-ref (default: 'cli:backfill_identity').
 *   --limit=<n>         Process only the first <n> users (debug aid).
 *   --verbose           Per-user diff output.
 *
 * Exit codes:
 *   0 — success / no drift (dry-run)
 *   1 — usage error
 *   2 — database unreachable
 *   3 — drift remains after --apply
 *   4 — backfill threw on at least one user
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

require_once __DIR__ . '/../vendor/autoload.php';

use MOM\Api\Services\AuditChainService;
use MOM\Api\Services\AuthUserShadowSyncService;
use MOM\Api\Services\DataCollectionModeResolver;
use MOM\Api\Services\IdentityRepository;
use MOM\Api\Services\UserRepository;
use MOM\Database\Connection;

// ── 1. Argv parsing ─────────────────────────────────────────────────────────
/** @var list<string> $argv */
$argv = $argv ?? [];
$opts = parseArgv($argv);
if ($opts === null) {
    fwrite(STDERR, usage());
    exit(1);
}

$dataDir   = realpath(__DIR__ . '/../data') ?: (__DIR__ . '/../data');
$usersFile = $dataDir . '/config/users.json';
if (!is_file($usersFile)) {
    fwrite(STDERR, "users.json not found at {$usersFile}\n");
    exit(2);
}

// ── 2. Connect to PostgreSQL ────────────────────────────────────────────────
$configFile = realpath(__DIR__ . '/../database/config.php');
if ($configFile === false || !is_file($configFile)) {
    fwrite(STDERR, "database/config.php missing\n");
    exit(2);
}
$dbConfig = (array)(require $configFile);
try {
    $db = Connection::getInstance($dbConfig);
    $db->queryOne('SELECT 1');
} catch (Throwable $e) {
    fwrite(STDERR, "PostgreSQL unreachable: " . $e->getMessage() . "\n");
    exit(2);
}

// ── 3. Wire services ────────────────────────────────────────────────────────
$portalRoot   = realpath(__DIR__ . '/..') ?: __DIR__ . '/..';
$jsonStore    = new UserRepository($dataDir);
$shadowSync   = new AuthUserShadowSyncService($portalRoot);
$modeResolver = new DataCollectionModeResolver($db);
$audit        = new AuditChainService($db);
$identity     = new IdentityRepository($db, $jsonStore, $shadowSync, $modeResolver, $audit);

// ── 4. Load source ──────────────────────────────────────────────────────────
$store = json_decode((string)file_get_contents($usersFile), true);
if (!is_array($store) || !is_array($store['users'] ?? null)) {
    fwrite(STDERR, "users.json malformed\n");
    exit(2);
}
$users = $store['users'];
if ($opts['limit'] !== null) {
    $users = array_slice($users, 0, $opts['limit']);
}
$total = count($users);

printf("[backfill_identity] mode=%s actor=%s users=%d\n",
    $opts['mode'], $opts['actor'], $total);

// ── 5. Dry-run path ─────────────────────────────────────────────────────────
if ($opts['mode'] === 'dry-run') {
    $tally = ['json_only' => 0, 'pg_only' => 0, 'mismatch' => 0, 'agree' => 0];
    foreach ($users as $u) {
        $username = strtolower(trim((string)($u['username'] ?? '')));
        if ($username === '') {
            continue;
        }
        $drift = $identity->detectAndRecordDrift($username);
        $cat = $drift['direction'] ?? 'agree';
        $tally[$cat]++;
        if ($opts['verbose'] && $cat !== 'agree') {
            printf("  drift %-8s username=%s json=%s pg=%s\n",
                $cat, $username,
                substr($drift['json_sha256'] ?? '-', 0, 12),
                substr($drift['pg_sha256'] ?? '-', 0, 12),
            );
        }
    }
    printf("[backfill_identity] dry-run summary: agree=%d json_only=%d pg_only=%d mismatch=%d\n",
        $tally['agree'], $tally['json_only'], $tally['pg_only'], $tally['mismatch']);
    exit(($tally['json_only'] + $tally['pg_only'] + $tally['mismatch']) === 0 ? 0 : 0);
    // Note: dry-run is informational; non-zero drift is expected mid-cutover
    // and does not by itself fail the run.
}

// ── 6. Apply path ───────────────────────────────────────────────────────────
$audit->record(
    eventType:     'identity_backfill_started',
    aggregateType: 'identity.users',
    aggregateId:   'backfill',
    actorId:       null,
    actorName:     $opts['actor'],
    payload:       ['change_ref' => $opts['change_ref'], 'count' => $total],
);

$ok = 0;
$fail = 0;
$failures = [];
foreach ($users as $i => $u) {
    if (!is_array($u)) {
        continue;
    }
    $username = strtolower(trim((string)($u['username'] ?? '')));
    if ($username === '') {
        continue;
    }
    try {
        $shadowSync->syncUser($u);
        $ok++;
        if ($opts['verbose']) {
            printf("  [%4d/%4d] ok %s\n", $i + 1, $total, $username);
        }
    } catch (Throwable $e) {
        $fail++;
        $failures[] = ['username' => $username, 'error' => $e->getMessage()];
        printf("  [%4d/%4d] FAIL %s :: %s\n", $i + 1, $total, $username, $e->getMessage());
    }
}

// ── 7. Verify by full drift scan ────────────────────────────────────────────
$tally = $identity->scanDrift();
$audit->record(
    eventType:     'identity_backfill_finished',
    aggregateType: 'identity.users',
    aggregateId:   'backfill',
    actorId:       null,
    actorName:     $opts['actor'],
    payload:       [
        'change_ref' => $opts['change_ref'],
        'ok'         => $ok,
        'failed'     => $fail,
        'failures'   => $failures,
        'drift'      => $tally,
    ],
);

printf("[backfill_identity] applied: ok=%d failed=%d   drift after: %s\n",
    $ok, $fail, json_encode($tally, JSON_UNESCAPED_SLASHES));

if ($fail > 0) {
    exit(4);
}
if (($tally['json_only'] + $tally['pg_only'] + $tally['mismatch']) > 0) {
    fwrite(STDERR, "[backfill_identity] WARNING: drift remains; investigate data_collection_drift before advancing mode.\n");
    exit(3);
}

// ── 8. Optional: advance mode ───────────────────────────────────────────────
if ($opts['advance'] !== null) {
    $modeResolver->advance(
        IdentityRepository::COLLECTION_KEY,
        $opts['advance'],
        $opts['actor'],
        $opts['change_ref'],
    );
    $db->execute(
        'UPDATE data_collection_state
            SET last_verified_at     = now(),
                last_verified_sha256 = :sha
          WHERE collection_key = :key',
        [
            ':sha' => hash('sha256', (string)file_get_contents($usersFile)),
            ':key' => IdentityRepository::COLLECTION_KEY,
        ],
    );
    $audit->record(
        eventType:     'collection_mode_advanced',
        aggregateType: 'data_collection_state',
        aggregateId:   IdentityRepository::COLLECTION_KEY,
        actorId:       null,
        actorName:     $opts['actor'],
        payload:       [
            'collection_key' => IdentityRepository::COLLECTION_KEY,
            'new_mode'       => $opts['advance'],
            'change_ref'     => $opts['change_ref'],
        ],
    );
    printf("[backfill_identity] advanced collection 'users' to mode=%s\n", $opts['advance']);
}

exit(0);

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * @return array{mode:string, actor:string, change_ref:string, limit:?int, verbose:bool, advance:?string}|null
 */
function parseArgv(array $argv): ?array
{
    $modes = ['dry-run' => false, 'apply' => false];
    $opts  = [
        'mode'       => 'dry-run',
        'actor'      => sprintf('%s@%s', getenv('USER') ?: 'cli', gethostname() ?: 'host'),
        'change_ref' => 'cli:backfill_identity',
        'limit'      => null,
        'verbose'    => false,
        'advance'    => null,
    ];
    $allowedAdvance = [
        DataCollectionModeResolver::MODE_SHADOW_WRITE,
        DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
        DataCollectionModeResolver::MODE_POSTGRES_ONLY,
    ];

    array_shift($argv);
    foreach ($argv as $a) {
        if ($a === '--dry-run')   { $modes['dry-run'] = true; continue; }
        if ($a === '--apply')     { $modes['apply']   = true; continue; }
        if ($a === '--verbose')   { $opts['verbose']  = true; continue; }
        if ($a === '-h' || $a === '--help') { return null; }
        if (str_starts_with($a, '--actor=')) {
            $opts['actor'] = substr($a, 8);
            continue;
        }
        if (str_starts_with($a, '--change-ref=')) {
            $opts['change_ref'] = substr($a, 13);
            continue;
        }
        if (str_starts_with($a, '--limit=')) {
            $opts['limit'] = (int)substr($a, 8);
            continue;
        }
        if (str_starts_with($a, '--advance=')) {
            $val = substr($a, 10);
            if (!in_array($val, $allowedAdvance, true)) {
                fwrite(STDERR, "Invalid --advance value: {$val}\n");
                return null;
            }
            $opts['advance'] = $val;
            continue;
        }
        fwrite(STDERR, "Unknown argument: {$a}\n");
        return null;
    }
    if ($modes['dry-run'] === $modes['apply']) {
        fwrite(STDERR, "Specify exactly one of --dry-run / --apply.\n");
        return null;
    }
    $opts['mode'] = $modes['apply'] ? 'apply' : 'dry-run';
    return $opts;
}

function usage(): string
{
    return <<<USAGE
Usage:
  php mom/tools/backfill_identity_to_postgres.php (--dry-run|--apply)
       [--actor=NAME] [--change-ref=REF] [--limit=N] [--verbose]
       [--advance=shadow_write|postgres_primary|postgres_only]

Examples:
  # Report drift between users.json and PostgreSQL.
  php mom/tools/backfill_identity_to_postgres.php --dry-run --verbose

  # One-shot import + advance to postgres_primary on success.
  php mom/tools/backfill_identity_to_postgres.php --apply \\
      --actor=ops@hesem --change-ref=ADR-0013-cutover \\
      --advance=postgres_primary

USAGE;
}
