# V4 API Contract Runtime Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Prompt: P56 - OpenAPI, Problem Details, Workflow/Arazzo, and Contract Test Closure
Posture: pre-production runtime-readiness evidence; not production-ready

## 1. Executive Decision

P56 closes the implemented HTTP contract gap for governed domain commands. The domain command route, registry route, signature challenge route, and signature manifestation route are documented in `mom/api/openapi.yaml`; command failures now emit real `application/problem+json` from `DomainCommandController` instead of hiding the problem inside the legacy error envelope.

## 2. Source Truth Audit

- Governed mutation route is `POST /api/v1/domain-commands`, wired in `mom/api/routes/rest-routes.php`.
- Mutation authority is still `DomainCommandGateway`; no new write route was introduced.
- `CommandRegistry` already declares `openapi_operation=submitDomainCommand` for governed commands.
- Existing `ProblemDetailsFactory` generated problem objects but the controller previously returned them nested inside legacy JSON.
- Existing OpenAPI already had the domain command routes, but P56 added security/scope detail, schemas, examples, and Problem Details response refs.

## 3. Runtime Evidence Probe

Manual probe:

```json
{
  "route_openapi_gap_count": 0,
  "openapi_route_gap_count": 0,
  "missing_openapi_paths": [],
  "missing_route_paths": [],
  "missing_problem_refs": [],
  "missing_problem_categories": [],
  "workflow_command_count": 14,
  "missing_workflow_commands": [],
  "problem_shape_ok": true,
  "controller_problem_content_type_ok": true,
  "security_scope_documented": true,
  "inventory_mutation_authority": "DomainCommandGateway"
}
```

## 4. Blocker / Gap Map

Closed:

- Governed HTTP command routes are documented in OpenAPI.
- Domain command errors emit RFC 9457-style Problem Details with machine-readable `code`.
- Required failure families are cataloged: validation, security denial, readiness, quality hold, idempotency, regulated evidence, authority mode, tooling, gage, runtime handler missing.
- Workflow contracts reference only commands present in `CommandRegistry`.
- Object/site/plant scope is documented in the command envelope schema.

Controlled:

- Full OpenAPI semantic validation is textual/local because no OpenAPI validator dependency is installed.
- Composer PHPUnit/PHPStan gates remain blocked by missing local vendor binaries.
- Browser/API live smoke remains deployment-stage work.

## 5. Design Delta

- `DomainCommandController` now returns command errors as `application/problem+json`.
- `ProblemDetailsFactory` now adds RFC instance correlation when a trace id is provided.
- `mom/api/openapi.yaml` now has command envelope/response/registry schemas and domain-command Problem Details responses.
- Added registry artifacts for Problem Details, API inventory, and Arazzo-like command workflows.
- Added `DomainCommandApiContractClosureTest` plus standalone P56 probe.

## 6. Implementation Plan

Implemented as one P56 unit after P55. P57 must consume the API inventory and problem codes for telemetry/control tower metrics rather than creating new command semantics.

## 7. Files To Edit

- `mom/api/controllers/DomainCommandController.php`
- `mom/api/services/DomainCommand/ProblemDetailsFactory.php`
- `mom/api/openapi.yaml`
- `mom/data/registry/mda-v4-problem-details-catalog.json`
- `mom/data/registry/mda-v4-api-inventory.json`
- `mom/data/registry/mda-v4-command-workflows.yaml`
- `mom/tests/Unit/Services/DomainCommandApiContractClosureTest.php`

## 8. Files Forbidden Or High-risk

- New route handlers that bypass `DomainCommandGateway`.
- Generic CRUD route behavior for governed mutations.
- Parallel UOM implementation branches.
- Any OpenAPI operation that claims a command route exists when no route is wired.

## 9. Code / Schema / Contract Changes

- `DomainCommandEnvelope` documents command enum, idempotency, actor roles, actor scope, and payload.
- `DomainCommandSubmitResponse` documents accepted/replayed command output.
- `DomainCommand*Problem` responses cover 400/403/404/409/501.
- `ProblemDetail` schema now documents the `details` extension member used by runtime gate evidence.
- Workflow YAML defines engineering package to WO start, receipt to IQC putaway, and OQC containment/release sequences.

## 10. Test Plan

- Lint controller/service/test/probe PHP.
- Run `/private/tmp/p56_contract_probe.php`.
- Validate JSON registry files.
- Run `git diff --check`.
- Run composer test/analyse/check; record vendor blocker if still missing.

## 11. Operational Simulation Matrix

| scenario_id | command/action | expected_gate | data_written | expected_result |
|---|---|---|---|---|
| V4-SIM-056-001 | route exists but OpenAPI missing | P56 contract probe route/OpenAPI comparison | none | fail contract gate |
| V4-SIM-056-002 | OpenAPI operation exists but route missing | P56 contract probe OpenAPI/route comparison | none | fail contract gate |
| V4-SIM-056-003 | readiness block returns legacy JSON | controller content-type probe | none | fail until `application/problem+json` |
| V4-SIM-056-004 | idempotency conflict lacks code | Problem Details catalog probe | none | fail missing machine-readable `code` |
| V4-SIM-056-005 | security scope omitted | OpenAPI scope probe | none | fail if `actor_scope/site_ids/plant_ids` absent |
| V4-SIM-056-006 | workflow references nonexistent command | workflow registry probe | none | fail contract gate |
| V4-SIM-056-007 | example request lacks schema | OpenAPI schema/test probe | none | fail contract test |
| V4-SIM-056-008 | legacy endpoint lacks policy | API inventory policy check | none | controlled deny/delegate policy required |

## 12. Multi-role Adversarial Audit

- API architect: PASS for route/OpenAPI parity and command schema publication.
- MES/MOM lead: PASS because all command workflows use `submitDomainCommand`.
- Quality/regulatory lead: PASS because e-sign/readiness/hold failures are Problem Details with machine-readable codes.
- Security lead: PASS for documented actor scope, object scope denial, CSRF/session auth, and gateway-only mutation.
- SRE lead: PARTIAL until P57 emits metrics by problem code and P59 runs browser/operator smoke.
- Developer experience lead: PARTIAL because full OpenAPI validator is not installed locally.

## 13. Rollback / Restore / Recovery Plan

- Revert this commit to restore legacy error envelope for domain command routes if a client compatibility emergency appears.
- Keep Problem Details catalog as an audit artifact during rollback so clients can be migrated intentionally.
- Do not roll back P48-P55 command handlers; P56 only changes HTTP contract and registry artifacts.

## 14. Telemetry / Control Tower Evidence

- Problem Details `code` and `type` are now stable dimensions for P57 telemetry.
- API inventory records `DomainCommandGateway` as mutation authority.
- Workflow contracts expose command sequences for P58 scenario execution.

## 15. Generated Artifacts

- `V4_API_CONTRACT_CLOSURE_REPORT.md`
- `V4_API_CONTRACT_PROOF_PACK.json`
- `V4_P56_GAP_LEDGER_UPDATE.csv`
- `V4_PROMPT_HANDOFF_P56.md`

## 16. Gap Ledger Update

See `V4_P56_GAP_LEDGER_UPDATE.csv`.

## 17. Decision Token

P56_PASS_WITH_CONTROLLED_GAPS_READY_FOR_P57

## 18. Handoff Packet For Next Prompt

P57 must count and surface Problem Details codes, outbox/audit/readiness events, fallback/drift, and scenario metrics without creating a second command authority.
