# PASS 1 AGENT 1 - Repo Reality Audit

Worktree: `/Users/a10/Documents/mom-tranche12-a1`

Branch: `codex/tranche12-a1-repo-reality`

Scope: repo reality only. No code fixes were made.

## Evidence Commands

- `find mom -path '*/data/registry/*' -type f | sort`
- `find mom/data -type f | rg 'qualification|trusted-release-records|manufacturing-events|connected-governance'`
- `jq '.summary' mom/contracts/authority-report.json`
- `sed -n '1,260p' mom/database/schema-authority-summary.md`
- `sed -n '1,260p' mom/database/schema-authority-summary.json`
- `sed -n '1,220p' mom/contracts/README.md`
- `sed -n '1,220p' mom/api/services/RuntimeAuthorityService.php`
- `sed -n '1,220p' mom/api/services/ManufacturingEventBackboneService.php`
- `sed -n '1,220p' mom/api/services/TraceabilityGenealogyService.php`
- `sed -n '1,260p' mom/api/services/TrustedReleaseRecordService.php`
- `sed -n '1,260p' mom/api/services/ConnectedGovernanceService.php`
- `sed -n '1,260p' mom/api/services/WorkforceQualificationGateService.php`
- `sed -n '1,260p' mom/api/routes/*.php`
- `sed -n '1,260p' mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php`
- `sed -n '1,260p' mom/tests/Unit/Services/TrustedReleaseRecordServiceTest.php`
- `sed -n '1,260p' mom/tests/Unit/Services/ConnectedGovernanceServiceTest.php`
- `sed -n '1,260p' mom/tests/Unit/Services/ManufacturingEventBackboneServiceTest.php`
- `sed -n '1,260p' mom/tests/Unit/Services/WorkforceQualificationGateServiceTest.php`

## Bottom Line

The repo has real schema authority, a real authored business-contract bundle, and real service-level implementations for planning, execution, traceability, release records, connected governance, and observability.

The false part is the claim that all of that is already reflected in checked-in runtime registry artifacts. The `mom/data/registry` mirror does not exist in this worktree, and several current probes still classify slices as `compatibility_only` or `authority_partial`.

## Surface Classification

