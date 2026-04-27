# H6 — Periodic Review

```
chapter_purpose: scheduled review obligations that prove the system
                 stays in a validated state over time; explicit cadence,
                 input contracts, output contracts, escalation, KPIs
owner_role:      Quality Lead with Compliance Lead
sources:         EU GMP Annex 11 §11, ICH Q10 §3.2.4 management review,
                 ISO 9001 §9.3, IATF 16949 §9.3, ISO 13485 §5.6,
                 21 CFR 211.180(e) annual review of records,
                 SOC 2 TSC CC6.3 (access review),
                 SOC 2 TSC CC8.1 (change management),
                 FDA CSA 2022 (computerized system review cadence),
                 IATF 16949 §9.3.2 (management review inputs),
                 AS9100D §9.3, FSMA PCQA §117.310 (HACCP reassessment)
```

Periodic review is the disciplined re-examination of things that do not change
through everyday operation but accumulate drift: role definitions, access grants,
validation freshness, risk register entries, document effectivity dates, supplier
qualification status, model performance, and regulatory profile accuracy. Without
scheduled review, a system that was validated on day one silently becomes stale-
validated, and audits surface gaps that were latent for months or years.

HESEM implements periodic review as a structured pipeline: a nightly scheduler
identifies due reviews, pre-stages evidence inputs, assigns owners, tracks outputs
to downstream workflows, and anchors the review record permanently in the audit
chain.

---

## 1. Review type catalog

The following 25 review types are defined. The cadence values are floors; tenants
may impose stricter cadence through CSR ingestion (per H1 §7) or the tenant
regulatory profile (per H1 §5). All cadences are measured from the last completed
review of the same type.

```
NO.  TYPE                            CADENCE     SCOPE                            OWNER
──────────────────────────────────────────────────────────────────────────────────────────
R01  Computerised system review      semiannual  Per Annex 11 §11; per HESEM      Quality Lead
     (CSV)                           minimum     capability + tenant; validates
                                                  continued validated state
R02  Management review (QMS)         annual      ISO 9001 §9.3 / IATF §9.3 /      Quality Lead
                                     minimum     ISO 13485 §5.6; strategic QMS
                                                  effectiveness
R03  Validation freshness review     quarterly   Per H2 §13 freshness floors;      Validation Eng
                                                  GAMP 5 periodic review
R04  Access review — privileged       quarterly   Privileged accounts + shared      Security Lead
                                                  credentials; SOC 2 CC6.3
R05  Access review — standard         semiannual  All user × tenant × role          Security Lead
                                                  combinations; orphan accounts
R06  Risk register review             quarterly   Per H9; ICH Q9 / ISO 14971;       Quality Lead
                                                  open risk delta since last cycle
R07  Document effectivity review      annual      Every controlled document in       Compliance Lead
                                                  the DMS; effectivity dates;
                                                  next-review-due flags
R08  Supplier qualification review    annual      Every active external supplier;    Procurement Lead
                                                  incoming quality metrics;
                                                  IATF §7.4
R09  Training matrix review           semiannual  Per role × person × competency;    Workforce Lead
                                                  expiring qualifications;
                                                  role change delta
R10  SOP review                       per cycle   Per individual SOP frequency       Doc Owner
                                     (1–3 yr)    field; HACCP reassessment
                                                  annually (FSMA §117.310)
R11  Calibration review               monthly     Overdue + upcoming calibrations;   Maintenance Lead
                                                  drift trends; out-of-tolerance
                                                  events since last review
R12  KPI / SLO review                 monthly     Per M5 SLO directory;              Domain Lead
                                                  current value vs. target;
                                                  burn rate trends
R13  Customer complaint trend         monthly     Per vertical pack; vigilance        Quality Lead
     review                                       threshold proximity; root
                                                  cause pattern
R14  CAPA effectiveness review        monthly     Overdue + closed CAPA cycles;       Quality Lead
                                                  effectiveness evidence;
                                                  recurrence rate
R15  AI advisory KPI review           monthly     Acceptance rate; drift signals;     AI Lead
                                                  calibration performance;
                                                  override rate per EC-24
R16  AI red-team posture review       quarterly   Per L4 cadence; model card          Security + AI Lead
                                                  freshness; attack surface delta
R17  Incident learning review         monthly     SEV-1+ from prior calendar          SRE Lead
                                                  month; runbook coverage;
                                                  detection-to-response gaps
R18  Recall / vigilance trend         quarterly   Per vertical pack; adverse          Quality Lead
     review                                       event count and trajectory
R19  Cybersecurity posture review     quarterly   ISO 27001 / SOC 2; open vuln        Security Lead
                                                  age; SBOM delta; pentest
                                                  finding closure rate
R20  Privacy posture review           quarterly   GDPR / CCPA / PIPL; DPIA            Privacy Lead
                                                  currency; ROPA accuracy;
                                                  subject rights SLO compliance
R21  Tenant regulatory profile        annual      Per tenant; H1 §5; new clauses      Compliance Lead
     review                                       from horizon scan since last
                                                  cycle; CSR changes
R22  Product performance review       semiannual  Aggregate field performance         Quality Lead
                                                  data (field complaints, returns,
                                                  warranty, service calls); fed
                                                  to risk register and CAPA
R23  Regulatory inspection            annual      Simulated agency inspection         Compliance Lead
     readiness review                             readiness; evidence pack
                                                  completeness; outstanding
                                                  CAPA closure
R24  Third-party / sub-processor      annual      Active sub-processors per DPA;      Privacy + Compliance
     DPA review                                   contract alignment; GDPR Art 28
                                                  compliance; cloud provider
                                                  certifications
R25  Environmental health and          annual      EHS indicators, incident rates,     EHS Lead
     safety (EHS) review                           regulatory compliance status;
                                                  relevant for Aero / Pharma / MD
──────────────────────────────────────────────────────────────────────────────────────────
```

