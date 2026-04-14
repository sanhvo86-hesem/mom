# Tranche 13 Branch Strategy

Date: 2026-04-14

## Integration branch

- Branch: `codex/tranche13-zero-trust-closure-20260414`
- Base: local `main` at `a42f0d16`, matching `origin/main` after `git fetch --prune origin`
- Root worktree `/Users/a10/Documents/mom` remained checked out on `main` during audit and implementation.
- Integration worktree: `/Users/a10/Documents/mom-tranche13-integration`

## Helper branches and worktrees

| Agent | Branch | Worktree | Output |
|---|---|---|---|
| Agent 1 repo reality | `codex/tranche13-a1-repo-reality` | `/Users/a10/Documents/mom-tranche13-a1` | `mom/docs/system/agent-reports/tranche13/agent1-repo-reality.md` |
| Agent 2 standards benchmark | `codex/tranche13-a2-standards-benchmark` | `/Users/a10/Documents/mom-tranche13-a2` | `mom/docs/system/agent-reports/tranche13/agent2-standards-benchmark.md` |
| Agent 3 vendor benchmark | `codex/tranche13-a3-vendor-benchmark` | `/Users/a10/Documents/mom-tranche13-a3` | `mom/docs/system/agent-reports/tranche13/agent3-vendor-benchmark.md` |
| Agent 4 architecture authority | `codex/tranche13-a4-architecture-authority` | `/Users/a10/Documents/mom-tranche13-a4` | `mom/docs/system/agent-reports/tranche13/agent4-architecture-authority.md` |
| Agent 5 reliability security compliance | `codex/tranche13-a5-reliability-security-compliance` | `/Users/a10/Documents/mom-tranche13-a5` | `mom/docs/system/agent-reports/tranche13/agent5-reliability-security-compliance.md` |
| Agent 6 defects backlog | `codex/tranche13-a6-defects-backlog` | `/Users/a10/Documents/mom-tranche13-a6` | `mom/docs/system/agent-reports/tranche13/agent6-defects-backlog.md` |

## Integration strategy

- Pass-1 helper branches were merged into the integration branch with an octopus merge.
- Coordinator changes and implementation changes are committed only on the integration branch.
- Pass-2 helper branches will be reset or fast-forwarded to the integrated implementation commit before the second audit, then merged back into the integration branch as report-only commits.

## Final merge strategy

- Before merging to `main`, run the maximum safe verification subset on the integration branch.
- Fetch `origin` and verify whether local `main` is an ancestor of the integration branch.
- Repo AGENTS prefer fast-forward merge into local `main` when reconciled safely, even though the tranche prompt allows `--no-ff`.
- If `main` has moved, merge or rebase only through the integration branch first; do not modify `main` directly before the final merge phase.

## Cleanup strategy

- After successful merge to `main`, remove the six helper worktrees and the integration worktree.
- Delete local branches matching `codex/tranche13-*`.
- Delete remote tranche branches only if they exist and were pushed by this run.
- Final clean-state verification:
  - current branch is `main`
  - `git status --short --branch` is clean
  - `git worktree list` contains no tranche13 worktrees
  - `git branch --list 'codex/tranche13-*'` is empty

