# D13 — Audit to Remediate

```
workflow_id:    D13
workflow_name:  Audit to Remediate
domain_primary: Quality Improvement (Audit Management)
domains_cross:  All domains — audit scope spans all operations
state_machine:  SM-12
trigger_count:  17
branch_count:   14
edge_case_count:11
kpi_count:      13
failure_mode_count: 13
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-12
ai_advisory:    AI-14 AI-31
version:        V10-deep
```

---

## §1 Purpose and Scope

The Audit to Remediate (A2R) workflow governs the full lifecycle of every
audit event — from trigger through planning, execution, finding classification,
corrective action, effectiveness verification, and formal closure. It applies
to internal QMS audits, supplier audits (C3), regulatory inspections (FDA,
EMA, ISO NB, NADCAP, IATF), customer audits, and assurance reviews including
SOC 2 and privacy/data protection assessments.

D13 owns SM-12 (Audit Finding State Machine) and the audit planning calendar.
Its output feeds D6 (NC to CAPA) for any finding classified Major or Critical,
and D7 (Document to Release) for corrective actions requiring procedure changes.

Standards aligned: ISO 19011 (audit guidelines), IATF 16949 §9.2.2 (product
audit + process audit), ISO 13485 §8.2.4, AS9100D §9.2, 21 CFR 211.180(e),
EU GMP Chapter 9 (self-inspection).

---

## §2 Audit Type Taxonomy

| Type Code | Audit Type | Standard Reference |
|-----------|-----------|-------------------|
| INT-QMS | Internal QMS system audit | ISO 9001 §9.2; ISO 13485 §8.2.4 |
| INT-PROC | Internal process audit | IATF 16949 §9.2.2; AS9100D §9.2 |
| INT-PROD | Internal product/lot audit | IATF 16949 §9.2.2 |
| INT-DATA | Internal data integrity audit | FDA Guidance 2018; Annex 11 |
| SUP | Supplier audit | ISO 9001 §8.4; IATF 16949 §8.4.2 |
| CUST | Customer audit (inbound) | Customer CSR |
| REG-FDA | FDA inspection (CDER, CDRH, ORA) | 21 CFR 211; 21 CFR 820 |
| REG-EMA | EMA/national CA inspection | EU GMP; EU MDR |
| REG-CB | Certification body (ISO NB) surveillance | ISO 9001/13485/45001 |
| NADCAP | NADCAP commodity audit | NADCAP program |
| IATF | IATF 16949 third-party surveillance | IATF 16949 |
| AS | AS9100D third-party surveillance | AS9100D |
| SOC2 | SOC 2 Type II readiness + assessment | AICPA TSC |
| PRIV | Privacy / data protection audit | GDPR Art. 35; ISO 27701 |
| SEC | Cybersecurity / penetration test | NIST CSF; ISO 27001 |
| SUBPROC | Sub-processor audit (GDPR-linked) | GDPR Art. 28 |
| DRILL | Readiness drill / mock audit | Internal; per pack |

---

## §3 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | Annual QMS audit plan schedule | Audit calendar engine |
| T-02 | CAPA effectiveness follow-up: scheduled re-audit | D6 effectiveness review |
| T-03 | Customer audit request (inbound) | Customer notification |
| T-04 | Regulatory inspection notification (FDA, EMA, NB) | Regulatory affairs inbox |
| T-05 | Certification surveillance audit: certification body scheduled visit | CB calendar |
| T-06 | NADCAP audit: Nadcap scheduled commodity audit | NADCAP portal |
| T-07 | IATF 16949 third-party surveillance | Certification body |
| T-08 | AS9100D third-party surveillance | Certification body |
| T-09 | SOC 2 readiness assessment triggered | IT / CISO |
| T-10 | Privacy DPIA (Data Protection Impact Assessment) trigger | Legal / DPO |
| T-11 | Sub-processor audit: GDPR Art. 28 due-diligence | Legal / Procurement |
| T-12 | Security / pen-test cycle | CISO / IT |
| T-13 | Supplier audit: ASL maintenance; new supplier qualification | C3 supplier quality |
| T-14 | Product audit: customer return rate spike | D12 complaint trigger |
| T-15 | Data integrity audit: anomaly detected in electronic records | IT / QA |
| T-16 | Readiness drill: mock FDA/EMA inspection | QA Manager annual plan |
| T-17 | Management review action: audit scope requested by management | Annual review |

