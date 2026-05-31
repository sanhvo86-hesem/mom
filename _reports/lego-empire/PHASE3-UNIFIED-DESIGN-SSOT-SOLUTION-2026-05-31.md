# Giải pháp tổng thể — Hợp nhất Design SSOT cho Module Builder + Admin + Theme Template

**Ngày:** 2026-05-31
**Bối cảnh:** HESEM MOM ERP/EQMS portal. Phản hồi của founder: Module Builder "đồ hoạ quá xấu, thô kệch, giống học sinh cấp 1"; muốn (a) Builder đẹp gọn như Admin Module Master, (b) đồng bộ block giữa Builder và Module Master, (c) trình chỉnh sửa **theme template** + Lego block, (d) "thiết lập chuẩn link vào theme template", (e) có thể đập đi xây lại sidebar/giao diện admin + builder cho thống nhất.

---

## 0. Tóm tắt điều hành

Gốc rễ của mọi vấn đề là **3 sự phân mảnh** chồng lên nhau:

1. **Phân mảnh CSS:** Builder tự vẽ skin `.mb-*` với màu/spacing/bo góc **hardcode**, không dùng layer component `o3-*` mà Admin dùng → trông như hai sản phẩm khác nhau.
2. **Phân mảnh registry block:** 3 danh sách block không nối nhau (Engine 196 / L3 BlockKit 7 / Admin Sample 8). Builder không "đồng bộ vào Module Master".
3. **Phân mảnh theme:** `LegoTheme` (6 preset JS hardcode) tách rời `GraphicsAuthority` (token DB). Không có UI tạo/sửa/lưu theme template.

**Nguyên tắc chuẩn thế giới** (Figma variable modes, Material Theme Builder, shadcn registry, Storybook, Builder.io/Plasmic, W3C DTCG):

> **Một SSOT token → một layer component → một registry block → renderer dùng đúng CSS production ở MỌI nơi (runtime, builder, showcase).** Theme = một bộ override token có tên, sửa được, lưu tập trung, áp theo scope. Visual builder **không bao giờ** có skin riêng — nó render bằng đúng component thật.

Repo đã có sẵn "bộ xương" đúng hướng này (`graphics_token_catalog` → `o3-*` → `BlockKit` → `ArchetypeKit`). Việc cần làm là **kéo Module Builder và Theme vào chung bộ xương đó**, không phát minh hệ mới.

---

## 1. Kiến trúc mục tiêu (4 tầng, một SSOT)

```
L0  TOKEN SSOT        graphics_token_catalog (DB)  ──→  CSS vars  --o3-*
                          ▲ theme = bộ override token có tên (scope: org/role/user/module)
                          │
L1  PRIMITIVES        màu / spacing / radius / control-height  (1 knob: space.master, radius.master, control.height.standard)
                          │
L2  COMPONENTS        o3-btn, o3-chip, o3-kpi, o3-table, o3-panel, o3-toolbar, o3-shell…  (orders-v3.css)
                          │
L3  BLOCKS            BlockKit registry (kpi.grid, table.data, toolbar.filtered, panel.standard, empty.state, shell.workspace…)
                          │  window.Blocks facade = điểm render DUY NHẤT (L3 published → fallback Engine)
L4  ARCHETYPES        ArchetypeKit (template module hoàn chỉnh)
                          │
SURFACES (đều render bằng L2/L3 ở trên, KHÔNG skin riêng):
   • Runtime module      BE.renderModuleFromSchema
   • Module Builder      palette + canvas + preview  ← phải đổi sang đây
   • Admin Module Master showcase (đã đúng)
```

**Hệ quả:** sửa 1 token → đổi cả runtime + builder + admin. Thêm 1 block vào registry → tự hiện ở cả palette builder lẫn Module Master. Đúng yêu cầu "đồng bộ module master với block bên ngoài builder".

---

## 2. Bốn workstream

### WS-1 — Re-skin Module Builder lên `o3-*` + token (ƯU TIÊN 1, rủi ro thấp, đảo ngược được)

**Vấn đề:** `_ensureBuilderStyles()` (`31-module-builder.js:~4026`) + `BLOCK_CATEGORIES` màu hardcode.

**Việc làm:**
1. **Xóa toàn bộ literal màu** trong chrome builder. Chuyển `.mb-panel-header`, `.mb-tree-node`, `.mb-canvas-*`, `.mb-builder-hero`… sang dùng `var(--o3-*)`:
   - nền: `--o3-surface-card`, `--o3-surface-muted`
   - viền: `--o3-border-subtle`, `--o3-border-default`
   - chữ: `--o3-text-strong/muted`
   - brand: `--o3-brand`, `--o3-brand-soft`, `--o3-brand-hover`
   - khoảng cách: `--o3-space`, `--o3-space-section` (1 knob density)
   - bo góc: `--o3-radius` (control), `--o3-radius-card` (container)
   - chiều cao control: `--o3-control-h-standard` (32px, 1 size)
