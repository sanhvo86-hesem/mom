# Phản biện & hợp nhất với GPT Pro — Module Studio rearchitecture
### HESEM MOM · 2026-06-01 · grounded bằng xác minh repo (workflow 8-agent)

> Mục đích: đánh giá chuyên sâu bản phán quyết của GPT Pro, đối chiếu với kết luận hiện tại + 4 quyết định founder đã chốt, và đối chiếu với **sự thật code/migration** (đã verify). Tài liệu này để báo lại GPT Pro.

---

## 0. Lập trường tổng quát

GPT Pro **đúng ở tầng nguyên lý** và **cải tiến đề xuất của tôi ở 2 điểm lớn** (tách L2/L3 thành hai authority dữ liệu; AI là consumer của registry). Nhưng GPT Pro **sai/quá lời ở vài chỗ thực trạng repo**, và **xung đột với 3/4 quyết định founder đã chốt** mà GPT Pro không biết. Quan trọng: **xác minh repo cũng cho thấy đề xuất của TÔI sai 2 điểm thực trạng** — sửa luôn ở dưới, không bao che.

Một câu: **giữ nguyên tắc của GPT Pro, bác cấu trúc bề mặt của GPT Pro, sửa lại thứ tự, và đính chính dữ kiện cho cả hai bên.**

---

## 1. Đính chính dữ kiện (cả GPT Pro lẫn tôi đều có chỗ sai)

| # | Khẳng định | Người nói | Verdict | Sự thật repo |
|---|---|---|---|---|
| 1 | `window.Blocks.render` là cổng render duy nhất, ưu tiên L3 rồi fallback engine | GPT Pro | ✅ Đúng | `00bh-blocks-facade.js:63-83` |
| 2 | Builder gọi thẳng engine renderer (không qua facade) | GPT Pro | ⚠️ Một nửa | Builder đi qua `BE.renderModuleFromSchema` (gián tiếp). **Chỗ gọi thẳng `BE.render*` là RUNTIME ROUTER** `01-module-router.js:243-256` — và đó là **file bị ADR-0004 cấm sửa**. Đây mới là path làm "preview ≠ production". |
| 3 | `graphics_token_value` TRỐNG, authority nằm in-memory/JS | **TÔI (đề xuất)** | ❌ **Sai** | Mig `148:511-533` + `151:117-139` **đã seed** `_value` (is_published=TRUE). Khiếm khuyết thật **không phải bảng trống** mà là **hai authority frontend song song + HmTheme thắng nhờ fallback** (`00bb:141-149`). |
| 4 | Chưa có bảng `graphics_module_archetype` (L4 chỉ là JS/khái niệm) | GPT Pro (và ngầm cả tôi) | ❌ **Sai** | Mig `262` (2026-05-31) **đã tạo + seed published** bảng L4 archetype. L4 đã DB-backed. |
| 5 | `graphics_block_contract` (L3, mig 261) tồn tại, trên L2 dưới L4 | GPT Pro | ✅ Đúng | `261_graphics_block_contract_l3.sql:40-62` |
| 6 | `graphics_component_contract` (mig 148) tồn tại | GPT Pro | ✅ Đúng | `148:110-131` |
| 7 | Module Master là showcase **viết tay**, inline style | GPT Pro | ⚠️ Một nửa | 40+ section viết tay + inline style (`00c-...module-sample.js:38-60`), **NHƯNG** `blocksSection:852` + `archetypesSection:889` **đã registry-driven** (đọc `__HM_BLOCK_REGISTRY__`/`__HM_ARCHETYPE_REGISTRY__`). Kiến trúc lai. |
| 8 | L2 showcase đọc từ `graphics_component_contract` | (comment trong code) | ❌ Sai | Comment `:20` nói vậy nhưng **không có fetch nào**; token list hardcode inline. Comment chỉ là "nguyện vọng". |
| 9 | Chỉ ~6-8 block L3 seed | GPT Pro | ⚠️ Chính xác là **6** | `toolbar.filtered, panel.standard, kpi.grid, table.data, empty.state, shell.workspace` (`00bc:28-132`) + ~196 engine legacy (khác lớp). |
| 10 | Module schema còn cho literal thô (`width:"120px"`, hex) | GPT Pro | ✅ Đúng | `00-block-engine.js:1156` (width type 'text' → inject CSS `:5507`); `M2-orders.json:114`, `M-lego-showcase.json:819` |
| 11 | Có density toggle NGOÀI theme | GPT Pro | ✅ Đúng — **3 nơi** | module `design.density` (`31-mb:7717`); per-block `compact` (`00-be:1903`); per-block `design.density` select (`00-be:11732`). Vi phạm SSOT density=theme. |
| 12 | F5 brand đã hoà giải bằng mig 264 | (tôi ngầm định) | ❌ **Chưa xong** | Mig 264 chỉ sửa **row DB**. JS DEFAULT vẫn lệch: `00b:1179` `brandPrimary:'#1565c0'` trong khi `00bg:216`/`00d:32` `#0c4a6e` (và `00d:275/284` còn fallback `#1565c0`). Gốc F5 **vẫn sống** ở tầng JS. |
| 13 | Custom CSS injection là cửa hậu global | GPT Pro | ✅ Đúng — nặng | textarea `00c:5170-5172` → `advanced.customCSS` → `00b:705-706` → `_applyCustomCSS 00b:857-870` inject `<style>` vào `<head>` **mỗi lần `_apply()`**, unscoped, last-write-wins, đè mọi token. |
| 14 | Backend đã sẵn sàng DB-primary | (xác minh thêm) | ✅ | `DesignTokenCatalogService.php` có thang 4-mode (JSON_ONLY→SHADOW_WRITE→POSTGRES_PRIMARY→POSTGRES_ONLY), đọc `graphics_token_value` bằng SQL, `stageValue/publish` ghi DB. **Mảnh thiếu là FRONTEND** (cắt fallback HmTheme), không phải schema. |
| 15 | Đã có Build-Packet/manifest + validator module JSON | (GPT Pro ngầm coi là add-on nhỏ) | ❌ Chưa có | Không có manifest format; `check_graphics_no_hardcode.php` chỉ quét `09v3-*.js` (grandfather 1951 literal). Gate cho module JSON là **việc làm mới**, không phải tinh chỉnh. |

