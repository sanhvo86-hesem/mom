# Backend track — branch completion report
### Session BACKEND · worktree `mom-mstudio-backend` · 2026-06-02

## Scope nhánh (prompt gốc) — HOÀN TẤT 100%, mỗi item qua trọn cổng chuẩn + verify live
| Item | PR | Trạng thái |
|---|---|---|
| **P0.B1** gỡ pipeline RED | (mda #143) | ✅ verify-only: live aligned, deploy xanh |
| **P0.B2** converge one-token-authority (mig 285) | #146 | ✅ shipped+verified |
| **P3.B** registry editor saves L2/L3/L4 + theme preset clone | #152 | ✅ shipped+verified |
| **P3.B scheduler active-enforcement** (deferred sub-item) | #?(complete) | ✅ `graphics_theme_schedule_active`, logic verified |
| **P3.B-lifecycle** version/soft-delete/optimistic-lock/binding | #154 | ✅ shipped+verified |
| **P4.B** build-packet schema + CI manifest gate | #156 | ✅ shipped+verified, Graphics Safety job xanh |

## Audit nghiêm khắc (founder yêu cầu) — phát hiện + sửa 1 bug nền
- **PDO `$N` defeat cả READ lẫn WRITE** (PRs #159, #161): harness PDO thật trên live cho thấy `DesignTokenCatalogService` (snapshot/listCatalog/getEffectiveValue/list*) + `GraphicsQaGateRunner` còn `$N` → nuốt catch → fallback. ⇒ **P0.B2 thực chất chưa chạy** (snapshot đọc JSON, không đọc graphics_token_value). Sửa hết `$N`→`?`+pgParams. Verify SAU fix: snapshot=143 DB key (semantic.color.role.quality=#dc2626 từ DB, colorsDark.* biến mất), listCatalog=154, components=27, blocks=6, archetypes=2, save trả full row. Sweep toàn repo: không còn `$N` DataLayer nào (DataSchemaService/VpsService dùng named params).

## Còn lại — NGOÀI scope nhánh (phase riêng, đã scope chính xác)
- **P0.B2b** mở rộng catalog 154→phủ đủ global key để FE cắt fallback per-key TOÀN BỘ. KHÔNG auto-bulk được (namespace divergence status/statusColors, fontScale/fontSize; module-specific eqms/moduleMaster KHÔNG nên global; css_var phải sourced từ CSS). Plan curate per-family: `exec/P0.B2b-catalog-expansion-PLAN-2026-06-02.md`. Hôm nay FE đã cắt được fallback cho 143 governed key (snapshot phục vụ DB).
- **P4.3** thu grandfather allowlist khi FE migrate build-packet sang manifest (phụ thuộc FE).

## Bằng chứng
- 8 PR merged: #146 #152 #154 #156 #159 #161 (+ scheduler/docs PR này).
- Exec reports: `exec/P0.B1|P0.B2|P3.B|P3.B-lifecycle|P4.B|AUDIT-pdo-dollar-N-read-fix|P0.B2b-PLAN|BRANCH-COMPLETION-*.md`.
- Contracts: `CONTRACTS-MODULE-STUDIO.md` (mọi action_key + JSON shape + behavior change cho FE).
- Tất cả deploy.yml xanh; live `eqms.hesemeng.com` cập nhật; không regression (API 401 không 500, portal 200).
