# 12 — Data Model, Master Data and MDM
## Principle

Master data is not just lookup data. ITEM, CUST, SUP, EQP and MDEV are dependency roots that determine whether downstream workflow, quality and execution evidence is valid.

## Master data gates

| Root | Gate | Evidence |
| --- | --- | --- |
| ITEM | unique item identity, revision policy, UOM, lifecycle | duplicate scan + revision/effectivity test |
| CUST | customer identity, sites, terms, compliance flags | customer merge/split audit |
| SUP | qualification, approved item/scope, risk | supplier qualification and SCAR linkage |
| EQP | asset status, PM, calibration, OT zone | equipment eligibility for WO/OPER |
| MDEV | calibration/MSA status and measurement capability | inspection measurement eligibility |

## Data model rules

- Separate identity from status.
- Model effectivity windows explicitly.
- Every cross-root reference names authority root and version.
- Use immutable event/audit facts for changes, not silent overwrite.
- Data products consume CDC contracts, not ad hoc queries.
