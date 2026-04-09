-- Migration: 082_allocation_lifecycle.sql
-- Description: Allocation lifecycle, form drafts, electronic signatures
-- Dependencies: 001_extensions_and_types.sql, 004_form_system.sql, 005_record_management.sql
-- Rollback: DROP TABLE electronic_signatures, form_drafts, allocation_events, allocations CASCADE;

BEGIN;

-- ===========================================================================
-- Enums / Kieu du lieu liet ke
-- ===========================================================================

-- Allocation status / Trang thai cap phat
DO $$ BEGIN
    CREATE TYPE allocation_status_enum AS ENUM (
        'allocated', 'in_use', 'submitted', 'approved', 'voided', 'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allocation event type / Loai su kien cap phat
DO $$ BEGIN
    CREATE TYPE allocation_event_type AS ENUM (
        'allocated', 'opened', 'saved_draft', 'submitted',
        'approved', 'rejected', 'returned', 'voided',
        'expired', 'linked', 'note_added', 'reassigned'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Signature mode / Che do ky
DO $$ BEGIN
    CREATE TYPE signature_mode_enum AS ENUM ('pin', 'password', 'biometric', 'token');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Signature action / Hanh dong ky
DO $$ BEGIN
    CREATE TYPE signature_action_enum AS ENUM (
        'author', 'review', 'approve', 'reject', 'witness',
        'verify', 'release', 'acknowledge', 'delegate'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- allocations / Cap phat ma ho so
-- ===========================================================================
CREATE TABLE allocations (
    allocation_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id       VARCHAR(50)     NOT NULL UNIQUE,
    record_type     record_type_enum NOT NULL,
    dept_code       dept_code       NOT NULL REFERENCES departments(dept_code),
    fiscal_year     INT             NOT NULL,
    seq             INT             NOT NULL,
    form_code       VARCHAR(20),
    form_revision   INT,
    delivery_mode   delivery_mode_enum DEFAULT 'online_form',
    status          allocation_status_enum NOT NULL DEFAULT 'allocated',
    priority        priority_enum   DEFAULT 'medium',
    notes           TEXT,
    master_context  JSONB           DEFAULT '{}',
    linked_order_id VARCHAR(50),
    created_by      VARCHAR(50)     NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      VARCHAR(50),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT fk_alloc_form
        FOREIGN KEY (form_code, form_revision)
        REFERENCES form_schemas(form_code, version)
        ON UPDATE CASCADE,

    CONSTRAINT uq_alloc_type_year_seq
        UNIQUE (record_type, dept_code, fiscal_year, seq)
);

COMMENT ON TABLE allocations IS 'Record ID allocation lifecycle. / Vong doi cap phat ma ho so.';

CREATE INDEX idx_alloc_status   ON allocations (status);
CREATE INDEX idx_alloc_dept     ON allocations (dept_code);
CREATE INDEX idx_alloc_created  ON allocations (created_at DESC);
CREATE INDEX idx_alloc_form     ON allocations (form_code) WHERE form_code IS NOT NULL;
CREATE INDEX idx_alloc_order    ON allocations (linked_order_id) WHERE linked_order_id IS NOT NULL;

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION trg_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER allocations_set_updated_at
    BEFORE UPDATE ON allocations
    FOR EACH ROW EXECUTE FUNCTION trg_allocations_updated_at();

-- ===========================================================================
-- allocation_events / Su kien cap phat
-- ===========================================================================
CREATE TABLE allocation_events (
    event_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id   UUID            NOT NULL REFERENCES allocations(allocation_id) ON DELETE CASCADE,
    event_type      allocation_event_type NOT NULL,
    actor           VARCHAR(50)     NOT NULL,
    detail          TEXT,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE allocation_events IS 'Immutable event log for allocation lifecycle. / Nhat ky su kien bat bien cho vong doi cap phat.';

CREATE INDEX idx_alloc_evt_alloc   ON allocation_events (allocation_id, created_at DESC);
CREATE INDEX idx_alloc_evt_type    ON allocation_events (event_type);
CREATE INDEX idx_alloc_evt_actor   ON allocation_events (actor);

-- ===========================================================================
-- form_drafts / Ban nhap bieu mau (auto-save)
-- ===========================================================================
CREATE TABLE form_drafts (
    draft_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_code       VARCHAR(20)     NOT NULL,
    allocation_id   UUID            REFERENCES allocations(allocation_id) ON DELETE SET NULL,
    user_id         VARCHAR(50)     NOT NULL,
    field_values    JSONB           NOT NULL DEFAULT '{}',
    signatures      JSONB           DEFAULT '{}',
    attachments     JSONB           DEFAULT '[]',
    version         INT             NOT NULL DEFAULT 1,
    saved_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_draft_form_alloc_user
        UNIQUE (form_code, allocation_id, user_id)
);

COMMENT ON TABLE form_drafts IS 'Auto-saved form drafts per user/allocation. / Ban nhap tu dong luu theo nguoi dung/cap phat.';

CREATE INDEX idx_draft_user     ON form_drafts (user_id, saved_at DESC);
CREATE INDEX idx_draft_form     ON form_drafts (form_code);
CREATE INDEX idx_draft_alloc    ON form_drafts (allocation_id) WHERE allocation_id IS NOT NULL;

-- Trigger: auto-increment version on update
CREATE OR REPLACE FUNCTION trg_form_drafts_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.saved_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_drafts_auto_version
    BEFORE UPDATE ON form_drafts
    FOR EACH ROW EXECUTE FUNCTION trg_form_drafts_version();

-- ===========================================================================
-- electronic_signatures / Chu ky dien tu (21 CFR Part 11)
-- ===========================================================================
CREATE TABLE electronic_signatures (
    signature_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50)     NOT NULL,       -- 'form_entry', 'record', 'evidence', 'allocation'
    entity_id       VARCHAR(100)    NOT NULL,       -- FK to the signed entity
    signer_id       VARCHAR(50)     NOT NULL,
    signer_name     VARCHAR(150)    NOT NULL,
    signer_role     VARCHAR(100),
    action          signature_action_enum NOT NULL,
    meaning         TEXT            NOT NULL,        -- 21 CFR 11.50: meaning of signature
    signature_mode  signature_mode_enum NOT NULL,
    signature_hash  VARCHAR(128)    NOT NULL,        -- SHA-512 of signed payload
    signed_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB           DEFAULT '{}',

    -- Immutability: no UPDATE or DELETE allowed (enforced by trigger)
    CONSTRAINT chk_esig_meaning_nonempty CHECK (length(trim(meaning)) > 0),
    CONSTRAINT chk_esig_hash_nonempty    CHECK (length(trim(signature_hash)) > 0)
);

COMMENT ON TABLE electronic_signatures IS '21 CFR Part 11 compliant electronic signatures. / Chu ky dien tu tuan thu 21 CFR Phan 11.';

CREATE INDEX idx_esig_entity    ON electronic_signatures (entity_type, entity_id);
CREATE INDEX idx_esig_signer    ON electronic_signatures (signer_id, signed_at DESC);
CREATE INDEX idx_esig_action    ON electronic_signatures (action);

-- Immutability trigger: prevent UPDATE/DELETE on signatures
CREATE OR REPLACE FUNCTION trg_esig_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Electronic signatures are immutable (21 CFR Part 11). Operation: %', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER esig_no_update
    BEFORE UPDATE ON electronic_signatures
    FOR EACH ROW EXECUTE FUNCTION trg_esig_immutable();

CREATE TRIGGER esig_no_delete
    BEFORE DELETE ON electronic_signatures
    FOR EACH ROW EXECUTE FUNCTION trg_esig_immutable();

-- ===========================================================================
-- Views / Bao cao
-- ===========================================================================

-- Active allocations with latest event
CREATE OR REPLACE VIEW v_allocation_summary AS
SELECT
    a.allocation_id,
    a.record_id,
    a.record_type,
    a.dept_code,
    a.form_code,
    a.status,
    a.priority,
    a.created_by,
    a.created_at,
    a.updated_at,
    e.event_type  AS last_event_type,
    e.actor       AS last_event_actor,
    e.created_at  AS last_event_at,
    d.draft_id    IS NOT NULL AS has_draft,
    (SELECT count(*) FROM electronic_signatures s
     WHERE s.entity_type = 'allocation' AND s.entity_id = a.allocation_id::text
    ) AS signature_count
FROM allocations a
LEFT JOIN LATERAL (
    SELECT event_type, actor, created_at
    FROM allocation_events
    WHERE allocation_id = a.allocation_id
    ORDER BY created_at DESC
    LIMIT 1
) e ON true
LEFT JOIN form_drafts d
    ON d.allocation_id = a.allocation_id
WHERE a.status NOT IN ('voided', 'expired');

COMMENT ON VIEW v_allocation_summary IS 'Active allocations with latest event and draft status. / Cap phat dang hoat dong voi su kien moi nhat.';

-- Form draft overview for dashboard
CREATE OR REPLACE VIEW v_form_draft_overview AS
SELECT
    d.draft_id,
    d.form_code,
    d.user_id,
    d.version,
    d.saved_at,
    a.record_id,
    a.record_type,
    a.status AS allocation_status,
    fs.title AS form_title
FROM form_drafts d
LEFT JOIN allocations a ON a.allocation_id = d.allocation_id
LEFT JOIN form_schemas fs ON fs.form_code = d.form_code
    AND fs.version = (
        SELECT max(version) FROM form_schemas WHERE form_code = d.form_code
    );

COMMENT ON VIEW v_form_draft_overview IS 'Form drafts with allocation and schema info. / Ban nhap bieu mau voi thong tin cap phat va schema.';

COMMIT;
