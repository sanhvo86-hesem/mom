# Module Studio — Đề xuất tái kiến trúc "đập đi xây lại" toàn diện
### Giao diện Admin + Module Builder + Theme + Lego Block · 2026-06-01

> **Brief của founder:** Đập bỏ (xoá nội dung) và đổi tên module builder thành **Module Studio**. Nhiệm vụ của Module Studio: (1) chỉnh **theme template** của module, (2) chỉnh **lego block**. Cắt tab **"Module Master"** trong sidebar Giao diện, gộp với **Cây module** của builder → thành **Lego Block Master**. Khi tạo module mới: chọn **loại template** + chọn **lego block** gắn vào. Muốn sửa template → vào Module Studio. **AI tạo module cũng theo luật này**: nếu lego block chưa có → vào Module Studio tạo rồi chèn vào → đảm bảo SSOT. Thiết lập đồ hoạ **mang tính hệ thống** thì cho vào tab **Theme**. Đánh giá 6 tab (Mẫu bố cục, Trợ năng, Xuất & Phân tích, Quản trị tuân thủ, Nâng cao, Chuẩn thiết kế): giữ / gộp / xoá. Tuân thủ tuyệt đối SSOT — **không để 1 tính năng bị điều khiển bởi hai nơi**.

Bản này thay thế tư duy rời rạc bằng **một mô hình hai bề mặt, ba registry**, và trả lời trực tiếp câu hỏi từng-tab. Nó kế thừa và thống nhất với `MASTER-STRATEGY-2026-05-31.md`, `PHASE3-UNIFIED-DESIGN-SSOT-SOLUTION-2026-05-31.md`, và `AUDIT-P1-P4-FINDINGS-2026-06-01.md` — **không phát minh hệ mới**.

---

## 0. TL;DR — 10 quyết định

1. **Hai bề mặt biên tập, không hơn.** (A) **Theme** = nơi DUY NHẤT chỉnh *giá trị token toàn cục* (màu, chữ, mật độ, motion, dark mode, theme template). (B) **Module Studio** = nơi DUY NHẤT chỉnh *định nghĩa lego block*, *template*, và *lắp ráp module*. Mọi bề mặt khác (mọi module, runtime, showcase) chỉ **đọc**, không ghi.
2. **Ba registry tách bạch** (chuẩn Plasmic/Gutenberg/WordPress): **Token catalog** (L0, do Theme ghi) · **Block registry** (L3, do Module Studio ghi) · **Template/Archetype registry** (L4/L5, do Module Studio ghi). Trang/module chỉ là **cây tham chiếu** vào ba registry này.
3. **"Lego Block Master"** = gộp tab *Module Master* (showcase SSOT component, `00c-admin-appearance-module-sample.js`) **+** *Cây module* (widget tree của builder) thành một workspace trong Module Studio: trái = thư viện block (registry thật), giữa = canvas/cây lắp ráp, phải = inspector + hợp đồng token của block.
4. **Tạo module = chọn template + chọn block từ registry. Không bao giờ phát minh tại trang.** Nếu block/template chưa có → tạo trong Module Studio trước (đăng ký vào registry) → mới chèn được. Đây là "registry-as-gatekeeper" — máy ép, không phải quy ước.
5. **AI tuân đúng luật người.** Khi AI dựng module mà thiếu block: AI phải tạo block trong Module Studio (thêm row token-catalog nếu cần → thêm vào `graphics_component_contract` → thêm vào Lego Block Master) rồi mới dùng. Một CI gate từ chối module JSON chứa block không có trong registry hoặc literal hex/px.
6. **Một runtime SSOT, kết liễu hai authority.** Hiện có HAI hệ token song song: `HmTheme` (cũ) và `GraphicsAuthority` (mới) — gây vụ brand `#0c4a6e` ≠ `#1565c0` (F5). Chốt `graphics_token_catalog/_value` là authority runtime; `HmTheme` rút về adapter đọc; `LegoTheme` chỉ là engine OKLCH áp CSS var. **Một đường, một sự thật.**
7. **9 tab Appearance → 3 tab.** Giữ **Theme** + **Governance** (gộp *Quản trị tuân thủ* + *Nâng cao*) + **Chuẩn thiết kế** (read-only reference). Chuyển **Mẫu bố cục** và **Module Master** sang Module Studio. Gập **Trợ năng** và phần export của **Xuất & Phân tích** vào Theme. Xoá code chết (tokens/effects/overview ẩn).
8. **"Một khái niệm — một write-path PER SCOPE."** Override cấp module/component KHÔNG phải edit toàn cục lần hai; nó là một *scope* khác (kiểu Figma mode), ghi vào `graphics_token_value(scope='module:<id>')`, sửa trong Module Studio theo scope đó. Theme ghi scope `global`. Không bao giờ hai nơi ghi cùng một scope.
9. **Custom CSS injection (tab Nâng cao) là cửa hậu phá SSOT** → bỏ hoặc khoá sau cờ "developer escape hatch" có cảnh báo + audit. Token literal tự do là đúng thứ no-hardcode gate phải chặn.
10. **Tôn trọng HMV4 freeze (ADR-0004).** Sidebar/shell toàn cục (`40-eqms-shell.js`, `02-state-auth-ui.js`, `01-module-router.js`, `portal.main.css`…) **bị cấm sửa**. "Đập đi xây lại" áp dụng cho *nội dung màn hình Appearance* và *chrome nội bộ của Module Studio* — KHÔNG đập rail điều hướng toàn cục trừ khi founder duyệt gỡ freeze một sprint riêng.

