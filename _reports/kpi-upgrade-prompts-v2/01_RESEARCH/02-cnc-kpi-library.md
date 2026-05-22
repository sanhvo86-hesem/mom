# Thư viện KPI thực chiến cho công ty gia công CNC

Tài liệu này là thư viện tham khảo để Claude Code không tự nghĩ KPI theo cảm tính. Mỗi KPI ở đây phải được xử lý theo nguyên tắc: chỉ được gọi là KPI khi có quyết định thật, owner có quyền xử lý, công thức định lượng, nguồn dữ liệu hoặc form/log cụ thể, ngưỡng xanh/vàng/đỏ, min_sample nếu là tỷ lệ, action rule, và counter-metric chống gaming.

## 1. Cấu trúc phân tầng khuyến nghị

Không gom tất cả chỉ số thành “KPI công ty”. Phân tầng đúng giúp số đi vào đời sống sản xuất.

| Lớp | Mục đích | Số lượng nên thấy | Ví dụ |
|---|---|---:|---|
| Company scorecard | Điều hành tháng/quý, Hoshin, review ban giám đốc | 12–18 | OTD, complaint escape, FPY, gross margin, recordable incident |
| Weekly TOC / constraint | Bảo vệ điểm thắt cổ chai, kéo throughput | 6–10 | constraint lost hours, bottleneck buffer, throughput per constraint hour |
| Daily tier meeting | Phản ứng trong ngày/tuần | 12–25 tùy quy mô | plan adherence, WIP aging, material shortage, FAI queue |
| Gate control metric | Hold/release công việc theo G0→G7 | ≥1 mỗi gate | RFQ turnaround, control-plan readiness, FAI first pass |
| Department scorecard | Quản trị phòng ban | 3–7 mỗi phòng | engineering release OT, supplier readiness, invoice RFT |
| Role performance measure | JD/OJT/đào tạo, không phải KPI doanh nghiệp nếu không dùng scorecard | 3–5 mỗi role | setup document quality, CAM program FPY |
| Health indicator | Theo dõi nhưng không đánh giá/thưởng | tùy nhu cầu | system latency, document search usage |

## 2. Bộ KPI công ty / scorecard điều hành đề xuất

Các KPI này chỉ nên nằm trong scorecard điều hành nếu `runtime_calculated` hoặc `manual_governed` có form nhập, evidence và review. Nếu còn `staged_data_contract`, hiển thị trong backlog chứ không tính điểm thưởng.

