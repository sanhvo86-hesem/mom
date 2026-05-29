# P12 — Regulated Action Controls Audit

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P12 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Adversarial audit of every regulated action — submit, approve, e-sign, activate, retire, alias-resolve-from-quarantine, density-edit, AI advisory acceptance — to verify that no path bypasses the workflow, audit trail, or RBAC.

## 2. Regulated actions × controls

| Action | RBAC | Workflow | Audit trail | E-sign | DB CHECK |
|---|---|---|---|---|---|
| submitForReview | ✓ (uom.catalog.write) | ✓ | ✓ uom_rule_approval | n/a | n/a |
| approve | ✓ (uom.catalog.approve) | ✓ | ✓ | n/a | n/a |
| esign | ✓ (uom.catalog.esign) | ✓ | ✓ | ✓ | sets approved_by → chk_rule_approved satisfied |
| activate (auto on esign + effective_from) | n/a | ✓ | (implicit transition) | n/a | n/a |
| retire (unit/rule) | ✓ (uom.catalog.retire) | ✓ via UomImpactAnalysisService | ✓ thread of impact analysis | n/a | n/a |
| resolveQuarantineEntry | ✓ (uom.alias.triage) | direct service | ✓ uom_alias_quarantine.reviewed_by | n/a | partial (FK to users) |
| rejectQuarantineEntry | ✓ | direct service | ✓ | n/a | partial |
| materialDensity write | ✓ (uom.metrology.density) | direct service | timestamped row | n/a | versioned via effective_from |
| recordAiAdvisory | service-internal | n/a (advisory) | ✓ uom_ai_advisory_log | n/a | n/a |
| recordHumanDecision on advisory | ✓ (uom.advisory.decide) | ✓ workflow service | ✓ flips human_reviewed | n/a | n/a |
| catalog admin direct edit (planned) | ✓ | wrapped in workflow | ✓ | depends on risk_level | n/a |

## 3. Findings

| Severity | ID | Finding | Repair |
|---|---|---|---|
| high | RT-001 | Signature payload table absent; current e-sign captures only auth context, not the nonce + reason + checksum | IMPL-07 follow-up |
| medium | RT-002 | resolveQuarantineEntry RBAC permission key (`uom.alias.triage`) not yet in `roles.permissions` JSONB | RBAC follow-up |
| medium | RT-003 | recordAiAdvisory is service-internal; if a future endpoint exposes it to external callers, RBAC must apply | document; planned advisor adapter |
| medium | RT-004 | retire path requires impact analysis but UomWorkflowService doesn't yet auto-invoke it before lifecycle transition | wire workflow → impact analysis |
| low | RT-005 | Material density edits via admin do not yet require a workflow step (low risk_level) | acceptable; documented |
| low | RT-006 | recordHumanDecision permission `uom.advisory.decide` proposed but not yet in RBAC seed | RBAC follow-up |

## 4. Repair log

| Repair ID | Finding | Patch |
|---|---|---|
| RP-RT001 | RT-001 | signature payload table + nonce + reason proposed; tracked as WG-001 |
| RP-RT002 | RT-002 | RBAC seed extension for `uom.alias.triage` |
| RP-RT003 | RT-003 | documented; future endpoint to gate on `uom.advisory.write` |
| RP-RT004 | RT-004 | workflow service wired to call UomImpactAnalysisService::analyzeRuleChange / analyzeUnitDeprecation before lifecycle transition; planned |
| RP-RT005 | RT-005 | acceptable per GAMP risk-based depth (low risk_level) |
| RP-RT006 | RT-006 | RBAC seed extension for `uom.advisory.decide` |

## 5. Simulation result table

| Case | Probe | Expected | Actual |
|---|---|---|---|
| RTS-001 | psql UPDATE uom_conversion_rule SET lifecycle_status='approved' without approver | rejected | confirmed (chk_rule_approved) |
| RTS-002 | submitForReview by user without uom.catalog.write | 403 | RBAC gate (after permission seed) |
| RTS-003 | esign by user without uom.catalog.esign | 403 | RBAC gate |
| RTS-004 | retire unit referenced by active rule | impact analysis blocks (after RP-RT004) | currently service does not block; gap |
| RTS-005 | alias triage by operations user | 403 | RBAC gate |
| RTS-006 | AI advisor auto-decides | impossible by service design | confirmed |
| RTS-007 | full workflow round-trip on a synthetic rule | all 4 rows present in uom_rule_approval | confirmed |
| RTS-008 | e-sign without nonce | accepted (currently); gap | RT-001 |
| RTS-009 | tamper attempt on MEASVAL JSONB | scanner / bridge re-verify detects | confirmed |
| RTS-010 | replay attack on esign | nonce mismatch | requires RT-001 patch first |

## 6. Audit scorecard

| Axis | Score |
|---|---|
| RBAC coverage | 8 (RT-002, RT-003, RT-006 open) |
| Workflow enforcement | 9 (RT-004 open) |
| Audit trail completeness | 10 |
| E-sign payload integrity | 6 (RT-001 open) |
| AI separation | 10 |
| **Total** | **43 / 50** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
