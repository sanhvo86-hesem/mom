# M5 — SLO Directory (V10)

```
chapter_id:     M5
version:        V10
chapter_purpose: complete SLO catalog with per-SLO definition (SLI,
                 numerator, denominator, exclusions, window, error
                 budget, alerts, breach behavior); customer-facing SLA
                 mapping per K1 tier; error budget policy; SLO governance;
                 SLO ownership matrix; canonical reference cited from I2+I3
owner_role:     SRE Lead with Domain Leads
cross_refs:     I2 (SLO implementation), I3 (incident response, on-call),
                I5 (capacity per tier), K1 (customer SLA per tier),
                K5 (DORA metrics), H7 (change management for SLO changes)
sources:        Google SRE Workbook (error budget policy, alerting);
                OpenTelemetry semantic conventions; SLSA supply chain
                metrics; Burn rate alerting (Spotify / Nobl9 patterns)
```

SLOs are HESEM's operational commitments to itself and to customers.
The internal SLO targets are stricter than the customer-facing SLAs
(per K1 §3) by a margin that creates error budget headroom for deployments
and incidents. A SLO defines exactly how a service level is measured
(the SLI), what the target is, how violations are detected, and what
happens when the budget is consumed.

The 22 canonical SLOs cover: authentication and authorization performance
(SLO-1,2); workflow and data mutation performance (SLO-3,4); projection
freshness (SLO-5); OTG integrity (SLO-6); frontend performance (SLO-7);
API performance and error rate (SLO-8,9); audit chain integrity (SLO-10);
observability ingestion (SLO-11,12); CDC freshness (SLO-13); AI inference
(SLO-14); audit pack export (SLO-15); backup and DR (SLO-16,17); cost
compliance (SLO-18); vulnerability patching (SLO-19); validation evidence
freshness (SLO-20); edge gateway uptime (SLO-21); customer onboarding
(SLO-22).

---

## 1. SLO catalog (all 22)

```
ID      NAME                                     TARGET   WINDOW  OWNER (paged on burn)
SLO-1   auth.decide p95 < 20ms                   99.9%    30d     Identity team
SLO-2   policy directive availability            99.95%   30d     Authority team
SLO-3   workflow.commit p95 < 500ms              99.9%    30d     Workflow team
SLO-4   domain.root.write p95 < 100ms            99.95%   30d     Per-domain team
SLO-5   projection freshness lag < 5s            99.5%    30d     Projection team
SLO-6   OTG integrity (axiom violations = 0)     100%     7d      Platform team
SLO-7   surface render p95 < 200ms               99.9%    30d     Frontend team
SLO-8   api request p95 < 500ms                  99.9%    30d     Per-domain team
SLO-9   api error rate < 0.1%                    99.9%    30d     Per-domain team
SLO-10  audit chain anchor lag < 25h             100%     7d      Platform team
SLO-11  log ingest lag < 60s                     99.9%    30d     SRE team
SLO-12  trace ingest lag < 60s                   99.9%    30d     SRE team
SLO-13  CDC consumer lag < 60s                   99.9%    30d     Integration team
SLO-14  AI inference p95 <200ms(T1)/<2s(T2)      99.5%    30d     AI team
SLO-15  audit pack export p95 < 24h              99%      90d     Compliance team
SLO-16  backup success rate                      100%     30d     SRE team
SLO-17  DR drill quarterly cadence               100%     90d     SRE team
SLO-18  per-tenant cost within tier envelope     99%      30d     FinOps team
SLO-19  vuln patch within severity window        100%     90d     Security team
SLO-20  validation evidence freshness            100%     always  Quality team
SLO-21  edge gateway uptime per site             99.9%    30d     Edge team
SLO-22  customer onboarding within tier SLA      90%      90d     CSM team
```

---

## 2. Per-SLO complete definitions

### SLO-1 — auth.decide p95 < 20ms

```
SLI:         p95 latency of the auth.decide RPC (authentication decision
             service) measured server-side, across all callers, all regions,
             all tenants.
NUMERATOR:   auth.decide calls completed in < 20ms (server processing time,
             excluding network transit to caller)
DENOMINATOR: all auth.decide calls in window, excluding: (a) 5xx server
             errors caused by auth infrastructure failure (counted in SLO-2);
             (b) requests during declared maintenance windows
EXCLUSIONS:  planned maintenance windows (max 2h/month); cascade failures
             where caller is down (not auth service)
WINDOW:      30-day rolling
ERROR BUDGET: 0.1% → 43.2 minutes per 30-day window
ALERTS:
  Fast burn: 5m window burn rate ≥ 14.4× (14.4 = 1hr/5min ratio)
             AND 1h window burn rate ≥ 14.4× → page Identity primary
  Slow burn: 1h window burn rate ≥ 6× AND 6h burn rate ≥ 6×
             → ticket Identity team (non-paging)
BREACH BEHAVIOR:
  At yellow (50% consumed): deploy freeze for Identity team changes
  At red (90%): Identity team dedicated to recovery; all changes
                require SRE approval
  At exhausted: SEV-1 declared; customer notification per SLA tier;
                H7 expedited fix path
CUSTOMER IMPACT: Auth latency directly affects every user interaction;
                 high auth latency manifests as "slow login" and
                 "slow page load" for tenants. SLA for Enterprise:
                 99.95% availability derived from this SLO.
```

### SLO-2 — policy directive availability

```
SLI:         Availability of the policy directive service (authorization
             decision service): percentage of requests that return a
             successful authorization decision (200/403) vs. returning
             a 5xx error or timing out.
NUMERATOR:   policy.authorize requests returning 200 or 403 within 500ms
DENOMINATOR: all policy.authorize requests
EXCLUSIONS:  planned maintenance; known attack traffic (rate-limit
             triggered; not a service failure)
WINDOW:      30-day rolling
ERROR BUDGET: 0.05% → 21.6 minutes per 30-day window (stricter than SLO-1
             because auth unavailability = system unavailability for all users)
ALERTS:
  Any 5xx sustained for > 1 minute → immediate page Authority primary + SRE
  Latency p99 > 100ms → page (auth latency degrades every user action)
BREACH BEHAVIOR:
  Any policy directive 5xx → SEV-1 automatically (no budget threshold)
  because authorization unavailability makes the entire platform unusable
```

