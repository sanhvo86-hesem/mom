# BÁO CÁO ĐÁNH GIÁ CHUYÊN SÂU TÍNH THỰC CHIẾN CỦA HỆ THỐNG WORKFLOW HESEM QMS

**Ngày lập:** 2026-04-04
**Phạm vi:** 11 workflow canonical live + 12 WorkflowEngine template + 412 workflow library
**Phương pháp:** Đánh giá mã nguồn thực tế kết hợp so sánh tiêu chuẩn quốc tế (AS9100D, 21 CFR Part 11, ISA-95, ISO 27001, IATF 16949, CMMC/NIST 800-171)
**Góc nhìn chuyên gia:** Quality Management, Aerospace Manufacturing, MES/Industry 4.0, ERP Integration, Supply Chain, Cybersecurity, Software Architecture

---

## MỤC LỤC

1. [Tổng quan đánh giá](#1-tổng-quan-đánh-giá)
2. [Bảng điểm thực chiến tổng hợp](#2-bảng-điểm-thực-chiến-tổng-hợp)
3. [Phân tích chi tiết từng workflow](#3-phân-tích-chi-tiết-từng-workflow)
4. [Phân tích xuyên suốt (Cross-cutting concerns)](#4-phân-tích-xuyên-suốt)
5. [Gap Analysis so với tiêu chuẩn thế giới](#5-gap-analysis-so-với-tiêu-chuẩn-thế-giới)
6. [Lộ trình cải tiến theo ưu tiên](#6-lộ-trình-cải-tiến-theo-ưu-tiên)
7. [Kết luận](#7-kết-luận)

---

## 1. TỔNG QUAN ĐÁNH GIÁ

### 1.1 Điểm mạnh nổi bật (những thứ HESEM đang làm đúng)

| # | Điểm mạnh | Bằng chứng mã nguồn |
|---|-----------|---------------------|
| 1 | **Audit trail hash-chain tamper-proof** | `AuditTrail.php` dùng SHA256 chain, append-only, chuẩn bị sẵn e-sig block cho 21 CFR Part 11 |
| 2 | **WorkflowEngine có guard + condition trước transition** | `checkTransitionConditions()` kiểm `has_root_cause`, `has_action_plan`, `all_approvals` trước khi cho chuyển state |
| 3 | **Parallel approval + serial approval cùng hỗ trợ** | Evidence workflow cho phép cấu hình `approval_mode: serial|parallel` với `minimum_approvals` |
| 4 | **SLA tracking với 6 trạng thái rõ ràng** | Evidence SLA: `not_started -> tracking -> due_soon -> overdue -> escalated -> closed_*` |
| 5 | **Step-up re-authentication khi approve** | `evidence_review` yêu cầu nhập lại password (bcrypt verify) + capture signature hash |
| 6 | **Outbox pattern cho Epicor integration** | `OutboxWorker` với retry plan [1,5,15,30,60] phút, dead letter sau 5 lần, FIFO processing |
| 7 | **Shipment readiness gate 10 điểm kiểm soát** | `ShipmentGateService` check SG-01..SG-10 bao phủ từ contract review đến customer source inspection |
| 8 | **Skip-lot ANSI Z1.4 tự động** | `SupplierQualityService` implement tightened/normal/reduced/skip với switching rules đúng chuẩn |
| 9 | **Dual persistence** (PostgreSQL + JSON fallback) | WorkflowEngine và AuditTrail đều có fallback, tăng resilience |
| 10 | **Bilingual vi/en xuyên suốt** | Tất cả workflow label, error message, notification đều song ngữ |

### 1.2 Đánh giá tổng quan

**HESEM đang ở đâu so với thế giới?**

```
Mức 1 - Ad hoc              [  ]
Mức 2 - Managed             [  ]
Mức 3 - Defined             [##]  <-- HESEM hiện tại (phần lớn)
Mức 4 - Quantitatively Mgd  [  ]
Mức 5 - Optimizing          [  ]
```

Hệ thống đã vượt qua giai đoạn "tài liệu giấy + Excel" và có quy trình số hóa rõ ràng. Tuy nhiên, khoảng cách với **mức 4 (đo lường định lượng)** và **mức 5 (tự tối ưu)** vẫn còn đáng kể, đặc biệt ở các khía cạnh: real-time analytics, predictive quality, và automated escalation enforcement.

---

## 2. BẢNG ĐIỂM THỰC CHIẾN TỔNG HỢP

Thang điểm: **1** = Thiếu hoàn toàn | **2** = Sơ khai | **3** = Cơ bản đủ dùng | **4** = Tốt, cần tinh chỉnh | **5** = Đẳng cấp thế giới

| Workflow | State Machine | Audit Trail | RBAC | E-Sig | SLA | Notification | Integration | Error Handling | **TB** |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| W1. Doc HTML release | 4 | 4 | 3 | 2 | 2 | 2 | 3 | 3 | **2.9** |
| W2. Excel form release | 3 | 3 | 3 | 2 | 2 | 2 | 3 | 3 | **2.6** |
| W3. Online schema | 4 | 3 | 3 | 2 | 2 | 2 | 3 | 3 | **2.8** |
| W4. Record allocation | 4 | 4 | 3 | 2 | 2 | 2 | 3 | 3 | **2.9** |
| W5. Evidence review | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | **3.4** |
| W6. Release follow-up | 3 | 3 | 3 | 1 | 3 | 2 | 3 | 3 | **2.6** |
| W7. Order SO/JO/WO | 4 | 3 | 4 | 1 | 2 | 1 | 3 | 3 | **2.6** |
| W8. MES governance | 3 | 3 | 2 | 1 | 2 | 2 | 3 | 3 | **2.4** |
| W9. Epicor integration | 3 | 4 | 2 | 1 | 3 | 2 | 4 | 3 | **2.8** |
| W10. Supplier quality | 4 | 3 | 2 | 1 | 2 | 1 | 2 | 3 | **2.3** |
| W11. Shipment gate | 4 | 1 | 1 | 1 | 1 | 1 | 3 | 3 | **1.9** |
| **WorkflowEngine (12 tmpl)** | 4 | 5 | 4 | 2 | 4 | 3 | 2 | 2 | **3.3** |

**Trung bình toàn hệ thống: 2.7 / 5.0** -- Cơ bản đủ dùng, cần nâng cấp đáng kể ở nhiều mảng.

---

## 3. PHÂN TÍCH CHI TIẾT TỪNG WORKFLOW

### W1. Document HTML Release Control -- Điểm: 2.9/5

**Thực chiến:**
- State machine `draft -> in_review -> approved -> obsolete` đầy đủ cho document control cơ bản
- Snapshot `_INREVIEW` và `_DRAFT` ngăn approve trực tiếp từ DOM -- thiết kế an toàn
- SHA256 hash trên approved document -- đúng yêu cầu AS9100D §7.5

**Thiếu sót nghiêm trọng:**

| Gap | Mức độ | AS9100D Reference |
|-----|--------|-------------------|
| Không có read acknowledgment tracking | **Cao** | §7.5.3 -- kiểm soát phân phối, truy cập |
| Không timeout cho `in_review` -- tài liệu treo vô thời hạn | **Cao** | Best practice, không cho phép bottleneck |
| Không có mandatory comment khi reject | **Trung bình** | Cần traceability lý do reject |
| Không có multi-level approval (sequential) | **Trung bình** | AS9100D yêu cầu authority phù hợp |
| Không kiểm soát obsolete distribution -- ai còn giữ bản cũ? | **Cao** | §7.5.3.2 -- ngăn sử dụng nhầm |
| Không có document comparison/diff giữa revision | **Thấp** | Hỗ trợ reviewer |

**Khuyến nghị:**
1. Thêm **read acknowledgment** per user/role khi tài liệu release -- bắt buộc cho AS9100D audit
2. Thêm **review timeout** (ví dụ 72h) với auto-escalation
3. Enforce **reject reason** (minimum length) khi reject

---

### W2. Excel Form Blank Release Control -- Điểm: 2.6/5

**Thực chiến:**
- Dùng chung route `doc_approve` với nhánh xử lý riêng -- hợp lý, giảm code trùng lặp
- Private archive ngoài web root -- kiểm soát revision tốt
- Checksum + revision metadata cho upload validation

**Thiếu sót nghiêm trọng:**

| Gap | Mức độ | Lý do |
|-----|--------|-------|
| Excel là binary -- không thể diff, không render web | **Cao** | Reviewer phải download để xem, không verify inline |
| Không scan macro/malware trong uploaded workbook | **Cao** | Rủi ro bảo mật khi upload Excel từ bên ngoài |
| Không validate cell protection/structure khi upload | **Trung bình** | User có thể phá cấu trúc form |
| Không watermark version trên file Excel xuất ra | **Trung bình** | Rủi ro dùng nhầm bản obsolete ngoài hệ thống |

**Khuyến nghị:**
1. Thêm **Excel preview rendering** (server-side convert to HTML) để reviewer xem inline
2. Thêm **macro scanning** trước khi lưu draft -- reject file có macro không mong muốn
3. Cân nhắc **migration sang online form** dần thay thế Excel khi có thể

---

### W3. Online Form Schema Workflow -- Điểm: 2.8/5

**Thực chiến:**
- Rollback capability -- đưa version cũ về draft để chỉnh tiếp, không publish thẳng
- Working draft pattern -- mọi chỉnh sửa qua draft mới, không sửa live trực tiếp
- Archive live cũ thành `obsolete` khi publish mới

**Thiếu sót:**

| Gap | Mức độ | Lý do |
|-----|--------|-------|
| Không có impact analysis trước publish | **Cao** | Khi schema thay đổi, record đã submit theo schema cũ có thể bị ảnh hưởng |
| Không phân biệt field deprecation vs deletion | **Trung bình** | Xóa field = mất data lịch sử; nên deprecate trước |
| Không có schema migration cho record đang in-progress | **Cao** | Record allocated nhưng chưa submit sẽ bị lệch schema |
| Không có A/B testing hoặc canary release cho schema mới | **Thấp** | Best practice cho hệ thống lớn |

**Khuyến nghị:**
1. Thêm **impact analysis report** trước publish: "X record đang in-progress sẽ bị ảnh hưởng"
2. Implement **field deprecation** -- đánh dấu deprecated trước khi xóa vĩnh viễn
3. Thêm **schema compatibility check** cho record chưa submit

---

### W4. Record Allocation + Lifecycle -- Điểm: 2.9/5

**Thực chiến:**
- Atomic counter với file locking (`LOCK_EX`) -- tránh duplicate ID
- Dual mode online/offline -- phủ cả nhà máy không có mạng ổn định
- Allocation log `_allocation_log.jsonl` -- audit trail riêng cho ID generation
- Resubmission giữ nguyên mã, chỉ tăng revision

**Thiếu sót:**

| Gap | Mức độ | Lý do |
|-----|--------|-------|
| Không giới hạn số lần resubmit cho rejected record | **Trung bình** | Có thể vòng lặp vô tận reject-resubmit |
| AUTO-VOIDED logic không rõ trigger condition | **Trung bình** | Cần document rõ khi nào auto-void |
| Offline record download sau schema change = lệch schema | **Cao** | Record offline có thể dùng schema cũ |
| Không có barcode/QR code cho record tracing | **Trung bình** | Operator nhà máy cần scan nhanh |
| Counter race condition nếu nhiều process cùng request | **Trung bình** | `LOCK_EX` trên file nhưng không có distributed lock |

**Khuyến nghị:**
1. Thêm **resubmission limit** (configurable, ví dụ max 3 lần)
2. Thêm **schema version stamp** trong offline package để detect mismatch khi upload
3. Generate **QR code** chứa `record_id + allocation_id` cho mobile scanning

---

### W5. Evidence Review + Approval + SLA -- Điểm: 3.4/5 (CAO NHẤT)

**Thực chiến -- đây là workflow trưởng thành nhất:**
- SLA 6 trạng thái: `not_started -> tracking -> due_soon -> overdue -> escalated -> closed_*`
- SLA mặc định 72h review, 12h warning, 24h escalation -- configurable per record type
- Parallel approval với collector pattern + minimum_approvals check
- Step-up re-authentication (bcrypt password verify) khi approve
- Signature hash SHA256 capture
- Checklist evaluation đa loại: `required_fields`, `signatures`, `record_context`, `capa_effectiveness`

**Thiếu sót còn lại:**

| Gap | Mức độ | Lý do |
|-----|--------|-------|
| SLA escalation chỉ log, không gửi notification thật | **Cao** | `escalated_sent_at` tracked nhưng gửi thật defer cho external system |
| Không có delegation khi approver nghỉ phép | **Trung bình** | Bottleneck khi approver unavailable |
| Signature chỉ có hash + signer name, không có PKI/certificate | **Trung bình** | 21 CFR Part 11 yêu cầu non-repudiation mạnh hơn |
| Không track "ý nghĩa chữ ký" (meaning of signature) | **Cao** | 21 CFR Part 11 §11.50 bắt buộc ghi rõ "review", "approval", "responsibility" |
| Không giới hạn reopen lần -- có thể lạm dụng | **Thấp** | Cần policy reopen limit |

**Khuyến nghị:**
1. **Kích hoạt notification thật** cho SLA events -- đây là quick win lớn nhất
2. Thêm **signature meaning** (approval/review/witness) vào approval record
3. Integrate **delegation** từ WorkflowEngine (đã có code nhưng chưa dùng ở evidence)

---

### W6. Release Rollout Follow-up -- Điểm: 2.6/5

**Thực chiến:**
- Đóng vòng post-release -- đúng yêu cầu AS9100D change management
- Policy-based routing: resolve impacted departments, owner_roles, due_days
- Hook vào cả 3 loại release: HTML doc, Excel form, online schema

**Thiếu sót nghiêm trọng:**

| Gap | Mức độ | AS9100D Reference |
|-----|--------|-------------------|
| **Không có read acknowledgment per individual** | **Rất cao** | §7.2 (Competence) + §7.3 (Awareness) yêu cầu bằng chứng nhân viên đã biết thay đổi |
| Không link đến training record | **Cao** | Nếu thay đổi yêu cầu đào tạo, cần tạo training request tự động |
| Không có competency assessment sau follow-up | **Cao** | AS9100D §7.2 yêu cầu evaluate effectiveness of actions |
| `due_soon` và `overdue` là computed, không gửi notification | **Trung bình** | Chỉ hiện trên dashboard, không push đến người phụ trách |

**Khuyến nghị:**
1. **Thêm read acknowledgment** -- bắt buộc mỗi người liên quan xác nhận đã đọc/hiểu
2. **Auto-create training request** khi release follow-up item yêu cầu training
3. Gửi **notification overdue** tự động qua email/Zalo

---

### W7. Order SO -> JO -> WO -- Điểm: 2.6/5

**Thực chiến:**
- State machine 3 tầng rõ ràng: SO (kinh doanh), JO (sản xuất), WO (operation)
- ECR enforcement: field edit sau release yêu cầu Engineering Change Request
- Role-based cancel/reopen: chỉ CEO, production_director, it_admin được reopen
- Auto-action: check WO scheduled, update JO progress từ WO

**Thiếu sót nghiêm trọng:**

| Gap | Mức độ | Lý do |
|-----|--------|-------|
| **Không có notification khi transition** | **Rất cao** | Workflow chạy nhưng không ai biết khi nào SO confirmed, WO completed |
| Không tích hợp AuditTrail.php (hash-chain) | **Cao** | Change history chỉ embed trong orders.json, không tamper-proof |
| Không validate business logic: qty_ordered vs qty_completed | **Cao** | Over-production hoặc under-delivery không bị detect |
| Không có SLA tracking/due date enforcement | **Cao** | KPI formulas (OTD%) trong config nhưng không enforce |
| Concurrent write race condition trên orders.json | **Trung bình** | Nhiều operator cùng update WO = last write wins |
| Auto-action chỉ log warning, không enforce | **Trung bình** | WO chưa scheduled vẫn cho JO release (chỉ warning) |
| Không link ngược Epicor feedback khi WO complete | **Trung bình** | Outbox cho labor/material nhưng không confirm receipt |

**Khuyến nghị:**
1. **Integrate NotificationService** cho mọi transition (ưu tiên: SO confirmed, WO completed, JO on_hold)
2. **Migrate audit sang AuditTrail.php** để có hash-chain tamper-proof
3. Thêm **quantity validation**: `sum(WO.qty_completed) <= JO.qty_ordered`
4. **Enforce auto-action** thay vì chỉ warning: block JO release nếu WO chưa scheduled

---

### W8. MES Execution Governance -- Điểm: 2.4/5

**Thực chiến:**
- Governance multi-checkpoint: NC release, tool offset, material genealogy, alarm, downtime, maintenance, shift handover
- Alarm service với severity 5 cấp: INFO/WARNING/ALARM/CRITICAL/EMERGENCY
- Playbook cho alarm response -- operator có hướng dẫn xử lý
- Adapter heartbeat SLA tracking
- Tool offset drift detection vs tolerance band (default ±0.02mm)

**Thiếu sót so với Industry 4.0 thế giới:**

| Gap | Mức độ | Industry 4.0 Reference |
|-----|--------|----------------------|
| **Không có OEE calculation** | **Rất cao** | OEE = Availability x Performance x Quality là KPI cốt lõi MES; world-class = 85%+ |
| **Không có SPC (Statistical Process Control)** | **Rất cao** | Không có control chart, Cpk/Ppk, Western Electric rules |
| **Không có predictive maintenance signals** | **Cao** | Không feed sensor data vào ML model để dự đoán hư hỏng |
| Không có first-pass yield tracking | **Cao** | Cần đo % sản phẩm đạt lần đầu, không tính rework |
| Không có operator skill check trước assign WO | **Trung bình** | ISA-95 yêu cầu resource qualification |
| Alarm không auto-trigger NCR khi severity = CRITICAL/EMERGENCY | **Trung bình** | Alarm đứng riêng, không feed vào quality workflow |
| Không real-time -- adapter heartbeat check on-demand | **Trung bình** | Cần continuous health monitoring |
| Không có digital twin hoặc process simulation | **Thấp** | Xu hướng Industry 4.0 tiên tiến |

**Khuyến nghị:**
1. **Implement OEE module** -- đây là must-have cho bất kỳ MES nào muốn được xem là nghiêm túc
2. **Thêm SPC engine** với X-bar/R chart, P chart, C chart -- auto-trigger NCR khi out-of-control
3. **Link alarm severity CRITICAL+ -> auto-create NCR** trong WorkflowEngine
4. Thêm **first-pass yield** vào WO report progress

---

### W9. Epicor Integration -- Điểm: 2.8/5

**Thực chiến:**
- Outbox worker pattern đúng chuẩn: retry backoff [1,5,15,30,60], dead letter sau 5 lần
- Dual-direction: inbound worker (pull) + outbox (push)
- Reconciliation exception tracking với tolerance configurable
- Health snapshot multi-level: domain, transport, worker
- Dry-run mode khi chưa cấu hình -- graceful degradation

**Thiếu sót:**

| Gap | Mức độ | Best Practice Reference |
|-----|--------|----------------------|
| **Không có circuit breaker** | **Cao** | Khi Epicor down, worker tiếp tục retry thay vì fail-fast |
| Polling-based, không event-driven | **Trung bình** | 5-15 phút poll interval = data latency |
| Không có idempotency key cho outbound | **Cao** | Replay có thể tạo duplicate transactions |
| Checkpoint chỉ timestamp-based | **Trung bình** | Clock skew = miss/duplicate records |
| Không có saga compensation | **Trung bình** | Multi-step transaction (NCR -> hold inventory -> RMA) không có rollback |
| Dead letter chỉ đánh dấu, không alert | **Trung bình** | Cần notification khi có dead letter mới |

**Khuyến nghị:**
1. **Implement circuit breaker pattern**: Closed -> Open (sau 3 failures liên tiếp) -> Half-Open (test 1 request)
2. Thêm **idempotency key** (UUID) cho mỗi outbox event để Epicor deduplicate
3. Thêm **dead letter alert** -- notification ngay khi event vào dead letter

---

### W10. Supplier Quality -- Điểm: 2.3/5

**Thực chiến:**
- SCAR state machine 6 bước: issued -> acknowledged -> root_cause_analysis -> corrective_action -> verification -> closed
- Skip-lot ANSI Z1.4 tự động: 4 level switching rules đúng chuẩn
- Scorecard tính: quality (accept rate), delivery (on-time count), overall

**Thiếu sót nghiêm trọng:**

| Gap | Mức độ | Reference |
|-----|--------|-----------|
| **SCAR divergent** -- 2 implementation khác nhau (WorkflowEngine vs SupplierQualityService) | **Rất cao** | Hai state machine khác nhau cho cùng 1 process = rủi ro audit |
| **Không có RBAC** trên service methods | **Cao** | Bất kỳ ai call được API đều có thể tạo/sửa SCAR |
| Không support 8D methodology | **Cao** | AS9100D best practice; SCAR nên theo form 8D |
| Không có counterfeit parts prevention | **Cao** | AS9100D §8.1.4 bắt buộc cho aerospace |
| Không có supplier self-service portal | **Trung bình** | Supplier phải gửi response qua email, không có digital channel |
| Scorecard không trigger auto-action | **Trung bình** | Score thấp không tự động tăng inspection level hoặc tạo audit plan |
| Không có COA (Certificate of Analysis) matching | **Trung bình** | Incoming inspection thiếu so sánh tự động COA vs spec |
| Skip-lot chỉ giữ 20 recent results | **Trung bình** | ANSI Z1.4 có thể cần history dài hơn cho edge cases |
| Không audit trail (hash-chain) | **Trung bình** | Change tracking nội bộ, không tamper-proof |
| Counter race condition cho ID generation | **Thấp** | generateNumber() không có distributed lock |

**Khuyến nghị:**
1. **HỢP NHẤT SCAR** -- chọn 1 implementation duy nhất (recommend dùng WorkflowEngine vì có audit trail tốt hơn)
2. **Thêm RBAC** vào SupplierQualityService -- ít nhất kiểm role trước khi cho transition SCAR
3. **Implement 8D form** trong SCAR: D1-D8 fields bắt buộc
4. Thêm **counterfeit parts prevention**: material cert verification, lot traceability
5. **Auto-escalation từ scorecard**: score < 70% -> tăng inspection level + tạo audit plan

---

### W11. Shipment Readiness Gate -- Điểm: 1.9/5 (THẤP NHẤT)

**Thực chiến:**
- 10 gate check bao phủ rộng: contract review, JO completion, NCR, hold, documents, CAPA, FAI, export control, packing, customer inspection
- Flexible required/optional per gate
- `na` cho gate không áp dụng

**Thiếu sót nghiêm trọng -- đây là workflow yếu nhất:**

| Gap | Mức độ | Lý do |
|-----|--------|-------|
| **Không có audit trail** | **Rất cao** | Không record ai check, khi nào check, result gì -- unacceptable cho aerospace |
| **Không có RBAC** | **Rất cao** | Bất kỳ ai cũng có thể invoke checkReadiness() |
| **Không enforce** -- service chỉ evaluate, không block shipment | **Rất cao** | OrderWorkflowService cho SO -> shipped mà không bắt buộc gate pass |
| Không có notification khi gate fail | **Cao** | Người vận hành không biết gate nào blocking |
| Không partial shipment handling | **Trung bình** | Có SO cần ship nhiều đợt |
| Không dangerous goods / ITAR check chi tiết | **Trung bình** | SG-08 chỉ check export control flag, không validate chi tiết |
| Không có gate override với approval | **Trung bình** | Đôi khi cần ship urgent với waiver -- cần approval trail |

**Khuyến nghị:**
1. **ENFORCE gate**: Block SO -> shipped transition trong OrderWorkflowService nếu `checkReadiness() = NOT READY`
2. **Thêm audit trail**: Mỗi lần check phải ghi record với user, timestamp, results, reason
3. **Thêm RBAC**: Chỉ shipping coordinator + qa_manager được invoke
4. **Thêm gate override workflow**: Cho phép override với approval từ qa_manager + production_director + ghi lý do

---

## 4. PHÂN TÍCH XUYÊN SUỐT (Cross-cutting Concerns)

### 4.1 Persistence & Data Integrity

**Vấn đề hệ thống: JSON file-based storage**

| Concern | Thực trạng | Rủi ro |
|---------|-----------|--------|
| Concurrent write | `LOCK_EX` trên từng file | 2 process cùng file: last write wins, không merge |
| Transaction support | Không có | Transition thành công nhưng action fail = state inconsistent |
| Backup/recovery | Không thấy mechanism | Mất file = mất data |
| Data size scaling | Toàn bộ orders trong 1 file JSON | File lớn = slow read/write, memory spike |
| Cross-entity consistency | Không có FK validation | JO reference SO không tồn tại = silent error |

**Khuyến nghị:** Migrate dần sang PostgreSQL (đã có dual-mode ở WorkflowEngine). Priority: `orders.json` (dữ liệu quan trọng nhất, nhiều concurrent access nhất).

### 4.2 E-Signature Compliance (21 CFR Part 11)

**Gap analysis vs 21 CFR Part 11 requirements:**

| Requirement | §11 Reference | HESEM Status |
|-------------|--------------|-------------|
| Two distinct identification components | §11.200(a) | **Partial** -- password re-auth có, nhưng chỉ 1 factor |
| Signature meaning captured | §11.50 | **Missing** -- không ghi "approval", "review", "witness" |
| Signature linked to record (non-transferable) | §11.70 | **Partial** -- hash link có, nhưng không PKI |
| Continuous session vs first-sign | §11.200(a)(1-2) | **Missing** -- mỗi lần đều yêu cầu full password |
| Append-only audit trail | §11.10(e) | **Yes** -- AuditTrail.php có hash-chain |
| Time-stamped audit trail | §11.10(e) | **Yes** -- ISO 8601 timestamp |
| Records available for review/copy | §11.10(b) | **Yes** -- query API có |

**Khuyến nghị:**
1. Thêm **signature meaning field** vào approval actions: "approval", "review", "witness", "authorship"
2. Cân nhắc **MFA** (TOTP/SMS) cho approval actions thay vì chỉ password
3. Implement **continuous session logic**: first sign = full ID + password; subsequent signs trong cùng session = password only

### 4.3 Notification & Escalation

**Vấn đề: Notification bị "defer" cho external system nhưng external system chưa implement**

| Workflow | Notification Status |
|----------|-------------------|
| WorkflowEngine (12 templates) | **Có** -- NotificationService integration, email queue |
| Evidence review | **Partial** -- SLA state tracked, notification timestamps stored, gửi thật unclear |
| Order SO/JO/WO | **Không có** -- zero notification |
| Shipment gate | **Không có** |
| Supplier quality | **Không có** |
| Release follow-up | **Partial** -- computed overdue, không push |

**Khuyến nghị:** Xây dựng **Notification Gateway** tập trung -- một service duy nhất handle email, Zalo, in-app notification cho tất cả workflow. Priority integration: Order transitions, SLA escalations, Shipment gate failures.

### 4.4 Security (ISO 27001 / CMMC)

**Gap analysis cho aerospace/defense QMS:**

| Control | Status | Risk |
|---------|--------|------|
| MFA cho privileged operations | **Missing** | Approve = chỉ password; cần 2 factors |
| Encryption at rest | **Missing** | JSON files plain text trên disk |
| Encryption in transit | **Unknown** | Phụ thuộc web server config |
| Session management | **Weak** | `$_SESSION['role']` -- không JWT, không expiry rõ |
| File upload scanning | **Missing** | Excel upload không scan malware |
| Rate limiting | **Missing** | API không có throttle |
| CMMC/NIST 800-171 | **Not addressed** | Nếu làm defense = mandatory |
| Audit log retention policy | **Missing** | Logs grow unbounded |

### 4.5 Khoảng cách 412 vs 11

**412 workflow trong library nhưng chỉ 11 đang chạy thực tế.**

Đây KHÔNG phải vấn đề -- 412 là **danh mục nghiệp vụ tiềm năng**, 11 là **implementations đang active**. Tuy nhiên:

- **Governance risk**: Ai quản lý danh mục 412? Có review định kỳ không? Workflow nào cần ưu tiên implement tiếp?
- **Duplicated logic risk**: Một số domain trong 412 (ví dụ `fmea_apqp`, `calibration_equipment`, `audit_risk`) trùng concept với 12 template trong WorkflowEngine nhưng không link rõ
- **False sense of coverage**: Stakeholder có thể nghĩ hệ thống cover 412 workflow nhưng thực tế chỉ 11

**Khuyến nghị:** Tạo **workflow maturity matrix** mapping 412 items → 4 level: (1) Defined only, (2) Template ready, (3) Partially live, (4) Fully operational. Dashboard này dùng để prioritize implementation tiếp.

---

## 5. GAP ANALYSIS SO VỚI TIÊU CHUẨN THẾ GIỚI

### 5.1 vs AS9100D

| AS9100D Clause | Requirement | HESEM Coverage | Gap |
|----------------|-------------|---------------|-----|
| §7.5.3 | Document distribution control + acknowledgment | Partial | **Thiếu read acknowledgment** |
| §7.2 | Competence evaluation | Missing | **Thiếu link training -> workflow** |
| §8.1.4 | Counterfeit parts prevention | Missing | **Thiếu counterfeit detection trong supplier incoming** |
| §8.4 | External provider control | Partial | SCAR có nhưng divergent, thiếu 8D |
| §8.5.1.3 | Production process verification (FAI) | Template only | **FAI chưa live trong 11 canonical workflow** |
| §8.7 | Nonconforming output + MRB | Template only | **NCR chưa live; không có MRB routing** |
| §10.2 | CAPA + human factors | Template only | **CAPA chưa live; thiếu human factors root cause** |
| §10.2.1(f) | CAPA effectiveness verification | Template partial | Condition `has_verification` có nhưng không enforce timeline |

**Đánh giá AS9100D audit readiness: 55-60%** -- Sẽ có findings nghiêm trọng ở document acknowledgment, FAI live, NCR/CAPA live, counterfeit prevention.

### 5.2 vs Industry 4.0 MES (ISA-95)

| ISA-95 Domain | World-class Expectation | HESEM Status |
|--------------|------------------------|-------------|
| Production Operations | OEE real-time, SPC auto-action | **Missing OEE, Missing SPC** |
| Quality Operations | Inline inspection, auto-NCR | **Partial** -- gate-based, không inline |
| Maintenance Operations | CBM, predictive, RUL | **Missing** -- chỉ có downtime log |
| Inventory Operations | Material genealogy, FIFO | **Partial** -- genealogy queue có, FIFO không enforce |

**Đánh giá MES maturity: Level 2/5** -- Có governance nhưng thiếu analytics core.

### 5.3 vs Modern Workflow Engine (Camunda/Temporal/Zeebe)

| Capability | Modern Engine | HESEM WorkflowEngine |
|-----------|--------------|---------------------|
| Distributed execution | Yes (cluster) | No (single PHP process) |
| Deterministic replay | Yes | No |
| BPMN visual modeling | Yes (executable) | No (code-only) |
| Saga compensation | Built-in | Not implemented |
| Workflow versioning | Hot-deploy, no downtime | Hard-coded in PHP, requires deploy |
| DLQ for failed tasks | Yes | Not in workflow engine |
| Horizontal scaling | Yes | No |
| Timer events at scale | Yes | Cron-based, limited |
| Process mining / analytics | Built-in | Not available |

**Đánh giá:** HESEM WorkflowEngine đủ cho scale hiện tại (11 live workflows). Tuy nhiên, nếu scale lên 50+ workflows hoặc cần real-time process mining, sẽ cần cân nhắc migrate sang engine chuyên dụng.

---

## 6. LỘ TRÌNH CẢI TIẾN THEO ƯU TIÊN

### Phase 1: Critical Fixes (0-3 tháng) -- Không chấp nhận được nếu thiếu

| # | Action | Workflow affected | Effort | Impact |
|---|--------|------------------|--------|--------|
| 1.1 | **Enforce shipment gate** -- block SO->shipped nếu gate fail | W11, W7 | Low | Rất cao |
| 1.2 | **Thêm audit trail cho shipment gate** | W11 | Low | Rất cao |
| 1.3 | **Hợp nhất SCAR** -- dùng 1 implementation duy nhất | W10 | Medium | Cao |
| 1.4 | **Thêm notification cho order transitions** | W7 | Medium | Rất cao |
| 1.5 | **Thêm read acknowledgment cho document release** | W1, W6 | Medium | Cao (audit) |
| 1.6 | **Thêm signature meaning field** | W5, WorkflowEngine | Low | Cao (21 CFR 11) |
| 1.7 | **Thêm RBAC cho ShipmentGateService và SupplierQualityService** | W10, W11 | Low | Cao |

### Phase 2: Compliance Hardening (3-6 tháng) -- Cần cho audit readiness

| # | Action | Impact |
|---|--------|--------|
| 2.1 | **Activate NCR, CAPA, FAI workflows thành live** -- có template nhưng chưa live | AS9100D §8.7, §10.2, §8.5.1.3 |
| 2.2 | **Implement counterfeit parts prevention** trong supplier incoming | AS9100D §8.1.4 |
| 2.3 | **Implement 8D methodology** cho SCAR | AS9100D best practice |
| 2.4 | **Notification Gateway tập trung** -- email + Zalo + in-app cho tất cả workflow | Operational efficiency |
| 2.5 | **Migrate orders.json sang PostgreSQL** | Data integrity |
| 2.6 | **Review timeout + auto-escalation** cho document workflow | Eliminate bottleneck |
| 2.7 | **Training record link** từ release follow-up | AS9100D §7.2 |
| 2.8 | **MFA cho approval actions** | ISO 27001 / 21 CFR 11 |

### Phase 3: Operational Excellence (6-12 tháng) -- Nâng từ "đủ dùng" lên "xuất sắc"

| # | Action | Impact |
|---|--------|--------|
| 3.1 | **OEE module** -- real-time availability x performance x quality | MES core KPI |
| 3.2 | **SPC engine** -- X-bar/R chart, P chart, auto-trigger NCR | Predictive quality |
| 3.3 | **Circuit breaker** cho Epicor integration | Fault isolation |
| 3.4 | **Idempotency keys** cho outbound events | Data integrity |
| 3.5 | **Supplier self-service portal** | Efficiency + traceability |
| 3.6 | **Schema impact analysis** trước online form publish | Data safety |
| 3.7 | **Quantity validation** trong order workflow (qty_completed <= qty_ordered) | Prevent over-production |
| 3.8 | **Optimistic locking** (version counter) cho concurrent JSON writes | Data integrity |

### Phase 4: World-class (12-24 tháng) -- Differentiation

| # | Action | Impact |
|---|--------|--------|
| 4.1 | **Process mining** -- analyze bottleneck từ audit trail data | Continuous improvement |
| 4.2 | **Predictive maintenance** -- ML trên sensor/alarm data | Reduce unplanned downtime |
| 4.3 | **AI-assisted review** -- suggest checklist completion, anomaly detection | Faster review cycle |
| 4.4 | **Event-driven architecture** thay polling cho Epicor | Near-real-time sync |
| 4.5 | **Workflow versioning** -- hot-deploy without downtime | Agility |
| 4.6 | **Digital twin** cho process simulation | Advanced manufacturing |
| 4.7 | **CMMC Level 2 compliance** nếu làm defense contracts | Market access |

---

## 7. KẾT LUẬN

### 7.1 Verdict tổng quan

HESEM QMS workflow system là một **hệ thống tự phát triển có chiều sâu kỹ thuật đáng ghi nhận**, đặc biệt ở:
- Audit trail hash-chain (tiếp cận 21 CFR Part 11)
- Evidence SLA 6 trạng thái (trưởng thành nhất trong 11 workflows)
- Outbox pattern cho ERP integration (đúng pattern)
- Skip-lot ANSI Z1.4 tự động
- Bilingual vi/en xuyên suốt

Tuy nhiên, hệ thống có **3 vấn đề cốt lõi** cần giải quyết ngay:

1. **Enforcement gap**: Nhiều workflow chỉ evaluate/report, không enforce (shipment gate là ví dụ rõ nhất -- check nhưng không block)
2. **Notification gap**: Phần lớn workflow chạy "im lặng" -- state change nhưng không ai được thông báo, trừ khi mở dashboard
3. **Live coverage gap**: 12 WorkflowEngine templates (NCR, CAPA, FAI, CAL, AUD, TRN, ECR...) có code nhưng chưa là canonical live workflow -- đây là thiếu sót lớn cho AS9100D audit

### 7.2 Con số quan trọng nhất

| Metric | Hiện tại | Target 6 tháng | Target 12 tháng |
|--------|---------|----------------|-----------------|
| Workflow canonical live | 11 | 15-17 (thêm NCR, CAPA, FAI, CAL, AUD, TRN) | 20+ |
| Trung bình điểm thực chiến | 2.7/5 | 3.5/5 | 4.0/5 |
| Workflow có notification hoạt động | ~3/11 | 11/11 | 11/11 |
| Workflow có audit trail hash-chain | ~4/11 | 11/11 | 11/11 |
| AS9100D audit readiness | ~55-60% | ~80% | ~90% |
| 21 CFR Part 11 compliance | ~40% | ~70% | ~85% |

### 7.3 Lời cuối

Hệ thống HESEM không cần xây lại từ đầu. Infrastructure đã có (AuditTrail, WorkflowEngine, NotificationService, parallel approval). Vấn đề chính là **nhiều capability đã build nhưng chưa wire together** -- ví dụ AuditTrail tồn tại nhưng OrderWorkflowService không dùng, NotificationService tồn tại nhưng SupplierQualityService không gọi.

**Ưu tiên #1 không phải build thêm tính năng mới, mà là kết nối các capability đã có vào các workflow đang chạy.**

---

*Báo cáo này được lập dựa trên phân tích mã nguồn thực tế (api.php 22,383 dòng, WorkflowEngine.php, OrderWorkflowService.php, ShipmentGateService.php, SupplierQualityService.php, EpicorIntegrationService.php, MES services) kết hợp so sánh với tiêu chuẩn AS9100D, 21 CFR Part 11, ISA-95, ISO 27001, IATF 16949, và kiến trúc workflow engine hiện đại (Camunda/Temporal/Zeebe).*
