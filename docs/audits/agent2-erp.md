# Agent 2 - ERP / Planning / Lifecycle Governance

Branch audited: `codex/worldclass-reaudit-20260414-203827`

## 2026-04-14 Current-Pass Addendum

- Confirmed P1 planning lifecycle gap: work orders could be created under terminal parent job orders. Remediation in this pass blocks WO creation unless the parent JO is `planned`, `released`, or `active`.
- Confirmed P1 hold history gap: order holds were only represented as a mutable sidecar snapshot. Remediation adds an append-only `orders/hold_events.json` compatibility event journal for hold set/release while preserving the existing hold snapshot.
- Confirmed P2 planning data-quality gap: JO quantity and date inputs, plus WO operation/setup/run estimates, needed stricter validation. Remediation in this pass adds positive/non-negative and date-format checks in the order API.
- Deferred: active-hold lifecycle policy remains blocked by the need for a hold-category matrix across SO/JO/WO transition types.

## Findings

- P1: SO/JO/WO runtime authority remains JSON-primary with PostgreSQL shadow writes. This remains staged by design.
- P1: JO/WO generic updates allowed broad top-level mutation before workflow field rules.
- P1: Holds remain sidecar JSON rather than full workflow state.
- P2: WO creation needed stronger schedule and plant/site/digital-thread context.

## Disposition

Fixed now: JO/WO updates use explicit allowlists, WO schedule window order is validated, and WO payloads preserve plant/site/setup/CNC version hooks. Deferred: DB-primary order authority and hold-as-workflow-state cutover.
