# M6 — Risk Register (Vendor / Program Level) (V10)

```
chapter_id:     M6
version:        V10
chapter_purpose: HESEM-the-vendor's program-level risk register;
                 ≥50 risks across ≥7 categories; every risk has rating,
                 driver, indicator, controls, owner, review cadence,
                 status, and cross-link to mitigation chapters (H8, L4).
                 Distinct from per-tenant risk registers (per H9 §8).
owner_role:     Head of Engineering (the user) with Compliance Lead,
                Security Lead, AI Lead, FinOps Lead
cross_refs:     H8 (systemic CAPA / corrective action), H9 (risk
                assessment methodology), L4 (AI red-team and monitoring),
                I3 (incident response), I4 (DR), I7 (security),
                J1-J5 (per-pack compliance obligations)
sources:        ISO 31000:2018, ICH Q9(R1) (risk methodology),
                NIST SP 800-30 (scoring), ISO/IEC 27005,
                NIST AI RMF 1.0, OWASP Top 10 LLM 2025
```

## Overview

This register tracks risks to HESEM as a business, platform, and regulated software program. Per-tenant risks are maintained per H9 §8 in each tenant's own risk register. Per-pack technical risks are documented in the respective J1-J5 pack chapters. This document is the authoritative vendor-level register.

**Rating scale:** Severity × Likelihood, expressed as CRITICAL / HIGH / MEDIUM / LOW.

- CRITICAL: Existential threat (regulatory shutdown, catastrophic data breach, loss of certification, irreversible legal liability)
- HIGH: Significant business or compliance impact; requires active mitigation; may trigger SEV-1 or regulatory finding
- MEDIUM: Manageable with controls; degraded quality or delayed delivery; escalates to HIGH if indicator triggers
- LOW: Minor or remote; monitored but not actively mitigated beyond baseline controls

**Status:** OPEN / MITIGATED / ACCEPTED / RETIRED

**Mitigation cross-links:** H8 (systemic CAPA when a risk becomes an incident); L4 (AI-specific monitoring and red-team evidence); I7 (security controls); I4 (DR/backup evidence). These links ensure that when a risk triggers a control failure, the H8 CAPA process is initiated and the corrective action is tracked to closure.

---

## 1. Strategic Risks

```
R-S1   VERTICAL PACK SCOPE CREEP                         HIGH    OPEN
       Driver:      Ambition to serve J1 Pharma / J2 Auto / J3 Aero /
                    J4 Med Device / J5 Food simultaneously without
                    sufficient team depth; cross-pack shared components
                    create unplanned regression surface.
       Indicator:   Velocity per pack vs. plan (weekly burn chart);
                    engineering team load factor > 90%; inter-pack
                    issue coupling rate.
       Controls:    Pack-by-pack release sequencing per J0 chapter;
                    freeze pack scope before W10; CSR overlay isolation
                    per H1 §7; explicit pack backlog ownership;
                    quarterly scope review by CTO.
       Owner:       Head of Engineering
       Review:      Monthly (scope board) + quarterly (executive)
       H8 Link:     If scope creep causes a missed release gate, H8
                    systemic CAPA initiated with root cause on planning
                    discipline.

R-S2   PRE-PRODUCTION POSTURE VIOLATED                   HIGH    OPEN
       Driver:      Time pressure from investors or customers to claim
                    production-readiness before GAMP5 validation is
                    complete and quality gates are passed.
       Indicator:   Forbidden vocabulary detected in public-facing
                    artifacts ("production go-live", "production
                    cutover", "production release"); ADR-0001 override
                    requests; SLO-20 (validation evidence) non-current.
       Controls:    ADR-0001 frozen; CI grep blocks forbidden vocabulary
                    per ADR-0001 §5; READING_DISCIPLINE.md Rule 4; per-PR
                    review checklist; Compliance Lead co-signs all public
                    materials.
       Owner:       Head of Engineering with Compliance Lead
       Review:      Per release + on-event

R-S3   SINGLE FOUNDER DOMAIN KNOWLEDGE DEPENDENCY        MEDIUM  OPEN
       Driver:      Deep domain knowledge (HESEM architecture, 14-domain
                    model, regulatory mapping, AI discipline) concentrated
                    in one person; creates bus-factor-1 situation for
                    critical design decisions.
       Indicator:   Bus factor analysis per role (target: ≥2 people for
                    every critical decision surface); decision log gap
                    rate; knowledge transfer completion per K5 §12.
       Controls:    V10 wave plan as durable externalized knowledge record;
                    ADRs frozen; cross-training cycle in Phase 1-2; pair-
                    on-critical-work convention per K5 ways of working;
                    succession plan for each critical role.
       Owner:       Founder
       Review:      Quarterly

R-S4   UNDERFUNDED VALIDATION DISCIPLINE                  HIGH    OPEN
       Driver:      CS-B (validation stream) requires 3 FTE with
                    regulatory expertise; in Phase 0-1, this team is
                    under-resourced; validation work is invisible until
                    an audit finds a gap.
       Indicator:   Validation evidence freshness per SLO-20; trace gap
                    rate per H2 §13; customer audit findings referencing
                    HESEM; CVLP on-schedule rate.
       Controls:    H2 lifecycle with mandatory evidence emission at each
                    SM transition (cannot be skipped by SM guard condition
                    chain); CS-B continuous validation stream with
                    dedicated headcount; annual budget allocation for
                    validation team; CVLP delivery metrics per K5 §7.2.
       Owner:       Quality Lead with Head of Engineering
       Review:      Quarterly + annual budget cycle

R-S5   COMPETITIVE SUBSTITUTION                           MEDIUM  OPEN
       Driver:      Mature competitors (Veeva, MasterControl, Sparta,
                    QAD, IFS, Plex, TraceLink) with larger sales teams,
                    deeper reference customer bases, and established
                    analyst relations capture target market segments
                    before HESEM achieves sufficient scale.
       Indicator:   Win rate by segment; deal cycle time; competitive
                    loss reasons; analyst coverage (Gartner/Forrester);
                    partner reference availability.
       Controls:    Per K2 GTM differentiation; vertical specialization
                    depth that generalists cannot match; AI integration
                    depth (advisory quality); proof-of-concept win rate;
                    reference customer program per K3.
       Owner:       CEO + Head of Sales
       Review:      Quarterly

R-S6   REGULATORY HORIZON SHIFT                           MEDIUM  OPEN
       Driver:      Regulators issue new requirements (AI Act Annex III
                    high-risk AI update; FSMA §204 KDE/CTE expansion;
                    EMA Annex 11 revision; FDA 21 CFR Part 11 update;
                    CMMC 2.0 new domains) that invalidate current
                    compliance architecture.
       Indicator:   Monthly horizon scan output per H1 §6; regulatory
                    agency bulletin subscriptions (FDA, EMA, MHRA, TGA,
                    CDSCO, NMPA, ANMAT); industry association alerts.
       Controls:    Monthly regulatory horizon scan per H1 §6; H7 Class A
                    change required for any in-scope regulatory update;
                    pack-specific monitoring by pack lead; legal counsel
                    retainer for regulatory interpretation.
       Owner:       Compliance Lead (cross-pack) + pack leads (per-pack)
       Review:      Monthly

R-S7   ENGINEERING TALENT MARKET TIGHTENING               MEDIUM  OPEN
       Driver:      Specialist talent for regulated manufacturing software
                    (GAMP5, domain expertise + software engineering) is
                    scarce; competition from large tech firms on
                    compensation; visa/relocation friction in Vietnam.
       Indicator:   Time-to-fill per role vs. plan; offer acceptance rate;
                    recruiting pipeline conversion; compensation benchmark
                    delta vs. market (run annually).
       Controls:    Per K5 §12 hiring sequence and compensation framework;
                    attractive equity package (ESOP 15-20% fully diluted
                    per K4); remote/hybrid flexibility; employer brand
                    investment; university partnerships; attrition target
                    < 15%/year post-Series B per K5 §12.
       Owner:       Founder + HR Lead
       Review:      Quarterly

R-S8   VENDOR LOCK-IN (CLOUD / AI PROVIDER)               MEDIUM  OPEN
       Driver:      Deep dependency on a single cloud provider or a single
                    AI model provider creates exit cost and pricing risk;
                    provider can raise prices or deprecate services with
                    short notice.
       Indicator:   % of workloads portable to alternate provider; AI
                    provider dependency per L2 §2 on_failure_behavior;
                    alternative inference path coverage; egress cost trend.
       Controls:    Per L2 §2 multi-provider routing with fallback;
                    infrastructure-as-code abstractions that avoid provider-
                    specific primitives where possible; annual portability
                    assessment; contract negotiation for minimum notice
                    periods and pricing locks.
       Owner:       Platform Lead with FinOps Lead
       Review:      Annual + on-event (provider pricing change)

R-S9   INTELLECTUAL PROPERTY PROTECTION                    MEDIUM  OPEN
       Driver:      Core HESEM architecture (OTG audit chain design,
                    domain model, SM-network) could be reverse-engineered
                    or independently developed by a well-funded competitor;
                    trade secret leak via departing employee.
       Indicator:   NDA coverage for all employees/contractors; IP
                    assignment agreements in place; departure exit process
                    completeness; patent application status.
       Controls:    Employee/contractor IP assignment agreements at
                    onboarding; NDA with liquidated damages; offboarding
                    process includes IP inventory and credential revocation;
                    patent application for core OTG + SM-network design
                    (provisional pending); trade secret policy in employee
                    handbook.
       Owner:       CEO with Legal
       Review:      Annual (IP audit) + on-event (departure)

R-S10  OPEN SOURCE LICENSE COMPLIANCE                      LOW     OPEN
       Driver:      HESEM uses third-party open source dependencies;
                    inadvertent inclusion of copyleft-licensed code (GPL,
                    AGPL) in a commercial product creates license
                    compliance liability.
       Indicator:   SBOM completeness per I7 §6; license scan findings
                    per release; new dependency review checklist
                    adherence.
       Controls:    SBOM generated per release (SLSA L3+); license scan
                    in CI (per I7 §6); approved license list maintained
                    (MIT, Apache 2.0, BSD, LGPL with restrictions);
                    legal review for any new dependency with ambiguous
                    license.
       Owner:       Engineering Lead with Legal
       Review:      Per release
```

