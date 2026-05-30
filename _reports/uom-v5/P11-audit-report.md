# P11 Audit Report

Prompt: P11
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P11 commit: b0b0a2e5d430e633d7bdf6db4a87bfcb05a23a6e
Decision token: UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED

## Static Audit

- REPO_EVIDENCE: UoM control center and widget are marked as projections, not authority.
- REPO_EVIDENCE: fixture mode is default and live API requires explicit opt-in.
- REPO_EVIDENCE: calculator cannot submit a naked number because the button remains disabled without magnitude, quantity kind, unit source/target, and source system.
- REPO_EVIDENCE: widget `getValue()` exposes `quantity_kind`, `source_system`, `context`, `valid`, and `errors`.
- REPO_EVIDENCE: external alias ambiguity displays quarantine copy and does not set a canonical unit automatically.
- REPO_EVIDENCE: unit options carry `data-quantity-kind`, disabled state, and `disabled_reason_vi`/tooltip reason when filtered out.
- REPO_EVIDENCE: labels and feedback use Vietnamese with diacritics; input/select errors are associated through `aria-describedby` and `aria-invalid`.

## Commands

- TEST_EVIDENCE: `node --check mom/scripts/portal/80-uom-control-center.js` PASS.
- TEST_EVIDENCE: `node --check mom/scripts/portal/81-uom-quantity-widget.js` PASS.
- TEST_EVIDENCE: `php -l mom/tests/Unit/Uom/UomUiProjectionP11Test.php` PASS.
- TEST_EVIDENCE: `composer --working-dir=mom run test -- --filter 'UomUiProjectionP11|Uom.*Ui|QuantityWidget|ControlCenter'` PASS: 14 tests, 78 assertions.
- TEST_EVIDENCE: `grep -R "data-authority-class\|data-route-class" mom/scripts mom/portal.html | grep -i uom` PASS: both UoM scripts report projection markers.
- TEST_EVIDENCE: `composer --working-dir=mom run analyse -- --memory-limit=1G` PASS.
- TEST_EVIDENCE: `php tools/scripts/ai-index/generate.php --verbose` PASS.
- TEST_EVIDENCE: `git diff --check` PASS.
- CONTROLLED_GAP: `npm --prefix mom test -- uom` cannot run because `mom/package.json` is missing.

## Gate Result

PASS_WITH_WARNINGS.
