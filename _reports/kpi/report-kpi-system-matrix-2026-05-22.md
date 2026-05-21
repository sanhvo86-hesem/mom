# KPI System Matrix Audit

Generated: 2026-05-21T18:46:38+00:00

## Summary

| Item | Count |
|---|---:|
| `html_file_count` | 869 |
| `documents_with_metric_usage` | 256 |
| `registry_metric_count` | 76 |
| `metric_codes_seen` | 141 |
| `executive_scorecard_metrics_seen` | 15 |
| `role_measure_codes_seen` | 95 |
| `findings_total` | 11 |
| `p1_findings` | 0 |
| `p2_findings` | 11 |
| `p3_findings` | 0 |

## Operating Conclusion

The KPI estate is broad but usable if the company keeps one authority rule: official KPI must be registry-approved and tied to evaluation, evidence, rating, and consequence. Training and shopfloor documents should use role measures, gate control metrics, or operating metrics unless they explicitly map to the registry.
Change-control rule: every KPI/metric creation, rename, target/threshold change, score weight change, owner change, backend formula change, or document-placement change must update the authority registry, ANNEX-128 matrix, and all related SOP/WI/ANNEX/JD/training documents in the same controlled change.

## Priority Findings

| Priority | Finding | Document | Metrics | Recommendation |
|---:|---|---|---|---|
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120B-scenario-playbook.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-145-v5-stress-test-fixes-and-workflow-lists-schema.html` | DOWNTIME_IMPACT | Legacy alias DOWNTIME appears; use canonical code DOWNTIME_IMPACT in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/system/organization/04-RACI-Authority/_authority-matrix.en.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/system/organization/04-RACI-Authority/_raci-master-matrix.en.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/system/organization/04-RACI-Authority/authority-matrix.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/training/competency/01-Framework/_competency-metrics.preview_r0_0.en.html` | SCRAP_RATE | Legacy alias SCRAP appears; use canonical code SCRAP_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/training/competency/01-Framework/_competency-metrics.preview_r0_0.en.html` | SETUP_RATIO | Legacy alias SETUP appears; use canonical code SETUP_RATIO in governed KPI tables. |

## Metric Matrix

| Code | Class | Docs | Uses | Target | Backend/statistical plan | Target consistency | Name consistency |
|---|---|---:|---:|---|---|---|---|
| `OTD` | executive_scorecard_kpi | 147 | 391 | ≥95% | runtime_calculated_with_registry_contract | target_seen_matches_registry_number | canonical_or_mapped_name |
| `FPY` | executive_scorecard_kpi | 49 | 71 | ≥98% | runtime_calculated_with_registry_contract | target_seen_matches_registry_number | canonical_or_mapped_name |
| `COPQ` | executive_scorecard_kpi | 42 | 71 | ≤2 percent_of_sales | runtime_calculated_with_registry_contract | target_seen_matches_registry_number | canonical_or_mapped_name |
| `OEE` | gate_control_metric | 41 | 113 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CAPA_EFFECTIVENESS` | executive_scorecard_kpi | 18 | 20 | ≥90% | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `WIP_AGING` | executive_scorecard_kpi | 13 | 17 | ≤5 aged_wip_percent | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `MTTR` | operating_metric | 12 | 16 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `COMPLAINT_RATE` | executive_scorecard_kpi | 10 | 41 | ≤1 complaints_per_100_shipments | runtime_calculated_with_registry_contract | registered_target_not_repeated_in_docs | legacy_alias_seen |
| `INVENTORY_ACCURACY` | governance_kpi | 10 | 12 |  | candidate_data_contract_required_before_payout | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M1` | role_performance_measure | 6 | 16 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `PLAN_ADHERENCE` | governance_kpi | 6 | 12 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `C01-M2` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C01-M5` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M3` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M5` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M5` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M5` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M1` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M5` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M1` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M1` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M2` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M1` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M2` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M5` | role_performance_measure | 4 | 14 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M2` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M5` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M5` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M1` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M5` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M5` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M5` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M5` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M2` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M1` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M3` | role_performance_measure | 4 | 13 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M1` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M2` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M2` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M2` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M2` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M2` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M2` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M3` | role_performance_measure | 4 | 10 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M4` | role_performance_measure | 4 | 6 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M4` | role_performance_measure | 4 | 6 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M4` | role_performance_measure | 4 | 6 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M5` | role_performance_measure | 4 | 6 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M5` | role_performance_measure | 4 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M5` | role_performance_measure | 4 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `SUPPLIER_OTD` | governance_kpi | 4 | 5 |  | not_declared_or_informational | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M2` | role_performance_measure | 4 | 4 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `OEE_BOTTLENECK` | executive_scorecard_kpi | 3 | 6 | ≥80% | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `FAI_FIRST_PASS` | executive_scorecard_kpi | 3 | 4 | ≥98% | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `THROUGHPUT_PER_CONSTRAINT_HOUR` | executive_scorecard_kpi | 3 | 4 | ≥1.1 baseline_index | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `SETUP_RATIO` | local_or_unmapped_metric | 2 | 9 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | legacy_alias_seen |
| `PROMISE_DATE_RISK` | local_or_unmapped_metric | 2 | 4 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | unmapped_or_local_name |
| `QC_HOLD_SLA` | local_or_unmapped_metric | 2 | 4 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | unmapped_or_local_name |
| `SETUP_FIRST_PASS` | executive_scorecard_kpi | 2 | 3 | ≥95% | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `C01-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C01-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C01-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M5` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M5` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M5` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M3` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M5` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M1` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M4` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `CONSTRAINT_LOST_HOURS` | operating_metric | 2 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `MTBF` | operating_metric | 2 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `PUT_THRU` | local_or_unmapped_metric | 2 | 2 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | unmapped_or_local_name |
| `REPEAT_NCR_RATE` | executive_scorecard_kpi | 2 | 2 | ≤5% | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `SUPPLIER_READINESS` | executive_scorecard_kpi | 2 | 2 | ≥90 composite_score | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `SCRAP_RATE` | local_or_unmapped_metric | 1 | 11 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | legacy_alias_seen |
| `DSO` | governance_kpi | 1 | 6 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `QUOTE_HIT_RATE` | governance_kpi | 1 | 3 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `DOWNTIME_IMPACT` | local_or_unmapped_metric | 1 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | legacy_alias_seen |
| `REWORK_RATE` | local_or_unmapped_metric | 1 | 2 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | unmapped_or_local_name |
| `CRITICAL_ROLE_BACKUP_COVERAGE` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CRITICAL_ROLE_CERT_COVERAGE` | executive_scorecard_kpi | 1 | 1 | ≥95% | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `CRITICAL_SYSTEM_AVAILABILITY` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CYCLE_TIME_VARIANCE` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `FINAL_RELEASE_RFT` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `GROSS_MARGIN_JOB_FAMILY` | executive_scorecard_kpi | 1 | 1 | ≥28% | candidate_data_contract_required_before_payout | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `INCIDENT_ACTION_CLOSURE_AGING` | governance_kpi | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `INVOICE_RFT` | governance_kpi | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `IN_PROCESS_REJECT_RATE` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `MATERIAL_AVAILABILITY_PLAN` | governance_kpi | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `NCR_RATE` | local_or_unmapped_metric | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | unmapped_or_local_name |
| `ORDER_REVIEW_RFT` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `RECORDABLE_INCIDENT_RATE` | safety_gate | 1 | 1 | ≤0 count | not_declared_or_informational | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `RFQ_TURNAROUND_TIME` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SCHEDULE_RECOVERY_EFFECTIVENESS` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SHIP_PACKET_COMPLETENESS` | gate_control_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SHIP_READY_TO_INVOICE_LT` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `WIP_BEFORE_CONSTRAINT` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |

## Benchmark Rule

- NIST Baldrige: KPI must support review, decision, improvement, and strategic objectives.
- ISA-95: KPI/dashboard is a read model across ERP/MOM/MES boundaries, not execution truth.
- SAP manufacturing/OEE: OEE needs availability, performance, quality, resource/order context, and reason codes.
- SAP calibration/variable pay: rating and reward require workflow and calibration, not automatic raw metric payout.
