# D7 — Document to Release

```
workflow_id:    D7
workflow_name:  Document to Release
domain_primary: Quality Improvement (Document Control)
domains_cross:  All domains — every controlled document feeds back to
                its source domain upon release
state_machine:  SM-7
trigger_count:  20
branch_count:   14
edge_case_count:11
kpi_count:      12
failure_mode_count: 11
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-4
ai_advisory:    AI-21
version:        V10-deep
```

---

## §1 Purpose and Scope

The Document to Release (D2R) workflow governs the authoring, review, approval,
release, and retirement lifecycle of every controlled document in the HESEM
Quality Management System. It is the canonical home for SM-7 (Document State
Machine) and enforces the approval chain, effectivity gate, training cascade,
and cross-system propagation that make released documents the authoritative
basis for production, inspection, supplier qualification, and regulatory
compliance.

D7 does not execute document content creation (that is done by the owning
domain), but it enforces the governance path that every controlled document
must traverse from draft to released state. It connects to:
- D6 (NC to CAPA): CAPA actions requiring procedure changes trigger D7
- D3 (Plan to Produce): routing/BOM changes require D7 release before WO dispatch
- D8 (Train to Qualify): document release triggers training assignment cascade
- D5 (Inspect to Disposition): inspection plan release requires D7 review
- D12 (Complaint to Recall): recall plan documents require D7 expedited release

Standards aligned: ISO 9001 §7.5, ISO 13485 §4.2.4, IATF 16949 §7.5.1,
21 CFR 820.40, EU GMP Chapter 4, AS9100D §7.5.3, Annex 11 §10.

---

## §2 Document Class Taxonomy

| Class Code | Document Type | Regulatory Anchor | Pack |
|-----------|--------------|------------------|------|
| QM | Quality Manual | ISO 9001 §4.4; ISO 13485 §4.2.2 | All |
| SOP | Standard Operating Procedure | ISO 9001 §7.5; 21 CFR 820.40 | All |
| WI | Work Instruction | ISO 9001 §7.5 | All |
| SPEC | Specification (material, product, process) | ISO 9001 §7.5 | All |
| DWG | Engineering Drawing | AS9100D §7.5.3 | J2/J3 |
| RTG | Routing / Process Sheet | IATF 16949 §8.5.1 | All |
| BOM | Bill of Materials | — | All |
| INSP | Inspection Plan / Control Plan | IATF 16949 §8.6.1; ISO 13485 §7.4.3 | All |
| TM | Test Method | ISO/IEC 17025; 21 CFR 820.72 | All |
| FORM | QMS Form / Record Template | ISO 9001 §7.5.3 | All |
| LBL | Label / Packaging Label | 21 CFR 101; EU MDR Article 10 | J1/J4/J5 |
| IFU | Instructions for Use | EU MDR Annex I §23; 21 CFR 801 | J4 |
| TRAIN | Training Material | ISO 13485 §6.2; IATF 16949 §7.2 | All |
| COMP | Competency Matrix | ISO 13485 §6.2 | All |
| VMP | Validation Master Plan | EU GMP Annex 15; 21 CFR 820.75 | J1/J4 |
| RISK-MD | Risk Management File | ISO 14971 | J4 |
| RISKPOL | Risk Management Policy | ISO 9001 §6.1 | All |
| MBR | Master Batch Record | 21 CFR 211.186; EU GMP Annex 16 | J1 |
| HACCP | HACCP Plan | FSMA §117 | J5 |
| FSP | Food Safety Plan | FSMA §117.126 | J5 |
| APR | Annual Product Review / PQR | ICH Q10; EU GMP Ch. 1 §1.10 | J1 |
| PSUR | Periodic Safety Update Report | EU MDR Article 86; ICH E2C | J4 |
| PPAP | PPAP Submission Document | AIAG PPAP 4th Ed. | J2 |
| CDOC | Controlled Concession / Deviation | ISO 9001 §8.7 | All |
| RECALL | Recall Plan | 21 CFR 7.40; EU MDR Article 83 | J1/J4/J5 |
| DPA-ROPA | Data Protection / ROPA | GDPR Article 30 | All (if handling personal data) |
| CSR | Customer-Specific Requirements Overlay | Customer AIAG / AS / ISO overlays | J2/J3 |
| PCCP | Post-Approval Change Control Protocol | ICH Q12 | J1 |
| STAB | Stability Protocol / Report | ICH Q1A; WHO stability | J1 |
| ECO | Engineering Change Order | AS9100D §8.3.6; IATF 16949 §8.3.6 | All |

