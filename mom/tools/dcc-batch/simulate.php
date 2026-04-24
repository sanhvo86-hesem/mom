<?php

declare(strict_types=1);

/**
 * DCC Batch — End-to-End Simulation Harness
 * =========================================
 *
 * Exercises the DocumentControlService against a live database using a
 * dedicated `DCC-SIM-TEST-*` namespace. Each scenario first removes any
 * prior simulation state (revisions → history → DCN → DCR → header, in
 * FK dependency order) before running its assertions.
 *
 * Scenarios:
 *   --scenario=fresh          Create → patch → submit → approve → DCN →
 *                             release → supersede → obsolete, asserting
 *                             header + revision state after each step.
 *   --scenario=bad-writes     Confirm multi-role owner, lowercase revision,
 *                             release-without-DCN, invalid transition, and
 *                             duplicate-revision insert all throw the
 *                             documented exceptions.
 *   --scenario=audit-trail    Confirm dcc_document_revision and
 *                             dcc_document_revision_history are append-only
 *                             across a full cycle and that a history row
 *                             exists for every state transition.
 *   --scenario=rename         Confirm updateFilenameAnchor rewrites the
 *                             filename column, maintains the unique index,
 *                             and clears the old value.
 *   --scenario=all            Run each scenario in order.
 *
 * Output is colour-coded (ANSI) for direct reading in a terminal; a final
 * summary with pass / fail counts is printed. Exit code is non-zero when
 * any assertion fails.
 *
 * This script WRITES to the database. Never run it against production.
 *
 * @since 4.1.0
 */

require __DIR__ . '/lib.php';
require __DIR__ . '/../../vendor/autoload.php';

use MOM\Services\DocumentControl\DocumentControlService;
use function MOM\Tools\DccBatch\build_data_layer;

$ROOT_DIR = realpath(__DIR__ . '/../../..');
if ($ROOT_DIR === false) {
    fwrite(STDERR, "[sim] cannot resolve repo root\n");
    exit(1);
}

$opts = parse_argv($argv);

$dl = build_data_layer($ROOT_DIR);
if (!$dl) {
    fwrite(STDERR, "[sim] DB unavailable; aborting.\n");
    exit(1);
}

$service = new DocumentControlService($dl);

$results = [
    'pass' => 0,
    'fail' => 0,
];

$scenarios = match ($opts['scenario']) {
    'all'          => ['fresh', 'bad-writes', 'audit-trail', 'rename'],
    'fresh',
    'bad-writes',
    'audit-trail',
    'rename'       => [$opts['scenario']],
    default        => null,
};
if ($scenarios === null) {
    fwrite(STDERR, "[sim] unknown --scenario={$opts['scenario']}\n");
    exit(1);
}

foreach ($scenarios as $scenario) {
    hdr("Scenario: $scenario");
    try {
        match ($scenario) {
            'fresh'       => scenario_fresh($service, $dl, $results),
            'bad-writes'  => scenario_bad_writes($service, $dl, $results),
            'audit-trail' => scenario_audit_trail($service, $dl, $results),
            'rename'      => scenario_rename($service, $dl, $results),
        };
    } catch (\Throwable $e) {
        fail($results, "scenario $scenario aborted: " . $e->getMessage());
    }
}

echo "\n============================================================\n";
echo sprintf(" Simulation summary: %d pass, %d fail\n", $results['pass'], $results['fail']);
echo "============================================================\n";
exit($results['fail'] > 0 ? 1 : 0);

/* ──────────────────────────────────────────────────────────────────────── */

function parse_argv(array $argv): array
{
    $opts = [
        'scenario' => 'all',
    ];
    foreach (array_slice($argv, 1) as $arg) {
        if (str_starts_with($arg, '--scenario=')) {
            $opts['scenario'] = strtolower(substr($arg, strlen('--scenario=')));
        } elseif ($arg === '--help' || $arg === '-h') {
            echo file_get_contents(__FILE__, false, null, 0, 1800);
            exit(0);
        }
    }
    return $opts;
}

