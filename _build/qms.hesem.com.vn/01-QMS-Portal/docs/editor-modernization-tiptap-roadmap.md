# Lộ trình nâng cấp Editor sang ProseMirror/Tiptap (theo pha)

## Mục tiêu
- Tăng ổn định lệnh (không phụ thuộc `document.execCommand` vốn deprecated).
- Chuẩn hóa model tài liệu theo schema rõ ràng.
- Giữ tương thích ngược với HTML đang lưu trên hệ thống.

## Hiện trạng sau khi refactor
- Editor đã được tách module: `scripts/portal/03-editor-core.js`.
- Đã có command adapter: `edExecCommand(...)` + feature flag `window.qmsEditorConfig.engine`.
- Đã thêm scaffold pilot: `scripts/portal/06-tiptap-pilot.js`.

## Phạm vi migration
- Phase 1: thay lõi text/paragraph/list/table cơ bản bằng Tiptap.
- Phase 2: shape/textbox/chart chuyển thành custom NodeView.
- Phase 3: bật pilot theo user/role/doc type, sau đó cutover.

## Pha triển khai chi tiết

## Phase 0 - Baseline (1 tuần)
- Đóng băng feature mới cho legacy editor.
- Chạy checklist Word-like đầy đủ, chốt bug baseline.
- Gắn telemetry:
  - tỉ lệ lỗi command theo loại.
  - thời gian thao tác trung bình.
  - tần suất crash/editor reset.

## Phase 1 - Tiptap Core (2-3 tuần)
- Thiết lập Tiptap runtime (CDN ESM hoặc bundle riêng).
- Dựng schema cơ bản:
  - paragraph, heading, bold/italic/underline/strike.
  - link, image, blockquote, code block.
  - bullet/ordered list, table (table extension).
- Ánh xạ toolbar hiện tại -> command Tiptap qua `edTiptapAdapter.exec`.
- Fallback:
  - command chưa hỗ trợ => legacy path.

## Phase 2 - Dual Engine Pilot (2 tuần)
- Bật `qmsEditorConfig.engine='tiptap'` cho nhóm pilot (IT/QA).
- Chỉ áp dụng cho loại tài liệu ít shape/chart trước.
- Lưu song song:
  - HTML render.
  - JSON state (Tiptap) để rollback/debug.
- So sánh output trước/sau save để bắt regressions.

## Phase 3 - Advanced Objects (3-4 tuần)
- Custom NodeView cho:
  - Textbox.
  - Shape container (SVG + text layer).
  - Chart block (metadata + svg render).
- Chuẩn hóa data attributes, không phụ thuộc vào control DOM tạm.
- Viết migration parser từ HTML cũ -> node schema mới.

## Phase 4 - Hardening & Cutover (2 tuần)
- Chạy lại toàn bộ checklist Word-like + stress.
- Đặt tiêu chí cutover:
  - P0 = 0.
  - P1 pass >= 97%.
  - không crash trong stress 60 phút.
- Cho phép switch runtime theo feature flag để rollback nhanh.

## Kiến trúc đề xuất trong repo
- `scripts/portal/03-editor-core.js`: giữ UI toolbar + integration points.
- `scripts/portal/06-tiptap-pilot.js`: adapter Tiptap chính thức.
- `scripts/portal/07-tiptap-schema.js`: schema/extensions.
- `scripts/portal/08-tiptap-nodeviews.js`: textbox/shape/chart nodeviews.
- `scripts/portal/09-tiptap-migrate.js`: parser HTML cũ.

## Rủi ro & kiểm soát
- Rủi ro: khác biệt render HTML so với tài liệu cũ.
- Kiểm soát: dual-save + snapshot diff + feature flag rollback.
- Rủi ro: shape behavior không giống Word.
- Kiểm soát: tách mục tiêu “Word-like cao” cho phase custom nodeview.

## KPI kỹ thuật
- Crash-free editing sessions >= 99.5%.
- Command failure rate < 0.5%.
- Avg save time < 1.5s/tài liệu trung bình.
