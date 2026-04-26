# M5 — SLO Directory

```
chapter_purpose: complete SLO catalog with target, measurement,
                 owner, error-budget policy, alert routing, breach
                 behavior; canonical reference cited from I2 + I3
owner_role:      SRE Lead with Domain Leads
sources:         I2 §2 (the 22 SLOs), Google SRE Workbook,
                 OpenTelemetry semantic conventions, customer DPA
                 templates
```

This directory is the canonical SLO list. Other Parts cite SLO IDs
defined here. New SLO additions go through H7 Class B+ and update
this chapter.

---

## 1. SLO catalog (the 22)

```
ID      NAME                                     TARGET     WINDOW    OWNER
                                                                       (PAGED ON BURN)
SLO-1   auth.decide p95 < 20ms                    99.9%      30d        Identity team
SLO-2   policy directive availability              99.95%     30d        Authority team
SLO-3   workflow.commit p95 < 500ms                 99.9%      30d        Workflow team
SLO-4   domain.root.write p95 < 100ms                99.95%     30d        Per-domain team
SLO-5   projection freshness lag < 5s                 99.5%      30d        Projection team
SLO-6   OTG integrity (axiom violations)              100%       7d         Platform team
SLO-7   surface render p95 < 200ms                    99.9%      30d        Frontend team
SLO-8   api request p95 < 500ms                        99.9%      30d        Per-domain team
SLO-9   api error rate < 0.1%                          99.9%      30d        Per-domain team
SLO-10  audit chain anchor lag < 25h                    100%       7d         Platform team
SLO-11  log ingest lag < 60s                            99.9%      30d        SRE team
SLO-12  trace ingest lag < 60s                          99.9%      30d        SRE team
SLO-13  CDC consumer lag < 60s                          99.9%      30d        Integration team
SLO-14  AI inference p95 < 200ms (T1)/2000ms (T2)       99.5%      30d        AI team
SLO-15  audit pack export p95 < 24h                      99%        90d        Compliance team
SLO-16  backup success rate                              100%       30d        SRE team
SLO-17  DR drill quarterly cadence                        100%       90d        SRE team
SLO-18  per-tenant cost SLA                                99%        30d        FinOps team
SLO-19  vuln patch within severity-window                  100%       90d        Security team
SLO-20  validation evidence freshness (non-expired)        100%       always     Quality team
SLO-21  edge gateway uptime per site                        99.9%      30d        Edge team
SLO-22  customer onboarding within tier SLA                 90%        90d        CSM team
```

---

## 2. Per-SLO definition (canonical)

Per SLO the following fields are documented:

```
SLO-1  auth.decide p95 < 20ms
  SLI:           p95 latency of auth.decide RPC across all callers
                 across all regions across all tenants
  NUMERATOR:     auth.decide calls completed in < 20ms (server time)
  DENOMINATOR:   all auth.decide calls (excluding caller-side timeout
                 + 5xx server errors)
  EXCLUSIONS:    planned maintenance windows; degraded-mode periods
  WINDOW:         30-day rolling
  ERROR BUDGET:   0.1% (≈ 43 minutes per 30 days)
  ALERTS:         fast-burn (5min/1h, 14.4×) → page Identity primary
                  slow-burn (1h/6h, 6×) → ticket Identity team
  BREACH BEHAVIOR: deploy freeze for Identity team until budget
                   restored (per CS-A); per H7 expedited fix path

SLO-6  OTG integrity (axiom violations)
  SLI:           count of axiom violation events
  NUMERATOR:     0
  DENOMINATOR:   any axiom violation triggers SLO breach
  EXCLUSIONS:    none
  WINDOW:         7-day rolling (very strict; integrity SLO)
  ERROR BUDGET:   0 events
  ALERTS:         any violation → page Platform team SEV-1
  BREACH BEHAVIOR: SEV-1 incident; halt mutations on affected
                   scope; per RB-INC-005

SLO-10 audit chain anchor lag < 25h
  SLI:           hours since last successful daily anchor
  NUMERATOR:     hours since last anchor
  DENOMINATOR:   threshold 25h
  WINDOW:         7-day rolling
  ERROR BUDGET:   0 events
  ALERTS:         24h elapsed → page; 25h → SEV-1
  BREACH BEHAVIOR: SEV-1 per RB-INC-004; H1 §3 if regulator-relevant

SLO-15 audit pack export p95 < 24h
  SLI:           p95 elapsed time from request to delivered pack
  NUMERATOR:     pack exports delivered within 24h
  DENOMINATOR:   all pack export requests
  EXCLUSIONS:    customer-initiated pause; tenant-side delay
  WINDOW:         90-day rolling
  ERROR BUDGET:   1% (per H3 SLA)
  ALERTS:         95% utilization → ticket Compliance team
  BREACH BEHAVIOR: H3 §4 SLA at risk; H8 CAPA on pre-staging pipeline

SLO-19 vuln patch within severity-window
  SLI:           per-CVE: time-to-patch within severity window
                 (Critical 7d / High 30d / Medium 90d / Low quarterly)
  NUMERATOR:     CVEs patched within severity window
  DENOMINATOR:   all applicable CVEs in window
  EXCLUSIONS:    formally risk-accepted with compensating control
  WINDOW:         90-day rolling
  ERROR BUDGET:   0 events (100% target)
  ALERTS:         per CVE per severity window threshold
  BREACH BEHAVIOR: SEV per severity; H7 retro-CR if KEV; H8 CAPA

SLO-20 validation evidence freshness
  SLI:           any regulated capability with stale validation
                 evidence (per H2 §13 freshness floor)
  NUMERATOR:     0 stale capabilities
  DENOMINATOR:   any stale capability triggers breach
  EXCLUSIONS:    capability marked deprecated
  WINDOW:         always (continuous)
  ERROR BUDGET:   0 events
  ALERTS:         freshness floor breach → page Quality team
  BREACH BEHAVIOR: capability degrades from L6 to L5 maturity;
                   regulated mutations blocked; H8 CAPA

SLO-22 customer onboarding within tier SLA
  SLI:           per-tenant onboarding actual time vs tier SLA per
                 K1 + I8 §2
  NUMERATOR:     tenants onboarded within tier SLA
  DENOMINATOR:   all tenants onboarded in window
  EXCLUSIONS:    customer-side delay; force majeure
  WINDOW:         90-day rolling
  ERROR BUDGET:   10% (90% target)
  ALERTS:         per-tenant; per-cohort; per-pack
  BREACH BEHAVIOR: H8 CAPA on impl process if pattern;
                   K5 customer success review

(Pattern continues for all 22.)
```

