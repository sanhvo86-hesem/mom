# Part F — Frontend Pattern Catalog Overview
## HESEM Manufacturing Operations Management Portal
### HMV4 Module-Template-V4 Program

**Document status:** Development/prototype reference — not for production use (ADR-0001)
**Scope:** All 18 Wave 1 root slices; 14 domains; 9 route classes
**Vocabulary constraint:** Per ADR-0002, use only the 14 canonical domain slugs, 18 root codes, and 9 route-class labels defined herein. Do not introduce synonyms.

---

## 1. Purpose and Scope

Part F defines the eight canonical frontend patterns used across every HMV4 surface. A pattern is a structural contract: it specifies which UI elements are mandatory, which are forbidden, how data arrives, who may open the surface, and how it behaves under every portal variant and pack overlay.

Every new slice implementation must choose exactly one pattern as its primary frame. Nested surfaces (drawers, wizards launched from within a primary pattern) count as secondary patterns and are governed by the cross-pattern composition rules in §10.

The pattern definitions in this document are the single source of truth for:

- Playwright spec structure (each spec file mirrors the element inventory of its pattern)
- Fixture schema (fixture files carry a `_pattern` key that must match one of the eight codes below)
- Code review acceptance (a PR that introduces an element listed as forbidden for a pattern will be rejected)
- Graphics Authority compliance (ADR-0009): every visual parameter must be resolved via `window.GraphicsAuthority.tokens.read('<token_key>')` — no hex literals, no bare `px` strings, no hardcoded font names in JS

---

## 2. The Eight Canonical Patterns

| Code | Name | Primary use case | Route class |
|------|------|-----------------|-------------|
| SH | Single-Header | Simple read-only informational page | `INFO` |
| DL | Dashboard/List | KPI strip + filterable record list | `DASH`, `LIST` |
| ML | Multi-Level List | Hierarchical drill-down across parent/child | `LIST` (nested) |
| WS | Workspace Projection | CQRS read-model; rows × columns; role-partitioned | `WS` |
| AR | Authoritative Record Shell | Tabbed record detail; mutations via drawers/wizards | `AR` |
| AC | Admin Configuration | Settings, token management, feature flags | `ADMIN` |
| Drawer | Side Drawer | Quick-edit or quick-view without navigation | `DRAW` |
| Wizard | Step-through Form | Complex multi-step creation or approval | `WIZ` |

---

## 3. Pattern Specifications

### 3.1 SH — Single-Header

#### 3.1.1 When to use

Choose SH when the surface presents a single coherent entity or policy summary where:

- There are no row-level mutations needed
- No tabbed sub-sections are required (fewer than three logical groupings)
- The canonical URL resolves to exactly one record or one aggregate page (e.g., a process definition, a compliance statement, a system status page)
- The user cannot navigate deeper within the surface — they navigate away to AR surfaces for detail

Do not choose SH when the user needs to compare multiple records side by side (use DL), drill into child records (use ML), or perform any mutation (promote to AR or use a Drawer launched from SH).

#### 3.1.2 Required UI elements (mandatory)

1. Page-level `<h1>` with the record/page title (text resolved from locale file; no hardcoded strings)
2. Breadcrumb trail from domain home → page title (minimum two segments; uses `<nav aria-label="breadcrumb">`)
3. Record identity block: code badge + status chip + last-modified timestamp
4. At least one structured metadata section rendered as a definition list (`<dl>`)
5. Top-right action toolbar (even if the only action is "Print" or "Export PDF")
6. Pre-production environment banner (see ADR-0001; orange; fixed at top of content, not covering the shell top bar)
7. Empty-state treatment: if the entity has no data yet, show a purposeful empty state (not a blank page)
8. Loading skeleton: shown while the single GET completes; matches the layout of the fully loaded state
9. Error state: shown if GET fails; includes a Retry button and a support link
10. Audit trail footer: shows who last viewed this page (principal + timestamp) — sourced from audit_event; rendered only for principals with `audit.view` permission

#### 3.1.3 Forbidden elements

- Tab bars or tab panels
- Inline editable fields (all edits go through a Drawer or navigate to an AR surface)
- Data tables with sortable columns
- KPI metric tiles
- Bulk-action toolbars
- Pagination controls
- Filter panels

#### 3.1.4 Data binding convention

SH surfaces bind to the `GET /api/v1/{domain}/{root}/{id}` endpoint family (single-resource read). Response is a single JSON object. The fixture file at `tests/fixtures/module-template-v4/record-fixtures.json` provides the mock payload when `HMV4_FIXTURE_MODE=true`.

SH surfaces must not call write endpoints or subscribe to server-sent events. If near-realtime staleness indication is needed, a polling interval of no less than 60 seconds is permitted, surfaced as a "last refreshed X seconds ago" chip — not a live streaming indicator.

#### 3.1.5 Permission model

| Principal role | Access |
|----------------|--------|
| Viewer | Full read |
| Operator | Full read |
| Supervisor | Full read |
| QA Analyst | Full read |
| Admin | Full read + can launch Drawer overlays |
| Auditor (external) | Full read within auditor-portal scope |
| Inspector (FDA) | Full read within inspector-portal scope |
| Customer (CVLP) | Restricted: only non-confidential fields visible |

The SH surface itself performs no permission-based field hiding beyond what the API response already omits. If a principal lacks permission to view a field, the API does not return it; the SH renderer handles absent fields gracefully (renders nothing rather than an error).

#### 3.1.6 Mobile/responsive behavior

