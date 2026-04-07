# HESEM QMS Module Builder Ultra Round 7 — cumulative all-chat overwrite

Ngày: 2026-04-07
Mục tiêu: tạo một gói overwrite duy nhất bao trùm toàn bộ thay đổi trong đoạn chat này, đồng thời nâng tiếp module builder theo hướng mạnh hơn, trực quan hơn, đẹp hơn và dễ vận hành hơn.

## Bug fixes thực sự đã xử lý

1. **Trùng guard Round 6**
   - Nhánh "ULTRA Round 6" phía sau dùng lại guard đã được set ở patch trước.
   - Hệ quả: một mảng năng lực sau đó không bao giờ chạy.
   - Round 7 thêm cơ chế **recovery** và đồng bộ manifest để phần năng lực bị skip được bù lại bằng schema/meta mới và template seed hợp lệ.

2. **Bề mặt test/export không ổn định**
   - `__HM_MB_R6_TEST__` bị thay đổi không nhất quán giữa các lần overwrite trước.
   - Round 7 tạo `__HM_MB_R7_TEST__` ổn định hơn và backfill alias tương thích cho các phương thức thường dùng của Round 6.

3. **Người dùng chưa apply vòng nào trước đó**
   - Các gói trước là increment theo từng vòng.
   - Round 7 tạo ra **gói cumulative all-chat overwrite** để người dùng chỉ cần giải nén/copy đè một lần.

## Năng lực mới của Round 7

- **Experience Director**: lớp cockpit mới ở trên builder với thẻ điểm trực quan cho layout harmony, accessibility ready, visual craft, scenario readiness, operator clarity.
- **Scenario Studio**: preset theo ngữ cảnh vận hành:
  - executive-theatre
  - operator-shift
  - audit-sprint
  - supplier-radar
  - release-theatre
- **Layout Harmony**: phân tích mật độ tab/block, spread, recommendation và auto-balance.
- **Accessibility Ops**: preset high-clarity, handheld-thumb, executive-wall.
- **Market Lens**: tóm tắt package, compare mode, reuse score, dependencies và value props.
- **Visual Modes / Beauty Forge**: aurora-command, calm-paper, night-plant.
- **Executive Brief export**: xuất brief markdown để dùng tiếp với GPT Pro.
- **Audit Pack export**: xuất JSON gồm manifest, metrics, diff, flow graph, storyboard, layout report.
- **Preview ribbon**: preview được bọc thêm ribbon tóm tắt scenario/visual/access/package.

## Template mới trong block engine

Round 7 thêm các template mới như:
- r7-experience-command-hub
- r7-scenario-simulator-board
- r7-layout-harmony-table
- r7-accessibility-ops-board
- r7-story-ribbon
- r7-market-lens-grid
- r7-release-choreography-timeline
- r7-issue-radar-table
- r7-shift-readiness-kpi
- r7-design-command-gallery
- r7-package-value-table

## File thay đổi chính

- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/release/module-builder-ultra-round7-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round7-smoke-2026-04-07.txt`
- `01-QMS-Portal/release/module-builder-ultra-round7-sample-audit-pack-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round7-sample-executive-brief-2026-04-07.md`

## Smoke scope đã chạy

- `node --check` cho cả 2 file JS
- load bằng stub browser environment
- render builder HTML
- render preview HTML
- chạy 5 scenario presets lớn
- sinh audit pack / executive brief mẫu
- xác nhận manifest round 7 và block templates round 7 hiện diện

## Gợi ý test sau khi overwrite local

- mở module builder
- tạo module mới
- mở module cũ
- bật/tắt Scene rail / Layout lab / Accessibility ops / Market lens / Visual modes
- áp từng scenario preset
- auto-balance layout
- beauty forge
- export executive brief
- export audit pack
- preview runtime
