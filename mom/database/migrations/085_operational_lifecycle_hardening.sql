-- ============================================================================
-- Migration: 085_operational_lifecycle_hardening.sql
-- Description: Add governed lifecycle columns and recovery metadata to
--              operational entities that were previously stateless or
--              under-specified.
-- Dependencies: 011_quality.sql, 012_calibration_equipment.sql,
--               013_training_hr.sql, 053_crm_pipeline_management.sql,
--               061_quality_lab_compliance.sql, 070_enterprise_governance_uplift.sql
-- Rollback: Manual rollback only.
-- ============================================================================

BEGIN;

ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS equipment_status VARCHAR(30);
UPDATE equipment
SET equipment_status = CASE
    WHEN COALESCE(is_active, FALSE) = FALSE THEN 'retired'
    WHEN calibration_due IS NOT NULL AND calibration_due < CURRENT_DATE THEN 'on_hold'
    ELSE 'active'
END
WHERE equipment_status IS NULL;
ALTER TABLE equipment
    ALTER COLUMN equipment_status SET DEFAULT 'active',
    ALTER COLUMN equipment_status SET NOT NULL;
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS chk_equipment_equipment_status;
ALTER TABLE equipment
    ADD CONSTRAINT chk_equipment_equipment_status
    CHECK (equipment_status IN ('commissioning', 'qualified', 'active', 'on_hold', 'lockout', 'retired', 'archived'));
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment (equipment_status);

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS tool_status VARCHAR(30);
UPDATE tools
SET tool_status = CASE
    WHEN COALESCE(tool_breakage_detected, FALSE) = TRUE THEN 'broken'
    WHEN COALESCE(tool_life_remaining_pct, 100) <= 10 THEN 'worn'
    WHEN COALESCE(tool_on_hand_qty, 0) > 0 THEN 'qualified'
    ELSE 'new'
END
WHERE tool_status IS NULL;
ALTER TABLE tools
    ALTER COLUMN tool_status SET DEFAULT 'new',
    ALTER COLUMN tool_status SET NOT NULL;
ALTER TABLE tools DROP CONSTRAINT IF EXISTS chk_tools_tool_status;
ALTER TABLE tools
    ADD CONSTRAINT chk_tools_tool_status
    CHECK (tool_status IN ('new', 'qualified', 'in_use', 'worn', 'broken', 'retired', 'archived'));
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools (tool_status);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS employment_status VARCHAR(30);
UPDATE employees
SET employment_status = CASE
    WHEN termination_date IS NOT NULL AND termination_date <= CURRENT_DATE THEN 'terminated'
    WHEN COALESCE(is_active, FALSE) = FALSE THEN 'inactive'
    WHEN hire_date IS NULL THEN 'preboarding'
    ELSE 'active'
END
WHERE employment_status IS NULL;
ALTER TABLE employees
    ALTER COLUMN employment_status SET DEFAULT 'preboarding',
    ALTER COLUMN employment_status SET NOT NULL;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS chk_employees_employment_status;
ALTER TABLE employees
    ADD CONSTRAINT chk_employees_employment_status
    CHECK (employment_status IN ('preboarding', 'active', 'suspended', 'inactive', 'terminated', 'archived'));
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees (employment_status);

ALTER TABLE ehs_incidents
    ADD COLUMN IF NOT EXISTS incident_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS reported_by_employee_id VARCHAR(20) REFERENCES employees(employee_id),
    ADD COLUMN IF NOT EXISTS qual_compliance_obligation_id UUID REFERENCES qual_compliance_obligations(qual_compliance_obligation_id),
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
UPDATE ehs_incidents
SET incident_status = CASE
    WHEN corrective_action IS NOT NULL AND btrim(corrective_action) <> '' THEN 'contained'
    ELSE 'reported'
END
WHERE incident_status IS NULL;
ALTER TABLE ehs_incidents
    ALTER COLUMN incident_status SET DEFAULT 'reported',
    ALTER COLUMN incident_status SET NOT NULL;
ALTER TABLE ehs_incidents DROP CONSTRAINT IF EXISTS chk_ehs_incidents_incident_status;
ALTER TABLE ehs_incidents
    ADD CONSTRAINT chk_ehs_incidents_incident_status
    CHECK (incident_status IN ('reported', 'triaged', 'contained', 'investigating', 'corrective_action', 'closed', 'archived'));
