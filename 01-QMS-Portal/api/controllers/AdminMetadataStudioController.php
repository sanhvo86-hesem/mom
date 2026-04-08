<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

/**
 * Admin metadata studio controller.
 *
 * Provides a focused admin API for governing API catalog metadata,
 * table registry definitions, schema blueprints, canonical data fields,
 * and variable libraries from one unified admin workspace.
 */
class AdminMetadataStudioController extends BaseController
{
    private function registryDir(): string
    {
        $dir = $this->dataDir . '/registry';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }

    private function registryPath(string $name): string
    {
        return $this->registryDir() . '/' . $name . '.json';
    }

    private function configPath(string $file): string
    {
        return $this->confDir . '/' . $file;
    }

    private function slugifyKey(string $value, string $separator = '_'): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9._-]+/', $separator, $value) ?? '';
        $value = preg_replace('/' . preg_quote($separator, '/') . '+/', $separator, $value) ?? '';
        return trim($value, $separator);
    }

    private function nowIso(): string
    {
        return gmdate('c');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function benchmarkReferences(): array
    {
        return [
            [
                'key' => 'postman_api_catalog',
                'platform' => 'Postman API Catalog',
                'url' => 'https://learning.postman.com/docs/api-catalog/overview/',
                'focus' => [
                    'central API catalog',
                    'governance groups',
                    'ownership and health visibility',
                ],
            ],
            [
                'key' => 'supabase_tables',
                'platform' => 'Supabase Tables and Data',
                'url' => 'https://supabase.com/docs/guides/database/tables',
                'focus' => [
                    'schema > table > column navigation',
                    'spreadsheet-like table editor',
                    'physical schema + easy data operations',
                ],
            ],
            [
                'key' => 'supabase_auto_docs',
                'platform' => 'Supabase Auto-generated Docs',
                'url' => 'https://supabase.com/docs/guides/api/rest/auto-generated-docs',
                'focus' => [
                    'API docs generated from schema',
                    'table/view-aware documentation',
                ],
            ],
            [
                'key' => 'directus_data_model',
                'platform' => 'Directus Data Model',
                'url' => 'https://docs.directus.io/app/data-model',
                'focus' => [
                    'SQL-backed visual data model',
                    'collections, fields, relations',
                    'human labels over physical structures',
                ],
            ],
            [
                'key' => 'hasura_metadata',
                'platform' => 'Hasura Metadata-driven API Layer',
                'url' => 'https://hasura.io/ddn',
                'focus' => [
                    'metadata-powered API platform',
                    'governance through declarative metadata',
                    'cross-domain aggregation',
                ],
            ],
            [
                'key' => 'dataverse_metadata',
                'platform' => 'Microsoft Dataverse Metadata',
                'url' => 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-update-entity-definitions-using-web-api',
                'focus' => [
                    'logical names vs display names',
                    'localized labels',
                    'table definition through API',
                ],
            ],
            [
                'key' => 'dataverse_virtual_tables',
                'platform' => 'Microsoft Dataverse Virtual Tables',
                'url' => 'https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-edit-virtual-entities',
                'focus' => [
                    'external data surfaced as tables',
                    'virtual schema governance',
                ],
            ],
            [
                'key' => 'ifs_projections',
                'platform' => 'IFS Cloud Projections',
                'url' => 'https://docs.ifs.com/techdocs/25r2/030_administration/010_security/020_permission_sets/004_permission_set_overview/010_projections/',
                'focus' => [
                    'bounded API surface',
                    'permission set based access levels',
                ],
            ],
            [
                'key' => 'oracle_workflow_status',
                'platform' => 'Oracle Quality Workflow Status',
                'url' => 'https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/24b/fauqm/workflow-status.html',
                'focus' => [
                    'predefined quality workflow states',
                    'read-only states and status governance',
                ],
            ],
        ];
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function benchmarkPrinciples(): array
    {
        return [
            [
                'title' => 'Metadata First',
                'description' => 'Giữ API, table, field và schema ở dạng metadata có thể kiểm soát, thay vì hardcode rải rác trong UI.',
            ],
            [
                'title' => 'Physical + Logical Together',
                'description' => 'Hiển thị tên kỹ thuật cùng label nghiệp vụ/song ngữ để người vận hành và kỹ sư cùng làm việc được trên một màn.',
            ],
            [
                'title' => 'Reusable Fields',
                'description' => 'Field không nên sống đơn lẻ; chúng cần được liên kết với endpoint, db column, status set và validation rule rõ ràng.',
            ],
            [
                'title' => 'Bounded Governance',
                'description' => 'API nên có owner/module/domain/phạm vi rõ ràng; schema nên gom theo business capability thay vì file kỹ thuật rời rạc.',
            ],
            [
                'title' => 'Variables as Assets',
                'description' => 'Variable library cần được quản trị như tài sản hệ thống để template, form, document và automation dùng chung.',
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function apiSummaries(array $endpointCatalog): array
    {
        $rows = [];
        $endpoints = is_array($endpointCatalog['endpoints'] ?? null) ? $endpointCatalog['endpoints'] : [];
        foreach ($endpoints as $action => $item) {
            if (!is_array($item)) {
                continue;
            }
            $rows[] = [
                'key' => (string)$action,
                'action' => (string)($item['action'] ?? $action),
                'label' => (string)($item['label'] ?? $action),
                'labelEn' => (string)($item['labelEn'] ?? $item['label'] ?? $action),
                'module' => (string)($item['module'] ?? ''),
                'moduleEn' => (string)($item['moduleEn'] ?? $item['module'] ?? ''),
                'method' => strtoupper((string)($item['method'] ?? 'GET')),
                'kind' => (string)($item['kind'] ?? ''),
                'domain' => (string)($item['domain'] ?? ''),
                'entity' => (string)($item['entity'] ?? ''),
                'field_count' => (int)($item['field_count'] ?? 0),
                'source' => (string)($item['source'] ?? ''),
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            return [$a['module'], $a['action']] <=> [$b['module'], $b['action']];
        });

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function tableSummaries(array $tableRegistry): array
    {
        $rows = [];
        $tables = is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : [];
        foreach ($tables as $tableKey => $item) {
            if (!is_array($item)) {
                continue;
            }
            $rows[] = [
                'key' => (string)$tableKey,
                'label' => (string)($item['label'] ?? $tableKey),
                'labelEn' => (string)($item['labelEn'] ?? $item['label'] ?? $tableKey),
                'domain' => (string)($item['domain'] ?? ''),
                'migration' => (string)($item['migration'] ?? ''),
                'workflowId' => (string)($item['workflowId'] ?? ''),
                'statusColumn' => (string)($item['statusColumn'] ?? ''),
                'columnCount' => (int)($item['columnCount'] ?? count((array)($item['columns'] ?? []))),
                'supportTable' => (bool)($item['supportTable'] ?? false),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => [$a['domain'], $a['key']] <=> [$b['domain'], $b['key']]);
        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function schemaSummaries(array $schemaLibrary): array
    {
        $rows = [];
        $entities = is_array($schemaLibrary['entities'] ?? null) ? $schemaLibrary['entities'] : [];
        foreach ($entities as $schemaKey => $item) {
            if (!is_array($item)) {
                continue;
            }
            $rows[] = [
                'key' => (string)$schemaKey,
                'description' => (string)($item['description'] ?? ''),
                'tableCount' => count((array)($item['tables'] ?? [])),
                'migrationCount' => count((array)($item['migrations'] ?? [])),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => $a['key'] <=> $b['key']);
        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function variableSummaries(array $variableLibrary): array
    {
        $rows = [];
        $categories = is_array($variableLibrary['categories'] ?? null) ? $variableLibrary['categories'] : [];
        foreach ($categories as $categoryKey => $item) {
            if (!is_array($item)) {
                continue;
            }
            $rows[] = [
                'key' => (string)$categoryKey,
                'label' => (string)($item['label'] ?? $categoryKey),
                'label_vi' => (string)($item['label_vi'] ?? $item['label'] ?? $categoryKey),
                'description' => (string)($item['description'] ?? ''),
                'variableCount' => count((array)($item['variables'] ?? [])),
            ];
        }

        usort($rows, static fn(array $a, array $b): int => $a['key'] <=> $b['key']);
        return $rows;
    }

    private function countVariables(array $variableLibrary): int
    {
        $count = 0;
        $categories = is_array($variableLibrary['categories'] ?? null) ? $variableLibrary['categories'] : [];
        foreach ($categories as $item) {
            if (is_array($item)) {
                $count += count((array)($item['variables'] ?? []));
            }
        }
        return $count;
    }

    private function dataFieldsIndex(): array
    {
        return $this->readJsonFile($this->registryPath('data-fields')) ?? [];
    }

    private function schemaStudioManifest(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-enterprise-manifest')) ?? [];
    }

    private function schemaStudioRuntimeProjection(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-runtime-projections')) ?? [];
    }

    private function schemaStudioReleaseLog(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-release-log')) ?? [];
    }

    private function schemaStudioDiagnostics(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-diagnostics')) ?? [];
    }

    private function schemaStudioExperienceReport(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-experience-report')) ?? [];
    }

    private function schemaStudioOperationsReport(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-operations-report')) ?? [];
    }

    private function schemaStudioCommandCenterReport(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-command-center-report')) ?? [];
    }

    private function schemaStudioRound7Report(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-round7-report')) ?? [];
    }

    private function schemaStudioRound9Report(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-round9-report')) ?? [];
    }

    private function schemaStudioRound10Report(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-round10-report')) ?? [];
    }

    private function schemaStudioRound11Report(): array
    {
        return $this->readJsonFile($this->registryPath('schema-studio-round11-report')) ?? [];
    }


    /**
     * @return array<int, array<string, mixed>>
     */
    private function dataFieldsParts(array $index): array
    {
        $parts = $index['parts'] ?? ($index['_meta']['parts'] ?? []);
        return is_array($parts) ? array_values(array_filter($parts, 'is_array')) : [];
    }

    private function loadDataFieldsEntry(string $endpointKey): ?array
    {
        $index = $this->dataFieldsIndex();
        if (isset($index[$endpointKey]) && is_array($index[$endpointKey])) {
            return array_values((array)$index[$endpointKey]);
        }

        foreach ($this->dataFieldsParts($index) as $part) {
            $file = trim((string)($part['file'] ?? ''));
            if ($file === '') {
                continue;
            }
            $payload = $this->readJsonFile($this->registryDir() . '/' . $file) ?? [];
            if (isset($payload[$endpointKey]) && is_array($payload[$endpointKey])) {
                return array_values((array)$payload[$endpointKey]);
            }
        }

        return null;
    }

    /**
     * @param array<int, array<string, mixed>> $fields
     */
    private function saveDataFieldsEntry(string $endpointKey, array $fields): void
    {
        $fields = array_values(array_filter($fields, 'is_array'));
        $indexPath = $this->registryPath('data-fields');
        $index = $this->readJsonFile($indexPath) ?? [];
        $parts = $this->dataFieldsParts($index);

        if (array_key_exists($endpointKey, $index)) {
            unset($index[$endpointKey]);
        }

        $updated = false;
        foreach ($parts as $part) {
            $file = trim((string)($part['file'] ?? ''));
            if ($file === '') {
                continue;
            }
            $path = $this->registryDir() . '/' . $file;
            $payload = $this->readJsonFile($path) ?? [];
            if (!array_key_exists($endpointKey, $payload)) {
                continue;
            }
            $payload[$endpointKey] = $fields;
            $this->writeJsonFile($path, $payload);
            $updated = true;
            break;
        }

        if (!$updated) {
            if ($parts !== []) {
                $last = $parts[count($parts) - 1];
                $file = trim((string)($last['file'] ?? ''));
                if ($file !== '') {
                    $path = $this->registryDir() . '/' . $file;
                    $payload = $this->readJsonFile($path) ?? [];
                    $payload[$endpointKey] = $fields;
                    $this->writeJsonFile($path, $payload);
                    $updated = true;
                }
            }
            if (!$updated) {
                $index[$endpointKey] = $fields;
            }
        }

        $this->writeJsonFile($indexPath, $index);
    }

    private function touchMeta(array &$payload, ?string $countKey = null, ?int $count = null): void
    {
        if (!isset($payload['_meta']) || !is_array($payload['_meta'])) {
            $payload['_meta'] = [];
        }
        $payload['_meta']['generatedAt'] = $this->nowIso();
        if ($countKey !== null && $count !== null) {
            $payload['_meta'][$countKey] = $count;
        }
    }

    private function ensureDomainEntry(array &$tableRegistry, string $domain): void
    {
        if (!isset($tableRegistry['domains']) || !is_array($tableRegistry['domains'])) {
            $tableRegistry['domains'] = [];
        }
        if (isset($tableRegistry['domains'][$domain]) && is_array($tableRegistry['domains'][$domain])) {
            return;
        }

        $label = str_replace('_', ' ', $domain);
        $label = ucwords($label);
        $tableRegistry['domains'][$domain] = [
            'label' => $label,
            'labelEn' => $label,
            'icon' => 'fa-database',
            'color' => '#2563eb',
            'description' => '',
            'tables' => [],
            'workflows' => [],
            'relatedDomains' => [],
        ];
    }

    private function syncTableDomainMembership(array &$tableRegistry, string $tableKey, string $domain): void
    {
        if (!isset($tableRegistry['domains']) || !is_array($tableRegistry['domains'])) {
            $tableRegistry['domains'] = [];
        }

        foreach ($tableRegistry['domains'] as $domainKey => $domainMeta) {
            if (!is_array($domainMeta)) {
                continue;
            }
            $tables = array_values(array_filter((array)($domainMeta['tables'] ?? []), static function ($item) use ($tableKey): bool {
                return (string)$item !== $tableKey;
            }));
            $tableRegistry['domains'][$domainKey]['tables'] = $tables;
        }

        $this->ensureDomainEntry($tableRegistry, $domain);
        $tables = array_values(array_unique(array_merge(
            (array)($tableRegistry['domains'][$domain]['tables'] ?? []),
            [$tableKey],
        )));
        sort($tables);
        $tableRegistry['domains'][$domain]['tables'] = $tables;
    }

    /**
     * GET admin_metadata_studio_summary
     */
    public function getSummary(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        // --- Lightweight load: only files needed for counts/summaries ---
        // Heavy files (endpoint-catalog 17MB, table-registry 3.4MB, runtime-projections 688KB,
        // and 8 report files) are NOT fully loaded here. The manifest already carries all
        // score/count fields in its summary section, so individual reports are not needed.
        $schemaStudioManifest = $this->schemaStudioManifest(); // ~83KB, has all summary scores
        $schemaStudioReleaseLog = $this->schemaStudioReleaseLog(); // ~1KB
        $dataFieldsIndex = $this->dataFieldsIndex();

        // Use only summary sub-objects from reports (zero-cost when manifest covers them).
        // These are small arrays derived from the manifest so no large file is loaded.
        $mSum = is_array($schemaStudioManifest['summary'] ?? null) ? $schemaStudioManifest['summary'] : [];

        // For lists (dropdown options), load only the counts metadata without the full files.
        $endpointCount = (int)($schemaStudioManifest['summary']['endpointCount']
            ?? $dataFieldsIndex['_meta']['generatedEndpointCount']
            ?? $dataFieldsIndex['_meta']['sourceEndpointCount']
            ?? 0);
        $tableCount = (int)($schemaStudioManifest['summary']['tableCount']
            ?? $schemaStudioManifest['summary']['projectionCount']
            ?? 0);

        // Lazy-load lists only when counts are small enough to be safe (<= 500 items).
        // For very large catalogs, return empty lists so the UI doesn't crash — details
        // are accessible via admin_metadata_studio_detail.
        $maxListSize = 500;
        $endpointCatalog = $endpointCount <= $maxListSize
            ? ($this->readJsonFile($this->registryPath('endpoint-catalog')) ?? [])
            : [];
        $tableRegistry = $tableCount <= $maxListSize
            ? ($this->readJsonFile($this->registryPath('table-registry')) ?? [])
            : [];
        $schemaLibrary = $this->readJsonFile($this->registryPath('schema-library')) ?? [];
        $variableLibrary = $this->readJsonFile($this->configPath('variable_library.json')) ?? [];

        $apiSummaries = $this->apiSummaries($endpointCatalog);
        $tableSummaries = $this->tableSummaries($tableRegistry);
        $schemaSummaries = $this->schemaSummaries($schemaLibrary);
        $variableSummaries = $this->variableSummaries($variableLibrary);

        $this->success([
            'overview' => [
                'endpointCount'                        => count($apiSummaries) ?: $endpointCount,
                'tableCount'                           => count($tableSummaries) ?: $tableCount,
                'schemaCount'                          => count($schemaSummaries),
                'variableCategoryCount'                => count($variableSummaries),
                'variableCount'                        => $this->countVariables($variableLibrary),
                'dataFieldEndpointCount'               => (int)($dataFieldsIndex['_meta']['generatedEndpointCount'] ?? $dataFieldsIndex['_meta']['sourceEndpointCount'] ?? count($this->dataFieldsParts($dataFieldsIndex))),
                // All scores read directly from manifest summary — no heavy report files needed.
                'schemaStudioProjectionCount'          => (int)($mSum['projectionCount'] ?? 0),
                'schemaStudioReleaseCount'             => (int)($mSum['releaseCount'] ?? count((array)($schemaStudioReleaseLog['items'] ?? []))),
                'schemaStudioPolicyCount'              => (int)($mSum['policyCount'] ?? 0),
                'schemaStudioCanonicalCoverage'        => (int)($mSum['canonicalCoveragePercent'] ?? 0),
                'schemaStudioCriticalGaps'             => (int)($mSum['criticalCanonicalGaps'] ?? 0),
                'schemaStudioVisualReadiness'          => (int)($mSum['visualReadinessScore'] ?? 0),
                'schemaStudioMetadataCompleteness'     => (int)($mSum['metadataCompletenessPercent'] ?? 0),
                'schemaStudioGraphDensity'             => (int)($mSum['graphDensityScore'] ?? 0),
                'schemaStudioWorkflowCoverage'         => (int)($mSum['workflowBindingCoveragePercent'] ?? 0),
                'schemaStudioOrphanRisk'               => (int)($mSum['orphanRelationRiskCount'] ?? 0),
                'schemaStudioHotspots'                 => (int)($mSum['hotspotCount'] ?? 0),
                'schemaStudioGovernanceCoverage'       => (int)($mSum['governanceCoveragePercent'] ?? 0),
                'schemaStudioJourneyReadiness'         => (int)($mSum['journeyReadinessScore'] ?? 0),
                'schemaStudioDomainReadiness'          => (int)($mSum['domainReadinessScore'] ?? 0),
                'schemaStudioReleaseRadar'             => (int)($mSum['releaseRadarScore'] ?? 0),
                'schemaStudioBlockers'                 => (int)($mSum['blockerCount'] ?? 0),
                'schemaStudioDomainCount'              => (int)($mSum['domainCount'] ?? 0),
                'schemaStudioLayerCount'               => (int)($mSum['layerCount'] ?? 0),
                'schemaStudioStoryboardCount'          => (int)($mSum['storyboardCount'] ?? 0),
                'schemaStudioPolicyCoverage'           => (int)($mSum['policyCoveragePercent'] ?? 0),
                'schemaStudioPerformancePosture'       => (int)($mSum['performancePostureScore'] ?? 0),
                'schemaStudioRegistrySync'             => (int)($mSum['registrySyncScore'] ?? 0),
                'schemaStudioComplianceReadiness'      => (int)($mSum['complianceReadinessScore'] ?? 0),
                'schemaStudioAICopilotReadiness'       => (int)($mSum['aiCopilotReadinessScore'] ?? 0),
                'schemaStudioExperienceScore'          => (int)($mSum['experienceScore'] ?? 0),
                'schemaStudioOperationsScore'          => (int)($mSum['operationsScore'] ?? 0),
                'schemaStudioPromotionReadiness'       => (int)($mSum['promotionReadinessScore'] ?? 0),
                'schemaStudioFirewallScore'            => (int)($mSum['firewallScore'] ?? 0),
                'schemaStudioObservabilityScore'       => (int)($mSum['observabilityScore'] ?? 0),
                'schemaStudioCommandCenterScore'       => (int)($mSum['commandCenterScore'] ?? 0),
                'schemaStudioPersonaCount'             => (int)($mSum['personaCount'] ?? 0),
                'schemaStudioPlaybookCount'            => (int)($mSum['playbookCount'] ?? 0),
                'schemaStudioReleaseLaneCount'         => (int)($mSum['releaseLaneCount'] ?? 0),
                'schemaStudioCopilotSuggestionCount'   => (int)($mSum['copilotSuggestionCount'] ?? 0),
                'schemaStudioFocusDeckCount'           => (int)($mSum['focusDeckCount'] ?? 0),
                'schemaStudioBranchCount'              => (int)($mSum['branchCount'] ?? 0),
                'schemaStudioEnvironmentCount'         => (int)($mSum['environmentCount'] ?? 0),
                'schemaStudioStageCount'               => (int)($mSum['stageCount'] ?? 0),
                'schemaStudioEventRailCount'           => (int)($mSum['eventRailCount'] ?? 0),
                'schemaStudioOrchestrationScore'       => (int)($mSum['orchestrationScore'] ?? 0),
                'schemaStudioNarrativeCoverage'        => (int)($mSum['narrativeCoverageScore'] ?? 0),
                'schemaStudioReviewWallScore'          => (int)($mSum['reviewWallScore'] ?? 0),
                'schemaStudioAtlasReadiness'           => (int)($mSum['atlasReadinessScore'] ?? 0),
                'schemaStudioLivePulseScore'           => (int)($mSum['livePulseScore'] ?? 0),
                'schemaStudioCollaborationReadiness'   => (int)($mSum['collaborationReadinessScore'] ?? 0),
                'schemaStudioVisualPolish'             => (int)($mSum['visualPolishScore'] ?? 0),
                'schemaStudioSceneCount'               => (int)($mSum['sceneCount'] ?? 0),
                'schemaStudioSpotlightCount'           => (int)($mSum['spotlightCount'] ?? 0),
                'schemaStudioReviewLaneCount'          => (int)($mSum['reviewLaneCount'] ?? 0),
                'schemaStudioAtlasCount'               => (int)($mSum['atlasCount'] ?? 0),
                'schemaStudioAtlasMeshScore'           => (int)($mSum['atlasMeshScore'] ?? 0),
                'schemaStudioPhysicalCoverage'         => (int)($mSum['physicalCoverageScore'] ?? 0),
                'schemaStudioReviewOpsScore'           => (int)($mSum['reviewOpsScore'] ?? 0),
                'schemaStudioExportSurfaceScore'       => (int)($mSum['exportSurfaceScore'] ?? 0),
                'schemaStudioInteroperabilityScore'    => (int)($mSum['interoperabilityScore'] ?? 0),
                'schemaStudioRoleModeScore'            => (int)($mSum['roleModeScore'] ?? 0),
                'schemaStudioTraceabilityAtlasScore'   => (int)($mSum['traceabilityAtlasScore'] ?? 0),
                'schemaStudioBeautySystemScore'        => (int)($mSum['beautySystemScore'] ?? 0),
                'schemaStudioObjectSurfaceCount'       => (int)($mSum['objectSurfaceCount'] ?? 0),
                'schemaStudioRoleModeCount'            => (int)($mSum['roleModeCount'] ?? 0),
                'schemaStudioReviewBoardCount'         => (int)($mSum['reviewBoardCount'] ?? 0),
                'schemaStudioExportBundleCount'        => (int)($mSum['exportBundleCount'] ?? 0),
                'schemaStudioVisualLanguageScore'      => (int)($mSum['visualLanguageScore'] ?? 0),
                'schemaStudioCardHierarchy'            => (int)($mSum['cardHierarchyScore'] ?? 0),
                'schemaStudioEdgeLegibility'           => (int)($mSum['edgeLegibilityScore'] ?? 0),
                'schemaStudioLaneReadability'          => (int)($mSum['laneReadabilityScore'] ?? 0),
                'schemaStudioAccessibilityScore'       => (int)($mSum['accessibilityScore'] ?? 0),
                'schemaStudioDensityDiscipline'        => (int)($mSum['densityDisciplineScore'] ?? 0),
                'schemaStudioCardModeCoverage'         => (int)($mSum['cardModeCoverageScore'] ?? 0),
                'schemaStudioVisualDirectorScore'      => (int)($mSum['visualDirectorScore'] ?? 0),
                'schemaStudioVisualLaneCount'          => (int)($mSum['laneCount'] ?? 0),
                'schemaStudioVisualModeCount'          => (int)($mSum['cardModeCount'] ?? 0),
                'schemaStudioEdgeLensCount'            => (int)($mSum['edgeLensCount'] ?? 0),
                'schemaStudioVisualQuickActionCount'   => (int)($mSum['quickActionCount'] ?? 0),
                'schemaStudioReviewTheatreScore'       => (int)($mSum['reviewTheatreScore'] ?? 0),
                'schemaStudioThemeSystemScore'         => (int)($mSum['themeSystemScore'] ?? 0),
                'schemaStudioScenePresetScore'         => (int)($mSum['scenePresetScore'] ?? 0),
                'schemaStudioSelectionRailScore'       => (int)($mSum['selectionRailScore'] ?? 0),
                'schemaStudioLaneTelemetryScore'       => (int)($mSum['laneTelemetryScore'] ?? 0),
                'schemaStudioSemanticLegendScore'      => (int)($mSum['semanticLegendScore'] ?? 0),
                'schemaStudioFocusNarrativeScore'      => (int)($mSum['focusNarrativeScore'] ?? 0),
                'schemaStudioKeyboardFlowScore'        => (int)($mSum['keyboardFlowScore'] ?? 0),
                'schemaStudioThemeCount'               => (int)($mSum['themeCount'] ?? 0),
                'schemaStudioScenePresetCount'         => (int)($mSum['scenePresetCount'] ?? 0),
                'schemaStudioReviewRailActionCount'    => (int)($mSum['reviewRailActionCount'] ?? 0),
                'schemaStudioLegendGroupCount'         => (int)($mSum['legendGroupCount'] ?? 0),
                'schemaStudioLaneTelemetryCount'       => (int)($mSum['laneTelemetryCount'] ?? 0),
                'schemaStudioShortcutCount'            => (int)($mSum['shortcutCount'] ?? 0),
                'schemaStudioPresentationStudioScore'  => (int)($mSum['presentationStudioScore'] ?? 0),
                'schemaStudioEvidenceDockScore'        => (int)($mSum['evidenceDockScore'] ?? 0),
                'schemaStudioSpotlightPackScore'       => (int)($mSum['spotlightPackScore'] ?? 0),
                'schemaStudioQuietCanvasScore'         => (int)($mSum['quietCanvasScore'] ?? 0),
                'schemaStudioAccessibilityOpsScore'    => (int)($mSum['accessibilityOpsScore'] ?? 0),
                'schemaStudioTopologyReadingScore'     => (int)($mSum['topologyReadingScore'] ?? 0),
                'schemaStudioExecutiveReadoutScore'    => (int)($mSum['executiveReadoutScore'] ?? 0),
                'schemaStudioLegendDisciplineScore'    => (int)($mSum['legendDisciplineScore'] ?? 0),
                'schemaStudioSpotlightPackCount'       => (int)($mSum['spotlightPackCount'] ?? 0),
                'schemaStudioEvidenceModeCount'        => (int)($mSum['evidenceModeCount'] ?? 0),
                'schemaStudioLegendModeCount'          => (int)($mSum['legendModeCount'] ?? 0),
                'schemaStudioTypeScaleCount'           => (int)($mSum['typeScaleCount'] ?? 0),
                'schemaStudioDockActionCount'          => (int)($mSum['dockActionCount'] ?? 0),
                'schemaStudioRound11ShortcutCount'     => (int)($mSum['shortcutCount'] ?? 0),
            ],
            'benchmarks' => $this->benchmarkReferences(),
            'principles' => $this->benchmarkPrinciples(),
            'schemaStudio' => [
                // Only the manifest summary is returned — no full report objects.
                // JS patches (round6–round11) have built-in fallbacks to overview.* fields.
                'manifest' => ['summary' => $mSum],
                'runtimeProjection' => [
                    'tableCount'    => (int)($mSum['projectionCount'] ?? 0),
                    'relationCount' => (int)($mSum['relationCount'] ?? 0),
                ],
                'releaseLog' => array_slice((array)($schemaStudioReleaseLog['items'] ?? []), 0, 10),
            ],
            'lists' => [
                'apis'      => $apiSummaries,
                'tables'    => $tableSummaries,
                'schemas'   => $schemaSummaries,
                'variables' => $variableSummaries,
            ],
        ]);
    }

    /**
     * GET admin_metadata_studio_detail?type=api|table|schema|variable&key=...
     */
    public function getDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $type = trim((string)$this->query('type', ''));
        $key = trim((string)$this->query('key', ''));
        if ($type === '' || $key === '') {
            $this->error('missing_type_or_key', 400);
        }

        switch ($type) {
            case 'api': {
                $endpointCatalog = $this->readJsonFile($this->registryPath('endpoint-catalog')) ?? [];
                $endpoint = is_array($endpointCatalog['endpoints'][$key] ?? null) ? $endpointCatalog['endpoints'][$key] : null;
                if ($endpoint === null) {
                    $this->error('api_not_found', 404);
                }
                $apiParams = $this->readJsonFile($this->registryPath('api-params')) ?? [];
                $fields = $this->loadDataFieldsEntry($key) ?? [];
                $this->success([
                    'type' => 'api',
                    'key' => $key,
                    'item' => $endpoint,
                    'api_params' => is_array($apiParams[$key] ?? null) ? $apiParams[$key] : ['params' => [], 'response' => ['type' => 'object', 'fields' => [], 'pagination' => false]],
                    'fields' => $fields,
                ]);
            }
            case 'table': {
                $tableRegistry = $this->readJsonFile($this->registryPath('table-registry')) ?? [];
                $table = is_array($tableRegistry['tables'][$key] ?? null) ? $tableRegistry['tables'][$key] : null;
                if ($table === null) {
                    $this->error('table_not_found', 404);
                }
                $this->success([
                    'type' => 'table',
                    'key' => $key,
                    'item' => $table,
                    'domain' => is_array($tableRegistry['domains'][$table['domain'] ?? ''] ?? null) ? $tableRegistry['domains'][$table['domain']] : null,
                ]);
            }
            case 'schema': {
                $schemaLibrary = $this->readJsonFile($this->registryPath('schema-library')) ?? [];
                $schema = is_array($schemaLibrary['entities'][$key] ?? null) ? $schemaLibrary['entities'][$key] : null;
                if ($schema === null) {
                    $this->error('schema_not_found', 404);
                }
                $this->success([
                    'type' => 'schema',
                    'key' => $key,
                    'item' => $schema,
                ]);
            }
            case 'variable': {
                $variableLibrary = $this->readJsonFile($this->configPath('variable_library.json')) ?? [];
                $category = is_array($variableLibrary['categories'][$key] ?? null) ? $variableLibrary['categories'][$key] : null;
                if ($category === null) {
                    $this->error('variable_category_not_found', 404);
                }
                $this->success([
                    'type' => 'variable',
                    'key' => $key,
                    'item' => $category,
                ]);
            }
            default:
                $this->error('invalid_type', 400, 'Allowed: api, table, schema, variable');
        }
    }

    /**
     * POST admin_metadata_studio_save
     */
    public function saveDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $type = trim((string)($body['type'] ?? ''));
        $key = trim((string)($body['key'] ?? ''));

        switch ($type) {
            case 'api': {
                $item = $body['item'] ?? null;
                $apiParams = $body['api_params'] ?? null;
                $fields = $body['fields'] ?? [];

                if (!is_array($item) || !is_array($apiParams) || !is_array($fields)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = trim((string)($item['action'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_api_key', 400);
                }

                $catalogPath = $this->registryPath('endpoint-catalog');
                $catalog = $this->readJsonFile($catalogPath) ?? [];
                if (!isset($catalog['endpoints']) || !is_array($catalog['endpoints'])) {
                    $catalog['endpoints'] = [];
                }

                $existing = is_array($catalog['endpoints'][$key] ?? null) ? $catalog['endpoints'][$key] : [];
                $merged = array_merge($existing, $item);
                $merged['action'] = $key;
                $merged['field_count'] = count(array_filter($fields, 'is_array'));
                if (!isset($merged['security']) || !is_array($merged['security'])) {
                    $merged['security'] = [
                        'auth_required' => true,
                        'csrf_required' => false,
                        'admin_only' => false,
                        'permission_keys' => [],
                        'dynamic_permission' => true,
                    ];
                }
                if (!isset($merged['request']) || !is_array($merged['request'])) {
                    $merged['request'] = ['query_params' => [], 'body_fields' => [], 'required_body_fields' => []];
                }
                if (!isset($merged['response']) || !is_array($merged['response'])) {
                    $merged['response'] = ['collection_key' => null, 'response_fields' => [], 'paginated' => false];
                }

                $catalog['endpoints'][$key] = $merged;
                $this->touchMeta($catalog, 'endpointCount', count($catalog['endpoints']));
                $this->writeJsonFile($catalogPath, $catalog);

                $apiParamsPath = $this->registryPath('api-params');
                $paramsDoc = $this->readJsonFile($apiParamsPath) ?? [];
                $paramsDoc[$key] = $apiParams;
                $this->touchMeta($paramsDoc);
                $this->writeJsonFile($apiParamsPath, $paramsDoc);

                $this->saveDataFieldsEntry($key, array_values(array_filter($fields, 'is_array')));

                $this->auditLog('admin_metadata_studio_save_api', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success(['saved' => true, 'type' => 'api', 'key' => $key]);
            }
            case 'table': {
                $item = $body['item'] ?? null;
                if (!is_array($item)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = $this->slugifyKey((string)($item['tableKey'] ?? $item['key'] ?? $item['labelEn'] ?? $item['label'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_table_key', 400);
                }

                $domain = $this->slugifyKey((string)($item['domain'] ?? ''));
                if ($domain === '') {
                    $this->error('missing_domain', 400);
                }

                $item['domain'] = $domain;
                $item['columnCount'] = (int)($item['columnCount'] ?? count((array)($item['columns'] ?? [])));

                $tablePath = $this->registryPath('table-registry');
                $tableRegistry = $this->readJsonFile($tablePath) ?? [];
                if (!isset($tableRegistry['tables']) || !is_array($tableRegistry['tables'])) {
                    $tableRegistry['tables'] = [];
                }
                $tableRegistry['tables'][$key] = array_merge(
                    is_array($tableRegistry['tables'][$key] ?? null) ? $tableRegistry['tables'][$key] : [],
                    $item
                );
                $this->syncTableDomainMembership($tableRegistry, $key, $domain);
                $this->touchMeta($tableRegistry, 'tableCount', count($tableRegistry['tables']));
                $tableRegistry['_meta']['domainCount'] = count((array)($tableRegistry['domains'] ?? []));
                $this->writeJsonFile($tablePath, $tableRegistry);

                $this->auditLog('admin_metadata_studio_save_table', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success(['saved' => true, 'type' => 'table', 'key' => $key]);
            }
            case 'schema': {
                $item = $body['item'] ?? null;
                if (!is_array($item)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = $this->slugifyKey((string)($item['key'] ?? $item['label'] ?? $item['description'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_schema_key', 400);
                }

                $schemaPath = $this->registryPath('schema-library');
                $schemaLibrary = $this->readJsonFile($schemaPath) ?? [];
                if (!isset($schemaLibrary['entities']) || !is_array($schemaLibrary['entities'])) {
                    $schemaLibrary['entities'] = [];
                }
                $schemaLibrary['entities'][$key] = array_merge(
                    is_array($schemaLibrary['entities'][$key] ?? null) ? $schemaLibrary['entities'][$key] : [],
                    $item
                );
                $this->touchMeta($schemaLibrary, 'entityGroups', count($schemaLibrary['entities']));
                $this->writeJsonFile($schemaPath, $schemaLibrary);

                $this->auditLog('admin_metadata_studio_save_schema', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success(['saved' => true, 'type' => 'schema', 'key' => $key]);
            }
            case 'variable': {
                $item = $body['item'] ?? null;
                if (!is_array($item)) {
                    $this->error('invalid_payload', 400);
                }

                if ($key === '') {
                    $key = $this->slugifyKey((string)($item['key'] ?? $item['label'] ?? $item['label_vi'] ?? ''));
                }
                if ($key === '') {
                    $this->error('missing_variable_category_key', 400);
                }

                $variablePath = $this->configPath('variable_library.json');
                $variableLibrary = $this->readJsonFile($variablePath) ?? [];
                if (!isset($variableLibrary['categories']) || !is_array($variableLibrary['categories'])) {
                    $variableLibrary['categories'] = [];
                }
                $variableLibrary['categories'][$key] = array_merge(
                    is_array($variableLibrary['categories'][$key] ?? null) ? $variableLibrary['categories'][$key] : [],
                    $item
                );
                $variableLibrary['generated'] = $this->nowIso();
                $this->writeJsonFile($variablePath, $variableLibrary);

                $this->auditLog('admin_metadata_studio_save_variable', ['key' => $key], (string)($user['username'] ?? ''));
                $this->success(['saved' => true, 'type' => 'variable', 'key' => $key]);
            }
            default:
                $this->error('invalid_type', 400, 'Allowed: api, table, schema, variable');
        }
    }
}
