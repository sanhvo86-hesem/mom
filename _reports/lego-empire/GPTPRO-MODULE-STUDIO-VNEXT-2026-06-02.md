# HESEM Module Studio vNext — SSOT Re-architecture Plan + 3 Parallel Upgrade Prompts

**Date:** 2026-06-02  
**Target repo:** `sanhvo86-hesem/mom`  
**Scope:** Module Studio, Appearance overlap, graphics/token/theme/module registry authority, UI validation, backend contract discipline.  
**Posture:** development / prototype / pre-production readiness. This is not a production cutover package.

---

## 0. Executive decision

The current Module Studio is valuable as a working integration prototype, but it is **not yet a clean world-class operating model**. It wires many backend routes and has useful surfaces, yet the information architecture still violates the principle:

> one concept, one authoritative write path, one scope, one registry, one auditable mutation route.

The upgrade must not simply move panels around. It must establish a governed design/module operating system:

1. **Lego** becomes the single workbench for token-aware components, L3 blocks, L4 templates/archetypes, L5 build packets, authoring, assembling, and validation.
2. **Modules** becomes lifecycle and metadata management, not an inline dumping ground for both metadata and content edits.
3. **Presets** replaces “Theme Template.” Presets are a governed library of named token override bundles with rich editing, validation, audit, lineage, and impact analysis.
4. **Settings** becomes a peer tab for global mode, typography, motion, and density policy. These settings write to the token authority, not to localStorage as an authority.
5. **Governance** becomes the single place for rollout, compliance, audit, waiver, validation evidence, and release blockers.
6. **Reference** is rebuilt as a generated Authority Playbook, not a mechanical aggregation of old panels.

Target top-level Module Studio tabs:

```text
Lego | Modules | Presets | Settings | Governance | Reference
```

Tabs to remove/absorb:

```text
Tokens  -> not top-level; becomes L0 inside Lego and token read/write service behind Settings/Presets.
Theme   -> replaced by Presets + Settings; old Theme Template disappears.
Mẫu bố cục -> L4/L5 Template Registry inside Lego and create-module wizard.
Tuân thủ -> Governance, with source-linked evidence and release gating.
Nâng cao -> dismantled: import/export to Presets/Settings, rollout to Governance, custom CSS removed or audited dev escape hatch.
```

---

## 1. Repo-grounded diagnosis

### 1.1 Current Module Studio is wired, but its information architecture is still transitional

`32-module-studio.js` declares Lego, Modules, and Theme as backend-wired surfaces and uses backend routes such as `graphics_block_contract_save`, `module_schema_*`, and `graphics_theme_preset_*`. However, the actual surface registry also exposes `tokens` and `reference`, meaning the current shell has already outgrown the original 3-surface model.

Current weakness:

```text
Surface registry = lego | tokens | modules | theme | reference
```

Target:

```text
Surface registry = lego | modules | presets | settings | governance | reference
```

### 1.2 Theme/Theme Template is duplicated

The existing Module Studio Theme surface renders global theme knobs using the old Appearance renderer and then renders a preset library below it. The old Appearance Theme tab also has Mode, Color, Typography, Density, Motion, and Theme Template subtabs. This creates two conceptual layers in one place and repeats density/radius/control editing across Theme Template and Density.

Target:

```text
Presets = named token override bundles only.
Settings = global behavior/system settings only.
No “Theme Template” subtab.
No duplicate density/radius/control knobs in two places.
```

### 1.3 Current preset editor is too shallow

The current preset edit form covers only:

```text
display_name_vi
brand
density_px
control_h_px
radius_outer_px
radius_inner_px
```

World-class preset editing must cover identity, lineage, supported modes, primitive/semantic/component token bindings, typography, spacing policy, radius/elevation, motion, status colors, data-viz palette, focus states, accessibility thresholds, preview scenes, scope rules, compatibility notes, and release/audit metadata.

### 1.4 Module creation and edit are underspecified

Current create flow still uses a native prompt and creates a minimal schema. This is not acceptable for an ERP/MOM/MES/eQMS-grade module registry.

Target create wizard:

```text
Step 1: identity and ownership
Step 2: route and authority class
Step 3: template/archetype
Step 4: preset/settings inheritance
Step 5: zones and block composition
Step 6: backend bindings/data sources
Step 7: roles/permissions/workflow/evidence boundary
Step 8: validation preview and commit
```

Target module actions:

```text
Edit metadata   -> edits identity, route, roles, lifecycle, owner, category, tags, intended use, authority class.
Edit content    -> opens Lego Composer to edit zones, blocks, slots, props, data bindings, preview scenes.
Version history -> compares metadata and content changes separately.
Archive/restore -> soft-delete lifecycle with stateful includeDeleted UI.
```