---

## §3 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | Document initiator holds `DCC_CREATE` permission | RBAC |
| PC-2 | Document class selected from taxonomy; all required header fields populated | Header completeness check |
| PC-3 | For CAPA-driven documents: CAPA action item `action_id` linked to document draft | CAPA linkage check |
| PC-4 | For ECO-driven documents: Engineering Change Order ID linked | ECO linkage check |
| PC-5 | For J4 IFU/LBL: regulatory affairs representative assigned as mandatory approver | J4 overlay check |
| PC-6 | For J1 MBR/APR: QP assigned as final approver | J1 overlay check |

---

## §4 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | CAPA corrective action requires procedure change | D6 action type = PROCEDURE_CHANGE |
| T-02 | Engineering change order (ECO) approved; affected documents need revision | C3 engineering change |
| T-03 | New product introduction: initial BOM, routing, inspection plan, WI set | D3 new item setup |
| T-04 | Regulatory requirement change: updated standard, regulation, or guidance | Regulatory affairs |
| T-05 | Periodic review due: document in `periodic_review_due` state | Document lifecycle management |
| T-06 | Customer requirement change: CSR update from OEM | C2/D1 customer requirement |
| T-07 | Audit finding: auditor identifies document requires update | D13 audit |
| T-08 | Process change: work center, equipment, or material change requires routing update | D3/C6 |
| T-09 | APR/PQR finding requires SOP or specification update (J1) | J1 annual review |
| T-10 | Stability study results require specification update (J1) | Stability program |
| T-11 | PPAP first article inspection requires control plan update (J2) | J2 PPAP process |
| T-12 | FAI finding requires drawing or routing update (J3) | J3 FAI process |
| T-13 | HACCP re-analysis result requires HACCP plan update (J5) | J5 HACCP review |
| T-14 | Recall plan update required after product portfolio change (J1/J4/J5) | D12 / Regulatory |
| T-15 | New label design required: product line change; regulatory label update | Marketing / Regulatory |
| T-16 | IFU update required: usability study finding; regulatory feedback (J4) | Regulatory affairs (J4) |
| T-17 | Risk management file update: new hazard identified (J4 ISO 14971) | Risk management (J4) |
| T-18 | Validation Master Plan update: new equipment or process in scope | Validation team |
| T-19 | Master Batch Record revision: process improvement; OOS investigation outcome (J1) | Manufacturing QA (J1) |
| T-20 | Data Protection / ROPA update: new processing activity | DPO / Legal |

---

## §5 State Machine — SM-7 Document

### States

| State | Meaning |
|-------|---------|
| `draft` | Document being authored; no review initiated |
| `review` | Document submitted for technical/peer review |
| `approval` | Document in approval queue; awaiting required approver signatures |
| `bd_approval_pending` | BD-4 release gate: requires final authority e-signature |
| `released` | Document fully approved and released; effective version active |
| `superseded` | Replaced by newer revision; retained per retention policy |
| `obsolete` | Document retired; no longer in use; archived |
| `periodic_review_due` | Scheduled review date reached; awaiting review decision |
| `withdrawn` | Released document recalled during review cycle; older revision reinstated |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `draft` | Author submits for review | `required_sections_complete = true` | `review` | Author |
| `review` | All reviewers approve | `all_reviewers.decision = APPROVED` | `approval` | DCC Coordinator |
| `review` | Any reviewer requests changes | `any_reviewer.decision = CHANGE_REQUESTED` | `draft` | Author |
| `approval` | All approvers signed (< BD-4 threshold) | `all_approvers_signed ∧ !bd_4_required` | `released` | DCC Coordinator (system) |
| `approval` | BD-4 gate required | `bd_4_required = true` | `bd_approval_pending` | System |
| `bd_approval_pending` | BD-4 final authority signs | `final_authority_esig = true` | `released` | Quality Director / QP |
| `bd_approval_pending` | BD-4 rejected | `final_authority_rejected = true` | `approval` | Document owner notified |
| `released` | New revision initiated | `revision_initiated = true` | `draft` (new rev) + `superseded` (prior rev) | Author |
| `released` | Periodic review date reached | `periodic_review_date ≤ today` | `periodic_review_due` | System |
| `periodic_review_due` | Review confirms no change needed | `no_change_required_esig = true` | `released` (same rev) | Document Owner |
| `periodic_review_due` | Review triggers revision | `revision_required = true` | `draft` (new rev) | Author |
| `released` | Withdrawal required (urgent safety issue) | `withdrawal_reason set` | `withdrawn` | Quality Director |
| `withdrawn` | Prior revision reinstated | `prior_revision_reinstated = true` | `released` (prior rev) | DCC Coordinator |
| `superseded` | Retention period elapsed | `retention_period_expired = true` | `obsolete` | System |

