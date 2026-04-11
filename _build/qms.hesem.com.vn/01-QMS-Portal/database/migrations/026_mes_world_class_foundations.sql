-- ============================================================================
-- Migration 026: MES World-Class Foundations
-- Governance for connectivity adapters, alarm catalog/playbooks,
-- NC release receipts, and tool preset-offset lineage.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS mes_connectivity_adapters (
    adapter_id               VARCHAR(60)     PRIMARY KEY,
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    adapter_name             VARCHAR(255)    NOT NULL,
    adapter_type             VARCHAR(50)     NOT NULL,
    transport_protocol       VARCHAR(50)     NOT NULL,
    endpoint_url             VARCHAR(500),
    heartbeat_sla_seconds    INT             NOT NULL DEFAULT 120,
    stale_after_seconds      INT             NOT NULL DEFAULT 180,
    auth_mode                VARCHAR(50)     DEFAULT 'service_account',
    store_and_forward_enabled BOOLEAN        NOT NULL DEFAULT TRUE,
    payload_schema_version   VARCHAR(30)     DEFAULT '1.0',
    adapter_status           VARCHAR(30)     NOT NULL DEFAULT 'active',
    last_validated_at        TIMESTAMPTZ,
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mca_equipment ON mes_connectivity_adapters (equipment_id);
CREATE INDEX IF NOT EXISTS idx_mca_status ON mes_connectivity_adapters (adapter_status);

CREATE TABLE IF NOT EXISTS mes_connectivity_events (
    adapter_event_id         VARCHAR(80)     PRIMARY KEY,
    adapter_id               VARCHAR(60)     REFERENCES mes_connectivity_adapters(adapter_id),
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    event_time               TIMESTAMPTZ     NOT NULL,
    event_type               VARCHAR(50)     NOT NULL,
    severity                 mes_event_severity NOT NULL DEFAULT 'WARNING',
    event_status             VARCHAR(30)     NOT NULL DEFAULT 'open',
    message                  TEXT            NOT NULL,
    payload_excerpt          JSONB           DEFAULT '{}',
    acknowledged_by          VARCHAR(50),
    acknowledged_at          TIMESTAMPTZ,
    metadata                 JSONB           DEFAULT '{}',
    recorded_by              VARCHAR(50),
    recorded_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mce_adapter_time ON mes_connectivity_events (adapter_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_mce_equipment_time ON mes_connectivity_events (equipment_id, event_time DESC);

CREATE TABLE IF NOT EXISTS mes_alarm_catalog (
    alarm_code               VARCHAR(50)     PRIMARY KEY,
    controller_family        VARCHAR(80)     NOT NULL,
    alarm_group              VARCHAR(80),
    alarm_title              VARCHAR(255)    NOT NULL,
    alarm_title_vi           VARCHAR(255),
    default_severity         mes_event_severity NOT NULL DEFAULT 'ALARM',
    downtime_category_default VARCHAR(80),
    response_owner_role      VARCHAR(80),
    response_target_minutes  INT             DEFAULT 15,
    requires_lockout         BOOLEAN         NOT NULL DEFAULT FALSE,
    requires_maintenance     BOOLEAN         NOT NULL DEFAULT TRUE,
    catalog_status           VARCHAR(30)     NOT NULL DEFAULT 'active',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mac_family_group ON mes_alarm_catalog (controller_family, alarm_group);

CREATE TABLE IF NOT EXISTS mes_alarm_playbooks (
    playbook_id              VARCHAR(60)     PRIMARY KEY,
    alarm_code               VARCHAR(50)     REFERENCES mes_alarm_catalog(alarm_code),
    playbook_title           VARCHAR(255)    NOT NULL,
    playbook_title_vi        VARCHAR(255),
    response_steps           JSONB           NOT NULL DEFAULT '[]',
    escalation_role          VARCHAR(80),
    response_target_minutes  INT             DEFAULT 15,
    playbook_status          VARCHAR(30)     NOT NULL DEFAULT 'active',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_map_alarm ON mes_alarm_playbooks (alarm_code);

CREATE TABLE IF NOT EXISTS mes_nc_release_packages (
    package_id               VARCHAR(80)     PRIMARY KEY,
    program_id               VARCHAR(120)    NOT NULL,
    item_id                  VARCHAR(50),
    revision_code            VARCHAR(30),
    operation_seq            INT,
    machine_family           VARCHAR(50),
    work_center_id           VARCHAR(50),
    controller_program_name  VARCHAR(120),
    checksum_sha256          VARCHAR(128),
    release_manifest_version VARCHAR(30),
    released_by              VARCHAR(50),
    released_at              TIMESTAMPTZ,
    package_status           VARCHAR(30)     NOT NULL DEFAULT 'draft',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mnrp_program ON mes_nc_release_packages (program_id);
CREATE INDEX IF NOT EXISTS idx_mnrp_item_rev ON mes_nc_release_packages (item_id, revision_code);

CREATE TABLE IF NOT EXISTS mes_nc_download_receipts (
    receipt_id               VARCHAR(80)     PRIMARY KEY,
    package_id               VARCHAR(80)     REFERENCES mes_nc_release_packages(package_id),
    program_id               VARCHAR(120)    NOT NULL,
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    work_order_number        VARCHAR(80),
    downloaded_at            TIMESTAMPTZ     NOT NULL,
    controller_program_name  VARCHAR(120),
    controller_checksum      VARCHAR(128),
    expected_checksum        VARCHAR(128),
    verified_match           BOOLEAN         NOT NULL DEFAULT FALSE,
    receipt_status           VARCHAR(30)     NOT NULL DEFAULT 'pending',
    acknowledged_by          VARCHAR(50),
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mndr_equipment_time ON mes_nc_download_receipts (equipment_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_mndr_work_order ON mes_nc_download_receipts (work_order_number, downloaded_at DESC);

CREATE TABLE IF NOT EXISTS mes_tool_preset_offsets (
    preset_id                VARCHAR(80)     PRIMARY KEY,
    tool_id                  VARCHAR(50)     REFERENCES tools(tool_id),
    equipment_id             VARCHAR(50)     REFERENCES equipment(equipment_id),
    work_order_number        VARCHAR(80),
    offset_number            VARCHAR(50),
    preset_length_mm         NUMERIC(12,4),
    preset_diameter_mm       NUMERIC(12,4),
    wear_offset_mm           NUMERIC(12,4),
    offset_drift_mm          NUMERIC(12,4),
    measurement_source       VARCHAR(50)     DEFAULT 'presetter',
    measured_at              TIMESTAMPTZ     NOT NULL,
    measured_by              VARCHAR(50),
    verified_status          VARCHAR(30)     NOT NULL DEFAULT 'verified',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtpo_tool_time ON mes_tool_preset_offsets (tool_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_mtpo_equipment_time ON mes_tool_preset_offsets (equipment_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS mes_tool_assemblies (
    assembly_id              VARCHAR(80)     PRIMARY KEY,
    parent_tool_id           VARCHAR(50)     REFERENCES tools(tool_id),
    component_tool_id        VARCHAR(50)     REFERENCES tools(tool_id),
    component_role           VARCHAR(50)     NOT NULL,
    quantity_required        NUMERIC(12,2)   NOT NULL DEFAULT 1,
    effective_from           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    effective_to             TIMESTAMPTZ,
    assembly_status          VARCHAR(30)     NOT NULL DEFAULT 'active',
    metadata                 JSONB           DEFAULT '{}',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mta_parent ON mes_tool_assemblies (parent_tool_id, assembly_status);

CREATE OR REPLACE VIEW v_mes_adapter_health AS
SELECT a.adapter_id,
       a.equipment_id,
       a.adapter_name,
       a.adapter_type,
       a.adapter_status,
       a.last_validated_at,
       e.current_e10_state AS current_state,
       e.last_heartbeat_at AS last_seen_at
FROM mes_connectivity_adapters a
LEFT JOIN mes_equipment_extended e ON e.equipment_id = a.equipment_id;

CREATE OR REPLACE VIEW v_mes_nc_release_readiness AS
SELECT p.package_id,
       p.program_id,
       p.item_id,
       p.revision_code,
       p.operation_seq,
       p.package_status,
       r.equipment_id,
       r.work_order_number,
       r.downloaded_at,
       r.verified_match,
       r.receipt_status
FROM mes_nc_release_packages p
LEFT JOIN mes_nc_download_receipts r
  ON r.package_id = p.package_id;

COMMIT;
