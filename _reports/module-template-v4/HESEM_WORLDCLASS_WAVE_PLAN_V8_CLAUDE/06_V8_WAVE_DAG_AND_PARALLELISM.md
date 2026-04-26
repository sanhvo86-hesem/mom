# 06 — V8 Wave DAG and Parallelism

```text
purpose:        Replace V7's linear W0-W12 list with a directed acyclic graph + explicit parallelism budget
predecessor:    V7 §24 (V7_WAVE0_TO_WAVE12_MASTER_EXECUTION_PLAN.md) — linear matrix only
v8_advance:     DAG nodes + edges + parallelism rules + dependency types + critical path analysis
work_package:   WP-V8-DAG (1 work package; informs program management)
owner:          Program Manager + Platform Lead
estimate:       1 engineering-week
```

---

## 1. The DAG

```text
                                    ┌──────────────┐
                                    │  W0  Phase2  │
                                    │ Integration  │
                                    └──────┬───────┘
                                           │ pre-flight
                                           ▼
                                    ┌──────────────┐
                                    │  W0.5 Spines │
                                    └──────┬───────┘
                            ┌──────────────┼──────────────┐
                            │              │              │
                            ▼              ▼              ▼
                     ┌──────────┐   ┌──────────┐   ┌──────────┐
                     │ W1 Slice │   │ CS-A Sec │   │ CS-B Val │
                     │ Factory  │   │ continuous│   │ continuous│
                     └────┬─────┘   └────┬─────┘   └────┬─────┘
                          ▼              │              │
                     ┌──────────┐         │              │
                     │ W2 Record│         │              │
                     │ Factory  │         │              │
                     └────┬─────┘         │              │
                          ▼              │              │
                     ┌──────────┐         │              │
                     │ W3 eQMS+ │         │              │
                     │ TRAIN+MWO│         │              │
                     └────┬─────┘         │              │
                          ▼              │              │
                     ┌──────────┐         │              │
                     │ W4 Live  │         │              │
                     │ Read API │         │              │
                     └────┬─────┘         │              │
                          ▼              │              │
                     ┌──────────┐         │              │
                     │ W4.5 OTG │         │              │
                     │ Cutover  │         │              │
                     └────┬─────┘         │              │
                ┌─────────┼─────────┐    │              │
                ▼         ▼         ▼    │              │
           ┌────────┐┌────────┐┌────────┐│              │
           │  W5 TX ││  W6 MES││  W6.5  ││              │
           │ ERP/MOM││  /OT   ││  AI    ││              │
           └────┬───┘└────┬───┘└────┬───┘│              │
                ▼         ▼         ▼    │              │
                └─────────┼─────────┘    │              │
                          ▼              │              │
                     ┌──────────┐         │              │
                     │ W7 Digital│        │              │
                     │  Thread  │         │              │
                     └────┬─────┘         │              │
                          ▼              │              │
                     ┌──────────┐         │              │
                     │ W8 Analytics+SRE  │              │
                     └────┬─────┘         │              │
                          ▼              │              │
                     ┌──────────┐         │              │
                     │ W9 Compl │◄────────┴──────────────┘ (CS-A + CS-B feed evidence here)
                     │ +Validn  │
                     └────┬─────┘
                          ▼
                     ┌──────────┐
                     │ W10 Vert │
                     │ Packs    │
                     └────┬─────┘
                          ▼
                     ┌──────────┐
                     │ W11 Pilot│
                     └────┬─────┘
                          ▼
                     ┌──────────┐
                     │ W12 RC   │
                     └────┬─────┘
                          ▼
                     ┌──────────┐
                     │ W13 Multi│
                     │ Region   │
                     └────┬─────┘
                          ▼
                     ┌──────────┐
                     │ W14 Cont │
                     │ Improve  │
                     └──────────┘
```

---

## 2. Edge types

```yaml
edge_types:
  hard_block:    successor cannot start until predecessor PASS
  soft_block:    successor can start partial work but cannot exit gate
  parallel:      successor and predecessor can run concurrently
  feed_evidence: continuous stream feeds wave-level evidence
  
edges:
  W0  → W0.5      hard_block
  W0.5 → W1       hard_block
  W0.5 → CS-A     parallel (CS-A starts at W0.5 + runs forever)
  W0.5 → CS-B     parallel (CS-B starts at W0.5 + runs forever)
  W1  → W2        hard_block
  W2  → W3        hard_block
  W3  → W4        hard_block
  W4  → W4.5      hard_block
  W4.5 → W5       hard_block
  W4.5 → W6       hard_block
  W4.5 → W6.5     soft_block (AI advisory rollout can begin parallel after W4.5)
  W5, W6 → W7     hard_block (W7 needs both transactional + MES)
  W6.5 → W7       parallel
  W7  → W8        hard_block
  W8  → W9        hard_block
  CS-A → W9       feed_evidence (security evidence)
  CS-B → W9       feed_evidence (validation evidence)
  W9  → W10       hard_block
  W10 → W11       hard_block
  W11 → W12       hard_block
  W12 → W13       hard_block
  W13 → W14       hard_block
```

