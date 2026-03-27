# 09 — Kiểm soát phiên bản và quy trình phê duyệt

> Phiên bản: V0 | Hiệu lực: 2025-06-01 | Chủ sở hữu: QMS Engineer

---

## 1. Hệ thống đánh số phiên bản

### 1.1 Các cấp phiên bản

| Phiên bản | Trạng thái | Ý nghĩa | Ví dụ |
|-----------|-----------|---------|-------|
| V0 (Draft) | Bản nháp | Đang soạn thảo, chưa phê duyệt. Chỉ lưu hành nội bộ nhóm soạn thảo. | V0 |
| V0 (Published) | Phát hành lần đầu | Phê duyệt lần đầu và phát hành chính thức. Đây là phiên bản đầu tiên có hiệu lực. | V0 published |
| V1.x | Cập nhật nhỏ | Sửa lỗi chính tả, định dạng, bổ sung nhỏ KHÔNG thay đổi logic quy trình. | V1.1, V1.2, V1.3 |
| V2.0 | Cập nhật lớn | Thay đổi quy trình, thêm/bớt gate, thay đổi vai trò, thay đổi logic. | V2.0 |
| V3.0, V4.0... | Cập nhật lớn tiếp theo | Mọi thay đổi lớn tăng số chính 1 đơn vị. | V3.0, V4.0 |

### 1.2 Quy tắc đánh số

- **Số chính** (major): Tăng khi thay đổi quy trình, gate, vai trò, logic nghiệp vụ.
- **Số phụ** (minor): Tăng khi sửa lỗi nhỏ, cập nhật định dạng, bổ sung thông tin không ảnh hưởng vận hành.
- Mọi lần tăng số chính, số phụ về 0. Ví dụ: V1.3 -> V2.0.
- KHÔNG dùng số âm, số thập phân nhiều cấp (V1.2.3), hoặc chữ cái (V1a).

### 1.2A Quy tắc bắt buộc cho tài liệu chưa phát hành lần đầu

- Khi tài liệu vẫn đang trong pha soạn thảo / chuẩn hóa nội bộ và chưa có quyết định phát hành lần đầu, header phiên bản luôn giữ `V0`.
- Không được tự tăng lên `V1`, `V1.x`, `V2` chỉ vì đã sửa nhiều vòng draft.
- Không đưa note kiểu `mới so với bản trước`, `bổ sung theo vòng review`, `khác bản cũ` vào thân SOP/WI/ANNEX khi tài liệu vẫn là bản nháp.
- Nếu cần theo dõi tiến trình soạn thảo, ghi trong DCR, working note, review log hoặc commit log; không ghi trong body tài liệu vận hành.

### 1.3 Phân biệt cập nhật nhỏ và lớn

| Cập nhật nhỏ (Minor — V1.x) | Cập nhật lớn (Major — V2.0+) |
|-----------------------------|-------------------------------|
| Sửa lỗi chính tả, ngữ pháp | Thay đổi quy trình tổng thể |
| Cập nhật định dạng, CSS | Thêm hoặc bớt gate/checkpoint |
| Bổ sung ghi chú, làm rõ nội dung | Thay đổi vai trò chịu trách nhiệm |
| Cập nhật liên kết tài liệu | Thay đổi điều kiện PASS/FAIL |
| Sửa mã biểu mẫu tham chiếu | Thay đổi hệ thống lưu trữ (Epicor, M365) |
| Thêm ví dụ minh họa | Thay đổi KPI mục tiêu |
| Cập nhật thông tin liên hệ | Thay đổi phạm vi áp dụng |

---

## 2. Quy trình phê duyệt tài liệu

### 2.1 Luồng công việc chính

```
Draft -> Submit -> Cross-Review -> Approve/Reject -> Publish
  |                    |               |
  v                    v               v
Soạn thảo        Rà soát chéo    Phê duyệt/Từ chối
(Document        (Peer           (QA Manager hoặc
 Owner)          Reviewer)        cấp trên)
```

### 2.2 Chi tiết từng bước

#### Bước 1: Draft (Soạn thảo)

