# Agent 6 - AI / Analytics / Security / Reliability / DevEx

Branch audited: `codex/worldclass-reaudit-20260414-203827`

## 2026-04-14 Current-Pass Addendum

- Confirmed P1 AI least-privilege gap: legacy prediction/SPC/tool-wear/dashboard reads only required authentication. Remediation adds AI read-role gates.
- Confirmed P1 AI fallback isolation gap: JSON prediction fallback admitted blank-plant rows for scoped users and conversation detail built fallback paths from query strings. Remediation removes blank-plant fallback leakage, validates conversation IDs, resolves fallback paths under the conversation directory, and requires fallback owner metadata.
- Confirmed P2 AI feedback mutation gap: prediction feedback could influence advisory confidence with read-only access. Remediation introduces feedback roles and requires them for feedback submission.
- Confirmed P2 dashboard scoping gap: combined AI schedule metrics counted all plants. Remediation scopes DB and JSON fallback schedule metrics by plant where plant context exists.
- Confirmed P2 schedule-write consistency gap: DB schedule slot creation/update did not use the fallback overlap rule. Remediation adds shared DB/JSON overlap guards.
- Confirmed P2 AI authority wording gap: `aiScheduleApply()` and `aiSchedulePm()` returned execution-sounding success fields. Remediation returns advisory-only review/proposal responses with `execution_authority=false`.
- Deferred: generic NLQ plant scoping remains blocked by relation-specific scope-column mapping.

## Findings

- P1: AI model list and AI dashboard were auth-only despite exposing advisory model/projection state.
- P2: AI dashboard mean time to action blended scopes across plants.
- P2: NLQ rate limiting remains session-local.
- P3: Tests missed AI read-surface authorization.

## Disposition

Fixed now: AI model list/dashboard require AI read access, model internals are admin-only, MTTA uses plant scope, and regression tests cover those surfaces. Deferred: shared persistent NLQ rate limiting.
