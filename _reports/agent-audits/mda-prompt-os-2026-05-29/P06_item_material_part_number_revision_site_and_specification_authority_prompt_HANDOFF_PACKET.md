# P06 Handoff Packet

## Decision token

`P06_PASS_WITH_CONTROLLED_GAPS`

## What P07 must read first

1. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/P06_item_material_part_number_revision_site_and_specification_authority_prompt_MAIN.md`
2. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_ITEM_FIELD_CATALOG.csv`
3. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/P06_item_material_part_number_revision_site_and_specification_authority_prompt_MATRIX.csv`
4. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/P06_item_material_part_number_revision_site_and_specification_authority_prompt_GAP_AND_REPAIR_LEDGER.csv`
5. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/P05_party_customer_supplier_employee_operator_and_user_authority_prompt_MAIN.md`
6. `/Users/a10/Documents/mom/_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_POSTGRES_BLUEPRINT.md`

## Locked decisions handed to P07

- Item enterprise identity is separate from released technical revision and from released document revision evidence.
- Site-local operational settings belong to ItemSite or future site/profile children, not to the enterprise item header.
- customer/supplier crossrefs must be versioned/effective-dated and must not overwrite transaction history.
- release package readiness for BOM/routing/control-plan/inspection-plan is now a hard downstream dependency for engineering definition authority.
- this branch intentionally did not modify UOM implementation; P07 must consume the dependency without changing UOM scope.

## Open controlled gaps

- `GAP-P06-001` canonical/legacy item key bridge pending
- `GAP-P06-002` crossref and approval physical objects pending
- `GAP-P06-003` inherited UOM dependency remains external to this branch
- `GAP-P06-004` normalized site/profile tables pending
- `GAP-P06-005` unified command/e-sign envelope pending

## Risks P07 must not ignore

- engineering definition release must reference the exact released ItemRevision and effectivity window
- customer/supplier approval dependencies from P05/P06 are still partial and cannot be assumed complete
- historical transaction snapshot rules already locked in P06 must not be weakened in BOM/routing/control-plan design

## Unlock statement

P06 leaves no unresolved P0/P1 blocker inside the prompt output. `P07` is unlocked under controlled-gap conditions.
