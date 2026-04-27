# H8 — CAPA Program

```
chapter_purpose: program-level discipline of corrective and preventive
                 actions: triggers, problem statement quality, root
                 cause depth, action plans, verification of effectiveness,
                 systemic escalation, cross-tenant propagation, per-pack
                 overlay, KPIs
owner_role:      Quality Lead
sources:         ISO 9001:2015 §10.2, ISO 13485:2016 §8.5.2-3,
                 IATF 16949:2016 §10.2.3 (8D), 21 CFR 820.100 CAPA,
                 21 CFR 211.192 production record review,
                 EU GMP Chapter 1 §1.4 PQS, ICH Q10 §3.2.2,
                 FDA 483 trend data, AS9100D §10.2.1,
                 AIAG G8D manual (8D discipline),
                 VDA 6.3 process audit finding response
```

CAPA is the QMS feedback loop: a non-conformance is found → cause
identified → action taken → recurrence prevented. A bad CAPA program
is recognizable by recurring findings, weak root cause depth, CAPAs
that close without effectiveness verified, and counts that grow faster
than the system shrinks them. This chapter defines the program
discipline above the lifecycle (the lifecycle itself is in D6).

---

## 1. CAPA trigger catalog

A CAPA SHALL open when any of the following is observed. The trigger
classification (A/B/C/D) determines the priority and cycle time per §5.

```
NO.  TRIGGER                                               CLASS
──────────────────────────────────────────────────────────────────────
 1   Critical NC — regulated decision impacted              A (immediate)
 2   Major NC — control failure, no patient harm yet        A or B
 3   Minor NC trend — 3+ same defect mode within 30 days   B
 4   Minor NC — isolated, low-risk                          C
 5   Customer complaint with quality root cause             A or B
 6   Customer complaint trend (3+ same category in period) B
 7   Internal audit finding (Major+)                        A or B
 8   External audit finding (any severity)                   A or B
 9   Regulator inspection finding (FDA 483, EMA, NCA)       A
10   Supplier NC requiring SCAR                             B
11   Field return with confirmed quality cause              A or B
12   Recall investigation root cause                         A
13   Calibration out-of-tolerance with retroactive impact    A
14   SPC out-of-control signaling systemic process shift    B
15   PQ failure                                              A
16   Validation evidence found stale (per H2 §13 freshness) B or C
17   Cybersecurity incident with regulated-data impact       A
18   Privacy breach (per H1 §3 notification windows)        A
19   AI advisory acceptance rate drift > 15% delta from    B
     baseline
20   AI red-team finding SEV-2+                             A or B
21   AI banned-decision bypass attempt (any attempt)        A
22   Tenant-boundary breach attempt                          A
23   Retention violation — deletion before floor            A
24   Audit chain anchor missed > 25 hours                   A
25   WORM lock coverage drop below 100% (any class)        A
26   Effectiveness review failure (CAPA reopened 2+)        B (systemic)
27   Periodic review action item overdue > 30 days          B
──────────────────────────────────────────────────────────────────────
```

Triggers 1–27 are exhaustive at this baseline. New triggers are added
via H7 change control (the CAPA program is itself a regulated process).

---

## 2. Problem statement quality

A CAPA opened with a vague problem statement guarantees a vague fix.
HESEM enforces problem-statement quality at intake: the system rejects
submissions missing any mandatory field. The 10 mandatory fields:

```
FIELD              DEFINITION AND ANTI-PATTERN
──────────────────────────────────────────────────────────────────────
What               The observable phenomenon — NOT the cause.
                   Anti-pattern: "Operator made an error."
                   Valid: "Lot L-47291 failed retest assay at 96.8%
                   vs spec 98.0–102.0% at QC bench-3."

Where              Process / line / instrument / module / tenant.
                   Must identify a specific location in the process
                   or system, not just "in production."

When               Timeframe of occurrence; date first observed;
                   whether it is recurring or isolated.

Who detected       Role and group that detected the non-conformance;
                   who is affected by the non-conformance.

How much           Magnitude: count, percentage, lot quantity, number
                   of records, financial exposure.

How known          Source trigger per §1 (number + text label).

Compared to what   The baseline or specification that defines the
                   deviation: spec limit, control chart limit, prior
                   baseline value, policy requirement.

Severity           Risk class per H9 framework applicable to this
                   NC: A, B, C, or D.

Reach              Scope of impact: single record / batch / facility /
                   tenant / cross-tenant / cross-pack. Determines
                   whether cross-tenant propagation (§9) applies.

Anchored to        One or more authoritative-root IDs (EC-1/EC-2) or
                   evidence artifact IDs (EC-14) where the evidence
                   for this NC lives. Prevents "ghost CAPAs" with no
                   traceable evidence.
──────────────────────────────────────────────────────────────────────
```

The intake validator uses the same field schema as the `capa_record`
(EC-14) in H4. Auto-fill is forbidden — auto-filled fields produce
generic problem statements that escape root cause discipline.

---

## 3. Root cause depth

Surface-level "fixes" are the most common audit finding in CAPA
programs. HESEM requires explicit depth using one of the proven
methodologies, records the methodology choice in the CAPA record for
audit trail, and enforces a depth gate at CAPA approval.

```
METHODOLOGY            WHEN TO USE                   FORMAT REQUIREMENT
──────────────────────────────────────────────────────────────────────
5 Whys                 Simple, well-bounded NC;        Chain of ≥ 5 Why
                       single failure mode             iterations; final
                                                        Why must resolve to
                                                        a process / system /
                                                        design control, not
                                                        to a person.

Ishikawa / fishbone    Multi-factor process NC;         All 6M categories
                       root cause likely across         evaluated: Man,
                       categories                       Machine, Material,
                                                        Method, Measurement,
                                                        Environment.

8D (AIAG)              IATF / OEM-driven; customer-    D2 (team) through
                       facing quality event             D7 (prevention) are
                                                        mandatory for Major+.
                                                        D8 (recognition)
                                                        completes closure.

Fault Tree Analysis    Safety-critical; aerospace;      Top-down Boolean
(FTA)                  high-consequence failure mode    logic; minimum cut
                                                        sets documented;
                                                        probability estimate
                                                        where applicable.

FMEA-driven            NC originates from a gap in      Link NC to the
                       an existing PFMEA / DFMEA;       specific FM/FC entry
                       automotive or MD context         in the FMEA; RPN or
                                                        AP delta documented.

A3                     Lean / continuous improvement     Single-page format;
                       NC; process improvement          PDCA-anchored; shared
                       context                          visual format for
                                                        cross-functional team.

TapRooT / Apollo       Complex regulated incident;       Causal factor chart
                       multiple contributing causes;     (TapRooT) or Logic
                       patient or safety impact          Tree (Apollo);
                                                        minimum 3 causal
                                                        factors.

Combination            NC spans multiple disciplines;    Each methodology
                       single methodology insufficient   explicitly named;
                                                        rationale for
                                                        combination recorded.
──────────────────────────────────────────────────────────────────────
```

**Depth gate**: the root cause statement must resolve to a process,
system, or control level. The following are rejected by the intake
validator:
- "Operator inattention" → must ask why the process allowed it
- "Training gap" as the final answer → must ask why training was
  insufficient and what systemic control was missing
- "Software bug" → must trace to the development/testing process gap

Class A CAPAs require two independent methodologies applied in parallel
(e.g., 5 Whys + FTA) for depth cross-check. The two root causes are
reconciled; discrepancies are documented as additional findings.

---

## 4. Action plan substance

Each CAPA action SHALL declare all of the following fields. The CAPA
cannot exit the `PLAN_APPROVED` state with any field null.

