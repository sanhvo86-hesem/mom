# K5 — Customer Success and Team Topology (V10)

```
chapter_id:     K5
version:        V10
owner_role:     CEO + VP Engineering + VP Customer Success
wave_target:    team structure reviewed at each phase boundary and each
                funding close; CSM model reviewed quarterly; DORA metrics
                reviewed weekly per team and quarterly company-wide
dependencies:   K1 (tier-to-CSM-ratio model), K2 (customer lifecycle
                metrics), K4 (FTE payroll model by phase), H2 §14 (CVLP
                delivery cadence per release), I3 (incident rotation and
                on-call model), I8 (tenant QBR model), L3 §10 (AI
                governance ledger owner per team), M5 (SLO directory),
                Part C (domain streams C1-C13)
sources:        Team Topologies (Skelton + Pais 2019); Customer Success
                Manifesto (Lincoln Murphy); Gainsight CSM playbook;
                Google SRE Workbook (team interaction patterns); DORA
                State of DevOps 2024; Spotify squad-tribe-chapter model;
                Crucible (Customer Engineering); Project Aristotle (Google
                psychological safety); Accelerate (Forsgren, Humble,
                Kim); ITIL 4 service management
```

People and team structure are the gating constraint of the V10 execution
plan. Every technical architecture decision has a corresponding team
design implication: a complicated subsystem (OTG audit chain, ML platform,
edge gateway) requires a dedicated complicated-subsystem team; a regulated
manufacturing vertical (J1 Pharma) requires a domain specialist team; a
multi-tenant platform requires a platform team that stream teams consume
without coordination overhead. This chapter is the complete operating
model for how HESEM is staffed, structured, scaled, and how customers
are owned end-to-end through their lifecycle.

The organizing framework is Skelton-Pais Team Topologies, applied to the
specific constraints of a regulated manufacturing SaaS platform: compliance
obligations that cross all teams, wave-gated delivery that requires explicit
team readiness gates, and customer success in regulated industries where
a CSM failure costs not just revenue but an ongoing regulatory relationship.

---

## 1. Team Topologies framework applied to HESEM

Skelton and Pais define four team types that minimize cognitive load while
maximizing the flow of change. HESEM applies all four types with specific
mapping to its domain structure.

### 1.1 Stream-aligned teams

A stream-aligned team owns a stream of business value end-to-end. It is
cross-functional (backend + frontend + QA + domain knowledge), has clear
boundaries, and delivers continuously without waiting for another team's
permission. The cognitive load budget is bounded: each stream team owns
a domain that one team can fully understand and operate.

In HESEM, stream-aligned teams map to Part C domain streams (C1-C13) and
to the HMV4 frontend slice program. A stream-aligned team owns its API
surface, its database migrations, its feature flags, its test suite, its
documentation, and its customer-facing behavior.

### 1.2 Enabling teams

An enabling team helps stream teams acquire new capability. It is time-bounded:
once a stream team is capable, the enabling team's engagement with that team
ends. Enabling teams do not own deliverables — they coach.

In HESEM, enabling teams cover: domain-driven design practices for new
engineers; GAMP 5 / CSA validation practices for new validation engineers;
AI discipline practices (L1-L5) for teams starting to use AI assistance;
secure coding practices (OWASP Top 10 + HESEM-specific threat model);
accessibility standards (WCAG 2.1 AA per F10); incident response game day
facilitation (per I3); and regulated change management practices for teams
joining the eQMS stream.

Enabling teams do not write production code. If an enabling team starts
to own production artifacts, it has drifted into stream-aligned or complicated-
subsystem territory and must be reclassified.

### 1.3 Complicated-subsystem teams

A complicated-subsystem team owns a component that requires deep specialist
knowledge beyond what a generalist stream team can hold. It provides the
subsystem as a service (X-as-a-Service) to stream teams, or collaborates
with stream teams during initial integration.

In HESEM, complicated-subsystem teams include: Security, Privacy and Data
Protection, OTG Audit Chain, Validation Engineering, Edge Gateway and SCADA
integration, ML Platform, and each vertical Pack team (J1 Pharma, J2 Auto,
J3 Aero, J4 Medical Device, J5 Food).

### 1.4 Platform team (Internal Developer Platform)

The platform team builds the Internal Developer Platform (IDP) that
stream teams consume as self-service. The IDP reduces the cognitive load
of stream teams by abstracting infrastructure, observability, CI/CD,
secret management, and DR into services with clear APIs and catalogs.
The platform team optimizes for stream team velocity, not for platform
elegance.

In HESEM, the platform team owns: service mesh and mTLS; identity and
token infrastructure (OIDC / SAML / WebAuthn); observability (OTel +
structured logs + distributed trace + metric dashboards); CI/CD pipelines
with all quality gates; developer environments and ephemeral preview
environments; DR and backup tooling; secret management; audit chain
anchor service; cross-region orchestration; and the IDP service catalog.

### 1.5 Three interaction modes

```
COLLABORATION       Both teams work closely for a defined, short period
                    to jointly explore or deliver a new capability. High
                    coordination cost. Used during: new pack integration
                    with platform; initial stream team formation; cross-
                    team feature that spans multiple domains.
                    Duration: bounded (2-8 week sprints). Unbounded
                    collaboration is a team topology failure signal.

X-AS-A-SERVICE      One team consumes what another team provides via a
                    clear API and catalog. Lowest coordination cost.
                    Used in: all stream teams consuming platform IDP;
                    all stream teams consuming security review service;
                    all stream teams consuming validation pack templates.
                    SLA: service team publishes SLA; consumer team treats
                    it like an external dependency.

FACILITATING        Enabling team coaches stream team. Finite engagement
                    with measurable capability transfer. The enabling
                    team defines exit criteria (e.g., stream team passes
                    GAMP 5 review independently). Once criteria met, mode
                    ends and enabling team disengages.
                    Failure pattern: enabling team engagement extends
                    indefinitely because the stream team never becomes
                    capable — this indicates the stream team lacks the
                    right composition (hire or train).
```

---

## 2. Stream-aligned teams per Part C domain

Each domain from Part C maps to one or more stream-aligned teams. The
mapping below is the steady-state target (Phase 3-4). In early phases,
domains are combined into fewer teams.

