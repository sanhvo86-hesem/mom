-- ============================================================================
-- Migration 168: retention_policy + class_assignment + disposal_event + legal_hold
-- ----------------------------------------------------------------------------
-- Records-management lifecycle for the admin "Lưu giữ" tab.
--
-- Compliance references
--   * ISO 9001 §7.5.3.2  — Control of documented information (retention)
--   * AS9100D §7.5.3     — Aerospace records control
--   * 21 CFR Part 11 §11.10(c) — Protection of records to enable accurate
--                                 and ready retrieval throughout the
--                                 retention period
--   * GDPR Art. 5(1)(e)  — Storage limitation principle
--   * GDPR Art. 17       — Right to erasure
--   * SEC Rule 17a-4     — Broker-dealer records retention (USA)
--   * Vietnam Law on Archives 2011 + Decree 01/2013/ND-CP — minimum
--                                 retention periods for production/quality
--                                 records (5–20 years).
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. retention_policy
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retention_policy (
    policy_code                 VARCHAR(40)     PRIMARY KEY,
    label                       VARCHAR(200)    NOT NULL,
    label_vi                    VARCHAR(200),
    description                 TEXT,
    description_vi              TEXT,
    doc_pattern                 VARCHAR(200)    NOT NULL,
    record_class                VARCHAR(60),
    retention_period_years      NUMERIC(6,2)    NOT NULL,
    retention_basis             VARCHAR(20)     NOT NULL DEFAULT 'operational'
                                CHECK (retention_basis IN ('regulatory','operational','legal_hold','contractual','customer_required')),
    retention_trigger           VARCHAR(40)     NOT NULL DEFAULT 'effective_from'
                                CHECK (retention_trigger IN ('effective_from','superseded_at','retired_at','contract_end','event_date','last_used_at')),
    disposition_method          VARCHAR(20)     NOT NULL DEFAULT 'archive'
                                CHECK (disposition_method IN ('archive','destroy','return','redact','review')),
    disposition_witness_required BOOLEAN        NOT NULL DEFAULT FALSE,
    legal_hold_supersedes       BOOLEAN         NOT NULL DEFAULT TRUE,
    notification_lead_days      SMALLINT        NOT NULL DEFAULT 30,
    compliance_refs             TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                    JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version      VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code            VARCHAR(30),
    org_legal_entity_code       VARCHAR(30),
    org_plant_id                VARCHAR(30),
    org_site_id                 VARCHAR(30),
    row_version                 INTEGER         NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                  UUID,
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by                  UUID,
    deleted_at                  TIMESTAMPTZ,
    deleted_by                  UUID
);

COMMENT ON TABLE retention_policy IS 'Document/record retention policies (ISO 9001 §7.5.3.2 / AS9100 / 21 CFR §11.10(c) / GDPR / Vietnam Archives Law).';
COMMENT ON COLUMN retention_policy.doc_pattern IS 'Glob (sop-*), exact code (qms-man-001), or label (all_qa_records).';
COMMENT ON COLUMN retention_policy.retention_period_years IS 'Numeric so half-years (0.5 = 6 months, 99 = effectively permanent).';
COMMENT ON COLUMN retention_policy.retention_trigger IS 'Which timestamp starts the retention clock.';
COMMENT ON COLUMN retention_policy.legal_hold_supersedes IS 'TRUE if an active legal hold blocks disposal — typically TRUE for everything.';

CREATE INDEX IF NOT EXISTS idx_retention_policy_pattern ON retention_policy(doc_pattern) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_retention_policy_basis ON retention_policy(retention_basis) WHERE is_active = TRUE;

