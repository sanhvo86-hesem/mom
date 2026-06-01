# 🏗️ KẾ HOẠCH THỰC THI TỔNG THỂ — Module Studio Rearchitecture
### HESEM MOM · 2026-06-01 · execution bible (chỉ việc thực hiện, không cần định hướng lại)

> Founder đã DUYỆT thiết kế (wireframe v3/v4 + LOCKED-ARCHITECTURE-FINAL). Tài liệu này là **đường đi nước bước** để nâng cấp: kỹ lưỡng, chuyên nghiệp, không phát sinh lỗi; backend↔frontend nối logic; đồ hoạ đẹp-gọn-tinh; công nghệ mới nhất, load nhanh, code gọn, tùy biến cao. Mỗi bước: **nhánh độc lập → làm → audit → phản biện đa chiều → mô phỏng vận hành → fix code+đồ hoạ → deploy → verify Chrome trên VPS → ký duyệt → mới đi tiếp.** Làm đến đâu chắc đến đó.

Đọc cùng: `LOCKED-ARCHITECTURE-FINAL`, `OPERATIONS-PLAYBOOK`, `REBUTTAL-TO-GPT-PRO`, `MASTER-STRATEGY-2026-05-31` (nền công nghệ + citations).

---

## PHẦN I — CƠ CHẾ VẬN HÀNH (áp cho MỌI bước)

### 1.1 Guardrail toàn cục (bất biến)
- **Multi-AI branch safety:** mỗi bước = 1 nhánh `codex/<phase>-<slug>-<ngày>` từ `origin/main`; chạy `bash tools/ai/preflight.sh` trước; commit+push sớm; pre-push collision guard.
- **VPS deploy:** TUYỆT ĐỐI không `git reset --hard` trên VPS; deploy qua `deploy.yml` (capture/restore). Backup `data-private` + `config` trước bước có migration.
- **SSOT discipline:** không hex/px/font/motion literal ngoài token; một write-path mỗi scope; frozen vocabulary (14 domain · 18 root · 9 route class).
- **PG traps đã biết:** PDO dùng `?` không `$N`; bảng mới phải vào `table-registry.json`; deploy gate chain (phpstan/CHECK-ordering/schema-registry/KPI/migration-drift) chạy local trước push.

### 1.2 CỔNG CHUẨN MỖI BƯỚC (the gate — lặp lại y hệt cho từng step)
```
1. BRANCH      nhánh riêng từ origin/main + preflight
2. CONTRACT    chốt contract backend↔frontend TRƯỚC khi code:
               action_key → controller method → table/column → frontend caller → JSON shape
3. BUILD       backend → frontend → wiring; token-only; code gọn; lazy/load nhanh
4. SELF-AUDIT  checklist: SSOT · no-hardcode · token-only · a11y · perf budget · dark/light/HC parity · contract khớp
5. ADVERSARIAL REVIEW (đa chiều, nghiêm khắc) — 7 lăng kính (xem 1.3); mỗi finding phải verify (cố bác bỏ) trước khi fix; finding bất định cần ≥2 xác nhận độc lập
6. SIMULATE    mô phỏng vận hành thật trong Chrome: chạy đúng kịch bản ops-playbook liên quan (tạo/sửa/archive module, edit/clone theme, simulate-gate, conflict, rollback, binding-error) → phải PASS
7. FIX LOOP    fix code + fix đồ hoạ tới khi sạch (lặp 5–6)
8. DEPLOY      push → CI gates pass → deploy.yml
9. VERIFY      self-test Chrome trên VPS tới khi xong: computed-style probe (gap/radius/control/brand), console sạch, flow chạy hết, screenshot bằng chứng
10. SIGN-OFF   ghi báo cáo `_reports/lego-empire/exec/<step>.md` (đổi gì · contract · audit · finding+resolution · sim · evidence · deploy id) → MỚI đi bước sau
```

### 1.3 Bảy lăng kính phản biện (standing review panel)
1. **Correctness / regression** — đúng nghiệp vụ, không vỡ chỗ khác.
2. **SSOT-purity** — một write-path; zero hardcode; chỉ token; không feature 2 nơi.
3. **RBAC / security** — Assemble vs Author vs Release đúng quyền; không lộ.
4. **Performance / budget** — LCP≤2.5s · INP≤200ms · critical CSS≤14KB · first-load JS≤100KB gz · widget≤30KB gz.
5. **A11y / WCAG 2.2 AA** — APG pattern; contrast gate; reduced-motion; forced-colors.
6. **Graphics polish** — token compliance, canh lề, mật độ, dark/light/HC parity, VN diacritics vừa khung, zero banner giải thích.
7. **Backend↔frontend contract integrity** — action/column/JSON khớp 2 đầu; lỗi hiện rõ (không fail im lặng).

