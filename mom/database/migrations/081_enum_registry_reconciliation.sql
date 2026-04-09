-- Migration: 081_enum_registry_reconciliation.sql
-- Description: Reconcile DB enum types with registry (status-options.json) as source of truth.
--   1) Expand so_status_enum with registry-side values (draft, quoted, confirmed, in_production)
--   2) Expand record_type_enum with 29 missing types from registry
--   3) Create wo_status_enum (previously missing)
--   4) Seed record_counters for new record types
--   5) Create missing reference lookup tables
-- Dependencies: 001_extensions_and_types.sql, 024_seed_data.sql, 064_master_data_governance.sql
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL < 12.
--       If using PG < 12, run these statements outside BEGIN/COMMIT.

-- ============================================================================
-- 1. EXPAND so_status_enum — add registry-side values
--    Current: open, released, in_progress, shipped, closed, cancelled
--    Registry: draft, quoted, confirmed, in_production, shipped, closed, cancelled
-- ============================================================================
ALTER TYPE so_status_enum ADD VALUE IF NOT EXISTS 'draft' BEFORE 'open';
ALTER TYPE so_status_enum ADD VALUE IF NOT EXISTS 'quoted' AFTER 'draft';
ALTER TYPE so_status_enum ADD VALUE IF NOT EXISTS 'confirmed' AFTER 'quoted';
ALTER TYPE so_status_enum ADD VALUE IF NOT EXISTS 'in_production' AFTER 'confirmed';

-- ============================================================================
-- 2. CREATE wo_status_enum — was completely missing from DB
--    Registry: scheduled, setup, running, inspection, completed, on_hold
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wo_status_enum') THEN
    CREATE TYPE wo_status_enum AS ENUM (
      'scheduled', 'setup', 'running', 'inspection', 'completed', 'on_hold'
    );
  END IF;
END $$;

-- ============================================================================
-- 3. EXPAND record_type_enum — add 29 missing types from registry
--    Current 13: NCR, CAPA, FAI, TRN, AUD, ECR, CAL, SCAR, IMP, MR, RISK,
--                DOWNTIME, PO-EXCEPTION
-- ============================================================================
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'RMA';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'NPI';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'CONCESSION';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'DEVIATION';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'REWORK';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'CUSTOMER-COMPLAINT';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'SUPPLIER-AUDIT';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'PART-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'TOOL-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'GAGE-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'FIXTURE-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'WORK-INSTRUCTION-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'SOP-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'ANNEX-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'JD-NUMBER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'PM-ORDER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'CM-ORDER';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'SPARE-PART';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'MSA';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'SPC-STUDY';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'PFMEA';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'CONTROL-PLAN';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'MATERIAL-CERT';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'SHIPPING-RELEASE';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'RECEIVING-RECORD';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'EHS-INCIDENT';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'DOC-CHANGE';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'NC-PROGRAM';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'COST-ESTIMATE';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'INTERNAL-AUDIT-PLAN';
ALTER TYPE record_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYEE-COMPETENCY';

-- ============================================================================
-- 4. SEED record_counters for new record types
--    Only inserts if the type doesn't already have a counter row
-- ============================================================================
BEGIN;

