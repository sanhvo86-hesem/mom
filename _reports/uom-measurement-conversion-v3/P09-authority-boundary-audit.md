# P09 — Authority Boundary Audit

**Prompt:** HESEM UoM V3 — P09  
**Generated:** 2026-05-29

## Workspaces are projection-only

| Workspace | Authority surface | Mutation route |
|---|---|---|
| UoM Control Center | `UnitCatalog`, `QuantityKind`, `ConversionRule`, `StandardLibraryManifest` | `UomWorkflowService::submit/approve/esign` chain ONLY |
| ITEM workspace | `ItemUomPolicy` | Existing ITEM workflow (separate service) |
| Quality workspace | inspection / calibration records | Existing quality workflow + `QualityMeasurementBridge` MEASVAL wrap |
| AI advisory | none | `UomWorkflowService::recordAiAdvisory` records suggestions only |

## Anti-pattern guard list

The following patterns are explicitly NOT allowed in V3 and are
checked at the service or DB CHECK level:

- A workspace UI directly writing to `uom_conversion_rule.lifecycle_status`.
  Guard: rule lifecycle transitions only happen through
  `UomWorkflowService::activateRule` (private) + `submitForReview` /
  `approve` / `esign` (public, e-sign-gated).
- A workspace UI directly writing to
  `uom_standard_library_manifest.lifecycle_status`. Guard: same — only
  `UomStandardLibraryManifestService::approveManifest` flips state and
  it requires a real UUID approver.
- AI advisory writing to an authority table. Guard:
  `UomWorkflowService::recordAiAdvisory` writes only to
  `uom_ai_advisory_log`; `recordHumanDecision` requires the human
  reviewer UUID and is one-shot per advisory row.

## Decision token

```text
UOM_V3_P09_PASS_DOMAIN_INTEGRATION_HARDENED
```