---

## §4 Severity Taxonomy

| Level | Code | Criteria |
|-------|------|---------|
| Critical | CRIT | Direct patient/consumer safety risk; regulatory non-compliance that could lead to enforcement action; data integrity breach; product release without proper authorization |
| Major | MAJ | Significant departure from QMS requirements; systemic non-conformance; potential risk of non-conforming product release; repeat minor findings from previous audit |
| Minor | MIN | Isolated deviation; no systemic risk; no product safety impact |
| Observation | OBS | Potential for improvement; not currently non-conforming |
| Best Practice | BP | Practice of note for knowledge sharing; exceeds requirements |

AI-14 (Finding Severity Intelligence): at finding classification step, AI-14
compares the finding description to historical findings database and suggests
severity classification with confidence score. Classification remains with
lead auditor; AI suggestion is informational.

---

## §5 State Machine — SM-12 Audit Finding

### States

| State | Meaning |
|-------|---------|
| `planned` | Audit scheduled; audit plan under preparation |
| `in_progress` | Audit actively executing; findings being recorded |
| `draft_report` | Audit execution complete; report being drafted |
| `findings_issued` | Formal findings transmitted to auditee; response period open |
| `response_received` | Auditee submitted corrective action response |
| `effectiveness_pending` | Corrective actions complete; effectiveness verification pending |
| `bd_approval_pending` | BD-12 gate: audit close requires Quality Director e-sig |
| `closed` | All findings resolved; audit formally closed |
| `surveillance_due` | Closed audit with scheduled follow-up/re-audit |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `planned` | Audit execution begins | `audit_date reached ∧ lead_auditor_assigned` | `in_progress` | Lead Auditor |
| `in_progress` | All audit activities complete | `all_checklist_items_completed = true` | `draft_report` | Lead Auditor |
| `draft_report` | Report approved by audit program manager | `report_approved = true` | `findings_issued` | Audit Program Manager |
| `findings_issued` | Auditee submits corrective action plan | `cap_submitted_date ≤ response_due_date` | `response_received` | Auditee QA Manager |
| `findings_issued` | Response deadline missed | `cap_submitted_date > response_due_date` | `findings_issued` (overdue flag) | System |
| `response_received` | Corrective actions verified complete | `all_actions.status = COMPLETE ∧ evidence_verified` | `effectiveness_pending` | Lead Auditor |
| `effectiveness_pending` | Effectiveness verification complete | `effectiveness_checks_pass = true` | `bd_approval_pending` | Auditor |
| `bd_approval_pending` | BD-12 Quality Director e-sig obtained | `quality_director_esig = true` | `closed` | Quality Director |
| `closed` | Follow-up surveillance scheduled | `surveillance_required = true` | `surveillance_due` | Audit Planner |

---

## §6 Audit Lifecycle — P0 to P13

### P0 — Trigger

Audit event created from annual audit plan, CAPA follow-up requirement,
or ad-hoc trigger. `audit_event` record: `audit_type`, `scope_statement`,
`scheduled_date_start`, `scheduled_date_end`, `facility_id`,
`audit_lead_id`, `standard_reference[]`.

For regulatory inspections (T-04): notification received date recorded;
preparation readiness drill initiated within 24 hours.

### P1 — Onboarding

Lead auditor and audit team assembled. Team composition:
- Lead auditor with required qualification (`auditor_certification` skill)
- Technical experts as needed (process SMEs, QA, regulatory)
- For IATF/AS/NADCAP: certification body assigns lead auditor externally

Conflict of interest check: auditors cannot audit their own work areas.
`auditor_conflict_check` query: auditor assignments vs. process ownership.

