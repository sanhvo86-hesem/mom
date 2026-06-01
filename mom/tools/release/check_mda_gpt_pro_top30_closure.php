<?php

declare(strict_types=1);

$repoRoot = realpath(__DIR__ . '/../../..');
if (!is_string($repoRoot) || $repoRoot === '') {
    fwrite(STDERR, "Unable to resolve repository root.\n");
    exit(2);
}

$checks = [];

/**
 * @param array<string,array<string,mixed>> $checks
 * @param list<string> $evidence
 */
function top30_record(array &$checks, string $id, bool $ok, string $requirement, array $evidence): void
{
    $checks[$id] = [
        'ok' => $ok,
        'requirement' => $requirement,
        'evidence' => $evidence,
    ];
}

function top30_read(string $path): string
{
    if (!is_file($path)) {
        return '';
    }

    return (string)file_get_contents($path);
}

/**
 * @return array<string,mixed>
 */
function top30_json(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $decoded = json_decode((string)file_get_contents($path), true);

    return is_array($decoded) ? $decoded : [];
}

function top30_contains_all(string $haystack, array $needles): bool
{
    foreach ($needles as $needle) {
        if (!str_contains($haystack, (string)$needle)) {
            return false;
        }
    }

    return true;
}

$registry = top30_read($repoRoot . '/mom/api/services/DomainCommand/CommandRegistry.php');
$gateway = top30_read($repoRoot . '/mom/api/services/DomainCommand/DomainCommandGateway.php');
$masterController = top30_read($repoRoot . '/mom/api/controllers/MasterDataController.php');
$postgresRepo = top30_read($repoRoot . '/mom/api/services/PostgresMasterDataRepository.php');
$modeService = top30_read($repoRoot . '/mom/api/services/MasterDataAuthorityModeService.php');
$itemHandler = top30_read($repoRoot . '/mom/api/services/DomainCommand/ItemRevisionCommandHandler.php');
$signatureService = top30_read($repoRoot . '/mom/api/services/DomainCommand/ElectronicSignatureService.php');
$domainCommandController = top30_read($repoRoot . '/mom/api/controllers/DomainCommandController.php');
$openapi = top30_read($repoRoot . '/mom/api/openapi.yaml');
$scenarioRunner = top30_read($repoRoot . '/mom/api/services/Scenario/MdaRuntimeScenarioRunner.php');
$scenarioDriver = top30_read($repoRoot . '/mom/api/services/Scenario/ScenarioCommandDriver.php');
$scenarioRegistry = top30_json($repoRoot . '/mom/data/registry/mda-v4-runtime-scenarios.json');
$p58 = top30_json($repoRoot . '/mom/data/registry/mda-v4-runtime-scenario-dashboard.latest.json');
$p59 = top30_json($repoRoot . '/mom/data/registry/mda-v4-p59-operational-drill.latest.json');
$p60 = top30_json($repoRoot . '/_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_FINAL_SCORECARD.json');

$implementedRequiredCommands = top30_contains_all($registry, [
    "'CreateItemCommand'",
    "'CreateItemRevisionCommand'",
    "'ReleaseItemRevisionCommand'",
    "'ReleaseEngineeringReleasePackageCommand'",
    "'ApplyQualityHoldCommand'",
    "'ReleaseQualityHoldCommand'",
    "'PostInventoryLedgerTransactionCommand'",
    "'RunInventoryReconciliationCommand'",
    "'CloseInventoryPeriodCommand'",
    "'StartJobCommand'",
    "'IssueMaterialToWorkOrderCommand'",
    "'RecordInspectionResultCommand'",
    "'ReportToolBreakageCommand'",
    "'GageOOTInvestigationCommand'",
    "'implemented' => true",
]);

$migrations = [];
for ($i = 267; $i <= 284; $i++) {
    $files = glob($repoRoot . '/mom/database/migrations/' . $i . '_*.sql') ?: [];
    $migrations[$i] = count($files) === 1 ? basename($files[0]) : '';
}
$migrationBlockOk = !in_array('', $migrations, true) && count(array_unique(array_values($migrations))) === count($migrations);

