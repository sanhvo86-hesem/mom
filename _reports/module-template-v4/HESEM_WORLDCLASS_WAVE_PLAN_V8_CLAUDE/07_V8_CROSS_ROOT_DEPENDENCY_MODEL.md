# 07 — V8 Cross-Root Dependency Model

```text
purpose:        Formalize root-to-root dependencies that V7's root_backlog leaves implicit
predecessor:    V7 §08 prose root list + data/root_backlog.json (no DAG)
v8_advance:     Explicit DAG between 75 roots; per-edge dependency type; CI graph integrity check
work_package:   WP-V8-XROOT (1 work package; informs many)
owner:          Domain Architect + Platform Lead
estimate:       2 engineering-weeks
```

---

## 1. Why this matters

V7 lists 75 roots and assigns each to a target wave. But V7 never says: "before SO can graduate to L4, ITEM and CUST must already be at L3, because SO references both via foreign key."

Without explicit cross-root dependencies, slice plans are inconsistent. V8 ships the DAG as data + a CI integrity check.

---

## 2. Dependency edge types

```yaml
HARD_FK:           foreign-key reference; predecessor must exist before successor instance can
SOFT_REF:          logical reference; predecessor failure produces SEV-3 not SEV-1
GENEALOGY:         material/lineage genealogy (V5 file 02 §1.3 GENEALOGY predicate)
WORKFLOW_TRIGGER:  predecessor's transition triggers successor's transition
EVIDENCE_INPUT:    successor's evidence chain references predecessor records
PROJECTION_INPUT:  successor (read model) sources from predecessor authoritative root
GOVERN:            policy_directive governs root
COMPENSATION:      saga compensation chain links
```

---

## 3. Sample dependency rows (full set in `data/cross_root_deps_v8.json`)

```yaml
edges:
  - subject: SO,    type: HARD_FK,           object: CUST,   reason: "SO.customer_id → CUST"
  - subject: SO,    type: HARD_FK,           object: ITEM,   reason: "SO line.item_id → ITEM"
  - subject: SO,    type: HARD_FK,           object: IREV,   reason: "SO line.rev_id → IREV"
  - subject: PO,    type: HARD_FK,           object: SUP,    reason: "PO.supplier_id → SUP"
  - subject: PO,    type: HARD_FK,           object: ITEM,   reason: "PO line.item_id → ITEM"
  - subject: JO,    type: HARD_FK,           object: ITEM,   reason: "JO.item_id → ITEM"
  - subject: JO,    type: HARD_FK,           object: ROUTE,  reason: "JO.routing_id → ROUTE"
  - subject: WO,    type: HARD_FK,           object: JO,     reason: "WO.job_id → JO"
  - subject: WO,    type: HARD_FK,           object: OPER,   reason: "WO.operation_id → OPER"
  - subject: LOT,   type: GENEALOGY,         object: LOT,    reason: "child LOT derived from parent LOT (M:N)"
  - subject: LOT,   type: HARD_FK,           object: ITEM,   reason: "LOT.item_id → ITEM"
  - subject: SERIAL,type: HARD_FK,           object: LOT,    reason: "SERIAL.lot_id → LOT"
  - subject: NQCASE,type: HARD_FK,           object: LOT,    reason: "NQCASE.lot_id → LOT"
  - subject: NQCASE,type: WORKFLOW_TRIGGER,  object: LOT,    reason: "NQCASE.open → LOT.quarantine"
  - subject: NQCASE,type: WORKFLOW_TRIGGER,  object: CAPA,   reason: "NQCASE.dispose_reject → CAPA auto-create"
  - subject: CAPA,  type: HARD_FK,           object: NQCASE, reason: "CAPA.source_nc_id → NQCASE"
  - subject: SCAR,  type: HARD_FK,           object: SUP,    reason: "SCAR.supplier_id → SUP"
  - subject: SCAR,  type: HARD_FK,           object: NQCASE, reason: "SCAR.source_nc_id → NQCASE"
  - subject: BREL,  type: HARD_FK,           object: LOT,    reason: "BREL.lot_id → LOT"
  - subject: BREL,  type: WORKFLOW_TRIGGER,  object: LOT,    reason: "BREL.release_committed → LOT.released"
  - subject: BREL,  type: EVIDENCE_INPUT,    object: INSP,   reason: "BREL evidence chain references INSP"
  - subject: BREL,  type: EVIDENCE_INPUT,    object: VAL,    reason: "BREL requires fresh VAL evidence"
  - subject: BREL,  type: EVIDENCE_INPUT,    object: TRAIN_RECORD, reason: "BREL requires TRAIN compliance"
  - subject: CDOC,  type: WORKFLOW_TRIGGER,  object: ECO,    reason: "CDOC release_revision triggers ECO requirement"
  - subject: ECO,   type: WORKFLOW_TRIGGER,  object: CDOC,   reason: "ECO.approve releases linked CDOCs"
  - subject: ECO,   type: WORKFLOW_TRIGGER,  object: TRAIN_RECORD, reason: "ECO release schedules training assignment"
  - subject: TRAIN_RECORD, type: HARD_FK,    object: TRAIN_COURSE, reason: "TRAIN_RECORD.course_id → TRAIN_COURSE"
  - subject: TRAIN_RECORD, type: HARD_FK,    object: USER,   reason: "TRAIN_RECORD.user_id → USER"
  - subject: COMP_MATRIX,  type: HARD_FK,    object: ROLE,   reason: "COMP_MATRIX.role_id → ROLE"
  - subject: COMP_MATRIX,  type: HARD_FK,    object: TRAIN_COURSE, reason: "COMP_MATRIX.course_id → TRAIN_COURSE"
  - subject: INSP,  type: HARD_FK,           object: LOT,    reason: "INSP.lot_id → LOT"
  - subject: INSP,  type: HARD_FK,           object: ITEM,   reason: "INSP.item_id → ITEM"
  - subject: INSP,  type: HARD_FK,           object: MDEV,   reason: "INSP.measurement_device_id → MDEV"
  - subject: MRB,   type: HARD_FK,           object: NQCASE, reason: "MRB.case_id → NQCASE"
  - subject: SPC,   type: HARD_FK,           object: ITEM,   reason: "SPC.item_id → ITEM"
  - subject: SPC,   type: WORKFLOW_TRIGGER,  object: NQCASE, reason: "SPC violation → NQCASE candidate"
  - subject: EQP,   type: SOFT_REF,          object: CAL,    reason: "EQP last_cal_id → CAL"
  - subject: CAL,   type: HARD_FK,           object: EQP,    reason: "CAL.equipment_id → EQP"
  - subject: CAL,   type: WORKFLOW_TRIGGER,  object: NQCASE, reason: "CAL OOT → review affected lots"
  - subject: MWO,   type: HARD_FK,           object: EQP,    reason: "MWO.equipment_id → EQP"
  - subject: PMSCH, type: HARD_FK,           object: EQP,    reason: "PMSCH.equipment_id → EQP"
  - subject: PMSCH, type: WORKFLOW_TRIGGER,  object: MWO,    reason: "PMSCH due → MWO auto-create"
  - subject: FMEA,  type: GOVERN,            object: SPC,    reason: "PFMEA failure mode → SPC characteristic"
  - subject: FMEA,  type: GOVERN,            object: INSP,   reason: "PFMEA → CONTROL_PLAN → INSP check item"
  - subject: APR,   type: EVIDENCE_INPUT,    object: BATCH_RECORD, reason: "Annual Product Review aggregates batches"
  - subject: APR,   type: EVIDENCE_INPUT,    object: NQCASE, reason: "APR aggregates deviations"
  - subject: APR,   type: EVIDENCE_INPUT,    object: COMPLAINT, reason: "APR aggregates complaints"
  - subject: APR,   type: EVIDENCE_INPUT,    object: STABILITY_STUDY, reason: "APR aggregates stability"
  # ... + ~120 more edges; full set in data/cross_root_deps_v8.json
```