---

## 2. Per-review input contract

Each review type declares its required input evidence classes (per H4). The periodic-
review job pre-stages these automatically via the Evidence API (E8). A review cannot
be marked `in-progress` until all required input classes are available and resolved.
Missing inputs block the review and trigger an input-gap notification to the owner.

```
REVIEW     REQUIRED INPUT CLASSES (H4 evidence class references)
──────────────────────────────────────────────────────────────────────────────────────────
R01 CSV    EC-1 (current validation packs); EC-5 (telemetry / system health for
           period); EC-8 (transaction delta); EC-12 (audit anchors for period);
           EC-16 (change records effected since last review); EC-17 (incidents
           affecting validated capabilities); EC-22 (privileged access events)

R02 MGMT   EC-13 (NC trend for period); EC-14 (CAPA open + closed trend);
           EC-20 (complaint trend); EC-1 (PQ summary per capability);
           EC-7 (telemetry KPI aggregates); EC-22 (access stats);
           EC-15 (risk register delta)

R03 VAL    EC-1 grouped by capability with freshness_date;
           EC-5 (IQ/OQ evidence for capabilities under review);
           H2 §13 freshness floor table (policy input, not evidence class)

R04 ACC-P  EC-22 (privileged account activity log for period);
           current IAM grant snapshot; EC-2 (last e-sig per privileged role)

R05 ACC-S  Current grant snapshot (all users × tenants × roles);
           EC-22 (standard account activity for period);
           orphan account query output

R06 RISK   EC-15 (full risk register snapshot); EC-13 (NCs as risk drivers
           since last review); EC-17 (incidents as risk drivers);
           EC-23 (AI model risk status where applicable)

R07 DOC    EC-1 (all controlled docs with effectivity dates);
           next-review-due flags per doc; EC-16 (changes to docs in period)

R08 SUPP   EC-5 (supplier qualification certificates); EC-13 (supplier-
           attributed NCs); EC-18 (incoming inspection pass rate per supplier);
           supplier scorecard data; EC-33 (vulnerability advisories from
           software suppliers if applicable)

R09 TRN    EC-5 (training records per role × person matrix); expiring
           qualification dates; role change events for period; EC-11
           (training completion events per L-series AI training if applicable)

R10 SOP    EC-1 (SOP with next-review-due marker); EC-16 (changes to the
           SOP since last review); HACCP plan (EC-1 sub-type for food tenants)

R11 CAL    EC-5 (calibration certificates by asset); calibration_due
           schedule query; out-of-tolerance events since last review
           (EC-17 sub-type)

R12 KPI    M5 SLO directory; current KPI values per domain; trailing
           trend for configurable period (default 90 days)

R13 COMP   EC-20 (complaint records for period); vigilance threshold
           configuration; regulatory complaint rate benchmarks per pack

R14 CAPA   EC-14 (all open CAPAs with age); EC-14 (CAPAs closed in period
           with effectiveness evidence); recurrence-detection query

R15 AI-KPI EC-25 (advisory render records for period); EC-24 (override
           records); EC-23 (model card freshness); calibration test results
           per L3 §5; drift detection signals per L3 §6

R16 AI-RT  EC-11 (red-team exercise records per L4); EC-23 (model card
           status); EC-27 (pentest findings affecting AI endpoints);
           EC-33 (vuln advisories for AI dependencies)

R17 INC    EC-17 (SEV-1+ for prior month); runbook coverage query
           (which SEV types have runbook vs. ad-hoc response);
           detection-to-response time per EC-17

R18 REC    EC-21 (reportable events for period); vigilance report
           counts per pack; recall history per product family

R19 CYBER  EC-27 (pentest reports — currency + finding closure);
           EC-32 (SBOM delta since last review);
           EC-33 (open vulnerability advisories with age);
           ISO 27001 / SOC 2 certification status

R20 PRIV   EC-30 (ROPA current state); EC-31 (DPIA for active processing);
           subject rights request metrics (erasure SLO, portability SLO);
           EC-29 (deletion events for period confirming erasure execution)

R21 REG    H1 tenant regulatory profile; H1 horizon scan deltas since
           last review; CSR change notifications received; EC-16
           (changes triggered by prior regulatory profile review)

R22 PROD   EC-20 (field complaints per product family);
           EC-17 (product-related safety incidents);
           EC-13 (field NCs attributed to product);
           warranty return / service call data (EC-8 sub-type)

R23 INSP   H3 audit pack completeness check; EC-14 (CAPA closure rate);
           EC-1 (controlled doc completeness); EC-18 (latest inspection
           records); simulated agency-question checklist

R24 DPA    Active sub-processor list from DPA annex; EC-31 (DPIAs
           covering sub-processors); cloud provider SOC 2 / ISO 27001
           reports; contract expiry dates

R25 EHS    EHS incident records (EC-17 sub-type); regulatory compliance
           score per jurisdiction; near-miss reports; safety training
           completion per R09
──────────────────────────────────────────────────────────────────────────────────────────
```

