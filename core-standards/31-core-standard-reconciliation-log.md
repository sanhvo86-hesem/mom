# 31 — Core Standard Reconciliation Log

> Mục tiêu: đối chiếu `core-standards/` với tài liệu nền cũ, portal/runtime, config registry và một số tài liệu phát hành để khóa phần đã rõ, đồng thời tách riêng các điểm mâu thuẫn hoặc chưa rõ cần chủ sở hữu hệ thống quyết định.

---

## A. Nguồn đã đối chiếu

- `core-standards/01-immutable-rules.md`
- `core-standards/03-language-and-translation.md`
- `core-standards/05-html-templates.md`
- `core-standards/09-versioning-and-workflow.md`
- `core-standards/11-html-structure-guide.md`
- `core-standards/23-portal-standard-title-filename-ssot.md`
- `general_note.md`
- `01-QMS-Portal/scripts/portal/02-state-auth-ui.js`
- `01-QMS-Portal/qms-data/config/docs_custom.json`
- `01-QMS-Portal/qms-data/config/form_control_registry.json`
- `01-QMS-Portal/qms-data/config/form_release_workflow.json`
- `03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-902-management-review.html`
- `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html`
- `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html`
- `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/*.html`

---

## B. Phần đã hòa giải và khóa lại

1. **Rename governance**
   `01-immutable-rules.md` và `23-portal-standard-title-filename-ssot.md` được hòa giải theo hướng: cấm rename thủ công ngoài luồng; rename chuẩn chỉ được phép qua flow kiểm soát của portal để đồng bộ filename + SSOT title + header + link update.

2. **Header examples**
   `03-language-and-translation.md` đã được chỉnh để ví dụ header dùng `{{OWNER_ROLE_HTML}}` / `{{APPROVER_ROLE_HTML}}`, khớp với `05-html-templates.md`, `11-html-structure-guide.md` và published docs hiện hành.

3. **Tooling paths**
   Chuẩn đường dẫn cho translation engine và dictionary được khóa về:
   - `tools/engines/context_translate_engine.py`
   - `tools/data/qms-terminology-dictionary.xlsx`
   - `tools/data/remaining-english-words.xlsx`

4. **WI base template**
   `templates/wi-template.html` đã được kéo lên cùng chuẩn header với các template còn lại: nhãn metadata tiếng Việt, `HESEM ENGINEERING`, owner/approver theo actor HTML chips.

5. **README authority order**
   `README.md` đã ghi rõ thứ bậc áp dụng để tránh việc `general_note.md` hoặc implementation drift ghi đè chuẩn nền.

---

## C. Mâu thuẫn cần quyết định

### D-01. Canonical name của nhóm owner SharePoint

**Nguồn đang lệch**
- `01-immutable-rules.md` và `03-language-and-translation.md` dùng `QMS-Owner`
- `annex-136-...html` dùng `QMS-Owners`
- `tools/scripts/role-system/normalize_job_order_role_system.py` có cụm `QMS-Owners / QMS-IT-Administrators`

**Các lựa chọn**
1. Chốt `QMS-Owner` là canonical.
2. Chốt `QMS-Owners` là canonical.
3. Tách nghĩa: `QMS-Owners` là group thật trên tenant; `QMS-Owner` chỉ là legacy label/display alias và phải loại bỏ dần.

**Tác động**
- Ảnh hưởng tất cả chuẩn M365/SharePoint, script provision, annex kiến trúc và tài liệu hướng dẫn thao tác.
- Không nên bulk rename trong chuẩn hoặc script cho tới khi xác nhận đúng tên group trên tenant.

### D-02. Revision model cho lần phát hành đầu tiên

**Nguồn đang lệch**
- `09-versioning-and-workflow.md` dùng mô hình `V0 (Draft)` và `V0 (Published)`
- `general_note.md` cũng đang mô tả `V0` cho bản nháp lẫn phát hành lần đầu
- `03-language-and-translation.md` trước khi hòa giải từng mô tả `V1, V2, V3...` là released versions
- `01-QMS-Portal/qms-data/config/form_control_registry.json` và `form_release_workflow.json` đang nghiêng về mô hình `V0`-first

**Các lựa chọn**
1. Giữ `V0` là revision phát hành đầu tiên.
2. Chuyển sang `V1.0` cho phát hành đầu tiên; `V0` chỉ còn là draft.