```
FIELD                     REQUIREMENT
──────────────────────────────────────────────────────────────────────
Action description        Specific and observable; states the exact
                          artifact or process that will change.

Owner                     Single accountable person (user_id); not a
                          team or group (groups do not close actions).

Due date                  Deterministic date, not "TBD."

Dependencies              Other actions or external constraints that
                          block this action; linked action IDs.

Expected evidence         Evidence class (per H4) that will be produced
at completion             at completion (e.g., EC-16 change record,
                          EC-5 validation pack update, EC-1 SOP revision).

Verification approach     How the action will be confirmed complete:
                          document review, physical inspection, system
                          query, test execution, or periodic observation.

Effectiveness measure     Quantitative indicator used in §6 to confirm
                          recurrence prevented. Must be measurable.

Cost estimate             Where non-trivial effort is involved: person-
                          hours or direct cost. Optional for Class C/D.

Tenant scope              Identifies whether the action affects a single
                          tenant, multiple tenants, or is vendor-side.
──────────────────────────────────────────────────────────────────────
```

**Action type requirements:**

```
TYPE                    DEFINITION                         REQUIREMENT
──────────────────────────────────────────────────────────────────────
Correction              Immediate containment: stop the     Required for
(containment)           bleeding. Does not address cause.  Class A/B.
                        Examples: quarantine lot, block
                        record, halt workflow.

Corrective action       Fix the specific cause that         Required for
(cause-fix)             produced this NC instance.          all classes.

Preventive action       Prevent recurrence of this and      Required for
(recurrence-fix)        similar NCs elsewhere in the        all classes.
                        system. Different from corrective   Cannot be
                        action — applies to the process     "we will be
                        broadly, not just this instance.    more careful."

Systemic action         When NC is part of a pattern:        Required when
                        change the process or control       systemic
                        across all affected domains.        CAPA is
                                                            declared
                                                            (per §8).
──────────────────────────────────────────────────────────────────────
```

A CAPA with only a correction but no corrective action cannot advance
past `CONTAINMENT`. A CAPA with corrective action but no preventive
action cannot advance past `ACTIONS_IN_PROGRESS`. These are state
machine guards, not advisory warnings.

---

## 5. CAPA priority and scheduling

```
CLASS  NAME       TARGET CYCLE TIME        STATUS GATES
──────────────────────────────────────────────────────────────────────
A      Critical   30 days (actions close)  30-day, 60-day, 90-day
                                            status reviews; CEO-level
                                            awareness if cycle SLA
                                            exceeds 45 days
B      Major      60 days                  60-day status review;
                                            Quality Director if
                                            cycle SLA exceeds 75 days
C      Moderate   120 days                  90-day status review
D      Minor      Next periodic review     H6 cycle (per R14)
──────────────────────────────────────────────────────────────────────
```

Cycle time is measured from CAPA opening to actions-complete. The
effectiveness window (§6) is additional and does not count against
the cycle time SLA.

**Capacity management**: the system monitors open CAPA count per
assignee. If an assignee has more than N open CAPAs (N is configurable
per tenant; default N = 5 for Class A/B), a saturation flag is raised
and re-assignment is recommended. Re-assignment is permitted; ownership
transfer is logged as an audit event (EC-22).

---

## 6. Effectiveness verification

A CAPA is not closed when actions complete. It is closed when
effectiveness is verified. The effectiveness window starts from the
last action's completion date, not from CAPA opening.

```
CLASS  WINDOW          METRIC REQUIREMENT
──────────────────────────────────────────────────────────────────────
A      90 days         Zero recurrence of the specific defect mode
                        AND the quantitative indicator (yield, complaint
                        rate, error count) meets or exceeds the target
                        established at CAPA opening.
B      60 days         ≥ 80% reduction in defect mode frequency AND
                        indicator trend toward target.
C      30 days or      No recurrence in the next full regression cycle
        next regression or periodic review cycle.
D      Next periodic   No recurrence surfaced at the H6 periodic review
        review          that closes the action item.
──────────────────────────────────────────────────────────────────────
```

**Sample plan rule**: the effectiveness sample must be at least as
large as the original NC sample. A CAPA for a batch-level NC cannot
claim effectiveness on a single batch check; it must cover a
statistically meaningful number of batches.

**Effectiveness signoff**:
- Class A: 2-person e-signature (per E7); Quality Lead + Domain Lead
- Class B: Quality Lead single sign
- Class C: Doc Owner or Domain Lead single sign
- Class D: Periodic review record (no separate signoff)

