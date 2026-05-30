# P12 Defect And Repair Log

Prompt: P12
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P12 commit: 8923fba6e9253bf130fa993efc7989db3ec99a2b
Decision token: UOM_V5_P12_DOMAIN_INTEGRATION_LOCKED

## Defects Found And Repaired

| ID | Finding | Repair | Status |
|---|---|---|---|
| P12-D01 | TEST_EVIDENCE: focused test expected pricing policy phrase `price/currency`, registry used `price and currency`. | Updated registry policy to `commercial price/currency truth...` and reran focused tests. | Fixed |

## Controlled Backlog

| ID | Finding | Classification |
|---|---|---|
| P12-G01 | Legacy commercial intake defaults UoM to `EA`. | CONTROLLED_GAP: backlog P12-BL-001/P12-BL-002. |
| P12-G02 | MES execution and genealogy retain `quantity/uom` legacy fields. | CONTROLLED_GAP: backlog P12-BL-003/P12-BL-004. |
| P12-G03 | EQMS FAI/special-characteristic specs persist `unit_of_measure`. | CONTROLLED_GAP: backlog P12-BL-005/P12-BL-006. |
| P12-G04 | Batch release and SCAR runtime scripts render plain quantities. | CONTROLLED_GAP: backlog P12-BL-007/P12-BL-008. |
| P12-G05 | Equipment cadence/analytics payloads need canonical measurement drill-through. | CONTROLLED_GAP: backlog P12-BL-009/P12-BL-010. |

## Repair Loop Result

IMPLEMENT -> STATIC AUDIT -> ADVERSARIAL CRITIQUE -> OPERATIONAL SIMULATION -> DEFECT LIST -> REPAIR -> RETEST -> REPORT -> DECISION TOKEN completed for P12.