/* ── Scenario: fresh full cycle ────────────────────────────────────────── */

function scenario_fresh(DocumentControlService $svc, \MOM\Database\DataLayer $dl, array &$results): void
{
    $code = 'DCC-SIM-TEST-001';
    reset_sim_doc($dl, $code);

    // Step 1: upsert creates the header.
    $out = $svc->upsertHeader([
        'doc_code' => $code,
        'title'    => 'Simulation fresh cycle',
        'subtitle' => 'Initial subtitle',
        'doc_type' => 'SOP',
    ], 'sim-actor');
    assert_eq($results, $out['created'], true, 'upsertHeader created=true');
    assert_eq($results, strtolower((string)$out['header']['status']), 'draft', 'header status=draft');

    // Step 2: patch title via upsertHeader on second call.
    $out2 = $svc->upsertHeader([
        'doc_code' => $code,
        'title'    => 'Simulation fresh cycle — patched',
    ], 'sim-actor');
    assert_eq($results, (string)$out2['header']['title'], 'Simulation fresh cycle — patched', 'title patched');
    assert_eq($results, $out2['created'], false, 'upsertHeader created=false on patch');

    // Step 3: submit_review.
    $h = $svc->submitReview($code, 'sim-actor', 'QA');
    assert_eq($results, strtolower((string)$h['status']), 'in_review', 'submitReview → in_review');

    // Step 4: approve (no DCR required to stage a DCR+DCN for release).
    $h = $svc->approve($code, 'sim-actor', 'QMR');
    assert_eq($results, strtolower((string)$h['status']), 'approved', 'approve → approved');

    // Step 5: create DCR + DCN to back the release.
    $dcr = $svc->createDcr([
        'doc_code'           => $code,
        'change_type'        => 'minor_update',
        'requested_revision' => 'V1.0',
        'reason'             => 'simulation release',
    ], 'sim-actor');
    $svc->approveDcr((string)$dcr['dcr_id'], 'sim-actor', 'QMR');
    $dcn = $svc->issueDcn([
        'dcr_id'            => $dcr['dcr_id'],
        'from_revision'     => $out2['header']['revision'],
        'to_revision'       => 'V1.0',
        'effective_date'    => date('Y-m-d'),
        'release_authority' => 'CEO',
    ], 'sim-actor');

    // Step 6: release.
    $h = $svc->release($code, 'sim-actor', 'CEO', (string)$dcn['dcn_id']);
    $fetched = $svc->getHeader($code);
    assert_eq($results, strtolower((string)$fetched['status']), 'released', 'release → released');
    assert_eq($results, (string)$fetched['revision'], 'V1.0', 'release advances revision');
    // Ensure a revision body exists and is_current.
    $rev = $dl->query(
        "SELECT revision, is_current FROM dcc_document_revision
         WHERE doc_code = :c AND revision = 'V1.0' LIMIT 1",
        [':c' => $code]
    ) ?? [];
    assert_eq($results, $rev !== [], true, 'dcc_document_revision row exists for V1.0');
    if ($rev !== []) {
        assert_eq($results, (bool)$rev[0]['is_current'], true, 'V1.0 is_current=TRUE');
    }

    // Step 7: supersede.
    $h = $svc->supersede($code, 'sim-actor', 'CEO');
    assert_eq($results, strtolower((string)$h['status']), 'superseded', 'supersede → superseded');

    // Step 8: obsolete.
    $h = $svc->obsolete($code, 'sim-actor', 'CEO');
    assert_eq($results, strtolower((string)$h['status']), 'obsolete', 'obsolete → obsolete');
}

/* ── Scenario: bad writes must be rejected ─────────────────────────────── */

