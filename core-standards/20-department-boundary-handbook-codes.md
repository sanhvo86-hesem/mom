# 20. Department Boundary, Handbook Codes and Coverage Gaps

> Version: v3 | Date: 2026-03-28 | Owner: QMS Engineer

---

## 1. Mục tiêu

Tài liệu này khóa chuẩn bắt buộc cho toàn bộ hệ thống khi nhắc tới:
- phòng ban;
- phân hệ ổn định trong phòng ban;
- ownership cấp chức năng;
- handoff liên phòng ban;
- khoảng trống phạm vi công việc chưa được JD hoặc handbook bao phủ.

Mục tiêu là chặn 7 lỗi hệ thống:
- dùng JD cho một trách nhiệm thực ra là mandate của cả phòng ban;
- dùng tên phòng ban để che một quyết định lẽ ra phải truy về một cá nhân có thẩm quyền;
- dùng các cụm chung chung như `Department`, `bộ phận liên quan`, `các phòng chức năng`, `các phòng liên quan`, `line manager`, `line owner`, `bộ phận chuyên môn`, `all functions`, `team lead/supervisor` mà không chỉ ra phạm vi thật;
- trộn `department`, `subfunction` và `role` trong cùng một ô RACI/owner gây hiểu sai thẩm quyền;
- để các phòng ban thiếu phạm vi công việc thực tế nhưng không ghi nhận là gap;
- tạo handbook phòng ban như bản tóm tắt SOP, không làm rõ ranh giới và điểm bàn giao;
- cập nhật hàng loạt cơ học mà không đọc bối cảnh tài liệu, JD và mô hình vận hành thật.

---

## 2. Ba lớp thực thể phải tách bạch

### 2.1 Role code

`Role code` là JD-linked role thực có cá nhân giữ vai trò, ví dụ:
- `CS`, `EST`
- `ENGM`, `DFM`, `PE`, `CAM`
- `PPL`, `WKM`, `SL`, `SET`, `OPR`, `MNT`, `CPS`, `DBL`
- `QA`, `QMS`, `QE`, `QCL`, `QC`, `MCS`
- `SCM`, `BUY`, `WAR`, `TOOL`, `LOG`
- `FIN`, `APAR`, `GLP`
- `HR`, `EHS`, `ITA`, `ESA`

Chỉ dùng `role code` khi tài liệu cần:
- chỉ ra người quyết định;
- người giữ quyền HOLD / RELEASE;
- người phê duyệt;
- owner KPI cá nhân;
- người nhận bàn giao cụ thể;
- người chịu trách nhiệm trong ngoại lệ, escalation hoặc sign-off.

### 2.2 Department code

`Department code` có dạng `D-XXX`, là mandate cấp phòng ban hoặc phân hệ ổn định, ví dụ:
- `D-SCS`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-HR`, `D-EHS`, `D-IT`
- `D-PPC`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-ERP`

Chỉ dùng `department code` khi tài liệu đang nói tới:
- phạm vi trách nhiệm tập thể của cả phòng ban;
- đường handoff giữa hai chức năng;
- nơi phát sinh hoặc nơi tiếp nhận yêu cầu liên phòng ban;
- owner của handbook phòng ban;
- owner cấp chức năng của một dữ liệu hoặc nhịp điều hành nhưng chưa đi tới quyết định cá nhân;
- một phân hệ ổn định được tổ chức lặp lại, có đầu vào/đầu ra và ranh giới rõ.

### 2.3 Governance bundle

`Governance bundle` là nhóm explicit gồm nhiều role code đã được định nghĩa tại `19-role-boundary-jd-linking-and-role-codes.md`.

Bundle chỉ dùng khi trách nhiệm thực sự là lớp actor chung nhiều vai trò. Bundle không thay thế được cả `department code` lẫn `role code`.

---

## 3. Quy tắc chọn đúng lớp

### 3.1 Dùng role code khi

