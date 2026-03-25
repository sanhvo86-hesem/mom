# Đánh Giá Thực Chiến Mô Hình CNC Job-Order Theo ISO 9001 Và AS9100

Ngày đánh giá: 2026-03-22

## Kết luận điều hành

Mô hình QMS hiện tại **đủ thực chiến để vận hành một nhà máy CNC job-order high-mix/low-volume** và **đi đúng hướng ISO 9001 + AS9100**. Đây không phải bộ tài liệu “đẹp trên giấy”. Cấu trúc hiện tại đã chạm đúng những điểm mà doanh nghiệp CNC theo đơn hàng thường vỡ trận:

- vỡ revision ở điểm dùng
- release lịch quá tải rồi đẩy nghẽn xuống xưởng
- first-piece/FAI làm sau khi đã chạy loạt
- transfer giữa ca/máy không có gate
- supplier/special process chỉ kiểm bằng niềm tin
- traceability đứt ở split lot, remnant, outsource return và ship pack
- FOD, mixed hardware, wrong label, wrong cert bị coi là việc riêng của QA

**Phán quyết:** bộ tài liệu này đạt khoảng **8.5/10 về tính thực chiến vận hành**, nhưng mới đạt khoảng **7.5/10 về độ kín bằng chứng AS9100**. Muốn tự tin đứng vững trước audit khó và trước khách hàng aerospace nghiêm, phải đóng ngay 5 lỗ hổng vận hành được nêu ở mục “Khoảng trống bắt buộc phải khóa”.

## Nhận định chiến lược

Mô hình của HESEM là mô hình đúng cho CNC job-order:

- một đơn hàng, một owner, một dossier
- một schedule chính thức, không cho phép dispatch song song
- một baseline package theo Part/Rev và một snapshot theo Job
- release theo cổng kiểm soát, không chạy theo miệng
- first-piece/FAI dùng như gate vận hành, không dùng như biên bản hợp thức hóa
- work transfer, restart sau crash, restart sau hold đều phải xác nhận lại
- traceability đi xuyên supplier -> receipt -> lot -> WIP -> inspection -> shipment
- product safety, FOD, human factors không bị tách riêng khỏi vận hành

Đây là logic của một xưởng CNC nhiều mã ít lượng chạy theo độ phức tạp cao. Nó phù hợp với thực tế thế giới hơn hẳn mô hình ERP-only hoặc SOP-only.

## Điểm mạnh đã đạt chuẩn thực chiến

### 1. Chuỗi RFQ -> readiness -> execution -> ship được khóa đúng kiểu job-order

[SOP-201](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\02-SOP-200\sop-201-order-fulfillment-rfq-to-cash.html) đặt đúng logic “một job, một owner, một bộ bằng chứng”. Đây là cách đúng để tránh việc Sales, Engineering, Planning và Production mỗi bên giữ một phiên bản sự thật riêng.

### 2. Engineering không chỉ báo giá, mà thực sự làm risk-shaping trước khi job chạm máy

[SOP-301](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\03-SOP-300\sop-301-engineering-dfm-quoting-and-machining-planning.html) và [SOP-303](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\03-SOP-300\sop-303-engineering-release-baseline-package-and-job-snapshot-control.html) đã làm đúng 2 việc mà xưởng aerospace bắt buộc phải làm:

- khóa technical baseline theo Part/Rev
- khóa execution snapshot theo Job

Không có 2 lớp này thì CNC job-order luôn quay về trạng thái “mỗi người giữ một file”.

### 3. FAI/first-piece được dùng đúng bản chất

[SOP-302](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\03-SOP-300\sop-302-first-article-inspection-fai.html) dùng FAI như **execution gate**, không dùng như báo cáo đo kiểm làm sau. Tài liệu này đã chạm đúng tinh thần aerospace:

- full FAI
- delta FAI
- trigger revalidation
- linkage giữa drawing, setup, program, gage, measurement method và release decision