| Hạng mục | Chi tiết |
|----------|---------|
| Người thực hiện | Document Owner |
| Hành động | Soạn nội dung tài liệu theo cấu trúc chuẩn (xem 08-document-types.md) |
| Hồ sơ | File nháp lưu tại thư mục Draft trên SharePoint |
| Thoát | Gửi DCR (Document Change Request) khi hoàn thành nháp |

#### Bước 2: Submit (Gửi yêu cầu)

| Hạng mục | Chi tiết |
|----------|---------|
| Người thực hiện | Document Owner |
| Hành động | Điền FRM-102 Document Change Request |
| Nội dung DCR | Lý do thay đổi, phạm vi ảnh hưởng, tài liệu liên quan |
| Thoát | Chuyển DCR cho QMS Engineer |

#### Bước 3: Cross-Review (Rà soát chéo)

| Hạng mục | Chi tiết |
|----------|---------|
| Người thực hiện | Peer Reviewer (do Document Owner hoặc QMS Engineer chỉ định) |
| Yêu cầu | Người rà soát KHÔNG phải là người soạn thảo |
| Hành động | Đọc toàn bộ tài liệu, kiểm tra nội dung, cross-reference, format |
| Thời hạn | Tối đa 3 ngày làm việc từ khi nhận |
| Hồ sơ | Ghi kết quả vào FRM-105 Peer Review Log |
| Kết quả | PASS: chuyển phê duyệt. FAIL: trả về Document Owner sua. |

#### Bước 4: Approve/Reject (Phê duyệt / Từ chối)

| Hạng mục | Chi tiết |
|----------|---------|
| Người thực hiện | QA Manager (cho SOP, WI, ANNEX). CEO (cho Quality Manual). |
| Hành động | Xem xét tài liệu + kết quả cross-review |
| Quyết định | APPROVED: chuyển Publish. REJECTED: trả về với lý do. CONDITIONAL: phê duyệt kèm điều kiện. |
| Hồ sơ | Chữ ký trên DCR (FRM-102) |

#### Bước 5: Publish (Phát hành)

| Hạng mục | Chi tiết |
|----------|---------|
| Người thực hiện | QMS Engineer |
| Hành động | Chuyển tài liệu sang định dạng phát hành (HTML trên QMS site) |
| Kiểm tra | Liên kết hoạt động, format đúng, phiên bản đúng |
| Cập nhật | FRM-101 Master Document Register |
| Thông báo | Gửi thông báo đến các bộ phận liên quan |
| Hủy bỏ bản cũ | Đánh dấu phiên bản cũ là "Superseded" trên SharePoint |

### 2.3 Trường hợp đặc biệt

| Tình huống | Xử lý |
|-----------|-------|
| Tài liệu khẩn cấp (an toàn, pháp luật) | CEO có thể phê duyệt trực tiếp, bỏ qua cross-review. Ghi lý do vào DCR. Thực hiện cross-review bổ sung trong vòng 5 ngày. |
| Người rà soát vắng mặt quá 3 ngày | Document Owner đề xuất người thay thế. QMS Engineer chấp thuận. |
| Phê duyệt có điều kiện (CONDITIONAL) | Document Owner sửa theo điều kiện trong vòng 2 ngày. QMS Engineer xác nhận đã sửa. Không cần phê duyệt lại. |
| Từ chối (REJECTED) | Document Owner sửa theo góp ý. Bắt đầu lại từ bước Cross-Review. |

---

## 3. DCR — Document Change Request

### 3.1 Khi nào cần DCR

| Tình huống | Cần DCR |
|-----------|---------|
| Tạo tài liệu mới | CÓ |
| Cập nhật lớn (Major) | CÓ |
| Cập nhật nhỏ (Minor) | CÓ (đơn giản hóa: chỉ cần 1 dòng mô tả thay đổi) |
| Sửa lỗi chính tả (< 5 chỗ) | KHÔNG (QMS Engineer tự sửa và ghi log) |

### 3.2 Nội dung DCR (FRM-102)

| Field | Mô tả |
|-------|-------|
| Mã tài liệu | Mã tài liệu cần thay đổi |
| Phiên bản hiện tại | Phiên bản đang có hiệu lực |
| Phiên bản đề xuất | Phiên bản mới sau thay đổi |
| Lý do thay đổi | Tại sao cần thay đổi (cụ thể, không mơ hồ) |
| Phạm vi ảnh hưởng | Những tài liệu/quy trình nào bị ảnh hưởng |
| Hành động cần thiết | Những việc cần làm để triển khai thay đổi |
| Người đề xuất | Tên + vai trò |
| Ngày đề xuất | Ngày gửi DCR |
| Người phê duyệt | QA Manager hoặc CEO |
| Kết quả | APPROVED / REJECTED / CONDITIONAL |

