# PROMPT — Module Studio vNext · P1 (Shell IA + Modules lifecycle + Archive fix)

You are 1 of 3 parallel AI sessions. HESEM portal (PHP 8.5 + PostgreSQL, deploy via GH
Actions → eqms.hesemeng.com). You own the **shell IA + Modules**.

## AUTHORITATIVE BRIEF (read all, in order)
1. `bash tools/ai/preflight.sh`.
2. **`_reports/lego-empire/MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md`** (normative:
   three-tier tokens, naming, atomic levels, schema-driven module = metadata⟂content,
   governance, a11y hybrid, Definition of Done).
3. **`_reports/lego-empire/MODULE-STUDIO-VNEXT-RECONCILIATION-2026-06-02.md`** (the merged
   decision; §C architecture, §D your split, §E gates).
4. Your detailed task checklist = **GPT Pro's `HESEM_MODULE_STUDIO_VNEXT_PARALLEL_PROMPTS_2026-06-02.md`
   → "PROMPT 1"** — follow it, WITH the corrections below (they win on conflict).
5. `CLAUDE.md`; read `mom/scripts/portal/32-module-studio.js` (esp. the registry section).

## CORRECTIONS to GPT Pro PROMPT 1 (these override it)
- **The surface registry ALREADY SHIPPED (v0.7).** `window.MStudio.registerSurface(key,def)`
  + `window.MStudio.api{getJson,post,toast,esc,state,host,repaint,repaintBody}` are LIVE;
  built-ins are fallbacks. You do NOT rebuild the shell from scratch — you (a) update
  `SURFACE_META` to the 6 tabs `lego|modules|presets|settings|governance|reference` with
  internal redirects (`theme→presets`, `tokens→lego`) + hide the old `theme`/`tokens`
  top-level, (b) add the 3 `<script>` tags for `32a/32b/32c` in `mom/portal.html` after the
  shell tag, (c) extend `window.MStudio.api` with `selectSurface/openModuleContent/
  openModuleMetadata/validateModule`. P2/P3 register their surfaces from their OWN files —
  do not block on them; your placeholders are fine until they ship.
- **Modules = ONE `module_schema` record.** Rich create = a token-bound MODAL (not
  `prompt()`; a solid modal counts — need not be 8 literal steps for v1). Two edit buttons
  ("✎ Thông tin" = metadata half, "🧩 Nội dung" = content half) both save the WHOLE record
  via the existing `module_schema_save` (+ baseVersion). **Do NOT add metadata_save/
  content_save endpoints** (that re-creates dual authority). For "Nội dung", hand off to the
  Lego Assemble surface (P3) via `MStudio.api.openModuleContent(id)` — placeholder until P3.
- **Archive fix:** `state.includeDeleted` is the source of truth; render the checkbox
  `checked` from it; `loadModules(inc)` sets state first; surface-switch/refresh/archive/
  restore all use `state.includeDeleted` (never a DOM `.checked` read). Verify in Chrome:
  tick shows archived + stays ticked; untick hides + stays unticked; survives tab switch.
- Backend: this prompt is frontend + portal.html only. No backend feature work here.

## OWNED FILES
`mom/scripts/portal/32-module-studio.js` · `mom/portal.html`. Do NOT edit 32a/32b/32c,
00c*, 00d, 70-74-*.

## DEFINITION OF DONE (Foundation §8 + GPT Pro stop rules)
`node --check` clean; **zero console errors**; **every button Chrome-tested via code** (6
tabs render; no top-level theme/tokens; archive checkbox stable; create modal not prompt;
metadata/content split; existing list/get/save/archive/restore still work); SSOT grep (no
duplicated write path, no hardcode). Exec report `_reports/lego-empire/exec/vnext-p1-*.md`
+ final phrase `MSTUDIO_VNEXT_P1_PASS_*`. Standard gate: branch → build → test → cherry-
pick → PR → CI green → merge → deploy → verify live Chrome.
