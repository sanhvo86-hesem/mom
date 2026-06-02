# PROMPT — Module Studio v2 · Session 2 of 3 (Lego ⊕ Tokens · level taxonomy · interaction model)

You are ONE of three AI sessions upgrading HESEM "Module Studio" in parallel. You own
the **Lego + Tokens** domain: merge them into ONE level-organized "Lego" tab and redesign
the Assemble/Author/Simulate interaction model. Sessions 1 (Theme/Settings) and 3
(Modules/Reference/Giao diện) run concurrently — do NOT touch their files.

## FOUNDATION (READ + OBEY — normative)
**`_reports/lego-empire/MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md`** is the
world-standard spec. For you, the load-bearing rules:
- **THREE-TIER tokens (DTCG 2025.10).** Your L0 level MUST split into **L0a Primitive
  (raw ramp/scales)** and **L0b Semantic (intent aliases: brand.primary, color.bg.*,
  space.master, control.height.standard)** — this is the most important architectural
  fix. Component token edits (T3) live at L2. **No surface edits the same token at two
  tiers.** Tag each `graphics_token_catalog` token with `tier: primitive|semantic|component`
  (coordinate the catalog tagging — it may need a small migration; note in contracts file).
- **Atomic mapping**: L0 ions/tokens · L1 atoms (primitives) · L2 molecules (components) ·
  L3 organisms (blocks) · L4 templates (archetypes) · L5 pages (module). Navigation shows
  the **dependency graph** (each component lists which tokens/level it consumes — like
  Spectrum's usage view), not a flat 174-item dump. Labels flexible; hierarchy is the point.
- **Naming taxonomy** namespace·object·base·modifier (EightShapes); register new tokens
  in the catalog with `css_variable` + `tier` before any UI reads them.
- Do NOT edit theme/preset attributes here (density/radius/control/brand are SEMANTIC and
  owned by MSV2-1's preset editor). You own component/token contracts.
- **Definition of Done §8**: zero console errors, every interaction Chrome-tested via code,
  backend round-trip on every save, SSOT grep proof, no graphics regression (blocks render
  REAL content), don't leave org theme dirty.

## READ FIRST
1. `bash tools/ai/preflight.sh`.
2. `_reports/lego-empire/MODULE-STUDIO-V2-RESEARCH-2026-06-02.md` — your work is §2
   (surface 1), §3 (Lego⊕Tokens level taxonomy), §5 (Assemble/Author/Simulate redesign),
   §9 (file ownership), §10 (SSOT). 
3. `CLAUDE.md` (Graphics Authority no-hardcode; Module Sample is canonical component SSOT;
   6-layer Lego model L0–L5; PDO `?`; deploy gates).
4. `mom/scripts/portal/32-module-studio.js` — the SHELL. Read the registry section
   (`window.MStudio.registerSurface`, `window.MStudio.api`). Read the current built-in
   `renderLego/renderLibrary/renderCanvas/renderInspector` + the demo harvest
   (`loadDemo`, `L3_DEMO_ALIAS`, `safeRender`) — you will reimplement these in your file.
   **DO NOT EDIT THE SHELL.**

## YOUR FILES (own exclusively)
- CREATE `mom/scripts/portal/32b-mstudio-lego.js` — registers the merged Lego surface +
  REMOVES the standalone tokens surface (register `tokens` with `{hidden:true}` so the
  shell drops it, since its content now lives inside Lego's L0–L2 levels).
- EDIT `mom/scripts/portal/00c-admin-appearance-module-sample.js` — re-classify the
  component/token dock BY LEVEL (L0 tokens / L1 primitives / L2 components) so Lego can
  consume it level-by-level. Keep its self-wiring MutationObserver intact.
- APPEND one `<script src=".../32b-mstudio-lego.js?v=...">` in `mom/portal.html` after
  the shell tag.
**Do NOT edit** the shell, `32a-*`, `32c-*`, `00c-admin-appearance.js`, `00d-*`, `70-74-*`.

## REGISTRY CONTRACT
```js
window.MStudio.registerSurface('lego', {
  label: '🧱 Lego', order: 10, layout: 'grid' /* if you keep a multi-column body */,
  render: function(){ return '…'; }, onMount: function(host){…}, onAction: function(k,t,ev){ return handled; }
});
window.MStudio.registerSurface('tokens', { hidden: true });   // fold Tokens into Lego
```
Shell helpers: `window.MStudio.api` → getJson/post/toast/esc/state/host()/repaint()/repaintBody().
Block engine globals you reuse: `window.HmBlockEngine.BLOCK_CATALOG`, `window.Blocks.render(type,cfg,{preview:true})`,
`window.__HM_BLOCK_REGISTRY__` (L3), `window.__HM_ARCHETYPE_REGISTRY__` (L4), Lego Showcase
module `module_schema_get&id=M-lego-showcase` for demo configs.

## WHAT TO BUILD

### A. ONE "Lego" tab, level sub-tabs (L0 → L5)
A left level-rail (or inner tab strip): **L0 Tokens · L1 Primitives · L2 Components ·
L3 Blocks · L4 Archetypes · L5 Module**. Selecting a level shows that level's library +
a live preview + an inspector. One search box filters across the current level.
- **L0 Tokens / L1 Primitives / L2 Components** = the Module Master dock content
  (`window._renderAdmModuleSampleHtml`) RE-GROUPED by level (today it's component-grouped;
  in `00c-admin-appearance-module-sample.js` re-tag each section with a `level` field so
  Lego can filter L0/L1/L2). Keep the per-token edit dock + its MutationObserver wiring.
- **L3 Blocks** = `__HM_BLOCK_REGISTRY__` published blocks (6) — keep the rich preview
  (render with demo config, the founder's "blocks must show real graphics" — reuse the
  demo-harvest approach from the shell's `loadDemo`/`L3_DEMO_ALIAS`).
- **L4 Archetypes** = `__HM_ARCHETYPE_REGISTRY__` zone skeletons.
- **L5 Module** = a read view of the assembled manifest (links to Modules surface for
  editing — owned by Session 3; just navigate, don't duplicate).
- The 174-type engine catalog: surface it under the appropriate level (most are L2
  components / L1 primitives) — classify by `BLOCK_CATALOG[type].category`.

### B. Interaction model — redesign Assemble / Author / Simulate (§5)
- Make the preview **interactive** (clickable tabs, toggles, hover states live) — not a
  static render. World refs: Storybook controls, Figma select→edit, Radix playground.
- Collapse the triad into Lego:
  - **Browse** (default): interactive live preview (replaces Assemble + Simulate).
  - **Edit** (role-gated for authors): inspector becomes editable — L0–L2 edit token
    values (reusing the dock), L3 edit the block contract (`graphics_block_contract_save`).
  - **REMOVE the standalone "Mô phỏng" button.** Keep the Graphics-Authority simulation
    EVIDENCE (`graphics_simulation_run`) but fire it automatically inside a token/contract
    SAVE, not as a user button. Document this decision in your exec report.
- Decide & justify (research) whether any "simulate scene" modal is still warranted for
  WCAG/edge previews; if so, fold it into the Edit flow, not a top-bar button.

### C. SSOT
The token-edit dock must be the ONE place L0–L2 tokens are edited (no duplicate sliders;
density/radius/control/brand belong to PRESETS — Session 1 owns those; do NOT add theme
sliders here). Prove with grep that Lego edits component/token contracts only, not theme
preset attributes.

## RESEARCH DEPTH
- Study Storybook's "Canvas + Controls + Docs" and how design-system explorers organize
  by atomic level (atoms/molecules/organisms ≈ L1/L2/L3). Apply the level taxonomy
  cleanly so navigation is logical, not a flat 174-item dump.
- Interactive preview: components should respond to user input in the canvas (e.g. a tab
  block's tabs switch, a toggle flips) using the real renderer output + minimal event
  delegation. Don't fake it.

## SSOT / NO-HARDCODE
No hex/px authority in JS — `--o3-*` tokens; spacing 8/12, control 32, radius 4/8/pill.
Writes via `api.post` (CSRF). Single 32px control height. Reuse shell CSS classes.

## QUALITY GATE
branch `codex/session2-msv2-lego-<date>` from origin/main → build → self-audit → `node
--check` → **test EVERY interaction in Chrome via code**: each level rail switches +
shows its library; L3 block preview renders REAL graphics (length > threshold, contains
content not empty shell); interactive preview responds to clicks; Edit mode saves a token
(verify CSS var changes) and an L3 contract (verify `graphics_block_contract_save` ok);
tokens surface tab is gone; no "Mô phỏng" button remains. Gather bugs in one pass → fix →
retest until clean → cherry-pick → PR → CI green → merge → deploy → verify live Chrome →
write `_reports/lego-empire/exec/msv2-2-lego.md`. Do not leave the org theme dirty from
token-edit tests (revert/no-save).

## COORDINATION
Append new action_key / level-tagging JSON shape to
`_reports/lego-empire/CONTRACTS-MODULE-STUDIO.md`. The `level` field you add to
module-sample sections is yours; Session 1/3 don't touch that file.
