# P01 Defect And Repair Log

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 38fd09e9700c48950b4a9d95af1f6f56a5286020

| ID | Severity | Evidence tag | Defect or gap | Repair applied | Residual owner |
|---|---|---|---|---|---|
| P01-D01 | Warning | CONTROLLED_GAP_STANDARD_RECHECK_REQUIRED | UCUM official source was outside repo allowed domains. | Tagged as controlled gap; matrix still blocks factor-only special/log/arbitrary conversions. | P05/P06 |
| P01-D02 | Warning | CONTROLLED_GAP_STANDARD_RECHECK_REQUIRED | QUDT official source was outside repo allowed domains. | Tagged as controlled gap; matrix still requires compatibility default-deny. | P07 |
| P01-D03 | Warning | CONTROLLED_GAP_STANDARD_RECHECK_REQUIRED | UNECE/FHIR/RFC/FDA/EU/GAMP/OWASP/WCAG/OpenTelemetry official domains were outside allowlist. | Tagged; no unsupported claim made. | P06/P10/P13/P14/P15 |
| P01-D04 | Low | GLOBAL_STANDARD | Vendor pages are broad marketing/help pages, not implementation proof. | Limited extraction to patterns only. | P12/P16 |

No P01 hard blocker remains.