- Single-column layout on viewports narrower than 768 px
- Breadcrumb collapses to an ellipsis (…) with the immediate parent visible on mobile
- Action toolbar collapses to a single "More actions" kebab menu on mobile
- Definition list renders as stacked (term above value) instead of side-by-side below 480 px

#### 3.1.7 Pre-production posture (ADR-0001)

All SH surfaces are feature-flagged inert by default (`HMV4_PREVIEW_ENABLED=false`). The pre-production environment banner is non-dismissible in development/prototype mode. No SH surface is reachable from `mom/portal.html` navigation without an explicit feature flag flip.

---

### 3.2 DL — Dashboard/List

#### 3.2.1 When to use

Choose DL when the surface serves as the entry point for a domain or sub-domain and combines:

- A KPI strip (3–8 summary metrics)
- A filterable, sortable, paginated list of records

DL is the correct pattern for domain landing pages (e.g., Quality Improvement home, Maintenance home), for search-result pages scoped to a root, and for any surface where the user's primary task is to find and navigate to a record rather than to inspect or mutate it.

Do not choose DL when records are organized in a strict parent-child hierarchy with more than two levels (use ML). Do not choose DL when columns represent different roles or workstations rather than attributes (use WS).

#### 3.2.2 Required UI elements (mandatory)

1. Domain/root heading (`<h1>` scoped to the root or domain)
2. KPI strip: 3–8 metric tiles; each tile has label, value, unit, trend indicator (up/down/flat arrow), and a click target that applies a pre-set filter to the list below
3. Filter panel: collapsible; contains at minimum date-range picker, status multi-select, and assignee search; all filter state reflected in the URL query string
4. Search bar: free-text search with debounce (250 ms); scoped to the current root's indexed fields
5. Column header row: sticky; sortable columns indicated by sort icon; active sort highlighted
6. Record row: minimum fields — record code, title/description, status chip, assignee avatar, last-modified date
7. Pagination controls: page size selector (10/25/50/100), previous/next buttons, total record count
8. Bulk-action toolbar: appears when ≥1 rows are selected; actions are permission-gated
9. Empty-state treatment: distinct messages for "no records exist" vs "no records match your filters"
10. Loading skeleton: full list area replaced by skeleton rows during initial load and filter changes
11. Pre-production environment banner (ADR-0001)
12. Export action: CSV and XLSX export of current filtered list (not all records) — export is async; shows a toast with a download link when ready

#### 3.2.3 Forbidden elements

- Inline editing within list rows (open a Drawer instead)
- Nested expandable rows with sub-rows deeper than one level (use ML)
- Full-page modals that block the list (use Drawer pattern instead)
- Hardcoded KPI definitions (all KPI definitions must come from API or fixture)

#### 3.2.4 Data binding convention

- KPI strip: `GET /api/v1/{domain}/{root}/kpi` — returns array of `{key, label, value, unit, trend, filter_preset}`
- List: `GET /api/v1/{domain}/{root}?page=N&page_size=N&sort=field&dir=asc|desc&{filter_params}`
- Fixture: `tests/fixtures/module-template-v4/record-fixtures.json` under `kpi` and `list` keys for each root

DL surfaces subscribe to no real-time streams. KPI strip refreshes on a 30-second polling interval when the tab is in the foreground. The list refreshes only on explicit user action (filter change, sort change, page change, or manual refresh button).

#### 3.2.5 Permission model

| Role | KPI strip | List view | Bulk actions | Export |
|------|-----------|-----------|--------------|--------|
| Viewer | Yes | Yes | None | No |
| Operator | Yes | Yes | Own records | No |
| Supervisor | Yes | Yes | Team records | Yes |
| QA Analyst | Yes | Yes | Quality records | Yes |
| Admin | Yes | Yes | All records | Yes |
| Auditor | Yes (read) | Scoped | None | No |
| Inspector | Yes (read) | Scoped | None | No |
| Customer | No | No | N/A | N/A |

KPI tiles whose `required_permission` field is not satisfied by the current principal are hidden entirely (not shown as "N/A"). This prevents information leakage about metrics the principal cannot act on.

#### 3.2.6 Mobile/responsive behavior

- KPI strip: horizontal scroll on mobile (no wrapping); tiles are minimum 140 px wide
- Filter panel: hidden by default on mobile; revealed by a "Filters" button in the toolbar
- List: on mobile, collapses to a card-per-record layout (no column headers); only three primary fields visible per card with a "View" link
- Bulk-action toolbar: hidden on mobile (bulk actions require a desktop viewport)
- Pagination: simplified to previous/next only on mobile (no page-size selector)

#### 3.2.7 Pre-production posture (ADR-0001)

Same as SH. All DL surfaces are inert behind `HMV4_PREVIEW_ENABLED`. Fixture data only when `HMV4_FIXTURE_MODE=true`.

---

### 3.3 ML — Multi-Level List

#### 3.3.1 When to use

Choose ML when records are organized in a strict parent-child hierarchy and the user needs to traverse that hierarchy within a single surface without losing context of where they are in the tree. Examples: BOM structure (assembly → sub-assembly → component → part), lot genealogy (lot → sublot → unit), document hierarchy (manual → section → procedure → work instruction).

ML is appropriate when there are exactly two or three levels of hierarchy visible simultaneously. If there are more than three levels, consider whether the surface should be an AR with a tree widget, or whether the deep levels belong to a separate AR surface.

Do not use ML when hierarchy is flat (use DL). Do not use ML as a substitute for an AR when the leaf-level records require tab navigation and complex toolbars.

#### 3.3.2 Required UI elements (mandatory)