| Mã | Tên Việt | Loại | Owner | Công thức cốt lõi | Nguồn | Action đỏ | Counter-metric |
|---|---|---|---|---|---|---|---|
| OTD | Giao hàng đúng hạn | KPI lag | PD/CS | Lô delivered đúng hoặc trước ngày cam kết / tổng lô delivered | shipments | Daily recovery review trong 24h, phân loại nguyên nhân | Expedited/short-shipment rate |
| COMPLAINT_RATE | Lỗi thoát ra khách hàng | KPI lag | QA/CS | Customer NCR × 1,000,000 / shipment hoặc part shipped | ncr_records + shipments | Containment + customer notification + CAPA | Late/suppressed complaint logging |
| FINAL_RELEASE_RFT | Phát hành cuối đúng ngay lần đầu | KPI lag/gate | QA | Release package pass lần đầu / tổng release package | final release/inspection | Stop release gate, sửa checklist/hồ sơ | Post-release defect escape |
| FPY | First Pass Yield | KPI lag | QA/WKM | Good first-pass units / inspected units | inspection_results | Pareto lỗi theo process/machine/job family | Pre-count rework/check bypass |
| OEE_BOTTLENECK | OEE điểm thắt cổ chai | KPI driver | WKM | OEE chỉ tính trên máy/nhóm constraint hiện tại | equipment_logs + constraint registry | Bảo vệ lịch constraint, clear blockers | Constraint idle while non-constraint runs |
| THROUGHPUT_PER_CONSTRAINT_HOUR | Throughput trên giờ constraint | KPI driver | PD/FIN/WKM | Throughput value / constraint productive hour | job_orders + equipment_logs + invoice/cost | Rebalance product mix/priority | Scrap/NCR rate |
| WIP_AGING | WIP tồn quá tuổi | KPI lead | PPL/WKM | WIP quá ngưỡng tuổi / tổng WIP | job_orders | Tier escalation, remove queue blockers | Priority-skip rate |
| PLAN_ADHERENCE | Tuân thủ kế hoạch sản xuất | KPI lead | PPL | Operations completed as planned / scheduled operations | job_orders/schedule | Recovery plan, phân biệt controlled resequence | OTD + WIP aging |
| COPQ | Chi phí chất lượng kém | KPI lag | QA/FIN | Scrap + rework + warranty + NCR cost | ncr_records + cost records | CAPA portfolio + cost review | Unrecorded poor-quality cost |
| GROSS_MARGIN_JOB_FAMILY | Biên gộp theo nhóm job/sản phẩm | KPI lag | FIN/CEO | (Revenue - COGS) / revenue by family | invoices + job cost | Price/product mix review | Hidden/unallocated job cost |
| RECORDABLE_INCIDENT_RATE | Tỷ lệ sự cố ghi nhận | KPI safety | EHS | Recordable incidents × 200k / labor hours | ehs_incidents + labor hours | Stop-work/investigation within 24h | Near-miss reporting rate |
| BCP_READINESS | Sẵn sàng liên tục kinh doanh | KPI lead/manual | QMS/HR/IT | Critical functions with backup/drill / total critical functions | manual form + role backup registry | Fill gaps, CEO quarterly review | Drill failure rate |

## 3. KPI flow / TOC cho xưởng CNC job-shop

Đây là nhóm thường thiếu trong hệ KPI “đẹp giấy”. Gia công CNC job-shop có lô nhỏ, nhiều thay đổi, routing phức tạp; đo OEE chung dễ che mất điểm thắt cổ chai. Phải có nhóm TOC để quyết định ưu tiên, buffer, vật tư, setup và lịch máy.

| Mã đề xuất | Tên Việt | Mục đích quyết định | Công thức | Nguồn | Trạng thái gợi ý |
|---|---|---|---|---|---|
| CONSTRAINT_LOST_HOURS | Giờ mất tại điểm thắt cổ chai | Bảo vệ constraint; quyết định kaizen/maintenance/material escalation | Giờ constraint không tạo output do blocker | equipment_logs + downtime reasons + schedule | staged → runtime nếu có reason codes |
| BOTTLENECK_BUFFER_STATUS | Tình trạng buffer trước điểm thắt | Biết constraint sắp đói việc hoặc nghẽn | Số giờ/queue buffer trước constraint so với target buffer | job_orders + route queue | staged |
| THROUGHPUT_PER_CONSTRAINT_HOUR | Throughput/giờ constraint | Định giá mix và ưu tiên job | Throughput value / productive constraint hour | job_orders + cost/invoice + equipment_logs | staged/runtime |
| CONSTRAINT_SCHEDULE_ADHERENCE | Tuân thủ lịch constraint | Ngăn đổi lịch tùy tiện trên nút thắt | Constraint operations completed as scheduled / planned operations | schedule + logs | staged |
| SETUP_FIRST_PASS | Setup đạt ngay lần đầu | Giảm downtime + lỗi mẻ đầu | Setup jobs that pass first-piece / total setups | setup log + FAI/first piece | staged/manual |
| CYCLE_TIME_VARIANCE | Sai lệch cycle time so chuẩn | Cập nhật định mức, tìm tooling/program issue | (actual cycle - standard cycle) / standard cycle | equipment/job logs + routing standards | staged/runtime |
| RUSH_ORDER_IMPACT | Tác động job gấp | Bảo vệ công bằng PLAN_ADHERENCE | Lost planned jobs/late risk due to approved rush orders | schedule change log | manual/staged |
| QUEUE_TIME_AT_CONSTRAINT | Thời gian chờ trước constraint | Nhìn WIP bị kẹt đúng chỗ | Avg/percentile queue time before constraint | MES queue/status timestamps | staged |

