# V22 Phase 3 Live API Replication Plan

Date: 2026-04-25

## Objective

Plan replication of the ADR-0011 opt-in live API toggle from NQCASE to CAPA while keeping current portal safety.

## Current Pattern To Reuse

NQCASE live mode remains off by default and can be enabled only through:

```text
?hmv4-live-api=1
data-hmv4-live-api="true"
window.HMV4_LIVE_API_ENABLED=true
```

## CAPA Planning Requirements

Before implementation, define:

```text
CAPA live read endpoint candidate
CAPA response-to-fixture adapter shape
fixture fallback rules
auth failure fallback
4xx/5xx fallback
302 auth redirect fallback
loading state
data-hmv4-source semantics
static no-mutation proof
focused Playwright request-capture test
```

## Forbidden Behavior

- No default live API.
- No CAPA mutation calls.
- No approval, verification, effectiveness, close/cancel, assignment, or e-signature execution.
- No fixture registry promotion to `mom/qms-data`.
- No current portal navigation switch.

## Validation Plan

Required focused checks for an approved implementation:

```bash
node --check mom/scripts/portal/70-module-template-v4-hydration.js
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test module-template-v4-live-api.spec.ts --project=chromium --reporter=list
```

Full Chromium HMV4 E2E should run after focused tests pass.

## Decision

Plan only. Do not implement CAPA live API replication from this report.
