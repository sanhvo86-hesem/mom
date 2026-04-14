-- Server-authoritative e-signature re-authentication challenges.

BEGIN;

CREATE TABLE IF NOT EXISTS e_signature_auth_challenges (
    auth_challenge_id TEXT PRIMARY KEY,
    signer_user_id UUID REFERENCES users(user_id),
    signer_ref TEXT,
    session_id TEXT,
    org_id TEXT,
    signature_action TEXT NOT NULL DEFAULT 'evidence_finalize',
    signed_payload_hash_sha256 CHAR(64) NOT NULL,
    displayed_record_hash_sha256 CHAR(64) NOT NULL,
    challenge_state TEXT NOT NULL DEFAULT 'issued'
        CHECK (challenge_state IN ('issued', 'consumed', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    consumed_by_user_id UUID REFERENCES users(user_id),
    consumed_by_ref TEXT,
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version BIGINT NOT NULL DEFAULT 1,
    CHECK (signer_user_id IS NOT NULL OR NULLIF(trim(signer_ref), '') IS NOT NULL),
    CHECK (challenge_state <> 'consumed' OR consumed_at IS NOT NULL),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_e_signature_auth_challenges_signer
    ON e_signature_auth_challenges (signer_ref, challenge_state, expires_at);

CREATE INDEX IF NOT EXISTS idx_e_signature_auth_challenges_payload
    ON e_signature_auth_challenges (signed_payload_hash_sha256, displayed_record_hash_sha256, challenge_state);

COMMIT;
