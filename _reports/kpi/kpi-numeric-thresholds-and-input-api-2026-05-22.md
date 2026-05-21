# KPI — Ngưỡng số có logic toán + API nhập liệu (2026-05-22)

**Yêu cầu:** Phản biện sâu tính thực chiến + độ hợp lý ngưỡng; chuyển ngưỡng
text → **số có logic toán** để tổng hợp/phân tích; mọi KPI có **API endpoint**
chờ frontend nhập liệu; không hardcode, tất cả SSOT.

## Việc đã làm

### 1. Nghiên cứu sâu + phản biện đa chiều
`_reports/kpi/kpi-threshold-deep-research-2026-05-22.md` — soi 33 governance
KPI qua 5 chiều (tính được / gaming / owner kiểm soát / ngưỡng thực chiến /
logic toán). Đối sánh OSHA TRIR, AIAG, MESA OEE, TOC. 30/33 ngưỡng được
benchmark xác nhận; 3 gắn cờ `calibration_pending`.

### 2. Ngưỡng số — schema máy đọc được
`thresholds` đổi từ text (`"≥95%"`) sang số:
```
{direction, unit, green_point:<num>, yellow_point:<num>, target:<num>, basis}
```
RAG là số học thuần cho mọi KPI:
- higher_is_better: GREEN nếu v≥green_point; YELLOW nếu v≥yellow_point; else RED
- lower_is_better:  GREEN nếu v≤green_point; YELLOW nếu v≤yellow_point; else RED

Nhờ là SỐ: tính được gap (v−target), %đạt (v/target), điểm scorecard, trend,
roll-up đa kỳ — nền cho tổng hợp/phân tích. Chuỗi hiển thị ("≥ 95%") được
SUY RA, không lưu cứng. **RECORDABLE_INCIDENT_RATE** chuyển từ text mô tả số
ca → TRIR số (G=1.0, Y=3.0 ca/200.000 giờ — đúng OSHA).

### 3. KpiEngine đọc ngưỡng số làm SSOT
`evaluateStatus` / `getKpiTarget` đọc `thresholds` số từ registry (SSOT) —
governance KPI không còn dùng định nghĩa hardcode trong engine.

### 4. API nhập liệu KPI — chờ frontend
- Migration **196** `kpi_manual_inputs` — bảng staging dữ liệu KPI nhập tay.
- Endpoint `kpi_input_save` (POST) / `kpi_input_list` (GET), cũng dạng REST
  `/api/kpi/{code}/input`. `metric_code` validate theo registry (SSOT).
- KpiEngine: KPI không-runtime đọc bản nhập mới nhất từ `kpi_manual_inputs`
  → staged KPI hiện số thật thay vì rỗng/throw.
- Catalog phơi `data_contract.input_endpoint` cho TỪNG KPI (sinh từ mã —
  SSOT, không hardcode). Frontend module nhập liệu thiết kế sau; endpoint
  đã "chờ sẵn".

### 5. Generator + guard + Console đồng bộ schema số
- ANNEX-122 generator (Python + PHP `KpiRegistryAdminService`) suy chuỗi
  hiển thị từ số — byte-identical.
- `check_kpi_integrity.php` validate `green_point`/`yellow_point` là số,
  thứ tự đúng theo `direction`.
- KPI Console: ô nhập ngưỡng là **number input**, kèm preview RAG-band
  tính trực tiếp từ số.

## Verify

- Deploy GitHub Actions HEAD `0903add3` XANH (qua phpstan + phpunit +
  migration drift + schema-smoke).
- VPS live: `schema_version=6`; FINAL_RELEASE_RFT nhập tay 96.5 →
  status=**yellow** đúng (green 98, yellow 95); manual-input flow chạy.
- API `kpi_input_save`/`kpi_input_list` route resolve (RBAC enforce).
- KPI Console (Chrome inject): 6 thẻ công ty hiện number input
  green_point/yellow_point + preview RAG "≥ 95% / 90 – <95% / < 90%".
- 3 audit + `check_kpi_integrity` PASS (0 P0).

## Sự cố deploy đã xử lý

1. **PHPStan** — `?? '%'` thừa sau early-return (KpiEngine narrow type) → bỏ.
2. **Schema-smoke `schema_drift`** — migration 196 thêm bảng `kpi_manual_inputs`
   nhưng `table-registry.json` (catalog authority của DataSchemaService) chưa
   có → live DB bị xếp "unmanaged table". Khắc phục: thêm entry
   `kpi_manual_inputs` vào `table-registry.json` (text-splice tối thiểu, không
   reformat file 8 MB). Đây là quy trình bắt buộc khi thêm bảng mới.

## Phản biện thực chiến — kết luận

- **Ngưỡng giờ là số:** mọi KPI RAG/trend/scorecard tính bằng số học → tổng
  hợp, phân tích, đánh giá dữ liệu được. Không còn ngưỡng text "máy không gộp".
- **Mọi KPI có đường dữ liệu:** runtime → `GET /api/kpi/{code}`; staged/manual
  → `POST /api/kpi/{code}/input`. Không KPI nào "treo".
- **SSOT, không hardcode:** ngưỡng + định nghĩa KPI ở registry; engine đọc
  từ đó; endpoint sinh từ mã.
- **Còn lại:** 3 KPI `calibration_pending` (GROSS_MARGIN, QUOTE_HIT_RATE,
  RECORDABLE_INCIDENT_RATE) — ngưỡng phụ thuộc mô hình chi phí/thị trường/cửa
  sổ trượt, hiệu chỉnh khi có dữ liệu thật. Frontend module nhập liệu cho
  staged KPI là việc kỳ sau (endpoint đã sẵn sàng).

---
*Người thực hiện: Claude Sonnet 4.6. Bằng chứng: báo cáo nghiên cứu sâu +
tài liệu này + deploy log.*
