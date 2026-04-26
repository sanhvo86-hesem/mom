# 06_DOMAIN_DEPTH_MES_OT_ENGINEERING.md

## Purpose

GPT Pro V4 §08 lists "MES depth" as a Wave-9 stream and provides a bullet-list of capabilities (SPC, OEE, Andon, IoT, calibration, FMEA, validation). V4 does not specify *how* an MES is engineered against the OT/IT divide that breaks every immature MES.

This file produces the V5 engineering substance for MES + OT (Operational Technology) integration. It draws from:

- ISA-95 / IEC 62264 (Enterprise-Control System Integration)
- ISA-88 / IEC 61512 (Batch Control)
- ISA-99 / IEC 62443 (OT cybersecurity)
- ISA-101 (HMI design)
- ISA-106 (Procedure-based automation)
- ISO 22400 (KPI for manufacturing operations)
- VDMA OPC UA companion specifications
- NAMUR NE 175 / NE 159 (modular automation)
- B2MML (XML schema for ISA-95)
- MQTT Sparkplug B (industrial pub/sub)
- OPC UA TSN (Time-Sensitive Networking)

The end state: HESEM MES is **OT-aware, deterministic-tolerant, and auditable** — capable of running against PLCs, robots, vision systems, and ERP gateways without becoming a bag of bespoke integrations.

---

## Section 1 — The OT/IT divide and what it costs

### 1.1 Three fundamental differences

| Dimension | IT (HESEM core) | OT (factory floor) |
|---|---|---|
| Time discipline | eventual consistency tolerated | hard real-time required (μs–ms) |
| Failure semantics | retry, eventual recovery | physical consequences (scrap, injury) |
| Software lifecycle | continuous deployment OK | validated; updates require requalification |
| Network | TCP/HTTP, TLS | OPC UA, Modbus, Profinet, EtherCAT |
| Identity | OIDC user identity | device identity (often shared/none) |
| Data model | rich relational + graph | tag-list, time-series |
| Patching | weekly | quarterly to never |
| Outage tolerance | seconds | zero, but degraded modes mandatory |

A naive MES tries to push IT semantics down to OT. A correct MES respects the divide and **mediates** rather than collapses it.

### 1.2 The mediation pattern

```text
+--------------------------------------------------+
|  HESEM core (L1-L7)                              |
|  - workflow, state machines, audit, OTG          |
|  - auth: OIDC users + service accounts           |
+----------------↓ open standards ↑----------------+
|  Edge gateway (NEW per V5)                       |
|  - protocol translator (OPC UA ↔ HTTP/MQTT)      |
|  - per-asset device identity (X.509 certs)       |
|  - store-and-forward buffer (offline tolerance)  |
|  - tag → resource_family mapping                 |
+----------------↓ industrial protocols ↑---------+
|  OT layer (PLCs, sensors, robots, vision)        |
|  - deterministic                                 |
|  - vendor-specific runtime                       |
+--------------------------------------------------+
```

V5 introduces the **edge gateway** as a first-class HESEM component, not "an integration partner's job".

---

## Section 2 — ISA-95 alignment

ISA-95 defines a 5-level model of manufacturing operations. V5 maps every concept explicitly.

```text
Level 4   Business planning & logistics              (HESEM core: ERP/finance/SCM)
Level 3   MOM / MES                                  (HESEM core: planning/execution/quality/maintenance)
Level 2   Process control (DCS, SCADA, batch)        (Edge gateway + plant DCS)
Level 1   Sensors & instrumentation                  (Field devices)
Level 0   Physical process                           (Reality)
```

HESEM owns Levels 4 and 3. The edge gateway mediates Level 3↔2. Level 2 and below are **integrated with**, never **owned by**, HESEM.

### 2.1 Operations activities (ISA-95 part 3)

ISA-95 part 3 defines four operations activity domains. V5 matches each to HESEM modules:

| ISA-95 activity | HESEM domain | Wave |
|---|---|---|
| Production Operations | Planning & Production + MES Execution | W1, W3, W6, W10A |
| Quality Operations | Quality Improvement (eQMS) | W3, W6 |
| Inventory Operations | Inventory & Logistics | W6, W10C |
| Maintenance Operations | Maintenance & EHS | W6, W10F |

