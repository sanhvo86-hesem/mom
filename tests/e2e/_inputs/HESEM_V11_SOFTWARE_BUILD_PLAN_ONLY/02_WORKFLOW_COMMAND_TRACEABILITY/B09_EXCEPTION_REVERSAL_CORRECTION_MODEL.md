# B09 — Exception, Reversal, and Correction Model

> Stream: `B_WORKFLOW_EVIDENCE`  
> Prompt ID: `B09`  
> Output folder: `HESEM_V11_PARALLEL_OUTPUT/B_WORKFLOW_EVIDENCE/B09_EXCEPTION_REVERSAL_CORRECTION_MODEL/`  
> Next prompt: `03_STREAM_B_WORKFLOW_EVIDENCE/B10_WORKFLOW_QA_EXPORT.md`  
> Run date: `2026-04-27`  
> Status: `PASS_WITH_GAPS`

## 0. Operating posture

B09 is a planning-only package. It does not create DDL, SQL, executable schema, OpenAPI YAML/JSON, controller/service/component, frontend code, test code, migration, or production/validated-system claim.

HESEM remains:

```text
development / prototype / pre-production-readiness
NOT production
NOT controlled deployment transition
NOT validated-status claim
```

Repo status:

```text
Repo MOM GitHub not checked by user instruction; current repo state is treated as unverified.
```

## 1. Mission

B09 defines the universal exception/reversal/correction model for ERP + MOM + MES + eQMS workflows generated in B01–B08. Its purpose is to prevent uncontrolled mutation by making every exceptional action answer these questions:

1. Which record/root is affected?
2. What is the current controlled state?
3. What action is requested: reject, return, rework, hold, cancel, void, supersede, reopen, reverse, correct, late entry, or emergency override?
4. Is it allowed, blocked, or allowed only through a controlled path?
5. Who can perform it?
6. What reason, evidence, e-sign meaning, audit event and impact assessment are required?
7. Which downstream roots must be checked before the action is accepted?
8. What should the frontend show and what conceptual API problem should block unsafe attempts?
9. What stop-rule prevents silent edit, hard delete, backdating, signature unlinking or hidden authority?

## 2. Source baseline used

B09 used the following internal planning baselines:

- P0 root baseline: `145` root rows.
- B02–B06 workflow transition matrices: `827` transition rows.
- B07 regulated mutation/e-sign crosswalk: `745` rows.
- B08 requirements-to-test traceability model: `745` rows.
- Repo state: not checked by user instruction.

B09 also uses these official compliance lenses as planning gates:

- 21 CFR Part 11: electronic records/signatures, signature meaning, signature/record linking.
- FDA Data Integrity guidance: complete, consistent, accurate data; ALCOA; metadata and audit reconstruction.
- EU GMP Annex 11 current baseline: lifecycle risk management, validation, product quality/data integrity controls.

## 3. B09 non-negotiable decisions

### 3.1 No silent edit after controlled reliance

Any record that is released, effective, approved, signed, posted, executed, accepted, closed, or retained is locked against direct field overwrite.

Allowed correction paths are:

```text
append-only correction / addendum
controlled revision / supersede
case reopen with new material evidence
compensating or reversal transaction
release/hold/rework/disposition workflow
explanatory addendum for audit/signature/evidence issues
```

Blocked paths are:

```text
silent edit
hard delete
signature unlink
audit event rewrite
backdate
direct edit of posted transaction
direct edit of released/effective/signed record
changing closed quality decision without reopen/addendum
offline release/e-sign/disposition
AI approval/signature/release/disposition/closure
```

### 3.2 Every exception must preserve reconstruction

A valid exception/reversal/correction must preserve:

```text
original value or decision
corrected value or decision
reason-for-change
actor and role
source evidence
actual event time if relevant
entry/correction time
audit event
signature meaning if regulated or GxP-impacting
impact assessment
downstream notification
version or compensation lineage
```

### 3.3 Reason is a controlled field, not free commentary

A correction reason must carry both a controlled reason category and a human-readable explanation. The reason must be specific enough to reconstruct why the mutation occurred and why the selected correction path was allowed.

Minimum reason categories:

