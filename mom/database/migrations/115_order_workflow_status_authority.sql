-- World-class closure: unify SO workflow/status authority across runtime,
-- registry contracts, and database constraints.

ALTER TYPE so_status_enum ADD VALUE IF NOT EXISTS 'engineering_ready' AFTER 'confirmed';

UPDATE sales_order
SET status_code = CASE status_code
    WHEN 'open' THEN 'draft'
    WHEN 'released' THEN 'engineering_ready'
    WHEN 'in_progress' THEN 'in_production'
    WHEN 'completed' THEN 'shipped'
    ELSE status_code
END
WHERE status_code IN ('open', 'released', 'in_progress', 'completed');

ALTER TABLE sales_order
    ALTER COLUMN status_code SET DEFAULT 'draft';

ALTER TABLE sales_order
    DROP CONSTRAINT IF EXISTS sales_order_status_code_canonical_check;

ALTER TABLE sales_order
    ADD CONSTRAINT sales_order_status_code_canonical_check
    CHECK (status_code IN ('draft', 'quoted', 'confirmed', 'engineering_ready', 'in_production', 'shipped', 'closed', 'cancelled'));

COMMENT ON CONSTRAINT sales_order_status_code_canonical_check ON sales_order
    IS 'Canonical SO lifecycle aligned with so_jo_wo_config and wf_sales_order.';

-- sales_orders uses the so_status_enum value added above. Its data migration and
-- constraint are intentionally placed in the next migration so runners that wrap
-- each migration in a transaction commit the new enum value before using it.
