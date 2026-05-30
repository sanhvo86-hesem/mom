# P12 Operational Simulation

Prompt: P12
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P12 commit: 8923fba6e9253bf130fa993efc7989db3ec99a2b
Decision token: UOM_V5_P12_DOMAIN_INTEGRATION_LOCKED

## Required Simulations

| Simulation | Result | Evidence |
|---|---|---|
| SIM-P12-01 supplier PO lb received into kg inventory | PASS_AS_CONTRACT | Registry sequence SUP -> PO -> ITEM requires original supplier lb, canonical kg, item policy, and audit hash. |
| SIM-P12-02 inspection spec mm, device sends inch | PASS_AS_CONTRACT | Registry sequence MDEV -> INSP requires original inch, normalized mm, device id, spec id, and rule version. |
| SIM-P12-03 batch release sees changed measurement | PASS_AS_CONTRACT | Registry sequence INSP -> BREL requires original entry, correction event, audit trail, and release signature visibility. |
| SIM-P12-04 work order potency adjusted raw material | PASS_AS_CONTRACT | Registry sequence ITEM -> WO -> LOT requires potency evidence, recipe unit, actual consumption MEASVAL, and lot link. |
| SIM-P12-05 analytics normalized kg with original lb drill-through | PASS_AS_CONTRACT | Registry sequence PO -> LOT -> Analytics/AI requires normalized kg, source supplier lb, read-only analytics, and no override. |

## Broader Scenario Sweep

- Golden case pass: TEST_EVIDENCE: focused suite passed after repair.
- Negative case fail correctly: TEST_EVIDENCE: first focused run failed on a registry/test mismatch, repair was made, and tests then passed.
- Boundary precision/overflow: REPO_EVIDENCE: P12 delegates math to UoM engine and does not add arithmetic.
- Permission denied: REPO_EVIDENCE: P12 adds no mutation route.
- Stale cache/effective date: REPO_EVIDENCE: P12 contract requires replay evidence, not cached UI authority.
- Audit hash replay: REPO_EVIDENCE: simulation contracts require audit hash or equivalent drill-through.
- External alias quarantine: REPO_EVIDENCE: authority policy names `uom_alias_quarantine`.
- UI/API parity: REPO_EVIDENCE: P12 uses P10/P11 contracts as prior authority and does not change UI/API surfaces.

## Simulation Result

PASS_WITH_WARNINGS.