---

## 4. Wave assignment integrity rules

```yaml
R-XROOT-1: For HARD_FK edge subject→object, target_wave(subject) >= target_wave(object).
           Detection: data integrity job over data/cross_root_deps_v8.json + data/root_backlog_v8.json
           Severity: BLOCK (V8 wave plan rejected if any violation)

R-XROOT-2: For each ITEM-of-record root in critical path (ITEM, CUST, SUP, EQP, MDEV, USER, ROLE),
           target_wave must be ≤ W2 (i.e. master data must be ready before any transactional flow).
           Detection: scripts/verify_master_data_priority_v8.py
           
R-XROOT-3: For WORKFLOW_TRIGGER edges, both subject and object must reach L5 in the same wave or the subject's wave (cannot trigger across wave boundary mid-flight).

R-XROOT-4: For GENEALOGY edges, the cycle check is enforced (no LOT can be its own ancestor).
           Detection: V5 OTG axiom A14
           
R-XROOT-5: For EVIDENCE_INPUT edges, the input root must be at L4 or higher when the consumer reaches L5.
           Detection: scripts/verify_evidence_chain_v8.py
```

---

## 5. Critical roots (most edges in/out)

By in-degree (most depended upon):

```text
ITEM         42 inbound edges  (everywhere uses item master)
USER         38 inbound edges  (everywhere uses user identity)
LOT          25 inbound edges  (manufacturing fact)
EQP          18 inbound edges  (operations fact)
ROUTE        14 inbound edges
NQCASE       12 inbound edges
CDOC         11 inbound edges
```

By out-degree (most outgoing):

```text
APR          15 outbound edges (Annual Product Review aggregates many)
BREL         11 outbound edges
ECO           7 outbound edges
WO            6 outbound edges
```

V8 ADR-V8-XROOT-001: master data roots (ITEM, CUST, SUP, EQP, MDEV, USER, ROLE, ROUTE) target W0.5–W2; failure to mature these blocks all downstream waves.

---

## 6. Work package

```yaml
WP-V8-XROOT-1:
  title: Author cross-root DAG + integrity rules + verification scripts
  deliverables:
    - data/cross_root_deps_v8.json (full DAG, ~150 edges)
    - matrices/v8_cross_root_dag.csv
    - scripts/verify_root_dag_v8.py (R-XROOT-1..5)
    - .github/workflows/v8/root-dag-integrity.yml
  effort_eng_weeks: 2
```

---

## 7. Decision phrase

```text
V8_CROSS_ROOT_DEPENDENCY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-XROOT-1
NEXT_FILE: 08_V8_SPINE_PHASING_PER_WAVE.md
```