---

## 4. Yêu cầu rà soát chéo (Cross-Review)

### 4.1 Ai rà soát cho ai

| Loại tài liệu | Người soạn | Người rà soát |
|--------------|-----------|--------------|
| SOP | Process Owner | QMS Engineer + 1 người từ phòng ban liên quan |
| WI | Team Lead / Engineer | 1 người cùng phòng ban + QMS Engineer |
| ANNEX | Chuyên gia lĩnh vực | QMS Engineer |
| JD | HR Manager + Line Manager | QMS Engineer |
| Form (Excel) | Process Owner | QMS Engineer (kiểm tra format + logic) |

### 4.2 Tiêu chí rà soát

| # | Tiêu chí | Kiểm tra |
|---|---------|---------|
| 1 | Nội dung chính xác về mặt kỹ thuật | Có phản ánh đúng thực tế vận hành không? |
| 2 | Cấu trúc đúng chuẩn | Dùng 10 section (SOP), 7 section (WI)...? |
| 3 | Từ ngữ nhất quán | PHẢI/NÊN/CÓ THỂ dùng đúng cấp độ? |
| 4 | Cross-reference chính xác | Mọi mã tài liệu đúng, link hoạt động? |
| 5 | Không trùng lặp nội dung | Không duplicate thông tin đã có trong tài liệu khác? |
| 6 | Vai trò nhất quán | Vai trò trong Section 4 xuất hiện trong Section 7? |
| 7 | Gate rõ ràng | Mọi gate có điều kiện PASS/FAIL cụ thể? |
| 8 | In được | Layout vừa A4, không tràn? |
| 9 | Không meta-text | Không có "tài liệu này nhằm mục đích..."? |
| 10 | Không "AI" mention | Không có "AI generated", "auto-generated"? |

---

## 5. Theo doi lich su thay đổi (Revision History)

### 5.1 Vị trí

Mọi tài liệu HTML có bảng revision history ở cuối trang, trong `<footer>` hoặc section riêng.

### 5.2 Cấu trúc bảng

| Phiên bản | Ngày | Người thay đổi | Mô tả thay đổi | DCR # |
|-----------|------|---------------|---------------|-------|
| V0 | 2025-06-01 | Nguyễn Văn A | Phát hành lần đầu | DCR-001 |
| V1.1 | 2025-08-15 | Trần Văn B | Sửa lỗi chính tả Section 3, cập nhật link Section 10 | DCR-015 |
| V2.0 | 2025-11-01 | Nguyễn Văn A | Thêm gate G5, thay đổi vai trò QC Lead | DCR-042 |

### 5.3 Quy tắc ghi

- Ghi mọi lần thay đổi, kể cả cập nhật nhỏ.
- Mô tả thay đổi cụ thể: ghi section nào, thay đổi gì. KHÔNG ghi "cập nhật nội dung".
- Mọi dòng có số DCR tương ứng (trừ sửa lỗi chính tả nhỏ).
- Giữ toàn bộ lịch sử, KHÔNG xóa dòng cũ.
- Không hiển thị revision history để so sánh các bản nháp nội bộ trước phát hành đầu tiên. Với tài liệu còn `V0` và chưa issue, lịch sử draft nằm trong DCR / review log, không nằm trong thân SOP.

---

## 6. Lưu trữ hồ sơ (Record Retention)

### 6.1 Thời gian lưu trữ

