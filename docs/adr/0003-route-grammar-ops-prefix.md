# ADR 0003: Route grammar — `/ops` prefix, `/records/` for AR

## Status

Accepted (2026-04-25)

## Context

The existing portal uses page-key style navigation (`/portal.html#page=quality_case_management&action=list`). This makes:

- Authoritative records (single record detail) and workspaces (list/projection) indistinguishable in URL
- Module codes leak into URL as identifiers
- Tab state cannot be deep-linked
- Browser back/forward inconsistent
- Bookmarks fragile across schema changes

Step 4 frozen route master defines a canonical URL grammar that
separates authority class (record vs workspace), exposes domain/module
in path, and uses query state for tabs.

## Decision

The frozen URL grammar is:

```text
/ops                                                     <- shell home (SH)
/ops/{domain}                                            <- domain landing (DL)
/ops/{domain}/{module}                                   <- module landing (ML)
/ops/records/{resource_family}                           <- authoritative collection (AC)
/ops/records/{resource_family}/{record_id}              <- authoritative record (AR)
/ops/records/{resource_family}/{record_id}/drafts/{draft_id} <- existing-record draft (ERD)
/ops/{domain}/{module}/drafts/{draft_id}                <- new-record draft (NRD)
/ops/{domain}/{module}/{workspace_family}               <- workspace (WS)
/ops/{domain}/{module}/{workspace_family}/{subject_type}/{subject_id} <- subject-focused workspace (SFW)
```

**Tab state**: query parameter `?tab=overview` (one of the frozen tab
codes per record family).

**Display mode**: `?mode=edit` only on draft-safe surfaces (rare;
server-gated).

**Module code paths**: REJECTED. Modules expose `{domain}/{module}`
slug names in path; module codes (e.g., `QLT-02`) are metadata only.

**Compatibility states** for legacy URLs:
- `canonical` — final form, all paths
- `keep_as_alias` — both old and new resolve
- `redirect_then_deprecate` — old returns 301 to new
- `internal_only_bridge` — only allowed inside repo (e.g., bridge
  aliases like `dispatch` → board route)

## Consequences

### Positive
- Clean URL grammar
- Authority class encoded in path (records vs workspaces)
- Tabs deep-linkable
- Browser back/forward consistent
- Bookmarks survive most schema changes

### Negative
- Bridge aliases needed for legacy `?page=` URLs during cutover
- `/ops/records/...` namespace cannot be reused for non-AR purposes

### Neutral
- 9 route classes need separate renderers in `73-module-template-v4-renderers.js`

## Alternatives Considered

### Alternative 1: Module codes in URL
`/ops/QLT-02/cases/...`. Rejected: encodes internal IDs; renaming
modules breaks URLs.

### Alternative 2: No `/records/` separator
Use `/ops/{domain}/{module}/{record_id}`. Rejected: confuses workspace
vs single record; authority class is essential for the rendering shell.

### Alternative 3: Hash-based routing
`/portal.html#/ops/...`. Rejected: SSR-incompatible; SEO/bookmark/back
behavior weaker.

## References

- `STEP4_ROUTE_MASTER.md`
- `STEP6_HTML_MASTER.md` Section 5.2 (route classes)
- `mom/scripts/portal/71-module-template-v4-routes.js`
- ADR 0010 Bridge alias policy

## History

- 2026-04-25: Proposed and Accepted
