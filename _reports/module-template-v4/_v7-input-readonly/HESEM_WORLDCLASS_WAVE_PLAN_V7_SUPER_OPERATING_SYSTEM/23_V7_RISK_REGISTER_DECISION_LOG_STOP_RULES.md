# 23 — Risk Register, Decision Log and Stop Rules
## Risk matrix

| ID | Risk | Impact | Severity | Mitigation | Decision |
| --- | --- | --- | --- | --- | --- |
| R-001 | Cross-browser baseline blocker ignored | New slices compound visual and E2E drift | High | Stop new slice; run V21 Chromium repair plan; classify pass/warn/fail | PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER |
| R-002 | Fixture file loaded by portal | Prototype data leaks into current portal runtime | Critical | grep guard; portal inert defaults; forbidden diff guard | FAIL_BLOCK_NEXT |
| R-003 | Workspace becomes hidden authority | Projection screen mutates records without re-anchor | Critical | WS data attributes; disabled mutation launchers; record-shell re-anchor | FAIL_BLOCK_NEXT |
| R-004 | API without contract | Live path diverges from UI/fixture assumptions | High | OpenAPI first; RFC9457 errors; contract diff tests | BLOCK_ENDPOINT_GRADUATION |
| R-005 | E-sign without meaning/audit | Regulated approval cannot be defended | Critical | signature meaning registry; record snapshot; audit/evidence tests | DISABLE_ESIGN |
| R-006 | AI executes regulated decision | Unsafe authority transfer to AI | Critical | advisory-only tool policy; human authority gate; AI eval harness | DISABLE_AI_ACTION |
| R-007 | OT path writes directly to machines | Cyber/safety risk | Critical | 62443 zone/conduit model; no app direct control; edge gateway policy | DISABLE_OT_WRITE |
| R-008 | Validation treated as afterthought | Regulated feature cannot graduate | High | intended-use early; URS/RTM/IQ/OQ/PQ templates | REMAIN_PRE_PRODUCTION_READINESS |
| R-009 | Graphics hardcoding returns | UI consistency and governance fail | Medium | Graphics Authority no-hardcode scan; token registry simulation | BLOCK_UI_MERGE |
| R-010 | Data lake becomes untrusted dump | Analytics loses authority lineage | High | CDC contracts, lineage, DQ checks, source authority mapping | BLOCK_DATA_PRODUCT |

## Global stop rules

- cross-browser blocker unresolved but new slice starts
- mom/portal.html loads fixture 74
- forbidden file changed without explicit approval
- workspace mutates without re-anchor
- unknown alias invents record ID
- live API enabled by default
- backend mutation added without workflow/API contract
- e-sign challenge implemented without signature meaning/audit
- AI executes regulated decision
- E2E cannot reproduce
- rollback missing
- reports not generated
- branch state mismatch

## Decision phrase policy

Every report ends with exactly one decision phrase. Accepted phrases include: `PASS`, `PASS_WITH_WARNINGS`, `FAIL_BLOCK_NEXT`, `PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING`, `PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING`, `PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER`, `PHASE2_INTEGRATION_FAIL_BLOCK_NEXT`.
