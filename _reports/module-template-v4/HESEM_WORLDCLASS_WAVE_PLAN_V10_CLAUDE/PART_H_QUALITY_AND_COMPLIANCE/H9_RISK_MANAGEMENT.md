# H9 — Risk Management

```
chapter_purpose: how risk is identified, quantified, controlled,
                 reviewed, and tied to every other discipline; five
                 frameworks (ICH Q9, ISO 14971, AIAG-VDA FMEA,
                 ARP 4761, NIST AI RMF) operated through one substrate;
                 discovery sources, aggregation views, control catalog,
                 per-pack overlay, KPIs
owner_role:      Quality Lead with Vertical Pack Leads
sources:         ICH Q9(R1) 2023, ISO 14971:2019 + ISO/TR 24971,
                 AIAG-VDA FMEA Handbook 2019, AS/SAE ARP 4761,
                 ISO 31000:2018, IEC 62443-3-2, NIST SP 800-30 r1,
                 ISO/IEC 27005:2022, NIST AI RMF 1.0 (GOVERN/MAP/
                 MEASURE/MANAGE), NIST AI 600-1 (GenAI profile),
                 EU AI Act 2024/1689 Art 9, ISO/IEC 23894:2023,
                 ISO/IEC 42001:2023 (AI management system)
```

Risk is the silent driver of every other discipline in HESEM. Validation
depth is risk-driven (per H2 §3). Change classification is risk-driven
(per H7 §2). CAPA priority is risk-driven (per H8 §5). Vertical pack
control selection is risk-driven. AI feature deployment depth is risk-
driven (per L3). Audit scope is risk-driven (per H3 §3). This chapter
is the substrate that makes risk a first-class object rather than an
Excel side artifact divorced from execution.

---

## 1. Risk framework reconciliation

HESEM operates five frameworks through one canonical substrate (the
`risk_record` per H4 EC-15). Each framework contributes methodology,
scale definitions, and required outputs. All feed the same risk record
schema.

```
FRAMEWORK              SCOPE                 PRIMARY SCALE      KEY OUTPUTS
──────────────────────────────────────────────────────────────────────
ICH Q9(R1) 2023        Pharma quality risk   Prioritized risk   Risk file per
                                              list; severity ×   process/product;
                                              occurrence         risk-based
                                              qualitative        validation plan;
                                                                 risk communication
ISO 14971:2019         MD safety risk        Severity ×         Risk Management
                                              probability;       File (RMF); risk
                                              risk acceptability control list;
                                              per policy         benefit-risk
                                                                 analysis; RMR
AIAG-VDA FMEA 2019     Auto process/         Severity /         DFMEA; PFMEA;
                        product risk          Occurrence /       Action Priority
                                              Detection (S/O/D); (AP) H/M/L;
                                              Action Priority    7-step format
ARP 4761               Aero systems          Catastrophic /     FHA; PSSA; SSA;
                        safety               Hazardous / Major  FTA; FMECA;
                                              / Minor / No       CCA; DAL
                                              Effect; DAL        allocation
NIST AI RMF 1.0        AI risk               MAP / MEASURE /    AI risk profile
+ EU AI Act Art 9                             MANAGE; impact     per feature;
+ ISO/IEC 23894                               and likelihood     model card; kill-
                                              qualitative        switch criteria
──────────────────────────────────────────────────────────────────────
Additional: ISO 31000 provides the general risk language baseline;
NIST SP 800-30 + ISO/IEC 27005 cover IT/ISMS risk (used for I7
security risk records).
```

---

## 2. Risk record substrate (canonical fields)

The `risk_record` (EC-15, H4) stores all framework-specific risk entries
through one schema. Per-framework fields layer on top via a `framework_data`
JSONB column that holds framework-specific extensions.

