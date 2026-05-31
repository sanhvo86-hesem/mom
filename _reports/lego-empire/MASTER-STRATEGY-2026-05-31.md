# HESEM Lego Empire — Master Strategy for a World-Class Component System
### ERP / MOM / EQMS / MES • 2026-05-31

> **Mục tiêu (user brief):** "Đế chế Lego block đầy đủ nhất thế giới" cho phần mềm ERP/MOM/EQMS/MES — đồ hoạ đẹp, customize mạnh nhất, code tối ưu chạy nhanh & nhẹ, công nghệ tốt nhất hiện tại, chuẩn hoá, chuyên nghiệp.

This document is grounded in three parallel research threads (2026-05-31): (A) an honest audit of the **current** HESEM graphics/block stack, (B) the **state-of-the-art** web platform & design-token standards, and (C) a **benchmark** of SAP Fiori/Horizon, Microsoft Fluent 2, Salesforce SLDS 2, IBM Carbon, Siemens iX, Atlassian, Ant Design Pro, and Bloomberg-class data-dense terminals. Sources are cited inline.

---

## 0. TL;DR — the 12 decisions

1. **One block system, not two.** Today there are two disconnected systems — the legacy **Block Engine** (`00-block-engine.js`, ~14.5k lines, 196 catalog types) and the new **L3 BlockKit** (`00bc`/`00bd`, 6 governed blocks). Unify them under one registry + one renderer.
2. **6-layer Lego model**: **L0 tokens → L1 primitives → L2 components → L3 blocks → L4 archetypes → L5 page templates.** Every layer references only the layer below; nothing hardcodes.
3. **Tokens = DTCG 2025.10**, 3 tiers (primitive → semantic → component), authored as JSON, compiled by **Style Dictionary v4 (CI-only, no browser bundler)** → committed CSS custom properties. Our `graphics_token_catalog` (10 tables) is already this — formalize it to the DTCG interchange format.
4. **Palette is derived, not hand-maintained.** OKLCH + relative color + `color-mix()` + `light-dark()` + `contrast-color()` derive hover/active/subtle/border/on-brand/dark from **one** brand token. A tenant rebrands by setting `--brand` + density + radius — everything recomputes in the browser.
5. **Cascade governed by `@layer`** (`reset, tokens, components, modules, tenant, utilities`) — structurally ends the `!important` wars that produced the dark-mode `--input-bg` saga.
6. **Light-DOM template-literal components, NOT Shadow DOM.** For a data-dense, deeply-themeable, no-build app, global token theming + one stylesheet for 10,000 cells beats encapsulation. Keep the current render-function approach; formalize it.
7. **Customization control plane = Module Master**, backed by `GraphicsAuthority.tokens.stage()/preview.simulate()/publish.rollout()`. SLDS-2 model: semantic CSS custom properties are the tenant theming contract, overridden at runtime, never by forking component CSS.
8. **Density is a theme decision, set once per tenant/device** (Fiori rule: never mix densities in one hierarchy). Ship **32px standard** (desk) + **44px cozy** (shop-floor tablet/gloved) as theme variants of one control-height token.
9. **A real industrial block catalog**: governed data-grid (sort/multi-select/expand/pin/virtualize/inline-edit), KPI/OEE tiles, event/alarm feed, machine-status grid, gauge, workflow/stepper, traceability tree, schedule/gantt, status/severity system — modeled on Siemens iX + SAP Digital Manufacturing.
10. **Performance budgets are hard gates**: ~14KB critical CSS, ≤100KB first-load JS shell, ≤30KB per lazy widget, INP<200ms, LCP<2.5s. Achieve via `content-visibility`, manual virtualization >500 rows, native ESM + import maps + `IntersectionObserver` lazy hydration. The 14.5k-line engine + 18.8k-line builder must be code-split and lazy-loaded.
11. **A11y = WCAG 2.2 AA + ARIA APG patterns** for the hard widgets (combobox, grid, treegrid, dialog, menu, tabs); logical CSS properties + `dir=auto` + full VN-diacritic font coverage; **automated contrast gate in CI** so a tenant brand color can't drop below AA.
12. **Defense-in-depth governance**: widen the no-hardcode CI gate beyond `09v3-*.js`, add a token-contrast lint, add codemods to migrate legacy literals → tokens, keep component contracts + simulation-run evidence.