---

## 2. Architectural Risks

```
R-A1   OTG AXIOM VIOLATION IN PRODUCTION                  HIGH    OPEN
       Driver:      Software bug in axiom verification; data-state desync
                    from a race condition; clock skew causing anchor
                    ordering failure; unauthorized write bypassing the
                    write path.
       Indicator:   SLO-6 (0 violations per 7-day window); OTG integrity
                    monitor alert rate; hash mismatch events per day.
       Controls:    RB-INC-005 runbook; daily axiom check in CS-B
                    continuous verification; nightly L4 verification per
                    L1 §6; write path enforces OTG entry atomically (no
                    bypass path); circuit breaker halts writes on first
                    violation (per M5 §9 playbook).
       Owner:       Platform Lead
       Review:      Weekly (SLO-6 dashboard); H8 on any breach

R-A2   AUDIT CHAIN ANCHOR FAILURE                         HIGH    OPEN
       Driver:      Anchor service outage; cryptographic key compromise;
                    object storage failure; external anchor endpoint
                    (blockchain node) unavailable for extended period.
       Indicator:   SLO-10 (anchor lag < 25h, 100% window); anchor
                    service heartbeat; Merkle queue depth.
       Controls:    Redundant anchor service (active-active pair);
                    external timestamp authority backup (RFC 3161
                    TSA); dual-HSM failover for signing keys; key
                    rotation procedure per I6; per M5 §9 playbook for
                    anchor breach; J1 secondary alert at 12h.
       Owner:       Platform Lead with Security Lead
       Review:      Weekly

R-A3   TENANT BOUNDARY BREACH (CROSS-TENANT DATA LEAK)   CRITICAL OPEN
       Driver:      Query-layer bug allowing one tenant to see another's
                    data; misconfigured row-level security; auditor
                    portal escape; shared-credential mistake in
                    provisioning.
       Indicator:   Zero cross-tenant data access events (SLO-19
                    equivalent for data isolation); integration test
                    coverage of tenant boundary assertions; cross-tenant
                    query rate in query log (should be 0).
       Controls:    Row-level isolation enforced per B6 C5 schema
                    design; per-tenant schema separation for Sovereign;
                    integration test suite asserts tenant boundary on
                    every root endpoint; auditor portal scoped per H3
                    §7; penetration test per I7 §8 quarterly;
                    per-PR cross-tenant boundary test required.
       Owner:       Platform Lead with Security Lead
       Review:      Continuous (monitor) + quarterly (pen test)

R-A4   SCHEMA DRIFT (API SPEC VS IMPLEMENTATION)          MEDIUM  OPEN
       Driver:      Manual API code edit not reflected in OpenAPI spec;
                    code generation drift; hand-edited endpoint deviating
                    from contract.
       Indicator:   Schema contract drift event per I1 W2 gate; spec
                    lint failures; consumer integration test failures.
       Controls:    Spec-first generation workflow; CI schema contract
                    check (per I1 §8); contract drift detection gate
                    blocks merge on drift; quarterly full spec audit.
       Owner:       Engineering Lead per domain
       Review:      Per release

R-A5   MATERIALIZED VIEW FALLS PERMANENTLY BEHIND         MEDIUM  OPEN
       Driver:      Partition imbalance in Kafka; consumer outage without
                    auto-restart; poison pill message blocking consumer;
                    schema evolution breaking CDC deserialization.
       Indicator:   SLO-5 (projection freshness lag < 5s); SLO-13 (CDC
                    consumer lag < 60s); consumer group offset gap per
                    partition.
       Controls:    Replay tooling per B6 C2 for consumer rebuilds;
                    consumer health monitoring with auto-restart;
                    dead-letter queue for poison pill messages; schema
                    evolution handled via Avro/Protobuf compatibility
                    rules; partition rebalance plan maintained.
       Owner:       Platform Lead
       Review:      Weekly

R-A6   SAGA COMPENSATION INCOMPLETE                        HIGH    OPEN
       Driver:      Partial saga compensation leaves a root in an
                    inconsistent state (neither committed nor cleanly
                    rolled back); missing idempotency key allows duplicate
                    execution; compensation step fails silently.
       Indicator:   Saga ledger unfinished-compensation count (target: 0
                    for > 24h duration); compensation step error rate;
                    saga timeout count.
       Controls:    Chaos testing per W5 gate exercises compensation
                    paths for every saga type; idempotency keys required
                    on all saga steps; compensation step failures page
                    Workflow team; saga timeout triggers SEV-3.
       Owner:       Workflow team
       Review:      Per release

R-A7   CDC LAG SUSTAINED UNDER WRITE SURGE                MEDIUM  OPEN
       Driver:      Consumer crash during high-write period; downstream
                    provider lag; under-provisioned Kafka partition count
                    for write surge.
       Indicator:   SLO-13 (CDC consumer lag < 60s); Kafka consumer group
                    lag per topic-partition; lag trend (increasing vs.
                    recovering).
       Controls:    Consumer health checks with auto-restart; horizontal
                    consumer scaling on lag trigger; Kafka topic partition
                    count right-sized per capacity plan (I5); RB-INC-001
                    lag recovery runbook.
       Owner:       Integration team
       Review:      Continuous

R-A8   EDGE GATEWAY SITE OFFLINE                           MEDIUM  OPEN
       Driver:      Facility network outage; edge hardware failure;
                    firmware bug causing gateway restart loop; VPN
                    tunnel certificate expiry.
       Indicator:   SLO-21 (edge gateway uptime per site, 99.9%);
                    edge heartbeat monitor; data gap event count.
       Controls:    Local SQLite buffer for offline continuity (records
                    accumulate during outage, sync on reconnect);
                    RB-INC-003 + RB-INC-011 recovery runbook; VPN
                    certificate rotation calendar; redundant uplink for
                    high-criticality sites; watchdog service restarts
                    gateway process.
       Owner:       Edge team
       Review:      Per facility (monthly) + SLO dashboard

R-A9   MULTI-TENANT CONFIGURATION DRIFT                    MEDIUM  OPEN
       Driver:      Tenant configuration (pack activation flags, CSR
                    overlays, per-tenant SLO overrides) diverges from
                    intended baseline through manual edits, migration
                    errors, or incomplete tenant provisioning automation.
       Indicator:   Configuration drift detection event count; tenant
                    provisioning test suite pass rate; per-tenant
                    configuration audit findings.
       Controls:    Infrastructure-as-code for tenant provisioning (no
                    manual config edits in production); configuration
                    drift detection as scheduled job (daily); per-tenant
                    configuration snapshot stored and compared; tenant
                    provisioning test suite in CI; H7 Class B required
                    for any per-tenant config change.
       Owner:       Platform Lead
       Review:      Monthly

R-A10  STATE MACHINE GUARD BYPASS IN EDGE CASE             HIGH    OPEN
       Driver:      An edge-case combination of inputs (e.g., concurrent
                    mutation with retry storm; clock skew at transition
                    boundary; pack-specific guard condition not covered
                    in unit tests) allows a state transition that should
                    be blocked by a guard condition.
       Indicator:   SM guard bypass event in audit log (target: 0);
                    SM unit test coverage (target: 100% guard conditions);
                    E2E test suite pass rate.
       Controls:    SM unit tests must cover all guard conditions per
                    M4 §22 testing requirements; E2E suite for each SM
                    per M4 §22; SM guard bypass emits EC-37 (security
                    violation evidence) and pages Platform Lead; formal
                    verification of critical guards (SM-10 batch release
                    gate) using model checker (TLA+ or Alloy) by W9.
       Owner:       Platform Lead with per-domain team
       Review:      Per release + monthly guard coverage review
```

