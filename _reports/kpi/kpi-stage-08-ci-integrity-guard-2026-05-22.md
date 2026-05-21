# KPI Stage 08 — CI Integrity Guard (2026-05-22)

**Prompt:** `_reports/kpi-upgrade-prompts/08-ci-integrity-guard.md`
**Kết quả:** `check_kpi_integrity.php` chặn drift hệ KPI khi deploy.

## Việc đã làm

1. **`mom/tools/release/check_kpi_integrity.php`** — guard mô phỏng
   `check_raci_integrity.php` (P0 chặn deploy, P1 cảnh báo, exit code).
2. **Wire CI** — `deploy.yml` chạy guard ngay sau RACI check, KHÔNG điều kiện
   `needs_php_validation` (thay đổi KPI thường là changeset doc-only bị
   classify đánh frontend-only).
3. **ANNEX-127 §10** thêm dòng ghi nhận guard + điều kiện P0. ANNEX-128
   regenerate. Đồng bộ 2 doc lên VPS (S07-DEPLOY).

## Kiểm tra P0 (chặn deploy)

| # | Drift bắt được |
|---|----------------|
| 1 | Mã KPI ANNEX-122 (`data-kpi-code`) lệch registry |
| 2 | Governance KPI thiếu formula/thresholds/owner_role/data_source/calculation_status/decision_action |
| 3 | `runtime_calculated` nhưng mã không trong `runtime_calculated_metrics` hoặc không có trong KpiEngine.php |
| 4 | Trùng `canonical_code` |
| 5 | Legacy alias trỏ mã không phải metric đã biết |
| 6 | Gate `linked_cdr` trỏ CDR không có trong ANNEX-121 |
| 7 | `reward_eligible:true` thiếu `counter_metric` hợp lệ |

## Kiểm tra P1 (cảnh báo)

KPI staged trong executive scorecard; KPI lag thiếu `paired_metric`; KPI đơn
vị % có `min_sample` 0; dashboard endpoint ngoài `/api/kpi/`; mã governance
chưa được liệt kê trong ma trận ANNEX-128.

Trạng thái hiện tại: **PASSED, 23 cảnh báo P1, 0 P0** — chạy cục bộ và trong
CI deploy (xác nhận trong log GitHub Actions).

## Verify

- Guard chạy cục bộ: exit 0, 0 P0.
- **Drift test 1:** xoá `counter_metric` của OTD (reward KPI) → guard FAIL P0.7
  → revert → PASS.
- **Drift test 2:** đổi tên `OTD`→`OTD_RENAMED` → guard FAIL 3 P0 (runtime
  chưa nối, ANNEX-122 thiếu mã, ANNEX-122 có mã lạ) → revert → PASS.
- CI: bước "KPI integrity check" chạy trong `deploy.yml`, log "PASSED with 23
  warning(s)"; deploy HEAD `8ae6553a` XANH.

## Tự phản biện

- **Bắt đúng drift prompt 01 nêu?** Có — 7 nhóm P0 phủ: mã lệch ANNEX↔registry,
  thiếu trường, runtime chưa nối engine, trùng mã, alias hỏng, gate↔CDR,
  reward thiếu counter. Drift test 2 kịch bản xác nhận FAIL đúng.
- **Quá chậm / sai phạm vi?** Không — guard <1s, đọc registry + 4 file doc.
- **False positive?** Đã sửa một tiền đề sai: check ban đầu "mọi mã governance
  phải có trong ANNEX-128" sinh 12 P0 giả — ANNEX-128 là ma trận *document
  usage*, chỉ liệt kê mã được trích dẫn trong tài liệu, nên mã KPI mới chưa
  được dẫn ở nơi khác vắng mặt là HỢP LỆ. Đã hạ xuống P1 advisory. P1
  "% thiếu min_sample" báo 7 KPI (CAL_COMPLIANCE… cố ý min_sample 0) — giữ
  P1 theo prompt, là advisory không chặn.

## Quyết định ghi nhận

CLAUDE.md KHÔNG được sửa: mục "Multi-AI session safety" của CLAUDE.md là về
chống mất dữ liệu giữa các phiên (preflight, pre-push, migration drift) —
guard KPI không thuộc chủ đề đó; và tiền lệ `check_raci_integrity.php` cũng
không có trong CLAUDE.md. Guard được ghi nhận đúng chỗ: ANNEX-127 §10 (nơi
chứa change-control policy KPI) + tự mô tả trong `deploy.yml`.

## Finding chuyển tiếp

| # | Mô tả | Prompt |
|---|-------|--------|
| S08-01 | P1 "ANNEX-128 thiếu mã" — có thể nâng cấp guard regenerate matrix vào temp và so để check staleness chính xác hơn. | sau |
| S08-DEPLOY | (Từ S07) deploy.sh preserve toàn bộ `mom/docs/operations` — guard chưa kiểm tra drift VPS-vs-git cho doc. | 09 |

---
*Stage 08 hoàn tất. Tiếp theo: Prompt 09 — `09-final-deploy-verify-reaudit.md`.*
