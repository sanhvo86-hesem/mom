# FIX BATCH C — Presets editor → full 16-group + lifecycle actions
Owner file: `mom/scripts/portal/32a-mstudio-presets-settings.js`.
Read FIRST: EVAL doc §2C, FOUNDATION §1 (three-tier — preset edits SEMANTIC T2 + brand seed
only), §6 attribute groups.

GOAL: complete the preset editor + per-row actions.
- Add missing editor groups: **lineage** (base_ref + "derived from" + version note),
  **supported modes** (light/dark/high-contrast/print), elevation/shadow, states,
  accessibility thresholds (WCAG 2.2 AA + APCA Lc), preview scenes. Target the full 16
  groups from FOUNDATION §6 (semantic-tier slots reference primitives; raw literal only in
  a primitive-seed slot).
- Per-row actions: **Validate** (token-ref resolution + WCAG + mode completeness, label
  pass/warn/fail/backend-gap) + **Impact** (which modules consume this preset).
- Replace the clone `window.prompt` with an inline name field/modal (no native prompt).
- Keep apply→org-wide persist via the shipped Phase-A authority; keep DTCG export.
TEST: editor opens with full groups; save round-trips (re-list shows change); apply →
reload shows org effect; Validate + Impact return results; clone via inline field (no
prompt); SSOT (density/radius/control/brand only here); restore org theme after tests.
Branch `codex/fix-c-presets-<date>` → gate → deploy → verify. Phrase FIX_C_PASS_*.
