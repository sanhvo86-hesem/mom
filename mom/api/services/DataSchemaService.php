<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
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

    private DataLayer $data;
    private string $dataDir;
    private string $rootDir;
    private string $registryDir;
    private string $configDir;
    private string $schemaStudioDir;

    public function __construct(DataLayer $data, string $dataDir, string $rootDir)
    {
        $this->data = $data;
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->registryDir = $this->dataDir . '/registry';
        $this->configDir = $this->dataDir . '/config';
        $this->schemaStudioDir = $this->dataDir . '/schema-studio';
    }

    public function getWorkspace(): array
    {
        $this->ensureMemoryBudget('512M');

        $endpointCatalogWorkspace = $this->readEndpointCatalogWorkspace();
        $endpointCatalogArtifact = $this->readJson($this->registryPath('endpoint-catalog'));
        $tableRegistry = $this->readJson($this->registryPath('table-registry'));
        $relationMap = $this->readRelationMapLight();
        $schemaLibrary = $this->readJson($this->registryPath('schema-library'));
        $variableLibrary = $this->readJson($this->configDir . '/variable_library.json');
        $manifest = $this->readJson($this->registryPath('schema-studio-enterprise-manifest'));
        $diagnostics = $this->readJson($this->registryPath('schema-studio-diagnostics'));
        $qualityReport = $this->readJson($this->registryPath('registry-quality-report'));
        $registryManifest = $this->readJson($this->registryPath('registry-manifest'));
        $schemaAuthority = $this->readJson($this->registryPath('schema-authority-summary'));
        $migrationGap = $this->readJson($this->registryPath('migration-gap-report'));
        $dataFieldsIndex = $this->readJson($this->registryPath('data-fields-index'));
        $blindSpotReport = $this->readJson($this->registryPath('operational-blind-spot-report'));
        $stressReport = $this->readJson($this->registryPath('operational-stress-report'));

        $apis = $this->buildApiSummaries($endpointCatalogWorkspace);
        $tableKeys = $this->allTableKeys($tableRegistry, $relationMap);
        $dbProbe = $this->probeDatabase($tableKeys);
        $tables = $this->buildTableSummaries($tableRegistry, $relationMap, $dbProbe);
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
            'schema_diagnostics' => $diagnostics,
            'schema_manifest' => $manifest,
            'registry_manifest' => $registryManifest,
            'schema_authority' => $schemaAuthority,
            'migration_gap' => $migrationGap,
            'data_fields_index' => $dataFieldsIndex,
            'blind_spot_report' => $blindSpotReport,
            'stress_report' => $stressReport,
        ]);
        $savePolicy = $this->savePolicy();
        $operational = $this->buildOperationalState($artifactInventory, $qualityReport, $diagnostics, $connection, $tables, $savePolicy, $blindSpotReport, $stressReport);
        $highlights = $this->buildHighlights($relationMap, $diagnostics, $qualityReport, $migrationGap, $tables, $connection, $blindSpotReport, $stressReport);
        $blindSpotAudit = $this->buildOperationalAuditSummary($blindSpotReport, 'scenario_id');
        $stressAudit = $this->buildOperationalAuditSummary($stressReport, 'scenario_id');

        $dbProbeApplicable = !empty($connection['db_probe_applicable']);
        $workflowTableCount = 0;
        $supportTableCount = 0;
        $governanceGapCount = 0;
        $registryGapCount = 0;
        $dbPresentCount = 0;
        $dbMissingCount = 0;
        $adminOnlyEndpointCount = 0;
        $csrfEndpointCount = 0;
        $variableCount = 0;

        foreach ($tables as $table) {
            if (($table['workflowId'] ?? '') !== '') {
                $workflowTableCount += 1;
            }
            if (($table['supportTable'] ?? false) === true) {
                $supportTableCount += 1;
            }
            $governanceGapCount += (int)($table['governance_gap_count'] ?? 0) > 0 ? 1 : 0;
            $registryGapCount += (($table['registry_present'] ?? false) === false) ? 1 : 0;
            if ($dbProbeApplicable) {
                $dbPresentCount += (($table['db_present'] ?? false) === true) ? 1 : 0;
                $dbMissingCount += (($table['db_present'] ?? false) === false) ? 1 : 0;
            }
        }

        foreach ($apis as $api) {
            $adminOnlyEndpointCount += (($api['admin_only'] ?? false) === true) ? 1 : 0;
            $csrfEndpointCount += (($api['csrf_required'] ?? false) === true) ? 1 : 0;
        }

        foreach ($variables as $category) {
            $variableCount += (int)($category['variableCount'] ?? 0);
        }

        $manifestSummary = (array)($manifest['summary'] ?? []);
        $diagnosticsSummary = (array)($diagnostics['summary'] ?? []);
        $qualitySummary = (array)($qualityReport['summary'] ?? []);
        $publishability = (array)($qualityReport['publishability'] ?? []);
        $registryCoverage = (array)($registryManifest['coverage'] ?? []);
        $schemaAuthoritySummary = (array)($schemaAuthority['schema_authority'] ?? []);

        return [
            'generated_at' => gmdate('c'),
            'connection' => $connection,
            'metrics' => [
                'endpoint_count' => count($apis),
                'runtime_ready_endpoint_count' => (int)($endpointCatalogWorkspace['_meta']['activeEndpoints'] ?? 0),
                'endpoint_field_library_count' => (int)($dataFieldsIndex['_meta']['generatedEndpointCount'] ?? 0),
                'admin_only_endpoint_count' => $adminOnlyEndpointCount,
                'csrf_endpoint_count' => $csrfEndpointCount,
                'table_count' => count($tables),
                'registry_table_count' => count((array)($tableRegistry['tables'] ?? [])),
                'relation_entity_count' => count((array)($relationMap['entities'] ?? [])),
                'registry_gap_count' => $registryGapCount,
                'db_probe_applicable' => $dbProbeApplicable,
                'db_present_table_count' => $dbPresentCount,
                'db_missing_table_count' => $dbMissingCount,
                'workflow_table_count' => $workflowTableCount,
                'support_table_count' => $supportTableCount,
                'governance_gap_count' => $governanceGapCount,
                'domain_count' => count($domains),
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
                'db_pk_drift_table_count' => (int)($connection['pk_drift_table_count'] ?? 0),
                'operational_blind_spot_critical_count' => (int)($blindSpotAudit['summary']['critical'] ?? 0),
                'operational_blind_spot_high_count' => (int)($blindSpotAudit['summary']['high'] ?? 0),
                'operational_stress_critical_count' => (int)($stressAudit['summary']['critical'] ?? 0),
                'operational_stress_high_count' => (int)($stressAudit['summary']['high'] ?? 0),
                'release_gate_blocked' => !empty($operational['releaseGate']['blocking']),
            ],
            'artifacts' => [
                'schema_studio_manifest' => [
                    'generatedAt' => (string)($manifest['_meta']['generatedAt'] ?? ''),
                    'summary' => [
                        'projectionCount' => (int)($manifestSummary['projectionCount'] ?? 0),
                        'fieldCount' => (int)($manifestSummary['fieldCount'] ?? 0),
                        'policyCount' => (int)($manifestSummary['policyCount'] ?? 0),
                        'releaseCount' => (int)($manifestSummary['releaseCount'] ?? 0),
                        'canonicalCoveragePercent' => (int)($manifestSummary['canonicalCoveragePercent'] ?? 0),
                        'registrySyncScore' => (int)($manifestSummary['registrySyncScore'] ?? 0),
                    ],
                ],
                'diagnostics' => [
                    'generatedAt' => (string)($diagnostics['_meta']['generatedAt'] ?? ''),
                    'summary' => [
                        'graphDensityScore' => (int)($diagnosticsSummary['graphDensityScore'] ?? 0),
                        'metadataCompletenessPercent' => (int)($diagnosticsSummary['metadataCompletenessPercent'] ?? 0),
                        'workflowBindingCoveragePercent' => (int)($diagnosticsSummary['workflowBindingCoveragePercent'] ?? 0),
                        'blockerCount' => (int)($diagnosticsSummary['blockerCount'] ?? 0),
                        'hotspotCount' => (int)($diagnosticsSummary['hotspotCount'] ?? 0),
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
            ],
            'audits' => [
                'blind_spots' => $blindSpotAudit,
                'stress' => $stressAudit,
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

    private function schemaStudioPath(string $segment): string
    {
        return $this->schemaStudioDir . '/' . ltrim($segment, '/');
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
                'dependencyPaths' => [],
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
                'dependencyPaths' => [],
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
                'label' => 'Table registry',
                'category' => 'authority',
                'path' => $this->registryPath('table-registry'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [],
            ],
            'schema_diagnostics' => [
                'label' => 'Schema diagnostics',
                'category' => 'authority',
                'path' => $this->registryPath('schema-studio-diagnostics'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('relation-map'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('schema-library'),
                    $this->configDir . '/variable_library.json',
                    $this->schemaStudioPath('designs/workspace.json'),
                    $this->schemaStudioPath('snapshots/workspace.baseline.json'),
                ],
            ],
            'schema_manifest' => [
                'label' => 'Schema enterprise manifest',
                'category' => 'authority',
                'path' => $this->registryPath('schema-studio-enterprise-manifest'),
                'targetAgeSeconds' => 14400,
                'requiredForRelease' => true,
                'dependencyPaths' => [
                    $this->registryPath('endpoint-catalog'),
                    $this->registryPath('relation-map'),
                    $this->registryPath('table-registry'),
                    $this->registryPath('schema-library'),
                    $this->configDir . '/variable_library.json',
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
                    $this->rootDir . '/database/schema.sql',
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
                    $this->registryPath('registry-manifest'),
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
                    $this->registryPath('registry-manifest'),
                ],
            ],
        ];

        $items = [];
        $allAges = [];
        $releaseAges = [];
        $largestId = '';
        $largestSize = 0;

        foreach ($specs as $id => $spec) {
            $item = $this->artifactInventoryItem(
                $id,
                $spec['label'],
                $spec['category'],
                $spec['path'],
                (int)$spec['targetAgeSeconds'],
                (array)($documents[$id] ?? []),
                !empty($spec['requiredForRelease']),
                array_values(array_filter((array)($spec['dependencyPaths'] ?? []), 'is_string'))
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
    private function artifactInventoryItem(string $id, string $label, string $category, string $path, int $targetAgeSeconds, array $payload, bool $requiredForRelease, array $dependencyPaths): array
    {
        clearstatcache(true, $path);
        $exists = is_file($path);
        $sizeBytes = $exists ? (int)(filesize($path) ?: 0) : 0;
        $mtime = $exists ? (int)(filemtime($path) ?: 0) : 0;
        $generatedAt = $this->extractArtifactGeneratedAt($payload);
        $generatedTimestamp = $this->isoToTimestamp($generatedAt);
        $basisTimestamp = $generatedTimestamp ?? ($mtime > 0 ? $mtime : null);
        $ageSeconds = $basisTimestamp === null ? null : max(0, time() - $basisTimestamp);
        $latestDependencyTimestamp = null;
        $latestDependencyPath = '';
        foreach ($dependencyPaths as $dependencyPath) {
            $dependencyTimestamp = $this->pathTimestamp($dependencyPath);
            if ($dependencyTimestamp === null) {
                continue;
            }
            if ($latestDependencyTimestamp === null || $dependencyTimestamp > $latestDependencyTimestamp) {
                $latestDependencyTimestamp = $dependencyTimestamp;
                $latestDependencyPath = $dependencyPath;
            }
        }
        $sourceDriftSeconds = ($basisTimestamp !== null && $latestDependencyTimestamp !== null && $latestDependencyTimestamp > $basisTimestamp)
            ? max(0, $latestDependencyTimestamp - $basisTimestamp)
            : 0;
        $dependencyStatus = $dependencyPaths === []
            ? 'n/a'
            : ($sourceDriftSeconds > self::ARTIFACT_DEPENDENCY_GRACE_SECONDS ? 'outdated' : 'aligned');

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
            'path' => ltrim(str_replace($this->rootDir, '', $path), '/'),
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
            'sourceDriftSeconds' => $sourceDriftSeconds,
            'sourceDriftLabel' => $sourceDriftSeconds > 0 ? $this->humanDuration($sourceDriftSeconds) : '0s',
            'latestDependencyAt' => $latestDependencyTimestamp !== null ? gmdate('c', $latestDependencyTimestamp) : '',
            'latestDependencyPath' => $latestDependencyPath !== '' ? ltrim(str_replace($this->rootDir, '', $latestDependencyPath), '/') : '',
        ];
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
        $pkDriftCount = 0;

        foreach ($tables as $table) {
            if (!is_array($table) || empty($table['db_present'])) {
                continue;
            }
            $missingColumns = array_values(array_filter((array)($table['missing_columns'] ?? []), 'is_scalar'));
            $unexpectedColumns = array_values(array_filter((array)($table['unexpected_columns'] ?? []), 'is_scalar'));
            $pkDrift = !empty($table['pk_drift']);
            if ($missingColumns === [] && $unexpectedColumns === [] && !$pkDrift) {
                continue;
            }
            $missingColumnCount += count($missingColumns);
            $unexpectedColumnCount += count($unexpectedColumns);
            if ($pkDrift) {
                $pkDriftCount += 1;
            }
            $structuralDrift[] = [
                'table' => (string)($table['key'] ?? ''),
                'label' => (string)($table['label'] ?? $table['key'] ?? ''),
                'domain' => (string)($table['domain'] ?? ''),
                'missing_columns' => array_slice($missingColumns, 0, 8),
                'unexpected_columns' => array_slice($unexpectedColumns, 0, 8),
                'pk_drift' => $pkDrift,
            ];
        }

        usort($structuralDrift, static function (array $a, array $b): int {
            $aScore = count((array)($a['missing_columns'] ?? [])) + count((array)($a['unexpected_columns'] ?? [])) + (!empty($a['pk_drift']) ? 1 : 0);
            $bScore = count((array)($b['missing_columns'] ?? [])) + count((array)($b['unexpected_columns'] ?? [])) + (!empty($b['pk_drift']) ? 1 : 0);
            return $bScore <=> $aScore;
        });

        return [
            'data_layer' => (array)($dbProbe['data_layer'] ?? []),
            'db_probe_applicable' => !empty($dbProbe['db_probe_applicable']),
            'reachable' => (bool)($dbProbe['reachable'] ?? false),
            'database' => (string)($dbProbe['database'] ?? ''),
            'schema' => (string)($dbProbe['schema'] ?? ''),
            'db_table_count' => (int)($dbProbe['db_table_count'] ?? 0),
            'present_lookup' => (array)($dbProbe['present_lookup'] ?? []),
            'present_table_count' => (int)($dbProbe['present_table_count'] ?? 0),
            'missing_table_count' => (int)($dbProbe['missing_table_count'] ?? 0),
            'missing_tables' => array_values(array_filter((array)($dbProbe['missing_tables'] ?? []), 'is_scalar')),
            'unexpected_tables' => array_values(array_filter((array)($dbProbe['unexpected_tables'] ?? []), 'is_scalar')),
            'unexpected_table_count' => count((array)($dbProbe['unexpected_tables'] ?? [])),
            'structural_drift_table_count' => count($structuralDrift),
            'missing_column_count' => $missingColumnCount,
            'unexpected_column_count' => $unexpectedColumnCount,
            'pk_drift_table_count' => $pkDriftCount,
            'structural_drift' => array_slice($structuralDrift, 0, 20),
            'error' => (string)($dbProbe['error'] ?? ''),
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
        $blindSpotAudit = $this->buildOperationalAuditSummary($blindSpotReport, 'scenario_id');
        $stressAudit = $this->buildOperationalAuditSummary($stressReport, 'scenario_id');
        $endpointCatalogIndexAvailable = is_file($this->registryPath('endpoint-catalog-index'));

        $staleAuthority = [];
        $heavyArtifacts = [];
        $dependencyOutdated = [];
        foreach ($artifactItems as $item) {
            $status = (string)($item['status'] ?? '');
            $category = (string)($item['category'] ?? '');
            if (!empty($item['requiredForRelease']) && in_array($status, ['missing', 'stale'], true) && $category === 'authority') {
                $staleAuthority[] = (string)($item['label'] ?? $item['id'] ?? 'artifact');
            }
            if (
                (int)($item['sizeBytes'] ?? 0) >= self::LARGE_ARTIFACT_WARN_BYTES
                && !(
                    $endpointCatalogIndexAvailable
                    && (string)($item['id'] ?? '') === 'endpoint_catalog'
                )
            ) {
                $heavyArtifacts[] = $item;
            }
            if (!empty($item['requiredForRelease']) && (int)($item['sourceDriftSeconds'] ?? 0) > self::ARTIFACT_DEPENDENCY_GRACE_SECONDS) {
                $dependencyOutdated[] = $item;
            }
        }

        $registryGapCount = 0;
        foreach ($tables as $table) {
            if (!is_array($table)) {
                continue;
            }
            $registryGapCount += (($table['registry_present'] ?? false) === false) ? 1 : 0;
        }

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
                'nextAction' => 'Re-run diagnose/compile so release artifacts catch up with newer registry and workspace inputs.',
            ];
        }

        if (empty($connection['reachable']) && $postgresPathActive) {
            $risks[] = [
                'id' => 'db_probe_unavailable',
                'severity' => 'critical',
                'blocking' => true,
                'title' => 'Live PostgreSQL probe failed',
                'detail' => (string)($connection['error'] ?? 'Database connection is unavailable.'),
                'nextAction' => 'Restore PostgreSQL connectivity before treating DB coverage signals as trustworthy.',
            ];
        }

        if (!empty($connection['reachable']) && !$postgresPathActive) {
            $risks[] = [
                'id' => 'runtime_storage_split_brain',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'DB probe is live but application runtime is not on PostgreSQL',
                'detail' => 'The control plane can see PostgreSQL, but the active DataLayer path is not writing/reading from PostgreSQL.',
                'nextAction' => 'Align runtime storage mode before using table coverage or release diagnostics as production truth.',
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

        if ($registryGapCount > 0 || (!empty($connection['reachable']) && ((int)($connection['missing_table_count'] ?? 0) > 0 || (int)($connection['unexpected_table_count'] ?? 0) > 0))) {
            $risks[] = [
                'id' => 'coverage_drift',
                'severity' => 'high',
                'blocking' => true,
                'title' => 'Registry coverage still diverges from live coverage',
                'detail' => 'Registry gaps: ' . $registryGapCount . '; DB missing tables: ' . (int)($connection['missing_table_count'] ?? 0) . '; unmanaged live tables: ' . (int)($connection['unexpected_table_count'] ?? 0) . '.',
                'nextAction' => 'Close relation-map/table-registry drift and reconcile missing or unmanaged live tables before promotion.',
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
                'nextAction' => 'Reconcile missing/unexpected columns and PK posture before treating runtime preview and release posture as truthful.',
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
            $severity = (string)($risk['severity'] ?? '');
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
            $releaseReasons[] = (string)($risk['title'] ?? $risk['id'] ?? 'risk');
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
            'auditTrail' => true,
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
                    'path' => (string)($item['path'] ?? ''),
                    'controller' => (string)($item['controller'] ?? ''),
                    'handler' => (string)($item['handler'] ?? ''),
                    'field_count' => (int)($item['field_count'] ?? 0),
                    'auth_required' => (bool)($item['auth_required'] ?? false),
                    'csrf_required' => (bool)($item['csrf_required'] ?? false),
                    'admin_only' => (bool)($item['admin_only'] ?? false),
                    'permission_count' => (int)($item['permission_count'] ?? 0),
                    'workflow_mode' => (string)($item['workflow_mode'] ?? ''),
                    'runtime_safe' => (bool)($item['runtime_safe'] ?? false),
                    'deletion_mode' => (string)($item['deletion_mode'] ?? ''),
                    'source' => (string)($item['source'] ?? ''),
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
                'path' => (string)($item['path'] ?? ''),
                'controller' => (string)($item['controller'] ?? ''),
                'handler' => (string)($item['handler'] ?? ''),
                'field_count' => (int)($item['field_count'] ?? 0),
                'auth_required' => (bool)($security['auth_required'] ?? false),
                'csrf_required' => (bool)($security['csrf_required'] ?? false),
                'admin_only' => (bool)($security['admin_only'] ?? false),
                'permission_count' => count($this->scalarStringList($security['permission_keys'] ?? [])),
                'workflow_mode' => (string)($workflow['execution_mode'] ?? $workflow['lifecycle_mode'] ?? ''),
                'runtime_safe' => (bool)($workflow['generic_runtime_safe'] ?? false),
                'deletion_mode' => (string)($deletion['mode'] ?? ''),
                'source' => (string)($item['source'] ?? ''),
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
        $postgresPathActive = !empty($modeSummary['postgres_path_active']);
        $result = [
            'data_layer' => $modeSummary,
            'db_probe_applicable' => $postgresPathActive,
            'reachable' => false,
            'database' => '',
            'schema' => '',
            'db_table_count' => 0,
            'present_lookup' => [],
            'column_lookup' => [],
            'pk_lookup' => [],
            'present_table_count' => 0,
            'missing_table_count' => $postgresPathActive ? count($tableKeys) : 0,
            'missing_tables' => [],
            'unexpected_tables' => [],
            'error' => '',
        ];

        if (!$postgresPathActive) {
            return $result;
        }

        try {
            $pdo = Connection::getInstance()->getPdo();
            $meta = $pdo->query('SELECT current_database() AS database_name, current_schema() AS schema_name')->fetch(PDO::FETCH_ASSOC) ?: [];
            $schemaName = (string)($meta['schema_name'] ?? 'public');

            $stmt = $pdo->prepare("
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = :schema
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
            ");
            $stmt->execute(['schema' => $schemaName]);
            $dbTables = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $name = trim((string)($row['table_name'] ?? ''));
                if ($name !== '') {
                    $dbTables[] = $name;
                }
            }

            $columnStmt = $pdo->prepare("
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = :schema
                ORDER BY table_name, ordinal_position
            ");
            $columnStmt->execute(['schema' => $schemaName]);
            $columnLookup = [];
            foreach ($columnStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $tableName = trim((string)($row['table_name'] ?? ''));
                $columnName = trim((string)($row['column_name'] ?? ''));
                if ($tableName === '' || $columnName === '') {
                    continue;
                }
                if (!isset($columnLookup[$tableName])) {
                    $columnLookup[$tableName] = [];
                }
                $columnLookup[$tableName][$columnName] = true;
            }

            $pkStmt = $pdo->prepare("
                SELECT kcu.table_name, kcu.column_name, kcu.ordinal_position
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.table_schema = :schema
                  AND tc.constraint_type = 'PRIMARY KEY'
                ORDER BY kcu.table_name, kcu.ordinal_position
            ");
            $pkStmt->execute(['schema' => $schemaName]);
            $pkLookup = [];
            foreach ($pkStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $tableName = trim((string)($row['table_name'] ?? ''));
                $columnName = trim((string)($row['column_name'] ?? ''));
                if ($tableName === '' || $columnName === '') {
                    continue;
                }
                if (!isset($pkLookup[$tableName])) {
                    $pkLookup[$tableName] = [];
                }
                $pkLookup[$tableName][] = $columnName;
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

            $result['reachable'] = true;
            $result['database'] = (string)($meta['database_name'] ?? '');
            $result['schema'] = $schemaName;
            $result['db_table_count'] = count($dbTables);
            $result['present_lookup'] = $dbLookup;
            $result['column_lookup'] = $columnLookup;
            $result['pk_lookup'] = $pkLookup;
            $result['present_table_count'] = count($tableKeys) - count($missing);
            $result['missing_table_count'] = count($missing);
            $result['missing_tables'] = array_slice($missing, 0, 50);
            $result['unexpected_tables'] = array_slice($unexpected, 0, 50);
        } catch (Throwable $e) {
            $result['error'] = $e->getMessage();
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $dbProbe
     * @return list<array<string, mixed>>
     */
    private function buildTableSummaries(array $tableRegistry, array $relationMap, array $dbProbe): array
    {
        $rows = [];
        $tables = is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : [];
        $entities = is_array($relationMap['entities'] ?? null) ? $relationMap['entities'] : [];
        $dbLookup = is_array($dbProbe['present_lookup'] ?? null) ? $dbProbe['present_lookup'] : [];
        $dbColumnLookup = is_array($dbProbe['column_lookup'] ?? null) ? $dbProbe['column_lookup'] : [];
        $dbPkLookup = is_array($dbProbe['pk_lookup'] ?? null) ? $dbProbe['pk_lookup'] : [];
        $dbProbeApplicable = !empty($dbProbe['db_probe_applicable']);

        foreach ($this->allTableKeys($tableRegistry, $relationMap) as $key) {
            $table = is_array($tables[$key] ?? null) ? $tables[$key] : [];
            $entity = is_array($entities[$key] ?? null) ? $entities[$key] : [];
            $columns = is_array($table['columns'] ?? null) ? array_keys($table['columns']) : [];
            $fieldNames = $columns !== [] ? $columns : $this->scalarStringList($entity['fields'] ?? []);
            $governanceMissing = $this->scalarStringList($entity['governanceMissing'] ?? []);
            $dbColumns = array_keys(is_array($dbColumnLookup[$key] ?? null) ? $dbColumnLookup[$key] : []);
            $expectedPkFields = $this->scalarStringList($table['primaryKeys'] ?? ($entity['primaryKeyFields'] ?? []));
            if ($expectedPkFields === []) {
                $expectedPrimaryKey = $this->scalarOrJoined($table['primaryKey'] ?? ($entity['primaryKey'] ?? ''));
                if ($expectedPrimaryKey !== '') {
                    $expectedPkFields = array_values(array_filter(array_map('trim', explode(',', $expectedPrimaryKey)), static fn(string $value): bool => $value !== ''));
                }
            }
            $dbPkFields = array_values(array_filter((array)($dbPkLookup[$key] ?? []), 'is_string'));
            $dbPresent = $dbProbeApplicable ? isset($dbLookup[$key]) : null;
            $missingColumns = $dbPresent === true ? array_values(array_diff($fieldNames, $dbColumns)) : [];
            $unexpectedColumns = $dbPresent === true ? array_values(array_diff($dbColumns, $fieldNames)) : [];
            $pkDrift = $dbPresent === true && $expectedPkFields !== [] && $dbPkFields !== $expectedPkFields;

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
                'registry_present' => $table !== [],
                'relation_present' => $entity !== [],
                'governance_complete' => $entity === [] ? true : (bool)($entity['governanceComplete'] ?? false),
                'governance_gap_count' => count($governanceMissing),
                'governance_missing' => array_slice($governanceMissing, 0, 6),
                'jsonb_field_count' => (int)($entity['jsonbFieldCount'] ?? 0),
                'digital_thread' => (bool)($entity['digitalThread'] ?? false),
                'db_probe_applicable' => $dbProbeApplicable,
                'db_present' => $dbPresent,
                'db_column_count' => count($dbColumns),
                'missing_column_count' => count($missingColumns),
                'unexpected_column_count' => count($unexpectedColumns),
                'column_drift_count' => count($missingColumns) + count($unexpectedColumns),
                'missing_columns' => array_slice($missingColumns, 0, 12),
                'unexpected_columns' => array_slice($unexpectedColumns, 0, 12),
                'expected_primary_key_fields' => $expectedPkFields,
                'db_primary_key_fields' => $dbPkFields,
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
                'description' => (string)($item['description'] ?? ''),
                'tableCount' => count(array_filter((array)($item['tables'] ?? []), 'is_scalar')),
                'migrationCount' => count(array_filter((array)($item['migrations'] ?? []), 'is_scalar')),
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
        foreach (glob($this->schemaStudioPath('designs/*.json')) ?: [] as $file) {
            $payload = $this->readJson((string)$file);
            if ($payload === []) {
                continue;
            }
            $meta = is_array($payload['_meta'] ?? null) ? $payload['_meta'] : [];
            $enterprise = is_array($meta['enterprise'] ?? null) ? $meta['enterprise'] : [];
            $id = (string)($meta['id'] ?? basename((string)$file, '.json'));

            $rows[] = [
                'id' => $id,
                'name' => (string)($meta['name'] ?? $id),
                'version' => (string)($meta['version'] ?? '1.0.0'),
                'updatedAt' => (string)($meta['updatedAt'] ?? $meta['generated_at'] ?? ''),
                'author' => (string)($meta['author'] ?? $enterprise['generated_by'] ?? ''),
                'profile' => (string)($enterprise['profile'] ?? $meta['profile'] ?? ''),
                'environment' => (string)($enterprise['environment'] ?? ''),
                'tableCount' => count((array)($payload['tables'] ?? [])),
                'relationCount' => count((array)($payload['relations'] ?? [])),
                'groupCount' => count((array)($payload['groups'] ?? [])),
                'baselineAvailable' => is_file($this->schemaStudioPath('snapshots/' . $id . '.baseline.json')),
                'lastCompiledAt' => (string)($enterprise['last_compiled_at'] ?? ''),
                'lastReleaseId' => (string)($enterprise['last_release_id'] ?? ''),
                'lastReleaseAt' => (string)($enterprise['last_release_at'] ?? ''),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => strcmp((string)$b['updatedAt'], (string)$a['updatedAt']));
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
        $dbProbeApplicable = array_reduce($tables, static function (bool $carry, $table): bool {
            return $carry || (is_array($table) && !empty($table['db_probe_applicable']));
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
            $registryGapCount = 0;
            $structuralDriftTableCount = 0;

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
                if ($dbProbeApplicable) {
                    $presentTableCount += (($table['db_present'] ?? false) === true) ? 1 : 0;
                }
                $workflowTableCount += (($table['workflowId'] ?? '') !== '') ? 1 : 0;
                $supportTableCount += (($table['supportTable'] ?? false) === true) ? 1 : 0;
                $governanceGapCount += ((int)($table['governance_gap_count'] ?? 0) > 0) ? 1 : 0;
                $registryGapCount += (($table['registry_present'] ?? false) === false) ? 1 : 0;
                $structuralDriftTableCount += ((int)($table['column_drift_count'] ?? 0) > 0 || !empty($table['pk_drift'])) ? 1 : 0;
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
                'missing_table_count' => $dbProbeApplicable ? max(0, $tableCount - $presentTableCount) : 0,
                'workflow_table_count' => $workflowTableCount,
                'support_table_count' => $supportTableCount,
                'governance_gap_count' => $governanceGapCount,
                'registry_gap_count' => $registryGapCount,
                'structural_drift_table_count' => $structuralDriftTableCount,
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
        foreach ($relationEntities as $key => $entity) {
            if (!is_array($entity)) {
                continue;
            }
            $missing = $this->scalarStringList($entity['governanceMissing'] ?? []);
            if ($missing === []) {
                continue;
            }
            $governanceGaps[] = [
                'table' => (string)$key,
                'label' => (string)($entity['label'] ?? $this->humanize((string)$key)),
                'domain' => (string)($entity['domain'] ?? ''),
                'missing' => array_slice($missing, 0, 6),
                'missing_count' => count($missing),
            ];
        }

        usort($governanceGaps, static fn(array $a, array $b): int => $b['missing_count'] <=> $a['missing_count']);
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
                'source' => 'schema_diagnostics',
                'severity' => (string)($blocker['severity'] ?? 'medium'),
                'title' => (string)($blocker['title'] ?? 'diagnostic_blocker'),
                'detail' => (string)($blocker['detail'] ?? ''),
                'nextAction' => (string)($blocker['nextAction'] ?? ''),
            ];
        }

        $migrationHotspots = [];
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
            $pkDrift = !empty($table['pk_drift']);
            if ($missingColumns === [] && $unexpectedColumns === [] && !$pkDrift) {
                continue;
            }
            $structuralDrift[] = [
                'table' => (string)($table['key'] ?? ''),
                'label' => (string)($table['label'] ?? $table['key'] ?? ''),
                'domain' => (string)($table['domain'] ?? ''),
                'missing' => $missingColumns,
                'unexpected' => $unexpectedColumns,
                'pk_drift' => $pkDrift,
            ];
        }
        usort($structuralDrift, static function (array $a, array $b): int {
            $aScore = count((array)($a['missing'] ?? [])) + count((array)($a['unexpected'] ?? [])) + (!empty($a['pk_drift']) ? 1 : 0);
            $bScore = count((array)($b['missing'] ?? [])) + count((array)($b['unexpected'] ?? [])) + (!empty($b['pk_drift']) ? 1 : 0);
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
            'db_missing_tables' => !empty($connection['db_probe_applicable']) ? array_slice(array_values(array_filter((array)($connection['missing_tables'] ?? []), 'is_scalar')), 0, 12) : [],
            'db_unexpected_tables' => !empty($connection['db_probe_applicable']) ? array_slice(array_values(array_filter((array)($connection['unexpected_tables'] ?? []), 'is_scalar')), 0, 12) : [],
            'structural_drift' => array_slice($structuralDrift, 0, 12),
            'blind_spots' => array_slice(array_values(array_filter((array)($blindSpotAudit['critical'] ?? []), 'is_array')), 0, 8),
            'stress_scenarios' => array_slice(array_values(array_filter((array)($stressAudit['critical'] ?? []), 'is_array')), 0, 8),
            'migration_hotspots' => $migrationHotspots,
        ];
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
                'description' => 'Create a working schema document from the current registry and relation map.',
            ],
            [
                'id' => 'reverse_engineer',
                'label' => 'Reverse Engineer',
                'label_vi' => 'Đọc ngược từ DB',
                'api_action' => 'schema_studio_reverse_engineer',
                'method' => 'POST',
                'writes' => false,
                'description' => 'Introspect PostgreSQL and build a working schema document from live tables and foreign keys.',
            ],
            [
                'id' => 'validate',
                'label' => 'Validate',
                'label_vi' => 'Kiểm tra schema',
                'api_action' => 'schema_studio_validate',
                'method' => 'POST',
                'writes' => false,
                'description' => 'Run structural validation rules against the current working schema.',
            ],
            [
                'id' => 'diagnose',
                'label' => 'Diagnose',
                'label_vi' => 'Chẩn đoán',
                'api_action' => 'schema_studio_diagnose',
                'method' => 'POST',
                'writes' => false,
                'description' => 'Generate diagnostics, blockers, hotspots and governance recommendations.',
            ],
            [
                'id' => 'compile',
                'label' => 'Compile Registry',
                'label_vi' => 'Biên dịch registry',
                'api_action' => 'schema_studio_compile_registry',
                'method' => 'POST',
                'writes' => true,
                'description' => 'Build runtime projections, contracts and enterprise manifest artifacts.',
            ],
            [
                'id' => 'release',
                'label' => 'Create Release Bundle',
                'label_vi' => 'Tạo release bundle',
                'api_action' => 'schema_studio_release_bundle',
                'method' => 'POST',
                'writes' => true,
                'description' => 'Generate a governed release bundle with typed diff, risk and approval posture.',
            ],
            [
                'id' => 'set_baseline',
                'label' => 'Set Baseline',
                'label_vi' => 'Chốt baseline',
                'api_action' => 'schema_studio_set_baseline',
                'method' => 'POST',
                'writes' => true,
                'description' => 'Persist the current working schema as the baseline for future diff and release flows.',
            ],
        ];
    }
}
