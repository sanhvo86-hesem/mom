# KPI System Matrix Audit

Generated: 2026-05-24T17:25:32+00:00

## Summary

| Item | Count |
|---|---:|
| `html_file_count` | 481 |
| `documents_with_metric_usage` | 128 |
| `registry_metric_count` | 216 |
| `metric_codes_seen` | 180 |
| `executive_scorecard_metrics_seen` | 7 |
| `role_measure_codes_seen` | 95 |
| `findings_total` | 7 |
| `p1_findings` | 0 |
| `p2_findings` | 6 |
| `p3_findings` | 1 |

## Operating Conclusion

Bức tranh KPI rộng nhưng vẫn kiểm soát được nếu giữ một luật thẩm quyền: KPI chính thức phải được registry phê duyệt và gắn với đánh giá, bằng chứng, phương pháp xếp hạng và hệ quả quản trị. Tài liệu đào tạo và hiện trường nên dùng role measure, metric cổng kiểm soát hoặc operating metric trừ khi đã map rõ về registry.
Luật change-control: mọi lần tạo KPI/metric, đổi tên, đổi target/ngưỡng, đổi trọng số, đổi chủ KPI, đổi công thức/backend hoặc đổi vị trí sử dụng trong tài liệu phải cập nhật đồng thời KPI Authority Registry, ANNEX-128 matrix và tất cả SOP/WI/ANNEX/JD/training liên quan trong cùng controlled change.

## Priority Findings

