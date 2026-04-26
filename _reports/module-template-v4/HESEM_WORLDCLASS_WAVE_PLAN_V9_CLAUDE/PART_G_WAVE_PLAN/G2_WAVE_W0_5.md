# G2 — Wave W0.5: Platform Substrate Hardening

```
wave_id:        W0.5
wave_name:      Platform Substrate Hardening
predecessor:    W0
successor:      W1
calendar:       4-6 weeks
team_size:      5-6 FTE
investment:     ~$300K (substantial; foundation)
```

---

## 1. Goal

Build the platform substrates every subsequent wave depends on:
identity + policy engine, observability stack, OTG schema, problem-
detail factory, idempotency + ETag middleware, tenant guard,
audit-chain primitives, Authority Ledger baseline, banned-decision
triple-defense scaffolding. Pure platform; no business slices.

---

## 2. Entry criteria

```
[ ] W0 PASS or PASS_WITH_WARNINGS
[ ] Forbidden file list per ADR-0004 active
[ ] Pre-production banner per ADR-0001 active
[ ] CI advisory pipeline GREEN
```

---

## 3. Exit criteria

```
[ ] Identity + policy engine baseline operational
    (Keycloak / equivalent OIDC + PolicyEngine OPA)
[ ] Observability stack ingesting traces / metrics / logs
    (OTel + Prometheus + Loki + Jaeger + Grafana)
[ ] OTG schema migrated (empty tables; integrity job runs)
[ ] Authority Ledger schema migrated; 95-root seed populated
[ ] Problem-detail registry with all type URIs (per E0)
[ ] Idempotency replay table + middleware
[ ] Tenant guard middleware with double-defense (middleware +
    RLS)
[ ] Audit chain primitives (hash chain, daily anchor cron)
[ ] L1 / decide endpoint returning deterministic decisions
    (per E2.8)
[ ] Banned-decision triple defense (CI + runtime + offline)
    scaffolded per L1 §4
[ ] No business surface affected (HMV4 prototype unchanged)
```

---

## 4. Work packages

```
WP-W0.5-01  Identity + policy engine baseline (Keycloak +
            PolicyEngine; per E1 + E2)
WP-W0.5-02  Observability stack (OTel + Prometheus + Loki +
            Jaeger + Grafana per B9 + I2)
WP-W0.5-03  OTG schema baseline (otg_node, otg_edge, otg_event;
            18 axioms verified per B6 C2)
WP-W0.5-04  Authority Ledger schema + 95-root seed (per M3 +
            B6 C1)
WP-W0.5-05  Problem-detail factory (per E0 + RFC 9457; per-route
            type-URI registry)
WP-W0.5-06  Idempotency + ETag + If-Match middleware (per E0
            + B7)
WP-W0.5-07  Tenant guard middleware + RLS double-defense (per
            B6 C5)
WP-W0.5-08  Audit chain primitives (hash chain + daily merkle
            anchor; per B6 C1)
WP-W0.5-09  Forbidden diff scanner ratification (per ADR-0004)
WP-W0.5-10  Inert flag registry ratification (per HMV4 v4
            fixture discipline)
WP-W0.5-11  Graphics Authority no-hardcode CI gate (per ADR-0009)
WP-W0.5-12  L1 banned-decision triple defense scaffolded
            (CI test + runtime middleware + offline integrity
            job; per L1 §4)
WP-W0.5-13  E1.7 /can endpoint baseline
WP-W0.5-14  Initial telemetry per route (latency + error +
            rate)
WP-W0.5-15  E14 admin baseline (tenant provision + SRE health;
            per E14)
```

---

## 5. Quality gates (per I1 W0.5 cumulative)

```
G-W0.5-1  OWASP ASVS L2 baseline established
G-W0.5-2  SBOM emit per build (CycloneDX)
G-W0.5-3  OTel instrumentation verified
G-W0.5-4  SAST + SCA mandatory on PR
G-W0.5-5  Banned-decision CI test active
G-W0.5-6  RULE-2 / RULE-3 / RULE-5 CI checks active
G-W0.5-7  Audit chain anchor service live
G-W0.5-8  Tenant guard double-defense tested
```

---

## 6. Evidence emitted (per H4)

```
- Authority entry for 95 roots (EC-16)
- Initial OTG axiom baseline (EC-22)
- Audit chain anchor live (EC-8)
- Validation pack VP-platform-substrate (EC-1) IQ + initial OQ
- Banned-decision triple-defense test evidence (EC-7 / EC-22)
- Identity + policy engine IQ evidence
```

---

## 7. KPIs

```
- L1 /decide latency p95 < 20ms (target SLO-1 baseline)
- Authority Ledger entries with valid signatures = 100%
- OTG axiom violation count = 0 (target SLO-6)
- Audit chain anchor lag < 25h (target SLO-10)
- Tenant guard test pass = 100% (cross-tenant test always rejected)
- Banned-decision triple-defense test pass = 100%
- DORA metrics baseline established
```

---

## 8. Dependencies (pre + post)

```
PRE                              W0 PASS;
                                ADR-0004 forbidden list active
POST                             W1 (HMV4 enrichment); W3 (workspace
                                projection emerge); W4.5 (OTG cutover
                                production); W5 (regulated mutation
                                begins per ADR-0005)
```

---

## 9. Risks

```
R-W0.5-01 OTG schema migration breaks existing data
          Mitigation: per B6 mode ladder; shadow-write phase;
          per ADR-0004 forbidden file list scoped
R-W0.5-02 Banned-decision triple-defense scaffold incomplete
          Mitigation: per L1 §4; quarterly red-team verifies;
          per L4
R-W0.5-03 Tenant boundary breach in early integration
          Mitigation: SLO-19 = 0; double-defense (middleware
          + RLS); per B6 C5
R-W0.5-04 Identity provider lock-in (Keycloak vs alternatives)
          Mitigation: OIDC standard; portable per E1
R-W0.5-05 OTel cardinality explosion early
          Mitigation: per I2 §5 cardinality governance from
          day 1
R-W0.5-06 Authority Ledger 95-root seed mis-populated
          Mitigation: per E2.4 verify endpoint; integrity audit
          job nightly
```

---

## 10. Per-pack overlay (early scaffolding only)

```
PHARMA J1                        baseline + Pharma-specific
                                 audit-chain extension prep
AUTO J2                          baseline + EDI scaffolding
AERO J3                          baseline + ITAR-segregation prep
MD J4                            baseline + UDI scaffolding
FOOD J5                          baseline + §204 prep
```

---

## 11. Decision phrases

```
W0_5_PLATFORM_SUBSTRATE_ACCEPTED
W0_5_PLATFORM_SUBSTRATE_PASS_WITH_WARNINGS
W0_5_PLATFORM_SUBSTRATE_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- ADR-0001 / ADR-0004 / ADR-0009 — frozen postures
- B1..B9 — architecture substrate
- E0..E15 — API conventions
- I1 §2 — wave gate (W0.5)
- I2 §2 — observability + SLOs
- L1 §4 — triple defense
- L4 — red-team baseline
- M3 — root catalog
- M5 — SLOs
- M6 — risk register
- M9 — cross-reference

---

## 13. Decision phrase

```
G2_WAVE_W0_5_BASELINE_LOCKED
NEXT: G3_WAVE_W1.md
```
