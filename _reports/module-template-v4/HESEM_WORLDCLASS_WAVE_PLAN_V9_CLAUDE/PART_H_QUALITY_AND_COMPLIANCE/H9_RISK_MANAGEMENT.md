# H9 — Risk Management

```
chapter_purpose: how risk is identified, quantified, controlled,
                 reviewed, and tied to every other discipline; how
                 frameworks per vertical (ICH Q9, ISO 14971, AIAG-VDA
                 FMEA, ARP 4761) are operated through one substrate
owner_role:      Quality Lead with Vertical Pack Leads
sources:         ICH Q9(R1) 2023, ISO 14971:2019 + ISO/TR 24971,
                 AIAG-VDA FMEA Handbook 2019, AS/SAE ARP 4761,
                 ISO 31000:2018, IEC 62443-3-2, NIST SP 800-30,
                 ISO/IEC 27005, NIST AI RMF 1.0 MAP-MEASURE-MANAGE,
                 EU AI Act Art 9, ISO/IEC 23894:2023
```

Risk is the silent driver of every other discipline. Validation
depth is risk-driven. Change classification is risk-driven. CAPA
priority is risk-driven. Vertical pack control selection is risk-
driven. AI feature deployment depth is risk-driven. This chapter is
the substrate that makes risk a first-class object in HESEM, not
an Excel-side artifact divorced from execution.

---

## 1. Risk-framework reconciliation

HESEM operates four mature frameworks plus AI-specific extensions
through one substrate (canonical risk record). Each framework
contributes:

```
FRAMEWORK              SCOPE                              KEY OUTPUTS
ICH Q9(R1)              pharma quality risk                 risk identification,
                                                             analysis, evaluation,
                                                             control, communication,
                                                             review
ISO 14971:2019          medical device safety               hazard identification,
                                                             risk control, residual
                                                             risk acceptability,
                                                             risk benefit
AIAG-VDA FMEA 2019      automotive process / product        Action Priority (AP)
                                                             replacing RPN
ARP 4761                aerospace systems safety            ASIL/DAL allocation,
                                                             FHA, PSSA, SSA, FMECA
ISO 31000               general risk principle              language baseline
NIST SP 800-30          IT risk                              likelihood × impact
ISO/IEC 27005           ISMS risk                            asset / threat / vuln
NIST AI RMF             AI risk                              MAP / MEASURE / MANAGE
EU AI Act Art 9         high-risk AI                         continuous risk mgmt
ISO/IEC 23894           AI risk                              integration with 31000
```

Substrate fields common to all (per H4 EC-15 risk_record):

```
risk_id                              tenant-scoped
framework                             which framework drives this risk
domain                                quality | safety | security | privacy |
                                     ai | supply-chain | operational |
                                     compliance | financial
hazard_or_threat                      what could go wrong
sequence_or_scenario                   how it leads to harm
harm                                   what bad happens
exposed_population                      who bears the harm
                                       (patient | operator | consumer | data
                                       subject | environment | business)
severity                                framework-specific scale
likelihood                              framework-specific scale
detection                                framework-specific scale (where
                                       used, e.g. FMEA)
priority_or_acceptability               AP (auto) / acceptable per pol (MD) /
                                       prioritized list (Pharma) / DAL (Aero)
risk_controls                           list (preventive / detective /
                                       compensating)
residual_risk                            after controls applied
benefit_risk_balance                     where applicable (MD)
verification_evidence_refs               EC-1 / EC-3 / EC-4 etc.
ownership                                accountable role + person
review_due                                next review date per framework
status                                    open | mitigated | accepted | retired
linked_workflow / capability             where this risk lives
linked_capa_or_findings                  triggering events
```

The substrate is framework-agnostic; per-framework rules layer on
top (e.g., AP table for FMEA, acceptability matrix for ISO 14971).

---

## 2. Risk discovery sources