---

## 3. Per-review output contract

Every review produces one or more structured outputs. Each output carries the
`review_id` as a traceability link so that downstream processes can trace back to
the review that generated them.

```
REVIEW     OUTPUTS AND DESTINATION
──────────────────────────────────────────────────────────────────────────────────────────
R01 CSV    → Change request (EC-16) if validated state drift found
           → Validation re-PQ trigger (H2 lifecycle) per capability
           → CAPA (EC-14) for systemic validation gap

R02 MGMT   → Strategic quality objectives update (EC-1 QMS policy)
           → CAPA for systemic issues (EC-14)
           → Risk register update (H9 / EC-15)
           → Training gap assignment (EC-5 / H9)

R03 VAL    → Validation re-PQ per capability (H2 lifecycle)
           → Change request for freshness SLA breach (H7)

R04 ACC-P  → Access revocation events (EC-22 outcome)
           → Privileged account rotation schedule update
           → CAPA for unexplained access patterns (EC-14)

R05 ACC-S  → Access revocation for orphaned / excess grants (EC-22)
           → Role definition update if needed (H7 CR)

R06 RISK   → Risk register updated records (EC-15)
           → CAPA for risk items above acceptance threshold (EC-14)
           → H7 CR if risk mitigation requires a system change

R07 DOC    → Doc revision requests routed to D7 lifecycle (EC-1 revs)
           → H7 CR for process-affecting doc changes
           → Training assignments for revised docs (EC-5)

R08 SUPP   → Supplier rating delta (C4 supplier root update)
           → CAPA for suppliers below threshold (EC-14)
           → Sourcing change request if supplier disqualified (H7)

R09 TRN    → Training assignments (D8 / EC-5)
           → Role definition update if competency matrix changed

R10 SOP    → Doc revision request to D7 (EC-1 revision)
           → H7 CR if SOP revision implies process change

R11 CAL    → Calibration work orders for overdue assets (D9 / EC-5)
           → Out-of-tolerance CAPA (EC-14)
           → H7 CR if calibration standard changes

R12 KPI    → SLO burn-rate alert to Domain Lead
           → CAPA for SLOs in sustained breach (EC-14)

R13 COMP   → CAPA for recurring complaint patterns (EC-14)
           → Vigilance report if threshold crossed (EC-21)

R14 CAPA   → Effectiveness confirmation event (EC-14)
           → Escalation to Quality Director for overdue items
           → H7 CR if CAPA requires system change

R15 AI-KPI → Model retirement trigger if drift threshold crossed (L3)
           → Override pattern review (EC-24 report)
           → H7 CR for model update if needed

R16 AI-RT  → Red-team exercise scheduled or confirmed (EC-11 / L4)
           → H7 CR for attack-surface remediation
           → Model card update trigger (EC-23)

R17 INC    → Runbook creation / update for uncovered SEV types
           → CAPA for detection gaps (EC-14)
           → H7 CR for detection / alerting improvement

R18 REC    → CAPA for recall risk trajectory (EC-14)
           → Regulatory notification if vigilance threshold crossed (EC-21)

R19 CYBER  → SBOM update trigger (EC-32)
           → Vuln remediation work item (EC-33)
           → H7 CR for security control change (Class A)
           → Pentest schedule confirmation (L4 / EC-27)

R20 PRIV   → DPIA update trigger (EC-31)
           → ROPA correction (EC-30)
           → H7 CR for privacy-affecting change
           → Data subject rights SLO breach report

R21 REG    → H1 tenant regulatory profile update (with H7 CR)
           → CAPA for compliance gaps found (EC-14)
           → Training assignment for new regulatory requirement

R22 PROD   → Risk register update for field performance trends (EC-15)
           → CAPA for product-attributed quality trends (EC-14)
           → Complaint record linkage to field events (EC-20)

R23 INSP   → Pre-inspection CAPA closure sprint prioritization
           → Evidence gap action items (owner + due date)

R24 DPA    → Sub-processor list update (DPA annex revision via H7)
           → DPIA update trigger for changed sub-processors (EC-31)

R25 EHS    → EHS corrective action (EC-14 sub-type)
           → Regulatory filing if reportable incident identified
──────────────────────────────────────────────────────────────────────────────────────────
```

