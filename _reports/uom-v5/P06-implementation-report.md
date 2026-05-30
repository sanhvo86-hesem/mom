# P06 Implementation Report

Prompt: P06 UCUM/QUDT/UNECE/OPC UA Alias Quarantine
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

## Scope

- REPO_EVIDENCE: P06 touched only parser, alias quarantine, external-code resolution, API alias response, focused tests, one additive migration, reports, and regenerated AI indexes.
- REPO_EVIDENCE: No domain mass backfill, UI remediation, full Problem Details redesign, or domain integration rollout was done.

## File Inventory Before

- `UomAliasResolutionService.php`: legacy resolver returned a canonical string or threw, and unknown aliases wrote a minimal quarantine record.
- `UomController.php`: `/uom/aliases/resolve` returned only `canonical_code`.
- No `UcumParser.php` service existed in `mom/api/services/Uom/`.
- `uom_alias_quarantine` stored alias, context, supplier, review status, optional AI suggestion, and raw payload, but not normalized alias/source/candidates/reason/trace id.

## File Inventory After

- `mom/api/services/Uom/UcumParser.php`
  - Added a governed UCUM golden-subset parser for ASCII atoms, `*`/`/` operators, integer exponents, brackets for special units, and affine temperature recognition.
  - Added `validateCatalogRow()` so catalog UCUM/canonical/quantity/dimension mismatch fails load contract.
  - Unknown atoms throw `UOM_UCUM_ATOM_CONTROLLED_GAP`.
- `mom/api/services/Uom/UomAliasResolutionService.php`
  - Added `resolveDetailed()` returning structured `resolved|ambiguous|unknown|rejected|pending_review` shape.
  - Preserved legacy `resolve()`, `resolveUnece()`, and `resolveOpcUaUnitId()` string APIs.
  - Added explicit ambiguous `M` candidates: meter, molar concentration, month, million.
  - Added EDI 6411/UNECE verified external-code lookup and OPC UA EUInformation lookup.
  - Unknown or ambiguous inputs write quarantine rows with candidates, raw payload, reason, and trace id.
- `mom/database/migrations/258_uom_v5_alias_quarantine_contract.sql`
  - Added nullable normalized/source/reason/trace columns and non-null candidates JSONB default.
  - Added trace id index.
- `mom/api/controllers/UomController.php`
  - Alias resolve endpoint now returns structured alias result and accepts trace/source payload.
- `mom/tests/Unit/Uom/UomAliasResolutionP06Test.php`
  - Covers required alias/EDI/OPC UA simulations and legacy compatibility.
- `mom/tests/Unit/Uom/UcumParserP06Test.php`
  - Covers required UCUM parser/affine/catalog-mismatch simulations.
- `_reports/uom-v5/P06-controlled-gap-manifest.md`
  - Records the controlled subset and remaining catalog-universe gaps.

## Commands And Results

- `php -l` for modified P06 PHP files: PASS.
- `composer --working-dir=mom run test -- --filter 'Uom.*Alias|Ucum|External|P06'`: PASS, 9 tests, 35 assertions.
- `grep -R "alias.*default" mom/api/services/Uom`: PASS, no output.
- `composer --working-dir=mom run test -- --filter 'Uom|Alias|Ucum|External'`: PASS, 133 tests, 308 assertions, 1 skipped.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: PASS, 0 errors.
- `php tools/scripts/ai-index/generate.php --verbose`: PASS.
- `git diff --check`: PASS.
- `composer --working-dir=mom run check`: WARN, PHPStan passed; full PHPUnit failed on existing KPI registry count drift, `148 is identical to 142`.

## Acceptance Gates

- External strings canonicalize or quarantine: PASS.
- Ambiguous `M` does not default to meter: PASS.
- EDI 6411 KGM resolves only through verified external map: PASS.
- OPC UA unknown engineeringUnitId quarantines: PASS.
- UCUM `ug/mL` parses to mass concentration: PASS.
- `Cel` and `[degF]` are special affine, not factor-only: PASS.
- Full repository check: PASS_WITH_WARNINGS due unrelated KPI count drift.

## Residual Risk Ledger

- WARNING: `composer check` remains red on unrelated KPI registry count drift.
- CONTROLLED_GAP: Full UCUM universe and QUDT catalog backfill remain out of P06 scope.
- CONTROLLED_GAP: API Problem Details parity for structured alias statuses remains P10.
- CONTROLLED_GAP: UI remediation display for quarantine statuses remains P11.
