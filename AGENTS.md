# AGENTS.md

## Repository Mission

This repository is an integrated ERP + MOM + MES + EQMS platform for CNC/discrete manufacturing. Work must strengthen planning, execution, quality, traceability, analytics, and governance without rewriting the custom MVC architecture.

## Architectural Rules

- Preserve the existing PHP custom MVC structure, router, middleware, services, migrations, and legacy fallback patterns.
- Preserve `mom/api/index.php` boot flow, middleware ordering, router semantics, and legacy fallback behavior unless a documented security blocker requires a narrow exception.
- Prefer extending existing controllers, services, repositories, and controlled registries over creating parallel abstractions.
- Do not rewrite the platform, replace the framework, or introduce broad infrastructure without a documented blocker.
- Keep ERP, MOM, MES, EQMS, analytics, and integration boundaries explicit and ISA-95 aligned.
- Production write paths must be role-guarded, auditable, replay-aware where applicable, and least-privilege.

## Source-of-Truth Policy

- Execution truth belongs to MOM/MES service paths, not analytics, AI, dashboards, or generic CRUD.
- Snapshots are read models unless explicitly documented as the operational authority.
- Append-only event history is preferred for production reporting, corrections, overrides, quality evidence, and traceability.
- File-backed stores may remain compatibility authority only when documented with a DB bridge or migration path.
- Advisory AI must never silently replace, mutate, complete, dispatch, approve, or command execution truth.
- AI-named scheduling, maintenance, quality, and copilot routes must return advisory proposals or human-review intent unless they delegate to an explicit governed planning/EQMS write path.

## Validation Commands

Run the maximum safe subset for every change:

- `./composer analyse -- --memory-limit=1G`
- `./composer test`
- `./composer check`
- Focused `php -l`, PHPUnit, PHPStan, migration, and grep checks for touched files when full-suite analysis is blocked by existing debt.

## Branch And Worktree Safety

- Never perform remediation directly on the user's original branch. Create a `codex/...` remediation branch from the current local HEAD before code or documentation changes.
- Inspect `git status`, current branch, diff stat, changed filenames, and merge-base before remediation.
- If the worktree is dirty at handoff, create the remediation branch from that exact state and make a safety checkpoint commit before further remediation.
- Create a lightweight safety tag before major remediation when requested by the task.
- Do not revert user or prior-agent changes unless explicitly instructed. Work with existing dirty files and keep unrelated changes intact.
- When using audit agents or child worktrees, isolate their output and integrate only reviewed, intentional changes.
- Agent branches must never merge directly to `main`; integrate reviewed changes into the root remediation branch first.

## Merge To Main Cleanup

- Merge to `main` only after remediation is integrated, validation is run or blocked with evidence, the worktree is clean, and the merge gate is GO.
- Do not merge to `main` with any confirmed P0 defect open. Do not merge with confirmed P1 defects open unless each has explicit documented rationale, owner path, and next remediation step.
- Prefer a fast-forward merge from the root remediation branch into local `main`; when `main` has moved, rebase the root branch onto `main`, rerun critical validation, and retry the fast-forward. If conflicts or validation failures cannot be resolved safely, stop and keep the remediation branch intact.
- After a successful merge, delete the root remediation branch and temporary agent branches/worktrees created for that remediation.
- Never delete `main` or the user's original branch.

## Citations And Research

- Use internet only for benchmark/standards refresh and cite official sources in benchmark docs.
- Allowed research domains: `openai.com`, `platform.openai.com`, `developers.openai.com`, `help.openai.com`, `sap.com`, `help.sap.com`, `siemens.com`, `plm.sw.siemens.com`, `3ds.com`, `aveva.com`, `tulip.co`, `docs.cloud.google.com`, `learn.microsoft.com`, `isa.org`, `mtconnect.org`, `opcfoundation.org`, `nist.gov`.
- Never send repository content, secrets, code, data, or private operational details to external services.

## Multi-Agent Audit Routing

- Global benchmark and standards work: SAP, Siemens, Dassault, AVEVA, Tulip, Google, Microsoft, ISA-95, MTConnect, OPC UA, NIST, ISA/IEC 62443.
- ERP/planning work: sales orders, job orders, work orders, routing, schedule, lifecycle, enterprise/site/work-center semantics.
- MOM/MES execution work: dispatch, operator assignment, reporting, idempotency, event journals, offline sync, performance.
- EQMS work: inspection gates, SPC, NCR/deviation/CAPA adjacency, reason codes, evidence integrity, signatures.
- CNC/digital-thread work: item revision, operation, setup sheet, CNC program, inspection plan, genealogy, MTConnect/OPC UA readiness.
- AI/security/reliability work: AI advisory boundaries, projections, copilot grounding, OT/IT controls, audit, CSRF, replay safety, DevEx.

## Mandatory Workflow

**Read `.ai/AI-WORKFLOW.md` before starting any task.** It defines the 4-phase process:
- Phase 0: ORIENT — read CONVENTIONS.md, repo-map.json, AGENTS.md
- Phase 1: LOCATE — use index files, never scan directories blindly
- Phase 2: PLAN — state domain, tables, exact file paths, regression surface
- Phase 3: EXECUTE — write code/files at exactly the stated locations
- Phase 4: VERIFY — PHPStan + PHPUnit + index regeneration

## File Placement

- **Every new file must be verified against `.ai/CONVENTIONS.md` before creation.**
- NEVER place files at repo root (except CLAUDE.md, AGENTS.md, web files, dotfiles).
- NEVER place reports, AI artifacts, or development notes inside `mom/docs/` root.
- `mom/docs/` contains ONLY 5 subdirs served by the app: `forms/`, `training/`, `system/`, `operations/`, `glossary/`
- AI-generated reports belong in `_reports/<category>/` or `mom/data/registry/` or `mom/release/`.

## AI Index Usage

- Start every task by reading `.ai/repo-map.json` for orientation.
- Use Grep on `.ai/db-map/index.json` to find a table's domain, then read `.ai/db-map/<domain>.json`.
- Use Grep on `.ai/symbols.json` to find a class, do NOT read the full file.
- After significant code changes, regenerate: `php tools/scripts/ai-index/generate.php --verbose`

## Change Discipline

- Every future change must preserve ERP/MOM/MES/EQMS boundary discipline.
- Do not add direct machine-control behavior in this application layer.
- Do not hide unfinished work in documentation; either implement the safe remediation or record the precise blocker and next step.
- Keep diffs localized, auditable, tested, and compatible with existing public contracts.
- When closing audit debt, explicitly classify duplicate/storage drift and regression-test gaps instead of treating them as generic follow-up work.
