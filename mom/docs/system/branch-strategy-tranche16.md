# Branch Strategy - Tranche 16

Date: 2026-04-15

## Required Strategy

Requested integration branch:

- `codex/tranche16-zero-trust-worldclass-reaudit-20260415`

Requested helper branches/worktrees:

- `codex/tranche16-a1-repo-reality`
- `codex/tranche16-a2-standards-benchmark`
- `codex/tranche16-a3-vendor-benchmark`
- `codex/tranche16-a4-architecture-authority`
- `codex/tranche16-a5-reliability-security-vps`
- `codex/tranche16-a6-defects-backlog`

## Actual Execution Notes

The repo began with existing dirty handoff state and pre-existing closure/helper branches. A safety checkpoint was created before remediation. Codex desktop then repeatedly restored the root worktree to an active thread branch while the tranche16 branch existed. To avoid losing code or rewriting history, remediation was preserved by integrating the active thread branch state into a final tranche16 integration branch created from the surviving final state:

- `codex/tranche16-zero-trust-worldclass-reaudit-20260415-final`

No force-push or history rewrite was used.

## Merge / Cherry-Pick Strategy

- Helper branches were used as isolated audit bases.
- Existing active closure branch commits were inspected and preserved.
- Conflicts in `FileManufacturingEventRepository.php` and `MobileWorkQueueService.php` were resolved by keeping the stricter idempotency/hash helpers and the service-consistent queue timezone behavior.
- Final work must merge to `main` only after pass-2 and verification.

## Final Merge-To-Main Strategy

Preferred final action:

1. Ensure integration branch is clean and committed.
2. Checkout `main`.
3. Merge the final integration branch with `git merge --no-ff`.
4. Run final targeted sanity checks on `main`.
5. Push `main` if remote is reachable.

## Cleanup Strategy

After successful final merge:

- Remove tranche16 helper worktrees.
- Delete tranche16 helper branches.
- Delete tranche16 integration branches.
- Delete obsolete closure helper branches created during this run if clean and merged.
- Leave root worktree on `main` with clean status.

## Final Clean-State Verification

Required final commands:

- `git branch --show-current`
- `git status --short --branch`
- `git worktree list --porcelain`
- `git branch --list 'codex/tranche16*' 'codex/worldclass-closure-20260414-2359*'`

