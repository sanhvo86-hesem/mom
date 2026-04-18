<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use Throwable;

/**
 * DesignTokenCatalogService
 * ----------------------------------------------------------------------------
 * Backend authority for the Graphics Control Plane token catalog.
 *
 * Reads and writes through the unified DataLayer so the service honours the
 * 4-mode migration ladder (JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY →
 * POSTGRES_ONLY). In JSON_ONLY, the authority file remains
 *     mom/data/config/design-system-config.json
 * In SHADOW_WRITE every mutation is also written to graphics_token_value so the
 * DB seed stays warm. In POSTGRES_PRIMARY the DB is authoritative with the JSON
 * file as emergency fallback.
 *
 * Design taxonomy follows SAP Theme Designer / Microsoft Fluent / SLDS:
 *   global tokens   →  semantic (alias) tokens  →  component tokens
 *
 * Every mutation flows stage → simulate → commit → publish (SAP Save/Publish/
 * Activate with retain-previous rollback). This service is intentionally free
 * of UI concerns and does not emit toast/banner text — the Controller or
 * GraphicsGovernanceService layers handle user messaging.
 *
 * @package MOM\Api\Services
 * @since   3.1.0 (Graphics Control Plane rebuild — 2026-04-18)
 */
final class DesignTokenCatalogService
{
    private const DEFAULT_SCOPE_TYPE = 'organization';
    private const DEFAULT_SCOPE_ID   = 'default';

    /** Allowed color modes honoured by runtime + schema. */
    private const COLOR_MODES = [
        'light', 'dark', 'high-contrast', 'print', 'andon', 'maintenance-amber',
        'colorblind-deuteranopia', 'colorblind-protanopia', 'colorblind-tritanopia',
        'colorblind-achromatopsia',
    ];

    private DataLayer $data;
    private GraphicsGovernanceRepository $repo;

    public function __construct(DataLayer $data, GraphicsGovernanceRepository $repo)
    {
        $this->data = $data;
        $this->repo = $repo;
    }

    // ── Catalog reads ────────────────────────────────────────────────────────

    /**
     * List every token in the catalog with its metadata and effective defaults.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listCatalog(?string $layer = null, ?string $family = null, ?string $componentScope = null): array
    {
        if ($this->canReadFromDb()) {
            try {
                $sql = 'SELECT token_key, css_variable, layer, family, subfamily, component_scope,
                               value_type, unit, min_numeric, max_numeric, step_numeric, allowed_keywords,
                               default_light, default_dark, default_high_contrast, default_print,
                               alias_of, wcag_min_contrast, wcag_pair_token,
                               description, tags, is_deprecated
                          FROM graphics_token_catalog
                         WHERE ($1::text IS NULL OR layer = $1)
                           AND ($2::text IS NULL OR family = $2)
                           AND ($3::text IS NULL OR component_scope = $3 OR ($3::text IS NULL AND component_scope IS NULL))
                      ORDER BY layer, family, subfamily NULLS FIRST, token_key';
                $rows = $this->data->query($sql, [$layer, $family, $componentScope]) ?? [];
                if ($rows !== []) {
                    return array_map([$this, 'hydrateCatalogRow'], $rows);
                }
            } catch (Throwable $e) {
                // fall through to JSON-derived catalog
            }
        }

        return $this->deriveCatalogFromJson($layer, $family, $componentScope);
    }

    /**
     * Fetch a single token by key, returning a full definition or null.
     *
     * @return array<string, mixed>|null
     */
    public function getToken(string $tokenKey): ?array
    {
        if ($this->canReadFromDb()) {
            try {
                $row = $this->data->row(
                    'SELECT * FROM graphics_token_catalog WHERE token_key = $1 LIMIT 1',
                    [$tokenKey]
                );
                if (is_array($row) && $row !== []) {
                    return $this->hydrateCatalogRow($row);
                }
            } catch (Throwable $e) {
                // fall through
            }
        }

        foreach ($this->deriveCatalogFromJson(null, null, null) as $token) {
            if ($token['token_key'] === $tokenKey) {
                return $token;
            }
        }
        return null;
    }

