# GPT Registry Build Guide — HESEM QMS Portal

> **Mục đích:** File này hướng dẫn GPT (hoặc AI khác) truy cập trực tiếp vào repository để bổ sung, mở rộng dữ liệu registry cho hệ thống QMS Portal.
>
> **Cách dùng:** Upload file này cho GPT cùng với các file cần chỉnh sửa. GPT sẽ đọc, hiểu cấu trúc, và tạo nội dung bổ sung đúng format.

---

## 0. RESEARCH MANDATE — BẮT BUỘC ĐỌC TRƯỚC

> **CRITICAL INSTRUCTION:** Trước khi bắt đầu tạo bất kỳ dữ liệu nào, bạn PHẢI nghiên cứu sâu rộng các hệ thống sau đây để đảm bảo data registry đạt mức toàn diện nhất thế giới. KHÔNG ĐƯỢC chỉ dùng kiến thức có sẵn — phải search, đọc documentation, so sánh.

### 0.1 Hệ thống ERP toàn cầu cần nghiên cứu:

| Hệ thống | Trọng tâm nghiên cứu |
|---|---|
| **Epicor Kinetic** | BAQ fields, BO schemas, Part/Job/Quote/PO/SO data models — ĐÂY LÀ ERP CHÍNH, ưu tiên #1 |
| **SAP S/4HANA** | Material Master (MM01), Production Order, Quality Management (QM), Sales Order fields |
| **Oracle Cloud ERP** | Manufacturing, Supply Chain, Quality modules — field definitions |
| **Microsoft Dynamics 365 F&O** | Production control, Quality management, Warehouse management fields |
| **Infor CloudSuite Industrial (SyteLine)** | Job orders, Work orders, Quality, APS fields — rất phổ biến trong CNC |
| **IQMS (DELMIAworks)** | Chuyên cho sản xuất — Quality, SPC, OEE, real-time monitoring fields |
| **Plex (Rockwell)** | Cloud manufacturing — Quality, Traceability, PCN, Shipping fields |
| **Sage X3** | Manufacturing, Quality, Subcontracting fields |
| **QAD Adaptive ERP** | Automotive/Aerospace manufacturing fields |

### 0.2 Hệ thống QMS chuyên dụng cần nghiên cứu:

| Hệ thống | Trọng tâm |
|---|---|
| **ETQ Reliance** | NCR/CAPA workflow fields, 8D report fields, Audit management |
| **MasterControl** | Document control, CAPA, Deviation, Training management fields |
| **Greenlight Guru** | Design control, Risk management (FMEA fields), CAPA |
| **Qualio** | Document control, Supplier management, CAPA fields |
| **ComplianceQuest** | EQMS fields — NCR, CAPA, Audit, Supplier, Change Control |
| **Veeva Vault Quality** | Document lifecycle, Quality events, CAPA fields |
| **Sparta Systems TrackWise** | CAPA, Deviation, Change Control, Complaints fields |
| **Arena Solutions** | BOM management, Change orders, Quality fields |

### 0.3 Tiêu chuẩn ngành hàng không cần nghiên cứu:

| Tiêu chuẩn | Fields cần bổ sung |
|---|---|
| **AS9100 Rev D** | Tất cả clause references, documented information requirements |
| **AS9102 (FAI)** | First Article Inspection form fields — 3 forms, 20+ fields each |
| **AS9145 (APQP/PPAP)** | 5 phases, 18 PPAP elements, gate review fields |
| **AS13100 (PFMEA)** | Action Priority (AP) thay cho RPN, severity/occurrence/detection scales |
| **NADCAP** | Special process audit fields — Heat Treat, NDT, Welding, Chemical Processing |
| **AMS specifications** | Material specs (AMS 4928, AMS 5662, etc.), heat treat conditions |
| **ISO 2859-1 (AQL)** | Inspection levels, sample sizes, acceptance/rejection numbers |
| **ITAR/EAR** | Export control classification, USML categories, ECCN codes |
| **ISO 9001:2015** | Process approach KPIs, management review inputs |

### 0.4 Tiêu chuẩn sản xuất CNC cần nghiên cứu:

| Lĩnh vực | Fields cần bổ sung |
|---|---|
| **GD&T (ASME Y14.5)** | Geometric tolerance types, datum references, feature control frames |
| **Surface finish (ISO 1302)** | Ra, Rz, Rq values, machining process marks |
| **Thread standards** | UNC, UNF, metric threads, class of fit |
| **Hardness testing** | Rockwell (HRC/HRB), Brinell (HB), Vickers (HV) scales |
| **NDT methods** | FPI (fluorescent penetrant), MPI (magnetic particle), UT (ultrasonic), RT (radiographic), ET (eddy current) |
| **Tool management** | Tool ID, tool type, tool life, offset values, wear compensation |
| **Fixture management** | Fixture ID, fixture type, CMM fixture, certification date |
| **Machine parameters** | Spindle speed, feed rate, depth of cut, coolant type/pressure |
| **CMM inspection** | CMM program, datum setup, probe configuration, measurement uncertainty |

### 0.5 Chỉ thị nghiên cứu:

1. **Search the web** cho mỗi hệ thống ERP/QMS ở trên — đọc documentation, API reference, data model guides
2. **So sánh field lists** giữa các hệ thống — tìm common fields mà HESEM chưa có
3. **Bổ sung TẤT CẢ fields hợp lý** — nếu SAP có field mà HESEM chưa có → thêm vào
4. **Ưu tiên fields thực chiến** cho sản xuất CNC aerospace tại Việt Nam
5. **KHÔNG giới hạn số lượng fields** — càng nhiều càng tốt, miễn là hợp lý
6. **Target: 3,500-5,000 fields** cho data-fields.json (hiện có 1,610 — cần gấp 2-3x)

### 0.6 Danh sách field categories thường bị thiếu:

Khi nghiên cứu, đặc biệt chú ý bổ sung các nhóm fields sau:

**Traceability & Compliance:**
- lot_number, batch_number, serial_number, heat_number
- material_cert_number, coc_number, conformance_cert
- country_of_origin, country_of_manufacture
- itar_controlled, eccn_classification, usml_category
- customer_spec_ref, drawing_number, drawing_rev
- shelf_life_date, retest_date, expiration_date

**Manufacturing Process:**
- setup_time_actual, run_time_actual, queue_time, move_time
- machine_id, machine_name, workcenter_id, workcenter_name
- fixture_id, fixture_name, tool_list, tool_life_remaining
- coolant_type, coolant_concentration, coolant_ph
- spindle_hours, machine_hours_ytd, maintenance_due_date
- first_piece_approved, first_piece_approved_by, first_piece_date

**Quality & Inspection:**
- inspection_type (first_piece, in_process, final, receiving)
- sampling_plan (ANSI Z1.4, C=0, 100%)
- aql_level, inspection_level, lot_size
- accept_number, reject_number, sample_size
- characteristic_type (critical, major, minor, cosmetic)
- measurement_method, gage_id, gage_calibration_due
- cpk_value, ppk_value, mean_value, stdev_value
- usl, lsl, nominal, tolerance_plus, tolerance_minus

**Financial & Costing:**
- unit_cost, material_cost, labor_cost, overhead_cost, burden_rate
- standard_cost, actual_cost, variance_amount, variance_pct
- purchase_price, selling_price, margin_pct, markup_pct
- exchange_rate, base_currency_amount
- budget_amount, committed_amount, spent_amount

**Supplier & Purchasing:**
- vendor_id, vendor_name, vendor_code, vendor_rating
- lead_time_days, moq (minimum order quantity), order_multiple
- incoterms, payment_terms_code, credit_limit
- approved_manufacturer, approved_source
- conflict_mineral_status, reach_compliance, rohs_compliance

**Document & Revision Control:**
- document_number, revision_number, revision_date
- effective_date, obsolete_date, review_date
- change_order_number, ecn_number, dcn_number
- approval_workflow_id, approval_status, approver_list
- distribution_list, controlled_copy_number

**Scheduling & Capacity:**
- planned_start, planned_finish, actual_start, actual_finish
- slack_time, critical_path, float_days
- resource_id, resource_group, capacity_hours
- shift_pattern, overtime_hours, efficiency_factor
- sequence_number, operation_overlap_pct

**Audit & Training:**
- audit_type, audit_scope, audit_criteria
- finding_type (major_nc, minor_nc, observation, opportunity)
- training_requirement_id, competency_level
- qualification_expiry, retraining_due_date
- training_hours, assessment_score, pass_fail

---

## 1. Tổng quan hệ thống

**HESEM QMS Portal** — Hệ thống Quản lý Chất lượng cho sản xuất CNC hàng không vũ trụ, tích hợp Epicor Kinetic ERP.