---

## 3. AI-Specific Risks (per L0–L5)

```
R-AI-1  AI COMMITS A BANNED DECISION                     CRITICAL OPEN
        Driver:     L1 boundary slippage; new AI capability allows
                    autonomous action that previously required HAT
                    confirmation; adversarial prompt tricks system into
                    executing BD-N class action.
        Indicator:  BD-N attempt count (target: 0 autonomous executions;
                    any attempt = immediate alert); banned-decision
                    attempt event in audit log; SLO-6 equivalent for
                    AI authority.
        Controls:   Triple defense per L1 §6: CI gate (banned action
                    patterns blocked at build), runtime enforcement (API
                    rejects BD-N without valid HAT token), offline audit
                    (L4 nightly verification); RB-INC-019 playbook;
                    quarterly red-team exercise specifically targeting
                    BD-N bypass.
        Owner:      AI Lead with Security Lead
        Review:     Continuous (monitoring) + quarterly (red-team)
        L4 Link:    L4 §2.1 BD-N probe; documented in L4 red-team log
        H8 Link:    Any BD-N bypass triggers H8 CRITICAL CAPA

R-AI-2  HALLUCINATED REGULATORY CITATION                  HIGH    OPEN
        Driver:     LLM generates a plausible-sounding but fabricated
                    regulatory reference (wrong CFR section, non-existent
                    ICH guideline version); a quality professional acts
                    on it without verification.
        Indicator:  L4 SEV-4 hallucination findings per red-team cycle;
                    user override rate on AI advisory (low override =
                    under-questioning); hallucination rate in RAG
                    evaluation harness.
        Controls:   RAG grounding required per L2 §3 (no answer
                    generated without retrieved evidence); "no answer
                    found" abstention path (L2 must-have); AI output
                    UI labels all citations as advisory; user prompted
                    to verify regulatory references independently;
                    RAG corpus is curated regulatory source corpus only.
        Owner:      AI Lead
        Review:     Monthly
        L4 Link:    L4 §2.3 RAG grounding probe

R-AI-3  BIAS IN TRAINING DATA                             HIGH    OPEN
        Driver:     Historical operational data reflects historical bias
                    (e.g., certain product families historically fail-
                    free but this reflects under-reporting, not actual
                    quality); AI advisory inherits this bias.
        Indicator:  L4 fairness probe outcomes per attribute slice;
                    demographic parity test (where applicable);
                    advisory acceptance rate stratified by product /
                    line / facility.
        Controls:   Red-team fairness probe per L4 §2.2 quarterly;
                    per-attribute slice metric in L3 §4 monitoring;
                    training data audit annually; privacy-preserving
                    federated learning for sensitive slices.
        Owner:      AI Lead with Privacy Lead
        Review:     Quarterly
        L4 Link:    L4 §2.2 bias probe; fairness dashboard

R-AI-4  ACCEPTANCE RATE DRIFT (AI DISENGAGEMENT)          MEDIUM  OPEN
        Driver:     Users systematically override AI advisory without
                    reading (high override = system distrust); or
                    conversely, over-trust leading to uncritical acceptance
                    of poor advice (automation complacency).
        Indicator:  Advisory acceptance rate per L2 §6 KPI (target:
                    70-85% acceptance band; < 60% = distrust alert;
                    > 95% = complacency alert); override rate trend;
                    KPI drift detection per L3 §4.
        Controls:   KPI drift triggers retraining review; acceptance
                    rate outside band triggers UX review + user
                    interviews; complacency indicator adds confirmation
                    prompt for high-stakes decisions; model re-evaluation
                    per L3 §5 shadow comparative.
        Owner:      AI Lead
        Review:     Monthly

R-AI-5  MODEL SUPPLY CHAIN COMPROMISE                     HIGH    OPEN
        Driver:     Third-party model artifact tamper (poisoned model
                    weights); AI sub-processor breach leading to
                    backdoored model; malicious dependency in ML pipeline.
        Indicator:  L4 LLM05 model integrity verification; SBOM
                    completeness for ML dependencies; sub-processor
                    security assessment findings.
        Controls:   Signed model artifacts per L4 §3 LLM05; provider
                    DPA with cyber posture review requirement; model
                    artifact hash verification before deployment;
                    SLSA L3+ for ML pipeline; no model from unverified
                    sources.
        Owner:      Security Lead with AI Lead
        Review:     Quarterly
        L4 Link:    L4 §3 LLM05 supply chain probe

R-AI-6  PROMPT INJECTION SUCCESS                          HIGH    OPEN
        Driver:     Adversarial user crafts input that overrides system
                    prompt; poisoned RAG corpus (a regulatory document
                    with embedded adversarial instructions) causes the
                    AI to produce harmful output; indirect injection
                    via upstream data source.
        Indicator:  L4 LLM01 injection probe outcomes; system prompt
                    override attempt events in audit log (target: 0
                    successes); RAG corpus integrity check results.
        Controls:   System prompt isolation (no user-controllable
                    override path); tenant-content quarantine before
                    RAG ingestion; output sanitization per L2 §3;
                    RAG corpus integrity hash verification before
                    embedding; L4 LLM01 red-team quarterly.
        Owner:      AI Lead with Security Lead
        Review:     Quarterly
        L4 Link:    L4 §3 LLM01 injection probe

R-AI-7  PROVIDER MODEL UPGRADE BREAKS BEHAVIOR            MEDIUM  OPEN
        Driver:     AI sub-processor silently upgrades foundation model
                    (new version), changing output distribution; behaviors
                    that were calibrated in L3 evaluation no longer hold.
        Indicator:  Behavior shift detection per L3 §4 (automated
                    evaluation suite run on model version change);
                    advisory quality metrics delta > 5% on upgrade.
        Controls:   Any provider model version change treated as H7
                    Class B change per L3 §8; shadow comparative testing
                    per L3 §5 before traffic migration; rollback plan
                    to previous model version available for 30 days;
                    provider contracts require minimum 30-day notice
                    of major model version changes.
        Owner:      AI Lead
        Review:     Per provider release

R-AI-8  AI FEATURE COST RUNAWAY                           MEDIUM  OPEN
        Driver:     Provider pricing change; sudden usage spike from
                    viral enterprise adoption; inefficient prompt design
                    consuming excessive tokens; per-tenant cost envelope
                    breached by AI workloads.
        Indicator:  SLO-18 per-tenant cost compliance; AI cost per
                    advisory call trend; per-tenant AI cost envelope
                    (L2 §9); total AI inference spend vs. budget.
        Controls:   Per L2 §9 cost-aware routing (use cheaper model
                    tier when sufficient for task); degraded mode (no
                    AI advisory) if cost envelope breached; per-tenant
                    AI cost limit enforced at API gateway; FinOps
                    monthly AI cost review.
        Owner:      FinOps Lead with AI Lead
        Review:     Monthly
```