---

## 3. Customer-facing SLA mapping

```
TIER          CUSTOMER SLA                   FROM SLO
Standard      99.5% availability             SLO-1 + SLO-3 weighted
              p95 < 1s                        SLO-7 + SLO-8
              audit pack 7-day                SLO-15 (relaxed)
Pro           99.9% availability              SLO-1 + SLO-3
              p95 < 500ms                     SLO-7 + SLO-8
              audit pack 24h                  SLO-15
Enterprise    99.95% availability             SLO-1..3 weighted
              p95 < 200ms                     SLO-7 + SLO-8
              audit pack 4h                   SLO-15 (stricter)
              DR RPO 1h / RTO 4h               SLO-16 + SLO-17
Sovereign     per-agreement                    per-tenant
```

Internal SLOs are stricter than customer SLAs to provide error
budget headroom.

---

## 4. Error budget policy (per CS-A)

```
GREEN BUDGET (≤ 50% consumed in window)
  Normal operations
  Deploy cadence per I1
  New feature ramps OK

YELLOW BUDGET (50-90% consumed)
  Slow burn alerted
  Deploy cadence reviewed (per H7 advisory)
  AI feature ramp held at current %
  Investigation prioritized
  Postmortem scope expanded

RED BUDGET (> 90%)
  Deploy freeze for affected service
  Engineering on-call dedicated to recovery
  Change scope restricted to stability-related per H7
  CAPA opened (H8) for systemic SLO health

EXHAUSTED (> 100%)
  SEV per CS-A escalation
  Customer / regulator awareness
  H7 emergency change paths only
  H8 systemic CAPA
```

---

## 5. SLO governance

```
ADD AN SLO                  H7 Class B+; new SLO requires baseline
                            data + customer-facing-SLA implication;
                            updates this chapter
RETIRE AN SLO                H7 Class A (per regulator + customer
                            implication)
TIGHTEN A TARGET            H7 Class B+; capacity verified per I5;
                            tenant communication
LOOSEN A TARGET             H7 Class A (regulated implication
                            possible); legal + tenant review
SLO-FREE ROUTE              new route at L4 cannot graduate without
                            SLO (per I2 §8)
PER-TENANT OVERRIDE         per K1 tier; per-tenant agreement
SLO REVIEW                   annual minimum; per-route at retirement;
                            consumed in QBR (per I8)
```

---

## 6. SLO ownership matrix

```
SLO       OWNING TEAM           ALTERNATE ON-CALL
SLO-1     Identity              SRE Tier-1
SLO-2     Authority             SRE Tier-1
SLO-3     Workflow              SRE Tier-1
SLO-4     Per-domain (split)    SRE Tier-1
SLO-5     Projection            SRE Tier-1
SLO-6     Platform              SRE Tier-1
SLO-7     Frontend              SRE Tier-2
SLO-8     Per-domain            SRE Tier-2
SLO-9     Per-domain            SRE Tier-2
SLO-10    Platform              SRE Tier-1
SLO-11    SRE                   SRE Tier-1
SLO-12    SRE                   SRE Tier-1
SLO-13    Integration           SRE Tier-1
SLO-14    AI                    SRE Tier-2
SLO-15    Compliance            Quality
SLO-16    SRE                   Platform
SLO-17    SRE                   Platform
SLO-18    FinOps                SRE
SLO-19    Security              SRE Tier-1 for KEV
SLO-20    Quality               Validation Eng
SLO-21    Edge                  SRE Tier-1
SLO-22    CSM                   Implementation Lead
```

---

## 7. Decision phrase

```
M5_SLO_DIRECTORY_BASELINE_LOCKED
NEXT: M6_RISK_REGISTER.md
```
