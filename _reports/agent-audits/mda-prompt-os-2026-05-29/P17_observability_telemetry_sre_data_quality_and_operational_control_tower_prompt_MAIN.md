# P17 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P17-CLAIM-001 | the repo already recognizes fallback reads, drift, and command failures as cutover-critical signals. | REPO_EVIDENCE | `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md`; `docs/backend/DOMAIN_COMMAND_SPEC.md` | High | control tower may miss fatal conditions | bind telemetry to those failure classes | verified |
| P17-CLAIM-002 | prior prompts established quality, readiness, security, and inventory invariants that need telemetry hooks. | REPO_EVIDENCE | `_reports/.../MDA_LEDGER_INVARIANT_TESTS.csv`; `_reports/.../MDA_PERMISSION_MATRIX.csv`; `_reports/.../MDA_SHOPFLOOR_SCENARIO_LIBRARY.csv` | High | observability could become vanity metrics | convert invariants to actionable signals | verified |
| P17-CLAIM-003 | current repo already has observability-style service patterns and audit events. | REPO_EVIDENCE | `mom/api/services/ApprovalWorkflowAdapter.php`; `.ai/repo-map.json` infrastructure services list | Medium | telemetry vocabulary could drift from runtime | keep signal names explicit and low-cardinality | verified |
| P17-CLAIM-004 | NIST governance continues to support incident ownership and response alignment. | CURRENT_OFFICIAL_REFERENCE | [NIST CSF](https://www.nist.gov/cyberframework) | Medium | alerts might exist with no owner workflow | require owner and runbook per signal | verified |
| P17-CLAIM-005 | OT adapters should be monitored for heartbeat freshness, not trusted silently. | CURRENT_OFFICIAL_REFERENCE | [MTConnect](https://www.mtconnect.org/); [OPC UA](https://opcfoundation.org/about/opc-technologies/opc-ua/) | High | stale edge links may default to allow | emit heartbeat age and trust incidents | verified |

## Authority decisions

1. Every control-tower metric must map to a decision, owner, dashboard, and runbook.
2. Command, workflow, migration, security, and data-quality traces share correlation/causation identifiers.
3. Projection freshness and fallback reads are first-class operational signals because projections must never silently become authority.
4. Data quality is action-driving and steward-owned, not a vanity score.

## Repair pass applied in P17

1. Published `MDA_TELEMETRY_CONTRACT.csv`.
2. Connected command, gate, drift, fallback, outbox, audit, e-sign, and data-quality signals.
3. Bound each major alert class to a dashboard and owner.
4. Defined control-tower panels in `MDA_TEST_ACCEPTANCE_DASHBOARD_SPEC.md`.

## Decision token

`P17_PASS_WITH_CONTROLLED_GAPS`