1. Tree panel (left or top): shows the hierarchy; nodes are expandable/collapsible; active node highlighted
2. Level indicator: breadcrumb or numbered level label so the user always knows their depth
3. Content panel (right or below): shows the list of records at the currently selected hierarchy level
4. Level heading: `<h2>` that updates as the selected node changes
5. Per-level column sets: columns shown in the content panel are defined per hierarchy level (level 1 may show different columns than level 2)
6. Filter: scoped to the currently selected level's records; filter state does not persist when navigating to a different node
7. Row actions: at minimum, "Open record" (navigates to AR surface) and "Expand children" if the row has children
8. Loading state per panel: tree panel and content panel each have independent loading skeletons
9. Empty-state per level: if a parent node has no children, show a clear "No {child_type} records" message
10. Keyboard navigation: arrow keys traverse the tree; Enter expands/collapses a node or selects a leaf
11. Pre-production environment banner (ADR-0001)
12. Collapse-all / expand-all control for the tree panel

#### 3.3.3 Forbidden elements

- Inline editing of any field at any level (open Drawer or navigate to AR)
- KPI strips (ML is navigation, not analytics)
- Bulk-action toolbars at tree level (bulk actions are permitted at the leaf content panel level)
- Drag-and-drop reordering (structural hierarchy changes must go through an AR mutation flow)

#### 3.3.4 Data binding convention

- Tree structure: `GET /api/v1/{domain}/{root}/tree?root_id={id}&depth=3` — returns a nested JSON tree up to three levels
- Level content: `GET /api/v1/{domain}/{root}/{parent_id}/children?level=N&page=N&{filter_params}`
- Both calls are cached client-side per node for the duration of the user's session on this surface; navigating back to a previously expanded node does not re-fetch unless the user explicitly refreshes

#### 3.3.5 Permission model

Same as DL at each level. If a principal lacks permission to view a subtree, those nodes are omitted from the tree response entirely.

#### 3.3.6 Mobile/responsive behavior

On mobile, ML collapses to a stacked single-column flow: tree panel becomes a breadcrumb + "Back" button; content panel occupies the full width. The user navigates down by selecting a row and up by pressing "Back". The simultaneous two-panel view is not available below 768 px.

#### 3.3.7 Pre-production posture

Same as SH and DL.

---

### 3.4 WS — Workspace Projection

#### 3.4.1 When to use

Choose WS when the surface is a CQRS read-model projection where:

- Rows represent work items (jobs, orders, tasks, lots) flowing through process stages
- Columns represent stages, workstations, roles, or time periods
- The user's job is to monitor flow, identify bottlenecks, and dispatch work — not to create or edit records
- The data is a projection (denormalized, eventually consistent) rather than the authoritative record

WS is the pattern for dispatch boards, production schedules, quality inspection queues, and maintenance work queues. It is explicitly not a spreadsheet editor — mutations are launched via Drawer or Wizard overlays triggered from within the WS surface.

Do not use WS when the user primarily needs to drill into a single record's detail (use AR). Do not use WS when the hierarchy of records is the primary navigation concern (use ML).

#### 3.4.2 Required UI elements (mandatory)

1. Surface title and sub-title identifying the projection scope (plant, shift, department)
2. Scope selector: at minimum, a date/shift selector and a workstation/department selector; scope changes trigger a full projection reload
3. Column headers: each representing a stage, role, or time bucket; fixed/sticky on horizontal scroll
4. Row cells: each cell shows a work item card with — record code, priority indicator, status chip, assigned-to avatar, quantity/duration metric
5. Work item card: clickable; opens a Drawer (never a full navigation) to show record detail or launch a mutation
6. Swimlane grouping: rows can be grouped by a configurable grouping dimension (e.g., product family, priority tier); grouping toggle in the surface toolbar
7. Filter bar: filter rows by status, priority, assignee, date range; filter state in URL
8. Aggregate row: at the bottom of each swimlane or the full surface, shows count, total quantity, and average cycle time
9. Staleness indicator: timestamp showing when the projection was last refreshed; refresh button; auto-refresh every 60 seconds when in foreground
10. Capacity indicator per column: bar or percentage showing load vs. capacity; turns red when over 100 %
11. Pre-production environment banner (ADR-0001)
12. Role-partition toggle: if the surface supports multiple role views, a tab or radio group allows the principal to switch between the role-partitioned projections they are authorized to see

#### 3.4.3 Forbidden elements

- Inline editing of cells in the grid (all mutations via Drawer or Wizard)
- Direct write calls from the WS surface — WS is read-only; mutations are delegated
- Pivot-table-style row/column transposition triggered by the user at runtime
- Real-time streaming updates that replace rows without user-visible indication (all projection updates must show a "projection updated" toast before refreshing the grid)

#### 3.4.4 Data binding convention

- Projection data: `GET /api/v1/{domain}/{root}/projection?scope={scope_params}&{filter_params}` — returns denormalized projection rows
- Aggregate row: derived client-side from the projection payload; not a separate API call
- Capacity data: `GET /api/v1/{domain}/capacity?scope={scope_params}` — separate call, cached for 5 minutes
- All WS fixture data is in `tests/fixtures/module-template-v4/record-fixtures.json` under the `projection` key for each WS root

The WS surface MUST NOT call write endpoints. The only write surface reachable from WS is a Drawer or Wizard overlay.

#### 3.4.5 Permission model

| Role | View projection | Use scope selector | Launch Drawer mutations | See capacity indicators |
|------|-----------------|--------------------|------------------------|------------------------|
| Viewer | Scoped | No | No | No |
| Operator | Own workstation | Own only | Own records | Own station |
| Supervisor | Full shift | Yes | Any record in shift | Yes |
| Dispatcher | Full plant | Yes | Any record | Yes |
| Admin | Full plant | Yes | Any record | Yes |
| Auditor | Scoped | No | No | No |

