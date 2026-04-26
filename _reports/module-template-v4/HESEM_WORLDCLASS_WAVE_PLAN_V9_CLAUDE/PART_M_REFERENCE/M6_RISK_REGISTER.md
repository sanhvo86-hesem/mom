# M6 — Risk Register (Vendor / Program Level)

```
chapter_purpose: HESEM-the-vendor's program-level risk register;
                 every risk with rating, controls, owner, status,
                 indicator, response. Monthly review owner accountable.
                 Distinct from per-tenant risk registers (per H9 §8).
owner_role:      Head of Engineering (the user) with Compliance Lead
                 with Security Lead with AI Lead
sources:         ISO 31000:2018, ICH Q9(R1) (informs methodology),
                 NIST SP 800-30 (informs scoring), ISO/IEC 27005,
                 NIST AI RMF 1.0
```

This is the vendor-side register. It tracks risks to HESEM the
business + platform + program. Per-tenant risks live per H9 in each
tenant's register; per-pack risks in the pack chapter.

Rating scale: severity × likelihood; expressed as
CRITICAL / HIGH / MEDIUM / LOW. Status: OPEN / MITIGATED / ACCEPTED /
RETIRED.

---

## 1. Strategic risks

```
R-S1   VERTICAL PACK SCOPE CREEP                    HIGH    OPEN
       Driver:      ambition to serve Pharma / MD / Auto / Aero / Food
                    simultaneously
       Indicator:    velocity per pack vs plan; engineering team load
       Controls:     pack-by-pack release per J0; freeze pack scope
                    before W10; CSR overlay isolation per H1 §7
       Owner:        Head of Engineering
       Review:       monthly

R-S2   PRE-PRODUCTION POSTURE VIOLATED              HIGH    OPEN
       Driver:      time pressure to claim production-readiness before
                    full validation
       Indicator:    forbidden vocabulary in artifacts ("production
                    go-live", "production cutover")
       Controls:    ADR-0001 frozen; CI grep blocks forbidden words;
                    READING_DISCIPLINE.md Rule 4; per-PR review
       Owner:        Head of Engineering with Compliance Lead
       Review:       per release

R-S3   SINGLE FOUNDER DEPENDENCY                    MEDIUM  OPEN
       Driver:      domain knowledge concentration in one person
       Indicator:    bus factor analysis per role
       Controls:     V9 + ADRs as durable record; cross-training cycle;
                    pair-on-critical-work convention
       Owner:        Founder
       Review:       quarterly

R-S4   UNDERFUNDED VALIDATION DISCIPLINE             HIGH    OPEN
       Driver:      validation work is invisible until audit; under-
                    invested in early waves
       Indicator:    validation evidence freshness per H2 §13;
                    customer audit findings rate
       Controls:    H2 lifecycle; CS-B continuous validation stream;
                    annual budget allocation per validation team
       Owner:        Quality Lead with Head of Engineering
       Review:       quarterly + annual budget cycle

R-S5   COMPETITIVE / SUBSTITUTION                    MEDIUM  OPEN
       Driver:      mature competitors (Veeva, MasterControl, Sparta,
                    QAD, IFS, Plex) capture target market
       Indicator:    win rate; deal cycle time; competitive losses
       Controls:    per K2 GTM; vertical specialization; world-class
                    differentiator (depth of plan, AI integration)
       Owner:        CEO + Head of Sales
       Review:       quarterly

R-S6   REGULATORY HORIZON SHIFT                      MEDIUM  OPEN
       Driver:      regulators add new requirements (e.g., AI Act
                    Annex III update; FSMA §204 enforcement)
       Indicator:    horizon scan output (per H1 §6)
       Controls:     monthly horizon scan; H7 Class A change for
                    in-scope updates; pack-specific monitoring
       Owner:        Compliance Lead per pack
       Review:       monthly
```

---

## 2. Architectural risks

