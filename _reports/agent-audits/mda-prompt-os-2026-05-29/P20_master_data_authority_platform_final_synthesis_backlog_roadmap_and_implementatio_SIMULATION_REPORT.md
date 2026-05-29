# P20 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P20-001 | P07 passed but P10 hold service still open | architect | review final plan | keep_gap_visible | none | governance.reviewed | review evidence | n/a | pass with gap visible | hidden quality gap | synthesis gap carry |
| SIM-P20-002 | backlog story has no tests | architect | review story | reject_story | none | governance.story_rejected | review evidence | rewrite story | blocked | unverifiable implementation | backlog acceptance |
| SIM-P20-003 | wave starts implementation before freeze | architect | review roadmap | reject_wave_order | none | governance.plan_rejected | review evidence | reorder waves | blocked | authority churn | wave ordering |
| SIM-P20-004 | implementation handoff edits repo before gate | coding agent | use prompt | handoff_guard | none | governance.handoff_blocked | handoff evidence | fix prompt scope | blocked | unsafe coding slice | handoff guard |
| SIM-P20-005 | risk register omits rollback | architect | review risks | reject_risk_register | none | governance.plan_rejected | review evidence | add rollback risk | blocked | unsafe cutover plan | rollback risk |
| SIM-P20-006 | DoD omits simulation | architect | review DoD | reject_dod | none | governance.plan_rejected | review evidence | add simulation gate | blocked | paper-only completion | DoD simulation |
| SIM-P20-007 | root aliases unresolved | architect | review conflicts | keep_conflict_visible | none | governance.reviewed | conflict evidence | route to repair queue | pass with visible conflict | hidden alias ambiguity | conflict carry |
| SIM-P20-008 | command catalog incomplete for release | architect | review backlog | block_wave4 | none | governance.plan_rejected | command evidence | add missing commands | blocked | incomplete mutation authority | command completeness |
| SIM-P20-009 | no owner for stewardship | architect | review backlog | owner_required | none | governance.plan_rejected | backlog evidence | assign owner | blocked | orphaned governance work | owner coverage |
| SIM-P20-010 | no generic CRUD bypass test | architect | review DoD | test_required | none | governance.plan_rejected | DoD evidence | add test | blocked | bypass regression | bypass test |
| SIM-P20-011 | P0 gap appears later | architect | review final ledger | block_completion_claim | none | governance.reviewed | gap evidence | re-run repair prompt | blocked | false green | p0 carry |
| SIM-P20-012 | P1 gap appears later | architect | review final ledger | block_completion_claim | none | governance.reviewed | gap evidence | re-run repair prompt | blocked | false green | p1 carry |
| SIM-P20-013 | all remaining gaps are P2 | architect | review final ledger | controlled_gap_ok | none | governance.reviewed | gap evidence | n/a | pass with controlled gaps | severity inflation hides risk | final severity check |
| SIM-P20-014 | coding prompt too vague | coding agent | read handoff | reject_prompt | none | governance.handoff_blocked | prompt evidence | make file/test scope exact | blocked | guess-driven edits | prompt clarity |
| SIM-P20-015 | story missing rollback note | coding agent | read handoff | reject_story | none | governance.story_rejected | prompt evidence | add rollback notes | blocked | hard-to-recover change | rollback note |
| SIM-P20-016 | story touches UOM scope | coding agent | read prompt | scoped_out_rule | none | governance.handoff_blocked | scope evidence | rewrite prompt | blocked | branch conflict with other AI | scope isolation |
| SIM-P20-017 | observability wave omitted | architect | review roadmap | reject_wave_plan | none | governance.plan_rejected | plan evidence | reinsert wave | blocked | blind runtime | observability wave |
| SIM-P20-018 | simulation harness omitted | architect | review roadmap | reject_wave_plan | none | governance.plan_rejected | plan evidence | add wave | blocked | no runtime proof | simulation wave |
| SIM-P20-019 | AI governance omitted | architect | review risks | reject_plan | none | governance.plan_rejected | risk evidence | add AI boundary | blocked | autonomous mutation hazard | AI governance |
| SIM-P20-020 | red-team rerun omitted | architect | review final sequence | reject_completion | none | governance.plan_rejected | plan evidence | add P21 rerun | blocked | self-certified plan | red-team gate |