### SLO-3 — workflow.commit p95 < 500ms

```
SLI:         p95 latency of workflow transaction commits (saga step
             execution that mutates an authoritative root) measured
             from API receipt to Authority Ledger write confirmed.
NUMERATOR:   workflow.commit operations completing in < 500ms
DENOMINATOR: all workflow.commit operations (excluding planned maintenance)
WINDOW:      30-day rolling
ERROR BUDGET: 0.1% → 43.2 minutes / 30 days
ALERTS:
  Fast burn (5m + 1h window ≥ 14.4×): page Workflow primary
  Slow burn (1h + 6h ≥ 6×): ticket Workflow team
BREACH BEHAVIOR: Yellow → reduce concurrent saga load; Red → deploy freeze;
                 Exhausted → SEV-2; investigate DB lock contention or
                 OTG anchor service degradation
REGULATED NOTE: Workflow.commit latency directly impacts regulated users
                waiting for batch record steps; > 2 second response
                (which this SLO prevents) causes operator frustration
                and potential workaround (paper-based recording → audit gap)
```

### SLO-4 — domain.root.write p95 < 100ms

```
SLI:         p95 latency of authoritative root mutation API calls
             (POST/PATCH that write to a root's state or fields),
             measured per domain team's service, server-side.
NUMERATOR:   root write operations completing in < 100ms
DENOMINATOR: all root write operations
WINDOW:      30-day rolling; per-domain breakdown in observability
ERROR BUDGET: 0.05% → 21.6 minutes (stricter due to regulated impact)
ALERTS:
  Per-domain fast burn → page domain primary + SRE
  Company-wide p95 > 200ms → SEV-2 platform-wide write degradation
BREACH BEHAVIOR: Per M4 §24 SM performance targets; domain team owns
                 DB optimization; Platform team assists with index review
```

### SLO-5 — projection freshness lag < 5s

```
SLI:         Time from an Authority Ledger write to the corresponding
             read model (materialized view) reflecting that write,
             measured per CDC consumer.
NUMERATOR:   CDC propagation events completing in < 5 seconds
DENOMINATOR: all CDC propagation events
WINDOW:      30-day rolling
ERROR BUDGET: 0.5% → 216 minutes (generous; eventual consistency is acceptable
             for read models; regulated queries use primary reads anyway)
ALERTS:
  Projection lag > 30s for > 5 minutes → page Projection team
  Projection lag > 60s → SEV-3 (read model significantly stale)
CUSTOMER IMPACT: Dashboards and list views may show stale data during
                 lag periods. Regulated decisions (batch release, NC disposition)
                 read from primary and are unaffected. Customer impact is
                 cosmetic but visible.
```

### SLO-6 — OTG integrity (axiom violations = 0)

```
SLI:         Count of OTG axiom violation events in the audit chain
             verification service. Any axiom violation indicates a
             potential data tampering or chain integrity failure.
NUMERATOR:   0 (zero axiom violations)
DENOMINATOR: any violation triggers a SLO breach immediately
EXCLUSIONS:  none — no exclusions are permissible for an integrity SLO
WINDOW:      7-day rolling (stricter window due to regulatory sensitivity)
ERROR BUDGET: 0 events per window (100% target = zero tolerance)
ALERTS:
  Any axiom violation event → immediate SEV-1 + page Platform primary
  + notify Compliance Lead + notify Security Lead
BREACH BEHAVIOR:
  SEV-1 declared immediately. Mutations on affected scope halted
  (per RB-INC-005 runbook). Investigation: identify which root's
  chain was broken; identify timeframe; assess regulatory impact.
  Notify affected tenant's CSM. H7 emergency path for fix.
  If root cause is external tamper: regulatory notification per H1.
CUSTOMER IMPACT: OTG integrity breach is a critical compliance event.
                 Enterprise and Sovereign tenants have contractual right
                 to notification within 24 hours of discovery.
```

### SLO-7 — surface render p95 < 200ms

```
SLI:         p95 time-to-interactive for HESEM UI surfaces (AR, WS, ML,
             DL patterns), measured from navigation start to LCP
             (Largest Contentful Paint) or fixture render complete.
NUMERATOR:   page renders completing below 200ms (LCP or equivalent)
DENOMINATOR: all page render events tracked via RUM (Real User Monitoring)
WINDOW:      30-day rolling
ERROR BUDGET: 0.1%
ALERTS:
  p95 > 500ms sustained for > 10 minutes → page Frontend primary
  p95 > 1s → SEV-3 (significant UX degradation)
```

### SLO-8 — api request p95 < 500ms

```
SLI:         p95 latency of all API GET (read) requests, measured
             server-side, per domain family.
NUMERATOR:   GET requests completing in < 500ms
DENOMINATOR: all GET requests (excluding maintenance windows)
WINDOW:      30-day rolling
ERROR BUDGET: 0.1%
ALERTS: Per-domain fast burn → page domain primary
NOTE:   GET requests covering regulated audit history queries (evidence
        export) have a separate relaxed target (< 5s p95) and are
        tracked under SLO-15.
```

### SLO-9 — api error rate < 0.1%

```
SLI:         Percentage of all API requests (GET + POST + PATCH) that
             return a 5xx server error, measured across all domains.
NUMERATOR:   5xx responses
DENOMINATOR: all responses (4xx are client errors; not counted as SLO
             violations — 422 guard rejections are correct behavior)
WINDOW:      30-day rolling
ERROR BUDGET: 0.1%
ALERTS:
  5xx rate > 0.5% for > 1 minute → page SRE primary
  Domain-specific 5xx spike → page domain primary
```

### SLO-10 — audit chain anchor lag < 25h

```
SLI:         Time since last successful daily OTG audit chain anchor
             publication (hours). The anchor must be published within
             25 hours of the previous anchor to maintain cryptographic
             continuity.
NUMERATOR:   hours since last anchor (must be < 25)
DENOMINATOR: any lag > 25h triggers SLO breach
EXCLUSIONS:  none — no exclusions for audit chain continuity
WINDOW:      7-day rolling
ERROR BUDGET: 0 events
ALERTS:
  Anchor lag > 24h → immediate page Platform primary
  Anchor lag > 25h → SEV-1; regulatory notification may apply
BREACH BEHAVIOR: SEV-1. Investigate anchor service. If anchor service
                 is down, restore and publish missed anchor with
                 RFC 3161 external timestamp as compensating evidence.
                 Document in regulatory notification if tenant is
                 Enterprise or Sovereign with SLA requirement.
```

