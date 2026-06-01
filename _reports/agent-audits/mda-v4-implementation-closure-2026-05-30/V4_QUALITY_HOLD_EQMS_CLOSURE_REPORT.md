# V4 Quality Hold and eQMS Transaction Chain Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Prompt: P53 - Canonical Quality Hold and eQMS Transaction Chain Closure
Posture: pre-production runtime-readiness evidence; not production-ready

## Source Truth Audit

- Existing legacy quality structures exist across `quality_order`, `quality_case_link`, `ncr_records`, `nonconformance`, `material_review_board`, WMS quarantine, and order quality flags.
- Before P53, live MES command handlers did not query one canonical active quality hold source before movement/execution mutation.
- UOM is now direct command authority through `UomCommandQuantityNormalizer -> UomRuntimeAuthorityService`; P53 reuses that direct path for inspection measurements and does not call `MdaUomAuthorityBridge`.
- P53 source of truth is the new canonical runtime chain: `quality_hold`, `quality_hold_subject`, `quality_hold_source`, `quality_hold_release`, `quality_inspection_result_runtime`, `quality_order_runtime`, `quality_nonconformance_runtime`, `mrb_disposition_runtime`, and `quality_case_trace_link`.

## Runtime Evidence Probe

Manual probe:

```json
{"blocked":{"problem":"quality_hold_active","mes_writes":0,"uom_writes":0,"hold_evidence_writes":1},"inspection_chain":{"created":true,"hold_writes":6,"ncr_writes":1,"quality_order_writes":1,"trace_link_writes":8,"uom_measurement_writes":1}}
```

Interpretation:

- Active canonical hold blocks `IssueMaterialToWorkOrderCommand` before UOM normalization and before `mes_material_consumption`.
- The block writes operator-facing readiness evidence with `quality_hold_active`.
- Failed IPQC inspection writes direct UOM measurement evidence, runtime inspection result, canonical hold, quality order, NCR, trace links, audit, outbox, and MES event.

## Implementation Delta

- Added migration `mom/database/migrations/270_quality_hold_eqms_transaction_chain.sql`.
- Added service `mom/api/services/DomainCommand/QualityHoldService.php`.
- Wired `DomainCommandGateway` to `ApplyQualityHoldCommand`, `ReleaseQualityHoldCommand`, and `RecordMrbDispositionCommand`.
- Wired `MesRuntimeCommandHandler` to query canonical holds for start, issue, tool load, and operation completion.
- Wired `RecordInspectionResultCommand` to create the quality chain on failed inspection inside the command transaction.
- Added `RecordMrbDispositionCommand` to `CommandRegistry` and `RegulatedActionPolicy`.
- Added unit coverage file `mom/tests/Unit/Services/DomainCommandQualityHoldServiceTest.php`.

## Operational Simulation Matrix

| scenario_id | action | expected_gate | data_written | expected_result |
|---|---|---|---|---|
| P53-SIM-001 | Issue material for lot on active hold | canonical `quality_hold` active query | readiness hold evidence + audit | command fails `quality_hold_active`; zero MES material write |
| P53-SIM-002 | Failed IPQC inspection | direct UOM + readiness + quality chain | inspection result, hold, quality order, NCR, trace links, audit, outbox | `quality_chain_created=true` |
| P53-SIM-003 | Manual hold apply/release | regulated command + signature/evidence policy | hold, subject, source, release, audit, outbox | canonical hold lifecycle recorded |
| P53-SIM-004 | MRB use-as-is without required customer approval | MRB customer approval gate | no MRB disposition write | command fails `mrb_customer_approval_required` |

## Multi-role Adversarial Audit

- Quality lead: PASS for single active hold source; remaining legacy tables are not used by new command handlers as authority.
- MES lead: PASS for fail-closed movement/execution gates on start, issue, tool load, and complete operation.
- Inventory lead: PARTIAL; issue-material path is blocked by quality hold, but shipment and inventory ledger handlers are still pending later prompts.
- Regulatory/e-sign lead: PASS for command registry and regulated action policy; formal validation package remains out of scope.
- Data governance lead: PASS for generic CRUD guard trigger reattachment on the new governed quality tables.

## Gap Ledger

Closed:

- `P53-BLOCK-QH-001`: movement/execution commands now derive hold subjects server-side and query `quality_hold`/`quality_hold_subject`, ignoring caller hold arrays.
- `P53-BLOCK-QH-002`: failed inspection creates canonical quality chain instead of narrative-only report.
- `P53-BLOCK-QH-003`: generic CRUD guard is attached to new governed quality tables.
- `P53-BLOCK-QH-004`: MRB use-as-is requires customer approval reference when declared required.

Controlled gaps:

- Shipment and inventory ledger command handlers are still not live in this branch; P54/P55/P59 must wire canonical hold checks there.
- Legacy quality tables remain compatibility/history surfaces until migration reconciliation is explicitly performed.
- Composer PHPUnit/PHPStan validation is blocked by missing local vendor binaries.

## Final Re-audit

P0 blockers addressed for the paths touched in P53: live MES issue/start/load/complete paths now fail closed against canonical quality hold, and failed inspection creates physical eQMS runtime records. No production-readiness claim is made.

## Decision Token

P53_PASS_WITH_CONTROLLED_GAPS_READY_FOR_P54
