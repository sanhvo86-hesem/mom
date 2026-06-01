# 🔒 KIẾN TRÚC CHỐT — Module Studio (consensus 3 bên)
### HESEM MOM · 2026-06-01 · founder + GPT Pro + Claude đã hội tụ

> Tài liệu này là **SSOT để build**. Supersede phần mâu thuẫn trong PROPOSAL + REBUTTAL trước. Mọi quyết định dưới đây đã khoá, không mở lại trừ khi founder yêu cầu.

---

## 1. Bề mặt (IA) — chốt

```
Appearance / Graphics
├── Theme            ← nơi DUY NHẤT điều khiển đồ hoạ hệ thống (token toàn cục)
├── Module Studio    ← 1 surface, mode wall: Assemble · Author
└── Governance       ← evidence/release, KHÔNG chỉnh design
```
- **KHÔNG** 8 section ngang hàng. **KHÔNG** tách Builder ≠ Studio thành 2 bề mặt.
- Appearance **9 → 3 tab**.

## 2. Mode wall trong Module Studio — chốt (tường ngăn cứng bằng mode + quyền + write-path)

```
Assemble mode  (consumer thuần — tạo module thật; ai cũng dùng, kể cả AI)
  chọn archetype → chọn block PUBLISHED → fill slot → bind data → chọn theme preset
  → validate → preview (production renderer) → submit
  CẤM: sửa block definition, CSS/HTML thô, hex/px, density.
  Ghi: module manifest + graphics_token_value scope='module:<id>'.

Author mode  (role-gated — quản trị registry)
  sửa Component Contract L2 / Block Contract L3 / Archetype L4 / Theme preset
  → preview scene → a11y+performance gate → review → publish.
  Ghi: graphics_component_contract / graphics_block_contract / graphics_module_archetype / token_catalog scope='global'.
```

## 3. Inspector = drill-down theo cây Lego — chốt (KHÔNG tab ngang)

```
Module Studio = Library rail + Canvas/Preview + Inspector
Library rail:  Archetypes L4 · Lego Blocks L3 · Components L2
Inspector đổi theo lựa chọn:
  chọn module zone   → Assemble inspector
  chọn block         → L3 Block Contract inspector
  chọn component     → L2 Component Contract inspector
  chọn template      → L4 Archetype inspector
```
Preview BẮT BUỘC qua production renderer: `window.Blocks.render` / `BlockKit.render` / `ArchetypeKit.render`.

## 4. 6 lớp — một write-path mỗi lớp, DÙNG BẢNG ĐÃ CÓ (không đẻ bảng song song)

| Lớp | Bảng/authority (đã tồn tại) | Write-path duy nhất |
|---|---|---|
| L0 Token | `graphics_token_catalog` + `graphics_token_value` + `DesignTokenCatalogService` | Theme (scope=global) |
| L1 Primitive | (token: color/space/radius/typo/motion/density/control-h) | Theme |
| L2 Component Contract | `graphics_component_contract` (mig 148/213) — overridable_tokens, state, a11y, **không slot** | Module Studio · Author · L2 inspector |
| L3 Lego Block Contract | `graphics_block_contract` (mig 261) — composed_of, slots, variant_axes, required_tokens, a11y, preview_scene | Module Studio · Author · L3 inspector |
| L4 Module Archetype | `graphics_module_archetype` (mig 262, đã seed) — zones, required_blocks, forbidden_patterns, a11y | Module Studio · Author · L4 inspector |
| L5 Module Manifest / Build Packet | (mới: `module.build-packet.schema.json`) — chỉ tham chiếu archetype+block+slot+data+theme_preset_key | Module Studio · Assemble |

## 5. Luật tuyệt đối — chốt
```
Theme chỉnh theme. Component Contract chỉnh L2. Block Contract chỉnh L3.
Archetype chỉnh L4. Module Manifest chỉ assemble.
AI chỉ tạo Build Packet hoặc Block Request.
KHÔNG CSS/HTML thô. KHÔNG hex/px ngoài token. KHÔNG density ngoài Theme.
KHÔNG Custom CSS ở bất kỳ design surface nào.
KHÔNG một feature điều khiển bởi hai nơi.
```

## 6. Lộ trình — chốt (SSOT-first)

| Phase | Nội dung | Rủi ro |
|---|---|---|
| **P0 — SSOT foundation (TRƯỚC TIÊN)** | 1) Cắt fallback `HmTheme.getDeep` khỏi `GraphicsAuthority.tokens.read` (`00bb:141-149`). 2) HmTheme → read-adapter/CSS-var applier, hết authority. 3) Xoá default brand lệch `#1565c0` (`00b:1179`, `00d:275/284`) → chốt `#0c4a6e` mọi tầng. 4) Xoá Custom CSS khỏi config+UI+runtime (`00c:5170-5172`, `00b:705-706/857-870`). 5) Mở rộng CI no-hardcode ra module JSON / block registry / builder schema / runtime renderer. 6) Chặn hex/px/font literal ngoài token source. | Cao (live POSTGRES_ONLY) — verify Chrome từng token/scope/mode trước khi cắt fallback; smoke FPM DB env; PDO dùng `?` không phải `$N`; đăng ký bảng mới vào table-registry.json. |
| **P1 — Rename + IA lean** | "Master Module Template" → **Module Studio**; Appearance 9→3 (Theme · Module Studio · Governance); dọn code chết. | Thấp |
| **P2 — Module Studio shell** | Library rail + Canvas + Inspector; mode wall Assemble/Author; preview qua facade. | TB |
| **P3 — Registry editors** | L2/L3/L4 + Theme preset editor; dùng bảng đã có; không bảng song song. | TB |
| **P4 — Build Packet + gate (việc MỚI)** | `module.build-packet.schema.json` + `check_module_manifest.php` + CI graphics-safety. Reject: unknown/unpublished block_key, raw HTML, inline style, hex/px ngoài token, density ngoài Theme, theme value copy vào module, thiếu a11y contract, thiếu preview scene. Ngày đầu sẽ FAIL cây hiện tại → migrate/allowlist thu dần. | TB |
| **P5 — Shell/router rebuild (sprint RIÊNG)** | Supersede ADR-0004 + sửa CI guard + feature-flag inert + route `01-module-router.js:243-256` qua facade + E2E. KHÔNG gộp P0/P1. | Cao |

---
*Consensus 3 bên 2026-06-01. Build từ tài liệu này. Evidence file:line ở REBUTTAL-TO-GPT-PRO-2026-06-01.md §1.*
