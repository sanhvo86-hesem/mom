# D04 Workspace Projection Contracts

## 0. Result

```text
PROMPT_ID: D04
PROMPT_STATUS: PASS_WITH_GAPS
NEXT_PROMPT_FILE: 05_STREAM_D_FRONTEND_AI_UX/D05_CONNECTED_WORKER_MOBILE_KIOSK_UX.md
OUTPUT_FOLDER: HESEM_V11_PARALLEL_OUTPUT/D_FRONTEND_AI_UX/D04_WORKSPACE_PROJECTIONS/
```

## 1. Boundary

Repo state not checked by user instruction. I cannot verify the current repo state from connector in this turn.

D04 is planning-only. It creates no code, no SQL/DDL, no executable schema, no OpenAPI YAML/JSON, no UI markup and no implementation claim. HESEM remains development/prototype/pre-production-readiness.

## 2. Scope

D04 converts the D01/D03 authority model into workspace contracts. It covers:

- 145 P0/V10 root workspaces.
- 14 domain command-center projections.
- 14 cross-root operational workspaces for dispatch board, training matrix, quality queues, maintenance board, inventory/material queues, supplier quality, shopfloor execution, engineering change, traceability, finance variance, integration health, analytics/AI review, platform operations and customer order promise.

Total workspace contract rows: **173**.

## 3. Core decision

A workspace is a projection, not a source of authority. It may help humans see, sort, filter and navigate work. It must not mutate business records, workflow state, evidence, signatures, configuration, inventory, WIP, equipment or regulated state. Every meaningful action must reanchor to the D03 authoritative record shell or to governed config/change-control authority.

## 4. Files

| File | Purpose |
|---|---|
| `D04_WORKSPACE_PROJECTION_CONTRACTS.csv` | Main workspace catalog and required D04 columns. |
| `D04_HIDDEN_AUTHORITY_PREVENTION_MATRIX.csv` | Per-workspace/action-surface authority guard matrix. |
| `D04_WORKSPACE_ACTION_REANCHOR_POLICY.md` | Action class and AR/config reanchor policy. |
| `D04_QUEUE_BOARD_FILTER_SORT_POLICY.md` | Queue/board/filter/sort rules preserving authority context. |
| `D04_WORKSPACE_OFFLINE_AND_ERROR_STATE_MODEL.md` | Loading/empty/error/problem/stale/offline model. |
| `D04_WORKSPACE_API_WORKFLOW_REQUESTS.csv` | Requests to B/C/M03 for workflow/API/evidence/IAM bindings. |
| `D04_WORKSPACE_GAP_AND_REQUEST_LEDGER.csv` | Gaps converted to autonomous planning decisions and implementation gates. |
| `D04_SELF_AUDIT.md` | Coverage and safety audit. |
| `D04_PACKAGE_MANIFEST.json` | Package inventory. |

## 5. Acceptance decision

D04 is ready for D05 because workspace actions are classified, reanchor rules are explicit, hidden authority is blocked, and offline/error states are defined. It remains `PASS_WITH_GAPS` only because current repo state, B/C exact workflow/API outputs, D02 output, and implementation evidence are intentionally not claimed in this turn.
