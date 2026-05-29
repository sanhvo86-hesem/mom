# P15 — AI Advisory Boundary and Controls

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P15 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the hard boundary between AI advice and human authority for any catalog mutation in the UoM subsystem. AI may **inform**; humans always **decide**.

## 2. Authority assignment

| Action | AI may | Human must |
|---|---|---|
| Suggest alias resolution | yes (record advisory) | yes (review + decide) |
| Suggest conversion rule factor | yes (record advisory) | yes (submit for review path) |
| Suggest density estimate | yes (record advisory) | yes (metrology approval) |
| Score severity of impact analysis | yes (advisory) | yes (approver judgment) |
| Mark `human_reviewed=true` | **no** | yes (recordHumanDecision) |
| Transition rule `pending_review → approved` | **no** | yes (esign workflow) |
| Transition unit `active → retired` | **no** | yes (catalog admin via workflow) |
| Edit MEASVAL envelope | **no** (envelope is immutable) | **no** (envelope is immutable for everyone) |
| Add ai_flag to MEASVAL | yes | yes |
| Decide impact severity classification | **no** | yes |

## 3. Service-layer enforcement

| Path | Mechanism |
|---|---|
| `UomWorkflowService::recordAiAdvisory` | only writes to `uom_ai_advisory_log` — no foreign-table write |
| `UomWorkflowService::recordHumanDecision` | requires user_id; AI cannot impersonate (HESEM identity middleware) |
| All lifecycle transitions | require human `actor_id` in workflow service; recordAiAdvisory does not satisfy |
| MEASVAL writes | only via `MeasurementValueFactory` (no AI-callable path) |
| Alias triage resolve | only via `resolveQuarantineEntry($id, $canonical, $reviewerId)` — reviewerId from auth session |

## 4. UI-layer enforcement

| Surface | Mechanism |
|---|---|
| Triage queue UI | clearly badges AI suggestions; cannot "auto-accept" |
| Workflow approver UI | renders impact analysis + AI advisory summaries; approver must click + e-sign |
| Catalog admin UI | no AI-only action; every form submission has a human submitter |

## 5. Telemetry

Every AI advisory row carries:

- `model_id` (e.g. `claude-3-opus-20240229`)
- `model_version` (string)
- `confidence` (0–1)
- `rationale` (model output, free text)
- `created_at`
- `human_reviewed` (boolean)
- `reviewer_id` (UUID, populated by recordHumanDecision)
- `decision` (`ACCEPT` / `REJECT` / `MODIFY`)
- `decided_at` (populated by recordHumanDecision)

Telemetry is the basis for evaluating model performance over time without ceding control.

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| AHD-001 | Hard separation: AI = advisory, human = decision | UD-012 |
| AHD-002 | recordHumanDecision is sole writer of human_reviewed=true | tamper resistance |
| AHD-003 | Every advisory must carry model_id + model_version | model drift evaluation |
| AHD-004 | Confidence threshold applied at UI surface, not at engine | UX clarity |
| AHD-005 | AI may not be sole basis for activation, deactivation, or quarantine resolution | UD-012 |
| AHD-006 | AI advisor calling adapter is service-internal in v1; not externally addressable | scope |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | AHG-001 | Confidence threshold UI not yet wired | UA-004 |
| medium | AHG-002 | Model_id + model_version not yet pinned to a registry | governance |
| low | AHG-003 | Multi-model A/B comparison absent | observability |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Authority separation | 10 |
| Service enforcement | 10 |
| UI enforcement | 9 |
| Telemetry sufficiency | 9 |
| **Total** | **38 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/audits/uom-measurement-conversion-v1/security-ai-ot-threat-model.md` (P15 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p15-abuse-case-test-plan.md` (P15 / 3)
