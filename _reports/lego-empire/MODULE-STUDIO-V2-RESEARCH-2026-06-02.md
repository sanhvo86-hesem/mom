# Module Studio v2 — Deep Research, Duplication Audit & SSOT Target Architecture
**Date:** 2026-06-02 · For: 3 parallel upgrade prompts (PROMPT-MSV2-1/2/3). This
session authored the research and will VERIFY when all 3 prompts have run.

## 0. Why v2 (founder findings)
v0.6 consolidated the Giao diện tabs into Module Studio but the founder correctly
flagged that it was **mechanical**, not SSOT: several objects still control the same
thing in two places, the Lego/Tokens split is not level-coherent, module create/edit
is thin, the archive checkbox is broken, the Assemble/Author/Simulate model is
confusing, and "Tham chiếu" was stacked, not designed.

## 1. Confirmed duplication matrix (the SSOT violations)

| Attribute | Place A | Place B | Verdict |
|---|---|---|---|
| component gap (`space.master`) | Theme tab slider `theme-master-gap` (00d) | preset `density_px` (mig 263) | **DUP** → preset is authority |
| section gap (`space.section`) | Theme slider `theme-section-gap` | preset (via frame/overrides) | **DUP** → preset |
| outer radius (`radius.card`) | Theme slider `theme-card-radius` | preset `radius_outer_px` | **DUP** → preset |
| inner radius (`radius.master`) | Theme slider `theme-master-radius` | preset `radius_inner_px` | **DUP** → preset |
| control height | Theme `density` seg (32/36/40) | preset `control_h_px` (exact px) | **DUP** → preset (preset is finer-grained) |
| brand | Theme `theme-brand` | preset `brand` | **DUP** → preset |
| color mode / font / motion | Theme tab | (not in preset columns) | **UNIQUE org-level** → Settings |
| component token edit | Tokens surface dock (Module Master) | — | unique (but org-by-component, see §3) |
| L3/L4 block registry | Lego surface | — | unique |
| component showcase | Tokens (Module Master) | Lego library (block list) | **PARTIAL** — both list reusable parts; merge by level (§3) |

**Root rule:** a *theme preset* IS the density/radius/control/brand axis (mig 263 says
so explicitly: "brand seed + master density/radius/control"). So those sliders must
NOT exist as a standalone tab — they are **attributes you edit on a preset**. The only
global theme settings that are NOT per-preset are **color-mode, typography, motion**.

## 2. Target architecture — Module Studio v2 surfaces
Replace the current 5 surfaces (Lego/Tokens/Modules/Theme/Reference) with:

1. **🧱 Lego** — the component system, ONE tab with **level sub-tabs** (L0 Tokens →
   L1 Primitives → L2 Components → L3 Blocks → L4 Archetypes → L5 Module manifest).
   Absorbs today's separate "Tokens" surface (it becomes the L0/L1/L2 levels). Each
   level is browsable + **interactive** (live components you can click/toggle), and
   editable in place. The Assemble/Author/Simulate triad is redesigned (§5).
2. **📦 Modules** — list + **rich create dialog** + **two edit paths** (Sửa thông tin
   / Sửa nội dung) + working archive filter (§4).
3. **🎨 Thư viện preset** (replaces "Theme template") — the preset library IS the tab.
   Each row has **Sửa** → a rich attribute editor (§6). "Apply" persists org-wide
   (Phase A, done). The old global density/radius/brand sliders are GONE (they are
   now preset attributes — single source).
4. **⚙️ Settings** — org-level, non-preset: color mode (light/dark/auto), typography
   (family/size/scale), motion (preset + durations). Peer tab to Lego/Modules.
5. **📖 Tham chiếu** — REBUILT (not stacked): a purposeful QA surface (§7).

Giao diện admin (Quản trị đồ họa & Phát hành) keeps the release/governance control
plane only — re-justified in §8.

## 3. Lego ⊕ Tokens merge — level taxonomy (6-layer Lego model)
Today "Tokens" (Module Master, component-organized) and "Lego" (block-registry) are
two tabs that both enumerate reusable UI. Merge into ONE Lego tab, **classified by
level**, matching the locked 6-layer model:
- **L0 Tokens** — raw design tokens (color ramp, spacing scale, radius set, motion,
  shadows, typography). Edit = the Module Master dock, re-grouped by token family.
- **L1 Primitives** — single HTML elements with one token contract (button, input,
  chip). Interactive preview.
- **L2 Components** — composed primitives (toolbar, KPI tile, table, panel) — today's
  Module Master sections, re-homed here.