-- FK from documents.retention_policy_code (added in 166) to retention_policy.policy_code.
-- Use a NOT VALID FK so existing rows don't fail; revalidate after backfill.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_retention_policy_code'
    ) THEN
        BEGIN
            ALTER TABLE documents
                ADD CONSTRAINT fk_documents_retention_policy_code
                FOREIGN KEY (retention_policy_code) REFERENCES retention_policy(policy_code) NOT VALID;
        EXCEPTION WHEN OTHERS THEN
            -- documents may not have the column yet if 166 was rolled back; skip silently.
            NULL;
        END;
    END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 2. retention_class_assignment (per-doc explicit assignment + history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retention_class_assignment (
    assignment_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id                  VARCHAR(120)    NOT NULL,
    policy_code             VARCHAR(40)     NOT NULL REFERENCES retention_policy(policy_code),
    classified_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    classified_by           UUID            REFERENCES users(user_id),
    classification_reason   TEXT,
    override_of_id          UUID            REFERENCES retention_class_assignment(assignment_id),
    override_reason         TEXT,
    valid_from              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_until             TIMESTAMPTZ,
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

COMMENT ON TABLE retention_class_assignment IS 'Per-document retention-policy assignment with override history. / Gan chinh sach luu giu cho tung tai lieu.';

CREATE INDEX IF NOT EXISTS idx_retention_assignment_doc ON retention_class_assignment(doc_id) WHERE deleted_at IS NULL AND valid_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_retention_assignment_policy ON retention_class_assignment(policy_code) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. retention_disposal_event (audit-grade disposal log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retention_disposal_event (
    event_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id                  VARCHAR(120)    NOT NULL,
    doc_revision            VARCHAR(20),
    policy_code             VARCHAR(40)     REFERENCES retention_policy(policy_code),
    disposal_method         VARCHAR(20)     NOT NULL
                            CHECK (disposal_method IN ('archive','destroy','return','redact','review')),
    disposal_status         VARCHAR(20)     NOT NULL DEFAULT 'completed'
                            CHECK (disposal_status IN ('scheduled','in_progress','completed','blocked','reversed')),
    scheduled_for           TIMESTAMPTZ,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    disposed_by             UUID            REFERENCES users(user_id),
    witnessed_by            UUID            REFERENCES users(user_id),
    evidence_hash           TEXT,
    evidence_kid            VARCHAR(50),
    storage_location_before VARCHAR(255),
    storage_location_after  VARCHAR(255),
    audit_trail             JSONB           NOT NULL DEFAULT '{}'::jsonb,
    chain_of_custody        JSONB           NOT NULL DEFAULT '[]'::jsonb,
    reverse_of_event_id     UUID            REFERENCES retention_disposal_event(event_id),
    reverse_reason          TEXT,
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
    updated_by              UUID
);

COMMENT ON TABLE retention_disposal_event IS 'Audit log of every disposal action (scheduled / completed / blocked / reversed). Append-mostly.';
COMMENT ON COLUMN retention_disposal_event.evidence_hash IS 'HMAC over (doc_id || doc_revision || method || completed_at || disposed_by) using evidence_kid — proves integrity of the disposal record.';
COMMENT ON COLUMN retention_disposal_event.chain_of_custody IS 'Array of {actor_id, action, ts, location} entries documenting handling.';

CREATE INDEX IF NOT EXISTS idx_retention_disposal_doc ON retention_disposal_event(doc_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_retention_disposal_status ON retention_disposal_event(disposal_status, scheduled_for);

-- ---------------------------------------------------------------------------
-- 4. retention_legal_hold
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retention_legal_hold (
    hold_id                 UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    hold_code               VARCHAR(60)     NOT NULL UNIQUE,
    label                   VARCHAR(200)    NOT NULL,
    label_vi                VARCHAR(200),
    description             TEXT,
    description_vi          TEXT,
    doc_pattern             VARCHAR(200)    NOT NULL,
    case_ref                VARCHAR(120),
    jurisdiction            VARCHAR(80),
    legal_basis             TEXT,
    started_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    started_by              UUID            REFERENCES users(user_id),
    expected_release_at     TIMESTAMPTZ,
    released_at             TIMESTAMPTZ,
    released_by             UUID            REFERENCES users(user_id),
    release_reason          TEXT,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
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

COMMENT ON TABLE retention_legal_hold IS 'Active legal holds that prevent retention disposal until released.';

CREATE INDEX IF NOT EXISTS idx_retention_hold_active ON retention_legal_hold(is_active, doc_pattern) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_retention_hold_pattern ON retention_legal_hold(doc_pattern);

-- ---------------------------------------------------------------------------
-- 5. View: documents past retention but not on legal hold
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_retention_due_for_disposal AS
    SELECT
        d.doc_id,
        d.doc_type,
        d.title,
        d.title_vi,
        d.current_rev,
        d.status,
        d.effective_from,
        d.effective_until,
        d.retention_policy_code,
        rp.label                                   AS policy_label,
        rp.retention_period_years,
        rp.disposition_method,
        CASE rp.retention_trigger
            WHEN 'effective_from'  THEN d.effective_from
            WHEN 'superseded_at'   THEN d.updated_at
            WHEN 'retired_at'      THEN d.updated_at
            ELSE d.updated_at
        END                                        AS clock_started_at,
        CASE rp.retention_trigger
            WHEN 'effective_from'  THEN d.effective_from
            WHEN 'superseded_at'   THEN d.updated_at
            WHEN 'retired_at'      THEN d.updated_at
            ELSE d.updated_at
        END + (rp.retention_period_years || ' years')::interval AS due_at,
        d.legal_hold_active,
        EXISTS (
            SELECT 1 FROM retention_legal_hold h
            WHERE h.is_active = TRUE
              AND h.deleted_at IS NULL
              AND (h.doc_pattern = d.doc_id
                   OR (h.doc_pattern LIKE '%*%' AND d.doc_id LIKE replace(h.doc_pattern, '*', '%')))
        )                                          AS hold_blocks_disposal,
        d.org_company_code,
        d.org_plant_id
    FROM documents d
    JOIN retention_policy rp ON rp.policy_code = d.retention_policy_code AND rp.is_active = TRUE
    WHERE d.status IN ('approved','superseded','obsolete')
      AND (
          CASE rp.retention_trigger
              WHEN 'effective_from'  THEN d.effective_from
              WHEN 'superseded_at'   THEN d.updated_at
              WHEN 'retired_at'      THEN d.updated_at
              ELSE d.updated_at
          END + (rp.retention_period_years || ' years')::interval
      ) <= now() + interval '60 days';

COMMENT ON VIEW v_retention_due_for_disposal IS 'Documents past or within 60d of retention, with hold_blocks_disposal flag. Drives the "Lưu giữ" admin queue.';

-- ---------------------------------------------------------------------------
-- 6. Triggers
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_retention_policy_set_updated_at') THEN
        CREATE TRIGGER trg_retention_policy_set_updated_at
            BEFORE UPDATE ON retention_policy
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_retention_assignment_set_updated_at') THEN
        CREATE TRIGGER trg_retention_assignment_set_updated_at
            BEFORE UPDATE ON retention_class_assignment
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_retention_hold_set_updated_at') THEN
        CREATE TRIGGER trg_retention_hold_set_updated_at
            BEFORE UPDATE ON retention_legal_hold
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

-- ---------------------------------------------------------------------------
-- 7. Seed: standard QMS retention policies (Vietnam + AS9100 baseline)
-- ---------------------------------------------------------------------------
INSERT INTO retention_policy
    (policy_code, label, label_vi, doc_pattern, record_class, retention_period_years, retention_basis, retention_trigger, disposition_method, compliance_refs, description)
VALUES
    ('RET-QMS-MAN',  'QMS Manual',                            'So tay QMS',                          'qms-man-*',     'manual',       20,    'regulatory',  'superseded_at', 'archive', ARRAY['ISO9001-7.5.3.2','AS9100D-7.5.3','VN-Archives-2011'], 'QMS manual revisions retained 20 years post-supersession.'),
    ('RET-SOP',      'Standard Operating Procedure',          'Quy trinh tac nghiep',                'sop-*',         'procedure',    10,    'regulatory',  'superseded_at', 'archive', ARRAY['ISO9001-7.5.3.2','AS9100D-7.5.3'],                  'SOPs retained 10 years post-supersession.'),
    ('RET-WI',       'Work Instruction',                      'Huong dan cong viec',                  'wi-*',          'instruction',   7,    'operational', 'superseded_at', 'archive', ARRAY['ISO9001-7.5.3.2'],                                  'WIs retained 7 years post-supersession.'),
    ('RET-FRM-QC',   'Quality Form Records',                  'Ho so bieu mau chat luong',            'frm-6*',        'qc_record',    10,    'regulatory',  'effective_from','archive', ARRAY['ISO9001-7.5.3.2','AS9100D-7.5.3','21CFR-11.10(c)'],   'QC inspection / NCR / CAPA records 10 years.'),
    ('RET-FRM-PROD', 'Production Form Records',               'Ho so bieu mau san xuat',              'frm-5*',        'prod_record',   7,    'operational', 'effective_from','archive', ARRAY['ISO9001-7.5.3.2'],                                  'Production travelers / setup sheets 7 years.'),
    ('RET-FRM-FIN',  'Finance / Procurement Records',         'Ho so tai chinh / mua hang',           'frm-7*',        'fin_record',   10,    'regulatory',  'effective_from','archive', ARRAY['VN-Accounting-Law-2015','SOX-404'],                'Finance records 10 years (Vietnamese accounting law).'),
    ('RET-FRM-HR',   'HR Records',                            'Ho so nhan su',                         'frm-8*',        'hr_record',    50,    'regulatory',  'last_used_at',  'archive', ARRAY['VN-Labor-Code-2019','GDPR-Art.5'],                  'HR personnel files 50 years; GDPR redaction at 5y after offboarding.'),
    ('RET-AUDIT',    'Audit / Compliance Evidence',           'Bang chung kiem toan / tuan thu',      'audit-*',       'audit_record', 10,    'regulatory',  'event_date',    'archive', ARRAY['SOX-404','ISO27001-A.18.1.3'],                     'Audit trails 10 years.'),
    ('RET-TRAIN',    'Training Records',                      'Ho so dao tao',                         'frm-3*',        'train_record',  7,    'regulatory',  'event_date',    'archive', ARRAY['ISO9001-7.2','AS9100D-7.2'],                       'Training records 7 years post-event.'),
    ('RET-POLICY',   'Policy / Charter',                      'Chinh sach / dieu le',                  'pol-*',         'policy',       99,    'regulatory',  'superseded_at', 'archive', ARRAY['ISO9001-7.5.3.2'],                                  'Policies retained indefinitely.')
ON CONFLICT (policy_code) DO NOTHING;

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP VIEW IF EXISTS v_retention_due_for_disposal;
--   ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_retention_policy_code;
--   DROP TABLE IF EXISTS retention_legal_hold;
--   DROP TABLE IF EXISTS retention_disposal_event;
--   DROP TABLE IF EXISTS retention_class_assignment;
--   DROP TABLE IF EXISTS retention_policy;
--   COMMIT;
