# Catalog data contract cho KPI CNC

Mục tiêu của catalog này là giúp Claude Code phân biệt rõ KPI nào có thể tính thật, KPI nào phải nhập tay, KPI nào cần migration/integration, và KPI nào nên khai tử. Không được “giả runtime” bằng dữ liệu không thật.

## 1. Data contract 9 trường bắt buộc

Mỗi KPI phải có:

1. `canonical_code`: mã duy nhất.
2. `decision_purpose`: quyết định sử dụng số này.
3. `formula`: tử số, mẫu số, đơn vị, hướng tốt, rounding, exclusions, min_sample.
4. `period_rule`: cách chọn kỳ; ngày mở, ngày đóng hay ngày due.
5. `source_of_record`: hệ thống/bảng/cột thật hoặc form/log.
6. `evidence`: hồ sơ có thể audit.
7. `owner`: người có quyền xử lý kết quả.
8. `action_rule`: đỏ/vàng thì ai làm gì trong bao lâu.
9. `counter_metric`: bắt hành vi gaming.

## 2. Trạng thái dữ liệu

| Trạng thái | Điều kiện | Được lên scorecard? | Được tính thưởng? |
|---|---|---:|---:|
| `runtime_calculated` | Có bảng/cột thật, hàm `calc*`, test, trend/snapshot | Có | Có nếu có counter/min_sample |
| `manual_governed` / `manual` | Bản chất cần nhập tay, có form/log, owner, audit trail | Có nhưng ghi rõ manual | Chỉ nếu evidence mạnh và có counter |
| `staged_data_contract` | Có thiết kế nhưng thiếu bảng/cột/form/hàm | Không tính điểm; chỉ hiển thị backlog | Không |
| `retired` | Không cần/không đo/không ra quyết định | Không | Không |
| `health_indicator` | Theo dõi awareness, không review hiệu suất | Dashboard phụ | Không |

## 3. Nguồn dữ liệu trong MOM/ERP/MES/EQMS thường dùng

| Nguồn | KPI phù hợp | Cột cần có | Lưu ý |
|---|---|---|---|
| `shipments` | OTD, complaint denominator, ship-to-invoice | ship_date, delivery_date_actual, committed_date, status, customer, job/order | Phải lưu “ngày cam kết đã duyệt”, không dùng ngày ship tự phát |
| `job_orders` | Plan adherence, WIP aging, cycle variance, labor efficiency, material readiness | job_id, route/op, planned_start/end, actual_start/end, status, customer, product_family | Cần phân biệt resequence có duyệt và trễ thật |
| `equipment_logs` | OEE, utilization, downtime, MTBF/MTTR, constraint lost hours | machine_id, state, reason_code, start/end, job_id, planned/unplanned | Reason code là linh hồn; thiếu reason code thì OEE khó hành động |
| `inspection_results` | FPY, FAI, in-process reject, DPMO | inspection_type, result, defect_count, opportunity_count, first_pass, job/lot | Cần tách FAI, in-process, final |
| `ncr_records` | NCR rate, closure aging, repeat NCR, complaint escape | source, opened_at, closed_at, due_at, cause_code, repeat_flag, customer_notified_at | Aging đếm từ ngày mở để chống dồn đóng |
| `capa_records` | CAPA closure/effectiveness | opened_at, due_at, closed_at, effectiveness_due, verified_effective | Phân biệt đóng hành động và xác nhận hiệu lực |
| `engineering_change_requests` | ECO aging, engineering release | requested/released/due dates, status, reason | Emergency ECO/bypass phải là counter |
| `quotes` / `rfq_records` | RFQ turnaround, quote hit rate | received_at, complete_at, quoted_at, status, won/lost, margin_estimate | Cần mốc “RFQ đủ thông tin” để công bằng |
| `vendor_ratings` / `po_receipts` | Supplier OTD/quality/readiness | po_line_due, received_at, rejected_qty, cert_received | Nếu chỉ có vendor_ratings tổng hợp thì runtime partial |
| `wms_cycle_count_results` | Inventory accuracy | item, location, system_qty, count_qty, counted_at | Cần kiểm adjustment gaming |
| `ap_ar_invoices` | DSO, invoice RFT, ship-to-invoice | invoice_date, ship_ref, correction/reissue flag, AR balance | Cần liên kết shipment |
| `training_records` | Training, certification, backup coverage | employee, course, role, completion, expiry, competency_result | Training complete ≠ competency pass |
| `ehs_incidents` | recordable, incident action aging, near miss | type, severity, recordable, lost_days, action_due/closed | Near-miss counter chống giấu tai nạn |
| `kpi_manual_inputs` | Manual/gate/counter metrics | metric_code, period_start/end, value, breakdown, evidence_ref, entered_by, approval_status | Không dùng như đường tắt cho KPI đáng lẽ phải runtime |

