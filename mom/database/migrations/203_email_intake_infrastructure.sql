-- ============================================================================
-- Migration 203: AI Email Order Intake (AEOI) — Infrastructure Tables
-- ============================================================================
-- Purpose:
--   Provision the database layer for the AI-powered email order intake module.
--   Outlook / M365 shared mailbox is polled every N minutes (default 120).
--   Incoming emails from an admin-managed sender allowlist are parsed by
--   Claude API to extract SO, WO, PO lines, part numbers, revision, quantity,
--   delivery date, and ship-to address. Results flow through a validation +
--   deduplication step before auto-creating or queuing for review.
--
-- Tables:
--   email_intake_config         — Singleton runtime settings row (connection,
--                                 operational logic, security, notifications).
--   email_intake_sender_allowlist — Admin-managed list of permitted sender
--                                 email addresses and/or domains.
--   email_intake_poll_run       — Audit log of each mailbox poll execution.
--   email_intake_message        — Per-email processing record.
--   email_intake_extraction     — AI extraction result per email.
--   email_intake_quarantine     — Emails held for manual review (unknown sender,
--                                 spoofing flag, high-value threshold breach).
--
-- Standards:
--   ISO 9001 §8.2.2 (determination of customer requirements),
--   ISO 27001 A.13.1 (network security — controlled external input),
--   SOX §302 (management review of automated order entry).
-- Date: 2026-05-27
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. email_intake_config — Singleton settings row (id = 1 always)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_config (
    id                          SERIAL          PRIMARY KEY,

    -- ── Mailbox connection ──────────────────────────────────────────────────
    m365_tenant_id              VARCHAR(100),
    m365_client_id              VARCHAR(100),
    m365_client_secret_enc      TEXT,           -- AES-256 encrypted at rest
    intake_mailbox              VARCHAR(200),   -- e.g. orders@hesemeng.com
    enabled                     BOOLEAN         NOT NULL DEFAULT false,
    poll_interval_minutes       INTEGER         NOT NULL DEFAULT 120
                                                CHECK (poll_interval_minutes BETWEEN 15 AND 1440),
    last_poll_at                TIMESTAMPTZ,
    next_poll_at                TIMESTAMPTZ,

    -- ── Intake rules ────────────────────────────────────────────────────────
    require_attachment          BOOLEAN         NOT NULL DEFAULT true,
    allowed_attachment_types    JSONB           NOT NULL DEFAULT '["pdf","xlsx","docx"]',
    subject_filter_regex        VARCHAR(500),   -- NULL = no subject filter
    extraction_scope            VARCHAR(20)     NOT NULL DEFAULT 'both'
                                                CHECK (extraction_scope IN ('body','attachments','both')),
    max_attachments_per_email   INTEGER         NOT NULL DEFAULT 3
                                                CHECK (max_attachments_per_email BETWEEN 1 AND 10),

    -- ── Processing / operational logic ─────────────────────────────────────
    auto_create_mode            VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                                CHECK (auto_create_mode IN ('draft','confirmed','review_queue')),
    confidence_threshold        NUMERIC(3,2)    NOT NULL DEFAULT 0.75
                                                CHECK (confidence_threshold BETWEEN 0.00 AND 1.00),
    duplicate_check_days        INTEGER         NOT NULL DEFAULT 30
                                                CHECK (duplicate_check_days BETWEEN 0 AND 365),
    part_match_mode             VARCHAR(30)     NOT NULL DEFAULT 'exact'
                                                CHECK (part_match_mode IN ('exact','fuzzy','review_if_no_match')),
    missing_field_action        VARCHAR(30)     NOT NULL DEFAULT 'flag'
                                                CHECK (missing_field_action IN ('block','flag','create_with_blanks')),
    auto_cascade_jo             BOOLEAN         NOT NULL DEFAULT false,
    business_hours_only         BOOLEAN         NOT NULL DEFAULT false,
    business_hours_start        TIME                     DEFAULT '07:00',
    business_hours_end          TIME                     DEFAULT '18:00',
    business_hours_timezone     VARCHAR(50)              DEFAULT 'Asia/Ho_Chi_Minh',

    -- ── Security ────────────────────────────────────────────────────────────
    allowlist_enforcement       VARCHAR(20)     NOT NULL DEFAULT 'strict'
                                                CHECK (allowlist_enforcement IN ('strict','domain_only','off')),
    require_spf_dkim            BOOLEAN         NOT NULL DEFAULT false,
    max_orders_per_poll         INTEGER         NOT NULL DEFAULT 50
                                                CHECK (max_orders_per_poll BETWEEN 1 AND 500),
    quarantine_unknown_senders  BOOLEAN         NOT NULL DEFAULT true,
    quarantine_review_alert     BOOLEAN         NOT NULL DEFAULT true,
    high_value_threshold        NUMERIC(15,2),           -- NULL = disabled
    high_value_currency         VARCHAR(3)      NOT NULL DEFAULT 'USD',
    high_value_action           VARCHAR(20)     NOT NULL DEFAULT 'review_queue'
                                                CHECK (high_value_action IN ('review_queue','block','notify_only')),
    audit_retention_days        INTEGER         NOT NULL DEFAULT 90
                                                CHECK (audit_retention_days BETWEEN 30 AND 730),
    mask_prices_in_log          BOOLEAN         NOT NULL DEFAULT false,

    -- ── Notifications ───────────────────────────────────────────────────────
    notify_roles_on_create      JSONB           NOT NULL DEFAULT '[]',
    notify_roles_on_review      JSONB           NOT NULL DEFAULT '["sales_manager","planner"]',
    notify_roles_on_error       JSONB           NOT NULL DEFAULT '["admin"]',
    escalation_review_hours     INTEGER         NOT NULL DEFAULT 24
                                                CHECK (escalation_review_hours BETWEEN 1 AND 168),

    -- ── Meta ────────────────────────────────────────────────────────────────
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by                  VARCHAR(120)
);

