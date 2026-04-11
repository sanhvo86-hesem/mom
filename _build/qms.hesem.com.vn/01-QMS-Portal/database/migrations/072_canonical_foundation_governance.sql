-- ============================================================================
-- Migration 072: Canonical Foundation and Cross-Cutting Governance Backbone
-- Description: Enterprise structure, party master, calendars, controlled codes, approvals,
--              e-signatures, and attachments.
-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql
-- Dependencies: 001_extensions_and_types.sql (baseline only)
-- Rollback: DROP TABLE attachment, approval, electronic_signature, status_code, reason_code,
--           shift, calendar, uom, party_contact, party_site, party_role, party, org_work_unit,
--           org_work_center, org_warehouse, org_plant, org_site, org_company, org_enterprise
--           CASCADE;
-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS org_enterprise (
    enterprise_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_code          VARCHAR(40) NOT NULL UNIQUE,
    enterprise_name          VARCHAR(255) NOT NULL,
    home_currency_code       VARCHAR(10) NOT NULL DEFAULT 'VND',
    base_timezone            VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_company (
    company_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id            UUID NOT NULL REFERENCES org_enterprise(enterprise_id),
    company_code             VARCHAR(40) NOT NULL UNIQUE,
    legal_name               VARCHAR(255) NOT NULL,
    registration_country_code VARCHAR(10) NOT NULL DEFAULT 'VN',
    functional_currency_code VARCHAR(10) NOT NULL DEFAULT 'VND',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_site (
    site_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               UUID NOT NULL REFERENCES org_company(company_id),
    site_code                VARCHAR(40) NOT NULL UNIQUE,
    site_name                VARCHAR(255) NOT NULL,
    site_type                VARCHAR(50) NOT NULL DEFAULT 'manufacturing',
    timezone                 VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_plant (
    plant_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id                  UUID NOT NULL REFERENCES org_site(site_id),
    plant_code               VARCHAR(40) NOT NULL UNIQUE,
    plant_name               VARCHAR(255) NOT NULL,
    plant_type               VARCHAR(50) NOT NULL DEFAULT 'machining',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_warehouse (
    warehouse_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id                 UUID NOT NULL REFERENCES org_plant(plant_id),
    warehouse_code           VARCHAR(40) NOT NULL UNIQUE,
    warehouse_name           VARCHAR(255) NOT NULL,
    warehouse_type           VARCHAR(50) NOT NULL DEFAULT 'stock',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_work_center (
    work_center_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id                 UUID NOT NULL REFERENCES org_plant(plant_id),
    work_center_code         VARCHAR(40) NOT NULL UNIQUE,
    work_center_name         VARCHAR(255) NOT NULL,
    capacity_uom_code        VARCHAR(20) NOT NULL DEFAULT 'MIN',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_work_unit (
    work_unit_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id           UUID NOT NULL REFERENCES org_work_center(work_center_id),
    work_unit_code           VARCHAR(60) NOT NULL UNIQUE,
    work_unit_name           VARCHAR(255) NOT NULL,
    equipment_class          VARCHAR(80),
    serial_number            VARCHAR(120),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party (
    party_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_code               VARCHAR(60) NOT NULL UNIQUE,
    party_type               VARCHAR(40) NOT NULL,
    display_name             VARCHAR(255) NOT NULL,
    tax_registration_no      VARCHAR(80),
    country_code             VARCHAR(10),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_role (
    party_role_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    role_code                VARCHAR(60) NOT NULL,
    scope_entity_name        VARCHAR(60),
    scope_entity_id          UUID,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (party_id, role_code, scope_entity_name, scope_entity_id)
);

CREATE TABLE IF NOT EXISTS party_site (
    party_site_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    site_role_code           VARCHAR(40) NOT NULL,
    site_name                VARCHAR(255) NOT NULL,
    address_line_1           VARCHAR(255),
    address_line_2           VARCHAR(255),
    city_name                VARCHAR(120),
    state_name               VARCHAR(120),
    postal_code              VARCHAR(40),
    country_code             VARCHAR(10),
    is_default               BOOLEAN NOT NULL DEFAULT false,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_contact (
    party_contact_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id                 UUID NOT NULL REFERENCES party(party_id),
    party_site_id            UUID REFERENCES party_site(party_site_id),
    contact_name             VARCHAR(255) NOT NULL,
    contact_role_code        VARCHAR(40),
    email_address            VARCHAR(255),
    phone_number             VARCHAR(80),
    is_primary               BOOLEAN NOT NULL DEFAULT false,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uom (
    uom_code                 VARCHAR(20) PRIMARY KEY,
    uom_name                 VARCHAR(120) NOT NULL,
    uom_category             VARCHAR(40) NOT NULL,
    base_uom_code            VARCHAR(20),
    conversion_factor        NUMERIC(18,8) NOT NULL DEFAULT 1,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS calendar (
    calendar_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_code            VARCHAR(40) NOT NULL UNIQUE,
    calendar_name            VARCHAR(255) NOT NULL,
    timezone                 VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift (
    shift_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id              UUID NOT NULL REFERENCES calendar(calendar_id),
    shift_code               VARCHAR(20) NOT NULL,
    shift_name               VARCHAR(120) NOT NULL,
    start_time               TIME NOT NULL,
    end_time                 TIME NOT NULL,
    crosses_midnight         BOOLEAN NOT NULL DEFAULT false,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (calendar_id, shift_code)
);

CREATE TABLE IF NOT EXISTS reason_code (
    reason_code_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason_domain            VARCHAR(40) NOT NULL,
    reason_code              VARCHAR(40) NOT NULL,
    reason_name              VARCHAR(255) NOT NULL,
    severity_code            VARCHAR(30),
    is_active                BOOLEAN NOT NULL DEFAULT true,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reason_domain, reason_code)
);

CREATE TABLE IF NOT EXISTS status_code (
    status_code_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_domain            VARCHAR(40) NOT NULL,
    status_code              VARCHAR(40) NOT NULL,
    status_name              VARCHAR(255) NOT NULL,
    sequence_no              INTEGER NOT NULL DEFAULT 10,
    is_terminal              BOOLEAN NOT NULL DEFAULT false,
    is_active                BOOLEAN NOT NULL DEFAULT true,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (status_domain, status_code)
);

CREATE TABLE IF NOT EXISTS electronic_signature (
    electronic_signature_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signed_by_party_id       UUID REFERENCES party(party_id),
    signature_meaning        VARCHAR(120) NOT NULL,
    signature_status         VARCHAR(30) NOT NULL DEFAULT 'applied',
    hash_value               TEXT NOT NULL,
    provider_name            VARCHAR(120),
    signed_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS approval (
    approval_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name              VARCHAR(80) NOT NULL,
    entity_id                UUID NOT NULL,
    approval_step_code       VARCHAR(60) NOT NULL,
    approver_party_id        UUID REFERENCES party(party_id),
    decision_code            VARCHAR(30),
    comment_text             TEXT,
    electronic_signature_id  UUID REFERENCES electronic_signature(electronic_signature_id),
    decided_at               TIMESTAMPTZ,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS attachment (
    attachment_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name              VARCHAR(80) NOT NULL,
    entity_id                UUID NOT NULL,
    attachment_type          VARCHAR(40) NOT NULL DEFAULT 'file',
    file_name                VARCHAR(255) NOT NULL,
    storage_uri              TEXT NOT NULL,
    checksum_sha256          TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
