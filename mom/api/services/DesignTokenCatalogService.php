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
                // resolveScopeChain() always terminates with organization:default,
                // so once that scope is seeded for every governed token (migration
                // 284 backfills it as a total mirror of the catalog) $result is
                // never empty in POSTGRES_* modes — the JSON fallback below is then
                // a cold-start / JSON_ONLY safety net only, never the runtime
                // authority. Most-specific scope wins: we overlay from base
                // (organization:default) up to the most specific scope.
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
                // Completion pass: a non-light snapshot must still be total per
                // mode. If a token lacks a row in the requested mode (e.g. a
                // mode-agnostic spacing token, or a future catalog key seeded
                // without all-mode values) fill it from the light baseline so the
                // snapshot map covers every governed key and the per-key
                // GraphicsAuthority.tokens.read() JSON fallback never fires for a
                // governed token. Only adds missing keys; never overrides a
                // mode-specific value already resolved above.
                if ($colorMode !== 'light') {
                    foreach ($this->snapshotEffective($scope, 'light') as $key => $value) {
                        if (!array_key_exists($key, $result)) {
                            $result[$key] = $value;
                        }
                    }
                }
                if ($result !== []) {
                    return $result;
                }
            } catch (Throwable $e) {
                // fall through
            }
        }

        // Fallback: walk JSON config (cold-start / JSON_ONLY only — see note above)
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

    // ── Theme presets (graphics_theme_preset, migration 263) ─────────────────
    // A theme preset = brand seed + the master knobs density(gap)/radius_outer
    // (cấp1)/radius_inner(cấp2-3)/control_h/frame + a free-form token overrides
    // bag. Modules reference one by preset_key; editing it ripples everywhere.

    /**
     * List published theme presets (DB-backed; falls back to the 6 builtins in
     * JSON_ONLY or when the table is empty).
     * @return array<int, array<string, mixed>>
     */
    public function listThemePresets(): array
    {
        if ($this->canReadFromDb()) {
            try {
                // status literal inlined (constant, no injection risk) — a $1
                // param here would bind at array key 0, which PDO_PGSQL rejects.
                $rows = $this->data->query(
                    'SELECT preset_key, display_name_en, display_name_vi, brand,
                            density_px, radius_outer_px, radius_inner_px, control_h_px, frame_px,
                            overrides, scope_type, scope_id, base_ref, status, is_default, is_builtin, sort_order
                       FROM graphics_theme_preset
                      WHERE status = \'published\'
                   ORDER BY sort_order, preset_key'
                ) ?? [];
                if ($rows !== []) {
                    return array_map([$this, 'hydrateThemePresetRow'], $rows);
                }
            } catch (Throwable $e) {
                // fall through to builtins
            }
        }
        return $this->builtinThemePresets();
    }

    /** @return array<string, mixed>|null */
    public function getThemePreset(string $presetKey): ?array
    {
        foreach ($this->listThemePresets() as $p) {
            if (($p['preset_key'] ?? null) === $presetKey) {
                return $p;
            }
        }
        return null;
    }

    /**
     * Create/update a theme preset (upsert by preset_key). Requires a DB write
     * mode; builtins stay read-only in JSON_ONLY.
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function saveThemePreset(array $input, string $user = ''): array
    {
        $p = $this->sanitizeThemePresetInput($input);
        if ($p['preset_key'] === '') {
            throw new \InvalidArgumentException('preset_key is required');
        }
        if (!$this->canWriteToDb()) {
            throw new \RuntimeException('theme preset write requires a Postgres data mode');
        }
        $this->data->execute(
            'INSERT INTO graphics_theme_preset
                 (preset_key, display_name_en, display_name_vi, brand, density_px, radius_outer_px,
                  radius_inner_px, control_h_px, frame_px, overrides, scope_type, scope_id, base_ref,
                  status, sort_order, created_by, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?::jsonb,?,?,?,?,?,?,NOW())
             ON CONFLICT (preset_key) DO UPDATE SET
                 display_name_en = EXCLUDED.display_name_en,
                 display_name_vi = EXCLUDED.display_name_vi,
                 brand           = EXCLUDED.brand,
                 density_px      = EXCLUDED.density_px,
                 radius_outer_px = EXCLUDED.radius_outer_px,
                 radius_inner_px = EXCLUDED.radius_inner_px,
                 control_h_px    = EXCLUDED.control_h_px,
                 frame_px        = EXCLUDED.frame_px,
                 overrides       = EXCLUDED.overrides,
                 base_ref        = EXCLUDED.base_ref,
                 status          = EXCLUDED.status,
                 sort_order      = EXCLUDED.sort_order,
                 updated_at      = NOW()',
            $this->pgParams([
                $p['preset_key'], $p['display_name_en'], $p['display_name_vi'], $p['brand'],
                $p['density_px'], $p['radius_outer_px'], $p['radius_inner_px'], $p['control_h_px'], $p['frame_px'],
                (string)json_encode($p['overrides']), $p['scope_type'], $p['scope_id'], $p['base_ref'],
                $p['status'], $p['sort_order'], $user,
            ])
        );
        // single org-default invariant
        if ($p['is_default']) {
            try {
                $this->data->execute('UPDATE graphics_theme_preset SET is_default = FALSE WHERE preset_key <> ?', $this->pgParams([$p['preset_key']]));
                $this->data->execute('UPDATE graphics_theme_preset SET is_default = TRUE  WHERE preset_key = ?', $this->pgParams([$p['preset_key']]));
            } catch (Throwable $e) {
                // best-effort
            }
        }
        return $this->getThemePreset($p['preset_key']) ?? $p;
    }

    /** @return array<string, mixed> */
    public function deleteThemePreset(string $presetKey): array
    {
        if (!$this->canWriteToDb()) {
            throw new \RuntimeException('theme preset delete requires a Postgres data mode');
        }
        $this->data->execute(
            'DELETE FROM graphics_theme_preset WHERE preset_key = ? AND is_builtin = FALSE',
            $this->pgParams([$presetKey])
        );
        return ['deleted' => $presetKey];
    }

    /**
     * Clone an existing theme preset into a new key, recording base_ref so the
     * clone is linked to its parent (theme inheritance lineage). The clone is
     * forced non-builtin, non-default, status=draft (unless the overlay says
     * otherwise) so a clone never silently becomes the org default. Any overlay
     * fields (brand, density, overrides, …) override the source values.
     *
     * @param array<string, mixed> $overlay
     * @return array<string, mixed>
     */
    public function cloneThemePreset(string $sourceKey, string $newKey, array $overlay = [], string $user = ''): array
    {
        if (!$this->canWriteToDb()) {
            throw new \RuntimeException('theme preset clone requires a Postgres data mode');
        }
        $newKeyClean = (string)preg_replace('/[^a-z0-9\-]/', '', strtolower($newKey));
        if ($newKeyClean === '') {
            throw new \InvalidArgumentException('new preset_key is required');
        }
        $source = $this->getThemePreset($sourceKey);
        if ($source === null) {
            throw new \InvalidArgumentException('source preset not found: ' . $sourceKey);
        }
        if ($this->getThemePreset($newKeyClean) !== null) {
            throw new \RuntimeException('preset_key already exists: ' . $newKeyClean);
        }
        $input = array_merge($source, $overlay, [
            'preset_key' => $newKeyClean,
            'base_ref'   => $sourceKey,
            'is_default' => false,
            'is_builtin' => false,
            'status'     => (string)($overlay['status'] ?? 'draft'),
        ]);
        if (empty($overlay['display_name_en'])) {
            $input['display_name_en'] = ((string)($source['display_name_en'] ?? $sourceKey)) . ' (copy)';
            $input['display_name_vi'] = ((string)($source['display_name_vi'] ?? $input['display_name_en'])) . ' (bản sao)';
        }
        return $this->saveThemePreset($input, $user);
    }

    // ── Registry contract writes (L2 component / L3 block / L4 archetype) ─────
    // Author-mode editors of Module Studio. Same write discipline as theme
    // presets: `?` placeholders + pgParams() (PDO rejects Postgres $N on writes),
    // JSONB via json_encode + ::jsonb, TEXT[] via toPgTextArrayLiteral + ::text[].

    /** @return array<string, mixed>|null */
    public function getComponentContract(string $componentKey): ?array
    {
        foreach ($this->listComponentContracts(null) as $c) {
            if (($c['component_key'] ?? null) === $componentKey) {
                return $c;
            }
        }
        return null;
    }

    /**
     * Upsert an L2 component contract (SLDS Theming-Hook whitelist).
     * @param array<string, mixed> $in
     * @return array<string, mixed>
     */
    public function saveComponentContract(array $in, string $user = ''): array
    {
        if (!$this->canWriteToDb()) {
            throw new \RuntimeException('component contract write requires a Postgres data mode');
        }
        $key = (string)preg_replace('/[^A-Za-z0-9_.\-]/', '', (string)($in['component_key'] ?? ''));
        if ($key === '') {
            throw new \InvalidArgumentException('component_key is required');
        }
        $en = trim((string)($in['display_name_en'] ?? $key)) ?: $key;
        $vi = trim((string)($in['display_name_vi'] ?? $en)) ?: $en;
        $desc = isset($in['description']) && $in['description'] !== '' ? (string)$in['description'] : null;
        $tokens = $this->toPgTextArrayLiteral($this->normalizeStringList($in['overridable_tokens'] ?? [])) ?? '{}';
        $inherits = !empty($in['inherits_from']) ? (string)$in['inherits_from'] : null;
        $scene = !empty($in['preview_scene_key']) ? (string)$in['preview_scene_key'] : null;
        $a11y = is_array($in['a11y_requirements'] ?? null) ? $in['a11y_requirements'] : [];
        $this->data->execute(
            'INSERT INTO graphics_component_contract
                 (component_key, display_name_en, display_name_vi, description, overridable_tokens,
                  inherits_from, preview_scene_key, is_operator_visible, a11y_requirements, updated_at)
             VALUES (?,?,?,?,?::text[],?,?,?::boolean,?::jsonb,NOW())
             ON CONFLICT (component_key) DO UPDATE SET
                 display_name_en     = EXCLUDED.display_name_en,
                 display_name_vi     = EXCLUDED.display_name_vi,
                 description         = EXCLUDED.description,
                 overridable_tokens  = EXCLUDED.overridable_tokens,
                 inherits_from       = EXCLUDED.inherits_from,
                 preview_scene_key   = EXCLUDED.preview_scene_key,
                 is_operator_visible = EXCLUDED.is_operator_visible,
                 a11y_requirements   = EXCLUDED.a11y_requirements,
                 updated_at          = NOW()',
            $this->pgParams([
                $key, $en, $vi, $desc, $tokens, $inherits, $scene,
                !empty($in['is_operator_visible']) ? 'true' : 'false',
                (string)json_encode($a11y),
            ])
        );
        return $this->getComponentContract($key) ?? ['component_key' => $key];
    }

    /**
     * List L3 block contracts from the DB authority (graphics_block_contract).
     * @return array<int, array<string, mixed>>
     */
    public function listBlockContracts(?string $status = null): array
    {
        if ($this->canReadFromDb()) {
            try {
                $rows = $this->data->query(
                    'SELECT block_key, display_name_en, display_name_vi, category, status,
                            composed_of, root_class, slots, variant_axes, required_tokens,
                            a11y_contract, preview_scene_key, deprecation_note
                       FROM graphics_block_contract
                      WHERE ($1::text IS NULL OR status = $1)
                   ORDER BY category, block_key',
                    [$status]
                ) ?? [];
                return array_map([$this, 'hydrateBlockContract'], $rows);
            } catch (Throwable $e) {
                // fall through
            }
        }
        return [];
    }

    /** @return array<string, mixed>|null */
    public function getBlockContract(string $blockKey): ?array
    {
        foreach ($this->listBlockContracts(null) as $b) {
            if (($b['block_key'] ?? null) === $blockKey) {
                return $b;
            }
        }
        return null;
    }

    /**
     * Upsert an L3 block contract (reusable cluster of L2 components + slots).
     * @param array<string, mixed> $in
     * @return array<string, mixed>
     */
    public function saveBlockContract(array $in, string $user = ''): array
    {
        if (!$this->canWriteToDb()) {
            throw new \RuntimeException('block contract write requires a Postgres data mode');
        }
        $key = (string)preg_replace('/[^A-Za-z0-9_.\-]/', '', (string)($in['block_key'] ?? ''));
        if ($key === '') {
            throw new \InvalidArgumentException('block_key is required');
        }
        $en = trim((string)($in['display_name_en'] ?? $key)) ?: $key;
        $vi = trim((string)($in['display_name_vi'] ?? $en)) ?: $en;
        $category = (string)($in['category'] ?? 'layout');
        if (!in_array($category, ['layout', 'display', 'feedback', 'navigation', 'input'], true)) {
            $category = 'layout';
        }
        $status = $this->normalizeContractStatus($in['status'] ?? 'draft');
        $composedOf = $this->toPgTextArrayLiteral($this->normalizeStringList($in['composed_of'] ?? [])) ?? '{}';
        $requiredTokens = $this->toPgTextArrayLiteral($this->normalizeStringList($in['required_tokens'] ?? [])) ?? '{}';
        $rootClass = !empty($in['root_class']) ? (string)$in['root_class'] : null;
        $slots = is_array($in['slots'] ?? null) ? $in['slots'] : [];
        $variantAxes = is_array($in['variant_axes'] ?? null) ? $in['variant_axes'] : [];
        $a11y = is_array($in['a11y_contract'] ?? null) ? $in['a11y_contract'] : [];
        $scene = !empty($in['preview_scene_key']) ? (string)$in['preview_scene_key'] : null;
        $deprNote = isset($in['deprecation_note']) && $in['deprecation_note'] !== '' ? (string)$in['deprecation_note'] : null;
        $this->data->execute(
            'INSERT INTO graphics_block_contract
                 (block_key, display_name_en, display_name_vi, category, status, composed_of,
                  root_class, slots, variant_axes, required_tokens, a11y_contract,
                  preview_scene_key, deprecation_note, updated_at)
             VALUES (?,?,?,?,?,?::text[],?,?::jsonb,?::jsonb,?::text[],?::jsonb,?,?,NOW())
             ON CONFLICT (block_key) DO UPDATE SET
                 display_name_en   = EXCLUDED.display_name_en,
                 display_name_vi   = EXCLUDED.display_name_vi,
                 category          = EXCLUDED.category,
                 status            = EXCLUDED.status,
                 composed_of       = EXCLUDED.composed_of,
                 root_class        = EXCLUDED.root_class,
                 slots             = EXCLUDED.slots,
                 variant_axes      = EXCLUDED.variant_axes,
                 required_tokens   = EXCLUDED.required_tokens,
                 a11y_contract     = EXCLUDED.a11y_contract,
                 preview_scene_key = EXCLUDED.preview_scene_key,
                 deprecation_note  = EXCLUDED.deprecation_note,
                 updated_at        = NOW()',
            $this->pgParams([
                $key, $en, $vi, $category, $status, $composedOf, $rootClass,
                (string)json_encode($slots), (string)json_encode($variantAxes), $requiredTokens,
                (string)json_encode($a11y), $scene, $deprNote,
            ])
        );
        return $this->getBlockContract($key) ?? ['block_key' => $key];
    }

    /**
     * List L4 module archetypes from the DB authority (graphics_module_archetype).
     * @return array<int, array<string, mixed>>
     */
    public function listModuleArchetypes(?string $status = null): array
    {
        if ($this->canReadFromDb()) {
            try {
                $rows = $this->data->query(
                    'SELECT archetype_key, display_name_en, display_name_vi, route_class, status,
                            zones, zone_order, required_blocks, forbidden_patterns, a11y_contract,
                            deprecation_note
                       FROM graphics_module_archetype
                      WHERE ($1::text IS NULL OR status = $1)
                   ORDER BY route_class, archetype_key',
                    [$status]
                ) ?? [];
                return array_map([$this, 'hydrateModuleArchetype'], $rows);
            } catch (Throwable $e) {
                // fall through
            }
        }
        return [];
    }

    /** @return array<string, mixed>|null */
    public function getModuleArchetype(string $archetypeKey): ?array
    {
        foreach ($this->listModuleArchetypes(null) as $a) {
            if (($a['archetype_key'] ?? null) === $archetypeKey) {
                return $a;
            }
        }
        return null;
    }

    /**
     * Upsert an L4 module archetype (complete shell arranging L3 blocks in zones).
     * @param array<string, mixed> $in
     * @return array<string, mixed>
     */
    public function saveModuleArchetype(array $in, string $user = ''): array
    {
        if (!$this->canWriteToDb()) {
            throw new \RuntimeException('module archetype write requires a Postgres data mode');
        }
        $key = (string)preg_replace('/[^A-Za-z0-9_.\-]/', '', (string)($in['archetype_key'] ?? ''));
        if ($key === '') {
            throw new \InvalidArgumentException('archetype_key is required');
        }
        $en = trim((string)($in['display_name_en'] ?? $key)) ?: $key;
        $vi = trim((string)($in['display_name_vi'] ?? $en)) ?: $en;
        $routeClass = trim((string)($in['route_class'] ?? ''));
        if ($routeClass === '') {
            throw new \InvalidArgumentException('route_class is required');
        }
        $status = $this->normalizeContractStatus($in['status'] ?? 'draft');
        $zones = is_array($in['zones'] ?? null) ? $in['zones'] : [];
        $zoneOrder = $this->toPgTextArrayLiteral($this->normalizeStringList($in['zone_order'] ?? [])) ?? '{}';
        $requiredBlocks = $this->toPgTextArrayLiteral($this->normalizeStringList($in['required_blocks'] ?? [])) ?? '{}';
        $forbidden = $this->toPgTextArrayLiteral($this->normalizeStringList($in['forbidden_patterns'] ?? [])) ?? '{}';
        $a11y = is_array($in['a11y_contract'] ?? null) ? $in['a11y_contract'] : [];
        $deprNote = isset($in['deprecation_note']) && $in['deprecation_note'] !== '' ? (string)$in['deprecation_note'] : null;
        $this->data->execute(
            'INSERT INTO graphics_module_archetype
                 (archetype_key, display_name_en, display_name_vi, route_class, status, zones,
                  zone_order, required_blocks, forbidden_patterns, a11y_contract, deprecation_note, updated_at)
             VALUES (?,?,?,?,?,?::jsonb,?::text[],?::text[],?::text[],?::jsonb,?,NOW())
             ON CONFLICT (archetype_key) DO UPDATE SET
                 display_name_en    = EXCLUDED.display_name_en,
                 display_name_vi    = EXCLUDED.display_name_vi,
                 route_class        = EXCLUDED.route_class,
                 status             = EXCLUDED.status,
                 zones              = EXCLUDED.zones,
                 zone_order         = EXCLUDED.zone_order,
                 required_blocks    = EXCLUDED.required_blocks,
                 forbidden_patterns = EXCLUDED.forbidden_patterns,
                 a11y_contract      = EXCLUDED.a11y_contract,
                 deprecation_note   = EXCLUDED.deprecation_note,
                 updated_at         = NOW()',
            $this->pgParams([
                $key, $en, $vi, $routeClass, $status, (string)json_encode($zones),
                $zoneOrder, $requiredBlocks, $forbidden, (string)json_encode($a11y), $deprNote,
            ])
        );
        return $this->getModuleArchetype($key) ?? ['archetype_key' => $key];
    }

    private function normalizeContractStatus(mixed $status): string
    {
        $s = strtolower(trim((string)$status));
        return in_array($s, ['draft', 'review', 'published', 'deprecated'], true) ? $s : 'draft';
    }

    /**
     * Coerce a value (array or comma string) into a clean list of non-empty
     * strings for a TEXT[] column.
     * @return array<int, string>
     */
    private function normalizeStringList(mixed $value): array
    {
        if (is_string($value)) {
            $value = $value === '' ? [] : preg_split('/\s*,\s*/', $value);
        }
        if (!is_array($value)) {
            return [];
        }
        return array_values(array_filter(
            array_map(static fn($v): string => trim((string)$v), $value),
            static fn(string $v): bool => $v !== ''
        ));
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydrateBlockContract(array $row): array
    {
        $row['composed_of'] = $this->pgArrayToPhp($row['composed_of'] ?? null);
        $row['required_tokens'] = $this->pgArrayToPhp($row['required_tokens'] ?? null);
        $row['slots'] = $this->decodeJsonColumn($row['slots'] ?? null);
        $row['variant_axes'] = $this->decodeJsonColumn($row['variant_axes'] ?? null);
        $row['a11y_contract'] = $this->decodeJsonColumn($row['a11y_contract'] ?? null);
        return $row;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydrateModuleArchetype(array $row): array
    {
        $row['zone_order'] = $this->pgArrayToPhp($row['zone_order'] ?? null);
        $row['required_blocks'] = $this->pgArrayToPhp($row['required_blocks'] ?? null);
        $row['forbidden_patterns'] = $this->pgArrayToPhp($row['forbidden_patterns'] ?? null);
        $row['zones'] = $this->decodeJsonColumn($row['zones'] ?? null);
        $row['a11y_contract'] = $this->decodeJsonColumn($row['a11y_contract'] ?? null);
        return $row;
    }

    /** @return array<string, mixed> */
    private function decodeJsonColumn(mixed $val): array
    {
        if (is_array($val)) {
            return $val;
        }
        if (is_string($val) && $val !== '') {
            $decoded = json_decode($val, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    /**
     * Re-key a positional value list to 1-based because
     * Connection::executeStatement binds each value via bindValue($key,…) and
     * PDO (native prepares, EMULATE_PREPARES=false) requires 1-based positions
     * for `?` placeholders — a 0-indexed array triggers
     * "bindValue(): Argument #1 must be >= 1". NB: use `?` placeholders, not
     * Postgres `$N` (PDO does not register $N as bindable, so they bind NULL).
     * @param array<int, mixed> $values
     * @return array<int, mixed>
     */
    private function pgParams(array $values): array
    {
        $values = array_values($values);
        if ($values === []) {
            return [];
        }
        return array_combine(range(1, count($values)), $values);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function hydrateThemePresetRow(array $row): array
    {
        $row['density_px']      = (int)($row['density_px'] ?? 8);
        $row['radius_outer_px'] = (int)($row['radius_outer_px'] ?? 8);
        $row['radius_inner_px'] = (int)($row['radius_inner_px'] ?? 4);
        $row['control_h_px']    = (int)($row['control_h_px'] ?? 32);
        $row['frame_px']        = (int)($row['frame_px'] ?? 8);
        $row['sort_order']      = (int)($row['sort_order'] ?? 100);
        $row['is_default']      = $this->presetBool($row['is_default'] ?? false);
        $row['is_builtin']      = $this->presetBool($row['is_builtin'] ?? false);
        $row['overrides']       = is_string($row['overrides'] ?? null)
            ? (json_decode((string)$row['overrides'], true) ?: [])
            : (is_array($row['overrides'] ?? null) ? $row['overrides'] : []);
        return $row;
    }

    private function presetBool(mixed $v): bool
    {
        if (is_bool($v)) {
            return $v;
        }
        if (is_int($v)) {
            return $v !== 0;
        }
        return in_array(strtolower((string)$v), ['t', 'true', '1', 'yes'], true);
    }

    /**
     * @param array<string, mixed> $in
     * @return array<string, mixed>
     */
    private function sanitizeThemePresetInput(array $in): array
    {
        $clamp = static function (mixed $v, int $min, int $max, int $def): int {
            $n = is_numeric($v) ? (int)$v : $def;
            return max($min, min($max, $n));
        };
        $key = (string)preg_replace('/[^a-z0-9\-]/', '', strtolower((string)($in['preset_key'] ?? '')));
        $status = (string)($in['status'] ?? 'published');
        if (!in_array($status, ['draft', 'review', 'published', 'deprecated'], true)) {
            $status = 'published';
        }
        $scopeType = (string)($in['scope_type'] ?? 'organization');
        if (!in_array($scopeType, ['organization', 'tenant', 'role', 'user', 'module'], true)) {
            $scopeType = 'organization';
        }
        $brand = (string)($in['brand'] ?? '#0c4a6e');
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $brand)) {
            $brand = '#0c4a6e';
        }
        $en = trim((string)($in['display_name_en'] ?? $key));
        $vi = trim((string)($in['display_name_vi'] ?? $en));
        return [
            'preset_key'      => $key,
            'display_name_en' => $en !== '' ? $en : $key,
            'display_name_vi' => $vi !== '' ? $vi : ($en !== '' ? $en : $key),
            'brand'           => $brand,
            'density_px'      => $clamp($in['density_px'] ?? 8, 2, 24, 8),
            'radius_outer_px' => $clamp($in['radius_outer_px'] ?? 8, 0, 40, 8),
            'radius_inner_px' => $clamp($in['radius_inner_px'] ?? 4, 0, 32, 4),
            'control_h_px'    => $clamp($in['control_h_px'] ?? 32, 24, 56, 32),
            'frame_px'        => $clamp($in['frame_px'] ?? 8, 0, 40, 8),
            'overrides'       => is_array($in['overrides'] ?? null) ? $in['overrides'] : [],
            'scope_type'      => $scopeType,
            'scope_id'        => (trim((string)($in['scope_id'] ?? 'default')) ?: 'default'),
            'base_ref'        => !empty($in['base_ref']) ? (string)$in['base_ref'] : null,
            'status'          => $status,
            'is_default'      => !empty($in['is_default']),
            'sort_order'      => $clamp($in['sort_order'] ?? 100, 0, 9999, 100),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function builtinThemePresets(): array
    {
        $mk = static function (string $k, string $en, string $vi, string $brand, int $g, int $ro, int $ri, int $ch, int $fr, bool $def, int $so): array {
            return [
                'preset_key' => $k, 'display_name_en' => $en, 'display_name_vi' => $vi, 'brand' => $brand,
                'density_px' => $g, 'radius_outer_px' => $ro, 'radius_inner_px' => $ri, 'control_h_px' => $ch, 'frame_px' => $fr,
                'overrides' => [], 'scope_type' => 'organization', 'scope_id' => 'default', 'base_ref' => null,
                'status' => 'published', 'is_default' => $def, 'is_builtin' => true, 'sort_order' => $so,
            ];
        };
        return [
            $mk('hesem-default', 'HESEM Default', 'HESEM mặc định', '#0c4a6e', 8, 8, 4, 32, 8, true, 10),
            $mk('industrial-dense', 'Industrial Dense', 'Công nghiệp dày', '#0c4a6e', 6, 4, 2, 28, 6, false, 20),
            $mk('comfortable', 'Comfortable', 'Thoáng', '#0c4a6e', 12, 10, 5, 36, 12, false, 30),
            $mk('shop-floor', 'Shop-floor (touch)', 'Xưởng (cảm ứng)', '#0f766e', 10, 8, 4, 44, 10, false, 40),
            $mk('violet', 'Violet', 'Tím', '#7c3aed', 8, 8, 4, 32, 8, false, 50),
            $mk('slate', 'Slate', 'Xám đen', '#334155', 8, 6, 3, 32, 8, false, 60),
        ];
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