### SLO-11, SLO-12 — Log and trace ingest lag < 60s

```
SLO-11 (logs) and SLO-12 (traces) share the same structure:
SLI:     Time from event emission to event queryable in log/trace store
TARGET:  99.9% of events ingested within 60s
WINDOW:  30-day rolling
ALERTS:  Ingest lag > 120s → page SRE; > 300s → SEV-3
IMPACT:  Ingest lag beyond 60s delays incident response (on-call cannot
         see recent traces when investigating). Does not affect data
         integrity; eventual consistency for observability is acceptable.
```

### SLO-13 — CDC consumer lag < 60s

```
SLI:     Time from Authority Ledger write to CDC event consumed by all
         registered downstream consumers (read model updates, analytics,
         integration connectors).
TARGET:  99.9% of CDC events consumed by all consumers within 60s
WINDOW:  30-day rolling
ERROR BUDGET: 0.1%
ALERTS:  Any consumer lag > 120s → page Integration team
         Connector consumer lag > 300s → page Integration + notify
         affected connector's CSM
REGULATED NOTE: CDC events driving integration with DSCSA trading partners
                (J1 Pharma) or EUDAMED (J4 MD) have downstream reporting
                implications; sustained CDC lag may cause missed reporting
                windows.
```

### SLO-14 — AI inference p95 < 200ms (Tier-1) / < 2s (Tier-2)

```
SLI:     p95 latency of AI advisory inference requests, stratified by
         feature tier:
         Tier-1 features: lightweight advisory (classification, risk score)
         Tier-2 features: complex advisory (PSUR draft assist, APR synthesis)
TARGET:  Tier-1: p95 < 200ms; Tier-2: p95 < 2,000ms; both at 99.5%
WINDOW:  30-day rolling
ERROR BUDGET: 0.5% (generous; AI inference is best-effort advisory;
             failures degrade to "advisory unavailable" not to system failure)
ALERTS:  T1 p95 > 500ms → page AI team; T2 p95 > 5s → page AI team
         Provider outage → degrade to advisory_unavailable mode per L2
BREACH BEHAVIOR: AI advisory features degrade gracefully; workflow continues
                 without advisory; human acts without AI suggestion.
                 Degradation state is logged per L3 governance ledger.
```

### SLO-15 — audit pack export p95 < 24h

```
SLI:     p95 time from audit pack export request submission to pack
         delivery (download available or email notification sent).
NUMERATOR: export requests fulfilled within 24h
DENOMINATOR: all export requests
EXCLUSIONS: customer-initiated pauses; customer-side delay in providing
            requested parameters; tenant storage quota exceeded
WINDOW:  90-day rolling
ERROR BUDGET: 1% → 21.6 hours per 90-day window
ALERTS:  Export still pending at 18h → page Compliance team
         Export missing at 24h → SEV-3; customer notification
CUSTOMER IMPACT: Audit pack delay affects regulatory inspection readiness.
                 Enterprise SLA (per K1 §3): audit pack within 4h.
                 Internal SLO (24h) is more relaxed to allow error
                 budget; Enterprise tenants have a contract with the 4h
                 commitment directly in their DPA addendum.
```

### SLO-16 — backup success rate

```
SLI:     Percentage of scheduled backup jobs that complete successfully
         (all tenant data backed up to at least one cross-region replica).
TARGET:  100% per 30-day window (zero missed backups)
NUMERATOR: successful backups
DENOMINATOR: scheduled backups
EXCLUSIONS: none — backup is a regulated continuity requirement
WINDOW:  30-day rolling
ERROR BUDGET: 0 events
ALERTS:  Any backup failure → immediate page SRE; investigate and retry
         within 4h; if retry fails → SEV-2
REGULATED NOTE: A missed backup for a GxP-regulated tenant is a
                validation gap (GAMP 5 Category 4/5 requires backup
                verification as part of operational qualification).
```

### SLO-17 — DR drill quarterly cadence

```
SLI:     Whether a full DR drill (backup restoration test) was completed
         within the past 90 days.
TARGET:  100% per 90-day window
WINDOW:  90-day rolling
ERROR BUDGET: 0 events
ALERTS:  90 days since last drill → page SRE + notify CTO
         2 consecutive missed drills → SEV-2 + STOP-5 (program halt
         for DR readiness) per I4
BREACH BEHAVIOR: H8 systemic CAPA opened; next drill scheduled
                 within 2 weeks; results documented for compliance
                 evidence (EC-12 audit record).
```

### SLO-18 — per-tenant cost within tier envelope

```
SLI:     Percentage of tenants whose monthly infrastructure cost stays
         within the tier-defined cost envelope (per I6 cost governance).
TARGET:  99% of tenants within envelope per 30-day window
WINDOW:  30-day rolling
ERROR BUDGET: 1%
ALERTS:  Tenant cost > 110% of envelope → FinOps alert
         Tenant cost > 130% of envelope → page FinOps + platform team;
         review whether tenant should be upgraded to higher tier
COMMERCIAL IMPACT: Cost overrun per tenant erodes gross margin (per K4 §9.4).
                   Sustained cost overrun in a tier class requires pricing
                   model review (K1 §7 usage-based component adjustment).
```

### SLO-19 — vulnerability patch within severity window

```
SLI:     Per CVE: whether the CVE was patched within the severity window:
         Critical: 7 days; High: 30 days; Medium: 90 days; Low: quarterly
NUMERATOR: CVEs patched within severity window
DENOMINATOR: all applicable CVEs discovered in window
EXCLUSIONS: CVEs formally risk-accepted with Compliance Lead + CTO sign-off
            and a documented compensating control (these are accepted, not
            breached; they do not count against the SLO denominator)
WINDOW:  90-day rolling
ERROR BUDGET: 0 events (100% target; no unmitigated unaccepted CVEs beyond window)
ALERTS:  Per-CVE: severity-dependent deadline alert (7d before window close)
         KEV (Known Exploited Vulnerability): treat as Critical regardless
         of CVSS score → 7-day patch window regardless of CVE severity
BREACH BEHAVIOR: H7 emergency change path; SEV per severity; H8 CAPA;
                 per I7 §6 supply-chain KEV response procedure
```

