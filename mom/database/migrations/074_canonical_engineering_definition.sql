-- ============================================================================
-- Migration 074: Canonical Engineering and Manufacturing Definition
-- Description: BOM, alternates, work definitions, operations, resources, outputs, and
--              instruction bindings.
-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql
-- Dependencies: 072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql
-- Rollback: DROP TABLE work_instruction, operation_output, operation_material,
--           operation_resource, operation, work_definition_version, work_definition,
--           bom_substitute, bom_line, bom_version, bom CASCADE;
-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS bom (
    bom_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_code                 VARCHAR(80) NOT NULL UNIQUE,
    parent_item_revision_id  UUID NOT NULL REFERENCES item_revision(item_revision_id),
    bom_type                 VARCHAR(30) NOT NULL DEFAULT 'manufacturing',
    alternate_code           VARCHAR(30),
    status_code              VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bom_version (
    bom_version_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id                   UUID NOT NULL REFERENCES bom(bom_id),
    version_code             VARCHAR(40) NOT NULL,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    UNIQUE (bom_id, version_code)
);

CREATE TABLE IF NOT EXISTS bom_line (
    bom_line_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_version_id           UUID NOT NULL REFERENCES bom_version(bom_version_id),
    component_item_revision_id UUID NOT NULL REFERENCES item_revision(item_revision_id),
    sequence_no              INTEGER NOT NULL,
    qty_per                  NUMERIC(18,6) NOT NULL,
    issue_method             VARCHAR(30) NOT NULL DEFAULT 'backflush',
    scrap_factor_pct         NUMERIC(9,4) NOT NULL DEFAULT 0,
    UNIQUE (bom_version_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS bom_substitute (
    bom_substitute_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_line_id              UUID NOT NULL REFERENCES bom_line(bom_line_id),
    substitute_item_revision_id UUID NOT NULL REFERENCES item_revision(item_revision_id),
    priority_no              INTEGER NOT NULL DEFAULT 1,
    quantity_factor          NUMERIC(18,6) NOT NULL DEFAULT 1.0,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS work_definition (
    work_definition_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_definition_code     VARCHAR(80) NOT NULL UNIQUE,
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    plant_id                 UUID NOT NULL REFERENCES org_plant(plant_id),
    definition_type          VARCHAR(30) NOT NULL DEFAULT 'routing',
    status_code              VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_definition_version (
    work_definition_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_definition_id       UUID NOT NULL REFERENCES work_definition(work_definition_id),
    version_code             VARCHAR(40) NOT NULL,
    effective_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    approval_state           VARCHAR(30) NOT NULL DEFAULT 'draft',
    UNIQUE (work_definition_id, version_code)
);

CREATE TABLE IF NOT EXISTS operation (
    operation_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_definition_version_id UUID NOT NULL REFERENCES work_definition_version(work_definition_version_id),
    operation_code           VARCHAR(60) NOT NULL,
    operation_name           VARCHAR(255) NOT NULL,
    sequence_no              INTEGER NOT NULL,
    standard_setup_minutes   NUMERIC(18,4) NOT NULL DEFAULT 0,
    standard_run_minutes     NUMERIC(18,4) NOT NULL DEFAULT 0,
    status_code              VARCHAR(30) NOT NULL DEFAULT 'active',
    UNIQUE (work_definition_version_id, operation_code)
);

CREATE TABLE IF NOT EXISTS operation_resource (
    operation_resource_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    resource_type            VARCHAR(30) NOT NULL,
    work_center_id           UUID REFERENCES org_work_center(work_center_id),
    work_unit_id             UUID REFERENCES org_work_unit(work_unit_id),
    setup_minutes            NUMERIC(18,4) NOT NULL DEFAULT 0,
    run_minutes_per_unit     NUMERIC(18,6) NOT NULL DEFAULT 0,
    crew_size                NUMERIC(9,2) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS operation_material (
    operation_material_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    issue_method             VARCHAR(30) NOT NULL DEFAULT 'backflush',
    quantity_per             NUMERIC(18,6) NOT NULL,
    scrap_factor_pct         NUMERIC(9,4) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operation_output (
    operation_output_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    item_revision_id         UUID NOT NULL REFERENCES item_revision(item_revision_id),
    output_type              VARCHAR(30) NOT NULL DEFAULT 'primary',
    yield_factor_pct         NUMERIC(9,4) NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS work_instruction (
    work_instruction_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id             UUID NOT NULL REFERENCES operation(operation_id),
    instruction_code         VARCHAR(80) NOT NULL,
    instruction_title        VARCHAR(255) NOT NULL,
    document_revision_id     UUID,
    sequence_no              INTEGER NOT NULL DEFAULT 10,
    is_mandatory             BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (operation_id, instruction_code)
);

COMMIT;
