# K5 — Customer Success and Team Topology

```
chapter_purpose: how HESEM is staffed to deliver V9 program; how
                 customers are managed end-to-end; team interactions;
                 phased scaling plan; CSM and TAM operating model;
                 health score; expansion + churn protection
owner_role:      Founder + VP Engineering + VP Customer Success
sources:         Team Topologies (Skelton + Pais 2019),
                 Customer-Success Manifesto, Gainsight CSM playbook,
                 Google SRE Workbook (team interaction patterns),
                 DORA research, Spotify squad-tribe-chapter model
```

People is the gating constraint of any V9 execution. The plan can be
perfect on paper and fail in the room because the wrong skills meet
the wrong work. This chapter is the operating model: how teams are
shaped, how they interact, how they scale per wave, and how
customers are owned end-to-end through the lifecycle.

---

## 1. Team Topologies framework

HESEM uses four team types (per Skelton-Pais):

```
STREAM-ALIGNED          owns a stream of business value end-to-end;
                        cross-functional; primary delivery unit
ENABLING                 coaches stream teams in new capability;
                        time-bounded engagement
COMPLICATED-SUBSYSTEM    deep expertise pocket; provides consultation
                        + sometimes ownership (Security, ML, audit
                        chain, edge-gateway)
PLATFORM                 builds the IDP (Internal Developer Platform)
                        + shared services that stream teams consume
                        as-a-service
```

Three interaction modes:

```
COLLABORATION           short-term; both teams jointly explore /
                        deliver; high coordination cost; bounded
X-AS-A-SERVICE          one team consumes the other; clear API +
                        catalog; lowest coordination
FACILITATING             enabling team coaches stream team; finite;
                        once stream team is capable, mode ends
```

---

## 2. Stream-aligned teams (per V9 program)

```
TEAM                                 STREAM
Commercial team                       C1 + D1 (order to cash)
Engineering team                      C2 + D7 (engineering + doc release)
Planning team                         C3 + D3 (plan to produce)
Procurement team                      C4 + D2 (procurement to pay)
Inventory + Trace team                C5 + C8 + D11 (release to trace)
Shopfloor / MES team                  C6 + D3 + D5 (plan to produce + inspect)
Quality / eQMS team                   C7 + D5 + D6 + D7 + D10 + D12 +
                                      D13 + D14 (largest stream)
Maintenance team                      C9 + D9
Workforce team                        C10 + D8
Finance team                          C11
Integration team                      C12 + per-integration owners
Analytics + AI team                   C13 + per-feature owners (per L2)
Frontend team                         per pattern × per domain (slice
                                      teams within HMV4 program)
```

---

## 3. Complicated-subsystem teams

```
TEAM                                 OWNERSHIP
Security                              I7 + L4 + cyber posture
Privacy + Data Protection             I7 §9 + GDPR / CCPA / PIPL
Audit Chain + OTG                     B6 substrate
Validation Engineering                H2 + per-pack validation
                                      packs
Edge Gateway + SCADA                  C6 edge stack + ISA-95
ML Platform                           model serving + feature store
                                      + retraining infra
Pharma Pack                           J1
Auto Pack                             J2
Aero Pack                             J3
MD Pack                               J4
Food Pack                             J5
```

---

## 4. Platform team (IDP)

```
SCOPE
  Service mesh + mTLS + identity infra
  Observability (OTel + log + trace + metric)
  Developer environments + ephemeral preview
  CI/CD (per I1)
  DR + backup tooling (per I4)
  Secret management (per I7)
  Audit chain anchor service
  Cross-region orchestration

INTERACTION MODE
  X-as-a-Service to all stream teams
  Collaboration with Security + Compliance
  Facilitating with new packs at onboarding
```

---

## 5. Enabling teams

```
DOMAIN-DRIVEN DESIGN ENABLING       per new domain context
GAMP-5 / CSA ENABLING                per new validation engineer
                                     onboarding
AI-DISCIPLINE ENABLING               per L1..L5 team adoption
SECURE-CODING ENABLING               annual; OWASP refresh
ACCESSIBILITY ENABLING                per F10
INCIDENT-RESPONSE ENABLING            per I3 game day
```

---

## 6. Phased team scaling per wave

