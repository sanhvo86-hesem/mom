# MDA Observability Control Tower

Decision scope: pre-production runtime-closure candidate.

## Signals

- `mda.command.latency`
- `mda.command.denied.count`
- `mda.security.actor_spoof.denied`
- `mda.security.role_spoof.denied`
- `mda.security.sod.denied`
- `mda.security.reauth.denied`
- `mda.db_direct_write.denied`
- `mda.idempotency.replay.count`
- `mda.outbox.lag.seconds`
- `mda.fallback_read.count`
- `mda.drift.count`
- `mda.quality_hold.block.count`
- `mda.readiness.block.count`
- `mda.trace_export.incomplete.count`

## Runtime Sources

Command outcomes are recorded through `MdaRuntimeTelemetryService`. Security denials write `audit_events` with `domain_command.security_denied`. DB direct-write denials write `generic_crud_denial_event`. Runtime gates emit JSON and Markdown reports under `_reports/mda_runtime_authority_closure/`.
