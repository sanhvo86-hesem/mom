# G12 — Wave W8: Analytics + Improvement + Reliability

```
wave_id:        W8
wave_name:      Analytics + Improvement + Reliability
predecessor:    W7
successor:      W9
calendar:       6-12 weeks
team_size:      10 FTE
investment:     ~$900K
```

---

## 1. Goal

Build analytics depth + lakehouse + observability maturity + DORA
Elite tier + SOC 2 evidence collection + annual pen-test + bug
bounty launch. This wave delivers reliability + insight.

---

## 2. Entry criteria

```
[ ] W7 READY (digital thread + release packet)
[ ] CDC outbound stable; SLO-13 < 60s
[ ] First AI features in advisory mode (W6.5 + W7)
```

---

## 3. Exit criteria

```
[ ] CDC pipeline production-grade with SLO compliance
[ ] Lakehouse operational (Postgres+columnar / ClickHouse)
[ ] dbt project with 6 core data products (per C13)
[ ] DORA Elite tier on ≥ 60% of services (per K5 §11)
[ ] OEE + Quality + Throughput dashboards operational
[ ] Predictive maintenance ML (AI-04) at production
[ ] Complaint NLP (AI-05) at production
[ ] SOC 2 Type II evidence collection automated
[ ] Annual 3rd-party pen-test conducted (per I7 §8)
[ ] Bug bounty program launched (per I7 §8)
[ ] Per-tenant cost attribution + throttling (per I6)
[ ] Backup verification quarterly drill (per I4 §4)
[ ] Per-tenant cost SLO active (SLO-18)
[ ] DR drill quarterly cadence active (SLO-17)
[ ] CMMC self-assessment (Aero defense readiness)
```

---

## 4. Work packages

```
WP-W8-01 Lakehouse provisioning (Postgres+columnar /
          ClickHouse)
WP-W8-02 dbt project with 6 core data products
WP-W8-03 OEE / Quality / Throughput Analytics dashboards
WP-W8-04 Predictive Maintenance (AI-04) production
WP-W8-05 Complaint NLP (AI-05) production
WP-W8-06 DORA metrics dashboard (per K5 §11)
WP-W8-07 SOC 2 Type II evidence collection automation
WP-W8-08 Annual 3rd-party pen-test
WP-W8-09 Bug bounty program (HackerOne / Bugcrowd)
WP-W8-10 Per-tenant cost attribution + throttling (per I6)
WP-W8-11 Synthetic monitoring for golden user journeys
WP-W8-12 Backup verification quarterly drill (per I4)
WP-W8-13 SBOM signing + provenance verification (per I7 §7)
WP-W8-14 CMMC self-assessment (Aero defense readiness)
WP-W8-15 ITAR / CMMC hardware-token enforcement (per E7)
WP-W8-16 PQC migration planning (per I7 §4)
```

---

## 5. Quality gates

```
G-W8-1   DORA Elite metrics achieved (per K5 §11)
G-W8-2   SOC 2 evidence emit per H4
G-W8-3   DR drill quarterly + green
G-W8-4   CMMC self-assessment readiness
G-W8-5   Pen-test critical findings closed
G-W8-6   SBOM signing + provenance verified at admission
G-W8-7   Per-tenant cost SLO compliance (SLO-18)
```

---

## 6. Evidence emitted

```
- Pen-test report (EC-27)
- SOC 2 Type II evidence (EC-22 + audit pack)
- DR drill (EC-26) per quarter
- DORA metrics baseline (per K5 §11)
- Cost attribution per tenant (per I6)
- AI feature deployment per L3 (EC-23 model card)
- CMMC self-assessment (Aero defense)
- ITAR boundary verification
- PQC migration plan
```

---

## 7. KPIs

```
- DORA Elite per K5 §11 metrics
- Per-tenant cost compliance (per SLO-18)
- DR RPO actual ≤ 1h; RTO actual ≤ 4h
- Vuln patch SLA per severity (per SLO-19)
- Pen-test critical findings closed within 7d
- SBOM provenance verification rate
- AI cost envelope adherence (per L2 §9)
- CMMC Level 2 readiness
```

---

## 8. Dependencies

```
PRE                              W7 READY
POST                             W9 (customer onboarding scale);
                                W10 (vertical pack GA);
                                W12 (ISO certs)
```

---

## 9. Risks

```
R-W8-01 DORA Elite not achieved
        Mitigation: per K5 §11; per-team burndown
R-W8-02 SOC 2 audit fail
        Mitigation: continuous evidence collection;
        pre-audit gap review per H3
R-W8-03 DR drill fails (2 consecutive)
        Mitigation: STOP-5 program halt per CS-A
R-W8-04 Pen-test reveals critical (KEV-listed) vuln
        Mitigation: per I7 §6; SLA enforcement
R-W8-05 Bug bounty volume overwhelms
        Mitigation: per scope tightening; per K3 partner
R-W8-06 Per-tenant cost run-away (e.g., AI feature)
        Mitigation: per I6 §3 throttling;
        per L2 §9 envelope
R-W8-07 PQC migration timeline pressure
        Mitigation: hybrid TLS adoption per I7 §4
R-W8-08 ITAR / CMMC hardware-token deployment lag
        Mitigation: per J3 §5 + I7 §3
```

---

## 10. Per-pack overlay

```
PHARMA J1                        SOC 2 + DORA Elite path; per
                                 Annex 11 §12 security alignment
AUTO J2                          per IATF cyber expectations
                                 (ISO 21434 baseline)
AERO J3                          CMMC self-assessment;
                                 ITAR / hardware-token enforcement;
                                 FIPS 140-3 path
MD J4                            FDA Premarket Cyber readiness;
                                 IEC 81001-5-1 baseline
FOOD J5                          NIS2 baseline (EU large food)
```

---

## 11. Decision phrases

```
W8_ANALYTICS_RELIABILITY_READY
W8_ANALYTICS_RELIABILITY_PASS_WITH_WARNINGS
W8_ANALYTICS_RELIABILITY_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- C13 — analytics + AI domain
- I1 §10 — DORA Elite targets
- I4 — DR + backup
- I6 — cost governance
- I7 — security operations + pen-test
- L2 §9 — AI cost envelope
- M5 — SLO-17, SLO-18, SLO-19

---

## 13. Decision phrase

```
G12_WAVE_W8_BASELINE_LOCKED
NEXT: G13_WAVE_W9.md
```
