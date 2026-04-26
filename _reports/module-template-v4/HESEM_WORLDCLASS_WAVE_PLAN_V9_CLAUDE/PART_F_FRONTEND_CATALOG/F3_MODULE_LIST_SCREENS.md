# F3 — Module List Screens (ML)

```
surface_class:  ML
owner_role:     Per-domain lead with Frontend Lead
sources:        Information architecture per Nielsen Norman;
                ISA-95 functional hierarchy; per-pack regulator-
                expected navigation; WCAG 2.2; per F0 catalog
```

ML screens are entry points into specific modules. They sit between
the dashboard (high-level KPIs per F2) and the workspace (task-level
per F4). The user journey: F1 shell → F2 dashboard → F3 module list
→ F4 workspace → F5 record-shell.

ML never mutates. ML is read-only and provides navigation +
module-scoped filtering + module-scoped summary.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Module-level summary tiles              full task workspace (F4)
Quick links to module workspaces         record-shell (F5)
Module-level filters                       global navigation (F1)
Module-level recent activity              high-level dashboard (F2)
Module-level KPI surface                   action console (F6)
Per-pack overlay (Pharma /
 Auto / Aero / MD / Food
 module-specific entry)
Per-tenant override (CSR-driven
 navigation customization)
Auditor-portal scoped variant
Customer-portal scoped variant
```

---

## 2. Module catalog (per Part C × per pack)

```
MODULE                          ENTRY-WORKSPACES
Commercial Module List           Quote / SO / CPO / Forecast /
                                 RMA / Customer Master
Engineering Module List          Item / BOM / Routing / Spec /
                                 ECO / DFMEA / PFMEA / DHF (MD)
Planning Module List             MPS / MRP / Capacity / Schedule
                                 / APQP (Auto) / AS9145 (Aero)
Procurement Module List          PO / Supplier / IQC / SCAR /
                                 PPAP (Auto) / NADCAP (Aero) /
                                 FSVP (Food)
Inventory Module List            Lot / Bin / Stock-Move /
                                 Adjustment / Cycle Count /
                                 DSCSA (Pharma) / FSMA §204
                                 (Food) / ITAR (Aero)
Shopfloor / MES Module List      WO / Operation / Yield / SPC /
                                 EBR (Pharma) / FAI (Aero) /
                                 LPA (Auto) / HACCP (Food)
Quality / eQMS Module List        NC / CAPA / Doc / Audit /
                                 Inspection / Disposition / BREL
                                 / Vigilance (MD) / PSUR (MD) /
                                 Risk File / Stability (Pharma)
Traceability Module List          Lot Genealogy / Recall /
                                 Serial / UDI / DSCSA Trans
                                 / FSMA §204
Maintenance Module List           Asset / PM / MWO / Calibration
                                 / SLLP (Aero)
Workforce Module List             Person / Skill / Training /
                                 Schedule / Aseptic Quals (Pharma)
                                 / PCQI (Food) / ITAR PoR (Aero)
Finance Module List               Cost Center / GL / Cost Roll /
                                 COPQ
Integration Module List           Connector / Subscription /
                                 EDI / DSCSA / GUDID / EUDAMED /
                                 GIDEP / FSMA §204
Analytics / AI Module List        OEE / Quality / Throughput /
                                 Predictive / AI Feature Catalog
                                 / Override Patterns
Core / Admin Module List          Tenant / Role / Identity /
                                 Audit / Config / SRE
```

---

## 3. Per-module pattern

```
HEADER                            module name + breadcrumb +
                                  per-module quick-search
SUMMARY TILES                      module-level KPIs:
                                  - "today's open NCs" (Quality)
                                  - "this week's IQCs" (Procurement)
                                  - "tomorrow's PMs" (Maintenance)
                                  - "this month's APR sections"
                                    (Pharma)
                                  - "scheduled FAIs" (Aero)
                                  - "due PPAP submissions" (Auto)
                                  - "overdue training" (Workforce)
                                  bind to E5 dashboard data product
QUICK LINKS                        primary action + secondary
                                  workspace links (per role)
                                  e.g., "Open Inspection workspace"
                                        "Create new SO" (where role
                                         permits)
MODULE-LEVEL FILTERS               per-module attribute (per facility,
                                  per shift, per pack, per region)
RECENT ACTIVITY FEED                module-level events (latest N
                                  per E5 + E6 history); per
                                  freshness state