```text
review rejection
return for correction
shopfloor mistake
wrong lot/serial/label/genealogy
inventory posting error
receipt/shipment/invoice correction
released master-data correction
document/effectivity correction
training/qualification correction
NQ/deviation/MRB disposition correction
CAPA effectiveness/closure issue
complaint/reportability correction
supplier-quality correction
equipment/calibration/OOT correction
EHS/LOTO/PTW/safety correction
validation protocol/test/summary correction
offline reconciliation conflict
AI advisory correction
emergency override
platform/API/IAM/event/toggle/tenant correction
```

### 3.4 Signature meaning is never generic

B09 inherits B07 and forbids generic signature meaning such as `approved by user`. Valid signature meanings must name the responsibility:

```text
review rejection
correction approval
hold responsibility
release from hold responsibility
transaction reversal approval
revision/change approval
disposition correction approval
release decision addendum
late-entry attestation
emergency authorization
post-action emergency review
validation deviation approval
system owner attestation
QA review of explanatory addendum
```

### 3.5 Impact assessment is mandatory by trigger, not optional by mood

Impact assessment is mandatory when the correction touches any of these conditions:

```text
released/effective/signed/posted/closed state
inventory, lot, serial, label, genealogy, trace edge
batch/device/release packet/release decision
NQ/deviation/MRB/disposition/quarantine
CAPA closure/effectiveness
document/training/effectivity/change
equipment/calibration/OOT/MSA/RTS
EHS/LOTO/PTW/JSA/PPE/safe work
validation evidence/protocol/test/summary
platform/API/event/IAM/live toggle/tenant control
audit trail, e-signature, evidence packet
AI advisory that influenced a human regulated decision
offline reconciliation conflict
```

### 3.6 Emergency override is high-friction and post-reviewed

Emergency override exists to reduce a higher immediate risk, not to bypass governance. It must be time-bound, reasoned, scoped, audited, role-restricted and post-reviewed.

Emergency override cannot:

```text
edit audit trail or signature
detach signature from record
make AI authoritative
release product without post-action QA review
dispose material without controlled decision
close CAPA/NQ/deviation/complaint/reportability decision
perform offline release/e-sign/disposition
```

## 4. Action taxonomy

| Action ID | Requested action | Normal current state | Default allowance | Audit event |
|---|---|---|---|---|
| A01_REJECT_REVIEW | reject | submitted_or_in_review | allowed_with_controls | B09_AUDIT_REVIEW_REJECTED |
| A02_RETURN_FOR_CORRECTION | return_for_correction | in_review_or_pending_qa_review | allowed_with_controls | B09_AUDIT_RETURNED_FOR_CORRECTION |
| A03_PLACE_HOLD_OR_BLOCK | place_hold | active_available_released_or_in_process | allowed_with_controls | B09_AUDIT_HOLD_PLACED |
| A04_RELEASE_HOLD | release_hold | on_hold_or_blocked | allowed_with_controls | B09_AUDIT_HOLD_RELEASED |
| A05_CANCEL_UNSTARTED | cancel | draft_planned_approved_not_started_or_open_remaining_quantity | conditional | B09_AUDIT_RECORD_CANCELLED |
| A06_VOID_DUPLICATE_OR_ERRONEOUS_UNRELIED | void | draft_submitted_duplicate_or_erroneous_no_downstream_reliance | conditional | B09_AUDIT_RECORD_VOIDED |
| A07_SUPERSEDE_RELEASED | supersede_or_revision | released_effective_signed_or_approved | allowed_with_controls | B09_AUDIT_RECORD_SUPERSEDED |
| A08_REOPEN_CLOSED | reopen | closed_completed_released_or_summary_accepted | conditional | B09_AUDIT_RECORD_REOPENED |
| A09_REVERSE_POSTED_TRANSACTION | reverse_or_compensate | posted_consumed_shipped_received_invoiced_or_closed_transaction | allowed_with_controls | B09_AUDIT_TRANSACTION_REVERSED_OR_COMPENSATED |
| A10_APPEND_ONLY_CORRECTION | correct_with_addendum | executed_accepted_reviewed_signed_or_retained | allowed_with_controls | B09_AUDIT_APPEND_ONLY_CORRECTION |
| A11_LATE_ENTRY | late_entry | executed_or_in_review_with_missing_entry | conditional | B09_AUDIT_LATE_ENTRY_RECORDED |
| A12_EMERGENCY_OVERRIDE | emergency_override | blocked_or_time_critical_with_higher_risk_if_waiting | exception_only | B09_AUDIT_EMERGENCY_OVERRIDE_EXECUTED |

## 5. Policy groups

