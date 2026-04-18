# Domain: graphics-control-plane

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose

Single source of truth for every visual parameter (colors, typography, spacing, radius, shadows, motion) the portal renders. Provides an admin studio to tune the design system, a preview-before-commit simulation gate (WCAG + colorblind + screen-reader checks), scope-aware token resolution (user / role / environment / tenant / organization), and a staged rollout lifecycle (draft → stage → canary → apply → rollback). Every other UI module must resolve visuals through this authority; hardcoded visual literals in JS / inline style / HTML are prohibited.

## Architectural Rule (no-hardcode)

See `CLAUDE.md` → "MANDATORY: Graphics Authority Link" and `.ai/CONVENTIONS.md` → "Graphics Authority Link (no-hardcode rule)". Scanner: `tools/scripts/graphics-audit/scan-hardcoded-visuals.php` — report at `_reports/agent-audits/graphics-hardcode-audit-<date>.json`.

## Controllers

- `GraphicsGovernanceController` → `mom/api/controllers/GraphicsGovernanceController.php`
  - Existing governance endpoints: design config, templates, impact, compliance, rollout, waivers, audit, release blockers, change set, lineage, runtime beacon, debt observatory
  - New (2026-04-18) token-catalog endpoints: `tokenCatalogList`, `tokenCatalogSnapshot`, `previewScenesList`, `componentContractRegistry`, `themeScheduleList`, `simulationRunRecord`

## Key Services

- **GraphicsGovernanceService** — orchestrates template registry, impact analysis, compliance matrix, rollout lifecycle, audit, waivers, release blockers. File: `mom/api/services/GraphicsGovernanceService.php` (~3.5K LOC).
- **GraphicsGovernanceRepository** — JSON file I/O authority (legacy): `design-system-config.json`, template registry, runtime beacon. File: `mom/api/services/GraphicsGovernanceRepository.php`.
- **DesignTokenCatalogService** (NEW) — DB-aware token catalog reader/writer; honours 4-mode DataLayer ladder (JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY → POSTGRES_ONLY); resolves scope hierarchy; records simulation runs; fallback to JSON when DB unavailable. File: `mom/api/services/DesignTokenCatalogService.php`.
- **GraphicsGovernanceException** — typed exceptions emitted by the service.

## Frontend

Load order (in `mom/portal.html`):
1. `00a-registry-service.js`
2. `00b-theme-manager.js` — `window.HmTheme`: CSS-variable runtime, admin config cache, template preview cache, visual theme presets
3. `00ba-graphics-governance-service.js` — `window.HmGraphicsGovernance`: backend endpoint map + state machine
4. `00bb-graphics-authority.js` (NEW 2026-04-18) — the four public namespaces: `GraphicsAuthority`, `ControlKit`, `PreviewScenes`, `GovernancePanels`
5. (lazy-loaded when admin opens the Appearance tab) `00c-admin-appearance.js` — the Admin studio UI (9 sub-tabs, ~354 control instances)

### Public frontend API (new canonical surface)

| Namespace | Purpose |
|---|---|
| `GraphicsAuthority.catalog.{load,list,find,etag}` | Loaded token catalog |
| `GraphicsAuthority.snapshot.{load,get,scope}` | Effective token_key → value map for current scope + color mode |
| `GraphicsAuthority.tokens.{read,readNumeric,stage,stageWithUnit,revert}` | The single read/write surface every UI module must use |
| `GraphicsAuthority.draft.{snapshot,isEmpty,recordChange,clear}` | Staged changes buffer |
| `GraphicsAuthority.preview.simulate(opts)` | Opens the simulation modal — **every commit must flow through this** |
| `GraphicsAuthority.rollout.{stage,apply,rollback}` | SAP Save / Publish / Activate orchestration |
| `GraphicsAuthority.backend.{recordSimulation,listPreviewScenes,listComponentContracts,listThemeSchedules}` | Backend client shortcuts |
| `GraphicsAuthority.a11y.{announce,contrastRatio,wcagLevel}` | Accessibility helpers |
| `GraphicsAuthority.runtime.{subscribe,primeSubscription}` | Event subscription |
| `ControlKit.{renderDimensionSlider,renderColorSwatch,renderFontStackPicker,renderTextField,renderSegmentedOption,previewFrame}` | Widget factory — every widget auto-stages and exposes a Simulate (▶) button |
| `PreviewScenes.renderers.<name>` / `.openSimulationModal / .render / .suggestForDraft` | Replayable scene gallery |
| `GovernancePanels.{impact,rollout,audit,compliance,drift,changeSet,lineage,runtimeBeacon,debt}` | Governance panel facade |

### Legacy bridges (do NOT use in new code)

`window._hmSet`, `window._hmSetWithUnit`, `window._admGraphicsMarkChange` are preserved as aliases that delegate to `GraphicsAuthority.tokens.stage()` / `draft.recordChange()`.

## Database Tables (migration 148)

