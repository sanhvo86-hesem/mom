# P00 Handoff Packet

## Next prompt

`P01`

## Files P01 must read

- `MDA_AUTHORITY_CONSTITUTION.md`
- `MDA_SOURCE_MAP.md`
- `MDA_MASTER_TRACEABILITY_MATRIX.csv`
- `MDA_CONTROLLED_GAP_LEDGER.csv`
- `MDA_CONFLICT_LEDGER.csv`
- `docs/backend/RUNTIME_AUTHORITY_MAP.md`
- `docs/backend/DOMAIN_COMMAND_SPEC.md`
- `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md`
- `mom/api/services/MasterDataService.php`
- `mom/database/DataLayer.php`
- `mom/database/RuntimeShadowSync.php`
- `mom/api/controllers/GenericCrudController.php`

## Risks to carry forward

- Existing repo contains concurrent unrelated changes.
- UOM authority is likely schema-heavy and runtime-light.
- Master-data runtime truth may differ from documented target state.