```
TEAM                    DOMAIN STREAMS         RESPONSIBILITIES
Commercial Team          C1, D1                Order-to-cash; quotation;
                                               customer contract; SO lifecycle
Engineering Team         C2, D7                BOMs; ECO; CDOC; engineering
                                               document release; change request
Planning Team            C3, D3               Demand planning; MPS; MRP;
                                               production order release; WO
Procurement Team         C4, D2               PO lifecycle; supplier QA; IQC;
                                               GRN; supplier portal
Inventory+Trace Team     C5, C8, D11          Inventory; WMS; serialization;
                                               DSCSA; UDI; lot traceability
Shopfloor / MES Team     C6, D3, D5           MES execution; SCADA integration;
                                               edge gateway; OEE; production
                                               event capture
Quality / eQMS Team      C7, D5, D6, D7,      NQCASE; CAPA; CDOC; Inspection;
                         D10, D12, D13, D14   batch release; APR; PSUR; UDI
                                               submission; GIDEP query;
                                               supplier quality (combined with
                                               Procurement until Phase 3)
Maintenance + EHS Team   C9, D9               CMMS; PM orders; EHS; LOTO;
                                               incident reporting
Workforce Team           C10, D8              Training matrix; competency;
                                               operator qualification
Finance Team             C11                  GL; cost center; financial
                                               reporting; integration to ERP
Integration Team         C12                  Connector framework; EDI;
                                               sub-processor governance (I7)
Analytics + AI Team      C13                  AI advisory features (L2);
                                               analytics module; ML feature
                                               delivery; AI governance ledger
                                               (L3 §10 owner)
Frontend Team            HMV4 program          Slice-based delivery across all
                                               domains; 18 Wave 1 roots;
                                               GraphicsAuthority; design tokens
```

### 2.1 Team composition target (steady-state Phase 3-4 per stream team)

```
ROLE                    COUNT    NOTES
Backend engineer         2-3     PHP + PostgreSQL; domain knowledge
Frontend engineer        1       HMV4 slice program; GraphicsAuthority
QA / Automation          1       Playwright E2E; fixture authorship
Domain SME               0.5-1   Shared or part-time; regulatory knowledge
                                 (e.g., pharmacist on J1 pack team)
Team lead                1       Engineering + delivery responsibility
```

Smaller teams (4-5 members) are preferred up to Phase 3. Amazon "two pizza"
rule applies: if a stream team grows beyond 8, split it.

---

## 3. Complicated-subsystem teams (full specification)

### 3.1 Security team (CS-A — continuous stream)

```
STEADY-STATE SIZE:     4 FTE
COMPOSITION:
  Security Lead           1    Owns threat model, security ADRs, pen-test
                               program, security review gates
  Application Security    1    SAST/DAST tooling; code review gates;
                               OWASP Top 10 continuous enforcement
  Cloud/Infra Security    1    Cloud posture management; IAM; network
                               segmentation; Vault administration
  Identity Engineer       1    OIDC/SAML/WebAuthn; MFA enforcement;
                               SCIM provisioning; privileged access mgmt

INTERACTION MODES:
  Stream teams:    X-as-a-Service (threat model template; security
                   review gate service; security findings catalog)
  Platform team:   Collaboration (identity infra; mTLS; secret mgmt
                   built jointly)
  Validation team: Collaboration (security validation evidence for
                   GAMP 5 / EU AI Act red-team artifacts)
  AI Team:         Collaboration (L4 red-team coordination quarterly)

OUTPUTS:
  - Threat model per stream team (annual refresh)
  - Pre-release security gate (every release; < 48h SLA)
  - Quarterly penetration test (external + internal)
  - Bug bounty program management
  - Monthly vulnerability scan + remediation tracking
  - Security training (annual per employee + new hire onboarding)
  - I7 sub-processor security review (per K3 connector certification)
  - CS-A security posture report (monthly; board-visible at Series B+)
```

### 3.2 Validation Engineering team (CS-B — continuous stream)

```
STEADY-STATE SIZE:     3 FTE
COMPOSITION:
  Validation Lead         1    CVLP coordination per release; GAMP 5
                               methodology owner; per-tenant validation
                               package assembly and sign-off
  Validation Engineer     1    IQ/OQ/PQ authorship; RTM maintenance;
                               per-capability validation test execution
  Validation Engineer     1    Per-pack validation overlay (J1..J5);
                               per-tenant gap analysis; CSA training

INTERACTION MODES:
  All stream teams:  Facilitating (GAMP 5 coaching at onboarding;
                     per-regulated-change consultation)
                     X-as-a-Service (validation pack templates;
                     RTM tooling; CVLP artifact assembly)
  Security team:     Collaboration (cross-validates security controls
                     as part of GAMP 5 evidence)
  Pack teams:        Collaboration (per-pack regulatory validation
                     overlay; per-tenant CVLP customization)

OUTPUTS (per release, per H2 §14):
  - Per-release CVLP package (per tenant on Pro+ tier)
  - RTM extract per affected capability
  - Validation test execution summary
  - Risk delta + control delta assessment
  - SBOM + provenance attestation (per release)
  - Per-tenant gap analysis (what tenant must additionally validate)
  - Per-pack PSA (Pre-Submission Artifact) where J4 Medical Device
  - Annual IQ/OQ/PQ review for each tenant (Sovereign tier)
```

### 3.3 OTG Audit Chain team

```
STEADY-STATE SIZE:     2-3 FTE (shared with Backend platform until Phase 3)
OWNS:                  B6 OTG (One-Time Guarantee) audit substrate;
                       EC-1..EC-38 evidence class schemas; audit pack
                       assembly tooling; per-lot chain verification;
                       tamper-evidence at storage layer
INTERACTION MODE:      X-as-a-Service (audit emission SDK consumed by
                       all stream teams; chain verification API)
GROWTH TRIGGER:        Phase 3 when Enterprise tenant volume requires
                       dedicated chain verification capacity
```

### 3.4 ML Platform team

```
STEADY-STATE SIZE:     2-3 FTE (from Phase 3; AI Lead + 1-2 ML engineers)
OWNS:                  Model serving infrastructure; feature store;
                       retraining pipeline; model registry; inference
                       cost metering (L2 §9 usage billing); model
                       version management; A/B evaluation framework
INTERACTION MODE:      X-as-a-Service (model endpoints consumed by
                       Analytics+AI team features); Collaboration with
                       Security for L4 red-team
OUTPUTS:               Per-model production readiness report (pre-deploy);
                       L3 governance ledger entries per model; inference
                       cost report (monthly; feeds K1 AI usage billing)
```

### 3.5 Per-pack teams (J1-J5)