- **L3 Blocks** — curated registry blocks (`graphics_block_contract`), 6 published.
- **L4 Archetypes** — zone skeletons (`graphics_module_archetype`).
- **L5 Module** — the assembled manifest (handoff to Modules surface).
Navigation: a left level-rail (L0…L5) + the existing library/preview/inspector. One
search across levels. This kills the Lego-vs-Tokens confusion and enforces the
"classify by level" logic the founder asked for.

## 4. Modules lifecycle
- **Create**: a real modal dialog (not `prompt()`) with: title vi/en, subtitle vi/en,
  icon, route, roles (multi-select from RBAC), archetype (L4 picker), theme preset
  picker, domain, description. Validates before `module_schema_save`.
- **Edit = two buttons**:
  - **✎ Sửa thông tin** → modal with ONLY the original metadata fields (above).
  - **🧩 Sửa nội dung** → enters the content editor for that module: add/remove Lego
    blocks, edit zone content, reorder — reusing the block-engine module builder
    (`HmBlockEngine.renderModuleFromSchema` / the existing builder edit mode) bound to
    that module's schema, saving via `module_schema_save` (+ baseVersion lock).
- **BUG — "hiện đã archive" checkbox**: clicking does not tick; archived rows show but
  can't be re-hidden. Root cause to confirm: `loadModules()` calls `paintBody()` which
  `outerHTML`-replaces the body → the checkbox DOM node (and its checked state) is
  destroyed/recreated on every load, and the `change` listener is on `el` (delegated)
  so the click that triggered load re-renders an UNCHECKED box while showing deleted
  rows (because loadModules was called with includeDeleted derived from the OLD box).
  Fix: make the checkbox state part of `state` (e.g. `state.showArchived`), render it
  from state, and have the change handler set state then reload — so the box reflects
  state after re-render. Verify tick toggles + hides/shows archived in Chrome.

## 5. Assemble / Author / Simulate — redesign to world standard
Today: a mode triad (Assemble/Author) + a global "Mô phỏng" button. Confusing and
the simulate button's role is unclear.
- **World references**: Storybook (browse + interactive "controls" + docs), Figma
  (select → edit properties panel), Framer/Webflow (canvas + live interaction). The
  modern pattern is **one canvas where components are LIVE/interactive + a properties
  inspector**, not a separate "simulate" mode.
- **Founder intent**: Lego components must be interactive. If the canvas is already
  interactive, a separate "Simulate" is redundant.
- **Target**: collapse the triad into Lego itself:
  - **Browse** (default): live interactive preview of the selected block (clickable
    tabs, toggles, hover) — replaces "Assemble" + "Simulate".
  - **Edit** (role-gated): the inspector becomes editable (contract for L3, token
    values for L0-L2) — replaces "Author".
  - The Graphics-Authority simulation (`graphics_simulation_run` evidence) still runs
    automatically on a token/contract SAVE (compliance evidence), not as a user-facing
    button. So remove the standalone "Mô phỏng" button; fold its evidence call into
    save actions. Document the decision in the prompt.

## 6. Preset attribute editor — research: add MANY attributes
Today the preset edit form has 5 fields. A theme preset should be able to override the
full token surface (mig 263 has an `overrides` JSONB bag exactly for this). Research-
backed attribute groups to expose in the editor (write into `overrides` when not a
first-class column):
- **Brand & color**: brand seed (+ live OKLCH ramp preview), semantic roles
  (success/warning/danger/info/neutral light+soft+strong), surface/bg layers, borders
  (subtle/default/strong), text (strong/default/muted), focus ring.
- **Density**: component gap (density_px), section gap, frame/edge gap.
- **Radius**: outer (card), inner (control), pill.
- **Control**: control height (exact px).
- **Typography**: font family, base size, scale ratio (1.125/1.25…), heading weights.
- **Elevation**: shadow set (card/dropdown/modal).
- **Motion**: duration fast/base/slow, easing.
- **Borders/strokes**: width, focus width.
Each row in the preset library gets **Sửa** → this grouped panel (collapsible groups),
live preview, Save → `graphics_theme_preset_save` (columns + overrides bag). Builtin
presets stay read-only (clone→edit). This makes the preset the rich SSOT theme object.

## 7. Tham chiếu — tear down & rebuild (not stacked)
Today: 3 stacked `<details>` (WCAG/analytics/standard renderers). Rebuild as a
purposeful **QA & compliance surface** for the CURRENT active theme:
- **Live contrast audit**: compute AA/AAA pass/fail for the *actual resolved tokens*
  now in `:root` (not a static pair list) → red/green per pair + worst offenders.
- **Token coverage / health**: which tokens are governed vs free-floating, drift.
- **Export**: current tokens → CSS/SCSS/JS (one action).
- **Standard**: link/embed the design-standard doc, but as a reference pane, not the
  default-open 165KB blob.
