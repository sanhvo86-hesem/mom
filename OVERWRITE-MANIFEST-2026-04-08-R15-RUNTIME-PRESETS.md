# OVERWRITE MANIFEST — 2026-04-08 — Round 15 Runtime Presets

Gói này là **cumulative overwrite** trên nền round 14 serious runtime design.

## Mục tiêu

- bỏ trọng tâm khỏi builder chrome
- tăng năng lực preset cho **module runtime được tạo ra**
- làm cho các option block design đang có thực sự có hiệu lực ở runtime
- thêm preset studio, preview runtime thật và auto-style cho module cũ

## File cần overwrite

- `qms.hesem.com.vn/01-QMS-Portal/scripts/portal/00-block-engine.js`
- `qms.hesem.com.vn/01-QMS-Portal/scripts/portal/31-module-builder.js`
- toàn bộ file docs / release kèm theo trong gói

## Điểm mới chính

- 14 runtime presets
- runtime controls thật cho header / tabs / card / table / form / button / badge / KPI / frame / motion / font scale
- fix mapping cho surfaceVariant / semanticTone / density / themePreset / shellPreset / motionPreset
- preview probe + preview module runtime hiện tại
- export runtime theme JSON
- polish all blocks cho module cũ

## Test trước khi đóng gói

- syntax pass cho 2 file JS
- VM smoke pass cho preset resolution, block mapping, render wrapper, builder export