```
TEAM           COMPOSITION            PHASE ACTIVE
J1 Pharma      Pack Lead + 2-3 FTE    Phase 2+ (Seed-Series A)
  Pack          (pharmacist domain     Owns: PSUR drafting; APR evidence;
               expert required;        21 CFR Part 11; Annex 11; GxP
               regulatory consulting  pack-specific regulatory content;
               on retainer)           J1 add-on pricing model (K1 §5)

J2 Auto Pack   Pack Lead + 2 FTE      Phase 2+ (overlaps J1 if different
               (IATF 16949 domain)     customer target; sequential by
                                      market priority in K2 §7)
                                      Owns: IATF 16949; AIAG APQP; PPAP;
                                      supplier quality integration

J3 Aero Pack   Pack Lead + 2-3 FTE    Phase 3+ (Series A-B)
               (AS9100 + ITAR domain) Owns: AS9100; ITAR classification;
                                      GIDEP query integration; DFARs
                                      clause compliance; EARS database

J4 Med Device  Pack Lead + 2-3 FTE    Phase 3+ (Series A-B)
               (ISO 13485 + FDA       Owns: ISO 13485; 21 CFR Part 820;
               domain; MDR EU)        UDI/GUDID submission; EU MDR;
                                      PCCP (Predetermined Change Control
                                      Plan); 510(k) pre-submission support

J5 Food Pack   Pack Lead + 2 FTE      Phase 3-4 (Series B)
               (FSSC 22000 + FDA      Owns: HACCP; HARPC; FSMA; FSSC
               domain)                22000; GFSI benchmarking; supplier
                                      approval for food ingredients
```

---

## 4. Platform team (IDP scope — full specification)

The platform team's mandate is to reduce the cognitive load of all stream
teams by providing infrastructure as self-service. A stream team should
never need to ask the platform team to provision an environment, grant a
secret, or configure a deployment pipeline — these should be self-service
catalog operations.

```
IDP SERVICE CATALOG:

SERVICE                    PROVIDES                          INTERACTION
Service mesh + mTLS        Istio / Envoy sidecar injected    X-as-a-Service
                           automatically in all pods;         (zero-config)
                           zero-trust network segmentation

Identity + token infra     OIDC issuer; SAML SP; token       X-as-a-Service
                           exchange; M2M credentials;
                           WebAuthn relying party endpoint

Observability stack        OTel collector; Prometheus;        X-as-a-Service
                           Grafana; per-service dashboards
                           auto-generated from OTel schema;
                           SLO burn-rate alerts (per M5)

CI/CD pipelines            Per-service pipeline template;     Self-service
                           all quality gates embedded          catalog entry
                           (node --check; JSON lint;
                           Playwright; forbidden diff;
                           feature flag inert; security scan)

Ephemeral preview envs     Per-PR namespace; auto-cleanup      Self-service
                           on PR close; full stack per        (10 min to live)
                           service; DNS routing auto

DR + backup tooling        Per-tenant backup automation;       X-as-a-Service
                           daily + weekly retention           (configured via
                           schedule; cross-region copy;        tenant tier)
                           restoration test automation (I4)

Secret management          HashiCorp Vault; per-service        X-as-a-Service
                           secret namespaces; rotation
                           automation; audit log per access

Audit chain anchor         OTG anchor emission SDK;            X-as-a-Service
                           chain verification API;            (SDK + docs)
                           tamper-detection webhook

Cross-region orch          Blue-green deployment across        Self-service
                           regions; traffic weight control;    (feature flag
                           sovereign region activation gate    controls)

IDP service catalog        Self-service catalog of all         Web UI + API
                           platform services + runbooks;
                           SLA per service; incident history
```

Platform team quality gate: stream teams must not build their own versions
of any platform service. If a stream team's backlog includes "set up
monitoring for our service," that is a platform gap, not a stream team task.

---

## 5. Enabling teams (full specification)

```
ENABLING AREA              TRIGGER                         EXIT CRITERIA
Domain-Driven Design       Any new stream team formation;  Stream team can
                           new engineer onboarded          independently identify
                                                           aggregates, bounded
                                                           contexts, and ADRs
                                                           for their domain

GAMP 5 / CSA               Any engineer joining eQMS,      Stream team engineer
Validation Practice        Pharma, MD, or Aero stream;     passes V-model review
                           any new Validation Engineer      independently
                           onboarded

AI Discipline (L1-L5)      Any team beginning to use       Team demonstrates
                           AI-assisted code generation;     correct task class
                           any team adding AI advisory      usage (T1-T15 per L5)
                           features to their stream         without enabling
                                                           team review

Secure Coding (OWASP)      Annual mandatory + new hire     Annual training
                           onboarding; new threat class     completion record;
                           emerges from pen-test            security gate pass
                           (e.g., new OWASP Top 10 item)    rate ≥ 95%

Accessibility (WCAG 2.1)   Any new frontend module;        Axe automated pass;
                           any engineer joining frontend    manual accessibility
                           team                             review pass

Incident Response          Quarterly game day per I3;      Team achieves MTTR
Game Day                   new team formation              < 1h P50 in
                                                           simulation

Regulated Change Mgmt      Any stream team beginning to    Stream team produces
                           touch eQMS-regulated workflows   RFC and change
                                                           control record
                                                           independently
```

---

## 6. Phased team scaling W0 through W14

### 6.1 Phase 0 — Pre-seed (Months 0-12; W0 begin)

```
FTE COUNT:     1-3 (founders only; no payroll hires)
AI ASSIST:     Claude Code / Codex augmentation replacing 3-5 junior
               engineers for code generation, test authorship, docs
COMPOSITION:
  CEO/Founder            1    Product + engineering + sales
  CTO/Co-Founder         1    Architecture + backend + DevOps (if 2-person)
  Design-partner contact 0    Design partner relationship (founder-led)

TEAM STRUCTURE:
  No formal team topology at this phase. Founder wears all hats.
  Platform = GitHub Actions + shared cloud account (cost-minimal).
  No Kubernetes until Phase 1 (use PaaS / serverless where possible).

WAVE DELIVERABLE: W0 (foundation) in progress
```

### 6.2 Phase 1 — Seed (Months 12-30; W1-W3)