| Group | Policy group | Roots covered | Owner gate | Primary stop gate |
|---|---|---|---|---|
| G01_CUSTOMER_SUPPLIER_MASTER | Customer/Supplier master and hold authority | CUST, SUP, SUP_QUAL | Commercial Lead + Supplier Quality Owner | master data SOD + duplicate/identity/terms/supplier-quality impact gate |
| G02_ITEM_BOM_ROUTING_SPEC | Item/BOM/routing/spec controlled master records | ITEM, BOM, ROUTE, SPEC, CONTROL_PLAN, FMEA | Master Data Owner + Engineering/Quality Owner | revision/effectivity impact assessment + training/validation impact gate |
| G03_COMMERCIAL_DOCUMENTS | Quotation, customer order, shipment and invoice operational documents | QUO, CPO, SO, SHIPMENT, INVOICE | Commercial Lead + Logistics/Finance Handoff Owner | customer/order fulfillment impact gate + no silent edit after ship/invoice handoff |
| G04_PROCUREMENT_RECEIVING | Purchase order, receiving and supplier-return workflows | PO, RECEIPT, PREC, GRN, SUP, SCAR | Procurement Lead + Receiving Quality Owner | receipt evidence + supplier quality + lot/inventory impact gate |
| G05_INVENTORY_LOT_SERIAL | Inventory, lot, serial, label and quarantine state authority | INVTXN, LOT, SERIAL, LABEL, QUARANTINE, CYCLE_COUNT, RESERVATION | Inventory Control Owner + Quality Owner | posted transaction cannot be edited; compensation transaction + trace impact required |
| G06_PLANNING_DISPATCH | Planning, scheduling, dispatch and order authorization | MPS, MRP, SCHEDULE, DISPATCH, DISP, WO, JO, KIT | Planning Lead + Production Control Owner | no schedule/order correction without WIP/material/equipment/labor impact |
| G07_OPERATION_EXECUTION | Shopfloor operation execution and instruction runtime | OPER, INSTRUCTION, INSP, SPC, OEE_EVENT, ANDON | Production Supervisor + Quality Operations Owner | append-only execution correction + independent review for accepted/released evidence |
| G08_BATCH_EBR_EDHR_RELEASE | Batch/device record, release packet and lot/batch release authority | BATCH_RECORD, EBR, EDHR, RELEASE_PACKET, BREL | Quality Release Owner + Batch/Device Record Owner | QA release SOD + audit trail review + open deviation/CAPA/hold check |
| G09_GENEALOGY_TRACEABILITY | Genealogy, trace edge and digital thread correction | LOT_GENEALOGY, OTGEDGE, WIP, TRACE_EDGE | Traceability Owner + Quality Operations Owner | no overwrite/delete of original edge; append amendment edge only |
| G10_NQ_DEVIATION_MRB | Nonconformance, deviation, quarantine, MRB and disposition | NQCASE, DEVIATION, MRB, QUARANTINE, CONC | Quality Operations Owner + MRB Chair | disposition cannot be changed without impact assessment and independent QA/MRB approval |
| G11_CAPA_EFFECTIVENESS | CAPA root cause, action, verification and effectiveness | CAPA | CAPA Owner + Quality System Owner | closure correction/reopen requires QA SOD and effectiveness impact decision |
| G12_DOCUMENT_TRAINING_CHANGE | Controlled documents, training, ECO/MCO and change effectivity | CDOC, TRAIN_RECORD, TRAIN, ECO, MCO, VALIDATION_CHANGE | Document Control Owner + Training Owner + Change Owner | document/change correction must drive training and validation impact if used in execution |
| G13_AUDIT_COMPLAINT_SUPPLIER | Audit finding, complaint, SCAR and supplier quality escalation | AUDIT, AUDIT_FINDING, FINDING, COMPLAINT, SCAR, SUP_QUAL | Quality System Owner + Supplier Quality Owner | reportability or supplier action correction requires quality/regulatory impact assessment |
| G14_EQUIPMENT_MAINT_CAL | Equipment, maintenance, calibration, OOT and measurement devices | EQP, MWO, PMSCH, CAL, MDEV, OOT, MSA, TOOL, RTS, PRED_MAINT | Maintenance Owner + Metrology Owner + Production Supervisor | equipment/calibration correction must assess affected execution/inspection and possible product hold |
| G15_EHS_LOTO_WORK_AUTH | EHS incident, LOTO/PTW/JSA/PPE and safe work authorization | EHS_INCIDENT, LOTO, PTW, JSA, PPE | EHS Owner + Maintenance/Production Supervisor | safety active state cannot be bypassed without emergency authorization and post-review |
| G16_WORKFORCE_SHIFT_COMP | Workforce, competency matrix, labor and shift handover | LABOR, SHIFT, SHIFT_HANDOVER_LOG, COMP_MATRIX, TRAIN_RECORD | Workforce/Training Owner + Production Supervisor | qualification correction must assess commands executed under affected authorization |
| G17_VALIDATION_ARTIFACTS | Validation protocols, test execution, deviations, summary and periodic review | VAL_REQ, VAL_PROTOCOL, VAL_TEST_RUN, VAL_DEVIATION, VAL_SUMMARY, PERIODIC_REVIEW | Validation Owner + System Owner + QA | executed protocol/result cannot be edited; deviation/addendum/supersede required |
| G18_EVIDENCE_AUDIT_ESIGN | Evidence object, audit trail and e-signature authority | EVIDENCE_PACKET, AUDIT_TRAIL, ESIGN, REASON_CODE, SOD_POLICY | Quality System Owner + Platform/System Owner | signature/record link and audit reconstruction cannot be altered; only correction/addendum with QA/system-owner approval |
| G19_AI_ADVISORY | AI advisory output and human authority boundary | AI_ADVISORY_NOTE, AI_RISK_ASSESSMENT, AI_SUMMARY | AI Governance Owner + Domain Decision Owner | AI cannot approve/sign/dispose/release/close; human authority evidence required |
| G20_FINANCE_COST_HANDOFF | Finance/cost/valuation operational handoff evidence | ACT_COST, COST, STD_COST, VARIANCE, INV_VAL, WIP_COST | Finance Lead + Operations Cost Owner | cost correction must not masquerade as GL/AP/AR authority; operational evidence only |
| G21_PLATFORM_INTEGRATION_CONTROL | Platform integration, IAM, API, event, tenant, notification and observability controls | API_GATEWAY, EVENT_BUS, APICON, LIVE_API_TOGGLE, CDC, PARTNER_INTEGRATION, GRAPHICS_AUTH, IAM, NOTIFY, OBSERVABILITY, SRE, TENANT, NOTIF | Platform Lead + Security/Identity/SRE Owner | platform correction/change must have owner, rollback, audit, affected consumer/service impact and security review where applicable |

