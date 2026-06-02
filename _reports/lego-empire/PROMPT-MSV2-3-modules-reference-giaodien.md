> **SUPERSEDED 2026-06-02** by the reconciled vNext prompts (PROMPT-VNEXT-P1/P2/P3) after merging GPT Pro feedback. See MODULE-STUDIO-VNEXT-RECONCILIATION-2026-06-02.md. Kept for history.

# PROMPT — Module Studio v2 · Session 3 of 3 (Modules lifecycle · Tham chiếu rebuild · Giao diện audit)

You are ONE of three AI sessions upgrading HESEM "Module Studio" in parallel. You own
**Modules**, the **Tham chiếu** surface rebuild, and the **Giao diện (Quản trị đồ họa &
Phát hành)** 3-tab audit. Sessions 1 (Theme/Settings) and 2 (Lego⊕Tokens) run
concurrently — do NOT touch their files.

## FOUNDATION (READ + OBEY — normative)
**`_reports/lego-empire/MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md`** is the
world-standard spec. For you, the load-bearing rules:
- **Schema-driven module = metadata ⟂ content (Retool/Budibase pattern, Foundation §5).**
  ONE `module_schema` record; "✎ Sửa thông tin" edits the METADATA half (id/title/subtitle/
  icon/route/roles/archetype/preset/domain/description), "🧩 Sửa nội dung" edits the
  CONTENT half (zones[]→blocks[]+slot data) via the schema-driven `HmBlockEngine` (no
  hardcoded layout). Validate against `module.build-packet.schema.json` (P4 gate) before save.
