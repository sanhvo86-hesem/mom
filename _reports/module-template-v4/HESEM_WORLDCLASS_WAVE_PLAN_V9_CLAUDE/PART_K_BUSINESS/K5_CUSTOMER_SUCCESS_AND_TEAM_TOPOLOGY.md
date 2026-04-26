# K5 — Customer Success and Team Topology

```
chapter_purpose: how the team is structured to deliver this plan;
                 customer success operating model
owner_role:      VP Engineering with VP Customer Success
```

---

## 1. Team Topologies framework (Skelton-Pais)

HESEM uses four team types:

```
Stream-aligned    owns a stream of business value end-to-end
Enabling          coaches stream teams in new capability
Complicated SS    deep expertise (security, ML, audit chain)
Platform          builds the IDP consumed by stream teams
```

Plus three interaction modes: Collaboration, X-as-a-Service, Facilitating.

---

## 2. Phased team scaling

```
Phase 0 (pre-W0; founders):     1-3 founders + AI augmentation
Phase 1 (W0-W3):                4-5 → 10-12 FTEs
Phase 2 (W4-W6):                14-20 FTEs
Phase 3 (W7-W8):                25-35 FTEs
Phase 4 (W9-W12):               50-80 FTEs
Phase 5 (W13+):                 80-120 FTEs
```

Plus continuous: 4 FTE Security (CS-A), 3 FTE Validation (CS-B).

---

## 3. DORA Elite-tier targets

```
Deployment frequency:    >= daily per team
Lead time for change:    < 1h P50; < 1d P95
Change failure rate:     < 5%
Mean time to restore:    < 1h P50; < 4h P95
```

Continuously measured. Reported weekly per team, quarterly company.

---

## 4. Customer Success operating model

```
Per-tenant CSM ratio:
  Core:         shared (1 CSM per ~50 tenants)
  Pro:          dedicated (1 CSM per ~10 tenants)
  Enterprise:   dedicated CSM + TAM (1 each per tenant)

QBR cadence:        quarterly per tenant
NPS / CSAT cadence: quarterly survey
Escalation path:    CSM → Implementation Lead → Engineering Lead → CTO
```

---

## 5. Ways of working

Async-first. Sync only when necessary. Documentation as code.
2-reviewer code review with 24h SLA. RFC for cross-team change.
Blameless postmortem for all SEV-0/1/2.

---

## 6. Decision phrase

```
K5_CUSTOMER_SUCCESS_AND_TEAM_TOPOLOGY_BASELINE_LOCKED
PART_K_COMPLETE
NEXT: PART_L_AI_DISCIPLINE/L0_PART_L_OVERVIEW.md
```