---

## 4. Review record substance

Each completed review produces a `review_record` stored as an EC-5 evidence
artifact (review records are regulated documents with permanent retention). The
record schema:

```
review_record {
  review_id:             UUID                  # immutable; tenant-scoped
  review_type:           ENUM(R01..R25)
  review_version:        INTEGER               # increments on amendment
  tenant_id:             UUID
  period_start:          DATE                  # scope window
  period_end:            DATE
  conducted_at:          TIMESTAMPTZ           # actual review session date
  participants:          [{user_id, role,       # per RACI — Quality Lead
                           attended: bool}]      # always required
  inputs_referenced:     [{class: EC-n,         # resolvable via E8
                           record_id: UUID,
                           resolved_at: TIMESTAMPTZ}]
  input_gaps:            [{class: EC-n,         # inputs that were unavailable;
                           gap_reason: TEXT,     # review proceeded under waiver
                           waiver_id: UUID}]     # or was deferred until resolved
  findings:              [{finding_id: UUID,
                           description: TEXT,
                           severity: ENUM(CRITICAL,MAJOR,MINOR,OBS),
                           evidence_class: EC-n,
                           evidence_id: UUID}]
  decisions:             [{decision_id: UUID,
                           description: TEXT,
                           rationale: TEXT,
                           decision_by: user_id}]
  action_items:          [{item_id: UUID,
                           description: TEXT,
                           owner: user_id,
                           due_date: DATE,
                           output_type: TEXT,   # e.g., "H7_CR", "EC-14_CAPA"
                           output_id: UUID | null}]
  signoffs:              [{user_id, role,        # ≥ 2 for R01/R02/R06/R23;
                           signed_at: TIMESTAMPTZ,  # Quality Lead always required
                           e_sig_id: UUID}]
  signoff_quorum_met:    BOOLEAN
  next_review_due:       DATE                   # deterministic from cadence rule
  review_status:         ENUM(DRAFT, OPEN, IN_REVIEW, SIGNED, CLOSED, VOIDED)
  anchor_id:             UUID | null            # Merkle anchor reference
  amended_from:          UUID | null            # if this record amends a prior
  amendment_rationale:   TEXT | null
}
```

