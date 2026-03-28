# 19. Role Boundary, JD Linking and Role Codes

> Version: v1 | Date: 2026-03-28 | Owner: QMS Engineer

---

## 1. Mục tiêu

Tài liệu này khóa chuẩn bắt buộc cho toàn bộ hệ thống QMS khi dùng chức danh, vai trò chủ trì, quyền hạn, RACI, cổng kiểm soát và KPI owner trong mô hình `job-order CNC`.

Mục tiêu là chặn 5 lỗi hệ thống:
- dùng chức danh trôi dạt, không khớp JD thật;
- dùng placeholder mơ hồ như `Process Owner`, `Department Head`, `Responsible Person`, `Data Owner` như thể đó là chức danh;
- dùng một vai trò không có trong JD nhưng vẫn giao quyền vận hành thật;
- ghi dài dòng ở header/RACI khiến người đọc không nhận ra ai có quyền thật;
- thay thế chức danh cơ học mà không nghiên cứu ranh giới vai trò của chính SOP đó.

---

## 2. Chuẩn nguồn chân lý

Nguồn chân lý vai trò gồm 3 lớp, theo thứ tự ưu tiên:

1. `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/`
2. `tools/data/role-registry-job-order-cnc.json`
3. `tools/data/qms-terminology-dictionary.xlsx`

Nếu 3 lớp này mâu thuẫn nhau:
- JD thật là nguồn gốc đầu tiên để xác nhận có hay không có vị trí;
- role registry là nguồn gốc hiển thị dùng cho header/RACI/link JD;
- workbook là từ điển tham chiếu cho người soạn thảo, không được phép đi ngược JD/registry.

Không được phát hành SOP/WI/ANNEX/JD mới nếu vai trò trong tài liệu chưa được resolve vào một trong 3 lớp trên.

---

## 3. Mô hình chuẩn cho job-order CNC

HESEM vận hành theo mô hình `job-order CNC`, tức:
- high-mix, low-to-medium volume;
- luồng RFQ -> contract review -> engineering release -> material readiness -> setup -> first-piece/FAI -> production -> final release -> shipment;
- nhiều handoff giữa thương mại, kỹ thuật, kế hoạch, xưởng, QC và logistics;
- quyền HOLD rộng hơn quyền RELEASE;
- mỗi gate chỉ đi tiếp khi đủ bằng chứng.

Vì vậy ranh giới vai trò phải tách rõ:
- vai trò giao tiếp khách hàng;
- vai trò định giá thương mại;
- vai trò feasibility/DFM;
- vai trò process/routing/setup standard;
- vai trò CAM/NC;
- vai trò planning/dispatch;
- vai trò workshop execution;
- vai trò setup/prove-out;
- vai trò operator execution;
- vai trò QC execution;
- vai trò quality governance/release;
- vai trò metrology/MSA confidence;
- vai trò supply chain sourcing;
- vai trò warehouse/logistics execution;
- vai trò finance closing;
- vai trò HR/EHS/IT system support.

Không được gộp các ranh giới này chỉ vì tài liệu cũ từng viết gộp.

---

## 4. Base Roles và Governance Hats

### 4.1 Base roles

Base role là vị trí có JD thật. Ví dụ:
- `CEO`, `PD`
- `ENGM`, `DFM`, `PE`, `CAM`
- `PPL`, `WKM`, `SL`, `SET`, `OPR`, `MNT`
- `QA`, `QE`, `QMS`, `QCL`, `QC`, `MCS`, `IAO`
- `SCM`, `BUY`, `WAR`, `TOOL`, `LOG`
- `CS`, `EST`
- `FIN`, `APAR`, `GLP`
- `HR`, `EHS`, `ITA`, `ESA`
- `CPS`, `CPT`, `DBL`, `DBT`

Base role chỉ được tạo khi:
- có JD riêng;
- có đường báo cáo rõ;
- có ranh giới trách nhiệm ổn định;
- có nhu cầu dùng lặp lại trong nhiều tài liệu.

### 4.2 Governance hats

Governance hat không phải vị trí độc lập. Đó là “mũ” quản trị gắn lên một base role.

Các hat chuẩn hiện hành:
- `QA[QMR]`
- `QMS[DC]`
- `QMS[LA]`
- `PIE[CI]`
- `QA[PSO]`
- `CEO[IC-BIZ]`
- `PD[IC-PROD]`
- `EHS[IC-EHS]`
- `ITA[IC-IT]` hoặc `ESA[IC-IT]`

