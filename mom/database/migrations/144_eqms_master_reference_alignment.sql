-- Migration: 144_eqms_master_reference_alignment.sql
-- Description: Align EQMS business-reference columns with master-data code IDs.
-- Dependencies: 006_erp_master_data.sql, 007_customers_sales.sql, 008_vendors_purchasing.sql, 009_inventory.sql, 136_eqms_worldclass_surface.sql
-- Rollback: manual only; changing business reference types back to UUID can lose master-code values.

BEGIN;

-- Master data tables in this platform use business codes, not UUIDs:
-- customers.customer_id, vendors.vendor_id, items.item_id, lot_master.lot_number.
-- EQMS controllers and dropdowns exchange those same business codes, so EQMS
-- operational reference columns must use compatible text/varchar types.

ALTER TABLE eqms_complaints
    ALTER COLUMN customer_id TYPE VARCHAR(50) USING NULLIF(customer_id::text, '')::VARCHAR(50),
    ALTER COLUMN affected_product_id TYPE VARCHAR(50) USING NULLIF(affected_product_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_ncr_records
    ALTER COLUMN item_id TYPE VARCHAR(50) USING NULLIF(item_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_supplier_profiles
    ALTER COLUMN vendor_id TYPE VARCHAR(50) USING NULLIF(vendor_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_quality_agreements
    ALTER COLUMN vendor_id TYPE VARCHAR(50) USING NULLIF(vendor_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_supplier_audits
    ALTER COLUMN vendor_id TYPE VARCHAR(50) USING NULLIF(vendor_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_scars
    ALTER COLUMN vendor_id TYPE VARCHAR(50) USING NULLIF(vendor_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_lab_investigations
    ALTER COLUMN product_id TYPE VARCHAR(50) USING NULLIF(product_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_batch_release
    ALTER COLUMN lot_id TYPE VARCHAR(100) USING NULLIF(lot_id::text, '')::VARCHAR(100),
    ALTER COLUMN product_id TYPE VARCHAR(50) USING NULLIF(product_id::text, '')::VARCHAR(50);

ALTER TABLE eqms_deviations
    ALTER COLUMN batch_id TYPE VARCHAR(100) USING NULLIF(batch_id::text, '')::VARCHAR(100);

ALTER TABLE IF EXISTS eqms_supplier_quality_agreements
    ALTER COLUMN supplier_id TYPE VARCHAR(50) USING NULLIF(supplier_id::text, '')::VARCHAR(50);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_complaints_customer_master') THEN
        ALTER TABLE eqms_complaints
            ADD CONSTRAINT fk_eqms_complaints_customer_master
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_complaints_product_master') THEN
        ALTER TABLE eqms_complaints
            ADD CONSTRAINT fk_eqms_complaints_product_master
            FOREIGN KEY (affected_product_id) REFERENCES items(item_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_ncr_item_master') THEN
        ALTER TABLE eqms_ncr_records
            ADD CONSTRAINT fk_eqms_ncr_item_master
            FOREIGN KEY (item_id) REFERENCES items(item_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_supplier_profiles_vendor_master') THEN
        ALTER TABLE eqms_supplier_profiles
            ADD CONSTRAINT fk_eqms_supplier_profiles_vendor_master
            FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_quality_agreements_vendor_master') THEN
        ALTER TABLE eqms_quality_agreements
            ADD CONSTRAINT fk_eqms_quality_agreements_vendor_master
            FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_supplier_audits_vendor_master') THEN
        ALTER TABLE eqms_supplier_audits
            ADD CONSTRAINT fk_eqms_supplier_audits_vendor_master
            FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_scars_vendor_master') THEN
        ALTER TABLE eqms_scars
            ADD CONSTRAINT fk_eqms_scars_vendor_master
            FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_lab_product_master') THEN
        ALTER TABLE eqms_lab_investigations
            ADD CONSTRAINT fk_eqms_lab_product_master
            FOREIGN KEY (product_id) REFERENCES items(item_id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_batch_lot_master') THEN
        ALTER TABLE eqms_batch_release
            ADD CONSTRAINT fk_eqms_batch_lot_master
            FOREIGN KEY (lot_id) REFERENCES lot_master(lot_number) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_batch_product_master') THEN
        ALTER TABLE eqms_batch_release
            ADD CONSTRAINT fk_eqms_batch_product_master
            FOREIGN KEY (product_id) REFERENCES items(item_id) NOT VALID;
    END IF;

    IF to_regclass('public.eqms_supplier_quality_agreements') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eqms_supplier_quality_agreements_supplier_master') THEN
        ALTER TABLE eqms_supplier_quality_agreements
            ADD CONSTRAINT fk_eqms_supplier_quality_agreements_supplier_master
            FOREIGN KEY (supplier_id) REFERENCES vendors(vendor_id) NOT VALID;
    END IF;
END $$;

COMMIT;
