# 18_TEAM_TOPOLOGY_AND_DORA.md

## Purpose

GPT Pro V4 does not address how the team is structured to deliver this plan or how delivery performance is measured. V5 produces the team topology + DORA metrics + ways-of-working substrate.

References:

- *Team Topologies* — Skelton & Pais (2019)
- *Accelerate* — Forsgren, Humble, Kim (2018)
- *DORA State of DevOps* annual reports
- *Project to Product* — Mik Kersten
- *Domain-Driven Design* — Eric Evans
- *The Phoenix Project / Unicorn Project* — Gene Kim

---

## Section 1 — Team Topology framework

### 1.1 Four team types

```text
Stream-aligned team       owns a stream of business value end-to-end
Enabling team             helps stream-aligned teams adopt new capability
Complicated subsystem     deep expertise required (e.g., ML, security cryptography)
Platform team             builds platform consumed by stream-aligned teams
```

### 1.2 Three interaction modes

```text
Collaboration             two teams work closely; high coupling
X-as-a-service            one team consumes another's product; clear API
Facilitating              enabling team coaches stream team
```

---

## Section 2 — HESEM team topology by phase

### 2.1 Phase 0 — pre-Wave 0 (founders)

```text
1-3 founders + AI augmentation (Codex, Claude Code, Cursor)
no formal team structure yet
focus: prototype + first 4-6 slices
```

### 2.2 Phase 1 — Wave 0-3 (founding team)

```text
Stream-aligned: HMV4 prototype team (3-4)
Platform: 1 (or shared with HMV4 team)
Enabling: 0 (founders enable themselves)
Complicated subsystem: 0

Total: 4-5 engineers + 1 designer + 1 PM (could be founder)
```

### 2.3 Phase 2 — Wave 4-6 (early-stage)

```text
Stream-aligned (per domain area):
  - Quality & Compliance team (4)
  - Manufacturing & Production team (4)
  - Workforce & Training team (3)
Platform team (4):
  - identity, observability, OTG, IDP
Enabling team (1-2):
  - cross-cutting expertise; helps streams adopt platform
Complicated subsystem (0-1):
  - security depth; ML readiness

Total: 16-20 engineers
       + 2 designers
       + 2 PMs
       + 1 SRE
```

### 2.4 Phase 3 — Wave 7-8 (scale)

```text
Stream-aligned (per domain):
  - Quality (4-5)
  - Manufacturing (4-5)
  - Workforce (3-4)
  - Supply chain (4-5)  [Wave 6+]
  - Maintenance (3-4)   [Wave 6+]
Platform team (6-8):
  - identity, observability, OTG, IDP, security, deployment
Data Platform team (3-4):
  - CDC, MV, search, time-series
ML Platform team (3-4):
  - feature store, model registry, training, inference
Enabling team (2-3):
  - vertical pack readiness, regulated training
Complicated subsystem teams:
  - Security (3-4): threat modeling, pen test coordination, IR
  - Compliance (2-3): GxP, IATF, AS, vertical pack experts
  - Cryptography / Audit Chain (1-2)

Total: 35-50 engineers
       + 4-5 designers
       + 5-6 PMs
       + 3-4 SREs
       + 2-3 security specialists
```

### 2.5 Phase 4 — Wave 9-10 (multi-vertical)

```text
Stream-aligned (per vertical):
  - Pharma vertical pack team (5-6)
  - Automotive vertical pack team (5-6)
  - Aerospace vertical pack team (4-5)
  - Multi-tenancy + portal team (5)
  - GraphQL + real-time team (3)
  - Connector / marketplace team (4-5)
Domain teams continue (per Phase 3) but ratio shifts to vertical
Platform team grows (10-12)
Data Platform team grows (5-6)
ML Platform team grows (5-6)
Customer Success team forms (per region)
Sales Engineering forms

Total: 80-120 engineers
       + 8-10 designers
       + 10+ PMs
       + 8+ SREs
       + 5+ security
       + customer-facing team
       + GTM team
```

