# 13. Phương pháp nghiên cứu và viết lại SOP theo từng tài liệu

> Version: v1 | Date: 2026-03-27 | Owner: QMS Engineer

---

## 1. Mục tiêu

Tài liệu này khóa phương pháp bắt buộc khi cập nhật bất kỳ SOP nào trong hệ thống HESEM QMS.

Mục tiêu là ngăn kiểu cập nhật cơ học:
- ép mọi SOP về cùng số cổng kiểm soát,
- ép mọi SOP về cùng số bước chi tiết,
- viết lại Section 6 và Section 7 theo một khuôn lặp mà không dựa trên phạm vi vận hành thực của SOP đó,
- trộn nửa Anh nửa Việt làm thuật ngữ vận hành mất chuẩn.

---

## 2. Nguyên tắc bắt buộc

1. Mỗi SOP phải được nghiên cứu riêng.
2. Không được dùng một mô hình bước hoặc mô hình cổng cho toàn bộ bộ SOP.
3. Số cổng kiểm soát và số bước chi tiết phải do phạm vi vận hành, số lần bàn giao, số điểm HOLD/RELEASE, rủi ro và bằng chứng cần giữ quyết định.
4. Flowchart của Section 7 phải khớp tuyệt đối với số heading bước chi tiết trong cùng Section 7.
5. Section 6 và Section 7 là hai lớp khác nhau:
   - Section 6 trả lời: giữ ở đâu, ai mở cổng, điều kiện gì mới đi tiếp.
   - Section 7 trả lời: công việc thực diễn ra theo trình tự nào.
6. Chỉ được viết lại Section 6 sau khi đã xác định rõ architecture kiểm soát của SOP đó.
7. Chỉ được viết lại Section 7 sau khi đã chốt xong dòng công việc thực tế của SOP đó.
8. Không dùng lại số bước hoặc số IG chỉ vì “trông đẹp”, “đều”, hoặc “dễ sinh hàng loạt”.

---

## 3. Trình tự nghiên cứu bắt buộc cho từng SOP

### Bước 1. Đọc tài liệu cũ

Phải đọc ít nhất:
- phạm vi SOP,
- Section 3 thuật ngữ,
- Section 4 vai trò,
- Section 5 đầu vào/đầu ra,
- Section 6 cũ,
- Section 7 cũ,
- Section 8 ngoại lệ,
- Section 9 dữ liệu/hồ sơ.

Mục đích:
- giữ lại những logic vận hành còn đúng,
- nhận ra phần bị nén cơ học hoặc thiếu điểm bàn giao,
- tránh viết mới theo kiểu cắt rời khỏi bối cảnh HESEM.

### Bước 2. Nghiên cứu nguồn chính thức bên ngoài

Phải dùng nguồn chính thức hoặc nguồn gốc:
- tài liệu chính thức của cơ quan quản lý,
- tiêu chuẩn công khai của tổ chức kỹ thuật,
- tài liệu chính thức của hệ thống ERP/MES/QMS công nghiệp,
- handbook kỹ thuật hoặc thống kê chính thức.

Không dựa vào:
- blog marketing không có giá trị quy trình,
- bài tổng hợp không có nguồn gốc,
- nội dung suy diễn không có tài liệu đỡ lưng.

### Bước 2A. Chốt benchmark KPI trước khi viết Section 6

Trước khi chốt KPI của từng IG, phải trả lời:
- benchmark chính thức bên ngoài nào dùng làm mốc tham chiếu,
- ngưỡng nào là yêu cầu cứng của chuẩn / khách hàng / pháp lý,
- ngưỡng nào là mục tiêu nội bộ thiết kế chặt hơn vì mức rủi ro HESEM,
- dữ liệu nào trong hệ thống có thể đo được KPI đó thật sự.

Nếu không có benchmark trực tiếp cho đúng tình huống, phải:
1. dùng benchmark gần nhất có giá trị quản trị,
2. ghi rõ đây là **mục tiêu nội bộ suy luận từ benchmark + risk level**,
3. tránh ghi KPI kiểu chung chung không có số.

### Bước 3. Chốt kiến trúc kiểm soát

Trước khi viết Section 6, phải trả lời:
- có bao nhiêu điểm HOLD/RELEASE thật,
- ai có quyền mở từng cổng,
- cổng nào là điều kiện trước khi khởi động,
- cổng nào là điều kiện trước khi bàn giao,
- cổng nào là điều kiện trước khi release,
- KPI nào đo được hiệu lực của từng cổng.
- KPI nào có benchmark hoặc ngưỡng thiết kế đủ sức điều hành, không chỉ đủ form.

### Bước 4. Chốt trình tự công việc thực tế

Trước khi viết Section 7, phải trả lời:
- vai trò nào đổi ở đâu,
- hệ thống hoặc hồ sơ nào đổi ở đâu,
- machine/tool/program/fixture/material/gage đổi ở đâu,
- điểm nào cần revalidation,
- điểm nào tạo suspect range,
- điểm nào bắt buộc bàn giao.

