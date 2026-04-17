<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;
use PDO;
use Throwable;

final class DataSchemaService
{
    public const DETAIL_SAVE_MAX_BYTES = 1048576;

    private const ARTIFACT_DRIFT_WARN_SECONDS = 3600;
    private const ARTIFACT_DRIFT_BLOCK_SECONDS = 10800;
    private const ARTIFACT_DEPENDENCY_GRACE_SECONDS = 60;
    private const LARGE_ARTIFACT_WARN_BYTES = 10485760;
    private const VERY_LARGE_ARTIFACT_WARN_BYTES = 20971520;
    private const WORKSPACE_MEMORY_BUDGET = '256M';
    private const GOVERNANCE_FIELDS = [
        'org_company_code',
        'org_legal_entity_code',
        'org_plant_id',
        'org_site_id',
        'source_system',
        'source_record_id',
        'row_version',
        'payload_schema_version',
    ];

    private DataLayer $data;
    private string $dataDir;
    private string $rootDir;
    private string $registryDir;
    private string $configDir;
    private string $schemaStudioDir;
    private string $contractsDir;
    /** @var array<string, int|null> */
    private array $artifactTimestampCache = [];

    public function __construct(DataLayer $data, string $dataDir, string $rootDir)
    {
        $this->data = $data;
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->registryDir = $this->dataDir . '/registry';
        $this->configDir = $this->dataDir . '/config';
        $this->schemaStudioDir = $this->dataDir . '/schema-studio';
        $this->contractsDir = $this->rootDir . '/mom/contracts';
    }

    public function getWorkspace(): array
    {
        $this->ensureMemoryBudget(self::WORKSPACE_MEMORY_BUDGET);

        $endpointCatalogWorkspace = $this->readEndpointCatalogWorkspace();
        $endpointCatalogArtifact = $this->readArtifactEnvelope($this->registryPath('endpoint-catalog'), ['_meta']);
        $tableRegistry = $this->readJson($this->registryPath('table-registry'));
        $relationMap = $this->readRelationMapLight();
        $schemaLibrary = $this->readJson($this->registryPath('schema-library'));
        $variableLibrary = $this->readJson($this->configDir . '/variable_library.json');
        $systemContractManifest = $this->readJson($this->registryPath('system-contract-manifest'));
        $systemContractDiagnostics = $this->readJson($this->registryPath('system-contract-diagnostics'));
        $systemContractRuntimeProjections = $this->readArtifactEnvelope($this->registryPath('system-contract-runtime-projections'), ['_meta', 'summary']);
        $systemContractRuntimeProjectionSegments = $this->readJson($this->registryPath('system-contract-runtime-projections-segments'));
        $systemContractRegistryContracts = $this->readJson($this->registryPath('system-contract-registry-contracts'));
        $schemaStudioManifest = $this->readJson($this->registryPath('schema-studio-enterprise-manifest'));
        $schemaStudioDiagnostics = $this->readJson($this->registryPath('schema-studio-diagnostics'));
        $manifest = $systemContractManifest !== [] ? $systemContractManifest : $schemaStudioManifest;
        $diagnostics = $systemContractDiagnostics !== [] ? $systemContractDiagnostics : $schemaStudioDiagnostics;
        $workspaceDesignPath = $this->schemaStudioPath('designs/workspace.json');
        $workspaceBaselinePath = $this->schemaStudioPath('snapshots/workspace.baseline.json');
        $workspaceDesignAvailable = is_file($workspaceDesignPath);
        $workspaceBaselineAvailable = is_file($workspaceBaselinePath);
        $workspaceDesignArtifactOrphaned = !$workspaceDesignAvailable && ($schemaStudioManifest !== [] || $schemaStudioDiagnostics !== []);
        $qualityReport = $this->readJson($this->registryPath('registry-quality-report'));
        $registryManifest = $this->readJson($this->registryPath('registry-manifest'));
        $schemaAuthority = $this->readJson($this->registryPath('schema-authority-summary'));
        $migrationGap = $this->readJson($this->registryPath('migration-gap-report'));
        $dataFieldsIndex = $this->readJson($this->registryPath('data-fields-index'));
        $endpointGovernanceClassification = $this->readJson($this->registryPath('endpoint-governance-classification'));
        $tableGovernanceOverlay = $this->readJson($this->registryPath('table-governance-overlay'));
        $enterpriseEventContractMap = $this->readJson($this->registryPath('enterprise-event-contract-map'));
        $destructiveEndpointQuarantine = $this->readJson($this->registryPath('destructive-endpoint-quarantine'));
        $commandRuntimeBindings = $this->readJson($this->registryPath('command-runtime-bindings'));
        $enterpriseRegistryDoctorReport = $this->readJson($this->registryPath('enterprise-registry-doctor-report'));
        $enterpriseFrontendSimulationReport = $this->readJson($this->registryPath('enterprise-frontend-simulation-report'));
        $blindSpotReport = $this->readJson($this->registryPath('operational-blind-spot-report'));
        $stressReport = $this->readJson($this->registryPath('operational-stress-report'));
        $globalCapabilityAudit = $this->readJson($this->registryPath('global-erp-mom-capability-audit'));
        $registryAuthorityStandard = $this->readJson($this->contractsPath('registry-authority-standard.json'));
        $aiAuthorityChain = $this->readJson($this->contractsPath('ai-authority-chain.json'));
        $contractGlossary = $this->readJson($this->contractsPath('glossary.json'));
        $contractDomainMap = $this->readJson($this->contractsPath('domain-map.json'));
        $contractAuthorityReport = $this->readJson($this->contractsPath('authority-report.json'));
        $contractPackageIndex = $this->readJson($this->contractsPath('package-index.json'));
        $contractObjectIndex = $this->readJson($this->contractsPath('object-index.json'));
        $contractStateModels = $this->readJson($this->contractsPath('state-model-index.json'));
        $contractCommands = $this->readJson($this->contractsPath('command-index.json'));
        $contractEvents = $this->readJson($this->contractsPath('event-index.json'));
        $contractDeprecationLedger = $this->readJson($this->contractsPath('deprecation-ledger.json'));
        $contractMigrationManifest = $this->readJson($this->contractsPath('migration-manifest.json'));

        $apis = $this->buildApiSummaries($endpointCatalogWorkspace);
        $tableKeys = $this->allTableKeys($tableRegistry, $relationMap);
        $dbProbe = $this->probeDatabase($tableKeys);
        $tables = $this->buildTableSummaries($tableRegistry, $relationMap, $dbProbe, $apis);
        $connection = $this->buildConnectionSummary($dbProbe, $tables);
        $blueprints = $this->buildBlueprintSummaries($schemaLibrary);
        $variables = $this->buildVariableSummaries($variableLibrary);
        $designs = $this->buildDesignSummaries();
        $releases = $this->buildReleaseSummaries();
        $domains = $this->buildDomainSummaries($tableRegistry, $apis, $tables);
        $artifactInventory = $this->buildArtifactInventory([
            'endpoint_catalog' => $endpointCatalogArtifact,
            'endpoint_catalog_index' => $this->readJson($this->registryPath('endpoint-catalog-index')),
            'relation_map' => $relationMap,
            'registry_quality' => $qualityReport,
            'table_registry' => $tableRegistry,
            'contract_glossary' => $contractGlossary,
            'contract_domain_map' => $contractDomainMap,
            'contract_authority_report' => $contractAuthorityReport,
            'contract_package_index' => $contractPackageIndex,
            'contract_object_index' => $contractObjectIndex,
            'contract_state_models' => $contractStateModels,
            'contract_commands' => $contractCommands,
            'contract_events' => $contractEvents,
            'contract_deprecation_ledger' => $contractDeprecationLedger,
            'contract_migration_manifest' => $contractMigrationManifest,
            'system_contract_runtime_projections' => $systemContractRuntimeProjections,
            'system_contract_runtime_projection_segments' => $systemContractRuntimeProjectionSegments,
            'system_contract_registry_contracts' => $systemContractRegistryContracts,
            'system_contract_diagnostics' => $systemContractDiagnostics,
            'system_contract_manifest' => $systemContractManifest,
            'schema_diagnostics' => $schemaStudioDiagnostics,
            'schema_manifest' => $schemaStudioManifest,
            'registry_manifest' => $registryManifest,
            'schema_authority' => $schemaAuthority,
            'migration_gap' => $migrationGap,
            'data_fields_index' => $dataFieldsIndex,
            'endpoint_governance_classification' => $endpointGovernanceClassification,
            'table_governance_overlay' => $tableGovernanceOverlay,
            'enterprise_event_contract_map' => $enterpriseEventContractMap,
            'destructive_endpoint_quarantine' => $destructiveEndpointQuarantine,
            'command_runtime_bindings' => $commandRuntimeBindings,
            'enterprise_registry_doctor_report' => $enterpriseRegistryDoctorReport,
            'enterprise_frontend_simulation_report' => $enterpriseFrontendSimulationReport,
            'registry_authority_standard' => $registryAuthorityStandard,
            'ai_authority_chain' => $aiAuthorityChain,
            'blind_spot_report' => $blindSpotReport,
            'stress_report' => $stressReport,
            'global_capability_audit' => $globalCapabilityAudit,
        ]);
        $savePolicy = $this->savePolicy();
        $operational = $this->buildOperationalState($artifactInventory, $qualityReport, $diagnostics, $connection, $tables, $savePolicy, $blindSpotReport, $stressReport);
        $highlights = $this->buildHighlights($relationMap, $diagnostics, $qualityReport, $migrationGap, $tables, $connection, $blindSpotReport, $stressReport);
        $blindSpotAudit = $this->buildOperationalAuditSummary($blindSpotReport, 'scenario_id');
        $stressAudit = $this->buildOperationalAuditSummary($stressReport, 'scenario_id');
        $globalCapabilityAuditSummary = $this->buildOperationalAuditSummary($globalCapabilityAudit, 'id');

        $dbProbeApplicable = !empty($connection['db_probe_applicable']);
        $dbProbeResolved = !empty($connection['db_probe_resolved']);
        $dbTargetStatus = (string)($connection['db_target_status'] ?? 'not_configured');
        $dbTargetHealthy = (bool)($connection['db_target_healthy'] ?? false);
        $workflowTableCount = 0;
        $supportTableCount = 0;
        $governanceGapCount = 0;
        $registryGapCount = 0;
        $dbPresentCount = 0;
        $dbMissingCount = 0;
        $adminOnlyEndpointCount = 0;
        $csrfEndpointCount = 0;
        $runtimeReadyEndpointCount = 0;
        $unlinkedEndpointCount = 0;
        $apiBackedTableCount = 0;
        $schemaAuthorityLinkedTableCount = 0;
        $runtimeContractLinkedTableCount = 0;
        $dbVerifiedTableCount = 0;
        $unlinkedTableCount = 0;
        $directGovernanceGapCount = 0;
        $variableCount = 0;

        foreach ($tables as $table) {
            if (($table['workflowId'] ?? '') !== '') {
                $workflowTableCount += 1;
            }
            if (($table['supportTable'] ?? false) === true) {
                $supportTableCount += 1;
            }
            $governanceGapCount += (int)($table['governance_gap_count'] ?? 0) > 0 ? 1 : 0;
            $directGovernanceGapCount += (int)($table['governance_direct_missing_count'] ?? 0) > 0 ? 1 : 0;
            $registryGapCount += (($table['registry_present'] ?? false) === false) ? 1 : 0;
            $apiBackedTableCount += (int)($table['endpoint_count'] ?? 0) > 0 ? 1 : 0;
            $schemaAuthorityLinkedTableCount += !empty($table['migration_source_present']) ? 1 : 0;
            $runtimeContractLinkedTableCount += !empty($table['runtime_contract_linked']) ? 1 : 0;
            $dbVerifiedTableCount += (string)($table['truth_status'] ?? '') === 'db_verified' ? 1 : 0;
            $unlinkedTableCount += !empty($table['unlinked']) ? 1 : 0;
            if ($dbProbeResolved) {
                $dbPresentCount += (($table['db_present'] ?? false) === true) ? 1 : 0;
                $dbMissingCount += (($table['db_present'] ?? false) === false) ? 1 : 0;
            }
        }

        foreach ($apis as $api) {
            $adminOnlyEndpointCount += (($api['admin_only'] ?? false) === true) ? 1 : 0;
            $csrfEndpointCount += (($api['csrf_required'] ?? false) === true) ? 1 : 0;
            $runtimeReadyEndpointCount += !empty($api['implementation_linked']) ? 1 : 0;
            $unlinkedEndpointCount += empty($api['implementation_linked']) ? 1 : 0;
        }

        foreach ($variables as $category) {
            $variableCount += (int)($category['variableCount'] ?? 0);
        }

        $manifestSummary = (array)($manifest['summary'] ?? []);
        $diagnosticsSummary = (array)($diagnostics['summary'] ?? []);
        $systemContractManifestSummary = (array)($systemContractManifest['summary'] ?? []);
        $systemContractDiagnosticsSummary = (array)($systemContractDiagnostics['summary'] ?? []);
        $schemaStudioManifestSummary = (array)($schemaStudioManifest['summary'] ?? []);
        $schemaStudioDiagnosticsSummary = (array)($schemaStudioDiagnostics['summary'] ?? []);
        $qualitySummary = (array)($qualityReport['summary'] ?? []);
        $publishability = (array)($qualityReport['publishability'] ?? []);
        $registryCoverage = (array)($registryManifest['coverage'] ?? []);
        $schemaAuthoritySummary = (array)($schemaAuthority['schema_authority'] ?? []);

        return [
            'generated_at' => gmdate('c'),
            'connection' => $connection,
            'metrics' => [
                'endpoint_count' => count($apis),
                'runtime_ready_endpoint_count' => $runtimeReadyEndpointCount,
                'api_implementation_linked_count' => $runtimeReadyEndpointCount,
                'unlinked_endpoint_count' => $unlinkedEndpointCount,
                'endpoint_field_library_count' => (int)($dataFieldsIndex['_meta']['generatedEndpointCount'] ?? 0),
                'admin_only_endpoint_count' => $adminOnlyEndpointCount,
                'csrf_endpoint_count' => $csrfEndpointCount,
                'table_count' => count($tables),
                'api_backed_table_count' => $apiBackedTableCount,
                'schema_authority_linked_table_count' => $schemaAuthorityLinkedTableCount,
                'runtime_contract_linked_table_count' => $runtimeContractLinkedTableCount,
                'db_verified_table_count' => $dbVerifiedTableCount,
                'unlinked_table_count' => $unlinkedTableCount,
                'registry_table_count' => count((array)($tableRegistry['tables'] ?? [])),
                'relation_entity_count' => count((array)($relationMap['entities'] ?? [])),
                'registry_gap_count' => $registryGapCount,
                'db_probe_applicable' => $dbProbeApplicable,
                'db_probe_reachable' => !empty($connection['db_probe_reachable']),
                'db_probe_resolved' => $dbProbeResolved,
                'db_target_status' => $dbTargetStatus,
                'db_target_healthy' => $dbTargetHealthy,
                'db_authority_coverage_ratio' => (float)($connection['authority_coverage_ratio'] ?? 0.0),
                'runtime_postgres_path_active' => !empty($connection['runtime_path_active']),
                'db_present_table_count' => $dbPresentCount,
                'db_missing_table_count' => $dbMissingCount,
                'workflow_table_count' => $workflowTableCount,
                'support_table_count' => $supportTableCount,
                'governance_gap_count' => $governanceGapCount,
                'governance_direct_gap_count' => $directGovernanceGapCount,
                'domain_count' => count($domains),
                'business_contract_domain_count' => count((array)($contractDomainMap['domains'] ?? [])),
                'business_contract_package_count' => count((array)($contractPackageIndex['packages'] ?? [])),
                'business_contract_object_count' => count((array)($contractObjectIndex['objects'] ?? [])),
                'business_contract_state_model_count' => count((array)($contractStateModels['stateModels'] ?? [])),
                'business_contract_command_count' => count((array)($contractCommands['commands'] ?? [])),
                'business_contract_event_count' => count((array)($contractEvents['events'] ?? [])),
                'business_contract_deprecation_count' => count((array)($contractDeprecationLedger['entries'] ?? [])),
                'blueprint_count' => count($blueprints),
                'variable_category_count' => count($variables),
                'variable_count' => $variableCount,
                'design_count' => count($designs),
                'release_count' => count($releases),
                'relation_count' => (int)($manifestSummary['relationCount'] ?? $relationMap['_meta']['edgeCount'] ?? 0),
                'contract_count' => (int)($manifestSummary['contractCount'] ?? 0),
                'rls_table_count' => (int)($manifestSummary['rlsTableCount'] ?? 0),
                'critical_gap_count' => (int)($diagnosticsSummary['criticalGapCount'] ?? $manifestSummary['criticalCanonicalGaps'] ?? 0),
                'publishability_blockers' => (int)(($publishability['blocking_counts']['frontend_blocked_entities'] ?? 0) + ($publishability['blocking_counts']['contract_issues'] ?? 0)),
                'authoritative_table_count' => (int)($schemaAuthoritySummary['table_count'] ?? 0),
                'operational_risk_count' => count((array)($operational['risks'] ?? [])),
                'blocking_operational_risk_count' => (int)($operational['blockingRiskCount'] ?? 0),
                'stale_artifact_count' => (int)($operational['freshness']['staleCount'] ?? 0),
                'artifact_drift_seconds' => (int)($operational['freshness']['driftSeconds'] ?? 0),
                'dependency_outdated_artifact_count' => (int)($operational['freshness']['dependencyOutdatedCount'] ?? 0),
                'db_structural_drift_table_count' => (int)($connection['structural_drift_table_count'] ?? 0),
                'db_missing_column_count' => (int)($connection['missing_column_count'] ?? 0),
                'db_unexpected_column_count' => (int)($connection['unexpected_column_count'] ?? 0),
                'db_type_drift_column_count' => (int)($connection['type_drift_column_count'] ?? 0),
                'db_pk_drift_table_count' => (int)($connection['pk_drift_table_count'] ?? 0),
                'migration_tracking_present' => !empty($connection['migration_table_present']),
                'applied_migration_count' => (int)($connection['applied_migration_count'] ?? 0),
                'migration_file_count' => (int)($connection['migration_file_count'] ?? 0),
                'migration_backlog_count' => (int)($connection['pending_migration_count'] ?? 0),
                'operational_blind_spot_critical_count' => (int)($blindSpotAudit['summary']['critical'] ?? 0),
                'operational_blind_spot_high_count' => (int)($blindSpotAudit['summary']['high'] ?? 0),
                'operational_stress_critical_count' => (int)($stressAudit['summary']['critical'] ?? 0),
                'operational_stress_high_count' => (int)($stressAudit['summary']['high'] ?? 0),
                'global_capability_count' => (int)($globalCapabilityAudit['summary']['capability_count'] ?? 0),
                'global_capability_covered_count' => (int)($globalCapabilityAudit['summary']['covered'] ?? 0),
                'global_capability_gap_count' => (int)($globalCapabilityAudit['summary']['gap'] ?? 0),
                'global_capability_blocking_gap_count' => (int)($globalCapabilityAudit['summary']['blocking_gap_count'] ?? 0),
                'global_capability_conditional_extension_count' => (int)($globalCapabilityAudit['summary']['conditional_extension'] ?? 0),
                'system_contract_table_count' => (int)($systemContractManifestSummary['tableCount'] ?? 0),
                'system_contract_endpoint_count' => (int)($systemContractManifestSummary['endpointCount'] ?? 0),
                'system_contract_workflow_count' => (int)($systemContractManifestSummary['workflowCount'] ?? 0),
                'system_contract_critical_gap_count' => (int)($systemContractDiagnosticsSummary['criticalGapCount'] ?? $systemContractManifestSummary['criticalGapCount'] ?? 0),
                'workspace_design_available' => $workspaceDesignAvailable,
                'workspace_baseline_available' => $workspaceBaselineAvailable,
                'workspace_design_artifact_orphaned' => $workspaceDesignArtifactOrphaned,
                'release_gate_blocked' => !empty($operational['releaseGate']['blocking']),
            ],
            'artifacts' => [
                'system_contract_registry' => [
                    'generatedAt' => (string)($systemContractManifest['_meta']['generatedAt'] ?? ''),
                    'authorityLayer' => (string)($systemContractManifest['_meta']['authorityLayer'] ?? ''),
                    'source' => (string)($systemContractManifest['_meta']['source'] ?? ''),
                    'summary' => [
                        'tableCount' => (int)($systemContractManifestSummary['tableCount'] ?? 0),
                        'relationCount' => (int)($systemContractManifestSummary['relationCount'] ?? 0),
                        'endpointCount' => (int)($systemContractManifestSummary['endpointCount'] ?? 0),
                        'workflowCount' => (int)($systemContractManifestSummary['workflowCount'] ?? 0),
                        'contractCount' => (int)($systemContractManifestSummary['contractCount'] ?? 0),
                        'workflowBindingCoveragePercent' => (int)($systemContractManifestSummary['workflowBindingCoveragePercent'] ?? 0),
                        'criticalGapCount' => (int)($systemContractDiagnosticsSummary['criticalGapCount'] ?? $systemContractManifestSummary['criticalGapCount'] ?? 0),
                        'releaseReadinessScore' => (int)($systemContractManifestSummary['releaseReadinessScore'] ?? 0),
                    ],
                ],
                'schema_studio_manifest' => [
                    'generatedAt' => (string)($schemaStudioManifest['_meta']['generatedAt'] ?? ''),
                    'sourceAvailable' => $workspaceDesignAvailable,
                    'baselineAvailable' => $workspaceBaselineAvailable,
                    'orphaned' => $workspaceDesignArtifactOrphaned,
                    'authorityLayer' => 'design_workspace',
                    'summary' => [
                        'projectionCount' => (int)($schemaStudioManifestSummary['projectionCount'] ?? 0),
                        'fieldCount' => (int)($schemaStudioManifestSummary['fieldCount'] ?? 0),
                        'policyCount' => (int)($schemaStudioManifestSummary['policyCount'] ?? 0),
                        'releaseCount' => (int)($schemaStudioManifestSummary['releaseCount'] ?? 0),
                        'canonicalCoveragePercent' => (int)($schemaStudioManifestSummary['canonicalCoveragePercent'] ?? 0),
                        'registrySyncScore' => (int)($schemaStudioManifestSummary['registrySyncScore'] ?? 0),
                    ],
                ],
                'diagnostics' => [
                    'generatedAt' => (string)($diagnostics['_meta']['generatedAt'] ?? ''),
                    'authorityLayer' => (string)($diagnostics['_meta']['authorityLayer'] ?? ''),
                    'summary' => [
                        'graphDensityScore' => (int)($diagnosticsSummary['graphDensityScore'] ?? 0),
                        'metadataCompletenessPercent' => (int)($diagnosticsSummary['metadataCompletenessPercent'] ?? 0),
                        'workflowBindingCoveragePercent' => (int)($diagnosticsSummary['workflowBindingCoveragePercent'] ?? 0),
                        'blockerCount' => (int)($diagnosticsSummary['blockerCount'] ?? 0),
                        'hotspotCount' => (int)($diagnosticsSummary['hotspotCount'] ?? 0),
                    ],
                ],
                'schema_studio_diagnostics' => [
                    'generatedAt' => (string)($schemaStudioDiagnostics['_meta']['generatedAt'] ?? ''),
                    'sourceAvailable' => $workspaceDesignAvailable,
                    'baselineAvailable' => $workspaceBaselineAvailable,
                    'orphaned' => $workspaceDesignArtifactOrphaned,
                    'authorityLayer' => 'design_workspace',
                    'summary' => [
                        'tableCount' => (int)($schemaStudioDiagnosticsSummary['tableCount'] ?? 0),
                        'workflowBindingCoveragePercent' => (int)($schemaStudioDiagnosticsSummary['workflowBindingCoveragePercent'] ?? 0),
                        'blockerCount' => (int)($schemaStudioDiagnosticsSummary['blockerCount'] ?? 0),
                        'hotspotCount' => (int)($schemaStudioDiagnosticsSummary['hotspotCount'] ?? 0),
                    ],
                ],
                'registry_quality' => [
                    'generatedAt' => (string)($qualityReport['_meta']['generatedAt'] ?? ''),
                    'summary' => [
                        'workflowCount' => (int)($qualitySummary['workflow_count'] ?? 0),
                        'contractIssues' => (int)($qualitySummary['contract_issues'] ?? 0),
                        'frontendReadyEntities' => (int)($qualitySummary['frontend_ready_entities'] ?? 0),
                        'frontendBlockedEntities' => (int)($qualitySummary['frontend_blocked_entities'] ?? 0),
                        'publishabilityReady' => (bool)($qualitySummary['publishability_ready'] ?? false),
                    ],
                    'publishability' => [
                        'status' => (string)($publishability['status'] ?? ''),
                        'reviewRequired' => (bool)($publishability['review_required'] ?? false),
                        'failedChecks' => array_slice(array_values(array_filter((array)($publishability['failed_checks'] ?? []), 'is_array')), 0, 8),
                    ],
                ],
                'schema_authority' => [
                    'declaredAt' => (string)($schemaAuthoritySummary['declared_at'] ?? ''),
                    'authoritativeSchemaSource' => (string)($schemaAuthoritySummary['authoritative_schema_source'] ?? ''),
                    'authoritativeSchemaFile' => (string)($schemaAuthoritySummary['authoritative_schema_file'] ?? ''),
                    'tableCount' => (int)($schemaAuthoritySummary['table_count'] ?? 0),
                ],
                'business_contract_bundle' => [
                    'generatedAt' => (string)(
                        $contractObjectIndex['_meta']['generatedAt']
                        ?? $contractPackageIndex['_meta']['generatedAt']
                        ?? $contractAuthorityReport['_meta']['generatedAt']
                        ?? $contractDomainMap['_meta']['generatedAt']
                        ?? $contractGlossary['_meta']['generatedAt']
                        ?? ''
                    ),
                    'summary' => [
                        'domainCount' => count((array)($contractDomainMap['domains'] ?? [])),
                        'packageCount' => count((array)($contractPackageIndex['packages'] ?? [])),
                        'objectCount' => count((array)($contractObjectIndex['objects'] ?? [])),
                        'authoredCoverageRatio' => (float)($contractAuthorityReport['summary']['authoredCoverageRatio'] ?? 0),
                        'lifecycleLikeCoverageRatio' => (float)($contractAuthorityReport['summary']['lifecycleLikeCoverageRatio'] ?? 0),
                        'coreValueStreamCoverageRatio' => (float)($contractAuthorityReport['summary']['coreValueStreamCoverageRatio'] ?? 0),
                        'priorityGapCount' => (int)($contractAuthorityReport['summary']['priorityGapCount'] ?? 0),
                        'stateModelCount' => count((array)($contractStateModels['stateModels'] ?? [])),
                        'commandCount' => count((array)($contractCommands['commands'] ?? [])),
                        'eventCount' => count((array)($contractEvents['events'] ?? [])),
                        'deprecationEntryCount' => count((array)($contractDeprecationLedger['entries'] ?? [])),
                        'authoredPackageCount' => (int)($contractPackageIndex['_meta']['authoredObjectCount'] ?? 0),
                    ],
                    'migration' => [
                        'storageAuthoritySource' => (string)($contractMigrationManifest['storageAuthority']['databaseSchemaSource'] ?? ''),
                        'tableCount' => (int)($contractMigrationManifest['storageAuthority']['tableCount'] ?? 0),
                        'compatibilityRules' => array_values(array_filter((array)($contractMigrationManifest['compatibility']['rules'] ?? []), 'is_string')),
                    ],
                ],
                'registry_manifest' => [
                    'generatedAt' => (string)($registryManifest['_meta']['generatedAt'] ?? ''),
                    'coverage' => [
                        'routerActions' => (int)($registryCoverage['router_actions'] ?? 0),
                        'fieldRegistryActions' => (int)($registryCoverage['field_registry_actions'] ?? 0),
                        'workflowCount' => (int)($registryCoverage['workflow_count'] ?? 0),
                        'validationRules' => (int)($registryCoverage['validation_rules'] ?? 0),
                        'formulaCount' => (int)($registryCoverage['formula_count'] ?? 0),
                    ],
                ],
                'migration_gap' => [
                    'missingTableCount' => count(array_filter((array)($migrationGap['missingTables'] ?? []), 'is_array')),
                    'missingColumnCount' => count(array_filter((array)($migrationGap['missingColumns'] ?? []), 'is_array')),
                    'missingConstraintCount' => count(array_filter((array)($migrationGap['missingConstraints'] ?? []), 'is_array')),
                ],
                'operational_blind_spot_report' => [
                    'generatedAt' => (string)($blindSpotReport['_meta']['generatedAt'] ?? ''),
                    'summary' => [
                        'scenarioCount' => (int)($blindSpotReport['summary']['scenario_count'] ?? 0),
                        'critical' => (int)($blindSpotReport['summary']['critical'] ?? 0),
                        'high' => (int)($blindSpotReport['summary']['high'] ?? 0),
                        'medium' => (int)($blindSpotReport['summary']['medium'] ?? 0),
                        'watch' => (int)($blindSpotReport['summary']['watch'] ?? 0),
                    ],
                ],
                'operational_stress_report' => [
                    'generatedAt' => (string)($stressReport['_meta']['generatedAt'] ?? ''),
                    'summary' => [
                        'scenarioCount' => (int)($stressReport['summary']['scenario_count'] ?? 0),
                        'critical' => (int)($stressReport['summary']['critical'] ?? 0),
                        'high' => (int)($stressReport['summary']['high'] ?? 0),
                        'medium' => (int)($stressReport['summary']['medium'] ?? 0),
                        'watch' => (int)($stressReport['summary']['watch'] ?? 0),
                    ],
                ],
                'global_capability_audit' => [
                    'generatedAt' => (string)($globalCapabilityAudit['_meta']['generatedAt'] ?? ''),
                    'summary' => [
                        'capabilityCount' => (int)($globalCapabilityAudit['summary']['capability_count'] ?? 0),
                        'covered' => (int)($globalCapabilityAudit['summary']['covered'] ?? 0),
                        'gap' => (int)($globalCapabilityAudit['summary']['gap'] ?? 0),
                        'conditionalExtension' => (int)($globalCapabilityAudit['summary']['conditional_extension'] ?? 0),
                        'blockingGapCount' => (int)($globalCapabilityAudit['summary']['blocking_gap_count'] ?? 0),
                        'frontendReady' => (bool)($globalCapabilityAudit['summary']['frontend_ready'] ?? false),
                    ],
                ],
            ],
            'audits' => [
                'blind_spots' => $blindSpotAudit,
                'stress' => $stressAudit,
                'global_capabilities' => $globalCapabilityAuditSummary,
            ],
            'operational' => $operational,
            'highlights' => $highlights,
            'domains' => $domains,
            'lists' => [
                'apis' => $apis,
                'tables' => $tables,
                'schemas' => $blueprints,
                'variables' => $variables,
                'designs' => $designs,
                'releases' => $releases,
            ],
            'save_policy' => $savePolicy,
            'actions' => $this->buildActionCatalog(),
        ];
    }

