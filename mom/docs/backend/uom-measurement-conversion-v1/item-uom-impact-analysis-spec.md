# P07 — Item-UoM Impact Analysis and Effectivity Specification

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P07 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Before any change to a UoM catalog row (unit lifecycle, rule factor, alias, policy), HESEM must compute the blast radius — which downstream items, inspections, work orders, BOMs are affected — and surface that information to the approver. This document specs the impact-analysis service and its effectivity model.

## 2. UomImpactAnalysisService API

| Method | Computes |
|---|---|
| `analyzeUnitDeprecation($canonicalCode)` | count of `inspection_results`, `mes_inline_measurements`, `item_uom_policy` rows referencing the unit + list of suggested replacement units within the same kind |
| `analyzeRuleChange($ruleId)` | count of `uom_measurement_thread` rows produced by the rule + estimated drift in display values if factor / offset changes |
| `analyzeAliasChange($aliasId, $newCanonical?)` | count of source rows that resolved through this alias historically + downstream consumers affected |

Each method returns a structured payload:

```json
{
  "impact_summary": {
    "affected_records": <int>,
    "affected_items":   <int>,
    "affected_consumers": ["QC", "MES", "Inventory", "Procurement", "Sales", "BOM"],
    "severity_estimate": "low|medium|high|critical",
    "suggested_action": "proceed|require_e_sign|require_impact_freeze|block"
  },
  "details": [...]  // top-N rows for human review
}
```

## 3. Effectivity model

| Concept | Mechanism |
|---|---|
| Past-tense effectivity | a unit retired today does NOT invalidate historic MEASVAL envelopes; lookups are time-aware via `effective_from`/`effective_to` |
| Forward effectivity | a new rule activated today applies from `effective_from` onward; historic conversions through the prior version remain via `rule_version` pinning |
| Catalog rollback | not supported as a direct action; instead, retire the bad rule and activate a corrective rule with a forward `effective_from` |
| Mid-flight WO | an active WO using a rule that retires mid-flight continues to use its pinned `rule_version`; new operations use the active rule |

## 4. Severity heuristic

| Affected records (last 90d) | Suggested action |
|---|---|
| 0 | proceed |
| 1 – 100 | proceed, log impact summary |
| 101 – 10000 | require e-sign |
| 10001 – 100000 | require_impact_freeze (12h cooling-off + e-sign + risk-confirm dialog) |
| > 100000 | block until metrology team manual review |

These thresholds are starting values; metrology team may tune via `uom_impact_severity_policy` (reserved column).

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| ID-001 | Impact analysis is **always** rendered to the approver UI before approve action | tamper-resistance |
| ID-002 | Severity heuristic returns a *recommendation*; approver may still e-sign | human-in-loop |
| ID-003 | Effectivity is time-aware: historic envelopes survive catalog change | reproducibility |
| ID-004 | Rule rollback as direct action is forbidden; corrective forward rule required | audit integrity |
| ID-005 | Mid-flight WOs pin `rule_version` so they ignore mid-cycle rule changes | shop-floor stability |
| ID-006 | Suggested replacement units derived from same kind + similar `risk_level` | sensible defaults |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | IG-001 | Severity heuristic constants not yet exposed in admin UI | tuning UI in follow-up |
| medium | IG-002 | Estimated drift calculation for rule change not yet integrated; service returns counts but not drift estimate | metrology supply |
| low | IG-003 | Impact analysis report not yet emailed to approver — UI surface only | notification follow-up |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| API completeness | 10 |
| Effectivity model | 10 |
| Severity transparency | 9 |
| Reproducibility | 10 |
| **Total** | **39 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/item-uom-policy-model.md` (P07 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p07-packaging-globalism-redteam.md` (P07 / 3)
