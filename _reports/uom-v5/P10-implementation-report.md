# P10 Implementation Report

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED
Posture: development/prototype -> pre-production readiness candidate only.

## Scope

REPO_EVIDENCE: P10 scope was limited to controller, OpenAPI, event registry, and tests. No UI phase work, broad framework rewrite, or production mutation was introduced.

## File Inventory Before/After

Before:

- REPO_EVIDENCE: `mom/api/routes/uom-routes.php` had UoM routes.
- REPO_EVIDENCE: `mom/api/controllers/UomController.php` had UoM endpoint handlers and legacy problem detail helpers.
- REPO_EVIDENCE: `mom/api/openapi.yaml` had no `/api/v1/uom` route entries.
- REPO_EVIDENCE: `mom/data/registry/uom-event-contracts.json` was not tracked.
- REPO_EVIDENCE: no P10 API parity test existed.

After:

- REPO_EVIDENCE: `mom/api/openapi.yaml` documents all UoM v1 routes with OpenAPI 3.1.2 unchanged.
- REPO_EVIDENCE: `mom/api/controllers/UomController.php` forwards trace/idempotency/context fields and returns RFC 9457-style `code`, `trace_id`, `field_errors`, and `remediation`.
- REPO_EVIDENCE: `mom/data/registry/uom-event-contracts.json` defines versioned event payload contracts for rule, alias, MEASVAL, and policy events.
- REPO_EVIDENCE: `mom/tests/Unit/Uom/UomApiContractP10Test.php` locks route/spec parity, Problem Details fields, idempotency contract, no exposed approve/activate route, alias quarantine documentation, and event registry coverage.

## Diff Summary

- `mom/api/openapi.yaml`: added `UoM Measurement Intelligence` tag, all UoM route entries, preview-only conversion contract, alias quarantine schema hints, and `field_errors`/`remediation` fields in `ProblemDetail`.
- `mom/api/controllers/UomController.php`: added `Idempotency-Key` propagation, contextual field forwarding to conversion context, and problem-detail remediation fields.
- `mom/data/registry/uom-event-contracts.json`: added versioned event schema registry.
- `mom/tests/Unit/Uom/UomApiContractP10Test.php`: added static contract tests for P10 acceptance simulations.
- `.ai/*`: regenerated AI index after API contract changes.

## Acceptance Gates

- TEST_EVIDENCE: route/controller/OpenAPI parity is locked by a focused unit test.
- TEST_EVIDENCE: RFC 9457 fields are present in controller and OpenAPI schema.
- TEST_EVIDENCE: approval/activation write routes are not exposed under UoM API.
- TEST_EVIDENCE: alias ambiguity/quarantine contract is documented.
- TEST_EVIDENCE: required UoM event names exist with version `1`.
- CONTROLLED_GAP: full `composer check` remains red because of an unrelated KPI registry count assertion already seen in earlier phases.

## Residual Risk Ledger

- CONTROLLED_GAP: OpenAPI schema is intentionally broad for response bodies to avoid inventing authority beyond current controller payloads.
- CONTROLLED_GAP: Duplicate idempotency behavior is contract-visible but not backed by a new storage table in P10 because P10 does not introduce a governed mutation endpoint.
- CONTROLLED_GAP: OpenAPI 3.2.x evaluation remains backlog; current baseline is 3.1.2.
