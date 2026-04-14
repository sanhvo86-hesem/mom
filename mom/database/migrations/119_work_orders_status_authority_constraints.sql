-- World-class closure: constrain production work_orders to the runtime
-- work-order execution lifecycle. Service/maintenance WO lifecycles remain
-- separate and must not reuse wf_work_order_execution.

UPDATE work_orders
SET work_order_status = CASE work_order_status
    WHEN 'draft' THEN 'scheduled'
    WHEN 'planned' THEN 'scheduled'
    WHEN 'released' THEN 'setup'
    WHEN 'in_production' THEN 'running'
    WHEN 'quality_hold' THEN 'on_hold'
    WHEN 'closed' THEN 'completed'
    ELSE work_order_status
END
WHERE work_order_status IN ('draft', 'planned', 'released', 'in_production', 'quality_hold', 'closed');

ALTER TABLE work_orders
    DROP CONSTRAINT IF EXISTS work_orders_work_order_status_check;

ALTER TABLE work_orders
    DROP CONSTRAINT IF EXISTS work_orders_status_runtime_check;

ALTER TABLE work_orders
    ADD CONSTRAINT work_orders_status_runtime_check
    CHECK (work_order_status IN ('scheduled', 'setup', 'running', 'inspection', 'completed', 'on_hold', 'cancelled'));

COMMENT ON CONSTRAINT work_orders_status_runtime_check ON work_orders
    IS 'Canonical production WO lifecycle aligned with so_jo_wo_config and wf_work_order_execution.';
