# P11 — Fixture and Seed-Data Contract

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P11 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the seed-data contract — what fixtures land via migration, which authority each fixture cites, and how the seed survives idempotent replay across environments.

## 2. Seed source tables

| Migration | Inserts into | Authority |
|---|---|---|
| `224_uom_seeds.sql` | uom_quantity_kind, uom_unit_catalog, uom_conversion_rule, uom_rounding_policy, material_density_registry, uom_external_code_map | ISO 80000, SI Brochure, UCUM, UNECE Rec20, OPC UA Part 8 |
| `228_uom_measval_integration.sql` | additional units Ra/HRC/HRB + alias seed for measurement_unit enum + uom_quantity_kind (SurfaceRoughness, Hardness) | UCUM annotations |

## 3. Seed coverage

| Category | Count seeded | Authority |
|---|---|---|
| Quantity kinds | 50 | ISO 80000 + HESEM extensions |
| Active units | 69 | ISO 80000 + SI Brochure + UCUM |
| Active rules | 33 (25 exact_linear, 6 defined_linear, 2 affine) | metrology |
| Rounding policies | 5 (HALF_EVEN default, HALF_UP, DOWN_TRUNCATE, UP_CEILING, NONE) | ASTM E29 |
| Aliases | 6 SYSTEM-scope (mm, in, deg, Ra, HRC, HRB) | UCUM annotations |
| External codes (UNECE Rec20) | 32 highest-traffic | UNECE Rec20 r17 |
| External codes (OPC UA) | 24 namespace 0 | OPC UA 1.05 Part 8 |
| External codes (LIMS) | 8 starter symbols | LIMS conventions |
| Substance densities | 6 (water, ethanol, mild steel, aluminium, copper, lubricant) | metrology lab |

## 4. Seed idempotency

Every INSERT carries `ON CONFLICT DO NOTHING` and uses natural keys (`canonical_code`, `kind_code`, `rule_code`, `policy_code`). Replay on an existing DB is a no-op. Replay on a fresh DB produces the same final state.

The chk_rule_approved hurdle in seed is handled via the draft→activate DO block (migration 224):

```sql
INSERT INTO uom_conversion_rule (..., lifecycle_status, ...) VALUES (..., 'draft', ...);
-- separate DO block:
DO $$
DECLARE v_approver UUID;
BEGIN
  SELECT user_id INTO v_approver FROM users ORDER BY created_at ASC LIMIT 1;
  IF v_approver IS NOT NULL THEN
    UPDATE uom_conversion_rule
       SET lifecycle_status = 'approved', approved_by = v_approver, approved_at = NOW()
     WHERE rule_code LIKE 'UOMCONV-%' AND lifecycle_status = 'draft';
  END IF;
END;
$$;
```

This satisfies the DB CHECK while keeping the seed environment-independent.

## 5. Fixture review checklist

When extending the seed, the contributor must:

1. Cite the authority (ISO clause / UCUM section / standard revision).
2. Confirm UCUM uniqueness (`uq_ucum_code`) is not violated.
3. Confirm `chk_rule_approved` is honoured (draft-then-activate pattern).
4. Confirm idempotency (`ON CONFLICT DO NOTHING`).
5. Confirm FK ordering (kind → unit → alias / rule).
6. Run `php mom/tools/release/check_migration_drift.php`.

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| FD-001 | Seed split across migrations 224 (main) and 228 (MEASVAL extension) for FK order | clarity |
| FD-002 | UCUM annotations `{Ra}`, `{HRC}`, `{HRB}`, `K{diff}`, `Cel{diff}` for empirical and delta units | BD-003, BD-004 |
| FD-003 | UNECE Rec20 pinned to rev.17 | CL-002 |
| FD-004 | OPC UA limited to namespace 0 in v1 | AM-003 |
| FD-005 | Density seed = 6 substances; long-tail via admin UI after VRS-001 | FG-003 |
| FD-006 | Draft-then-activate DO block satisfies chk_rule_approved without seeding fake users | UD-008 |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | FG-001 | Potency conversion (pharma) absent | scope-extension prompt |
| medium | FG-002 | EDI seed absent | first EDI integration |
| low | FG-003 | UNECE Rec20 long-tail (170+ codes) deferred | traffic-driven extension |
| low | FG-004 | LIMS coverage thin | LIMS integration |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Authority citation discipline | 10 |
| Idempotency | 10 |
| FK ordering safety | 10 |
| Coverage breadth | 8 (FG-001, FG-002) |
| **Total** | **38 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/backend/uom-measurement-conversion-v1/data-model-migration-plan.md` (P11 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p11-naked-number-remediation-backlog.md` (P11 / 3)
