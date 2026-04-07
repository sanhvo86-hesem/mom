# Prompt 03 Platform Convergent Execution Runbook (2026-04-07)

## Why this runbook exists

The next platform pass should be executed as **one concurrent convergence run**, not as another long serial prompt chain.
This runbook tells the operator exactly how to use the active prompt and what outputs to expect.

## Active prompt

Run:

`prompt-03-platform-single-schema-authority-and-global-proof-convergence-prompt-2026-04-07.md`

## What this pass is supposed to do simultaneously

### Lane A — Schema authority
- make `schema.sql` explicit source of truth
- classify blueprint/spec as reference artifacts
- create machine-readable schema authority files

### Lane B — Registry/publication convergence
- unify manifest / quality report / endpoint catalog / frontend catalog under one authority
- reconcile bridge counts
- explain or fix 533-vs-528 accounting

### Lane C — Reviewer proof package
- add compact global and slice summaries
- make GitHub web UI sufficient for a first-pass review

### Lane D — Contract convergence
- move OpenAPI to 3.1.2
- keep Foundation/Governance contracts truthful to runtime

### Lane E — Prompt authority reset
- publish current prompt authority and lineage
- retire historical prompt ambiguity

### Lane F — Verification
- strengthen verifiers
- regenerate artifacts truthfully
- do not fake runtime proof if the environment cannot execute it

## Operator instructions

1. Open a **fresh GPT Codex section**.
2. Paste the full content of the active prompt.
3. Do **not** add extra instructions that broaden scope.
4. Let Codex work through the whole repo in one run.
5. Reject outputs that are only reports without repo changes.
6. Accept only a final report that includes exact changed files and a blunt verdict.

## What a good result looks like

A good result is **not** “many new markdown files”.
A good result is:
- schema authority explicit,
- publication truth converged,
- compact proof summaries present,
- OpenAPI patched to 3.1.2,
- prompt authority explicit,
- any remaining blockers documented honestly and locally.

## What a bad result looks like

Reject the result if any of the following happens:
- metrics still disagree across manifest and quality report
- 533-vs-528 remains unexplained
- OpenAPI remains 3.1.1 without an explicit reason
- compact proof files are missing
- slice/global scope is still conflated
- current-authority doc is not added
- result claims green but canonical artifacts still show `review_required`

## Minimum expected file outputs

At minimum, the run should create or update:
- `database/schema-authority.md`
- `database/schema-authority.json`
- `qms-data/registry/publication-entity-accounting.json`
- `qms-data/registry/publication-truth-summary.md`
- `qms-data/registry/publication-truth-summary.json`
- `qms-data/registry/foundation-governance-publication-summary.md`
- `qms-data/registry/foundation-governance-publication-summary.json`
- `docs/ai-prompts/prompt-lineage-index-2026-04-07.json`
- `docs/ai-prompts/CURRENT-PLATFORM-AUTHORITY-2026-04-07.md`
- `docs/ai-prompts/prompt-03-platform-single-schema-authority-and-global-proof-convergence-execution-report-2026-04-07.md`

## Recommended commit style after applying the run

Use a commit message that reflects convergence, not architecture.
Example:

`chore(platform): converge single-schema authority and global proof package`

## Stop condition

Stop the pass only when one of these is true:

### PASS state
The repo can honestly say:
- one schema authority,
- one publication authority,
- one compact proof package,
- one current prompt authority.

### HOLD state
Only genuine blockers remain and they are:
- local-environment execution blockers,
- external infrastructure blockers,
- or domain decisions that cannot be inferred safely.

If the pass stops for any other reason, it is incomplete.
