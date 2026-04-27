# F10 — Design System and Tokens

```
chapter_purpose: the visual language of HESEM; design tokens, Graphics Authority
                 architecture, simulation discipline, no-hardcode rule, per-pack
                 overlays, dark mode, density variants, migration discipline
owner_role:      Frontend Lead with Designer
adr_refs:        ADR-0009 (no-hardcode), ADR-0001 (pre-production posture),
                 ADR-0002 (frozen vocabulary), ADR-0005 (slice cycle)
version:         V10 deep upgrade
```

---

## 1. Design Token Authority Model (ADR-0009)

### 1.1 Architectural mandate

The Graphics Authority is the single source of truth for every visual parameter
in HESEM Operations Platform. ADR-0009 establishes this as a hard constraint
with no permitted exceptions. No JavaScript file, inline style attribute, HTML
template, or CSS literal outside of the authority layer may embed a color value,
pixel measurement, font stack string, or motion duration.

The word "hardcode" in HESEM has a specific technical meaning: any visual
parameter that is not resolved at runtime from the Graphics Authority is
considered hardcoded, regardless of whether it appears in a constant, an
environment variable read at module load time, or an interpolated string. The
test is runtime resolution, not compile-time variability.

### 1.2 Frontend read path — `window.GraphicsAuthority.tokens.read()`

In JavaScript, the ONLY permitted way to obtain a token value is:

```js
const value = window.GraphicsAuthority.tokens.read('<token_key>');
```

The `token_key` is the canonical identifier declared in `graphics_token_catalog`
(e.g., `'brand-primary'`, `'space-4'`, `'motion-duration-normal'`). The
function resolves the effective value for the current tenant and the current
mode (light/dark) and returns the resolved scalar. In JSON_ONLY mode it reads
from `mom/data/config/design-system-config.json` via `DesignTokenCatalogService`
and caches in `window.GraphicsAuthority._resolvedCache`. In POSTGRES_PRIMARY
mode it reads the per-tenant row from `graphics_token_value`, falling back to
the global default in `graphics_token_catalog.default_value`.

The optional second argument is a mode hint:

```js
const darkValue = window.GraphicsAuthority.tokens.read('background-surface-0', { mode: 'dark' });
```

When the mode argument is absent, the authority infers the mode from
`document.documentElement.dataset.colorScheme` which is set by the density/mode
toggle in the portal shell header.

Callers must never cache the result in a module-level constant. Token values can
change at runtime when a tenant admin commits a theme override via the simulation
flow. The read function uses an internal LRU cache invalidated on each
`graphics_token_value` commit event, so repeated reads within a render cycle are
cheap.

### 1.3 CSS bind path — `css_variable` from `graphics_token_catalog`

Every row in `graphics_token_catalog` carries a `css_variable` column. The
portal shell injects a `<style>` block into `<head>` that declares all CSS
custom properties:

```css
:root {
  --brand-primary: /* resolved value */;
  --space-4: 16px;
  --motion-duration-normal: 200ms;
  /* ... all tokens ... */
}
[data-color-scheme="dark"] {
  --background-surface-0: /* dark-mode resolved value */;
  /* ... dark overrides ... */
}
```

This injection happens in `mom/scripts/portal/00bb-graphics-authority.js` at
page bootstrap, before any module scripts run. The custom property names are
taken directly from the `css_variable` column — they are the canonical names
that all CSS in `mom/styles/module-template-v4.tokens.css` and
`mom/styles/module-template-v4.css` must reference.

In CSS, binding is written as:

```css
.hmv4-card {
  background: var(--background-surface-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
```

No other form is permitted. `var(--some-prop, #fallback)` with a hex fallback is
also forbidden; the fallback value must be another custom property or `initial`.

### 1.4 Backend authority — migration 148 and `DesignTokenCatalogService`

Migration `148_graphics_authority_tables.sql` creates three tables:

**`graphics_token_catalog`** — master catalog of all tokens:
- `token_key` (PK varchar) — canonical identifier, e.g. `brand-primary`
- `category` — color / spacing / radius / font / motion / shadow / tier-threshold / state
- `css_variable` — e.g. `--brand-primary`
- `default_value` — global default scalar or CSS expression
- `description` — human-readable purpose
- `deprecated_since` — null or version string; non-null triggers sunset header
- `successor_key` — when renamed, the replacement token_key

**`graphics_token_value`** — per-tenant overrides:
- `tenant_id` (FK) + `token_key` (FK) → composite PK
- `value` — the override scalar
- `committed_at` — timestamp of last admin commit
- `committed_by` — user_id of the committing admin
- `simulation_run_id` (FK to `graphics_simulation_run`) — proof that the
  override was simulated before commit; non-null enforced by a CHECK constraint.

**`graphics_simulation_run`** — simulation evidence log:
- `id` (PK uuid)
- `tenant_id`
- `token_key`
- `proposed_value`
- `scene_id` — which PreviewScene was executed
- `rendered_at`
- `approved_by` — set when the admin clicks Commit in the modal
- `committed` boolean

`DesignTokenCatalogService` implements two read modes controlled by the
`DATA_LAYER_MODE` environment variable:

- **JSON_ONLY**: reads `mom/data/config/design-system-config.json`, a flat
  key-value map. Per-tenant overrides are not available in this mode; the JSON
  file contains the single global set of defaults. Used in development and
  fixture-only testing.
- **POSTGRES_PRIMARY**: queries `graphics_token_catalog` for defaults and
  `graphics_token_value` for per-tenant overrides. Merges the two layers:
  tenant row wins if present, catalog default wins otherwise. This is the mode
  for all staging and production environments.

The service exposes `resolveAllForTenant(tenantId): array` used by the bootstrap
injection route `GET /api/v1/graphics/tokens?tenant_id={id}` which powers the
CSS custom property block injection.

### 1.5 Token lifecycle — mandatory sequence for a new visual parameter

Adding a new visual parameter to HESEM has a strict sequence. Skipping any step
causes a broken resolution path:

1. **Add a row to `graphics_token_catalog`** — via a numbered migration SQL file
   (not the admin UI, which is for overrides only). Set `token_key`,
   `css_variable`, `category`, `default_value`, and `description`. Set
   `deprecated_since` and `successor_key` to null.

