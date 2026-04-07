# Module Builder Ultra — Round 9 Glass Pro

Date: 2026-04-08
Target root: `qms.hesem.com.vn/`
Base package: `2026-04-08-r8-hotfix`

## Mục tiêu

Round 9 đưa Module Builder sang hướng **glass chuyên nghiệp**:

- giữ tinh thần aurora / glass đẹp của round 7
- sửa cảm giác quá sáng hoặc thiếu tương phản bằng shell glass có kiểm soát hơn
- làm toolbar, canvas, block card và side rail rõ ràng hơn cho thao tác hàng ngày
- bổ sung lớp điều khiển visual ngay trong builder để chuyển mode nhanh và auto-polish UI

## Những gì được nâng cấp

### 1) Professional Glass Shell

Bổ sung shell **Round 9 · Glass Pro** ở trên builder:

- metric: Contrast / Readability / Glass Craft / Professionalism
- mode presets:
  - `executive-glass-pro`
  - `precision-glass`
  - `audit-glass`
  - `night-ops-glass`
- action nhanh:
  - `Glass auto polish`
  - `Visual QA brief`
  - `Contrast board`
  - `Structure lens`
  - `Palette rack`

### 2) Glass styling cho core builder

Tinh chỉnh trực tiếp các vùng làm việc cốt lõi:

- `mb-side-panel`
- `mb-main-panel`
- `mb-rail-panel`
- `mb-toolbar`
- `mb-canvas-root`
- `mb-block-card`

Mục tiêu là để builder nhìn premium hơn nhưng vẫn giữ được độ rõ của dữ liệu, thao tác và text.

### 3) Auto polish

Action `r9-auto-polish` sẽ:

- ép theme sang glass có contrast cao hơn
- tăng focus/access defaults
- giữ signoff/gates ở mức production-friendly hơn
- seed thêm một số block round 9 khi module còn quá thưa

### 4) Xuất Visual QA Brief

Action `r9-export-visual-brief` xuất markdown brief để review nhanh chất lượng visual/UX hiện tại của module.

## Thay đổi file

### `01-QMS-Portal/scripts/portal/31-module-builder.js`

Bổ sung patch **Round 9 Glass Pro**:

- class decorator cho shell / builder / panels / preview ribbon
- mode presets + metric rail + toggle panels
- glass styles mới với contrast tốt hơn
- action handler cho glass mode, auto polish, visual brief export

### `01-QMS-Portal/scripts/portal/00-block-engine.js`

Bổ sung **10 block templates Round 9**:

- `r9-glass-executive-kpi`
- `r9-contrast-readiness-board`
- `r9-approval-glass-board`
- `r9-structure-lens-table`
- `r9-professional-command-table`
- `r9-operator-focus-banner`
- `r9-palette-rack-gallery`
- `r9-supplier-radar-table`
- `r9-audit-evidence-glass`
- `r9-release-assurance-timeline`

## Ghi chú triển khai

Đây là **cumulative overwrite package** trên nền round 8 hotfix. Có thể copy đè trực tiếp lên hệ thống đang dùng round 8 hoặc round 7 cumulative để lấy toàn bộ cập nhật mới nhất của chat này.
