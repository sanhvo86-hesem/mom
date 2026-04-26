# F1 — Shell and Navigation (SH)

```
surface_class:  SH
owner_role:     Frontend Lead with Platform Lead
sources:        Per F0 catalog; WCAG 2.2 (skip links + landmarks);
                ISA-95 functional hierarchy informing nav;
                per ADR-0004 forbidden file list (HMV4 v4 shell);
                per F12 i18n + RTL; per F10 design tokens
```

The Shell is the application chrome — top bar, side nav, tenant
switcher, user menu, global search, notification inbox, help link,
banner area. The Shell is where the user lives between specific
surfaces. It is not a workspace and never mutates authoritative
records; it is consistent across every page.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Top bar (logo, tenant switcher,         workspace content (F4)
 search, notifications, user menu,       record content (F5)
 help)                                    bulk action (F6)
Side navigation (per route grammar)      drawer / dialog (F7)
Footer (pre-production banner,            wizard (F8)
 version, support)                        bulk operation (E11)
Global toast / banner area
Pre-production posture banner
 (per ADR-0001)
Auditor-portal shell variant
Customer-portal shell variant
Per-region variant (data residency)
Per-pack overlay (pack-toggled
 menu items)
Quick actions per role
```

---

## 2. Top bar

```
HESEM LOGO                        click → home dashboard;
                                  consistent across pages
TENANT SWITCHER                    when user belongs to multiple
                                  tenants;
                                  switching forces logout/re-auth
                                  (per B6 C5 cross-tenant safety)
GLOBAL SEARCH                       powered by E5 search;
                                  per-tenant scope;
                                  per-language; per-pack
                                  vocabulary;
                                  results route to search-result
                                  workspace
NOTIFICATION INBOX INDICATOR        per E10;
                                  badge with unread count;
                                  click → inbox panel
HELP / DOCS LINK                     per D7 controlled docs;
                                  per language;
                                  per pack
USER MENU                              profile, preferences (per
                                  E10 §2.1), AAL elevation,
                                  logout
DENSITY / DARK MODE TOGGLE              per F10 design tokens
LANGUAGE TOGGLE                          per F12
PRE-PRODUCTION BANNER                     "Development / Prototype —
                                  not validated production"
                                  per ADR-0001 vocabulary
                                  per pack instance state
```

---

## 3. Side navigation

```
HIERARCHICAL                       per route grammar (per B6):
                                  /ops
                                  /ops/{domain}
                                  /ops/{domain}/{module}
                                  /ops/{domain}/{module}/{ws}
                                  /ops/records/{family}/{id}
PERMISSION-DRIVEN                   hidden entries per E2.8 decide;
                                  per role + per attribute
PER-PACK TOGGLE                      pack modules visible only when
                                  pack enabled (per I8)
PER-TENANT BRANDING                   per E14 §2.2 (visual only;
                                  layout governed)
COLLAPSE / EXPAND                       persistent per user;
                                  responsive auto-collapse on
                                  small viewport
KEYBOARD                               full coverage (per F11);
                                  per WCAG SC 2.4.1 skip links
RECENT-WORKSPACES                       quick-access list of last
                                  N workspaces visited
PINNED-WORKSPACES                          per user
```

---

## 4. Footer

```
PRE-PRODUCTION BANNER             per ADR-0001 vocabulary:
                                  "development / prototype" /
                                  "current portal safety" /
                                  "pre-production readiness"
                                  AVOID: "production go-live" /
                                  "production cutover" /
                                  "production release"
VERSION                              build version + commit hash;
                                  links to release notes (per
                                  CVLP per H2 §14)
SUPPORT LINK                         tenant-specific support entry
                                  (CSM contact per K5)
DPA / PRIVACY LINK                    per I8 §3 + GDPR Art 13
COMPLIANCE STATEMENT                  per pack regulator-required
                                  text (e.g., FDA Form claim
                                  text)
ACCESSIBILITY STATEMENT                  per F11 + EAA / Section 508
                                  / EN 301 549
```

---

## 5. Global banner / toast area

```
SYSTEM MAINTENANCE                 "Scheduled maintenance window
                                  in 2 hours"
TENANT FREEZE                        "Tenant in audit freeze
                                  window — change blocked"
                                  per H3 §5 + I8 §6
SLO BURN ALERT                         "Service experiencing
                                  degradation in this region"
                                  (per I3 SEV-2+)
REGULATOR WINDOW                          "DSCSA suspect-product
                                  response due in 24 hours"
                                  (per H1 §3 + E10 §2.8)
