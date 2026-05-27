-- ============================================================================
-- Migration 205: AEOI — Order Case data model upgrade (Phase 2)
-- ============================================================================
-- Purpose:
--   Phase 1 (migration 203) gave us config + sender allowlist + raw email log
--   + AI extraction record + quarantine queue. Phase 2 adds the structured
--   case lifecycle the spec calls for so AI cannot bypass governed
--   Customer PO / Sales Order / Job Order / Work Order services.
--
--   New tables:
--     email_intake_mailbox           — Admin-managed list of mailbox/folder
--                                      scopes the worker may read.
--     email_intake_header_rule       — Recognition header rules
--                                      ([HESEM-ORDER-INTAKE] blocks etc.).
--     email_intake_customer_template — Per-customer PO parsing hints.
--     email_intake_case              — One row per AI intake case (the
--                                      governed review/approve/commit unit).
--     email_intake_case_line         — Per-line extracted PO data.
--     email_intake_attachment        — File-level metadata with sha256 +
--                                      storage path + OCR status.
--     email_intake_validation_check  — Per-check validation evidence.
--     email_intake_commit_log        — Audit trail of CPO/SO/JO/WO commits.
--     email_intake_worker_token      — HMAC credentials for the local
--                                      Outlook worker (secret hashed only).
--
-- Backwards compatibility:
--   Existing tables from migration 203 (email_intake_config,
--   email_intake_sender_allowlist, email_intake_poll_run,
--   email_intake_message, email_intake_extraction, email_intake_quarantine)
--   are NOT dropped or renamed. The new email_intake_case references both
--   email_intake_message and email_intake_extraction via FK so Phase 1 data
--   continues to flow.
--
-- Standards:
--   ISO 9001 §8.2.2 (determination of requirements before commitment),
--   ISO 27001 A.13.1 (controlled external input),
--   SOX §302 (management oversight of automated commercial entries).
-- Date: 2026-05-27
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. email_intake_mailbox — Multiple mailbox/folder scope rows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_mailbox (
    id                     SERIAL       PRIMARY KEY,
    mailbox_address        VARCHAR(255) NOT NULL,
    provider               VARCHAR(50)  NOT NULL DEFAULT 'outlook_local'
                                        CHECK (provider IN ('outlook_local','microsoft_graph','manual_upload')),
    folder_path            VARCHAR(500) NOT NULL,
    enabled                BOOLEAN      NOT NULL DEFAULT true,
    read_body              BOOLEAN      NOT NULL DEFAULT true,
    read_attachments       BOOLEAN      NOT NULL DEFAULT true,
    move_after_processed   BOOLEAN      NOT NULL DEFAULT false,
    processed_folder_path  VARCHAR(500),
    error_folder_path      VARCHAR(500),
    last_scan_at           TIMESTAMPTZ,
    last_status            VARCHAR(50),
    last_error             TEXT,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by             VARCHAR(120),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by             VARCHAR(120)
);

-- Case-insensitive uniqueness (functional indexes can't live in UNIQUE
-- table constraints — they go in CREATE UNIQUE INDEX).
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_intake_mailbox_addr_folder
    ON email_intake_mailbox (lower(mailbox_address), lower(folder_path));

COMMENT ON TABLE  email_intake_mailbox
    IS 'Admin-managed list of mailbox/folder scopes the worker is permitted to read. The worker config endpoint exposes only enabled rows.';
COMMENT ON COLUMN email_intake_mailbox.provider
    IS 'outlook_local: COM-driven worker on Windows; microsoft_graph: backend Graph polling; manual_upload: admin uploads .msg/.eml.';
COMMENT ON COLUMN email_intake_mailbox.folder_path
    IS 'Outlook folder path, e.g. Inbox/AI-Order-Intake. Workers MUST refuse to read other folders.';


-- ---------------------------------------------------------------------------
-- 2. email_intake_header_rule — Recognition header rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_header_rule (
    id                     SERIAL       PRIMARY KEY,
    rule_name              VARCHAR(200) NOT NULL,
    enabled                BOOLEAN      NOT NULL DEFAULT true,
    subject_prefix         VARCHAR(200),
    body_start_marker      VARCHAR(200) NOT NULL DEFAULT '[HESEM-ORDER-INTAKE]',
    body_end_marker        VARCHAR(200) NOT NULL DEFAULT '[/HESEM-ORDER-INTAKE]',
    required_fields        JSONB        NOT NULL DEFAULT '["Doc-Type","Action","Customer-Code","AI-Process"]',
    allowed_doc_types      JSONB        NOT NULL DEFAULT '["CUSTOMER_PO","PO_CHANGE","PO_CANCEL","EXPEDITE"]',
    allowed_actions        JSONB        NOT NULL DEFAULT '["NEW","CHANGE","CANCEL","EXPEDITE"]',
    ai_process_must_equal  VARCHAR(20)           DEFAULT 'YES',
    missing_header_action  VARCHAR(30)  NOT NULL DEFAULT 'ignore'
                                        CHECK (missing_header_action IN ('ignore','create_hold','reject')),
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by             VARCHAR(120),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by             VARCHAR(120)
);

