# P34 Adversarial Audit

## Verdict

P34 is safe to pass with controlled gaps. It repairs the highest-risk design-only gap by adding physical readiness/event targets, a side-effect-free service gate, hard-stop denylist coverage, and executable service simulations. It does not yet prove live production authority because order/MES command handlers still do not persist the snapshot/event/audit/outbox chain in one PostgreSQL transaction.

## Nine-Role Review

| Role | Challenge | Finding | Repair |
|---|---|---|---|
| Source authority reviewer | Does P34 invent tables already covered elsewhere? | Existing `mes_operational_event_ledger` is broad digital-thread evidence; P34 needs command-time readiness/event spine. | New tables are additive and explicitly not a replacement for the canonical ledger. |
| Runtime bypass reviewer | Can Generic CRUD mutate readiness or event rows? | New tables and existing event execution tables needed explicit denylist coverage. | Added `resource_readiness_snapshot`, `mes_runtime_event_spine`, `job_event`, `machine_event`, `tool_usage`, and `production_completion` deny entries. |
| Operator safety reviewer | Can expired training still start work? | Before P34 no unified service gate existed. | `operator_training_expired` blocks start and is covered by test/smoke. |
| Maintenance reviewer | Can PM-overdue or calibration-expired machines run? | Runtime map said work could run on invalid machine/tool/gage. | `machine_pm_overdue` and `machine_calibration_expired` gates added; live repository wiring remains P35/P37. |
| Quality reviewer | Can held material be issued? | P33 holds existed but MES readiness did not consume them. | P34 calls `CanonicalQualityCaseAuthorityService::evaluateHoldGate()` and blocks `material_lot_on_hold`. |
| Engineering reviewer | Can wrong NC program run? | P30 had engineering checksum logic but start gate did not consume it. | P34 blocks mismatched expected/controller SHA-256. |
| Inventory/finance reviewer | Does P34 post inventory? | It must not post ledger entries before P36. | Service returns a block/allow decision only; inventory ledger authority remains P36. |
| Security/SoD reviewer | Does P34 bypass P31/P32? | Service is side-effect free and not an approval/e-sign path. | Live command integration must still use P31 envelope and P32 evidence for regulated overrides. |
| Auditor/SRE reviewer | Is this runtime-complete? | No, runtime audit remains JSON_ONLY and PHPUnit vendor is missing. | Decision is `PASS_WITH_CONTROLLED_GAPS`, not runtime-ready. |

## Critical Repair Pass

- Added missing Generic CRUD hard-stop entries before final token.
- Added `ROOT-MES-001` to the runtime proof matrix because MDA-MES-RUNTIME existed in governed registry but was not scored as its own root.
- Added direct smoke execution for all five mandatory scenarios because local PHPUnit dependencies are unavailable.

## Residual Risk

The highest residual risk is integration drift: callers can still bypass P34 until `ReleaseWorkOrder`, `StartJob`, `IssueMaterial`, and `RecordIpqcResult` are converted to command handlers that persist the snapshot/event rows and fail closed on P34 blockers.