#### 3.4.6 Mobile/responsive behavior

WS is a desktop-primary pattern. On tablet (768–1024 px), the number of visible columns is reduced to four; horizontal scroll is required for additional columns. On mobile (< 768 px), WS renders as a stacked list of work item cards grouped by stage — the column grid is not rendered. The mobile view of WS shows only the current principal's assigned work items by default.

On edge-gateway glove-mode portals, WS renders at a minimum touch target size of 48 × 48 px per cell; fonts are bumped two steps up the type scale.

#### 3.4.7 Pre-production posture

Same as other patterns. `HMV4_DISABLE_MUTATION_LAUNCHERS=true` disables all Drawer and Wizard triggers from within WS surfaces, ensuring the WS is fully read-only in prototype mode.

---

### 3.5 AR — Authoritative Record Shell

#### 3.5.1 When to use

Choose AR when the surface is the canonical home for a single authoritative record and all mutations to that record flow through this surface. AR is the pattern for every root that has a permanent identity (an immutable record code, a lifecycle state machine, an audit trail, and compliance obligations).

AR is used for all 18 Wave 1 roots. The tabs differ per root (see root-specific slice prompts), but the structural contract is the same for all.

Do not use AR for surfaces that are navigational (use DL or ML). Do not use AR when the surface is primarily a projection (use WS).

#### 3.5.2 Required UI elements (mandatory)

1. Record identity bar: record code (monospace, copyable), record title, lifecycle status chip (color-coded via GraphicsAuthority token), and "last modified by + timestamp"
2. Action toolbar: primary action button (the most common mutation for the current state), secondary actions in a dropdown, and a print/export action
3. Tab navigation: minimum six tabs in this order — Overview, Related, Evidence, History, Compliance, AI Insights. Additional root-specific tabs may follow.
4. Overview tab: structured metadata in two-column definition list; all fields rendered as read-only; mutations launched via "Edit" button that opens a Drawer
5. Related tab: linked records table (sorted by relation type and date); each row links to that record's AR surface
6. Evidence tab: file attachment list (filename, size, uploader, upload date, version); upload, download, and delete actions (permission-gated)
7. History tab: chronological audit event log (event type, actor, timestamp, delta); read-only; paginated
8. Compliance tab: compliance obligation checklist (per J1-J5 pack configuration; see §11); each obligation shows status, evidence links, and deadline
9. AI Insights tab: AI-generated suggestions, anomaly flags, next-best-action recommendations (requires AI kill-switch to be OFF; tab is hidden or shows a disabled state if kill-switch is ON per ADR per the AI kill-switch governance)
10. State transition toolbar (separate from the main action toolbar): shows available state transitions for the current lifecycle state; each transition is a button that opens a confirmation Wizard
11. Pre-production environment banner (ADR-0001)
12. Record-lock indicator: shown when another principal has the record open for editing; non-dismissible warning; shows who holds the lock and since when

#### 3.5.3 Forbidden elements

- Inline editing in tab content (all edits via Drawer overlay)
- Destroying or hiding the tab navigation bar even when a tab has no content (show an empty state within the tab)
- Hard-deleting records from within an AR surface (soft-delete only, and only from Admin context)
- Bypassing the GraphicsAuthority for status chip colors

#### 3.5.4 Data binding convention

- Record: `GET /api/v1/{domain}/{root}/{id}` — full record object
- Related records: `GET /api/v1/{domain}/{root}/{id}/related`
- Evidence files: `GET /api/v1/{domain}/{root}/{id}/attachments`
- Audit history: `GET /api/v1/{domain}/{root}/{id}/events?page=N`
- AI insights: `GET /api/v1/ai/insights?entity_type={root}&entity_id={id}` (deferred if AI kill-switch is ON)
- State transitions: embedded in the record response under `_meta.available_transitions`

#### 3.5.5 Permission model

| Role | Read record | Edit (via Drawer) | State transition | Delete | AI Insights tab |
|------|-------------|-------------------|-----------------|--------|-----------------|
| Viewer | Yes | No | No | No | Yes (read) |
| Operator | Yes | Own records | Limited | No | Yes (read) |
| Supervisor | Yes | Team records | Approval transitions | No | Yes (read) |
| QA Analyst | Yes | Quality fields | Quality transitions | No | Yes (read) |
| Admin | Yes | All fields | All | Soft-delete only | Yes |
| Auditor | Yes | No | No | No | No |
| Inspector | Yes (scoped) | No | No | No | No |
| Customer | Limited fields | No | No | No | No |

#### 3.5.6 Mobile/responsive behavior

On mobile, the tab navigation collapses to a horizontal scroll tab strip (not a dropdown). The Overview tab is shown by default. The action toolbar collapses to a single primary button plus a kebab. The two-column definition list in Overview collapses to single-column stacked. The Related and Evidence tabs are fully functional on mobile. The History tab paginates to 10 items per page on mobile (vs 25 on desktop).

#### 3.5.7 Pre-production posture

`HMV4_DISABLE_MUTATION_LAUNCHERS=true` disables all state transition buttons and Drawer/Wizard launchers from within AR surfaces. The surface is fully read-only in prototype mode. The AI Insights tab renders fixture data only.

---

### 3.6 AC — Admin Configuration

#### 3.6.1 When to use

Choose AC when the surface manages system-level configuration: feature flags, GraphicsAuthority token overrides, tenant settings, pack activation, user/role management, integration credentials, and operational parameters.

