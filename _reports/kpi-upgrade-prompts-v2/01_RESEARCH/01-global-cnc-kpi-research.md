# 01 — Nghiên cứu vận hành CNC toàn cầu để thiết kế KPI thực chiến

Mục tiêu: cung cấp triết lý, benchmark tư duy và thư viện khái niệm để Claude Code nâng cấp hệ KPI HESEM MOM thành hệ thống điều hành thật. Nội dung này không thay thế việc verify bảng/cột trong repo.

## 1. Các chuẩn/khung tham chiếu cần dùng

### 1.1 ISA-95 / IEC 62264 — tách lớp ERP–MES–MOM

Áp dụng: map KPI theo lớp dữ liệu và quyết định.

- Level 4 / ERP: đơn hàng, khách hàng, tài chính, vật tư, hóa đơn, nhà cung cấp.
- Level 3 / MOM-MES: scheduling, dispatch, WIP, equipment, production execution, quality, maintenance, inventory.
- Level 2/1 / machine-control: spindle/feed, downtime signal, sensor/PLC, inspection equipment.

Nguyên tắc KPI:

- KPI cấp công ty có thể tổng hợp từ Level 4+3, nhưng nguyên nhân đỏ phải drill down tới Level 3/2.
- KPI điều hành ngày/ca phải gần dữ liệu Level 3, đủ nhanh để hành động trong ca.
- KPI không nên trộn dữ liệu ERP chậm với shop-floor real-time mà không khai báo latency.

Nguồn tham khảo: ISA-95 là tiêu chuẩn tích hợp enterprise-control; Part 3 tập trung vào activity models của Manufacturing Operations Management. Trang ISA product và tổng quan ISA-95 nêu rõ phạm vi này:
- https://www.isa.org/products/ansi-isa-95-00-03-2013-enterprise-control-system-i
- https://en.wikipedia.org/wiki/ANSI/ISA-95

### 1.2 ISO 22400 — KPI cho Manufacturing Operations Management

Áp dụng: dùng làm checklist danh mục KPI manufacturing, đặc biệt các KPI về sản xuất, chất lượng, bảo trì, tồn kho, năng lượng, năng lực thiết bị.

Nguyên tắc:

- KPI phải định nghĩa bằng công thức máy đọc được.
- Dữ liệu phải có thời gian, nguồn, đối tượng đo.
- Phải phân biệt equipment effectiveness, process effectiveness, inventory, maintenance và quality.
- Không dùng KPI tổng hợp nếu chưa có khả năng drill down theo equipment/workcenter/job/product family.

Nguồn tham khảo: ISO 22400 là bộ chuẩn KPI cho Manufacturing Operations Management. Vì nội dung chuẩn đầy đủ có bản quyền, prompt chỉ dùng nguyên tắc công khai và yêu cầu Claude Code không sao chép nội dung chuẩn.

### 1.3 ISO 9001 / IATF 16949 — đo để quản trị QMS, phòng ngừa lỗi

Áp dụng: mọi KPI chất lượng phải gắn với monitoring, analysis, evaluation, customer satisfaction, nonconformity/CAPA và cải tiến.

Nguyên tắc:

- KPI chất lượng không chỉ là “lỗi sau cùng”; phải có lead metric phòng ngừa: control plan, FAI, SPC reaction, calibration, training, process capability.
- KPI đỏ phải dẫn đến containment/RCA/CAPA hoặc gate hold.
- Customer escape là lag metric nghiêm trọng; phải có lead metric đi kèm: FPY, final release RFT, FAI first-pass, ship packet completeness, traceability drill, IQC.
- KPI không được khuyến khích giấu NCR hoặc trì hoãn ghi nhận.

Nguồn tham khảo: ISO 9000 family nhấn mạnh customer focus, process-oriented approach và continual improvement; IATF 16949 nhấn mạnh defect prevention, giảm variation/waste trong chuỗi cung ứng automotive.
- https://www.iso.org/standards/popular/iso-9000-family
- https://www.iatfglobaloversight.org/iatf-169492016/about/

### 1.4 APQP / PPAP / FAI — gate readiness

Áp dụng: công ty CNC làm hàng kỹ thuật cao cần cổng G0→G7 không chỉ có RACI, mà phải có evidence pass.

Các artifact cần KPI/gate metric:

- RFQ/contract review completeness.
- DFM/manufacturability risk review.
- Process Flow / PFMEA / Control Plan approved before release.
- Supplier/material readiness and mill-cert verification.
- FAI / first article report right-first-time.
- PPAP/FAIR customer approval timeliness.
- SPC reaction and process capability for critical characteristics.
- Final release package completeness.
- Customer escape notification lead time.

Nguồn tham khảo:
- PPAP là quy trình chuẩn để chứng minh process có khả năng sản xuất part đáp ứng yêu cầu khách hàng; package thường gồm PFMEA, Control Plan, MSA, SPC và các hồ sơ liên quan.
- FAI xác minh quy trình mới/sửa đổi tạo ra part conforming theo drawing/specification, thường dùng trong aerospace/regulated manufacturing.
- https://en.wikipedia.org/wiki/Production_part_approval_process
- https://en.wikipedia.org/wiki/First_article_inspection

