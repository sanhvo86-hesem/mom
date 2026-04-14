# Branch Strategy - Tranche 12

Date: 2026-04-14

## Integration branch

- Required branch: `codex/tranche12-zero-trust-closure-20260414`
- Integration worktree: `/Users/a10/Documents/mom-tranche12-integration`
- Baseline: local `main` after fetch, including inherited local closure commits already present in the repository history.
- Root worktree note: the Codex desktop root worktree had pre-existing branch-state churn from earlier branches. To avoid direct work on `main`, Tranche 12 delivery work was moved into the dedicated integration worktree above.

## Helper branches and worktrees

| Agent | Branch | Worktree | Output |
|---|---|---|---|
| Agent 1 repo reality | `codex/tranche12-a1-repo-reality` | `/Users/a10/Documents/mom-tranche12-a1` | `mom/docs/system/agent-reports/tranche12/agent1-repo-reality.md` |
| Agent 2 standards benchmark | `codex/tranche12-a2-standards-benchmark` | `/Users/a10/Documents/mom-tranche12-a2` | `mom/docs/system/agent-reports/tranche12/agent2-standards-benchmark.md` |
| Agent 3 vendor benchmark | `codex/tranche12-a3-vendor-benchmark` | `/Users/a10/Documents/mom-tranche12-a3` | `mom/docs/system/agent-reports/tranche12/agent3-vendor-benchmark.md` |
| Agent 4 architecture authority | `codex/tranche12-a4-architecture-authority` | `/Users/a10/Documents/mom-tranche12-a4` | `mom/docs/system/agent-reports/tranche12/agent4-architecture-authority.md` |
| Agent 5 reliability security compliance | `codex/tranche12-a5-reliability-security-compliance` | `/Users/a10/Documents/mom-tranche12-a5` | `mom/docs/system/agent-reports/tranche12/agent5-reliability-security-compliance.md` |
| Agent 6 defects backlog | `codex/tranche12-a6-defects-backlog` | `/Users/a10/Documents/mom-tranche12-a6` | `mom/docs/system/agent-reports/tranche12/agent6-defects-backlog.md` |

## Merge strategy

- First-pass helper report commits were merged into the integration branch with an octopus merge.
- Code/document fixes are made only on the integration branch.
- Helper branches do not merge to `main`.
- Pass-2 reports will be committed to helper branches or integrated directly as report-only artifacts, then merged into the integration branch.

## Final merge-to-main strategy

- Do not modify `main` directly before the final merge gate.
- When the integration branch is clean and verification is complete, check out `main`.
- Update `main` from `origin/main` if possible without overwriting local protected history.
- Merge `codex/tranche12-zero-trust-closure-20260414` into `main`. Repo AGENTS prefers fast-forward when reconcilable; the tranche prompt prefers `--no-ff`. Final choice must be recorded with the command actually used.
- Run targeted sanity verification on `main`.

## Cleanup strategy

- Remove helper worktrees:
  - `/Users/a10/Documents/mom-tranche12-a1`
  - `/Users/a10/Documents/mom-tranche12-a2`
  - `/Users/a10/Documents/mom-tranche12-a3`
  - `/Users/a10/Documents/mom-tranche12-a4`
  - `/Users/a10/Documents/mom-tranche12-a5`
  - `/Users/a10/Documents/mom-tranche12-a6`
  - `/Users/a10/Documents/mom-tranche12-integration`
- Delete helper branches locally after final integration.
- Delete `codex/tranche12-zero-trust-closure-20260414` locally after successful merge to `main`.
- Leave the final root worktree checked out on `main` with clean status.

## Final clean-state verification

Required final checks:

- `git branch --show-current` is `main`.
- `git status --short --branch` is clean.
- `git branch --list 'codex/tranche12-*'` returns no tranche helper/integration branches.
- `git worktree list` has no `mom-tranche12-*` worktrees.
- Targeted PHP lint and PHPUnit checks pass on `main`.
