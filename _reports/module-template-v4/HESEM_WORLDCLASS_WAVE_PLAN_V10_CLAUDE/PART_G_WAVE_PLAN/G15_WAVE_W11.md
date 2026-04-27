# G15 — Wave W11: Customer Pilot / Pre-Production Readiness

```
wave_id:        W11
wave_name:      Customer Pilot / Pre-Production Readiness
predecessor:    W10
successor:      W12
calendar:       4-8 weeks (per pilot customer; parallel pilots
                possible)
team_size:      9 FTE (CSM + impl + on-call)
investment:     ~$500K
```

---

## 1. Goal

Onboard first pilot customer through 8-phase onboarding runbook
(per I8 §1). Validate runbook with a real customer. Establish
support + on-call coverage. Customer signs pre-production cutover
(per ADR-0001 vocabulary).

---

## 2. Entry criteria

```
[ ] W10 READY (at least one pack at L7)
[ ] Per-pack regulator submission tested
[ ] Per-pack training overlay live
[ ] Pilot tenant identified per K + I8 P1
[ ] Per-tenant regulatory profile drafted (per H1 §5)
```

---

## 3. Exit criteria

```
[ ] First pilot customer onboarded through P1-P7
[ ] CVLP delivered to customer (per H2 §14)
[ ] Audit pack export tested with real customer data
    (per H3 §4)
[ ] On-call rotation operational (per I3 §2)
[ ] Customer satisfaction (CSAT) ≥ 0.85
[ ] Customer signs pre-production cutover (per ADR-0001
    vocabulary; AVOID "production go-live")
[ ] Zero SEV-1 incidents during P6 pilot period
[ ] First Quarterly Business Review (QBR) with customer
[ ] Customer-facing dashboards live (per-tenant SLA, cost,
    AI KPI; per F2 + F1 customer portal)
[ ] Customer DPO + Quality Lead access provisioned (per H3 §7)
[ ] CVLP customer-side gap analysis completed
```

---

## 4. Work packages

```
WP-W11-01 Customer onboarding runbook executed P1-P7
          (per I8 §1)
WP-W11-02 CVLP delivery + per-tenant gap analysis
          (per H2 §14)
WP-W11-03 Customer audit pack export tested
          (per H3 §4)
WP-W11-04 On-call rotation operational (per I3 §2)
WP-W11-05 Pilot operation period (P6) observation +
          per-cycle PQ
WP-W11-06 Pre-production cutover signing
          (per ADR-0001)
WP-W11-07 Customer-facing dashboards (per F2 + F1
          customer portal variant)
WP-W11-08 First QBR with customer (per I8 §5)
WP-W11-09 Customer escalation path tested
          (per I8 §8 + I3 §2)
WP-W11-10 Customer-side regulator-window calendar live
          (per H1 §3)
WP-W11-11 Customer training (per K5 + per pack)
WP-W11-12 Tenant-specific feature flag setup
          (per L2 §8 + I8)
WP-W11-13 Per-tenant kill-switch enabled
WP-W11-14 Tenant freeze-window agreement (per H3 §5)
WP-W11-15 AI feature acceptance / override review
          per pilot
WP-W11-16 Customer testimonial / case study (post-
          pilot success)
```

---

## 5. Quality gates

```
G-W11-1   Per-customer transparency artifact per release
G-W11-2   Per-tenant DPA + sub-processor list current
G-W11-3   Customer audit pack signed
G-W11-4   On-call rotation tested (game day per pilot)
G-W11-5   Per-tenant SLO compliance (per K1 tier)
G-W11-6   Customer SLA reporting live
```

---

## 6. Evidence emitted

```
- Customer onboarding evidence (P1-P7 records;
  EC-22 + EC-2 multi-sig per phase)
- CVLP delivery (EC-22)
- First customer audit pack signed
- Pre-production cutover signed (ADR-0001 vocab)
- First QBR minutes (EC-10)
- Per-tenant feature flag toggle (EC-16)
- Per-tenant kill-switch state (EC-22)
```

---

## 7. KPIs

```
- Customer onboarding within tier SLA (per SLO-22)
- CSAT post-onboarding (target ≥ 0.85)
- NPS post-onboarding
- Per-tenant SLA compliance (per K1)
- Per-tenant cost vs envelope (per SLO-18)
- Per-tenant SEV-1 incidents = 0
- Customer-side audit findings on HESEM scope = 0
- AI feature adoption per tenant per L2 §6
- Mock-recall trace time per pack (Food: ≤ 4h)
```

---

## 8. Dependencies

```
PRE                              W10 READY (vertical pack at L7)
POST                             W12 (ISO 27001 + ISO 13485 cert);
                                W13 (multi-region for global
                                customers); W14 (enterprise scale)
```

---

## 9. Risks

```
R-W11-01 Pilot customer defects from pre-production
         (regulator concerns)
         Mitigation: per ADR-0001 wording; Compliance Lead
         co-signs
R-W11-02 Customer-side validation insufficient post-CVLP
         Mitigation: per H2 §14 CVLP completeness;
         per K5 + customer support
R-W11-03 Per-tenant SLO breach during pilot
         Mitigation: per I3 incident; per K5 health score
         intervention
R-W11-04 Customer demands feature outside pack scope
         Mitigation: per H7 governance + K2 GTM scope;
         per CSR per H1 §7
R-W11-05 Cross-region data residency mis-set during
         provisioning
         Mitigation: per E14 §2.10 + B6 C5;
         per H7 Class A
R-W11-06 Customer regulator action during pilot
         (483 / NB)
         Mitigation: per H1 §3 + I3;
         CVLP supports defense
R-W11-07 Customer DPO discovers DPA gap
         Mitigation: per L2 §8 + I8 §6 + legal review
R-W11-08 Customer onboarding takes longer than tier SLA
         Mitigation: per K5 escalation; CSM intervention;
         possible tier upgrade
```

---

## 10. Per-pack overlay

```
PHARMA J1                        QP onboarding;
                                 sterile-pack pilot if Annex 1
                                 in scope
AUTO J2                          per-OEM CSR onboarding;
                                 PPAP submission readiness
                                 verified
AERO J3                          ITAR person-of-record at
                                 onboarding (US-only deployment);
                                 NADCAP-cert tenant-side prep
MD J4                            PRRC + AR + Importer registration;
                                 Class III implant 15-yr retention
                                 verified
FOOD J5                          PCQI appointment;
                                 §204 onboarding for high-risk
                                 food
```

---

## 11. Decision phrases

```
W11_PRE_PRODUCTION_READINESS_READY
W11_PRE_PRODUCTION_READINESS_PASS_WITH_WARNINGS
W11_PRE_PRODUCTION_READINESS_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- I8 §1 — onboarding 8 phases
- H2 §14 — CVLP
- H3 §4 — audit pack
- K1 — pricing tier
- K5 — customer success operating model
- L2 §8 + I8 §6 — sub-processor
- M5 — SLO-22 onboarding within tier
- ADR-0001 — pre-production wording

---

## 13. Decision phrase

```
G15_WAVE_W11_BASELINE_LOCKED
NEXT: G16_WAVE_W12.md
```
