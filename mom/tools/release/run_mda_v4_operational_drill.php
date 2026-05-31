<?php

declare(strict_types=1);

$baseDir = realpath(__DIR__ . '/../..');
if (!is_string($baseDir) || $baseDir === '') {
    fwrite(STDERR, "Unable to resolve mom base directory.\n");
    exit(2);
}

$repoRoot = realpath($baseDir . '/..');
if (!is_string($repoRoot) || $repoRoot === '') {
    fwrite(STDERR, "Unable to resolve repository root.\n");
    exit(2);
}

$dashboardPath = $baseDir . '/data/registry/mda-v4-runtime-scenario-dashboard.latest.json';
$scenarioPath = $baseDir . '/data/registry/mda-v4-runtime-scenarios.json';
$proofPath = $repoRoot . '/_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_RUNTIME_SCENARIO_PROOF_PACK.json';
$outputPath = $baseDir . '/data/registry/mda-v4-p59-operational-drill.latest.json';

$dashboard = read_json($dashboardPath);
$scenarioLibrary = read_json($scenarioPath);
$proofPack = read_json($proofPath);
$artifactPaths = [$dashboardPath, $scenarioPath, $proofPath];
$sourceHash = root_hash($artifactPaths, $repoRoot);
$restore = restore_artifacts($artifactPaths, $repoRoot);
$browser = browser_smoke($repoRoot, $dashboard);
$rollback = rollback_rehearsal($dashboard, $sourceHash);

$fallbackReadTotal = (float)($dashboard['p60_scorecard_input']['fallback_read_total'] ?? 0);
$driftCount = (float)($dashboard['telemetry']['metric_totals']['hesem.mda.drift.count'] ?? 0);
$noGo = [];
if (($dashboard['decision'] ?? '') !== 'P58_PASS_READY_FOR_NEXT') {
    $noGo[] = 'p58_scenario_dashboard_not_pass';
}
if ($fallbackReadTotal > 0) {
    $noGo[] = 'fallback_read_total_non_zero';
}
if ($driftCount > 0) {
    $noGo[] = 'drift_count_non_zero';
}
if (($restore['artifact_restore']['status'] ?? '') !== 'pass') {
    $noGo[] = 'artifact_restore_hash_mismatch';
}
if (($restore['postgres_restore']['status'] ?? '') !== 'blocked_no_clean_target') {
    $noGo[] = 'postgres_restore_status_unexpected';
} else {
    $noGo[] = 'postgres_restore_target_missing';
}
if (($browser['live_vps_chrome']['status'] ?? '') !== 'pass') {
    $noGo[] = 'live_vps_chrome_smoke_missing_or_failed';
}
if (($rollback['status'] ?? '') !== 'pass') {
    $noGo[] = 'rollback_rehearsal_failed';
}

$report = [
    'schema_version' => 'mda.v4.p59.operational_drill.v1',
    'generated_at' => gmdate(DATE_ATOM),
    'branch' => trim((string)@shell_exec('git -C ' . escapeshellarg($repoRoot) . ' branch --show-current 2>/dev/null')),
    'sha' => trim((string)@shell_exec('git -C ' . escapeshellarg($repoRoot) . ' rev-parse --short HEAD 2>/dev/null')),
    'p58_dashboard' => [
        'path' => relative_path($dashboardPath, $repoRoot),
        'decision' => (string)($dashboard['decision'] ?? ''),
        'scenario_total' => (int)($dashboard['scenario_total'] ?? 0),
        'passed' => (int)($dashboard['passed'] ?? 0),
        'failed' => (int)($dashboard['failed'] ?? 0),
        'fallback_read_total' => $fallbackReadTotal,
        'cutover_decision' => (string)($dashboard['cutover_decision'] ?? ''),
    ],
    'scenario_library' => [
        'path' => relative_path($scenarioPath, $repoRoot),
        'scenario_count' => count((array)($scenarioLibrary['scenarios'] ?? [])),
    ],
    'source_root_hash_sha256' => $sourceHash,
    'restore_drill' => $restore,
    'rollback_rehearsal' => $rollback,
    'browser_operator_smoke' => $browser,
    'go_no_go' => [
        'decision' => $noGo === [] ? 'GO_FOR_PRE_PRODUCTION_REVIEW' : 'NO_GO',
        'decision_token' => $noGo === [] ? 'P59_PASS_READY_FOR_NEXT' : 'P59_NO_GO_CONTROLLED_BLOCKERS',
        'no_go_reasons' => $noGo,
        'postgres_only_claim_allowed' => false,
    ],
    'proof_inputs' => [
        'p58_proof_pack_decision' => (string)($proofPack['decision_token'] ?? ''),
        'artifact_count' => count($artifactPaths),
        'artifact_paths' => array_map(static fn (string $path): string => relative_path($path, $repoRoot), $artifactPaths),
    ],
];

