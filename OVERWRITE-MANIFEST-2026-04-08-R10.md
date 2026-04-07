# OVERWRITE MANIFEST — ROUND 10 GLASS EXECUTIVE

## Package
- Patch version: `2026-04-08-r10-glass-executive`
- Package type: `cumulative-overwrite`
- Root: `qms.hesem.com.vn/`
- Based on: `2026-04-08-r9-glass-pro`

## What this overwrite does
- giữ glass aura của round 7 nhưng siết lại contrast và discipline
- thay lớp rail/panel round 9 bằng lớp round 10 chuyên nghiệp hơn
- ẩn legacy labs mặc định để builder sạch hơn
- thêm governance board, workflow atlas, typography lab và discipline board theo kiểu on-demand
- thêm auto refine và style guide export
- thêm 10 template round 10 vào block engine

## Changed files
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/docs/module-builder-ultra-round10-2026-04-08.md`
- `01-QMS-Portal/release/module-builder-ultra-round10-manifest-2026-04-08.json`
- `01-QMS-Portal/release/module-builder-ultra-round10-smoke-2026-04-08.txt`
- `01-QMS-Portal/release/module-builder-ultra-round10-sample-style-guide-2026-04-08.md`
- `OVERWRITE-MANIFEST-2026-04-08-R10.md`

## Validation
- `node --check` for both JS files: pass
- round 10 smoke: pass
- total templates after patch: `157`

## Deploy note
Giải nén và copy đè toàn bộ folder `qms.hesem.com.vn/` lên hệ thống, sau đó hard reload trình duyệt (`Ctrl+F5`).
