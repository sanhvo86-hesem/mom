# V4 Prompt Handoff - P49

Prompt: P49 - Domain Command Handler Factory and Gateway Wiring Closure  
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`  
Date: 2026-05-31  
Decision token: `P49_PASS_WITH_CONTROLLED_GAPS`

## Runtime Evidence

- `DomainCommandGateway` and registry created.
- `POST /api/v1/domain-commands` and registry endpoint added.
- OpenAPI operation `submitDomainCommand` added.
- Unknown command returns `unknown_command`.
- Registered but incomplete core command returns `command_handler_not_runtime_complete`.
- Idempotency replay returns stored payload without handler execution.

## Important Constraint

Do not flip `implemented` to true for any core command until its handler has real transaction/audit/evidence/outbox tests. Current true implementations are engineering package commands and `ReleaseWorkOrderCommand` through P48.

## Next Prompt

P50 must apply security/SoD/AI-firewall posture to the gateway and related route surfaces without weakening fail-closed behavior.

P49_PASS_WITH_CONTROLLED_GAPS
