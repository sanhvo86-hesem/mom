# G7 — Wave W4.5: Operational Truth Graph Native Cutover

```
wave_id:        W4.5
wave_name:      OTG Native Cutover
predecessor:    W4
successor:      W5
calendar:       3-5 weeks
team_size:      6-8 FTE
investment:     ~$300K
```

---

## 1. Goal

Move from L4 read-only direct-query to L5 read-only OTG-native
projections. Workspace consumers cut over to OTG-derived views.
Audit chain anchor cron operational. Integrity job verifies all
18 axioms (per B6 C2). Optional RFC 3161 timestamping pilot.

---

## 2. Entry criteria

```
[ ] W4 READY (≥ 60% slices L4)
[ ] CDC outbound substrate live
[ ] Audit chain anchor primitives active (per W0.5)
```

---

## 3. Exit criteria

```
[ ] CDC consumer operational (pgoutput; per B8)
[ ] Materialized view registry + refresh strategy (per B6)
[ ] Workspace projection cutover (each workspace from direct
    query → projection per E5)
[ ] Audit chain anchor cron stable; 7-day clean window
[ ] OTG axioms A1-A18 nightly (per B6 C2; per SLO-6)
[ ] RFC 3161 pilot active for one regulated tenant
[ ] Per-projection freshness SLO (per SLO-5) green
[ ] Per-axiom violation = 0 (per SLO-6 / 7d)
```

---

## 4. Work packages

```
WP-W4.5-01 CDC consumer service (Postgres pgoutput)
WP-W4.5-02 Materialized view registry + refresh strategy
WP-W4.5-03 Workspace projection cutover per workspace
            (per F4 + E5)
WP-W4.5-04 Audit chain anchor cron operational (per B6 C1;
            daily; SLO-10 < 25h)
WP-W4.5-05 Integrity job axioms A1-A18 nightly (per B6 C2;
            per SLO-6)
WP-W4.5-06 RFC 3161 timestamping connector (pilot)
WP-W4.5-07 Per-projection freshness SLO declared + measured
            (per E5 §2.10)
WP-W4.5-08 Per-projection invalidation event (per CDC)
WP-W4.5-09 Cross-region cache invalidation propagation
WP-W4.5-10 Replay tooling per CDC consumer (per B6)
```

---

## 5. Quality gates

```
G-W4.5-1  Audit chain anchor verification continuing
G-W4.5-2  OTG axiom regression suite GREEN
G-W4.5-3  Cross-tenant isolation cross-check (per B6 C5)
G-W4.5-4  Per-projection freshness SLO active
G-W4.5-5  CDC consumer lag < 60s (SLO-13)
G-W4.5-6  Saga compensation chaos test (per W5 prep)
```

---

## 6. Evidence emitted

```
- CDC consumer IQ + OQ (EC-1)
- Per-projection freshness baseline (EC-3)
- Audit chain anchor daily (EC-8)
- OTG axiom verification (EC-22)
- RFC 3161 pilot evidence (EC-22)
- Replay tool validation (EC-1)
```

---

## 7. KPIs

```
- Per-projection freshness lag p95 < 5s (per SLO-5)
- CDC consumer lag p95 < 60s (per SLO-13)
- OTG axiom violations = 0 (per SLO-6)
- Audit chain anchor lag < 25h (per SLO-10)
- Replay-rebuild time per projection (target hours)
- Cross-region invalidation lag < 5s
```

---

## 8. Dependencies

```
PRE                              W4 READY (slices L4)
POST                             W5 (mutation per ADR-0005);
                                W6 (MES); W6.5 (AI shadow); W7
                                (AI advisory)
```

---

## 9. Risks

```
R-W4.5-01 Projection drift from authoritative source
          Mitigation: per B6 + integrity check;
          per E5 §2.10 freshness banner
R-W4.5-02 CDC consumer crash leaves projection stale
          Mitigation: per RB-INC-001;
          consumer health check + auto-restart
R-W4.5-03 Replay-rebuild time too long for incident recovery
          Mitigation: per B6 partition strategy;
          chunked replay
R-W4.5-04 Axiom violation in production
          Mitigation: per RB-INC-005;
          per L1 §4 triple defense related
R-W4.5-05 RFC 3161 TSA outage
          Mitigation: per E6 §FM3; alternate TSA;
          local witness fallback
```

---

## 10. Per-pack overlay

```
PHARMA J1                        RFC 3161 pilot per tenant demand;
                                 DSCSA partner read projection
AUTO J2                          per-OEM scorecard projection
AERO J3                          ITAR-segregated projection per
                                 region pinning
MD J4                            UDI projection
FOOD J5                          §204 projection
```

---

## 11. Decision phrases

```
W4_5_OTG_NATIVE_READY
W4_5_OTG_NATIVE_PASS_WITH_WARNINGS
W4_5_OTG_NATIVE_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- B6 C1 + C2 — audit chain + OTG axioms
- B8 — CDC integration
- E5 — workspace projection canonical
- E6 — audit API
- I1 W4.5 + W6 — gates
- M5 — SLO-5 + SLO-6 + SLO-10 + SLO-13

---

## 13. Decision phrase

```
G7_WAVE_W4_5_BASELINE_LOCKED
NEXT: G8_WAVE_W5.md
```
