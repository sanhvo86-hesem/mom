# 01_WAVE_0_STABILIZATION.md

## Wave name

```text
Wave 0 — Phase 2 Integration Stabilization
```

## Status

```text
MANDATORY — must run BEFORE any Wave 1+ work
Estimated duration: 1-3 days
Codex sessions: 1-3
Predecessor gate: none
Successor gate: Wave 1 + Wave 2 begin only after Wave 0 PASS
```

## Goal

Make `main` internally consistent before continuing slice progression. Specifically:

1. Resolve `CROSS_BROWSER_FAIL_BLOCK_NEXT` (cross-browser visual regression)
2. Review and triage 3 PASS_WITH_WARNINGS:
   - `CAPA_SLICE4_PASS_WITH_WARNINGS`
   - `LIVE_API_TOGGLE_NQCASE_PASS_WITH_WARNINGS`
   - `TRANSACTIONAL_REST_PASS_WITH_WARNINGS`
3. Establish full Chromium E2E baseline as ground truth
4. Generate `V21_PHASE2_INTEGRATION_REVIEW_REPORT.md`
5. Decision phrase that gates Wave 1+

## Why this wave exists

Repo state has multiple unresolved warnings + 1 hard block. Adding more slices (Wave 5 transactional, Wave 6 digital thread) on top of unresolved warnings creates compound technical debt. World-class platforms ship clean baselines.

The Wave 0 discipline is non-negotiable per **RULE-5** (wave stabilization gate).

## Entry criteria

```text
✅ main is at HEAD with Phase 2 + Phase 3 carry-over + Strategic V2 docs
✅ Reports exist under _reports/module-template-v4/ (62+ files)
✅ HEAD-PHRASE on each Phase 2 stream report verified
✅ Phase 4 megaprompts ON main but NOT YET EXECUTED on production code
```

## Exit criteria

Wave 0 exits ONLY when ALL true:

```text
[ ] V21 integration review report generated
[ ] Cross-browser issue: REPAIRED (chromium baseline) OR FORMALLY ACCEPTED AS DEFERRED
[ ] CAPA Slice 4 warnings: TRIAGED + classified (must-fix vs accept-as-known)
[ ] NQCASE live API warnings: TRIAGED + classified
[ ] Backend REST C.2 warnings: TRIAGED + classified
[ ] Full Chromium E2E result: KNOWN (specific count: passed / failed / skipped)
[ ] No new slice started during Wave 0
[ ] No forbidden file diff during Wave 0
[ ] Phase 4 megaprompts execution remains paused until Wave 5 gate opens
```

## Work packages (WP)

### WP0.1 — Current main verification

**Codex actions**:

```bash
git checkout main
git pull --ff-only
git status --short        # expected: empty (or document any leftovers)
git log --oneline --decorate -20
git ls-remote --heads origin   # confirm only main remains (after Phase merges)
```

**Verify presence of these reports**:
```text
_reports/module-template-v4/S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md
_reports/module-template-v4/S_LIVE_API_TOGGLE_NQCASE_REPORT.md
_reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md
_reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md
_reports/module-template-v4/S_NAV_SHELL_IMPLEMENTATION_REPORT.md (if Slice 0.5 nav landed)
_reports/module-template-v4/S_LIVE_API_REPLICATION_REPORT.md (if Phase 3 carry-over landed)
```

**Output artifact**:
```text
V21_PHASE2_CURRENT_MAIN_VERIFICATION_REPORT.md
```

Sections required:
```text
## Branch and HEAD
## Commits since 26b5109d
## Reports inventory (count + critical files present)
## Stream decision phrase summary
## Decision: PROCEED_TO_WP0.2 / BLOCK_NEEDS_REPO_REPAIR
```

### WP0.2 — Stream status matrix

For each Phase 2 stream, document:

| Stream | Decision phrase | Warning categories | Severity | Action |
|---|---|---|---|---|
| CAPA Slice 4 | PASS_WITH_WARNINGS | (capture from report) | TBD | TBD |
| NQCASE live API | PASS_WITH_WARNINGS | (capture) | TBD | TBD |
| Transactional REST C.2 | PASS_WITH_WARNINGS | (capture) | TBD | TBD |
| Cross-browser baselines | FAIL_BLOCK_NEXT | visual drift on chromium | HIGH | repair or defer |
| BREL Slice 7 | PASS_READY_FOR_QA (verify) | TBD | TBD | TBD |
| ECO Slice 8 | (verify status) | TBD | TBD | TBD |
| Live API replication | (verify status) | TBD | TBD | TBD |

**Read each stream's report and extract**:
```
- Decision phrase
- Listed warnings
- Required follow-up (per author's intent)
- Whether warning is "code defect" or "test infra defect" or "transient environmental"
```

**Output artifact**:
```text
V21_PHASE2_STREAM_STATUS_MATRIX.md
```

Decision categories per stream:
```text
must_fix_in_wave_0       → repair this wave
must_fix_in_wave_1_or_2  → schedule
accept_as_known_warning  → document in known-limitations register
defer_to_wave_8          → hardening phase
```

### WP0.3 — Static guard sweep

Run all static guards against current main:

```bash
# Node syntax HMV4 prototype
for f in 70-module-template-v4-hydration 71-module-template-v4-routes \
         72-module-template-v4-bridge 73-module-template-v4-renderers \
         74-module-template-v4-fixtures; do
  node --check "mom/scripts/portal/$f.js" || exit 1
done

# JSON parse all fixtures
python3 - <<'PY'
import json, pathlib, sys
errs = 0
for p in pathlib.Path('tests/fixtures/module-template-v4').rglob('*.json'):
    try: json.loads(p.read_text())
    except Exception as e: errs += 1; print(f"FAIL {p}: {e}")
sys.exit(0 if errs == 0 else 1)
PY

# Fixture production-load guard
grep -n "74-module-template-v4-fixtures" mom/portal.html && exit 1 || echo "PASS"

# Forbidden diff guard (compare main against last clean baseline if needed)
git diff --name-only origin/main..HEAD 2>/dev/null | \
  grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && exit 1

# Graphics Authority compliance — no hardcoded hex in JS
grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/7?-module-template-v4-*.js | grep -v '//' && exit 1
```

**Output**: PASS_ALL_GUARDS or FAIL list with file:line.

### WP0.4 — Full Chromium E2E reality check

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list 2>&1 | tee ../../tmp_e2e_chromium.log
EXIT=$?
rm -rf node_modules
cd ../..

# Capture results
grep -E "passed|failed|skipped" tmp_e2e_chromium.log | tail -3
```

**Classify failures** (per spec file):
```text
visual_drift             — visual regression diffs (most likely cause of FAIL_BLOCK_NEXT)
functional_regression    — actual behavior broken
a11y_failure            — WCAG violation
live_api_only_failure   — live mode fetch fails (acceptable in dev — fallback should render)
backend_unavailable     — PHP server not running or returning 401 (transient, document)
flaky_test              — passes on retry
infra_failure           — test config issue, not code
```

**Output artifact**:
```text
V21_PHASE2_FULL_CHROMIUM_E2E_REPORT.md
```

Sections:
```text
## Test counts (passed/failed/skipped)
## Failure classification by category
## Failures by spec file
## Failures by fixture page (top 10)
## Recommended repair scope
```

### WP0.5 — Cross-browser repair plan (NO commit yet)

The cross-browser stream reported `CROSS_BROWSER_FAIL_BLOCK_NEXT`. Generate detailed repair plan **without making code/baseline changes**.

**Read** `_reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md` to extract:
```
- Which browsers failed (firefox / webkit / both)?
- Which fixture pages drifted?
- Was it visual diff (>tolerance) or functional?
- Browser-specific known issues (focus-visible on WebKit, font subpixel on Firefox)?
```

**Generate**:
```text
V21_CROSS_BROWSER_BASELINE_REPAIR_PLAN.md
```

Plan structure:
```
## Diagnosis: which baselines drifted on which browser
## Recommended fix:
  Option A: Update baselines (--update-snapshots) — accept new visual state
  Option B: Fix HMV4 source (CSS or DOM) to restore visual parity
  Option C: Increase tolerance (maxDiffPixels, threshold)
  Option D: Defer cross-browser to Wave 8 hardening