### 2.2 Operations management functions (ISA-95 part 4)

V5 produces a normative crosswalk:

```text
Production scheduling           → MWO scheduling + production order management
Production dispatching          → work-cell dispatch + operator console
Production tracking             → execution instances + genealogy
Production performance analysis → OEE dashboard + SPC
Quality test (definition + scheduling + tracking + performance) → eQMS state machines
Maintenance (definition + dispatch + tracking + analysis) → MWO + reliability
Inventory (definition + dispatch + tracking + analysis) → LOT + cycle count
```

### 2.3 B2MML compliance

For interop with SAP MII, Oracle MOC, and other ISA-95-conformant systems, HESEM emits B2MML envelopes for production schedule and production response messages.

```xml
<!-- Example: ProductionSchedule envelope (B2MML) -->
<ProductionSchedule>
  <ID>PS-2026-04-25-001</ID>
  <ProductionRequest>
    <ID>PR-2026-04-25-001-1</ID>
    <ProductProduction>
      <ProductionParameter>
        <ID>QUANTITY</ID>
        <Value><DataType>Quantity</DataType><Quantity>1000</Quantity><UnitOfMeasure>EA</UnitOfMeasure></Value>
      </ProductionParameter>
    </ProductProduction>
    <SegmentRequirement> ... </SegmentRequirement>
  </ProductionRequest>
</ProductionSchedule>
```

V5 ADR-0105: HESEM emits B2MML for ProductionSchedule, ProductionResponse, MaterialLot, MaterialActual, EquipmentActual messages.

---

## Section 3 — ISA-88 batch control

For regulated process industries (Pharma, Specialty Chem, Food), batch control is the canonical execution model.

### 3.1 Recipe hierarchy (S88)

```text
GENERAL_RECIPE     (corporate, business-level)
  ↓
SITE_RECIPE        (site-specific master)
  ↓
MASTER_RECIPE      (equipment-specific, validated)
  ↓
CONTROL_RECIPE     (per batch instance, parameterized)
  ↓
EXECUTED_BATCH     (per batch run, fully recorded)
```

V5 produces five OTG authority classes for batch:

```text
authoritative_root: GENERAL_RECIPE
authoritative_root: SITE_RECIPE
authoritative_root: MASTER_RECIPE     (subject to validation; IQ/OQ/PQ required)
authoritative_root: CONTROL_RECIPE    (one per batch)
evidence_artifact:  EXECUTED_BATCH    (immutable batch record)
```

Edges:

```text
SITE_RECIPE       —DERIVED_FROM→  GENERAL_RECIPE
MASTER_RECIPE     —DERIVED_FROM→  SITE_RECIPE
CONTROL_RECIPE    —DERIVED_FROM→  MASTER_RECIPE
EXECUTED_BATCH    —EXECUTED→      CONTROL_RECIPE
EXECUTED_BATCH    —RECORDS→       MATERIAL_LOT (consumed/produced)
```

### 3.2 Procedure model (S88)

```text
PROCEDURE
  ↓ (consists of)
UNIT_PROCEDURE
  ↓ (consists of)
OPERATION
  ↓ (consists of)
PHASE
```

A PHASE is the smallest controllable step. V5 enforces:

```text
- Every PHASE has guards (conditions for execution).
- Every PHASE emits a phase_start_event and a phase_end_event into otg_event.
- Every PHASE has parameters (setpoints) bound at recipe scaling.
- Every PHASE has alarms (deviation conditions) raised as workflow_event.
```

### 3.3 Batch validation (Pharma)

For regulated batches, the executed_batch is **WORM** (S3 Object Lock) for at least 7 years post-supersession. Per FDA 21 CFR 211.180, batch records must be retained for at least 1 year after the expiration date of the batch's drug product.

V5 ADR-0106: Pharma vertical pack adds extended retention class `gxp_batch` (default 10 years rolling).

---

## Section 4 — OPC UA companion spec adoption

OPC UA companion specs define industry-specific information models. V5 adopts:

```text
PackML            Packaging machinery (fills/cartoners)
WMS               Warehouse management
EUROMAP 77        Plastics machinery
RoboticsAPI       Robotics
Vision            Machine vision
PROFINET          Profinet integration
```

