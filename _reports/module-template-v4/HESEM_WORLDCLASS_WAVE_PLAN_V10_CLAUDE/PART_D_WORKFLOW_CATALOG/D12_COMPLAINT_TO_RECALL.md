# D12 — Complaint to Recall

```
workflow_id:    D12
workflow_name:  Complaint to Recall
domain_primary: Quality Improvement (Post-Market)
domains_cross:  Commercial & Customer, Traceability, Finance,
                Regulatory Affairs, Planning & Production
state_machine:  SM-11
trigger_count:  20
branch_count:   16
edge_case_count:12
kpi_count:      14
failure_mode_count: 16
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-8 BD-15 BD-27
ai_advisory:    AI-20 AI-26 AI-28
version:        V10-deep
```

---

## §1 Purpose and Scope

The Complaint to Recall workflow manages the full lifecycle of a post-market
quality event — from initial complaint intake through investigation, regulatory
notification, and, where necessary, field corrective action up to and including
product recall. It is the highest-consequence workflow in the HESEM system
because its outputs directly affect patient safety (J1/J4), food safety (J5),
structural integrity (J3), and vehicle safety (J2).

D12 is the consumer of D11 traceability records (to identify recall scope via
OTG genealogy queries), a supplier of replacement production demand to D3 (recall
replacement lots), and a mandatory escalation path that can trigger D6 (CAPA)
and D7 (document changes) as part of field safety corrective actions.

BD-8 governs the recall initiation decision (any recall requires Quality Director
+ Regulatory Affairs joint e-signature). BD-15 governs EU MDR FSCA decisions.
BD-27 governs FSMA food recall decisions.

Standards aligned: 21 CFR Part 7 (recall), 21 CFR §803/806 (MD reporting),
EU MDR Article 87 (serious incident vigilance), EU MDR Article 83 (FSCA),
EU FMD §34, DSCSA §582(h), ICH E2B(R3) (adverse event reporting), FSMA RFR,
AS9100D §8.7, 21 CFR 314.81 (drug field alert).

---

## §2 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | Customer complaint: product defect reported by customer | Customer service / CRM |
| T-02 | Field failure: product failure in use reported by customer | Customer service / field engineer |
| T-03 | Customer RMA: returned product confirmed defective | D1 return processing |
| T-04 | Serious adverse event: patient/user injury or death linked to product (J1/J4) | Pharmacovigilance / medical affairs |
| T-05 | FDA MedWatch report received (J1/J4) | Regulatory inbox |
| T-06 | Regulatory inspection finding: inspector identifies field safety issue | D13 audit |
| T-07 | Internal investigation triggers field concern: CAPA reveals systemic issue with shipped product | D6 escalation |
| T-08 | Laboratory stability OOS results on released product (J1) | Stability program |
| T-09 | OOT calibration affecting released product quality measurements (D9) | D9 OOT cascade |
| T-10 | Supplier notification: supplier identifies defect in already-shipped raw material | Supplier quality (C3) |
| T-11 | Media / social media signal: adverse product reports | AI-26 sentiment monitoring |
| T-12 | Regulatory authority request: government recall request (FDA, EMA, BfArM, etc.) | Regulatory inbox |
| T-13 | Voluntary proactive recall: internal risk assessment triggers preemptive action | Internal decision |
| T-14 | DSCSA suspect / illegitimate product notification (J1) | Trading partner notification |
| T-15 | EU FMD unverified lot alert (J1): lot not decommissioned within threshold | D11 FMD monitoring |
| T-16 | Food illness outbreak linked to product (J5) | Health authority / FDA / CDC |
| T-17 | HACCP CCP batch retrospectively linked to limit breach (J5) | D6 CAPA; food safety team |
| T-18 | OEM vehicle recall triggers component recall notification (J2) | OEM PPAP recall cascade |
| T-19 | Airworthiness concern: operator reports in-service defect (J3) | FAA SDR; EASA DASOR |
| T-20 | Mock recall exercise trigger: annual planned mock recall | Quality Management calendar |

---

## §3 Step Substance

### Step 1 — Complaint Intake and Triage

Complaint intake records `complaint_record`:
- `complaint_source` ∈ {CUSTOMER, FIELD_ENGINEER, REGULATOR, INTERNAL,
  SOCIAL_MEDIA, PHARMACOVIGILANCE, HEALTH_AUTHORITY}