2. **Declare in `graphics_component_contract.overridable_tokens`** — find or
   create the `graphics_component_contract` row for the component that owns this
   token. Add the new `token_key` to its `overridable_tokens` JSON array. This
   declaration gates the admin UI: only tokens listed in
   `overridable_tokens` appear in the per-component token editor.

3. **Add a renderer to `PreviewScenes.renderers`** — if the token controls a
   visual effect that needs its own simulation scene (e.g., a new motion
   duration, a new shadow level), add an entry to `PreviewScenes.renderers` in
   `mom/scripts/portal/00bb-graphics-authority.js`. The renderer function
   receives the proposed value and renders a live DOM scene inside the simulation
   modal. If the token reuses an existing scene (e.g., a new color token that
   fits the existing color-swatch scene), declare `scene_id: 'existing-scene'`
   in the catalog row; no new renderer needed.

4. **Only now may a UI module call `GraphicsAuthority.tokens.read()`** on the
   new token_key. Until steps 1–3 are complete, the read call will throw a
   `TokenNotRegisteredError` in strict mode or return `undefined` in lenient
   mode. HMV4 scripts run in strict mode.

### 1.6 Per-tenant token override mechanism

Each customer tenant may override any token that appears in any
`overridable_tokens` array. The override workflow:

1. Admin opens the Theme Editor panel in the portal admin area.
2. The panel loads the effective token set for the current tenant via
   `GET /api/v1/graphics/tokens?tenant_id={id}`.
3. Admin selects a token and uses the appropriate `ControlKit.*` widget to
   propose a new value (color picker, slider, dropdown, etc.).
4. The widget calls `GraphicsAuthority.tokens.stage(token_key, proposedValue)`,
   which writes the proposed value to the draft buffer in memory but does NOT
   commit to the database.
5. Admin clicks Simulate — `GraphicsAuthority.preview.simulate()` is called.
   This opens the simulation modal, runs the relevant `PreviewScenes.renderer`,
   inserts a row into `graphics_simulation_run` with `committed = false`, and
   renders the proposed value in the scene.
6. Admin clicks Commit inside the modal — `GraphicsAuthority.draft.commit()` is
   called. The draft buffer is flushed to `POST /api/v1/graphics/tokens/commit`,
   which writes the `graphics_token_value` row with `simulation_run_id` pointing
   to the run created in step 5, sets `committed_at` and `committed_by`, and
   marks the simulation run as `committed = true`.
7. The bootstrap injection route is invalidated for this tenant; the next page
   load (or hot-reload event) picks up the new value.

The `simulation_run_id` foreign key in `graphics_token_value` with a non-null
constraint is the database-level enforcement that no override can be committed
without a simulation run. An override row with a null `simulation_run_id` cannot
be inserted.

### 1.7 Preview and simulation — non-optional discipline

`GraphicsAuthority.preview.simulate()` is not advisory. It is the gate. The
architecture enforces this at three levels:

- **Database constraint**: `graphics_token_value.simulation_run_id NOT NULL`.
- **API validation**: `POST /api/v1/graphics/tokens/commit` returns 422 if
  `simulation_run_id` is absent in the request payload.
- **UI enforcement**: the Commit button in every `ControlKit.*` widget is
  disabled until a simulation run has been recorded in the current session.

`ControlKit.*` widget factories are the only permitted way to build new edit UIs
for token values. They are defined in `mom/scripts/portal/00bb-graphics-authority.js`
and include:
- `ControlKit.colorPicker(token_key, label)` — renders an HSL color picker with
  contrast-ratio display; the Simulate button is wired automatically.
- `ControlKit.slider(token_key, label, {min, max, step, unit})` — for numeric
  tokens (spacing, radius, opacity).
- `ControlKit.dropdown(token_key, label, options)` — for enum tokens (easing
  curves, font weights).
- `ControlKit.fontFamilyPicker(token_key, label)` — for font stack tokens;
  shows a live text preview in the simulation scene.
- `ControlKit.durationInput(token_key, label)` — for motion duration tokens;
  runs an animation preview in the simulation scene.

New edit widgets that write directly to `HmTheme.saveAdminConfig` or bypass
`PreviewScenes.openSimulationModal` are rejected at code review and by the
quality gate 7 check.

### 1.8 Legacy aliases — preserved but forbidden in new code

Before the Graphics Authority was introduced, three global functions were the
mutation interface for token values:

- `_hmSet(token_key, value)` — set a token value in the legacy config object.
- `_hmSetWithUnit(token_key, value, unit)` — set a numeric token with a CSS unit.
- `_admGraphicsMarkChange(token_key)` — mark a token as changed for the legacy
  batch-save flow.

These functions are preserved in `00bb-graphics-authority.js` as aliases:

```js
window._hmSet = (key, val) => GraphicsAuthority.tokens.stage(key, val);
window._hmSetWithUnit = (key, val, unit) => GraphicsAuthority.tokens.stage(key, `${val}${unit}`);
window._admGraphicsMarkChange = (key) => GraphicsAuthority.draft.recordChange(key);
```

They delegate correctly to the modern API and do not break existing modules that
have not yet been migrated. However, they must not appear in any new code — they
are excluded from HMV4 scripts by the `no-legacy-graphics-alias` ESLint rule
that fires on files matching `7*.js`. Any new code must call
`GraphicsAuthority.tokens.stage()` and `GraphicsAuthority.draft.recordChange()`
directly.

---

## 2. Token Catalog — Full Detail Per Category

### 2.1 Color tokens

Color tokens are the most numerous category. They are split into semantic
sub-groups. Every color token in JavaScript must be read via
`GraphicsAuthority.tokens.read(key)`. In CSS it must be referenced via
`var(--css-variable-name)`.

**Brand colors**

| token_key | css_variable | default_value | purpose |
|---|---|---|---|
| `brand-primary` | `--brand-primary` | `#005FA3` | Primary CTA buttons, active nav items, primary links |
| `brand-secondary` | `--brand-secondary` | `#0A7EA4` | Secondary action buttons, secondary highlights |
| `brand-accent` | `--brand-accent` | `#F0A500` | Accent indicators, active step markers, notification badges |

Brand tokens are the most commonly overridden by tenants. The J2 Automotive pack
(see section 3.2) is the primary consumer of `brand-primary` and
`brand-secondary` overrides.

**Surface / background colors**

