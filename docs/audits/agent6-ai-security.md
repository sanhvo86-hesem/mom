# Agent 6 - AI / Analytics / Security / Reliability / DevEx

Branch audited: `codex/worldclass-reaudit-20260414-122702`

## 2026-04-14 Current-Pass Addendum

- Confirmed P1 AI least-privilege gap: legacy prediction/SPC/tool-wear/dashboard reads only required authentication. Remediation adds AI read-role gates.
- Confirmed P2 AI feedback mutation gap: prediction feedback could influence advisory confidence with read-only access. Remediation introduces feedback roles and requires them for feedback submission.
- Confirmed P2 dashboard scoping gap: combined AI schedule metrics counted all plants. Remediation scopes DB and JSON fallback schedule metrics by plant where plant context exists.
- Deferred: generic NLQ plant scoping remains blocked by relation-specific scope-column mapping.

## Findings

- P1: AI model list and AI dashboard were auth-only despite exposing advisory model/projection state.
- P2: AI dashboard mean time to action blended scopes across plants.
- P2: NLQ rate limiting remains session-local.
- P3: Tests missed AI read-surface authorization.

## Disposition

Fixed now: AI model list/dashboard require AI read access, model internals are admin-only, MTTA uses plant scope, and regression tests cover those surfaces. Deferred: shared persistent NLQ rate limiting.
