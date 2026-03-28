# Job-Order CNC Department Boundary Model

> Mục đích: tài liệu tham chiếu để nghiên cứu và chốt ranh giới phòng ban/phan hệ trước khi sửa handbook, SOP, ANNEX hoặc JD.

## 1. Cách dùng tài liệu này

Tài liệu này không phải SOP. Nó là reference model để người viết:
- hiểu cấu trúc phòng ban phổ biến của mô hình `job-order CNC`;
- đối chiếu với HESEM hiện tại;
- phát hiện coverage gap;
- tránh cập nhật cơ học khi chuẩn hóa `department code`.

## 2. Nguồn tham chiếu quốc tế đã dùng

Các nguồn dưới đây không phải “luật bắt buộc” cho HESEM. Chúng được dùng để suy luận mô hình vận hành phổ biến và ranh giới chức năng thường thấy của job shop / job-order manufacturing:

- ProShop ERP — [Sales & Work Orders](https://proshoperp.com/product/sales-work-order-process/)
- ProShop ERP — [Modules / Estimating & Quoting / Quality Systems Management & Inspection](https://proshoperp.com/proshop-modules/)
- ERPNext — [Work Order](https://docs.frappe.io/erpnext/user/manual/en/work-order)
- ERPNext — [Job Card](https://docs.frappe.io/erpnext/user/manual/en/job-card)
- ERPNext — [Routing](https://docs.frappe.io/erpnext/user/manual/en/routing)
- ERPNext — [Quality Inspection](https://docs.frappe.io/erpnext/user/manual/en/quality-inspection)
- MRPeasy — [Manufacturing Orders](https://www.mrpeasy.com/resources/user-manual/production-planning/manufacturing-orders/)
- MRPeasy — [Routings](https://www.mrpeasy.com/resources/user-manual/production-planning/routings/)
- MRPeasy — [Overlap and Special Sequences of Manufacturing Operations](https://www.mrpeasy.com/resources/user-manual/settings/system/professional-functions/overlap-and-sequence-of-manufacturing-operations/)
- APQC — [Applying the PCF for Business Value](https://www.apqc.org/sites/default/files/files/PCF%20Collateral/Applying%20the%20PCF%20for%20Business%20Value%20-%20FINAL.pdf)
- APQC — [Manage Financial Resources](https://www.apqc.org/sites/default/files/K04087_8.0_Manage_Financial_Resources.pdf)
- APQC — [HCM Organization Measure List](https://www.apqc.org/sites/default/files/osb/297%20-%20HCM%20Organization%20Measure%20List.pdf)
- APQC — [Information Technology Measure List](https://www.apqc.org/sites/default/files/osb/299%20-%20Information%20Technology%20Measure%20List.pdf)

## 3. Nhận định rút ra từ benchmark

### 3.1 Ranh giới thường thấy

Mô hình job-order CNC quốc tế gần như luôn tách rõ:
- Sales / Customer Service / Estimating
- Engineering / Routing / Programming / Release
- Production Planning and Control
- Shopfloor Execution
- Quality / Inspection / Metrology / NCR-CAPA
- Supply Chain / Purchasing / Receiving / Warehouse / Shipping
- Finance / Costing / Invoicing / AR-AP
- HR / Competence / Onboarding-Offboarding
- IT / Digital Platform / Access / Backup
- ERP or Business System Administration khi hệ thống đủ lớn để tách khỏi IT hạ tầng

### 3.2 Điểm nhất quán nổi bật

- `Work Order` và `Routing` luôn tách planning/engineering khỏi execution.
- `Job Card` hoặc lệnh công đoạn luôn đặt trọng tâm ở tuyến hiện trường thay vì dồn hết cho một “quản lý chung”.
- `Quality Inspection` luôn là lớp độc lập với production execution.
- purchasing / receiving / stock / shipping là các điểm handoff khác nhau, không nên gom thành “kho” chung chung.
- ERP/business system administration thường không được phép tự sở hữu logic nghiệp vụ; họ cấu hình và bảo vệ transaction integrity, còn process owner giữ quyết định nghiệp vụ.

### 3.3 Suy luận áp dụng cho HESEM

Từ các nguồn trên, mô hình phù hợp cho HESEM là:
- department layer: `D-SCS`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-HR`, `D-EHS`, `D-IT`
- subfunction layer: `D-PPC`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-ERP`

Đây là suy luận vận hành từ benchmark và tài liệu nội bộ, không phải trích nguyên văn từ bất kỳ nguồn nào.

### 3.4 Ý nghĩa ranh giới theo từng phòng ban

- `D-SCS`: giữ giao tiếp khách hàng, RFQ clarity, quote assumptions, contract review và change log đối ngoại. Không được che quyết định kỹ thuật, chất lượng, lead time vật tư hoặc finance approval bằng câu chữ thương mại.
- `D-ENG`: giữ feasibility kỹ thuật, routing, process design, CAM/program release và baseline engineering package. Không thay production dispatch, quality release hay cam kết commercial.
- `D-PROD`: giữ execution tại hiện trường, readiness, dispatch, work transfer, recovery và resource use thật tại xưởng. Không thay engineering release hoặc quality disposition.
- `D-QUAL`: giữ inspection independence, metrology discipline, product release, NCR/CAPA, audit-system mechanics và quality evidence. Không được hấp thụ execution của sản xuất chỉ vì muốn “tiện”.
- `D-SCM`: giữ sourcing, receiving, warehouse integrity, tool crib, shipping handoff và traceability vật tư/logistics. Không thay QA trong quality disposition hoặc Engineering trong lựa chọn process.
- `D-FIN`: giữ invoicing, AR/AP, close, costing và kiểm soát tài chính. Trong mô hình job-order, cost accounting là lớp công việc thật chứ không phải báo cáo trang trí; nếu chưa có JD riêng thì handbook phải nêu rõ ai đang giữ tạm.
- `D-HR`: giữ manpower coordination, onboarding/offboarding, training administration, skills matrix và hồ sơ lao động. Sign-off năng lực kỹ thuật luôn phải quay về role quyết định của phòng chức năng tiếp nhận.
- `D-EHS`: giữ hazard system, permit discipline, incident learning và emergency readiness. Stop-work có thể xảy ra tại nguồn, nhưng plant-wide shutdown/restart vẫn phải theo thẩm quyền đã công bố.
- `D-IT`: giữ endpoint, network, identity, backup, platform support và recovery ở lớp hạ tầng. Không tự sở hữu nội dung dữ liệu nghiệp vụ hoặc logic giao dịch ERP.

### 3.5 Ý nghĩa các subfunction đã khóa

- `D-PPC`: dùng khi cần nhìn riêng planning, sequencing, dispatch và WIP control thay vì gom vào D-PROD chung chung.
- `D-PUR`: dùng cho sourcing, PO, supplier follow-up và material availability ở lớp mua hàng.
- `D-WHS`: dùng cho receiving, put-away, location control, lot integrity và inventory accuracy.
- `D-TCR`: dùng cho tool issue/return, preset, tool life evidence và traceability dụng cụ cắt.
- `D-LOG`: dùng cho booking, packing interface, shipment documents và carrier handoff.
- `D-ERP`: dùng cho application logic, role model, workflow, report logic, master-data guardrail và transaction integrity; không phải synonym của IT.

## 4. Heuristics để phân loại đúng thực thể

### 4.1 Dấu hiệu đó là Department/Subfunction

- trách nhiệm lặp lại ổn định ở nhiều SOP/WI;
- không phải một quyết định ký duyệt cá nhân;
- có đầu vào/đầu ra và handoff rõ;
- thường được gọi trong họp điều hành, dashboard, interface tables;
- nếu thay người giữ JD thì phạm vi chức năng vẫn còn nguyên.

### 4.2 Dấu hiệu đó là JD role

- có quyền ký hoặc nhả giữ;
- có thể bị truy trách nhiệm cá nhân;
- owner KPI hoặc owner action plan rõ;
- deputy/back-up phải chỉ định cho một cá nhân/role chứ không phải cả phòng ban.

### 4.3 Dấu hiệu đó là gap

- công việc có thật nhưng mọi tài liệu hiện tại đều né bằng cụm mơ hồ;
- một quyết định quan trọng đang “ngầm” do ai đó xử lý nhưng không có JD hoặc handbook nào ghi rõ;
- nhiều SOP nhắc tới cùng một nhóm việc nhưng mỗi tài liệu gọi một kiểu khác nhau;
- trong review thực tế, người dùng không trả lời được “ai là người có quyền quyết định cuối cùng”.

### 4.4 Cách phân biệt gap phòng ban với gap JD

- Nếu công việc là nhịp lặp lại cấp chức năng, có đầu vào/đầu ra rõ và vẫn tồn tại dù thay người, ưu tiên xem đây là `Department gap` hoặc `Subfunction gap`.
- Nếu vấn đề nằm ở quyền ký, phê duyệt ngoại lệ, sign-off kỹ thuật, hold/release hoặc cá nhân chịu trách nhiệm cuối cùng, ưu tiên xem đây là `JD gap`.
- Nếu benchmark quốc tế có một vai trò riêng nhưng HESEM chưa đủ tải để tách, handbook phải ghi rõ ai đang giữ tạm và trigger nào sẽ buộc mở JD riêng.
- Nếu benchmark quốc tế có một nhóm việc riêng nhưng HESEM mới chỉ có một người làm, không tự động tạo `D-code`; chỉ tạo khi nhóm việc đó đã ổn định thành một lớp chức năng lặp lại.

## 5. Rules để cập nhật tài liệu từ reference model

- Đọc tài liệu hiện hành trước, không dùng reference model để overwrite mù.
- Nếu benchmark gợi ý một ranh giới mới nhưng nội bộ chưa có JD/handbook hỗ trợ, phải ghi nhận gap.
- Nếu nội bộ có role thực tế nhỏ hơn benchmark, handbook phải ghi rõ cách giữ thẩm quyền tạm thời thay vì bịa role.
- Chỉ dùng benchmark để chốt logic ranh giới; không copy KPI hay text mô tả nguyên xi.