```
risk_record {
  risk_id:                 UUID                # tenant-scoped
  tenant_id:               UUID
  framework:               ENUM(ICH_Q9, ISO_14971, AIAG_VDA, ARP_4761,
                                NIST_AI_RMF, ISO_27005, NIST_SP800_30,
                                INTERNAL)
  domain:                  ENUM(quality, safety, security, privacy, ai,
                                supply_chain, operational, compliance,
                                financial, environmental)
  hazard_or_threat:        TEXT                # what could go wrong
  sequence_or_scenario:    TEXT                # how it leads to harm
  harm:                    TEXT                # the adverse outcome
  exposed_population:      TEXT[]              # patient | operator |
                                               # consumer | data_subject |
                                               # environment | business
  severity:                INTEGER | TEXT      # framework-specific
  likelihood:              INTEGER | TEXT      # framework-specific
  detection:               INTEGER | null      # FMEA only (S/O/D)
  priority:                TEXT                # AP (auto) | acceptable
                                               # (ISO 14971) | DAL | etc.
  risk_controls:           JSONB[]             # list; per §9 catalog
  residual_severity:       INTEGER | TEXT
  residual_likelihood:     INTEGER | TEXT
  residual_priority:       TEXT
  benefit_risk_balance:    TEXT | null         # ISO 14971 §7.4 only
  acceptability:           BOOLEAN | null      # ISO 14971 §6 only
  acceptance_rationale:    TEXT | null         # where residual accepted
  acceptance_authority:    UUID[]              # signatories
  acceptance_expiry:       DATE | null         # re-evaluation due
  verification_evidence:   UUID[]             # EC refs (EC-5, EC-1, etc.)
  ownership:               UUID               # accountable person
  review_due:              DATE
  status:                  ENUM(OPEN, MITIGATED, ACCEPTED, RETIRED)
  linked_workflow:         TEXT | null        # Part D workflow ID
  linked_capability:       TEXT | null        # Part C capability ID
  linked_capa:             UUID[] | null      # EC-14 refs
  linked_change:           UUID[] | null      # EC-16 refs
  framework_data:          JSONB              # per-framework extensions
  created_at:              TIMESTAMPTZ
  superseded_by:           UUID | null
}
```

Framework-specific extensions in `framework_data`:
- **ICH Q9**: `tool` (FMEA/HAZOP/HACCP/PHA/bow-tie), `q9_risk_level`,
  `control_strategy_ref`
- **ISO 14971**: `hazard_category`, `harm_severity_iso`, `probability_iso`,
  `benefit_risk_conclusion`, `risk_control_option_analysis`, `rmf_section_ref`
- **AIAG-VDA**: `function`, `failure_effect`, `failure_mode`, `failure_cause`,
  `current_prevention_controls`, `current_detection_controls`, `sod_scores`,
  `action_priority`, `fmea_step` (1–7), `pfmea_or_dfmea`
- **ARP 4761**: `failure_condition`, `classification`, `dal`, `fha_ref`,
  `pssa_ref`, `ssa_ref`, `fta_min_cut_set`, `cca_type`
- **NIST AI RMF**: `ai_feature_id`, `rmf_function` (MAP/MEASURE/MANAGE),
  `impact_category`, `affected_ai_class`, `eu_ai_act_risk_class`,
  `govern_policies`, `measure_metrics`

---

## 3. Risk discovery sources (≥16)

Every regulated change (per H7) emits a risk-discovery query as Q20 of
the impact analysis: the change author must answer whether the change
introduces, modifies, or eliminates a risk. Yes routes to risk record
creation or update.

```
NO.  SOURCE                                OUTPUT RISK DOMAIN
──────────────────────────────────────────────────────────────────────
 1   Process FMEA / PFMEA                   Process quality + safety
 2   Design FMEA / DFMEA                    Product quality + safety
 3   Hazard Analysis per ISO 14971          MD safety (hazard list)
 4   Process Hazard Analysis (HACCP / PHA)  Food / pharma / chemical
 5   Functional Hazard Analysis             Aerospace (FHA per ARP 4761)
     (ARP 4761)
 6   PFMEA per OEM CSR                      Automotive process risk
 7   HARA / ASIL assessment                 Automotive functional safety
     (ISO 26262)
 8   Threat modeling (STRIDE per layer;     Cybersecurity risk
     LINDDUN per data class; MITRE
     ATT&CK + ATLAS quarterly)
 9   AI risk MAP (NIST AI RMF §2.2)         AI-specific risk
10   Supplier risk assessment               Supply chain risk
11   Periodic regulatory horizon scan        Compliance / regulatory risk
     (H1 §6)
12   Audit findings (H3)                     Verified control gaps
13   Incidents (I3 post-mortem)              Realized risk events
14   Customer complaints (D12)               Field-realized risk
15   Sub-processor or third-party changes    Third-party / vendor risk
16   New tenant onboarding (per H1 §5)       Tenant-specific compliance
                                             risk
17   M&A / divestiture scoping              Scope and data risk
18   Environmental / EHS assessment          Operational / regulatory
     (H6 R25)                                EHS risk
──────────────────────────────────────────────────────────────────────
```

---

## 4. ICH Q9(R1) instantiation — Pharma

ICH Q9(R1) (2023 revision) added emphasis on subjectivity reduction,
integration into product development, and bow-tie analysis as a
recognized tool.