**Hệ quả #3 + #4:** nền móng SSOT **đã hoàn chỉnh hơn cả hai bên tưởng** — L0/L2/L3/L4 đều có bảng DB + seed; `_value` có dữ liệu; backend service đã đọc/ghi DB. Vấn đề **không phải "thiếu nền"** mà là **frontend chưa cắt đường cũ** (HmTheme fallback) và **chưa có gate ép tuân thủ**.

---

## 2. Điểm GPT Pro ĐÚNG hơn tôi — tôi tiếp thu

1. **Tách L2 Component Contract ↔ L3 Lego Block Master.** Verify xác nhận đây là **hai shape dữ liệu khác nhau, hai động từ khác nhau**: L2 (`overridable_tokens`, `inherits_from`, a11y — không có slot) vs L3 (`composed_of`, `slots`, `variant_axes`, `required_tokens`). Gộp chúng vào một "Lego Block Master" như tôi đề xuất **giấu mất ranh giới lớp**. → **Tiếp thu**, nhưng (xem §3) thể hiện bằng **drill-down**, không phải hai tab ngang hàng.
2. **AI là consumer của registry** (output = Build Packet / Block Request, không tự đẻ HTML/CSS). Đúng tinh thần brief founder. → **Tiếp thu** + nâng thành gate cứng.
3. **DB-primary là đích đúng cho SaaS đa-tenant** (scope/version/audit/rollout). → **Tiếp thu** — và verify cho thấy backend đã ở đó rồi.
4. **Capability không được xoá, chỉ đổi vai** (a11y → gate, compliance → evidence, export → read-only). → Đồng thuận hoàn toàn.

---

## 3. Điểm GPT Pro SAI / QUÁ LỜI — tôi phản biện

### 3.1 Tách **Builder ≠ Studio thành HAI BỀ MẶT** — phản biện
GPT Pro nhầm **tách CONCERN/write-path** (bắt buộc) với **tách SURFACE** (chỉ là lựa chọn triển khai, không bắt buộc). SSOT đến từ: **một write-path mỗi scope + cổng `window.Blocks` + CI no-hardcode** — *không cái nào* đòi hai mục điều hướng.
- `00bb` đã có **chiều scope** sẵn (`snapshot.load(scope, mode)`): "ghi token global" vs "override scope=module:\<id\>" **đã là hai scope qua MỘT authority** — đúng mô hình Figma mode.
- RBAC seam để ép "Builder không được author" **chưa tồn tại** (`31-mb:11141-11145` chỉ là role workflow domain, không phải gate quyền sửa). ⇒ Dù tách hai bề mặt hay hai mode, **vẫn phải xây 1 RBAC gate mới y hệt**. Tách bề mặt **không mua thêm gì**, lại **đẻ thêm bề mặt** — trái đúng cái founder đang gom.

**Hoà giải:** **MỘT "Module Studio", tường ngăn bằng MODE + WRITE-PATH/SCOPE**, không bằng vị trí UI:
- *Assemble mode* (mặc định, ai cũng dùng kể cả AI): chọn archetype → chọn block L3 published theo zone → bind data → chọn `theme_preset_key`. Inspector **chỉ token (ControlKit), không gõ được hex/px**. Chỉ được ghi reference tree + `graphics_token_value scope='module:<id>'`.
- *Author/Governance mode* (role-gated): sửa định nghĩa L3, archetype L4, theme preset. Ghi `graphics_block_contract`/archetype/`token_catalog` scope='global'.

