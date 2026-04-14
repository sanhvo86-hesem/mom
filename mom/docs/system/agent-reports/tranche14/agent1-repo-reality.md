# Agent 1 Report: Repo Reality Audit, Tranche 14

## Scope
I inspected the actual code, tests, generated artifacts, and existing world-class tranche docs in this worktree. I did not modify application code. The goal was to classify current truth, not to restate prior closure claims.

## Commands and searches run
- `git status --short --branch`
- `find mom/docs/system -maxdepth 2 -type f ...`
- `rg -n "class RuntimeAuthorityService|function probe\\(|endpointCount|relationCount|tableCount|workflowCount|verify_publication_truth|fallback=true|authority_partial|compatibility_only" mom/api mom/tests mom/data/registry mom/tools/registry`
- `nl -ba` on the inspected services, controllers, tests, and docs
- `python3 mom/tools/registry/verify_publication_truth.py`
- `composer test` from `mom/`

## Bottom line
The repo is materially stronger than a naive CRUD/MVC shell: the runtime authority service is explicit about mixed authority, observability is structured, and the publication-truth verifier passes. However, the platform is not globally closed. Core authority is still mixed, planning and traceability remain partial, and several tests still encode stale “3000+ endpoints / 250+ workflows” assumptions that no longer match the current 22-endpoint system contract.

## Findings

| Surface | Classification | Evidence | What this means now |
| --- | --- | --- | --- |
| Authority core | `PARTIAL` | `mom/api/services/RuntimeAuthorityService.php:37-110, 142-175`; `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php:29-66` | The service explicitly reports `mixed_authority=true` and `strict_authority_ready=false` when non-authoritative slices remain. This is honest, but not world-class closure. |
| Planning / execution core | `PARTIAL` | `mom/api/services/PlanningScenarioService.php:501-517`; `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php:101-114` | Planning is exposed as a probe/read model with blocker categories, not as a fully authoritative planning engine. Shadow-write cases still resolve as `authority_partial`. |
| Traceability / genealogy core | `PARTIAL` | `mom/api/services/TraceabilityGenealogyService.php:346-369` | The probe defaults to `authority_partial` and identifies itself as an `event_ledger_traceability_read_model`. Traceability exists, but the code does not claim full authoritative closure. |
| Trusted release / record core | `PARTIAL` | `mom/api/services/TrustedReleaseRecordService.php:320-333`; `mom/api/services/FileTrustedReleaseRecordRepository.php:90-104`; `mom/api/services/PostgresTrustedReleaseRecordRepository.php:72-104` | File-backed mode is explicitly `compatibility_only/json_fallback`. Postgres mode becomes authoritative only when the table exists. The gating and immutability logic are real, but fallback mode is not authoritative. |
| Connected governance / training / qualification core | `PARTIAL` | `mom/api/services/ConnectedGovernanceService.php:324-339`; `mom/api/services/WorkforceQualificationGateService.php:125-140` | Governance and qualification surfaces are present and guarded, but they still depend on repository probes and requirement availability. Qualification is authoritative only when requirements exist. |
| Route / control surface | `VERIFIED_COMPLETE` | `mom/api/routes/platform-routes.php:9-87`; `mom/api/routes/core-routes.php:9-140`; `mom/api/routes/eqms-control-plane-routes.php:9-42` | The control plane is not missing in the blind. Routes exist for platform, core, and EQMS surfaces, and the boot path preserves the legacy fallback structure. |
| Observability surfaces | `PARTIAL` | `mom/api/services/SliceObservability.php:7-220`; `mom/api/services/LogTransport.php:37-58, 134-219`; `mom/tests/Unit/Services/LogTransportHealthTest.php:25-55` | Trace context and OTel-compatible structured events are implemented. Transport health is honest about Loki being unverified until a successful push. Live collector proof was not exercised here, so this stays partial rather than fully proven. |
| Generated registry / system-contract artifacts | `VERIFIED_COMPLETE` for integrity, `TEST_DRIFT` for legacy size assumptions | `mom/data/registry/endpoint-catalog.json`; `mom/data/registry/system-contract-manifest.json`; `mom/data/registry/system-contract-runtime-projections.json`; `mom/tools/registry/verify_publication_truth.py` | Current publication truth is coherent: `verify_publication_truth.py` passes `244/244`, endpoint catalog count is `22`, and system-contract manifest/runtime projections show `tableCount=750`, `relationCount=0`, `workflowCount=0`, `endpointCount=22`. Any assertion that still expects `3000+` endpoints or `250+` workflows is stale. |
| Prior world-class docs already present | `DOC_DRIFT` / `UNPROVEN` as proof source | `mom/docs/system/world-class-swarm-closure-tranche13.md`; `mom/docs/system/unresolved-backlog-ledger-tranche13.md`; `mom/docs/system/branch-strategy-tranche13.md`; `mom/docs/system/backend-cleanup-execution-2026-04-10.md` | The tranche13 docs exist and some claims are consistent with the publication verifier, but they are not current proof of full closure. They cannot override the mixed-authority and stale-test evidence above. |

## Code-fixable backlog candidates
These are the clearest code/process fixes visible from the inspected slices.

- `mom/tests/Unit/Controllers/RegistryContractFallbackTest.php:57-59`
  - The endpoint-count assertion still expects `>= 3000`, but the current endpoint catalog is `22`.
- `mom/tests/Unit/Controllers/SchemaStudioRegistryFallbackTest.php:77-78`
  - The relation-count assertion still expects `>= 3000`, but the current system-contract summary reports `relationCount=0`.
- `mom/tests/backend_smoke.php:641-642, 741-742`
  - System-contract and schema-studio smoke assertions still encode `3000+` endpoint expectations that no longer match current artifacts.
- `mom/tests/data_schema_admin_smoke.php:255-257, 261`
  - Data-schema admin smoke still expects `3000+` endpoints and `250+` workflows; current publication truth shows `22` endpoints and `0` workflows in the system-contract summary.

## External / product blockers
- `mom/data/registry/registry-quality-report.json` currently reports `publishability_ready=false` and `releaseReadinessState=blocked-by-graphics-governance`. If intentional, this is a product-level blocker, not a code defect.
- Full PHPUnit execution was blocked in this helper worktree because the repo’s Composer test script points to `vendor/bin/phpunit` and `vendor/` is absent here. `composer test` failed immediately with `Could not open input file: vendor/bin/phpunit`.

## Recommended verification
1. Restore dependencies in `mom/` so the declared Composer test entry point can run.
2. Re-run `composer test`.
3. Re-run `python3 mom/tools/registry/verify_publication_truth.py`.
4. After stale count assertions are updated, run the affected targeted tests:
   - `mom/tests/Unit/Controllers/RegistryContractFallbackTest.php`
   - `mom/tests/Unit/Controllers/SchemaStudioRegistryFallbackTest.php`
   - `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php`
   - `mom/tests/Unit/Services/TrustedReleaseRecordServiceTest.php`
   - `mom/tests/Unit/Services/TraceabilityGenealogyServiceTest.php`
   - `mom/tests/Unit/Services/LogTransportHealthTest.php`

## Conclusion
Current state is honest but not closed. The runtime now admits mixed authority instead of pretending everything is authoritative, and publication-truth verification is green. The remaining gap is not a cosmetic doc problem; it is stale test drift plus real partiality in planning, traceability, trusted release fallback, and connected governance.