| token_key | css_variable | default_value | purpose |
|---|---|---|---|
| `background-surface-0` | `--background-surface-0` | `#FFFFFF` | Page background, outermost canvas |
| `background-surface-1` | `--background-surface-1` | `#F4F6F8` | Card background, panel background |
| `background-surface-2` | `--background-surface-2` | `#E9ECF0` | Secondary card, nested panel, table header |
| `background-surface-3` | `--background-surface-3` | `#D8DDE3` | Innermost nested surface, input background in dense forms |

In dark mode the scale inverts: surface-0 becomes the darkest surface and
surface-3 becomes the lightest elevation within the dark palette. See section 4.1
for dark mode token resolution strategy.

**Text colors**

| token_key | css_variable | default_value | purpose |
|---|---|---|---|
| `text-primary` | `--text-primary` | `#1A1D23` | Body text, labels, headings |
| `text-secondary` | `--text-secondary` | `#5A6372` | Helper text, metadata, de-emphasized labels |
| `text-disabled` | `--text-disabled` | `#9AA3AE` | Disabled form labels, placeholder text |

**Border colors**

| token_key | css_variable | default_value | purpose |
|---|---|---|---|
| `border-default` | `--border-default` | `#C5CAD1` | Card borders, table cell borders, default input borders |
| `border-strong` | `--border-strong` | `#8A939E` | Dividers, section separators, emphasized borders |
| `border-focus` | `--border-focus` | `#005FA3` | Focus ring border on interactive elements |

**Status colors**

| token_key | css_variable | default_value | purpose |
|---|---|---|---|
| `status-success` | `--status-success` | `#1A7F4B` | Passed QC, released lot, approved record |
| `status-warning` | `--status-warning` | `#C47D00` | Quarantine, near-limit, pending review |
| `status-error` | `--status-error` | `#C0392B` | Failed, rejected, non-conformant, alarm |
| `status-info` | `--status-info` | `#0A7EA4` | Informational alerts, neutral process status |

Status tokens have AA minimum contrast ratio validated at commit time. The
`ControlKit.colorPicker` widget displays the contrast ratio live and blocks
commit if the ratio falls below 4.5:1 for normal text or 3:1 for large text
against the background surface they are paired with.

**Chart palette**

Twelve chart tokens provide a perceptually distinct, colorblind-safe series:

| token_key | css_variable | purpose |
|---|---|---|
| `chart-1` | `--chart-1` | First data series |
| `chart-2` | `--chart-2` | Second data series |
| `chart-3` | `--chart-3` | Third data series |
| ... | ... | ... |
| `chart-12` | `--chart-12` | Twelfth data series |

The default palette is designed using the Paul Tol colorblind-safe palettes and
validated under deuteranopia, protanopia, and tritanopia simulation. Tenants may
override individual chart tokens but the simulation scene for chart tokens
renders the full 12-series palette in a sample bar chart to make clashes visible
before commit.

**Per-pack overlay colors**

Each industry pack (J1–J5) introduces its own color sub-namespace within the
token catalog. These tokens follow the naming pattern `pack-overlay-j{n}-{role}`.
Full detail in section 3.

### 2.2 Spacing tokens

Spacing tokens are the numeric rhythm of the layout system. They map to a
4px base grid. In CSS they resolve to `px` values; in JavaScript they resolve
to strings with the `px` unit included.

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `space-0` | `--space-0` | `0px` | Zero gap, explicit flush positioning |
| `space-1` | `--space-1` | `4px` | Tight inline gap, icon-to-label gap |
| `space-2` | `--space-2` | `8px` | Inner padding of compact elements |
| `space-3` | `--space-3` | `12px` | Form field inner padding (vertical) |
| `space-4` | `--space-4` | `16px` | Card inner padding, standard element gap |
| `space-5` | `--space-5` | `24px` | Section gap, card-to-card gap |
| `space-6` | `--space-6` | `32px` | Major section separation |
| `space-7` | `--space-7` | `48px` | Page-level vertical rhythm |
| `space-8` | `--space-8` | `64px` | Hero spacing, modal header clearance |

In density-compact mode, the effective value of every space token is reduced by
25% via a CSS custom property transform layer (see section 4.2). The catalog
`default_value` always reflects the density-default values; the density transform
is applied by the density layer CSS class, not by overriding the token catalog.

### 2.3 Radius tokens

Border-radius tokens express the rounding vocabulary:

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `radius-none` | `--radius-none` | `0px` | Hard-edge cards in ISA-101 HMI mode, data tables |
| `radius-sm` | `--radius-sm` | `2px` | Badges, tags, tight chips |
| `radius-md` | `--radius-md` | `4px` | Buttons, form inputs, cards (default) |
| `radius-lg` | `--radius-lg` | `8px` | Modals, drawers, prominent panels |
| `radius-xl` | `--radius-xl` | `16px` | Hero cards, feature panels |
| `radius-full` | `--radius-full` | `9999px` | Pills, toggle switches, fully-rounded badges |

The `radius-md` value is the most commonly used. Tenants rarely override radius
tokens except in ISA-101 HMI contexts where `radius-none` is forced for all
interactive elements to maximize operator readability on industrial displays.

### 2.4 Font tokens

Font tokens cover family, size, weight, and line-height. They form the
typographic system.

**Font families**

| token_key | css_variable | default_value |
|---|---|---|
| `font-family-body` | `--font-family-body` | `'Inter', system-ui, sans-serif` |
| `font-family-mono` | `--font-family-mono` | `'JetBrains Mono', 'Fira Code', monospace` |
| `font-family-display` | `--font-family-display` | `'Inter', system-ui, sans-serif` |

Font family tokens are strings and are the one case where a string value is
legitimate — but only when read from the authority, never hardcoded inline. The
`font-family-mono` token is used in lot serial numbers, batch IDs, equipment
codes, and any field where scan-code accuracy is critical.

**Font sizes**

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `font-size-xs` | `--font-size-xs` | `10px` | Legal footnotes, microlabels |
| `font-size-sm` | `--font-size-sm` | `12px` | Helper text, table metadata |
| `font-size-md` | `--font-size-md` | `14px` | Body text, form labels (default) |
| `font-size-lg` | `--font-size-lg` | `16px` | Card titles, section headers |
| `font-size-xl` | `--font-size-xl` | `18px` | Panel headings |
| `font-size-2xl` | `--font-size-2xl` | `24px` | Page-level headings |
| `font-size-3xl` | `--font-size-3xl` | `30px` | Hero numbers, KPI values |