2. **Category color → token.** Thêm token catalog cho 12 nhóm (`blockCategory.layout.color`…) HOẶC map về palette semantic có sẵn (info/teal/violet/amber/danger). Bỏ inline `style="color:#hex"`; dùng class `mb-cat--{key}` đọc CSS var.
3. **Dùng lại component `o3-*` cho chrome builder:** header panel → `o3-panel__head`, nút → `o3-btn`, tab Blocks/Field Packs → `o3-shell__tab`, thẻ block trong palette → biến thể `o3-panel`/`o3-chip`. Bỏ `.mb-*` trùng lặp.
4. **Hero builder:** gradient `135deg var(--brand)→var(--brand-2)` đang dùng token brand → giữ, nhưng đảm bảo `--brand` được LegoTheme set (hiện hero không recolor vì set sai scope). Bind hero vào `--o3-brand`/`--o3-brand-hover`.

**Kết quả:** Builder lập tức "đẹp gọn như Admin", và đổi theme là **recolor thật**.

### WS-2 — Một registry block (đồng bộ Builder ↔ Module Master)

**Mục tiêu:** Builder palette, Admin Module Master, và runtime đọc **cùng một nguồn**.

**Phương án (tiến hoá, không phá vỡ):**
1. **`window.Blocks` facade làm cổng render DUY NHẤT** cho cả 3 surface. Builder canvas/preview gọi `Blocks.render(type, payload)` thay vì gọi thẳng `BE.renderBlock` → palette preview = production thật, và mọi block "flip" L3 tự áp dụng.
2. **Palette builder đọc danh sách hợp nhất** từ `Blocks.catalog()` (union: L3 published trước, Engine sau, khử trùng theo cặp tương đương trong `00bi-blocks-l3-map.js`). Một block lên L3 thì palette hiện nhãn "Curated/SSOT".
3. **Admin Module Master** đã có `blocksSection`/`archetypesSection` đọc registry — mở rộng để hiện **toàn bộ** danh sách hợp nhất (không chỉ 7), gắn cờ trạng thái (published / engine-only).
4. **Hướng SSOT:** registry L3 là đích; mỗi sprint "flip" thêm vài block faithful (đã có cơ chế `l3Enabled` + adapter). Engine catalog dần rút về vai trò "nguồn type thô" cho block chưa curate.
5. **Gate CI** `check_graphics_block_registry.php` giữ no-hardcode + composed_of tồn tại.

**Trả lời trực tiếp:** sau WS-2, thêm/sửa 1 block ở registry sẽ **tự đồng bộ** sang cả Builder palette lẫn Module Master — đúng yêu cầu.

### WS-3 — Trình chỉnh sửa **Theme Template** (tạo/sửa/lưu, link "thiết lập chuẩn")

**Hiện trạng:** 6 preset hardcode (`00bg-lego-theme.js`) + token DB rời (`GraphicsAuthority`). Không có editor.

**Thiết kế (theo Figma variable modes / shadcn theme registry / Material Theme Builder):**
1. **Bảng `graphics_theme_preset`** (migration mới) — hoặc tái dùng `graphics_saved_experiment`:
   ```
   preset_key (vd 'hesem-default','xuong-cam-ung','tim-dac')
   title_vi / title_en
   scope_type (organization|tenant|role|user|module)  scope_id
   base_ref (kế thừa preset khác)
   overrides JSONB  -- { 'brand.primary':'#1565c0', 'space.master':8, 'radius.master':4, 'control.height.standard':32, ... }
   is_published / is_default / created_by / created_at
   ```
2. **Theme = bộ override token có tên.** Bắc cầu `LegoTheme` (brand/density/radius/controlH/frame) ↔ token catalog: 6 preset hiện tại trở thành **seed rows** trong bảng, không còn hardcode.
3. **UI editor** (đặt trong Admin → Appearance, tab "Theme Template"; dùng lại `ControlKit` + `PreviewScenes` đã có):
   - chọn/sao chép/tạo mới preset
   - chỉnh brand (OKLCH ramp tự sinh hover/active/on/soft — code đã có trong `00bg`), density (1 knob), radius (control+card), control-height, motion, color-mode (light/dark/amber-shift)
   - **bắt buộc Simulate** (đã có `PreviewScenes.openSimulationModal` + WCAG) trước khi Save → ghi `graphics_simulation_run` (đúng luật Graphics Authority)
   - Save = ghi `overrides` + publish theo scope (rollout đã có)