### P2 — Audit Planning

Audit plan document (D7-controlled) created:
- Scope: processes, departments, locations, product lines in scope
- Criteria: applicable standards, QMS procedures, regulatory requirements
- Audit agenda: schedule of process reviews, document reviews, interviews,
  physical observations, sampling points
- Sampling plan: for product audits — lot selection, sample size
- Prior findings: all open findings from previous audit of same scope reviewed
  and included in checklist

### P3 — Document Review

Pre-audit document review: lead auditor reviews:
- Procedures relevant to audit scope (current revision from D7)
- Previous audit reports (internal + external)
- Open CAPA records in the audit scope
- Regulatory correspondence (if regulatory audit)
- OQC and IQC records trends

Document review findings (if any): documented as P3 observations; may
generate pre-audit questions. AI-31 (Audit Pack Drafting) can assist in
generating preliminary question set from document review results.

### P4 — Opening Meeting

Opening meeting with auditee management:
- Audit scope, objectives, and criteria confirmed
- Confidentiality requirements agreed
- Logistics confirmed (interview schedule, areas accessible)
- `opening_meeting_record` signed by lead auditor and auditee senior manager

### P5 — Audit Execution

Lead auditor and team conduct:
- **Process interviews**: structured interviews with process owners and operators
- **Record reviews**: sample of quality records, batch records, training records,
  calibration logs, NCR/CAPA records
- **Physical observation**: shop floor walk-through; GMP area inspection;
  equipment status; housekeeping
- **System demonstrations**: for data integrity audits — electronic system
  audit trail review; access control verification; backup/recovery test

Each audit observation recorded as `audit_observation`:
`observation_id`, `audit_event_id`, `process_area`, `clause_reference`,
`observation_text`, `evidence_description`, `potential_finding_severity`,
`auditor_id`, `recorded_at`.

AI-14 assists at observation entry: compares observation to standard clause
requirements; suggests preliminary severity rating; flags similar historical findings.

### P6 — Daily Debrief

At end of each audit day, lead auditor briefs auditee management on:
- Observations gathered (without final classification)
- Clarifications needed
- Access requests for following day

Debrief notes recorded; auditee can provide immediate clarification that
may change the finding classification before final report.

### P7 — Closing Meeting

Final audit findings presented to auditee management:
- Preliminary finding classifications
- Timeframes for corrective action response
- Certification recommendation (if certification audit)
- `closing_meeting_record` signed by lead auditor and senior manager

### P8 — Finding Classification

Lead auditor formally classifies all findings using the severity taxonomy.
Critical and Major findings trigger automatic D6 CAPA creation (via integration).
Finding classifications are final upon audit report issue.

Audit report contains:
- Audit program reference
- Scope, criteria, and dates
- Finding list (code, clause, description, evidence, classification)
- Observations
- Audit team composition
- Overall assessment / certificate recommendation

AI-31 assists in drafting finding descriptions for accuracy and regulatory-correct language.

### P9 — Corrective Action Response

Auditee submits corrective action plan (CAP) for all Critical and Major findings
within the required response timeline:
- Regulatory audits: typically 15 days (FDA 483 response); 30 days (EU CA)
- Certification audits: typically 30–60 days
- Internal audits: per finding classification SLA

CAP is reviewed by lead auditor:
- Addresses root cause (not just correction)
- Includes verification method
- Assigns responsible person and due date

If CAP inadequate: returned for revision with specific feedback.

### P10 — Corrective Action (D6 CAPA)

D6 CAPA workflow handles the corrective action execution for all Major and
Critical audit findings. D13 tracks CAPA references and monitors progress
from the audit perspective.

For FDA 483 Observations (J1): FDA expects a written response to the 483
within 15 working days. The response describes corrective actions taken and
planned. `fda_483_response_record` tracks: observation number, response text,
implementation date, documentation references.

### P11 — Effectiveness Verification

Lead auditor or designated reviewer verifies corrective action effectiveness:
- Evidence reviewed against each CAP commitment
- For Critical/Major: on-site verification re-audit (remote or in-person)
- Effectiveness period: typically 60–90 days post-action completion

