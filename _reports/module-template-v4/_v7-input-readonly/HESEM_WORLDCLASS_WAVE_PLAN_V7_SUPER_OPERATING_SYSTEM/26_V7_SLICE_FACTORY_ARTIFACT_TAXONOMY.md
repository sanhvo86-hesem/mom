# 26 — Slice Factory and Artifact Taxonomy
## Slice definition

A slice is one root × one surface pattern × one maturity target. Example: `NQCASE × AR record shell × L3/L4`, or `DISP × WS projection × L3`.

## Slice artifact taxonomy

| Artifact | Required content |
| --- | --- |
| Scope contract | root, route, authority class, maturity target, allowed files, forbidden files |
| Fixture contract | states, fixture files, degraded/conflict/partial access |
| Screen contract | WS/AR data attributes, tabs, actions, disabled controls |
| API contract | OpenAPI, problem details, fallback if live |
| Workflow contract | states/transitions/guards/mutation commands |
| Evidence contract | audit, evidence objects, signatures, retention |
| QA report | node syntax, JSON parse, forbidden diff, no fixture load, E2E |
| Rollback runbook | feature flag, revert, fixture/live disable, data rollback |
| Decision log | final pass/warn/fail phrase |

## Slice gate checklist

- Source state verified.
- Root authority named.
- Route grammar validated.
- WS cannot mutate; AR can only request command if governed.
- Fixture mode default.
- Live API opt-in only.
- No forbidden files changed.
- E2E reproduces.
- Report outputs generated.