---

## 1. Vision & North Star

A manufacturing operations platform lives or dies on **information density, speed, and trust**. The "Lego empire" is not "more components" — it is a **governed kit** where:

- **Building a module = assembling pre-designed blocks + filling data slots.** No hand-written component HTML, no hex/px literals, ever. (This is already HESEM policy; we make it structurally impossible to violate.)
- **One brand seed restyles the entire product** for a new SaaS tenant — instantly, in the browser, with guaranteed contrast.
- **The same kit serves the desk analyst (32px, dense) and the shop-floor operator (44px, gloved, day/night andon)** by switching a theme, not rewriting screens.
- **Every screen is fast**: sub-100ms interactions, virtualized grids over tens of thousands of lots/orders, lazy-loaded widgets.

North-star benchmark: **SLDS 2's runtime tenant theming + Fiori's density discipline + Siemens iX's industrial catalog + Carbon/ProTable's data-grid + Bloomberg's temporal-density mindset.**

> **Information density, not visual density.** Bloomberg's real edge isn't cramming pixels — it's *instant data + millisecond navigation + keyboard-first*. Value density = value ÷ (space × time). Optimize **temporal** density (prefetch, virtualize, <100ms) and **value** density, not pixel-cramming. ([UI Density, Matt Ström](https://mattstromawn.com/writing/ui-density/))

---

## 2. Current-State Assessment (honest baseline)

### 2.1 Genuine strengths to build on

| Area | What exists | Why it's strong |
|---|---|---|
| **Token authority (L0)** | 10 DB tables (mig 148): `graphics_token_catalog`, `_value`, `_component_contract`, `_preview_scene`, `_simulation_run`, `_rollout_scope`, `_theme_schedule`, `_saved_experiment`, `_wcag_check`, `_module_binding`. ~95–110 tokens. `DesignTokenCatalogService` (780 lines) with scope hierarchy (user>role>env>tenant>org) + color-mode triad (light/dark/HC/print). | Enterprise-grade, mirrors SAP Theme Designer + Fluent + SLDS contract model. WCAG contrast pairs + colorblind sim + blocker gates baked in. Shift-scheduled themes (andon) is a genuine MES differentiator. |
| **Frontend authority** | `GraphicsAuthority` (00bb, 852 lines): single read entry `tokens.read()`, draft buffer, `preview.simulate()` → `graphics_simulation_run` evidence, `publish.rollout()`. ControlKit edit widgets, PreviewScenes. | Correct "stage → simulate → publish → rollback" enterprise flow. No mutation without preview evidence. |
| **SSOT discipline** | One control height (32px, mig 230); one master gap + one section gap (mig 227); admin-only token family deleted (admin uses same tokens); Module Sample as canonical showcase. | Matches Fiori "stable name / variable value", Carbon spacing grid, SLDS "no admin-only system". Eliminates whole classes of drift. |
| **Governance/CI** | 3 gates in deploy.yml: `check_graphics_no_hardcode.php`, `check_graphics_block_registry.php`, `check_graphics_archetype_registry.php`. Component contracts whitelist overridable tokens. | Defense-in-depth, exactly the SLDS-blueprint + ESLint-enforcement pattern. |
| **L3/L4 seed** | BlockKit (6 published blocks w/ slots/variants/required-tokens/a11y contract) + ArchetypeKit (2 archetypes). | Clean, governed, token-aware — the correct shape for the future. |

### 2.2 Weaknesses & gaps (what blocks "world-class")

1. **Two parallel, unconnected block systems.** `BLOCK_CATALOG` (196 types in the 14.5k-line engine) ≠ `__HM_BLOCK_REGISTRY__` (6 L3 blocks). No shared namespace, no bridge. A module schema cannot reference an L3 block. **This is the #1 architectural debt.**
2. **Three render paths of unequal quality:**
   - *Builder canvas* (`_renderBlockPreview`) — schematic wireframes only.
   - *Engine* (`renderModuleFromSchema` → `_renderBlockInner`) — the real render; chart variants self-dispatch; **but many renderers hardcode px/hex** instead of reading tokens.
   - *Runtime router* (`01-module-router.js`) — a **separate, simplified switch** that only handles ~13 base types and prints "Unsupported" for the rest (and is HMV4-forbidden to edit).
   The same module renders differently depending on path.
