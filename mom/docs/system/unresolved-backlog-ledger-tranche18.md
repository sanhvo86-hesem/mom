# Tranche 18 Unresolved Backlog Ledger

Date: 2026-04-15

## Inherited Backlog

| Source | Original expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action in this run |
| --- | --- | --- | --- | --- | --- | --- |
| User screenshots / tranche15-16 DB/frontend publishability | Runtime DB and frontend registry agree; no missing schema/publication blockers | ALREADY_FIXED | `verify_schema_authority.py` PASS 9/9; `verify_publication_truth.py` PASS 271/271; migration chain 001-133 | Not open | No | Refresh stale docs to current counts |
| User File Explorer admin tab issue | File Explorer behaves as a normal admin tab and users can return to peer tabs | ALREADY_FIXED | `vps_control_tower_smoke.php` retained; Agent 6 found no regression | Not open | No | Keep smoke in validation |
| Tranche16 e-signature trust linkage | E-signature challenge records are linked and orphan-checked | ALREADY_FIXED | Migration 132 and related tests | Not open | No | No code action |
| Tranche16 change authority after release | Released/retained/legal-hold fields require exact authority | ALREADY_FIXED | `ChangeAuthorityServiceTest` | Not open | No | No code action |
| Tranche16 rate-limit fallback | Fallback must fail closed | ALREADY_FIXED | `RateLimitMiddlewareTest` | Not open | No | No code action |
| Tranche16 cache/deploy write health | Runtime write failures surfaced in health/deploy checks | ALREADY_FIXED | `CacheServiceFallbackHealthTest`, `postdeploy_healthcheck.php` | Not open | No | No code action |
| Tranche16 broad genealogy leakage | Enterprise-only reads cannot bypass partition scope | ALREADY_FIXED | `TraceabilityGenealogyServiceTest` | Not open | No | No code action |

## Pass-1 Code-Fixable Findings

| Source | Expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action in this run |
| --- | --- | --- | --- | --- | --- | --- |
| Agent 4 | Planning scenario authority derives site/plant from session and rejects client scope | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `PlanningScenarioController`, `PlanningReleaseScopeAuthorityTest` | Controller previously passed raw body | Yes | Added session scope helper, request-scope rejection, partition requirement, regression tests |
| Agent 4 | Trusted release record scope validates site and plant | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `TrustedReleaseRecordController`, `PlanningReleaseScopeAuthorityTest` | Controller checked plant only | Yes | Added site+plant session scope injection and cross-site packet rejection |
| Agent 5 | Unauthenticated readiness does not leak log topology/path/failure internals | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `HealthController`, `HealthControllerRuntimeAuthorityTest` | Sanitizer only removed `error` | Yes | Redacted `loki_url`, `loki_verified_at`, `fallback_dir`, `last_failure_message` |
| Agent 5 | Audit/queue fallback write failures surface operational health | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `AuditMiddleware`, `QueueService`, new regression tests | Write failure could be silent | Yes | Added counters, timestamps, health degradation, and error logging |
| Agent 2 / Agent 1 | Compliance/readiness docs avoid false conformance or stale counts | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | benchmark/docs patches | Older docs had strong wording or stale 256/256 counts | Yes | Refreshed Part 11 wording and publication-truth counts |
| Pass-2 Agent 4 / Agent 6 | Planning read/write paths and trusted release readback must enforce partition scope uniformly | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `PlanningScenarioService`, `PlanningScenarioController`, `TrustedReleaseRecordController`, regression tests | Pass 1 fixed create/release edges but pass 2 found readback gaps | Yes | Added service-level planning partition checks and fail-closed trusted release packet/session checks |
| Pass-2 Agent 5 | Readiness cache/queue paths and queue encode/rewrite failures must not be hidden | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `HealthController`, `QueueService`, regression tests | Pass 1 fixed logging redaction and publish/dead-letter write failures only | Yes | Redacted `file_cache_dir`/`file_queue_dir`; added encode/rewrite/swap/truncate failure health |
| Deep merge-gate reaudit | Periodic evaluation schedule/close must derive org authority from authenticated session and reject caller scope | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `EqmsControlPlaneController`, `WorldClassControlPlaneExecutionTest` | Service required `org_id`; controller injection existed but did not reject caller-supplied scope | Yes | Added `rejectCallerScopeFields()` before session-derived `org_id` injection |
| Deep merge-gate reaudit | Generated registry/schema artifacts must match migration 135 and OpenAPI source | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `canonical_publication_orchestrator.py` PASS; `data_schema_admin_smoke.php` ok; `verify_schema_authority.py` PASS; `verify_publication_truth.py` PASS 271/271 | Migration 135 made schema newer than generated artifacts | Yes | Regenerated schema, registry, contracts, publication truth, and system-contract artifacts from source |
| Deep merge-gate reaudit | New `machine_raw_events` authority table must carry direct governance metadata | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | Migration 135, `MachineEventSpineService`, `data_schema_admin_smoke.php` ok | Data Schema flagged missing `payload_schema_version` and `row_version` as actionable governance gap | Yes | Added `payload_schema_version` and `row_version` to migration and service insert |
| Pass-3 Agent 2 | Broader benchmark docs must avoid unsupported Part 11/GxP completion wording | FIX_NOW -> CLOSED_BY_IMPLEMENTATION | `mom/docs/world-class-platform-benchmark-2025-2026.md` now says Part 11/EU Annex 11/GxP controls are scope-ready when implemented, validated, and governed for regulated records | Phrase previously overstated compliance posture | Yes | Corrected wording during post-merge pass 3 |
| Pass-3 Agents 1/4/6 | Scratch-branch release evidence churn and helper worktrees must not block final sign-off | FIX_NOW -> CLOSED_BY_FINAL_CLEANUP | `main` retained required tranche18 inventory; scratch branch `codex/worldclass-erp-mom-mes-eqms-closure-20260415-1516` is excluded from promotion | Cleanup remained open during pass-3 audit | Yes | Delete scratch/helper/integration branches and remove helper worktrees in final cleanup |

## Remaining External Blockers

| Item | Status | Evidence | Next owner path |
| --- | --- | --- | --- |
| Live OpenTelemetry collector/exporter correlation proof | BLOCKED_EXTERNAL | Repo has local observability surfaces but no deployed collector evidence | Deploy telemetry backend and capture trace/log/metric correlation proof |
| Full Part 11 validation package and WORM retention proof | BLOCKED_EXTERNAL | Repo has scoped technical controls, not validation/SOP/retention proof | Build validation package, identity controls, retention/WORM operating evidence |

## Product Decisions

| Item | Status | Evidence | Required decision |
| --- | --- | --- | --- |
| SAP/Siemens/ETQ/MasterControl full suite parity | PRODUCT_DECISION_REQUIRED | Repo implements targeted MOM/EQMS authority slices, not full vendor suites | Decide roadmap breadth for APS optimizer, supplier portal, EBR suite, enterprise data platform |
