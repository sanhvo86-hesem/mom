import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const portalRoot = path.resolve(__dirname, '..', '..');
const registryPath = path.join(portalRoot, 'qms-data', 'registry', 'table-registry.json');
const outputPath = path.join(portalRoot, 'database', 'migrations', '070_enterprise_governance_uplift.sql');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const tables = registry.tables || {};
const governanceFoundationTables = new Set([
  'org_companies',
  'org_legal_entities',
  'org_plants',
  'source_system_registry',
  'retention_policies',
  'data_archival_runs',
  'integration_monitors',
]);

const excludedDomains = new Set(['bi_datawarehouse']);
const targetTables = Object.entries(tables)
  .filter(([tableName, table]) => !table.supportTable && !excludedDomains.has(table.domain) && !governanceFoundationTables.has(tableName))
  .map(([tableName]) => tableName)
  .sort();

const governanceColumns = [
  {
    name: 'org_company_code',
    definition: 'VARCHAR(30) REFERENCES org_companies(company_code)',
  },
  {
    name: 'org_legal_entity_code',
    definition: 'VARCHAR(30) REFERENCES org_legal_entities(legal_entity_code)',
  },
  {
    name: 'org_plant_id',
    definition: 'VARCHAR(30) REFERENCES org_plants(plant_id)',
  },
  {
    name: 'org_site_id',
    definition: 'VARCHAR(30) REFERENCES mes_sites(site_id)',
  },
  {
    name: 'source_system',
    definition: "VARCHAR(40) NOT NULL DEFAULT 'QMS'",
  },
  {
    name: 'source_record_id',
    definition: 'VARCHAR(120)',
  },
  {
    name: 'row_version',
    definition: 'BIGINT NOT NULL DEFAULT 1',
  },
  {
    name: 'payload_schema_version',
    definition: "VARCHAR(30) NOT NULL DEFAULT '1.0'",
  },
];

const perTableColumnSkips = new Map([
  ['mes_sites', new Set(['org_site_id'])],
]);

function stableIdentifier(prefix, tableName, suffix) {
  const candidate = `${prefix}_${tableName}_${suffix}`.replace(/[^a-zA-Z0-9_]+/g, '_');
  if (candidate.length <= 63) return candidate;
  const hash = crypto.createHash('md5').update(candidate).digest('hex').slice(0, 8);
  const budget = 63 - prefix.length - suffix.length - hash.length - 3;
  const base = tableName.replace(/[^a-zA-Z0-9_]+/g, '_').slice(0, Math.max(10, budget));
  return `${prefix}_${base}_${suffix}_${hash}`.slice(0, 63);
}

function quotedTableName(tableName) {
  return tableName;
}

function columnsForTable(tableName) {
  const skips = perTableColumnSkips.get(tableName) || new Set();
  return governanceColumns.filter((column) => !skips.has(column.name));
}

function renderAlterTable(tableName) {
  const clauses = columnsForTable(tableName).map(
    (column) => `    ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition}`,
  );
  return [
    `ALTER TABLE ${quotedTableName(tableName)}`,
    clauses.join(',\n'),
    ';',
  ].join('\n');
}

function renderIndexStatements(tableName) {
  const orgColumns = columnsForTable(tableName)
    .map((column) => column.name)
    .filter((columnName) => columnName.startsWith('org_'));

  const statements = [
    `CREATE INDEX IF NOT EXISTS ${stableIdentifier('idx', tableName, 'lineage')} ON ${quotedTableName(tableName)} (source_system, source_record_id) WHERE source_record_id IS NOT NULL;`,
  ];

  if (orgColumns.length) {
    statements.push(
      `CREATE INDEX IF NOT EXISTS ${stableIdentifier('idx', tableName, 'org_scope')} ON ${quotedTableName(tableName)} (${orgColumns.join(', ')});`,
    );
  }

  return statements;
}

function renderTriggerStatements(tableName) {
  const triggerName = stableIdentifier('trg', tableName, 'row_version');
  return [
    `DROP TRIGGER IF EXISTS ${triggerName} ON ${quotedTableName(tableName)};`,
    `CREATE TRIGGER ${triggerName} BEFORE UPDATE ON ${quotedTableName(tableName)} FOR EACH ROW EXECUTE FUNCTION set_row_version();`,
  ];
}

