# 02 — Chuẩn hóa taxonomy và làm sạch scorecard KPI

**Loại:** sửa registry + ANNEX-127/-122/-128 + dashboard scorecard nếu cần.  
**Mục tiêu:** Dừng việc gọi mọi chỉ số là KPI; phân loại đúng KPI / operating metric / gate metric / role measure / health indicator, và chỉ đưa metric đủ điều kiện vào scorecard.

## 1. Tiền điều kiện

- Prompt 01 đã tạo gap report.
- Đọc `01_RESEARCH/02-cnc-kpi-library.md` và `04-anti-gaming-risk-register.md`.
- Chạy preflight.

## 2. Thiết kế taxonomy chuẩn

Trong registry, đảm bảo mỗi metric có các field hoặc mapping tương đương:

```json
{
  "canonical_code": "...",
  "metric_type": "kpi|operating_metric|gate_control_metric|role_performance_measure|health_indicator",
  "tier": "company|value_stream|department|gate|position",
  "layer": "bsc_monthly|toc_weekly|lean_daily|qms_mes_gate|role_review",
  "is_official_kpi": true,
  "evaluation_use": "company_scorecard|department_scorecard|management_review|gate_hold_release|role_performance_measure|process_control_review|none",
  "scorecard_applicable": true,
  "scorecard_scoring_status": "active_runtime|manual_governed|candidate_data_contract|gate_only|not_applicable"
}
```

Không nhất thiết đổi schema nếu repo đã có schema tương đương; nhưng phải máy đọc được và CI guard kiểm được.

## 3. Quy tắc phân loại

- Company KPI: scorecard chính thức, có quyền tác động chiến lược.
- Operating metric: dùng Tier meeting, action nhanh, không trực tiếp thưởng/phạt.
- Gate metric: pass/hold/release công việc; có CDR/evidence.
- Role performance measure: dùng JD/OJT/review vai trò; không tự động là KPI doanh nghiệp.
- Health indicator: theo dõi tình trạng; không dùng evaluation.

## 4. Làm sạch executive_scorecard

Với từng mã trong `executive_scorecard`:

- Nếu `runtime_calculated`: được tính điểm nếu có counter/min_sample/action.
- Nếu `manual`: chỉ tính điểm nếu có form input, evidence, approval/audit, counter.
- Nếu `staged_data_contract`: không được tính điểm; chuyển sang `scorecard_backlog` hoặc giữ hiển thị “candidate”.
- Nếu `gate_control_metric`: chỉ block/hold hoặc score gate nếu đúng phạm vi, không gộp vào company score trừ khi được định nghĩa rõ.
- Nếu role/position metric: không vào executive scorecard.

Kết quả:
- `executive_scorecard` nên có 12–18 KPI mạnh.
- Mỗi KPI có weight nếu scorecard dùng điểm.
- Tổng weight = 100 nếu có weight.
- Không KPI staged tính điểm.
- Recognition rule block khi safety/customer/data-integrity/gate bypass mở.

## 5. Xử lý role/position metrics `POS_*`

Nếu registry có nhiều `POS_*`:
- đổi/đảm bảo `metric_type = role_performance_measure`;
- `is_official_kpi = false` trừ mã được map rõ vào department/company scorecard;
- `reward_eligible = false` mặc định, hoặc chỉ recognition trong role review với counter/evidence;
- giới hạn JD mỗi role 3–5 measure trọng yếu;
- nếu quá nhiều, chuyển phần còn lại sang competency/OJT checklist.

Không xóa role measures chỉ vì nhiều; nhưng không để chúng pha loãng KPI authority.

## 6. Xử lý proposed/staged metrics

- Tạo backlog có thứ tự ưu tiên P0/P1/P2.
- Mỗi staged metric phải có lý do thiếu dữ liệu và owner khắc phục.
- Staged không được nằm trong “scorecard result”.
- Dashboard phải hiển thị badge “chưa đủ data contract”.

## 7. Đồng bộ tài liệu

Cập nhật:
- registry;
- ANNEX-127: performance governance và taxonomy;
- ANNEX-122: bảng rõ classification, status;
- ANNEX-128 regenerate;
- WI-202: phân biệt KPI scorecard vs operating metric;
- JD: đổi tiêu đề “KPI” thành “Role Performance Measures” nếu không official KPI.

## 8. CI guard update

Nếu chưa có, thêm P0/P1:
- P0: `executive_scorecard` trỏ `staged_data_contract` mà `scorecard_scoring_status` vẫn active.
- P0: `reward_eligible=true` nhưng không official KPI/manual-governed hợp lệ.
- P1: quá nhiều role measures trong một JD (>5) chưa có lý do.
- P1: metric_type thiếu/không hợp lệ.

## 9. Tự phản biện

- Có giữ KPI chỉ vì “đã tồn tại” không?
- Có đưa metric staged vào scorecard vì muốn dashboard đẹp không?
- Có làm scorecard quá nhiều khiến CEO không quyết định được không?
- Có hạ role measures thành “không KPI” nhưng vẫn giữ đủ để quản lý tay nghề không?

## 10. Definition of Done

- Registry phân loại rõ mọi metric.
- Executive scorecard không tính KPI staged.
- JD/WI/ANNEX dùng thuật ngữ đúng.
- ANNEX-128 regenerated.
- Audit + guard PASS.
- Report `_reports/kpi/kpi-taxonomy-scorecard-rationalization-<date>.md`.