In density-compact mode, each font size is reduced by one step (e.g.,
`font-size-md` renders at the `font-size-sm` scale). This is implemented via the
density layer CSS class, not by modifying the token catalog. In ISA-101 HMI mode,
font sizes are floored at `font-size-md` regardless of density setting, and
operator-critical labels use `font-size-lg` as the floor.

**Font weights**

| token_key | css_variable | default_value |
|---|---|---|
| `font-weight-regular` | `--font-weight-regular` | `400` |
| `font-weight-medium` | `--font-weight-medium` | `500` |
| `font-weight-semibold` | `--font-weight-semibold` | `600` |
| `font-weight-bold` | `--font-weight-bold` | `700` |

**Line heights**

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `line-height-tight` | `--line-height-tight` | `1.2` | Headings, KPI numbers |
| `line-height-normal` | `--line-height-normal` | `1.5` | Body text (default) |
| `line-height-relaxed` | `--line-height-relaxed` | `1.75` | Long-form prose, instructions |

### 2.5 Motion tokens

Motion tokens govern animation timing and easing. They are consumed in
JavaScript when constructing Web Animations API calls and in CSS for
`transition-duration` and `animation-duration` properties.

**Duration tokens**

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `motion-duration-instant` | `--motion-duration-instant` | `0ms` | State changes that must not animate (ISA-101, reduced-motion) |
| `motion-duration-fast` | `--motion-duration-fast` | `100ms` | Micro-interactions: checkbox, toggle, button active state |
| `motion-duration-normal` | `--motion-duration-normal` | `200ms` | Dropdown open, tooltip fade, tab switch |
| `motion-duration-slow` | `--motion-duration-slow` | `300ms` | Drawer slide-in, modal appear |
| `motion-duration-deliberate` | `--motion-duration-deliberate` | `500ms` | Page-level transitions, onboarding animations |

When `prefers-reduced-motion: reduce` is detected, the portal shell sets all
motion duration tokens to `0ms` by injecting a `[data-reduced-motion="true"]`
attribute on `<html>`, and the token CSS layer overrides all `--motion-duration-*`
custom properties to `0ms` under that selector.

**Easing tokens**

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `motion-easing-standard` | `--motion-easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most UI transitions |
| `motion-easing-decelerate` | `--motion-easing-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen |
| `motion-easing-accelerate` | `--motion-easing-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen |

### 2.6 Shadow tokens

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `shadow-none` | `--shadow-none` | `none` | Flat surfaces, embedded table cells |
| `shadow-sm` | `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.08)` | Subtle card lift |
| `shadow-md` | `--shadow-md` | `0 4px 8px rgba(0,0,0,0.10)` | Default card shadow |
| `shadow-lg` | `--shadow-lg` | `0 8px 16px rgba(0,0,0,0.12)` | Floating panels, dropdowns |
| `shadow-xl` | `--shadow-xl` | `0 16px 32px rgba(0,0,0,0.16)` | Modals, drawer backdrop lift |

Shadow tokens use `rgba()` values, not hex alpha. In dark mode, the shadow
tokens are replaced with elevation-glow variants that use lighter border
highlights rather than drop shadows, since dark surfaces with drop shadows look
muddy. See section 4.1 for the dark mode shadow strategy.

### 2.7 Tier-threshold tokens

Tier-threshold tokens encode SLA and performance expectations that drive visual
feedback (spinners converting to warnings, latency badges changing color):

| token_key | css_variable | default_value | meaning |
|---|---|---|---|
| `tier-operational-latency-ms` | `--tier-operational-latency-ms` | `250` | Operational tier: API calls ≤250ms are "fast" (no indicator) |
| `tier-qms-latency-ms` | `--tier-qms-latency-ms` | `500` | QMS tier: calls ≤500ms are acceptable; >500ms shows amber badge |
| `tier-compliance-latency-ms` | `--tier-compliance-latency-ms` | `800` | Compliance tier: calls ≤800ms acceptable; >800ms shows red badge |

These tokens are read in JavaScript by the API-call telemetry layer to determine
which visual feedback class to apply to latency indicators in the workspace
projection header. Tenants on slower database infrastructure may override these
thresholds upward to prevent false alarm indicators.

### 2.8 Per-state visual tokens

State tokens govern interactive state overlays and focus indicators:

| token_key | css_variable | default_value | use |
|---|---|---|---|
| `state-focus-ring-color` | `--state-focus-ring-color` | Same as `border-focus` (`#005FA3`) | Keyboard focus ring color |
| `state-focus-ring-width` | `--state-focus-ring-width` | `2px` | Keyboard focus ring width |
| `state-hover-overlay-opacity` | `--state-hover-overlay-opacity` | `0.06` | Hover state overlay opacity (applied as a pseudo-element) |
| `state-disabled-opacity` | `--state-disabled-opacity` | `0.38` | Opacity of disabled interactive elements |
| `state-pressed-overlay-opacity` | `--state-pressed-overlay-opacity` | `0.12` | Pressed/active state overlay opacity |

The `state-disabled-opacity` value of `0.38` follows Material Design's
established pattern and is validated against WCAG 1.4.3 Non-text Contrast for
disabled elements (which are explicitly exempt from the contrast requirement, but
the value ensures perceptible differentiation from enabled elements at low
vision levels).

---

## 3. Per-Pack Visual Overlay

Industry packs (J1–J5) are layered token namespaces that extend the base token
catalog with domain-specific visual semantics. Each pack is activated by setting
`tenant.industry_pack = 'j1'` (or j2–j5) in the tenant configuration. When a
pack is active, the bootstrap injection route includes the pack's overlay tokens
in the CSS custom property block, scoped under `[data-industry-pack="j1"]` on
the `<html>` element.

### 3.1 J1 — Pharma (cleanroom-friendly)

Pharmaceutical manufacturing environments impose strict visual requirements
driven by GMP (Good Manufacturing Practice) regulations and cleanroom operational
conditions.

**Cleanroom palette rationale**: operators in cleanroom environments work under
intense white LED lighting that washes out low-contrast colors. The J1 pack
enforces a high-contrast palette where all status indicators meet AA+ (7:1)
contrast ratio rather than the standard AA (4.5:1). The `pack-overlay-j1`
token series provides:

