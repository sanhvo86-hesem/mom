# F2 — Dashboard List Screens (DL)

```
surface_class:  DL
owner_role:     Per-domain lead with Frontend Lead
sources:        Per F0 catalog; per E5 §2.3 dashboard data products;
                ISA-101 HMI design (operator-effective dashboards);
                WCAG 2.2; per F11 + F12; per F10 design tokens
```

DLs are high-level summary surfaces aggregating information across
many records, surfacing trends + anomalies, and providing entry to
deeper investigation. They never mutate. Every regulated-tenant
dashboard binds to a data product (per E5 §2.3) with declared
freshness SLO.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
KPI tile aggregation                    workspace task (F4)
Trend chart                              record content (F5)
Anomaly list                              authoritative read (E4)
Quick filter                              mutation (F4 / F5 → E3)
Drill-into entry                          live action (F6 console)
Per-period date selector
Per-tenant + per-pack overlay
Auditor + customer scoped DL
Per-region routing
AI advisory chip per dashboard
Real-time tile (per E5 §2.4 stream)
Per-role view
```

---

## 2. Dashboard catalog

```
DL-01  HOME DASHBOARD                         home post-login;
                                              quick links per role
DL-02  QUALITY TREND DASHBOARD                 FPY (First-Pass-Yield),
                                              COPQ, CAPA, complaint
                                              trends; per H8 metrics
DL-03  OEE DASHBOARD                           Availability × Performance
                                              × Quality per shift × per
                                              workcell (per ISA-95)
DL-04  ANDON TOWER                              live floor alerts
                                              (per F6 AC integration)
DL-05  SCHEDULE ATTAINMENT                     production schedule vs
                                              actual; per D3
DL-06  SUPPLIER QUALITY DASHBOARD              supplier scorecards
                                              per C4; SCAR cycle time
                                              (per H8)
DL-07  CUSTOMER 360 DASHBOARD                   per customer aggregate
                                              (per K + I8)
DL-08  GENEALOGY DASHBOARD                      lot trace forward + back
                                              (per D11 + per pack)
DL-09  INVENTORY DASHBOARD                       quarantine + aging +
                                              turnover (per C5)
DL-10  MAINTENANCE DASHBOARD                     asset status + MTBF +
                                              MTTR (per D9)
DL-11  TRAINING COMPLIANCE DASHBOARD             workforce eligibility
                                              (per D8)
DL-12  COST OF QUALITY DASHBOARD                  COPQ trend (per C11)
DL-13  AUDIT COMPLIANCE DASHBOARD                 audit findings + SLO
                                              compliance (per H3)
DL-14  AI ACCEPTANCE-RATE DASHBOARD              AI feature governance
                                              (per L2 §6 + L3 §4 +
                                              L4 §5)
DL-15  PER-TENANT HEALTH DASHBOARD              SRE + SLO + cost (per
                                              I2 + I6); customer-facing
                                              attestation
DL-16  COMPLIANCE DASHBOARD                       regulator readiness
                                              signals (per H1 §3
                                              upcoming windows;
                                              per H6 cycle adherence;
                                              per H2 freshness)
DL-17  CYBER POSTURE DASHBOARD                   per I7;
                                              KEV / vuln SLA;
                                              SBOM currency
DL-18  PRIVACY POSTURE DASHBOARD                  per I7 §9;
                                              ROPA / DPIA / DSAR rate
DL-19  PER-PACK DASHBOARD                          pack-specific summary
                                              (per J1..J5)
DL-20  RECALL DASHBOARD                            recall in-flight,
                                              effectiveness, post-
                                              mortem (per D12)
```

---

## 3. Per-dashboard pattern

```
HEADER                            dashboard name + period selector
                                  + per-role view selector
KPI TILES                          clickable; drill into detail;
                                  per-tile freshness indicator
                                  (per E5 §2.10)
TREND CHARTS                        time-series with hover detail;
                                  data-table fallback for screen
                                  readers (per F11);
                                  color-blind safe palette
ANOMALY LIST                         per AI advisory (per L2);
                                  per H6 cycle alerts;
                                  per per-domain anomaly detection
QUICK FILTERS                         per dashboard; per role;
                                  per pack
AUTO-REFRESH                            per data product freshness
                                  (per E5 §2.3)
EXPORT                                  CSV / PDF (per E11 + E12)
                                  for analytics + audit
PRINT                                    audit-ready view (per E8
                                  audit pack contributor)
