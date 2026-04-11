-- Migration: 001_extensions_and_types.sql
-- Description: PostgreSQL extensions (pgvector, pg_trgm, btree_gist, uuid-ossp, pgcrypto) and all ENUM types
-- Dependencies: None (must run first)
-- Rollback: DROP all ENUM types, then DROP all extensions

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
DO $$
DECLARE
    required_extension TEXT;
    required_extensions CONSTANT TEXT[] := ARRAY[
        'uuid-ossp',
        'pgcrypto',
        'pg_trgm',
        'btree_gist',
        'vector'
    ];
BEGIN
    FOREACH required_extension IN ARRAY required_extensions LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_extension
            WHERE extname = required_extension
        ) THEN
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_roles
            WHERE rolname = current_user
              AND rolsuper = TRUE
        ) THEN
            EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I', required_extension);
            CONTINUE;
        END IF;

        RAISE EXCEPTION
            'Extension "%" is required before running migrations with role "%". Pre-create it as a superuser.',
            required_extension,
            current_user;
    END LOOP;
END $$;

-- NOTE: Apache AGE must be installed separately:
-- CREATE EXTENSION IF NOT EXISTS age;
-- SET search_path = ag_catalog, "$user", public;

-- ============================================================================
-- CUSTOM ENUM TYPES
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

COMMIT;

-- Rollback:
-- DROP TYPE IF EXISTS machine_type_enum, form_pack_enum, delivery_mode_enum, portal_lang CASCADE;
-- DROP TYPE IF EXISTS cleaning_method_enum, contamination_type_enum, cleanliness_level_enum CASCADE;
-- DROP TYPE IF EXISTS incident_type_enum, confidentiality_enum, char_type_enum CASCADE;
-- DROP TYPE IF EXISTS compliance_status_enum, jurisdiction_enum, license_type_enum, export_class_enum CASCADE;
-- DROP TYPE IF EXISTS subcontract_process_enum, subcontract_type_enum CASCADE;
-- DROP TYPE IF EXISTS gate_status_enum, npi_gate_enum, npi_phase_enum CASCADE;
-- DROP TYPE IF EXISTS cert_type_enum, spc_chart_type_enum, sampling_standard_enum, sampling_plan_enum CASCADE;
-- DROP TYPE IF EXISTS insp_type_erp, rma_disposition_enum, rma_type_enum, rma_status_enum CASCADE;
-- DROP TYPE IF EXISTS project_status_enum, project_type_enum, freight_terms_enum, shipment_status_enum CASCADE;
-- DROP TYPE IF EXISTS constraint_type_enum, schedule_type_enum, tool_location_enum, tool_holder_type_enum CASCADE;
-- DROP TYPE IF EXISTS tool_coating_enum, tool_material_enum, tool_type_enum CASCADE;
-- DROP TYPE IF EXISTS pm_frequency_enum, maint_priority, criticality_rating, equip_type_maint CASCADE;
-- DROP TYPE IF EXISTS maint_wo_status, maint_wo_type, match_status_enum, aging_bucket_enum CASCADE;
-- DROP TYPE IF EXISTS payment_status_enum, invoice_type_enum, gl_account_type CASCADE;
-- DROP TYPE IF EXISTS variance_type_enum, cost_group_enum, cost_method_enum, cost_type_enum CASCADE;
-- DROP TYPE IF EXISTS pay_type_enum, labor_type_enum, job_status_enum, job_type_enum CASCADE;
-- DROP TYPE IF EXISTS time_bucket_enum, safety_stock_method_enum, lot_size_rule_enum CASCADE;
-- DROP TYPE IF EXISTS demand_source_enum, mrp_status_enum, planned_order_type CASCADE;
-- DROP TYPE IF EXISTS stock_type_enum, inv_conformance_enum, industry_code_enum, customer_type_enum CASCADE;
-- DROP TYPE IF EXISTS vendor_rating_grade, vendor_status_enum, vendor_type_enum CASCADE;
-- DROP TYPE IF EXISTS po_type_enum, po_status_enum, so_priority_enum, so_status_enum CASCADE;
-- DROP TYPE IF EXISTS scheduling_rule_enum, wc_type_enum, bom_component_type, bom_type_enum CASCADE;
-- DROP TYPE IF EXISTS abc_class_enum, erp_item_status, erp_item_type, kpi_status_enum CASCADE;
-- DROP TYPE IF EXISTS improvement_status_enum, reason_code_enum, ecr_status_enum, change_type_enum CASCADE;
-- DROP TYPE IF EXISTS risk_level_enum, risk_category_enum, grr_status_enum CASCADE;
-- DROP TYPE IF EXISTS cal_location_enum, cal_result_enum, audit_conclusion_enum CASCADE;
-- DROP TYPE IF EXISTS finding_grade_enum, finding_type_enum, audit_type_enum, training_type_enum CASCADE;
-- DROP TYPE IF EXISTS supplier_process_type, supplier_rating_enum, fai_reason_enum, fai_type_enum CASCADE;
-- DROP TYPE IF EXISTS nc_source_enum, capa_status_enum, ncr_status_enum, root_cause_method_enum CASCADE;
-- DROP TYPE IF EXISTS ncr_disposition_enum, defect_type_enum, lot_disposition_enum CASCADE;
-- DROP TYPE IF EXISTS measurement_unit, char_designator, asset_type_enum, gage_type_enum CASCADE;
-- DROP TYPE IF EXISTS machine_family_enum, shift_code, record_status, workflow_status CASCADE;
-- DROP TYPE IF EXISTS record_type_enum, control_status_enum, doc_status, doc_category_enum CASCADE;
-- DROP TYPE IF EXISTS doc_type_enum, dept_code CASCADE;
-- DROP EXTENSION IF EXISTS vector, btree_gist, pg_trgm, pgcrypto, "uuid-ossp";
