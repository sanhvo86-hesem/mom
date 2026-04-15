<?php

declare(strict_types=1);

namespace MOM\Api\Services;

class GraphicsGovernanceService
{
    private const VALID_TEMPLATE_STATUSES = [
        'draft-only',
        'controlled-draft',
        'validated',
        'publish-blocked',
        'published',
        'deprecated',
        'legacy-bridged',
        // Backward-compatible registry imports are normalized before API output.
        'approved',
        'draft',
        'retired',
    ];
    private const VALID_DENSITIES = ['compact', 'default', 'comfortable', 'shopfloor'];
    private const IMPACT_TTL_SECONDS = 86400;
    private const VALID_ROLLOUT_SCOPE_MODES = [
        'preview-only',
        'canary-module-group',
        'canary-domain',
        'environment-stage',
        'global-apply',
    ];
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
        $meta['version'] = $this->nextVersion($this->documentVersion($current));
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
        $draft['status'] = $this->canonicalTemplateGovernanceStatus((string)($draft['status'] ?? 'controlled-draft'));
        if ($draft['status'] === 'published') {
            $draft['status'] = 'controlled-draft';
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
        $this->assertTemplateIdentityAvailable($registry, $draft, true);
        $this->assertTemplateVersionBump($registry, $draft);

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
        $draft = $source;
        $draft['templateId'] = $newTemplateId;
        $draft['canonicalId'] = (string)($input['canonicalId'] ?? $newTemplateId);
        $draft['legacyCode'] = (string)($input['legacyCode'] ?? '');
        $draft['aliases'] = array_values(array_unique(array_filter(array_map(
            static fn($value): string => trim((string)$value),
            (array)($input['aliases'] ?? [$newTemplateId])
        ))));
        $draft['status'] = 'controlled-draft';
        $draft['version'] = (string)($input['version'] ?? '0.1.0');
        $draft['owner'] = (string)($input['owner'] ?? $source['owner'] ?? 'Frontend Architecture Council');
        $draft['_clonedFrom'] = [
            'templateId' => (string)($source['templateId'] ?? $sourceTemplateId),
            'version' => (string)($source['version'] ?? ''),
            'clonedAt' => gmdate('c'),
            'clonedBy' => $username,
        ];

        $validation = $this->validateTemplateDocument($draft, $newTemplateId);
        if (!$validation['valid']) {
            throw new GraphicsGovernanceException(422, 'template_validation_failed', 'Cloned template draft is invalid', (array)$validation['errors']);
        }
        $this->assertTemplateIdentityAvailable($registry, $draft, false);

        $this->repo->writeTemplateDraft($newTemplateId, $draft);
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
        if ($status === 'retired' && $modules !== []) {
            throw new GraphicsGovernanceException(422, 'template_in_use', 'Template cannot be retired while modules still use it', [
                ['field' => 'status', 'message' => 'Retire requires zero active module bindings', 'code' => 'template_in_use'],
            ], ['modules' => $modules]);
        }
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
        $registry = $this->normalizedTemplateRegistry();
        if ($template === null && $templateId !== '') {
            $draft = $this->repo->readTemplateDraft($templateId);
            if ($draft !== null) {
                $template = $draft;
            } else {
                $template = $this->resolveTemplate($registry, $templateId);
            }
        }
        if ($template === null) {
            throw new GraphicsGovernanceException(404, 'template_not_found', 'Template not found for validation');
        }
        $validation = $this->validateTemplateDocument($template, $templateId !== '' ? $templateId : null);
        if (is_array($input['template'] ?? null)) {
            try {
                $this->assertTemplateIdentityAvailable($registry, $template, true);
                $this->assertTemplateVersionBump($registry, $template);
            } catch (GraphicsGovernanceException $e) {
                $validation['valid'] = false;
                $errors = (array)($validation['errors'] ?? []);
                $extraErrors = $e->errors();
                if ($extraErrors === []) {
                    $extraErrors = [['field' => 'template', 'message' => $e->getMessage(), 'code' => $e->errorCode()]];
                }
                $validation['errors'] = array_merge($errors, $extraErrors);
            }
        }
        return [
            'validation' => $validation,
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
        $draft['registryStatus'] = (string)($draft['registryStatus'] ?? 'approved');
        $draft['status'] = 'published';

        $validation = $this->validateTemplateDocument($draft, $templateId);
        if (!$validation['valid']) {
            throw new GraphicsGovernanceException(422, 'template_validation_failed', 'Template cannot be published while validation fails', (array)$validation['errors']);
        }
        $this->assertTemplateIdentityAvailable($registry, $draft, true);

        $existingIndex = $this->templateIndex($registry, (string)$draft['templateId']);
        if ($existingIndex !== null) {
            $existing = (array)$registry['templates'][$existingIndex];
            if (!$this->isVersionGreater((string)($draft['version'] ?? ''), (string)($existing['version'] ?? ''))) {
                throw new GraphicsGovernanceException(422, 'version_bump_required', 'Published template version must be greater than the current published version', [
                    ['field' => 'version', 'message' => 'Version must be greater than ' . (string)($existing['version'] ?? ''), 'code' => 'version_bump_required'],
                ]);
            }
        }

        $impact = $this->analyzeTemplateImpact(['templateId' => (string)$draft['templateId']]);
        $recordedImpact = $this->assertRecordedImpact($request, $impact);
        $this->assertPublishEvidence($request, $impact);

        $this->snapshotRegistry('before_publish_' . (string)$draft['templateId'], $registry, $username);

        $releaseRefs = $this->normalizeReleaseManifestRefs((array)($request['releaseManifestRefs'] ?? $request['releaseEvidence'] ?? []));
        $waiverIds = $this->assertApprovedWaiverRefsForPublish(
            array_values(array_filter(array_map('strval', (array)($request['waiverIds'] ?? [])))),
            (string)$draft['templateId'],
            $impact
        );
        $this->assertNoActiveReleaseBlockersForPublish((string)$draft['templateId'], $impact);
        $draft['publishedAt'] = gmdate('c');
        $draft['publishedBy'] = $username;
        $draft['releaseManifestRefs'] = $releaseRefs;
        $draft['waiverIds'] = $waiverIds;
        $draft['impactAnalysisId'] = (string)($request['impactAnalysisId'] ?? $impact['impactId']);

        if ($existingIndex === null) {
            $registry['templates'][] = $draft;
        } else {
            $registry['templates'][$existingIndex] = $draft;
        }

        $registry = $this->bumpRegistry($registry, $username);
        $this->repo->writeTemplateRegistry($registry);

        $state = $this->repo->readState();
        $state = $this->pruneExpiredImpacts($state);
        if (isset($state['pendingImpact'][(string)$draft['impactAnalysisId']])) {
            $state['pendingImpact'][(string)$draft['impactAnalysisId']]['status'] = 'consumed';
            $state['pendingImpact'][(string)$draft['impactAnalysisId']]['consumedAt'] = gmdate('c');
            $state['pendingImpact'][(string)$draft['impactAnalysisId']]['consumedBy'] = $username;
        }
        $state['publishedImpacts'][(string)$draft['impactAnalysisId']] = [
            'publishedAt' => gmdate('c'),
            'publishedBy' => $username,
            'templateId' => (string)$draft['templateId'],
            'version' => (string)$draft['version'],
            'recordedAt' => (string)($recordedImpact['recordedAt'] ?? ''),
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
            } elseif ((string)($template['status'] ?? '') === 'retired') {
                $findings[] = ['code' => 'template_retired_still_bound', 'severity' => 'blocker'];
            } elseif ((string)($template['status'] ?? '') === 'deprecated') {
                $findings[] = ['code' => 'template_deprecated_still_bound', 'severity' => 'warning'];
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
            $usesPrivateCssShell = $this->moduleUsesPrivateCssShell($moduleId, $module, $packet);
            if ($usesPrivateCssShell) {
                $findings[] = ['code' => 'legacy_private_css_shell', 'severity' => 'blocker'];
            }
            $hasBlocker = count(array_filter($findings, static fn(array $finding): bool => (string)$finding['severity'] === 'blocker')) > 0;
            $consumesSharedTokens = !$usesPrivateCssShell && $template !== null;
            $consumesHmComponents = $blockFamilies !== [] && $blockFindings === [];
            $linkageStatus = $hasBlocker ? 'blocked' : 'full-admin-controlled';
            if ($usesPrivateCssShell) {
                $linkageStatus = 'legacy-private-css';
            } elseif (!$hasBlocker && (!$consumesHmComponents || !$consumesSharedTokens || $findings !== [])) {
                $linkageStatus = 'bridged-to-shared-tokens';
            }
            $reason = 'Consumes backend template authority, shared tokens, and governed block contracts.';
            if ($linkageStatus === 'blocked') {
                $reason = 'Release blocked: ' . implode(',', array_values(array_unique(array_filter(array_map(
                    static fn(array $finding): string => (string)$finding['code'],
                    $findings
                )))));
            } elseif ($linkageStatus === 'legacy-private-css') {
                $reason = 'Legacy private CSS shell detected; shared token bridge is not enough for full control.';
            } elseif ($linkageStatus === 'bridged-to-shared-tokens') {
                $reason = 'Bridged through shared tokens while component/template debt remains open.';
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
                'status' => $linkageStatus,
                'linkageStatus' => $linkageStatus,
                'templateBindingSource' => $template === null ? 'missing' : 'backend-template-registry',
                'sharedTokenCoverage' => $consumesSharedTokens ? 100 : 40,
                'sharedComponentCoverage' => $consumesHmComponents ? 100 : 50,
                'bridgeAliasDebt' => $linkageStatus === 'bridged-to-shared-tokens' ? count($findings) : 0,
                'privateCssDebt' => $usesPrivateCssShell ? 1 : 0,
                'hardcodedStyleDebt' => $usesPrivateCssShell ? 1 : 0,
                'driftStatus' => $hasBlocker ? 'blocked' : ($findings === [] ? 'clean' : 'warning'),
                'runtimeBeaconStatus' => $linkageStatus === 'blocked' || $linkageStatus === 'legacy-private-css' ? 'release-blocking' : 'reported',
                'blockerReason' => $linkageStatus === 'blocked' ? $reason : '',
                'consumesHmComponents' => $consumesHmComponents,
                'consumesSharedTokens' => $consumesSharedTokens,
                'usesPrivateCssShell' => $usesPrivateCssShell,
                'reason' => $reason,
                'ownerTeam' => (string)($packet['ownerTeam'] ?? $module['ownerTeam'] ?? 'Frontend Platform'),
                'domain' => (string)($packet['domain'] ?? $module['domain'] ?? 'unclassified'),
            ];
        }

        return [
            'matrix' => $rows,
            'summary' => [
                'moduleCount' => count($rows),
                'compliantCount' => count(array_filter($rows, static fn(array $row): bool => (bool)$row['compliant'])),
                'nonCompliantCount' => count(array_filter($rows, static fn(array $row): bool => !(bool)$row['compliant'])),
                'fullAdminControlledCount' => count(array_filter($rows, static fn(array $row): bool => (string)$row['linkageStatus'] === 'full-admin-controlled')),
                'bridgedToSharedTokensCount' => count(array_filter($rows, static fn(array $row): bool => (string)$row['linkageStatus'] === 'bridged-to-shared-tokens')),
                'legacyPrivateCssCount' => count(array_filter($rows, static fn(array $row): bool => (string)$row['linkageStatus'] === 'legacy-private-css')),
                'blockedCount' => count(array_filter($rows, static fn(array $row): bool => (string)$row['linkageStatus'] === 'blocked')),
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
    public function debtReport(): array
    {
        $bridge = $this->bridgeAliasDebt();
        $private = $this->privateCssDebt();
        $coverage = $this->tokenAdoptionCoverage();
        $matrix = $this->complianceMatrix();
        $observatory = $this->buildVisualDebtObservatory($bridge, $private, $coverage, $matrix);
        return [
            'debt' => [
                'bridgeAliasDebt' => $bridge,
                'privateCssDebt' => $private,
                'tokenAdoptionCoverage' => $coverage,
                'visualDebtObservatory' => $observatory,
            ],
            'summary' => [
                'bridgeAliasDebtCount' => (int)($bridge['summary']['debtCount'] ?? 0),
                'privateCssDebtScore' => (int)($private['summary']['totalDebtScore'] ?? 0),
                'privateCssFileCount' => (int)($private['summary']['fileCount'] ?? 0),
                'tokenCoveragePercent' => (int)($coverage['coverage']['coveragePercent'] ?? 0),
                'uncontrolledLegacyShellDebt' => (int)($observatory['summary']['uncontrolledLegacyShellDebt'] ?? 0),
            ],
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
            'generatedAt' => gmdate('c'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function releaseBlockers(): array
    {
        $matrix = $this->complianceMatrix();
        $drift = $this->driftReport();
        $registry = $this->normalizedTemplateRegistry();
        $state = $this->pruneExpiredImpacts($this->repo->readState());
        $waivers = (array)($this->activeWaivers()['waivers'] ?? []);

        $blockers = [];
        foreach ((array)($matrix['matrix'] ?? []) as $row) {
            if (!is_array($row) || (bool)($row['compliant'] ?? false)) {
                continue;
            }
            $moduleId = (string)($row['moduleId'] ?? '');
            $findingCodes = array_values(array_filter(array_map(
                static fn($finding): string => is_array($finding) ? (string)($finding['code'] ?? '') : '',
                (array)($row['findings'] ?? [])
            )));
            $blockerId = 'graphics_module_' . $moduleId;
            $releaseGate = 'G19-graphics-governance';
            $waived = $this->releaseBlockerHasEligibleWaiver($waivers, $moduleId, $blockerId, $releaseGate, 'module');
            $blockers[] = [
                'blockerId' => $blockerId,
                'scope' => 'module',
                'targetId' => $moduleId,
                'severity' => $waived ? 'waived' : 'blocker',
                'status' => $waived ? 'waived' : 'active',
                'reason' => $findingCodes === [] ? 'module_graphics_non_compliant' : implode(',', $findingCodes),
                'releaseGate' => $releaseGate,
                'waiverAllowed' => true,
            ];
        }

        foreach ((array)($drift['blockers'] ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ((string)($row['code'] ?? '') === 'module_graphics_non_compliant') {
                continue;
            }
            $targetId = (string)($row['id'] ?? $row['targetId'] ?? $row['scope'] ?? 'graphics');
            $blockerId = 'graphics_drift_' . $targetId;
            $releaseGate = 'G19-graphics-governance';
            $waived = $this->releaseBlockerHasEligibleWaiver($waivers, $targetId, $blockerId, $releaseGate, (string)($row['scope'] ?? 'graphics'));
            $blockers[] = [
                'blockerId' => $blockerId,
                'scope' => (string)($row['scope'] ?? 'graphics'),
                'targetId' => $targetId,
                'severity' => $waived ? 'waived' : 'blocker',
                'status' => $waived ? 'waived' : 'active',
                'reason' => (string)($row['code'] ?? 'graphics_drift_blocker'),
                'releaseGate' => $releaseGate,
                'waiverAllowed' => true,
            ];
        }

        foreach ((array)($state['pendingImpact'] ?? []) as $impactId => $impact) {
            if (!is_array($impact) || (string)($impact['status'] ?? 'pending') !== 'pending') {
                continue;
            }
            $hasBlockers = (bool)($impact['hasBlockers'] ?? false);
            $blockerId = 'graphics_pending_impact_' . (string)$impactId;
            $releaseGate = 'G19-graphics-governance';
            $waived = $this->releaseBlockerHasEligibleWaiver($waivers, (string)$impactId, $blockerId, $releaseGate, 'impact-analysis');
            $blockers[] = [
                'blockerId' => $blockerId,
                'scope' => 'impact-analysis',
                'targetId' => (string)$impactId,
                'severity' => $waived ? 'waived' : ($hasBlockers ? 'blocker' : 'warning'),
                'status' => $waived ? 'waived' : ($hasBlockers ? 'active' : 'pending-review'),
                'reason' => $hasBlockers ? 'impact_blockers_unresolved' : 'impact_analysis_not_consumed_by_publish_or_rollout',
                'releaseGate' => $releaseGate,
                'waiverAllowed' => $hasBlockers,
            ];
        }

        $activeBlockers = array_values(array_filter($blockers, static fn(array $row): bool => (string)$row['status'] === 'active'));
        $driftGeneratedAt = (string)($drift['generatedAt'] ?? gmdate('c'));
        return [
            'blockers' => $blockers,
            'summary' => [
                'blockerCount' => count($activeBlockers),
                'waivedCount' => count(array_filter($blockers, static fn(array $row): bool => (string)$row['status'] === 'waived')),
                'pendingImpactCount' => count((array)($state['pendingImpact'] ?? [])),
                'releaseBlocked' => $activeBlockers !== [],
            ],
            'evidence' => [
                'graphicsAuthorityRefs' => [
                    'mom/design/template-registry.json',
                    'mom/data/registry/graphics-governance-registry.json',
                    'mom/docs/module-layout-template-design-system-v4.html',
                    'docs/standards/36-frontend-module-layout-template-standard.md',
                ],
                'complianceMatrixVersion' => (string)($matrix['version'] ?? ''),
                'templateRegistryVersion' => $this->documentVersion($registry),
                'templateRegistryEtag' => $this->etag($registry),
                'templateRegistryChecksum' => $this->etag($registry),
                'complianceMatrixRef' => 'mom/data/registry/graphics-governance-registry.json#/moduleGraphicsCompliance',
                'impactAnalysisRef' => 'mom/data/graphics-governance/state.json#/pendingImpact',
                'waiversRef' => 'mom/data/graphics-governance/waivers.json#/waivers',
                'changeSetRef' => 'mom/data/registry/graphics-governance-registry.json#/changeSetModel',
                'lineageGraphRef' => 'mom/data/registry/graphics-governance-registry.json#/moduleGraphicsLineageGraph',
                'runtimeBeaconRef' => 'mom/data/registry/graphics-governance-registry.json#/runtimeGraphicsComplianceBeacon',
                'debtObservatoryRef' => 'mom/data/registry/graphics-governance-registry.json#/visualDebtObservatory',
                'environmentPolicyPacksRef' => 'mom/data/registry/graphics-governance-registry.json#/environmentPolicyPacks',
                'releaseDashboardRef' => 'mom/data/registry/graphics-governance-registry.json#/graphicsReleaseDashboard',
                'releaseEvidencePackRef' => 'mom/data/registry/graphics-governance-registry.json#/graphicsReleaseEvidencePack',
                'multiSitePlantBrandingGovernanceRef' => 'mom/data/registry/graphics-governance-registry.json#/multiSitePlantBrandingGovernance',
                'controlledEmergencyOverridePathRef' => 'mom/data/registry/graphics-governance-registry.json#/controlledEmergencyOverridePath',
                'rolloutDecisionRef' => 'mom/data/graphics-governance/rollouts.json#/rollouts',
                'rollbackPlanRef' => 'mom/data/graphics-governance/snapshots/bootstrap-rollback-plan.json',
                'releaseBlocked' => $activeBlockers !== [],
                'releaseReadinessState' => $activeBlockers !== [] ? 'blocked-by-graphics-governance' : 'ready',
                'blockerCount' => count($activeBlockers),
                'releaseBlockerCount' => count($activeBlockers),
                'evidenceBundleRequirements' => [
                    'affectedModulesSnapshot',
                    'complianceMatrixSnapshot',
                    'debtDriftSnapshot',
                    'runtimeBeaconSnapshot',
                    'rolloutDecision',
                    'rollbackPlan',
                    'waiverRegisterSnapshot',
                ],
                'driftReportGeneratedAt' => $driftGeneratedAt,
                'generatedAt' => gmdate('c'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function graphicsChangeSetModel(): array
    {
        $state = $this->pruneExpiredImpacts($this->repo->readState());
        $rollouts = $this->repo->readRolloutsDocument();
        $pending = array_values(array_filter((array)($state['pendingImpact'] ?? []), 'is_array'));
        $latestImpact = $pending !== [] ? (array)($pending[0]['report'] ?? []) : $this->impactReport('change-set', ['scope' => 'graphics-control-plane'], []);
        $changeSetId = 'gcs_' . substr($this->hash(json_encode([
            'impact' => $latestImpact,
            'registry' => $this->documentVersion($this->normalizedTemplateRegistry()),
        ]) ?: ''), 0, 12);

        return [
            'changeSet' => [
                'changeSetId' => $changeSetId,
                'status' => $pending === [] ? 'preview-only' : 'impact-recorded',
                'source' => 'backend_graphics_governance_state',
                'edits' => array_map(static function (array $impact): array {
                    $report = is_array($impact['report'] ?? null) ? (array)$impact['report'] : [];
                    return [
                        'impactId' => (string)($report['impactId'] ?? ''),
                        'analysisType' => (string)($report['analysisType'] ?? ''),
                        'subject' => is_array($report['subject'] ?? null) ? (array)$report['subject'] : [],
                        'status' => (string)($impact['status'] ?? 'pending'),
                        'recordedAt' => (string)($impact['recordedAt'] ?? ''),
                    ];
                }, $pending),
                'diffSummary' => [
                    'impactCount' => count($pending),
                    'rolloutCount' => count((array)($rollouts['rollouts'] ?? [])),
                    'authority' => 'mom/data/graphics-governance/state.json',
                ],
                'impact' => $latestImpact,
                'risk' => [
                    'severityClass' => (string)($latestImpact['severityClass'] ?? 'low'),
                    'blockerCount' => count((array)($latestImpact['blockers'] ?? [])),
                ],
                'rolloutScopePlan' => $this->rolloutScopePlan($latestImpact),
                'evidenceChecklist' => (array)($latestImpact['requiredEvidence'] ?? $this->evidencePlanForSeverity('low')),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function lineageGraph(): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $contracts = $this->blockContractsByType();
        $nodes = [
            ['id' => 'admin-appearance', 'type' => 'admin-control-plane', 'label' => 'Admin Appearance / Template Studio'],
            ['id' => 'backend-graphics-authority', 'type' => 'backend-authority', 'label' => 'Backend graphics authority'],
            ['id' => 'shared-tokens', 'type' => 'token-layer', 'label' => 'Shared tokens'],
            ['id' => 'shared-components', 'type' => 'component-layer', 'label' => 'Shared hm-* components'],
        ];
        $edges = [
            ['from' => 'admin-appearance', 'to' => 'backend-graphics-authority', 'relation' => 'persists-through'],
            ['from' => 'backend-graphics-authority', 'to' => 'shared-tokens', 'relation' => 'publishes-runtime-tokens'],
            ['from' => 'shared-tokens', 'to' => 'shared-components', 'relation' => 'drives-contracts'],
        ];

        foreach ((array)($registry['templates'] ?? []) as $template) {
            if (!is_array($template)) {
                continue;
            }
            $templateId = (string)($template['templateId'] ?? '');
            if ($templateId === '') {
                continue;
            }
            $nodes[] = [
                'id' => 'template:' . $templateId,
                'type' => 'template',
                'label' => $templateId . ' v' . (string)($template['version'] ?? ''),
                'status' => (string)($template['status'] ?? ''),
                'lineage' => $this->templateLineage($template),
            ];
            $edges[] = ['from' => 'backend-graphics-authority', 'to' => 'template:' . $templateId, 'relation' => 'controls-template'];
        }

        foreach ($contracts as $contract) {
            $blockType = (string)($contract['blockType'] ?? '');
            if ($blockType === '') {
                continue;
            }
            $nodes[] = ['id' => 'component:' . $blockType, 'type' => 'component-contract', 'label' => $blockType];
            $edges[] = ['from' => 'shared-components', 'to' => 'component:' . $blockType, 'relation' => 'contract'];
        }

        foreach ($this->moduleRecords() as $record) {
            $module = $record['module'];
            $packet = $record['packet'];
            $moduleId = (string)($module['moduleId'] ?? $packet['moduleId'] ?? '');
            if ($moduleId === '') {
                continue;
            }
            $templateId = (string)($module['templateId'] ?? $packet['templateId'] ?? '');
            $nodes[] = [
                'id' => 'module:' . $moduleId,
                'type' => 'module',
                'label' => $moduleId,
                'route' => (string)($module['route'] ?? $packet['route'] ?? ''),
                'domain' => (string)($packet['domain'] ?? $module['domain'] ?? ''),
                'ownerTeam' => (string)($packet['ownerTeam'] ?? $module['ownerTeam'] ?? ''),
            ];
            if ($templateId !== '') {
                $edges[] = ['from' => 'template:' . $templateId, 'to' => 'module:' . $moduleId, 'relation' => 'governs-module'];
            }
            foreach ((array)($packet['blocks'] ?? []) as $block) {
                if (!is_array($block) || (string)($block['type'] ?? '') === '') {
                    continue;
                }
                $edges[] = ['from' => 'component:' . (string)$block['type'], 'to' => 'module:' . $moduleId, 'relation' => 'consumed-by-module'];
            }
        }

        return [
            'lineageGraph' => [
                'nodes' => $nodes,
                'edges' => $edges,
                'summary' => [
                    'nodeCount' => count($nodes),
                    'edgeCount' => count($edges),
                    'templateCount' => count((array)($registry['templates'] ?? [])),
                ],
                'authorityRefs' => [
                    'templateRegistry' => 'mom/design/template-registry.json',
                    'blockContracts' => 'mom/design/block-contracts/*.json',
                    'moduleBuildPackets' => 'mom/design/build-packets/*.json',
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function runtimeComplianceBeacon(): array
    {
        $matrix = $this->complianceMatrix();
        $rows = [];
        foreach ((array)($matrix['matrix'] ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $rows[] = [
                'moduleId' => (string)($row['moduleId'] ?? ''),
                'route' => (string)($row['route'] ?? ''),
                'linkageStatus' => (string)($row['linkageStatus'] ?? 'blocked'),
                'sharedTokenProbe' => (bool)($row['consumesSharedTokens'] ?? false),
                'hmComponentProbe' => (bool)($row['consumesHmComponents'] ?? false),
                'privateCssProbe' => (bool)($row['usesPrivateCssShell'] ?? false),
                'bridgeAliasState' => (int)($row['bridgeAliasDebt'] ?? 0) > 0 ? 'debt-open' : 'clean',
                'driftHash' => substr($this->hash(json_encode([
                    'moduleId' => (string)($row['moduleId'] ?? ''),
                    'status' => (string)($row['linkageStatus'] ?? 'blocked'),
                    'token' => (bool)($row['consumesSharedTokens'] ?? false),
                    'component' => (bool)($row['consumesHmComponents'] ?? false),
                    'privateCss' => (bool)($row['usesPrivateCssShell'] ?? false),
                    'debt' => [
                        (int)($row['bridgeAliasDebt'] ?? 0),
                        (int)($row['privateCssDebt'] ?? 0),
                        (int)($row['hardcodedStyleDebt'] ?? 0),
                    ],
                ]) ?: ''), 0, 16),
                'complianceState' => (string)($row['status'] ?? $row['linkageStatus'] ?? 'blocked'),
                'beaconStatus' => in_array((string)($row['linkageStatus'] ?? ''), ['blocked', 'legacy-private-css'], true) ? 'release-blocking' : 'reported',
                'reportedAt' => gmdate('c'),
            ];
        }
        return [
            'runtimeBeacon' => [
                'beacons' => $rows,
                'summary' => [
                    'reportedModules' => count($rows),
                    'releaseBlockingModules' => count(array_filter($rows, static fn(array $row): bool => (string)$row['beaconStatus'] === 'release-blocking')),
                    'authority' => 'runtime diagnostics feed into backend graphics compliance',
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function visualDebtObservatory(): array
    {
        return ['observatory' => $this->buildVisualDebtObservatory(
            $this->bridgeAliasDebt(),
            $this->privateCssDebt(),
            $this->tokenAdoptionCoverage(),
            $this->complianceMatrix()
        )];
    }

    /**
     * @return array<string, mixed>
     */
    public function environmentPolicyPacks(): array
    {
        $packs = [
            ['environment' => 'office', 'tokenOverrides' => ['density' => 'default', 'contrast' => 'standard'], 'componentPolicy' => ['standard-toolbar', 'data-table'], 'evidenceObligations' => ['visual-regression']],
            ['environment' => 'review', 'tokenOverrides' => ['density' => 'comfortable', 'contrast' => 'standard'], 'componentPolicy' => ['evidence-panel', 'keyboard-path'], 'evidenceObligations' => ['screenshot-diff', 'keyboard-path']],
            ['environment' => 'admin', 'tokenOverrides' => ['density' => 'compact', 'contrast' => 'standard'], 'componentPolicy' => ['audit-console', 'permission-editor'], 'evidenceObligations' => ['audit-trail', 'permission-review']],
            ['environment' => 'shopfloor', 'tokenOverrides' => ['density' => 'shopfloor', 'contrast' => 'high'], 'componentPolicy' => ['large-action-button', 'scanner-input'], 'evidenceObligations' => ['shopfloor-kiosk-smoke', 'touch-target-proof']],
            ['environment' => 'kiosk', 'tokenOverrides' => ['density' => 'shopfloor', 'contrast' => 'high'], 'componentPolicy' => ['timeout-banner', 'large-action-button'], 'evidenceObligations' => ['kiosk-viewport-proof', 'timeout-proof']],
            ['environment' => 'tv', 'tokenOverrides' => ['density' => 'comfortable', 'contrast' => 'high'], 'componentPolicy' => ['andon-tile', 'distance-kpi'], 'evidenceObligations' => ['distance-legibility-proof']],
            ['environment' => 'night-shift', 'tokenOverrides' => ['mode' => 'dark', 'contrast' => 'high'], 'componentPolicy' => ['low-glare-surface', 'fatigue-safe-focus'], 'evidenceObligations' => ['dark-mode-contrast', 'fatigue-review']],
            ['environment' => 'glare-dirty-screen', 'tokenOverrides' => ['contrast' => 'max', 'borderWeight' => 'strong'], 'componentPolicy' => ['high-contrast-status', 'large-touch-target'], 'evidenceObligations' => ['glare-photo-proof', 'dirty-screen-readability']],
            ['environment' => 'glove-mode', 'tokenOverrides' => ['density' => 'shopfloor', 'targetSize' => 'large'], 'componentPolicy' => ['large-action-button', 'stepper-control'], 'evidenceObligations' => ['glove-touch-proof', 'mis-tap-review']],
        ];
        return [
            'policyPacks' => [
                'packs' => $packs,
                'multiSitePlantBranding' => $this->multiSitePlantBrandingGovernance(),
                'summary' => [
                    'packCount' => count($packs),
                    'authority' => 'backend_graphics_environment_policy_pack',
                    'localStorageAuthority' => false,
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function graphicsReleaseDashboard(): array
    {
        $blockers = $this->releaseBlockers();
        $matrix = $this->complianceMatrix();
        $debt = $this->debtReport();
        $waivers = $this->activeWaivers();
        $rollouts = $this->repo->readRolloutsDocument();
        $observatory = $this->buildVisualDebtObservatory(
            $this->bridgeAliasDebt(),
            $this->privateCssDebt(),
            $this->tokenAdoptionCoverage(),
            $matrix
        );
        return [
            'releaseDashboard' => [
                'readiness' => (bool)($blockers['summary']['releaseBlocked'] ?? false) ? 'blocked' : 'ready',
                'blockers' => $blockers,
                'waivers' => $waivers,
                'complianceSummary' => $matrix['summary'],
                'debtSummary' => $debt['summary'],
                'trendDashboard' => $this->graphicsReleaseTrendDashboard($observatory, $blockers),
                'emergencyOverridePath' => $this->controlledEmergencyOverridePath(),
                'rolloutSummary' => [
                    'rolloutCount' => count((array)($rollouts['rollouts'] ?? [])),
                    'stagedCount' => count(array_filter((array)($rollouts['rollouts'] ?? []), static fn($row): bool => is_array($row) && (string)($row['status'] ?? '') === 'staged')),
                    'canaryAppliedCount' => count(array_filter((array)($rollouts['rollouts'] ?? []), static fn($row): bool => is_array($row) && (string)($row['status'] ?? '') === 'canary_applied')),
                    'appliedCount' => count(array_filter((array)($rollouts['rollouts'] ?? []), static fn($row): bool => is_array($row) && (string)($row['status'] ?? '') === 'applied')),
                ],
                'postApplyVerification' => [
                    'runtimeBeaconRequired' => true,
                    'driftReportRequired' => true,
                    'evidenceBundleRequired' => true,
                ],
                'generatedAt' => gmdate('c'),
            ],
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
    public function analyzePolicyPackImpact(array $input): array
    {
        $policyPack = trim((string)($input['policyPack'] ?? $input['environment'] ?? $input['environmentPolicyPack'] ?? ''));
        if ($policyPack === '') {
            throw new GraphicsGovernanceException(422, 'policy_pack_required', 'policyPack or environment is required for environment policy impact analysis');
        }
        $policy = $this->resolveEnvironmentPolicyPack($policyPack);
        $affected = [];
        foreach ($this->moduleRecords() as $record) {
            $module = $record['module'];
            $packet = $record['packet'];
            $row = $this->impactModuleRow($module, $packet);
            $isShopfloor = (bool)($row['shopfloor'] ?? false);
            $isRegulated = (bool)($row['regulated'] ?? false);
            $haystack = strtolower(implode(' ', [
                (string)($packet['domain'] ?? $module['domain'] ?? ''),
                (string)($packet['criticality'] ?? $module['criticality'] ?? ''),
                implode(' ', (array)($row['blockFamilies'] ?? [])),
                implode(' ', (array)($row['screens'] ?? [])),
            ]));
            $touches = in_array($policyPack, ['office', 'review', 'admin'], true);
            if (in_array($policyPack, ['shopfloor', 'kiosk', 'glove-mode', 'glare-dirty-screen'], true)) {
                $touches = $isShopfloor || preg_match('/shopfloor|mes|operator|scanner|dispatch|machine|kiosk/', $haystack) === 1;
            }
            if (in_array($policyPack, ['tv', 'andon'], true)) {
                $touches = preg_match('/andon|tv|kpi|dashboard|machine|shopfloor/', $haystack) === 1;
            }
            if ($policyPack === 'night-shift') {
                $touches = $isShopfloor || $isRegulated || preg_match('/night|shift|operator|production/', $haystack) === 1;
            }
            if ($touches) {
                $row['policyPack'] = $policyPack;
                $affected[] = $row;
            }
        }
        $report = $this->impactReport('environment-policy', [
            'policyPack' => $policyPack,
            'tokenOverrides' => (array)($policy['tokenOverrides'] ?? []),
            'componentPolicy' => (array)($policy['componentPolicy'] ?? []),
        ], $affected);
        $report['blastRadius'] = $this->blastRadiusEstimate($report);
        $report['policyPack'] = $policy;
        return $report;
    }

    /**
     * @param array<string, mixed> $report
     * @return array<string, mixed>
     */
    public function recordImpactReport(array $report, string $username): array
    {
        $impactId = trim((string)($report['impactId'] ?? ''));
        if ($impactId === '') {
            throw new GraphicsGovernanceException(422, 'impact_id_required', 'Impact report requires impactId');
        }

        $recordedAt = gmdate('c');
        $expiresAt = gmdate('c', time() + self::IMPACT_TTL_SECONDS);
        $state = $this->pruneExpiredImpacts($this->repo->readState());
        $state['pendingImpact'][$impactId] = [
            'status' => 'pending',
            'recordedAt' => $recordedAt,
            'recordedBy' => $username,
            'expiresAt' => $expiresAt,
            'signature' => $this->impactSignature($report),
            'hasBlockers' => (array)($report['blockers'] ?? []) !== [],
            'report' => $report,
        ];
        $state = $this->bumpLooseDocument($state, $username);
        $this->repo->writeState($state);

        return $report + [
            'recordedAt' => $recordedAt,
            'recordedBy' => $username,
            'expiresAt' => $expiresAt,
        ];
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
        $scope = (array)($input['scope'] ?? []);
        $scopeMode = (string)($scope['mode'] ?? $input['scopeMode'] ?? 'preview-only');
        if (!in_array($scopeMode, self::VALID_ROLLOUT_SCOPE_MODES, true)) {
            throw new GraphicsGovernanceException(422, 'invalid_rollout_scope_mode', 'Rollout scope mode is not allowed', [
                ['field' => 'scope.mode', 'message' => 'Allowed modes: ' . implode(', ', self::VALID_ROLLOUT_SCOPE_MODES), 'code' => 'invalid_scope_mode'],
            ]);
        }
        $scope['mode'] = $scopeMode;
        if ($scopeMode === 'environment-stage' && trim((string)($scope['policyPack'] ?? $input['policyPack'] ?? '')) === '') {
            throw new GraphicsGovernanceException(422, 'policy_pack_required', 'Environment-stage rollout requires a policyPack');
        }

        $doc = $this->repo->readRolloutsDocument();
        $rolloutId = (string)($input['rolloutId'] ?? ('gr_' . gmdate('YmdHis') . '_' . substr($this->hash(json_encode($input) ?: ''), 0, 8)));
        $rollout = [
            'rolloutId' => $rolloutId,
            'status' => 'staged',
            'scope' => $scope,
            'scopeMode' => $scopeMode,
            'rolloutScopePlan' => $this->rolloutScopePlan($impact, $scopeMode),
            'impact' => $impact,
            'evidenceChecklist' => (array)($impact['requiredEvidence'] ?? []),
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
        $this->publishRuntimeRegistry();
        return ['rollout' => $rollout, 'registryVersion' => $this->documentVersion($registry), 'registryEtag' => $this->etag($registry)];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function canaryApplyRollout(array $input, ?string $expectedVersion, string $username): array
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
            throw new GraphicsGovernanceException(409, 'rollout_not_staged', 'Only staged rollouts can enter canary');
        }
        $scopeMode = (string)($rollout['scopeMode'] ?? $rollout['scope']['mode'] ?? '');
        if (!in_array($scopeMode, ['canary-module-group', 'canary-domain'], true)) {
            throw new GraphicsGovernanceException(422, 'canary_scope_required', 'Canary apply requires canary-module-group or canary-domain scope');
        }
        if ($this->normalizeReleaseManifestRefs((array)($rollout['releaseManifestRefs'] ?? [])) === []) {
            throw new GraphicsGovernanceException(422, 'release_manifest_required', 'Canary apply requires releaseManifestRefs captured at rollout stage');
        }
        if ($this->normalizeExpected((string)($rollout['baseRegistryEtag'] ?? '')) !== $this->etag($registry)) {
            throw new GraphicsGovernanceException(412, 'registry_changed_since_stage', 'Registry changed after rollout was staged', [], [
                'current_version' => $this->documentVersion($registry),
                'current_etag' => $this->etag($registry),
            ]);
        }
        $scopedBlockers = $this->activeReleaseBlockersForScope((array)($rollout['scope'] ?? []), $this->releaseBlockers());
        if ($scopedBlockers !== []) {
            throw new GraphicsGovernanceException(422, 'release_blockers_active', 'Canary rollout cannot be applied while scoped graphics blockers are active', [], [
                'releaseBlockers' => $scopedBlockers,
            ]);
        }

        $snapshotId = $this->snapshotRegistry('before_canary_rollout_' . $rolloutId, $registry, $username);
        $rollout['status'] = 'canary_applied';
        $rollout['canaryAppliedAt'] = gmdate('c');
        $rollout['canaryAppliedBy'] = $username;
        $rollout['rollbackSnapshotId'] = $snapshotId;
        $rollout['postCanaryVerification'] = [
            'runtimeBeaconRequired' => true,
            'driftReportRequired' => true,
            'moduleOwnerSignoffRequired' => true,
        ];
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
        if (!in_array((string)($rollout['status'] ?? ''), ['staged', 'canary_applied'], true)) {
            throw new GraphicsGovernanceException(409, 'rollout_not_staged_or_canary', 'Only staged or canary-applied rollouts can be applied globally');
        }
        if ((string)($rollout['status'] ?? '') === 'canary_applied') {
            $this->assertPostCanaryVerification($rollout, $input);
        }
        if ($this->normalizeReleaseManifestRefs((array)($rollout['releaseManifestRefs'] ?? [])) === []) {
            throw new GraphicsGovernanceException(422, 'release_manifest_required', 'Apply requires releaseManifestRefs captured at rollout stage');
        }
        if ($this->normalizeExpected((string)($rollout['baseRegistryEtag'] ?? '')) !== $this->etag($registry)) {
            throw new GraphicsGovernanceException(412, 'registry_changed_since_stage', 'Registry changed after rollout was staged', [], [
                'current_version' => $this->documentVersion($registry),
                'current_etag' => $this->etag($registry),
            ]);
        }
        $releaseBlockers = $this->releaseBlockers();
        if ((bool)($releaseBlockers['summary']['releaseBlocked'] ?? false)) {
            throw new GraphicsGovernanceException(422, 'release_blockers_active', 'Rollout cannot be applied while graphics release blockers are active', [], [
                'releaseBlockers' => $releaseBlockers,
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
        if (!in_array((string)($rollout['status'] ?? ''), ['applied', 'canary_applied'], true)) {
            throw new GraphicsGovernanceException(409, 'rollout_not_applied', 'Only applied or canary-applied rollouts can be rolled back');
        }
        if ($targetSnapshotId === '') {
            $targetSnapshotId = (string)($rollout['rollbackSnapshotId'] ?? '');
        }
        $snapshot = $targetSnapshotId !== '' ? $this->repo->readSnapshot($targetSnapshotId) : null;
        if ($snapshot === null || !is_array($snapshot['registry'] ?? null)) {
            throw new GraphicsGovernanceException(404, 'rollback_snapshot_not_found', 'Rollback target snapshot not found or invalid');
        }
        $targetRegistry = $this->normalizeRegistryAuthorityFields((array)$snapshot['registry']);
        $validation = $this->validateRegistryDocument($targetRegistry);
        if (!$validation['valid']) {
            throw new GraphicsGovernanceException(422, 'rollback_target_invalid', 'Rollback target registry is invalid', (array)$validation['errors']);
        }

        $this->snapshotRegistry('before_rollback_' . $rolloutId, $registry, $username);
        $targetRegistry = $this->bumpRegistry($targetRegistry, $username);
        $this->repo->writeTemplateRegistry($targetRegistry);

        $rollout['status'] = 'rolled_back';
        $rollout['rolledBackAt'] = gmdate('c');
        $rollout['rolledBackBy'] = $username;
        $rollout['rolledBackToSnapshotId'] = $targetSnapshotId;
        $doc['rollouts'][$rolloutId] = $rollout;
        $doc['_meta']['version'] = (int)($doc['_meta']['version'] ?? 1) + 1;
        $doc['_meta']['updatedAt'] = gmdate('c');
        $this->repo->writeRolloutsDocument($doc);
        $this->publishRuntimeRegistry();

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
        foreach (['scope', 'targetId', 'reason', 'riskClass', 'compensatingControl', 'owner', 'approver', 'expiresAt'] as $field) {
            if (trim((string)($input[$field] ?? '')) === '') {
                throw new GraphicsGovernanceException(422, 'waiver_field_required', 'Waiver requires ' . $field, [
                    ['field' => $field, 'message' => $field . ' is required', 'code' => 'required'],
                ]);
            }
        }
        $scope = (string)$input['scope'];
        if ($scope === 'graphics-governance') {
            $scope = 'release_gate';
        }
        if (!in_array($scope, ['template', 'module', 'component', 'token', 'release_gate'], true)) {
            throw new GraphicsGovernanceException(422, 'invalid_waiver_scope', 'Waiver scope is not allowed', [
                ['field' => 'scope', 'message' => 'Scope must be template, module, component, token, or release_gate', 'code' => 'invalid_scope'],
            ]);
        }
        $riskClass = (string)$input['riskClass'];
        if (!in_array($riskClass, ['low', 'medium', 'high', 'regulated', 'shopfloor-critical'], true)) {
            throw new GraphicsGovernanceException(422, 'invalid_waiver_risk_class', 'Waiver riskClass is not allowed', [
                ['field' => 'riskClass', 'message' => 'riskClass must be low, medium, high, regulated, or shopfloor-critical', 'code' => 'invalid_risk_class'],
            ]);
        }
        $expiresAt = $this->parseTime((string)$input['expiresAt']);
        if ($expiresAt === null || $expiresAt <= time()) {
            throw new GraphicsGovernanceException(422, 'invalid_waiver_expiry', 'Waiver expiresAt must be a future date/time', [
                ['field' => 'expiresAt', 'message' => 'expiresAt must parse to a future date/time', 'code' => 'invalid_expiry'],
            ]);
        }
        $documentControlRefs = array_values(array_filter(array_map('strval', (array)($input['documentControlRefs'] ?? []))));
        $releaseManifestRefs = $this->normalizeReleaseManifestRefs((array)($input['releaseManifestRefs'] ?? []));
        if (in_array($riskClass, ['high', 'regulated', 'shopfloor-critical'], true)) {
            if ($documentControlRefs === []) {
                throw new GraphicsGovernanceException(422, 'document_control_ref_required', 'High-risk waivers require controlled documentControlRefs at creation time', [
                    ['field' => 'documentControlRefs', 'message' => 'Required for high, regulated, or shopfloor-critical waiver creation', 'code' => 'required'],
                ]);
            }
            if ($releaseManifestRefs === []) {
                throw new GraphicsGovernanceException(422, 'release_manifest_required', 'High-risk waivers require releaseManifestRefs at creation time', [
                    ['field' => 'releaseManifestRefs', 'message' => 'Required for high, regulated, or shopfloor-critical waiver creation', 'code' => 'required'],
                ]);
            }
        }
        $this->assertControlledEvidenceRefList('documentControlRefs', $documentControlRefs);
        $this->assertControlledReleaseRefList('releaseManifestRefs', $releaseManifestRefs);
        $waiverId = (string)($input['waiverId'] ?? ('gwv_' . gmdate('YmdHis') . '_' . substr($this->hash(json_encode($input) ?: ''), 0, 8)));
        $waiver = [
            'waiverId' => $waiverId,
            'scope' => $scope,
            'targetId' => (string)$input['targetId'],
            'reason' => (string)$input['reason'],
            'risk' => (string)($input['risk'] ?? $riskClass),
            'compensatingControl' => (string)$input['compensatingControl'],
            'owner' => (string)$input['owner'],
            'approver' => (string)$input['approver'],
            'riskClass' => $riskClass,
            'status' => 'draft',
            'documentControlRefs' => $documentControlRefs,
            'releaseManifestRefs' => $releaseManifestRefs,
            'createdAt' => gmdate('c'),
            'createdBy' => $username,
            'expiresAt' => gmdate('c', $expiresAt),
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
        $rows = [];
        foreach ((array)($doc['waivers'] ?? []) as $waiver) {
            if (!is_array($waiver)) {
                continue;
            }
            $expiresAt = $this->parseTime((string)($waiver['expiresAt'] ?? ''));
            if ((string)($waiver['status'] ?? '') === 'approved' && $expiresAt !== null && $expiresAt > time()) {
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
        $releaseLink = $this->graphicsReleaseLink();
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
            'graphicsDebtReport' => $this->debtReport(),
            'graphicsDriftReport' => $this->driftReport(),
            'releaseBlockers' => $this->releaseBlockers(),
            'changeSetModel' => $this->graphicsChangeSetModel()['changeSet'],
            'moduleGraphicsLineageGraph' => $this->lineageGraph()['lineageGraph'],
            'runtimeGraphicsComplianceBeacon' => $this->runtimeComplianceBeacon()['runtimeBeacon'],
            'visualDebtObservatory' => $this->visualDebtObservatory()['observatory'],
            'environmentPolicyPacks' => $this->environmentPolicyPacks()['policyPacks'],
            'graphicsReleaseDashboard' => $this->graphicsReleaseDashboard()['releaseDashboard'],
            'graphicsReleaseLink' => $releaseLink['releaseLink'],
            'graphicsReleaseEvidencePack' => $this->graphicsReleaseEvidencePack()['evidencePack'],
            'multiSitePlantBrandingGovernance' => $this->multiSitePlantBrandingGovernance(),
            'controlledEmergencyOverridePath' => $this->controlledEmergencyOverridePath(),
            'persistence' => $this->persistenceModel(),
        ];
        $this->repo->writeRuntimeGraphicsRegistry($payload);
        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function graphicsReleaseLink(): array
    {
        $registry = $this->normalizedTemplateRegistry();
        $matrix = $this->complianceMatrix();
        $blockers = $this->releaseBlockers();
        $runtimeBeacon = $this->runtimeComplianceBeacon();
        $observatory = $this->visualDebtObservatory();
        $drift = $this->driftReport();
        return [
            'releaseLink' => [
                'graphicsAuthorityRefs' => [
                    'mom/design/template-registry.json',
                    'mom/data/registry/graphics-governance-registry.json',
                    'mom/docs/module-layout-template-design-system-v4.html',
                    'docs/standards/36-frontend-module-layout-template-standard.md',
                ],
                'templateRegistryVersion' => $this->documentVersion($registry),
                'templateRegistryChecksum' => $this->etag($registry),
                'complianceMatrixVersion' => (string)($matrix['version'] ?? ''),
                'complianceMatrixRef' => 'mom/data/registry/graphics-governance-registry.json#/moduleGraphicsCompliance',
                'impactAnalysisRef' => 'mom/data/graphics-governance/state.json#/pendingImpact',
                'waiversRef' => 'mom/data/graphics-governance/waivers.json#/waivers',
                'changeSetRef' => 'mom/data/registry/graphics-governance-registry.json#/changeSetModel',
                'lineageGraphRef' => 'mom/data/registry/graphics-governance-registry.json#/moduleGraphicsLineageGraph',
                'runtimeBeaconRef' => 'mom/data/registry/graphics-governance-registry.json#/runtimeGraphicsComplianceBeacon',
                'debtObservatoryRef' => 'mom/data/registry/graphics-governance-registry.json#/visualDebtObservatory',
                'environmentPolicyPacksRef' => 'mom/data/registry/graphics-governance-registry.json#/environmentPolicyPacks',
                'releaseDashboardRef' => 'mom/data/registry/graphics-governance-registry.json#/graphicsReleaseDashboard',
                'releaseEvidencePackRef' => 'mom/data/registry/graphics-governance-registry.json#/graphicsReleaseEvidencePack',
                'multiSitePlantBrandingGovernanceRef' => 'mom/data/registry/graphics-governance-registry.json#/multiSitePlantBrandingGovernance',
                'controlledEmergencyOverridePathRef' => 'mom/data/registry/graphics-governance-registry.json#/controlledEmergencyOverridePath',
                'rolloutDecisionRef' => 'mom/data/graphics-governance/rollouts.json#/rollouts',
                'rollbackPlanRef' => 'mom/data/graphics-governance/snapshots/bootstrap-rollback-plan.json',
                'releaseBlocked' => (bool)($blockers['summary']['releaseBlocked'] ?? false),
                'releaseReadinessState' => (bool)($blockers['summary']['releaseBlocked'] ?? false) ? 'blocked-by-graphics-governance' : 'ready',
                'blockerCount' => (int)($blockers['summary']['blockerCount'] ?? 0),
                'releaseBlockerCount' => (int)($blockers['summary']['blockerCount'] ?? 0),
                'runtimeBeaconSummary' => (array)($runtimeBeacon['runtimeBeacon']['summary'] ?? []),
                'debtSummary' => (array)($observatory['observatory']['summary'] ?? []),
                'driftReportGeneratedAt' => (string)($drift['generatedAt'] ?? ''),
                'evidenceBundleRequirements' => [
                    'affectedModulesSnapshot',
                    'complianceMatrixSnapshot',
                    'debtDriftSnapshot',
                    'runtimeBeaconSnapshot',
                    'rolloutDecision',
                    'rollbackPlan',
                    'waiverRegisterSnapshot',
                ],
                'generatedAt' => gmdate('c'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function graphicsReleaseEvidencePack(): array
    {
        $link = $this->graphicsReleaseLink()['releaseLink'];
        $dashboard = $this->graphicsReleaseDashboard()['releaseDashboard'];
        $blockers = $this->releaseBlockers();
        return [
            'evidencePack' => [
                'evidencePackId' => 'graphics-release-evidence-current',
                'authority' => 'backend_graphics_release_evidence_pack',
                'status' => (bool)($blockers['summary']['releaseBlocked'] ?? false) ? 'blocked' : 'ready',
                'changeSetRef' => 'mom/data/registry/graphics-governance-registry.json#/changeSetModel',
                'impactReportRef' => (string)($link['impactAnalysisRef'] ?? 'mom/data/graphics-governance/state.json#/pendingImpact'),
                'complianceMatrixSnapshotRef' => (string)($link['complianceMatrixRef'] ?? 'mom/data/registry/graphics-governance-registry.json#/moduleGraphicsCompliance'),
                'driftReportRef' => 'mom/data/registry/graphics-governance-registry.json#/graphicsDriftReport',
                'runtimeLinkageProofRef' => (string)($link['runtimeBeaconRef'] ?? 'mom/data/registry/graphics-governance-registry.json#/runtimeGraphicsComplianceBeacon'),
                'debtObservatoryRef' => (string)($link['debtObservatoryRef'] ?? 'mom/data/registry/graphics-governance-registry.json#/visualDebtObservatory'),
                'rolloutDecisionRef' => (string)($link['rolloutDecisionRef'] ?? 'mom/data/graphics-governance/rollouts.json#/rollouts'),
                'rollbackPackageRef' => (string)($link['rollbackPlanRef'] ?? 'mom/data/graphics-governance/snapshots/bootstrap-rollback-plan.json'),
                'waiverRefs' => (string)($link['waiversRef'] ?? 'mom/data/graphics-governance/waivers.json#/waivers'),
                'releaseBlockersStatus' => (string)($dashboard['readiness'] ?? ((bool)($blockers['summary']['releaseBlocked'] ?? false) ? 'blocked' : 'ready')),
                'releaseBlockers' => $blockers,
                'requiredArtifacts' => (array)($link['evidenceBundleRequirements'] ?? []),
                'generatedAt' => gmdate('c'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizedTemplateRegistry(): array
    {
        return $this->normalizeRegistryAuthorityFields($this->repo->readTemplateRegistry());
    }

    /**
     * @param array<string, mixed> $registry
     * @return array<string, mixed>
     */
    private function normalizeRegistryAuthorityFields(array $registry): array
    {
        if (!isset($registry['_meta']) || !is_array($registry['_meta'])) {
            $registry['_meta'] = [];
        }
        if (!isset($registry['templates']) || !is_array($registry['templates'])) {
            $registry['templates'] = [];
        }
        $registryMeta = is_array($registry['_meta'] ?? null) ? (array)$registry['_meta'] : [];
        foreach ((array)$registry['templates'] as $index => $template) {
            if (is_array($template)) {
                $registry['templates'][$index] = $this->normalizeTemplateAuthorityFields($template, $registryMeta);
            }
        }
        return $registry;
    }

    /**
     * @param array<string, mixed> $template
     * @return array<string, mixed>
     */
    private function normalizeTemplateAuthorityFields(array $template, array $registryMeta = []): array
    {
        $templateId = (string)($template['templateId'] ?? '');
        $sourceStatus = (string)($template['status'] ?? '');
        $canonicalStatus = $this->canonicalTemplateGovernanceStatus($sourceStatus);
        if ($sourceStatus !== '' && $canonicalStatus !== $sourceStatus && !isset($template['registryStatus'])) {
            $template['registryStatus'] = $sourceStatus;
        }
        $template['status'] = $canonicalStatus;
        $allowedZones = array_values(array_filter(array_map(
            static fn($zone): string => is_array($zone) ? (string)($zone['zoneId'] ?? $zone['name'] ?? '') : (string)$zone,
            (array)($template['zones'] ?? $template['allowedZones'] ?? [])
        )));
        if (!isset($template['allowedZones']) || !is_array($template['allowedZones']) || $template['allowedZones'] === []) {
            $template['allowedZones'] = $allowedZones;
        }

        $allowedBlocks = [];
        foreach ((array)($template['allowedBlocksByZone'] ?? []) as $blocks) {
            foreach ((array)$blocks as $blockType) {
                $blockType = trim((string)$blockType);
                if ($blockType !== '') {
                    $allowedBlocks[$blockType] = true;
                }
            }
        }
        if (!isset($template['allowedBlocks']) || $template['allowedBlocks'] === []) {
            $template['allowedBlocks'] = array_keys($allowedBlocks);
        }

        $governedModules = array_values(array_filter(array_map('strval', (array)($template['governedModules'] ?? []))));
        if (is_array($template['adoption'] ?? null)) {
            $governedModules = array_merge($governedModules, array_values(array_map('strval', (array)($template['adoption']['modules'] ?? []))));
        }
        $moduleRows = $this->modulesUsingTemplateRows($templateId);
        $governedModules = array_values(array_unique(array_filter(array_merge(
            $governedModules,
            array_map(static fn(array $row): string => (string)($row['moduleId'] ?? ''), $moduleRows)
        ))));
        $template['governedModules'] = $governedModules;

        $regulated = array_filter($moduleRows, static fn(array $row): bool => (bool)($row['regulated'] ?? false));
        $shopfloor = array_filter($moduleRows, static fn(array $row): bool => (bool)($row['shopfloor'] ?? false));
        if (trim((string)($template['regulatedCompatibility'] ?? '')) === '') {
            $template['regulatedCompatibility'] = $regulated !== [] ? 'explicit-required' : 'not-regulated';
        }
        if (trim((string)($template['shopfloorCompatibility'] ?? '')) === '') {
            $template['shopfloorCompatibility'] = $shopfloor !== [] ? 'explicit-required' : 'standard-compatible';
        }

        $meta = is_array($template['_meta'] ?? null) ? (array)$template['_meta'] : [];
        $template['updatedBy'] = (string)($template['updatedBy'] ?? $meta['updatedBy'] ?? $registryMeta['updatedBy'] ?? $template['owner'] ?? 'Frontend Architecture Council');
        $template['updatedAt'] = (string)($template['updatedAt'] ?? $meta['updatedAt'] ?? $registryMeta['updatedAt'] ?? $registryMeta['generatedAt'] ?? gmdate('c'));
        if (!isset($template['evidenceRefs']) || !is_array($template['evidenceRefs'])) {
            $refs = [];
            foreach (['gateRef', 'validator', 'lastReviewedAt'] as $key) {
                if (isset($template['qaEvidence'][$key]) && is_scalar($template['qaEvidence'][$key])) {
                    $refs[] = (string)$template['qaEvidence'][$key];
                }
            }
            foreach ((array)($template['releaseManifestRefs'] ?? []) as $ref) {
                $refs[] = is_array($ref) ? (string)($ref['refId'] ?? $ref['uri'] ?? '') : (string)$ref;
            }
            $template['evidenceRefs'] = array_values(array_unique(array_filter($refs)));
        }

        return $template;
    }

    private function canonicalTemplateGovernanceStatus(string $status): string
    {
        $normalized = strtolower(trim(str_replace('_', '-', $status)));
        return match ($normalized) {
            'approved', 'live' => 'published',
            'draft' => 'controlled-draft',
            'blocked' => 'publish-blocked',
            'legacy' => 'legacy-bridged',
            'retired' => 'deprecated',
            'draft-only',
            'controlled-draft',
            'validated',
            'publish-blocked',
            'published',
            'deprecated',
            'legacy-bridged' => $normalized,
            default => 'legacy-bridged',
        };
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
     * @param array<string, mixed> $registry
     * @param array<string, mixed> $template
     */
    private function assertTemplateIdentityAvailable(array $registry, array $template, bool $allowSameTemplateId): void
    {
        $templateId = trim((string)($template['templateId'] ?? ''));
        $keys = $this->templateIdentityKeys($template);
        foreach ((array)($registry['templates'] ?? []) as $existing) {
            if (!is_array($existing)) {
                continue;
            }
            $existingTemplateId = trim((string)($existing['templateId'] ?? ''));
            if ($allowSameTemplateId && $existingTemplateId !== '' && $existingTemplateId === $templateId) {
                continue;
            }
            $collisions = array_values(array_intersect($keys, $this->templateIdentityKeys($existing)));
            if ($collisions !== []) {
                throw new GraphicsGovernanceException(409, 'duplicate_template_identity', 'Template identity collides with an existing registry entry', [
                    ['field' => 'templateId', 'message' => 'Duplicate template id, alias, canonicalId, or legacyCode: ' . implode(', ', $collisions), 'code' => 'duplicate_template_identity'],
                ], ['existingTemplateId' => $existingTemplateId, 'collisions' => $collisions]);
            }
        }
    }

    /**
     * @param array<string, mixed> $template
     * @return array<int, string>
     */
    private function templateIdentityKeys(array $template): array
    {
        $keys = [
            (string)($template['templateId'] ?? ''),
            (string)($template['canonicalId'] ?? ''),
            (string)($template['legacyCode'] ?? ''),
        ];
        foreach ((array)($template['aliases'] ?? []) as $alias) {
            $keys[] = (string)$alias;
        }
        return array_values(array_unique(array_filter(array_map(
            static fn(string $key): string => trim($key),
            $keys
        ))));
    }

    /**
     * @param array<string, mixed> $registry
     * @param array<string, mixed> $template
     */
    private function assertTemplateVersionBump(array $registry, array $template): void
    {
        $templateId = trim((string)($template['templateId'] ?? ''));
        $index = $this->templateIndex($registry, $templateId);
        if ($index === null) {
            return;
        }
        $existing = (array)$registry['templates'][$index];
        if (!$this->isVersionGreater((string)($template['version'] ?? ''), (string)($existing['version'] ?? ''))) {
            throw new GraphicsGovernanceException(422, 'version_bump_required', 'Template draft version must be greater than the current published version', [
                ['field' => 'version', 'message' => 'Version must be greater than ' . (string)($existing['version'] ?? ''), 'code' => 'version_bump_required'],
            ]);
        }
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
            'allowedZones',
            'allowedBlocks',
            'allowedBlocksByZone',
            'governedModules',
            'regulatedCompatibility',
            'shopfloorCompatibility',
            'defaultDensity',
            'supportedDensities',
            'themePolicy',
            'responsivePolicy',
            'qaEvidence',
            'updatedBy',
            'updatedAt',
            'evidenceRefs',
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
        $moduleRows = [];
        foreach ($this->moduleRecords() as $record) {
            $moduleId = (string)($record['module']['moduleId'] ?? $record['packet']['moduleId'] ?? '');
            if ($moduleId !== '') {
                $moduleRows[$moduleId] = $record;
            }
            if (
                $templateId !== ''
                && (string)($record['module']['templateId'] ?? $record['packet']['templateId'] ?? '') === $templateId
            ) {
                $adoptionModules[] = $moduleId;
            }
        }
        $adoptionModules = array_values(array_unique(array_filter(array_map('strval', $adoptionModules))));
        foreach ($adoptionModules as $moduleId) {
            if ($moduleId !== '' && !isset($moduleRows[$moduleId])) {
                $errors[] = ['field' => 'adoption/modules', 'message' => 'Referenced module does not exist: ' . $moduleId, 'code' => 'module_not_found'];
            }
        }
        $regulatedAdoption = false;
        $shopfloorAdoption = false;
        foreach ($adoptionModules as $moduleId) {
            $record = $moduleRows[$moduleId] ?? null;
            if (!is_array($record)) {
                continue;
            }
            $packet = is_array($record['packet'] ?? null) ? (array)$record['packet'] : [];
            $regulatedAdoption = $regulatedAdoption || $this->isRegulatedPacket($packet);
            $shopfloorAdoption = $shopfloorAdoption || $this->isShopfloorPacket($packet);
        }
        if ($regulatedAdoption && !in_array('high-contrast', $themeModes, true)) {
            $errors[] = ['field' => 'themePolicy/modes', 'message' => 'Regulated template adoption requires high-contrast mode', 'code' => 'regulated_high_contrast_required'];
        }
        if ($shopfloorAdoption && !in_array('shopfloor', $supportedDensities, true)) {
            $errors[] = ['field' => 'supportedDensities', 'message' => 'Shopfloor template adoption requires shopfloor density', 'code' => 'shopfloor_density_required'];
        }
        if (($regulatedAdoption || $shopfloorAdoption) && !in_array((string)($template['qaEvidence']['status'] ?? ''), ['IMPLEMENTED', 'GATED'], true)) {
            $errors[] = ['field' => 'qaEvidence/status', 'message' => 'Regulated or shopfloor adoption requires implemented/gated QA evidence', 'code' => 'qa_evidence_required'];
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
        $seenIdentity = [];
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
            foreach ($this->templateIdentityKeys($template) as $identityKey) {
                if (isset($seenIdentity[$identityKey])) {
                    $errors[] = ['field' => 'templates/identity', 'message' => 'Duplicate template identity key: ' . $identityKey, 'code' => 'duplicate_template_identity'];
                }
                $seenIdentity[$identityKey] = true;
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
        $evidenceRefs = (array)($packet['qa']['evidenceRefs'] ?? []);
        $hasControlledGateEvidence = function (string $gate) use ($requiredNow, $evidenceRefs): bool {
            $ref = trim((string)($evidenceRefs[$gate] ?? ''));
            return in_array($gate, $requiredNow, true)
                && $ref !== ''
                && $this->repo->controlledArtifactExists($ref);
        };
        return [
            'requiredNow' => $requiredNow,
            'knownOpen' => array_values(array_map('strval', (array)($packet['qa']['knownOpen'] ?? []))),
            'evidenceRefs' => $evidenceRefs,
            'auditReady' => $hasControlledGateEvidence('G14') || $this->isRegulatedPacket($packet) === false,
            'shopfloorReady' => $hasControlledGateEvidence('G07') || $hasControlledGateEvidence('G08') || $this->isShopfloorPacket($packet) === false,
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
     */
    private function moduleUsesPrivateCssShell(string $moduleId, array $module, array $packet): bool
    {
        if (($module['usesPrivateCssShell'] ?? false) === true || ($packet['usesPrivateCssShell'] ?? false) === true) {
            return true;
        }
        $declared = strtolower(json_encode([
            $module['graphicsLinkageStatus'] ?? '',
            $packet['graphicsLinkageStatus'] ?? '',
            $module['visualShell'] ?? '',
            $packet['visualShell'] ?? '',
        ]) ?: '');
        if (str_contains($declared, 'private-css') || str_contains($declared, 'legacy-private')) {
            return true;
        }
        foreach ($this->repo->listStyleAndPortalFiles() as $file) {
            $relative = strtolower($this->repo->relativePath($file));
            $needle = strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', $moduleId) ?: $moduleId);
            if ($needle !== '' && str_contains($relative, $needle) && preg_match('/(?:legacy|private|shell|module)/', $relative)) {
                return true;
            }
        }
        return false;
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
            'templateId' => (string)($module['templateId'] ?? $packet['templateId'] ?? ''),
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
        $affectedTemplates = $this->affectedTemplateIds($type, $subject, $affected);
        $severityClass = $this->severityForImpact($affected, $blockers);
        $requiredEvidence = $this->evidencePlanForSeverity($severityClass);
        $gatesToRerun = array_values(array_unique(array_filter($gates)));
        return [
            'impactId' => 'gia_' . gmdate('YmdHis') . '_' . substr($this->hash($type . json_encode($subject) . json_encode($affected)), 0, 8),
            'analysisType' => $type,
            'subject' => $subject,
            'affectedModules' => $affected,
            'affectedRoutes' => $affectedRoutes,
            'affectedScreens' => array_values(array_unique(array_filter($affectedScreens))),
            'affectedBlockFamilies' => array_values(array_unique(array_filter($blockFamilies))),
            'affectedTemplates' => $affectedTemplates,
            'regulatedModulesTouched' => array_values(array_unique(array_filter($regulated))),
            'shopfloorModulesTouched' => array_values(array_unique(array_filter($shopfloor))),
            'gatesToRerun' => $gatesToRerun,
            'blockers' => $blockers,
            'severityClass' => $severityClass,
            'requiredEvidence' => $requiredEvidence,
            'rerunPlan' => [
                'gates' => $gatesToRerun,
                'regulatedEvidenceRequired' => $regulated !== [],
                'shopfloorEvidenceRequired' => $shopfloor !== [],
                'screenshotDiffRequired' => in_array($severityClass, ['medium', 'high', 'regulated', 'shopfloor-critical'], true),
            ],
            'rolloutScopes' => $this->rolloutScopePlan([
                'severityClass' => $severityClass,
                'affectedModules' => $affected,
                'blockers' => $blockers,
            ]),
            'changeSetRef' => 'gcs_' . substr($this->hash($type . json_encode($subject) . gmdate('Ymd')), 0, 12),
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
        if ($kind === 'policy-pack' || $kind === 'environment-policy' || isset($input['policyPack']) || isset($input['environmentPolicyPack'])) {
            return $this->analyzePolicyPackImpact($input);
        }
        if ($kind === 'template' || isset($input['templateId'])) {
            return $this->analyzeTemplateImpact($input);
        }
        return $this->impactReport('rollout', ['scope' => (array)($input['scope'] ?? [])], []);
    }

    /**
     * @param array<int, array<string, mixed>> $affected
     * @return array<int, string>
     */
    private function affectedTemplateIds(string $type, array $subject, array $affected): array
    {
        $ids = [];
        if ($type === 'template' && trim((string)($subject['templateId'] ?? '')) !== '') {
            $ids[] = (string)$subject['templateId'];
        }
        foreach ($affected as $row) {
            if (trim((string)($row['templateId'] ?? '')) !== '') {
                $ids[] = (string)$row['templateId'];
            }
            $moduleId = (string)($row['moduleId'] ?? '');
            foreach ($this->moduleRecords() as $record) {
                $module = $record['module'];
                $packet = $record['packet'];
                if ($moduleId !== '' && (string)($module['moduleId'] ?? $packet['moduleId'] ?? '') === $moduleId) {
                    $templateId = (string)($module['templateId'] ?? $packet['templateId'] ?? '');
                    if ($templateId !== '') {
                        $ids[] = $templateId;
                    }
                }
            }
        }
        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * @param array<int, array<string, mixed>> $affected
     * @param array<int, array<string, mixed>> $blockers
     */
    private function severityForImpact(array $affected, array $blockers): string
    {
        $regulated = false;
        $shopfloor = false;
        foreach ($affected as $row) {
            $regulated = $regulated || (bool)($row['regulated'] ?? false);
            $shopfloor = $shopfloor || (bool)($row['shopfloor'] ?? false);
        }
        if ($shopfloor) {
            return 'shopfloor-critical';
        }
        if ($regulated) {
            return 'regulated';
        }
        if ($blockers !== [] || count($affected) >= 8) {
            return 'high';
        }
        if (count($affected) >= 3) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function evidencePlanForSeverity(string $severity): array
    {
        $base = [
            ['evidenceType' => 'impact-snapshot', 'required' => true, 'owner' => 'Frontend Platform'],
            ['evidenceType' => 'rollback-plan', 'required' => true, 'owner' => 'Release Engineering'],
        ];
        if (in_array($severity, ['medium', 'high', 'regulated', 'shopfloor-critical'], true)) {
            $base[] = ['evidenceType' => 'screenshot-diff', 'required' => true, 'owner' => 'UX QA'];
            $base[] = ['evidenceType' => 'keyboard-focus-proof', 'required' => true, 'owner' => 'Accessibility QA'];
        }
        if (in_array($severity, ['high', 'regulated', 'shopfloor-critical'], true)) {
            $base[] = ['evidenceType' => 'compliance-matrix-snapshot', 'required' => true, 'owner' => 'Design System Governance'];
            $base[] = ['evidenceType' => 'drift-report', 'required' => true, 'owner' => 'Runtime Governance'];
        }
        if ($severity === 'regulated') {
            $base[] = ['evidenceType' => 'audit-traceability-pack', 'required' => true, 'owner' => 'Quality Systems'];
        }
        if ($severity === 'shopfloor-critical') {
            $base[] = ['evidenceType' => 'shopfloor-kiosk-smoke', 'required' => true, 'owner' => 'MES Operations'];
            $base[] = ['evidenceType' => 'touch-target-proof', 'required' => true, 'owner' => 'UX QA'];
        }
        return $base;
    }

    /**
     * @param array<string, mixed> $impact
     * @return array<int, array<string, mixed>>
     */
    private function rolloutScopePlan(array $impact, ?string $selectedMode = null): array
    {
        $severity = (string)($impact['severityClass'] ?? 'low');
        $hasBlockers = (array)($impact['blockers'] ?? []) !== [];
        $scopeModes = [
            ['mode' => 'preview-only', 'allowed' => true, 'releaseCondition' => 'No production write; preview cache only.'],
            ['mode' => 'canary-module-group', 'allowed' => !$hasBlockers && in_array($severity, ['medium', 'high', 'regulated', 'shopfloor-critical'], true), 'releaseCondition' => 'Impact report and rollback plan attached.'],
            ['mode' => 'canary-domain', 'allowed' => !$hasBlockers && in_array($severity, ['high', 'regulated', 'shopfloor-critical'], true), 'releaseCondition' => 'Domain owner approval and evidence checklist complete.'],
            ['mode' => 'environment-stage', 'allowed' => !$hasBlockers, 'releaseCondition' => 'Environment policy pack selected and QA rerun plan complete.'],
            ['mode' => 'global-apply', 'allowed' => !$hasBlockers && $severity !== 'shopfloor-critical', 'releaseCondition' => 'No active release blockers and release manifest refs present.'],
        ];
        if ($selectedMode !== null) {
            foreach ($scopeModes as &$scope) {
                $scope['selected'] = (string)$scope['mode'] === $selectedMode;
            }
            unset($scope);
        }
        return $scopeModes;
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveEnvironmentPolicyPack(string $policyPack): array
    {
        $packs = (array)($this->environmentPolicyPacks()['policyPacks']['packs'] ?? []);
        foreach ($packs as $pack) {
            if (is_array($pack) && (string)($pack['environment'] ?? '') === $policyPack) {
                return $pack;
            }
        }
        throw new GraphicsGovernanceException(422, 'unknown_policy_pack', 'Unknown graphics environment policy pack: ' . $policyPack, [
            ['field' => 'policyPack', 'message' => 'Policy pack is not defined by backend graphics authority', 'code' => 'unknown_policy_pack'],
        ]);
    }

    /**
     * @param array<string, mixed> $impact
     * @return array<string, mixed>
     */
    private function blastRadiusEstimate(array $impact): array
    {
        $modules = (array)($impact['affectedModules'] ?? []);
        $regulated = (array)($impact['regulatedModulesTouched'] ?? []);
        $shopfloor = (array)($impact['shopfloorModulesTouched'] ?? []);
        $routes = (array)($impact['affectedRoutes'] ?? []);
        $screens = (array)($impact['affectedScreens'] ?? []);
        $families = (array)($impact['affectedBlockFamilies'] ?? []);
        $score = count($modules) * 10 + count($routes) * 4 + count($screens) * 2 + count($families);
        $score += count($regulated) * 20 + count($shopfloor) * 25 + count((array)($impact['blockers'] ?? [])) * 30;
        $class = 'low';
        if ($score >= 120 || $shopfloor !== []) {
            $class = 'shopfloor-critical';
        } elseif ($score >= 90 || $regulated !== []) {
            $class = 'regulated';
        } elseif ($score >= 60) {
            $class = 'high';
        } elseif ($score >= 30) {
            $class = 'medium';
        }
        return [
            'score' => $score,
            'class' => $class,
            'moduleCount' => count($modules),
            'routeCount' => count($routes),
            'screenCount' => count($screens),
            'blockFamilyCount' => count($families),
            'regulatedCount' => count($regulated),
            'shopfloorCount' => count($shopfloor),
            'releaseCondition' => $class === 'low'
                ? 'standard evidence'
                : 'impact snapshot, screenshot diff, compliance snapshot and rollback plan required',
        ];
    }

    /**
     * @param array<string, mixed> $scope
     * @param array<string, mixed> $releaseBlockers
     * @return array<int, array<string, mixed>>
     */
    private function activeReleaseBlockersForScope(array $scope, array $releaseBlockers): array
    {
        $active = array_values(array_filter(
            (array)($releaseBlockers['blockers'] ?? []),
            static fn($row): bool => is_array($row) && (string)($row['status'] ?? '') === 'active'
        ));
        $mode = (string)($scope['mode'] ?? '');
        if (!in_array($mode, ['canary-module-group', 'canary-domain'], true)) {
            return $active;
        }

        $targetModules = array_values(array_filter(array_map('strval', (array)($scope['modules'] ?? $scope['moduleIds'] ?? []))));
        $targetDomain = trim((string)($scope['domain'] ?? ''));
        if ($targetDomain !== '') {
            foreach ($this->moduleRecords() as $record) {
                $module = $record['module'];
                $packet = $record['packet'];
                if ((string)($packet['domain'] ?? $module['domain'] ?? '') === $targetDomain) {
                    $targetModules[] = (string)($module['moduleId'] ?? $packet['moduleId'] ?? '');
                }
            }
        }
        $targetModules = array_values(array_unique(array_filter($targetModules)));
        if ($targetModules === []) {
            return $active;
        }

        return array_values(array_filter($active, static function (array $blocker) use ($targetModules): bool {
            if ((string)($blocker['scope'] ?? '') !== 'module') {
                return true;
            }
            $target = (string)($blocker['targetId'] ?? $blocker['moduleId'] ?? '');
            return $target === '' || in_array($target, $targetModules, true);
        }));
    }

    /**
     * @param array<int, mixed> $waivers
     */
    private function releaseBlockerHasEligibleWaiver(array $waivers, string $targetId, string $blockerId, string $releaseGate, string $blockerScope): bool
    {
        foreach ($waivers as $waiver) {
            if (!is_array($waiver) || !$this->isReleaseWaiverEligible($waiver)) {
                continue;
            }
            if ($this->waiverCoversReleaseBlocker($waiver, $targetId, $blockerId, $releaseGate, $blockerScope)) {
                return true;
            }
        }
        return false;
    }

    private function isReleaseWaiverEligible(array $waiver): bool
    {
        if ((string)($waiver['status'] ?? '') !== 'approved') {
            return false;
        }
        if (!in_array((string)($waiver['riskClass'] ?? ''), ['high', 'regulated', 'shopfloor-critical'], true)) {
            return false;
        }
        if (trim((string)($waiver['compensatingControl'] ?? '')) === '') {
            return false;
        }
        if (trim((string)($waiver['approver'] ?? '')) === '' || trim((string)($waiver['approvedBy'] ?? '')) === '') {
            return false;
        }
        if (trim((string)($waiver['createdBy'] ?? '')) === '' || trim((string)($waiver['approvedAt'] ?? '')) === '') {
            return false;
        }
        if (strcasecmp((string)($waiver['createdBy'] ?? ''), (string)($waiver['approvedBy'] ?? '')) === 0) {
            return false;
        }
        if ((array)($waiver['documentControlRefs'] ?? []) === []) {
            return false;
        }
        return $this->normalizeReleaseManifestRefs((array)($waiver['releaseManifestRefs'] ?? [])) !== [];
    }

    private function waiverCoversReleaseBlocker(array $waiver, string $targetId, string $blockerId, string $releaseGate, string $blockerScope): bool
    {
        $waiverTarget = (string)($waiver['targetId'] ?? '');
        $scope = (string)($waiver['scope'] ?? '');
        if (in_array($waiverTarget, ['graphics-governance', $releaseGate], true)) {
            return $scope === 'release_gate';
        }
        if ($waiverTarget === $blockerId) {
            return $scope === 'release_gate';
        }
        if ($waiverTarget !== $targetId) {
            return false;
        }
        return match ($blockerScope) {
            'module' => $scope === 'module',
            'template' => $scope === 'template',
            'component' => $scope === 'component',
            'tokens', 'token' => $scope === 'token',
            default => $scope === 'release_gate',
        };
    }

    /**
     * @param array<string, mixed> $impact
     */
    private function assertNoActiveReleaseBlockersForPublish(string $templateId, array $impact): void
    {
        $releaseBlockers = $this->releaseBlockers();
        $active = array_values(array_filter(
            (array)($releaseBlockers['blockers'] ?? []),
            static fn($row): bool => is_array($row) && (string)($row['status'] ?? '') === 'active'
        ));
        if ($active === []) {
            return;
        }
        throw new GraphicsGovernanceException(422, 'release_blockers_active', 'Publish cannot proceed while graphics release blockers remain active', [], [
            'templateId' => $templateId,
            'impactId' => (string)($impact['impactId'] ?? ''),
            'releaseBlockers' => $active,
        ]);
    }

    /**
     * @param array<int, string> $waiverIds
     * @param array<string, mixed> $impact
     * @return array<int, string>
     */
    private function assertApprovedWaiverRefsForPublish(array $waiverIds, string $templateId, array $impact): array
    {
        $waiverIds = array_values(array_unique(array_filter($waiverIds)));
        if ($waiverIds === []) {
            return [];
        }

        $approved = [];
        foreach ((array)($this->activeWaivers()['waivers'] ?? []) as $waiver) {
            if (is_array($waiver)) {
                $approved[(string)($waiver['waiverId'] ?? '')] = $waiver;
            }
        }

        $allowedTargets = [
            $templateId,
            (string)($impact['impactId'] ?? ''),
            'graphics-governance',
            'G19-graphics-governance',
        ];
        foreach ((array)($impact['affectedModules'] ?? []) as $module) {
            if (is_array($module)) {
                $allowedTargets[] = (string)($module['moduleId'] ?? '');
            }
        }
        foreach ((array)($impact['blockers'] ?? []) as $blocker) {
            if (is_array($blocker)) {
                $allowedTargets[] = (string)($blocker['moduleId'] ?? '');
                $allowedTargets[] = (string)($blocker['code'] ?? '');
            }
        }
        $releaseBlockers = (array)($this->releaseBlockers()['blockers'] ?? []);
        foreach ($releaseBlockers as $blocker) {
            if (is_array($blocker)) {
                $allowedTargets[] = (string)($blocker['blockerId'] ?? '');
                $allowedTargets[] = (string)($blocker['targetId'] ?? '');
                $allowedTargets[] = (string)($blocker['releaseGate'] ?? '');
            }
        }
        $allowedTargets = array_values(array_unique(array_filter($allowedTargets)));

        foreach ($waiverIds as $waiverId) {
            $waiver = $approved[$waiverId] ?? null;
            if (!is_array($waiver)) {
                throw new GraphicsGovernanceException(422, 'waiver_not_approved', 'Publish waiver must exist, be approved, and be unexpired: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Unknown, draft, expired, or unapproved waiver: ' . $waiverId, 'code' => 'waiver_not_approved'],
                ]);
            }
            if (!$this->isReleaseWaiverEligible($waiver)) {
                throw new GraphicsGovernanceException(422, 'waiver_not_release_eligible', 'Publish waiver lacks release-grade evidence or separation of duties: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Waiver must be high/regulated/shopfloor-critical, approved by a separate approver, and carry document/release refs', 'code' => 'waiver_not_release_eligible'],
                ]);
            }
            $riskClass = (string)($waiver['riskClass'] ?? '');
            if (!in_array($riskClass, ['high', 'regulated', 'shopfloor-critical'], true)) {
                throw new GraphicsGovernanceException(422, 'waiver_risk_class_insufficient', 'Publish blocker waivers must be high, regulated, or shopfloor-critical risk class: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Waiver riskClass is insufficient for publish/release blocker scope', 'code' => 'waiver_risk_class_insufficient'],
                ]);
            }
            if (trim((string)($waiver['compensatingControl'] ?? '')) === '') {
                throw new GraphicsGovernanceException(422, 'compensating_control_required', 'Publish waiver requires compensatingControl: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Approved waiver lacks compensatingControl', 'code' => 'compensating_control_required'],
                ]);
            }
            if (trim((string)($waiver['approver'] ?? '')) === '' || trim((string)($waiver['approvedBy'] ?? '')) === '') {
                throw new GraphicsGovernanceException(422, 'waiver_approval_evidence_required', 'Publish waiver requires named approver and approvedBy evidence: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Approved waiver lacks approver or approvedBy', 'code' => 'waiver_approval_evidence_required'],
                ]);
            }
            if (strcasecmp((string)($waiver['createdBy'] ?? ''), (string)($waiver['approvedBy'] ?? '')) === 0) {
                throw new GraphicsGovernanceException(422, 'waiver_separation_of_duties_required', 'Publish waiver creator and approver must be different: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Waiver violates creator/approver separation of duties', 'code' => 'waiver_separation_of_duties_required'],
                ]);
            }
            if ((array)($waiver['documentControlRefs'] ?? []) === []) {
                throw new GraphicsGovernanceException(422, 'document_control_ref_required', 'Publish waiver requires documentControlRefs: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Approved waiver lacks documentControlRefs', 'code' => 'document_control_ref_required'],
                ]);
            }
            if ($this->normalizeReleaseManifestRefs((array)($waiver['releaseManifestRefs'] ?? [])) === []) {
                throw new GraphicsGovernanceException(422, 'release_manifest_required', 'Publish waiver requires releaseManifestRefs: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Approved waiver lacks releaseManifestRefs', 'code' => 'release_manifest_required'],
                ]);
            }
            $targetId = (string)($waiver['targetId'] ?? '');
            if (in_array($targetId, ['graphics-governance', 'G19-graphics-governance'], true) && (string)($waiver['scope'] ?? '') !== 'release_gate') {
                throw new GraphicsGovernanceException(422, 'waiver_scope_mismatch', 'Graphics release-gate waiver must use release_gate scope: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Graphics release-gate waiver scope mismatch', 'code' => 'waiver_scope_mismatch'],
                ]);
            }
            if (!in_array($targetId, $allowedTargets, true)) {
                throw new GraphicsGovernanceException(422, 'waiver_scope_mismatch', 'Approved waiver does not cover this template publish scope: ' . $waiverId, [
                    ['field' => 'waiverIds', 'message' => 'Waiver targetId ' . $targetId . ' does not cover template, impact, module, blocker, or release gate scope', 'code' => 'waiver_scope_mismatch'],
                ]);
            }
        }

        return $waiverIds;
    }

    /**
     * @param array<string, mixed> $rollout
     * @param array<string, mixed> $input
     */
    private function assertPostCanaryVerification(array $rollout, array $input): void
    {
        $verification = is_array($input['postCanaryVerification'] ?? null)
            ? (array)$input['postCanaryVerification']
            : [];

        $missing = [];
        $runtimeBeaconRef = trim((string)($verification['runtimeBeaconRef'] ?? ''));
        $driftReportRef = trim((string)($verification['driftReportRef'] ?? ''));
        $moduleOwnerSignoffRef = trim((string)($verification['moduleOwnerSignoffRef'] ?? ''));
        if ($runtimeBeaconRef === '') {
            $missing[] = 'runtimeBeaconRef';
        }
        if ($driftReportRef === '') {
            $missing[] = 'driftReportRef';
        }
        if ($moduleOwnerSignoffRef === '') {
            $missing[] = 'moduleOwnerSignoffRef';
        }
        $manifestRefs = $this->normalizeReleaseManifestRefs((array)($verification['releaseManifestRefs'] ?? []));
        if ($manifestRefs === []) {
            $missing[] = 'releaseManifestRefs';
        }
        if ($missing !== []) {
            throw new GraphicsGovernanceException(422, 'post_canary_verification_required', 'Global apply after canary requires post-canary verification evidence', array_map(
                static fn(string $field): array => ['field' => 'postCanaryVerification.' . $field, 'message' => 'Required before global apply after canary', 'code' => 'post_canary_verification_required'],
                $missing
            ), [
                'rolloutId' => (string)($rollout['rolloutId'] ?? ''),
                'postCanaryVerification' => (array)($rollout['postCanaryVerification'] ?? []),
            ]);
        }
        $this->assertControlledEvidenceRef('runtimeBeaconRef', $runtimeBeaconRef);
        $this->assertControlledEvidenceRef('driftReportRef', $driftReportRef);
        $this->assertControlledEvidenceRef('moduleOwnerSignoffRef', $moduleOwnerSignoffRef);
        $this->assertControlledReleaseRefList('postCanaryVerification.releaseManifestRefs', $manifestRefs);
    }

    private function assertControlledEvidenceRef(string $field, string $ref): void
    {
        if ($this->repo->controlledArtifactExists($ref)) {
            return;
        }
        throw new GraphicsGovernanceException(422, 'controlled_evidence_artifact_required', 'Evidence ref must resolve to an existing controlled graphics/release artifact', [
            ['field' => 'postCanaryVerification.' . $field, 'message' => 'Use an existing controlled evidence artifact, not an ad hoc string or boolean', 'code' => 'controlled_evidence_artifact_required'],
        ], ['ref' => $ref]);
    }

    /**
     * @param array<int, string> $refs
     */
    private function assertControlledEvidenceRefList(string $field, array $refs): void
    {
        foreach ($refs as $idx => $ref) {
            $ref = trim((string)$ref);
            if ($ref === '') {
                continue;
            }
            if ($this->repo->controlledArtifactExists($ref)) {
                continue;
            }
            throw new GraphicsGovernanceException(422, 'controlled_evidence_artifact_required', 'Evidence ref must resolve to an existing controlled graphics/release artifact', [
                ['field' => $field . '/' . $idx, 'message' => 'Use an existing controlled evidence artifact, not an ad hoc string or boolean', 'code' => 'controlled_evidence_artifact_required'],
            ], ['ref' => $ref]);
        }
    }

    /**
     * @param array<int, array<string, string>> $refs
     */
    private function assertControlledReleaseRefList(string $field, array $refs): void
    {
        foreach ($refs as $idx => $ref) {
            $candidate = trim((string)($ref['uri'] ?? ''));
            if ($candidate === '') {
                $candidate = trim((string)($ref['refId'] ?? ''));
            }
            if ($candidate !== '' && $this->repo->controlledArtifactExists($candidate)) {
                continue;
            }
            throw new GraphicsGovernanceException(422, 'controlled_release_artifact_required', 'Release/evidence ref must resolve to an existing controlled graphics/release artifact', [
                ['field' => $field . '/' . $idx, 'message' => 'Use an existing controlled release artifact URI/refId', 'code' => 'controlled_release_artifact_required'],
            ], ['ref' => $candidate]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function multiSitePlantBrandingGovernance(): array
    {
        return [
            'authority' => 'backend_graphics_policy_pack',
            'levels' => ['enterprise', 'site', 'plant', 'area', 'line', 'cell'],
            'allowedOverrideTypes' => ['logoLockup', 'locale', 'shiftPalette', 'contrastPack', 'densityPack'],
            'prohibitedOverrideTypes' => ['semanticStatusColor', 'auditEvidenceColor', 'safetyMeaning', 'componentContractBypass'],
            'requiredFields' => ['siteId', 'plantId', 'policyPack', 'owner', 'approver', 'effectiveFrom', 'expiresAt', 'evidenceRefs'],
            'releaseRule' => 'Plant branding may change identity and environment tokens only; semantic status and shared component contracts remain global authority.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function controlledEmergencyOverridePath(): array
    {
        return [
            'status' => 'exception-only',
            'authority' => 'graphics_governance_waiver_register',
            'requiredFields' => ['overrideId', 'scope', 'reason', 'owner', 'approver', 'expiresAt', 'rollbackPlanRef', 'retrospectiveDueAt'],
            'allowedUse' => ['temporary accessibility rescue', 'production readability emergency', 'critical release-blocker workaround with approved waiver'],
            'prohibitedUse' => ['new design preference', 'semantic status color change', 'regulated/shopfloor critical waiver without documentControlRefs and releaseManifestRefs'],
            'maxDurationDays' => 14,
            'releaseCondition' => 'Emergency override requires approved waiver, expiry, evidence refs, post-incident retrospective and migration path back to shared tokens/components.',
        ];
    }

    /**
     * @param array<string, mixed> $observatory
     * @param array<string, mixed> $blockers
     * @return array<string, mixed>
     */
    private function graphicsReleaseTrendDashboard(array $observatory, array $blockers): array
    {
        $byModule = (array)($observatory['byModule'] ?? []);
        $totalDebt = array_sum(array_map(static fn($row): int => is_array($row) ? (int)($row['debtScore'] ?? 0) : 0, $byModule));
        $activeBlockerCount = (int)($blockers['summary']['blockerCount'] ?? 0);
        return [
            'currentDebtScore' => $totalDebt,
            'activeBlockerCount' => $activeBlockerCount,
            'trendWindow' => 'current-release',
            'signals' => [
                'blockedModules' => array_values(array_map(
                    static fn($row): string => (string)($row['moduleId'] ?? ''),
                    array_filter($byModule, static fn($row): bool => is_array($row) && (string)($row['linkageStatus'] ?? '') === 'blocked')
                )),
                'topDebtModules' => array_slice($byModule, 0, 5),
            ],
            'releaseReadinessTrend' => $activeBlockerCount === 0 ? 'improving-or-ready' : 'blocked-until-evidence-or-waiver',
            'nextReview' => gmdate('c', time() + 7 * 86400),
        ];
    }

    /**
     * @param array<string, mixed> $template
     * @return array<string, mixed>
     */
    private function templateLineage(array $template): array
    {
        return [
            'templateId' => (string)($template['templateId'] ?? ''),
            'version' => (string)($template['version'] ?? ''),
            'parentTemplateId' => (string)($template['parentTemplateId'] ?? $template['_clonedFrom']['templateId'] ?? ''),
            'supersedesVersion' => (string)($template['supersedesVersion'] ?? ''),
            'deprecationWindow' => (array)($template['deprecationWindow'] ?? []),
            'migrationPlanRequired' => in_array((string)($template['status'] ?? ''), ['deprecated', 'retired'], true),
            'migrationPlanRefs' => array_values(array_map('strval', (array)($template['migrationPlanRefs'] ?? []))),
        ];
    }

    /**
     * @param array<string, mixed> $bridge
     * @param array<string, mixed> $private
     * @param array<string, mixed> $coverage
     * @param array<string, mixed> $matrix
     * @return array<string, mixed>
     */
    private function buildVisualDebtObservatory(array $bridge, array $private, array $coverage, array $matrix): array
    {
        $byModule = [];
        $byDomain = [];
        $byTeam = [];
        $byRoute = [];
        foreach ((array)($matrix['matrix'] ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $moduleId = (string)($row['moduleId'] ?? '');
            $domain = (string)($row['domain'] ?? 'unclassified');
            $team = (string)($row['ownerTeam'] ?? 'Frontend Platform');
            $route = (string)($row['route'] ?? '');
            $score = (int)($row['bridgeAliasDebt'] ?? 0)
                + (int)($row['privateCssDebt'] ?? 0) * 10
                + (int)($row['hardcodedStyleDebt'] ?? 0) * 5
                + ((string)($row['linkageStatus'] ?? '') === 'blocked' ? 25 : 0);
            $entry = [
                'moduleId' => $moduleId,
                'route' => $route,
                'domain' => $domain,
                'ownerTeam' => $team,
                'linkageStatus' => (string)($row['linkageStatus'] ?? 'blocked'),
                'bridgeAliasDebt' => (int)($row['bridgeAliasDebt'] ?? 0),
                'privateCssDebt' => (int)($row['privateCssDebt'] ?? 0),
                'hardcodedStyleDebt' => (int)($row['hardcodedStyleDebt'] ?? 0),
                'uncontrolledLegacyShellDebt' => (string)($row['linkageStatus'] ?? '') === 'legacy-private-css' ? 1 : 0,
                'debtScore' => $score,
            ];
            $byModule[] = $entry;
            $this->accumulateDebt($byDomain, $domain, $score);
            $this->accumulateDebt($byTeam, $team, $score);
            $this->accumulateDebt($byRoute, $route !== '' ? $route : $moduleId, $score);
        }
        usort($byModule, static fn(array $a, array $b): int => ((int)$b['debtScore']) <=> ((int)$a['debtScore']));
        return [
            'byModule' => $byModule,
            'byDomain' => array_values($byDomain),
            'byTeam' => array_values($byTeam),
            'byRoute' => array_values($byRoute),
            'globalSignals' => [
                'bridgeAliasDebtCount' => (int)($bridge['summary']['debtCount'] ?? 0),
                'privateCssDebtScore' => (int)($private['summary']['totalDebtScore'] ?? 0),
                'tokenCoveragePercent' => (int)($coverage['coverage']['coveragePercent'] ?? 0),
            ],
            'summary' => [
                'moduleDebtCount' => count(array_filter($byModule, static fn(array $row): bool => (int)$row['debtScore'] > 0)),
                'uncontrolledLegacyShellDebt' => array_sum(array_map(static fn(array $row): int => (int)$row['uncontrolledLegacyShellDebt'], $byModule)),
            ],
        ];
    }

    /**
     * @param array<string, array<string, mixed>> $bucket
     */
    private function accumulateDebt(array &$bucket, string $key, int $score): void
    {
        $key = $key !== '' ? $key : 'unclassified';
        if (!isset($bucket[$key])) {
            $bucket[$key] = ['key' => $key, 'debtScore' => 0, 'moduleCount' => 0];
        }
        $bucket[$key]['debtScore'] = (int)$bucket[$key]['debtScore'] + $score;
        $bucket[$key]['moduleCount'] = (int)$bucket[$key]['moduleCount'] + 1;
    }

    /**
     * @param array<string, mixed> $request
     * @param array<string, mixed> $currentImpact
     * @return array<string, mixed>
     */
    private function assertRecordedImpact(array $request, array $currentImpact): array
    {
        $impactId = trim((string)($request['impactAnalysisId'] ?? ''));
        if ($impactId === '') {
            throw new GraphicsGovernanceException(422, 'impact_analysis_required', 'Publish requires impactAnalysisId');
        }
        $state = $this->pruneExpiredImpacts($this->repo->readState());
        $entry = is_array($state['pendingImpact'][$impactId] ?? null) ? (array)$state['pendingImpact'][$impactId] : null;
        if ($entry === null || (string)($entry['status'] ?? '') !== 'pending') {
            throw new GraphicsGovernanceException(422, 'impact_analysis_unresolved', 'Publish requires a current backend-recorded impact analysis', [
                ['field' => 'impactAnalysisId', 'message' => 'Run backend impact analysis and use its impactId before publish', 'code' => 'impact_analysis_unresolved'],
            ], ['currentImpactId' => (string)($currentImpact['impactId'] ?? '')]);
        }
        $expiresAt = $this->parseTime((string)($entry['expiresAt'] ?? ''));
        if ($expiresAt === null || $expiresAt <= time()) {
            throw new GraphicsGovernanceException(422, 'impact_analysis_expired', 'Impact analysis has expired; rerun analysis before publish', [
                ['field' => 'impactAnalysisId', 'message' => 'Impact analysis expired', 'code' => 'impact_analysis_expired'],
            ]);
        }
        if ((string)($entry['signature'] ?? '') !== $this->impactSignature($currentImpact)) {
            throw new GraphicsGovernanceException(409, 'impact_analysis_stale', 'Impact analysis no longer matches the current registry/module state', [
                ['field' => 'impactAnalysisId', 'message' => 'Rerun impact analysis after registry or module changes', 'code' => 'impact_analysis_stale'],
            ], ['currentImpactId' => (string)($currentImpact['impactId'] ?? '')]);
        }
        if ((bool)($entry['hasBlockers'] ?? false) && empty($request['blockersResolved'])) {
            throw new GraphicsGovernanceException(422, 'impact_blockers_unresolved', 'Recorded impact blockers must be explicitly resolved before publish', (array)($entry['report']['blockers'] ?? []));
        }
        return $entry;
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
        $releaseManifestRefs = $this->normalizeReleaseManifestRefs((array)($request['releaseManifestRefs'] ?? $request['releaseEvidence'] ?? []));
        if ($releaseManifestRefs === []) {
            throw new GraphicsGovernanceException(422, 'release_manifest_required', 'Publish requires releaseManifestRefs');
        }
        $this->assertControlledReleaseRefList('releaseManifestRefs', $releaseManifestRefs);
        $controlledGateRefs = [];
        foreach ($evidence as $key => $value) {
            if (is_array($value)) {
                $ref = trim((string)($value['ref'] ?? $value['refId'] ?? $value['uri'] ?? ''));
                if ($ref !== '') {
                    $controlledGateRefs[] = $ref;
                }
            } elseif (is_string($value) && str_contains($value, '/')) {
                $controlledGateRefs[] = $value;
            }
        }
        if ($controlledGateRefs !== []) {
            $this->assertControlledEvidenceRefList('gateEvidence', $controlledGateRefs);
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
        $currentStatus = (string)($waiver['status'] ?? 'draft');
        if ($status === 'approved' && $currentStatus === 'approved') {
            throw new GraphicsGovernanceException(409, 'waiver_already_approved', 'Waiver is already approved: ' . $waiverId);
        }
        if ($status === 'approved' && $currentStatus === 'expired') {
            throw new GraphicsGovernanceException(409, 'waiver_already_expired', 'Expired waivers cannot be approved: ' . $waiverId);
        }
        if ($status === 'expired' && $currentStatus === 'expired') {
            throw new GraphicsGovernanceException(409, 'waiver_already_expired', 'Waiver is already expired: ' . $waiverId);
        }
        if ($status === 'approved') {
            $expiresAt = $this->parseTime((string)($waiver['expiresAt'] ?? ''));
            if ($expiresAt === null || $expiresAt <= time()) {
                throw new GraphicsGovernanceException(422, 'waiver_expired', 'Expired waivers cannot be approved', [
                    ['field' => 'expiresAt', 'message' => 'Waiver expiry must be in the future', 'code' => 'waiver_expired'],
                ]);
            }
            if (trim((string)($waiver['compensatingControl'] ?? '')) === '') {
                throw new GraphicsGovernanceException(422, 'compensating_control_required', 'Waiver approval requires compensatingControl', [
                    ['field' => 'compensatingControl', 'message' => 'Required for waiver approval', 'code' => 'required'],
                ]);
            }
            if (trim((string)($waiver['approver'] ?? '')) === '') {
                throw new GraphicsGovernanceException(422, 'approver_required', 'Waiver approval requires a named approver', [
                    ['field' => 'approver', 'message' => 'Required for waiver approval', 'code' => 'required'],
                ]);
            }
            if (strcasecmp((string)$waiver['approver'], $username) !== 0) {
                throw new GraphicsGovernanceException(403, 'waiver_approver_mismatch', 'Only the named waiver approver can approve this waiver');
            }
            if (strcasecmp((string)($waiver['createdBy'] ?? ''), $username) === 0) {
                throw new GraphicsGovernanceException(403, 'waiver_separation_of_duties_required', 'Waiver creator cannot approve the same waiver');
            }
            if ($this->normalizeReleaseManifestRefs((array)($waiver['releaseManifestRefs'] ?? [])) === []) {
                throw new GraphicsGovernanceException(422, 'release_manifest_required', 'Waiver approval requires releaseManifestRefs', [
                    ['field' => 'releaseManifestRefs', 'message' => 'Required for waiver approval', 'code' => 'required'],
                ]);
            }
            $this->assertControlledReleaseRefList('releaseManifestRefs', $this->normalizeReleaseManifestRefs((array)($waiver['releaseManifestRefs'] ?? [])));
            $riskClass = (string)($waiver['riskClass'] ?? 'medium');
            if (in_array($riskClass, ['high', 'regulated', 'shopfloor-critical'], true)) {
                if ((array)($waiver['documentControlRefs'] ?? []) === []) {
                    throw new GraphicsGovernanceException(422, 'document_control_ref_required', 'High-risk waivers require documentControlRefs', [
                        ['field' => 'documentControlRefs', 'message' => 'Required for high, regulated, or shopfloor-critical waiver approval', 'code' => 'required'],
                    ]);
                }
            }
            $this->assertControlledEvidenceRefList('documentControlRefs', array_values(array_map('strval', (array)($waiver['documentControlRefs'] ?? []))));
        }
        $waiver['status'] = $status;
        $waiver[$status === 'approved' ? 'approvedAt' : 'expiredAt'] = gmdate('c');
        $waiver[$status === 'approved' ? 'approvedBy' : 'expiredBy'] = $username;
        if ($status === 'approved' && trim((string)($waiver['approver'] ?? '')) === '') {
            $waiver['approver'] = $username;
        }
        $doc['waivers'][$waiverId] = $waiver;
        $doc = $this->bumpLooseDocument($doc, $username);
        $this->repo->writeWaiversDocument($doc);
        return ['waiver' => $waiver, 'version' => $this->documentVersion($doc), 'etag' => $this->etag($doc)];
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function pruneExpiredImpacts(array $state): array
    {
        if (!isset($state['pendingImpact']) || !is_array($state['pendingImpact'])) {
            $state['pendingImpact'] = [];
        }
        foreach ($state['pendingImpact'] as $impactId => $entry) {
            if (!is_array($entry)) {
                unset($state['pendingImpact'][$impactId]);
                continue;
            }
            $expiresAt = $this->parseTime((string)($entry['expiresAt'] ?? ''));
            if ($expiresAt !== null && $expiresAt <= time()) {
                unset($state['pendingImpact'][$impactId]);
            }
        }
        if (!isset($state['publishedImpacts']) || !is_array($state['publishedImpacts'])) {
            $state['publishedImpacts'] = [];
        }
        return $state;
    }

    /**
     * @param array<string, mixed> $impact
     */
    private function impactSignature(array $impact): string
    {
        $stable = $impact;
        foreach (['impactId', 'generatedAt', 'recordedAt', 'recordedBy', 'expiresAt'] as $field) {
            unset($stable[$field]);
        }
        return $this->hash(json_encode($this->canonicalize($stable), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');
    }

    private function canonicalize(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        $out = [];
        foreach ($value as $key => $item) {
            $out[$key] = $this->canonicalize($item);
        }
        if (!array_is_list($out)) {
            ksort($out);
        }
        return $out;
    }

    private function parseTime(string $value): ?int
    {
        $timestamp = strtotime($value);
        return $timestamp === false ? null : $timestamp;
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
