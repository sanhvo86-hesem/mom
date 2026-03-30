# MES World-Class Upgrade Backlog

Date: 2026-03-30
Owner: Codex implementation backlog

## Research Baseline

This backlog is aligned to the following official reference directions:

- ISA-95: manufacturing operations management and Level 3 integration
- MTConnect: governed machine data acquisition for CNC assets
- OPC UA for Machinery: interoperable equipment context and machine signals
- NIST SP 800-82 Rev. 3: OT cybersecurity and resilient industrial connectivity
- Microsoft production-control and quality-management guidance: order lifecycle, reporting, traceability, and governed execution

## Target State

The HESEM portal should evolve from a strong QMS + pilot MES runtime into a governed CNC MES where:

1. A work order cannot start or resume without all hard launch gates passing.
2. Machine state, NC release, operator qualification, tooling, material trace, and alarms converge into one execution truth.
3. PostgreSQL becomes a trusted operational read path, not just a shadow mirror.
4. Shift leaders can act from one operational cockpit without losing traceability.

## Upgrade List

### P0. Execution Truth and Hard Gates

- Harden server-side launch gates for connector freshness, NC release, download verification, tool readiness, operator qualification, material trace, alarm lockout, and shift handover.
- Keep every block event in a governed history so repeated operational hotspots are visible.

### P1. Alarm Governance

- Govern alarm acknowledgement, escalation SLA, and lockout release workflow.
- Link each active alarm to a playbook, response owner, acknowledgement state, and escalation state.
- Surface unacknowledged and overdue alarms in MES and Exception Dashboard.

### P2. Material Genealogy

- Record material issue, return, and consumption at WO/operation level.
- Link lot, heat, and traveler data to WO runtime and downstream genealogy.
- Detect genealogy gaps separately from generic material-trace gaps.

### P3. Shift and Handover Governance

- Define governed shift patterns.
- Require shift handover notes for active/risky machines during shift transitions.
- Detect missing handovers for running/setup/inspection WO.

### P4. Runtime Observability

- Continue PostgreSQL primary-read pilot with clear source/fallback observability.
- Promote safe runtime snapshots to PostgreSQL primary reads only after governance data is complete and audits stay green.

### P5. Machine Connectivity Progression

- Evolve from manual bridge and simulated feeds toward real MTConnect / OPC UA / DNC adapters.
- Track heartbeat, stale windows, replay protection, and ingest policy compliance per adapter.

## Implementation Sequence for This Cycle

### Cycle 1

- Alarm governance runtime
- Alarm acknowledgement and escalation workflow
- Alarm governance exceptions and cockpit visibility

### Cycle 2

- Material consumption and genealogy runtime
- Material genealogy snapshot and exception queue
- Shadow sync support for genealogy runtime

### Cycle 3

- Shift pattern config
- Shift handover runtime and queue
- Shift governance visibility in MES and exceptions

## Completion Criteria

- All new runtime actions lint and audit clean.
- MES and Evidence self-audits pass after every cycle.
- Git history stays clean and focused.
- New queues and KPIs are visible in both MES Control Center and Exception Dashboard.