### 1.5 Baldrige — đo theo hệ thống, không đo manh mún

Áp dụng: KPI phải liên kết strategy, customers, workforce, operations, results.

Nguyên tắc:

- KPI cấp CEO phải là scorecard cân bằng, không chỉ một metric.
- Mỗi KPI phải có owner, review cadence, analysis, learning.
- Phải có management by fact: dữ liệu thật, không “cảm giác”.
- Hệ thống đo phải hỗ trợ agility, risk management, supply-chain resilience, workforce needs.

Nguồn tham khảo: NIST Baldrige Framework là khung giúp tổ chức cải thiện results và competitiveness, có các tiêu chí liên quan leadership, strategy, customers, measurement/analysis/knowledge management, workforce, operations, results.
- https://www.nist.gov/baldrige/publications/baldrige-excellence-framework

### 1.6 NIST/ASQ process capability — không đánh giá tỷ lệ nhỏ mẫu sai cách

Áp dụng: KPI tỷ lệ và process capability phải có sample-size gate.

Nguyên tắc:

- FPY/DPMO/complaint PPM/defect rate phải có `min_sample`.
- Dưới min_sample: hiển thị `grey/insufficient_data`, không reward/punish.
- Cpk/Cp chỉ có ý nghĩa khi process ổn định và có đủ mẫu; NIST Handbook nhắc “large enough” thường khoảng 50 independent data values cho capability estimates.
- Prototype/lot 1–2 part không nên kéo scorecard phòng ban như sản xuất lặp lại.

Nguồn tham khảo:
- NIST Engineering Statistics Handbook: Process Capability compares in-control process output to spec limits and mentions sample-size considerations.
- https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm

## 2. CNC job-shop khác mass production như thế nào

HESEM là bối cảnh gia công CNC job-shop/precision machining, có các đặc điểm:

1. High-mix low-volume: nhiều mã hàng, lô nhỏ, đổi setup liên tục.
2. Khách hàng kỹ thuật cao: drawing/specification, revision, FAI/PPAP/CoC/mill cert quan trọng.
3. Bottleneck thay đổi theo family: máy 5-axis, CMM, deburr/finish, heat treat outside, CAM programming có thể là điểm thắt.
4. Lead time bị ảnh hưởng bởi vật tư, fixture/tooling, NC program, setup, inspection.
5. Dữ liệu ERP/MES thường không hoàn hảo; cần staged/manual trung thực.
6. Một lô lỗi nhỏ có thể impact khách hàng lớn; không chỉ nhìn average.
7. Nhiều KPI dễ gaming: OTD bằng expediting/giao thiếu, FPY bằng sửa trước khi ghi nhận, NCR aging bằng trì hoãn mở/đóng, OEE bằng chạy máy không phải constraint, margin bằng không hạch toán rework.

Kết luận: KPI phải đo theo **event/gate/job/family/constraint**, không chỉ monthly average.

## 3. Lớp KPI đúng cho xưởng CNC

### 3.1 Company scorecard — 10–15 KPI tối đa

Mục tiêu: CEO/management review. Không cần nhiều nhưng phải cân bằng.

Nhóm nên có:

- Customer: OTD, Customer Escape/Complaint Rate, Customer Communication Closure OT.
- Quality: FPY/RTY, Final Release RFT, Repeat NCR Rate, CAPA Effectiveness.
- Delivery/flow: Plan Adherence, Promise Date Risk, WIP Aging.
- Constraint/throughput: OEE Bottleneck, Throughput per Constraint Hour, Constraint Lost Hours.
- Finance: Gross Margin by Job Family, COPQ, DSO, Invoice RFT.
- Safety/system: Recordable Incident Rate, Near-miss Reporting, Critical Role Coverage, BCP Readiness.
- Supplier: Supplier OTD, Supplier Quality PPM, Incoming Inspection First Pass.

Chỉ đưa lên scorecard nếu runtime hoặc manual governed. Staged chỉ hiện ở backlog, không tính điểm.

### 3.2 Weekly TOC / bottleneck scorecard

Mục tiêu: quản trị điểm thắt cổ chai và flow.

KPI trọng yếu:

- `OEE_BOTTLENECK`
- `THROUGHPUT_PER_CONSTRAINT_HOUR`
- `CONSTRAINT_LOST_HOURS`
- `BOTTLENECK_BUFFER_STATUS`
- `CONSTRAINT_STARVATION_BLOCKAGE_TIME`
- `SETUP_FIRST_PASS`
- `CYCLE_TIME_VARIANCE`
- `TOOLING_FIXTURE_READY_RATE`
- `CMM_QUEUE_AGING` nếu CMM là bottleneck
- `REWORK_LOAD_ON_CONSTRAINT`

### 3.3 Daily tier meeting metrics

Mục tiêu: hành động trong 24 giờ.

