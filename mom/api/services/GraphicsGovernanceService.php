<?php

declare(strict_types=1);

namespace MOM\Api\Services;

class GraphicsGovernanceService
{
    private const VALID_TEMPLATE_STATUSES = ['approved', 'draft', 'deprecated', 'retired'];
    private const VALID_DENSITIES = ['compact', 'default', 'comfortable', 'shopfloor'];
    private const VALID_ZONES = [
        'header',
        'kpi-bar',
        'filter',
        'main',
        'sidebar',
        'footer',
        'tabs',
        'chart-area',
        'notice',
        'summary',
        'primary',
        'form',
        'detail',
        'workflow',
        'actions',
        'timeline',
    ];

    private GraphicsGovernanceRepository $repo;

    public function __construct(string $rootDir, string $dataDir)
    {
        $this->repo = new GraphicsGovernanceRepository($rootDir, $dataDir);
    }

    /**
     * @return array<string, mixed>
     */
    public function getDesignConfig(): array
    {
        $config = $this->repo->readDesignConfig();
        $version = $this->documentVersion($config);
        return [
            'config' => $config,
            'data' => $config,
            'version' => $version,
            'etag' => $this->etag($config),
            'authority' => [
                'source' => 'mom/data/config/design-system-config.json',
                'authorityRole' => 'backend_design_config',
                'localStorageAuthority' => false,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     */
    public function saveDesignConfig(array $config, ?string $expectedVersion, string $username): array
    {
        $current = $this->repo->readDesignConfig();
        $this->requireExpectedVersion($expectedVersion, $current);

        $next = $config;
        $meta = is_array($next['_meta'] ?? null) ? (array)$next['_meta'] : [];
        $meta['version'] = $this->nextVersion((string)($meta['version'] ?? $this->documentVersion($current)));
        $meta['updatedAt'] = gmdate('c');
        $meta['updatedBy'] = $username;
        $meta['authority'] = 'backend_graphics_design_config';
        $meta['authorityRole'] = 'governed_source';
        $meta['localStorageAuthority'] = false;
        $next['_meta'] = $meta;

        $this->repo->writeDesignConfig($next);
        $this->publishRuntimeRegistry();

        return $this->getDesignConfig() + ['saved' => true];
    }

    /**
     * @return array<string, mixed>
     */
    public function getTemplateRegistry(): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $templates = (array)($registry['templates'] ?? []);
        return [
            'registry' => $registry,
            'templateRegistry' => $registry,
            'templates' => array_values($templates),
            'version' => $this->documentVersion($registry),
            'etag' => $this->etag($registry),
            'persistence' => $this->persistenceModel(),
            'componentContractRegistry' => $this->getComponentContractRegistry()['componentContractRegistry'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getTemplate(string $templateId): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $template = $this->resolveTemplate($registry, $templateId);
        if ($template === null) {
            throw new GraphicsGovernanceException(404, 'template_not_found', 'Template not found: ' . $templateId);
        }
        return [
            'template' => $template,
            'version' => $this->documentVersion($registry),
            'etag' => $this->etag($registry),
            'modules' => $this->modulesUsingTemplateRows((string)$template['templateId']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getComponentContractRegistry(): array
    {
        $contracts = $this->repo->listBlockContracts();
        $byType = [];
        foreach ($contracts as $contract) {
            $type = trim((string)($contract['blockType'] ?? ''));
            if ($type !== '') {
                $byType[$type] = $contract;
            }
        }

        return [
            'componentContractRegistry' => [
                '_meta' => [
                    'generatedAt' => gmdate('c'),
                    'authority' => 'mom/design/block-contracts',
                    'authorityRole' => 'component_contract_registry',
                    'componentModel' => 'frontend_block_contracts',
                ],
                'contracts' => array_values($byType),
                'contractsByType' => $byType,
                'count' => count($byType),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $template
     * @return array<string, mixed>
     */
    public function saveDraftTemplate(array $template, ?string $expectedVersion, string $username): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $this->requireExpectedVersion($expectedVersion, $registry);

        $templateId = trim((string)($template['templateId'] ?? ''));
        if ($templateId === '') {
            throw new GraphicsGovernanceException(422, 'template_id_required', 'Template draft requires templateId', [
                ['field' => 'templateId', 'message' => 'templateId is required', 'code' => 'required'],
            ]);
        }

        $draft = $template;
        $draft['status'] = (string)($draft['status'] ?? 'draft');
        if ($draft['status'] === 'approved') {
            $draft['status'] = 'draft';
        }
        $draft['_draft'] = [
            'savedAt' => gmdate('c'),
            'savedBy' => $username,
            'baseRegistryVersion' => $this->documentVersion($registry),
            'baseRegistryEtag' => $this->etag($registry),
            'authority' => 'mom/data/graphics-governance/template-drafts',
        ];

        $validation = $this->validateTemplateDocument($draft, $templateId);
        if (!$validation['valid']) {
            throw new GraphicsGovernanceException(422, 'template_validation_failed', 'Template draft is invalid', (array)$validation['errors']);
        }

        $this->repo->writeTemplateDraft($templateId, $draft);
        return [
            'draft' => $draft,
            'validation' => $validation,
            'version' => $this->documentVersion($registry),
            'etag' => $this->etag($registry),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function cloneTemplate(string $sourceTemplateId, array $input, ?string $expectedVersion, string $username): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $this->requireExpectedVersion($expectedVersion, $registry);

        $source = $this->resolveTemplate($registry, $sourceTemplateId);
        if ($source === null) {
            throw new GraphicsGovernanceException(404, 'template_not_found', 'Template not found: ' . $sourceTemplateId);
        }

        $newTemplateId = trim((string)($input['newTemplateId'] ?? $input['templateId'] ?? ''));
        if ($newTemplateId === '') {
            throw new GraphicsGovernanceException(422, 'new_template_id_required', 'Clone request requires newTemplateId');
        }
        if ($this->resolveTemplate($registry, $newTemplateId) !== null) {
            throw new GraphicsGovernanceException(409, 'template_id_exists', 'Template id already exists: ' . $newTemplateId);
        }

        $draft = $source;
        $draft['templateId'] = $newTemplateId;
        $draft['canonicalId'] = (string)($input['canonicalId'] ?? $newTemplateId);
        $draft['legacyCode'] = (string)($input['legacyCode'] ?? '');
        $draft['aliases'] = array_values(array_unique(array_filter(array_map(
            static fn($value): string => trim((string)$value),
            (array)($input['aliases'] ?? [$newTemplateId])
        ))));
        $draft['status'] = 'draft';
        $draft['version'] = (string)($input['version'] ?? '0.1.0');
        $draft['owner'] = (string)($input['owner'] ?? $source['owner'] ?? 'Frontend Architecture Council');
        $draft['_clonedFrom'] = [
            'templateId' => (string)($source['templateId'] ?? $sourceTemplateId),
            'version' => (string)($source['version'] ?? ''),
            'clonedAt' => gmdate('c'),
            'clonedBy' => $username,
        ];

        $this->repo->writeTemplateDraft($newTemplateId, $draft);
        return [
            'draft' => $draft,
            'validation' => $this->validateTemplateDocument($draft, $newTemplateId),
            'version' => $this->documentVersion($registry),
            'etag' => $this->etag($registry),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function deprecateTemplate(string $templateId, array $input, ?string $expectedVersion, string $username): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $this->requireExpectedVersion($expectedVersion, $registry);

        $index = $this->templateIndex($registry, $templateId);
        if ($index === null) {
            throw new GraphicsGovernanceException(404, 'template_not_found', 'Template not found: ' . $templateId);
        }

        $status = trim((string)($input['status'] ?? 'deprecated'));
        if (!in_array($status, ['deprecated', 'retired'], true)) {
            throw new GraphicsGovernanceException(422, 'invalid_template_status', 'Status must be deprecated or retired');
        }
        $modules = $this->modulesUsingTemplateRows((string)$registry['templates'][$index]['templateId']);
        if ($modules !== [] && trim((string)($input['migrationPlan'] ?? '')) === '') {
            throw new GraphicsGovernanceException(422, 'migration_plan_required', 'Deprecating an adopted template requires a migrationPlan', [
                ['field' => 'migrationPlan', 'message' => 'Required because modules currently use this template', 'code' => 'required'],
            ], ['modules' => $modules]);
        }

        $this->snapshotRegistry('before_deprecate_' . $templateId, $registry, $username);
        $registry['templates'][$index]['status'] = $status;
        $registry['templates'][$index]['deprecation'] = [
            'reason' => (string)($input['reason'] ?? ''),
            'migrationPlan' => (string)($input['migrationPlan'] ?? ''),
            'deadline' => (string)($input['deadline'] ?? ''),
            'updatedAt' => gmdate('c'),
            'updatedBy' => $username,
        ];
        $registry = $this->bumpRegistry($registry, $username);
        $this->repo->writeTemplateRegistry($registry);
        $this->publishRuntimeRegistry();

        return [
            'template' => $registry['templates'][$index],
            'modules' => $modules,
            'version' => $this->documentVersion($registry),
            'etag' => $this->etag($registry),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function validateTemplate(array $input): array
    {
        $templateId = trim((string)($input['templateId'] ?? ''));
        $template = is_array($input['template'] ?? null) ? (array)$input['template'] : null;
        if ($template === null && $templateId !== '') {
            $draft = $this->repo->readTemplateDraft($templateId);
            if ($draft !== null) {
                $template = $draft;
            } else {
                $registry = $this->normalizedTemplateRegistry();
                $template = $this->resolveTemplate($registry, $templateId);
            }
        }
        if ($template === null) {
            throw new GraphicsGovernanceException(404, 'template_not_found', 'Template not found for validation');
        }
        return [
            'validation' => $this->validateTemplateDocument($template, $templateId !== '' ? $templateId : null),
            'template' => $template,
        ];
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function publishTemplate(string $templateId, array $request, ?string $expectedVersion, string $username): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $this->requireExpectedVersion($expectedVersion, $registry);

        $draft = is_array($request['template'] ?? null) ? (array)$request['template'] : $this->repo->readTemplateDraft($templateId);
        if ($draft === null) {
            throw new GraphicsGovernanceException(404, 'template_draft_not_found', 'Template draft not found: ' . $templateId);
        }
        $draft['templateId'] = (string)($draft['templateId'] ?? $templateId);
        $draft['status'] = 'approved';

        $validation = $this->validateTemplateDocument($draft, $templateId);
        if (!$validation['valid']) {
            throw new GraphicsGovernanceException(422, 'template_validation_failed', 'Template cannot be published while validation fails', (array)$validation['errors']);
        }

        $existingIndex = $this->templateIndex($registry, (string)$draft['templateId']);
        if ($existingIndex !== null) {
            $existing = (array)$registry['templates'][$existingIndex];
            if (!$this->isVersionGreater((string)($draft['version'] ?? ''), (string)($existing['version'] ?? ''))) {
                throw new GraphicsGovernanceException(422, 'version_bump_required', 'Published template version must be greater than the current approved version', [
                    ['field' => 'version', 'message' => 'Version must be greater than ' . (string)($existing['version'] ?? ''), 'code' => 'version_bump_required'],
                ]);
            }
        }

        $impact = $this->analyzeTemplateImpact(['templateId' => (string)$draft['templateId']]);
        $this->assertPublishEvidence($request, $impact);

        $this->snapshotRegistry('before_publish_' . (string)$draft['templateId'], $registry, $username);

        $releaseRefs = $this->normalizeReleaseManifestRefs((array)($request['releaseManifestRefs'] ?? $request['releaseEvidence'] ?? []));
        $draft['publishedAt'] = gmdate('c');
        $draft['publishedBy'] = $username;
        $draft['releaseManifestRefs'] = $releaseRefs;
        $draft['waiverIds'] = array_values(array_filter(array_map('strval', (array)($request['waiverIds'] ?? []))));
        $draft['impactAnalysisId'] = (string)($request['impactAnalysisId'] ?? $impact['impactId']);

        if ($existingIndex === null) {
            $registry['templates'][] = $draft;
        } else {
            $registry['templates'][$existingIndex] = $draft;
        }

        $registry = $this->bumpRegistry($registry, $username);
        $this->repo->writeTemplateRegistry($registry);

        $state = $this->repo->readState();
        $state['publishedImpacts'][(string)$draft['impactAnalysisId']] = [
            'publishedAt' => gmdate('c'),
            'publishedBy' => $username,
            'templateId' => (string)$draft['templateId'],
            'version' => (string)$draft['version'],
            'blockersResolved' => true,
        ];
        $this->repo->writeState($state);
        $this->publishRuntimeRegistry();

        return [
            'publishId' => 'gp_' . gmdate('YmdHis') . '_' . substr($this->hash((string)$draft['templateId'] . microtime(true)), 0, 8),
            'template' => $draft,
            'validation' => $validation,
            'impact' => $impact,
            'releaseManifestRefs' => $releaseRefs,
            'registryVersion' => $this->documentVersion($registry),
            'registryEtag' => $this->etag($registry),
            'status' => 'published',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function modulesUsingTemplate(string $templateId): array
    {
        return [
            'templateId' => $templateId,
            'modules' => $this->modulesUsingTemplateRows($templateId),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function complianceMatrix(): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $contracts = $this->blockContractsByType();
        $rows = [];
        foreach ($this->moduleRecords() as $record) {
            $module = $record['module'];
            $packet = $record['packet'];
            $moduleId = (string)($module['moduleId'] ?? $packet['moduleId'] ?? '');
            if ($moduleId === '') {
                continue;
            }
            $templateId = (string)($module['templateId'] ?? $packet['templateId'] ?? '');
            $template = $this->resolveTemplate($registry, $templateId);
            $blockFindings = [];
            $blockFamilies = [];
            foreach ((array)($packet['blocks'] ?? []) as $block) {
                if (!is_array($block)) {
                    continue;
                }
                $zone = (string)($block['zone'] ?? '');
                $type = (string)($block['type'] ?? '');
                if ($type !== '') {
                    $blockFamilies[$type] = true;
                }
                if (!isset($contracts[$type])) {
                    $blockFindings[] = ['blockId' => (string)($block['blockId'] ?? ''), 'code' => 'missing_block_contract', 'type' => $type];
                    continue;
                }
                $allowed = is_array($template)
                    ? (array)($template['allowedBlocksByZone'][$zone] ?? [])
                    : [];
                if ($template !== null && $zone !== '' && $type !== '' && !in_array($type, $allowed, true)) {
                    $blockFindings[] = ['blockId' => (string)($block['blockId'] ?? ''), 'code' => 'block_not_allowed_in_zone', 'type' => $type, 'zone' => $zone];
                }
            }
            $gateState = $this->gateState($packet);
            $regulated = $this->isRegulatedPacket($packet);
            $shopfloor = $this->isShopfloorPacket($packet);
            $findings = [];
            if ($template === null) {
                $findings[] = ['code' => 'template_missing', 'severity' => 'blocker'];
            } elseif ((string)($template['version'] ?? '') !== (string)($module['templateVersion'] ?? $packet['templateVersion'] ?? '')) {
                $findings[] = ['code' => 'template_version_mismatch', 'severity' => 'blocker'];
            }
            foreach ($blockFindings as $finding) {
                $findings[] = $finding + ['severity' => 'blocker'];
            }
            if ($regulated && !$gateState['auditReady']) {
                $findings[] = ['code' => 'regulated_audit_evidence_missing', 'severity' => 'blocker'];
            }
            if ($shopfloor && !$gateState['shopfloorReady']) {
                $findings[] = ['code' => 'shopfloor_accessibility_evidence_missing', 'severity' => 'blocker'];
            }

            $rows[] = [
                'moduleId' => $moduleId,
                'route' => (string)($module['route'] ?? $packet['route'] ?? ''),
                'templateId' => $templateId,
                'templateVersion' => (string)($module['templateVersion'] ?? $packet['templateVersion'] ?? ''),
                'buildPacket' => (string)($module['buildPacket'] ?? $packet['_sourcePath'] ?? ''),
                'regulated' => $regulated,
                'shopfloor' => $shopfloor,
                'screens' => array_values(array_map(static fn($screen): string => (string)($screen['screenId'] ?? ''), (array)($packet['screens'] ?? []))),
                'blockFamilies' => array_keys($blockFamilies),
                'gateState' => $gateState,
                'findings' => $findings,
                'compliant' => $findings === [],
            ];
        }

        return [
            'matrix' => $rows,
            'summary' => [
                'moduleCount' => count($rows),
                'compliantCount' => count(array_filter($rows, static fn(array $row): bool => (bool)$row['compliant'])),
                'nonCompliantCount' => count(array_filter($rows, static fn(array $row): bool => !(bool)$row['compliant'])),
            ],
            'version' => $this->documentVersion($registry),
            'etag' => $this->etag($registry),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function nonCompliantModules(): array
    {
        $matrix = $this->complianceMatrix();
        $rows = array_values(array_filter((array)$matrix['matrix'], static fn(array $row): bool => !(bool)$row['compliant']));
        return [
            'modules' => $rows,
            'count' => count($rows),
            'summary' => $matrix['summary'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function bridgeAliasDebt(): array
    {
        $rows = [];
        foreach ($this->repo->listStyleAndPortalFiles() as $file) {
            $text = $this->repo->readText($file);
            if ($text === '') {
                continue;
            }
            if (!preg_match_all('/--([A-Za-z0-9_-]+)\s*:\s*([^;}{]+)[;}]/', $text, $matches, PREG_SET_ORDER)) {
                continue;
            }
            foreach ($matches as $match) {
                $name = (string)$match[1];
                $value = trim((string)$match[2]);
                if (!$this->isBridgeAliasName($name)) {
                    continue;
                }
                $rows[] = [
                    'file' => $this->repo->relativePath($file),
                    'token' => '--' . $name,
                    'value' => $value,
                    'compliantAlias' => str_contains($value, 'var(--'),
                    'severity' => str_contains($value, 'var(--') ? 'info' : 'debt',
                ];
            }
        }
        return [
            'debt' => array_values(array_filter($rows, static fn(array $row): bool => !(bool)$row['compliantAlias'])),
            'aliases' => $rows,
            'summary' => [
                'aliasCount' => count($rows),
                'debtCount' => count(array_filter($rows, static fn(array $row): bool => !(bool)$row['compliantAlias'])),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function privateCssDebt(): array
    {
        $rows = [];
        foreach ($this->repo->listStyleAndPortalFiles() as $file) {
            $text = $this->repo->readText($file);
            if ($text === '') {
                continue;
            }
            $rawColorCount = preg_match_all('/#[0-9A-Fa-f]{3,8}\b|rgba?\(/', $text);
            $inlineStyleCount = preg_match_all('/style\s*=|\.style\.[A-Za-z-]+\s*=|setAttribute\(\s*[\'"]style[\'"]/', $text);
            $privateVarCount = preg_match_all('/--(?:ec|eqms|ev|cr|module|adm|tpl)-[A-Za-z0-9_-]+\s*:/', $text);
            $score = (int)$rawColorCount + (int)$inlineStyleCount + (int)$privateVarCount;
            if ($score <= 0) {
                continue;
            }
            $rows[] = [
                'file' => $this->repo->relativePath($file),
                'rawColorCount' => (int)$rawColorCount,
                'inlineStyleCount' => (int)$inlineStyleCount,
                'privateVariableCount' => (int)$privateVarCount,
                'debtScore' => $score,
                'severity' => $score >= 25 ? 'high' : ($score >= 8 ? 'medium' : 'low'),
            ];
        }
        usort($rows, static fn(array $a, array $b): int => ((int)$b['debtScore']) <=> ((int)$a['debtScore']));
        return [
            'debt' => $rows,
            'summary' => [
                'fileCount' => count($rows),
                'totalDebtScore' => array_sum(array_map(static fn(array $row): int => (int)$row['debtScore'], $rows)),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function tokenAdoptionCoverage(): array
    {
        $rows = [];
        $tokenRefs = 0;
        $rawRefs = 0;
        foreach ($this->repo->listStyleAndPortalFiles() as $file) {
            $text = $this->repo->readText($file);
            if ($text === '') {
                continue;
            }
            $fileTokenRefs = (int)preg_match_all('/var\(\s*--[A-Za-z0-9_-]+/', $text);
            $fileRawRefs = (int)preg_match_all('/#[0-9A-Fa-f]{3,8}\b|rgba?\(|\b\d+(?:\.\d+)?px\b|\b\d+(?:\.\d+)?rem\b/', $text);
            $tokenRefs += $fileTokenRefs;
            $rawRefs += $fileRawRefs;
            if ($fileTokenRefs + $fileRawRefs > 0) {
                $rows[] = [
                    'file' => $this->repo->relativePath($file),
                    'tokenReferences' => $fileTokenRefs,
                    'rawReferences' => $fileRawRefs,
                    'coveragePercent' => $this->percent($fileTokenRefs, $fileTokenRefs + $fileRawRefs),
                ];
            }
        }
        usort($rows, static fn(array $a, array $b): int => ((int)$a['coveragePercent']) <=> ((int)$b['coveragePercent']));
        return [
            'coverage' => [
                'tokenReferences' => $tokenRefs,
                'rawReferences' => $rawRefs,
                'coveragePercent' => $this->percent($tokenRefs, $tokenRefs + $rawRefs),
            ],
            'files' => $rows,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function driftReport(): array
    {
        $matrix = $this->complianceMatrix();
        $bridge = $this->bridgeAliasDebt();
        $private = $this->privateCssDebt();
        $coverage = $this->tokenAdoptionCoverage();
        $blockers = [];
        foreach ((array)$matrix['matrix'] as $row) {
            if (!(bool)($row['compliant'] ?? false)) {
                $blockers[] = [
                    'scope' => 'module',
                    'id' => (string)($row['moduleId'] ?? ''),
                    'code' => 'module_graphics_non_compliant',
                ];
            }
        }
        if ((int)($bridge['summary']['debtCount'] ?? 0) > 0) {
            $blockers[] = ['scope' => 'tokens', 'id' => 'bridge_alias_debt', 'code' => 'bridge_alias_raw_value_debt'];
        }
        return [
            'drift' => [
                'moduleCompliance' => $matrix['summary'],
                'bridgeAliasDebt' => $bridge['summary'],
                'privateCssDebt' => $private['summary'],
                'tokenAdoptionCoverage' => $coverage['coverage'],
            ],
            'blockers' => $blockers,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function analyzeTokenImpact(array $input): array
    {
        $tokenKeys = array_values(array_filter(array_map('strval', (array)($input['tokenKeys'] ?? $input['tokens'] ?? []))));
        $tokenGroups = array_values(array_filter(array_map('strval', (array)($input['tokenGroups'] ?? []))));
        $affected = [];
        foreach ($this->moduleRecords() as $record) {
            $module = $record['module'];
            $packet = $record['packet'];
            $template = $this->resolveTemplate($this->normalizedTemplateRegistry(), (string)($packet['templateId'] ?? $module['templateId'] ?? ''));
            $requiredGroups = is_array($template) ? (array)($template['themePolicy']['requiredTokenGroups'] ?? []) : [];
            $touches = $tokenGroups === [] || array_intersect($tokenGroups, array_map('strval', $requiredGroups)) !== [];
            if ($tokenKeys !== [] && $this->packetMentionsAny($packet, $tokenKeys)) {
                $touches = true;
            }
            if ($touches) {
                $affected[] = $this->impactModuleRow($module, $packet);
            }
        }
        return $this->impactReport('token', ['tokenKeys' => $tokenKeys, 'tokenGroups' => $tokenGroups], $affected);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function analyzeTemplateImpact(array $input): array
    {
        $templateId = trim((string)($input['templateId'] ?? ''));
        if ($templateId === '') {
            throw new GraphicsGovernanceException(422, 'template_id_required', 'templateId is required for template impact analysis');
        }
        $affected = [];
        foreach ($this->moduleRecords() as $record) {
            $module = $record['module'];
            $packet = $record['packet'];
            if ((string)($module['templateId'] ?? $packet['templateId'] ?? '') === $templateId) {
                $affected[] = $this->impactModuleRow($module, $packet);
            }
        }
        return $this->impactReport('template', ['templateId' => $templateId], $affected);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function analyzeComponentImpact(array $input): array
    {
        $componentId = trim((string)($input['componentId'] ?? $input['blockType'] ?? ''));
        if ($componentId === '') {
            throw new GraphicsGovernanceException(422, 'component_id_required', 'componentId or blockType is required for component impact analysis');
        }
        $affected = [];
        foreach ($this->moduleRecords() as $record) {
            $packet = $record['packet'];
            $uses = false;
            foreach ((array)($packet['blocks'] ?? []) as $block) {
                if (is_array($block) && (string)($block['type'] ?? '') === $componentId) {
                    $uses = true;
                    break;
                }
            }
            if ($uses) {
                $affected[] = $this->impactModuleRow($record['module'], $packet);
            }
        }
        return $this->impactReport('component', ['componentId' => $componentId], $affected);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function stageRollout(array $input, ?string $expectedVersion, string $username): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $this->requireExpectedVersion($expectedVersion, $registry);
        $impact = $this->impactFromRolloutInput($input);
        if ($impact['blockers'] !== []) {
            throw new GraphicsGovernanceException(422, 'rollout_blockers_present', 'Rollout cannot be staged with unresolved blockers', (array)$impact['blockers']);
        }

        $doc = $this->repo->readRolloutsDocument();
        $rolloutId = (string)($input['rolloutId'] ?? ('gr_' . gmdate('YmdHis') . '_' . substr($this->hash(json_encode($input) ?: ''), 0, 8)));
        $rollout = [
            'rolloutId' => $rolloutId,
            'status' => 'staged',
            'scope' => (array)($input['scope'] ?? []),
            'impact' => $impact,
            'releaseManifestRefs' => $this->normalizeReleaseManifestRefs((array)($input['releaseManifestRefs'] ?? [])),
            'stagedAt' => gmdate('c'),
            'stagedBy' => $username,
            'baseRegistryVersion' => $this->documentVersion($registry),
            'baseRegistryEtag' => $this->etag($registry),
        ];
        $doc['rollouts'][$rolloutId] = $rollout;
        $doc['_meta']['version'] = (int)($doc['_meta']['version'] ?? 1) + 1;
        $doc['_meta']['updatedAt'] = gmdate('c');
        $this->repo->writeRolloutsDocument($doc);
        return ['rollout' => $rollout];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function applyRollout(array $input, ?string $expectedVersion, string $username): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $this->requireExpectedVersion($expectedVersion, $registry);
        $rolloutId = trim((string)($input['rolloutId'] ?? ''));
        $doc = $this->repo->readRolloutsDocument();
        $rollout = is_array($doc['rollouts'][$rolloutId] ?? null) ? (array)$doc['rollouts'][$rolloutId] : null;
        if ($rollout === null) {
            throw new GraphicsGovernanceException(404, 'rollout_not_found', 'Rollout not found: ' . $rolloutId);
        }
        if ((string)($rollout['status'] ?? '') !== 'staged') {
            throw new GraphicsGovernanceException(409, 'rollout_not_staged', 'Only staged rollouts can be applied');
        }
        if ($this->normalizeExpected((string)($rollout['baseRegistryEtag'] ?? '')) !== $this->etag($registry)) {
            throw new GraphicsGovernanceException(412, 'registry_changed_since_stage', 'Registry changed after rollout was staged', [], [
                'current_version' => $this->documentVersion($registry),
                'current_etag' => $this->etag($registry),
            ]);
        }

        $snapshotId = $this->snapshotRegistry('before_apply_rollout_' . $rolloutId, $registry, $username);
        $rollout['status'] = 'applied';
        $rollout['appliedAt'] = gmdate('c');
        $rollout['appliedBy'] = $username;
        $rollout['rollbackSnapshotId'] = $snapshotId;
        $doc['rollouts'][$rolloutId] = $rollout;
        $doc['_meta']['version'] = (int)($doc['_meta']['version'] ?? 1) + 1;
        $doc['_meta']['updatedAt'] = gmdate('c');
        $this->repo->writeRolloutsDocument($doc);
        $this->publishRuntimeRegistry();
        return ['rollout' => $rollout, 'registryVersion' => $this->documentVersion($registry), 'registryEtag' => $this->etag($registry)];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function rollbackRollout(array $input, ?string $expectedVersion, string $username): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $this->requireExpectedVersion($expectedVersion, $registry);
        $rolloutId = trim((string)($input['rolloutId'] ?? ''));
        $targetSnapshotId = trim((string)($input['targetSnapshotId'] ?? ''));
        $doc = $this->repo->readRolloutsDocument();
        $rollout = is_array($doc['rollouts'][$rolloutId] ?? null) ? (array)$doc['rollouts'][$rolloutId] : null;
        if ($rollout === null) {
            throw new GraphicsGovernanceException(404, 'rollout_not_found', 'Rollout not found: ' . $rolloutId);
        }
        if ($targetSnapshotId === '') {
            $targetSnapshotId = (string)($rollout['rollbackSnapshotId'] ?? '');
        }
        $snapshot = $targetSnapshotId !== '' ? $this->repo->readSnapshot($targetSnapshotId) : null;
        if ($snapshot === null || !is_array($snapshot['registry'] ?? null)) {
            throw new GraphicsGovernanceException(404, 'rollback_snapshot_not_found', 'Rollback target snapshot not found or invalid');
        }
        $targetRegistry = (array)$snapshot['registry'];
        $validation = $this->validateRegistryDocument($targetRegistry);
        if (!$validation['valid']) {
            throw new GraphicsGovernanceException(422, 'rollback_target_invalid', 'Rollback target registry is invalid', (array)$validation['errors']);
        }

        $this->snapshotRegistry('before_rollback_' . $rolloutId, $registry, $username);
        $targetRegistry = $this->bumpRegistry($targetRegistry, $username);
        $this->repo->writeTemplateRegistry($targetRegistry);
        $this->publishRuntimeRegistry();

        $rollout['status'] = 'rolled_back';
        $rollout['rolledBackAt'] = gmdate('c');
        $rollout['rolledBackBy'] = $username;
        $rollout['rolledBackToSnapshotId'] = $targetSnapshotId;
        $doc['rollouts'][$rolloutId] = $rollout;
        $doc['_meta']['version'] = (int)($doc['_meta']['version'] ?? 1) + 1;
        $doc['_meta']['updatedAt'] = gmdate('c');
        $this->repo->writeRolloutsDocument($doc);

        return [
            'rollout' => $rollout,
            'registryVersion' => $this->documentVersion($targetRegistry),
            'registryEtag' => $this->etag($targetRegistry),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createWaiver(array $input, ?string $expectedVersion, string $username): array
    {
        $doc = $this->repo->readWaiversDocument();
        $this->requireExpectedVersion($expectedVersion, $doc);
        foreach (['scope', 'targetId', 'reason', 'expiresAt'] as $field) {
            if (trim((string)($input[$field] ?? '')) === '') {
                throw new GraphicsGovernanceException(422, 'waiver_field_required', 'Waiver requires ' . $field, [
                    ['field' => $field, 'message' => $field . ' is required', 'code' => 'required'],
                ]);
            }
        }
        $waiverId = (string)($input['waiverId'] ?? ('gwv_' . gmdate('YmdHis') . '_' . substr($this->hash(json_encode($input) ?: ''), 0, 8)));
        $waiver = [
            'waiverId' => $waiverId,
            'scope' => (string)$input['scope'],
            'targetId' => (string)$input['targetId'],
            'reason' => (string)$input['reason'],
            'riskClass' => (string)($input['riskClass'] ?? 'medium'),
            'status' => 'draft',
            'documentControlRefs' => array_values(array_map('strval', (array)($input['documentControlRefs'] ?? []))),
            'releaseManifestRefs' => $this->normalizeReleaseManifestRefs((array)($input['releaseManifestRefs'] ?? [])),
            'createdAt' => gmdate('c'),
            'createdBy' => $username,
            'expiresAt' => (string)$input['expiresAt'],
        ];
        $doc['waivers'][$waiverId] = $waiver;
        $doc = $this->bumpLooseDocument($doc, $username);
        $this->repo->writeWaiversDocument($doc);
        return ['waiver' => $waiver, 'version' => $this->documentVersion($doc), 'etag' => $this->etag($doc)];
    }

    /**
     * @return array<string, mixed>
     */
    public function approveWaiver(string $waiverId, ?string $expectedVersion, string $username): array
    {
        return $this->transitionWaiver($waiverId, 'approved', $expectedVersion, $username);
    }

    /**
     * @return array<string, mixed>
     */
    public function expireWaiver(string $waiverId, ?string $expectedVersion, string $username): array
    {
        return $this->transitionWaiver($waiverId, 'expired', $expectedVersion, $username);
    }

    /**
     * @return array<string, mixed>
     */
    public function activeWaivers(): array
    {
        $doc = $this->repo->readWaiversDocument();
        $now = gmdate('c');
        $rows = [];
        foreach ((array)($doc['waivers'] ?? []) as $waiver) {
            if (!is_array($waiver)) {
                continue;
            }
            if ((string)($waiver['status'] ?? '') === 'approved' && (string)($waiver['expiresAt'] ?? '') > $now) {
                $rows[] = $waiver;
            }
        }
        return ['waivers' => array_values($rows), 'version' => $this->documentVersion($doc), 'etag' => $this->etag($doc)];
    }

    /**
     * @return array<string, mixed>
     */
    public function publishRuntimeRegistry(): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $designConfig = $this->repo->readDesignConfig();
        $componentRegistry = $this->getComponentContractRegistry()['componentContractRegistry'];
        $matrix = $this->complianceMatrix();
        $payload = [
            '_meta' => [
                'generatedAt' => gmdate('c'),
                'source' => 'graphics_governance_backend',
                'authorityLayer' => 'system_contract_registry',
                'authority' => 'mom/design/template-registry.json',
                'workspaceDraftUsed' => false,
                'schemaAuthorityModel' => 'mom/docs/schema-authority-model.md',
            ],
            'templateRegistry' => [
                'version' => $this->documentVersion($registry),
                'etag' => $this->etag($registry),
                'sourcePath' => 'mom/design/template-registry.json',
                'templates' => (array)($registry['templates'] ?? []),
            ],
            'designConfig' => [
                'version' => $this->documentVersion($designConfig),
                'etag' => $this->etag($designConfig),
                'sourcePath' => 'mom/data/config/design-system-config.json',
                'config' => $designConfig,
            ],
            'componentContractRegistry' => $componentRegistry,
            'moduleGraphicsCompliance' => $matrix,
            'persistence' => $this->persistenceModel(),
        ];
        $this->repo->writeRuntimeGraphicsRegistry($payload);
        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizedTemplateRegistry(): array
    {
        $registry = $this->repo->readTemplateRegistry();
        if (!isset($registry['_meta']) || !is_array($registry['_meta'])) {
            $registry['_meta'] = [];
        }
        if (!isset($registry['templates']) || !is_array($registry['templates'])) {
            $registry['templates'] = [];
        }
        return $registry;
    }

    /**
     * @return array<string, mixed>
     */
    private function persistenceModel(): array
    {
        return [
            'canonicalTemplateRegistry' => 'mom/design/template-registry.json',
            'canonicalBlockContracts' => 'mom/design/block-contracts/*.json',
            'moduleBuildPackets' => 'mom/design/build-packets/*.json',
            'runtimeRegistryMirror' => 'mom/data/registry/graphics-governance-registry.json',
            'draftStore' => 'mom/data/graphics-governance/template-drafts/*.json',
            'waiverRegister' => 'mom/data/graphics-governance/waivers.json',
            'rolloutRegister' => 'mom/data/graphics-governance/rollouts.json',
            'authorityPolicy' => 'Registry/design artifacts are backend authority; browser localStorage is cache only.',
            'workspaceDraftAuthority' => false,
        ];
    }

    /**
     * @param array<string, mixed> $registry
     * @return array<string, mixed>|null
     */
    private function resolveTemplate(array $registry, string $templateId): ?array
    {
        $needle = trim($templateId);
        if ($needle === '') {
            return null;
        }
        foreach ((array)($registry['templates'] ?? []) as $template) {
            if (!is_array($template)) {
                continue;
            }
            $keys = [
                (string)($template['templateId'] ?? ''),
                (string)($template['canonicalId'] ?? ''),
                (string)($template['legacyCode'] ?? ''),
            ];
            foreach ((array)($template['aliases'] ?? []) as $alias) {
                $keys[] = (string)$alias;
            }
            if (in_array($needle, $keys, true)) {
                return $template;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $registry
     */
    private function templateIndex(array $registry, string $templateId): ?int
    {
        $needle = trim($templateId);
        foreach ((array)($registry['templates'] ?? []) as $index => $template) {
            if (!is_array($template)) {
                continue;
            }
            if ((string)($template['templateId'] ?? '') === $needle) {
                return (int)$index;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $template
     * @return array<string, mixed>
     */
    private function validateTemplateDocument(array $template, ?string $templateIdContext = null): array
    {
        $errors = [];
        $warnings = [];
        $required = [
            'templateId',
            'canonicalId',
            'version',
            'status',
            'owner',
            'moduleArchetype',
            'zones',
            'allowedBlocksByZone',
            'defaultDensity',
            'supportedDensities',
            'themePolicy',
            'responsivePolicy',
            'qaEvidence',
        ];
        foreach ($required as $field) {
            if (!array_key_exists($field, $template) || $template[$field] === '' || $template[$field] === null) {
                $errors[] = ['field' => $field, 'message' => 'Missing required template field', 'code' => 'required'];
            }
        }

        $templateId = trim((string)($template['templateId'] ?? $templateIdContext ?? ''));
        if ($templateId === '') {
            $errors[] = ['field' => 'templateId', 'message' => 'templateId is required', 'code' => 'required'];
        }
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9_.:-]{1,120}$/', $templateId)) {
            $errors[] = ['field' => 'templateId', 'message' => 'templateId contains invalid characters', 'code' => 'invalid_format'];
        }
        if (!$this->validSemver((string)($template['version'] ?? ''))) {
            $errors[] = ['field' => 'version', 'message' => 'version must be semantic version MAJOR.MINOR.PATCH', 'code' => 'invalid_semver'];
        }
        if (!in_array((string)($template['status'] ?? ''), self::VALID_TEMPLATE_STATUSES, true)) {
            $errors[] = ['field' => 'status', 'message' => 'Invalid template status', 'code' => 'invalid_status'];
        }
        if (!in_array((string)($template['defaultDensity'] ?? ''), self::VALID_DENSITIES, true)) {
            $errors[] = ['field' => 'defaultDensity', 'message' => 'Invalid default density', 'code' => 'invalid_density'];
        }

        $zoneIds = [];
        foreach ((array)($template['zones'] ?? []) as $idx => $zone) {
            if (!is_array($zone)) {
                $errors[] = ['field' => 'zones/' . $idx, 'message' => 'Zone must be an object', 'code' => 'invalid_zone'];
                continue;
            }
            $zoneId = trim((string)($zone['zoneId'] ?? ''));
            if ($zoneId === '') {
                $errors[] = ['field' => 'zones/' . $idx . '/zoneId', 'message' => 'zoneId is required', 'code' => 'required'];
                continue;
            }
            if (isset($zoneIds[$zoneId])) {
                $errors[] = ['field' => 'zones/' . $idx . '/zoneId', 'message' => 'Duplicate zoneId', 'code' => 'duplicate_zone'];
            }
            $zoneIds[$zoneId] = true;
            if (!in_array($zoneId, self::VALID_ZONES, true)) {
                $errors[] = ['field' => 'zones/' . $idx . '/zoneId', 'message' => 'Zone is not in the approved backend zone vocabulary', 'code' => 'invalid_zone'];
            }
        }

        $contracts = $this->blockContractsByType();
        foreach ((array)($template['allowedBlocksByZone'] ?? []) as $zoneId => $blockTypes) {
            $zoneId = (string)$zoneId;
            if (!isset($zoneIds[$zoneId])) {
                $errors[] = ['field' => 'allowedBlocksByZone/' . $zoneId, 'message' => 'Allowed block zone is not declared in zones', 'code' => 'unknown_zone'];
            }
            if (!is_array($blockTypes) || $blockTypes === []) {
                $errors[] = ['field' => 'allowedBlocksByZone/' . $zoneId, 'message' => 'Allowed blocks must be a non-empty array', 'code' => 'invalid_allowed_blocks'];
                continue;
            }
            foreach ($blockTypes as $blockType) {
                $blockType = (string)$blockType;
                if (!isset($contracts[$blockType])) {
                    $errors[] = ['field' => 'allowedBlocksByZone/' . $zoneId, 'message' => 'Missing component/block contract: ' . $blockType, 'code' => 'missing_block_contract'];
                } elseif (!in_array($zoneId, array_map('strval', (array)($contracts[$blockType]['allowedZones'] ?? [])), true)) {
                    $errors[] = ['field' => 'allowedBlocksByZone/' . $zoneId, 'message' => 'Block contract does not allow this zone: ' . $blockType, 'code' => 'block_zone_mismatch'];
                }
            }
        }

        $supportedDensities = array_map('strval', (array)($template['supportedDensities'] ?? []));
        foreach ($supportedDensities as $density) {
            if (!in_array($density, self::VALID_DENSITIES, true)) {
                $errors[] = ['field' => 'supportedDensities', 'message' => 'Invalid density: ' . $density, 'code' => 'invalid_density'];
            }
        }
        if (!in_array((string)($template['defaultDensity'] ?? ''), $supportedDensities, true)) {
            $errors[] = ['field' => 'defaultDensity', 'message' => 'defaultDensity must be listed in supportedDensities', 'code' => 'density_not_supported'];
        }

        $themeModes = array_map('strval', (array)($template['themePolicy']['modes'] ?? []));
        if (!in_array('light', $themeModes, true) || !in_array('dark', $themeModes, true)) {
            $errors[] = ['field' => 'themePolicy/modes', 'message' => 'Template must support light and dark mode', 'code' => 'theme_mode_missing'];
        }
        if (!in_array('high-contrast', $themeModes, true)) {
            $warnings[] = ['field' => 'themePolicy/modes', 'message' => 'High contrast mode is required for regulated/shopfloor templates', 'code' => 'high_contrast_missing'];
        }

        $adoptionModules = [];
        if (is_array($template['adoption'] ?? null)) {
            $adoptionModules = (array)($template['adoption']['modules'] ?? $template['adoption']);
        }
        $moduleIds = array_map(static fn(array $row): string => (string)($row['moduleId'] ?? ''), $this->repo->listRuntimeModules());
        foreach ($adoptionModules as $moduleId) {
            $moduleId = (string)$moduleId;
            if ($moduleId !== '' && !in_array($moduleId, $moduleIds, true)) {
                $errors[] = ['field' => 'adoption/modules', 'message' => 'Referenced module does not exist: ' . $moduleId, 'code' => 'module_not_found'];
            }
        }

        return [
            'valid' => $errors === [],
            'errors' => $errors,
            'warnings' => $warnings,
            'checkedAt' => gmdate('c'),
            'templateId' => $templateId,
        ];
    }

    /**
     * @param array<string, mixed> $registry
     * @return array<string, mixed>
     */
    private function validateRegistryDocument(array $registry): array
    {
        $errors = [];
        $seen = [];
        foreach ((array)($registry['templates'] ?? []) as $template) {
            if (!is_array($template)) {
                $errors[] = ['field' => 'templates', 'message' => 'Template entry must be an object', 'code' => 'invalid_template'];
                continue;
            }
            $templateId = (string)($template['templateId'] ?? '');
            if ($templateId !== '') {
                if (isset($seen[$templateId])) {
                    $errors[] = ['field' => 'templates/templateId', 'message' => 'Duplicate templateId: ' . $templateId, 'code' => 'duplicate_template_id'];
                }
                $seen[$templateId] = true;
            }
            $result = $this->validateTemplateDocument($template, $templateId);
            foreach ((array)$result['errors'] as $error) {
                $errors[] = $error;
            }
        }
        return ['valid' => $errors === [], 'errors' => $errors];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function blockContractsByType(): array
    {
        $out = [];
        foreach ($this->repo->listBlockContracts() as $contract) {
            $type = trim((string)($contract['blockType'] ?? ''));
            if ($type !== '') {
                $out[$type] = $contract;
            }
        }
        return $out;
    }

    /**
     * @return array<int, array{module: array<string, mixed>, packet: array<string, mixed>}>
     */
    private function moduleRecords(): array
    {
        $packets = [];
        foreach ($this->repo->listBuildPackets() as $packet) {
            $moduleId = (string)($packet['moduleId'] ?? '');
            if ($moduleId !== '') {
                $packets[$moduleId] = $packet;
            }
        }
        $rows = [];
        foreach ($this->repo->listRuntimeModules() as $module) {
            $moduleId = (string)($module['moduleId'] ?? '');
            $packet = $moduleId !== '' && isset($packets[$moduleId]) ? $packets[$moduleId] : [];
            $rows[] = ['module' => $module, 'packet' => $packet];
        }
        foreach ($packets as $moduleId => $packet) {
            $exists = false;
            foreach ($rows as $row) {
                if ((string)($row['module']['moduleId'] ?? '') === $moduleId) {
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                $rows[] = ['module' => ['moduleId' => $moduleId], 'packet' => $packet];
            }
        }
        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function modulesUsingTemplateRows(string $templateId): array
    {
        $rows = [];
        foreach ($this->moduleRecords() as $record) {
            $module = $record['module'];
            $packet = $record['packet'];
            if ((string)($module['templateId'] ?? $packet['templateId'] ?? '') !== $templateId) {
                continue;
            }
            $rows[] = [
                'moduleId' => (string)($module['moduleId'] ?? $packet['moduleId'] ?? ''),
                'route' => (string)($module['route'] ?? $packet['route'] ?? ''),
                'templateVersion' => (string)($module['templateVersion'] ?? $packet['templateVersion'] ?? ''),
                'criticality' => (string)($packet['criticality'] ?? ''),
                'regulated' => $this->isRegulatedPacket($packet),
                'shopfloor' => $this->isShopfloorPacket($packet),
                'screens' => array_values(array_map(static fn($screen): string => (string)($screen['screenId'] ?? ''), (array)($packet['screens'] ?? []))),
                'buildPacket' => (string)($module['buildPacket'] ?? $packet['_sourcePath'] ?? ''),
            ];
        }
        return $rows;
    }

    /**
     * @param array<string, mixed> $packet
     * @return array<string, mixed>
     */
    private function gateState(array $packet): array
    {
        $requiredNow = array_values(array_map('strval', (array)($packet['qa']['requiredNow'] ?? [])));
        return [
            'requiredNow' => $requiredNow,
            'knownOpen' => array_values(array_map('strval', (array)($packet['qa']['knownOpen'] ?? []))),
            'auditReady' => in_array('G14', $requiredNow, true) || $this->isRegulatedPacket($packet) === false,
            'shopfloorReady' => in_array('G07', $requiredNow, true) || in_array('G08', $requiredNow, true) || $this->isShopfloorPacket($packet) === false,
            'releaseManifestRequired' => true,
        ];
    }

    /**
     * @param array<string, mixed> $packet
     */
    private function isRegulatedPacket(array $packet): bool
    {
        $haystack = strtolower(json_encode([
            $packet['criticality'] ?? '',
            $packet['regulatoryScope'] ?? [],
            $packet['domain'] ?? '',
        ]) ?: '');
        return str_contains($haystack, 'regulated')
            || str_contains($haystack, 'as9100')
            || str_contains($haystack, 'iso-9001')
            || str_contains($haystack, 'eqms')
            || str_contains($haystack, 'quality');
    }

    /**
     * @param array<string, mixed> $packet
     */
    private function isShopfloorPacket(array $packet): bool
    {
        $haystack = strtolower(json_encode([
            $packet['criticality'] ?? '',
            $packet['moduleArchetype'] ?? '',
            $packet['densityModes'] ?? [],
            $packet['domain'] ?? '',
        ]) ?: '');
        return str_contains($haystack, 'shopfloor')
            || str_contains($haystack, 'operator')
            || str_contains($haystack, 'mes_execution')
            || str_contains($haystack, 'production');
    }

    /**
     * @param array<string, mixed> $module
     * @param array<string, mixed> $packet
     * @return array<string, mixed>
     */
    private function impactModuleRow(array $module, array $packet): array
    {
        $blocks = [];
        $blockFamilies = [];
        foreach ((array)($packet['blocks'] ?? []) as $block) {
            if (!is_array($block)) {
                continue;
            }
            $blocks[] = [
                'blockId' => (string)($block['blockId'] ?? ''),
                'type' => (string)($block['type'] ?? ''),
                'zone' => (string)($block['zone'] ?? ''),
                'screenId' => (string)($block['screenId'] ?? ''),
            ];
            if ((string)($block['type'] ?? '') !== '') {
                $blockFamilies[(string)$block['type']] = true;
            }
        }
        return [
            'moduleId' => (string)($module['moduleId'] ?? $packet['moduleId'] ?? ''),
            'route' => (string)($module['route'] ?? $packet['route'] ?? ''),
            'screens' => array_values(array_map(static fn($screen): string => (string)($screen['screenId'] ?? ''), (array)($packet['screens'] ?? []))),
            'blockFamilies' => array_keys($blockFamilies),
            'blocks' => $blocks,
            'regulated' => $this->isRegulatedPacket($packet),
            'shopfloor' => $this->isShopfloorPacket($packet),
            'requiredGates' => array_values(array_map('strval', (array)($packet['qa']['requiredNow'] ?? []))),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $affected
     * @param array<string, mixed> $subject
     * @return array<string, mixed>
     */
    private function impactReport(string $type, array $subject, array $affected): array
    {
        $affectedRoutes = array_values(array_unique(array_filter(array_map(static fn(array $row): string => (string)($row['route'] ?? ''), $affected))));
        $affectedScreens = [];
        $blockFamilies = [];
        $gates = [];
        $regulated = [];
        $shopfloor = [];
        foreach ($affected as $row) {
            foreach ((array)($row['screens'] ?? []) as $screen) {
                $affectedScreens[] = (string)$screen;
            }
            foreach ((array)($row['blockFamilies'] ?? []) as $family) {
                $blockFamilies[] = (string)$family;
            }
            foreach ((array)($row['requiredGates'] ?? []) as $gate) {
                $gates[] = (string)$gate;
            }
            if ((bool)($row['regulated'] ?? false)) {
                $regulated[] = (string)($row['moduleId'] ?? '');
            }
            if ((bool)($row['shopfloor'] ?? false)) {
                $shopfloor[] = (string)($row['moduleId'] ?? '');
            }
        }
        $blockers = [];
        foreach ($affected as $row) {
            if ((bool)($row['regulated'] ?? false) && !in_array('G14', (array)($row['requiredGates'] ?? []), true)) {
                $blockers[] = [
                    'code' => 'regulated_audit_gate_missing',
                    'moduleId' => (string)($row['moduleId'] ?? ''),
                    'severity' => 'blocker',
                ];
            }
        }
        return [
            'impactId' => 'gia_' . gmdate('YmdHis') . '_' . substr($this->hash($type . json_encode($subject) . json_encode($affected)), 0, 8),
            'analysisType' => $type,
            'subject' => $subject,
            'affectedModules' => $affected,
            'affectedRoutes' => $affectedRoutes,
            'affectedScreens' => array_values(array_unique(array_filter($affectedScreens))),
            'affectedBlockFamilies' => array_values(array_unique(array_filter($blockFamilies))),
            'regulatedModulesTouched' => array_values(array_unique(array_filter($regulated))),
            'shopfloorModulesTouched' => array_values(array_unique(array_filter($shopfloor))),
            'gatesToRerun' => array_values(array_unique(array_filter($gates))),
            'blockers' => $blockers,
            'machineReadable' => true,
            'generatedAt' => gmdate('c'),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function impactFromRolloutInput(array $input): array
    {
        $kind = (string)($input['impactType'] ?? '');
        if ($kind === 'token') {
            return $this->analyzeTokenImpact($input);
        }
        if ($kind === 'component') {
            return $this->analyzeComponentImpact($input);
        }
        if ($kind === 'template' || isset($input['templateId'])) {
            return $this->analyzeTemplateImpact($input);
        }
        return $this->impactReport('rollout', ['scope' => (array)($input['scope'] ?? [])], []);
    }

    /**
     * @param array<string, mixed> $request
     * @param array<string, mixed> $impact
     */
    private function assertPublishEvidence(array $request, array $impact): void
    {
        if (($impact['blockers'] ?? []) !== [] && empty($request['blockersResolved'])) {
            throw new GraphicsGovernanceException(422, 'impact_blockers_unresolved', 'Publish is blocked by unresolved impact analysis blockers', (array)$impact['blockers']);
        }
        if (trim((string)($request['impactAnalysisId'] ?? '')) === '') {
            throw new GraphicsGovernanceException(422, 'impact_analysis_required', 'Publish requires impactAnalysisId');
        }
        $evidence = (array)($request['gateEvidence'] ?? []);
        $requiredGates = array_values(array_unique(array_filter(array_map('strval', (array)($impact['gatesToRerun'] ?? [])))));
        if ($requiredGates === []) {
            $requiredGates = ['G01', 'G02', 'G03', 'G18', 'G19'];
        }
        $provided = [];
        foreach ($evidence as $key => $value) {
            if (is_string($key)) {
                $provided[] = $key;
            } elseif (is_array($value)) {
                $provided[] = (string)($value['gateId'] ?? '');
            } else {
                $provided[] = (string)$value;
            }
        }
        $missing = array_values(array_diff($requiredGates, array_filter($provided)));
        if ($missing !== []) {
            throw new GraphicsGovernanceException(422, 'gate_evidence_missing', 'Publish requires gate evidence for all impacted gates', array_map(
                static fn(string $gate): array => ['field' => 'gateEvidence', 'message' => 'Missing evidence for ' . $gate, 'code' => 'gate_evidence_missing'],
                $missing
            ));
        }
        if ($this->normalizeReleaseManifestRefs((array)($request['releaseManifestRefs'] ?? $request['releaseEvidence'] ?? [])) === []) {
            throw new GraphicsGovernanceException(422, 'release_manifest_required', 'Publish requires releaseManifestRefs');
        }
    }

    /**
     * @param array<int|string, mixed> $refs
     * @return array<int, array<string, string>>
     */
    private function normalizeReleaseManifestRefs(array $refs): array
    {
        $out = [];
        foreach ($refs as $ref) {
            if (is_string($ref) && trim($ref) !== '') {
                $out[] = ['refType' => 'document', 'refId' => trim($ref), 'uri' => ''];
            } elseif (is_array($ref)) {
                $refId = trim((string)($ref['refId'] ?? $ref['id'] ?? $ref['uri'] ?? ''));
                if ($refId !== '') {
                    $out[] = [
                        'refType' => (string)($ref['refType'] ?? $ref['type'] ?? 'document'),
                        'refId' => $refId,
                        'uri' => (string)($ref['uri'] ?? ''),
                    ];
                }
            }
        }
        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function transitionWaiver(string $waiverId, string $status, ?string $expectedVersion, string $username): array
    {
        $doc = $this->repo->readWaiversDocument();
        $this->requireExpectedVersion($expectedVersion, $doc);
        if (!is_array($doc['waivers'][$waiverId] ?? null)) {
            throw new GraphicsGovernanceException(404, 'waiver_not_found', 'Waiver not found: ' . $waiverId);
        }
        $waiver = (array)$doc['waivers'][$waiverId];
        $waiver['status'] = $status;
        $waiver[$status === 'approved' ? 'approvedAt' : 'expiredAt'] = gmdate('c');
        $waiver[$status === 'approved' ? 'approvedBy' : 'expiredBy'] = $username;
        $doc['waivers'][$waiverId] = $waiver;
        $doc = $this->bumpLooseDocument($doc, $username);
        $this->repo->writeWaiversDocument($doc);
        return ['waiver' => $waiver, 'version' => $this->documentVersion($doc), 'etag' => $this->etag($doc)];
    }

    /**
     * @param array<string, mixed> $registry
     * @return array<string, mixed>
     */
    private function bumpRegistry(array $registry, string $username): array
    {
        $meta = is_array($registry['_meta'] ?? null) ? (array)$registry['_meta'] : [];
        $meta['governanceRevision'] = (int)($meta['governanceRevision'] ?? 0) + 1;
        $meta['updatedAt'] = gmdate('c');
        $meta['updatedBy'] = $username;
        $meta['authorityRole'] = 'generated_truth';
        $meta['registryAuthority'] = 'backend_graphics_governance';
        $registry['_meta'] = $meta;
        return $registry;
    }

    /**
     * @param array<string, mixed> $doc
     * @return array<string, mixed>
     */
    private function bumpLooseDocument(array $doc, string $username): array
    {
        $meta = is_array($doc['_meta'] ?? null) ? (array)$doc['_meta'] : [];
        $meta['version'] = (int)($meta['version'] ?? 1) + 1;
        $meta['updatedAt'] = gmdate('c');
        $meta['updatedBy'] = $username;
        $doc['_meta'] = $meta;
        return $doc;
    }

    /**
     * @param array<string, mixed> $registry
     */
    private function snapshotRegistry(string $reason, array $registry, string $username): string
    {
        $snapshotId = 'gs_' . gmdate('YmdHis') . '_' . substr($this->hash($reason . $this->etag($registry)), 0, 8);
        $this->repo->writeSnapshot($snapshotId, [
            '_meta' => [
                'snapshotId' => $snapshotId,
                'reason' => $reason,
                'createdAt' => gmdate('c'),
                'createdBy' => $username,
                'registryVersion' => $this->documentVersion($registry),
                'registryEtag' => $this->etag($registry),
            ],
            'registry' => $registry,
        ]);
        return $snapshotId;
    }

    /**
     * @param array<string, mixed> $document
     */
    private function requireExpectedVersion(?string $expectedVersion, array $document): void
    {
        $expected = $this->normalizeExpected((string)($expectedVersion ?? ''));
        if ($expected === '') {
            throw new GraphicsGovernanceException(428, 'precondition_required', 'expectedVersion or If-Match is required', [], [
                'current_version' => $this->documentVersion($document),
                'current_etag' => $this->etag($document),
            ]);
        }
        $accepted = [
            $this->normalizeExpected($this->documentVersion($document)),
            $this->normalizeExpected($this->etag($document)),
            $this->normalizeExpected('"' . $this->etag($document) . '"'),
        ];
        if (!in_array($expected, $accepted, true)) {
            throw new GraphicsGovernanceException(412, 'precondition_failed', 'Resource version does not match current authority version', [], [
                'current_version' => $this->documentVersion($document),
                'current_etag' => $this->etag($document),
            ]);
        }
    }

    private function normalizeExpected(string $value): string
    {
        $value = trim($value);
        if (str_starts_with($value, 'W/')) {
            $value = substr($value, 2);
        }
        return trim($value, "\"' \t\n\r\0\x0B");
    }

    /**
     * @param array<string, mixed> $document
     */
    private function documentVersion(array $document): string
    {
        $meta = is_array($document['_meta'] ?? null) ? (array)$document['_meta'] : [];
        if (isset($meta['governanceRevision'])) {
            return 'rev-' . (string)$meta['governanceRevision'];
        }
        if (isset($meta['version'])) {
            return (string)$meta['version'];
        }
        if (isset($document['version'])) {
            return (string)$document['version'];
        }
        return $this->etag($document);
    }

    /**
     * @param array<string, mixed> $document
     */
    private function etag(array $document): string
    {
        return 'sha256:' . substr($this->hash(json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''), 0, 32);
    }

    private function hash(string $value): string
    {
        return hash('sha256', $value);
    }

    private function nextVersion(string $current): string
    {
        if (preg_match('/^(\d+)\.(\d+)\.(\d+)$/', $current, $m)) {
            return $m[1] . '.' . $m[2] . '.' . ((int)$m[3] + 1);
        }
        if (preg_match('/^(\d+)\.(\d+)$/', $current, $m)) {
            return $m[1] . '.' . ((int)$m[2] + 1);
        }
        return gmdate('YmdHis');
    }

    private function validSemver(string $version): bool
    {
        return (bool)preg_match('/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9_.-]+)?$/', $version);
    }

    private function isVersionGreater(string $next, string $current): bool
    {
        if (!$this->validSemver($next) || !$this->validSemver($current)) {
            return $next !== '' && $next !== $current;
        }
        return version_compare($next, $current, '>');
    }

    private function isBridgeAliasName(string $name): bool
    {
        return (bool)preg_match('/^(ec|eqms|ev|cr|module|adm|tpl)-/', $name);
    }

    private function percent(int $part, int $total): int
    {
        return $total > 0 ? (int)round(($part / $total) * 100) : 100;
    }

    /**
     * @param array<string, mixed> $packet
     * @param array<int, string> $needles
     */
    private function packetMentionsAny(array $packet, array $needles): bool
    {
        $haystack = json_encode($packet, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }
        return false;
    }
}
