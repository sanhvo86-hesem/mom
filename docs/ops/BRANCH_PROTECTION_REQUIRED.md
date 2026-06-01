# Branch Protection Required Checks

This repository uses Smart CI with many conditional jobs. Branch protection for `main` must require the aggregate gate, not each conditional job.

## Required Check

- `CI Summary` is the required pull request check for merges into `main`.
- Do not require individual conditional Smart CI jobs such as `PHPUnit Tests`, `Playwright E2E`, `HMV4 Visual Regression Evidence`, or `Portal Runtime Smoke`; those jobs may be skipped by design when the classifier proves they are not relevant.
- Pull requests must not merge until `CI Summary` is success.
- Auto-merge is recommended so GitHub waits for `CI Summary` before integration.

## Deploy Verification

- The deploy workflow or VPS smoke evidence may be tracked as an additional release gate, but it must not replace `CI Summary`.
- For changes that affect served docs, UI, CI, deployment, or runtime behavior, verify the deployed VPS state and live browser behavior after merge.

## Admin Override

- Admin override is emergency-only.
- Every override must record the reason, owner, affected PR or commit, and follow-up remediation.
- If a PR is merged before `CI Summary` succeeds and CI later fails, treat it as a governance incident.

## Migration Rule

- Migration uniqueness checks compare new migration numbers against the immutable PR base SHA.
- A migration collision against the PR base blocks merge. Rebase or renumber the migration before retrying.
- Non-PR fallback to `origin/main` is allowed only when the event does not provide an immutable base and local history cannot provide `HEAD~1`; the workflow must print a warning when that fallback is used.
