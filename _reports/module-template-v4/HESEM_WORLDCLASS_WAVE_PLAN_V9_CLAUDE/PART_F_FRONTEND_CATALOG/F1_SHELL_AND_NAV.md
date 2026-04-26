# F1 — Shell and Navigation

```
surface_class:  SH
owner_role:     Frontend Lead
```

---

## 1. Purpose

The Shell is the application chrome — the top bar, the side navigation,
the tenant switcher, the user menu, the global search, the notification
inbox, the help link. The Shell is where the user lives between
specific surfaces.

---

## 2. Components of the Shell

### Top bar

Contains:
- HESEM logo (links to home dashboard)
- Tenant switcher (when user belongs to multiple tenants)
- Global search (powered by E5 search index)
- Notification inbox indicator (E10)
- Help / docs link
- User menu (profile, preferences, logout)

### Side navigation

The hierarchical menu of domains, modules, and workspaces. Per the
route grammar (B6):

```
/ops
/ops/{domain}
/ops/{domain}/{module}
/ops/{domain}/{module}/{workspace_family}
/ops/records/{resource_family}/{record_id}?tab=overview
```

Side nav reflects the user's permissions: hidden entries are not
rendered.

### Footer

Contains: pre-production banner ("Development / Prototype — not
validated production"), version indicator, support link.

### Global toast / banner area

For system-wide notifications (e.g., "Scheduled maintenance window in 2
hours").

---

## 3. Behaviors

- Shell renders on every page (consistent chrome).
- Shell is not a workspace; no projection or mutation lives here.
- Tenant switcher updates the application's tenant context (with full
  logout / login if cross-tenant).
- Global search routes to a search-results screen (a special workspace).

---

## 4. Cross-cutting concerns

- C3 i18n: shell text (menu labels, banner text) localized.
- C12 Accessibility: shell is the most-tested surface; keyboard nav
  must work.

---

## 5. Wave target

L4 by W0 (already shipped in HMV4 baseline); L5 not applicable
(shell does not mutate).

---

## 6. Decision phrase

```
F1_SHELL_AND_NAV_BASELINE_LOCKED
NEXT: F2_DASHBOARD_LIST_SCREENS.md
```
