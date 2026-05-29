# MDA Machine Signal Trust Model

## Authority layers

1. `machine_raw_events` are append-only source captures. They preserve adapter identity, source timestamp, received timestamp, payload hash, and cannot directly mutate execution truth.
2. `production_derived_events` are normalized interpretations derived from raw events. They remain event truth, not current-state master truth.
3. `MachineStateProjection` and adapter health views are projections for dashboards and readiness prechecks. They can inform, but cannot silently override governed equipment lifecycle, maintenance, calibration, or release-package gates.
4. governed commands such as `StartJob`, `BlockMachine`, `ReleaseMachineFromMaintenance`, and release overrides must read:
   - equipment lifecycle authority
   - maintenance/calibration authority
   - approved signal tag map / adapter trust configuration
   - release-package controller/program compatibility

## Trust rules

- raw signal immutable, normalized event append-only, projection replaceable
- adapter replay must be idempotent by source node id + source timestamp + message identity
- stale heartbeat can degrade trust and block runtime starts when policy says connectivity is mandatory
- manual status updates cannot overrule alarm/down/lockout/calibration truth without governed override + e-sign
- approved signal-tag mapping is required before signal semantics can drive governed readiness gates
- source timestamp and received timestamp must both be stored; skew and delay are observability facts, not license to rewrite history

## Anti-patterns blocked

- projection writes changing asset lifecycle
- generic status API setting `idle` while machine has open critical downtime/alarm
- unapproved OPC/MTConnect tag remap changing count/state semantics in place
- UI heartbeat badge treated as sufficient readiness evidence