PER-PACK BANNER                      pack-scoped banner where
                                  relevant (e.g., "DSCSA partner
                                  exchange healthy")
ALERTS                                module-level alerts (per I3
                                  SEV; per regulator-window per
                                  H1 §3)
QUICK-INVOKE AI ADVISORY              per L2 feature applicable to
                                  module (advisory only;
                                  per L1)
```

---

## 4. Per-pack overlays

```
PHARMA (J1)                      Pharma Quality Module: APR /
                                 Stability / Deviation / DSCSA
                                 entries; sterile-line banner
AUTO (J2)                        APQP project tracker;
                                 PPAP submission status;
                                 per-OEM scorecard mirror tiles
AERO (J3)                        AS9102 FAI dashboard;
                                 NADCAP cycle calendar;
                                 GIDEP submission tracker;
                                 service-life-limited summary
MD (J4)                          DHF + DHR module list;
                                 vigilance trend tile;
                                 PSUR cycle countdown
FOOD (J5)                        HACCP plan + CCP monitoring;
                                 §204 traceability viewer entry;
                                 mock-recall tracker
```

---

## 5. Backend bindings (per F9)

```
E5 dashboard data product           summary tiles + recent activity
E5 workspace projection             (preview into workspaces)
E2 authority decision               which workspace links to enable
                                  per role
E10 notification inbox              alerts integration
E9 AI advisory                       per-module AI advisory chip
                                  (advisory-only; per L1)
```

No mutation; no E3 calls from ML.

---

## 6. Per-role view

```
OPERATOR                         simplified module view; only
                                 task-actionable items
SUPERVISOR                        team scope; alerts +
                                 escalations
QUALITY MANAGER                    full quality module + audit
                                 module
DOMAIN LEAD                        all per-domain modules
COMPLIANCE LEAD                    audit pack module + freshness
                                 alerts
QP / PRRC                          batch release + signoff queue
TENANT ADMIN                        admin module + config + cost
AUDITOR / INSPECTOR                  scoped per H3 §7;
                                 limited modules
CUSTOMER (DPO + Quality)             per CVLP delivery (per H2 §14)
```

---

## 7. Cross-cutting concerns

```
A11Y (per F11)                    semantic landmarks; skip links;
                                 per WCAG 2.2 AA
I18N (per F12)                     per locale; RTL where applic;
                                 per regulator-required language
                                 (Pharma + MD)
DESIGN TOKENS (per F10)            no hardcoded colors / sizes
TENANT BOUNDARY                       per B6 C5
DATA RESIDENCY                        per region pinning
PII REDACTION                          per role
PERFORMANCE                              p95 < 300ms render
                                 (per SLO-7 + SLO-5)
DEPRECATION                              module retirement is H7
                                 Class A (regulated impact)
                                 with 6-mo deprecation
```

---

## 8. Wave target

```
W1        baseline ML for HMV4 18 roots;
          per-role view
W3        full per-domain ML across Part C
W5        per-pack overlay (J1..J5 starting Pharma + MD)
W7        AI advisory chip integration
W8        SOC 2 + DORA Elite
W10       per-pack GA across J1..J5
W12       sovereign region variants
```

---

## 9. Failure modes

```
FM1   Module-level KPI tile shows stale data
      Behavior: per SLO-5 freshness banner;
              user warned "stale"
      Recovery: per E5 cache invalidation;
              per I3 if persistent

FM2   Cross-tenant module data leak
      Behavior: SEV-1 (rare; per B6 C5)
      Recovery: H8 systemic CAPA

FM3   Module not enabled for tenant (pack toggle off)
      Behavior: empty state with explanation;
              "ask tenant admin"
      Recovery: per I8 + H7

FM4   Role can see module but no workspaces (no entry-permission)
      Behavior: empty workspace links;
              "no actions available for your role"
      Recovery: per E2 authority configuration

FM5   AI advisory chip surfaces banned-decision suggestion
      Behavior: per L1 §10; clear human-only path
      Recovery: per L1 §4 triple defense

FM6   Pack-banner shows incorrect pack status
      Behavior: per E5 freshness; per H6 review
      Recovery: per H8 if pattern
```

---

## 10. Cross-references

- F0 — pattern catalog
- F1 — shell + global nav
- F2 — high-level dashboard (parent)
- F4 + F5 — workspace + record-shell (children)
- F6 — action console (per-module live entry)
- F7 — drawers (detail / help)
- F9 — frontend↔backend binding
- F10 — design tokens
- F11 — accessibility
- F12 — i18n
- E5 — dashboard data product binding
- E2 — authority for link enablement
- E10 — alerts
- E9 — AI advisory chip
- H1 §3 — regulator-window banner
- L1 §10 — AI communication discipline
- M5 — SLO-5 + SLO-7
- M9 — cross-reference

---

## 11. Decision phrase

```
F3_MODULE_LIST_SCREENS_BASELINE_LOCKED
NEXT: F4_WORKSPACE_PROJECTIONS.md
```
