# Hoạch định lại: "Lego SSOT" — Sidebar đồ họa là kho block để lắp module
## Thiết kế chuẩn để AI/người xây module = lắp Lego, không đoán, không hardcode

**Ngày:** 2026-05-30
**Bối cảnh quyết định:** Người dùng xác nhận đích đến là **nền tảng SaaS đa-tenant sẽ bán** (không phải ERP nội bộ một tenant). Điều này **lật ngược** phán quyết "over-engineering" trong báo cáo phản biện [CRITICAL-EVALUATION-2026-05-30.md](./CRITICAL-EVALUATION-2026-05-30.md): tầng governance 10 bảng + scope 5 tầng + tham vọng Lego không còn là gold-plating, mà là **nền móng sản phẩm đúng đắn dựng sớm**.
**Phạm vi:** portal hiện tại + module mới + tích hợp chương trình HMV4 (module-template-v4).
**Tài liệu nền:** đã quét `00bb-graphics-authority.js`, `migration 148`, `00c-admin-appearance-module-sample.js`, `orders-v3.css`, `DesignTokenCatalogService.php`, các báo cáo v3-G25c.

---

## 0. Nguyên lý chỉ đạo (đọc cái này trước)

> **"Xây module = lắp Lego."** Mọi quyết định đồ họa và logic-trình-bày phải được **tính sẵn, lưu ở dạng block**, link hoàn toàn với hệ tuân thủ SSOT. AI/người khi xây chỉ **lấy ra, lắp ghép** — không đoán, không phát minh literal, không hardcode frontend nếu trong hệ đã có sẵn thiết kế.

Để đạt được điều đó, cần phân biệt **bốn tầng Lego** — đây là khung xương của toàn bộ đề xuất:

| Tầng | "Viên Lego" là gì | SSOT lưu ở đâu | Hiện trạng |
|---|---|---|---|
| **L1 — Token** | Một biến hình ảnh nguyên tử (màu, px, font, motion) | `graphics_token_catalog` + `graphics_token_value` | ✅ Đã có, tốt |
| **L2 — Component** | Một thành phần (Button, Tab, Table, KPI…) + danh sách token nó cho phép chỉnh | `graphics_component_contract` | ⚠️ Có nhưng catalog là JS hardcode |
| **L3 — Block/Pattern** | Một cụm chức năng tái dùng (Toolbar lọc, Master-detail, Form section, Empty state) | **CHƯA CÓ** | ❌ Khoảng trống lớn nhất |
| **L4 — Module Archetype** | Khuôn module hoàn chỉnh (Workspace projection / Authoritative record shell) | manifest (HMV4 đã manh nha) | 🟡 Có khái niệm, chưa thành SSOT máy đọc được |

**Luận điểm trung tâm:** Sidebar đồ họa hiện đã làm tốt **L1**, làm dở-dang **L2**, và **bỏ trống L3–L4**. Đúng những gì người dùng than: "phải đoán" vì L3/L4 chưa tồn tại dưới dạng block lấy-ra-lắp được. Toàn bộ kế hoạch này là **lấp L2→L4 thành dữ liệu máy đọc được**, để AI query "có block nào?" thay vì đọc 27 hàm JS.

---

## 1. Hiện trạng từng tab đồ họa — đánh giá tính thực dụng cho việc "xây module"

Người dùng hỏi thẳng: 8 tab này có **giúp xây hệ thống** không, hay chỉ trưng bày? Phán quyết theo trục "có giúp lắp Lego không":

| Tab | Làm gì | Giúp xây module? | Phán quyết |
|---|---|---|---|
| **Mẫu bố cục** (Templates) | Registry template bố cục, impact analysis, rollout | **CÓ — đây là phôi của L4** | GIỮ + nâng thành Module Archetype thật |
| **Module Master** | Showcase 27 component + dock chỉnh token per-section | **CÓ — đây là L2, quan trọng nhất** | GIỮ + **dữ-liệu-hóa** (xem §3) |
| **Theme** | Global theme: mode/màu/font/density/motion | **CÓ — nguồn mặc định L1** | GIỮ |
| **Trợ năng** (A11y) | Kiểm contrast WCAG, mô phỏng mù màu | **GIÁN TIẾP** — validate, không sản xuất | GIỮ nhưng **biến thành CI gate** (xem §4) |
| **Xuất & Phân tích** | Export CSS/SCSS/JS/Swift/DTCG, health score | **CÓ cho đa-nền-tảng SaaS** | GIỮ — giá trị tăng khi bán SaaS |
| **Quản trị tuân thủ** | Audit, waiver, drift, lineage, compliance matrix | **CÓ cho SaaS đa-tenant** (trước đây tôi gọi thừa) | GIỮ — verdict flipped |
| **Nâng cao** | Rollout/canary, import/export, custom CSS khẩn cấp | **CÓ — escape hatch hợp lệ** | GIỮ, gắn waiver bắt buộc |
| **Chuẩn thiết kế** | Tài liệu tham chiếu (iframe v4) | **CÓ — nhưng tĩnh** | GIỮ + **link tới L3/L4 registry** khi có |