### SLO-20 — validation evidence freshness

```
SLI:     Whether any regulated capability in the HESEM platform has
         stale validation evidence (expired per H2 §13 freshness floor).
         A capability is stale if its last successful validation test
         was executed more than the configured freshness period ago.
NUMERATOR: 0 stale capabilities
DENOMINATOR: any stale capability triggers an SLO breach
EXCLUSIONS: capabilities formally marked deprecated (no evidence required)
WINDOW:  Always (continuous monitoring; no rolling window)
ERROR BUDGET: 0 events (100% target)
ALERTS:  Any capability within 14 days of freshness floor expiry
         → ticket Validation Lead (CS-B)
         Any capability at freshness floor expiry → page Quality team;
         SEV-2 per H8 (validated state at risk)
BREACH BEHAVIOR: Capability degrades from VALIDATED to PROTOTYPE maturity.
                 Regulated mutations using that capability are blocked (per
                 M4 §15 maturity model). CS-B schedules re-validation.
                 H8 CAPA opened for systematic freshness gap.
```

### SLO-21 — edge gateway uptime per site

```
SLI:     Availability of edge gateway data collection for each
         production site (customer shopfloor), measured as the
         percentage of 5-minute intervals where the gateway is
         reachable from the HESEM platform.
TARGET:  99.9% per gateway per 30-day window
WINDOW:  30-day rolling per site
ERROR BUDGET: 0.1% → 43.2 minutes per site per 30 days
ALERTS:  Gateway offline > 5 minutes → page Edge team + notify site CSM
         Gateway offline > 30 minutes → SEV-3 (production data gap)
CUSTOMER IMPACT: Gateway downtime creates a gap in EBR / operation log
                 data for regulated tenants. Gaps > 1 hour may require
                 manual data entry with supervisor countersignature
                 (creates EC-2 override records; audit trail preserved
                 but operator burden increased).
```

### SLO-22 — customer onboarding within tier SLA

```
SLI:     Percentage of new tenant onboarding projects completed within
         the SLA defined per tier (per I8 §2 and K1):
         Core: 30 days; Pro: 14 days guided; Enterprise: per project plan
NUMERATOR: tenants onboarded within tier SLA
DENOMINATOR: all tenants onboarded in 90-day window
EXCLUSIONS: customer-side delays (signed change order required);
            scope changes requested by customer post-kickoff
WINDOW:  90-day rolling
ERROR BUDGET: 10% → up to 10% of onboardings may exceed SLA
ALERTS:  Per-tenant: onboarding > 80% of SLA time elapsed with
         > 20% of tasks incomplete → CSM alert
         Cohort: > 20% miss rate in 90-day window → H8 systemic CAPA
         on implementation process
CUSTOMER IMPACT: Onboarding delay delays customer time-to-value and
                 NRR contribution. Enterprise delayed onboarding affects
                 the quarterly ARR plan (per K4 §5).
```

---

## 3. Customer-facing SLA mapping per K1 tier

Internal SLOs are stricter than customer SLAs to provide headroom:

```
CUSTOMER SLA           INTERNAL SLO BASIS          HEADROOM
Core tier
  99.5% availability    SLO-1,3,4 composite         40 minutes/month
  p95 < 1s API          SLO-8 (p95 < 500ms)         2× headroom
  Audit pack 7 days     SLO-15 (24h internal)       6 days headroom

Pro tier
  99.9% availability    SLO-1..4 composite           4 minutes/month
  p95 < 500ms API       SLO-8 (p95 < 500ms)         Same; no headroom
  Audit pack 24h        SLO-15 (24h internal)        Same; no slack
  DR RPO 4h / RTO 24h   SLO-16 + SLO-17              Conservative RTO

Enterprise tier
  99.95% availability   SLO-1,2,4 at 99.95%         Directly mapped
  p95 < 200ms API       SLO-4 (100ms internal)       2× headroom
  Audit pack 4h         SLO-15 (24h internal)        STRICTER than SLO
    → MUST TRACK       Must track separately as       (Enterprise audit
      separately        contractual commitment         addendum SLO: 4h)
  DR RPO 1h / RTO 4h    SLO-16 + SLO-17 + I4        4h RTO is tight;
                                                      requires DR drill
                                                      to be verified

Sovereign tier
  Per-agreement          All SLOs negotiated          Contractual SLA
                         per contract; typically       may be stricter
                         Enterprise+ for all          than internal SLO
                         performance SLOs             for specific SLOs;
                         + additional region          requires per-tenant
                         isolation SLOs               SLO tracking
```

---

## 4. Error budget policy

### 4.1 Budget consumption thresholds

```
LEVEL           CONSUMPTION          OPERATIONAL RESPONSE
Green           ≤ 50% consumed       Normal operations; all deploys allowed;
                in window            feature ramps allowed; no restrictions

Yellow          50-90% consumed      Slow burn alert triggered; deploy cadence
                                     reviewed; new feature ramps held at
                                     current rollout percentage; post-incident
                                     reviews scheduled; investigation prioritized

Red             > 90% consumed       Deploy freeze for the owning team's services
                                     (non-critical changes only); engineering
                                     on-call dedicated to SLO recovery; scope
                                     of acceptable changes restricted to
                                     reliability improvements (H7 advisory);
                                     CAPA opened (H8) for systemic SLO health

Exhausted       > 100% consumed      SEV declared (per severity of SLO type);
                                     customer/regulator notification per SLA;
                                     H7 emergency change paths only; H8
                                     systemic CAPA; executive escalation
```

### 4.2 Budget reset policy

