# V21 NQCASE Live API Warning Review

Historical decision: `LIVE_API_TOGGLE_NQCASE_PASS_WITH_WARNINGS`

## Current Replay Evidence

- Historical report exists: `_reports/module-template-v4/S_LIVE_API_TOGGLE_NQCASE_REPORT.md`.
- Live API enabled grep found only opt-in fixture pages under `tests/fixtures/module-template-v4/pages/`.
- `mom/portal.html` did not show default live API enablement.
- Production portal did not load `74-module-template-v4-fixtures.js`.
- Focused `module-template-v4-live-api.spec.ts` could not launch Chromium because the Playwright browser executable is missing.

## Warning Classification

NQCASE live API toggle remains a warning, not a V21 hard source failure, because current static safety confirms opt-in-only posture. Runtime browser proof is blocked locally.

## Owner Path

HMV4 live API toggle owner and QA/DevEx owner for Playwright browser installation.

## Next Action

Install Chromium for Playwright and rerun the focused live-api spec. Do not enable live API by default.
