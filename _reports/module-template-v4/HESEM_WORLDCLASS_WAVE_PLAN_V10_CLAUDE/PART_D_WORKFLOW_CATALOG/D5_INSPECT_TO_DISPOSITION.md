# D5 — Inspect to Disposition

```
workflow_id:    D5
workflow_name:  Inspect to Disposition
domain_primary: Quality Improvement
domains_cross:  Procurement & Supplier Quality, Inventory & Logistics,
                MES Execution, Planning & Production, Finance
state_machine:  SM-5
trigger_count:  15
branch_count:   13
edge_case_count:12
kpi_count:      11
failure_mode_count: 12
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-2 BD-7
ai_advisory:    AI-19 AI-20
version:        V10-deep
```

---

## §1 Purpose and Scope

The Inspect to Disposition (I2D) workflow governs the formal determination of
what action shall be taken on any material, product, or lot whose conformance
status is not straightforwardly ACCEPT. It receives referrals from D4 (Receive
to Inspect), D3 (Plan to Produce — in-process inspection), and field returns
(D1 / D12), and it resolves them through structured, multi-party decision
processes before any final inventory action is taken.

D5 owns the Disposition State Machine (SM-5) and the Material Review Board
(MRB) workflow. For simple binary outcomes (accept/reject), D5 may pass through
in a single-reviewer step. For complex dispositions requiring multi-party
concurrence (use-as-is, concession, deviation approval, rework authorization),
D5 enforces structured MRB with mandatory e-signatures and — for the banned
cases under BD-2 and BD-7 — committee quorum.

D5 does not own inspection execution (that is D4 and D3) and does not own the
corrective action process that may follow a rejection (that is D6). D5's output
is a recorded, authorized disposition decision that enables downstream inventory
action and feeds C7 for NC tracking.

---

## §2 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | Inspection record exists in `inspection_complete` or `disposition_pending` state | Referral validator |
| PC-2 | NCR (Non-Conformance Report) exists if disposition is anything other than ACCEPT | NCR existence check |
| PC-3 | For BD-2 (scrap): scrap quantity and dollar value recorded | BD-2 pre-calc |
| PC-4 | For BD-7 (use-as-is): proposed justification document attached to NCR | Justification check |
| PC-5 | MRB members quorum defined and members have active accounts with disposition authority | MRB configuration check |
| PC-6 | For pharma (J1): QP or authorized deputy available for batch-level disposition | J1 QP availability check |

---

## §3 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | IQC first-pass FAIL result referred for disposition | D4 Step 5 |
| T-02 | In-process inspection (IPQ) fail during WO execution | D3 Step 8; C6 MES |
| T-03 | Final inspection fail before WO completion | D3 Step 9 |
| T-04 | Customer RMA return disposition required | D1 return flow |
| T-05 | Finished goods quality hold: field complaint triggers batch recall assessment | D12 / C7 |
| T-06 | Use-as-is disposition request from Production Supervisor | Manual escalation |
| T-07 | Concession request: customer willing to accept non-conforming product | Customer-approved deviation |
| T-08 | Rework authorization request: production supervisor proposes rework | Manual escalation |
| T-09 | MRB escalation: QC Inspector cannot resolve unilaterally | D4 / D3 auto-escalation |
| T-10 | Environmental excursion: lot stored outside conditions (temperature breach in warehouse) | WMS environmental alert |
| T-11 | Shelf-life excursion: lot approaches or exceeds expiry in-stock | Expiry management (C5) |
| T-12 | Regulatory batch disposition (J1): batch release decision required | Batch manufacturing (D3/D10) |
| T-13 | PPAP sample disposition (J2): PPAP inspection result determination | PPAP process (J2) |
| T-14 | Counterfeit confirmation (J3): visual/test confirms counterfeit | D4 counterfeit branch |
| T-15 | Stability sample result OOS (J1): stability data out of specification | Stability program (J1) |

---

## §4 State Machine — SM-5 Disposition Record

### States

