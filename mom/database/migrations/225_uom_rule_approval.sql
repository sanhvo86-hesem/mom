-- Migration 225: UoM Rule Approval (e-sign) + AI Advisory Log
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_rule_approval (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id                 UUID NOT NULL REFERENCES uom_conversion_rule(id) ON DELETE RESTRICT,
    rule_version            INTEGER NOT NULL,
    approval_type           VARCHAR(32) NOT NULL
                            CHECK (approval_type IN ('TECHNICAL_REVIEW','APPROVAL','ESIGN_APPROVAL')),
    -- Signer fields
    signer_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    signed_at               TIMESTAMPTZ NOT NULL,
    -- E-sign content
    signature_meaning       TEXT NOT NULL,
    signature_meaning_vi    TEXT NOT NULL,
    manifest_content        TEXT NOT NULL,
    manifest_hash           VARCHAR(256) NOT NULL,
    hash_algorithm          VARCHAR(32) NOT NULL DEFAULT 'SHA-256',
    -- Linked record
    linked_record_type      VARCHAR(64) NOT NULL DEFAULT 'uom_conversion_rule',
    linked_record_id        UUID NOT NULL,
    -- Closed system controls
    ip_address_hash         VARCHAR(256),
    session_id              VARCHAR(256),
    auth_method             VARCHAR(64) NOT NULL DEFAULT 'PASSWORD'
                            CHECK (auth_method IN ('PASSWORD','MFA','SSO')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NOTE: No DELETE or UPDATE on this table — rows are immutable e-sign records
);

CREATE INDEX IF NOT EXISTS idx_ura_rule ON uom_rule_approval(rule_id, rule_version);
CREATE INDEX IF NOT EXISTS idx_ura_signer ON uom_rule_approval(signer_id);

-- AI Advisory Log (tracks all AI suggestions for audit and governance)
CREATE TABLE IF NOT EXISTS uom_ai_advisory_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisory_type        VARCHAR(64) NOT NULL
                         CHECK (advisory_type IN ('ALIAS_SUGGESTION','ANOMALY_DETECTION','QUALITY_FLAG','CONVERSION_REVIEW')),
    model_id             VARCHAR(128) NOT NULL,
    model_version        VARCHAR(64),
    input_payload        JSONB NOT NULL,
    output_suggestion    JSONB NOT NULL,
    confidence           NUMERIC(4,3),
    trace_id             VARCHAR(256),
    human_reviewed       BOOLEAN NOT NULL DEFAULT false,
    human_reviewer_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    human_decision       VARCHAR(32) CHECK (human_decision IN ('ACCEPTED','REJECTED','MODIFIED','PENDING')),
    human_reviewed_at    TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uom_ai_type ON uom_ai_advisory_log(advisory_type);
CREATE INDEX IF NOT EXISTS idx_uom_ai_reviewed ON uom_ai_advisory_log(human_reviewed);