*(Cơ chế chạy review: `/code-review high` hoặc workflow adversarial fan-out theo 7 lăng kính; mỗi finding verify trước khi sửa.)*

---

## PHẦN II — NỀN CÔNG NGHỆ (công nghệ mới nhất; chốt 1 lần, dùng xuyên suốt)

> Cơ sở + citations ở `MASTER-STRATEGY-2026-05-31.md §4`. Đây là stack khoá cho upgrade.

| Quyết định | Công nghệ | Lợi ích |
|---|---|---|
| **Token** | DTCG 2025.10 JSON → **Style Dictionary (CI-only)** → generated `tokens.css`. 3 tier primitive→semantic→component, cột `references`, CI ép component→semantic→primitive (literal chỉ ở primitive) | "định nghĩa 1 lần", export chuẩn, tùy biến cao |
| **Màu** | **OKLCH** seed brand → palette tự sinh (`oklch(from…)` + `color-mix` + `light-dark()` + `contrast-color()`), `@supports` fallback | 1 seed rebrand cả app, contrast đảm bảo |
| **Cascade** | `@layer reset, tokens, components, modules, tenant, utilities` | hết `!important` war, tenant override sạch |
| **Component** | light-DOM template-literal qua `window.Blocks/BlockKit/ArchetypeKit` (1 render gate); KHÔNG Shadow DOM | theme global áp thẳng, SSR được, data-dense nhanh |
| **Responsive** | `@container` + logical properties (`margin-inline`…) | block tự co theo panel; VN/EN/RTL-ready |
| **Performance** | `content-visibility:auto` (≤500 dòng) · virtualization thủ công (>500) · native ESM + **import maps** + dynamic `import()` + `IntersectionObserver` lazy hydration · `requestIdleCallback` | code gọn, load nhanh; tách engine 827KB + builder 1.27MB |
| **A11y** | WCAG 2.2 AA + ARIA APG (combobox/grid/treegrid/dialog/menu/tabs) · reduced-motion · forced-colors | gate publish, không phải tab phụ |
| **Tùy biến** | SLDS-2 runtime token model: tenant đổi `--brand`+density; module lệch = override scope=module (Figma mode) | tùy biến cao nhất, không fork CSS |

---

## PHẦN III — BẢN ĐỒ CONTRACT BACKEND↔FRONTEND (nối logic)

| Năng lực | action_key | Controller/Service | Bảng | Frontend |
|---|---|---|---|---|
| Đọc token | `graphics_token_catalog_snapshot` | DesignTokenCatalogService | graphics_token_catalog/_value | GraphicsAuthority.snapshot → tokens.read (CHỈ snapshot, bỏ fallback HmTheme) |
| Ghi token global | `graphics_rollout_stage/apply/rollback` | GraphicsGovernanceController | graphics_token_value (scope=global) + rollout_scope | Theme surface |
| Override module | (mới) scope='module' | DesignTokenCatalogService | graphics_token_value (scope=module:<id>) | Module Studio · Assemble |
| Theme preset | `graphics_theme_preset_list/save/delete` + (mới) `_clone` | GraphicsGovernanceController | graphics_theme_preset (+base_ref) | Theme · Presets |
| L2 contract | (mới) `graphics_component_contract_save` | GraphicsGovernanceController | graphics_component_contract | Studio · Author · L2 |
| L3 block | (mới) `graphics_block_contract_save` | GraphicsGovernanceController | graphics_block_contract | Studio · Author · L3 |
| L4 archetype | (mới) `graphics_module_archetype_save` | GraphicsGovernanceController | graphics_module_archetype | Studio · Author · L4 |
| Module CRUD | `module_schema_save/get/list/delete` + (mới) `_archive/_restore/_versions` | ModuleSchemaController | mom/data/modules + (mới) versions + status | Studio · Assemble + Modules |
| Manifest gate | (CI) `check_module_manifest.php` | — | đọc registry | CI graphics-safety |
| Simulate | `graphics_simulation_run_record` + `graphics_qa_gate_run` | GraphicsGovernanceController | graphics_simulation_run + wcag_check | PreviewScenes |

---

## PHẦN IV — LỘ TRÌNH CHI TIẾT (P0 → P6; mỗi step = 1 nhánh + cổng chuẩn)