    /**
     * Return the effective value of a token for a given scope + color mode.
     * Scope hierarchy (most-specific wins): user > role > environment > tenant > organization.
     * Color mode fallback chain: requested mode → light → default_light.
     *
     * @param array<string, string> $scope  e.g. ['user'=>'u123','role'=>'operator','tenant'=>'default']
     */
    public function getEffectiveValue(string $tokenKey, array $scope = [], string $colorMode = 'light'): ?string
    {
        $colorMode = $this->normalizeColorMode($colorMode);
        $scopeChain = $this->resolveScopeChain($scope);

        if ($this->canReadFromDb()) {
            try {
                foreach ($scopeChain as [$scopeType, $scopeId]) {
                    $row = $this->data->row(
                        'SELECT value FROM graphics_token_value
                          WHERE token_key = $1 AND scope_type = $2 AND scope_id = $3
                            AND color_mode = $4 AND is_published = TRUE
                          LIMIT 1',
                        [$tokenKey, $scopeType, $scopeId, $colorMode]
                    );
                    if (is_array($row) && $row !== [] && $row['value'] !== null) {
                        return (string)$row['value'];
                    }
                }
                // fallback: requested scope but light mode
                if ($colorMode !== 'light') {
                    return $this->getEffectiveValue($tokenKey, $scope, 'light');
                }
            } catch (Throwable $e) {
                // fall through
            }
        }

        return $this->readFromJsonPath($tokenKey);
    }

    /**
     * Snapshot the entire effective token map for a given scope + color mode.
     * Used by the runtime beacon so the frontend can cache the authoritative
     * set of tokens on load.
     *
     * @param array<string, string> $scope
     * @return array<string, string>
     */
    public function snapshotEffective(array $scope = [], string $colorMode = 'light'): array
    {
        $colorMode = $this->normalizeColorMode($colorMode);
        $result = [];

        if ($this->canReadFromDb()) {
            try {
                $scopeChain = $this->resolveScopeChain($scope);
                foreach (array_reverse($scopeChain) as [$scopeType, $scopeId]) {
                    $rows = $this->data->query(
                        'SELECT token_key, value FROM graphics_token_value
                          WHERE scope_type = $1 AND scope_id = $2
                            AND color_mode = $3 AND is_published = TRUE',
                        [$scopeType, $scopeId, $colorMode]
                    ) ?? [];
                    foreach ($rows as $row) {
                        $result[(string)$row['token_key']] = (string)$row['value'];
                    }
                }
                if ($result !== []) {
                    return $result;
                }
            } catch (Throwable $e) {
                // fall through
            }
        }

        // Fallback: walk JSON config
        $config = $this->repo->readDesignConfig();
        return $this->flattenJson($config);
    }

    // ── Mutations ────────────────────────────────────────────────────────────

    /**
     * Stage a value change on an open rollout draft. Does not publish.
     *
     * @return array{rollout_id:string, token_key:string, value:string, color_mode:string}
     */
    public function stageTokenChange(string $rolloutId, string $tokenKey, string $value, string $colorMode = 'light', array $scope = []): array
    {
        $colorMode = $this->normalizeColorMode($colorMode);
        [$scopeType, $scopeId] = $this->primaryScope($scope);

        if ($this->canWriteToDb()) {
            try {
                $this->data->execute(
                    'INSERT INTO graphics_token_value (token_key, scope_type, scope_id, color_mode, value, draft_value, is_published, rollout_id, version)
                          VALUES ($1,$2,$3,$4,$5,$5,FALSE,$6,1)
                     ON CONFLICT (token_key, scope_type, scope_id, color_mode) DO UPDATE
                            SET draft_value = EXCLUDED.draft_value,
                                rollout_id  = EXCLUDED.rollout_id,
                                updated_at  = NOW()',
                    [$tokenKey, $scopeType, $scopeId, $colorMode, $value, $rolloutId]
                );
            } catch (Throwable $e) {
                // best-effort; JSON-only runtime will use simulation trail instead
            }
        }

        return [
            'rollout_id' => $rolloutId,
            'token_key'  => $tokenKey,
            'value'      => $value,
            'color_mode' => $colorMode,
        ];
    }

