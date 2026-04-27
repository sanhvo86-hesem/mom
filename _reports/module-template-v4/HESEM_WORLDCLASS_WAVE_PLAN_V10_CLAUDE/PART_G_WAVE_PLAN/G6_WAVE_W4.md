# G6 — Wave W4: Live Read-Only API Graduation

```
wave_id:        W4
wave_name:      Live Read-Only API Graduation
predecessor:    W3
successor:      W4.5
calendar:       6-8 weeks
team_size:      8-12 FTE
investment:     ~$600K
```

---

## 1. Goal

Graduate selected W1-W3 slices from L3 (current-portal-safe E2E)
to L4 (opt-in live read-only API). Per-slice graduation per ADR-0005
+ V3 RULE-1 (never bulk graduation). Live read paths emerge with
freshness SLO + spec governance.

---

## 2. Entry criteria

```
[ ] W3 READY (eQMS + Workforce + Maintenance core)
[ ] OpenAPI 3.1.1 contract framework operational
[ ] Per-tenant feature flag system live (E14 §2.3)
[ ] CDC outbound substrate ready (per B8)
```

---

## 3. Exit criteria

```
[ ] ≥ 60% of W1+W2+W3 in-scope slices graduated to L4
[ ] Cross-browser baseline GREEN (chromium + firefox + webkit
    tri-required from W4 onwards)
[ ] No silent-fallback violations (per H1 §4 invariants)
[ ] All graduated slices have OpenAPI 3.1.1 spec authored
[ ] Per-slice graduation tracker maintained
[ ] Per-route SLO declared per route at L4 (per I2 §8)
[ ] Contract-drift detection active (per I1 W2 + W4 gate)
[ ] Per-tenant live-API flag default false
```

---

## 4. Work packages (per-slice graduation pattern)

```
PER SLICE:
WP-1  Author OpenAPI 3.1.1 spec at
       mom/contracts/openapi/<domain>/<root>.openapi.yaml
WP-2  Author live-fixture adapter (per ADR-0004 fixture-only
       discipline; live mode adapter respects tenant region)
WP-3  Author graduation ADR
WP-4  User approval phrase: "Proceed with <slice> Stage 2
       live-API graduation"
WP-5  Update Authority Ledger entry → maturity_level=4
WP-6  Activate per-tenant feature flag HMV4_LIVE_API_<ROOT>
       (default false)
WP-7  Verify performance budget (per route p95 per E0 default)
WP-8  Verify failure mode (RFC 9457 problem detail; no silent
       fallback)
WP-9  Per-pack overlay verified (where applic)

TARGETS for L4 in W4:
  NQCASE, CAPA, CDOC, TRAIN_RECORD, INSP
  ITEM, IREV, BOM (master data already L4 from W2)
  QUOTATION, SO (commercial)
  PO, RECEIPT (procurement)
  DISPATCH (existing HMV4 baseline)
  MWO, CALIBRATION (maintenance)
```

---

## 5. Quality gates (per I1 W4)

```
G-W4-1  Contract drift detection (OpenAPI parity)
G-W4-2  Tri-browser smoke baseline
G-W4-3  Per-route SLO declared at promotion
G-W4-4  RFC 9457 problem detail per route
G-W4-5  No silent-fallback (no auto-degraded behavior
        without explicit problem detail)
G-W4-6  Per-tenant flag default-off verified
G-W4-7  Subscription substrate (E15 §2.1) operational
G-W4-8  CDC consumer lag < 60s (SLO-13)
```

---

## 6. Evidence emitted

```
- Per-slice OpenAPI spec (EC-10 doc + EC-22)
- Per-slice live-mode validation (EC-1)
- Per-route SLO baseline (EC-3 telemetry)
- Per-tenant flag toggle event (EC-16)
- Graduation ADR signed (EC-2)
- Contract-drift detection daily run (EC-22)
```

---

## 7. KPIs

```
- ≥ 60% slice graduation rate (W1-W3 in scope)
- Per-route SLO compliance (all green at promotion)
- Contract-drift count = 0 (per SLO-21)
- Per-tenant flag respect (target 100%)
- Cross-browser pass rate (target 100%)
- Live-API error rate < 0.5% during initial ramp
- DORA: per-slice graduation cadence
```

---

## 8. Dependencies

```
PRE                              W3 READY;
                                OpenAPI framework operational
POST                             W4.5 (OTG cutover);
                                W5 (mutation per ADR-0005);
                                W6 (MES cutover);
                                W7 (AI shadow)
```

---

## 9. Risks

```
R-W4-01 Spec drift between OpenAPI spec + actual code
        Mitigation: contract-drift detection per gate G-W4-1
R-W4-02 Per-tenant flag flip mistakenly enables live mode
        Mitigation: per ADR-0001 + I8 governance + audit
R-W4-03 Cross-browser regression (esp. WebKit)
        Mitigation: tri-browser baseline mandatory; per-PR
        gate
R-W4-04 Per-route SLO not measurable at promotion
        Mitigation: per I2 §8 + SLO promotion discipline;
        no SLO no graduation
R-W4-05 Live-fixture adapter leaks fixture data to live
        Mitigation: per ADR-0004 fixture-only test; CI
        check that fixtures-file never loaded in live mode
R-W4-06 OpenAPI spec governance overhead delays slices
        Mitigation: per-slice template; per E0 conventions
R-W4-07 Per-tenant region pinning not honored at live
        Mitigation: per B6 C5 double-defense;
        per region routing test
```

---

## 10. Per-pack overlay

```
PHARMA J1                        Pharma slices L4 read-only
                                 (deviation; cleaning val cycle
                                 read; APR data product preview)
AUTO J2                          PPAP submission read; LPA cycle
                                 read
AERO J3                          FAI characteristic read; NADCAP
                                 cert read
MD J4                            DHF read; vigilance trend read
FOOD J5                          HACCP plan read; CCP monitoring
                                 read
```

---

## 11. Decision phrases

```
W4_LIVE_READ_ONLY_READY
W4_PARTIAL_NEEDS_CONTINUATION
W4_LIVE_READ_ONLY_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- ADR-0001 / ADR-0004 / ADR-0005 — frozen postures
- E0 — API conventions
- E5 — workspace projection
- E15 §2.1 — subscription
- I1 §2 — wave gates
- I2 §8 — per-route SLO discipline
- M3 — root catalog
- M5 — SLO directory

---

## 13. Decision phrase

```
G6_WAVE_W4_BASELINE_LOCKED
NEXT: G7_WAVE_W4_5.md
```
