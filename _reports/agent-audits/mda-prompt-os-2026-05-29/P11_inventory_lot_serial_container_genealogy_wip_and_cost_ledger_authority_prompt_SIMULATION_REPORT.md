# P11 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P11-001 | stock snapshot exists but no matching ledger | admin override attempt | direct balance update | reject_direct_mutation | none | none | audit violation | n/a | blocked | hidden authority | LEDGER-001 |
| SIM-P11-002 | lot on active hold | warehouse | IssueMaterialToWO | block_hold | none | none | hold evidence | replay safe | blocked | held lot leaks to WIP | hold issue gate |
| SIM-P11-003 | lot expired | warehouse | IssueMaterialToWO | block_expired_lot | none | none | expiry evidence | replay safe | blocked | expired material used | shelf-life gate |
| SIM-P11-004 | stock insufficient | warehouse | IssueMaterialToWO | block_stock_shortage | none | none | stock check | replay safe | blocked | negative balance | shortage gate |
| SIM-P11-005 | lot-controlled backflush item with no lot captured | operator | BackflushMaterial | block_traceability | none | none | route policy evidence | retry with lot | blocked | genealogy gap | backflush traceability |
| SIM-P11-006 | serial already completed once | operator | CompleteProduction | block_serial_duplicate | none | none | serial uniqueness audit | replay safe | blocked | duplicate output serial | serial uniqueness |
| SIM-P11-007 | parent lot valid | warehouse | SplitLot | require_genealogy_write | child lots and ledger | inventory.lot_split | split evidence | retry idempotent | pass | orphan lots | split genealogy |
| SIM-P11-008 | two lots with mismatched hold status | warehouse | MergeLot | block_status_incompatible | none | none | merge audit | n/a | blocked | mixed quarantine contamination | merge rule |
| SIM-P11-009 | period closed | inventory controller | IssueMaterialToWO | block_closed_period | none | none | period evidence | operator recovery only | blocked | backdated inventory drift | period policy |
| SIM-P11-010 | scrap command succeeds | operator | ReportScrap | require_cost_hook | scrap and cost ledger | production.scrap_recorded | scrap evidence | retry same response | pass | value mismatch | cost hook parity |
| SIM-P11-011 | rework uses output lot | shift leader | CreateRework | require_correct_consumption_link | rework and WIP ledger | production.rework_created | rework evidence | replay same response | pass | genealogy loop corruption | rework linkage |
| SIM-P11-012 | newer lot selected while older eligible lot exists | warehouse | IssueMaterialToWO | block_fefo | none | none | FEFO policy evidence | retry after correct lot | blocked | shelf-life and FIFO violation | FEFO gate |
| SIM-P11-013 | container moved with child lots | warehouse | MoveInventory | update_container_and_child_projection | inventory ledger move | inventory.container_moved | move evidence | replay safe | pass | child location drift | container parity |
| SIM-P11-014 | supplier heat queried | QA | recall forward | require_full_forward_graph | none | trace.recall_simulated | recall export | n/a | pass | missing shipment scope | forward recall |
| SIM-P11-015 | complaint serial queried | QA | recall backward | require_full_backward_graph | none | trace.recall_simulated | recall export | n/a | pass | supplier source unknown | backward recall |
| SIM-P11-016 | adjustment request submitted without approval | inventory controller | AdjustInventoryWithApproval | block_approval_missing | none | none | approval audit | n/a | blocked | unauthorized correction | adjustment approval |
| SIM-P11-017 | PO receipt posted | receiver | ReceiveInventory | quarantine_until_iqc | receipt and quarantine ledger | inventory.receipt_recorded | receipt evidence | replay same response | pass to quarantine only | available stock too early | receipt quarantine |
| SIM-P11-018 | held lot is in picking list | logistics | ConfirmPacking | block_hold | none | none | shipment gate evidence | n/a | blocked | shipment leakage | shipment pick gate |
| SIM-P11-019 | same idempotency key retries issue | warehouse scanner | IssueMaterialToWO | replay_same_response | none beyond first issue | inventory.issued_to_wip once | replay audit | same response | pass | double consumption | idempotent issue |
| SIM-P11-020 | snapshot stale but projection green | planner | open inventory board | require_rebuild_or_reanchor | none | projection.stale_detected | telemetry only | refresh projection | blocked from action | stale projection used as authority | snapshot freshness |