→ Đạt đúng separation-of-concerns GPT Pro muốn, nhưng bằng **một bề mặt lean** founder yêu cầu.

### 3.2 **8 section Module Studio** — phản biện
L2/L3 split đúng **về dữ liệu** nhưng **sai khi thành 8 section ngang hàng** — đó chính là "nhiều tab đẹp nhưng rời rạc" mà GPT Pro tự chê. Bằng chứng: `module-sample.js` **hiện đã** render L2 sections + blocksSection + archetypesSection **trong MỘT surface** thành công.
- Đường đi tự nhiên là **drill-down dọc** (block *IS-composed-of* component): click block → L3 Definition; khoan vào component của nó → L2 Contract. **Không phải tab-hop ngang.**
- `Overview/Health` và `Export & Docs` làm **section riêng** = ăn không gian, vi phạm "vào việc, tối đa không gian" của founder.

**Hoà giải — 2 bề mặt, nhúng L2/L3/L4 thành drill-zone:**
- **Theme** (global token write-path duy nhất; hấp thụ a11y-validator-trong-Simulate + export DTCG).
- **Module Studio** (1 shell: library rail · canvas · inspector đổi mode theo lựa chọn — zone→Assemble, block→L3 Definition, component→L2 Contract, template→Archetype mode).
- Appearance **9→3**: Theme · Governance (gộp governance+advanced, gồm Release/Compliance + Preview-evidence + export) · Chuẩn thiết kế (reference mỏng).
- Map 8 section GPT Pro: Theme Template→Theme; Component Contract→inspector L2; Lego Block Master→inspector L3 + rail; Archetype→Studio template mode; Preview&Simulation→**action Simulate có ở cả 2 bề mặt** (không phải section); Release/Compliance→Governance; Overview/Health→dải header nhỏ trong Governance; Export&Docs→nút.

### 3.3 Giữ **Custom CSS emergency có waiver** — phản biện
GPT Pro nhầm "giữ break-glass" với "giữ nó trong bề mặt design". Cơ chế hiện tại (`00c:5170` → `00b:857-870`) là **CSS global, unscoped, last-write-wins, đè mọi token** — bọc waiver lên đó chỉ là **son phấn**, CSS vẫn đáp xuống global và vô hiệu hoá cascade token.
- **Founder đã quyết: bỏ hẳn.** Tôi đồng tình cho **mọi bề mặt design/builder/theme**.
- Nếu **sau này** thật sự cần hotfix SaaS: nó sống **chỉ trong ops tool riêng**, không với tới từ builder/theme, **không đi qua `HmTheme._apply()`**, scope 1 tenant, waiver + **hard expiry + auto-revert** + audit_events. **YAGNI** — chưa build cho tới khi có incident thật.

### 3.4 Thứ tự (token-authority để muộn) — phản biện
GPT Pro xếp P1 rename / P2 Block Master / P3 Theme Template **trước** việc hợp nhất token authority. Sai về **phụ thuộc**: `GraphicsAuthority.tokens.read()` **fallback sang `HmTheme.getDeep()`** (`00bb:141-149`) → HmTheme vẫn là SSOT runtime thực, `graphics_token_value` bị bỏ qua khi read. P2/P3 đều **tham chiếu token values** → dựng chúng trên **hai authority đang bất đồng** = xây trên cát, phải làm lại. **Founder đã quyết SSOT-first — đúng.**

---

## 4. Founder đã chốt (GPT Pro chưa biết) — ràng buộc cứng

1. **Gỡ HMV4 freeze (ADR-0004)** để đập cả sidebar/shell toàn cục. ⇒ GPT Pro (và §8/§10 đề xuất của tôi) giả định freeze còn — **bỏ giả định đó**. NHƯNG ADR-0004 **vẫn có CI guard sống** (forbidden-diff, `01-module-router.js`, `40-eqms-shell.js`): phải **supersede ADR chính thức + sửa guard**, làm **sprint riêng, feature-flag inert, E2E**, **không gộp** vào việc token/CSS.
2. **Diệt hai-authority TRƯỚC** (HmTheme vs GraphicsAuthority; F5). ⇒ Đẩy S4 lên P0.
3. **Bỏ Custom CSS hẳn** (không waiver). ⇒ Override GPT Pro.
4. **Lean / vào việc / zero banner / SSOT gap8-12 radius4-8 control32 brand#0c4a6e / gộp authoring+assembly vào MỘT Module Studio.** ⇒ Chọn 2 bề mặt + mode wall thay vì 8 section / 2 surface.

---

## 5. Lộ trình hợp nhất (đã re-order theo founder)