- `complaint_description`, `product_reference`, `lot_number` (if known),
  `complaint_date`, `event_date` (when failure occurred)
- `injury_flag`: bool — was there injury, death, or near-miss?
- `complaint_category`: PERFORMANCE, LABELING, PACKAGING, STERILITY, CONTAMINATION,
  COUNTERFEIT, ADVERSE_REACTION, DEVICE_MALFUNCTION, FOOD_SAFETY, OTHER
- `reporter_id` and `reporter_contact`

**Triage**: within 24 hours (48 hours for routine), complaint triage assigns:
- `severity_class` ∈ {SAFETY_CRITICAL, MAJOR, MINOR, INFORMATION_ONLY}
- `regulatory_reportable_flag` (requires regulatory affairs confirmation)
- `investigation_owner`

AI-26 Sentiment Monitor: for social media and customer communication streams,
AI-26 flags sentiment patterns and emerging adverse signal clusters for
proactive triage review. AI output is advisory — human triage decision required.

### Step 2 — Regulatory Notification Obligation Assessment

For each complaint, Regulatory Affairs assesses notification obligations with
mandatory deadlines:

| Pack | Regulatory Body | Trigger | Deadline |
|------|---------------|---------|---------|
| J1 FDA | FDA Field Alert Report (21 CFR 314.81) | Confirmed out-of-spec released drug | 3 days |
| J1 EMA/CA | EMA Rapid Alert | Drug defect with patient risk | 24 hours |
| J4 FDA | MDR (21 CFR 803) | Device malfunction with injury risk | 30 days (5 days if urgent) |
| J4 EU MDR | Art. 87 Serious Incident | Device serious incident | 15 days (2 days for death/serious injury) |
| J5 FDA | RFR (Reportable Food Registry) | Reasonable probability of serious adverse health consequence | 24 hours |
| J3 FAA | Service Difficulty Report (SDR) | Failure, malfunction, defect on aircraft article | 10 days |
| J2 OEM | Per OEM CSR | Defect affecting vehicle safety | Per OEM SLA (typically 24–48 h) |

The `regulatory_notification_record` tracks: authority, obligation, due date,
submission date, reference number. Overdue notifications are escalated immediately
to Quality Director and Regulatory Affairs VP.

System enforces deadlines with `regulatory_notification_alert` sent at:
- T − 48h: warning
- T − 24h: escalation to VP
- T − 2h: critical alert with audit record

### Step 3 — Investigation

Investigation follows the same structure as D6 CAPA investigation (§6) with
additional scope considerations for post-market products:

1. **Complaint traceability**: lot number resolved; OTG genealogy query run to
   identify all materials used in the affected lot
2. **Scope assessment**: how many lots share the same root cause? Which
   customers received those lots?
3. **Risk assessment**: probability of serious harm × severity of harm
   (per ISO 14971 for J4; per FDA risk analysis guidance for J1/J5)
4. **Distribution scope query**:
   ```sql
   SELECT sl.customer_id, sl.shipped_date, sl.quantity, sl.lot_id
   FROM shipment_line_item sl
   JOIN inventory_lot l ON sl.lot_id = l.lot_id
   WHERE l.item_id = :item_id
     AND sl.shipped_date BETWEEN :start_date AND :end_date
   ```
5. **Root cause preliminary findings**: documented within investigation SLA

Investigation cycle time SLA by severity:
- SAFETY_CRITICAL: investigation started ≤ 24 hours; preliminary findings ≤ 7 days
- MAJOR: investigation started ≤ 48 hours; findings ≤ 21 days
- MINOR: started ≤ 5 days; findings ≤ 45 days

### Step 4 — Field Action Classification

Based on investigation findings, the quality and regulatory team classifies the
required field action:

| Classification | Description | BD Gate |
|---------------|------------|---------|
| No Action Required | Defect not product-related or no risk | QA Manager sign-off |
| Customer Notification | Customers informed; no product return | QA Manager sign-off |
| FSCA (Field Safety Corrective Action) | Corrective action in the field; no recall | BD-15 (J4) |
| Voluntary Recall Class I (J1/J5) | Life-threatening or serious adverse health event | BD-8 |
| Voluntary Recall Class II (J1/J5) | Remote possibility of serious harm | BD-8 |
| Voluntary Recall Class III | Unlikely to cause harm but violates regulations | BD-8 |
| Regulatory-Requested Recall | Government authority mandates recall | BD-8 + immediate response |
| Market Withdrawal | Product removed for non-safety reasons | QA Manager sign-off |