```
PHASE 0 (pre-W0; founders)        1-3 founders + AI augmentation
PHASE 1 (W0-W3)                    4-5 → 10-12 FTEs:
                                    - 2-3 backend engineers
                                    - 2 frontend engineers
                                    - 1 SRE / Platform
                                    - 1 Security
                                    - 1 Quality / Validation
                                    - 1 Compliance (could be founder)
                                    - 1 CSM (could be founder)
PHASE 2 (W4-W6)                    14-20 FTEs:
                                    - team size doubles in
                                      stream-aligned roles
                                    - 1 dedicated AI Lead
                                    - +1 Platform
                                    - +1 SRE
PHASE 3 (W7-W8)                    25-35 FTEs:
                                    - per-domain stream teams form
                                    - +Pharma Lead OR Auto Lead
                                    - +1 Privacy Lead
PHASE 4 (W9-W12)                   50-80 FTEs:
                                    - Pack-specific teams (J1..J5
                                      depending on roadmap)
                                    - +TAM team (Enterprise tenants)
                                    - +Security expanded (4 FTE CS-A)
                                    - +Validation expanded
                                      (3 FTE CS-B)
                                    - Sales expansion
PHASE 5 (W13+)                     80-120 FTEs:
                                    - Pack teams mature
                                    - +Sovereign team (per agreement)
                                    - +Field engineering
                                    - +Customer Marketing
                                    - +Partnerships
```

These are minimum counts; high-customer growth or higher pack
adoption may demand more.

---

## 7. Continuous streams

```
CS-A SECURITY (per Part G)
  4 FTE minimum in steady state
  Includes: Security Lead, AppSec engineer, CloudSec engineer,
   IAM / Identity engineer
  Cross-cuts every team via guidance + reviews

CS-B CONTINUOUS VALIDATION (per Part G)
  3 FTE minimum in steady state
  Includes: Validation Lead, Validation Engineer × 2
  Per-release validation summary; per-tenant CVLP
```

---

## 8. Customer Success operating model

```
PER-TIER CSM RATIO
  Core         shared CSM; 1 CSM : ~50 tenants
  Pro          dedicated CSM; 1 CSM : ~10 tenants
  Enterprise   dedicated CSM + TAM; 1 each per tenant
  Sovereign    dedicated team per agreement
  Pilot        shared CSM during pilot

QBR CADENCE
  Quarterly per tenant (per I8 §5)
  NPS / CSAT survey post-onboarding + post-incident +
  quarterly thereafter

ESCALATION PATH
  Tenant Admin → CSM → Implementation Lead → Engineering Lead
  → CTO → CEO

HEALTH SCORE COMPONENTS
  Adoption: workflows live; users active; AI feature adoption
  SLA performance: per-tenant SLO compliance
  Incidents: SEV-1/2 count; time-in-recovery
  Audit pass: customer-side audits HESEM contributed to
  Cost: per-tenant cost vs envelope (per I6)
  CSAT: post-event + quarterly
  Engagement: QBR attendance; product feedback rate
  Renewal: annualized health-trend
  Total score: composite weighted
  Threshold: < 60 → CSM intervention (proactive)
            < 40 → red alert + CTO awareness
```

---

## 9. TAM (Technical Account Manager) operating model

```
TAM (Enterprise + Sovereign tiers only)
  Embedded technical advisor for tenant
  Owns:
    - per-tenant architecture diagrams
    - integration roadmap
    - upgrade adoption
    - tenant-specific feature requests
    - tenant-side validation coordination
    - per-tenant escalation as second layer after CSM
  Time allocation:
    - Enterprise: 0.5-1.0 FTE per tenant
    - Sovereign: per agreement
  Reports to: VP Customer Success
  Co-owned with: Implementation Lead during onboarding
```

---

## 10. Customer-side artifacts (CVLP per H2 §14)

Per release HESEM CSM coordinates delivery:

```
CHANGELOG (per release)              tenant-impact summary
SBOM + Provenance attestation        per release
Test results summary                  per affected capability
RTM extract                            per affected capability
Risk delta + control delta            per affected capability
PSA (Pre-Submission Artifact)         where MD pack
PCCP envelope updates                  where applicable
ISO cert updates                       per cycle
Per-pack-specific artifacts            (per J1..J5)
Per-tenant gap analysis vs CVLP        what tenant must additionally
                                       validate
```

---

## 11. DORA Elite targets per team

```
METRIC                            ELITE
Deployment frequency               >= daily per stream team
Lead time for change                < 1h P50; < 1d P95
Change failure rate                 < 5%
Mean time to restore                 < 1h P50; < 4h P95
```