    private function registryPath(string $name): string
    {
        return $this->registryDir . '/' . $name . '.json';
    }

    private function contractsPath(string $name): string
    {
        return $this->contractsDir . '/' . ltrim($name, '/');
    }

    private function schemaStudioPath(string $segment): string
    {
        return $this->schemaStudioDir . '/' . ltrim($segment, '/');
    }

    private function relativePath(string $path): string
    {
        $normalizedPath = $this->normalizeFilesystemPath($path);
        $rootResolved = realpath($this->rootDir);
        if ($rootResolved === false) {
            throw new \RuntimeException('Path traversal detected: ' . $path);
        }

        $rootResolved = $this->normalizeFilesystemPath($rootResolved);
        $resolved = realpath($normalizedPath);
        $candidate = $resolved === false
            ? $this->resolveMissingPath($normalizedPath, $rootResolved)
            : $this->normalizeFilesystemPath($resolved);

        if (!$this->isPathWithinRoot($candidate, $rootResolved)) {
            throw new \RuntimeException('Path traversal detected: ' . $path);
        }

        if ($candidate === $rootResolved) {
            return '';
        }

        return ltrim(substr($candidate, strlen($rootResolved) + 1), '/');
    }

    private function normalizeFilesystemPath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        if ($path !== '/') {
            $path = rtrim($path, '/');
        }