```
FTE COUNT:     4-12 FTEs
COMPOSITION:
  Backend Engineers        2-3    PHP + PostgreSQL; full-stack capable
  Frontend Engineer        1      HMV4 slice program; GraphicsAuthority
  Security/Platform        1      Combined role until Phase 2
  Quality/Validation       1      GAMP 5; CVLP authorship; domain expertise
  CSM (first)              1      Could be founder initially
  Domain Specialists       0-2    Contract regulatory consultants (not FTE)

TEAM STRUCTURE:
  No formal stream teams yet — one cross-functional team.
  Platform services: basic CI/CD + observability only.
  Security: founder-led with Security/Platform engineer.
  Validation: Validation Engineer supports all regulatory output.
  Customer success: CSM + founder own all customer relationships.

WAVE DELIVERABLE: W1 (eQMS core + prototype); W2 (planning + MES)
HIRING SEQUENCE:  Backend engineers first (platform velocity);
                  then Quality/Validation (CVLP for first pilot);
                  then Security/Platform; then CSM
```

### 6.3 Phase 2 — Series A (Months 30-48; W4-W6)

```
FTE COUNT:     14-22 FTEs
COMPOSITION:
  Backend Engineers        4-5    Domain stream assignment begins
  Frontend Engineers       2      HMV4 slice velocity
  Security Lead            1      CS-A formation begins
  Platform Engineer        1-2    IDP build begins
  ML / AI Lead             1      L2 AI feature development begins
  Privacy Lead             1      GDPR + PDPA; sub-processor governance
  Validation Lead + Eng    2      CS-B formation; CVLP at scale
  CSMs                     2-3    1:10 Pro ratio; 1 per Enterprise
  TAM                      1      First Enterprise tenant
  Marketing Manager        1      Content + SEO; inbound motion
  AEs                      1-2    First professional AE (outbound Pro)
  CFO / Finance            1      (could be part-time / fractional)

TEAM STRUCTURE:
  Stream teams: 2-3 cross-domain teams forming (Quality+eQMS; Core+Planning;
                Integration+Analytics)
  Platform team: 1-2 FTE; IDP MVP with CI/CD + observability + identity
  Security team: 2 FTE (CS-A partial)
  Validation team: 2 FTE (CS-B partial)
  Customer Success: CSM pod (VP CS hire target at Phase 2-3 boundary)

WAVE DELIVERABLE: W4 (first pack GA); W5 (second pack); W6 (vertical depth)
HIRING SEQUENCE:  ML/AI Lead (L2 features need specialist from W4);
                  Privacy Lead (Enterprise requires GDPR readiness);
                  TAM (first Enterprise closes before TAM hire = founder gap)
```

### 6.4 Phase 3 — Series A+ / Series B (Months 48-60; W7-W8)

```
FTE COUNT:     25-40 FTEs
COMPOSITION:
  Stream-aligned teams     15-20  Per domain (teams of 4-5; see §2.1)
  Platform team            3-4    Full IDP; multi-region; Sovereign prep
  Security team (CS-A)     4      Full 4-FTE composition
  Validation team (CS-B)   3      Full 3-FTE composition
  ML Platform              2-3    Separate from AI Lead
  OTG Audit Chain          2      Separated from platform
  Pack teams               4-8    J1 Pharma full; J2 or J4 starting
  VP Engineering           1      Hired at Phase 3 start
  VP Customer Success      1      Hired at Phase 3 start (if not earlier)
  CSMs                     4-6    1:10 Pro; 1:1 Enterprise
  TAMs                     2-3    1:1 Enterprise; Sovereign per agreement
  AEs                      3-5    Enterprise + mid-market
  VP Sales                 1      Hired at Phase 3 start
  Marketing team           2-3    Content + Demand Gen + Events
  Legal / Finance          1-2    General Counsel (or outside); CFO

TEAM STRUCTURE:
  Formal stream-aligned teams per §2 (teams of 4-5 per domain cluster)
  Complicated-subsystem teams: Security, Validation, OTG, ML Platform
  Enabling teams: active AI Discipline + Secure Coding annual cycle
  Platform team: full IDP service catalog; Enterprise cluster operational

WAVE DELIVERABLE: W7 (Enterprise tier + AI advisory); W8 (multi-region)
HIRING SEQUENCE:  VP Engineering + VP CS first (management layer before
                  team formation); then stream-aligned team leads; then
                  individual contributors per stream
```

### 6.5 Phase 4 — Series B (Months 60-84; W9-W12)

```
FTE COUNT:     40-80 FTEs
COMPOSITION:
  Stream-aligned teams     25-35  All 13 domain streams with dedicated teams
  Platform team            5-6    Multi-region; Sovereign active
  Security team (CS-A)     4-5    +1 for Sovereign ITAR compliance
  Validation team (CS-B)   3-4    +1 for Sovereign tier per-tenant IQ/OQ/PQ
  ML Platform              3-4    Model serving at Enterprise scale
  Pack teams               10-16  All 5 packs with full teams (J1+J2+J3+J4+J5)
  Customer Success         8-12   VP CS + Team leads + CSM pod per segment
  TAM team                 4-6    Enterprise expansion pool
  Sales                    8-12   VP Sales + AE pool + SDR + Field Eng
  Marketing                4-6    Brand + Demand + Product Marketing + Events
  Engineering leadership   3-4    VPE + domain leads
  Finance + Legal          3      CFO + Controller + GC
  HR / People Ops          2      HR Lead + recruiter
  Field Engineering        2-3    N. America + SEA deployment support

TEAM STRUCTURE:
  Stream teams fully staffed; each team autonomous delivery cadence
  Pack teams operating independently; marketplace launch team forms
  Sovereign team activates at W11 (4+ FTE dedicated)
  CS pod structure: Core pod (CSM × N); Pro pod (CSM × N); Enterprise pod
  Customer Marketing: begins at Phase 4 (reference program per K2 §8)

WAVE DELIVERABLE: W9 (packs 4+5); W10 (all packs GA); W11 (N.America);
                  W12 (marketplace + connector cert program)
```

### 6.6 Phase 5 — Series C / Pre-IPO (Months 84-120; W13-W14)

```
FTE COUNT:     80-120 FTEs
COMPOSITION:
  All Phase 4 teams expanded for global coverage
  Regional engineering leads: N. America; EU; ANZ
  Regional sales + CS: per geographic phase (K2 §4)
  Partner Success team: 3-4 FTE (per K3 partner program)
  Sovereign team: expanded per ITAR + EU Sovereign + ANZ
  Enablement team: dedicated training + certification for customer admins
  Executive team: CEO + CTO + CFO + VPE + VP CS + VP Sales + VP Marketing
                  + General Counsel + VP People
  Board structure: per K4 §10.1 (7-9 seat corporate governance)

WAVE DELIVERABLE: W13 (EU Sovereign; ANZ); W14 (pre-IPO; DORA Elite sustained)
```