- Jobs at risk today/tomorrow.
- Material shortage blocking jobs.
- Machine downtime unplanned.
- First-piece failures today.
- NCR/hold count by cell.
- WIP aging at queue.
- Schedule recovery actions due.
- Safety near miss / PPE / LOTO.
- Calibration/tooling readiness blockers.
- Expedite count and reason.

### 3.4 Gate control metrics G0→G7

Mục tiêu: không cho việc đi qua cổng nếu thiếu evidence.

- G0 RFQ: RFQ completeness, RFQ turnaround, DFM risk triage.
- G1 Order Review: Order review RFT, contract/spec/revision complete.
- G2 Engineering Release: NC program/drawing/BOM/routing released on-time; PFMEA/control plan ready.
- G3 Material & Production Readiness: material availability, mill cert verification, tooling/fixture readiness.
- G4 FAI/First Piece: FAI first-pass, FAIR/PPAP package complete, first-piece cycle time.
- G5 In-process Control: SPC reaction time, in-process reject rate, control plan adherence.
- G6 Final Release: final release RFT, ship packet/CoC completeness, traceability drill.
- G7 Delivery/Post-delivery: OTD, ship-to-invoice, customer escape notification, complaint containment lead time.

### 3.5 Role performance measures

Mục tiêu: OJT/review công bằng, không đổ lỗi outcome hệ thống cho cá nhân.

Role measure nên:

- 3–5 measure/role.
- Chỉ đánh giá việc trong tầm kiểm soát.
- Có evidence form/log.
- Có counter-metric chống làm nhanh/ẩu.
- Không gọi là enterprise KPI nếu không nằm trong scorecard official.

## 4. Bộ KPI thư viện khuyến nghị

Chi tiết ở `02-cnc-kpi-library.md`. Tất cả KPI trong thư viện phải qua checklist:

1. Quyết định nào dùng KPI này?
2. Khi đỏ ai làm gì trong bao lâu?
3. Dữ liệu thật ở đâu?
4. Tử số/mẫu số/đơn vị/chỉều tốt/min_sample?
5. Owner có quyền xử lý không?
6. Counter-metric là gì?
7. Gaming phổ biến?
8. Lead/lag pair?
9. Có phải KPI hay chỉ là operating metric/gate/health?
10. Có đủ nguồn lực thu thập không?

## 5. Threshold philosophy

Không dùng benchmark “world-class” để ép xưởng khi data chưa ổn. Dùng 3 tầng:

- Initial green/yellow/red dựa vào thực tế và benchmark.
- Calibration period 2–3 tháng: không reward/punish, chỉ học dữ liệu.
- Stabilized thresholds: sau khi data đủ, update registry qua change-control.

Ví dụ:

- OTD: green ≥95%, yellow 90–94.99, red <90, min_sample ≥5 shipments.
- Customer escape PPM: green ≤100 ppm nếu khách precision/semiconductor, nhưng phải có min_sample đủ; lô ít dùng count + severity.
- FAI first-pass: green ≥98%, nhưng prototype/R&D có classification riêng.
- NCR aging: tính theo ngày mở, không theo ngày đóng.
- OEE: chỉ đánh giá theo planned production time; tách planned/unplanned downtime; không dùng OEE trung bình nếu constraint mới là thật.
- Cpk: chỉ đánh giá khi process stable, đủ mẫu, cùng characteristic/family.

## 6. Anti-gaming design patterns

| KPI chính | Cách gaming | Counter-metric/gate |
|---|---|---|
| OTD | Expediting tốn chi phí, giao thiếu, bypass inspection | Expedited/short-shipment rate, Final Release RFT, Complaint Rate |
| OEE | Chạy máy không phải bottleneck, sản xuất ahead gây tồn | Bottleneck buffer status, WIP aging, constraint idle time |
| FPY/FAI | Sửa trước khi ghi nhận, nới tiêu chí | Pre-count rework count, post-FAI production defect leakage |
| NCR closure | Không mở NCR, dồn đóng cuối kỳ | NCR open-aging from created_at, late-logged NCR rate |
| CAPA closure | Đóng CAPA hình thức | CAPA effectiveness / recurrence within 90 days |
| Setup time | Bỏ checklist setup | First-piece defect after setup, setup doc audit finding |
| Supplier OTD | Nhận hàng thiếu chứng từ/không đạt | IQC first-pass, mill-cert completeness |
| Gross margin | Không hạch toán rework/COPQ | Unallocated hidden job cost |
| Safety incident | Giấu near-miss | Near-miss reporting rate |
| Training completion | Học ký tên, không đủ năng lực | Competency pass / skill certification audit |

## 7. Output cần buộc Claude Code tạo

Mỗi stage prompt phải tạo report trong `_reports/kpi/`:

- findings có severity;
- decisions ADD/UPDATE/RETIRE/HOLD;
- before/after count runtime/staged/manual/retired;
- data contract backlog;
- false positives/false negatives của guard;
- screenshot/API dump verify;
- tự phản biện anti-gaming.

Không có report = chưa hoàn thành.
