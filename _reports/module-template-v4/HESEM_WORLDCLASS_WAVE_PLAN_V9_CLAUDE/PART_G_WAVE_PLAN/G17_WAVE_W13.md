# G17 — Wave W13: Multi-Region + Multi-Jurisdictional Operations

```
wave_id:        W13
wave_name:      Multi-Region + Multi-Jurisdictional Operations
predecessor:    W12
successor:      W14
calendar:       8-12 weeks
team_size:      12-14 FTE
```

---

## 1. Goal

Enable HESEM to run in multiple regions with per-region regulatory
compliance. Per-tenant region pinning (with ITAR isolation). Cross-
region DR drill quarterly. Per-jurisdiction regulatory compliance
evidence.

---

## 2. Entry criteria

W12 READY. First multi-region customer signed (or strong demand).

---

## 3. Exit criteria

```
[ ] Active-active deployment in >= 2 regions
[ ] Per-tenant region pinning + ITAR isolation enforced
[ ] Cross-region replication lag p95 < 5 minutes
[ ] Cross-region DR drill quarterly PASS
[ ] Audit chain anchor consistency across regions verified
[ ] Per-jurisdiction compliance pack per region
   (US-FDA, EU-EMA, JP-PMDA, KR-MFDS, etc.)
[ ] Customer-specific data residency: never leaves declared region
[ ] CMMC 2.0 (US DoD) achieved for relevant tenants
[ ] DSCSA + EPCIS production-grade (US pharma)
[ ] Optional: blockchain audit anchor (per ADR; for opt-in tenants)
```

---

## 4. Work packages

```
WP-W13-01 Multi-region Kubernetes topology
WP-W13-02 Per-tenant region declaration + enforcement
WP-W13-03 ITAR pinning (US-only for ITAR-controlled tenants)
WP-W13-04 Cross-region DR runbook + quarterly drill
WP-W13-05 Per-region audit chain consistency mechanism
WP-W13-06 Per-jurisdiction regulatory compliance pack
WP-W13-07 Customer-side data residency configuration
WP-W13-08 CMMC 2.0 evidence (aerospace tenants)
WP-W13-09 DSCSA + EPCIS production-grade exchange
WP-W13-10 Optional blockchain anchoring (per opt-in tenant ADR)
```

---

## 5. Decision phrases

```
W13_MULTI_REGION_MULTI_JURISDICTIONAL_READY
W13_MULTI_REGION_MULTI_JURISDICTIONAL_PASS_WITH_WARNINGS
W13_MULTI_REGION_MULTI_JURISDICTIONAL_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G17_WAVE_W13_BASELINE_LOCKED
NEXT: G18_WAVE_W14.md
```