Đây là điểm mạnh lớn.

### 4. Planning và dispatch được thiết kế như hệ điều hành nhà máy, không phải file Excel trang trí

[SOP-501](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\05-SOP-500\sop-501-production-planning-scheduling-and-dispatch-control.html) đã có đúng các đòn bẩy quốc tế cho high-mix CNC:

- một schedule chính thức
- finite-capacity planning
- freeze window
- WIP cap
- queue aging
- hot-job ladder
- recovery plan

Đây là nền rất mạnh. Nhiều nhà máy CNC nhỏ và vừa không có tới mức này.

### 5. Setup, changeover, work transfer và restart control đã đi đúng chất xưởng thật

[SOP-504](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\05-SOP-500\sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html), cùng [FRM-518](C:\Users\TEST4\qms.hesem.com.vn\04-Bieu-Mau\05-FRM-500\FRM-518_Work_Transfer_Validation_Record.xlsx) và [FRM-519](C:\Users\TEST4\qms.hesem.com.vn\04-Bieu-Mau\05-FRM-500\FRM-519_Job_Packet_Quick_Check_and_Pre_Run_Verification.xlsx), đang chặn đúng nhóm scrap nặng nhất:

- wrong program
- wrong setup
- wrong fixture
- wrong WCS/offset
- restart sau crash không tái xác nhận
- transfer giữa ca/máy mà mất trạng thái

Đây là điểm “rất thực chiến”.

### 6. Supplier, special process, traceability, counterfeit, FOD và human factors đã được đặt đúng vị trí hệ thống

Các tài liệu sau tạo ra một bộ khung rất mạnh:

- [SOP-401](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\04-SOP-400\sop-401-supplier-control-and-special-process.html)
- [SOP-402](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\04-SOP-400\sop-402-material-verification-traceability-and-counterfeit-prevention.html)
- [SOP-703](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\07-SOP-700\sop-703-product-safety-conformity-and-fod-prevention.html)
- [SOP-804](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\08-SOP-800\sop-804-human-factors-and-error-proofing.html)

Điểm đúng ở đây là: các chủ đề này không bị đẩy ra ngoài vận hành. Chúng đã chạm thẳng vào machine setup, receipt gate, pack gate, ship gate và corrective action.

## Mức độ bám ISO 9001

Mô hình hiện tại bám rất đúng tinh thần ISO 9001:2015:

- process approach
- risk-based thinking
- operational planning and control
- documented information phục vụ vận hành chứ không phục vụ hình thức
- competence và awareness gắn với role/gate thực tế
- evidence-based decision making

Điểm mạnh nhất là hệ tài liệu đã biến yêu cầu ISO thành rule điều hành. Nó không dừng ở câu chữ chung.

## Mức độ bám AS9100

Mô hình hiện tại bám khá sâu vào các lớp bổ sung quan trọng của AS9100:

- operational risk management
- product safety
- special requirements / critical items / key characteristics
- configuration management
- counterfeit parts prevention
- expanded production controls
- human factors
- stronger external provider controls

Đây là điểm khác biệt lớn so với QMS CNC thông thường. Bộ của HESEM không còn là “ISO 9001 có thêm vài dòng aerospace”. Nó đã có cấu trúc gần đúng logic AS9100 thật.

## Khoảng trống bắt buộc phải khóa

### 1. Configuration supersedure / withdrawal ph?i gi? k? lu?t v?n h?nh

Kho?ng tr?ng n?y ?? ???c kh?a b?ng workbook [FRM-307](C:\Users\TEST4\qms.hesem.com.vn\04-Bieu-Mau\03-FRM-300\FRM-307_Package_Supersedure_and_Withdrawal_Notice.xlsx).

[SOP-303](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\03-SOP-300\sop-303-engineering-release-baseline-package-and-job-snapshot-control.html) hi?n ?? c? form ch?nh th?c cho supersede/withdrawal v? obsolete sweep. ?i?m c?n ph?i gi? nghi?m l? k? lu?t d?ng form t?i m?y, CMM, kiosk, kho v? pack desk.

