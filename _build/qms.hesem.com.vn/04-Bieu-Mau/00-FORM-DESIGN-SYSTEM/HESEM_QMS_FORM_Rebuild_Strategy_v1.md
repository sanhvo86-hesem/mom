# HESEM QMS — FORM Rebuild Strategy v1

## Kết luận điều hành

Tôi không khuyến nghị “copy lại HTML form cũ sang Excel”.
Cách làm đúng là:

1. **Đập lại kiến trúc FORM từ đầu** theo SOP + WI + ANNEX hiện hành.
2. Giữ triết lý:
   - **Epicor = System of Record** cho transaction master.
   - **M365/SharePoint = SSOT** cho file evidence.
   - **Excel FORM = lớp ghi nhận gate / evidence / quyết định / log vận hành**.
3. Tách **logical form** khỏi **physical workbook** để giảm file rời nhưng không làm mất control.

## Quy mô target set đề xuất

- Logical forms: **115**
- Rebuild trực tiếp: **100**
- New forms cần bổ sung: **10**
- Merge: **1**
- Convert sang kiến trúc annex + transaction: **1**
- Conditional hardcopy only: **2**

## Các quyết định kiến trúc quan trọng

### 1. Không để form thay ERP
Các form như RFQ, Job Traveler, Dispatch, Receiving, Final Release, Shipment, Invoice Request phải lấy dữ liệu master từ Epicor, không tạo một “ERP song song” bằng Excel.

### 2. Không dùng một mega-workbook cho toàn hệ thống
Nên chia thành 3 kiểu workbook:
- **Event template workbook**: một hồ sơ / một sự kiện / một file.
- **Shared rolling workbook**: log hoặc register chạy theo ngày / tuần / tháng.
- **Print workbook**: label / card / tag có vùng in cố định.

### 3. Các chỗ phải bổ sung form mới
Những evidence object còn thiếu trong portfolio hiện tại:
- FRM-205 Job Dossier Evidence Index
- FRM-208 Daily Tier Meeting and Escalation Log
- FRM-209 High-Risk Job Readiness Review
- FRM-306 Engineering Release and Baseline Package Approval
- FRM-518 Work Transfer Validation Record
- FRM-519 Job Packet Quick Check and Pre-Run Verification
- FRM-713 Cleanroom Entry and Gowning Log
- FRM-714 Ultrasonic Cleaning Batch Record
- FRM-715 Vacuum-Compatible Clean Build and Bagging Record
- FRM-721 FOD Line Clearance and Tool Accountability Log

### 4. Các chỗ phải xử lý overlap
- FRM-412 phải merge vào FRM-701.
- FRM-109 không nên tồn tại như form nhập tay độc lập; phải chuyển sang kiến trúc annex + giao dịch truy cập.
- FRM-401 không nên là PO tracker kiểu duplicate ERP; nên đổi thành exception / expedite tracker.
- FRM-171 và FRM-208 phải tách rõ: communication plan khác daily tier escalation.
- FRM-707, FRM-709, FRM-715 phải tách rõ standard pack / clean pack / vacuum-compatible clean build.

## Lộ trình triển khai

Lộ trình chi tiết đã có trong workbook `01_ROADMAP`, gồm:
- P0: architecture freeze
- P1: commercial + engineering
- P2: supplier + planning + execution
- P3: metrology + quality release
- P4: packaging + cleanliness + shipment
- P5: people + HSE + finance + audit
- P6: permissions / training / cutover
- P7: stabilization / KPI extraction / quarterly review

## Mẫu Excel đã dựng sẵn

Trong workbook prototype pack, tôi đã dựng sẵn 11 template critical:
- FRM-202
- FRM-203
- FRM-302
- FRM-511
- FRM-518
- FRM-701
- FRM-641
- FRM-651
- FRM-652
- FRM-707
- FRM-804

Các mẫu này đã đi theo rule:
- ô nhập liệu màu xanh,
- dropdown cho status / decision / pass-fail,
- header ngắn,
- gate rõ,
- evidence rõ,
- có thể dùng làm baseline để nhân bản ra từng file thật khi triển khai.

## Ghi chú vận hành

Các form này phải được dùng như **nền evidence** cho:
- chất lượng,
- giao hàng,
- tuân thủ,
- năng lực,
- cải tiến,
- và một phần của cơ sở xét **tăng lương / thưởng / thăng chức**.

Nhưng không được dùng dữ liệu form cho đánh giá nhân sự nếu:
- thiếu owner,
- thiếu thời gian,
- thiếu evidence link,
- bypass gate,
- hoặc duplicate entry trái SoR.