**Failure and escalation**: if effectiveness fails within the window,
the CAPA reopens automatically. Its class is escalated by one level
(C → B; B → A). Root cause re-evaluation is mandatory. Two reopens
trigger systemic review (per §8).

Banned: AI cannot autonomously close a CAPA (BD-3 per L1). The close
action requires human e-signature regardless of AI advisory confidence.

---

## 7. CAPA program metrics

Tracked monthly per tenant and reported to H6 management review (R02):

```
COUNT METRICS
  Open count by class (A/B/C/D)
  Open count by assignee (saturation monitoring)
  Open count by domain (per Part C domains)
  Opened in period vs. closed in period (flow balance)
  Effectiveness pass rate (% closed without reopen)
  Reopen rate (% that reopened at least once)
  Average cycle time per class vs. SLA
  Overdue count per class
  Repeat-CAPA rate (same root cause within 12 months)

QUALITY METRICS
  Mean root cause depth (5 Whys: average Why count at close)
  Methodology distribution (8D % vs. 5 Whys % vs. other)
  Problem-statement rejection rate at intake
  Effectiveness verification quorum compliance rate
  Cross-functional CAPA share (% with ≥ 2 owning domains)

SYSTEMIC METRICS
  CAPA clusters: groups of 3+ CAPAs sharing root cause keyword
  Top defect modes by Pareto (80/20 concentration)
  Top affected workflows (by D-workflow cross-reference)
  Top trigger sources (audit / customer / supplier / AI / internal)
  Manager span-of-CAPA (open CAPA count per supervisor)
  Systemic CAPA rate (systemic as % of total opened)
```

These metrics feed the Quality Trend Dashboard and H6 periodic
management review (R02). Trends over 3+ periods drive systemic CAPA
decisions (§8).

---

## 8. Systemic escalation

A single CAPA closes a single NC. A pattern requires a systemic CAPA
— one that changes the process, control, or training design that
allowed the pattern to persist.

**Trigger heuristics** for opening a systemic CAPA:

```
H1  3+ CAPAs share the same root cause keyword in 90 days
H2  Same defect mode CAPA reopens 2+ times
H3  Same finding category appears in consecutive external
    audit cycles (cycle-over-cycle repeat)
H4  Cross-tenant pattern: 2+ tenants open the same NC type
    within a 30-day window (vendor-side root)
H5  Pareto top defect mode > 30% of all CAPAs in period
H6  Single domain or supplier accounts for > 25% of total
    open CAPAs in period
H7  Mean root cause depth for a domain is below 3 Whys for
    two consecutive months (indicates systemic shallow analysis)
```

A systemic CAPA is Class A regardless of the class of its triggering
CAPAs. It cross-links all triggering CAPA IDs. Its effectiveness is
measured by absence of pattern continuation across all consuming
domains, not just by the closure of individual actions.

Systemic CAPA closure requires sign-off by the Quality Director (or
equivalent) in addition to the standard Class A quorum.

---

## 9. Cross-tenant CAPA propagation

When HESEM-the-vendor identifies a CAPA that is vendor-side (a HESEM
platform bug or process gap that affects multiple tenants), notification
is governed by the following rules:

```
IMPACT LEVEL              NOTIFICATION REQUIREMENT
──────────────────────────────────────────────────────────────────────
Patient-safety impact      Immediate notification to all affected
                           tenants per DPA; regulator notification
                           per H1 §3 windows for applicable
                           jurisdiction and product type.
Regulated-capability        Notification within 5 business days;
impact (no patient          interim mitigation provided (workaround
safety)                     or capability block if needed).
Quality impact (no          Notification at next periodic customer
patient safety)             business review (QBR).
Non-regulated impact        Changelog entry; no individual tenant
                            notification required.
──────────────────────────────────────────────────────────────────────
```

The vendor-side CAPA record (EC-14) is accessible to authorized
auditors of any affected tenant, scoped to the evidence relevant to
that tenant's products.

---

## 10. Per-pack CAPA overlay

