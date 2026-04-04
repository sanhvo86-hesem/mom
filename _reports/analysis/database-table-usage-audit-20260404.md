# KIỂM TRA ĐÁNH GIÁ TOÀN HỆ THỐNG: BẢNG DỮ LIỆU & WORKFLOW

**Ngày:** 2026-04-04
**Phạm vi:** 430 bảng SQL, 45 service PHP, 69 migration files
**Phương pháp:** Cross-reference migration SQL vs PHP code references vs JSON file stores

---

## 1. PHÂN LOẠI BẢNG DỮ LIỆU

### 1.1 Tổng quan

| Phân loại | Số lượng | Tỷ lệ | Ý nghĩa |
|-----------|:--------:|:------:|---------|
| **ACTIVE** -- Đang dùng trong PHP code | 39 | 9% | Runtime production |
| **JSON_EQUIVALENT** -- Dữ liệu lưu trong JSON thay vì DB | 48 | 11% | Hoạt động nhưng không qua PostgreSQL |
| **PLANNED** -- Có schema SQL nhưng chưa có PHP code | 343 | 80% | Enterprise roadmap |
| **Tổng** | **430** | 100% | |

### 1.2 Tại sao 391 bảng KHÔNG được sử dụng?

**Câu trả lời ngắn:** Kiến trúc HESEM QMS sử dụng mô hình **"JSON-first, SQL-shadow"**. Dữ liệu vận hành thực tế được lưu trong JSON files. PostgreSQL chỉ được dùng như shadow/sync layer qua `RuntimeShadowSync.php`. 391 bảng SQL là phần **roadmap enterprise ERP** -- đã thiết kế schema nhưng chưa có business logic PHP phía sau.

**Phân tích chi tiết theo module:**

#### A. Module đã vận hành (JSON + partial SQL) -- 87 bảng equivalent