---

## 7. Continuous streams CS-A and CS-B

### 7.1 CS-A Security — operating model

CS-A is not a project team. It is a continuous capability stream that
operates in parallel with all delivery waves. It has no "done" milestone.

```
CADENCE:
  Daily:      Vulnerability feed review; SAST finding triage
  Weekly:     Security debt backlog review; new PRs flagged for review
  Monthly:    Threat model review (per stream team rotation); cloud
              posture report; privileged access audit
  Quarterly:  External penetration test; bug bounty program review;
              red-team coordination with AI team (L4); DORA security
              metrics review; HESEM threat landscape update
  Annual:     Full threat model refresh per stream team; annual
              security training (all employees); SOC 2 audit support

SECURITY GATE PROCESS (per every release):
  1. Stream team submits release candidate to Security review queue
  2. Security Lead assigns to AppSec engineer (< 4h response)
  3. AppSec reviews: SAST report; dependency scan; diff threat model;
     forbidden pattern grep (per ADR-0009; no hardcoded secrets; no
     fixture loader in production)
  4. Issues filed in security backlog (Critical = block; High = block;
     Medium = remediate within 30 days; Low = track)
  5. Sign-off artifact committed to release evidence (per H4 EC-27)
  6. Gate pass time SLA: ≤ 48h for standard release;
                          ≤ 72h for new pack or new integration

SECURITY DEBT POLICY:
  Critical: remediate before next release (blocks deploy)
  High: remediate within 7 days of discovery
  Medium: remediate within 30 days
  Low: tracked in security backlog; reviewed quarterly
  Exception process: Security Lead + CTO sign-off; time-bounded
```

### 7.2 CS-B Validation Engineering — operating model

CS-B coordinates the CVLP (Customer Validation Leverage Pack) for every
Pro and Enterprise tier release. The CVLP is a committed baseline delivery,
not an optional service.

```
CVLP DELIVERY TIMELINE (per H2 §14):
  T-14 days before release candidate:
    - Validation Lead reviews release candidate scope
    - Identifies affected capabilities; routes to appropriate validator
    - Opens per-tenant CVLP scope: what delta from previous release
  T-7 days before release:
    - Validation test execution complete for affected capabilities
    - RTM extract generated; risk delta computed
    - Per-pack PSA updated where J4 Medical Device impacted
  T-3 days before release:
    - Validation Lead assembles CVLP package per tenant
    - Per-tenant gap analysis completed (what tenant must validate)
    - CVLP package reviewed by Validation Lead + domain stream lead
  T-0 (release day):
    - CVLP package delivered to CSM for tenant distribution
    - SBOM + provenance attestation published to tenant portal
    - CVLP delivery logged in cs-b-validation-ledger (per L3)

CVLP PACKAGE CONTENTS:
  - Changelog (tenant-impact summary; non-technical language)
  - SBOM (Software Bill of Materials; per release; CycloneDX format)
  - Provenance attestation (signed; per supply chain security)
  - Validation test results summary (per affected capability)
  - RTM extract (per affected capability; traceability to URS)
  - Risk delta (new risks introduced; controls added)
  - Control delta (new controls; modified controls)
  - Per-pack appendix: J1 (GxP overlay); J2 (IATF overlay);
    J3 (AS9100 overlay); J4 (PSA + PCCP delta); J5 (HACCP overlay)
  - Per-tenant gap analysis (identifies what the customer must
    additionally validate that HESEM cannot do on their behalf)
  - ISO cert status update (if cert scope affected)

CVLP QUALITY METRICS:
  Delivery on schedule:     ≥ 95% of releases (target: 100%)
  Tenant satisfaction:      CSAT ≥ 4.2/5 on validation pack quality
  Gap analysis accuracy:    External audit agreement rate ≥ 90%
  Package completeness:     Zero omissions of mandatory artifacts
  Time saved for tenant:    Quantified per-tenant (target: 40-60%
                            reduction in tenant-side validation effort
                            vs comparable non-HESEM platform)
```

---

## 8. Customer Success operating model

### 8.1 CSM ratios per tier

```
TIER          CSM RATIO              ENGAGEMENT MODEL
Core          1 CSM : 50 tenants     Digital CS; templated onboarding;
                                     community forum; shared office hours;
                                     health score automated; no dedicated
                                     QBR (annual check-in only)

Pro           1 CSM : 10 tenants     Named CSM; monthly check-in async;
                                     quarterly live QBR (per I8 §5);
                                     CVLP delivery coordination;
                                     expansion motion per K2 §10

Enterprise    1 CSM + 1 TAM per      Named CSM + named TAM dedicated;
              tenant                  weekly async + monthly live sync;
                                     quarterly QBR with executive sponsor;
                                     CVLP delivery priority; architecture
                                     review; expansion plan documented

Sovereign     Dedicated team per     Per-agreement; typically 2-3 FTEs
              agreement              embedded or dedicated; custom SLA
                                     per contract; QBR monthly not quarterly

Pilot         Shared CSM during      Founder or CSM; high-touch; pilot
              pilot period           success = Pro conversion
```

### 8.2 Customer health score model

Health score drives proactive intervention before a customer becomes
a churn risk. Score is computed weekly; below 60 triggers CSM action;
below 40 triggers escalation.

```
COMPONENT              WEIGHT    MEASUREMENT
Workflow adoption        25%     % of contracted workflows with ≥ 5
                                 user-events/week in trailing 30 days
User activity            15%     DAU/MAU ratio; active user count vs
                                 contracted seats
AI feature adoption      10%     % of tenants with ≥ 1 AI advisory
                                 feature active and used weekly
SLA performance          15%     % of monthly SLO targets met (per M5);
                                 SEV-1/2 count in trailing 90 days
CSAT score               15%     Post-onboarding + post-incident + quarterly
                                 survey mean score (scale 1-5)
CVLP engagement          10%     % of CVLP packages acknowledged and acted
                                 on by tenant (Pro/Enterprise only)
Expansion signal          5%     Expansion ARR in trailing 12 months / ACV
                                 at contract start (positive = healthy)
Renewal signal            5%     Months since last renewal discussion; open
                                 renewal date proximity

COMPOSITE SCORE:
  ≥ 80:   Green (healthy; low intervention)
  60-79:  Yellow (monitor; schedule check-in)
  40-59:  Amber (CSM action required within 5 business days)
  < 40:   Red (executive escalation; retention plan within 48h)

HEALTH SCORE AUTOMATION:
  Computed nightly from telemetry; surfaced in CSM dashboard;
  weekly digest to VP CS; monthly rollup to CEO board report
```

