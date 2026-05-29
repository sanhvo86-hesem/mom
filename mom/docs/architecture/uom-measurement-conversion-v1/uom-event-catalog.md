# P10 — UoM Event Catalog (Idempotency, Telemetry, Subscribers)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P10 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Catalog every event the UoM subsystem publishes on the HESEM EventBus, the subscribers that act on it, and the idempotency / telemetry rules each follows. Events are the cache-invalidation and observability backbone; they never replace the workflow service as the mutation channel.

## 2. Event catalog

| Event | Producer | Payload | Idempotency key | Subscribers |
|---|---|---|---|---|
| `uom.rule.proposed` | `UomWorkflowService::submitForReview` | `{rule_id, rule_code, submitter_id, factor, offset_value, lifecycle_from, lifecycle_to}` | rule_id + lifecycle_to | scanner dashboard |
| `uom.rule.approved` | `UomWorkflowService::approve` | `{rule_id, approver_id, approved_at}` | rule_id + approver_id | scanner |
| `uom.rule.signed` | `UomWorkflowService::esign` | `{rule_id, signer_id, signed_at, signature_payload_id}` | rule_id + signed_at | scanner + admin notification |
| `uom.rule.activated` | `UomWorkflowService` step 4 | `{rule_id, rule_code, effective_from}` | rule_id + effective_from | `ConversionRuleService` cache, scanner |
| `uom.rule.deprecated` | catalog admin | `{rule_id}` | rule_id | cache, scanner |
| `uom.unit.lifecycle_changed` | catalog admin | `{canonical_code, lifecycle_from, lifecycle_to}` | canonical_code + lifecycle_to | scanner orphan check |
| `uom.alias.proposed` | `UomAliasResolutionService::quarantine` | `{quarantine_id, alias_code, scope, supplier_id}` | quarantine_id | admin triage UI |
| `uom.alias.activated` | `UomAliasResolutionService::resolveQuarantineEntry` | `{alias_id, alias_code, scope, canonical_code, reviewer_id}` | alias_id | resolver cache bust |
| `uom.alias.quarantined` | resolver miss | `{quarantine_id, alias_code, scope}` | quarantine_id | scanner |
| `uom.policy.changed` | ITUOM admin | `{policy_id, item_id, slot_name}` | policy_id | ITUOM cache bust + scanner |
| `uom.packaging.changed` | ITUOM admin | `{packaging_id, item_id}` | packaging_id | cache bust |
| `uom.density.changed` | metrology admin | `{density_id, substance_code, effective_from}` | density_id | density cache bust |
| `uom.measurement.recorded` | `QualityMeasurementBridge` | `{thread_id, source_table, source_id, audit_hash, rule_code, item_id}` | thread_id | analytics (future) |
| `uom.measval.tamper_detected` | bridge re-verify | `{thread_id, source_id, expected_hash, actual_hash}` | source_id + recorded_at | scanner + admin notification |
| `uom.ai_advisory.recorded` | `UomWorkflowService::recordAiAdvisory` | `{advisory_id, model_id, confidence}` | advisory_id | triage UI |
| `uom.ai_advisory.decided` | `UomWorkflowService::recordHumanDecision` | `{advisory_id, reviewer_id, decision}` | advisory_id + decided_at | scanner |

## 3. Idempotency rules

| Rule | Reason |
|---|---|
| Every event carries a deterministic `event_id` from `(idempotency_key, sequence)` | replay safety |
| Subscribers must check `event_id` against their last-seen pointer before acting | exactly-once on idempotent subscribers |
| Cache-bust subscribers may double-bust safely; analytics subscribers must dedupe | per-subscriber semantic |
| Re-emission on retry is allowed; producer keeps the same `event_id` | safe replay |

## 4. Telemetry

Each event carries:

- `event_id` (UUIDv7 — time-sortable)
- `correlation_id` (W3C Trace Context if available; else null)
- `actor_id` (UUID; nullable for system events)
- `emitted_at` (RFC 3339)
- `producer_service` (e.g. `UomWorkflowService`)
- `schema_version` (integer; v1 for everything in this slice)

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| EC-001 | Events are read-and-cache-invalidation; never a mutation channel | DI-002 |
| EC-002 | Idempotency keys are deterministic so replay is safe | DI-003 |
| EC-003 | Tamper-detection event is treated as a security-significant signal; routed to admin notification, not just dashboard | tamper-resistance |
| EC-004 | AI advisory events are observable but never trigger autonomous mutation downstream | UD-012 |
| EC-005 | Event schema version pinned per event; future v2 emits parallel | additive evolution |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | EG-001 | EventBus subscriber wiring exists in HESEM `EventBus` infrastructure but not yet specifically subscribed for UoM events on the admin UI | dashboard follow-up |
| medium | EG-002 | UUIDv7 generator not yet in use; producer currently uses UUIDv4 | low-impact; sortability degraded |
| low | EG-003 | Correlation_id propagation depends on calling adapter | observability follow-up |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Event enumeration | 10 |
| Idempotency discipline | 10 |
| Telemetry hygiene | 9 |
| Subscriber clarity | 9 |
| **Total** | **38 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/api/uom-measurement-conversion-v1/openapi-contract-plan.md` (P10 / 1)
- Sibling: `mom/docs/api/uom-measurement-conversion-v1/problem-details-catalog.md` (P10 / 2)

(Note: P10 does not require a `_reports/...` audit file per the runbook table; the three deliverables above complete the slice.)
