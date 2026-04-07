# Module Builder Ultra Round 2 — 2026-04-07

## Mục tiêu
Vòng 2 tập trung vào 3 lớp nâng cấp:
1. **Ultra diagnostics + safe auto-fix** để giảm rủi ro runtime/schema drift.
2. **Design/Cockpit UX** để module builder trực quan, giàu tín hiệu, thẩm mỹ hơn.
3. **Schema depth** để block-level builder có thêm visual polish, responsive advanced, data experience và execution resilience.

## File thay đổi
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/scripts/portal/00-block-engine.js`

## Nâng cấp trong 31-module-builder.js
### 1) Diagnostics engine cho module builder
- Chấm điểm diagnostics toàn module.
- Phát hiện:
  - thiếu title VI/EN, route, domain
  - route chưa normalize
  - tab rỗng / tabId trùng / tab thiếu title
  - blockId trùng / block type chưa đăng ký / block thiếu title
  - parentId orphan
  - order block chưa chuẩn hóa
  - responsive span ngoài khoảng 1..12
  - block ẩn trên mọi breakpoint
  - stream thiếu connector/topic
  - join/pipeline/action-flow chưa hoàn chỉnh
  - requireApproval nhưng chưa có approvalWorkflow

### 2) Safe auto-fix
- Normalize route sang dạng slug.
- Bổ sung title mặc định từ moduleId nếu thiếu.
- Tạo tab mặc định nếu chưa có.
- Sinh lại `tabId` / `blockId` khi thiếu hoặc trùng.
- Chuẩn hóa `order`.
- Clamp responsive span về `1..12`.
- Sửa orphan parentId.
- Bổ sung default cho stream/action-flow.

### 3) Builder cockpit
- Thêm **metric cards** cho readiness, diagnostics, canvas, automation, data fabric, depth.
- Thêm **viewport switcher**: mobile / tablet / desktop / wide.
- Thêm **focus mode**, **diagnostic board**, **cockpit board**.
- Thêm **tab map** và **top diagnostics** ngay trên builder shell.

### 4) Module Studio nâng cấp
- Tab mới: `Diagnostics`.
- Design tab được nâng cấp với:
  - **experience presets**
  - **theme gallery**
  - thêm các trường `visualLanguage`, `accentTone`, `stageBackdrop`, `surfaceDepth`, `heroMood`, `chartStyle`, `cardRadius`, `panelGlass`
- Diagnostics tab có filter theo severity và nút auto-fix trực tiếp.

### 5) Block intelligence
- Mỗi block card hiển thị thêm chips:
  - data mode (manual / api / pipeline / stream)
  - flow step count
  - workflow id
  - responsive span summary
  - error/warning count theo block

### 6) Preflight trước save/export/duplicate/open/create
- Save/export/duplicate/open/create đều gọi preflight:
  - ensure metadata
  - normalize route
  - sync diagnostics manifest
  - sync viewport mode

## Nâng cấp trong 00-block-engine.js
Thêm các section/field schema mới cho tất cả block type:
- **Data experience**
  - `emptyStateTitle`
  - `emptyStateNote`
  - `prefetch`
  - `timeoutMs`
  - `queryTag`
  - `telemetryDataset`
- **Visual polish**
  - `visualLanguage`
  - `accentTone`
  - `heroMood`
  - `cardRadius`
  - `iconStyle`
  - `chartStyle`
  - `panelGlass`
  - `microcopy/caption`
- **Responsive advanced**
  - `breakpointStrategy`
  - order theo từng breakpoint
  - `minHeight`, `maxHeight`, `stickyOffset`
- **Execution resilience**
  - `retryPolicy`, `retryCount`, `retryBackoffMs`
  - `successToast`, `errorToast`
  - `telemetryEvent`
  - `failSafeMode`

## Kết quả kiểm tra
- `node --check` cho cả 2 file: **PASS**
- Smoke load với stub browser globals: **PASS**

## Ghi chú triển khai
- Đây là gói overwrite theo cấu trúc `qms.hesem.com.vn/`.
- Khuyến nghị:
  1. overwrite local
  2. review diff
  3. chạy local portal builder
  4. kiểm tra save/open/export/preview cho các module hiện có