COMMENT ON TABLE email_intake_config
    IS 'Singleton runtime settings for the AI Email Order Intake module. Always one row (id=1). Managed via Admin > AI Order Intake.';
COMMENT ON COLUMN email_intake_config.m365_client_secret_enc
    IS 'M365 client secret, AES-256 encrypted. Never logged. Decrypted in-memory only.';
COMMENT ON COLUMN email_intake_config.allowlist_enforcement
    IS 'strict=only email_intake_sender_allowlist entries pass; domain_only=any @domain in list passes; off=all senders accepted (dangerous).';
COMMENT ON COLUMN email_intake_config.high_value_threshold
    IS 'Total PO value above this amount triggers high_value_action regardless of confidence. NULL disables the check.';

-- Seed singleton row with safe defaults (disabled until admin configures M365)
INSERT INTO email_intake_config (
    id, enabled, poll_interval_minutes,
    auto_create_mode, confidence_threshold,
    notify_roles_on_review, notify_roles_on_error,
    updated_by
) VALUES (
    1, false, 120,
    'draft', 0.75,
    '["sales_manager","planner"]',
    '["admin"]',
    'system.migration_203'
) ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. email_intake_sender_allowlist — Permitted email addresses / domains
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_sender_allowlist (
    id              SERIAL          PRIMARY KEY,
    entry_type      VARCHAR(10)     NOT NULL CHECK (entry_type IN ('email','domain')),
    value           VARCHAR(200)    NOT NULL,   -- 'buyer@acme.com' or 'acme.com'
    label           VARCHAR(200),               -- human-readable name, e.g. 'Acme Corp — Purchasing'
    customer_id     VARCHAR(50),                -- optional FK to customers.customer_id
    active          BOOLEAN         NOT NULL DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      VARCHAR(120),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      VARCHAR(120),
    UNIQUE (entry_type, value)
);

COMMENT ON TABLE email_intake_sender_allowlist
    IS 'Admin-managed list of permitted email senders for AI order intake. entry_type=email matches exact address; entry_type=domain matches any @domain.';
