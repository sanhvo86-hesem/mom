# P05 Handoff Packet

## Decision token

`P05_PASS_WITH_CONTROLLED_GAPS`

## What P06 must read first

1. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/P05_party_customer_supplier_employee_operator_and_user_authority_prompt_MAIN.md`
2. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_PARTY_FIELD_CATALOG.csv`
3. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/P05_party_customer_supplier_employee_operator_and_user_authority_prompt_MATRIX.csv`
4. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/P05_party_customer_supplier_employee_operator_and_user_authority_prompt_GAP_AND_REPAIR_LEDGER.csv`
5. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_CONTROLLED_GAP_LEDGER.csv`
6. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_POSTGRES_BLUEPRINT.md`

## Locked decisions handed to P06

- `Party` is the business-party root; `UserIdentity` remains a separate human-login root.
- `EmployeeProfile` and `OperatorProfile` must reference UserIdentity/employee SSOT; they are not free-standing person masters.
- `CustomerProfile` and `SupplierProfile` are currently compatibility-owner profiles attached conceptually to Party but still backed by legacy/runtime tables.
- customer-item approval and supplier-process approval are now explicit open dependencies for item/revision authority design.
- any item/revision release gate that depends on operator, customer, supplier, or approver identity must use the P05 link model and not invent new person tables.

## Open controlled gaps

- `GAP-P05-001` user-party physical bridge pending
- `GAP-P05-002` operator qualification authority consolidation pending
- `GAP-P05-003` customer-item and supplier-process approval objects pending
- `GAP-P05-004` duplicate merge remap catalog pending
- `GAP-P05-005` command-surface MFA/re-auth enforcement pending

## Risks P06 must not ignore

- item/revision release rules must not assume customer/supplier approvals already exist physically
- operator authorization and training evidence are not yet one canonical PG chain
- runtime registries still expose legacy customer/supplier/employee names; do not silently rename public contracts in P06

## Unlock statement

P05 does not leave any unresolved P0/P1 blocker. `P06` is unlocked under controlled-gap conditions.
