# 39 — V8 Root Maturity Scorecard

```text
purpose:        Carry V7 §36 75-root scorecard + V8's 95 roots + executable promotion paths
predecessor:    V7 §36 + V7 data/root_backlog.json
v8_advance:     95 roots (V7 had 75), each with current/target/blocking-WP fields, refresh per slice promotion
artifact:       matrices/v8_root_maturity_scorecard.csv (live)
```

---

## 1. Heatmap rules (V7 §36 carry-forward + V8 binding)

```text
Heatmap interpretation: optimize for roots that unlock safe waves:
  V21 → spines → quality roots → live read APIs → command bus → MES/OT →
  digital thread → validation → vertical packs

Promotion only after evidence per L (file 01). No skipping.

V8 explicit: every cell has machine-checkable promotion + demotion rule
```

---

## 2. Sample rows (full table at `matrices/v8_root_maturity_scorecard.csv`)

```csv
root_code,baseline_maturity,target_maturity,target_wave,promotion_condition,demotion_trigger,owner_role,status
ITEM,1,5,W0.5,"L2: fixture + parse; L5: full mutation w/audit","schema drift; cross-tenant leak",Product Lead,planned
USER,4,7,W0.5,"L4 baseline; promote to L7 with multi-tenant productized","SOC 2 audit fail",Identity Lead,active
NQCASE,4,5,W3,"L4: live read-only ratified; L5: dispose mutation full chain","RULE-2 violation",Quality Lead,in_progress
CAPA,3,5,W3,"L3: E2E green; L5: 2-person e-sign + effectiveness check","saga compensation fail",Quality Lead,in_progress
CDOC,1,5,W3,"L2: fixture + screen contract; L5: ECO + release chain","Annex 11 §10 change control fail",Document Control,planned
TRAIN_RECORD,1,5,W3,"L2: fixture; L5: certification e-sign chain","training compliance < 100%",HR Lead,planned
INSP,1,5,W3,"L2: fixture; L5: disposition + MRB chain","GR&R fail; OOT propagation",Quality Lead,planned
BREL,1,7,W7,"L4: read; L5: 2-person sign + lot quarantine resolved; L7: per-pack","validation evidence stale",Quality Lead,planned
LOT,1,5,W5,"L2: fixture; L5: genealogy + quarantine state machine","axiom A14 cycle detected",Logistics Lead,planned
DISP,3,4,W1,"already L3 fixture; L4 live read","cross-browser FAIL",Production Lead,active
OEE_EVENT,0,5,W6,"L2: fixture event ingestion; L5: edge gateway integration","edge cert expired",Production Lead,planned
EBR,0,7,W10,"L0..L7 full progression in pharma vertical pack","Annex 1 sterile contamination","Pharma Lead",planned
APQP,0,5,W10,"L0..L5 in automotive pack","customer CSR mismatch",Quality Engineer,planned
AS9102_FAI,0,5,W10,"L0..L5 in aerospace pack; bubble drawing generator","ITAR access leak",Quality Lead,planned
... (95 rows total)
```

---

## 3. Refresh policy

```yaml
data_product: hesem.root_maturity_v8
refresh: per slice promotion bundle (file 01 §6)
freshness_sla: 24h
publication: per-tenant Grafana dashboard
fields_per_row: per file 01 §4 + V7 §36 carry-forward
```

---

## 4. Decision phrase

```text
V8_ROOT_MATURITY_SCORECARD_BASELINE_LOCKED
NEXT_FILE: 40_V8_MODULE_CAPABILITY_CROSSWALK_V8.md
```
