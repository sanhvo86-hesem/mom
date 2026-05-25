# 07 - Hướng Dẫn Viết Nội Dung Tài Liệu QMS

> Phiên bản: V0 | Hiệu lực: 2025-06-01 | Chủ sở hữu: QMS Engineer

## 1. Nguyên tắc chung

### 1.1. Nguyên tắc bắt buộc

| # | Nguyên tắc | Cách áp dụng |
|---|---|---|
| 1 | Viết ngắn, rõ, dùng được ngay | Mỗi câu chỉ truyền một ý và phải giúp người đọc biết cần làm gì. |
| 2 | Nêu rõ chủ thể thực hiện | Mỗi yêu cầu nên thể hiện rõ vai trò, hành động, đối tượng và điều kiện áp dụng. |
| 3 | Không viết mơ hồ | Tránh các cụm như `để bảo đảm`, `nhằm cải tiến`, `hướng tới mục tiêu` nếu không có hành động cụ thể đi kèm. |
| 4 | Không viết văn bản tự giới thiệu chính nó | Không dùng các câu như `tài liệu này nhằm...`, `mục này mô tả...`. |
| 5 | Không chèn dấu vết biên tập | Không đưa ghi chú kiểu `AI generated`, `bản dịch`, `sửa theo note`, `khác bản cũ`. |
| 6 | Mỗi câu phải phục vụ vận hành | Nếu câu không dẫn tới hành động, quyết định, kiểm soát hoặc bằng chứng, phải bỏ. |
| 7 | Không trộn Anh - Việt khó đọc | Chỉ giữ mã tài liệu, viết tắt chuẩn và thuật ngữ đã được khóa trong chuẩn ngôn ngữ. |
| 8 | Ưu tiên gạch đầu dòng và bảng | Khi có từ 3 ý trở lên, ưu tiên dùng bullet hoặc bảng thay cho đoạn văn dài. |
| 9 | Không che khoảng trống trách nhiệm bằng câu chung chung | Không dùng `các bộ phận liên quan`, `người phụ trách`, `line manager` nếu chưa chỉ rõ vai trò/JD/code. |
| 10 | Chuẩn hóa hình thức được phép, sao chép nội dung thì không | Khung bố cục có thể giống nhau; nội dung từng SOP/WI/ANNEX phải viết theo đúng nghiệp vụ của tài liệu đó. |

### 1.2. Giọng văn

- Dùng giọng mệnh lệnh, chuyên nghiệp, dứt khoát.
- Không dùng `bạn`, `chúng ta`, `chúng tôi`.
- Gọi đúng tên vai trò: `QMS Engineer`, `QA Manager`, `QC Inspector`, `Production Planner`.
- Khi chưa xác định một người cụ thể, dùng `người thực hiện`, `người được giao`, `bộ phận chủ trì`.
- Với tài liệu chưa phát hành lần đầu, giữ trạng thái phiên bản `V0`.

## 2. Cấu trúc câu chuẩn

Mẫu câu ưu tiên:

```text
[Vai trò] + [hành động] + [đối tượng] + [điều kiện/thời điểm nếu có].
```

Ví dụ:

| Đúng | Sai |
|---|---|
| `QA Manager phê duyệt tài liệu sau khi hoàn tất rà soát chéo.` | `Tài liệu này được thiết kế để hỗ trợ việc phê duyệt...` |
| `QC Inspector đo 5 điểm theo bản vẽ trước khi nhả lô.` | `Cần đo cẩn thận để bảo đảm chất lượng.` |
| `Shift Leader dừng máy khi phát hiện 3 chi tiết lỗi liên tiếp.` | `Trong trường hợp có vấn đề, nên cân nhắc dừng máy.` |

Quy tắc bổ sung:

- Câu cấm đoán dùng `Không được...`.
- Điều kiện nên mở bằng `Khi...` hoặc `Nếu...`.
- Không dùng `trong trường hợp`, `đối với tình huống`, `nên tránh` nếu câu cần tính bắt buộc.

## 3. Quy tắc dùng thuật ngữ

### 3.1. Mức độ bắt buộc

