# Tranche 14 Branch Strategy

Date: 2026-04-14

## Integration Branch

- Integration branch: `codex/tranche14-zero-trust-closure-20260414`
- Integration worktree: `/Users/a10/Documents/mom-tranche14-integration`
- Starting policy: no remediation directly on `main`; all code and documentation work happens on the integration branch until the final merge gate.
- Initial pass-1 helper reports were merged into the integration branch as reviewed report-only merges.
- Local `main` moved while tranche 14 was in progress. The integration branch must be reconciled with latest local/remote `main` before final merge.

## Helper Branches And Worktrees

| Agent | Branch | Worktree | Pass-1 output |
|---|---|---|---|
| Agent 1 repo reality | `codex/tranche14-a1-repo-reality` | `/Users/a10/Documents/mom-tranche14-a1` | `mom/docs/system/agent-reports/tranche14/agent1-repo-reality.md` |
| Agent 2 standards benchmark | `codex/tranche14-a2-standards-benchmark` | `/Users/a10/Documents/mom-tranche14-a2` | `mom/docs/system/agent-reports/tranche14/agent2-standards-benchmark.md` |
| Agent 3 vendor benchmark | `codex/tranche14-a3-vendor-benchmark` | `/Users/a10/Documents/mom-tranche14-a3` | `mom/docs/system/agent-reports/tranche14/agent3-vendor-benchmark.md` |
| Agent 4 architecture authority | `codex/tranche14-a4-architecture-authority` | `/Users/a10/Documents/mom-tranche14-a4` | `mom/docs/system/agent-reports/tranche14/agent4-architecture-authority.md` |
| Agent 5 reliability security compliance | `codex/tranche14-a5-reliability-security-compliance` | `/Users/a10/Documents/mom-tranche14-a5` | `mom/docs/system/agent-reports/tranche14/agent5-reliability-security-compliance.md` |
| Agent 6 defects backlog | `codex/tranche14-a6-defects-backlog` | `/Users/a10/Documents/mom-tranche14-a6` | `mom/docs/system/agent-reports/tranche14/agent6-defects-backlog.md` |

Pass-2 helper branches/worktrees will be recreated or refreshed from the final integration-head after implementation so the second audit reviews the actual changed code, not the original pass-1 state.

## Merge And Integration Strategy

- Pass-1 reports: merge helper branches into the integration branch as report-only commits.
- Coordinator synthesis: commit tranche 14 benchmark, backlog, closure, and branch-strategy documents on the integration branch.
- Implementation: keep fixes local to the verified backlog surfaces:
  - generated registry/source metadata truthfulness;
  - stale generated-count tests;
  - dispatch projection dead-letter evidence;
  - mobile work queue rollback/dead-letter behavior;
  - durable audit-pack export bundle/receipt/readback;
  - tracked prompt-source hygiene.
- Pass-2 reports: run six independent agent tracks again after implementation, merge their report files into integration, then fix every code-fixable issue they identify.
- Latest main reconciliation: before the final gate, update local `main` from the remote if available, then reconcile the integration branch with that state without rewriting published history.

## Final Merge-To-Main Strategy

- Repository policy prefers fast-forward merge into local `main` when the remediation branch is reconciled and validated.
- If fast-forward is not safe because `main` moved, reconcile on the integration branch first and rerun targeted verification.
- Do not modify `main` directly before the final merge phase.
- After merge to `main`, run targeted sanity verification on `main`.

## Deletion And Clean-State Strategy

After successful merge and final verification:

- Remove tranche 14 helper worktrees.
- Delete local branches matching `codex/tranche14-*`, including the integration branch after its worktree is removed.
- Remove older stale helper worktrees/branches only when they are not checked out or needed by an active worktree.
- Delete remote tranche helper branches only if this run pushed them.
- Final clean-state verification:
  - current branch is `main`;
  - `git status --short --branch` is clean;
  - no tranche 14 worktrees remain;
  - `git branch --list 'codex/tranche14-*'` is empty;
  - final work is contained in `main`.