| State | Meaning |
|-------|---------|
| `referred` | Disposition case opened; material in quarantine hold |
| `mrb_convened` | MRB meeting scheduled or in progress; initial reviews underway |
| `mrb_review` | Technical evaluation by each MRB member in progress |
| `disposition_proposed` | Lead QC proposes disposition; awaiting e-signatures |
| `bd_approval_pending` | BD-2 or BD-7 committee quorum required; case blocked pending e-sigs |
| `disposition_approved` | All required e-signatures obtained; disposition authorized |
| `action_in_progress` | Physical action being executed (rework, RTV, scrap) |
| `action_complete` | Physical action confirmed; lot status updated |
| `closed` | Disposition case closed; inventory status finalized; NCR updated |
| `overridden` | Previously approved disposition revised; requires full re-sign |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `referred` | QC Inspector reviews and can decide | `disposition ∈ {ACCEPT, REJECT_SCRAP, REJECT_RTV}` ∧ `no_bd_trigger` | `disposition_proposed` | QC Inspector |
| `referred` | QC Inspector cannot decide unilaterally | `disposition = USE_AS_IS OR REWORK` OR `ncr_value > single_reviewer_threshold` | `mrb_convened` | System auto-escalate |
| `mrb_convened` | MRB members start reviews | `mrb_members_notified = true` | `mrb_review` | MRB System |
| `mrb_review` | All MRB members submit positions | `all_mrb_positions_recorded = true` | `disposition_proposed` | MRB Lead |
| `disposition_proposed` | No BD gate triggered | `bd_2_esig_required = false ∧ bd_7_esig_required = false` | `disposition_approved` | QC Manager e-sig |
| `disposition_proposed` | BD-2 or BD-7 gate triggered | `bd_2_esig_required OR bd_7_esig_required` | `bd_approval_pending` | System |
| `bd_approval_pending` | Committee quorum e-signatures obtained | `required_signatories_count = signed_count` | `disposition_approved` | Committee members |
| `bd_approval_pending` | Committee rejects proposed disposition | `committee_rejected = true` | `mrb_review` | Committee |
| `disposition_approved` | Physical action initiated | `action_started = true` | `action_in_progress` | Production / WH |
| `action_in_progress` | Action confirmed complete | `action_confirmed_by ≠ null` | `action_complete` | Supervisor |
| `action_complete` | Inventory update confirmed | `inventory_transaction_posted = true` | `closed` | WMS / System |
| `disposition_approved` | Revision request received | `revision_reason set` | `overridden` | QA Director |
| `overridden` | Re-review initiated | — | `mrb_convened` | QA Director |

---

## §5 Step Substance

### Step 1 — Disposition Case Opening

When D4 or D3 inspection generates a FAIL, CONDITIONAL, or USE_AS_IS referral,
a `disposition_case` record is created:

```
disposition_case:
  case_id (UUID)
  ncr_id (FK → nonconformance_report)
  inspection_record_id (FK → inspection_record)
  lot_id (FK → inventory_lot)
  item_id
  facility_id
  defect_description
  defect_class (CRITICAL | MAJOR | MINOR)
  quantity_affected
  estimated_material_value
  created_by
  created_at
  status = 'referred'
  bd_2_triggered (bool)
  bd_7_triggered (bool)
```

Defect class determines minimum disposition authority:
- MINOR: QC Inspector can decide independently
- MAJOR: QC Manager sign-off required
- CRITICAL: MRB mandatory; BD-2/BD-7 applies if scope met

### Step 2 — Quarantine Confirmation

Material must be in a designated `QUARANTINE` or `HOLD` WMS location before
disposition case opens. If material is found outside quarantine:
1. Immediate transfer-to-quarantine order issued (emergency hold)
2. `disposition_case.uncontrolled_release_flag = true` — elevated review
3. All affected downstream WOs with this lot checked; if any `in_progress`,
   WO suspended pending disposition

### Step 3 — MRB Technical Review

MRB members receive disposition case notification via the MRB work queue.
Standard MRB composition:
- QC Manager (chair)
- Engineering representative
- Production Supervisor
- Procurement representative (for incoming material cases)
- Customer representative (for concession cases — optional)
- Pack-specific representative: QP/RP for pharma (J1); Responsible Engineer
  for aerospace (J3); Regulatory Affairs for MD (J4)

Each member records:
- `mrb_position.member_id`
- `mrb_position.recommendation` ∈ {ACCEPT, REJECT_SCRAP, REJECT_RTV, REWORK,
  USE_AS_IS, CONCESSION, QUARANTINE_EXTEND, RETURN_TO_SUPPLIER}
- `mrb_position.technical_justification` (free text; required for USE_AS_IS)
- `mrb_position.submitted_at`

MRB Lead collects positions and selects consensus or majority disposition.
Dissenting positions are recorded; dissenter can request escalation to QA Director.