The edge gateway exposes OPC UA companion-spec endpoints to HESEM as REST/JSON via translator. HESEM never speaks raw OPC UA — the gateway always mediates.

### 4.1 PackML state machine adoption

PackML defines a canonical state machine for packaging machines:

```text
states:
  STOPPED
  RESETTING
  IDLE
  STARTING
  EXECUTE       (running, producing)
  COMPLETING
  COMPLETE
  HOLDING
  HELD          (paused, recoverable)
  UNHOLDING
  ABORTING
  ABORTED       (faulted, requires reset)
  CLEARING
  SUSPENDING
  SUSPENDED
  UNSUSPENDING
```

V5 maps each PackML state to a HESEM `equipment_state_event` recorded in OTG. OEE calculations subscribe to this event stream (per Section 6).

---

## Section 5 — Edge gateway architecture

### 5.1 Components

```text
hesem-edge-gateway (deployed at each plant site)
  - protocol-translator    (OPC UA + Modbus + MQTT Sparkplug + raw TCP)
  - tag-mapper             (configures tag → resource_family mapping)
  - device-identity-manager (X.509 certs per device + rotation)
  - store-and-forward      (local SQLite / RocksDB buffer for offline)
  - tls-terminator         (mutual TLS with HESEM core)
  - local-rule-engine      (pre-aggregation + alarm filtering)
  - audit-bridge           (mirrors local audit chain to HESEM core)
```

### 5.2 Tag mapping

```yaml
# /etc/hesem/edge/tag-map.yaml
mappings:
  - tag: ns=2;s=Line1.PackML.State
    target_resource_family: EQUIPMENT_STATE
    target_external_id: line1
    transformation: enum_to_string(PackML.State)
    sampling_rate_ms: 100
    significance_filter: state_change_only
  - tag: ns=2;s=Line1.GoodCount
    target_resource_family: PRODUCTION_COUNT
    target_external_id: line1
    transformation: int_counter_delta
    sampling_rate_ms: 1000
    significance_filter: change_only
```

### 5.3 Store-and-forward

```text
Goal: edge gateway operates for up to 24 hours without HESEM core connectivity.

Behavior:
  - All events written to local SQLite WAL
  - On reconnect, replay events in order
  - Local audit chain extended; on reconnect, audit chain merged into HESEM core
                                  (per audit_chain_anchor.external_anchor_uri trick)
  - Workflow transitions queued; HESEM core deduplicates by (edge_id, sequence_number)
```

### 5.4 Device identity

Every device on the floor has an X.509 cert issued by the plant CA. The edge gateway authenticates each device per session. HESEM core sees the gateway's identity but receives the device identity in the message envelope.

```text
edge_event_envelope:
  schema_version: 1
  edge_id: edge-plant-vn-01
  device_id: PLC-LINE1-STATION3
  device_cert_fingerprint: <sha256>
  occurred_at: 2026-04-25T03:14:15.123456Z
  sequence_number: 18437283
  payload: { ... }
  signature: <ed25519>
```

### 5.5 Security

Per IEC 62443:

```text
SL-T (target Security Level): 2 minimum, 3 recommended for vertical packs (Pharma/Aero)
zone classification: edge gateway sits between SL3 (OT zone) and SL2 (DMZ)
conduit: mutual TLS 1.3 with cert pinning
network segmentation: firewall rules per zone
patching: edge gateway gets monthly security patches; PLC firmware quarterly
                              (with revalidation)
```

V5 ADR-0107: IEC 62443 SL-2 baseline + SL-3 for regulated verticals.

---

## Section 6 — OEE engineering

### 6.1 Definition

```text
OEE = Availability × Performance × Quality

Availability = Run Time / Planned Production Time
Performance = (Total Count × Ideal Cycle Time) / Run Time
Quality = Good Count / Total Count
```

Source data feeds:

```text
Planned Production Time     ← shift schedule (HESEM)
Run Time                    ← equipment state events (PackML EXECUTE state duration)
Total Count                 ← good + scrap counts (edge counter tags)
Good Count                  ← total - scrap (or post-inspection accept count)
Ideal Cycle Time            ← master data per product × equipment
```

### 6.2 OEE event model

OTG node + edge schema:

```text
authority_class: workflow_event   (sub-type: equipment_state_event)
edges:
  RECORDED_BY  → equipment node (LINKED edge predicate variant)
  SOURCED_FROM → edge_event_envelope (provenance)
```

OTG materialized view:

```sql
CREATE MATERIALIZED VIEW mv_oee_daily AS
SELECT
  eq.id AS equipment_id,
  eq.external_id AS equipment_code,
  d.day,
  ROUND(SUM(CASE WHEN ev.payload->>'state' = 'EXECUTE'
                 THEN extract(epoch from ev.duration) ELSE 0 END)
        / NULLIF(SUM(CASE WHEN s.state = 'planned'
                          THEN extract(epoch from s.duration) ELSE 0 END), 0)
       * 100, 2) AS availability_pct,
  ROUND(SUM(c.total_count) * eq.metadata->>'ideal_cycle_seconds')::float
        / NULLIF(SUM(CASE WHEN ev.payload->>'state' = 'EXECUTE'
                          THEN extract(epoch from ev.duration) ELSE 0 END), 0)
        * 100, 2) AS performance_pct,
  ROUND(SUM(c.good_count) * 100.0 / NULLIF(SUM(c.total_count), 0), 2) AS quality_pct,
  ROUND( (availability * performance * quality) / 10000, 2) AS oee_pct
FROM otg_node eq
JOIN otg_event ev ON ev.subject_node_id = eq.id
JOIN production_count c ON c.equipment_id = eq.id
JOIN shift_schedule s ON s.equipment_id = eq.id
JOIN dim_day d ON d.day = ev.occurred_at::date
WHERE eq.authority_class = 'authoritative_root'
  AND eq.resource_family = 'EQUIPMENT'
GROUP BY eq.id, eq.external_id, d.day;
```

(This is illustrative; actual implementation uses windowed aggregations with proper handling of state-event durations.)

### 6.3 Andon

When OEE drops below threshold or downtime exceeds N seconds, an `andon_signal` workflow_event is raised. Andon Tower workspace subscribes via WebSocket.

---

## Section 7 — SPC (Statistical Process Control)

### 7.1 Control chart types

V5 supports:

```text
X-bar / R         (variables, subgroups)
X-bar / S         (variables, subgroups, σ-based)
I-MR              (individuals, moving range)
p-chart           (proportion defective, attributes)
np-chart          (number defective, attributes)
c-chart           (count defects per unit)
u-chart           (defects per unit, varying sample size)
EWMA              (exponentially weighted moving average)
CUSUM             (cumulative sum)
```

### 7.2 Control limit calculation

For a stable process with known μ and σ:

```text
UCL = μ + 3σ
LCL = μ - 3σ
```

For estimated:

```text
X-bar / R chart:
  UCL_xbar = X-double-bar + A2 × R-bar
  LCL_xbar = X-double-bar - A2 × R-bar
  UCL_R    = D4 × R-bar
  LCL_R    = D3 × R-bar

(A2, D3, D4 are tabulated per subgroup size n.)
```

### 7.3 Western Electric / Nelson rules

V5 implements 8 standard out-of-control rules:

```text
Rule 1: any point beyond 3σ
Rule 2: 9 consecutive points on same side of center
Rule 3: 6 consecutive points trending in same direction
Rule 4: 14 consecutive points alternating up and down
Rule 5: 2 of 3 points beyond 2σ on same side
Rule 6: 4 of 5 points beyond 1σ on same side
Rule 7: 15 points within 1σ (over-controlled / sensor failure)
Rule 8: 8 consecutive points outside 1σ (mixed populations)
```

Each rule triggers a `spc_violation` workflow_event with rule_id metadata.

### 7.4 Cp/Cpk

```text
Cp = (USL - LSL) / (6σ)
Cpk = min((USL - μ) / (3σ), (μ - LSL) / (3σ))
```

V5 tracks Cp/Cpk per characteristic per process per period.

### 7.5 ADRs

```text
ADR-0108  SPC engine library choice (custom vs scipy.stats)
ADR-0109  Western Electric rules implementation + configurability
ADR-0110  Cp/Cpk reporting cadence (per shift, daily, weekly)
```

---

## Section 8 — Calibration management

### 8.1 Equipment calibration record

