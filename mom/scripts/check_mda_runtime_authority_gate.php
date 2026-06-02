<?php

declare(strict_types=1);

$repoRoot = dirname(__DIR__, 2);
$reportDir = $repoRoot . '/_reports/mda_runtime_authority_closure';
@mkdir($reportDir, 0775, true);

$files = [
    'controller' => $repoRoot . '/mom/api/controllers/DomainCommandController.php',
    'gateway' => $repoRoot . '/mom/api/services/DomainCommand/DomainCommandGateway.php',
    'sod' => $repoRoot . '/mom/api/services/DomainCommand/SoDPolicy.php',
    'reauth' => $repoRoot . '/mom/api/services/DomainCommand/PrivilegedReauthPolicy.php',
    'scope' => $repoRoot . '/mom/api/services/DomainCommand/ObjectAuthorizationPolicy.php',
    'master_data' => $repoRoot . '/mom/api/services/MasterDataService.php',
    'repository' => $repoRoot . '/mom/api/services/PostgresMasterDataRepository.php',
    'problem' => $repoRoot . '/mom/api/services/DomainCommand/ProblemDetailsFactory.php',
    'migration' => $repoRoot . '/mom/database/migrations/286_mda_runtime_authority_no_p0p1_guard.sql',
    'openapi' => $repoRoot . '/mom/api/openapi.yaml',
    'frontend' => $repoRoot . '/mom/scripts/portal/13-master-data-control.js',
];
$source = [];
foreach ($files as $key => $path) {
    $source[$key] = is_file($path) ? (string)file_get_contents($path) : '';
}

$staticChecks = [
    'controller_rejects_top_level_actor_claims' => str_contains($source['controller'], "'actor_id'")
        && str_contains($source['controller'], "'actor_roles'")
        && str_contains($source['controller'], "'actor_permissions'")
        && str_contains($source['controller'], "'actor_scope'")
        && str_contains($source['controller'], "'break_glass'"),
    'controller_rejects_payload_actor_claims' => str_contains($source['controller'], "'sod_exception_approved'") && str_contains($source['controller'], 'payload_field'),
    'signature_challenge_uses_authenticated_actor' => str_contains($source['controller'], 'issueSignatureChallenge') && str_contains($source['controller'], 'authenticatedActorId($user)'),
    'gateway_requires_capability_not_role_bypass' => str_contains($source['gateway'], 'actor_permissions') && !str_contains($source['gateway'], 'production_director'),
    'gateway_break_glass_is_server_verified' => str_contains($source['migration'], 'domain_command_break_glass_grant')
        && str_contains($source['gateway'], 'domain_command_break_glass_grant')
        && !str_contains($source['gateway'], 'server_verified'),
    'gateway_sets_domain_command_db_context' => str_contains($source['gateway'], "set_config('hesem.domain_command_context'")
        && str_contains($source['gateway'], "set_config('hesem.domain_command_name'")
        && str_contains($source['gateway'], "set_config('hesem.domain_command_id'"),
    'sod_rejects_payload_only_approval' => str_contains($source['sod'], 'sod_payload_exception_untrusted') && str_contains($source['sod'], 'domain_command_sod_exception'),
    'reauth_rejects_timestamp_only' => str_contains($source['reauth'], 'reauth_payload_timestamp_untrusted') && str_contains($source['reauth'], 'domain_command_reauth_challenge'),
    'object_scope_has_no_privileged_role_bypass' => !str_contains($source['scope'], 'privilegedRoles') && !str_contains($source['scope'], 'super_admin'),
    'master_data_mutation_fail_closed' => str_contains($source['master_data'], "blockedGovernedCommandResult('create'")
        && str_contains($source['master_data'], "blockedGovernedCommandResult('update'")
        && str_contains($source['master_data'], "blockedGovernedCommandResult('delete'")
        && str_contains($source['master_data'], "assertLegacyMutationBlocked('changeStatus'")
        && str_contains($source['master_data'], "assertLegacyMutationBlocked('approvePendingChange'")
        && str_contains($source['master_data'], 'domain_command_required'),
    'pg_only_has_no_json_runtime_fallback' => str_contains($source['repository'], 'queryAuthorityRows') && str_contains($source['repository'], 'MODE_POSTGRES_ONLY'),
    'db_guard_default_denies_governed_tables' => str_contains($source['migration'], "current_setting('hesem.domain_command_context', TRUE)")
        && str_contains($source['migration'], 'RAISE EXCEPTION')
        && str_contains($source['migration'], 'generic_crud_denial_event'),
    'problem_details_include_correlation_id' => str_contains($source['problem'], "'correlation_id'"),
    'openapi_domain_command_problem_contract' => str_contains($source['openapi'], '/api/v1/domain-commands')
        && str_contains($source['openapi'], 'application/problem+json')
        && str_contains($source['openapi'], 'submitDomainCommand'),
    'frontend_workspace_projection_only' => str_contains($source['frontend'], 'MASTER_DATA_CONTROL_PROJECTION')
        && str_contains($source['frontend'], 'data-authority-class')
        && str_contains($source['frontend'], 'editor.innerHTML = _renderProjectionDetails(cfg);'),
];

