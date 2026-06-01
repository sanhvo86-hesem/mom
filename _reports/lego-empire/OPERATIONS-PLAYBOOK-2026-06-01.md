# Playbook vận hành — Module & Theme lifecycle + tình huống phát sinh
### HESEM MOM · Module Studio · 2026-06-01 · grounded bằng xác minh repo

> Trả lời 2 câu founder hỏi: (1) sửa/thêm/xoá **module** thế nào, (2) sửa/thêm **theme** thế nào — theo kiến trúc đã khoá (`LOCKED-ARCHITECTURE-FINAL`). Kèm nghiên cứu sâu **15 tình huống vận hành** và cách xử lý. Mỗi mục ghi rõ **hôm nay có gì / phải thêm gì**.

---

## A. CHẨN ĐOÁN — tầng module hôm nay còn THÔ (phải vá trong P3/P4)

Xác minh repo cho thấy tầng theme đã trưởng thành (simulate-gate + rollout + rollback + prior_snapshot), nhưng **tầng module còn nguy hiểm khi vận hành thật:**

| Vấn đề hôm nay | Bằng chứng | Hậu quả vận hành |
|---|---|---|
| **Xoá = HARD delete** `@unlink` file, audit chỉ ghi moduleId không ghi nội dung | `ModuleSchemaController.php:147-167` | Không khôi phục được; route/nav treo → màn ❌ |
| **Last-write-wins, không lock** | `31-mb:6182-6227`, controller overwrite | 2 admin/AI sửa cùng module → **mất việc âm thầm** |
| **Không lịch sử version** (ghi đè hoàn toàn) | controller `_writeJsonFile` overwrite | Không rollback module được; version còn bị +2/lần (client+server) |
| **Binding hỏng = fail im lặng** (console.warn) | `01-module-router.js:400-447` | Operator thấy data rỗng/cũ, không biết lỗi |
| **Builder không có RBAC UI** (ai cũng tạo/sửa/xoá) | không có role check trong `31-mb` | Người không phận sự sửa module production |
| **Route = file tồn tại** (không có publish/unpublish) | file-driven | Xoá file → route treo, không atomic |

→ **Kết luận:** kiến trúc khoá phải thêm một workstream **"Module Lifecycle & Ops"** vào P3/P4: version history + soft-delete + concurrency guard + binding-error UX + builder RBAC + route registry. Dưới đây mô tả luồng **đích** (đã vá), và đánh dấu phần phải thêm.

---

## B. SỬA / THÊM / XOÁ MODULE — luồng đích (Assemble mode)

Mọi thao tác module ở **Module Studio · Assemble mode** (consumer thuần). Không đụng định nghĩa block (đó là Author).

### B1. THÊM module
```
Tạo module → chọn Archetype (L4) → chọn block PUBLISHED (L3) cho từng zone
→ fill slot → bind data (chọn API từ catalog) → chọn Theme preset (preset_key)
→ VALIDATE (gate) → PREVIEW (production renderer) → Submit (draft) → Governance Publish
```
- **Gate khi Submit** (P4 `check_module_manifest`): block_key phải published · không hex/px/HTML thô · không density override · slot đúng `data_contract` · có a11y · theme chỉ là `preset_key`.
- Kết quả: **manifest** (cây tham chiếu, không bytes style) `{archetype_key, theme_preset_key, zones:[{block_key, slots, data}]}`, version 1, route + nav theo `roles[]`.
- **Hôm nay:** lưu `module_schema_save` → `mom/data/modules/{id}.json` + localStorage. **Thêm:** bước Validate/Publish tách bạch + route registry atomic.

### B2. SỬA module
```
Mở module → Assemble sửa (đổi slot / binding / swap block / đổi preset)
→ tạo VERSION DRAFT mới (KHÔNG ghi đè bản live) → Simulate → Publish
→ bản cũ giữ lại để rollback
```
- **CẤM:** sửa định nghĩa block tại đây (vd đổi cấu trúc `kpi.grid`). Muốn vậy → Author mode (ảnh hưởng MỌI module dùng block đó).
- **Hôm nay:** ghi đè trực tiếp, version +2, không history. **Thêm (bắt buộc):** version history (`mom/data/modules/{id}/versions/{v}.json` hoặc bảng DB) + concurrency guard (xem §D8).

### B3. XOÁ module
```
Archive (soft-delete: status='archived') → gỡ khỏi nav NGAY nhưng giữ file + tombstone route
→ Impact check (ai link tới? route nào trỏ vào?) → grace 30 ngày → Purge (hard)
→ audit_events đầy đủ (ai, khi nào, snapshot cuối)
```
- **Tombstone route:** module bị archive → route trả "đã ngừng + link thay thế", không phải ❌ vỡ.
- **Hôm nay:** HARD `@unlink` ngay. **Thêm (bắt buộc):** `status` field + soft-delete + grace + tombstone + audit ghi snapshot cuối → khôi phục được trong grace.

