# P11 — Security Threat Model

**Prompt:** HESEM UoM V3 — P11  
**Generated:** 2026-05-29

## Standards lens

- OWASP API Security Top 10 (2023): API1 Broken Object Level
  Authorization (BOLA), API3 Broken Object Property Level
  Authorization (BOPLA / mass assignment), API4 Unrestricted
  Resource Consumption, API8 Security Misconfiguration, API9
  Improper Inventory Management, API10 Unsafe Consumption of APIs.
- OWASP ASVS 5.0.0 — V12 (API), V13 (Configuration),
  V14 (Authentication).
- ISA/IEC 62443 — OT segregation, quarantine-first.
- NIST AI RMF — AI advisory boundary, trustworthiness lifecycle.

## Threats and V3 controls

| Threat | OWASP | Control | Evidence |
|---|---|---|---|
| BOLA — call /api/v1/uom/item-policy/{id} for unauthorised item | API1 | Object-level check at controller layer; ITEM domain authority | existing `UomController` + auth pipeline (CORS → ApiKey → Auth → RateLimit → Audit) |
| BOPLA — POST a conversion rule with `approved_by` to bypass workflow | API3 | Server-side allowlist; CHECK `uom_cr_approved_requires_owner` (migration 231 / V3 P01); UomWorkflowService.activateRule is private | P01 deliverables |
| AI advisory mutates authority | API3 + NIST AI RMF | `UomAiAdvisoryGuard::assertNotAi($actorKind, $operation)`; FORBIDDEN_OPERATIONS_FOR_AI catalogue | `UomAiAdvisoryGuard` + 5 contract tests |
| OT untrusted code accepted as authority | ISA/IEC 62443 | `OpcUaUnitId::packCommonCode` returns -1 for non-grammar; consumer routes to alias-quarantine | `OpcUaUnitIdTest` (P04) |
| Unrestricted magnitude consumption (1e100000) | API4 | `DecimalString::parse` overflow guard | `DecimalStringTest` (P02) |
| Misconfigured OpenAPI / route drift | API8/API9 | `UomOpenApiContractTest` drift test | P06 deliverable |
| Tampered MEASVAL evidence | API3 + Part 11 | full-payload canonical-JSON SHA-256 hash; `MeasurementEvidenceVerifier` | `MeasurementEvidenceVerifierTest` (P03) |
| Negative tests allowed to silently fail | API8 | `mom/tools/release/check_uom_safety_gate.php` | P07 deliverable |

## Decision token

```text
UOM_V3_P11_PASS_SECURITY_AI_OT_OBSERVABILITY
```
