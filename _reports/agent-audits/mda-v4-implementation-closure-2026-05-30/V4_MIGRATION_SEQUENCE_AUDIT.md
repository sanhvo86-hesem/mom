# V4 Migration Sequence Audit

Prompt: P42
Generated: 2026-05-30
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`

## Current Main Baseline

- Current HEAD: `2d25f7375aa2ffe43c496596a0ef4f0b47fe4925`
- SQL migration files counted by `glob("mom/database/migrations/*.sql")`: `238`
- Latest visible migration prefixes on current branch:
  - `213_graphics_orders_v3_tokens.sql`
  - `214_uom_quantity_kind.sql`
  - `215_uom_unit_catalog.sql`
  - `216_uom_rounding_policy.sql`
  - `217_uom_conversion_rule.sql`
  - `218_uom_external_code_map.sql`
  - `219_uom_alias.sql`
  - `220_item_uom_policy.sql`
  - `221_item_packaging_policy.sql`
  - `222_material_density_registry.sql`
  - `223_graphics_single_control_height.sql`
  - `224_uom_seeds.sql`
  - `225_uom_rule_approval.sql`
  - `226_uom_indexes.sql`
  - `227_graphics_master_density.sql`
  - `228_uom_measval_integration.sql`
  - `229_graphics_revert_scrollbar_amber.sql`
  - `230_graphics_compact_control.sql`
  - `231_uom_v3_lifecycle_governance.sql`
  - `255_graphics_module_master_component_tokens.sql`
  - `256_rename_complaint_rate_to_customer_escape_dpmo.sql`
  - `261_graphics_block_contract_l3.sql`
  - `262_graphics_module_archetype_l4.sql`

## Validator Result

Command:

```text
php mom/tools/release/check_migration_drift.php
```

Result:

```text
[P2] prefix_collision: NNN=108 used by 2 files: 108_mobile_inspection_execution_bridge.sql, 108_world_class_control_plane_execution.sql
[P2] prefix_collision: NNN=115 used by 2 files: 115_missing_fk_indexes.sql, 115_order_workflow_status_authority.sql
[P2] prefix_collision: NNN=188 used by 2 files: 188_enforce_single_primary_position_assignment.sql, 188_error_code_registry.sql
migration drift: 0 P1 + 3 P2 (no fatal issues; pass --strict to fail on P1)
```

## Audit Findings

| finding_id | severity | evidence | interpretation | required action |
|---|---|---|---|---|
| MIG-P42-001 | P1 | Current main has UOM migrations 214-231 | UOM schema is present on branch, regardless of PR #74 merge status | Do not re-add or renumber UOM migrations in V4 |
| MIG-P42-002 | P1 | Current main has 255 and 256 after 231, then 261 and 262 | There are intentional or accidental numbering gaps 232-254 and 257-260 | P43 must not assume missing numbers are available without all-branch audit |
| MIG-P42-003 | P2 | Duplicate historical prefixes 108, 115, 188 | Existing migration checker classifies as non-fatal P2 | Avoid adding new duplicate prefixes |
| MIG-P42-004 | P0 if ignored | PR #76 is closed unmerged and NO_GO | V3 migration/code changes are not baseline truth on this branch | Re-audit file list before any cherry-pick |
| MIG-P42-005 | P1 | `mom/vendor` absent | Fresh migration chain cannot be re-run through full test stack in this worktree | Restore dependencies before final runtime closure |

## Integration Rule For V4

Do not create a new migration until the prompt that owns the runtime change
declares the exact table set, checks `git log --all --oneline -- mom/database/migrations`,
and reserves the next safe number. Based on current main, a new migration must
not reuse `214` through `231`, `255`, `256`, `261`, or `262`.

## P42 Verdict

Migration state is acceptable for report-only P42 continuation because there is
no current P1 fatal drift and no migration is edited. It is not acceptable as
runtime closure proof.