### B4. Ai được làm gì (RBAC — phải thêm)
| Quyền | Làm được | Hôm nay |
|---|---|---|
| `module.assemble` | tạo/sửa/archive module (Assemble) | backend có `module_schema.write`; **UI builder chưa gate** |
| `graphics.author` | sửa định nghĩa L2/L3/L4 + theme preset (Author) | **chưa có** — phải thêm |
| `graphics.release` | publish/rollback/waiver (Governance) | rollout có; gate người **chưa có** |

---

## C. SỬA / THÊM THEME — luồng đích

### C1. SỬA token TOÀN CỤC (brand / density / radius / motion…)
```
Theme surface → đổi giá trị → SIMULATE (bắt buộc) → WCAG gate
→ rollout.stage → rollout.apply (scope='global')  → lan tới MỌI module
```
- **WCAG gate CHẶN publish** nếu contrast < AA (disable nút Commit) — đã có (`PreviewScenes` + `graphics_wcag_check`).
- **Rollback 1 click** qua `graphics_rollout_scope.prior_snapshot` — đã có.
- Module tự đổi theo vì **tham chiếu token**, không copy.
- **Hôm nay:** đường này đã chạy. **Thêm (P0):** cắt fallback HmTheme để chỉ còn 1 authority (nếu không, đổi global vẫn lệch như F5).

### C2. THÊM theme preset mới
```
Clone preset gần nhất → chỉnh brand (seed OKLCH) / density / radius / control-height / motion
→ đặt tên (preset_key) → SIMULATE → publish → chọn scope (org / role / tenant / device / schedule)
```
- Module trỏ `theme_preset_key` (tham chiếu). Sửa preset → mọi module dùng nó đổi theo.
- **Hôm nay:** `graphics_theme_preset_save` có; **THIẾU clone** (phải copy tay) + `base_ref` inheritance khai báo nhưng chưa chạy. **Thêm:** endpoint clone + inheritance resolution.

### C3. SỬA preset đang được dùng / muốn 1 module lệch riêng
- Sửa preset → **lan toàn bộ module trỏ nó** (đúng ý — kiểu Figma mode). Đây là tính năng, không phải bug.
- Muốn **1 module lệch riêng** → **module-scoped override** `scope='module:<id>'` (Assemble), KHÔNG sửa global.
- **Hôm nay:** scope chỉ có org/tenant/env/role/user — **THIẾU scope `module`**. **Thêm (bắt buộc):** scope_type='module' + constraint + resolution (user > role > env > tenant > **module** > org).

### C4. Theme theo ca (day/night andon — shop-floor)
- `graphics_theme_schedule` đã seed (day light / swing / night dark / maintenance amber) nhưng **chưa có scheduler chạy**. **Thêm:** scheduler server-side enforce theo `trigger_config`.

---

## D. 15 TÌNH HUỐNG VẬN HÀNH & CÁCH XỬ LÝ (nghiên cứu sâu)

### D1. Cần block CHƯA CÓ (người hoặc AI)
**Xử lý:** Block Request — Author mode tạo block: thêm token (migration kiểu mig 213) → thêm vào `graphics_component_contract.overridable_tokens` → đăng ký `graphics_block_contract` (composed_of/slots/variant/required_tokens/a11y/preview_scene) → **Simulate** ghi `graphics_simulation_run` → review → publish → quay lại Assemble chèn. **Gate chặn** dùng block chưa publish. AI đi đúng đường này, không tự đẻ HTML.

### D2. Block published có BUG
**Xử lý:** Author sửa → **version mới** của block → Simulate → republish. Module đang dùng: **pin version** (mặc định) + **opt-in upgrade** (admin chọn nâng) hoặc auto cho patch. Nếu nâng làm vỡ → rollback về version cũ. *(Thêm: version pin cho block_key trong manifest.)*

### D3. Deprecate block đang được N module dùng
**Xử lý:** xem **usage map** (`graphics_module_binding`) → đặt `status='deprecated'` + **alias/migration path** sang block thay thế → migrate từng module (review) → khi 0 module dùng → purge. **Không xoá đột ngột.** Gate cảnh báo nếu publish module mới dùng block deprecated.

### D4. Đổi theme làm TỤT CONTRAST / vỡ dark mode
**Xử lý:** WCAG gate **chặn publish** (disable Commit, đã có). Nếu thật sự cần lên → **waiver có audit + expiry** (không phải custom CSS). Lỡ lên rồi → `rollout.rollback` về `prior_snapshot`. Dark mode: token lưu theo `color_mode`, simulate cả 2 mode trước publish.

### D5. Tenant cần thứ catalog CHƯA CÓ
**Xử lý:** thêm token qua Authority + Simulate (chậm hơn nhưng đúng SSOT). **KHÔNG custom CSS** (đã bỏ hẳn). Đây là cái giá của SSOT tuyệt đối — chấp nhận, đổi lại không drift.

### D6. Xoá module đang là ROUTE SỐNG / có người đang dùng / có data
**Xử lý:** soft-delete + tombstone redirect + impact check (route/nav/link nào trỏ vào) + grace 30 ngày + audit snapshot. Khôi phục được trong grace. *(Thay HARD delete hiện tại.)*