## 4. KPI chất lượng và QMS

| Mã | Tên Việt | Quyết định | Công thức | Counter |
|---|---|---|---|---|
| FAI_FIRST_PASS | FAI đạt ngay lần đầu | Có được nhả loạt không | FAI pass first attempt / total FAI | Post-FAI production defect leakage |
| FAI_CYCLE_TIME | Chu kỳ FAI | Có nghẽn ở QC/FAI không | Median/avg FAI complete time | Skipped FAI steps |
| DPMO | Lỗi trên một triệu cơ hội | So xu hướng lỗi theo family/process | Defects × 1e6 / opportunities | Defect opportunity undercount |
| NCR_RATE | Tỷ lệ NCR | QMS containment/CAPA | NCR / jobs/shipments | Late NCR creation |
| NCR_CLOSURE_AGING | NCR mở quá tuổi | Ngăn đẩy đóng kỳ sau | Open NCR older than SLA / open NCR | Bulk close without verification |
| REPEAT_NCR_RATE | Tái phát NCR | Đo hiệu lực CAPA | NCR with repeated cause within period / total NCR | Reclassification gaming |
| CAPA_CLOSURE | Đóng CAPA đúng hạn | Đảm bảo action không tồn | CAPA closed on time / due CAPA | Ineffective closure/reopened CAPA |
| CAPA_EFFECTIVENESS | Hiệu lực CAPA | Không chỉ đóng cho xong | CAPA verified effective / verified CAPA | Verification overdue rate |
| CONTROL_PLAN_PFMEA_APPROVAL | Control Plan/PFMEA duyệt trước baseline | G2/G3 readiness | Jobs with approved PFMEA/Control Plan before baseline / jobs requiring | Post-baseline engineering change due to missing controls |
| IQC_FIRST_PASS | IQC đạt ngay lần đầu | Supplier/material readiness | Incoming lots accepted first pass / incoming lots | Mill-cert mismatch rate |
| MILL_CERT_VERIFICATION | Đủ chứng chỉ vật liệu | Ngăn sai vật liệu | Lots with verified mill cert / required lots | False/late cert corrections |
| CUSTOMER_ESCAPE_NOTIFICATION_LT | Lead time thông báo escape | Bảo vệ khách hàng | Time detected escape → customer notice | Premature notification without containment |

## 5. KPI engineering / RFQ / APQP

| Mã | Tên Việt | Quyết định | Công thức | Counter |
|---|---|---|---|---|
| RFQ_TURNAROUND_TIME | Thời gian quay vòng RFQ | Tăng tốc quote nhưng không bỏ rủi ro | Business days RFQ complete → quote | Quote rework/customer clarification rate |
| QUOTE_HIT_RATE | Tỷ lệ quote thắng | Định giá và chọn phân khúc | Won quotes / qualified quotes | Low-margin won quote rate |
| ORDER_REVIEW_RFT | Review đơn hàng đúng ngay lần đầu | G1 pass | Orders released without review reopen / total orders | Missed requirement after release |
| ENGINEERING_RELEASE_ON_TIME | Phát hành kỹ thuật đúng hạn | Bảo vệ kế hoạch sản xuất | Eng packages released by need date / packages due | Engineering package defect rate |
| ECO_CLOSURE_AGING | ECO tồn quá tuổi | Quản trị thay đổi | Open ECO older than SLA / open ECO | Emergency ECO bypass count |
| PROGRAM_PROVEOUT_FP | Prove-out chương trình đạt ngay | Giảm sửa máy | NC programs proven first pass / total prove-outs | Post-release program revision |
| DRAWING_REQUIREMENT_CLARITY | Mức rõ yêu cầu bản vẽ | Ngăn quote/sản xuất thiếu thông tin | RFQ/orders requiring clarification / total | Over-rejection of RFQ due to ambiguity |

## 6. KPI supply chain / material

