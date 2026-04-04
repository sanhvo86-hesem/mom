# DB Field Governance Audit 2026-04-04

## 1. Can cu va workflow

Audit nay duoc lap tu 4 nguon chinh:

1. `01-QMS-Portal/database/migrations/001..069` la nguon su that cho schema.
2. `01-QMS-Portal/qms-data/registry/table-registry.json` va `orphan-resolution.json` la lop governance field/workflow sau khi da chay lai generator.
3. `audit_schema.py` la lop doi chieu field registry <-> cot DB <-> workflow library.
4. `01-QMS-Portal/qms-data/registry/workflow-library.json` la can cu de danh gia bang nao dang nam trong workflow nao.

Workflow audit duoc thuc hien theo chuoi:

1. Parse toan bo migration de lay danh sach bang/cot thuc.
2. Map bang vao domain va workflow.
3. Doi chieu cot DB voi field registry hien co.
4. Phat hien field chong lan, field mo ho, field chua du, va field dang bi day vao JSONB.
5. Tu danh gia lai bang audit tool sau khi sua tool drift, roi de xuat chuan dat ten va roadmap cai tien tiep.

## 2. Tong ket dieu hanh

Trang thai hien tai sau khi chay lai audit:

- 521 bang
- 6,991 cot
- 3,645 ten cot duy nhat
- 48 domain
- 4,068 field key dang hoat dong trong `data-fields`
- 2,303 endpoint field registry
- 420 workflow definition
- 0 ten cot DB bi thieu trong active field registry
- 422 field synthetic/runtime/computed can tiep tuc governance hoa hoac loai bo theo muc dich

Ket luan ngan:

- He thong da vuot muc "QMS portal" va dang la bo schema ERP/QMS/MES rat lon.
- Lop schema khong yeu; diem yeu nam o governance field, naming, va ranh gioi giua master/subtype/runtime JSON.
- Muon dinh vi "world-class", uu tien khong phai la them bang moi, ma la lam ro:
  - bang nao la master,
  - bang nao la subtype,
  - field nao la persisted business fact,
  - field nao chi la joined/computed/runtime.

Trang thai sau chuan hoa tu dong:

- `lean_andon_events`, `lean_kaizen_events`, `lean_qrqc_events`, `lean_smed_events` da duoc sua tu support table thanh primary workflow table.
- `generate-data-fields-registry.mjs` da dung chung bo naming voi `generate-table-architecture.mjs`, khong con moi generator dat ten 1 kieu.
- `generate-module-builder-registry.mjs` da qua het quality gate:
  - 2,299 endpoint catalog
  - 3,126 field pack
  - 803 relation edge
  - `qualityChecksPassed = true`
- `audit_schema.py` da duoc nang cap de doc registry sinh tu migration lam nguon chuan, khong con lech 6855 vs 6991 cot.

## 3. Phat hien quan trong nhat

### P0. Lop audit truoc day da bi lech schema

Truoc khi sua:

- `generate-table-architecture.mjs` dung o bang `calibration_grr_studies`.
- `audit_schema.py` doc sai `data-fields.json` dang o dang split file, dan den chia cho 0.
- registry dang dung moc 505 bang trong khi schema thuc da la 521 bang.

Y nghia:

- Neu khong sua tool truoc, moi bao cao "du field/chua du field" deu co nguy co sai can cu.

Da cai tien:

- map du migration `069`
- bo hard-code so luong bang/cot cu
- dong bo lai `table_columns.json`
- sua `audit_schema.py` de doc split registry va nested workflow library

### P1. 16 bang moi cua migration 069 truoc day bi mu

Cac bang vua duoc dua vao governance layer:

- `workflow_step_data`
- `ncr_mrb_decisions`
- `ncr_human_factors`
- `capa_8d_steps`
- `capa_effectiveness_checks`
- `calibration_oot_investigations`
- `calibration_grr_studies`
- `lean_kaizen_events`
- `lean_qrqc_events`
- `lean_andon_events`
- `lean_5s_audits`
- `lean_gemba_walks`
- `lean_smed_events`
- `lean_tier_meetings`
- `lean_tier_escalations`
- `fai_trigger_log`

Nhan xet:

- Day la nhom "world-class workflow" that su.
- Truoc khi map lai, he thong governance coi nhu khong biet chung ton tai.
- Sau khi map, domain `lean_manufacturing` da duoc tach rieng; nhom quality/calibration/system moi da co cho dung.

### P1. Lop registry nguon cu van con backlog, nhung active field registry da phu kin DB column name

Sau chuan hoa lan nay:

