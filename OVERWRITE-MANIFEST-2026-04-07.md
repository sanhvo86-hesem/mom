# OVERWRITE PACKAGE — HESem QMS Module Builder NextGen

Ngày tạo: 2026-04-07

Gói này được tạo để overwrite trực tiếp vào local source tree với root folder:

`qms.hesem.com.vn/`

## File thay đổi chính

- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/docs/module-builder-nextgen-upgrade-2026-04-07.md`
- `01-QMS-Portal/release/module-builder-nextgen-manifest-2026-04-07.json`

## Mục tiêu nâng cấp

- Mở rộng block property schema theo hướng enterprise / manufacturing-native.
- Bổ sung governance metadata, query/data pipeline, streaming, responsive grid nâng cao, action flow orchestration, automation policy cho block-level schema.
- Bổ sung Module Studio trong builder để quản trị metadata module-level: governance, design, quality, publish, integration.
- Bổ sung export builder JSON / runtime JSON, duplicate module, readiness scoring, builder manifest.

## Cách dùng

1. Giải nén zip.
2. Copy toàn bộ nội dung trong folder `qms.hesem.com.vn/` đè lên source local.
3. Kiểm tra diff.
4. Chạy local test/build của anh.
5. Commit + push từ local.

## Lưu ý

- Gói này thiên về nâng cấp chiều sâu cho builder engine hiện tại, không tái cấu trúc toàn repo.
- Hai file JS đã được kiểm tra syntax bằng `node --check` trước khi đóng gói.