- có một cá nhân hoặc một tuyến thẩm quyền rõ ràng phải ký hoặc ra quyết định;
- ô đang nói tới `phê duyệt`, `giữ`, `nhả`, `xác nhận`, `ủy quyền`, `disposition`, `sign-off`;
- KPI có owner cá nhân;
- action plan, escalation hoặc containment cần truy tới người chịu trách nhiệm cuối cùng.

### 3.2 Dùng department code khi

- ô đang mô tả interface cấp phòng ban;
- tài liệu đang chỉ ra đơn vị phải tham gia hoặc phải cung cấp đầu vào;
- đó là handbook phòng ban hoặc bảng mô tả ranh giới chức năng;
- một nhiệm vụ là responsibility chung của cả phòng ban, không phải quyết định ký duyệt;
- phân hệ ổn định cần được nhìn thấy độc lập với JD, ví dụ `D-PPC`, `D-WHS`, `D-LOG`, `D-ERP`.

### 3.3 Không được dùng department code để thay cho role code khi

- nói tới phê duyệt ngoại lệ;
- ra quyết định chấp nhận/khước từ;
- đóng/mở gate hoặc release shipment;
- sign-off kiểm soát thay đổi;
- chỉ định owner xử lý trong bảng ngoại lệ;
- chỉ định deputy/back-up cá nhân.

### 3.4 Không được dùng role code để thay cho department code khi

- tài liệu đang mô tả mandate của cả phòng ban;
- nói tới nhịp họp liên phòng ban hoặc đầu vào bắt buộc từ một chức năng;
- nói tới `department handbook owner`;
- mô tả một phân hệ ổn định mà có nhiều JD cùng tham gia nhưng ranh giới chức năng phải hiện ra độc lập.

### 3.5 Placeholder phải resolve trước khi viết

Trong handbook phòng ban, matrix tổ chức, ANNEX summary hoặc SOP có ô interface cấp chức năng, các cụm dưới đây bị xem là placeholder và PHẢI resolve trước khi phát hành:
- `các phòng liên quan`, `các phòng chức năng`, `bộ phận chuyên môn`
- `line manager`, `line owner`, `department head`, `trưởng bộ phận`
- `support`, `operations`, `all functions` nếu không nêu rõ danh sách D-code hoặc role code

Rule resolve:
- nếu câu đang nói về mandate/chuyển giao cấp chức năng, đổi thành `D-code` cụ thể;
- nếu câu đang nói về sign-off/authorization/quyết định cuối, đổi thành `role code` cụ thể;
- nếu chưa resolve được vì hệ thống thiếu phạm vi hoặc thiếu người giữ quyết định, phân loại thành gap theo Mục 5 thay vì giữ placeholder.

---

## 4. Department code chuẩn cho mô hình job-order CNC

### 4.1 Departments

- `D-SCS` — Sales and Customer Service Department
- `D-ENG` — Engineering Department
- `D-PROD` — Production Department
- `D-QUAL` — Quality Department
- `D-SCM` — Supply Chain Department
- `D-FIN` — Finance Department
- `D-HR` — Human Resources Department
- `D-EHS` — EHS Department
- `D-IT` — IT Department

### 4.2 Subfunctions

- `D-PPC` — Production Planning and Control Function
- `D-PUR` — Purchasing Function
- `D-WHS` — Warehouse Function
- `D-TCR` — Tool Crib Function
- `D-LOG` — Logistics and Shipping Function
- `D-ERP` — ERP Administration Function

### 4.3 Data-content vs platform ownership trong job-order CNC