| Surface | Status | Evidence | Reality Check |
| --- | --- | --- | --- |
| Authority core | `VERIFIED_COMPLETE` for schema/contract authority, `PARTIAL` for runtime mirror | `mom/database/schema-authority-summary.json`, `mom/contracts/authority-report.json`, `mom/contracts/README.md`, `find mom -path '*/data/registry/*' -type f` | The migrations -> `schema.sql` authority chain is explicit and the authored business-contract bundle is fully covered (`67/67`). The documented runtime registry mirror is missing from the worktree. |
| Planning / execution core | `PARTIAL` | `mom/api/services/OrderService.php`, `mom/api/services/SchedulingService.php`, `mom/tests/order_runtime_governance_smoke.php`, `mom/tests/Unit/Services/PlanningScenarioServiceTest.php` | Real order and planning behavior exists, but the live order runtime is still file-backed/shadow-written and scheduling still dual-writes to JSON plus DB. |
| Traceability / genealogy core | `PARTIAL` | `mom/api/services/ManufacturingEventBackboneService.php`, `mom/api/services/FileManufacturingEventRepository.php`, `mom/api/services/PostgresManufacturingEventRepository.php`, `mom/api/services/TraceabilityGenealogyService.php`, `mom/tests/Unit/Services/ManufacturingEventBackboneServiceTest.php`, `mom/tests/Unit/Services/ProductionHistoryReadModelServiceTest.php` | Append-only lineage, replay, hash chaining, and bounded trace traversal are implemented. The default repository can still fall back to JSON, and the file probe reports `compatibility_only` with `table_available=false`. |
| Trusted release / record core | `PARTIAL` | `mom/api/services/TrustedReleaseRecordService.php`, `mom/api/services/FileTrustedReleaseRecordRepository.php`, `mom/tests/Unit/Services/TrustedReleaseRecordServiceTest.php`, `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php` | Packet assembly, blocker calculation, and immutability exist, but the file repository probe is `compatibility_only` / `fallback_only=true` / `table_available=false` unless a live Postgres authority table is present. |
| Connected governance / training / qualification core | `PARTIAL` | `mom/api/services/ConnectedGovernanceService.php`, `mom/api/controllers/ConnectedGovernanceController.php`, `mom/api/services/WorkforceQualificationGateService.php`, `mom/tests/Unit/Services/ConnectedGovernanceServiceTest.php`, `mom/tests/Unit/Services/WorkforceQualificationGateServiceTest.php` | Revision release and qualification gating are real. The repo probe still reports `json_fallback` / `authority_partial` for connected governance when authoritative ledgers are not loaded, so this is not complete closure. |
| Route / control surface | `PARTIAL` | `mom/api/index.php`, `mom/api/routes/rest-routes.php`, `mom/api/routes/platform-routes.php`, `mom/api/routes/operations-routes.php`, `mom/api/routes/eqms-control-plane-routes.php`, `mom/api/routes/generic-runtime-routes.php`, `mom/tests/backend_smoke.php`, `mom/tests/http_blackbox_suite.php` | Route registration is broad and tested, but the surface still mixes canonical routes, compatibility aliases, and legacy fallback behavior. |
| Observability surfaces | `PARTIAL` | `mom/api/services/SliceObservability.php`, `mom/ops/local-runtime/docker-compose.yml`, `mom/ops/local-runtime/otel-collector-config.yaml`, `mom/tests/runtime_assurance_suite.php` | Slice observability exists with trace/correlation IDs and structured JSONL/error-log emission. It is honest but bespoke; the repo does not carry an OpenTelemetry SDK path in Composer, so this is proof-grade but not full OTEL-native instrumentation. |
| Tests | `PARTIAL` / `TEST_DRIFT` | `mom/tests/backend_smoke.php`, `mom/tests/foundation_governance_contract_smoke.php`, `mom/tests/data_schema_admin_smoke.php`, `mom/tests/runtime_assurance_suite.php`, `mom/tests/enterprise_registry_authority_smoke.php`, `mom/tests/Unit/Services/*` | Coverage is broad and useful, but some tests assert aspirational thresholds from docs rather than independently proving them from checked-in runtime artifacts. |
| Generated registry / system-contract artifacts | `PARTIAL` / `MISSING` | `mom/contracts/*.json`, `mom/database/schema-authority-summary.*`, `find mom -path '*/data/registry/*' -type f` | The authored contract bundle is real. The `mom/data/registry/*.json` mirror referenced by docs and tests is not present in this worktree, so any claim that depends on that mirror is currently unproven in-tree. |

## False Landing Claims

1. `mom/docs/backend-process-coverage-reaudit-2026-04-10.md` says backend coverage is complete and that no blocking gaps remain. That is too strong for this repo state. Current runtime probes and tests still classify slices as `compatibility_only` or `authority_partial`, and the checked-in runtime registry mirror is absent.

2. `mom/docs/schema-authority-model.md` and `mom/contracts/README.md` describe generated runtime registry artifacts under `data/registry/*.json`. In this worktree, `find mom -path '*/data/registry/*' -type f` returns no files, so those claims are not backed by checked-in artifacts here.

3. `mom/tests/data_schema_admin_smoke.php` and `mom/tests/enterprise_registry_authority_smoke.php` encode high-end coverage thresholds such as thousands of endpoints and zero critical gaps. Those are smoke assertions, not independent proof in this pass, and they should be treated as TEST_DRIFT until the referenced artifacts are present and checked directly.

## What Is Actually Stronger Now

- The schema authority chain is explicit in `mom/database/schema-authority-summary.*`.
- The authored business-contract corpus is fully covered at 67/67 in `mom/contracts/authority-report.json`.
- The service layer proves real append-only event handling, genealogy tracing, release blocking, and qualification gating.
- The repo has honest probes for `compatibility_only`, `authority_partial`, and `json_fallback` states instead of pretending everything is native-authoritative.

## What Remains Unproven In-Tree

- The checked-in `mom/data/registry` runtime mirror.
- Any claim that a slice is fully native-authoritative when its probe still reports `compatibility_only` or `authority_partial`.
- Any doc or smoke-test number that is only backed by a prior generated report, not by the current files in this worktree.