```
R-A1   OTG AXIOM VIOLATION IN PRODUCTION              HIGH    OPEN
       Driver:      bug in axiom check; data-state desync
       Indicator:    SLO-6 (must be 0 events / 7d)
       Controls:    RB-INC-005 runbook; daily axiom check in CS-B;
                    nightly L4 verification per L1 §6
       Owner:        Platform Lead
       Review:       weekly

R-A2   AUDIT CHAIN ANCHOR FAILURE                     HIGH    OPEN
       Driver:      anchor service outage; key compromise; storage
                    failure
       Indicator:    SLO-10 (anchor lag < 25h)
       Controls:    redundant anchor service; external timestamp
                    authority backup (RFC 3161); RB-INC-004
       Owner:        Platform Lead with Security Lead
       Review:       weekly

R-A3   TENANT BOUNDARY BREACH                          CRITICAL OPEN
       Driver:      query-layer bug; misconfigured RBAC; auditor portal
                    escape
       Indicator:    SLO-19 (must be 0 events / year)
       Controls:    row-level isolation per B6 C5; integration test;
                    auditor scoped portal per H3 §7;
                    per-PR cross-tenant test
       Owner:        Platform Lead with Security Lead
       Review:       continuous

R-A4   SCHEMA DRIFT (RFC 9457 vs spec)                  MEDIUM  OPEN
       Driver:      manual API code edit out of spec
       Indicator:    SLO-21 (0 events / sprint)
       Controls:    spec-first generation; CI schema check;
                    contract drift detection per I1 W2 gate
       Owner:        Engineering Lead per domain
       Review:       per release

R-A5   MATERIALIZED VIEW FALLS BEHIND                  MEDIUM  OPEN
       Driver:      partition imbalance; consumer outage
       Indicator:    SLO-5 / SLO-14 (freshness)
       Controls:    replay tooling per B6 C2; consumer health
                    monitoring; partition rebalance plan
       Owner:        Platform Lead
       Review:       weekly

R-A6   SAGA COMPENSATION INCOMPLETE                    HIGH    OPEN
       Driver:      partial compensation leaves system in bad state
       Indicator:    saga ledger unfinished compensations
       Controls:    chaos testing per W5 gate; compensation paths
                    proven per saga
       Owner:        Workflow team
       Review:       per release

R-A7   CDC LAG SUSTAINED                                MEDIUM  OPEN
       Driver:      consumer crash; downstream provider lag
       Indicator:    SLO-13 (CDC consumer lag < 60s)
       Controls:    consumer health checks; auto-restart;
                    RB-INC-001
       Owner:        Integration team
       Review:       continuous

R-A8   EDGE GATEWAY DROP                                MEDIUM  OPEN
       Driver:      facility network outage; firmware issue
       Indicator:    SLO-21 edge uptime
       Controls:    local buffer + replay; RB-INC-003 +
                    RB-INC-011
       Owner:        Edge team
       Review:       per facility
```

---

## 3. AI-specific risks (per L0..L5)

```
R-AI-1   AI COMMITS A BANNED DECISION                CRITICAL OPEN
         Driver:      L1 boundary slip
         Indicator:    SLO-22 (0 attempts / quarter); banned-decision
                      attempt count
         Controls:    triple defense per L1 §6 (CI + runtime + offline);
                      RB-INC-019
         Owner:        AI Lead with Security Lead
         Review:       continuous + quarterly red-team

R-AI-2   HALLUCINATED CITATION                         HIGH    OPEN
         Driver:      LLM ungrounded output
         Indicator:    L4 SEV-4 hallucination findings;
                      override-rate analytic
         Controls:    RAG grounding required per L2 §3;
                      "no answer found" abstention path
         Owner:        AI Lead
         Review:       monthly

R-AI-3   BIAS IN TRAINING DATA                         HIGH    OPEN
         Driver:      historical data reflects historical bias
         Indicator:    L4 fairness probe outcomes
         Controls:    red-team probe per L4 §2.2; quarterly review
                      per L3 §4; per-attribute slice metric
         Owner:        AI Lead with Privacy Lead
         Review:       quarterly

R-AI-4   ACCEPTANCE RATE DRIFT                         MEDIUM  OPEN
         Driver:      user disengagement; data drift; prompt change
         Indicator:    KPI per L2 §6
         Controls:    KPI drift detection per L3 §4; retraining
                      trigger
         Owner:        AI Lead
         Review:       monthly

R-AI-5   MODEL SUPPLY CHAIN COMPROMISE                 HIGH    OPEN
         Driver:      sub-processor breach; model artifact tamper
         Indicator:    L4 LLM05 verification
         Controls:    signed dependencies per L4 §3 LLM05;
                      provider DPA + cyber posture review
         Owner:        Security Lead with AI Lead
         Review:       quarterly

R-AI-6   PROMPT INJECTION SUCCESS                      HIGH    OPEN
         Driver:      adversarial user / poisoned RAG corpus
         Indicator:    L4 LLM01 probe outcomes
         Controls:    system-prompt isolation; tenant-content
                      quarantine; output sanitization per L2 §3
         Owner:        AI Lead with Security Lead
         Review:       quarterly

R-AI-7   PROVIDER MODEL UPGRADE BREAKS BEHAVIOR         MEDIUM  OPEN
         Driver:      sub-processor LLM upgrade silently changes
         Indicator:    behavior shift detection (per L3 §4)
         Controls:    treated as Class B change per L3 §8;
                      comparative shadow per §5
         Owner:        AI Lead
         Review:       per provider release

R-AI-8   AI FEATURE COST RUNAWAY                        MEDIUM  OPEN
         Driver:      provider price change; usage spike
         Indicator:    SLO-18 cost compliance + L2 envelope
         Controls:    per L2 §9 cost-aware routing; degraded mode
         Owner:        FinOps Lead with AI Lead
         Review:       monthly
```