### 1.5 Archive checkbox bug root cause

The checkbox state is not preserved in Module Studio state. `loadModules(t.checked)` fetches the correct list, but `paintBody()` re-renders the toolbar with a fresh unchecked checkbox. Surface switching also hard-resets modules to `loadModules(false)`.

Fix pattern:

```javascript
state.includeDeleted = false;

function renderModules() {
  var checked = state.includeDeleted ? ' checked' : '';
  // render checkbox with checked attribute
}

function loadModules(includeDeleted) {
  state.includeDeleted = !!includeDeleted;
  ...
}

// surface switch
if (state.surface === 'modules') { loadModules(state.includeDeleted); }

// refresh/archive/restore
loadModules(state.includeDeleted);
```

### 1.6 Assemble / Author / Simulate are conceptually weak

“Simulate” is currently a vague shell action. If Lego components are interactive, simulation is not needed for normal interaction. It is needed for governed validation evidence.

Target:

```text
Assemble -> instance composition: zones, blocks, slots, props, data bindings.
Author   -> registry definition editing: component/block/archetype contracts.
Validate -> replaces vague “Simulate”: preview scenes, interaction checks, WCAG, no-hardcode, visual snapshots, API bindings, impact analysis, evidence record.
```

This makes interaction native and validation explicit.

### 1.7 Reference tab must be rebuilt

Current Reference mechanically embeds old accessibility/analytics/standard panels. That is not a world-class reference system.

Target Reference = generated Authority Playbook:

```text
Authority map: concept -> owner -> write path -> backend route -> registry table -> evidence.
Level model: L0 token -> L2 component -> L3 block -> L4 archetype -> L5 build packet.
Standards map: WCAG, DTCG export target, OpenAPI, RFC 9457, governance gates.
Anti-patterns: duplicate controls, localStorage authority, raw hex/px, custom CSS, unknown block IDs.
Decision log: why tabs exist and where each capability lives.
```

---

## 2. Target authority ledger

| Concept | Authoritative write path | Backend/table/contract | UI owner | Consumers |
|---|---|---|---|---|
| Global token value | token value command | `graphics_token_catalog` + `graphics_token_value(scope='organization:default')` | Settings / Presets | Runtime, Lego, Modules |
| Preset | preset command | `graphics_theme_preset` + token override map | Presets | Module schema, runtime theme engine |
| Component contract L2 | component contract command | `graphics_component_contract` | Lego Author | Block registry, runtime |
| Block contract L3 | block contract command | `graphics_block_contract` | Lego Author | Lego library, modules |
| Archetype/template L4 | archetype command | `graphics_module_archetype` | Lego Template Registry | Create module wizard |
| Build packet/module content L5 | module content command | `module_schema_*` / build-packet schema | Lego Assemble / Modules Content | Runtime route/module renderer |
| Module metadata | metadata command | `module_schema_*` metadata subset | Modules Metadata | Navigation, authorization, catalog |
| Governance evidence | validation/rollout/audit command | graphics simulation/QA/audit/rollout endpoints | Governance | Release gate, audit trail |
| Reference/playbook | generated read-only projection | registry + docs + contracts | Reference | Developers/admin/AI |

LocalStorage is allowed only as:

```text
runtime cache / optimistic draft cache / last active UI preference
```

LocalStorage is never allowed as:

```text
authority, audit trail, compliance evidence, committed preset, committed token value, committed module schema
```

---

## 3. New Module Studio information architecture

### 3.1 Lego tab

Sublevels:

```text
L0 Tokens          read token catalog, token usage, token picker, no free literal input
L2 Components      component contracts, overridable token map, preview scenes
L3 Blocks          curated blocks, slots, variants, a11y contract, allowed data bindings
L4 Templates       archetypes, zones, allowed blocks, forbidden patterns
L5 Build Packets   module content composition, zones/blocks/slots/data, manifest validation
```

Mode strip inside Lego:

```text
Browse | Assemble | Author | Validate
```

Rules:

```text
Browse = read-only registry exploration.
Assemble = edit module content only.
Author = edit registry definitions only, requires permission and audit.
Validate = run evidence suite, not casual simulation.
```

### 3.2 Modules tab

Primary role:

```text
module catalog, lifecycle, ownership, metadata, versions, archive/restore, content-entry link
```

Required actions per row:

```text
Edit metadata
Edit content
Version history
Validate
Archive/Restore
```

### 3.3 Presets tab

Replaces:

```text
Theme Template
```

Table columns:

