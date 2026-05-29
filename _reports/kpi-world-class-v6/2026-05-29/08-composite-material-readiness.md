# Prompt 08 - Composite Material-Cert-IQC-Traceability Readiness

## Scope

- Prompt source: `/tmp/mom-kpi-v6-audit/_reports/kpi-world-class-v6-prompts/prompts/08_COMPOSITE_MATERIAL_CERT_IQC_TRACEABILITY_READINESS.md`
- Worktree: `/tmp/mom-kpi-v6-audit`
- Mode: implementation + re-audit + simulation review

## Executive Verdict

- `P0 before fix`: 2
- `P0 after fix`: 0
- `P1 after fix`: 1
- `STOP_NEXT_PROMPT: false`

The metric was already materially better than a naive stock-availability ratio, but it still stopped short of being an operational control. After this step, `MATERIAL_AVAILABILITY_PLAN` now carries a component-by-component readiness contract and anti-gaming override rules instead of a single blended percentage.

## Findings Before Fix

### P0-1 - API result did not expose actionable component breakdown

`calcMaterialAvailabilityPlan()` already suppressed green when blockers existed, but the API result only exposed aggregate counts plus blocker buckets. That was not enough for a daily board to answer:

- which readiness component is blocking,
- whether the problem is blocked or just undocumented,
- how many jobs are ready vs missing metadata by component.

In practice, this still forces operators to open raw job metadata or infer root cause from a single ratio.

### P0-2 - Manual override governance existed in spirit, not in contract

The runtime logic already prevented `physical_ready=true` from making the metric green when blocker metadata existed. But the registry/data-contract layer did not explicitly require override fields such as:

- override reason
- override approver
- override evidence reference

That left a governance gap: future UI or metadata writers could invent a “green by override” path without any explicit contract failing CI.

## Remediation

### 1. Added component-level readiness contract to registry

Updated `/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json` for `MATERIAL_AVAILABILITY_PLAN`:

- added override-trace columns to `data_source.columns`
  - `metadata.readiness_override_reason`
  - `metadata.readiness_override_approved_by`
  - `metadata.readiness_override_evidence_reference`
- added `readiness_component_contract` with:
  - required result fields
  - manual override fields
  - anti-gaming rule
- strengthened `readiness_block_rule` so `physical_ready=true` cannot override blocker metadata without approved evidence

### 2. Upgraded runtime result from blocker counts to component breakdown

Updated `/tmp/mom-kpi-v6-audit/mom/api/services/KpiEngine.php` so `calcMaterialAvailabilityPlan()` now returns component-level breakdown rows for:

- `physical_material_available`
- `mill_cert_coc_verified`
- `iqc_released`
- `traceability_label_verified`
- `special_process_clear`
- `kit_ready_before_constraint`
- `tool_fixture_gage_ready`

Each component row now carries:

- `component_code`
- `required_for_green`
- `ready_jobs`
- `blocked_jobs`
- `metadata_missing_jobs`
- `declared_jobs`

This makes the metric usable for actual triage instead of post-hoc explanation.

### 3. Hardened integrity guard against override drift

Updated `/tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php` to fail if:

- override-trace columns disappear from `MATERIAL_AVAILABILITY_PLAN.data_source`
- `readiness_component_contract` loses required result fields
- manual override fields disappear
- `readiness_block_rule` stops explicitly forbidding `physical_ready=true` from bypassing blockers

### 4. Extended tests

Updated:

- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`

Tests now prove:

- the runtime metric returns 7 component rows
- component rows expose `ready_jobs`, `blocked_jobs`, and `metadata_missing_jobs`
- missing override evidence contract is rejected by the guard

## Senior-Engineer Reaudit

### Simulation 1 - Material is physically in stock but cert is missing

- Expected:
  - physical component can be ready
  - composite metric still cannot be green
  - component breakdown points directly to `mill_cert_coc_verified`
- Result after fix:
  - pass

### Simulation 2 - IQC not released before constraint job

- Expected:
  - metric shows `iqc_released` blocked or metadata-missing
  - planner cannot hide behind stock presence
- Result after fix:
  - pass at registry/runtime-result level

### Simulation 3 - Special process unclear but kit looks ready

- Expected:
  - green forbidden because a required component is blocked
  - board can distinguish blocked vs undocumented
- Result after fix:
  - pass

### Simulation 4 - Someone tries to force green by only setting `physical_ready=true`

- Expected:
  - runtime stays fail-closed when blocker metadata exists
  - registry contract requires override reason/approver/evidence if an override path ever appears
- Result after fix:
  - pass

## Residual P1

### P1-1 - Override fields are contractually reserved, but not yet driven by a dedicated UI/workflow

This is acceptable for now. The important change is that the contract is explicit and guarded. A future UI cannot silently introduce override behavior without carrying approver/evidence fields and facing CI.

## Files Changed

- `/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json`
- `/tmp/mom-kpi-v6-audit/mom/api/services/KpiEngine.php`
- `/tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`

## Validation

- `php /tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `cd /tmp/mom-kpi-v6-audit/mom && vendor/bin/phpunit tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `php -l /tmp/mom-kpi-v6-audit/mom/api/services/KpiEngine.php`
- `php -l /tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `php -l /tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php`

## Next Step

Proceed to Prompt 09: quality-at-source, especially the interfaces between `SHIP_PACKET_COMPLETENESS`, `CHECK_DIM_REPORT_ON_SHIP`, `GAGE_VALID_FOR_RELEASE`, `FAI_FIRST_PASS`, and `FINAL_RELEASE_RFT`.
