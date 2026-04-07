# OVERWRITE MANIFEST — 2026-04-07 — R7 CUMULATIVE ALL-CHAT

Gói này là **gói tích lũy đầy đủ** cho toàn bộ thay đổi trong đoạn chat hiện tại.
Người dùng chưa apply các vòng trước, vì vậy zip này đã gom lại các file mới nhất + tài liệu/release notes từ các vòng trước để overwrite local một lần.

## Root zip

- `qms.hesem.com.vn/`

## File runtime/source mới nhất cần overwrite

- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`

## File tài liệu / release / smoke kèm theo

- `01-QMS-Portal/docs/module-builder-nextgen-upgrade-2026-04-07.md`
- `01-QMS-Portal/docs/module-builder-ultra-round2-2026-04-07.md`
- `01-QMS-Portal/docs/module-builder-ultra-round3-2026-04-07.md`
- `01-QMS-Portal/docs/module-builder-ultra-round4-2026-04-07.md`
- `01-QMS-Portal/docs/module-builder-ultra-round5-2026-04-07.md`
- `01-QMS-Portal/docs/module-builder-ultra-round6-2026-04-07.md`
- `01-QMS-Portal/docs/module-builder-ultra-round7-2026-04-07.md`
- `01-QMS-Portal/release/module-builder-nextgen-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round2-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round3-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round4-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round5-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round5-smoke-2026-04-07.txt`
- `01-QMS-Portal/release/module-builder-ultra-round6-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round6-smoke-2026-04-07.txt`
- `01-QMS-Portal/release/module-builder-ultra-round7-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round7-smoke-2026-04-07.txt`
- `01-QMS-Portal/release/module-builder-ultra-round7-sample-audit-pack-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round7-sample-executive-brief-2026-04-07.md`

## Điểm mấu chốt của cumulative overwrite này

- khôi phục phần Round 6 ultra từng bị skip do trùng guard
- tạo Experience Director shell cho builder
- thêm Scenario Studio, Layout Harmony, Accessibility Ops, Market Lens, Visual Modes
- thêm export Executive Brief / Audit Pack
- thêm Round 7 block templates
- giữ lại đầy đủ lịch sử docs/release của các vòng trước trong chat này