**Kết luận tab:** không tab nào nên xóa trong bối cảnh SaaS. Vấn đề **không** phải "tab nào thừa", mà là **thiếu lớp L3/L4 dữ-liệu-hóa** để các tab này trỏ vào. Hiện chúng quản lý token (L1) và component (L2) rời rạc; chưa có "block" và "archetype" để AI lắp.

---

## 2. Chẩn đoán gốc rễ: vì sao "vẫn phải đoán" dù đã có Authority

Ba khoảng trống cụ thể, kèm bằng chứng:

### 2.1 Catalog component là JS hardcode, không phải dữ liệu (L2 dở-dang)
`00c-admin-appearance-module-sample.js` định nghĩa 27 component bằng **27 hàm JS trả HTML** + mảng token. Hệ quả: AI không thể `SELECT * FROM blocks` — phải đọc code. Đây chính là mâu thuẫn "cái nôi của chuẩn lại vi phạm tinh thần no-hardcode". **Phải đảo:** component định nghĩa bằng **dữ liệu** (DB/JSON), JS chỉ là renderer đọc dữ liệu đó.

### 2.2 Không tồn tại tầng Block/Pattern (L3) — khoảng trống lớn nhất
UI nghiệp vụ thật không lắp từ Button đơn lẻ, mà từ **cụm**: "thanh toolbar có filter-chips + search + actions", "layout master-detail", "form section có label-grid". Hiện mỗi module tự ráp các cụm này bằng tay → drift. Cần một **Block Registry** (L3): cụm đã ráp sẵn, đã bind token, có "slot" để đổ dữ liệu nghiệp vụ vào.

### 2.3 SSOT rò + runtime phân kỳ migration (đã nêu ở critique §2.2)
- 3 nguồn sự thật: `design-system-config.json`, `graphics_token_value`, và literal cứng (chính là bug dark mode hôm nay).
- Báo cáo v3-G25c tự thừa nhận: delivery đi đường JS `setProperty`, migration token (213–255) **chưa vào main** (main ở 212). → "SSOT trên giấy".
- **Phải chốt:** một đường runtime canonical, và cây migration phải hợp nhất vào main trước khi tuyên bố SSOT.

---

## 3. Đề xuất kiến trúc: Block Registry — biến L2→L4 thành dữ liệu máy đọc được

### 3.1 Mô hình dữ liệu (mở rộng từ `graphics_component_contract` đã có)

Thêm 2 bảng, nối tiếp triết lý migration 148. Đây là **trái tim** của "Lego":

```
-- L3: Block = cụm component đã ráp sẵn, bind token, có slot dữ liệu
graphics_block_contract (
  block_key            VARCHAR UNIQUE,      -- 'toolbar.filtered', 'layout.master-detail', 'form.section'
  display_name_en/vi   VARCHAR,
  category             VARCHAR,             -- layout | input | display | feedback | navigation
  composed_of          TEXT[],              -- component_keys it assembles: ['chip','input','btn']
  required_tokens      TEXT[],              -- tokens it reads (for impact analysis)
  slots                JSONB,               -- named data holes: {"filters":[], "actions":[], "title":""}
  variant_axes         JSONB,              -- allowed variants: {"density":["compact","cozy"]}
  render_template_key  VARCHAR,             -- which renderer in BlockKit emits its HTML
  a11y_contract        JSONB,               -- required ARIA roles, keyboard map
  status               VARCHAR,             -- draft | review | published | deprecated
  preview_scene_key    VARCHAR
)

-- L4: Archetype = khuôn module hoàn chỉnh = sắp xếp các block vào zone
graphics_module_archetype (
  archetype_key        VARCHAR UNIQUE,      -- 'workspace-projection', 'authoritative-record-shell'
  display_name_en/vi   VARCHAR,
  zones                JSONB,               -- {"header":[...blocks], "body":[...], "aside":[...]}
  route_class          VARCHAR,             -- maps to HMV4 9 route classes
  required_blocks      TEXT[],
  forbidden_patterns   TEXT[],              -- anti-patterns the QA gate rejects
  manifest_schema      JSONB                -- the Build Packet shape this archetype expects
)
```

