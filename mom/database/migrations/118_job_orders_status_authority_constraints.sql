-- World-class closure: constrain job_orders to the runtime job-order lifecycle
-- after the cancelled enum value from migration 117 has committed.

UPDATE job_orders
SET job_status = CASE job_status::text
    WHEN 'engineered' THEN 'released'::job_status_enum
    ELSE job_status
END
WHERE job_status::text IN ('engineered');

ALTER TABLE job_orders
    DROP CONSTRAINT IF EXISTS job_orders_job_status_runtime_check;

ALTER TABLE job_orders
    ADD CONSTRAINT job_orders_job_status_runtime_check
    CHECK (job_status::text IN ('planned', 'released', 'active', 'on_hold', 'completed', 'closed', 'cancelled'));

COMMENT ON CONSTRAINT job_orders_job_status_runtime_check ON job_orders
    IS 'Canonical JO lifecycle aligned with so_jo_wo_config and wf_job_order.';
