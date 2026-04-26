# C7 — Quality Improvement (eQMS)

```
domain_code:    D-07
domain_name:    Quality Improvement (eQMS)
owner_role:     Quality Lead (with Document Control Lead, Compliance Lead)
primary_state_machines: SM-3 Inspection, SM-4 NC + CAPA + SCAR, SM-5 Document, SM-6 Release
```

This is the densest chapter in Part C. The Quality Improvement domain
is the heart of regulated trust. Every regulated industry — Pharma,
Medical Device, Automotive, Aerospace, Food — depends on this domain
operating correctly. This chapter is correspondingly thorough.

---

## 1. Purpose

The Quality Improvement domain owns the formal quality discipline.
Without this domain, HESEM cannot serve regulated customers; with it,
HESEM is auditable on demand. This domain answers: did the part meet
spec, what do we do when it doesn't, how do we prevent recurrence, how
do we govern controlled documents, who can release a batch, and how do
we prove the regulatory record.

---

## 2. The roots within this domain

```
Inspection (INSP)              The discrete record of a check that was
                                performed on a lot, an item, an in-process
                                unit, or a finished good. Includes
                                Incoming (IQC), In-Process (IPC), and
                                Outgoing (OQC) inspections.

Nonconformance Case (NQCASE)   The formal record that something failed
                                quality. Includes severity classification
                                (critical, major, minor, cosmetic), the
                                affected lot or part, the discoverer, the
                                discovery context.

Material Review Board Action   The formal disposition of held material —
   (MRB)                        a multi-party decision when standard
                                disposition is unclear (typically Quality
                                + Engineering + Production).

Corrective and Preventive       The formal program to address an NC and
   Action (CAPA)                prevent recurrence. Includes investigation,
                                root cause analysis, corrective action,
                                preventive action, effectiveness check.

Controlled Document (CDOC)     A version-controlled, approved, released
                                document that governs how work is
                                performed: SOPs, work instructions,
                                forms, specifications, drawings, training
                                materials.

Audit Finding                  Issues raised during internal or external
                                audits.

Risk Item                      Per ISO 14971 (medical device), the
                                analyzed risk in a product or process.

Customer Complaint            (Cross-reference to D-01); when a complaint
                                is regulated-reportable, this domain owns
                                the regulatory submission.

Annual Product Review          Pharma-specific (vertical pack).

Deviation                      Pharma-specific manufacturing deviation
                                (vertical pack).
```

---

## 3. The capabilities within this domain

### CAP-C7-01 — Inspection Planning and Execution

**Purpose.** Plan inspection activities (which lots, which check items,
which sampling plans) and capture inspection results.

**Lifecycle (per state machine SM-3).** Inspection scheduled (typically
on receipt or at end of operation). In-progress (inspector executes
plan). Completed. Dispositioned (accept, reject, rework, concession,
needs-MRB).

**Wave target.** L4 by W3; L5 by W3.

**Acceptance evidence.** AQL sampling plans applied correctly. Check
items per item revision. Disposition flows to lot status (CAP-C5-04
quarantine). Inspector eligibility verified (CAP-C10-04 training).

### CAP-C7-02 — Material Review Board (MRB)

**Purpose.** Multi-party decision-making for material with unclear
disposition (typically the borderline cases — slight tolerance excess,
visual defect of unknown impact, supplier-source issues).

**Lifecycle.** MRB case opened from inspection or NC. Multi-party
review (Quality + Engineering + Production minimum). Decision: accept
as-is, accept with concession, rework, reject. Recorded with
multi-signer e-signature.

**Wave target.** L4 by W3; L5 by W3.

### CAP-C7-03 — Nonconformance Case Lifecycle

**Purpose.** Formal record of every quality failure with full
investigation, disposition, and CAPA linkage.

**Lifecycle (per state machine SM-4).** Draft → open → in-investigation
→ in-disposition → dispositioned-{accept | concession | rework |
reject} → awaiting-CAPA → closed (or reopened).

**Coupling to other domains.**
- nqcase.open → lot.quarantine_state = quarantined (D-05)
- nqcase.dispose_reject → CAPA auto-create (D-07 internal)
- nqcase.dispose_concession → CDOC concession_required (D-07 internal)
- nqcase.dispose_rework → MWO rework_required (D-09)
- supplier-source NCs → SCAR candidate (D-04)

**Wave target.** Already at L4 (HMV4 Slice 2 baseline); L5 by W3.

