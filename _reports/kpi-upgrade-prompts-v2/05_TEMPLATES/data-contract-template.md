# KPI Data Contract — <CODE>

## 1. Identity

- Code:
- Name:
- Name VI:
- Metric type:
- Tier/layer:
- Owner role:
- Data steward:
- Cadence:
- Review forum:

## 2. Decision purpose

What decision does this metric drive?

## 3. Formula

- Direction:
- Unit:
- Numerator:
- Denominator:
- Filters:
- Exclusions:
- Rounding:
- Min sample:
- Period start rule:
- Period end rule:

## 4. Thresholds

| Level | Rule | Action |
|---|---|---|
| Green | | |
| Yellow | | |
| Red | | |
| Grey | insufficient data/manual pending | data quality action |

Basis:

## 5. Source of record

| Table/form | Columns/fields | Verified? | Notes |
|---|---|---|---|

Evidence:

## 6. Runtime/manual implementation

- Calculation status:
- KpiEngine function:
- API endpoint:
- Manual input endpoint:
- Snapshot/trend:
- Data quality flags:

## 7. Breakdown

Required breakdown dimensions:
- customer:
- product_family:
- machine/workcenter:
- cause/reason:
- owner/contributor:

## 8. Action rule

- Yellow:
- Red:
- Escalation:
- Linked SOP/WI/CDR:

## 9. Counter-metric

- Counter code:
- Counter name:
- Counter formula/input:
- Block condition:

## 10. Attribution and fairness

- Controllable by owner:
- Shared contributors:
- Exclusions/approved exceptions:
- Reward eligibility:

## 11. Test cases

| Case | Expected |
|---|---|
| Empty period | grey |
| Min sample below threshold | grey |
| Normal green | green |
| Red value | red + action |
| Counter red | recognition blocked |
