# HESEM QMS — Module Architecture v2.0
# 10 Module theo Workflow Sản xuất CNC Aerospace

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Nguyên tắc thiết kế
- **Workflow-first**: Module theo dòng chảy sản xuất, không theo chức năng kỹ thuật
- **Role-focused**: Mỗi module phục vụ 1-2 vai trò chính
- **Data flows downstream**: Dữ liệu chảy từ trái sang phải theo production flow
- **Cross-reference, not duplication**: Module tham chiếu chéo, không copy data

### 1.2 Production Flow Map
```
💰 Báo giá → 📦 Đơn hàng → 📋 Kế hoạch → 🚚 Mua hàng → 🏭 Sản xuất → 🔴 Chất lượng → 📦 Giao hàng
                                                                              ↓
                                                              📋 Hồ sơ ← 📊 Báo cáo
```

### 1.3 Sidebar Navigation (12 items)
```
🏠 Tổng quan (Dashboard)

── DÒNG CHẢY SẢN XUẤT ──
💰 Báo giá
📦 Đơn hàng
📋 Kế hoạch
🚚 Mua hàng & IQC
🏭 Sản xuất
🔴 Chất lượng

── HỖ TRỢ ──
📋 Hồ sơ & Chứng cứ
📊 Báo cáo & Cải tiến
📁 Tài liệu
⚙ Quản trị
```

---

## 2. CHI TIẾT TỪNG MODULE

### MODULE 1: 💰 BÁO GIÁ
**Route:** `/quoting`
**Roles:** Sales, Estimator
**Mô tả:** Nhận RFQ → Ước tính → Báo giá → Theo dõi → Convert to SO

#### Tabs & Tính năng:
```
Tab 1: Danh sách báo giá
  - Bảng quotes với filter: status, customer, date range
  - KPI: Pipeline value, Win rate, Avg response time
  - Quick actions: tạo mới, clone, convert to SO

Tab 2: Tạo / Sửa báo giá
  - Customer lookup
  - Line items: part, qty, material, dimensions
  - Cycle time estimator (auto-calc từ material + operations)
  - Material cost estimator (buy-to-fly ratio)
  - Markup/margin slider
  - Total auto-calculation
  - Promise date suggestion (gọi API từ Module Kế hoạch)
  - Notes, terms & conditions

Tab 3: Phân tích
  - Win/loss analysis
  - Quote-to-order conversion rate
  - Average response time trend
  - Top customers by quote value
```

#### Data Flow:
```
INPUT:  RFQ từ khách hàng (manual entry hoặc email)
OUTPUT: Quote → convert to SO (tạo record trong Module Đơn hàng)
CROSS:  Gọi API schedule_promise từ Module Kế hoạch để ước tính ngày giao
CROSS:  Gọi API master_data_list entity=parts để lookup part numbers
```

#### API Endpoints:
```
quote_list, quote_create, quote_update, quote_detail
quote_transition (draft→sent→accepted→rejected→expired)
quote_convert_to_so
quote_estimate_cycle, quote_estimate_material
quote_dashboard
```

---

### MODULE 2: 📦 ĐƠN HÀNG
**Route:** `/orders`
**Roles:** Sales, Manager, QA (contract review), Shipping (shipment gate)
**Mô tả:** SO lifecycle từ tạo → xác nhận → sản xuất → giao hàng → đóng