---

## §6 Step Substance

### Step 1 — Document Initiation

Author creates `document_header` record:
- `document_class`: selected from taxonomy
- `document_code`: auto-generated per DCC numbering scheme (e.g., SOP-MFG-0042)
- `document_title`
- `revision`: starts at 00 (or A, depending on configuration)
- `scope_statement`
- `owning_department`, `owning_process_id`
- `initiator_id`, `initiated_date`
- `trigger_reference`: CAPA action ID, ECO ID, or manual
- `retention_period_years`
- `periodic_review_interval_months`

AI-21 (Document Drafting Assistant) is available at this step to suggest
document structure based on class, generate initial section headers,
and populate regulatory reference lists.

### Step 2 — Technical Review

Review roster is assembled from the document class configuration:
- Mandatory reviewers by class (e.g., SOP: process owner + QA representative)
- Optional reviewers: any stakeholder added by author
- For cross-domain documents: domain representative from each affected domain

Reviewers work against the `review_checklist` for the document class:
- Content accuracy
- Regulatory compliance check
- Cross-reference integrity (other document IDs referenced must be valid)
- Terminology consistency (aligned with controlled glossary)
- Readability and usability (for WI/IFU: can operators/patients follow without ambiguity)

Review round: each reviewer independently marks APPROVED or CHANGE_REQUESTED.
If any CHANGE_REQUESTED: author revises; new review round starts (unless all
other reviewers agree the change is minor and the coordinator marks resolved).

### Step 3 — Approval Chain

Approval chain is configured per document class with required approver roles.
Examples:

| Doc Class | Required Approver Roles |
|-----------|------------------------|
| SOP | QA Manager + Department Head |
| WI | Process Engineer + QA Representative |
| MBR (J1) | QA Manager + Production Manager + QP |
| IFU (J4) | Regulatory Affairs + QA Director |
| HACCP (J5) | PCQI + Food Safety Team Leader + QA Manager |
| RECALL | QA Director + Regulatory Affairs + VP Operations |
| RISK-MD (J4) | Risk Manager + QA Director |
| DWG (J3) | Design Engineer + Configuration Manager + QA |

Each approver signs with e-signature. Approval is sequential within each role
level (e.g., both QA Manager signatures before proceeding to Director level)
or parallel (configurable per class). Each e-sig recorded with:
`approver_id`, `esig_hash`, `timestamp`, `IP_address`, `comment`.

### Step 4 — BD-4 Release Gate

**BD-4**: No Quality System document of class {QM, VMP, RECALL, RISK-MD, MBR
[J1], HACCP/FSP [J5], APR [J1], PSUR [J4]} may be released without the
Quality Director e-signature as the final authority. For J1 MBR: QP e-signature
is additionally required and is non-delegable.

API enforcement at `POST /api/v1/dcc/documents/{id}/release`:
```json
{
  "type": "https://hesem.io/problems/banned-decision",
  "status": 403,
  "bd_code": "BD-4",
  "detail": "BD-4: Document class QM requires Quality Director final e-signature before release.",
  "required_signatories": ["quality_director"],
  "signed_by": []
}
```

For all other document classes, release occurs automatically after all
configured approvers sign.

### Step 5 — Release and Effectivity Gate

Upon release:
1. `document.status = released`; `document.effective_date = today`
   (or a future date if `deferred_effectivity_date` set)
2. Previous revision transitions to `superseded`
3. **Effectivity gate cascade** fires for each cross-system registration:

**SM-1 (Order)**: if inspection plan released → BREL check updated; open
SO promises re-evaluated against new specification.

**SM-3 (Work Order)**: if BOM/routing/WI released → all `firm_planned` WOs
for this item re-evaluated; G4 Document gate cleared for WOs held on this
document. If routing change affects setup or cycle time: planner notified
to review schedule.