Quy tắc:
- không viết trần `QMR`, `Document Controller`, `Lead Auditor`, `CI Lead`, `Product Safety Officer`, `Incident Commander`;
- phải gắn hat lên host role thật;
- nếu một hat đổi host role thì phải cập nhật cả JD, role registry và tài liệu liên quan.

### 4.3 Role bundles

Role bundle không phải JD mới. Đây là nhóm explicit của nhiều base role thật, dùng khi một trách nhiệm xuyên nhiều vai trò nhưng vẫn phải truy về JD gốc của từng người.

Bundle chuẩn hiện hành:
- `TOP_MGMT`
- `FUNC_HEADS`
- `COMMERCIAL_FRONT`
- `QUALITY_CORE`
- `ENG_RELEASE_CORE`
- `AREA_LEADS`

`AREA_LEADS` trong bối cảnh `job-order CNC` là bundle cho vai trò dẫn dắt hiện trường và kiểm soát khu vực vận hành, hiện chốt gồm:
- `SL`
- `WKM`
- `CPS`
- `QCL`

Quy tắc:
- không tạo bundle để che mờ trách nhiệm;
- bundle chỉ dùng khi trách nhiệm thực sự là lớp actor chung, không phải một JD đơn lẻ;
- nếu quy trình chỉ áp cho một khu vực hẹp thì phải dùng subset explicit hoặc base role cụ thể, không lấy bundle rộng cho tiện.

---

## 5. Placeholder bị cấm trong owner/RACI

Các cụm sau bị cấm xuất hiện độc lập trong header, owner cell, RACI cell, hold/release authority cell hoặc approver cell:
- `Process Owner`
- `Department Head`
- `Functional Head`
- `Lead Department`
- `Responsible Person`
- `Document Owner`
- `Data Owner`
- `Top Management`
- `Approval Board`
- `Change Owner`
- `Commercial Responsible Person`

Nếu cần dùng các khái niệm này, phải resolve thành một trong 3 dạng:

1. Một base role cụ thể.
2. Một governance hat gắn trên base role.
3. Một explicit role bundle gồm nhiều base role được render bằng nhiều role chips có link JD.

Ví dụ đúng:
- `QA[QMR]`
- `QMS[DC]`
- `CS / EST / PPL`
- `PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`

Ví dụ sai:
- `Process Owner`
- `Department Head + QA`
- `Responsible Person Thương mại`
- `Top Management`

---

## 6. Quy tắc hiển thị

### 6.1 Header

Header dùng role code rút gọn, không dùng chức danh dài.

Ví dụ đúng:
- `Chủ sở hữu: QMS[DC] + QA[QMR]`
- `Chủ sở hữu: CS / EST / PPL`
- `Phê duyệt: CEO`

Role code trong header phải:
- hiển thị bằng chip ngắn;
- link trực tiếp tới JD tương ứng;
- dùng đúng relative path;
- không để text trần khi đã có JD.

### 6.2 Section 4 / 6 / 8 / RACI / owner columns

Trong các bảng vai trò, authority, gate, hold/release, exception:
- ưu tiên dùng role code chip;
- nếu cần nhiều vai trò, render nhiều chip;
- không dùng text dài khi có thể render chip.

### 6.3 Narrative prose

Trong thân tài liệu:
- thuật ngữ vận hành theo rule `English term (tiếng Việt chuẩn)` của Section 3;
- còn chức danh JD dùng tên English chuẩn nếu cần viết đầy đủ trong câu;
- không dùng nửa Anh nửa Việt kiểu `QA Lead`, `Customer Dịch vụ`, `Governance viên hệ thống Epicor`, `Production Engineer-IE`.

### 6.4 Placeholder trong prose và label cột

Trong prose, note, label cột hoặc giải thích:
- không để nguyên English placeholder kiểu `Responsible Person`, `Top Management`, `Supervisor` nếu tài liệu đang viết tiếng Việt;
- phải đổi thành tiếng Việt vận hành chuẩn, hoặc resolve thành role code / role bundle nếu đó là owner thực;
- ví dụ:
  - `Responsible Person` -> `người chịu trách nhiệm` hoặc `vai trò chủ trì`
  - `Top Management` -> `Ban lãnh đạo` hoặc bundle explicit như `TOP_MGMT`
  - `Supervisor` -> mô tả đúng bối cảnh như `cấp quản lý hiện trường` hoặc resolve thành bundle `AREA_LEADS`