```
STAGE              ACTIVITIES
──────────────────────────────────────────────────────────────────────
Initiation         Define risk question; assemble team; select tool
Risk Assessment    Identification: systematic hazard enumeration
                   Analysis: current controls; qualitative severity ×
                     occurrence matrix or quantitative where data exists
                   Evaluation: compare to risk acceptability criteria
Risk Control       Option analysis (eliminate, reduce, detect, accept)
                   Implementation: per H7 change control
                   Acceptance: explicit per §11
Risk Communication Internal reporting; regulator communication where
                   required; patient/user communication (labelling)
Risk Review        Periodic per H6 R06; event-triggered (change, CAPA,
                   incident, new data)
──────────────────────────────────────────────────────────────────────

SUPPORTED TOOLS
  FMEA / FMECA (process + design)
  HACCP-style for parenteral / sterile manufacturing
  HAZOP (Hazard and Operability Study) for batch processes
  PHA (Preliminary Hazard Analysis) for early-phase assessment
  Risk ranking and filtering (matrix-based)
  Decision tree (excipient assessment, impurity threshold)
  Statistical risk evaluation (process capability index)
  Bow-tie analysis (Q9R1 §4.3 newly recognized)

REQUIRED OUTPUTS (per product / process)
  Quality risk file with current status
  Risk-based validation plan (feeds H2 §3 tier selection)
  Risk-based supplier qualification plan (feeds C4)
  Risk-based change classification input (feeds H7 §2)
  Risk-based CAPA priority (feeds H8 §5)
  APR risk summary (feeds J1 APR lifecycle)
```

---

## 5. ISO 14971:2019 instantiation — Medical Device

```
ARTICLE   REQUIREMENT                    HESEM IMPLEMENTATION
──────────────────────────────────────────────────────────────────────
§4        General requirements;          Risk Management Plan (RMP) stored
          top-mgmt commitment            as EC-1 authoritative root;
                                         top-management policy as tenant
                                         regulatory profile field
§5        Risk analysis: intended use;   Hazard list (JSONB) in risk_record;
          hazard identification;         sequence of events documented in
          risk estimation                framework_data.harm_severity_iso
                                         + probability_iso
§6        Risk evaluation per policy     Acceptability matrix stored as
                                         tenant risk_acceptability_policy
                                         (EC-1); comparison per record at
                                         evaluation step
§7        Risk control: option analysis; risk_control list per §9; residual
          implementation; residual;      assessment after each control;
          benefit-risk; completeness     benefit_risk_balance field; §10
                                         completeness check
§8        Overall residual risk          Aggregate view per aggregation §8.7
§9        Risk management review         H6 R06 review + risk_review_event
                                         (EC-5)
§10       Post-production activities     PMS plan feeds risk_record updates;
                                         PSUR (EC-21) feeds §9 review
──────────────────────────────────────────────────────────────────────

KEY DELIVERABLES per device
  Risk Management Plan (RMP) — EC-1, product life + 10 yr
  Risk Management File (RMF) — aggregate EC-15 records
  Hazard identification checklist — per ISO/TR 24971 Annex C
  Risk control implementation evidence — EC-5 references
  Residual risk acceptability statement — signed EC-5
  Benefit-risk analysis — where residual is non-negligible
  Risk Management Report (RMR) — signed at design transfer
  PMS plan + reports feeding RMF updates — EC-21 class
  PSUR — EC-21; EU MDR Art 86 cadence
```

The acceptability policy is stored as a tenant-regulated document (EC-1)
under D7 lifecycle. The policy defines the severity × probability matrix
including the boundary between acceptable and non-acceptable residual risk.
Any change to the policy is a Class A CR per H7.

---

## 6. AIAG-VDA FMEA 2019 instantiation — Automotive

The 2019 AIAG-VDA joint handbook replaced RPN (Risk Priority Number) with
Action Priority (AP) to address the known deficiencies of RPN (different
S/O/D combinations producing the same RPN with very different risk profiles).

```
SCALE DEFINITIONS
  Severity (S 1–10):    consequence to the user or next process step
  Occurrence (O 1–10):  likelihood of failure cause given current
                          preventive controls
  Detection (D 1–10):   likelihood of failure being detected before
                          reaching the customer given current detection
                          controls

ACTION PRIORITY LOOKUP (from AIAG-VDA handbook Table 5–2)
  HIGH (H):   action mandatory; failure mode must be addressed
  MEDIUM (M): action recommended; team should address
  LOW (L):    action not required; team may decide to address

7-STEP APPROACH
  Step 1  Planning and Preparation (scope; team; boundary diagram)
  Step 2  Structure Analysis (system / subsystem / component tree)
  Step 3  Function Analysis (function net; functional relationships)
  Step 4  Failure Analysis (failure effect / mode / cause chain)
  Step 5  Risk Analysis (S/O/D scoring; AP determination)
  Step 6  Optimization (additional controls; AP re-evaluation)
  Step 7  Results Documentation (FMEA report; action tracking)
```