INSERT INTO record_counters (record_type, fiscal_year, last_number, counter_digits)
SELECT t.record_type, 2026, 0, t.digits
FROM (VALUES
  ('RMA', 3), ('NPI', 3), ('CONCESSION', 3), ('DEVIATION', 3),
  ('REWORK', 3), ('CUSTOMER-COMPLAINT', 3), ('SUPPLIER-AUDIT', 3),
  ('PART-NUMBER', 4), ('TOOL-NUMBER', 4), ('GAGE-NUMBER', 3),
  ('FIXTURE-NUMBER', 3), ('WORK-INSTRUCTION-NUMBER', 3), ('SOP-NUMBER', 3),
  ('ANNEX-NUMBER', 3), ('JD-NUMBER', 3), ('PM-ORDER', 4), ('CM-ORDER', 4),
  ('SPARE-PART', 4), ('MSA', 3), ('SPC-STUDY', 3), ('PFMEA', 3),
  ('CONTROL-PLAN', 3), ('MATERIAL-CERT', 4), ('SHIPPING-RELEASE', 4),
  ('RECEIVING-RECORD', 4), ('EHS-INCIDENT', 3), ('DOC-CHANGE', 3),
  ('NC-PROGRAM', 4), ('COST-ESTIMATE', 3), ('INTERNAL-AUDIT-PLAN', 2),
  ('EMPLOYEE-COMPETENCY', 3)
) AS t(record_type, digits)
WHERE NOT EXISTS (
  SELECT 1 FROM record_counters rc
  WHERE rc.record_type = t.record_type AND rc.fiscal_year = 2026
);

-- ============================================================================
-- 5. CREATE reference lookup tables for master data currently in JSON only
-- ============================================================================

