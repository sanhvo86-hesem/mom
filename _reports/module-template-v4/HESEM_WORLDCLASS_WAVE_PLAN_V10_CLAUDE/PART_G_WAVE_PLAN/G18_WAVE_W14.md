# G18 — Wave W14: Continuous Improvement Operating Loop

```
wave_id:        W14
wave_name:      Continuous Improvement Operating Loop
predecessor:    W13
successor:      ongoing (W14 never closes; rotating cycle)
calendar:       ongoing (per cycle: monthly / quarterly / annual)
team_size:      10-12 FTE steady-state + cross-functional
investment:     ongoing (per cycle)
```

---

## 1. Goal

Institutionalize learning + improvement post-RC. W14 never PASSes;
produces continuous reports per cycle. Platform from W14 onward
improves through documented retrospective + ROI + architecture
review + standards absorption.

---

## 2. Entry criteria

```
[ ] W13 READY (multi-region + sovereign)
[ ] CS-A + CS-B continuously operational
[ ] Customer base ≥ 5 production tenants
```

---

## 3. Exit criteria (none; rotating cycle)

```
This wave does not have an "exit." It has cycles:
  - monthly DORA metrics review (per K5 §11)
  - monthly cost optimization (per I6 §8)
  - monthly customer health scorecard (per K5 §8)
  - quarterly retrospective per stream
  - quarterly NPS / CSAT survey
  - quarterly threat-model refresh (per I7 §1)
  - quarterly red-team posture (per L4)
  - quarterly DR drill (per I4 §2)
  - quarterly game days (per I3 §7)
  - annual platform architecture review (per H6)
  - annual standards-update absorption (per H1 §6)
  - annual penetration test (per I7 §8)
  - annual SOC 2 / ISO 27001 / ISO 13485 surveillance
    (per H3)
  - annual NADCAP cycle (Aero)
  - annual MD class III implant retention attestation
    (per H5)
```

Per cycle: rotating decision phrase per quarter.

---

## 4. Work packages (ongoing)

```
WP-W14-01 Quarterly retrospective per stream (Skelton-Pais
          per K5 §2)
WP-W14-02 Monthly DORA metrics review (per K5 §11)
WP-W14-03 Monthly cost optimization (per I6 §8)
WP-W14-04 Monthly customer health scorecard (per K5 §8)
WP-W14-05 Quarterly NPS / CSAT survey
WP-W14-06 Quarterly threat-model refresh
WP-W14-07 Quarterly red-team posture (per L4)
WP-W14-08 Quarterly DR drill (per I4 §2)
WP-W14-09 Quarterly game days (per I3 §7)
WP-W14-10 Quarterly capacity review (per I5 §5)
WP-W14-11 Annual platform architecture review
WP-W14-12 Annual standards-update absorption
          (per H1 §6 horizon)
WP-W14-13 Annual penetration test (per I7 §8)
WP-W14-14 Annual cert surveillance:
          SOC 2, ISO 27001, ISO 13485, IATF 16949,
          AS9100D, ISO 9001
WP-W14-15 Annual NADCAP cycle (Aero per pack)
WP-W14-16 Annual MD Class III implant retention attestation
WP-W14-17 Customer success expansion (NRR target sustained)
WP-W14-18 New vertical pack consideration (per customer
          demand; per K2 GTM)
WP-W14-19 New AI feature consideration (per L2 catalog
          extension)
WP-W14-20 New regulator-required submission (per H1 §6)
WP-W14-21 Per-pack KPI review (per H6 + per pack)
WP-W14-22 Sub-processor security event review (per I7)
WP-W14-23 Banned-decision boundary review (per L1 §3)
WP-W14-24 Continuous staff training (per D8 + per pack)
```

---

## 5. Quality gates (continuous)

```
G-W14-1   DORA Elite sustained
G-W14-2   100% SLO compliance per period
G-W14-3   Customer health score ≥ baseline
G-W14-4   No SEV-1 unresolved past 1 hr
G-W14-5   No banned-decision attempts (per SLO-22)
G-W14-6   Cert cycle compliance per cert
G-W14-7   Annual horizon scan complete (per H1 §6)
```

---

## 6. Evidence emitted (per cycle)

```
- Per-period DORA metrics
- Per-period customer health
- Per-period cost attribution
- Per-period red-team posture
- Per-period DR drill
- Per-period game day
- Per-cycle horizon scan output (per H1 §6)
- Annual cert surveillance results
- Annual pen-test report
- Annual platform architecture review minutes
- Per-pack KPI baseline
```

---

## 7. KPIs (sustained targets)

```
- DORA Elite per K5 §11 sustained
- 100% SLO compliance per cycle
- NRR (Net Revenue Retention) ≥ 110% (per K5)
- Customer NPS ≥ 50
- Per-tenant SEV-1 = 0 sustained
- Banned-decision attempts = 0 sustained
- Cert cycle compliance 100% sustained
- Per-pack regulator action exposure = minimum
- Continuous staff training completion rate
```

---

## 8. Dependencies

```
PRE                              W13 READY
POST                             ongoing; per cycle
COUPLED                           CS-A (Security continuous);
                                CS-B (Validation continuous)
```

---

## 9. Risks

```
R-W14-01 Continuous improvement slips into firefighting
         (no real systemic improvement)
         Mitigation: per H8 §8 systemic CAPA;
         per quarterly retrospective discipline
R-W14-02 Standards absorption lag (per H1 §6)
         Mitigation: per quarterly horizon scan cadence;
         dedicated Compliance Lead time
R-W14-03 Customer NRR drift (NRR < 100%)
         Mitigation: per K5 health score; per K2 GTM
R-W14-04 Cost run-away as customer base grows
         Mitigation: per I6 + I5 capacity-cost modeling
R-W14-05 Personnel attrition (R-O4 per M6)
         Mitigation: per K5 §14 retention discipline
R-W14-06 Regulator-driven new clause not absorbed
         Mitigation: per H1 §6 monthly horizon scan
```

---

## 10. Per-pack overlay

```
PHARMA J1                        APR cycle annual; PSUR (where
                                 applic) cycle; Annex 11 §11
                                 review semiannual; sterile
                                 line re-qualification
AUTO J2                          IATF cycle 3-year + annual
                                 surveillance; LPA continuous
AERO J3                          AS9100D 3-year + annual
                                 surveillance; NADCAP cycle
                                 24-month
MD J4                            ISO 13485 cycle; PSUR per
                                 device; PMS continuous; PMCF
                                 per cycle
FOOD J5                          GFSI cycle per cert (typ 12-mo);
                                 HACCP reanalysis annual + on-
                                 trigger; FSMA §204 enforcement
                                 (Jan 2026 + ongoing)
```

---

## 11. Decision phrases (rotating)

```
W14_CONTINUOUS_IMPROVEMENT_LOOP_OPERATIONAL_<YYYYQ>
   (per cycle; sustained Elite tier on DORA; NRR sustained;
    cert cycles green; banned-decision attempts = 0)
```

---

## 12. Cross-references

- All other Parts (continuous loop touches everything)
- H1 §6 — horizon scan
- H3 — annual cert surveillance
- H6 — periodic review
- I3..I8 — continuous operations
- L0..L5 — AI continuous
- K5 — customer success + team topology
- M5 — SLO directory
- M6 — risk register

---

## 13. Decision phrase

```
G18_WAVE_W14_BASELINE_LOCKED
NEXT: G19_CONTINUOUS_STREAM_SECURITY.md
```