#### Tabs & Tính năng:
```
Tab 1: Đơn hàng (SO hierarchy)
  - Bảng SO với filter: status, customer, priority, date
  - KPI: Active SOs, OTD%, Backlog value, On hold
  - Tạo SO mới (nếu không từ quote)
  - SO detail: header + SO lines
  - SO → JO → WO hierarchy tree (read-only, navigable)
  - Status transitions (draft→quoted→confirmed→in_production→shipped→closed)

Tab 2: Xem xét hợp đồng (Contract Review)
  - 12 checklist items per SO (AS9100D 8.2.3)
  - Progress bar (% completed)
  - Multi-department sign-off (Sales, Eng, QA, Prod)
  - History of reviews

Tab 3: Quản lý Hold
  - Active holds (credit/engineering/quality/shipping/material)
  - Set/release hold with reason
  - Hold history

Tab 4: Giao hàng
  - Shipment readiness gate (10 checks)
  - Packing list management
  - CoC generation reference
  - Tracking number, delivery date
  - Delivery confirmation

Tab 5: Ghi chú & Timeline
  - Order notes thread (internal/customer-facing)
  - Timeline events (status changes, holds, docs attached)
```

#### Data Flow:
```
INPUT:  SO từ Quote conversion HOẶC manual entry
        SO từ Epicor sync (inbound)
OUTPUT: SO → JO/WO (tạo trong Module Kế hoạch)
        SO → PO trigger (Module Mua hàng)
        SO shipped → Epicor sync (outbound)
CROSS:  Contract review items → evidence links (Module Hồ sơ)
CROSS:  Shipment gate → check NCR status (Module Chất lượng)
CROSS:  Shipment gate → check evidence complete (Module Hồ sơ)
```

#### API Endpoints:
```
order_so_list, order_so_create, order_so_update, order_so_detail
order_transition, order_hierarchy
order_contract_review
order_hold_set, order_hold_release
order_note_add, order_timeline
order_shipment_gate
order_dashboard_stats, order_dashboard_kpi
order_search
```

---

### MODULE 3: 📋 KẾ HOẠCH
**Route:** `/planning`
**Roles:** Planner (primary), Engineering (Part/Rev/BOM)
**Mô tả:** Tạo JO/WO → Phân công → Lịch trình → Outsource

#### Tabs & Tính năng:
```
Tab 1: Lệnh sản xuất (JO/WO)
  - Tạo JO từ SO (link SO number)
  - Tạo WO từ JO (link JO + operation)
  - JO/WO list với filter: status, part, machine, date
  - JO detail: operations, materials, routing

Tab 2: Phân công sản xuất
  - Tạo shift target (WO + máy + NVH + ca + cycle time → auto-calc định mức)
  - Bảng lệnh hôm nay
  - Gửi lệnh cho công nhân
  - Gantt timeline (máy × ngày × ca)

Tab 3: Lịch trình & Năng lực
  - Capacity heatmap (máy × ngày → % utilization)
  - Conflict detection (trùng máy/NVH)
  - Promise date calculator
  - Workload by operator

Tab 4: Gia công ngoài (Outsource)
  - Tạo lệnh gia công ngoài (subcontract order)
  - Track gửi đi / nhận về
  - Vendor + process + Nadcap requirements
  - QC kiểm tra khi nhận về (link IQC)

Tab 5: Dữ liệu sản xuất
  - Tạo/sửa Part Number + Revision
  - Xếp ca cho nhân viên (shift assignments)
  - Lịch nghỉ lễ
  - Routing & BOM reference
  - Work center list
```

#### Data Flow:
```
INPUT:  SO confirmed → Planner tạo JO/WO
        Part/Rev/BOM từ Engineering
OUTPUT: JO/WO → dispatch targets → Module Sản xuất (operator nhận lệnh)
        Subcontract order → Module Mua hàng (vendor)
        Shift assignments → Module Sản xuất (ca làm việc)
CROSS:  Capacity data → Module Báo giá (promise date)
CROSS:  Part/Rev → Module Chất lượng (FMEA, inspection plan)
CROSS:  JO/WO → Module Hồ sơ (evidence linking)
```

