# Risk register chống KPI gaming và bất công

KPI thực chiến phải kéo hành vi đúng. Nếu thiếu counter-metric và attribution rule, KPI sẽ trở thành công cụ làm đẹp số hoặc đổ lỗi.

## 1. Risk register tổng quát

| KPI / nhóm KPI | Hành vi gaming có thể xảy ra | Dấu hiệu audit | Counter-metric / guardrail | Action |
|---|---|---|---|---|
| OTD | Giao thiếu, giao gấp tốn chi phí, bỏ kiểm để kịp hạn | Nhiều partial shipment, expedite premium tăng, complaint tăng | Expedited/short-shipment rate, FINAL_RELEASE_RFT, COMPLAINT_RATE | Review OTD cùng quality/cost |
| PLAN_ADHERENCE | Không cập nhật kế hoạch thật; đổi lịch sau khi trễ | Change log sát deadline, kế hoạch bị “backdate” | Approved resequence log, OTD, WIP_AGING | Lock plan baseline, record reason |
| FPY / FAI_FIRST_PASS | Sửa trước khi ghi nhận, re-inspect không tính | Nhiều repair trước record, thiếu first-attempt evidence | Pre-count rework pass, post-FAI leakage | Ghi nhận first attempt bắt buộc |
| DPMO | Giảm số cơ hội lỗi, đổi defect thành observation | Opportunity count bất thường thấp | Defect opportunity audit | QA chuẩn hóa opportunity model |
| NCR_RATE | Không mở NCR, đổi NCR thành informal fix | Complaint/defect cao nhưng NCR thấp | Late/suppressed NCR rate | Audit cross-check with inspection/complaint |
| NCR_CLOSURE_AGING | Dồn đóng cuối kỳ, đóng nhưng chưa verify | Spike closure cuối tháng, reopen cao | Reopen rate, effectiveness overdue | Aging theo ngày mở; verify separate |
| CAPA_CLOSURE | Đóng action hình thức | CAPA closed nhưng repeat NCR tăng | CAPA_EFFECTIVENESS, repeat NCR | Reward không dựa closure alone |
| SETUP_RATIO / SETUP_TIME_VARIANCE | Rút setup bằng cách bỏ kiểm/cleaning | First piece defect tăng | SETUP_FIRST_PASS, skipped checklist | Pair with first-piece quality |
| OEE / MACHINE_UTIL | Chạy máy không cần thiết để tăng utilization | WIP tăng, constraint vẫn idle | Throughput per constraint hour, WIP aging | Không thưởng utilization đơn lẻ |
| THROUGHPUT | Chạy job dễ/high volume, bỏ job ưu tiên | Customer priority late, WIP mix lệch | Priority skip rate, OTD | Throughput theo constraint + priority |
| SUPPLIER_OTD | Đổi due date PO sau khi supplier trễ | PO due date revisions | Due-date-change audit | Lock original committed due date |
| SUPPLIER_QUAL | Nới IQC hoặc skip cert để accept | Later material NCR, cert mismatch | Mill-cert mismatch, IQC audit | QA hold if evidence missing |
| MATERIAL_AVAILABILITY_PLAN | Release partial kit để đạt số | Machines starve mid-job | Partial kit release rate | Full-kit rule unless approved exception |
| INVENTORY_ACCURACY | Adjust stock trước cycle count | Adjustment spike before count | Phantom adjustment rate | Freeze/location audit |
| GROSS_MARGIN | Không ghi rework/warranty cost | COPQ unrecorded, hidden labor | Hidden job cost, rework cost completeness | FIN/QA reconcile |
| RECORDABLE_INCIDENT_RATE | Giấu near miss/incident | Near-miss báo cáo thấp bất thường | Near-miss reporting rate | Safety culture, no blame reporting |
| TRAINING_COMP | Hoàn thành online cho đủ, không đủ năng lực | Competency failures, audit finding | Competency check pass rate | Training complete != certified |
| SERVICE_TICKET_SLA | Đóng ticket tạm rồi mở lại | Reopened tickets | Reopen rate | SLA counts only if no reopen within window |
| INVOICE_RFT | Không phát hành để tránh lỗi | Ship-to-invoice LT tăng | Ship-to-invoice lead time | Pair billing quality + speed |
| CRITICAL_SYSTEM_AVAILABILITY | Không tạo outage ticket | User reports without incident logs | Unplanned outage no-ticket count | Monitoring/incident audit |

## 2. Quy tắc reward eligibility

Một KPI chỉ được `reward_eligible=true` khi:

1. Owner kiểm soát được phần lớn đòn bẩy hoặc attribution rule tách nguyên nhân.
2. Có counter-metric cụ thể, không dùng câu chung “đảm bảo chất lượng”.
3. Có min_sample nếu là tỷ lệ.
4. Có data source có audit trail.
5. Không phải `staged_data_contract`.
6. Không vi phạm safety/customer/data-integrity blocker.
7. Được review theo bundle, không thưởng một chỉ số đơn lẻ.

Nếu không thỏa, KPI có thể vẫn là operating metric/gate metric nhưng `reward_eligible=false`.

## 3. Rule attribution công bằng

KPI đỏ phải được phân loại nguyên nhân trước khi quy trách nhiệm:

- Do khách đổi yêu cầu: CS/PD ghi change event; không phạt WKM/PPL.
- Do supplier/material: SCM chịu action; PD chỉ chịu recovery coordination.
- Do engineering package lỗi: ENGM/CAM action; WKM không chịu toàn bộ.
- Do máy hỏng đột xuất: WKM/MNT phân biệt PM miss vs random failure.
- Do QA hold hợp lệ: QA không bị tính “làm trễ” nếu hold đúng gate.
- Do quản lý thiếu nguồn lực: lên Hoshin/resource review, không phạt cá nhân.

## 4. Điều kiện “blocked recognition”

Bất kỳ điều kiện nào sau đây mở thì khóa ghi nhận/thưởng dù score xanh:

- Có customer escape nghiêm trọng chưa containment.
- Có safety incident nghiêm trọng chưa điều tra.
- Có bằng chứng bypass gate hoặc giả dữ liệu.
- Có KPI staged được tính vào score.
- Có counter-metric đỏ chưa action.
- Có audit finding về hồ sơ KPI/evidence.

## 5. Checklist soi mỗi KPI

- Số này có thể bị làm đẹp bằng cách nào?
- Bộ phận nào có thể bị “đỏ oan”?
- Có dữ liệu nào độc lập để kiểm tra chéo?
- Có hành vi tốt nào bị KPI phạt không?
- Nếu owner tối ưu KPI này 100%, khách hàng/safety/quality/cash có bị hại không?
- Counter-metric có cùng cadence và cùng review forum không?