AC surfaces are exclusively accessible to principals with the `admin` or `super_admin` role. They are never embedded within domain workflows.

#### 3.6.2 Required UI elements (mandatory)

1. Settings category navigation: left sidebar with categories (General, Security, Integrations, Graphics, Packs, Feature Flags, Users, Roles, Audit)
2. Category heading (`<h2>`) and description paragraph explaining what the category controls
3. Per-setting row: label, current value display, edit control (input, toggle, select), save button per row or per group
4. Simulation scene trigger: for any visual parameter edit, a "Simulate" button that calls `GraphicsAuthority.preview.simulate()` and opens the simulation modal before committing (per CLAUDE.md Graphics Authority mandate)
5. Change confirmation: for destructive or tenant-wide changes, a confirmation dialog with the exact change description
6. Audit trail for settings changes: each saved change appears in the admin audit log immediately
7. Feature flag table: flag key, current state (on/off), owner, last-changed-by, description, per-tenant override capability
8. Pack status panel: shows which J1-J5 packs are enabled for the tenant; activation/deactivation flow
9. Role matrix: permissions grid (role × permission); read-only view; edits via a dedicated role editor
10. Import/export of configuration: JSON export of current configuration; JSON import with validation before apply
11. Pre-production environment banner (ADR-0001) — cannot be dismissed in AC surfaces
12. Danger zone section: for irreversible operations (tenant reset, data purge), separated visually and requiring a typed confirmation

#### 3.6.3 Forbidden elements

- AC surfaces must not expose domain business-record mutations (those belong in AR)
- Inline editing of Graphics tokens without going through the simulation scene first
- Bypassing `ControlKit.*` widget factories for edit widgets (per CLAUDE.md Graphics Authority mandate)
- Feature flag changes that take effect without a confirmation step

#### 3.6.4 Data binding convention

- Settings read: `GET /api/v1/admin/config/{category}`
- Settings write: `PATCH /api/v1/admin/config/{category}` (body: changed keys only)
- Feature flags: `GET /api/v1/admin/flags`, `PATCH /api/v1/admin/flags/{key}`
- GraphicsAuthority tokens: read via `GraphicsAuthority.tokens.read()` client-side; write via `PATCH /api/v1/admin/graphics/tokens/{token_key}` after simulation
- Pack activation: `POST /api/v1/admin/packs/{pack_id}/activate`, `POST /api/v1/admin/packs/{pack_id}/deactivate`

#### 3.6.5 Permission model

Only `admin` and `super_admin` roles can access AC surfaces. All other roles receive a 403 at the API level and a permission-denied page at the frontend level. There is no partial access model for AC.

#### 3.6.6 Mobile/responsive behavior

AC is a desktop-only pattern. On mobile, a "Please use a desktop browser for admin configuration" message is shown. No AC functionality is exposed on mobile or tablet viewports.

#### 3.6.7 Pre-production posture

AC surfaces for GraphicsAuthority and feature flag management are the primary way that prototype behavior is toggled. The pre-production banner is non-dismissible. The "activate for production" class of actions is hidden (per ADR-0001 vocabulary: no "production go-live" actions exist in the UI).

---

### 3.7 Drawer — Side Drawer

#### 3.7.1 When to use

Choose the Drawer pattern for any quick-edit, quick-view, or focused sub-task that:

- Does not require the user to leave the current primary surface
- Can be completed in fewer than five fields or three steps
- Does not itself require navigation to child records

Drawers are always secondary patterns — they are launched from within SH, DL, ML, WS, or AR surfaces. A Drawer never navigates to a new URL; it overlays the current surface without replacing it. If the task requires more than five fields or has conditional branching, promote it to a Wizard.

#### 3.7.2 Required UI elements (mandatory)

1. Drawer container: slides in from the right edge; 480 px wide on desktop; full-width on mobile
2. Drawer header: title (describing the specific action, not just the record type), close button (×), and a subtitle with the record code of the context record
3. Backdrop: semi-transparent overlay covering the primary surface; clicking the backdrop does NOT close the Drawer (to prevent accidental data loss) — only the × button or an explicit Cancel action closes it
4. Form area: uses `ControlKit.*` widget factories for all edit controls; no raw `<input>` or `<select>` elements without a ControlKit wrapper
5. Dirty state guard: if the user has entered data and attempts to close, a confirmation dialog warns of unsaved changes
6. Save/submit button: primary action; disabled until at least one field is dirty and all required fields are valid
7. Cancel button: secondary action; triggers dirty state guard if applicable
8. Validation summary: inline field-level validation messages appear on blur; a summary at the top of the form appears on failed submit attempt
9. Success state: on successful save, the Drawer closes and a toast notification confirms the action on the primary surface
10. Error state: on API error, the Drawer stays open; error message displayed at the top of the form with details; Retry button
11. Pre-production mutation guard: when `HMV4_DISABLE_MUTATION_LAUNCHERS=true`, the Drawer can still open (for display purposes) but all form controls are disabled and a banner reads "Mutations disabled in prototype mode"
12. Focus management: focus moves to the Drawer heading (`<h2>`) when the Drawer opens; focus returns to the trigger element when the Drawer closes

#### 3.7.3 Forbidden elements

- Navigation links within a Drawer that would change the URL
- Nested Drawers (a Drawer opening another Drawer)
- KPI tiles or data tables inside a Drawer
- Tabs within a Drawer (if that complexity is needed, use a Wizard or navigate to an AR)

#### 3.7.4 Data binding convention