### P12 — BD-12 Closure

**BD-12**: No audit may be formally closed with outstanding Major or Critical
findings without Quality Director e-signature confirming all findings
adequately addressed.

API: `POST /api/v1/audits/{id}/close` → 403 if any Major/Critical finding
lacks `effectiveness_verified = true` or if QA Director e-sig absent.

Upon closure:
1. `audit_event.status = closed`; `closed_date` recorded
2. Certification status updated (if certification audit)
3. Supplier scorecard updated (if supplier audit)
4. All CAPA links confirmed closed or explicitly accepted as long-cycle

### P13 — Surveillance and Re-Audit

For certification audits: surveillance schedule set per standard requirements
(ISO 9001: annual surveillance; NADCAP: 12–18 month cycle; IATF: annual).
For internal audits: frequency adjusted based on risk and prior findings:
- Area with Critical finding: re-audit within 6 months
- Area with Major finding: re-audit at next scheduled cycle (≤ 12 months)
- Clean area: extended interval up to 36 months (risk-based per ISO 19011)

---

## §7 Per-Pack Overlays

### J1 Pharma
- **FDA 483 response**: upon receipt of FDA Form 483 (observations from inspection),
  a 483 response package is assembled within 15 working days. Each observation
  addressed with: immediate correction, root cause, CAPA, and verification
  date. The 483 response is a D7-controlled document requiring QA Director + QP review.
- **EMA cycle**: EU GMP compliance inspections by national competent authority.
  CAPA responses per EU GMP timing. Warning letters and license revocation risk
  if Critical findings not addressed.

### J2 Automotive
- **IATF 16949 product audit**: in addition to system audit, product audit
  verifies product characteristics against control plan at defined frequency.
  Findings feed CAPA and control plan updates.
- **Customer audit**: OEM customer audits (AIAG CQI-level) may occur; preparation
  uses internal audit results and corrective action evidence package.

### J3 Aerospace
- **NADCAP**: NADCAP Merit program — facilities with strong compliance history
  can qualify for extended audit intervals (18–24 months). Audit checklist
  per NADCAP commodity (AC7004 for heat treatment, AC7110 for NDT, etc.).
  CAPA response due within 30 days of finding; NADCAP technical representative
  reviews before acceptance.
- **AS9100D**: certification body surveillance with focus on customer
  satisfaction, product conformity, and operational risk management. Special
  emphasis on supplier control and configuration management.

### J4 Medical Device
- **Notified body (NB) audit**: for CE-marked devices, NB conducts annual
  surveillance and periodic full audit. QMS audit + unannounced audit option.
  Technical documentation review against current MDR requirements.
- **MDSAP**: Multi-jurisdiction Single Audit Program covers FDA, Health Canada,
  ANVISA, TGA, PMDA. Single audit replaces multiple country audits.

### J5 Food Safety
- **FDA food safety inspection**: for FSMA-regulated facilities, FDA CFSAN
  inspectors review HACCP plan, preventive controls, sanitation records,
  environmental monitoring, traceability records.
- **BRC/SQF certification audit**: annual third-party audit for retail supply
  requirements. Major/Critical findings may result in suspension of certification.

---

## §7 Branch Catalog

