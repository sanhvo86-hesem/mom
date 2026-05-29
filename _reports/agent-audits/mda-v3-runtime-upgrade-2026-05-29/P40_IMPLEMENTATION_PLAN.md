# P40 Implementation Plan

## Implemented Safe Vertical Slice

1. Add additive tables in `243_mda_frontend_projection_safety.sql`.
2. Add `MdaFrontendProjectionSafetyService` for `/ops/ar/...` authoritative record shells and `/ops/ws/...` projection-only workspaces.
3. Add controller action endpoints: `mda_frontend_projection_contract`, `mda_frontend_projection_evaluate`, `mda_record_shell`.
4. Add tests for workspace mutation block, audit/evidence shell, stale projection disabled action, offline candidate queue and unknown alias denial.
5. Add P40 tables to governed entity registry and Generic CRUD denylist.
6. Update proof matrix, maturity scorecard and blocker register.

## Files Intentionally Not Changed

- `mom/assets/app.js`: no broad UI rewrite was made because the safe vertical slice is the backend contract and testable safety evaluator.
- `mom/assets/js/sync-manager.js`: left unchanged because changing live offline sync semantics requires a dedicated command-stack reconciliation pass.
- Domain command handlers: record shell links point to the command endpoint, but P40 does not register business mutation handlers.
- UOM authority files: intentionally untouched for multi-agent isolation.

## Next Integration Work

P41/final remediation must wire browser components to these endpoints, persist action guard decisions, run Chrome smoke on deployed UI, and route offline candidates through governed command reconciliation before any authority commit.