### Bước 5. Viết lại Section 6 và Section 7

Chỉ sau khi hoàn tất bốn bước trên mới được viết lại.

---

## 4. Quy tắc thay thế Section 6 và Section 7

### 4.1 Section 6

- Xóa toàn bộ phần nội dung nằm giữa `p6` và `p7`.
- Không được xóa nhầm heading `p6`.
- Không được xóa nhầm heading `p7`.
- Section 6 phải dùng bảng IG.
- Mỗi IG phải có:
  - tên cổng,
  - mô tả mục tiêu kiểm soát,
  - chủ trì,
  - điểm dừng bắt buộc,
  - KPI hoặc bằng chứng tối thiểu.
- KPI của từng IG phải có ngưỡng số hoặc SLA, nguồn dữ liệu chuẩn và trigger phản ứng.

### 4.2 Section 7

- Xóa toàn bộ phần nội dung nằm giữa `p7` và `p8`.
- Không được xóa nhầm heading `p7`.
- Không được xóa nhầm heading `p8`.
- Section 7 phải được viết lại hoàn toàn nếu flow hoặc bước cũ không còn phản ánh vận hành thật.
- Số bước flowchart phải bằng số heading bước chi tiết.
- Không được có tình trạng:
  - flowchart 7 bước nhưng chi tiết 10 bước,
  - flowchart 5 bước nhưng mô tả chi tiết 8 bước,
  - flowchart chỉ là phiên bản rút gọn không khớp nội dung thực thi.

---

## 5. Quy tắc viết thuật ngữ

### 5.1 Cột tên thuật ngữ

Cột tên thuật ngữ trong Section 3 phải viết theo mẫu:

`English term (thuật ngữ tiếng Việt chuẩn)`

Ví dụ:
- `Traceability (truy xuất nguồn gốc)`
- `First Article Inspection - FAI (kiểm tra mẫu đầu tiên)`
- `Process Capability (năng lực quá trình)`
- `Lockout/Tagout - LOTO (khóa và gắn thẻ năng lượng)`

### 5.2 Cách dùng trong nội dung tài liệu

Sau khi đã định nghĩa ở Section 3:
- trong thân tài liệu ưu tiên dùng bản tiếng Việt,
- không viết kiểu nửa Anh nửa Việt,
- chỉ giữ chữ viết tắt khi thật sự là chuẩn vận hành phổ biến và không làm mờ nghĩa.

Ví dụ đúng:
- `truy xuất nguồn gốc`
- `kiểm tra mẫu đầu tiên`
- `năng lực quá trình`
- `khóa và gắn thẻ năng lượng`

Ví dụ không đúng:
- `trace`
- `first-piece release` nếu tài liệu đã chọn bản Việt là `mở sản lượng sau chi tiết đầu tiên`
- `mixed source kiểm soát`
- `job close tài chính`

---

## 6. Dấu hiệu nhận biết SOP bị cập nhật cơ học

Một SOP bị xem là cập nhật cơ học khi có từ hai dấu hiệu trở lên:
- số IG lặp hàng loạt không do phạm vi thật,
- số bước chi tiết lặp hàng loạt không do phạm vi thật,
- nhiều SOP dùng cùng một bộ câu mô tả chỉ thay danh từ,
- Section 6 chỉ đổi tên cổng nhưng owner/hold/KPI không thay đổi bản chất,
- Section 7 không có thay đổi vai trò, thay đổi trạng thái hay bàn giao nhưng vẫn chia bước đều,
- thuật ngữ dùng lẫn Anh-Việt thiếu chuẩn hóa,
- nội dung không giải thích được tại sao phải giữ cổng đó hoặc tại sao phải tách bước đó.

---

## 7. Checklist phê duyệt trước khi coi là hoàn tất

Chỉ coi một SOP đã cập nhật xong khi trả lời được toàn bộ:

1. Đã đọc tài liệu cũ chưa?
2. Đã dùng nguồn chính thức bên ngoài chưa?
3. Đã chốt số IG theo thực tế SOP chưa?
4. Đã chốt số bước theo thực tế SOP chưa?
5. Flowchart và bước chi tiết đã khớp tuyệt đối chưa?
6. Section 6 đã có owner, hold và KPI đo được chưa?
7. Section 7 đã thể hiện đủ bàn giao, revalidation, restart hoặc containment chưa?
8. Section 3 đã dùng mẫu `English (Việt)` chưa?
9. Nội dung thân tài liệu đã ưu tiên dùng tiếng Việt chuẩn chưa?
10. Đã thay đúng phần `p6→p7` và `p7→p8` mà không xóa nhầm section bên cạnh chưa?

---

## 8. Quy định áp dụng

Tài liệu này áp dụng cho:
- mọi lần viết mới SOP,
- mọi lần viết lại Section 3, 6 hoặc 7,
- mọi script tự động thay section của SOP,
- mọi dự án chuẩn hóa hàng loạt trong `core-standard`.

Nếu script hoặc template nào mâu thuẫn với tài liệu này, tài liệu này được ưu tiên áp dụng.
