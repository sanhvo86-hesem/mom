# HESEM QMS — Kiểm kê & Tái cấu trúc tính năng

## PHƯƠNG PHÁP: Xé nhỏ → Phân loại → Sắp xếp lại

---

## BƯỚC 1: XÉ NHỎ — Tất cả 87 tính năng đơn lẻ

### A. NHÓM ĐƠN HÀNG (Order lifecycle)
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| A1 | Tạo Sales Order (SO) | Sales/Planner | Hàng ngày | Orders |
| A2 | Tạo Job Order (JO) từ SO | Planner | Hàng ngày | Orders |
| A3 | Tạo Work Order (WO) từ JO | Planner | Hàng ngày | Orders |
| A4 | Xem hierarchy SO→JO→WO | All | Hàng ngày | Orders |
| A5 | Chuyển trạng thái đơn hàng | Planner/QA | Hàng ngày | Orders |
| A6 | Contract review (12 checklist items) | Sales/QA/Eng | Khi có SO mới | Orders |
| A7 | Quản lý Hold (credit/eng/quality/ship) | Manager | Khi cần | Orders |
| A8 | Ghi chú đơn hàng | All | Thường xuyên | Orders |
| A9 | Shipment readiness gate (10 checks) | QA/Shipping | Khi ship | Orders |
| A10 | Tìm kiếm đơn hàng | All | Hàng ngày | Orders |

### B. NHÓM PHÂN CÔNG & LỊCH TRÌNH (Dispatch & Schedule)
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| B1 | Tạo lệnh sản xuất (shift target) | Planner | Hàng ngày | Dispatch |
| B2 | Gửi lệnh cho công nhân | Planner | Hàng ngày | Dispatch |
| B3 | Timeline Gantt (máy × ngày × ca) | Planner/Manager | Hàng ngày | Dispatch |
| B4 | Capacity heatmap | Planner | Hàng tuần | AI Scheduling |
| B5 | Promise date calculator | Sales/Planner | Khi báo giá | AI Scheduling |
| B6 | Xếp ca cho nhân viên | HR/Planner | Hàng tháng | Master Data |
| B7 | Quản lý ngày nghỉ lễ | HR/Admin | Hàng năm | Master Data |
| B8 | Conflict detection (máy/người trùng) | Planner | Khi xếp lịch | AI Scheduling |

### C. NHÓM CÔNG NHÂN DI ĐỘNG (Operator mobile)
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| C1 | Xem lệnh sản xuất hôm nay | Operator | Đầu ca | Dispatch/Mobile |
| C2 | Báo cáo sản lượng (tốt/NG/rework) | Operator | Cuối ca/giữa ca | Dispatch |
| C3 | Chấm công (clock in/out per WO) | Operator | Mỗi WO | Mobile |
| C4 | First piece inspection | Operator/QC | Khi bắt đầu WO mới | Mobile |
| C5 | In-process inspection | Operator/QC | Theo sampling plan | Mobile |
| C6 | Quick NCR (báo lỗi từ máy) | Operator | Khi phát hiện lỗi | Mobile |
| C7 | Đồng bộ offline | Operator | Tự động | Mobile |

### D. NHÓM BÁO GIÁ (Quoting)
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| D1 | Tạo báo giá | Sales/Estimator | Hàng tuần | Quoting |
| D2 | Ước tính cycle time | Estimator | Khi báo giá | Quoting |
| D3 | Ước tính chi phí vật liệu | Estimator | Khi báo giá | Quoting |
| D4 | Chuyển báo giá → SO | Sales | Khi khách chấp nhận | Quoting |
| D5 | Win/loss analysis | Sales Manager | Hàng tháng | Quoting |