    /**
     * Publish all staged changes of a rollout.
     *
     * @return int number of rows promoted
     */
    public function publishRollout(string $rolloutId, string $publishedBy): int
    {
        if (!$this->canWriteToDb()) {
            return 0;
        }

        try {
            return $this->data->execute(
                'UPDATE graphics_token_value
                    SET value = COALESCE(draft_value, value),
                        draft_value = NULL,
                        is_published = TRUE,
                        published_at = NOW(),
                        published_by = $2,
                        version = version + 1,
                        updated_at = NOW()
                  WHERE rollout_id = $1 AND (draft_value IS NOT NULL OR is_published = FALSE)',
                [$rolloutId, $publishedBy]
            );
        } catch (Throwable $e) {
            return 0;
        }
    }

    /**
     * Rollback a rollout by restoring the prior snapshot (if present).
     *
     * @param array<string, string> $priorSnapshot token_key => value
     * @return int rows reverted
     */
    public function rollbackRollout(string $rolloutId, array $priorSnapshot, string $revertedBy): int
    {
        if (!$this->canWriteToDb()) {
            return 0;
        }

        $count = 0;
        foreach ($priorSnapshot as $tokenKey => $value) {
            try {
                $count += $this->data->execute(
                    'UPDATE graphics_token_value
                        SET value = $3, draft_value = NULL, is_published = TRUE,
                            published_at = NOW(), published_by = $4,
                            version = version + 1, updated_at = NOW()
                      WHERE rollout_id = $1 AND token_key = $2',
                    [$rolloutId, $tokenKey, $value, $revertedBy]
                );
            } catch (Throwable $e) {
                continue;
            }
        }
        return $count;
    }

    /**
     * Hydrate the legacy JSON file from DB snapshot (used when returning to
     * JSON_ONLY or for cold-start migration). Idempotent.
     */
    public function syncDbToJsonAuthority(): bool
    {
        if (!$this->canReadFromDb()) {
            return false;
        }

        try {
            $snapshot = $this->snapshotEffective([], 'light');
            if ($snapshot === []) {
                return false;
            }

            $config = $this->repo->readDesignConfig();
            foreach ($snapshot as $path => $value) {
                $config = $this->assignByPath($config, $path, $value);
            }
            $config['_meta'] = [
                'version' => '3.0',
                'description' => 'Admin-configurable design system (DB-synced authority).',
                'updatedAt' => gmdate('c'),
                'updatedBy' => 'DesignTokenCatalogService::syncDbToJsonAuthority',
            ];
            $this->repo->writeDesignConfig($config);
            return true;
        } catch (Throwable $e) {
            return false;
        }
    }

    // ── Simulation runs (preview-before-commit evidence) ─────────────────────