#### API Endpoints:
```
order_jo_create, order_jo_update, order_jo_list, order_jo_detail
order_wo_create, order_wo_update
dispatch_create_target, dispatch_send, dispatch_timeline
dispatch_list_targets, dispatch_update_target
schedule_capacity, schedule_conflicts, schedule_promise
shift_list, shift_save, shift_assign, shift_assignments
shift_holidays, shift_holiday_save
master_data_list (entity=parts,revisions,routing_library,bom_library,work_centers)
master_data_create, master_data_update (entity=parts,revisions)
subcontract_create, subcontract_update, subcontract_list (CẦN TẠO MỚI)
```

**BACKEND THIẾU:**
- `SubcontractController` hoặc endpoints trong OrderController cho outsource
- `subcontract_create`, `subcontract_update`, `subcontract_list`, `subcontract_receive`

---

### MODULE 4: 🚚 MUA HÀNG & IQC
**Route:** `/purchasing`
**Roles:** SCM/Buyer (purchasing), QC (incoming inspection)
**Mô tả:** PO → Nhận hàng → IQC → Approve/Reject → Supplier management

#### Tabs & Tính năng:
```
Tab 1: Dashboard NCC
  - KPI: Avg score, At-risk suppliers, Open SCARs, Incoming reject rate
  - Top/bottom suppliers
  - Overdue SCARs

Tab 2: Kiểm tra nhận hàng (IQC)
  - Incoming inspection list
  - Tạo inspection record (vendor, PO, part, qty, lot)
  - Measurement recording (characteristic, nominal, USL, LSL, actual)
  - Auto pass/fail
  - Skip-lot status display
  - Disposition: accept/reject/conditional
  - Auto-NCR on reject (link Module Chất lượng)

Tab 3: Supplier Scorecard
  - Weighted scoring (Quality 40%, Delivery 30%, Cost 20%, Compliance 10%)
  - Rating: A/B/C/D/F
  - Trend over time
  - Per-vendor detail

Tab 4: ASL & SCAR
  - Approved Supplier List management
  - SCAR workflow (issue→acknowledge→root_cause→corrective→verify→close)
  - SCAR SLA tracking
  - Supplier audit schedule

Tab 5: Skip-lot
  - Per vendor × part: normal/tightened/reduced/skip status
  - ANSI Z1.4 switching rules display
  - History of level changes
```

#### Data Flow:
```
INPUT:  PO từ Epicor sync HOẶC manual
        Subcontract receipt từ Module Kế hoạch
OUTPUT: IQC reject → auto-NCR (Module Chất lượng)
        IQC reject → auto-SCAR
        IQC results → supplier scorecard update
        Skip-lot level → auto-adjust inspection sampling
CROSS:  Material certs → Module Hồ sơ (evidence vault)
CROSS:  Supplier audit → Module Chất lượng (audit findings)
```

#### API Endpoints:
```
supplier_dashboard
supplier_incoming_list, supplier_incoming_create, supplier_incoming_update
supplier_scorecard_list, supplier_scorecard_detail, supplier_scorecard_calc
supplier_asl_list, supplier_asl_upsert
supplier_scar_list, supplier_scar_create, supplier_scar_update, supplier_scar_transition
supplier_audit_list, supplier_audit_upsert
supplier_skip_lot_status, supplier_skip_lot_update
```

---

### MODULE 5: 🏭 SẢN XUẤT
**Route:** `/production`
**Roles:** Operator (primary), QC Inspector (inspection), Supervisor (monitoring), Setup Tech (CNC/setup)
**Mô tả:** Nhận lệnh → Setup → Chạy → Kiểm tra → Báo cáo → Bàn giao