**SM-4 (Inspection Record)**: if inspection plan released → open IQC records
still in progress receive updated plan reference; new sampling parameters apply
from next lot received.

**SM-10 (Batch Release)**: if MBR released (J1) → batch manufacturing orders
created after effective date use new MBR revision. In-progress batches evaluated:
if safety-critical change, may require re-processing decision.

**SM-14 (Validation)**: if VMP released → validation schedule updated;
validation protocols referencing this VMP updated to new revision reference.

**SM-INSP (Calibration)**: if test method released → calibration plans
referencing this TM updated to new revision.

### Step 6 — Training Assignment Cascade

Document release triggers training cascade via D8:
1. System queries `document_training_requirement` table for this document class
   and specific document ID
2. `training_assignment` records created for all personnel in the defined
   audience groups (role-based, department-based, or specific person list)
3. Training due date set: `release_date + grace_period_days[doc_class]`
4. Training type: read-and-acknowledge (for most documents) or
   classroom/practical (for WI/SOP with competency assessment requirement)
5. WO dispatch blocked (G4 gate) for operators who have not completed training
   on released documents that affect their operation

Training cascade records link `document_id` + `revision` to `training_assignment`
records, so the system can verify that each operator's training is on the current
revision.

### Step 7 — Periodic Review and Obsolescence

Each released document has a `periodic_review_date` calculated from:
`release_date + periodic_review_interval_months[doc_class]`

Default intervals:
- QM, VMP, HACCP/FSP: 12 months
- SOP, WI, SPEC, MBR: 24 months (or triggered earlier by CAPA)
- Forms, Labels, Training Material: 36 months
- IFU, LBL (J4): at each product registration renewal

At periodic review:
- Document owner reviews for accuracy and currency
- If no change: `no_change_confirmation` e-sig; review date reset
- If change required: new revision draft initiated
- If document no longer needed: obsolescence request → Quality Director
  approval → `obsolete` transition; archival per retention policy

---

## §7 Branch Catalog

| Branch ID | Condition | Special Logic |
|-----------|----------|--------------|
| BR-D7-01 | CAPA-driven revision | CAPA action linked; CAPA action stays `pending_doc_release` until D7 released; CAPA notified on release |
| BR-D7-02 | ECO-driven revision | ECO approved; all ECO-affected documents revised concurrently; co-release coordination |
| BR-D7-03 | Emergency release (urgent safety) | Expedited review/approval; e-sigs can be collected in parallel; Quality Director notified immediately |
| BR-D7-04 | Multi-site document | Single release serves multiple facilities; effectivity gate fires for each facility |
| BR-D7-05 | Customer-required review (J2/J3) | Customer or design authority must review and acknowledge before release |
| BR-D7-06 | MBR revision (J1) | QP co-signature required; in-progress batches evaluated for impact |
| BR-D7-07 | PPAP document set (J2) | PPAP PSW and supporting documents co-released as package; PPAP status updated |
| BR-D7-08 | HACCP plan update (J5) | PCQI review; re-validation of CCP critical limits if limits change |
| BR-D7-09 | IFU/LBL revision (J4) | Regulatory Affairs review; notified body consultation if significant change |
| BR-D7-10 | Risk Management File update (J4) | Risk manager review; residual risk acceptability confirmation |
| BR-D7-11 | Recall Plan update | Quality Director + Regulatory Affairs joint review; distribution to designated personnel after release |
| BR-D7-12 | Controlled concession (CDOC) release | Linked to disposition case; time-limited validity; customer acknowledgement required |
| BR-D7-13 | APR/PQR release (J1) | QP review; findings trigger CAPA where applicable; management distribution list |
| BR-D7-14 | Deferred effectivity | Document released but effective date in future; interim period communicated to affected staff |

---

## §8 Effectivity Gate — Cross-System Propagation Detail

The effectivity gate is the mechanism by which a newly released document
notifies all dependent state machines and work items that the authoritative
document has changed. This prevents operations from proceeding on stale document
references.

**Gate propagation sequence** (synchronous, transactional):
1. `document.status` transitions to `released`
2. `document_effectivity_propagation` job fires:
   - Queries `document_cross_reference` table for all entities referencing
     this document ID + any prior revision
   - For each referencing entity: updates `entity.document_ref_revision`
     to new revision; if entity is in a state that requires current document
     (WO in `firm_planned` or `released`, inspection in `inspection_plan_selected`,
     etc.), marks entity as `document_updated` — planner/supervisor informed