---

## 4. Compliance and Regulatory Risks

```
R-C1   AUDIT FAILURE (INTERNAL OR EXTERNAL)               HIGH    OPEN
       Driver:      Evidence gaps; weak process adherence; undocumented
                    deviation; auditor finds that system does not match
                    validated specification.
       Indicator:   Audit finding count and severity classification;
                    internal audit readiness score per H3 §8; open CAPA
                    count from prior audits.
       Controls:    H3 audit program (quarterly internal, annual external);
                    audit readiness drill per H3 §8; H8 systemic CAPA
                    for repeat findings; CS-B continuous validation as
                    ongoing audit-readiness activity.
       Owner:       Compliance Lead with Quality Lead
       Review:      Quarterly + on-event
       H8 Link:     Findings > MINOR trigger H8 CAPA

R-C2   VALIDATION GAP (GAMP5 TIER MIS-CLASSIFICATION)     HIGH    OPEN
       Driver:      A software component is classified at a lower GAMP5
                    tier than its actual complexity and regulatory impact
                    requires; validation effort insufficient for actual
                    risk.
       Indicator:   SLO-20 (validation evidence freshness = 100%
                    always); tier classification review at each new
                    root or SM introduction; trace gap rate per H2 §13.
       Controls:    H2 lifecycle with mandatory tier classification review
                    per feature; CS-B continuous validation stream reviews
                    all tier classifications; risk-based approach per
                    H9 ensures tier = f(GxP impact, complexity, novelty).
       Owner:       Quality Lead
       Review:      Monthly

R-C3   RETENTION POLICY GAP (DATA BELOW FLOOR)             MEDIUM  OPEN
       Driver:      A root or evidence class is assigned a retention
                    period shorter than the applicable regulatory
                    minimum (e.g., pharma batch record retention < 10y
                    post-expiry; MD DHR retention < lifetime of device
                    + 2y).
       Indicator:   Deletion event review (flag any deletion of records
                    whose retention floor has not passed); retention
                    audit finding per H5 §8; cross-jurisdiction
                    longer-of-rule adherence rate.
       Controls:    Per H5 retention classes (RC-1 through RC-6);
                    longer-of-rule applied per jurisdiction per H5 §4;
                    periodic retention audit; tenant-specific retention
                    overlay for cross-jurisdiction tenants; deletion
                    blocked by DB-level retention guard.
       Owner:       Compliance Lead with Privacy Lead
       Review:      Quarterly

R-C4   CMMC / ITAR BREACH (AEROSPACE J3)                  CRITICAL OPEN
       Driver:      Aerospace tenants with US DoD contracts require
                    CMMC Level 2+ compliance and ITAR data handling;
                    a person-of-record verification gap or cross-region
                    data routing error exposes controlled technical data
                    to unauthorized persons.
       Indicator:   Person-of-record verification gap events; access
                    review findings; data routing audit (confirm US-only
                    for ITAR data); J3 §5 control effectiveness review.
       Controls:    J3 §5 CMMC/ITAR controls; US-only deployment region
                    enforced for ITAR data at tenant provisioning; quarterly
                    access review per I7 §3; person-of-record verification
                    required before J3 export-controlled root access;
                    Legal counsel retainer for ITAR interpretation.
       Owner:       Aerospace Lead (J3) with Security Lead
       Review:      Quarterly + on-event

R-C5   FDA QSR / EU MDR / ANNEX 11 BREACH (PHARMA / MD)  CRITICAL OPEN
       Driver:      Data integrity failure (ALCOA+ violation) in the
                    platform invalidates electronic records under 21 CFR
                    Part 11 / EU Annex 11; a vigilance reporting window
                    is missed for a field safety issue (EU MDR Article 87
                    15/30-day window); an audit trail gap discovered
                    during FDA inspection.
       Indicator:   ALCOA+ compliance check (attributable, legible,
                    contemporaneous, original, accurate + complete,
                    consistent, enduring, available); data integrity
                    event log; vigilance window tracking (J4 tenants);
                    H1 §3 regulatory window calendar.
       Controls:    Per J1 (Pharma) + J4 (Med Device) pack chapters;
                    continuous CS-B; OTG audit chain satisfies ALCOA+
                    requirements (contemporaneous by construction,
                    attributable via HAT, original enforced by BD-1,
                    consistent via Merkle); regulatory window calendar
                    with automated reminders per H1 §3.
       Owner:       Pharma Lead (J1) / MD Lead (J4) with Compliance Lead
       Review:      Monthly

R-C6   GDPR / CCPA / PIPL PRIVACY BREACH                   HIGH    OPEN
       Driver:      Cross-tenant data breach exposing personal data;
                    sub-processor security incident; subject rights
                    request missed (GDPR Art. 17/18 within 30 days);
                    inadequate data transfer mechanism for EU→non-EU.
       Indicator:   Privacy incident count; subject rights timeliness
                    adherence; sub-processor incident notification
                    receipt; SCC / Adequacy decision currency per H5 §7.
       Controls:    Per H5 + I7 §9; DPA with all sub-processors;
                    ROPA maintained and reviewed annually; pseudonymization
                    of personal data in event streams; subject rights
                    automation for GDPR Art. 15/17/18/20; SCCs + BCRs
                    for cross-border transfers.
       Owner:       Privacy Lead with Compliance Lead
       Review:      Quarterly

R-C7   IATF 16949 CERTIFICATION LOSS (AUTOMOTIVE J2)       HIGH    OPEN
       Driver:      Surveillance audit major finding; CSR overlay drift
                    causing nonconformity; PPAP/APQP data integrity
                    gap; automotive customer escalation triggers
                    assessment.
       Indicator:   Audit findings per certification cycle; CSR
                    conformance rate per J2 §6; PPAP completion rate;
                    LPA audit adherence.
       Controls:    Per J2 pack; LPA discipline per J2 §5; CSR overlay
                    governance with per-customer CSR register; PPAP/APQP
                    workflow in J2 root set; H6 cadence review.
       Owner:       Automotive Lead (J2)
       Review:      Per certification cycle + monthly conformance check

R-C8   AS9100D / NADCAP CYCLE FAILURE (AEROSPACE J3)       HIGH    OPEN
       Driver:      Surveillance audit cycle missed; open finding not
                    closed within required timeframe; NADCAP special
                    process accreditation not maintained.
       Indicator:   Cycle calendar adherence rate; open finding age
                    vs. required closure date; NADCAP accreditation
                    expiry tracking.
       Controls:    Per J3 pack; H6 cadence review; cycle reminder
                    system (90/60/30-day pre-cycle alerts); CAPA
                    closure tracking per H8 for audit findings;
                    NADCAP accreditation calendar in compliance ops.
       Owner:       Aerospace Lead (J3)
       Review:      Per certification cycle

R-C9   FSMA §204 READINESS GAP (FOOD/BEVERAGE J5)          HIGH    OPEN
       Driver:      FDA FSMA §204 enforcement (KDE/CTE traceability
                    records for food supply chain) requires complete
                    lot-level traceability within 24 hours of a recall
                    event; HESEM J5 tenants may not have complete KDE
                    data if onboarding is incomplete.
       Indicator:   Mock recall trace coverage per J5 §4 (target: 100%
                    of regulated commodities have complete KDE chain);
                    mock recall completion time (target: < 4h);
                    onboarding readiness assessment completion rate.
       Controls:    Per J5 pack; mock recall cadence per J5 §4 (biannual
                    + on-event); tenant onboarding KDE completeness gate
                    before J5 pack activation; KDE gap alert (SLO-5
                    strict mode for J5 lot traceability roots).
       Owner:       Food Lead (J5)
       Review:      Monthly (through enforcement + annually thereafter)
```