### Step 5 — BD-8 Recall Initiation

**BD-8**: No recall (Class I, II, or III) may be initiated without Quality
Director AND Regulatory Affairs Director joint e-signature.

This prevents unilateral recall decisions (too slow, too broad, or too narrow)
and ensures regulatory strategy is coordinated with legal obligations.

API: `POST /api/v1/recalls/{id}/initiate`
```json
{
  "type": "https://hesem.io/problems/banned-decision",
  "status": 403,
  "bd_code": "BD-8",
  "detail": "BD-8: Recall initiation requires Quality Director and Regulatory Affairs Director e-signature.",
  "required_signatories": ["quality_director", "regulatory_affairs_director"],
  "signed_by": []
}
```

**BD-15** (J4 FSCA): Field Safety Corrective Action for medical devices requires
additionally PRRC e-signature (non-delegable per EU MDR Article 83).

**BD-27** (J5 Food Recall): Food recall additionally requires PCQI concurrence
on food safety risk classification before initiation.

### Step 6 — Recall Scope Identification

Recall scope is determined via the OTG genealogy query. Starting from the
defective lot as the root node, the system queries:

```sql
WITH RECURSIVE downstream(lot_id, depth, path, cycle_guard) AS (
  SELECT :root_lot_id, 0, ARRAY[:root_lot_id]::uuid[], false
  UNION ALL
  SELECT e.child_lot_id, d.depth + 1, d.path || e.child_lot_id,
         e.child_lot_id = ANY(d.path)
  FROM lot_genealogy_edge e
  JOIN downstream d ON e.parent_lot_id = d.lot_id
  WHERE NOT d.cycle_guard AND d.depth < 20
)
SELECT DISTINCT lot_id FROM downstream
```

From the expanded lot set, the system queries `shipment_line_item` to identify
all customers and quantities shipped. The result is the `recall_scope_record`:
- `recall_id`, `affected_lots[]`, `affected_item_ids[]`
- `total_units_in_field`
- `customers_affected[]` with: `customer_id`, `lots_received[]`, `qty_received`
- `units_in_stock` (not yet shipped — these are recalled from warehouse)

For J1 DSCSA: serial-level scope via EPCIS event history.
For J4 UDI: unit-level scope via `udi_record` shipment links.

### Step 7 — Recall Execution

**Recall Execution Console** (module F6):
Real-time dashboard showing recall status per customer per lot:

| Status | Meaning |
|--------|---------|
| `notified` | Customer notified; awaiting confirmation |
| `acknowledged` | Customer confirmed receipt of notification |
| `return_in_progress` | Customer returning product |
| `product_received` | Return received at facility |
| `product_destroyed` | Product destroyed per recall instructions |
| `closed` | Customer recall complete |

Execution steps per customer:
1. **Notification**: written notification (email/postal + phone) per 21 CFR 7.49
   within recall commitment timeline; includes lot numbers, description of defect,
   health hazard assessment, return instructions
2. **Customer acknowledgement tracking**: system tracks `notification_sent_date`,
   `acknowledgement_date`, `response_type`
3. **Returns processing**: returned product tracked via `recall_return_record`;
   lot received; disposition recorded (destruction, quarantine)
4. **Effectiveness check**: % of product returned / total product in field;
   regulatory agencies define effectiveness thresholds (FDA: 100% for Class I ideal)
5. **Regulatory progress reports**: FDA requires routine effectiveness check
   submissions; EU MDR requires periodic updates to competent authority

### Step 8 — Regulatory Close-Out

Upon recall effectiveness threshold met:
1. Final effectiveness report filed with regulatory authority
2. `recall_record.status → closed`
3. CAPA opened (if not already): root cause correction and preventive action
4. D3 recall replacement lot production triggered if needed
5. Lessons learned document created (D7)
6. Management review agenda item

---

## §4 SM-11 Recall State Machine

### States

