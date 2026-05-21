# KPI Stage 05 — Gate Metric ↔ CDR G0→G7 Linkage (2026-05-22)

**Prompt:** `_reports/kpi-upgrade-prompts/05-gate-kpi-cdr-linkage.md`
**Kết quả:** Mỗi cổng G0→G7 có metric đo điều kiện pass; mỗi gate metric trỏ
về CDR trong ANNEX-121.

## Việc đã làm

1. **21 gate control metric** (19 cũ + 2 mới) — mỗi mục mang `gate`,
   `linked_cdr` (mã CDR ANNEX-121), `gate_pass_condition` (định lượng),
   `owner_role`, `target`, `cadence`, `data_source`, `calculation_status`.
2. **2 metric mới** lấp khe hở CDR thêm trong đợt RACI:
   - `CONTROL_PLAN_PFMEA_APPROVAL` (G1, CDR B8) — Control Plan + PFMEA duyệt
     trước khi phát hành gói nền.
   - `CUSTOMER_ESCAPE_NOTIFICATION_LT` (G7, CDR D11) — thời gian thông báo
     khách khi phát hiện sản phẩm không phù hợp đã/có thể đã giao.
3. **ANNEX-122 §9** regenerated từ registry — thêm 2 cột "Điều kiện pass cổng"
   + "CDR liên quan"; mỗi `<tr>` có `data-gate-metric`.
4. **KpiEngine** `getMetricCatalog` trả `gate`/`linked_cdr`/`gate_pass_condition`.
5. **ANNEX-128** regenerated; 3 audit PASS (0 P0/P1).
6. schema_version 4 → 5.

## Đối soát cổng ↔ metric

| Cổng | Số metric | CDR được đo |
|------|-----------|-------------|
| G0 | 2 | A1, A2/A5 |
| G1 | 3 | B1/B2, B3, **B8 (mới)** |
| G2 | 2 | D10 |
| G3 | 2 | B5/B6, C4 |
| G4 | 2 | D1/D2, D1/D12 |
| G5 | 2 | D3, D3/D4 |
| G6 | 2 | D8 |
| G7 | 3 | D7, D8, **D11 (mới)** |
| ALL | 3 | D3/D5/D9, D1/D3, C4/C7 |

Mọi cổng G0–G7 có ≥1 metric đo điều kiện pass — không cổng nào "đi qua" mà
thiếu metric định lượng.

## Liên kết một chiều — lý do

Liên kết chỉ một chiều: ANNEX-122 §9 / registry `linked_cdr` → CDR. KHÔNG
thêm cột vào ma trận RACI ANNEX-121 §5 vì: (a) ma trận RACI 16 cột có cấu
trúc cố định, thêm cột rủi ro vỡ layout; (b) ANNEX-121 do nhiều phiên AI
cùng sửa — an toàn ma trận. Trường `linked_cdr` máy đọc được trong registry
đã đủ để truy ngược; prompt 06 (console) có thể render liên kết hai chiều
từ registry mà không đụng ANNEX-121.

## Verify

- Deploy GitHub Actions HEAD `48f80e98` XANH.
- VPS live: `schema_version=5`, `gate_control_metrics=21`, đủ 8 cổng + ALL.
- PHPUnit `KpiEngineAuthorityRegistryTest` PASS (assert 19→21).

## Tự phản biện (3 vòng)

**Vòng 1 — Cổng nào "đi qua" mà thiếu metric định lượng?**
Trước Stage 5: CDR mới B8 (Control Plan/PFMEA) và D11 (escape notification)
không có metric đo pass — khe hở audit khách hàng. Đã lấp bằng 2 metric mới.
Các CDR phê duyệt thuần (A3/A4/A6 phê duyệt chiết khấu/thanh toán/CCR, B4
supersedure…) "pass" = chính hành vi phê duyệt có thẩm quyền, không phải tỷ
lệ đo được — không cần metric riêng, ghi nhận trong báo cáo.

**Vòng 2 — Gate metric có trùng KPI value-stream?**
Có 6 mã dùng chung: OTD, FAI_FIRST_PASS, SHIP_READY_TO_INVOICE_LT (governance
KPI) + COPQ, FPY, OEE (runtime). Đây là MỘT mã canonical nhìn ở ngữ cảnh
cổng — không nhân đôi. `gate_pass_condition` ghi rõ "Cùng mã canonical với
KPI…". `getMetricCatalog` gộp theo code nên không sinh metric trùng.

**Vòng 3 — Owner gate metric có đúng chủ chữ A của CDR?**
Owner mỗi gate metric khớp phòng giữ trách nhiệm cổng đó: G0→CS, G1→ENGM/QA,
G2→QA/SCM, G3→WKM, G4→QA, G5→WKM, G6→QA, G7→SCM/FIN/QA. Khớp A-holder theo
cổng trong ANNEX-121.

## Finding chuyển tiếp

| # | Mô tả | Prompt |
|---|-------|--------|
| S05-01 | 2 metric mới + 13 gate metric khác ở `staged_data_contract`/`manual` — cần data contract + calc* (logic prompt 04). | sau |
| S05-02 | Liên kết hai chiều ANNEX-121↔gate metric nên render trong KPI Console. | 06 |
| S05-03 | 11 P2 `LEGACY_ALIAS_USED`. | 07 |

---
*Stage 05 hoàn tất. Tiếp theo: Prompt 06 — `06-kpi-admin-console.md`.*