DFMEA (design) and PFMEA (process) are linked through shared Failure
Effect / Failure Mode / Failure Cause chains. PPAP submission (per J2)
requires current PFMEA as a Level 3+ element. OEM-specific FMEA
requirements (e.g., Ford AIAG-VDA alignment, VDA 6.3 audit correlation)
are stored as CSR overlays in the tenant regulatory profile (per H1 §7).

---

## 7. ARP 4761 instantiation — Aerospace

Top-down safety assessment for safety-critical aviation systems:

```
ASSESSMENT         TIMING           KEY OUTPUT
──────────────────────────────────────────────────────────────────────
FHA (Functional    Early concept;   Failure condition classification per
Hazard Assess.)    per function     function: Catastrophic (Cat.A),
                                    Hazardous (Cat.B), Major (Cat.C),
                                    Minor (Cat.D), No Effect (Cat.E);
                                    DAL allocation (DAL-A..E per
                                    DO-178C / DO-254)
PSSA (Prelim.      Architecture     Safety objective allocation to
System Safety      phase            architecture; failure probability
Assessment)                         requirements per DAL; architecture
                                    trade-off assessment
SSA (System        Detailed         Proof that architecture achieves PSSA
Safety             design           safety objectives; references FTA +
Assessment)                         FMECA results
FTA (Fault Tree    Per hazardous    Boolean logic tree; minimum cut sets;
Analysis)          condition        probability estimate ≤ allowable
                                    per FAR/CS requirements
FMECA (Failure     Component        Contributing failure modes + effects
Mode Effects +     level            + criticality; feeds SSA
Criticality)
CCA (Common        System level     Zonal safety analysis; particular
Cause Analysis)                     risks; common mode analysis
──────────────────────────────────────────────────────────────────────
```

DAL (Design Assurance Level) drives validation depth per H2 §3 and
software certification artifacts (DO-178C) or hardware certification
artifacts (DO-254). DAL-A (catastrophic) requires the highest evidence
density; DAL-E (no effect) has no software qualification requirement.

---

## 8. NIST AI RMF 1.0 + EU AI Act Art 9 instantiation

```
RMF FUNCTION    HESEM IMPLEMENTATION
──────────────────────────────────────────────────────────────────────
GOVERN          AI governance policies stored as EC-1 authoritative
                 roots (per L0); banned decisions catalog (L1 BD-1..
                 BD-N); accountability assignment per L1 RACI; model
                 card template (EC-23) captures governance assertions

MAP             Context and risk identification at AI feature creation
                 (L2 governance contract §§1–25 fields); intended use
                 and foreseeable misuse documented; affected populations
                 characterized; risk class (Tier-1/2/3 per L0 §3)
                 assigned; integration into H9 risk record with
                 framework = NIST_AI_RMF

MEASURE         Quantitative + qualitative performance measurement per
                 L3 model card fields; acceptance rate, calibration,
                 drift, bias, fairness (per L3 §5 KPI catalog);
                 red-team probe results per L4; comparison against
                 pre-deployment baseline

MANAGE          Prioritize risk response (suspend feature, add human
                 gate, reduce scope); respond per L4 remediation
                 discipline; monitor continuously per L3 §6; document
                 all risk decisions in model card + risk_record;
                 banned decisions enforced at runtime per L1 triple
                 defense

EU AI Act Art 9 Continuous risk management system across full AI lifecycle;
(high-risk AI)  reasonably foreseeable risks from intended use + misuse
                 identified; risk estimation and evaluation documented;
                 post-market monitoring data feeds periodic risk review;
                 risk management measures recorded and verified
──────────────────────────────────────────────────────────────────────
```

EU AI Act Annex III lists high-risk AI system categories. HESEM AI
features used in regulated manufacturing decisions (batch release
advisory, complaint trend analysis, inspection scheduling) are
presumptively high-risk under Annex III §5 (safety components of
products). These features require the full NIST AI RMF + Art 9
treatment, including an AI impact assessment document (EC-31 sub-type).

---

## 9. Per-tenant risk register

Each tenant's risk register is a query filter on the substrate by
tenant_id. Aggregation views available via E8 (Evidence API) and
surfaced on the Quality Trend Dashboard:

```
VIEW NO.  VIEW NAME                    DESCRIPTION
──────────────────────────────────────────────────────────────────────
V1        Heat map                     Severity × likelihood matrix;
                                        per domain; color-coded
V2        Pareto by domain             Top contributing domains per
                                        period; 80/20 concentration
V3        Trend over time              Open / mitigated / accepted counts
                                        over rolling 12 months
V4        Control coverage map         Which controls mitigate which risk
                                        IDs; visualizes control gaps
V5        Gap analysis                 Regulated risks without verified
                                        controls; export for audit
V6        Residual acceptability       Residual risks above acceptance
          dashboard                    threshold with policy reference
V7        Time-in-open aging           Age distribution per risk priority;
                                        identifies stagnant high-priority
                                        risks
V8        Linked CAPA health           Risks with open CAPAs vs. risks
                                        with no CAPA for uncontrolled status
V9        Linked validation freshness  Per H2 §13 freshness; risks whose
                                        control verification evidence is
                                        stale
V10       Evidence coverage            Per H4 expected vs. present for each
                                        risk control; highlights missing
                                        verification evidence
V11       AI risk sub-register         NIST AI RMF + EU AI Act Art 9 risks
                                        filtered by framework; per-feature
V12       Framework distribution       Count and severity distribution per
                                        framework (ICH Q9 / ISO 14971 /
                                        AIAG-VDA / ARP 4761 / AI RMF)
──────────────────────────────────────────────────────────────────────
```

---

## 10. Risk control catalog

Risk controls are regulated artifacts governed by D7 doc lifecycle.
Each control is typed from the following catalog:

```
TYPE           DEFINITION                      EXAMPLES
──────────────────────────────────────────────────────────────────────
PREVENTIVE     Reduces the likelihood of        Poka-yoke in EBR entry;
               failure occurring                dual-person check; SOP
                                                 with explicit step; work
                                                 instruction; sampling plan

DETECTIVE      Detects failure before it         SPC / IPQC chart; e-record
               reaches the customer or          audit trail review; alert
               patient                           threshold on anomaly
                                                 detection; redundant
                                                 verification step

COMPENSATING   Temporary replacement for a       Manual review where
               missing primary control; must    automation gap exists;
               be tracked for remediation       secondary check while
                                                 primary is being upgraded

RECOVERY       Minimizes harm after failure      Recall procedure (D12);
               occurs                           hold / quarantine; DR
                                                 runbook (I4); incident
                                                 response plan (I3)

TRANSFER       Shifts risk consequence to        Insurance; contractual
               another party; does not          indemnification clause;
               eliminate underlying hazard      sub-processor DPA
                                                 liability clause

ELIMINATE      Redesigns to remove the hazard    Remove feature causing
               entirely from the process        hazard; reformulate
                                                 product; change process
                                                 route

ACCEPT         Explicit acceptance of residual   Documented with benefit-
               risk with authority signatures    risk analysis per §11;
               and re-evaluation cadence         time-bounded; audit-
                                                 visible
──────────────────────────────────────────────────────────────────────
```

Each control record must specify:
- `implementation_evidence`: EC class refs confirming the control exists
- `verification_evidence`: EC class refs confirming the control works
- `effectiveness_measure`: quantitative or qualitative indicator
- `owner`: accountable role + person
- `verification_cadence`: how often effectiveness is re-confirmed (per H6)

A risk in OPEN status with no control that has current verification
evidence cannot be marked MITIGATED. The state machine guard enforces
this.

---

## 11. Cross-discipline integration

```
INTEGRATION            DIRECTION         CONCRETE COUPLING
──────────────────────────────────────────────────────────────────────
H2 Validation          Risk → H2         Risk class (Tier-1..5) drives
                                          validation depth per H2 §3;
                                          validation findings update risk
H7 Change control      H7 → Risk         Change IA answer to Q20 creates /
                        Risk → H7         updates risk records; change
                                          closure re-evaluates residual risk
H8 CAPA                Risk → CAPA       Risk class drives CAPA priority;
                        CAPA → Risk       CAPA closes control gap → reduces
                                          risk; CAPA effectiveness confirms
                                          risk reduction
H3 Audit               H3 → Risk         Audit findings = unverified control
                                          evidence; risk records updated
                                          post-audit per H6 R06
H6 Periodic review     H6 → Risk         R06 risk register review confirms
                                          control state; re-evaluates
                                          likelihood and detection
H5 Retention           Risk → H5         Compliance risks include retention
                                          failure; retention floor changes
                                          require risk reassessment
I3 Incident            I3 → Risk         Realized risk events → risk record
                                          severity/likelihood reassessed;
                                          realized-risk history validates
                                          or invalidates prior estimates
L0..L5 AI              Risk → L3         AI risk class determines lifecycle
                        L4 → Risk         stages + evidence depth; red-team
                                          findings update EC-15 records
C4 Supplier            C4 → Risk         Supplier risk assessment feeds
                                          supply chain domain risks
I8 Tenant ops          Risk → I8         Per-tenant risk profile aggregated
                                          for regulatory inspection readiness
──────────────────────────────────────────────────────────────────────
```