## 6. Universal correction routing model

For every exceptional command, B09 routes by state and reliance:

### 6.1 Draft or not-yet-submitted

Allowed path:

```text
direct correction with local audit where appropriate
record version increment if material
no hard delete after record ID assignment without visible void trace
```

Blocked path:

```text
deleting assigned identity
hiding draft audit on regulated records
claiming no audit because record is "only draft" when predicate/GxP context requires reconstruction
```

### 6.2 Submitted or in review

Allowed path:

```text
return for correction
reject review
owner correction followed by resubmission
```

Blocked path:

```text
creator editing while reviewer context remains active
evidence replacement without return cycle
reviewer approval over stale version
```

### 6.3 Approved but not effective

Allowed path:

```text
withdraw approval
correct effectivity with impact assessment
create new approval cycle
```

Blocked path:

```text
changing approved content without withdrawal
tampering with effectivity
skipping training/validation impact
```

### 6.4 Released/effective/signed

Allowed path:

```text
supersede
controlled revision
append-only correction/addendum
new effective version
```

Blocked path:

```text
direct edit
signature unlink
field overwrite
copying signature to modified record
```

### 6.5 Posted transaction

Allowed path:

```text
compensating transaction
reversal transaction
adjustment with original transaction reference
```

Blocked path:

```text
overwrite posted quantity/status/date/location/cost
delete original ledger event
change transaction without visible compensation chain
```

### 6.6 Executed/accepted shopfloor evidence

Allowed path:

```text
append-only addendum
late-entry path with actual event time and entry time
NQ/deviation/MRB/hold linkage when product impact exists
```

Blocked path:

```text
overwrite performed-by
backdate
replace inspection/SPC/result evidence
accept offline record without reconciliation
```

### 6.7 Closed case or signed summary

Allowed path:

```text
reopen with new material evidence
closure addendum
linked new case
```

Blocked path:

```text
administrative editing after closure
using reopen to bypass correction/supersede controls
changing root cause/disposition/effectiveness without history
```

### 6.8 Audit trail, signature, evidence packet

Allowed path:

```text
read-only original
explanatory addendum under system-owner and QA review
system deviation/CAPA if integrity issue is material
```

Blocked path:

```text
change signer
change signed timestamp
change signature meaning
detach signature
rewrite audit event
delete audit event
```

## 7. Impact assessment minimum model

Every impact assessment created from B09 must capture:

```text
impact_assessment_id
source_root
source_record_id
source_state
requested_action
reason_category
reason_text
original_value_or_decision
corrected_value_or_decision
affected_downstream_roots
affected_records_query_or_selection
release/product/customer/supplier/safety/validation/data-integrity impact class
evidence_refs
signature_requirement
SOD_result
decision: no_impact | watch | hold | rework | reverse | supersede | reopen | CAPA | SCAR | reportability_review | validation_deviation | platform_rollback
decision_owner
reviewers
notifications
post_action_follow_up
```

No executable schema is created. This is contract prose for C/D/M streams.

## 8. Frontend/API implications for C and D

B09 creates conceptual problem keys and blocked-state requirements. C04/C10 and D03–D09 must convert these into exact API/problem/frontend contracts.

Minimum blocked-state UX:

```text
show current state
show why requested action is blocked
show required evidence/reason/role
show controlled alternative action
show owner to contact
show impacted downstream roots
preserve record shell re-anchor
never hide blocked action behind generic "not allowed"
```

Minimum conceptual API problem content:

```text
problem_key
record_id
root_code
current_state
requested_action
allowed_path
missing_evidence_or_reason
required_actor_or_role
expected_version_result
SOD_result
impact_assessment_required
correlation_id
audit_intent
```

## 9. Artifact index

| File | Purpose | Rows |
|---|---:|---:|
| `B09_CORRECTION_POLICY_MATRIX.csv` | Universal scenario/root-group correction policy | 252 |
| `B09_RELEASED_RECORD_CHANGE_POLICY.csv` | Released/signed/posted/closed state change policy | 252 |
| `B09_IMPACT_ASSESSMENT_TRIGGER_MATRIX.csv` | Mandatory impact triggers and downstream root checks | 17 |
| `B09_ROOT_COVERAGE_MATRIX.csv` | Maps all P0 roots to B09 correction policy groups | 145 |
| `B09_FRONTEND_API_BLOCKING_MODEL.csv` | Conceptual frontend/API blocked-state problem model | 12 |
| `B09_GAP_DECISION_LEDGER.csv` | Gap decisions and next-stream owners | 18 |
| `B09_SOURCE_MAP.csv` | Source map for B09 | 10 |
| `B09_EMERGENCY_OVERRIDE_POLICY.md` | High-friction emergency override policy | narrative |
| `B09_SELF_AUDIT.md` | Self-audit, coverage score and run decision | narrative |

## 10. Handoff to B10

B10 must QA-export workflow evidence by checking:

```text
all B02-B06 transition commands have an exception/correction path
all regulated B07 mutation rows have reason/evidence/audit/e-sign coverage
all B08 validation evidence classes have addendum/deviation/supersede/reopen path
all P0 roots are mapped to a policy group
C/D handoff has conceptual blocked-state/problem implications
M03/M04 gap decisions are explicit
```

## 11. Run decision

B09 is acceptable for the next prompt because it prevents uncontrolled mutation at the planning-contract layer while preserving gaps for A03, C/D exact contracts, M03/M04 merge and user-controlled repo verification.

```text
PROMPT_ID: B09
PROMPT_STATUS: PASS_WITH_GAPS
NEXT_PROMPT_FILE: 03_STREAM_B_WORKFLOW_EVIDENCE/B10_WORKFLOW_QA_EXPORT.md
OUTPUT_FOLDER: HESEM_V11_PARALLEL_OUTPUT/B_WORKFLOW_EVIDENCE/B09_EXCEPTION_REVERSAL_CORRECTION_MODEL/
CRITICAL_GAPS_FOR_NEXT_PROMPT: Repo MOM GitHub not checked by user instruction; current repo state is treated as unverified; A03 exact root contracts unavailable; root_gap_request items remain non-canonical; C/D exact API/frontend contracts unavailable; M03/M04 must merge root/standards/evidence/validation decisions; B10 must QA coverage across B01-B09.
```