| token_key | purpose |
|---|---|
| `pack-overlay-j1-1` | Pharmaceutical blue brand tone (deep cobalt: `#003A7A`) |
| `pack-overlay-j1-2` | Secondary pharma blue (steel: `#1A5BA8`) |
| `pack-overlay-j1-3` | Accent highlight for batch header stripe |
| `pack-overlay-j1-4` | GMP alert background (clinical amber: `#7A4A00`) |
| `pack-overlay-j1-5` | GMP critical alert background (deep red: `#8B0000`) |

**GMP status badge mapping**: lot disposition status tokens are remapped in J1:

| GMP status | base token used | J1 override value | display label |
|---|---|---|---|
| Released | `status-success` | `#0A5C2E` (deep GMP green) | Released |
| Quarantine | `status-warning` | `#7A4A00` (deep amber) | Quarantine |
| Rejected | `status-error` | `#8B0000` (deep red) | Rejected |
| Under Review | `status-info` | `#003A7A` (pharma blue) | Under Review |

The deep color variants ensure the 7:1 contrast ratio requirement for cleanroom
legibility. The simulation scene for J1 status badge tokens renders all four
badge states simultaneously against both white and light-gray surfaces to verify
contrast in the overridden values.

**Brand tone**: `brand-primary` is overridden by J1 to `pack-overlay-j1-1`
(`#003A7A`) unless the tenant has a specific brand color configured. The J1
pack does not override `brand-accent` — the accent token remains configurable by
the pharma tenant for corporate color compliance.

### 3.2 J2 — Automotive

Automotive OEM customers require the portal to reflect their brand identity,
subject to strict rules about where brand colors may appear.

**OEM brand-mirror capability**: the J2 pack introduces a token
`pack-overlay-j2-oem-brand` which accepts the OEM primary brand color as input
via the tenant theme editor. This color is applied only to:
- The workspace projection header stripe (top 4px border)
- Active state indicators on the primary navigation rail
- Active step markers in sub-flow wizards

It is explicitly prohibited from appearing in:
- Body text (contrast risk)
- Status badges (semantic collision with status-success/warning/error)
- Data table cell backgrounds (distraction from data)

The `ControlKit.colorPicker` for `pack-overlay-j2-oem-brand` enforces the
contrast check: it validates the OEM brand color against `background-surface-0`,
`background-surface-1`, and `text-primary` and blocks commit if the brand color
would be used on text with insufficient contrast. It only ever appears as a
decorative border or active-state underline, so the contrast requirement is the
UI element contrast (3:1) rather than text contrast (4.5:1).

**EDI status badge series**: J2 adds EDI transaction status tokens for supplier
integration displays:

| token_key | purpose |
|---|---|
| `pack-overlay-j2-edi-acknowledged` | Acknowledged (green tint) |
| `pack-overlay-j2-edi-pending` | Pending (neutral) |
| `pack-overlay-j2-edi-error` | Error (matches `status-error` but with J2 brand border) |
| `pack-overlay-j2-edi-rejected` | Rejected by OEM (deep red with strikethrough semantics) |

### 3.3 J3 — Aerospace & Defense

ITAR (International Traffic in Arms Regulations) and export-control requirements
drive specific visual marking requirements in A&D deployments.

**ITAR watermark**: export-controlled records display a watermark overlay:

| token_key | css_variable | default_value |
|---|---|---|
| `itar-watermark-opacity` | `--itar-watermark-opacity` | `0.08` |
| `itar-watermark-color` | `--itar-watermark-color` | `#4A0000` (dark red) |

The watermark is rendered as a CSS `::before` pseudo-element on the record shell
container when the record's `export_control_flag = 'ITAR'`. The opacity is set
low (0.08) to remain legible as a background watermark without obscuring the
foreground content, consistent with DoD document marking conventions.

**Export-control banner**: a full-width banner appears at the top of ITAR-flagged
screens:

| token_key | purpose |
|---|---|
| `pack-overlay-j3-export-banner-bg` | Deep amber (`#7A4A00`), DoD 5220.22-M reference palette |
| `pack-overlay-j3-export-banner-text` | Near-white (`#FFF5E0`) for contrast on amber |
| `pack-overlay-j3-export-banner-border` | Strong amber border (`#5A3000`) |

**CAGE code badge**: Aerospace suppliers are identified by CAGE code. The CAGE
code badge style uses `font-family-mono`, `radius-sm`, and:

| token_key | purpose |
|---|---|
| `pack-overlay-j3-cage-badge-bg` | Steel gray (`#2C3E50`) |
| `pack-overlay-j3-cage-badge-text` | White (`#FFFFFF`) |

### 3.4 J4 — Medical Device

Medical device manufacturers are regulated under FDA 21 CFR Part 820 and ISO
13485. IEC 62366 (usability engineering) mandates high-contrast UI for safety-
critical device displays.

**Device class signaling palette**: FDA classifies medical devices into three
classes with increasing risk level. The J4 pack maps these to visual tokens:

| device class | token_key | default value | display meaning |
|---|---|---|---|
| Class I (low risk) | `md-class-1` | `#1A7F4B` (green) | General controls only |
| Class II (moderate risk) | `md-class-2` | `#C47D00` (amber) | Special controls required |
| Class III (high risk) | `md-class-3` | `#C0392B` (red) | PMA approval required |

The device class badge renders on every record in the DHF (Device History File)
and DHR (Device History Record) modules. The color is not the full background;
it is a left-border stripe (4px solid) and the class label text color. The badge
background remains `background-surface-1` to ensure body text contrast.

**IEC 62366 high-contrast mode**: when `tenant.iec62366_mode = true`, the J4
pack overrides all `pack-overlay-j4-*` status tokens to enforce AA+ (7:1)
contrast:

- All status badge foreground colors move to pure white or pure black depending
  on background luminance.
- `state-focus-ring-width` is increased to `3px`.
- `state-hover-overlay-opacity` is increased to `0.12` (from the default 0.06)
  to ensure hover state is visible to users with low contrast sensitivity.

**SPC control limit indicators**: Statistical Process Control charts use specific
J4 tokens for control limits:

| token_key | purpose |
|---|---|
| `pack-overlay-j4-spc-ucl` | Upper Control Limit line color (red) |
| `pack-overlay-j4-spc-lcl` | Lower Control Limit line color (red) |
| `pack-overlay-j4-spc-usl` | Upper Spec Limit line color (amber) |
| `pack-overlay-j4-spc-lsl` | Lower Spec Limit line color (amber) |
| `pack-overlay-j4-spc-mean` | Center line color (deep blue) |

