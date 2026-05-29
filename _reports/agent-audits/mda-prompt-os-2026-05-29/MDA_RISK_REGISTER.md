# MDA Risk Register

## Highest risks

1. Hidden JSON authority persists behind new PG models.
2. Partial command rollout leaves fragmented mutation lanes.
3. Release packages exist conceptually but not physically.
4. Quality hold fragmentation causes shipment or issue leakage.
5. OT adapter trust is too permissive and creates unsafe readiness.
6. UI projections reintroduce authority via convenience actions.
7. Migration cutover proceeds without restore proof or drift-zero evidence.

## Mitigations

- freeze governed CRUD before rollout
- enforce command-only mutation
- gate every wave with simulation and reconciliation
- keep controlled gap ledger live and exportable
