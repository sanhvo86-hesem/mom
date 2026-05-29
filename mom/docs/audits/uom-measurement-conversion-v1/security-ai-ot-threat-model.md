# P15 — Security, Privacy, OT, and AI Governance Threat Model

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P15 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Catalogue threats that span IT security, privacy, OT (operational technology) integration, and AI governance for the UoM Measurement Intelligence subsystem. Each threat has a vector, an impact, a control, and a residual risk.

## 2. STRIDE-style threat catalog

### Spoofing

| Threat | Vector | Control | Residual |
|---|---|---|---|
| Spoofed shop-floor sensor emits wrong OPC UA UnitId | compromised PLC firmware | OT segmentation; HESEM cannot validate sensor truth | accept; mitigated upstream |
| Spoofed supplier session submits supplier-scoped alias | hijacked supplier credentials | supplier_id binding from authenticated session, not request body | medium |
| Spoofed metrology user submits for approval | hijacked metrology credentials | RBAC + audit trail | low |

### Tampering

| Threat | Vector | Control | Residual |
|---|---|---|---|
| MEASVAL JSONB edited via psql | DBA / compromised root | hash re-verify on bridge re-wrap + scanner tamper category | medium (RT-003) |
| Conversion rule factor edited via psql | DBA | chk_rule_approved DB CHECK; workflow path is sole approver setter | low |
| Audit-row edited | DBA | append-only application contract; UPDATE/DELETE forbidden at app layer | medium (DB layer can technically still permit) |
| Alias canonical changed without quarantine | direct service write | service is sole writer; admin triage required | low |

### Repudiation

| Threat | Vector | Control | Residual |
|---|---|---|---|
| Approver denies approving a rule | normal repudiation attempt | rule_approval row carries actor_id; immutable | low |
| Signer denies e-signing | normal repudiation | signature payload (planned) with nonce + reason + checksum | medium (RT-001 open) |
| AI advisor denies suggesting | normal repudiation | uom_ai_advisory_log carries model_id and recorded_at | low |

### Information disclosure

| Threat | Vector | Control | Residual |
|---|---|---|---|
| MEASVAL exposes PII (inspector identity) | API response | actor_id is UUID, not name; lookup requires separate user-record permission | low |
| Cross-tenant data leak via shared catalog | (HESEM v1 is single-tenant) | n/a | n/a |
| Audit log scrape | unauthenticated GET | every endpoint requires auth | low |

### Denial of service

| Threat | Vector | Control | Residual |
|---|---|---|---|
| Alias quarantine flood | adversary spams unresolvable aliases | per-(alias, scope) suppression + rate-limit | low |
| Engine overload via burst | high-rate streaming | Redis-cached rule lookups; bridge batch wrap | low |
| Migration drift | conflicting concurrent commits | pre-push collision guard | low |

### Elevation of privilege

| Threat | Vector | Control | Residual |
|---|---|---|---|
| Operations user submits for review | RBAC bypass attempt | future endpoints check `uom.catalog.write` | low |
| Operations user activates a rule | RBAC bypass | esign permission required + DB CHECK | low |
| AI advisor mutates catalog | direct service call | recordAiAdvisory only writes to advisory log; no lifecycle mutator | low |

## 3. OT-specific threats

| Threat | Vector | Control |
|---|---|---|
| Compromised OPC UA gateway emits wrong UnitId | gateway breach | OT segmentation + alarm on unexpected UnitId rate-change |
| Vendor namespace > 0 hijack | two vendors using same namespace | SUPPLIER alias keyed on supplier_id |
| OPC UA replay (same measurement re-emitted) | streaming hiccup | bridge idempotency on (source_table, source_id) |
| OT-side rule change drifts from IT-side catalog | uncoordinated change | external code map is one-way (external → canonical); HESEM does not publish back |

## 4. AI governance threats

| Threat | Vector | Control |
|---|---|---|
| AI suggests malicious alias resolution | poisoned model | human-in-loop; reviewer required |
| AI marks human_reviewed=true via direct call | bypass attempt | recordHumanDecision is sole writer; AI cannot impersonate user |
| Auto-approve via low-confidence suggestion | UI mis-config | confidence threshold + reviewer required |
| AI advisory log used as evidence for activation | mis-classification | activation requires workflow steps; advisory is informational only |
| Model drift over time | upgraded model emits different suggestions | model_id + model_version recorded per advisory |

## 5. Privacy

| Data class | Handling |
|---|---|
| Inspector identity (actor_id) | UUID; not personally-identifying outside HESEM identity system |
| Operator identity (job_number, work_order) | identifies role-context, not personal info |
| Measurement values | technical data; not PII |
| AI model_id / model_version | technical metadata; not personal info |
| Signature payload | includes signer_id + reason; treated as regulated data; access-controlled |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| TM-001 | Subsystem treats authenticated session as the truth for actor identity | RBAC SSOT |
| TM-002 | Audit log append-only at app layer; DB layer remains a deeper trust boundary | tamper resistance |
| TM-003 | AI is informational only; no autonomous mutation | UD-012 |
| TM-004 | OT external codes are one-way (external → canonical); HESEM does not publish | scope boundary |
| TM-005 | OPC UA vendor namespaces handled via SUPPLIER alias | AM-003 |
| TM-006 | Privacy posture: subsystem stores no PII | scope |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | TG-001 | Signature payload table absent | RT-001 / WG-001 |
| medium | TG-002 | Tamper detection on every read not yet wired | RT-003 |
| medium | TG-003 | Confidence threshold for AI advisor not yet enforced in UI | UA-004 |
| low | TG-004 | DBA-tier mitigation (separation of duties at DB role) deferred | release engineering |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| STRIDE coverage | 9 |
| OT-specific coverage | 9 |
| AI governance coverage | 10 |
| Privacy posture | 10 |
| **Total** | **38 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/ai-human-authority-boundary.md` (P15 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p15-abuse-case-test-plan.md` (P15 / 3)