### 3.5 J5 — Food Safety

Food safety environments are governed by FDA FSMA, HACCP principles, and
FALCPA (Food Allergen Labeling and Consumer Protection Act).

**Allergen warning palette**: products containing regulated allergens require
high-visibility labeling. The J5 token `FA-allergen-warning` uses a high-
visibility amber (`#FF8C00`) that exceeds 4.5:1 contrast against both white and
dark backgrounds and is culturally associated with food safety warnings
internationally.

| token_key | css_variable | default_value | purpose |
|---|---|---|---|
| `FA-allergen-warning` | `--FA-allergen-warning` | `#FF8C00` | Allergen presence indicator badge background |
| `FA-allergen-warning-text` | `--FA-allergen-warning-text` | `#1A0A00` | Text on allergen warning badge |
| `FA-allergen-warning-border` | `--FA-allergen-warning-border` | `#CC6600` | Border of allergen warning badge |

**CCP (Critical Control Point) status badges**: HACCP requires monitoring of
CCPs with defined critical limits. The J5 CCP status token series:

| CCP state | token_key | default value | visual treatment |
|---|---|---|---|
| In Control | `pack-overlay-j5-ccp-in-control` | `#1A7F4B` | Green badge, static |
| Near Limit | `pack-overlay-j5-ccp-near-limit` | `#C47D00` | Amber badge, static |
| Out of Control | `pack-overlay-j5-ccp-out-of-control` | `#C0392B` | Red badge with CSS pulse animation |

The "Out of Control" pulse animation uses `motion-duration-slow` (300ms) and
`motion-easing-standard`. When `prefers-reduced-motion: reduce` is active, the
pulse animation is disabled (duration set to `motion-duration-instant`), and the
badge instead displays a blinking icon (CSS opacity alternation at 1s period,
which is not affected by reduced-motion since it is a meaningful alert rather
than a decorative animation).

**FALCPA-compliant label color**: the allergen declaration section of a product
label view uses `FA-allergen-warning` as the background and requires that the
label text `Contains: [allergen list]` renders at `font-weight-bold` and
`font-size-md` minimum. This is enforced by the J5 label renderer component,
not by a separate token.

---

## 4. Dark Mode and Density Variants

### 4.1 Dark mode

Dark mode is a first-class concern in the token system, not an afterthought CSS
inversion. The Graphics Authority implements dark mode as a parallel token layer,
not a CSS `filter: invert()` or naive color swap.

**Reading dark mode values in JavaScript**:

```js
const bgColor = window.GraphicsAuthority.tokens.read('background-surface-0', { mode: 'dark' });
```

When the mode argument is `'dark'`, the authority reads from the `dark_value`
column in `graphics_token_catalog` (which may be null, in which case it falls
back to `default_value` — but for any color token, a distinct dark value is
required; the CI check fails if a color token has a null `dark_value`).

**Surface inversion strategy**: in dark mode, the surface hierarchy inverts:

| token | light mode | dark mode |
|---|---|---|
| `background-surface-0` | `#FFFFFF` (page, lightest) | `#111318` (page, darkest) |
| `background-surface-1` | `#F4F6F8` (card) | `#1C2028` (card, elevated above page) |
| `background-surface-2` | `#E9ECF0` (nested panel) | `#252B35` (higher elevation) |
| `background-surface-3` | `#D8DDE3` (innermost) | `#2D3441` (highest elevation) |

Elevation in dark mode is expressed by lightness increase rather than darkening,
which follows the established dark UI pattern (lighter = higher elevation above
the dark canvas).

**Text tokens in dark mode**:

| token | dark value |
|---|---|
| `text-primary` | `#E8EBF0` |
| `text-secondary` | `#9AA3AE` |
| `text-disabled` | `#5A6372` |

**Shadow strategy in dark mode**: drop shadows are not effective on dark
surfaces (they appear muddy). In dark mode, shadow tokens switch to
elevation-border strategy:

| token | dark value |
|---|---|
| `shadow-sm` | `0 0 0 1px rgba(255,255,255,0.06)` |
| `shadow-md` | `0 0 0 1px rgba(255,255,255,0.08), 0 4px 8px rgba(0,0,0,0.4)` |
| `shadow-lg` | `0 0 0 1px rgba(255,255,255,0.10), 0 8px 16px rgba(0,0,0,0.5)` |
| `shadow-xl` | `0 0 0 1px rgba(255,255,255,0.12), 0 16px 32px rgba(0,0,0,0.6)` |

The border highlight creates a subtle luminous edge that separates elevated
elements from the dark background, while the drop shadow provides depth cue.

**Contrast validation in dark mode**: the `ControlKit.colorPicker` widget runs
contrast validation in both modes simultaneously. A color token commit requires
AA compliance in both light and dark mode to pass.

**Mode detection and switching**: the portal shell detects the user's preferred
color scheme via `prefers-color-scheme` media query and sets
`document.documentElement.dataset.colorScheme = 'dark'` or `'light'`. Users can
override via the portal settings panel, which persists the preference to
`user_preference.color_scheme`. The `GraphicsAuthority.setMode(mode)` function
is called by the shell on mode change; it invalidates the resolved cache and
re-injects the CSS custom property block for the new mode.

### 4.2 Density variants

Three density levels are supported. Density is controlled by the
`data-density` attribute on `<html>`:

**density-compact** (`data-density="compact"`):
- Space tokens: all `var(--space-*)` custom properties overridden to 75% of
  their default_value (multiply by 0.75, round to nearest 2px). This is
  implemented in the density CSS layer as explicit custom property overrides,
  not by modifying the token catalog.
- Font sizes: each size reduced by one step (font-size-md renders at font-size-sm
  scale, etc.). font-size-xs has no smaller step and remains unchanged.
- Touch targets: in compact density on pointer devices (where `pointer: fine`
  is detected via `@media (pointer: fine)`), minimum touch target is 32×32px.
  On coarse-pointer devices (touchscreens), the minimum touch target is always
  44×44px regardless of density setting — WCAG 2.5.8 Success Criterion.
- Row heights in data tables: reduced from 48px (default) to 36px.

**density-default** (`data-density="default"` or absent):
- All tokens at catalog default_value.
- Touch targets: 44×44px minimum (WCAG 2.5.5 Target Size, AAA; WCAG 2.5.8, AA).
- Row heights in data tables: 48px.