COMMENT ON TABLE  email_intake_header_rule
    IS 'Per-customer recognition rules. The worker can prefilter on subject_prefix; the backend re-runs the full rule (including body markers + required fields) before creating an intake case.';

-- Seed one default rule so admins have a template
INSERT INTO email_intake_header_rule (rule_name, enabled, subject_prefix, created_by)
VALUES ('HESEM Standard Order Intake Header', true, '[HESEM-ORDER-INTAKE]', 'system.migration_205')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. email_intake_customer_template — Per-customer PO parsing hints
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_customer_template (
    id                              SERIAL        PRIMARY KEY,
    customer_id                     VARCHAR(50)   NOT NULL,
    template_name                   VARCHAR(200)  NOT NULL,
    document_type                   VARCHAR(50)   NOT NULL DEFAULT 'CUSTOMER_PO',
    file_type                       VARCHAR(20)   NOT NULL DEFAULT 'pdf'
                                                  CHECK (file_type IN ('pdf','xlsx','xls','docx','png','jpg','jpeg','txt')),
    enabled                         BOOLEAN       NOT NULL DEFAULT true,
    po_number_hints                 JSONB         NOT NULL DEFAULT '[]',
    part_number_hints               JSONB         NOT NULL DEFAULT '[]',
    revision_hints                  JSONB         NOT NULL DEFAULT '[]',
    quantity_hints                  JSONB         NOT NULL DEFAULT '[]',
    delivery_date_hints             JSONB         NOT NULL DEFAULT '[]',
    ship_to_hints                   JSONB         NOT NULL DEFAULT '[]',
    unit_price_hints                JSONB         NOT NULL DEFAULT '[]',
    line_table_required             BOOLEAN       NOT NULL DEFAULT true,
    min_confidence_overall          NUMERIC(4,3)  NOT NULL DEFAULT 0.950
                                                  CHECK (min_confidence_overall BETWEEN 0 AND 1),
    min_confidence_required_field   NUMERIC(4,3)  NOT NULL DEFAULT 0.900
                                                  CHECK (min_confidence_required_field BETWEEN 0 AND 1),
    created_at                      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by                      VARCHAR(120),
    updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by                      VARCHAR(120),
    UNIQUE (customer_id, document_type, file_type, template_name)
);

COMMENT ON TABLE  email_intake_customer_template
    IS 'Field-label hints AI uses to anchor extraction per customer / document_type / file_type combination.';
COMMENT ON COLUMN email_intake_customer_template.line_table_required
    IS 'When true, the AI must locate a tabular line section. If false, line-less PO change notes are acceptable.';