    /**
     * Record a simulation run (stage → preview → decision). Returns the run_id.
     * This is the evidence row the frontend uses to prove "every edit has a preview".
     *
     * @param array<string, mixed> $payload
     */
    public function recordSimulationRun(array $payload): string
    {
        if (!$this->canWriteToDb()) {
            // Fall back to appending to a JSON trail so the evidence is not lost.
            $fallbackPath = rtrim($this->data->getDataDir(), '/') . '/graphics-governance/simulation-runs.log.jsonl';
            @mkdir(dirname($fallbackPath), 0775, true);
            $runId = $payload['run_id'] ?? $this->pseudoUuid();
            $line = json_encode(array_merge(['run_id' => $runId, 'captured_at' => gmdate('c')], $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($line !== false) {
                @file_put_contents($fallbackPath, $line . "\n", FILE_APPEND);
            }
            return $runId;
        }

        try {
            $scenesLiteral = $this->toPgTextArrayLiteral($payload['scenes_rendered'] ?? null);
            $runId = (string)$this->data->scalar(
                "INSERT INTO graphics_simulation_run (
                        run_label, initiated_by, staged_changes, scope_type, scope_id,
                        color_mode, scenes_rendered, wcag_report, colorblind_reports,
                        screen_reader_findings, outcome, notes
                    ) VALUES (
                        $1,$2, COALESCE($3::jsonb,'{}'::jsonb), $4, $5, $6,
                        COALESCE($7::text[], '{}'::text[]),
                        $8::jsonb, $9::jsonb, $10::jsonb, COALESCE($11,'reviewed'), $12
                    )
                    RETURNING run_id",
                [
                    $payload['label'] ?? null,
                    $payload['initiated_by'] ?? null,
                    isset($payload['staged_changes']) ? json_encode($payload['staged_changes']) : null,
                    $payload['scope_type'] ?? self::DEFAULT_SCOPE_TYPE,
                    $payload['scope_id']   ?? self::DEFAULT_SCOPE_ID,
                    $this->normalizeColorMode($payload['color_mode'] ?? 'light'),
                    $scenesLiteral,
                    isset($payload['wcag_report']) ? json_encode($payload['wcag_report']) : null,
                    isset($payload['colorblind_reports']) ? json_encode($payload['colorblind_reports']) : null,
                    isset($payload['screen_reader_findings']) ? json_encode($payload['screen_reader_findings']) : null,
                    $payload['outcome'] ?? 'reviewed',
                    $payload['notes'] ?? null,
                ]
            );
            return $runId !== '' ? $runId : $this->pseudoUuid();
        } catch (Throwable $e) {
            return $this->pseudoUuid();
        }
    }

    /**
     * Format a PHP array (or null) as a PostgreSQL text[] array literal so it
     * binds cleanly via PDO::PARAM_STR. Why: Connection::executeStatement
     * stringifies a PHP array to "Array" which makes the ::text[] cast explode
     * and the simulation-run evidence row is lost silently inside the catch.
     */
    private function toPgTextArrayLiteral(mixed $value): ?string
    {
        if (!is_array($value) || $value === []) {
            return null;
        }
        $escaped = array_map(static function ($item): string {
            $raw = (string)$item;
            return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $raw) . '"';
        }, array_values($value));
        return '{' . implode(',', $escaped) . '}';
    }

    // ── Preview scene registry ──────────────────────────────────────────────

    /**
     * List registered preview scenes (SAP sample-page model).
     *
     * @return array<int, array<string, mixed>>
     */
    public function listPreviewScenes(?string $category = null): array
    {
        if ($this->canReadFromDb()) {
            try {
                $rows = $this->data->query(
                    'SELECT scene_key, category, display_name_en, display_name_vi,
                            description, renderer, tokens_observed, projection_mode,
                            colorblind_filter, sort_order, is_default
                       FROM graphics_preview_scene
                      WHERE ($1::text IS NULL OR category = $1)
                   ORDER BY category, sort_order, scene_key',
                    [$category]
                ) ?? [];
                return array_map([$this, 'hydratePreviewScene'], $rows);
            } catch (Throwable $e) {
                // fall through
            }
        }
        return $this->defaultPreviewScenesFallback($category);
    }

    /**
     * List component contracts (SLDS Theming-Hook whitelist model).
     *
     * @return array<int, array<string, mixed>>
     */
    public function listComponentContracts(?bool $operatorVisibleOnly = null): array
    {
        if ($this->canReadFromDb()) {
            try {
                $sql = 'SELECT component_key, display_name_en, display_name_vi, description,
                               overridable_tokens, inherits_from, preview_scene_key,
                               is_operator_visible, a11y_requirements
                          FROM graphics_component_contract
                         WHERE ($1::boolean IS NULL OR is_operator_visible = $1)
                      ORDER BY component_key';
                $rows = $this->data->query($sql, [$operatorVisibleOnly]) ?? [];
                return array_map([$this, 'hydrateComponentContract'], $rows);
            } catch (Throwable $e) {
                // fall through
            }
        }
        return [];
    }