### Step 4 — Disposition Proposal and BD Gate Check

After MRB consensus, the system evaluates BD triggers:

**BD-2 trigger**: disposition = `REJECT_SCRAP` AND
`disposition_case.estimated_material_value > bd_2_value_threshold`
OR `quantity_affected > bd_2_qty_threshold`

Enforced at: `POST /api/v1/disposition/cases/{id}/approve`
Response if BD-2 not satisfied:
```json
{
  "type": "https://hesem.io/problems/banned-decision",
  "title": "Banned Decision Requires E-Signature",
  "status": 403,
  "detail": "BD-2: Scrap authorization for high-value non-conforming product requires Quality Director + Operations Director quorum e-signature.",
  "bd_code": "BD-2",
  "required_signatories": ["quality_director", "operations_director"],
  "current_signatures": []
}
```

**BD-7 trigger**: disposition = `USE_AS_IS` regardless of quantity or value.
No value threshold — any use-as-is disposition requires BD-7 committee:
- Quality Director e-signature
- Engineering Manager e-signature
- For pharma (J1): QP (Qualified Person) e-signature mandatory

Enforced at same endpoint; additional signatories required.

Both BD gates are checked in sequence; if both apply (use-as-is on high-value
lot), both quorums required.

### Step 5 — Disposition Execution

Upon approval, physical disposition action is assigned and tracked:

| Disposition | Physical Action | System Transaction |
|------------|----------------|-------------------|
| ACCEPT | Move lot from quarantine to target stock location | Inventory status `QUARANTINE → AVAILABLE`; lot released |
| REJECT_SCRAP | Transfer to scrap location; physically destroy material | Inventory write-off transaction; COGS-Scrap GL debit |
| REJECT_RTV | Pack and return to supplier; carrier arranged | RTV shipment record; D2 T-21 replacement PO |
| REWORK_IN_HOUSE | Rework WO created; lot re-processed | WO type = REWORK; lot re-enters D3/D5 cycle |
| REWORK_SUPPLIER | Material returned to supplier for rework | RTV record with rework type; GRN on return |
| USE_AS_IS | Lot released to stock with NCR deviation reference | Lot status = AVAILABLE with `deviation_ref` flag |
| CONCESSION | Customer concession document issued; lot shipped with concession | `concession_record` created; CDOC addendum generated |
| QUARANTINE_EXTEND | Additional tests required; hold extended | Inspection re-plan; SLA extension recorded |

### Step 6 — Concession Addendum (CDOC Cross-link)

When disposition = CONCESSION, the system automatically creates a
`concession_document` linked to the Document Control (C7 / CDOC) module:
- `concession_doc.ncr_id` → the non-conformance record
- `concession_doc.affected_lots[]` → all lot IDs covered by concession
- `concession_doc.customer_id` → customer granting concession
- `concession_doc.concession_description` → non-conformance detail and
  rationale for customer acceptance
- `concession_doc.quantity_covered`, `concession_doc.shipment_reference`
- `concession_doc.expiry_date` → concession is time-limited or quantity-limited
- `concession_doc.customer_signature_ref` → electronic or scanned customer sign-off

The concession document enters the CDOC workflow (D7) for numbering,
revision control, and retention per the QMS document retention policy.
Any shipment against a concession lot creates a `shipment_concession_link`
record for traceability.

### Step 7 — Inventory Update and NCR Closure

After physical action confirmed:
1. `inventory_lot.status` updated to final state
2. Lot traceability record updated with `disposition_outcome` and
   `disposition_case_id`
3. NCR record updated: `ncr.disposition = final_value`;
   `ncr.disposition_date`; `ncr.closed_by`
4. Supplier scorecard event updated (if incoming material)
5. COPQ cost recorded: `copq_event` with category (Internal/External Failure),
   cost element (scrap value, rework hours, RTV freight), and `ncr_id`
6. If disposition triggers CAPA review (CRITICAL defect or repeat defect):
   D6 NC-to-CAPA referral automatically created

---

## §6 Branch Catalog

