-- World-class closure: constrain legacy sales_orders status after the
-- engineering_ready enum value from migration 115 has committed.

UPDATE sales_orders
SET so_status = CASE so_status::text
    WHEN 'open' THEN 'draft'::so_status_enum
    WHEN 'released' THEN 'engineering_ready'::so_status_enum
    WHEN 'in_progress' THEN 'in_production'::so_status_enum
    ELSE so_status
END
WHERE so_status::text IN ('open', 'released', 'in_progress');

ALTER TABLE sales_orders
    ALTER COLUMN so_status SET DEFAULT 'draft';

ALTER TABLE sales_orders
    DROP CONSTRAINT IF EXISTS sales_orders_so_status_canonical_check;

ALTER TABLE sales_orders
    ADD CONSTRAINT sales_orders_so_status_canonical_check
    CHECK (so_status::text IN ('draft', 'quoted', 'confirmed', 'engineering_ready', 'in_production', 'shipped', 'closed', 'cancelled'));

COMMENT ON CONSTRAINT sales_orders_so_status_canonical_check ON sales_orders
    IS 'Legacy SO table constrained to canonical SO lifecycle; old aliases are migrated before this check is applied.';
