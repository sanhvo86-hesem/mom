# P19 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P19-CLAIM-001 | earlier prompts already produced domain-specific simulation packs for quality, inventory, command, UI, and runtime. | REPO_EVIDENCE | `_reports/.../P11_*`; `_reports/.../P12_*`; `_reports/.../P14_*`; `_reports/.../P18_*` | High | end-to-end harness may reinvent assumptions | aggregate and normalize existing scenarios | verified |
| P19-CLAIM-002 | the prompt OS requires large-scale scenario libraries and exact assertions. | REPO_EVIDENCE | prompt pack `19_p19...`; `MDA_SHOPFLOOR_SCENARIO_LIBRARY.csv` | High | acceptance tests remain shallow | create one master library and dashboard spec | verified |
| P19-CLAIM-003 | command, workflow, migration, and telemetry artifacts now provide enough vocabulary for a scenario DSL. | REPO_EVIDENCE | `MDA_COMMAND_CATALOG.csv`; `MDA_WORKFLOW_STATUS_AUTHORITY.md`; `MDA_COLLECTION_CROSSWALK.csv`; `MDA_TELEMETRY_CONTRACT.csv` | High | automation harness would have to guess | use these artifacts as the DSL source vocabulary | verified |
| P19-CLAIM-004 | ISA-95 and MTConnect still support event-context simulation without turning OT events into authority. | CURRENT_OFFICIAL_REFERENCE | [ISA-95](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard); [MTConnect](https://www.mtconnect.org/) | High | simulation may over-trust raw events | keep command acceptance separate from raw-event seeds | verified |
| P19-CLAIM-005 | red-team closure later depends on explicit scenario evidence, not narrative confidence. | REPO_EVIDENCE | prompt pack `21_p21...` | High | final acceptance becomes subjective | produce 200-scenario library and dashboard spec | verified |

## Authority decisions

1. Scenario DSL must reference canonical commands, roots, statuses, events, ledgers, holds, evidence, and expected errors.
2. End-to-end acceptance follows real plant chains, not isolated unit-only flows.
3. Extreme failure modes are mandatory, not optional nice-to-have coverage.
4. Simulation output must be exportable for operator, QA, architecture, and auditor review.

## Repair pass applied in P19

1. Published `MDA_SIMULATION_MASTER_LIBRARY.csv` with 200 scenarios.
2. Published `MDA_TEST_ACCEPTANCE_DASHBOARD_SPEC.md`.
3. Carried forward recall, containment, migration, security, and observability drills into one acceptance library.
4. Normalized scenario assertions around commands, events, ledgers, holds, and evidence.

## Decision token

`P19_PASS_WITH_CONTROLLED_GAPS`