| State | Meaning |
|-------|---------|
| `complaint_open` | Complaint received; triage in progress |
| `under_investigation` | Triage complete; investigation active |
| `regulatory_assessment` | Investigation findings reviewed; regulatory obligations assessed |
| `bd_approval_pending` | BD-8/BD-15/BD-27 gate: recall initiation requires quorum |
| `recall_active` | Recall initiated; execution console open; customers notified |
| `effectiveness_check` | Notified customers have responded; effectiveness measured |
| `recall_closed` | Effectiveness threshold met; regulatory close-out filed |
| `no_action_closed` | Investigation concluded no recall needed; complaint closed |
| `mock_recall` | Annual mock recall exercise in progress |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `complaint_open` | Triage complete | `severity_class set ∧ owner_assigned` | `under_investigation` | Complaint Manager |
| `under_investigation` | Investigation complete | `investigation_conclusion set` | `regulatory_assessment` | QA Manager |
| `regulatory_assessment` | No field action needed | `field_action = NONE ∧ qa_sign` | `no_action_closed` | QA Manager |
| `regulatory_assessment` | Recall recommended | `recall_class ∈ {I, II, III}` | `bd_approval_pending` | Regulatory Affairs |
| `bd_approval_pending` | BD-8 quorum obtained | `bd_8_esig_complete` | `recall_active` | QA Dir + RA Dir |
| `recall_active` | All customers notified | `all_customers_notified = true` | `effectiveness_check` | Recall Coordinator |
| `effectiveness_check` | Effectiveness threshold met | `effectiveness_pct ≥ threshold` | `recall_closed` | Regulatory Affairs |
| `effectiveness_check` | Effectiveness below threshold | `effectiveness_pct < threshold` | `recall_active` | Recall Coordinator |
| `complaint_open` | Mock recall initiated | `mock_recall_flag = true` | `mock_recall` | QA Manager |
| `mock_recall` | Mock recall exercise complete | `mock_recall_report_signed = true` | `no_action_closed` | QA Manager |

---

## §5 Mock Recall

Annual mock recall exercises simulate the full recall process without actual
product retrieval from customers. Required by: EU MDR (verification of recall
plan), FSMA (verification of food recall procedure), AS9100D §8.7.

**Mock recall protocol**:
1. QA Manager selects a representative lot (finished product or component)
   for simulation
2. OTG genealogy query run against the selected lot: downstream query
   identifies all customers who received the lot (or affected sub-lots)
3. System generates recall scope report: lot list, customer list, quantities
4. Team verifies: is all information accessible? Are contacts current?
5. Communication template reviewed: notification letter, return instructions
6. Simulated effectiveness calculation documented
7. `mock_recall_report` created with: duration of scope identification,
   completeness of contact data, gaps identified
8. Gaps trigger CAPA or corrective action (D6)

Mock recall target: scope identification in ≤ 2 hours; all customer contacts
verified within ≤ 4 hours.

---

## §6 Branch Catalog

| Branch ID | Condition | Special Logic |
|-----------|----------|--------------|
| BR-D12-01 | Complaint — no action (information only) | QA Manager closes with documented rationale |
| BR-D12-02 | Complaint with service replacement | D3 replacement WO; D11 replacement shipment |
| BR-D12-03 | Regulatory adverse event report (J1/J4) | Time-critical regulatory filing; template-based report |
| BR-D12-04 | Pharma Class I recall (J1) | Highest urgency; FDA notification within 24 h; press release coordination |
| BR-D12-05 | Pharma Class II recall (J1) | Health hazard evaluation; FDA notification within 3 days |
| BR-D12-06 | Pharma Class III recall (J1) | Regulatory violation; FDA notification within 5 days |
| BR-D12-07 | EU MDR FSCA (J4 — BD-15) | PRRC sign-off mandatory; competent authority notification; Field Safety Notice (FSN) to customers |
| BR-D12-08 | EU MDR Serious Incident report (J4) | Competent authority notification per Art. 87; EUDAMED PSUR update |
| BR-D12-09 | FSMA Reportable Food Registry (J5 — BD-27) | 24-hour RFR submission; FDA investigation coordination |
| BR-D12-10 | Food Class I recall (J5) | FDA coordination; health authority cooperation; press release |
| BR-D12-11 | Automotive OEM component recall cascade (J2) | OEM VIN-level recall mapping; customer-specific recall execution |
| BR-D12-12 | Aerospace airworthiness concern (J3) | FAA SDR filing; EASA DASOR; potential AD cascade; operator notification |
| BR-D12-13 | Counterfeit product in field (J3) | GIDEP alert; DCSA notification; customer urgent notification |
| BR-D12-14 | DSCSA suspect product / illegitimate product (J1) | §582(h) — product quarantine; FDA notification; trading partner notification within 24 h |
| BR-D12-15 | Stability OOS on released product (J1) | Recall scope = all lots from same campaign; QP assessment |
| BR-D12-16 | Mock recall exercise | Annual; not customer-facing; internal scope identification and process verification |