V5 ADR-0271: Phased team topology with stream/platform/enabling/complicated split.

---

## Section 3 — Cognitive load management

### 3.1 Per team cognitive load

Each stream-aligned team should own:

```text
- 1-2 product domains (not more — Conway's Law)
- 1 codebase area or microservice
- < 1500 LOC of feature surface to maintain mentally
- 5-9 people max (Dunbar tribe)
```

### 3.2 Decoupling tactics

```text
- platform team takes cross-cutting concerns away from stream teams
- enabling team coaches; doesn't own
- complicated subsystem isolation (security, ML, audit chain)
- stream-aligned teams DO NOT own infrastructure (yields to platform)
```

V5 ADR-0272: Cognitive load budget per team; if exceeded, split.

---

## Section 4 — Conway's Law alignment

```text
"Organizations design systems that mirror their communication structure."

V5 strategy:
  - architecture domains map to teams (one team per domain area)
  - cross-team contracts via stable APIs (file 09)
  - cross-team coupling via PR review queue (light)
  - never via shared mutable state across teams
```

---

## Section 5 — DORA metrics (4 keys)

### 5.1 The metrics

```text
Deployment Frequency:    how often we deploy to production
Lead Time for Change:    commit → production-equivalent
Change Failure Rate:     % of deploys that cause incident or rollback
Mean Time to Recovery:    when incident occurs, how fast restored
```

### 5.2 Performance levels

```text
                                Elite       High        Medium      Low
Deployment Freq                 daily+      weekly      monthly     <monthly
Lead Time for Change            < 1 hour    < 1 day     < 1 week    > 1 week
Change Failure Rate             0-15%       0-15%       16-30%      45-60%
Mean Time to Restore            < 1 hour    < 1 day     < 1 week    > 6 months
```

### 5.3 V5 commits to Elite tier (per Wave 8)

```text
Deployment Frequency:    daily per team minimum (per stream-aligned team)
Lead Time:               < 1 hour P50; < 1 day P95
Change Failure Rate:     < 5%
Time to Restore:         < 1 hour P50; < 4 hours P95
```

V5 ADR-0273: DORA Elite-tier targets per W8 + continuous measurement.

### 5.4 Measurement

```text
- deployment events tagged with service + version
- commit timestamps from git
- incident timestamps from incident_record OTG node
- metrics aggregated per service per team
- weekly team scorecard
- quarterly company review
```

---

## Section 6 — Beyond DORA — SPACE framework

DORA gives 4 outcomes. SPACE adds:

```text
S Satisfaction & Wellbeing       NPS for engineers, churn, burnout signal
P Performance                     code review thoroughness, design quality
A Activity                        pull requests, commits (with caveats)
C Communication & Collaboration   review turnaround, knowledge sharing
E Efficiency & Flow               flow state, interruptions, focus time
```

V5 ADR-0274: SPACE framework signals tracked per team; never weaponized as individual metric.

---

## Section 7 — Ways of working

### 7.1 Sprints / Continuous flow

```text
Stream-aligned teams: 1-week or 2-week iterations (team choice)
Platform team: continuous flow (no fixed sprints)
ML Platform team: monthly model release cycle
```

### 7.2 Ceremonies (lean)

```text
Daily standup (max 15 min)
Weekly demo (per team; 30 min)
Bi-weekly retrospective (per team; 60 min)
Monthly cross-team architecture sync (60-90 min)
Quarterly OKR setting + DORA review
Annual strategy + organizational review
```

### 7.3 Documentation requirements

```text
Per service:           README, runbooks, ADRs in code
Per domain:            module-summary, business rules
Per platform feature:  how-to + when-to + when-not-to
Per release:           release notes for customers
```

V5 ADR-0275: Documentation as code; review required at PR time.

---

## Section 8 — Code review discipline

```text
- 2-reviewer requirement on main branches
- 24h SLA for review (escalation if exceeded)
- review focus: correctness, design, security, observability, accessibility
- automated checks (CI) prerequisite for review
- design docs (RFCs) for changes affecting > 1 team's surface
- ADRs for architecture-level decisions
```