- Pre-populate with: `GET /api/v1/{domain}/{root}/{id}` response (the same payload the AR surface uses; no separate Drawer-specific endpoint)
- Submit: `PATCH /api/v1/{domain}/{root}/{id}` (partial update; only changed fields in body)
- On success: the primary surface below the Drawer re-fetches the record silently (no full page reload)

#### 3.7.5 Permission model

The Drawer inherits the permission context of the primary surface that launched it. A principal who cannot edit a record cannot open an edit Drawer for that record — the trigger button is hidden or disabled at the primary surface level. The Drawer itself does not re-check permissions (the API will enforce on submit anyway).

#### 3.7.6 Mobile/responsive behavior

On mobile, the Drawer occupies the full viewport width and height, behaving like a temporary modal page. The close button remains visible at the top. The backdrop is not rendered on mobile (the Drawer fully covers the primary surface).

#### 3.7.7 Pre-production posture

Drawers are inert by default. The `HMV4_DISABLE_MUTATION_LAUNCHERS=true` flag means that while a Drawer may open (triggered programmatically in tests), all form controls are read-only and the submit button is hidden.

---

### 3.8 Wizard — Step-through Form

#### 3.8.1 When to use

Choose the Wizard pattern when:

- Record creation requires more than five fields, or fields in step N conditionally determine which fields appear in step N+1
- An approval workflow requires a principal to review structured information and confirm a decision with a signature or PIN
- A complex operation requires the user to configure multiple aspects in sequence before the system can execute (e.g., creating a CAPA with initial findings, assigning owners, setting target dates, and attaching evidence)

Wizards are always secondary patterns — they are launched from AR action toolbars, WS work item cards, or DL bulk-action toolbars. Like Drawers, Wizards do not navigate to a new URL.

#### 3.8.2 Required UI elements (mandatory)

1. Step indicator: horizontal progress bar or numbered steps at the top; shows step title and completion state for each step; clicking a completed step navigates back to it
2. Step heading (`<h2>`): updated for each step; announced to screen readers via `aria-live="polite"`
3. Back and Next buttons: Back is always available from step 2 onward; Next validates the current step before advancing; Back does not clear data from the step being left
4. Form area per step: uses `ControlKit.*` widget factories; same validation rules as Drawer
5. Review step (always the penultimate step): read-only summary of all data entered across all steps; each section has an "Edit" link that navigates back to that step
6. Confirm/Submit step (always the final step): primary submit button; if the operation requires a QP signature (J1 pack), a PIN or e-signature widget is shown before the submit button is active
7. Dirty state guard: if the user closes the Wizard after entering data on any step, a confirmation dialog asks them to confirm they will lose their progress
8. Progress persistence: Wizard state is saved to sessionStorage per record ID; if the browser tab is accidentally refreshed, the in-progress Wizard restores to the last completed step
9. Validation summary: appears at the top of the current step on a failed Next attempt; lists all invalid fields with jump links
10. Success state: Wizard closes; toast on the primary surface; primary surface re-fetches the record
11. Error state: API error on final submit leaves the Wizard open; error displayed with Retry; partial submits are not possible (all-or-nothing)
12. Pre-production mutation guard: same as Drawer — when `HMV4_DISABLE_MUTATION_LAUNCHERS=true`, all inputs are disabled and submit is hidden

#### 3.8.3 Forbidden elements

- Allowing the user to submit before reaching the Review step
- Allowing the user to edit the Review step inline (edits go back to the relevant step via the "Edit" link)
- Opening a Drawer from within a Wizard
- Auto-advancing to the next step without explicit user action

#### 3.8.4 Data binding convention

- Initial data: `GET /api/v1/{domain}/{root}/{id}` for the context record (pre-populates applicable fields)
- Create flow: `POST /api/v1/{domain}/{root}` on final submit
- Update flow: `PATCH /api/v1/{domain}/{root}/{id}` on final submit
- Approval flow: `POST /api/v1/{domain}/{root}/{id}/transitions/{transition_key}` with full payload from all steps

#### 3.8.5 Permission model

Same delegation model as Drawer. The trigger in the primary surface is hidden/disabled if the principal lacks the required permission. The Wizard itself enforces the QP signature step only when the J1 pack is active and the transition requires QP sign-off.

#### 3.8.6 Mobile/responsive behavior

Wizards render as a full-screen overlay on all viewports. On mobile, the step indicator collapses to "Step N of M" text (no step titles shown). The review step renders in a single-column stacked layout on mobile.

#### 3.8.7 Pre-production posture

Same as Drawer.

---

## 4. Decision Tree: Selecting a Pattern

The following text-based decision tree guides the implementer to the correct pattern. Evaluate conditions top-to-bottom; take the first branch that matches.

```
START: What is the primary user job on this surface?

├── Monitor/dispatch work across stages or workstations?
│   └── Use WS

├── Navigate to and open a specific record for detailed inspection or mutation?
│   ├── The record has a permanent identity code, lifecycle, and compliance obligations?
│   │   └── Use AR
│   └── The record is a lightweight info page with no tabs needed?
│       └── Use SH

├── Find a record from a list (with KPIs as context)?
│   ├── Records are organized in a strict parent-child hierarchy (2–3 levels)?
│   │   └── Use ML
│   └── Records are flat or single-level?
│       └── Use DL

├── Configure system-level settings or administrative parameters?
│   └── Use AC

├── Perform a quick edit or view without leaving the current surface?
│   ├── Task fits in < 5 fields and < 3 steps?
│   │   └── Use Drawer
│   └── Task requires > 5 fields, conditional branching, or formal sign-off?
│       └── Use Wizard

└── None of the above → escalate to architecture review before proceeding
```

