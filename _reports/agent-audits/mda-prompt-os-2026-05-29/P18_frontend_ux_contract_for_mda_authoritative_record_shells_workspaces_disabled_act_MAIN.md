# P18 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P18-CLAIM-001 | generic CRUD and projection mutation are already forbidden for governed state. | REPO_EVIDENCE | `docs/backend/DOMAIN_COMMAND_SPEC.md`; `_reports/.../P12_*` | High | UI could silently reintroduce hidden authority | keep record shell vs projection split | verified |
| P18-CLAIM-002 | workflow and command artifacts already define the exact gate reasons UI must expose. | REPO_EVIDENCE | `_reports/.../MDA_WORKFLOW_STATUS_AUTHORITY.md`; `_reports/.../MDA_COMMAND_CATALOG.csv` | High | disabled actions become vague or misleading | reuse command error/gate codes | verified |
| P18-CLAIM-003 | earlier prompts already define canonical roots for record shells. | REPO_EVIDENCE | `_reports/.../MDA_CANONICAL_OBJECT_TAXONOMY.md`; `_reports/.../MDA_ROOT_AUTHORITY_LEDGER.csv` | High | routes may anchor to the wrong root | build shells around canonical roots only | verified |
| P18-CLAIM-004 | graphics and design systems are already governed separately from business authority. | REPO_EVIDENCE | `.ai/CONVENTIONS.md` graphics authority section | Medium | visual layer could be mistaken for behavior authority | keep UI contract focused on authority semantics | verified |
| P18-CLAIM-005 | accessibility and security need reasoned disabled states, not hidden buttons only. | INFERENCE | combined from command/workflow/security artifacts | Medium | operators may not understand blocks | show reason and next evidence/action path | accepted |

## Authority decisions

1. Authoritative record shells live under stable `/ops/records/...` routes and show full audit/evidence/signature context.
2. Workspaces are explicitly marked projections with freshness and authority class banners.
3. Disabled actions must show exact gate code, why blocked, and what evidence or command is needed next.
4. Offline/mobile captures candidates only unless a low-risk policy explicitly allows later command submission.

## Repair pass applied in P18

1. Published `MDA_UI_CONTRACT_MATRIX.csv`.
2. Bound re-anchor rule: projections can navigate to authoritative shells but cannot mutate themselves.
3. Required audit, evidence, signature, and timeline panels on regulated record shells.
4. Added freshness and permission visibility as first-class UI state.

## Decision token

`P18_PASS_WITH_CONTROLLED_GAPS`
