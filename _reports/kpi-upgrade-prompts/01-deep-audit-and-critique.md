# 01 — Nghiên cứu sâu + audit + phản biện gay gắt hệ KPI

**Loại:** chỉ nghiên cứu & viết báo cáo. KHÔNG sửa code/tài liệu.
**Tiên quyết:** đọc `00-ground-rules.md` và `README.md`.

## Mục tiêu
Tạo bức tranh trung thực, gay gắt về hệ KPI: cái nào thực chiến, cái nào là KPI
giấy; cái nào tính được, cái nào không; cái nào gây gaming; cái nào thiếu hành
động. Báo cáo này là đầu vào ràng buộc cho prompt 02→09.

## Việc phải làm

### 1. Đọc đầy đủ (không đọc lướt)
- 5 ANNEX KPI: `annex-122-kpi-cascade-dictionary.html`,
  `annex-127-kpi-authority-registry-and-operational-metrics.html`,
  `annex-128-kpi-system-matrix-and-document-usage.html`,
  `annex-129-bsc-kpi-operating-mechanism-assessment.html`,
  `annex-110-dashboard-kpi-dictionary-and-data-model.html`. Đọc thêm
  `annex-125` và `annex-126` (operating system + Hoshin) để hiểu KPI nằm ở lớp nào.
- Registry `mom/data/registry/kpi-authority-registry.json` — TOÀN BỘ.
- `mom/api/services/KpiEngine.php` — toàn bộ 2152 dòng. Đặc biệt: 19 hàm
  `calc*`, `getMetricCatalog()`, `evaluateStatus()`, `getYellowThreshold()`,
  lớp enrich governance (`enrichCatalogGovernance`, `applyDataContract`,
  `applyConsequence`, `applyScorecardRules`).
- 3 script trong `tools/scripts/kpi/` — hiểu chúng kiểm/sinh gì.
- Report cũ trong `_reports/kpi/` (html-audit, performance-governance,
  system-matrix) — đọc để biết hệ thống đã tự phát hiện gì.
- §9 "Chỉ số kết quả công việc (KPI)" trong ít nhất 8 JD trải đều các phòng
  (`mom/docs/system/organization/03-Job-Descriptions/*/*.html`).
- `wi-202-daily-management-tier-meetings-kpi-and-escalation.html`.
- Dashboard KPI trong portal: `mom/scripts/portal/` các file dashboard +
  `DashboardController` (route `kpi_catalog/kpi_get/kpi_trend/kpi_alerts`).
- `.ai/db-map/` cho các bảng `kpi_definitions`, `kpi_snapshots`,
  `mes_production_kpi_daily`, `dw_kpi_scorecards`, `aps_kpi_snapshots`,
  `svc_service_kpi_snapshots` — cột nào có sẵn để nuôi KPI.

### 2. Bảng "KPI có thực chiến không" — cho TỪNG KPI
Với mỗi mã trong 33 governance KPI + 15 proposed + 12 dashboard, lập 1 dòng:
- Có hàm `calc*` trong KpiEngine? (có/không — tên hàm)
- Nguồn dữ liệu: bảng/cột thật tồn tại? (có/không/một phần)
- Có ngưỡng xanh/vàng/đỏ định lượng? công thức tử/mẫu/đơn vị?
- Owner có thực quyền xử lý?
- Gắn quyết định/hành động gì khi đỏ?
- Có counter-metric (nếu dùng đánh giá/thưởng)?
- Lead hay lag — có cặp đôi chưa?
- **Phán quyết:** `THỰC CHIẾN` / `GIẤY (cần cấp nguồn)` / `KHAI TỬ` /
  `HẠ XUỐNG metric`.

### 3. Bảng drift 4 chiều
Với mỗi KPI, đối soát mã/tên/target/owner giữa: registry ↔ ANNEX-122 ↔
ANNEX-128 ↔ KpiEngine ↔ dashboard_core_kpis. Liệt kê mọi mismatch.

### 4. Phản biện gay gắt — 3 vòng quét độc lập
Bắt buộc đối chiếu thực tiễn xưởng CNC + ISA-95 + IATF 16949 §9.1 + NIST
Baldrige. Trả lời thẳng:
- KPI nào **đề ra cho có**, không ai dùng để quyết định?
- KPI nào **gây gaming** (đẩy việc ra ngoài tập hợp, hoãn ghi nhận, đổi định
  nghĩa cho số đẹp)? Thiếu counter-metric nào?
- KPI nào **làm khó bộ phận khác bất công** (owner không kiểm soát được kết quả
  nhưng vẫn bị tính)?
- KPI nào **trùng lặp / mâu thuẫn** (ví dụ FAI_FIRST_PASS xuất hiện cả §5 lẫn
  proposed; SUPPLIER_OTD vừa runtime vừa governance)?
- Cổng G0→G7 nào **thiếu KPI đo điều kiện pass** của cổng đó?
- Dashboard điều hành: 8/12 KPI `staged_data_contract` → CEO đang nhìn số rỗng?
- 26/33 governance KPI không có `calc*` → hệ thống có thực sự đo không?
- KPI nào thiếu lead pairing (chỉ có lag → phát hiện trễ)?
- Tầng BSC: KPI nào đặt sai lớp (đưa metric thao tác vào scorecard điều hành)?
Sau đó **đánh giá công bằng** điểm mạnh (kiến trúc registry/engine/audit tốt…).

### 5. Rà tiếng Việt máy dịch
Liệt kê mọi cụm từ hỏng trong ANNEX-122/-128/-110/WI-202 kèm vị trí.

## Tình huống vận hành thực tế cần soi (tính trước, ghi cách xử lý vào báo cáo)
- Job gấp của khách bán dẫn chen ngang lịch → KPI PLAN_ADHERENCE bị đỏ "oan":
  có rule loại trừ re-sequence có kiểm soát chưa?
- Máy hỏng đột xuất → OEE/throughput đỏ: KPI có tách downtime kế hoạch vs đột
  xuất chưa? MTBF/MTTR có đo không?
- NCR mở cuối kỳ → đẩy sang kỳ sau cho số đẹp: KPI NCR_CLOSURE_AGING có chống
  trò này (đếm theo ngày mở, không theo ngày đóng) chưa?
- Lô nhỏ vài chi tiết → FPY/DPMO nhiễu thống kê: có ngưỡng cỡ mẫu tối thiểu chưa?
- Một người giữ chữ A nghỉ → KPI phụ thuộc người: CRITICAL_ROLE_BACKUP_COVERAGE
  có đo thật không?

## Đầu ra
Một file `_reports/kpi/kpi-deep-audit-<YYYY-MM-DD>.md` gồm:
1. Sổ đăng ký khe hở (mỗi dòng: mô tả, tài liệu/file, điều khoản chuẩn, mức
   🔴/🟠/🟡, prompt nào sẽ xử lý).
2. Bảng "KPI có thực chiến không" (mục 2).
3. Bảng drift 4 chiều (mục 3).
4. Phản biện gay gắt + đánh giá công bằng (mục 4).
5. Danh sách câu tiếng Việt cần viết lại (mục 5).
6. Đề xuất ADD / REMOVE / UPDATE / GRADUATE KPI có mức ưu tiên.

## Definition of Done
- Báo cáo .md tồn tại, đủ 6 phần, mỗi KPI có phán quyết rõ ràng.
- Không sửa bất kỳ file nào ngoài báo cáo.
- Commit: `docs(kpi): deep audit & critique report` (báo cáo trong `_reports/`
  không vướng hook portal-doc; commit thường).
