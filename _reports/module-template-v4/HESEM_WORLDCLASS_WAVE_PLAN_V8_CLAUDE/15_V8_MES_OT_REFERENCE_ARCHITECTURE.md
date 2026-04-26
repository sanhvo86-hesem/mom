# 15 — V8 MES / OT Reference Architecture

```text
purpose:        Bind V7 §13 ISA-95 prose to deployment topology + OT zone map + OT write path policy
predecessor:    V7 §13 + V5 file 06 (MES depth)
v8_advance:     IEC 62443 zone map per industrial reference site; 8 OT runbooks; offline tolerance
work_package:   WP-V8-MES (8 work packages)
owner:          MES/OT Lead + Security Lead (joint authority for OT zones)
estimate:       ~12 engineering-weeks (W6 + ongoing)
```

---

## 1. ISA-95 layer separation (V7 carry-forward)

```text
L4 Enterprise/ERP        SO/PO/cost/demand/supply/finance         no machine control
L3 MOM/MES               JO/WO/dispatch/quality/maintenance       via workflow + evidence + AL
L2 Control/SCADA/PLC     telemetry + approved commands            via edge gateway with 62443
L1 Sensors/instruments   field devices                            owner: OT engineering
L0 Physical              machines/sensors/tools/operators          owner: safety + OT
```

V8 binding: HESEM owns L3 + L4. Edge Gateway (V8 NEW component) mediates L3↔L2. L2 below stays out of HESEM authority.

---

## 2. Edge Gateway reference architecture

```text
hesem-edge-gateway-v8 (deployed per plant site)
  - protocol-translator (OPC UA + Modbus + MQTT Sparkplug B + raw TCP)
  - tag-mapper (configures tag → resource_family mapping; data/edge_tag_map_v8.json)
  - device-identity-manager (X.509 certs per device + rotation; HSM-backed if regulated)
  - store-and-forward (local SQLite WAL; 24h offline tolerance)
  - tls-terminator (mutual TLS 1.3 with HESEM core; cert pinning)
  - local-rule-engine (pre-aggregation: 1Hz raw → 1-second bucket sent upstream)
  - audit-bridge (mirrors local audit chain to HESEM core; merges via audit_chain_external_anchor_uri)
  - ot-write-policy-enforcer (rejects upstream-initiated writes unless full prerequisite chain present)
```

Deployment topology:

```text
[Production network — L1/L2 OT zone, IEC 62443 SL-3]
   │
   │ (controlled, signed, approved commands only)
   │
[Edge Gateway DMZ — IEC 62443 conduit between OT zone and corporate IT zone]
   │ (mTLS 1.3 outbound only; no inbound from OT to gateway except via fixed sockets)
   │
[Corporate IT zone — IEC 62443 SL-2; HESEM core]
```

Gateway is single-purpose appliance (not general-purpose server). Hardened OS, signed boot, immutable image, monthly security patches with revalidation.

---

## 3. OT zone map per industrial reference site

`data/ot_zone_map_v8.json`:

```json
{
  "reference_site": "HESEM-Plant-VN-01",
  "zones": [
    {
      "zone_id":"Z-PROD-LINE-1",
      "iec_62443_sl":"SL-3",
      "scope":"Production line 1 PLCs + sensors + robots",
      "trust_boundary_to":["Z-EDGE-DMZ"],
      "owners":["OT Engineering","Plant Manager"]
    },
    {
      "zone_id":"Z-EDGE-DMZ",
      "iec_62443_sl":"SL-2 (with SL-3 controls toward OT side)",
      "scope":"hesem-edge-gateway appliances",
      "trust_boundary_to":["Z-CORP-IT"],
      "trust_boundary_from":["Z-PROD-LINE-1","Z-PROD-LINE-2"]
    },
    {
      "zone_id":"Z-CORP-IT",
      "iec_62443_sl":"SL-2",
      "scope":"HESEM core, observability, SRE",
      "trust_boundary_to":["INTERNET"],
      "trust_boundary_from":["Z-EDGE-DMZ"]
    }
  ],
  "conduits": [
    {
      "conduit_id":"C-OT-EDGE-1",
      "from":"Z-PROD-LINE-1",
      "to":"Z-EDGE-DMZ",
      "protocols_allowed":["OPC-UA","Modbus-TCP","MQTT-Sparkplug"],
      "encryption":"OPC-UA-Sign+Encrypt,TLS1.2+",
      "authentication":"X.509 mutual",
      "session_renewal":"daily",
      "audit":"all packets logged at conduit; signature chain"
    },
    {
      "conduit_id":"C-EDGE-CORE-1",
      "from":"Z-EDGE-DMZ",
      "to":"Z-CORP-IT",
      "protocols_allowed":["HTTPS"],
      "encryption":"TLS1.3",
      "authentication":"X.509 mutual + JWT",
      "audit":"per request"
    }
  ]
}
```