**Acceptance evidence.** NC severity classification consistent. NC
trends visible. Critical NCs escalate per SLA. Lot quarantine flows.

### CAP-C7-04 — Corrective and Preventive Action (CAPA)

**Purpose.** Formal program to address an NC and prevent recurrence.

**Lifecycle (per state machine SM-4 CAPA).** Draft → open → investigation-
in-progress → root-cause-identified → corrective-action-in-progress →
effectiveness-check-pending → closed-effective (or reopened if
effectiveness check fails).

**Effectiveness check.**
- CAPA sets effectiveness_check_due_at = NOW + 90 days (configurable).
- During interval, system tracks recurrence of original defect mode.
- At due date: zero recurrence → effectiveness_check_pass; recurrence
  > threshold → effectiveness_check_fail (CAPA reopens).
- Owner signs off; independent QA reviewer co-signs (two-person e-sign
  for regulated).

**Wave target.** L4 by W3 (existing slice); L5 by W3.

**Acceptance evidence.** Effectiveness data automatically tracked. Two-
person e-sign captured for regulated industries. CAPA cycle time visible.

### CAP-C7-05 — Controlled Document Management

**Purpose.** Author, review, approve, release, supersede, withdraw
controlled documents per 21 CFR Part 11 / EU GMP Annex 11 / ISO 13485
§7.5.3 / IATF 16949 §7.5.3.

**Lifecycle (per state machine SM-5 CDOC).** Draft → in-review →
approved → released → superseded (or withdrawn).

**Coupling.** CDOC release triggers training assignment if applicable
(via SM-11 training). ECO release commits CDOC to released state.

**Wave target.** L4 by W3; L5 by W3.

**Acceptance evidence.** Released CDOCs immutable post-release. Version
history queryable. Training compliance tracked per CDOC.

### CAP-C7-06 — Engineering Change Order Workflow (cross-reference)

(See C2 CAP-C2-05; ECO is owned in Engineering and described there.
Listed here because it heavily affects CDOC.)

### CAP-C7-07 — Internal Audit Program

**Purpose.** Plan, conduct, and follow up on internal quality system
audits.

**Lifecycle.** Audit scheduled. Conducted. Findings raised. Findings
linked to CAPA. CAPA tracked through closure.

**Wave target.** L4 by W7; L5 by W7.

### CAP-C7-08 — Risk Management (per ISO 14971; med device)

**Purpose.** Maintain a risk file per product per ISO 14971. Risk
hazards, harms, risk controls, risk-benefit analysis. Updated based on
post-market surveillance data.

**Lifecycle.** Risk file authored at design. Updated through ECO.
Reviewed periodically. Updated when new failure modes or complaints
emerge.

**Wave target.** L0 currently; L4 by W10 (Med Device pack); L5 by W10.

### CAP-C7-09 — Annual Product Review (pharma)

**Purpose.** Per ICH Q7 §2.5 + 21 CFR 211.180(e), generate annual
product review per drug product, aggregating batch summaries, deviations,
complaints, stability data, etc.

**Lifecycle.** Period closes. APR generator runs. Quality reviews.
Approved. Filed.

**Wave target.** L0 currently; L7 by W10 (Pharma pack).

### CAP-C7-10 — Manufacturing Deviation (pharma)

**Purpose.** Capture deviations from approved manufacturing procedures.

**Lifecycle.** Deviation observed. Recorded. Investigated. Dispositioned.
May trigger CAPA.

**Wave target.** L0 currently; L7 by W10 (Pharma pack).

### CAP-C7-11 — Periodic Review

**Purpose.** Per Annex 11 §11, bi-annual minimum periodic review of
computerised systems including HESEM itself plus customer-managed
processes.

**Lifecycle.** Scheduled bi-annually (or per customer cadence).
Inputs collected automatically (risk register, validation freshness,
incidents, CAPA effectiveness, SLO compliance). Review meeting. Outputs:
CAPA actions, resource decisions, scope changes.

**Wave target.** L4 by W7; L5 by W7.

### CAP-C7-12 — Audit Pack Generation

**Purpose.** On demand, assemble a regulatory audit pack with full
evidence chain for an FDA / EMA / IATF / NADCAP / customer / SOC 2 /
ISO 27001 audit.

**Lifecycle.** Inspector identifies. Audit pack scope defined. Generator
runs. Pack assembled, signed, watermarked. Delivered within 24-hour SLA.

**Wave target.** L4 by W7 (general); L7 by W10 (per vertical pack).