-- ---------------------------------------------------------------------------
-- 4. email_intake_case — Governed review/approve/commit unit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_case (
    id                          SERIAL        PRIMARY KEY,
    intake_no                   VARCHAR(50)   NOT NULL UNIQUE,
    message_id                  INTEGER       REFERENCES email_intake_message(id)    ON DELETE SET NULL,
    extraction_id               INTEGER       REFERENCES email_intake_extraction(id) ON DELETE SET NULL,
    mailbox_id                  INTEGER       REFERENCES email_intake_mailbox(id)    ON DELETE SET NULL,
    sender_allowlist_id         INTEGER       REFERENCES email_intake_sender_allowlist(id) ON DELETE SET NULL,
    header_rule_id              INTEGER       REFERENCES email_intake_header_rule(id) ON DELETE SET NULL,
    template_id                 INTEGER       REFERENCES email_intake_customer_template(id) ON DELETE SET NULL,
    status                      VARCHAR(50)   NOT NULL DEFAULT 'new'
                                              CHECK (status IN (
                                                  'new','header_matched','attachment_received',
                                                  'extraction_pending','extraction_running','extracted',
                                                  'validation_pending','validation_running',
                                                  'needs_review','approved','rejected',
                                                  'duplicate_hold','security_hold',
                                                  'engineering_review','commercial_review',
                                                  'planning_review','quality_review',
                                                  'commit_ready','committed_cpo','committed_so',
                                                  'committed_jo','committed_wo','closed','error'
                                              )),
    document_type               VARCHAR(50),
    action_type                 VARCHAR(50),
    customer_id                 VARCHAR(50),
    customer_name               VARCHAR(255),
    customer_po_number          VARCHAR(100),
    po_date                     DATE,
    currency_code               VARCHAR(10),
    incoterm_code               VARCHAR(20),
    payment_term_code           VARCHAR(50),
    overall_confidence          NUMERIC(4,3)  CHECK (overall_confidence IS NULL OR overall_confidence BETWEEN 0 AND 1),
    field_confidence            JSONB         NOT NULL DEFAULT '{}',
    extracted_json              JSONB         NOT NULL DEFAULT '{}',
    validation_json             JSONB         NOT NULL DEFAULT '{}',
    blocking_codes              JSONB         NOT NULL DEFAULT '[]',
    warning_codes               JSONB         NOT NULL DEFAULT '[]',
    committed_customer_po_id    VARCHAR(50),
    committed_so_number         VARCHAR(50),
    committed_jo_numbers        JSONB         NOT NULL DEFAULT '[]',
    committed_wo_numbers        JSONB         NOT NULL DEFAULT '[]',
    reviewed_by                 VARCHAR(120),
    reviewed_at                 TIMESTAMPTZ,
    approved_by                 VARCHAR(120),
    approved_at                 TIMESTAMPTZ,
    rejected_by                 VARCHAR(120),
    rejected_at                 TIMESTAMPTZ,
    rejection_reason            TEXT,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by                  VARCHAR(120),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by                  VARCHAR(120)
);

COMMENT ON TABLE  email_intake_case
    IS 'One governed case per AI intake email. Status drives review/approve/commit. JO/WO commit goes through existing OrderService gates and is NEVER auto-created from email alone.';