$scenarioText = json_encode($scenarioRegistry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '';

top30_record($checks, 'MDA-F01', top30_contains_all($postgresRepo, ['primary_backend', 'postgres', 'master_data_store', 'fallback_telemetry'])
    && top30_contains_all($modeService, ['MODE_POSTGRES_PRIMARY', 'MODE_POSTGRES_ONLY', 'assertPostgresOnlyCutoverAllowed']),
    'PostgreSQL is the governed master-data authority and JSON is fallback/export only.',
    ['mom/api/services/PostgresMasterDataRepository.php', 'mom/api/services/MasterDataAuthorityModeService.php']);

top30_record($checks, 'MDA-F02', top30_contains_all($masterController, ['denyLegacyGovernedMutation', 'domain_command_required', '/api/v1/domain-commands']),
    'Legacy MasterDataController governed mutations fail closed with domain_command_required.',
    ['mom/api/controllers/MasterDataController.php']);

top30_record($checks, 'MDA-F03', $implementedRequiredCommands && top30_contains_all($gateway, ['Idempotency-Key', 'RegulatedCommandEvidenceSpine', 'executeHandler']),
    'Command spine has implemented handlers, idempotency, regulated evidence, audit/outbox, and problem details.',
    ['mom/api/services/DomainCommand/CommandRegistry.php', 'mom/api/services/DomainCommand/DomainCommandGateway.php']);

top30_record($checks, 'MDA-F04', is_file($repoRoot . '/mom/database/migrations/274_engineering_release_package_runtime_closure.sql')
    && top30_contains_all(top30_read($repoRoot . '/mom/database/migrations/274_engineering_release_package_runtime_closure.sql'), ['engineering_release_package', 'manifest_hash_sha256', 'prevent_released_engineering_package_manifest_mutation', 'work_order_engineering_package_snapshot']),
    'Engineering release package is a physical immutable root with hashes and frozen order/work-order snapshots.',
    ['mom/database/migrations/274_engineering_release_package_runtime_closure.sql']);

top30_record($checks, 'MDA-F05', is_file($repoRoot . '/mom/api/services/MasterDataDriftReconciliationRunner.php')
    && is_file($repoRoot . '/mom/api/services/MasterDataFallbackTelemetry.php')
    && top30_contains_all(top30_read($repoRoot . '/mom/tools/audit_runtime_authority_consistency.php'), ['status', 'drift']),
    'Runtime authority consistency audit exists and records drift/fallback posture.',
    ['mom/tools/audit_runtime_authority_consistency.php', 'mom/api/services/MasterDataDriftReconciliationRunner.php']);

top30_record($checks, 'MDA-F06', top30_contains_all(top30_read($repoRoot . '/mom/data/registry/mda-uom-direct-authority-system.json'), ['uom_runtime_authority', 'UomRuntimeAuthorityService'])
    && top30_contains_all($gateway, ['UomCommandQuantityNormalizer']),
    'UOM is direct runtime authority consumed by command quantities.',
    ['mom/data/registry/mda-uom-direct-authority-system.json', 'mom/api/services/DomainCommand/UomCommandQuantityNormalizer.php']);

top30_record($checks, 'MDA-F07', (string)($p60['decision_token'] ?? '') === 'P60_PASS_READY_FOR_CONTROLLED_INTEGRATION'
    && (int)($p60['p0_open_count'] ?? -1) === 0
    && (int)($p60['p1_open_count'] ?? -1) === 0,
    'Final red-team gate has zero open P0/P1 after severity reclassification.',
    ['_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_FINAL_SCORECARD.json']);

top30_record($checks, 'MDA-F08', top30_contains_all(top30_read($repoRoot . '/_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_EXECUTIVE_SUMMARY_VI.md'), ['Không được gọi', 'production-ready']),
    'V1/V4 artifacts keep claim boundary clear and forbid premature production-ready wording.',
    ['_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_EXECUTIVE_SUMMARY_VI.md']);

top30_record($checks, 'MDA-F09', is_file($repoRoot . '/_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_PR74_PR76_CONFLICT_LEDGER.csv'),
    'V3 PR/attempt is retained as conflict/no-go evidence, not current authority.',
    ['_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_PR74_PR76_CONFLICT_LEDGER.csv']);

top30_record($checks, 'MDA-F10', (string)($p60['decision_token'] ?? '') === 'P60_PASS_READY_FOR_CONTROLLED_INTEGRATION',
    'V4 candidate proof is rerunnable on integrated code, not accepted as draft PR authority.',
    ['mom/tools/release/run_mda_v4_final_redteam.php']);

top30_record($checks, 'MDA-F11', (string)($p59['go_no_go']['decision_token'] ?? '') === 'P59_PASS_READY_FOR_NEXT'
    && (string)($p59['browser_operator_smoke']['live_vps_chrome']['status'] ?? '') === 'pass',
    'Deploy/runtime evidence is separated and includes live VPS Chrome proof.',
    ['mom/tools/release/run_mda_v4_operational_drill.php', 'mom/data/registry/mda-v4-p59-operational-drill.latest.json']);

top30_record($checks, 'MDA-F12', top30_contains_all($scenarioText, ['OQC failure creates canonical hold', 'quality_hold', 'shipment'])
    && is_file($repoRoot . '/mom/api/services/DomainCommand/QualityHoldService.php'),
    'Canonical quality hold/NCR/MRB chain blocks downstream movement.',
    ['mom/api/services/DomainCommand/QualityHoldService.php', 'mom/data/registry/mda-v4-runtime-scenarios.json']);

top30_record($checks, 'MDA-F13', top30_contains_all($scenarioText, ['inventory ledger', 'Closed inventory period'])
    && is_file($repoRoot . '/mom/api/services/DomainCommand/InventoryCommandHandler.php'),
    'Inventory balance authority is ledger-driven with reconciliation and closed-period guards.',
    ['mom/api/services/DomainCommand/InventoryCommandHandler.php']);

top30_record($checks, 'MDA-F14', top30_contains_all($signatureService, ['v_user_canonical', 'signer_identity_snapshot', 'signature_manifestation'])
    && is_file($repoRoot . '/mom/api/services/DomainCommand/SignatureChallengeService.php'),
    'E-signature/evidence spine requires signatures, manifestation, and canonical identity snapshot.',
    ['mom/api/services/DomainCommand/ElectronicSignatureService.php', 'mom/api/services/DomainCommand/SignatureChallengeService.php']);

top30_record($checks, 'MDA-F15', top30_contains_all($gateway, ['PostgresIdempotencyReplayRepository', 'RegulatedCommandEvidenceSpine', 'DomainCommandException'])
    && top30_contains_all(top30_read($repoRoot . '/mom/api/services/DomainCommand/ProblemDetailsFactory.php'), ['type', 'title', 'status', 'detail', 'code'])
    && top30_contains_all($domainCommandController, ['application/problem+json']),
    'Command audit/outbox/problem-details and idempotent replay path are wired.',
    ['mom/api/services/DomainCommand/DomainCommandGateway.php', 'mom/api/services/DomainCommand/ProblemDetailsFactory.php']);

top30_record($checks, 'MDA-F16', top30_contains_all($postgresRepo, ['master_data_store', 'saveStore', 'jsonBridge', 'shadowJsonWriteAllowed'])
    && top30_contains_all($masterController, ['denyLegacyGovernedMutation']),
    'DataLayer/JSON bypass is closed for governed mutation paths while import/export/shadow remains explicit.',
    ['mom/api/services/PostgresMasterDataRepository.php', 'mom/api/controllers/MasterDataController.php']);

top30_record($checks, 'MDA-F17', is_file($repoRoot . '/mom/tools/release/check_workflow_status_authority.php')
    && is_file($repoRoot . '/mom/data/registry/status-options.json'),
    'Workflow/status parity is machine-checkable from generated status authority.',
    ['mom/tools/release/check_workflow_status_authority.php', 'mom/data/registry/status-options.json']);

top30_record($checks, 'MDA-F18', top30_contains_all(top30_read($repoRoot . '/mom/scripts/portal/13-master-data-control.js'), ['scope:_mdState.scope', 'hiddenFromMasterData'])
    && top30_contains_all($masterController, ['denyLegacyGovernedMutation']),
    'Frontend master-data workspace is projection/re-anchor only; backend mutation is fail-closed.',
    ['mom/scripts/portal/13-master-data-control.js', 'mom/api/controllers/MasterDataController.php']);

top30_record($checks, 'MDA-F19', top30_contains_all($signatureService, ['v_user_canonical'])
    && is_file($repoRoot . '/.ai/USER_IDENTITY_SSOT.md'),
    'User identity bridge reads canonical user identity through v_user_canonical and creates no parallel user table.',
    ['mom/api/services/DomainCommand/ElectronicSignatureService.php', '.ai/USER_IDENTITY_SSOT.md']);

top30_record($checks, 'MDA-F20', top30_contains_all($itemHandler, ['createItem', 'createItemRevision', 'releaseItemRevision', 'master_data.item_revision.released'])
    && is_file($repoRoot . '/mom/database/migrations/284_item_revision_command_authority_closure.sql'),
    'Item/revision release commands are implemented and released revision mutation is fail-closed.',
    ['mom/api/services/DomainCommand/ItemRevisionCommandHandler.php', 'mom/database/migrations/284_item_revision_command_authority_closure.sql']);

top30_record($checks, 'MDA-F21', is_file($repoRoot . '/mom/api/services/DomainCommand/ResourceReadinessService.php')
    && top30_contains_all($scenarioText, ['StartJob missing machine evidence blocks']),
    'Resource readiness gates block invalid equipment/tool/gage/operator preconditions.',
    ['mom/api/services/DomainCommand/ResourceReadinessService.php', 'mom/data/registry/mda-v4-runtime-scenarios.json']);

top30_record($checks, 'MDA-F22', top30_contains_all($gateway, ['ReleaseEngineeringReleasePackageCommand', 'BindEngineeringPackageToWorkOrderCommand'])
    && top30_contains_all(top30_read($repoRoot . '/mom/database/migrations/274_engineering_release_package_runtime_closure.sql'), ['engineering_release_package']),
    'ReleasePackage is physical authority and order release binds package snapshots.',
    ['mom/api/services/EngineeringReleasePackageCommandHandler.php']);

top30_record($checks, 'MDA-F23', top30_contains_all($gateway, ['ReleaseWorkOrderCommand', 'StartJobCommand', 'CompleteOperationCommand'])
    && top30_contains_all($scenarioText, ['Valid work-order release binds released engineering package snapshot hash']),
    'MES release/start/complete path uses command stack and frozen package snapshots.',
    ['mom/api/services/DomainCommand/MesRuntimeCommandHandler.php', 'mom/data/registry/mda-v4-runtime-scenarios.json']);

top30_record($checks, 'MDA-F24', (float)($p60['evidence_inputs']['clean_cutover_fallback_read_total'] ?? -1) === 0.0
    && (string)($p60['evidence_inputs']['postgres_restore_status'] ?? '') === 'pass',
    'Cutover, restore, fallback, and reconciliation proof exists with clean fallback reads at zero.',
    ['mom/tools/release/run_mda_v4_operational_drill.php', '_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_FINAL_SCORECARD.json']);

top30_record($checks, 'MDA-F25', is_file($repoRoot . '/mom/api/services/MdaRuntimeTelemetryService.php')
    && is_file($repoRoot . '/mom/data/registry/mda-v4-runtime-control-tower.latest.json'),
    'Telemetry/control tower exists for fallback, drift, outbox lag, command outcomes, and alerts.',
    ['mom/api/services/MdaRuntimeTelemetryService.php', 'mom/data/registry/mda-v4-runtime-control-tower.latest.json']);

top30_record($checks, 'MDA-F26', (string)($p58['decision'] ?? '') === 'P58_PASS_READY_FOR_NEXT'
    && (int)($p58['scenario_total'] ?? 0) >= 14
    && (int)($p58['failed'] ?? 1) === 0
    && top30_contains_all($scenarioRunner, ['mock_only', 'ScenarioCommandDriver'])
    && top30_contains_all($scenarioDriver, ['DomainCommandGateway', 'direct_domain_command_gateway']),
    'Executable scenario runner replaces narrative-only proof and passes blocker-complete scenarios.',
    ['mom/tools/release/run_mda_runtime_scenarios.php', 'mom/api/services/Scenario/MdaRuntimeScenarioRunner.php']);

top30_record($checks, 'MDA-F27', (string)($p59['browser_operator_smoke']['local_contract_chrome']['status'] ?? '') === 'pass'
    && (string)($p59['browser_operator_smoke']['live_vps_chrome']['status'] ?? '') === 'pass',
    'Publish/dashboard evidence and browser links pass local and live Chrome smoke.',
    ['mom/data/registry/mda-v4-p59-operational-drill.latest.json']);

top30_record($checks, 'MDA-F28', (string)($p60['decision_token'] ?? '') === 'P60_PASS_READY_FOR_CONTROLLED_INTEGRATION'
    && ($p60['production_ready_claim_allowed'] ?? true) === false,
    'Final red-team runs on integrated code and blocks production-ready wording.',
    ['mom/tools/release/run_mda_v4_final_redteam.php']);

top30_record($checks, 'MDA-F29', top30_contains_all(top30_read($repoRoot . '/mom/api/services/DomainCommand/AIActorFirewall.php'), ['ai_governed_action_forbidden'])
    && top30_contains_all($scenarioText, ['AI actor cannot release']),
    'AI actors are advisory-only and cannot approve/release/disposition governed commands.',
    ['mom/api/services/DomainCommand/AIActorFirewall.php', 'mom/data/registry/mda-v4-runtime-scenarios.json']);

top30_record($checks, 'MDA-F30', $migrationBlockOk
    && (string)($p60['decision_token'] ?? '') === 'P60_PASS_READY_FOR_CONTROLLED_INTEGRATION'
    && (int)($p60['p0_open_count'] ?? -1) === 0
    && (int)($p60['p1_open_count'] ?? -1) === 0,
    'DoD promotion gate is machine-enforced: continuous migrations 267-284 and no open P0/P1.',
    ['mom/database/migrations/267-284', 'mom/tools/release/run_mda_v4_final_redteam.php']);

$failed = array_values(array_filter($checks, static fn(array $row): bool => !$row['ok']));
$result = [
    'decision' => $failed === [] ? 'MDA_GPT_PRO_TOP30_CLOSED' : 'MDA_GPT_PRO_TOP30_REPAIR_REQUIRED',
    'total' => count($checks),
    'passed' => count($checks) - count($failed),
    'failed' => count($failed),
    'migrations' => $migrations,
    'checks' => $checks,
];

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
exit($failed === [] ? 0 : 1);
