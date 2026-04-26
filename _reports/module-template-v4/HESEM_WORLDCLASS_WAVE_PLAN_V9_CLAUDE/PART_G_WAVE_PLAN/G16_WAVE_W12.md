# G16 — Wave W12: Release Candidate / Scale Operating Model

```
wave_id:        W12
wave_name:      Release Candidate / Scale Operating Model
predecessor:    W11
successor:      W13
calendar:       4-8 weeks
team_size:      10 FTE
investment:     ~$700K
```

---

## 1. Goal

Establish HESEM as release-candidate-grade. Scale governance,
multi-tenant operations, partner ecosystem, support model. SOC 2
Type II + ISO 27001 cert achieved. ISO 13485 readiness for MD
pack. Ratify formal release wording per ADR-0001 evolution at
this gate.

---

## 2. Entry criteria

```
[ ] W11 READY (pilot customer)
[ ] At least one customer in pre-production successfully
[ ] CVLP + customer-side validation closed
[ ] Annual pen-test green (per I7 §8)
```

---

## 3. Exit criteria

```
[ ] ≥ 3 stable customers in pre-production operations
[ ] 100% SLO compliance over 90-day window
[ ] DORA Elite-tier sustained on 100% of services (per K5 §11)
[ ] Multi-tenancy operational (≥ 3 customers in production)
[ ] Customer + Supplier Portal applications live (per F1
    customer + supplier portal variants)
[ ] GraphQL gateway live (per E15 §2.15)
[ ] Real-time push (WebSocket / SSE) live (per E5 §2.4)
[ ] First 4 partner connectors live: Salesforce, SAP S/4
    financial, PTC Windchill, MS 365 (per E15 §2.7)
[ ] Marketplace + plugin SDK published (Apache 2.0)
[ ] Per-tenant cost SLA + throttling operational (per I6)
[ ] SOC 2 Type II audit complete (per H3)
[ ] ISO 27001 surveillance audit annual cycle (per H3)
[ ] ISO 13485 readiness for MD pack (audit-ready)
[ ] PCCP envelope active (MD AI features per L3 §6)
[ ] Customer health scorecard live (per K5 §8)
[ ] Production wording allowed at this milestone +
    customer cutover (per ADR-0001 evolution)
[ ] Sovereign region scaffolding (per I4 §5 + W13 prep)
[ ] PQC migration plan published (per I7 §4)
```

---

## 4. Work packages

```
WP-W12-01 Multi-tenancy operations + per-tenant onboarding
          playbook (per I8)
WP-W12-02 Customer Portal application (F1 variant)
WP-W12-03 Supplier Portal application (F1 variant)
WP-W12-04 GraphQL gateway (convenience layer; per E15 §2.15)
WP-W12-05 Real-time push (WebSocket / SSE; per E5 §2.4)
WP-W12-06 First 4 partner connectors:
            Salesforce; SAP S/4; PTC Windchill; MS 365
WP-W12-07 Marketplace + plugin SDK (Apache 2.0)
WP-W12-08 Per-tenant cost SLA + throttling (per I6)
WP-W12-09 Customer health scorecard (per K5 §8)
WP-W12-10 Annual customer NPS / CSAT survey
WP-W12-11 SOC 2 Type II observation closure (per H3)
WP-W12-12 ISO 27001 surveillance audit (annual)
WP-W12-13 ISO 13485 readiness for MD pack
WP-W12-14 PCCP envelope live (MD AI per L3 §6)
WP-W12-15 Sovereign region scaffolding (per I4 §5)
WP-W12-16 Public release of release notes + changelog
WP-W12-17 PQC migration plan publication
WP-W12-18 30+ AI features GA (AI-30 GenAI test case
          generator; AI-31 audit pack drafting; AI-32
          periodic-review brief; per L2)
```

---

## 5. Quality gates

