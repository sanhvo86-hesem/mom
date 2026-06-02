# PROMPT — Module Studio vNext · P2 (Presets Library + Settings + token authority)

You are 1 of 3 parallel AI sessions. You own the **Presets** + **Settings** surfaces.

## AUTHORITATIVE BRIEF (read all, in order)
1. `bash tools/ai/preflight.sh`.
2. **`_reports/lego-empire/MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md`** (normative).
3. **`_reports/lego-empire/MODULE-STUDIO-VNEXT-RECONCILIATION-2026-06-02.md`** (§C, §D, §E).
4. Detailed task checklist = **GPT Pro's file → "PROMPT 2"**, WITH the corrections below.
5. `CLAUDE.md` (Graphics Authority no-hardcode; PDO `?`); read the shell registry section
   in `32-module-studio.js` (do not edit it) + `00d-admin-appearance-theme.js`.

## CORRECTIONS to GPT Pro PROMPT 2 (these override it)
- **Register via the LIVE registry** from your own file — no shell edit, no waiting on P1:
  `window.MStudio.registerSurface('presets', {...}); window.MStudio.registerSurface('settings', {...});`
  Use `window.MStudio.api` helpers; match shell CSS classes (`mstudio__*`).
- **THREE-TIER tokens (Foundation §1) — load-bearing.** A preset edits the **SEMANTIC (T2)
  tier + brand seed ONLY**, never raw component CSS. Primitive seeds are a constrained
  palette (T1); semantic slots reference them. The rich editor's 16 groups map to T2
  categories; raw literals allowed ONLY in a primitive-seed slot, never in a semantic slot
  (GPT Pro says this too — enforce it). Derive the OKLCH ramp from the brand seed (reuse
  existing helpers). Apply persists org-wide via the **shipped Phase-A authority**
  (`o3-theme` + overrides → `_moduleMasterStore.persist` → backend design config); reuse it.
- **localStorage = preview cache only** (the existing Phase-A pattern already complies —
  backend is the authority). Do NOT make localStorage a committed authority.
- **Backend: reuse existing actions** (`graphics_theme_preset_list/save/delete/clone`,
  `graphics_token_catalog_snapshot`). Add a new endpoint ONLY if genuinely missing; if so
  it ships a **JSON-schema contract in `mom/contracts/` + RFC 9457 errors + CSRF +
  permission + audit + optimistic lock** (OpenAPI is aspirational, NOT a blocker — note it
  as backlog). If you implement a frontend-only validator/impact because the backend lacks
  it, mark it ADVISORY and file a backend-gap report.
- **DTCG export** = interchange/export target, not the runtime authority.
- Settings holds Mode/Typography/Motion/Density-control **org policy** only; it may offer
  an explicit "create preset draft from current settings" action but never silently edits a
  preset.

## OWNED FILES
`mom/scripts/portal/32a-mstudio-presets-settings.js` (CREATE) · `00d-admin-appearance-theme.js`
(retire Theme-Template duplication) · `mom/contracts/*.schema.json` + minimal backend in
`GraphicsGovernanceController.php`/routes **only if an endpoint is missing**. Append your
`<script>` tag in `mom/portal.html` (1 line; P1 also touches it — disjoint line, mergeable).
Do NOT edit the shell, 32b/32c, 00c*.

## DEFINITION OF DONE
`node --check` (+ `php -l` if backend touched); **zero console errors**; **every button
Chrome-tested via code**: Presets tab exists, Theme-Template tab gone, every row Edit opens
the RICH grouped editor (not 6 fields), preset save → re-list shows it → apply → reload
shows org-wide effect (full round-trip), Validate returns pass/warn/fail, DTCG export emits
valid JSON, Settings peer tab, Mode/Typo/Motion apply + persist via authority. SSOT grep:
density/radius/control/brand edited ONLY here (preset/settings), not in Lego or anywhere
else; no hardcode (color-input defaults are data). Restore org theme to default after
destructive tests. Exec report `_reports/lego-empire/exec/vnext-p2-*.md` + phrase
`MSTUDIO_VNEXT_P2_PASS_*`. Standard gate through deploy + live verify.
