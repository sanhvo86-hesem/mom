-- ============================================================================
-- Migration: 068_trade_compliance_advanced.sql
-- Description: Advanced trade compliance controls inspired by SAP GTS patterns.
-- Dependencies: 016_shipping_compliance.sql, 051_finance_trade_multicurrency.sql
-- Rollback: DROP TABLE trade_compliance_audits, trade_license_usage_logs,
--           trade_import_bonds, trade_duty_drawbacks,
--           trade_certificate_of_origin, trade_preference_programs,
--           trade_broker_profiles, trade_end_use_certificates,
--           trade_screening_hits, trade_restricted_party_lists,
--           trade_license_exceptions, trade_eccn_master CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS trade_eccn_master (
    trade_eccn_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    eccn_code                    VARCHAR(20)     NOT NULL UNIQUE,
    description                  VARCHAR(300)    NOT NULL,
    control_reason               VARCHAR(100),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_license_exceptions (
    trade_license_exception_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_code               VARCHAR(20)     NOT NULL UNIQUE,
    description                  VARCHAR(300),
    applicable_country           CHAR(2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_restricted_party_lists (
    trade_restricted_party_list_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_name                    VARCHAR(300)    NOT NULL,
    source_list                   VARCHAR(100),
    country_code                  CHAR(2),
    metadata                      JSONB           DEFAULT '{}'::jsonb,
    created_at                    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_screening_hits (
    trade_screening_hit_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_reference           VARCHAR(80),
    party_name                   VARCHAR(300),
    matched_list_id              UUID            REFERENCES trade_restricted_party_lists(trade_restricted_party_list_id),
    hit_status                   VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (hit_status IN ('open', 'cleared', 'blocked')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_end_use_certificates (
    trade_end_use_certificate_id UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_number           VARCHAR(80)     NOT NULL UNIQUE,
    customer_id                  VARCHAR(50)     REFERENCES customers(customer_id),
    destination_country          CHAR(2),
    expiry_date                  DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_broker_profiles (
    trade_broker_profile_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_code                  VARCHAR(50)     NOT NULL UNIQUE,
    broker_name                  VARCHAR(200)    NOT NULL,
    country_code                 CHAR(2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_preference_programs (
    trade_preference_program_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_code                 VARCHAR(50)     NOT NULL UNIQUE,
    program_name                 VARCHAR(200),
    country_code                 CHAR(2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_certificate_of_origin (
    trade_certificate_of_origin_id UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_number           VARCHAR(80)     NOT NULL UNIQUE,
    country_of_origin            CHAR(2),
    shipment_reference           VARCHAR(80),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_duty_drawbacks (
    trade_duty_drawback_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    drawback_number              VARCHAR(80)     NOT NULL UNIQUE,
    customs_declaration_number   VARCHAR(80),
    claim_amount                 NUMERIC(14,2),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_import_bonds (
    trade_import_bond_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    bond_number                  VARCHAR(80)     NOT NULL UNIQUE,
    broker_id                    UUID            REFERENCES trade_broker_profiles(trade_broker_profile_id),
    bond_amount                  NUMERIC(14,2),
    expiry_date                  DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_license_usage_logs (
    trade_license_usage_log_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    export_license_id            UUID            REFERENCES export_licenses(license_id),
    shipment_reference           VARCHAR(80),
    used_value                   NUMERIC(14,2),
    usage_date                   DATE,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_compliance_audits (
    trade_compliance_audit_id    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_number                 VARCHAR(80)     NOT NULL UNIQUE,
    audit_date                   DATE,
    auditor_name                 VARCHAR(200),
    audit_scope                  VARCHAR(300),
    audit_status                 VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (audit_status IN ('open', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