3. G4 (Document Eligibility) gate cleared for WOs that were blocked pending this release
4. Training assignments created (D8 cascade)
5. `document_release_notification` sent to all subscribers of this document

**Retroactive safety catch**: if a released document is withdrawn (Safety BD-4
override), the reverse propagation fires:
- All WOs in `released` state that reference the withdrawn document reverted
  to `firm_planned`; G4 gate re-evaluated
- Running batches (J1) flagged for QP review

---

## §9 Per-Pack Overlays

### J1 Pharma
- **MBR lifecycle**: every Master Batch Record change requires QP e-signature
  as BD-4 mandatory approver. In-progress batches are evaluated: if change is
  safety-critical, QP decides whether to complete current batch under old MBR
  or stop and implement change immediately.
- **Annex 11 §10**: all electronic document management must ensure version
  control, access control, audit trail, and backup. Changes to system configuration
  that affect document control are change-controlled.
- **APR/PQR distribution**: released APR/PQR automatically distributed to
  QP, QA Director, and marketing authorization holder contact.

### J2 Automotive
- **PPAP document package**: all PPAP documents (control plan, PFMEA, MSA
  study, dimensional results, material certifications, PSW) co-managed in D7
  as a linked package. PPAP status update (`APPROVED`, `INTERIM`, `REJECTED`)
  driven by PPAP document package release.
- **Customer-specific requirements (CSR)**: changes to OEM customer requirements
  trigger D7 review of all affected SOPs, control plans, and drawings. CSR
  overlay document tracks customer-specific deviations from IATF 16949 baseline.

### J3 Aerospace
- **Configuration management**: drawings and engineering specifications under
  AS9100D §7.5.3 configuration control. Change authority defined by
  `configuration_management_plan`; external design authority approval required
  for Class I and Class II changes.
- **Export control marking**: documents containing ITAR or EAR-controlled
  technical data are marked with the appropriate export control legend on the
  document face. Document access restricted to cleared personnel.

### J4 Medical Device
- **DHF integration**: design documents (drawings, specifications, risk file,
  V&V reports) are part of the Design History File. D7 manages their release;
  DHF completeness check at product release milestone.
- **Notified body submission**: documents submitted to notified body for
  CE marking require a specific `NB_SUBMISSION_REF` field; changes to
  NB-reviewed documents trigger a re-submission assessment by Regulatory Affairs.

### J5 Food Safety
- **FSMA HACCP plan**: changes to HACCP plan require hazard re-analysis by PCQI
  if the change affects hazard identification, CCP determination, or critical
  limits. Re-analysis documented as a revision addendum before release.
- **Food Safety Plan**: FSP release triggers employee training on new or
  changed preventive controls. Training completion tracked via D8 cascade.

---

## §10 BD-4 Enforcement Detail

**BD-4**: High-authority document release for class {QM, VMP, RECALL, RISK-MD,
MBR [J1], HACCP/FSP [J5], APR [J1], PSUR [J4]} requires Quality Director
final e-signature. Pharma MBR additionally requires QP (non-delegable).

E-signature record stored in `banned_decision_log`:
```
bd_code: "BD-4"
document_id: <UUID>
document_class: "MBR"
signatory_role: "quality_director"
signatory_user_id: <UUID>
esig_token_hash: <SHA-256>
timestamp: <ISO 8601>
ip_address: <string>
user_agent: <string>
justification: <optional note>
```

E-signature cannot be delegated for QP role on MBR (J1); the QP must personally
authenticate. System enforces by checking `user.qp_certified = true` for the
signing user.

---

## §11 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-21 Document Drafting | Draft creation (Step 1); revision (Steps 2-3) | Section structure suggestions; regulatory reference auto-population; gap detection vs. regulatory checklist; terminology consistency check |

AI-21 never auto-approves; all suggestions require human review. AI-generated
content marked with `ai_assisted = true` flag on affected document sections.

---

## §12 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D6 NC to CAPA | CAPA procedure-change action triggers D7; CAPA action remains open until D7 released | D6 → D7; D7 → D6 (close action) |
| D3 Plan to Produce | Routing/BOM/WI release clears G4 gate; training cascade feeds G1 gate | D7 → D3 |
| D8 Train to Qualify | Document release triggers training assignment cascade | D7 → D8 |
| D5 Inspect to Disposition | Inspection plan release updates open inspection records | D7 → D4/D5 |
| D10 Batch to Release | MBR release governs active batch manufacturing | D7 → D10 (J1) |
| D12 Complaint to Recall | Recall plan managed through D7 | D12 → D7 |
| D14 Validate to Qualify | VMP and validation protocols managed through D7 | D14 ↔ D7 |
| C3 Supplier Quality | Supplier quality agreement revisions managed through D7 | C3 ↔ D7 |