---

## 5. Cross-Pattern Composition Rules

Patterns compose in a strict hierarchy. Primary patterns occupy the full viewport route. Secondary patterns overlay primary patterns without changing the URL.

| Secondary pattern | Can be launched from | Cannot be launched from |
|------------------|---------------------|------------------------|
| Drawer | SH, DL, ML, WS, AR | AC (AC has its own inline edit rows), another Drawer |
| Wizard | AR (action toolbar), WS (work item card), DL (bulk action) | SH, another Wizard, Drawer |

Additional rules:

- A Wizard that is closed mid-flow does not save partial state to the server. sessionStorage persistence is client-only.
- A Drawer that is open prevents the user from opening another Drawer. If the trigger for a second Drawer is clicked while a Drawer is open, the open Drawer prompts for confirmation (dirty state guard) and closes before the new one opens.
- A Wizard that is open prevents the user from opening a Drawer or navigating away. The browser back button triggers the Wizard's dirty state guard.
- AR surfaces can have multiple Drawers and Wizards available as separate triggers, but only one can be open at a time.
- WS surfaces can launch Drawers from individual work item card clicks. A WS surface never launches a Wizard directly — the Wizard is launched from within the Drawer ("Promote to full record creation" action).

---

## 6. Per-Pack Overlay Rules (J1–J5)

Packs modify patterns by injecting additional elements or constraints. All pack overlays are conditional on `tenant.packs.{pack_id}.enabled === true` at runtime.

### J1 — Quality and Regulatory Pack (EU GMP Annex 11, 21 CFR Part 11)

- **AR:** Adds a "QP Sign-Off" tab after the Compliance tab. Tab shows pending QP approvals with e-signature controls. The Compliance tab checklist gains additional EU GMP Annex 11 obligations.
- **Wizard:** All approval and state-transition Wizards gain a final e-signature step (PIN + reason) before submit.
- **AC:** Activates the "21 CFR Part 11 Settings" section in the Security category (audit trail retention period, e-signature mode selection).
- **DL:** KPI strip gains a "Pending QP Approvals" metric tile that links to the QP queue.
- **WS:** Projection rows gain a "QP Required" badge on records awaiting QP sign-off.
- **Footer (all patterns):** Compliance statement changes to include "EU GMP Annex 11 Compliance Mode Active."

### J2 — Advanced Analytics Pack

- **DL:** KPI strip gains trend sparklines per tile (7-day trend chart inline).
- **AR:** AI Insights tab gains a "Predictive Risk Score" widget and a "Process Capability Index (Cpk)" widget.
- **WS:** Capacity indicators gain a forecast overlay (projected load for the next shift).
- **SH:** Gains a "Performance Summary" mini-chart section if the entity has time-series metrics.

### J3 — ITAR/EAR Export Control Pack

- **All patterns:** A persistent ITAR banner is injected at the top of the content area (below the pre-production banner in prototype mode; in the same band in production mode). The ITAR banner is orange with black text, non-dismissible, and reads "ITAR CONTROLLED — Unauthorized export or disclosure is prohibited."
- **AR:** Evidence tab gains an "Export Classification" column for each attachment. Files classified as ITAR cannot be downloaded without a confirmed citizenship/authorization check.
- **DL and ML:** Row-level ITAR classification badge shown on records that contain ITAR-controlled data.
- **Drawer/Wizard:** A mandatory "Export Classification" field is added to any form that creates or edits records in an ITAR-scoped root.

### J4 — Pharmaceutical PCCP Pack

- **AR:** Record identity bar gains a PCCP status badge (one of: Approved / Under Review / Pending Submission). Compliance tab gains PCCP-specific obligation rows.
- **DL:** KPI strip gains a "PCCP Submissions Due" metric tile.
- **Wizard:** PCCP submission preparation wizard adds a structured PCCP data collection flow.
- **AC:** Activates the "PCCP Settings" section (FDA submission endpoint configuration).

### J5 — Customer Visibility and Lifecycle Portal (CVLP) Pack

- **AR:** Evidence tab gains a "Shared with Customer" toggle per attachment. Records with CVLP sharing enabled show a "Customer Visible" chip in the record identity bar.
- **DL:** Row-level "Shared with Customer" status column appears.
- **AC:** Activates the "CVLP Customer Portal Settings" section (branding, allowed record types, notification preferences).
- **Customer portal variant:** Only available when J5 is enabled. Shows only customer-visible records and evidence.

---

## 7. Per-Portal Variant Rules

Six portal variants serve different principals. Each variant restricts the set of available patterns and applies specific constraints.

### 7.1 Internal Portal (default)

- All eight patterns available.
- Full navigation: 14 domains, all enabled roots.
- All pack overlays apply.
- Mutations: enabled for authorized roles.

### 7.2 Auditor Portal

- Available patterns: SH (read-only), DL (scoped to audit session), AR (read-only; Compliance tab visible; History tab visible; all mutation controls hidden), ML (read-only).
- Drawer and Wizard: unavailable.
- Navigation: filtered to the scope of the current audit session (specific domain + date range + record set defined at session creation).
- Identity badge: non-dismissible "AUDITOR SESSION" chip in the top bar; session timer counts down.
- No KPI strips (DL pattern renders without KPI strip for auditor portal).

### 7.3 Inspector Portal (FDA)

- Available patterns: SH (read-only), AR (read-only; all tabs except AI Insights visible), DL (read-only, scoped to inspection scope).
- Navigation: filtered to the record types relevant to the active inspection.
- Identity badge: "FDA INSPECTOR" chip in the top bar.
- Evidence tab in AR: download of non-ITAR files allowed; upload and delete forbidden.
- No mutations, no Wizards, no Drawers.