### E. NHÓM CHẤT LƯỢNG — NCR/CAPA (Nonconformance)
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| E1 | Tạo NCR | QC/Operator | Khi phát hiện lỗi | Quality Exc |
| E2 | Tạo CAPA từ NCR | QA Engineer | Khi cần khắc phục | Quality Exc |
| E3 | Khiếu nại khách hàng (8D D1-D8) | QA Manager | Khi nhận complaint | Quality Exc |
| E4 | MRB session (disposition) | MRB Team | Khi có NCR nghiêm trọng | Quality Exc |
| E5 | Deviation request | Engineering | Khi cần sai lệch tạm | Quality Exc |
| E6 | Concession request | QA/Sales | Khi cần KH chấp nhận | Quality Exc |
| E7 | COPQ auto-calculation | QA Manager | Hàng tháng | Quality Exc |
| E8 | Escalation (tự động + thủ công) | System/Manager | Khi quá hạn | Quality Exc |
| E9 | Auto-quarantine inventory on NCR | System | Tự động | Quality Exc |
| E10 | Repeat pattern detection | System | Tự động | Quality Exc |
| E11 | Trend analysis (Pareto, SPC) | QA Engineer | Hàng tuần | Quality Exc |

### F. NHÓM CHẤT LƯỢNG — FMEA & CONTROL PLAN
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| F1 | Tạo PFMEA/DFMEA | QA/Engineering | Khi có part mới | FMEA |
| F2 | Thêm failure mode (S/O/D → AP) | QA Engineer | Khi phân tích | FMEA |
| F3 | Recommended actions + tracking | QA Engineer | Ongoing | FMEA |
| F4 | Auto-generate Control Plan từ FMEA | QA Engineer | Khi FMEA approved | FMEA |
| F5 | Control Plan management | QA Engineer | Khi thay đổi process | FMEA |
| F6 | RPN before/after analytics | QA Manager | Review | FMEA |
| F7 | Link NCR → FMEA failure mode | QA Engineer | Khi NCR xảy ra | FMEA |

### G. NHÓM CHẤT LƯỢNG — APQP/PPAP
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| G1 | Tạo APQP project | QA/Engineering | Khi có part mới | APQP |
| G2 | Gate review (Phase 1-5) | Cross-functional | Theo milestone | APQP |
| G3 | PPAP submission (11 elements) | QA Engineer | Khi submit cho KH | APQP |
| G4 | Customer response tracking | QA/Sales | Khi KH phản hồi | APQP |
| G5 | Lessons learned | QA Team | Khi close project | APQP |

### H. NHÓM CHẤT LƯỢNG NHÀ CUNG CẤP
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| H1 | Supplier scorecard (weighted) | SCM/QA | Hàng tháng | Supplier |
| H2 | Incoming inspection | QC | Khi nhận hàng | Supplier |
| H3 | Skip-lot switching (ANSI Z1.4) | System | Tự động | Supplier |
| H4 | Approved Supplier List (ASL) | SCM/QA | Khi cần approve NCC | Supplier |
| H5 | SCAR workflow | QA/SCM | Khi NCC lỗi | Supplier |
| H6 | Supplier audit scheduling | QA | Hàng quý/năm | Supplier |

### I. NHÓM AI & SPC
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| I1 | SPC anomaly detection (WE + Nelson) | System/QA | Real-time | AI Quality |
| I2 | Tool wear prediction | System/Maint | Real-time | AI Quality |
| I3 | Defect probability scoring | System | Per WO | AI Quality |
| I4 | Process drift detection | QA Engineer | Ongoing | AI Quality |

### J. NHÓM HỒ SƠ & CHỨNG CỨ
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| J1 | Form online (biểu mẫu điện tử) | All | Hàng ngày | Forms |
| J2 | Record ID generation | QA | Khi tạo hồ sơ | Forms |
| J3 | Form upload & verify (Excel) | QA | Khi nộp form offline | Forms |
| J4 | Evidence upload (hash chain) | QA/Operator | Khi có chứng cứ | Evidence |
| J5 | Chain-of-custody tracking | System | Tự động | Evidence |
| J6 | Evidence linking (NCR→SO→JO→WO) | QA | Khi link | Evidence |
| J7 | Hash chain verification | QA/Auditor | Khi audit | Evidence |
| J8 | Full-text search evidence | All | Khi tìm kiếm | Evidence |
| J9 | Product passport (DPP) | QA/Shipping | Khi ship | Passport |
| J10 | Genealogy trace (serial→lot→material) | QA | Khi truy vết | Passport |

