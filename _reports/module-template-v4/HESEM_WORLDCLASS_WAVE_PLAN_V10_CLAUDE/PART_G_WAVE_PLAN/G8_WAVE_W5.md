# G8 — Wave W5: Core Transactional ERP / MOM

```
wave_id:        W5
wave_name:      Core Transactional ERP / MOM
predecessor:    W4.5
successor:      W6 (parallel with W6.5 after partial)
calendar:       8-10 weeks
team_size:      12-14 FTE (multiple parallel streams)
investment:     ~$1.0M
```

---

## 1. Goal

Stage 3 mutation graduation per ADR-0005 across core transactional
surfaces: SO, PO, JO, WO, INVTXN, SHIPMENT, INVOICE, COST. Per-
mutation ADR mandatory. Audit chain extended per mutation. Saga
compensation tested. Transition from read-only to authoritative-
write platform.

---

## 2. Entry criteria

```
[ ] W4.5 READY (OTG cutover)
[ ] Idempotency + ETag middleware operational (per W0.5)
[ ] Audit chain anchor + OTG axioms verified
[ ] E-sig flow operational
```

---

## 3. Exit criteria

```
[ ] ≥ 10 transitions at L5 with per-mutation ADR
[ ] Idempotency replay accuracy = 1.00 across all transitions
[ ] If-Match concurrency tested in production-equivalent
[ ] Saga compensation 100% PASS in chaos test (1000-trial)
[ ] Workflow commit p95 < 500ms (per SLO-3)
[ ] No silent failure modes (per H1 §4 invariants)
[ ] Banned-decision triple defense verified per regulated
    transition
[ ] Per-pack overlay readiness for vertical W10 GA
```

---

## 4. Work packages

```
WP-W5-01 SO_CONFIRM, SO_ALLOCATE, SO_CANCEL transitions at L5
WP-W5-02 PO_ISSUE, PO_ACK, PO_RECEIVE at L5
WP-W5-03 JO_RELEASE, JO_COMPLETE, JO_CANCEL at L5
WP-W5-04 WO_DISPATCH, WO_PAUSE, WO_COMPLETE at L5
WP-W5-05 INVTXN_POST, INVTXN_REVERSE at L5
WP-W5-06 Saga compensation framework operational (per B7)
WP-W5-07 Per-mutation ADR template (per V8 file 04
          carry-forward)
WP-W5-08 Per-mutation chaos test (1000-trial saga rollback)
WP-W5-09 Per-route SLO declared at promotion (per I2 §8)
WP-W5-10 Banned-decision triple defense verified per L1 §4
WP-W5-11 Per-tenant rollout per ADR-0005 ramp
WP-W5-12 Cross-domain cascade (e.g., SO release → JO release)
WP-W5-13 Inspection + Disposition cascade (D5)
WP-W5-14 NC + CAPA cascade (D6)
```

---

## 5. Quality gates

```
G-W5-1   Saga compensation chaos test passing
G-W5-2   Per-mutation ADR present per release
G-W5-3   Idempotency replay verification
G-W5-4   ETag concurrency verified
G-W5-5   Banned-decision triple defense per regulated mutation
G-W5-6   Audit chain anchor per mutation
G-W5-7   Per-route SLO declared at promotion
G-W5-8   Per-tenant rollout per ramp policy
```

---

## 6. Evidence emitted

```
- Per-mutation ADR (EC-16)
- Per-transition validation pack (EC-1)
- Saga chaos test results (EC-1)
- Audit chain extension per mutation (EC-4 + EC-8)
- Per-tenant rollout evidence (EC-22)
```

---

## 7. KPIs

```
- Workflow commit p95 < 500ms (per SLO-3)
- Idempotency replay accuracy = 1.00
- Saga compensation success rate (chaos: 100%)
- Banned-decision attempt log = 0 (per SLO-22)
- Cross-tenant breach attempts = 0 (per SLO-19)
- DORA: change failure rate < 5%
```

---

## 8. Dependencies

```
PRE                              W4.5 READY
POST                             W6 (MES); W6.5 (AI shadow);
                                W7 (AI advisory); W8 (SOC 2)
```

---

## 9. Risks

```
R-W5-01 Saga compensation incomplete on partial failure
        Mitigation: chaos test + per-saga reachability;
        per RB-INC
R-W5-02 Idempotency-key collision (different bodies same key)
        Mitigation: 422 conflict; client error;
        H8 if pattern
R-W5-03 ETag mismatch UX confusion
        Mitigation: per F4 + F5 conflict resolution
        UX
R-W5-04 Banned-decision bypass during early rollout
        Mitigation: per L1 §4; pre-deploy test
R-W5-05 Per-tenant rollout drift
        Mitigation: per H7 governance; per I8 ramp
R-W5-06 SLO degradation on first ramp
        Mitigation: per I2 burn alert; rollback
        per ramp policy
```

---

## 10. Per-pack overlay

```
PHARMA J1                        SO_CONFIRM with Pharma cold-
                                 chain validation; PO_RECEIVE
                                 with DSCSA TI/TH/TS exchange;
                                 SCAR cycle for excipient/API
AUTO J2                          PO_ACK with PSW;
                                 SO_ALLOCATE with EDI 856
                                 ASN
AERO J3                          PO_ACK with ITAR person-of-
                                 record; PO_RECEIVE with
                                 counterfeit screen
MD J4                            PO_RECEIVE with biocompatibility
                                 verification
FOOD J5                          PO_RECEIVE with FSVP verification
```

---

## 11. Decision phrases

```
W5_TRANSACTIONAL_CORE_READY
W5_TRANSACTIONAL_CORE_PASS_WITH_WARNINGS
W5_TRANSACTIONAL_CORE_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- ADR-0005 — slice cycle (mutation ramp)
- B7 — saga + state machines
- D1..D9 — workflows enabled at L5
- E3 — workflow API (now mutation)
- I1 W5 — gates
- L1 §4 — triple defense
- M5 — SLO-3, SLO-9, SLO-22

---

## 13. Decision phrase

```
G8_WAVE_W5_BASELINE_LOCKED
NEXT: G9_WAVE_W6.md
```