Reported weekly per team, quarterly company. Used at QBR (per I8 §5)
to demonstrate vendor maturity to customers.

---

## 12. Per-team interfaces (catalog)

```
PLATFORM TEAM PROVIDES                STREAM TEAM CONSUMES
  Service mesh + identity              auth integration
  Observability stack                   instrumentation per service
  CI/CD pipeline + gates                build + test pipeline
  Audit chain anchor service            audit emission per service
  Telemetry storage                     metric / log / trace export
  Secret management                      secret access via Vault
  Sandbox environments                   per-feature dev / test

SECURITY TEAM PROVIDES                 STREAM TEAM CONSUMES
  Threat model template                  per-change threat assessment
  Security review                         pre-release security gate
  Security training                        annual + onboarding
  Pen-test + bug bounty                    findings + remediation

VALIDATION TEAM PROVIDES                STREAM TEAM CONSUMES
  Validation pack templates                per-capability validation
  CSA / GAMP 5 coaching                    per regulated change
  Validation review                          pre-release sign-off
  RTM tooling                                 per regulated change

COMPLIANCE TEAM PROVIDES                STREAM TEAM CONSUMES
  Regulatory horizon scan                   per-pack monitoring
  Per-clause guidance                        per change implementation
  Audit pack assembly                        per audit cycle
  Per-tenant DPA review                       per onboarding

AI TEAM PROVIDES                         STREAM TEAM CONSUMES
  AI model serving                           per advisory integration
  Model lifecycle support                    per feature deployment
  Red-team coordination                       quarterly per Tier-2
                                            feature

CUSTOMER SUCCESS PROVIDES               STREAM TEAM CONSUMES
  Customer feedback aggregation             per QBR cycle
  Customer-impact analysis                    per change
  Customer escalation triage                  per incident
```

---

## 13. Ways of working

```
ASYNC-FIRST                    primary communication async
SYNC ONLY WHEN NECESSARY        live for decision blockers,
                              postmortems, design reviews
DOCUMENTATION AS CODE           ADRs + plan in repo
2-REVIEWER CODE REVIEW          24h SLA per PR
RFC FOR CROSS-TEAM CHANGE       short doc + open comment window
DAILY CHECK-IN PER TEAM         brief async update; not standup
WEEKLY COMPANY UPDATE           CEO note + each team summary
QUARTERLY OKRs                   per team; aligned to V9 wave
ANNUAL ROADMAP                   wave commit + capacity check
BLAMELESS POSTMORTEM             SEV-0/1/2; per I3
WAVE-GATE DISCIPLINE             pass current wave before starting
                                next (per ADR-0005 + V3 RULE-5)
PRE-PRODUCTION POSTURE           per ADR-0001; per V3 RULE-3
ON-CALL ROTATION DISCIPLINE      per I3 §2
HUMAN AUTHORITY BOUNDARY          per L1 §1; AI assists humans;
                                humans decide regulated
ETHICS OF AI                       per L1 §6 + L4 + L5
ENGINEER WELLBEING                 sustainable on-call;
                                compensation; rotation pause
DIVERSITY + INCLUSION              hiring + retention; vendor
                                neutrality
```

---

## 14. Hiring + retention discipline

```
HIRING SCHEDULE (per phase)
  Phase 1: founder + first hires; high-trust + high-versatility
  Phase 2: domain-specialist hires (compliance, AI, validation)
  Phase 3: stream-aligned team formation
  Phase 4: pack-specific team building
  Phase 5: per-region + per-pack expansion

RETENTION
  Compensation per industry benchmark + equity
  Sustainable on-call (per I3 rotation)
  Quarterly engagement survey
  Career-path documented per role
  Per-team OKR alignment to company

ATTRITION RISK MITIGATION
  Per R-O4 per M6
  V9 + ADRs durable knowledge
  Pair-on-critical convention
  Cross-training matrix per role
  Single-point-of-failure detection
  Documentation review on departure
```

---

## 15. Decision phrase

```
K5_CUSTOMER_SUCCESS_AND_TEAM_TOPOLOGY_BASELINE_LOCKED
PART_K_DEEP_UPGRADE_COMPLETE
NEXT: PART_L_AI_DISCIPLINE/L0_PART_L_OVERVIEW.md
```