**Tại sao bảng, không phải file:** đa-tenant SaaS cần scope/version/audit cho block giống token (một khách hàng có thể có block riêng). Tái dùng đúng hạ tầng scope 5 tầng của migration 148 — **đây là chỗ scope hierarchy cuối cùng có ích thật**.

### 3.2 BlockKit — renderer đọc dữ liệu (đối xứng với ControlKit đã có)

`ControlKit` (đã có) render **widget chỉnh token** cho admin. Thêm `BlockKit`: render **block nghiệp vụ** cho module thật, đọc từ `graphics_block_contract`.

```js
// Lắp Lego trong code module = 1 dòng, không HTML thủ công:
BlockKit.render('toolbar.filtered', {
  slots: { filters: myFilterModel, search: true, actions: myActions, title: 'Đơn hàng' }
});
// → emit HTML đã bind token (--o3-control-h-standard, --o3-space…), đúng a11y, đúng density.
```

Nguyên tắc: **module KHÔNG được viết `<div class="o3-toolbar">` thủ công** nếu block đã tồn tại. Nếu chưa có block → phải thêm vào registry trước (đúng nghĩa "thiết kế sẵn rồi mới lắp").

### 3.3 Module Master tab → dữ-liệu-hóa
Sửa `00c-admin-appearance-module-sample.js`: thay 27 hàm hardcode bằng vòng lặp đọc `graphics_component_contract` + `graphics_block_contract`. Showcase tự sinh từ registry. Thêm component/block mới = thêm 1 row DB, **không sửa JS**. Đây là lúc Module Master thật sự thành SSOT máy đọc được.

### 3.4 Build Packet (manifest) — hợp đồng xây module
Một module mới = **một manifest** khai báo: archetype nào, đổ block nào vào zone nào, bind data source nào. AI sinh manifest, không sinh HTML/CSS. CI validate manifest theo `manifest_schema` của archetype.

```json
{
  "module": "supplier-scorecard",
  "archetype": "workspace-projection",
  "zones": {
    "header": [{"block":"toolbar.filtered","slots":{...}}],
    "body":   [{"block":"layout.master-detail","slots":{...}}]
  },
  "data_bindings": {"list":"GET /api/v1/suppliers", ...}
}
```

---

## 4. Cơ chế an toàn: 3 CI gate (rẻ) > governance ledger (đắt, ghi sổ sau)

Governance hiện ghi-sổ-sau-khi-sự-đã-rồi. Bổ sung **gate chặn trước** — đây là thứ đã bắt được bug dark mode nếu tồn tại:

1. **No-hardcode mở rộng** — đã có grep hex/px trong `09v3-*.js`; mở rộng quét:
   - inline `style="…color/background…"` literal trong mọi JS portal
   - `rgba(255,255,255,…)` và hex cứng trong CSS module (kể cả trong `color-mix`)
   *→ chính xác chặn `.nav-section`/`.admin-nav-group`/inline-input đã gây bug hôm nay.*
2. **Dark-mode parity** — mọi token màu phải có `default_dark`; mọi selector surface (`#sidebar`, `.admin-nav-panel`, `.nav-section`, `.admin-nav-group`, `.*-panel`, `.*-card`) phải có override cho **cả** `[data-color-mode="dark"]` **và** `[data-color-scheme-active="dark"]`.
3. **Contrast WCAG tự động** — dùng `GraphicsAuthority.a11y.contrastRatio` đã có, chạy trên cặp text/surface; fail → chặn merge. Biến tab "Trợ năng" từ "tab để xem" thành "gate để chặn".

**Gate-block bổ sung (cho L3/L4):** một block chỉ `status='published'` khi: (a) mọi `required_tokens` tồn tại trong catalog, (b) preview scene chạy + ghi `graphics_simulation_run`, (c) pass 3 gate trên. Manifest chỉ build được từ block `published`. → **không thể lắp Lego hỏng.**

---

## 5. Lộ trình thực thi (đề xuất, theo thứ tự khấu hao giá trị)

