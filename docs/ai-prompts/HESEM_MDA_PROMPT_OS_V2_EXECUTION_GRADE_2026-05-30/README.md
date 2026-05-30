# HESEM MDA Prompt OS V2 — Execution Grade Master Data Authority Foundation

Generated: 2026-05-30
Language: Vietnamese-first for reports; commands and code identifiers in English.
Target repository: `sanhvo86-hesem/mom`
Recommended repo placement: `docs/ai-prompts/HESEM_MDA_PROMPT_OS_V2_EXECUTION_GRADE_2026-05-30/`
Runtime report root inside repo: `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/`

## Purpose

This pack upgrades the earlier MDA Prompt OS into an execution-grade, sequential, no-guess prompt system for building the HESEM Master Data Authority foundation for machines, tools, gages, fixtures, materials, customers, suppliers, employees linked to users, part numbers, revisions, UOM, engineering packages, quality gates, MES readiness, traceability, evidence, audit, e-signature, and operational simulations.

The pack is designed so an AI agent does not infer intent. It must:

- read repository governance first;
- execute one prompt at a time;
- verify previous decision token before continuing;
- produce audit/report/matrix/handoff files;
- simulate operations and adversarial failures at the end of every prompt;
- repair before continuing;
- refuse to hide blockers as success;
- avoid asking the user unless destructive human approval is required by repo governance.

## How to use

1. Put this folder into `docs/ai-prompts/HESEM_MDA_PROMPT_OS_V2_EXECUTION_GRADE_2026-05-30/` in the repo.
2. Give `00_AUTO_RUN_MASTER_PROMPT.md` to the coding/research AI.
3. The AI must read `01_SEQUENCE_MATRIX.csv`, then run prompts in `prompts/` sequentially.
4. The AI must not move from prompt `PXX` to `PXX+1` unless `PXX_PASS_READY_FOR_NEXT` or `PXX_PASS_WITH_CONTROLLED_GAPS` exists in `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_SEQUENCE_STATE.json`.
5. If a prompt fails, the AI must run the repair loop in that same prompt and update `_reports/agent-audits/mda-prompt-os-v2-2026-05-30/MDA_V2_REPAIR_PROMPT_QUEUE.md`.

## Decision discipline

This prompt pack is allowed to produce planning, governance, schema plans, controlled implementation waves, and code prompts. It is not allowed to claim runtime-complete authority until implementation waves, tests, reconciliation, rollback drills, scenario DSL, and external red-team rerun pass.

## Prompt list

See `01_SEQUENCE_MATRIX.csv` and `prompts/`.