| Branch ID | Condition | Special Logic |
|-----------|----------|--------------|
| BR-D13-01 | Unannounced regulatory inspection | Immediate readiness drill activation; senior QA on-site within 30 minutes; legal counsel notified |
| BR-D13-02 | Critical finding (CRIT severity) | Automatic D6 CAPA of class A (30-day SLA); Quality Director notified within 2 hours; containment action initiated |
| BR-D13-03 | FDA 483 observation issued (J1) | 15-working-day clock starts; 483 response package assembled; QP + QA Director joint review required |
| BR-D13-04 | NADCAP finding (J3) | NADCAP portal CAP submission within 30 days; technical representative review before acceptance |
| BR-D13-05 | Notified body CRIT finding — CE mark at risk (J4) | Regulatory Affairs + Legal counsel immediate involvement; remediation plan to NB within 7 days |
| BR-D13-06 | IATF 16949 special status (J2) | OEM customer notified per CSR; customer recovery plan submitted; production hold possible |
| BR-D13-07 | Supplier audit finding (SUP type) | Supplier scorecard updated; supplier action plan requested; 8D corrective action per AIAG (J2) or equivalent |
| BR-D13-08 | Customer audit (inbound) | Evidence pack prepared (D7-controlled); prior internal audit findings reviewed and pre-addressed |
| BR-D13-09 | Multi-site audit scope | Coordinated audit plan across facilities; findings consolidated; cross-site CAPA for systemic issues |
| BR-D13-10 | Remote / documentary audit | Secure evidence sharing portal; remote interviews via video; audit trail for remote evidence review |
| BR-D13-11 | Data integrity audit (INT-DATA) | Electronic system access log review; audit trail integrity test; backup/recovery verification |
| BR-D13-12 | CAPA effectiveness re-audit | Prior CAPA evidence reviewed; repeat finding triggers CAPA class escalation (e.g., C → B) |
| BR-D13-13 | Mock audit (DRILL) | Scored against real audit criteria; debrief findings feed internal CAPA where score < 90 |
| BR-D13-14 | CAP response rejected by lead auditor | Written rejection with specific gaps identified; auditee has one revision cycle; escalation to audit program manager if second rejection |

---

## §7b Edge Case Catalog

| EC # | Edge Case | Handling |
|------|-----------|---------|
| EC-01 | Auditor becomes unavailable mid-audit | Backup auditor designate activated; continuity ensured via shared audit notes and agenda |
| EC-02 | Auditee refuses access to a process area | Lead auditor documents refusal as an observation; may constitute a Major finding; regulatory auditor notified |
| EC-03 | Finding classification dispute by auditee | Auditee may formally dispute within 5 days of report; audit program manager makes final determination |
| EC-04 | Evidence destroyed before audit | Audit observation recorded; if deliberate: Critical finding + potential regulatory notification |
| EC-05 | CAP due date falls during facility shutdown | Due date adjusted by QA Director with lead auditor agreement; extension documented with rationale |
| EC-06 | Regulatory inspector requests electronic system access | IT provides read-only access in controlled environment; DBA present; access logged |
| EC-07 | NADCAP technical representative rejects CAP twice (J3) | Escalated to NADCAP Merit auditor; facility may face interval reduction or suspension from commodity |
| EC-08 | Two overlapping external audits (e.g., NB + customer) | Joint audit program coordination; evidence pack shared where permissible; separate closing meetings |
| EC-09 | Whistleblower allegation surfaces during audit | Audit scope extended; separate confidential investigation track; Legal + HR involved |
| EC-10 | Audit finding references a batch already shipped | D12 complaint assessment initiated; D10 batch record reviewed; regulatory notification assessed |
| EC-11 | BD-12 signatory (Quality Director) unavailable | Designated alternate Quality Director per succession plan; succession designation is D7-controlled |

---

## §8 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-14 Finding Severity | Observation entry during execution (P5) | Suggested severity classification with rationale; comparison to historical similar findings |
| AI-31 Audit Pack Drafting | Document review (P3); report drafting (P8) | Question set generation from document review gaps; finding description drafting; regulatory-language suggestions |

---