**Tác động**
- Lựa chọn 1 ít đụng hệ thống hiện tại hơn.
- Lựa chọn 2 gần thông lệ document control phổ biến hơn, nhưng cần migration plan cho portal, register, form naming và training material.

### D-03. Canonical format của owner metadata trong registry/config

**Nguồn đang lệch**
- `01`, `07`, `19`, `23` cấm placeholder mơ hồ và yêu cầu owner/approver theo role code, department code hoặc bundle đã công bố
- `01-QMS-Portal/qms-data/config/docs_custom.json` và `form_control_registry.json` vẫn còn giá trị kiểu `Top Management / QA/QMS`, `HR Manager / Department Heads / Training owners`

**Các lựa chọn**
1. Cho phép registry giữ free-text owner string; chỉ published HTML mới render chip/link khi có thể.
2. Chuẩn hóa registry sang actor canonical (`role code`, `department code`, approved bundle) và loại dần placeholder.

**Tác động**
- Lựa chọn 1 ít phải migrate dữ liệu hơn nhưng tiếp tục duy trì ambiguity trong source data.
- Lựa chọn 2 sạch và nhất quán với core standard hơn, nhưng cần cleanup registry và mapping logic.

### D-04. Nhãn metadata ở Department Handbook

**Nguồn đang lệch**
- `01-immutable-rules.md` khóa nhãn metadata header theo tiếng Việt (`Mã`, `Phiên bản`, `Ngày hiệu lực`, `Chủ sở hữu`, `Phê duyệt`)
- `templates/department-handbook-template.html` và published handbooks đang dùng English labels (`Code`, `Version`, `Effective Date`, `Owner`, `Approved by`)

**Các lựa chọn**
1. Giữ Department Handbook là ngoại lệ dùng English labels.
2. Chuẩn hóa Department Handbook về cùng bộ nhãn tiếng Việt như SOP/WI/JD/ANNEX.

**Tác động**
- Lựa chọn 1 cần ghi rõ ngoại lệ trong chuẩn.
- Lựa chọn 2 cần update template + toàn bộ handbook đã phát hành.

---

## D. Điểm chưa rõ cần xác nhận

### U-01. Owner input ở quick-create portal

`01-QMS-Portal/scripts/portal/02-state-auth-ui.js` hiện thu owner qua một `<select>` plain value. Chưa đủ bằng chứng để kết luận đây chỉ là input tạm ở bước tạo nháp hay là source-of-truth chính cho header actor rows sau khi publish.

### U-02. Vai trò của `general_note.md` về sau

Hiện file này đã được giữ ở trạng thái tương thích ngược, nhưng vẫn chứa một số nội dung cũ không còn khớp với core standards mới. Cần xác nhận sẽ:
1. giữ như quick summary legacy, hoặc
2. rewrite hoàn toàn để mirror `core-standards/`.

---

## E. Nợ chuẩn hóa còn lại trong chính `core-standards/`

Các file sau vẫn còn một lượng đáng kể tiếng Việt không dấu / half-English trong thân tài liệu, dù logic chuẩn của chúng nhìn chung đã rõ:

- `19-role-boundary-jd-linking-and-role-codes.md`
- `20-department-boundary-handbook-codes.md`
- `22-jd-header-and-department-code-governance.md`
- `26-wi-archetypes-and-qa-guide.md`
- `27-annex-archetypes-and-qa-guide.md`
- `28-pou-visual-and-machine-side-rules.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`

Đây là **debt biên tập/ngôn ngữ**, không phải quyết định governance mới. Khi làm vòng polish tiếp theo trong `core-standards/`, nên ưu tiên normalize các file này về:

1. tiếng Việt có dấu đầy đủ;
2. tiêu đề/heading nhất quán;
3. thuật ngữ đã khóa ở `01`, `03`, `19`, `20`, `23`, `25`.

---

## F. Quy tắc tạm thời trước khi có quyết định

1. Nếu có xung đột, áp dụng thứ bậc trong `README.md`.
2. Không tự đổi canonical name của security group SharePoint cho tới khi xác nhận tenant.
3. Tài liệu phát hành mới tiếp tục dùng actor chips/link cho owner/approver ở mọi loại tài liệu đã có chuẩn rõ.
4. Với Department Handbook, giữ nguyên implementation hiện tại cho đến khi chốt D-04.
5. Với revision model, không thay đổi runtime/config đang chạy cho đến khi chốt D-02.
