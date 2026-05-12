# C08 — MES/OT/Edge, Offline, and Reconciliation Contract

## 1. Executive decision

C08 establishes the HESEM planning contract for MES/OT edge integration, connected-worker offline capture, machine-signal trust, peripheral integration, replay, quarantine and reconciliation. The primary decision is:

```text
MACHINE_SIGNAL_IS_NOT_DEFAULT_TRUTH
EDGE_IS_NOT_AUTHORITY
OFFLINE_REPLAY_IS_NOT_A_FRESH_COMMAND
OT_WRITE_PATH_IS_BLOCKED_BY_DEFAULT
SAFETY_FUNCTIONS_REMAIN_OUTSIDE_HESEM_APPLICATION_AUTHORITY
```

C08 is planning-only. It does **not** create code, DDL, SQL, controller/service/component, protocol driver, OpenAPI YAML/JSON, AsyncAPI YAML/JSON, schema, topic definition or executable configuration.

Repo verification: intentionally skipped per user instruction. No current `sanhvo86-hesem/mom` implementation state is asserted.

## 2. Sources used

| Source | Usage in C08 |
| --- | --- |
| `HESEM_GPT_PROJECT_MEMORY.md` | Product posture, Wave 1/dependency roots, non-negotiables, route/workspace authority rules. |
| V10 planning package | MES/OT connected-worker planning, security/OT/safety stop rules, root/API/workflow/evidence matrices. |
| V8 Claude package | MES/OT reference architecture, zone/conduit concept, OT write path prerequisites, offline tolerance pattern. |
| V7 package | ISA-95 separation and edge rules: machine telemetry as evidence, not authority. |
| V6 package | ISA-95/ISA-88 object model, equipment events, OEE/SPC and edge/offline concepts. |
| C01-C07 outputs | API grammar, endpoint catalogs, problem/authz/idempotency/concurrency, authority ledger, event catalog, integration catalog. |

## 3. ISA-95 / HESEM layer separation

| Layer | HESEM C08 planning decision | Authority boundary |
| --- | --- | --- |
| L4 enterprise/business | ERP/customer/supplier/finance planning and reconciliation facts. | No machine control. |
| L3 MOM/MES | HESEM workflow, authority ledger, evidence, record shells, work execution, quality, traceability, maintenance and connected worker UX. | HESEM owns business interpretation and workflow decision only after C01-C07/C08 gates. |
| L2 control/SCADA/PLC | OPC UA/MQTT/historian/device telemetry and approved device/service integration through edge gateway. | OT owner controls actual control layer. HESEM write path blocked by default. |
| L1 sensors/instruments/peripherals | Scanner, RFID, label, metrology, vision, scale, torque, environmental, sensors. | Signals are typed as advisory, measured evidence, controlled input or safety-excluded. |
| L0 physical process | Machines, robots, actuators, operators, safety systems, process reality. | Physical process and safety remain OT/Safety authority. |

## 4. Trust class model

| Trust class | Meaning | Can mutate authority? | Examples | Required gate |
| --- | --- | --- | --- | --- |
| `advisory` | Useful projection or alert candidate. | No. | alarm, RFID read, historian trend, OEE projection. | Device identity + mapping + freshness + reconciliation owner. |
| `measured evidence` | Calibrated/verified measurement may support evidence. | No direct mutation; can satisfy a workflow guard only after C05/B approval. | CMM result, weight, torque, temperature, vision result. | Instrument identity + calibration + method/spec/evidence relation. |
| `controlled input` | Operator/device/edge input can propose or confirm a workflow command. | Only after server-side workflow/authz/idempotency/concurrency/evidence/safety revalidation. | scan intent, step completion, label print request, proposed device command. | C01-C08 gates + B/D/C10 binding before implementation. |
| `safety-excluded` | Safety function, interlock, E-stop, SIS, LOTO and physical hazard status. | Never from HESEM application. | safety PLC, SIS trip, emergency stop, LOTO clear/active. | Read-only or unavailable; Safety/OT owner controls source. |

## 5. Offline replay model

C08 separates offline behavior into five states:

1. **Read-only offline cache** — allowed for continuity if tenant/site/actor scope, freshness, provenance and disabled reasons are visible.
2. **Offline captured evidence** — allowed as pending evidence candidate; not considered accepted until replay passes integrity, retention, relation meaning and workflow guard.
3. **Offline controlled input intent** — allowed only as pending intent; replay must revalidate current server authority and workflow state.
4. **Offline telemetry store-forward** — allowed for edge telemetry/projection rebuild; replay does not execute business mutation.
5. **Offline device command** — not allowed. Offline may create a proposed command review task only; a fresh online command is required after reconciliation.

Replay must preserve:

```text
original_event_time
server_receive_time
source_device_id
operator_or_system_identity
tenant_id/site_id
root_code/canonical_target_code
record_id_or_candidate_id
local_sequence
idempotency_key
correlation_id
causation_id
source_tag_map_or_parser_version
record_version_snapshot
eligibility_snapshot_if_any
```

Replay order is per device, per root record and per causal group. Cross-root global ordering is not assumed.

## 6. Reconciliation outcomes

| Outcome | Meaning | Authority effect |
| --- | --- | --- |
| `accepted_after_revalidation` | Replay passed identity, workflow, evidence, authz, concurrency and root authority checks. | Apply via approved command/evidence policy only. |
| `accepted_as_projection_only` | Signal accepted for timeline/read-model/analytics, not business authority. | Rebuild projection/timeline. |
| `duplicate_deduped` | Idempotency/local sequence proves duplicate. | No new mutation; audit duplicate decision. |
| `quarantined_for_owner_review` | Missing mapping, stale signal, conflict, spec drift, calibration drift, unsafe status or authority gap. | No authority change until owner decision. |
| `rejected_without_apply` | Safety/security/authz/workflow/evidence failure. | Record audit/problem event only. |
| `manual_fallback_required` | System cannot safely determine authority state. | Operator/OT/manual SOP controls continuation; HESEM records later reconciliation. |

## 7. Edge gateway responsibilities

The edge gateway is a controlled conduit and evidence/telemetry broker. It must identify, map, normalize, queue, dedup, quarantine and report health. It must not become workflow authority, root authority, release authority, signature authority, safety controller or autonomous business decision maker.

Detailed rows are in `C08_EDGE_GATEWAY_RESPONSIBILITY_MATRIX.csv`.

## 8. OT write path default decision

All HESEM L3 → OT L2/L1 write paths are blocked by default. A write path can only move from planning to implementation when all prerequisite gates in `C08_OT_WRITE_PATH_PREREQUISITE_GATE_MATRIX.csv` are approved by root owner, OT owner, safety owner, security owner, workflow owner and integration/API owner.

No offline replay may execute an OT/device command.

## 9. Frontend/connected-worker indicators required

Every C08-affected screen/action must expose, at minimum:

```text
offline/online state
cache freshness age
source adapter health
edge gateway health
signal trust class
pending replay count
quarantine/conflict count
disabled mutation reason
safety status stale/conflict banner
manual fallback active indicator
operator/equipment/material/qualification stale indicator
last accepted replay result
```

D05/D09/C10 must bind these indicators to exact route, screen region, copy and action rail.

## 10. Event/API binding posture

C08 uses C06 event names conceptually and creates event-binding prose only. There is no topic schema or AsyncAPI/OpenAPI output. Generic event families:

```text
<root>.offline_read_cache.used
<root>.<signal_or_interface>.captured
<root>.offline_replay.accepted
<root>.offline_replay.conflict_detected
<root>.offline_replay.quarantined
<root>.device_command.proposed
<root>.device_command.rejected
<root>.safety_status.stale
<root>.manual_fallback.started
```

C09 must bind telemetry/SLOs. C10 must bind API/frontend handshake.

## 11. Stop rules

- Stop if machine data is treated as authoritative truth without workflow/evidence/owner approval.
- Stop if offline replay can execute a device command or bypass server-side revalidation.
- Stop if safety function, SIS, E-stop, LOTO or PLC safety interlock is controlled by HESEM application authority.
- Stop if edge gateway has no device identity, tag map owner, zone/conduit, runbook or reconciliation owner.
- Stop if scanner/RFID/label/metrology signals do not have trust class and replay/conflict policy.
- Stop if release/e-sign/disposition/training qualification is applied offline.
- Stop if C08 implementation starts without B workflow guard, D/C10 frontend state, C09 observability and C07 integration binding.

## 12. Acceptance gates

- `C08_OFFLINE_REPLAY_RECONCILIATION_MATRIX.csv` contains root/signal replay, conflict and owner policy.
- `C08_MACHINE_SIGNAL_TRUST_CLASS_MATRIX.csv` contains advisory/measured-evidence/controlled-input/safety-excluded classifications.
- `C08_DEVICE_AND_PERIPHERAL_INTERFACE_CATALOG.csv` maps OPC UA/MQTT/historian/barcode/RFID/label/metrology/vision/mobile/edge devices to roots/workflows/gates.
- `C08_OT_SECURITY_AND_SAFETY_BOUNDARY.md` defines zone/conduit, safety exclusion, write-path blocking and manual fallback.
- `C08_OT_WRITE_PATH_PREREQUISITE_GATE_MATRIX.csv` makes OT write gate explicit and blocked by default.
- Self-audit score >= 92 with gap repair plan.

## 13. Decision phrase

```text
C08_MES_OT_EDGE_OFFLINE_RECONCILIATION_CONTRACT_READY_WITH_GATED_GAPS
```
