-- 256_rename_complaint_rate_to_customer_escape_dpmo.sql
-- ---------------------------------------------------------------------------
-- Replace the unit-based customer complaint KPI (COMPLAINT_RATE, ppm-per-lot)
-- with the opportunity-normalized Customer Escape DPMO metric.
--
-- Rationale: ppm-per-unit is statistically meaningless at low/medium volume
-- (~100 pcs/month/part): its resolution is 1,000,000 / n, so a single escape
-- swings the metric to >=10,000 ppm. DPMO normalizes by inspected CTQ
-- characteristics (AS9102 ballooned, frozen per part_no+revision), the form
-- used across the precision-machining supply chain for LAM / AMAT.
--
-- This is an UPDATE (not delete+insert) so kpi_id is preserved and historical
-- kpi_scores rows stay linked through the rename. Idempotent: it only acts
-- when the old code still exists and the new code does not, so re-runs and
-- fresh installs (which seed the new code directly) are no-ops.
-- ---------------------------------------------------------------------------

UPDATE kpi_definitions
   SET metric_code      = 'CUSTOMER_ESCAPE_DPMO',
       kpi_name         = 'Customer Escape DPMO',
       kpi_name_vi      = 'Loi thoat khach hang theo co hoi (DPMO)',
       unit             = 'dpmo',
       target           = 100,
       threshold_green  = 100,
       threshold_yellow = 233
 WHERE metric_code = 'COMPLAINT_RATE'
   AND NOT EXISTS (
       SELECT 1 FROM kpi_definitions k2
        WHERE k2.metric_code = 'CUSTOMER_ESCAPE_DPMO'
   );