### 10.1 Pharma Pack
- All patient-safety CAPAs (triggers 1, 12, 18) require QP (Qualified
  Person) advisory sign-off before the action plan is approved. QP sign
  does not replace the Quality Lead signature; it is additive.
- CAPA triggered by an FDA 483 observation requires a 15-business-day
  response (Warning Letter response is 15 working days); the CAPA
  cycle must produce an initial response package within that window even
  if actions are not complete.
- GxP-context CAPAs are retained per H5 (product life + 5 yr). The
  CAPA record is part of the process-validation evidence base.
- Systemic CAPAs involving batch release algorithm must traverse H7
  Class A change control.

### 10.2 Medical Device Pack
- PRRC (Person Responsible for Regulatory Compliance, EU MDR Art 15)
  advisory sign-off is required for CAPAs touching the DHF, DMR, or
  software validation pack.
- CAPAs that result in a design change require a design-change
  evaluation per ISO 13485 §7.3.9 (does the change constitute a
  significant change requiring new conformity assessment?).
- Complaint-triggered CAPAs (trigger 5) must evaluate whether the
  complaint constitutes a reportable event (EC-21) per 21 CFR Part 803
  or EU MDR Art 87.
- Post-market surveillance (PMS) data is a mandatory input to CAPAs
  relating to field performance.

### 10.3 Automotive Pack (IATF)
- Customer-complaint CAPAs at Major level must follow 8D format per
  AIAG G8D. The 8D report (D1–D8) is the deliverable, not a free-form
  CAPA narrative.
- D0 (emergency response actions) must be documented within 24 hours
  of customer complaint receipt for any complaint from a Tier-1 OEM.
- OEM customer portals (e.g., Ford AIMS, GM GQTS, Stellantis Covisint)
  receive 8D reports via EDI or portal push; the HESEM CAPA record
  links to the external submission event.
- Repeat customer concern (same failure mode within 12 months) triggers
  an IATF §10.2.3 Customer-Concern-Management escalation, which is a
  systemic CAPA trigger.

### 10.4 Aerospace Pack (AS9100D)
- SCAR (Supplier Corrective Action Request) for aerospace suppliers
  uses the AS9100D §10.2.1 format and includes evidence of root cause
  method used (documented explicitly).
- CAPAs for DO-178C / DO-254 DAL-A/B findings must be reviewed and
  closed before the affected software/hardware baseline can be certified.
- Any CAPA that changes a design or production process must go through
  the First Article Inspection (FAI) delta assessment per AS9102 to
  determine whether a partial or full FAI is required.
- GIDEP (Government-Industry Data Exchange Program) alerts affecting
  fielded product trigger a mandatory CAPA within 30 days of receipt.

### 10.5 Food Pack (FSMA)
- CAPA triggered by a CCP critical limit deviation (trigger 1 analog)
  must include: (a) corrective action to ensure no injurious or
  adulterated food reaches commerce; (b) identification and
  disposition of affected food; (c) root cause determination; (d)
  preventive measure. These four elements are required by FSMA Part
  117.150 and are enforced as mandatory CAPA action types.
- FSMA §117.190 requires corrective action records to be retained for
  2 years; HESEM applies the longer-of rule (internal CAPA retention
  floor is 5 years for Class A/B).
- Mock recall exercise failures (per H3 game day scenario GD-016
  analog) trigger a Class B CAPA on the recall procedure.

---

## 11. CAPA + sister disciplines integration

