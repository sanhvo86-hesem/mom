# Module Studio vNext — Objective Feature Evaluation + Deep Upgrade Plan
**Date:** 2026-06-02 · Author: integration/verify session. Grounded in (a) live
button-level audit on the deployed build, (b) world research (DTCG 2025.10, three-tier
tokens, atomic design, Storybook/Backstage component lifecycle, design-system governance).

## 0. Method
Drove every surface in Chrome (real data-ms/data-lw handlers), read console + network,
inspected source on origin/main. Verdicts are objective: PASS / PARTIAL / GAP, with the
world-standard each is measured against.

## 1. Objective maturity scorecard (current deployed build, v0.7.1)
| Surface | State | Verdict | World-standard gap |
|---|---|---|---|
| Shell / 6-tab IA | clean (F1 fixed: no stale Mô phỏng/dup modes) | **PASS** | — |
| Modules (P1) | rich create modal, 2-edit split, archive fix, backend round-trip | **PASS** | wizard is 1-step modal (vs staged); version-history compare metadata vs content separately |
| Presets (P2) | rich editor 9 groups/21 inputs, DTCG export, typography/motion | **PARTIAL** | 9/16 groups; missing lineage(base_ref)/modes(light/dark/HC/print)/per-row Validate+Impact; clone uses window.prompt |
| Settings (P2) | mode/typo/motion/density policy | **PASS-ish** | confirm all write to backend authority (not just preview) |
| Lego (P3) | L0A/L0B/L2/L3/L4/L5 levels, Browse/Assemble/Author/Validate, rich Author contract editor (slots/variant_axes/a11y JSON), deprecate via status | **PARTIAL** | **no explicit ADD (create new block/archetype from blank) or DELETE entry-points** — only edit-selected; interactive preview depth; L2 component-token (T3) edit |
| Governance (P3) | audit + WCAG/contrast evidence + compliance | **GAP** | **missing rollout/publish/stage/canary/rollback lifecycle** (still only in old Giao diện admin); not reusing templates machinery |
| Reference (P3) | Authority Playbook (map/level/decision-log/anti-pattern) | **PASS** | could auto-generate from live registry vs static |
| Source SSOT/hardcode | no authority hex/px; spacing 8/12; tokens 3-tier present | **PASS** | — |
| Backend connectivity | reads (module_schema_list, theme_preset_list) + write round-trip OK | **PASS** | preset apply org-wide persist (re-verify post-changes) |

## 2. World-standard target for the two real GAPS + Lego CRUD (research-backed)
### 2A. Lego must be full CRUD with lifecycle (founder requirement)
World practice (Storybook/Backstage/DS governance): component lifecycle =
**propose(draft) → review → publish → deprecate(sunset+migration) → retire**; never
silent hard-delete; variants need proposals; deprecation carries a migration note.
Target for Lego (per level L2 component / L3 block / L4 archetype):
- **THÊM (Create):** explicit "＋ Block mới / ＋ Archetype mới" button → blank Author form
  with a fresh key (status=draft) → `graphics_block_contract_save` / `graphics_module_archetype_save`.
- **CHỈNH SỬA (Edit):** the existing Author contract editor (already present).
- **XOÁ (Delete = deprecate):** explicit "Deprecate" action (status=deprecated + a
  `deprecation_note` + suggested replacement) — soft, reversible, audited. Hard purge is
  admin-only + guarded. Deprecated items get a badge + drop out of the assemble picker.
- **Clone/duplicate** a block/archetype as a starting point (variant management).
- L0A/L0B token tiers stay read-here / edit-in-Presets+Settings (correct SSOT).

### 2B. Governance must host the rollout lifecycle
World practice: governance = versioned registry + semver + **publish/stage/canary/
apply/rollback** + compliance dashboard + audit + waivers. Target: the Governance tab
REUSES the live `templates`/`advanced` rollout machinery (absorb-by-reuse, like v0.6 did
Module Master) so promote/rollback lives in ONE place; then the old Giao diện admin is
retired. WCAG/contrast evidence already here — good.

### 2C. Presets editor → full 16-group + lifecycle actions
Add lineage(base_ref + "derived from"), supported modes (light/dark/high-contrast/print),
per-row Validate + Impact (which modules consume this preset), replace clone window.prompt
with inline name field. Keep semantic-tier-only editing (Foundation §1).

## 3. Prioritized fix backlog (batched — minimise deploy cycles)
**Batch A — Lego CRUD completeness (P3 file 32b) [HIGH, founder-named]:** add Create
(block/archetype) + Deprecate + Clone entry-points + deprecated badge/filter; verify each
round-trips to backend; test every button in Author/Assemble.
**Batch B — Governance rollout (P3 file 32c-gov) [HIGH]:** reuse templates/advanced
rollout renderers in the Governance tab; de-dup; verify publish/stage/rollback present.
**Batch C — Presets polish (P2 file 32a) [MED]:** lineage + modes + per-row Validate/
Impact + kill clone prompt.
**Batch D — cross-cut [LOW]:** file-naming cleanup (retire vestigial 32a-mstudio-lego/
32c-mstudio-modules if dead), settings backend-write confirm, retire old Giao diện admin
once Governance hosts rollout.
Each batch = one PR + one deploy + full Chrome button test (no per-bug deploys).

## 4. Definition of Done (every batch)
Foundation §8 + GPT-Pro stop rules: every button clicked + responds; backend round-trip
on every mutation; zero console errors; no hardcode authority; SSOT (one write path per
concept/tier); soft-delete + audit, no silent hard-delete; deprecation carries migration
note; restore org theme after destructive tests; exec report per batch.