---

## §13 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D7-01 | Document Cycle Time | `draft` initiated → `released` | SOP ≤ 21 days; WI ≤ 14 days; QM/VMP ≤ 45 days |
| KPI-D7-02 | CAPA-Triggered Document On-Time Release | CAPA-driven documents released before CAPA SLA / total CAPA-linked documents × 100 | ≥ 90% |
| KPI-D7-03 | Overdue Periodic Reviews | Documents in `periodic_review_due` > 30 days past review date / total documents in review × 100 | ≤ 5% |
| KPI-D7-04 | Review First-Pass Approval Rate | Documents approved without change request / total review submissions × 100 | ≥ 75% |
| KPI-D7-05 | Training Cascade Completion Rate | Training assignments completed before due date / total cascade assignments × 100 | ≥ 95% |
| KPI-D7-06 | Stale Document Rate | Documents with no review in > `periodic_review_interval + 12 months` / total active documents × 100 | 0% |
| KPI-D7-07 | BD-4 Approval Cycle Time | `bd_approval_pending` → `released` | ≤ 3 business days |
| KPI-D7-08 | Document Withdrawal Rate | Documents withdrawn after release / total released documents per period | Track; minimize |
| KPI-D7-09 | MBR On-Time Release Rate (J1) | MBR revisions released before batch start / total MBR revisions needed for scheduled batches × 100 | 100% |
| KPI-D7-10 | Cross-Reference Integrity | Documents with broken cross-references (linked doc obsolete without update) / total active documents × 100 | 0% |
| KPI-D7-11 | Effectivity Gate Propagation Latency | Time from `released` event → all dependent entities notified | ≤ 5 minutes |
| KPI-D7-12 | Export-Controlled Document Access Violations (J3) | Unauthorized access attempts on ITAR-marked documents | 0 |

---

## §14 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Operators using obsolete document revision | Training cascade not completed; paper copies not collected | Audit: training record vs. current revision | Training gate enforced by eligibility resolver G4; paper copy control policy |
| FM-02 | CAPA action closed while document still in draft | Manual CAPA closure bypass | CAPA-linked document completeness check | CAPA system holds action in `pending_doc_release` state; cannot close without D7 release |
| FM-03 | MBR revised without QP co-sign (J1) | BD-4 bypass attempt | BD-4 audit log | Hard API block; no alternative path to MBR release without QP e-sig |
| FM-04 | Document released with incorrect approval chain | DCC system misconfiguration | Approval chain audit; regulatory inspection finding | Document class approval chain is configuration-controlled; change requires QA Director |
| FM-05 | Effectivity gate not firing after release | System integration failure; job queue issue | Effectivity propagation latency KPI; monitoring alert | Propagation job has retry with dead-letter queue; alert if propagation > 10 minutes |
| FM-06 | Training not assigned for released safety-critical WI | Training cascade misconfigured for document | Training cascade completeness audit | Training cascade configuration is auditable; alert if zero assignments created for WI class |
| FM-07 | Periodic review skipped | Workload; reminder not actioned | Stale document rate KPI | System escalates to QA Director if review not initiated 30 days past due date |
| FM-08 | ITAR-marked document emailed externally (J3) | User error; DLP not in place | Security audit; DLP alert | Document export blocked in portal; ITAR marking visible; DLP policy on email |
| FM-09 | Concession document expires before shipment completed | Expiry alert not actioned | Concession expiry monitor | D5/D1 shipping gate checks concession validity; alert 7 days before expiry |
| FM-10 | Cross-reference chain broken after obsolescence | Obsoleted document still referenced | Cross-reference integrity KPI | Pre-obsolescence check: system warns of active cross-references before allowing obsolete transition |
| FM-11 | BD-4 signed by person without authority | Incorrect role assignment | BD-4 log audit; role review | Role-based access control enforced; BD-4 signatory role list reviewed quarterly |

---

*Decision phrase: S2-10_D6_D7_DEEP_UPGRADE_COMPLETE*
