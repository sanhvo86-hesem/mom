# MDA Workflow Status Authority

## Principle

One machine-readable status authority generates DB constraints, PHP enums, OpenAPI enums, workflow engine transitions, frontend selectors, and simulation fixtures.

## Canonical roots and flows

- `Party`: `draft -> active -> suspended -> archived`
- `ItemRevision`: `draft -> in_review -> released -> superseded -> archived`
- `EngineeringReleasePackage`: `draft -> review -> approved -> released -> superseded`
- `EquipmentAsset`: `draft -> qualified -> active -> restricted -> inactive -> retired`
- `ToolingAsset`: `draft -> qualified -> active -> hold -> retired`
- `QualityHold`: `draft -> active -> released -> voided`
- `NCR`: `draft -> submitted -> containment_active -> under_review -> disposition_set -> close_requested -> closed`
- `CAPA`: `draft -> initiated -> root_cause -> implementation -> effectiveness_review -> closed`
- `WorkOrder`: `scheduled -> setup -> running -> inspection -> completed -> closed`

## Generation contract

For every root define:

- status set
- terminal states
- allowed transitions
- transition command
- role guard
- evidence requirement
- e-sign requirement
- telemetry event name

## Hard rules

1. UI may not present a status option that does not exist in the generated registry.
2. Direct field patch of status columns is forbidden for governed roots.
3. Derived states like `overdue`, `stale`, or `projection_warning` stay in telemetry/SLA layers, not lifecycle truth.
4. Released objects are immutable and can only move to `superseded` or `archived` through governed revision/change control.