SECURITY EVENT                              per I7 SEV-1
KILL-SWITCH ACTIVE (AI)                       "AI feature X
                                  disabled — investigation"
                                  per L4 §6
```

---

## 6. Per-portal shell variants

```
INTERNAL TENANT PORTAL              full shell per §2-§5
AUDITOR PORTAL                       scoped per H3 §7;
                                  read-only;
                                  audit-token visible;
                                  query log surfaced
INSPECTOR PORTAL (regulator)         scoped per H3 §7 + H1 §3;
                                  per-regulator template
CUSTOMER (DPO + Quality)              CVLP-only view per H2 §14
EDGE GATEWAY LOCAL UI                  per Maintenance + Shopfloor;
                                  shorter session timeout;
                                  glove-mode UI per F11
SUPPORT (CSM internal)                 multi-tenant support view
                                  with explicit tenant-context
                                  switch + audit
```

---

## 7. Behaviors

```
RENDER ON EVERY PAGE              consistent chrome
NO MUTATION                       shell never mutates records
TENANT SWITCH                      forces logout/re-auth (per
                                  B6 C5)
GLOBAL SEARCH                       routes to search workspace
ROUTE GRAMMAR                        per B6 / B7
A11Y                                  WCAG 2.2 AA (per F11);
                                  most-tested surface
I18N                                   per F12; RTL where applic
DESIGN TOKENS                          per F10
RESPONSIVE                              desktop, laptop, tablet,
                                  mobile (some collapsing)
PERFORMANCE                              p95 < 100ms render
PER-PACK MENU                              pack toggle controlled per
                                  I8 + H7
```

---

## 8. Cross-cutting concerns

```
PROBLEM DETAILS RENDERING        global toast renders RFC 9457
                                 problem details
A11Y                              skip links to main + nav +
                                 footer; landmarks; focus visible
I18N                               localized; per regulator-
                                 required language
DESIGN TOKENS (per F10)            no hardcoded colors / sizes
TENANT BOUNDARY                       per B6 C5
DATA RESIDENCY                        per region pinning
PER-PACK                                pack toggle drives menu
DEPRECATION                              shell is HMV4 ADR-0004
                                  forbidden file list scoped;
                                  changes governed
```

---

## 9. Wave target

```
W0        baseline shell (existing HMV4)
W1        per-pack overlay scaffolding;
          per-language toggle;
          accessibility hardening
W3        auditor + inspector portal scaffolding
W4        notification inbox integration (per E10);
          regulator-window banner integration
          (per H1 §3)
W7        AI feature kill-switch banner (per L4)
W8        SOC 2 + DORA Elite path
W10       per-pack overlay GA
W12       sovereign region variants
```

---

## 10. Failure modes

```
FM1   Cross-tenant data leak in shell (e.g., search returns
      cross-tenant)
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic

FM2   Shell hardcoded color / spacing (Graphics Authority bypass)
      Recovery: per F10 + ADR-0009;
              CI lint;
              re-tokenize

FM3   Side nav showing items role doesn't have
      Recovery: per E2 decide pre-render;
              double-check authorization on click

FM4   Pre-production banner missing
      Recovery: per ADR-0001 mandatory;
              CI check forces banner present

FM5   Tenant switcher races with mutations in flight
      Recovery: confirm + force reload before switch;
              session-state cleared

FM6   Auditor portal escapes scope via shell nav
      Recovery: per H3 §7 + B6 C5; SEV-1; H8
              systemic

FM7   Edge gateway UI loses connectivity
      Recovery: local cache + replay (per RB-INC-003)

FM8   Banner spam (too many alerts simultaneously)
      Recovery: priority queue;
              user mute (per E10 §2.9)
```

---

## 11. Cross-references

- F0 — pattern catalog
- F2..F8 — surfaces rendered inside shell
- F9 — binding (E1 identity + E2 authority + E10 inbox)
- F10 — design tokens
- F11 — accessibility (canonical)
- F12 — i18n + RTL
- B6 C5 — tenant boundary
- B7 — route grammar
- E1 — identity / session
- E2 — authority for menu enable
- E10 — notification inbox
- E14 — admin (branding + tenant config)
- ADR-0001 — pre-production posture
- ADR-0004 — HMV4 forbidden files
- ADR-0009 — Graphics Authority
- H1 §3 — regulator-window banner
- H3 §7 — auditor portal
- I3 — incident banner
- I7 — security event banner
- I8 — tenant switcher safety
- L4 §6 — kill-switch banner
- M9 — cross-reference

---

## 12. Decision phrase

```
F1_SHELL_AND_NAV_BASELINE_LOCKED
NEXT: F2_DASHBOARD_LIST_SCREENS.md
```