#### Tabs & Tính năng:
```
Tab 1: Lệnh của tôi (MOBILE-FIRST)
  - Task cards: WO, máy, part, định mức, cycle time
  - Inputs: SL Tốt / SL NG / SL Rework (large, touch-friendly)
  - Progress bar (% achievement)
  - BÁO CÁO SẢN LƯỢNG button
  - NG chi tiết (defect type breakdown)
  - Chấm công (clock in/out per WO operation)

Tab 2: Kiểm tra (First Piece + IPQC)
  - First piece inspection (measurement table, auto pass/fail)
  - In-process inspection (sampling, SPC mini-chart)
  - Quick NCR (báo lỗi từ máy → link Module Chất lượng)
  - Camera button → attach photo evidence

Tab 3: Giám sát xưởng (Supervisor)
  - Machine status wall (running/idle/alarm/setup/maintenance)
  - Machine alarms + resolution
  - OEE snapshots per machine
  - Tổng hợp ca (shift summary KPIs)

Tab 4: Chương trình CNC
  - NC program library (version control)
  - Setup sheets (photos, tool list, fixture list, instructions)
  - Program approval workflow
  - Link program → part → machine

Tab 5: Kiến thức & Năng lượng
  - Knowledge tips (per machine, material, process)
  - Voting/comments on tips
  - Energy monitoring (kWh per machine, idle waste)
  - Tool wear prediction alerts
```

#### Data Flow:
```
INPUT:  Dispatch targets từ Module Kế hoạch → operator nhận lệnh
        Shift assignments từ Module Kế hoạch → ca làm việc
        CNC programs từ CAM/Engineering
OUTPUT: Production log (qty good/NG/rework) → Module Báo cáo (shift summary)
        Quick NCR → Module Chất lượng
        First piece data → Module Hồ sơ (evidence)
        Clock in/out → labor tracking → Epicor sync
CROSS:  Machine telemetry → Module Báo cáo (OEE trend)
CROSS:  Knowledge tips ← shared with all operators
```

#### API Endpoints:
```
dispatch_operator_tasks, dispatch_report_production
mobile_clock_in, mobile_clock_out
mobile_capture_inspection (first_piece, in_process)
mobile_start_task, mobile_complete_task
mobile_sync_batch, mobile_sync_status
cnc_program_list, cnc_program_create, cnc_program_detail, cnc_program_approve
cnc_program_setup_sheets, cnc_program_setup_create
knowledge_list, knowledge_create, knowledge_vote, knowledge_comment
energy_overview, energy_machine_detail, energy_per_part
ai_tool_wear
dispatch_dashboard (shift summary for supervisor)
```

---

### MODULE 6: 🔴 CHẤT LƯỢNG
**Route:** `/quality`
**Roles:** QA Engineer (primary), QA Manager (review/approve), QC Inspector (OQC)
**Mô tả:** NCR/CAPA → 8D → MRB → FMEA → APQP → SPC → COPQ

#### Tabs & Tính năng:
```
Tab 1: NCR & CAPA
  - NCR list (filter: status, severity, part, machine, operator)
  - Tạo NCR (defect type, S/O/D, RPN)
  - NCR → trigger CAPA evaluation
  - CAPA workflow (plan→implement→verify→close)
  - Auto-quarantine on NCR
  - Repeat pattern detection

Tab 2: Khiếu nại KH (8D)
  - Customer complaint list
  - 8D report (D1-D8 wizard)
  - Containment → Root cause → Corrective → Verification
  - Link to evidence

Tab 3: MRB & Deviation
  - MRB session (disposition: use-as-is/rework/scrap/return/concession)
  - Deviation request (temporary process deviation)
  - Concession request (customer approval)
  - OQC / Final Inspection results

Tab 4: FMEA & Control Plan
  - PFMEA/DFMEA worksheet (S/O/D → Action Priority)
  - Failure mode library
  - Recommended actions tracking
  - Auto-generate Control Plan from FMEA
  - Control plan management
  - Link NCR → FMEA failure mode (reverse FMEA)

Tab 5: APQP / PPAP
  - APQP project (5-phase gate management)
  - Gate review with deliverables checklist
  - PPAP submission (11 AS9145 elements)
  - Customer response tracking
  - Lessons learned

Tab 6: COPQ & SPC
  - COPQ breakdown (prevention/appraisal/internal/external failure)
  - COPQ trend (12-month)
  - Pareto by defect type/machine/operator
  - SPC anomaly detection (Western Electric + Nelson rules)
  - Process drift detection
  - Defect probability scoring
  - Escalation log
```