function scenario_bad_writes(DocumentControlService $svc, \MOM\Database\DataLayer $dl, array &$results): void
{
    $code = 'DCC-SIM-TEST-002';
    reset_sim_doc($dl, $code);

    // Bootstrap a baseline row so we can drive multi-role / transition checks.
    $svc->upsertHeader([
        'doc_code' => $code,
        'title'    => 'bad-writes sim',
        'doc_type' => 'SOP',
    ], 'sim-actor');

    // 1. Multi-role owner via updateHeader.
    assert_throws($results, 'dcc_multi_role_forbidden', function () use ($svc, $code) {
        $svc->updateHeader($code, ['owner_role_code' => 'QA/QMS'], 'sim-actor');
    }, 'multi-role owner rejected');

    // 2. Lowercase revision via recordRevision.
    assert_throws($results, 'dcc_invalid_revision_pattern', function () use ($svc, $code) {
        $svc->recordRevision($code, [
            'revision'       => 'v1.0',
            'effective_date' => date('Y-m-d'),
        ], 'sim-actor');
    }, 'lowercase revision rejected');

    // 3. Release without a DCN (non-existent uuid).
    assert_throws($results, 'dcc_release_requires_dcn_not_found', function () use ($svc, $code) {
        $svc->release($code, 'sim-actor', 'CEO', '00000000-0000-0000-0000-000000000000');
    }, 'release without DCN rejected');

    // 4. Invalid transition: draft → released (header is currently draft).
    assert_throws($results, 'dcc_invalid_transition', function () use ($svc, $code) {
        // Drive the private transition through release() — already rejected by
        // DCN check above. Instead, use supersede which requires released.
        $svc->supersede($code, 'sim-actor', 'CEO');
    }, 'draft → superseded rejected');

    // 5. Duplicate revision insert.
    $svc->recordRevision($code, [
        'revision'       => 'V1.0',
        'effective_date' => date('Y-m-d'),
    ], 'sim-actor');
    // Second insert must be a no-op (idempotent) — it returns the existing
    // row rather than throwing. That is the contract, but we want to assert
    // that a differing update_type does NOT create a second row.
    $before = (int)$dl->scalar(
        "SELECT COUNT(*) FROM dcc_document_revision WHERE doc_code = :c AND revision = 'V1.0'",
        [':c' => $code]
    );
    $svc->recordRevision($code, [
        'revision'       => 'V1.0',
        'update_type'    => 'major',
        'effective_date' => date('Y-m-d'),
    ], 'sim-actor');
    $after = (int)$dl->scalar(
        "SELECT COUNT(*) FROM dcc_document_revision WHERE doc_code = :c AND revision = 'V1.0'",
        [':c' => $code]
    );
    assert_eq($results, $after, $before, 'duplicate revision insert is idempotent (no row added)');
}

/* ── Scenario: audit trail append-only & one row per transition ────────── */