```
DISCOVERY SOURCE                           OUTPUT
Process FMEA / Design FMEA                  product / process risks
Hazard Analysis (ISO 14971 step 1)          MD-specific hazards
Process Hazard Analysis (HACCP, OSHA)        food / safety hazards
Functional Hazard Analysis (ARP 4761)        aerospace top-level
PFMEA per CSR                                automotive per OEM
Threat modeling (STRIDE, PASTA, MITRE       cyber risks
ATT&CK)
Privacy threat modeling (LINDDUN)            privacy risks
AI risk MAP (NIST AI RMF)                    AI-specific
Supplier risk assessment                      supply chain
Periodic horizon scan (H1 §6)                 regulatory risks
Audit findings (H3)                            verified gaps
Incidents (I3)                                  realized risks
Customer complaints (D12)                      field-realized
Sub-processor changes                          third-party
M&A / divestiture                              scope
New tenant onboarding                          per H1 §5
```

Every regulated change (per H7) emits a risk-discovery query: the
change author MUST answer "does this introduce, modify, or
eliminate a risk?" Yes routes to risk record creation / update.

---

## 3. ICH Q9(R1) instantiation (pharma)

```
STAGES (Q9 §4)
  Initiation                    define scope, team, tools
  Risk Assessment                identification → analysis → evaluation
  Risk Control                   reduction → acceptance
  Risk Communication             internal + regulator + patient as
                                  applicable
  Risk Review                    periodic + event-driven

TOOLS supported
  FMEA / FMECA
  HACCP-style for parenteral / sterile
  HAZOP for batch processes
  PHA for early-phase
  Risk ranking + filtering
  Decision tree (e.g., for excipient assessment)
  Statistical risk evaluation (process capability)
  Bow-tie analysis (Q9R1 newly recognized)

OUTPUTS
  Quality risk file per product / process
  Risk-based validation plan (feeds H2)
  Risk-based supplier qualification (feeds C4)
  Risk-based change classification (feeds H7)
  Risk-based CAPA prioritization (feeds H8)
```

---

## 4. ISO 14971 instantiation (medical device)

```
ARTICLES (per ISO 14971:2019)
  4   General requirements (risk management process; senior mgmt)
  5   Risk analysis (intended use, hazard identification, risk est)
  6   Risk evaluation (acceptability per policy)
  7   Risk control (option analysis, implementation, residual eval,
       benefit-risk, completeness)
  8   Evaluation of overall residual risk
  9   Risk management review
  10  Production and post-production activities

KEY DELIVERABLES per device
  Risk Management Plan
  Risk Management File (RMF)
  Hazard list
  Risk control list
  Residual risk acceptability statement (per policy)
  Benefit-risk analysis (where residual is non-negligible)
  Risk Management Report (signed)
  PMS plan + reports feeding RMF updates
  PSUR (Periodic Safety Update Report; per MDR Art 86)
```

Acceptability policy is tenant-specific; HESEM stores the policy as
a regulated authoritative root (per D7 doc lifecycle) and applies
it consistently across the RMF.

---

## 5. AIAG-VDA FMEA 2019 instantiation (automotive)

The 2019 transition replaced RPN with Action Priority (AP). HESEM
implements AP via lookup table (canonical from AIAG-VDA handbook):

```
SEVERITY (1-10)         consequence to user / next process
OCCURRENCE (1-10)        likelihood given current preventive controls
DETECTION (1-10)         likelihood detected before reaching customer

ACTION PRIORITY            HIGH (H)   action mandatory
                           MEDIUM (M) action recommended
                           LOW (L)    no action required

7-step approach            1 Planning + Preparation
                           2 Structure analysis
                           3 Function analysis
                           4 Failure analysis (FE, FM, FC chains)
                           5 Risk analysis (S/O/D + AP)
                           6 Optimization (improve controls)
                           7 Results documentation
```

DFMEA (design) and PFMEA (process) are linked via shared FE/FM/FC
chains. PPAP submission (per J2) consumes PFMEA evidence.

---

## 6. ARP 4761 instantiation (aerospace)

Top-down safety assessment for safety-critical systems:

```
FHA (Functional Hazard Assessment)        per function;
                                            classify failure conditions
                                            (Catastrophic, Hazardous,
                                            Major, Minor, No Effect)
PSSA (Preliminary System Safety            allocate to architecture;
       Assessment)                          DAL allocation per DO-178C /
                                            DO-254
SSA (System Safety Assessment)              proves architecture meets PSSA
FTA (Fault Tree Analysis)                    minimum cut set ≤ allowed prob
FMECA (Failure Mode Effects + Crit.)         contributing failure modes
CCA (Common Cause Analysis)                  zonal / particular risk /
                                            common-mode
```

DAL drives validation depth (per H2) and certification artifacts.

---

## 7. NIST AI RMF + EU AI Act instantiation

```
MAP    context, impact, intended use, affected populations,
       risk class (Tier-1/2/3 per L0)
MEASURE quantitative + qualitative; per L4 red-team; KPI per L3
       model card; bias / fairness / robustness / privacy
MANAGE  prioritize, response, monitor, document; banned decisions
       per L1; kill switch per L4

EU AI ACT ART 9 high-risk
  continuous risk management system across lifecycle
  identify reasonably foreseeable risks
  estimate + evaluate risks under intended use + foreseeable misuse
  evaluate other risks per post-market monitoring
  adopt suitable risk management measures
```

Outputs feed L3 (lifecycle) and L4 (red-team).

---

## 8. Per-tenant risk register

Each tenant carries a risk register that is a slice of the substrate
filtered by tenant scope. Aggregation views:

```
HEAT MAP                    severity × likelihood; per domain
                             (quality / safety / security / etc.)
PARETO BY DOMAIN            top contributors per period
TREND                       open / mitigated / accepted over time
COVERAGE BY CONTROL         which controls mitigate which risks
                             (cross-reference)
GAP ANALYSIS                regulated risks without verified controls
RESIDUAL ACCEPTABILITY      residual risks above acceptance threshold
                             with explicit policy reference
TIME-IN-OPEN                aging analysis per priority
LINKED-CAPA HEALTH          risks with open CAPAs vs without
LINKED-VALIDATION FRESHNESS  per H2 §13
EVIDENCE-COVERAGE            per H4 expected vs present
```

The aggregation is exposed via E8 (Evidence API) and surfaced on
Quality Trend Dashboard (DL-02) for tenant + on Vendor Risk
Dashboard for HESEM-the-vendor.

---

## 9. Risk control catalog

Risk controls are themselves regulated artifacts (per D7 doc
lifecycle). Catalog per type:

```
PREVENTIVE                  reduce likelihood of failure
                            e.g., poka-yoke, training, SOP, dual-
                            person check, work instruction
DETECTIVE                   detect failure before it harms
                            e.g., SPC, IPQC, e-record audit trail,
                            anomaly detection, redundant verification
COMPENSATING                replaces a missing primary
                            e.g., manual review where automation gap
RECOVERY                    minimize harm after failure
                            e.g., recall procedure, hold/quarantine,
                            DR plan, incident runbook
TRANSFER                    insurance, contract terms, sub-processor
                            DPA
ELIMINATE                   redesign to remove the hazard entirely
ACCEPT                      explicit acceptance with rationale +
                            authority signature
```

Each control points to:
- Implementation evidence (per H4 class)
- Verification evidence (recurring per H6 cadence)
- Effectiveness measure
- Owner / accountable role

A risk in "open" state must have at least one control with current
verification evidence; otherwise it cannot be marked mitigated.

---

## 10. Cross-discipline integration

```
RISK ↔ VALIDATION (H2)        risk class drives validation depth (Tier);
                              validation findings update risks
RISK ↔ CHANGE (H7)            change classification reflects risk delta;
                              change closure verifies residual risk
RISK ↔ CAPA (H8)              risk drives CAPA priority; CAPA closes
                              control gap → reduces risk
RISK ↔ AUDIT (H3)             findings = unverified-control evidence;
                              risks updated post-audit
RISK ↔ PERIODIC REVIEW (H6)   review confirms control state;
                              re-evaluates likelihood + detection
RISK ↔ RETENTION (H5)         compliance risks include retention failure
RISK ↔ INCIDENT (I3)          realized risks → reassess;
                              risks not realized vindicate controls
RISK ↔ AI (L0..L5)            AI risk class determines lifecycle stages
                              + evidence
RISK ↔ SUPPLIER (C4)          supplier risk drives qualification depth
RISK ↔ TENANT (I8)            per-tenant aggregation per pack
```

