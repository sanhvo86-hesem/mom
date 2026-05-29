# P21 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P21-001 | hidden generic mutation still present | reviewer | scan package | critical finding | none | redteam.finding | evidence note | queue repair | blocked if found | unsafe mutation survives | bypass audit |
| SIM-P21-002 | item revision ambiguity exists | reviewer | inspect taxonomy and release docs | finding_or_gap | none | redteam.finding | evidence note | queue repair | blocked if unresolved | release confusion | taxonomy review |
| SIM-P21-003 | migration simulation too shallow | reviewer | inspect P15 and P19 | score drop | none | redteam.finding | evidence note | queue repair | critical criterion <4 blocks | unsafe cutover claim | migration depth |
| SIM-P21-004 | e-sign meaning absent | reviewer | inspect P13 | score drop | none | redteam.finding | evidence note | queue repair | critical criterion <4 blocks | weak signature model | e-sign score |
| SIM-P21-005 | AI can execute release | reviewer | inspect P16 | score drop | none | redteam.finding | evidence note | queue repair | critical criterion <4 blocks | autonomous mutation | AI score |
| SIM-P21-006 | workspaces still hide authority | reviewer | inspect P18 | score drop | none | redteam.finding | evidence note | queue repair | critical criterion <4 blocks | UI unsafe | frontend score |
| SIM-P21-007 | rollback absent | reviewer | inspect P15 and P20 | score drop | none | redteam.finding | evidence note | queue repair | critical criterion <4 blocks | unrecoverable cutover | rollback score |
| SIM-P21-008 | benchmark fact has no source | reviewer | inspect source tags | no_guess_violation | none | redteam.finding | evidence note | queue repair | blocked if unsourced | fabricated benchmark | source audit |
| SIM-P21-009 | domain owner missing | reviewer | inspect backlog and gaps | governance finding | none | redteam.finding | evidence note | queue repair | blocked until owner assigned | orphaned work | owner audit |
| SIM-P21-010 | test assertion too vague | reviewer | inspect scenario libraries | score drop | none | redteam.finding | evidence note | queue repair | criterion score can fall | non-executable tests | assertion audit |
| SIM-P21-011 | all critical criteria >=4 | reviewer | score package | pass_with_controlled_gaps | none | governance.acceptance_decided | scorecard | n/a | pass | false fail | score gate |
| SIM-P21-012 | final ledger still has P0 | reviewer | inspect final ledger | blocked_repair_required | none | governance.acceptance_blocked | ledger evidence | repair queue | blocked | dishonest final token | p0 gate |
| SIM-P21-013 | final ledger still has P1 | reviewer | inspect final ledger | blocked_repair_required | none | governance.acceptance_blocked | ledger evidence | repair queue | blocked | dishonest final token | p1 gate |
| SIM-P21-014 | only P2 gaps remain | reviewer | inspect final ledger | controlled_gap_ok | none | governance.acceptance_decided | ledger evidence | n/a | pass with controlled gaps | severity mismatch | severity gate |
| SIM-P21-015 | repair queue omitted | reviewer | inspect bundle | blocked | none | governance.acceptance_blocked | audit evidence | add queue | blocked | no path to closure | repair queue existence |
| SIM-P21-016 | implementation handoff too vague | reviewer | inspect handoff prompts | blocked | none | governance.acceptance_blocked | prompt evidence | refine prompts | blocked | guess-driven implementation | handoff quality |
| SIM-P21-017 | risk register too optimistic | reviewer | inspect risks | finding | none | redteam.finding | audit evidence | expand register | score drop possible | unmanaged hazards | risk realism |
| SIM-P21-018 | user usability not evidenced | reviewer | inspect UI contract and scenarios | finding | none | redteam.finding | audit evidence | add operator validation plan | score drop possible | low adoption | usability score |
| SIM-P21-019 | observability ownerless | reviewer | inspect telemetry contract | finding | none | redteam.finding | audit evidence | assign owner | score drop possible | blind operation | ownership score |
| SIM-P21-020 | final token claims runtime complete | reviewer | inspect final acceptance | block_claim | none | governance.acceptance_blocked | final decision evidence | downgrade token | blocked | false enterprise claim | final claim gate |