| Mã | Tên Việt | Quyết định | Công thức | Counter |
|---|---|---|---|---|
| SUPPLIER_OTD | Nhà cung cấp giao đúng hạn | Supplier escalation | POs/lines received on time / due lines | Expedite premium rate |
| SUPPLIER_QUAL | Chất lượng nhà cung cấp | Supplier scorecard | Accepted incoming / received | Under-inspection rate |
| SUPPLIER_READINESS | Sẵn sàng nhà cung cấp | Risk before job release | Critical materials/suppliers ready before release / required | Late substitute approval |
| MATERIAL_AVAILABILITY_PLAN | Vật tư sẵn sàng theo kế hoạch | Release work không kẹt vật tư | Jobs with all required material available before start / planned jobs | Partial kit release rate |
| INVENTORY_ACCURACY | Độ chính xác tồn kho | MRP/schedule reliability | Cycle count matches / count items | Phantom adjustment rate |
| INVENTORY_TURNS | Vòng quay tồn kho | Working capital | COGS / average inventory | Stockout/backorder rate |

## 7. KPI bảo trì / thiết bị

| Mã | Tên Việt | Quyết định | Công thức | Counter |
|---|---|---|---|---|
| MACHINE_UTIL | Hiệu suất sử dụng máy | Cân bằng tải | Run hours / available hours | Constraint idle rate |
| OEE | OEE chung | Health indicator/driver | Availability × performance × quality | Quality/scrap |
| MTBF | Thời gian trung bình giữa hai hỏng hóc | PM strategy | Operating time / failures | Underreported minor stops |
| MTTR | Thời gian sửa trung bình | Response/capacity maintenance | Downtime repair hours / failures | Repeat breakdown within 7 days |
| PM_SCHEDULE_COMPLIANCE | Tuân thủ PM | Preventive discipline | PM completed on time / due PM | Post-PM breakdown count |
| UNPLANNED_DOWNTIME_RATE | Dừng máy ngoài kế hoạch | Escalate recurring losses | Unplanned downtime / planned production time | Misclassified planned downtime |
| TOOL_LIFE_VARIANCE | Sai lệch tuổi dao | Tooling/cycle stability | Actual tool life vs expected | Quality defect after extended tool life |

## 8. KPI tài chính / hành chính / IT

| Mã | Tên Việt | Quyết định | Công thức | Counter |
|---|---|---|---|---|
| DSO | Số ngày thu tiền bình quân | Cash collection | Accounts receivable / daily sales | Dispute rate |
| INVOICE_RFT | Hóa đơn đúng ngay lần đầu | Billing quality | Invoices no correction / total invoices | Late invoice rate |
| SHIP_READY_TO_INVOICE_LT | Lead time giao→hóa đơn | Cash velocity | Time ship ready → invoice issued | Invoice reissue rate |
| SERVICE_TICKET_SLA | Ticket IT/SVC đúng SLA | Support reliability | Tickets closed in SLA / tickets due | Reopened ticket rate |
| CRITICAL_SYSTEM_AVAILABILITY | Sẵn sàng hệ thống trọng yếu | IT resilience | Uptime of critical systems | Unplanned outage with no ticket |
| MASTER_DATA_EXCEPTION_AGING | Ngoại lệ master data tồn quá tuổi | Data integrity | Open exceptions older than SLA / open exceptions | False closure rate |
| MONTH_END_CLOSE_OT | Đóng tháng đúng hạn | Finance discipline | Close milestones on time / total milestones | Post-close adjustment count |

## 9. KPI con người / năng lực / dự phòng