---

## §7 Edge Cases

| EC # | Scenario | Handling |
|------|---------|---------|
| EC-01 | Complaint lot number unknown | Traceability search by customer + date range + product; OTG reverse query from customer shipment records |
| EC-02 | Recall scope spans multiple items from common defective component | OTG upstream + downstream query from defective component lot; all finished items using that component in scope |
| EC-03 | Regulatory authority requests recall expansion beyond initial scope | Additional OTG query; BD-8 re-authorization if scope change is material |
| EC-04 | Customer refuses to return recalled product | Legal escalation; regulatory authority notification of non-compliant distributor; injection injunction consideration |
| EC-05 | Recall replacement lot needed urgently but production capacity constrained | Priority WO (T-14 in D3); BD-14 subcontract option evaluated; regulatory authority briefed on timeline |
| EC-06 | Mock recall identifies significant gap in contact data | CAPA triggered; contact data update project; next mock recall scheduled within 90 days to verify fix |
| EC-07 | OTG query times out for large-scale recall scope | Emergency database scaling; fallback to materialized view `mv_otg_genealogy_upstream`; engineering on call |
| EC-08 | Post-recall replacement lot also found defective | Second recall triggered immediately; regulatory authority notified of compounding recall |
| EC-09 | Social media recall signal before formal complaint (AI-26) | AI-26 alert triggers manual investigation; if substantiated, formal complaint opened; regulatory communications drafted |
| EC-10 | Regulatory authority recall request received without internal complaint | BD-8 process initiated immediately; scope identification starts concurrently with regulatory acknowledgement |
| EC-11 | RFR submission rejected by FDA (J5) | FDA returns for additional information; revised RFR within 24 h; regulatory affairs escalates |
| EC-12 | DSCSA serialized product: units in field cannot be verified (VRS failure) (J1) | Suspect product notification to all downstream trading partners; FDA notification per §582(h)(2); product quarantine instruction |

---

## §8 Per-Pack Overlays

### J1 Pharma
- **Pharmacovigilance integration**: adverse drug reaction reports from patients
  and healthcare providers are received via `icsr_record` (Individual Case Safety
  Reports per ICH E2B(R3)). ICH E2B XML transmission to FDA FAERS and EMA
  EudraVigilance. Aggregate data feeds PSUR (Periodic Safety Update Report).
- **DSCSA suspect/illegitimate product**: on receipt of trading partner
  notification or internal detection, product must be quarantined and FDA
  notified within 24 hours per §582(h)(2). System generates the `section_582h_notification`.
- **Stability-driven recall**: if annual stability testing reveals OOS result
  that was not predicted at release, risk-based decision on whether in-field
  product shelf life is impacted. QP assessment required.

### J2 Automotive
- **VIN-level recall mapping**: OEM vehicle recalls require mapping recalled
  component lots to specific vehicle identification numbers (VINs). HESEM
  provides lot-to-VIN mapping from `shipment_line_item` → OEM assembly records
  (via EDI integration). Field population identified by VIN list.
- **NHTSA coordination**: if automotive defect creates unreasonable safety risk,
  NHTSA notification and cooperation required. Recall campaign number assigned.
- **8D response to OEM**: OEM complaints require 8D format; D6 CAPA with
  8D structure triggered.

### J3 Aerospace
- **FAA SDR filing**: safety-relevant in-service failures filed in FAA Service
  Difficulty Reporting System within 10 days. SDR includes: aircraft registration,
  make/model, defect description, part number, serial number.
- **Airworthiness Directive cascade**: if HESEM-manufactured component triggers
  an AD, FAA issues AD referencing HESEM's Part Manufacturer Approval (PMA) or
  Technical Standard Order (TSO). HESEM coordinates compliance instructions.
- **GIDEP alert**: confirmed counterfeit or suspect counterfeit component in field
  → mandatory GIDEP hazard alert filing.

