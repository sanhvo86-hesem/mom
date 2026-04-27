# F1 — Shell and Navigation Specification
## HESEM Manufacturing Operations Management Portal
### HMV4 Module-Template-V4 Program

**Document status:** Development/prototype reference — not for production use (ADR-0001)
**Scope:** The outer shell container shared by all 18 Wave 1 root slices and all portal variants

---

## Overview

The portal shell is the persistent outer container that surrounds all pattern surfaces. Every HMV4 route renders inside the shell; the shell itself never reloads on client-side navigation. The shell comprises five structural zones: the top bar, the side navigation panel, the main content area (where patterns render), the footer, and the banner area (which overlays the top of the content area for system-wide announcements).

The shell is implemented in `mom/scripts/portal/72-module-template-v4-bridge.js` (bridge/bootstrap) and rendered by `mom/scripts/portal/73-module-template-v4-renderers.js`. Its CSS tokens are declared in `mom/styles/module-template-v4.tokens.css` and bound to `graphics_token_catalog` values at runtime via `window.GraphicsAuthority.tokens.read()`.

The shell is the first structure to load. It must be visually complete and interactive within the p95 LCP budget of 1.5 seconds. Pattern content areas may lazy-load after the shell is ready.

---

## 1. Top Bar

The top bar is a fixed 56 px (comfortable density) horizontal bar at the top of the viewport, present on every route across all portal variants. Its height adapts to the active density setting: 48 px (compact), 56 px (comfortable), 64 px (spacious). Height is resolved via `GraphicsAuthority.tokens.read('shell-topbar-height-{density}')`.

### 1.1 Logo and Tenant Switcher

The leftmost element of the top bar is the HESEM brand mark followed immediately by the tenant identity block.

**Logo:** The logo SVG source path is resolved from `GraphicsAuthority.tokens.read('brand-logo-url')`. It is never a hardcoded path. The logo renders at 32 px height (comfortable density); the height token is `shell-logo-height-{density}`. The logo is a link to the tenant's home route (`/`). It has `aria-label="HESEM MOM — go to home"`.

**Tenant identity block:** Immediately to the right of the logo, the tenant display name is shown in the `text-primary` token color, using `font-weight: 600` resolved from `GraphicsAuthority.tokens.read('font-weight-semibold')`. Below the tenant name (or inline in compact density), a tier badge chip shows the tenant's subscription tier (e.g., "Enterprise", "Professional", "Pilot"). The tier badge background color is resolved from `GraphicsAuthority.tokens.read('tier-badge-{tier_slug}-bg')`.

**Tenant switcher:** In multi-tenant contexts (support portal, and any principal with `tenant.switch` permission), the tenant identity block is a clickable button that opens a popover listing all accessible tenants. The popover shows: tenant name, tier badge, last-accessed timestamp, and a "Switch" button per tenant. Switching tenants triggers a full shell reload with the new tenant context. An "impersonation started" audit event is written. On non-support portals and single-tenant deployments, the tenant block is a static display (no click affordance).

### 1.2 Global Search