---

## 5. Operational Risks

```
R-O1   MAJOR INCIDENT RESPONSE TOO SLOW                   MEDIUM  OPEN
       Driver:      On-call rotation thin in Phase 0-1; runbooks stale;
                    SEV-1 acknowledgment time exceeds 5-minute target;
                    knowledge transfer gap during rotation change.
       Indicator:   SEV-1 acknowledgment time (target: < 5 min);
                    SEV-1 mean time to resolution (target: < 1h per
                    DORA Elite); runbook last-updated date (> 90 days =
                    stale); game-day outcomes.
       Controls:    I3 SEV classification and escalation policy;
                    quarterly game days; runbook freshness cadence per
                    H6 (90-day review required); on-call rotation
                    planning per K5 Phase scaling; AI-assisted triage
                    (L2 advisory for incident diagnosis, advisory-only).
       Owner:       SRE Lead
       Review:      Quarterly

R-O2   DR / BACKUP NOT EXERCISED                           HIGH    OPEN
       Driver:      Drill skipped or passes at degraded fidelity;
                    backup integrity not verified; RTO/RPO assumptions
                    not validated under realistic load.
       Indicator:   SLO-17 (DR drill quarterly cadence, 100%);
                    SLO-16 (backup success rate, 100%); drill outcome
                    fidelity score; RTO/RPO achieved vs. target.
       Controls:    I4 quarterly DR drill; STOP-5 program halt if two
                    consecutive quarterly drills fail or are skipped;
                    backup integrity verification (restore test monthly
                    for a sample of backups); CTO signs off on each
                    quarterly drill outcome report.
       Owner:       SRE Lead
       Review:      Quarterly

R-O3   CAPACITY CRUNCH / COST OVERRUN                      MEDIUM  OPEN
       Driver:      Tenant growth outpacing capacity plan; AI inference
                    cost spike on usage surge; unexpected J1/J3 tenant
                    workload profile (high-frequency audit chain writes).
       Indicator:   SLO-18 (per-tenant cost within tier envelope);
                    capacity headroom per I5 (target: > 30% headroom);
                    AI inference cost trend; per-tenant cost trending.
       Controls:    I5 capacity plan with quarterly review; I6 cost
                    governance review monthly; per-tenant tier
                    enforcement (auto-throttle at tier limit); AI cost-
                    aware routing per L2 §9; FinOps ≥ monthly alert.
       Owner:       FinOps Lead with SRE Lead
       Review:      Monthly

R-O4   KEY PERSONNEL ATTRITION (ENGINEERING)               MEDIUM  OPEN
       Driver:      Compensation gap vs. market; burnout from Phase 0
                    intensity; competing job offers; visa issues for
                    international hires.
       Indicator:   Voluntary turnover rate (target: < 15%/year post-
                    Series B); exit interview themes; compensation
                    benchmark delta; on-call burden (hours/week per
                    engineer).
       Controls:    V10 wave plan as durable externalized knowledge;
                    pair-on-critical-work per K5 ways of working;
                    per K5 §12 compensation framework benchmarked
                    annually; ESOP with 5-year extended post-termination
                    exercise window per K4; on-call burden caps enforced.
       Owner:       Founder + HR Lead
       Review:      Quarterly

R-O5   SUB-PROCESSOR OUTAGE OR DEPRECATION                  MEDIUM  OPEN
       Driver:      Cloud provider regional outage; AI provider service
                    disruption; CDN provider deprecating a service;
                    database-as-a-service provider pricing or API change.
       Indicator:   Provider SLA incident notifications; provider
                    roadmap alerts; dependency inventory currency.
       Controls:    Multi-region deployment for core services; AI
                    provider fallback per L2 §2 on_failure_behavior;
                    alternative path documented for each external
                    dependency; provider DPA with incident notification
                    SLA; annual provider review.
       Owner:       Platform Lead
       Review:      Annual + on-event

R-O6   RANSOMWARE OR DESTRUCTIVE ATTACK                     HIGH    OPEN
       Driver:      Attacker compromises internal systems; encrypts
                    or destroys data; exfiltrates customer records
                    prior to extortion demand.
       Indicator:   EDR anomaly detection events; backup integrity
                    verification results; unusual data egress alerts
                    from SIEM.
       Controls:    Per I4 §6 + I7 ransomware controls; air-gap
                    immutable backup (offline copy not reachable from
                    production); WORM storage for audit chain and
                    evidence records; quarterly DR drill (I4); endpoint
                    detection and response (EDR) on all endpoints;
                    network segmentation; zero-trust per I7.
       Owner:       Security Lead
       Review:      Quarterly + on-event

R-O7   SUPPLY CHAIN DEPENDENCY WITH KNOWN EXPLOITABLE VULN  HIGH    OPEN
       Driver:      A KEV-listed CVE in a HESEM dependency is exploited
                    before the patch SLA is met; SLSA gap allows
                    tampered artifact into production build.
       Indicator:   SLO-19 (vulnerability patch within severity window,
                    100%); KEV list monitoring (daily sync); SBOM
                    dependency scan findings.
       Controls:    KEV-aware monitoring (CISA KEV feed, daily); SLSA
                    L3+ build integrity; SBOM generated per release;
                    patch SLA: KEV < 24h, Critical < 7d, High < 30d;
                    per I7 §6 vulnerability management.
       Owner:       Security Lead
       Review:      Continuous (KEV monitoring) + monthly (general vuln)

R-O8   TECHNICAL DEBT ACCUMULATION BLOCKING FEATURE WORK    MEDIUM  OPEN
       Driver:      Phase 0-1 velocity prioritizes features over
                    refactoring; shortcuts accumulate into architectural
                    debt; debt eventually slows all delivery and
                    increases defect rate.
       Indicator:   Debt-to-feature ratio (tracked per sprint); code
                    complexity metrics trend (cyclomatic complexity,
                    duplication rate); test coverage trend; time spent
                    on rework vs. new features.
       Controls:    20% engineering time budget for debt reduction
                    starting in Phase 2; per-sprint tech debt backlog
                    review; ADR process prevents debt-creating shortcuts
                    from becoming defaults; code review includes debt
                    assessment; architecture review board quarterly.
       Owner:       Head of Engineering
       Review:      Monthly (debt backlog) + quarterly (architecture)

R-O9   ON-CALL BURNOUT (RELIABILITY TEAM)                   MEDIUM  OPEN
       Driver:      Thin on-call rotation in Phase 0-1; high alert
                    volume from immature alerting (alert fatigue);
                    paging at low-severity events; 24×7 burden on
                    2-3 engineers.
       Indicator:   On-call hours per engineer per week (target: < 8h
                    paged time/week); alert volume per day; MTTR
                    per on-call period; alert-to-action ratio (% of
                    alerts that required human action vs. auto-resolved).
       Controls:    Alert audit per quarter (remove or downgrade any
                    alert not actioned in > 90 days); SLO-based alerting
                    (per M5 §10) reduces alert volume vs. threshold-based;
                    on-call rotation grows with team per K5 phased
                    scaling; on-call compensation policy.
       Owner:       SRE Lead with Head of Engineering
       Review:      Monthly
```

