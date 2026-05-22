# KPI Upgrade Prompt Pack — HESEM MOM (CNC machining)

Bộ prompt thực thi để nâng cấp toàn bộ hệ KPI thành **KPI thực chiến**: mỗi KPI
được tính từ dữ liệu thật, có ngưỡng định lượng, gắn với một quyết định/hành
động, là công cụ công bằng để đánh giá – cải tiến – khen thưởng, và bảo vệ hệ
cổng G0→G7 của một công ty gia công cơ khí CNC.

## Cách dùng

Trỏ AI vào thư mục này và yêu cầu thực hiện **tuần tự theo số thứ tự**. Mỗi file
là một phiên AI độc lập, tự chứa đủ ngữ cảnh — AI không phải đoán.

```
Thực hiện _reports/kpi-upgrade-prompts/ theo thứ tự 00 → 09.
Mỗi file: đọc 00-ground-rules.md trước, làm đúng file, deploy + verify xong
mới sang file kế. Không gộp file, không bỏ bước tự phản biện.
```

## Thứ tự thực thi

| # | File | Kết quả |
|---|------|---------|
| 00 | `00-ground-rules.md` | Quy tắc bất biến — đọc trước MỌI prompt |
| A1 | `A1-researched-baseline.md` | **Dữ liệu nền đã khảo sát sẵn** (28 hàm engine, 33 KPI computed/chưa, bảng DB, drift) — đọc cùng 00 |
| 01 | `01-deep-audit-and-critique.md` | Báo cáo audit + phản biện gay gắt (không sửa code) |
| 02 | `02-registry-as-full-ssot.md` | Registry mang định nghĩa KPI đầy đủ — SSOT thật |
| 03 | `03-thresholds-actions-fairness.md` | Ngưỡng định lượng + action rule + counter-metric + reward |
| 04 | `04-data-contracts-and-compute.md` | Hoàn tất data contract — KPI được TÍNH THẬT |
| 05 | `05-gate-kpi-cdr-linkage.md` | Gate metric §9 ↔ CDR cổng G0→G7 |
| 06 | `06-kpi-admin-console.md` | Console quản trị KPI trong portal |
| 07 | `07-vietnamese-rewrite.md` | Viết lại tiếng Việt chuyên gia cho tài liệu KPI |
| 08 | `08-ci-integrity-guard.md` | check_kpi_integrity.php — chặn drift khi deploy |
| 09 | `09-final-deploy-verify-reaudit.md` | Deploy, verify Chrome, re-audit, tổng kết |

01 không đổi code (chỉ báo cáo) → có thể chạy trước để duyệt phạm vi. 02→05 là
phần nội dung KPI. 06 là công cụ. 07–09 hoàn thiện + bảo vệ.

## Triết lý (bắt buộc thấm trước khi làm)

- **Số lượng KPI không cố định.** "33" hiện nay chỉ là tồn kho, KHÔNG phải mục
  tiêu. Đợt nâng cấp tự quyết bộ KPI đúng cho vận hành: thêm cái thiếu, gộp cái
  trùng, bỏ cái vô dụng. Bộ cuối cùng bao nhiêu là do nhu cầu thật quyết định.
- KPI để **hệ thống chạy đúng thiết kế**, không phải để làm khó nhau. Mọi KPI
  phải kéo hành vi tích cực và có counter-metric chặn gaming.
- Không đo để ra quyết định thì **không gọi là KPI** (ANNEX-129 §8). Đặt là
  metric / control metric / health indicator.
- KPI manh mún, không tính được từ dữ liệu thật = khẩu hiệu. Mục tiêu tối
  thượng của bộ prompt: **mọi KPI hoặc được tính thật, hoặc bị khai tử trung
  thực** — không để "đề ra cho có".
- Mỗi KPI phải định lượng rõ: tử số, mẫu số, đơn vị, ngưỡng xanh/vàng/đỏ,
  chu kỳ, nguồn dữ liệu là bảng/cột thật.
- Mỗi KPI phải gắn một owner CÓ THẨM QUYỀN VÀ NGUỒN LỰC xử lý, và một action
  rule "đỏ thì ai làm gì, hạn nào".

## Hiện trạng đã khảo sát (2026-05-21) — để AI không phải đoán

