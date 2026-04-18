-- Migration: 024_seed_data.sql
-- Description: ALL seed data - departments, roles, naming patterns, KPI definitions, record counters
-- Dependencies: 002_core_system.sql, 018_projects_kpi.sql, 019_system_tables.sql, 005_record_management.sql
-- Rollback: DELETE FROM record_counters; DELETE FROM kpi_definitions; DELETE FROM naming_patterns; DELETE FROM roles; DELETE FROM departments;

BEGIN;

-- ---------------------------------------------------------------------------
-- Departments
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
-- Core Roles
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
-- Naming patterns (P1-P6)
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
-- Initial KPI definitions
-- ---------------------------------------------------------------------------
INSERT INTO kpi_definitions (metric_code, kpi_name, kpi_name_vi, unit, target, frequency) VALUES
    ('OTD',   'On-Time Delivery Rate',        'Ty le giao hang dung han',      '%', 98.0, 'monthly'),
    ('FPY',   'First Pass Yield',              'Ty le dat lan dau',             '%', 95.0, 'weekly'),
    ('OEE',   'Overall Equipment Effectiveness','Hieu suat thiet bi tong the',  '%', 85.0, 'daily'),
    ('DPMO',  'Defects Per Million Opportunities','Loi tren trieu co hoi',      'ppm', 500, 'monthly'),
    ('CAPA_CLOSURE', 'CAPA Closure Rate',       'Ty le dong CAPA',              '%', 90.0, 'monthly'),
    ('CAL_COMPLIANCE', 'Calibration Compliance', 'Ty le tuan thu hieu chuan',   '%', 100.0, 'monthly'),
    ('SCRAP_RATE', 'Scrap Rate',                'Ty le phe pham',               '%', 2.0,  'weekly'),
    ('COMPLAINT_RATE', 'Customer Complaint Rate','Ty le khieu nai khach hang',   'ppm', 100, 'monthly'),
    ('SUPPLIER_QUAL', 'Supplier Quality Index',  'Chi so chat luong NCC',        '%', 95.0, 'quarterly'),
    ('TRAINING_COMP', 'Training Completion Rate','Ty le hoan thanh dao tao',     '%', 100.0, 'quarterly');

-- ---------------------------------------------------------------------------
-- Initial record counters for current year
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

COMMIT;

-- Rollback:
-- DELETE FROM record_counters WHERE fiscal_year = 2026;
-- DELETE FROM kpi_definitions WHERE metric_code IN ('OTD','FPY','OEE','DPMO','CAPA-CLOSE','CAL-COMP','SCRAP','CCR','SQI','TRN-COMP');
-- DELETE FROM naming_patterns WHERE pattern_name IN ('P1','P2','P3','P4','P5','P6');
-- DELETE FROM roles WHERE role_code IN ('ceo','production_director','cnc_workshop_manager','shift_leader','setup_technician','cnc_operator','deburr_team_lead','deburr_technician','production_planner','cleaning_packaging_supervisor','cleaning_packaging_technician','maintenance_technician','production_engineer','engineering_lead','process_engineer','dfm_engineer','cam_nc_programmer','qa_manager','quality_engineer','qc_inspector','qc_inspector_lead','qms_engineer','internal_auditor','metrology_specialist','supply_chain_manager','buyer','warehouse_clerk','tool_storekeeper','logistics_coordinator','estimator','customer_service','finance_manager','ap_ar_accountant','gl_payroll_accountant','hr_manager','ehs_specialist','it_admin','epicor_admin');
-- DELETE FROM departments;
