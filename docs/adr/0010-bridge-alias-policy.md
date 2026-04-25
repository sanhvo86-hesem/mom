# ADR 0010: Bridge alias policy

## Status

Accepted (2026-04-25)

## Context

The current portal uses page-key URLs (e.g., `/portal.html?page=ncr&action=list`).
Step 4 frozen route grammar uses `/ops/records/...` style canonical
paths. Mid-migration, both styles coexist. Direct navigation cuts
would break:

- Bookmarks
- Email links to specific records
- Third-party deep links from external systems
- Backwards-compatible legacy callers

A bridge alias mechanism translates legacy URLs into canonical routes.
But bridges can be **dangerous**:

- A bridge that fabricates IDs (e.g., `?page=ncr` → `/records/ncr/NEW-ID`)
  exposes false records
- Stale bridges accumulate as cruft if never deprecated
- Unbounded redirect chains can loop

## Decision

The bridge alias mechanism (in `72-module-template-v4-bridge.js`) uses
4 explicit policy states:

### `canonical`

The path is the final, frozen form. No alias.

Example: `/ops/records/nonconformance-cases/NC-001?tab=overview`

### `keep_as_alias`

Both old and new paths are valid. Either resolves to the canonical
content.

Example: `/api/v1/eqms/ncr` and `/api/v1/nonconformance-cases` both
return the same data. Used for backend EQMS plural aliases (ADR 0008).

### `redirect_then_deprecate`

The old path returns HTTP 301 to the new canonical path. After all
known callers migrate, a future ADR removes the old path.

Example: `/api/orders/sales` → 301 → `/api/v1/sales-orders` (ADR-defined
deprecation timeline).

### `internal_only_bridge`

The bridge only fires inside the application (not exposed publicly).
Used for HMV4 frontend route translation.

Example: HMV4 sees `?page=ncr` query and rewrites to `/ops/records/...`
internally; the user-visible URL switches to canonical.

### Anti-fabrication rule

Bridges **must not invent record IDs**. If the legacy URL lacks
sufficient context to identify a specific record, the bridge returns
`unmapped_needs_decision` (a stable sentinel). The HMV4 hydration then
displays a re-anchor prompt asking the user to navigate to the record
explicitly.

Example:
- `?page=ncr` (no record_id) → `unmapped_needs_decision` (display a
  prompt: "Open a specific Nonconformance record")
- `?page=ncr&id=NC-001` → `/ops/records/nonconformance-cases/NC-001?tab=overview`

### Unknown alias rule

Unknown aliases (not registered) return `unmapped_needs_decision`.
Never fall through to a wildcard route.

## Consequences

### Positive
- Backward-compatible legacy URLs
- Explicit deprecation pipeline
- No accidental fabricated records
- Clear policy state for each alias

### Negative
- Per-alias governance overhead
- Deprecation timelines must be tracked separately
- `unmapped_needs_decision` requires UX surface to handle gracefully

### Neutral
- Bridge alias decisions per root are ADR-worthy when non-trivial
- Slice prompts include bridge alias verification in QA gates

## Alternatives Considered

### Alternative 1: Single alias state (live or dead)
Each alias is either live or removed. Rejected: removes deprecation
nuance; abrupt cuts break bookmarks.

### Alternative 2: Always fabricate IDs from query
`?page=ncr` → `/records/ncr/auto-resolved-001`. Rejected: dangerous;
exposes wrong record; confuses users.

### Alternative 3: Catch-all 301 to canonical root
Any `?page=*` → 301 to `/ops`. Rejected: loses target context;
user must re-navigate.

## References

- `_reports/module-template-v4/V20_BRIDGE_ALIAS_POLICY_CORRECTION_NOTE.md`
- `mom/scripts/portal/72-module-template-v4-bridge.js`
- `STEP7_REPO_GROUNDED_CODEX_MASTER.md` (V7 — bridge policy origin)
- ADR 0003 Route grammar /ops prefix
- ADR 0008 EQMS plural-form canonical paths

## History

- 2026-04-25: Proposed and Accepted
- 2026-04-25: V20 Bridge Alias Policy Correction Note codifies the
  context-backed `ncr` mapping rule