- active `data-fields` da phu 100% ten cot DB duy nhat: `0/3645` cot bi thieu
- `orphan-resolution.json` van con backlog o lop registry nguon cu, chu yeu de team tiep tuc governance hoa field theo domain va workflow
- nhung cot truoc day dat ten xau/khong on dinh da duoc chuan hoa label:
  - `item_class` -> `Phan hang ma hang` / `Item Class`
  - `uom` -> `Don vi tinh` / `UOM`
  - `weight_gross` -> `Khoi luong gop` / `Gross Weight`
  - `mrb_date` -> `Ngay MRB` / `MRB Date`
  - `oot_discovery_date` -> `Ngay phat hien OOT` / `OOT Discovery Date`
  - `grr_pct` -> `Ty le GRR` / `GRR Percent`
  - `qrqc_number` -> `So QRQC` / `QRQC Number`
  - `smed_number` -> `So SMED` / `SMED Number`

Y nghia:

- Lop van hanh thuc te da noi duoc het cot DB vao field registry.
- Backlog con lai khong con la "thieu cot", ma la "can tiep tuc lam sach va hop thuc hoa field synthetic/join/runtime".

### P1. Thieu bo field governance de dat muc world-class

Tren nhom bang giao dich khong phai support table, cac field sau dang thieu tren dien rong:

- `site_id`: thieu 391 bang
- `plant_id`: thieu 395 bang
- `company_code`: thieu 395 bang
- `legal_entity_code`: thieu 395 bang
- `source_system`: thieu 395 bang
- `source_record_id`: thieu 395 bang
- `row_version`: thieu 395 bang
- `payload_schema_version`: thieu 394 bang

Y nghia:

- He thong hien tai manh ve process, nhung chua du manh ve multi-site, entity governance, integration lineage, va optimistic locking.
- Day la bo field bat buoc neu muon "mang tam ERP enterprise" that su.

### P1. Co chong lan concept giua master table va extension/subtype table

Cap bang can governance ro:

- `users` <-> `employees`
- `customers` <-> `commercial_accounts`
- `vendors` <-> `approved_supplier_list`
- `records` <-> `ncr_records`
- `records` <-> `capa_records`
- `records` <-> `fai_records`

Danh gia:

- `users` phai la login identity master.
- `employees` phai la workforce/HR master.
- `customers` phai la commercial/customer master.
- `commercial_accounts` chi nen la extension 1-1 hoac profile table.
- `vendors` phai la supplier master.
- `approved_supplier_list` chi nen la bang qualification/approval theo scope.
- `records` phai la supertype digital-thread chung, con `ncr/capa/fai` la child process table.

Neu khong rat de xay ra:

- duplicate field
- ghi de khong co SSOT
- logic API kho quyet dinh bang nao la nguon su that

### P2. Nhieu field ten qua chung, kho hoi dung cau hoi nghiep vu

So lan xuat hien cua mot so ten cot chung:

- `metadata`: 490 bang
- `status`: 82 bang
- `description`: 34 bang
- `notes`: 26 bang
- `title`: 15 bang
- `result`: 4 bang
- `data`: 2 bang

Van de:

- `metadata` dang bi dung qua rong, rat de bien thanh "kho chua moi thu".
- `status` tot khi bang chi co 1 lifecycle; xau khi bang co nhieu status khac nhau.
- `data`, `result`, `notes`, `description` neu khong prefix se rat kho hoi:
  - du lieu gi?
  - ket qua cua cai gi?
  - ghi chu cho buoc nao?
  - mo ta doi tuong hay mo ta su co?

### P2. Co nhieu bang da co nhieu status con van de cot `status` chung

Vi du:

- `job_operations`: `status`, `first_piece_status`, `handover_status`, `quality_gate_status`, `serial_lot_trace_status`
- `documents`: `status`, `control_status`
- `apqp_gate_reviews`: `status`, `deliverables_status`
- `mobile_work_queue`: `task_status`, `sync_status`

Rule de xuat:

- Neu bang chi co 1 lifecycle chinh: duoc phep dung `status`.
- Neu bang co tu 2 lifecycle tro len: phai dat ten day du, khong dung `status` chung.
- Uu tien:
  - `workflow_status`
  - `approval_status`
  - `sync_status`
  - `quality_gate_status`
  - `delivery_status`
  - `financial_status`

### P2. JSONB dang bi dung nhieu o mot so bang nghiep vu moi

Bang co tu 4 JSONB cot tro len:

- `capa_8d_steps`: 9
- `lean_smed_events`: 6
- `lean_tier_meetings`: 6
- `lean_kaizen_events`: 5
- `mes_genealogy_operations`: 5
- `ncr_mrb_decisions`: 5
- `calibration_oot_investigations`: 4
- `lean_5s_audits`: 4
- `lean_gemba_walks`: 4

Khuyen nghi:

- JSONB duoc dung cho:
  - evidence snapshot
  - dynamic checklist
  - imported payload
  - changelog
- JSONB khong nen la noi chua business fact cot loi lap lai va can query nhieu.

## 4. Bo cau hoi nghiep vu ngan gon cho tung loai field

Muc tieu cua phan nay la "khong dung tu kho". Moi nhom field phai tra loi duoc cau hoi rat ngan.

### 4.1 Nhom nhan dang

Cau hoi:

- Ban ghi nay la cai gi?
- Nguoi dung go ma nao de tim?
- Ma noi bo va ma khach hang co khac nhau khong?

Field mau:

- `<entity>_id`
- `<entity>_code`
- `<entity>_number`
- `external_ref`
- `legacy_ref`

### 4.2 Nhom so huu va trach nhiem

Cau hoi:

- Ai tao?
- Ai dang chiu trach nhiem?
- Ai duyet?
- Ai dong?

Field mau:

- `created_by_user_id`
- `owner_user_id`
- `assigned_to_user_id`
- `approved_by_user_id`
- `closed_by_user_id`

### 4.3 Nhom workflow

Cau hoi:

- Dang o buoc nao?
- Dang bi giu o cong doan nao?
- Co duoc chuyen tiep khong?

Field mau:

- `workflow_status`
- `workflow_step`
- `workflow_state`
- `hold_reason_code`
- `reopen_count`

### 4.4 Nhom thoi gian va SLA

Cau hoi:

- Bat dau luc nao?
- Han khi nao?
- Xong khi nao?
- Tre bao lau?

Field mau:

- `requested_at`
- `target_date`
- `due_at`
- `completed_at`
- `closed_at`
- `sla_due_at`
- `elapsed_seconds`

### 4.5 Nhom pham vi to chuc

Cau hoi:

- Thuoc site nao?
- Thuoc plant nao?
- Thuoc cong ty/phap nhan nao?
- Thuoc bo phan, line, work center nao?

Field mau:

- `site_id`
- `plant_id`
- `company_code`
- `legal_entity_code`
- `dept_code`
- `work_center_id`

### 4.6 Nhom truy xuat va lien ket

Cau hoi:

- Anh huong den item/job/lot/serial nao?
- Den tu nguon nao?
- Noi voi ho so nao?

Field mau:

- `item_id`
- `job_order_id`
- `lot_number`
- `serial_number`
- `record_id`
- `parent_record_id`
- `source_system`
- `source_record_id`

### 4.7 Nhom chat luong/rui ro

Cau hoi:

- Muc do nghiem trong la gi?
- Co containment chua?
- Nguyen nhan goc da xac minh chua?
- Co can khach hang/supplier tham gia khong?

Field mau:

- `severity_level`
- `risk_level`
- `containment_status`
- `root_cause_verified_at`
- `customer_impact_flag`
- `supplier_impact_flag`
- `effectiveness_result`

### 4.8 Nhom bang chung

Cau hoi:

- Can file gi?
- Da ky chua?
- Co hash/chu ky/chuoi custody khong?

Field mau:

- `evidence_required_flag`
- `attachment_count`
- `signature_hash`
- `evidence_pack_id`
- `custody_status`

### 4.9 Nhom integration/governance

Cau hoi:

- Du lieu den tu dau?
- Ban schema nao?
- Ban ghi da sync chua?
- Neu hai nguoi cung sua thi ai thang?

Field mau:

- `source_system`
- `source_record_id`
- `payload_schema_version`
- `sync_status`
- `last_synced_at`
- `row_version`
- `idempotency_key`

## 5. Chuan dat ten de dam bao thong nhat, khong chong lan

### 5.1 Quy tac tong

- PK: giu theo chuan domain hien co, nhung bat buoc ket thuc bang `_id`
- FK: bat buoc trung ten voi PK cua bang cha hoac ro chu the, vi du `owner_user_id`, `employee_id`
- boolean: bat dau bang `is_`, `has_`, `can_`, `requires_`
- datetime: ket thuc bang `_at`
- date: ket thuc bang `_date`
- enum: ket thuc bang `_status`, `_type`, `_category`, `_method`, `_level`, `_result`
- metric: ket thuc bang `_qty`, `_pct`, `_amount`, `_hours`, `_minutes`, `_seconds`
- JSONB: chi dung hau to `_payload`, `_snapshot`, `_details`, `_refs`, `_list`

### 5.2 Khong nen dung neu khong co prefix

Can tranh dung don le:

- `status`
- `type`
- `result`
- `data`
- `info`
- `notes`
- `description`
- `value`
- `category`
- `level`

Neu bat buoc dung, phai doi thanh dang co nghia:

- `approval_status`
- `workflow_status`
- `inspection_result`
- `step_notes`
- `customer_requirement_description`
- `risk_level`
- `root_cause_category`

### 5.3 Quy tac duy nhat cho field registry

DB cot co the trung ten giua nhieu bang.
Field registry thi khong duoc trung nghia mo ho.

De xuat:

- key field registry bat buoc o dang `<table>.<column>` hoac `<entity>_<column>` co namespace
- tuyet doi khong expose field registry dang `status`, `name`, `data`, `notes` ma khong co namespace

## 6. Field can bo sung de tien len world-class

### 6.1 Bo field bat buoc cho moi transactional header

De xuat them hoac chuan hoa:

- `site_id`
- `plant_id`
- `company_code`
- `legal_entity_code`
- `source_system`
- `source_record_id`
- `payload_schema_version`
- `row_version`
- `workflow_status`
- `workflow_step`
- `owner_user_id`
- `closed_at`
- `closed_by_user_id`

### 6.2 Cho NCR / CAPA / FAI / calibration

De xuat them:

- `containment_due_at`
- `root_cause_verified_at`
- `effectiveness_due_at`
- `effectiveness_result`
- `customer_impact_flag`
- `supplier_impact_flag`
- `escape_risk_level`
- `linked_control_plan_id`
- `linked_fmea_id`
- `measurement_family_code`

### 6.3 Cho lean manufacturing

De xuat them:

- `event_number` hoac `meeting_number` cho cac bang dang chi co UUID
- `workflow_status` cho `lean_tier_meetings`
- `response_due_at` va `response_seconds`
- `verification_due_at`
- `benefit_amount`
- `benefit_currency_code`
- `yokoten_required_flag`
- `yokoten_completed_at`
- `escalation_sla_breached_flag`

### 6.4 Cho workflow step capture

`workflow_step_data` nen them:

- `workflow_instance_id`
- `step_sequence`
- `validation_result`
- `payload_schema_version`
- `idempotency_key`
- `entered_by_user_id` neu can tach voi `captured_by`

## 7. Giai quyet chong lan giua cac bang

### 7.1 `users` va `employees`

Quy dinh SSOT:

- `users`: danh tinh dang nhap, quyen, session
- `employees`: ho so nhan su, cong viec, nang luc
- lien ket bang `employee_id`
- khong lap lai `dept_code`, `shift`, `manager` o ca hai bang neu khong co effective-dated rule

### 7.2 `customers` va `commercial_accounts`

Quy dinh SSOT:

- `customers`: master customer
- `commercial_accounts`: profile mo rong 1-1 ve contract/pricing/credit
- khong sao chep contact/address neu khong co ly do versioning

### 7.3 `vendors` va `approved_supplier_list`

Quy dinh SSOT:

- `vendors`: supplier master
- `approved_supplier_list`: qualification/approval theo pham vi
- unique de xuat: `(vendor_id, site_id, scope_code, process_code, valid_from)`

### 7.4 `records` va bang con `ncr/capa/fai`

Quy dinh SSOT:

- `records` giu digital-thread chung
- bang con giu business fact rieng
- khong lap lai title/status/owner neu khong co muc dich performance va da co rule dong bo

## 8. Uu tien cai tien

### Dot 1

- Chot SSOT cho `users/employees`, `customers/commercial_accounts`, `vendors/approved_supplier_list`, `records/*`
- Field registry hoa 433 cot DB dang "co that ma chua duoc dat ten"
- Namespace hoa field registry de khong con key mo ho

### Dot 2

- Bo sung bo field governance chung: `site_id`, `plant_id`, `company_code`, `legal_entity_code`, `source_system`, `row_version`, `payload_schema_version`
- Chuan hoa bo owner/approver/closer
- Tach `status` chung thanh status theo lifecycle

### Dot 3

- Giam JSONB o cac bang nghiep vu moi
- Dua cac danh sach lap lai thanh child tables neu can query/BI
- Tiep tuc dong bo workflow library va module builder

## 9. Tu danh gia va cai tien tiep

Da lam duoc:

- sua tool audit de theo kip migration 069
- chay lai governance registry tren schema 521 bang
- lam ro nhom field thieu, field chong lan, va naming ambiguity

Con chua xong:

- 433 cot DB chua co field definition van chua duoc day vao field registry
- 191 field key van dang duoc danh gia la "nen co cot that"
- nhom field governance world-class van chua duoc them vao schema

Buoc cai tien tiep de xuat:

1. Chot bo naming rule nay thanh standard.
2. Tao backlog migration cho bo field governance chung.
3. Tao backlog registry cho top 10 bang thieu field definition nhieu nhat.
4. Sau do moi mo rong them service/API, neu khong se tiep tuc co hien tuong "DB co ma he thong khong biet dung".