COMMENT ON COLUMN email_intake_sender_allowlist.value
    IS 'For entry_type=email: full email address (lowercase). For entry_type=domain: domain without leading @ (lowercase).';
COMMENT ON COLUMN email_intake_sender_allowlist.customer_id
    IS 'Optional link to customers table. When set, extracted orders are pre-assigned to this customer_id during validation.';

CREATE INDEX IF NOT EXISTS idx_email_intake_allowlist_value ON email_intake_sender_allowlist (lower(value)) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_email_intake_allowlist_customer ON email_intake_sender_allowlist (customer_id) WHERE customer_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 3. email_intake_poll_run — Audit log of each mailbox poll cycle
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_poll_run (
    id                  SERIAL          PRIMARY KEY,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    finished_at         TIMESTAMPTZ,
    status              VARCHAR(20)     NOT NULL DEFAULT 'running'
                                        CHECK (status IN ('running','completed','failed','skipped')),
    triggered_by        VARCHAR(20)     NOT NULL DEFAULT 'cron'
                                        CHECK (triggered_by IN ('cron','manual','api','schedule')),
    triggered_user      VARCHAR(120),
    messages_found      INTEGER         NOT NULL DEFAULT 0,
    messages_processed  INTEGER         NOT NULL DEFAULT 0,
    messages_skipped    INTEGER         NOT NULL DEFAULT 0,
    messages_quarantined INTEGER        NOT NULL DEFAULT 0,
    orders_created      INTEGER         NOT NULL DEFAULT 0,
    review_items_added  INTEGER         NOT NULL DEFAULT 0,
    parse_errors        INTEGER         NOT NULL DEFAULT 0,
    duration_ms         INTEGER,
    error_detail        TEXT,
    graph_api_calls     INTEGER         NOT NULL DEFAULT 0
);

COMMENT ON TABLE email_intake_poll_run
    IS 'One row per mailbox poll cycle. Provides audit trail and performance metrics for each 2-hour (or manual) intake run.';

CREATE INDEX IF NOT EXISTS idx_email_intake_poll_run_started ON email_intake_poll_run (started_at DESC);


-- ---------------------------------------------------------------------------
-- 4. email_intake_message — Per-email processing record
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_message (
    id                  SERIAL          PRIMARY KEY,
    poll_run_id         INTEGER         REFERENCES email_intake_poll_run(id) ON DELETE SET NULL,
    graph_message_id    VARCHAR(600)    NOT NULL UNIQUE, -- M365 immutable message ID
    internet_message_id VARCHAR(500),                   -- RFC 2822 Message-ID header
    received_at         TIMESTAMPTZ,
    from_email          VARCHAR(200)    NOT NULL,
    from_name           VARCHAR(200),
    subject             TEXT,
    body_preview        TEXT,                           -- first 500 chars (not full body)
    has_attachments     BOOLEAN         NOT NULL DEFAULT false,
    attachment_count    INTEGER         NOT NULL DEFAULT 0,
    attachment_names    JSONB,                          -- ["PO-2026-0042.pdf", ...]
    spf_result          VARCHAR(20),                    -- pass / fail / neutral / none
    dkim_result         VARCHAR(20),
    allowlist_match     VARCHAR(20),                    -- email / domain / none
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending','processing','extracted',
                                                          'created','review_queue','quarantined',
                                                          'skipped','failed','duplicate')),
    skip_reason         VARCHAR(200),
    extraction_id       INTEGER,                        -- FK to email_intake_extraction
    so_number           VARCHAR(50),                    -- SO created (if any)
    so_id               INTEGER,                        -- FK to sales_orders
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_intake_message
    IS 'One row per email evaluated during an intake poll. Tracks the full lifecycle from receipt to SO creation or quarantine.';