### J4 Medical Device
- **EU MDR Article 87**: any serious incident (device malfunction that led or
  could lead to serious deterioration of health) requires competent authority
  notification. Timelines: 2 days (death/serious injury), 10 days (immediate
  public health threat), 15 days (other serious incident).
- **EUDAMED update**: serious incidents and FSCAs logged in EUDAMED. PSUR
  updated annually with post-market surveillance data.
- **FSCA Field Safety Notice**: Field Safety Notice (FSN) distributed to
  customers. FSN template stored in D7; PRRC signs per BD-15.

### J5 Food Safety
- **RFR (Reportable Food Registry)**: 21 CFR §7.54 requires FDA notification
  within 24 hours via FDA's RFR system when there is reasonable probability
  of serious adverse health consequences.
- **FSMA §204 recall traceability**: the lot traceability records (CTEs/KDEs)
  from D11 power the recall scope identification; HESEM can provide FDA with
  the full forward trace within hours.
- **Mock recall**: at least annual mock recall exercises required under FSMA
  preventive controls. PCQI must participate in mock recall exercise.

---

## §9 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-20 CAPA Recommendation | Post-investigation CAPA trigger (Step 3) | CAPA priority score; probable systemic scope |
| AI-26 Complaint Sentiment | Complaint intake; social media monitoring (T-11) | Emerging signal clusters; sentiment deterioration alerts; early recall signal detection |
| AI-28 Customer Reply | Complaint acknowledgement and response | Suggested customer response text; regulatory-safe language review; translation for multinational recalls |

---

## §10 Regulatory Notification Deadlines Enforcement

The system enforces all regulatory notification deadlines with escalating alerts:

```
regulatory_notification_timeline:
  obligation_id, recall_id, complaint_id
  regulatory_body, notification_type
  obligation_triggered_at
  deadline_at (= obligation_triggered_at + deadline_hours)
  notified_at (null until submitted)
  status: PENDING | SUBMITTED | OVERDUE
```

Escalation sequence:
- T − 48h: email to Regulatory Affairs contact
- T − 24h: email + push notification to VP Regulatory Affairs + QA Director
- T − 2h: critical alert to C-suite; audit record
- T = 0 (overdue): `status = OVERDUE`; board-level incident record created

---

## §11 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D11 Release to Trace | Shipment traceability powers recall scope | D11 → D12 |
| D6 NC to CAPA | Post-investigation systemic CAPA triggered | D12 → D6 |
| D3 Plan to Produce | Recall replacement lot production triggered | D12 → D3 |
| D10 Batch to Release | Released lot recalled; lot.status → WITHDRAWN | D12 → D10 |
| D5 Inspect to Disposition | Returned recalled product disposition | D12 → D5 |
| D7 Document to Release | Recall plan document managed via D7; FSN document | D12 ↔ D7 |
| C8 Traceability | OTG genealogy query powers scope identification | C8 → D12 |
| C11 Finance | Recall cost accrual; product return credit notes | D12 → C11 |

---

## §12 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D12-01 | Complaint Triage Cycle Time | Complaint received → severity class assigned | ≤ 24 hours (CRITICAL); ≤ 48 hours (MAJOR) |
| KPI-D12-02 | Regulatory Notification On-Time Rate | Notifications submitted before deadline / total notifications × 100 | 100% |
| KPI-D12-03 | Recall Scope Identification Time | Recall decision → complete scope report | ≤ 2 hours |
| KPI-D12-04 | Recall Customer Notification Time | Scope identified → all customers notified | ≤ 24 hours (Class I); ≤ 72 hours (Class II) |
| KPI-D12-05 | Recall Effectiveness Rate | Product returned / product in field × 100 | 100% target (Class I); ≥ 90% (Class II) |
| KPI-D12-06 | Complaint Investigation Closure Rate | Complaints closed within SLA / total complaints × 100 | ≥ 90% |
| KPI-D12-07 | Mock Recall Scope Time (Annual) | Mock recall scope identification cycle time | ≤ 2 hours per exercise |
| KPI-D12-08 | CAPA Trigger Rate from Complaints | Complaints triggering D6 CAPA (SAFETY/SYSTEMIC) / total SAFETY complaints × 100 | 100% |
| KPI-D12-09 | Repeat Complaint Rate (Same Defect) | Complaints with same root cause as previously closed complaint / total × 100 | ≤ 5% (measures CAPA effectiveness) |
| KPI-D12-10 | RFR Submission On-Time Rate (J5) | RFR submitted within 24 h of obligation trigger / total RFR obligations × 100 | 100% |
| KPI-D12-11 | EU MDR Serious Incident Reporting Rate (J4) | Events reported within required timeline / total qualifying events × 100 | 100% |
| KPI-D12-12 | DSCSA Suspect Product Notification (J1) | § 582(h) notifications submitted within 24 h / total suspect product events × 100 | 100% |
| KPI-D12-13 | Customer Satisfaction After Complaint Resolution | Post-resolution customer satisfaction score | ≥ 4.0 / 5.0 |
| KPI-D12-14 | Recall Cost (Total) | Direct recall costs (logistics, destruction, replacement, regulatory) per recall event | Track; minimize through prevention |