## Per-page recommendation
## Risk assessment
## Recommended approval phrase from user
```

**DO NOT update snapshots yet**. User must approve.

### WP0.6 — Optional: Approved repair execution

If user approves with phrase:
```text
"Proceed with Chromium/Firefox/WebKit baseline repair per V21 plan."
```

Then create branch:
```text
codex/wave0-baseline-repair
```

Allowed files:
```text
tests/e2e/module-template-v4-visual.spec.ts-snapshots/*-{chromium,firefox,webkit}.png
_reports/module-template-v4/V21_CROSS_BROWSER_BASELINE_REPAIR_REPORT.md
mom/styles/module-template-v4.css (only if HMV4 source needs fix; never forbidden CSS)
mom/scripts/portal/73-module-template-v4-renderers.js (only if HMV4 source needs fix)
```

Commands:
```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright test --project=chromium --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=firefox --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=webkit --update-snapshots module-template-v4-visual.spec.ts

# Verify all 3 browsers now pass deterministically
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --reporter=list

rm -rf node_modules
cd ../..
```

Decision phrases for repair:
```text
BASELINE_REPAIR_PASS — all 3 browsers stable
BASELINE_REPAIR_PASS_WITH_KNOWN_DIFFS — chromium clean; firefox/webkit have minor known browser-specific diffs accepted with tolerance
BASELINE_REPAIR_FAIL — drift recurs; recommend deferral to Wave 8
```

### WP0.7 — Warning triage per stream

For each PASS_WITH_WARNINGS report (CAPA, NQCASE live, REST C.2):

1. Read the report's `## Remaining warnings` section
2. Classify each warning into:
   - `must_fix_now` (stops Wave 1 progression)
   - `must_fix_in_wave_X` (schedule)
   - `accept_as_known_warning` (document in known-limitations.md)
3. Generate per-stream triage report:
   ```
   V21_<STREAM>_WARNING_TRIAGE_REPORT.md
   ```

For warnings classified `must_fix_now`, generate small repair branches under:
```text
codex/wave0-<stream>-warning-fix
```

Allowed scope: only the file(s) directly relevant to the warning.

### WP0.8 — Wave 0 integration report

Final consolidated report:
```text
V21_PHASE2_INTEGRATION_REVIEW_REPORT.md
```

Sections:
```text
## Summary
## Branch and HEAD
## All 8 work packages: status + decision
## Cross-browser repair: PERFORMED / DEFERRED / REJECTED
## CAPA warnings triage outcome
## NQCASE live API warnings triage outcome
## Backend REST C.2 warnings triage outcome
## Full Chromium E2E final count
## Forbidden diff result
## Current portal safety result
## Known-limitations register: NEW entries
## Wave 1 + Wave 2 prerequisites verified
## Decision phrase
```

Decision phrase:
```text
PHASE2_INTEGRATION_PASS_READY_FOR_WAVE_1
PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING
PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER
PHASE2_INTEGRATION_FAIL_BLOCK_NEXT
```

## Required commands at end of Wave 0

```bash
git checkout main
git pull --ff-only
git status --short                    # expect empty
node --check mom/scripts/portal/7?-module-template-v4-*.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS"
git diff --name-only origin/main..HEAD | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && echo "FAIL" || echo "PASS"
```

## Allowed files in Wave 0

```text
_reports/module-template-v4/V21_*.md (all V21 review/triage reports)
tests/e2e/module-template-v4-visual.spec.ts-snapshots/*-{chromium,firefox,webkit}.png (only on baseline repair branch)
mom/styles/module-template-v4.css (only if Graphics Authority repair needed; non-forbidden)
mom/scripts/portal/73-module-template-v4-renderers.js (only if visual fix needed at source)
mom/scripts/portal/72-module-template-v4-bridge.js (only if bridge alias warning fix)
mom/scripts/portal/70-module-template-v4-hydration.js (only if live-api fallback warning fix)
docs/known-limitations.md (NEW — to track accepted warnings)
```

## Forbidden in Wave 0

```text
Any new slice (Slice 9+ remains paused)
Any new feature
Any feature flag default change in mom/portal.html
mom/portal.html (other than HMV4 begin/end block; usually no change needed in Wave 0)
mom/styles/portal.main.css, eqms-suite.css, density-darkmode.css
mom/scripts/portal/01-module-router.js, 02-state-auth-ui.js, 40-eqms-shell.js
mom/qms-data/**
mom/api/** (no backend mutation in Wave 0)
HMV4_PREVIEW_ENABLED=true / HMV4_LIVE_API_ENABLED=true in any committed file
```

## Workload estimate

```text
Codex sessions: 1-3
  Session 1: WP0.1 + WP0.2 + WP0.3 (verification + status matrix + guards) — 2-3 hr
  Session 2: WP0.4 + WP0.5 (E2E reality check + repair plan) — 2-3 hr
  Session 3 (optional): WP0.6 (approved repair execution) — 1-2 hr
  Session 4: WP0.7 + WP0.8 (warning triage + integration report) — 2-3 hr

Human review: 1-2 days
Calendar elapsed: 1-3 days (with parallel Codex)
```

## Wave 0 success criteria checklist (15-question per RULE-6)

```
1. Did V21 integration report get generated? [ ]
2. Was cross-browser repaired or formally deferred? [ ]
3. Are all 3 Phase 2 PASS_WITH_WARNINGS triaged? [ ]
4. Are warning categories classified (must-fix / schedule / accept)? [ ]
5. Was full Chromium E2E count established? [ ]
6. Were any forbidden files modified? Should be NO. [ ]
7. Was 74-fixtures.js loaded by portal.html? Should be NO. [ ]
8. Did current portal posture remain inert by default? [ ]
9. Were reports tracked intentionally? [ ]
10. Was Graphics Authority compliance maintained (no hex/px in JS)? [ ]
11. Did Wave 0 START any new business slice? Should be NO. [ ]
12. Was any uncontrolled mutation introduced? Should be NO. [ ]
13. Were Phase 4 megaprompts paused (not executed)? [ ]
14. Are Wave 1 prerequisites satisfied for next wave? [ ]
15. Is the decision phrase one of the 4 standard phrases? [ ]
```

## Per RULE-1 — Three-stage graduation reminder

This wave does NOT graduate any slice from fixture mode to live mode. Wave 0 is pure stabilization — no graduation events.

## Per RULE-2 — AI governance reminder

No AI feature work in Wave 0. AI advisory work begins in Wave 7.

## Per RULE-3 — Pre-production wording

Throughout Wave 0 reports:
- ✅ Use: `repair`, `stabilization`, `pre-production readiness`, `current portal safety`
- ❌ Avoid: `production cutover`, `production fix`, `production release`

## Decision phrase output

Wave 0 returns ONE of:

```text
PHASE2_INTEGRATION_PASS_READY_FOR_WAVE_1
  → Wave 1 + Wave 2 may begin

PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING
  → Specific small repairs scheduled in Wave 1; Wave 1 begins; Wave 2 waits

PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER
  → Cross-browser cannot be repaired in current Codex session; user must decide:
    - approve update-snapshots (accept new state)
    - request HMV4 source fix
    - defer to Wave 8 with explicit acceptance

PHASE2_INTEGRATION_FAIL_BLOCK_NEXT
  → Severe issue (forbidden file modified, security regression, etc.)
    User must intervene before any wave proceeds.
```

## Inputs Wave 0 expects

The Codex agent running Wave 0 needs read access to:
```text
_reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md
_reports/module-template-v4/S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md
_reports/module-template-v4/S_LIVE_API_TOGGLE_NQCASE_REPORT.md
_reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md
mom/scripts/portal/7?-module-template-v4-*.js
tests/e2e/module-template-v4-visual.spec.ts-snapshots/
tests/fixtures/module-template-v4/**
mom/portal.html (read-only verification)
```

## Outputs Wave 0 produces

```
_reports/module-template-v4/V21_PHASE2_CURRENT_MAIN_VERIFICATION_REPORT.md
_reports/module-template-v4/V21_PHASE2_STREAM_STATUS_MATRIX.md
_reports/module-template-v4/V21_PHASE2_FULL_CHROMIUM_E2E_REPORT.md
_reports/module-template-v4/V21_CROSS_BROWSER_BASELINE_REPAIR_PLAN.md
_reports/module-template-v4/V21_CROSS_BROWSER_BASELINE_REPAIR_REPORT.md (if executed)
_reports/module-template-v4/V21_CAPA_WARNING_TRIAGE_REPORT.md
_reports/module-template-v4/V21_NQCASE_LIVE_API_WARNING_TRIAGE_REPORT.md
_reports/module-template-v4/V21_TRANSACTIONAL_REST_WARNING_TRIAGE_REPORT.md
_reports/module-template-v4/V21_PHASE2_INTEGRATION_REVIEW_REPORT.md (FINAL)
docs/known-limitations.md (NEW or updated)
```

## Codex prompt to run Wave 0 (paste into Codex local)

```text
You are in local repo sanhvo86-hesem/mom.

Run Wave 0 — Phase 2 Integration Stabilization per:
_reports/module-template-v4/HESEM_MERGED_WAVE_PLAN_V3/01_WAVE_0_STABILIZATION.md

Step 1: WP0.1 verify current main + reports inventory
Step 2: WP0.2 stream status matrix from 4 Phase 2 reports
Step 3: WP0.3 static guard sweep
Step 4: WP0.4 full Chromium E2E reality check + classify failures
Step 5: WP0.5 cross-browser repair plan (NO snapshot updates yet)
Step 6: WP0.7 warning triage per stream (3 streams)
Step 7: WP0.8 final integration report with decision phrase

Allowed files per the wave plan (only V21_*.md reports + read-only repo).

Forbidden:
- New slice
- Phase 4 megaprompt execution
- Forbidden file modification
- HMV4_PREVIEW_ENABLED=true / HMV4_LIVE_API_ENABLED=true defaults
- Production wording

Generate all 9 output artifacts listed in the wave plan.

Decision phrase output: ONE of
  PHASE2_INTEGRATION_PASS_READY_FOR_WAVE_1
  PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING
  PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER
  PHASE2_INTEGRATION_FAIL_BLOCK_NEXT

Do not start Wave 1 work in this session. Wave 1 begins only after user approves Wave 0 outcome.
```

## Risk register for Wave 0

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| Cross-browser repair doesn't fix root cause; drift recurs | Medium | High | Defer to Wave 8 with explicit accept-as-known |
| Triage discovers a "must-fix-now" warning needing renderer change | Medium | Medium | Small isolated branch in WP0.6 |
| Full Chromium E2E discovers >5 unrelated regressions | Low | High | Stop Wave 0; escalate to user |
| Wave 0 takes >1 week | Medium | Medium | Time-box to 3 days; if not done, accept partial PASS_WITH_REPAIRS_PENDING and continue |
| Warning triage uncovers security regression | Low | Critical | Stop ALL waves; user intervention; security review per Wave 8 acceleration |

## Successor wave gate

After Wave 0 completes with `PASS_READY_FOR_WAVE_1` or `PASS_WITH_REPAIRS_PENDING`:

```text
Wave 1 may begin in parallel session.
Wave 2 may begin only after Wave 1 documentation pass.
Wave 5 (Phase 4 megaprompts: Slices 9-12) may begin only after Wave 4 live-API hardening pass.
```

If Wave 0 returns `BLOCKED_CROSS_BROWSER` or `FAIL`:
```text
NO wave begins.
User must approve recovery action.
```

```
WAVE_0_PLAN_BASELINE_LOCKED
```