V5 ADR-0276: 2-reviewer + 24h SLA + RFC-for-cross-team.

---

## Section 9 — Hiring + onboarding

### 9.1 Engineering levels

```text
L0  Intern / new graduate
L1  Engineer
L2  Senior Engineer
L3  Staff Engineer
L4  Principal Engineer
L5  Distinguished Engineer
L6  Fellow / CTO

Management:
M1  Engineering Manager
M2  Senior Engineering Manager
M3  Director
M4  Senior Director
M5  VP Engineering
M6  CTO
```

### 9.2 Required skill matrix

```text
Stream-aligned engineers:    domain knowledge + full-stack basics
Platform engineers:          deep platform + observability
Data engineers:              SQL + dbt + streaming + warehouse
ML engineers:                Python + statistics + MLOps
Security engineers:          ASVS, threat modeling, pen test
SRE:                         Kubernetes + observability + incident response
Compliance engineers:        regulatory standards + audit + validation
Designers:                   accessibility + design systems
PMs:                         domain knowledge + customer empathy
```

### 9.3 Onboarding (90 days)

```text
Week 1:   environment setup, AI workflow training, ADR + RFC reading
Week 2-4: shadow + pair on existing slice
Week 5-8: own a small slice end-to-end
Week 9-12: graduate to full ownership
```

V5 ADR-0277: 90-day onboarding playbook per role.

---

## Section 10 — Open-source contribution policy

```text
- contributions to open-source dependencies allowed (encouraged)
- contributions to standards (ISA-95, OPC UA, etc.) encouraged
- IP review for HESEM-internal libraries before open-sourcing
- per ADR-0269 (file 17): selective open-source strategy
```

---

## Section 11 — Distributed team norms

V5 supports distributed-first teams:

```text
- async-first communication (Slack/Teams + GitHub)
- meetings only where async fails
- timezone-friendly: documents-of-record over synchronous meetings
- clear handoff protocols across timezones
- recorded meetings for those who couldn't attend
- documentation standard: written, searchable, dated
- quarterly in-person / hybrid offsites
```

V5 ADR-0278: Async-first norms; sync only when necessary.

---

## Section 12 — Engineering culture

```text
Principles:
  - psychological safety (Edmondson)
  - blameless postmortem (file 12 §7.3)
  - written before spoken (RFCs over meetings)
  - bias to action with reversibility analysis
  - root cause over symptom
  - measure outcomes not output
  - respect for the trade (regulated/compliance is not bureaucracy)
  - durable artifacts over volatile messages
  - one engineer's stuck = team's stuck (collective ownership)
  - learning > shipping > moving on (postmortem capture)
```

V5 ADR-0279: Engineering culture principles.

---

## Section 13 — Compensation philosophy

```text
- top-quartile of regional market for engineering levels
- equity participation for all employees
- transparent leveling (rubric published internally)
- promotion calibration twice yearly
- skip-level 1:1s every 6 weeks
- structured feedback (peer + manager + skip)
```

---

## Section 14 — DEI commitments

```text
- gender + ethnicity + location representation goals
- inclusive hiring practices (structured interviews, blind reviews where applicable)
- mentorship programs
- parental leave generous (per region; never below 16 weeks)
- accessibility accommodations
```

---

## Section 15 — Cumulative ADRs

```text
ADR-0271  Phased team topology
ADR-0272  Cognitive load budget per team
ADR-0273  DORA Elite-tier targets
ADR-0274  SPACE framework signals
ADR-0275  Documentation as code
ADR-0276  2-reviewer + 24h SLA + RFC-for-cross-team
ADR-0277  90-day onboarding playbook
ADR-0278  Async-first norms
ADR-0279  Engineering culture principles
```

---

## Decision phrase

```text
V5_TEAM_TOPOLOGY_AND_DORA_BASELINE_LOCKED
NEXT_FILE: 19_QUANTITATIVE_MODELS.md
```