- **Backend:** PHP 7.4+, PSR-4 autoloading
- **Frontend:** Vanilla JS SPA (không framework), IIFE modules
- **Database:** PostgreSQL 16+, 224+ bảng, 2,444+ cột
- **Kiến trúc module:** 10 workflow modules (Báo giá → Đơn hàng → Kế hoạch → Mua hàng → Sản xuất → Chất lượng → Hồ sơ → Báo cáo → Tài liệu → Quản trị)

---

## 2. Centralized Data Registry

Tất cả dữ liệu cấu hình cho Module Builder nằm tại:

```
01-QMS-Portal/qms-data/registry/
├── data-fields.json          ← *** CẦN MỞ RỘNG ***
├── api-params.json           ← *** CẦN TẠO MỚI ***
├── field-types.json          ← ĐÃ HOÀN THÀNH (25 loại)
├── status-options.json       ← ĐÃ HOÀN THÀNH (27 enum sets)
├── computed-formulas.json    ← ĐÃ HOÀN THÀNH (25 công thức)
└── iot-connectors.json       ← ĐÃ HOÀN THÀNH (9 connectors)
```

### Backend API truy cập registry:
- `GET api/?action=registry_data_fields` — Tất cả field definitions
- `GET api/?action=registry_data_fields&api=order_so_list` — Fields cho 1 API cụ thể
- `GET api/?action=registry_api_params` — Tất cả API params
- `GET api/?action=registry_field_types` — Loại field
- `GET api/?action=registry_status_options` — Enums/dropdowns
- `GET api/?action=registry_computed_formulas` — Công thức tính toán
- `GET api/?action=registry_iot_connectors` — IoT connectors
- `GET api/?action=registry_full` — Load toàn bộ (cho Module Builder init)

---

## 3. NHIỆM VỤ 1: Mở rộng data-fields.json

### File hiện tại: `01-QMS-Portal/qms-data/registry/data-fields.json`

**Trạng thái:** 246 endpoints, 1,610 fields (skeleton). Cần mở rộng lên ~3,700 fields.

### Format mỗi field:
```json
{
  "key": "snake_case_english",
  "label": "Tiếng Việt CÓ DẤU",
  "labelEn": "English Label",
  "type": "string|number|integer|currency|percent|date|datetime|time|boolean|badge|email|phone|url|image|json|textarea|select|tags|progress|color|duration|weight|dimension|uuid|code",
  "required": true/false,
  "filterable": true/false,
  "sortable": true/false
}
```

### QUY TẮC BẮT BUỘC:
1. **`key`**: Tiếng Anh, snake_case (ví dụ: `part_number`, `created_at`)
2. **`label`**: Tiếng Việt CÓ DẤU (ví dụ: "Mã sản phẩm", "Ngày tạo", "Trạng thái", "Số lượng")
3. **`labelEn`**: Tiếng Anh (ví dụ: "Part Number", "Created Date")
4. **KHÔNG BAO GIỜ** viết tiếng Việt thiếu dấu (sai: "Trang thai", đúng: "Trạng thái")
5. **`type`** phải là 1 trong 25 loại trong field-types.json

### Cách chọn type:
| Dữ liệu | Type |
|---|---|
| Trạng thái (status, result, phase) | `badge` |
| Dropdown chọn 1 giá trị | `select` |
| Chọn nhiều giá trị | `tags` |
| Tiền tệ (VND, USD) | `currency` |
| Phần trăm (%, rate) | `percent` |
| Ngày (không giờ) | `date` |
| Ngày + giờ | `datetime` |
| Thời gian (HH:mm) | `time` |
| Thời lượng (phút, giờ) | `duration` |
| Trọng lượng (kg, g) | `weight` |
| Kích thước (mm, cm) | `dimension` |
| Mô tả dài, ghi chú | `textarea` |
| Mã ID, UUID | `uuid` |
| Email | `email` |
| Số điện thoại | `phone` |
| URL/link | `url` |
| JSON phức tạp, array | `json` |
| Source code, NC code | `code` |
| Thanh tiến độ | `progress` |
| Có/Không | `boolean` |
| Hình ảnh | `image` |
| Số thập phân | `number` |
| Số nguyên | `integer` |
| Chuỗi ký tự | `string` |

