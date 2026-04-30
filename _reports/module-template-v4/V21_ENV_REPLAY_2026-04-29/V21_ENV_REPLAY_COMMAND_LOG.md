
```bash
pwd
```
/Users/a10/Documents/mom-v21-env-replay-20260429

[exit=0]

```bash
git remote -v
```
origin	https://github.com/sanhvo86-hesem/mom.git (fetch)
origin	https://github.com/sanhvo86-hesem/mom.git (push)

[exit=0]

```bash
git branch --show-current
```
codex/v21-env-replay-20260429

[exit=0]

```bash
git status --short
```
?? _reports/module-template-v4/V21_ENV_REPLAY_2026-04-29/

[exit=0]

```bash
git rev-parse HEAD
```
d555d0d5a7c16df083d1a7e173b9ad97a9402e45

[exit=0]

```bash
git rev-parse origin/main || true
```
d555d0d5a7c16df083d1a7e173b9ad97a9402e45

[exit=0]

```bash
git diff --name-only
```

[exit=0]

```bash
node --check mom/scripts/portal/70-module-template-v4-hydration.js
```

[exit=0]

```bash
node --check mom/scripts/portal/71-module-template-v4-routes.js
```

[exit=0]

```bash
node --check mom/scripts/portal/72-module-template-v4-bridge.js
```

[exit=0]

```bash
node --check mom/scripts/portal/73-module-template-v4-renderers.js
```

[exit=0]

```bash
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
```

[exit=0]

```bash
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"
```
PASS no fixture production load

[exit=0]

```bash
git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden/current portal diff" || echo "PASS forbidden/current portal diff"
```
PASS forbidden/current portal diff

[exit=0]

```bash
python3 - <<'PY'
import json, pathlib, sys
for p in pathlib.Path('tests/fixtures/module-template-v4').rglob('*.json'):
    try:
        json.loads(p.read_text())
        print('PASS json', p)
    except Exception as e:
        print('FAIL json', p, e)
        sys.exit(1)
PY
```
PASS json tests/fixtures/module-template-v4/a11y-fixtures.json
PASS json tests/fixtures/module-template-v4/shell-fixtures.json
PASS json tests/fixtures/module-template-v4/screenshot-matrix.json
PASS json tests/fixtures/module-template-v4/batch-release-record-fixtures.json
PASS json tests/fixtures/module-template-v4/sales-order-record-fixtures.json
PASS json tests/fixtures/module-template-v4/capa-record-fixtures.json
PASS json tests/fixtures/module-template-v4/nonconformance-case-fixtures.json
PASS json tests/fixtures/module-template-v4/nav-shell-fixtures.json
PASS json tests/fixtures/module-template-v4/bridge-fixtures.json
PASS json tests/fixtures/module-template-v4/dispatch-board-fixtures.json
PASS json tests/fixtures/module-template-v4/engineering-change-record-fixtures.json
PASS json tests/fixtures/module-template-v4/training-matrix-fixtures.json
PASS json tests/fixtures/module-template-v4/workspace-fixtures.json
PASS json tests/fixtures/module-template-v4/work-order-record-fixtures.json
PASS json tests/fixtures/module-template-v4/cdoc-record-fixtures.json
PASS json tests/fixtures/module-template-v4/state-fixtures.json
PASS json tests/fixtures/module-template-v4/job-order-record-fixtures.json
PASS json tests/fixtures/module-template-v4/record-fixtures.json
PASS json tests/fixtures/module-template-v4/route-fixtures.json
PASS json tests/fixtures/module-template-v4/inspection-record-fixtures.json
PASS json tests/fixtures/module-template-v4/customer-purchase-order-record-fixtures.json
PASS json tests/fixtures/module-template-v4/registries/routes/hmv4-route-registry.json

[exit=0]

```bash
npm install --no-package-lock
```

added 5 packages, and audited 6 packages in 3s

found 0 vulnerabilities

[exit=0]

