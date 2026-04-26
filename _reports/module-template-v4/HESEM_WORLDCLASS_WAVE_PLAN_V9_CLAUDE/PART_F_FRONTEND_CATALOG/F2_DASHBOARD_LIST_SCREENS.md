# F2 — Dashboard List Screens

```
surface_class:  DL
owner_role:     Per-domain lead (each dashboard owned by its domain)
```

---

## 1. Purpose

Dashboard List screens are the high-level summary surfaces. They aggregate
information across multiple records, show trends, surface anomalies, and
provide entry points to deeper investigation. They never mutate.

---

## 2. Inventory of dashboards

```
DL-01  Home Dashboard                    home page after login
DL-02  Quality Trend Dashboard           FPY, COPQ, CAPA, complaint trends
DL-03  OEE Dashboard                     equipment effectiveness per shift
DL-04  Andon Tower                        live floor signals
DL-05  Schedule Attainment Dashboard     production performance
DL-06  Supplier Quality Dashboard       supplier scorecards
DL-07  Customer 360 Dashboard            per-customer aggregate view
DL-08  Genealogy Dashboard               (also via lot tree workspace)
DL-09  Inventory Dashboard                quarantine, aging, turnover
DL-10  Maintenance Dashboard              equipment status, reliability
DL-11  Training Compliance Dashboard     workforce eligibility
DL-12  Cost of Quality Dashboard         financial view of quality
DL-13  Audit Compliance Dashboard       SLO compliance, audit findings
DL-14  AI Acceptance-Rate Dashboard      AI feature governance
DL-15  Per-tenant Health Dashboard       SRE / SLO / cost
DL-16  Compliance Dashboard              regulatory readiness signals
```

---

## 3. Per-dashboard pattern

Each dashboard has:
- Header with date / period selector
- KPI tiles (clickable, drill into detail)
- Trend charts
- Anomaly list (when anomalies present)
- Quick filters (status, owner, plant, time)
- Auto-refresh (per data product freshness)

---

## 4. Backend bindings

Dashboards bind to Workspace Projection APIs (E5) and to data products
(E4 read-only / E5 aggregations). Some bind to AI features (E9) for
anomaly surfacing.

---

## 5. Cross-cutting concerns

- C3 i18n: localized number, date formats
- C8 Observability: dashboard render latency tracked
- C12 Accessibility: charts have data tables for screen readers

---

## 6. Wave target

DL-01, DL-04, DL-05 by W3 (early MES + dispatch).
DL-02, DL-03, DL-06, DL-09, DL-10, DL-11 by W6.
DL-07, DL-08, DL-12, DL-13 by W7.
DL-14 by W6.5.
DL-15, DL-16 by W8.

---

## 7. Decision phrase

```
F2_DASHBOARD_LIST_SCREENS_BASELINE_LOCKED
NEXT: F3_MODULE_LIST_SCREENS.md
```
