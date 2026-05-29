# P35 Implementation Plan

## Scope Selected

P35 ran as a hybrid runtime-repair slice. The safe scope is to physicalize command-time policy targets and add a side-effect-free service, not to rewrite the full tooling, calibration, MES, or EQMS controllers.

Implemented:

- `239_tooling_gage_authority_runtime_gates.sql` for tool life policy, compatibility rules, breakage suspect windows, MSA gate policies, and OOT impact scopes.
- `ToolingGageAuthorityService` for tool life, preset/offset, compatibility, breakage containment, gage calibration/MSA, and OOT impact decisions.
- Optional P35 integration into `ResourceReadinessService`.
- Unit tests and direct smokes for all mandatory P35 simulations.
- Generic CRUD denylist and governed registry updates.
- Runtime proof matrix updates for equipment, tooling, quality, WO, and MES roots.

## Files To Edit

- `mom/database/migrations/239_tooling_gage_authority_runtime_gates.sql`
- `mom/api/services/ToolingGageAuthorityService.php`
- `mom/api/services/ResourceReadinessService.php`
- `mom/tests/Unit/Services/ToolingGageAuthorityServiceTest.php`
- `mom/api/controllers/GenericCrudController.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

## Files Forbidden

- No UOM files.
- No live production/order controller rewrite.
- No generated `table-registry.json` rewrite.
- No mutation of existing tooling/calibration data.

## Runtime Delta

The new service returns deterministic plans/decisions:

- `tool_life_below_stop_threshold` blocks start/load.
- `tool_assembly_machine_family_incompatible` blocks load.
- `tool_breakage_suspect_window_required` builds a suspect window from last good checkpoint to breakage and creates a P33 quality containment plan.
- `gage_calibration_expired`, `gage_oot_open`, and `gage_msa_not_acceptable` block CTQ results.
- `gage_oot_impact_scope_required` identifies WIP/lot/serial/shipment/customer impact scope.

## Remaining Integration Work

- Live command handlers must persist 239 tables with P31 audit/outbox and P32 evidence where release/override is regulated.
- Tool/gage live repositories must replace caller-supplied evidence arrays.
- Breakage and OOT impacts must create actual `quality_holds`, NCR/CAPA/MRB decisions and inventory/WIP ledger impacts in P36/P37.

## Decision

P36 is unlocked because tooling/gage authority is now physicalized at service/schema/test level. Runtime authority remains controlled-gap until live command handlers write the authority tables.