---

## 11. Acceptance and benefit-risk

When residual risk exceeds acceptability, two paths:

```
PATH A   reduce further (more controls; higher cost)
PATH B   accept with explicit benefit-risk analysis
         requires:
           - benefit quantified
           - alternative analysis (could we have avoided?)
           - residual harm population characterized
           - acceptance authority signature (Quality Lead +
             Compliance Lead + (QP/PRRC for pack))
           - communicated to user / patient / regulator as
             applicable
           - re-evaluation cadence
```

Acceptance is itself an authoritative record retained per H5
(perpetual for regulated). It cannot be reversed silently — a new
acceptance record supersedes the old, and the supersession is
audited.

---

## 12. Failure modes

```
FM1   Risk register stale (last review > floor)
      Recovery: H6 surfaces; SEV-2/3; rapid review;
              compliance certification at risk

FM2   Risk identified but no control
      Recovery: cannot mark mitigated; CR opened to introduce
              control; interim acceptance with explicit scope

FM3   Control fails effectiveness verification
      Recovery: control marked ineffective; risk re-rated;
              CAPA opened (H8)

FM4   Down-rating risk to dodge action
      Recovery: H3 audit catches; double-rating with
              independent reviewer required for down-rates

FM5   Acceptance signed by single authority
      Recovery: signature blocked at quorum check (B6 axiom);
              additional signoffs required

FM6   Cross-pack risk not propagated (e.g., shared component)
      Recovery: scope detection at IA (per H7 §4 Q1);
              propagation policy enforced

FM7   AI risk treated as IT risk (or vice versa)
      Recovery: framework selection guard; AI-domain risks
              must use NIST AI RMF + Q9/14971 hybrid where
              regulated

FM8   Acceptance never re-evaluated
      Recovery: acceptance records have expiry;
              expiry triggers re-review

FM9   Realized risk (incident) not back-fed
      Recovery: I3 incident closure requires risk register
              update; incident close blocked otherwise
```

---

## 13. Roles and authority (RACI)

```
Role                IDENT  ANALYZE  EVAL  CONTROL  ACCEPT  REVIEW
Quality Lead        R      A        A     A        A       A
Compliance Lead     C      C        C     C        A       C
Vertical Pack Lead  R      R        R     R        A(pack) R(pack)
QP / PRRC           -      -        -     -        A(MD/Pharma) C
Engineering Lead    R      R        C     R        -       C
Security Lead       R(sec) R        C     R(sec)   C       C
Privacy Lead        R(prv) R        C     R(prv)   C       C
AI Lead             R(AI)  R        C     R(AI)    C       R(AI)
Domain Lead         R      R        R     R        C       R
Validation Eng      C      C        C     C        -       C
SRE Lead            C      C        C     C        C       C
```

---

## 14. Cross-references

- H1 — regulatory landscape that frames risks
- H2 — validation depth driven by risk
- H3 — audit consumes risk register
- H4 — risk_record (EC-15) class
- H5 — retention for risk records
- H6 — periodic review of risks
- H7 — change emits risk delta
- H8 — CAPA mitigates risk
- L0..L5 — AI-specific risk discipline
- I3 — incidents update risks
- C4 — supplier risk
- I7/I8 — security + tenant risk
- M5 — SLO directory (operational risks)
- M6 — vendor-side risk register

---

## 15. Decision phrase

```
H9_RISK_MANAGEMENT_BASELINE_LOCKED
PART_H_DEEP_UPGRADE_COMPLETE
NEXT: PART_I_OPERATIONS/I0_PART_I_OVERVIEW.md
```
