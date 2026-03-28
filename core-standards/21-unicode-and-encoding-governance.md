# 21 — Chuẩn Unicode và Quản trị Encoding (Chống biến dạng tiếng Việt)

> Mục tiêu: xử lý lỗi tiếng Việt từ gốc, không chắp vá từng tài liệu.
> Chuẩn này là bắt buộc cho mọi tài liệu QMS, portal UI, script sinh tài liệu và pipeline phát hành.

---

## A. Chuẩn gốc bắt buộc

1. Tất cả file text phải lưu `UTF-8` **không BOM**.
2. Nội dung tiếng Việt phải chuẩn hóa Unicode dạng `NFC` trước khi commit/publish.
3. Nghiêm cấm lưu/đọc qua luồng `latin1/cp1252` cho nội dung tiếng Việt.
4. Nghiêm cấm cơ chế “tự sửa hiển thị runtime” (decode vá lỗi ngay trên DOM) như một giải pháp lâu dài.
5. Nếu phát hiện mojibake trong file nguồn, coi là lỗi dữ liệu nguồn, không coi là lỗi trình duyệt.

---

## B. Cấm chắp vá (Patchwork Ban)

Các kiểu sau bị cấm đưa vào baseline:

- Hàm decode vá lỗi trực tiếp trên UI (`fixMojibake*`, `decodeLatin1*`, tương đương).
- Script sửa chuỗi lẻ tẻ theo danh sách thủ công nhưng không có gate tổng thể.
- Sửa từng tài liệu đơn lẻ mà không có audit cụm và tiêu chí kiểm chứng sau sửa.
- Phụ thuộc vào terminal encoding để kết luận “file đã đúng”.

---

## C. Quy tắc kỹ thuật xuyên suốt pipeline

1. **Tạo tài liệu mới:** template nguồn phải là UTF-8 chuẩn; cấm literal đã mojibake trong generator.
2. **Sửa tài liệu hiện có:** chỉ dùng batch theo cụm, có dry-run + report + smoke test.
3. **Stream/serve tài liệu:** response phải giữ `charset=utf-8` cho file text/html/css/csv/json.
4. **Kiểm tra trước phát hành:** phải chạy audit Unicode toàn repo; không đạt thì dừng publish.
5. **Theo dõi hồi quy:** mọi file mới/chỉnh sửa phải qua gate không có marker mojibake.

---

## D. Gating bắt buộc trước merge/publish

Chạy:

```bash
node tools/scripts/encoding/unicode-governance-audit.mjs
```

Điều kiện đạt:

- `files_with_residue = 0` cho phạm vi release.
- Không có file chứa replacement character `U+FFFD` hoặc ký tự control C1 (`U+0080..U+009F`).
- Không có chuỗi marker mojibake theo danh sách chuẩn trong script audit Unicode.

Nếu không đạt: bắt buộc xử lý theo cụm (không sửa lẻ).

---

## E. Quy trình khắc phục theo cụm (chuẩn nhanh + an toàn)

1. Ưu tiên cụm `generator/runtime` để chặn phát sinh mới.
2. Chuẩn hóa cụm `core-standards` để khóa luật và ngăn hồi quy.
3. Sửa cụm tài liệu vận hành theo batch có báo cáo dòng lỗi.
4. Chạy smoke test render sau mỗi cụm, rồi mới sang cụm kế tiếp.
5. Chỉ gỡ toàn bộ patch runtime sau khi dữ liệu nguồn đã sạch.

---

## F. Trách nhiệm

- **Owner kỹ thuật:** IT System Governance.
- **Owner nội dung:** QMS Manager.
- **Bắt buộc đồng phê duyệt** khi thay đổi script xử lý encoding hoặc generator nội dung.

---

## G. Tiêu chí hoàn tất “sạch từ gốc”

Được xem là hoàn tất khi đồng thời thỏa:

1. Không còn residue mojibake trong file nguồn thuộc phạm vi vận hành.
2. Không còn cơ chế runtime patch để “đắp” lỗi dữ liệu nguồn.
3. Gate Unicode hoạt động ổn định và chặn hồi quy ở mọi đợt cập nhật.