---

## 6. Customer and Commercial Risks

```
R-X1   CUSTOMER REVENUE CONCENTRATION                      MEDIUM  OPEN
       Driver:      Early ARR concentrated in 1-3 large enterprise
                    tenants; loss of one customer materially affects
                    runway and growth metrics.
       Indicator:   Top-3 customer % of ARR (target: < 40% by Series B);
                    ARR diversification by vertical; customer count trend.
       Controls:    Per K2 GTM diversification across all 5 verticals;
                    per K3 channel partner program to diversify customer
                    acquisition; NPS and health score monitoring to
                    reduce churn risk for large tenants.
       Owner:       CEO + CFO
       Review:      Quarterly

R-X2   CUSTOMER REGULATORY ACTION IN HESEM SCOPE           HIGH    OPEN
       Driver:      A HESEM customer receives an FDA Form 483 observation,
                    EMA finding, or CAPA requirement that references the
                    quality management system supported by HESEM; creates
                    reputational risk and potential liability.
       Indicator:   Customer regulatory exposure monitoring (CSM-reported);
                    customer audit finding themes; any customer-reported
                    finding referencing HESEM functionality.
       Controls:    Per H1 §3 regulatory horizon awareness for each
                    active customer; CSM proactive check-in before
                    known customer audit dates; H8 systemic CAPA if
                    a platform gap is the root cause; indemnification
                    scope defined in customer contract per Legal.
       Owner:       Compliance Lead with CSM
       Review:      Per event + monthly CSM review

R-X3   CUSTOMER VALIDATION FAILURE AT THEIR SITE           HIGH    OPEN
       Driver:      Customer's internal IT/QA validation of HESEM at
                    their facility is insufficient (missing IQ/OQ/PQ
                    steps); HESEM's CVLP does not provide adequate
                    evidence for their validation; customer's auditor
                    finds a gap.
       Indicator:   Customer validation completion rate; CVLP on-time
                    delivery rate per K5 §7.2; customer validation
                    support ticket volume; CVLP quality score (≥95%
                    document quality, per K5 §7.3).
       Controls:    Per H2 §14 CVLP delivery with complete IQ/OQ/PQ
                    artifacts; CVLP quality gate before customer delivery;
                    dedicated CS-B validation consultant for Enterprise
                    and Sovereign onboarding; CVLP template library
                    reviewed annually by Compliance Lead.
       Owner:       CSM with Quality Lead
       Review:      Per onboarding + quarterly CVLP audit

R-X4   GROSS REVENUE RETENTION / CHURN ABOVE PLAN          MEDIUM  OPEN
       Driver:      Product-market fit issues in a specific vertical;
                    pricing pressure; competitor displacement; support
                    quality below expectation.
       Indicator:   GRR (target: ≥ 90% for Core, ≥ 95% for Enterprise);
                    NPS (target: ≥ 50); CSAT ≥ 4.2/5; churn reason
                    analysis.
       Controls:    Per K5 customer success program; QBR cadence;
                    health score monitoring with early warning (< 60
                    triggers CSM intervention); per-vertical pack
                    depth as differentiation; pricing review annually.
       Owner:       Head of Customer Success
       Review:      Monthly

R-X5   CHANNEL PARTNER CONFLICT                             MEDIUM  OPEN
       Driver:      Reseller or SI partner channels overlap with
                    HESEM direct sales; partner receives a commission
                    for a deal the HESEM sales team also worked;
                    competing partner arrangements create customer
                    confusion about primary relationship.
       Indicator:   Deal conflict count per quarter; partner NPS;
                    partner-sourced vs. partner-influenced ARR split;
                    churn rate of partner-acquired customers.
       Controls:    Per K3 partner program with clear deal registration
                    and conflict resolution policy; partner tier (Silver/
                    Gold/Platinum) with territory and segment rules;
                    partner advisory board to surface conflict early;
                    Legal-approved partner agreement template.
       Owner:       Head of Sales with Partner Success Lead
       Review:      Quarterly

R-X6   ENTERPRISE SALES CYCLE EXTENDS BEYOND PLAN          MEDIUM  OPEN
       Driver:      Regulated enterprise procurement cycles (pharma, med
                    device, aerospace) involve multi-stakeholder IT/QA/
                    Legal/Procurement review; cycles of 9-18 months
                    undermine ARR forecasting.
       Indicator:   Average deal cycle time by tier; pipeline conversion
                    rate by stage; deal stuck > 6 months count.
       Controls:    Per K2 §4 enterprise sales process; CSP (Customer
                    Success Pilot) structured 90-day pilot program;
                    legal contract templates pre-approved to accelerate
                    legal review; executive champion identification
                    process; regulatory pre-close check.
       Owner:       Head of Sales + CEO
       Review:      Monthly (pipeline review)

R-X7   CVLP DELIVERY QUALITY BELOW EXPECTATION             MEDIUM  OPEN
       Driver:      CVLP artifacts (RTM, SBOM, test results, risk delta)
                    contain errors or are delivered late for Enterprise/
                    Sovereign customers conducting their own GAMP5
                    validation; creates trust gap.
       Indicator:   CVLP on-schedule rate (target: ≥ 95%); CVLP
                    document error rate (target: ≤ 2%); customer CVLP
                    satisfaction score; CVLP rejection / revision count.
       Controls:    CVLP generator automated from SM evidence chain
                    (reducing manual error); CVLP quality gate: CS-B
                    Validation Lead reviews each package before delivery;
                    T-14/T-7/T-3/T-0 delivery timeline per K5 §7.2;
                    customer feedback loop after each CVLP delivery.
       Owner:       CSM Lead with Validation Lead (CS-B)
       Review:      Per release delivery + quarterly CVLP audit
```