**density-comfortable** (`data-density="comfortable"`):
- Space tokens: all `var(--space-*)` custom properties overridden to 115% of
  their default_value (multiply by 1.15, round to nearest 2px).
- Font sizes: each size increased by one step (font-size-md renders at
  font-size-lg scale).
- Touch targets: 48×48px minimum.
- Row heights in data tables: 56px.

Density is persisted to `user_preference.density_level` and is loaded at
bootstrap alongside the color scheme preference. Both preferences are injected
as data attributes on `<html>` before the first paint (via an inline script in
`<head>`, before the main bundle) to prevent layout flash.

### 4.3 ISA-101 HMI mode

ISA-101 (Human Machine Interfaces for Process Automation Systems) defines a
standard for operator interface design in process industries. HESEM's ISA-101 HMI
mode activates for operator panel screens in process manufacturing contexts
(MES execution views, equipment dashboards, SPC monitoring panels).

ISA-101 mode applies a compound set of overrides:

1. **Density forced to comfortable**: `data-density="comfortable"` is set
   regardless of user preference. Operator panels are not for data entry; they
   are for monitoring where glanceability is paramount.

2. **High-contrast mode**: the status token high-contrast variants are activated
   (matching the J4 IEC 62366 mode behavior: AA+ contrast enforced).

3. **Touch targets ≥ 44×44px enforced at all times**: ISA-101 §9.4.3 requires
   that interactive elements on operator panels be operable with gloved hands.
   The minimum touch target is enforced in CSS via `min-height: 44px; min-width: 44px`
   on all interactive elements in ISA-101 mode, not just on coarse-pointer
   devices.

4. **Motion reduced to instant**: all motion duration tokens are set to
   `motion-duration-instant` (0ms) in ISA-101 mode. Process display screens must
   not have decorative animations that could distract operators during process
   alarms. This override takes precedence over the `prefers-reduced-motion`
   system setting (which does the same thing but only if set).

5. **Font sizes floored at font-size-md** (14px): no text in ISA-101 mode may
   render below 14px. Operator panel labels use font-size-lg (16px) as the
   practical floor for process variable labels.

6. **Color coding locked**: status tokens may not be overridden by tenants while
   ISA-101 mode is active. The ISA-101 palette for alarm states follows the
   ISA-18.2 standard:

   | alarm priority | color |
   |---|---|
   | Critical | Red (`status-error`) |
   | High | Amber/Orange (`status-warning`) |
   | Low | Yellow (a J5/J1 pack token; amber-yellow variant) |
   | Advisory | Cyan/Teal (`status-info`) |

   The token override endpoint returns 403 for `status-*` tokens when the
   requesting tenant has `isa101_mode = true`.

---

## 5. No-Hardcode CI Gate (ADR-0009)

### 5.1 Pre-commit hook checks

The pre-commit hook in `.git/hooks/pre-commit` runs four pattern checks against
all modified files matching `mom/scripts/portal/7*.js`:

**Check 1 — Hex color literals**:
```sh
grep -rn "#[0-9a-fA-F]\{3,6\}" mom/scripts/portal/7*.js
```
Fails if any match is found. Allowed exception: comment lines starting with `//`
or `/*` where the hex is documentary (not evaluated). The grep is preceded by a
sed pass that strips comment lines; the remaining match is the hard failure.

**Check 2 — Pixel string literals**:
```sh
grep -rn "'[0-9]*px'" mom/scripts/portal/7*.js
grep -rn '"[0-9]*px"' mom/scripts/portal/7*.js
```
Fails if any match is found. Catches patterns like `'16px'` or `"4px"` in
function arguments, style assignments, or string concatenations.

**Check 3 — Inline font-family strings**:
```sh
grep -rn "font-family\s*:" mom/scripts/portal/7*.js
grep -rn "'Inter'" mom/scripts/portal/7*.js
grep -rn "'monospace'" mom/scripts/portal/7*.js
```
Fails if any match is found. Font family values must only appear as the resolved
value of `GraphicsAuthority.tokens.read('font-family-body')` etc., never as
inline strings.

**Check 4 — Hardcoded motion durations**:
```sh
grep -rn "[0-9]\+ms" mom/scripts/portal/7*.js
```
Fails if any match is found outside of the `00bb-graphics-authority.js` file
itself (which defines the catalog default values). Motion duration values must
only appear as the resolved value of `GraphicsAuthority.tokens.read('motion-duration-*')`.

### 5.2 Quality gate 7 — Graphics Authority compliance in CI

Quality gate 7 runs as part of `npm run test:hmv4`. It executes the same four
grep patterns above as a Jest test that asserts zero matches. The test file is
`tests/e2e/module-template-v4-axe.spec.ts` which includes an imported helper
`graphicsAuthorityCompliance()` that runs the patterns via Node.js `child_process.execSync`.

The test name is `'Graphics Authority: no hardcoded visual values in HMV4 scripts'`.
It is part of the required 100% pass gate for every slice merge (quality gates 1–7
per ADR-0005). A slice that fails quality gate 7 cannot be merged regardless of
passing gates 1–6.

### 5.3 Rejection criteria in diff review

Code review for HMV4 slices applies these rejection criteria automatically via
the review checklist embedded in the PR template:

- **Any hex color in JS** (`#RGB` or `#RRGGBB`) outside of comments → REJECT
- **Any `'16px'` or similar pixel string** → REJECT
- **Any inline `font-family` string** → REJECT
- **Any hardcoded motion duration** (`200ms`, `0.3s`, etc.) → REJECT
- **Any call to `_hmSet`, `_hmSetWithUnit`, or `_admGraphicsMarkChange`** in new
  code → REJECT (legacy alias prohibition)
- **Any `ControlKit`-bypass edit widget** that writes directly to `HmTheme.saveAdminConfig`
  or calls `PreviewScenes.openSimulationModal` manually → REJECT
- **Any `GraphicsAuthority.tokens.read()` call on a token_key not yet registered
  in `graphics_token_catalog`** → REJECT

The diff reviewer also checks that for every new token introduced in a migration,
the corresponding `overridable_tokens` declaration and `PreviewScenes.renderers`
entry are present in the same PR. A migration that adds a token without the
downstream declarations is a partial implementation and is rejected.

---

## 6. Token Migration Discipline

### 6.1 Renaming a token

