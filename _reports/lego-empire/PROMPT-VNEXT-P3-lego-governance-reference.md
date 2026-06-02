# PROMPT — Module Studio vNext · P3 (Lego workbench + Governance + Reference Playbook)

You are 1 of 3 parallel AI sessions. You own the **Lego** workbench, the **Governance** tab,
and the **Reference** Authority Playbook.

## AUTHORITATIVE BRIEF (read all, in order)
1. `bash tools/ai/preflight.sh`.
2. **`_reports/lego-empire/MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md`** (normative).
3. **`_reports/lego-empire/MODULE-STUDIO-VNEXT-RECONCILIATION-2026-06-02.md`** (§C, §D, §E).
4. Detailed task checklist = **GPT Pro's file → "PROMPT 3"**, WITH the corrections below.
5. `CLAUDE.md` (6-layer Lego; Module Sample = canonical components; no-hardcode); read the
   shell registry section (don't edit it), `00c-admin-appearance-module-sample.js`,
   `00c-admin-appearance.js` (governance/templates/advanced renderers you'll reuse).

## CORRECTIONS to GPT Pro PROMPT 3 (these override it)
- **Register via the LIVE registry** from your own files (no shell edit, no waiting on P1):
  `registerSurface('lego',{...}); registerSurface('governance',{...}); registerSurface('reference',{...});`
- **Lego L0 splits into L0a Primitive / L0b Semantic (Foundation §1)** — the most important
  fix. Level tabs: **L0a Primitive · L0b Semantic · L2 Components · L3 Blocks · L4 Templates
  · L5 Build Packets**. Navigation is a **dependency graph** (each component lists which
  tokens/level it consumes, à la Spectrum) — not a flat 174-item dump. Token *editing* at
  L0 is via the Presets/Settings authority (P2) — Lego L0 is read/reference + component-
  token (T3) edits at L2. Do NOT add theme/preset sliders here (P2 owns density/radius/
  control/brand).
- **Modes Browse | Assemble | Author | Validate.** Author = registry definitions
  (L2/L3/L4): the L3 editor exposes slots/variant_axes/required_tokens/a11y_contract/
  preview_scene_key (not just name/status) → `graphics_block_contract_save`; L4 →
  `graphics_module_archetype_save`. Assemble = module CONTENT only (zones/blocks/slots/
  data) via `module_schema_save` (+ baseVersion); blocks restricted to the zone contract;
  no raw style/HTML/hex/px. **Validate replaces "Mô phỏng"** (keep the evidence purpose):
  preview scene + interaction + WCAG + no-hardcode + backend-binding + impact →
  `graphics_simulation_run_record`/`graphics_qa_gate_run`/`module_schema_validate_bindings`;
  label PASS/WARN/FAIL_BLOCK/NOT_RUN/BACKEND_GAP.
- **Governance tab = REUSE existing renderers (staged), NOT a from-scratch rebuild.** Pull
  in the live `templates`/`governance`/`advanced` machinery (publish/stage/canary/apply/
  rollback/audit/waivers/blockers) the same absorb-by-reuse way v0.6 absorbed Module Master.
  **WCAG/contrast evidence lives HERE** (Governance/Validate), not in Reference. De-dup:
  remove `advanced`'s duplicated rollout buttons (templates owns rollout). Archetype
  *definitions* → Lego L4 Author; *promotion lifecycle* → Governance (do not put rollout in
  Lego). Do NOT rebuild the live promote/rollback authority from scratch.
- **Reference = generated Authority Playbook (read-only)**: authority map (concept→owner→
  write path→backend action→table→evidence→consumers), level model L0–L5, standards→gates
  (WCAG/DTCG/contract/RFC9457/no-hardcode), anti-pattern catalog, decision log,
  troubleshooting. NOT the old stacked WCAG/analytics/standard panels.

## OWNED FILES
`mom/scripts/portal/32b-mstudio-lego-workbench.js` (CREATE) ·
`mom/scripts/portal/32c-mstudio-governance-reference.js` (CREATE) ·
`mom/scripts/portal/00c-admin-appearance-module-sample.js` (add `level` tag per section) ·
`mom/contracts/module.build-packet.schema.json` / `check_module_manifest.php` if tightening
the gate. Append your `<script>` tags in `mom/portal.html` (disjoint lines). Do NOT edit the
shell, 32a, 00d.

## DEFINITION OF DONE
`node --check` (+ `php -l` if PHP touched); **zero console errors**; **every interaction
Chrome-tested via code**: Lego level tabs switch (L0a/L0b/L2/L3/L4/L5); Tokens NOT top-level
(it's L0 in Lego); L3 block preview renders REAL graphics (not empty shell); interactive
preview responds to clicks; Author L3 saves full contract (slots/tokens/a11y) round-trip;
Assemble blocks unknown-block/raw-style; **Validate records evidence** (pass/warn/fail);
Governance hosts rollout/audit (reused, no dup), WCAG evidence present; Reference is the
Playbook (not stacked panels). SSOT grep: Lego edits component/block/archetype contracts
only (no theme attrs). Don't leave org theme dirty. Exec report
`_reports/lego-empire/exec/vnext-p3-*.md` + phrase `MSTUDIO_VNEXT_P3_PASS_*`. Standard gate
through deploy + live verify.
