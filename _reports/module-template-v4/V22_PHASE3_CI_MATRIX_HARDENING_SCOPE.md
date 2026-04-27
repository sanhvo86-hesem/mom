# V22 Phase 3 CI Matrix Hardening Scope

Date: 2026-04-25

## Objective

Plan CI/browser matrix hardening for module-template-v4 so visual drift, browser-specific failures, and artifact review stay explicit.

## In Scope

- Decide Chromium-only versus all-browser required gate.
- Define when Firefox/WebKit run as required, optional, or scheduled.
- Define screenshot artifact retention.
- Define snapshot update approval policy.
- Define failure taxonomy:

```text
visual baseline drift
functional regression
a11y failure
live-api-only failure
backend unavailable warning
environment/setup failure
```

## Out Of Scope

- Changing CI required gates without approval.
- Regenerating snapshots.
- Changing business shell source.
- Masking or auto-accepting visual drift.

## Required Inputs

```text
current local Chromium result
latest Firefox/WebKit evidence
estimated CI runtime
artifact storage policy
branch protection expectations
snapshot ownership policy
```

## Implementation Gate

Do not alter `.github/workflows/*` until the matrix policy, runtime budget, and artifact-retention expectations are approved.
