# REPORT_PERSISTENCE_DECISION.md

## Current state

`_reports/` is ignored:

```text
.gitignore:8:_reports/	_reports
.gitignore:8:_reports/	_reports/module-template-v4/STEP10_QA_REGRESSION_REPORT.md
```

Current reports are local Codex artifacts under:

```text
_reports/module-template-v4/
```

## Option A - Keep `_reports/` ignored

Use local reports only. Good for temporary Codex output and consistent with the current repository ignore rule.

Pros:

- No `.gitignore` change.
- No new tracked documentation tree.
- Compatible with the repo rule that AI-generated reports belong under `_reports/<category>/` unless a tracked release location is explicitly approved.

Cons:

- Reports are not preserved in Git.
- Release reviewers need a separate handoff if these reports must become formal evidence.

## Option B - Add tracked QA reports under docs

Prompt candidate path:

```text
docs/qa/module-template-v4/
```

Candidate files:

```text
docs/qa/module-template-v4/STEP9_PATCH_EXECUTION_REPORT.md
docs/qa/module-template-v4/STEP10_QA_REGRESSION_REPORT.md
docs/qa/module-template-v4/STEP10_5_QA_HARDENING_REPORT.md
```

Pros:

- Tracked QA evidence is easy to review.
- Better for release governance if the team wants formal sign-off artifacts.

Cons:

- Requires an explicit repository file-placement decision.
- The local repo conventions favor `_reports/<category>/` or release-controlled locations for generated reports.

## Option C - Add tracked reports under tests/fixtures

Candidate path:

```text
tests/fixtures/module-template-v4/reports/
```

Pros:

- Keeps prototype evidence near fixtures.
- Avoids root-level docs decisions.

Cons:

- Mixes QA reports with fixture inputs.
- Less appropriate for release-procedure evidence.

## Recommendation

For this Step 10.5 run, use Option A and keep `_reports/` ignored. If formal tracked evidence is required, approve a dedicated tracked release-evidence location before moving or duplicating reports. Do not change `.gitignore` in Step 10.5.
