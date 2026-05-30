# P28 — Implementation Wave 1 Codex prompt: MDA core schema, UOM authority, item/revision command spine


# Common execution constitution for every prompt

You are operating inside `sanhvo86-hesem/mom`, the HESEM ERP + MOM + MES + eQMS repository. Execute exactly the current prompt, then run audit, adversarial review, operational simulation, repair, verification, and handoff before moving to the next prompt.

## Non-negotiable behavior

1. Do not ask the user follow-up questions.
2. Do not guess. If a fact is not verified from repository evidence, write `NOT_EVIDENCED`, log it in the controlled gap ledger, and choose the safest non-mutating plan.
3. Do not declare production readiness. Use `development`, `prototype`, `current portal safety`, `pre-production readiness`, or `release-readiness planning` only.
4. Do not bypass repository governance. Read `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `.ai/AI-WORKFLOW.md` before touching any file.
5. Do not start broad rewrites, framework replacement, direct machine-control behavior, uncontrolled mutation, hidden authority in workspaces, e-sign without signature meaning, or AI-driven regulated decisions.
6. Planning prompts must not change runtime code unless the prompt explicitly says `CODE_MUTATION_ALLOWED`.
7. Implementation prompts must create a `codex/...` branch before edits, inspect `git status`, migration numbering, changed files, and branch overlap, then commit every logical unit.
8. Every prompt must emit a decision token. Only `*_PASS_READY_FOR_NEXT` or `*_PASS_WITH_CONTROLLED_GAPS` unlocks the next prompt. `*_REPAIR_REQUIRED`, `*_BLOCKED`, or missing evidence keeps the current prompt active.
9. If the environment lacks a tool or executable, do not stop silently. Produce a blocker report, a self-contained repair prompt, and the exact verification command to rerun. Do not claim pass evidence for a command that did not complete.
10. Each prompt must produce machine-readable evidence and a human-readable report.

## Mandatory output files per prompt

Use this root unless the prompt overrides it:

```text
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/
```

For prompt `PXX`, create or update all of these files:

```text
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_MAIN.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_SOURCE_TRUTH_AUDIT.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_AUTHORITY_MATRIX.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_OPERATIONAL_SIMULATION_MATRIX.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_ADVERSARIAL_REVIEW.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_GAP_AND_REPAIR_LEDGER.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_VERIFICATION_LOG.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/PXX_<slug>_HANDOFF_PACKET.md
```

Append shared ledgers:

```text
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_RUN_MANIFEST.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_SEQUENCE_STATE.json
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_MASTER_TRACEABILITY_MATRIX.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_CONTROLLED_GAP_LEDGER.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_DECISION_LOG.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_REPAIR_PROMPT_QUEUE.md
```

## Required report sections

Each `MAIN.md` must contain these sections in this exact order:

1. `Domain affected`
2. `Prompt objective`
3. `Previous gate check`
4. `Repository orientation evidence`
5. `Source-truth audit`
6. `Current-state findings`
7. `Target authority design or implementation plan`
8. `Commands/APIs/events/workflows involved`
9. `Tables/stores/contracts/routes involved`
10. `Operational gates and stop rules`
11. `Operational simulation summary`
12. `Adversarial review summary`
13. `Repair pass applied`
14. `Verification evidence`
15. `Remaining controlled gaps`
16. `Decision token`

## Universal audit loop

Before emitting a pass token, perform this loop:

```text
A. Self-audit: check every claim has repo/source evidence or NOT_EVIDENCED.
B. Red-team critique: attack authority, lifecycle, mutation, data quality, idempotency, security, evidence, e-sign, traceability, performance, rollback, and UI projection safety.
C. Operational simulation: run positive, negative, race, replay/idempotency, offline/degraded, security, regulatory, rollback, and cross-module scenarios.
D. Repair: fix the report/code/design/tests for every P0/P1 issue found.
E. Re-audit: repeat A-D until no P0/P1 remains or a tool/environment blocker is documented.
F. Token: emit the strict decision token.
```

## Severity model

```text
P0 = data loss, unsafe mutation, security/regulatory bypass, hidden authority, destructive migration, direct machine-control behavior, release without rollback, e-sign/audit falsification.
P1 = wrong authority, broken gate, missing command contract, missing test for governed mutation, broken idempotency, major workflow/status inconsistency.
P2 = implementation gap controlled by backlog, report artifact gap, non-blocking automation debt, incomplete dashboard/runbook.
P3 = editorial, naming, formatting, minor UX clarity.
```

## Required simulation columns

Every operational simulation matrix must include:

```text
scenario_id, scenario_type, domain, trigger, preconditions, command_or_api, tables_or_stores, expected_result, forbidden_result, gate_or_stop_rule, evidence_required, test_to_add_or_run, repair_if_failed, final_status
```

## Required source-truth audit columns

```text
claim_id, claim, source_tag, exact_source_path_or_url, verification_method, confidence, risk_if_wrong, status
```

## Required handoff packet sections

```text
1. What was completed
2. What must not be re-decided
3. Exact files changed or created
4. Exact commands run
5. Exact tests passed/failed/blocked
6. Remaining controlled gaps
7. Next prompt unlock token
8. Self-contained recovery prompt if next AI loses context
```


## Prompt-specific control block

| Field | Value |
| --- | --- |
| Prompt ID | `P28` |
| Title | Implementation Wave 1 Codex prompt: MDA core schema, UOM authority, item/revision command spine |
| Mode | `CODE_MUTATION_ALLOWED_AFTER_BRANCH` |
| Required previous token | `P27_PASS_WITH_CONTROLLED_GAPS` |
| Unlock token | `P28_PASS_WITH_CONTROLLED_GAPS` |
| Domain affected | `database + platform_backend + master_data` |
| Root / scope code | `WAVE1` |

## Prompt objective

Implement the core schema and first command spine with controlled migrations, tests, rollback notes, and no collision with existing canonical tables.

## Previous gate check

1. Open `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_SEQUENCE_STATE.json`.
2. Verify that required previous token `P27_PASS_WITH_CONTROLLED_GAPS` is present unless this is `P00`.
3. If the required token is missing, do not execute this prompt. Write a gate failure entry to `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_DECISION_LOG.md`, create a self-contained recovery prompt in `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_REPAIR_PROMPT_QUEUE.md`, and execute the earliest missing prompt instead.

## Required source files or evidence targets

- `P04 schema blueprint`
- `P05 UOM`
- `P06 item`
- `docs/backend/DOMAIN_COMMAND_SPEC.md`
- `mom/database/migrations/073_canonical_master_data_core.sql`
- `mom/database/migrations/064_master_data_governance.sql`
- `mom/database/migrations/072_canonical_foundation_governance.sql`

If any source path is missing, search via `.ai` indexes and controlled grep. If still absent, mark `NOT_EVIDENCED`; do not invent the source.

## Required tasks

1. Create branch `codex/mda-v2-wave1-core-schema-command-spine-20260530` from updated main or approved Wave 0 branch per repo integration policy.
2. Inspect highest migration number across current branch and remote branches before naming a migration.
3. Implement MDA core authority tables only if absent: root registry, aliases, external references, lifecycle/effectivity, release packet, evidence link, relation graph, data quality issue, reconciliation run/diff. Do not duplicate existing canonical item tables.
4. Implement or wire UOM runtime authority service if missing, using existing `uom` and `mdm_uom_conversions` schemas where present.
5. Implement initial command handlers/contracts for `CreateItem`, `CreateItemRevision`, `ReleaseItemRevision` as thin, safe, transactional command services that call existing architecture patterns; if full implementation is too large, implement service skeleton + fail-closed contract tests + backlog, not fake success.
6. Add migrations rollback comments, repository tests, command tests, syntax, PHPStan focused checks, and migration drift checks.
7. Do not edit UI in Wave 1 except contract/projection metadata needed for tests.

## Suggested verification and discovery commands

Run the maximum safe subset. Replace placeholders like `<touched_php_files>` with the exact touched files. Do not claim pass for commands that did not complete.

```bash
git status --short
```
```bash
ls mom/database/migrations | sort | tail -20
```
```bash
git log --all --oneline -- mom/database/migrations/ | head -40
```
```bash
grep -R "CREATE TABLE IF NOT EXISTS item" -n mom/database/migrations
```
```bash
php -l <touched_php_files>
```
```bash
composer --working-dir=mom run test -- --filter "Mda|Item|Uom|Command" || true
```
```bash
composer --working-dir=mom run analyse -- --memory-limit=1G || true
```
```bash
php tools/scripts/ai-index/generate.php --verbose || true
```

## Required outputs for this prompt

```text
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_MAIN.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_SOURCE_TRUTH_AUDIT.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_AUTHORITY_MATRIX.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_OPERATIONAL_SIMULATION_MATRIX.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_ADVERSARIAL_REVIEW.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_GAP_AND_REPAIR_LEDGER.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_VERIFICATION_LOG.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P28_implementation_wave1_core_schema_command_spine_codex_prompt_HANDOFF_PACKET.md
```

## Required operational simulations

At minimum, convert these into rows in `OPERATIONAL_SIMULATION_MATRIX.csv`:

- Migration replay on empty DB.
- Migration replay on DB with existing canonical item tables.
- ReleaseItemRevision missing evidence rejects.
- UOM conversion missing rejects item release if policy requires.
- Idempotent CreateItem retry does not duplicate.

Also add any new scenarios discovered during audit.

## Prompt-specific stop rules

- Any migration number collision is P0.
- Any destructive schema change to legacy tables is P0.
- Any command writes without idempotency/audit plan is P1/P0.

## Required adversarial review lenses

Apply at least these lenses and write findings in `ADVERSARIAL_REVIEW.md`:

- authority architect
- backend/API architect
- database migration reviewer
- plant operations leader
- CNC/shop-floor operator
- quality/eQMS auditor
- supplier quality engineer
- maintenance/calibration owner
- inventory/warehouse owner
- finance/controller
- security/OT reviewer
- SRE/release engineer
- AI governance reviewer
- customer/regulatory auditor

## Repair loop requirement

After initial output, intentionally search for failures. For every P0/P1 issue, repair the design/code/test/report before declaring pass. If repaired, document the before/after in `GAP_AND_REPAIR_LEDGER.csv` and `MAIN.md`. If not repairable due environment/tooling, emit a blocker token and a rerun prompt; do not unlock the next prompt.

## Decision token

At the end, append exactly one token to `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_DECISION_LOG.md` and `MDA_V2_SEQUENCE_STATE.json`:

```text
P28_PASS_WITH_CONTROLLED_GAPS
```

Do not emit this token until all mandatory outputs, audit, adversarial review, simulation, repair, and verification evidence are complete.