Token renaming follows a two-release-cycle deprecation protocol to avoid silent
breakage in tenant theme overrides and in any custom integration code that reads
token values via the API.

**Step 1 — Release N: introduce alias**

In `00bb-graphics-authority.js`, register the alias:

```js
GraphicsAuthority.tokens.alias('old-token-key', 'new-token-key', {
  deprecatedSince: 'vX.Y.Z',
  removalRelease: 'vX+2.0.0',
  message: "Use 'new-token-key' instead of 'old-token-key'."
});
```

The `alias()` function makes reads on `old-token-key` resolve to the effective
value of `new-token-key` and logs a `console.warn` with the deprecation message
in non-production builds. In production builds it silently resolves without the
warn (to avoid log noise in operator consoles).

The `graphics_token_catalog` row for `old-token-key` has its `deprecated_since`
column set to `'vX.Y.Z'` and `successor_key` set to `'new-token-key'` via a
migration.

**Step 2 — Release N+1: active deprecation**

The admin token viewer in the portal displays a deprecation notice for
`old-token-key` with a migration guide. Tenant theme overrides on `old-token-key`
are automatically migrated to `new-token-key` by a background job that runs once
on upgrade and logs each migration to the audit trail.

The `GET /api/v1/graphics/tokens` response includes a `sunset` header for
deprecated tokens:

```
Sunset: Sat, 01 Jan 2028 00:00:00 GMT
Deprecation: true
Link: </api/v1/graphics/tokens/new-token-key>; rel="successor-version"
```

**Step 3 — Release N+2: remove alias**

The `alias()` call is removed. The `old-token-key` row in `graphics_token_catalog`
is deleted via a migration. Any `graphics_token_value` rows still referencing
`old-token-key` are also deleted (the tenant overrides have been migrated in
release N+1). A code search is run before the release to confirm no consumer
code still references `old-token-key`.

### 6.2 Removing a token (class A change process — H7)

Token removal is a Class A change per the H7 change classification framework,
requiring a 6-month deprecation window minimum. The process:

**Month 0**: Token marked deprecated in `graphics_token_catalog` (`deprecated_since`
set). Deprecation warning emitted in all reads. API response includes `Sunset`
header with the date 6 months hence.

**Month 1–5**: Active communications to tenant admins via the portal notification
system (a deprecation notice banner in the admin token viewer for any tenant that
has an override on the deprecated token). Documentation updated. Dependent
components listed in the deprecation notice.

**Month 6**: Token removed from catalog via migration. All `graphics_token_value`
rows with this `token_key` are deleted. The API endpoint for the specific token
returns 410 Gone with a body pointing to the replacement. The admin token viewer
no longer shows the token.

**Frontend display of deprecation warnings**: the admin token viewer (in the
portal graphics admin area) reads the `deprecated_since` column from the catalog
API and renders a yellow deprecation chip next to the token name:

```
[DEPRECATED since v2.4.0] brand-old-red → successor: status-error
```

The chip links to the migration guide in the documentation portal. The token
remains functional until the removal migration runs in month 6.

### 6.3 Value-only changes (not renames)

When a token's default value changes (not its key), a migration updates the
`default_value` column in `graphics_token_catalog`. Tenant overrides in
`graphics_token_value` are not affected — they continue to override the new
default. A release note entry is required documenting the old and new default
values and the reason for the change. No deprecation cycle is needed for value-
only changes since the token key remains stable.

### 6.4 Category changes

Moving a token from one category to another (e.g., from `color` to `state`) does
not affect functionality but affects how the token appears in the admin token
viewer (grouped by category). A migration updates the `category` column. No
alias or deprecation cycle is needed since the `token_key` and `css_variable`
are unchanged.

---

## 7. Component Inventory

The Design System provides a complete set of reusable components, each themed
exclusively via tokens. No component may contain a hardcoded visual literal.

**Interactive elements**: buttons (primary / secondary / tertiary / destructive /
ghost / icon-only), toggle switches, checkboxes, radio groups, segmented controls.
All buttons have focus, hover, active, disabled, and loading states expressed
through state tokens.

**Form fields**: text input, number input, date/time picker, dropdown (single
and multi-select), combobox with async search, file upload with drag-and-drop,
rich text editor (WYSIWYG), signature capture widget.

**Data display**: sortable/filterable/paginated data table with multi-select and
bulk actions; KPI card with trend indicator; metric tile; sparkline chart;
status badge; severity icon; progress bar; step indicator.

**Charts**: line, bar (vertical/horizontal/stacked), pie/donut, scatter,
heatmap, Gantt, tree/hierarchy. All charts use the `chart-1..chart-12` token
series for data series colors and `status-*` tokens for threshold/alert
indicators.

**Layout**: drawer (left/right slide-in), modal dialog, bottom sheet (mobile),
tooltip, popover, context menu, toast notification, alert banner.

**Process/manufacturing specific**: e-signature capture widget (PIN + biometric
option), lot genealogy tree visualization, SPC control chart (J4 pack tokens
for control/spec limits), equipment status dashboard tile, batch record viewer.

Each component is keyboard-accessible (full Tab, Arrow, Enter, Escape navigation),
screen-reader compatible (ARIA roles and labels), and validated in both light and
dark mode by the Playwright accessibility spec (`module-template-v4-axe.spec.ts`).

---

## 8. Wave Timeline for Design System Milestones

- **W0.5**: Token catalog complete in JSON_ONLY mode; CSS custom property
  injection working; base light/dark mode tokens defined; pre-commit hook
  installed and passing.
- **W1**: All base component types themed via tokens; no-hardcode gate in CI;
  density variants implemented; `ControlKit.*` widget factories available.
- **W2–W3**: Per-pack overlay tokens for J1 and J2 defined; simulation
  infrastructure (`graphics_simulation_run` table, `PreviewScenes.renderers`)
  operational.
- **W4–W5**: J3, J4, J5 pack tokens defined; ISA-101 HMI mode implemented;
  dark mode contrast validation in `ControlKit.colorPicker`.
- **W6–W8**: POSTGRES_PRIMARY mode for token resolution; per-tenant override
  workflow complete; token migration discipline documented and enforced.
- **W9–W12**: Full coverage of all 18 slice roots with per-pack and dark-mode
  token compliance; token rename/removal discipline tested in at least one
  real rename cycle.

---

```
S3-12_F10_DESIGN_TOKENS_DEEP_UPGRADE_COMPLETE
```
