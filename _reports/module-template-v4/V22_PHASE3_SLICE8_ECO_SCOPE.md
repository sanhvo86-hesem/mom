# V22 Phase 3 Slice 8 ECO Scope

Date: 2026-04-25

## Objective

Plan a read-only engineering change record shell for ECR/ECO traceability and digital-thread adjacency.

## In Scope

- ECR/ECO route contract.
- Affected item, revision, route, setup sheet, CNC program, inspection plan, controlled document, supplier/customer impact, and approval-state display.
- Fixture-backed conflict, partial-access, stale, and degraded states.
- Disabled mutation controls for approve, reject, release revision, update route, release CNC program, publish document, and e-sign actions.
- E2E, axe, and visual coverage plan.

## Out Of Scope

- Change approval.
- Item revision release.
- Routing mutation.
- CNC program release.
- Controlled document publication.
- Backend write APIs.

## Source-Of-Truth Boundary

Engineering change workflow and affected-object release paths remain governed authorities. The ECO shell may show traceability only.

## Planning Deliverables

```text
ECO route contract
affected-object fixture schema
digital-thread reference policy
disabled mutation map
conflict/degraded-state contract
E2E/axe/visual test plan
rollback plan
```
