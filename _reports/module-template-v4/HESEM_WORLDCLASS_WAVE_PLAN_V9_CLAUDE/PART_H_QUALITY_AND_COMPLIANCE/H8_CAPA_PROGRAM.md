# H8 — CAPA Program

```
chapter_purpose: program-level discipline of corrective + preventive
                 actions: triggers, problem statement quality, root
                 cause depth, verification of effectiveness, systemic
                 escalation, banned shortcuts
owner_role:      Quality Lead
sources:         ISO 9001 §10.2, ISO 13485 §8.5.2-3, IATF 16949 §10.2.3
                 (8D problem solving), 21 CFR 820.100 corrective and
                 preventive action, 21 CFR 211.192 production record
                 review, EU GMP Chapter 1 §1.4 PQS, ICH Q10 §3.2.2
                 management of CAPA system, FDA 483 trend data,
                 AS9100D §10.2.1
```

CAPA is the QMS feedback loop: a non-conformance is found → cause
identified → action taken → recurrence prevented. A bad CAPA program
is recognizable by recurring findings, weak root cause depth,
"closed" CAPAs that never had effectiveness verified, and CAPA
counts that grow faster than the system shrinks them. This chapter
defines the discipline that prevents that pattern in HESEM tenants.

The lifecycle itself is in D6 (NC to CAPA). H8 governs the program
above the lifecycle: how CAPAs are triggered, scoped, prioritized,
ranked for systemic action, and measured for program health.

---

## 1. CAPA trigger catalog

A CAPA SHALL open when any of the following is observed; the trigger
is classified per H9 risk:

```
TRIGGER                                                  CLASSIFICATION
Critical NC (regulated decision impacted)                immediate; Class A
Major NC (control failure, no patient harm yet)           Class A or B
Minor NC trend: 3+ same defect mode within 30 days         Class B
Minor NC: isolated, low-risk                                Class C
Customer complaint with quality root                        Class A or B
Customer complaint trend                                    Class B
Internal audit finding (Major+)                             Class A or B
External audit finding                                       Class A or B
Regulator inspection finding (FDA 483, EMA, etc.)           Class A
Supplier NC requiring SCAR                                  Class B
Field return with quality cause                             Class A or B
Recall investigation                                          Class A
Calibration out-of-tolerance with retroactive impact         Class A
SPC out-of-control signaling systemic issue                  Class B
PQ failure                                                    Class A
Validation evidence found stale (per H6 freshness)           Class B or C
Cybersecurity incident with regulated-data impact             Class A
Privacy breach (per H1 §3 windows)                           Class A
AI advisory acceptance rate drift > 15% delta                Class B
AI red-team finding SEV-2+                                    Class A or B
AI banned-decision bypass attempt                              Class A
Tenant-boundary breach attempt                                  Class A
Retention violation (deletion before floor)                    Class A
Anchor missed > 25 h                                            Class A
```

Triggers are exhaustive at this baseline; new triggers added via H7
(self-referential: change to CAPA program is itself change-controlled).

---

## 2. Problem statement quality

A CAPA opened with a vague problem statement guarantees a vague
fix. HESEM enforces problem-statement quality at intake:

```
REQUIRED FIELDS                       NOTES
What                                   observable phenomenon (not cause)
Where                                  process / line / instrument / tenant
When                                   timeframe; first observed; pattern
Who                                    detected by; affected by
How much                                magnitude / count / impact
How known                              source (per §1 trigger)
Compared to what                       expected / spec / prior baseline
Severity                                per H9 risk class
Reach                                   single record / batch / facility / tenant /
                                        cross-tenant / cross-pack
Anchored to                              authoritative-root id(s) where evidence lives
```

A problem statement missing any field is rejected at submission;
the system suggests templates but does not auto-fill (auto-fill
risks fake CAPAs).

Anti-pattern: "Operator made an error." Not a problem statement —
it's a guess at cause. Rejected.

Acceptable: "On 2026-04-15, lot L-47291 of compound X failed assay
on retest at QC bench-3; assay value 96.8% vs spec 98.0-102.0%;
detected by IPQC; first occurrence in lot family this quarter;
severity Class A (batch release blocked); reach: single batch with
genealogy review pending."

---

## 3. Root cause depth

Surface-level "fixes" are the most common audit finding. HESEM
requires explicit depth using one of the proven methodologies, and
records the methodology choice for audit:

```
METHODOLOGY                       WHEN TO USE                   FORMAT
5 Whys                            simple, well-bounded NC        chain ≥5 levels
                                                                  must end at process
                                                                  / system root
Ishikawa / fishbone                multi-factor process NC        category coverage
                                                                  (man/machine/material/
                                                                  method/measure/env)
8D                                 IATF / customer-driven         8 disciplines per
                                                                  AIAG; D2-D7 mandatory
                                                                  for Major+
FTA (Fault Tree Analysis)          safety-critical / aerospace    top-down logic gate
                                                                  with min-cut sets
FMEA-driven                        process FMEA / PFMEA related   tied to RPN delta
A3                                 lean / process improvement      one-page;
                                                                  PDCA-anchored
TapRooT / Apollo                   complex regulated incident      causal factor chart
Combination                        crossed disciplines             explicitly tagged
```

Methodology is selected at S2 of D6 lifecycle. Class A CAPAs require
two methodologies (e.g., 5 Whys + FTA) for depth-cross-check.

Depth gate: root cause statement must reach a process / system /
control level. "Operator inattention" is rejected; "inspection plan
allowed pass-through of out-of-spec lot because IPQC sample plan
was AQL n=8 vs design intent n=20 not implemented after spec
revision Y" is acceptable.

---

## 4. Action plan substance

Each CAPA action SHALL declare:

```
- Action description (specific, observable)
- Owner (single accountable person)
- Due date
- Dependencies (other actions / external constraints)
- Expected evidence at completion (per H4 class)
- Verification approach
- Effectiveness measure (per §6)
- Cost estimate (where applicable)
- Tenant scope (single tenant / multi-tenant / vendor-side)
```

Action types:

```
Correction (containment)         immediate stop / quarantine / recall
                                  (does not address cause)
Corrective action (cause-fix)     fix the cause that produced this NC
Preventive action (recurrence-fix) prevent this and similar from
                                  recurring elsewhere
Systemic action                    if NC pattern, change the process /
                                  control across the system
```

A CAPA without at least one Corrective + at least one Preventive is
incomplete (trivially "we will be more careful" is rejected).

---

## 5. CAPA priority and scheduling

```
CLASS  TARGET CYCLE TIME (open → close)   STATUS GATES
A      30 days                              30/60/90-day status reviews
B      60 days                              60-day status review
C      120 days                              90-day status review
D      next periodic review                  H6 cycle
```

Cycle time SLA does not include effectiveness window (per §6).
Overrunning a class SLA escalates: A overrun → CEO awareness; B/C
overrun → Quality Lead.

Capacity: open CAPA count per assignee monitored; saturation flag
if assignee has > N CAPAs. Re-assignment is permitted; ownership
change is logged.

---

## 6. Effectiveness verification

A CAPA is not closed when actions complete; it is closed when
effectiveness is verified. Effectiveness windows:

```
CLASS  WINDOW           METRIC
A      90 days          zero recurrence of defect mode + measured
                        process indicator (e.g., yield, complaint
                        rate) at or beyond target
B      60 days          ≥ 80% reduction in defect mode + indicator
C      30 days or       no recurrence in next regression cycle
        next regression
D      next periodic    no recurrence at periodic review
```

Effectiveness sample plan must be larger than the original NC
sample (cannot prove effectiveness on smaller window). Window starts
at last action's completion, not CAPA opening.

Effectiveness signoff:
- Class A/B: 2-person e-signature (per E7); Quality Lead + Domain
  Lead
- Class C: single Quality Lead
- Class D: Doc Owner

Banned: AI cannot autonomously close a CAPA (per L1 BD-3).

If effectiveness fails: CAPA reopens; severity escalates; root cause
re-evaluated; new action plan; new window. Repeat-failure (>2
reopens) triggers systemic review (per §8).

---

## 7. CAPA program metrics

Tracked monthly per tenant:

```
COUNT METRICS
  Open count by class
  Open count by assignee
  Open count by domain (per Part C)
  Opened in period vs closed in period
  Effectiveness pass rate
  Reopen rate
  Average cycle time per class
  Overdue count per class
  Repeat-CAPA rate (same root cause)

QUALITY METRICS
  Mean root cause depth (Whys count)
  Methodology distribution
  Problem-statement reject rate at intake
  Verification quorum compliance
  Cross-functional CAPA share

SYSTEMIC METRICS
  CAPA-clusters: 3+ CAPAs sharing same root keyword
  Top defect modes by Pareto
  Top affected workflows
  Top drivers (audit / customer / supplier / internal)
  Manager span-of-CAPA (open CAPA per supervisor)
```

These metrics feed Quality Trend Dashboard (per F1 DL-02) and
periodic management review (H6).

---

## 8. Systemic escalation

A single CAPA closes a single NC. A pattern of CAPAs requires a
systemic CAPA — one that changes the process / control / training
that allowed the pattern.

Trigger heuristics for systemic CAPA:

```
- 3+ CAPAs share root cause keyword in 90 days
- Same defect mode CAPA reopens 2+ times
- Repeat finding from same external auditor cycle-over-cycle
- Cross-tenant pattern (multiple tenants same NC type)
- Pareto top item > 30% of total CAPAs in period
- Single root domain / supplier accounts for > 25% of total
```

