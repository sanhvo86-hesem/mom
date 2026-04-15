# Tranche 18 Pass 1 - Agent 4 Architecture / Data / Authority Audit

Date: 2026-04-15

Scope: canonical model, authority, digital thread, planning-to-execution, traceability, trusted records, and multisite readiness.

## Verified Strengths

- Traceability/genealogy is partition-gated and rejects user-provided scope fields in controller paths.
- Genealogy graph writes persist org company/legal entity/site/plant scope and fail closed on missing partition scope.
- `RuntimeAuthorityService` distinguishes planning, trusted release, traceability, and connected governance slices.

## FIX_NOW Findings

| Finding | Evidence | Required action |
| --- | --- | --- |
| Planning authority weaker than traceability authority | `PlanningScenarioController::calculate()` passed raw request body into `PlanningScenarioService::calculateScenario()`; downstream reads/approval keyed mostly on org only | Derive scope from session, reject user-supplied scope, require site/plant partition, add regression tests |
| Trusted release record scope only plant-enforced in controller | `TrustedReleaseRecordController::verifyPacketScope()` checked plant but not site; criteria injection only added plant | Propagate and validate site plus plant scope, reject cross-site packets, add regression tests |

## High-Leverage Architecture Gap

The highest leverage gap is shared partition authority for planning and release paths. Traceability already had the stricter model; planning and release needed equivalent session-derived site/plant scope.

## Test Gap

Before this run, traceability scope tests existed, but direct planning calculate and trusted release cross-site regressions were missing.