### D7. API đổi schema / binding HỎNG lúc runtime
**Xử lý:** validate `data_contract` của slot khi Submit. Runtime: thay **silent fail** (console.warn) bằng **empty/error state rõ ràng** + cảnh báo + log. Module không "chết trắng" hay hiện data cũ gây hiểu nhầm. *(Phải vá `01-module-router.js:400-447`.)*

### D8. CONCURRENT edit (2 admin/AI sửa cùng module/preset)
**Xử lý:** **version-collision guard** (giống pre-push guard của repo): khi save, nếu `client.version != server.version` → từ chối + "ai đó vừa sửa lúc X, reload". Draft buffer per-user. *(Thay last-write-wins hiện tại — đây là rủi ro mất việc lớn nhất.)* Token đã có `version` column cho optimistic lock; module thì **chưa**.

### D9. Rollback một RELEASE xấu đã lên production
**Xử lý:** Governance → `rollout.rollback(rolloutId, reason)` → khôi phục `prior_snapshot` (đã có cho theme). Module: cần version history (D2/B2) để rollback tương tự. Audit giữ nguyên (không xoá row rollout).

### D10. DRIFT version giữa môi trường / tenant
**Xử lý:** scope + version rõ ràng; **export/import DTCG** để đồng bộ token giữa dev/tenant; rollout theo `scope_mode` (canary-module / canary-domain / environment-stage / global). Đã có `graphics_rollout_scope`.

### D11. AI tạo HÀNG LOẠT module
**Xử lý:** registry gatekeeper + CI gate (`check_module_manifest`) chặn block lạ/literal + **review queue** ở Governance. AI output = Build Packet/Block Request, không production trực tiếp. Càng nhiều AI càng cần gate — đây là điểm sống còn.

### D12. Migrate 196 block ENGINE legacy
**Xử lý:** strangler — `window.Blocks` facade alias type cũ → L3 published; flip dần từng block faithful (`l3Enabled` + adapter); deprecate alias khi xong. Không big-bang. Mỗi sprint 5-8 block giá trị cao (data.grid, kpi.grid, tree.traceability…).

### D13. PERFORMANCE — grid lớn / module nặng
**Xử lý:** virtualization khi >500 dòng; `content-visibility:auto` cho vùng dài; budget gate CI (LCP≤2.5s, INP≤200ms); lazy-hydrate block; code-split engine 827KB + builder 1.27MB.

### D14. HỎNG DỮ LIỆU / KHÔI PHỤC
**Xử lý:** version history module (thêm) + `audit_events` + `prior_snapshot` theme. **KHÔNG `git reset --hard` trên VPS** (policy đã có — runtime data live). Backup trước thao tác rủi ro. Deploy qua `deploy.sh` capture/restore.

### D15. SAI LỚP khi sửa (sửa nhầm global thay vì module, nhầm block thay vì instance)
**Xử lý:** inspector drill-down hiện **breadcrumb lớp** rõ ràng (Assemble/L2/L3/L4) — affordance duy nhất "đáng" chiếm chỗ vì nó chỉ **vị trí**, không phải lời giải thích. Write-path theo scope chặn ghi nhầm tầng.

---

## E. NGUYÊN TẮC XỬ LÝ XUYÊN SUỐT (rút gọn)

```
1. Version mọi thứ (module + block + preset + token rollout) — không ghi đè mù.
2. Simulate trước publish — bằng chứng graphics_simulation_run, WCAG gate chặn.
3. Soft-delete + grace + tombstone — không xoá cứng, khôi phục được.
4. Usage-map trước deprecate — không rút block/preset khi còn người dùng.
5. Scope cho khác biệt — module lệch thì override scope=module, không sửa global.
6. Rollback luôn sẵn — prior_snapshot + version history.
7. Concurrency guard — version check, cảnh báo, không mất việc âm thầm.
8. Audit mọi mutation — ai, khi nào, từ gì sang gì.
9. Gate ở CI — block lạ / literal / thiếu a11y → fail build, không tới production.
10. Lỗi phải THẤY — binding hỏng = error state rõ, không fail im lặng.
```

---

## F. BỔ SUNG VÀO ROADMAP ĐÃ KHOÁ

Các tình huống trên thêm việc cụ thể vào lộ trình (không đổi thứ tự P0-first):
- **P3 (editors):** + module-scoped override (scope='module'), + preset clone + inheritance, + active theme scheduler.
- **P4 (gate):** + `check_module_manifest`, + binding `data_contract` validation, + deprecated-block warning.
- **P-Ops (mới, gộp vào P3/P4):** module **version history** + **soft-delete/tombstone** + **concurrency guard** + **builder RBAC** + **binding-error UX** + route registry atomic.

---
*Grounded bằng xác minh repo 2026-06-01. Phần "hôm nay có" lấy từ ModuleSchemaController.php / 01-module-router.js / graphics_* migrations; phần "phải thêm" là gap thật cần vá để vận hành xưởng an toàn.*
