-- ============================================================================
-- Migration 164: access_review_campaign + access_review_item
-- ----------------------------------------------------------------------------
-- ISO 27001 A.9.2.5 ("Review of user access rights") and SOX 404 require a
-- periodic attestation that every user's role grants are still appropriate.
-- This migration models the campaign + per-item attestation lifecycle.
--
-- Lifecycle of an access_review_item:
--   pending  → attested      (manager confirms)
--   pending  → revoked       (manager removes the role/grant)
--   pending  → escalated     (deferred to higher authority)
--   pending  → expired       (campaign window closes without action)
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- access_review_campaign
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_review_campaign (
    campaign_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code           VARCHAR(50)     NOT NULL UNIQUE,
    name                    VARCHAR(200)    NOT NULL,
    name_vi                 VARCHAR(200),
    description             TEXT,
    description_vi          TEXT,
    scope_filter            JSONB           NOT NULL DEFAULT '{}'::jsonb,
    target_role_codes       TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    target_dept_codes       TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    review_owner_id         UUID            REFERENCES users(user_id),
    scheduled_for           TIMESTAMPTZ     NOT NULL,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    deadline_at             TIMESTAMPTZ,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled','in_progress','completed','cancelled','expired')),
    iso_27001_ref           VARCHAR(50),
    sox_section             VARCHAR(50),
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID
);

COMMENT ON TABLE access_review_campaign IS 'Periodic access-review campaigns (ISO 27001 A.9.2.5 / SOX 404). / Chu ky danh gia phan quyen dinh ky.';
COMMENT ON COLUMN access_review_campaign.scope_filter IS 'JSONB filter envelope: {plant_ids:[…], dept_codes:[…], rank_min:N, include_inactive:bool}.';

CREATE INDEX IF NOT EXISTS idx_access_review_campaign_status ON access_review_campaign(status, scheduled_for) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_access_review_campaign_owner ON access_review_campaign(review_owner_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- access_review_item  (per user × role/grant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_review_item (
    review_item_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id             UUID            NOT NULL REFERENCES access_review_campaign(campaign_id) ON DELETE CASCADE,
    target_user_id          UUID            NOT NULL REFERENCES users(user_id),
    target_role_id          UUID            REFERENCES roles(role_id),
    target_grant_kind       VARCHAR(40)     NOT NULL DEFAULT 'role'
                            CHECK (target_grant_kind IN ('role','module_permission','document_grant','mfa_exception')),
    target_ref              VARCHAR(200),
    snapshot_state          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    sod_violation_flagged   BOOLEAN         NOT NULL DEFAULT FALSE,
    sod_conflict_id         UUID            REFERENCES role_sod_conflict(conflict_id),
    inactivity_days         INTEGER,
    risk_score              SMALLINT,
    attestation             VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (attestation IN ('pending','attested','revoked','escalated','expired','waived')),
    attested_by             UUID            REFERENCES users(user_id),
    attested_at             TIMESTAMPTZ,
    attestation_justification TEXT,
    revoke_action_id        UUID,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID
);

COMMENT ON TABLE access_review_item IS 'Per (user × role/grant) attestation row inside an access-review campaign.';
COMMENT ON COLUMN access_review_item.target_grant_kind IS 'role (primary RBAC), module_permission, document_grant, mfa_exception.';
COMMENT ON COLUMN access_review_item.target_ref IS 'Target identifier when target_grant_kind != role: module_code, doc_pattern, factor_id, etc.';
COMMENT ON COLUMN access_review_item.snapshot_state IS 'Captured-at-campaign-start state of the grant for diff-on-attest comparison.';
COMMENT ON COLUMN access_review_item.risk_score IS '0-100 computed risk score (rank_level + privilege count + inactivity + SoD).';

CREATE INDEX IF NOT EXISTS idx_access_review_item_campaign ON access_review_item(campaign_id, attestation);
CREATE INDEX IF NOT EXISTS idx_access_review_item_user ON access_review_item(target_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_access_review_item_pending ON access_review_item(campaign_id) WHERE attestation = 'pending' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_access_review_item_sod ON access_review_item(sod_conflict_id) WHERE sod_violation_flagged = TRUE;

-- updated_at triggers --------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_access_review_campaign_set_updated_at') THEN
        CREATE TRIGGER trg_access_review_campaign_set_updated_at
            BEFORE UPDATE ON access_review_campaign
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_access_review_item_set_updated_at') THEN
        CREATE TRIGGER trg_access_review_item_set_updated_at
            BEFORE UPDATE ON access_review_item
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

-- ---------------------------------------------------------------------------
-- Helper view: per-campaign progress summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_access_review_campaign_progress AS
    SELECT
        c.campaign_id,
        c.campaign_code,
        c.name,
        c.name_vi,
        c.status                              AS campaign_status,
        c.scheduled_for,
        c.started_at,
        c.completed_at,
        c.deadline_at,
        COUNT(i.review_item_id)               AS total_items,
        COUNT(*) FILTER (WHERE i.attestation = 'pending')   AS pending_items,
        COUNT(*) FILTER (WHERE i.attestation = 'attested')  AS attested_items,
        COUNT(*) FILTER (WHERE i.attestation = 'revoked')   AS revoked_items,
        COUNT(*) FILTER (WHERE i.attestation = 'escalated') AS escalated_items,
        COUNT(*) FILTER (WHERE i.attestation = 'expired')   AS expired_items,
        COUNT(*) FILTER (WHERE i.sod_violation_flagged)     AS sod_violations,
        ROUND(
            CASE WHEN COUNT(i.review_item_id) = 0 THEN 0
                 ELSE 100.0 * COUNT(*) FILTER (WHERE i.attestation IN ('attested','revoked','escalated'))
                              / COUNT(i.review_item_id)
            END, 1
        )                                     AS completion_percent
    FROM access_review_campaign c
    LEFT JOIN access_review_item i ON i.campaign_id = c.campaign_id AND i.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
    GROUP BY c.campaign_id;

COMMENT ON VIEW v_access_review_campaign_progress IS 'Per-campaign summary KPIs (total/pending/attested/revoked/escalated/SoD, completion %).';

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP VIEW IF EXISTS v_access_review_campaign_progress;
--   DROP TABLE IF EXISTS access_review_item;
--   DROP TABLE IF EXISTS access_review_campaign;
--   COMMIT;
