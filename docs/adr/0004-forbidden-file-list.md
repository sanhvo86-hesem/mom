# ADR 0004: Forbidden file list

## Status

Accepted (2026-04-25)

## Context

The HMV4 prototype must not regress the existing production portal.
The prototype is **additive** — new files added under specific
namespaces. Existing portal files (CSS, JS, HTML) are immutable in
slice work.

Without explicit forbidden-file enforcement, slice authors might:
- Edit `mom/portal.html` directly (breaking PWA cache, service worker)
- Edit core CSS (`portal.main.css`) for "convenient" overrides
- Modify legacy router (`01-module-router.js`) to add HMV4 routes
- Touch auth UI (`02-state-auth-ui.js`) for HMV4 auth integration
- Modify `40-eqms-shell.js` (legacy shell)

Each of these would create production blast radius beyond the slice's
intended scope.

## Decision

The following 7 files are **immutable** in HMV4 slice work:

### Forbidden (never modify in slice work)

1. `mom/portal.html`
2. `mom/styles/portal.main.css`
3. `mom/styles/eqms-suite.css`
4. `mom/styles/density-darkmode.css`
5. `mom/scripts/portal/01-module-router.js`
6. `mom/scripts/portal/02-state-auth-ui.js`
7. `mom/scripts/portal/40-eqms-shell.js`

### Exception for `mom/portal.html`

A single feature-flag insertion is allowed in `mom/portal.html`:

- CSS load: insert HMV4 stylesheet links **after** existing
  `graphics-authority.css` link (around line 32-36)
- JS load: insert HMV4 script tags **before** `99-bootstrap.js` (around
  line 425-440), in order: 71 → 72 → 73 → 70
- Feature flag block: `window.HMV4_PREVIEW_ENABLED = false` etc. (inert
  by default)
- `74-module-template-v4-fixtures.js` is **never** loaded by
  `mom/portal.html` (fixture-only)

These insertion points are guarded by HMV4 begin/end HTML comments.

### Enforcement

Every slice prompt includes a `git diff --name-only | grep -E
'<forbidden patterns>'` guard. Slices that touch forbidden files fail
the safety check and cannot proceed.

CI workflow (when active) runs the same guard.

### Production registry promotion

A separate forbidden rule: **no slice work writes to `mom/qms-data/`**.
Fixture registries live under `tests/fixtures/module-template-v4/`.
Production registry promotion requires explicit ADR.

## Consequences

### Positive
- Production portal cannot regress from slice work
- Blast radius bounded
- Safety check catches violations before merge

### Negative
- Some legitimate refactoring of forbidden files requires a separate,
  non-slice ADR + branch
- Workarounds via feature flags can become complex

### Neutral
- The forbidden list may grow as new sensitive surfaces emerge
- Removing a file from the list requires a future ADR

## Alternatives Considered

### Alternative 1: Branch protection rules
Use GitHub branch protection to block forbidden file edits at PR level.
Rejected: doesn't help during local Codex sessions; safety check at
prompt-time is faster feedback.

### Alternative 2: Smaller forbidden list (only portal.html)
Allow editing CSS/JS as long as portal.html is preserved. Rejected:
core CSS load order is fragile; legacy router state is fragile.

### Alternative 3: Read-only file mode (chmod)
Make forbidden files read-only at OS level. Rejected: too rigid; legitimate
non-slice refactoring would require chmod toggle.

## References

- `STEP6_HTML_MASTER.md` Section 5 (component patterns + safety guardrails)
- `STEP8_PATCH_MASTER.md` Section 3 (files explicitly not to modify)
- `mom/portal.html` lines 33-36 and 429-440 (feature-flag insertion points)
- ADR 0006 Feature flag HMV4_PREVIEW_ENABLED

## History

- 2026-04-25: Proposed and Accepted

## Amendment 2026-06-01 — Module Studio program exception (founder-authorized)

The forbidden-file immutability above scopes specifically to **HMV4 slice
work** (the CI "Forbidden diff guard" only fails when a diff touches an HMV4
slice file `70-74-module-template-v4-*` AND a forbidden file). It is NOT a
blanket immutability for all programs.

The **Module Studio rearchitecture program** (see
`_reports/lego-empire/LOCKED-ARCHITECTURE-FINAL-2026-06-01.md`) is explicitly
authorized by the founder (2026-06-01) to modify the global shell/nav/router
files (`02-state-auth-ui.js`, `40-eqms-shell.js`, `01-module-router.js`,
`portal.main.css`) as needed to deliver the Theme · Module Studio · Governance
surfaces and the unified shell.

Conditions for shell-level changes under this program:
- Changes must NOT be co-mingled with HMV4 slice file edits in the same PR
  (keeps the slice guard meaningful).
- High-risk shell/router rebuilds (P6) ship feature-flag inert + E2E first.
- Each change follows the Module Studio execution gate (audit · adversarial
  review · simulate · deploy · Chrome verify), per MASTER-EXECUTION-PLAN.

This amendment does not relax the HMV4-slice protection; it records that the
Module Studio program is a sanctioned, founder-approved exception.
- 2026-06-01: Amended — Module Studio program exception (founder-authorized shell edits)
