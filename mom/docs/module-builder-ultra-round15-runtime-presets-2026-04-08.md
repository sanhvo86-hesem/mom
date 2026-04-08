# Module Builder Ultra Round 15 — Runtime Preset Library

## Mục tiêu

Vòng này chuyển trọng tâm sang **đồ hoạ của module runtime được tạo ra**. Builder chỉ là nơi cấu hình và preview. Toàn bộ nâng cấp tập trung vào `schema.runtimeDesign` và runtime rendering trong `00-block-engine.js`.

## Những gì đã thay đổi

### 1) Runtime preset library thật

Thêm 14 preset runtime:
- executive-glass
- boardroom-crystal
- planning-tower
- quality-cleanroom
- supplier-radar
- audit-ledger
- finance-ledger
- compliance-paper
- operator-command
- shopfloor-signal
- warehouse-handheld
- customer-portal
- night-ops
- maintenance-night

Các preset này tác động vào module runtime thật:
- page header
- tab bar
- card surface
- KPI cards
- buttons
- badges
- tables
- forms / filter bars
- frame / stage
- motion
- density / spacing
- typography scale

### 2) Sửa các option block trước đây chỉnh không ăn

Round 15 map runtime thật cho các field đã có trong property panel:
- `config.design.surfaceVariant`
  - default / elevated / outlined / tinted / glass / solid
- `config.design.semanticTone`
  - default / brand / info / success / warning / danger
- `config.design.density`
  - comfortable / compact / dense / relaxed
- `config.design.themePreset`
  - enterprise / industrial / executive / shopfloor / lab / dark-ops
- `config.design.shellPreset`
  - page / workspace / ops-center / executive-board
- `config.design.motionPreset`
  - none / subtle / standard / expressive
- `config.design.visualLanguage`
- `config.design.heroMood`
- `config.design.iconStyle`
- `config.design.chartStyle`
- `config.design.panelGlass`
- `config.design.cssVars`

### 3) Runtime Preset Studio mới trong builder

Thêm studio tập trung vào runtime output:
- preset library
- starter kits cho trang trắng
- runtime controls cho header / tabs / cards / tables / forms / buttons / KPI / frame / motion
- preview probe để xem preset đổi thật
- preview runtime hiện tại của module
- xuất runtime theme JSON
- nút `Polish all blocks` để áp style heuristic vào các block đang có

### 4) Auto-style cho module cũ

Các module cũ thường chưa có `config.design.*`. Vòng này thêm 2 lớp:
- **module-level runtime theme**: đổi giao diện ngay cả khi block chưa có style config
- **block auto-polish**: nút builder để ghi style hợp lý xuống từng block theo loại block và preset hiện tại

## File thay đổi chính

- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`

## Test đã chạy

- `node --check` cho `00-block-engine.js`
- `node --check` cho `31-module-builder.js`
- VM smoke cho:
  - preset library count
  - preset resolution
  - runtime render wrapper
  - block attribute mapping
  - builder summary
  - builder runtime export
  - probe schema

## Cách test sau khi overwrite

1. Tạo một module mới trắng.
2. Mở Runtime Preset Studio.
3. Chuyển giữa `executive-glass`, `audit-ledger`, `operator-command`, `shopfloor-signal`.
4. Quan sát preview probe và preview module hiện tại.
5. Bấm `Apply to schema` rồi `Preview runtime`.
6. Với module cũ, bấm `Polish all blocks` rồi preview lại.
7. Trong property panel của block, đổi `surfaceVariant`, `semanticTone`, `density`, `themePreset`, `shellPreset`, `motionPreset` để xác nhận block-level override có hiệu lực.