---

## 12. Acceptance and benefit-risk discipline

When residual risk (after all feasible controls) exceeds the acceptability
criterion defined in the tenant's risk acceptability policy:

```
PATH A  Reduce further
        Identify additional controls; implement via H7 CR;
        re-verify effectiveness; re-evaluate residual.

PATH B  Accept with documented benefit-risk analysis
        Required elements:
        (a) Benefit quantification: clinical benefit (MD), therapeutic
            benefit (Pharma), operational benefit, or business benefit
            — with concrete data, not qualitative assertion
        (b) Alternative analysis: document that less risky alternatives
            were considered and rejected with rationale
        (c) Residual harm population characterization: who is exposed
            to the accepted residual risk and at what magnitude
        (d) Acceptance authority signatures: Quality Lead + Compliance
            Lead + pack-specific (QP for Pharma; PRRC for MD);
            signatures are e-signature events (EC-2)
        (e) Communication: inform user / patient / regulator as
            required by applicable law (e.g., IFU disclosure for MD;
            labelling for Pharma)
        (f) Re-evaluation cadence: acceptance is time-bounded;
            `acceptance_expiry` date must be set; at expiry, risk is
            re-evaluated with updated data
```

The acceptance decision is stored as an authoritative record (EC-15
with `status = ACCEPTED`). Silence is not acceptance. A risk in OPEN
status with a passed `acceptance_expiry` is automatically escalated to
the Quality Lead and surfaced in H6 R06 as a required review item.

Acceptance cannot be reversed silently: if the acceptability basis
changes (e.g., new clinical data, new field complaint pattern), a new
risk_record version supersedes the old acceptance. The supersession is
anchored in the audit chain.

---

## 13. Per-pack risk overlay

### 13.1 Pharma Pack
- ICH Q9(R1) quality risk management applies to all product/process
  risks. Risk file is part of the batch record system.
- Critical Quality Attributes (CQAs) and Critical Process Parameters
  (CPPs) are risk-derived; their identification process is documented
  per ICH Q8(R2) design space risk assessment.
- Risk-based sampling (ICH Q10 §4.1): reduced sampling is permitted
  only with documented risk justification + process capability evidence.
- Annual Product Review (APR) review of risk file per ICH Q10 §3.2.4.
- Sterile sub-pack: contamination control strategy (Annex 1 §2.8)
  requires risk-based justification of each contamination control
  measure; risk file must address environmental monitoring thresholds.

### 13.2 Medical Device Pack
- ISO 14971:2019 is mandatory for all MD risk management. ISO/TR 24971
  provides implementation guidance and is treated as normative within
  HESEM MD Pack.
- Benefit-risk is required for all non-zero residual risks; "no harm
  expected" is not sufficient — probability × severity must be quantified.
- PRRC must confirm that the risk management file is complete and
  adequate before any EU market placement.
- SaMD risk classification per IMDRF Software as a Medical Device
  framework: Category I (low), II (medium serious), III (serious),
  IV (critical). Category determines validation depth and RMF evidence
  requirements.
- Post-market clinical follow-up (PMCF) and post-market surveillance
  (PMS) data are mandatory inputs to periodic risk review per EU MDR
  Art 83-86.

### 13.3 Automotive Pack
- AIAG-VDA FMEA 2019 is mandatory for PFMEA and DFMEA. RPN is no
  longer accepted; Action Priority (AP) is required.
- IATF 16949 §8.5.6.1 (control plan) links directly to PFMEA; the
  control plan references each control method documented in PFMEA Step 5.
- ISO 26262 functional safety risk assessment (HARA → ASIL allocation)
  is required for automotive E/E systems and software (automotive
  scope). ASIL D is the highest; ASIL A/QM are lower.
- ISO 21434 cybersecurity risk assessment (TARA — Threat Analysis and
  Risk Assessment) is required for connected vehicles and ECU software.