### 4.1 Quorum rules

| Review type     | Min signers | Required roles        |
|-----------------|-------------|----------------------|
| R01, R06, R23   | 2           | Quality Lead + one additional reviewer |
| R02             | 3           | Quality Lead + Domain Lead + Compliance Lead |
| R04, R05        | 2           | Security Lead + one domain owner |
| All others      | 1           | Owner per §1 |

A review record signed without meeting quorum is flagged
`signoff_quorum_met = false` and cannot be closed. The periodic-review job
treats it as still-open for escalation purposes.

### 4.2 Amendment after signoff

A signed review record is immutable (WORM-class, EC-5). If an error is
discovered post-signoff:
1. A new review_version is created with `amended_from` pointing to the original
2. The amendment is signed by the same quorum required for the original
3. The original record is not modified; it carries a `superseded_by` reference
4. The amendment event is anchored in the Merkle chain

---

## 5. Per-tenant cadence (per vertical pack)

The following deviations apply on top of the baseline cadences in §1:

```
PACK           REVIEW     DEVIATION                    AUTHORITY
──────────────────────────────────────────────────────────────────────────────
PHARMA         R01 CSV    Sterile manufacturing sites:  EU GMP Annex 11 §11
               (sterile)  minimum quarterly (not        common practice;
                          semiannual)                   FDA expectation
PHARMA         R02 MGMT   QP-led quality review every   ICH Q10 §3.2.4
                          quarter in addition to        (management review
                          annual management review      frequency per site
                                                        risk)
PHARMA         R10 SOP    Annual HACCP reassessment     FSMA §117.310
(FOOD applies              mandatory for food tenants
same rule)
MED DEVICE     R02 MGMT   ISO 13485 §5.6 management     ISO 13485:2016 §5.6
                          review at planned intervals;
                          risk file review triggered
                          per ISO 14971 cycle
MED DEVICE     R06 RISK   Linked to ISO 14971 §3        EU MDR Art 10(2)
                          review trigger; risk file      requiring continuous
                          reassessment at least          risk management
                          annually
AUTO (IATF)    R02 MGMT   IATF 16949 §9.3.2 requires    IATF 16949 §9.3
                          management review at           2016 Annex A
                          defined frequency; OEMs
                          expect quarterly CSR
                          conformance review
AUTO (IATF)    R08 SUPP   Supplier performance review   IATF 16949 §7.4.1
                          monthly for critical (C-class) + CSRs
                          suppliers
AERO           R02 MGMT   AS9100D §9.3 management       AS9100D:2016 §9.3
                          review annual; NADCAP
                          cycle review linked
AERO           R23 INSP   Pre-NADCAP audit readiness    NADCAP checklist
                          review 60 days before         requirements
                          audit date
CMMC / ITAR    R04 ACC-P  Monthly privileged access     CMMC Level 2+
                          review (not quarterly)        AC.2.006
CMMC / ITAR    R19 CYBER  Monthly (not quarterly)       CMMC Level 2+
                          cybersecurity posture         CA.2.157
──────────────────────────────────────────────────────────────────────────────
```

Per-tenant cadence deviations are stored in the tenant regulatory profile under
`periodic_review_overrides` as a JSON map of `{review_type: cadence_days}`.
The periodic-review scheduler reads this map at each scheduling cycle.

---

## 6. The periodic-review job (J1..J8)

The job runs on a nightly schedule (02:00 UTC by default; configurable per tenant
timezone). It operates across all tenants and all review types.

### J1 — Due date scan

Query `review_schedule` for all (tenant_id, review_type) combinations where
`next_review_due <= NOW() + advance_notice_window`. The advance notice window is
configurable per review type (defaults: `CRITICAL` reviews — 14 days; standard
reviews — 7 days). Outputs a prioritized list of due and upcoming reviews.

### J2 — Overdue escalation

For items where `next_review_due < NOW()` (past due):
- If the review is classified `REGULATED` (R01, R02, R03, R06, R07, R08, R10,
  R14, R21, R23) and overdue by > 7 days: raise SEV-3 and page Quality Lead