### Cần bổ sung cho mỗi endpoint:
- **List endpoints** (`_list`): Nên có 12-20 cột (bao gồm cả các cột thường ẩn). Mọi cột đều `filterable: true`, `sortable: true`.
- **Detail endpoints** (`_detail`): Nên có 25-40+ fields. Bao gồm TẤT CẢ fields từ list + các field chi tiết thêm.
- **Create endpoints** (`_create`): Nên có 10-20 input fields. Đánh dấu `required: true` cho các field bắt buộc.
- **Update endpoints** (`_update`): Giống create nhưng id là required, các field khác optional.
- **Dashboard/KPI endpoints**: Nên có 10-15 metrics. `filterable: false`, `sortable: false`.
- **Transition endpoints**: 3-5 fields (entity_id, target_status, comment).

### Ví dụ endpoint cần mở rộng — `order_so_list`:
Hiện tại có ~12 fields. Cần bổ sung thêm:
- `customer_po` (string) — Số PO khách hàng
- `salesperson` (string) — Nhân viên kinh doanh
- `ship_to_address` (textarea) — Địa chỉ giao hàng
- `payment_method` (select) — Phương thức thanh toán
- `tax_rate` (percent) — Thuế suất
- `discount_pct` (percent) — Chiết khấu
- `net_amount` (currency) — Thành tiền sau chiết khấu
- `vat_amount` (currency) — Tiền VAT
- `grand_total` (currency) — Tổng cộng
- `delivery_method` (select) — Phương thức vận chuyển
- `estimated_ship_date` (date) — Ngày dự kiến giao
- `actual_ship_date` (date) — Ngày giao thực tế
- `hold_status` (badge) — Trạng thái hold
- `revision` (integer) — Phiên bản
- `is_urgent` (boolean) — Đơn gấp
- `linked_quote_id` (string) — Mã báo giá liên kết
- ...thêm 5-10 fields nữa tùy ngữ cảnh

### Ngữ cảnh ngành CNC aerospace:

Đây là sản xuất CNC cho hàng không vũ trụ, cần các fields đặc thù:
- **Part tracking:** part_number, part_rev, serial_number, lot_number, batch_number
- **Material:** material_type, material_grade, material_spec (e.g. AMS 4928), heat_treat_condition
- **Dimensions:** raw_length, raw_width, raw_height, finished_weight, buy_to_fly_ratio
- **Quality:** inspection_level, aql, sampling_plan, critical_characteristics
- **Compliance:** as9100_clause, nadcap_process, customer_spec_ref, export_control (ITAR/EAR)
- **Traceability:** genealogy_parent_id, material_cert_number, coc_number
- **CNC specific:** machine_type, spindle_hours, tool_list, fixture_id, program_number, setup_time, cycle_time
- **ERP integration:** epicor_part_num, epicor_job_num, epicor_so_num, erp_sync_status

---

## 4. NHIỆM VỤ 2: Tạo api-params.json

### File cần tạo: `01-QMS-Portal/qms-data/registry/api-params.json`

Mỗi entry định nghĩa **input parameters** và **response schema** cho 1 API endpoint.

### Format:
```json
{
  "_meta": { "version": "1.0", "description": "API parameter definitions — input params + response schema for every endpoint" },
  "order_so_list": {
    "method": "GET",
    "module": "Đơn hàng",
    "description": "Danh sách Sales Orders",
    "descriptionEn": "List all Sales Orders",
    "params": [
      { "key": "status", "type": "string", "required": false, "description": "Filter by status" },
      { "key": "customer_name", "type": "string", "required": false, "description": "Filter by customer" },
      { "key": "date_from", "type": "string", "required": false, "description": "Filter from date (YYYY-MM-DD)" },
      { "key": "date_to", "type": "string", "required": false, "description": "Filter to date (YYYY-MM-DD)" },
      { "key": "priority", "type": "string", "required": false, "description": "Filter by priority" },
      { "key": "sort_by", "type": "string", "required": false, "description": "Sort column name" },
      { "key": "sort_dir", "type": "string", "required": false, "description": "asc or desc" },
      { "key": "page", "type": "integer", "required": false, "description": "Page number (default 1)" },
      { "key": "per_page", "type": "integer", "required": false, "description": "Items per page (default 50)" },
      { "key": "search", "type": "string", "required": false, "description": "Full-text search keyword" }
    ],
    "response": {
      "type": "object",
      "fields": ["so_id", "so_number", "customer_name", "order_date", "due_date", "status", "priority", "total_value", "currency", "job_count", "completion_pct", "created_by"],
      "pagination": true,
      "total_field": "total_count"
    }
  },
  "order_so_create": {
    "method": "POST",
    "module": "Đơn hàng",
    "description": "Tạo Sales Order mới",
    "descriptionEn": "Create new Sales Order",
    "params": [
      { "key": "customer_name", "type": "string", "required": true, "description": "Customer name" },
      { "key": "customer_po", "type": "string", "required": false, "description": "Customer PO number" },
      { "key": "order_date", "type": "string", "required": true, "description": "Order date (YYYY-MM-DD)" },
      { "key": "due_date", "type": "string", "required": true, "description": "Due date (YYYY-MM-DD)" },
      { "key": "currency", "type": "string", "required": true, "description": "Currency code (VND/USD)" },
      { "key": "lines", "type": "array", "required": true, "description": "Order lines array" }
    ],
    "response": {
      "type": "object",
      "fields": ["so_id", "so_number"],
      "message": "Sales Order created successfully"
    }
  }
}
```

