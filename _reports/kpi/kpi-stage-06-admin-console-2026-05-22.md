# KPI Stage 06 — KPI Admin Console (2026-05-22)

**Prompt:** `_reports/kpi-upgrade-prompts/06-kpi-admin-console.md`
**Kết quả:** Console quản trị KPI trong portal — xem và biên tập registry KPI
không phải sửa JSON tay.

## Việc đã làm

1. **`KpiRegistryAdminService.php`** — `load()` trả catalog governance theo
   tier + thống kê; `save()` validate → ghi overlay runtime → tái tạo vùng
   §4/§5/§6 ANNEX-122 (byte-identical với generator của các stage);
   `validate()` chặn mã trùng, ngưỡng thiếu, reward thiếu counter, cadence sai.
2. **`KpiEngine::applyRuntimeOverlay`** — merge overlay
   `kpi-authority-registry.runtime.json` (gitignored) vào seed registry với
   schema-version gate; chỉ field biên tập được (ngưỡng, owner, steward,
   cadence, decision/action, counter_metric) — field cấu trúc giữ seed.
3. **`AdminController::kpiRegistryGet/kpiRegistrySave`** — RBAC admin+ceo+
   general_director, CSRF, audit_events; route `admin_kpi_registry_get/save`.
4. **`00o-admin-kpi-registry.js`** — Console dashboard (6 thẻ thống kê + 5 tile
   nhóm) + thẻ biên tập từng KPI bằng widget có cấu trúc (input ngưỡng,
   dropdown role/cadence/counter-metric, textarea) — KHÔNG lộ JSON thô. Gate
   metric + proposed hiển thị chỉ-xem. CSS bám Graphics Authority token.
5. **Section `kpi_registry`** đăng ký trong `02-state-auth-ui.js` nhóm
   governance, cạnh `raci_matrix` (catalog + dispatch + loader động).

## Verify Chrome (live)

Phiên Chrome không đăng nhập → verify bằng kỹ thuật inject (theo prompt):
nạp `00o-admin-kpi-registry.js` từ server live, stub `apiCall` trả config
thật lấy từ `KpiRegistryAdminService::load()` chạy trên VPS.

- Dashboard render: 6 thẻ thống kê (33 governance · 14 runtime · 18 staged ·
  1 manual · 100% đủ ngưỡng · 27.3% có counter), 5 tile nhóm.
- Nhóm "KPI cấp công ty": 6 thẻ biên tập, mỗi thẻ có widget cấu trúc cho
  ngưỡng/owner/steward/cadence/counter/basis/decision/action — không JSON thô.
  Badge calc-status đúng (Tính runtime / Chưa có data contract / Nhập tay).
- Nhóm "Gate metric": 21 dòng chỉ-xem, không có thẻ biên tập.
- Luồng biên tập: sửa ngưỡng OTD → thẻ OTD sáng "dirty" + nút Lưu bật;
  Hoàn tác → hết dirty, nút Lưu tắt.
- Console: 0 lỗi JavaScript.

Backend verify trên VPS:
- `KpiRegistryAdminService::load()` deployed: 33 governance KPI, schema v5.
- `GET admin_kpi_registry_get` không phiên → `unauthorized` (RBAC đúng).
- `save()` test cục bộ: sửa ngưỡng OTD → overlay ghi, ANNEX-122 tái tạo có
  "Xanh ≥96%"; validate chặn reward-thiếu-counter. No-op save byte-identical.

## Tự phản biện (4 điểm)

1. **Có lộ JSON thô không?** Không. Mọi field qua widget có cấu trúc — input
   text cho ngưỡng, `<select>` cho role/cadence/counter, `<textarea>` cho
   basis/decision/action. Gate/proposed chỉ-xem dạng bảng.
2. **Lưu có chạy đúng change-control?** Có. `save()` validate → ghi overlay →
   tái tạo §4/§5/§6 ANNEX-122; controller ghi `audit_events`
   (`admin_kpi_registry_save`). Overlay byte-identical với generator stage.
3. **RBAC chặn vai trò không phải admin?** Có. `requireAnyRole(admin+ceo+
   general_director)` + `requireCsrf()`; curl không phiên trả `unauthorized`.
4. **Hardcode màu/size?** Không. CSS bám `var(--accent/--surface/--border/
   --text-1...)` với fallback. `save()` có schema-version gate — overlay cũ
   hơn seed schema bị bỏ qua.

## Finding chuyển tiếp

| # | Mô tả | Prompt |
|---|-------|--------|
| S06-01 | Console biên tập 33 governance KPI; gate/proposed chỉ-xem. Cho phép biên tập gate metric là mở rộng tương lai. | sau |
| S06-02 | Verify Console với phiên admin thật (login) chưa làm — phiên Chrome hiện không đăng nhập; đã verify bằng inject + config thật từ VPS. | 09 |
| S06-03 | 11 P2 `LEGACY_ALIAS_USED`. | 07 |

---
*Stage 06 hoàn tất. Tiếp theo: Prompt 07 — `07-vietnamese-rewrite.md`.*