Không được dùng English placeholder như một lối tắt vì sẽ làm mờ ranh giới trách nhiệm.

---

## 7. JD Rules

Mỗi JD phải có:
- mã JD rút gọn theo role code, ví dụ `JD-QA`, `JD-CS`, `JD-PPL`;
- title English chuẩn;
- subtitle tiếng Việt chuẩn;
- row `Mã vai trò dùng trong SOP/RACI`;
- nếu có, row `Mũ quản trị có thể gắn`.

Meta header của JD phải dùng nhãn tiếng Việt:
- `Mã`
- `Phiên bản`
- `Ngày hiệu lực`
- `Chủ sở hữu`
- `Phê duyệt`

Các vùng được phép dùng role chip trong JD:
- header owner/approver;
- row `Mã vai trò dùng trong SOP/RACI`;
- row `Mũ quản trị có thể gắn`;
- các bảng authority/RACI/quyền hạn nếu có.

Các vùng không được tự động render chip:
- `Chức danh theo tài liệu`
- title English của JD
- subtitle tiếng Việt của JD
- mô tả narrative đang dùng chức danh như một danh từ ngữ nghĩa, không phải cell quyền hạn.

Nếu SOP phát sinh một vai trò lặp lại mà chưa có JD:
- không được vá tạm bằng text tự nghĩ;
- phải quyết định đó là base role mới hay governance hat;
- nếu là base role mới, phải tạo/cập nhật JD trước khi phát hành SOP;
- nếu là hat, phải cập nhật JD của host role để mô tả quyền, phạm vi và giới hạn của hat đó.

---

## 8. Phương pháp nghiên cứu vai trò trước khi sửa tài liệu

Khi gặp một vai trò/alias chưa rõ:

1. Đọc JD hiện có và tài liệu cũ để xem đang được hiểu như thế nào.
2. Đối chiếu benchmark chính thức bên ngoài theo đúng bối cảnh `job-order CNC`.
3. Chốt ranh giới:
   - ai giữ dữ liệu,
   - ai quyết định,
   - ai release,
   - ai chỉ execute,
   - ai có quyền stop.
4. Xác định vai trò đó là:
   - base role,
   - governance hat,
   - role bundle,
   - hay chỉ là placeholder phải cấm.
5. Cập nhật registry/JD/core-standard trước khi cập nhật SOP.

Không được làm ngược trình tự này.

---

## 9. Benchmark tối thiểu phải dùng

Khi chốt ranh giới vai trò cho job-order CNC, tối thiểu phải đối chiếu các nguồn chính thức phù hợp:
- ERP/MRP workflow docs chính thức như ERPNext, MRPeasy hoặc tương đương;
- nguồn nghề nghiệp chính thức như O*NET cho planner, industrial engineer, production manager, QC inspector, purchasing, customer service;
- nguồn chính thức về digital access/governance như Microsoft Learn, NIST khi vai trò chạm quyền hệ thống, emergency access, access review, least privilege;
- tiêu chuẩn/nguồn kỹ thuật chính thức khi vai trò chạm metrology, calibration, MSA, capability.

Không dùng blog marketing hoặc bài viết AI tổng hợp làm chuẩn ranh giới vai trò.

---

## 10. Checklist bắt buộc trước khi coi là xong

1. Mọi owner/approver cell đã link tới JD chưa?
2. Header đã dùng role code rút gọn chưa?
3. Có placeholder mơ hồ nào còn đứng độc lập không?
4. Governance hat có gắn đúng host role không?
5. Có vai trò nào đang dùng trong SOP nhưng không tồn tại trong JD/registry không?
6. Nếu có vai trò phát sinh, JD đã được cập nhật trước chưa?
7. Role boundaries có còn đè nhau giữa CS/EST, PE/CAM/DFM, PPL/WKM/SL, QA/QE/QCL/QC/MCS, SCM/BUY/WAR/LOG không?
8. Tài liệu có còn alias nửa Anh nửa Việt không?

Nếu có bất kỳ câu trả lời `chưa`, tài liệu chưa được xem là hoàn tất.
