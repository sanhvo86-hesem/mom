# P15 Backfill Risk Register

Posture: development/prototype -> pre-production readiness candidate.

| ID | Risk | Control |
|---|---|---|
| P15-R01 | Field `weight=12` has no unit. | Classify `cannot_infer_unit`; quarantine; no shadow MEASVAL. |
| P15-R02 | Supplier `LB` is present but not canonicalized. | Resolve through supplier alias/contract; propose shadow MEASVAL only if evidence is explicit. |
| P15-R03 | Packaging `box` differs by item. | Require item packaging policy; item A with box=10 can shadow, item B unknown quarantines. |
| P15-R04 | IU/potency conversion lacks lot assay. | Require lot potency evidence; no generic IU conversion. |
| P15-R05 | Backfill rollback deletes original history. | Rollback deletes only shadow proposals; original fields are never overwritten. |
| P15-R06 | Vertical pack seeds treated as live authority. | Packs are seed/readiness artifacts only until governed approval. |
| P15-R07 | Field-name inference maps `weight` to kg. | Policy forbids guessing units from field names. |
