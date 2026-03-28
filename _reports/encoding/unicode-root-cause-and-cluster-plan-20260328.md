# Báo Cáo Nguyên Nhân Gốc Rễ Và Kế Hoạch Khắc Phục Theo Cụm (2026-03-28)

## 1) Kết luận gốc rễ

Lỗi tiếng Việt biến dạng hiện tại là lỗi **dữ liệu nguồn** (source-level mojibake), không phải lỗi hiển thị thuần của trình duyệt.

Các tín hiệu chính:

1. Hai tài liệu vận hành chứa residue encoding rất nặng ngay trong file nguồn:
- `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html`
- `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html`

2. Portal đang có lớp “vá runtime” (decode latin1/cp1252 trên DOM/string) thay vì khóa lỗi ở nguồn:
- `01-QMS-Portal/scripts/portal/01-data-config.js:1967`
- `01-QMS-Portal/scripts/portal/01-data-config.js:2006`
- `01-QMS-Portal/scripts/portal/01-data-config.js:2018`
- `01-QMS-Portal/scripts/portal/02-state-auth-ui.js:634`
- `01-QMS-Portal/scripts/portal/99-bootstrap.js:6`

3. Generator tạo tài liệu mới trong API đang chứa literal tiếng Việt đã biến dạng trong template HTML:
- `01-QMS-Portal/api.php:3160` (khối `$docHtml`)

4. Chưa có gate bắt buộc UTF-8/NFC trước merge/publish nên lỗi có thể tái phát.

---

## 2) Kết quả rà soát toàn bộ (inventory)

Audit chuẩn hóa đã chạy bằng:

```bash
node tools/scripts/encoding/unicode-governance-audit.mjs
```

Kết quả snapshot:

- `files_scanned = 570`
- `files_with_residue = 9`
- `line_patch_points = 269`
- `markers_total = 2407`

Artifact đầy đủ:

- File-level inventory: `_reports/encoding/unicode-audit-20260328-files.csv`
- Line-level patch points (toàn bộ điểm chắp vá): `_reports/encoding/unicode-audit-20260328-lines.csv`
- Summary: `_reports/encoding/unicode-audit-20260328-summary.md`

Danh sách file còn residue:

1. `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html` (1585 markers, 187 lines)
2. `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html` (809 markers, 78 lines)
3. `11-Glossary/dict-data.json` (4 markers, 2 lines)
4. `general_note.md` (4 markers, 2 lines)
5. `01-QMS-Portal/docs/editor-modernization-tiptap-roadmap.md` (BOM)
6. `01-QMS-Portal/docs/editor-wordlike-test-checklist.md` (BOM)
7. `01-QMS-Portal/docs/excel-form-version-control-architecture.md` (BOM)
8. `01-QMS-Portal/docs/form-server-delivery-rollout-baseline.md` (BOM)
9. `01-QMS-Portal/docs/portal-document-display-convention.md` (BOM)

---

## 3) Cụm chắp vá và phương án khắc phục nhanh-an toàn

### Cụm A — Stop-the-bleed (Generator + Runtime Patch)

Phạm vi:

- `01-QMS-Portal/api.php` (template `$docHtml`)
- `01-QMS-Portal/scripts/portal/01-data-config.js`
- `01-QMS-Portal/scripts/portal/02-state-auth-ui.js`
- `01-QMS-Portal/scripts/portal/99-bootstrap.js`

Phương án:

1. Canonicalize literal tiếng Việt trong generator về UTF-8 chuẩn.
2. Đặt cờ chuyển đổi để tắt dần `fixMojibake*` runtime sau khi dữ liệu nguồn sạch.
3. Cấm thêm mới logic decode latin1/cp1252 ở tầng UI.

Lợi ích:

- Chặn phát sinh lỗi mới ngay tại điểm sinh tài liệu.
- Loại bỏ phụ thuộc vào “vá hiển thị”.

### Cụm B — Core Standard + Gate

Phạm vi:

- `core-standards/21-unicode-and-encoding-governance.md`
- `tools/scripts/encoding/unicode-governance-audit.mjs`

Phương án:

1. Áp chuẩn bắt buộc UTF-8 no BOM + NFC.
2. Chạy audit trước merge/publish.
3. Fail release nếu còn residue.

Lợi ích:

- Khóa quy trình từ gốc, ngăn hồi quy.

### Cụm C — Batch Repair Tài Liệu Bị Hỏng

Phạm vi:

- WI-102 + ANNEX-135 + các điểm residue nhỏ (dict/general_note/BOM docs)

Phương án:

1. Sửa theo batch có report line-level (không sửa tay từng đoạn).
2. Sau mỗi batch chạy smoke test render tài liệu.
3. Kiểm tra liên kết nội bộ và soát diff nội dung nghiệp vụ.

Lợi ích:

- Nhanh hơn sửa lẻ.
- Giảm rủi ro phát sinh lỗi logic nội dung.

---

## 4) Thứ tự triển khai đề xuất

1. Cụm A (chặn phát sinh mới).
2. Cụm C (làm sạch tồn đọng theo batch).
3. Tắt hoàn toàn patch runtime sau khi audit đạt ngưỡng sạch.
4. Duy trì Cụm B như gate bắt buộc cho mọi vòng cập nhật.

---

## 5) Tiêu chí hoàn tất

Hoàn tất khi đồng thời đạt:

1. `files_with_residue = 0` trong phạm vi release.
2. Không còn `fixMojibake*` hoạt động trong runtime production.
3. Tài liệu mới tạo từ API không còn phát sinh chuỗi biến dạng.
4. Gate Unicode chạy ổn định trước merge/publish.