```
INTEGRATION          DIRECTION          CONCRETE COUPLING
──────────────────────────────────────────────────────────────────────
H7 Change control    Bidirectional      Systemic CAPA emits H7 CR;
                                        H7 CRs can close triggering CAPAs
H9 Risk management   Bidirectional      CAPA adds/removes/re-rates risks;
                                        risk priority drives CAPA class
H2 Validation        CAPA → H2         CAPA may trigger re-PQ for
                                        affected capability
H6 Periodic review   Bidirectional      H6 reviews consume CAPA metrics;
                                        review outputs open CAPAs
H3 Audit             H3 → CAPA          Audit findings open CAPAs;
                                        open CAPA status is an audit input
C4 Supplier          Bidirectional      SCAR is supplier-side CAPA mirror;
                                        supplier CAPA feeds H9 risk
L0..L5 AI discipline AI events → CAPA  Red-team findings, acceptance drift,
                                        banned-decision attempts → CAPAs
I3 Incident          I3 → CAPA          SEV-1/2 postmortem is a CAPA shell;
                                        incident close requires CAPA open
D12 Recall           Bidirectional      Recall root cause opens CAPA;
                                        CAPA closure evidence enters recall
                                        investigation pack
D6 NC workflow       D6 → CAPA          NC escalation triggers CAPA opening;
                                        CAPA references originating NC
──────────────────────────────────────────────────────────────────────
```

---

## 12. KPIs

```
KPI-CA-01  CAPA open-to-close cycle time vs. SLA
           Definition: % of CAPAs closed within class SLA (§5)
           Target: Class A ≥ 90%; Class B ≥ 85%; Class C ≥ 80%
           Alert: Class A < 80% → Quality Director notification

KPI-CA-02  Effectiveness pass rate
           Definition: % of CAPAs that pass effectiveness verification
                       without reopening, measured quarterly
           Target: ≥ 85%
           Alert: < 75% → systemic CAPA on CAPA program itself

KPI-CA-03  Root cause depth compliance
           Definition: % of Class A/B CAPAs where root cause resolves
                       to process/system level (not person level)
           Target: 100%
           Alert: any person-level root cause accepted → CAPA on
                  intake process

KPI-CA-04  Problem-statement rejection rate at intake
           Definition: % of CAPA submissions rejected due to missing
                       or invalid mandatory fields (§2)
           Target: monitored; < 5% indicates good upstream NC discipline
           Alert: > 20% → training gap on NC reporting process

KPI-CA-05  Repeat CAPA rate
           Definition: % of CAPAs opened in period where the same root
                       cause was identified in a CAPA within the prior
                       12 months (recurrence detection)
           Target: ≤ 5%
           Alert: > 10% → systemic CAPA trigger (H1 heuristic)

KPI-CA-06  Systemic CAPA coverage
           Definition: % of identified systemic patterns (meeting ≥ 1
                       heuristic from §8) that have a systemic CAPA
                       opened within 30 days of pattern detection
           Target: 100%
           Alert: any unaddressed pattern → Quality Lead escalation

KPI-CA-07  Cross-tenant propagation timeliness
           Definition: % of vendor-side CAPAs with patient-safety or
                       regulated-capability impact where tenant
                       notification occurred within the required window
           Target: 100%
           Alert: any miss → regulatory breach risk; DPO notification

KPI-CA-08  AI-triggered CAPA resolution time
           Definition: median days from AI-related trigger (acceptance
                       drift, banned-decision attempt, red-team finding)
                       to CAPA action plan approved
           Target: ≤ 5 business days
           Alert: > 10 business days → AI governance escalation per L1
```

---

## 13. Failure modes