### K. NHÓM XƯỞNG & MÁY
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| K1 | Shop floor monitoring (machine status) | Supervisor | Real-time | MES |
| K2 | Machine alarms | System/Maint | Real-time | MES |
| K3 | OEE snapshots | Manager | Hàng ngày | MES |
| K4 | CNC program management (version ctrl) | CAM/Setup | Khi thay đổi program | CNC Programs |
| K5 | Setup sheets (photos, tools, fixtures) | Setup Tech | Khi setup máy | CNC Programs |
| K6 | Energy monitoring per machine | Manager | Hàng tuần | Energy |
| K7 | Knowledge tips per machine | Operator | Khi cần mẹo | Knowledge |

### L. NHÓM DỮ LIỆU NỀN (Master Data)
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| L1 | Tạo/sửa máy (equipment) | Admin/Maint | Hiếm khi | Master Data |
| L2 | Tạo/sửa Part Number + Revision | Engineering | Khi có part mới | Master Data |
| L3 | Tạo/sửa Work Center | Admin | Hiếm khi | Master Data |
| L4 | Tạo/sửa Operator (link user) | HR/Admin | Khi có NV mới | Master Data |
| L5 | Định nghĩa ca làm việc | HR/Admin | Hiếm khi | Master Data |
| L6 | Routing & BOM | Engineering | Khi có part mới | Master Data |
| L7 | Defect catalog | QA | Khi cần thêm loại lỗi | Master Data |
| L8 | Customer & Supplier master | Sales/SCM | Khi có KH/NCC mới | Master Data |

### M. NHÓM BÁO CÁO & CẢI TIẾN
| # | Tính năng | Ai dùng | Tần suất | Hiện ở module |
|---|-----------|---------|----------|---------------|
| M1 | Management review (AS9100) | QA Manager | Hàng quý | Compliance |
| M2 | Customer quality report | QA | Hàng quý | Compliance |
| M3 | Supplier review report | SCM/QA | Hàng 6 tháng | Compliance |
| M4 | COPQ report | QA Manager | Hàng tháng | Compliance |
| M5 | Evidence package (ship docs) | QA/Shipping | Khi ship | Compliance |
| M6 | Kaizen suggestion | All | Khi có ý tưởng | CI |
| M7 | CI project (PDCA board) | QA/Manager | Ongoing | CI |
| M8 | ROI tracking | Manager | Hàng quý | CI |

---

## BƯỚC 2: PHÂN LOẠI THEO VAI TRÒ NGƯỜI DÙNG

### OPERATOR (Công nhân CNC) — dùng trên tablet
Tính năng cần: C1, C2, C3, C4, C5, C6, C7, E1(quick NCR), K7, M6

### PLANNER (Kế hoạch sản xuất)
Tính năng cần: A1-A5, B1-B8, D1-D5, L2, L6

### QA ENGINEER (Kỹ sư chất lượng)
Tính năng cần: E1-E11, F1-F7, G1-G5, H1-H6, I1-I4, J1-J10

### MANAGER (Quản lý)
Tính năng cần: A4, A7, B3, K1-K3, M1-M8, E7, E11

### ADMIN
Tính năng cần: L1-L8, B6-B7

---

## BƯỚC 3: SẮP XẾP LẠI — 7 MODULE THỰC CHIẾN

### MODULE 1: 📦 ĐƠN HÀNG & SẢN XUẤT
**Ai dùng chính:** Planner, Sales
**Workflow:** Báo giá → SO → JO → WO → Phân công → Theo dõi → Giao hàng

