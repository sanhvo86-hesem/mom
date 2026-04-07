# HESemQMS Module Builder Ultra — Round 4 Overwrite Manifest
Date: 2026-04-07  
Root overwrite folder: `qms.hesem.com.vn/`

## Mục tiêu
Round 4 tập trung vào 3 trục:
1. vá lỗi thực thi thật trong builder sau round 3,
2. bổ sung engine seed/flow/beauty để tăng trực quan và sức mạnh module builder,
3. đóng gói theo đúng cấu trúc overwrite để copy đè lên local.

## File overwrite chính
- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/docs/module-builder-ultra-round4-2026-04-07.md`
- `01-QMS-Portal/release/module-builder-ultra-round4-manifest-2026-04-07.json`

## Lỗi thật đã sửa
### 1) Reset template catalog trong `00-block-engine.js`
Trong code cũ của các round trước, `BLOCK_TEMPLATES` còn bị reset về `{}` trước khi merge phần template mở rộng. Kết quả là template bổ sung không thật sự đi vào runtime catalog.  
Round 4 đã bỏ reset này và giữ nguyên template seeds trước khi merge thêm template mới.

### 2) Scope patch round 4 trong `31-module-builder.js`
Bản vá round 4 ban đầu nếu đặt ngoài block round 3 sẽ không truy cập được các helper nội bộ của ultra patch (do block scope / strict mode).  
Round 4 đã được đặt lại đúng vị trí: nằm trong block patch round 3, trước khi export `window._renderModuleBuilder`.

### 3) Phụ thuộc helper round 2 không còn nhìn thấy trong round 4
Khi smoke test sâu hơn, một lỗi runtime xuất hiện: `_r2BlockApiId is not defined`.  
Nguyên nhân là một số helper của round 2 nằm trong scope khác và không truy cập được từ patch round 4.  
Round 4 đã bổ sung local fallback helpers tương thích:
- `_r2BlockApiId`
- `_r2BlockWorkflowId`
- `_r2BlockDataMode`

## Nâng cấp tính năng round 4
### Block engine
- schema `observability` cho signal / cadence / log / trace / owner
- schema `storytelling` cho scene role / scene title / narrative / CTA / badge / priority
- schema `accessibilityErgonomics` cho ARIA / touch target / operator distance / keyboard hint
- schema `collaborationOps` cho review / evidence / handover / e-sign
- schema `operatorOps` cho mode / confirmation / barcode / offline hint

### Template mới
Round 4 bổ sung thêm catalog template để seed module nhanh hơn:
- `tpl-r4-story-hero`
- `tpl-r4-control-tower-kpi`
- `tpl-r4-war-room-readiness`
- `tpl-r4-command-lane`
- `tpl-r4-live-signal-wall`
- `tpl-r4-evidence-stage`
- `tpl-r4-review-matrix`
- `tpl-r4-handoff-board`
- `tpl-r4-warehouse-wave`
- `tpl-r4-release-pulse`
- `tpl-r4-machine-signal`
- `tpl-r4-maintenance-response`

### Builder UX / logic
- mở rộng blueprint gallery:
  - Executive Control Tower
  - Quality War Room
  - Shopfloor Command
  - Audit Evidence Hub
  - Warehouse Handheld
  - Maintenance Response
- mở rộng personas:
  - planner
  - warehouse
  - maintenance
- auto-seed blueprint cho module còn thưa block
- Flow Mesh để nhìn nhanh quan hệ block / workflow / signal
- Beauty Lab để áp theme/polish trực tiếp trong builder
- Prime metrics:
  - signalCoverage
  - collaborationReadiness
  - designCraft
  - flowNodes
  - flowEdges
- auto-enhance sâu hơn cho story, observability, operator mode, review mode, caption, page size
- diagnostics sâu hơn cho collaboration / signals / review cadence / stage frame / signal density

## Kiểm tra đã chạy
- `node --check` cho:
  - `00-block-engine.js`
  - `31-module-builder.js`
- smoke render round 4: pass
- multi-scenario smoke:
  - executive-control: pass
  - warehouse-handheld: pass
  - maintenance-response: pass

## Kết quả smoke chính
- `templateCount`: 101
- `schemaVersion`: `2026-04-07-r4`
- builder render có:
  - Flow Mesh
  - Beauty Lab
- manifest metric mẫu:
  - `signalCoverage`: 100
  - `collaborationReadiness`: 100
  - `designCraft`: 100
  - `flowNodes`: 5
  - `flowEdges`: 2

## Lưu ý triển khai
Đây là gói overwrite. Anh giải nén, copy đè root `qms.hesem.com.vn/` vào local, review diff rồi commit/push từ máy anh.

## Khuyến nghị test local sau overwrite
- mở builder
- mở module cũ
- tạo module mới
- thử blueprint mới
- thử Beauty Lab
- thử Flow Mesh
- thử Auto Enhance
- export builder JSON
- export runtime JSON