- If overdue by > 30 days: escalate to SEV-2; notify Quality Director and
  Compliance Lead
- Non-regulated reviews overdue by > 14 days: SEV-4 dashboard alert only

### J3 — Input pre-staging

For each due review, the job queries the Evidence API (E8) for all required input
classes defined in §2. Inputs are bundled into a `review_input_package`:
- Each input is fetched, resolved, and cached for the review session
- Inputs unavailable or unreachable are flagged as `input_gap`
- If any REQUIRED input has a gap, the review is placed in `INPUT_BLOCKED` state
  and the owner is notified; the review cannot start until the gap is resolved
  or a waiver is granted by the Quality Lead

### J4 — Owner notification and dashboard surfacing

Owners receive:
- Email notification with review_id, type, due date, input package link
- Dashboard card in the quality management portal listing all open reviews
  for their role
- Reminder escalation if the owner does not open the review within the
  advance notice window minus 2 days

### J5 — Review execution

Owners and participants conduct the review asynchronously or in a structured
meeting. The review portal provides:
- Pre-staged input package (read-only; links to E8 for full record view)
- Finding entry form (severity, class reference, description)
- Decision entry form (rationale, signoff)
- Action item creation with owner + due date + output type routing
- E-signature panel for all participants per quorum rule

### J6 — Output routing

When the review is signed (quorum met), outputs declared in §3 are routed
automatically:
- H7 CRs: `change_request` record created with `source_review_id` linked
- EC-14 CAPAs: `capa_record` created with `source_review_id` linked
- H2 re-PQ triggers: validation schedule updated
- Training assignments: scheduled in D8 with due dates
- Access revocations: access control system notified; EC-22 event emitted

### J7 — Anchor and evidence persistence

After routing, the review_record is finalized:
- `review_status` set to `SIGNED`
- Record anchored in the next daily Merkle anchor cycle (per B6 C1)
- Evidence artifact stored as EC-5 with permanent WORM lock
- `next_review_due` computed from `conducted_at + cadence_days` (or the CSR
  override if applicable) and written back to `review_schedule`

### J8 — Audit pack inclusion

Monthly and quarterly: the audit pack export job (H3) includes a summary of:
- All reviews completed in the period: type, date, quorum, finding count,
  action item count, closure status
- All overdue reviews and escalation status
- All input gaps that blocked reviews and their resolution

The audit pack entry for periodic review is referenced in the annual management
review (R02) as an input.

---

## 7. KPIs

```
KPI-PR-01  Review completion rate
           Definition: % of scheduled reviews completed (signed + closed)
                       within their cadence window across all regulated types
           Target: 100%
           Alert: < 100% for regulated reviews → SEV-3 escalation per J2

KPI-PR-02  Input pre-staging success rate
           Definition: % of reviews where all required inputs were available
                       at the time of review (no input gaps requiring waiver)
           Target: ≥ 95%
           Alert: < 90% → CAPA on evidence pipeline (H8)

KPI-PR-03  Action item closure rate
           Definition: % of action items from reviews closed by their
                       stated due date, measured monthly
           Target: ≥ 90%
           Alert: < 80% → Quality Lead escalation; < 70% → SEV-3

KPI-PR-04  Mean time from finding to CAPA open
           Definition: median calendar days from review_signed to
                       CAPA record creation for CRITICAL / MAJOR findings
           Target: ≤ 5 business days
           Alert: > 10 business days → process investigation

KPI-PR-05  Overdue review rate
           Definition: % of scheduled reviews that were overdue by > 7 days
                       at the time of completion, measured quarterly
           Target: 0% for regulated reviews
           Alert: any regulated review overdue → SEV-3 per J2

KPI-PR-06  Quorum compliance rate
           Definition: % of review records signed with correct quorum
                       at first attempt (not requiring re-submission)
           Target: 100%
           Alert: < 100% → training investigation; patterns in specific
                  review types route to CAPA
```

---

## 8. Failure modes