---

## 1. Vì sao phải đập — chẩn đoán gốc rễ

Ba tầng phân mảnh (xác nhận bằng đọc code + audit Chrome live hôm nay):

### 1.1 Phân mảnh BỀ MẶT BIÊN TẬP → trùng điều khiển (vi phạm SSOT trực tiếp)
Màn hình "Giao diện" (`00c-admin-appearance.js`, ~5.379 dòng) có 9 tab với **trùng lặp nghiêm trọng**:

| Trùng lặp | Mức | Vị trí |
|---|---|---|
| `renderChangeSetPanel` render ở **cả** Governance **và** Advanced | CAO | 4973 / 5151 |
| `renderReleaseBlockers/Dashboard/Linkage/PolicyPacks/Waiver/AuditHistory` — **7 panel** nhân đôi nguyên si | CAO | 4978-4985 / 5152-5157 |
| `renderTemplateGallery` xuất hiện ở Templates **và** Governance | TB | 3247 / 5001 |
| Typography/Color/Spacing specimen (Analytics) chỉ là *view read-only* của token sửa ở Tokens | TB | 3718-3811 |
| `renderTokens()` + `renderEffects()` còn trong `bodies{}` nhưng **không có tab** (code ẩn/chết) | TỚI HẠN | 3991/3993 |
| Contrast check lặp ở Accessibility **và** Advanced | THẤP | 3303 / 5176 |

→ Người dùng có thể chỉnh *cùng một thứ* (release rollout, audit, contrast) từ **hai tab khác nhau**. Đây đúng là "1 tính năng bị điều khiển bởi hai nơi" mà founder muốn diệt.

### 1.2 Phân mảnh TOKEN AUTHORITY → hai sự thật
- **`HmTheme`** (`00b`, ~1.687 dòng): authority cũ, ~150 token, ghi qua `admin_design_config` API + fallback `design-system-config.json`.
- **`GraphicsAuthority`** (`00bb`, ~888 dòng): authority mới DB-backed (`graphics_token_catalog/_value`), nhưng `tokens.read()` vẫn *fallback sang HmTheme*, và bảng `graphics_token_value` hiện **trống** — giá trị thật vẫn nằm ở HmTheme.
- **`LegoTheme`** (`00bg`): engine OKLCH, 6 preset, chỉ áp CSS var, **không persist**.
- **Hệ quả thực đo (F5):** trang load brand `#0c4a6e` (HmTheme config) nhưng preset "HESEM mặc định" = `#1565c0` (DB) → chọn "default" làm **brand nhảy màu**. Hai authority bất đồng. (Đã tạm hoà giải bằng migration 264 chọn `#0c4a6e` canonical, nhưng *gốc rễ hai-authority vẫn còn*.)

