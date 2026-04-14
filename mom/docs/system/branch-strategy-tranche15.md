# Tranche 15 Branch Strategy

Date: 2026-04-14

## Branches

- Default branch verified: `main`
- Integration branch created from `origin/main`: `codex/tranche15-zero-trust-reaudit-closure-20260414`
- Helper branches/worktrees for pass 1: simulated with six Codex agent tracks, no new local helper worktrees were created.

## Pass Strategy

1. Pass 1: six independent agents audited repo reality, standards, vendor benchmark, architecture, reliability/security, and inherited backlog.
2. Coordinator synthesis: contradictions were resolved against code, tests, generated artifacts, and official sources.
3. Implementation: all code-fixable pass-1 items were fixed on the integration branch.
4. Pass 2: the same six agent tracks must red-team the resulting code/docs/artifacts.
5. Main sync: `origin/main` was merged into the integration branch before final gate because the branch was behind by 18 commits.
6. Post-main-sync remediation: `controlled_import_receipts` exposed a schema/registry domain gap; it was fixed and the canonical publication pipeline was rerun to PASS.
7. Merge gate: run targeted and broader verification before merge.

## Merge Strategy

Repository `AGENTS.md` prefers fast-forward merge to `main`. Final plan:

1. Commit integration branch.
2. Verify integration branch is clean.
3. Switch to `main`.
4. Fast-forward merge `codex/tranche15-zero-trust-reaudit-closure-20260414` into `main` if safe.
5. Run targeted sanity verification on `main`.
6. Push `main` if remote access is available.
7. Delete the integration branch locally.

## Cleanup Strategy

- Delete only tranche15-created branches/worktrees.
- No tranche15 helper worktrees were created.
- Preserve pre-existing `/Users/a10/Documents/mom-worktrees/worldclass-closure-20260414-2020` because it contains unique commits not reachable from `main`.
- Final required state: checked out on `main`, integration branch deleted, `git status` clean.
