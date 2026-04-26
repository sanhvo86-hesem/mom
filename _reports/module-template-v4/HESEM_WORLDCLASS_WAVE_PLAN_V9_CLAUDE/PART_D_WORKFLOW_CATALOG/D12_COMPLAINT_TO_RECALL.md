# D12 — Complaint to Recall

```
workflow_id:    D12
workflow_name:  Complaint to Recall
owner_role:     Quality Lead with Regulatory Affairs Lead
participants:   Commercial Lead, Logistics Lead, Compliance Lead
```

---

## 1. Purpose

Complaint to Recall is the workflow from receiving a customer complaint
through investigation, resolution, and (when warranted) formal recall.
This workflow has both customer-success and regulatory dimensions.

---

## 2. Trigger

- Customer complaint received (any channel)
- Adverse event reported (med device, pharma)
- Trend analysis identifying recurring issue
- Field return with quality finding
- Regulatory inquiry from FDA / EMA / NB
- Internal discovery of latent quality issue

---

## 3. Actors

```
Customer (external)         Reports complaint
Customer Service Rep        Receives complaint, opens record
QA Engineer                 Investigates
QA Manager                  Reviews and approves response
Regulatory Affairs          Evaluates reportability, files reports
Pharmacovigilance          Manages safety reports (pharma)
Recall Coordinator         Manages recall execution
Quality Director           Approves recall classification
Logistics Lead              Coordinates returned material
```

---

## 4. Steps

### Step 1 — Complaint Receipt

Complaint arrives via any channel: customer portal, email, phone,
field-rep observation, social media, regulatory inquiry. Complaint
record created in HESEM.

### Step 2 — Triage

QA Engineer (or trained Customer Service Rep) triages:
- Severity (initial assessment)
- Category (quality, delivery, billing, documentation, safety)
- Affected products
- Affected customers / sites
- Urgency

### Step 3 — Reportability Evaluation

For regulated products:
- **Med Device (US)**: per 21 CFR Part 803, evaluate Medical Device
  Reporting (MDR) requirements. Death or serious injury suspected →
  MDR within 30 days; some malfunctions also reportable.
- **Pharma (US)**: per 21 CFR Part 314.80, MedWatch reportability for
  approved drugs.
- **EU Med Device**: per EU MDR Article 87, Manufacturer Incident
  Report (MIR).
- **Pharma (EU)**: ICH E2B(R3) ICSR submission via EVDAS.
- **Automotive**: per IATF 16949 §10.2, complaint resolution; some
  safety issues require NHTSA reporting.
- **Food**: per FSMA, Reportable Food Registry submission.

### Step 4 — Investigation

QA Engineer investigates:
- Pull genealogy via OTG (lot ID → upstream + downstream)
- Review production records
- Review inspection records
- Sample retest if available
- Review supplier batch (if supplier-source suspected)
- AI advisory may suggest similar prior complaints (CAP-C13-08)

### Step 5 — Root Cause Determination

Per investigation, root cause identified. Fed into D6 NC to CAPA if
quality root.

### Step 6 — Classification (Severity-Based)

Per regulator framework:

**FDA Recall Classifications**:
- **Class I**: Reasonable probability of serious adverse health
  consequences or death.
- **Class II**: Temporary or medically reversible adverse health
  consequences.
- **Class III**: Not likely to cause adverse health consequences.

**EU MDR**: Field Safety Corrective Action (FSCA) classification.

### Step 7 — Decision: Recall or Resolution Without Recall

Based on classification and risk assessment:
- **No recall** (most common): customer-specific resolution.
- **Voluntary recall**: manufacturer initiates.
- **Mandated recall**: regulator requires.

### Step 8 — Recall Execution (when applicable)

If recall:

**Step 8a — Regulator Notification**:
- FDA Class I: within 24 hours
- FDA Class II: within 3 days
- EU MDR FSCA: per Article 89