| Priority | Finding | Document | Metrics | Recommendation |
|---:|---|---|---|---|
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-129-bsc-kpi-operating-mechanism-assessment.html` | MACHINE_UTIL | Legacy alias MACHINE_UTILIZATION appears; use canonical code MACHINE_UTIL in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-145-v5-stress-test-fixes-and-workflow-lists-schema.html` | DOWNTIME_IMPACT | Legacy alias DOWNTIME appears; use canonical code DOWNTIME_IMPACT in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/system/organization/04-RACI-Authority/authority-matrix.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P2 | `CONTEXT_FIT_REVIEW` | `mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html` | OEE | Gate control metric appears outside normal gate/work-instruction context. |
| P2 | `LEGACY_ALIAS_USED` | `mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html` | COMPLAINT_RATE | Legacy alias CCR appears; use canonical code COMPLAINT_RATE in governed KPI tables. |
| P3 | `TARGET_VALUE_REVIEW` | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html` | PLAN_ADHERENCE | Document has target/threshold text that does not clearly include the registry scorecard target. Confirm whether this is a role/gate target or update the matrix mapping. |

## Metric Matrix

| Code | Class | Docs | Uses | Target | Backend/statistical plan | Target consistency | Name consistency |
|---|---|---:|---:|---|---|---|---|
| `OTD` | executive_scorecard_kpi | 73 | 199 | ≥95% | runtime_calculated_with_registry_contract | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `FPY` | executive_scorecard_kpi | 28 | 40 | ≥98% | runtime_calculated_with_registry_contract | target_seen_matches_registry_number | canonical_or_mapped_name |
| `COPQ` | executive_scorecard_kpi | 22 | 33 | ≤2 percent_of_sales | manual_governed_with_evidence_contract | target_seen_matches_registry_number | canonical_or_mapped_name |
| `OEE` | gate_control_metric | 20 | 44 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `MTTR` | operating_metric | 9 | 13 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CAPA_EFFECTIVENESS` | operating_metric | 9 | 11 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `PLAN_ADHERENCE` | executive_scorecard_kpi | 7 | 12 | ≥90% | runtime_calculated_with_registry_contract | target_seen_needs_review_against_registry | canonical_or_mapped_name |
| `WIP_AGING` | executive_scorecard_kpi | 7 | 10 | ≤5 aged_wip_percent | runtime_calculated_with_registry_contract | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `COMPLAINT_RATE` | executive_scorecard_kpi | 6 | 28 | ≤1 complaints_per_100_shipments | manual_governed_with_evidence_contract | registered_target_not_repeated_in_docs | legacy_alias_seen |
| `FAI_FIRST_PASS` | operating_metric | 6 | 10 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CMM_QUEUE_AGING` | gate_control_metric | 6 | 7 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `IN_PROCESS_REJECT_RATE` | operating_metric | 5 | 6 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `OEE_BOTTLENECK` | operating_metric | 4 | 6 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CONSTRAINT_LOST_HOURS` | operating_metric | 4 | 5 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `IPQC_CHARACTERISTIC_COMPLETENESS` | gate_control_metric | 4 | 5 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `MATERIAL_AVAILABILITY_PLAN` | executive_scorecard_kpi | 4 | 5 | ≥95% | runtime_calculated_with_registry_contract | registered_target_not_repeated_in_docs | canonical_or_mapped_name |
| `QC_HOLD_SLA` | operating_metric | 4 | 5 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SUPPLIER_READINESS` | operating_metric | 4 | 5 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `C18-M1` | role_performance_measure | 3 | 8 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `CRITICAL_ROLE_BACKUP_COVERAGE` | governance_kpi | 3 | 4 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `FAI_QUEUE_AGING` | operating_metric | 3 | 4 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `FINAL_INSPECTION_QUEUE_AGING` | operating_metric | 3 | 4 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `NCR_3D_RESPONSE_SLA` | operating_metric | 3 | 4 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `THROUGHPUT_PER_CONSTRAINT_HOUR` | operating_metric | 3 | 4 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CHECK_DIM_REPORT_ON_SHIP` | gate_control_metric | 3 | 3 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `FINAL_RELEASE_RFT` | governance_kpi | 3 | 3 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `GAGE_VALID_FOR_RELEASE` | gate_control_metric | 3 | 3 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `NCR_CONTAINMENT_ON_TIME` | gate_control_metric | 3 | 3 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SPC_SIGNAL_REACTION_TIME` | gate_control_metric | 3 | 3 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `C01-M2` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C01-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M2` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M3` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M1` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M1` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M1` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M2` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M1` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M2` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M1` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M3` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M1` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M2` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M5` | role_performance_measure | 2 | 7 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M1` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M2` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M2` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M2` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M2` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M2` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M2` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M3` | role_performance_measure | 2 | 5 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M4` | role_performance_measure | 2 | 3 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M4` | role_performance_measure | 2 | 3 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M5` | role_performance_measure | 2 | 3 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M5` | role_performance_measure | 2 | 3 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M4` | role_performance_measure | 2 | 3 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C18-M5` | role_performance_measure | 2 | 3 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `MATERIAL_CERT_VERIFICATION_COMPLETENESS` | gate_control_metric | 2 | 3 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SPECIAL_PROCESS_REQUIREMENT_CLEAR` | gate_control_metric | 2 | 3 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `TRACEABILITY_LABEL_VERIFIED` | gate_control_metric | 2 | 3 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `BOTTLENECK_BUFFER_STATUS` | operating_metric | 2 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `C12-M2` | role_performance_measure | 2 | 2 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `CURRENT_CONSTRAINT_RESOURCE` | operating_metric | 2 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED` | gate_control_metric | 2 | 2 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `GAGE_VALID_FOR_IN_PROCESS_MEASUREMENT` | gate_control_metric | 2 | 2 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `IQC_RELEASE_ON_TIME` | gate_control_metric | 2 | 2 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `LAM_MATERIAL_KIT_READY_TO_PLAN` | gate_control_metric | 2 | 2 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `MACHINE_UTIL` | local_or_unmapped_metric | 2 | 2 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | legacy_alias_seen |
| `MTBF` | operating_metric | 2 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `NCR_8D_UPDATE_SLA` | operating_metric | 2 | 2 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `PUT_THRU` | local_or_unmapped_metric | 2 | 2 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | unmapped_or_local_name |
| `SETUP_FIRST_PASS` | operating_metric | 2 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SPECIAL_RELEASE_COMPLIANCE` | gate_control_metric | 2 | 2 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `DSO` | governance_kpi | 1 | 6 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `INVOICE_RFT` | governance_kpi | 1 | 4 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SETUP_RATIO` | local_or_unmapped_metric | 1 | 4 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | legacy_alias_seen |
| `INVENTORY_ACCURACY` | governance_kpi | 1 | 3 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `QUOTE_HIT_RATE` | governance_kpi | 1 | 3 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CRITICAL_SYSTEM_AVAILABILITY` | governance_kpi | 1 | 2 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `DOWNTIME_IMPACT` | operating_metric | 1 | 2 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | legacy_alias_seen |
| `RECORDABLE_INCIDENT_RATE` | governance_kpi | 1 | 2 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `RFQ_FEASIBILITY_STUDY_COMPLETENESS` | gate_control_metric | 1 | 2 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SUBTIER_REQUIREMENT_FLOWDOWN` | operating_metric | 1 | 2 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SUPPLIER_OTD` | governance_kpi | 1 | 2 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `BCP_READINESS` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `C01-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C01-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C01-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C02-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C03-M5` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M2` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C04-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C05-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C06-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M2` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C07-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M2` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C08-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C09-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M2` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C10-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M2` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C11-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C12-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M2` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C13-M5` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C14-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C15-M5` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C16-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M2` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M3` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C17-M5` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M1` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `C19-M4` | role_performance_measure | 1 | 1 |  | competency_evaluation_not_company_scorecard | local_target_requires_classification | canonical_or_mapped_name |
| `CONSTRAINT_STARVED_TIME` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CONTINGENCY_PLAN_READINESS_LAM` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CRITICAL_ROLE_CERT_COVERAGE` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CSR_ACKNOWLEDGEMENT_RATE` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` | operating_metric | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CUSTOMER_GAGE_DAMAGE_UNSUITABLE_NOTIFICATION_LT` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CUSTOMER_NCR_SEVERITY_SCORE` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `CYCLE_TIME_VARIANCE` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `DOC_RECORD_RETENTION_10Y` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `ENGINEERING_RELEASE_ON_TIME` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `GROSS_MARGIN_JOB_FAMILY` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `INCIDENT_ACTION_CLOSURE_AGING` | governance_kpi | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `INSPECTION_PLAN_ADHERENCE` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `INSPECTION_PLAN_COMPLETENESS` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `INSPECTION_QUEUE_AGING` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `NCR_4D_PRELIMINARY_SLA` | operating_metric | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `ORDER_REVIEW_RFT` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `PROCESS_CHANGE_APPROVAL_RATE` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `PROJECT_PLAN_DEVIATION_COMMUNICATION_LT` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `REPEAT_NCR_RATE` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `RFQ_TURNAROUND_TIME` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SAFETY_ONBOARDING_COMPLIANCE` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SCHEDULE_RECOVERY_EFFECTIVENESS` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SERVICE_TICKET_SLA` | governance_kpi | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SHIP_PACKET_COMPLETENESS` | gate_control_metric | 1 | 1 |  | runtime_calculated_with_registry_contract | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SHIP_READY_TO_INVOICE_LT` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SPECIAL_RELEASE_MARKING_COMPLIANCE` | gate_control_metric | 1 | 1 |  | gate_hold_release_evidence_not_payout | no_registered_target_no_local_target | canonical_or_mapped_name |
| `SUPPLIER_RBA_COMPLIANCE_EVIDENCE` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `TRAINING_AS_CAPA_COUNTER` | operating_metric | 1 | 1 |  | not_declared_or_informational | no_registered_target_no_local_target | canonical_or_mapped_name |
| `WIP_BEFORE_CONSTRAINT` | operating_metric | 1 | 1 |  | candidate_data_contract_required_before_payout | no_registered_target_no_local_target | canonical_or_mapped_name |

## Registry Inventory

| Code | Class | Registry sources | Backend/statistical plan | Target |
|---|---|---|---|---|
| `COMPLAINT_RATE` | executive_scorecard_kpi | runtime_calculated_metrics, legacy_aliases, annex122_governance_kpis, dashboard_core_kpis, scorecard_operating_model, scorecard_evidence_contracts, metric_governance_overrides | manual_governed / manual_governed_with_evidence_contract | ≤1 complaints_per_100_shipments |
| `COPQ` | executive_scorecard_kpi | runtime_calculated_metrics, dashboard_core_kpis, gate_control_metrics, scorecard_operating_model, scorecard_evidence_contracts, metric_governance_overrides | manual_governed / manual_governed_with_evidence_contract | ≤2 percent_of_sales |
| `FPY` | executive_scorecard_kpi | runtime_calculated_metrics, dashboard_core_kpis, gate_control_metrics, scorecard_operating_model, scorecard_evidence_contracts, metric_governance_overrides | runtime_calculated / runtime_calculated_with_registry_contract | ≥98% |
| `MATERIAL_AVAILABILITY_PLAN` | executive_scorecard_kpi | runtime_calculated_metrics, annex122_governance_kpis, dashboard_core_kpis, scorecard_operating_model, scorecard_evidence_contracts, metric_governance_overrides | runtime_calculated / runtime_calculated_with_registry_contract | ≥95% |
| `OTD` | executive_scorecard_kpi | runtime_calculated_metrics, annex122_governance_kpis, dashboard_core_kpis, gate_control_metrics, scorecard_operating_model, scorecard_evidence_contracts, metric_governance_overrides | runtime_calculated / runtime_calculated_with_registry_contract | ≥95% |
| `PLAN_ADHERENCE` | executive_scorecard_kpi | runtime_calculated_metrics, annex122_governance_kpis, dashboard_core_kpis, scorecard_operating_model, scorecard_evidence_contracts, metric_governance_overrides | runtime_calculated / runtime_calculated_with_registry_contract | ≥90% |
| `WIP_AGING` | executive_scorecard_kpi | runtime_calculated_metrics, annex122_governance_kpis, dashboard_core_kpis, scorecard_operating_model, scorecard_evidence_contracts, metric_governance_overrides | runtime_calculated / runtime_calculated_with_registry_contract | ≤5 aged_wip_percent |
| `CHANGEOVER_TIME` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `CHECK_DIM_REPORT_ON_SHIP` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | manual_governed / gate_hold_release_evidence_not_payout |  |
| `CMM_QUEUE_AGING` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | manual_governed / gate_hold_release_evidence_not_payout |  |
| `CONTROL_PLAN_PFMEA_APPROVAL` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `CSR_ACKNOWLEDGEMENT_RATE` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `CUSTOMER_ESCAPE_NOTIFICATION_LT` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `CUSTOMER_GAGE_DAMAGE_UNSUITABLE_NOTIFICATION_LT` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `ECN_LEAD_TIME` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `ENGINEERING_RELEASE_RFT` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `FAI_CYCLE_TIME` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `GAGE_VALID_FOR_CTQ_MEASUREMENT` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `GAGE_VALID_FOR_IN_PROCESS_MEASUREMENT` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `GAGE_VALID_FOR_RELEASE` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `INSPECTION_PLAN_COMPLETENESS` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `IPQC_CHARACTERISTIC_COMPLETENESS` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `IQC_PASS_RATE` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `IQC_RELEASE_ON_TIME` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | manual_governed / gate_hold_release_evidence_not_payout |  |
| `LAM_MATERIAL_KIT_READY_TO_PLAN` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | manual_governed / gate_hold_release_evidence_not_payout |  |
| `MATERIAL_CERT_VERIFICATION_COMPLETENESS` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | manual_governed / gate_hold_release_evidence_not_payout |  |
| `NCR_CONTAINMENT_ON_TIME` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `OEE` | gate_control_metric | runtime_calculated_metrics, gate_control_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `ORDER_REVIEW_RFT` | gate_control_metric | annex122_governance_kpis, gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `PROCESS_CHANGE_APPROVAL_RATE` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `RFQ_FEASIBILITY_STUDY_COMPLETENESS` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `RFQ_TURNAROUND_TIME` | gate_control_metric | annex122_governance_kpis, gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `SHIP_PACKET_COMPLETENESS` | gate_control_metric | runtime_calculated_metrics, legacy_aliases, gate_control_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `SHIP_READY_TO_INVOICE_LT` | gate_control_metric | annex122_governance_kpis, gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `SPC_SIGNAL_REACTION_TIME` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `SPECIAL_PROCESS_REQUIREMENT_CLEAR` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `SPECIAL_RELEASE_COMPLIANCE` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `SPECIAL_RELEASE_MARKING_COMPLIANCE` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `TRACEABILITY_COMPLETENESS` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `TRACEABILITY_DRILL_TIME` | gate_control_metric | gate_control_metrics | not_declared / gate_hold_release_evidence_not_payout |  |
| `TRACEABILITY_LABEL_VERIFIED` | gate_control_metric | dashboard_core_kpis, gate_control_metrics | manual_governed / gate_hold_release_evidence_not_payout |  |
| `BCP_READINESS` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `CAL_COMPLIANCE` | governance_kpi | runtime_calculated_metrics, legacy_aliases, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `CRITICAL_ROLE_BACKUP_COVERAGE` | governance_kpi | annex122_governance_kpis, dashboard_core_kpis | manual_governed / not_declared_or_informational |  |
| `CRITICAL_SYSTEM_AVAILABILITY` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `CUSTOMER_COMM_CLOSURE_OT` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `DSO` | governance_kpi | runtime_calculated_metrics, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `ECO_CLOSURE_AGING` | governance_kpi | runtime_calculated_metrics, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `ENGINEERING_RELEASE_ON_TIME` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `FINAL_RELEASE_RFT` | governance_kpi | annex122_governance_kpis, dashboard_core_kpis | manual_governed / not_declared_or_informational |  |
| `FOD_LINE_CLEARANCE_COMPLIANCE` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `GROSS_MARGIN_JOB_FAMILY` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `INCIDENT_ACTION_CLOSURE_AGING` | governance_kpi | runtime_calculated_metrics, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `INVENTORY_ACCURACY` | governance_kpi | runtime_calculated_metrics, legacy_aliases, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `INVOICE_RFT` | governance_kpi | runtime_calculated_metrics, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `MASTER_DATA_EXCEPTION_AGING` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `MONTH_END_CLOSE_OT` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `NCR_CLOSURE_AGING` | governance_kpi | runtime_calculated_metrics, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `QUOTE_HIT_RATE` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `RECORDABLE_INCIDENT_RATE` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `SAFETY_ONBOARDING_COMPLIANCE` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `SCHEDULE_RECOVERY_EFFECTIVENESS` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `SERVICE_TICKET_SLA` | governance_kpi | annex122_governance_kpis | not_declared / not_declared_or_informational |  |
| `SUPPLIER_OTD` | governance_kpi | runtime_calculated_metrics, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `TRAINING_COMP` | governance_kpi | runtime_calculated_metrics, legacy_aliases, annex122_governance_kpis | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `CAPA_CLOSURE` | local_or_unmapped_metric | runtime_calculated_metrics, legacy_aliases | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `DPMO` | local_or_unmapped_metric | runtime_calculated_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `INV_TURNS` | local_or_unmapped_metric | runtime_calculated_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `LABOR_EFF` | local_or_unmapped_metric | runtime_calculated_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `MACHINE_UTIL` | local_or_unmapped_metric | runtime_calculated_metrics, legacy_aliases | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `NCR_RATE` | local_or_unmapped_metric | runtime_calculated_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `PUT_THRU` | local_or_unmapped_metric | runtime_calculated_metrics, legacy_aliases | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `REWORK_RATE` | local_or_unmapped_metric | runtime_calculated_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `SCRAP_RATE` | local_or_unmapped_metric | runtime_calculated_metrics, legacy_aliases | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `SETUP_RATIO` | local_or_unmapped_metric | runtime_calculated_metrics, legacy_aliases | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `SUPPLIER_QUAL` | local_or_unmapped_metric | runtime_calculated_metrics, legacy_aliases | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `ACCESS_REVIEW_COMPLETION` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `AR_DISPUTE_AGING` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `AUDIT_FINDING_AGING` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `BOTTLENECK_BUFFER_STATUS` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CAPA_EFFECTIVENESS` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CMM_PROGRAM_VALIDATION` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `COMPLAINT_LOG_ON_TIME` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `CONSTRAINT_IDLE_WHILE_NON_CONSTRAINT_RUNS` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CONSTRAINT_LOST_HOURS` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CONSTRAINT_STARVED_TIME` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CONTINGENCY_PLAN_READINESS_LAM` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `CPK_COVERAGE_RATE` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CPK_PRODUCT_MIN_CTQ` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CRITICAL_ROLE_CERT_COVERAGE` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CTQ_MEASUREMENT_COMPLETENESS` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CTQ_SAMPLE_POLICY_STATUS` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CURRENT_CONSTRAINT_RESOURCE` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` | operating_metric | runtime_calculated_metrics, proposed_operating_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `CUSTOMER_ESCAPE_DPPM_12M` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `CUSTOMER_NCR_EVENTS_M` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `CUSTOMER_NCR_SEVERITY_SCORE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `CYCLE_TIME_VARIANCE` | operating_metric | legacy_aliases, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `DEFECTIVE_ORDER_RATE_M` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `DEFECT_PARETO_ACTION_CLOSURE` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `DFM_FEASIBILITY_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `DOCUMENT_CHANGE_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `DOC_RECORD_RETENTION_10Y` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `DOWNTIME_IMPACT` | operating_metric | legacy_aliases, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `EHS_RISK_ASSESSMENT_REVIEW` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `ENGINEERING_BLOCKER_CLOSURE_OT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `ENGINEERING_CAUSED_NCR` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `ERP_RELEASE_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `FAI_FIRST_PASS` | operating_metric | runtime_calculated_metrics, legacy_aliases, annex122_governance_kpis, dashboard_core_kpis, gate_control_metrics, proposed_operating_metrics | retained_from_annex122 / not_declared_or_informational |  |
| `FAI_QUEUE_AGING` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `FINAL_INSPECTION_QUEUE_AGING` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `HOSHIN_RESOURCE_DECISION_LT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `INSPECTION_PLAN_ADHERENCE` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `INSPECTION_QUEUE_AGING` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `INSPECTION_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `IN_PROCESS_REJECT_RATE` | operating_metric | runtime_calculated_metrics, legacy_aliases, gate_control_metrics, proposed_operating_metrics | retained / not_declared_or_informational |  |
| `JOB_COST_ACCURACY` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `KPI_RED_ACTION_CLOSURE` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `KPI_REGISTRY_DRIFT_COUNT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `MRP_EXCEPTION_AGING` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `MSA_READINESS` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `MTBF` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `MTTR` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `NCR_3D_RESPONSE_SLA` | operating_metric | runtime_calculated_metrics, dashboard_core_kpis, proposed_operating_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `NCR_4D_PRELIMINARY_SLA` | operating_metric | runtime_calculated_metrics, proposed_operating_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `NCR_8D_UPDATE_SLA` | operating_metric | runtime_calculated_metrics, dashboard_core_kpis, proposed_operating_metrics | runtime_calculated / runtime_calculated_with_registry_contract |  |
| `NCR_CAPTURE_COMPLETENESS` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `NEAR_MISS_REPORTING_QUALITY` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `NO_CONTAINMENT_COUNTER` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `NO_LATE_NO_NCR_COUNTER` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `OEE_BOTTLENECK` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `OJT_VERIFICATION_PASS_RATE` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `PACKAGING_LABEL_COC_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `PLAN_ADHERENCE_WITH_APPROVED_RESEQUENCE` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `POST_CHANGE_CPK_REVALIDATION` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `POS_AP_PAYMENT_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_AREA_5S_FOD_SCORE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_AUDIT_FINDING_CLOSURE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_AUDIT_FINDING_EFFECTIVENESS` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_AUDIT_PLAN_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_BACKUP_SUCCESS_RATE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_CAM_COLLISION_INCIDENTS` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_CAM_PROGRAM_FPY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_CAM_PROGRAM_ON_TIME` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_CAM_PROVEOUT_TIME` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_CLEANLINESS_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_CUSTOMS_CLEARANCE_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_CYCLE_COUNT_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_DEBURR_ESCAPE_RATE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_DEBURR_OUTPUT_ADHERENCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_DFM_ISSUE_CATCH_RATE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_DFM_REVIEW_ON_TIME` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_EXCESS_INVENTORY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_EXPORT_DOC_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_GL_RECONCILIATION_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_GOODS_RECEIPT_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_IE_IMPROVEMENT_DELIVERY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_INSPECTION_ESCAPE_RATE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_INSPECTION_THROUGHPUT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_MAINT_RESPONSE_TIME` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_NCR_INVESTIGATION_QUALITY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_OP_MACHINE_UPTIME` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_OP_OUTPUT_ADHERENCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_OP_PART_ACCEPT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PACKAGING_DEFECT_RATE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PACKAGING_OUTPUT_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PAYMENT_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PAYROLL_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PAYROLL_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PICK_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PM_BREAKDOWN_RATIO` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PM_SCHEDULE_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PO_CYCLE_TIME` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PPAP_SUBMISSION_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PROCESS_VALIDATION_OT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_PURCHASE_PRICE_VARIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_ROUTING_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_SAFETY_PPE_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_SELF_INSPECTION_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_SETUP_DOC_QUALITY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_SETUP_SHEET_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_SETUP_TIME_VARIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_SHIPMENT_DELAY_RATE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_STD_TIME_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_STOCKOUT_RATE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_SYSTEM_PATCH_COMPLIANCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_TEAM_BACKLOG_AGING` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_TOOL_AVAILABILITY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_TOOL_INVENTORY_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_TOOL_LIFE_ADHERENCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `POS_TOOL_PRESET_ACCURACY` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `PROJECT_PLAN_DEVIATION_COMMUNICATION_LT` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `PROMISE_DATE_RISK` | operating_metric | legacy_aliases, proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `QC_HOLD_SLA` | operating_metric | legacy_aliases, dashboard_core_kpis, proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `QUOTE_MARGIN_ACCURACY` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `QUOTE_PACKAGE_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `REPEAT_NCR_RATE` | operating_metric | legacy_aliases, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `RFQ_COMPLETENESS_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `RFQ_TURNAROUND_TIME_FOR_COMPLETE_RFQ` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `ROUTING_BOM_CHANGE_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `SETUP_FIRST_PASS` | operating_metric | legacy_aliases, gate_control_metrics, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `SHIFT_HANDOVER_RFT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `SHORTAGE_RECOVERY_OT` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `SUBTIER_REQUIREMENT_FLOWDOWN` | operating_metric | gate_control_metrics, proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `SUPPLIER_RBA_COMPLIANCE_EVIDENCE` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `SUPPLIER_READINESS` | operating_metric | dashboard_core_kpis, proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `THROUGHPUT_PER_CONSTRAINT_HOUR` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |
| `TIMESHEET_EXCEPTION_AGING` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `TIME_ENTRY_COMPLIANCE` | operating_metric | legacy_aliases, proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `TOOL_FIXTURE_READY_TO_PLAN` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `TRAINING_AS_CAPA_COUNTER` | operating_metric | proposed_operating_metrics | not_declared / not_declared_or_informational |  |
| `TRAINING_MATRIX_FRESHNESS` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `TRAINING_RECORD_INTEGRITY` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `TRANSACTION_SYNC_RELIABILITY` | operating_metric | proposed_operating_metrics | manual_governed / not_declared_or_informational |  |
| `WIP_BEFORE_CONSTRAINT` | operating_metric | proposed_operating_metrics | staged_data_contract / candidate_data_contract_required_before_payout |  |

## Benchmark Rule

- NIST Baldrige: KPI must support review, decision, improvement, and strategic objectives.
- ISA-95: KPI/dashboard is a read model across ERP/MOM/MES boundaries, not execution truth.
- SAP manufacturing/OEE: OEE needs availability, performance, quality, resource/order context, and reason codes.
- SAP calibration/variable pay: rating and reward require workflow and calibration, not automatic raw metric payout.