Tính năng gom vào:
- A1-A10 (toàn bộ order lifecycle)
- B1-B3 (dispatch: tạo lệnh, gửi lệnh, timeline Gantt)
- B4-B5, B8 (scheduling: capacity, promise date, conflict)
- D1-D5 (quoting — CHUYỂN TỪ module riêng vào đây vì là bước đầu của order)
- A9 (shipment gate — checkpoint cuối của order)
- **MỚI: Tạo Part Number + Revision** (L2 — DI CHUYỂN từ Admin vào đây vì Planner cần khi tạo JO)
- **MỚI: Xếp ca + lịch nghỉ** (B6, B7 — DI CHUYỂN từ Admin vì Planner cần khi phân công)

Sub-tabs:
1. Đơn hàng (SO→JO→WO hierarchy + create + status)
2. Phân công (dispatch targets + Gantt timeline)
3. Lịch trình (capacity heatmap + promise calculator + conflict)
4. Báo giá (quote → convert to SO)
5. Shipment gate (readiness checklist)
6. Parts & Ca (tạo part/revision + xếp ca — DỮ LIỆU PHỤC VỤ SẢN XUẤT)

### MODULE 2: 📱 XƯỞNG (Operator + Shop Floor)
**Ai dùng chính:** Operator, Setup Tech, Supervisor
**Workflow:** Nhận lệnh → Setup → Chạy → Kiểm tra → Báo cáo → Bàn giao

Tính năng gom vào:
- C1-C7 (toàn bộ operator mobile)
- K1-K3 (shop floor monitoring, alarms, OEE)
- K4-K5 (CNC programs, setup sheets — Setup Tech cần tại máy)
- K6 (energy — Supervisor xem tại xưởng)
- K7 (knowledge tips — Operator cần tại máy)
- **MỚI: Tool wear prediction** (I2 — DI CHUYỂN từ AI vì Operator cần biết khi nào đổi dao)

Sub-tabs:
1. Lệnh của tôi (operator task cards + báo cáo sản lượng)
2. Giám sát xưởng (machine status wall + alarms + OEE)
3. Chương trình CNC (NC programs + setup sheets)
4. Kiến thức (tips theo máy/vật liệu)
5. Năng lượng (kWh per machine, idle waste)

### MODULE 3: 🔴 CHẤT LƯỢNG
**Ai dùng chính:** QA Engineer, QA Manager
**Workflow:** Phát hiện lỗi → NCR → CAPA → MRB → FMEA update → Control Plan → APQP

Tính năng gom vào:
- E1-E11 (NCR/CAPA/8D/MRB/Deviation/Concession/COPQ/Escalation)
- F1-F7 (FMEA + Control Plan)
- G1-G5 (APQP/PPAP)
- I1, I3, I4 (SPC anomaly, defect probability, process drift — AI HỖ TRỢ chất lượng)
- **LOẠI BỎ:** Exception Dashboard cũ (14) — gom hoàn toàn vào đây

Sub-tabs:
1. NCR & CAPA (tạo, xem, transition, trend)
2. Khiếu nại KH (8D D1-D8)
3. MRB & Deviation (disposition, concession)
4. FMEA & Control Plan (worksheet, auto-generate CP)
5. APQP / PPAP (5-phase gate, 11 elements)
6. COPQ & AI (chi phí chất lượng + SPC anomaly + prediction)

### MODULE 4: 🏪 NHÀ CUNG CẤP
**Ai dùng chính:** SCM, QA
**Workflow:** Đánh giá NCC → ASL → Nhận hàng → Kiểm tra → Scorecard → SCAR

Tính năng gom vào:
- H1-H6 (toàn bộ supplier quality)
- **Giữ nguyên** — module này đã đủ sâu, logic workflow rõ ràng

Sub-tabs:
1. Scorecard (điểm NCC + rating)
2. Kiểm tra nhận hàng (incoming inspection + skip-lot)
3. ASL (danh sách NCC được duyệt)
4. SCAR (khắc phục từ NCC)
5. Kiểm toán NCC (audit schedule)

### MODULE 5: 📋 HỒ SƠ & CHỨNG CỨ
**Ai dùng chính:** QA, Auditor
**Workflow:** Tạo biểu mẫu → Thu thập chứng cứ → Link entities → Verify → Archive