## 4. Quy tắc kiểm `.ai/db-map` trước khi viết hàm

Trước mỗi `calc*`:
1. Tìm bảng trong `.ai/db-map/index.json`.
2. Đọc domain file tương ứng, ghi cột thật vào report.
3. Nếu bảng/cột không có: không đoán. Chọn một trong ba:
   - thêm migration an toàn;
   - để staged và tạo backlog tích hợp;
   - đổi KPI thành manual/retired nếu bản chất không runtime.
4. Nếu có hai nguồn dữ liệu, chọn một SoR và ghi rule khi lệch.

## 5. Ưu tiên runtime theo tác động vận hành

### P0 — nên graduate trước

| KPI | Lý do | Rủi ro nếu không có |
|---|---|---|
| PLAN_ADHERENCE | Điều hành ngày, recovery trước khi OTD đỏ | Trễ giao phát hiện muộn |
| WIP_AGING | Tắc nghẽn queue, WIP chết | Dòng chảy chậm, mất cash |
| FAI_FIRST_PASS | Gate nhả loạt | Lỗi chạy loạt, scrap/rework |
| FINAL_RELEASE_RFT | Gate release cuối | Lỗi hồ sơ/CoC/escape |
| NCR_CLOSURE_AGING | QMS containment | Dồn đóng NCR cuối kỳ |
| CAPA_EFFECTIVENESS | Đóng vấn đề gốc | NCR tái phát |
| MATERIAL_AVAILABILITY_PLAN | Trước job release | Máy đói việc do vật tư |
| OEE_BOTTLENECK | Constraint improvement | OEE chung đẹp nhưng constraint nghẽn |
| MTBF/MTTR/UNPLANNED_DOWNTIME | Bảo trì phòng ngừa | Dừng máy không phân tích |

### P1 — graduate khi dữ liệu đủ

Quote/RFQ, gross margin by family, ship-to-invoice, supplier readiness, role certification, service ticket SLA, master data aging.

### P2 — manual governed là hợp lý

BCP readiness, traceability drill time, tabletop drill, control-plan/PFMEA approval nếu hiện chỉ có checklist ký tay.

## 6. Mẫu thiết kế `calc*` chuẩn

Hàm cần:
- nhận `DateRange $period, array $filters`;
- lọc kỳ bằng một ngày thống nhất (`created_at`, `closed_at`, `ship_date`, `due_at`);
- xử lý chia 0 → value 0 + `sample_size=0` + `empty_result`;
- trả `sample_size`, breakdown theo customer/product_family/machine/reason khi có;
- không hardcode threshold trong hàm nếu registry là SSOT;
- log/expose `data_quality_flags` nếu thiếu cột/empty source.

Ví dụ concept:

```php
private function calcFaiFirstPass(DateRange $period, array $filters): array
{
    // Source: inspection_results, filter inspection_type='FAI'.
    // numerator: first_pass=true AND result='pass'
    // denominator: all FAI inspections completed in period.
    // return value, sample_size, passed_first_attempt, total_fai, breakdown_by_product_family.
}
```

## 7. Các trường hợp biên phải test

1. Period rỗng: status grey, không đỏ.
2. Lô nhỏ dưới `min_sample`: status grey, reason rõ.
3. Tử số/mẫu số âm hoặc null: data_quality flag.
4. Reopened/NCR/CAPA: aging dựa vào ngày mở/due, không dựa ngày đóng.
5. Resequence được phê duyệt: PLAN_ADHERENCE breakdown riêng, không làm “đỏ oan”.
6. Khách thay đổi yêu cầu: attribution rule.
7. Machine downtime planned vs unplanned: không gom chung.
8. Counter-metric manual chưa có input: không cho reward.

## 8. Runtime vs manual decision matrix

| Tình huống | Quyết định |
|---|---|
| Có bảng/cột transaction thật và dùng thường xuyên | Runtime |
| Có transaction nhưng thiếu 1–2 cột quan trọng | Staged + migration backlog |
| KPI đo diễn tập/đánh giá định kỳ không có transaction tự nhiên | Manual governed |
| KPI chỉ là cảm nhận/không action | Retire hoặc health indicator |
| KPI cần dữ liệu ERP ngoài MOM chưa tích hợp | Staged, không bịa từ snapshot cũ |
| KPI nằm trong executive scorecard nhưng staged | Gỡ khỏi scoring; hiển thị “chưa đủ data contract” |