- OEM CSR risk requirements (e.g., Ford Q1 risk management requirements,
  GM BIQS risk-based audit selection) are stored in CSR overlays.

### 13.4 Aerospace Pack
- ARP 4761 is mandatory for aircraft-level safety assessment. ARP 4754A
  is mandatory for aircraft and system development assurance.
- DO-178C Software Levels (A–E) are derived from the failure condition
  classification in the FHA; Level A (catastrophic) requires the most
  rigorous evidence.
- DO-254 Design Assurance Levels for hardware follow the same FHA-driven
  allocation.
- NADCAP special process risk: for NADCAP-accredited processes (welding,
  NDT, chemical processing, etc.), the risk model must include accreditation
  gap risk; risk controls include NADCAP audit findings closure.
- Counterfeit part risk (AS5553 / AS6174): risk assessment for each
  procurement event in scope; risk controls include approved suppliers
  list (ASL) and physical inspection per IDEA-STD-1010.

### 13.5 Food Pack
- HACCP hazard analysis is the primary risk tool. Every HACCP plan
  includes: biological hazards (pathogens, toxins), chemical hazards
  (allergens, pesticides, processing chemicals), physical hazards, and
  radiological hazards where applicable (FSMA Part 117.130).
- FSMA Part 117 preventive controls risk analysis: for each significant
  hazard, a preventive control type is documented (process control,
  allergen control, sanitation control, supply chain control, or other).
- FSMA Part 121 (intentional adulteration): vulnerability assessment
  (VA) is a required risk assessment for each actionable process step.
- Risk-based recall planning: FSMA §117.139 requires the recall plan to
  reflect the risk profile of the products covered.
- EU Food Law (Regulation 178/2002) risk assessment principles: EFSA
  scientific opinion may inform biological hazard severity quantification.

---

## 14. KPIs

```
KPI-RM-01  Risk register completeness
           Definition: % of regulated capabilities (per H2 Tier-1/2)
                       that have at least one active risk_record in the
                       register with a current review_due date
           Target: 100%
           Alert: any Tier-1 capability with no risk record → SEV-3

KPI-RM-02  Risk review timeliness
           Definition: % of risk records reviewed on or before
                       review_due (per H6 R06 cadence)
           Target: 100%
           Alert: any overdue regulated risk → SEV-2 escalation

KPI-RM-03  Control effectiveness coverage
           Definition: % of risk controls with verification_evidence
                       that is current (within the H6 R06 review cycle)
           Target: ≥ 95% for Tier-1 controls; 100% for Class A risks
           Alert: < 90% → H8 CAPA on control verification process

KPI-RM-04  Accepted risk re-evaluation rate
           Definition: % of accepted risks (status = ACCEPTED) that
                       have had their acceptance_expiry date honored
                       (re-evaluated before expiry)
           Target: 100%
           Alert: any expired acceptance → automatic Quality Lead
                  escalation; surfaced in H6 R06

KPI-RM-05  Risk down-rate compliance
           Definition: % of risk priority / severity down-ratings that
                       have a dual-reviewer approval and documented
                       rationale (preventing risk-washing)
           Target: 100%
           Alert: any unilateral down-rate → audit finding; CAPA

KPI-RM-06  AI risk coverage
           Definition: % of deployed AI features (per L2 catalog)
                       with a current risk_record using framework =
                       NIST_AI_RMF + EU AI Act (where applicable)
           Target: 100%
           Alert: any AI feature without risk record → feature blocked
                  from production per L3 gate G-RISK

KPI-RM-07  Cross-pack risk propagation rate
           Definition: % of risk discoveries affecting multiple packs
                       that are reflected in risk records for all
                       affected packs within 5 business days
           Target: 100%
           Alert: miss → H8 CAPA on risk propagation process

KPI-RM-08  Risk-to-CAPA linkage
           Definition: % of Class A risks (priority = HIGH / AP = H /
                       catastrophic-hazardous classification) that have
                       at least one linked open or recently-closed CAPA
           Target: 100%
           Alert: Class A risk with no CAPA → immediate Quality Lead
                  review
```

---

## 15. Failure modes