---

## 7. Financial and Business Risks

```
R-F1   CASH RUNWAY SHORTFALL                               MEDIUM  OPEN
       Driver:      Capital raise delayed beyond plan; burn rate above
                    plan due to hiring or AI inference cost; revenue
                    ramp slower than forecast.
       Indicator:   Runway months (target: ≥ 18 months at all times);
                    monthly burn rate vs. plan; ARR ramp vs. plan;
                    fundraising pipeline probability-weighted proceeds.
       Controls:    Per K4 funding path with staged capital milestones;
                    cost discipline (engineering efficiency; AI cost
                    routing per L2 §9); 90-day bridge plan maintained
                    for delay scenarios; CFO monthly cash flow review.
       Owner:       CEO with CFO
       Review:      Monthly

R-F2   FUNDRAISING MACRO HEADWINDS (VALUATION COMPRESSION) MEDIUM  OPEN
       Driver:      Adverse macro environment (interest rate rise; public
                    SaaS multiple compression; risk-off VC sentiment)
                    compresses valuation, forces down-round, or delays
                    capital raise.
       Indicator:   Public SaaS multiple benchmarks (NTM ARR multiple);
                    VC sentiment surveys (Pitchbook, SVB data); Series A
                    pipeline conversion rate.
       Controls:    Per K4 §12 alternative capital structures (RBF,
                    government grants Vietnam/EU/US, strategic investment);
                    milestone-based tranching reduces equity dilution risk;
                    strong unit economics (LTV/CAC ≥ 8× per K4 §9)
                    as investor narrative.
       Owner:       CEO + CFO
       Review:      Monthly

R-F3   CONTRACT SLA PENALTY EXPOSURE                        MEDIUM  OPEN
       Driver:      An SLA breach with an Enterprise or Sovereign tenant
                    triggers contractual service credit or penalty clause;
                    accumulation of service credits erodes ARR.
       Indicator:   SLO performance vs. contracted SLA (monitoring per
                    M5 §4 tier mapping); service credit utilization rate;
                    SLA breach incident count.
       Controls:    Internal SLO targets stricter than customer SLA by
                    headroom (per M5 §4; e.g., internal 99.9% vs.
                    contracted 99.5%); Legal-approved SLA penalty caps
                    in contract template; periodic SLA-vs-SLO gap review
                    by Legal and FinOps.
       Owner:       Legal with FinOps
       Review:      Quarterly

R-F4   PRICING COMPRESSION FROM COMPETITION                 MEDIUM  OPEN
       Driver:      Competitors discount aggressively to displace HESEM;
                    prospects negotiate hard using competitor bids;
                    enterprise procurement creates race-to-bottom in
                    evaluation stage.
       Indicator:   Discount rate per deal (target: < 20% off list for
                    Core, < 15% for Enterprise); deal win rate at full
                    list; pricing exception count.
       Controls:    Per K1 pricing tiers with clear value differentiation;
                    per K2 GTM emphasis on regulatory risk reduction ROI
                    (quantified in sales motion); pricing floor policy
                    (no deal below floor without CEO approval); value-
                    selling training for sales team.
       Owner:       Head of Sales + CFO
       Review:      Quarterly

R-F5   FOREIGN EXCHANGE RISK                                LOW     OPEN
       Driver:      HESEM operates in Vietnam (VND) but invoices in USD/
                    EUR for international customers; payroll and ops in
                    VND; currency fluctuation affects margins.
       Indicator:   USD/VND and EUR/VND rate trend; % of costs in USD
                    vs. VND; unhedged FX exposure.
       Controls:    Invoice in USD/EUR for international customers;
                    natural hedge where possible (USD revenue vs. USD-
                    denominated cloud costs); FX monitoring by CFO;
                    forward contracts for material exposures once ARR
                    scale warrants.
       Owner:       CFO
       Review:      Quarterly

R-F6   M&A / ACQUISITION DISRUPTION                         LOW     OPEN
       Driver:      Unsolicited acquisition approach from strategic buyer
                    or PE firm creates board/founder distraction; or
                    HESEM acquires a complementary tool and integration
                    costs exceed plan.
       Indicator:   Inbound M&A inquiry volume; market signals from
                    intermediaries; acquisition integration timeline vs.
                    plan (if applicable).
       Controls:    Board-level M&A policy established; founder alignment
                    on independence vs. strategic exit; Legal retainer
                    for M&A advisory; any acquisition requires integration
                    plan with dedicated resource before board approval.
       Owner:       CEO + Board
       Review:      Ad-hoc (on approach) + annual board strategy review
```

---

## 8. Per-Pack Sustained Risks

These risks are endemic to a specific vertical pack and persist for the life of that pack. They are elevated here because they require cross-functional attention beyond the pack chapter alone.

