# URS-UOM-V5

Package posture: validation-ready package candidate.

## Intended Use

The UoM V5 capability supports governed unit catalog lookup, conversion preview, contextual conversion evidence, alias quarantine, MEASVAL evidence, and replayable measurement history for ERP, MOM, MES, and eQMS workflows.

## Regulated Scope

- Electronic records: UoM rules, approvals, standard-library manifests, alias quarantine records, MEASVAL evidence envelopes, measurement-thread links, audit events.
- Electronic signatures: UoM rule approval and standard-library manifest approval where signature meaning, signer identity, timestamp, and audit hash are required.
- Reports and copies: inspection/batch-release evidence must show original value, canonical value, display value, rule version, effective date, and audit hash.

## Non-Regulated Scope

- Fixture-only UI previews.
- Analytics/advisory projections that do not write execution truth.
- Draft backlog reports and validation planning artifacts.

## User Roles

- Operator: enters measurements through governed UI/API.
- Quality/metrology: reviews alias quarantine and inspection evidence.
- Planner/MES owner: uses item policy and recipe units.
- Approver: approves UoM rules or manifests with required permission and signature meaning.
- Auditor: reads evidence, audit trail, traceability, and copies for inspection.

## User Requirements

| ID | Requirement |
|---|---|
| URS-01 | The system shall reject naked measurements without canonical unit and quantity kind. |
| URS-02 | The system shall preserve original, canonical, and display measurement values. |
| URS-03 | The system shall prevent factor-only misuse for affine/contextual units. |
| URS-04 | The system shall quarantine ambiguous or unknown external unit aliases. |
| URS-05 | The system shall require human permission and signature meaning for regulated approvals. |
| URS-06 | The system shall produce replayable audit evidence with trace id and hash. |
| URS-07 | The system shall keep AI advisory output from approving, dispatching, or overriding measurement authority. |
| URS-08 | The system shall provide inspection-ready copies with original and normalized values. |
