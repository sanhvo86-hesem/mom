<?php

declare(strict_types=1);

$repoRoot = dirname(__DIR__, 2);
$reportDir = $repoRoot . '/_reports/mda_runtime_authority_closure';
@mkdir($reportDir, 0775, true);

$migration = file_get_contents(__DIR__ . '/../database/migrations/286_mda_runtime_authority_no_p0p1_guard.sql') ?: '';
$repository = file_get_contents(__DIR__ . '/../api/services/PostgresMasterDataRepository.php') ?: '';
$gateway = file_get_contents(__DIR__ . '/../api/services/DomainCommand/DomainCommandGateway.php') ?: '';
$masterDataService = file_get_contents(__DIR__ . '/../api/services/MasterDataService.php') ?: '';
$controller = file_get_contents(__DIR__ . '/../api/controllers/DomainCommandController.php') ?: '';
$frontend = file_get_contents(__DIR__ . '/portal/13-master-data-control.js') ?: '';

$checks = [
    'universal_guard_reads_domain_context' => str_contains($migration, "current_setting('hesem.domain_command_context', TRUE)"),
    'universal_guard_requires_command_name' => str_contains($migration, "current_setting('hesem.domain_command_name', TRUE)"),
    'universal_guard_requires_command_id' => str_contains($migration, "current_setting('hesem.domain_command_id', TRUE)"),
    'break_glass_requires_server_store' => str_contains($migration, 'domain_command_break_glass_grant')
        && str_contains($gateway, 'domain_command_break_glass_grant')
        && !str_contains($gateway, '$approved = filter_var($breakGlass'),
    'generic_crud_context_still_denied' => str_contains($migration, "v_generic_context <> '1'"),
    'gateway_sets_domain_context' => str_contains($gateway, "set_config('hesem.domain_command_context'"),
    'gateway_sets_command_name' => str_contains($gateway, "set_config('hesem.domain_command_name'"),
    'gateway_sets_command_id' => str_contains($gateway, "set_config('hesem.domain_command_id'"),
    'repository_no_delete_all_master_data_store' => !preg_match('/DELETE\s+FROM\s+master_data_store/i', $repository),
    'repository_no_delete_all_history' => !preg_match('/DELETE\s+FROM\s+master_data_history_event/i', $repository),
    'repository_no_delete_all_pending' => !preg_match('/DELETE\s+FROM\s+master_data_pending_change/i', $repository),
    'repository_no_delete_all_archive' => !preg_match('/DELETE\s+FROM\s+master_data_archive_store/i', $repository),
    'pg_only_orders_read_pg' => str_contains($repository, "MODE_POSTGRES_ONLY") && str_contains($repository, "queryAuthorityRows('sales_orders')"),
    'pg_only_mes_runtime_read_pg' => str_contains($repository, "queryAuthorityRows('mes_connectivity_events')"),
    'master_data_service_legacy_mutation_denied' => str_contains($masterDataService, "blockedGovernedCommandResult('create'")
        && str_contains($masterDataService, "blockedGovernedCommandResult('update'")
        && str_contains($masterDataService, "blockedGovernedCommandResult('delete'")
        && str_contains($masterDataService, "assertLegacyMutationBlocked('changeStatus'")
        && str_contains($masterDataService, "assertLegacyMutationBlocked('approvePendingChange'")
        && str_contains($masterDataService, 'domain_command_required'),
    'domain_command_controller_rejects_client_actor_claims' => str_contains($controller, 'rejectClientActorClaims') && str_contains($controller, 'client_actor_claim_rejected'),
    'frontend_workspace_is_projection' => str_contains($frontend, 'MASTER_DATA_CONTROL_PROJECTION') && str_contains($frontend, 'data-authority-class'),
    'frontend_create_control_disabled' => str_contains($frontend, 'id="mdc-create" disabled aria-disabled="true"'),
];

$failed = array_keys(array_filter($checks, static fn (bool $ok): bool => !$ok));
$summary = [
    'gate' => 'mda_direct_db_guard',
    'status' => $failed === [] ? 'PASS' : 'FAIL',
    'checks' => $checks,
    'failed' => $failed,
    'generated_at' => gmdate('c'),
];

file_put_contents($reportDir . '/MDA_DIRECT_DB_GUARD_REPORT.json', json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
file_put_contents($reportDir . '/MDA_DIRECT_DB_GUARD_REPORT.md', mda_guard_markdown($summary));
echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($summary['status'] === 'PASS' ? 0 : 1);

function mda_guard_markdown(array $summary): string
{
    $lines = [
        '# MDA Direct DB Guard Report',
        '',
        '- Gate: ' . $summary['status'],
        '- Generated at: ' . $summary['generated_at'],
        '',
        '| Check | Result |',
        '|---|---:|',
    ];
    foreach ($summary['checks'] as $check => $ok) {
        $lines[] = '| ' . $check . ' | ' . ($ok ? 'PASS' : 'FAIL') . ' |';
    }
    $lines[] = '';

    return implode(PHP_EOL, $lines);
}
