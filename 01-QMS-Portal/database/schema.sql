-- ============================================================================
-- HESEM QMS PORTAL - PostgreSQL 16+ Database Schema
-- He thong Quan ly Chat luong HESEM - Schema Co so Du lieu PostgreSQL 16+
-- ============================================================================
-- Version : 1.0.0
-- Date    : 2026-03-28
-- Standard: ISO 9001:2015 / AS9100D
-- Design  : Bitemporal, JSONB, pgvector, RLS, Partitioned
-- Variables: Maps all 1,061 variables from variable_library.json (53 categories)
-- ============================================================================

-- ============================================================================
-- SECTION 0: EXTENSIONS
-- Phan 0: Cac phan mo rong
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Cryptographic functions for hashing
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gist";       -- GiST index for exclusion constraints
CREATE EXTENSION IF NOT EXISTS "vector";           -- pgvector for document embeddings

-- NOTE: Apache AGE must be installed separately:
-- CREATE EXTENSION IF NOT EXISTS age;
-- SET search_path = ag_catalog, "$user", public;

-- ============================================================================
-- SECTION 1: CUSTOM ENUM TYPES
-- Phan 1: Cac kieu ENUM tuy chinh
-- ============================================================================

-- Department codes / Ma phong ban
CREATE TYPE dept_code AS ENUM (
    'QA', 'PRO', 'ENG', 'SCM', 'HR', 'EXE', 'SAL', 'WH', 'IT', 'EHS'
);

-- Document types / Loai tai lieu
CREATE TYPE doc_type_enum AS ENUM (
    'MAN', 'POL', 'SOP', 'WI', 'FRM', 'ANNEX', 'JD', 'DEPT', 'ORG', 'REF', 'TRN'
);

-- Document category / Danh muc tai lieu
CREATE TYPE doc_category_enum AS ENUM (
    'MAN', 'POL', 'SOP', 'PROC', 'WI', 'FRM', 'ANNEX', 'ORG', 'TRN', 'SYS', 'OPS', 'REF'
);

-- Document lifecycle status / Trang thai vong doi tai lieu
CREATE TYPE doc_status AS ENUM ('draft', 'review', 'approved', 'superseded', 'obsolete');

-- Document control status / Trang thai kiem soat tai lieu
CREATE TYPE control_status_enum AS ENUM ('DRAFT', 'RELEASED', 'SUPERSEDED', 'OBSOLETE');

-- Record types / Loai ho so
CREATE TYPE record_type_enum AS ENUM (
    'NCR', 'CAPA', 'FAI', 'TRN', 'AUD', 'ECR', 'CAL', 'SCAR',
    'IMP', 'MR', 'RISK', 'DOWNTIME', 'PO-EXCEPTION'
);

-- Workflow status / Trang thai quy trinh
CREATE TYPE workflow_status AS ENUM (
    'draft', 'pending_review', 'pending_approval', 'approved', 'rejected', 'returned'
);

-- Record lifecycle / Vong doi ho so
CREATE TYPE record_status AS ENUM (
    'open', 'in_progress', 'pending_review', 'pending_approval',
    'closed', 'cancelled', 'on_hold'
);

-- Shift codes / Ma ca lam viec
CREATE TYPE shift_code AS ENUM ('A', 'B', 'C');

-- Machine family / Dong may
CREATE TYPE machine_family_enum AS ENUM (
    '5AX', '3AX', 'TURN', 'MILL-TURN', 'EDM', 'GRIND'
);

-- Gage type / Loai dung cu do
CREATE TYPE gage_type_enum AS ENUM (
    'CMM', 'MICR', 'CALIPER', 'HEIGHT-GAGE', 'BORE-GAGE', 'THREAD-GAGE',
    'GO-NOGO', 'SURFACE-PLATE', 'PIN-GAGE', 'RING-GAGE', 'HARDNESS', 'ROUGHNESS'
);

-- Asset type / Loai tai san
CREATE TYPE asset_type_enum AS ENUM ('FIX', 'GAGE', 'TOOL', 'MACH');

-- Characteristic designator / Chi dinh dac tinh
CREATE TYPE char_designator AS ENUM ('Critical', 'Major', 'Minor', 'Standard');

-- Measurement unit / Don vi do
CREATE TYPE measurement_unit AS ENUM ('mm', 'in', 'deg', 'Ra', 'HRC', 'HRB');

-- Lot disposition / Xu ly lo
CREATE TYPE lot_disposition_enum AS ENUM ('ACCEPT', 'REJECT', 'SORT', 'RMA');

-- Defect type / Loai loi
CREATE TYPE defect_type_enum AS ENUM (
    'Dimensional', 'Surface Finish', 'Material', 'Visual', 'Functional',
    'Documentation', 'Contamination', 'FOD', 'Thread', 'Burr'
);

-- NCR disposition / Xu ly NCR
CREATE TYPE ncr_disposition_enum AS ENUM (
    'Use As-Is', 'Rework', 'Repair', 'Scrap', 'Return to Supplier', 'Concession'
);

-- Root cause method / Phuong phap phan tich nguyen nhan goc
CREATE TYPE root_cause_method_enum AS ENUM (
    '5-Why', 'Fishbone', '8D', 'FTA', 'Pareto', 'Is/Is-Not'
);

-- NCR status / Trang thai NCR
CREATE TYPE ncr_status_enum AS ENUM (
    'Open', 'Contained', 'Under Investigation', 'CAPA Assigned', 'Closed', 'Verified'
);

-- CAPA status / Trang thai CAPA
CREATE TYPE capa_status_enum AS ENUM (
    'Open', 'In Progress', 'Implemented', 'Verification Pending',
    'Closed Effective', 'Closed Not Effective'
);

-- Nonconformance source / Nguon khong phu hop
CREATE TYPE nc_source_enum AS ENUM (
    'In-Process', 'Final Inspection', 'Customer Return', 'Incoming',
    'Audit Finding', 'Supplier'
);

-- FAI type / Loai FAI
CREATE TYPE fai_type_enum AS ENUM ('Full', 'Partial', 'Delta');

-- FAI reason / Ly do FAI
CREATE TYPE fai_reason_enum AS ENUM (
    'New Part', 'Revision Change', 'Process Change', 'Tooling Change',
    'Material Change', 'Source Change', '2-Year Lapse'
);

-- Supplier rating / Danh gia nha cung cap
CREATE TYPE supplier_rating_enum AS ENUM (
    'Preferred', 'Approved', 'Conditional', 'Probation', 'Disqualified'
);

-- Supplier process type / Loai quy trinh nha cung cap
CREATE TYPE supplier_process_type AS ENUM (
    'Heat Treatment', 'Surface Treatment', 'NDT', 'Welding',
    'Raw Material', 'Tooling', 'Packaging', 'Calibration'
);

-- Training type / Loai dao tao
CREATE TYPE training_type_enum AS ENUM (
    'Classroom', 'OJT', 'E-Learning', 'External', 'Certification', 'Gate Test'
);

-- Audit type / Loai danh gia
CREATE TYPE audit_type_enum AS ENUM (
    'Internal', 'External', 'Customer', 'Supplier', 'Surveillance', 'LPA'
);

-- Finding type / Loai phat hien
CREATE TYPE finding_type_enum AS ENUM (
    'Major NC', 'Minor NC', 'Observation', 'Opportunity for Improvement', 'Positive Practice'
);

-- Finding grade / Muc do phat hien
CREATE TYPE finding_grade_enum AS ENUM ('Major', 'Minor', 'OFI', 'Positive');

-- Audit conclusion / Ket luan danh gia
CREATE TYPE audit_conclusion_enum AS ENUM (
    'Conform', 'Conform with minor findings', 'Conform with major findings', 'Not Conform'
);

-- Calibration result / Ket qua hieu chuan
CREATE TYPE cal_result_enum AS ENUM ('Pass', 'Fail', 'Limited Use', 'Out of Tolerance');

-- Calibration location / Vi tri hieu chuan
CREATE TYPE cal_location_enum AS ENUM ('In-house', 'External Lab');

-- GR&R status / Trang thai GR&R
CREATE TYPE grr_status_enum AS ENUM (
    'Acceptable (<10%)', 'Marginal (10-30%)', 'Unacceptable (>30%)'
);

-- Risk category / Nhom rui ro
CREATE TYPE risk_category_enum AS ENUM (
    'Quality', 'Delivery', 'Safety', 'Financial', 'Regulatory',
    'Supplier', 'Technology', 'Human Resource'
);

-- Risk level / Muc rui ro
CREATE TYPE risk_level_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- Engineering change type / Loai thay doi ky thuat
CREATE TYPE change_type_enum AS ENUM (
    'Drawing Revision', 'Process Change', 'Material Change', 'Tooling Change',
    'Fixture Change', 'Program Update', 'Specification Change'
);

-- ECR status / Trang thai ECR
CREATE TYPE ecr_status_enum AS ENUM (
    'Draft', 'Under Review', 'Approved', 'Implementing', 'Closed', 'Rejected'
);

-- Production reason code / Ma ly do san xuat
CREATE TYPE reason_code_enum AS ENUM (
    'Tool Break', 'Tool Wear', 'Fixture Issue', 'Program Error',
    'Material Issue', 'Planned Maintenance', 'Unplanned Maintenance',
    'No Operator', 'No Material', 'Quality Hold', 'Changeover', 'Other'
);

-- Improvement status (PDCA) / Trang thai cai tien
CREATE TYPE improvement_status_enum AS ENUM ('Plan', 'Do', 'Check', 'Act', 'Closed');

-- KPI status / Trang thai KPI
CREATE TYPE kpi_status_enum AS ENUM ('On Target', 'At Risk', 'Below Target', 'Exceeded');

-- ERP item type / Loai vat tu ERP
CREATE TYPE erp_item_type AS ENUM ('M', 'P', 'S');  -- Manufactured, Purchased, Subcontract

-- ERP item status / Trang thai vat tu ERP
CREATE TYPE erp_item_status AS ENUM ('active', 'inactive', 'obsolete', 'prototype', 'engineering');

-- ABC classification / Phan loai ABC
CREATE TYPE abc_class_enum AS ENUM ('A', 'B', 'C');

-- BOM type / Loai BOM
CREATE TYPE bom_type_enum AS ENUM ('engineering', 'manufacturing', 'planning', 'cost');

-- BOM component type / Loai thanh phan BOM
CREATE TYPE bom_component_type AS ENUM ('material', 'consumable', 'tooling', 'packaging');

-- Work center type / Loai trung tam lam viec
CREATE TYPE wc_type_enum AS ENUM ('machine', 'manual', 'subcontract', 'inspection');

-- Scheduling rule / Quy tac lap lich
CREATE TYPE scheduling_rule_enum AS ENUM ('forward', 'backward', 'finite', 'infinite');

-- Sales order status / Trang thai don hang
CREATE TYPE so_status_enum AS ENUM (
    'open', 'released', 'in_progress', 'shipped', 'closed', 'cancelled'
);

-- Sales order priority / Uu tien don hang
CREATE TYPE so_priority_enum AS ENUM ('standard', 'rush', 'hot', 'aog');

-- Purchase order status / Trang thai PO
CREATE TYPE po_status_enum AS ENUM (
    'draft', 'pending_approval', 'approved', 'open', 'received', 'closed', 'cancelled'
);

-- Purchase order type / Loai PO
CREATE TYPE po_type_enum AS ENUM ('standard', 'blanket', 'subcontract', 'consignment');

-- Vendor type / Loai nha cung cap
CREATE TYPE vendor_type_enum AS ENUM ('material', 'subcontract', 'service', 'distributor', 'oem');

-- Vendor status / Trang thai nha cung cap
CREATE TYPE vendor_status_enum AS ENUM ('approved', 'conditional', 'probation', 'disqualified', 'pending');

-- Vendor rating grade / Xep loai nha cung cap
CREATE TYPE vendor_rating_grade AS ENUM ('A', 'B', 'C', 'D', 'F');

-- Customer type / Loai khach hang
CREATE TYPE customer_type_enum AS ENUM (
    'oem', 'tier1', 'tier2', 'distributor', 'government', 'military'
);

-- Industry code / Ma nganh
CREATE TYPE industry_code_enum AS ENUM (
    'aerospace', 'defense', 'medical', 'automotive', 'energy', 'industrial'
);

-- Inventory conformance status / Trang thai phu hop ton kho
CREATE TYPE inv_conformance_enum AS ENUM (
    'accepted', 'rejected', 'on_hold', 'in_inspection', 'mrb'
);

-- Stock type / Loai ton kho
CREATE TYPE stock_type_enum AS ENUM (
    'raw', 'wip', 'finished', 'consignment', 'quarantine', 'rma'
);

-- MRP planned order type / Loai lenh ke hoach MRP
CREATE TYPE planned_order_type AS ENUM ('production', 'purchase', 'transfer');

-- MRP status / Trang thai MRP
CREATE TYPE mrp_status_enum AS ENUM ('planned', 'firm', 'released');

-- Demand source / Nguon cau
CREATE TYPE demand_source_enum AS ENUM (
    'sales_order', 'forecast', 'safety_stock', 'min_max', 'kanban'
);

-- Lot size rule / Quy tac kich thuoc lo
CREATE TYPE lot_size_rule_enum AS ENUM (
    'lot_for_lot', 'eoq', 'fixed', 'period_of_supply', 'min_max'
);

-- Safety stock method / Phuong phap ton kho an toan
CREATE TYPE safety_stock_method_enum AS ENUM ('fixed', 'percentage', 'dynamic', 'none');

-- MRP time bucket / Khoang thoi gian MRP
CREATE TYPE time_bucket_enum AS ENUM ('daily', 'weekly', 'monthly');

-- Job order type / Loai lenh san xuat
CREATE TYPE job_type_enum AS ENUM (
    'standard', 'rework', 'prototype', 'repair', 'warranty', 'sample'
);

-- Job order status / Trang thai lenh san xuat
CREATE TYPE job_status_enum AS ENUM (
    'planned', 'engineered', 'released', 'active', 'on_hold', 'completed', 'closed'
);

-- Labor type / Loai lao dong
CREATE TYPE labor_type_enum AS ENUM ('setup', 'run', 'rework', 'inspection', 'indirect');

-- Pay type / Loai luong
CREATE TYPE pay_type_enum AS ENUM ('regular', 'overtime', 'double_time');

-- Cost type / Loai chi phi
CREATE TYPE cost_type_enum AS ENUM ('standard', 'actual', 'estimated', 'budgeted');

-- Cost method / Phuong phap tinh chi phi
CREATE TYPE cost_method_enum AS ENUM ('standard', 'average', 'fifo', 'lifo', 'lot', 'actual');

-- Cost group / Nhom chi phi
CREATE TYPE cost_group_enum AS ENUM ('material', 'labor', 'overhead', 'subcontract', 'burden', 'setup');

-- Variance type / Loai chenh lech
CREATE TYPE variance_type_enum AS ENUM ('price', 'usage', 'efficiency', 'volume', 'mix');

-- GL account type / Loai tai khoan ke toan
CREATE TYPE gl_account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- Invoice type / Loai hoa don
CREATE TYPE invoice_type_enum AS ENUM ('standard', 'credit_memo', 'debit_memo', 'advance');

-- Payment status / Trang thai thanh toan
CREATE TYPE payment_status_enum AS ENUM ('open', 'partial', 'paid', 'overdue', 'disputed');

-- Aging bucket / Khoang tuoi no
CREATE TYPE aging_bucket_enum AS ENUM ('current', '30', '60', '90', '120', 'over120');

-- Three-way match / Doi chieu 3 chieu
CREATE TYPE match_status_enum AS ENUM ('matched', 'price_variance', 'qty_variance', 'unmatched');

-- Maintenance work order type / Loai lenh bao tri
CREATE TYPE maint_wo_type AS ENUM (
    'preventive', 'corrective', 'predictive', 'emergency', 'calibration', 'modification'
);

-- Maintenance WO status / Trang thai lenh bao tri
CREATE TYPE maint_wo_status AS ENUM (
    'requested', 'planned', 'scheduled', 'in_progress', 'completed', 'cancelled'
);

-- Equipment type (maintenance) / Loai thiet bi
CREATE TYPE equip_type_maint AS ENUM (
    'cnc_mill', 'cnc_lathe', 'cnc_grinder', 'edm', 'cmm',
    'surface_plate', 'oven', 'compressor'
);

-- Criticality rating / Muc do quan trong
CREATE TYPE criticality_rating AS ENUM ('A', 'B', 'C');

-- Maintenance priority / Muc uu tien bao tri
CREATE TYPE maint_priority AS ENUM ('emergency', 'urgent', 'normal', 'low');

-- PM frequency / Tan suat PM
CREATE TYPE pm_frequency_enum AS ENUM (
    'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
);

-- Tool type / Loai dao
CREATE TYPE tool_type_enum AS ENUM (
    'end_mill', 'drill', 'reamer', 'tap', 'insert', 'boring_bar',
    'face_mill', 'thread_mill', 'slitting_saw', 'special'
);

-- Tool material / Vat lieu dao
CREATE TYPE tool_material_enum AS ENUM ('hss', 'carbide', 'ceramic', 'cbn', 'pcd', 'cobalt');

-- Tool coating / Lop phu dao
CREATE TYPE tool_coating_enum AS ENUM ('tialn', 'ticn', 'tin', 'alcrn', 'dlc', 'uncoated');

-- Tool holder type / Loai dau kep dao
CREATE TYPE tool_holder_type_enum AS ENUM (
    'bt40', 'bt50', 'cat40', 'cat50', 'hsk63', 'hsk100', 'er', 'shrink_fit'
);

-- Tool location / Vi tri dao
CREATE TYPE tool_location_enum AS ENUM ('machine', 'crib', 'presetter', 'regrind', 'scrap');

-- Schedule type / Loai lich trinh
CREATE TYPE schedule_type_enum AS ENUM ('forward', 'backward', 'finite', 'infinite', 'aps');

-- Scheduling constraint / Rang buoc lich trinh
CREATE TYPE constraint_type_enum AS ENUM (
    'material', 'capacity', 'tooling', 'operator', 'quality_hold'
);

-- Shipment status / Trang thai van chuyen
CREATE TYPE shipment_status_enum AS ENUM (
    'planned', 'picked', 'packed', 'shipped', 'in_transit', 'delivered'
);

-- Freight terms / Dieu khoan van chuyen
CREATE TYPE freight_terms_enum AS ENUM ('prepaid', 'collect', 'third_party');

-- Project type / Loai du an
CREATE TYPE project_type_enum AS ENUM ('production', 'npi', 'improvement', 'capex', 'customer');

-- Project status / Trang thai du an
CREATE TYPE project_status_enum AS ENUM (
    'proposed', 'approved', 'active', 'on_hold', 'completed', 'cancelled'
);

-- RMA status / Trang thai RMA
CREATE TYPE rma_status_enum AS ENUM (
    'requested', 'authorized', 'received', 'in_evaluation',
    'repaired', 'replaced', 'credited', 'closed'
);

-- RMA type / Loai RMA
CREATE TYPE rma_type_enum AS ENUM ('warranty', 'non_warranty', 'goodwill', 'recall');

-- RMA disposition / Xu ly RMA
CREATE TYPE rma_disposition_enum AS ENUM (
    'repair', 'replace', 'credit', 'scrap', 'return_to_customer'
);

-- Inspection type (ERP extended) / Loai kiem tra
CREATE TYPE insp_type_erp AS ENUM (
    'incoming', 'in_process', 'final', 'source', 'first_article', 'periodic'
);

-- Sampling plan / Ke hoach lay mau
CREATE TYPE sampling_plan_enum AS ENUM (
    'c0', 'aql', 'skip_lot', '100pct', 'reduced', 'tightened'
);

-- Sampling standard / Tieu chuan lay mau
CREATE TYPE sampling_standard_enum AS ENUM ('ansi_z14', 'mil_std_1916', 'iso2859', 'custom');

-- SPC chart type / Loai bieu do SPC
CREATE TYPE spc_chart_type_enum AS ENUM ('xbar_r', 'xbar_s', 'imr', 'p', 'np', 'c', 'u');

-- Certificate type / Loai chung chi
CREATE TYPE cert_type_enum AS ENUM (
    'coc', 'cof', 'material_cert', 'test_report', 'dimensional', 'first_article', 'ppap'
);

-- NPI phase / Giai doan NPI
CREATE TYPE npi_phase_enum AS ENUM (
    'concept', 'feasibility', 'design', 'prototype', 'pilot', 'validation', 'launch'
);

-- NPI gate / Cong NPI
CREATE TYPE npi_gate_enum AS ENUM ('gate0', 'gate1', 'gate2', 'gate3', 'gate4', 'gate5');

-- Gate status / Trang thai cong
CREATE TYPE gate_status_enum AS ENUM ('go', 'no_go', 'conditional');

-- Subcontract type / Loai gia cong ngoai
CREATE TYPE subcontract_type_enum AS ENUM ('outside_process', 'full_manufacture', 'rework', 'test');

-- Subcontract process / Quy trinh gia cong ngoai
CREATE TYPE subcontract_process_enum AS ENUM (
    'heat_treat', 'plating', 'anodize', 'passivation', 'painting', 'ndt',
    'welding', 'grinding', 'edm', 'laser', 'waterjet', 'assembly'
);

-- Export classification / Phan loai xuat khau
CREATE TYPE export_class_enum AS ENUM ('ear99', 'eccn', 'itar', 'dual_use');

-- License type / Loai giay phep
CREATE TYPE license_type_enum AS ENUM ('no_license', 'individual', 'distribution', 'agreement');

-- Jurisdiction / Pham vi phap ly
CREATE TYPE jurisdiction_enum AS ENUM ('us_federal', 'us_state', 'eu', 'uk', 'china', 'global');

-- Compliance status / Trang thai tuan thu
CREATE TYPE compliance_status_enum AS ENUM ('compliant', 'non_compliant', 'exempt', 'pending_review');

-- Characteristic type / Loai dac tinh
CREATE TYPE char_type_enum AS ENUM ('dimension', 'surface', 'hardness', 'visual', 'functional', 'material');

-- Document confidentiality / Muc do bao mat tai lieu
CREATE TYPE confidentiality_enum AS ENUM ('public', 'internal', 'confidential', 'restricted', 'itar');

-- EHS incident type / Loai su co EHS
CREATE TYPE incident_type_enum AS ENUM (
    'Injury', 'Near Miss', 'Property Damage', 'Environmental', 'First Aid', 'Recordable'
);

-- Cleanliness level / Muc do sach
CREATE TYPE cleanliness_level_enum AS ENUM ('Visually Clean', 'Precision Clean', 'Ultra Clean');

-- Contamination type / Loai nhiem ban
CREATE TYPE contamination_type_enum AS ENUM (
    'Chip/Burr', 'Coolant Residue', 'Oil Film', 'Dust/Particle', 'Corrosion', 'Foreign Material'
);

-- Cleaning method / Phuong phap lam sach
CREATE TYPE cleaning_method_enum AS ENUM (
    'Ultrasonic', 'Manual Wash', 'Vapor Degrease', 'Pressure Wash', 'Blow-Off'
);

-- Portal language / Ngon ngu cong
CREATE TYPE portal_lang AS ENUM ('vi', 'en');

-- Form delivery mode / Che do phan phoi bieu mau
CREATE TYPE delivery_mode_enum AS ENUM ('download', 'browser_open', 'online_form');

-- Form pack / Goi bieu mau
CREATE TYPE form_pack_enum AS ENUM ('A', 'B', 'C');

-- Machine type (equipment) / Loai may (thiet bi)
CREATE TYPE machine_type_enum AS ENUM (
    '5-Axis Mill', '3-Axis Mill', 'CNC Lathe', 'Mill-Turn', 'EDM', 'Grinder', 'CMM'
);

-- Equipment state (MES) / Trang thai thiet bi (MES)
CREATE TYPE equipment_state_enum AS ENUM (
    'productive', 'standby', 'engineering', 'scheduled_down', 'unscheduled_down', 'non_scheduled'
);


-- ============================================================================
-- SECTION 2: CORE SYSTEM TABLES
-- Phan 2: Cac bang he thong loi
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 departments / Phong ban
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
    dept_code       dept_code       PRIMARY KEY,
    label           VARCHAR(100)    NOT NULL,
    label_vi        VARCHAR(100)    NOT NULL,
    icon            VARCHAR(10),
    color           VARCHAR(7),
    record_types    TEXT[],                         -- array of allowed record type codes
    form_series     INT[],                          -- array of form series numbers
    metadata        JSONB           DEFAULT '{}',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE departments IS 'Master department list (10 departments). / Danh sach phong ban (10 phong ban).';

-- ---------------------------------------------------------------------------
-- 2.2 roles / Vai tro
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
    role_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_code       VARCHAR(50)     NOT NULL UNIQUE,
    role_label      VARCHAR(150)    NOT NULL,
    role_label_vi   VARCHAR(150),
    dept_code       dept_code       REFERENCES departments(dept_code),
    permissions     JSONB           NOT NULL DEFAULT '{}',
    description     TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE roles IS 'Role definitions with JSONB permissions. / Dinh nghia vai tro voi quyen JSONB.';
CREATE INDEX idx_roles_code ON roles (role_code);
CREATE INDEX idx_roles_dept ON roles (dept_code);

-- ---------------------------------------------------------------------------
-- 2.3 users / Nguoi dung
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    user_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(20)     NOT NULL UNIQUE,
    username        VARCHAR(50)     NOT NULL UNIQUE,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    full_name       VARCHAR(150)    NOT NULL,
    full_name_vi    VARCHAR(150),
    password_hash   TEXT            NOT NULL,
    mfa_secret      TEXT,
    mfa_enabled     BOOLEAN         NOT NULL DEFAULT FALSE,
    dept_code       dept_code       REFERENCES departments(dept_code),
    primary_role_id UUID            REFERENCES roles(role_id),
    supervisor_id   UUID            REFERENCES users(user_id),
    shift           shift_code,
    portal_language portal_lang     NOT NULL DEFAULT 'vi',
    status          VARCHAR(20)     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'locked', 'pending')),
    last_login_at   TIMESTAMPTZ,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'User accounts with MFA support. / Tai khoan nguoi dung voi ho tro MFA.';
CREATE INDEX idx_users_dept ON users (dept_code);
CREATE INDEX idx_users_employee ON users (employee_id);
CREATE INDEX idx_users_status ON users (status);

-- ---------------------------------------------------------------------------
-- 2.4 user_roles / Phan quyen nguoi dung
-- ---------------------------------------------------------------------------
CREATE TABLE user_roles (
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id         UUID            NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    assigned_by     UUID            REFERENCES users(user_id),
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE user_roles IS 'Many-to-many user-role mapping (bitemporal). / Anh xa nguoi dung-vai tro nhieu-nhieu.';

-- ---------------------------------------------------------------------------
-- 2.5 sessions / Phien lam viec
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
    session_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash      TEXT            NOT NULL UNIQUE,
    csrf_token      TEXT            NOT NULL,
    mfa_verified    BOOLEAN         NOT NULL DEFAULT FALSE,
    ip_address      INET,
    user_agent      TEXT,
    started_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_active_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ     NOT NULL,
    idle_timeout_s  INT             NOT NULL DEFAULT 1800
);
COMMENT ON TABLE sessions IS 'Session management with TOTP 2FA. / Quan ly phien voi TOTP 2FA.';
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 2.6 audit_events / Su kien kiem tra (APPEND-ONLY, PARTITIONED)
--     THE most critical table for ISO 9001 audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE audit_events (
    event_id        UUID            NOT NULL DEFAULT uuid_generate_v4(),
    event_type      VARCHAR(100)    NOT NULL,
    aggregate_type  VARCHAR(100)    NOT NULL,
    aggregate_id    TEXT            NOT NULL,
    actor_id        UUID            REFERENCES users(user_id),
    actor_name      VARCHAR(150),
    payload         JSONB           NOT NULL DEFAULT '{}',
    metadata        JSONB           DEFAULT '{}',
    ip_address      INET,
    session_id      UUID,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, recorded_at)
) PARTITION BY RANGE (recorded_at);
COMMENT ON TABLE audit_events IS 'Append-only event sourcing table. Partitioned by month. / Bang ghi su kien chi ghi them. Phan vung theo thang.';

-- Create partitions for 2026 and 2027
CREATE TABLE audit_events_2026_q1 PARTITION OF audit_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE audit_events_2026_q2 PARTITION OF audit_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE audit_events_2026_q3 PARTITION OF audit_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE audit_events_2026_q4 PARTITION OF audit_events
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE audit_events_2027_q1 PARTITION OF audit_events
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE audit_events_default PARTITION OF audit_events DEFAULT;

CREATE INDEX idx_audit_events_type ON audit_events (event_type, recorded_at);
CREATE INDEX idx_audit_events_aggregate ON audit_events (aggregate_type, aggregate_id, recorded_at);
CREATE INDEX idx_audit_events_actor ON audit_events (actor_id, recorded_at);
CREATE INDEX idx_audit_events_payload ON audit_events USING GIN (payload);


