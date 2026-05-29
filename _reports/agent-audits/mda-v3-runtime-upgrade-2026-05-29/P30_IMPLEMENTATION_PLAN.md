# P30 Implementation Plan

## Scope

P30 physicalizes EngineeringReleasePackage authority and proves the release gate pattern in a narrow slice. It does not implement final command/API/e-sign/outbox runtime, and it does not wire SO/JO/WO release controllers yet.

## Files To Edit

- `mom/database/migrations/234_engineering_release_package_authority.sql`
- `mom/api/services/EngineeringReleasePackageAuthorityService.php`
- `mom/tests/Unit/Services/EngineeringReleasePackageAuthorityServiceTest.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

## Files Forbidden For This Prompt

- UOM authority files.
- User identity SSOT files.
- Generated `mom/contracts/table-registry.json`.
- Broad order/work-order release controllers, because P31/P34 own command/runtime integration.
- Quality hold/NCR/MRB/CAPA runtime, because P33 owns canonical quality containment.

## Runtime Delta

- Add `engineering_release_package` as physical root.
- Add `engineering_release_package_member` with member type, record table/id, version, hash, status, and effectivity.
- Add `engineering_release_package_approval` for customer/supplier/engineering/quality/tooling approval and e-sign hooks.
- Add `engineering_release_package_binding` for SO/JO/WO/production-order package binding.
- Add `work_order_engineering_package_snapshot` to freeze package hash and member manifest at WO release.
- Add DB triggers that block core/member/approval mutation after package release.
- Add `EngineeringReleasePackageAuthorityService` gates for missing inspection plan, NC checksum mismatch, released package mutation, WO snapshot hash binding, and customer-specific approval evidence.

## Repair Decisions

- P23-P0-006 and P23-P0-007 are repaired at physical schema level because package root and member tables now exist.
- P23-P0-009 remains open for runtime command wiring because SO/JO/WO release services do not yet call this package authority.
- P23-P0-010 remains open because runtime audit still reports `JSON_ONLY`.
- P31/P32/P34/P37/P40 retain command/e-sign/readiness/generated-registry/cutover ownership.

## Verification Plan

- PHP lint for new service, test, and touched controller.
- Bulk PHP lint for services/controllers.
- JSON validation for governed entity registry.
- Direct PHP smoke for missing inspection plan, NC checksum mismatch, and WO snapshot hash.
- Runtime authority audit to prove no false PostgreSQL readiness claim.
- Migration drift check.
- `git diff --check`.
