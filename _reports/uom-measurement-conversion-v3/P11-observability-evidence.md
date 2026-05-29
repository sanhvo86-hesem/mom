# P11 — Observability Evidence

**Prompt:** HESEM UoM V3 — P11  
**Generated:** 2026-05-29

V3 observability primitives the consuming SRE layer can rely on:

| Signal | Source |
|---|---|
| Conversion class (linear/affine/contextual) | `MeasurementValueFactory.build` writes `evidence.category` into MEASVAL |
| Rule id / version | MEASVAL `evidence.rule_code` + `evidence.rule_version` |
| Context-requirement failure | RFC 9457 ProblemDetails `UOM_CONTEXT_REQUIRED` (P05) |
| Alias quarantine | `uom_alias_quarantine.review_status = 'PENDING'` |
| Evidence verify failure | `MeasurementEvidenceVerifier::verify($e)['ok'] = false` |
| Workflow transition attempt | `uom_rule_approval` row + V3 P01 audit_events
  `uom.v3.p01.seed_first_user_neutralised` |
| Cache invalidation | `UomWorkflowService::invalidateRuleCache` Redis del + (P12-future) event |
| OT unknown UnitId | `OpcUaUnitId::UNKNOWN` (`-1`) sentinel surfaced to consumer |
| AI advisory submission / human decision | `uom_ai_advisory_log` rows |

All signals are emitted by services already on PR #74 + V3 deliverables;
nothing new is required at the observability layer beyond plumbing them
into the SRE telemetry stack (out of V3 scope).

## Decision token

```text
UOM_V3_P11_PASS_SECURITY_AI_OT_OBSERVABILITY
```
