# V22 Phase 3 Slice 6 INSP Scope

Date: 2026-04-25

## Objective

Plan a read-only inspection record shell or inspection lot shell for EQMS/MES inspection traceability.

## In Scope

- Distinguish inspection lot, inspection record, sample, characteristic, measurement, disposition status, and linked NCR/CAPA evidence.
- Fixture-backed display states for normal, partial-access, conflict, stale, and degraded data.
- Read-only SPC or measurement summaries with clear non-disposition posture.
- Disabled mutation controls for record result, disposition, reopen, approve, attach evidence, create NCR, and e-sign actions.
- E2E, axe, and visual coverage plan.

## Out Of Scope

- Measurement entry.
- Inspection disposition.
- NCR/deviation/CAPA creation.
- Lot release.
- Backend write endpoints.
- Default live API behavior.

## Source-Of-Truth Boundary

Inspection execution, disposition, and quality evidence writes remain governed EQMS/MES paths. The shell is a pre-production readiness read model for planning.

## Planning Deliverables

```text
INSP route contract
inspection lot versus record authority split
fixture schema
disabled mutation map
SPC/measurement display policy
E2E/axe/visual test plan
rollback plan
```

## Implementation Gate

Do not implement until the inspection object level is selected: inspection lot shell, inspection record shell, or both in separate slices.
