<?php

declare(strict_types=1);

$repoRoot = realpath(__DIR__ . '/../../..');
if (!is_string($repoRoot) || $repoRoot === '') {
    fwrite(STDERR, "Unable to resolve repository root.\n");
    exit(2);
}

$baseDir = $repoRoot . '/mom';
$reportDir = $repoRoot . '/_reports/agent-audits/mda-v4-implementation-closure-2026-05-30';
$p58 = read_json($baseDir . '/data/registry/mda-v4-runtime-scenario-dashboard.latest.json');
$p59 = read_json($baseDir . '/data/registry/mda-v4-p59-operational-drill.latest.json');
$proof = read_json($reportDir . '/V4_RUNTIME_SCENARIO_PROOF_PACK.json');

$handoffs = [];
$missing = [];
for ($prompt = 42; $prompt <= 59; $prompt++) {
    $path = $reportDir . '/V4_PROMPT_HANDOFF_P' . $prompt . '.md';
    if (!is_file($path)) {
        $missing[] = relative_path($path, $repoRoot);
        continue;
    }
    $handoffs[] = [
        'prompt' => 'P' . $prompt,
        'path' => relative_path($path, $repoRoot),
        'sha256' => hash_file('sha256', $path),
    ];
}

$blockers = [];
foreach ((array)($p59['go_no_go']['no_go_reasons'] ?? []) as $reason) {
    $severity = in_array($reason, ['fallback_read_total_non_zero', 'postgres_restore_target_missing', 'live_vps_chrome_smoke_missing_or_failed'], true) ? 'P0' : 'P1';
    $blockers[] = [
        'blocker_id' => 'P60-' . strtoupper(str_replace('_', '-', (string)$reason)),
        'severity' => $severity,
        'status' => 'OPEN',
        'source' => 'P59 operational drill',
        'evidence' => (string)$reason,
    ];
}
if ($missing !== []) {
    $blockers[] = [
        'blocker_id' => 'P60-HANDOFF-EVIDENCE-MISSING',
        'severity' => 'P0',
        'status' => 'OPEN',
        'source' => 'P60 handoff audit',
        'evidence' => implode(';', $missing),
    ];
}
if (($proof['validation']['composer_test'] ?? '') !== 'PASS') {
    $blockers[] = [
        'blocker_id' => 'P60-FULL-PHPUNIT-BLOCKED',
        'severity' => 'P1',
        'status' => 'OPEN',
        'source' => 'P58 proof pack',
        'evidence' => (string)($proof['validation']['composer_test'] ?? 'unknown'),
    ];
}
if (($proof['validation']['composer_analyse'] ?? '') !== 'PASS') {
    $blockers[] = [
        'blocker_id' => 'P60-FULL-PHPSTAN-BLOCKED',
        'severity' => 'P1',
        'status' => 'OPEN',
        'source' => 'P58 proof pack',
        'evidence' => (string)($proof['validation']['composer_analyse'] ?? 'unknown'),
    ];
}

$p0 = count(array_filter($blockers, static fn (array $row): bool => ($row['severity'] ?? '') === 'P0'));
$p1 = count(array_filter($blockers, static fn (array $row): bool => ($row['severity'] ?? '') === 'P1'));
$decisionToken = ($p0 === 0 && $p1 === 0) ? 'P60_PASS_READY_FOR_CONTROLLED_INTEGRATION' : 'P60_NO_GO_REPAIR_REQUIRED';

$scorecard = [
    'schema_version' => 'mda.v4.final_redteam_scorecard.v1',
    'generated_at' => gmdate(DATE_ATOM),
    'branch' => trim((string)@shell_exec('git -C ' . escapeshellarg($repoRoot) . ' branch --show-current 2>/dev/null')),
    'sha' => trim((string)@shell_exec('git -C ' . escapeshellarg($repoRoot) . ' rev-parse --short HEAD 2>/dev/null')),
    'decision_token' => $decisionToken,
    'merge_readiness' => $decisionToken === 'P60_PASS_READY_FOR_CONTROLLED_INTEGRATION' ? 'controlled_integration_allowed' : 'blocked_no_go',
    'production_ready_claim_allowed' => false,
    'p0_open_count' => $p0,
    'p1_open_count' => $p1,
    'handoff_audit' => [
        'required_prompts' => 'P42-P59',
        'found_count' => count($handoffs),
        'missing' => $missing,
        'handoffs' => $handoffs,
    ],
    'evidence_inputs' => [
        'p58_decision' => (string)($p58['decision'] ?? ''),
        'p58_scenario_total' => (int)($p58['scenario_total'] ?? 0),
        'p58_failed' => (int)($p58['failed'] ?? 0),
        'p59_decision_token' => (string)($p59['go_no_go']['decision_token'] ?? ''),
        'fallback_read_total' => (float)($p59['p58_dashboard']['fallback_read_total'] ?? 0),
        'artifact_restore_status' => (string)($p59['restore_drill']['artifact_restore']['status'] ?? ''),
        'postgres_restore_status' => (string)($p59['restore_drill']['postgres_restore']['status'] ?? ''),
        'local_chrome_status' => (string)($p59['browser_operator_smoke']['local_contract_chrome']['status'] ?? ''),
        'live_vps_chrome_status' => (string)($p59['browser_operator_smoke']['live_vps_chrome']['status'] ?? ''),
    ],
    'category_scores' => [
        'authority_clarity' => 8,
        'mutation_safety' => 8,
        'command_runtime' => 8,
        'uom_direct_authority' => 9,
        'security_ai_sod' => 8,
        'regulated_evidence_esign' => 7,
        'quality_hold_eqms' => 8,
        'inventory_ledger_genealogy' => 8,
        'resource_readiness' => 8,
        'scenario_proof' => 8,
        'restore_proof' => 2,
        'browser_operator_proof' => 2,
        'observability_cutover' => 4
    ],
    'blockers' => $blockers,
];

$out = $reportDir . '/V4_FINAL_SCORECARD.json';
file_put_contents($out, json_encode($scorecard, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n", LOCK_EX);

echo json_encode([
    'decision_token' => $decisionToken,
    'merge_readiness' => $scorecard['merge_readiness'],
    'p0_open_count' => $p0,
    'p1_open_count' => $p1,
    'scorecard' => relative_path($out, $repoRoot),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";

exit($decisionToken === 'P60_PASS_READY_FOR_CONTROLLED_INTEGRATION' ? 0 : 1);

/**
 * @return array<string,mixed>
 */
function read_json(string $path): array
{
    if (!is_file($path)) {
        throw new RuntimeException('Missing required JSON evidence: ' . $path);
    }
    $decoded = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($decoded)) {
        throw new RuntimeException('Invalid JSON evidence: ' . $path);
    }
    return $decoded;
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