Tính năng gom vào:
- J1-J10 (forms + evidence + passport + genealogy)
- **MỚI: Evidence package export** (M5 — DI CHUYỂN từ Reports vì là ship docs)

Sub-tabs:
1. Biểu mẫu (online forms, record ID, upload verify)
2. Kho chứng cứ (vault + hash chain + custody + search)
3. Hộ chiếu sản phẩm (DPP + genealogy trace)

### MODULE 6: 📊 BÁO CÁO & CẢI TIẾN
**Ai dùng chính:** Manager, QA Manager
**Workflow:** Thu thập dữ liệu → Phân tích → Báo cáo → Cải tiến → Theo dõi ROI

Tính năng gom vào:
- M1-M4, M6-M8 (reports + CI/Kaizen)
- **Tổng hợp ca sản xuất** (dashboard dispatch — DI CHUYỂN vào đây cho Manager xem)

Sub-tabs:
1. Tổng hợp sản xuất (shift summary + KPIs today)
2. Báo cáo tuân thủ (management review, customer quality, supplier review)
3. COPQ analysis (chi phí chất lượng trend)
4. Cải tiến liên tục (suggestion + PDCA board + ROI)

### MODULE 7: ⚙ QUẢN TRỊ
**Ai dùng chính:** Admin, IT
**Workflow:** Setup hệ thống → Quản lý user → Master data hiếm thay đổi

Tính năng gom vào:
- L1, L3-L5, L7-L8 (master data HIẾM THAY ĐỔI: máy, work center, ca, defect catalog, KH/NCC)
- Admin functions (users, roles, MFA, git sync, portal display)
- Customer portal admin
- **KHÔNG có Part/Revision** — đã chuyển sang Module 1
- **KHÔNG có xếp ca** — đã chuyển sang Module 1

Sub-tabs:
1. Users & Roles (quản lý tài khoản)
2. Master Data (máy, work center, defect catalog)
3. Cài đặt (MFA, portal display, deployment)
4. Cổng khách hàng (customer portal admin)

---

## BƯỚC 4: TÍNH NĂNG ĐỀ XUẤT LOẠI BỎ

| Tính năng | Lý do loại bỏ |
|-----------|---------------|
| Exception Dashboard cũ (14-exception-dashboard.js) | Gom hoàn toàn vào Module 3 Chất lượng |
| AI Scheduling module riêng (22) | Phân tán: capacity→Module 1, SPC→Module 3, tool wear→Module 2 |
| Energy module riêng (29) | Gom vào Module 2 Xưởng (tab Năng lượng) |
| Knowledge module riêng (27) | Gom vào Module 2 Xưởng (tab Kiến thức) |
| CI module riêng (28) | Gom vào Module 6 Báo cáo & Cải tiến |
| Customer Portal module riêng (19) | Gom vào Module 7 Quản trị |
| Product Passport module riêng (21) | Gom vào Module 5 Hồ sơ |
| CNC Programs module riêng (20) | Gom vào Module 2 Xưởng |
| Deploy dashboard (08) | Gom vào Module 7 Quản trị |

---

## BƯỚC 5: CROSS-MODULE DATA FLOW (Kết nối)

```
MODULE 1 (Đơn hàng)
  │
  ├── WO + part_id + operator_id ──→ MODULE 2 (Xưởng)
  │                                      │
  │── NCR from production ─────────→ MODULE 3 (Chất lượng)
  │                                      │
  │── evidence links ──────────────→ MODULE 5 (Hồ sơ)
  │                                      │
  │── PO from SO ──────────────────→ MODULE 4 (NCC)
  │                                      │
  └── KPI data ────────────────────→ MODULE 6 (Báo cáo)

Shared entities:
  wo_number:    Module 1, 2, 3, 5
  machine_id:   Module 1, 2
  operator_id:  Module 1, 2
  part_number:  Module 1, 2, 3, 4, 5
  ncr_id:       Module 2, 3, 5
  evidence_id:  Module 3, 5
```