| Branch ID | Condition | Special Logic |
|-----------|----------|--------------|
| BR-D5-01 | Simple accept | MINOR defect; QC Inspector authority | QC Inspector solo e-sig; no MRB |
| BR-D5-02 | Reject — scrap in-house | MAJOR/CRITICAL; below BD-2 threshold | QC Manager e-sig; scrap GL posting |
| BR-D5-03 | Reject — scrap with BD-2 | Scrap value > BD-2 threshold | Committee quorum (QualDir + OpsDir) before scrap authorization |
| BR-D5-04 | Reject — RTV | Supplier at fault; replacement feasible | RTV shipment + replacement PO (D2 T-21) |
| BR-D5-05 | Rework in-house | Correctable defect; rework cost < scrap cost | Rework WO; post-rework re-inspection required |
| BR-D5-06 | Rework by supplier | Defect caused by supplier process; special tooling required | RTV for rework; extended hold; re-inspect on return |
| BR-D5-07 | Use-as-is (BD-7) | Non-conformance within functional tolerance; cost/urgency justification | BD-7 quorum mandatory; concession or deviation doc created |
| BR-D5-08 | Customer concession | Customer accepts non-conforming product as-is | CDOC concession addendum; customer e-sign; traceability to shipment |
| BR-D5-09 | Partial disposition | Some units ACCEPT, some REJECT within same lot | Lot split transaction; separate disposition records per sub-lot |
| BR-D5-10 | Extended quarantine | Additional testing required before decision | Hold extended; SLA clock reset; reason documented |
| BR-D5-11 | Pharma batch rejection (J1) | QP batch rejection; entire batch to destruction | QP e-signature on rejection; batch destruction per GDP; regulatory notification if required |
| BR-D5-12 | Counterfeit confirmed (J3) | Test confirms counterfeit | Immediate quarantine; GIDEP alert filed; supplier removed from ASL; potential legal/DCSA notification |
| BR-D5-13 | Stability OOS (J1) | Stability result outside spec at scheduled time point | OOS investigation per FDA OOS guidance; potential market action assessment |

---

## §7 Edge Cases

| EC # | Scenario | Handling |
|------|---------|---------|
| EC-01 | MRB member unavailable during SLA window | Delegated approver system: each MRB role has a designated backup; escalation after 24 h if no action |
| EC-02 | Disposition approved but physical action not executable (e.g., scrap container full) | Action status remains `disposition_approved`; action postponed with reason; SLA extended per escalation policy |
| EC-03 | Lot partially consumed before NCR raised | Disposition covers remaining qty; traceability trace to consumed lot initiated; customer notification if already shipped |
| EC-04 | Rework fails re-inspection | Disposition re-opened; new MRB convened; max rework cycles enforced (BD-2 escalation if exceeded) |
| EC-05 | Customer concession expires before lot shipped | Concession must be renewed or lot re-dispositioned; system alert 7 days before expiry |
| EC-06 | BD-7 signatory unavailable (QP on leave — J1) | Designated QP deputy must be registered before this scenario occurs; no fallback: material stays on hold until QP or deputy available |
| EC-07 | Disposition committee overruled by regulatory inspector | Regulatory finding supersedes MRB; immediate quarantine; report to QA Director + regulatory affairs |
| EC-08 | Multi-lot disposition: single NCR covers multiple lot numbers | Disposition case covers `lot_ids[]`; each lot's inventory status updated individually; COPQ cost allocated per lot |
| EC-09 | Counterfeit lot partially shipped to customer (J3) | Emergency recall triggered (D12); GIDEP alert; customer notification; DCSA/DDTC notification as applicable |
| EC-10 | BD-2 threshold misconfigured (too high), allowing large scrap without committee | Configuration audit; all BD thresholds require QA Director + Finance Controller joint approval to change |
| EC-11 | Lot in rework WO when additional defect found | Rework WO suspended; new NCR raised covering rework-stage defect; disposition case stacked |
| EC-12 | Disposition decision reversed post-action | If material already shipped: field alert may be required; root cause investigation; CAPA; management notification |

---

## §8 BD-2 and BD-7 Enforcement Details

### BD-2 — Scrap Authorization for High-Value Non-Conforming Product

BD-2 is triggered when the proposed disposition is scrap AND:
`estimated_material_value > bd_2_value_threshold` (configurable by facility,
default set in `system_config.bd_2_value_threshold`)
OR `quantity_affected > bd_2_qty_threshold`

Required signatories (multi-party quorum, all must sign independently):
- Quality Director (or designated QA Manager with delegated BD-2 authority)
- Operations Director

E-signature enforcement:
```
POST /api/v1/disposition/cases/{case_id}/bd-approve
{
  "bd_code": "BD-2",
  "signatory_role": "quality_director",
  "esig_token": "...",
  "justification": "..."
}
```

