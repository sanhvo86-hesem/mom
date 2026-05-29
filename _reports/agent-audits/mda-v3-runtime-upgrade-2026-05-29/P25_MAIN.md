# P25 UOM And Measurement Authority War Room

REPO_ROOT=/Users/a10/Documents/mom-mda-v3-runtime-20260529
REPORT_DIR=_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29
PROMPT_ID=P25
IMPLEMENTATION_MODE=hybrid_apply_patch
DATE=2026-05-29
PREVIOUS_HANDOFF=_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P24_HANDOFF_PACKET.md

## 1. Executive Verdict

P25 implemented a minimal canonical UOM authority spine:

| Artifact | Result |
|---|---|
| Migration | Added `213_uom_measurement_authority.sql` with additive UOM fields and `uom_conversion_authority`. |
| Service | Added `UomAuthorityService` with lifecycle commands, conversion, dimension/effectivity/rounding validation, audit envelopes, and authority probe. |
| Tests | Added `UomAuthorityServiceTest` and executed direct PHP scenario smoke for required P25 scenarios. |
| Policy | Declared `uom` as definition authority and `uom_conversion_authority` as conversion authority. |

Decision token:

```text
P25_PASS_WITH_CONTROLLED_GAPS
```

Rationale: Core UOM authority path is no longer design-only, but downstream command integration remains open for P27/P30/P31/P33/P34/P36 and PostgreSQL runtime is not active in this environment. Do not claim UOM production authority yet.

## 2. Source Truth Audit

| Source | Evidence Summary | P25 Use |
|---|---|---|
| `MDA_V3_P0_P1_BLOCKER_REGISTER.csv` | P25 owns P23-P0-004 and P23-P0-008. | Targeted remediation. |
| `MDA_V3_RUNTIME_PROOF_MATRIX.csv` | `ROOT-FOUND-001` blocked by UOM authority ambiguity. | Score improvement input. |
| `064_master_data_governance.sql` | Existing `mdm_uom_conversions` has only from/to/factor and lacks lifecycle/effectivity/rounding. | Classified as compatibility input. |
| `072_canonical_foundation_governance.sql` | Existing `uom` table has definition fields but lacks full authority fields. | Selected as definition authority. |
| `091_runtime_governance_continuity.sql` | Adds lineage/row_version to `uom`. | Preserved and extended. |
| `RuntimeShadowSync.php` and runtime services | UOM fields are consumed as text/defaults in downstream paths. | Downstream map. |
| `table-registry.json` | Both `uom` and `mdm_uom_conversions` registered. | Needed explicit authority decision. |

## 3. Runtime Evidence Probe

Required command summaries:

```text
pwd -> /Users/a10/Documents/mom-mda-v3-runtime-20260529
git status --short -> clean before P25 edits
git rev-parse --short HEAD -> 37189ee94
remote branches -> active codex branches exist; work stayed isolated on codex/mda-v3-runtime-upgrade-20260529
```

UOM inventory findings:

| Finding | Evidence |
|---|---|
| Existing definition table | `uom` in migration 072. |
| Existing conversion table | `mdm_uom_conversions` in migration 064. |
| Existing UOM schema uplift | migration 091 adds lineage and row version to `uom`. |
| Runtime local defaults | Email intake, CPO, shopfloor, and runtime sync paths default missing UOM to `EA`. |
| No complete conversion authority service | No existing dedicated UOM service found before P25. |

## 4. Files Changed / Files Intentionally Not Changed

Files created:

| File | Purpose |
|---|---|
| `mom/database/migrations/213_uom_measurement_authority.sql` | Additive canonical UOM conversion authority schema. |
| `mom/api/services/UomAuthorityService.php` | Canonical UOM lifecycle and conversion service. |
| `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | PHPUnit coverage for required P25 scenarios. |
| `UOM_AUTHORITY_SPEC.md` | Authority decision and field spec. |
| `UOM_CONVERSION_POLICY.md` | Formula, rounding, dimension, effectivity, scope, compatibility policy. |
| `UOM_COMMAND_CATALOG.csv` | UOM command catalog. |
| `UOM_RUNTIME_TEST_PLAN.md` | Test plan and execution results. |
| `UOM_DOWNSTREAM_INTEGRATION_MAP.csv` | Downstream integration map. |
| `P25_MAIN.md` | Main P25 report. |
| `P25_HANDOFF_PACKET.md` | Handoff to P26. |

Intentionally not changed:

| File Class | Reason |
|---|---|
| Broad downstream services | Prompt would become unsafe and cross-domain. Map created for owner prompts instead. |
| Existing `mdm_uom_conversions` table | Kept as compatibility input for migration bridge. |
| Concurrent UOM file in original checkout | User warned not to touch UOM work from other sessions; work stayed in isolated worktree. |
| Runtime data files | P25 uses schema/service/test only. |

## 5. Design Or Code Delta

Key delta:

| Before P25 | After P25 |
|---|---|
| `uom` existed with basic definition fields. | `uom` receives dimension, measurement system, precision, rounding, approval, effectivity fields. |
| `mdm_uom_conversions` existed as simple from/to/factor table. | `uom_conversion_authority` is canonical conversion authority with scope, effectivity, rounding, approval, and audit-compatible fields. |
| No dedicated UOM conversion service. | `UomAuthorityService` centralizes conversion and blocks local ambiguity. |
| P25 scenarios were narrative. | Direct PHP smoke executed required scenarios despite PHPUnit vendor being unavailable. |

## 6. Operational Simulation Matrix

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SIM-P25-001 | BOX to PCS approved | warehouse | Convert 10 BOX to PCS | One active count conversion | none in smoke | conversion audit | PHP smoke and PHPUnit test | Idempotent read | 500 PCS | Ledger wrong qty | Inventory command test P36 |
| SIM-P25-002 | KG to PCS no policy | warehouse | Create conversion | Dimension gate | none | rejection evidence | PHP smoke and PHPUnit test | Retry with policy only | blocked | Mass converted to pieces | Packaging policy test |
| SIM-P25-003 | Duplicate active BOX to PCS | MDM | Create second conversion | Ambiguity gate | none | rejection evidence | scenario smoke and PHPUnit test | Retire/supersede first | blocked | Two factors active | DB overlap test |
| SIM-P25-004 | Conversion changes after WO release | planner | Convert at old and new dates | Effectivity gate | none | conversion snapshot | scenario smoke and PHPUnit test | Re-run by command timestamp | old WO 50 new WO 60 | running WO silently changes | WO snapshot test P34 |
| SIM-P25-005 | Fractional issue qty | warehouse | Convert 1 BOX at 2.5 PCS floor | Rounding policy | none | conversion audit | scenario smoke and PHPUnit test | Repeat deterministic | 2 PCS | inconsistent rounding | Ledger rounding test P36 |
| SIM-P25-006 | Draft BAG UOM | engineer | Release item revision | UOM approval gate | none | rejection evidence | scenario smoke and PHPUnit test | Approve UOM first | blocked | released item uses draft UOM | Item release test P27 |

## 7. Multi-Role Adversarial Audit

| Role | Challenge | Result |
|---|---|---|
| Procurement | Supplier pack sizes cannot be global. | Policy supports `supplier_item` scope. |
| Inventory | Ledger needs source and normalized quantities. | Downstream map mandates both fields and conversion snapshot. |
| Cost accounting | Rounding can distort unit cost. | Deterministic rounding mode and precision are required. |
| MES | WO must not change after conversion update. | Effectivity and snapshot rule added and smoke tested. |
| Quality | Sample units cannot mix mass and count. | Dimension mismatch blocks without packaging policy. |
| Tooling | Measurement units need gage-compatible dimensions. | Downstream P34/P33 integration mapped. |
| Migration reviewer | `mdm_uom_conversions` still exists. | It is explicitly compatibility input only. |
| Security/audit | UOM commands need audit. | Service returns audit envelope for lifecycle/conversion commands. |
| Release manager | P25 should not rewrite all downstream flows. | Integration map delegates broad wiring to owner prompts. |

## 8. Gap Ledger Update

| Blocker | P25 Status |
|---|---|
| P23-P0-004 UOM lifecycle command sync validation | Core service and schema implemented; runtime DB deployment and command routing still pending. |
| P23-P0-008 item commands consume one governed UOM source | Still open for P27 because item/revision commands are not wired in P25. |
| Downstream local UOM defaults | Still open as controlled integration debt mapped to P27/P30/P31/P33/P34/P36. |

P25 reduces UOM from design-only to implementation-partial. It does not claim production authority because PostgreSQL is inactive and downstream commands are not yet wired.

## 9. CI/Test Evidence

| Command | Result |
|---|---|
| `php -l mom/api/services/UomAuthorityService.php` | Pass |
| `php -l mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Pass |
| `php -l mom/api/services/MasterDataService.php` | Pass |
| `php -l mom/database/DataLayer.php` | Pass |
| Direct PHP smoke for BOX to PCS and KG to PCS block | Pass |
| Direct PHP scenario smoke for ambiguity, effectivity, rounding, draft release block | Pass |
| `composer test -- --filter Uom` | Blocked: root Composer script `test` not defined |
| `composer --working-dir=mom test -- --filter Uom` | Blocked: `vendor/bin/phpunit` missing |
| `php mom/tools/audit_runtime_authority_consistency.php` | Runs and reports JSON_ONLY with PostgreSQL inactive |

## 10. Decision Token

```text
P25_PASS_WITH_CONTROLLED_GAPS
```

## 11. Handoff Packet

```text
_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P25_HANDOFF_PACKET.md
```
