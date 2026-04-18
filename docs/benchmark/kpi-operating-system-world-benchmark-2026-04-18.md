# KPI Operating System World Benchmark - 2026-04-18

## Kết Luận Ngắn

Với công ty gia công cơ khí CNC, hệ KPI tốt nhất không phải là một danh sách KPI thật dài. Mô hình thực chiến nên là:

1. 12-15 KPI cấp lãnh đạo để giữ hướng chiến lược.
2. 33 KPI governance để cascade theo doanh nghiệp, value stream và phòng ban.
3. 60-75 operational metrics được kiểm soát bằng data contract.
4. Role Performance Measures trong JD, không tính là KPI doanh nghiệp nếu chưa map registry.
5. API phải phân biệt `runtime_calculated`, `governance_only`, `gate_metric`, `role_measure`, `staged_data_contract`.
6. Không dùng để đánh giá thì không gọi KPI; nếu chỉ dùng để điều hành thì gọi là metric/control indicator.

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
| [SAP SuccessFactors Performance Rating Options](https://help.sap.com/docs/successfactors-performance-and-goals/implementing-and-managing-performance-management/rating-options) | Performance rating là workflow có quyền, route map và rating field rõ; KPI không tự biến thành điểm đánh giá nếu chưa qua form/review. |
| [SAP SuccessFactors Calibration](https://help.sap.com/docs/successfactors-performance-and-goals/implementing-and-managing-calibration/overview-of-calibration) | Rating cần calibration để giảm bias và tạo thảo luận khách quan trước khi chốt điểm. |
| [SAP SuccessFactors Variable Pay Rating Source](https://help.sap.com/docs/successfactors-compensation/implementing-and-managing-variable-pay/configuring-rating-source-for-non-assignment-based-rating-programs) | Variable pay lấy rating từ performance review theo cấu hình; không nên trả thưởng trực tiếp từ một metric thô. |
| [Microsoft Viva Goals Check-ins](https://learn.microsoft.com/en-us/viva/goals/viva-goals-healthy-okr-program/check-in-okrs-overview) | OKR cần check-in, owner, cadence và data source; phù hợp cho dự án cải tiến, không thay BSC/QMS KPI. |

## Nhận Định Cho CNC

KPI cấp lãnh đạo nên ít và có quyền quyết định rõ. Bộ tối ưu cho gia công CNC là 15 KPI: OTD, complaint rate, gross margin by job family, throughput per constraint hour, COPQ, FPY, OEE bottleneck, WIP aging, setup first-pass, FAI first-pass, repeat NCR, CAPA effectiveness, supplier readiness, critical-role certification coverage và recordable incident rate.

Điểm chỉnh so với bộ trước là hạ `IN_PROCESS_REJECT_RATE` xuống Lean Daily / FPY drilldown, gộp `SUPPLIER_OTD` và `SUPPLIER_QUAL` thành `SUPPLIER_READINESS`, đồng thời đưa `GROSS_MARGIN_JOB_FAMILY` và `COMPLAINT_RATE` lên scorecard lãnh đạo. Cách này giảm thiên lệch vào chất lượng nội bộ và bổ sung trục tài chính/khách hàng đúng BSC.

KPI cấp vận hành có thể nhiều hơn, nhưng phải chia lớp:

| Lớp | Mục đích | Ví dụ metric |
|---|---|---|
| Hoshin năm | Chọn breakthrough và nguồn lực | OTD, gross margin, customer escape, BCP readiness |
| BSC tháng/quý | Review kết quả cân bằng | FPY, COPQ, supplier quality, training completion |
| TOC tuần | Điều hành nút thắt | OEE bottleneck, buffer status, constraint lost hours, WIP before constraint |
| Lean daily theo ca/ngày | Phản ứng tại hiện trường | setup first-pass, in-process reject, downtime impact, cycle-time variance |
| QMS/MES gate event | Bằng chứng theo sự kiện | FAI first-pass, ship packet completeness, traceability completeness |

## Performance Governance

Audit nội bộ ngày 2026-04-18 cho thấy sau khi giảm nhiễu alias `SETUP`, toàn bộ `mom/docs` có 297 file dùng ngôn ngữ KPI/metric trong ngữ cảnh KPI. Trong đó 24 file thiếu tín hiệu đánh giá/review, 106 file thiếu ghi nhận/khen thưởng, 18 file thiếu corrective/discipline và 78 dòng KPI/target thiếu people-governance tại dòng.

Kết luận thực chiến: không nên sửa bằng cách thêm thưởng phạt vào mọi tài liệu. Cách tốt hơn là đưa một policy trung tâm vào ANNEX-127 và bắt mọi KPI chính thức khai báo đủ schema. Nếu một chỉ số không được dùng cho đánh giá thì rename ngay:

| Loại | Tên đúng | Cơ chế |
|---|---|---|
| Scorecard chính thức | KPI | Dùng trong Hoshin/BSC/review, có owner, target, evidence, rating method, recognition và corrective action. |
| Điều hành ca/ngày/tuần | Operating Metric | Dùng để ra hành động, escalation, coaching; không thưởng/phạt trực tiếp. |
| Cổng QMS/MES | Gate Control Metric | Dùng hold/release hoặc chứng minh gate; kỷ luật chỉ khi bypass, giả dữ liệu hoặc tái phạm sau coaching. |
| JD/OJT/competency | Role Performance Measure | Dùng đánh giá năng lực vai trò; không là KPI doanh nghiệp nếu chưa map registry. |
| Theo dõi sức khỏe hệ thống | Health Indicator | Chỉ để nhận biết xu hướng; không rating, không reward, không discipline. |

World-class pattern từ NIST, SAP và Microsoft đều tách ba lớp: measurement, review/calibration, và compensation/recognition. Với CNC, discipline không nên gắn vào kết quả đơn lẻ như OTD/OEE vì nhiều nguyên nhân nằm ngoài người vận hành: vật tư, fixture, gage, CMM, chương trình, máy, thay đổi khách hàng hoặc quyết định nguồn lực. Discipline chỉ hợp lệ khi có bằng chứng hành vi kiểm soát được: giả dữ liệu, bỏ gate, hành vi mất an toàn, tái phạm sau coaching, hoặc cố ý không theo procedure.

## Quy Tắc Schema/API

Mỗi metric trong registry cần tối thiểu:

- `canonical_code`
- `decision_purpose`
- `evaluation_use`
- `evaluation_scope`
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
- `rating_method`
- `rag_thresholds`
- `evidence_record`
- `exception_rule`
- `recognition_rule`
- `corrective_action_rule`
- `discipline_guardrail`
- `anti_gaming_guardrail`

API KPI không được trả số giả cho metric chưa đủ data contract. Endpoint catalog phải trả coverage rõ ràng:

- `runtime_calculated`: có calculator trong backend.
- `widget_only`: có widget/read model nhưng chưa là calculator chuẩn.
- `governance_only`: KPI governance đã duyệt nhưng chưa tự động tính.
- `gate_metric`: metric theo cổng kiểm soát, không tính vào 33 governance KPI.
- `role_measure`: measure trong JD, dùng đánh giá vai trò, không tự động thành KPI công ty.
- `staged_data_contract`: đã đề xuất nhưng cần nguồn dữ liệu, formula, owner và test trước khi runtime.

Endpoint catalog phải trả thêm `performance_governance_policy` và `performance_governance_audit` để frontend, dashboard và reviewer biết một metric có được gọi là KPI hay chưa.

Từ 2026-04-18, catalog cũng phải trả per-metric operating contract:

- `metric_type`
- `usage_types`
- `is_official_kpi`
- `result_type`
- `strategic_intent`
- `motive`
- `expected_result`
- `decision_purpose`
- `evaluation_use`
- `evaluation_scope`
- `accountable_owner`
- `review_cadence`
- `review_forum`
- `rating_method`
- `counter_metric`
- `consequence`
- `data_contract`
- `anti_gaming_guardrail`
- `controllability_scope`

Nguyên tắc vận hành: metric nào không có ý đồ, động cơ hành vi, kết quả kỳ vọng, owner, evidence và consequence thì chưa được gọi KPI. Metric có thể rất quan trọng nhưng vẫn phải gọi đúng tên là operating metric, gate control metric, role performance measure hoặc health indicator.

## Trọng Số, Đánh Giá Và Khen Thưởng

Mô hình thực chiến cho HESEM là `CNC-EXEC-BSC-15-2026`: 15 KPI lãnh đạo, tổng trọng số 100%, review monthly/quarterly. Weight đề xuất:

| KPI | Weight |
|---|---:|
| OTD | 10% |
| COMPLAINT_RATE | 8% |
| GROSS_MARGIN_JOB_FAMILY | 8% |
| THROUGHPUT_PER_CONSTRAINT_HOUR | 8% |
| COPQ | 7% |
| FPY | 8% |
| OEE_BOTTLENECK | 8% |
| WIP_AGING | 6% |
| SETUP_FIRST_PASS | 6% |
| FAI_FIRST_PASS | 7% |
| REPEAT_NCR_RATE | 6% |
| CAPA_EFFECTIVENESS | 6% |
| SUPPLIER_READINESS | 5% |
| CRITICAL_ROLE_CERT_COVERAGE | 4% |
| RECORDABLE_INCIDENT_RATE | 3% |

Rating dùng 5 trạng thái: stretch = 110% achievement, green = 100%, yellow = 50%, red = 0%, blocked = 0%. Tổng điểm = tổng `weight x achievement`. ≥90 là xanh, 75-89.99 là vàng, <75 là đỏ.

Khen thưởng không được tự động hóa từ điểm KPI. KPI chỉ là input cho calibration HR/QMS/CEO. Điều kiện xem xét recognition: tổng điểm ≥90, không có KPI đỏ lặp lại, không có blocker mở. Blocker gồm recordable incident hoặc serious near miss action overdue, data falsification, gate bypass, customer escape chưa containment, major audit nonconformance quá hạn, hoặc counter-metric đỏ. Cách này bám đúng benchmark SAP SuccessFactors: rating, calibration và variable pay là workflow có kiểm soát, không phải lấy số thô để trả thưởng.

## Đề Xuất Thực Thi

Giữ 33 KPI ANNEX-122 làm governance cascade. Không nâng toàn bộ KPI trong JD/training thành KPI chính thức. Bổ sung API `/api/kpi/catalog` để nhìn coverage và chặn nhầm lẫn giữa “có trong tài liệu” với “backend tính được”.

Ưu tiên backend tiếp theo nên là data contract cho 8 metric CNC có giá trị điều hành cao: `OEE_BOTTLENECK`, `WIP_AGING`, `SETUP_FIRST_PASS`, `FAI_FIRST_PASS`, `IN_PROCESS_REJECT_RATE`, `REPEAT_NCR_RATE`, `CAPA_EFFECTIVENESS`, `THROUGHPUT_PER_CONSTRAINT_HOUR`.

Ưu tiên tài liệu tiếp theo là sửa nhãn trong training/JD/WI: các dòng như “Báo cáo KPI đúng hạn”, “OTD nhiệm vụ”, “OEE cải thiện khu vực” nên trở thành `Role Performance Measure` hoặc `Operating Metric` trừ khi được map vào registry với evaluation use và consequence rule.