#### Data Flow:
```
INPUT:  Quick NCR từ Module Sản xuất (operator báo lỗi)
        IQC reject → NCR từ Module Mua hàng
        Customer complaint từ email/portal
OUTPUT: CAPA actions → process improvements
        FMEA updates → Control Plan → Inspection Plan
        COPQ data → Module Báo cáo
        NCR closure → Module Đơn hàng (unblock shipment)
CROSS:  Evidence attachment → Module Hồ sơ
CROSS:  Quarantine → inventory hold (Module Đơn hàng)
CROSS:  SCAR → Module Mua hàng (supplier corrective action)
```

#### API Endpoints:
```
exception_dashboard, exception_list, exception_detail
exception_complaint_create/update, exception_mrb_create/update
exception_deviation_create/update, exception_concession_create/update
exception_transition, exception_copq_summary, exception_trends, exception_escalate
fmea_list, fmea_create, fmea_detail, fmea_update
fmea_add_failure_mode, fmea_update_failure_mode
fmea_add_action, fmea_complete_action
fmea_generate_cp, fmea_control_plans, fmea_cp_detail, fmea_rpn_trend
fmea_link_ncr
apqp_list, apqp_create, apqp_detail, apqp_update
apqp_advance_phase, apqp_gate_review, apqp_gate_approve, apqp_gate_reject
apqp_ppap_create, apqp_ppap_element, apqp_ppap_response
apqp_deliverables, apqp_dashboard
ai_spc_anomalies, ai_prediction_list
spc_chart, spc_capability, spc_alerts
quality_exception_* (aliases)
```

---

### MODULE 7: 📋 HỒ SƠ & CHỨNG CỨ
**Route:** `/records`
**Roles:** QA (primary), Auditor, Shipping (evidence package)
**Mô tả:** Form → Evidence → Link → Verify → Archive

#### Tabs & Tính năng:
```
Tab 1: Biểu mẫu online
  - Form hub (fill & download)
  - Record ID generation (NCR-YYYY-NNN, etc.)
  - Form upload & verify (offline Excel)
  - Form schema management

Tab 2: Kho chứng cứ (Evidence Vault)
  - Upload evidence (hash chain)
  - Browse/search evidence
  - Chain-of-custody timeline
  - Link evidence ↔ entities (NCR, SO, JO, WO, FAI, SCAR)
  - Hash chain verification

Tab 3: Hộ chiếu sản phẩm (DPP)
  - Create passport per serial/lot
  - Event timeline (material→machining→treatment→inspection→ship)
  - QR code display
  - Genealogy trace (forward + backward)
  - Linked certificates (CoC, CoA, material certs)
```

#### Data Flow:
```
INPUT:  Form entries từ tất cả modules
        Evidence upload từ Module Sản xuất (photos, measurements)
        Material certs từ Module Mua hàng
OUTPUT: Evidence packages → Module Đơn hàng (shipment docs)
        Evidence links → all modules (NCR, SO, FAI, SCAR references)
        DPP → customer portal
CROSS:  Hash chain ← MES bridge (auto-capture from machine events)
CROSS:  Passport events ← Module Sản xuất (operation complete)
```

#### API Endpoints:
```
online_form_list, online_form_schema, online_form_submit, online_form_entries
record_id_registry, record_id_next
form_upload_draft, form_version_stream
evidence_list, evidence_upload, evidence_detail
evidence_link, evidence_chain_custody, evidence_verify_chain, evidence_search
product_passport_list, product_passport_create, product_passport_detail
product_passport_add_event, product_passport_trace
compliance_report_evidence_package
```

---