---

## 3. Parallelism rules

```yaml
P-V8-PAR-1: continuous streams CS-A + CS-B run from W0.5 onwards;
            never blocked by wave gates (security and validation cannot be deferred)

P-V8-PAR-2: within a wave, sub-streams can parallelize across teams if dependency permits;
            e.g. W3 has CAPA-stream + CDOC-stream + TRAIN-stream + MWO-stream + INSP-stream
            in parallel (5 teams)

P-V8-PAR-3: per-slice graduations within a wave are independent;
            wave PASSes when ≥ threshold% of slices PASS (per file 01 §8 coverage thresholds)

P-V8-PAR-4: per-mutation graduations to L5 are independent ADRs;
            never bulk graduation (V3 RULE-8)

P-V8-PAR-5: cross-wave parallel work permitted only via soft_block edges;
            e.g. W6.5 AI advisory can begin once W4.5 OTG is cutover, even if W5+W6 ongoing
```

---

## 4. Critical path

The longest hard_block chain through the DAG:

```text
W0 → W0.5 → W1 → W2 → W3 → W4 → W4.5 → {W5, W6} → W7 → W8 → W9 → W10 → W11 → W12 → W13 → W14
```

Sum of estimated calendar weeks (per V5 file 19 + V7 §22 reconciled):

```text
W0      1-2 wk       cumulative: 1-2
W0.5    4-6 wk       cumulative: 5-8
W1      8-12 wk      cumulative: 13-20
W2      4-8 wk       cumulative: 17-28
W3      6-10 wk      cumulative: 23-38
W4      6-8 wk       cumulative: 29-46
W4.5    3-4 wk       cumulative: 32-50
max(W5, W6) 8-12 wk  cumulative: 40-62  (W5+W6 parallel; max controls)
W7      6-8 wk       cumulative: 46-70
W8      6-12 wk      cumulative: 52-82
W9      6-12 wk      cumulative: 58-94
W10     16-26 wk     cumulative: 74-120
W11     4-8 wk       cumulative: 78-128
W12     4-8 wk       cumulative: 82-136
W13     8-12 wk      cumulative: 90-148
W14     ongoing
```

Critical path total: **82-136 weeks** (~19-32 months).

This matches V5's estimate (~18-32 months solo / 12-18 team) and refines V7's narrative (V7 had no explicit critical-path analysis).

---

## 5. Resource leveling

```yaml
team_assignments_per_wave:
W0:           Platform 2, QA 1, Domain Lead 1 (= 4 FTE)
W0.5:         Platform 4, Security 1, SRE 1 (= 6 FTE)
W1:           Platform 3, Frontend 2, QA 1 (= 6 FTE)
W2:           Platform 2, Frontend 2, QA 1, Domain 2 (= 7 FTE)
W3:           Platform 1, Quality team 4, Workforce team 2, Maintenance team 2, QA 2 (= 11 FTE)
W4-W4.5:      Backend 5, API Lead 1, SRE 1, QA 2 (= 9 FTE)
W5+W6+W6.5:   parallel; Backend 4 + MES 4 + AI 3 + QA 2 + Platform 1 (= 14 FTE)
W7:           Backend 4, Data 2, Frontend 2, QA 1 (= 9 FTE)
W8:           SRE 4, Security 2, Data 2, QA 2 (= 10 FTE)
W9:           Compliance 4, Validation 3, Security 2, QA 2 (= 11 FTE)
W10:          Vertical teams: Pharma 5 + Auto 5 + Aero 4 (= 14 FTE)
W11:          CS team 4, Implementation 3, Support 2 (= 9 FTE)
W12:          SRE 3, Multi-tenancy 3, Connector 4 (= 10 FTE)
```

Continuous CS-A: 4 FTE Security ongoing.
Continuous CS-B: 3 FTE Validation ongoing.

---

## 6. Critical-path risks

```text
R-DAG-1: W0 Phase 2 integration repair fails → entire DAG stalls
         mitigation: dedicated stabilization team; clear repair budget; user-approved decision phrase
R-DAG-2: W0.5 spine substrate slips → all subsequent waves slip 1:1
         mitigation: parallelize spines (Identity + Workflow + Evidence + API + Data + Graphics) across multiple teams
R-DAG-3: W4 live-API graduation cliff → if <60% of slices graduate, W4.5 cannot start
         mitigation: per-slice graduation tracking; soft-block on W4.5 partial start
R-DAG-4: W6 MES/OT delays → W7 digital thread blocks
         mitigation: edge gateway prototype work begins in parallel under CS-A discipline
R-DAG-5: Vertical pack scope creep in W10 → W11/W12 slip
         mitigation: per-pack independent gates; ship one pack rather than all three
```

---

## 7. Decision phrase

```text
V8_WAVE_DAG_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-DAG-1
NEXT_FILE: 07_V8_CROSS_ROOT_DEPENDENCY_MODEL.md
```