## §9 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D13-01 | Audit Program Completion Rate | Audits completed per annual plan / total planned × 100 | ≥ 95% |
| KPI-D13-02 | Critical Finding Rate | Critical findings / total findings across all audits × 100 | ≤ 5% (alarm if rising) |
| KPI-D13-03 | CAP Response On-Time Rate | CAPs submitted before response due date / total CAPs × 100 | ≥ 95% |
| KPI-D13-04 | Finding Closure Cycle Time (Major) | Finding issued → effectiveness_verified (Major) | ≤ 90 days |
| KPI-D13-05 | Repeat Finding Rate | Findings with same clause/process as prior audit / total findings × 100 | ≤ 10% |
| KPI-D13-06 | BD-12 Approval Cycle Time | `bd_approval_pending → closed` | ≤ 5 business days |
| KPI-D13-07 | FDA 483 Response On-Time (J1) | 483 responses submitted within 15 working days / total 483s received × 100 | 100% |
| KPI-D13-08 | NADCAP Finding Closure Rate (J3) | NADCAP findings closed before commodity due date / total × 100 | 100% |
| KPI-D13-09 | Mock Audit Readiness Score | Simulation exercise scoring vs. real audit criteria | Track; target ≥ 90/100 |
| KPI-D13-10 | Supplier Audit Coverage | Tier-1 suppliers audited per plan / total Tier-1 × 100 | ≥ 100% per cycle |
| KPI-D13-11 | Auditor Qualification Currency | Certified auditors / total assigned lead auditors × 100 | 100% |
| KPI-D13-12 | CAPA Link Rate | Major/Critical findings with D6 CAPA linked / total M/C findings × 100 | 100% |
| KPI-D13-13 | Audit Evidence Completeness | Audit records with all mandatory documentation / total audits × 100 | 100% |

---

## §10 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Audit completed without unbiased auditor (self-audit) | Conflict of interest not checked | ISO 19011 §7.2.3 requirement; NB finding | Conflict check enforced at auditor assignment; RBAC blocks self-audit assignment |
| FM-02 | Critical finding not triggering CAPA | Auditor or QA Manager judgment that CAPA not needed | CAPA link rate KPI | Critical/Major finding auto-creates CAPA referral; QA Manager must explicitly reject with justification |
| FM-03 | 483 response missed 15-day deadline (J1) | Workload; complexity | FDA enforcement risk | Calendar alert T−5 days; T−2 days; auto-escalation to QA Director at T−2 |
| FM-04 | CAP accepted without addressing root cause | Lead auditor accepts correction without CAPA substance | Repeat finding rate; NB audit finding | CAP review checklist requires root cause statement; lead auditor trained on root cause evaluation |
| FM-05 | BD-12 signed before Critical findings closed | Process bypass; QA Director signs on summary not detail | BD-12 audit log | Hard API block: BD-12 e-sig endpoint validates no open Critical/Major finding before allowing signature |
| FM-06 | Audit plan not updated after process changes | Static plan; no trigger from D3/D7 | Process coverage gap | Process change in D3/D7 triggers audit plan review notification to audit planner |
| FM-07 | Finding severity underclassified under pressure | Auditee pressure during closing meeting | Repeat finding; regulatory escalation | Lead auditor independence protected by program; severity change after closing requires audit manager approval |
| FM-08 | NADCAP CAP rejected by technical representative (J3) | CAP content insufficient | NADCAP portal notification | NADCAP CAP preparation uses NADCAP SCMH guidance; QA review before submission |
| FM-09 | Audit evidence not exported for external audit | Audit pack export not triggered | External auditor request; gap | Audit pack export (per H3 §4) for regulatory and customer audits auto-generated on audit close |
| FM-10 | Mock audit not conducted annually | De-prioritized; resource constraint | QMS audit finding; regulatory observation | Calendar trigger; QA Director approval required to waive |
| FM-11 | Data integrity audit not covering all electronic systems | Scope definition too narrow | FDA data integrity warning letter | Annual data integrity audit scope covers all GxP electronic systems; system list maintained by IT |
| FM-12 | Supplier audit finding not updating supplier scorecard | Manual data entry gap | Scorecard inaccuracy; C3 audit | D13 finding classification for supplier audits auto-updates `supplier_scorecard_event` |
| FM-13 | Certification lost due to missed surveillance | Calendar missed; travel booking failure | CB notification of expired certificate | CB audit dates tracked in audit calendar; alert 60/30/14 days before; QA Director escalation |

---

*Decision phrase: S2-14_D13_D14_DEEP_UPGRADE_COMPLETE (partial — D13 complete)*