```text
Preset | Scope | Base/Lineage | Modes | Brand/Palette | Density Policy | A11y status | Consumers | Version | Status | Actions
```

Actions:

```text
Preview
Apply to org/module/draft scope
Edit
Clone
Validate
Impact
Archive/Restore
Export DTCG
```

Editor groups:

```text
Identity & lineage
Modes and supported contexts
Primitive token seeds
Semantic color roles
Typography ramp
Spacing/density policy
Radius/elevation/shadow
Motion/easing/duration
Control metrics
Focus/interactive states
Status and data-viz palettes
Accessibility thresholds
Preview scenes and validation profile
Scope and allowed consumers
Release notes and audit metadata
```

### 3.4 Settings tab

Absorbs Mode / Typography / Motion and global policy controls.

Subtabs:

```text
Mode
Typography
Motion
Density & Control Policy
Color System Policy
Runtime Cache
```

Settings writes only to global token authority and system policy records. It does not edit presets directly; it can generate a preset draft via explicit action.

### 3.5 Governance tab

Absorbs:

```text
Tuân thủ
validations from Accessibility
rollout and audit parts of Nâng cao
release blockers
waivers
impact analysis
```

Contents:

```text
Validation queue
WCAG evidence
No-hardcode gate
Registry completeness
Impact analysis
Rollout/canary/rollback
Audit history
Waivers
Release blockers
Evidence pack export
```

### 3.6 Reference tab

Read-only generated Authority Playbook, not a mechanical panel collection.

Sections:

```text
Authority map
Level model L0-L5
Registry contracts
API contracts
Token vocabulary
Pattern catalog
Standards-to-gates map
Anti-pattern catalog
Decision log
Troubleshooting
```

---

## 4. Backend/API requirements

Existing backend actions are useful and should be reused where correct:

```text
graphics_theme_preset_list/save/delete/clone
graphics_block_contract_list/save
graphics_module_archetype_list/save
graphics_component_contract_save
module_schema_list/get/save/delete/restore/versions/restore_version/validate_bindings
graphics_simulation_run_record
graphics_qa_gate_run
graphics_rollout_stage/apply/rollback
graphics_audit_history
```

Potential additions, only if missing:

```text
graphics_theme_preset_get
graphics_theme_preset_validate
graphics_theme_preset_archive
graphics_theme_preset_restore
graphics_theme_preset_impact
graphics_token_value_save
graphics_token_value_validate
module_schema_metadata_save
module_schema_content_save
module_build_packet_validate
mstudio_authority_map_get
```

All new/changed backend endpoints must follow:

```text
OpenAPI-described request/response contract
RFC 9457 Problem Details errors
CSRF/write request enforcement
permission check
audit_events write for mutation
optimistic locking via baseVersion / if-match equivalent
rollback/recovery path
contract test
```

---

## 5. Acceptance gates

Every prompt below must produce:

```text
implementation report
QA report
SSOT authority matrix
backend contract delta report
forbidden hardcode scan result
node --check / PHP syntax result
E2E smoke result
rollback plan
final decision phrase
```

Stop immediately if:

```text
A UI writes to localStorage as authority.
A preset editor lets arbitrary hex/px into non-primitive token slots.
A module build packet contains raw style/HTML/literal px/unknown block.
A registry mutation lacks backend route, permission, CSRF, audit, and optimistic lock.
A workspace mutates authoritative data without explicit author mode and evidence.
A top-level tab duplicates another tab’s write path.
Reference becomes a mechanical aggregate again.
Archive checkbox loses state after render.
```

---

# PROMPT 1 — Module Studio Shell, IA, Module Lifecycle, Archive Fix

## Title

```text
HESEM Module Studio vNext P1 — Shell IA + Module Lifecycle Split + Archive State Repair
```

## Branch

```text
codex/mstudio-vnext-p1-shell-modules-20260602
```

## Owned files

Primary:

```text
mom/scripts/portal/32-module-studio.js
mom/portal.html
```

Allowed new files:

```text
mom/scripts/portal/32a-mstudio-presets-settings.js      // loader target, may be absent in P1
mom/scripts/portal/32b-mstudio-lego-workbench.js        // loader target, may be absent in P1
mom/scripts/portal/32c-mstudio-governance-reference.js  // loader target, may be absent in P1
_tests/e2e/module-studio-vnext-p1.spec.js
_reports/module-studio-vnext/P1_*.md
```

Do not edit backend controllers in this prompt unless a syntax-only route include is required for loading static files. Backend feature work belongs to Prompt 2 or Prompt 3.

## Mission

Rebuild the Module Studio shell around the new target information architecture while preserving current working backend flows.

