# P09 Implementation Report

Prompt: P09 MEASVAL Evidence, Immutability & Digital Thread
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P09 commit: 3ac8a1bad7f4e088dd2222641dc4599716395c7a
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.
Decision token: UOM_V5_P09_MEASVAL_DIGITAL_THREAD_LOCKED

## Scope

- REPO_EVIDENCE: P09 touched MEASVAL factory evidence, naked-number scanner, tests, reports, and regenerated AI indexes.
- REPO_EVIDENCE: No broad domain form remediation or historical backfill was done.

## File Inventory After

- `MeasurementValueFactory.php`
  - Adds `original_input`, canonical normalization aliases, display aliases, evidence trace/link/hash fields, rule manifest/e-sign refs, AI advisory refs, and digital thread links.
  - Hash payload now includes contextual evidence and linked record/advisory references.
- `NakedNumberMeasurementScanner.php`
  - Adds reusable scanner for measurement-like numeric fields without adjacent units.
- `MeasurementValueP09Test.php`
  - Covers required P09 simulations.
- `P09-naked-number-backlog.json`
  - Records scanner output categories and sample backlog from required grep evidence.

## Commands And Results

- `php -l` for modified P09 PHP files: PASS.
- `composer --working-dir=mom run test -- --filter 'MeasurementValueP09|MeasurementValue|Measval|DigitalThread|Uom'`: PASS, 147 tests, 330 assertions, 1 skipped.
- `grep -R "temperature\|weight\|length\|qty\|quantity\|measurement" mom/data mom/scripts mom/api | head -200`: REVIEWED, backlog created.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: PASS, 0 errors.
- `php tools/scripts/ai-index/generate.php --verbose`: PASS.
- `git diff --check`: PASS.
- `composer --working-dir=mom run check`: WARN, PHPStan passed; full PHPUnit failed on existing KPI registry count drift, `148 is identical to 142`.

## Acceptance Gates

- Original input is preserved separately from display: PASS.
- Canonical normalization is derived from input affine/contextual evidence: PASS.
- Hash replay passes and rule-version mutation changes hash: PASS.
- Naked `temperature: 37` is flagged by scanner: PASS.
- AI advisory reference is stored as advisory-only: PASS.
- Full domain form remediation: CONTROLLED_GAP for P12/P15.

## Residual Risk Ledger

- WARNING: `composer check` remains red on unrelated KPI registry count drift.
- CONTROLLED_GAP: Scanner backlog is created; domain-wide repair is intentionally deferred.