Both signatories must sign before `disposition_approved` transition.
System records each e-sig with timestamp, IP, user agent, and
`esig_token` hash in `banned_decision_log`.

### BD-7 — Use-As-Is Disposition on Non-Conforming Material

BD-7 triggers on ANY use-as-is disposition regardless of value:

Required signatories:
- Quality Director (or QA Manager with BD-7 delegation)
- Engineering Manager
- J1 pack: additionally QP (Qualified Person) — non-delegable

Required documentation:
- Engineering justification: evidence that the non-conformance does not
  affect form, fit, function, safety, or regulatory compliance
- Risk assessment: failure mode analysis for proposed use-as-is
- Traceability: all lots receiving use-as-is disposition traceable in
  `disposition_case` with `bd_7_justification_doc_id`

Concession document automatically generated for every BD-7 approved case
(whether shipped to customer or used internally).

---

## §9 Per-Pack Overlays

### J1 Pharma
- **QP/RP disposition authority**: for batch-level disposition, the QP
  (EU GMP) or RP (Responsible Person) has sole authority to certify a batch
  for release or confirm rejection. No MRB can override QP batch rejection.
- **OOS Investigation**: any out-of-specification result from finished product
  testing triggers a mandatory FDA-guidance-compliant OOS investigation.
  Phase 1: laboratory investigation. Phase 2: full-scale investigation.
  Disposition cannot be finalized until OOS investigation complete.
- **GDP rejection**: lots rejected due to cold-chain excursion must be
  destroyed under GDP supervision; destruction records retained 5 years.

### J2 Automotive
- **PPAP disposition**: if PPAP sample inspection results do not meet all
  customer CTQ requirements, PPAP status = `REJECTED`; new PPAP run required.
  Interim approval may be granted by customer only; cannot be self-approved.
- **Customer-specific concession**: major automotive customers (OEMs) require
  concession submissions through their supplier portal (e.g., AIAG PPAP portal,
  customer-specific deviation form). System generates the concession data package.

### J3 Aerospace
- **Counterfeit disposition**: confirmed counterfeit parts must be physically
  mutilated to prevent re-entry into supply chain. Destruction witnessed and
  documented. GIDEP alert mandatory. DCSA/DDTC notification if ITAR item.
- **AS9100D non-conforming product control**: disposition record must reference
  the nonconformance notification to the customer and/or design authority when
  item deviates from design data. Customer approval required for disposition
  other than scrap.

### J4 Medical Device
- **DHF impact assessment**: for non-conforming device components, engineering
  must assess whether the non-conformance creates a design input/output
  discrepancy requiring a DHF revision and/or ECO.
- **Vigilance reporting**: if non-conformance is a field-returned device with
  potential serious injury link, Regulatory Affairs assesses vigilance
  reporting obligation (EU MDR Article 87; FDA MDR Part 803).

### J5 Food Safety
- **Food safety disposition authority**: disposition of non-conforming food
  items for human consumption requires PCQI (Preventive Controls Qualified
  Individual) sign-off. PCQI cannot be self-designated without FSPCA training.
- **Contaminated lot destruction**: if biological or chemical contamination
  confirmed, destruction under PCQI supervision; destruction record per FSMA
  requirements; potential FDA notification.

---

## §10 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-19 Inspection Intelligence | MRB review (Step 3) | Historical defect pattern on same item/supplier; probability of root cause; suggested disposition based on prior similar cases |
| AI-20 CAPA Recommendation | Disposition close (Step 7) | CAPA trigger recommendation with priority score; potential CAPA owner suggestion |

---

## §11 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D4 Receive to Inspect | D4 first-pass fail triggers D5 | D4 → D5 |
| D3 Plan to Produce | In-process inspection fail triggers D5 | D3 → D5 |
| D6 NC to CAPA | Critical/repeat disposition triggers D6 CAPA referral | D5 → D6 |
| D2 Procurement to Pay | RTV disposition triggers replacement PO (T-21) | D5 → D2 |
| D7 Document to Release | Concession document enters CDOC workflow | D5 → D7 |
| D10 Batch to Release | Pharma QP rejection blocks D10 batch release | D5 → D10 |
| D12 Complaint to Recall | Counterfeit/safety dispositions may trigger recall | D5 → D12 |
| C5 Inventory | Lot status final update; scrap/RTV inventory transactions | D5 → C5 |
| C7 Quality Improvement | NCR closure; COPQ recording | D5 → C7 |
| C11 Finance | Scrap cost; rework cost; RTV credit; COPQ GL posting | D5 → C11 |

