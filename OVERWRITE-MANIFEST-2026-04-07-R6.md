# OVERWRITE MANIFEST — Round 6

## Root folder
- `qms.hesem.com.vn/`

## Files included in gói overwrite
- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/docs/module-builder-ultra-round6-2026-04-07.md`
- `01-QMS-Portal/release/module-builder-ultra-round6-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round6-smoke-2026-04-07.txt`
- `OVERWRITE-MANIFEST-2026-04-07-R6.md`

## Nội dung vòng 6
- Experience OS deck
- Flow Studio lane canvas
- Governance Matrix
- Theme Atelier
- Diff Studio với baseline intelligence
- AI Prompt Lab + export prompt cho GPT Pro
- flow JSON export
- template round 6 trong block engine

## Bug fix đã vá
- tránh double cockpit stacking giữa round 5 và round 6
- fallback insert template nếu helper runtime không sẵn
- auto-tab safety cho schema thưa/rỗng
- sync manifest tại create/open/save
- export hook có thể smoke test

## Kiểm tra đã chạy
- `node --check` cho `00-block-engine.js`: pass
- `node --check` cho `31-module-builder.js`: pass
- stub browser smoke: pass
- flow JSON export: pass
- GPT Pro prompt export: pass

## Smoke highlight
- schema version: `2026-04-07-r6`
- template count: `126`
- demo flow: `24 nodes / 23 edges`
- prompt length: `3737`

## Cách dùng
1. Giải nén zip.
2. Copy đè thư mục `qms.hesem.com.vn/` vào local working tree của anh.
3. Review diff.
4. Chạy local test nhanh builder.
5. Commit và push từ máy anh.

## Test nhanh nên chạy sau khi overwrite local
- mở builder
- tạo module trắng
- mở module cũ
- bấm `Supreme upgrade`
- thử `Flow studio`
- thử `Governance`
- thử `Theme atelier`
- thử `Diff studio`
- thử export `flow JSON`
- thử export `GPT Pro prompt`