### Danh sách 246 API endpoints cần định nghĩa:

Tham khảo API_CATALOG trong file:
```
01-QMS-Portal/scripts/portal/00-block-engine.js (dòng 109-377)
```

Mỗi entry trong API_CATALOG có format:
```js
{ action:'quote_list', method:'GET', label:'Danh sách báo giá', module:'Báo giá' }
```

### Quy tắc cho params:
- **GET list endpoints**: Luôn có params: status, search, sort_by, sort_dir, page, per_page + các filter đặc thù
- **GET detail endpoints**: Luôn có param: id (required)
- **POST create endpoints**: Các input fields từ data-fields.json có `required: true`
- **POST update endpoints**: id (required) + các input fields (optional)
- **POST transition endpoints**: entity_id (required), target_status (required), comment (optional)
- **GET dashboard endpoints**: period (optional), date_from, date_to (optional)

---

## 5. Files tham khảo trong repository

Khi GPT cần hiểu cấu trúc, đọc các file sau:

### Cấu trúc data:
| File | Nội dung |
|---|---|
| `01-QMS-Portal/qms-data/registry/field-types.json` | 25 loại field (string, number, badge, select...) |
| `01-QMS-Portal/qms-data/registry/status-options.json` | 27 enum sets (so_status, ncr_status, priority...) |
| `01-QMS-Portal/qms-data/registry/computed-formulas.json` | 25 công thức tính toán |
| `01-QMS-Portal/qms-data/registry/iot-connectors.json` | 9 IoT connector definitions |
| `01-QMS-Portal/qms-data/registry/data-fields.json` | 246 endpoints × ~7 fields/endpoint = 1,610 fields (CẦN MỞ RỘNG) |

### Backend controllers (để hiểu API logic):
| File | Module |
|---|---|
| `01-QMS-Portal/api/controllers/OrderController.php` | Đơn hàng (SO/JO/WO) |
| `01-QMS-Portal/api/controllers/DispatchController.php` | Kế hoạch sản xuất |
| `01-QMS-Portal/api/controllers/LogisticsController.php` | Subcontract, OQC, Packing |
| `01-QMS-Portal/api/controllers/ExceptionController.php` | NCR/CAPA/Complaints |
| `01-QMS-Portal/api/controllers/SupplierController.php` | Mua hàng, IQC, SCAR |
| `01-QMS-Portal/api/controllers/QuoteController.php` | Báo giá |
| `01-QMS-Portal/api/controllers/EvidenceController.php` | Evidence Vault |
| `01-QMS-Portal/api/controllers/FmeaController.php` | FMEA, Control Plan |
| `01-QMS-Portal/api/controllers/ApqpController.php` | APQP/PPAP |
| `01-QMS-Portal/api/controllers/MobileController.php` | Shop floor mobile |
| `01-QMS-Portal/api/controllers/MasterDataController.php` | Master data + Shifts |
| `01-QMS-Portal/api/controllers/RegistryController.php` | Registry API |

### Database migrations (để hiểu schema):
```
01-QMS-Portal/database/migrations/
  001 → 045 (45 migration files, 224+ tables)
```

### Core standards (để hiểu quy tắc):
| File | Nội dung |
|---|---|
| `core-standards/32-module-architecture-v2.md` | Kiến trúc 10 module |
| `core-standards/33-api-mapping-per-module.md` | Mapping UI → API |
| `core-standards/35-language-convention.md` | Backend English, Frontend Vietnamese CÓ DẤU |

