# Foundation Governance Slice Publication Summary

> Slice-specific proof for the Foundation Governance Contract Slice.
> Platform-global status is in `publication-truth-summary.md`.

## Slice Verdict: **READY**

| Field | Value |
|-------|-------|
| Scope | `foundation_governance_contract_slice` |
| Model | `global_canonical_plus_slice_summary` |
| OpenAPI | `3.1.2` |

## Slice Entities

| Entity | Status |
|--------|--------|
| `governance.approval_group` | **ready** (score 88) |
| `governance.attachment` | **ready** |
| `foundation.organization` | **ready** |
| `foundation.party` | **ready** |
| `foundation.calendar` | **ready** |

## 10 Public Routes

| # | Route |
|---|-------|
| 1 | `GET /api/v1/foundation/organizations` |
| 2 | `GET /api/v1/foundation/parties` |
| 3 | `GET /api/v1/foundation/calendars` |
| 4 | `GET /api/v1/governance/approval-groups` |
| 5 | `GET /api/v1/governance/approval-groups/{id}` |
| 6 | `POST /api/v1/governance/approval-groups/{id}:decide` |
| 7 | `GET /api/v1/governance/approval-groups/{id}/timeline` |
| 8 | `GET /api/v1/governance/approval-groups/{id}/attachments` |
| 9 | `GET /api/v1/governance/attachments/{id}` |
| 10 | `POST /api/v1/governance/attachments` |

## 12 Internal Commands

All implemented with canonical DB writes (INSERT...RETURNING / UPDATE with row_version guard).

## Workflow Bridge

- Engine: `WorkflowEngine` with `APPROVAL_STEP` definition
- Adapter: `ApprovalWorkflowAdapter` (engine rejection is fatal)
- Self-approval prohibition: enforced in service layer
- `WORKFLOW_BRIDGE_READY = true`

## Verification

| Suite | Result |
|-------|--------|
| Smoke | 114/114 PASS |
| Runtime assurance | 67/67 PASS |
| Truth verifier | 24/24 PASS |
| Release-candidate | 17/17 PASS |
| HTTP black-box (live) | 29/29 PASS |
| Browser/UI (live) | 7/7 PASS |

## Honest Limitations

- **Benchmark**: stability_probe (2 clients, 15s) — not production-load
- **Observability**: file_export_only — no live OTel collector
- **Scope**: This summary covers the slice only; platform-global is separate