```
FM1   Risk register stale (review_due passed with no review)
      Prevention: H6 R06 scheduler escalates per J2 overdue logic;
                  SEV-2/3 raised per class
      Recovery:   Rapid review convened; risk re-evaluated; if
                  regulated certification relies on this risk file,
                  compliance certification may be at risk

FM2   Risk identified but no control assigned
      Prevention: state machine blocks MITIGATED status without
                  ≥ 1 control with verification evidence
      Recovery:   CR opened to introduce control (H7); interim
                  acceptance with explicit scope and expiry

FM3   Control fails effectiveness verification
      Prevention: H6 R06 reviews verification evidence currency
      Recovery:   Control marked INEFFECTIVE; risk re-rated upward;
                  CAPA opened (H8); control redesign per H7

FM4   Risk down-rated to avoid action (risk-washing)
      Prevention: dual-reviewer required for any down-rate; H3
                  audit checks distribution of risk ratings over time
      Recovery:   H3 audit finding; CAPA; independent re-evaluation;
                  rating restored

FM5   Acceptance signed without quorum
      Prevention: acceptance signature panel enforces all required
                  signatories per §11 before acceptance is recorded
      Recovery:   Acceptance voided; re-evaluation; correct signatories
                  obtained

FM6   Cross-pack risk not propagated (shared component)
      Prevention: risk discovery scope field captures pack reach;
                  propagation check at H7 IA Q20
      Recovery:   Retroactive propagation; affected pack leads notified;
                  CAPA on risk propagation process

FM7   AI risk classified as IT risk (wrong framework)
      Prevention: AI-domain risks require framework = NIST_AI_RMF;
                  intake validates AI feature ID against L2 catalog
      Recovery:   Reclassify; re-assess per correct framework;
                  AI Lead review; L4 implications assessed

FM8   Accepted risk never re-evaluated (acceptance_expiry ignored)
      Prevention: H6 R06 job surfaces expired acceptances as
                  overdue review items; cannot be dismissed without
                  review action
      Recovery:   Risk re-evaluated with current data; acceptance
                  renewed or escalated; CAPA if control gap found

FM9   Realized risk not back-fed from incident
      Prevention: I3 incident close requires risk_record update field
                  to be populated before CLOSED state is reachable
      Recovery:   Back-feed retroactively; risk re-rated; CAPA on
                  incident close discipline

FM10  FMEA not updated after process change (automotive stale PFMEA)
      Prevention: H7 CR Q20 requires PFMEA reference check for
                  automotive-context changes; PPAP gate includes
                  current PFMEA evidence
      Recovery:   PFMEA updated; AP re-evaluated; if AP changes to H,
                  Class A CAPA; customer notification per CSR requirement
```

---

## 16. Roles and authority (RACI)

```
FUNCTION           QL   CL   VPL  QP    EL   SecL  PL   AIL  DL   ValE
────────────────────────────────────────────────────────────────────────
Discovery          R    C    R    -     R    R(sec) R(prv) R(AI) R  C
Framework select   A    C    R    -     C    -      -     R     C  C
Risk analysis      A    C    R    C     R    R(sec) R(prv) R(AI) R  C
Risk evaluation    A    C    R    A(pk) C    C      C     C     R  C
Control design     A    C    R    C     R    R(sec) R(prv) R(AI) R  R
Acceptance (A-cls) A    A    A    A(pk) C    C      C     C     C  -
Periodic review    A    C    R    C     C    C      C     R     R  C
Risk register mgmt A    C    R    -     C    -      -     -     R  -
AI risk            A    C    R    -     C    C      C     A     C  R
────────────────────────────────────────────────────────────────────────
QL=Quality Lead, CL=Compliance Lead, VPL=Vertical Pack Lead,
QP=Pharma QP / MD PRRC (pack-specific), EL=Eng Lead,
SecL=Security Lead, PL=Privacy Lead, AIL=AI Lead, DL=Domain Lead,
ValE=Validation Eng
```

---

## 17. Cross-references

- H1 — regulatory landscape frames compliance risks; notification windows
- H2 — validation depth driven by risk class (Tier-1..5 per §3)
- H3 — audit consumes risk register; audit findings update risk records
- H4 — risk_record (EC-15) class definition and schema
- H5 — retention for EC-15 (supersession + 10 yr; product life + 10 yr MD)
- H6 — periodic review R06 (risk register review)
- H7 — change emits risk delta at Q20; change closure re-evaluates residual
- H8 — CAPA mitigates risk; risk drives CAPA class priority
- L0..L5 — AI-specific risk discipline; AI risk records per framework
- I3 — incidents update realized risk records
- C4 — supplier risk feeds supply_chain domain risk records
- I7 / I8 — security + tenant risk (ISO/IEC 27005 + NIST SP 800-30)
- M5 — SLO directory operational risks
- M6 — vendor-side risk register (HESEM-the-vendor risks)

---

## 18. Decision phrase

```
S4-05_H8_H9_DEEP_UPGRADE_COMPLETE
```

After: load S4-06_I1_I2.md.