### 1.3 Phân mảnh BLOCK REGISTRY → ba danh sách không nối
- **Block Engine** `BLOCK_CATALOG`: 196 type (catalog thô, `00-block-engine.js`).
- **L3 BlockKit** `__HM_BLOCK_REGISTRY__`: ~6-7 block governed (`00bc/00bd`).
- **Admin Module Sample**: ~8 component showcase.
→ Builder không "đồng bộ vào Module Master". `window.Blocks` facade (Stage 0) đã bắc cầu một phần; unified catalog đã hiện 177 block với badge Engine/L3/SSOT (W2 audit). Nhưng **chưa một-nguồn**.

### 1.4 Phân mảnh SKIN BUILDER (đã sửa phần lớn ở P1)
Builder từng tự vẽ `.mb-*` hardcode → "xấu, thô kệch". P1 (#108) re-skin lên `o3-*`; F3 đã dẹp dải emoji taxonomy "cấp 1" trên mặt block. Builder giờ recolor theo theme. **Phần này coi như nền tốt để xây Module Studio lên trên.**

---

## 2. Nguyên tắc chuẩn thế giới (cơ sở đối chiếu)

Tổng hợp từ W3C DTCG 2025.10, Material 3 (ref/sys/comp), Atlassian, WordPress Gutenberg, Plasmic, EightShapes (Nathan Curtis), Brad Frost, Figma Variables:

1. **Token 3 tầng, định nghĩa một lần.** primitive (raw OKLCH/px) → semantic (`color.bg.surface`, `space.master`) → component (`button.bg`). Tầng trên chỉ **tham chiếu** tầng dưới (alias `{token}`), không copy giá trị. "Không token nào định nghĩa hai lần" đến từ **luật tham chiếu**, không phải từ tên. → `graphics_token_catalog` cần cột `tier` + `references`; CI ép: component→semantic→primitive, chỉ primitive mới mang literal.
2. **Ranh giới Theme ↔ Component (chuẩn WordPress block-supports).** *Theme* chỉ đổi **giá trị token**; *Component* chỉ khai báo **hợp đồng token nó tiêu thụ** (`overridable_tokens`). Theme không bao giờ đổi cấu trúc component; component không bao giờ hardcode giá trị. → đúng cái `graphics_component_contract.overridable_tokens` đang có.
3. **Registry là người gác cổng (Plasmic/Gutenberg).** Trang chỉ được chứa: (i) tham chiếu block ID đã đăng ký, (ii) giá trị prop/slot, (iii) tham chiếu token. **Không** literal style, **không** component ẩn danh. → đúng luật founder: "block chưa có thì vào Studio tạo rồi mới chèn".
4. **No-hardcode = lint ở CI, không phải review tay (Atlassian).** grep `#hex` + bare `px` ngoài catalog → fail build. Kiểm token reference resolve được. → mở rộng `check_graphics_no_hardcode.php`.
5. **Một write-path cho mỗi khái niệm (Figma SSOT).** Mọi bề mặt khác là consumer read-only. Nếu một thiết lập sửa được từ hai UI → đó là bug drift, cùng loại với họ token `components.admin.*` đã bị xoá 2026-05-29.
6. **Atomic Design (Frost) + token = tầng "hạ nguyên tử".** token → L2 component → L3 block → template → page. Không bắt buộc phân biệt molecule/organism — gộp thực dụng L2/L3 là hợp thời.

---

## 3. Kiến trúc mục tiêu — HAI bề mặt, BA registry

```
                    ┌─────────────────────────────────────────────┐
   GHI (write)      │  BỀ MẶT 1 · THEME  (Admin → Giao diện)        │
                    │  = nơi DUY NHẤT chỉnh GIÁ TRỊ token toàn cục  │
                    │  mode · màu(OKLCH seed) · chữ · mật độ(1 knob)│
                    │  · motion · radius · theme template          │
                    └───────────────┬─────────────────────────────┘
                                    │ ghi scope='global'
                    ┌───────────────▼─────────────────────────────┐
   SSOT RUNTIME     │  graphics_token_catalog / _value  (L0)        │
                    │  → CSS vars  --o3-*   (LegoTheme áp OKLCH)     │
                    └───────────────┬─────────────────────────────┘
                                    │ đọc (read-only) ở MỌI surface
   ┌────────────────────────────────┼────────────────────────────────┐
   │ BỀ MẶT 2 · MODULE STUDIO (đổi tên từ "Master Module Template")   │
   │ = nơi DUY NHẤT chỉnh ĐỊNH NGHĨA block + template + lắp ráp module │
   │                                                                  │
   │  ┌── LEGO BLOCK MASTER ──────────────────────────────────────┐   │
   │  │ (gộp tab Module Master + Cây module)                       │   │
   │  │  trái: Thư viện block (Block registry L3 — nguồn DUY NHẤT) │   │
   │  │  giữa: Canvas / Cây lắp ráp (render = production thật)     │   │
   │  │  phải: Inspector + hợp đồng token của block (sửa định nghĩa)│   │
   │  └────────────────────────────────────────────────────────────┘   │
   │  ┌── TEMPLATE STUDIO ────────────────────────────────────────┐   │
   │  │ (chuyển từ tab "Mẫu bố cục")                               │   │
   │  │  tạo/sửa Archetype (L4) + Page template (L5): khai báo zone│   │
   │  │  + block nào được phép trong mỗi zone                      │   │
   │  └────────────────────────────────────────────────────────────┘   │
   │  ┌── THEME TEMPLATE (override scoped) ───────────────────────┐   │
   │  │  preset có tên = bộ override token; module trỏ preset_key  │   │
   │  │  ghi graphics_token_value(scope='module:<id>'/preset)      │   │
   │  └────────────────────────────────────────────────────────────┘   │
   │                                                                  │
   │  TẠO MODULE MỚI:  chọn Template (L4/L5)  +  chọn Block (L3)       │
   │                   → cây tham chiếu, KHÔNG phát minh tại trang     │
   └──────────────────────────────────────────────────────────────────┘
```

**Hệ quả:** sửa 1 token ở Theme → đổi cả runtime + builder + showcase. Thêm 1 block vào registry trong Module Studio → tự hiện ở palette tạo-module + Lego Block Master + runtime. Một nguồn, không drift.

---

## 4. Lego Block Master — thiết kế chi tiết

Gộp hai thứ đang rời:
- **Module Master** (`00c-admin-appearance-module-sample.js`, ~2.729 dòng): showcase SSOT mọi component với token list — render bằng CSS production thật. *Đây đã đúng chuẩn.*
- **Cây module** (widget tree trong `31-module-builder.js`): hiển thị block của tab hiện tại dạng cây.

Thành **một workspace 3 cột** trong Module Studio:

| Cột | Nội dung | Vai trò SSOT |
|---|---|---|
| **Trái — Thư viện** | Block registry hợp nhất (qua `window.Blocks.catalog()`): L3 published ưu tiên (badge "SSOT/Curated"), Engine fallback. Nhóm 12 category. | Nguồn DUY NHẤT các đơn vị lắp được |
| **Giữa — Canvas/Cây** | Lắp ráp module: kéo block từ thư viện vào zone của template; render `Blocks.render(type,payload)` = **production thật** (hết "wireframe schematic") | Trang = cây tham chiếu |
| **Phải — Inspector** | (a) *Instance mode*: chỉnh prop/slot/data của block đang chọn. (b) *Definition mode*: chỉnh ĐỊNH NGHĨA block — slot, variant, hợp đồng `overridable_tokens`, a11y contract → ghi vào Block registry | Sửa "lego master" |

**Quy tắc gác cổng (registry-as-gatekeeper):**
- Thư viện chỉ liệt kê block **đã đăng ký**. Muốn block mới → nút "Tạo block mới" mở Definition mode → khai báo composed-of (L2 component), slot, token contract → đăng ký vào registry → CI gate `check_graphics_block_registry.php` xác minh composed_of tồn tại + no-hardcode → mới dùng được.
- Canvas **từ chối** literal hex/px (inspector chỉ cho chọn token qua ControlKit, không cho gõ `padding:"16px"` tự do — đây là lỗ hổng hiện tại ở JSON-schema path).

---

## 5. Luồng tạo module + luật cho AI

**Người dùng tạo module:**
1. Bấm "Tạo Module mới" → bước 1: chọn **Template** (Archetype L4 / Page template L5 từ Template Studio): vd `workspace-projection`, `authoritative-record-shell`, `analytics-overview`.
2. Bước 2: chọn **Lego block** gắn vào từng zone (chỉ block hợp lệ cho zone đó, theo `allowed` trong template contract).
3. Bước 3: chọn **Theme template** (preset_key) cho module → `schema.config.theme = preset_key` (tham chiếu, sửa preset thì module đổi theo).
4. Module = cây tham chiếu `{template_id, theme_preset_key, zones:[{block_key, slots, data}]}`. Không bytes style nào.

**Muốn sửa template / sửa block:** vào **Module Studio** (không sửa rải rác trong module). Module chỉ *tham chiếu*; sửa định nghĩa ở nguồn → mọi module dùng nó cập nhật.

**Luật cho AI (bắt buộc, máy ép):**
> Khi AI dựng/đề xuất module: chỉ được dùng block/template **đã có trong registry**. Nếu thiếu → AI phải, theo thứ tự: (1) thêm row `graphics_token_catalog` cho token mới (migration, theo mẫu mig 213); (2) thêm token_key vào `graphics_component_contract.overridable_tokens`; (3) đăng ký block vào Block registry + thêm vào Lego Block Master; (4) chạy Simulate (`PreviewScenes` + WCAG) ghi `graphics_simulation_run`; *rồi mới* chèn vào module. CI từ chối module JSON tham chiếu block lạ hoặc chứa literal hex/px.

→ Con người và AI **cùng một đường**, SSOT không thể lách.

---

## 6. ĐÁNH GIÁ TỪNG TAB (trả lời trực tiếp câu hỏi founder)

| Tab hiện tại | Có ích? | Trùng / vi phạm SSOT? | **Phán quyết** |
|---|---|---|---|
| **🎨 Theme** | **Cốt lõi.** Mode/màu/chữ/mật độ/motion/theme template. | Đang chia quyền với Module Master dock (override) + HmTheme/GA hai authority. | **GIỮ — nâng thành bề mặt token toàn cục DUY NHẤT.** Hấp thụ Trợ năng (làm validator contrast trong Simulate) + phần export DTCG của Xuất&Phân tích + code ẩn tokens/effects. |
| **🧩 Module Master** | Cao (showcase SSOT component). | Vị trí sai — nên ở nơi lắp ráp. | **CHUYỂN sang Module Studio**, gộp với Cây module → **Lego Block Master**. (đúng ý founder) |
| **📐 Mẫu bố cục** (templates T01–T120) | Cao (catalog layout = L4/L5). | Editor template tách rời nơi tạo module → người dùng phải nhảy tab. | **CHUYỂN sang Module Studio → Template Studio.** Đây là "loại template" để chọn khi tạo module + nơi sửa template. |
| **🛡️ Quản trị tuân thủ** (Governance) | Cao cho hướng SaaS (compliance/rollout/audit/drift/debt/waiver) — "đóng đinh sớm". | **7 panel nhân đôi với Nâng cao.** | **GIỮ + GỘP với Nâng cao** thành một surface Governance duy nhất. Read-mostly + nút rollout. |
| **🧩 Nâng cao** (Advanced) | Trung bình. Import/export theme JSON hữu ích; **Custom CSS injection = cửa hậu phá no-hardcode**; 7 panel governance trùng. | Trùng nặng + lỗ hổng SSOT. | **GỘP vào Governance.** Import/export → giữ dưới Governance. **Custom CSS injection: BỎ** (hoặc khoá sau cờ dev + cảnh báo + audit). |
| **♿ Trợ năng** (Accessibility) | Cao về giá trị (WCAG/contrast/colorblind/checklist) nhưng **read-only, không ghi gì** → không vi phạm SSOT. | Contrast lặp với Advanced. | **GẬP vào Theme** như panel validation chạy trong Simulate (theme đổi màu → kiểm contrast ngay tại đó). Giữ checklist như sub-panel read-only. |
| **📊 Xuất & Phân tích** | Một nửa hữu ích: **export token (CSS/SCSS/DTCG)** rất giá trị (interchange chuẩn thế giới). Nửa kia (typography specimen, color palette, spacing scale, health score) chỉ **view read-only trùng** Theme editor. | Visualization trùng. | **TÁCH:** export DTCG → gập vào Theme (nút "Xuất token"). Health/compliance → gập vào Governance. **Bỏ** các visualization trùng (Theme editor đã hiển thị). |
| **📖 Chuẩn thiết kế** (Design Standard) | Tham khảo (iframe doc V4, ~12.999 dòng). Read-only. | Không trùng, không ghi. | **GIỮ** như tab reference/help read-only (chi phí thấp, giá trị tra cứu). Hoặc chuyển thành link "Trợ giúp". |
| *(ẩn)* tokens / effects / overview | Code chết (render nhưng không có tab). | — | **XOÁ** sau khi nội dung đã về Theme. |

**Kết quả: 9 tab Appearance → 3 tab** (Theme · Governance · Chuẩn thiết kế), và toàn bộ lắp-ráp/lego/template dồn vào **Module Studio**.

**"Gom lại được không / xoá thì sao?"** — Tóm tắt:
- *Gom được:* Trợ năng + export → Theme; Governance + Nâng cao → một; Mẫu bố cục + Module Master → Module Studio.
- *Xoá được không hối tiếc:* code ẩn tokens/effects/overview; Custom CSS injection; các visualization trùng trong Xuất&Phân tích; 7 panel nhân đôi.
- *Không nên xoá:* năng lực export DTCG (interchange), governance/audit/rollout (nền SaaS), reference doc, WCAG validator (chuyển chỗ chứ không bỏ).

---

## 7. Diệt vi phạm SSOT "một khái niệm — hai nơi"

| Vi phạm hiện tại | Cách kiến trúc mới diệt |
|---|---|
| `control.height`/`space.master`/`radius`/`brand` chỉnh được ở **Theme** lẫn **Module Master override dock** | **One write-path PER SCOPE:** Theme ghi `scope='global'`; override cấp module ghi `scope='module:<id>'` trong Module Studio (kiểu Figma mode). Không nơi nào ghi trùng scope. Module Master dock cũ (ghi `o3-props-overrides` localStorage ẩn) bị **thay** bằng scoped-override có audit. |
| **HmTheme** vs **GraphicsAuthority** hai authority (F5 brand nhảy) | Chốt `graphics_token_catalog/_value` là authority runtime; populate `_value`; `HmTheme.getDeep` rút về **adapter đọc** từ GA; `GraphicsAuthority.tokens.read` bỏ fallback HmTheme khi `_value` đã đầy. |
| 7 panel governance ở **cả** Governance & Advanced | Gộp một surface. |
| Contrast check ở Accessibility & Advanced | Một validator trong Theme Simulate. |
| JSON-schema path cho gõ `padding:"16px"` tự do | Inspector chỉ ControlKit token-widget; CI no-hardcode chặn literal. |
| Custom CSS injection (literal tự do) | Bỏ / khoá sau cờ dev + audit. |
| LegoTheme preset hardcode vs DB preset | Preset = row DB (`graphics_theme_preset`), 6 preset cũ thành seed rows (đã bắt đầu: mig 264). |

---

## 8. Ràng buộc & rủi ro

- **HMV4 freeze (ADR-0004):** `40-eqms-shell.js`, `02-state-auth-ui.js`, `01-module-router.js`, `portal.main.css`, `eqms-suite.css`, `density-darkmode.css` **cấm sửa**; `portal.html` chỉ cache-bust/feature-flag. ⇒ Không thể đập **rail điều hướng toàn cục** (sidebar trái với "Quản trị hệ thống", "Master Module Template"…). "Đập đi xây lại" hợp pháp ở: nội dung màn hình Appearance (`00c*`, `00d*`), chrome Module Studio (`31-module-builder.js`), CSS sau `graphics-authority.css`. Muốn đập sidebar toàn cục → sprint riêng + founder duyệt gỡ freeze + feature-flag inert + E2E.
- **F1 bài học:** đừng nhắm selector `.eqms-nav*` (markup của shell không dùng); sidebar thật là `#sidebar-nav .nav-item`.
- **Không big-bang.** Engine 827KB + builder 1.27MB — strangle dần sau registry hợp nhất, không viết lại một lần.
- **Migration:** populate `graphics_token_value` cần backfill cẩn thận (POSTGRES_ONLY live) + smoke với FPM DB env (bài học deploy gate chain).

---

## 9. Lộ trình thực thi (mỗi phase 1 PR + verify Chrome trên VPS)

| Phase | Nội dung | Rủi ro | Giá trị thấy ngay |
|---|---|---|---|
| **S0** | Đổi tên "Master Module Template" → **Module Studio** (label/route nội bộ, không đụng shell freeze); dọn code chết (tokens/effects/overview ẩn, R6 trùng ~1.260 dòng) | Thấp | Tên đúng, nhẹ bớt |
| **S1** | **Appearance 9→3 tab:** gộp Governance+Advanced; gập Trợ năng + export DTCG vào Theme; bỏ visualization trùng + Custom CSS injection | Thấp-TB (CSS+JS, không backend) | Hết trùng điều khiển; Appearance gọn |
| **S2** | **Lego Block Master:** gộp Module Master + Cây module thành workspace 3 cột trong Module Studio; palette + canvas + preview qua `Blocks` facade (preview = production) | TB | Đồng bộ block; "lego master" sửa được |
| **S3** | **Template Studio:** chuyển Mẫu bố cục vào Module Studio; luồng tạo-module chọn template+block; registry-as-gatekeeper | TB | Tạo module chuẩn SSOT |
| **S4** | **One runtime SSOT:** populate `graphics_token_value`; HmTheme→adapter đọc; bỏ fallback; scoped override thay dock localStorage | Cao (migration+backend, live DB) | Diệt F5 hai-authority tận gốc |
| **S5** | **CI gate cứng:** mở rộng no-hardcode toàn bộ renderer mới; gate "module JSON chỉ tham chiếu block đã đăng ký + zero literal"; token-contrast lint; luật AT cho AI | TB | SSOT máy-ép, không lách được |

S0–S3 là phần "đập đi xây lại UI" founder mô tả (an toàn, đảo ngược được). S4–S5 là phần làm SSOT *bất khả xâm phạm* (nền tảng, làm sau khi UI ổn).

---

## 10. Quyết định cần founder chốt (xem phần hỏi)
1. **Phạm vi "đập":** chỉ nội dung Appearance + Module Studio (an toàn, trong freeze) — hay xin gỡ HMV4 freeze để đập cả sidebar toàn cục (rủi ro cao)?
2. **Số lượng / cách gộp tab Appearance:** xác nhận mục tiêu 3 tab (Theme · Governance · Chuẩn thiết kế).
3. **Custom CSS injection:** bỏ hẳn hay giữ sau cờ dev + audit?
4. **Thứ tự:** làm UI trước (S0–S3) rồi nền SSOT (S4–S5) — hay ưu tiên diệt hai-authority (S4) sớm?

---
*Soạn 2026-06-01. Thống nhất với MASTER-STRATEGY / PHASE3 / AUDIT-P1-P4. Đây là đề xuất tiến hoá có kỷ luật — đập phần UI rời rạc, giữ "bộ xương" token-authority đúng hướng, làm SSOT thành bất biến do máy ép.*