Target top-level tabs:

```text
Lego | Modules | Presets | Settings | Governance | Reference
```

Remove the top-level conceptual ambiguity:

```text
Tokens is not a top-level tab.
Theme is not a top-level tab.
Theme Template is not a top-level subtab.
```

Provide compatibility shims so external surfaces can register and replace built-ins without editing the shell.

## Required decisions

1. **Keep `window.MStudio.registerSurface` and harden it.** External files must be able to register `lego`, `presets`, `settings`, `governance`, and `reference` surfaces.
2. **Add script loader or portal includes** for the three new parallel files:
   - `32a-mstudio-presets-settings.js`
   - `32b-mstudio-lego-workbench.js`
   - `32c-mstudio-governance-reference.js`
3. **Fix archived checkbox state** using explicit `state.includeDeleted` and checked rendering.
4. **Split module row actions** into:
   - `Sửa thông tin`
   - `Sửa nội dung`
   - `Kiểm tra`
   - `Lịch sử`
   - `Archive` / `Khôi phục`
5. **Replace native prompt-based module creation** with a modal/wizard shell, even if deeper content steps are initially placeholders.
6. **Do not duplicate preset/settings implementation.** P1 shell may show placeholder surfaces until Prompt 2 registers replacements.
7. **Do not duplicate Lego implementation.** P1 shell may keep current Lego fallback until Prompt 3 registers replacement.

## Implementation requirements

### A. Shell state

Add state keys:

```javascript
state.surface = 'lego';
state.includeDeleted = false;
state.moduleDraft = null;
state.moduleEditMode = null; // metadata | content | null
state.validationRun = null;
```

Surface metadata target:

```javascript
var SURFACE_META = {
  lego:       { label: '🧱 Lego', order: 10 },
  modules:    { label: '📦 Modules', order: 20 },
  presets:    { label: '🎭 Presets', order: 30 },
  settings:   { label: '⚙️ Settings', order: 40 },
  governance: { label: '🛡️ Governance', order: 50 },
  reference:  { label: '📖 Reference', order: 60 }
};
```

Backward compatibility:

```text
If old links request surface=theme -> redirect internally to presets.
If old links request surface=tokens -> redirect internally to lego with level=L0 or settings depending final state.
```

### B. Archive checkbox repair

Render checkbox as:

```javascript
'<input type="checkbox" data-ms="mod-incdel"' + (state.includeDeleted ? ' checked' : '') + '>'
```

`loadModules(includeDeleted)` must set state before paint:

```javascript
state.includeDeleted = !!includeDeleted;
state.modules = null;
paintBody();
...
```

Surface switch must preserve state:

```javascript
if (state.surface === 'modules') { loadModules(state.includeDeleted); }
```

Refresh/archive/restore/version rollback must use `state.includeDeleted`, not a DOM checkbox query.

### C. Module create wizard

Replace `window.prompt()` with a modal/panel using token-bound CSS. Minimum fields:

```text
moduleId or generated slug
Tên VI
Tên EN
Subtitle VI/EN
Icon
Domain / category
Route
Authority class: workspace projection | authoritative record shell | authoritative collection | admin tool
Module archetype
Theme preset key
Roles
Owner
Tags
Intended use
Status: draft by default
```

Creation payload must still call `module_schema_save` with `baseVersion` omitted for new module.

Do not allow raw style fields.

### D. Module edit split

Row action labels:

```text
✎ Thông tin
🧱 Nội dung
✅ Kiểm tra
Lịch sử
Archive/Restore
```

Metadata edit form must only edit metadata fields.

Content edit action must not alter metadata. It should either:

```text
- switch to Lego tab with selected module context, or
- open a placeholder content editor panel that Prompt 3 will replace.
```

### E. Validation action

Add row-level `Validate` button that calls existing `module_schema_validate_bindings` and displays result. Do not invent pass/fail if backend response is advisory; label unresolved bindings as advisory unless the backend marks fatal.

### F. Loader/registration support

Ensure the shell can survive if external surface files are not loaded.

`window.MStudio.api` must expose:

```javascript
getJson
post
toast
esc
state
host
repaint
repaintBody
selectSurface(surface, options)
openModuleContent(moduleId)
openModuleMetadata(moduleId)
validateModule(moduleId)
```

## Tests

Run at minimum:

```bash
node --check mom/scripts/portal/32-module-studio.js
```

If E2E harness exists:

```bash
npx playwright test _tests/e2e/module-studio-vnext-p1.spec.js --project=chromium
```

Manual/DOM assertions:

```text
1. Module Studio top tabs are exactly Lego, Modules, Presets, Settings, Governance, Reference.
2. No top-level Theme tab.
3. No top-level Tokens tab.
4. Modules checkbox remains checked after loading archived rows.
5. Unchecking hides archived rows again.
6. Surface switch away/back preserves includeDeleted state.
7. Create module opens wizard, not window.prompt.
8. Module row shows Edit metadata and Edit content as separate actions.
9. No raw hex/px introduced except token data display or allowed fallback comments.
10. Existing backend list/get/save/archive/restore still works.
```

## Reports

Create:

```text
_reports/module-studio-vnext/P1_SHELL_IA_IMPLEMENTATION_REPORT.md
_reports/module-studio-vnext/P1_MODULE_LIFECYCLE_QA_REPORT.md
_reports/module-studio-vnext/P1_ARCHIVE_STATE_REPAIR_PROOF.md
_reports/module-studio-vnext/P1_SSOT_SURFACE_MAP.md
```

## Final decision phrase

One of:

```text
MSTUDIO_VNEXT_P1_PASS_READY_FOR_P2_P3_MERGE
MSTUDIO_VNEXT_P1_PASS_WITH_WARNINGS
MSTUDIO_VNEXT_P1_FAIL_BLOCK_MERGE
```

---

# PROMPT 2 — Presets Library + Settings + Token Authority Contract

## Title

```text
HESEM Module Studio vNext P2 — Presets Library + Settings Authority + Theme Template Retirement
```

## Branch

```text
codex/mstudio-vnext-p2-presets-settings-20260602
```

## Owned files

Primary:

```text
mom/scripts/portal/32a-mstudio-presets-settings.js
```

Allowed backend/contract files if needed:

```text
mom/contracts/graphics.theme-preset.vnext.schema.json
mom/contracts/graphics.settings.vnext.schema.json
mom/api/controllers/GraphicsGovernanceController.php
mom/api/routes/graphics-governance-routes.php
mom/database/migrations/*graphics_theme_preset*
mom/data/openapi/* or equivalent OpenAPI docs
_tests/e2e/module-studio-vnext-p2-presets-settings.spec.js
_reports/module-studio-vnext/P2_*.md
```

Do not edit `32-module-studio.js` except if P1 loader is missing and the merge coordinator approves. Prefer `window.MStudio.registerSurface()`.

## Mission

Replace Theme Template with a governed Preset Library and move Mode/Typography/Motion/Density policy into a peer Settings surface.

Register two surfaces:

```javascript
window.MStudio.registerSurface('presets', {...});
window.MStudio.registerSurface('settings', {...});
```

## Presets surface requirements

### A. Preset table

Columns:

```text
Preset
Status
Scope / allowed consumers
Base / lineage
Supported modes
Brand / palette summary
Density/control policy
A11y status
Used by modules
Version
Actions
```

Actions:

```text
Preview
Edit
Clone
Validate
Impact
Apply
Archive/Restore
Export DTCG
```

Rules:

```text
Built-in presets cannot be deleted.
Prefer archive/restore over hard delete.
Clone must preserve lineage via base_ref/source_key.
Apply must explicitly state scope: org, module, draft preview.
```

### B. Rich preset editor

Editor must be a modal or full-width detail drawer. It must not be a six-field form.

Sections:

```text
1. Identity & lineage
   preset_key, display_name_vi, display_name_en, description, status, base_ref, owner, tags, version note

2. Supported contexts
   color modes: light, dark, high-contrast, print
   device density: desktop, touch, shop-floor
   allowed consumers: global, module, preview-only

3. Primitive seeds
   brand seed, neutral seed, success/warning/danger/info seeds, data-viz seeds
   Store as governed primitive tokens or token references. Do not allow arbitrary semantic literal.

4. Semantic colors
   surface, surface-muted, text-strong, text-default, text-muted, border-subtle, border-default, focus-ring, selection

5. Typography
   font family token, base size token, type scale, line-height, font weight roles, monospace

6. Spacing/density
   master gap, section gap, panel gap, table density, form row density, grid gutter

7. Controls
   standard height, hit target policy, input/button/tab/chip alignment, icon size, control radius

8. Radius/elevation
   inner radius, card radius, panel radius, pill radius, shadow levels, elevation policy

9. Motion
   fast/base/slow durations, easing tokens, reduced-motion behavior, expressive/subtle multipliers

10. States
   hover, active, selected, disabled, loading, skeleton, focus-visible

11. Accessibility
   target contrast threshold, large-text threshold, focus visibility rule, colorblind simulation profile

12. Preview scenes
   selected preview scene set, required screenshots, interaction scripts

13. Impact and release
   modules using preset, changed tokens, risk class, rollout strategy, rollback target
```