```text
authoritative_root: CAL
fields:
  cal_id, equipment_id, calibration_due_date, last_calibrated_at, last_cal_result,
  reference_standard_id, traceability_chain, next_due_at, technician_id, certificate_uri
edges:
  VALIDATES → EQUIPMENT
  GENEALOGY → CAL (previous calibration)
  RECORDS   → MEASUREMENT_RUN_DATA
```

### 8.2 Traceability chain

Calibration measurements must trace through ≤ 3 levels to a national standard (NIST in US, NIM in China, JCSS in Japan, NMIA in Australia, etc.).

```text
device under test
  ↓ calibrated against
working standard (in-house)
  ↓ calibrated against
reference standard (in-house master, typically annual)
  ↓ calibrated against
external accredited lab (ISO/IEC 17025) [could be national-metrology]
  ↓ traceable to
national standard
```

V5 ADR-0111: Every CAL record must reference the upstream traceability chain in metadata; gaps fail OQ.

### 8.3 Out-of-tolerance (OOT)

If a calibration finds the equipment was OOT, every subsequent measurement made by that equipment since the last passing calibration must be reviewed. V5 emits an `oot_review` workflow_event per LOT/INS that used the affected equipment.

---

## Section 9 — FMEA worksheet

### 9.1 FMEA-MSR (per AIAG-VDA 2019)

```text
authoritative_root: FMEA
fields:
  fmea_id, fmea_type ∈ {DFMEA, PFMEA, FMEA-MSR}, scope_description,
  team_members, status, structure_tree
edges:
  ANALYZES → SYSTEM_FUNCTION (or PROCESS_STEP for PFMEA)

authoritative_root: FAILURE_MODE
fields:
  failure_mode_text, severity (1-10), occurrence (1-10), detection (1-10),
  rpn (S × O × D), action_priority ∈ {H, M, L} (per AIAG-VDA)
edges:
  PART_OF → FMEA
  CAUSED_BY → FAILURE_CAUSE
  DETECTED_BY → CURRENT_CONTROL
```

### 9.2 Action priority calculation

Per AIAG-VDA 2019 (replacing RPN):

```text
S=10 → AP = H regardless
S=9-7, O ≥ 8, D ≥ 7 → H
S=9-7, O ≥ 7, D = 4-6 → M
... (full lookup table)
```

V5 implements the lookup table as configuration data, not hardcoded.

### 9.3 ADRs

```text
ADR-0112  FMEA action priority methodology (AIAG-VDA 2019; deprecate RPN-only)
ADR-0113  FMEA structure tree representation in OTG (recursive node hierarchy)
```

---

## Section 10 — Validation IQ/OQ/PQ for equipment

### 10.1 Equipment validation lifecycle

```text
1. URS (User Requirements Specification)
2. FS (Functional Specification)
3. DS (Design Specification)
4. FAT (Factory Acceptance Test)
5. SAT (Site Acceptance Test)
6. IQ (Installation Qualification)
7. OQ (Operational Qualification)
8. PQ (Performance Qualification)
9. PV (Process Validation, per FDA Guidance)
10. Continued Process Verification (post-validation, per FDA 2011)
```

Each step produces an `evidence_artifact` OTG node.

### 10.2 GAMP 5 categorization

```text
Cat 1: infrastructure software (OS, DB) — minimal validation
Cat 3: non-configured products (off-the-shelf) — risk-based qualification
Cat 4: configured products (HESEM falls here) — full IQ/OQ/PQ
Cat 5: custom-developed software — full validation lifecycle
```

V5 declares: HESEM customer instances are GAMP 5 Cat 4. Customer-specific custom workflows are Cat 5.

### 10.3 ADR

```text
ADR-0114  GAMP 5 Cat 4 baseline; vertical pack custom workflows escalated to Cat 5
ADR-0115  Continued Process Verification monitoring SLOs
```

---

## Section 11 — Operator mobile console (PWA)

### 11.1 Functional scope

```text
- View MWO assignments
- Confirm task start/stop
- Submit inspection check items
- Capture photo evidence (with metadata)
- Scan barcode/QR for lot identification
- Report andon signal
- View shift schedule
- Submit safety incident
```

### 11.2 Offline tolerance

The PWA must work for ≥ 4 hours offline. Behavior:

```text
- IndexedDB stores pending intents
- Service worker handles background sync
- On reconnect: replay intents in order, deduplicated via Idempotency-Key
- Conflict resolution: server wins on version conflict; user notified
```

### 11.3 Hardware integration

```text
camera:        Web Camera API
barcode:       BarcodeDetector API (Chrome) + ZXing fallback
geolocation:   Geolocation API (for shift/zone confirmation)
nfc:           Web NFC API (selected platforms)
```

### 11.4 ADRs

```text
ADR-0116  Operator PWA offline tolerance budget (4h) + conflict policy (server-wins)
ADR-0117  Hardware API fallback strategy (BarcodeDetector → ZXing → manual entry)
```

---

## Section 12 — IIoT data ingestion

### 12.1 Data volume

A single CNC machine typically emits 50–500 tags at 10–100ms sampling. A 100-machine plant generates millions of measurements per hour.

V5 strategy:

```text
1. Edge gateway aggregates to 1-second resolution before HESEM core ingestion.
2. HESEM core stores raw at 1s for 7 days (online), 1m for 90 days, 1h for 1 year.
3. Anomaly samples (selected by edge rule engine) retained at full resolution for 30 days.
4. Time-series storage: TimescaleDB extension on Postgres (V5 ADR-0118)
                       OR external (InfluxDB / Victoria Metrics) if scale demands.
```

### 12.2 Time-series schema

```sql
CREATE TABLE ts_equipment_measurement (
  equipment_id UUID NOT NULL,
  tag_id       TEXT NOT NULL,
  sampled_at   TIMESTAMPTZ NOT NULL,
  value_num    DOUBLE PRECISION,
  value_str    TEXT,
  quality      SMALLINT,                -- OPC UA quality code
  edge_id      TEXT,
  PRIMARY KEY (equipment_id, tag_id, sampled_at)
);
SELECT create_hypertable('ts_equipment_measurement', 'sampled_at');
SELECT add_compression_policy('ts_equipment_measurement', INTERVAL '1 day');
SELECT add_retention_policy('ts_equipment_measurement', INTERVAL '7 days');
```

### 12.3 ADR

```text
ADR-0118  Time-series storage: TimescaleDB primary; InfluxDB if scale > 1B rows/day
ADR-0119  Edge pre-aggregation contract (1-second resolution baseline)
```

---

## Section 13 — Predictive maintenance (foreshadowing W7 ML feature)

### 13.1 Feature engineering

For predictive maintenance, the feature store contains per-asset:

```text
- vibration_rms_1m, vibration_rms_5m, vibration_rms_1h
- bearing_temperature_p95
- motor_current_drift
- run_hours_since_last_maintenance
- weibull_shape_estimate (per failure mode)
- mean_time_between_failures_estimate
- last_anomaly_score (autoencoder reconstruction error)
```

### 13.2 Model

V5 ADR-0120: Hybrid model = Weibull baseline + LSTM short-horizon residual predictor. Output is probability of failure within next 7 / 14 / 30 days.

### 13.3 Action threshold

The model **never schedules a maintenance work order autonomously**. It produces an `ai_advisory_annotation` per asset; a maintenance planner decides.

This is RULE-2 enforcement at runtime: the AI is advisory, the human is decisive.

---

## Section 14 — Quality genealogy upstream/downstream queries at scale

### 14.1 The query pattern

```text
"For LOT 47, which raw-material lots fed it, with what proportions, in what order?"
"For supplier X's component batch Y, which finished-goods lots contained it, with what counts?"
```

### 14.2 OTG advantage

Without OTG, the query joins LOT_GENEALOGY 5–10 times. With OTG `mv_otg_genealogy_upstream`, the query is a single index scan.

```sql
SELECT n_a.external_id AS ancestor,
       n_a.metadata->>'lot_size' AS lot_size,
       g.shortest_depth
FROM mv_otg_genealogy_upstream g
JOIN otg_node n_d ON n_d.id = g.descendant_id AND n_d.external_id = 'LOT-47'
JOIN otg_node n_a ON n_a.id = g.ancestor_id;
```

### 14.3 Pathological inputs

If a genealogy graph has cycles (which axiom A14 forbids) or very deep chains, the query can blow up. V5 hard-limits depth to 20 per ADR-0079.