```
FM1   CAPA closed without effectiveness verification
      Prevention: state machine requires effectiveness_signoff before
                  CLOSED is permitted; no override
      Recovery:   H3 audit catches; reopen CAPA; systemic CAPA on
                  closure discipline

FM2   Root cause accepted at person level ("operator error")
      Prevention: intake validator checks root cause against a
                  prohibited-phrase list; flags person-only statements
      Recovery:   CAPA returned to root cause phase; new methodology
                  required; Quality Lead notification

FM3   Same root cause produces new CAPAs (pattern not detected)
      Prevention: pattern detector runs nightly; triggers systemic
                  CAPA when H8 heuristics are met
      Recovery:   If detector failed: retrofit; systemic CAPA opened
                  against the detector's logic gap

FM4   Action plan has no preventive action
      Prevention: state machine guard at ACTIONS_IN_PROGRESS exit;
                  CAPA cannot advance without ≥ 1 preventive action
      Recovery:   CAPA returned; preventive action added; cycle time
                  SLA restarted from when the gap was identified

FM5   Effectiveness window too small to be statistically meaningful
      Prevention: system enforces minimum sample size (same as
                  original NC sample); manager override requires
                  Compliance Lead dual-approval
      Recovery:   Window extended; evidence collected; no early close

FM6   AI attempts to close a CAPA (BD-3 attempt)
      Prevention: triple-defense L1 blocks AI from emitting a close
                  action; e-signature panel requires human identity
      Recovery:   SEV-1; CAPA on AI boundary; L4 red-team investigation

FM7   Cross-tenant CAPA not propagated to affected tenants
      Prevention: scope detection at intake (vendor-side / multi-
                  tenant flag triggers propagation workflow)
      Recovery:   Retroactive notification per §9 table; notification
                  delay event logged; CAPA on propagation process

FM8   Systemic CAPA scope expands to unmanageable size
      Prevention: scope is limited to the root-cause domain at opening;
                  scope changes require Quality Lead approval
      Recovery:   Split systemic CAPA into bounded sub-CAPAs; track
                  each independently; consolidate in effectiveness review

FM9   Pack-specific sign-off (QP/PRRC) not obtained before approval
      Prevention: approval workflow for Pharma/MD CAPAs routes to
                  QP/PRRC queue before Quality Lead final step
      Recovery:   Return CAPA to plan-approved state; obtain sign-off;
                  log delay; investigate workflow bypass mechanism

FM10  Repeat CAPA for same customer (automotive 8D)
      Prevention: IATF §10.2.3 repeat-concern check at CAPA opening
                  queries prior 12-month history for same OEM + failure
      Recovery:   Systemic CAPA opened; OEM notification per CSR;
                  cross-functional team convened within 5 business days
```

---

## 14. Roles and authority (RACI)

```
FUNCTION        QL   DL   EL   CL   ValE  VPL  SuppM  SRE  AIL  QP/PRRC
──────────────────────────────────────────────────────────────────────────
Trigger / intake A    R    C    C    -     R    R(supp) C   R(AI) -
Problem stmt     A    R    R    C    -     R    -       -    -    -
Root cause       A    R    R    -    R     C    -       C    R    -
Action plan      A    R    R    C    -     C    -       C    R    A(pk)
Execute actions  -    A    R    -    R     R    R(supp) R    R    -
Effectiveness    A    R    C    A(A) R     C    -       -    R    A(pk)
Close (A)        A    A    -    A    -     R    -       -    -    A(pk)
Close (B/C)      A    R    -    -    -     -    -       -    -    -
Systemic trigger A    C    C    C    -     C    -       -    C    -
Systemic close   A    C    C    C    -     C    -       -    C    C
──────────────────────────────────────────────────────────────────────────
QL=Quality Lead, DL=Domain Lead, EL=Eng Lead, CL=Compliance Lead,
ValE=Validation Engineer, VPL=Vertical Pack Lead, SuppM=Supplier Manager,
SRE=SRE Lead, AIL=AI Lead, QP/PRRC=Pharma QP or MD PRRC (pack-specific)
```

---

## 15. Cross-references

- D6 — NC to CAPA workflow shell (lifecycle below this chapter)
- D12 — recall workflow CAPA integration
- D13 — audit-to-remediate CAPA integration
- H1 §3 — regulator notification windows (cross-tenant propagation)
- H2 — validation re-PQ triggered by CAPA
- H3 — audit-driven CAPAs; audit pack includes CAPA metrics
- H4 — capa_record (EC-14) class definition
- H5 — retention floors for EC-14 (5 yr baseline; product life + 5 yr GxP)
- H6 — periodic review R14 (CAPA effectiveness); management review R02
- H7 — change control coupled to systemic CAPAs
- H9 — risk register coupled; CAPA priority derived from H9 risk class
- L1 — BD-3 (AI cannot close CAPA)
- L4 — red-team findings route to CAPA
- C4 — supplier SCAR mirror
- I3 — incident postmortem is CAPA shell
- M9 — cross-reference index

---

## 16. Decision phrase

```
H8_CAPA_PROGRAM_V10_UPGRADE_COMPLETE
```
