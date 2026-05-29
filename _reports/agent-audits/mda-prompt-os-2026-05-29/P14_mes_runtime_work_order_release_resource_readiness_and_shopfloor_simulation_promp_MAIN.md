# P14 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P14-CLAIM-001 | runtime command specification already names ReleaseWorkOrder, CompleteOperation, and machine-event flows. | REPO_EVIDENCE | `docs/backend/DOMAIN_COMMAND_SPEC.md` | High | shopfloor commands may be improvised | use command spec as MES command backbone | verified |
| P14-CLAIM-002 | workflow spec already freezes production WO states distinct from service work orders. | REPO_EVIDENCE | `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md` | High | MES/runtime and service states could bleed together | keep execution lifecycle isolated | verified |
| P14-CLAIM-003 | prior prompts already defined engineering release package, machine readiness, and tooling gates. | REPO_EVIDENCE | `_reports/.../P07_*`; `_reports/.../MDA_MACHINE_READINESS_POLICY.csv`; `_reports/.../MDA_TOOL_LIFE_AND_BREAKAGE_REACTION_MATRIX.csv` | High | runtime could use mutable master joins or partial gates | force frozen snapshot plus composite readiness | verified |
| P14-CLAIM-004 | MTConnect describes adapters and agents as data-transport architecture, not mutation authority. | CURRENT_OFFICIAL_REFERENCE | [MTConnect](https://www.mtconnect.org/) | High | OT adapters may be treated as direct control authority | keep edge data candidate-only until command acceptance | verified |
| P14-CLAIM-005 | ISA-95 still supports event-context handoff between operations management and business layers. | CURRENT_OFFICIAL_REFERENCE | [ISA-95](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | High | MES/ERP boundary may blur | keep event-first runtime with frozen snapshots | verified |

## Authority decisions

1. `ResourceReadinessService` is a command-time gate aggregator, not a dashboard-only helper.
2. WO and job runtime history store frozen source versions for item, routing, BOM, quality plans, tool/program/package, and readiness snapshot.
3. Raw OT events remain append-only input; governed state changes happen only through commands.
4. Failures create explicit quality, maintenance, tooling, or supervision reactions instead of hidden status edits.

## Repair pass applied in P14

1. Added `MDA_SHOPFLOOR_SCENARIO_LIBRARY.csv` with 100 scenario seeds.
2. Bound start/release/complete/inspection commands to one readiness snapshot model.
3. Made offline capture candidate-only for high-risk actions until reconcile.
4. Linked machine alarm, tool breakage, and OOT events to automatic containment or maintenance triggers.

## Decision token

`P14_PASS_WITH_CONTROLLED_GAPS`