| Mã | Tên Việt | Quyết định | Công thức | Counter |
|---|---|---|---|---|
| TRAINING_COMP | Hoàn thành đào tạo | Readiness | Completed required training / assigned | Competency check failure |
| CRITICAL_ROLE_BACKUP_COVERAGE | Vai trò trọng yếu có người dự phòng | BCP/Deputy | Critical roles with certified backup / total | Backup failed in live drill |
| CRITICAL_ROLE_CERT_COVERAGE | Vai trò trọng yếu đủ chứng nhận | Gate năng lực | Roles with current competency evidence / critical roles | On-job defect tied to certified role |
| SAFETY_ONBOARDING_COMPLIANCE | Đào tạo an toàn đầu vào | Safety readiness | New employees completed safety onboarding before work / new employees | Near miss among new hires |
| SKILL_MATRIX_CURRENCY | Ma trận kỹ năng còn hiệu lực | Workforce planning | Skills verified current / required skills | Paper certification audit findings |

## 10. Gate metrics G0→G7

| Gate | Quyết định pass | KPI tối thiểu | CDR gợi ý |
|---|---|---|---|
| G0 RFQ / Feasibility | Nhận RFQ và đánh giá khả thi đủ nhanh, đủ rủi ro | RFQ_TURNAROUND_TIME, FEASIBILITY_REVIEW_COMPLETENESS, QUOTE_RISK_REVIEW_RFT | A*, B* tùy ANNEX-121 |
| G1 Contract / Order Review | Đơn vào sản xuất không thiếu yêu cầu | ORDER_REVIEW_RFT, CUSTOMER_REQUIREMENT_CLARITY | A/B |
| G2 Engineering Baseline | Bản vẽ, routing, program, PFMEA/Control Plan sẵn sàng | ENGINEERING_RELEASE_ON_TIME, CONTROL_PLAN_PFMEA_APPROVAL | B8, C*, D12 |
| G3 Material / Supplier Readiness | Vật tư và chứng chỉ sẵn sàng | MATERIAL_AVAILABILITY_PLAN, IQC_FIRST_PASS, MILL_CERT_VERIFICATION | D10 |
| G4 FAI / First Piece | Mẫu đầu đạt, hồ sơ FAI/PPAP đủ | FAI_FIRST_PASS, FAI_CYCLE_TIME, FAI_PACKET_COMPLETENESS | D1, D2, D12 |
| G5 In-process Control | Quá trình ổn định, phản ứng SPC/NCR đúng | IN_PROCESS_REJECT_RATE, SPC_SIGNAL_REACTION_TIME, NCR_OPEN_LT | D3, D4 |
| G6 Final Release | Gói release/CoC/traceability đủ | FINAL_RELEASE_RFT, SHIP_PACKET_COMPLETENESS, TRACEABILITY_DRILL_TIME | D8 |
| G7 Delivery / Post-delivery | Giao đúng, hóa đơn đúng, escape xử lý | OTD, SHIP_READY_TO_INVOICE_LT, CUSTOMER_ESCAPE_NOTIFICATION_LT | D7, D8, D11 |

## 11. KPI cần cảnh giác: nên hạ xuống metric/health nếu chưa có quyết định

Các nhóm sau dễ làm “KPI cho có” nếu không có action:
- Điểm 5S tổng hợp không gắn audit finding và FOD event.
- Số giờ đào tạo tổng không gắn competency check.
- Số ticket IT đóng nếu không có reopened ticket counter.
- OEE toàn nhà máy nếu không tách constraint/downtime reason.
- Tỷ lệ lỗi chung nếu không tách lot nhỏ/min_sample và cơ hội lỗi.
- KPI vị trí quá nhiều làm JD thành bảng phạt; giữ 3–5 role measures trọng yếu, còn lại làm OJT checklist.

## 12. Nguyên tắc chọn KPI cuối cùng

1. Mỗi KPI phải trả lời một câu hỏi quản trị cụ thể.
2. KPI công ty không quá nhiều; điều hành cần nhìn “đòn bẩy”, không nhìn toàn bộ dashboard.
3. KPI vận hành hằng ngày có thể nhiều hơn, nhưng phải có forum: Tier 1/2/3, owner, reaction time.
4. KPI gate phải có quyền hold/release; nếu metric không thể giữ cổng thì chỉ là evidence metric.
5. Không gắn thưởng vào KPI chưa đủ data contract/counter-metric/min_sample.