### MODULE 8: 📊 BÁO CÁO & CẢI TIẾN
**Route:** `/reports`
**Roles:** Manager/CEO (primary), QA Manager (quality reports)
**Mô tả:** KPI → Trend → Report → Improvement → ROI

#### Tabs & Tính năng:
```
Tab 1: Tổng hợp sản xuất
  - Shift summary (today's KPIs: target, actual, achievement%, NG%)
  - Per-machine production table
  - Per-operator performance table
  - Date picker for historical view

Tab 2: Báo cáo tuân thủ
  - Management review input (AS9100 9.3)
  - Customer quality report
  - Supplier review report
  - COPQ trend report
  - Audit evidence package

Tab 3: Cải tiến liên tục
  - Kaizen suggestion submission (any employee)
  - PDCA project board (Plan→Do→Check→Act→Closed)
  - A3 problem solving template
  - ROI tracker (cost to implement vs annual savings)
  - Improvement dashboard (suggestions count, implemented, $ saved)
```

#### Data Flow:
```
INPUT:  Production data ← Module Sản xuất (shift logs)
        Quality data ← Module Chất lượng (NCR/CAPA/COPQ)
        Supplier data ← Module Mua hàng (scorecards)
        Order data ← Module Đơn hàng (OTD%)
OUTPUT: Reports (PDF/screen) → Management review
        CI project ROI → business case for improvements
CROSS:  Aggregates data from ALL modules
```

#### API Endpoints:
```
dispatch_dashboard (shift summary)
compliance_report_types, compliance_report_generate, compliance_report_history
compliance_report_management_review, compliance_report_customer_quality
compliance_report_supplier_review, compliance_report_copq
ci_dashboard, ci_suggestion_create, ci_suggestion_list
ci_project_list, ci_project_create, ci_project_update, ci_project_transition
ci_roi_summary
kpi_get, kpi_trend, kpi_alerts
dashboard_executive, dashboard_quality, dashboard_production
```

---

### MODULE 9: 📁 TÀI LIỆU
**Route:** `/documents`
**Roles:** All (read), QMS Engineer (write), QA Manager (approve)
**Mô tả:** Controlled document management — SOP, WI, forms

Giữ nguyên — module hiện tại đã hoàn chỉnh.

---

### MODULE 10: ⚙ QUẢN TRỊ
**Route:** `/admin`
**Roles:** Admin/IT only
**Mô tả:** System setup, user management, master data hiếm thay đổi

#### Tabs & Tính năng:
```
Tab 1: Users & Roles
  - User CRUD
  - Role permissions
  - MFA management (enable/disable/reset)

Tab 2: Master Data (hiếm thay đổi)
  - Machines/Equipment
  - Work Centers
  - Defect catalog
  - Customer master
  - Supplier master (basic info, not quality)

Tab 3: Cổng khách hàng
  - Portal user management
  - Access grants
  - Complaint inbox from portal

Tab 4: Cài đặt hệ thống
  - Portal display config
  - Git sync/deploy
  - Data settings
  - System health
```

---

## 3. CROSS-MODULE DATA FLOW DIAGRAM

```
                    ┌──────────────┐
                    │  💰 Báo giá  │
                    │  quote_id    │
                    └──────┬───────┘
                           │ convert_to_so
                    ┌──────▼───────┐
                    │  📦 Đơn hàng │
                    │  so_number   │
                    └──┬───┬───┬───┘
          ┌────────────┘   │   └────────────────┐
          │                │                    │
   ┌──────▼───────┐       │             ┌──────▼───────┐
   │  📋 Kế hoạch │       │             │  🚚 Mua hàng │
   │  jo/wo_number│       │             │  po_number   │
   └──┬───┬───────┘       │             └──────┬───────┘
      │   │               │                    │
      │   │ dispatch      │ shipment_gate      │ iqc_reject
      │   │ target        │                    │
   ┌──▼───▼───────┐       │             ┌──────▼───────┐
   │  🏭 Sản xuất │       │             │  🔴 Chất lượng│
   │  operator    │───────┼─────────────│  ncr_id      │
   │  production  │ quick │             │  capa_id     │
   │  log         │ ncr   │             └──────┬───────┘
   └──────┬───────┘       │                    │
          │               │                    │
          │ evidence      │ evidence           │ evidence
          │               │                    │
   ┌──────▼───────────────▼────────────────────▼──┐
   │           📋 Hồ sơ & Chứng cứ               │
   │           evidence_id, record_id              │
   └──────────────────┬───────────────────────────┘
                      │
               ┌──────▼───────┐
               │ 📊 Báo cáo   │ ← aggregates ALL
               │ & Cải tiến   │
               └──────────────┘
```

