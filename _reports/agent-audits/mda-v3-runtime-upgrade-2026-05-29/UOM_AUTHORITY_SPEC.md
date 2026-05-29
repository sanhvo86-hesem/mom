# UOM Authority Spec

REPO_ROOT=/Users/a10/Documents/mom-mda-v3-runtime-20260529
PROMPT_ID=P25
DATE=2026-05-29

## Canonical Decision

Canonical UOM definition authority is `uom`.

Canonical conversion authority is `uom_conversion_authority`, introduced by migration `213_uom_measurement_authority.sql`.

Legacy `mdm_uom_conversions` remains compatibility input only. It must not be treated as runtime authority for downstream commands.

## Required Fields

| Object | Required Fields |
|---|---|
| UOM definition | `uom_code`, `uom_name`, `dimension_code`, `measurement_system`, `precision_scale`, `rounding_mode`, `approval_status`, `status_code`, `effective_from`, `effective_to`, `approved_at`, `approved_by`, `row_version`, `metadata` |
| UOM conversion | `from_uom_code`, `to_uom_code`, `dimension_code`, `scope_type`, `scope_ref`, `numerator`, `denominator`, `rounding_mode`, `precision_scale`, `approval_status`, `effective_from`, `effective_to`, `packaging_policy_ref`, `created_by`, `approved_by`, `approved_at`, `row_version`, `metadata` |

## Authority Rules

| Rule | Enforcement |
|---|---|
| One definition authority | `uom` is the only definition authority. |
| One conversion authority | `uom_conversion_authority` is the only conversion authority. |
| No local conversion | Downstream commands must call `UomAuthorityService::convertQuantity()`. |
| No incompatible dimension | Cross-dimensional conversion is blocked unless `packaging_policy_ref` exists. |
| No ambiguous active conversion | Same from/to/scope/effectivity overlap is blocked by service and indexed by migration. |
| Released data cannot use draft UOM | `assertUomApprovedForRelease()` blocks draft or retired UOMs. |
| Ledger quantities preserve source and normalized values | Ledger-capable commands must store source qty/UOM plus normalized qty/UOM and conversion snapshot. |
| Runtime command audit | Service emits command audit envelopes for UOM lifecycle and conversion. |

## Implemented In P25

| Artifact | Coverage |
|---|---|
| `mom/database/migrations/213_uom_measurement_authority.sql` | Adds UOM authority columns and canonical `uom_conversion_authority`. |
| `mom/api/services/UomAuthorityService.php` | Provides lifecycle commands, conversion, effectivity, dimension validation, rounding, audit, authority probe. |
| `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Covers BOX to PCS, KG to PCS block, ambiguity, effectivity, rounding, draft release block. |

## Still Controlled After P25

Downstream services still need to call `UomAuthorityService` in their own owner prompts. P25 intentionally does not rewrite item, procurement, inventory, MES, quality, packaging, costing, or tooling flows in one broad change.