```

---

## 4. Backend bindings (per F9)

```
DASHBOARD DATA PRODUCT          E5 §2.3
WORKSPACE PROJECTION             E5 §2.1 (drill-into)
RECORD READ                       E4
AUDIT QUERY                        E6
FRESHNESS                            E5 §2.10 HEAD
AI ADVISORY                         E9
NOTIFICATION                          E10 (anomaly alerts)
LIVE STREAM                            E5 §2.4 + AsyncAPI
```

No mutation; no E3 calls.

---

## 5. Per-pack overlays

```
PHARMA (J1)                      APR cycle dashboard;
                                 stability OOS / OOT trend;
                                 deviation cycle time;
                                 EM excursion (sterile);
                                 DSCSA partner exchange health
AUTO (J2)                        PPAP first-time approval rate;
                                 LPA cycle compliance;
                                 per-OEM scorecard mirror
AERO (J3)                        AS9102 FAI cycle;
                                 NADCAP cycle compliance;
                                 counterfeit incident trend
                                 (target zero);
                                 service-life-limited compliance
MD (J4)                          vigilance trend;
                                 PSUR cycle adherence;
                                 cyber posture per device;
                                 PMS / PMCF data sufficiency
FOOD (J5)                        HACCP CCP compliance rate;
                                 §204 KDE completeness;
                                 EMP excursion;
                                 mock-recall trace time
```

---

## 6. Per-portal variants

```
INTERNAL                          full DL set per role
AUDITOR                           scoped (per H3 §7);
                                  read-only;
                                  no live stream
INSPECTOR (regulator)              per pack pre-cleared metrics
CUSTOMER (DPO + Quality)           per CVLP (per H2 §14);
                                  per-tenant health subset
EDGE GATEWAY                        operator dashboard subset
                                  (Andon focus)
```

---

## 7. Cross-cutting concerns

```
A11Y (per F11)                    chart data-table fallback;
                                 keyboard-navigable data points;
                                 reduced motion respected
I18N (per F12)                     localized number / date format;
                                 per-locale chart labels
DESIGN TOKENS (per F10)            no hardcoded colors / sizes;
                                 dark mode + density variants
TENANT BOUNDARY                       per B6 C5
DATA RESIDENCY                        per region pinning
PII REDACTION                          per role
PERFORMANCE                              p95 < 300ms render
                                  (per SLO-7)
DEPRECATION                              dashboard retirement is
                                  H7 Class B+
OBSERVABILITY                              dashboard render tracked
                                  per OTel
```

---

## 8. Wave target

```
W3        DL-01 home; DL-04 Andon Tower; DL-05 Schedule
          (early MES + dispatch)
W6        DL-02 Quality Trend; DL-03 OEE;
          DL-06 Supplier Quality;
          DL-09 Inventory;
          DL-10 Maintenance;
          DL-11 Training Compliance
W6.5      DL-14 AI Acceptance-Rate
W7        DL-07 Customer 360;
          DL-08 Genealogy;
          DL-12 Cost of Quality;
          DL-13 Audit Compliance
W8        DL-15 Per-tenant Health;
          DL-16 Compliance;
          DL-17 Cyber posture;
          DL-18 Privacy posture
W10       DL-19 Per-pack;
          DL-20 Recall (per pack)
W12       sovereign region variants
```

---

## 9. Failure modes

```
FM1   Dashboard data product freshness stale
      Behavior: per E5 §2.10 HEAD freshness;
              banner shows stale state
      Recovery: per E5 §6 / per RB-INC-001

FM2   Cross-tenant tile data leak
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic

FM3   AI anomaly chip suggests banned-decision
      Behavior: per L1 §10 advisory only;
              human-only path clear
      Recovery: per L1 §4 triple defense

FM4   Cardinality blow-up in tile filter
      Behavior: per E5 + I2 §5;
              throttle + alert
      Recovery: tile filter scope review

FM5   Hardcoded color / spacing (Graphics Authority bypass)
      Recovery: per F10 + ADR-0009;
              CI lint;
              re-tokenize

FM6   Chart un-readable to screen-reader
      Recovery: per F11 mandatory data-table
              fallback

FM7   Per-tenant dashboard shows inappropriate data per
      role
      Recovery: per F9 binding + E2 authority

FM8   Time-series dashboard slow on large period
      Recovery: per E13 LRO for export;
              UI defaults to recent period
```

---

## 10. Cross-references

- F0 — pattern catalog
- F1 — shell
- F3 — module list
- F4..F8 — drill-into surfaces
- F9 — frontend↔backend binding
- F10 + F11 + F12 — design + a11y + i18n
- E5 — dashboard data product binding
- E9 — AI advisory chip
- E10 — anomaly notifications
- H3 §7 — auditor portal scoped DL
- H6 — periodic review consumes DL
- L2 §6 — AI KPIs
- M5 — SLO-5 + SLO-7
- M9 — cross-reference

---

## 11. Decision phrase

```
F2_DASHBOARD_LIST_SCREENS_BASELINE_LOCKED
NEXT: F3_MODULE_LIST_SCREENS.md
```
