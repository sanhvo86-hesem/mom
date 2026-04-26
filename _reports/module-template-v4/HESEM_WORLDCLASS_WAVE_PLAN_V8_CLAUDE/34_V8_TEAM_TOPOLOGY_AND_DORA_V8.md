# 34 — V8 Team Topology and DORA

```text
purpose:        Carry forward V5 file 18 + add per-wave team-size phasing + ways-of-working
predecessor:    V5 file 18 (Team Topologies + DORA Elite)
v8_advance:     Per-wave team-size phasing matrix (matches file 06 DAG); on-call rotation
work_package:   WP-V8-TEAM (1 governance WP)
owner:          Program Manager + Engineering Lead
estimate:       1 week initial + ongoing
```

---

## 1. Team types (Skelton-Pais carry-forward)

```text
Stream-aligned   owns end-to-end value stream
Enabling         coaches stream teams
Complicated SS   deep expertise area (security, ML, audit chain)
Platform         builds the IDP consumed by stream teams
```

---

## 2. Per-wave team size + composition (per file 06 §5)

```text
W0:           4-5 FTE   (founders + AI augmentation)
W0.5:         5-6 FTE   (+1 platform engineer + 1 SRE)
W1:           5-7 FTE   (+1 frontend + 1 designer)
W2:           6-8 FTE   (+1 domain architect)
W3:           10-12 FTE (5-stream parallel: CAPA, CDOC, TRAIN, MWO, INSP)
W4-W4.5:      8-12 FTE  (backend + API + SRE + QA)
W5+W6+W6.5:   13-16 FTE (multi-stream: backend + MES + AI parallel)
W7:           8-10 FTE  (digital thread; contracts)
W8:           10-14 FTE (SRE + security + data platform + QA)
W9:           10-14 FTE (compliance + validation + security)
W10:          14-18 FTE (per-vertical streams)
W11:          8-12 FTE  (CS + implementation)
W12:          10-14 FTE (multi-tenancy + connectors)
W13:          12-16 FTE (multi-region)
W14:          ongoing 10-14 FTE
+
CS-A:         4 FTE Security ongoing from W0.5
CS-B:         3 FTE Validation ongoing from W0.5
```

Total cumulative FTE-years through W12: ~142 FTE-yr.

---

## 3. DORA Elite-tier targets (file 30 §4 carry-forward)

```yaml
deployment_frequency:    >= daily per team
lead_time_for_change:    < 1h P50; < 1d P95
change_failure_rate:     < 5%
mean_time_to_restore:    < 1h P50; < 4h P95

measurement_freshness:    daily
publication: weekly team scorecard, quarterly company review
```

---

## 4. Ways of working (V5 file 18 §7 carry-forward)

```yaml
sprints: 1-2 wk for stream teams; continuous flow for platform
ceremonies: daily standup, weekly demo, bi-weekly retrospective, monthly arch sync, quarterly OKR
documentation: docs as code; PR docs review required
code_review: 2 reviewers; 24h SLA; RFC for cross-team change
async_first: written before spoken; sync only when necessary
```

---

## 5. On-call rotation

```yaml
tiers:
  - SEV-0 / SEV-1: 24x7 on-call (engineering + SRE + security)
  - SEV-2 / SEV-3: business-hours
shifts: 1 week per primary, 1 week per secondary; 4-week pause
escalation: primary → secondary → manager → director → CTO → CEO
fair_compensation: per HR policy (regional)
runbooks: per alert; reviewed quarterly
```

---

## 6. Decision phrase

```text
V8_TEAM_TOPOLOGY_AND_DORA_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-TEAM-1
NEXT_FILE: 35_V8_RISK_REGISTER_V8.md
```