## 4. SHARED ENTITIES (Cross-Module Keys)

| Entity | Created in | Referenced by |
|--------|-----------|---------------|
| `quote_id` | 💰 Báo giá | 📦 Đơn hàng (converted from) |
| `so_number` | 📦 Đơn hàng | 📋 Kế hoạch, 🚚 Mua hàng, 🔴 Chất lượng, 📋 Hồ sơ |
| `jo_number` | 📋 Kế hoạch | 🏭 Sản xuất, 🔴 Chất lượng, 📋 Hồ sơ |
| `wo_number` | 📋 Kế hoạch | 🏭 Sản xuất, 🔴 Chất lượng, 📋 Hồ sơ |
| `part_number` | 📋 Kế hoạch | ALL modules |
| `machine_id` | ⚙ Quản trị | 📋 Kế hoạch, 🏭 Sản xuất |
| `operator_id` | ⚙ Quản trị | 📋 Kế hoạch, 🏭 Sản xuất |
| `vendor_id` | ⚙ Quản trị | 🚚 Mua hàng |
| `ncr_id` | 🔴 Chất lượng | 🏭 Sản xuất (quick NCR), 📋 Hồ sơ |
| `evidence_id` | 📋 Hồ sơ | ALL modules |
| `target_id` | 📋 Kế hoạch | 🏭 Sản xuất (operator tasks) |
| `shift_code` | 📋 Kế hoạch | 🏭 Sản xuất (ca làm việc) |

## 5. BACKEND GAP ANALYSIS

### Endpoints cần TẠO MỚI:
| Endpoint | Controller | Lý do |
|----------|-----------|-------|
| `subcontract_list` | OrderController hoặc SubcontractController mới | Outsource management chưa có UI |
| `subcontract_create` | ^ | Tạo lệnh gia công ngoài |
| `subcontract_update` | ^ | Cập nhật trạng thái |
| `subcontract_receive` | ^ | Nhận hàng gia công ngoài + QC check |
| `oqc_create` | ExceptionController hoặc MobileController | Final inspection / OQC |
| `oqc_list` | ^ | Danh sách kiểm tra cuối |
| `packing_list_create` | OrderController | Tạo packing list |
| `packing_list_update` | ^ | Cập nhật packing |
| `delivery_confirm` | OrderController | Xác nhận giao hàng |

### Tables cần TẠO MỚI (migration 045):
- `oqc_inspections` — final/outgoing inspection records
- `packing_lists` — packing list per shipment
- `packing_list_items` — line items per packing list

### Endpoints đã có NHƯNG cần ALIAS thêm cho module mới:
- `dispatch_dashboard` → cũng dùng cho Tab "Tổng hợp SX" trong Module Báo cáo
- `master_data_list entity=parts` → cũng dùng cho Tab "Dữ liệu SX" trong Module Kế hoạch
- `shift_*` → cũng dùng cho Tab "Dữ liệu SX" trong Module Kế hoạch

### Migration 045 cần tạo:
```sql
-- oqc_inspections: Final/outgoing quality inspection
-- packing_lists: Packing list header per shipment
-- packing_list_items: Line items per packing list
```