        return $path;
    }

    /**
     * Resolve the deepest existing parent, then append the missing tail.
     *
     * This keeps traversal protection effective for missing registry artifacts:
     * symlinked parents and existing ".." parents are resolved with realpath(),
     * while legitimate not-yet-generated files under the project root can still
     * be represented in inventory payloads.
     */
    private function resolveMissingPath(string $path, string $rootResolved): string
    {
        $candidate = str_starts_with($path, '/') ? $path : $rootResolved . '/' . ltrim($path, '/');
        $missingTail = [];

        while (!file_exists($candidate)) {
            $missingTail[] = basename($candidate);
            $parent = dirname($candidate);
            if ($parent === $candidate || $parent === '' || $parent === '.') {
                break;
            }
            $candidate = $parent;
        }

        $existingParent = realpath($candidate);
        if ($existingParent === false) {
            throw new \RuntimeException('Path traversal detected: ' . $path);
        }

        $resolved = $this->normalizeFilesystemPath($existingParent);
        foreach (array_reverse($missingTail) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                $resolved = $this->normalizeFilesystemPath(dirname($resolved));
                continue;
            }
            $resolved .= '/' . $segment;
        }

        return $this->normalizeFilesystemPath($resolved);
    }

    private function isPathWithinRoot(string $path, string $root): bool
    {
        if ($root === '/') {
            return str_starts_with($path, '/');
        }

        return $path === $root || str_starts_with($path, $root . '/');
    }

    private function readJson(string $path): array
    {
        if (function_exists('read_json_file')) {
            $data = read_json_file($path);
            return is_array($data) ? $data : [];
        }

        if (!is_file($path)) {
            return [];
        }

        $decoded = json_decode((string)file_get_contents($path), true);
        return is_array($decoded) ? $decoded : [];
    }

    private function readRelationMapLight(): array
    {
        $path = $this->registryPath('relation-map');
        $meta = $this->extractTopLevelJsonSection($path, '_meta');
        $entities = $this->extractTopLevelJsonSection($path, 'entities');

        if ($meta === [] && $entities === []) {
            return $this->readJson($path);
        }

        return [
            '_meta' => $meta,
            'entities' => $entities,
        ];
    }

    private function readEndpointCatalogWorkspace(): array
    {
        $indexPath = $this->registryPath('endpoint-catalog-index');
        $index = $this->readJson($indexPath);
        if (is_array($index['rows'] ?? null) && $index['rows'] !== []) {
            return $index;
        }

        return $this->readJson($this->registryPath('endpoint-catalog'));
    }

    /**
     * Read only top-level metadata sections from large registry artifacts.
     *
     * Data Schema summary needs artifact freshness and release posture, not the
     * full endpoint/table projection payload. Decoding multi-megabyte registry
     * bodies in every admin request can exceed the PHP-FPM 256MB memory budget.
     *
     * @param list<string> $sections
     * @return array<string, mixed>
     */
    private function readArtifactEnvelope(string $path, array $sections): array
    {
        $payload = [];
        foreach ($sections as $section) {
            $key = trim((string)$section);
            if ($key === '') {
                continue;
            }
            $value = $this->extractTopLevelJsonSection($path, $key);
            if ($value !== []) {
                $payload[$key] = $value;
            }
        }

        return $payload;
    }

    private function extractTopLevelJsonSection(string $path, string $section): array
    {
        if (!is_file($path)) {
            return [];
        }

        $handle = @fopen($path, 'rb');
        if (!is_resource($handle)) {
            return [];
        }

        $target = '"' . $section . '"';
        $targetLength = strlen($target);
        $matchIndex = 0;
        $foundKey = false;
        $foundColon = false;
        $capture = false;
        $buffer = '';
        $depth = 0;
        $inString = false;
        $escape = false;

        try {
            while (!feof($handle)) {
                $chunk = fread($handle, 8192);
                if (!is_string($chunk) || $chunk === '') {
                    continue;
                }

                $length = strlen($chunk);
                for ($i = 0; $i < $length; $i++) {
                    $char = $chunk[$i];

                    if (!$foundKey) {
                        if ($char === $target[$matchIndex]) {
                            $matchIndex++;
                            if ($matchIndex === $targetLength) {
                                $foundKey = true;
                                $matchIndex = 0;
                            }
                            continue;
                        }

                        $matchIndex = ($char === $target[0]) ? 1 : 0;
                        continue;
                    }

                    if (!$foundColon) {
                        if ($char === ':') {
                            $foundColon = true;
                        }
                        continue;
                    }

                    if (!$capture) {
                        if (ctype_space($char)) {
                            continue;
                        }
                        if ($char !== '{' && $char !== '[') {
                            return [];
                        }
                        $capture = true;
                        $buffer = $char;
                        $depth = 1;
                        $inString = false;
                        $escape = false;
                        continue;
                    }

                    $buffer .= $char;

                    if ($inString) {
                        if ($escape) {
                            $escape = false;
                            continue;
                        }
                        if ($char === '\\') {
                            $escape = true;
                            continue;
                        }
                        if ($char === '"') {
                            $inString = false;
                        }
                        continue;
                    }

                    if ($char === '"') {
                        $inString = true;
                        continue;
                    }

                    if ($char === '{' || $char === '[') {
                        $depth++;
                        continue;
                    }

                    if ($char === '}' || $char === ']') {
                        $depth--;
                        if ($depth === 0) {
                            $decoded = json_decode($buffer, true);
                            return is_array($decoded) ? $decoded : [];
                        }
                    }
                }
            }
        } finally {
            fclose($handle);
        }

        return [];
    }

    private function ensureMemoryBudget(string $target): void
    {
        $current = (string)ini_get('memory_limit');
        $currentBytes = $this->memoryLimitToBytes($current);
        $targetBytes = $this->memoryLimitToBytes($target);

        if ($targetBytes <= 0) {
            return;
        }
        if ($currentBytes === -1 || $currentBytes >= $targetBytes) {
            return;
        }

        @ini_set('memory_limit', $target);
    }

    private function memoryLimitToBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }
        if ($value === '-1') {
            return -1;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float)$value;
        switch ($unit) {
            case 'g':
                return (int)round($number * 1024 * 1024 * 1024);
            case 'm':
                return (int)round($number * 1024 * 1024);
            case 'k':
                return (int)round($number * 1024);
            default:
                return (int)round($number);
        }
    }

    private function humanize(string $value): string
    {
        $label = str_replace(['_', '-'], ' ', trim($value));
        $label = preg_replace('/\s+/', ' ', $label) ?? $label;
        return ucwords($label);
    }

    private function scalarOrJoined(mixed $value, string $separator = ', '): string
    {
        if (is_scalar($value)) {
            return trim((string)$value);
        }

        if (!is_array($value)) {
            return '';
        }

        $items = [];
        foreach ($value as $item) {
            if (!is_scalar($item)) {
                continue;
            }
            $text = trim((string)$item);
            if ($text === '') {
                continue;
            }
            $items[] = $text;
        }

        return implode($separator, $items);
    }

    /**
     * @return list<string>
     */
    private function scalarStringList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        $rows = [];
        foreach ($value as $item) {
            if (!is_scalar($item)) {
                continue;
            }
            $text = trim((string)$item);
            if ($text === '') {
                continue;
            }
            $rows[] = $text;
        }

        return array_values(array_unique($rows));
    }

    /**
     * @param mixed $keyGroups list<list<string>>
     * @param list<string> $expectedFields
     */
    private function keySequenceExists(mixed $keyGroups, array $expectedFields): bool
    {
        $expected = array_values(array_filter($expectedFields, static fn(string $field): bool => $field !== ''));
        if ($expected === [] || !is_array($keyGroups)) {
            return false;
        }

        foreach ($keyGroups as $group) {
            if (!is_array($group)) {
                continue;
            }
            $candidate = array_values(array_filter($group, 'is_string'));
            if ($candidate === $expected) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, array<string, mixed>> $documents
     * @return array<string, mixed>
     */
    private function buildArtifactInventory(array $documents): array
    {
        $specs = [
            'endpoint_catalog' => [
                'label' => 'Endpoint catalog',
                'category' => 'runtime',
                'path' => $this->registryPath('endpoint-catalog'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('table-registry'),
                    $this->registryPath('data-fields'),
                    $this->registryPath('api-params'),
                    $this->rootDir . '/mom/tools/registry/generate-module-builder-registry.mjs',
                    $this->rootDir . '/mom/api/controllers/GenericCrudController.php',
                ],
            ],
            'endpoint_catalog_index' => [
                'label' => 'Endpoint catalog index',
                'category' => 'runtime',
                'path' => $this->registryPath('endpoint-catalog-index'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-catalog'),
                ],
            ],
            'relation_map' => [
                'label' => 'Relation map',
                'category' => 'runtime',
                'path' => $this->registryPath('relation-map'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('table-registry'),
                ],
            ],
            'registry_quality' => [
                'label' => 'Registry quality report',
                'category' => 'quality',
                'path' => $this->registryPath('registry-quality-report'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('relation-map'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('schema-library'),
                    $this->configDir . '/variable_library.json',
                ],
            ],
            'table_registry' => [
                'label' => 'System contract registry (generated)',
                'category' => 'authority',
                'path' => $this->registryPath('table-registry'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->rootDir . '/mom/database/schema.sql',
                    $this->rootDir . '/mom/database/migrations/*.sql',
                ],
            ],
            'registry_authority_standard' => [
                'label' => 'Enterprise registry authority standard',
                'category' => 'reference',
                'path' => $this->contractsPath('registry-authority-standard.json'),
                'targetAgeSeconds' => 2592000,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('schemas/registry-authority-standard.schema.json'),
                ],
            ],
            'table_governance_overlay' => [
                'label' => 'Table governance overlay',
                'category' => 'authority',
                'path' => $this->registryPath('table-governance-overlay'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('table-registry'),
                    $this->registryPath('endpoint-governance-classification'),
                    $this->contractsPath('object-index.json'),
                    $this->contractsPath('state-model-index.json'),
                    $this->contractsPath('event-index.json'),
                    $this->contractsPath('registry-authority-standard.json'),
                ],
            ],
            'endpoint_governance_classification' => [
                'label' => 'Endpoint governance classification',
                'category' => 'authority',
                'path' => $this->registryPath('endpoint-governance-classification'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-catalog-index'),
                    $this->registryPath('table-registry'),
                    $this->contractsPath('registry-authority-standard.json'),
                ],
            ],
            'destructive_endpoint_quarantine' => [
                'label' => 'Destructive endpoint quarantine',
                'category' => 'authority',
                'path' => $this->registryPath('destructive-endpoint-quarantine'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-governance-classification'),
                    $this->contractsPath('registry-authority-standard.json'),
                ],
            ],
            'command_runtime_bindings' => [
                'label' => 'Command runtime bindings',
                'category' => 'authority',
                'path' => $this->registryPath('command-runtime-bindings'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->contractsPath('command-index.json'),
                    $this->contractsPath('object-index.json'),
                    $this->registryPath('endpoint-catalog-index'),
                ],
            ],
            'enterprise_event_contract_map' => [
                'label' => 'Enterprise event contract map',
                'category' => 'authority',
                'path' => $this->registryPath('enterprise-event-contract-map'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->contractsPath('event-index.json'),
                    $this->registryPath('table-registry'),
                    $this->contractsPath('registry-authority-standard.json'),
                ],
            ],
            'ai_authority_chain' => [
                'label' => 'AI authority chain',
                'category' => 'authority',
                'path' => $this->contractsPath('ai-authority-chain.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->contractsPath('registry-authority-standard.json'),
                    $this->registryPath('endpoint-governance-classification'),
                    $this->registryPath('table-governance-overlay'),
                    $this->registryPath('destructive-endpoint-quarantine'),
                ],
            ],
            'enterprise_registry_doctor_report' => [
                'label' => 'Enterprise registry doctor report',
                'category' => 'quality',
                'path' => $this->registryPath('enterprise-registry-doctor-report'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->contractsPath('registry-authority-standard.json'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('table-governance-overlay'),
                    $this->registryPath('endpoint-catalog-index'),
                    $this->registryPath('endpoint-governance-classification'),
                    $this->registryPath('destructive-endpoint-quarantine'),
                    $this->registryPath('command-runtime-bindings'),
                    $this->contractsPath('command-index.json'),
                    $this->contractsPath('event-index.json'),
                    $this->contractsPath('ai-authority-chain.json'),
                ],
            ],
            'enterprise_frontend_simulation_report' => [
                'label' => 'Enterprise frontend simulation report',
                'category' => 'quality',
                'path' => $this->registryPath('enterprise-frontend-simulation-report'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('enterprise-registry-doctor-report'),
                    $this->registryPath('endpoint-governance-classification'),
                    $this->registryPath('table-governance-overlay'),
                    $this->registryPath('destructive-endpoint-quarantine'),
                    $this->registryPath('command-runtime-bindings'),
                    $this->contractsPath('command-index.json'),
                    $this->contractsPath('event-index.json'),
                ],
            ],
            'system_contract_runtime_projections' => [
                'label' => 'System contract runtime projections',
                'category' => 'authority',
                'path' => $this->registryPath('system-contract-runtime-projections'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'segmentManifestPath' => $this->registryPath('system-contract-runtime-projections-segments'),
                'dependencyPaths' => [
                    $this->registryPath('table-registry'),
                    $this->registryPath('relation-map'),
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('workflow-library'),
                    $this->registryPath('schema-authority-summary'),
                    $this->registryPath('global-erp-mom-capability-audit'),
                ],
            ],
            'system_contract_runtime_projection_segments' => [
                'label' => 'System contract runtime projection segment manifest',
                'category' => 'authority',
                'path' => $this->registryPath('system-contract-runtime-projections-segments'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('system-contract-runtime-projections'),
                ],
            ],
            'system_contract_registry_contracts' => [
                'label' => 'System contract registry contracts',
                'category' => 'authority',
                'path' => $this->registryPath('system-contract-registry-contracts'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('table-registry'),
                    $this->registryPath('relation-map'),
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('workflow-library'),
                ],
            ],
            'system_contract_diagnostics' => [
                'label' => 'System contract diagnostics',
                'category' => 'authority',
                'path' => $this->registryPath('system-contract-diagnostics'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('system-contract-runtime-projections'),
                    $this->registryPath('system-contract-registry-contracts'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('relation-map'),
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('workflow-library'),
                    $this->registryPath('schema-authority-summary'),
                    $this->registryPath('global-erp-mom-capability-audit'),
                ],
            ],
            'system_contract_manifest' => [
                'label' => 'System contract manifest',
                'category' => 'authority',
                'path' => $this->registryPath('system-contract-manifest'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('system-contract-runtime-projections'),
                    $this->registryPath('system-contract-registry-contracts'),
                    $this->registryPath('system-contract-diagnostics'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('workflow-library'),
                ],
            ],
            'contract_glossary' => [
                'label' => 'Business contract glossary',
                'category' => 'authority',
                'path' => $this->contractsPath('glossary.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [],
            ],
            'contract_domain_map' => [
                'label' => 'Business contract domain map',
                'category' => 'authority',
                'path' => $this->contractsPath('domain-map.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('glossary.json'),
                ],
            ],
            'contract_authority_report' => [
                'label' => 'Business contract authority report',
                'category' => 'authority',
                'path' => $this->contractsPath('authority-report.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('domain-map.json'),
                    $this->contractsPath('object-index.json'),
                ],
            ],
            'contract_package_index' => [
                'label' => 'Business contract package index',
                'category' => 'authority',
                'path' => $this->contractsPath('package-index.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('authority-report.json'),
                    $this->contractsPath('domain-map.json'),
                ],
            ],
            'contract_object_index' => [
                'label' => 'Business contract object index',
                'category' => 'authority',
                'path' => $this->contractsPath('object-index.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('package-index.json'),
                    $this->contractsPath('domain-map.json'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('endpoint-catalog'),
                ],
            ],
            'contract_state_models' => [
                'label' => 'Business contract state models',
                'category' => 'authority',
                'path' => $this->contractsPath('state-model-index.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('object-index.json'),
                ],
            ],
            'contract_deprecation_ledger' => [
                'label' => 'Business contract deprecation ledger',
                'category' => 'authority',
                'path' => $this->contractsPath('deprecation-ledger.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('object-index.json'),
                ],
            ],
            'contract_migration_manifest' => [
                'label' => 'Business contract migration manifest',
                'category' => 'authority',
                'path' => $this->contractsPath('migration-manifest.json'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->contractsPath('object-index.json'),
                    $this->contractsPath('state-model-index.json'),
                    $this->contractsPath('deprecation-ledger.json'),
                ],
            ],
            'schema_diagnostics' => [
                'label' => 'Workspace design diagnostics',
                'category' => 'design_workspace',
                'path' => $this->registryPath('schema-studio-diagnostics'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->schemaStudioPath('designs/workspace.json'),
                    $this->schemaStudioPath('snapshots/workspace.baseline.json'),
                ],
            ],
            'schema_manifest' => [
                'label' => 'Workspace design enterprise manifest',
                'category' => 'design_workspace',
                'path' => $this->registryPath('schema-studio-enterprise-manifest'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->registryPath('schema-studio-runtime-projections'),
                    $this->registryPath('schema-studio-registry-contracts'),
                    $this->registryPath('schema-studio-diagnostics'),
                    $this->schemaStudioPath('designs/workspace.json'),
                    $this->schemaStudioPath('snapshots/workspace.baseline.json'),
                ],
            ],
            'registry_manifest' => [
                'label' => 'Registry manifest',
                'category' => 'quality',
                'path' => $this->registryPath('registry-manifest'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('relation-map'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('schema-library'),
                    $this->configDir . '/variable_library.json',
                ],
            ],
            'schema_authority' => [
                'label' => 'Schema authority summary',
                'category' => 'authority',
                'path' => $this->registryPath('schema-authority-summary'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('table-registry'),
                    $this->rootDir . '/mom/database/schema.sql',
                    $this->rootDir . '/mom/database/migrations/*.sql',
                ],
            ],
            'migration_gap' => [
                'label' => 'Migration gap report',
                'category' => 'reference',
                'path' => $this->registryPath('migration-gap-report'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->registryPath('table-registry'),
                    $this->registryPath('relation-map'),
                ],
            ],
            'data_fields_index' => [
                'label' => 'Data fields index',
                'category' => 'runtime',
                'path' => $this->registryPath('data-fields-index'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => false,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('api-params'),
                ],
            ],
            'blind_spot_report' => [
                'label' => 'Operational blind-spot report',
                'category' => 'quality',
                'path' => $this->registryPath('operational-blind-spot-report'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('operational-blind-spot-catalog'),
                    $this->registryPath('wave0-governance-policy'),
                    $this->registryPath('wave0-governance-report'),
                    $this->registryPath('canonical-backend-standardization-catalog'),
                    $this->registryPath('endpoint-catalog'),
                ],
            ],
            'stress_report' => [
                'label' => 'Operational stress report',
                'category' => 'quality',
                'path' => $this->registryPath('operational-stress-report'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('operational-stress-governance-policy'),
                    $this->registryPath('operational-stress-catalog'),
                    $this->registryPath('operational-blind-spot-report'),
                    $this->registryPath('wave1-lifecycle-report'),
                    $this->registryPath('wave-gap-ledger'),
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('canonical-backend-standardization-catalog'),
                ],
            ],
            'global_capability_audit' => [
                'label' => 'Global ERP+MOM capability audit',
                'category' => 'quality',
                'path' => $this->registryPath('global-erp-mom-capability-audit'),
                'targetAgeSeconds' => 7200,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('global-erp-mom-capability-catalog'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('workflow-library'),
                    $this->rootDir . '/mom/api/openapi.yaml',
                    $this->rootDir . '/mom/contracts/object-index.json',
                    $this->rootDir . '/mom/contracts/package-index.json',
                ],
            ],
        ];

        $items = [];
        $allAges = [];
        $releaseAges = [];
        $largestId = '';
        $largestSize = 0;
        $knownDependencyTimestamps = [];

        foreach ($specs as $id => $spec) {
            $path = (string)$spec['path'];
            if ($path === '') {
                continue;
            }
            $knownDependencyTimestamps[$path] = $this->artifactTimestampForPath(
                $path,
                (array)($documents[$id] ?? [])
            );
        }

        foreach ($specs as $id => $spec) {
            $item = $this->artifactInventoryItem(
                $id,
                $spec['label'],
                $spec['category'],
                $spec['path'],
                (int)$spec['targetAgeSeconds'],
                (array)($documents[$id] ?? []),
                !empty($spec['requiredForRelease']),
                array_values(array_filter((array)$spec['dependencyPaths'], 'is_string')),
                $knownDependencyTimestamps,
                (string)($spec['segmentManifestPath'] ?? '')
            );
            $items[] = $item;
            if (($item['exists'] ?? false) === true && is_int($item['ageSeconds'] ?? null)) {
                $allAges[] = (int)$item['ageSeconds'];
                if (!empty($item['requiredForRelease'])) {
                    $releaseAges[] = (int)$item['ageSeconds'];
                }
            }
            if ((int)($item['sizeBytes'] ?? 0) > $largestSize) {
                $largestId = (string)$item['id'];
                $largestSize = (int)$item['sizeBytes'];
            }
        }

        usort($items, static fn(array $a, array $b): int => [$a['category'], $a['label']] <=> [$b['category'], $b['label']]);

        $missingCount = 0;
        $agingCount = 0;
        $staleCount = 0;
        $dependencyOutdatedCount = 0;
        $dependencyMissingCount = 0;
        foreach ($items as $item) {
            $status = (string)($item['status'] ?? '');
            if ($status === 'missing') {
                $missingCount += 1;
            } elseif ($status === 'aging') {
                $agingCount += 1;
            } elseif ($status === 'stale') {
                $staleCount += 1;
            }
            if ((string)($item['dependencyStatus'] ?? '') === 'outdated') {
                $dependencyOutdatedCount += 1;
            }
            if ((string)($item['dependencyStatus'] ?? '') === 'source_missing') {
                $dependencyMissingCount += 1;
            }
        }

        $allDriftSeconds = $allAges === [] ? 0 : (max($allAges) - min($allAges));
        $driftSeconds = $releaseAges === [] ? 0 : (max($releaseAges) - min($releaseAges));

        return [
            'summary' => [
                'totalCount' => count($items),
                'missingCount' => $missingCount,
                'agingCount' => $agingCount,
                'staleCount' => $staleCount,
                'dependencyOutdatedCount' => $dependencyOutdatedCount,
                'dependencyMissingCount' => $dependencyMissingCount,
                'driftSeconds' => $driftSeconds,
                'allArtifactDriftSeconds' => $allDriftSeconds,
                'driftLabel' => $driftSeconds > 0 ? $this->humanDuration($driftSeconds) : '0s',
                'allArtifactDriftLabel' => $allDriftSeconds > 0 ? $this->humanDuration($allDriftSeconds) : '0s',
                'driftStatus' => $driftSeconds >= self::ARTIFACT_DRIFT_BLOCK_SECONDS
                    ? 'blocked'
                    : ($driftSeconds >= self::ARTIFACT_DRIFT_WARN_SECONDS ? 'warn' : 'aligned'),
                'largestArtifactId' => $largestId,
                'largestArtifactSizeBytes' => $largestSize,
            ],
            'items' => $items,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function artifactInventoryItem(string $id, string $label, string $category, string $path, int $targetAgeSeconds, array $payload, bool $requiredForRelease, array $dependencyPaths, array $knownDependencyTimestamps = [], string $segmentManifestPath = ''): array
    {
        clearstatcache(true, $path);
        $exists = is_file($path);
        $sizeBytes = $exists ? (int)(filesize($path) ?: 0) : 0;
        $mtime = $exists ? (int)(filemtime($path) ?: 0) : 0;
        $generatedAt = $this->extractArtifactGeneratedAt($payload);
        $basisTimestamp = $this->artifactTimestampForPath($path, $payload);
        $ageSeconds = $basisTimestamp === null ? null : max(0, time() - $basisTimestamp);
        $latestDependencyTimestamp = null;
        $latestDependencyPath = '';
        $missingDependencyPaths = [];
        foreach ($dependencyPaths as $dependencyPath) {
            if (!$this->dependencyPathExists($dependencyPath)) {
                $missingDependencyPaths[] = $this->relativePath($dependencyPath);
                continue;
            }
            $dependencyTimestamp = $this->dependencyTimestampForPath($dependencyPath, $knownDependencyTimestamps);
            $timestamp = $dependencyTimestamp['timestamp'];
            if (!is_int($timestamp)) {
                continue;
            }
            if ($latestDependencyTimestamp === null || $timestamp > $latestDependencyTimestamp) {
                $latestDependencyTimestamp = $timestamp;
                $latestDependencyPath = (string)$dependencyTimestamp['path'];
            }
        }
        $sourceDriftSeconds = ($basisTimestamp !== null && $latestDependencyTimestamp !== null && $latestDependencyTimestamp > $basisTimestamp)
            ? max(0, $latestDependencyTimestamp - $basisTimestamp)
            : 0;
        $dependencyStatus = $dependencyPaths === []
            ? 'source_authority'
            : ($missingDependencyPaths !== [] ? 'source_missing' : ($sourceDriftSeconds > self::ARTIFACT_DEPENDENCY_GRACE_SECONDS ? 'outdated' : 'aligned'));
        $segmentation = $this->artifactSegmentationStatus($path, $segmentManifestPath, $sizeBytes);

        $status = 'missing';
        if ($exists) {
            $status = 'fresh';
            if ($ageSeconds !== null && $ageSeconds > $targetAgeSeconds) {
                $status = $ageSeconds > ($targetAgeSeconds * 2) ? 'stale' : 'aging';
            }
        }

        return [
            'id' => $id,
            'label' => $label,
            'category' => $category,
            'path' => $this->relativePath($path),
            'exists' => $exists,
            'status' => $status,
            'requiredForRelease' => $requiredForRelease,
            'targetAgeSeconds' => $targetAgeSeconds,
            'generatedAt' => $generatedAt,
            'fileMtime' => $mtime > 0 ? gmdate('c', $mtime) : '',
            'ageSeconds' => $ageSeconds,
            'ageLabel' => $ageSeconds === null ? 'unknown' : $this->humanDuration($ageSeconds),
            'sizeBytes' => $sizeBytes,
            'sizeLabel' => $this->humanBytes($sizeBytes),
            'dependencyStatus' => $dependencyStatus,
            'segmented' => !empty($segmentation['ready']),
            'segmentation' => $segmentation,
            'missingDependencyCount' => count($missingDependencyPaths),
            'missingDependencyPaths' => array_slice($missingDependencyPaths, 0, 8),
            'sourceDriftSeconds' => $sourceDriftSeconds,
            'sourceDriftLabel' => $sourceDriftSeconds > 0 ? $this->humanDuration($sourceDriftSeconds) : '0s',
            'latestDependencyAt' => $latestDependencyTimestamp !== null ? gmdate('c', $latestDependencyTimestamp) : '',
            'latestDependencyPath' => $latestDependencyPath !== '' ? $this->relativePath($latestDependencyPath) : '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function artifactSegmentationStatus(string $artifactPath, string $manifestPath, int $artifactSizeBytes): array
    {
        if ($manifestPath === '') {
            return [
                'ready' => false,
                'status' => 'not_configured',
                'manifestPath' => '',
                'reason' => 'No segment manifest is configured for this artifact.',
            ];
        }

        $relativeManifestPath = $this->relativePath($manifestPath);
        if (!is_file($manifestPath)) {
            return [
                'ready' => false,
                'status' => 'missing_manifest',
                'manifestPath' => $relativeManifestPath,
                'reason' => 'The configured segment manifest is missing.',
            ];
        }

        $manifest = $this->readJson($manifestPath);
        $summary = is_array($manifest['summary'] ?? null) ? $manifest['summary'] : [];
        $segments = array_values(array_filter((array)($manifest['segments'] ?? []), 'is_array'));
        $sourceArtifact = (string)($manifest['_meta']['sourceArtifact'] ?? $manifest['sourceGovernance']['fullArtifact'] ?? '');
        $sourceSha256 = (string)($manifest['_meta']['sourceSha256'] ?? '');
        $actualSourceSha256 = is_file($artifactPath) ? $this->sha256File($artifactPath) : '';
        $issues = [];

        if ($sourceArtifact !== '' && !in_array($sourceArtifact, $this->relativePathAliases($artifactPath), true)) {
            $issues[] = 'source_artifact_mismatch';
        }
        if ((int)($summary['sourceSizeBytes'] ?? $manifest['_meta']['sourceSizeBytes'] ?? 0) !== $artifactSizeBytes) {
            $issues[] = 'source_size_mismatch';
        }
        if ($sourceSha256 === '' || $actualSourceSha256 === '' || !hash_equals($sourceSha256, $actualSourceSha256)) {
            $issues[] = 'source_checksum_mismatch';
        }
        if ($segments === []) {
            $issues[] = 'segments_missing';
        }

        $largestSegmentSize = 0;
        $checkedSegments = 0;
        foreach ($segments as $segment) {
            $relativePath = trim((string)($segment['path'] ?? ''));
            $expectedSize = (int)($segment['sizeBytes'] ?? 0);
            $expectedSha256 = (string)($segment['sha256'] ?? '');
            if ($relativePath === '' || $expectedSha256 === '') {
                $issues[] = 'segment_metadata_missing';
                continue;
            }
            $segmentPath = $this->workspacePath($relativePath);
            if ($segmentPath === '' || !is_file($segmentPath)) {
                $issues[] = 'segment_file_missing';
                continue;
            }
            $actualSize = (int)(filesize($segmentPath) ?: 0);
            $largestSegmentSize = max($largestSegmentSize, $actualSize);
            if ($expectedSize > 0 && $expectedSize !== $actualSize) {
                $issues[] = 'segment_size_mismatch';
                continue;
            }
            if (!hash_equals($expectedSha256, $this->sha256File($segmentPath))) {
                $issues[] = 'segment_checksum_mismatch';
                continue;
            }
            $checkedSegments++;
        }

        $issues = array_values(array_unique($issues));
        $ready = $issues === []
            && $checkedSegments >= 2
            && $artifactSizeBytes > 0
            && $largestSegmentSize > 0
            && $largestSegmentSize < $artifactSizeBytes;

        return [
            'ready' => $ready,
            'status' => $ready ? 'ready' : 'invalid',
            'manifestPath' => $relativeManifestPath,
            'segmentCount' => count($segments),
            'checkedSegmentCount' => $checkedSegments,
            'sourceSha256' => $sourceSha256,
            'sourceSizeBytes' => (int)($summary['sourceSizeBytes'] ?? $manifest['_meta']['sourceSizeBytes'] ?? 0),
            'largestSegmentSizeBytes' => max($largestSegmentSize, (int)($summary['largestSegmentSizeBytes'] ?? 0)),
            'largestSegmentSizeLabel' => $this->humanBytes(max($largestSegmentSize, (int)($summary['largestSegmentSizeBytes'] ?? 0))),
            'revisionGuard' => (string)($summary['revisionGuard'] ?? 'sourceSha256'),
            'targetedRebuildPolicy' => (string)($summary['targetedRebuildPolicy'] ?? ''),
            'readProfiles' => is_array($manifest['readProfiles'] ?? null) ? $manifest['readProfiles'] : [],
            'issues' => $issues,
            'reason' => $ready ? 'Segment manifest matches the full artifact checksum and all segment checksums.' : implode(', ', $issues),
        ];
    }

    private function workspacePath(string $relativePath): string
    {
        $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');
        if ($relativePath === '' || str_contains($relativePath, "\0")) {
            return '';
        }
        $candidates = [$this->rootDir . '/' . $relativePath];
        if (!str_starts_with($relativePath, 'mom/')) {
            $candidates[] = $this->rootDir . '/mom/' . $relativePath;
        }

        foreach ($candidates as $path) {
            try {
                $this->relativePath($path);
            } catch (Throwable) {
                continue;
            }
            if (file_exists($path)) {
                return $path;
            }
        }

        return '';
    }

    /**
     * @return list<string>
     */
    private function relativePathAliases(string $path): array
    {
        $relative = $this->relativePath($path);
        $aliases = [$relative];
        if (str_starts_with($relative, 'mom/')) {
            $aliases[] = substr($relative, 4);
        }

        return array_values(array_unique(array_filter($aliases, static fn(string $item): bool => $item !== '')));
    }

    private function sha256File(string $path): string
    {
        if (!is_file($path)) {
            return '';
        }
        $hash = hash_file('sha256', $path);
        return is_string($hash) ? $hash : '';
    }

    private function artifactTimestampForPath(string $path, array $payload = []): ?int
    {
        if (array_key_exists($path, $this->artifactTimestampCache)) {
            return $this->artifactTimestampCache[$path];
        }

        $generatedAt = $payload !== [] ? $this->extractArtifactGeneratedAt($payload) : $this->extractArtifactGeneratedAtFromPath($path);
        $generatedTimestamp = $this->isoToTimestamp($generatedAt);
        $mtime = $this->pathTimestamp($path);
        $basisTimestamp = null;
        if ($generatedTimestamp !== null && $mtime !== null) {
            $basisTimestamp = max($generatedTimestamp, $mtime);
        } else {
            $basisTimestamp = $generatedTimestamp ?? $mtime;
        }
        $this->artifactTimestampCache[$path] = $basisTimestamp;

        return $basisTimestamp;
    }

    private function dependencyPathExists(string $path): bool
    {
        if ($this->isGlobPath($path)) {
            return $this->globMatches($path) !== [];
        }

        clearstatcache(true, $path);
        return is_file($path) || is_dir($path);
    }

    /**
     * @param array<string, int|null> $knownDependencyTimestamps
     * @return array{timestamp: int|null, path: string}
     */
    private function dependencyTimestampForPath(string $path, array $knownDependencyTimestamps): array
    {
        if (array_key_exists($path, $knownDependencyTimestamps)) {
            return [
                'timestamp' => $knownDependencyTimestamps[$path],
                'path' => $path,
            ];
        }

        if ($this->isGlobPath($path)) {
            $latestTimestamp = null;
            $latestPath = $path;
            foreach ($this->globMatches($path) as $match) {
                $candidate = $this->concreteDependencyTimestamp($match);
                $timestamp = $candidate['timestamp'];
                if (!is_int($timestamp)) {
                    continue;
                }
                if ($latestTimestamp === null || $timestamp > $latestTimestamp) {
                    $latestTimestamp = $timestamp;
                    $latestPath = (string)$candidate['path'];
                }
            }

            return [
                'timestamp' => $latestTimestamp,
                'path' => $latestPath,
            ];
        }

        return $this->concreteDependencyTimestamp($path);
    }

    /**
     * @return array{timestamp: int|null, path: string}
     */
    private function concreteDependencyTimestamp(string $path): array
    {
        clearstatcache(true, $path);
        if (is_file($path)) {
            return [
                'timestamp' => $this->artifactTimestampForPath($path),
                'path' => $path,
            ];
        }

        if (!is_dir($path)) {
            return [
                'timestamp' => null,
                'path' => $path,
            ];
        }

        $latestTimestamp = (int)(filemtime($path) ?: 0);
        $latestPath = $path;

        try {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $fileInfo) {
                if (!$fileInfo instanceof \SplFileInfo || !$fileInfo->isFile()) {
                    continue;
                }
                $timestamp = (int)$fileInfo->getMTime();
                if ($timestamp > $latestTimestamp) {
                    $latestTimestamp = $timestamp;
                    $latestPath = str_replace('\\', '/', $fileInfo->getPathname());
                }
            }
        } catch (Throwable) {
            // Directory dependency metadata is diagnostic only; artifact existence is validated separately.
        }

        return [
            'timestamp' => $latestTimestamp > 0 ? $latestTimestamp : null,
            'path' => $latestPath,
        ];
    }

    /**
     * @return list<string>
     */
    private function globMatches(string $path): array
    {
        $matches = glob($path, GLOB_NOSORT);
        if (!is_array($matches)) {
            return [];
        }

        return array_values(array_filter($matches, static fn(string $match): bool => is_file($match) || is_dir($match)));
    }

    private function isGlobPath(string $path): bool
    {
        return strpbrk($path, '*?[') !== false;
    }

    private function extractArtifactGeneratedAtFromPath(string $path): string
    {
        if (!is_file($path) || !is_readable($path)) {
            return '';
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if ($ext !== 'json') {
            return '';
        }

        $payload = $this->readJson($path);
        if ($payload === []) {
            return '';
        }

        return $this->extractArtifactGeneratedAt($payload);
    }

    private function extractArtifactGeneratedAt(array $payload): string
    {
        $candidates = [
            $payload['_meta']['generatedAt'] ?? null,
            $payload['_meta']['generated_at'] ?? null,
            $payload['_meta']['updatedAt'] ?? null,
            $payload['generated'] ?? null,
            $payload['schema_authority']['declared_at'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (!is_scalar($candidate)) {
                continue;
            }
            $value = trim((string)$candidate);
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function isoToTimestamp(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        $ts = strtotime($value);
        return $ts === false ? null : $ts;
    }

    private function pathTimestamp(string $path): ?int
    {
        clearstatcache(true, $path);
        if (!is_file($path)) {
            return null;
        }
        $mtime = (int)(filemtime($path) ?: 0);
        return $mtime > 0 ? $mtime : null;
    }

    private function humanDuration(int $seconds): string
    {
        if ($seconds < 60) {
            return $seconds . 's';
        }
        if ($seconds < 3600) {
            return (string)round($seconds / 60) . 'm';
        }
        if ($seconds < 86400) {
            return (string)round($seconds / 3600, 1) . 'h';
        }
        return (string)round($seconds / 86400, 1) . 'd';
    }

    private function humanBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 1) . ' GB';
        }
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . ' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }

    private function buildConnectionSummary(array $dbProbe, array $tables): array
    {
        $structuralDrift = [];
        $missingColumnCount = 0;
        $unexpectedColumnCount = 0;
        $typeDriftCount = 0;
        $pkDriftCount = 0;
        $authorityTableCount = count($tables);

        foreach ($tables as $table) {
            if (!is_array($table) || empty($table['db_present'])) {
                continue;
            }
            $missingColumns = array_values(array_filter((array)($table['missing_columns'] ?? []), 'is_scalar'));
            $unexpectedColumns = array_values(array_filter((array)($table['unexpected_columns'] ?? []), 'is_scalar'));
            $typeDrifts = array_values(array_filter((array)($table['type_drifts'] ?? []), 'is_array'));
            $pkDrift = !empty($table['pk_drift']);
            if ($missingColumns === [] && $unexpectedColumns === [] && $typeDrifts === [] && !$pkDrift) {
                continue;
            }
            $missingColumnCount += count($missingColumns);
            $unexpectedColumnCount += count($unexpectedColumns);
            $typeDriftCount += count($typeDrifts);
            if ($pkDrift) {
                $pkDriftCount += 1;
            }
            $structuralDrift[] = [
                'table' => (string)($table['key'] ?? ''),
                'label' => (string)($table['label'] ?? $table['key'] ?? ''),
                'domain' => (string)($table['domain'] ?? ''),
                'missing_columns' => array_slice($missingColumns, 0, 8),
                'unexpected_columns' => array_slice($unexpectedColumns, 0, 8),
                'type_drifts' => array_slice($typeDrifts, 0, 8),
                'pk_drift' => $pkDrift,
            ];
        }

        usort($structuralDrift, static function (array $a, array $b): int {
            $aScore = count((array)$a['missing_columns']) + count((array)$a['unexpected_columns']) + count((array)$a['type_drifts']) + (!empty($a['pk_drift']) ? 1 : 0);
            $bScore = count((array)$b['missing_columns']) + count((array)$b['unexpected_columns']) + count((array)$b['type_drifts']) + (!empty($b['pk_drift']) ? 1 : 0);
            return $bScore <=> $aScore;
        });

        $dbTarget = $this->classifyDbTarget($dbProbe, $authorityTableCount, count($structuralDrift));

        return [
            'data_layer' => (array)($dbProbe['data_layer'] ?? []),
            'db_probe_applicable' => !empty($dbProbe['db_probe_applicable']),
            'db_probe_reachable' => !empty($dbProbe['db_probe_reachable']),
            'db_probe_resolved' => !empty($dbProbe['db_probe_resolved']),
            'db_target_status' => (string)$dbTarget['status'],
            'db_target_healthy' => (bool)$dbTarget['healthy'],
            'db_target_reason' => (string)$dbTarget['reason'],
            'db_target_next_action' => (string)$dbTarget['nextAction'],
            'db_target_authority_table_count' => $authorityTableCount,
            'authority_coverage_ratio' => (float)$dbTarget['coverageRatio'],
            'configured' => !empty($dbProbe['configured']),
            'reachable' => (bool)($dbProbe['reachable'] ?? false),
            'host' => (string)($dbProbe['host'] ?? ''),
            'port' => (int)($dbProbe['port'] ?? 0),
            'database' => (string)($dbProbe['database'] ?? ''),
            'schema' => (string)($dbProbe['schema'] ?? ''),
            'runtime_path_active' => !empty($dbProbe['runtime_path_active']),
            'runtime_storage_aligned' => !empty($dbProbe['runtime_storage_aligned']),
            'db_table_count' => (int)($dbProbe['db_table_count'] ?? 0),
            'present_lookup' => (array)($dbProbe['present_lookup'] ?? []),
            'present_table_count' => (int)($dbProbe['present_table_count'] ?? 0),
            'missing_table_count' => (int)($dbProbe['missing_table_count'] ?? 0),
            'missing_tables' => array_values(array_filter((array)($dbProbe['missing_tables'] ?? []), 'is_scalar')),
            'unexpected_tables' => array_values(array_filter((array)($dbProbe['unexpected_tables'] ?? []), 'is_scalar')),
            'unexpected_table_count' => count((array)($dbProbe['unexpected_tables'] ?? [])),
            'migration_table_present' => !empty($dbProbe['migration_table_present']),
            'applied_migration_count' => (int)($dbProbe['applied_migration_count'] ?? 0),
            'migration_file_count' => (int)($dbProbe['migration_file_count'] ?? 0),
            'pending_migration_count' => (int)($dbProbe['pending_migration_count'] ?? 0),
            'pending_migrations' => array_values(array_filter((array)($dbProbe['pending_migrations'] ?? []), 'is_array')),
            'pending_migration_ids' => array_values(array_filter((array)($dbProbe['pending_migration_ids'] ?? []), 'is_scalar')),
            'applied_migration_ids' => array_values(array_filter((array)($dbProbe['applied_migration_ids'] ?? []), 'is_scalar')),
            'extra_applied_migration_ids' => array_values(array_filter((array)($dbProbe['extra_applied_migration_ids'] ?? []), 'is_scalar')),
            'latest_migration_id' => (string)($dbProbe['latest_migration_id'] ?? ''),
            'latest_migration_applied_at' => (string)($dbProbe['latest_migration_applied_at'] ?? ''),
            'structural_drift_table_count' => count($structuralDrift),
            'missing_column_count' => $missingColumnCount,
            'unexpected_column_count' => $unexpectedColumnCount,
            'type_drift_column_count' => $typeDriftCount,
            'pk_drift_table_count' => $pkDriftCount,
            'structural_drift' => array_slice($structuralDrift, 0, 20),
            'error' => (string)($dbProbe['error'] ?? ''),
        ];
    }

    /**
     * @return array{status:string, healthy:bool, reason:string, nextAction:string, coverageRatio:float}
     */
    private function classifyDbTarget(array $dbProbe, int $authorityTableCount, int $structuralDriftCount): array
    {
        $applicable = !empty($dbProbe['db_probe_applicable']);
        $reachable = !empty($dbProbe['db_probe_reachable']);
        $resolved = !empty($dbProbe['db_probe_resolved']);
        $dbTableCount = (int)($dbProbe['db_table_count'] ?? 0);
        $presentTableCount = (int)($dbProbe['present_table_count'] ?? 0);
        $missingTableCount = (int)($dbProbe['missing_table_count'] ?? 0);
        $unexpectedTableCount = count((array)($dbProbe['unexpected_tables'] ?? []));
        $migrationTablePresent = !empty($dbProbe['migration_table_present']);
        $appliedMigrationCount = (int)($dbProbe['applied_migration_count'] ?? 0);
        $migrationFileCount = (int)($dbProbe['migration_file_count'] ?? 0);
        $pendingMigrationCount = (int)($dbProbe['pending_migration_count'] ?? 0);
        $coverageRatio = $authorityTableCount > 0 ? round($presentTableCount / max(1, $authorityTableCount), 4) : 0.0;

        if (!$applicable) {
            return [
                'status' => 'not_configured',
                'healthy' => false,
                'reason' => 'No live PostgreSQL profile is configured for direct schema probing.',
                'nextAction' => 'Configure a governed DB profile before using live DB coverage as release evidence.',
                'coverageRatio' => $coverageRatio,
            ];
        }

        if (!$reachable || !$resolved) {
            return [
                'status' => 'unreachable',
                'healthy' => false,
                'reason' => 'The configured PostgreSQL target cannot be reached or resolved.',
                'nextAction' => 'Restore DB connectivity, credentials and schema search_path before trusting DB coverage.',
                'coverageRatio' => $coverageRatio,
            ];
        }

        if ($dbTableCount > 0 && !$migrationTablePresent) {
            return [
                'status' => 'untracked_live_database',
                'healthy' => false,
                'reason' => 'The target DB contains tables but has no schema_migrations authority ledger.',
                'nextAction' => 'Create a controlled migration baseline before applying schema changes.',
                'coverageRatio' => $coverageRatio,
            ];
        }

        if ($dbTableCount > 0 && $migrationTablePresent && $appliedMigrationCount === 0) {
            return [
                'status' => 'untracked_live_database',
                'healthy' => false,
                'reason' => 'The target DB contains tables but schema_migrations records zero applied migrations.',
                'nextAction' => 'Backfill or rebuild the migration baseline before treating this DB as authority.',
                'coverageRatio' => $coverageRatio,
            ];
        }

        if ($migrationFileCount > 0 && $appliedMigrationCount > 0 && $pendingMigrationCount > 0) {
            $pendingIds = array_values(array_filter((array)($dbProbe['pending_migration_ids'] ?? []), 'is_scalar'));
            $pendingPreview = array_slice(array_map('strval', $pendingIds), 0, 5);
            $reason = sprintf(
                '%d/%d migrations are recorded as applied; %d migration(s) are still pending.',
                $appliedMigrationCount,
                $migrationFileCount,
                $pendingMigrationCount
            );
            if ($missingTableCount > 0 || $structuralDriftCount > 0) {
                $reason .= sprintf(
                    ' The live DB currently has %d/%d authority tables, %d missing table(s), and %d table(s) with column or PK drift.',
                    $presentTableCount,
                    $authorityTableCount,
                    $missingTableCount,
                    $structuralDriftCount
                );
            }
            if ($pendingPreview !== []) {
                $reason .= ' Pending: ' . implode(', ', $pendingPreview) . ($pendingMigrationCount > count($pendingPreview) ? ', ...' : '') . '.';
            }

            return [
                'status' => 'migration_backlog',
                'healthy' => false,
                'reason' => $reason,
                'nextAction' => 'Apply pending migrations through mom/ops/vps/run-db-migrations.sh or mom/database/migrate.sh before trusting frontend/schema readiness.',
                'coverageRatio' => $coverageRatio,
            ];
        }

        if ($missingTableCount > 0 || ($authorityTableCount > 0 && $coverageRatio < 0.95)) {
            return [
                'status' => 'incomplete_runtime_database',
                'healthy' => false,
                'reason' => sprintf(
                    'The configured DB has %d/%d authority tables; %d are missing from the probed schema.',
                    $presentTableCount,
                    $authorityTableCount,
                    $missingTableCount
                ),
                'nextAction' => 'Run a no-data-loss schema promotion plan against the production DB or point the runtime to the governed full-schema DB after backfill.',
                'coverageRatio' => $coverageRatio,
            ];
        }

        if ($unexpectedTableCount > 0 || $structuralDriftCount > 0) {
            return [
                'status' => 'schema_drift',
                'healthy' => false,
                'reason' => sprintf(
                    'The target DB has %d unmanaged tables and %d tables with column or PK drift.',
                    $unexpectedTableCount,
                    $structuralDriftCount
                ),
                'nextAction' => 'Reconcile live DB columns, keys and unmanaged tables against migrations before release.',
                'coverageRatio' => $coverageRatio,
            ];
        }

        return [
            'status' => 'aligned',
            'healthy' => true,
            'reason' => 'The configured DB matches the runtime authority coverage checked by Data Schema.',
            'nextAction' => 'Keep migration ledger and registry artifacts refreshed on every schema change.',
            'coverageRatio' => $coverageRatio,
        ];
    }

    private function buildOperationalAuditSummary(array $report, string $idKey): array
    {
        $assessments = array_values(array_filter((array)($report['assessments'] ?? []), 'is_array'));
        $critical = [];
        $high = [];
        $medium = [];
        foreach ($assessments as $row) {
            $severity = (string)($row['current_severity'] ?? '');
            if ($severity === 'critical') {
                $critical[] = $row;
            } elseif ($severity === 'high') {
                $high[] = $row;
            } elseif ($severity === 'medium') {
                $medium[] = $row;
            }
        }

        return [
            'generatedAt' => (string)($report['_meta']['generatedAt'] ?? ''),
            'summary' => [
                'scenarioCount' => (int)($report['summary']['scenario_count'] ?? count($assessments)),
                'critical' => (int)($report['summary']['critical'] ?? count($critical)),
                'high' => (int)($report['summary']['high'] ?? count($high)),
                'medium' => (int)($report['summary']['medium'] ?? count($medium)),
                'watch' => (int)($report['summary']['watch'] ?? 0),
            ],
            'critical' => array_map(static function (array $row) use ($idKey): array {
                return [
                    'id' => (string)($row[$idKey] ?? ''),
                    'title' => (string)($row['title'] ?? ''),
                    'severity' => (string)($row['current_severity'] ?? ''),
                    'priority' => (string)($row['priority'] ?? ''),
                    'rationale' => array_values(array_filter((array)($row['rationale'] ?? []), 'is_scalar')),
                ];
            }, array_slice($critical, 0, 10)),
            'high' => array_map(static function (array $row) use ($idKey): array {
                return [
                    'id' => (string)($row[$idKey] ?? ''),
                    'title' => (string)($row['title'] ?? ''),
                    'severity' => (string)($row['current_severity'] ?? ''),
                    'priority' => (string)($row['priority'] ?? ''),
                    'rationale' => array_values(array_filter((array)($row['rationale'] ?? []), 'is_scalar')),
                ];
            }, array_slice($high, 0, 10)),
        ];
    }

    /**
     * @param list<array<string, mixed>> $tables
     * @return array<string, mixed>
     */
    private function buildOperationalState(array $artifactInventory, array $qualityReport, array $diagnostics, array $connection, array $tables, array $savePolicy, array $blindSpotReport, array $stressReport): array
    {
        $freshnessSummary = (array)($artifactInventory['summary'] ?? []);
        $artifactItems = array_values(array_filter((array)($artifactInventory['items'] ?? []), 'is_array'));
        $diagnosticsSummary = (array)($diagnostics['summary'] ?? []);
        $publishability = (array)($qualityReport['publishability'] ?? []);
        $blockingCounts = (array)($publishability['blocking_counts'] ?? []);
        $dataLayer = (array)($connection['data_layer'] ?? []);
        $postgresPathActive = !empty($dataLayer['postgres_path_active']);
        $postgresConfigured = !empty($dataLayer['use_postgres']);
        $dbProbeConfigured = !empty($connection['db_probe_applicable']);
        $dbProbeReachable = !empty($connection['db_probe_reachable']);
        $blindSpotAudit = $this->buildOperationalAuditSummary($blindSpotReport, 'scenario_id');
        $stressAudit = $this->buildOperationalAuditSummary($stressReport, 'scenario_id');
        $endpointCatalogIndexAvailable = is_file($this->registryPath('endpoint-catalog-index'));

        $staleAuthority = [];
        $heavyArtifacts = [];
        $segmentedArtifacts = [];
        $dependencyOutdated = [];
        foreach ($artifactItems as $item) {
            $status = (string)($item['status'] ?? '');
            $category = (string)($item['category'] ?? '');
            if (!empty($item['requiredForRelease']) && in_array($status, ['missing', 'stale'], true) && $category === 'authority') {
                $staleAuthority[] = (string)($item['label'] ?? $item['id'] ?? 'artifact');
            }
            if (!empty($item['segmented']) && is_array($item['segmentation'] ?? null)) {
                $segmentedArtifacts[] = $item;
            }
            if (
                (int)($item['sizeBytes'] ?? 0) >= self::LARGE_ARTIFACT_WARN_BYTES
                && !(
                    $endpointCatalogIndexAvailable
                    && (string)($item['id'] ?? '') === 'endpoint_catalog'
                )
                && empty($item['segmented'])
            ) {
                $heavyArtifacts[] = $item;
            }
            if (!empty($item['requiredForRelease']) && (int)($item['sourceDriftSeconds'] ?? 0) > self::ARTIFACT_DEPENDENCY_GRACE_SECONDS) {
                $dependencyOutdated[] = $item;
            }
        }

        $registryGapCount = 0;
        $unlinkedTableCount = 0;
        foreach ($tables as $table) {
            if (!is_array($table)) {
                continue;
            }
            $registryGapCount += (($table['registry_present'] ?? false) === false) ? 1 : 0;
            $unlinkedTableCount += !empty($table['unlinked']) ? 1 : 0;
        }

        /** @var list<array{id:string,severity:string,blocking:bool,title:string,detail:string,nextAction:string}> $risks */
        $risks = [];
        if ((int)($freshnessSummary['missingCount'] ?? 0) > 0) {
            $risks[] = [
                'id' => 'artifact_missing',
                'severity' => 'critical',
                'blocking' => true,
                'title' => 'Core registry artifact missing',
                'detail' => 'One or more registry/authority files are missing, so the workspace cannot be treated as complete.',
                'nextAction' => 'Rebuild the missing artifact before relying on the control plane for release or audit decisions.',
            ];
        }

        if ((int)($freshnessSummary['driftSeconds'] ?? 0) >= self::ARTIFACT_DRIFT_BLOCK_SECONDS) {
            $risks[] = [
                'id' => 'artifact_generation_drift',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Registry artifacts were generated in different cycles',
                'detail' => 'Fresh runtime artifacts and stale authority artifacts differ by ' . $this->humanDuration((int)$freshnessSummary['driftSeconds']) . ', so readiness signals may contradict each other.',
                'nextAction' => 'Regenerate the stale authority artifacts and rerun diagnostics/quality before trusting release posture.',
            ];
        }

        if ($staleAuthority !== []) {
            $risks[] = [
                'id' => 'authority_artifacts_stale',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Authority-side artifacts are stale',
                'detail' => implode(', ', array_slice($staleAuthority, 0, 5)),
                'nextAction' => 'Refresh authority outputs such as table-registry, diagnostics, manifest and migration gap before release decisions.',
            ];
        }

        if ($dependencyOutdated !== []) {
            usort($dependencyOutdated, static fn(array $a, array $b): int => (int)($b['sourceDriftSeconds'] ?? 0) <=> (int)($a['sourceDriftSeconds'] ?? 0));
            $labels = array_map(static function (array $item): string {
                $label = (string)($item['label'] ?? $item['id'] ?? 'artifact');
                $drift = (string)($item['sourceDriftLabel'] ?? '0s');
                return $label . ' +' . $drift;
            }, array_slice($dependencyOutdated, 0, 5));
            $risks[] = [
                'id' => 'derived_artifacts_outdated',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Derived artifacts lag behind their source documents',
                'detail' => implode(', ', $labels),
                'nextAction' => 'Regenerate the affected authority pipeline so release artifacts catch up with newer registry inputs.',
            ];
        }

        if ($dbProbeConfigured && !$dbProbeReachable) {
            $risks[] = [
                'id' => 'db_probe_unavailable',
                'severity' => 'critical',
                'blocking' => true,
                'title' => 'Live PostgreSQL truth cannot be reached',
                'detail' => (string)($connection['error'] ?? 'Database connection is unavailable.'),
                'nextAction' => 'Restore DB connectivity or repair the stored DB profile before trusting coverage, drift or release posture.',
            ];
        }

        if ($dbProbeReachable && !$postgresPathActive) {
            $risks[] = [
                'id' => 'runtime_storage_split_brain',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'DB probe is live but application runtime is not on PostgreSQL',
                'detail' => 'The control plane can see PostgreSQL, but the active DataLayer path is not writing/reading from PostgreSQL.',
                'nextAction' => 'Align runtime storage mode before using table coverage or release diagnostics as production truth.',
            ];
        }

        if ($dbProbeReachable && (int)($connection['present_table_count'] ?? 0) > 0 && empty($connection['migration_table_present'])) {
            $risks[] = [
                'id' => 'migration_tracking_missing',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Live DB has tables but migration tracking is missing',
                'detail' => 'schema_migrations does not exist even though PostgreSQL already contains live tables.',
                'nextAction' => 'Create a governed migration baseline before applying further schema changes or treating PostgreSQL as authoritative.',
            ];
        } elseif ($dbProbeReachable && (int)($connection['present_table_count'] ?? 0) > 0 && (int)($connection['applied_migration_count'] ?? 0) === 0) {
            $risks[] = [
                'id' => 'migration_tracking_empty',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Live DB has tables but zero applied migrations are recorded',
                'detail' => 'schema_migrations exists, but it does not record the live schema baseline.',
                'nextAction' => 'Backfill the current migration baseline before running new migrations or trusting authority-chain status.',
            ];
        }

        if ($dbProbeReachable && (int)($connection['applied_migration_count'] ?? 0) > 0 && (int)($connection['pending_migration_count'] ?? 0) > 0) {
            $pendingIds = array_values(array_filter((array)($connection['pending_migration_ids'] ?? []), 'is_scalar'));
            $risks[] = [
                'id' => 'migration_backlog_pending',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Pending migrations have not reached the live DB',
                'detail' => 'Pending migrations: ' . ($pendingIds !== [] ? implode(', ', array_slice(array_map('strval', $pendingIds), 0, 8)) : (string)($connection['pending_migration_count'] ?? 0)),
                'nextAction' => 'Run php database/migrate.php --status, then apply the pending migration through php database/migrate.php on the governed server runtime.',
            ];
        }

        if ($postgresConfigured && !empty($dataLayer['json_fallback'])) {
            $risks[] = [
                'id' => 'json_fallback_enabled',
                'severity' => 'medium',
                'blocking' => false,
                'title' => 'JSON fallback remains enabled',
                'detail' => 'A fallback JSON path can hide divergence between registry metadata and live PostgreSQL reality.',
                'nextAction' => 'Keep fallback only for break-glass recovery and monitor divergence explicitly.',
            ];
        }

        $failedChecks = array_values(array_filter((array)($publishability['failed_checks'] ?? []), 'is_array'));
        if (!($publishability['ready'] ?? false) || $failedChecks !== []) {
            $risks[] = [
                'id' => 'publishability_blocked',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Registry quality report still blocks publishability',
                'detail' => 'Failed checks: ' . implode(', ', array_map(static fn(array $item): string => (string)($item['id'] ?? 'check'), array_slice($failedChecks, 0, 5))),
                'nextAction' => 'Resolve contract and frontend publishability blockers before treating release outputs as deployable.',
            ];
        }

        $releaseReadinessScore = (int)($diagnosticsSummary['releaseReadinessScore'] ?? 0);
        if ($releaseReadinessScore >= 90 && (!($publishability['ready'] ?? false) || $failedChecks !== [])) {
            $risks[] = [
                'id' => 'readiness_signal_contradiction',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Diagnostics overstate release readiness',
                'detail' => 'Diagnostics show releaseReadinessScore ' . $releaseReadinessScore . ' while registry-quality still says ' . (string)($publishability['status'] ?? 'review_required') . '.',
                'nextAction' => 'Treat release readiness as blocked until the quality report and diagnostics agree.',
            ];
        }

        if ($registryGapCount > 0 || ($dbProbeReachable && ((int)($connection['missing_table_count'] ?? 0) > 0 || (int)($connection['unexpected_table_count'] ?? 0) > 0))) {
            $risks[] = [
                'id' => 'coverage_drift',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Registry coverage still diverges from live coverage',
                'detail' => 'Registry gaps: ' . $registryGapCount . '; DB missing tables: ' . (int)($connection['missing_table_count'] ?? 0) . '; unmanaged live tables: ' . (int)($connection['unexpected_table_count'] ?? 0) . '.',
                'nextAction' => 'Close relation-map/table-registry drift and reconcile missing or unmanaged live tables before promotion.',
            ];
        }

        if ($unlinkedTableCount > 0) {
            $risks[] = [
                'id' => 'unlinked_schema_components',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Schema components without runtime proof remain visible',
                'detail' => $unlinkedTableCount . ' table components are not linked to registry, relation map, migration, API, or DB proof.',
                'nextAction' => 'Archive non-runtime components or bind them to the authority chain before exposing them to AI/frontend tooling.',
            ];
        }

        if (!empty($connection['reachable']) && (int)($connection['structural_drift_table_count'] ?? 0) > 0) {
            $topDrift = array_slice(array_values(array_filter((array)($connection['structural_drift'] ?? []), 'is_array')), 0, 4);
            $labels = array_map(static function (array $item): string {
                $parts = [];
                if (!empty($item['missing_columns'])) {
                    $parts[] = 'missing ' . count((array)$item['missing_columns']);
                }
                if (!empty($item['unexpected_columns'])) {
                    $parts[] = 'unexpected ' . count((array)$item['unexpected_columns']);
                }
                if (!empty($item['type_drifts'])) {
                    $parts[] = 'type ' . count((array)$item['type_drifts']);
                }
                if (!empty($item['pk_drift'])) {
                    $parts[] = 'pk';
                }
                return (string)($item['table'] ?? 'table') . ' (' . implode(', ', $parts) . ')';
            }, $topDrift);
            $risks[] = [
                'id' => 'db_structural_drift',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Live DB structure diverges from registry authority',
                'detail' => implode(', ', $labels),
                'nextAction' => 'Reconcile missing/unexpected/type-drift columns and PK posture before treating runtime preview and release posture as truthful.',
            ];
        }

        if ((int)($blindSpotAudit['summary']['critical'] ?? 0) > 0) {
            $top = array_map(static fn(array $row): string => (string)($row['id'] ?? '') . ' ' . (string)($row['title'] ?? ''), array_slice((array)($blindSpotAudit['critical'] ?? []), 0, 4));
            $risks[] = [
                'id' => 'operational_blind_spots_critical',
                'severity' => 'critical',
                'blocking' => true,
                'title' => 'Critical operational blind spots remain open',
                'detail' => implode(' · ', $top),
                'nextAction' => 'Model the missing governed resources and transition contracts before calling the schema operationally complete.',
            ];
        }

        if ((int)($stressAudit['summary']['critical'] ?? 0) > 0) {
            $top = array_map(static fn(array $row): string => (string)($row['id'] ?? '') . ' ' . (string)($row['title'] ?? ''), array_slice((array)($stressAudit['critical'] ?? []), 0, 4));
            $risks[] = [
                'id' => 'operational_stress_unhandled',
                'severity' => 'critical',
                'blocking' => true,
                'title' => 'Critical real-world stress paths still fail operational truth',
                'detail' => implode(' · ', $top),
                'nextAction' => 'Close compensation, correction, temporal-integrity and execution-truth gaps before release or rollout.',
            ];
        }

        if ($heavyArtifacts !== []) {
            usort($heavyArtifacts, static fn(array $a, array $b): int => ($b['sizeBytes'] ?? 0) <=> ($a['sizeBytes'] ?? 0));
            $largest = $heavyArtifacts[0];
            $risks[] = [
                'id' => 'large_registry_artifacts',
                'severity' => ((int)($largest['sizeBytes'] ?? 0) >= self::VERY_LARGE_ARTIFACT_WARN_BYTES) ? 'high' : 'medium',
                'blocking' => false,
                'title' => 'Large registry artifacts increase memory and editing risk',
                'detail' => (string)($largest['label'] ?? 'Artifact') . ' is ' . (string)($largest['sizeLabel'] ?? 'large') . ' and requires elevated memory budgets plus careful edit discipline.',
                'nextAction' => 'Prefer segmented reads, revision-guarded saves and targeted rebuilds instead of full artifact rewrites.',
            ];
        }

        $blockingRiskCount = 0;
        $status = 'ok';
        foreach ($risks as $risk) {
            if (!empty($risk['blocking'])) {
                $blockingRiskCount += 1;
            }
            $severity = (string)$risk['severity'];
            if (in_array($severity, ['critical', 'high'], true)) {
                $status = $blockingRiskCount > 0 ? 'blocked' : 'warning';
            } elseif ($status === 'ok' && $severity === 'medium') {
                $status = 'warning';
            }
        }

        $releaseReasons = [];
        foreach ($risks as $risk) {
            if (empty($risk['blocking'])) {
                continue;
            }
            $releaseReasons[] = (string)$risk['title'];
        }

        $coverageGaps = [];
        foreach (array_slice(array_values(array_filter((array)($publishability['recommended_next_actions'] ?? []), 'is_scalar')), 0, 5) as $action) {
            $coverageGaps[] = [
                'title' => 'Coverage gap',
                'detail' => (string)$action,
            ];
        }

        return [
            'status' => $status,
            'blockingRiskCount' => $blockingRiskCount,
            'freshness' => array_merge($freshnessSummary, ['artifacts' => $artifactItems]),
            'risks' => $risks,
            'coverageGaps' => $coverageGaps,
            'releaseGate' => [
                'status' => $blockingRiskCount > 0 ? 'blocked' : 'clear',
                'blocking' => $blockingRiskCount > 0,
                'reasonCount' => count($releaseReasons),
                'reasons' => array_slice($releaseReasons, 0, 8),
            ],
            'saveGuard' => $savePolicy,
            'artifactAccess' => [
                'segmentedArtifactCount' => count($segmentedArtifacts),
                'largeArtifactRiskCount' => count($heavyArtifacts),
                'policy' => 'Large generated registry files must expose indexed or segmented reads plus revision/checksum guarded regeneration before they are considered operationally safe.',
                'segmentedArtifacts' => array_map(static function (array $item): array {
                    $segmentation = $item['segmentation'];
                    if (!is_array($segmentation)) {
                        $segmentation = [];
                    }
                    return [
                        'id' => (string)($item['id'] ?? ''),
                        'label' => (string)($item['label'] ?? ''),
                        'manifestPath' => (string)($segmentation['manifestPath'] ?? ''),
                        'segmentCount' => (int)($segmentation['segmentCount'] ?? 0),
                        'largestSegmentSizeLabel' => (string)($segmentation['largestSegmentSizeLabel'] ?? ''),
                        'revisionGuard' => (string)($segmentation['revisionGuard'] ?? ''),
                        'targetedRebuildPolicy' => (string)($segmentation['targetedRebuildPolicy'] ?? ''),
                    ];
                }, array_slice($segmentedArtifacts, 0, 8)),
            ],
            'quality' => [
                'publishabilityStatus' => (string)($publishability['status'] ?? ''),
                'publishabilityReady' => (bool)($publishability['ready'] ?? false),
                'failedCheckCount' => count($failedChecks),
                'contractIssueCount' => (int)($blockingCounts['contract_issues'] ?? 0),
                'frontendPartialEntityCount' => (int)($blockingCounts['frontend_partial_entities'] ?? 0),
                'diagnosticsReleaseReadinessScore' => $releaseReadinessScore,
                'blindSpotCriticalCount' => (int)($blindSpotAudit['summary']['critical'] ?? 0),
                'stressCriticalCount' => (int)($stressAudit['summary']['critical'] ?? 0),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function savePolicy(): array
    {
        return [
            'requiresRevision' => true,
            'maxPayloadBytes' => self::DETAIL_SAVE_MAX_BYTES,
            'conflictMode' => 'reject_stale_write',
            'segmentedReads' => true,
            'targetedRebuilds' => true,
            'checksumGuard' => 'sha256',
            'auditTrail' => true,
        ];
    }

    private function endpointImplementationExists(string $controller, string $handler): bool
    {
        $controller = trim($controller);
        $handler = trim($handler);
        if ($controller === '' || $handler === '') {
            return false;
        }

        $fqcn = 'MOM\\Api\\Controllers\\' . $controller;
        return class_exists($fqcn) && method_exists($fqcn, $handler);
    }

    /**
     * @param list<array<string, mixed>> $apis
     * @return array<string, array{total:int, linked:int}>
     */
    private function endpointCountsByEntity(array $apis): array
    {
        $counts = [];
        foreach ($apis as $api) {
            if (!is_array($api)) {
                continue;
            }
            $entity = trim((string)($api['entity'] ?? ''));
            if ($entity === '') {
                continue;
            }
            if (!isset($counts[$entity])) {
                $counts[$entity] = ['total' => 0, 'linked' => 0];
            }
            $counts[$entity]['total'] += 1;
            if (!empty($api['implementation_linked'])) {
                $counts[$entity]['linked'] += 1;
            }
        }

        return $counts;
    }

    /**
     * @param array<string, mixed> $tables
     * @return array<string, bool>
     */
    private function governanceCarrierTables(array $tables): array
    {
        $carriers = [];
        foreach ($tables as $tableName => $table) {
            if (!is_array($table)) {
                continue;
            }
            $columns = is_array($table['columns'] ?? null) ? $table['columns'] : [];
            if (
                isset($columns['org_company_code'])
                || isset($columns['org_plant_id'])
                || isset($columns['org_site_id'])
                || str_starts_with((string)$tableName, 'org_')
            ) {
                $carriers[(string)$tableName] = true;
            }
        }

        return $carriers;
    }

    /**
     * @param array<string, mixed> $table
     * @param array<string, bool> $governanceCarriers
     * @return list<string>
     */
    private function governanceInheritanceSources(array $table, array $governanceCarriers): array
    {
        $sources = [];
        foreach ((array)($table['foreignKeys'] ?? []) as $fk) {
            if (!is_array($fk)) {
                continue;
            }
            $references = trim((string)($fk['references'] ?? ''));
            if ($references === '') {
                continue;
            }
            $targetParts = explode('.', $references, 2);
            $targetTable = trim((string)($targetParts[0] ?? ''));
            if ($targetTable !== '' && isset($governanceCarriers[$targetTable])) {
                $sources[] = $targetTable;
            }
        }
        $sources = array_values(array_unique($sources));
        sort($sources);

        return $sources;
    }

    private function isGovernanceRootScope(string $key, array $table): bool
    {
        $domain = (string)($table['domain'] ?? '');
        if ($domain === 'bi_datawarehouse') {
            return true;
        }
        if ($domain === 'foundation_governance' && str_starts_with($key, 'org_')) {
            return true;
        }
        if ($domain === 'master_data_governance' && (str_contains($key, 'registry') || str_contains($key, 'retention'))) {
            return true;
        }
        if ($domain === 'system_infrastructure' && $key === 'idempotency_replay_ledger') {
            return true;
        }

        return false;
    }

    /**
     * @param list<string> $directMissing
     * @param array<string, mixed> $table
     * @param array<string, mixed> $entity
     * @param array<string, bool> $governanceCarriers
     * @return array<string, mixed>
     */
    private function governancePosture(string $key, array $table, array $entity, array $directMissing, array $governanceCarriers): array
    {
        if ($directMissing === []) {
            return [
                'status' => 'direct_complete',
                'mode' => 'direct',
                'actionableMissing' => [],
                'inheritedVia' => [],
            ];
        }

        if ($this->isGovernanceRootScope($key, $table !== [] ? $table : $entity)) {
            return [
                'status' => 'root_scope_exception',
                'mode' => 'root_scope',
                'actionableMissing' => [],
                'inheritedVia' => [],
            ];
        }

        $inheritedVia = $this->governanceInheritanceSources($table, $governanceCarriers);
        if ($inheritedVia !== []) {
            return [
                'status' => 'inherited_scope',
                'mode' => 'inherited',
                'actionableMissing' => [],
                'inheritedVia' => $inheritedVia,
            ];
        }

        return [
            'status' => 'missing_direct_scope',
            'mode' => 'missing',
            'actionableMissing' => $directMissing,
            'inheritedVia' => [],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildApiSummaries(array $endpointCatalog): array
    {
        $rows = [];
        $indexRows = is_array($endpointCatalog['rows'] ?? null) ? $endpointCatalog['rows'] : null;
        if (is_array($indexRows)) {
            foreach ($indexRows as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $path = (string)($item['path'] ?? '');
                $controller = (string)($item['controller'] ?? '');
                $handler = (string)($item['handler'] ?? '');
                $implementationExists = $this->endpointImplementationExists($controller, $handler);

                $rows[] = [
                    'key' => (string)($item['key'] ?? ''),
                    'label' => (string)($item['label'] ?? $item['key'] ?? ''),
                    'labelEn' => (string)($item['labelEn'] ?? $item['label'] ?? $item['key'] ?? ''),
                    'module' => (string)($item['module'] ?? ''),
                    'moduleEn' => (string)($item['moduleEn'] ?? $item['module'] ?? ''),
                    'method' => strtoupper((string)($item['method'] ?? 'GET')),
                    'kind' => (string)($item['kind'] ?? ''),
                    'domain' => (string)($item['domain'] ?? ''),
                    'entity' => (string)($item['entity'] ?? ''),
                    'path' => $path,
                    'controller' => $controller,
                    'handler' => $handler,
                    'field_count' => (int)($item['field_count'] ?? 0),
                    'auth_required' => (bool)($item['auth_required'] ?? false),
                    'csrf_required' => (bool)($item['csrf_required'] ?? false),
                    'admin_only' => (bool)($item['admin_only'] ?? false),
                    'permission_count' => (int)($item['permission_count'] ?? 0),
                    'workflow_mode' => (string)($item['workflow_mode'] ?? ''),
                    'runtime_safe' => (bool)($item['runtime_safe'] ?? false),
                    'deletion_mode' => (string)($item['deletion_mode'] ?? ''),
                    'source' => (string)($item['source'] ?? ''),
                    'implementation_exists' => $implementationExists,
                    'implementation_linked' => $path !== '' && $implementationExists,
                    'truth_status' => $path !== '' && $implementationExists ? 'controller_linked' : 'unlinked',
                    'truthBinding' => [
                        'layer' => 'api_controller',
                        'status' => $path !== '' && $implementationExists ? 'linked' : 'unlinked',
                        'path' => $path,
                        'controller' => $controller,
                        'handler' => $handler,
                    ],
                ];
            }

            return $rows;
        }

        $endpoints = is_array($endpointCatalog['endpoints'] ?? null) ? $endpointCatalog['endpoints'] : [];
        foreach ($endpoints as $key => $item) {
            if (!is_array($item)) {
                continue;
            }

            $security = is_array($item['security'] ?? null) ? $item['security'] : [];
            $workflow = is_array($item['workflow']['runtime'] ?? null)
                ? $item['workflow']['runtime']
                : (is_array($item['workflow'] ?? null) ? $item['workflow'] : []);
            $deletion = is_array($item['capabilities']['deletion'] ?? null)
                ? $item['capabilities']['deletion']
                : (is_array($item['response']['deletion'] ?? null) ? $item['response']['deletion'] : []);
            $path = (string)($item['path'] ?? '');
            $controller = (string)($item['controller'] ?? '');
            $handler = (string)($item['handler'] ?? '');
            $implementationExists = $this->endpointImplementationExists($controller, $handler);

            $rows[] = [
                'key' => (string)$key,
                'label' => (string)($item['label'] ?? $key),
                'labelEn' => (string)($item['labelEn'] ?? $item['label'] ?? $key),
                'module' => (string)($item['module'] ?? ''),
                'moduleEn' => (string)($item['moduleEn'] ?? $item['module'] ?? ''),
                'method' => strtoupper((string)($item['method'] ?? 'GET')),
                'kind' => (string)($item['kind'] ?? ''),
                'domain' => (string)($item['domain'] ?? ''),
                'entity' => (string)($item['entity'] ?? ''),
                'path' => $path,
                'controller' => $controller,
                'handler' => $handler,
                'field_count' => (int)($item['field_count'] ?? 0),
                'auth_required' => (bool)($security['auth_required'] ?? false),
                'csrf_required' => (bool)($security['csrf_required'] ?? false),
                'admin_only' => (bool)($security['admin_only'] ?? false),
                'permission_count' => count($this->scalarStringList($security['permission_keys'] ?? [])),
                'workflow_mode' => (string)($workflow['execution_mode'] ?? $workflow['lifecycle_mode'] ?? ''),
                'runtime_safe' => (bool)($workflow['generic_runtime_safe'] ?? false),
                'deletion_mode' => (string)($deletion['mode'] ?? ''),
                'source' => (string)($item['source'] ?? ''),
                'implementation_exists' => $implementationExists,
                'implementation_linked' => $path !== '' && $implementationExists,
                'truth_status' => $path !== '' && $implementationExists ? 'controller_linked' : 'unlinked',
                'truthBinding' => [
                    'layer' => 'api_controller',
                    'status' => $path !== '' && $implementationExists ? 'linked' : 'unlinked',
                    'path' => $path,
                    'controller' => $controller,
                    'handler' => $handler,
                ],
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            return [$a['domain'], $a['entity'], $a['method'], $a['key']] <=> [$b['domain'], $b['entity'], $b['method'], $b['key']];
        });

        return $rows;
    }

    /**
     * @return list<string>
     */
    private function allTableKeys(array $tableRegistry, array $relationMap): array
    {
        $tableKeys = array_keys(is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : []);
        $entityKeys = array_keys(is_array($relationMap['entities'] ?? null) ? $relationMap['entities'] : []);
        $keys = array_values(array_unique(array_merge($tableKeys, $entityKeys)));
        sort($keys);
        return $keys;
    }

    /**
     * @param list<string> $tableKeys
     * @return array<string, mixed>
     */
    private function probeDatabase(array $tableKeys): array
    {
        $modeSummary = $this->data->getModeSummary();
        $databaseConfig = $this->normalizedDatabaseProbeConfig();
        $dbProbeConfigured = $this->databaseProbeConfigured($databaseConfig);
        $postgresPathActive = !empty($modeSummary['postgres_path_active']);
        $migrationFiles = $this->migrationFiles();
        $result = [
            'data_layer' => $modeSummary,
            'db_probe_applicable' => $dbProbeConfigured,
            'db_probe_reachable' => false,
            'db_probe_resolved' => false,
            'configured' => $dbProbeConfigured,
            'reachable' => false,
            'host' => (string)($databaseConfig['host'] ?? ''),
            'port' => (int)($databaseConfig['port'] ?? 0),
            'database' => (string)($databaseConfig['database'] ?? ''),
            'schema' => (string)($databaseConfig['schema'] ?? 'public'),
            'runtime_path_active' => $postgresPathActive,
            'runtime_storage_aligned' => $postgresPathActive,
            'db_table_count' => 0,
            'present_lookup' => [],
            'column_lookup' => [],
            'column_type_lookup' => [],
            'pk_lookup' => [],
            'unique_key_lookup' => [],
            'present_table_count' => 0,
            'missing_table_count' => 0,
            'missing_tables' => [],
            'unexpected_tables' => [],
            'migration_table_present' => false,
            'applied_migration_count' => 0,
            'migration_file_count' => count($migrationFiles),
            'migration_files' => array_values($migrationFiles),
            'pending_migration_count' => 0,
            'pending_migrations' => [],
            'pending_migration_ids' => [],
            'applied_migration_ids' => [],
            'extra_applied_migration_ids' => [],
            'latest_migration_id' => '',
            'latest_migration_applied_at' => '',
            'error' => '',
        ];

        if (!$dbProbeConfigured) {
            return $result;
        }

        try {
            $pdo = $this->createDatabaseProbePdo($databaseConfig);
            $meta = $pdo->query('SELECT current_database() AS database_name, current_schema() AS schema_name')->fetch(PDO::FETCH_ASSOC) ?: [];
            $schemaName = (string)($meta['schema_name'] ?? 'public');

            $stmt = $pdo->prepare("
                SELECT c.relname AS table_name
                FROM pg_class c
                JOIN pg_namespace n
                  ON n.oid = c.relnamespace
                WHERE n.nspname = :schema
                  AND c.relkind IN ('r', 'p')
                  AND NOT c.relispartition
                ORDER BY c.relname
            ");
            $stmt->execute(['schema' => $schemaName]);
            $dbTables = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $name = trim((string)($row['table_name'] ?? ''));
                if ($name !== '' && !$this->isInternalDatabaseTable($name)) {
                    $dbTables[] = $name;
                }
            }

            $columnStmt = $pdo->prepare("
                SELECT
                    c.relname AS table_name,
                    a.attname AS column_name,
                    format_type(a.atttypid, a.atttypmod) AS column_type
                FROM pg_class c
                JOIN pg_namespace n
                  ON n.oid = c.relnamespace
                JOIN pg_attribute a
                  ON a.attrelid = c.oid
                WHERE n.nspname = :schema
                  AND c.relkind IN ('r', 'p')
                  AND NOT c.relispartition
                  AND a.attnum > 0
                  AND NOT a.attisdropped
                ORDER BY c.relname, a.attnum
            ");
            $columnStmt->execute(['schema' => $schemaName]);
            $columnLookup = [];
            $columnTypeLookup = [];
            foreach ($columnStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $tableName = trim((string)($row['table_name'] ?? ''));
                $columnName = trim((string)($row['column_name'] ?? ''));
                if ($tableName === '' || $columnName === '' || $this->isInternalDatabaseTable($tableName)) {
                    continue;
                }
                if (!isset($columnLookup[$tableName])) {
                    $columnLookup[$tableName] = [];
                }
                if (!isset($columnTypeLookup[$tableName])) {
                    $columnTypeLookup[$tableName] = [];
                }
                $columnLookup[$tableName][$columnName] = true;
                $columnTypeLookup[$tableName][$columnName] = trim((string)($row['column_type'] ?? ''));
            }

            $pkStmt = $pdo->prepare("
                SELECT c.relname AS table_name, a.attname AS column_name, ck.ordinality AS ordinal_position
                FROM pg_constraint con
                JOIN pg_class c
                  ON c.oid = con.conrelid
                JOIN pg_namespace n
                  ON n.oid = c.relnamespace
                JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ordinality)
                  ON true
                JOIN pg_attribute a
                  ON a.attrelid = con.conrelid
                 AND a.attnum = ck.attnum
                WHERE n.nspname = :schema
                  AND con.contype = 'p'
                  AND c.relkind IN ('r', 'p')
                  AND NOT c.relispartition
                ORDER BY c.relname, ck.ordinality
            ");
            $pkStmt->execute(['schema' => $schemaName]);
            $pkLookup = [];
            foreach ($pkStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $tableName = trim((string)($row['table_name'] ?? ''));
                $columnName = trim((string)($row['column_name'] ?? ''));
                if ($tableName === '' || $columnName === '' || $this->isInternalDatabaseTable($tableName)) {
                    continue;
                }
                if (!isset($pkLookup[$tableName])) {
                    $pkLookup[$tableName] = [];
                }
                $pkLookup[$tableName][] = $columnName;
            }

            $uniqueStmt = $pdo->prepare("
                SELECT
                    c.relname AS table_name,
                    string_agg(a.attname, ',' ORDER BY k.ordinality) AS column_names
                FROM pg_index ix
                JOIN pg_class c
                  ON c.oid = ix.indrelid
                JOIN pg_namespace n
                  ON n.oid = c.relnamespace
                JOIN unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ordinality)
                  ON true
                JOIN pg_attribute a
                  ON a.attrelid = c.oid
                 AND a.attnum = k.attnum
                WHERE n.nspname = :schema
                  AND ix.indisunique
                  AND ix.indpred IS NULL
                  AND ix.indexprs IS NULL
                  AND c.relkind IN ('r', 'p')
                  AND NOT c.relispartition
                GROUP BY c.relname, ix.indexrelid
                ORDER BY c.relname, ix.indexrelid
            ");
            $uniqueStmt->execute(['schema' => $schemaName]);
            $uniqueKeyLookup = [];
            foreach ($uniqueStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $tableName = trim((string)($row['table_name'] ?? ''));
                $columns = $this->scalarStringList(explode(',', (string)($row['column_names'] ?? '')));
                if ($tableName === '' || $columns === [] || $this->isInternalDatabaseTable($tableName)) {
                    continue;
                }
                if (!isset($uniqueKeyLookup[$tableName])) {
                    $uniqueKeyLookup[$tableName] = [];
                }
                $uniqueKeyLookup[$tableName][] = $columns;
            }

            $migrationMeta = $pdo->query("
                SELECT
                    EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = current_schema()
                          AND table_name = 'schema_migrations'
                    ) AS table_present
            ")->fetch(PDO::FETCH_ASSOC) ?: [];
            $migrationTablePresent = ((int)($migrationMeta['table_present'] ?? 0) === 1);
            $appliedMigrationCount = 0;
            $appliedMigrationRows = [];
            $appliedMigrationLookup = [];
            $latestMigrationId = '';
            $latestMigrationAppliedAt = '';
            if ($migrationTablePresent) {
                $migrationRows = $pdo->query("
                    SELECT migration_id, applied_at::text AS applied_at, checksum
                    FROM schema_migrations
                    ORDER BY migration_id
                ")->fetchAll(PDO::FETCH_ASSOC) ?: [];
                foreach ($migrationRows as $row) {
                    $id = trim((string)($row['migration_id'] ?? ''));
                    if ($id === '') {
                        continue;
                    }
                    $appliedMigrationLookup[$id] = true;
                    $appliedMigrationRows[] = [
                        'id' => $id,
                        'applied_at' => trim((string)($row['applied_at'] ?? '')),
                        'checksum' => trim((string)($row['checksum'] ?? '')),
                    ];
                }
                $appliedMigrationCount = count($appliedMigrationRows);
                if ($appliedMigrationRows !== []) {
                    $latest = $appliedMigrationRows[$appliedMigrationCount - 1];
                    $latestMigrationId = (string)$latest['id'];
                    $latestMigrationAppliedAt = (string)$latest['applied_at'];
                }
            }

            $pendingMigrations = [];
            if ($migrationTablePresent) {
                foreach ($migrationFiles as $id => $file) {
                    if (!isset($appliedMigrationLookup[$id])) {
                        $pendingMigrations[] = $file;
                    }
                }
            }
            $migrationFileLookup = array_fill_keys(array_keys($migrationFiles), true);
            $extraAppliedMigrationIds = [];
            foreach (array_keys($appliedMigrationLookup) as $id) {
                if (!isset($migrationFileLookup[$id])) {
                    $extraAppliedMigrationIds[] = $id;
                }
            }

            $dbLookup = array_fill_keys($dbTables, true);
            $registryLookup = array_fill_keys($tableKeys, true);
            $missing = [];
            foreach ($tableKeys as $tableKey) {
                if (!isset($dbLookup[$tableKey])) {
                    $missing[] = $tableKey;
                }
            }
            $unexpected = [];
            foreach ($dbTables as $tableKey) {
                if (!isset($registryLookup[$tableKey])) {
                    $unexpected[] = $tableKey;
                }
            }

            $result['db_probe_reachable'] = true;
            $result['db_probe_resolved'] = true;
            $result['reachable'] = true;
            $result['database'] = (string)($meta['database_name'] ?? '');
            $result['schema'] = $schemaName;
            $result['db_table_count'] = count($dbTables);
            $result['present_lookup'] = $dbLookup;
            $result['column_lookup'] = $columnLookup;
            $result['column_type_lookup'] = $columnTypeLookup;
            $result['pk_lookup'] = $pkLookup;
            $result['unique_key_lookup'] = $uniqueKeyLookup;
            $result['present_table_count'] = count($tableKeys) - count($missing);
            $result['missing_table_count'] = count($missing);
            $result['missing_tables'] = array_slice($missing, 0, 50);
            $result['unexpected_tables'] = array_slice($unexpected, 0, 50);
            $result['migration_table_present'] = $migrationTablePresent;
            $result['applied_migration_count'] = $appliedMigrationCount;
            $result['pending_migration_count'] = count($pendingMigrations);
            $result['pending_migrations'] = array_slice($pendingMigrations, 0, 20);
            $result['pending_migration_ids'] = array_map(static fn(array $row): string => (string)$row['id'], array_slice($pendingMigrations, 0, 50));
            $result['applied_migration_ids'] = array_slice(array_keys($appliedMigrationLookup), 0, 50);
            $result['extra_applied_migration_ids'] = array_slice($extraAppliedMigrationIds, 0, 20);
            $result['latest_migration_id'] = $latestMigrationId;
            $result['latest_migration_applied_at'] = $latestMigrationAppliedAt;
        } catch (Throwable $e) {
            $result['error'] = $e->getMessage();
        }

        return $result;
    }

    private function isInternalDatabaseTable(string $tableName): bool
    {
        static $internalTables = [
            'schema_migrations' => true,
        ];

        return isset($internalTables[$tableName]);
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizedDatabaseProbeConfig(): array
    {
        $config = $this->data->getDatabaseConfig();

        return [
            'host' => trim((string)($config['host'] ?? '')),
            'port' => max(0, (int)($config['port'] ?? 0)),
            'database' => trim((string)($config['database'] ?? '')),
            'username' => trim((string)($config['username'] ?? '')),
            'password' => (string)($config['password'] ?? ''),
            'allow_empty_password' => !empty($config['allow_empty_password']),
            'schema' => trim((string)($config['schema'] ?? 'public')) !== '' ? trim((string)($config['schema'] ?? 'public')) : 'public',
            'connect_timeout' => max(1, (int)($config['connect_timeout'] ?? 5)),
            'statement_timeout' => max(1000, (int)($config['statement_timeout'] ?? 30000)),
        ];
    }

    /**
     * @return array<string, array{id:string, file:string, path:string, checksum:string}>
     */
    private function migrationFiles(): array
    {
        $dir = $this->rootDir . '/mom/database/migrations';
        if (!is_dir($dir)) {
            return [];
        }

        $files = glob($dir . '/*.sql');
        if (!is_array($files)) {
            return [];
        }
        sort($files);

        $rows = [];
        foreach ($files as $path) {
            if (!is_string($path) || !is_file($path)) {
                continue;
            }
            $id = basename($path, '.sql');
            $rows[$id] = [
                'id' => $id,
                'file' => basename($path),
                'path' => $this->relativePath($path),
                'checksum' => hash_file('sha256', $path) ?: '',
            ];
        }

        return $rows;
    }

    /**
     * @param array<string, mixed> $config
     */
    private function databaseProbeConfigured(array $config): bool
    {
        $allowEmptyPassword = !empty($config['allow_empty_password']);
        return trim((string)($config['host'] ?? '')) !== ''
            && max(0, (int)($config['port'] ?? 0)) > 0
            && trim((string)($config['database'] ?? '')) !== ''
            && trim((string)($config['username'] ?? '')) !== ''
            && ($allowEmptyPassword || trim((string)($config['password'] ?? '')) !== '');
    }

    /**
     * @param array<string, mixed> $config
     */
    private function createDatabaseProbePdo(array $config): PDO
    {
        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;options=--search_path=%s',
            (string)$config['host'],
            max(1, (int)($config['port'] ?? 5432)),
            (string)$config['database'],
            (string)($config['schema'] ?? 'public'),
        );

        $pdo = new PDO(
            $dsn,
            (string)($config['username'] ?? ''),
            (string)($config['password'] ?? ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
                PDO::ATTR_TIMEOUT => max(1, (int)($config['connect_timeout'] ?? 5)),
            ],
        );
        $pdo->exec("SET statement_timeout = " . max(1000, (int)($config['statement_timeout'] ?? 30000)));

        return $pdo;
    }

    private function tableDbStatus(
        bool $dbProbeApplicable,
        bool $dbProbeResolved,
        ?bool $dbPresent,
        bool $migrationLedgerEmpty,
        bool $dbTargetIncomplete
    ): string {
        if (!$dbProbeApplicable) {
            return 'not_configured';
        }
        if (!$dbProbeResolved) {
            return 'unresolved';
        }
        if ($dbPresent === true) {
            return 'verified';
        }
        if ($migrationLedgerEmpty) {
            return 'missing_from_untracked_target';
        }
        if ($dbTargetIncomplete) {
            return 'missing_from_incomplete_target';
        }
        return 'missing';
    }

    /**
     * @param array<string, mixed> $dbProbe
     * @return list<array<string, mixed>>
     */
    private function buildTableSummaries(array $tableRegistry, array $relationMap, array $dbProbe, array $apis = []): array
    {
        $rows = [];
        $tables = is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : [];
        $entities = is_array($relationMap['entities'] ?? null) ? $relationMap['entities'] : [];
        $endpointCounts = $this->endpointCountsByEntity($apis);
        $governanceCarriers = $this->governanceCarrierTables($tables);
        $dbLookup = is_array($dbProbe['present_lookup'] ?? null) ? $dbProbe['present_lookup'] : [];
        $dbColumnLookup = is_array($dbProbe['column_lookup'] ?? null) ? $dbProbe['column_lookup'] : [];
        $dbColumnTypeLookup = is_array($dbProbe['column_type_lookup'] ?? null) ? $dbProbe['column_type_lookup'] : [];
        $dbPkLookup = is_array($dbProbe['pk_lookup'] ?? null) ? $dbProbe['pk_lookup'] : [];
        $dbUniqueKeyLookup = is_array($dbProbe['unique_key_lookup'] ?? null) ? $dbProbe['unique_key_lookup'] : [];
        $dbProbeApplicable = !empty($dbProbe['db_probe_applicable']);
        $dbProbeResolved = !empty($dbProbe['db_probe_resolved']);
        $tableKeys = $this->allTableKeys($tableRegistry, $relationMap);
        $authorityTableCount = count($tableKeys);
        $dbPresentTableCount = (int)($dbProbe['present_table_count'] ?? 0);
        $dbTableCount = (int)($dbProbe['db_table_count'] ?? 0);
        $migrationLedgerEmpty = $dbProbeResolved
            && $dbTableCount > 0
            && !empty($dbProbe['migration_table_present'])
            && (int)($dbProbe['applied_migration_count'] ?? 0) === 0;
        $dbTargetIncomplete = $dbProbeResolved
            && $authorityTableCount > 0
            && $dbPresentTableCount < $authorityTableCount;

        foreach ($tableKeys as $key) {
            $table = is_array($tables[$key] ?? null) ? $tables[$key] : [];
            $entity = is_array($entities[$key] ?? null) ? $entities[$key] : [];
            $columns = is_array($table['columns'] ?? null) ? array_keys($table['columns']) : [];
            $columnMetaLookup = is_array($table['columns'] ?? null) ? $table['columns'] : [];
            $fieldNames = $columns !== [] ? $columns : $this->scalarStringList($entity['fields'] ?? []);
            $dbColumns = array_keys(is_array($dbColumnLookup[$key] ?? null) ? $dbColumnLookup[$key] : []);
            $dbPresent = $dbProbeResolved ? isset($dbLookup[$key]) : null;
            $governanceFieldNames = ($dbPresent === true && $dbColumns !== []) ? $dbColumns : $fieldNames;
            $governanceMissing = $this->scalarStringList($entity['governanceMissing'] ?? []);
            if ($governanceMissing === [] && $governanceFieldNames !== []) {
                $fieldLookup = array_fill_keys($governanceFieldNames, true);
                $governanceMissing = array_values(array_filter(self::GOVERNANCE_FIELDS, static fn(string $field): bool => !isset($fieldLookup[$field])));
            }
            $governancePosture = $this->governancePosture($key, $table, $entity, $governanceMissing, $governanceCarriers);
            $actionableGovernanceMissing = $this->scalarStringList($governancePosture['actionableMissing'] ?? []);
            $endpointStats = $endpointCounts[$key] ?? ['total' => 0, 'linked' => 0];
            $endpointCount = (int)$endpointStats['total'];
            $linkedEndpointCount = (int)$endpointStats['linked'];
            $expectedPkFields = $this->scalarStringList($table['primaryKeys'] ?? ($entity['primaryKeyFields'] ?? []));
            if ($expectedPkFields === []) {
                $expectedPrimaryKey = $this->scalarOrJoined($table['primaryKey'] ?? ($entity['primaryKey'] ?? ''));
                if ($expectedPrimaryKey !== '') {
                    $expectedPkFields = array_values(array_filter(array_map('trim', explode(',', $expectedPrimaryKey)), static fn(string $value): bool => $value !== ''));
                }
            }
            $dbPkFields = array_values(array_filter((array)($dbPkLookup[$key] ?? []), 'is_string'));
            $dbStatus = $this->tableDbStatus($dbProbeApplicable, $dbProbeResolved, $dbPresent, $migrationLedgerEmpty, $dbTargetIncomplete);
            $missingColumns = $dbPresent === true ? array_values(array_diff($fieldNames, $dbColumns)) : [];
            $unexpectedColumns = $dbPresent === true ? array_values(array_diff(array_diff($dbColumns, $fieldNames), self::GOVERNANCE_FIELDS)) : [];
            $typeDrifts = [];
            if ($dbPresent === true) {
                $dbColumnTypes = is_array($dbColumnTypeLookup[$key] ?? null) ? $dbColumnTypeLookup[$key] : [];
                foreach ($fieldNames as $fieldName) {
                    if (!is_string($fieldName) || $fieldName === '' || !isset($dbColumnTypes[$fieldName])) {
                        continue;
                    }
                    $columnMeta = is_array($columnMetaLookup[$fieldName] ?? null) ? $columnMetaLookup[$fieldName] : [];
                    $expectedType = trim((string)($columnMeta['type'] ?? ''));
                    $dbType = trim((string)$dbColumnTypes[$fieldName]);
                    if ($expectedType === '' || $dbType === '') {
                        continue;
                    }
                    if ($this->normalizeSqlTypeSignature($expectedType) === $this->normalizeSqlTypeSignature($dbType)) {
                        continue;
                    }
                    $typeDrifts[] = [
                        'column' => $fieldName,
                        'expected' => $expectedType,
                        'db' => $dbType,
                    ];
                }
            }
            $pkExactMatch = $expectedPkFields !== [] && $dbPkFields === $expectedPkFields;
            $contractKeyUnique = $expectedPkFields !== [] && $this->keySequenceExists($dbUniqueKeyLookup[$key] ?? [], $expectedPkFields);
            $pkContractStatus = $expectedPkFields === []
                ? 'not_declared'
                : ($dbPresent !== true
                    ? 'not_probed'
                    : ($pkExactMatch
                        ? 'primary_key_match'
                        : ($contractKeyUnique ? 'compatible_unique_contract_key' : 'drift')));
            $pkDrift = $dbPresent === true && $expectedPkFields !== [] && $pkContractStatus === 'drift';
            $physicalPkDrift = $dbPresent === true && $expectedPkFields !== [] && $dbPkFields !== $expectedPkFields;
            $migration = trim((string)($table['migration'] ?? ''));
            $migrationPath = $migration !== '' ? $this->rootDir . '/mom/database/migrations/' . $migration : '';
            $migrationSourcePresent = $migrationPath !== '' && is_file($migrationPath);
            $registryPresent = $table !== [];
            $relationPresent = $entity !== [];
            $runtimeContractLinked = $registryPresent && $relationPresent && $linkedEndpointCount > 0 && $migrationSourcePresent;
            if ($dbProbeResolved && $dbPresent === true) {
                $truthStatus = 'db_verified';
            } elseif ($runtimeContractLinked) {
                $truthStatus = 'contract_runtime_linked';
            } elseif ($registryPresent && $linkedEndpointCount > 0) {
                $truthStatus = 'registry_api_linked';
            } elseif ($registryPresent && $migrationSourcePresent) {
                $truthStatus = 'schema_authority_linked';
            } elseif ($registryPresent || $relationPresent || $endpointCount > 0) {
                $truthStatus = 'partial_link';
            } else {
                $truthStatus = 'unlinked';
            }
            $operationalRole = ($table['workflowId'] ?? $entity['workflowId'] ?? '') !== ''
                ? 'workflow_owner'
                : (!empty($table['supportTable'] ?? $entity['supportTable'] ?? false)
                    ? 'support_table'
                    : ($linkedEndpointCount > 0 ? 'api_backed_runtime_table' : 'registry_reference'));

            $rows[] = [
                'key' => $key,
                'label' => (string)($table['label'] ?? $entity['label'] ?? $this->humanize($key)),
                'labelEn' => (string)($table['labelEn'] ?? $entity['labelEn'] ?? $table['label'] ?? $this->humanize($key)),
                'domain' => (string)($table['domain'] ?? $entity['domain'] ?? ''),
                'primaryKey' => $this->scalarOrJoined($table['primaryKey'] ?? ($table['primaryKeys'] ?? ($entity['primaryKey'] ?? ($entity['primaryKeyFields'] ?? [])))),
                'statusColumn' => (string)($table['statusColumn'] ?? $entity['statusField'] ?? ''),
                'workflowId' => (string)($table['workflowId'] ?? $entity['workflowId'] ?? ''),
                'columnCount' => count($fieldNames),
                'supportTable' => (bool)($table['supportTable'] ?? $entity['supportTable'] ?? false),
                'canonical' => (bool)($table['canonical'] ?? false),
                'source' => (string)($table['source'] ?? ''),
                'migration' => $migration,
                'migration_path' => $migrationSourcePresent ? $this->relativePath($migrationPath) : '',
                'migration_source_present' => $migrationSourcePresent,
                'endpoint_count' => $endpointCount,
                'linked_endpoint_count' => $linkedEndpointCount,
                'registry_present' => $registryPresent,
                'relation_present' => $relationPresent,
                'runtime_contract_linked' => $runtimeContractLinked,
                'truth_status' => $truthStatus,
                'truthBinding' => [
                    'schemaAuthority' => $migrationSourcePresent ? 'linked' : 'missing_migration_source',
                    'registry' => $registryPresent ? 'linked' : 'missing',
                    'relationMap' => $relationPresent ? 'linked' : 'missing',
                    'apiController' => $linkedEndpointCount > 0 ? 'linked' : 'missing',
                    'dbProbe' => $dbStatus,
                ],
                'operationalRole' => $operationalRole,
                'unlinked' => $truthStatus === 'unlinked',
                'governance_complete' => $actionableGovernanceMissing === [],
                'governance_status' => (string)($governancePosture['status'] ?? 'missing_direct_scope'),
                'governance_mode' => (string)($governancePosture['mode'] ?? 'missing'),
                'governance_inherited_via' => array_slice($this->scalarStringList($governancePosture['inheritedVia'] ?? []), 0, 6),
                'governance_gap_count' => count($actionableGovernanceMissing),
                'governance_missing' => array_slice($actionableGovernanceMissing, 0, 6),
                'governance_direct_missing_count' => count($governanceMissing),
                'governance_direct_missing' => array_slice($governanceMissing, 0, 6),
                'jsonb_field_count' => (int)($entity['jsonbFieldCount'] ?? 0),
                'digital_thread' => (bool)($entity['digitalThread'] ?? false),
                'db_probe_applicable' => $dbProbeApplicable,
                'db_probe_resolved' => $dbProbeResolved,
                'db_present' => $dbPresent,
                'db_status' => $dbStatus,
                'db_column_count' => count($dbColumns),
                'missing_column_count' => count($missingColumns),
                'unexpected_column_count' => count($unexpectedColumns),
                'column_drift_count' => count($missingColumns) + count($unexpectedColumns) + count($typeDrifts),
                'missing_columns' => array_slice($missingColumns, 0, 12),
                'unexpected_columns' => array_slice($unexpectedColumns, 0, 12),
                'type_drift_count' => count($typeDrifts),
                'type_drifts' => array_slice($typeDrifts, 0, 12),
                'expected_primary_key_fields' => $expectedPkFields,
                'db_primary_key_fields' => $dbPkFields,
                'db_unique_key_fields' => array_slice((array)($dbUniqueKeyLookup[$key] ?? []), 0, 8),
                'primary_key_contract_status' => $pkContractStatus,
                'physical_pk_drift' => $physicalPkDrift,
                'contract_key_unique' => $contractKeyUnique,
                'pk_drift' => $pkDrift,
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            return [$a['domain'], $a['key']] <=> [$b['domain'], $b['key']];
        });

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildBlueprintSummaries(array $schemaLibrary): array
    {
        $rows = [];
        $entities = is_array($schemaLibrary['entities'] ?? null) ? $schemaLibrary['entities'] : [];
        foreach ($entities as $key => $item) {
            if (!is_array($item)) {
                continue;
            }
            $rows[] = [
                'key' => (string)$key,
                'label' => (string)($item['label'] ?? $this->humanize((string)$key)),
                'description' => (string)($item['description'] ?? ''),
                'tableCount' => count(array_filter((array)($item['tables'] ?? []), 'is_scalar')),
                'migrationCount' => count(array_filter((array)($item['migrations'] ?? []), 'is_scalar')),
                'authorityLayer' => 'metadata_library',
                'truth_status' => 'reference_blueprint',
                'runtimeLinked' => false,
                'activeInRuntime' => false,
                'source' => 'data/registry/schema-library.json',
                'purpose' => 'Reusable reference blueprint for schema/module planning. It is not a runtime DB contract.',
            ];
        }
        usort($rows, static fn(array $a, array $b): int => $a['key'] <=> $b['key']);
        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildVariableSummaries(array $variableLibrary): array
    {
        $rows = [];
        $categories = is_array($variableLibrary['categories'] ?? null) ? $variableLibrary['categories'] : [];
        foreach ($categories as $key => $item) {
            if (!is_array($item)) {
                continue;
            }
            $rows[] = [
                'key' => (string)$key,
                'label' => (string)($item['label'] ?? $key),
                'label_vi' => (string)($item['label_vi'] ?? $item['label'] ?? $key),
                'description' => (string)($item['description'] ?? ''),
                'variableCount' => count((array)($item['variables'] ?? [])),
                'authorityLayer' => 'metadata_library',
                'truth_status' => 'config_library',
                'runtimeLinked' => true,
                'activeInRuntime' => true,
                'source' => 'data/config/variable_library.json',
                'purpose' => 'Shared variable/type definitions consumed by forms, validation and module builders.',
            ];
        }
        usort($rows, static fn(array $a, array $b): int => $a['key'] <=> $b['key']);
        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildDesignSummaries(): array
    {
        $rows = [];
        $file = $this->schemaStudioPath('designs/workspace.json');
        $payload = $this->readJson($file);
        if ($payload !== []) {
            $meta = is_array($payload['_meta'] ?? null) ? $payload['_meta'] : [];
            $enterprise = is_array($meta['enterprise'] ?? null) ? $meta['enterprise'] : [];

            $rows[] = [
                'id' => 'workspace',
                'name' => (string)($meta['name'] ?? 'HESEM Workspace Design'),
                'displayName' => 'Workspace Design Draft',
                'version' => (string)($meta['version'] ?? '1.0.0'),
                'updatedAt' => (string)($meta['updatedAt'] ?? $meta['generated_at'] ?? ''),
                'author' => (string)($meta['author'] ?? $enterprise['generated_by'] ?? ''),
                'profile' => (string)($enterprise['profile'] ?? $meta['profile'] ?? ''),
                'environment' => (string)($enterprise['environment'] ?? ''),
                'tableCount' => count((array)($payload['tables'] ?? [])),
                'relationCount' => count((array)($payload['relations'] ?? [])),
                'groupCount' => count((array)($payload['groups'] ?? [])),
                'baselineAvailable' => is_file($this->schemaStudioPath('snapshots/workspace.baseline.json')),
                'lastCompiledAt' => (string)($enterprise['last_compiled_at'] ?? ''),
                'lastReleaseId' => (string)($enterprise['last_release_id'] ?? ''),
                'lastReleaseAt' => (string)($enterprise['last_release_at'] ?? ''),
                'designType' => (string)($meta['designType'] ?? 'workspace_design'),
                'authorityLayer' => (string)($meta['authorityLayer'] ?? 'design_workspace'),
                'authorityViewKind' => (string)($meta['authorityViewKind'] ?? 'design_draft'),
                'authorityRole' => (string)($meta['authorityRole'] ?? 'non_authoritative_editing_surface'),
                'source' => (string)($meta['source'] ?? 'mom/data/schema-studio/designs/workspace.json'),
                'schemaName' => (string)($meta['schemaName'] ?? 'public'),
                'databaseName' => (string)($meta['databaseName'] ?? 'mom'),
                'physicalDbSchema' => (string)($meta['physicalDbSchema'] ?? 'public'),
                'runtimeAuthority' => (string)($meta['runtimeAuthority'] ?? 'system_contract_registry'),
                'authoritySource' => (string)($meta['authoritySource'] ?? 'mom/data/schema-studio/designs/workspace.json'),
                'purpose' => (string)($meta['purpose'] ?? 'Editable design draft for controlled schema design, baseline, diff, compiler, and release review. It is not the physical DB schema.'),
                'writePolicy' => (string)($meta['writePolicy'] ?? 'editable_with_revision_guard'),
                'deletePolicy' => (string)($meta['deletePolicy'] ?? 'archive_or_replace_do_not_hard_delete'),
                'dataLossImpact' => (string)($meta['dataLossImpact'] ?? 'Deleting the workspace does not delete database rows, but it disables the editable Schema Studio surface until a replacement workspace is created.'),
                'blankDraft' => !empty($meta['blankDraft']),
                'truth_status' => 'non_runtime_design_draft',
                'runtimeLinked' => false,
                'activeInRuntime' => false,
                'canDelete' => false,
                'readOnly' => false,
                'editable' => true,
                'isSystem' => true,
            ];
        }

        $tableRegistry = $this->readJson($this->registryPath('table-registry'));
        if (is_array($tableRegistry['tables'] ?? null) && count((array)$tableRegistry['tables']) > 0) {
            $relationMap = $this->readJson($this->registryPath('relation-map'));
            $relationCount = is_array($relationMap['edges'] ?? null)
                ? count((array)$relationMap['edges'])
                : (is_array($relationMap['relations'] ?? null) ? count((array)$relationMap['relations']) : 0);
            $meta = is_array($tableRegistry['_meta'] ?? null) ? $tableRegistry['_meta'] : [];
            $rows[] = [
                'id' => 'system_contract_registry',
                'name' => 'HESEM System Contract Registry',
                'displayName' => 'System Contract Registry',
                'version' => (string)($meta['version'] ?? '1.0.0'),
                'updatedAt' => (string)($meta['generatedAt'] ?? $meta['generated_at'] ?? ''),
                'author' => (string)($meta['generatedBy'] ?? $meta['generated_by'] ?? 'registry'),
                'profile' => 'logical_registry',
                'environment' => 'system_contract',
                'tableCount' => count((array)$tableRegistry['tables']),
                'relationCount' => $relationCount,
                'groupCount' => count((array)($tableRegistry['domains'] ?? [])),
                'baselineAvailable' => is_file($this->registryPath('schema-authority-summary')),
                'lastCompiledAt' => '',
                'lastReleaseId' => '',
                'lastReleaseAt' => '',
                'designType' => 'system_contract_registry',
                'authorityLayer' => 'system_contract_registry',
                'authorityViewKind' => 'db_derived_contract',
                'source' => 'mom/data/registry/table-registry.json',
                'schemaName' => 'public',
                'databaseName' => 'mom',
                'physicalDbSchema' => 'public',
                'authoritySource' => 'database/migrations/*.sql -> database/schema.sql -> table-registry.json',
                'purpose' => 'Full backend contract visibility for AI, frontend, API governance, workflow mapping, and audit without editing the database.',
                'writePolicy' => 'read_only_generated_artifact',
                'deletePolicy' => 'do_not_delete_regenerate_from_authority',
                'dataLossImpact' => 'Deleting this artifact does not delete DB rows, but removes full contract visibility until registry publication is regenerated.',
                'truth_status' => 'runtime_contract_authority',
                'runtimeLinked' => true,
                'activeInRuntime' => true,
                'canDelete' => false,
                'readOnly' => true,
                'editable' => false,
                'isSystem' => true,
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            $order = ['workspace' => 0, 'system_contract_registry' => 1];
            $aOrder = $order[(string)$a['id']] ?? 99;
            $bOrder = $order[(string)$b['id']] ?? 99;
            if ($aOrder !== $bOrder) {
                return $aOrder <=> $bOrder;
            }
            return strcmp((string)$b['updatedAt'], (string)$a['updatedAt']);
        });
        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildReleaseSummaries(): array
    {
        $rows = [];
        foreach (glob($this->schemaStudioPath('releases/*.json')) ?: [] as $file) {
            $payload = $this->readJson((string)$file);
            if ($payload === []) {
                continue;
            }
            $meta = is_array($payload['_meta'] ?? null) ? $payload['_meta'] : [];
            $summary = is_array($payload['summary'] ?? null) ? $payload['summary'] : [];
            $rows[] = [
                'id' => (string)($meta['id'] ?? basename((string)$file, '.json')),
                'name' => (string)($summary['name'] ?? $meta['id'] ?? basename((string)$file, '.json')),
                'designId' => (string)($meta['designId'] ?? ''),
                'designName' => (string)($meta['designName'] ?? ''),
                'createdAt' => (string)($meta['createdAt'] ?? ''),
                'actor' => (string)($meta['actor'] ?? ''),
                'approvalClass' => (string)($summary['approvalClass'] ?? ''),
                'compatibilityScore' => (int)($summary['compatibilityScore'] ?? 0),
                'riskScore' => (int)($summary['riskScore'] ?? 0),
                'destructiveCount' => (int)($summary['destructiveCount'] ?? 0),
                'breakingCount' => (int)($summary['breakingCount'] ?? 0),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => strcmp((string)$b['createdAt'], (string)$a['createdAt']));
        return $rows;
    }

    /**
     * @param list<array<string, mixed>> $apis
     * @param list<array<string, mixed>> $tables
     * @return list<array<string, mixed>>
     */
    private function buildDomainSummaries(array $tableRegistry, array $apis, array $tables): array
    {
        $domainMeta = is_array($tableRegistry['domains'] ?? null) ? $tableRegistry['domains'] : [];
        $rows = [];
        $domainIds = [];
        $dbProbeResolved = array_reduce($tables, static function (bool $carry, $table): bool {
            return $carry || (is_array($table) && !empty($table['db_probe_resolved']));
        }, false);

        foreach ($apis as $api) {
            $domainIds[(string)($api['domain'] ?? '')] = true;
        }
        foreach ($tables as $table) {
            $domainIds[(string)($table['domain'] ?? '')] = true;
        }
        unset($domainIds['']);

        foreach (array_keys($domainIds) as $domainId) {
            $meta = is_array($domainMeta[$domainId] ?? null) ? $domainMeta[$domainId] : [];
            $apiCount = 0;
            $tableCount = 0;
            $presentTableCount = 0;
            $workflowTableCount = 0;
            $supportTableCount = 0;
            $governanceGapCount = 0;
            $directGovernanceGapCount = 0;
            $registryGapCount = 0;
            $structuralDriftTableCount = 0;
            $apiBackedTableCount = 0;
            $runtimeLinkedTableCount = 0;
            $unlinkedTableCount = 0;

            foreach ($apis as $api) {
                if ((string)($api['domain'] ?? '') === $domainId) {
                    $apiCount += 1;
                }
            }
            foreach ($tables as $table) {
                if ((string)($table['domain'] ?? '') !== $domainId) {
                    continue;
                }
                $tableCount += 1;
                if ($dbProbeResolved) {
                    $presentTableCount += (($table['db_present'] ?? false) === true) ? 1 : 0;
                }
                $workflowTableCount += (($table['workflowId'] ?? '') !== '') ? 1 : 0;
                $supportTableCount += (($table['supportTable'] ?? false) === true) ? 1 : 0;
                $governanceGapCount += ((int)($table['governance_gap_count'] ?? 0) > 0) ? 1 : 0;
                $directGovernanceGapCount += ((int)($table['governance_direct_missing_count'] ?? 0) > 0) ? 1 : 0;
                $registryGapCount += (($table['registry_present'] ?? false) === false) ? 1 : 0;
                $structuralDriftTableCount += ((int)($table['column_drift_count'] ?? 0) > 0 || !empty($table['pk_drift'])) ? 1 : 0;
                $apiBackedTableCount += ((int)($table['endpoint_count'] ?? 0) > 0) ? 1 : 0;
                $runtimeLinkedTableCount += !empty($table['runtime_contract_linked']) ? 1 : 0;
                $unlinkedTableCount += !empty($table['unlinked']) ? 1 : 0;
            }

            $rows[] = [
                'id' => $domainId,
                'label' => (string)($meta['label'] ?? $this->humanize($domainId)),
                'labelEn' => (string)($meta['labelEn'] ?? $meta['label'] ?? $this->humanize($domainId)),
                'description' => (string)($meta['description'] ?? ''),
                'color' => (string)($meta['color'] ?? '#2563eb'),
                'supportDomain' => (bool)($meta['supportDomain'] ?? false),
                'api_count' => $apiCount,
                'table_count' => $tableCount,
                'present_table_count' => $presentTableCount,
                'missing_table_count' => $dbProbeResolved ? max(0, $tableCount - $presentTableCount) : 0,
                'workflow_table_count' => $workflowTableCount,
                'support_table_count' => $supportTableCount,
                'governance_gap_count' => $governanceGapCount,
                'governance_direct_gap_count' => $directGovernanceGapCount,
                'registry_gap_count' => $registryGapCount,
                'structural_drift_table_count' => $structuralDriftTableCount,
                'api_backed_table_count' => $apiBackedTableCount,
                'runtime_linked_table_count' => $runtimeLinkedTableCount,
                'unlinked_table_count' => $unlinkedTableCount,
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            return [$b['table_count'], $a['id']] <=> [$a['table_count'], $b['id']];
        });

        return $rows;
    }

    /**
     * @param list<array<string, mixed>> $tables
     * @param array<string, mixed> $connection
     * @return array<string, mixed>
     */
    private function buildHighlights(array $relationMap, array $diagnostics, array $qualityReport, array $migrationGap, array $tables, array $connection, array $blindSpotReport, array $stressReport): array
    {
        $relationEntities = is_array($relationMap['entities'] ?? null) ? $relationMap['entities'] : [];
        $registryGaps = [];
        foreach ($relationEntities as $key => $entity) {
            if (!is_array($entity)) {
                continue;
            }
            $tableFound = false;
            foreach ($tables as $table) {
                if ((string)($table['key'] ?? '') === (string)$key) {
                    $tableFound = (bool)($table['registry_present'] ?? false);
                    break;
                }
            }
            if ($tableFound) {
                continue;
            }
            $registryGaps[] = [
                'table' => (string)$key,
                'label' => (string)($entity['label'] ?? $this->humanize((string)$key)),
                'domain' => (string)($entity['domain'] ?? ''),
                'workflowId' => (string)($entity['workflowId'] ?? ''),
                'reason' => 'present_in_relation_map_but_missing_from_table_registry',
            ];
        }

        $governanceGaps = [];
        $governanceDirectMissing = [];
        $unlinkedComponents = [];
        foreach ($tables as $table) {
            if (!is_array($table)) {
                continue;
            }
            $missing = $this->scalarStringList($table['governance_missing'] ?? []);
            if ($missing === []) {
                $directMissing = $this->scalarStringList($table['governance_direct_missing'] ?? []);
                if ($directMissing !== []) {
                    $governanceDirectMissing[] = [
                        'table' => (string)($table['key'] ?? ''),
                        'label' => (string)($table['label'] ?? $table['key'] ?? ''),
                        'domain' => (string)($table['domain'] ?? ''),
                        'missing' => array_slice($directMissing, 0, 6),
                        'missing_count' => count($directMissing),
                        'status' => (string)($table['governance_status'] ?? ''),
                        'inherited_via' => array_slice($this->scalarStringList($table['governance_inherited_via'] ?? []), 0, 4),
                    ];
                }
            } else {
                $governanceGaps[] = [
                    'table' => (string)($table['key'] ?? ''),
                    'label' => (string)($table['label'] ?? $table['key'] ?? ''),
                    'domain' => (string)($table['domain'] ?? ''),
                    'missing' => array_slice($missing, 0, 6),
                    'missing_count' => count($missing),
                    'status' => (string)($table['governance_status'] ?? 'missing_direct_scope'),
                ];
            }

            if (!empty($table['unlinked'])) {
                $unlinkedComponents[] = [
                    'type' => 'table',
                    'key' => (string)($table['key'] ?? ''),
                    'label' => (string)($table['label'] ?? $table['key'] ?? ''),
                    'reason' => 'No registry, relation-map, migration, API, or DB proof resolved for this component.',
                ];
            }
        }

        usort($governanceGaps, static fn(array $a, array $b): int => $b['missing_count'] <=> $a['missing_count']);
        usort($governanceDirectMissing, static fn(array $a, array $b): int => $b['missing_count'] <=> $a['missing_count']);
        usort($registryGaps, static fn(array $a, array $b): int => [$a['domain'], $a['table']] <=> [$b['domain'], $b['table']]);

        $qualityBlockers = [];
        foreach ((array)($qualityReport['publishability']['failed_checks'] ?? []) as $check) {
            if (!is_array($check)) {
                continue;
            }
            $qualityBlockers[] = [
                'source' => 'registry_quality',
                'severity' => 'high',
                'title' => (string)($check['id'] ?? 'quality_check_failed'),
                'detail' => 'Actual ' . (string)($check['actual'] ?? 0) . ' / target ' . (string)($check['target'] ?? 0),
            ];
        }

        foreach ((array)($diagnostics['blockers'] ?? []) as $blocker) {
            if (!is_array($blocker)) {
                continue;
            }
            $qualityBlockers[] = [
                'source' => (string)($diagnostics['_meta']['authorityLayer'] ?? '') === 'system_contract_registry'
                    ? 'system_contract_diagnostics'
                    : 'schema_diagnostics',
                'severity' => (string)($blocker['severity'] ?? 'medium'),
                'title' => (string)($blocker['title'] ?? 'diagnostic_blocker'),
                'detail' => (string)($blocker['detail'] ?? ''),
                'nextAction' => (string)($blocker['nextAction'] ?? ''),
            ];
        }

        $migrationHotspots = [];
        foreach (array_slice(array_values(array_filter((array)($connection['pending_migrations'] ?? []), 'is_array')), 0, 10) as $item) {
            $id = (string)($item['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $migrationHotspots[] = [
                'table' => $id,
                'priority' => 'high',
                'suggestedMigration' => (string)($item['file'] ?? $id . '.sql'),
                'reason' => 'Migration file exists in source control but is not recorded in schema_migrations on the live DB target.',
            ];
        }
        foreach (array_slice(array_values(array_filter((array)($migrationGap['missingTables'] ?? []), 'is_array')), 0, 10) as $item) {
            $migrationHotspots[] = [
                'table' => (string)($item['table'] ?? ''),
                'priority' => (string)($item['priority'] ?? 'medium'),
                'suggestedMigration' => (string)($item['suggestedMigration'] ?? ''),
                'reason' => (string)($item['reason'] ?? ''),
            ];
        }

        $structuralDrift = [];
        foreach ($tables as $table) {
            if (!is_array($table) || empty($table['db_present'])) {
                continue;
            }
            $missingColumns = array_values(array_filter((array)($table['missing_columns'] ?? []), 'is_scalar'));
            $unexpectedColumns = array_values(array_filter((array)($table['unexpected_columns'] ?? []), 'is_scalar'));
            $typeDrifts = array_values(array_filter((array)($table['type_drifts'] ?? []), 'is_array'));
            $pkDrift = !empty($table['pk_drift']);
            if ($missingColumns === [] && $unexpectedColumns === [] && $typeDrifts === [] && !$pkDrift) {
                continue;
            }
            $structuralDrift[] = [
                'table' => (string)($table['key'] ?? ''),
                'label' => (string)($table['label'] ?? $table['key'] ?? ''),
                'domain' => (string)($table['domain'] ?? ''),
                'missing' => $missingColumns,
                'unexpected' => $unexpectedColumns,
                'type_drifts' => array_slice($typeDrifts, 0, 8),
                'pk_drift' => $pkDrift,
            ];
        }
        usort($structuralDrift, static function (array $a, array $b): int {
            $aScore = count((array)$a['missing']) + count((array)$a['unexpected']) + count((array)$a['type_drifts']) + (!empty($a['pk_drift']) ? 1 : 0);
            $bScore = count((array)$b['missing']) + count((array)$b['unexpected']) + count((array)$b['type_drifts']) + (!empty($b['pk_drift']) ? 1 : 0);
            return $bScore <=> $aScore;
        });

        $blindSpotAudit = $this->buildOperationalAuditSummary($blindSpotReport, 'scenario_id');
        $stressAudit = $this->buildOperationalAuditSummary($stressReport, 'scenario_id');

        return [
            'blockers' => array_slice($qualityBlockers, 0, 12),
            'hotspots' => array_slice(array_values(array_filter((array)($diagnostics['hotspots'] ?? []), 'is_array')), 0, 12),
            'recommendations' => array_slice(array_values(array_filter((array)($qualityReport['publishability']['recommended_next_actions'] ?? []), 'is_scalar')), 0, 8),
            'registry_gaps' => array_slice($registryGaps, 0, 12),
            'governance_gaps' => array_slice($governanceGaps, 0, 12),
            'governance_direct_missing' => array_slice($governanceDirectMissing, 0, 12),
            'unlinked_components' => array_slice($unlinkedComponents, 0, 12),
            'db_missing_tables' => !empty($connection['db_probe_reachable']) ? array_slice(array_values(array_filter((array)($connection['missing_tables'] ?? []), 'is_scalar')), 0, 12) : [],
            'db_unexpected_tables' => !empty($connection['db_probe_reachable']) ? array_slice(array_values(array_filter((array)($connection['unexpected_tables'] ?? []), 'is_scalar')), 0, 12) : [],
            'structural_drift' => array_slice($structuralDrift, 0, 12),
            'blind_spots' => array_slice(array_values(array_filter((array)($blindSpotAudit['critical'] ?? []), 'is_array')), 0, 8),
            'stress_scenarios' => array_slice(array_values(array_filter((array)($stressAudit['critical'] ?? []), 'is_array')), 0, 8),
            'migration_hotspots' => array_slice($migrationHotspots, 0, 12),
        ];
    }

    private function normalizeSqlTypeSignature(string $type): string
    {
        $normalized = strtoupper(trim((string)preg_replace('/\s+/', ' ', $type)));
        $normalized = str_replace('CHARACTER VARYING', 'VARCHAR', $normalized);
        $normalized = str_replace('CHARACTER(', 'CHAR(', $normalized);
        $normalized = str_replace('TIMESTAMP WITH TIME ZONE', 'TIMESTAMPTZ', $normalized);
        $normalized = str_replace('TIMESTAMP WITHOUT TIME ZONE', 'TIMESTAMP', $normalized);
        $normalized = str_replace('TIME WITH TIME ZONE', 'TIMETZ', $normalized);
        $normalized = str_replace('TIME WITHOUT TIME ZONE', 'TIME', $normalized);
        $normalized = str_replace('INTEGER[]', 'INT[]', $normalized);
        $normalized = preg_replace('/\bINTEGER\b/', 'INT', $normalized) ?? $normalized;
        $normalized = preg_replace('/\bDOUBLE PRECISION\b/', 'FLOAT8', $normalized) ?? $normalized;
        return $normalized;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildActionCatalog(): array
    {
        return [
            [
                'id' => 'load_registry',
                'label' => 'Load Registry',
                'label_vi' => 'Nạp registry',
                'api_action' => 'schema_studio_load_registry',
                'method' => 'POST',
                'writes' => false,
                'description' => 'Create an editable workspace draft from the current registry and relation map. This does not change runtime authority.',
            ],
            [
                'id' => 'reverse_engineer',
                'label' => 'Reverse Engineer',
                'label_vi' => 'Đọc ngược từ DB',
                'api_action' => 'schema_studio_reverse_engineer',
                'method' => 'POST',
                'writes' => false,
                'description' => 'Introspect PostgreSQL and build an editable workspace draft from live tables and foreign keys.',
            ],
            [
                'id' => 'validate',
                'label' => 'Validate',
                'label_vi' => 'Kiểm tra schema',
                'api_action' => 'schema_studio_validate',
                'method' => 'POST',
                'writes' => false,
                'description' => 'Run structural validation rules against the selected design layer.',
            ],
            [
                'id' => 'diagnose',
                'label' => 'Diagnose',
                'label_vi' => 'Chẩn đoán',
                'api_action' => 'schema_studio_diagnose',
                'method' => 'POST',
                'writes' => false,
                'description' => 'Generate design-layer diagnostics, blockers, hotspots and governance recommendations.',
            ],
            [
                'id' => 'compile',
                'label' => 'Compile Registry',
                'label_vi' => 'Biên dịch registry',
                'api_action' => 'schema_studio_compile_registry',
                'method' => 'POST',
                'writes' => true,
                'description' => 'Compile workspace design artifacts only. Runtime contract artifacts are generated by the system contract authority pipeline.',
            ],
            [
                'id' => 'release',
                'label' => 'Create Release Bundle',
                'label_vi' => 'Tạo release bundle',
                'api_action' => 'schema_studio_release_bundle',
                'method' => 'POST',
                'writes' => true,
                'description' => 'Generate a governed workspace release bundle with typed diff, risk and approval posture.',
            ],
            [
                'id' => 'set_baseline',
                'label' => 'Set Baseline',
                'label_vi' => 'Chốt baseline',
                'api_action' => 'schema_studio_set_baseline',
                'method' => 'POST',
                'writes' => true,
                'description' => 'Persist the editable workspace draft as the baseline for future design diff and review flows.',
            ],
        ];
    }
}