K?t lu?n:

- logic ?? ??ng
- b?ng ch?ng v?n h?nh ?? c? form chu?n
- hi?u l?c th?t ph? thu?c v?o vi?c sweep ??ng th?i gian v? ??ng ?? evidence

N?u kh?ng ??ng log withdrawal/sweep r? r?ng, nh? m?y v?n c? nguy c? wrong-revision t?i ?i?m d?ng khi ??i package gi?a ch?ng.

### 2. Bộ kiểm soát mạnh nhưng có nguy cơ quá tải hành chính nếu không phân tầng rủi ro

Bộ biểu mẫu hiện tại rất dày. Điều này tốt cho control, nhưng nếu áp cùng một mức lên mọi job thì xưởng sẽ tạo shadow system để né thủ tục.

Phải khóa rõ 3 tầng:

- low-risk repeat jobs
- medium-risk jobs
- high-risk / aerospace-critical / CTQ / special-process / cleanliness-sensitive jobs

Mỗi tầng phải có minimum evidence pack riêng. Không được dùng một bộ gate dày như nhau cho mọi job.

### 3. SoR và SSOT phải gắn transaction thật, không được tách đôi

Rất nhiều SOP đã nhắc đúng:

- ERP là SoR giao dịch
- M365/SharePoint là SSOT hồ sơ

Nhưng muốn “thực chiến thật”, nhà máy phải khóa kỷ luật này tới tận ca làm:

- job status
- release status
- lot issue
- ship mapping
- hold/release state

Không được cho phép tồn tại vận hành song song bằng chat, file local hoặc verbal release.

### 4. Cần drill retrieval và drill failure response như một phần bắt buộc của hệ thống

Tài liệu đã nói tới retrieval clock và containment. Tuy nhiên hệ thống chỉ thật sự đạt chuẩn aerospace khi drill được làm định kỳ:

- shipment -> source/cert retrieval trong 30 phút
- wrong-revision sweep tại điểm dùng trong 1 ca
- lost tool / FOD containment trong 15 phút
- work transfer validation ở job rủi ro
- restart sau crash / maintenance có đủ evidence

Không có drill, control chỉ là giả định.

### 5. Cần authorization matrix thật ở cấp máy, process family và job class

Với job-order CNC, “được đào tạo rồi” là chưa đủ. Phải có ma trận phân quyền thao tác thật:

- máy nào được setup
- máy nào chỉ được operate, không được release first-piece
- loại job nào bắt buộc second-person verification
- loại change nào bắt buộc QA/Engineering release

Nếu không, human factors sẽ phá hỏng hệ thống mạnh nhất.

## Phán quyết theo góc nhìn vận hành thế giới

Nếu so với thực hành quốc tế của các xưởng CNC aerospace/job-shop tốt, mô hình này **đi đúng hướng và mạnh hơn mặt bằng chung ở cấp SOP architecture**. Điểm mạnh thật sự nằm ở 4 chỗ:

1. Nhà máy đã nhìn planning, engineering release, setup, FAI, supplier control, traceability và ship release như một chuỗi thống nhất.
2. Nhà máy đã đưa product safety, FOD và human factors vào vận hành, không để chúng sống ở “bộ phận chất lượng”.
3. Nhà máy đã hiểu đúng bản chất high-mix/low-volume: issue chính là config drift, dispatch drift, transfer drift và evidence drift.
4. Nhà máy đã bắt đầu xây được rule theo gate, role boundary và evidence pack. Đây là nền đúng để scale.

Nếu đóng 5 khoảng trống ở trên, mô hình này có thể đứng được trong môi trường CNC job-order nghiêm túc và vẫn giữ được logic ISO 9001 + AS9100.

## Lệnh hành động

### Trong 15 ngày

