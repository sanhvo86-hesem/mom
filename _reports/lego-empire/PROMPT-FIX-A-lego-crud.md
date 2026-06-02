# FIX BATCH A — Lego full CRUD + lifecycle (Browse/Assemble/Author/Validate complete)
Owner file: `mom/scripts/portal/32b-mstudio-lego-workbench.js` (+ shell only via registry).
Read FIRST: `_reports/lego-empire/MODULE-STUDIO-VNEXT-EVAL-AND-UPGRADE-2026-06-02.md` §2A,
`MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md` (three-tier tokens, DoD §8).

GOAL: Lego must support full CRUD with lifecycle on L2 components / L3 blocks / L4
archetypes (founder: "các lego phải có chỉnh sửa, thêm, xoá").
- **THÊM (Create):** explicit "＋ Block mới" (L3) + "＋ Archetype mới" (L4) buttons → open
  the Author form BLANK with a fresh key, status=draft → `graphics_block_contract_save` /
  `graphics_module_archetype_save`. New item appears in the level list after save.
- **CHỈNH SỬA (Edit):** keep the existing Author contract editor (slots/variant_axes/
  required_tokens/a11y JSON). Ensure save round-trips + re-list shows the change.
- **XOÁ (Deprecate, soft):** explicit "Deprecate" button → status=deprecated + a
  `deprecation_note` + optional replacement key; audited; deprecated items show a badge and
  are excluded from the Assemble block picker. Reversible (set back to published). Hard
  purge is out of scope (admin-only later).
- **Clone:** duplicate a block/archetype as a draft starting point (variant mgmt).
- L0A/L0B token tiers stay read-only here (edit lives in Presets/Settings — do not add
  token editors here). L2 component contracts (T3) editable via Author if applicable.
TEST (every button, Chrome via code): create block → appears + persisted; edit → round-trip;
deprecate → badge + dropped from picker + audited; clone → new draft; Browse read-only;
Validate runs evidence. Zero console errors. SSOT grep. Restore any test data.
Branch `codex/fix-a-lego-crud-<date>` → gate → deploy → verify live. Phrase FIX_A_PASS_*.