The global search bar occupies the center zone of the top bar. It is always present but is disabled in auditor, inspector, and customer portal variants (replaced by a scope-limited search specific to the portal's context).

**Keyboard shortcut:** `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) focuses the search input from anywhere in the application. This binding is registered at the shell level and is not overridden by individual patterns.

**Behavior:**

- On focus, the search popover opens showing recent searches (last 5 queries, persisted to principal's profile in the backend under `principal_preferences.search_recents`).
- As the user types, live search results appear after a 200 ms debounce. Results are scoped by the principal's role: a principal who cannot access a domain will not see results from that domain.
- Results are grouped by root type (e.g., "Nonconformance Cases", "Job Orders", "Work Orders"). Each result shows: record code, record title, status chip, and last-modified date.
- A maximum of 5 results per root type are shown in the popover; a "See all {root} results" link at the bottom of each group navigates to the DL surface for that root with the search pre-filled.
- The search popover closes on `Escape`, on clicking outside, or on navigating to a result.
- Pressing `Enter` with no result selected navigates to the global search results page (a special DL-variant surface showing cross-root results).

**API:** `GET /api/v1/search?q={query}&limit=5&scope=all` — returns grouped results. Role scoping is enforced server-side.

**Recent searches:** Stored at `GET/PATCH /api/v1/principal/preferences/search-recents`. Cleared on sign-out.

**Accessibility:** The search input has `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, and `aria-controls` pointing to the results listbox. Each result has `role="option"`. Keyboard navigation: `ArrowDown`/`ArrowUp` traverse results; `Enter` selects; `Escape` closes.

### 1.3 Notification Inbox Bell

The notification bell icon sits in the right zone of the top bar, to the left of the Help icon.

**Unread count badge:** A numeric badge overlays the bell icon showing the count of unread notifications. The badge background color is `GraphicsAuthority.tokens.read('badge-alert-bg')`. If the count exceeds 99, it displays "99+". The badge is not shown if count is 0 (the absence of a badge is itself meaningful — no news is good news).

**Polling:** The unread count is refreshed every 30 seconds via `GET /api/v1/notifications/unread-count`. The response is a single integer. This is a lightweight endpoint designed to be called frequently.

**Popover:** Clicking the bell opens a popover showing the last 5 notifications. Each notification shows: notification type icon, message text (truncated to two lines), timestamp (relative, e.g., "3 minutes ago"), and a read/unread indicator. The popover has a "Mark all as read" action at the top and a "View all notifications" link at the bottom that navigates to the full notification inbox (route E10). The popover is a `role="dialog"` with `aria-label="Notification inbox preview"`.

**Notification types and icons:** Each notification type has a distinct icon resolved from the icon token system (not a hardcoded SVG path). Types include: record assigned, approval required, state transition completed, system alert, AI insight generated, compliance deadline approaching.

**ARIA live region:** When a new notification arrives (detected by the unread count increasing on a poll), an `aria-live="polite"` region announces "You have N new notifications" to screen readers. This region is in the DOM always (hidden when not active) to ensure screen readers respect the live attribute.

### 1.4 Help

The Help icon (question mark circle) is in the right zone of the top bar. It is context-sensitive: the documentation link it opens is determined by the current route.

**Mechanism:** The shell maintains a route-to-doc-URL mapping. When the user navigates to a new route, the shell updates the Help icon's `href` and `aria-label` to reflect the current screen. The mapping is loaded from `GET /api/v1/help/route-map` at shell initialization and cached for the session.

**Behavior:** Clicking Help opens the relevant documentation page in a new browser tab. It does not open an in-app panel (that complexity is deferred to a post-Wave-1 enhancement).

**Fallback:** If no route-specific documentation URL is configured, Help links to the top-level HMV4 documentation index.

### 1.5 User Menu

The user menu is triggered by a button in the rightmost position of the top bar. The button displays the principal's avatar (initials fallback if no photo) and display name (truncated to 16 characters on desktop, avatar-only on mobile).

**Menu items:**

- **My Profile** — navigates to the principal's profile AR surface
- **Preferences** — opens a Drawer with: notification preferences, default landing page, default date format
- **Language** — opens a sub-menu (see §1.7)
- **Density** — opens a sub-menu (see §1.6)
- **Sign Out** — triggers sign-out flow; clears session tokens; redirects to login page

The user menu is a `role="menu"` with `role="menuitem"` children. It traps focus while open. `Escape` closes it and returns focus to the trigger button.

### 1.6 Density Toggle

Density controls the information density of the entire shell and all patterns. Three levels are available: Compact, Comfortable (default), Spacious.

**Persistence:** Selected density is stored in `principal_preferences.density` via `PATCH /api/v1/principal/preferences`. It is loaded at shell initialization and applied before first render, preventing a layout shift.

**Implementation:** Density is applied by setting a data attribute on the `<html>` element (`data-density="compact|comfortable|spacious"`). All density-sensitive sizes (row heights, padding, font sizes) are bound to CSS custom properties declared in `module-template-v4.tokens.css` and resolved from GraphicsAuthority tokens: `GraphicsAuthority.tokens.read('density-row-height-{density}')`, `GraphicsAuthority.tokens.read('density-font-size-base-{density}')`, etc.

No pixel values appear in JavaScript. The density token values are stored in `graphics_token_value` for each `density-*` token key.

### 1.7 Language Toggle

Five locales are supported: `en-US`, `vi-VN`, `de-DE`, `fr-FR`, `ja-JP`.

**Selection:** The language sub-menu in the user menu shows the five locales with their native-language names ("English", "Tiếng Việt", "Deutsch", "Français", "日本語"). The current locale is checkmarked.

**Persistence:** Stored in `principal_preferences.locale` via `PATCH /api/v1/principal/preferences`. Loaded at shell initialization. Changing locale triggers a full page reload to re-initialize the ICU MessageFormat 2 message catalog.

**RTL readiness:** While no RTL locale is in the current supported set, the shell layout uses logical CSS properties (`padding-inline-start`, `margin-block-end`, etc.) throughout, so that adding Arabic or Hebrew in a future wave requires only a locale bundle addition and a `dir="rtl"` attribute on `<html>`, not a layout rewrite.

**Date, time, and number formatting:** All date/time values are formatted via `Intl.DateTimeFormat(locale, options)` where `locale` is the principal's selected locale. All numeric values (quantities, currencies, percentages) are formatted via `Intl.NumberFormat(locale, options)`. No manual date or number formatting logic exists in any shell or pattern renderer.

### 1.8 Pre-Production Banner

**Per ADR-0001:** When `HMV4_PREVIEW_ENABLED=true` and `NODE_ENV !== 'production'`, a non-dismissible banner is rendered at the very top of the top bar (above the logo row, not replacing it). The banner reads:

> DEVELOPMENT ENVIRONMENT — NOT FOR PRODUCTION USE

The banner background color is `GraphicsAuthority.tokens.read('banner-preproduction-bg')` (an orange token). The text color is `GraphicsAuthority.tokens.read('banner-preproduction-text')` (a dark near-black token for contrast). The banner is 32 px tall; its height token is `shell-preprod-banner-height`.

The shell top bar height calculation accounts for the pre-production banner: `shell-topbar-height-{density} + shell-preprod-banner-height` when the banner is active. All elements that are positioned relative to the top bar adjust accordingly via the CSS custom property `--shell-top-offset`.

The pre-production banner is rendered even in auditor, inspector, and customer portal variants — there is no portal variant in which the pre-production posture is suppressed in prototype mode.

---

## 2. Side Navigation

The side navigation panel is a vertical panel on the left edge of the viewport. In the default expanded state it is 240 px wide. In collapsed (icon-only) state it is 56 px wide. Width values are resolved from GraphicsAuthority tokens: `shell-sidenav-width-expanded` and `shell-sidenav-width-collapsed`.

### 2.1 Route Grammar

The nav is organized by domain. Each of the 14 canonical domains has a top-level nav group with a group header (domain icon + domain label). Within each group, individual root routes appear as nav items.

**Domain slugs (14):** `master_data`, `planning_production`, `quality_improvement`, `finance`, `inventory_logistics`, `procurement_supplier_quality`, `commercial_customer`, `maintenance_ehs`, `analytics`, `mes_execution`, `traceability_serialization`, and three reserved slots for cross-domain surfaces. Per ADR-0002, these labels are frozen; no synonym is introduced in the UI.

**Root codes (18 in Wave 1):** DISP, NQCASE, TRAIN, CAPA, CDOC, INSP, BREL, ECO, JO, SO, WO, CPO, PO, QUO, PREC, LOT, IREV, MWO.

Each root appears in its canonical domain group. The display label for each root is resolved from the locale message catalog (never hardcoded).

**Route pattern per root:** `/{domain_slug}/{root_code_lower}` for the DL/WS landing; `/{domain_slug}/{root_code_lower}/{id}` for the AR surface.

### 2.2 Permission-Driven Visibility

Nav items are hidden (not just disabled) when the current principal's role does not grant access to that root or domain. The visibility list is determined at shell initialization from `GET /api/v1/principal/nav-permissions` — a lightweight response listing which domain/root combinations the principal can see. Nav items not in this list are removed from the DOM entirely (not merely styled as disabled), preventing information leakage about restricted areas of the system.

If a principal's permissions change while they are logged in (e.g., a role change by an admin), the next route navigation triggers a nav-permissions re-fetch, updating the visible nav items without a full reload.

### 2.3 Per-Pack Toggle

Nav items associated with a pack route (e.g., the QP Approval Queue for J1, the PCCP Submission Centre for J4) are only included in the nav when the tenant's pack is enabled (`tenant.packs.{pack_id}.enabled === true`). This is checked at shell initialization from the same `nav-permissions` endpoint, which includes pack-gated routes in its response only when the pack is active.

Pack-gated nav items are distinguishable by a small pack badge (e.g., "J1") to the right of the nav item label in expanded mode. In icon-only collapsed mode, the pack badge is not shown; the item's icon tooltip includes the pack name.

### 2.4 Collapse and Expand

The nav panel has a collapse/expand toggle button at the bottom of the nav panel (or at the top edge of the content area on some viewports). Clicking it toggles between 240 px and 56 px.

In collapsed (icon-only) mode:
- Domain group headers show only the domain icon; the label is hidden.
- Root nav items show only the root icon; the label is hidden.
- Hovering a collapsed nav item shows a tooltip with the label.
- Active item is indicated by a highlighted icon background.

**Persistence:** Collapse state is stored in `localStorage` under the key `hmv4_sidenav_collapsed_{principal_id}`. It is read synchronously before first render to prevent layout shift on reload.

### 2.5 Recent Records

A "Recent" section at the bottom of the nav panel shows the last 5 records the principal has opened (any root, any domain). Each recent entry shows: root type icon, record code, and a truncated record title. Clicking a recent entry navigates to that record's AR surface.

Recent entries are stored in `principal_preferences.recent_records` (a server-side list, not localStorage, so they are consistent across devices). The list is updated on every AR surface open via a `PATCH /api/v1/principal/preferences/recent-records` call (debounced, fire-and-forget — not on the critical path).

### 2.6 Pinned Shortcuts

Above the Recent section, a "Pinned" section allows the principal to pin up to 10 nav destinations (any root landing or any specific AR record URL). Pinned shortcuts persist across sessions.

The "pin" action is available from a context menu on any nav item (right-click or a `⋯` button visible on hover). Pinned items appear with a pin icon in the Pinned section. The order is drag-sortable on desktop (non-critical; mobile shows them in the order they were pinned with no reorder UI).

Pinned shortcuts are stored in `principal_preferences.pinned_shortcuts` via `PATCH /api/v1/principal/preferences/pinned-shortcuts`.

### 2.7 Keyboard Navigation

The side navigation fully conforms to WAI-ARIA 1.2 Tree pattern:

- The nav is a `role="tree"` landmark.
- Domain group headers are `role="treeitem"` with `aria-expanded` when collapsible.
- Root nav items are `role="treeitem"` children.
- `ArrowDown`/`ArrowUp` move focus between visible items.
- `ArrowRight` expands a collapsed domain group; `ArrowLeft` collapses it.
- `Enter` or `Space` activates a nav item (navigates).
- `Home`/`End` move to the first/last visible nav item.
- All nav items are reachable without a mouse.

The collapse/expand toggle button for the entire nav panel is a standard `<button>` with `aria-expanded` and `aria-label` describing the current state ("Collapse navigation" / "Expand navigation").

### 2.8 Responsive Behavior

**Desktop (≥ 1280 px):** Full expanded nav by default; collapse toggle available.

**Tablet (768–1279 px):** Nav defaults to icon-only (collapsed) mode. The collapse toggle is available. Domain group expand/collapse is disabled (all items visible at the icon level); tapping an icon item that has children shows a popover sub-menu with the children.

**Mobile (< 768 px):** Nav is hidden by default. A hamburger button in the top bar opens the nav as a full-height slide-in drawer from the left. The backdrop covers the content area; tapping the backdrop closes the nav. The nav in this drawer mode shows the full expanded view (labels visible) regardless of the desktop collapse state.

---

## 3. Footer

The footer is a 48 px tall bar at the bottom of the viewport. It is present on all portal variants. Its background color is `GraphicsAuthority.tokens.read('shell-footer-bg')`.

### 3.1 Pre-Production Posture Text

Per ADR-0001, the footer always contains the text: "Development / Prototype Environment — Data shown is for testing purposes only and does not represent production records." This text is rendered in the `text-secondary` token color. It is not dismissible. It does not appear in production-mode deployments (gated on `NODE_ENV === 'production'`), but since all HMV4 surfaces are in development/prototype mode, this text is always present in the current program scope.

### 3.2 Version and Commit Hash

The footer displays: `v{VERSION} ({COMMIT_HASH_SHORT})`. Both values are injected at build time via environment variables (`HMV4_VERSION`, `HMV4_COMMIT_HASH`). In development, if these variables are absent, the footer shows `vDEV (local)`. The commit hash links to the corresponding commit on the internal source control system (link resolved from `HMV4_COMMIT_BASE_URL` environment variable).

### 3.3 Support Link

A "Support" link opens the internal support portal in a new tab. The URL is resolved from `HMV4_SUPPORT_URL` environment variable (not hardcoded). In the customer portal variant, the support link routes to the HESEM customer support desk URL configured in the CVLP tenant settings.

### 3.4 DPA and Privacy Notice

Two links: "Data Processing Agreement" and "Privacy Notice." Both open in a new tab. URLs are resolved from `HMV4_DPA_URL` and `HMV4_PRIVACY_URL` environment variables. These links are required by GDPR compliance in EU-deployed tenants; their presence is not conditional on tenant locale.

### 3.5 Pack Compliance Statements

When a pack is active, a short compliance statement is appended to the footer (after the Privacy Notice link):

- **J1 active:** "EU GMP Annex 11 | 21 CFR Part 11 Compliance Mode"
- **J2 active:** No footer statement (analytics is not a regulatory mode)
- **J3 active:** "ITAR/EAR Export Control Active — See your compliance officer before sharing"
- **J4 active:** "PCCP Pharmaceutical Compliance Mode"
- **J5 active:** No footer statement (CVLP portal has its own branding)

Multiple pack statements are separated by a `|` divider. The full compliance statement line is rendered in a slightly smaller font size (`font-size: GraphicsAuthority.tokens.read('font-size-xs')`).

### 3.6 Accessibility Statement

A link labeled "Accessibility" at the far right of the footer links to the HESEM MOM Accessibility Conformance Report (WCAG 2.2 AA). The URL is resolved from `HMV4_A11Y_STATEMENT_URL`.

---

## 4. Banner Area

The banner area is a dedicated zone immediately below the top bar (or below the pre-production banner if active) and above the main content area. Banners stack vertically when multiple are active. Each banner has a distinct type, color scheme (from GraphicsAuthority tokens), and dismissibility rule.

The banner area is implemented as an `aria-live="assertive"` region for banners that appear during a session (maintenance, security events). For banners that are present on page load, `aria-live` is set to `off` (screen readers read them as part of the natural DOM order).

### 4.1 Maintenance Window Banner

**Trigger:** `system.maintenance_window.active === true` in the global system status object (polled every 5 minutes from `GET /api/v1/system/status`).

**Appearance:** Blue/info color scheme (`banner-info-bg`, `banner-info-text` tokens). Icon: wrench/tool. Text: "Scheduled maintenance begins at {datetime}. Save your work." The datetime is formatted per the principal's locale.

**Dismissibility:** Dismissible by the principal. Dismissal state stored in `sessionStorage` keyed by the maintenance window ID. The banner returns if the principal opens a new tab or session.

**Position:** First in the banner stack (topmost).

### 4.2 Tenant Freeze Banner

**Trigger:** `tenant.status === 'frozen'` — set by an admin or by the billing system for overdue accounts.

**Appearance:** Warning orange color scheme (`banner-warning-bg`, `banner-warning-text` tokens). Icon: lock. Text: "This tenant account is frozen. Read-only access only. Contact your administrator." All mutation surfaces are automatically disabled regardless of the Drawer/Wizard mutation guard flags.

**Dismissibility:** Non-dismissible. Persists until the tenant status changes.

**Position:** Always renders above the maintenance banner (takes priority in the stack).

### 4.3 SLO Burn-Rate Banner

**Trigger:** When a workspace projection's data age exceeds the configured staleness threshold (default: 10 minutes), the WS surface itself shows a staleness indicator. If the overall API error rate crosses the SLO burn-rate threshold (configured per tenant, default: >10% 5xx over 5 minutes), a shell-level banner appears.

**Appearance:** Warning yellow scheme (`banner-stale-bg`, `banner-stale-text` tokens). Icon: clock. Text: "Data may be delayed. Last successful API response: {relative_time}. [Retry]"

**Dismissibility:** Dismissible. Returns if the condition persists through the next poll cycle.

**Freshness indicator:** A horizontal progress bar within the banner shows how stale the data is relative to the SLO threshold (green → yellow → red). The bar updates every 30 seconds.

### 4.4 Regulator Window Open/Close Banner

**Trigger:** Per H1 §3, when a regulatory agency has opened an inspection or audit window against the tenant, `tenant.regulator_window.status === 'open'` in the system status.

**Appearance:** Blue/info scheme for "open" (`banner-info-bg`). Text: "Regulator inspection window is OPEN. All system access is logged and may be reviewed by {agency_name}. Maintain data integrity." 

**Dismissibility:** Non-dismissible while the window is open.

**Close event:** When the window closes, a brief "Regulator inspection window has CLOSED" banner appears for 30 seconds in a success green scheme (`banner-success-bg`, `banner-success-text`), then auto-dismisses.

### 4.5 Security Event Banner

**Trigger:** Set by the CISO or security team via `POST /api/v1/admin/security-events` (admin-only endpoint). Appears immediately on next poll cycle (5 minute polling) or pushed via SSE if the tenant has SSE enabled.

**Appearance:** Red/critical scheme (`banner-critical-bg`, `banner-critical-text` tokens). Icon: shield-alert. Text: "{security_event_message}" — the message text is set by the security team and is a free-form string.

**Dismissibility:** Non-dismissible by the principal. Can only be dismissed by an admin via the AC surface or the API.

**Position:** Renders at the top of the banner stack, above all other banners.

### 4.6 AI Kill-Switch Active Banner

**Trigger:** `system.ai.kill_switch_active === true` in the system status.

**Appearance:** Warning yellow scheme. Icon: brain/slash. Text: "AI features are currently disabled. AI Insights tabs and AI-generated suggestions are unavailable. [View status]" — the "View status" link navigates to the E9 AI kill-switch status page.

**Dismissibility:** Non-dismissible. Persists until the kill switch is turned off.

**Effect on patterns:** When this banner is active, the AI Insights tab in all AR surfaces either hides entirely or shows a disabled state with the message "AI Insights unavailable — see system banner for details." Which behavior is controlled by `HMV4_AI_INSIGHTS_TAB_HIDDEN_ON_KILLSWITCH` feature flag.

---

## 5. Per-Portal Variant Shell Behavior

### 5.1 Internal Portal

The full shell as described above. No restrictions beyond role-based nav visibility.

### 5.2 Auditor Portal

**Top bar:** Logo present (HESEM brand). Tenant switcher disabled. Global search replaced by an audit-scope search (searches only within the records in the current audit session). Notification bell hidden. Help links to auditor-specific documentation. User menu retains Profile, Language, Density, and Sign Out; Preferences is hidden (auditors do not persist preferences to the tenant's principal_preferences store).

**Identity badge:** A persistent "AUDITOR SESSION" chip appears in the top bar between the global search and the help icon. Chip background: `GraphicsAuthority.tokens.read('badge-auditor-bg')`. Chip text: `banner-auditor-text`. A session timer (counting up from session start, or counting down to session expiry) is shown within or beside the chip.

**Side nav:** Shows only the domains and roots included in the audit session scope. A "Session Scope" heading at the top of the nav lists the audit session ID and date range. No "Recent" section. No "Pinned" section (auditors do not pin shortcuts).

**Footer:** Adds "Auditor Access Mode — All access is logged and retained for 7 years per regulatory requirements."

### 5.3 Inspector Portal (FDA)

**Top bar:** Logo present. No tenant switcher. Global search scoped to inspection-relevant record types only. Notification bell hidden. "FDA INSPECTOR" identity badge chip in the top bar (`badge-inspector-bg`, `badge-inspector-text` tokens).

**Side nav:** Filtered to the record roots relevant to the active inspection (set at session creation). No Recent, no Pinned.

**Footer:** Adds "FDA Inspection Access Mode — Data accessed is logged."

**Mutations:** All Drawer and Wizard triggers are hidden. Action toolbars in AR surfaces are stripped to download-only actions.

### 5.4 Customer Portal (CVLP — requires J5)

**Top bar:** HESEM logo is replaced by the customer tenant's own logo (resolved from `GraphicsAuthority.tokens.read('customer-portal-logo-url')`, which is configured in CVLP tenant settings). No HESEM branding visible. Tenant switcher hidden. Global search scoped to the customer's own records. Notification bell shows only customer-relevant notifications. No Help link (customer help is via a separate support channel). User menu has: Profile, Language, Sign Out only.

**Side nav:** Replaced by a simplified customer nav: "My Orders", "My Lots", "Quality Reports", "Shared Documents". No domain structure. No Recent, no Pinned.

**Top bar pre-production banner:** The pre-production banner is still shown in development/prototype mode, as CVLP is also an HMV4 prototype surface.

**Footer:** Branded with the customer's company name. Privacy Notice and DPA links are present. No version/commit hash (not appropriate to show to external customers).

### 5.5 Edge Gateway Glove-Mode Portal

**Top bar:** Logo present (simplified version — icon only, no wordmark). No tenant switcher (glove-mode operators are single-tenant). Global search hidden (replaced by a "Quick Find" barcode scan button). Notification bell present with large touch target. User menu reduced to density (fixed to "spacious" — not toggleable in glove mode) and Sign Out.

**Pre-production banner:** Present; height adjusted to match the enlarged glove-mode top bar proportions.

**Side nav:** Collapsed to icon-only by default and not expandable in glove mode. Icons are 32 px (vs 20 px in comfortable density). Touch targets are minimum 48 × 48 px. Only the roots relevant to the operator's assigned workstation appear.

**Content area:** Maximum two columns in any pattern layout. No three-column or four-column grid layouts.

**High-contrast:** `data-contrast="high"` attribute set on `<html>` at portal initialization for glove-mode, enabling high-contrast token overrides (all `surface-*` and `text-*` tokens resolve to higher-contrast values from a dedicated high-contrast token set in `graphics_token_catalog`).

**Footer:** Minimal: version only, no links.

### 5.6 Support Portal

**Top bar:** HESEM logo. Tenant switcher always visible (support principals can switch between any tenant). Global search searches across all tenants the support principal is authorized to access. "SUPPORT MODE" identity badge chip (`badge-support-bg`, `badge-support-text` tokens).

**Side nav:** Full domain and root nav, plus a "Support Tools" section at the bottom with: Tenant Manager, Log Viewer, Configuration Snapshot, Diagnostic Panel.

**Footer:** Adds "Support Access Mode — All access is logged with impersonation context."

---

## 6. Accessibility (WCAG 2.2 AA)

### 6.1 Focus Management on Route Change

When the user navigates to a new route (client-side navigation), focus is programmatically moved to the `<main>` landmark's first `<h1>` heading. This ensures screen reader users hear the new page title announced immediately after navigation, rather than remaining focused on the nav item they clicked.

The focus move is performed after the pattern's DOM has been written to the `<main>` element. A `requestAnimationFrame` wrapper ensures the DOM is stable before `focus()` is called. The `<h1>` element has `tabindex="-1"` to make it programmatically focusable without adding it to the tab order.

### 6.2 Skip-to-Main Link

The very first focusable element in the DOM (before the top bar) is a visually hidden "Skip to main content" link. It becomes visible on focus (uses the standard visually-hidden-focusable CSS pattern: `clip` removed, `position: fixed` revealed). Activating the link moves focus to the `<main>` element.

The "Skip to main content" link text is internalized in the locale message catalog. It is present in all portal variants.

### 6.3 Keyboard Reachability

All interactive elements in the shell — top bar buttons, nav items, footer links, banner close buttons — are reachable via sequential `Tab` navigation without the use of a mouse. The tab order follows the visual order: top bar (left to right) → side nav → main content → footer.

Modal-like elements (user menu popover, search popover, notification popover) trap focus within themselves while open, following the ARIA modal pattern.

### 6.4 Color Contrast

All text/background color pairs in the shell meet WCAG 2.2 AA contrast ratios:

- Body text (`text-primary` on `surface-1`): minimum 7:1 (AAA target)
- Secondary text (`text-secondary` on `surface-1`): minimum 4.5:1 (AA)
- Status chip text on chip background: minimum 4.5:1 for small text
- Pre-production banner text on orange background: minimum 4.5:1 (verified at token authoring time)
- ITAR banner text on orange background: minimum 4.5:1
- Security event banner text on red background: minimum 4.5:1

Contrast ratios are verified at design-token authoring time, not at runtime. Any new token pair added to `graphics_token_catalog` must include a contrast ratio annotation in the token metadata. The automated GraphicsAuthority compliance check (quality gate 7) includes a contrast ratio validator for token pairs marked `requires_contrast_check: true`.

### 6.5 Screen Reader Announcements

All transient UI state changes that are not triggered by the user's own action are announced via ARIA live regions:

- Notification badge count increase: `aria-live="polite"` region announces the new count
- Banner appearance: `aria-live="assertive"` for security event and tenant freeze banners; `aria-live="polite"` for informational banners
- Toast notifications (pattern-level): `aria-live="polite"` region in the pattern content area
- SLO staleness banner freshness bar update: no announcement (visual only; updating every 30 seconds would be too noisy)

### 6.6 Reduced Motion

The shell respects `@media (prefers-reduced-motion: reduce)` at the CSS level:

- Side nav slide animation: replaced by an instant show/hide
- Banner slide-in animation: replaced by an instant appear
- Notification popover fade-in: replaced by an instant appear
- Toast slide-up animation: replaced by an instant appear

The `prefers-reduced-motion` preference is also read in JavaScript at shell initialization and stored in a `HMV4.a11y.reducedMotion` boolean, so pattern renderers can conditionally skip animations without duplicating the media query read.

---

## 7. Internationalization (ICU MessageFormat 2)

### 7.1 String Externalization

Every user-visible string in the shell is externalized to a locale file under `mom/scripts/portal/locale/{locale_code}/shell.json`. No string is hardcoded in JS or HTML. String keys follow the convention `shell.{zone}.{element}.{state}`, e.g., `shell.topbar.search.placeholder`, `shell.nav.recent.heading`, `shell.footer.preprod.text`.

Locale files are loaded at shell initialization from `GET /api/v1/i18n/messages?locale={locale}&namespace=shell`. The response is a flat key→value JSON object. The shell caches the loaded bundle in memory for the session duration.

### 7.2 Pluralization via ICU MessageFormat 2

Count-dependent strings (notification badge text, "N records", "1 pending approval") use ICU MessageFormat 2 syntax in the locale file. The shell includes a lightweight ICU MessageFormat 2 parser for resolving these messages at render time. Example pattern from the locale file:

```json
{
  "shell.topbar.notifications.badge": "{count, plural, =0 {No unread notifications} one {# unread notification} other {# unread notifications}}"
}
```

The formatter is invoked as `HMV4.i18n.format('shell.topbar.notifications.badge', { count: 5 })`.

### 7.3 RTL Layout Readiness

As noted in §1.7, all shell layout uses logical CSS properties. When an RTL locale is added:

1. Set `dir="rtl"` on `<html>`.
2. Add the locale bundle under `mom/scripts/portal/locale/{locale_code}/shell.json`.
3. Add the locale to the language toggle menu.
4. No layout changes needed in JS or CSS.

The side nav slides in from the correct edge automatically (logical property `inset-inline-start`). The banner area is unaffected (full-width). The top bar items reorder automatically via `flex-direction` inherited from the `dir` attribute on a flexbox container.

### 7.4 Date and Time

All timestamps in the shell (notification timestamps, recent record last-modified, banner datetimes) are rendered via `Intl.DateTimeFormat`. The shell provides two helper functions:

- `HMV4.i18n.formatDate(isoString, style)` — style is `'relative'`, `'short'`, or `'long'`
- `HMV4.i18n.formatDateTime(isoString)` — for full datetime display

Relative dates ("3 minutes ago", "2 days ago") are computed client-side from the current time and the ISO timestamp. The relative format uses `Intl.RelativeTimeFormat` where supported, falling back to a simple delta calculation.

### 7.5 Number Formatting

All numeric values (counts, percentages, durations) in the shell use `Intl.NumberFormat(locale)`. The shell provides `HMV4.i18n.formatNumber(value, options)` which wraps `Intl.NumberFormat` with the current locale. No raw `.toFixed()` or `.toString()` calls for numbers that will be displayed to the user.

---

## 8. Design Tokens

All visual parameters in the shell are resolved through `window.GraphicsAuthority.tokens.read(token_key)` per ADR-0009. The following table lists the canonical shell token keys. Each key has a row in `graphics_token_catalog` and a value row in `graphics_token_value`.

### 8.1 Brand and Identity Tokens

| Token key | Usage |
|-----------|-------|
| `brand-primary` | Primary action buttons, active nav item indicator, focus ring color |
| `brand-secondary` | Secondary actions, links, accent elements |
| `brand-logo-url` | SVG URL for the HESEM logo |
| `customer-portal-logo-url` | SVG URL for the customer tenant logo (CVLP only) |

### 8.2 Surface and Background Tokens

| Token key | Usage |
|-----------|-------|
| `surface-1` | Main content area background |
| `surface-2` | Top bar background, side nav background |
| `surface-3` | Footer background, popover backgrounds, card backgrounds |
| `shell-footer-bg` | Footer background (may alias `surface-3`) |
| `shell-topbar-bg` | Top bar background (may alias `surface-2`) |
| `shell-sidenav-bg` | Side nav background (may alias `surface-2`) |

### 8.3 Text Tokens

| Token key | Usage |
|-----------|-------|
| `text-primary` | Primary body text, nav item labels, top bar item labels |
| `text-secondary` | Secondary text, metadata, timestamps, footer text |
| `text-disabled` | Disabled control labels |
| `text-on-brand` | Text on brand-primary backgrounds (e.g., active nav item label in some themes) |

### 8.4 Border and Radius Tokens

| Token key | Usage |
|-----------|-------|
| `border-default` | Borders between shell zones, table cell borders |
| `radius-md` | Popover and card border radius |
| `radius-lg` | Drawer border radius (applied to the leading edge) |

### 8.5 Shadow Tokens

| Token key | Usage |
|-----------|-------|
| `shadow-sm` | Top bar drop shadow, nav collapse toggle button shadow |
| `shadow-md` | Popover shadows (search, notification, user menu) |

### 8.6 Motion Tokens

| Token key | Usage |
|-----------|-------|
| `motion-fast` | Tooltip fade-in, badge count update animation |
| `motion-medium` | Nav collapse/expand, popover open/close |
| `motion-slow` | Banner slide-in, side nav glove-mode expand |

All motion tokens are set to `0ms` when `prefers-reduced-motion: reduce` is detected — this is enforced in the CSS via `@media (prefers-reduced-motion: reduce) { --motion-fast: 0ms; ... }` and in the token CSS custom property declarations in `module-template-v4.tokens.css`.

### 8.7 Shell Dimension Tokens

| Token key | Usage |
|-----------|-------|
| `shell-topbar-height-compact` | Top bar height at compact density |
| `shell-topbar-height-comfortable` | Top bar height at comfortable density |
| `shell-topbar-height-spacious` | Top bar height at spacious density |
| `shell-sidenav-width-expanded` | Side nav width when expanded |
| `shell-sidenav-width-collapsed` | Side nav width when collapsed (icon-only) |
| `shell-preprod-banner-height` | Pre-production banner height |
| `shell-logo-height-compact` | Logo height at compact density |
| `shell-logo-height-comfortable` | Logo height at comfortable density |
| `shell-logo-height-spacious` | Logo height at spacious density |

### 8.8 Badge and Banner Tokens

| Token key | Usage |
|-----------|-------|
| `badge-alert-bg` | Notification badge background |
| `badge-auditor-bg` | Auditor session identity chip background |
| `badge-auditor-text` | Auditor session identity chip text |
| `badge-inspector-bg` | FDA inspector identity chip background |
| `badge-inspector-text` | FDA inspector identity chip text |
| `badge-support-bg` | Support mode identity chip background |
| `badge-support-text` | Support mode identity chip text |
| `banner-preproduction-bg` | Pre-production banner background (orange) |
| `banner-preproduction-text` | Pre-production banner text (dark) |
| `banner-info-bg` | Informational banner background |
| `banner-info-text` | Informational banner text |
| `banner-warning-bg` | Warning banner background |
| `banner-warning-text` | Warning banner text |
| `banner-critical-bg` | Critical/security event banner background |
| `banner-critical-text` | Critical/security event banner text |
| `banner-stale-bg` | SLO staleness banner background |
| `banner-stale-text` | SLO staleness banner text |
| `banner-success-bg` | Success (transient) banner background |
| `banner-success-text` | Success banner text |

---

## 9. Failure Modes

### 9.1 Auth Token Expiry

When the API returns a 401 response to any shell-initiated request (nav-permissions fetch, notification count poll, preference load), the shell intercepts the response and:

1. Preserves the current URL as the return URL in `sessionStorage` under `hmv4_return_url`.
2. Clears all in-memory state (search cache, nav-permissions cache, notification cache).
3. Redirects to the login page: `/auth/login?return={encoded_return_url}`.

On successful re-authentication, the login page reads `hmv4_return_url` and redirects the principal back to where they were.

If the token expiry occurs while a Drawer or Wizard is open, the in-progress form data is lost (sessionStorage Wizard state survives the redirect, but the Drawer state does not). The shell shows a toast on return: "Your session expired. Please review your unsaved changes."

### 9.2 API Unreachable

If the shell's own initialization requests fail (nav-permissions, i18n messages, system status) due to network failure:

- The shell still renders its structural chrome (top bar, side nav structure, footer) using cached data from `localStorage` where available.
- The content area shows a graceful error state: "Unable to reach the HESEM MOM server. Check your network connection. [Retry]"
- The notification badge is hidden (not shown as 0).
- The global search is disabled with a tooltip: "Search unavailable — server unreachable."
- The Retry button re-triggers the full shell initialization sequence.
- If the API becomes reachable again (detected by a retry succeeding), the shell re-initializes without a full page reload.

Patterns that are already loaded do not re-fetch their data automatically on API recovery — the principal must manually navigate or refresh the pattern content.

### 9.3 Tenant Switched While on a Record

When a support principal uses the tenant switcher while the main content area shows an AR surface for a record in the old tenant:

1. The shell issues `GET /api/v1/{domain}/{root}/{id}` against the new tenant context.
2. If the record does not exist in the new tenant (expected in most cases), the API returns 404.
3. The content area shows a "Record not found in this tenant" message with a link to the domain home for the current root in the new tenant.
4. The URL is updated to remove the record ID, navigating to the DL surface for the root: `/{domain}/{root}`.
5. A toast confirms: "Tenant switched to {new_tenant_name}. Navigated to {root} list."

This flow is specific to the support portal where tenant switching is permitted mid-session.

### 9.4 Feature Flag Flip While Session Active

Feature flags are not pushed to the client in real-time. The shell re-evaluates feature flags on every route change by reading from a session-cached copy of the flags (fetched at shell initialization from `GET /api/v1/admin/flags?scope=client`). The cache has a 5-minute TTL.

If an admin flips a feature flag while a principal has an active session:

- The change takes effect on the principal's next route navigation (after the TTL expires and the cache is refreshed).
- The principal does not see the change immediately within the currently open route.
- This is intentional: immediate flag flip propagation would require SSE or WebSockets, which are outside the Wave 1 scope.

If a flag flip disables a pattern that the principal is currently viewing (e.g., `HMV4_PREVIEW_ENABLED` is set to `false` mid-session), the next route navigation will send the principal to a "Feature not available" page. The current route is not disrupted.

---

## 10. Performance KPIs

The following KPIs are the acceptance criteria for the shell implementation. All measurements are p95 values in the Chromium browser on a mid-range hardware profile (standard Playwright CI hardware), under fixture-mode data loading.

| KPI | Target | Measurement method |
|-----|--------|--------------------|
| Largest Contentful Paint (LCP) — shell load | < 1.5 s | Playwright `page.on('metric')` |
| Side nav render (time from route change to nav items visible) | < 100 ms | Performance mark in `73-module-template-v4-renderers.js` |
| Notification badge refresh (time from poll response to badge DOM update) | < 500 ms | Playwright timer from XHR completion |
| Search popover open (time from Cmd+K to popover visible with recent searches) | < 200 ms | Playwright timer from keydown |
| Live search first result (time from first character typed to results visible) | < 600 ms (incl. 200 ms debounce) | Playwright timer from keydown |
| Tenant switch (time from click to new tenant shell render) | < 2 s | Playwright timer from click |
| Density change (time from selection to full re-render at new density) | < 300 ms | Playwright timer from menu item click |

LCP and nav render are measured by the `module-template-v4-visual.spec.ts` Playwright spec. The other metrics are measured by `module-template-v4-live-api.spec.ts` (when `HMV4_FIXTURE_MODE=false`) and by fixture-mode mocks in `module-template-v4.spec.ts`.

All KPIs must pass in the `chromium` project of the Playwright test suite (quality gate 6 in the slice cycle). Firefox and WebKit measurements are informational only in Wave 1.

---

```
S3-07_F1_SHELL_NAV_DEEP_UPGRADE_COMPLETE
```