| Nhãn | Ý nghĩa | Khi dùng |
|---|---|---|
| `PHẢI` | Bắt buộc thực hiện | Yêu cầu ISO, khách hàng, pháp lý, điểm chặn bắt buộc |
| `NÊN` | Khuyến nghị mạnh | Thực hành tốt, cho phép ngoại lệ có lý do |
| `CÓ THỂ` | Tùy chọn | Phương án thay thế hoặc bổ sung |

Markup HTML chuẩn:

```html
<span class="req-tag shall">PHẢI</span>
<span class="req-tag should">NÊN</span>
<span class="req-tag may">CÓ THỂ</span>
```

### 3.2. Quy tắc giữ hay dịch

- Ưu tiên dùng tiếng Việt trong phần thân tài liệu.
- Giữ nguyên mã tài liệu, tên file, URL nội bộ, role code, department code, tên hệ thống, tên thương hiệu, viết tắt chuẩn.
- Chỉ giữ tiếng Anh khi thuật ngữ đã được khóa trong chuẩn hệ thống hoặc nếu dịch ra làm sai nghĩa kỹ thuật.
- Không viết kiểu lai như `job đóng`, `review hồ sơ`, `policy nội bộ`, `traceability label`, `control plan chính`.
- Nếu cần thuật ngữ ở Mục 3 của SOP, dùng mẫu:

```text
English term (thuật ngữ tiếng Việt chuẩn)
```

Ví dụ:

| Thuật ngữ | Cách dùng |
|---|---|
| `Traceability (truy xuất nguồn gốc)` | Dùng khi mô tả khả năng truy ngược/truy xuôi bằng chứng. |
| `System of Record - SoR (hệ thống ghi nhận gốc)` | Dùng cho hệ thống ghi nhận giao dịch vận hành. |
| `Single Source of Truth - SSOT (nguồn sự thật duy nhất)` | Dùng cho nơi lưu hồ sơ chuẩn đã kiểm soát. |

## 4. Quy tắc nội dung theo từng phần SOP

### 4.1. Mục đích

- Mở đầu bằng 1 câu điều hành ngắn.
- Sau đó dùng 3-5 bullet nêu rõ tài liệu này khóa điều gì.
- Mỗi bullet nên bắt đầu bằng động từ: `Thiết lập`, `Kiểm soát`, `Ngăn ngừa`, `Bảo vệ`, `Quy định`.
- Không sao chép một bộ mục đích cho nhiều SOP chỉ bằng cách thay danh từ.

Ví dụ:

```text
- Thiết lập cơ chế kiểm soát tài liệu từ tạo mới đến phê duyệt.
- Ngăn ngừa sử dụng tài liệu hết hiệu lực tại nơi làm việc.
- Bảo đảm mọi thay đổi đều có rà soát chéo và dấu vết phê duyệt.
```

### 4.2. Phạm vi

Chia làm 2 phần rõ ràng:

- `Có bao phủ`: đối tượng, quá trình, khu vực áp dụng.
- `Không thay thế`: tài liệu hoặc hoạt động nằm ngoài phạm vi tài liệu này.

Không dùng danh sách trang trí. Ranh giới phải bám đúng điểm bàn giao thật ở quy trình chi tiết.

### 4.3. Thuật ngữ và nguyên tắc

- Chỉ liệt kê thuật ngữ thực sự xuất hiện trong tài liệu.
- Không sao chép toàn bộ glossary hệ thống vào từng SOP.
- Nếu thuật ngữ đã có bản Việt chuẩn, phần thân tài liệu phải ưu tiên dùng bản Việt đó.

### 4.4. Vai trò, quyền hạn và RACI

- Phải nêu rõ ai làm, ai phê duyệt, ai có quyền chặn, ai có quyền gỡ chặn.
- Không dùng placeholder mơ hồ như `Process Owner`, `Department Head`, `Responsible Person`, `Top Management`.
- Nếu dùng RACI matrix, vẫn phải thể hiện rõ quyền chặn và quyền mở lại.

### 4.5. Đầu vào, đầu ra, điều kiện tiên quyết, sự kiện kích hoạt

