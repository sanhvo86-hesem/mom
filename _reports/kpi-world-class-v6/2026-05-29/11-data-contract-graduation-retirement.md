# Prompt 11 - Data Contract Graduation and Retirement

## Scope

- Prompt: `11_DATA_CONTRACT_GRADUATION_RETIREMENT.md`
- Worktree: `/tmp/mom-kpi-v6-audit`
- Audit stance: no metric may claim runtime truth if the registry contract still relies on inference.

## Findings Before Fix

### P0-1 - Runtime metrics were still under-declared at the canonical row level

The platform already had working runtime calculators, but many first-canonical registry rows still omitted:

- `backend_status = runtime_calculated`
- `primary_endpoint = GET /api/kpi/<CODE>`

This is not just cosmetic drift. It weakens Prompt 11’s truth model because support/catalog layers must infer runtime status instead of reading an explicit declared contract from the source row.

Impacted examples included:

- `OTD`
- `COMPLAINT_RATE`
- `PLAN_ADHERENCE`
- `FAI_FIRST_PASS`
- `MATERIAL_AVAILABILITY_PLAN`
- `IN_PROCESS_REJECT_RATE`
- `OEE`

### P1-1 - Staged metrics still lack per-metric graduation due dates

Prompt 11 asks staged metrics to declare owner and due date. Current registry already enforces owner, gap, and graduation condition well, but the staged layer still does not carry a per-metric `target_graduation_due_date`. I did not fake this by mass-inventing dates; it remains open governance debt for a later tranche.

## Remediation

### 1. Backfilled runtime contract fields in registry

Bulk-updated [kpi-authority-registry.json](/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json) so runtime-calculated canonical rows now explicitly declare:

- `backend_status = runtime_calculated`
- `primary_endpoint = GET /api/kpi/<CODE>`

This removed reliance on catalog-side inference for core runtime metrics.

### 2. Added release guard for runtime declaration integrity

Updated [check_kpi_integrity.php](/tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php) so any metric with `calculation_status=runtime_calculated` must now also declare:

- `backend_status=runtime_calculated`
- `primary_endpoint=GET /api/kpi/<CODE>`

This closes the loophole where a metric could be runtime in code but under-specified in source governance.

### 3. Added admin-service validation

Updated [KpiRegistryAdminService.php](/tmp/mom-kpi-v6-audit/mom/api/services/KpiRegistryAdminService.php) so the registry editor/validator now rejects runtime rows that omit:

- `backend_status`
- `primary_endpoint`

That makes the rule enforceable at write time, not only in CI.

## Senior-Engineer Reaudit

### What failed during first attempt

My first bulk JSON update used a `foreach` pattern that iterated over a copied array expression instead of the original registry section. The file did not actually change, while the new guard immediately exposed the mistake with `30` P0 findings.

That failure was valuable because it proved the re-audit loop worked:

1. tighten guard
2. let it fail hard
3. trace the real mutation path
4. fix source truth
5. rerun

### What was corrected

I rewrote the registry backfill using direct section references, rechecked runtime rows on the JSON itself, and reran guard + PHPUnit until the mismatch disappeared.

## Validation

- `php /tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `cd /tmp/mom-kpi-v6-audit/mom && vendor/bin/phpunit tests/Unit/Services/KpiRegistryAdminServiceMetricControlTest.php tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`

Both passed.

## Verdict

- `P0`: 0 in Prompt 11 implementation scope
- `P1`: staged metrics still lack governed per-metric graduation due dates
- `P2`: retirement/merge rationales can be made more explicit in a later tranche
- `STOP_NEXT_PROMPT`: false

## Next Step

Proceed to Prompt 12: BSC/Hoshin/JD scorecards controllability, fixed-count anti-patterns, and fairness across roles.
