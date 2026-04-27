# V22 Phase 3 Slice 5 CDOC Scope

Date: 2026-04-25

## Objective

Plan a governed document record shell for controlled documents as a read-only development/prototype view.

## In Scope

- CDOC route contract for controlled document record shell.
- Fixture-backed document metadata, revision, status, owner, effective date, related DCR, training impact, and audit summary.
- Degraded, conflict, partial-access, and missing-document states.
- Disabled mutation controls for revise, obsolete, approve, publish, acknowledge, train, and e-sign actions.
- E2E, axe, and visual coverage plan.

## Out Of Scope

- DCC write workflow.
- Document approval, publication, obsolescence, revision mutation, acknowledgement mutation, e-signature execution, or training assignment mutation.
- Default live API behavior.
- Promotion of fixtures to `mom/qms-data`.

## Source-Of-Truth Boundary

DCC service/database paths remain the authority for controlled document records and workflow actions. The CDOC shell may display a read model only.

## Planning Deliverables

```text
CDOC route contract
CDOC fixture schema
CDOC no-mutation control map
CDOC fallback/degraded-state contract
CDOC E2E/axe/visual test plan
CDOC rollback plan
```

## Implementation Gate

Do not implement until exact files, route identifiers, fixture records, and forbidden paths are approved.