CREATE INDEX IF NOT EXISTS idx_email_intake_msg_status ON email_intake_message (status);
CREATE INDEX IF NOT EXISTS idx_email_intake_msg_from ON email_intake_message (lower(from_email));
CREATE INDEX IF NOT EXISTS idx_email_intake_msg_received ON email_intake_message (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_intake_msg_poll ON email_intake_message (poll_run_id);


-- ---------------------------------------------------------------------------
-- 5. email_intake_extraction — AI extraction result per email
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_extraction (
    id                  SERIAL          PRIMARY KEY,
    message_id          INTEGER         NOT NULL REFERENCES email_intake_message(id) ON DELETE CASCADE,
    ai_model            VARCHAR(100)    NOT NULL DEFAULT 'claude-sonnet-4-6',
    tokens_in           INTEGER,
    tokens_out          INTEGER,

    -- Raw extraction results
    body_extract        JSONB,          -- extracted from email body
    attachment_extracts JSONB,          -- array of per-attachment extractions
    merged_result       JSONB,          -- final merged + normalised result
    confidence          NUMERIC(3,2)    CHECK (confidence BETWEEN 0.00 AND 1.00),

    -- Validation results
    customer_matched    BOOLEAN,
    customer_id_resolved VARCHAR(50),
    parts_match_summary JSONB,          -- [{part_number, matched_item_id, match_mode, confidence}]
    duplicate_detected  BOOLEAN         NOT NULL DEFAULT false,
    duplicate_ref       VARCHAR(100),   -- existing SO/customer_po_number if duplicate

    -- Action
    action_taken        VARCHAR(20)     CHECK (action_taken IN ('created','review_queue',
                                                                'duplicate_skipped','blocked',
                                                                'failed')),
    review_notes        TEXT,
    reviewed_by         VARCHAR(120),
    reviewed_at         TIMESTAMPTZ,
    review_action       VARCHAR(20)     CHECK (review_action IN ('approve','reject','edit_approve')),

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_intake_extraction
    IS 'AI extraction result for each processed email. Stores both raw per-attachment extracts and the final merged/validated result used for SO creation.';
COMMENT ON COLUMN email_intake_extraction.merged_result
    IS 'Final normalised JSON: {customer_po_number, customer_name, order_date, ship_to{}, lines:[{part_number, revision, quantity, uom, need_date, unit_price}]}';

CREATE INDEX IF NOT EXISTS idx_email_intake_ext_message ON email_intake_extraction (message_id);
CREATE INDEX IF NOT EXISTS idx_email_intake_ext_action ON email_intake_extraction (action_taken);
CREATE INDEX IF NOT EXISTS idx_email_intake_ext_review ON email_intake_extraction (action_taken, reviewed_at)
    WHERE action_taken = 'review_queue';


-- ---------------------------------------------------------------------------
-- 6. email_intake_quarantine — Emails held for manual security review
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_intake_quarantine (
    id                  SERIAL          PRIMARY KEY,
    message_id          INTEGER         NOT NULL REFERENCES email_intake_message(id) ON DELETE CASCADE,
    reason_code         VARCHAR(50)     NOT NULL,   -- unknown_sender / spf_fail / dkim_fail /
                                                    -- domain_not_in_allowlist / high_value /
                                                    -- rate_limit_exceeded / manual
    reason_detail       VARCHAR(500),
    from_email          VARCHAR(200),
    subject             TEXT,
    raw_headers         JSONB,                      -- relevant SMTP headers for forensics
    severity            VARCHAR(10)     NOT NULL DEFAULT 'medium'
                                        CHECK (severity IN ('low','medium','high')),
    notified            BOOLEAN         NOT NULL DEFAULT false,
    reviewed            BOOLEAN         NOT NULL DEFAULT false,
    review_action       VARCHAR(20)     CHECK (review_action IN ('allow','block','ignore')),
    review_notes        TEXT,
    reviewed_by         VARCHAR(120),
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_intake_quarantine
    IS 'Emails held for manual security review. reason_code=unknown_sender is the most common; high_value=PO exceeds admin threshold. Admin reviews via Admin > AI Order Intake > Kiểm duyệt bảo mật.';

CREATE INDEX IF NOT EXISTS idx_email_intake_quar_reviewed ON email_intake_quarantine (reviewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_intake_quar_severity ON email_intake_quarantine (severity) WHERE reviewed = false;

COMMIT;
