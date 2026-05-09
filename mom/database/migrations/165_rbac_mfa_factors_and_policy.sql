-- ============================================================================
-- Migration 165: MFA — multi-factor authentication (NIST 800-63B + FIDO2)
-- ----------------------------------------------------------------------------
-- The legacy users.mfa_secret + users.mfa_enabled columns model exactly ONE
-- TOTP factor per user. This migration introduces:
--
--   * mfa_factor          : per-factor row (TOTP / WebAuthn / hardware key /
--                           backup-code / email / SMS) with status + AAL.
--   * mfa_recovery_code   : one row per backup-code with hash + used flag.
--   * mfa_policy          : per-role MFA policy (required, min_factors,
--                           allowed_types, required AAL, grace period,
--                           re-auth window).
--   * mfa_challenge       : audit row for every challenge (pending/verified/
--                           failed/expired) — feeds the MFA Audit Timeline.
--
-- References
--   * NIST 800-63B  — AAL1 (single-factor pw), AAL2 (2FA TOTP/SMS),
--                      AAL3 (hardware crypto, FIDO2)
--   * FIDO2 / WebAuthn Level 3
--   * ISO 27001 A.9.4.2 (Secure log-on procedures)
--   * 21 CFR Part 11 §11.10(d) (electronic signatures w/ second factor)
--
-- Idempotent. Safe to re-run.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- mfa_factor
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mfa_factor (
    factor_id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    factor_type             VARCHAR(30)     NOT NULL
                            CHECK (factor_type IN ('totp','webauthn','hardware_key','email','sms','backup_code')),
    factor_label            VARCHAR(120),
    aal_level               SMALLINT        NOT NULL DEFAULT 2
                            CHECK (aal_level BETWEEN 1 AND 3),
    secret_encrypted        BYTEA,
    secret_kid              VARCHAR(50),
    public_key_pem          TEXT,
    credential_id           BYTEA,
    sign_counter            BIGINT          NOT NULL DEFAULT 0,
    attestation_meta        JSONB           NOT NULL DEFAULT '{}'::jsonb,
    transports              TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending_verify'
                            CHECK (status IN ('pending_verify','active','revoked','expired','locked')),
    last_used_at            TIMESTAMPTZ,
    last_used_ip            INET,
    last_used_user_agent    TEXT,
    enrolled_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),
    activated_at            TIMESTAMPTZ,
    revoked_at              TIMESTAMPTZ,
    revoked_by              UUID            REFERENCES users(user_id),
    revoke_reason           TEXT,
    expires_at              TIMESTAMPTZ,
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

COMMENT ON TABLE mfa_factor IS 'Per-factor MFA enrollment (NIST 800-63B / FIDO2). / Yeu to MFA da ghi danh.';
COMMENT ON COLUMN mfa_factor.aal_level IS 'NIST 800-63B AAL: 1 password, 2 OTP/SMS, 3 hardware FIDO2.';
COMMENT ON COLUMN mfa_factor.secret_encrypted IS 'Encrypted TOTP/SMS shared secret. Encrypted via libsodium / KMS — never plaintext on disk.';
COMMENT ON COLUMN mfa_factor.secret_kid IS 'Key-ID of the KMS / libsodium key used to wrap secret_encrypted (rotates without rewrap).';
COMMENT ON COLUMN mfa_factor.public_key_pem IS 'WebAuthn / hardware-key public key (PEM).';
COMMENT ON COLUMN mfa_factor.credential_id IS 'WebAuthn credentialId (binary).';
COMMENT ON COLUMN mfa_factor.sign_counter IS 'WebAuthn signature counter (monotonic; rollback rejected).';

