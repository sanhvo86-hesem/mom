# Prompt 03 Platform Post-Merge Public Repo Truth Convergence Repair Prompt (2026-04-08)

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This is a **narrow repair prompt**.
It is **not** an architecture prompt.
It is **not** a new planning phase.
It is **not** a broad research package.

Your only goal is to make **public repo truth** match the latest claimed post-schema-merge convergence state.

## Source of truth order

Use these in this exact order:
1. current repo code and tree
2. current generated artifacts in the repo
3. `platform-post-merge-public-repo-truth-deep-evaluation-2026-04-08.md`
4. prior prompts only as historical context

If any chat-history claim conflicts with repo files, **repo files win**.

## Scope

### In scope
- `01-QMS-Portal/database/`
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/qms-data/registry/`
- `01-QMS-Portal/tools/registry/`
- `01-QMS-Portal/docs/ai-prompts/`
- related tests or tiny helper scripts needed to prove convergence

### Out of scope
- new domain architecture
- new runtime modules unrelated to repo-truth convergence
- broad frontend planning
- new giant reports that duplicate existing prompt chain

## Hard constraints

- Do **not** claim success from local memory or previous chat output.
- Do **not** mark a workstream done unless the corresponding file is actually written into the repo.
- Do **not** keep split truth between manifest and quality report.
- Do **not** keep hidden explanations outside the repo for `533` vs `528`.
- Do **not** create ghost artifacts.
- Do **not** create another non-authoritative prompt package.
- Do **not** broaden beyond repo-truth convergence.

## Exact work to perform

### 1) Materialize schema authority explicitly
Create these files and keep them small:
- `01-QMS-Portal/database/schema-authority-summary.json`
- `01-QMS-Portal/database/schema-authority-summary.md`
- `01-QMS-Portal/qms-data/registry/schema-authority-summary.json`
- `01-QMS-Portal/qms-data/registry/schema-authority-summary.md`

They must state clearly:
- executable schema source of truth
- blueprint/reference/spec files and their role
- whether parity is exact or intentionally transformed
- generation timestamp / run id if used

### 2) Materialize schema parity explicitly
Create:
- `01-QMS-Portal/qms-data/registry/schema-parity-report.json`

It must machine-readably explain:
- schema object count in merged schema authority
- registry object count used for publication
- whether there are partitions/views/derived assets excluded from frontend entity count
- exact explanation for any difference such as `533` vs `528`

If the right answer is truly `533 == 533`, then make all public artifacts say that.
If the right answer is `533 schema objects` vs `528 frontend records`, explain why with explicit categories.

### 3) Converge canonical publication metrics
Regenerate and reconcile from one publication authority:
- `registry-manifest.json`
- `registry-quality-report.json`
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`

Required outcomes:
- same `generatedAt` family
- same `publication_run_id`
- same workflow bridge counts
- same ready / partial / blocked semantics
- no `103/12` vs `104/11` split
- no summary counts that disagree with the publishability gate

If the real truth is still blocked, keep it honestly blocked.
If the real truth is green, make every canonical artifact agree.

### 4) Materialize compact public proof package
Create these files in `01-QMS-Portal/qms-data/registry/`:
- `publication-truth-summary.json`
- `publication-truth-summary.md`
- `foundation-governance-publication-summary.json`
- `foundation-governance-publication-summary.md`

Rules:
- global summary must describe platform-global status
- slice summary must describe only Foundation Governance slice
- both must include run id, generated time, counts, and blunt honesty statement
- both must be small and GitHub-renderable

### 5) Materialize verifier scripts
Create in `01-QMS-Portal/tools/registry/`:
- `verify_schema_authority.py`
- `verify_publication_truth.py`

They must fail when:
- summary files are missing
- schema authority files are missing
- manifest / quality report counts disagree
- `533` vs `528` is unexplained
- global summary and slice summary scopes are mixed up
- OpenAPI version in summary conflicts with the spec file

### 6) Bring OpenAPI claim into public truth
Public `openapi.yaml` currently shows `3.1.1`.
You must choose only one of these outcomes:

#### Option A — upgrade public repo truth
If valid and already supported by your tooling, update public `openapi.yaml` to `3.1.2` and keep all other claims aligned.

#### Option B — downgrade the narrative
If you are not actually shipping `3.1.2` yet, keep the file at `3.1.1` and make every summary/verifier/report say `3.1.1`.

Unacceptable outcome:
- public spec says `3.1.1` while summaries claim `3.1.2`
- public spec says `3.1.2` but verifier still encodes `3.1.1`

### 7) Reset prompt authority in public tree
Create:
- `01-QMS-Portal/docs/ai-prompts/CURRENT-PLATFORM-AUTHORITY-PUBLIC-REPO-TRUTH-2026-04-08.md`

This file must state:
- current active authority lane
- which prompt is now current
- which historical prompt files are superseded but retained for traceability
- that the next priority is repo-truth convergence, not new architecture

### 8) Write a minimal execution report
Create:
- `01-QMS-Portal/docs/ai-prompts/prompt-03-platform-post-merge-public-repo-truth-convergence-repair-execution-report-2026-04-08.md`

Keep it concise.
It must list:
- files changed
- whether convergence is now honest green or honest hold
- exact remaining blockers if any

## Required final report format

Return exactly these sections:
1. files changed
2. public schema authority status
3. publication metric convergence status
4. `533` vs `528` resolution
5. compact proof files created or not
6. verifier scripts created or not
7. OpenAPI final truth (`3.1.2` or `3.1.1`)
8. blunt verdict:
   - `PASS — PUBLIC REPO TRUTH CONVERGED`
   - or `HOLD — PUBLIC REPO STILL NOT SELF-PROVING`

## Reminder

This prompt is successful only if a reviewer opening **public GitHub tree pages** can verify the claimed state without relying on chat history.
