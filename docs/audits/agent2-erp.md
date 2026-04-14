# Agent 2 - ERP / Planning / Lifecycle Governance

Branch audited: `codex/worldclass-reaudit-20260414-102059`

## Findings

- P1: SO/JO/WO runtime authority remains JSON-primary with PostgreSQL shadow writes. This remains staged by design.
- P1: JO/WO generic updates allowed broad top-level mutation before workflow field rules.
- P1: Holds remain sidecar JSON rather than full workflow state.
- P2: WO creation needed stronger schedule and plant/site/digital-thread context.

## Disposition

Fixed now: JO/WO updates use explicit allowlists, WO schedule window order is validated, and WO payloads preserve plant/site/setup/CNC version hooks. Deferred: DB-primary order authority and hold-as-workflow-state cutover.