4. **"Thiết lập chuẩn link vào theme template":** `schema.config.theme` của module **trỏ tới `preset_key`** (tham chiếu, không copy). Sửa preset → mọi module dùng nó **đổi theo**. Module có thể override token lẻ trên nền preset (giống "mode" của Figma).
5. **Trình chỉnh trong Builder ("Tùy chỉnh"):** mở đúng editor này (đồng nhất với Admin), scope = module hiện tại; nút "Lưu thành template" để promote thành preset dùng lại.

### WS-4 — Shell/Sidebar thống nhất Admin ↔ Builder

**Ràng buộc quan trọng (ADR-0004, HMV4 freeze):** các file shell **toàn cục bị CẤM sửa**: `40-eqms-shell.js`, `02-state-auth-ui.js`, `01-module-router.js`, `portal.main.css`, `eqms-suite.css`, `density-darkmode.css`; `portal.html` chỉ được sửa cache-bust/feature-flag. ⇒ **không thể "đập" sidebar toàn cục** mà không xin gỡ freeze.

**Phương án an toàn:**
1. Xây **một component shell chung `o3-shell`** (đã có `o3-shell__tabs/__tab` trong `orders-v3.css`) gồm: rail trái (điều hướng), topbar, vùng tab, vùng nội dung — bind 100% token.
2. **Áp `o3-shell` cho phần chrome NỘI BỘ mà ta được phép sửa:** sidebar/tablist của Admin Appearance (`00c-admin-appearance.js`) và chrome của Module Builder (`31-module-builder.js`). Hai bên dùng **cùng** component → thống nhất thị giác.
3. Sidebar toàn cục (trong `40-eqms-shell.js`) **giữ nguyên** trừ khi founder duyệt gỡ HMV4 freeze cho một sprint "global shell" riêng (rủi ro cao, cần feature-flag inert mặc định + E2E).

---

## 3. Lộ trình & rủi ro

| Phase | Nội dung | Rủi ro | Đảo ngược | Giá trị thấy ngay |
|---|---|---|---|---|
| **P1** | WS-1 re-skin builder lên o3-*/token | Thấp (CSS) | Dễ | **Cao** — hết "xấu", theme recolor thật |
| **P2** | WS-2 palette + canvas + preview qua `Blocks` facade; Module Master hiện danh sách hợp nhất | Trung bình | Vừa | Đồng bộ block; preview = production |
| **P3** | WS-3 bảng `graphics_theme_preset` + editor + bind module→preset | Trung bình (có migration + backend) | Vừa | Tạo/sửa/lưu theme template; chuẩn hoá |
| **P4** | WS-4 `o3-shell` cho chrome admin+builder (KHÔNG đụng shell toàn cục) | Trung bình | Vừa | Sidebar thống nhất nội bộ |
| **P4+** | (tuỳ chọn) gỡ HMV4 freeze để rebuild sidebar toàn cục | **Cao** | Khó | Thống nhất toàn portal |

**Khuyến nghị:** làm P1 ngay (thắng lớn, an toàn), rồi P2→P3→P4 tuần tự, mỗi phase 1 PR + verify Chrome trên VPS. P4+ chỉ làm khi founder duyệt gỡ freeze.

---

## 4. Đối chiếu chuẩn thế giới

- **Figma Variables / modes:** theme = tập "mode" của cùng bộ biến; component tham chiếu biến, không hardcode. ⇒ WS-3 (preset = override set có tên, module trỏ tham chiếu).
- **Material Theme Builder / shadcn registry:** sinh palette từ 1 seed brand (HSL/OKLCH) → toàn bộ token; theme lưu được, áp lại. ⇒ `00bg` đã có OKLCH ramp; chỉ cần lưu DB + editor.
- **Storybook / Builder.io / Plasmic:** trình dựng render **đúng component production**, không skin riêng; palette = registry component thật. ⇒ WS-1 + WS-2.
- **W3C DTCG design tokens:** một file token nguồn → build ra CSS var nhiều nền tảng. ⇒ `graphics_token_catalog` là SSOT; `o3-*` vars là output.
- **Một knob density (Linear/Vercel/Bloomberg):** đã là luật HESEM (`space.master`, `radius.master`, `control.height.standard`). ⇒ giữ, builder phải tuân.

---

## 5. Việc dọn kèm theo (đã ghi nhận)
- Gỡ debug global `__MB_SCHEMA_PROBE()` còn sót trong `31-module-builder.js`.
- Xác nhận quyền ghi `mom/data/modules` bền vững sau deploy chạy `deploy.sh` mới.
- Gradient hero builder hardcode `rgb(37,99,235)` → bind `--o3-brand` (gộp vào WS-1).
- Block chết R6 trùng lặp (~1.260 dòng) trong `31-module-builder.js` (đã có task tách riêng).