### C. Data representation

Preset save payload should support both current simple shape and vNext rich shape. The vNext payload must normalize into:

```json
{
  "preset_key": "...",
  "display_name_vi": "...",
  "display_name_en": "...",
  "status": "draft|review|published|archived|deprecated",
  "base_ref": "...",
  "version": 1,
  "tokens": {
    "light": {
      "brand.primary": { "ref": "primitive.brand.900" },
      "space.master": { "value": 8, "unit": "px", "tier": "primitive" }
    }
  },
  "policies": {
    "density": "compact",
    "motion": "standard",
    "a11yContrast": "WCAG_AA"
  },
  "preview": {
    "sceneKeys": []
  }
}
```

A raw literal is permitted only when saved as a primitive token seed. Semantic/component slots must use token references.

### D. Validation

Add Validate button that checks:

```text
token reference resolution
invalid literal usage
mode completeness
WCAG contrast for key foreground/background pairs
focus-visible token presence
control height consistency
module impact list
no unknown token keys
no archived base_ref
```

Validation should call backend if available. If backend is missing, implement a frontend diagnostic but mark it as advisory and create a backend contract gap report.

### E. DTCG export

Add export action that emits DTCG-style token JSON. Treat DTCG as an interchange/export target, not the sole runtime authority.

## Settings surface requirements

Subtabs:

```text
Mode
Typography
Motion
Density & Control Policy
Color System Policy
Runtime Cache
```

Rules:

```text
Settings edits global organization/system policy only.
Settings must not silently edit a preset row.
Settings may offer “Create preset draft from current settings” as an explicit action.
```

Settings save path:

```text
Prefer graphics token authority / governance backend.
If current backend only supports old save config, wrap it as compatibility adapter and document gap.
localStorage may mirror for live preview but cannot be final authority.
```

## Backend contract requirements

Use existing actions where possible:

```text
graphics_theme_preset_list/save/delete/clone
graphics_token_catalog_snapshot
graphics_simulation_run_record
graphics_qa_gate_run
graphics_rollout_stage/apply/rollback
```

Add/verify actions if needed:

```text
graphics_theme_preset_get
graphics_theme_preset_validate
graphics_theme_preset_archive
graphics_theme_preset_restore
graphics_theme_preset_impact
graphics_token_value_save
graphics_settings_save
```

All new errors must use RFC 9457 Problem Details shape:

```json
{
  "type": "https://hesem.local/problems/validation-error",
  "title": "Validation error",
  "status": 422,
  "detail": "...",
  "instance": "...",
  "errors": []
}
```

Update OpenAPI/contracts if repository has a contract location.

## Tests

Run:

```bash
node --check mom/scripts/portal/32a-mstudio-presets-settings.js
php -l mom/api/controllers/GraphicsGovernanceController.php || true
```

E2E/DOM assertions:

```text
1. Presets tab exists and Theme Template tab does not exist.
2. Every preset row has Edit.
3. Edit opens rich grouped editor, not 6-field form.
4. Preset save uses backend action, not localStorage authority.
5. Settings tab exists peer to Lego/Modules.
6. Mode/Typography/Motion live preview works but Save is authority-backed or explicitly reports backend gap.
7. Validate returns pass/warn/fail evidence.
8. Export DTCG produces valid JSON.
9. No arbitrary custom CSS injection.
10. No raw hex/px outside primitive token seed/data display.
```

## Reports

Create:

```text
_reports/module-studio-vnext/P2_PRESETS_LIBRARY_IMPLEMENTATION_REPORT.md
_reports/module-studio-vnext/P2_SETTINGS_AUTHORITY_IMPLEMENTATION_REPORT.md
_reports/module-studio-vnext/P2_THEME_TEMPLATE_RETIREMENT_REPORT.md
_reports/module-studio-vnext/P2_BACKEND_CONTRACT_DELTA_REPORT.md
_reports/module-studio-vnext/P2_PRESET_VALIDATION_QA_REPORT.md
```

## Final decision phrase

One of:

```text
MSTUDIO_VNEXT_P2_PASS_READY_FOR_MERGE
MSTUDIO_VNEXT_P2_PASS_WITH_BACKEND_GAPS_DOCUMENTED
MSTUDIO_VNEXT_P2_FAIL_BLOCK_MERGE
```

---

# PROMPT 3 — Lego Workbench + Validate Evidence + Governance/Reference Rebuild

## Title

```text
HESEM Module Studio vNext P3 — Lego Level Workbench + Validate Evidence + Authority Playbook
```

## Branch

