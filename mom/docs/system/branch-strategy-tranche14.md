# Tranche 14 Branch Strategy

Date: 2026-04-14

## Integration Branch

- Integration branch: `codex/tranche14-zero-trust-closure-20260414`
- Integration worktree: `/Users/a10/Documents/mom-tranche14-integration`
- Base policy: no direct remediation on `main` before the final merge phase.
- Latest-main reconciliation: latest `origin/main` was merged into the integration branch before pass 2, then pass-2 fixes were applied on the integration branch.

## Helper Branches And Worktrees

| Agent | Branch | Worktree | Pass-1 output | Pass-2 output |
|---|---|---|---|---|
| Agent 1 | `codex/tranche14-a1-repo-reality` | `/Users/a10/Documents/mom-tranche14-a1` | `agent1-repo-reality.md` | `pass2-agent1-repo-reality.md` |
| Agent 2 | `codex/tranche14-a2-standards-benchmark` | `/Users/a10/Documents/mom-tranche14-a2` | `agent2-standards-benchmark.md` | `pass2-agent2-standards-benchmark.md` |
| Agent 3 | `codex/tranche14-a3-vendor-benchmark` | `/Users/a10/Documents/mom-tranche14-a3` | `agent3-vendor-benchmark.md` | `pass2-agent3-vendor-benchmark.md` |
| Agent 4 | `codex/tranche14-a4-architecture-authority` | `/Users/a10/Documents/mom-tranche14-a4` | `agent4-architecture-authority.md` | `pass2-agent4-architecture-authority.md` |
| Agent 5 | `codex/tranche14-a5-reliability-security-compliance` | `/Users/a10/Documents/mom-tranche14-a5` | `agent5-reliability-security-compliance.md` | `pass2-agent5-reliability-security-compliance.md` |
| Agent 6 | `codex/tranche14-a6-defects-backlog` | `/Users/a10/Documents/mom-tranche14-a6` | `agent6-defects-backlog.md` | `pass2-agent6-defects-backlog.md` |

Pass 2 reused the six existing agent threads because the Codex app had reached the six-agent thread limit. Reports were written directly to the integration worktree and committed as report-only commits.

## Merge And Integration Strategy

- Pass-1 reports: helper report commits were integrated into the integration branch.
- Coordinator synthesis: tranche 14 benchmark, backlog, closure, and branch-strategy docs are maintained on the integration branch.
- Implementation commits: keep code edits limited to verified backlog and pass-2 defect surfaces.
- Generated artifacts: regenerate through the publication harness; do not hand-edit large generated JSON except by controlled generator/source changes.
- Final integration gate: commit all integration changes, require clean status, run targeted and aggregate verification, then merge to `main`.

## Final Merge-To-Main Strategy

- Repository AGENTS.md prefers fast-forward merge when possible; user prompt prefers `--no-ff` unless policy requires fast-forward. The repo policy takes precedence if a clean fast-forward is available.
- If `main` moved, reconcile on the integration branch first and rerun verification before merging.
- Do not modify `main` until the final merge phase.
- After merge to `main`, rerun final targeted sanity verification on `main`.

## Deletion And Clean-State Strategy

After successful merge and final verification:

- Remove tranche14 helper worktrees.
- Delete local branches matching `codex/tranche14-a*`.
- Delete the integration branch after its worktree is removed and `main` contains the final work.
- Delete remote tranche helper/integration branches only if this run pushed them.

## Final Clean-State Verification

Required final checks:

- Current branch is `main`.
- `git status --short --branch` is clean.
- `git worktree list` has no tranche14 helper/integration worktrees.
- `git branch --list 'codex/tranche14-*'` is empty.
- `main` contains the final tranche14 commits.

## Current Final-Phase Risk

The original root worktree at `/Users/a10/Documents/mom` has unrelated dirty changes on a non-main branch. Those changes must not be reverted or overwritten. If they still prevent checking out or updating local `main`, final merge/cleanup must stop with evidence rather than clobbering user work.
