# HESEM QMS Module Builder — Round 14 Serious Runtime Design Rebuild

Date: 2026-04-08
Patch version: 2026-04-08-r14-serious

## Strategic direction

Round 14 changes direction on purpose:

- Stop spending most effort on decorating the **module builder shell**.
- Start designing the **runtime module that users actually open and use**.
- Convert presentation controls into **real runtime design controls** that persist in schema and affect runtime rendering.

This round is based on the same operating model used by modern application builders and experience systems:

- application-level theming and shared presentation controls,
- reusable style tokens,
- component/runtime style variants,
- preview that reflects the actual runtime experience.

## What changed

### 1) Runtime design system in block engine

File:
- `01-QMS-Portal/scripts/portal/00-block-engine.js`

Added a real module runtime design layer:

- `schema.runtimeDesign` becomes the module-level source of truth.
- Real design presets:
  - `executive-glass`
  - `operator-command`
  - `audit-ledger`
  - `quality-cleanroom`
  - `night-ops`
- Real runtime tokens are computed and applied to rendered module output:
  - stage background
  - surface/card styling
  - header styling
  - tabs styling
  - table styling
  - spacing / density / radius / max width
  - accent / focus / shadow behavior
- Runtime render is wrapped with stage containers:
  - `.hm-runtime-design-stage`
  - `.hm-runtime-design-inner`
- Block-level design overrides now affect runtime nodes:
  - `config.design.surfaceVariant`
  - `config.design.semanticTone`
  - `config.design.density`
  - `config.design.themePreset`
  - `config.design.cardRadius`
  - `config.design.cssVars`
  - `config.design.className`
  - `config.design.caption`

### 2) Module Presentation Studio in builder

File:
- `01-QMS-Portal/scripts/portal/31-module-builder.js`

Added a serious presentation workflow focused on runtime output:

- Clean `Module Presentation Studio` block injected into build step.
- Runtime design controls that write into `runtimeDesign.*`:
  - surface
  - accent
  - density
  - radius
  - depth
  - header
  - tabs
  - card
  - table
  - max width
  - gap
- Real preset buttons and starter kits.
- Two runtime previews:
  - probe preview
  - live module preview
- Save/open hooks keep runtime design in schema and in builder manifest.
- Preview/save actions commit runtime design into schema before render/export.

### 3) Round 14 templates

Added 6 presentation-oriented templates:

- `r14-executive-hero-banner`
- `r14-command-kpi-strip`
- `r14-operator-filter-bar`
- `r14-evidence-ledger-table`
- `r14-review-action-table`
- `r14-night-ops-kpi-strip`

## What this round intentionally removes or de-emphasizes

- Decorative builder-over-builder chrome from previous rounds.
- Nonfunctional visual labs that changed builder appearance more than module runtime.
- Over-stacked round 9/10/11/12/13 deck/panel clutter.

## Persistence model

Round 14 persists runtime presentation through:

- `schema.runtimeDesign`
- `schema.builderManifest.presentationPreset`
- `schema.builderManifest.presentationSurface`
- `schema.builderManifest.presentationDensity`
- `schema.builderManifest.presentationHeader`

## Test scope completed before packaging

### Syntax

- `node --check 01-QMS-Portal/scripts/portal/00-block-engine.js` — pass
- `node --check 01-QMS-Portal/scripts/portal/31-module-builder.js` — pass

### VM smoke checks

Passed:

- block engine round 14 hook exists
- module builder round 14 hook exists
- preset inference for quality/audit path
- dark tone preset resolution for night ops
- stage CSS token generation
- operator preset export
- audit starter kit block inventory
- probe preview schema inherits runtime design
- preview block generation
- presentation summary reads runtime settings
- round 14 templates are registered

## Known limitation

This package was syntax-checked and smoke-tested in a controlled Node VM harness.
A full browser E2E run on your live environment was not performed inside this packaging step.
After overwrite, perform a quick real-browser check for:

- create module
- open existing module
- change runtime design preset
- apply design and save
- preview runtime
- confirm header/tabs/card/table actually change in preview/runtime

## Release recommendation

This round should be treated as the first serious runtime presentation foundation.
If this direction is accepted, the next round should continue with:

- widget-level theme inheritance hardening
- export/import runtime theme JSON
- runtime theme diff/compare
- stronger block-specific style variants for KPI, table, form, timeline, chart
- browser E2E validation checklist on the actual deployed portal