**Step 8b — Customer Notification**:
- Per recall scope (which lots, which serial ranges)
- Per genealogy traversal in OTG (D8 CAP-C8-01)
- Channels: email, EDI, customer portal, postal (high-stakes)

**Step 8c — Material Retrieval**:
- Customer returns affected material
- Logistics coordinates carrier and receipt
- Recovered material tracked through receipt back into HESEM

**Step 8d — Effectiveness Check**:
- Per recall plan, target % of affected material recovered
- Tracked over recall duration (often 30-180 days)

**Step 8e — Recall Closure**:
- Effectiveness threshold met → recall closes
- Final report to regulator
- CAPA opened to prevent recurrence (D6)

### Step 9 — Complaint Closure

Complaint record updated through:
- received → triaged → classified → investigation-in-progress →
  root-cause-identified → corrective-action-in-progress → resolved →
  closed.

### Step 10 — Pharmacovigilance (Pharma-Specific)

Per ICH E2B(R3), Individual Case Safety Reports (ICSRs) submitted to
regulators per timing requirements:
- 7-day expedited (US, life-threatening)
- 15-day expedited
- Periodic Safety Update Report (PSUR) / PADER

---

## 5. Decision points

```
DP1  Severity classification
DP2  Reportability per regulator
DP3  Root cause identified
DP4  Recall classification (I, II, III, FSCA)
DP5  Decision: recall or resolve without recall
DP6  Customer notification scope (genealogy traversal)
DP7  Effectiveness threshold per recall
DP8  Pharmacovigilance reporting timeline
```

---

## 6. Cross-domain footprint

This workflow is heavily cross-cutting:
- D-01 Commercial (complaint capture, customer comms, RMA)
- D-07 Quality (investigation, CAPA)
- D-08 Traceability (genealogy traversal for recall scope)
- D-04 Procurement (SCAR if supplier-source)
- D-11 Finance (refunds / credits / replacement)
- D-12 Integration (regulator submission, customer portal)

---

## 7. State machines

SM-12 Complaint and Recall (primary), SM-4 NC + CAPA, SM-2 Material.

---

## 8. Evidence captured

```
- Complaint record with intake details and audit trail
- Investigation evidence (data pulled, inspections, retests)
- Root cause determination
- Classification decision with rationale
- Regulator submission records (per regulator)
- Recall plan
- Customer notification records
- Material retrieval records
- Effectiveness check data
- Recall final report
- ICSR submissions (pharma)
- Linked NCs and CAPAs
- WORM storage permanent for regulated complaints
```

---

## 9. Regulatory considerations

```
- 21 CFR Part 803 (Med Device Reporting; US)
- EU MDR Article 87 (Manufacturer Incident Report)
- ICH E2B(R3) (Pharma ICSR)
- 21 CFR Part 7 (Recall guidance; FDA)
- 21 CFR Part 314.80 (MedWatch; pharma post-marketing)
- FSMA Section 423 (Reportable Food Registry)
- IATF 16949 §10.2 (Automotive customer complaint)
- AS9100D §10 (Aerospace customer feedback)
- ISO 9001:2015 §9.1.2 (Customer satisfaction)
- ISO 13485 §8.2.1 (Med device feedback)
```

---

## 10. Wave target

L4 by W7; L5 by W7. AI advisory NLP classification by W7. Vertical-pack
specifics (DSCSA recall, MDR, FSCA) by W10.

---

## 11. Failure modes

```
- Reportability missed:        regulatory consequence; CAPA + process
                                 improvement
- Genealogy incomplete:        recall scope uncertain; broader recall
                                 may be necessary
- Customer non-responsive:      enforcement per regulator (e.g., FDA
                                 mandatory recall)
- Effectiveness not met:        extended recall; possible escalation
- Adverse event unclear:        precautionary submission; follow-up
                                 reports as evidence emerges
```

---

## 12. Decision phrase

```
D12_COMPLAINT_TO_RECALL_BASELINE_LOCKED
NEXT: D13_AUDIT_TO_REMEDIATE.md
```
