# Foundation Governance — Slice Publication Summary

**Scope**: `foundation_governance_contract_slice`
**Truth Model**: `slice_within_global_canonical`
**Run Family**: `0b987d57-e143-47f7-96c8-815033baec67`
**Slice Verdict**: **PASS**
**Blockers**: none

## Slice Metrics

| Metric | Count |
|--------|-------|
| Tables | 19 |
| Public routes | 10 |
| Internal commands | 12 |

## 10 Public Routes

| # | Route |
|---|-------|
| 1 | `GET /api/v1/foundation/organizations` |
| 2 | `GET /api/v1/foundation/parties` |
| 3 | `GET /api/v1/foundation/calendars` |
| 4 | `GET /api/v1/governance/approval-groups` |
| 5 | `POST /api/v1/governance/approval-groups` |
| 6 | `GET /api/v1/governance/approval-groups/{id}` |
| 7 | `POST /api/v1/governance/approval-groups/{id}:decide` |
| 8 | `GET /api/v1/governance/approval-groups/{id}/timeline` |
| 9 | `POST /api/v1/governance/approval-groups/{id}/attachments` |
| 10 | `GET /api/v1/governance/attachments/{id}` |

## 12 Internal Commands

All with canonical DB writes (INSERT...RETURNING / UPDATE with row_version guard):
`registerOrganizationNode`, `amendOrganizationNode`, `reparentOrganizationNode`, `deactivateOrganizationNode`, `registerParty`, `amendPartyIdentity`, `assignPartyRole`, `registerPartySite`, `registerPartyContact`, `registerCalendar`, `registerShift`, `requestApproval`

## Workflow Bridge

- Engine: `WorkflowEngine` + `ApprovalWorkflowAdapter`
- State machine: `APPROVAL_STEP` (pending → approved | rejected | changes_requested)
- Engine rejection is fatal (not silently tolerated)
- Self-approval prohibition: enforced in service layer (403)

## Honesty Declarations

| Aspect | Mode | Detail |
|--------|------|--------|
| Observability | file_export_only | Structured logs to file. No live collector. |
| Benchmark | stability_probe | Smoke-level probe, not production load test. |
| Concurrency | ETag/If-Match | row_version triggers, 412/428 on mismatch. |
| Self-approval | prohibited | 403 if requester === approver. |
| Audit | FDA Part 11 | Electronic signatures + ALCOA+ events. |

## Anti-false-green

This summary covers the Foundation Governance slice only. Platform-global readiness is reported in `publication-truth-summary.json`. Platform is NOT fully publishable (97 blocked canonical tables).
