# KPI HTML Governance Audit And Remediation Plan

Generated: 2026-04-18

## Scope

Audit covered all `413` app-served HTML documents under `mom/docs` using:

- `tools/scripts/kpi/audit-html-kpis.php`
- `tools/scripts/kpi/audit-kpi-performance-governance.php`

The audit checks where KPI/metric language appears, whether it is backed by KPI authority, and whether the document also gives people-governance logic: evaluation/review, recognition/reward, discipline/corrective action, and action ownership.

## Current Result After Remediation

| Control point | Result |
|---|---:|
| HTML files scanned | 413 |
| Files with KPI/metric language in KPI context | 297 |
| KPI word occurrences | 1,944 |
| Likely operational KPI IDs | 59 |
| KPI/metric table row candidates | 1,537 |
| Missing evaluation/review terms | 19 files |
| Missing recognition/reward terms | 101 files |
| Missing discipline/corrective terms | 13 files |
| Missing all people-governance signals | 0 files |
| Row-level KPI/target items missing people-governance | 75 rows |

## Finding

The company does not lack KPI quantity. The risk is KPI inflation: training pages, WIs, SOPs, handbooks, and gate documents use KPI language for many local measures that are actually role measures, gate metrics, operating metrics, or health indicators.

The practical rule is:

> If a metric is not used for formal evaluation, do not call it KPI.

Approved KPI needs a clear management decision, owner, cadence, target, evidence source, rating method, reward/recognition rule, corrective-action rule, and anti-gaming guardrail.

## Remediated In This Pass

Wave 1 fixed the highest-risk documents that previously had KPI language with no local people-governance signal:

- `mom/docs/operations/sops/02-SOP-200/sop-203-customer-property-control.html`
- `mom/docs/operations/work-instructions/05-WI-500/wi-511-machine-type-quick-reference.html`
- `mom/docs/operations/work-instructions/05-WI-500/wi-514-cnc-turning-guide.html`
- `mom/docs/operations/work-instructions/05-WI-500/wi-515-mill-turn-guide.html`
- `mom/docs/training/templates/competency-metrics.html`
- `mom/docs/training/competency/01-Framework/competency-metrics.html`

These documents now classify the local items as `Gate Control Metrics` or `Role Performance Measures`, and state evaluation/review, recognition, corrective action, and discipline guardrails.

## Remaining Work

Wave 2 should clean the remaining 75 row-level findings. Most are training competency rows and module tables. Do not add reward/punishment text to every row. Instead:

- Training rows become `Role Performance Measure`.
- SOP/WI gate rows become `Gate Control Metric`.
- Daily operating rows become `Operating Metric`.
- Only registry-approved rows stay `KPI`.

Wave 3 should update source templates/generators for recurring training and competency pages so future generated HTML carries the governance block automatically.

Wave 4 should keep backend enforcement: `GET /api/kpi/catalog` must expose classification, official KPI flag, scorecard fields, data contract, rating method, and consequence; generic CRUD must not create KPI definitions outside the registry.

## Benchmark Basis

- NIST Baldrige: measures should support decisions, resource allocation, integration, trends, and review, not just reporting.
- ISA-95: ERP Level 4 and MOM/MES Level 3 boundaries must stay explicit; KPI dashboards are read models, not execution truth.
- SAP scorecard practice: KPI scoring requires targets, thresholds, score calculation, and weighted contribution.

## Operating Recommendation

Keep the 15-KPI executive scorecard as the leadership system. Keep the broader ANNEX-122 and operational measures as controlled supporting metrics. Do not switch to OKR as the main management system; use OKR only for 60-90 day improvement projects tied to Hoshin initiatives.
