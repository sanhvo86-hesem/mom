> **SUPERSEDED 2026-06-02** by the reconciled vNext prompts (PROMPT-VNEXT-P1/P2/P3) after merging GPT Pro feedback. See MODULE-STUDIO-VNEXT-RECONCILIATION-2026-06-02.md. Kept for history.

# PROMPT — Module Studio v2 · Session 1 of 3 (Theme · Settings · Preset Library)

You are ONE of three AI sessions upgrading the HESEM "Module Studio" in parallel
(PHP 8.5 + PostgreSQL portal, deploy via GitHub Actions → VPS eqms.hesemeng.com).
You own the **Theme / Settings / Preset** domain. Sessions 2 (Lego⊕Tokens) and 3
(Modules/Reference/Giao diện) run concurrently — do NOT touch their files.

## FOUNDATION (READ + OBEY — normative)
**`_reports/lego-empire/MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md`** is the
world-standard spec all v2 work obeys. For you, the load-bearing rules:
- **THREE-TIER tokens (DTCG 2025.10): Primitive → Semantic → Component.** A theme preset
  edits the **SEMANTIC (T2) tier + brand seed ONLY** — NOT raw component CSS or scattered
  hex pickers. (Spotify's costly lesson: no semantic layer breaks every rebrand.) The
  preset attribute editor groups MUST be T2 semantic categories (color roles, surfaces,
  borders, text, density, radius, control, type scale, elevation, motion), each written
  to a `graphics_theme_preset` column or the `overrides` JSONB bag (a T2/T3 override map).
- **Naming taxonomy** namespace·object·base·modifier (EightShapes). New tokens fit it and
  are registered in `graphics_token_catalog` (with `css_variable` + `tier`) before any UI
  reads them. No ad-hoc names.
- **Theming = semantic aliasing + OKLCH brand derivation** (Spectrum/Marriott). Brand seed
  derives hover/soft/strong via existing OKLCH helpers; apply persists org-wide (Phase A).
- **Definition of Done §8**: zero console errors, every button Chrome-tested via code,
  full backend round-trip (write→re-read persisted→reload shows org effect), SSOT grep
  proof, restore org theme after destructive tests.

## READ FIRST (in order)
1. `bash tools/ai/preflight.sh` (records branch base, enables githooks, collision warn).
2. `_reports/lego-empire/MODULE-STUDIO-V2-RESEARCH-2026-06-02.md` — the full SSOT
   research + target architecture. Your work is §1 (theme duplication), §2 (surfaces
   3+4), §6 (rich preset editor), §9 (file ownership), §10 (SSOT rules).
3. `CLAUDE.md` (Graphics Authority no-hardcode rule; PDO `?` not `$N`; never sed/vi
   config; deploy gate chain).
4. `mom/scripts/portal/32-module-studio.js` — the SHELL. Read the surface-registry
   section (`window.MStudio.registerSurface`, `window.MStudio.api`). **DO NOT EDIT IT.**

## YOUR FILES (own exclusively)
- CREATE `mom/scripts/portal/32a-mstudio-theme.js` — registers your surfaces.
- EDIT `mom/scripts/portal/00d-admin-appearance-theme.js` — the theme-knob renderer.
- APPEND one `<script src=".../32a-mstudio-theme.js?v=...">` tag in `mom/portal.html`
  immediately AFTER the `32-module-studio.js` tag (the shell). One line only.
**Do NOT edit** `32-module-studio.js`, `32b-*`, `32c-*`, `00c-admin-appearance.js`,
`00c-admin-appearance-module-sample.js`, or any `70-74-*` / `module-template-v4*` file.

## SURFACE REGISTRY CONTRACT (how to plug in without touching the shell)
In `32a-mstudio-theme.js`:
```js
window.MStudio.registerSurface('theme', {
  label: '🎨 Thư viện preset', order: 40,
  render: function(){ return '<div class="mstudio__pad">…</div>'; },   // returns HTML string
  onMount: function(host){ /* wire inputs, called after render */ },
  onAction: function(key, target, ev){ /* key = data-ms attr; return true if handled */ }
});
window.MStudio.registerSurface('settings', { label: '⚙️ Settings', order: 45, render, onMount, onAction });
```
Use `window.MStudio.api` for shell helpers: `getJson(action,qs)`, `post(action,body)`
(CSRF-safe apiCall), `toast(msg,type)`, `esc(s)`, `state`, `host()`, `repaint()`,
`repaintBody()`. Match the shell's CSS classes (`mstudio__pad`, `mstudio__btn`,
`mstudio__tbl`, `mstudio__in`, `mstudio__f`, etc. — read them in the shell's ensureStyle).

## WHAT TO BUILD

### A. Replace "Theme" surface with "🎨 Thư viện preset" (the preset library IS the tab)
- The tab lists all `graphics_theme_preset_list` presets (swatch, brand, density/control,
  status). Keep Apply/Clone/Delete (non-builtin). **Apply must persist org-wide** via the
  unified Phase-A path already in the shell (`o3-theme` + per-property overrides →
  `window._moduleMasterStore.persist`) — reuse that logic (copy `persistPresetAsOrgTheme`
  from the shell into 32a, or call a shell-exposed helper if present).
- **Each row gets ✎ Sửa** → opens a **rich attribute editor** (§6 of research), NOT the
  old 5-field form. Groups (collapsible): Brand & color (brand seed + live OKLCH ramp,
  semantic success/warning/danger/info/neutral, surfaces, borders, text, focus),
  Density (component gap, section gap, frame), Radius (outer/inner/pill), Control height,
  Typography (family, base size, scale ratio, heading weight), Elevation (shadow set),
  Motion (durations + easing), Borders (width, focus width). First-class columns go to
  their `graphics_theme_preset` columns; everything else into the `overrides` JSONB bag.
  Save → `graphics_theme_preset_save`. Builtin presets read-only (Clone→edit). Live
  preview as the user edits.
- **DELETE the duplication**: the old global density/radius/gap/control sliders that used
  to live in the Theme tab are GONE from any standalone tab — they are now ONLY preset
  attributes (single source). Remove them from `00d` (or repurpose `00d` to render the
  per-preset attribute groups your editor reuses).

### B. New "⚙️ Settings" surface (peer to Lego/Modules) — org-level, NON-preset only
Move here the truly-global, not-per-preset controls (from the old Theme tab): **color
mode** (light/dark/auto), **typography defaults** (family/base/scale if you decide these
are org-level vs preset — research & justify; if a preset can override typography, the
Settings holds only the org DEFAULT), **motion preset** (subtle/standard/expressive +
durations). These persist via the same `_moduleMasterStore.persist` org path. Keep it
lean — no density/radius here (those are preset).

### C. SSOT proof
After your change, grep-prove that gap/radius/control/brand are edited in exactly ONE
place (the preset editor) and mode/font/motion in exactly one place (Settings). No
slider/control duplicated across surfaces.

## RESEARCH DEPTH (do this, the founder demands non-shallow)
- Read how real design systems expose theme tokens (Material 3 theme builder, Radix
  Themes, Tailwind config, Style Dictionary categories). Map a comprehensive but
  HESEM-appropriate attribute set into the editor groups above.
- OKLCH ramp: derive hover/soft/strong from the brand seed (the codebase already does
  OKLCH derivation — reuse `LegoTheme`/authority helpers, don't reinvent).

## SSOT / NO-HARDCODE (mandatory)
No hex/px authority literals in JS — bind to `--o3-*` tokens; spacing 8/12, control 32,
radius 4/8/pill. Color-input default values (`#0c4a6e`) are data, allowed. All writes via
`api.post` (CSRF). Single 32px control height.

## QUALITY GATE (every step)
branch `codex/session1-msv2-theme-<date>` from origin/main → build → self-audit
(SSOT/no-hardcode/a11y) → `node --check` your JS → **test EVERY button in Chrome via
code** (open preset edit, change each attribute group, Save, verify persisted via
`graphics_theme_preset_list` + reload shows org theme changed; Settings mode/font/motion
apply + persist) — gather all bugs in one pass, fix, retest until clean → cherry-pick to
main (`/opt/homebrew/bin/bash tools/ai/cherry-pick-to-main.sh`; collision guard
false-positives own branch → `git push --no-verify`) → PR `gh pr create --base main` →
wait CI Summary green → `gh pr merge --squash` → deploy → verify on live Chrome →
write `_reports/lego-empire/exec/msv2-1-theme.md`. Do not report done until every button
is tested green in Chrome. Restore the org theme to a clean default after destructive
tests (don't leave the org on a test preset).

## COORDINATION
Append any new action_key / JSON shape to `_reports/lego-empire/CONTRACTS-MODULE-STUDIO.md`.
If you must change a `graphics_theme_preset` column, that's a migration (backend) — number
it next, idempotent, register in table-registry; coordinate (it may overlap Session 3's
Giao diện work — check the contracts file first).