---

## 4. Compliance / regulatory risks

```
R-C1   AUDIT FAILURE                                  HIGH    OPEN
       Driver:      gaps in evidence; weak processes
       Indicator:    audit findings count + severity
       Controls:    H3 audit program; quarterly internal audit;
                    annual external; readiness drill per H3 §8
       Owner:       Compliance Lead with Quality Lead
       Review:      quarterly

R-C2   VALIDATION GAP                                 HIGH    OPEN
       Driver:      tier mis-classification; validation skip
       Indicator:    SLO-20 freshness; trace-gap rate
       Controls:    H2 lifecycle; risk-based per H9; CS-B continuous
                    validation
       Owner:       Quality Lead
       Review:      monthly

R-C3   RETENTION POLICY GAP                            MEDIUM  OPEN
       Driver:      class mis-tagged; floor too short
       Indicator:    deletion-event review; retention audit
       Controls:    per H5; periodic retention check;
                    longer-of rule for cross-jurisdiction
       Owner:       Compliance Lead with Privacy Lead
       Review:      quarterly

R-C4   CMMC / ITAR BREACH (AEROSPACE)                  CRITICAL OPEN
       Driver:      access mis-granted; cross-region leak
       Indicator:    person-of-record verification gap; access review
                    finding
       Controls:    J3 §5 controls; US-only deployment for ITAR;
                    quarterly access review per I7 §3
       Owner:       Aerospace Lead with Security Lead
       Review:      quarterly + on-event

R-C5   FDA QSR / MDR / ANNEX 11 BREACH (PHARMA / MD)   CRITICAL OPEN
       Driver:      data integrity failure; vigilance window missed
       Indicator:    H1 §3 windows; data integrity check
       Controls:    per J1 + J4 packs; continuous CS-B
       Owner:       Pharma Lead / MD Lead with Compliance Lead
       Review:      monthly

R-C6   GDPR / CCPA / PIPL BREACH                        HIGH    OPEN
       Driver:      cross-tenant breach; sub-processor incident
       Indicator:    privacy incident count; subject-rights timeliness
       Controls:    per H5 + I7 §9; DPA + ROPA; pseudonymization
       Owner:       Privacy Lead with Compliance Lead
       Review:      quarterly

R-C7   IATF 16949 CERT LOSS (AUTO)                      HIGH    OPEN
       Driver:      surveillance audit major finding; CSR drift
       Indicator:    audit findings; CSR conformance
       Controls:    per J2 pack; LPA discipline; CSR overlay
                    governance
       Owner:       Auto Lead
       Review:      per cert cycle

R-C8   AS9100D / NADCAP CYCLE FAILURE (AERO)            HIGH    OPEN
       Driver:      cycle missed; finding not closed
       Indicator:    cycle calendar adherence
       Controls:    per J3; H6 cadence; cycle reminders
       Owner:       Aerospace Lead
       Review:      per cycle

R-C9   FSMA §204 READINESS GAP (FOOD)                    HIGH    OPEN
       Driver:      KDE/CTE incomplete by 2026 enforcement
       Indicator:    mock recall trace coverage
       Controls:    per J5; mock recall cadence; tenant onboarding
                    readiness
       Owner:       Food Lead
       Review:      monthly through enforcement
```

---

## 5. Operational risks