- **graphics_token_catalog** — registry of every tunable token. Fields: `token_key` (natural key, UNIQUE), `css_variable`, `layer` (global/semantic/component), `family`, `subfamily`, `component_scope`, `value_type`, `unit`, `min/max/step_numeric`, `default_light`, `default_dark`, `default_high_contrast`, `default_print`, `alias_of`, `wcag_min_contrast`, `wcag_pair_token`.
- **graphics_token_value** — effective values per (token_key, scope_type, scope_id, color_mode). Scope types: organization / tenant / environment / role / user. Color modes: light / dark / high-contrast / print / andon / maintenance-amber / colorblind-{deuteranopia,protanopia,tritanopia,achromatopsia}. Includes `draft_value` for staging and `rollout_id` for rollout attribution.
- **graphics_component_contract** — per-component whitelist of overridable token_keys (SLDS Theming-Hook model).
- **graphics_preview_scene** — replayable preview scenes (SAP sample-page model); maps `scene_key → renderer` (JS function under `PreviewScenes.renderers`).
- **graphics_simulation_run** — evidence row per "preview before commit". Fields: staged_changes (jsonb), scenes_rendered (text[]), wcag_report, colorblind_reports, screen_reader_findings, outcome (reviewed / committed / discarded / failed-gates).
- **graphics_rollout_scope** — draft → staged → canary → applied → rolled-back with prior_snapshot for 1-click rollback. `wcag_gate_status` blocks `applied` unless waived.
- **graphics_theme_schedule** — shift-scheduled theme swap (Day / Swing / Night / Maintenance-Amber). Manufacturing differentiator — SAP/Fluent/Siemens/Tulip don't publish an equivalent.
- **graphics_saved_experiment** — named A/B theme draft slots.
- **graphics_wcag_check** — materialized WCAG/colorblind report per rollout; blockers prevent apply.
- **graphics_module_binding** — scanner-populated (token_key → module_key) so impact analysis can answer "what modules break if I change this token?".

## Routes

Action-key routes (`api.php?action=...`):
- Token catalog: `graphics_token_catalog_list`, `graphics_token_catalog_snapshot`
- Registries: `graphics_preview_scenes_list`, `graphics_component_contract_list`, `graphics_theme_schedule_list`
- Simulation: `graphics_simulation_run_record`
- (+49 existing governance actions listed in `mom/api/routes/graphics-governance-routes.php`)

REST routes (`/api/graphics/...`):
- `GET /api/graphics/tokens/catalog`, `.../tokens/snapshot`
- `GET /api/graphics/preview-scenes`, `.../component-contracts`, `.../theme-schedules`
- `POST /api/graphics/simulation-runs`

## Business Rules

1. **No hardcoded visuals** (CLAUDE.md rule). Any hex/px/font-family literal in a portal script is a violation; scan with `tools/scripts/graphics-audit/scan-hardcoded-visuals.php`.
2. **Preview before commit.** Every Save in a graphics edit UI MUST flow through `GraphicsAuthority.preview.simulate()`, which records a row in `graphics_simulation_run`. Direct writes to `HmTheme.saveAdminConfig` are allowed only through the bridge path that still stages + simulates.
3. **WCAG gate.** If any staged color pair (foreground vs. `wcag_pair_token`) fails the declared `wcag_min_contrast`, the Commit button is disabled unless an active waiver covers the rollout.
4. **Three theme dictionaries are mandatory** (Fluent 2 rule). Every token declared in `graphics_token_catalog` SHOULD have `default_light`, `default_dark`, and `default_high_contrast` set (migration 148 seeds all three for seeded tokens).
5. **Scope resolution is most-specific-wins.** Order: `user` > `role` > `environment` > `tenant` > `organization` ("default"). A missing value at a specific scope falls through to the next broader one.
6. **Rollouts retain prior snapshot.** Rollback is 1-click: `graphics_rollout_scope.prior_snapshot` is the exact token_value rows overwritten on apply.
7. **Shift-scheduled theme swaps** are advisory in JSON_ONLY mode and authoritative once `graphics_theme_schedule` is polled by a runtime scheduler (not yet wired; `next_fire_at` / `last_fired_at` columns reserved).

## Gotchas

- `recordSimulationRun` passes `scenes_rendered` as a PG `text[]`. PDO bind-as-string would stringify a PHP array to `"Array"` and silently swallow the INSERT inside the catch. The service uses `toPgTextArrayLiteral()` to format `{"a","b"}` before binding — mirror this pattern for any future text[] inserts.
- `_esc()` in `00bb-graphics-authority.js` escapes HTML entities but not JS quotes. Handler builders use `_jsAttr()` when interpolating a value into an inline `onclick="..."` JS string.
- Token values that contain a literal double-quote in seed data would break the JSON_ONLY catalog preview — `pgArrayToPhp` handles the Postgres text-array escape dialect.

## Entry Points (typical AI tasks)

- "Add a new visual parameter" → migration adding a row to `graphics_token_catalog` + update the relevant `graphics_component_contract.overridable_tokens` + (optional) new `graphics_preview_scene` + call sites use `GraphicsAuthority.tokens.read('new.key')`.
- "Migrate a hardcoded literal" → pick the matching `token_key` from the catalog (scanner output is your worklist), replace the literal with a `var(--...)` CSS binding or a `GraphicsAuthority.tokens.read()` call.
- "Add a new simulation scene" → add a row to `graphics_preview_scene` + add a renderer function under `PreviewScenes.renderers.<name>` + (optional) update `PreviewScenes.suggestForDraft`.
- "Add a shift-aware color mode" → add the color mode to `DesignTokenCatalogService::COLOR_MODES` + insert value rows for the new mode + add a `graphics_theme_schedule` entry.