- **Lifecycle/governance (Foundation §6)**: modules carry `status` (draft→published→
  deprecated) + version; deprecation is a status+badge, never a silent delete; mutations
  write `audit_events`; promote/rollback stays in Giao diện (don't bypass).
- **Accessibility hybrid (Foundation §7)**: the Tham chiếu live audit computes **WCAG 2.2
  AA** (4.5:1 / 3:1) from the ACTUAL resolved `:root` token pairs, AND shows **APCA Lc**
  values as perceptual guidance (do NOT claim APCA/WCAG-3 as compliance — it's draft).
- **Definition of Done §8**: zero console errors, every button Chrome-tested via code, full
  backend round-trip (create→list shows it; edit→re-get shows change; archive toggle
  actually hides/shows), SSOT grep, roles from RBAC (no hardcoded role keys), clean up test
  modules.

## READ FIRST
1. `bash tools/ai/preflight.sh`.
2. `_reports/lego-empire/MODULE-STUDIO-V2-RESEARCH-2026-06-02.md` — your work is §2
   (surfaces Modules + Reference), §4 (modules lifecycle + archive bug), §7 (Tham chiếu
   rebuild), §8 (Giao diện audit), §9 (file ownership), §10 (SSOT).
3. `CLAUDE.md`; `.ai/USER_IDENTITY_SSOT.md` (roles are RBAC-sourced — for the module
   roles multi-select, read role keys from the RBAC authority, never hardcode).
4. `mom/scripts/portal/32-module-studio.js` — the SHELL. Read the registry section +
   the current built-in `renderModules / doCreateModule / doEditModule / doArchive /
   incDelChecked / renderReference` (you will reimplement these in your file). **DO NOT
   EDIT THE SHELL.**

## YOUR FILES (own exclusively)
- CREATE `mom/scripts/portal/32c-mstudio-modules.js` — registers `modules` + `reference`
  surfaces (replacing the shell's built-ins).
- EDIT `mom/scripts/portal/00c-admin-appearance.js` — the Giao diện admin (audit/dedup
  per §8; you already own templates/governance/advanced there).
- APPEND one `<script src=".../32c-mstudio-modules.js?v=...">` in `mom/portal.html` after
  the shell tag.
**Do NOT edit** the shell, `32a-*`, `32b-*`, `00c-admin-appearance-module-sample.js`,
`00d-*`, `70-74-*`.

## REGISTRY CONTRACT
```js
window.MStudio.registerSurface('modules', { label:'📦 Modules', order:30, render, onMount, onAction });
window.MStudio.registerSurface('reference', { label:'📖 Tham chiếu', order:50, render, onMount, onAction });
```
Shell helpers: `window.MStudio.api` (getJson/post/toast/esc/state/host()/repaint()/repaintBody()).
Backend (already live): `module_schema_{list,get,save,delete,restore,versions,restore_version}`,
WCAG/analytics/standard renderers exposed as `window._renderAdmAccessibility/_renderAdmAnalytics/_renderAdmStandard`
(reuse their COMPUTE, not their stacked layout).

## WHAT TO BUILD

### A. Modules — rich create + two-path edit + archive-bug fix (§4)
- **Create**: replace the `prompt()` with a real MODAL dialog: title vi/en, subtitle
  vi/en, icon, route, **roles (multi-select from RBAC)**, archetype (L4 picker), theme
  preset picker, domain, description. Validate, then `module_schema_save`.
- **Edit = TWO buttons per row**:
  - **✎ Sửa thông tin** → modal with ONLY the original metadata fields (same as create,
    pre-filled). Save with `baseVersion` optimistic lock.
  - **🧩 Sửa nội dung** → enter the CONTENT editor for that module: add/remove Lego
    blocks, edit zone content, reorder — bind the existing block-engine builder
    (`HmBlockEngine.renderModuleFromSchema` + its edit mode) to this module's schema,
    save via `module_schema_save`. (If a full in-place builder is too large, at minimum
    open the module in the builder edit route and round-trip the schema.)
- **FIX the "hiện đã archive" checkbox bug** (§4 root cause): clicking doesn't tick;
  archived rows show but can't be re-hidden. Make the checkbox state authoritative in
  `state` (e.g. a surface-local `showArchived`), render `checked` from it, and have the
  change handler set state → reload → re-render reflects the state. Verify in Chrome:
  tick shows archived + box stays ticked; untick hides archived + box stays unticked.

### B. Tham chiếu — tear down & rebuild (NOT stacked) (§7)
Rebuild as ONE coherent QA dashboard for the CURRENT active theme:
- **Live contrast audit**: compute AA/AAA for the ACTUAL resolved `:root` tokens now
  (not a static pair list) — per-pair pass/fail + worst offenders, recomputed on demand.
- **Token health/coverage**: governed vs free-floating, drift summary.
- **Export**: current tokens → CSS / SCSS / JS (one action).
- **Standard**: a reference pane/link (not a 165KB default-open blob).
Reuse the WCAG math + export logic behind `_renderAdmAnalytics`/`_renderAdmAccessibility`
but design a fresh card dashboard. If you need the compute exposed cleanly, prefer
calling the existing window renderers' underlying helpers; if only the rendered HTML is
available, extract the compute into your file rather than stacking iframes.

### C. Giao diện audit & de-dup (§8) — file `00c-admin-appearance.js`
The admin now has 3 tabs (templates/governance/advanced). Verify each still renders
(don't break them). De-dup: **advanced** currently repeats templates' Publish/Apply/
Rollback rollout controls — remove the duplicated rollout buttons from `advanced` (leave
changeset/release/waiver/import-export); templates OWNS rollout. Confirm zero overlap
with Module Studio (these are release-governance, MS is authoring). Write the
purpose/keep/merge verdict for each of the 3 tabs into your exec report.

## RESEARCH DEPTH
- Module create/edit: study how low-code builders (Retool, Budibase, Appsmith) separate
  "app settings/metadata" from "app content/canvas" — that's exactly your two-button
  split. Make the metadata modal complete but not bloated.
- Live contrast audit: WCAG 2.1 relative-luminance formula; compute from the resolved
  hex of each token pair currently on `:root`.

## SSOT / NO-HARDCODE
Roles from RBAC (no hardcoded role keys — `.ai/USER_IDENTITY_SSOT.md`). No hex/px
authority in JS — `--o3-*` tokens; spacing 8/12, control 32, radius 4/8/pill. Writes via
`api.post` (CSRF). Single 32px control height. Reuse shell CSS classes.

## QUALITY GATE
branch `codex/session3-msv2-modules-<date>` from origin/main → build → self-audit →
`node --check` (both files) → **test EVERY button in Chrome via code**: create-modal all
fields → save → appears; Sửa thông tin pre-fills + saves (version bump); Sửa nội dung
opens content editor + round-trips; **archive checkbox ticks + toggles archived rows
correctly**; Tham chiếu live contrast shows real pass/fail for current tokens + export
works; Giao diện 3 tabs still render + advanced no longer duplicates rollout. Gather bugs
in one pass → fix → retest until clean → cherry-pick → PR → CI green → merge → deploy →
verify live Chrome → write `_reports/lego-empire/exec/msv2-3-modules.md`. Clean up any
test modules you create (archive/purge).

## COORDINATION
Append new action_key / JSON shape to `_reports/lego-empire/CONTRACTS-MODULE-STUDIO.md`.
The "Sửa nội dung" content editor may overlap Session 2's Lego block work — coordinate
via the contracts file (you consume the builder; they own the block library).
