# G11 — Wave W7: Digital Thread / Genealogy / Release

```
wave_id:        W7
wave_name:      Digital Thread / Genealogy / Release
predecessor:    W6.5
successor:      W8
calendar:       6-8 weeks
team_size:      8-9 FTE
investment:     ~$700K
```

---

## 1. Goal

Connect lot, serial, inspection, NC, CAPA, MRB, release into a
single release packet. End-to-end traceability operational. BREL
releases on real lots with full evidence chain. Recall workflow
genealogy-driven. Audit pack export operational.

---

## 2. Entry criteria

```
[ ] W6.5 READY (AI advisory live)
[ ] Audit chain anchor + OTG axioms verified
[ ] Lot + serial roots at L4
```

---

## 3. Exit criteria

```
[ ] Lot Genealogy Edge population live (created at OPER
    completion; per D11 + per C8)
[ ] mv_otg_genealogy_upstream populated; depth-20 query
    within budget
[ ] BREL workflow operational (with two-person e-sig for
    regulated; per L1 BD-1)
[ ] Release Packet generator operational + signed bundle
[ ] Recall workflow with OTG-driven scope (per D12)
[ ] Customer complaint workflow at L4
[ ] Audit pack export at L4 (per H3 §4)
[ ] DSCSA event publication for Pharma pilot
[ ] AI advisory mainstream features:
    AI-04, AI-05, AI-06, AI-07, AI-08, AI-09, AI-10
[ ] Webhook subscription management at L5 (per E15.1)
```

---

## 4. Work packages

```
WP-W7-01 Lot Genealogy Edge automatic creation
WP-W7-02 mv_otg_genealogy_upstream materialized view
WP-W7-03 BREL workflow with full evidence chain check
          (per H4 §3 composition + L1 BD-1)
WP-W7-04 Release Packet generator + signed bundle
WP-W7-05 Recall workflow with genealogy-driven scope
WP-W7-06 Complaint workflow (intake, classification,
          reportability eval)
WP-W7-07 Audit Pack Export Job (LRO; per E13;
          24h SLA per SLO-15)
WP-W7-08 DSCSA event exchange (Pharma pilot)
WP-W7-09 ICH E2B(R3) ICSR submission framework
          (Pharma pre-W10)
WP-W7-10 Webhook subscription mgmt (E15.1)
WP-W7-11 RAG SOP search (AI-06; per L2)
WP-W7-12 Generative drafting (AI-07; per L2)
WP-W7-13 Document text extraction (AI-08; per L2)
WP-W7-14 Anomaly detection (AI-09; per L2)
WP-W7-15 Demand forecast (AI-10; per L2)
WP-W7-16 Predictive maintenance (AI-04; per L2)
WP-W7-17 Complaint NLP classification (AI-05; per L2)
```

---

## 5. Quality gates

```
G-W7-1   Audit chain anchor verification + OTG axioms
G-W7-2   AI advisory shadow-mode evidence per feature
G-W7-3   AI red-team probe delta per L4
G-W7-4   Release-packet signed bundle test
G-W7-5   Recall scope identification verified
G-W7-6   DSCSA pilot exchange evidence
```

---

## 6. Evidence emitted

```
- BREL release evidence chain (EC-19 batch_release + EC-2)
- Release Packet signed bundle
- Recall scope identification per genealogy
- AI feature shadow-mode evidence (per L3 S5)
- DSCSA pilot transaction evidence (EC-37)
- Audit pack export pilot
```

---

## 7. KPIs

```
- BREL release p95 < 2s (full evidence chain check)
- Genealogy depth-20 query < 1s
- Recall scope identification < 4h (mock-recall)
- Audit pack export p95 < 24h (per SLO-15)
- DSCSA partner exchange success rate
- Per-AI-feature acceptance rate (target band)
- Per-AI-feature override rate
```

---

## 8. Dependencies

```
PRE                              W6.5 READY (AI baseline)
POST                             W8 (SOC 2 / DORA Elite);
                                W10 (per-pack GA)
```

---

## 9. Risks

```
R-W7-01 Genealogy edge gap (regulated lot)
        Mitigation: per D11 §10 FM11; H8 systemic
R-W7-02 BREL cannot release due to chain incomplete
        Mitigation: per H4 §3 composition; per UI banner
R-W7-03 Recall scope mis-identification
        Mitigation: per D12 + mock-recall drill
R-W7-04 DSCSA partner protocol mismatch
        Mitigation: per E15 §2.9; per partner integration
R-W7-05 AI-21 (APR drafting; pre-W11) regression
        Mitigation: per L4 red-team
R-W7-06 RAG citation broken (per L2 §3)
        Mitigation: per L2 §3 + per L4 LLM01-02 probe
R-W7-07 Cost envelope breach (more AI features live)
        Mitigation: per L2 §9 + I6
```

---

## 10. Per-pack overlay

```
PHARMA J1                        DSCSA pilot exchange;
                                 ICSR framework;
                                 BREL with QP signoff scaffold
AUTO J2                          PPAP signoff scaffold (W10
                                 GA);
                                 8D investigation flow live
AERO J3                          AS9100D §8.7 nonconforming
                                 product flow;
                                 service-life-limited
                                 traceability
MD J4                            DHF + DHR genealogy;
                                 vigilance reportability scaffold
                                 (W10 GA)
FOOD J5                          §204 KDE/CTE pilot;
                                 mock-recall per FSMA
```

---

## 11. Decision phrases

```
W7_DIGITAL_THREAD_RELEASE_READY
W7_DIGITAL_THREAD_RELEASE_PASS_WITH_WARNINGS
W7_DIGITAL_THREAD_RELEASE_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- C8 (traceability) — primary
- D10 + D11 + D12 — workflows
- E5 + E8 + E13 — APIs
- H3 §4 — audit pack
- H4 §3 — composition
- L1 + L2 + L3 + L4 — AI features
- M5 — SLO-15

---

## 13. Decision phrase

```
G11_WAVE_W7_BASELINE_LOCKED
NEXT: G12_WAVE_W8.md
```
