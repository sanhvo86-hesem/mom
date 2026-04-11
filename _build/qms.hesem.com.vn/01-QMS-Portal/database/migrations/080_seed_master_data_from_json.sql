-- Migration: 080_seed_master_data_from_json.sql
-- Description: Seed master data from JSON into PostgreSQL tables.
--              Uses INSERT ... ON CONFLICT DO NOTHING to skip duplicates.
-- Dependencies: 006, 007, 008
-- Rollback: DELETE FROM item_revisions WHERE item_id IN ('714-1101','P-1001','P-2003','FLG-200');
--           DELETE FROM items WHERE item_id IN ('714-1101','P-1001','P-2003','FLG-200');
--           DELETE FROM customers WHERE customer_id IN ('CUS-LAM','CUS-ACME','CUS-GLOBEX');
--           DELETE FROM vendors WHERE vendor_id IN ('SUP-ACOAT','SUP-MITUTOYO','SUP-KIMLONG');
--           DELETE FROM work_centers WHERE work_center_id IN ('WC-5AX','WC-3AX','WC-QA','WC-MNT');

BEGIN;

-- ================================================================
-- 1. CUSTOMERS (3 records)
-- ================================================================
INSERT INTO customers (customer_id, customer_name, customer_name_vi, customer_type, customer_status, primary_contact, contact_email, metadata)
VALUES
  ('CUS-LAM', 'Lam Research', 'Lam Research', 'oem', 'active', 'SQE Desk', 'sqe@lam.example', '{"site_code":"LAM-US"}'::jsonb),
  ('CUS-ACME', 'ACME Industries', 'ACME Industries', 'tier1', 'active', 'John Smith', 'john.smith@acme.example', '{"site_code":"ACME-SG"}'::jsonb),
  ('CUS-GLOBEX', 'Globex Corporation', 'Globex Corporation', 'tier1', 'active', 'Jane Doe', 'jane.doe@globex.example', '{"site_code":"GLOBEX-VN"}'::jsonb)
ON CONFLICT (customer_id) DO NOTHING;

-- ================================================================
-- 2. VENDORS / SUPPLIERS (3 records)
-- ================================================================
INSERT INTO vendors (vendor_id, vendor_name, vendor_name_vi, vendor_type, vendor_status, primary_contact, contact_email, approved_process_list, metadata)
VALUES
  ('SUP-ACOAT', 'A-Coat Surface Treatment', 'A-Coat Surface Treatment', 'subcontract', 'approved', 'Planner', 'planner@acoat.example', 'surface_treatment', '{"approved_customers":["CUS-LAM"]}'::jsonb),
  ('SUP-MITUTOYO', 'Mitutoyo Vietnam', 'Mitutoyo Vietnam', 'service', 'approved', 'Service Desk', 'service@mitutoyo.example', 'calibration', '{"approved_customers":["CUS-LAM","CUS-ACME"]}'::jsonb),
  ('SUP-KIMLONG', 'Kim Long Precision Supply', 'Kim Long Precision Supply', 'material', 'approved', 'Buyer 02', 'buyer@kimlong.example', 'raw_material_supply', '{"approved_customers":["CUS-GLOBEX","CUS-ACME"]}'::jsonb)
ON CONFLICT (vendor_id) DO NOTHING;