Error budget resets at the end of the rolling window. A 30-day window
resets daily (the oldest day's events drop out as new days are added).
This means a recovery from a bad week does not require waiting 30 days —
the budget improves as the bad events age out. However, regulatory SLOs
(SLO-6, SLO-10, SLO-16, SLO-20) have additional post-incident requirements
regardless of budget recovery: H8 CAPA must be completed and controls
verified before the SLO is considered fully remediated.

### 4.3 Budget calculation examples

```
SLO-3 (workflow.commit p95 < 500ms; target 99.9%; 30-day window):
  Total minutes in 30 days: 43,200
  Error budget = 0.1% × 43,200 = 43.2 minutes
  One 1-hour incident consumes 139% of monthly budget → red/exhausted
  One 5-minute incident consumes 11.6% → green (note: still worth
  investigating; 9 such incidents = 100% consumed)

SLO-6 (OTG integrity; target 100%; 7-day window):
  Error budget = 0 events
  Any single axiom violation = 100% consumed = immediate SEV-1
  No recovery except investigation + remediation + regulator notification
```

---

## 5. SLO governance

```
TRIGGER                      CLASS         PROCESS
Add a new SLO                H7 Class B+   New SLO requires: baseline
                                            data collection for 30 days
                                            before target set; customer-
                                            facing SLA implication assessed;
                                            M5 updated; alert rules deployed;
                                            ownership matrix updated

Retire an SLO                H7 Class A    Regulatory + customer review;
                                            customer SLA revision if mapped;
                                            Legal sign-off; M5 archived entry

Tighten a target             H7 Class B+   Capacity verified per I5;
                                            tenant SLA communication if
                                            relevant; 30-day baseline
                                            confirms new target achievable

Loosen a target              H7 Class A    Regulated implication assessed;
                                            Legal + Compliance review;
                                            customer SLA revision required
                                            if customer SLA is derived

SLO-free new route           Block merge   New route cannot deploy without
                                            SLO declared in M5; CI gate
                                            enforces (per I2 §8)

Per-tenant SLO override      K1 contract   Sovereign + Enterprise can have
                                            per-tenant SLA commitments that
                                            override M5 internal SLOs;
                                            tracked in tenant ops platform
                                            separately from company-wide SLOs

SLO review cadence:
  Annual:   full M5 review; all targets re-validated against capacity
  Quarterly: SLO health dashboard reviewed by SRE Lead + CTO
  Per-release: SLO impact of new features assessed in H7 change review
  Post-incident: affected SLO reviewed; tighten or add alert if needed
```

---

## 6. SLO ownership matrix

```
SLO    PRIMARY OWNER          ALTERNATE ON-CALL       ESCALATION
SLO-1  Identity team          SRE Tier-1              Platform Lead
SLO-2  Authority team         SRE Tier-1              CTO
SLO-3  Workflow team          SRE Tier-1              Platform Lead
SLO-4  Per-domain team lead   SRE Tier-1              VP Engineering
SLO-5  Projection team        SRE Tier-1              Platform Lead
SLO-6  Platform team          SRE Tier-1 + Compliance Security Lead
SLO-7  Frontend team          SRE Tier-2              VP Engineering
SLO-8  Per-domain team lead   SRE Tier-2              Platform Lead
SLO-9  Per-domain team lead   SRE Tier-2              VP Engineering
SLO-10 Platform team          SRE Tier-1              CTO + Compliance Lead
SLO-11 SRE team               SRE Tier-1              Platform Lead
SLO-12 SRE team               SRE Tier-1              Platform Lead
SLO-13 Integration team       SRE Tier-1              Platform Lead
SLO-14 AI team                SRE Tier-2              AI Lead
SLO-15 Compliance team        Quality Lead            Validation Lead
SLO-16 SRE team               Platform team           CTO
SLO-17 SRE team               Platform team           CTO
SLO-18 FinOps Lead            SRE team                CFO
SLO-19 Security Lead          SRE Tier-1 (for KEV)   CTO + Compliance
SLO-20 Quality team           Validation Lead (CS-B)  Compliance Lead
SLO-21 Edge team              SRE Tier-1              Platform Lead
SLO-22 CSM Lead               Implementation Lead     VP Customer Success
```

---

## 7. SLO QBR reporting format

SLO performance is presented to Enterprise customers at quarterly QBRs
(per I8 §5 and K5 §8.3). The format is:

```
SECTION 1: Availability summary
  Uptime % for the quarter (derived from SLO-1, SLO-3, SLO-4 composite)
  vs. contracted SLA
  Any incidents and resolution times

SECTION 2: Performance highlights
  API p95 latency trend (SLO-8 monthly averages for quarter)
  AI advisory response time (SLO-14)
  Any audit pack export latency events (SLO-15)

SECTION 3: Integrity and compliance
  OTG integrity events: 0 (expected; any > 0 requires full disclosure)
  Audit chain anchor: 100% (or: event date + resolution)
  Validation evidence freshness: current status (GREEN/AMBER/RED)
  Vulnerability patch status: current as of QBR date

SECTION 4: Edge gateway performance (for MES tenants)
  Per-site uptime (SLO-21) for the quarter
  Data gap events (if any)

SECTION 5: Cost performance (optional, per contract)
  Tenant cost vs. tier envelope (SLO-18) for the quarter
```

---

## 8. Per-pack SLO extensions

Regulated vertical packs impose stricter targets on SLOs that directly govern regulated workflows. These extensions apply when a tenant activates the specified pack. Pack SLO overrides are recorded in the tenant ops platform and reflected in the tenant-specific SLA addendum.

```
PACK  SLO     BASE TARGET  PACK TARGET  RATIONALE
J1    SLO-3   99.9%        99.95%       Pharma batch release saga must not
              p95 <500ms   p95 <300ms   stall; FDA 21 CFR Part 11 audit
                                        trail requires timely commit evidence
J1    SLO-6   100%         100%         No change; zero-tolerance is already
                                        the strictest possible for OTG integrity
J1    SLO-10  100%         100% + alert Audit chain anchor lag: add secondary
              lag<25h      lag<12h      alert at 12h for J1 tenants (GMP
                                        continuous process records must be
                                        anchored within one shift)
J1    SLO-15  99%          99.5%        Audit pack export SLA is 4h not 24h
              p95<24h      p95<4h       for J1 regulatory submission windows
J1    SLO-20  100%         100% + CVLP  Validation evidence freshness must
                           attach       also produce CVLP artifact within 24h
                                        of any SM transition in Tier 3 roots

J2    SLO-4   99.95%       99.99%       Automotive shop floor (IATF 16949);
              p95<100ms    p95<50ms     production part approval write latency
                                        directly impacts line throughput
J2    SLO-3   99.9%        99.95%       Assembly work order commit must meet
              p95<500ms    p95<200ms    cycle time requirements for JIT lines
J2    SLO-21  99.9%        99.95%       Edge gateway uptime for shop-floor
                                        MES: any downtime stops the line

J3    SLO-3   99.9%        99.99%       Aerospace AS9100 / NADCAP; flight-
              p95<500ms    p95<200ms    critical record commits must not fail;
                                        any workflow.commit failure for J3
                                        roots triggers immediate SEV-1
J3    SLO-15  99%          99.9%        Audit pack export: NADCAP surveillance
              p95<24h      p95<2h       audits require evidence within 2h
J3    SLO-20  100%         100% +       DO-178C evidence chain: each software
                           DO178C sig   root mutation must carry software
                                        level attribute in evidence payload

J4    SLO-3   99.9%        99.95%       Medical device ISO 13485 + 21 CFR 820;
              p95<500ms    p95<300ms    DHR write commits are design history
                                        record entries; must be durable
J4    SLO-6   100%         100% +       OTG integrity plus FSCA linkage check:
                           FSCA gate    any OTG breach on a J4 root triggers
                                        automatic FSCA risk assessment initiation
J4    SLO-15  99%          99.5%        CAPA close-out and post-market
              p95<24h      p95<8h       surveillance packs required within 8h
                                        of regulatory authority request

J5    SLO-4   99.95%       99.99%       Food/Bev FSSC 22000 + FDA FSMA 204;
              p95<100ms    p95<50ms     traceability root writes must be
                                        near-instant (recall response within 4h)
J5    SLO-5   99.5%        99.9%        Projection freshness for lot traceability
              lag<5s       lag<2s       read models must converge faster;
                                        recall dashboards must reflect current
                                        lot state within 2 seconds
J5    SLO-15  99%          99.5%        Mock recall export must complete
              p95<24h      p95<1h       within 1h for FSMA traceback readiness
```

Pack SLO activation: when a tenant enables a vertical pack, the platform's SLO tracking service loads the pack-specific override profile and re-computes alert thresholds accordingly. The tenant SLA addendum is auto-generated from the active override profile. Overrides are additive — J1+J4 tenants get the stricter of the two targets for shared SLOs.

---

## 9. SLO incident response playbooks

Three SLOs carry zero-tolerance targets (SLO-6, SLO-10, SLO-20) and two carry near-zero budgets (SLO-2, SLO-16). Each requires a pre-defined response playbook because these SLOs directly underpin regulatory compliance; ad-hoc incident management is insufficient.

### SLO-6 OTG integrity — Incident Playbook

```
TRIGGER: Any axiom violation detected in OTG audit chain (forbidden hash
         mismatch, sequence gap, or missing Merkle anchor)
SEVERITY: SEV-1 immediate (automatic; no human gate required)

STEP 1 (T+0 to T+5 min):
  - Platform oncall paged (PagerDuty SEV-1 escalation)
  - OTG integrity monitor emits PLATFORM.OTG.INTEGRITY_BREACH event
  - All write operations to affected domain(s) are halted by circuit breaker
    (prevent further corruption of the chain)
  - Compliance Lead paged (parallel to engineering)

STEP 2 (T+5 to T+20 min):
  - Engineering identifies the affected chain segment (root ID, time range,
    first corrupted anchor index)
  - Determine whether corruption is: (a) software bug, (b) infrastructure
    failure, (c) unauthorized mutation attempt, or (d) clock skew causing
    anchor ordering failure

STEP 3 (T+20 to T+60 min):
  - If (a) or (b): Deploy hotfix via H7 expedited path; re-anchor affected
    segment; emit PLATFORM.OTG.INTEGRITY_RESTORED with investigation summary
  - If (c): Treat as security incident per I3 §7; preserve forensic state
    before remediation; notify CTO and Legal; do not resume writes until
    root cause is confirmed
  - If (d): Time synchronization remediation; NTP enforcement; verify all
    anchor services are synchronized before resuming

STEP 4 (T+60 min to closure):
  - Written root cause report completed within 24h
  - Affected customer tenants notified per SLO-6 breach notification policy
    regardless of resolution (full transparency required for regulated tenants)
  - M9 compliance log updated with event reference
  - Post-incident review mandatory within 5 business days

FORBIDDEN ACTIONS during SLO-6 incident:
  - Do NOT retroactively modify audit chain records (BD-1 violation)
  - Do NOT backdate any timestamps
  - Do NOT resume writes before integrity is mathematically verified
  - Do NOT mark resolved before Compliance Lead sign-off
```

### SLO-10 Audit Chain Anchor — Incident Playbook

```
TRIGGER: Anchor lag exceeds 25h (100% window) OR secondary alert at 12h
         for J1 tenants
SEVERITY: 25h breach = SEV-1; 12h J1 alert = SEV-2 (escalates to SEV-1
          if not resolved within 2h)

STEP 1: Identify which anchor service instance is failing or lagging
STEP 2: Check Merkle anchor service health; check queue depth for pending
        anchor requests; check key management service for signing failures
STEP 3: If queue backed up: scale anchor service horizontally (ephemeral
        capacity); process backlog in chronological order
STEP 4: If signing failure: rotate signing key via I6 key rotation procedure;
        re-sign pending anchors
STEP 5: Verify all tenant OTG chains resume normal anchor cadence
STEP 6: For J1 tenants: issue proactive notification explaining gap and
        confirmation that GMP records remained continuously recorded (only
        the cryptographic anchoring was delayed, not the records themselves)

NOTE: Unanchored records are still valid GMP records; the anchor is an
      additional cryptographic attestation. However, FDA / EMA auditors
      expect anchors to be current; a gap > 24h may trigger a Finding.
```

### SLO-2 Policy Directive — Incident Playbook

```
TRIGGER: Any policy directive 5xx sustained > 1 minute (SLO-2 auto-SEV-1)

STEP 1 (T+0): Auth oncall + SRE Tier-1 paged simultaneously
STEP 2 (T+2): Check OPA (Open Policy Agent) cluster health; check policy
              bundle distribution (are new policy bundles being served?)
STEP 3 (T+5): If OPA cluster down: failover to secondary OPA cluster;
              if no failover available, activate deny-safe mode (all
              requests fail-closed with 503 + retry guidance)
STEP 4 (T+10): If policy bundle corruption: roll back to previous bundle
               version; policy bundle rollback is non-destructive (policies
               are immutable versioned artifacts)
STEP 5: Customer notification for Enterprise + Sovereign tenants if impact
        duration > 5 minutes (per SLA addendum)
STEP 6: Root cause: OPA config, bundle pipeline, or network partition?
        Each has a specific remediation runbook linked in oncall wiki.

FAIL-SAFE: Policy unavailability MUST fail-closed (deny), not fail-open
           (allow). Any code path that fails open during policy service
           outage is a critical security bug and must be filed as P0.
```

---

## 10. Multi-window burn rate alerting strategy

HESEM uses the Google SRE Workbook multi-window, multi-burn-rate alerting model. For each SLO, two alert windows are defined: a fast-burn window (catches rapid budget consumption quickly) and a slow-burn window (catches gradual degradation before budget is fully consumed). Both windows must be simultaneously above threshold to page.

```
SLO   ERROR BUDGET  FAST-BURN RULE                    SLOW-BURN RULE
      (30d window)  (5min+1h both ≥ threshold)        (1h+6h both ≥ threshold)

SLO-1 43.2 min      Burn rate ≥ 14.4×                 Burn rate ≥ 6×
                    = consuming budget at 14.4×normal  = consuming 6×normal
                    5m window: 6 seconds budget lost   1h window: 6 min lost
                    Page: Identity primary oncall       Ticket: Identity team

SLO-2 21.6 min      Any 5xx > 1 min = immediate page  N/A — any failure pages
                    (budget too small for windowed      immediately per playbook §9
                    alerting; zero-tolerance response)

SLO-3 43.2 min      Burn rate ≥ 14.4× (5m+1h)        Burn rate ≥ 6× (1h+6h)
                    Page: Workflow primary oncall       Ticket: Workflow team

SLO-4 21.6 min      Burn rate ≥ 14.4× (5m+1h)        Burn rate ≥ 6× (1h+6h)
                    Page: Domain team primary           Ticket: Domain team

SLO-5 216 min       Lag > 30s for > 5 minutes         Lag > 15s for > 30 minutes
                    Page: Projection team               Ticket: Projection team
                    (symptom-based alerting;            (trend-based)
                    burn-rate less useful for lag SLO)

SLO-6 ZERO          Any violation = immediate SEV-1   N/A
      TOLERANCE     (budget-based alerting not
                    applicable to zero-tolerance SLOs)

SLO-7 43.2 min      Burn rate ≥ 14.4× (5m+1h)        Burn rate ≥ 6× (1h+6h)
                    Page: Frontend team oncall          Ticket: Frontend team

SLO-8 43.2 min      Burn rate ≥ 14.4× (5m+1h)        Burn rate ≥ 6× (1h+6h)
                    Page: Domain team primary           Ticket: Domain team

SLO-9 43.2 min      Burn rate ≥ 14.4×                 Burn rate ≥ 6×
                    Page: Domain team + SRE Tier-1      Ticket: Domain team

SLO-10 ZERO         Anchor lag > 12h (J1) → SEV-2    Anchor lag > 6h → ticket
       TOLERANCE     Anchor lag > 25h → SEV-1          (trend monitoring)
                    (time-threshold; not burn-rate)

SLO-11 43.2 min     Log lag > 120s for > 5 min       Log lag > 90s for > 15 min
                    Page: SRE Tier-1                   Ticket: SRE team

SLO-12 43.2 min     Trace lag > 120s for > 5 min     Trace lag > 90s for > 15 min
                    Page: SRE Tier-1                   Ticket: SRE team

SLO-13 43.2 min     CDC lag > 120s for > 5 min       CDC lag > 90s for > 15 min
                    Page: Integration team              Ticket: Integration team

SLO-14 216 min      Burn rate ≥ 14.4× (5m+1h)        Burn rate ≥ 6× (1h+6h)
                    Page: AI team oncall               Ticket: AI team

SLO-15 (90d win)    Export job stuck > 4h → page      Export job > 2h → ticket
                    Compliance team + SRE              (trend; compliance cadence)

SLO-16 ZERO         Any failed backup job = immediate N/A — failure = immediate page
       TOLERANCE     page SRE + Platform

SLO-17 (90d win)    Drill not completed within        Drill approaching deadline:
                    scheduled quarter = SEV-2          alert at 30 days before end
                    page SRE + CTO                     of quarter

SLO-18 (30d win)    Tenant cost > 110% envelope for  Tenant cost > 105% for > 7d
                    > 3 days → page FinOps            → ticket FinOps team

SLO-19 (90d win)    KEV patch overdue by > 1 day     Critical/High patch overdue
                    → page Security Lead              → ticket Security team

SLO-20 ZERO         Any evidence staleness = page     N/A (zero tolerance)
       TOLERANCE     Quality team + CS-B immediately

SLO-21 43.2 min     Site down > 1 min → page          Site degraded for > 10 min
                    Edge team + SRE Tier-1             → ticket Edge team

SLO-22 (90d win)    Onboarding cohort on-time rate    Cohort at-risk: single tenant
                    < 85% for quarter → ticket         > 120% of SLA timeline
                    CSM Lead                           → ticket CSM owner
```

Alert routing is implemented in the observability platform (per I3 §4). All alerts are routed through PagerDuty with per-SLO escalation policies. Alert code review is part of the H7 change review for any SLO-affecting change.

---

## 11. SLO tenant notification policy

When an SLO breach affects tenants, the notification obligation varies by tier. HESEM is committed to proactive, transparent communication — particularly for regulated tenants where SLO breaches may have compliance implications.

```
TIER       NOTIFICATION TRIGGER        CHANNEL          SLA
Core       Incident resolved           Status page       Within 24h post-resolution
           + post-mortem available     Email digest      Within 5 business days

Pro        Ongoing incident > 30 min   Email + in-app    Within 30 min of declaration
           SLO breach (any)            banner            Within 4h of breach detection
           Post-mortem                 Email             Within 3 business days

Enterprise Ongoing incident > 5 min    Email + phone     Within 15 min
           SLO breach (any)            CSM direct line   Within 1h of detection
           SLO-6/10/20 breach          CSM + TAM call    Within 30 min (immediate)
           Post-mortem                 QBR agenda item   Within 2 business days

Sovereign  Ongoing incident > 2 min    Dedicated channel Within 5 min
           Any SLO breach              TAM immediate     Within 15 min
           SLO-6/10/20 breach          Emergency call    Immediate (paged)
           Post-mortem + RCA           Delivered report  Within 1 business day
           Regulatory implication      Legal + Compliance Same-day consultation
```

**Notification content requirements** for regulated tenants (J1-J5 packs active):

1. Incident timeline with UTC timestamps (not local time)
2. Which authoritative roots (if any) were affected by write halts or delays
3. Explicit statement of whether GMP/QMS records were lost, delayed, or unaffected
4. For SLO-6 breaches: cryptographic evidence that records are complete despite anchor gap
5. Corrective action taken and prevention measures planned
6. Reference to applicable regulatory guidance (FDA 21 CFR Part 11, EU Annex 11, ISO 13485, etc.) and HESEM's position on compliance impact
7. Compliance Lead signature on all notifications to J1/J3/J4 regulated tenants

Notification templates are maintained in the tenant ops platform and reviewed annually by the Compliance team. For Sovereign tenants, notification wording is pre-approved with the tenant's regulatory affairs team during onboarding.

---

## 12. SLO implementation dependency map

Each SLO depends on specific infrastructure components. This map is used during capacity planning (I5), disaster recovery design (I7), and change impact assessment (H7).

```
SLO    CRITICAL DEPENDENCIES                        SINGLE POINTS OF FAILURE MITIGATED BY
SLO-1  Identity service, Token store (Redis),        Multi-region Identity replicas;
       mTLS mesh, OPA (policy), key vault            Key vault HA; Redis Sentinel

SLO-2  OPA cluster, Policy bundle pipeline,          OPA secondary cluster (different AZ);
       Bundle storage (object store)                 Bundle storage multi-region replication

SLO-3  Workflow saga coordinator, Authority          Saga coordinator clustered;
       Ledger writer, PostgreSQL primary,            PostgreSQL HA with streaming replica;
       OTG anchor service                            OTG anchor: active-active pair

SLO-4  PostgreSQL primary per domain schema,         Per-domain schema on dedicated tablespace;
       DB connection pool, schema locks              PgBouncer; auto-vacuum tuned

SLO-5  Debezium CDC connector, Kafka brokers,        Kafka 3× replication factor;
       Consumer group, Read model DB                 Debezium offset monitoring;
                                                     Consumer lag alert (SLO-13)

SLO-6  OTG hash verification service,               Hash service: active-active;
       Merkle anchor scheduler, HSM or              HSM: dual-HSM failover;
       software signing key                         Verification runs independently of write path

SLO-7  CDN edge, Frontend asset bundle,             CDN multi-PoP; asset bundle versioned;
       GraphicsAuthority token service              GA token service cached at edge

SLO-8  API gateway, Per-domain service,             API gateway: multi-region active-active;
       PostgreSQL, Redis cache                       Domain service: horizontally scalable

SLO-9  API gateway error handling,                  Circuit breakers per route;
       Domain service error budgets,                Retry limits enforced at gateway;
       DB deadlock handling                         Deadlock retry in application layer

SLO-10 OTG anchor scheduler, Merkle tree            Anchor scheduler: clustered cron;
       computation, External anchor endpoint        External anchor: Ethereum/IPFS redundant
       (blockchain or IPFS), Key signing service    endpoints; key rotation procedure (I6)

SLO-11 Log shipper (Fluentd/Vector),               Log shipper: DaemonSet per node;
       Kafka ingest, OpenSearch/Loki indexer        Kafka buffer; backpressure handling

SLO-12 Trace collector (OpenTelemetry),             OTel collector: clustered;
       Kafka ingest, Tempo/Jaeger storage           Sampling policy; storage tiered (hot/warm)

SLO-13 Debezium, Kafka, Per-consumer service        Kafka replication; consumer offset
                                                    checkpointing; lag alert (this SLO)

SLO-14 AI inference service, Model store,           Model store: replicated object store;
       GPU/CPU capacity, Feature cache              Inference autoscaling; T2 fallback for T1

SLO-15 Audit pack generator, Document store,        Generator: async job queue with retry;
       Export pipeline, Tenant isolation layer      Job queue: persistent (Redis Streams)

SLO-16 Backup agent per service, Object store       Backup agent: monitored heartbeat;
       (multi-region), Backup encryption keys       Object store: CRR enabled; key rotation

SLO-17 DR runbook execution capability,             Runbook: version-controlled; drill schedule
       Secondary region availability, DR team       in calendar system; practice drill log

SLO-18 Cost tagging (per tenant/root), FinOps       Tag enforcement in CI/CD;
       dashboard, Budget alert engine               FinOps dashboard: daily refresh

SLO-19 Vulnerability scanner (Trivy/Grype),         Scanner: automated on image push;
       SBOM pipeline, KEV feed integration,         KEV feed: daily sync; patch tracking
       Patch deployment pipeline                    board in security backlog

SLO-20 Validation evidence emitter (per SM),        Evidence emitter: synchronous in SM
       Evidence store (append-only), CVLP           transition path (cannot be skipped);
       generator                                    Evidence store: WORM-compatible storage

SLO-21 Edge gateway hardware/VM, VPN tunnel,        Edge: redundant uplink; local queue
       Local data broker, Reconnection logic        (SQLite) for offline continuity;
                                                    Reconnection: exponential backoff

SLO-22 Onboarding automation pipeline,             Pipeline: monitored; CSM escalation
       CSM assignment system, Tenant                at-risk trigger at 80% SLA consumed;
       provisioning service, Training scheduler     Training scheduler: automated invites
```

---

## 13. Decision phrase

```
M5_SLO_DIRECTORY_V10_LOCKED
NEXT: M6_RISK_REGISTER.md
```