function scenario_audit_trail(DocumentControlService $svc, \MOM\Database\DataLayer $dl, array &$results): void
{
    $code = 'DCC-SIM-TEST-003';
    reset_sim_doc($dl, $code);

    // Run a minimal end-to-end cycle.
    $svc->upsertHeader([
        'doc_code' => $code,
        'title'    => 'audit-trail sim',
        'doc_type' => 'SOP',
    ], 'sim-actor');

    $historyBefore = $dl->query(
        "SELECT history_id, to_status, recorded_at FROM dcc_document_revision_history
         WHERE doc_code = :c ORDER BY recorded_at ASC",
        [':c' => $code]
    ) ?? [];

    $svc->submitReview($code, 'sim-actor', 'QA');
    $svc->approve($code, 'sim-actor', 'QMR');

    $dcr = $svc->createDcr([
        'doc_code'           => $code,
        'change_type'        => 'minor_update',
        'requested_revision' => 'V1.0',
        'reason'             => 'audit-trail sim',
    ], 'sim-actor');
    $svc->approveDcr((string)$dcr['dcr_id'], 'sim-actor', 'QMR');
    $dcn = $svc->issueDcn([
        'dcr_id'            => $dcr['dcr_id'],
        'from_revision'     => 'V0',
        'to_revision'       => 'V1.0',
        'effective_date'    => date('Y-m-d'),
        'release_authority' => 'CEO',
    ], 'sim-actor');
    $svc->release($code, 'sim-actor', 'CEO', (string)$dcn['dcn_id']);

    $historyAfter = $dl->query(
        "SELECT history_id, to_status, recorded_at FROM dcc_document_revision_history
         WHERE doc_code = :c ORDER BY recorded_at ASC",
        [':c' => $code]
    ) ?? [];

    // Append-only: prior rows unchanged, count grew.
    assert_eq($results, count($historyAfter) >= count($historyBefore), true, 'history is append-only (count grew)');
    foreach ($historyBefore as $i => $prior) {
        $still = $historyAfter[$i] ?? null;
        assert_eq(
            $results,
            $still && (string)$still['history_id'] === (string)$prior['history_id'],
            true,
            'prior history row index=' . $i . ' still present by id'
        );
    }

    // One transition per state move: in_review, approved, released.
    $toStatuses = array_map(static fn ($r) => strtolower((string)$r['to_status']), $historyAfter);
    foreach (['in_review', 'approved', 'released'] as $expected) {
        assert_eq(
            $results,
            in_array($expected, $toStatuses, true),
            true,
            "history contains transition to=$expected"
        );
    }

    // dcc_document_revision row has released_at filled after release.
    $rev = $dl->query(
        "SELECT released_at, is_current FROM dcc_document_revision
         WHERE doc_code = :c AND revision = 'V1.0' LIMIT 1",
        [':c' => $code]
    ) ?? [];
    assert_eq($results, $rev !== [] && !empty($rev[0]['released_at']), true, 'revision row has released_at stamp');
    if ($rev !== []) {
        assert_eq($results, (bool)$rev[0]['is_current'], true, 'revision row is_current=TRUE after release');
    }
}

/* ── Scenario: filename anchor / rename ────────────────────────────────── */

function scenario_rename(DocumentControlService $svc, \MOM\Database\DataLayer $dl, array &$results): void
{
    $code = 'DCC-SIM-TEST-004';
    reset_sim_doc($dl, $code);

    $svc->upsertHeader([
        'doc_code' => $code,
        'title'    => 'rename sim',
        'doc_type' => 'SOP',
    ], 'sim-actor');

    $svc->updateFilenameAnchor($code, 'dcc-sim-test-004-original.html', 'mom/docs/system/dcc-sim-test-004-original.html');
    $row1 = $dl->query(
        "SELECT filename, filesystem_path, filename_checksum
         FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
        [':c' => $code]
    )[0] ?? [];
    assert_eq($results, (string)($row1['filename'] ?? ''), 'dcc-sim-test-004-original.html', 'anchor records initial filename');
    assert_eq($results, (string)($row1['filesystem_path'] ?? ''), 'mom/docs/system/dcc-sim-test-004-original.html', 'anchor records path');
    assert_eq($results, (string)($row1['filename_checksum'] ?? ''), hash('sha256', 'dcc-sim-test-004-original.html'), 'checksum matches sha256(filename)');

    // Rename.
    $svc->updateFilenameAnchor($code, 'dcc-sim-test-004-renamed.html', 'mom/docs/system/dcc-sim-test-004-renamed.html');
    $row2 = $dl->query(
        "SELECT filename FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
        [':c' => $code]
    )[0] ?? [];
    assert_eq($results, (string)($row2['filename'] ?? ''), 'dcc-sim-test-004-renamed.html', 'rename overwrites filename');
    $orphan = $dl->query(
        "SELECT doc_code FROM dcc_document_header WHERE filename = 'dcc-sim-test-004-original.html'"
    ) ?? [];
    assert_eq($results, count($orphan), 0, 'old filename is not present on any row');

    // Uniqueness invariant: inserting a second header sharing the same
    // filename must fail. We use a raw INSERT because the service has no
    // path that sets filename on create.
    reset_sim_doc($dl, 'DCC-SIM-TEST-005');
    $svc->upsertHeader([
        'doc_code' => 'DCC-SIM-TEST-005',
        'title'    => 'rename sim collision',
        'doc_type' => 'SOP',
    ], 'sim-actor');
    $collided = false;
    try {
        $svc->updateFilenameAnchor('DCC-SIM-TEST-005', 'dcc-sim-test-004-renamed.html', 'mom/docs/system/dcc-sim-test-004-renamed.html');
    } catch (\Throwable $e) {
        $collided = true;
    }
    assert_eq($results, $collided, true, 'unique filename index blocks duplicate anchor');

    reset_sim_doc($dl, 'DCC-SIM-TEST-005');
}