CREATE INDEX IF NOT EXISTS idx_email_intake_case_status         ON email_intake_case (status);
CREATE INDEX IF NOT EXISTS idx_email_intake_case_customer_po    ON email_intake_case (customer_id, customer_po_number);
CREATE INDEX IF NOT EXISTS idx_email_intake_case_created_at     ON email_intake_case (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_intake_case_committed_so   ON email_intake_case (committed_so_number) WHERE committed_so_number IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 5. email_intake_case_line — Per-line extracted PO data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_case_line (
    id                          SERIAL         PRIMARY KEY,
    case_id                     INTEGER        NOT NULL REFERENCES email_intake_case(id) ON DELETE CASCADE,
    line_no                     VARCHAR(50),
    customer_part_number        VARCHAR(100),
    part_number                 VARCHAR(100)   NOT NULL,
    part_description            TEXT,
    revision_number             VARCHAR(50),
    customer_revision           VARCHAR(50),
    drawing_revision            VARCHAR(50),
    quantity                    NUMERIC(18,4)  NOT NULL CHECK (quantity > 0),
    uom                         VARCHAR(30)    NOT NULL DEFAULT 'EA',
    requested_delivery_date     DATE,
    delivery_address            TEXT,
    ship_to_site_id             VARCHAR(50),
    unit_price                  NUMERIC(18,4),
    line_total                  NUMERIC(18,4),
    field_confidence            JSONB          NOT NULL DEFAULT '{}',
    evidence                    JSONB          NOT NULL DEFAULT '{}',
    validation_status           VARCHAR(50)    NOT NULL DEFAULT 'pending'
                                               CHECK (validation_status IN ('pending','passed','warning','blocked')),
    validation_codes            JSONB          NOT NULL DEFAULT '[]',
    created_at                  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  email_intake_case_line
    IS 'Per-line PO data the AI extracted. quantity > 0 is enforced at DB level (no Phase 1 qty=0 edge case).';
COMMENT ON COLUMN email_intake_case_line.revision_number
    IS 'The revision the customer requested. MUST match an item_revisions row with status released before JO can be committed.';

CREATE INDEX IF NOT EXISTS idx_email_intake_case_line_case          ON email_intake_case_line (case_id);
CREATE INDEX IF NOT EXISTS idx_email_intake_case_line_part_rev      ON email_intake_case_line (part_number, revision_number);
CREATE INDEX IF NOT EXISTS idx_email_intake_case_line_validation    ON email_intake_case_line (case_id, validation_status);


-- ---------------------------------------------------------------------------
-- 6. email_intake_attachment — File metadata + sha256 + storage path
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_attachment (
    id                       SERIAL        PRIMARY KEY,
    case_id                  INTEGER       REFERENCES email_intake_case(id)    ON DELETE CASCADE,
    message_id               INTEGER       REFERENCES email_intake_message(id) ON DELETE CASCADE,
    original_filename        VARCHAR(500)  NOT NULL,
    safe_filename            VARCHAR(500)  NOT NULL,
    mime_type                VARCHAR(200),
    extension                VARCHAR(20),
    file_size_bytes          BIGINT,
    sha256                   VARCHAR(64)   NOT NULL,
    storage_path             TEXT,
    extracted_text_path      TEXT,
    ocr_status               VARCHAR(50),
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (sha256)
);

COMMENT ON TABLE  email_intake_attachment
    IS 'Per-file metadata. UNIQUE(sha256) deduplicates identical PO PDFs across cases and prevents replay attacks. Dangerous extensions are rejected before insert by AiOrderIntakeWorkerAuthService.';

CREATE INDEX IF NOT EXISTS idx_email_intake_attachment_case    ON email_intake_attachment (case_id);
CREATE INDEX IF NOT EXISTS idx_email_intake_attachment_msg     ON email_intake_attachment (message_id);


-- ---------------------------------------------------------------------------
-- 7. email_intake_validation_check — Per-check evidence trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_validation_check (
    id          SERIAL        PRIMARY KEY,
    case_id     INTEGER       NOT NULL REFERENCES email_intake_case(id) ON DELETE CASCADE,
    check_code  VARCHAR(100)  NOT NULL,
    severity    VARCHAR(20)   NOT NULL CHECK (severity IN ('info','warning','blocker')),
    result      VARCHAR(20)   NOT NULL CHECK (result IN ('pass','fail','skip','warn')),
    message     TEXT,
    details     JSONB         NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  email_intake_validation_check
    IS 'One row per validation check fired against a case. Provides the audit evidence behind validation_status / blocking_codes.';

CREATE INDEX IF NOT EXISTS idx_email_intake_val_case_result    ON email_intake_validation_check (case_id, result);


-- ---------------------------------------------------------------------------
-- 8. email_intake_commit_log — Audit trail of every CPO/SO/JO/WO commit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_commit_log (
    id             SERIAL        PRIMARY KEY,
    case_id        INTEGER       NOT NULL REFERENCES email_intake_case(id) ON DELETE CASCADE,
    commit_type    VARCHAR(30)   NOT NULL CHECK (commit_type IN ('customer_po','sales_order','job_order','work_order')),
    target_ref     VARCHAR(100),
    status         VARCHAR(30)   NOT NULL CHECK (status IN ('queued','succeeded','failed','rolled_back')),
    payload        JSONB         NOT NULL DEFAULT '{}',
    error_detail   TEXT,
    committed_by   VARCHAR(120),
    committed_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  email_intake_commit_log
    IS 'Every CPO/SO/JO/WO commit triggered by AEOI lands here for SOX-traceable audit. payload stores the exact payload sent to CustomerPurchaseOrderService / OrderService.';

CREATE INDEX IF NOT EXISTS idx_email_intake_commit_case_type   ON email_intake_commit_log (case_id, commit_type);
CREATE INDEX IF NOT EXISTS idx_email_intake_commit_target      ON email_intake_commit_log (target_ref) WHERE target_ref IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 9. email_intake_worker_token — HMAC credentials for local Outlook worker
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_worker_token (
    id              SERIAL        PRIMARY KEY,
    worker_id       VARCHAR(80)   NOT NULL UNIQUE,
    worker_name     VARCHAR(200),
    secret_hash     VARCHAR(255)  NOT NULL,   -- SHA-256(secret) only; raw secret shown once on create/rotate
    enabled         BOOLEAN       NOT NULL DEFAULT true,
    ip_allowlist    JSONB         NOT NULL DEFAULT '[]',
    last_used_at    TIMESTAMPTZ,
    last_used_ip    VARCHAR(80),
    nonce_history   JSONB         NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by      VARCHAR(120),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by      VARCHAR(120)
);

COMMENT ON TABLE  email_intake_worker_token
    IS 'HMAC credentials for the local Outlook PowerShell worker. secret_hash is SHA-256(secret); the raw secret is returned ONCE at create/rotate and never stored. nonce_history is a small ring buffer (≤200 entries) for replay protection.';
COMMENT ON COLUMN email_intake_worker_token.ip_allowlist
    IS 'Optional IPv4/IPv6 CIDR list. Empty array = no IP filter.';

CREATE INDEX IF NOT EXISTS idx_email_intake_worker_enabled     ON email_intake_worker_token (enabled, worker_id);

COMMIT;