```
G-W12-1   SOC 2 Type II + ISO 27001 ready
G-W12-2   ISO 13485 readiness (MD pack)
G-W12-3   100% SLO compliance over 90-day window
G-W12-4   100% DORA Elite per K5 §11
G-W12-5   Per-tenant cost SLO compliance
G-W12-6   Multi-tenancy + RLS hardened in production
G-W12-7   Customer health scorecard ≥ baseline per tier
G-W12-8   PCCP envelope governance live
```

---

## 6. Evidence emitted

```
- SOC 2 Type II report (EC-22 + audit pack)
- ISO 27001 cert + audit findings
- ISO 13485 readiness pack (MD pre-cert)
- Per-tenant SLO compliance report
- DORA Elite metrics evidence (per K5)
- Customer health scorecard baseline
- PCCP envelope evidence (MD AI features)
- PQC migration plan (EC-10)
```

---

## 7. KPIs

```
- 100% SLO compliance over 90-day window
- Customer NPS post-W12 (target ≥ 50)
- Per-tenant cost SLO ≥ 99% (per SLO-18)
- DR drill 100% pass over 90 days (per SLO-17)
- CVE patch SLA 100% (per SLO-19)
- Audit pack export ≥ 99% within 24h (per SLO-15)
- Per-AI feature acceptance rate per L2 §6
- Per-pack red-team SEV-1 = 0
- Per-tenant SEV-1 = 0
- Customer expansion / cross-sell rate
```

---

## 8. Dependencies

```
PRE                              W11 READY (pilot success)
POST                             W13 (multi-region + sovereign);
                                W14 (enterprise scale)
```

---

## 9. Risks

```
R-W12-01 SOC 2 Type II audit fail
         Mitigation: per H3 + I7;
         continuous evidence collection
R-W12-02 ISO 27001 cert lapse
         Mitigation: per H3 surveillance cycle;
         per H6 cadence
R-W12-03 ISO 13485 cert delay (MD pack)
         Mitigation: per H3 NB engagement; W13 backup
R-W12-04 Multi-tenancy regression at scale
         Mitigation: per B6 C5; integration test
         per release
R-W12-05 Per-tenant cost run-away (more customers)
         Mitigation: per I6 §3 throttling;
         per L2 §9 envelope
R-W12-06 PQC migration timeline pressure
         Mitigation: per I7 §4; hybrid TLS path
R-W12-07 Partner connector breaking change
         Mitigation: per E15 §2.7; per H7 governance
R-W12-08 Marketplace plugin security risk
         Mitigation: per I7 + L2 §8;
         per scoped DPA per plugin
R-W12-09 Production wording premature (per ADR-0001)
         Mitigation: per Compliance Lead approval;
         customer cutover gate
```

---

## 10. Per-pack overlay

```
PHARMA J1                        Annex 1 + Annex 11 + Annex 16
                                 readiness;
                                 DSCSA partner network maturity
AUTO J2                          IATF 16949 surveillance cycle;
                                 per-OEM portal compliance
AERO J3                          AS9100D surveillance cycle;
                                 NADCAP cycle compliance;
                                 CMMC Level 2 cert path
MD J4                            ISO 13485 cert-ready (W12-W13);
                                 EU MDR / IVDR NB engagement;
                                 PCCP envelope + AI live
FOOD J5                          GFSI cert (BRCGS / SQF / FSSC /
                                 IFS) cycle;
                                 FSMA §204 compliance (Jan 2026
                                 enforcement; pre-deadline live)
```

---

## 11. Decision phrases

```
W12_PRODUCTIZED_OPERATING_MODEL_READY
W12_PRODUCTIZED_OPERATING_MODEL_PASS_WITH_WARNINGS
W12_PRODUCTIZED_OPERATING_MODEL_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- ADR-0001 — wording evolution at customer cutover
- H3 — audit program (cycles)
- I4 §5 — sovereign region prep
- I7 §4 — PQC
- K5 §11 — DORA Elite
- L3 §6 — PCCP for MD AI
- M5 — full SLO directory

---

## 13. Decision phrase

```
G16_WAVE_W12_BASELINE_LOCKED
NEXT: G17_WAVE_W13.md
```
