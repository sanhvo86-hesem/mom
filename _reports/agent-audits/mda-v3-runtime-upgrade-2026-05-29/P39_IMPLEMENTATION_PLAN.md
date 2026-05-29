# P39 Implementation Plan

## Implemented Safe Vertical Slice

1. Add additive PostgreSQL anchors in `mom/database/migrations/242_mda_security_boundary_authority.sql`.
2. Add `MdaRuntimeSecurityBoundaryService` as a side-effect-free evaluator. It returns allow/deny/refuse/stepup/redact decisions with deterministic evidence hashes and does not mutate governed data.
3. Add PHPUnit coverage for BOLA, AI governed action refusal, privileged re-auth, expired SoD exception, unapproved OT signal tag map and field redaction.
4. Register `MDA-SECURITY-BOUNDARY` in governed entity JSON/YAML contracts.
5. Add all P39 security tables to `GenericCrudController` governed mutation hard-stop.
6. Update proof matrix, maturity scorecard, denylist matrix and blocker register.

## Files Intentionally Not Changed

- `DomainCommandGatewayService.php`: not wired yet because prompt scope is the smallest safe vertical slice; gateway middleware needs a separate integration pass with route compatibility tests.
- `AuthorizationKernel.php`: left intact to avoid changing legacy auth behavior without a focused regression suite.
- Frontend/operator dashboards: left as controlled gap because P39 prompt is security runtime boundary and no live dashboard route is ready.
- UOM authority files: intentionally untouched per multi-agent isolation instruction.

## Next Runtime Integration

P40 must wire the evaluator into governed command execution before mutation, persist `mda_security_boundary_decision` and `mda_ai_action_firewall_event`, and expose security/OT denials to runtime telemetry. Until then P39 is gate-proven but not runtime-complete.