Design it as one coherent dashboard (cards), reusing the underlying compute (WCAG math,
export) but NOT the 3-stacked layout. This is the "đập đi xây lại" the founder wants.

## 8. Giao diện 3 tabs — purpose & SSOT re-justification
- **Mẫu bố cục (templates)**: template registry lifecycle — Preview/Validate/Impact/
  **Publish/Stage/Canary/Apply globally/Rollback**. UNIQUE governance authority; not in
  Module Studio. KEEP. (This is the deploy/promote control plane for graphics.)
- **Quản trị tuân thủ (governance)**: Standard-36 compliance matrix, drift detector,
  release blockers, waiver workflow, audit history. UNIQUE. KEEP.
- **Nâng cao (advanced)**: changeset/release dashboard + waiver + draft cache I/O +
  duplicated publish controls. PARTIAL DUP with templates (publish/rollback). Action:
  de-dup — advanced keeps changeset/release/waiver/import-export; remove the duplicated
  rollout buttons (templates owns them). Confirm no overlap with Module Studio (none —
  these are release governance, MS is authoring). KEEP (slimmed).
- **Net**: Giao diện = the **release & governance** plane; Module Studio = the
  **authoring** plane. Clean SSOT boundary: author in MS, promote/govern in Giao diện.

## 9. Parallelization — file ownership (collision-free)
Module Studio surfaces are extracted into **per-domain files** behind a surface
registry the shell exposes (`window.MStudio.registerSurface(key, def)`), so each
session owns its own file and never edits the shell or another session's file.
- Shell `32-module-studio.js` (registry + shared bar/dispatch) — owned by THIS session
  (set up as groundwork before the 3 run). The 3 sessions DO NOT edit it.
- **PROMPT-MSV2-1 (Theme/Settings/Preset)** owns: `mom/scripts/portal/32a-mstudio-theme.js`
  + `00d-admin-appearance-theme.js`.
- **PROMPT-MSV2-2 (Lego⊕Tokens + interaction)** owns: `mom/scripts/portal/32b-mstudio-lego.js`
  + `00c-admin-appearance-module-sample.js`.
- **PROMPT-MSV2-3 (Modules + Tham chiếu + Giao diện audit)** owns:
  `mom/scripts/portal/32c-mstudio-modules.js` + `00c-admin-appearance.js`.
- `portal.html` script tags for 32a/32b/32c — added by THIS session as groundwork.
Each prompt = own branch `codex/sessionN-msv2-*`, own files, standard gate
(syntax → SSOT/no-hardcode → Chrome test every button → cherry-pick → PR → CI → merge
→ deploy → verify). This session verifies the integrated result after all 3 merge.

## 10. Cross-cutting SSOT rules (all 3 prompts must obey)
- No attribute controlled in two surfaces (see §1). Density/radius/control/brand live
  on the **preset** only; mode/font/motion on **Settings** only.
- No hardcoded hex/px authority in JS — bind to `--o3-*` tokens / read via
  GraphicsAuthority. Spacing 8/12, control 32, radius 4/8/pill.
- All writes via `window.apiCall` (CSRF). Theme apply persists org-wide via the
  unified path (Phase A: o3-theme + overrides → `_moduleMasterStore.persist`).
- Every interactive control = single 32px standard height.
- Test EVERY button in Chrome via code before reporting done (computed-style /
  round-trip, not screenshots-as-proof).

---
## ADDENDUM (2026-06-02b) — augmentations after deep world research
Founder directive: research world docs/case studies and AUGMENT the plan, don't just
implement the bullet list. New normative spec: **MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md**.
Five changes that REVISE this plan:
1. **Semantic token tier is now mandatory** (DTCG 2025.10 stable; Spotify lesson). A
   preset edits the SEMANTIC (T2) layer + brand seed, never raw component CSS. Lego L0
   splits into L0a Primitive / L0b Semantic. This is the deepest correction.
2. **Token naming taxonomy** namespace·object·base·modifier (EightShapes); every token
   tagged with `tier` in `graphics_token_catalog`.
3. **Atomic/dependency-graph navigation** in Lego (component → tokens it consumes, à la
   Spectrum), not a flat list. Labels flexible; hierarchy is the point (Frost 2025).
4. **Schema-driven module = metadata ⟂ content** (Retool/Budibase) — formalizes the two
   edit buttons; one record, two disjoint halves, schema-driven render.
5. **A11y hybrid WCAG 2.2 AA (legal) + APCA Lc (perceptual)**; governance = semver +
   status(draft/published/deprecated) + audit, promote/rollback stays in Giao diện.
All 3 prompts updated with a "FOUNDATION (READ + OBEY)" block + a hardened Definition of
Done (zero console errors, full backend round-trip, SSOT grep proof).