- Duy tr? b?t bu?c `FRM-307 Package Supersedure and Withdrawal Notice` cho m?i s? ki?n supersede/withdrawal.
- Khóa rule obsolete sweep tại máy, CMM, kiosk, kho và pack desk.
- Phân tầng job class theo risk để giảm quá tải hành chính.
- Chạy 1 bài drill wrong-revision và 1 bài drill shipment-to-source retrieval.

### Trong 30 ngày

- Pilot đầy đủ trên 3 họ job: repeat low-risk, CTQ/high-risk, outsource/special-process.
- Đo bắt buộc 6 KPI:
  - first-pass setup success
  - plan adherence trong freeze window
  - queue aging đỏ
  - retrieval time shipment -> source
  - cert completeness
  - wrong-revision / wrong-program / mixed-lot incidents

### Trong 90 ngày

- Khóa scan-to-action tại receipt, issue-to-job, transfer và ship pack.
- Gắn live dashboard cho hot-job damage, work-transfer escapes, obsolete sweep closure và trace drill closure.
- Rà lại toàn bộ JD để quyền release/HOLD đúng với gate thật, không chồng chéo.

## Tài liệu nội bộ trọng yếu dùng để đối chiếu

- [SOP-201](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\02-SOP-200\sop-201-order-fulfillment-rfq-to-cash.html)
- [SOP-301](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\03-SOP-300\sop-301-engineering-dfm-quoting-and-machining-planning.html)
- [SOP-302](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\03-SOP-300\sop-302-first-article-inspection-fai.html)
- [SOP-303](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\03-SOP-300\sop-303-engineering-release-baseline-package-and-job-snapshot-control.html)
- [SOP-401](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\04-SOP-400\sop-401-supplier-control-and-special-process.html)
- [SOP-402](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\04-SOP-400\sop-402-material-verification-traceability-and-counterfeit-prevention.html)
- [SOP-501](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\05-SOP-500\sop-501-production-planning-scheduling-and-dispatch-control.html)
- [SOP-502](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\05-SOP-500\sop-502-cnc-machining-operations.html)
- [SOP-504](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\05-SOP-500\sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html)
- [SOP-703](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\07-SOP-700\sop-703-product-safety-conformity-and-fod-prevention.html)
- [SOP-804](C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\01-SOPs\08-SOP-800\sop-804-human-factors-and-error-proofing.html)

## Nguồn chuẩn quốc tế dùng để đối chiếu

- ISO 9001 overview: [ISO 9000 family — Quality management](https://www.iso.org/cms/%20render/live/en/sites/isoorg/home/standards/popular-standards/iso-9001.html)
- ISO official guidance: [ISO 9001:2015 - How to use it](https://committee.iso.org/files/live/sites/tc176sc2/files/documents/iso_9001-2015_-_how_to_use_it.pdf.pdf)
- ISO official guidance: [Implementation Guidance for ISO 9001:2015](https://www.iso.org/files/live/sites/isoorg/files/archive/pdf/en/iso9001implementation_guidance.pdf)
- IAQG official overview: [9100 revision 2016 - Executive Overview](https://iaqg.org/wp-content/uploads/2019/11/9100-2016_Executive-Overview_-10-16-2019.pdf)
- IAQG official SCMH overview: [SCMH Communication Pack 2024](https://scmh.iaqg.org/wp-content/uploads/2024/08/SCMH-Communication-Pack-21AUG2024-2.pdf)
- NIST official manufacturing planning/control reference: [NIST AMS 100-2](https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.100-2.pdf)

## Kết luận cuối

Mô hình HESEM **đã đúng trục**, **đủ độ sâu**, và **có tính thực chiến thật** cho CNC job-order. Không được quay lui về mô hình đơn giản hơn. Việc phải làm bây giờ không phải viết lại từ đầu. Việc phải làm là **khóa bằng chứng vận hành còn hở**, đặc biệt là configuration supersedure/withdrawal, drill retrieval, risk-tiered evidence và authorization ở cấp máy/job.