```text
codex/mstudio-vnext-p3-lego-governance-reference-20260602
```

## Owned files

Primary:

```text
mom/scripts/portal/32b-mstudio-lego-workbench.js
mom/scripts/portal/32c-mstudio-governance-reference.js
```

Allowed contract/test/report files:

```text
mom/contracts/module.build-packet.schema.json
mom/tools/release/check_module_manifest.php
_tests/e2e/module-studio-vnext-p3-lego-workbench.spec.js
_reports/module-studio-vnext/P3_*.md
```

Avoid editing `32-module-studio.js`; register replacement surfaces via:

```javascript
window.MStudio.registerSurface('lego', {...});
window.MStudio.registerSurface('governance', {...});
window.MStudio.registerSurface('reference', {...});
```

## Mission

Merge Lego and Tokens into one level-based Lego operating workbench; replace vague Simulate with explicit Validate evidence; rebuild Reference as generated Authority Playbook.

## Lego surface requirements

### A. Layout

Use a three-pane workbench:

```text
Left: level-aware registry library and filters
Center: live canvas / composition / preview scene
Right: inspector / contract / validation evidence
```

### B. Level tabs inside Lego

```text
L0 Tokens
L2 Components
L3 Blocks
L4 Templates
L5 Build Packets
```

Do not use Tokens as a top-level Module Studio tab.

Level definitions:

```text
L0 Tokens        token catalog, references, usage, read-only by default; edit via Settings/Presets authority
L2 Components    component contracts, overridable tokens, preview scene binding
L3 Blocks        block contracts, slots, variants, a11y contract, allowed data bindings
L4 Templates     module archetypes, zones, allowed/required blocks, forbidden patterns
L5 Build Packets module content composition for selected module
```

### C. Mode strip

Inside Lego:

```text
Browse | Assemble | Author | Validate
```

Rules:

```text
Browse: no mutation.
Assemble: edits module content/build packet only.
Author: edits L2/L3/L4 registry contracts only.
Validate: runs evidence suite only.
```

### D. Registry data sources

Prefer DB-backed actions:

```text
graphics_token_catalog_snapshot
graphics_component_contract_list / registry
graphics_block_contract_list
graphics_module_archetype_list
module_schema_get/save
module_schema_validate_bindings
```

If a registry falls back to static JS globals, label it as fallback in the UI and report backend gap.

### E. Author editors

L3 block editor must support more than name/status:

```text
block_key
display_name_vi/en
category
status
composed_of
root_class
slots
variant_axes
required_tokens
a11y_contract
preview_scene_key
deprecation_note
```

L4 archetype editor:

```text
archetype_key
display_name_vi/en
route_class
status
zones
zone_order
required_blocks
forbidden_patterns
a11y_contract
deprecation_note
```

All saves must use existing backend actions and display returned full row.

### F. Assemble editor

For a selected module:

```text
Choose archetype/template.
Show zones.
Only allow blocks permitted by zone contract.
Edit slots/props/data bindings via controlled widgets.
No raw style, no raw HTML, no literal hex/px.
Save via module_schema_save with baseVersion.
Run module_schema_validate_bindings before/after save.
```

### G. Validate replaces Simulate

Validate actions:

```text
Preview scene render
Interaction smoke
WCAG contrast/focus check
No-hardcode manifest check
Registry reference check
Backend binding check
Visual snapshot readiness
Impact report
Evidence record
```

Use backend actions where available:

```text
graphics_simulation_run_record
graphics_qa_gate_run
module_schema_validate_bindings
```

Label results:

```text
PASS
WARN
FAIL_BLOCK
NOT_RUN
BACKEND_GAP
```

Do not call it “Mô phỏng” as the primary concept. Vietnamese label can be:

```text
Kiểm tra / Validate
```

## Governance surface requirements

Register `governance` surface.

It must be a single place for:

```text
release blockers
change set
impact analysis
rollout/canary/rollback
waivers
audit history
runtime beacon
debt observatory
validation evidence
```

Do not duplicate controls from Settings or Presets. Governance can show status and launch approved rollout flows but must not edit token values directly.

## Reference surface requirements

Rebuild as Authority Playbook.

Sections:

```text
1. Concept authority map
   concept -> owner tab -> backend action -> registry/table -> evidence -> consumers

2. Level model L0-L5
   token -> component -> block -> template/archetype -> build packet/module

3. Standards-to-gates matrix
   WCAG -> contrast/focus/a11y tests
   DTCG export target -> preset/token export
   OpenAPI -> backend contract descriptions
   RFC 9457 -> error shape
   No-hardcode -> manifest gate

4. Anti-pattern catalog
   duplicate write path
   localStorage authority
   custom CSS injection
   raw hex/px in module JSON
   unknown block ID
   theme/template mixed in module content

5. Decision log
   why Theme Template was retired
   why Tokens is not top-level
   why Validate replaced Simulate
   why Modules metadata/content split exists

6. Troubleshooting
   archive state
   backend fallback
   missing registry row
   version conflict
```

