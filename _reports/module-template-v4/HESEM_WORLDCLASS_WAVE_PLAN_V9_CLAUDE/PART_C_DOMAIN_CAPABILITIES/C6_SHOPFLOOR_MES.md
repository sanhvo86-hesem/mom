# C6 — Shopfloor / MES Execution

```
domain_code:    D-06
domain_name:    Shopfloor / MES Execution
owner_role:     Production Lead (with Quality Lead for SPC, OT Security for edge gateway)
primary_state_machine: SM-10 Job and Work Order machine; SM-8 Equipment machine for OEE
```

---

## 1. Purpose

The Shopfloor / MES Execution domain is where digital meets physical.
This domain owns the actual making of things: the dispatching of work
to operators, the execution of operations, the recording of what
actually happened, the integration with PLCs and SCADA for telemetry
and (controlled) command.

This domain is the highest-volume and most time-sensitive in HESEM.
Telemetry can arrive at thousands of events per second per plant.
Operations execute every minute. SPC samples flow continuously.

---

## 2. The roots within this domain

```
Job Order (JO)                    The per-product per-quantity work to be
                                   done; typically generated from MRP or
                                   manually by the master scheduler.

Work Order (WO)                    A step within a Job Order, typically per
                                   operation. Where Job Order is "make 1000
                                   of part X," Work Order is "perform op 20
                                   on 50 units now."

Operation Execution (OPER)        The actual record of an operator
                                   performing an operation: who, when,
                                   on which equipment, with what materials,
                                   what output produced.

Work Instruction                   The version-controlled procedure the
                                   operator follows. Linked to item
                                   revision and routing.

Electronic Batch Record (EBR)     Pharma-specific; the step-by-step
                                   capture of regulated batch production
                                   per 21 CFR Part 211. Vertical pack.

Electronic Device History         Med device-specific; the per-unit record
   Record (EDHR)                   per 21 CFR Part 820. Vertical pack.

OEE Event                          The equipment state events (PackML
                                   states: STOPPED, IDLE, EXECUTE,
                                   COMPLETE, HOLDING, ABORTED, etc.) that
                                   drive Overall Equipment Effectiveness.

Andon Signal                      The floor's call for help (operator
                                   pulls cord, supervisor responds).

Statistical Process Control       The in-process measurement of critical
   (SPC) Sample                    characteristics, with control charts
                                   driving alarms.
```

---

## 3. The capabilities within this domain

### CAP-C6-01 — Job Order Lifecycle

**Purpose.** Generate, release, track, and close Job Orders.

**Lifecycle (per state machine SM-10).** Planned → released → in-
production → completed (or cancelled).

**Wave target.** L4 by W5; L5 by W5.

### CAP-C6-02 — Work Order Lifecycle

**Purpose.** Decompose Job Orders into per-operation Work Orders;
dispatch to specific equipment / operators; track through completion.

**Lifecycle.** Planned → dispatched → in-progress → completed (or paused).

**Wave target.** L4 by W5; L5 by W5.

### CAP-C6-03 — Operation Execution Recording

**Purpose.** Record what actually happened during operation execution:
operator identity, start time, end time, equipment used, materials
consumed (specific lots), output produced (specific lots / serials),
defects observed, time variance vs standard.

**Lifecycle.** OPER record begins at operation start (operator scans
work order), continues through operation, closes at completion.

**Wave target.** L4 by W6; L5 by W6.

**Acceptance evidence.** OPER record traceable to specific lots, specific
serials, specific equipment, specific operator. Time variance recorded.
Defect counts captured.

### CAP-C6-04 — Connected Worker (Operator UI / PWA)

**Purpose.** Provide the shopfloor operator with a mobile-first or
terminal-based UI to view their work, follow the instruction, complete
steps, capture defects, request help.

**Lifecycle.** Operator logs in, sees their work for the shift, executes
operations one at a time, signs off.

**Eligibility checks.** Before dispatch, the system verifies:
- Operator is trained on this operation (CAP-C10-04 training compliance)
- Equipment is available and not in maintenance lock
- Materials are available and not in quarantine
- Work instruction version is current

**Offline tolerance.** PWA works offline up to 4 hours; operations
queue locally; sync on reconnect.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C6-05 — Work Instruction Rendering

**Purpose.** Render the version-controlled work instruction to operators
with rich content (text, image, video, embedded checks).

**Lifecycle.** Work instruction authored in document control (D-07);
rendered here per item revision and routing.

**Wave target.** L4 by W3; L5 by W6.

### CAP-C6-06 — Electronic Batch Record (Pharma)

**Purpose.** Capture step-by-step batch execution per ISA-88 procedure
model and 21 CFR Part 211. Each step has parameter values, signatures,
deviations.

**Lifecycle.** EBR initiated at batch start, captures every phase,
closes at batch completion. Reviewed by batch reviewer. Signed by QP
(EU) or QA Director (US).

