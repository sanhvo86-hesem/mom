# G16 — Wave W12: Release Candidate / Scale Operating Model

```
wave_id:        W12
wave_name:      Release Candidate / Scale Operating Model
predecessor:    W11
successor:      W13
calendar:       4-8 weeks
team_size:      10 FTE
```

---

## 1. Goal

Establish HESEM as release-candidate-grade. Scale governance,
multi-tenant operations, partner ecosystem, support model. Ratify
formal release wording (per PART_A1 §3 RULE-3, formal release language
permitted post W12 + customer cutover gate).

---

## 2. Entry criteria

W11 READY plus at least one customer in pre-production successfully.

---

## 3. Exit criteria

```
[ ] >= 3 stable customers in pre-production operations
[ ] 100% SLO compliance over 90-day window
[ ] DORA Elite-tier sustained on 100% of services
[ ] Multi-tenancy operational (>= 3 customers in production)
[ ] Customer + Supplier Portal applications live (per PART_B8)
[ ] GraphQL gateway live (Wave 9 stream 9I)
[ ] Real-time push (WebSocket / SSE) live
[ ] First 4 partner connectors live (Salesforce, SAP S/4 financial,
     PTC Windchill, MS 365)
[ ] Marketplace + plugin SDK published (Apache 2.0)
[ ] Per-tenant cost SLA + throttling operational
[ ] Production wording allowed for this milestone (per cutover gate)
```

---

## 4. Work packages

```
WP-W12-01 Multi-tenancy operations + per-tenant onboarding playbook
WP-W12-02 Customer Portal application
WP-W12-03 Supplier Portal application
WP-W12-04 GraphQL gateway (convenience layer)
WP-W12-05 Real-time push (WebSocket / SSE)
WP-W12-06 First 4 partner connectors (Salesforce, SAP S/4, PTC
            Windchill, MS 365)
WP-W12-07 Marketplace + plugin SDK (Apache 2.0)
WP-W12-08 Per-tenant cost SLA + throttling
WP-W12-09 Customer health scorecard
WP-W12-10 Annual customer NPS / CSAT survey
WP-W12-11 Annual ISO 27001 surveillance audit
WP-W12-12 Public release of release notes + changelog
```

---

## 5. Decision phrases

```
W12_PRODUCTIZED_OPERATING_MODEL_READY
W12_PRODUCTIZED_OPERATING_MODEL_PASS_WITH_WARNINGS
W12_PRODUCTIZED_OPERATING_MODEL_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G16_WAVE_W12_BASELINE_LOCKED
NEXT: G17_WAVE_W13.md
```