Trong cac tai lieu so hoa / KPI / ERP / M365, phai tach ro:
- `D-IT` = ha tang CNTT nen, endpoint, network, backup, access lifecycle.
- `D-ERP` = quan tri ERP, workflow, transaction integrity, BAQ/reporting governance.
- cac `D-code` chuc nang nhu `D-SCS`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-HR`, `D-EHS` = noi so huu noi dung nghiep vu, quy tac giao dich va quy tac dung du lieu trong pham vi minh.

Vi vay:
- neu cau dang noi ve `noi dung du lieu nghiep vu`, dung `D-code` chuc nang hoac role trong `FUNC_OWNERS` / `OPS_SCOPE_OWNERS`;
- neu cau dang noi ve `nen tang he thong`, dung `D-IT` / `D-ERP` hoac role `ITA` / `ESA`;
- khong duoc viet mo ho kieu `IT chu du lieu`, `bo phan lien quan`, `system owner`, `data owner`.

Chỉ tạo thêm `D-` code mới khi thỏa cả 4 điều kiện:
- công việc lặp lại ổn định;
- có đầu vào/đầu ra và điểm bàn giao rõ;
- phạm vi không nên bị nhầm với một JD đơn lẻ;
- có nhu cầu dùng lặp lại trong handbook/SOP/ANNEX/RACI.

---

## 5. Coverage Gap bắt buộc phải khóa

Khi đọc một tài liệu mà thấy công việc thực tế tồn tại nhưng chưa được bao phủ rõ bởi bất kỳ:
- role code,
- department code,
- subfunction code,
- hoặc handbook hiện hành,

thì người sửa tài liệu PHẢI dừng và phân loại gap theo một trong 3 dạng:

1. `Department gap`
2. `Subfunction gap`
3. `JD gap`

### 5.1 Cách xử lý từng loại gap

- `Department gap`: cập nhật handbook phòng ban, từ điển và nếu cần thì registry.
- `Subfunction gap`: tạo `D-` code mới, cập nhật registry, handbook, từ điển và các tài liệu hệ thống liên quan.
- `JD gap`: không được che bằng `department code` hoặc một cụm chung chung; phải cập nhật hoặc tạo JD, sau đó cập nhật registry, handbook và tài liệu liên đới.

### 5.2 Ghi nhận gap trong handbook

Mọi handbook phòng ban phải có một callout hoặc đoạn riêng nêu rõ:
- khoảng trống nào đang được khóa tạm trong phiên bản hiện tại;
- ai đang giữ thẩm quyền tạm thời;
- điều kiện nào sẽ buộc tạo JD hoặc tách phân hệ riêng.

Ví dụ hợp lệ:
- `Hiện chưa có JD Commercial Manager; các cam kết vượt khung giá/chính sách do CEO giữ. Nếu tần suất ngoại lệ tăng hoặc xuất hiện khách chiến lược phải mở JD riêng.`
- `EHS hiện do EHS Specialist dẫn dắt; dừng công việc không an toàn là quyền hiện trường, nhưng quyết định đóng mở diện rộng vẫn phải escalated lên CEO/PD.`

### 5.3 Chuỗi cập nhật bắt buộc khi phát hiện gap

Khi đã xác định có `Department gap`, `Subfunction gap` hoặc `JD gap`, người sửa tài liệu PHẢI cập nhật theo đúng chuỗi sau:
1. sửa handbook hoặc JD nguồn trước;
2. cập nhật `tools/data/role-registry-job-order-cnc.json` nếu có thêm `D-code` hoặc thay ranh giới đã công bố;
3. cập nhật workbook `tools/data/qms-terminology-dictionary.xlsx`, tối thiểu 2 sheet:
   - `Phong ban`
   - `Department code & handbook link`
4. cập nhật các tài liệu hệ thống liên đới như matrix tổ chức, ANNEX, SOP có ô interface/owner dùng lại boundary đó;
5. chỉ sau đó mới coi việc sửa tài liệu downstream là hoàn tất.

### 5.4 Rule ve phan cong theo phong ban vs theo JD

Neu mot o dang noi ve:
- function mandate, interface, queue, handoff, ownership cap phong ban: dung `D-code`;
- phe duyet, hold/release, sign-off, deputy, escalation decision: dung `role code`;
- lop actor lap lai da cong bo ro: dung `bundle`.

Khong duoc giu text nua mua kieu:
- `Engineering`, `Sales`, `Planning`, `Warehouse`, `Purchasing`, `Operations`;
- `truong bo phan`, `line manager`, `supervisor`, `team lead`;
- `phong lien quan`, `cac phong chuc nang`, `bo phan chuyen mon`.

Khi mot tu khoa phong ban cu xuat hien trong body SOP/WI/ANNEX/JD, nguoi sua phai tra loi ro no dang noi ve:
1. mot department/subfunction;
2. mot role co JD that;
3. hay mot business concept phi-to-chuc.

Neu la (1), doi sang `D-code`.
Neu la (2), doi sang `role code`.
Neu la (3), viet lai bang tieng Viet van hanh ro nghia, khong de lai cau hybrid nua mua.

---

## 6. Chuẩn nội dung cho Department Handbook

Handbook phòng ban không phải bản tóm tắt SOP. Nó phải trả lời được 6 câu hỏi:

1. Phòng ban này tồn tại để khóa rủi ro gì và tạo ra đầu ra nào?
2. Phạm vi nào thuộc phòng ban này và phạm vi nào không?
3. Trong phòng ban có những role code nào và những subfunction nào?
4. Điểm bàn giao liên phòng ban nằm ở đâu?
5. Có gap nào đang được khóa tạm không?
6. Khi có sự cố, ai giữ action ở cấp phòng ban và ai giữ quyết định ở cấp cá nhân?

Một handbook phòng ban tối thiểu phải có:
- tiêu đề và header với `department code`;
- `ISO/operating intent` 2-4 dòng;
- danh sách role code thuộc phòng;
- nếu có thì liệt kê `subfunction code` trong phạm vi;
- mục tiêu phòng ban;
- phạm vi bao gồm / không vượt quyền;
- trách nhiệm bắt buộc;
- quyền hạn cấp chức năng;
- đầu ra/hồ sơ;
- KPI có giá trị thực chiến;
- interface liên phòng ban;
- tài liệu liên quan;
- mô hình vận hành và ranh giới vai trò;
- nhịp điều hành/dữ liệu/bằng chứng;
- năng lực/deputy;
- rủi ro và escalations;
- coverage gap callout nếu có.

Ngoài danh mục trên, handbook PHẢI thể hiện rõ:
- nhiệm vụ nào là mandate của cả phòng ban;
- nhiệm vụ nào chỉ được giữ ở cấp role code;
- ranh giới với handbook liền kề upstream/downstream trong mô hình job-order CNC;
- phần việc nào hệ thống đang gán tạm vì chưa có JD hoặc chưa tách subfunction.

---

## 7. Quy tắc đồ họa và format cho handbook

- Header owner dùng `department code` chip, không dùng câu dài.
- Approver vẫn phải là `role code` hoặc bundle hợp lệ; không dùng `department code`.
- Role trong cùng phòng hiển thị bằng `role chip` có link JD.
- Phân hệ hiển thị bằng `department chip` có link handbook tương ứng.
- Trong bảng interface:
  - cột “nhận từ / giao cho” có thể dùng `department code` nếu đang nói về interface chức năng;
  - cột owner quyết định hoặc escalation phải dùng `role code`.
- Trong bảng output/KPI/data:
  - cột owner cấp chức năng dùng `department code` nếu đang nói về ownership cấp phòng ban;
  - cột quyết định/sign-off/escalation dùng `role code`;
  - không để lẫn `department code` vào cột vốn được định nghĩa là quyết định cá nhân.
- Không dùng văn bản nửa Anh nửa Việt như `Customer Dịch vụ`, `Quy trình Owner`, `all functions`, `Department Head`.
- Không để placeholder như `các phòng liên quan`, `các phòng chức năng`, `line manager`, `line owner`, `bộ phận chuyên môn` trong handbook phát hành.
- Không đưa note biên tập, note migration, note “bản này thay bản trước” vào handbook.
- Link handbook trong index, TOC, preface, note, legend hoặc reference list PHẢI hiển `D-code` canonical của handbook đích.
- Subfunction code như `D-PPC`, `D-WHS`, `D-LOG`, `D-PUR`, `D-TCR`, `D-ERP` chỉ hiển trong owner/RACI/interface khi ngữ cảnh thật sự là subfunction.
- Không dùng `D-PPC` làm nhãn cho department-summary link tới production handbook và không dùng `D-LOG` làm nhãn cho supply-chain handbook summary.

---

## 8. Phương pháp cập nhật bắt buộc

Khi sửa handbook hoặc tài liệu liên quan tới department boundary, thứ tự bắt buộc là:

1. đọc handbook hiện hành, handbook upstream/downstream liền kề, JD liên quan, SOP/WI/ANNEX nơi boundary đang được dùng;
2. đối chiếu với mô hình job-order CNC và benchmark quốc tế để xác định ranh giới thực tế của chức năng;
3. xác định rõ đâu là `role`, đâu là `department`, đâu là `subfunction`, đâu là `gap`;
4. chốt nội dung riêng cho từng tài liệu, từng phòng ban một, không sửa đồng loạt cơ học;
5. cập nhật handbook/JD nguồn;
6. cập nhật workbook từ điển và registry nếu phạm vi đã thay đổi;
7. rà lại matrix tổ chức, SOP và ANNEX liên đới rồi mới cập nhật HTML downstream.

Benchmark logic bổ sung:
- Phải đối chiếu với mô hình `job-order CNC` thực tế: `Sales / Customer Service`, `Engineering`, `Production`, `Quality`, `Supply Chain`, `IT / ERP`, `Finance`, `HR`, `EHS`.
- Nếu tài liệu phát sinh một phạm vi lặp lại ổn định mà handbook/JD hiện hành chưa bao phủ, phải đánh dấu gap và cập nhật handbook/JD trước khi đổi chip trong SOP/ANNEX.

Không được:
- search/replace hàng loạt tên phòng ban sang mã viết tắt mà không đọc ngữ cảnh;
- dùng cùng một bộ bullet/authority/KPI cho mọi handbook;
- “vá chữ” trên một handbook đã sai cấu trúc thay vì chốt lại role boundary trước;
- dùng bản dịch máy hoặc cụm lai tiếng Anh/tiếng Việt trong tài liệu phát hành;
- sửa SOP/RACI trước khi sửa handbook/JD nguồn;
- thêm `D-code` mới chỉ vì muốn gọn bảng nếu công việc đó vẫn chỉ là trách nhiệm của một JD đơn lẻ.

---

## 9. Checklist QA trước khi phát hành

- `department code` có đúng loại department/subfunction không?
- role quyết định đã truy về JD chưa?
- ô interface cấp chức năng có đang dùng role code sai chỗ không?
- handbook có nêu rõ phạm vi không thuộc trách nhiệm phòng ban không?
- handbook có ghi rõ coverage gap đang tồn tại không?
- KPI có owner, ngưỡng số và dữ liệu nguồn không?
- mọi chip department đều link đúng handbook?
- link handbook có đang hiện đúng `D-code` canonical của handbook đích không?
- subfunction chip có xuất hiện đúng ngữ cảnh subfunction, không đội lốt department summary không?
- mọi chip role đều link đúng JD?
- workbook `Phong ban` và `Department code & handbook link` đã sync chưa?
- matrix/ANNEX/SOP liên đới đã cập nhật theo boundary mới chưa?
- còn sót cụm `Department`, `Process Owner`, `Customer Dịch vụ`, `all functions`, `team lead/supervisor`, `các phòng liên quan`, `các phòng chức năng`, `line manager`, `line owner` hoặc chữ lai không?