CREATE INDEX IF NOT EXISTS idx_ehs_incidents_status ON ehs_incidents (incident_status);

ALTER TABLE qual_compliance_obligations
    ADD COLUMN IF NOT EXISTS obligation_status VARCHAR(30);
UPDATE qual_compliance_obligations
SET obligation_status = 'open'
WHERE obligation_status IS NULL;
ALTER TABLE qual_compliance_obligations
    ALTER COLUMN obligation_status SET DEFAULT 'open',
    ALTER COLUMN obligation_status SET NOT NULL;
ALTER TABLE qual_compliance_obligations DROP CONSTRAINT IF EXISTS chk_qual_compliance_obligations_obligation_status;
ALTER TABLE qual_compliance_obligations
    ADD CONSTRAINT chk_qual_compliance_obligations_obligation_status
    CHECK (obligation_status IN ('open', 'due', 'overdue', 'waived', 'closed', 'archived'));
CREATE INDEX IF NOT EXISTS idx_qual_compliance_obligations_status ON qual_compliance_obligations (obligation_status);

ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS posting_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS posting_date DATE,
    ADD COLUMN IF NOT EXISTS reversal_of_txn_id UUID,
    ADD COLUMN IF NOT EXISTS reversal_reason_code VARCHAR(50);
UPDATE inventory_transactions
SET posting_status = 'posted',
    posting_date = COALESCE(posting_date, recorded_at::date)
WHERE posting_status IS NULL;
ALTER TABLE inventory_transactions
    ALTER COLUMN posting_status SET DEFAULT 'posted',
    ALTER COLUMN posting_status SET NOT NULL,
    ALTER COLUMN posting_date SET DEFAULT CURRENT_DATE;
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS chk_inventory_transactions_posting_status;
ALTER TABLE inventory_transactions
    ADD CONSTRAINT chk_inventory_transactions_posting_status
    CHECK (posting_status IN ('draft', 'pending_review', 'posted', 'on_hold', 'reversed', 'cancelled'));
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_posting_status ON inventory_transactions (posting_status);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_posting_date ON inventory_transactions (posting_date);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reversal_of ON inventory_transactions (reversal_of_txn_id);

ALTER TABLE warehouses
    ADD COLUMN IF NOT EXISTS warehouse_status VARCHAR(30);
UPDATE warehouses
SET warehouse_status = CASE
    WHEN COALESCE(is_active, FALSE) = TRUE THEN 'active'
    ELSE 'inactive'
END
WHERE warehouse_status IS NULL;
ALTER TABLE warehouses
    ALTER COLUMN warehouse_status SET DEFAULT 'active',
    ALTER COLUMN warehouse_status SET NOT NULL;
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS chk_warehouses_warehouse_status;
ALTER TABLE warehouses
    ADD CONSTRAINT chk_warehouses_warehouse_status
    CHECK (warehouse_status IN ('planned', 'active', 'on_hold', 'inactive', 'archived'));
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses (warehouse_status);

ALTER TABLE crm_customer_touchpoints
    ADD COLUMN IF NOT EXISTS touchpoint_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
UPDATE crm_customer_touchpoints
SET touchpoint_status = 'open'
WHERE touchpoint_status IS NULL;
ALTER TABLE crm_customer_touchpoints
    ALTER COLUMN touchpoint_status SET DEFAULT 'open',
    ALTER COLUMN touchpoint_status SET NOT NULL;
ALTER TABLE crm_customer_touchpoints DROP CONSTRAINT IF EXISTS chk_crm_customer_touchpoints_touchpoint_status;
ALTER TABLE crm_customer_touchpoints
    ADD CONSTRAINT chk_crm_customer_touchpoints_touchpoint_status
    CHECK (touchpoint_status IN ('open', 'in_progress', 'waiting_customer', 'escalated', 'resolved', 'closed', 'archived'));
CREATE INDEX IF NOT EXISTS idx_crm_customer_touchpoints_status ON crm_customer_touchpoints (touchpoint_status);

COMMIT;