---

## Section 15 — Failure modes and runbooks

| Failure mode | Likelihood | Severity | Detection | Runbook |
|---|---|---|---|---|
| Edge gateway loses connectivity | high | medium | heartbeat alarm | RB-OT-001 |
| PLC firmware update breaks tag schema | medium | high | schema validation alarm | RB-OT-002 |
| Vision system camera failure | medium | medium | low-confidence-rate spike | RB-OT-003 |
| OPC UA server certificate expired | high (annual) | high | cert expiration alarm 30d ahead | RB-OT-004 |
| Time-series DB ingestion lag | medium | medium | lag SLO | RB-OT-005 |
| OEE collapse to 0 (sensor failure looks like 100% downtime) | medium | high | rapid-state-change rule + sensor health | RB-OT-006 |
| Calibration database drift (clock skew) | low | high | NTP discipline + freshness monotonicity (axiom A12) | RB-OT-007 |
| SPC false-alarm storm (rule-tuning issue) | medium | medium | violation-rate SLO | RB-OT-008 |

Each runbook is a separate document in `docs/ot-runbooks/`.

---

## Section 16 — Validation footprint (regulated)

### 16.1 IQ checklist (MES)

```text
[ ] Edge gateway deployed to plant network
[ ] Mutual TLS established
[ ] Tag mapping configuration loaded and validated
[ ] Time-series storage schema deployed
[ ] OEE materialized view present
[ ] SPC rule engine loaded with configured rules
[ ] Calibration tables present
[ ] Operator PWA installable on representative devices
```

### 16.2 OQ checklist (MES)

```text
[ ] Edge events flow end-to-end (sample tag → HESEM core within budget)
[ ] PackML state mapped correctly to equipment_state_event
[ ] Production count increments correctly
[ ] OEE calculation correct per known scenario
[ ] SPC rule triggered correctly per simulated violation
[ ] Calibration OOT propagation works (test with backdated cal)
[ ] Operator PWA syncs correctly after offline period
```

### 16.3 PQ checklist (MES)

```text
[ ] 30-day continuous operation with edge gateway
[ ] OEE accuracy validated against manual measurement: ±2% absolute
[ ] SPC false-alarm rate < 1% per shift
[ ] No data loss across edge-gateway restart
[ ] Mobile PWA crash rate < 0.1% per session
[ ] Calibration audit pass for full traceability chain
```

---

## Section 17 — Cumulative ADRs

```text
ADR-0105  B2MML emission per ISA-95 part 5 message types
ADR-0106  Pharma vertical extended retention class (gxp_batch, 10yr)
ADR-0107  IEC 62443 SL-2 baseline; SL-3 for regulated
ADR-0108  SPC engine implementation choice
ADR-0109  Western Electric rules configurability
ADR-0110  Cp/Cpk reporting cadence
ADR-0111  Calibration traceability chain mandatory in metadata
ADR-0112  AIAG-VDA 2019 FMEA action priority adoption
ADR-0113  FMEA structure tree in OTG
ADR-0114  GAMP 5 Cat 4 baseline
ADR-0115  Continued Process Verification SLOs
ADR-0116  Operator PWA offline budget + conflict policy
ADR-0117  Hardware API fallback chain
ADR-0118  Time-series storage choice
ADR-0119  Edge pre-aggregation contract
ADR-0120  Predictive maintenance hybrid model architecture
```

---

## Section 18 — Why this matters

V4 names "MES depth" as a single Wave-9 stream. The reality is that MES is the integration boundary between the IT domain (where HESEM lives) and the OT domain (where physics lives). Without rigorous treatment of:

- ISA-95 levels and operations activities
- ISA-88 batch control hierarchy
- OPC UA companion specs
- Edge gateway architecture
- IEC 62443 security levels
- Time-series scale
- GAMP 5 categorization
- IQ/OQ/PQ + Continued Process Verification

…HESEM cannot legitimately claim "MES capability". V5 produces the engineering substance behind the claim.

---

## Decision phrase

```text
V5_MES_OT_ENGINEERING_DEPTH_BASELINE_LOCKED
NEXT_FILE: 07_DOMAIN_DEPTH_REGULATORY_VALIDATION.md
```