| Phase | Nội dung | Ghi chú so với GPT Pro |
|---|---|---|
| **P0 — Nền SSOT (TRƯỚC TIÊN)** | (a) CI no-hardcode (giữ, mở rộng GOVERNED_GLOBS ra ngoài `09v3-*`). (b) **Cắt fallback** `00bb:145-146`; `GraphicsAuthority.snapshot` nạp từ `DesignTokenCatalogService`; `HmTheme.getDeep` thành **read-adapter** một chiều. (c) **Xoá #1565c0 JS default** (`00b:1179`, `00d:275/284`) → `#0c4a6e` là canonical mọi tầng (hoàn tất việc mig 264 mới làm nửa). (d) **Xoá Custom CSS** (`00c:5170-5172`, `00b:705-706/857-870`). | GPT Pro để token-consolidation muộn → **đưa lên P0**. Sửa luôn dữ kiện: `_value` không trống, defect là fallback. |
| **P1 — Rename + IA** | "Master Module Template"→**Module Studio**; Appearance **9→3 tab**; dọn code chết. | GPT Pro đúng phần rename; bác 8-section. |
| **P2 — Module Studio (Assemble+Author, drill-down L2/L3/L4)** | 1 shell, inspector đổi mode; preview qua `window.Blocks.render` = production. | Tiếp thu L2/L3 split của GPT Pro nhưng dạng drill-zone. |
| **P3 — Theme Template + Archetype editor** | Đọc/ghi **bảng đã có** (`graphics_theme_preset` 263/264, `graphics_module_archetype` 262) — **không đẻ bảng song song**. | Sửa: L4 đã có bảng, đừng tạo mới. |
| **P4 — Gate cứng (việc mới, không phải add-on)** | Định nghĩa **manifest/Build-Packet schema**; viết **`check_module_manifest.php`** (từ chối block_key chưa published, literal hex/px, density-override ngoài theme); wire vào `ci.yml graphics-safety`. Luồng Block Request cho cả người & AI. | GPT Pro coi là add-on nhỏ → thực ra **net-new**; ngày đầu sẽ FAIL cây hiện tại (cần migrate/allowlist thu dần kiểu 1951-literal). |
| **P5 — Shell rebuild (sprint RIÊNG)** | Đập sidebar/shell toàn cục: supersede ADR-0004 + sửa CI guard + feature-flag inert + E2E. Route lại `01-module-router.js:243-256` qua facade (đây mới là path "preview≠production"). | GPT Pro fence chỗ này sau freeze; founder gỡ freeze → in-scope nhưng **tách hẳn**, rủi ro cao. |

---

## 6. Ma trận SSOT chốt (một khái niệm — một write-path)

| Khái niệm | Chủ duy nhất | Cấm ở đâu |
|---|---|---|
| brand/palette/mode, font, density, control-height, radius, motion | **Theme** (scope=global → `graphics_token_value`) | builder, block, module schema, `00b` JS default |
| Override theo module | **Module Studio · Assemble** (scope=`module:<id>`) | không sửa định nghĩa block |
| Định nghĩa L2 (overridable_tokens, a11y) | **Module Studio · L2 Contract mode** → `graphics_component_contract` | block không định nghĩa lại component |
| Định nghĩa L3 (composed_of, slots, variant) | **Module Studio · L3 Definition mode** → `graphics_block_contract` | builder không ráp HTML nếu block đã có |
| Archetype/zone L4 | **Module Studio · Template mode** → `graphics_module_archetype` | module instance không tự tạo shell |
| Data binding | manifest module | Theme/Block không biết API |
| A11y/contrast | **gate publish** (`graphics_simulation_run`) | không publish nếu fail |
| Custom raw CSS | **(xoá)** | mọi nơi |

---

## 7. Tóm tắt để báo GPT Pro (3 câu)

1. **Đồng thuận:** L2/L3 tách authority, AI-as-consumer, DB-primary, capability-không-xoá-chỉ-đổi-vai — tiếp thu.
2. **Phản biện:** không tách hai bề mặt (dùng **1 Module Studio + mode wall**); không 8 section (dùng **drill-down L2→L3→L4**); **xoá Custom CSS hẳn** (không waiver trên surface design); **token-authority lên P0**, không để muộn.
3. **Đính chính dữ kiện cho cả hai:** `graphics_token_value` **không trống** (đã seed) và L4 archetype **đã có bảng** (mig 262) — nên defect thật là **fallback HmTheme + JS default #1565c0 còn sống**, không phải "thiếu bảng/bảng rỗng"; và GPT Pro chưa biết founder đã **gỡ freeze + SSOT-first + bỏ Custom CSS**.

---
*Grounded bằng workflow xác minh 8-agent trên repo thực, 2026-06-01. Mọi evidence file:line ở §1.*