### Block Engine (để hiểu API catalog):
```
01-QMS-Portal/scripts/portal/00-block-engine.js
  Dòng 109-377: API_CATALOG (246 entries)
  Dòng 1-108: BLOCK_CATALOG (36 block types)
```

---

## 6. Checklist cho GPT

### Nhiệm vụ A: Mở rộng data-fields.json (1,610 → ~3,700 fields)

- [ ] Đọc file `data-fields.json` hiện tại
- [ ] Đọc `field-types.json` để hiểu 25 loại field
- [ ] Đọc `status-options.json` để hiểu các enum values
- [ ] Cho mỗi endpoint `_list`: bổ sung lên 15-20 fields
- [ ] Cho mỗi endpoint `_detail`: bổ sung lên 30-45 fields
- [ ] Cho mỗi endpoint `_create`: bổ sung lên 12-20 fields
- [ ] Cho mỗi endpoint `_dashboard`/`_kpi`: bổ sung lên 12-18 metrics
- [ ] Thêm aerospace-specific fields: material_spec, nadcap, ITAR, heat_lot, CoC
- [ ] Thêm ERP integration fields: epicor_*, erp_sync_status
- [ ] Thêm audit trail fields: created_by, created_at, updated_by, updated_at
- [ ] Kiểm tra tất cả labels tiếng Việt CÓ DẤU
- [ ] Output: file JSON hợp lệ, giữ nguyên _meta header

### Nhiệm vụ B: Tạo api-params.json (246 entries)

- [ ] Đọc API_CATALOG từ `00-block-engine.js` (dòng 109-377)
- [ ] Cho mỗi GET list: thêm filter params (status, search, date range, pagination)
- [ ] Cho mỗi GET detail: thêm id param
- [ ] Cho mỗi POST create: params từ data-fields.json required fields
- [ ] Cho mỗi POST update: id + optional fields
- [ ] Cho mỗi POST transition: entity_id, target_status, comment
- [ ] Response fields tham chiếu tới data-fields.json
- [ ] Output: file JSON hợp lệ

### Nhiệm vụ C (tùy chọn): Bổ sung status-options.json

Có thể thêm các enum sets:
- `inspection_level` (I, II, III, S1-S4 theo ISO 2859)
- `material_condition` (T6, T651, annealed, normalized...)
- `surface_finish` (Ra, Rz values)
- `thread_class` (2A, 2B, 3A, 3B)
- `tolerance_class` (ISO 286 fits)
- `nadcap_process` (heat_treat, welding, NDT, chemical_processing)
- `export_control` (ITAR, EAR99, ECCN)
- `packaging_type` (box, crate, pallet, VCI)

---

## 7. Lưu ý quan trọng

1. **KHÔNG thay đổi key `_meta`** — giữ nguyên header
2. **KHÔNG thay đổi tên key của endpoint** — phải khớp với API_CATALOG
3. **KHÔNG dùng type ngoài 25 loại** trong field-types.json
4. **Tiếng Việt PHẢI CÓ DẤU** — vi phạm quy tắc core-standards/35
5. **JSON phải hợp lệ** — validate trước khi save
6. **Encoding: UTF-8** — để hỗ trợ tiếng Việt
7. **File size:** data-fields.json khoảng 500KB-1MB khi hoàn chỉnh là bình thường

---

## 8. Ví dụ output mong đợi (1 endpoint hoàn chỉnh)

