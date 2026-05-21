# KPI Stage 02 — Registry as Full SSOT (2026-05-21)

**Prompt:** `_reports/kpi-upgrade-prompts/02-registry-as-full-ssot.md`
**Kết quả:** Registry trở thành SSOT đầy đủ, máy đọc được cho 33 governance KPI.

## Việc đã làm

1. **Schema KPI đầy đủ** — mỗi mục `annex122_governance_kpis` mang: `name_vi`,
   `layer`, `purpose`, `formula{numerator,denominator,unit,rounding,exclusions,
   direction,min_sample}`, `thresholds{green,yellow,red}`, `data_source{system,
   tables,columns,evidence}`, `owner_role`, `data_stewardship_role`, `cadence`,
   `lead_or_lag`, `paired_metric`, `decision_action`, `counter_metric`,
   `reward_eligible`, `calculation_status`, `status`.
2. **33 governance KPI điền đầy đủ** — 5 runtime (`runtime_calculated`,
   công thức khớp hàm `calc*`), 28 `staged_data_contract` với `data_source`
   candidate đánh dấu chờ prompt 04 xác nhận.
3. **`schema_version: 2`** + version `2026-05-21`. KpiEngine có schema-version
   gate cho `kpi_snapshots` (snapshot đóng dấu schema_version; trend đọc bỏ qua
   snapshot schema cũ, fallback live recalculation).
4. **KpiEngine** đọc schema mới qua `getMetricCatalog()`; `inferCalculationStatus`
   tôn trọng `registry_calculation_status` làm SSOT; `counter_metric` precedence
   override → registry → default. `php -l` sạch.
5. **ANNEX-122 §4/§5/§6** regenerated từ registry, bọc marker `KPI-COMPANY`,
   `KPI-VALUESTREAM`, `KPI-DEPARTMENT`; §9 gate bọc `KPI-GATE`. Mỗi `<tr>` có
   `data-kpi-code`.
6. **ANNEX-128** regenerated bằng `audit-kpi-system-matrix.php`.
7. **3 audit script PASS** — không có P0/P1. 11 finding P2 (`LEGACY_ALIAS_USED`
   ở ANNEX-120/120B/121) là tồn đọng, giữ legacy alias theo đúng hướng dẫn
   prompt 02, để prompt 07 dọn.

## Verify

- Deploy GitHub Actions: HEAD `50158a1c` XANH.
- VPS live `/var/www/eqms.hesemeng.com`: registry `schema_version=2`,
  33 governance KPI có `formula`/`owner_role`.
- Catalog API trên code đã deploy: `registry_schema_version=2`,
  33 governance KPI trong catalog (5 runtime_calculated).

## Tự phản biện (3 vòng)

**Vòng 1 — KPI nào sau khi điền vẫn không có data_source thật?**
28/33 KPI vẫn `staged_data_contract`. KHÔNG bịa số — `data_source` ghi
candidate tables + `evidence` nói rõ "Hợp đồng dữ liệu chưa xác nhận — prompt 04".
Chỉ 5 runtime KPI có `data_source` xác nhận (bảng thật khớp `calc*`).

**Vòng 2 — Công thức registry có khớp 100% hàm `calc*`?**
Đối chiếu từng KPI runtime:
- OTD: registry tử = `delivery_date_actual <= delivery_date_est`, mẫu =
  `shipment_status='delivered'` — khớp `calcOtd`.
- COMPLAINT_RATE: registry tử = NCR `nonconformance_source='Customer'` × 1.000.000,
  mẫu = shipments delivered, đơn vị ppm — khớp `calcComplaintRate` (`*1_000_000`).
  Lưu ý: docblock trong code ghi "x 1000" nhưng code thực `*1_000_000`; registry
  theo CODE (ppm). Docstring lệch — ghi finding cho prompt 04 sửa comment.
- CAL_COMPLIANCE: tử = thiết bị có hiệu chuẩn mới nhất `<= calibration_due`,
  mẫu = thiết bị active có `calibration_due` trong kỳ — khớp `calcCalCompliance`.
- SUPPLIER_OTD: `AVG(otd_pct)` từ `vendor_ratings` — khớp `calcSupplierOtd`.
- TRAINING_COMP: tử = `assessment_result IN ('Pass','Conditional')` — khớp
  `calcTrainingCompletion`.

**Vòng 3 — schema_version gate + ANNEX-122 drift?**
- `schema_version` tăng 0→2; KpiEngine có gate trong `saveSnapshot` +
  `loadTrendFromSnapshots`. Gate an toàn: trend rỗng → fallback live calc,
  không mất dữ liệu.
- ANNEX-122 §4/§5/§6 sinh trực tiếp từ registry → không còn ô lệch. §7/§8
  giữ nguyên (mô tả nguyên tắc, không phải bảng KPI). Marker đã đặt cho cả
  4 vùng.

## Finding chuyển tiếp

| # | Mô tả | Prompt |
|---|-------|--------|
| S02-01 | Docblock `calcComplaintRate` ghi "x 1000" sai (code `*1_000_000`). Đơn vị đúng là ppm. | 04 |
| S02-02 | 28 KPI `staged_data_contract` cần data contract + hàm `calc*` thật. | 04 |
| S02-03 | `counter_metric` registry bị `metric_governance_overrides` ghi đè ở một số KPI (vd OTD). Cần hoà giải counter-metric registry ↔ overrides. | 03 |
| S02-04 | 11 finding P2 `LEGACY_ALIAS_USED` (CCR…) ở ANNEX-120/120B/121. | 07 |

---
*Stage 02 hoàn tất. Tiếp theo: Prompt 03 — `03-thresholds-actions-fairness.md`.*
