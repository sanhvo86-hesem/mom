# ADR 0006: Feature flag `HMV4_PREVIEW_ENABLED` (inert by default)

## Status

Accepted (2026-04-25)

## Context

The current production portal must remain the default user experience.
HMV4 is a parallel preview surface that loads only under explicit
opt-in. Without a feature flag mechanism:

- Every load of `mom/portal.html` would render HMV4 surfaces (production blast)
- A/B testing impossible
- Rollback would require re-deploying portal.html

A runtime feature flag in `mom/portal.html` solves this, but the
defaults must be **inert** (no HMV4 rendered by default) so accidental
deploy doesn't expose the prototype.

## Decision

Four feature flags in `mom/portal.html` (lines 429-440), all default
inert:

```js
window.HMV4_PREVIEW_ENABLED = window.HMV4_PREVIEW_ENABLED || false;
window.HMV4_ROUTE_BRIDGE_ENABLED = window.HMV4_ROUTE_BRIDGE_ENABLED !== false;
window.HMV4_FIXTURE_MODE = false;
window.HMV4_DISABLE_MUTATION_LAUNCHERS = window.HMV4_DISABLE_MUTATION_LAUNCHERS !== false;
```

### `HMV4_PREVIEW_ENABLED` (default: false)
Master switch. When false, HMV4 hydration returns early; no shell
renders. Override only via:
- `data-hmv4-preview="true"` attribute on `<body>`
- Query param `?hmv4-preview=1` (handled by hydration)
- Manual console set (development only)

### `HMV4_ROUTE_BRIDGE_ENABLED` (default: true)
Lets HMV4 bridge resolve aliases (e.g., `?page=ncr` → `/ops/records/...`).
When `HMV4_PREVIEW_ENABLED=false`, the bridge is dormant but the global
exists.

### `HMV4_FIXTURE_MODE` (default: false)
Forces fixture-only rendering. When false, HMV4 attempts live data
fetch (in future); currently always false because no live cutover.
The `74-module-template-v4-fixtures.js` script is **never** loaded by
`mom/portal.html`. Fixture pages under `tests/fixtures/module-template-v4/pages/`
load the script directly for E2E.

### `HMV4_DISABLE_MUTATION_LAUNCHERS` (default: true)
Disables all mutation-looking controls. Renderers must respect this
flag. When true, disposition/CAPA/e-sign buttons render as disabled
with `data-hmv4-mutation-intent`.

## Consequences

### Positive
- Production portal default-inert
- Feature flag toggleable for preview without redeploy
- Per-slice flag combinations possible (e.g., enable preview but
  disable mutation launchers)

### Negative
- Hydration must check 4 flags on every load (negligible perf cost)
- Flag combinations could create unexpected states; QA must cover
  default + each enabled-flag scenario
- Manual console override possible — not a security boundary

### Neutral
- Future production cutover ADR will define flag-flip strategy
- Backend gates remain the security boundary, not these flags

## Alternatives Considered

### Alternative 1: Build-time flag
Use environment variable or build constant. Rejected: requires redeploy
for every flag toggle; slows preview iteration.

### Alternative 2: Per-route flag in URL
`/portal.html?hmv4=1` only. Rejected: URL is not first-class state;
deep-link to record then strip query strips the flag too.

### Alternative 3: Cookie-based flag
Set cookie to enable HMV4. Rejected: cookies leak across tabs; clearing
cookies disables; not transparent to test runs.

## References

- `mom/portal.html` lines 429-440 (HMV4 preview integration block)
- `mom/scripts/portal/70-module-template-v4-hydration.js` (early-return
  guard when flag is false)
- ADR 0004 Forbidden file list (portal.html exception)
- ADR 0007 Fixture-first development

## History

- 2026-04-25: Proposed and Accepted
