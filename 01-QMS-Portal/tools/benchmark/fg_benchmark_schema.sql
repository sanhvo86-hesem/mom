-- Foundation Governance Contract Slice - Benchmark Schema
-- Creates the canonical governance tables required by
-- foundation_governance_contract_read_mix.sql
-- Source: 072_canonical_foundation_governance.sql + 079 hardening

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS org_enterprise (
    enterprise_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_code     VARCHAR(40) NOT NULL UNIQUE,
    enterprise_name     VARCHAR(255) NOT NULL,
    home_currency_code  VARCHAR(10) NOT NULL DEFAULT 'VND',
    base_timezone       VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS org_company (
    company_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id       UUID NOT NULL REFERENCES org_enterprise(enterprise_id),
    company_code        VARCHAR(40) NOT NULL UNIQUE,
    legal_name          VARCHAR(255) NOT NULL,
    registration_country_code VARCHAR(10) NOT NULL DEFAULT 'VN',
    functional_currency_code VARCHAR(10) NOT NULL DEFAULT 'VND',
    status_code         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS party (
    party_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_code          VARCHAR(60) NOT NULL UNIQUE,
    party_type          VARCHAR(40) NOT NULL,
    display_name        VARCHAR(255) NOT NULL,
    tax_registration_no VARCHAR(80),
    country_code        VARCHAR(10),
    status_code         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS party_contact (
    party_contact_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id            UUID NOT NULL REFERENCES party(party_id),
    contact_name        VARCHAR(255) NOT NULL,
    email_address       VARCHAR(255),
    phone_number        VARCHAR(80),
    is_primary          BOOLEAN NOT NULL DEFAULT false,
    status_code         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS party_role (
    party_role_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id            UUID NOT NULL REFERENCES party(party_id),
    role_code           VARCHAR(60) NOT NULL,
    scope_entity_name   VARCHAR(60),
    scope_entity_id     UUID,
    effective_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to        TIMESTAMPTZ,
    status_code         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS calendar (
    calendar_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_code       VARCHAR(40) NOT NULL UNIQUE,
    calendar_name       VARCHAR(255) NOT NULL,
    timezone            VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS shift (
    shift_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id         UUID NOT NULL REFERENCES calendar(calendar_id),
    shift_code          VARCHAR(20) NOT NULL,
    shift_name          VARCHAR(120) NOT NULL,
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL,
    crosses_midnight    BOOLEAN NOT NULL DEFAULT false,
    status_code         VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1,
    UNIQUE (calendar_id, shift_code)
);

CREATE TABLE IF NOT EXISTS electronic_signature (
    electronic_signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signed_by_party_id  UUID REFERENCES party(party_id),
    signature_meaning   VARCHAR(120) NOT NULL,
    signature_status    VARCHAR(30) NOT NULL DEFAULT 'applied',
    hash_value          TEXT NOT NULL,
    provider_name       VARCHAR(120),
    signed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS approval (
    approval_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_group_id   UUID NOT NULL DEFAULT gen_random_uuid(),
    entity_name         VARCHAR(80) NOT NULL,
    entity_id           UUID NOT NULL,
    approval_step_code  VARCHAR(60) NOT NULL,
    approver_party_id   UUID REFERENCES party(party_id),
    decision_code       VARCHAR(30),
    comment_text        TEXT,
    decision_reason_code VARCHAR(40),
    electronic_signature_id UUID REFERENCES electronic_signature(electronic_signature_id),
    decided_at          TIMESTAMPTZ,
    status_code         VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_approval_group_status_step
    ON approval (approval_group_id, status_code, approval_step_code);
CREATE INDEX IF NOT EXISTS idx_approval_entity_status
    ON approval (entity_name, entity_id, status_code);

CREATE TABLE IF NOT EXISTS attachment (
    attachment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name         VARCHAR(80) NOT NULL,
    entity_id           UUID NOT NULL,
    attachment_type     VARCHAR(40) NOT NULL DEFAULT 'file',
    file_name           VARCHAR(255) NOT NULL,
    storage_uri         TEXT NOT NULL,
    checksum_sha256     TEXT,
    content_type        VARCHAR(255),
    file_size_bytes     BIGINT,
    uploaded_by_party_id UUID REFERENCES party(party_id),
    evidence_chain_hash TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_version         BIGINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_attachment_entity_created_at
    ON attachment (entity_name, entity_id, created_at DESC);
