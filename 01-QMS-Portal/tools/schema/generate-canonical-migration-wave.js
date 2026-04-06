#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const portalRoot = path.resolve(__dirname, '..', '..');
const blueprintPath = path.join(portalRoot, 'database', 'canonical-erp-mes-eqms-7-layer-blueprint.sql');
const migrationsDir = path.join(portalRoot, 'database', 'migrations');

const sql = fs.readFileSync(blueprintPath, 'utf8');

const tableStatements = new Map();
const createRe = /CREATE TABLE IF NOT EXISTS\s+([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/gi;
let match;
while ((match = createRe.exec(sql))) {
  tableStatements.set(match[1], match[0]);
}

const postEqmsConstraintMatch = sql.match(/DO \$\$[\s\S]*?END \$\$;/);
const postEqmsConstraint = postEqmsConstraintMatch ? postEqmsConstraintMatch[0] : '';

const waves = [
  {
    migrationNo: '072',
    fileName: '072_canonical_foundation_governance.sql',
    title: 'Canonical Foundation and Cross-Cutting Governance Backbone',
    description: 'Enterprise structure, party master, calendars, controlled codes, approvals, e-signatures, and attachments.',
    dependencies: '001_extensions_and_types.sql (baseline only)',
    tables: [
      'org_enterprise',
      'org_company',
      'org_site',
      'org_plant',
      'org_warehouse',
      'org_work_center',
      'org_work_unit',
      'party',
      'party_role',
      'party_site',
      'party_contact',
      'uom',
      'calendar',
      'shift',
      'reason_code',
      'status_code',
      'electronic_signature',
      'approval',
      'attachment',
    ],
    preamble: ['CREATE EXTENSION IF NOT EXISTS "pgcrypto";'],
    epilogue: [],
  },
  {
    migrationNo: '073',
    fileName: '073_canonical_master_data_core.sql',
    title: 'Canonical Master Data Core',
    description: 'Item, revision, site, attribute, specification, and lifecycle control policies for lot/serial/shelf-life governance.',
    dependencies: '072_canonical_foundation_governance.sql',
    tables: [
      'lot_policy',
      'serial_policy',
      'shelf_life_policy',
      'item',
      'item_class',
      'item_revision',
      'item_variant',
      'item_site',
      'item_attr',
      'item_spec',
    ],
    preamble: [],
    epilogue: [],
  },
  {
    migrationNo: '074',
    fileName: '074_canonical_engineering_definition.sql',
    title: 'Canonical Engineering and Manufacturing Definition',
    description: 'BOM, alternates, work definitions, operations, resources, outputs, and instruction bindings.',
    dependencies: '072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql',
    tables: [
      'bom',
      'bom_version',
      'bom_line',
      'bom_substitute',
      'work_definition',
      'work_definition_version',
      'operation',
      'operation_resource',
      'operation_material',
      'operation_output',
      'work_instruction',
    ],
    preamble: [],
    epilogue: [],
  },
  {
    migrationNo: '075',
    fileName: '075_canonical_planning_erp_orchestration.sql',
    title: 'Canonical Planning and ERP Orchestration',
    description: 'Demand, forecast, sales, purchasing, MRP, planned supply, allocation, pegging, and production snapshots.',
    dependencies: '072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql, 074_canonical_engineering_definition.sql',
    tables: [
      'demand',
      'forecast',
      'sales_order',
      'sales_order_line',
      'purchase_order',
      'purchase_order_line',
      'production_order',
      'mrp_signal',
      'planned_supply',
      'allocation',
      'pegging',
      'production_order_bom_snapshot',
      'production_order_route_snapshot',
    ],
    preamble: [],
    epilogue: [],
  },
  {
    migrationNo: '076',
    fileName: '076_canonical_mes_execution_spine.sql',
    title: 'Canonical MES Execution Spine',
    description: 'Work orders, jobs, dispatch, machine/runtime events, labor capture, genealogy, consumption, completion, scrap, and rework.',
    dependencies: '072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql, 074_canonical_engineering_definition.sql, 075_canonical_planning_erp_orchestration.sql',
    tables: [
      'work_order',
      'job',
      'track_in',
      'track_out',
      'pause_resume',
      'dispatch_queue',
      'job_event',
      'machine_event',
      'downtime_event',
      'alarm_event',
      'process_param_capture',
      'labor_capture',
      'tool_usage',
      'material_consumption',
      'production_completion',
      'scrap',
      'rework',
      'genealogy_link',
    ],
    preamble: [],
    epilogue: [],
  },
  {
    migrationNo: '077',
    fileName: '077_canonical_inventory_cost_traceability.sql',
    title: 'Canonical Inventory, Cost, and Traceability Backbone',
    description: 'Ledger-first inventory, lot/serial/container traceability, location balances, and WIP/cost ledgers.',
    dependencies: '072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql, 075_canonical_planning_erp_orchestration.sql, 076_canonical_mes_execution_spine.sql',
    tables: [
      'lot',
      'serial',
      'container',
      'inventory_ledger',
      'inventory_balance_snapshot',
      'location_balance',
      'cost_ledger',
      'wip_ledger',
    ],
    preamble: [],
    epilogue: [],
  },
  {
    migrationNo: '078',
    fileName: '078_canonical_eqms_compliance_backbone.sql',
    title: 'Canonical eQMS and Compliance Backbone',
    description: 'Inspection, quality case linkage, NCR/deviation/CAPA/complaints, controlled documents, audits, training, supplier quality, risk, and audit trail.',
    dependencies: '072_canonical_foundation_governance.sql, 073_canonical_master_data_core.sql, 074_canonical_engineering_definition.sql, 075_canonical_planning_erp_orchestration.sql, 076_canonical_mes_execution_spine.sql, 077_canonical_inventory_cost_traceability.sql',
    tables: [
      'inspection_plan',
      'inspection_characteristic',
      'inspection_lot',
      'inspection_result',
      'quality_order',
      'quality_case_link',
      'nonconformance',
      'deviation',
      'capa',
      'complaint',
      'document',
      'document_revision',
      'change_control',
      'audit_program',
      'audit',
      'finding',
      'competency',
      'training_matrix',
      'training_record',
      'supplier_quality_case',
      'risk_register',
      'audit_trail',
    ],
    preamble: [],
    epilogue: postEqmsConstraint ? [postEqmsConstraint] : [],
  },
];

function wrapLabeledComment(label, text, width) {
  const prefix = `-- ${label}: `;
  const continuation = '-- ' + ' '.repeat(label.length) + '  ';
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = prefix;
  words.forEach((word) => {
    if ((current + word).length > width) {
      lines.push(current.trimEnd());
      current = `${continuation}${word} `;
    } else {
      current += `${word} `;
    }
  });
  if (current.trim()) {
    lines.push(current.trimEnd());
  }
  return lines;
}

function buildHeader(wave) {
  const lines = [];
  lines.push('-- ============================================================================');
  lines.push(`-- Migration ${wave.migrationNo}: ${wave.title}`);
  wrapLabeledComment('Description', wave.description, 95).forEach((line) => lines.push(line));
  lines.push('-- Source: canonical-erp-mes-eqms-7-layer-blueprint.sql');
  wrapLabeledComment('Dependencies', wave.dependencies, 95).forEach((line) => lines.push(line));
  const rollbackTables = wave.tables.slice().reverse().join(', ');
  wrapLabeledComment('Rollback', `DROP TABLE ${rollbackTables} CASCADE;`, 95).forEach((line) => lines.push(line));
  lines.push('-- Standards: ISA-95, SAP, Oracle Manufacturing, Dynamics 365 SCM, FDA QMSR');
  lines.push('-- ============================================================================');
  return lines;
}

function buildMigrationContent(wave) {
  const missing = wave.tables.filter((tableName) => !tableStatements.has(tableName));
  if (missing.length) {
    throw new Error(`${wave.fileName}: missing table statements for ${missing.join(', ')}`);
  }

  const lines = buildHeader(wave);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  wave.preamble.forEach((statement) => {
    lines.push(statement);
    lines.push('');
  });

  wave.tables.forEach((tableName, index) => {
    lines.push(tableStatements.get(tableName).trim());
    if (index !== wave.tables.length - 1 || wave.epilogue.length) {
      lines.push('');
    }
  });

  wave.epilogue.forEach((statement, index) => {
    lines.push(statement.trim());
    if (index !== wave.epilogue.length - 1) {
      lines.push('');
    }
  });

  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}

waves.forEach((wave) => {
  const outputPath = path.join(migrationsDir, wave.fileName);
  fs.writeFileSync(outputPath, buildMigrationContent(wave), 'utf8');
  console.log(`wrote ${path.basename(outputPath)}`);
});