---

## 4. Workflows

Primary in: D5 Inspect to Disposition, D6 NC to CAPA, D7 Document to
Release, D13 Audit to Remediate, D14 Validate to Qualify (in part).

Participant in: D2 Procurement to Pay, D8 Train to Qualify, D10 Batch
to Release, D12 Complaint to Recall.

---

## 5. APIs

```
- Inspection API
- Material Review Board API
- Nonconformance Case API
- CAPA API
- Controlled Document API
- ECO API (cross-reference C2)
- Audit Finding API
- Risk Item API (med device)
- Annual Product Review API (pharma)
- Deviation API (pharma)
- Periodic Review API
- Audit Pack Export API (long-running operation)
```

---

## 6. Frontend surfaces

```
- Inspection Workspace + Record Shell
- MRB Workspace + Record Shell
- NQCASE Workspace (existing HMV4 Slice) + Record Shell
- CAPA Workspace + Record Shell
- CDOC Workspace + Record Shell
- ECO Workspace + Record Shell
- Audit Finding Workspace
- Risk File Workspace (med device)
- APR Workspace (pharma)
- Deviation Workspace (pharma)
- Periodic Review Workspace
- Audit Pack Export Wizard (long-running)
- Quality Trend Dashboard (FPY, COPQ, CAPA effectiveness)
```

---

## 7. Cross-cutting concerns most relevant

ALL 12 concerns are highly relevant for this domain. Particular
emphasis:

- C1 Audit chain on every NC, CAPA, CDOC, ECO mutation
- C2 E-signature on every regulated transition (CAPA close, CDOC
  release, ECO approve, MRB disposition); two-person for regulated
- C8 Observability per workflow
- C10 Retention: NCs, CAPAs, CDOCs retained per regulatory class
  (typically 7+ years)
- C11 AI advisory: AI may suggest root cause candidates, similar prior
  cases, draft CAPAs — never autonomously close (BD-1 to BD-8 banned)

---

## 8. Wave assignments

```
Inspection             L4 W3; L5 W3
Material Review Board  L4 W3; L5 W3
Nonconformance Case    L4 W3 (current); L5 W3
CAPA                   L4 W3 (current); L5 W3
Controlled Document    L4 W3; L5 W3
ECO                    L4 W3; L5 W3 (cross-ref C2)
Audit Finding          L4 W7; L5 W7
Risk Item              L7 W10 (med device pack)
Annual Product Review  L7 W10 (pharma pack)
Deviation              L7 W10 (pharma pack)
Periodic Review        L4 W7; L5 W7
Audit Pack Export      L4 W7; L7 W10 (per pack)
```

---

## 9. Standards governing this domain

The full list per PART_A4. Headlines specifically applicable:

```
- 21 CFR Part 11 (e-records / e-signatures)
- 21 CFR Part 211 (drug GMP)
- 21 CFR Part 820 (med device QSR)
- 21 CFR Part 803 (med device reporting)
- 21 CFR Part 117 (food FSMA)
- EU GMP Annex 11 (computerised systems)
- EU GMP Annex 13 (investigational med products)
- EU GMP Annex 15 (qualification & validation)
- ICH Q7 (API GMP)
- ICH Q9 (quality risk management)
- ICH Q10 (pharmaceutical quality system)
- ISO 9001:2015 §8 + §10
- ISO 13485:2016 §8
- ISO 14971:2019 (risk management)
- IATF 16949 §10 (quality improvement)
- AS9100D §10
- AIAG-VDA FMEA Handbook 2019
- AIAG MSA 4th Edition
- AIAG SPC 2nd Edition
```

---

## 10. Boundary with adjacent domains

- D-01 Commercial: Customer complaints flow into NC and may trigger CAPA.
- D-02 Engineering: ECO and CDOC are heavily linked; Engineering owns
  authoritative item revisions; Quality reviews releases.
- D-04 Procurement: Supplier-source NCs trigger SCAR.
- D-05 Inventory: Quarantine flows from quality decisions.
- D-06 Production: SPC violations raise NCs; in-process inspections.
- D-08 Traceability: BREL release requires this domain's evidence chain.
- D-09 Maintenance: Calibration OOT triggers review of affected lots.
- D-10 Workforce: Training compliance for inspectors, approvers,
  signers.

---

## 11. Decision phrase

```
C7_QUALITY_IMPROVEMENT_BASELINE_LOCKED
NEXT: C8_TRACEABILITY_GENEALOGY.md
```