| Giai đoạn | Việc | Vì sao trước | Rủi ro |
|---|---|---|---|
| **P0** ✅ (phiên này) | Vá dark mode (sidebar/admin-nav/input) + cache-bust | Bug đang thấy, rẻ | thấp |
| **P1** | 3 CI gate (no-hardcode mở rộng, dark-parity, contrast) | Chặn tái phát cả lớp bug; rẻ | thấp |
| **P2** | Chốt 1 đường runtime SSOT + hợp nhất migration 213–255 vào main | Xóa "SSOT trên giấy"; nền cho mọi thứ sau | TB (cần cherry-pick cẩn thận) |
| **P3** | Dữ-liệu-hóa Module Master (đọc `component_contract`) | Biến L2 thành SSOT máy đọc | TB |
| **P4** | `graphics_block_contract` + BlockKit (L3) — bắt đầu 5–8 block lõi | Lấp khoảng trống lớn nhất | cao (thiết kế API) |
| **P5** | `graphics_module_archetype` + Build Packet (L4) + tích hợp HMV4 | "Lắp Lego" đầy đủ; HMV4 slice dùng manifest thật | cao |

**Ngưỡng then chốt:** P4–P5 (Block/Archetype) là đầu tư lớn. Với SaaS đa-tenant đã xác nhận, **ngưỡng kích hoạt đã đạt** — nên làm, nhưng theo lát cắt (mỗi lần 5–8 block lõi rút từ orders-v3 vốn đã sạch token), không big-bang.

---

## 6. Tích hợp HMV4 (theo lựa chọn "bao gồm HMV4 slice program")

HMV4 đã có khái niệm archetype (workspace projection / authoritative record shell) và 9 route class — **đây chính là L4 manh nha**. Đề xuất:
- `graphics_module_archetype.route_class` ánh xạ thẳng 9 route class HMV4.
- Mỗi slice HMV4 mới (Slice 3 TRAIN đang chạy, rồi CAPA/CDOC/INSP…) **xuất ra một manifest** thay vì HTML thủ công, validate theo `manifest_schema`.
- File HMV4 (70–74) thành **consumer của BlockKit**, không tự dựng renderer riêng → loại trùng lặp giữa orders-v3 và HMV4.
- Giữ nguyên posture FROZEN/ADR: block/archetype mới vẫn feature-flag inert, fixture-only, cho tới khi duyệt.

---

## 7. Việc đã làm trong phiên này (P0) — trạng thái trung thực

**Đã sửa trong mã (deterministic):**
- `00d-admin-appearance-theme.js`: gỡ cặp inline `background/color` mong manh khỏi 2 input (font-family, font-base) → để CSS dark rule điều khiển. *(xác nhận qua grep: chỉ còn `border-radius:6px;font-size:12px`)*
- `portal.html`: `density-darkmode.css?v=20260530dm`, `00d-…theme.js?v=…mm30`. *(xác nhận qua grep: 0 ref mm29 còn lại)*
- `00c-admin-appearance.js` + `02-state-auth-ui.js`: version constant → `mm30`. *(xác nhận qua grep)*
- `density-darkmode.css`: thêm block dark cho `#sidebar`, `.admin-nav-panel`, `.nav-section`, `.admin-nav-group`; mở rộng rule input sang cả `[data-color-scheme-active="dark"]`. *(áp bằng script Python idempotent có marker `HESEM-DARK-SIDEBAR-FIX-20260530`)*

**CHƯA xác minh được trong phiên này (do kênh tool/bash của phiên bị treo output):**
- Xác nhận cuối cùng disk-state của `density-darkmode.css` (script idempotent đã chạy nhưng output không trả về để đọc lại).
- Deploy lên VPS + verify trên Chrome live (light/dark, sidebar + admin rail + input cỡ chữ).
- Đang ở nhánh `main` — theo CLAUDE.md cần tách nhánh trước khi commit; chưa commit.

**Khuyến nghị bước kế (phiên kế hoặc khi tool ổn định):**
1. Chạy lại state-report Python ở §7 để xác nhận `density-darkmode.css`.
2. `git checkout -b codex/dark-mode-sidebar-fix-20260530`, commit P0, push.
3. Deploy + verify Chrome theo `feedback_self_test_chrome` / `feedback_chrome_verify_until_done`.

---

## 8. Một câu chốt

Sidebar đồ họa hôm nay là một **kho token (L1) xuất sắc** với một **catalog component (L2) viết tay** và **không có tầng block/archetype (L3/L4)**. Đó là lý do AI "vẫn phải đoán" khi xây module — vì cái để lắp (block, archetype) chưa tồn tại dưới dạng dữ liệu. Với định hướng SaaS đa-tenant, đầu tư để **dữ-liệu-hóa L2 và dựng L3/L4** là chính đáng và nên làm theo lát cắt. Khi đó, và chỉ khi đó, "xây module = lắp Lego" mới thành sự thật vận hành được — AI query registry, lấy block `published`, đổ data vào slot, validate manifest, không một literal nào lọt ra ngoài SSOT.