-- 5a. Incoterms reference table
CREATE TABLE IF NOT EXISTS mdm_incoterms (
  incoterm_code   VARCHAR(10) PRIMARY KEY,
  label           TEXT NOT NULL,
  label_vi        TEXT,
  description     TEXT,
  year_version    SMALLINT DEFAULT 2020,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed standard incoterms
INSERT INTO mdm_incoterms (incoterm_code, label, label_vi, description) VALUES
  ('EXW', 'Ex Works', 'Giao tại xưởng', 'Seller makes goods available at their premises'),
  ('FCA', 'Free Carrier', 'Giao cho người vận chuyển', 'Seller delivers goods to a carrier nominated by buyer'),
  ('FAS', 'Free Alongside Ship', 'Giao dọc mạn tàu', 'Seller delivers goods alongside the vessel'),
  ('FOB', 'Free on Board', 'Giao lên tàu', 'Seller delivers goods on board the vessel'),
  ('CFR', 'Cost and Freight', 'Tiền hàng và cước', 'Seller pays costs and freight to destination port'),
  ('CIF', 'Cost Insurance Freight', 'Tiền hàng, bảo hiểm và cước', 'Seller pays costs, insurance and freight'),
  ('CPT', 'Carriage Paid To', 'Cước phí trả tới', 'Seller pays freight to destination'),
  ('CIP', 'Carriage Insurance Paid', 'Cước phí và bảo hiểm trả tới', 'Seller pays freight and insurance to destination'),
  ('DAP', 'Delivered at Place', 'Giao tại nơi đến', 'Seller delivers goods at named place of destination'),
  ('DPU', 'Delivered at Place Unloaded', 'Giao tại nơi đến đã dỡ hàng', 'Seller delivers and unloads goods at destination'),
  ('DDP', 'Delivered Duty Paid', 'Giao đã nộp thuế', 'Seller delivers goods cleared for import at destination')
ON CONFLICT (incoterm_code) DO NOTHING;

-- 5b. Payment terms reference table
CREATE TABLE IF NOT EXISTS mdm_payment_terms (
  term_code       VARCHAR(20) PRIMARY KEY,
  label           TEXT NOT NULL,
  label_vi        TEXT,
  net_days        INTEGER,
  discount_pct    NUMERIC(5,2) DEFAULT 0,
  discount_days   INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO mdm_payment_terms (term_code, label, label_vi, net_days) VALUES
  ('NET30', 'Net 30 Days', 'Thanh toán 30 ngày', 30),
  ('NET45', 'Net 45 Days', 'Thanh toán 45 ngày', 45),
  ('NET60', 'Net 60 Days', 'Thanh toán 60 ngày', 60),
  ('NET90', 'Net 90 Days', 'Thanh toán 90 ngày', 90),
  ('COD',   'Cash on Delivery', 'Thanh toán khi giao hàng', 0),
  ('CIA',   'Cash in Advance', 'Thanh toán trước', 0),
  ('2/10NET30', '2% 10 Net 30', '2% chiết khấu 10 ngày, net 30', 30)
ON CONFLICT (term_code) DO NOTHING;

-- 5c. Shipping methods reference table
CREATE TABLE IF NOT EXISTS mdm_shipping_methods (
  method_code     VARCHAR(30) PRIMARY KEY,
  label           TEXT NOT NULL,
  label_vi        TEXT,
  carrier_type    VARCHAR(20),  -- air, ground, sea, courier
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO mdm_shipping_methods (method_code, label, label_vi, carrier_type) VALUES
  ('AIR-PRIORITY', 'Air Priority', 'Đường hàng không ưu tiên', 'air'),
  ('AIR-STANDARD', 'Air Standard', 'Đường hàng không tiêu chuẩn', 'air'),
  ('COURIER-DHL', 'DHL Courier', 'Chuyển phát nhanh DHL', 'courier'),
  ('COURIER-FEDEX', 'FedEx Courier', 'Chuyển phát nhanh FedEx', 'courier'),
  ('TRUCK-DOMESTIC', 'Domestic Trucking', 'Vận tải nội địa', 'ground'),
  ('SEA-FCL', 'Sea Freight (Full Container)', 'Đường biển (nguyên container)', 'sea'),
  ('SEA-LCL', 'Sea Freight (Less than Container)', 'Đường biển (hàng lẻ)', 'sea'),
  ('CUSTOMER-PICKUP', 'Customer Pickup', 'Khách hàng tự lấy', 'pickup')
ON CONFLICT (method_code) DO NOTHING;

-- 5d. Promise policies reference table
CREATE TABLE IF NOT EXISTS mdm_promise_policies (
  policy_code     VARCHAR(30) PRIMARY KEY,
  label           TEXT NOT NULL,
  label_vi        TEXT,
  otd_target_pct  NUMERIC(5,2) DEFAULT 98.00,
  review_freq     VARCHAR(20) DEFAULT 'monthly',
  buffer_days     INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO mdm_promise_policies (policy_code, label, label_vi, otd_target_pct, review_freq, buffer_days) VALUES
  ('PROM-CRIT-AERO', 'Critical Aerospace', 'Hàng không quan trọng', 99.50, 'weekly', 2),
  ('PROM-STD-GLOBAL', 'Standard Global', 'Tiêu chuẩn toàn cầu', 95.00, 'monthly', 5)
ON CONFLICT (policy_code) DO NOTHING;

-- 5e. Form series metadata table
CREATE TABLE IF NOT EXISTS mdm_form_series (
  series_code     VARCHAR(10) PRIMARY KEY,  -- e.g. '100', '200', ...
  label           TEXT NOT NULL,
  label_vi        TEXT,
  description     TEXT,
  dept_owner      dept_code,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO mdm_form_series (series_code, label, label_vi, sort_order) VALUES
  ('100', 'QMS Governance & Management', 'Quản trị & Quản lý QMS', 1),
  ('200', 'Sales & Quoting', 'Kinh doanh & Báo giá', 2),
  ('300', 'Engineering & NPI', 'Kỹ thuật & NPI', 3),
  ('400', 'Supply Chain & Vendor', 'Chuỗi cung ứng & Nhà cung cấp', 4),
  ('500', 'Production & MES', 'Sản xuất & MES', 5),
  ('600', 'Quality & Calibration', 'Chất lượng & Hiệu chuẩn', 6),
  ('700', 'Logistics & Shipping', 'Kho vận & Giao nhận', 7),
  ('800', 'HR & Training', 'Nhân sự & Đào tạo', 8),
  ('900', 'Audit & Risk & Management Review', 'Đánh giá & Rủi ro & MR', 9)
ON CONFLICT (series_code) DO NOTHING;

COMMIT;