```
R-P1   J1 PHARMA: CONTINUOUS PROCESS VERIFICATION (CPV)  HIGH    OPEN
       SUSTAINED RISK
       Driver:      FDA process validation guidance (2011) requires
                    Stage 3 CPV for commercial pharma processes; HESEM
                    J1 must capture CPV statistical data and trend
                    analysis continuously; a gap in CPV data capture
                    (e.g., edge gateway offline at J5) is a Data
                    Integrity finding at inspection.
       Indicator:   CPV data completeness per batch (target: 100%);
                    edge gateway offline events for J1 tenants (SLO-21
                    J1 enhanced); CPV trend analysis coverage.
       Controls:    Local edge buffer ensures CPV data captured during
                    outage; CPV gap alert triggers CSM contact; J1
                    pack SM guard requires CPV linkage before batch
                    release transition (SM-10 guard condition).
       Owner:       Pharma Lead (J1) with Quality Lead
       Review:      Monthly

R-P2   J2 AUTO: CUSTOMER-SPECIFIC REQUIREMENTS (CSR)     HIGH    OPEN
       DRIFT SUSTAINED RISK
       Driver:      Automotive OEMs (GM BIQS, Ford Q1, VW Formel Q)
                    update their CSR overlays periodically; if J2
                    pack CSR overlays are not refreshed, a tenant's
                    quality system falls into nonconformity with their
                    customer's requirements despite conforming to IATF
                    16949 baseline.
       Indicator:   CSR version currency per active OEM relationship;
                    CSR delta notification subscription rate;
                    conformance check failure rate post-update.
       Controls:    Per J2 §6 CSR overlay governance; CSR version
                    monitoring subscription (OEM portal / AIAG); CSR
                    update triggers H7 Class B review for J2 pack;
                    per-tenant CSR register with version tracking.
       Owner:       Automotive Lead (J2)
       Review:      Per CSR version update (monitor continuously)

R-P3   J3 AERO: DO-178C / DO-254 ARTIFACT TRACEABILITY   HIGH    OPEN
       SUSTAINED RISK
       Driver:      Aerospace customers developing airborne software or
                    complex electronic hardware require DO-178C (software)
                    / DO-254 (hardware) artifact traceability from
                    requirements through testing; HESEM J3 must provide
                    bidirectional RTM with evidence confidence level
                    (DAL A/B/C/D); gaps cause DER finding.
       Indicator:   RTM coverage completeness for J3 roots (target:
                    100% bidirectional); evidence confidence level
                    completeness; DER finding count.
       Controls:    Per J3 DO-178C/DO-254 root set with mandatory RTM
                    emission at each SM transition; RTM coverage check
                    in CI for J3 pack activation; CVLP for J3 includes
                    DO-178C artifact section.
       Owner:       Aerospace Lead (J3) with Quality Lead
       Review:      Per release + quarterly RTM audit

R-P4   J4 MED DEVICE: FIELD SAFETY CORRECTIVE ACTION     CRITICAL OPEN
       (FSCA) WINDOW SUSTAINED RISK
       Driver:      EU MDR Article 83 requires mandatory reporting of
                    FSCAs within specific timeframes (15 days serious,
                    30 days non-serious); a gap in J4 root SM triggers
                    (CAPA → FSCA initiation) could cause a reporting
                    window miss.
       Indicator:   FSCA window adherence rate (target: 100%);
                    SM-6 (CAPA) to FSCA linkage event timeliness;
                    SLO-3 J4 enhanced (p95 < 300ms) for workflow
                    commits on J4 regulated roots.
       Controls:    SM-6 hard-coupled to FSCA root initiation guard
                    (per M4 hard couplings); FSCA window calendar
                    with automated alerts at 50% and 80% of window;
                    EU MDR Notified Body advisory for ambiguous cases;
                    H8 CAPA mandatory for any FSCA window miss.
       Owner:       MD Lead (J4) with Compliance Lead
       Review:      Monthly + on-event
       H8 Link:     Any FSCA window miss triggers CRITICAL H8 CAPA

R-P5   J5 FOOD: MOCK RECALL READINESS DEGRADATION         HIGH    OPEN
       SUSTAINED RISK
       Driver:      J5 tenants must demonstrate ≤ 4h traceback from
                    receipt of recall notice to full lot map; if KDE/CTE
                    data is incomplete (supplier onboarding lag;
                    upstream traceability gap), the 4h target is not
                    achievable regardless of HESEM platform capability.
       Indicator:   Mock recall completion time trend (target: ≤ 4h);
                    KDE completeness per regulated commodity (target:
                    100%); supplier KDE onboarding rate; upstream
                    traceability gap count.
       Controls:    Per J5 §4 mock recall cadence; KDE completeness
                    gate before J5 pack certification (tenant cannot
                    claim FSMA §204 readiness until KDE ≥ 95%);
                    supplier onboarding program per K3 §8 J5 channel;
                    HESEM J5 provides supplier portal for KDE
                    submission to reduce upstream gap.
       Owner:       Food Lead (J5) with CSM
       Review:      Biannual mock recall + monthly KDE completeness check
```

---

## 9. Risk-Review Cadence and Governance

Risk management follows ISO 31000:2018 process model: identify → analyze → evaluate → treat → communicate → monitor → review. ICH Q9(R1) informs the pharmaceutical risk elements. NIST SP 800-30 informs the security risk scoring. NIST AI RMF 1.0 governs the AI-specific risk categories.

**Review cadence:**

```
FREQUENCY       SCOPE                                       CHAIR
Continuous      R-A3 (tenant boundary), R-AI-1 (BD-N),    Platform Lead / AI Lead
                R-O7 (KEV), SLO-based risk monitors        (automated monitoring)
Weekly          R-A1 (OTG integrity), R-A2 (anchor),       Platform Lead
                R-O7 (supply chain KEV)
Monthly         All OPEN risks: indicator status update;    Head of Engineering
                new risk nomination review; risk register    with Compliance Lead
                version increment; H8 CAPA open items
                linked to risk register reviewed
Quarterly       Strategic risks (R-S*); executive review;   CEO + CTO
                resource allocation for HIGH/CRITICAL risks; + Compliance Lead
                red-team outcomes fed back (R-AI-1..R-AI-6);
                per-pack sustained risks (R-P*) pack-lead
                cadence merged with monthly
Annual          Comprehensive re-rating of all risks;        Head of Engineering +
                control effectiveness review; new risk       Board (strategic risks)
                discovery workshop; third-party risk
                assessment (HITRUST or equivalent)
On-event        Per incident, audit finding, or regulatory   Risk owner for affected
                update: affected risks re-rated; controls    risk + Compliance Lead
                updated; H8 CAPA initiated if control
                failure confirmed
```

**Risk acceptance:** Explicit written sign-off per H9 §11 from the risk owner and Compliance Lead (for compliance/regulatory risks) or CTO (for architectural risks). No risk may be moved to ACCEPTED status without this sign-off being recorded in the risk management system.

**New risk nomination:** Any team member may nominate a risk by filing a risk nomination in the risk management system. Nominations are reviewed at the next monthly meeting. Nominated risks are either added to the register (with formal fields completed), merged into an existing risk, or rejected with documented rationale.

**Risk register versioning:** The register is versioned in Git alongside the wave plan documents. Each monthly review produces a version increment commit. Material changes (new CRITICAL risk added; existing CRITICAL risk status changed) produce an immediate commit with CTO sign-off recorded in the commit message.

**H8 integration:** When a risk's controls fail and the risk materializes as an incident or audit finding, the H8 systemic CAPA process is initiated. The risk register entry is linked to the CAPA record. The CAPA closure is a prerequisite for the risk status being updated from OPEN to MITIGATED.

**L4 integration:** AI-specific risks (R-AI-1 through R-AI-8) are directly linked to L4 red-team evidence. Each quarterly L4 red-team cycle produces evidence that is attached to the corresponding risk register entries. A passing L4 probe does not retire the risk; it updates the control effectiveness evidence for that cycle.

---

## 10. Risk Summary Dashboard

```
CATEGORY               TOTAL   CRITICAL  HIGH    MEDIUM  LOW
Strategic (R-S*)       10      0         4       5       1
Architectural (R-A*)   10      1         5       4       0
AI-Specific (R-AI-*)   8       1         5       2       0
Compliance (R-C*)      9       3         5       1       0
Operational (R-O*)     9       0         4       5       0
Customer/Commercial    7       0         3       4       0
  (R-X*)
Financial (R-F*)       6       0         0       4       2
Per-Pack (R-P*)        5       1         4       0       0
TOTAL                  64      6         30      25      3
```

CRITICAL risks require immediate executive visibility and dedicated mitigation resourcing. The 6 CRITICAL risks are:

1. R-A3 — Tenant boundary breach (cross-tenant data leak)
2. R-AI-1 — AI commits a banned decision
3. R-C4 — CMMC/ITAR breach (aerospace)
4. R-C5 — FDA QSR / EU MDR / Annex 11 breach (pharma/med device)
5. R-P4 — J4 Med Device FSCA window miss
6. (Elevated from HIGH if indicator triggers) R-A10 — SM guard bypass

---

## 11. Decision phrase

```
M6_RISK_REGISTER_V10_LOCKED
S4-15_M4_M5_M6_DEEP_UPGRADE_COMPLETE
NEXT: S4-16_M7_M8_M9.md
```