| Module | Bảng SQL | PHP Code | Data Store thực tế | Đánh giá |
|--------|:--------:|:--------:|--------------------|---------|
| Core System | 6 | Yes | PostgreSQL (users, audit_events) + JSON | **OK** -- dual mode |
| Document Control | 3 | Yes | JSON (manifests) + DB (documents) | **OK** -- hybrid |
| Form System | 3 | Yes | DB (form_entries) + JSON (schemas) | **OK** |
| Order Management | 6 | Yes | **JSON only** (orders.json) | **RISK** -- nên migrate sang DB |
| MES Runtime | 25 | Yes | DB (mes_* tables via RuntimeShadowSync) | **OK** -- most mature DB usage |
| ERP Integration | 3 | Yes | JSON (epicor-runtime.json) + DB sync | **OK** |
| Supplier Quality | 6 | Yes | **JSON only** (supplier-quality/*.json) | **RISK** |
| Quality (NCR/CAPA/FAI) | 8 | Partial | DB schema exists, JSON primary | **GAP** -- schema có nhưng PHP chưa dùng DB |
| Calibration | 5 | Partial | DB schema exists, service normalization only | **GAP** |
| Training/HR | 4 | Partial | DB schema exists, not queried | **GAP** |
| Audit/Risk | 6 | Partial | DB schema exists, not queried | **GAP** |
| Master Data | 12 | Yes | JSON (master-data.json) + DB shadow | **OK** -- dual write |

#### B. Module có schema nhưng HOÀN TOÀN chưa implement -- 343 bảng

| Module | Số bảng | Lý do chưa implement |
|--------|:-------:|---------------------|
| Advanced Planning (APS) | 13 | Tính năng MRP/APS enterprise -- cần thuật toán scheduling phức tạp |
| BI/Data Warehouse | 12 | Star schema analytics -- cần ETL pipeline chưa build |
| CRM Pipeline | 10 | CRM chưa phải priority cho manufacturing |
| Commercial/Contract | 12 | Quản lý hợp đồng phức tạp -- chưa cần cho quy mô hiện tại |
| Customer Portal | 13 | Portal khách hàng -- phase sau |
| EHS/Sustainability | 15 | An toàn lao động -- module riêng |
| Engineering Process | 14 | Standard operations/time studies -- cần industrial engineering |
| Evidence Vault | 4 | Đã implement bằng JSON (EvidenceVaultService.php) |
| Finance Extended | 20 | GL/AP/AR/Treasury -- cần finance module riêng |
| HCM/Workforce | 14 | HR module -- cần tích hợp payroll |
| Lean Manufacturing | 8 | **MỚI TẠO** (migration 069) -- chưa có service PHP |
| MES Extended | 34 | Phần mở rộng MES -- SPC violations, OEE snapshots đã có schema |
| Master Data Governance | 12 | MDM framework -- enterprise grade |
| NCR/MRB Enhanced | 5 | **MỚI TẠO** (migration 069) -- chưa wire vào PHP |
| OQC/Packing | 5 | Kiểm tra xuất hàng -- chưa implement |
| Outsourcing | 12 | Gia công ngoài -- chưa có nghiệp vụ |
| PLM Change Control | 12 | Quản lý thay đổi sản phẩm -- enterprise |
| Projects/Portfolio | 10 | Quản lý dự án -- chưa priority |
| S&OP Planning | 8 | Sales & Operations Planning -- enterprise |
| SRM Extended | 14 | Supplier Relationship Management mở rộng |
| Service/Warranty | 12 | Hậu mãi/bảo hành -- không áp dụng cho job shop |
| Shipping/Compliance | 12 | Logistics mở rộng |
| Tooling Lifecycle | 12 | Quản lý dụng cụ chi tiết |
| Trade Compliance | 22 | ITAR/EAR compliance mở rộng |
| WMS Extended | 13 | Warehouse management mở rộng |

---

## 2. ĐÁNH GIÁ HỆ THỐNG

### 2.1 Kiến trúc dữ liệu hiện tại

```
┌──────────────────────────────────────────────────┐
│                   PHP Services                    │
│  (45 services + api.php = business logic layer)   │
├──────────┬───────────────────────────┬────────────┤
│          │                           │            │
│  JSON    │   RuntimeShadowSync.php   │  Direct    │
│  Files   │   (bridge JSON → SQL)     │  SQL via   │
│  (80%)   │                           │  PDO (20%) │
│          │                           │            │
├──────────┼───────────────────────────┼────────────┤
│ qms-data/│                           │ PostgreSQL │
│ *.json   │   DataLayer.php           │ 39 tables  │
│ 48 stores│   (mode switching)        │ active     │
└──────────┴───────────────────────────┴────────────┘
```

### 2.2 Điểm mạnh

| # | Điểm mạnh | Bằng chứng |
|---|-----------|-----------|
| 1 | **Schema thiết kế toàn diện** | 430 bảng covering ERP/QMS/MES/HCM/Finance/SCM -- vision enterprise rõ ràng |
| 2 | **Dual persistence layer** | DataLayer.php hỗ trợ JSON_ONLY / SHADOW_WRITE / POSTGRES_PRIMARY modes |
| 3 | **MES database mature** | 25+ mes_* tables đang active -- real-time telemetry, alarms, dispatch |
| 4 | **Audit trail tamper-proof** | audit_events partitioned by quarter, hash-chain integrity |
| 5 | **Bitemporal design** | valid_from/valid_to trên document_versions, item_revisions, user_roles |
| 6 | **Computed columns** | OEE = availability * performance * quality (GENERATED ALWAYS) |
| 7 | **Flexible JSON fallback** | Mọi service đều có graceful degradation khi DB unavailable |

### 2.3 Điểm yếu nghiêm trọng

| # | Vấn đề | Mức độ | Tác động |
|---|--------|--------|----------|
| 1 | **JSON là primary store cho dữ liệu quan trọng** | CRITICAL | orders.json chứa toàn bộ SO/JO/WO -- concurrent write race, không query được, không index |
| 2 | **391/430 bảng SQL không có PHP code** | HIGH | Schema thiết kế công phu nhưng 91% chưa dùng -- technical debt |
| 3 | **Quality tables có schema nhưng PHP dùng JSON** | HIGH | ncr_records, capa_records, fai_records có trong DB nhưng WorkflowEngine dùng JSON |
| 4 | **Không có DB migration runner** | MEDIUM | 69 migration files nhưng không thấy migration execution tool |
| 5 | **Lean tables mới tạo chưa wire** | MEDIUM | 069_lean_manufacturing_world_class.sql tạo 15 bảng nhưng PHP services chưa dùng |
| 6 | **RuntimeShadowSync chỉ sync 1 chiều** | MEDIUM | JSON → DB nhưng DB changes không sync ngược |

---

## 3. PHÂN LOẠI CHI TIẾT: BẢNG KHÔNG SỬ DỤNG

### 3.1 Loại A: Nên LOẠI BỎ hoặc MERGE (22 bảng)

Bảng trùng lặp chức năng hoặc không phù hợp quy mô hiện tại:

| Bảng | Lý do nên loại/merge |
|------|---------------------|
| `svc_*` (12 bảng) | Service/Warranty -- HESEM là job shop, không phải after-sales service company |
| `crm_forecasts` | CRM sales forecast -- quá sớm cho quy mô hiện tại |
| `crm_campaigns` | Marketing campaigns -- không phải core manufacturing |
| `dw_*` (8 bảng) | Data warehouse -- nên dùng materialized views thay vì ETL riêng |

### 3.2 Loại B: Nên GIỮ nhưng DEFER (188 bảng)

Bảng có giá trị nhưng chưa cần thiết trong 12-24 tháng:

| Module | Bảng | Lý do defer |
|--------|:----:|------------|
| Finance Extended | 20 | Cần tích hợp accounting system trước |
| HCM/Workforce | 14 | Cần HR system trước |
| Trade Compliance | 22 | Cần khi có hợp đồng ITAR lớn |
| PLM Change Control | 12 | Cần khi có engineering team riêng |
| WMS Extended | 13 | Cần khi có warehouse phức tạp |
| S&OP Planning | 8 | Cần khi scale lên multi-plant |
| Projects Portfolio | 10 | Cần khi có PMO |
| APS | 13 | Cần MRP engine trước |
| SRM Extended | 14 | Cần khi supplier base > 100 |
| Tooling Lifecycle | 12 | Cần khi tooling inventory phức tạp |
| Customer Portal | 13 | Phase sau khi core ổn định |
| Engineering Process | 14 | Cần industrial engineering team |
| Outsource Extended | 12 | Cần khi gia công ngoài > 30% |
| EHS Sustainability | 15 | Cần khi có ISO 14001 project |

### 3.3 Loại C: Nên KÍCH HOẠT NGAY (133 bảng)

Bảng đã có schema, nghiệp vụ đã implement (bằng JSON), cần wire vào PostgreSQL:

| Module | Bảng cần kích hoạt | Priority | Tác động |
|--------|:-------------------:|:--------:|----------|
| **Orders** | sales_orders, job_orders + lines | **P0** | Concurrent access, queryability, reporting |
| **NCR/CAPA/FAI** | ncr_records, capa_records, fai_records, fai_characteristics | **P0** | AS9100D compliance |
| **NCR Enhanced** | ncr_mrb_decisions, ncr_human_factors | **P1** | AS9100D §8.7 |
| **CAPA Enhanced** | capa_8d_steps, capa_effectiveness_checks | **P1** | AS9100D §10.2 |
| **Calibration** | calibration_records, calibration_oot_investigations, calibration_grr_studies | **P1** | ISO 17025 |
| **Lean** | lean_kaizen_events, lean_qrqc_events, lean_andon_events, lean_5s_audits, lean_smed_events | **P2** | Lean manufacturing |
| **Lean meetings** | lean_tier_meetings, lean_tier_escalations, lean_gemba_walks | **P2** | Daily management |
| **Quality Lab** | qual_effectiveness_reviews, qual_root_cause_sessions, qual_first_article_packages | **P2** | Quality analytics |
| **Supplier** | approved_supplier_list, supplier_scorecards, skip_lot_tracking | **P2** | Supplier management |
| **OEE** | mes_oee_snapshots, mes_oee_loss_events | **P2** | TPM/OEE |
| **Workflow** | workflow_step_data, workflow_instances | **P1** | Traceability |
| **SPC** | spc_anomaly_rules, spc_data (enhanced) | **P2** | Statistical control |
| **Training** | training_records, skills_matrix, employee_certifications | **P1** | AS9100D §7.2 |
| **Audit** | audits, audit_findings, audit_actions | **P1** | Internal audit |
| **Risk** | risk_register, improvement_projects | **P2** | Risk management |
| **FMEA** | fmea_records, fmea_failure_modes, control_plans | **P2** | FMEA/APQP |
| **FAI Trigger** | fai_trigger_log | **P1** | AS9102 |
| **Exceptions** | deviations, concessions, customer_complaints | **P2** | Exception management |
| **Mobile** | mobile_work_queue, mobile_time_entries | **P3** | Shop floor mobile |
| **Evidence** | evidence_vault, evidence_links, evidence_chain_custody | **P2** | Evidence management |

---

## 4. ĐỀ XUẤT CẢI TIẾN

### 4.1 Immediate (Phase 1: 0-4 tuần)

**Mục tiêu: Kích hoạt PostgreSQL cho dữ liệu quan trọng nhất**

| # | Action | Files ảnh hưởng | Effort |
|---|--------|----------------|--------|
| 1 | **Migrate OrderWorkflowService từ JSON → DB** | OrderWorkflowService.php | 3 days |
| 2 | **Wire WorkflowEngine.executeTransition() lưu workflow_step_data vào DB** | WorkflowEngine.php | 2 days |
| 3 | **Wire SupplierQualityService SCAR/incoming vào DB** | SupplierQualityService.php | 2 days |
| 4 | **Kích hoạt RuntimeShadowSync cho NCR/CAPA/FAI** | RuntimeShadowSync.php | 1 day |
| 5 | **Tạo migration runner script** | database/migrate.php | 1 day |

### 4.2 Short-term (Phase 2: 1-3 tháng)

**Mục tiêu: Kích hoạt lean tables + quality enhanced tables**

| # | Action | Impact |
|---|--------|--------|
| 1 | Wire lean_kaizen_events, lean_qrqc_events, lean_andon_events vào services | Lean manufacturing operational |
| 2 | Wire capa_8d_steps, capa_effectiveness_checks | CAPA 8D compliance |
| 3 | Wire calibration_oot_investigations, calibration_grr_studies | ISO 17025 compliance |
| 4 | Wire fai_trigger_log | AS9102 trigger tracking |
| 5 | Implement DataLayer SHADOW_WRITE mode cho tất cả services | Dual-write testing |

### 4.3 Medium-term (Phase 3: 3-6 tháng)

**Mục tiêu: Full PostgreSQL primary cho core modules**

| # | Action |
|---|--------|
| 1 | Switch DataLayer mode từ JSON_ONLY → POSTGRES_PRIMARY cho orders |
| 2 | Implement bi-directional sync (DB → JSON cache) |
| 3 | Enable materialized views thay vì dw_* tables |
| 4 | Implement DB-based notification queue thay vì JSONL files |
| 5 | Audit trail consolidation: tất cả services ghi vào audit_events table |

### 4.4 Long-term (Phase 4: 6-12 tháng)

| # | Action |
|---|--------|
| 1 | Decommission JSON primary stores cho core data |
| 2 | Implement CQRS: Write → PostgreSQL, Read → Redis/materialized views |
| 3 | Kích hoạt APS module (13 tables) khi cần MRP |
| 4 | Kích hoạt Finance module khi tích hợp accounting |
| 5 | Archive/remove 22 bảng không phù hợp (service/warranty, CRM campaigns) |

---

## 5. KẾT LUẬN

### Verdict

Hệ thống HESEM có **kiến trúc database ambitious và forward-looking** (430 bảng enterprise-grade) nhưng **thực tế vận hành chủ yếu trên JSON files**. Đây không phải bug -- đây là **chiến lược phát triển phân kỳ** có chủ đích (DataLayer.php có mode switching JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY).

### Con số quan trọng

| Metric | Hiện tại | Mục tiêu 3 tháng | Mục tiêu 12 tháng |
|--------|:--------:|:----------------:|:-----------------:|
| Bảng SQL active | 39 (9%) | 80 (19%) | 170 (40%) |
| Bảng nên loại bỏ | 0 | 22 (5%) | 22 (5%) |
| Services dùng DB | 15 (33%) | 25 (56%) | 40 (89%) |
| Data trên JSON (critical) | 48 stores | 20 stores | 5 stores |
| Data trên PostgreSQL (critical) | 39 tables | 80 tables | 170 tables |

### Ưu tiên #1

**Migrate `orders.json` sang PostgreSQL.** Đây là single point of failure lớn nhất: toàn bộ SO/JO/WO trong 1 JSON file, concurrent write race condition, không query được cho reporting, không index cho performance.