---

## 4. OT write path policy (V7 §13 line 24-29 → V8 6 prerequisites)

An L3 → L2 write (HESEM commanding a PLC) requires ALL of:

```text
1.  Equipment registered in EQP root with active calibration + zone assignment
2.  Operator authorization (not just role; specific equipment-eligible per qualification)
3.  Workflow state allows the write (state-machine guard in SM-8)
4.  Safety interlock evaluator returns clear (no LOTO, no maintenance lock, no ehs_incident open)
5.  Dual-control approval (two principals signed within 5min window)
6.  Manual override audit chain primed (override would be caught and recorded)

if any prerequisite fails → 423 Locked + problem-detail https://hesem.io/problems/ot/zone-policy-violation
if engaged interlock fires during write → 423 Locked + problem-detail https://hesem.io/problems/ot/safety-interlock-engaged
```

---

## 5. PackML state machine adoption

`data/packml_state_machine_v8.yaml`:

```yaml
state_machine: equipment.packml
states: [STOPPED,RESETTING,IDLE,STARTING,EXECUTE,COMPLETING,COMPLETE,HOLDING,HELD,UNHOLDING,ABORTING,ABORTED,CLEARING,SUSPENDING,SUSPENDED,UNSUSPENDING]
transitions: per ANSI/ISA-TR88.00.02
emits:
  - workflow_event: equipment.state.<state>
  - otg_event: equipment_state_event
oee_calculation_inputs: {state, duration, count}
```

---

## 6. Connected worker offline tolerance

PWA + service worker; offline budget ≥ 4 hours.

```yaml
offline_behavior:
  - read instructions from local cache (last sync)
  - capture step completion to IndexedDB pending queue
  - on reconnect: replay queued intents in order, dedup via Idempotency-Key
  - conflict resolution: server wins on version mismatch; user notified
  - eligibility check (TRAIN/EQP/MDEV/LOT) cached for 4h after last verification
  - if cache stale > 4h offline: block step start, allow read-only access until reconnect
```

---

## 7. 8 OT runbooks

```text
RB-OT-001 Edge gateway lost connectivity (24h budget; what to do)
RB-OT-002 PLC firmware update breaks tag schema
RB-OT-003 Vision system camera failure / low-confidence rate spike
RB-OT-004 OPC UA server certificate expired (30d ahead alert)
RB-OT-005 Time-series DB ingestion lag > 5min
RB-OT-006 OEE collapse to 0 (sensor failure looks like 100% downtime)
RB-OT-007 Calibration database drift / clock skew
RB-OT-008 SPC false-alarm storm (rule tuning issue)
```

Each lives at `docs/ot-runbooks/RB-OT-NNN.md`.

---

## 8. Work packages

```yaml
WP-V8-MES-1: Edge gateway prototype (single appliance image)              (3 wk)
WP-V8-MES-2: OT zone map + conduit policy enforcement                      (1.5 wk)
WP-V8-MES-3: OT write path 6-prerequisite enforcer                         (2 wk)
WP-V8-MES-4: PackML state machine + OEE event ingestion                    (1.5 wk)
WP-V8-MES-5: Connected worker PWA offline + sync                           (2 wk)
WP-V8-MES-6: SPC engine (Western Electric rules + Cp/Cpk)                  (2 wk)
WP-V8-MES-7: Calibration management with traceability chain                (1 wk)
WP-V8-MES-8: 8 OT runbooks authored + reviewed                             (1 wk)
total: ~14 wk (W6 + parallel substreams)
```

---

## 9. Decision phrase

```text
V8_MES_OT_REFERENCE_ARCHITECTURE_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-MES-1..8
NEXT_FILE: 16_V8_EQMS_REGULATORY_VALIDATION_FACTORY.md
```
