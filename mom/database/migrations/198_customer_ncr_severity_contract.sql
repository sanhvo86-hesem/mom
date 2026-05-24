-- Migration 198: Customer NCR severity + 3D/4D/8D event contract
-- Purpose: add nullable, auditable event fields needed by the KPI/LAM
--          customer-escape severity model without changing EQMS write authority.
-- Generated: 2026-05-24

BEGIN;

ALTER TABLE IF EXISTS eqms_complaints
    ADD COLUMN IF NOT EXISTS received_at timestamptz,
    ADD COLUMN IF NOT EXISTS detected_at timestamptz,
    ADD COLUMN IF NOT EXISTS customer_notification_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS containment_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS containment_verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS d3_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS d4_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS d8_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS corrective_action_effective_at timestamptz,
    ADD COLUMN IF NOT EXISTS customer_acceptance_at timestamptz,
    ADD COLUMN IF NOT EXISTS repeat_root_cause_family varchar(160),
    ADD COLUMN IF NOT EXISTS severity_classification varchar(50),
    ADD COLUMN IF NOT EXISTS hard_gate_status varchar(20) DEFAULT 'open'
        CHECK (hard_gate_status IN ('open', 'blocked', 'cleared', 'waived')),
    ADD COLUMN IF NOT EXISTS special_release_required boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS special_release_approval_ref varchar(120),
    ADD COLUMN IF NOT EXISTS process_change_authorization_ref varchar(120),
    ADD COLUMN IF NOT EXISTS gage_release_validity_ref varchar(120),
    ADD COLUMN IF NOT EXISTS falsification_investigation_ref varchar(120),
    ADD COLUMN IF NOT EXISTS bonus_simulation_scope varchar(40) DEFAULT 'affected_scope'
        CHECK (bonus_simulation_scope IN ('order', 'customer', 'value_stream', 'company', 'affected_scope')),
    ADD COLUMN IF NOT EXISTS bonus_simulation_impact jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_eqms_complaints_lam_8d_sla
    ON eqms_complaints (received_at, d3_sent_at, d4_sent_at, d8_updated_at);

CREATE INDEX IF NOT EXISTS idx_eqms_complaints_hard_gate_status
    ON eqms_complaints (hard_gate_status, severity_classification)
    WHERE status NOT IN ('closed', 'voided');

CREATE INDEX IF NOT EXISTS idx_eqms_complaints_repeat_root_cause
    ON eqms_complaints (repeat_root_cause_family)
    WHERE repeat_root_cause_family IS NOT NULL;

COMMENT ON COLUMN eqms_complaints.received_at IS
    'Exact complaint receipt timestamp; distinct from received_date and NCR created_at.';
COMMENT ON COLUMN eqms_complaints.detected_at IS
    'Customer or internal detection timestamp for the escaped condition.';
COMMENT ON COLUMN eqms_complaints.customer_notification_sent_at IS
    'Timestamp when customer acknowledgement/notification was sent.';
COMMENT ON COLUMN eqms_complaints.containment_started_at IS
    'Timestamp when containment started for customer/NCR severity SLA.';
COMMENT ON COLUMN eqms_complaints.containment_verified_at IS
    'Timestamp when QA verified containment effectiveness.';
COMMENT ON COLUMN eqms_complaints.d3_sent_at IS
    'Timestamp when D3 containment response was sent to customer.';
COMMENT ON COLUMN eqms_complaints.d4_sent_at IS
    'Timestamp when D4 preliminary/root-cause response was sent to customer.';
COMMENT ON COLUMN eqms_complaints.d8_updated_at IS
    'Timestamp when updated 8D/progress response was sent to customer.';
COMMENT ON COLUMN eqms_complaints.corrective_action_effective_at IS
    'Timestamp when corrective action effectiveness was confirmed.';
COMMENT ON COLUMN eqms_complaints.customer_acceptance_at IS
    'Timestamp when customer accepted 8D/closure response.';
COMMENT ON COLUMN eqms_complaints.repeat_root_cause_family IS
    'Governed root-cause family used to detect repeat same-root-cause customer NCRs.';
COMMENT ON COLUMN eqms_complaints.hard_gate_status IS
    'Open/blocked/cleared/waived customer-NCR severity hard gate status for simulation only.';
COMMENT ON COLUMN eqms_complaints.bonus_simulation_impact IS
    'Simulation-only customer NCR impact metadata; not payroll or payout authority.';

COMMIT;
