# KPI Operating System World Benchmark - 2026-04-18

## Kết Luận Ngắn

Với công ty gia công cơ khí CNC, hệ KPI tốt nhất không phải là một danh sách KPI thật dài. Mô hình thực chiến nên là:

1. 12-15 KPI cấp lãnh đạo để giữ hướng chiến lược.
2. 33 KPI governance để cascade theo doanh nghiệp, value stream và phòng ban.
3. 60-75 operational metrics được kiểm soát bằng data contract.
4. Role Performance Measures trong JD, không tính là KPI doanh nghiệp nếu chưa map registry.
5. API phải phân biệt `runtime_calculated`, `governance_only`, `gate_metric`, `role_measure`, `staged_data_contract`.

## Chuẩn Đối Sánh

| Nguồn | Ý nghĩa áp dụng cho HESEM MOM |
|---|---|
| [ISA-95](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | Tách rõ Level 3 MOM/MES với Level 4 ERP; KPI dashboard là read model, execution truth vẫn thuộc service path vận hành. |
| [NIST Baldrige Excellence Framework](https://www.nist.gov/baldrige/publications/baldrige-excellence-framework) | Hệ đo lường phải gắn với chiến lược, review, cải tiến và resilience, không chỉ là bảng số. |
| [NIST Baldrige Criteria Commentary](https://www.nist.gov/baldrige/baldrige-criteria-commentary) | Performance measurement cần tích hợp dữ liệu tài chính và phi tài chính để hỗ trợ planning, review và cải tiến. |
| [MTConnect Standard](https://www.mtconnect.org/standard-download20181) | Dữ liệu máy cần model/semantic chuẩn; phù hợp để cấp tín hiệu OEE, downtime, condition, nhưng vẫn cần contextualize theo job/operation/gate. |
| [SAP Production Quality KPIs](https://help.sap.com/docs/SAP_PROFITABILITY_PERFORMANCE_MANAGEMENT/7fa13890d47b4c69bbb62175e84e4aa8/894ac627ba26422eb92a9cd17db846e8.html) | OEE nên tách Availability, Performance, Quality và liên kết production order/plant. |
| [SAP Monitor Production Plan Performance](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/f899ce30af9044299d573ea30b533f1c/55a4997f55b0455aa8239f6b50175097.html) | Planning KPI cần có resource idle time, load, production time, setup time, capacity và utilization. |
| [SAP Line Monitor OEE KPIs](https://help.sap.com/docs/sap-digital-manufacturing/pod-designer/line-monitor-oee-kpis) | OEE dashboard phải nhìn theo work center/line và giữ đủ 3 thành phần A/P/Q. |
| [SAP Production Execution Duration](https://help.sap.com/docs/SAP_S4HANA_CLOUD/2bba750d1e124e1ea2a039bb1cd9b6c5/b62f6957b64b0222e10000000a44147b.html) | Cycle-time variance nên so planned vs actual operation duration từ routing/order confirmation. |
| [Siemens Opcenter Execution Foundation OEE](https://www.siemens.com/en-us/products/opcenter/execution/foundation-oee/) | OEE thực chiến cần machine state, time model, reason tree, downtime, alarm và corrective action, không chỉ công thức cuối. |
| [Siemens Performance Insight](https://www.siemens.com/en-us/products/simatic/performance-insight/) | Machine KPI layer nên có OEE, MTBF, MTTR, TEEP, dashboard theo asset và báo cáo định kỳ. |

## Nhận Định Cho CNC

KPI cấp lãnh đạo nên ít và có quyền quyết định rõ: OTD, FPY, OEE bottleneck, WIP aging, setup first-pass, FAI first-pass, in-process reject, COPQ, repeat NCR, CAPA effectiveness, supplier OTD/quality, critical-role certification, safety incident và throughput per constraint hour.

KPI cấp vận hành có thể nhiều hơn, nhưng phải chia lớp:

| Lớp | Mục đích | Ví dụ metric |
|---|---|---|
| Hoshin năm | Chọn breakthrough và nguồn lực | OTD, gross margin, customer escape, BCP readiness |
| BSC tháng/quý | Review kết quả cân bằng | FPY, COPQ, supplier quality, training completion |
| TOC tuần | Điều hành nút thắt | OEE bottleneck, buffer status, constraint lost hours, WIP before constraint |
| Lean daily theo ca/ngày | Phản ứng tại hiện trường | setup first-pass, in-process reject, downtime impact, cycle-time variance |
| QMS/MES gate event | Bằng chứng theo sự kiện | FAI first-pass, ship packet completeness, traceability completeness |

## Quy Tắc Schema/API

Mỗi metric trong registry cần tối thiểu:

- `canonical_code`
- `decision_purpose`
- `formula_numerator`
- `formula_denominator`
- `unit`
- `higher_or_lower_is_better`
- `period_grain`
- `source_system`
- `source_table_or_record`
- `drilldown_key`
- `data_owner`
- `process_owner`
- `review_cadence`
- `rag_thresholds`
- `evidence_record`
- `exception_rule`

API KPI không được trả số giả cho metric chưa đủ data contract. Endpoint catalog phải trả coverage rõ ràng:

- `runtime_calculated`: có calculator trong backend.
- `widget_only`: có widget/read model nhưng chưa là calculator chuẩn.
- `governance_only`: KPI governance đã duyệt nhưng chưa tự động tính.
- `gate_metric`: metric theo cổng kiểm soát, không tính vào 33 governance KPI.
- `role_measure`: measure trong JD, dùng đánh giá vai trò, không tự động thành KPI công ty.
- `staged_data_contract`: đã đề xuất nhưng cần nguồn dữ liệu, formula, owner và test trước khi runtime.

## Đề Xuất Thực Thi

Giữ 33 KPI ANNEX-122 làm governance cascade. Không nâng toàn bộ KPI trong JD/training thành KPI chính thức. Bổ sung API `/api/kpi/catalog` để nhìn coverage và chặn nhầm lẫn giữa “có trong tài liệu” với “backend tính được”.

Ưu tiên backend tiếp theo nên là data contract cho 8 metric CNC có giá trị điều hành cao: `OEE_BOTTLENECK`, `WIP_AGING`, `SETUP_FIRST_PASS`, `FAI_FIRST_PASS`, `IN_PROCESS_REJECT_RATE`, `REPEAT_NCR_RATE`, `CAPA_EFFECTIVENESS`, `THROUGHPUT_PER_CONSTRAINT_HOUR`.