```
R-O1   MAJOR INCIDENT RESPONSE TOO SLOW                 MEDIUM  OPEN
       Driver:      runbook stale; rotation thin
       Indicator:    SEV-1 ack time; SEV-1 resolve time
       Controls:    I3 SEV classification; quarterly game days;
                    runbook freshness per H6
       Owner:       SRE Lead
       Review:      quarterly

R-O2   DR / BACKUP NOT EXERCISED                         HIGH    OPEN
       Driver:      drill skipped or failed
       Indicator:    SLO-17 cadence; drill outcomes
       Controls:    I4 quarterly drill; STOP-5 program halt on
                    2 consecutive failures
       Owner:       SRE Lead
       Review:      quarterly

R-O3   CAPACITY CRUNCH / COST OVERRUN                    MEDIUM  OPEN
       Driver:      tenant growth out-pacing plan; AI cost spike
       Indicator:    SLO-18 cost; capacity headroom
       Controls:    I5 capacity plan; I6 cost governance review
                    monthly; per-tenant tier enforcement
       Owner:       FinOps Lead with SRE Lead
       Review:      monthly

R-O4   KEY PERSONNEL ATTRITION                            MEDIUM  OPEN
       Driver:      compensation gap; burnout
       Indicator:    voluntary turnover; bus-factor per role
       Controls:    V9 + ADRs as durable record; pair-on-critical;
                    per K5 + HR retention
       Owner:       Founder + HR
       Review:      quarterly

R-O5   SUB-PROCESSOR OUTAGE / DEPRECATION                 MEDIUM  OPEN
       Driver:      cloud / AI provider outage or pricing change
       Indicator:    provider SLA + roadmap
       Controls:    multi-cloud where feasible; provider DPA
                    notification; alternative path per L2 §2
                    on_failure_behavior
       Owner:       Platform Lead
       Review:      annual + on-event

R-O6   RANSOMWARE                                          HIGH    OPEN
       Driver:      attacker compromise
       Indicator:    EDR + anomaly detection
       Controls:    per I4 §6 + I7; air-gap backup; immutable
                    storage; quarterly drill
       Owner:       Security Lead
       Review:      quarterly + on-event

R-O7   SUPPLY-CHAIN DEPENDENCY KEV                          HIGH    OPEN
       Driver:      KEV-listed CVE in our stack
       Indicator:    SLO-19 patch SLA
       Controls:    KEV-aware monitoring; SLSA L3+; per I7 §6
       Owner:       Security Lead
       Review:      continuous
```

---

## 6. Customer / commercial risks

```
R-X1   CUSTOMER CONCENTRATION                          MEDIUM  OPEN
       Driver:      revenue concentrated in few customers
       Indicator:    top-N customer % of ARR
       Controls:    per K2 GTM diversification; per pack expansion
       Owner:       CEO + CFO
       Review:      quarterly

R-X2   CUSTOMER REGULATORY ACTION                       HIGH    OPEN
       Driver:      customer receives 483 / Form 482 / EMA finding
                    in scope of HESEM
       Indicator:    customer regulatory exposure
       Controls:    per H1 §3 awareness; CSM proactive;
                    H8 systemic CAPA
       Owner:       Compliance Lead with CSM
       Review:      per event

R-X3   CUSTOMER VALIDATION FAILURE                       HIGH    OPEN
       Driver:      customer-side validation insufficient
       Indicator:    customer-side audit finding; CVLP gaps
       Controls:    per H2 §14 CVLP; customer support per K5
       Owner:       CSM with Quality Lead
       Review:      per onboarding

R-X4   CHURN ABOVE PLAN                                   MEDIUM  OPEN
       Driver:      product fit issues; pricing; support quality
       Indicator:    NRR / GRR; CSAT
       Controls:    per K5 customer success; QBR cadence;
                    health score monitoring
       Owner:       Head of CS
       Review:      monthly
```

---

## 7. Financial / business risks

```
R-F1   CASH RUNWAY                                      MEDIUM  OPEN
       Driver:      capital raise timing
       Indicator:    runway months
       Controls:    per K4 funding path; cost discipline
       Owner:       CEO with CFO
       Review:      monthly

R-F2   M&A / ACQUISITION OFFER                            LOW    OPEN
       Driver:      strategic offer received
       Indicator:    market signals
       Controls:    board / founder discretion
       Owner:       CEO + Board
       Review:      ad-hoc

R-F3   CONTRACT EXPOSURE (SLA PENALTIES)                  MEDIUM  OPEN
       Driver:      SLA breach with penalty clause
       Indicator:    SLO performance vs SLA promised
       Controls:    internal SLO stricter than SLA; periodic
                    review per legal
       Owner:       Legal with FinOps
       Review:      quarterly
```

---

## 8. Risk-review cadence + governance

```
MONTHLY        full register reviewed; status updates;
                indicators trended
QUARTERLY      strategic + executive review with CEO; resource
                allocation decisions
ANNUAL         comprehensive re-rating; new risk discovery;
                control effectiveness review
ON-EVENT       per incident / audit finding / regulator update;
                affected risks re-rated
```

Risk decisions follow ICH Q9 + ISO 31000: identify → analyze →
evaluate → control → communicate → review. Acceptance requires
explicit signoff per H9 §11.

---

## 9. Decision phrase

```
M6_RISK_REGISTER_BASELINE_LOCKED
NEXT: M7_DECISION_PHRASES.md
```