```bash
npx playwright install chromium
```
Downloading Chrome for Testing 147.0.7727.15 (playwright chromium v1217)[2m from https://cdn.playwright.dev/builds/cft/147.0.7727.15/mac-arm64/chrome-mac-arm64.zip[22m
|                                                                                |   0% of 165.5 MiB
|■■■■■■■■                                                                        |  10% of 165.5 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 165.5 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 165.5 MiB
Chrome for Testing 147.0.7727.15 (playwright chromium v1217) downloaded to /Users/a10/Library/Caches/ms-playwright/chromium-1217
Downloading FFmpeg (playwright ffmpeg v1011)[2m from https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-mac-arm64.zip[22m
|                                                                                |   1% of 1 MiB
|■■■■■■■■                                                                        |  10% of 1 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  31% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  61% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 1 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 1 MiB
FFmpeg (playwright ffmpeg v1011) downloaded to /Users/a10/Library/Caches/ms-playwright/ffmpeg-1011
Downloading Chrome Headless Shell 147.0.7727.15 (playwright chromium-headless-shell v1217)[2m from https://cdn.playwright.dev/builds/cft/147.0.7727.15/mac-arm64/chrome-headless-shell-mac-arm64.zip[22m
|                                                                                |   0% of 92 MiB
|■■■■■■■■                                                                        |  10% of 92 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 92 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 92 MiB
Chrome Headless Shell 147.0.7727.15 (playwright chromium-headless-shell v1217) downloaded to /Users/a10/Library/Caches/ms-playwright/chromium_headless_shell-1217

[exit=0]

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
CHROMIUM_EXIT=$?
echo "CHROMIUM_EXIT=${CHROMIUM_EXIT}"
```

Running 491 tests using 4 workers

(node:96582) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:96584) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:96583) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:96585) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:96583) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:96585) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:96582) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:96584) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓    3 [chromium] › module-template-v4-accessibility.spec.ts:4:3 › module-template-v4 accessibility baseline › breadcrumb and main landmarks exist (1.9s)
  ✓    1 [chromium] › module-template-v4-keyboard.spec.ts:4:3 › module-template-v4 keyboard baseline › record tabs support arrow-key focus movement (2.1s)
  ✓    2 [chromium] › module-template-v4-bridge.spec.ts:4:3 › module-template-v4 bridge adapter › maps legacy dispatch page key to canonical dispatch board (2.1s)
  ✓    6 [chromium] › module-template-v4-keyboard.spec.ts:14:3 › module-template-v4 keyboard baseline › dispatch board record links are keyboard reachable while mutation controls stay disabled (518ms)
  ✓    4 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: shell-home.html has no critical or serious violations (2.6s)
  ✓    5 [chromium] › module-template-v4-accessibility.spec.ts:12:3 › module-template-v4 accessibility baseline › dispatch board exposes projection and lane semantics (594ms)
  ✓    7 [chromium] › module-template-v4-bridge.spec.ts:10:3 › module-template-v4 bridge adapter › leaves unknown aliases unmapped for decision (1.1s)
  ✓    8 [chromium] › module-template-v4-keyboard.spec.ts:29:3 › module-template-v4 keyboard baseline › training matrix record links are keyboard reachable while mutation controls stay disabled (625ms)
  ✓   10 [chromium] › module-template-v4-live-api.spec.ts:6:3 › hmv4 live api toggle (NQCASE) › default fixture mode is unaffected (568ms)
  ✓   12 [chromium] › module-template-v4-live-api.spec.ts:14:3 › hmv4 live api toggle (NQCASE) › live mode body attribute calls plural EQMS alias and settles read-only (398ms)
  ✓   13 [chromium] › module-template-v4-navshell.spec.ts:4:3 › module-template-v4 navigation shell › SH /ops renders 3 domain tiles from nav fixture (388ms)
  ✓   11 [chromium] › module-template-v4-bridge.spec.ts:18:3 › module-template-v4 bridge adapter › maps ncr to record shell only with explicit record context (1.1s)
  ✓   15 [chromium] › module-template-v4-navshell.spec.ts:13:3 › module-template-v4 navigation shell › SH domain links route to /ops/{domain} (750ms)
  ✓    9 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: domain-landing.html has no critical or serious violations (1.8s)
  ✓   17 [chromium] › module-template-v4-navshell.spec.ts:23:3 › module-template-v4 navigation shell › DL /ops/quality-compliance parses and renders module tiles (792ms)
  ✓   16 [chromium] › module-template-v4-bridge.spec.ts:32:3 › module-template-v4 bridge adapter › maps legacy training alias to canonical training-competency module (1.1s)
  ✓   19 [chromium] › module-template-v4-navshell.spec.ts:33:3 › module-template-v4 navigation shell › DL /ops/shopfloor-execution renders shopfloor modules (386ms)
  ✓   14 [chromium] › module-template-v4-live-api.spec.ts:36:3 › hmv4 live api toggle (NQCASE) › query string opt-in is recognized without changing portal default (2.1s)
  ✓   21 [chromium] › module-template-v4-navshell.spec.ts:45:3 › module-template-v4 navigation shell › ML /ops/shopfloor-execution/dispatch-board renders ready tiles (458ms)
  ✓   22 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-nc-live-mode.html: error fallback when backend 401 (519ms)
  ✓   18 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: domain-landing-quality-compliance.html has no critical or serious violations (1.8s)
  ✓   20 [chromium] › module-template-v4-bridge.spec.ts:44:3 › module-template-v4 bridge adapter › maps capa to record shell only with explicit record context (1.2s)
  ✓   23 [chromium] › module-template-v4-navshell.spec.ts:55:3 › module-template-v4 navigation shell › ML /ops/quality-compliance/quality-case-management exposes record collection + board tiles (580ms)
  ✓   24 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-nc-live-mode.html: never enables mutation (458ms)
  ✓   27 [chromium] › module-template-v4-navshell.spec.ts:63:3 › module-template-v4 navigation shell › ML record collection link routes to /ops/records/{family} (345ms)
  ✓   28 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-nc-live-mode.html: registry exposes correct family entry (511ms)
  ✓   26 [chromium] › module-template-v4-bridge.spec.ts:58:3 › module-template-v4 bridge adapter › maps cdoc to module landing without record context (907ms)
  ✓   30 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-jo-live-mode.html: error fallback when backend 401 (654ms)
  ✓   29 [chromium] › module-template-v4-navshell.spec.ts:69:3 › module-template-v4 navigation shell › ML empty fixture renders empty-state copy and no mutation controls (924ms)
  ✓   25 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: domain-landing-shopfloor-execution.html has no critical or serious violations (1.7s)
  ✓   31 [chromium] › module-template-v4-bridge.spec.ts:66:3 › module-template-v4 bridge adapter › maps cdoc to record shell only with explicit record context (1.0s)
  ✓   32 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-jo-live-mode.html: never enables mutation (691ms)
  ✓   33 [chromium] › module-template-v4-navshell.spec.ts:78:3 › module-template-v4 navigation shell › SH/DL/ML route parsers produce expected route classes (1.3s)
  ✓   36 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-jo-live-mode.html: registry exposes correct family entry (661ms)
  ✓   34 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: module-landing.html has no critical or serious violations (1.6s)
  ✓   35 [chromium] › module-template-v4-bridge.spec.ts:75:3 › module-template-v4 bridge adapter › maps insp to module landing without record context (1.1s)
  ✓   37 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-wo-live-mode.html: error fallback when backend 401 (591ms)
  ✓   41 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-wo-live-mode.html: never enables mutation (273ms)
  ✓   40 [chromium] › module-template-v4-bridge.spec.ts:83:3 › module-template-v4 bridge adapter › maps insp to record shell only with explicit record context (987ms)
  ✓   42 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-wo-live-mode.html: registry exposes correct family entry (505ms)
  ✓   39 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: module-landing-quality-case-management.html has no critical or serious violations (1.2s)
  ✓   44 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-capa-live-mode.html: error fallback when backend 401 (359ms)
  ✓   46 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-capa-live-mode.html: never enables mutation (195ms)
  ✓   43 [chromium] › module-template-v4-bridge.spec.ts:92:3 › module-template-v4 bridge adapter › maps legacy iqc alias same as insp with record context (859ms)
  ✓   47 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-capa-live-mode.html: registry exposes correct family entry (345ms)
  ✓   49 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-cdoc-live-mode.html: error fallback when backend 401 (319ms)
  ✓   45 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: module-landing-dispatch-board.html has no critical or serious violations (1.3s)
  ✓   38 [chromium] › module-template-v4-performance.spec.ts:60:5 › module-template-v4 performance baseline › perf: shell-home (2.8s)
  ✓   48 [chromium] › module-template-v4-bridge.spec.ts:101:3 › module-template-v4 bridge adapter › maps jo to job-order record shell only with explicit record context (1.3s)
  ✓   50 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-cdoc-live-mode.html: never enables mutation (986ms)
  ✓   54 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-cdoc-live-mode.html: registry exposes correct family entry (375ms)
  ✓   53 [chromium] › module-template-v4-bridge.spec.ts:115:3 › module-template-v4 bridge adapter › maps job-order alias to JO record shell with record_id context (913ms)
  ✓   51 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: module-landing-empty.html has no critical or serious violations (1.7s)
  ✓   55 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-insp-live-mode.html: error fallback when backend 401 (1.0s)
  ✓   58 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-insp-live-mode.html: never enables mutation (236ms)
  ✓   59 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-insp-live-mode.html: registry exposes correct family entry (649ms)
  ✓   52 [chromium] › module-template-v4-performance.spec.ts:60:5 › module-template-v4 performance baseline › perf: workspace-board (3.4s)
  ✓   56 [chromium] › module-template-v4-bridge.spec.ts:124:3 › module-template-v4 bridge adapter › maps so to sales-order record shell only with explicit record context (1.8s)
  ✓   60 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-brel-live-mode.html: error fallback when backend 401 (502ms)
  ✓   57 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-board.html has no critical or serious violations (2.2s)
  ✓   63 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-brel-live-mode.html: never enables mutation (282ms)
  ✓   62 [chromium] › module-template-v4-bridge.spec.ts:138:3 › module-template-v4 bridge adapter › maps sales-order alias to SO record shell with record_id context (942ms)
  ✓   65 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-brel-live-mode.html: registry exposes correct family entry (430ms)
  ✓   67 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-eco-live-mode.html: error fallback when backend 401 (277ms)
  ✓   68 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-eco-live-mode.html: never enables mutation (400ms)
  ✓   66 [chromium] › module-template-v4-bridge.spec.ts:147:3 › module-template-v4 bridge adapter › maps wo to work-order record shell only with explicit record context (808ms)
  ✓   69 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-eco-live-mode.html: registry exposes correct family entry (341ms)
  ✓   64 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-dashboard.html has no critical or serious violations (1.7s)
  ✓   71 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-cpo-live-mode.html: error fallback when backend 401 (244ms)
  ✓   61 [chromium] › module-template-v4-performance.spec.ts:60:5 › module-template-v4 performance baseline › perf: workspace-board-degraded (2.4s)
  ✓   70 [chromium] › module-template-v4-bridge.spec.ts:161:3 › module-template-v4 bridge adapter › maps work-order alias to WO record shell with record_id context (833ms)
  ✓   73 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-cpo-live-mode.html: never enables mutation (513ms)
  ✓   76 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-cpo-live-mode.html: registry exposes correct family entry (190ms)
  ✓   75 [chromium] › module-template-v4-bridge.spec.ts:170:3 › module-template-v4 bridge adapter › maps cpo to customer-purchase-order record shell only with explicit record context (884ms)
  ✓   77 [chromium] › module-template-v4-live-api.spec.ts:63:3 › live mode authoritative-record-shell-so-live-mode.html: error fallback when backend 401 (548ms)
  ✓   72 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-board-empty.html has no critical or serious violations (1.5s)
  ✓   79 [chromium] › module-template-v4-live-api.spec.ts:75:3 › live mode authoritative-record-shell-so-live-mode.html: never enables mutation (321ms)
  ✓   81 [chromium] › module-template-v4-live-api.spec.ts:85:3 › live mode authoritative-record-shell-so-live-mode.html: registry exposes correct family entry (451ms)
  ✓   78 [chromium] › module-template-v4-bridge.spec.ts:184:3 › module-template-v4 bridge adapter › maps customer-po alias to CPO record shell with record_id context (960ms)
  ✓   80 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-board-degraded.html has no critical or serious violations (1.6s)
  ✓   74 [chromium] › module-template-v4-performance.spec.ts:60:5 › module-template-v4 performance baseline › perf: nc-overview (2.9s)
  ✓   83 [chromium] › module-template-v4.spec.ts:23:3 › module-template-v4 preview smoke › keeps production portal inert without fixture script (1.0s)
  ✓   82 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-collection.html (1.4s)
  ✓   86 [chromium] › module-template-v4.spec.ts:32:3 › module-template-v4 preview smoke › renders /ops preview shell from fixture route context (305ms)
  ✓   88 [chromium] › module-template-v4.spec.ts:41:3 › module-template-v4 preview smoke › renders shell home with 3 domain tiles (150ms)
  ✓   89 [chromium] › module-template-v4.spec.ts:50:3 › module-template-v4 preview smoke › renders domain landing with module tiles (161ms)
  ✓   90 [chromium] › module-template-v4.spec.ts:58:3 › module-template-v4 preview smoke › renders module landing with tiles (217ms)
  ✓   91 [chromium] › module-template-v4.spec.ts:66:3 › module-template-v4 preview smoke › module landing empty state (208ms)
  ✓   87 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-audit.html (1.0s)
  ✓   92 [chromium] › module-template-v4.spec.ts:71:3 › module-template-v4 preview smoke › unknown domain renders re-anchor (192ms)
  ✓   84 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-overview.html has no critical or serious violations (1.7s)
  ✓   94 [chromium] › module-template-v4.spec.ts:78:3 › module-template-v4 preview smoke › renders dispatch board as a read-only projection workspace (233ms)
  ✓   96 [chromium] › module-template-v4.spec.ts:100:3 › module-template-v4 preview smoke › renders empty dispatch board without mutation controls (176ms)
  ✓   97 [chromium] › module-template-v4.spec.ts:111:3 › module-template-v4 preview smoke › renders degraded dispatch board with visible stale state and re-anchor links (209ms)
  ✓   93 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-conflict.html (1.2s)
  ✓   85 [chromium] › module-template-v4-performance.spec.ts:60:5 › module-template-v4 performance baseline › perf: nc-conflict (3.0s)
  ✓   98 [chromium] › module-template-v4.spec.ts:126:3 › module-template-v4 preview smoke › parses dispatch board route as workspace with allowed view query (854ms)
  ✓   95 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-investigation.html has no critical or serious violations (1.5s)
  ✓  101 [chromium] › module-template-v4.spec.ts:139:3 › module-template-v4 preview smoke › parses nonconformance case route as authoritative record shell (952ms)
  ✓   99 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-degraded.html (1.3s)
  ✓  102 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-evidence.html has no critical or serious violations (1.3s)
  ✓  103 [chromium] › module-template-v4.spec.ts:151:3 › module-template-v4 preview smoke › parses CAPA route as authoritative record shell (912ms)
  ✓  104 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-genealogy.html (1.1s)
  ✓  106 [chromium] › module-template-v4.spec.ts:164:5 › module-template-v4 preview smoke › renders nonconformance overview tab as read-only authoritative shell (249ms)
  ✓  100 [chromium] › module-template-v4-performance.spec.ts:60:5 › module-template-v4 performance baseline › perf: nc-degraded (2.4s)
  ✓  108 [chromium] › module-template-v4.spec.ts:164:5 › module-template-v4 preview smoke › renders nonconformance investigation tab as read-only authoritative shell (259ms)
  ✓  110 [chromium] › module-template-v4.spec.ts:164:5 › module-template-v4 preview smoke › renders nonconformance evidence tab as read-only authoritative shell (366ms)
  ✓  105 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-related.html has no critical or serious violations (1.6s)
  ✓  107 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-live-mode.html (1.0s)
  ✓  111 [chromium] › module-template-v4.spec.ts:164:5 › module-template-v4 preview smoke › renders nonconformance related tab as read-only authoritative shell (717ms)
  ✓  114 [chromium] › module-template-v4.spec.ts:164:5 › module-template-v4 preview smoke › renders nonconformance audit tab as read-only authoritative shell (188ms)
  ✓  115 [chromium] › module-template-v4.spec.ts:164:5 › module-template-v4 preview smoke › renders nonconformance signatures tab as read-only authoritative shell (202ms)
  ✓  116 [chromium] › module-template-v4.spec.ts:189:3 › module-template-v4 preview smoke › renders nonconformance conflict fixture with visible degraded posture (277ms)
  ✓  117 [chromium] › module-template-v4.spec.ts:198:3 › module-template-v4 preview smoke › renders nonconformance partial-access fixture with visible limitation (317ms)
  ✓  113 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-overview.html (1.4s)
  ✓  112 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-audit.html has no critical or serious violations (1.7s)
  ✓  118 [chromium] › module-template-v4.spec.ts:206:3 › module-template-v4 preview smoke › renders nonconformance degraded fixture without enabling mutation (284ms)

[perf] Baseline written to /Users/a10/Documents/mom-v21-env-replay-20260429/_reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-30.md
  ✓  109 [chromium] › module-template-v4-performance.spec.ts:60:5 › module-template-v4 performance baseline › perf: portal-baseline (2.6s)
  ✓  121 [chromium] › module-template-v4.spec.ts:218:3 › module-template-v4 preview smoke › renders CAPA overview tab as authoritative shell (241ms)
  ✓  122 [chromium] › module-template-v4.spec.ts:234:5 › module-template-v4 preview smoke › renders CAPA analysis tab as read-only authoritative shell (240ms)
  ✓  123 [chromium] › module-template-v4.spec.ts:234:5 › module-template-v4 preview smoke › renders CAPA actions tab as read-only authoritative shell (220ms)
  ✓  119 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-partial-access.html (1.0s)
  ✓  124 [chromium] › module-template-v4.spec.ts:234:5 › module-template-v4 preview smoke › renders CAPA verification tab as read-only authoritative shell (237ms)
  ✓  120 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-signatures.html has no critical or serious violations (1.2s)
  ✓  126 [chromium] › module-template-v4.spec.ts:234:5 › module-template-v4 preview smoke › renders CAPA effectiveness tab as read-only authoritative shell (220ms)
  ✓  128 [chromium] › module-template-v4.spec.ts:234:5 › module-template-v4 preview smoke › renders CAPA related tab as read-only authoritative shell (210ms)
  ✓  129 [chromium] › module-template-v4.spec.ts:234:5 › module-template-v4 preview smoke › renders CAPA audit tab as read-only authoritative shell (190ms)
  ✓  125 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-quality-evidence.html (1.0s)
  ✓  130 [chromium] › module-template-v4.spec.ts:234:5 › module-template-v4 preview smoke › renders CAPA signatures tab as read-only authoritative shell (234ms)
  ✓  132 [chromium] › module-template-v4.spec.ts:251:3 › module-template-v4 preview smoke › renders CAPA conflict fixture with visible conflict posture (220ms)
  ✓  127 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-conflict.html has no critical or serious violations (1.2s)
  ✓  133 [chromium] › module-template-v4.spec.ts:260:3 › module-template-v4 preview smoke › renders CAPA partial-access fixture with visible limitation (175ms)
  ✓  135 [chromium] › module-template-v4.spec.ts:268:3 › module-template-v4 preview smoke › renders CAPA degraded fixture without enabling mutation (223ms)
  ✓  131 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-related.html (998ms)
  ✓  136 [chromium] › module-template-v4.spec.ts:277:3 › module-template-v4 preview smoke › parses training matrix route as workspace with allowed view query (842ms)
  ✓  134 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-partial-access.html has no critical or serious violations (1.2s)
  ✓  138 [chromium] › module-template-v4.spec.ts:290:3 › module-template-v4 preview smoke › renders training matrix as a read-only projection workspace (319ms)
  ✓  137 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-release-package.html (1.0s)
  ✓  140 [chromium] › module-template-v4.spec.ts:329:3 › module-template-v4 preview smoke › renders empty training matrix without enabling mutation (235ms)
  ✓  142 [chromium] › module-template-v4.spec.ts:342:3 › module-template-v4 preview smoke › renders conflict training matrix with visible conflict text (219ms)
  ✓  143 [chromium] › module-template-v4.spec.ts:355:3 › module-template-v4 preview smoke › renders partial-access training matrix with visible limitation (236ms)
  ✓  144 [chromium] › module-template-v4.spec.ts:369:3 › module-template-v4 preview smoke › renders degraded training matrix with visible stale state (228ms)
  ✓  139 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-nc-degraded.html has no critical or serious violations (1.2s)
  ✓  145 [chromium] › module-template-v4.spec.ts:384:3 › module-template-v4 preview smoke › training matrix record-open links route to the training-records authority (194ms)
  ✓  141 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-shipment-readiness.html (1.0s)
  ✓  147 [chromium] › module-template-v4.spec.ts:397:3 › CDOC record shell (Slice 5) › renders CDOC overview tab with required attributes (215ms)
  ✓  149 [chromium] › module-template-v4.spec.ts:409:5 › CDOC record shell (Slice 5) › renders CDOC content tab panel (154ms)
  ✓  150 [chromium] › module-template-v4.spec.ts:409:5 › CDOC record shell (Slice 5) › renders CDOC revisions tab panel (181ms)
  ✓  151 [chromium] › module-template-v4.spec.ts:409:5 › CDOC record shell (Slice 5) › renders CDOC controlled-copies tab panel (182ms)
  ✓  152 [chromium] › module-template-v4.spec.ts:409:5 › CDOC record shell (Slice 5) › renders CDOC effectivity tab panel (177ms)
  ✓  146 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-overview.html has no critical or serious violations (1.3s)
  ✓  148 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-brel-signatures.html (1.1s)
  ✓  153 [chromium] › module-template-v4.spec.ts:409:5 › CDOC record shell (Slice 5) › renders CDOC related tab panel (249ms)
  ✓  156 [chromium] › module-template-v4.spec.ts:409:5 › CDOC record shell (Slice 5) › renders CDOC audit tab panel (184ms)
  ✓  157 [chromium] › module-template-v4.spec.ts:409:5 › CDOC record shell (Slice 5) › renders CDOC signatures tab panel (165ms)
  ✓  158 [chromium] › module-template-v4.spec.ts:415:3 › CDOC record shell (Slice 5) › CDOC all mutation launchers are disabled (327ms)
  ✓  159 [chromium] › module-template-v4.spec.ts:423:3 › CDOC record shell (Slice 5) › CDOC revisions tab renders revision table (245ms)
  ✓  155 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-actions.html (1.1s)
  ✓  160 [chromium] › module-template-v4.spec.ts:431:3 › CDOC record shell (Slice 5) › CDOC controlled-copies tab renders copies table (228ms)
  ✓  154 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-analysis.html has no critical or serious violations (1.4s)
  ✓  162 [chromium] › module-template-v4.spec.ts:438:3 › CDOC record shell (Slice 5) › CDOC related tab links use data-hmv4-record-open attributes (213ms)
  ✓  164 [chromium] › module-template-v4.spec.ts:444:3 › CDOC record shell (Slice 5) › CDOC conflict state fixture sets data-fixture-state (154ms)
  ✓  165 [chromium] › module-template-v4.spec.ts:450:3 › CDOC record shell (Slice 5) › CDOC partial-access state shows partial notice (163ms)
  ✓  166 [chromium] › module-template-v4.spec.ts:456:3 › CDOC record shell (Slice 5) › CDOC degraded state has no enabled mutation launchers (180ms)
  ✓  161 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-analysis.html (1.0s)
  ✓  167 [chromium] › module-template-v4.spec.ts:464:3 › CDOC record shell (Slice 5) › CDOC lifecycle strip renders all 7 states (256ms)
  ✓  169 [chromium] › module-template-v4.spec.ts:482:3 › CDOC record shell (Slice 5) › renders BREL overview tab as authoritative release shell (223ms)
  ✓  163 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-actions.html has no critical or serious violations (1.2s)
  ✓  170 [chromium] › module-template-v4.spec.ts:495:5 › CDOC record shell (Slice 5) › renders BREL release-package tab as read-only authoritative shell (207ms)
  ✓  172 [chromium] › module-template-v4.spec.ts:495:5 › CDOC record shell (Slice 5) › renders BREL quality-evidence tab as read-only authoritative shell (189ms)
  ✓  168 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-audit.html (947ms)
  ✓  173 [chromium] › module-template-v4.spec.ts:495:5 › CDOC record shell (Slice 5) › renders BREL genealogy tab as read-only authoritative shell (199ms)
  ✓  175 [chromium] › module-template-v4.spec.ts:495:5 › CDOC record shell (Slice 5) › renders BREL shipment-readiness tab as read-only authoritative shell (196ms)
  ✓  176 [chromium] › module-template-v4.spec.ts:495:5 › CDOC record shell (Slice 5) › renders BREL related tab as read-only authoritative shell (199ms)
  ✓  177 [chromium] › module-template-v4.spec.ts:495:5 › CDOC record shell (Slice 5) › renders BREL audit tab as read-only authoritative shell (240ms)
  ✓  171 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-verification.html has no critical or serious violations (1.2s)
  ✓  178 [chromium] › module-template-v4.spec.ts:495:5 › CDOC record shell (Slice 5) › renders BREL signatures tab as read-only authoritative shell (214ms)
  ✓  174 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-conflict.html (1.0s)
  ✓  180 [chromium] › module-template-v4.spec.ts:508:3 › CDOC record shell (Slice 5) › BREL signatures tab shows 2-person rule status (196ms)
  ✓  182 [chromium] › module-template-v4.spec.ts:514:3 › CDOC record shell (Slice 5) › BREL release-package tab links to all evidence records (177ms)
  ✓  183 [chromium] › module-template-v4.spec.ts:521:3 › CDOC record shell (Slice 5) › BREL ALL mutation intents disabled (release safety) (203ms)
  ✓  184 [chromium] › module-template-v4.spec.ts:529:3 › CDOC record shell (Slice 5) › BREL conflict state sets fixture-state and stateMessage (193ms)
  ✓  185 [chromium] › module-template-v4.spec.ts:537:3 › CDOC record shell (Slice 5) › BREL partial-access shows limitation notice (219ms)
  ✓  179 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-effectiveness.html has no critical or serious violations (1.4s)
  ✓  181 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-degraded.html (1.1s)
  ✓  186 [chromium] › module-template-v4.spec.ts:543:3 › CDOC record shell (Slice 5) › BREL degraded state sets stale freshness and disables mutation (457ms)
  ✓  189 [chromium] › module-template-v4.spec.ts:552:3 › CDOC record shell (Slice 5) › BREL lifecycle strip renders all 7 states (216ms)
  ✓  190 [chromium] › module-template-v4.spec.ts:560:3 › INSP record shell (Slice 6) › renders INSP overview tab with required attributes (160ms)
  ✓  191 [chromium] › module-template-v4.spec.ts:572:5 › INSP record shell (Slice 6) › renders INSP sample-results tab panel (161ms)
  ✓  192 [chromium] › module-template-v4.spec.ts:572:5 › INSP record shell (Slice 6) › renders INSP nonconformance-flags tab panel (248ms)
  ✓  188 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-effectiveness.html (1.5s)
  ✓  193 [chromium] › module-template-v4.spec.ts:572:5 › INSP record shell (Slice 6) › renders INSP evidence tab panel (454ms)
  ✓  195 [chromium] › module-template-v4.spec.ts:572:5 › INSP record shell (Slice 6) › renders INSP related tab panel (218ms)
  ✓  187 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-related.html has no critical or serious violations (1.8s)
  ✓  196 [chromium] › module-template-v4.spec.ts:572:5 › INSP record shell (Slice 6) › renders INSP audit tab panel (198ms)
  ✓  198 [chromium] › module-template-v4.spec.ts:572:5 › INSP record shell (Slice 6) › renders INSP signatures tab panel (168ms)
  ✓  199 [chromium] › module-template-v4.spec.ts:578:3 › INSP record shell (Slice 6) › INSP all mutation launchers are disabled (218ms)
  ✓  194 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-live-mode.html (1.1s)
  ✓  200 [chromium] › module-template-v4.spec.ts:586:3 › INSP record shell (Slice 6) › INSP overview tab renders characteristics table (244ms)
  ✓  202 [chromium] › module-template-v4.spec.ts:593:3 › INSP record shell (Slice 6) › INSP sample-results tab renders result cards with pass/fail judgments (203ms)
  ✓  197 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-audit.html has no critical or serious violations (1.2s)
  ✓  203 [chromium] › module-template-v4.spec.ts:600:3 › INSP record shell (Slice 6) › INSP nonconformance-flags tab links to escalated NC (171ms)
  ✓  205 [chromium] › module-template-v4.spec.ts:607:3 › INSP record shell (Slice 6) › INSP conflict state sets data-fixture-state and freshness (189ms)
  ✓  206 [chromium] › module-template-v4.spec.ts:613:3 › INSP record shell (Slice 6) › INSP partial-access state shows partial notice (202ms)
  ✓  201 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-overview.html (963ms)
  ✓  207 [chromium] › module-template-v4.spec.ts:619:3 › INSP record shell (Slice 6) › INSP degraded state has no enabled mutation launchers (199ms)
  ✓  209 [chromium] › module-template-v4.spec.ts:627:3 › INSP record shell (Slice 6) › INSP lifecycle strip renders all 5 states (166ms)
  ✓  204 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-signatures.html has no critical or serious violations (1.2s)
  ✓  208 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-partial-access.html (999ms)
  ✓  210 [chromium] › module-template-v4.spec.ts:635:3 › JO record shell (Slice 9) › parses JO route as authoritative record shell (1.1s)
  ✓  213 [chromium] › module-template-v4.spec.ts:647:3 › JO record shell (Slice 9) › renders JO overview tab (364ms)
  ✓  214 [chromium] › module-template-v4.spec.ts:660:5 › JO record shell (Slice 9) › renders JO dispatch-readiness tab (206ms)
  ✓  211 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-conflict.html has no critical or serious violations (1.5s)
  ✓  215 [chromium] › module-template-v4.spec.ts:660:5 › JO record shell (Slice 9) › renders JO spawned-work-orders tab (199ms)
  ✓  212 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-related.html (1.3s)
  ✓  217 [chromium] › module-template-v4.spec.ts:660:5 › JO record shell (Slice 9) › renders JO material-consumption tab (232ms)
  ✓  219 [chromium] › module-template-v4.spec.ts:660:5 › JO record shell (Slice 9) › renders JO progress tab (370ms)
  ✓  220 [chromium] › module-template-v4.spec.ts:660:5 › JO record shell (Slice 9) › renders JO related tab (244ms)
  ✓  221 [chromium] › module-template-v4.spec.ts:660:5 › JO record shell (Slice 9) › renders JO audit tab (173ms)
  ✓  218 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-signatures.html (1.0s)
  ✓  216 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-partial-access.html has no critical or serious violations (1.4s)
  ✓  222 [chromium] › module-template-v4.spec.ts:666:3 › JO record shell (Slice 9) › JO spawned-work-orders tab links to WO records (235ms)
  ✓  225 [chromium] › module-template-v4.spec.ts:671:3 › JO record shell (Slice 9) › JO material-consumption tab links to lot records (231ms)
  ✓  226 [chromium] › module-template-v4.spec.ts:677:3 › JO record shell (Slice 9) › JO conflict state (567ms)
  ✓  223 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-capa-verification.html (1.2s)
  ✓  227 [chromium] › module-template-v4.spec.ts:683:3 › JO record shell (Slice 9) › JO partial access (249ms)
  ✓  229 [chromium] › module-template-v4.spec.ts:689:3 › JO record shell (Slice 9) › JO degraded no mutation (246ms)
  ✓  224 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-capa-degraded.html has no critical or serious violations (1.4s)
  ✓  230 [chromium] › module-template-v4.spec.ts:694:3 › JO record shell (Slice 9) › JO disabled launchers expose all transactional intents (378ms)
  ✓  232 [chromium] › module-template-v4.spec.ts:701:3 › JO record shell (Slice 9) › JO lifecycle strip includes transactional branch states (333ms)
  ✓  228 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-audit.html (1.1s)
  ✓  231 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-training-matrix.html has no critical or serious violations (1.8s)
  ✓  233 [chromium] › module-template-v4.spec.ts:715:3 › WO record shell (Slice 11) › parses WO route as authoritative record shell (1.1s)
  ✓  236 [chromium] › module-template-v4.spec.ts:727:3 › WO record shell (Slice 11) › renders WO overview tab (247ms)
  ✓  234 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-conflict.html (1.3s)
  ✓  237 [chromium] › module-template-v4.spec.ts:740:5 › WO record shell (Slice 11) › renders WO operation-detail tab (186ms)
  ✓  239 [chromium] › module-template-v4.spec.ts:740:5 › WO record shell (Slice 11) › renders WO resource-allocation tab (148ms)
  ✓  240 [chromium] › module-template-v4.spec.ts:740:5 › WO record shell (Slice 11) › renders WO execution-log tab (180ms)
  ✓  241 [chromium] › module-template-v4.spec.ts:740:5 › WO record shell (Slice 11) › renders WO inspections tab (196ms)
  ✓  235 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-training-matrix-empty.html has no critical or serious violations (1.1s)
  ✓  242 [chromium] › module-template-v4.spec.ts:740:5 › WO record shell (Slice 11) › renders WO dispatch-status tab (224ms)
  ✓  238 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-content.html (1.1s)
  ✓  244 [chromium] › module-template-v4.spec.ts:740:5 › WO record shell (Slice 11) › renders WO related tab (231ms)
  ✓  246 [chromium] › module-template-v4.spec.ts:740:5 › WO record shell (Slice 11) › renders WO audit tab (150ms)
  ✓  247 [chromium] › module-template-v4.spec.ts:746:3 › WO record shell (Slice 11) › WO inspections tab links to INSP record (160ms)
  ✓  248 [chromium] › module-template-v4.spec.ts:751:3 › WO record shell (Slice 11) › WO related shows parent JO + dispatch target + escalated NC (201ms)
  ✓  249 [chromium] › module-template-v4.spec.ts:758:3 › WO record shell (Slice 11) › WO execution-log preserves chronological order (189ms)
  ✓  243 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-training-matrix-conflict.html has no critical or serious violations (1.2s)
  ✓  245 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-controlled-copies.html (972ms)
  ✓  250 [chromium] › module-template-v4.spec.ts:767:3 › WO record shell (Slice 11) › WO conflict state (268ms)
  ✓  253 [chromium] › module-template-v4.spec.ts:773:3 › WO record shell (Slice 11) › WO partial access (173ms)
  ✓  254 [chromium] › module-template-v4.spec.ts:781:3 › WO record shell (Slice 11) › WO degraded no mutation (164ms)
  ✓  255 [chromium] › module-template-v4.spec.ts:786:3 › WO record shell (Slice 11) › WO lifecycle exposes completed and scrapped terminal branches (188ms)
  ✓  256 [chromium] › module-template-v4.spec.ts:792:3 › WO record shell (Slice 11) › WO disabled launchers expose all transactional intents (215ms)
  ✓  252 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-degraded.html (1.0s)
  ✓  251 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-training-matrix-partial-access.html has no critical or serious violations (1.2s)
  ✓  257 [chromium] › module-template-v4.spec.ts:801:3 › SO record shell (Slice 10) › renders SO overview tab (290ms)
  ✓  260 [chromium] › module-template-v4.spec.ts:814:5 › SO record shell (Slice 10) › renders SO line-items tab (186ms)
  ✓  261 [chromium] › module-template-v4.spec.ts:814:5 › SO record shell (Slice 10) › renders SO linked-job-orders tab (164ms)
  ✓  262 [chromium] › module-template-v4.spec.ts:814:5 › SO record shell (Slice 10) › renders SO shipment-allocation tab (176ms)
  ✓  263 [chromium] › module-template-v4.spec.ts:814:5 › SO record shell (Slice 10) › renders SO invoicing tab (235ms)
  ✓  258 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-effectivity.html (1.1s)
  ✓  264 [chromium] › module-template-v4.spec.ts:814:5 › SO record shell (Slice 10) › renders SO related tab (245ms)
  ✓  259 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: workspace-training-matrix-degraded.html has no critical or serious violations (1.2s)
  ✓  266 [chromium] › module-template-v4.spec.ts:814:5 › SO record shell (Slice 10) › renders SO audit tab (178ms)
  ✓  268 [chromium] › module-template-v4.spec.ts:820:3 › SO record shell (Slice 10) › SO linked-job-orders tab links to JO record (177ms)
  ✓  269 [chromium] › module-template-v4.spec.ts:825:3 › SO record shell (Slice 10) › SO line-items shows quantity progression (163ms)
  ✓  270 [chromium] › module-template-v4.spec.ts:831:3 › SO record shell (Slice 10) › SO conflict state (190ms)
  ✓  265 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-live-mode.html (979ms)
  ✓  271 [chromium] › module-template-v4.spec.ts:837:3 › SO record shell (Slice 10) › SO partial access (244ms)
  ✓  273 [chromium] › module-template-v4.spec.ts:845:3 › SO record shell (Slice 10) › SO degraded no mutation (184ms)
  ✓  267 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-overview.html has no critical or serious violations (1.2s)
  ✓  274 [chromium] › module-template-v4.spec.ts:850:3 › SO record shell (Slice 10) › SO disabled launchers expose all transactional intents (250ms)
  ✓  276 [chromium] › module-template-v4.spec.ts:857:3 › SO record shell (Slice 10) › SO lifecycle strip renders all 6 fixture states (262ms)
  ✓  272 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-overview.html (1.1s)
  ✓  277 [chromium] › module-template-v4.spec.ts:865:3 › CPO record shell (Slice 12) › parses CPO route as authoritative record shell (974ms)
  ✓  275 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-content.html has no critical or serious violations (1.4s)
  ✓  279 [chromium] › module-template-v4.spec.ts:877:3 › CPO record shell (Slice 12) › renders CPO overview tab (242ms)
  ✓  278 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-partial-access.html (1.1s)
  ✓  281 [chromium] › module-template-v4.spec.ts:890:5 › CPO record shell (Slice 12) › renders CPO line-items tab (181ms)
  ✓  283 [chromium] › module-template-v4.spec.ts:890:5 › CPO record shell (Slice 12) › renders CPO terms-and-conditions tab (191ms)
  ✓  284 [chromium] › module-template-v4.spec.ts:890:5 › CPO record shell (Slice 12) › renders CPO linked-sales-orders tab (181ms)
  ✓  285 [chromium] › module-template-v4.spec.ts:890:5 › CPO record shell (Slice 12) › renders CPO acknowledgment tab (216ms)
  ✓  280 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-revisions.html has no critical or serious violations (1.2s)
  ✓  286 [chromium] › module-template-v4.spec.ts:890:5 › CPO record shell (Slice 12) › renders CPO related tab (275ms)
  ✓  282 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-related.html (973ms)
  ✓  288 [chromium] › module-template-v4.spec.ts:890:5 › CPO record shell (Slice 12) › renders CPO audit tab (178ms)
  ✓  290 [chromium] › module-template-v4.spec.ts:896:3 › CPO record shell (Slice 12) › CPO linked-sales-orders links to SO record (167ms)
  ✓  291 [chromium] › module-template-v4.spec.ts:901:3 › CPO record shell (Slice 12) › CPO acknowledgment shows deviations from customer PO (165ms)
  ✓  292 [chromium] › module-template-v4.spec.ts:907:3 › CPO record shell (Slice 12) › CPO terms-and-conditions shows custom clauses (206ms)
  ✓  293 [chromium] › module-template-v4.spec.ts:912:3 › CPO record shell (Slice 12) › CPO conflict state (217ms)
  ✓  289 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-revisions.html (986ms)
  ✓  287 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-controlled-copies.html has no critical or serious violations (1.3s)
  ✓  294 [chromium] › module-template-v4.spec.ts:918:3 › CPO record shell (Slice 12) › CPO partial-access masks total value (210ms)
  ✓  297 [chromium] › module-template-v4.spec.ts:924:3 › CPO record shell (Slice 12) › CPO degraded no mutation (196ms)
  ✓  298 [chromium] › module-template-v4.spec.ts:929:3 › CPO record shell (Slice 12) › CPO disabled launchers expose all commercial intents (176ms)
  ✓  299 [chromium] › module-template-v4.spec.ts:936:3 › CPO record shell (Slice 12) › CPO lifecycle strip renders all 5 fixture states (183ms)
  ✓  295 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cdoc-signatures.html (964ms)
  ✓  296 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-effectivity.html has no critical or serious violations (1.1s)
  ✓  300 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-acknowledgment.html (929ms)
  ✓  301 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-related.html has no critical or serious violations (1.0s)
  ✓  302 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-audit.html (929ms)
  ✓  303 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-audit.html has no critical or serious violations (1.1s)
  ✓  304 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-conflict.html (912ms)
  ✓  305 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-signatures.html has no critical or serious violations (1.1s)
  ✓  306 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-degraded.html (922ms)
  ✓  307 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-conflict.html has no critical or serious violations (1.1s)
  ✓  308 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-line-items.html (973ms)
  ✓  310 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-linked-sales-orders.html (898ms)
  ✓  309 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-partial-access.html has no critical or serious violations (1.1s)
  ✓  311 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-live-mode.html (952ms)
  ✓  312 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cdoc-degraded.html has no critical or serious violations (1.1s)
  ✓  313 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-overview.html (952ms)
  ✓  314 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-overview.html has no critical or serious violations (1.1s)
  ✓  315 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-partial-access.html (940ms)
  ✓  316 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-sample-results.html has no critical or serious violations (1.1s)
  ✓  317 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-related.html (917ms)
  ✓  318 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-nonconformance-flags.html has no critical or serious violations (1.1s)
  ✓  319 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-cpo-terms-and-conditions.html (917ms)
  ✓  320 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-evidence.html has no critical or serious violations (1.1s)
  ✓  321 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-audit.html (945ms)
  ✓  323 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-change-scope.html (989ms)
  ✓  322 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-related.html has no critical or serious violations (1.2s)
  ✓  324 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-conflict.html (988ms)
  ✓  325 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-audit.html has no critical or serious violations (1.2s)
  ✓  326 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-degraded.html (985ms)
  ✓  327 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-signatures.html has no critical or serious violations (1.1s)
  ✓  328 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-impact-assessment.html (933ms)
  ✓  329 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-conflict.html has no critical or serious violations (1.1s)
  ✓  330 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-implementation-plan.html (985ms)
  ✓  331 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-partial-access.html has no critical or serious violations (1.1s)
  ✓  332 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-live-mode.html (927ms)
  ✓  333 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-insp-degraded.html has no critical or serious violations (1.1s)
  ✓  334 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-overview.html (966ms)
  ✓  336 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-partial-access.html (936ms)
  ✓  335 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-overview.html has no critical or serious violations (1.1s)
  ✓  337 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-related.html (971ms)
  ✓  338 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-release-package.html has no critical or serious violations (1.2s)
  ✓  339 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-signatures.html (969ms)
  ✓  340 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-quality-evidence.html has no critical or serious violations (1.1s)
  ✓  341 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-eco-training-impact.html (1.1s)
  ✓  342 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-genealogy.html has no critical or serious violations (1.1s)
  ✓  343 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-audit.html (925ms)
  ✓  344 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-shipment-readiness.html has no critical or serious violations (1.0s)
  ✓  345 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-conflict.html (927ms)
  ✓  346 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-related.html has no critical or serious violations (1.1s)
  ✓  347 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-degraded.html (903ms)
  ✓  348 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-audit.html has no critical or serious violations (1.0s)
  ✓  349 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-evidence.html (925ms)
  ✓  351 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-live-mode.html (910ms)
  ✓  350 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-signatures.html has no critical or serious violations (1.1s)
  ✓  352 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-nonconformance-flags.html (943ms)
  ✓  353 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-conflict.html has no critical or serious violations (1.1s)
  ✓  354 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-overview.html (951ms)
  ✓  355 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-partial-access.html has no critical or serious violations (1.1s)
  ✓  356 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-partial-access.html (937ms)
  ✓  357 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-brel-degraded.html has no critical or serious violations (1.1s)
  ✓  358 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-related.html (901ms)
  ✓  359 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-overview.html has no critical or serious violations (1.1s)
  ✓  360 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-sample-results.html (927ms)
  ✓  361 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-change-scope.html has no critical or serious violations (1.1s)
  ✓  362 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-insp-signatures.html (930ms)
  ✓  364 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-audit.html (926ms)
  ✓  363 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-impact-assessment.html has no critical or serious violations (1.1s)
  ✓  365 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-conflict.html (949ms)
  ✓  366 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-implementation-plan.html has no critical or serious violations (1.1s)
  ✓  367 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-degraded.html (957ms)
  ✓  368 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-training-impact.html has no critical or serious violations (1.1s)
  ✓  369 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-dispatch-readiness.html (910ms)
  ✓  370 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-related.html has no critical or serious violations (1.0s)
  ✓  371 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-live-mode.html (910ms)
  ✓  372 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-audit.html has no critical or serious violations (1.1s)
  ✓  373 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-material-consumption.html (886ms)
  ✓  374 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-signatures.html has no critical or serious violations (1.1s)
  ✓  375 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-overview.html (927ms)
  ✓  377 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-partial-access.html (936ms)
  ✓  376 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-conflict.html has no critical or serious violations (1.1s)
  ✓  378 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-progress.html (972ms)
  ✓  379 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-partial-access.html has no critical or serious violations (1.2s)
  ✓  380 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-related.html (931ms)
  ✓  381 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-eco-degraded.html has no critical or serious violations (1.1s)
  ✓  382 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-jo-spawned-work-orders.html (916ms)
  ✓  383 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-overview.html has no critical or serious violations (1.1s)
  ✓  384 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-audit.html (895ms)
  ✓  385 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-line-items.html has no critical or serious violations (1.1s)
  ✓  386 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-conflict.html (924ms)
  ✓  387 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-terms-and-conditions.html has no critical or serious violations (1.1s)
  ✓  388 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-degraded.html (940ms)
  ✓  390 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-evidence.html (1.0s)
  ✓  389 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-linked-sales-orders.html has no critical or serious violations (1.3s)
  ✓  391 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-investigation.html (947ms)
  ✓  392 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-acknowledgment.html has no critical or serious violations (1.1s)
  ✓  393 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-live-mode.html (921ms)
  ✓  394 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-related.html has no critical or serious violations (1.0s)
  ✓  395 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-overview.html (944ms)
  ✓  396 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-audit.html has no critical or serious violations (1.0s)
  ✓  397 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-partial-access.html (929ms)
  ✓  398 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-conflict.html has no critical or serious violations (1.2s)
  ✓  399 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-related.html (943ms)
  ✓  401 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-nc-signatures.html (916ms)
  ✓  400 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-partial-access.html has no critical or serious violations (1.1s)
  ✓  402 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-audit.html (937ms)
  ✓  403 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-degraded.html has no critical or serious violations (1.1s)
  ✓  404 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-conflict.html (946ms)
  ✓  405 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-cpo-live-mode.html has no critical or serious violations (1.0s)
  ✓  406 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-degraded.html (925ms)
  ✓  407 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-overview.html has no critical or serious violations (1.1s)
  ✓  408 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-invoicing.html (930ms)
  ✓  409 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-dispatch-readiness.html has no critical or serious violations (1.1s)
  ✓  410 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-line-items.html (878ms)
  ✓  411 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-spawned-work-orders.html has no critical or serious violations (1.1s)
  ✓  412 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-linked-job-orders.html (901ms)
  ✓  414 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-live-mode.html (897ms)
  ✓  413 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-material-consumption.html has no critical or serious violations (1.1s)
  ✓  415 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-overview.html (993ms)
  ✓  416 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-progress.html has no critical or serious violations (1.1s)
  ✓  417 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-partial-access.html (965ms)
  ✓  418 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-related.html has no critical or serious violations (1.0s)
  ✓  419 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-related.html (943ms)
  ✓  420 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-audit.html has no critical or serious violations (1.1s)
  ✓  421 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-so-shipment-allocation.html (925ms)
  ✓  422 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-conflict.html has no critical or serious violations (1.0s)
  ✓  423 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-audit.html (905ms)
  ✓  424 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-partial-access.html has no critical or serious violations (1.1s)
  ✓  425 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-conflict.html (1.0s)
  ✓  426 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-degraded.html has no critical or serious violations (1.1s)
  ✓  427 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-degraded.html (924ms)
  ✓  429 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-dispatch-status.html (925ms)
  ✓  428 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-jo-live-mode.html has no critical or serious violations (1.0s)
  ✓  430 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-execution-log.html (957ms)
  ✓  431 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-overview.html has no critical or serious violations (1.1s)
  ✓  432 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-inspections.html (935ms)
  ✓  433 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-line-items.html has no critical or serious violations (1.1s)
  ✓  434 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-live-mode.html (900ms)
  ✓  435 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-linked-job-orders.html has no critical or serious violations (1.0s)
  ✓  436 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-operation-detail.html (930ms)
  ✓  437 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-shipment-allocation.html has no critical or serious violations (1.0s)
  ✓  438 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-overview.html (924ms)
  ✓  439 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-invoicing.html has no critical or serious violations (1.2s)
  ✓  440 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-partial-access.html (969ms)
  ✓  442 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-related.html (926ms)
  ✓  441 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-related.html has no critical or serious violations (1.1s)
  ✓  443 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell-wo-resource-allocation.html (926ms)
  ✓  444 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-audit.html has no critical or serious violations (1.1s)
  ✓  445 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: authoritative-record-shell.html (940ms)
  ✓  446 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-conflict.html has no critical or serious violations (1.1s)
  ✓  447 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: bridge-alias.html (924ms)
  ✓  448 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-partial-access.html has no critical or serious violations (1.1s)
  ✓  449 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: degraded-states.html (944ms)
  ✓  450 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-degraded.html has no critical or serious violations (1.1s)
  ✓  451 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: domain-landing-quality-compliance.html (954ms)
  ✓  452 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-so-live-mode.html has no critical or serious violations (1.1s)
  ✓  453 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: domain-landing-quality-operations.html (952ms)
  ✓  455 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: domain-landing-shopfloor-execution.html (875ms)
  ✓  454 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-overview.html has no critical or serious violations (1.1s)
  ✓  456 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: domain-landing.html (911ms)
  ✓  457 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-operation-detail.html has no critical or serious violations (1.1s)
  ✓  458 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: durable-draft-shell.html (942ms)
  ✓  459 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-resource-allocation.html has no critical or serious violations (1.1s)
  ✓  460 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: module-landing-dispatch-board.html (887ms)
  ✓  461 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-execution-log.html has no critical or serious violations (1.1s)
  ✓  462 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: module-landing-empty.html (879ms)
  ✓  464 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: module-landing-quality-case-management.html (891ms)
  ✓  463 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-inspections.html has no critical or serious violations (1.1s)
  ✓  465 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: module-landing.html (897ms)
  ✓  466 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-dispatch-status.html has no critical or serious violations (1.1s)
  ✓  467 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: shell-home.html (919ms)
  ✓  468 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-related.html has no critical or serious violations (1.1s)
  ✓  469 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: unknown-alias.html (993ms)
  ✓  470 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-audit.html has no critical or serious violations (1.2s)
  ✓  471 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-analytics.html (953ms)
  ✓  473 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-archive.html (946ms)
  ✓  472 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-conflict.html has no critical or serious violations (1.2s)
  ✓  474 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-board-degraded.html (947ms)
  ✓  475 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-partial-access.html has no critical or serious violations (1.1s)
  ✓  476 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-board-empty.html (941ms)
  ✓  477 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-degraded.html has no critical or serious violations (1.1s)
  ✓  478 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-board.html (935ms)
  ✓  479 [chromium] › module-template-v4-axe.spec.ts:133:3 › a11y axe-core: authoritative-record-shell-wo-live-mode.html has no critical or serious violations (968ms)
  ✓  480 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-dashboard.html (892ms)
  ✓  481 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-explorer.html (888ms)
  ✓  482 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-matrix.html (907ms)
  ✓  483 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-monitor.html (922ms)
  ✓  484 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-packet.html (876ms)
  ✓  485 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-queue.html (965ms)
  ✓  486 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-tower.html (906ms)
  ✓  487 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-training-matrix-conflict.html (976ms)
  ✓  488 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-training-matrix-degraded.html (1.0s)
  ✓  489 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-training-matrix-empty.html (1.0s)
  ✓  490 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-training-matrix-partial-access.html (982ms)
  ✓  491 [chromium] › module-template-v4-visual.spec.ts:59:5 › module-template-v4 visual regression › visual: workspace-training-matrix.html (964ms)

  491 passed (2.8m)
CHROMIUM_EXIT=0

[exit=0]