```
FM1   Review past due
      Prevention: J2 escalation + advance notice window
      Recovery:   SEV escalation per J2 cadence; certifications at risk
                  if regulated review overdue > 30 days; CAPA opened

FM2   Required inputs unavailable at review time
      Prevention: J3 pre-staging with gap detection
      Recovery:   Review placed in INPUT_BLOCKED; H8 CAPA on the evidence
                  pipeline producing the missing input class

FM3   Findings recorded without actionable outputs
      Prevention: Review portal requires ≥ 1 action item per CRITICAL/MAJOR
                  finding before signoff is permitted
      Recovery:   Review record rejected at signoff step; resubmit with
                  proper outputs

FM4   Action item never closes past due date
      Prevention: J4 dashboard surfacing + due-date reminders
      Recovery:   H8 systemic CAPA on action item completion discipline;
                  SEV escalation per overdue duration; Quality Director
                  notification at > 60 days

FM5   Reviewer signs without meeting quorum requirement
      Prevention: signoff panel rejects submission if quorum_met = false
      Recovery:   Review remains OPEN; reminder sent to missing signers;
                  if no quorum within 5 business days, Quality Lead escalation

FM6   Tenant CSR requires stricter cadence but override not applied
      Prevention: CSR ingestion pipeline (H1 §7) writes override to
                  tenant regulatory profile at ingestion time
      Recovery:   H1 profile reconciliation; H8 CAPA; tenant notification
                  per DPA of non-conformance risk

FM7   AI KPI review skipped when model is deprecated mid-cycle
      Prevention: L3 model retirement trigger also triggers R15 review
      Recovery:   Model card transition tracked; R15 still required for
                  sunset window per L3 §1; CAPA if skipped

FM8   Periodic-review job itself fails to run (infrastructure error)
      Prevention: Health check alert on job scheduler; SRE on-call notified
      Recovery:   SRE restores job scheduler; J1 re-run covers all overdue
                  items; SEV-2 if outage lasted > 24 hours (regulated review
                  scheduling affected)
```

---

## 9. Roles and authority (RACI)

```
FUNCTION                 QL   CL   EL   SL   PL   DL   ProcL  WFL  AIL  VPL  SRE
─────────────────────────────────────────────────────────────────────────────────
Define review catalog     A    C    C    C    C    -    -      -    -    C    -
Input contract           A    R    R    C    C    R    C      C    C    R    -
Schedule / cadence       A    R    -    -    -    -    -      -    -    R    C
Execute review           R    R    R    R    R    A    A      A    A    R    C
Signoff (per quorum)     A    R    R    R    R    R    R      -    R    R    -
Route outputs            R    R    R    -    -    R    R      R    R    -    -
CAPA from findings       A    C    C    -    -    R    C      -    C    R    -
Overdue escalation       A    R    C    C    C    C    -      -    -    -    C
Audit pack inclusion     C    A    -    -    -    -    -      -    -    -    -
KPI monitoring           A    C    C    C    C    C    -      -    C    -    C
─────────────────────────────────────────────────────────────────────────────────
QL=Quality Lead, CL=Compliance Lead, EL=Eng Lead, SL=Security Lead,
PL=Privacy Lead, DL=Domain Lead, ProcL=Procurement Lead, WFL=Workforce Lead,
AIL=AI Lead, VPL=Vertical Pack Lead, SRE=SRE Lead
```

---

## 10. Cross-references

- H1 §5 — tenant regulatory profile drives per-tenant cadence overrides
- H1 §7 — CSR ingestion populates cadence overrides
- H2 §13 — validation freshness floors (input to R03)
- H3 — audit pack includes review records per J8
- H4 — evidence class definitions for all input contracts
- H5 — retention for review records (EC-5, permanent)
- H7 — CRs emitted by reviews; H7 changes feed R01/R02 inputs
- H8 — CAPA from review findings; CAPA effectiveness reviewed in R14
- H9 — risk register reviewed in R06; updated as output of R02/R06
- I7 — security posture review (R19) uses I7 records
- I8 — access review (R04/R05) coordinated with I8 tenant ops
- L3 — AI model KPI cadence and retirement triggers (R15, R16)
- L4 — red-team posture review (R16) per L4 cadence
- M5 — SLO directory consumed in R12
- D7 — document effectivity review (R07) routes to D7 lifecycle
- D8 — training assignments from R09; completions reviewed in R09
- D9 — calibration review (R11) routes to D9 maintenance lifecycle
- E8 — Evidence API used for all input pre-staging in J3

---

## 11. Decision phrase

```
H6_PERIODIC_REVIEW_V10_UPGRADE_COMPLETE
```