const sections = [];

sections.push('-- ============================================================================');
sections.push('-- Migration 070: Enterprise Governance Uplift');
sections.push('-- Generated from table-registry to add organization scope, lineage, and');
sections.push('-- optimistic locking, retention, and integration governance foundations');
sections.push('-- across operational ERP + MES + eQMS tables.');
sections.push('-- ============================================================================');
sections.push('');
sections.push('BEGIN;');
sections.push('');
sections.push('CREATE TABLE IF NOT EXISTS org_companies (');
sections.push('    company_code            VARCHAR(30) PRIMARY KEY,');
sections.push('    company_name            VARCHAR(255) NOT NULL,');
sections.push('    company_name_vi         VARCHAR(255),');
sections.push("    company_status          VARCHAR(30) NOT NULL DEFAULT 'active',");
sections.push("    default_currency_code   VARCHAR(10) DEFAULT 'VND',");
sections.push("    metadata                JSONB DEFAULT '{}'::jsonb,");
sections.push('    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),');
sections.push('    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()');
sections.push(');');
sections.push('CREATE TABLE IF NOT EXISTS org_legal_entities (');
sections.push('    legal_entity_code       VARCHAR(30) PRIMARY KEY,');
sections.push('    company_code            VARCHAR(30) NOT NULL REFERENCES org_companies(company_code),');
sections.push('    legal_entity_name       VARCHAR(255) NOT NULL,');
sections.push('    legal_entity_name_vi    VARCHAR(255),');
sections.push("    country_code            VARCHAR(10) DEFAULT 'VN',");
sections.push("    functional_currency_code VARCHAR(10) DEFAULT 'VND',");
sections.push("    legal_entity_status     VARCHAR(30) NOT NULL DEFAULT 'active',");
sections.push("    metadata                JSONB DEFAULT '{}'::jsonb,");
sections.push('    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),');
sections.push('    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()');
sections.push(');');
sections.push('CREATE TABLE IF NOT EXISTS org_plants (');
sections.push('    plant_id                VARCHAR(30) PRIMARY KEY,');
sections.push('    legal_entity_code       VARCHAR(30) NOT NULL REFERENCES org_legal_entities(legal_entity_code),');
sections.push('    site_id                 VARCHAR(30) REFERENCES mes_sites(site_id),');
sections.push('    plant_name              VARCHAR(255) NOT NULL,');
sections.push('    plant_name_vi           VARCHAR(255),');
sections.push("    timezone                VARCHAR(100) DEFAULT 'Asia/Ho_Chi_Minh',");
sections.push("    plant_status            VARCHAR(30) NOT NULL DEFAULT 'active',");
sections.push("    metadata                JSONB DEFAULT '{}'::jsonb,");
sections.push('    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),');
sections.push('    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()');
sections.push(');');
sections.push('CREATE INDEX IF NOT EXISTS idx_org_legal_entities_company ON org_legal_entities (company_code);');
sections.push('CREATE INDEX IF NOT EXISTS idx_org_plants_legal_entity ON org_plants (legal_entity_code);');
sections.push('CREATE INDEX IF NOT EXISTS idx_org_plants_site ON org_plants (site_id);');
sections.push('');
sections.push('CREATE TABLE IF NOT EXISTS source_system_registry (');
sections.push('    source_system            VARCHAR(40) PRIMARY KEY,');
sections.push('    source_system_name       VARCHAR(255) NOT NULL,');
sections.push('    source_system_name_vi    VARCHAR(255),');
sections.push('    source_system_category   VARCHAR(80) NOT NULL,');
sections.push('    ownership_team           VARCHAR(120),');
sections.push("    synchronization_mode    VARCHAR(40) NOT NULL DEFAULT 'batch',");
sections.push("    trust_level             VARCHAR(40) NOT NULL DEFAULT 'verified',");
sections.push("    source_status           VARCHAR(30) NOT NULL DEFAULT 'active',");
sections.push("    metadata                JSONB DEFAULT '{}'::jsonb,");
sections.push('    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),');
sections.push('    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()');
sections.push(');');
sections.push('CREATE TABLE IF NOT EXISTS retention_policies (');
sections.push('    policy_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
sections.push('    retention_policy_code   VARCHAR(60) NOT NULL UNIQUE,');
sections.push('    policy_name             VARCHAR(255) NOT NULL,');
sections.push('    data_domain             VARCHAR(100) NOT NULL,');
sections.push('    table_name              VARCHAR(150) NOT NULL UNIQUE,');
sections.push('    retention_class         VARCHAR(60) NOT NULL,');
sections.push('    hot_retention_days      INTEGER NOT NULL DEFAULT 90,');
sections.push('    archive_retention_days  INTEGER,');
sections.push('    purge_after_days        INTEGER,');
sections.push("    archive_strategy       VARCHAR(60) NOT NULL DEFAULT 'partition_and_archive',");
sections.push("    storage_tier           VARCHAR(40) NOT NULL DEFAULT 'warm',");
sections.push("    legal_hold_allowed     BOOLEAN NOT NULL DEFAULT TRUE,");
sections.push("    policy_status          VARCHAR(30) NOT NULL DEFAULT 'draft',");
sections.push('    owner_role              VARCHAR(120),');
sections.push("    metadata                JSONB DEFAULT '{}'::jsonb,");
sections.push('    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),');
sections.push('    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()');
sections.push(');');
sections.push('CREATE TABLE IF NOT EXISTS data_archival_runs (');
sections.push('    archive_run_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
sections.push('    policy_id               UUID NOT NULL REFERENCES retention_policies(policy_id),');
sections.push('    table_name              VARCHAR(150) NOT NULL,');
sections.push('    archive_scope_start     TIMESTAMPTZ,');
sections.push('    archive_scope_end       TIMESTAMPTZ,');
sections.push('    candidate_row_count     BIGINT NOT NULL DEFAULT 0,');
sections.push('    archived_row_count      BIGINT NOT NULL DEFAULT 0,');
sections.push('    checksum_hash           VARCHAR(128),');
sections.push("    storage_tier           VARCHAR(40) NOT NULL DEFAULT 'archive',");
sections.push("    archive_status         VARCHAR(30) NOT NULL DEFAULT 'planned',");
sections.push("    metadata               JSONB DEFAULT '{}'::jsonb,");
sections.push('    started_at               TIMESTAMPTZ,');
sections.push('    completed_at             TIMESTAMPTZ,');
sections.push('    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()');
sections.push(');');
sections.push('CREATE TABLE IF NOT EXISTS integration_monitors (');
sections.push('    integration_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
sections.push('    integration_code        VARCHAR(60) NOT NULL UNIQUE,');
sections.push('    integration_name        VARCHAR(255) NOT NULL,');
sections.push('    source_system           VARCHAR(40) NOT NULL REFERENCES source_system_registry(source_system),');
sections.push('    target_system           VARCHAR(40) NOT NULL REFERENCES source_system_registry(source_system),');
sections.push("    integration_pattern    VARCHAR(40) NOT NULL DEFAULT 'event_driven',");
sections.push("    monitoring_status      VARCHAR(30) NOT NULL DEFAULT 'draft',");
sections.push("    severity_threshold     VARCHAR(30) NOT NULL DEFAULT 'major',");
sections.push('    reconciliation_sla_minutes INTEGER NOT NULL DEFAULT 60,');
sections.push('    owner_role              VARCHAR(120),');
sections.push('    last_health_check_at    TIMESTAMPTZ,');
sections.push('    last_success_at         TIMESTAMPTZ,');
sections.push('    last_failure_at         TIMESTAMPTZ,');
sections.push("    metadata                JSONB DEFAULT '{}'::jsonb,");
sections.push('    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),');
sections.push('    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()');
sections.push(');');
sections.push('CREATE INDEX IF NOT EXISTS idx_retention_policies_domain ON retention_policies (data_domain, policy_status);');
sections.push('CREATE INDEX IF NOT EXISTS idx_retention_policies_table ON retention_policies (table_name);');
sections.push('CREATE INDEX IF NOT EXISTS idx_data_archival_runs_policy ON data_archival_runs (policy_id, archive_status);');
sections.push('CREATE INDEX IF NOT EXISTS idx_integration_monitors_status ON integration_monitors (monitoring_status);');
sections.push('CREATE INDEX IF NOT EXISTS idx_integration_monitors_route ON integration_monitors (source_system, target_system);');
sections.push('');
sections.push("INSERT INTO org_companies (company_code, company_name, company_name_vi, company_status, default_currency_code)");
sections.push("VALUES ('HESEM', 'HESEM', 'HESEM', 'active', 'VND')");
sections.push("ON CONFLICT (company_code) DO NOTHING;");
sections.push("INSERT INTO org_legal_entities (legal_entity_code, company_code, legal_entity_name, legal_entity_name_vi, country_code, functional_currency_code, legal_entity_status)");
sections.push("VALUES ('HESEM-VN', 'HESEM', 'HESEM Vietnam', 'HESEM Viet Nam', 'VN', 'VND', 'active')");
sections.push("ON CONFLICT (legal_entity_code) DO NOTHING;");
sections.push("INSERT INTO org_plants (plant_id, legal_entity_code, site_id, plant_name, plant_name_vi, timezone, plant_status)");
sections.push("VALUES ('HESEM-HCM-PLANT', 'HESEM-VN', 'HESEM-HCM', 'HESEM HCM Plant', 'Nha may HESEM HCM', 'Asia/Ho_Chi_Minh', 'active')");
sections.push("ON CONFLICT (plant_id) DO NOTHING;");
sections.push("INSERT INTO source_system_registry (source_system, source_system_name, source_system_name_vi, source_system_category, ownership_team, synchronization_mode, trust_level, source_status)");
sections.push("VALUES");
sections.push("    ('QMS', 'QMS Portal', 'Cong QMS', 'application', 'quality_platform', 'event_driven', 'system_of_record', 'active'),");
sections.push("    ('ERP', 'ERP Core', 'ERP Loi', 'erp', 'enterprise_platform', 'batch', 'system_of_record', 'active'),");
sections.push("    ('MES', 'MES Edge', 'MES Bien', 'mes', 'manufacturing_platform', 'event_driven', 'verified', 'active'),");
sections.push("    ('EQMS', 'Enterprise QMS', 'eQMS Doanh nghiep', 'quality', 'quality_platform', 'event_driven', 'verified', 'active')");
sections.push("ON CONFLICT (source_system) DO NOTHING;");
sections.push("INSERT INTO retention_policies (retention_policy_code, policy_name, data_domain, table_name, retention_class, hot_retention_days, archive_retention_days, purge_after_days, archive_strategy, storage_tier, legal_hold_allowed, policy_status, owner_role)");
sections.push("VALUES");
sections.push("    ('RET-MES-TELEMETRY', 'MES Telemetry Retention', 'mes_execution', 'mes_machine_telemetry', 'high_volume_event', 30, 365, 2555, 'partition_and_archive', 'hot', TRUE, 'active', 'manufacturing_data_governor'),");
sections.push("    ('RET-MES-SNAPSHOT', 'MES Snapshot Retention', 'mes_execution', 'mes_machine_snapshot', 'high_volume_snapshot', 30, 365, 1825, 'partition_and_archive', 'warm', TRUE, 'active', 'manufacturing_data_governor'),");
sections.push("    ('RET-TRACE-GENEALOGY', 'Genealogy Retention', 'traceability_serialization', 'mes_genealogy_operations', 'traceability_record', 180, 1825, NULL, 'archive_only', 'warm', TRUE, 'active', 'traceability_governor'),");
sections.push("    ('RET-WORKFLOW-STEP', 'Workflow Step Evidence Retention', 'system_infrastructure', 'workflow_step_data', 'workflow_evidence', 90, 1095, 3650, 'archive_only', 'warm', TRUE, 'active', 'platform_governor'),");
sections.push("    ('RET-LEAN-ANDON', 'Lean Andon Retention', 'lean_manufacturing', 'lean_andon_events', 'operational_event', 90, 730, 1825, 'partition_and_archive', 'warm', TRUE, 'active', 'lean_governor'),");
sections.push("    ('RET-CAPA-8D', 'CAPA 8D Structured Retention', 'quality_management', 'capa_8d_steps', 'quality_record', 365, 3650, NULL, 'archive_only', 'warm', TRUE, 'active', 'quality_data_steward')");
sections.push("ON CONFLICT (table_name) DO NOTHING;");
sections.push("INSERT INTO integration_monitors (integration_code, integration_name, source_system, target_system, integration_pattern, monitoring_status, severity_threshold, reconciliation_sla_minutes, owner_role)");
sections.push("VALUES");
sections.push("    ('INT-ERP-MES', 'ERP to MES Production Sync', 'ERP', 'MES', 'event_driven', 'active', 'major', 30, 'integration_owner'),");
sections.push("    ('INT-MES-EQMS', 'MES to eQMS Quality Event Sync', 'MES', 'EQMS', 'event_driven', 'active', 'critical', 15, 'quality_integration_owner'),");
sections.push("    ('INT-QMS-ERP', 'QMS to ERP Compliance Sync', 'QMS', 'ERP', 'batch', 'active', 'major', 60, 'enterprise_integration_owner')");
sections.push("ON CONFLICT (integration_code) DO NOTHING;");
sections.push('');
sections.push('CREATE OR REPLACE FUNCTION set_row_version()');
sections.push('RETURNS TRIGGER AS $$');
sections.push('BEGIN');
sections.push('    NEW.row_version = COALESCE(OLD.row_version, 0) + 1;');
sections.push('    RETURN NEW;');
sections.push('END;');
sections.push('$$ LANGUAGE plpgsql;');
sections.push('');

for (const tableName of targetTables) {
  sections.push(`-- ${tableName}`);
  sections.push(renderAlterTable(tableName));
  for (const statement of renderIndexStatements(tableName)) sections.push(statement);
  for (const statement of renderTriggerStatements(tableName)) sections.push(statement);
  sections.push('');
}

sections.push('CREATE OR REPLACE VIEW v_identity_user_employee_ssot AS');
sections.push('SELECT');
sections.push('    COALESCE(u.user_id, e.user_id) AS canonical_user_id,');
sections.push('    u.user_id,');
sections.push('    u.username,');
sections.push('    u.email,');
sections.push('    u.status AS user_status,');
sections.push('    u.employee_id AS user_employee_id,');
sections.push('    e.employee_id,');
sections.push('    e.employee_name,');
sections.push('    e.is_active AS employee_active,');
sections.push('    COALESCE(e.dept_code, u.dept_code) AS dept_code,');
sections.push('    COALESCE(e.shift, u.shift) AS shift,');
sections.push('    CASE');
sections.push("        WHEN u.user_id IS NULL THEN 'employee_without_user'");
sections.push("        WHEN e.employee_id IS NULL THEN 'user_without_employee'");
sections.push("        WHEN u.employee_id <> e.employee_id THEN 'link_mismatch'");
sections.push("        ELSE 'aligned'");
sections.push('    END AS ssot_alignment');
sections.push('FROM users u');
sections.push('FULL OUTER JOIN employees e');
sections.push('  ON e.user_id = u.user_id OR e.employee_id = u.employee_id;');
sections.push('');
sections.push('CREATE OR REPLACE VIEW v_customer_account_ssot AS');
sections.push('SELECT');
sections.push('    c.customer_id,');
sections.push('    c.customer_name,');
sections.push('    c.customer_status,');
sections.push('    c.currency_default,');
sections.push('    c.default_payment_term_code,');
sections.push('    c.default_incoterm_code,');
sections.push('    ca.account_id,');
sections.push('    ca.account_status,');
sections.push('    ca.currency_code AS account_currency_code,');
sections.push('    ca.promise_policy_code,');
sections.push('    CASE');
sections.push("        WHEN ca.account_id IS NULL THEN 'customer_without_account_profile'");
sections.push("        ELSE 'aligned'");
sections.push('    END AS ssot_alignment');
sections.push('FROM customers c');
sections.push('LEFT JOIN commercial_accounts ca');
sections.push('  ON ca.customer_id = c.customer_id;');
sections.push('');
sections.push('CREATE OR REPLACE VIEW v_supplier_qualification_ssot AS');
sections.push('SELECT');
sections.push('    v.vendor_id,');
sections.push('    v.vendor_name,');
sections.push('    v.vendor_status,');
sections.push('    v.vendor_rating_grade,');
sections.push('    asl.asl_id,');
sections.push('    asl.asl_status,');
sections.push('    asl.approved_date,');
sections.push('    asl.expiry_date,');
sections.push('    CASE');
sections.push("        WHEN asl.asl_id IS NULL THEN 'vendor_without_asl'");
sections.push("        ELSE 'aligned'");
sections.push('    END AS ssot_alignment');
sections.push('FROM vendors v');
sections.push('LEFT JOIN approved_supplier_list asl');
sections.push('  ON asl.vendor_id = v.vendor_id;');
sections.push('');
sections.push('CREATE OR REPLACE VIEW v_retention_policy_coverage AS');
sections.push('SELECT');
sections.push('    rp.retention_policy_code,');
sections.push('    rp.table_name,');
sections.push('    rp.data_domain,');
sections.push('    rp.retention_class,');
sections.push('    rp.hot_retention_days,');
sections.push('    rp.archive_retention_days,');
sections.push('    rp.purge_after_days,');
sections.push('    rp.archive_strategy,');
sections.push('    rp.storage_tier,');
sections.push('    rp.policy_status');
sections.push('FROM retention_policies rp;');
sections.push('');
sections.push('CREATE OR REPLACE VIEW v_integration_monitor_route AS');
sections.push('SELECT');
sections.push('    im.integration_code,');
sections.push('    im.integration_name,');
sections.push('    im.monitoring_status,');
sections.push('    im.integration_pattern,');
sections.push('    im.reconciliation_sla_minutes,');
sections.push('    ss.source_system_name AS source_system_name,');
sections.push('    ts.source_system_name AS target_system_name,');
sections.push('    im.last_health_check_at,');
sections.push('    im.last_success_at,');
sections.push('    im.last_failure_at');
sections.push('FROM integration_monitors im');
sections.push('JOIN source_system_registry ss');
sections.push('  ON ss.source_system = im.source_system');
sections.push('JOIN source_system_registry ts');
sections.push('  ON ts.source_system = im.target_system;');
sections.push('');
sections.push('CREATE OR REPLACE VIEW v_quality_record_ssot AS');
sections.push('SELECT');
sections.push('    r.record_id,');
sections.push('    r.record_type,');
sections.push('    r.title AS record_title,');
sections.push('    r.status AS record_status,');
sections.push('    n.ncr_id,');
sections.push('    n.ncr_number,');
sections.push('    n.ncr_status,');
sections.push('    c.capa_id,');
sections.push('    c.capa_status,');
sections.push('    f.fai_id,');
sections.push('    f.fai_number,');
sections.push('    f.fai_overall_result,');
sections.push('    CASE');
sections.push("        WHEN n.ncr_id IS NOT NULL THEN 'ncr'");
sections.push("        WHEN c.capa_id IS NOT NULL THEN 'capa'");
sections.push("        WHEN f.fai_id IS NOT NULL THEN 'fai'");
sections.push("        ELSE 'record'");
sections.push('    END AS process_entity,');
sections.push('    COALESCE(n.ncr_status, c.capa_status, f.fai_overall_result, r.status) AS effective_status');
sections.push('FROM records r');
sections.push('LEFT JOIN ncr_records n ON n.record_id = r.record_id');
sections.push('LEFT JOIN capa_records c ON c.record_id = r.record_id');
sections.push('LEFT JOIN fai_records f ON f.record_id = r.record_id;');
sections.push('');
sections.push('COMMIT;');

fs.writeFileSync(outputPath, `${sections.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  migration: path.basename(outputPath),
  targetTableCount: targetTables.length,
  columnsPerTarget: governanceColumns.length,
  outputPath,
}, null, 2));