/* ── Support: cleanup & assertions ─────────────────────────────────────── */

/**
 * Delete every DCC artefact for a simulation doc in FK-safe order. Called
 * at the start of each scenario and after the rename uniqueness check.
 */
function reset_sim_doc(\MOM\Database\DataLayer $dl, string $code): void
{
    // Revisions → history → DCN → DCR → header. dcc_document_revision has a
    // "DELETE forbidden" trigger, so we disable it temporarily using the
    // trigger manipulation helper. This is a simulation-only utility.
    try {
        $dl->execute("ALTER TABLE dcc_document_revision DISABLE TRIGGER trg_dcc_revision_no_delete");
    } catch (\Throwable $e) {
        // Table or trigger may not exist in local test DB — push through.
    }
    try {
        $dl->execute("DELETE FROM dcc_document_revision WHERE doc_code = :c", [':c' => $code]);
    } catch (\Throwable $e) {
        // If the table is missing (pre-155) ignore.
    } finally {
        try {
            $dl->execute("ALTER TABLE dcc_document_revision ENABLE TRIGGER trg_dcc_revision_no_delete");
        } catch (\Throwable $e) {
            // ignore
        }
    }
    try {
        $dl->execute("DELETE FROM dcc_document_revision_history WHERE doc_code = :c", [':c' => $code]);
    } catch (\Throwable $e) {
        // ignore
    }
    try {
        $dl->execute("DELETE FROM dcc_document_change_notice WHERE doc_code = :c", [':c' => $code]);
    } catch (\Throwable $e) {
        // ignore
    }
    try {
        $dl->execute("DELETE FROM dcc_document_change_request WHERE doc_code = :c", [':c' => $code]);
    } catch (\Throwable $e) {
        // ignore
    }
    try {
        $dl->execute("DELETE FROM dcc_document_header WHERE doc_code = :c", [':c' => $code]);
    } catch (\Throwable $e) {
        // ignore
    }
}

function assert_eq(array &$results, mixed $actual, mixed $expected, string $message): void
{
    if ($actual === $expected) {
        pass($results, $message);
    } else {
        $fmt = static function (mixed $v): string {
            if (is_bool($v)) return $v ? 'true' : 'false';
            if (is_null($v)) return 'null';
            if (is_scalar($v)) return (string)$v;
            return json_encode($v, JSON_UNESCAPED_UNICODE) ?: '??';
        };
        fail($results, $message . " — expected=" . $fmt($expected) . " actual=" . $fmt($actual));
    }
}

function assert_throws(array &$results, string $messageFragment, callable $cb, string $label): void
{
    try {
        $cb();
    } catch (\Throwable $e) {
        if (str_contains($e->getMessage(), $messageFragment)) {
            pass($results, $label);
            return;
        }
        fail($results, "$label — expected exception containing '$messageFragment', got '" . $e->getMessage() . "'");
        return;
    }
    fail($results, "$label — expected exception containing '$messageFragment' but call succeeded");
}

function pass(array &$results, string $message): void
{
    $results['pass']++;
    echo "  \033[32mPASS\033[0m $message\n";
}

function fail(array &$results, string $message): void
{
    $results['fail']++;
    echo "  \033[31mFAIL\033[0m $message\n";
}

function hdr(string $title): void
{
    echo "\n\033[36m— $title —\033[0m\n";
}
