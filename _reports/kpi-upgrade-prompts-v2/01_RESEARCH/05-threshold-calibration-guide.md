# Hướng dẫn đặt ngưỡng KPI cho xưởng gia công CNC

Ngưỡng không phải “con số đẹp”. Ngưỡng phải kích hoạt đúng hành động, phù hợp cỡ mẫu, và không tạo gaming.

## 1. Cấu trúc ngưỡng

Mỗi KPI cần:

```json
"thresholds": {
  "direction": "higher_is_better",
  "unit": "percent",
  "green_point": 95.0,
  "yellow_point": 90.0,
  "target": 95.0,
  "basis": "Benchmark / lịch sử / yêu cầu khách / giai đoạn vận hành"
}
```

Quy tắc:
- `higher_is_better`: green_point ≥ yellow_point.
- `lower_is_better`: green_point ≤ yellow_point.
- `target` nên bằng green_point hoặc mục tiêu stretch có giải thích.
- Có `basis`, không để target “tự nhiên sinh ra”.
- KPI tỷ lệ có `formula.min_sample`.
- KPI safety/gate có thể có zero tolerance và recognition block.

## 2. Cách chọn ngưỡng

Ưu tiên căn cứ:
1. Yêu cầu hợp đồng/khách hàng/tiêu chuẩn nội bộ.
2. Lịch sử thực tế 6–12 tháng nếu dữ liệu đủ.
3. Benchmark ngành nhưng phải điều chỉnh cho job-shop CNC.
4. Maturity hiện tại: đặt green đủ cao để cải tiến, không quá ảo để mọi người bỏ cuộc/gaming.
5. Ngưỡng pilot: `calibration_pending=true` trong 1–3 kỳ, không dùng reward.

## 3. Cỡ mẫu tối thiểu

| KPI | Min sample gợi ý | Lý do |
|---|---:|---|
| OTD | 5–10 shipments | Lô ít dễ dao động |
| FPY / FAI | 10 inspections; FAI có thể thấp hơn nhưng không reward | Lô prototype nhỏ nhiễu |
| Complaint ppm | 30 shipments hoặc đủ part count | PPM với mẫu nhỏ vô nghĩa |
| Supplier OTD | 5 PO lines | Ít PO dễ lệch |
| Invoice RFT | 10 invoices | Giảm nhiễu |
| Safety incident | Không dùng min_sample để bỏ qua sự cố | Safety là gate/blocker |
| Gate pass metric | Per-event, không cần sample để hold gate | Gate quyết định từng job |

## 4. Ngưỡng tham khảo theo nhóm

Các giá trị này là điểm xuất phát; Claude Code phải kiểm với lịch sử/registry hiện có trước khi sửa.

| KPI | Green | Yellow | Red | Ghi chú |
|---|---:|---:|---|---|
| OTD | ≥95% | 90–94.99% | <90% | Nếu ngành bán dẫn/aerospace có thể đặt ≥98% |
| COMPLAINT_RATE | ≤100 ppm | 101–200 ppm | >200 ppm | Nếu denominator là shipment, ghi rõ không so với part-ppm |
| FPY | ≥95% | 90–94.99% | <90% | FAI có thể target cao hơn |
| FAI_FIRST_PASS | ≥98% | 95–97.99% | <95% | Gate G4 |
| FINAL_RELEASE_RFT | ≥98% | 95–97.99% | <95% | Gate G6 |
| PLAN_ADHERENCE | ≥90% | 80–89.99% | <80% | Exclude approved resequence riêng |
| WIP_AGING | ≤5% | 5–10% | >10% | Age threshold theo routing/family |
| OEE_BOTTLENECK | ≥85% | 70–84.99% | <70% | Chỉ áp dụng constraint |
| CONSTRAINT_LOST_HOURS | ≤2h/tuần | 2–5h | >5h | Phù hợp capacity |
| SETUP_FIRST_PASS | ≥95% | 90–94.99% | <90% | Counter quality bắt buộc |
| MTBF | tăng theo baseline | - | dưới baseline | Dùng trend, không một target chung |
| MTTR | ≤target by asset class | - | >target | Theo loại máy |
| NCR_CLOSURE_AGING | ≤10% | 10–20% | >20% | Đếm open aging |
| CAPA_EFFECTIVENESS | ≥90% | 80–89.99% | <80% | Không thay bằng closure |
| SUPPLIER_OTD | ≥95% critical / ≥90% all | 85–94% | <85% | Critical material nên cao hơn |
| INVENTORY_ACCURACY | ≥98% | 95–97.99% | <95% | Theo item/location |
| INVOICE_RFT | ≥98% | 95–97.99% | <95% | Pair ship-to-invoice LT |
| DSO | ≤45 ngày | 46–60 | >60 | Theo credit term |
| TRAINING_COMP | ≥95% | 90–94.99% | <90% | Certification expiry không được tính complete |
| BCP_READINESS | 100% critical | 90–99% | <90% | Critical role missing backup là yellow/red |
| SERVICE_TICKET_SLA | ≥95% | 85–94.99% | <85% | Reopen counter |
| CRITICAL_SYSTEM_AVAILABILITY | ≥99.5% | 99.0–99.49% | <99% | Theo criticality |

## 5. Ngưỡng cho gate

Gate metric không chỉ “báo cáo”; nó phải pass/fail:

- Pass: đủ bằng chứng, số đạt green hoặc điều kiện tuyệt đối.
- Conditional pass: yellow nhưng có deviation/waiver được duyệt, risk owner, due date.
- Hold: red, thiếu evidence, counter-metric blocker, hoặc owner/action chưa rõ.

Mỗi gate nên có câu:
> Gate Gx chỉ pass khi KPI-A đạt ..., KPI-B đạt ..., và không có blocker safety/customer/data-integrity.

## 6. Cảnh báo ngưỡng gây gaming

- OTD quá cao nhưng không pair quality/cost → bỏ kiểm, giao gấp, giao thiếu.
- OEE toàn nhà máy quá cao → chạy tồn kho không cần.
- Setup time quá thấp → bỏ cleaning/FAI.
- NCR closure quá chặt → đóng ẩu.
- Supplier quality quá cao → skip inspection hoặc không ghi reject.
- Training completion 100% → click-through, không chứng minh competency.

## 7. Cách dùng lịch sử để calibrate

1. Tính 6–12 tháng dữ liệu thật.
2. Lấy median, P75/P90, phân theo family/machine/customer.
3. So với target khách/benchmark.
4. Đặt green ở mức đủ stretch nhưng có thể đạt bằng process improvement.
5. Đặt yellow là vùng cần action sớm.
6. Đặt red là mức bắt buộc escalation.
7. Sau 3 kỳ, review lại nếu số luôn xanh hoặc luôn đỏ vô nghĩa.
