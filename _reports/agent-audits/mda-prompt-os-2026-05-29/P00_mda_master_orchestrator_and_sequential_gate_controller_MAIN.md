# P00 Main

## Scope

This prompt creates the execution constitution for the MDA run and does not claim implementation progress. The current gate remains planning and audit only.

## Inputs verified

- Prompt pack `README`, `P00`, `P01`, and no-guess gates.
- Repo governance files `AGENTS.md`, `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`.
- Current branch and worktree status.

## Planned artifact chain

1. Shared artifacts: manifest, constitution, source map, traceability, gap ledger, conflict ledger, decision log.
2. P00 artifacts: orchestration evidence, adversarial audit, simulations, handoff.
3. P01 artifacts: current-state authority audit package.

## Execution mode

- `AUDIT_ONLY_MODE`: active
- `PLANNING_MODE`: active
- `IMPLEMENTATION_MODE_WHEN_GATE_OPEN`: inactive

Implementation stays closed because the prompt chain requires the current-state reality map before architecture and coding.

## Stop rules

- If repo truth cannot prove authority, record `CONTROLLED_GAP`.
- If a prompt finds hidden authority or direct governed mutation, that prompt cannot pass.
- P02 and later prompts remain locked until P01 clears.

## Decision token

`P00_PASS_READY_FOR_NEXT`