```json
"order_jo_detail": [
  { "key": "jo_id", "label": "Mã lệnh sản xuất", "labelEn": "Job Order ID", "type": "uuid", "required": false, "filterable": true, "sortable": false },
  { "key": "jo_number", "label": "Số lệnh sản xuất", "labelEn": "JO Number", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "so_number", "label": "Số đơn hàng", "labelEn": "SO Number", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "part_number", "label": "Mã sản phẩm", "labelEn": "Part Number", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "part_rev", "label": "Phiên bản", "labelEn": "Part Revision", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "part_description", "label": "Mô tả sản phẩm", "labelEn": "Part Description", "type": "string", "required": false, "filterable": true, "sortable": false },
  { "key": "customer_name", "label": "Tên khách hàng", "labelEn": "Customer Name", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "quantity", "label": "Số lượng", "labelEn": "Quantity", "type": "integer", "required": false, "filterable": true, "sortable": true },
  { "key": "quantity_completed", "label": "Số lượng hoàn thành", "labelEn": "Completed Quantity", "type": "integer", "required": false, "filterable": false, "sortable": true },
  { "key": "quantity_scrapped", "label": "Số lượng phế phẩm", "labelEn": "Scrapped Quantity", "type": "integer", "required": false, "filterable": false, "sortable": true },
  { "key": "status", "label": "Trạng thái", "labelEn": "Status", "type": "badge", "required": false, "filterable": true, "sortable": true },
  { "key": "priority", "label": "Độ ưu tiên", "labelEn": "Priority", "type": "badge", "required": false, "filterable": true, "sortable": true },
  { "key": "due_date", "label": "Ngày hạn", "labelEn": "Due Date", "type": "date", "required": false, "filterable": true, "sortable": true },
  { "key": "start_date", "label": "Ngày bắt đầu", "labelEn": "Start Date", "type": "date", "required": false, "filterable": true, "sortable": true },
  { "key": "completion_date", "label": "Ngày hoàn thành", "labelEn": "Completion Date", "type": "date", "required": false, "filterable": true, "sortable": true },
  { "key": "material_type", "label": "Loại vật liệu", "labelEn": "Material Type", "type": "select", "required": false, "filterable": true, "sortable": true },
  { "key": "material_grade", "label": "Mác vật liệu", "labelEn": "Material Grade", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "material_spec", "label": "Tiêu chuẩn vật liệu", "labelEn": "Material Specification", "type": "string", "required": false, "filterable": true, "sortable": false },
  { "key": "material_cert_number", "label": "Số chứng chỉ vật liệu", "labelEn": "Material Cert Number", "type": "string", "required": false, "filterable": true, "sortable": false },
  { "key": "heat_lot_number", "label": "Số lô nhiệt luyện", "labelEn": "Heat/Lot Number", "type": "string", "required": false, "filterable": true, "sortable": false },
  { "key": "raw_dimensions", "label": "Kích thước phôi", "labelEn": "Raw Dimensions", "type": "json", "required": false, "filterable": false, "sortable": false },
  { "key": "finished_dimensions", "label": "Kích thước thành phẩm", "labelEn": "Finished Dimensions", "type": "json", "required": false, "filterable": false, "sortable": false },
  { "key": "weight_each", "label": "Trọng lượng mỗi chi tiết", "labelEn": "Weight Each", "type": "weight", "required": false, "filterable": false, "sortable": true },
  { "key": "buy_to_fly_ratio", "label": "Tỷ lệ phôi/thành phẩm", "labelEn": "Buy-to-Fly Ratio", "type": "number", "required": false, "filterable": false, "sortable": true },
  { "key": "material_status", "label": "Trạng thái vật liệu", "labelEn": "Material Status", "type": "badge", "required": false, "filterable": true, "sortable": true },
  { "key": "progress_pct", "label": "Tiến độ (%)", "labelEn": "Progress %", "type": "progress", "required": false, "filterable": false, "sortable": true },
  { "key": "operations", "label": "Các nguyên công", "labelEn": "Operations", "type": "json", "required": false, "filterable": false, "sortable": false },
  { "key": "work_orders", "label": "Danh sách WO", "labelEn": "Work Orders", "type": "json", "required": false, "filterable": false, "sortable": false },
  { "key": "quality_records", "label": "Hồ sơ chất lượng", "labelEn": "Quality Records", "type": "json", "required": false, "filterable": false, "sortable": false },
  { "key": "routing", "label": "Bảng định tuyến", "labelEn": "Routing", "type": "json", "required": false, "filterable": false, "sortable": false },
  { "key": "notes", "label": "Ghi chú", "labelEn": "Notes", "type": "textarea", "required": false, "filterable": false, "sortable": false },
  { "key": "epicor_job_num", "label": "Mã Job Epicor", "labelEn": "Epicor Job Number", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "erp_sync_status", "label": "Trạng thái đồng bộ ERP", "labelEn": "ERP Sync Status", "type": "badge", "required": false, "filterable": true, "sortable": true },
  { "key": "export_control", "label": "Kiểm soát xuất khẩu", "labelEn": "Export Control", "type": "select", "required": false, "filterable": true, "sortable": false },
  { "key": "customer_spec_ref", "label": "Tham chiếu spec khách hàng", "labelEn": "Customer Spec Reference", "type": "string", "required": false, "filterable": true, "sortable": false },
  { "key": "created_by", "label": "Người tạo", "labelEn": "Created By", "type": "string", "required": false, "filterable": true, "sortable": true },
  { "key": "created_at", "label": "Ngày tạo", "labelEn": "Created At", "type": "datetime", "required": false, "filterable": true, "sortable": true },
  { "key": "updated_by", "label": "Người cập nhật", "labelEn": "Updated By", "type": "string", "required": false, "filterable": false, "sortable": false },
  { "key": "updated_at", "label": "Ngày cập nhật", "labelEn": "Updated At", "type": "datetime", "required": false, "filterable": true, "sortable": true }
]
```