    /**
     * List theme schedules (shift-based theme swap registry).
     *
     * @return array<int, array<string, mixed>>
     */
    public function listThemeSchedules(): array
    {
        if ($this->canReadFromDb()) {
            try {
                $rows = $this->data->query(
                    'SELECT schedule_id, schedule_name, description, trigger_type, trigger_config,
                            target_color_mode, scope_type, scope_id, is_active, priority,
                            applies_to_roles, next_fire_at, last_fired_at
                       FROM graphics_theme_schedule
                      ORDER BY priority DESC, schedule_name'
                ) ?? [];
                return array_map(static function (array $row): array {
                    $row['trigger_config'] = is_string($row['trigger_config'])
                        ? (json_decode($row['trigger_config'], true) ?? [])
                        : ($row['trigger_config'] ?? []);
                    return $row;
                }, $rows);
            } catch (Throwable $e) {
                // fall through
            }
        }
        return [];
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private function canReadFromDb(): bool
    {
        $mode = $this->data->getMode();
        return in_array(
            $mode,
            [DataLayer::MODE_SHADOW_WRITE, DataLayer::MODE_POSTGRES_PRIMARY, DataLayer::MODE_POSTGRES_ONLY],
            true
        );
    }

    private function canWriteToDb(): bool
    {
        return $this->canReadFromDb();
    }

    private function normalizeColorMode(string $mode): string
    {
        $mode = strtolower($mode);
        return in_array($mode, self::COLOR_MODES, true) ? $mode : 'light';
    }

    /**
     * Build scope resolution chain — most-specific first.
     * @param array<string, string> $scope
     * @return array<int, array{0:string,1:string}>
     */
    private function resolveScopeChain(array $scope): array
    {
        $chain = [];
        foreach (['user','role','environment','tenant'] as $level) {
            if (!empty($scope[$level])) {
                $chain[] = [$level, (string)$scope[$level]];
            }
        }
        $chain[] = [self::DEFAULT_SCOPE_TYPE, self::DEFAULT_SCOPE_ID];
        return $chain;
    }

    /**
     * @param array<string, string> $scope
     * @return array{0:string,1:string}
     */
    private function primaryScope(array $scope): array
    {
        foreach (['user','role','environment','tenant'] as $level) {
            if (!empty($scope[$level])) {
                return [$level, (string)$scope[$level]];
            }
        }
        return [self::DEFAULT_SCOPE_TYPE, self::DEFAULT_SCOPE_ID];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydrateCatalogRow(array $row): array
    {
        $row['tags'] = $this->pgArrayToPhp($row['tags'] ?? null);
        $row['allowed_keywords'] = $this->pgArrayToPhp($row['allowed_keywords'] ?? null);
        $row['min_numeric']  = $row['min_numeric']  !== null ? (float)$row['min_numeric']  : null;
        $row['max_numeric']  = $row['max_numeric']  !== null ? (float)$row['max_numeric']  : null;
        $row['step_numeric'] = $row['step_numeric'] !== null ? (float)$row['step_numeric'] : null;
        $row['wcag_min_contrast'] = $row['wcag_min_contrast'] !== null ? (float)$row['wcag_min_contrast'] : null;
        $row['is_deprecated'] = !empty($row['is_deprecated']);
        return $row;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydrateComponentContract(array $row): array
    {
        $row['overridable_tokens'] = $this->pgArrayToPhp($row['overridable_tokens'] ?? null);
        $row['is_operator_visible'] = !empty($row['is_operator_visible']);
        $row['a11y_requirements'] = is_string($row['a11y_requirements'])
            ? (json_decode($row['a11y_requirements'], true) ?? [])
            : ($row['a11y_requirements'] ?? []);
        return $row;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydratePreviewScene(array $row): array
    {
        $row['tokens_observed'] = $this->pgArrayToPhp($row['tokens_observed'] ?? null);
        $row['is_default'] = !empty($row['is_default']);
        $row['sort_order'] = (int)($row['sort_order'] ?? 0);
        return $row;
    }

    /**
     * @return array<int, string>
     */
    private function pgArrayToPhp(mixed $val): array
    {
        if (is_array($val)) {
            return array_values(array_map('strval', $val));
        }
        if (!is_string($val) || $val === '' || $val === '{}') {
            return [];
        }
        $trimmed = trim($val, '{}');
        if ($trimmed === '') {
            return [];
        }
        return array_values(array_filter(
            array_map(static fn($s) => trim($s, '"'), str_getcsv($trimmed)),
            static fn($s) => $s !== ''
        ));
    }

    private function readFromJsonPath(string $tokenKey): ?string
    {
        $config = $this->repo->readDesignConfig();
        $cursor = $config;
        foreach (explode('.', $tokenKey) as $segment) {
            if (!is_array($cursor) || !array_key_exists($segment, $cursor)) {
                return null;
            }
            $cursor = $cursor[$segment];
        }
        if (is_scalar($cursor)) {
            return (string)$cursor;
        }
        return null;
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    private function assignByPath(array $target, string $path, mixed $value): array
    {
        $segments = explode('.', $path);
        $cursor = &$target;
        foreach ($segments as $i => $segment) {
            $isLast = $i === count($segments) - 1;
            if ($isLast) {
                $cursor[$segment] = $value;
            } else {
                if (!isset($cursor[$segment]) || !is_array($cursor[$segment])) {
                    $cursor[$segment] = [];
                }
                $cursor = &$cursor[$segment];
            }
        }
        return $target;
    }

    /**
     * @param array<string, mixed> $tree
     * @return array<string, string>
     */
    private function flattenJson(array $tree, string $prefix = ''): array
    {
        $out = [];
        foreach ($tree as $key => $value) {
            if (str_starts_with((string)$key, '_')) {
                continue;
            }
            $path = $prefix === '' ? (string)$key : $prefix . '.' . $key;
            if (is_array($value) && array_is_list($value)) {
                $out[$path] = json_encode($value, JSON_UNESCAPED_UNICODE) ?: '';
            } elseif (is_array($value)) {
                $out = array_merge($out, $this->flattenJson($value, $path));
            } else {
                $out[$path] = is_scalar($value) ? (string)$value : '';
            }
        }
        return $out;
    }

    /**
     * Derive the catalog shape from the legacy JSON file when DB is unavailable.
     * Gives the frontend the same contract in JSON_ONLY mode.
     *
     * @return array<int, array<string, mixed>>
     */
    private function deriveCatalogFromJson(?string $layer, ?string $family, ?string $componentScope): array
    {
        $config = $this->repo->readDesignConfig();
        $flat = $this->flattenJson($config);
        $rows = [];
        foreach ($flat as $path => $value) {
            $derivedFamily = $this->guessFamily($path);
            $derivedLayer  = str_starts_with($path, 'components.') ? 'component' : ($derivedFamily === 'color' ? 'semantic' : 'global');
            $scope = str_starts_with($path, 'components.') ? explode('.', $path)[1] ?? null : null;
            if ($layer && $derivedLayer !== $layer) continue;
            if ($family && $derivedFamily !== $family) continue;
            if ($componentScope && $scope !== $componentScope) continue;
            $rows[] = [
                'token_key'      => $path,
                'css_variable'   => null,
                'layer'          => $derivedLayer,
                'family'         => $derivedFamily,
                'subfamily'      => null,
                'component_scope'=> $scope,
                'value_type'     => $this->guessValueType($value),
                'unit'           => null,
                'min_numeric'    => null,
                'max_numeric'    => null,
                'step_numeric'   => null,
                'allowed_keywords'=> [],
                'default_light'  => (string)$value,
                'default_dark'   => null,
                'default_high_contrast' => null,
                'default_print'  => null,
                'alias_of'       => null,
                'wcag_min_contrast' => null,
                'wcag_pair_token'=> null,
                'description'    => '',
                'tags'           => [],
                'is_deprecated'  => false,
                '_source'        => 'json-derived',
            ];
        }
        return $rows;
    }

    private function guessFamily(string $path): string
    {
        if (preg_match('/color|bg|text|border|accent|stripe|heatmap|sidebar|brand|status\.|selection|caret|placeholder|scrollbar/i', $path)) return 'color';
        if (str_starts_with($path, 'typography.') || str_starts_with($path, 'fontScale')) return 'typography';
        if (str_starts_with($path, 'lineHeight')) return 'typography';
        if (str_starts_with($path, 'layout.')) return 'sizing';
        if (str_starts_with($path, 'effects.motion') || str_starts_with($path, 'effects.easing')) return 'motion';
        if (str_starts_with($path, 'effects.shadow')) return 'shadow';
        if (str_starts_with($path, 'effects.opacity')) return 'opacity';
        if (str_starts_with($path, 'effects.')) return 'effect';
        return 'other';
    }

    private function guessValueType(mixed $value): string
    {
        if (is_bool($value)) return 'keyword';
        if (is_numeric($value)) return 'unitless';
        $str = (string)$value;
        if (preg_match('/^#[0-9a-f]{3,8}$/i', $str)) return 'hex';
        if (str_starts_with($str, 'rgba')) return 'rgba';
        if (preg_match('/px$/', $str)) return 'px';
        if (preg_match('/rem$/', $str)) return 'rem';
        if (preg_match('/em$/', $str)) return 'em';
        if (preg_match('/ms$/', $str)) return 'ms';
        if (preg_match('/cubic-bezier/', $str)) return 'easing-expr';
        if (preg_match('/rgba|\d+px\s/', $str)) return 'shadow-expr';
        return 'keyword';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultPreviewScenesFallback(?string $category): array
    {
        $seed = [
            ['typography.family',      'typography','Typography Family',  'Họ phông chữ',    'typographyFamily',    10, true],
            ['typography.scale',       'typography','Typography Scale',   'Thang cỡ chữ',    'typographyScale',     20, true],
            ['color.brand',            'color',     'Brand Color Scene',  'Màu thương hiệu', 'colorBrand',          40, true],
            ['color.status',           'color',     'Status Color Scene', 'Màu trạng thái',  'colorStatus',         50, true],
            ['color.surfaces',         'color',     'Surface Stack',      'Bề mặt',          'colorSurfaces',       60, true],
            ['components.button',      'components','Button Gallery',     'Nút bấm',         'componentButton',     200, true],
            ['components.table',       'components','Table Gallery',      'Bảng',            'componentTable',      210, true],
            ['components.kpi',         'components','KPI Card Gallery',   'Thẻ KPI',         'componentKpi',        230, true],
        ];
        $rows = [];
        foreach ($seed as $r) {
            [$key, $cat, $en, $vi, $renderer, $order, $isDefault] = $r;
            if ($category && $cat !== $category) continue;
            $rows[] = [
                'scene_key'       => $key,
                'category'        => $cat,
                'display_name_en' => $en,
                'display_name_vi' => $vi,
                'description'     => '',
                'renderer'        => $renderer,
                'tokens_observed' => [],
                'projection_mode' => 'desktop',
                'colorblind_filter' => null,
                'sort_order'      => $order,
                'is_default'      => $isDefault,
                '_source'         => 'fallback',
            ];
        }
        return $rows;
    }

    private function pseudoUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return sprintf('%s-%s-%s-%s-%s',
            substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4),
            substr($hex, 16, 4), substr($hex, 20, 12)
        );
    }
}