---

## §13 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Regulatory notification missed deadline | Complexity of obligation tracking; manual process | Regulatory notification KPI; audit finding | System-enforced deadline tracking with automated escalation |
| FM-02 | Recall scope too narrow: some affected lots missed | OTG genealogy query incomplete; lot linkage gap | Subsequent customer complaint from "out-of-scope" lot | OTG completeness audit; regular genealogy link validation |
| FM-03 | Recall scope too broad: unaffected lots included | Conservative query without sufficient filtering | Customer over-notification; financial impact | Investigation-confirmed defect scope; risk-based scope definition |
| FM-04 | BD-8 signed without regulatory affairs review | Time pressure; process shortcut | BD-8 log audit | Hard API block: BD-8 requires both QA Director AND RA Director e-sigs |
| FM-05 | Mock recall not conducted annually | Workload; deprioritized | QMS audit finding | Calendar-driven auto-trigger; mock recall CAPA if not completed |
| FM-06 | Complaint not escalated to recall when safety threshold crossed | Underclassification; incomplete investigation | Regulatory inspection finding | Mandatory safety risk assessment template; threshold-based auto-escalation prompt |
| FM-07 | RFR not submitted within 24 hours (J5) | Regulatory team not notified of food safety event | Notification timeliness KPI | T-16 complaint automatically creates RFR obligation with 24-h deadline; escalation at T−2h |
| FM-08 | DSCSA suspect product notification delayed (J1) | Investigation not prioritized; DSCSA obligation unclear | Trading partner complaint; FDA inquiry | T-14 auto-creates 24-h regulatory obligation; Regulatory Affairs notified immediately |
| FM-09 | Recall replacement lot delayed: customer safety gap | Production capacity; materials shortage | D3 replacement WO status; customer safety exposure | D3 T-14 is URGENT priority; BD-14 subcontract option evaluated; regulatory briefed |
| FM-10 | Social media recall signal not actioned (AI-26 ignored) | AI alert not reviewed | Subsequent formal complaint spike; regulatory inquiry | AI-26 alerts routed to complaint manager dashboard; mandatory daily review |
| FM-11 | Customer contact data stale; notifications undelivered | Address/email not updated | Recall effectiveness KPI; returned mail | Annual contact verification; mock recall identifies stale contacts |
| FM-12 | PRRC not available for FSCA decision (J4 — BD-15) | Single PRRC coverage | BD-15 gate delays FSCA | Mandatory backup PRRC designation; available status tracked |
| FM-13 | Recalled product re-shipped to customer | D11 allocation not blocked after recall | Customer complaint; regulatory finding | `lot.status = RECALLED` blocks D11 goods issue immediately |
| FM-14 | Counterfeit confirmation not triggering GIDEP alert (J3) | CAPA action missed | GIDEP completeness audit | Counterfeit confirmation auto-creates GIDEP action item as mandatory step |
| FM-15 | Recall effectiveness report not filed with FDA | Post-recall workload | FDA inquiry; recall still technically open | Recall module tracks effectiveness reporting obligation; alert when threshold met |
| FM-16 | Adverse event not linked to product lot (traceability gap) | Lot number not captured in complaint | Root cause cannot be traced | Complaint intake requires lot number or batch reference; if unknown, traceability investigation initiated |

---

*Decision phrase: S2-13_D11_D12_DEEP_UPGRADE_COMPLETE*