Đó là 39 fields cho 1 detail endpoint. Mỗi detail cần mức chi tiết tương tự.

---

---

## 9. PERFORMANCE EXPECTATIONS — KHÔNG ĐƯỢC LÀM ÍT

> **BẮT BUỘC:** Output của bạn PHẢI đạt các chỉ tiêu sau. Nếu không đạt → làm lại.

### data-fields.json:
| Metric | Minimum | Target |
|---|---|---|
| Tổng số endpoints | 246 | 246 (không thêm endpoint mới) |
| Tổng số fields | 3,000 | 4,000-5,000 |
| Fields trung bình / list endpoint | 15 | 20+ |
| Fields trung bình / detail endpoint | 30 | 40+ |
| Fields trung bình / create endpoint | 12 | 18+ |
| Fields trung bình / dashboard endpoint | 10 | 15+ |
| Aerospace-specific fields (material, compliance, NDT) | 200 | 400+ |
| ERP integration fields (epicor_*, erp_*) | 50 | 100+ |
| Audit trail fields (created_by, updated_at...) | 500 | 700+ |

### api-params.json:
| Metric | Minimum | Target |
|---|---|---|
| Tổng số endpoints | 246 | 246 |
| Params trung bình / GET list | 8 | 12+ |
| Params trung bình / POST create | 8 | 15+ |
| Filter params for list endpoints | 6 | 10+ (bao gồm date range, multi-status, text search) |

### Quy tắc "Nếu nghi ngờ → thêm vào":
- Nếu bạn nghĩ field NÀY có thể hữu ích → THÊM VÀO
- Nếu SAP/Oracle/Epicor có field mà chúng tôi chưa có → THÊM VÀO
- Nếu AS9100/NADCAP yêu cầu data point nào → THÊM VÀO
- Nếu field có thể cần cho reporting/analytics → THÊM VÀO
- Nếu field hỗ trợ traceability → THÊM VÀO
- CHỈ BỎ QUA nếu field HOÀN TOÀN không liên quan đến CNC aerospace manufacturing

### Phân chia output nếu quá lớn:
Nếu JSON quá lớn cho 1 lần output, chia thành các phần:
1. `data-fields-quoting-orders.json` (Module 1-2)
2. `data-fields-planning-purchasing.json` (Module 3-4)
3. `data-fields-production.json` (Module 5)
4. `data-fields-quality.json` (Module 6)
5. `data-fields-records-reports.json` (Module 7-8)
6. `data-fields-documents-admin.json` (Module 9-10-11)

Người dùng sẽ merge lại sau.

---

## 10. Quick Start cho GPT

1. Đọc file này (GPT-REGISTRY-BUILD-GUIDE.md) — bạn đang đọc
2. Đọc `01-QMS-Portal/qms-data/registry/field-types.json` — hiểu 25 loại field
3. Đọc `01-QMS-Portal/qms-data/registry/status-options.json` — hiểu enum values
4. Đọc `01-QMS-Portal/qms-data/registry/data-fields.json` — hiểu skeleton hiện tại
5. Đọc `01-QMS-Portal/scripts/portal/00-block-engine.js` dòng 109-377 — API_CATALOG
6. **SEARCH THE WEB** cho Epicor Kinetic data models, SAP manufacturing fields, AS9100 requirements
7. Bắt đầu mở rộng data-fields.json — endpoint by endpoint
8. Tạo api-params.json mới từ đầu
9. (Tùy chọn) Bổ sung thêm status-options.json

**REMEMBER: Càng nhiều fields càng tốt. Target 4,000+ fields. Đừng tiết kiệm.**

---

**END OF GUIDE**
