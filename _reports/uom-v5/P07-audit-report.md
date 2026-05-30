# P07 Audit Report

Prompt: P07
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P07 commit: 46fe9e0002285b346c8d10ac36616572bd7db369
Decision token: UOM_V5_P07_SEMANTIC_COMPATIBILITY_LOCKED

## Static Audit

- REPO_EVIDENCE: `QuantityKindService::assertCompatible()` returns immediately only for identical `quantity_kind_code`.
- REPO_EVIDENCE: Cross-kind conversion queries `uom_quantity_kind_compatibility` and requires `approval_status = 'active'`, effective date validity, `allowed = true`, and an empty condition schema.
- REPO_EVIDENCE: Explicit DENY rows return `UOM_KIND_MISMATCH` with from kind, to kind, reason, remediation path, and trace id.
- REPO_EVIDENCE: Conditional compatibility is rejected until a governed handler exists.
- REPO_EVIDENCE: Conversion engine forwards trace id and effective date to compatibility checks before rule resolution.

## Registry Audit

- REPO_EVIDENCE: `uom_quantity_kind` now records semantic parent, measurement family, active-unit projection, risk, and lifecycle.
- REPO_EVIDENCE: `uom_quantity_kind_compatibility` records owner, approval status, risk, condition schema, and effective window.
- REPO_EVIDENCE: Deny rows cover existing Energy/Torque, absolute/delta temperature, HESEM dimensionless subtype traps, and pH/Molarity.
- CONTROLLED_GAP: Work/Moment/Stress pairs cannot be seeded because those kind codes are not present in the current registry.

## Bypass Audit

- No P07 path creates or approves conversion authority for a cross-kind pair.
- Same dimension text is not used as an allow condition in service code.
- Direct conversion rules still cannot run when `assertCompatible()` rejects before rule resolution.

## Hard Gate Result

P07 hard gates pass with warnings. The only full-suite failure is unrelated KPI registry count drift.