- `Đầu vào`: hồ sơ, dữ liệu, điều kiện phải có trước khi bắt đầu.
- `Đầu ra`: hồ sơ, trạng thái, quyết định hoặc sản phẩm tạo ra khi kết thúc.
- `Điều kiện tiên quyết`: điều kiện bắt buộc phải đạt trước khi chạy.
- `Sự kiện kích hoạt`: sự kiện làm quy trình bắt đầu, khởi động lại, chuyển cấp hoặc chuyển trạng thái.

Không viết kiểu `khi cần`, `theo yêu cầu`, `tài liệu liên quan`.

### 4.6. Cổng kiểm soát, điểm dừng bắt buộc và KPI

- Mục này chỉ mô tả điểm giữ/mở cổng, không kể lại toàn bộ quy trình.
- Chỉ tạo cổng khi có điều kiện chặn/mở cổng thật.
- KPI phải gắn với hiệu lực kiểm soát, có ngưỡng, nguồn dữ liệu và phản ứng khi lệch.
- Không dùng KPI trang trí kiểu `đúng hạn`, `được kiểm soát`, `cải thiện liên tục`.

Một câu KPI đạt chuẩn phải trả lời được:

1. Ngưỡng là gì.
2. Đo từ nguồn nào.
3. Lệch ngưỡng thì ai phản ứng và phản ứng thế nào.

### 4.7. Quy trình chi tiết

- Đây là phần vận hành thực tế.
- Tách bước khi có thay đổi vai trò, hệ thống, tài nguyên chính, checkpoint chất lượng, containment hoặc bàn giao.
- Số bước không cần bằng số cổng.
- Với SOP thực tế, 8-14 bước là bình thường nếu có nhiều điểm giao nhận.
- Mỗi bước phải nói rõ người làm, việc làm, đầu ra và điều kiện bàn giao.

## 5. Chỉ dẫn riêng cho WI và ANNEX

### 5.1. Work Instruction (WI)

- Viết theo hướng thao tác tại hiện trường.
- Ưu tiên câu ngắn, mệnh lệnh trực tiếp, dễ đọc trên màn hình hoặc bản in.
- Khi có bảng kiểm, phải thể hiện rõ `đạt khi`, `không đạt thì làm gì`, `ai quyết định`.

### 5.2. ANNEX

- ANNEX là tài liệu tham chiếu kiểm soát, không phải nơi viết khẩu hiệu.
- Phải ưu tiên tính chuẩn hóa thuật ngữ, logic dữ liệu, ma trận, ví dụ áp dụng, rule vận hành.
- Nếu ANNEX chứa bảng dictionary/matrix, câu mô tả phải ngắn và chỉ giải thích logic dùng bảng.

## 6. Các lỗi phải loại bỏ

- Trộn Anh - Việt gây khựng đọc: `job chờ`, `policy nội bộ`, `review hồ sơ`, `Supplier thay đổi`.
- Câu dịch máy: `tài liệu này được thiết kế để`, `điều này hỗ trợ cho việc`, `mục này mô tả`.
- Câu thiếu chủ thể: `cần thực hiện`, `nên kiểm tra`, `được rà soát`.
- Câu quá dài, nhiều vế nối bằng dấu phẩy.
- Dùng cùng một đoạn văn cho nhiều tài liệu khác nhau.
- Chèn ghi chú biên tập, lịch sử sửa, benchmark, giải thích prompt ngay trong thân tài liệu vận hành.

## 7. Checklist trước khi phát hành

- Phần thân tài liệu đã dùng tiếng Việt tự nhiên, không còn câu dịch máy rõ rệt.
- Không còn cụm Anh - Việt trộn gây khó đọc ngoài danh sách ngoại lệ được phép.
- Mỗi câu đều có chủ thể hoặc mệnh lệnh rõ ràng.
- Vai trò, quyền chặn, quyền mở lại đã rõ.
- KPI có ngưỡng, nguồn dữ liệu và phản ứng.
- Link nội bộ, tên file, mã tài liệu, header liên kết ngoài vẫn giữ nguyên.