CREATE INDEX IF NOT EXISTS idx_mfa_factor_user ON mfa_factor(user_id) WHERE deleted_at IS NULL AND status != 'revoked';
CREATE INDEX IF NOT EXISTS idx_mfa_factor_active ON mfa_factor(user_id, factor_type) WHERE status = 'active' AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mfa_factor_credential ON mfa_factor(credential_id) WHERE credential_id IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- mfa_recovery_code  (one-time backup codes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mfa_recovery_code (
    recovery_code_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    batch_id                UUID            NOT NULL,
    code_hash               TEXT            NOT NULL,
    code_kid                VARCHAR(50),
    used_at                 TIMESTAMPTZ,
    used_ip                 INET,
    used_user_agent         TEXT,
    generated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at              TIMESTAMPTZ,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID
);

COMMENT ON TABLE mfa_recovery_code IS 'One-time MFA recovery codes. / Ma khoi phuc MFA mot lan.';
COMMENT ON COLUMN mfa_recovery_code.code_hash IS 'Argon2id / bcrypt hash of the code; original code shown to user once at generation.';
COMMENT ON COLUMN mfa_recovery_code.batch_id IS 'Groups codes generated together; regenerating invalidates the old batch.';

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_code_user_unused ON mfa_recovery_code(user_id) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_code_batch ON mfa_recovery_code(batch_id);

-- ---------------------------------------------------------------------------
-- mfa_policy  (per-role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mfa_policy (
    role_id                 UUID            PRIMARY KEY REFERENCES roles(role_id) ON DELETE CASCADE,
    required                BOOLEAN         NOT NULL DEFAULT TRUE,
    min_factors             SMALLINT        NOT NULL DEFAULT 1
                            CHECK (min_factors BETWEEN 1 AND 4),
    allowed_factor_types    TEXT[]          NOT NULL DEFAULT ARRAY['totp','webauthn','backup_code']::TEXT[],
    required_aal_level      SMALLINT        NOT NULL DEFAULT 2
                            CHECK (required_aal_level BETWEEN 1 AND 3),
    grace_period_days       SMALLINT        NOT NULL DEFAULT 7,
    reauth_after_minutes    INTEGER         NOT NULL DEFAULT 480,
    backup_codes_count      SMALLINT        NOT NULL DEFAULT 10,
    rate_limit_window_s     INTEGER         NOT NULL DEFAULT 60,
    rate_limit_max_attempts SMALLINT        NOT NULL DEFAULT 5,
    lockout_minutes         INTEGER         NOT NULL DEFAULT 15,
    apply_to_admin_only     BOOLEAN         NOT NULL DEFAULT FALSE,
    notes                   TEXT,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    row_version             INTEGER         NOT NULL DEFAULT 1,
    last_modified_by        UUID            REFERENCES users(user_id),
    last_modified_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID
);

COMMENT ON TABLE mfa_policy IS 'Per-role MFA policy (NIST 800-63B AAL + FIDO2). / Chinh sach MFA theo vai tro.';
COMMENT ON COLUMN mfa_policy.reauth_after_minutes IS 'Force re-MFA after N minutes of session inactivity (480 default = 8h).';

-- ---------------------------------------------------------------------------
-- mfa_challenge  (audit row per challenge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mfa_challenge (
    challenge_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    factor_id               UUID            REFERENCES mfa_factor(factor_id),
    challenge_type          VARCHAR(20)     NOT NULL
                            CHECK (challenge_type IN ('login','step_up','reauth','enroll_verify','recovery_code')),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','verified','failed','expired','cancelled')),
    nonce                   BYTEA,
    rp_id                   VARCHAR(255),
    ip_address              INET,
    user_agent              TEXT,
    geo_country             VARCHAR(2),
    risk_score              SMALLINT,
    attempts                SMALLINT        NOT NULL DEFAULT 0,
    failure_reason          TEXT,
    aal_achieved            SMALLINT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    expires_at              TIMESTAMPTZ     NOT NULL,
    verified_at             TIMESTAMPTZ,
    failed_at               TIMESTAMPTZ,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    row_version             INTEGER         NOT NULL DEFAULT 1
);

COMMENT ON TABLE mfa_challenge IS 'MFA challenge audit (every login / step-up / re-auth / recovery-code use).';
COMMENT ON COLUMN mfa_challenge.aal_achieved IS 'NIST 800-63B AAL achieved by this challenge (1/2/3).';
COMMENT ON COLUMN mfa_challenge.risk_score IS 'Optional risk-engine score 0-100; high score may force step-up to AAL3.';

CREATE INDEX IF NOT EXISTS idx_mfa_challenge_user_recent ON mfa_challenge(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_challenge_failed ON mfa_challenge(user_id, failed_at) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_mfa_challenge_pending ON mfa_challenge(user_id, expires_at) WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mfa_factor_set_updated_at') THEN
        CREATE TRIGGER trg_mfa_factor_set_updated_at
            BEFORE UPDATE ON mfa_factor
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mfa_policy_set_updated_at') THEN
        CREATE TRIGGER trg_mfa_policy_set_updated_at
            BEFORE UPDATE ON mfa_policy
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

-- ---------------------------------------------------------------------------
-- Compliance view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_mfa_user_compliance AS
    SELECT
        u.user_id,
        u.username,
        u.full_name,
        u.dept_code,
        u.primary_role_id,
        r.role_code                                                AS primary_role_code,
        r.is_admin_tier,
        COALESCE(p.required, TRUE)                                 AS policy_required,
        COALESCE(p.min_factors, 1)                                 AS policy_min_factors,
        COALESCE(p.required_aal_level, 2)                          AS policy_aal,
        COALESCE(p.grace_period_days, 7)                           AS grace_days,
        COUNT(f.factor_id) FILTER (WHERE f.status = 'active')      AS active_factor_count,
        COALESCE(MAX(f.aal_level) FILTER (WHERE f.status = 'active'), 1) AS max_aal_achieved,
        CASE
            WHEN COALESCE(p.required, TRUE) = FALSE THEN 'not_required'
            WHEN COUNT(f.factor_id) FILTER (WHERE f.status = 'active') >= COALESCE(p.min_factors, 1)
                 AND COALESCE(MAX(f.aal_level) FILTER (WHERE f.status = 'active'), 1) >= COALESCE(p.required_aal_level, 2)
                THEN 'compliant'
            WHEN u.created_at > now() - (COALESCE(p.grace_period_days, 7) || ' days')::interval
                THEN 'in_grace'
            ELSE 'non_compliant'
        END                                                        AS compliance_state
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.primary_role_id
    LEFT JOIN mfa_policy p ON p.role_id = u.primary_role_id AND p.deleted_at IS NULL
    LEFT JOIN mfa_factor f ON f.user_id = u.user_id AND f.deleted_at IS NULL
    WHERE u.status = 'active'
    GROUP BY u.user_id, r.role_code, r.is_admin_tier,
             p.required, p.min_factors, p.required_aal_level, p.grace_period_days;

COMMENT ON VIEW v_mfa_user_compliance IS 'Per-user MFA compliance derived from mfa_policy + mfa_factor (compliant/in_grace/non_compliant/not_required).';

-- ---------------------------------------------------------------------------
-- Seed default policies for known roles.
--   * Admin tier → 2 factors, AAL 3, 3-day grace
--   * Regular  → 1 factor,  AAL 2, 14-day grace
-- ---------------------------------------------------------------------------
INSERT INTO mfa_policy (role_id, required, min_factors, allowed_factor_types, required_aal_level, grace_period_days, reauth_after_minutes, backup_codes_count, notes)
SELECT
    r.role_id,
    TRUE,
    CASE WHEN r.is_admin_tier THEN 2 ELSE 1 END,
    CASE WHEN r.is_admin_tier
         THEN ARRAY['webauthn','hardware_key','totp','backup_code']
         ELSE ARRAY['totp','webauthn','backup_code']
    END,
    CASE WHEN r.is_admin_tier THEN 3 ELSE 2 END,
    CASE WHEN r.is_admin_tier THEN 3 ELSE 14 END,
    CASE WHEN r.is_admin_tier THEN 240 ELSE 480 END,
    10,
    CASE WHEN r.is_admin_tier
         THEN 'Auto-seeded admin-tier policy: hardware/WebAuthn preferred, AAL3 enforced.'
         ELSE 'Auto-seeded default policy: TOTP minimum, AAL2 enforced.'
    END
FROM roles r
WHERE r.deleted_at IS NULL
ON CONFLICT (role_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill: every user who already has users.mfa_secret + mfa_enabled gets a
-- legacy TOTP factor row so the new flow continues to recognise their existing
-- enrollment without asking them to re-enroll. Importer (Phase 1B) wires the
-- decryption KMS key once available; for now we mark status=pending_verify
-- so the user is asked to verify on next login (re-confirms their TOTP).
-- ---------------------------------------------------------------------------
INSERT INTO mfa_factor (user_id, factor_type, factor_label, aal_level, status, secret_encrypted, secret_kid, enrolled_at, metadata)
SELECT
    u.user_id,
    'totp',
    'Legacy TOTP (auto-imported)',
    2,
    'pending_verify',
    convert_to(u.mfa_secret, 'UTF8'),
    'legacy_plaintext',
    u.created_at,
    jsonb_build_object('migration_source', '165_legacy_users_mfa_secret', 'requires_kms_rewrap', TRUE)
FROM users u
WHERE u.mfa_enabled = TRUE
  AND u.mfa_secret IS NOT NULL
  AND char_length(u.mfa_secret) > 0
  AND NOT EXISTS (
      SELECT 1 FROM mfa_factor f WHERE f.user_id = u.user_id AND f.factor_type = 'totp'
  );

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP VIEW IF EXISTS v_mfa_user_compliance;
--   DROP TABLE IF EXISTS mfa_challenge;
--   DROP TABLE IF EXISTS mfa_recovery_code;
--   DROP TABLE IF EXISTS mfa_factor;
--   DROP TABLE IF EXISTS mfa_policy;
--   COMMIT;
