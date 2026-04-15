# Tranche 18 Branch Strategy

Date: 2026-04-15

## Integration Branch

- Integration branch: `codex/tranche18-zero-trust-signoff-20260415`
- Base: local `main` aligned with `origin/main` at `a7b499ec` before branch creation
- Policy: no tranche18 edits on `main` before final merge phase

## Helper Branches / Worktrees

| Agent | Branch | Worktree | Integration strategy |
| --- | --- | --- | --- |
| Agent 1 Repo Reality | `codex/tranche18-a1-repo-reality` | `/Users/a10/Documents/mom-worktrees/tranche18-a1-repo-reality` | Report-only; coordinator writes reviewed report to integration branch |
| Agent 2 Standards | `codex/tranche18-a2-standards-benchmark` | `/Users/a10/Documents/mom-worktrees/tranche18-a2-standards-benchmark` | Report-only; official sources copied into benchmark dossier |
| Agent 3 Vendor | `codex/tranche18-a3-vendor-benchmark` | `/Users/a10/Documents/mom-worktrees/tranche18-a3-vendor-benchmark` | Report-only; official vendor sources copied into benchmark dossier |
| Agent 4 Architecture | `codex/tranche18-a4-architecture-authority` | `/Users/a10/Documents/mom-worktrees/tranche18-a4-architecture-authority` | Findings implemented directly on integration branch after pass 1 completed |
| Agent 5 Reliability | `codex/tranche18-a5-reliability-security-compliance` | `/Users/a10/Documents/mom-worktrees/tranche18-a5-reliability-security-compliance` | Findings implemented directly on integration branch after pass 1 completed |
| Agent 6 Defects | `codex/tranche18-a6-defects-backlog` | `/Users/a10/Documents/mom-worktrees/tranche18-a6-defects-backlog` | Ledger-only; coordinator integrates closure classifications |

## Merge Strategy

- Pass 1: all six agents complete before coding.
- Implementation: coordinator applies scoped fixes on the integration branch only.
- Temporary helper branch `codex/worldclass-erp-mom-mes-eqms-closure-20260415-1033` is treated as coordinator implementation scratch only; its reviewed changes are merged back into `codex/tranche18-zero-trust-signoff-20260415` before final merge, and it is deleted during cleanup.
- Pass 2: same six-agent lanes re-audit integration branch changes before merge.
- Merge gate: run focused and broad validation on integration branch.
- Final merge: switch to `main`, update from remote when available, then merge `codex/tranche18-zero-trust-signoff-20260415` into `main`.
- Pass 3: run post-merge six-agent sanity on `main`; fix any code-fixable defects on `main` and recommit.

## Deletion Strategy

After pass 3 and final verification:

- Remove helper worktrees under `/Users/a10/Documents/mom-worktrees/tranche18-a*`.
- Delete helper branches `codex/tranche18-a1-*` through `codex/tranche18-a6-*`.
- Delete temporary coordinator scratch branches used during tranche18 closure.
- Delete integration branch `codex/tranche18-zero-trust-signoff-20260415`.
- Leave checkout on `main` with clean status.

## Final Clean-State Verification

- `git branch --show-current` must return `main`.
- `git status --short --branch` must be clean.
- `git worktree list` must not include tranche18 helper worktrees.
- Local tranche18 integration/helper branches must be absent.
- `main` must contain the final tranche18 commits.