### 8.3 QBR model (per I8 §5)

```
FREQUENCY:      Quarterly (Pro/Enterprise); Monthly (Sovereign)
ATTENDEES:      CSM + TAM (Enterprise); Customer Sponsor; Customer Admin;
                VP CS (if Red or critical renewal); occasional CTO/CEO
AGENDA (90 min):
  1. Business outcomes review: what the customer achieved with HESEM
     (regulatory audits passed; lot rejections prevented; QBR-to-QBR
     improvement metrics)
  2. SLA and performance review: SLO compliance per tenant (M5);
     incidents + resolution quality; DORA metrics (customer-facing view)
  3. CVLP review: last 1-2 releases; what validation effort tenant saved;
     open items from prior CVLP
  4. Product roadmap: next 2 waves of relevance to tenant's pack;
     AI advisory features available; expansion opportunities
  5. Account health: health score trend; adoption gaps; user training needs
  6. Commercial: renewal timeline; expansion ARR discussion (per K2 §5);
     pricing tier alignment for next year
  7. Action items: logged in HESEM CRM; CSM owns follow-up within 5 days

QBR SUCCESS METRIC:
  Customer NPS ≥ 50 (target: ≥ 60 at Series A+)
  Action item close rate: ≥ 85% within 30 days
  Executive sponsor attendance: ≥ 80% of QBRs
```

---

## 9. TAM model (Technical Account Manager)

The TAM is a customer's embedded technical advisor. For Enterprise tenants,
the TAM prevents the "shadow IT" pattern where a large customer builds
around HESEM's limitations instead of engaging HESEM to solve them.

```
TAM RESPONSIBILITIES:
  Architecture:     Maintains per-tenant architecture diagram; reviews
                    customer's integration topology; advises on optimal
                    connector and API usage pattern
  Upgrade adoption: Ensures tenant is current within N-1 releases; plans
                    upgrade timing to minimize tenant downtime and
                    validation burden; coordinates CVLP delivery
  Feature requests: Channels tenant feature requests through product
                    feedback process; advocates in roadmap reviews;
                    manages expectations on wave plan delivery
  Validation coord: Works with CS-B to coordinate per-tenant CVLP
                    delivery; attends tenant's internal validation review
                    when invited; provides technical evidence for
                    customer's regulatory submissions
  Escalation:       Second-layer escalation after CSM; owns critical
                    technical issues through resolution; participates in
                    SEV-1 incident bridge (per I3 §4) for Enterprise tenants

TAM METRICS:
  TTFR (Time-to-First-Resolution) for TAM-owned escalations: < 4h
  Upgrade adoption: ≥ 90% of Enterprise tenants on N-1 or newer
  Feature request triage: 100% responded within 5 business days
  Architecture review: annual per tenant (scheduled)

TAM: CSM RELATIONSHIP:
  CSM owns the relationship + commercial motion.
  TAM owns the technical depth + product adoption.
  TAM reports to VP Engineering (not VP CS) to preserve technical
  credibility with customer's engineering team.
```

---

## 10. DORA Elite targets per team

DORA Elite is the target for all stream-aligned teams at Phase 3+ and for
the platform team at Phase 2+. DORA metrics are tracked per team, not
just company-wide, because a single laggard team can bottleneck delivery
across the platform.

```
METRIC                  ELITE TARGET         HESEM MEASUREMENT
Deployment frequency    ≥ daily per team     Per-team deploy count
                        (target: on-demand)  (CI/CD pipeline telemetry)

Lead time for change    < 1h P50             Time from PR merge to
                        < 1d P95             production deployment complete

Change failure rate     < 5% of deployments  Deployments requiring rollback
                        rollback-required    or hotfix within 24h of deploy

MTTR (mean time to      < 1h P50             Time from incident open to
restore service)        < 4h P95             SEV resolved + customer notice

DORA REPORTING CADENCE:
  Weekly per team:  automated from CI/CD telemetry + incident tracker
  Monthly company:  aggregated; surfaced in board metrics (Series B+)
  Quarterly QBR:    per-tenant DORA view (deployment frequency + MTTR
                    for their tenant cluster) — demonstrates vendor
                    engineering maturity to regulated customers

DORA IMPROVEMENT PROCESS:
  Any team below Elite threshold for 2 consecutive weeks: Platform team
  or enabling team engagement to identify bottleneck (slow CI pipeline;
  long review queue; missing test automation; deployment dependency)
  Improvement target: 4-week sprint to resolve identified bottleneck
  If team cannot reach Elite in 2 sprints: team structure or tooling
  review (per VP Engineering)

REGULATED MANUFACTURING DORA NOTE:
  Enterprise and Sovereign customers care about DORA as a proxy for
  vendor quality. A regulated manufacturer choosing a SaaS platform
  wants to know that the vendor can deploy fixes in hours, not weeks.
  DORA Elite metrics are a commercial differentiator and are presented
  in QBRs and sales due diligence packages.
```

---

## 11. Per-team interface matrix

The interface matrix defines what each team provides to and consumes from
every other team. This is not coordination — it is a service catalog with
SLAs. Teams do not negotiate interfaces ad hoc; they consume from the
catalog.

