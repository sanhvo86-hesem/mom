# DS-UOM-V5

Package posture: validation-ready package candidate.

## Architecture

- API controller: `mom/api/controllers/UomController.php`.
- Routes: `mom/api/routes/uom-routes.php`.
- Engine/services: `mom/api/services/Uom/*`.
- UI projections: `mom/scripts/portal/80-uom-control-center.js`, `mom/scripts/portal/81-uom-quantity-widget.js`.
- Registries: `mom/data/registry/uom-*.json`.
- Evidence: `_reports/uom-v5/*`.

## Data Model

- Unit catalog: `uom_unit_catalog`.
- Quantity kind: `uom_quantity_kind`.
- Conversion rules: `uom_conversion_rule`.
- Alias and quarantine: `uom_alias`, `uom_external_code_map`, `uom_alias_quarantine`.
- Item policy: `item_uom_policy`, `item_packaging_policy`.
- Evidence thread: `uom_measurement_thread` and MEASVAL envelope.

## Workflow

1. Resolve or quarantine alias.
2. Validate magnitude/unit/kind/context.
3. Resolve rule with lifecycle/effective date/context.
4. Convert through exact/affine/contextual handler.
5. Build MEASVAL evidence with audit hash.
6. Record or expose evidence through governed domain root.

## API/UI

- `/api/v1/uom/convert` is preview contract.
- UI is fixture-default projection and requires explicit live API opt-in.
- Approval is not exposed through the preview UI.

## E-Sign And Audit

- `UomWorkflowService` records rule approvals with manifest hash and signature meaning.
- `UomStandardLibraryManifestService` blocks AI/service/system approvers and requires permission.
- Audit evidence includes before/after, actor, permission, trace id, and hash where applicable.