-- ================================================================
-- 3. ITEMS / PARTS (4 records)
-- ================================================================
INSERT INTO items (item_id, description, description_vi, item_status, preferred_vendor_id, lot_tracked, serial_tracked, material_type, material_grade, drawing_number, customer_part_number, metadata)
VALUES
  ('714-1101', 'Valve Housing, 17-4PH', 'Valve Housing, 17-4PH', 'active', 'SUP-ACOAT', TRUE, FALSE, NULL, NULL, NULL, NULL, '{"customer_id":"CUS-LAM","traceability_level":"lot_heat","material_trace_required":"yes","required_trace_fields":"material_lot_number, heat_number, traveler_number, traveler_status, material_cert_status"}'::jsonb),
  ('P-1001', 'Mounting Bracket, AL6061', 'Mounting Bracket, AL6061', 'active', 'SUP-KIMLONG', TRUE, FALSE, NULL, NULL, NULL, NULL, '{"customer_id":"CUS-ACME","traceability_level":"lot","material_trace_required":"yes","required_trace_fields":"material_lot_number, traveler_number, traveler_status, material_cert_status"}'::jsonb),
  ('P-2003', 'Drive Shaft, 316SS', 'Drive Shaft, 316SS', 'active', 'SUP-KIMLONG', TRUE, FALSE, NULL, NULL, NULL, NULL, '{"customer_id":"CUS-GLOBEX","traceability_level":"lot_heat","material_trace_required":"yes","required_trace_fields":"material_lot_number, heat_number, traveler_number, traveler_status, material_cert_status"}'::jsonb),
  ('FLG-200', 'Titanium Flange Ti-6Al-4V', 'Titanium Flange Ti-6Al-4V', 'active', NULL, TRUE, TRUE, 'Titanium', 'Ti-6Al-4V', 'DWG-FLG-200', NULL, '{}'::jsonb)
ON CONFLICT (item_id) DO NOTHING;

-- ================================================================
-- 4. ITEM REVISIONS (3 records)
-- ================================================================
INSERT INTO item_revisions (item_id, rev, valid_from, metadata)
VALUES
  ('714-1101', 'REV-C', '2026-03-10'::timestamptz, '{"status":"released"}'::jsonb),
  ('P-1001', 'REV-C', '2026-02-18'::timestamptz, '{"status":"released"}'::jsonb),
  ('P-2003', 'REV-B', '2026-01-21'::timestamptz, '{"status":"released"}'::jsonb)
ON CONFLICT (item_id, rev) DO NOTHING;

-- ================================================================
-- 5. WORK CENTERS (4 records)
-- ================================================================
INSERT INTO work_centers (work_center_id, work_center_name, work_center_name_vi, department_id, is_active, metadata)
VALUES
  ('WC-5AX', '5-Axis Machining Cell', '5-Axis Machining Cell', 'PRO', TRUE, '{"process_family":"5-axis","area":"Xưởng CNC A"}'::jsonb),
  ('WC-3AX', 'VMC Production Cell', 'VMC Production Cell', 'PRO', TRUE, '{"process_family":"3-axis","area":"Xưởng CNC B"}'::jsonb),
  ('WC-QA', 'Final Inspection Cell', 'Final Inspection Cell', 'QA', TRUE, '{"process_family":"inspection","area":"Phòng QA"}'::jsonb),
  ('WC-MNT', 'Maintenance Support Cell', 'Maintenance Support Cell', NULL, TRUE, '{"process_family":"maintenance","area":"Utility Bay"}'::jsonb)
ON CONFLICT (work_center_id) DO NOTHING;

-- ================================================================
-- 6. MASTER DATA GENERIC TABLE (for entities without dedicated tables)
-- ================================================================
CREATE TABLE IF NOT EXISTS master_data_store (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(60)     NOT NULL,
    entity_id       VARCHAR(100)    NOT NULL,
    data            JSONB           NOT NULL DEFAULT '{}',
    status          VARCHAR(30)     NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      VARCHAR(100),
    UNIQUE (entity_type, entity_id)
);
COMMENT ON TABLE master_data_store IS 'Generic master data store for entities without dedicated tables (machines, operators, tooling, etc.)';

CREATE INDEX IF NOT EXISTS idx_mds_entity_type ON master_data_store(entity_type);
CREATE INDEX IF NOT EXISTS idx_mds_entity_type_status ON master_data_store(entity_type, status);
CREATE INDEX IF NOT EXISTS idx_mds_data ON master_data_store USING gin(data);

