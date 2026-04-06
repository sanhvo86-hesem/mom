-- ============================================================================
-- Migration 079: Foundation Governance Contract Hardening
-- Description: Adds row_version, updated_at, indexes, triggers, and
--              approval_group_id for the Foundation Governance Contract Slice.
-- Dependencies: 072_canonical_foundation_governance.sql
-- Rollback: See per-table rollback notes in closure package Section 9.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Trigger function: auto-touch updated_at and row_version ────────────────

CREATE OR REPLACE FUNCTION qms_touch_foundation_row()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at   := now();
    NEW.row_version  := COALESCE(OLD.row_version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── org_enterprise ─────────────────────────────────────────────────────────

ALTER TABLE org_enterprise ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_org_enterprise_status_code_enterprise_code
    ON org_enterprise (status_code, enterprise_code);

DROP TRIGGER IF EXISTS trg_org_enterprise_touch ON org_enterprise;
CREATE TRIGGER trg_org_enterprise_touch
    BEFORE UPDATE ON org_enterprise
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── org_company ────────────────────────────────────────────────────────────

ALTER TABLE org_company ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_org_company_enterprise_status_code_company_code
    ON org_company (enterprise_id, status_code, company_code);

DROP TRIGGER IF EXISTS trg_org_company_touch ON org_company;
CREATE TRIGGER trg_org_company_touch
    BEFORE UPDATE ON org_company
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── org_site ───────────────────────────────────────────────────────────────

ALTER TABLE org_site ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_org_site_company_status_code_site_code
    ON org_site (company_id, status_code, site_code);

DROP TRIGGER IF EXISTS trg_org_site_touch ON org_site;
CREATE TRIGGER trg_org_site_touch
    BEFORE UPDATE ON org_site
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── org_plant ──────────────────────────────────────────────────────────────

ALTER TABLE org_plant ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_org_plant_site_status_code_plant_code
    ON org_plant (site_id, status_code, plant_code);

DROP TRIGGER IF EXISTS trg_org_plant_touch ON org_plant;
CREATE TRIGGER trg_org_plant_touch
    BEFORE UPDATE ON org_plant
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── org_warehouse ──────────────────────────────────────────────────────────

ALTER TABLE org_warehouse ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_org_warehouse_plant_status_code_warehouse_code
    ON org_warehouse (plant_id, status_code, warehouse_code);

DROP TRIGGER IF EXISTS trg_org_warehouse_touch ON org_warehouse;
CREATE TRIGGER trg_org_warehouse_touch
    BEFORE UPDATE ON org_warehouse
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── org_work_center ────────────────────────────────────────────────────────

ALTER TABLE org_work_center ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_org_work_center_plant_status_code_work_center_code
    ON org_work_center (plant_id, status_code, work_center_code);

DROP TRIGGER IF EXISTS trg_org_work_center_touch ON org_work_center;
CREATE TRIGGER trg_org_work_center_touch
    BEFORE UPDATE ON org_work_center
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── org_work_unit ──────────────────────────────────────────────────────────

ALTER TABLE org_work_unit ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_org_work_unit_work_center_status_code_work_unit_code
    ON org_work_unit (work_center_id, status_code, work_unit_code);

DROP TRIGGER IF EXISTS trg_org_work_unit_touch ON org_work_unit;
CREATE TRIGGER trg_org_work_unit_touch
    BEFORE UPDATE ON org_work_unit
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── party ──────────────────────────────────────────────────────────────────

ALTER TABLE party ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_party_party_type_status_code_display_name
    ON party (party_type, status_code, display_name);

DROP TRIGGER IF EXISTS trg_party_touch ON party;
CREATE TRIGGER trg_party_touch
    BEFORE UPDATE ON party
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── party_role ─────────────────────────────────────────────────────────────

ALTER TABLE party_role ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE party_role ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE party_role ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_party_role_party_status_role_code
    ON party_role (party_id, status_code, role_code);

CREATE INDEX IF NOT EXISTS idx_party_role_scope_entity
    ON party_role (scope_entity_name, scope_entity_id);

DROP TRIGGER IF EXISTS trg_party_role_touch ON party_role;
CREATE TRIGGER trg_party_role_touch
    BEFORE UPDATE ON party_role
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── party_site ─────────────────────────────────────────────────────────────

ALTER TABLE party_site ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_party_site_party_default_status
    ON party_site (party_id, is_default, status_code);

DROP TRIGGER IF EXISTS trg_party_site_touch ON party_site;
CREATE TRIGGER trg_party_site_touch
    BEFORE UPDATE ON party_site
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── party_contact ──────────────────────────────────────────────────────────

ALTER TABLE party_contact ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_party_contact_party_primary_status
    ON party_contact (party_id, is_primary, status_code);

DROP TRIGGER IF EXISTS trg_party_contact_touch ON party_contact;
CREATE TRIGGER trg_party_contact_touch
    BEFORE UPDATE ON party_contact
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── calendar ───────────────────────────────────────────────────────────────

ALTER TABLE calendar ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS row_version  BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_calendar_status_code_calendar_code
    ON calendar (status_code, calendar_code);

DROP TRIGGER IF EXISTS trg_calendar_touch ON calendar;
CREATE TRIGGER trg_calendar_touch
    BEFORE UPDATE ON calendar
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── shift ──────────────────────────────────────────────────────────────────

ALTER TABLE shift ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE shift ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE shift ADD COLUMN IF NOT EXISTS row_version  BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_shift_calendar_status_code_shift_code
    ON shift (calendar_id, status_code, shift_code);

DROP TRIGGER IF EXISTS trg_shift_touch ON shift;
CREATE TRIGGER trg_shift_touch
    BEFORE UPDATE ON shift
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── reason_code ────────────────────────────────────────────────────────────

ALTER TABLE reason_code ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE reason_code ADD COLUMN IF NOT EXISTS row_version  BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_reason_code_domain_active_code
    ON reason_code (reason_domain, is_active, reason_code);

DROP TRIGGER IF EXISTS trg_reason_code_touch ON reason_code;
CREATE TRIGGER trg_reason_code_touch
    BEFORE UPDATE ON reason_code
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── status_code ────────────────────────────────────────────────────────────

ALTER TABLE status_code ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE status_code ADD COLUMN IF NOT EXISTS row_version  BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_status_code_domain_active_sequence
    ON status_code (status_domain, is_active, sequence_no);

DROP TRIGGER IF EXISTS trg_status_code_touch ON status_code;
CREATE TRIGGER trg_status_code_touch
    BEFORE UPDATE ON status_code
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── electronic_signature ───────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_signature_hash_value
    ON electronic_signature (hash_value);

CREATE INDEX IF NOT EXISTS idx_electronic_signature_signed_by_party_signed_at
    ON electronic_signature (signed_by_party_id, signed_at DESC);

-- ── approval ───────────────────────────────────────────────────────────────

ALTER TABLE approval ADD COLUMN IF NOT EXISTS approval_group_id    UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE approval ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE approval ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE approval ADD COLUMN IF NOT EXISTS row_version          BIGINT NOT NULL DEFAULT 1;
ALTER TABLE approval ADD COLUMN IF NOT EXISTS decision_reason_code VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_approval_group_status_step
    ON approval (approval_group_id, status_code, approval_step_code);

CREATE INDEX IF NOT EXISTS idx_approval_entity_status
    ON approval (entity_name, entity_id, status_code);

CREATE INDEX IF NOT EXISTS idx_approval_approver_status
    ON approval (approver_party_id, status_code);

DROP TRIGGER IF EXISTS trg_approval_touch ON approval;
CREATE TRIGGER trg_approval_touch
    BEFORE UPDATE ON approval
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

-- ── attachment ─────────────────────────────────────────────────────────────

ALTER TABLE attachment ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE attachment ADD COLUMN IF NOT EXISTS row_version          BIGINT NOT NULL DEFAULT 1;
ALTER TABLE attachment ADD COLUMN IF NOT EXISTS uploaded_by_party_id UUID REFERENCES party(party_id);
ALTER TABLE attachment ADD COLUMN IF NOT EXISTS content_type         VARCHAR(255);
ALTER TABLE attachment ADD COLUMN IF NOT EXISTS file_size_bytes      BIGINT;
ALTER TABLE attachment ADD COLUMN IF NOT EXISTS evidence_chain_hash  TEXT;

CREATE INDEX IF NOT EXISTS idx_attachment_entity_created_at
    ON attachment (entity_name, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attachment_checksum_sha256
    ON attachment (checksum_sha256);

DROP TRIGGER IF EXISTS trg_attachment_touch ON attachment;
CREATE TRIGGER trg_attachment_touch
    BEFORE UPDATE ON attachment
    FOR EACH ROW EXECUTE FUNCTION qms_touch_foundation_row();

COMMIT;