**Tài liệu KPI:** ANNEX-122 (KPI Cascade Dictionary — 33 KPI), ANNEX-125 (CNC
Performance Operating System 5 lớp), ANNEX-126 (Hoshin/X-Matrix), ANNEX-127
(KPI Authority Registry — doc), ANNEX-128 (KPI System Matrix — sinh tự động),
ANNEX-129 (BSC/KPI assessment), ANNEX-110 (Dashboard KPI Dictionary & Data
Model), WI-202 (tier-meeting KPI). Đường dẫn ANNEX-12x:
`mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/`.
ANNEX-110: `mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/`.

**Registry (SSOT hiện tại, còn sơ sài):**
`mom/data/registry/kpi-authority-registry.json` — keys: `runtime_calculated_metrics`
(19), `legacy_aliases`, `executive_scorecard` (15), `annex122_governance_kpis`
(33, mỗi mục CHỈ có `{no,canonical_code,name,tier,status}` — THIẾU công thức,
ngưỡng, owner, nguồn dữ liệu), `proposed_operating_metrics` (15, hầu hết
`staged_data_contract`), `dashboard_core_kpis` (12, 8/12 `staged_data_contract`),
`authority_rule`, `change_control_policy`.

**Engine:** `mom/api/services/KpiEngine.php` (2152 dòng) — 19 hàm `calc*` cho 19
runtime metric; `getMetricCatalog()`, `calculateKpi()`, `evaluateStatus()`,
`getYellowThreshold()`, `saveSnapshot()`, lớp enrich governance từ registry.
Routes: `kpi_catalog / kpi_get / kpi_trend / kpi_alerts` trong
`mom/api/routes/core-routes.php` → `DashboardController`.

**DB tables:** `kpi_definitions`, `kpi_snapshots`, `aps_kpi_snapshots`,
`dw_kpi_scorecards`, `mes_production_kpi_daily`, `svc_service_kpi_snapshots`.

**Audit scripts (= "CI checker" của KPI):** `tools/scripts/kpi/audit-html-kpis.php`,
`audit-kpi-performance-governance.php`, `audit-kpi-system-matrix.php`. Report ra
`_reports/kpi/`.

**Lưu ý về con số 33:** đó là *tồn kho governance KPI hiện tại* trong
ANNEX-122/registry, KHÔNG phải bộ KPI mục tiêu. Đợt nâng cấp được phép và được
yêu cầu thay đổi bộ này — thêm/gộp/khai tử theo nhu cầu vận hành thật.

**Khe hở lớn nhất đã thấy:** trong bộ 33 governance KPI hiện tại, chỉ ~14 KPI
thật sự được KpiEngine tính (xem `A1-researched-baseline.md` để có danh sách
chính xác); ~19 KPI còn lại KHÔNG có hàm `calc*` → là KPI giấy/thủ công. 9/12
dashboard KPI và 14/15 proposed metric ở trạng thái `staged_data_contract`
(chưa có dữ liệu). → Hệ KPI đẹp về kiến trúc nhưng **rỗng về vận hành**. Đây là
trọng tâm nâng cấp.

## Mẫu quy trình tham chiếu — đợt nâng cấp RACI (đã chạy thành công)

Đợt RACI: deep audit → phản biện → đề xuất ADD/REMOVE/UPDATE có mức độ → triển
khai 5 stage, mỗi stage: sửa seed JSON + ANNEX + service → chạy CI checker →
commit 2 lần (code+seed; rồi docs với `ALLOW_DOC_COMMIT=1 git commit --no-verify`)
→ push → chờ GitHub Actions deploy xanh → verify trên Chrome live. Phát hiện
kiến trúc giữa chừng: "bootstrap = SSOT cấu trúc", "schema-version gate" để VPS
tự lành. Bộ prompt KPI này áp dụng đúng khuôn đó.

Ánh xạ RACI → KPI:

| RACI | KPI |
|------|-----|
| ANNEX-121 (ma trận SSOT) | ANNEX-122 (KPI cascade) |
| ANNEX-120 + raci_matrix.bootstrap.json | ANNEX-127 + kpi-authority-registry.json |
| RaciMatrixService | KpiEngine |
| RACI Console (00n-admin-raci-matrix.js) | KPI Console (sẽ xây ở prompt 06) |
| check_raci_integrity.php | check_kpi_integrity.php (sẽ xây ở prompt 08) |
| vùng RACI nhúng SOP/JD | KPI trong JD §9, dashboard, WI-202 |
