# 13 — V8 Forbidden Diff Scanner

```text
purpose:        Bind V7's "forbidden file diff guard" name to executable mechanism
predecessor:    V7 §23 line 21 (named); V5 ADR-0004 (V3 file 11 frozen list); CLAUDE.md
v8_advance:     YAML registry of forbidden patterns + linter + CI workflow + auto-rollback
work_package:   WP-V8-FDF (1 work package)
owner:          Platform Lead
estimate:       1 engineering-week
```

---

## 1. Forbidden registry

`schemas/forbidden_diff_v8.yaml`:

```yaml
forbidden_paths:
  - path: mom/portal.html
    rule: only-feature-flag-block-allowed
    allowed_diff_pattern: "^[+-]?\\s*<!--\\s*(BEGIN|END)\\s+HMV4_FEATURE_FLAGS"
    severity: BLOCK
  - path: mom/styles/portal.main.css
    rule: never
    severity: BLOCK
  - path: mom/styles/eqms-suite.css
    rule: never
    severity: BLOCK
  - path: mom/styles/density-darkmode.css
    rule: never
    severity: BLOCK
  - path: mom/scripts/portal/01-module-router.js
    rule: never
    severity: BLOCK
  - path: mom/scripts/portal/02-state-auth-ui.js
    rule: never
    severity: BLOCK
  - path: mom/scripts/portal/40-eqms-shell.js
    rule: never
    severity: BLOCK
  - path: mom/qms-data/**
    rule: never (no production registry promotion without explicit approval)
    severity: BLOCK
  - path: mom/api/index.php
    rule: only-bootstrap-changes-allowed
    severity: WARN

forbidden_patterns_in_text:
  - id: HARDCODED_HEX_IN_JS
    description: Hex color in JS string outside graphics-authority
    pattern: '"#[0-9A-Fa-f]{3,8}"'
    files: [mom/scripts/portal/**/*.js]
    exclude: [mom/scripts/portal/00bb-graphics-authority.js, **/*.test.js]
    severity: WARN
  - id: HARDCODED_PX_IN_JS
    description: Pixel literal in JS string
    pattern: "'\\d+px'"
    files: [mom/scripts/portal/**/*.js]
    exclude: [mom/scripts/portal/00bb-graphics-authority.js]
    severity: WARN
  - id: FIXTURE_LOAD_IN_PORTAL
    description: 74-fixtures.js loaded by portal.html
    pattern: "74-module-template-v4-fixtures"
    files: [mom/portal.html]
    severity: BLOCK

forbidden_phrases_in_commits:
  - id: PROD_WORDING
    pattern: "(?i)production go-?live|production cutover|production release|validated production"
    exception_marker: "release_authority:"
    severity: BLOCK
```

---

## 2. Detection mechanism

```yaml
ci_workflow: .github/workflows/v8/forbidden-diff.yml
trigger: pull_request
steps:
  - checkout main + HEAD
  - generate diff: git diff main..HEAD --name-only > /tmp/changed_files.txt
  - for each changed file:
      - lookup in forbidden_paths
      - if rule == 'never' → BLOCK
      - if rule == 'only-feature-flag-block-allowed':
          → diff lines must all match allowed_diff_pattern
          → otherwise BLOCK
      - if rule == 'only-bootstrap-changes-allowed':
          → annotate WARN; require ADR
  - for each forbidden_pattern_in_text:
      - run grep over changed files (not exclude)
      - if match → severity-based action
  - for commit messages:
      - check forbidden_phrases unless exception_marker present
required_check: yes
```

---

## 3. Auto-rollback (V8 advance)

If a merged commit slips through (e.g., emergency push):

```yaml
post_merge_audit_job: hourly
detection: same patterns as CI but on main branch
on_violation:
  - SEV-1 alert
  - auto-create rollback PR (revert offending commit) IF severity == BLOCK
  - notify owner of changed file (per CODEOWNERS)
  - emit OTG audit_event with class='forbidden_diff_postmerge'
```

---

## 4. Adding new forbidden entries

```yaml
process:
  1. propose ADR-V8-FDF-NNNN
  2. get sign-off from Platform Lead + affected domain Lead
  3. PR to schemas/forbidden_diff_v8.yaml
  4. include rationale + scope + exception conditions
  5. announce in #platform Slack 7d before activation
quarterly_review:
  - prune entries that no longer apply
  - confirm Owners are current
```

---

## 5. Decision phrase

```text
V8_FORBIDDEN_DIFF_SCANNER_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-FDF-1
NEXT_FILE: 14_V8_INERT_FLAG_REGISTRY.md
```