```
PLATFORM TEAM
  PROVIDES TO ALL STREAM TEAMS:
    - CI/CD pipeline (self-service catalog; SLA: < 10 min build)
    - Observability dashboards (auto-generated; SLA: < 1h for new service)
    - Ephemeral preview environments (SLA: < 10 min to live)
    - Secret injection (Vault; SLA: zero-config for standard secrets)
    - Audit chain anchor SDK (library + docs; SLA: version per release)
    - Staging + production deploy gates (SLA: < 5 min per gate check)
  CONSUMES FROM:
    - Security team: IAM architecture; secret governance; mTLS cert mgmt
    - OTG team: audit anchor design (collaboration, then X-as-a-Service)

SECURITY TEAM (CS-A)
  PROVIDES TO ALL STREAM TEAMS:
    - Threat model template (annual refresh per team; on-demand for new features)
    - Pre-release security gate sign-off (SLA: ≤ 48h)
    - Security training (annual + onboarding; SLA: scheduled)
    - Vulnerability findings (SAST + pen-test; SLA: triage within 24h)
    - Sub-processor review (per K3 connector cert; SLA: ≤ 10 business days)
  PROVIDES TO PLATFORM TEAM:
    - Identity architecture + mTLS governance
    - Vault configuration governance
  CONSUMES FROM:
    - AI team: red-team coordination (quarterly)
    - Validation team: security control validation evidence (per release)
    - Platform team: observability for security events

VALIDATION TEAM (CS-B)
  PROVIDES TO ALL STREAM TEAMS:
    - Validation pack templates (per capability class; SLA: < 2h for template)
    - RTM tooling (SaaS tool or HESEM internal; SLA: always available)
    - Pre-release CVLP sign-off (SLA: per CVLP timeline §7.2)
    - GAMP 5 coaching (facilitating mode; bounded engagement)
    - Per-tenant gap analysis (SLA: 72h per tenant per release)
  PROVIDES TO CUSTOMER SUCCESS:
    - CVLP package per tenant per release (SLA: T-0 delivery)
    - Technical validation support for tenant audits (SLA: 5 business days)
  CONSUMES FROM:
    - Stream teams: release candidate scope (T-14); affected capability list
    - Security team: security control evidence (per release)
    - Pack teams: per-pack regulatory overlay content

ANALYTICS + AI TEAM
  PROVIDES TO ALL STREAM TEAMS:
    - AI advisory feature endpoints (X-as-a-Service; SLA per M5 Tier-1 SLOs)
    - Model deployment approval (pre-production readiness report; SLA: 5 days)
    - L3 governance ledger template (per AI-assisted artifact)
    - AI feature flag catalog (which features are active per tier)
  PROVIDES TO CUSTOMER SUCCESS:
    - AI feature adoption analytics per tenant (monthly)
    - AI feature usage billing data (per K1 usage metering; monthly)
  CONSUMES FROM:
    - Security team: L4 red-team coordination (quarterly)
    - ML Platform team: model serving endpoints
    - Platform team: model deployment infrastructure

CUSTOMER SUCCESS
  PROVIDES TO ALL STREAM TEAMS:
    - Customer feedback aggregation (per QBR cycle; structured)
    - Customer-impact analysis (for proposed changes; SLA: 3 business days)
    - Customer escalation triage (per incident; SLA: < 1h initial response)
    - Expansion signal (per customer; feeds product roadmap prioritization)
  CONSUMES FROM:
    - Validation team: CVLP packages (per release per tenant)
    - All stream teams: release notes + customer impact summary (per release)
    - Platform team: per-tenant health telemetry (uptime; performance)
    - AI team: AI adoption analytics per tenant
```

---

## 12. Ways of working

Ways of working codify the operating norms that allow distributed, async-
first teams to produce regulated-quality software without coordination
overhead. These are not aspirational values — they are operational
disciplines with enforcement mechanisms.

```
ASYNC-FIRST                 Primary communication channel is async
                            (Slack thread; GitHub issue; RFC doc;
                            ADR). Sync meetings reserved for: decision
                            blockers; postmortems; design collaboration
                            sessions; team retrospectives. No "FYI"
                            meetings.

RFC FOR CROSS-TEAM CHANGE   Any change affecting more than one stream
                            team requires an RFC document (≤ 2 pages)
                            with open comment window (≥ 3 business days).
                            ADR for architecture-class decisions (frozen).

2-REVIEWER CODE REVIEW      Every PR requires 2 approvals. ≥ 1 reviewer
                            must be from outside the author's team for
                            changes touching platform or security surface.
                            Review SLA: 24h (P50); 48h (P95).

DOCUMENTATION AS CODE       ADRs, wave plan, team contracts, and API
                            docs live in the repo (not Confluence).
                            Confluence for ephemeral notes only.

WAVE-GATE DISCIPLINE        A team may not begin the next wave until the
                            current wave quality gates pass (per ADR-0005).
                            This applies at team level, not just product
                            level: a team with incomplete tests from W3
                            cannot start W4 work.

PRE-PRODUCTION POSTURE       All HMV4 surfaces feature-flagged inert by
(per ADR-0001)              default. No "production go-live" vocabulary
                            in any team artifact. A CI grep enforces
                            forbidden vocabulary in customer-facing
                            material.

HUMAN AUTHORITY BOUNDARY    Per L1 §1: AI assists; humans decide. Any
(per L1)                    PR that introduces an AI feature which could
                            appear to bypass human authority at a BD-1..
                            BD-36 boundary is blocked by Security review.

ON-CALL ROTATION            Per I3 §2: stream teams rotate primary +
DISCIPLINE                  secondary. No engineer on primary for more
                            than 2 consecutive weeks. On-call pause after
                            SEV-1: 48h minimum. PagerDuty or equivalent.

BLAMELESS POSTMORTEM        Every SEV-0/1/2 triggers a blameless
                            postmortem within 5 business days (per I3).
                            Postmortem artifact committed to repo.
                            Action items tracked in incident tracker.

QUARTERLY OKRs              Each stream team publishes OKRs aligned to
PER TEAM                    the company's wave plan milestone for that
                            quarter. OKRs are public within the company.
                            Retrospective at end of quarter: what was
                            delivered; what was missed; why.

ANNUAL ROADMAP              Wave plan review at each year boundary.
COMMITMENT                  Engineering commits to wave delivery; sales
                            commits to GTM targets per K2. No sales
                            commitment to a feature delivery date without
                            VP Engineering sign-off (per K0 priority §4).

ENGINEERING WELLBEING        Sustainable pace: no repeated sprint
                            overages for more than 2 consecutive weeks.
                            On-call alert volume: if > 5 pages/engineer/
                            week sustained, alert infrastructure review
                            required. Quarterly burnout check in retro.

DIVERSITY + INCLUSION        Hiring rubric includes structured interview
                            process (no informal referral-only pipeline).
                            Compensation bands published internally.
                            Vendor neutrality in technology selection.

GRAPHICS AUTHORITY           Per CLAUDE.md and ADR-0009: no hardcoded
COMPLIANCE                   visual tokens in any stream team output.
                            GraphicsAuthority.tokens.read() for all
                            visual parameters. Rejected at code review.

ETHICS OF AI                 Per L1 §6 + L4 + L5: all AI-generated
                            artifacts logged in L3 governance ledger.
                            No AI feature deployed without red-team
                            assessment (L4). Prompt discipline enforced
                            per L5 task class model.
```

---

## 13. Hiring and retention per phase

### 13.1 Hiring sequence and criteria

