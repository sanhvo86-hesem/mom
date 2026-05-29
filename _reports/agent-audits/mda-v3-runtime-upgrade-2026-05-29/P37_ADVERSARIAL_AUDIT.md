# P37 Adversarial Audit

## Verdict

P37 repairs the immediate absence of executable cutover gate logic, but it is not a live cutover. The correct decision is `P37_PASS_WITH_CONTROLLED_GAPS`: the schema, service and tests prove the control-tower pattern, while live PostgreSQL rehearsal, persistence handlers, UI dashboard and real restore drill remain blockers for any runtime-readiness claim.

## 9-Role Review

| Role | Finding | Severity | Repair in P37 | Residual risk |
| --- | --- | --- | --- | --- |
| Source authority lead | Generated table registry is stale for migration 241. | P1 | Governed registry and denylist updated; table registry regen listed as gap. | Registry views may omit P37 tables until regenerated. |
| Runtime bypass reviewer | Generic CRUD could otherwise edit cutover evidence. | P0 | New P37 tables added to `GenericCrudController` governed hard stop. | Internal override remains allowed only for documented backfill path. |
| SRE cutover reviewer | PG primary fallback must be visible and blocking. | P0 | `evaluateFallbackRead()` emits deterministic open incident with hash. | No live alert sink yet. |
| Data governance reviewer | Drift report must block PG-only on counts, missing rows, mismatches and drift statuses. | P0 | `evaluateDriftReport()` blocks on count mismatch, missing/mismatch arrays and status signals. | Full drift tool coverage remains incomplete. |
| Backup/restore reviewer | Restore drill mismatch must block cutover. | P0 | `evaluateRestoreDrill()` blocks missing or mismatched checksums/counts. | Real restore drill has not run in this local JSON_ONLY environment. |
| Operator safety reviewer | Operators need a human-readable drift pack. | P1 | Markdown drift export with deterministic hash added. | Dashboard and evidence storage path pending P38/P39. |
| Quality containment reviewer | Quality holds and engineering packages can be lost if cutover skips collections. | P0 | Collection crosswalk includes required governed MDA/order/MES collections and row-count blockers. | Crosswalk remains minimum set; full quality/supplier/finance expansion still required. |
| Security/SoD reviewer | Cutover wave approval must not be a direct CRUD mutation. | P1 | Wave-gate tables are governed and blocked from Generic CRUD. | E-sign/approval policy for accepting a wave is not wired to a command handler yet. |
| Auditor defensibility reviewer | Claims must distinguish side-effect-free proof from persisted runtime evidence. | P0 | Reports mark service as evaluator only and keep runtime claim disallowed. | Final audit must rerun with actual persisted rows and checksums. |

## Repair Pass Applied

- Fixed collection probe key logic so `record_key_field` prevents a false `unkeyed_collection` block.
- Strengthened drift evaluation to block count mismatch and status-only drift signals, not only populated missing arrays.
- Added Generic CRUD hard stop coverage for every P37 evidence table.
- Updated runtime proof and maturity matrices so ROOT-INT no longer waits on undefined P37 telemetry.

## Re-Audit

No P0 unsafe bypass remains in the implemented P37 slice. Remaining P0/P1 issues are outside the safe local slice because they require live database runtime, command handler persistence, registry regeneration or UI/dashboard work.
