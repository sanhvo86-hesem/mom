# OQ-PROTOCOL-UOM-V5

Package posture: validation-ready package candidate.

## Operational Qualification

| ID | Scenario | Expected |
|---|---|---|
| OQ-01 | Submit measurement without unit/kind | Rejected or disabled with programmatic error |
| OQ-02 | Preserve original and normalized value | MEASVAL contains original, canonical, display, and audit hash |
| OQ-03 | Convert degF to Cel | Affine handler returns correct value, no factor-only result |
| OQ-04 | Resolve ambiguous alias `M` | Quarantine result, no auto-map |
| OQ-05 | Unauthorized e-sign | Approval rejected and audit evidence retained |
| OQ-06 | Tamper measurement value | Hash verification fails |
| OQ-07 | AI advisory suggests rule | Advisory remains evidence only |
| OQ-08 | Oversized UCUM expression | Rejected before parsing load |

## Result

See `TEST-REPORT-UOM-V5.md`.
