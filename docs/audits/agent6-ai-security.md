# Agent 6 - AI / Analytics / Security / Reliability / DevEx

Branch audited: `codex/worldclass-reaudit-20260414-102059`

## Findings

- P1: AI model list and AI dashboard were auth-only despite exposing advisory model/projection state.
- P2: AI dashboard mean time to action blended scopes across plants.
- P2: NLQ rate limiting remains session-local.
- P3: Tests missed AI read-surface authorization.

## Disposition

Fixed now: AI model list/dashboard require AI read access, model internals are admin-only, MTTA uses plant scope, and regression tests cover those surfaces. Deferred: shared persistent NLQ rate limiting.
