# V4 Prompt Handoff - P56

Prompt: P56 - OpenAPI, Problem Details, Workflow/Arazzo, and Contract Test Closure
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Date: 2026-05-31
Decision token: `P56_PASS_WITH_CONTROLLED_GAPS_READY_FOR_P57`

## What Changed

- Updated `DomainCommandController` to return command failures as `application/problem+json`.
- Updated `ProblemDetailsFactory` with trace `instance` correlation.
- Extended `mom/api/openapi.yaml` with domain command schemas, command enum, object scope documentation, Problem Details responses, and examples.
- Added Problem Details catalog, API inventory, Arazzo-like workflow contracts, PHPUnit contract test, and standalone P56 contract probe.

## Runtime Proof

Probe output:

```json
{"route_openapi_gap_count":0,"openapi_route_gap_count":0,"missing_openapi_paths":[],"missing_route_paths":[],"missing_problem_refs":[],"missing_problem_categories":[],"workflow_command_count":14,"missing_workflow_commands":[],"problem_shape_ok":true,"controller_problem_content_type_ok":true,"security_scope_documented":true,"inventory_mutation_authority":"DomainCommandGateway"}
```

## Validation

- PHP lint passed for modified controller/service/test/probe.
- P56 contract probe passed.
- JSON registry files parse successfully.
- `git diff --check` passed.
- AI index regenerated: 252 migrations, 948 tables, 284 PHP classes.
- Composer test/analyse/check still require restored `vendor/bin/phpunit` and `vendor/bin/phpstan`.

## Next Prompt Constraint

P57 must use the stable Problem Details `code`/`type`, API inventory, and workflow contracts as telemetry inputs. Do not create parallel command routes or non-gateway mutation paths.

## Remaining Controlled Gaps

- OpenAPI semantic validation requires a validator dependency not present locally.
- Live HTTP/browser smoke remains pending P59 integration/deploy stage.

P56_PASS_WITH_CONTROLLED_GAPS_READY_FOR_P57