> Quy ước rủi ro deploy: **FE-only** = deploy nhanh ~1m30s (classify job); **BE/migration** = full validation ~4m. P0.2/P3.4/P3.6/P6 có migration → backup trước.

### ▣ P0 — SSOT FOUNDATION (TRƯỚC TIÊN; diệt hai-authority + no-hardcode)
*Mục tiêu: 1 token authority runtime, brand #0c4a6e mọi tầng, bỏ Custom CSS, CI ép no-hardcode. Đây là nền — sai là sập cả.*

- **P0.1 — Tech base tokens.css (FE-only).** Thêm pipeline DTCG→Style Dictionary (CI-only) sinh `tokens.css`; áp `@layer` ordering; OKLCH brand derivation + `@supports` fallback. Ship song song (không thay file cũ ngay). *Verify:* trang vẫn như cũ (parity), `tokens.css` generated khớp `orders-v3.css` root.
- **P0.2 — Cắt hai-authority (BE+FE, migration).** Backfill `graphics_token_value` scope=global mọi color_mode (migration idempotent additive, pattern mig 148:511-533). `GraphicsAuthority.tokens.read` chỉ resolve từ snapshot; **xoá fallback** `00bb:141-149`; `HmTheme.getDeep` → read-adapter delegate vào GA. *Verify (rủi ro cao):* probe TỪNG token/scope/mode trong Chrome trước+sau; brand không nhảy; smoke FPM DB env.
- **P0.3 — Chốt #0c4a6e (FE-only).** Xoá default `#1565c0` ở `00b:1179`, `00d:275/284`. *Verify:* mọi tầng (DB/JS/CSS) = #0c4a6e; chọn preset không nhảy màu.
- **P0.4 — Bỏ Custom CSS (FE + config migration).** Xoá textarea `00c:5170-5172` + read/apply `00b:705-706/857-870`; migration clear `advanced.customCSS` đã lưu (log cutover). *Verify:* không còn `<style id="hm-theme-custom-css">`; trang nguyên vẹn.
- **P0.5 — CI no-hardcode mở rộng (CI).** Mở `GOVERNED_GLOBS` ra renderer mới; thêm token-contrast lint. *Verify:* gate fail đúng khi cố thêm hex/px.

### ▣ P1 — RENAME + IA LEAN (FE-only, deploy nhanh)
- **P1.1 — Rename** "Master Module Template" → **Module Studio** (label/route nav nội bộ).
- **P1.2 — Appearance 9→3 tab:** gộp Governance+Advanced; gập Trợ-năng-validator + export DTCG vào Theme; xoá code chết (tokens/effects/overview ẩn).
- **P1.3 — Shell skeleton 3 bề mặt** (Theme · Module Studio · Governance) — inert sau feature-flag tới P2.
- **P1.4 — Dọn dead-code** (R6 dup ~1.260 dòng).
*Verify:* sidebar hiện "Module Studio"; Appearance 3 tab; không tính năng nào mất chỗ; console sạch.

### ▣ P2 — MODULE STUDIO SHELL (Assemble+Author+drill-down)
- **P2.1 — Lego Block Master 3 cột** (library rail L4/L3/L2 · canvas · inspector drill-down) theo wireframe v3/v4; token-only; lazy-load panel.
- **P2.2 — Mode wall + RBAC** (mới): permission `module.assemble` / `graphics.author` / `graphics.release`; Assemble = consumer, Author = role-gated.
- **P2.3 — Mọi preview qua `window.Blocks.render`** (preview = production). *(Router `01-module-router:243-256` bypass để P5/P6 vì là file freeze.)*
- **P2.4 — Module Master → registry-driven** (đọc graphics_component_contract / block / archetype registry thay hand-written JS).
*Verify:* drill-down đúng lớp; preview khớp runtime; RBAC chặn đúng; canh lề/mật độ chuẩn token.

### ▣ P3 — REGISTRY EDITORS + MODULE LIFECYCLE OPS
- **P3.1 — L2 Component Contract editor** → ghi `graphics_component_contract`.
- **P3.2 — L3 Block Contract editor** + version + deprecate + usage map (`graphics_module_binding`) → ghi `graphics_block_contract`.
- **P3.3 — L4 Archetype editor** (Template mode) → ghi `graphics_module_archetype`.
- **P3.4 — Theme Template editor** (migration): preset **clone** + `base_ref` inheritance; **module-scope override** (scope_type='module' + resolution user>role>env>tenant>module>org).
- **P3.5 — Theme scheduler** đang chạy (`graphics_theme_schedule` enforce day/night/andon).
- **P3.6 — Module Lifecycle Ops (BE+FE):** version history (snapshot) + soft-delete/tombstone/restore + concurrency guard (optimistic version lock) + binding-error UX + route registry atomic. *(ModuleSchemaController.)*
*Verify:* mỗi editor ghi đúng bảng; clone/override/schedule chạy; version/rollback/archive/conflict/binding-error đúng như wireframe v4.