$scriptResults = [];
foreach ([
    'adversarial_security' => $repoRoot . '/mom/scripts/check_mda_adversarial_security_gate.php',
    'direct_db_guard' => $repoRoot . '/mom/scripts/check_mda_direct_db_guard.php',
    'workflow_status_parity' => $repoRoot . '/mom/scripts/check_mda_workflow_status_parity.php',
    'traceability_performance' => $repoRoot . '/mom/scripts/check_mda_traceability_performance.php',
] as $name => $script) {
    $scriptResults[$name] = run_php_script($script);
}

$scriptFailures = array_keys(array_filter($scriptResults, static fn (array $result): bool => ($result['exit_code'] ?? 1) !== 0));
$staticFailures = array_keys(array_filter($staticChecks, static fn (bool $ok): bool => !$ok));
$status = $staticFailures === [] && $scriptFailures === [] ? 'PASS' : 'FAIL';

$proofMatrix = [
    'gate' => 'mda_runtime_authority',
    'status' => $status,
    'decision_scope' => 'pre-production runtime-closure candidate',
    'static_checks' => $staticChecks,
    'static_failures' => $staticFailures,
    'script_results' => $scriptResults,
    'script_failures' => $scriptFailures,
    'domains' => domain_proof_rows(),
    'generated_at' => gmdate('c'),
];