-- ================================================================
-- 7. MACHINES (4 records → master_data_store)
-- ================================================================
INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('machines', 'MC-5AX-01', 'active', '{"machine_id":"MC-5AX-01","machine_name":"Makino DA300","work_center_id":"WC-5AX","machine_type":"5-axis","location":"Xưởng CNC A - Line 01","telemetry_mode":"machine","connector_type":"mtconnect","connector_name":"Makino MTConnect Adapter","connector_endpoint":"https://mes.hesem.local/mtconnect/mc-5ax-01/current","heartbeat_sla_seconds":90,"preferred_operator_id":"OPR-001"}'::jsonb),
  ('machines', 'MC-3AX-04', 'active', '{"machine_id":"MC-3AX-04","machine_name":"Brother S700X2","work_center_id":"WC-3AX","machine_type":"3-axis","location":"Xưởng CNC B - Line 02","telemetry_mode":"machine","connector_type":"opcua","connector_name":"Brother OPC UA Bridge","connector_endpoint":"opc.tcp://192.168.10.44:4840","heartbeat_sla_seconds":120,"preferred_operator_id":"OPR-014"}'::jsonb),
  ('machines', 'CMM-01', 'active', '{"machine_id":"CMM-01","machine_name":"Mitutoyo Crysta-Apex","work_center_id":"WC-QA","machine_type":"cmm","location":"Phòng QA - CMM Zone","telemetry_mode":"manual","connector_type":"manual_bridge","connector_name":"CMM Manual Bridge","preferred_operator_id":"QC-002"}'::jsonb),
  ('machines', 'CNC-07', 'active', '{"machine_id":"CNC-07","machine_name":"Mazak Integrex i-200S (Turn-Mill)","work_center_id":"WC-TURN","machine_type":"turn_mill","location":"Xưởng B - Bay 1"}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ================================================================
-- 8. OPERATORS (4 records → master_data_store)
-- ================================================================
INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('operators', 'OPR-001', 'active', '{"operator_id":"OPR-001","operator_name":"Nguyễn Văn An","role":"operator","work_center_id":"WC-5AX","shift":"1","skills":"5-axis, setup, prove-out","qualification_status":"active","qualification_expiry":"2026-12-31","qualified_machine_types":"5-axis","qualified_machine_ids":"MC-5AX-01","qualified_work_centers":"WC-5AX","certified_processes":"5-axis machining, prove-out, setup"}'::jsonb),
  ('operators', 'OPR-014', 'active', '{"operator_id":"OPR-014","operator_name":"Trần Minh Khang","role":"operator","work_center_id":"WC-3AX","shift":"2","skills":"3-axis, VMC, tool offsets","qualification_status":"expired","qualification_expiry":"2026-03-15","qualified_machine_types":"3-axis","qualified_work_centers":"WC-3AX","certified_processes":"3-axis machining, setup"}'::jsonb),
  ('operators', 'QC-002', 'active', '{"operator_id":"QC-002","operator_name":"Lê Thu Hà","role":"qc_inspector","work_center_id":"WC-QA","shift":"day","skills":"CMM, FAI, final inspection","qualification_status":"active","qualification_expiry":"2026-11-30","qualified_machine_types":"cmm","qualified_machine_ids":"CMM-01","qualified_work_centers":"WC-QA","certified_processes":"CMM, FAI, final inspection"}'::jsonb),
  ('operators', 'MNT-001', 'active', '{"operator_id":"MNT-001","operator_name":"Phạm Quốc Dũng","role":"maintenance_tech","work_center_id":"WC-MNT","shift":"day","skills":"PM, spindle, coolant, pneumatics","qualification_status":"active","qualification_expiry":"2026-10-31","qualified_machine_types":"5-axis,3-axis,cmm","qualified_machine_ids":"MC-5AX-01,MC-3AX-04,CMM-01","qualified_work_centers":"WC-MNT,WC-5AX,WC-3AX,WC-QA","certified_processes":"maintenance, PM, spindle, coolant, pneumatics"}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ================================================================
-- 9. TOOLING ASSETS (4 records → master_data_store)
-- ================================================================
INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('tooling_assets', 'TOOL-EM10-01', 'active', '{"tool_id":"TOOL-EM10-01","tool_name":"End Mill ⌀10 Carbide","tool_type":"end_mill","machine_type":"5-axis","preferred_work_center_id":"WC-5AX","life_limit_minutes":180,"life_limit_parts":600,"warning_pct":80}'::jsonb),
  ('tooling_assets', 'TOOL-EM06-01', 'active', '{"tool_id":"TOOL-EM06-01","tool_name":"End Mill ⌀6 Carbide","tool_type":"end_mill","machine_type":"3-axis","preferred_work_center_id":"WC-3AX","life_limit_minutes":120,"life_limit_parts":400,"warning_pct":75}'::jsonb),
  ('tooling_assets', 'TOOL-DR08-01', 'active', '{"tool_id":"TOOL-DR08-01","tool_name":"Drill ⌀8 HSS","tool_type":"drill","machine_type":"3-axis","preferred_work_center_id":"WC-3AX","life_limit_minutes":60,"life_limit_parts":200,"warning_pct":80}'::jsonb),
  ('tooling_assets', 'TOOL-TAP-M6', 'active', '{"tool_id":"TOOL-TAP-M6","tool_name":"Thread Tap M6×1.0","tool_type":"tap","machine_type":"3-axis","preferred_work_center_id":"WC-3AX","life_limit_minutes":45,"life_limit_parts":150,"warning_pct":70}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ================================================================
-- 10. DOWNTIME REASON CODES (7 records → master_data_store)
-- ================================================================
INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('downtime_reason_codes', 'DT-MECH', 'active', '{"reason_code":"DT-MECH","reason_name":"Mechanical Failure","reason_name_vi":"Hư hỏng cơ khí","category":"unplanned","reason_group":"mechanical","default_severity":"critical","planned_flag":false,"escalation_sla_minutes":30}'::jsonb),
  ('downtime_reason_codes', 'DT-ELEC', 'active', '{"reason_code":"DT-ELEC","reason_name":"Electrical Fault","reason_name_vi":"Sự cố điện","category":"unplanned","reason_group":"electrical","default_severity":"high","planned_flag":false,"escalation_sla_minutes":45}'::jsonb),
  ('downtime_reason_codes', 'DT-COOL', 'active', '{"reason_code":"DT-COOL","reason_name":"Coolant Issue","reason_name_vi":"Lỗi dung dịch","category":"unplanned","reason_group":"fluid","default_severity":"medium","planned_flag":false,"escalation_sla_minutes":60}'::jsonb),
  ('downtime_reason_codes', 'DT-TOOL', 'active', '{"reason_code":"DT-TOOL","reason_name":"Tool Breakage","reason_name_vi":"Gãy dao","category":"unplanned","reason_group":"tooling","default_severity":"high","planned_flag":false,"escalation_sla_minutes":15}'::jsonb),
  ('downtime_reason_codes', 'DT-PM', 'active', '{"reason_code":"DT-PM","reason_name":"Preventive Maintenance","reason_name_vi":"Bảo trì định kỳ","category":"planned","reason_group":"maintenance","default_severity":"info","planned_flag":true,"escalation_sla_minutes":0}'::jsonb),
  ('downtime_reason_codes', 'DT-SETUP', 'active', '{"reason_code":"DT-SETUP","reason_name":"Setup / Changeover","reason_name_vi":"Cài đặt / Chuyển đổi","category":"planned","reason_group":"setup","default_severity":"info","planned_flag":true,"escalation_sla_minutes":0}'::jsonb),
  ('downtime_reason_codes', 'DT-MAT', 'active', '{"reason_code":"DT-MAT","reason_name":"Material Shortage","reason_name_vi":"Thiếu vật liệu","category":"unplanned","reason_group":"material","default_severity":"high","planned_flag":false,"escalation_sla_minutes":60}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ================================================================
-- 11. DEFECT CATALOG (6 records → master_data_store)
-- ================================================================
INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('defect_catalog', 'DEF-DIM', 'active', '{"defect_code":"DEF-DIM","defect_name":"Dimensional Out of Tolerance","defect_name_vi":"Kích thước ngoài dung sai","defect_group":"dimensional","severity_default":"major"}'::jsonb),
  ('defect_catalog', 'DEF-SURF', 'active', '{"defect_code":"DEF-SURF","defect_name":"Surface Finish Non-Conformance","defect_name_vi":"Bề mặt không đạt","defect_group":"surface","severity_default":"major"}'::jsonb),
  ('defect_catalog', 'DEF-SCRATCH', 'active', '{"defect_code":"DEF-SCRATCH","defect_name":"Scratch / Nick","defect_name_vi":"Xước / Trầy","defect_group":"cosmetic","severity_default":"minor"}'::jsonb),
  ('defect_catalog', 'DEF-BURR', 'active', '{"defect_code":"DEF-BURR","defect_name":"Burr / Sharp Edge","defect_name_vi":"Bavia / Cạnh sắc","defect_group":"deburr","severity_default":"minor"}'::jsonb),
  ('defect_catalog', 'DEF-CRACK', 'active', '{"defect_code":"DEF-CRACK","defect_name":"Crack / Fracture","defect_name_vi":"Nứt / Gãy","defect_group":"structural","severity_default":"critical"}'::jsonb),
  ('defect_catalog', 'DEF-THREAD', 'active', '{"defect_code":"DEF-THREAD","defect_name":"Thread Damage","defect_name_vi":"Hư ren","defect_group":"threading","severity_default":"major"}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ================================================================
-- 12. MES CONNECTIVITY ADAPTERS (3 records → master_data_store)
-- ================================================================
INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('mes_connectivity_adapters', 'ADAPT-5AX-01', 'active', '{"adapter_id":"ADAPT-5AX-01","machine_id":"MC-5AX-01","adapter_name":"Makino MTConnect Adapter","adapter_type":"mtconnect","transport_protocol":"HTTPS","endpoint_url":"https://mes.hesem.local/mtconnect/mc-5ax-01/current","poll_interval_seconds":5,"heartbeat_sla_seconds":90}'::jsonb),
  ('mes_connectivity_adapters', 'ADAPT-3AX-04', 'active', '{"adapter_id":"ADAPT-3AX-04","machine_id":"MC-3AX-04","adapter_name":"Brother OPC UA Bridge","adapter_type":"opcua","transport_protocol":"OPC-UA","endpoint_url":"opc.tcp://192.168.10.44:4840","poll_interval_seconds":3,"heartbeat_sla_seconds":120}'::jsonb),
  ('mes_connectivity_adapters', 'ADAPT-CMM-01', 'active', '{"adapter_id":"ADAPT-CMM-01","machine_id":"CMM-01","adapter_name":"CMM Manual Bridge","adapter_type":"manual_bridge","transport_protocol":"manual","endpoint_url":"manual://cmm-01","poll_interval_seconds":0,"heartbeat_sla_seconds":180}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ================================================================
-- 13. CAPAS (3 records → master_data_store)
-- ================================================================
INSERT INTO master_data_store (entity_type, entity_id, status, data) VALUES
  ('capas', 'CAPA-2026-001', 'open', '{"capa_number":"CAPA-2026-001","title":"Recurring dimensional NCR on 714-1101 bore","customer_id":"CUS-LAM","part_number":"714-1101","opened_date":"2026-03-20"}'::jsonb),
  ('capas', 'CAPA-2026-002', 'open', '{"capa_number":"CAPA-2026-002","title":"Surface finish OOT on P-1001 flange face","customer_id":"CUS-ACME","part_number":"P-1001","opened_date":"2026-03-25"}'::jsonb),
  ('capas', 'CAPA-2026-003', 'in_progress', '{"capa_number":"CAPA-2026-003","title":"Tool breakage root cause for high-speed roughing","customer_id":"CUS-GLOBEX","part_number":"P-2003","opened_date":"2026-04-01"}'::jsonb)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ================================================================
-- Verification
-- ================================================================
DO $$
DECLARE
    c_cust INT; c_vend INT; c_item INT; c_rev INT; c_wc INT; c_mds INT;
BEGIN
    SELECT count(*) INTO c_cust FROM customers;
    SELECT count(*) INTO c_vend FROM vendors;
    SELECT count(*) INTO c_item FROM items;
    SELECT count(*) INTO c_rev FROM item_revisions;
    SELECT count(*) INTO c_wc FROM work_centers;
    SELECT count(*) INTO c_mds FROM master_data_store;
    RAISE NOTICE '[SEED] customers=%, vendors=%, items=%, item_revisions=%, work_centers=%, master_data_store=%',
        c_cust, c_vend, c_item, c_rev, c_wc, c_mds;
END $$;

COMMIT;
