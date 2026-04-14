-- World-class closure: align PLM change lifecycle constraints with the canonical
-- eQMS/MOM state machine and prevent ambiguous lifecycle semantics.

UPDATE plm_change_requests
SET status = CASE status
    WHEN 'in_review' THEN 'triage'
    WHEN 'approved' THEN 'approved_for_order'
    WHEN 'implemented' THEN 'approved_for_order'
    ELSE status
END
WHERE status IN ('in_review', 'approved', 'implemented');

ALTER TABLE plm_change_requests
    DROP CONSTRAINT IF EXISTS plm_change_requests_status_check;

ALTER TABLE plm_change_requests
    ADD CONSTRAINT plm_change_requests_status_check
    CHECK (status IN ('draft', 'submitted', 'triage', 'approved_for_order', 'rejected', 'cancelled'));

UPDATE plm_change_orders
SET status = CASE status
    WHEN 'closed' THEN 'implemented'
    ELSE status
END
WHERE status = 'closed'
  AND NOT EXISTS (
      SELECT 1
      FROM plm_change_effectiveness_reviews r
      WHERE r.plm_change_order_id = plm_change_orders.plm_change_order_id
        AND r.review_state = 'effective'
  );

ALTER TABLE plm_change_orders
    DROP CONSTRAINT IF EXISTS plm_change_orders_status_check;

ALTER TABLE plm_change_orders
    ADD CONSTRAINT plm_change_orders_status_check
    CHECK (status IN ('draft', 'impact_assessment', 'in_review', 'approved', 'released', 'implemented', 'closed', 'cancelled'));

COMMENT ON CONSTRAINT plm_change_requests_status_check ON plm_change_requests
    IS 'Canonical change request lifecycle: draft -> submitted -> triage -> approved_for_order/rejected/cancelled.';

COMMENT ON CONSTRAINT plm_change_orders_status_check ON plm_change_orders
    IS 'Canonical change order lifecycle: draft -> impact_assessment -> in_review -> approved -> released -> implemented -> closed.';
