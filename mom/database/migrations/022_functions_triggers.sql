-- Migration: 022_functions_triggers.sql
-- Description: ALL functions, triggers, and stored procedures - generate_record_id, bitemporal_update, calculate_rpn, set_updated_at, audit_event_logger
-- Dependencies: 002_core_system.sql, 005_record_management.sql
-- Rollback: DROP triggers (see rollback section), then DROP FUNCTION set_updated_at, audit_event_logger, calculate_rpn, bitemporal_update, generate_record_id;

BEGIN;

-- ---------------------------------------------------------------------------
-- generate_record_id() - Auto-generate record IDs like NCR-2026-001
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
-- bitemporal_update() - Helper for bitemporal updates
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
-- calculate_rpn() - Calculate Risk Priority Number
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
-- set_updated_at() - Trigger function for updated_at columns
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
-- audit_event_logger() - Generic audit event trigger
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

COMMIT;

-- Rollback:
-- DROP TRIGGER IF EXISTS trg_records_audit ON records;
-- DROP TRIGGER IF EXISTS trg_documents_audit ON documents;
-- DROP TRIGGER IF EXISTS trg_ncr_records_audit ON ncr_records;
-- DROP TRIGGER IF EXISTS trg_capa_records_audit ON capa_records;
-- DROP TRIGGER IF EXISTS trg_fai_records_audit ON fai_records;
-- DROP TRIGGER IF EXISTS trg_calibration_records_audit ON calibration_records;
-- DROP TRIGGER IF EXISTS trg_job_orders_audit ON job_orders;
-- DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
-- DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
-- DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
-- ... (repeat for all 26 updated_at triggers)
-- DROP FUNCTION IF EXISTS audit_event_logger();
-- DROP FUNCTION IF EXISTS set_updated_at();
-- DROP FUNCTION IF EXISTS calculate_rpn(INT, INT, INT);
-- DROP FUNCTION IF EXISTS bitemporal_update(TEXT, TEXT, TEXT, JSONB);
-- DROP FUNCTION IF EXISTS generate_record_id(record_type_enum, INT);
