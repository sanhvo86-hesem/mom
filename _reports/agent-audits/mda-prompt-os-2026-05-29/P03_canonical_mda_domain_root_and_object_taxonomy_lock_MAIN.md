# P03 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P03-CLAIM-001 | The repo target architecture already standardizes the ten canonical object classes used by this prompt. | REPO_EVIDENCE | `mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md` | High | taxonomy drift across prompts | anchor taxonomy directly to repo doc | verified |
| P03-CLAIM-002 | Only lifecycle owners and selected transaction documents may own governed transitions. | REPO_EVIDENCE | same target architecture doc | High | hidden workflow owners could proliferate | encode as hard rule | verified |
| P03-CLAIM-003 | Existing contracts already classify several master data objects as `reference_master` and many execution/quality objects as `lifecycle_owner`. | REPO_EVIDENCE | `mom/contracts/objects/*/contract.json` | High | taxonomy could contradict repo contracts | sample customer/employee/equipment/control-plan/work-order/stock-balance contracts | verified |
| P03-CLAIM-004 | P02 benchmark package requires a released engineering bundle root rather than disconnected BOM/routing/quality authorities. | BENCHMARK_PATTERN | `P02_global_benchmark_standards_and_vendor_pattern_extraction_for_mda_MAIN.md` | High | P04 schema could re-fragment release authority | lock engineering bundle root now | verified |
| P03-CLAIM-005 | Customer and supplier should resolve to Party plus role assignment rather than separate legal-entity roots. | INFERENCE | party root group in target architecture + P03 prompt alias rules | Medium | migration complexity if wrong | carry as canonical taxonomy with compatibility aliases | verified |
| P03-CLAIM-006 | User, employee, and operator must not remain three independent person roots. | REPO_EVIDENCE | `AGENTS.md` SSOT rule + `master_data--employees` contract + `DataLayer::extractEmployeeOperatorRows()` | High | identity drift and SoD failure | lock UserIdentity + EmployeeProfile + OperatorQualification relationship | verified |
| P03-CLAIM-007 | Inventory balance must be a projection, not mutable authority. | REPO_EVIDENCE | target architecture + `inventory_logistics--stock-balances/contract.json` | High | direct stock edits corrupt ledger truth | classify ledger as authority and balance as projection | verified |
| P03-CLAIM-008 | Dashboard or OEE views must not update machine state directly. | REPO_EVIDENCE | target architecture projection rule + P03 simulation rule | High | projection mutation | mark all analytics state as projection-only | verified |

## Canonical taxonomy decision summary

- `Party` is the canonical legal/person organization root. Customer and supplier become role-bearing views.
- `UserIdentity` is the authentication/authorization root; `EmployeeProfile` and `OperatorQualification` are linked identity/eligibility records, not duplicate roots.
- `Item` and `ItemRevision` remain separate lifecycle owners.
- `EngineeringReleaseBundle` becomes the canonical execution-ready definition root linking BOM, routing, control plan, inspection plan, and NC package.
- `EquipmentAsset` and `ToolingAsset` remain stable reference masters; runtime connectivity and analytics stay read-only projections.
- `InventoryLotSerialLedger` is transaction authority; balances are projections.

## Decision token

`P03_PASS_WITH_CONTROLLED_GAPS`