3. **Token-binding quality is inconsistent in the engine.** The L3 path is token-pure; the engine path mixes `var(--o3-*)` with literals like `'32px'`, `14px`, inline shadows; the JSON-schema path lets admins type raw `padding:"16px"` with no token widget/validation.
4. **Monolith weight & no code-splitting.** `00-block-engine.js` ≈ **827 KB** (~60KB gz), `31-module-builder.js` ≈ **1.27 MB** (~70KB gz), loaded eagerly. No lazy hydration.
5. **No virtualization.** Data tables render all rows upfront → DOM bloat & scroll jank on large datasets.
6. **Token coverage holes**: line-height scale shallow (3 vs Material's 5), no letter-spacing tokens, incomplete per-component state tokens (hover/active/disabled/focus), no responsive/breakpoint token variants, no explicit elevation layer tokens.
7. **No DTCG interchange / Figma / Style-Dictionary export.** Tokens are HESEM-internal; no standard `tokens.json`, no auto-generated CSS root set (orders-v3.css is hand-maintained), no token docs/usage map surfaced.
8. **Builder properties inspector isn't token-aware** — no ControlKit widgets, no token autocomplete/validation.

---

## 3. Target Architecture — the 6-Layer Lego Model

```
L5  PAGE TEMPLATES   Overview-page, Detail/record-shell, Wizard, Dashboard
        │  arranges archetypes + page chrome (route class)
L4  ARCHETYPES       workspace-projection, authoritative-record, analytics-overview, ...
        │  arranges blocks into named zones (header/aside/body/footer)
L3  BLOCKS           data-grid, kpi-grid, toolbar.filtered, panel, event-feed, machine-status, ...
        │  clusters L2 components + data slots + variant axes
L2  COMPONENTS       button, input, select, table, chip, tab, badge, dialog, menu, gauge, ...
        │  bound to semantic + component tokens; a11y contract; states
L1  PRIMITIVES       box/stack/grid/cluster layout prims, text, icon, surface, divider
        │  pure token consumers; zero business logic
L0  TOKENS           primitive → semantic → component  (DTCG 2025.10 → CSS custom props)
```

**Invariants (enforced by CI):**
- A layer references **only the layer directly below** (a block uses components, never raw tokens for layout literals; a component uses semantic tokens, never primitive hex).
- **No literal** colors/sizes/spacing/radius/shadow/motion anywhere above L0.
- Every L2+ artifact declares its **token contract** (`graphics_component_contract.overridable_tokens`) and **a11y contract** (role, keyboard model, contrast).

**Unification plan for the two existing systems:** the L3 BlockKit registry becomes the **single source of block truth**. The 196 Block-Engine catalog types are reclassified:
- ~25–30 become **canonical L3 blocks** (data-grid, kpi-grid, form, filter-bar, timeline, board, charts-family, status-flow, record-detail, …).
- The long tail (mfg/iot/quality/insight/nav/media variants) become **variants/presets of those L3 blocks** (e.g. `mfg-andon-board` = `kpi-grid` preset with status tone; `iot-device-grid` = `status-grid` block; `insight-funnel` = `chart` variant). Today they're catalog aliases onto ~30 renderers + 15 new showcase renderers — that mapping IS the L3 collapse, already half-done.
- A thin **bridge**: `BLOCK_CATALOG[type].block_key` → resolve to an L3 block + preset, so existing module JSON keeps working while new modules author against L3.

---

## 4. Technology Foundation (ADR-style decisions)

> All web-platform features below verified production-safe (Baseline) or `@supports`-gated for 2026. See thread-B citations.

### ADR-1 — Tokens: DTCG 2025.10 + Style Dictionary v4 (CI-only)
- Author tokens as **DTCG 2025.10** JSON (`$value`/`$type`/`$description`/`$extensions`, brace-aliasing, `$ref`). The format reached **first stable version 2025-10-28** ([spec](https://www.designtokens.org/tr/2025.10/format/)).
- **3 tiers**: `primitive` (raw OKLCH/px) → `semantic` (`color.bg.surface`, `space.master`, `control.height.standard`) → `component` (`button.bg`, `kpi.value.size`). Components reference tier 2/3 only.
- **Style Dictionary v4** runs in **CI only** (a dev `npm` dependency; browser never sees it) → emits committed `tokens.css` (one `:root{}` per theme) + a `tokens.json` interchange artifact. ([Style Dictionary DTCG](https://styledictionary.com/info/dtcg/) — note full 2025.10 lands in v5; author canonical types now.)
- **Bridge to HESEM**: `graphics_token_catalog`/`_value` remain the runtime authority; add an exporter `catalog → DTCG json → Style Dictionary → tokens.css` so the hand-maintained `orders-v3.css` root set is **generated**, not authored. Modes/themes are owned by us at the CSS layer (DTCG defers modes to the Resolver module — don't wait).

### ADR-2 — Color & theming engine: OKLCH-derived palettes
One brand seed → whole palette, zero JS:
```css
@property --brand-h { syntax: "<number>"; inherits: true; initial-value: 224; }
:root{
  color-scheme: light dark;
  --brand:        oklch(.62 .13 var(--brand-h));
  --brand-hover:  oklch(from var(--brand) calc(l - .05) c h);
  --brand-active: oklch(from var(--brand) calc(l - .10) c h);
  --brand-subtle: color-mix(in oklab, var(--brand), white 88%);
  --brand-border: color-mix(in oklab, var(--brand), canvastext 18%);
  --on-brand:     contrast-color(var(--brand));            /* Baseline Apr 2026 */
  --bg:           light-dark(oklch(.99 0 0), oklch(.20 .01 var(--brand-h)));
}
```
OKLCH gives perceptually-uniform shades (equal `l` deltas look equal across hues — HSL can't). Gate `oklch(from …)` and `contrast-color()` behind `@supports` with `color-mix()` fallbacks. ([web.dev color theme](https://web.dev/articles/baseline-in-action-color-theme), [Smashing contrast-color](https://www.smashingmagazine.com/2026/05/building-self-correcting-color-systems-contrast-color/))

### ADR-3 — Cascade governance: `@layer`
Declare once, globally:
```css
@layer reset, tokens, components, modules, tenant, utilities;
```
Tenant overrides always beat component defaults **without `!important`**. This structurally encodes "no one-off CSS in a module's stylesheet" and retires the id-specificity hacks that caused the dark-mode `--input-bg` incident. ([MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer), Baseline since 2022.)

### ADR-4 — Component model: light-DOM template-literal renderers (NOT Shadow DOM)
Keep the current `renderXHtml()` string-builder approach into light DOM. Rationale: global `--o3-*` tokens + `@layer` apply directly (no `::part()` enumeration, no per-instance shadow style recalc), one stylesheet themes 10,000 grid cells, PHP can SSR the same HTML, zero build. Use `customElements.define` for *behavior* lifecycle if desired, but **render into light DOM** so theming stays global. Shadow DOM only for widgets embedded in foreign pages (not our own app). ([Smashing Shadow DOM](https://www.smashingmagazine.com/2025/07/web-components-working-with-shadow-dom/), [SLDS light DOM](https://developer.salesforce.com/docs/platform/lwc/guide/create-light-dom.html))

### ADR-5 — Responsiveness: container queries, not viewport media queries
Components adapt to their **panel** width via `@container` + container units. A KPI grid in a narrow aside reflows independently of the viewport. (Baseline Widely available Aug 2025.) Use **logical properties** (`margin-inline`, `inset-inline-start`) everywhere for VN/EN + future RTL resilience.

### ADR-6 — Performance & loading
- **`content-visibility:auto` + `contain-intrinsic-size`** for any long region ≤ ~500 rows (verified ~7× initial-render win); **manual vanilla windowing** beyond ~500 rows (render visible window + overscan, `IntersectionObserver` sentinel). Keep DOM nodes in the low hundreds.
- **No-bundler code-splitting**: native ESM + **import maps** (versioned specifiers double as cache-busting) + dynamic `import()` + `IntersectionObserver`-driven **lazy hydration** + `requestIdleCallback`. Split `00-block-engine.js` into *core dispatch + per-family renderers (lazy)* and `31-module-builder.js` into *editor shell + catalog + inspector (lazy)*.
- **Budgets (hard CI gates):** critical CSS ≤14KB inlined; first-load JS shell ≤100KB gz; each lazy widget ≤30KB gz; INP<200ms; LCP<2.5s.

### ADR-7 — Runtime tenant theming (SLDS-2 model)
Semantic CSS custom properties **are** the theming contract. A tenant override = one small `<style id="tenant-tokens">:root{…}</style>` inlined by PHP at load (no FOUC) + live `document.documentElement.style.setProperty('--brand', …)` for instant preview. Persist via `DataSyncMutationService` + a `graphics_simulation_run` row. Register theme tokens with `@property { syntax:"<color>" }` so a bad tenant value falls back to `initial-value` instead of breaking the page.

---

## 5. Customization Model — Module Master as the Control Plane

**One knob per concept** (matches existing SSOT rules, validated by Fluent theme-factory + Fiori density):

| Knob | Token | Effect |
|---|---|---|
| Brand | `--brand` (OKLCH or hue) | Entire palette (hover/active/subtle/border/on-brand/dark) recomputes |
| Density | `--o3-space` (8px) + `--o3-space-section` (12px) | All gaps scale; **set once per tenant/device**, never mixed in a hierarchy |
| Control height | `--o3-control-h-standard` | 32px desk theme / 44px cozy shop-floor theme |
| Radius | `--o3-radius` (4px) / `--o3-radius-card` (8px) | All controls/containers |
| Mode | `color-scheme` + `light-dark()` + `data-contrast="high"` | Light/dark/auto/high-contrast |

**Module Master tab** (`00c-admin-appearance-module-sample.js`) is the canonical control surface: it already renders every component with its token list and data-drives the L3/L4 sections. Extend it to be the **full theming console**: brand seed picker (with live WCAG readout from `graphics_wcag_check`), density/radius sliders (ControlKit), per-component override dock (mig 255), and a **simulate-before-publish** gate. Admin edits never touch component CSS — only token values.

**Governance (defense-in-depth):**
1. Widen `check_graphics_no_hardcode.php` `GOVERNED_GLOBS` from `09v3-*.js` to all new L2/L3 renderers as they tokenize; keep legacy grandfathered until migrated.
2. Add a **token-contrast lint** (CI) so a tenant's `--brand` can't pair below AA — sits next to existing `check_*` gates.
3. Add **codemods** (Atlassian pattern) to rewrite legacy `#hex`/`px` literals → token references during engine tokenization.
4. Keep **component contracts** (whitelist overridable tokens) + **simulation-run evidence** for every change.

---

## 6. The Block Catalog — target kit (industrial-grade)

Modeled on Siemens iX (~70 components, 9 categories), Carbon/ProTable data-grid, and SAP Digital Manufacturing dashboards. Each is **one governed L3 block** with token-driven density and variants/presets (the 196 legacy types collapse into these as presets).

**Foundation blocks**
- `shell.workspace` (topbar + tabs + body), `panel`, `toolbar.filtered`, `card-container`, `two/three-column`, `section-header`, `empty.state`, `breadcrumb`, `stepper`, `nav-pills`, `pagination`, `link-grid`.

**Data blocks (the crown jewel — one block, many presets)**
- **`data-grid`**: sortable headers, **multi-select batch actions**, **expandable rows**, **column show/hide + pin**, **server-side request+filter**, **virtualization (both axes)**, **inline edit**, density-driven row height. *Auto-generate the filter bar from the column schema* (ProTable's killer pattern) so table + filters + editable cells share one config object. ([Carbon data table](https://v10.carbondesignsystem.com/components/data-table/usage/), [ProTable](https://procomponents.ant.design/en-US/components/table))
- `data-cards`, `data-timeline`/event-feed, `record-detail`, `tree`/treegrid (BOM, lot genealogy, SO→JO→WO), `kanban`/board, `schedule`/gantt.

**Insight & chart blocks**
- `kpi-grid` (+ OEE/Availability/Performance/Quality preset), `scorecard`, `funnel`, `gauge`, `sparkline`, `chart` family (bar/line/area/stacked/combo/donut/heatmap/waterfall/box/histogram/scatter/radar), `variance`, `control-chart`/SPC/pareto.

**Industrial / MES blocks (Siemens iX + SAP DM)**
- `machine-status` grid (running/idle/down/setup), `andon-board`, `alarm/event feed`, `workflow`/process-map, `sla-timer`, `sensor-strip`, `device-grid`, `traceability tree`, `production-schedule`. ([Siemens iX components](https://ix.siemens.io/docs/components/overview), [SAP DM monitoring](https://learning.sap.com/courses/analyzing-manufacturing-data-in-sap-digital-manufacturing/production-quality-asset-and-oee-monitoring))

**Form blocks**
- `form` (auto-layout from field schema), `form-wizard`, `filter-bar`, `approval`, `checklist`/checksheet, `inspection-form`, `upload`, `signature`, `comment`.

**Status/severity = a first-class semantic token group** (machine running/idle/down/setup; alarm info/warn/critical), themeable per tenant, never hardcoded.

**Page templates (L5)**: Overview-page (plant/portfolio) → Detail/record-shell (line/order/asset) — the SAP DM two-tier pattern — plus Wizard and Analytics-overview.

---

## 7. Accessibility & i18n Standard

- **WCAG 2.2 AA** conformance bar; **ARIA APG** patterns for the hard widgets: **combobox** (`aria-expanded`/`aria-controls`/`aria-activedescendant`), **grid/treegrid** (roving arrow nav, single tab stop), **dialog** (focus trap + return focus + Esc), **menu/menubar**, **tabs**, **listbox**. ([APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/))
- **Focus**: visible indicators (2.4.11/2.4.13), logical order, roving tabindex.
- **Reduced motion**: tie motion-duration tokens to `@media (prefers-reduced-motion: reduce)`.
- **Contrast automation**: `contrast-color()` for foregrounds + `color-mix` borders tuned to clear 3:1/4.5:1; **CI contrast gate** on token pairs.
- **Forced colors**: honor `forced-colors: active`, use system colors (`canvastext`/`canvas`/`buttonborder`) at borders.
- **VN/EN i18n**: logical CSS properties + `dir="auto"`; never fix control widths from English text (VN diacritics are taller/wider — e.g. "Trưởng Phòng Đảm Bảo Chất Lượng"); pick a font stack with **complete Vietnamese combining-mark coverage**; test longest VN strings in narrowest container.

---

## 8. Performance & Loading Strategy

| Lever | Technique | Target |
|---|---|---|
| Critical CSS | Inline tokens + shell CSS in `<head>` | ≤14KB |
| First-load JS | Shell only; lazy everything else | ≤100KB gz |
| Per widget | Dynamic `import()` on visibility | ≤30KB gz |
| Long lists ≤500 | `content-visibility:auto` + `contain-intrinsic-size` | ~7× faster initial render |
| Long lists >500 | Manual vanilla windowing + overscan + `IntersectionObserver` | DOM nodes in low hundreds |
| Lazy hydration | `IntersectionObserver` → `import()` → `requestIdleCallback(mount)` | Off critical path |
| Cache-busting | Versioned import-map specifiers | No statement rewrites |
| Motion | `transform`/`opacity` only; transient `will-change` | No layout thrash |
| Interaction | Debounced reads→writes; memoized `{{ }}` expr cache | INP<200ms |

**Concrete debt to pay:** split the 827KB engine + 1.27MB builder; add a virtualized `data-grid`; memoize the expression evaluator (currently re-parses every change); lazy-load per-family renderers.

---

## 9. Migration Plan (incremental, no big-bang)

**Phase 0 — Foundations (already largely done):** token authority (mig 148), GraphicsAuthority, 3 CI gates, L3 BlockKit seed, control-height/density SSOT, Lego Showcase (161-block catalog proof, PRs #79/#80). ✅

**Phase 1 — Tokenize & generate (0–2 mo):**
- Add DTCG exporter (`catalog → tokens.json → Style Dictionary → tokens.css`); **generate** the `--o3-*` root set instead of hand-editing.
- Adopt OKLCH-derived palette + `@layer` ordering in a new `tokens.css`; ship behind `@supports` fallbacks.
- Tokenize the Block-Engine renderers: codemod `#hex`/`px` → token refs; widen no-hardcode gate to cover them.
- Add ControlKit token widgets + token autocomplete/validation to the Module Builder inspector.

**Phase 2 — Unify blocks (2–4 mo):**
- Bridge `BLOCK_CATALOG[type] → {block_key, preset}`; reclassify the 196 types into ~30 L3 blocks + presets.
- Promote the highest-value blocks to governed L3 with full slot/variant/token/a11y contracts + preview scenes: **data-grid** (with virtualization/multi-select/expand/pin/inline-edit/auto-filter), kpi-grid (+OEE preset), form (auto-layout), event-feed, machine-status, gauge, workflow, tree.
- Resolve the **three render paths**: make the engine path canonical; deprecate the router's parallel switch (coordinate re: HMV4 ADR-0004 forbidden-file constraint — propose a route-class that delegates to `renderModuleFromSchema`).

**Phase 3 — Performance & scale (3–6 mo):**
- Code-split engine + builder; lazy-hydrate widgets; virtualize data-grid; memoize expressions. Enforce budgets as CI gates.

**Phase 4 — Industrial catalog & templates (4–8 mo):**
- Ship the MES block set (andon, alarm feed, traceability tree, schedule/gantt, OEE dashboards) + L5 page templates (Overview→Detail). Add cozy 44px shop-floor theme + day/night andon schedules (table already exists).

**Phase 5 — Maturity (6–12 mo):**
- DTCG/Figma two-way sync; auto-generated token docs + usage map (surface `graphics_module_binding`); token version snapshots + rollback UI; publish `@hesem/design-tokens`.

---

## 10. Risks & Anti-patterns (do NOT do)

- **A parallel/admin-only design system** — SLDS unifies; HESEM already deleted its admin-only family. Keep it dead.
- **>3 token tiers or duplicate scales** — drift generator. Keep the 7-level→2-master collapse.
- **Mixing density modes in one hierarchy** — Fiori's explicit prohibition; density is a theme decision.
- **One-off CSS in a module stylesheet / targeting internal component classes** — breaks the contract; `@layer` + hooks prevent it.
- **Hardcoded hex/px/font/motion literals** — only automated linting catches these; widen the gate.
- **Shadow DOM inside our own app** — encapsulation fights token theming + data density here.
- **Optimizing visual density (cramming) over temporal/value density** — the data-dense trap; invest in speed + keyboard nav + virtualization.
- **Big-bang rewrite of the 14.5k/18.8k-line monoliths** — strangle incrementally behind the unified registry + bridge.

---

## 11. Appendix — source threads

- **A. Current-state audit** (this repo): token authority (mig 148, 10 tables, ~95 tokens), GraphicsAuthority/ControlKit/PreviewScenes, master-density/density-darkmode/orders-v3 CSS (2,539 lines / 126KB), L3 BlockKit (6 blocks) + L4 (2 archetypes), Block Engine (14.5k lines/827KB, 196 catalog types) + Module Builder (18.8k lines/1.27MB) + router, 3 CI gates. Two parallel systems, 3 render paths, inconsistent token binding, no virtualization.
- **B. Web platform & tokens**: DTCG 2025.10 (stable 2025-10-28), Style Dictionary v4, OKLCH/relative-color/`color-mix()`/`light-dark()`/`contrast-color()`, `@layer`, container queries, `content-visibility`, native ESM + import maps + `IntersectionObserver`, light-DOM vs Shadow DOM verdict, WCAG 2.2 + APG. (citations inline above)
- **C. Enterprise/industrial benchmark**: Fluent 2 (2-tier, theme-factory from brand ramp), SLDS 2 (runtime styling hooks = multi-tenant model), Carbon (numeric spacing, 4 row densities, `-compact` type), SAP Fiori/Horizon (stable-name/variable-value, cozy 44 / compact 32, UI Theme Designer, light/dark/HC×2), Siemens iX (~70 industrial components, runtime theme attrs), Ant Design Pro (ProTable auto-filter + virtualization + inline edit), SAP Digital Manufacturing (Overview→Detail OEE/Production/Quality dashboards), Bloomberg (temporal/value density). (citations inline above)

---

*Prepared 2026-05-31. This strategy formalizes and extends the existing Graphics Authority + Lego Block Registry direction; it is incremental, not a rewrite. Next concrete step recommended: Phase 1 — DTCG exporter + OKLCH/@layer `tokens.css` generation + tokenize the engine renderers behind a widened no-hardcode gate.*
