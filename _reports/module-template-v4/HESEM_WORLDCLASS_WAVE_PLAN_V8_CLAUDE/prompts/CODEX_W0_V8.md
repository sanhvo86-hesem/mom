# CODEX_W0_V8 — Phase 2 Integration Review + Repair Coordinator

```text
You are Codex acting as Phase 2 Integration Review and Repair Coordinator for HESEM Operations Platform.
Goal: Stop drift; verify current main; classify stream status; repair Chromium / cross-browser baseline blocker; produce go/no-go decision.

Mandatory reads (in order):
  1. .ai/AI-WORKFLOW.md
  2. .ai/CONVENTIONS.md
  3. .ai/repo-map.json
  4. AGENTS.md
  5. CLAUDE.md
  6. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/00_V8_MASTER_THESIS.md
  7. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/02_V8_INVARIANTS_AND_EXECUTABLE_CHECKS.md
  8. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/27_V8_WAVE_PLAN_REFINED.md (W0 section)
  9. existing _reports/module-template-v4/V21_*.md if present
  10. existing _reports/module-template-v4/EXECUTIVE_REVIEW_FOR_GPT_PRO.md
  11. tests/e2e/module-template-v4*.spec.ts (current state)

Repo state to verify:
  - run: git status --short
  - run: git log --oneline --decorate -20
  - run: branch --show-current
  - run: git diff main..HEAD --stat
  - identify: which Phase 2 stream reports exist + their decision phrases
  - identify: cross-browser baseline status (chromium / firefox / webkit)

Non-negotiables:
  - Do NOT start any new slice work
  - Do NOT modify forbidden files (per V8 file 13 + schemas/forbidden_diff_v8.yaml)
  - Do NOT enable HMV4_PREVIEW_ENABLED (must remain false on main)
  - Do NOT load 74-fixtures.js in mom/portal.html
  - Do NOT change HMV4_DISABLE_MUTATION_LAUNCHERS default (must remain true)

Required checks (10):
  C1. node --check mom/scripts/portal/{70,71,72,73,74}-module-template-v4-*.js
  C2. python tools/scripts/validate_fixtures.py over tests/fixtures/module-template-v4/**/*.json
  C3. forbidden file diff guard: git diff main..HEAD --name-only | grep -E (per V8 file 13 list) → must be empty
  C4. grep "74-module-template-v4-fixtures" mom/portal.html → must be 0
  C5. inert defaults verified per V8 file 14
  C6. cd tests/e2e && npm run test:hmv4 -- --project=chromium (full E2E)
  C7. read CAPA Slice 4 / NQCASE Slice 2 / Backend C2 PASS_WITH_WARNINGS classifications
  C8. Run promotion-bundle audit per V8 file 41 (any pending L promotion bundles)
  C9. Audit chain integrity job (if implemented; otherwise note as pending W0.5)
  C10. Stream status matrix classification (3-7 streams: classify each)

Required outputs (4):
  O1. _reports/module-template-v4/V21_PHASE2_CURRENT_MAIN_VERIFICATION_REPORT.md
  O2. _reports/module-template-v4/V21_PHASE2_STREAM_STATUS_MATRIX.md
  O3. _reports/module-template-v4/V21_CROSS_BROWSER_CHROMIUM_BASELINE_REPAIR_PLAN.md
  O4. _reports/module-template-v4/V21_PHASE2_INTEGRATION_REVIEW_REPORT.md

Decision phrase (one of):
  - PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
  - PHASE2_INTEGRATION_PASS_WITH_WARNINGS
  - PHASE2_INTEGRATION_FAIL_BLOCK_NEXT
  - PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER

Acceptance criteria for PASS_READY_FOR_PHASE3_PLANNING:
  - C1..C10 all pass
  - Chromium E2E: 100% pass, no regressions
  - Forbidden file diff: empty
  - All Phase 2 stream PASS_WITH_WARNINGS classifications resolved (must_fix_now / schedule / accept)
  - All required reports authored

Failure mode response:
  - If C6 fails (Chromium baseline FAIL): emit PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER
    do NOT proceed to W0.5 planning until repaired
  - If C3 fails (forbidden file changed): emit PHASE2_INTEGRATION_FAIL_BLOCK_NEXT
    auto-revert offending change
  - If any V8 invariant from file 02 detected as violated: emit PHASE2_INTEGRATION_FAIL_BLOCK_NEXT

End of W0 prompt.
```
