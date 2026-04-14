-- World-class closure: align singular MES work_order spine status with the
-- same runtime production WO lifecycle used by wf_work_order_execution.

UPDATE work_order
SET status_code = CASE status_code
    WHEN 'open' THEN 'scheduled'
    WHEN 'planned' THEN 'scheduled'
    WHEN 'released' THEN 'setup'
    WHEN 'in_progress' THEN 'running'
    WHEN 'quality_hold' THEN 'on_hold'
    WHEN 'closed' THEN 'completed'
    ELSE status_code
END
WHERE status_code IN ('open', 'planned', 'released', 'in_progress', 'quality_hold', 'closed');

ALTER TABLE work_order
    ALTER COLUMN status_code SET DEFAULT 'scheduled';

ALTER TABLE work_order
    DROP CONSTRAINT IF EXISTS work_order_status_code_runtime_check;

ALTER TABLE work_order
    ADD CONSTRAINT work_order_status_code_runtime_check
    CHECK (status_code IN ('scheduled', 'setup', 'running', 'inspection', 'completed', 'on_hold', 'cancelled'));

COMMENT ON CONSTRAINT work_order_status_code_runtime_check ON work_order
    IS 'Canonical MES work_order lifecycle aligned with work_order_status_runtime and wf_work_order_execution.';