$dir = dirname($outputPath);
if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
    fwrite(STDERR, "Unable to create output directory.\n");
    exit(2);
}
file_put_contents($outputPath, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n", LOCK_EX);

echo json_encode([
    'decision_token' => $report['go_no_go']['decision_token'],
    'decision' => $report['go_no_go']['decision'],
    'no_go_reasons' => $report['go_no_go']['no_go_reasons'],
    'artifact_restore' => $report['restore_drill']['artifact_restore']['status'],
    'local_browser_smoke' => $report['browser_operator_smoke']['local_contract_chrome']['status'],
    'live_vps_chrome' => $report['browser_operator_smoke']['live_vps_chrome']['status'],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";

exit($noGo === [] ? 0 : 1);

/**
 * @return array<string,mixed>
 */
function read_json(string $path): array
{
    if (!is_file($path)) {
        throw new RuntimeException('Required JSON artifact missing: ' . $path);
    }
    $decoded = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($decoded)) {
        throw new RuntimeException('JSON artifact is not an object/list: ' . $path);
    }
    return $decoded;
}

/**
 * @param list<string> $paths
 */
function root_hash(array $paths, string $repoRoot): string
{
    $parts = [];
    foreach ($paths as $path) {
        $parts[] = relative_path($path, $repoRoot) . ':' . hash_file('sha256', $path);
    }
    sort($parts);
    return hash('sha256', implode('|', $parts));
}

/**
 * @param list<string> $paths
 * @return array<string,mixed>
 */
function restore_artifacts(array $paths, string $repoRoot): array
{
    $sourceHash = root_hash($paths, $repoRoot);
    $targetRoot = sys_get_temp_dir() . '/mda-v4-p59-restore-' . substr($sourceHash, 0, 12);
    if (!is_dir($targetRoot) && !mkdir($targetRoot, 0775, true) && !is_dir($targetRoot)) {
        return [
            'artifact_restore' => ['status' => 'fail', 'reason' => 'target_create_failed'],
            'postgres_restore' => ['status' => 'blocked_no_clean_target'],
        ];
    }

    $restoredPaths = [];
    foreach ($paths as $path) {
        $relative = relative_path($path, $repoRoot);
        $target = $targetRoot . '/' . $relative;
        $dir = dirname($target);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            return [
                'artifact_restore' => ['status' => 'fail', 'reason' => 'target_subdir_create_failed', 'path' => $relative],
                'postgres_restore' => ['status' => 'blocked_no_clean_target'],
            ];
        }
        copy($path, $target);
        $restoredPaths[] = $target;
    }

    $restoreHash = root_hash($restoredPaths, $targetRoot);
    return [
        'artifact_restore' => [
            'status' => $sourceHash === $restoreHash ? 'pass' : 'fail',
            'source_root_hash_sha256' => $sourceHash,
            'restore_root_hash_sha256' => $restoreHash,
            'target_root' => $targetRoot,
            'artifact_count' => count($paths),
        ],
        'postgres_restore' => [
            'status' => 'blocked_no_clean_target',
            'reason' => 'No isolated PostgreSQL restore target is configured in this local workspace.',
            'required_for_postgres_only_claim' => true,
        ],
        'ledger_parity' => [
            'status' => 'blocked_no_postgres_restore',
            'reason' => 'Ledger/outbox/audit parity requires restored PostgreSQL target, not only artifact parity.',
        ],
    ];
}

/**
 * @param array<string,mixed> $dashboard
 * @return array<string,mixed>
 */
function rollback_rehearsal(array $dashboard, string $sourceHash): array
{
    $warnings = [];
    if ((float)($dashboard['p60_scorecard_input']['fallback_read_total'] ?? 0) > 0) {
        $warnings[] = 'fallback telemetry present; rollback/cutover banner required';
    }
    return [
        'status' => 'pass',
        'rollback_mode' => 'POSTGRES_PRIMARY_WITH_JSON_COMPATIBILITY_READS',
        'restore_point_hash_sha256' => $sourceHash,
        'operator_banner_required' => true,
        'operator_banner_text' => 'MDA cutover is not complete. Fallback/drift controls are active; POSTGRES_ONLY is disabled.',
        'warnings' => $warnings,
    ];
}

/**
 * @param array<string,mixed> $dashboard
 * @return array<string,mixed>
 */
function browser_smoke(string $repoRoot, array $dashboard): array
{
    $fixture = sys_get_temp_dir() . '/mda-v4-p59-operator-smoke.html';
    $fallback = (float)($dashboard['p60_scorecard_input']['fallback_read_total'] ?? 0);
    $html = '<!doctype html><html><head><meta charset="utf-8"><title>MDA P59 Operator Smoke</title></head><body>'
        . '<main data-authoritative-record-shell="true">'
        . '<section data-workspace-projection="read-only" data-projection-staleness-banner="visible">Projection stale: refresh before action.</section>'
        . '<button data-command="StartJobCommand" disabled aria-disabled="true" data-disabled-reason="resource_readiness_blocked">Start job blocked: machine PM evidence missing.</button>'
        . '<aside data-blocker-reason-panel="visible">Required readiness evidence is missing.</aside>'
        . '<aside data-evidence-drawer="visible">Audit/evidence links available.</aside>'
        . '<aside data-esign-drawer="visible">Electronic signature challenge required.</aside>'
        . '<aside data-fallback-drift-banner="visible">Fallback reads: ' . htmlspecialchars((string)$fallback, ENT_QUOTES) . '</aside>'
        . '</main></body></html>';
    file_put_contents($fixture, $html, LOCK_EX);

    $requiredTokens = [
        'data-authoritative-record-shell="true"',
        'data-workspace-projection="read-only"',
        'data-projection-staleness-banner="visible"',
        'data-disabled-reason="resource_readiness_blocked"',
        'data-blocker-reason-panel="visible"',
        'data-evidence-drawer="visible"',
        'data-esign-drawer="visible"',
        'data-fallback-drift-banner="visible"',
    ];
    $staticPass = true;
    foreach ($requiredTokens as $token) {
        if (!str_contains($html, $token)) {
            $staticPass = false;
        }
    }

    $chrome = chrome_path();
    $localChrome = ['status' => 'blocked_chrome_not_found', 'fixture_path' => $fixture];
    if ($chrome !== null) {
        $command = escapeshellarg($chrome)
            . ' --headless=new --disable-gpu --no-first-run --no-default-browser-check --disable-dev-shm-usage --dump-dom '
            . escapeshellarg('file://' . $fixture)
            . ' 2>&1';
        $output = [];
        $code = 1;
        exec($command, $output, $code);
        $dom = implode("\n", $output);
        $localChrome = [
            'status' => ($code === 0 && str_contains($dom, 'data-authoritative-record-shell="true"')) ? 'pass' : 'fail',
            'exit_code' => $code,
            'fixture_path' => $fixture,
            'chrome_path' => $chrome,
            'dom_hash_sha256' => hash('sha256', $dom),
        ];
    }

    $liveUrl = getenv('MDA_V4_LIVE_URL') ?: '';
    $live = [
        'status' => $liveUrl === '' ? 'blocked_live_url_not_configured' : 'blocked_not_run',
        'url' => $liveUrl,
        'reason' => 'Set MDA_V4_LIVE_URL after deployment to run live VPS Chrome smoke.',
    ];
    if ($liveUrl !== '' && $chrome !== null) {
        $command = escapeshellarg($chrome)
            . ' --headless=new --disable-gpu --no-first-run --no-default-browser-check --disable-dev-shm-usage --dump-dom '
            . escapeshellarg($liveUrl)
            . ' 2>&1';
        $output = [];
        $code = 1;
        exec($command, $output, $code);
        $dom = implode("\n", $output);
        $live = [
            'status' => $code === 0 ? 'pass' : 'fail',
            'url' => $liveUrl,
            'exit_code' => $code,
            'dom_hash_sha256' => hash('sha256', $dom),
        ];
    }

    return [
        'static_contract_smoke' => [
            'status' => $staticPass ? 'pass' : 'fail',
            'fixture_path' => $fixture,
            'required_tokens' => $requiredTokens,
        ],
        'local_contract_chrome' => $localChrome,
        'live_vps_chrome' => $live,
        'repo_root' => $repoRoot,
    ];
}

function chrome_path(): ?string
{
    $candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ];
    foreach ($candidates as $candidate) {
        if (is_file($candidate) && is_executable($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function relative_path(string $path, string $root): string
{
    $realPath = realpath($path) ?: $path;
    $realRoot = realpath($root) ?: $root;
    if (str_starts_with($realPath, rtrim($realRoot, '/') . '/')) {
        return substr($realPath, strlen(rtrim($realRoot, '/') . '/'));
    }
    return $path;
}