A systemic CAPA inherits all triggering CAPAs (cross-linked); its
effectiveness is measured by the absence of pattern continuation
across all consuming domains.

---

## 9. Cross-tenant CAPA propagation

When HESEM-the-vendor identifies a vendor-side CAPA (a HESEM bug or
process gap affects multiple tenants), tenant notification is
governed by:

```
PATIENT-SAFETY IMPACT          immediate notification to all affected
                                tenants per DPA; H1 §3 windows
REGULATED-CAPABILITY IMPACT     notification within 5 business days;
                                interim mitigation provided
QUALITY IMPACT (no patient)     notification at next periodic
                                customer business review
NON-REGULATED IMPACT             changelog; no individual notice
```

The vendor-side CAPA is itself an authoritative record visible to
auditors of any affected tenant.

---

## 10. CAPA + sister disciplines

```
CAPA ↔ change control (H7)       systemic CAPA usually emits a CR;
                                   CR may close one or more CAPAs
CAPA ↔ risk management (H9)      CAPA may add / remove / re-rate risks
CAPA ↔ validation (H2)            CAPA may trigger re-PQ
CAPA ↔ periodic review (H6)       review consumes CAPA metrics; review
                                   may open CAPAs
CAPA ↔ audit (H3)                 audit findings open CAPAs
CAPA ↔ supplier (C4)              SCAR is supplier-side CAPA mirror
CAPA ↔ AI (L0..L5)                AI red-team findings → CAPAs;
                                   acceptance-rate drift → CAPA
CAPA ↔ incident (I3)              SEV-1/2 post-mortem is a CAPA shell
CAPA ↔ recall (D12)               recall investigation root cause →
                                   CAPA + reportable_event
```

---

## 11. Failure modes

```
FM1   CAPA closed without effectiveness
      Recovery: H3 audit catches; reopen CAPA; H8 systemic on closure
              discipline

FM2   "Operator error" root cause accepted
      Recovery: intake validator rejects; mandatory process / system
              level depth

FM3   Same root cause produces new CAPAs (no pattern detector)
      Recovery: detector should fire; if not, retrofit per H8 §8;
              systemic CAPA opened against detector

FM4   Action plan has no preventive action
      Recovery: intake validator rejects; CAPA cannot exit "in
              progress" state

FM5   Effectiveness window too small to be meaningful
      Recovery: window floor enforced per class; manager override
              requires Compliance Lead approval

FM6   AI auto-closes a CAPA (BD-3 attempt)
      Recovery: triple-defense L1 §6 blocks; SEV-1; CAPA on AI
              boundary; possibly L4 red-team finding

FM7   Cross-tenant CAPA not propagated
      Recovery: scope detection at intake (vendor / multi-tenant);
              propagation policy enforced

FM8   Systemic CAPA scope creeps to "boil the ocean"
      Recovery: scope limited to root cause domain; further
              systemic in subsequent CAPA; periodic review surfaces
              chronic scope creep
```

---

## 12. Roles and authority (RACI)

```
Role                INTAKE  RC   PLAN  EXEC  EFF  CLOSE  SYSTEMIC
Quality Lead        A       A    A     -     A    A      A
Domain Lead         R       R    R     R     R    R      R (in domain)
Engineering Lead    C       R    R     R     C    -      C
Compliance Lead     C       -    C     -     C    A (A)  C
Validation Eng      -       R    -     -     R    -      -
Vertical Pack Lead  R(pack) C    C     -     C    R(pack) R(pack)
Supplier mgr        R(supp) -    -     -     -    -      -
SRE Lead            -       C    C     C     -    -      -
AI Lead             -       R    R     R     R    R      R (AI)
QP / PRRC           -       -    A(pack) -    A(pack) A(pack) A(pack)
```

---

## 13. Cross-references

- D6 — NC to CAPA workflow shell
- D12 — recall workflow CAPA integration
- D13 — audit-to-remediate CAPA integration
- H1 §3 — regulator notification windows
- H2 — validation-driven CAPAs
- H3 — audit-driven CAPAs
- H4 — capa_record (EC-14) class
- H5 — CAPA retention floors
- H6 — periodic review feedback
- H7 — change control coupling
- H9 — risk register coupling
- L1 — banned decision BD-3 (AI close CAPA)
- L4 — red-team CAPAs
- C4 — supplier SCAR mirror
- C13 — AI advisory + CAPA suggestions (advisory only)
- M9 — cross-reference index

---

## 14. Decision phrase

```
H8_CAPA_PROGRAM_BASELINE_LOCKED
NEXT: H9_RISK_MANAGEMENT.md
```
