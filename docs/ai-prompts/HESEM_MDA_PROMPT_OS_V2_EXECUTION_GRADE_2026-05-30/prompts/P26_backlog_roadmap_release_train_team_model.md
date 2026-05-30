# P26 — Master implementation backlog, wave roadmap, release train, team ownership, and capacity model


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
| Prompt ID | `P26` |
| Title | Master implementation backlog, wave roadmap, release train, team ownership, and capacity model |
| Mode | `SYNTHESIS_AND_PLANNING_ONLY` |
| Required previous token | `P25_PASS_READY_FOR_NEXT` |
| Unlock token | `P26_PASS_READY_FOR_NEXT` |
| Domain affected | `portfolio_governance + release_train` |
| Root / scope code | `ROADMAP` |

## Prompt objective

Synthesize P00-P25 into a dependency-ordered implementation roadmap that does not outrun integration gates or hide runtime gaps.

## Previous gate check

1. Open `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_SEQUENCE_STATE.json`.
2. Verify that required previous token `P25_PASS_READY_FOR_NEXT` is present unless this is `P00`.
3. If the required token is missing, do not execute this prompt. Write a gate failure entry to `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_DECISION_LOG.md`, create a self-contained recovery prompt in `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_REPAIR_PROMPT_QUEUE.md`, and execute the earliest missing prompt instead.

## Required source files or evidence targets

- `P00-P25 outputs`
- `_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_CONTROLLED_GAP_LEDGER_FINAL.csv if present`
- `AGENTS.md`

If any source path is missing, search via `.ai` indexes and controlled grep. If still absent, mark `NOT_EVIDENCED`; do not invent the source.

## Required tasks

1. Create `MDA_V2_IMPLEMENTATION_BACKLOG.csv` with backlog_id, wave, domain, root, task, files, owner, dependencies, acceptance, tests, rollback, severity, estimate, status.
2. Create `MDA_V2_WAVE_ROADMAP.md` with Wave 0 authority freeze, Wave 1 schema/commands, Wave 2 resource readiness, Wave 3 quality/inventory/traceability, Wave 4 UI/observability, Wave 5 migration cutover, Wave 6 validation/productization.
3. Create `MDA_V2_RISK_REGISTER.md` and `MDA_V2_DEFINITION_OF_DONE.md`.
4. Make V21/integration baseline a precondition for runtime-changing waves if current repo blockers remain.
5. Assign owners by domain and define release train gates: branch, PR, CI, smoke, rollback, evidence, red-team, validation applicability.
6. Simulate roadmap failure: wrong dependency order, migration before UOM, UI before commands, quality hold after shipment, validation after release, parallel AI collision.

## Suggested verification and discovery commands

Run the maximum safe subset. Replace placeholders like `<touched_php_files>` with the exact touched files. Do not claim pass for commands that did not complete.

```bash
ls _reports/agent-audits/mda-prompt-os-v2-2026-05-30 | sort | tail -80
```
```bash
git status --short
```

## Required outputs for this prompt

```text
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_MAIN.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_SOURCE_TRUTH_AUDIT.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_AUTHORITY_MATRIX.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_OPERATIONAL_SIMULATION_MATRIX.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_ADVERSARIAL_REVIEW.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_GAP_AND_REPAIR_LEDGER.csv
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_VERIFICATION_LOG.md
_reports/agent-audits/mda-prompt-os-v2-2026-05-30/P26_backlog_roadmap_release_train_team_model_HANDOFF_PACKET.md
```

## Required operational simulations

At minimum, convert these into rows in `OPERATIONAL_SIMULATION_MATRIX.csv`:

- Implementation starts UI action buttons before command bus.
- Cutover starts before reconciliation passes.
- Two AI branches create same migration number.
- Quality hold service delayed but shipment gate built.

Also add any new scenarios discovered during audit.

## Prompt-specific stop rules

- Any P0/P1 gap hidden as P2 is P0.
- Any roadmap orders dependent work before authority freeze is P1.

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
P26_PASS_READY_FOR_NEXT
```

Do not emit this token until all mandatory outputs, audit, adversarial review, simulation, repair, and verification evidence are complete.