**Wave target.** L0 currently; L7 by W10 (Pharma vertical pack).

### CAP-C6-07 — Electronic Device History Record (Med Device)

**Purpose.** Per-unit device history record per 21 CFR Part 820.180.

**Lifecycle.** DHR built up during production execution per unit. Sealed
at unit completion.

**Wave target.** L0 currently; L7 by W10 (Med Device vertical pack).

### CAP-C6-08 — OEE Calculation and Andon

**Purpose.** Compute Overall Equipment Effectiveness (Availability ×
Performance × Quality) from equipment state events. Trigger Andon when
thresholds breached or downtime exceeds N seconds.

**Lifecycle.** OEE computed continuously from PackML state events.
Andon triggered automatically; supervisor responds; resolved or
escalated.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C6-09 — Statistical Process Control

**Purpose.** Capture in-process measurements; render control charts;
detect out-of-control conditions per Western Electric / Nelson rules
(8 standard rules); alarm on violations.

**Lifecycle.** SPC samples captured per plan; control limits computed
or referenced; violations alarmed.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C6-10 — Edge Gateway Telemetry Ingestion

**Purpose.** Ingest telemetry from PLCs, sensors, robots, vision
systems via the Edge Gateway (described in PART_B8). Translate to
internal events; pre-aggregate to 1-second buckets; feed OEE, SPC, and
audit chain.

**Lifecycle.** Continuous; the Edge Gateway runs as a separate process
near the OT zone.

**Wave target.** L4 by W6; L5 by W6.

---

## 4. Workflows

Primary in: D3 Plan to Produce, D9 Maintain to Restore (when equipment
maintenance pauses production).

Participant in: D1 Order to Cash, D5 Inspect to Disposition (when
in-process inspection raises issues), D8 Train to Qualify (training
required before dispatch), D10 Batch to Release (in pharma).

---

## 5. APIs

```
- Job Order API
- Work Order API
- Operation Execution API (mostly write-heavy, with read for queries)
- Work Instruction API
- EBR API (pharma)
- EDHR API (med device)
- OEE Event API (high-volume; from edge gateway)
- Andon API
- SPC API
- Edge Gateway envelope (mTLS, signed events)
```

---

## 6. Frontend surfaces

```
- Connected Worker PWA (operator-facing)
- Work Order Workspace + Record Shell (supervisor)
- Operation Execution Workspace (history view)
- Work Instruction Viewer (operator)
- EBR / EDHR Record Shell (regulated)
- OEE Dashboard (per equipment)
- Andon Tower (visual board)
- SPC Chart Workspace (per item × characteristic)
```

---

## 7. Cross-cutting concerns most relevant

- C1 Audit chain on every operation execution
- C2 E-signature on regulated EBR / EDHR steps
- C8 Observability per operation execution (high volume)
- C9 Performance budget on OEE event ingestion (real-time)
- C10 Retention: EBR / EDHR retained per regulatory class
- C12 Accessibility for shopfloor UI (often used in noisy / gloved
  environments; needs large touch targets)

---

## 8. Wave assignments

```
Job Order             L4 W5; L5 W5
Work Order            L4 W5; L5 W5
Operation Execution   L4 W6; L5 W6
Connected Worker PWA  L4 W6; L5 W6
Work Instruction      L4 W3; L5 W6
EBR                   L7 W10 (pharma pack)
EDHR                  L7 W10 (med device pack)
OEE / Andon           L4 W6; L5 W6
SPC                   L4 W6; L5 W6
Edge Gateway          L4 W6; L5 W6
```

---

## 9. Standards

```
- ISA-95 Levels 3-2 (MES / control boundary)
- ISA-88 (batch control; pharma)
- ANSI/ISA-TR88.00.02 (PackML)
- 21 CFR Part 211 §211.188 (EBR; pharma)
- 21 CFR Part 820 §820.184 (DHR; med device)
- IEC 62443 (OT cybersecurity for edge)
- AIAG SPC 2nd Edition (Western Electric / Nelson rules)
- ISO 22400 (KPIs for MES; OEE)
- OPC UA companion specs (PackML, Robotics, Vision, etc.)
```

---

## 10. Boundary with adjacent domains

- D-02 Engineering: Routing drives operations; work instruction per
  routing.
- D-03 Planning: Job Order from MRP; Schedule from finite-capacity
  scheduling.
- D-05 Inventory: Operation consumption and production transactions.
- D-07 Quality: SPC violations raise NCs; in-process inspection.
- D-09 Maintenance: Equipment availability; calibration eligibility.
- D-10 Workforce: Operator eligibility per training.
- D-13 Analytics: OEE feeds analytics; SPC feeds analytics.

---

## 11. Decision phrase

```
C6_SHOPFLOOR_MES_BASELINE_LOCKED
NEXT: C7_QUALITY_IMPROVEMENT.md
```
