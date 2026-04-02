# PROMPT: Nâng cấp Data Registry — HESEM QMS Portal

> Copy toàn bộ nội dung bên dưới, paste vào GPT. GPT sẽ tự truy cập repo, đọc file, nghiên cứu thế giới, và tạo output.

---

## BẮT ĐẦU COPY TỪ ĐÂY ↓

Bạn là chuyên gia ERP/QMS với 20 năm kinh nghiệm trong sản xuất CNC hàng không vũ trụ. Nhiệm vụ: nâng cấp Centralized Data Registry cho hệ thống HESEM QMS Portal.

### BƯỚC 1: TRUY CẬP REPOSITORY VÀ ĐỌC TÀI LIỆU

Repo GitHub: `https://github.com/sanhvo86-hesem/hesemqms`
Branch: `main`

**BẮT BUỘC đọc các file sau TRƯỚC KHI bắt đầu:**

1. **Hướng dẫn chi tiết:**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/GPT-REGISTRY-BUILD-GUIDE.md`
   → ĐỌC TOÀN BỘ. Đây là tài liệu hướng dẫn chính. Mọi quy tắc, format, ví dụ đều ở đây.

2. **Field types (25 loại):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/field-types.json`
   → Đọc để hiểu 25 loại field hợp lệ (string, number, badge, select, tags, currency, percent, date, datetime, uuid, code, weight, dimension, duration, etc.)

3. **Status options (27 enum sets):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/status-options.json`
   → Đọc để hiểu các enum values có sẵn (so_status, ncr_status, priority, severity, etc.)

4. **Data fields hiện tại (1,610 fields — CẦN MỞ RỘNG):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/data-fields.json`
   → Đọc để hiểu skeleton hiện tại. MỖI endpoint cần gấp 2-3x fields.

5. **Computed formulas (25 công thức):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/computed-formulas.json`
   → Đọc để hiểu format công thức. Cần bổ sung thêm.

6. **IoT connectors (9 loại):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/iot-connectors.json`
   → Đọc để hiểu format connector.

7. **API Catalog (246 endpoints — trong Block Engine JS, dòng 109-377):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/scripts/portal/00-block-engine.js`
   → Đọc dòng 109-377 để hiểu TẤT CẢ 246 API endpoints. Đây là danh sách master — mỗi endpoint cần field definitions.

8. **Kiến trúc module:**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/core-standards/32-module-architecture-v2.md`
   → Đọc để hiểu 10 module workflow.

