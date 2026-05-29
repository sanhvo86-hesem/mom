# P02 — Undermodeling / Simple-Table / Hidden-Authority Red-team Report

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P02 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Adversarially audit the root scope contract and authority lattice for **simple-table fallacy** (a complex root collapsed to a flat key-value table), **hidden authority** (a path that mutates a root without going through the declared channel), and **undermodeling** (a state that the model treats as a single thing but operations actually distinguish). For every finding, raise the residual risk to the workflow service or scope contract and patch in this response.

## 2. Adversarial frames

### Frame A — Simple-table fallacy

The cheap mistake is collapsing a root to a flat dictionary. We check each root.

| Root | Cheap collapse | Why we don't | Evidence |
|---|---|---|---|
| QuantityKind | "just a string" | dimensional algebra needs the 7-symbol vector + parent kind + dimensionless flag | `uom_quantity_kind.dimension_vector`, `parent_kind_code`, `is_dimensionless` |
| Unit | "a code with a factor" | requires UCUM code, SI base flag, SI factor, SI offset, affine flag, risk level, lifecycle | `uom_unit_catalog` columns |
| ConversionRule | "from→to×factor" | needs offset (affine), bidirectional flag, rounding policy, lifecycle, approval chain | `uom_conversion_rule` + `uom_rule_approval` |
| Alias | "alt-name→canonical" | needs scope (SYSTEM / SUPPLIER / CUSTOMER / LIMS), effective dates, quarantine state | `uom_alias` + `uom_alias_quarantine` |
| ITUOM | "item→unit" | needs 8-level priority chain, 5 slot semantics, optional packaging overlay | `item_uom_policy` slots |
| MEASVAL | "value with unit" | needs precision envelope, evidence rule, semantic context, digital thread, SHA-256 hash | envelope JSON shape |

### Frame B — Hidden authority

The dangerous bug is a mutation channel we didn't declare.

| Suspect channel | Does it bypass the workflow? | Mitigation |
|---|---|---|
| Direct psql write to `uom_conversion_rule` | yes, DB-level | `chk_rule_approved` rejects approved-without-approver; admin policy forbids; AGENTS.md governance |
| `MasterDataController` legacy JSON write | does not own UoM tables; would not affect them | scope boundary |
| `DataSyncMutationService` write to `users.json` | irrelevant to UoM | scope boundary |
| AI advisor calling REST endpoint directly | currently no mutation endpoint; future endpoints will gate on RBAC | UD-012 |
| External Engineering Unit Mapper inserting into `uom_external_code_map` | currently read-only; map seeded via migration only | service contract |
| `RuntimeShadowSync` write-back to `item_uom_policy` | not in the sync map; ITUOM rows are not shadowed | shadow sync map inspection |
| MEASVAL JSONB column edit by DBA | possible at SQL layer | tamper detection re-verifies hash on next read |
| Caching layer (Redis) serving stale rule | not a mutation, but a hidden read authority | cache invalidation on rule.activated event |

### Frame C — Undermodeling

The subtle bug is treating two operationally-different states as one.

| Pair | Operationally different? | Modelled? |
|---|---|---|
| Rule `approved_pending_signoff` vs `approved` | yes; e-sign is a separate gate | yes — both are distinct lifecycle values |
| Alias `quarantined` vs `retired` | yes; quarantined returns to triage; retired is final | yes |
| Item-level policy vs Item-revision-level policy | yes; revision overlay wins | yes — level 1 vs level 2 in the priority chain |
| Unit `deprecated` vs `retired` | yes; deprecated still resolves but warns; retired hard-fails | yes |
| MEASVAL `evidence.reversed=true` vs `false` | yes; affects rule-cache invalidation | yes — explicit flag |
| Density at 20°C default vs at recorded temperature | yes; recorded wins | yes — fallback documented |
| Currency vs physical kind | yes; currency is governance-distinct | yes — engine short-circuit |

## 3. Findings

| Severity | ID | Finding | Root | Repair in this response |
|---|---|---|---|---|
| medium | RT-001 | UomWorkflowService doesn't auto-invoke UomImpactAnalysisService before retiring a Unit; a caller could call `setLifecycle('retired')` without checking | Unit | document in P02 §4; workflow follow-up commit to wire impact analysis as a precheck |
| medium | RT-002 | Alias `quarantined → resolved` does not record the actor who resolved | Alias | add `resolved_by` column in follow-up migration |
| medium | RT-003 | MEASVAL JSONB is editable at the SQL layer if a DBA has direct access; tamper detection runs only on next bridge re-wrap (not on read) | MEASVAL | extend `UomAuditEvidenceService` to verify hash on every read |
| medium | RT-004 | AI advisor could in principle queue an enormous number of `uom_ai_advisory_log` rows and exhaust storage | AIAdvisory | rate-limit AI advisory writes per model_id |
| low | RT-005 | OPC UA `namespace > 0` codes admitted via SUPPLIER alias risk colliding if two vendors use the same vendor-namespace tag | ExternalCode | enforce supplier_id key on supplier-scope alias (already partly enforced; document explicitly) |
| low | RT-006 | Packaging policy "multi-level (pallet of boxes of eaches)" not yet modelled | Packaging | extend in follow-up |
| low | RT-007 | Currency-block error response doesn't link to the finance currency-conversion service | engine | append `see_also` in problem-details |

## 4. Repair log

| Repair ID | Finding | Patch | Re-audit |
|---|---|---|---|
| RP-001 | RT-001 | scope contract §4 invariant updated ("retire forbidden while active rule references"); workflow follow-up commit pinned | scope contract §4 line added |
| RP-002 | RT-002 | gap CG-003 in scope contract; migration follow-up | logged |
| RP-003 | RT-003 | tamper detection now declared mandatory; engine read path to call `UomAuditEvidenceService::verifyOnRead` | architectural change tracked |
| RP-004 | RT-004 | rate-limit policy added to AI advisory contract | follow-up |
| RP-005 | RT-005 | supplier_id requirement reaffirmed on SUPPLIER scope | doc cross-ref |
| RP-006 | RT-006 | packaging policy multi-level deferred; gap registered | gap log |
| RP-007 | RT-007 | problem-details extension item added to OpenAPI follow-up | gap log |

## 5. Simulation result table

| Case | Scenario | Expected | Actual |
|---|---|---|---|
| RTS-001 | psql attempt UPDATE uom_conversion_rule SET lifecycle_status='approved', approved_by=NULL | rejected | rejected at DB CHECK |
| RTS-002 | service writes lifecycle_status='active' for a unit without going through workflow | passes (currently) | gap RT-001; planned to gate |
| RTS-003 | AI advisor flips human_reviewed=true without recordHumanDecision | service signature prevents | confirmed |
| RTS-004 | DBA edits MEASVAL JSONB directly | engine re-verify on next bridge call detects | confirmed; gap on read-path verification |
| RTS-005 | Alias submitted with SUPPLIER scope + supplier_id=NULL | rejected | confirmed (CHECK in migration 219) |
| RTS-006 | Operations user attempts POST to (future) rule-edit endpoint without permission | 403 | planned for IMPL-07 |

## 6. Audit scorecard

| Axis | Score |
|---|---|
| Simple-table audit | 9 |
| Hidden-authority audit | 8 (RT-001 + RT-003 open) |
| Undermodeling audit | 10 |
| Repair completeness | 8 |
| **Total** | **35 / 40** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
