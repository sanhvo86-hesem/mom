-- ============================================================================
-- Migration: 064_master_data_governance.sql
-- Description: MDM, numbering, attributes, and stewardship governance.
-- Dependencies: 006_erp_master_data.sql, 019_system_tables.sql
-- Rollback: DROP TABLE mdm_governance_issues, mdm_duplicate_candidates,
--           mdm_data_stewards, mdm_approval_policies, mdm_number_series,
--           mdm_site_parameters, mdm_reference_code_values,
--           mdm_reference_codes, mdm_attribute_values, mdm_attribute_sets,
--           mdm_uom_conversions, mdm_item_classes CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS mdm_item_classes (
    mdm_item_class_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_code                   VARCHAR(50)     NOT NULL UNIQUE,
    class_name                   VARCHAR(200)    NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_uom_conversions (
    mdm_uom_conversion_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_uom                     VARCHAR(20)     NOT NULL,
    to_uom                       VARCHAR(20)     NOT NULL,
    conversion_factor            NUMERIC(18,8)   NOT NULL,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (from_uom, to_uom)
);

CREATE TABLE IF NOT EXISTS mdm_attribute_sets (
    mdm_attribute_set_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribute_set_code           VARCHAR(50)     NOT NULL UNIQUE,
    attribute_set_name           VARCHAR(200)    NOT NULL,
    applies_to_entity            VARCHAR(30)     NOT NULL
                                 CHECK (applies_to_entity IN ('item', 'customer', 'vendor', 'equipment')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_attribute_values (
    mdm_attribute_value_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    mdm_attribute_set_id         UUID            NOT NULL REFERENCES mdm_attribute_sets(mdm_attribute_set_id) ON DELETE CASCADE,
    entity_reference             VARCHAR(80)     NOT NULL,
    attribute_name               VARCHAR(100)    NOT NULL,
    attribute_value              VARCHAR(300),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_reference_codes (
    mdm_reference_code_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_set                     VARCHAR(50)     NOT NULL UNIQUE,
    description                  VARCHAR(200),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_reference_code_values (
    mdm_reference_code_value_id  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    mdm_reference_code_id        UUID            NOT NULL REFERENCES mdm_reference_codes(mdm_reference_code_id) ON DELETE CASCADE,
    code_value                   VARCHAR(80)     NOT NULL,
    value_label                  VARCHAR(200)    NOT NULL,
    sort_order                   INT             DEFAULT 1,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (mdm_reference_code_id, code_value)
);

CREATE TABLE IF NOT EXISTS mdm_site_parameters (
    mdm_site_parameter_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_code                    VARCHAR(50)     NOT NULL,
    parameter_name               VARCHAR(100)    NOT NULL,
    parameter_value              VARCHAR(300),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (site_code, parameter_name)
);

CREATE TABLE IF NOT EXISTS mdm_number_series (
    mdm_number_series_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_code                  VARCHAR(50)     NOT NULL UNIQUE,
    prefix_value                 VARCHAR(20),
    current_value                BIGINT          NOT NULL DEFAULT 0,
    padding_length               INT             DEFAULT 5,
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_approval_policies (
    mdm_approval_policy_id       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_code                  VARCHAR(50)     NOT NULL UNIQUE,
    entity_type                  VARCHAR(30)     NOT NULL
                                 CHECK (entity_type IN ('item', 'customer', 'vendor', 'routing', 'bom')),
    approver_role                VARCHAR(100),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_data_stewards (
    mdm_data_steward_id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type                  VARCHAR(30)     NOT NULL,
    entity_scope                 VARCHAR(80),
    user_id                      UUID            REFERENCES users(user_id),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_duplicate_candidates (
    mdm_duplicate_candidate_id   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type                  VARCHAR(30)     NOT NULL,
    left_reference               VARCHAR(80)     NOT NULL,
    right_reference              VARCHAR(80)     NOT NULL,
    similarity_score             NUMERIC(6,3),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdm_governance_issues (
    mdm_governance_issue_id      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_number                 VARCHAR(80)     NOT NULL UNIQUE,
    entity_type                  VARCHAR(30)     NOT NULL,
    entity_reference             VARCHAR(80),
    issue_type                   VARCHAR(30)     NOT NULL
                                 CHECK (issue_type IN ('missing_data', 'duplicate', 'policy_violation', 'steward_review')),
    status                       VARCHAR(20)     NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'in_review', 'closed')),
    metadata                     JSONB           DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMIT;