---

## §12 KPIs and Metrics

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D5-01 | Disposition Cycle Time | `referred` → `closed` | MINOR ≤ 1 day; MAJOR ≤ 3 days; CRITICAL ≤ 5 days |
| KPI-D5-02 | MRB Convening Time | `mrb_convened` triggered → first member review submitted | ≤ 4 hours |
| KPI-D5-03 | BD-2 Average Approval Cycle Time | `bd_approval_pending` → `disposition_approved` | ≤ 24 hours |
| KPI-D5-04 | Use-As-Is Rate | Disposition = USE_AS_IS / total dispositions × 100 | ≤ 2% (flag chronic use-as-is as process failure) |
| KPI-D5-05 | Scrap Value Rate | Scrap disposition total value / total material received value × 100 | ≤ 0.5% |
| KPI-D5-06 | RTV Rate | RTV dispositions / total incoming dispositions × 100 | Track; measure supplier fault |
| KPI-D5-07 | Rework Success Rate | Post-rework PASS / total rework attempts × 100 | ≥ 90% |
| KPI-D5-08 | CAPA Trigger Rate from Disposition | Dispositions triggering D6 CAPA / total CRITICAL dispositions × 100 | 100% for CRITICAL |
| KPI-D5-09 | Concession Rate | Concessions issued / total non-conforming dispositions × 100 | ≤ 5% |
| KPI-D5-10 | COPQ Internal Failure Cost | Sum of scrap + rework cost in period | Track trend; target YoY reduction |
| KPI-D5-11 | BD-7 Approval Rate | BD-7 cases fully e-signed / BD-7 cases triggered × 100 | 100% (any unsigned = compliance finding) |

---

## §13 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Disposition case not opened for failed lot | QC Inspector bypasses NCR creation | Audit: failed inspection records without disposition case | System: inspection FAIL cannot close without disposition case creation |
| FM-02 | Non-conforming material escapes quarantine before disposition | Physical handling error; mislabeled lot | Physical audit; customer complaint | WMS location lock on quarantine lots; unauthorized movement alert |
| FM-03 | BD-7 signed without proper engineering justification | Social pressure; urgency | BD-7 log audit; QA Director review | System requires `justification_doc_id` before BD-7 e-sig unlock |
| FM-04 | MRB quorum not met; disposition proceeded with insufficient members | System misconfiguration; member bypass | MRB config audit | System enforces minimum member count; cannot proceed to `disposition_proposed` without quorum |
| FM-05 | Rework authorized repeatedly on chronic defect without CAPA | Process not connecting to corrective action | Rework rate KPI; CAPA trigger rate KPI | Auto-trigger D6 CAPA after n rework dispositions on same defect category |
| FM-06 | Concession not communicated to customer before shipment | Administrative delay | Concession status check in shipping | Shipping system block: lot with `concession_required = true` cannot ship without `concession_doc.customer_signed = true` |
| FM-07 | BD-2 threshold too high — large scrap approved without committee | Configuration error | BD-2 audit; COPQ cost spike | BD-2 threshold change requires dual approval; quarterly BD threshold review |
| FM-08 | QP not available for pharma batch rejection (J1) | Single QP coverage; no deputy | J1 G7 gate check; availability monitor | Mandatory designated QP deputy registered in system; alert if QP on leave without deputy |
| FM-09 | Counterfeit not mutilated before disposal (J3) | Disposal process shortcut | Destruction witness record | Mandatory witness e-sign on counterfeit destruction; photo evidence attached |
| FM-10 | Concession document expires; lot ships after expiry | Expiry alert missed | Concession expiry monitor | Auto-block on shipping: system checks concession validity date before shipping transaction |
| FM-11 | COPQ not recorded for rework/scrap | Cost entry skipped | COPQ completeness audit | Disposition closure requires `copq_event_id` for REWORK and SCRAP dispositions |
| FM-12 | Disposition reversed after lot shipped | Post-facto discovery of additional defect | Customer complaint; audit | Reversal requires QA Director + escalation; customer notification triggered; D12 recall assessment |

---

*Decision phrase: S2-09_D4_D5_DEEP_UPGRADE_COMPLETE*