```
PHASE 1 (Seed): Generalist + high trust hires
  Priority:   Backend engineers > Quality/Validation > Security/Platform
  Criteria:   Can own an entire domain end-to-end; not specialists yet;
              high tolerance for ambiguity and pivoting; regulatory
              manufacturing interest (domain knowledge teachable but
              interest not teachable)
  Anti-pattern: Hiring a large team before product-market fit (dilutes
               equity; creates management overhead before the product
               is defined enough for specialists to contribute)

PHASE 2 (Series A): Specialists begin joining
  Priority:   AI Lead > Privacy Lead > Validation Lead > first AE
  Criteria:   Deep domain expertise (GAMP 5; GDPR; ML serving;
              regulated SaaS sales cycles); willing to build from scratch;
              experience in a startup (≥ 1 prior early-stage role)
  Anti-pattern: Hiring VP-level executives before product-market fit
               (VPs build teams; if the product direction changes, VP
               hire may be wrong for the new direction)

PHASE 3 (Series A-B): Team leads and domain experts
  Priority:   VP Engineering > VP CS > Stream team leads
  Criteria:   Prior experience managing 5-15 engineers; regulated SaaS
              or manufacturing software context strongly preferred;
              can define engineering process without over-engineering it
  Anti-pattern: Promoting a senior engineer to VP Engineering without
               ensuring they want to manage vs. contribute technically
               (offer Staff Engineer path as alternative)

PHASE 4-5 (Series B-C): Scaling
  Priority:   Regional leads > Pack specialists > Enterprise AEs + TAMs
  Criteria:   Experience scaling teams 2-3× in 18 months; multi-region
              experience; customer-facing regulated industry experience
```

### 13.2 Compensation framework

```
BANDS:        Published internally per level + role + region
              Vietnam: engineer bands ×0.6 vs US market (purchasing power
              adjusted + equity compensation)
              SEA: ×0.7-0.8 vs US; US/EU: at market rate
EQUITY:       ESOP per K4 §11; 4-year vest + 1-year cliff (employee)
              New hire: 0.05-1.0% depending on level + phase
              Refresh grants at annual review for high performers
OTE STRUCTURE: Sales roles per K1 §18 (base + commission + accelerator)
               CS roles: base + bonus tied to NRR and CSAT
               Engineering: base + annual performance bonus (Phase 3+)
PERKS:         Remote-first; home office stipend ($1,500 one-time);
               Learning budget ($1,500/year per engineer);
               Conference allowance (1 relevant conference/year);
               Regulated manufacturing certification reimbursement
               (GAMP 5, ISO Lead Auditor, ITAR compliance training)
```

### 13.3 Retention risk model

```
RISK CATEGORY         SIGNAL                    MITIGATION
Key-person dependency  1 engineer owns > 30%     Pair-on-critical;
                       of critical domain         knowledge transfer sprint;
                       knowledge                  hire second in domain

Technical burnout      On-call pages > 5/week    Alert volume review;
                       sustained; retro           infrastructure fix;
                       flags overtime             on-call pause after SEV-1

Compensation gap       Engineer gets competing    Annual compensation review
                       offer > 20% above band     vs market; band adjustment
                                                  if systematic gap

Career path block      Engineer has been at       Staff Engineer path offer;
                       same level > 18 months     team lead opportunity;
                                                  external conference + talk

Cultural mismatch      Team retro repeatedly      Skip-level conversation;
                       flags collaboration or      manager coaching;
                       process friction           team structure review

ATTRITION TARGET:      < 15%/year through Series B
                       < 12%/year at Series C+
KNOWLEDGE PRESERVATION: All ADRs, domain knowledge, and architectural
                        decisions in repo (not in heads); departing
                        engineer conducts knowledge transfer session
                        (structured; 3-5 hours); documentation review
                        on departure; per M6 R-O4 (key-person risk)
```

---

## 14. Per-team OKR alignment

```
COMPANY OKR ALIGNMENT STRUCTURE (quarterly):

Company OKRs (CEO sets):
  - ARR target for quarter (per K4 stage)
  - Wave delivery milestone (per ADR-0005 wave plan)
  - Customer health target (NRR; CSAT; churn rate)
  - Team health target (DORA metrics; attrition)

Stream team OKRs (stream lead sets, aligned to above):
  - Feature delivery targets (specific wave capabilities)
  - Quality targets (test coverage; DORA; incident rate)
  - Technical debt reduction target (per ADR health)

CS teams OKRs (VP CS sets):
  - NRR target per segment (Core/Pro/Enterprise)
  - CVLP delivery rate target (CS-B coordination)
  - QBR completion rate (Enterprise)
  - Health score improvement (number of red→amber and amber→green)

OKR REVIEW CADENCE:
  Monthly:   Team lead reviews with team; progress flagged async
  Quarterly: Company OKR retro (all-hands); OKR setting for next quarter
             VP Engineering + VP CS present to CEO + board
  Annual:    Annual OKR retrospective; company roadmap alignment for
             next wave phase
```

---

## 15. RACI

```
RESPONSIBLE:
  VP Engineering — stream team structure; platform IDP; DORA metrics;
  wave delivery execution; hiring plan per phase; team topology changes.

  VP Customer Success — CSM ratios; QBR cadence; health score model;
  CVLP delivery coordination; TAM operating model; NRR targets.

  CTO — CS-A and CS-B continuous stream composition; architecture
  decisions; enabling team mandate; OTG audit chain governance.

ACCOUNTABLE:
  CEO — overall team size and cost per K4 payroll model; executive
  hiring decisions (VP-level); board reporting on team health metrics.

CONSULTED:
  CFO — headcount cost model per phase; loaded FTE cost assumptions;
  payroll timing relative to funding close.

  Security Lead — CS-A composition and scope; security gate SLAs.

  Validation Lead — CS-B composition and scope; CVLP delivery SLAs.

  Pack Leads — pack team composition; regulatory specialist sourcing.

  Legal / General Counsel — employment agreements; contractor vs FTE;
  per-region employment law compliance; IP assignment.

INFORMED:
  All employees — team structure changes; hiring plan; OKR targets;
  wave delivery milestones affecting their team.
  Board — quarterly team health report; DORA metrics; attrition.
  Customers (Enterprise) — TAM assignment changes; CSM assignment
  changes; at QBR.
```

---

## 16. Decision phrase

```
K5_CUSTOMER_SUCCESS_AND_TEAM_TOPOLOGY_V10_LOCKED
S4-13_K_BUSINESS_DEEP_UPGRADE_COMPLETE
NEXT: S4-14_M1_M2_M3.md
```
