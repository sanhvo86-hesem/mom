# G2 — Wave W0.5: Platform Substrate Hardening

```
wave_id:        W0.5
wave_name:      Platform Substrate Hardening
predecessor:    W0
successor:      W1
calendar:       4-6 weeks
team_size:      5-6 FTE
```

---

## 1. Goal

Build the platform substrates that all subsequent waves depend on:
identity / policy engine, observability stack, OTG schema, problem-detail
factory, idempotency / ETag middleware, tenant guard, audit chain
primitives, Authority Ledger baseline.

No business slices touched. Pure platform engineering.

---

## 2. Entry criteria

W0 PASS or PASS_WITH_WARNINGS.

---

## 3. Exit criteria

```
[ ] Identity & policy engine baseline operational
[ ] Observability stack ingesting traces, metrics, logs
[ ] OTG schema migrated (empty tables; integrity job runs cleanly)
[ ] Authority Ledger schema migrated; 95-root seed populated
[ ] Problem-detail registry with 62 type URIs
[ ] Idempotency replay table + middleware
[ ] Tenant guard middleware with double-defense (middleware + RLS)
[ ] Audit chain primitives (hash chain, daily anchor cron)
[ ] L1 / decide endpoint returning deterministic decisions
[ ] No business surface affected (HMV4 prototype unchanged)
```

---

## 4. Work packages

```
WP-W0.5-01 Identity & policy engine baseline (Keycloak + PolicyEngine)
WP-W0.5-02 Observability stack (OTel + Prometheus + Loki + Jaeger + Grafana)
WP-W0.5-03 OTG schema baseline (otg_node, otg_edge, otg_event tables; 18 axioms)
WP-W0.5-04 Authority Ledger schema + 95-root seed
WP-W0.5-05 Problem-detail factory (62 problem types)
WP-W0.5-06 Idempotency + ETag + If-Match middleware
WP-W0.5-07 Tenant guard middleware + RLS double-defense
WP-W0.5-08 Audit chain primitives (hash chain + daily merkle anchor)
WP-W0.5-09 Forbidden diff scanner ratification
WP-W0.5-10 Inert flag registry ratification
WP-W0.5-11 Graphics Authority no-hardcode CI gate
WP-W0.5-12 RULE-2 (AI banned decisions) CI test active
```

---

## 5. Decision phrases

```
W0_5_PLATFORM_SUBSTRATE_ACCEPTED
W0_5_PLATFORM_SUBSTRATE_PASS_WITH_WARNINGS
W0_5_PLATFORM_SUBSTRATE_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G2_WAVE_W0_5_BASELINE_LOCKED
NEXT: G3_WAVE_W1.md
```