### ▣ P4 — BUILD PACKET + GATES (ép SSOT bằng máy)
- **P4.1 — `module.build-packet.schema.json`** (manifest: archetype_key + theme_preset_key + zones[block_key,slots,data]; zero style).
- **P4.2 — `check_module_manifest.php`** (CI): reject block_key chưa published / hex-px / density override / thiếu a11y / thiếu preview / theme literal.
- **P4.3 — Migrate module hiện có** sang manifest (allowlist grandfather thu dần, kiểu 1951-literal).
- **P4.4 — AI Block Request flow** (AI = consumer: output Build Packet / Block Request; review queue).
*Verify:* gate fail đúng cây bẩn; module sạch pass; AI không bypass được.

### ▣ P5 — PERFORMANCE & SCALE
- **P5.1 — Code-split** engine + builder (ESM + import maps + lazy hydration).
- **P5.2 — Virtualize `data.grid`** + content-visibility + budget CI gate.
- **P5.3 — Gộp 3 render path** (chuẩn bị route runtime qua facade — phụ thuộc P6 freeze-lift).
*Verify:* budget pass; grid 2k+ dòng mượt; bundle giảm rõ.

### ▣ P6 — GLOBAL SHELL/SIDEBAR REBUILD (sprint RIÊNG, rủi ro cao — founder đã duyệt gỡ freeze)
- **P6.1 — Supersede ADR-0004** (ADR mới + cập nhật forbidden-diff CI guard).
- **P6.2 — Rebuild sidebar/shell** trên o3-shell token; feature-flag inert; E2E.
- **P6.3 — Route `01-module-router` qua facade** (preview=production toàn portal).
- **P6.4 — Bật flag** sau khi E2E xanh.
*Verify:* E2E 100%; sidebar thống nhất; multi-AI collision guard vẫn an toàn.

---

## PHẦN V — RỦI RO & ROLLBACK (mỗi phase đảo ngược được)

| Rủi ro | Phase | Giảm thiểu |
|---|---|---|
| Cắt fallback làm token trắng | P0.2 | Backfill+verify từng token/scope/mode trước khi xoá fallback; smoke FPM DB; rollback = revert nhánh |
| Brand nhảy màu | P0.3 | Probe computed-style trước/sau; chỉ FE, revert nhanh |
| Mất Custom CSS đã lưu | P0.4 | Grep config live, log cutover có chủ đích |
| Migration POSTGRES_ONLY | P0.2/P3.4/P3.6 | Idempotent additive; backup data-private; không destructive reseed; table-registry.json |
| Concurrency mất việc | P3.6 | Optimistic version lock + cảnh báo (thay last-write-wins) |
| Freeze-lift vỡ shell | P6 | Sprint riêng; feature-flag inert; E2E; không gộp P0-P5 |
| Gate fail cây hiện tại | P4 | Allowlist grandfather thu dần, không bật blocking ngay |

---

## PHẦN VI — BẰNG CHỨNG MỖI PHASE
Mỗi step ghi `_reports/lego-empire/exec/<step>.md`: đổi gì · contract 2 đầu · self-audit checklist · 7-lăng-kính finding + resolution · kết quả mô phỏng · ảnh/probe Chrome VPS · deploy id · ký duyệt. **Không có báo cáo = chưa xong = không đi tiếp.**

---

## PHẦN VII — THỨ TỰ KHỞI ĐỘNG
P0.1 → P0.2 → P0.3 → P0.4 → P0.5 → P1.1… (tuần tự, mỗi step qua trọn cổng chuẩn). **Bắt đầu: P0.1** (tech base tokens.css, FE-only, rủi ro thấp) để dựng nền + kiểm pipeline trước khi đụng P0.2 (cắt authority, rủi ro cao).

---
*Grounded: repo verify 2026-06-01 + 8-agent workflow + MASTER-STRATEGY tech foundation. Consensus 3 bên đã khoá. Đây là bản để thực thi — không định hướng lại.*