-- ============================================================================
-- SECTION 3: DOCUMENT MANAGEMENT
-- Phan 3: Quan ly tai lieu
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 documents / Tai lieu
-- ---------------------------------------------------------------------------
CREATE TABLE documents (
    doc_id          VARCHAR(30)     PRIMARY KEY,  -- e.g., SOP-606
    doc_type        doc_type_enum   NOT NULL,
    doc_category    doc_category_enum NOT NULL,
    title           VARCHAR(500)    NOT NULL,
    title_vi        VARCHAR(500),
    dept_code       dept_code       NOT NULL REFERENCES departments(dept_code),
    owner_role      VARCHAR(150),
    iso_clause      TEXT,
    as9100_clause   TEXT,
    current_rev     VARCHAR(20)     NOT NULL DEFAULT 'V1.0',
    status          doc_status      NOT NULL DEFAULT 'draft',
    control_status  control_status_enum NOT NULL DEFAULT 'DRAFT',
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE documents IS 'Master document register. / So dang ky tai lieu chinh.';
CREATE INDEX idx_documents_type ON documents (doc_type);
CREATE INDEX idx_documents_dept ON documents (dept_code);
CREATE INDEX idx_documents_status ON documents (status);
CREATE INDEX idx_documents_meta ON documents USING GIN (metadata);

-- ---------------------------------------------------------------------------
-- 3.2 document_versions / Phien ban tai lieu (BITEMPORAL)
-- ---------------------------------------------------------------------------
CREATE TABLE document_versions (
    version_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id          VARCHAR(30)     NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
    rev             VARCHAR(20)     NOT NULL,
    effective_date  DATE            NOT NULL,
    author          VARCHAR(150)    NOT NULL,
    reviewer        VARCHAR(150),
    approver        VARCHAR(150),
    content_hash    VARCHAR(128),          -- SHA-512
    file_path       TEXT,
    sharepoint_url  TEXT,
    changelog       TEXT,
    -- Bitemporal columns
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,           -- NULL = currently valid
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (doc_id, rev)
);
COMMENT ON TABLE document_versions IS 'Bitemporal document version tracking. / Theo doi phien ban tai lieu hai chieu thoi gian.';
CREATE INDEX idx_docver_doc ON document_versions (doc_id);
CREATE INDEX idx_docver_valid ON document_versions (valid_from, valid_to);

-- ---------------------------------------------------------------------------
-- 3.3 document_embeddings / Nhung tai lieu (pgvector)
-- ---------------------------------------------------------------------------
CREATE TABLE document_embeddings (
    embedding_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id      UUID            NOT NULL REFERENCES document_versions(version_id) ON DELETE CASCADE,
    chunk_index     INT             NOT NULL,
    chunk_text      TEXT            NOT NULL,
    embedding       vector(1536)    NOT NULL,  -- OpenAI ada-002 compatible
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE document_embeddings IS 'Document embeddings for semantic search. / Nhung tai lieu cho tim kiem ngu nghia.';
CREATE INDEX idx_docemb_version ON document_embeddings (version_id);
CREATE INDEX idx_docemb_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- 3.4 document_distribution / Phan phoi tai lieu
-- ---------------------------------------------------------------------------
CREATE TABLE document_distribution (
    distribution_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id      UUID            NOT NULL REFERENCES document_versions(version_id),
    user_id         UUID            NOT NULL REFERENCES users(user_id),
    distributed_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    method          VARCHAR(50)     DEFAULT 'portal'
);
COMMENT ON TABLE document_distribution IS 'Tracks who received which document version. / Theo doi ai da nhan phien ban tai lieu nao.';
CREATE INDEX idx_docdist_version ON document_distribution (version_id);
CREATE INDEX idx_docdist_user ON document_distribution (user_id);


-- ============================================================================
-- SECTION 4: FORM SYSTEM
-- Phan 4: He thong bieu mau
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 form_schemas / Dinh nghia bieu mau
-- ---------------------------------------------------------------------------
CREATE TABLE form_schemas (
    form_code       VARCHAR(20)     NOT NULL,  -- e.g., FRM-631
    version         INT             NOT NULL DEFAULT 1,
    title           VARCHAR(300)    NOT NULL,
    title_vi        VARCHAR(300),
    dept_code       dept_code       REFERENCES departments(dept_code),
    json_schema     JSONB           NOT NULL,      -- JSON Schema definition
    ui_schema       JSONB           DEFAULT '{}',  -- UI rendering hints
    delivery_mode   delivery_mode_enum NOT NULL DEFAULT 'online_form',
    form_pack       form_pack_enum,
    status          doc_status      NOT NULL DEFAULT 'draft',
    sha256          VARCHAR(64),
    decision_score  NUMERIC(5,2),
    metadata        JSONB           DEFAULT '{}',
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (form_code, version)
);
COMMENT ON TABLE form_schemas IS 'Form schema definitions with JSON Schema. / Dinh nghia schema bieu mau voi JSON Schema.';
CREATE INDEX idx_formschema_dept ON form_schemas (dept_code);

-- ---------------------------------------------------------------------------
-- 4.2 form_entries / Du lieu bieu mau
-- ---------------------------------------------------------------------------
CREATE TABLE form_entries (
    entry_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_code       VARCHAR(20)     NOT NULL,
    form_version    INT             NOT NULL DEFAULT 1,
    data            JSONB           NOT NULL DEFAULT '{}',
    submitted_by    UUID            REFERENCES users(user_id),
    workflow_state  workflow_status  NOT NULL DEFAULT 'draft',
    approved_by     UUID            REFERENCES users(user_id),
    approved_date   TIMESTAMPTZ,
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    FOREIGN KEY (form_code, form_version) REFERENCES form_schemas(form_code, version)
);
COMMENT ON TABLE form_entries IS 'Form data submissions with workflow state. / Du lieu gui bieu mau voi trang thai quy trinh.';
CREATE INDEX idx_formentries_form ON form_entries (form_code);
CREATE INDEX idx_formentries_wf ON form_entries (workflow_state);
CREATE INDEX idx_formentries_data ON form_entries USING GIN (data);

-- ---------------------------------------------------------------------------
-- 4.3 form_attachments / Tep dinh kem bieu mau
-- ---------------------------------------------------------------------------
CREATE TABLE form_attachments (
    attachment_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id        UUID            NOT NULL REFERENCES form_entries(entry_id) ON DELETE CASCADE,
    file_name       VARCHAR(500)    NOT NULL,
    file_path       TEXT            NOT NULL,
    file_hash       VARCHAR(128)    NOT NULL,  -- SHA-512
    file_size       BIGINT          NOT NULL,
    mime_type       VARCHAR(255),
    uploaded_by     UUID            REFERENCES users(user_id),
    uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE form_attachments IS 'File attachments for form entries. / Tep dinh kem cho du lieu bieu mau.';
CREATE INDEX idx_formatt_entry ON form_attachments (entry_id);


-- ============================================================================
-- SECTION 5: RECORD MANAGEMENT (NCR, CAPA, FAI, etc.)
-- Phan 5: Quan ly ho so (NCR, CAPA, FAI, v.v.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 record_counters / Bo dem ho so
-- ---------------------------------------------------------------------------
CREATE TABLE record_counters (
    record_type     record_type_enum NOT NULL,
    fiscal_year     INT              NOT NULL,
    last_number     INT              NOT NULL DEFAULT 0,
    counter_digits  SMALLINT         NOT NULL DEFAULT 3,
    PRIMARY KEY (record_type, fiscal_year)
);
COMMENT ON TABLE record_counters IS 'Auto-increment counters for record ID generation. / Bo dem tu dong cho tao ma ho so.';

-- ---------------------------------------------------------------------------
-- 5.2 records / Ho so (generic record registry)
-- ---------------------------------------------------------------------------
CREATE TABLE records (
    record_id       VARCHAR(50)     PRIMARY KEY,  -- e.g., NCR-2026-001
    record_type     record_type_enum NOT NULL,
    dept_code       dept_code       NOT NULL REFERENCES departments(dept_code),
    status          record_status   NOT NULL DEFAULT 'open',
    title           VARCHAR(500),
    data            JSONB           NOT NULL DEFAULT '{}',
    created_by      UUID            REFERENCES users(user_id),
    assigned_to     UUID            REFERENCES users(user_id),
    due_date        DATE,
    closed_date     DATE,
    form_code       VARCHAR(20),
    source_record   VARCHAR(50),          -- parent record reference
    capa_link       VARCHAR(50),          -- linked CAPA record
    sharepoint_path TEXT,
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE records IS 'Universal record registry for all record types. / So dang ky ho so tong hop cho tat ca loai.';
CREATE INDEX idx_records_type ON records (record_type);
CREATE INDEX idx_records_dept ON records (dept_code);
CREATE INDEX idx_records_status ON records (status);
CREATE INDEX idx_records_due ON records (due_date) WHERE status NOT IN ('closed', 'cancelled');
CREATE INDEX idx_records_data ON records USING GIN (data);
CREATE INDEX idx_records_source ON records (source_record) WHERE source_record IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5.3 record_links / Lien ket ho so
-- ---------------------------------------------------------------------------
CREATE TABLE record_links (
    link_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_record_id VARCHAR(50)    NOT NULL REFERENCES records(record_id),
    child_record_id  VARCHAR(50)    NOT NULL REFERENCES records(record_id),
    link_type       VARCHAR(50)     NOT NULL DEFAULT 'related',
    description     TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CHECK (parent_record_id <> child_record_id),
    UNIQUE (parent_record_id, child_record_id, link_type)
);
COMMENT ON TABLE record_links IS 'Links between records (NCR->CAPA, AUD->NCR, etc.). / Lien ket giua cac ho so.';
CREATE INDEX idx_reclinks_parent ON record_links (parent_record_id);
CREATE INDEX idx_reclinks_child ON record_links (child_record_id);


-- ============================================================================
-- SECTION 6: ERP MASTER DATA
-- Phan 6: Du lieu chinh ERP
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6.1 items / Vat tu (59 variables from erp_master_data)
-- ---------------------------------------------------------------------------
CREATE TABLE items (
    item_id                 VARCHAR(50)     PRIMARY KEY,
    description             VARCHAR(500)    NOT NULL,
    description_vi          VARCHAR(500),
    item_group              VARCHAR(50),
    item_class              VARCHAR(50),
    item_type               erp_item_type,
    uom                     VARCHAR(20)     NOT NULL DEFAULT 'EA',
    alt_uom                 VARCHAR(20),
    uom_conversion_factor   NUMERIC(12,6)   DEFAULT 1.0,
    weight_net              NUMERIC(12,4),
    weight_gross            NUMERIC(12,4),
    weight_uom              VARCHAR(10),
    volume                  NUMERIC(12,4),
    dimension_length        NUMERIC(12,4),
    dimension_width         NUMERIC(12,4),
    dimension_height        NUMERIC(12,4),
    dimension_uom           VARCHAR(10),
    material_type           VARCHAR(100),
    material_grade          VARCHAR(100),
    material_spec           VARCHAR(200),
    material_condition      VARCHAR(100),
    shelf_life_days         INT,
    item_status             erp_item_status NOT NULL DEFAULT 'active',
    abc_class               abc_class_enum,
    commodity_code          VARCHAR(50),
    hs_tariff_code          VARCHAR(20),
    eccn_code               VARCHAR(20),
    itar_controlled         BOOLEAN         NOT NULL DEFAULT FALSE,
    country_of_origin       VARCHAR(5),
    make_buy_code           VARCHAR(10),
    planner_code            VARCHAR(20),
    buyer_code              VARCHAR(20),
    drawing_number          VARCHAR(100),
    drawing_revision        VARCHAR(20),
    model_number            VARCHAR(100),
    customer_part_number    VARCHAR(100),
    manufacturer_part_number VARCHAR(100),
    substitute_item_id      VARCHAR(50),
    preferred_vendor_id     VARCHAR(50),
    lead_time_days          INT,
    safety_stock_qty        NUMERIC(12,2),
    reorder_point           NUMERIC(12,2),
    reorder_qty             NUMERIC(12,2),
    min_order_qty           NUMERIC(12,2),
    max_order_qty           NUMERIC(12,2),
    order_multiple          NUMERIC(12,2),
    lot_tracked             BOOLEAN         NOT NULL DEFAULT FALSE,
    serial_tracked          BOOLEAN         NOT NULL DEFAULT FALSE,
    revision_tracked        BOOLEAN         NOT NULL DEFAULT TRUE,
    inspection_required     BOOLEAN         NOT NULL DEFAULT FALSE,
    certificate_required    BOOLEAN         NOT NULL DEFAULT FALSE,
    first_article_required  BOOLEAN         NOT NULL DEFAULT FALSE,
    special_process_required BOOLEAN        NOT NULL DEFAULT FALSE,
    rohs_compliant          BOOLEAN         DEFAULT TRUE,
    reach_compliant         BOOLEAN         DEFAULT TRUE,
    conflict_mineral_free   BOOLEAN         DEFAULT TRUE,
    shelf_life_controlled   BOOLEAN         NOT NULL DEFAULT FALSE,
    moisture_sensitive_level VARCHAR(10),
    esd_sensitive           BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE items IS 'ERP Item/Part Master. Maps all 59 erp_master_data variables. / Du lieu chinh vat tu ERP. Anh xa 59 bien erp_master_data.';
CREATE INDEX idx_items_status ON items (item_status);
CREATE INDEX idx_items_drawing ON items (drawing_number, drawing_revision);
CREATE INDEX idx_items_customer_pn ON items (customer_part_number) WHERE customer_part_number IS NOT NULL;
CREATE INDEX idx_items_meta ON items USING GIN (metadata);

-- ---------------------------------------------------------------------------
-- 6.2 item_revisions / Phien ban vat tu (bitemporal)
-- ---------------------------------------------------------------------------
CREATE TABLE item_revisions (
    item_rev_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    rev             VARCHAR(20)     NOT NULL,
    change_type     VARCHAR(100),
    description     TEXT,
    eco_number      VARCHAR(50),
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (item_id, rev)
);
COMMENT ON TABLE item_revisions IS 'Bitemporal item revision history. / Lich su phien ban vat tu hai chieu thoi gian.';

-- ---------------------------------------------------------------------------
-- 6.3 bill_of_materials / Don vi vat tu (24 variables from erp_bom)
-- ---------------------------------------------------------------------------
CREATE TABLE bill_of_materials (
    bom_id          VARCHAR(50)     NOT NULL,
    bom_revision    VARCHAR(20)     NOT NULL DEFAULT '1',
    bom_type        bom_type_enum   NOT NULL DEFAULT 'manufacturing',
    bom_status      VARCHAR(30)     DEFAULT 'active',
    parent_item_id  VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    eco_number      VARCHAR(50),
    alternate_bom_id VARCHAR(50),
    bom_notes       TEXT,
    metadata        JSONB           DEFAULT '{}',
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (bom_id, bom_revision)
);
COMMENT ON TABLE bill_of_materials IS 'BOM header. Maps erp_bom variables. / Dinh nghia BOM. Anh xa bien erp_bom.';

-- ---------------------------------------------------------------------------
-- 6.4 bom_components / Thanh phan BOM
-- ---------------------------------------------------------------------------
CREATE TABLE bom_components (
    component_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id              VARCHAR(50)     NOT NULL,
    bom_revision        VARCHAR(20)     NOT NULL,
    component_item_id   VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    component_qty_per   NUMERIC(12,6)   NOT NULL DEFAULT 1,
    component_uom       VARCHAR(20),
    scrap_factor_pct    NUMERIC(5,2)    DEFAULT 0,
    yield_factor_pct    NUMERIC(5,2)    DEFAULT 100,
    operation_seq       INT,
    effective_date_from DATE,
    effective_date_to   DATE,
    phantom_flag        BOOLEAN         NOT NULL DEFAULT FALSE,
    reference_designator VARCHAR(100),
    find_number         VARCHAR(50),
    substitute_component_id VARCHAR(50),
    bom_level           INT,
    low_level_code      INT,
    extended_qty        NUMERIC(12,6),
    component_type      bom_component_type DEFAULT 'material',
    metadata            JSONB           DEFAULT '{}',
    FOREIGN KEY (bom_id, bom_revision) REFERENCES bill_of_materials(bom_id, bom_revision)
);
COMMENT ON TABLE bom_components IS 'BOM component lines. / Cac dong thanh phan BOM.';
CREATE INDEX idx_bomcomp_bom ON bom_components (bom_id, bom_revision);
CREATE INDEX idx_bomcomp_item ON bom_components (component_item_id);

-- ---------------------------------------------------------------------------
-- 6.5 work_centers / Trung tam lam viec (22 vars from erp_work_center)
-- ---------------------------------------------------------------------------
CREATE TABLE work_centers (
    work_center_id          VARCHAR(30)     PRIMARY KEY,
    work_center_name        VARCHAR(150)    NOT NULL,
    work_center_name_vi     VARCHAR(150),
    work_center_type        wc_type_enum    NOT NULL DEFAULT 'machine',
    department_id           dept_code       REFERENCES departments(dept_code),
    cost_center             VARCHAR(50),
    capacity_hours_per_day  NUMERIC(6,2)    DEFAULT 24,
    capacity_units_per_day  NUMERIC(10,2),
    efficiency_factor       NUMERIC(5,4)    DEFAULT 1.0,
    utilization_factor      NUMERIC(5,4)    DEFAULT 0.85,
    num_machines            INT             DEFAULT 1,
    num_operators           INT             DEFAULT 1,
    alternate_work_center   VARCHAR(30),
    scheduling_rule         scheduling_rule_enum DEFAULT 'finite',
    queue_time_default      NUMERIC(8,2)    DEFAULT 0,
    move_time_default       NUMERIC(8,2)    DEFAULT 0,
    shift_pattern_id        VARCHAR(30),
    hourly_rate_labor       NUMERIC(10,2),
    hourly_rate_overhead    NUMERIC(10,2),
    hourly_rate_machine     NUMERIC(10,2),
    backflush_labor         BOOLEAN         NOT NULL DEFAULT FALSE,
    backflush_material      BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                JSONB           DEFAULT '{}',
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_centers IS 'ERP work center definitions. Maps 22 erp_work_center variables. / Dinh nghia trung tam lam viec ERP.';

-- ---------------------------------------------------------------------------
-- 6.6 routings / Dinh tuyen san xuat (39 vars from erp_routing)
-- ---------------------------------------------------------------------------
CREATE TABLE routings (
    routing_id      VARCHAR(50)     NOT NULL,
    routing_revision VARCHAR(20)    NOT NULL DEFAULT '1',
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    status          VARCHAR(30)     DEFAULT 'active',
    metadata        JSONB           DEFAULT '{}',
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (routing_id, routing_revision)
);
COMMENT ON TABLE routings IS 'Routing header. / Dinh tuyen san xuat.';

-- ---------------------------------------------------------------------------
-- 6.7 routing_operations / Cong doan dinh tuyen
-- ---------------------------------------------------------------------------
CREATE TABLE routing_operations (
    operation_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    routing_id              VARCHAR(50)     NOT NULL,
    routing_revision        VARCHAR(20)     NOT NULL,
    operation_seq           INT             NOT NULL,
    operation_code          VARCHAR(30),
    operation_description   VARCHAR(300)    NOT NULL,
    operation_description_vi VARCHAR(300),
    work_center_id          VARCHAR(30)     REFERENCES work_centers(work_center_id),
    work_center_name        VARCHAR(150),
    resource_group_id       VARCHAR(30),
    resource_id             VARCHAR(30),
    setup_time_std          NUMERIC(8,2)    DEFAULT 0,
    run_time_std            NUMERIC(8,2)    DEFAULT 0,
    run_time_per_unit       NUMERIC(10,4)   DEFAULT 0,
    labor_rate_std          NUMERIC(10,2),
    overhead_rate           NUMERIC(10,2),
    machine_rate            NUMERIC(10,2),
    move_time_hours         NUMERIC(8,2)    DEFAULT 0,
    queue_time_hours        NUMERIC(8,2)    DEFAULT 0,
    wait_time_hours         NUMERIC(8,2)    DEFAULT 0,
    overlap_pct             NUMERIC(5,2)    DEFAULT 0,
    overlap_qty             NUMERIC(10,2),
    crew_size               INT             DEFAULT 1,
    simultaneous_resources  INT             DEFAULT 1,
    subcontract_flag        BOOLEAN         NOT NULL DEFAULT FALSE,
    subcontract_vendor_id   VARCHAR(50),
    subcontract_cost        NUMERIC(12,2),
    outside_process_code    VARCHAR(50),
    tool_list               TEXT,
    fixture_list            TEXT,
    gage_list               TEXT,
    inspection_operation    BOOLEAN         NOT NULL DEFAULT FALSE,
    spc_required            BOOLEAN         NOT NULL DEFAULT FALSE,
    first_piece_required    BOOLEAN         NOT NULL DEFAULT TRUE,
    last_piece_required     BOOLEAN         NOT NULL DEFAULT FALSE,
    capability_study_required BOOLEAN       NOT NULL DEFAULT FALSE,
    special_instruction     TEXT,
    nc_program_id           VARCHAR(100),
    setup_instruction_id    VARCHAR(100),
    operator_skill_required VARCHAR(100),
    metadata                JSONB           DEFAULT '{}',
    FOREIGN KEY (routing_id, routing_revision) REFERENCES routings(routing_id, routing_revision),
    UNIQUE (routing_id, routing_revision, operation_seq)
);
COMMENT ON TABLE routing_operations IS 'Routing operation details. Maps 39 erp_routing variables. / Chi tiet cong doan dinh tuyen.';
CREATE INDEX idx_rtgops_routing ON routing_operations (routing_id, routing_revision);
CREATE INDEX idx_rtgops_wc ON routing_operations (work_center_id);


-- ============================================================================
-- SECTION 7: CUSTOMER & SALES
-- Phan 7: Khach hang & Ban hang
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 7.1 customers / Khach hang (33 vars from erp_customer_master)
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    customer_id         VARCHAR(50)     PRIMARY KEY,
    customer_name       VARCHAR(200)    NOT NULL,
    customer_name_vi    VARCHAR(200),
    customer_type       customer_type_enum,
    customer_status     VARCHAR(30)     NOT NULL DEFAULT 'active',
    customer_since_date DATE,
    primary_contact     VARCHAR(150),
    contact_email       VARCHAR(255),
    contact_phone       VARCHAR(50),
    billing_address_id  VARCHAR(50),
    shipping_address_id VARCHAR(50),
    credit_limit        NUMERIC(14,2),
    credit_terms        VARCHAR(100),
    payment_terms       VARCHAR(50),
    currency_default    VARCHAR(3)      DEFAULT 'USD',
    tax_exempt          BOOLEAN         NOT NULL DEFAULT FALSE,
    tax_exempt_cert     VARCHAR(100),
    industry_code       industry_code_enum,
    quality_requirements TEXT,
    customer_spec_list  TEXT,
    approved_process_list TEXT,
    packing_requirements TEXT,
    labeling_requirements TEXT,
    shipping_instructions TEXT,
    required_certifications TEXT,
    source_inspection_flag BOOLEAN      NOT NULL DEFAULT FALSE,
    fai_required_flag   BOOLEAN         NOT NULL DEFAULT FALSE,
    customer_portal_url TEXT,
    edi_capable         BOOLEAN         NOT NULL DEFAULT FALSE,
    customer_rating     VARCHAR(20),
    territory_code      VARCHAR(20),
    sales_rep_id        VARCHAR(50),
    account_manager     VARCHAR(150),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE customers IS 'ERP Customer Master. Maps 33 erp_customer_master variables. / Du lieu chinh khach hang ERP.';
CREATE INDEX idx_customers_type ON customers (customer_type);
CREATE INDEX idx_customers_industry ON customers (industry_code);

-- ---------------------------------------------------------------------------
-- 7.2 sales_orders / Don hang ban (40 vars from erp_sales_order)
-- ---------------------------------------------------------------------------
CREATE TABLE sales_orders (
    sales_order_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_number  VARCHAR(50)     NOT NULL UNIQUE,
    so_status           so_status_enum  NOT NULL DEFAULT 'open',
    customer_id         VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    customer_po_number  VARCHAR(100),
    customer_po_line    VARCHAR(50),
    ship_to_address_id  VARCHAR(50),
    bill_to_address_id  VARCHAR(50),
    order_date          DATE            NOT NULL,
    requested_date      DATE,
    promise_date        DATE,
    scheduled_ship_date DATE,
    actual_ship_date    DATE,
    currency_code       VARCHAR(3)      DEFAULT 'USD',
    exchange_rate       NUMERIC(10,6)   DEFAULT 1.0,
    freight_terms       VARCHAR(50),
    shipping_method     VARCHAR(100),
    priority_code       so_priority_enum DEFAULT 'standard',
    credit_status       VARCHAR(30),
    sales_rep_id        VARCHAR(50),
    territory_code      VARCHAR(20),
    project_id          VARCHAR(50),
    contract_id         VARCHAR(50),
    blanket_order_ref   VARCHAR(50),
    release_number      VARCHAR(20),
    customer_revision   VARCHAR(50),
    customer_spec_requirements TEXT,
    export_license_required BOOLEAN     NOT NULL DEFAULT FALSE,
    end_use_certificate BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE sales_orders IS 'ERP Sales Orders. Maps erp_sales_order variables. / Don hang ban ERP.';
CREATE INDEX idx_so_customer ON sales_orders (customer_id);
CREATE INDEX idx_so_status ON sales_orders (so_status);
CREATE INDEX idx_so_cupo ON sales_orders (customer_po_number);

-- ---------------------------------------------------------------------------
-- 7.3 sales_order_lines / Dong don hang ban
-- ---------------------------------------------------------------------------
CREATE TABLE sales_order_lines (
    so_line_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id  UUID            NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    line_number     INT             NOT NULL,
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty       NUMERIC(12,2)   NOT NULL,
    shipped_qty     NUMERIC(12,2)   DEFAULT 0,
    remaining_qty   NUMERIC(12,2),
    unit_price      NUMERIC(14,4)   NOT NULL,
    extended_price  NUMERIC(14,2),
    discount_pct    NUMERIC(5,2)    DEFAULT 0,
    tax_code        VARCHAR(20),
    tax_amount      NUMERIC(12,2)   DEFAULT 0,
    commission_pct  NUMERIC(5,2)    DEFAULT 0,
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (sales_order_id, line_number)
);
COMMENT ON TABLE sales_order_lines IS 'Sales order line items. / Dong chi tiet don hang ban.';
CREATE INDEX idx_solines_item ON sales_order_lines (item_id);


-- ============================================================================
-- SECTION 8: VENDOR & PURCHASING
-- Phan 8: Nha cung cap & Mua hang
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8.1 vendors / Nha cung cap (37 vars from erp_vendor_master)
-- ---------------------------------------------------------------------------
CREATE TABLE vendors (
    vendor_id               VARCHAR(50)     PRIMARY KEY,
    vendor_name             VARCHAR(200)    NOT NULL,
    vendor_name_vi          VARCHAR(200),
    vendor_type             vendor_type_enum,
    vendor_status           vendor_status_enum NOT NULL DEFAULT 'pending',
    vendor_rating_score     NUMERIC(5,2),
    vendor_rating_grade     vendor_rating_grade,
    primary_contact         VARCHAR(150),
    contact_email           VARCHAR(255),
    contact_phone           VARCHAR(50),
    address_line1           VARCHAR(300),
    address_line2           VARCHAR(300),
    city                    VARCHAR(100),
    state_province          VARCHAR(100),
    postal_code             VARCHAR(20),
    country                 VARCHAR(5),
    payment_terms_default   VARCHAR(50),
    currency_default        VARCHAR(3)      DEFAULT 'USD',
    tax_id                  VARCHAR(50),
    duns_number             VARCHAR(20),
    cage_code               VARCHAR(10),
    approved_process_list   TEXT,
    certification_list      TEXT,
    certification_expiry    DATE,
    last_audit_date         DATE,
    next_audit_due          DATE,
    approved_part_list      TEXT,
    lead_time_avg_days      INT,
    on_time_delivery_pct    NUMERIC(5,2),
    quality_rejection_pct   NUMERIC(5,2),
    corrective_action_count INT             DEFAULT 0,
    scar_open_count         INT             DEFAULT 0,
    risk_level              risk_level_enum DEFAULT 'Low',
    single_source_flag      BOOLEAN         NOT NULL DEFAULT FALSE,
    minority_owned          BOOLEAN         NOT NULL DEFAULT FALSE,
    small_business          BOOLEAN         NOT NULL DEFAULT FALSE,
    country_of_manufacture  VARCHAR(5),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE vendors IS 'ERP Vendor Master. Maps 37 erp_vendor_master variables. / Du lieu chinh nha cung cap ERP.';
CREATE INDEX idx_vendors_status ON vendors (vendor_status);
CREATE INDEX idx_vendors_type ON vendors (vendor_type);
CREATE INDEX idx_vendors_rating ON vendors (vendor_rating_grade);

-- ---------------------------------------------------------------------------
-- 8.2 vendor_ratings / Lich su danh gia nha cung cap
-- ---------------------------------------------------------------------------
CREATE TABLE vendor_ratings (
    rating_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id       VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    period_start    DATE            NOT NULL,
    period_end      DATE            NOT NULL,
    rating_score    NUMERIC(5,2)    NOT NULL,
    rating_grade    vendor_rating_grade,
    otd_pct         NUMERIC(5,2),
    quality_pct     NUMERIC(5,2),
    scar_count      INT             DEFAULT 0,
    notes           TEXT,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE vendor_ratings IS 'Historical vendor rating snapshots. / Lich su danh gia nha cung cap.';
CREATE INDEX idx_vendorratings_vendor ON vendor_ratings (vendor_id);

-- ---------------------------------------------------------------------------
-- 8.3 purchase_orders / Don dat hang mua (39 vars from erp_purchase_order)
-- ---------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    po_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number           VARCHAR(50)     NOT NULL UNIQUE,
    po_status           po_status_enum  NOT NULL DEFAULT 'draft',
    vendor_id           VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    vendor_contact      VARCHAR(150),
    po_type             po_type_enum    NOT NULL DEFAULT 'standard',
    po_date             DATE            NOT NULL,
    need_by_date        DATE,
    promise_date        DATE,
    currency_code       VARCHAR(3)      DEFAULT 'USD',
    payment_terms       VARCHAR(50),
    incoterms           VARCHAR(20),
    fob_point           VARCHAR(50),
    ship_via            VARCHAR(100),
    buyer_id            VARCHAR(50),
    approved_by         UUID            REFERENCES users(user_id),
    approval_date       DATE,
    requisition_id      VARCHAR(50),
    rfq_id              VARCHAR(50),
    vendor_quote_ref    VARCHAR(100),
    blanket_po_ref      VARCHAR(50),
    release_number      VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE purchase_orders IS 'ERP Purchase Orders. Maps erp_purchase_order variables. / Don dat hang mua ERP.';
CREATE INDEX idx_po_vendor ON purchase_orders (vendor_id);
CREATE INDEX idx_po_status ON purchase_orders (po_status);

-- ---------------------------------------------------------------------------
-- 8.4 purchase_order_lines / Dong don dat hang mua
-- ---------------------------------------------------------------------------
CREATE TABLE purchase_order_lines (
    po_line_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id               UUID            NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    line_number         INT             NOT NULL,
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty           NUMERIC(12,2)   NOT NULL,
    received_qty        NUMERIC(12,2)   DEFAULT 0,
    rejected_qty        NUMERIC(12,2)   DEFAULT 0,
    remaining_qty       NUMERIC(12,2),
    unit_cost           NUMERIC(14,4)   NOT NULL,
    extended_cost       NUMERIC(14,2),
    lot_number_vendor   VARCHAR(100),
    coc_required        BOOLEAN         NOT NULL DEFAULT FALSE,
    material_cert_required BOOLEAN      NOT NULL DEFAULT FALSE,
    test_report_required BOOLEAN        NOT NULL DEFAULT FALSE,
    source_inspection_required BOOLEAN  NOT NULL DEFAULT FALSE,
    incoming_inspection_plan VARCHAR(100),
    landed_cost         NUMERIC(14,2),
    duty_pct            NUMERIC(5,2)    DEFAULT 0,
    freight_cost        NUMERIC(12,2)   DEFAULT 0,
    metadata            JSONB           DEFAULT '{}',
    UNIQUE (po_id, line_number)
);
COMMENT ON TABLE purchase_order_lines IS 'PO line items. / Dong chi tiet don dat hang mua.';
CREATE INDEX idx_polines_item ON purchase_order_lines (item_id);


-- ============================================================================
-- SECTION 9: INVENTORY
-- Phan 9: Ton kho
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 9.1 warehouses / Kho
-- ---------------------------------------------------------------------------
CREATE TABLE warehouses (
    warehouse_id    VARCHAR(30)     PRIMARY KEY,
    warehouse_name  VARCHAR(150)    NOT NULL,
    warehouse_name_vi VARCHAR(150),
    location        VARCHAR(300),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE warehouses IS 'Warehouse definitions. / Dinh nghia kho.';

-- ---------------------------------------------------------------------------
-- 9.2 inventory_locations / Vi tri kho
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_locations (
    location_id     VARCHAR(50)     PRIMARY KEY,
    warehouse_id    VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    bin_location    VARCHAR(50),
    zone_code       VARCHAR(20),
    rack            VARCHAR(20),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE inventory_locations IS 'Bin/zone/rack locations within warehouses. / Vi tri thung/khu vuc/ke trong kho.';
CREATE INDEX idx_invloc_wh ON inventory_locations (warehouse_id);

-- ---------------------------------------------------------------------------
-- 9.3 lot_master / Ho so lo
-- ---------------------------------------------------------------------------
CREATE TABLE lot_master (
    lot_number          VARCHAR(100)    PRIMARY KEY,
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    heat_number         VARCHAR(100),
    batch_number        VARCHAR(100),
    vendor_lot_number   VARCHAR(100),
    vendor_id           VARCHAR(50)     REFERENCES vendors(vendor_id),
    received_date       DATE,
    expiration_date     DATE,
    coc_number          VARCHAR(100),
    material_cert_number VARCHAR(100),
    country_of_origin   VARCHAR(5),
    conformance_status  inv_conformance_enum DEFAULT 'in_inspection',
    dmr_number          VARCHAR(50),
    po_reference        VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE lot_master IS 'Lot genealogy with material certs. / Ho so lo voi chung nhan vat lieu.';
CREATE INDEX idx_lotmaster_item ON lot_master (item_id);

-- ---------------------------------------------------------------------------
-- 9.4 serial_master / Ho so serial
-- ---------------------------------------------------------------------------
CREATE TABLE serial_master (
    serial_number   VARCHAR(100)    PRIMARY KEY,
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    lot_number      VARCHAR(100)    REFERENCES lot_master(lot_number),
    status          VARCHAR(30)     DEFAULT 'active',
    location_id     VARCHAR(50)     REFERENCES inventory_locations(location_id),
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE serial_master IS 'Serial number tracking. / Theo doi so serial.';
CREATE INDEX idx_serialmaster_item ON serial_master (item_id);

-- ---------------------------------------------------------------------------
-- 9.5 inventory_transactions / Giao dich ton kho (40 vars from erp_inventory)
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_transactions (
    txn_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id        VARCHAR(30)     NOT NULL REFERENCES warehouses(warehouse_id),
    location_id         VARCHAR(50)     REFERENCES inventory_locations(location_id),
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    lot_number          VARCHAR(100)    REFERENCES lot_master(lot_number),
    serial_number       VARCHAR(100),
    stock_type          stock_type_enum NOT NULL DEFAULT 'raw',
    txn_type            VARCHAR(30)     NOT NULL,  -- receipt, issue, transfer, adjust
    qty_change          NUMERIC(12,2)   NOT NULL,
    qty_on_hand         NUMERIC(12,2),
    qty_available       NUMERIC(12,2),
    qty_allocated       NUMERIC(12,2),
    qty_on_order        NUMERIC(12,2),
    qty_in_transit      NUMERIC(12,2),
    qty_in_inspection   NUMERIC(12,2),
    qty_quarantined     NUMERIC(12,2),
    qty_reserved        NUMERIC(12,2),
    unit_cost_avg       NUMERIC(14,4),
    unit_cost_std       NUMERIC(14,4),
    unit_cost_fifo      NUMERIC(14,4),
    unit_cost_lifo      NUMERIC(14,4),
    unit_cost_last      NUMERIC(14,4),
    inventory_value     NUMERIC(14,2),
    abc_classification  abc_class_enum,
    cycle_count_class   VARCHAR(10),
    reference_type      VARCHAR(50),   -- PO, JO, SO, TRANSFER
    reference_id        VARCHAR(50),
    performed_by        UUID            REFERENCES users(user_id),
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
) PARTITION BY RANGE (recorded_at);
COMMENT ON TABLE inventory_transactions IS 'Inventory transactions with lot/serial tracking. Maps erp_inventory variables. / Giao dich ton kho voi theo doi lo/serial.';

CREATE TABLE inv_txn_2026_h1 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE inv_txn_2026_h2 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');
CREATE TABLE inv_txn_2027_h1 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2027-01-01') TO ('2027-07-01');
CREATE TABLE inv_txn_default PARTITION OF inventory_transactions DEFAULT;

CREATE INDEX idx_invtxn_item ON inventory_transactions (item_id, recorded_at);
CREATE INDEX idx_invtxn_lot ON inventory_transactions (lot_number) WHERE lot_number IS NOT NULL;
CREATE INDEX idx_invtxn_wh ON inventory_transactions (warehouse_id, recorded_at);


-- ============================================================================
-- SECTION 10: PRODUCTION
-- Phan 10: San xuat
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 10.1 job_orders / Lenh san xuat (41 vars from erp_job_order)
-- ---------------------------------------------------------------------------
CREATE TABLE job_orders (
    job_order_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number          VARCHAR(50)     NOT NULL UNIQUE,
    job_type            job_type_enum   NOT NULL DEFAULT 'standard',
    job_status          job_status_enum NOT NULL DEFAULT 'planned',
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty           NUMERIC(12,2)   NOT NULL,
    completed_qty       NUMERIC(12,2)   DEFAULT 0,
    scrapped_qty        NUMERIC(12,2)   DEFAULT 0,
    rework_qty          NUMERIC(12,2)   DEFAULT 0,
    start_date_planned  DATE,
    end_date_planned    DATE,
    start_date_actual   DATE,
    end_date_actual     DATE,
    released_date       DATE,
    closed_date         DATE,
    priority            INT             DEFAULT 500,
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    sales_order_ref     VARCHAR(50),
    so_line_ref         VARCHAR(50),
    project_id          VARCHAR(50),
    lot_number_assigned VARCHAR(100),
    serial_number_range VARCHAR(100),
    bom_revision_used   VARCHAR(20),
    routing_revision_used VARCHAR(20),
    planner_code        VARCHAR(20),
    production_manager  VARCHAR(150),
    current_operation   INT,
    current_work_center VARCHAR(30),
    pct_complete        NUMERIC(5,2)    DEFAULT 0,
    est_total_cost      NUMERIC(14,2),
    actual_total_cost   NUMERIC(14,2),
    variance_cost       NUMERIC(14,2),
    material_cost_est   NUMERIC(14,2),
    material_cost_actual NUMERIC(14,2),
    labor_cost_est      NUMERIC(14,2),
    labor_cost_actual   NUMERIC(14,2),
    overhead_cost_est   NUMERIC(14,2),
    overhead_cost_actual NUMERIC(14,2),
    subcontract_cost_est NUMERIC(14,2),
    subcontract_cost_actual NUMERIC(14,2),
    burden_cost_est     NUMERIC(14,2),
    burden_cost_actual  NUMERIC(14,2),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE job_orders IS 'ERP Job/Production Orders. Maps 41 erp_job_order variables. / Lenh san xuat ERP.';
CREATE INDEX idx_jo_status ON job_orders (job_status);
CREATE INDEX idx_jo_item ON job_orders (item_id);
CREATE INDEX idx_jo_customer ON job_orders (customer_id);
CREATE INDEX idx_jo_dates ON job_orders (end_date_planned) WHERE job_status NOT IN ('completed', 'closed');

-- ---------------------------------------------------------------------------
-- 10.2 job_operations / Cong doan lenh san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE job_operations (
    job_op_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_order_id        UUID            NOT NULL REFERENCES job_orders(job_order_id) ON DELETE CASCADE,
    operation_seq       INT             NOT NULL,
    operation_code      VARCHAR(30),
    description         VARCHAR(300),
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    machine_id          VARCHAR(50),
    setup_time_planned  NUMERIC(8,2),
    setup_time_actual   NUMERIC(8,2),
    run_time_planned    NUMERIC(8,2),
    run_time_actual     NUMERIC(8,2),
    qty_completed       NUMERIC(12,2)   DEFAULT 0,
    qty_scrapped        NUMERIC(12,2)   DEFAULT 0,
    qty_reworked        NUMERIC(12,2)   DEFAULT 0,
    status              VARCHAR(30)     DEFAULT 'pending',
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    metadata            JSONB           DEFAULT '{}',
    UNIQUE (job_order_id, operation_seq)
);
COMMENT ON TABLE job_operations IS 'Job operation-level tracking. / Theo doi cong doan san xuat.';
CREATE INDEX idx_jobops_job ON job_operations (job_order_id);
CREATE INDEX idx_jobops_wc ON job_operations (work_center_id);

-- ---------------------------------------------------------------------------
-- 10.3 labor_transactions / Giao dich lao dong (21 vars from erp_labor_tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE labor_transactions (
    labor_txn_id        UUID            NOT NULL DEFAULT uuid_generate_v4(),
    employee_id         VARCHAR(20)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    labor_type          labor_type_enum NOT NULL,
    clock_in            TIMESTAMPTZ     NOT NULL,
    clock_out           TIMESTAMPTZ,
    labor_hours         NUMERIC(8,2),
    labor_qty_reported  NUMERIC(12,2),
    qty_good            NUMERIC(12,2),
    qty_scrap           NUMERIC(12,2),
    qty_rework          NUMERIC(12,2),
    labor_rate          NUMERIC(10,2),
    labor_cost          NUMERIC(12,2),
    indirect_code       VARCHAR(30),
    shift_code          shift_code,
    pay_type            pay_type_enum   DEFAULT 'regular',
    approved_by         UUID            REFERENCES users(user_id),
    approval_status     VARCHAR(30)     DEFAULT 'pending',
    payroll_exported    BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (labor_txn_id, recorded_at)
) PARTITION BY RANGE (recorded_at);
COMMENT ON TABLE labor_transactions IS 'ERP labor tracking. Maps 21 erp_labor_tracking variables. Partitioned. / Theo doi lao dong ERP. Phan vung.';

CREATE TABLE labor_txn_2026_h1 PARTITION OF labor_transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE labor_txn_2026_h2 PARTITION OF labor_transactions
    FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');
CREATE TABLE labor_txn_default PARTITION OF labor_transactions DEFAULT;

CREATE INDEX idx_labortxn_emp ON labor_transactions (employee_id, recorded_at);
CREATE INDEX idx_labortxn_job ON labor_transactions (job_number, recorded_at);

-- ---------------------------------------------------------------------------
-- 10.4 production_schedule / Lich trinh san xuat (26 vars from erp_scheduling)
-- ---------------------------------------------------------------------------
CREATE TABLE production_schedule (
    schedule_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_type       schedule_type_enum NOT NULL DEFAULT 'finite',
    schedule_status     VARCHAR(30)     DEFAULT 'active',
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT,
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    machine_id          VARCHAR(50),
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    setup_start         TIMESTAMPTZ,
    setup_end           TIMESTAMPTZ,
    run_start           TIMESTAMPTZ,
    run_end             TIMESTAMPTZ,
    sequence_number     INT,
    priority_rank       INT,
    schedule_qty        NUMERIC(12,2),
    remaining_qty       NUMERIC(12,2),
    schedule_hours      NUMERIC(8,2),
    capacity_available  NUMERIC(8,2),
    capacity_load_pct   NUMERIC(5,2),
    overtime_available  NUMERIC(8,2),
    shift_code          shift_code,
    constraint_type     constraint_type_enum,
    reschedule_recommendation TEXT,
    reschedule_date     DATE,
    scheduling_direction VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE production_schedule IS 'ERP scheduling. Maps 26 erp_scheduling variables. / Lich trinh san xuat ERP.';
CREATE INDEX idx_prodsched_job ON production_schedule (job_number);
CREATE INDEX idx_prodsched_wc ON production_schedule (work_center_id);
CREATE INDEX idx_prodsched_dates ON production_schedule (scheduled_start, scheduled_end);


-- ============================================================================
-- SECTION 11: QUALITY
-- Phan 11: Chat luong
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 11.1 inspection_plans / Ke hoach kiem tra (21 vars from erp_quality_extended)
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_plans (
    plan_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_plan_id  VARCHAR(50)     NOT NULL UNIQUE,
    inspection_type     insp_type_erp   NOT NULL,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    sampling_plan       sampling_plan_enum DEFAULT 'aql',
    sampling_standard   sampling_standard_enum DEFAULT 'ansi_z14',
    aql_level           VARCHAR(20),
    accept_number       INT,
    reject_number       INT,
    sample_size         INT,
    test_method         TEXT,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE inspection_plans IS 'Inspection plan definitions. Maps erp_quality_extended variables. / Dinh nghia ke hoach kiem tra.';

-- ---------------------------------------------------------------------------
-- 11.2 inspection_results / Ket qua kiem tra (22 vars from quality_inspection)
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_results (
    result_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id             UUID            REFERENCES inspection_plans(plan_id),
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    job_number          VARCHAR(50),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    operation_seq       INT,
    inspector_id        UUID            REFERENCES users(user_id),
    characteristic      VARCHAR(200)    NOT NULL,
    characteristic_designator char_designator DEFAULT 'Standard',
    characteristic_type char_type_enum,
    ctq_flag            BOOLEAN         NOT NULL DEFAULT FALSE,
    kpc_flag            BOOLEAN         NOT NULL DEFAULT FALSE,
    nominal             NUMERIC(14,6),
    usl                 NUMERIC(14,6),
    lsl                 NUMERIC(14,6),
    tolerance           VARCHAR(50),
    actual_value        NUMERIC(14,6),
    measurement_unit    measurement_unit,
    measurement_method  VARCHAR(100),
    pass_fail           VARCHAR(4)      CHECK (pass_fail IN ('PASS', 'FAIL')),
    sample_size         INT,
    defects_found       INT             DEFAULT 0,
    lot_disposition     lot_disposition_enum,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE inspection_results IS 'Inspection measurement results. Maps quality_inspection variables. / Ket qua do kiem tra.';
CREATE INDEX idx_inspresult_job ON inspection_results (job_number);
CREATE INDEX idx_inspresult_item ON inspection_results (item_id);
CREATE INDEX idx_inspresult_record ON inspection_results (record_id) WHERE record_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 11.3 spc_data / Du lieu SPC
-- ---------------------------------------------------------------------------
CREATE TABLE spc_data (
    spc_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    characteristic      VARCHAR(200)    NOT NULL,
    chart_type          spc_chart_type_enum DEFAULT 'xbar_r',
    job_number          VARCHAR(50),
    operation_seq       INT,
    subgroup_number     INT,
    sample_value        NUMERIC(14,6),
    x_bar               NUMERIC(14,6),
    range_r             NUMERIC(14,6),
    sigma               NUMERIC(14,6),
    cpk                 NUMERIC(8,4),
    cp                  NUMERIC(8,4),
    ppk                 NUMERIC(8,4),
    process_sigma       NUMERIC(8,4),
    ucl                 NUMERIC(14,6),
    lcl                 NUMERIC(14,6),
    centerline          NUMERIC(14,6),
    out_of_control      BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE spc_data IS 'SPC control chart data points. / Du lieu bieu do kiem soat SPC.';
CREATE INDEX idx_spc_item ON spc_data (item_id, characteristic, recorded_at);

-- ---------------------------------------------------------------------------
-- 11.4 ncr_records / Ho so NCR (19 vars from ncr_capa)
-- ---------------------------------------------------------------------------
CREATE TABLE ncr_records (
    ncr_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id           VARCHAR(50)     NOT NULL UNIQUE REFERENCES records(record_id),
    ncr_number          VARCHAR(50)     NOT NULL UNIQUE,
    defect_type         defect_type_enum,
    defect_description  TEXT            NOT NULL,
    disposition         ncr_disposition_enum,
    root_cause          TEXT,
    root_cause_method   root_cause_method_enum,
    containment_action  TEXT,
    nonconformance_source nc_source_enum,
    severity            INT             CHECK (severity BETWEEN 1 AND 10),
    occurrence          INT             CHECK (occurrence BETWEEN 1 AND 10),
    detection           INT             CHECK (detection BETWEEN 1 AND 10),
    rpn                 INT             GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
    ncr_status          ncr_status_enum NOT NULL DEFAULT 'Open',
    -- Job context
    job_number          VARCHAR(50),
    part_number         VARCHAR(100),
    part_rev            VARCHAR(20),
    customer            VARCHAR(200),
    quantity_affected   NUMERIC(12,2),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ncr_records IS 'Detailed NCR records with S/O/D/RPN. Maps ncr_capa variables. / Ho so NCR chi tiet voi S/O/D/RPN.';
CREATE INDEX idx_ncr_status ON ncr_records (ncr_status);
CREATE INDEX idx_ncr_defect ON ncr_records (defect_type);

-- ---------------------------------------------------------------------------
-- 11.5 capa_records / Ho so CAPA
-- ---------------------------------------------------------------------------
CREATE TABLE capa_records (
    capa_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id           VARCHAR(50)     NOT NULL UNIQUE REFERENCES records(record_id),
    source_ncr_id       VARCHAR(50)     REFERENCES ncr_records(ncr_number),
    corrective_action   TEXT,
    preventive_action   TEXT,
    root_cause          TEXT,
    root_cause_method   root_cause_method_enum,
    verification_result VARCHAR(20)     CHECK (verification_result IN ('Effective', 'Not Effective', 'Pending')),
    target_date         DATE,
    completion_date     DATE,
    capa_status         capa_status_enum NOT NULL DEFAULT 'Open',
    action_owner        UUID            REFERENCES users(user_id),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE capa_records IS 'CAPA records. Maps ncr_capa variables. / Ho so hanh dong khac phuc phong ngua.';
CREATE INDEX idx_capa_status ON capa_records (capa_status);

-- ---------------------------------------------------------------------------
-- 11.6 fai_records / Ho so FAI (10 vars from fai)
-- ---------------------------------------------------------------------------
CREATE TABLE fai_records (
    fai_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id           VARCHAR(50)     NOT NULL UNIQUE REFERENCES records(record_id),
    fai_number          VARCHAR(50)     NOT NULL UNIQUE,
    fai_type            fai_type_enum   NOT NULL DEFAULT 'Full',
    fai_reason          fai_reason_enum NOT NULL,
    fai_form_number     VARCHAR(10)     CHECK (fai_form_number IN ('Form 1', 'Form 2', 'Form 3')),
    fai_overall_result  VARCHAR(20)     CHECK (fai_overall_result IN ('Approved', 'Conditional', 'Rejected')),
    -- Job context
    part_number         VARCHAR(100)    NOT NULL,
    part_rev            VARCHAR(20),
    job_number          VARCHAR(50),
    customer            VARCHAR(200),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE fai_records IS 'AS9102 FAI records (Form 1/2/3). Maps fai variables. / Ho so FAI theo AS9102.';

-- ---------------------------------------------------------------------------
-- 11.7 fai_characteristics / Dac tinh FAI (balloon-level data)
-- ---------------------------------------------------------------------------
CREATE TABLE fai_characteristics (
    fai_char_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    fai_id              UUID            NOT NULL REFERENCES fai_records(fai_id) ON DELETE CASCADE,
    balloon_number      INT             NOT NULL,
    design_requirement  TEXT            NOT NULL,
    actual_result       TEXT,
    conformance         VARCHAR(2)      CHECK (conformance IN ('C', 'NC')),
    measurement_data    TEXT,
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE fai_characteristics IS 'FAI characteristic-level measurement data. / Du lieu do dac tinh FAI.';
CREATE INDEX idx_faichar_fai ON fai_characteristics (fai_id);

-- ---------------------------------------------------------------------------
-- 11.8 certificates / Chung chi
-- ---------------------------------------------------------------------------
CREATE TABLE certificates (
    certificate_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_type    cert_type_enum  NOT NULL,
    certificate_number  VARCHAR(100)    NOT NULL,
    job_number          VARCHAR(50),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    lot_number          VARCHAR(100),
    issue_date          DATE            NOT NULL,
    issued_by           UUID            REFERENCES users(user_id),
    file_path           TEXT,
    content_hash        VARCHAR(128),
    ppap_level          INT,
    ppap_status         VARCHAR(30),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE certificates IS 'CoC, CoF, material certs, test reports, FAI certs. / Cac loai chung chi.';
CREATE INDEX idx_certs_job ON certificates (job_number);
CREATE INDEX idx_certs_type ON certificates (certificate_type);

-- ---------------------------------------------------------------------------
-- 11.9 npi_projects / Du an san pham moi (16 vars from erp_npi)
-- ---------------------------------------------------------------------------
CREATE TABLE npi_projects (
    npi_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    npi_project_id      VARCHAR(50)     NOT NULL UNIQUE,
    npi_phase           npi_phase_enum  NOT NULL DEFAULT 'concept',
    npi_gate            npi_gate_enum,
    gate_review_date    DATE,
    gate_status         gate_status_enum,
    pfmea_id            VARCHAR(50),
    pfmea_rpn_max       INT,
    control_plan_id     VARCHAR(50),
    ppap_submission_date DATE,
    run_at_rate_date    DATE,
    run_at_rate_result  TEXT,
    initial_cpk         NUMERIC(8,4),
    initial_ppk         NUMERIC(8,4),
    prototype_qty       INT,
    pilot_lot_number    VARCHAR(100),
    first_production_date DATE,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE npi_projects IS 'NPI projects with APQP/PPAP gate tracking. Maps erp_npi variables. / Du an NPI voi theo doi cong APQP/PPAP.';


-- ---------------------------------------------------------------------------
-- 11.10 engineering_change_requests / Yeu cau thay doi ky thuat (11 vars from engineering)
-- ---------------------------------------------------------------------------
CREATE TABLE engineering_change_requests (
    ecr_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ecr_number          VARCHAR(30)     NOT NULL UNIQUE,
    ecr_status          ecr_status_enum NOT NULL DEFAULT 'Draft',
    ecr_type            VARCHAR(50),    -- design/process/material/tooling/documentation
    change_description  TEXT,
    change_reason       TEXT,
    revision_from       VARCHAR(20),
    revision_to         VARCHAR(20),
    impact_assessment   TEXT,
    affected_documents  JSONB           DEFAULT '[]',
    cam_program_id      VARCHAR(50),
    baseline_version    VARCHAR(20),
    department          dept_code,
    requested_by        UUID            REFERENCES users(user_id),
    approved_by         UUID            REFERENCES users(user_id),
    item_id             UUID            REFERENCES items(item_id),
    linked_record_id    UUID            REFERENCES records(record_id),
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     DEFAULT now(),
    valid_to            TIMESTAMPTZ     DEFAULT 'infinity',
    created_at          TIMESTAMPTZ     DEFAULT now(),
    updated_at          TIMESTAMPTZ     DEFAULT now()
);
COMMENT ON TABLE engineering_change_requests IS 'Engineering change requests (ECR). Maps engineering variables. / Yeu cau thay doi ky thuat.';
COMMENT ON COLUMN engineering_change_requests.ecr_number IS 'Unique ECR identifier, format ECR-{YYYY}-{NNN}. / Ma ECR duy nhat.';
COMMENT ON COLUMN engineering_change_requests.ecr_status IS 'Current ECR lifecycle status. / Trang thai vong doi ECR hien tai.';
COMMENT ON COLUMN engineering_change_requests.ecr_type IS 'Type of change: design, process, material, tooling, documentation. / Loai thay doi.';
COMMENT ON COLUMN engineering_change_requests.impact_assessment IS 'Assessment of change impact on processes, tooling, documentation. / Danh gia tac dong thay doi.';
COMMENT ON COLUMN engineering_change_requests.affected_documents IS 'JSONB array of document IDs affected by this change. / Mang JSONB cac tai lieu bi anh huong.';
COMMENT ON COLUMN engineering_change_requests.cam_program_id IS 'Engineering baseline program identifier per Pattern 3 naming. / Ma chuong trinh CAM theo quy tac P3.';
COMMENT ON COLUMN engineering_change_requests.baseline_version IS 'Version number for engineering baseline files. / So phien ban co so ky thuat.';
CREATE INDEX idx_ecr_status ON engineering_change_requests (ecr_status);
CREATE INDEX idx_ecr_number ON engineering_change_requests (ecr_number);
CREATE INDEX idx_ecr_department ON engineering_change_requests (department);
CREATE INDEX idx_ecr_item ON engineering_change_requests (item_id);
CREATE INDEX idx_ecr_requested_by ON engineering_change_requests (requested_by);
CREATE INDEX idx_ecr_valid_range ON engineering_change_requests USING gist (tstzrange(valid_from, valid_to));


-- ============================================================================
-- SECTION 12: CALIBRATION & EQUIPMENT
-- Phan 12: Hieu chuan & Thiet bi
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 12.1 equipment / Thiet bi (13 equipment + 41 erp_maintenance_cmms vars)
-- ---------------------------------------------------------------------------
CREATE TABLE equipment (
    equipment_id        VARCHAR(50)     PRIMARY KEY,
    equipment_name      VARCHAR(200)    NOT NULL,
    equipment_type      equip_type_maint,
    machine_type        machine_type_enum,
    asset_type          asset_type_enum,
    equipment_serial    VARCHAR(100),
    equipment_location  VARCHAR(200),
    manufacturer        VARCHAR(150),
    model_number        VARCHAR(100),
    resource_group      VARCHAR(50),
    department_id       dept_code       REFERENCES departments(dept_code),
    installation_date   DATE,
    warranty_expiry     DATE,
    criticality_rating  criticality_rating,
    -- Maintenance fields
    mtbf_hours          NUMERIC(10,2),
    mttr_hours          NUMERIC(10,2),
    pm_frequency        pm_frequency_enum,
    pm_last_date        DATE,
    pm_next_date        DATE,
    pm_checklist_id     VARCHAR(50),
    condition_monitoring_type VARCHAR(100),
    -- Calibration fields
    calibration_due     DATE,
    calibration_interval_days INT,
    -- Status
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE equipment IS 'Equipment master with maintenance/calibration fields. Maps equipment + erp_maintenance_cmms variables. / Du lieu thiet bi voi truong bao tri/hieu chuan.';
CREATE INDEX idx_equip_type ON equipment (equipment_type);
CREATE INDEX idx_equip_cal_due ON equipment (calibration_due) WHERE calibration_due IS NOT NULL;
CREATE INDEX idx_equip_pm_next ON equipment (pm_next_date) WHERE pm_next_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 12.2 calibration_records / Ho so hieu chuan (13 vars from calibration)
-- ---------------------------------------------------------------------------
CREATE TABLE calibration_records (
    cal_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    calibration_id      VARCHAR(50)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    calibration_date    DATE            NOT NULL,
    next_due            DATE            NOT NULL,
    calibration_interval INT,           -- in days
    calibration_result  cal_result_enum NOT NULL,
    uncertainty         VARCHAR(100),
    standard_used       VARCHAR(200),
    cal_standard        VARCHAR(200),
    calibration_location cal_location_enum DEFAULT 'In-house',
    grr_result          NUMERIC(6,2),
    grr_status          grr_status_enum,
    performed_by        UUID            REFERENCES users(user_id),
    certificate_path    TEXT,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE calibration_records IS 'Calibration records with GR&R. Maps calibration variables. / Ho so hieu chuan voi GR&R.';
CREATE INDEX idx_calrec_equip ON calibration_records (equipment_id);
CREATE INDEX idx_calrec_due ON calibration_records (next_due);

-- ---------------------------------------------------------------------------
-- 12.3 maintenance_work_orders / Lenh bao tri
-- ---------------------------------------------------------------------------
CREATE TABLE maintenance_work_orders (
    maint_wo_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id       VARCHAR(50)     NOT NULL UNIQUE,
    wo_type             maint_wo_type   NOT NULL,
    wo_status           maint_wo_status NOT NULL DEFAULT 'requested',
    equipment_id        VARCHAR(50)     NOT NULL REFERENCES equipment(equipment_id),
    priority            maint_priority  DEFAULT 'normal',
    failure_code        VARCHAR(50),
    failure_mode        VARCHAR(200),
    cause_code          VARCHAR(50),
    remedy_code         VARCHAR(50),
    requested_by        UUID            REFERENCES users(user_id),
    assigned_to         UUID            REFERENCES users(user_id),
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    actual_start        TIMESTAMPTZ,
    actual_end          TIMESTAMPTZ,
    downtime_hours      NUMERIC(8,2),
    labor_hours         NUMERIC(8,2),
    parts_cost          NUMERIC(12,2),
    labor_cost          NUMERIC(12,2),
    total_cost          NUMERIC(12,2),
    -- Condition monitoring
    vibration_level     NUMERIC(8,2),
    temperature_reading NUMERIC(8,2),
    oil_analysis_result VARCHAR(100),
    spare_part_id       VARCHAR(50),
    spare_part_qty      INT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE maintenance_work_orders IS 'Maintenance work orders (PM, CM, predictive). Maps erp_maintenance_cmms variables. / Lenh bao tri.';
CREATE INDEX idx_maintwo_equip ON maintenance_work_orders (equipment_id);
CREATE INDEX idx_maintwo_status ON maintenance_work_orders (wo_status);

-- ---------------------------------------------------------------------------
-- 12.4 tools / Dao cu (35 vars from erp_tool_management)
-- ---------------------------------------------------------------------------
CREATE TABLE tools (
    tool_id             VARCHAR(50)     PRIMARY KEY,
    tool_description    VARCHAR(300)    NOT NULL,
    tool_type           tool_type_enum,
    tool_material       tool_material_enum,
    tool_diameter       NUMERIC(10,4),
    tool_length         NUMERIC(10,4),
    tool_flutes         INT,
    tool_coating        tool_coating_enum,
    tool_holder_id      VARCHAR(50),
    tool_holder_type    tool_holder_type_enum,
    tool_life_minutes   INT,
    tool_life_remaining_pct NUMERIC(5,2),
    tool_life_parts_count INT,
    tool_life_total_parts INT,
    tool_preset_length  NUMERIC(10,4),
    tool_preset_diameter NUMERIC(10,4),
    tool_offset_length  NUMERIC(10,4),
    tool_offset_diameter NUMERIC(10,4),
    tool_wear_offset    NUMERIC(10,4),
    tool_breakage_detected BOOLEAN      NOT NULL DEFAULT FALSE,
    tool_location       tool_location_enum DEFAULT 'crib',
    tool_crib_location  VARCHAR(50),
    tool_cost           NUMERIC(12,2),
    tool_vendor_id      VARCHAR(50)     REFERENCES vendors(vendor_id),
    tool_reorder_point  INT,
    tool_reorder_qty    INT,
    tool_on_hand_qty    INT             DEFAULT 0,
    regrind_count       INT             DEFAULT 0,
    max_regrind_count   INT,
    regrind_vendor_id   VARCHAR(50),
    regrind_cost        NUMERIC(10,2),
    associated_operations TEXT,
    associated_machines TEXT,
    tool_group_id       VARCHAR(50),
    catalog_number      VARCHAR(100),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE tools IS 'Tool management. Maps 35 erp_tool_management variables. / Quan ly dao cu.';
CREATE INDEX idx_tools_type ON tools (tool_type);
CREATE INDEX idx_tools_location ON tools (tool_location);

-- ---------------------------------------------------------------------------
-- 12.5 tool_transactions / Giao dich dao cu
-- ---------------------------------------------------------------------------
CREATE TABLE tool_transactions (
    txn_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id         VARCHAR(50)     NOT NULL REFERENCES tools(tool_id),
    txn_type        VARCHAR(30)     NOT NULL,  -- issue, return, regrind, scrap, transfer
    from_location   tool_location_enum,
    to_location     tool_location_enum,
    machine_id      VARCHAR(50),
    job_number      VARCHAR(50),
    performed_by    UUID            REFERENCES users(user_id),
    notes           TEXT,
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE tool_transactions IS 'Tool issue, return, regrind, scrap transactions. / Giao dich dao cu.';
CREATE INDEX idx_tooltxn_tool ON tool_transactions (tool_id, recorded_at);


-- ============================================================================
-- SECTION 13: TRAINING & HR
-- Phan 13: Dao tao & Nhan su
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 13.1 employees / Nhan vien (17 vars from personnel)
-- ---------------------------------------------------------------------------
CREATE TABLE employees (
    employee_id         VARCHAR(20)     PRIMARY KEY,
    employee_name       VARCHAR(150)    NOT NULL,
    user_id_code        VARCHAR(50),
    user_id             UUID            REFERENCES users(user_id),
    role_code           VARCHAR(50),
    role_label          VARCHAR(150),
    dept_code           dept_code       REFERENCES departments(dept_code),
    shift               shift_code,
    supervisor_name     VARCHAR(150),
    hire_date           DATE,
    termination_date    DATE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE employees IS 'Employee master. Maps personnel variables. / Du lieu nhan vien.';
CREATE INDEX idx_emp_dept ON employees (dept_code);
CREATE INDEX idx_emp_active ON employees (is_active);

-- ---------------------------------------------------------------------------
-- 13.2 training_records / Ho so dao tao (10 vars from training)
-- ---------------------------------------------------------------------------
CREATE TABLE training_records (
    training_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    training_event_id   VARCHAR(50),
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    training_topic      VARCHAR(300)    NOT NULL,
    training_type       training_type_enum NOT NULL,
    trainer             VARCHAR(150),
    trainee_id          VARCHAR(20)     REFERENCES employees(employee_id),
    assessment_result   VARCHAR(20)     CHECK (assessment_result IN ('Pass', 'Fail', 'Conditional', 'N/A')),
    assessment_score    NUMERIC(5,2),
    competence_level    VARCHAR(50),
    completion_date     DATE,
    training_hours      NUMERIC(6,2),
    certification_body  VARCHAR(200),
    certification_expiry DATE,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE training_records IS 'Training records with competency. Maps training variables. / Ho so dao tao voi nang luc.';
CREATE INDEX idx_training_trainee ON training_records (trainee_id);
CREATE INDEX idx_training_topic ON training_records (training_topic);
CREATE INDEX idx_training_expiry ON training_records (certification_expiry) WHERE certification_expiry IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 13.3 skills_matrix / Ma tran ky nang
-- ---------------------------------------------------------------------------
CREATE TABLE skills_matrix (
    skill_matrix_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    skill_code      VARCHAR(50)     NOT NULL,
    skill_name      VARCHAR(200)    NOT NULL,
    competence_level INT            NOT NULL CHECK (competence_level BETWEEN 0 AND 5),
    assessed_date   DATE            NOT NULL,
    assessed_by     UUID            REFERENCES users(user_id),
    expiry_date     DATE,
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (employee_id, skill_code)
);
COMMENT ON TABLE skills_matrix IS 'Employee x skill x competence level. / Ma tran nhan vien x ky nang x muc nang luc.';
CREATE INDEX idx_skills_emp ON skills_matrix (employee_id);

-- ---------------------------------------------------------------------------
-- 13.4 employee_certifications / Chung chi nhan vien
-- ---------------------------------------------------------------------------
CREATE TABLE employee_certifications (
    cert_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    certification_name VARCHAR(200) NOT NULL,
    certification_body VARCHAR(200),
    issue_date      DATE            NOT NULL,
    expiry_date     DATE,
    certificate_number VARCHAR(100),
    status          VARCHAR(20)     DEFAULT 'active',
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE employee_certifications IS 'Employee certifications with expiry. / Chung chi nhan vien voi han.';
CREATE INDEX idx_empcert_emp ON employee_certifications (employee_id);
CREATE INDEX idx_empcert_expiry ON employee_certifications (expiry_date) WHERE expiry_date IS NOT NULL;


-- ============================================================================
-- SECTION 14: AUDIT
-- Phan 14: Danh gia
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 14.1 audits / Danh gia (11 vars from audit)
-- ---------------------------------------------------------------------------
CREATE TABLE audits (
    audit_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_code          VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    audit_type          audit_type_enum NOT NULL,
    audit_scope         TEXT            NOT NULL,
    audit_date          DATE            NOT NULL,
    lead_auditor        UUID            REFERENCES users(user_id),
    audit_team          TEXT,
    audit_score         NUMERIC(5,2),
    audit_conclusion    audit_conclusion_enum,
    next_audit_date     DATE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE audits IS 'Audit records (internal, external, supplier, LPA). Maps audit variables. / Ho so danh gia.';
CREATE INDEX idx_audits_type ON audits (audit_type);
CREATE INDEX idx_audits_date ON audits (audit_date);

-- ---------------------------------------------------------------------------
-- 14.2 audit_findings / Phat hien danh gia
-- ---------------------------------------------------------------------------
CREATE TABLE audit_findings (
    finding_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id            UUID            NOT NULL REFERENCES audits(audit_id) ON DELETE CASCADE,
    finding_type        finding_type_enum NOT NULL,
    finding_grade       finding_grade_enum,
    clause_reference    VARCHAR(100),
    finding_description TEXT            NOT NULL,
    evidence            TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_findings IS 'Audit finding details. / Chi tiet phat hien danh gia.';
CREATE INDEX idx_audfind_audit ON audit_findings (audit_id);

-- ---------------------------------------------------------------------------
-- 14.3 audit_actions / Hanh dong khac phuc danh gia
-- ---------------------------------------------------------------------------
CREATE TABLE audit_actions (
    action_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    finding_id          UUID            NOT NULL REFERENCES audit_findings(finding_id) ON DELETE CASCADE,
    capa_record_id      VARCHAR(50)     REFERENCES records(record_id),
    action_description  TEXT            NOT NULL,
    responsible         UUID            REFERENCES users(user_id),
    target_date         DATE,
    completion_date     DATE,
    status              VARCHAR(30)     DEFAULT 'open',
    verification_notes  TEXT,
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE audit_actions IS 'Corrective actions linked to audit findings. / Hanh dong khac phuc lien ket phat hien danh gia.';
CREATE INDEX idx_audactions_finding ON audit_actions (finding_id);


-- ============================================================================
-- SECTION 15: RISK & IMPROVEMENT
-- Phan 15: Rui ro & Cai tien
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 15.1 risk_register / So rui ro (10 vars from risk)
-- ---------------------------------------------------------------------------
CREATE TABLE risk_register (
    risk_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_code           VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    risk_category       risk_category_enum NOT NULL,
    risk_description    TEXT            NOT NULL,
    likelihood          INT             NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
    impact              INT             NOT NULL CHECK (impact BETWEEN 1 AND 5),
    risk_level          risk_level_enum NOT NULL,
    mitigation_action   TEXT,
    residual_risk       risk_level_enum,
    risk_owner          UUID            REFERENCES users(user_id),
    review_period       VARCHAR(50),
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE risk_register IS 'Risk register per ISO 9001 clause 6.1. Maps risk variables. / So rui ro theo ISO 9001 dieu 6.1.';
CREATE INDEX idx_risk_level ON risk_register (risk_level);
CREATE INDEX idx_risk_category ON risk_register (risk_category);

-- ---------------------------------------------------------------------------
-- 15.2 improvement_projects / Du an cai tien (7 vars from improvement)
-- ---------------------------------------------------------------------------
CREATE TABLE improvement_projects (
    improvement_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    improvement_code    VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    project_title       VARCHAR(300)    NOT NULL,
    sponsor             VARCHAR(150),
    target_kpi          VARCHAR(100),
    baseline_value      VARCHAR(100),
    target_value        VARCHAR(100),
    improvement_status  improvement_status_enum NOT NULL DEFAULT 'Plan',
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE improvement_projects IS 'Continual improvement projects (PDCA). Maps improvement variables. / Du an cai tien lien tuc (PDCA).';

-- ---------------------------------------------------------------------------
-- 15.3 management_reviews / Xem xet cua lanh dao (4 vars from management_review)
-- ---------------------------------------------------------------------------
CREATE TABLE management_reviews (
    mr_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    mr_code             VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    review_period       VARCHAR(50)     NOT NULL,
    review_date         DATE            NOT NULL,
    attendees           TEXT,
    agenda_items        JSONB           DEFAULT '[]',
    action_items        JSONB           DEFAULT '[]',
    next_review_date    DATE,
    minutes_path        TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE management_reviews IS 'Management review records per ISO 9001 9.3. Maps management_review variables. / Ho so xem xet cua lanh dao.';


-- ============================================================================
-- SECTION 16: FINANCE & COSTING
-- Phan 16: Tai chinh & Chi phi
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 16.1 cost_elements / Yeu to chi phi (32 vars from erp_costing)
-- ---------------------------------------------------------------------------
CREATE TABLE cost_elements (
    cost_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    cost_element        VARCHAR(100)    NOT NULL,
    cost_type           cost_type_enum  NOT NULL DEFAULT 'standard',
    cost_method         cost_method_enum DEFAULT 'standard',
    cost_group          cost_group_enum,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    std_material_cost   NUMERIC(14,4),
    std_labor_cost      NUMERIC(14,4),
    std_overhead_cost   NUMERIC(14,4),
    std_subcontract_cost NUMERIC(14,4),
    std_burden_cost     NUMERIC(14,4),
    std_total_cost      NUMERIC(14,4),
    actual_material_cost NUMERIC(14,4),
    actual_labor_cost   NUMERIC(14,4),
    actual_overhead_cost NUMERIC(14,4),
    actual_subcontract_cost NUMERIC(14,4),
    actual_total_cost   NUMERIC(14,4),
    variance_material   NUMERIC(14,4),
    variance_labor      NUMERIC(14,4),
    variance_overhead   NUMERIC(14,4),
    variance_total      NUMERIC(14,4),
    variance_type       variance_type_enum,
    overhead_rate_labor_pct NUMERIC(6,2),
    overhead_rate_machine_pct NUMERIC(6,2),
    burden_rate         NUMERIC(10,2),
    scrap_allowance_pct NUMERIC(5,2),
    yield_adjustment    NUMERIC(10,4),
    cost_roll_date      DATE,
    frozen_cost_date    DATE,
    gl_account          VARCHAR(50),
    cost_center         VARCHAR(50),
    profit_center       VARCHAR(50),
    cost_revision       VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE cost_elements IS 'Cost element definitions. Maps 32 erp_costing variables. / Dinh nghia yeu to chi phi.';
CREATE INDEX idx_costelm_item ON cost_elements (item_id);

-- ---------------------------------------------------------------------------
-- 16.2 job_costing / Chi phi theo lenh san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE job_costing (
    job_cost_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number      VARCHAR(50)     NOT NULL,
    material_cost   NUMERIC(14,2)   DEFAULT 0,
    labor_cost      NUMERIC(14,2)   DEFAULT 0,
    overhead_cost   NUMERIC(14,2)   DEFAULT 0,
    subcontract_cost NUMERIC(14,2)  DEFAULT 0,
    outsource_cost  NUMERIC(14,2)   DEFAULT 0,
    total_cost      NUMERIC(14,2)   GENERATED ALWAYS AS
        (material_cost + labor_cost + overhead_cost + subcontract_cost + outsource_cost) STORED,
    snapshot_date   DATE            NOT NULL,
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE job_costing IS 'Job-level cost accumulation. Maps finance variables. / Tich luy chi phi theo lenh.';
CREATE INDEX idx_jobcost_job ON job_costing (job_number);

-- ---------------------------------------------------------------------------
-- 16.3 gl_transactions / Giao dich ke toan (27 vars from erp_gl_finance)
-- ---------------------------------------------------------------------------
CREATE TABLE gl_transactions (
    gl_txn_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    gl_account_number   VARCHAR(30)     NOT NULL,
    gl_account_name     VARCHAR(200),
    gl_account_type     gl_account_type,
    journal_entry_id    VARCHAR(50),
    posting_date        DATE            NOT NULL,
    fiscal_year         INT             NOT NULL,
    fiscal_period       INT             NOT NULL,
    debit_amount        NUMERIC(14,2)   DEFAULT 0,
    credit_amount       NUMERIC(14,2)   DEFAULT 0,
    currency_code       VARCHAR(3)      DEFAULT 'VND',
    cost_center         VARCHAR(50),
    profit_center       VARCHAR(50),
    project_id          VARCHAR(50),
    job_number          VARCHAR(50),
    department_id       dept_code,
    transaction_type    VARCHAR(50),
    reference_number    VARCHAR(100),
    batch_number        VARCHAR(50),
    posted_by           UUID            REFERENCES users(user_id),
    approved_by         UUID            REFERENCES users(user_id),
    intercompany_flag   BOOLEAN         NOT NULL DEFAULT FALSE,
    consolidation_code  VARCHAR(20),
    budget_code         VARCHAR(30),
    budget_amount       NUMERIC(14,2),
    actual_amount       NUMERIC(14,2),
    variance_amount     NUMERIC(14,2),
    encumbrance_amount  NUMERIC(14,2),
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE gl_transactions IS 'GL journal entries. Maps 27 erp_gl_finance variables. / But toan ke toan.';
CREATE INDEX idx_gltxn_account ON gl_transactions (gl_account_number, posting_date);
CREATE INDEX idx_gltxn_period ON gl_transactions (fiscal_year, fiscal_period);

-- ---------------------------------------------------------------------------
-- 16.4 ap_ar_invoices / Hoa don phai tra/phai thu (20 vars from erp_ap_ar)
-- ---------------------------------------------------------------------------
CREATE TABLE ap_ar_invoices (
    invoice_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number      VARCHAR(50)     NOT NULL,
    invoice_date        DATE            NOT NULL,
    invoice_type        invoice_type_enum NOT NULL DEFAULT 'standard',
    ledger_type         VARCHAR(2)      NOT NULL CHECK (ledger_type IN ('AP', 'AR')),
    vendor_or_customer_id VARCHAR(50)   NOT NULL,
    po_reference        VARCHAR(50),
    so_reference        VARCHAR(50),
    line_amount         NUMERIC(14,2)   NOT NULL,
    tax_amount          NUMERIC(12,2)   DEFAULT 0,
    total_amount        NUMERIC(14,2)   NOT NULL,
    currency_code       VARCHAR(3)      DEFAULT 'VND',
    payment_terms       VARCHAR(50),
    due_date            DATE,
    discount_date       DATE,
    discount_amount     NUMERIC(12,2),
    payment_status      payment_status_enum NOT NULL DEFAULT 'open',
    payment_date        DATE,
    payment_method      VARCHAR(50),
    payment_reference   VARCHAR(100),
    aging_bucket        aging_bucket_enum,
    three_way_match_status match_status_enum,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ap_ar_invoices IS 'AP/AR invoices. Maps 20 erp_ap_ar variables. / Hoa don phai tra/phai thu.';
CREATE INDEX idx_apar_status ON ap_ar_invoices (payment_status);
CREATE INDEX idx_apar_due ON ap_ar_invoices (due_date) WHERE payment_status NOT IN ('paid');
CREATE INDEX idx_apar_type ON ap_ar_invoices (ledger_type);


-- ============================================================================
-- SECTION 17: SHIPPING & COMPLIANCE
-- Phan 17: Van chuyen & Tuan thu
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 17.1 shipments / Van chuyen (26 vars from erp_shipping_logistics)
-- ---------------------------------------------------------------------------
CREATE TABLE shipments (
    shipment_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_code       VARCHAR(50)     NOT NULL UNIQUE,
    shipment_status     shipment_status_enum NOT NULL DEFAULT 'planned',
    ship_date           DATE,
    delivery_date_est   DATE,
    delivery_date_actual DATE,
    carrier_id          VARCHAR(50),
    carrier_name        VARCHAR(150),
    carrier_service     VARCHAR(100),
    tracking_number     VARCHAR(200),
    waybill_number      VARCHAR(100),
    freight_charge      NUMERIC(12,2),
    freight_terms       freight_terms_enum,
    incoterms           VARCHAR(20),
    ship_from_warehouse VARCHAR(30)     REFERENCES warehouses(warehouse_id),
    ship_to_address     TEXT,
    packing_list_number VARCHAR(100),
    coc_number          VARCHAR(100),
    num_packages        INT,
    total_weight        NUMERIC(10,2),
    total_volume        NUMERIC(10,2),
    hazmat_flag         BOOLEAN         NOT NULL DEFAULT FALSE,
    customs_declaration_number VARCHAR(100),
    export_license_number VARCHAR(100),
    itar_license        BOOLEAN         NOT NULL DEFAULT FALSE,
    country_of_destination VARCHAR(5),
    commercial_invoice_number VARCHAR(100),
    certificate_of_origin VARCHAR(100),
    special_packaging_req TEXT,
    -- Linked entities
    sales_order_id      UUID            REFERENCES sales_orders(sales_order_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE shipments IS 'Shipment records. Maps erp_shipping_logistics + shipment variables. / Ho so van chuyen.';
CREATE INDEX idx_ship_status ON shipments (shipment_status);
CREATE INDEX idx_ship_date ON shipments (ship_date);
CREATE INDEX idx_ship_tracking ON shipments (tracking_number) WHERE tracking_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 17.2 shipment_packages / Kien hang
-- ---------------------------------------------------------------------------
CREATE TABLE shipment_packages (
    package_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id     UUID            NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    package_number  INT             NOT NULL,
    sscc_barcode    VARCHAR(50),
    weight          NUMERIC(10,2),
    dimensions      VARCHAR(100),
    contents_desc   TEXT,
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (shipment_id, package_number)
);
COMMENT ON TABLE shipment_packages IS 'Package-level detail for shipments. / Chi tiet kien hang.';

-- ---------------------------------------------------------------------------
-- 17.3 compliance_records / Ho so tuan thu (15 vars from erp_compliance_regulatory)
-- ---------------------------------------------------------------------------
CREATE TABLE compliance_records (
    compliance_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    regulation_code     VARCHAR(50)     NOT NULL,
    regulation_name     VARCHAR(200)    NOT NULL,
    compliance_status   compliance_status_enum NOT NULL DEFAULT 'pending_review',
    jurisdiction        jurisdiction_enum,
    export_classification export_class_enum,
    eccn_number         VARCHAR(20),
    license_type        license_type_enum,
    license_number      VARCHAR(100),
    license_expiry      DATE,
    restricted_party_screen_date DATE,
    restricted_party_screen_result VARCHAR(50),
    dfars_compliant     BOOLEAN,
    buy_american_compliant BOOLEAN,
    specialty_metals_compliant BOOLEAN,
    prop65_warning_required BOOLEAN,
    -- Linked entity
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE compliance_records IS 'Regulatory compliance (ITAR/EAR/RoHS/DFARS). Maps erp_compliance_regulatory variables. / Tuan thu quy dinh.';
CREATE INDEX idx_compliance_status ON compliance_records (compliance_status);

-- ---------------------------------------------------------------------------
-- 17.4 export_licenses / Giay phep xuat khau
-- ---------------------------------------------------------------------------
CREATE TABLE export_licenses (
    license_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_number  VARCHAR(100)    NOT NULL UNIQUE,
    license_type    license_type_enum NOT NULL,
    classification  export_class_enum,
    item_id         VARCHAR(50)     REFERENCES items(item_id),
    customer_id     VARCHAR(50)     REFERENCES customers(customer_id),
    country         VARCHAR(5),
    issue_date      DATE,
    expiry_date     DATE,
    status          VARCHAR(30)     DEFAULT 'active',
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE export_licenses IS 'Export license tracking. / Theo doi giay phep xuat khau.';


-- ============================================================================
-- SECTION 18: SUBCONTRACTING
-- Phan 18: Gia cong ngoai
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 18.1 subcontract_orders / Don gia cong ngoai (18 vars from erp_subcontracting)
-- ---------------------------------------------------------------------------
CREATE TABLE subcontract_orders (
    subcontract_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcontract_po_number VARCHAR(50)   NOT NULL UNIQUE,
    subcontract_type    subcontract_type_enum NOT NULL,
    subcontract_process subcontract_process_enum NOT NULL,
    subcontract_spec    TEXT,
    vendor_id           VARCHAR(50)     NOT NULL REFERENCES vendors(vendor_id),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    job_number          VARCHAR(50),
    ship_out_date       DATE,
    ship_out_qty        NUMERIC(12,2),
    expected_return_date DATE,
    actual_return_date  DATE,
    return_qty_good     NUMERIC(12,2),
    return_qty_reject   NUMERIC(12,2),
    unit_cost           NUMERIC(14,4),
    nadcap_required     BOOLEAN         NOT NULL DEFAULT FALSE,
    nadcap_accreditation VARCHAR(100),
    coc_received        BOOLEAN         NOT NULL DEFAULT FALSE,
    test_report_received BOOLEAN        NOT NULL DEFAULT FALSE,
    turnaround_days_target INT,
    turnaround_days_actual INT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE subcontract_orders IS 'Subcontracting orders. Maps 18 erp_subcontracting variables. / Don gia cong ngoai.';
CREATE INDEX idx_subcon_vendor ON subcontract_orders (vendor_id);

-- ---------------------------------------------------------------------------
-- 18.2 subcontract_receipts / Nhan hang gia cong ngoai
-- ---------------------------------------------------------------------------
CREATE TABLE subcontract_receipts (
    receipt_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcontract_id  UUID            NOT NULL REFERENCES subcontract_orders(subcontract_id),
    received_date   DATE            NOT NULL,
    qty_received    NUMERIC(12,2)   NOT NULL,
    qty_accepted    NUMERIC(12,2),
    qty_rejected    NUMERIC(12,2),
    coc_received    BOOLEAN         DEFAULT FALSE,
    inspection_result VARCHAR(20),
    ncr_reference   VARCHAR(50),
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE subcontract_receipts IS 'Subcontract return tracking with quality results. / Theo doi nhan hang gia cong voi ket qua chat luong.';


-- ============================================================================
-- SECTION 19: WARRANTY & RMA
-- Phan 19: Bao hanh & RMA
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 19.1 rma_orders / Lenh RMA (17 vars from erp_warranty_rma)
-- ---------------------------------------------------------------------------
CREATE TABLE rma_orders (
    rma_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    rma_number          VARCHAR(50)     NOT NULL UNIQUE,
    rma_status          rma_status_enum NOT NULL DEFAULT 'requested',
    rma_type            rma_type_enum   NOT NULL DEFAULT 'non_warranty',
    customer_id         VARCHAR(50)     NOT NULL REFERENCES customers(customer_id),
    original_so_number  VARCHAR(50),
    return_date         DATE,
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    serial_number       VARCHAR(100),
    qty_returned        NUMERIC(12,2),
    failure_description TEXT,
    disposition         rma_disposition_enum,
    warranty_start_date DATE,
    warranty_end_date   DATE,
    repair_cost         NUMERIC(12,2),
    credit_amount       NUMERIC(12,2),
    linked_ncr_number   VARCHAR(50),
    linked_capa_number  VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE rma_orders IS 'RMA/Warranty records. Maps 17 erp_warranty_rma variables. / Ho so RMA/Bao hanh.';
CREATE INDEX idx_rma_customer ON rma_orders (customer_id);
CREATE INDEX idx_rma_status ON rma_orders (rma_status);


-- ============================================================================
-- SECTION 20: PROJECT MANAGEMENT
-- Phan 20: Quan ly du an
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 20.1 projects / Du an (15 vars from erp_project_management)
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
    project_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code        VARCHAR(50)     NOT NULL UNIQUE,
    project_name        VARCHAR(300)    NOT NULL,
    project_name_vi     VARCHAR(300),
    project_type        project_type_enum NOT NULL,
    project_status      project_status_enum NOT NULL DEFAULT 'proposed',
    project_manager     UUID            REFERENCES users(user_id),
    start_date_planned  DATE,
    end_date_planned    DATE,
    wbs_code            VARCHAR(50),
    budget_total        NUMERIC(14,2),
    actual_total        NUMERIC(14,2),
    pct_complete        NUMERIC(5,2)    DEFAULT 0,
    earned_value        NUMERIC(14,2),
    spi_index           NUMERIC(6,4),
    cpi_index           NUMERIC(6,4),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE projects IS 'Project management. Maps erp_project_management variables. / Quan ly du an.';
CREATE INDEX idx_proj_status ON projects (project_status);

-- ---------------------------------------------------------------------------
-- 20.2 project_milestones / Moc du an
-- ---------------------------------------------------------------------------
CREATE TABLE project_milestones (
    milestone_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID            NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    milestone_name  VARCHAR(300)    NOT NULL,
    planned_date    DATE,
    actual_date     DATE,
    status          VARCHAR(30)     DEFAULT 'pending',
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE project_milestones IS 'Project milestones. / Moc du an.';

-- ---------------------------------------------------------------------------
-- 20.3 project_resources / Nguon luc du an
-- ---------------------------------------------------------------------------
CREATE TABLE project_resources (
    resource_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID            NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    user_id         UUID            REFERENCES users(user_id),
    role_desc       VARCHAR(200),
    allocation_pct  NUMERIC(5,2)    DEFAULT 100,
    start_date      DATE,
    end_date        DATE,
    metadata        JSONB           DEFAULT '{}'
);
COMMENT ON TABLE project_resources IS 'Project resource assignments. / Phan bo nguon luc du an.';


-- ============================================================================
-- SECTION 21: MRP & PLANNING
-- Phan 21: MRP & Ke hoach
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 21.1 mrp_planned_orders / Lenh ke hoach MRP (33 vars from erp_mrp_planning)
-- ---------------------------------------------------------------------------
CREATE TABLE mrp_planned_orders (
    planned_order_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    planned_order_code  VARCHAR(50)     NOT NULL UNIQUE,
    planned_order_type  planned_order_type NOT NULL,
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty           NUMERIC(12,2)   NOT NULL,
    due_date            DATE            NOT NULL,
    start_date          DATE,
    release_date        DATE,
    planner_code        VARCHAR(20),
    mrp_status          mrp_status_enum NOT NULL DEFAULT 'planned',
    mrp_exception_code  VARCHAR(20),
    exception_message   TEXT,
    demand_source       demand_source_enum,
    demand_source_ref   VARCHAR(100),
    supply_source       VARCHAR(100),
    pegging_ref         VARCHAR(100),
    net_requirement     NUMERIC(12,2),
    gross_requirement   NUMERIC(12,2),
    projected_available NUMERIC(12,2),
    available_to_promise NUMERIC(12,2),
    capable_to_promise  NUMERIC(12,2),
    cumulative_lead_time INT,
    manufacturing_lead_time INT,
    purchasing_lead_time INT,
    inspection_lead_time INT,
    planning_fence_days INT,
    demand_fence_days   INT,
    lot_size_rule       lot_size_rule_enum DEFAULT 'lot_for_lot',
    lot_size_min        NUMERIC(12,2),
    lot_size_max        NUMERIC(12,2),
    lot_size_multiple   NUMERIC(12,2),
    safety_stock_method safety_stock_method_enum DEFAULT 'none',
    safety_lead_time_days INT,
    time_bucket         time_bucket_enum DEFAULT 'daily',
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mrp_planned_orders IS 'MRP planned orders. Maps 33 erp_mrp_planning variables. / Lenh ke hoach MRP.';
CREATE INDEX idx_mrp_item ON mrp_planned_orders (item_id);
CREATE INDEX idx_mrp_status ON mrp_planned_orders (mrp_status);


-- ============================================================================
-- SECTION 22: EHS (SAFETY)
-- Phan 22: An toan & Moi truong
-- ============================================================================

CREATE TABLE ehs_incidents (
    incident_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_code       VARCHAR(50)     NOT NULL UNIQUE,
    record_id           VARCHAR(50)     REFERENCES records(record_id),
    incident_type       incident_type_enum NOT NULL,
    incident_location   VARCHAR(200),
    incident_description TEXT           NOT NULL,
    corrective_action   TEXT,
    reported_by         UUID            REFERENCES users(user_id),
    incident_date       TIMESTAMPTZ     NOT NULL,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE ehs_incidents IS 'EHS incident records. Maps ehs variables. / Ho so su co an toan.';


-- ============================================================================
-- SECTION 23: CONTAMINATION & FOD
-- Phan 23: Nhiem ban & FOD
-- ============================================================================

CREATE TABLE contamination_checks (
    check_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number          VARCHAR(50),
    item_id             VARCHAR(50)     REFERENCES items(item_id),
    cleanliness_level   cleanliness_level_enum,
    fod_check_result    VARCHAR(4)      CHECK (fod_check_result IN ('Pass', 'Fail')),
    contamination_type  contamination_type_enum,
    cleaning_method     cleaning_method_enum,
    packaging_material  VARCHAR(200),
    inspector_id        UUID            REFERENCES users(user_id),
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE contamination_checks IS 'Contamination and FOD checks. Maps contamination_fod variables. / Kiem tra nhiem ban va FOD.';


-- ============================================================================
-- SECTION 24: KPI & ANALYTICS
-- Phan 24: KPI & Phan tich
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 24.1 kpi_definitions / Dinh nghia KPI (14 vars from kpi_metrics)
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_definitions (
    kpi_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_code         VARCHAR(50)     NOT NULL UNIQUE,
    kpi_name            VARCHAR(200)    NOT NULL,
    kpi_name_vi         VARCHAR(200),
    formula             TEXT,
    unit                VARCHAR(30),
    target              NUMERIC(12,4),
    threshold_green     NUMERIC(12,4),
    threshold_yellow    NUMERIC(12,4),
    dept_code           dept_code       REFERENCES departments(dept_code),
    frequency           VARCHAR(20)     DEFAULT 'monthly',
    metadata            JSONB           DEFAULT '{}',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE kpi_definitions IS 'KPI metric definitions. / Dinh nghia chi so KPI.';

-- ---------------------------------------------------------------------------
-- 24.2 kpi_snapshots / Anh chup KPI
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_snapshots (
    snapshot_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id          UUID            NOT NULL REFERENCES kpi_definitions(kpi_id),
    period_start    DATE            NOT NULL,
    period_end      DATE            NOT NULL,
    actual_value    NUMERIC(12,4),
    target_value    NUMERIC(12,4),
    kpi_status      kpi_status_enum,
    -- Common KPI values
    on_time_delivery_rate       NUMERIC(5,2),
    customer_complaint_rate     NUMERIC(5,2),
    internal_reject_rate        NUMERIC(5,2),
    supplier_quality_index      NUMERIC(5,2),
    training_completion_rate    NUMERIC(5,2),
    capa_closure_rate           NUMERIC(5,2),
    calibration_compliance_rate NUMERIC(5,2),
    scrap_rate                  NUMERIC(5,2),
    metadata        JSONB           DEFAULT '{}',
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE kpi_snapshots IS 'KPI periodic snapshots (OTD, DPMO, OEE, etc.). Maps kpi_metrics variables. / Anh chup KPI dinh ky.';
CREATE INDEX idx_kpisnap_kpi ON kpi_snapshots (kpi_id, period_start);
CREATE INDEX idx_kpisnap_period ON kpi_snapshots (period_start, period_end);


-- ============================================================================
-- SECTION 25: SYSTEM TABLES
-- Phan 25: Bang he thong
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 25.1 variable_registry / Dang ky bien
-- ---------------------------------------------------------------------------
CREATE TABLE variable_registry (
    variable_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    category        VARCHAR(100)    NOT NULL,
    key             VARCHAR(100)    NOT NULL,
    label           VARCHAR(300)    NOT NULL,
    label_vi        VARCHAR(300),
    data_type       VARCHAR(30)     NOT NULL,
    enum_values     JSONB,
    validation      TEXT,
    format          VARCHAR(100),
    example         TEXT,
    required        BOOLEAN         NOT NULL DEFAULT FALSE,
    source          VARCHAR(50),
    used_in         TEXT[],
    description     TEXT,
    UNIQUE (category, key)
);
COMMENT ON TABLE variable_registry IS 'Mirror of variable_library.json for DB-level validation. / Ban sao variable_library.json cho xac thuc DB.';
CREATE INDEX idx_varreg_category ON variable_registry (category);

-- ---------------------------------------------------------------------------
-- 25.2 naming_patterns / Quy tac dat ten (17 vars from naming_pattern)
-- ---------------------------------------------------------------------------
CREATE TABLE naming_patterns (
    pattern_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_name    VARCHAR(10)     NOT NULL,      -- P1, P2, P3, P4, P5, P6
    description     TEXT            NOT NULL,
    template        TEXT            NOT NULL,
    example         TEXT,
    scope           VARCHAR(100),
    applicable_to   TEXT[],
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (pattern_name)
);
COMMENT ON TABLE naming_patterns IS 'P1-P6 naming rules from naming standard. / Quy tac dat ten P1-P6.';

-- ---------------------------------------------------------------------------
-- 25.3 notifications / Thong bao
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
    notification_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(300)    NOT NULL,
    body            TEXT,
    link            TEXT,
    category        VARCHAR(50),       -- approval, overdue, alert, info
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    read_at         TIMESTAMPTZ
);
COMMENT ON TABLE notifications IS 'User notifications. / Thong bao nguoi dung.';
CREATE INDEX idx_notif_user ON notifications (user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- 25.4 file_attachments / Tep dinh kem chung
-- ---------------------------------------------------------------------------
CREATE TABLE file_attachments (
    file_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50)     NOT NULL,      -- record, document, equipment, etc.
    entity_id       TEXT            NOT NULL,
    file_name       VARCHAR(500)    NOT NULL,
    file_path       TEXT            NOT NULL,
    file_hash       VARCHAR(128)    NOT NULL,      -- SHA-256
    file_size       BIGINT          NOT NULL,
    mime_type       VARCHAR(255),
    uploaded_by     UUID            REFERENCES users(user_id),
    uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE file_attachments IS 'Generic file storage with SHA-256 hash. / Luu tru tep chung voi SHA-256.';
CREATE INDEX idx_fileatt_entity ON file_attachments (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 25.5 tags / Nhan (polymorphic)
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
    tag_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       TEXT            NOT NULL,
    tag_name        VARCHAR(100)    NOT NULL,
    created_by      UUID            REFERENCES users(user_id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id, tag_name)
);
COMMENT ON TABLE tags IS 'Polymorphic tagging system. / He thong gan nhan da hinh.';
CREATE INDEX idx_tags_entity ON tags (entity_type, entity_id);
CREATE INDEX idx_tags_name ON tags (tag_name);

-- ---------------------------------------------------------------------------
-- 25.6 comments / Binh luan (polymorphic)
-- ---------------------------------------------------------------------------
CREATE TABLE comments (
    comment_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       TEXT            NOT NULL,
    parent_id       UUID            REFERENCES comments(comment_id),
    body            TEXT            NOT NULL,
    author_id       UUID            NOT NULL REFERENCES users(user_id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE comments IS 'Polymorphic comments on any record. / Binh luan da hinh tren bat ky ho so nao.';
CREATE INDEX idx_comments_entity ON comments (entity_type, entity_id, created_at);

-- ---------------------------------------------------------------------------
-- 25.7 workflow_definitions / Dinh nghia quy trinh
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_definitions (
    workflow_def_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_name   VARCHAR(200)    NOT NULL UNIQUE,
    description     TEXT,
    states          JSONB           NOT NULL,   -- array of state objects
    transitions     JSONB           NOT NULL,   -- array of transition objects
    initial_state   VARCHAR(50)     NOT NULL,
    final_states    TEXT[]          NOT NULL,
    entity_type     VARCHAR(50)     NOT NULL,   -- record, document, form_entry
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflow_definitions IS 'State machine definitions for approval flows. / Dinh nghia may trang thai cho luong phe duyet.';

-- ---------------------------------------------------------------------------
-- 25.8 workflow_instances / Phien ban quy trinh
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_instances (
    instance_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_def_id UUID            NOT NULL REFERENCES workflow_definitions(workflow_def_id),
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       TEXT            NOT NULL,
    current_state   VARCHAR(50)     NOT NULL,
    history         JSONB           DEFAULT '[]',  -- array of state transition events
    assigned_to     UUID            REFERENCES users(user_id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflow_instances IS 'Active workflow state tracking. / Theo doi trang thai quy trinh hoat dong.';
CREATE INDEX idx_wfinst_entity ON workflow_instances (entity_type, entity_id);
CREATE INDEX idx_wfinst_state ON workflow_instances (current_state);


-- ============================================================================
-- SECTION 26: VIEWS
-- Phan 26: Cac view
-- ============================================================================

-- Active (current) documents
CREATE VIEW v_active_documents AS
SELECT d.doc_id, d.doc_type, d.title, d.title_vi, d.dept_code,
       d.current_rev, d.status, d.owner_role,
       dv.effective_date, dv.author, dv.approver
FROM documents d
LEFT JOIN document_versions dv ON d.doc_id = dv.doc_id AND dv.rev = d.current_rev
WHERE d.status = 'approved';
COMMENT ON VIEW v_active_documents IS 'Currently active approved documents. / Tai lieu hien tai da phe duyet.';

-- Open NCRs with RPN
CREATE VIEW v_open_ncrs AS
SELECT n.ncr_number, n.defect_type, n.disposition, n.ncr_status,
       n.severity, n.occurrence, n.detection, n.rpn,
       n.job_number, n.part_number, n.customer,
       r.created_by, r.assigned_to, r.due_date, r.dept_code,
       r.created_at
FROM ncr_records n
JOIN records r ON n.record_id = r.record_id
WHERE n.ncr_status NOT IN ('Closed', 'Verified');
COMMENT ON VIEW v_open_ncrs IS 'Open NCRs with RPN scores. / NCR dang mo voi diem RPN.';

-- Overdue calibrations
CREATE VIEW v_overdue_calibrations AS
SELECT e.equipment_id, e.equipment_name, e.equipment_type,
       e.calibration_due,
       cr.calibration_date AS last_cal_date,
       cr.calibration_result AS last_result,
       cr.next_due
FROM equipment e
LEFT JOIN LATERAL (
    SELECT calibration_date, calibration_result, next_due
    FROM calibration_records
    WHERE equipment_id = e.equipment_id
    ORDER BY calibration_date DESC
    LIMIT 1
) cr ON TRUE
WHERE e.calibration_due < CURRENT_DATE
  AND e.is_active = TRUE;
COMMENT ON VIEW v_overdue_calibrations IS 'Equipment with overdue calibrations. / Thiet bi qua han hieu chuan.';

-- Open CAPA with aging
CREATE VIEW v_open_capas AS
SELECT c.record_id, c.capa_status, c.target_date, c.completion_date,
       c.root_cause_method, c.verification_result,
       r.dept_code, r.assigned_to, r.created_at,
       CURRENT_DATE - r.created_at::date AS age_days
FROM capa_records c
JOIN records r ON c.record_id = r.record_id
WHERE c.capa_status NOT IN ('Closed Effective', 'Closed Not Effective');
COMMENT ON VIEW v_open_capas IS 'Open CAPAs with aging. / CAPA dang mo voi so ngay.';

-- Job order status summary
CREATE VIEW v_job_status_summary AS
SELECT jo.job_number, jo.job_status, jo.item_id, i.description AS item_desc,
       jo.order_qty, jo.completed_qty, jo.scrapped_qty, jo.pct_complete,
       jo.start_date_planned, jo.end_date_planned,
       jo.customer_id, c.customer_name,
       jo.actual_total_cost, jo.est_total_cost
FROM job_orders jo
LEFT JOIN items i ON jo.item_id = i.item_id
LEFT JOIN customers c ON jo.customer_id = c.customer_id
WHERE jo.job_status NOT IN ('completed', 'closed');
COMMENT ON VIEW v_job_status_summary IS 'Active job order status summary. / Tong hop trang thai lenh san xuat dang hoat dong.';

-- Expiring employee certifications (within 90 days)
CREATE VIEW v_expiring_certifications AS
SELECT ec.employee_id, emp.employee_name, ec.certification_name,
       ec.certification_body, ec.expiry_date,
       ec.expiry_date - CURRENT_DATE AS days_until_expiry
FROM employee_certifications ec
JOIN employees emp ON ec.employee_id = emp.employee_id
WHERE ec.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  AND ec.status = 'active';
COMMENT ON VIEW v_expiring_certifications IS 'Employee certs expiring within 90 days. / Chung chi nhan vien het han trong 90 ngay.';

-- Overdue records
CREATE VIEW v_overdue_records AS
SELECT r.record_id, r.record_type, r.dept_code, r.status,
       r.due_date, CURRENT_DATE - r.due_date AS days_overdue,
       r.assigned_to, u.full_name AS assignee_name
FROM records r
LEFT JOIN users u ON r.assigned_to = u.user_id
WHERE r.due_date < CURRENT_DATE
  AND r.status NOT IN ('closed', 'cancelled');
COMMENT ON VIEW v_overdue_records IS 'Overdue records across all types. / Ho so qua han o tat ca loai.';

-- Vendor scorecard
CREATE VIEW v_vendor_scorecard AS
SELECT v.vendor_id, v.vendor_name, v.vendor_type, v.vendor_status,
       v.vendor_rating_score, v.vendor_rating_grade,
       v.on_time_delivery_pct, v.quality_rejection_pct,
       v.scar_open_count, v.risk_level,
       v.certification_expiry, v.next_audit_due
FROM vendors v
WHERE v.vendor_status != 'disqualified';
COMMENT ON VIEW v_vendor_scorecard IS 'Vendor scorecard for supply chain review. / Bang diem nha cung cap.';


-- ============================================================================
-- SECTION 27: FUNCTIONS
-- Phan 27: Cac ham
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 27.1 generate_record_id() - Auto-generate record IDs like NCR-2026-001
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_record_id(
    p_record_type record_type_enum,
    p_fiscal_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
) RETURNS VARCHAR(50) AS $$
DECLARE
    v_next_number INT;
    v_digits INT;
    v_pattern TEXT;
BEGIN
    -- Get or create counter
    INSERT INTO record_counters (record_type, fiscal_year, last_number, counter_digits)
    VALUES (p_record_type, p_fiscal_year, 0, 3)
    ON CONFLICT (record_type, fiscal_year) DO NOTHING;

    -- Increment and get next number
    UPDATE record_counters
    SET last_number = last_number + 1
    WHERE record_type = p_record_type AND fiscal_year = p_fiscal_year
    RETURNING last_number, counter_digits INTO v_next_number, v_digits;

    -- Format: TYPE-YYYY-NNN
    RETURN p_record_type::TEXT || '-' || p_fiscal_year::TEXT || '-' ||
           lpad(v_next_number::TEXT, v_digits, '0');
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION generate_record_id IS 'Auto-generate record IDs (e.g., NCR-2026-001). / Tu dong tao ma ho so.';

-- ---------------------------------------------------------------------------
-- 27.2 bitemporal_update() - Helper for bitemporal updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bitemporal_update(
    p_table TEXT,
    p_pk_column TEXT,
    p_pk_value TEXT,
    p_new_data JSONB
) RETURNS VOID AS $$
BEGIN
    -- Close current version
    EXECUTE format(
        'UPDATE %I SET valid_to = now() WHERE %I = $1 AND valid_to IS NULL',
        p_table, p_pk_column
    ) USING p_pk_value;

    -- The caller should insert the new version with valid_from = now()
    -- This function only closes the previous version
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION bitemporal_update IS 'Close current bitemporal record before inserting new version. / Dong ban ghi hien tai truoc khi chen phien ban moi.';

-- ---------------------------------------------------------------------------
-- 27.3 calculate_rpn() - Calculate Risk Priority Number
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_rpn(
    p_severity INT,
    p_occurrence INT,
    p_detection INT
) RETURNS INT AS $$
BEGIN
    IF p_severity IS NULL OR p_occurrence IS NULL OR p_detection IS NULL THEN
        RETURN NULL;
    END IF;
    IF p_severity NOT BETWEEN 1 AND 10 OR p_occurrence NOT BETWEEN 1 AND 10 OR p_detection NOT BETWEEN 1 AND 10 THEN
        RAISE EXCEPTION 'S/O/D values must be between 1 and 10';
    END IF;
    RETURN p_severity * p_occurrence * p_detection;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
COMMENT ON FUNCTION calculate_rpn IS 'Calculate RPN = Severity x Occurrence x Detection. / Tinh RPN = Muc do nghiem trong x Tan suat x Kha nang phat hien.';

-- ---------------------------------------------------------------------------
-- 27.4 updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'departments', 'roles', 'users', 'documents', 'records',
        'items', 'work_centers', 'job_orders', 'customers', 'vendors',
        'purchase_orders', 'sales_orders', 'equipment', 'tools',
        'employees', 'audits', 'risk_register', 'improvement_projects',
        'ncr_records', 'capa_records', 'projects', 'subcontract_orders',
        'rma_orders', 'maintenance_work_orders', 'npi_projects', 'shipments'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 27.5 audit_event_logger() - Generic audit event trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_event_logger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, payload, recorded_at)
    VALUES (
        TG_OP,
        TG_TABLE_NAME,
        CASE TG_OP
            WHEN 'DELETE' THEN OLD::TEXT
            ELSE NEW::TEXT
        END,
        CASE TG_OP
            WHEN 'INSERT' THEN to_jsonb(NEW)
            WHEN 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
            WHEN 'DELETE' THEN to_jsonb(OLD)
        END,
        now()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION audit_event_logger IS 'Generic audit trail trigger. / Trigger kiem tra tong quat.';

-- Apply audit triggers to critical tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'records', 'documents', 'ncr_records', 'capa_records',
        'fai_records', 'calibration_records', 'job_orders'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_event_logger()',
            t, t
        );
    END LOOP;
END;
$$;


-- ============================================================================
-- SECTION 28: ROW LEVEL SECURITY (RLS)
-- Phan 28: Bao mat cap dong (RLS)
-- ============================================================================

-- Enable RLS on key tables
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see records from their own department or if they are admin
CREATE POLICY rls_records_dept ON records
    USING (
        dept_code = current_setting('app.current_dept', true)::dept_code
        OR current_setting('app.is_admin', true) = 'true'
    );

CREATE POLICY rls_documents_dept ON documents
    USING (
        dept_code = current_setting('app.current_dept', true)::dept_code
        OR current_setting('app.is_admin', true) = 'true'
        OR status = 'approved'  -- approved documents are visible to all
    );

CREATE POLICY rls_form_entries_dept ON form_entries
    USING (
        submitted_by = current_setting('app.current_user_id', true)::UUID
        OR current_setting('app.is_admin', true) = 'true'
    );

-- NCR/CAPA visible to QA, the owning dept, and admins
CREATE POLICY rls_ncr_dept ON ncr_records
    USING (
        EXISTS (
            SELECT 1 FROM records r
            WHERE r.record_id = ncr_records.record_id
            AND (
                r.dept_code = current_setting('app.current_dept', true)::dept_code
                OR current_setting('app.current_dept', true) = 'QA'
                OR current_setting('app.is_admin', true) = 'true'
            )
        )
    );

CREATE POLICY rls_capa_dept ON capa_records
    USING (
        EXISTS (
            SELECT 1 FROM records r
            WHERE r.record_id = capa_records.record_id
            AND (
                r.dept_code = current_setting('app.current_dept', true)::dept_code
                OR current_setting('app.current_dept', true) = 'QA'
                OR current_setting('app.is_admin', true) = 'true'
            )
        )
    );

-- Job orders visible to production, engineering, QA, and admins
CREATE POLICY rls_job_orders_dept ON job_orders
    USING (
        current_setting('app.current_dept', true) IN ('PRO', 'ENG', 'QA', 'SCM')
        OR current_setting('app.is_admin', true) = 'true'
    );


-- ============================================================================
-- SECTION 29: SEED DATA
-- Phan 29: Du lieu khoi tao
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 29.1 Departments
-- ---------------------------------------------------------------------------
INSERT INTO departments (dept_code, label, label_vi, icon, color, record_types, form_series) VALUES
    ('QA',  'Quality Assurance',         'Đảm bảo Chất lượng',      '🔍', '#dc2626', ARRAY['NCR','CAPA','FAI','SCAR','AUD','CAL'], ARRAY[600,900]),
    ('PRO', 'Production',                'Sản xuất',                 '🏭', '#059669', ARRAY['NCR','IMP','DOWNTIME'],                 ARRAY[500]),
    ('ENG', 'Engineering',               'Kỹ thuật',                 '⚙️', '#0369a1', ARRAY['ECR','FAI'],                            ARRAY[300]),
    ('SCM', 'Supply Chain',              'Chuỗi cung ứng',          '📦', '#84cc16', ARRAY['SCAR','PO-EXCEPTION'],                  ARRAY[400]),
    ('HR',  'HR & Training',             'Nhân sự & Đào tạo',       '👥', '#8b5cf6', ARRAY['TRN'],                                  ARRAY[800]),
    ('EXE', 'Executive / Management',    'Ban Giám đốc',             '👔', '#7c3aed', ARRAY['MR','RISK','IMP'],                      ARRAY[100]),
    ('SAL', 'Sales',                     'Kinh doanh',               '💼', '#f59e0b', ARRAY[]::TEXT[],                               ARRAY[200]),
    ('WH',  'Warehouse / Logistics',     'Kho vận',                  '📦', '#d97706', ARRAY[]::TEXT[],                               ARRAY[700]),
    ('IT',  'IT / Digital',              'Công nghệ thông tin',      '💻', '#6366f1', ARRAY[]::TEXT[],                               ARRAY[100]),
    ('EHS', 'EHS / Safety',             'An toàn & Môi trường',     '⚠️', '#ea580c', ARRAY[]::TEXT[],                               ARRAY[800]);

-- ---------------------------------------------------------------------------
-- 29.2 Core Roles
-- ---------------------------------------------------------------------------
INSERT INTO roles (role_code, role_label, role_label_vi, dept_code, permissions) VALUES
    ('ceo',                         'Chief Executive Officer',              'Tổng Giám đốc',               'EXE', '{"admin": true, "all_depts": true}'),
    ('production_director',         'Production Director',                  'Giám đốc Sản xuất',           'PRO', '{"admin": false, "depts": ["PRO","ENG"]}'),
    ('cnc_workshop_manager',        'CNC Workshop Manager',                 'Quản đốc xưởng CNC',          'PRO', '{"depts": ["PRO"]}'),
    ('shift_leader',                'Shift Leader',                         'Trưởng ca',                    'PRO', '{"depts": ["PRO"]}'),
    ('setup_technician',            'Setup Technician',                     'Kỹ thuật viên Setup',          'PRO', '{"depts": ["PRO"]}'),
    ('cnc_operator',                'CNC Operator',                         'Vận hành máy CNC',             'PRO', '{"depts": ["PRO"]}'),
    ('deburr_team_lead',            'Deburr Team Lead',                     'Trưởng nhóm mài bavia',       'PRO', '{"depts": ["PRO"]}'),
    ('deburr_technician',           'Deburr Technician',                    'Kỹ thuật viên mài bavia',     'PRO', '{"depts": ["PRO"]}'),
    ('production_planner',          'Production Planner',                   'Kế hoạch sản xuất',           'PRO', '{"depts": ["PRO"]}'),
    ('cleaning_packaging_supervisor','Cleaning & Packaging Supervisor',     'Giám sát Vệ sinh & Đóng gói', 'PRO', '{"depts": ["PRO"]}'),
    ('cleaning_packaging_technician','Cleaning & Packaging Technician',     'KTV Vệ sinh & Đóng gói',      'PRO', '{"depts": ["PRO"]}'),
    ('maintenance_technician',      'Maintenance Technician',               'Kỹ thuật viên Bảo trì',       'PRO', '{"depts": ["PRO"]}'),
    ('production_engineer',         'Production Engineer',                  'Kỹ sư Sản xuất',              'PRO', '{"depts": ["PRO","ENG"]}'),
    ('engineering_lead',            'Engineering Lead / Manager',           'Trưởng phòng Kỹ thuật',       'ENG', '{"depts": ["ENG"]}'),
    ('process_engineer',            'Process Engineer',                     'Kỹ sư Quy trình',             'ENG', '{"depts": ["ENG"]}'),
    ('dfm_engineer',                'DFM Engineer',                         'Kỹ sư DFM',                   'ENG', '{"depts": ["ENG"]}'),
    ('cam_nc_programmer',           'CAM/NC Programmer',                    'Lập trình CAM/NC',            'ENG', '{"depts": ["ENG"]}'),
    ('qa_manager',                  'QA Manager',                           'Quản lý QA',                  'QA',  '{"depts": ["QA"], "can_approve": true}'),
    ('quality_engineer',            'Quality Engineer',                     'Kỹ sư Chất lượng',            'QA',  '{"depts": ["QA"]}'),
    ('qc_inspector',                'QC Inspector / CMM Operator',          'KCS / Vận hành CMM',          'QA',  '{"depts": ["QA"]}'),
    ('qc_inspector_lead',           'QC Inspector Lead',                    'Trưởng nhóm KCS',             'QA',  '{"depts": ["QA"]}'),
    ('qms_engineer',                'QMS Engineer',                         'Kỹ sư QMS',                   'QA',  '{"depts": ["QA"], "can_approve": true}'),
    ('internal_auditor',            'Internal Auditor',                     'Kiểm toán viên nội bộ',       'QA',  '{"depts": ["QA"]}'),
    ('metrology_specialist',        'Metrology & Calibration Specialist',   'Chuyên viên đo lường',        'QA',  '{"depts": ["QA"]}'),
    ('supply_chain_manager',        'Supply Chain Manager',                 'Quản lý Chuỗi cung ứng',     'SCM', '{"depts": ["SCM"]}'),
    ('buyer',                       'Buyer / Purchasing',                   'Nhân viên Mua hàng',          'SCM', '{"depts": ["SCM"]}'),
    ('warehouse_clerk',             'Warehouse Clerk',                      'Thủ kho',                     'WH',  '{"depts": ["WH"]}'),
    ('tool_storekeeper',            'Tool Crib / Storekeeper',              'Thủ kho Dụng cụ',             'SCM', '{"depts": ["SCM"]}'),
    ('logistics_coordinator',       'Logistics / Shipping Coordinator',     'Điều phối Logistics',         'WH',  '{"depts": ["WH"]}'),
    ('estimator',                   'Estimator',                            'Nhân viên Báo giá',           'SAL', '{"depts": ["SAL"]}'),
    ('customer_service',            'Customer Service',                     'Chăm sóc Khách hàng',         'SAL', '{"depts": ["SAL"]}'),
    ('finance_manager',             'Finance Manager',                      'Quản lý Tài chính',           'EXE', '{"depts": ["EXE"]}'),
    ('ap_ar_accountant',            'AP/AR & Payments Accountant',          'Kế toán Công nợ',             'EXE', '{"depts": ["EXE"]}'),
    ('gl_payroll_accountant',       'GL & Payroll Accountant',              'Kế toán Tổng hợp & Lương',   'EXE', '{"depts": ["EXE"]}'),
    ('hr_manager',                  'HR Manager',                           'Quản lý Nhân sự',             'HR',  '{"depts": ["HR"]}'),
    ('ehs_specialist',              'EHS Specialist',                       'Chuyên viên EHS',             'EHS', '{"depts": ["EHS"]}'),
    ('it_admin',                    'IT Administrator',                     'Quản trị CNTT',               'IT',  '{"depts": ["IT"], "admin": true}'),
    ('epicor_admin',                'Epicor System Administrator',          'Quản trị hệ thống Epicor',   'IT',  '{"depts": ["IT"], "admin": true}');

-- ---------------------------------------------------------------------------
-- 29.3 Naming patterns (P1-P6)
-- ---------------------------------------------------------------------------
INSERT INTO naming_patterns (pattern_name, description, template, example, scope) VALUES
    ('P1', 'Document ID pattern',
     '{PREFIX}-{NNN}', 'SOP-606', 'QMS controlled documents'),
    ('P2', 'Evidence/record file naming',
     '{JOB}-{PART}_R{REV}_{EvidenceCode}_{Date}_{Seq}.{ext}',
     'JO-10234-PN-ABC123_RA_MTR_20260328_001.pdf', 'Job dossier evidence files'),
    ('P3', 'Record ID pattern',
     '{TYPE}-{YYYY}-{NNN}', 'NCR-2026-043', 'Record identification'),
    ('P4', 'CAM/NC program naming',
     '{PartNo}_R{Rev}_OP{Seq}_{MachineFamily}_{BaselineVer}.{ext}',
     'ABC123_RA_OP10_5AX_V1.0.nc', 'Engineering baseline files'),
    ('P5', 'Asset label pattern',
     '{AssetType}-{NNN}', 'GAGE-042', 'Equipment and asset labels'),
    ('P6', 'Support document naming',
     '{AssetID}_{DocType}_{Date}.{ext}',
     'MACH-DMG-80_CAL-CERT_20260315.pdf', 'Asset support documents');

-- ---------------------------------------------------------------------------
-- 29.4 Initial KPI definitions
-- ---------------------------------------------------------------------------
INSERT INTO kpi_definitions (metric_code, kpi_name, kpi_name_vi, unit, target, frequency) VALUES
    ('OTD',   'On-Time Delivery Rate',        'Ty le giao hang dung han',      '%', 98.0, 'monthly'),
    ('FPY',   'First Pass Yield',              'Ty le dat lan dau',             '%', 95.0, 'weekly'),
    ('OEE',   'Overall Equipment Effectiveness','Hieu suat thiet bi tong the',  '%', 85.0, 'daily'),
    ('DPMO',  'Defects Per Million Opportunities','Loi tren trieu co hoi',      'ppm', 500, 'monthly'),
    ('CAPA-CLOSE', 'CAPA Closure Rate',        'Ty le dong CAPA',              '%', 90.0, 'monthly'),
    ('CAL-COMP',   'Calibration Compliance',   'Ty le tuan thu hieu chuan',    '%', 100.0, 'monthly'),
    ('SCRAP',      'Scrap Rate',               'Ty le phe pham',               '%', 2.0,  'weekly'),
    ('CCR',        'Customer Complaint Rate',   'Ty le khieu nai khach hang',   'ppm', 100, 'monthly'),
    ('SQI',        'Supplier Quality Index',    'Chi so chat luong NCC',        '%', 95.0, 'quarterly'),
    ('TRN-COMP',   'Training Completion Rate',  'Ty le hoan thanh dao tao',     '%', 100.0, 'quarterly');

-- ---------------------------------------------------------------------------
-- 29.5 Initial record counters for current year
-- ---------------------------------------------------------------------------
INSERT INTO record_counters (record_type, fiscal_year, last_number, counter_digits) VALUES
    ('NCR', 2026, 0, 3),
    ('CAPA', 2026, 0, 3),
    ('FAI', 2026, 0, 3),
    ('TRN', 2026, 0, 3),
    ('AUD', 2026, 0, 3),
    ('ECR', 2026, 0, 3),
    ('CAL', 2026, 0, 3),
    ('SCAR', 2026, 0, 3),
    ('IMP', 2026, 0, 3),
    ('MR', 2026, 0, 2),
    ('RISK', 2026, 0, 2),
    ('DOWNTIME', 2026, 0, 3),
    ('PO-EXCEPTION', 2026, 0, 3);


-- ============================================================================
-- SECTION 30: ADDITIONAL INDEXES (GIN for JSONB, text search)
-- Phan 30: Chi muc bo sung
-- ============================================================================

-- Full-text search on document titles
CREATE INDEX idx_doc_title_trgm ON documents USING GIN (title gin_trgm_ops);
CREATE INDEX idx_doc_title_vi_trgm ON documents USING GIN (title_vi gin_trgm_ops);

-- Full-text search on item descriptions
CREATE INDEX idx_item_desc_trgm ON items USING GIN (description gin_trgm_ops);

-- JSONB path indexes for common queries
CREATE INDEX idx_records_data_job ON records USING GIN ((data -> 'job_number'));
CREATE INDEX idx_records_data_part ON records USING GIN ((data -> 'part_number'));

-- Composite indexes for dashboard queries
CREATE INDEX idx_jo_status_dates ON job_orders (job_status, end_date_planned, customer_id);
CREATE INDEX idx_so_status_dates ON sales_orders (so_status, promise_date, customer_id);


-- ═══════════════════════════════════════════════════════
-- SECTION 20A: MES GAP — ALTER EXISTING TABLES
-- Add missing MES columns to existing QMS tables
-- ═══════════════════════════════════════════════════════

-- ---------------------------------------------------------------------------
-- 20A.1 equipment — MES real-time & connectivity columns
-- ---------------------------------------------------------------------------
ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS machine_state equipment_state_enum DEFAULT 'non_scheduled',
    ADD COLUMN IF NOT EXISTS current_spindle_rpm NUMERIC(8,1),
    ADD COLUMN IF NOT EXISTS spindle_load_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS feed_override_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS current_program_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS current_tool_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS part_count_shift INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS heartbeat_sla_seconds INT DEFAULT 300,
    ADD COLUMN IF NOT EXISTS mtconnect_agent_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS opc_ua_endpoint VARCHAR(500),
    ADD COLUMN IF NOT EXISTS mqtt_topic VARCHAR(200),
    ADD COLUMN IF NOT EXISTS connector_type VARCHAR(30) DEFAULT 'manual_bridge',
    ADD COLUMN IF NOT EXISTS spindle_max_rpm NUMERIC(8,1),
    ADD COLUMN IF NOT EXISTS spindle_power_kw NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS spindle_taper VARCHAR(20),
    ADD COLUMN IF NOT EXISTS atc_capacity INT,
    ADD COLUMN IF NOT EXISTS probe_system_installed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS work_envelope_x_mm NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS work_envelope_y_mm NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS work_envelope_z_mm NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS positioning_accuracy_microns NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS repeatability_microns NUMERIC(6,2);

-- ---------------------------------------------------------------------------
-- 20A.2 job_operations — MES cycle/production tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE job_operations
    ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cycle_time_seconds INT,
    ADD COLUMN IF NOT EXISTS part_count_expected INT,
    ADD COLUMN IF NOT EXISTS part_count_actual INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS part_count_scrap INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS downtime_total_seconds INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tool_id_used VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tool_life_at_start NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS program_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS program_revision VARCHAR(20),
    ADD COLUMN IF NOT EXISTS setup_verified_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS setup_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS first_piece_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS first_piece_verified_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS first_piece_verified_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 20A.3 labor_transactions — MES operator session columns
-- ---------------------------------------------------------------------------
ALTER TABLE labor_transactions
    ADD COLUMN IF NOT EXISTS login_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS logout_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS machine_id_assigned VARCHAR(50),
    ADD COLUMN IF NOT EXISTS downtime_reason_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS idle_seconds INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tool_change_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS program_change_count INT DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 20A.4 production_schedule — MES scheduling columns
-- ---------------------------------------------------------------------------
ALTER TABLE production_schedule
    ADD COLUMN IF NOT EXISTS actual_setup_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_setup_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_run_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_run_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS schedule_adherence_pct NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS changeover_time_planned NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS changeover_time_actual NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS material_wait_minutes INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS machine_conflict_flag BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS dispatch_priority INT DEFAULT 50;

-- ---------------------------------------------------------------------------
-- 20A.5 tools — MES real-time tool tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS current_machine_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS current_spindle_position INT,
    ADD COLUMN IF NOT EXISTS last_mounted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tool_usage_minutes_total INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tool_usage_parts_total INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS edge_count INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS current_edge_index INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS vibration_signature JSONB,
    ADD COLUMN IF NOT EXISTS tool_preset_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tool_life_tracking_method VARCHAR(30) DEFAULT 'parts_count',
    ADD COLUMN IF NOT EXISTS tool_life_alert_threshold_pct NUMERIC(5,2) DEFAULT 80.0;

-- ---------------------------------------------------------------------------
-- 20A.6 maintenance_work_orders — MES PM tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE maintenance_work_orders
    ADD COLUMN IF NOT EXISTS equipment_run_hours_at_creation NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS pm_trigger_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS pm_trigger_value NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS next_pm_due_date DATE,
    ADD COLUMN IF NOT EXISTS next_pm_due_hours NUMERIC(10,2);


-- ═══════════════════════════════════════════════════════
-- SECTION 20: MES — Manufacturing Execution System
-- ISA-95 / SEMI E10 / MTConnect / TimescaleDB
-- ═══════════════════════════════════════════════════════

-- ============================================================================
-- SECTION MES-0: ADDITIONAL ENUM TYPES FOR MES
-- Phan MES-0: Cac kieu ENUM bo sung cho MES
-- ============================================================================

-- SEMI E10 Equipment States / Trang thai thiet bi theo SEMI E10
CREATE TYPE semi_e10_state AS ENUM (
    'PRODUCTIVE',           -- Dang san xuat
    'STANDBY',              -- San sang cho
    'ENGINEERING',          -- Ky thuat/thu nghiem
    'SCHEDULED_DOWN',       -- Ngung theo ke hoach
    'UNSCHEDULED_DOWN',     -- Ngung ngoai ke hoach
    'NON_SCHEDULED'         -- Ngoai lich trinh
);

-- SEMI E10 Sub-States for Productive / Trang thai phu khi san xuat
CREATE TYPE productive_substate AS ENUM (
    'REGULAR_PRODUCTION',   -- San xuat binh thuong
    'REWORK',               -- Lam lai
    'ENGINEERING_RUN',      -- Chay thu ky thuat
    'WORK_FOR_OTHERS'       -- Lam cho don vi khac
);

-- SEMI E10 Sub-States for Standby / Trang thai phu khi san sang
CREATE TYPE standby_substate AS ENUM (
    'NO_OPERATOR',          -- Khong co nguoi van hanh
    'NO_MATERIAL',          -- Khong co vat lieu
    'NO_TOOLING',           -- Khong co dao cu
    'NO_PROGRAM',           -- Khong co chuong trinh
    'QUALITY_HOLD',         -- Giu cho chat luong
    'CHANGEOVER',           -- Chuyen doi
    'WAITING_APPROVAL'      -- Cho phe duyet
);

-- SEMI E10 Sub-States for Unscheduled Down / Trang thai phu khi ngung ngoai ke hoach
CREATE TYPE unsched_down_substate AS ENUM (
    'MECHANICAL_FAILURE',   -- Hong co khi
    'ELECTRICAL_FAILURE',   -- Hong dien
    'SOFTWARE_FAILURE',     -- Loi phan mem
    'TOOLING_FAILURE',      -- Hong dao cu
    'COOLANT_ISSUE',        -- Van de nuoc lam mat
    'AIR_PRESSURE',         -- Ap suat khi
    'SPINDLE_ALARM',        -- Bao dong truc chinh
    'AXIS_ALARM',           -- Bao dong truc
    'OTHER_FAILURE'         -- Hong khac
);

-- Machine execution mode / Che do thuc thi may
CREATE TYPE machine_exec_mode AS ENUM (
    'AUTOMATIC',            -- Tu dong
    'MANUAL',               -- Thu cong
    'MDI',                  -- Manual Data Input
    'JOG',                  -- Di chuyen tung buoc
    'REFERENCE',            -- Tham chieu/home
    'EDIT'                  -- Chinh sua
);

-- MES event severity / Muc nghiem trong su kien MES
CREATE TYPE mes_event_severity AS ENUM ('INFO', 'WARNING', 'ALARM', 'CRITICAL', 'EMERGENCY');

-- Cycle phase / Giai doan chu ky
CREATE TYPE cycle_phase AS ENUM (
    'SETUP',                -- Cai dat
    'FIRST_PIECE',          -- San pham dau tien
    'PRODUCTION_RUN',       -- Chay san xuat
    'LAST_PIECE',           -- San pham cuoi
    'TEARDOWN'              -- Thao go
);

-- OEE loss category (TPM six big losses) / Danh muc ton that OEE
CREATE TYPE oee_loss_category AS ENUM (
    'EQUIPMENT_FAILURE',        -- Hong thiet bi
    'SETUP_ADJUSTMENT',         -- Cai dat va dieu chinh
    'IDLING_MINOR_STOPS',       -- Ngung ngan va cho
    'REDUCED_SPEED',            -- Giam toc do
    'PROCESS_DEFECTS',          -- Loi quy trinh
    'REDUCED_YIELD'             -- Hieu suat giam
);

-- Material consumption type / Loai tieu thu vat lieu
CREATE TYPE material_consumption_type AS ENUM (
    'ISSUED',           -- Xuat kho
    'CONSUMED',         -- Tieu thu
    'RETURNED',         -- Tra lai
    'SCRAPPED',         -- Phe pham
    'ADJUSTED'          -- Dieu chinh
);

-- Dispatch priority / Muc uu tien dieu do
CREATE TYPE dispatch_priority_enum AS ENUM (
    'AOG',              -- Aircraft On Ground (khong tau bay nam dat)
    'HOT',              -- Nong
    'RUSH',             -- Gap
    'STANDARD',         -- Tieu chuan
    'LOW'               -- Thap
);


-- ============================================================================
-- SECTION MES-1: ISA-95 EQUIPMENT HIERARCHY
-- Phan MES-1: Phan cap Thiet bi theo ISA-95
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-1.1 mes_sites / Nha may (ISA-95 Level 2)
-- ---------------------------------------------------------------------------
CREATE TABLE mes_sites (
    site_id             VARCHAR(30)     PRIMARY KEY,
    site_name           VARCHAR(200)    NOT NULL,
    site_name_vi        VARCHAR(200),
    site_address        TEXT,
    timezone            VARCHAR(50)     NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    gps_lat             NUMERIC(10,7),
    gps_lon             NUMERIC(10,7),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_sites IS 'ISA-95 Site level. Single site for HESEM initially. / Cap Nha may ISA-95.';

-- ---------------------------------------------------------------------------
-- MES-1.2 mes_areas / Khu vuc san xuat (ISA-95 Level 3)
-- ---------------------------------------------------------------------------
CREATE TABLE mes_areas (
    area_id             VARCHAR(30)     PRIMARY KEY,
    area_name           VARCHAR(200)    NOT NULL,
    area_name_vi        VARCHAR(200),
    site_id             VARCHAR(30)     NOT NULL REFERENCES mes_sites(site_id),
    area_type           VARCHAR(50),
    floor_plan_path     TEXT,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_areas IS 'ISA-95 Area level. Production areas within a site. / Cap Khu vuc ISA-95.';

-- ---------------------------------------------------------------------------
-- MES-1.3 mes_equipment_extended / Mo rong thiet bi
-- ---------------------------------------------------------------------------
CREATE TABLE mes_equipment_extended (
    equipment_id        VARCHAR(50)     PRIMARY KEY REFERENCES equipment(equipment_id),
    area_id             VARCHAR(30)     REFERENCES mes_areas(area_id),
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    machine_ip_address  INET,
    mtconnect_agent_url TEXT,
    opc_ua_endpoint     TEXT,
    fanuc_focas_port    INT,
    controller_type     VARCHAR(100),
    controller_version  VARCHAR(50),
    num_axes            INT,
    max_spindle_speed   INT,
    max_feed_rate       NUMERIC(10,2),
    spindle_power_kw    NUMERIC(8,2),
    table_size_x_mm     NUMERIC(10,2),
    table_size_y_mm     NUMERIC(10,2),
    max_part_weight_kg  NUMERIC(10,2),
    tool_magazine_capacity INT,
    pallet_count        INT             DEFAULT 1,
    coolant_type        VARCHAR(50),
    cad_model_path      TEXT,
    plc_tag_map         JSONB,
    current_e10_state   semi_e10_state  DEFAULT 'NON_SCHEDULED',
    current_program     VARCHAR(200),
    current_job_number  VARCHAR(50),
    current_operator_id VARCHAR(20),
    last_heartbeat_at   TIMESTAMPTZ,
    oee_current_shift   NUMERIC(5,2),
    oee_today           NUMERIC(5,2),
    oee_wtd             NUMERIC(5,2),
    oee_mtd             NUMERIC(5,2),
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_equipment_extended IS 'MES extension of equipment master. 1:1 with equipment table. / Mo rong MES cua bang equipment.';
CREATE INDEX idx_meseq_area ON mes_equipment_extended (area_id);
CREATE INDEX idx_meseq_wc ON mes_equipment_extended (work_center_id);
CREATE INDEX idx_meseq_state ON mes_equipment_extended (current_e10_state);
CREATE INDEX idx_meseq_heartbeat ON mes_equipment_extended (last_heartbeat_at);


-- ============================================================================
-- SECTION MES-2: MACHINE DATA COLLECTION (IoT / MTConnect / OPC-UA)
-- Phan MES-2: Thu thap Du lieu May (IoT / MTConnect / OPC-UA)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-2.1 mes_machine_state_events / Su kien trang thai may
-- ---------------------------------------------------------------------------
CREATE TABLE mes_machine_state_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    e10_state           semi_e10_state  NOT NULL,
    productive_sub      productive_substate,
    standby_sub         standby_substate,
    unsched_down_sub    unsched_down_substate,
    exec_mode           machine_exec_mode,
    reason_code         VARCHAR(50),
    reason_text         VARCHAR(500),
    operator_id         VARCHAR(20),
    job_number          VARCHAR(50),
    program_name        VARCHAR(200),
    shift_code          VARCHAR(5),
    duration_seconds    NUMERIC(12,2),
    source              VARCHAR(30)     DEFAULT 'MTConnect',
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
-- SELECT create_hypertable('mes_machine_state_events', 'event_time',
--     chunk_time_interval => INTERVAL '1 day');
COMMENT ON TABLE mes_machine_state_events IS 'SEMI E10 state transitions. TimescaleDB hypertable. / Chuyen doi trang thai SEMI E10.';
CREATE INDEX idx_mse_equip_time ON mes_machine_state_events (equipment_id, event_time DESC);
CREATE INDEX idx_mse_state ON mes_machine_state_events (e10_state, event_time DESC);
CREATE INDEX idx_mse_job ON mes_machine_state_events (job_number, event_time DESC)
    WHERE job_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-2.2 mes_machine_telemetry / Du lieu cam bien may
-- ---------------------------------------------------------------------------
CREATE TABLE mes_machine_telemetry (
    ts                  TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    spindle_speed_rpm   NUMERIC(10,2),
    spindle_speed_cmd   NUMERIC(10,2),
    spindle_load_pct    NUMERIC(6,2),
    spindle_torque_nm   NUMERIC(10,2),
    spindle_power_kw    NUMERIC(8,2),
    spindle_temp_c      NUMERIC(6,2),
    feed_rate_actual    NUMERIC(10,2),
    feed_rate_cmd       NUMERIC(10,2),
    feed_override_pct   NUMERIC(6,2),
    rapid_override_pct  NUMERIC(6,2),
    axis_x_pos          NUMERIC(12,6),
    axis_y_pos          NUMERIC(12,6),
    axis_z_pos          NUMERIC(12,6),
    axis_a_pos          NUMERIC(10,4),
    axis_c_pos          NUMERIC(10,4),
    axis_x_load_pct     NUMERIC(6,2),
    axis_y_load_pct     NUMERIC(6,2),
    axis_z_load_pct     NUMERIC(6,2),
    coolant_pressure_bar NUMERIC(8,2),
    coolant_flow_lpm    NUMERIC(8,2),
    coolant_temp_c      NUMERIC(6,2),
    coolant_concentration_pct NUMERIC(5,2),
    ambient_temp_c      NUMERIC(6,2),
    machine_temp_c      NUMERIC(6,2),
    vibration_mm_s      NUMERIC(8,4),
    program_name        VARCHAR(200),
    program_block       VARCHAR(50),
    tool_number         INT,
    parts_count_shift   INT,
    cycle_time_last_sec NUMERIC(10,2),
    total_power_kw      NUMERIC(8,2)
);
-- SELECT create_hypertable('mes_machine_telemetry', 'ts',
--     chunk_time_interval => INTERVAL '1 day');
COMMENT ON TABLE mes_machine_telemetry IS 'High-frequency machine sensor data. TimescaleDB hypertable. / Du lieu cam bien may tan so cao.';
CREATE INDEX idx_mtel_equip_ts ON mes_machine_telemetry (equipment_id, ts DESC);

-- ---------------------------------------------------------------------------
-- MES-2.5 mes_machine_alarms / Canh bao may
-- ---------------------------------------------------------------------------
CREATE TABLE mes_machine_alarms (
    alarm_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    alarm_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    alarm_code          VARCHAR(50)     NOT NULL,
    alarm_text          VARCHAR(500),
    alarm_severity      mes_event_severity NOT NULL DEFAULT 'ALARM',
    alarm_group         VARCHAR(50),
    axis_name           VARCHAR(10),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    is_acknowledged     BOOLEAN         NOT NULL DEFAULT FALSE,
    acknowledged_by     VARCHAR(20),
    acknowledged_at     TIMESTAMPTZ,
    escalation_status   VARCHAR(20),
    escalated_by        VARCHAR(20),
    escalated_at        TIMESTAMPTZ,
    cleared_at          TIMESTAMPTZ,
    cleared_by          VARCHAR(20),
    duration_seconds    NUMERIC(10,2),
    caused_downtime     BOOLEAN         DEFAULT FALSE,
    job_number          VARCHAR(50),
    related_job_number  VARCHAR(50),
    program_name        VARCHAR(200),
    operator_id         VARCHAR(20),
    source              VARCHAR(30)     DEFAULT 'MTConnect',
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (alarm_id, alarm_time)
);
-- SELECT create_hypertable('mes_machine_alarms', 'alarm_time',
--     chunk_time_interval => INTERVAL '7 days');
COMMENT ON TABLE mes_machine_alarms IS 'Machine alarm/fault events. TimescaleDB hypertable. / Su kien canh bao/loi may.';
CREATE INDEX idx_malm_equip ON mes_machine_alarms (equipment_id, alarm_time DESC);
CREATE INDEX idx_malm_code ON mes_machine_alarms (alarm_code, alarm_time DESC);
CREATE INDEX idx_malm_active ON mes_machine_alarms (equipment_id)
    WHERE is_active = TRUE;
CREATE INDEX idx_malm_ack ON mes_machine_alarms (equipment_id, acknowledged_at DESC);
CREATE INDEX idx_malm_job ON mes_machine_alarms (related_job_number, alarm_time DESC)
    WHERE related_job_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-2.6 mes_program_events / Su kien chuong trinh NC
-- ---------------------------------------------------------------------------
CREATE TABLE mes_program_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    event_type          VARCHAR(30)     NOT NULL,
    program_name        VARCHAR(200),
    program_comment     VARCHAR(500),
    tool_number_from    INT,
    tool_number_to      INT,
    block_number        VARCHAR(50),
    job_number          VARCHAR(50),
    part_count_at_event INT,
    operator_id         VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
-- SELECT create_hypertable('mes_program_events', 'event_time',
--     chunk_time_interval => INTERVAL '7 days');
COMMENT ON TABLE mes_program_events IS 'NC program execution events. TimescaleDB hypertable. / Su kien thuc thi chuong trinh NC.';
CREATE INDEX idx_mpev_equip ON mes_program_events (equipment_id, event_time DESC);
CREATE INDEX idx_mpev_type ON mes_program_events (event_type, event_time DESC);


-- ============================================================================
-- SECTION MES-3: PRODUCTION EXECUTION
-- Phan MES-3: Thuc thi San xuat
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-3.1 mes_job_execution / Thuc thi lenh san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE mes_job_execution (
    job_exec_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL UNIQUE,
    first_setup_start   TIMESTAMPTZ,
    first_piece_complete TIMESTAMPTZ,
    last_piece_complete TIMESTAMPTZ,
    job_closed_at       TIMESTAMPTZ,
    total_good_qty      NUMERIC(12,2)   DEFAULT 0,
    total_scrap_qty     NUMERIC(12,2)   DEFAULT 0,
    total_rework_qty    NUMERIC(12,2)   DEFAULT 0,
    total_setup_time_sec NUMERIC(12,2)  DEFAULT 0,
    total_run_time_sec  NUMERIC(12,2)   DEFAULT 0,
    total_idle_time_sec NUMERIC(12,2)   DEFAULT 0,
    total_down_time_sec NUMERIC(12,2)   DEFAULT 0,
    avg_cycle_time_sec  NUMERIC(10,2),
    target_cycle_time_sec NUMERIC(10,2),
    cycle_time_std_dev  NUMERIC(10,4),
    current_operation_seq INT,
    current_equipment_id VARCHAR(50),
    is_on_hold          BOOLEAN         DEFAULT FALSE,
    hold_reason         TEXT,
    material_lots_used  TEXT[],
    operator_ids        TEXT[],
    machines_used       TEXT[],
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_job_execution IS 'Real-time job execution overlay. / Lop thuc thi lenh san xuat thoi gian thuc.';
CREATE INDEX idx_mjexec_active ON mes_job_execution (job_number)
    WHERE job_closed_at IS NULL;

-- ---------------------------------------------------------------------------
-- MES-3.2 mes_operation_execution / Thuc thi cong doan
-- ---------------------------------------------------------------------------
CREATE TABLE mes_operation_execution (
    op_exec_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    queue_entry_at      TIMESTAMPTZ,
    setup_start_at      TIMESTAMPTZ,
    setup_end_at        TIMESTAMPTZ,
    run_start_at        TIMESTAMPTZ,
    first_piece_at      TIMESTAMPTZ,
    last_piece_at       TIMESTAMPTZ,
    teardown_start_at   TIMESTAMPTZ,
    teardown_end_at     TIMESTAMPTZ,
    qty_started         NUMERIC(12,2)   DEFAULT 0,
    qty_good            NUMERIC(12,2)   DEFAULT 0,
    qty_scrap           NUMERIC(12,2)   DEFAULT 0,
    qty_rework          NUMERIC(12,2)   DEFAULT 0,
    setup_time_actual   NUMERIC(10,2),
    run_time_actual     NUMERIC(10,2),
    teardown_time_actual NUMERIC(10,2),
    idle_time_total     NUMERIC(10,2),
    down_time_total     NUMERIC(10,2),
    avg_cycle_time_sec  NUMERIC(10,2),
    min_cycle_time_sec  NUMERIC(10,2),
    max_cycle_time_sec  NUMERIC(10,2),
    std_cycle_time_sec  NUMERIC(10,4),
    target_cycle_time_sec NUMERIC(10,2),
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    operator_id         VARCHAR(20),
    program_name        VARCHAR(200),
    program_revision    VARCHAR(20),
    phase               cycle_phase     DEFAULT 'SETUP',
    is_complete         BOOLEAN         DEFAULT FALSE,
    scrap_reason_codes  JSONB           DEFAULT '[]',
    rework_reason_codes JSONB           DEFAULT '[]',
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (job_number, operation_seq, equipment_id)
);
COMMENT ON TABLE mes_operation_execution IS 'Real-time operation execution with cycle times and OEE. / Thuc thi cong doan thoi gian thuc.';
CREATE INDEX idx_mopexec_job ON mes_operation_execution (job_number, operation_seq);
CREATE INDEX idx_mopexec_equip ON mes_operation_execution (equipment_id)
    WHERE is_complete = FALSE;
CREATE INDEX idx_mopexec_active ON mes_operation_execution (equipment_id, updated_at DESC)
    WHERE is_complete = FALSE;

-- ---------------------------------------------------------------------------
-- MES-3.3 mes_cycle_events / Su kien chu ky san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE mes_cycle_events (
    cycle_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    cycle_end_time      TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    part_sequence       INT,
    serial_number       VARCHAR(100),
    lot_number          VARCHAR(100),
    cycle_start_time    TIMESTAMPTZ     NOT NULL,
    cycle_time_sec      NUMERIC(10,2)   NOT NULL,
    chip_to_chip_sec    NUMERIC(10,2),
    program_name        VARCHAR(200),
    tool_list_used      INT[],
    operator_id         VARCHAR(20),
    pass_fail           VARCHAR(4)      CHECK (pass_fail IN ('PASS', 'FAIL', 'HOLD')),
    scrap_reason_code   VARCHAR(50),
    rework_reason_code  VARCHAR(50),
    material_lot_number VARCHAR(100),
    material_heat_number VARCHAR(100),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (cycle_id, cycle_end_time)
);
-- SELECT create_hypertable('mes_cycle_events', 'cycle_end_time',
--     chunk_time_interval => INTERVAL '7 days');
COMMENT ON TABLE mes_cycle_events IS 'Per-part cycle event for traceability. TimescaleDB hypertable. / Su kien chu ky tung san pham.';
CREATE INDEX idx_mcyc_equip ON mes_cycle_events (equipment_id, cycle_end_time DESC);
CREATE INDEX idx_mcyc_job ON mes_cycle_events (job_number, operation_seq, cycle_end_time DESC);
CREATE INDEX idx_mcyc_serial ON mes_cycle_events (serial_number, cycle_end_time DESC)
    WHERE serial_number IS NOT NULL;
CREATE INDEX idx_mcyc_lot ON mes_cycle_events (lot_number, cycle_end_time DESC)
    WHERE lot_number IS NOT NULL;


-- ============================================================================
-- SECTION MES-4: OEE CALCULATION
-- Phan MES-4: Tinh toan OEE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-4.1 mes_oee_loss_events / Su kien ton that OEE
-- ---------------------------------------------------------------------------
CREATE TABLE mes_oee_loss_events (
    loss_id             BIGINT          GENERATED ALWAYS AS IDENTITY,
    loss_time           TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    loss_category       oee_loss_category NOT NULL,
    loss_reason_code    VARCHAR(50),
    loss_reason_text    VARCHAR(500),
    duration_seconds    NUMERIC(10,2)   NOT NULL,
    lost_units          NUMERIC(10,2),
    shift_code          VARCHAR(5),
    job_number          VARCHAR(50),
    operation_seq       INT,
    operator_id         VARCHAR(20),
    source_event_id     BIGINT,
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (loss_id, loss_time)
);
-- SELECT create_hypertable('mes_oee_loss_events', 'loss_time',
--     chunk_time_interval => INTERVAL '7 days');
COMMENT ON TABLE mes_oee_loss_events IS 'OEE loss tracking by TPM six big losses. TimescaleDB hypertable. / Theo doi ton that OEE.';
CREATE INDEX idx_moee_equip ON mes_oee_loss_events (equipment_id, loss_time DESC);
CREATE INDEX idx_moee_cat ON mes_oee_loss_events (loss_category, loss_time DESC);

-- ---------------------------------------------------------------------------
-- MES-4.2 mes_oee_snapshots / Anh chup OEE
-- ---------------------------------------------------------------------------
CREATE TABLE mes_oee_snapshots (
    snapshot_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    snapshot_date       DATE            NOT NULL,
    shift_code          VARCHAR(5)      NOT NULL,
    planned_production_time_sec NUMERIC(12,2) NOT NULL,
    actual_run_time_sec NUMERIC(12,2)   NOT NULL,
    downtime_sec        NUMERIC(12,2)   DEFAULT 0,
    setup_time_sec      NUMERIC(12,2)   DEFAULT 0,
    availability        NUMERIC(5,4)    NOT NULL,
    ideal_cycle_time_sec NUMERIC(10,2),
    total_pieces        NUMERIC(12,2)   DEFAULT 0,
    performance         NUMERIC(5,4)    NOT NULL,
    good_pieces         NUMERIC(12,2)   DEFAULT 0,
    defect_pieces       NUMERIC(12,2)   DEFAULT 0,
    rework_pieces       NUMERIC(12,2)   DEFAULT 0,
    quality             NUMERIC(5,4)    NOT NULL,
    oee                 NUMERIC(5,4)    GENERATED ALWAYS AS (availability * performance * quality) STORED,
    primary_job_number  VARCHAR(50),
    operator_ids        TEXT[],
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, snapshot_date, shift_code)
);
COMMENT ON TABLE mes_oee_snapshots IS 'Pre-calculated OEE per machine per shift. / OEE tinh san theo may theo ca.';
CREATE INDEX idx_moees_equip_date ON mes_oee_snapshots (equipment_id, snapshot_date DESC);
CREATE INDEX idx_moees_oee ON mes_oee_snapshots (oee, snapshot_date DESC);


-- ============================================================================
-- SECTION MES-5: QUALITY DATA (Real-Time SPC Integration)
-- Phan MES-5: Du lieu Chat luong (Tich hop SPC Thoi gian thuc)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-5.1 mes_inline_measurements / Do luong trong quy trinh
-- ---------------------------------------------------------------------------
CREATE TABLE mes_inline_measurements (
    measurement_id      BIGINT          GENERATED ALWAYS AS IDENTITY,
    measured_at         TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    part_number         VARCHAR(100)    NOT NULL,
    part_rev            VARCHAR(20),
    serial_number       VARCHAR(100),
    lot_number          VARCHAR(100),
    part_sequence       INT,
    characteristic_id   VARCHAR(100)    NOT NULL,
    characteristic_name VARCHAR(300),
    char_type           char_type_enum,
    char_designator     char_designator DEFAULT 'Standard',
    nominal             NUMERIC(14,6),
    usl                 NUMERIC(14,6),
    lsl                 NUMERIC(14,6),
    unit                measurement_unit,
    measured_value      NUMERIC(14,6)   NOT NULL,
    deviation           NUMERIC(14,6),
    conformance         VARCHAR(2)      NOT NULL CHECK (conformance IN ('C', 'NC')),
    measurement_source  VARCHAR(50),
    gage_id             VARCHAR(50),
    measuring_program   VARCHAR(200),
    operator_id         VARCHAR(20),
    spc_subgroup        INT,
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (measurement_id, measured_at)
);
-- SELECT create_hypertable('mes_inline_measurements', 'measured_at',
--     chunk_time_interval => INTERVAL '7 days');
COMMENT ON TABLE mes_inline_measurements IS 'In-process measurements. TimescaleDB hypertable. AS9100 30-year retention. / Do luong trong quy trinh.';
CREATE INDEX idx_mimeas_equip ON mes_inline_measurements (equipment_id, measured_at DESC);
CREATE INDEX idx_mimeas_job ON mes_inline_measurements (job_number, operation_seq, measured_at DESC);
CREATE INDEX idx_mimeas_char ON mes_inline_measurements (characteristic_id, measured_at DESC);
CREATE INDEX idx_mimeas_serial ON mes_inline_measurements (serial_number, measured_at DESC)
    WHERE serial_number IS NOT NULL;
CREATE INDEX idx_mimeas_nc ON mes_inline_measurements (measured_at DESC)
    WHERE conformance = 'NC';

-- ---------------------------------------------------------------------------
-- MES-5.2 mes_spc_control_limits / Gioi han kiem soat SPC
-- ---------------------------------------------------------------------------
CREATE TABLE mes_spc_control_limits (
    limit_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id             VARCHAR(50)     NOT NULL,
    part_rev            VARCHAR(20),
    characteristic_id   VARCHAR(100)    NOT NULL,
    chart_type          spc_chart_type_enum NOT NULL DEFAULT 'xbar_r',
    subgroup_size       INT             NOT NULL DEFAULT 5,
    ucl_xbar            NUMERIC(14,6),
    lcl_xbar            NUMERIC(14,6),
    cl_xbar             NUMERIC(14,6),
    ucl_range           NUMERIC(14,6),
    lcl_range           NUMERIC(14,6),
    cl_range            NUMERIC(14,6),
    cp                  NUMERIC(8,4),
    cpk                 NUMERIC(8,4),
    pp                  NUMERIC(8,4),
    ppk                 NUMERIC(8,4),
    process_sigma       NUMERIC(8,4),
    study_date          DATE,
    sample_count        INT,
    calculated_by       UUID,
    approved_by         UUID,
    is_current          BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    valid_from          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    UNIQUE (item_id, characteristic_id) WHERE (is_current = TRUE)
);
COMMENT ON TABLE mes_spc_control_limits IS 'SPC control limit definitions per characteristic. / Dinh nghia gioi han kiem soat SPC.';
CREATE INDEX idx_mspc_item ON mes_spc_control_limits (item_id, characteristic_id);

-- ---------------------------------------------------------------------------
-- MES-5.3 mes_spc_violations / Vi pham SPC
-- ---------------------------------------------------------------------------
CREATE TABLE mes_spc_violations (
    violation_id        BIGINT          GENERATED ALWAYS AS IDENTITY,
    detected_at         TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    item_id             VARCHAR(50)     NOT NULL,
    characteristic_id   VARCHAR(100)    NOT NULL,
    job_number          VARCHAR(50),
    rule_violated       VARCHAR(50)     NOT NULL,
    violation_value     NUMERIC(14,6),
    control_limit_hit   VARCHAR(10),
    acknowledged        BOOLEAN         DEFAULT FALSE,
    acknowledged_by     VARCHAR(20),
    acknowledged_at     TIMESTAMPTZ,
    corrective_action   TEXT,
    ncr_generated       BOOLEAN         DEFAULT FALSE,
    ncr_number          VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (violation_id, detected_at)
);
-- SELECT create_hypertable('mes_spc_violations', 'detected_at',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_spc_violations IS 'Real-time SPC rule violations. / Vi pham quy tac SPC thoi gian thuc.';
CREATE INDEX idx_mspcv_equip ON mes_spc_violations (equipment_id, detected_at DESC);
CREATE INDEX idx_mspcv_item ON mes_spc_violations (item_id, characteristic_id, detected_at DESC);


-- ============================================================================
-- SECTION MES-6: LABOR & OPERATOR
-- Phan MES-6: Lao dong & Nguoi van hanh
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-6.1 mes_operator_sessions / Phien lam viec nguoi van hanh
-- ---------------------------------------------------------------------------
CREATE TABLE mes_operator_sessions (
    session_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         VARCHAR(20)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    shift_code          VARCHAR(5)      NOT NULL,
    login_at            TIMESTAMPTZ     NOT NULL,
    logout_at           TIMESTAMPTZ,
    initial_job_number  VARCHAR(50),
    login_method        VARCHAR(30)     DEFAULT 'badge',
    total_duration_sec  NUMERIC(10,2),
    productive_sec      NUMERIC(10,2),
    idle_sec            NUMERIC(10,2),
    erp_labor_txn_ids   UUID[],
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_operator_sessions IS 'Real-time operator sessions per machine. / Phien nguoi van hanh thoi gian thuc.';
CREATE INDEX idx_mopsess_emp ON mes_operator_sessions (employee_id, login_at DESC);
CREATE INDEX idx_mopsess_equip ON mes_operator_sessions (equipment_id, login_at DESC);
CREATE INDEX idx_mopsess_active ON mes_operator_sessions (equipment_id)
    WHERE logout_at IS NULL;

-- ---------------------------------------------------------------------------
-- MES-6.2 mes_operator_qualifications / Nang luc nguoi van hanh
-- ---------------------------------------------------------------------------
CREATE TABLE mes_operator_qualifications (
    qual_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         VARCHAR(20)     NOT NULL,
    qualification_type  VARCHAR(50)     NOT NULL,
    qualification_code  VARCHAR(50)     NOT NULL,
    qualification_level VARCHAR(20)     DEFAULT 'qualified',
    certified_date      DATE,
    expiry_date         DATE,
    certified_by        VARCHAR(20),
    training_record_id  UUID,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    UNIQUE (employee_id, qualification_type, qualification_code)
);
COMMENT ON TABLE mes_operator_qualifications IS 'Operator qualification matrix. / Ma tran nang luc nguoi van hanh.';
CREATE INDEX idx_moqal_emp ON mes_operator_qualifications (employee_id);
CREATE INDEX idx_moqal_code ON mes_operator_qualifications (qualification_type, qualification_code);
CREATE INDEX idx_moqal_expiry ON mes_operator_qualifications (expiry_date)
    WHERE expiry_date IS NOT NULL AND is_active = TRUE;

-- ---------------------------------------------------------------------------
-- MES-6.3 mes_shift_handover / Ban giao ca
-- ---------------------------------------------------------------------------
CREATE TABLE mes_shift_handover (
    handover_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    handover_date       DATE            NOT NULL,
    shift_from          VARCHAR(5)      NOT NULL,
    shift_to            VARCHAR(5)      NOT NULL,
    operator_from       VARCHAR(20)     NOT NULL,
    operator_to         VARCHAR(20),
    job_in_progress     VARCHAR(50),
    operation_in_progress INT,
    parts_completed     NUMERIC(10,2),
    machine_state       semi_e10_state,
    issues_noted        TEXT,
    pending_actions     TEXT,
    quality_alerts      TEXT,
    tooling_status      TEXT,
    acknowledged_at     TIMESTAMPTZ,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_shift_handover IS 'Shift handover log per machine. / Nhat ky ban giao ca theo may.';
CREATE INDEX idx_mshh_equip ON mes_shift_handover (equipment_id, handover_date DESC);


-- ============================================================================
-- SECTION MES-7: MATERIAL & WIP TRACKING
-- Phan MES-7: Theo doi Vat lieu & WIP
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-7.1 mes_material_consumption / Tieu thu vat lieu
-- ---------------------------------------------------------------------------
CREATE TABLE mes_material_consumption (
    consumption_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    consumed_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    equipment_id        VARCHAR(50),
    item_id             VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    heat_number         VARCHAR(100),
    material_cert_number VARCHAR(100),
    consumption_type    material_consumption_type NOT NULL DEFAULT 'CONSUMED',
    qty_consumed        NUMERIC(12,4)   NOT NULL,
    qty_uom             VARCHAR(10)     NOT NULL DEFAULT 'EA',
    warehouse_id        VARCHAR(30),
    location_id         VARCHAR(50),
    operator_id         VARCHAR(20),
    erp_inv_txn_id      UUID,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_material_consumption IS 'Material consumption tracking per operation. / Theo doi tieu thu vat lieu theo cong doan.';
CREATE INDEX idx_mmcons_job ON mes_material_consumption (job_number, operation_seq);
CREATE INDEX idx_mmcons_lot ON mes_material_consumption (lot_number)
    WHERE lot_number IS NOT NULL;
CREATE INDEX idx_mmcons_heat ON mes_material_consumption (heat_number)
    WHERE heat_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-7.2 mes_wip_location / Vi tri WIP
-- ---------------------------------------------------------------------------
CREATE TABLE mes_wip_location (
    tracking_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    serial_number       VARCHAR(100),
    current_area_id     VARCHAR(30),
    current_equipment_id VARCHAR(50),
    current_operation_seq INT,
    current_status      VARCHAR(30)     DEFAULT 'IN_QUEUE',
    qty_at_location     NUMERIC(12,2)   DEFAULT 0,
    arrived_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata            JSONB           DEFAULT '{}',
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_wip_location IS 'Real-time WIP location on shop floor. / Vi tri WIP thoi gian thuc.';
CREATE INDEX idx_mwiploc_job ON mes_wip_location (job_number);
CREATE INDEX idx_mwiploc_area ON mes_wip_location (current_area_id);
CREATE INDEX idx_mwiploc_equip ON mes_wip_location (current_equipment_id)
    WHERE current_equipment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-7.3 mes_wip_movements / Di chuyen WIP
-- ---------------------------------------------------------------------------
CREATE TABLE mes_wip_movements (
    movement_id         BIGINT          GENERATED ALWAYS AS IDENTITY,
    moved_at            TIMESTAMPTZ     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    lot_number          VARCHAR(100),
    serial_number       VARCHAR(100),
    qty_moved           NUMERIC(12,2)   NOT NULL,
    from_area_id        VARCHAR(30),
    from_equipment_id   VARCHAR(50),
    from_operation_seq  INT,
    to_area_id          VARCHAR(30),
    to_equipment_id     VARCHAR(50),
    to_operation_seq    INT,
    moved_by            VARCHAR(20),
    move_reason         VARCHAR(100),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (movement_id, moved_at)
);
-- SELECT create_hypertable('mes_wip_movements', 'moved_at',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_wip_movements IS 'WIP movement audit trail. TimescaleDB hypertable. / Nhat ky di chuyen WIP.';
CREATE INDEX idx_mwipmov_job ON mes_wip_movements (job_number, moved_at DESC);


-- ============================================================================
-- SECTION MES-8: TOOLING & FIXTURES (Real-Time)
-- Phan MES-8: Dao cu & Do ga (Thoi gian thuc)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-8.1 mes_tool_life_events / Su kien tuoi tho dao cu
-- ---------------------------------------------------------------------------
CREATE TABLE mes_tool_life_events (
    event_id            BIGINT          GENERATED ALWAYS AS IDENTITY,
    event_time          TIMESTAMPTZ     NOT NULL,
    tool_id             VARCHAR(50)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    event_type          VARCHAR(30)     NOT NULL,
    magazine_position   INT,
    life_count_at_event INT,
    life_time_at_event_min NUMERIC(10,2),
    life_remaining_pct  NUMERIC(5,2),
    wear_offset_length  NUMERIC(10,4),
    wear_offset_diameter NUMERIC(10,4),
    job_number          VARCHAR(50),
    program_name        VARCHAR(200),
    operator_id         VARCHAR(20),
    breakage_detected_by VARCHAR(30),
    breakage_action     VARCHAR(50),
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (event_id, event_time)
);
-- SELECT create_hypertable('mes_tool_life_events', 'event_time',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_tool_life_events IS 'Real-time tool life events. TimescaleDB hypertable. / Su kien tuoi tho dao cu thoi gian thuc.';
CREATE INDEX idx_mtle_tool ON mes_tool_life_events (tool_id, event_time DESC);
CREATE INDEX idx_mtle_equip ON mes_tool_life_events (equipment_id, event_time DESC);
CREATE INDEX idx_mtle_breakage ON mes_tool_life_events (event_time DESC)
    WHERE event_type = 'BREAKAGE';

-- ---------------------------------------------------------------------------
-- MES-8.2 mes_fixture_assignments / Phan cong do ga
-- ---------------------------------------------------------------------------
CREATE TABLE mes_fixture_assignments (
    assignment_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id          VARCHAR(50)     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50),
    operation_seq       INT,
    assigned_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    released_at         TIMESTAMPTZ,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    setup_verified      BOOLEAN         DEFAULT FALSE,
    setup_verified_by   VARCHAR(20),
    setup_verified_at   TIMESTAMPTZ,
    usage_count         INT             DEFAULT 0,
    max_usage_count     INT,
    last_inspection_date DATE,
    next_inspection_date DATE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_fixture_assignments IS 'Fixture assignment tracking per machine per job. / Theo doi phan cong do ga.';
CREATE INDEX idx_mfixt_fixture ON mes_fixture_assignments (fixture_id);
CREATE INDEX idx_mfixt_equip ON mes_fixture_assignments (equipment_id)
    WHERE is_active = TRUE;
CREATE INDEX idx_mfixt_job ON mes_fixture_assignments (job_number)
    WHERE job_number IS NOT NULL;


-- ============================================================================
-- SECTION MES-9: SCHEDULING & DISPATCH
-- Phan MES-9: Lap lich & Dieu do
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-9.1 mes_dispatch_queue / Hang doi dieu do
-- ---------------------------------------------------------------------------
CREATE TABLE mes_dispatch_queue (
    queue_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id        VARCHAR(50)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    dispatch_priority   dispatch_priority_enum NOT NULL DEFAULT 'STANDARD',
    sequence_in_queue   INT             NOT NULL,
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    est_setup_minutes   NUMERIC(8,2),
    est_run_minutes     NUMERIC(8,2),
    qty_to_produce      NUMERIC(12,2)   NOT NULL,
    queue_status        VARCHAR(30)     DEFAULT 'QUEUED',
    material_available  BOOLEAN         DEFAULT FALSE,
    tooling_available   BOOLEAN         DEFAULT FALSE,
    fixture_available   BOOLEAN         DEFAULT FALSE,
    operator_qualified  BOOLEAN         DEFAULT FALSE,
    all_constraints_met BOOLEAN         GENERATED ALWAYS AS (
        material_available AND tooling_available AND fixture_available AND operator_qualified
    ) STORED,
    planner_notes       TEXT,
    source_schedule_id  UUID,
    priority_score      INT             DEFAULT 0,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (equipment_id, job_number, operation_seq)
);
COMMENT ON TABLE mes_dispatch_queue IS 'Live dispatch queue per machine. / Hang doi dieu do thoi gian thuc theo may.';
CREATE INDEX idx_mdq_equip ON mes_dispatch_queue (equipment_id, sequence_in_queue)
    WHERE queue_status IN ('QUEUED', 'READY');
CREATE INDEX idx_mdq_priority ON mes_dispatch_queue (dispatch_priority, sequence_in_queue);
CREATE INDEX idx_mdq_constraints ON mes_dispatch_queue (equipment_id)
    WHERE all_constraints_met = FALSE AND queue_status = 'QUEUED';


-- ============================================================================
-- SECTION MES-10: MAINTENANCE INTEGRATION (CMMS)
-- Phan MES-10: Tich hop Bao tri (CMMS)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-10.1 mes_downtime_events / Su kien ngung may
-- ---------------------------------------------------------------------------
CREATE TABLE mes_downtime_events (
    downtime_id         BIGINT          GENERATED ALWAYS AS IDENTITY,
    start_time          TIMESTAMPTZ     NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    end_time            TIMESTAMPTZ,
    duration_seconds    NUMERIC(12,2),
    is_planned          BOOLEAN         NOT NULL DEFAULT FALSE,
    downtime_category   VARCHAR(50),
    reason_code         VARCHAR(50),
    reason_text         VARCHAR(500),
    failure_code        VARCHAR(50),
    failure_mode        VARCHAR(200),
    root_cause_code     VARCHAR(50),
    jobs_affected       TEXT[],
    estimated_loss_units NUMERIC(10,2),
    resolved_by         VARCHAR(20),
    resolution_action   TEXT,
    maint_wo_id         UUID,
    state_event_id      BIGINT,
    detection_method    VARCHAR(30)     DEFAULT 'automatic',
    operator_id         VARCHAR(20),
    shift_code          VARCHAR(5),
    state_from          TEXT,
    state_to            TEXT,
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (downtime_id, start_time)
);
-- SELECT create_hypertable('mes_downtime_events', 'start_time',
--     chunk_time_interval => INTERVAL '30 days');
COMMENT ON TABLE mes_downtime_events IS 'Machine downtime events for MTBF/MTTR. TimescaleDB hypertable. / Su kien ngung may.';
CREATE INDEX idx_mdt_equip ON mes_downtime_events (equipment_id, start_time DESC);
CREATE INDEX idx_mdt_active ON mes_downtime_events (equipment_id)
    WHERE end_time IS NULL;
CREATE INDEX idx_mdt_category ON mes_downtime_events (downtime_category, start_time DESC);
CREATE INDEX idx_mdt_failure ON mes_downtime_events (failure_code, start_time DESC)
    WHERE failure_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-10.2 mes_pm_execution / Thuc thi bao tri phong ngua
-- ---------------------------------------------------------------------------
CREATE TABLE mes_pm_execution (
    pm_exec_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    maint_wo_id         UUID            NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    checklist_items     JSONB           NOT NULL DEFAULT '[]',
    all_items_pass      BOOLEAN,
    spindle_hours       NUMERIC(12,2),
    axis_total_distance_km NUMERIC(12,2),
    coolant_concentration_pct NUMERIC(5,2),
    pm_interval_hours   NUMERIC(10,2),
    next_pm_due_date    DATE,
    next_pm_due_hours   NUMERIC(12,2),
    performed_by        VARCHAR(20)     NOT NULL,
    verified_by         VARCHAR(20),
    performed_at        TIMESTAMPTZ     NOT NULL,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_pm_execution IS 'PM execution with checklist and meter readings. / Thuc thi PM.';
CREATE INDEX idx_mpmex_equip ON mes_pm_execution (equipment_id, performed_at DESC);

-- ---------------------------------------------------------------------------
-- MES-10.3 mes_spare_parts_consumption / Tieu thu phu tung
-- ---------------------------------------------------------------------------
CREATE TABLE mes_spare_parts_consumption (
    consumption_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    maint_wo_id         UUID            NOT NULL,
    equipment_id        VARCHAR(50)     NOT NULL,
    spare_part_id       VARCHAR(50)     NOT NULL,
    qty_consumed        NUMERIC(10,2)   NOT NULL,
    unit_cost           NUMERIC(12,2),
    total_cost          NUMERIC(12,2),
    consumed_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    consumed_by         VARCHAR(20),
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE mes_spare_parts_consumption IS 'Spare parts consumed during maintenance. / Phu tung tieu thu khi bao tri.';
CREATE INDEX idx_mspc_equip ON mes_spare_parts_consumption (equipment_id);
CREATE INDEX idx_mspc_part ON mes_spare_parts_consumption (spare_part_id);


-- ============================================================================
-- SECTION MES-11: TRACEABILITY & GENEALOGY (AS9100)
-- Phan MES-11: Truy xuat & Gia he (AS9100)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-11.1 mes_part_genealogy / Gia he san pham
-- ---------------------------------------------------------------------------
CREATE TABLE mes_part_genealogy (
    genealogy_id        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    item_id             VARCHAR(50)     NOT NULL,
    part_rev            VARCHAR(20),
    serial_number       VARCHAR(100),
    lot_number          VARCHAR(100),
    customer_id         VARCHAR(50),
    sales_order_ref     VARCHAR(50),
    raw_material_item_id VARCHAR(50),
    raw_material_lot    VARCHAR(100),
    raw_material_heat   VARCHAR(100),
    material_cert_ref   VARCHAR(200),
    material_spec       VARCHAR(200),
    operations_completed INT,
    total_operations    INT,
    first_operation_date TIMESTAMPTZ,
    last_operation_date TIMESTAMPTZ,
    all_inspections_pass BOOLEAN,
    fai_number          VARCHAR(50),
    certificate_of_conformance VARCHAR(100),
    final_disposition   VARCHAR(30),
    ship_date           DATE,
    shipment_id         UUID,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_part_genealogy IS 'Master genealogy per serial/lot. AS9100 30-year retention. / Gia he chinh.';
CREATE UNIQUE INDEX idx_mpgen_serial ON mes_part_genealogy (serial_number)
    WHERE serial_number IS NOT NULL;
CREATE INDEX idx_mpgen_lot ON mes_part_genealogy (lot_number)
    WHERE lot_number IS NOT NULL;
CREATE INDEX idx_mpgen_job ON mes_part_genealogy (job_number);
CREATE INDEX idx_mpgen_item ON mes_part_genealogy (item_id, part_rev);
CREATE INDEX idx_mpgen_material ON mes_part_genealogy (raw_material_heat)
    WHERE raw_material_heat IS NOT NULL;

-- ---------------------------------------------------------------------------
-- MES-11.2 mes_genealogy_operations / Cong doan gia he
-- ---------------------------------------------------------------------------
CREATE TABLE mes_genealogy_operations (
    gen_op_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    genealogy_id        UUID            NOT NULL REFERENCES mes_part_genealogy(genealogy_id),
    operation_seq       INT             NOT NULL,
    operation_code      VARCHAR(30),
    operation_desc      VARCHAR(300),
    equipment_id        VARCHAR(50)     NOT NULL,
    equipment_name      VARCHAR(200),
    nc_program_name     VARCHAR(200),
    nc_program_revision VARCHAR(20),
    operator_id         VARCHAR(20)     NOT NULL,
    operator_name       VARCHAR(150),
    started_at          TIMESTAMPTZ     NOT NULL,
    completed_at        TIMESTAMPTZ,
    setup_time_sec      NUMERIC(10,2),
    cycle_time_sec      NUMERIC(10,2),
    tools_used          JSONB           DEFAULT '[]',
    fixture_id          VARCHAR(50),
    materials_consumed  JSONB           DEFAULT '[]',
    inspection_result   VARCHAR(10),
    measurements        JSONB           DEFAULT '[]',
    ncr_numbers         TEXT[],
    process_params      JSONB           DEFAULT '{}',
    metadata            JSONB           DEFAULT '{}'
);
COMMENT ON TABLE mes_genealogy_operations IS 'Per-operation genealogy detail. / Chi tiet gia he theo cong doan.';
CREATE INDEX idx_mgenop_gen ON mes_genealogy_operations (genealogy_id, operation_seq);
CREATE INDEX idx_mgenop_equip ON mes_genealogy_operations (equipment_id, started_at DESC);
CREATE INDEX idx_mgenop_operator ON mes_genealogy_operations (operator_id, started_at DESC);


-- ============================================================================
-- SECTION MES-12: DIGITAL TWIN & REAL-TIME DASHBOARD
-- Phan MES-12: Song sinh Ky thuat so & Bang dieu khien Thoi gian thuc
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-12.1 mes_machine_snapshot / Anh chup trang thai may
-- ---------------------------------------------------------------------------
CREATE TABLE mes_machine_snapshot (
    equipment_id        VARCHAR(50)     PRIMARY KEY,
    e10_state           semi_e10_state  NOT NULL DEFAULT 'NON_SCHEDULED',
    e10_substate        VARCHAR(50),
    state_since         TIMESTAMPTZ,
    state_duration_sec  NUMERIC(10,2),
    job_number          VARCHAR(50),
    part_number         VARCHAR(100),
    customer_name       VARCHAR(200),
    operation_seq       INT,
    operation_desc      VARCHAR(300),
    qty_required        NUMERIC(12,2),
    qty_completed       NUMERIC(12,2),
    qty_remaining       NUMERIC(12,2),
    program_name        VARCHAR(200),
    current_tool_number INT,
    cycle_time_target_sec NUMERIC(10,2),
    cycle_time_last_sec NUMERIC(10,2),
    cycle_time_avg_sec  NUMERIC(10,2),
    est_completion_time TIMESTAMPTZ,
    operator_id         VARCHAR(20),
    operator_name       VARCHAR(150),
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    parts_good_shift    INT             DEFAULT 0,
    parts_scrap_shift   INT             DEFAULT 0,
    parts_rework_shift  INT             DEFAULT 0,
    active_alarm_count  INT             DEFAULT 0,
    highest_alarm_severity mes_event_severity,
    spindle_load_pct    NUMERIC(6,2),
    coolant_temp_c      NUMERIC(6,2),
    vibration_mm_s      NUMERIC(8,4),
    next_job_number     VARCHAR(50),
    next_part_number    VARCHAR(100),
    last_updated        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    heartbeat_age_sec   NUMERIC(10,2)
);
COMMENT ON TABLE mes_machine_snapshot IS 'Denormalized machine state for real-time dashboard. / Trang thai may cho bang dieu khien.';

-- ---------------------------------------------------------------------------
-- MES-12.2 mes_shop_floor_layout / Bo tri mat bang san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE mes_shop_floor_layout (
    layout_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id             VARCHAR(30)     NOT NULL REFERENCES mes_sites(site_id),
    area_id             VARCHAR(30)     REFERENCES mes_areas(area_id),
    layout_name         VARCHAR(200)    NOT NULL,
    layout_version      INT             NOT NULL DEFAULT 1,
    svg_content         TEXT,
    machine_positions   JSONB           NOT NULL DEFAULT '[]',
    is_current          BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_shop_floor_layout IS 'Shop floor SVG layout for digital twin. / Bo tri mat bang cho song sinh.';


-- ============================================================================
-- SECTION MES-13: KPI & ANALYTICS EXTENSIONS
-- Phan MES-13: Mo rong KPI & Phan tich
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-13.1 mes_production_kpi_daily / KPI san xuat hang ngay
-- ---------------------------------------------------------------------------
CREATE TABLE mes_production_kpi_daily (
    kpi_date            DATE            NOT NULL,
    dimension_type      VARCHAR(20)     NOT NULL,
    dimension_id        VARCHAR(50)     NOT NULL,
    shift_code          VARCHAR(5),
    total_parts_produced NUMERIC(12,2),
    total_parts_good    NUMERIC(12,2),
    total_parts_scrap   NUMERIC(12,2),
    total_parts_rework  NUMERIC(12,2),
    oee_availability    NUMERIC(5,4),
    oee_performance     NUMERIC(5,4),
    oee_quality         NUMERIC(5,4),
    oee_overall         NUMERIC(5,4),
    planned_time_sec    NUMERIC(12,2),
    productive_time_sec NUMERIC(12,2),
    setup_time_sec      NUMERIC(12,2),
    downtime_sec        NUMERIC(12,2),
    idle_time_sec       NUMERIC(12,2),
    parts_per_hour      NUMERIC(8,2),
    scrap_rate_pct      NUMERIC(5,2),
    est_cost_per_part   NUMERIC(12,4),
    top_downtime_reasons JSONB          DEFAULT '[]',
    top_scrap_reasons   JSONB           DEFAULT '[]',
    metadata            JSONB           DEFAULT '{}',
    PRIMARY KEY (kpi_date, dimension_type, dimension_id, COALESCE(shift_code, 'ALL'))
);
COMMENT ON TABLE mes_production_kpi_daily IS 'Daily production KPI roll-ups. / Tong hop KPI san xuat hang ngay.';
CREATE INDEX idx_mpkpi_dim ON mes_production_kpi_daily (dimension_type, dimension_id, kpi_date DESC);
CREATE INDEX idx_mpkpi_oee ON mes_production_kpi_daily (oee_overall, kpi_date DESC);

-- ---------------------------------------------------------------------------
-- MES-13.2 mes_on_time_delivery / Giao hang dung hen
-- ---------------------------------------------------------------------------
CREATE TABLE mes_on_time_delivery (
    otd_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number          VARCHAR(50)     NOT NULL,
    sales_order_ref     VARCHAR(50),
    customer_id         VARCHAR(50),
    item_id             VARCHAR(50),
    qty_ordered         NUMERIC(12,2),
    qty_shipped         NUMERIC(12,2),
    customer_request_date DATE          NOT NULL,
    promised_date       DATE            NOT NULL,
    actual_ship_date    DATE,
    days_early_late     INT,
    is_on_time          BOOLEAN,
    late_reason_code    VARCHAR(50),
    late_reason_text    TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_on_time_delivery IS 'On-time delivery tracking per job. / Theo doi giao hang dung hen.';
CREATE INDEX idx_motd_customer ON mes_on_time_delivery (customer_id, actual_ship_date DESC);
CREATE INDEX idx_motd_late ON mes_on_time_delivery (is_on_time, actual_ship_date DESC)
    WHERE is_on_time = FALSE;


-- ============================================================================
-- SECTION MES-14: ERP INTEGRATION STAGING
-- Phan MES-14: Khu vuc tich hop ERP
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-14.1 mes_erp_inbound_queue / Hang doi du lieu tu ERP
-- ---------------------------------------------------------------------------
CREATE TABLE mes_erp_inbound_queue (
    queue_id            BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    received_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    entity_type         VARCHAR(50)     NOT NULL,
    entity_id           VARCHAR(100)    NOT NULL,
    action              VARCHAR(20)     NOT NULL,
    payload             JSONB           NOT NULL,
    processed_at        TIMESTAMPTZ,
    process_status      VARCHAR(20)     DEFAULT 'PENDING',
    error_message       TEXT,
    retry_count         INT             DEFAULT 0
);
COMMENT ON TABLE mes_erp_inbound_queue IS 'Inbound queue for Epicor -> MES data sync. / Hang doi du lieu tu Epicor sang MES.';
CREATE INDEX idx_meiq_status ON mes_erp_inbound_queue (process_status, received_at)
    WHERE process_status != 'SUCCESS';

-- ---------------------------------------------------------------------------
-- MES-14.2 mes_erp_outbound_queue / Hang doi du lieu len ERP
-- ---------------------------------------------------------------------------
CREATE TABLE mes_erp_outbound_queue (
    queue_id            BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    entity_type         VARCHAR(50)     NOT NULL,
    entity_id           VARCHAR(100)    NOT NULL,
    payload             JSONB           NOT NULL,
    sent_at             TIMESTAMPTZ,
    send_status         VARCHAR(20)     DEFAULT 'PENDING',
    erp_response        JSONB,
    error_message       TEXT,
    retry_count         INT             DEFAULT 0
);
COMMENT ON TABLE mes_erp_outbound_queue IS 'Outbound queue for MES -> Epicor data sync. / Hang doi du lieu tu MES sang Epicor.';
CREATE INDEX idx_meoq_status ON mes_erp_outbound_queue (send_status, created_at)
    WHERE send_status != 'SUCCESS';


-- ============================================================================
-- SECTION MES-15: NOTIFICATION CHANNELS & EVENT BUS
-- Phan MES-15: Kenh Thong bao & Bus Su kien
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MES-15.1 mes_event_subscriptions / Dang ky su kien
-- ---------------------------------------------------------------------------
CREATE TABLE mes_event_subscriptions (
    subscription_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type          VARCHAR(100)    NOT NULL,
    equipment_filter    VARCHAR(50),
    area_filter         VARCHAR(30),
    severity_min        mes_event_severity DEFAULT 'INFO',
    notify_user_id      UUID,
    notify_role_code    VARCHAR(50),
    channel             VARCHAR(30)     NOT NULL DEFAULT 'app',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_event_subscriptions IS 'Event subscription rules for MES notifications. / Quy tac dang ky su kien.';
CREATE INDEX idx_mesub_event ON mes_event_subscriptions (event_type)
    WHERE is_active = TRUE;


-- ============================================================================
-- SECTION MES-16: CONNECTIVITY ADAPTER GOVERNANCE
-- Phan MES-16: Quan tri bo ket noi may
-- ============================================================================

CREATE TABLE mes_connectivity_adapters (
    adapter_id               VARCHAR(60)     PRIMARY KEY,
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    adapter_name             VARCHAR(255)    NOT NULL,
    adapter_type             VARCHAR(50)     NOT NULL,
    transport_protocol       VARCHAR(50)     NOT NULL,
    endpoint_url             VARCHAR(500),
    heartbeat_sla_seconds    INT             NOT NULL DEFAULT 120,
    stale_after_seconds      INT             NOT NULL DEFAULT 180,
    auth_mode                VARCHAR(50)     DEFAULT 'service_account',
    store_and_forward_enabled BOOLEAN        NOT NULL DEFAULT TRUE,
    payload_schema_version   VARCHAR(30)     DEFAULT '1.0',
    adapter_status           VARCHAR(30)     NOT NULL DEFAULT 'active',
    last_validated_at        TIMESTAMPTZ,
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_connectivity_adapters IS 'Governed registry of machine connectivity adapters. / Danh muc co kiem soat cua bo ket noi may.';
CREATE INDEX idx_mca_equipment ON mes_connectivity_adapters (equipment_id);
CREATE INDEX idx_mca_status ON mes_connectivity_adapters (adapter_status);

CREATE TABLE mes_connectivity_events (
    adapter_event_id         VARCHAR(80)     PRIMARY KEY,
    adapter_id               VARCHAR(60)     REFERENCES mes_connectivity_adapters(adapter_id),
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    event_time               TIMESTAMPTZ     NOT NULL,
    event_type               VARCHAR(50)     NOT NULL,
    severity                 mes_event_severity NOT NULL DEFAULT 'WARNING',
    event_status             VARCHAR(30)     NOT NULL DEFAULT 'open',
    message                  TEXT            NOT NULL,
    payload_excerpt          JSONB           DEFAULT '{}',
    acknowledged_by          VARCHAR(50),
    acknowledged_at          TIMESTAMPTZ,
    metadata                 JSONB           DEFAULT '{}',
    recorded_by              VARCHAR(50),
    recorded_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_connectivity_events IS 'Connectivity adapter health and ingestion events. / Su kien suc khoe va ingest cua bo ket noi.';
CREATE INDEX idx_mce_adapter_time ON mes_connectivity_events (adapter_id, event_time DESC);
CREATE INDEX idx_mce_equipment_time ON mes_connectivity_events (equipment_id, event_time DESC);

-- ============================================================================
-- SECTION MES-17: ALARM CATALOG & PLAYBOOKS
-- Phan MES-17: Danh muc alarm va playbook ung pho
-- ============================================================================

CREATE TABLE mes_alarm_catalog (
    alarm_code               VARCHAR(50)     PRIMARY KEY,
    controller_family        VARCHAR(80)     NOT NULL,
    alarm_group              VARCHAR(80),
    alarm_title              VARCHAR(255)    NOT NULL,
    alarm_title_vi           VARCHAR(255),
    default_severity         mes_event_severity NOT NULL DEFAULT 'ALARM',
    downtime_category_default VARCHAR(80),
    response_owner_role      VARCHAR(80),
    response_target_minutes  INT             DEFAULT 15,
    requires_lockout         BOOLEAN         NOT NULL DEFAULT FALSE,
    requires_maintenance     BOOLEAN         NOT NULL DEFAULT TRUE,
    catalog_status           VARCHAR(30)     NOT NULL DEFAULT 'active',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_alarm_catalog IS 'Governed alarm catalog by controller family. / Danh muc alarm co kiem soat theo ho may dieu khien.';
CREATE INDEX idx_mac_family_group ON mes_alarm_catalog (controller_family, alarm_group);

CREATE TABLE mes_alarm_playbooks (
    playbook_id              VARCHAR(60)     PRIMARY KEY,
    alarm_code               VARCHAR(50)     REFERENCES mes_alarm_catalog(alarm_code),
    playbook_title           VARCHAR(255)    NOT NULL,
    playbook_title_vi        VARCHAR(255),
    response_steps           JSONB           NOT NULL DEFAULT '[]',
    escalation_role          VARCHAR(80),
    response_target_minutes  INT             DEFAULT 15,
    playbook_status          VARCHAR(30)     NOT NULL DEFAULT 'active',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_alarm_playbooks IS 'Structured response playbooks linked to alarm codes. / Playbook ung pho co cau truc lien ket voi ma alarm.';
CREATE INDEX idx_map_alarm ON mes_alarm_playbooks (alarm_code);

-- ============================================================================
-- SECTION MES-18: NC RELEASE, DOWNLOAD RECEIPT, TOOL OFFSET LINEAGE
-- Phan MES-18: Release NC, bien nhan download, va lineage preset-offset
-- ============================================================================

CREATE TABLE mes_nc_release_packages (
    package_id               VARCHAR(80)     PRIMARY KEY,
    program_id               VARCHAR(120)    NOT NULL,
    item_id                  VARCHAR(50),
    revision_code            VARCHAR(30),
    operation_seq            INT,
    machine_family           VARCHAR(50),
    work_center_id           VARCHAR(50),
    controller_program_name  VARCHAR(120),
    checksum_sha256          VARCHAR(128),
    release_manifest_version VARCHAR(30),
    released_by              VARCHAR(50),
    released_at              TIMESTAMPTZ,
    package_status           VARCHAR(30)     NOT NULL DEFAULT 'draft',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_nc_release_packages IS 'Governed NC release packages that may be downloaded to machines. / Goi release NC co kiem soat de nap xuong may.';
CREATE INDEX idx_mnrp_program ON mes_nc_release_packages (program_id);
CREATE INDEX idx_mnrp_item_rev ON mes_nc_release_packages (item_id, revision_code);

CREATE TABLE mes_nc_download_receipts (
    receipt_id               VARCHAR(80)     PRIMARY KEY,
    package_id               VARCHAR(80)     REFERENCES mes_nc_release_packages(package_id),
    program_id               VARCHAR(120)    NOT NULL,
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    work_order_number        VARCHAR(80),
    downloaded_at            TIMESTAMPTZ     NOT NULL,
    controller_program_name  VARCHAR(120),
    controller_checksum      VARCHAR(128),
    expected_checksum        VARCHAR(128),
    verified_match           BOOLEAN         NOT NULL DEFAULT FALSE,
    receipt_status           VARCHAR(30)     NOT NULL DEFAULT 'pending',
    acknowledged_by          VARCHAR(50),
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_nc_download_receipts IS 'Receipts confirming NC download and controller-side program verification. / Bien nhan xac nhan nap NC va doi chieu chuong trinh tren may.';
CREATE INDEX idx_mndr_equipment_time ON mes_nc_download_receipts (equipment_id, downloaded_at DESC);
CREATE INDEX idx_mndr_work_order ON mes_nc_download_receipts (work_order_number, downloaded_at DESC);

CREATE TABLE mes_tool_preset_offsets (
    preset_id                VARCHAR(80)     PRIMARY KEY,
    tool_id                  VARCHAR(50)     REFERENCES tools(tool_id),
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    work_order_number        VARCHAR(80),
    offset_number            VARCHAR(50),
    preset_length_mm         NUMERIC(12,4),
    preset_diameter_mm       NUMERIC(12,4),
    wear_offset_mm           NUMERIC(12,4),
    offset_drift_mm          NUMERIC(12,4),
    measurement_source       VARCHAR(50)     DEFAULT 'presetter',
    measured_at              TIMESTAMPTZ     NOT NULL,
    measured_by              VARCHAR(50),
    verified_status          VARCHAR(30)     NOT NULL DEFAULT 'verified',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_tool_preset_offsets IS 'Preset and offset verification lineage for shop-floor tools. / Lineage xac nhan preset va offset cho dao dung tai hien truong.';
CREATE INDEX idx_mtpo_tool_time ON mes_tool_preset_offsets (tool_id, measured_at DESC);
CREATE INDEX idx_mtpo_equipment_time ON mes_tool_preset_offsets (equipment_id, measured_at DESC);

CREATE TABLE mes_tool_assemblies (
    assembly_id              VARCHAR(80)     PRIMARY KEY,
    parent_tool_id           VARCHAR(50)     REFERENCES tools(tool_id),
    component_tool_id        VARCHAR(50)     REFERENCES tools(tool_id),
    component_role           VARCHAR(50)     NOT NULL,
    quantity_required        NUMERIC(12,2)   NOT NULL DEFAULT 1,
    effective_from           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    assembly_status          VARCHAR(30)     NOT NULL DEFAULT 'active',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE mes_tool_assemblies IS 'Reusable tool assembly/component relationships. / Quan he cum dao thanh phan tai su dung.';
CREATE INDEX idx_mta_parent ON mes_tool_assemblies (parent_tool_id, assembly_status);


-- ═══════════════════════════════════════════════════════
-- SECTION 20B: MES INDEXES ON EXISTING TABLES
-- ═══════════════════════════════════════════════════════

CREATE INDEX idx_equipment_machine_state ON equipment(machine_state);
CREATE INDEX idx_equipment_last_signal ON equipment(last_signal_at);
CREATE INDEX idx_equipment_connector ON equipment(connector_type);
CREATE INDEX idx_job_ops_actual_times ON job_operations(actual_start_time, actual_end_time);
CREATE INDEX idx_job_ops_program ON job_operations(program_id);
CREATE INDEX idx_labor_machine ON labor_transactions(machine_id_assigned);
CREATE INDEX idx_schedule_dispatch ON production_schedule(dispatch_priority, scheduled_start);
CREATE INDEX idx_tools_machine ON tools(current_machine_id);
CREATE INDEX idx_tools_life ON tools(tool_life_remaining_pct);


-- ═══════════════════════════════════════════════════════
-- SECTION 20C: MES VIEWS
-- ═══════════════════════════════════════════════════════

-- Live machine status view
CREATE OR REPLACE VIEW v_machine_status_live AS
SELECT e.equipment_id, e.equipment_name, e.machine_state,
       e.current_spindle_rpm, e.spindle_load_percent,
       e.current_program_id, e.current_tool_id,
       e.part_count_shift, e.last_signal_at,
       EXTRACT(EPOCH FROM (now() - e.last_signal_at)) AS signal_age_seconds,
       CASE WHEN EXTRACT(EPOCH FROM (now() - e.last_signal_at)) > e.heartbeat_sla_seconds
            THEN 'stale' ELSE 'live' END AS connection_status
FROM equipment e WHERE e.is_active = TRUE;

-- OEE summary view
CREATE OR REPLACE VIEW v_oee_current_shift AS
SELECT os.equipment_id AS machine_id, os.snapshot_date AS shift_date, os.shift_code AS shift_number,
       os.availability AS availability_pct, os.performance AS performance_pct,
       os.quality AS quality_pct, os.oee AS oee_pct,
       os.planned_production_time_sec / 3600.0 AS planned_hours,
       os.actual_run_time_sec / 3600.0 AS run_hours,
       os.downtime_sec / 3600.0 AS downtime_hours,
       os.total_pieces AS parts_produced,
       os.defect_pieces AS parts_scrapped
FROM mes_oee_snapshots os
WHERE os.snapshot_date = CURRENT_DATE
ORDER BY os.equipment_id;

-- Overdue PM view
CREATE OR REPLACE VIEW v_pm_overdue AS
SELECT e.equipment_id, e.equipment_name,
       mwo.scheduled_start, mwo.wo_type,
       CURRENT_DATE - mwo.scheduled_start::date AS days_overdue
FROM maintenance_work_orders mwo
JOIN equipment e ON e.equipment_id = mwo.equipment_id::varchar
WHERE mwo.wo_status IN ('requested','planned','scheduled')
  AND mwo.scheduled_start < now();

-- Active operator sessions
CREATE OR REPLACE VIEW v_active_operators AS
SELECT os.employee_id AS operator_id, u.full_name AS operator_name,
       os.equipment_id AS machine_id, e.equipment_name,
       os.login_at, os.shift_code,
       EXTRACT(EPOCH FROM (now() - os.login_at))/3600 AS hours_logged
FROM mes_operator_sessions os
JOIN users u ON u.employee_id = os.employee_id
LEFT JOIN equipment e ON e.equipment_id = os.equipment_id
WHERE os.logout_at IS NULL;

-- Dispatch queue view
CREATE OR REPLACE VIEW v_dispatch_queue AS
SELECT dq.*, jo.item_id, jo.order_qty, jo.pct_complete,
       e.equipment_name, e.machine_state
FROM mes_dispatch_queue dq
LEFT JOIN job_orders jo ON jo.job_number = dq.job_number
LEFT JOIN equipment e ON e.equipment_id = dq.equipment_id
WHERE dq.queue_status = 'QUEUED'
ORDER BY dq.priority_score DESC, dq.scheduled_start;

-- Adapter health overview
CREATE OR REPLACE VIEW v_mes_adapter_health AS
SELECT a.adapter_id,
       a.equipment_id,
       a.adapter_name,
       a.adapter_type,
       a.adapter_status,
       a.last_validated_at,
       e.current_state,
       e.last_seen_at
FROM mes_connectivity_adapters a
LEFT JOIN mes_equipment_extended e ON e.equipment_id = a.equipment_id;

-- NC release readiness
CREATE OR REPLACE VIEW v_mes_nc_release_readiness AS
SELECT p.package_id,
       p.program_id,
       p.item_id,
       p.revision_code,
       p.operation_seq,
       p.package_status,
       r.equipment_id,
       r.work_order_number,
       r.downloaded_at,
       r.verified_match,
       r.receipt_status
FROM mes_nc_release_packages p
LEFT JOIN mes_nc_download_receipts r
  ON r.package_id = p.package_id;


-- ═══════════════════════════════════════════════════════
-- SECTION 20D: MES TRIGGER FUNCTIONS
-- ═══════════════════════════════════════════════════════

-- Auto-create downtime event when machine state changes from productive
CREATE OR REPLACE FUNCTION fn_machine_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.machine_state = 'productive' AND NEW.machine_state != 'productive' THEN
    INSERT INTO mes_downtime_events (machine_id, start_time, state_from, state_to)
    VALUES (NEW.equipment_id, now(), OLD.machine_state::text, NEW.machine_state::text);
  END IF;
  IF OLD.machine_state != 'productive' AND NEW.machine_state = 'productive' THEN
    UPDATE mes_downtime_events
    SET end_time = now(), duration_seconds = EXTRACT(EPOCH FROM (now() - start_time))
    WHERE machine_id = NEW.equipment_id AND end_time IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_machine_state_change
AFTER UPDATE OF machine_state ON equipment
FOR EACH ROW EXECUTE FUNCTION fn_machine_state_change();

-- Auto-decrement tool life on cycle complete
CREATE OR REPLACE FUNCTION fn_tool_life_decrement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tool_id_used IS NOT NULL AND NEW.part_count_actual > COALESCE(OLD.part_count_actual, 0) THEN
    UPDATE tools SET
      tool_life_parts_count = tool_life_parts_count + (NEW.part_count_actual - COALESCE(OLD.part_count_actual, 0)),
      tool_usage_parts_total = tool_usage_parts_total + (NEW.part_count_actual - COALESCE(OLD.part_count_actual, 0)),
      tool_life_remaining_pct = GREATEST(0, 100.0 - (tool_life_parts_count::numeric / NULLIF(tool_life_total_parts, 0) * 100))
    WHERE tool_id = NEW.tool_id_used;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tool_life_on_production
AFTER UPDATE OF part_count_actual ON job_operations
FOR EACH ROW EXECUTE FUNCTION fn_tool_life_decrement();


-- ============================================================================
-- END OF SCHEMA
-- KET THUC SCHEMA
-- ============================================================================
-- Total tables:  103 + 30 MES tables (+ partitions)
-- Total views:   8 + 5 MES views
-- Total functions: 5 + 2 MES functions
-- Total ENUMs:   ~80 + ~10 MES enums
-- Covers: 1,061 variables across 53 categories from variable_library.json
-- MES: ISA-95 / SEMI E10 / MTConnect / TimescaleDB compliant
-- ============================================================================
