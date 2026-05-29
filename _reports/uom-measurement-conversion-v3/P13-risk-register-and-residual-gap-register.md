# P13 — Risk Register and Residual Gap Register

**Prompt:** HESEM UoM V3 — P13  
**Generated:** 2026-05-29

## Risk register

| ID | Risk | Severity | Owner | Mitigation in V3 | Residual |
|---|---|---|---|---|---|
| R-01 | First-user impersonation re-emerges via a new seed | High | Governance Ops | Manifest service + DB CHECK uom_cr_approved_requires_owner | Future seeds must register a manifest; CI grep can detect new `LIMIT 1` patterns |
| R-02 | New conversion code path bypasses DecimalString | High | Conversion Engine owner | grep clean post-P02; PR-time grep in safety gate (planned) | Reviewer discipline + lint rule |
| R-03 | A consumer trusts an OPC UA UnitId without quarantine routing | High | Integration owner | -1 sentinel + docs | Consumer-side runtime check |
| R-04 | UI workspace mutates authority table directly | Critical | Frontend owner | Documented anti-pattern; HB-10 disposition records the only existing portal touches | No frontend authority work in V3 |
| R-05 | Runtime Feature test layer doesn't materialise post-V3 | Medium | SRE | Contract + drift tests PASS; runtime forwarded | Follow-up ticket |
| R-06 | Performance regression at scale | Medium | SRE | Latency targets declared; benchmark job to run post-V3 | Post-V3 measurement |
| R-07 | Migration 231 lifecycle CHECK broadened to a superset; future contract drift | Low | Database owner | Documented in P01 report; superset is intentional | Future tightening when service is settled |
| R-08 | AI principal classification drifts (new actor_kind values appear) | Low | Security owner | UomAiAdvisoryGuard catalog must be updated alongside IDM | Coupled review |

## Residual gap register

| Gap | Owner | Plan |
|---|---|---|
| Runtime Feature test layer (HB-09 b) | SRE / Backend | Stand up DB fixture in CI; replay UomController happy + error paths |
| HMV4-forbidden file edits (HB-10 b) | Orders-v3 / master-density review | Either revert before PR #74 merge OR justify edits in the orders-v3 review lane |
| `uom_conversion_rule.exactness_class` column promotion (HB-12 b) | DB owner | Future migration; non-blocking |
| Full QUDT QuantityKindDimensionVector 7-tuple promotion (GATE-011) | DB owner | Future migration |
| UCUM expression parser subset (P04) | Backend | Currently mapping-table only; supported expressions enumerated |
| Performance benchmark execution against live cluster (GATE-029) | SRE | Run after PR #74 merges to integration env |
| ContextualConversionPlanner wiring into ConversionEngine.convert | Backend | Engine integration in P09 follow-up |

## Decision token

```text
UOM_V3_P13_PASS_WORLDCLASS_CANDIDATE_FOR_INTEGRATION_REVIEW
```
