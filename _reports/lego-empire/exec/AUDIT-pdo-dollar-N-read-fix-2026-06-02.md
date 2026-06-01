# Exec · AUDIT + FIX — PDO `$N` placeholder defeats the graphics read/write layer
### Session BACKEND · nhánh `codex/mstudio-backend-pdofix-20260602` · 2026-06-02

## Cách phát hiện (audit nghiêm khắc theo yêu cầu founder)
Verify P3.B trước đó CHỈ test SQL bằng psql literal (BEGIN…ROLLBACK) — **chưa test đường PDO thật**. Dựng harness PHP chạy service THẬT trên VPS (peer-auth `postgres`, config override → MODE=POSTGRES_ONLY) gọi save/list/snapshot.

## 🔴 Bug gốc (nghiêm trọng, defeat P0.B2)
`DataLayer->query/row/execute` bind tham số theo **key mảng** → `$N` Postgres placeholder gây `PDOStatement::bindValue(): Argument #1 must be >= 1` (key 0). Memory `feedback_pdo_dollar_placeholder_bug` cảnh báo cho WRITE; **thực tế cả READ cũng vỡ**. Hệ quả (đo trên live qua harness):
- `snapshotEffective(['role'=>'ceo'],'light')` → query `$N` lỗi → **nuốt catch → JSON fallback**. Trả 353 key CÓ `colorsDark.bgPage` (key JSON-only), `semantic.color.role.quality`=**MISSING**. → **P0.B2 chưa từng hoạt động ở read layer**: snapshot đọc JSON `design-system-config.json`, KHÔNG đọc `graphics_token_value`. mig 285 backfill DB đúng nhưng **không bao giờ được đọc**.
- `listCatalog`=353 (JSON-derived, không phải 154 DB), `listComponentContracts`=0, `getEffectiveValue`=JSON path.
- `listBlockContracts`/`listModuleArchetypes` (P3.B của tôi)=0 dù bảng có 6/2 seed + insert → list actions rỗng; `saveX` trả fallback `{key}` thay **full row** (vi phạm contract đã hứa FE).
- WRITES `$N` (stageTokenChange/publishRollout/rollbackRollout/recordSimulationRun) = no-op âm thầm (graphics rollout flow gãy).

Lưu ý: WRITES P3.B của tôi (`saveComponentContract/Block/Archetype`, `saveThemePreset`, clone) ĐÃ dùng `?`+pgParams → **persist OK** (harness xác nhận block_total 7 = 6 seed + 1 insert). Bug chỉ ở các method còn dùng `$N`.

## Fix
Chuyển TẤT CẢ `$N` → `?` + `$this->pgParams([...])` (1-indexed) trong `DesignTokenCatalogService` — đúng convention đã chứng minh production của `saveThemePreset`:
- READS: `listCatalog`, `getToken`, `getEffectiveValue`, `snapshotEffective`, `listPreviewScenes`, `listComponentContracts`, `listBlockContracts`, `listModuleArchetypes`.
- WRITES: `stageTokenChange`, `publishRollout`, `rollbackRollout`, `recordSimulationRun`.
- Nullable-filter `($1::text IS NULL OR col=$1)` → `(?::text IS NULL OR col=?)` bind giá trị **2 lần** (`?` không tái dùng vị trí được). Boolean filter bind `'true'/'false'/null` + `?::boolean` (PDO stringify bool → ''/'1' sẽ vỡ cast).

Probe chứng minh fix qua DataLayer thật: `? +published`→6 rows; `(?::text IS NULL OR status=?)` bind [null,null]→7 rows; `row()` `?`→`brand.primary='#0c4a6e'` từ graphics_token_value.

## Blast radius (an toàn)
snapshot nay trả ~143 governed key (DB) thay 353 (JSON). `tokens.read` cho ~210 key ngoài-catalog rơi `HmTheme.getDeep` (00bb:145, FE chưa cắt) — như cũ. CSS var do HmTheme/JSON áp, KHÔNG iterate snapshot → render KHÔNG đổi. 143 key shared: DB==JSON (diverge=0 đã đo) → không nhảy. Worst case nếu fix sai: lại rơi JSON fallback = status quo (không tệ hơn).

## Verify
- `php -l` sạch; hết `$N` (trừ comment).
- Dọn 3 row test `__audit_*` trên live (DELETE 1×3).
- Post-deploy harness (mục dưới): snapshot đọc DB (không còn colorsDark.*, có semantic.color.role.*), list trả rows, save trả full row, write round-trip persist.

## Tác động cross-deliverable
- **P0.B2** nay THẬT SỰ hoạt động: snapshot = graphics_token_value (authority). Đây là điều P0.B2 tuyên bố nhưng read layer chặn.
- **P3.B** list/save-full-row nay hoạt động.
- Pre-existing graphics rollout write flow (stage/apply/rollback) nay persist DB — FE Theme UI nên E2E lại.