Reference must be read-only and source-linked.

## Tests

Run:

```bash
node --check mom/scripts/portal/32b-mstudio-lego-workbench.js
node --check mom/scripts/portal/32c-mstudio-governance-reference.js
php -l mom/tools/release/check_module_manifest.php || true
```

E2E/DOM assertions:

```text
1. Lego has level tabs L0/L2/L3/L4/L5.
2. Tokens is not top-level but exists as L0 in Lego.
3. Browse cannot mutate.
4. Author L3 editor exposes slots/tokens/a11y/preview fields, not only name/status.
5. Assemble blocks unknown block references and raw style fields.
6. Validate records evidence and shows pass/warn/fail/not-run.
7. Governance does not duplicate Settings/Presets write controls.
8. Reference is Authority Playbook, not old panel aggregation.
9. No raw hex/px or inline style authority introduced.
10. Existing current portal still loads without JS console errors.
```

## Reports

Create:

```text
_reports/module-studio-vnext/P3_LEGO_LEVEL_WORKBENCH_IMPLEMENTATION_REPORT.md
_reports/module-studio-vnext/P3_VALIDATE_EVIDENCE_IMPLEMENTATION_REPORT.md
_reports/module-studio-vnext/P3_GOVERNANCE_REFERENCE_REBUILD_REPORT.md
_reports/module-studio-vnext/P3_SSOT_AUTHORITY_PLAYBOOK.md
_reports/module-studio-vnext/P3_QA_AND_VISUAL_SAFETY_REPORT.md
```

## Final decision phrase

One of:

```text
MSTUDIO_VNEXT_P3_PASS_READY_FOR_MERGE
MSTUDIO_VNEXT_P3_PASS_WITH_BACKEND_GAPS_DOCUMENTED
MSTUDIO_VNEXT_P3_FAIL_BLOCK_MERGE
```

---

## 6. Merge coordinator prompt after all 3 sessions finish

Run this only after P1/P2/P3 branches are complete.

```text
You are the HESEM Module Studio vNext merge coordinator.

Repo: sanhvo86-hesem/mom
Branches:
- codex/mstudio-vnext-p1-shell-modules-20260602
- codex/mstudio-vnext-p2-presets-settings-20260602
- codex/mstudio-vnext-p3-lego-governance-reference-20260602

Mission:
1. Review all reports under _reports/module-studio-vnext/.
2. Verify the final top-level tabs are exactly Lego | Modules | Presets | Settings | Governance | Reference.
3. Verify there is no top-level Tokens or Theme tab.
4. Verify Theme Template is retired and represented by Presets library.
5. Verify Mode/Typography/Motion live under Settings.
6. Verify Modules create uses wizard, not prompt.
7. Verify module actions are split into metadata/content.
8. Verify archive checkbox state is stable across re-render and tab switch.
9. Verify Lego has level tabs and Author/Assemble/Validate separation.
10. Verify Validate replaced vague Simulate and writes/shows evidence.
11. Verify Reference is read-only Authority Playbook.
12. Verify no localStorage authority remains for committed settings/presets.
13. Run JS/PHP syntax checks, hardcode scans, and focused Chromium E2E.
14. Produce merged go/no-go report.

Required output files:
- _reports/module-studio-vnext/MERGE_COORDINATOR_REVIEW.md
- _reports/module-studio-vnext/MERGE_SSOT_AUTHORITY_MATRIX.md
- _reports/module-studio-vnext/MERGE_QA_E2E_REPORT.md
- _reports/module-studio-vnext/MERGE_BACKEND_CONTRACT_GAP_REPORT.md

Final decision phrase:
- MSTUDIO_VNEXT_MERGE_PASS_READY_FOR_INTEGRATION_REVIEW
- MSTUDIO_VNEXT_MERGE_PASS_WITH_REPAIRS_PENDING
- MSTUDIO_VNEXT_MERGE_FAIL_BLOCK_NEXT
```

---

## 7. Final non-negotiable line

Do not accept “it looks grouped” as success. Success means:

```text
No duplicated write path.
No hidden authority.
No localStorage authority.
No uncontracted API.
No raw style in module content.
No module authoring without registry gate.
No validation without evidence.
No UI action without backend contract or explicitly marked backend gap.
```