| Loại hồ sơ | Thời gian lưu trữ | Ghi chú |
|-----------|-------------------|---------|
| Tài liệu QMS hiện hành (SOP, WI, ANNEX) | Vĩnh viễn (trên QMS site) | Phiên bản hiện tại luôn truy cập được |
| Tài liệu QMS het hiệu lực (Superseded) | Tối thiểu 7 nam | Lưu trữ trên SharePoint Archive |
| DCR (FRM-102) | Tối thiểu 7 năm | Lưu kèm tài liệu tương ứng |
| Peer Review Log (FRM-105) | Tối thiểu 7 năm | Lưu kèm tài liệu tương ứng |
| Hồ sơ sản xuất (Job records) | Tối thiểu 10 năm hoặc theo yêu cầu khách hàng | Theo hợp đồng |
| Hồ sơ đào tạo (Training records) | Tối thiểu 5 năm sau khi nhân viên nghỉ việc | Theo luật lao động |
| Hồ sơ kiểm định (Calibration) | Tối thiểu 7 năm | Theo ISO 10012 |
| Hồ sơ audit (Internal/External) | Tối thiểu 7 năm | Theo ISO 9001 |

### 6.2 Hình thức lưu trữ

| Hệ thống | Loại hồ sơ | Định dạng |
|----------|-----------|-----------|
| QMS Site (web) | Tài liệu hiện hành | HTML |
| SharePoint — QMS Records | Tài liệu gốc, DCR, review log | PDF (từ HTML) |
| SharePoint — Archive | Tài liệu hết hiệu lực | PDF |
| Epicor | Hồ sơ sản xuất, job records | Dữ liệu hệ thống |
| Local backup | Sao lưu toàn bộ | Theo quy định IT |

### 6.3 Huy hồ sơ

- Chỉ hủy hồ sơ khi hết thời gian lưu trữ bắt buộc.
- QMS Engineer lập danh sách hồ sơ cần hủy, QA Manager phê duyệt.
- Ghi nhận vao FRM-101 Master Document Register.
- KHÔNG tự ý huy hồ sơ khi chưa co phê duyệt.

---

## 7. Trạng thái tài liệu

### 7.1 Cac trang thai

| Trạng thái | Mã màu | Ý nghĩa |
|-----------|--------|---------|
| Draft | Vàng | Dang soạn thảo, chưa co hiệu lực |
| In Review | Cam | Dang rà soát cheo hoặc cho phê duyệt |
| Approved | Xanh la | Da phê duyệt, chưa phát hành |
| Published | Xanh dương | Da phát hành, đang có hiệu lực |
| Superseded | Xám | Hết hiệu lực, đã có phiên bản mới thay thế |
| Obsolete | Đỏ | Bị hủy bỏ, không còn sử dụng |

### 7.2 Chuyển đổi trạng thái

```
Draft ----submit----> In Review
In Review --reject--> Draft (trả về sua)
In Review --approve-> Approved
Approved --publish--> Published
Published --new rev-> Superseded (phiên bản cu)
Published --cancel--> Obsolete (bi huy)
```

### 7.3 Quy tắc

- Tại nơi làm việc chỉ được sử dụng tài liệu trạng thái **Published**.
- Tài liệu **Superseded** và **Obsolete** PHẢI ghi ro "KHÔNG CÒN HIỆU LỰC" tren trang dau.
- QMS Engineer kiểm tra hằng tháng: không có tài liệu Draft qua 30 ngay chưa submit.
- QMS Engineer kiểm tra hằng tháng: không có tài liệu In Review qua 10 ngay chưa phê duyệt.

---

## 8. So do tong the quy trình

```
                    +----------+
                    |  Trigger |
                    | (DCR,    |
                    | new doc, |
                    | audit    |
                    | finding) |
                    +----+-----+
                         |
                         v
                    +----------+
                    |  DRAFT   |
                    | (Owner   |
                    |  soan)   |
                    +----+-----+
                         |
                    +----v-----+
                    |  SUBMIT  |
                    | (FRM-102)|
                    +----+-----+
                         |
                    +----v-----+
                    |  CROSS-  |
                    |  REVIEW  |
                    | (FRM-105)|
                    +----+-----+
                         |
                    +----v-----+
              +-----|  APPROVE |-----+
              |     | (QA Mgr) |     |
              |     +----------+     |
              v                      v
        +-----------+          +-----------+
        | APPROVED  |          | REJECTED  |
        +-----------+          | (trả về   |
              |                |  Draft)   |
              v                +-----------+
        +-----------+
        | PUBLISH   |
        | (QMS Eng) |
        +-----+-----+
              |
              v
        +-----------+
        | PUBLISHED |
        | (hiệu lực)|
        +-----------+
```