### 7.4 Customer Portal (CVLP — requires J5 pack)

- Available patterns: SH (for product/lot information pages), DL (scoped to customer's own records and shared lots), AR (read-only; only Overview, Evidence, Compliance tabs visible; evidence filtered to customer-visible attachments).
- Navigation: branded with customer tenant identity; no internal domain structure visible.
- No pack overlay banners (J3 ITAR, J1 GMP banners) are shown in customer portal — ITAR-controlled files are excluded at the API level before the customer sees them.
- Language default: customer's preferred locale from their profile.

### 7.5 Edge Gateway Glove-Mode Portal

- Available patterns: WS (production floor dispatch), AR (simplified: Overview tab only), Drawer (quick status update).
- Navigation: simplified; maximum two-column layout; no complex ML or AC surfaces.
- Touch targets: minimum 48 × 48 px for all interactive elements.
- High-contrast default: `prefers-contrast: high` behavior enabled regardless of OS setting.
- Fonts: two steps up the type scale from default density.
- Language: operator's configured language; no language toggle in the UI.
- No AI Insights tab; no CVLP features.

### 7.6 Support Portal

- Available patterns: All eight.
- Tenant switcher in the top bar: support principals can switch between tenant contexts.
- Admin tools: visible; support-specific AC sections (diagnostic tools, log viewer, configuration snapshot export).
- No customer data write: support portal is read-only for all domain business records; only Admin configuration changes are permitted (and logged with a "support_impersonation" audit event).
- Identity badge: "SUPPORT MODE" chip in the top bar.

---

## 8. Graphics Authority Compliance (ADR-0009)

Every visual parameter in every pattern must be resolved through the Graphics Authority. This is a hard constraint with no exceptions.

**Rule:** No hex color literals, no bare `px` string padding/margin values, no font-family strings, and no hardcoded motion durations in any HMV4 JavaScript source file or inline HTML style attribute.

**Correct usage:**

```javascript
// In any pattern renderer:
const brandColor = window.GraphicsAuthority.tokens.read('brand-primary');
const surfaceColor = window.GraphicsAuthority.tokens.read('surface-2');
const radiusMd = window.GraphicsAuthority.tokens.read('radius-md');
```

**For CSS:** bind to the `css_variable` declared in `graphics_token_catalog` (e.g., `var(--brand-primary)`). Never write the resolved value as a literal in a `.css` file.

**Enforcement:** The forbidden diff guard (quality gate 7 in the slice cycle) rejects any PR that introduces a hex literal or bare px value in HMV4 JS files. The `node --check` syntax gate does not catch this — it must be caught by the grep-based diff guard.

**Status chips (AR and DL):** Lifecycle status chip colors are mapped through `GraphicsAuthority.tokens.read('status-{state_key}')` — never through a hardcoded color map in JavaScript. If a new lifecycle state is added, a token row must be added to `graphics_token_catalog` before the renderer can use it.

---

## 9. Pattern Retirement Governance (H7)

A pattern is retired when it is replaced by a newer structural contract or when all roots that used it have migrated away. Retirement follows the H7 governance process:

1. **Deprecation announcement:** A deprecation notice is added to this document (Part F) with the target removal wave.
2. **Alias period:** For one full wave (approximately 6 slices), the deprecated pattern code remains valid as an alias to its replacement. Fixture files with the old `_pattern` key still parse without error.
3. **Migration sweep:** All existing slices using the deprecated pattern are updated to the replacement. This is a single dedicated PR per deprecated pattern with no functional changes.
4. **Removal:** The deprecated pattern code, its renderer, and its fixture schema are removed. Fixture files with the old key now fail the JSON fixture parse gate (quality gate 2), which enforces the migration.
5. **Archive:** The retired pattern specification is moved to `_reports/module-template-v4/PART_F_FRONTEND_CATALOG/RETIRED/` for historical reference.

No pattern is currently in the retirement process as of Wave 1.

---

## 10. Quick Reference: Pattern Element Inventory

| Element | SH | DL | ML | WS | AR | AC | Drawer | Wizard |
|---------|----|----|----|----|----|----|--------|--------|
| `<h1>` page title | Req | Req | Req | Req | — | Req | — | — |
| Record identity bar | Opt | — | — | — | Req | — | (header) | — |
| Breadcrumb | Req | Opt | Req | — | Opt | Opt | — | — |
| KPI strip | — | Req | — | — | — | — | — | — |
| Column grid | — | Req | Req | Req | — | — | — | — |
| Tab navigation | — | — | — | — | Req | Opt | — | — |
| Filter panel | — | Req | Req | Req | — | — | — | — |
| Bulk actions | — | Req | Opt | — | — | — | — | — |
| Step indicator | — | — | — | — | — | — | — | Req |
| ControlKit widgets | — | — | — | — | — | Req | Req | Req |
| Simulation scene | — | — | — | — | — | Req | — | — |
| Dirty state guard | — | — | — | — | — | — | Req | Req |
| Pre-prod banner | Req | Req | Req | Req | Req | Req | Opt | Opt |
| Staleness indicator | — | — | — | Req | — | — | — | — |
| QP sign-off (J1) | — | — | — | — | Req | — | — | Req |
| ITAR banner (J3) | Req | Req | Req | Req | Req | Req | Req | Req |

Legend: Req = required; Opt = optional; — = forbidden or not applicable

---

```
S3-07_F0_PART_F_OVERVIEW_DEEP_UPGRADE_COMPLETE
```