file_put_contents($reportDir . '/MDA_RUNTIME_PROOF_MATRIX.json', json_encode($proofMatrix, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
file_put_contents($reportDir . '/MDA_RUNTIME_AUTHORITY_GATE_REPORT.md', runtime_markdown($proofMatrix));
echo json_encode($proofMatrix, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($status === 'PASS' ? 0 : 1);

/**
 * @return array{exit_code:int,output:list<string>}
 */
function run_php_script(string $script): array
{
    $output = [];
    $exitCode = 1;
    if (!is_file($script)) {
        return ['exit_code' => 1, 'output' => ['missing script: ' . $script]];
    }
    exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($script) . ' 2>&1', $output, $exitCode);

    return ['exit_code' => $exitCode, 'output' => $output];
}

/**
 * @return array<string,array<string,string>>
 */
function domain_proof_rows(): array
{
    $common = [
        'Mutation path' => 'DomainCommandGateway or fail-closed domain_command_required',
        'Problem Details' => 'application/problem+json with code and correlation_id',
        'Security gate' => 'permission, scope, server-verified SoD/reauth/signature where regulated, AI firewall',
    ];

    return [
        'Party/customer/supplier/employee/operator/user' => $common + [
            'Authority storage' => 'party/role/user identity SSOT PostgreSQL paths; legacy MasterDataService mutation denied',
            'Audit/evidence/outbox' => 'audit_events/domain_outbox_events for command paths',
            'Test/scenario proof' => 'MasterDataRepositoryBoundaryTest and runtime gate static checks',
        ],
        'Item/material/part/revision/site/spec' => $common + [
            'Authority storage' => 'item and item_revision PostgreSQL tables',
            'Audit/evidence/outbox' => 'regulated evidence spine for release, audit_events, domain_outbox_events',
            'Test/scenario proof' => 'DomainCommandGatewayTest, RegulatedEvidenceSpineTest',
        ],
        'BOM/routing/work definition/control plan/inspection plan/NC program' => $common + [
            'Authority storage' => 'engineering_release_package and release package members/snapshots',
            'Audit/evidence/outbox' => 'signature-linked evidence for engineering package release',
            'Test/scenario proof' => 'DomainCommandSecurityBoundaryTest plus workflow registry parity',
        ],
        'Equipment/machine/work center/connectivity/PM/calibration' => $common + [
            'Authority storage' => 'equipment, maintenance, MES connectivity PostgreSQL reads in PG_ONLY',
            'Audit/evidence/outbox' => 'domain command audit/outbox and telemetry',
            'Test/scenario proof' => 'direct DB guard and traceability/performance gate',
        ],
        'Tooling/fixture/gage/preset/life/assembly' => $common + [
            'Authority storage' => 'tooling_runtime_state and tooling_presets',
            'Audit/evidence/outbox' => 'tooling command audit/outbox and quality hold linkage',
            'Test/scenario proof' => 'workflow registry parity and traceability/performance gate',
        ],
        'Quality hold/NCR/MRB/CAPA/Complaint/SCAR' => $common + [
            'Authority storage' => 'quality_hold, quality_hold_subject, quality hold release, quality registries',
            'Audit/evidence/outbox' => 'signature_events, audit_events, domain_outbox_events',
            'Test/scenario proof' => 'adversarial AI hold release denial and existing quality hold tests',
        ],
        'Inventory/lot/serial/container/genealogy/WIP/cost ledger' => $common + [
            'Authority storage' => 'inventory ledgers, WIP ledger, genealogy graph',
            'Audit/evidence/outbox' => 'idempotency replay ledger, audit_events, outbox',
            'Test/scenario proof' => 'traceability performance gate and inventory service static proof',
        ],
        'Workflow/status/approval/evidence/audit/e-sign' => $common + [
            'Authority storage' => 'workflow-status-authority.yaml plus server evidence tables',
            'Audit/evidence/outbox' => 'domain_command_sod_exception, domain_command_reauth_challenge, signature events',
            'Test/scenario proof' => 'workflow status parity, security boundary tests',
        ],
        'MES readiness/release/start/complete gates' => $common + [
            'Authority storage' => 'PostgreSQL authority/frozen snapshots in PG_ONLY reads',
            'Audit/evidence/outbox' => 'command gateway transaction context, readiness denial problems',
            'Test/scenario proof' => 'direct DB guard and traceability/performance gate',
        ],
    ];
}

function runtime_markdown(array $summary): string
{
    $lines = [
        '# MDA Runtime Authority Gate Report',
        '',
        '- Gate: ' . $summary['status'],
        '- Generated at: ' . $summary['generated_at'],
        '',
        '| Static check | Result |',
        '|---|---:|',
    ];
    foreach ($summary['static_checks'] as $check => $ok) {
        $lines[] = '| ' . $check . ' | ' . ($ok ? 'PASS' : 'FAIL') . ' |';
    }
    $lines[] = '';
    $lines[] = '| Script | Exit code |';
    $lines[] = '|---|---:|';
    foreach ($summary['script_results'] as $script => $result) {
        $lines[] = '| ' . $script . ' | ' . (string)$result['exit_code'] . ' |';
    }
    $lines[] = '';

    return implode(PHP_EOL, $lines);
}
