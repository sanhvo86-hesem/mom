-- ============================================================================
-- Migration 206: AEOI — Multi-provider email support (Gmail / generic IMAP)
-- ============================================================================
-- Purpose:
--   Phase 2 of AEOI launched with only outlook_local (PowerShell worker)
--   and microsoft_graph (placeholder) providers. This migration extends the
--   email_intake_mailbox table so an admin can also point AEOI at any IMAP
--   server (Gmail, Yahoo, Zoho, self-hosted, etc.). The first real customer
--   uses Gmail with an App Password.
--
--   We extend the existing provider CHECK constraint to accept three new
--   values:
--     - gmail_imap   — Gmail with 2FA + App Password over IMAP4rev1/SSL
--     - generic_imap — any IMAP4rev1 server (host + port + encryption)
--     - exchange_ews — reserved for on-prem Exchange (not implemented yet)
--
--   We add seven new optional columns to email_intake_mailbox to carry the
--   IMAP connection details. These are NULL for outlook_local rows so
--   nothing breaks for existing Phase 2 mailbox records.
--
-- Security:
--   The IMAP password is stored AES-256 encrypted in `imap_password_enc`
--   (mirroring email_intake_config.m365_client_secret_enc). Encryption
--   key is derived from APP_SECRET — same scheme already audited in
--   EmailIntakeConfigService::deriveKey().
--
--   imap_last_uid is the IMAP UIDNEXT-style cursor: the highest message
--   UID we've already ingested. Each poll fetches only messages with
--   UID > imap_last_uid so we don't re-process the inbox on every
--   2-hour cycle.
--
-- Standards:
--   ISO 9001 section 7.5.3 (control of documented information),
--   ISO 27001 A.10.1 (cryptographic controls),
--   RFC 9051 (IMAP4rev2).
-- Date: 2026-05-27
-- ============================================================================

BEGIN;

ALTER TABLE email_intake_mailbox
    DROP CONSTRAINT IF EXISTS email_intake_mailbox_provider_check;

ALTER TABLE email_intake_mailbox
    ADD CONSTRAINT email_intake_mailbox_provider_check
    CHECK (provider IN (
        'outlook_local',
        'microsoft_graph',
        'manual_upload',
        'gmail_imap',
        'generic_imap',
        'exchange_ews'
    ));

ALTER TABLE email_intake_mailbox
    ADD COLUMN IF NOT EXISTS imap_host             VARCHAR(255),
    ADD COLUMN IF NOT EXISTS imap_port             INTEGER,
    ADD COLUMN IF NOT EXISTS imap_encryption       VARCHAR(20)
        CHECK (imap_encryption IS NULL OR imap_encryption IN ('ssl','tls','starttls','none')),
    ADD COLUMN IF NOT EXISTS imap_username         VARCHAR(255),
    ADD COLUMN IF NOT EXISTS imap_password_enc     TEXT,
    ADD COLUMN IF NOT EXISTS imap_validate_cert    BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS imap_last_uid         BIGINT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS imap_last_uidvalidity BIGINT,
    ADD COLUMN IF NOT EXISTS imap_messages_fetched INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN email_intake_mailbox.imap_host
    IS 'IMAP server hostname. Example for Gmail: imap.gmail.com';
COMMENT ON COLUMN email_intake_mailbox.imap_port
    IS 'IMAP port. 993 = IMAPS (SSL), 143 = STARTTLS / plain.';
COMMENT ON COLUMN email_intake_mailbox.imap_encryption
    IS 'Encryption mode. ssl = implicit TLS on connect (993). starttls = upgrade on 143. none = plaintext (dev only).';
COMMENT ON COLUMN email_intake_mailbox.imap_username
    IS 'IMAP auth username. For Gmail this is the full email address.';
COMMENT ON COLUMN email_intake_mailbox.imap_password_enc
    IS 'AES-256-CBC encrypted IMAP password / App Password. Never logged. Decrypted in-memory only when the poll job needs to connect.';
COMMENT ON COLUMN email_intake_mailbox.imap_validate_cert
    IS 'When true (default), the IMAP TLS handshake validates the server certificate against the CA bundle. Set to false ONLY for self-signed dev servers.';
COMMENT ON COLUMN email_intake_mailbox.imap_last_uid
    IS 'Highest IMAP UID already ingested. Next poll fetches UID > this value to avoid duplicates.';
COMMENT ON COLUMN email_intake_mailbox.imap_last_uidvalidity
    IS 'IMAP UIDVALIDITY value from the previous poll. If the server returns a different value, the UID space has reset and we must re-scan from UID 1.';

CREATE INDEX IF NOT EXISTS idx_email_intake_mailbox_provider_enabled
    ON email_intake_mailbox (provider, enabled);

COMMIT;