9. **API mapping per module:**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/core-standards/33-api-mapping-per-module.md`
   → Đọc để hiểu mapping UI → API.

### BƯỚC 2: NGHIÊN CỨU THẾ GIỚI

Sau khi đọc hết tài liệu, BẮT BUỘC search web và nghiên cứu:

**Hệ thống ERP (data model, field definitions):**
- Epicor Kinetic REST API v2 — Part, Job, Quote, PO, SO schemas (ĐÂY LÀ ERP CHÍNH)
- SAP S/4HANA Material Master, Production Order, QM module fields
- Oracle Cloud Manufacturing, Supply Chain fields
- Infor CloudSuite Industrial (SyteLine) — Job/WO/Quality fields
- IQMS (DELMIAworks) — Quality, SPC, OEE fields
- Plex Manufacturing Cloud — Traceability, PCN fields

**Hệ thống QMS (CAPA, NCR, Audit field definitions):**
- ETQ Reliance, MasterControl, ComplianceQuest, Sparta TrackWise

**Tiêu chuẩn hàng không:**
- AS9100 Rev D — documented information requirements
- AS9102 FAI — 3 form field definitions
- AS9145 APQP/PPAP — 5 phase + 18 PPAP element fields
- NADCAP special processes — Heat Treat, NDT, Chemical Processing fields
- ISO 2859-1 (AQL) — sampling plan fields
- ITAR/EAR export control classifications

**Tiêu chuẩn sản xuất CNC:**
- GD&T (ASME Y14.5), Surface finish (ISO 1302), Thread standards
- NDT methods (FPI, MPI, UT, RT, ET), Hardness testing scales
- Tool management, Fixture management, CMM inspection fields

### BƯỚC 3: TẠO OUTPUT

Dựa trên tài liệu đã đọc + nghiên cứu thế giới, tạo **3 outputs**:

#### Output 1: data-fields.json MỞ RỘNG
- Giữ nguyên TẤT CẢ fields hiện tại trong file
- BỔ SUNG thêm fields cho mỗi endpoint để đạt target:
  - List endpoints: 18-25 fields
  - Detail endpoints: 35-50 fields
  - Create endpoints: 15-25 fields
  - Dashboard/KPI endpoints: 12-20 metrics
- Tổng target: 3,500-5,000 fields (hiện có 1,610)
- Format mỗi field: `{ "key": "snake_case", "label": "Tiếng Việt CÓ DẤU", "labelEn": "English", "type": "valid_type", "required": bool, "filterable": bool, "sortable": bool }`
- **KHÔNG quên aerospace fields:** material_spec, heat_lot, nadcap_process, itar_controlled, coc_number, drawing_number, customer_spec_ref, export_control
- **KHÔNG quên ERP fields:** epicor_part_num, epicor_job_num, erp_sync_status
- **KHÔNG quên audit fields:** created_by, created_at, updated_by, updated_at cho MỌI endpoint

#### Output 2: api-params.json MỚI
- 246 entries (1 per API endpoint)
- Format:
```json
{
  "action_name": {
    "method": "GET|POST",
    "module": "Tên module (Vietnamese)",
    "description": "Mô tả (Vietnamese có dấu)",
    "descriptionEn": "English description",
    "params": [
      { "key": "param_name", "type": "string|integer|array|object", "required": true/false, "description": "English description" }
    ],
    "response": {
      "type": "object|array",
      "fields": ["field1", "field2"],
      "pagination": true/false
    }
  }
}
```
- GET list endpoints: luôn có params: status, search, sort_by, sort_dir, page, per_page + filters đặc thù
- GET detail: id param required
- POST create: required fields from data-fields
- POST transition: entity_id, target_status, comment

#### Output 3: Bổ sung status-options.json
Thêm các enum sets mới cho aerospace:
- inspection_level (I, II, III, S1-S4)
- material_condition (T6, T651, annealed, normalized, etc.)
- surface_finish_standard (Ra values)
- ndt_method (FPI, MPI, UT, RT, ET)
- nadcap_process (heat_treat, welding, ndt, chemical_processing, etc.)
- export_control (ITAR, EAR99, ECCN categories)
- hardness_scale (HRC, HRB, HB, HV)
- thread_class (2A, 2B, 3A, 3B)
- packaging_type (box, crate, pallet, VCI)
- certificate_type (CoC, CoA, material_cert, test_report, FAI)
- deviation_type (material, dimension, process, documentation)
- audit_finding_type (major_nc, minor_nc, observation, opportunity)
- training_status (required, in_progress, completed, expired)

### QUY TẮC BẮT BUỘC:
1. **Tiếng Việt PHẢI CÓ DẤU** — "Trạng thái" không phải "Trang thai"
2. **Field key tiếng Anh snake_case** — "part_number" không phải "partNumber"
3. **Type phải nằm trong 25 loại** — đọc field-types.json
4. **JSON hợp lệ** — validate trước khi trả
5. **UTF-8 encoding**
6. Nếu output quá lớn, chia thành nhiều phần theo module

### BẮT ĐẦU NGAY. ĐỌC REPO TRƯỚC, NGHIÊN CỨU THẾ GIỚI, RỒI TẠO OUTPUT. KHÔNG HỎI THÊM.

## KẾT THÚC COPY ↑
