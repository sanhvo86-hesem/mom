const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const outputPath = path.join(
  repoRoot,
  'mom',
  'data',
  'schema-studio',
  'designs',
  'canonical_erp_mes_eqms_7layer_core.json'
);

let seq = 1;
function uid(prefix){
  return prefix + '_' + String(seq++).padStart(4, '0');
}

function col(name, type, opts){
  opts = opts || {};
  return {
    id: uid('col'),
    name: name,
    type: type,
    length: opts.length == null ? null : opts.length,
    scale: opts.scale == null ? null : opts.scale,
    is_array: !!opts.is_array,
    nullable: opts.nullable !== false,
    unique: !!opts.unique,
    primary_key: !!opts.primary_key,
    pk_order: opts.primary_key ? (opts.pk_order || 1) : null,
    default_val: opts.default_val == null ? null : opts.default_val,
    check_expr: null,
    generated_expr: null,
    generated_stored: false,
    comment: opts.comment || '',
    foreign_key: null,
    _fkTarget: opts.fk || null
  };
}

function pk(name){
  return col(name, 'uuid', { primary_key: true, nullable: false, default_val: 'gen_random_uuid()' });
}

function fk(name, target, nullable){
  return col(name, 'uuid', { fk: target, nullable: nullable !== false });
}

function v(name, length, nullable){
  return col(name, 'varchar', { length: length || 80, nullable: nullable !== false });
}

function ts(name, nullable, def){
  return col(name, 'timestamptz', { nullable: nullable !== false, default_val: def || null });
}

function num(name, nullable){
  return col(name, 'numeric', { length: 18, scale: 6, nullable: nullable !== false });
}

function intcol(name, nullable){
  return col(name, 'integer', { nullable: nullable !== false });
}

function bool(name, nullable, def){
  return col(name, 'boolean', { nullable: nullable !== false, default_val: def == null ? null : def });
}

function textcol(name, nullable){
  return col(name, 'text', { nullable: nullable !== false });
}

function jsonb(name, nullable){
  return col(name, 'jsonb', { nullable: nullable !== false });
}

const layers = [
  { key: 'foundation', label: 'Foundation', color: '#0f766e', x: 80 },
  { key: 'master_data', label: 'Master Data', color: '#2563eb', x: 420 },
  { key: 'engineering', label: 'Engineering', color: '#7c3aed', x: 760 },
  { key: 'planning_erp', label: 'Planning ERP', color: '#d97706', x: 1100 },
  { key: 'mes_execution', label: 'MES Execution', color: '#0284c7', x: 1440 },
  { key: 'inventory_traceability', label: 'Inventory Traceability', color: '#15803d', x: 1780 },
  { key: 'eqms_compliance', label: 'eQMS Compliance', color: '#be123c', x: 2120 }
];

const rows = {};
const tables = [];
const tableByName = {};
const layerByKey = Object.fromEntries(layers.map(function(layer){ return [layer.key, layer]; }));

function addTable(layerKey, name, comment, columns, width){
  const layer = layerByKey[layerKey];
  rows[layerKey] = rows[layerKey] || 0;
  const row = rows[layerKey]++;
  const table = {
    id: uid('tbl'),
    name: name,
    schema: 'public',
    comment: comment,
    domain: layerKey,
    color: layer.color,
    tags: [layer.label.toLowerCase().replace(/ /g, '_')],
    rls_enabled: false,
    canvas: {
      x: layer.x,
      y: 120 + (row * 230),
      width: width || 280,
      collapsed: true
    },
    columns: columns,
    indexes: [],
    check_constraints: [],
    triggers: []
  };
  tables.push(table);
  tableByName[name] = table;
}

function buildGroups(){
  return layers.map(function(layer){
    const layerTables = tables.filter(function(table){ return table.domain === layer.key; });
    const maxY = Math.max.apply(null, layerTables.map(function(table){ return table.canvas.y + 180; }));
    return {
      id: uid('grp'),
      name: layer.label,
      color: layer.color,
      table_ids: layerTables.map(function(table){ return table.id; }),
      canvas: {
        x: layer.x - 30,
        y: 70,
        width: 320,
        height: maxY - 20
      }
    };
  });
}

function buildRelations(){
  const relations = [];
  tables.forEach(function(table){
    table.columns.forEach(function(column){
      if (!column._fkTarget) return;
      const parts = column._fkTarget.split('.');
      const targetTable = tableByName[parts[0]];
      const targetCol = targetTable && targetTable.columns.find(function(entry){ return entry.name === parts[1]; });
      if (!targetTable || !targetCol) return;
      column.foreign_key = {
        ref_table_id: targetTable.id,
        ref_col_id: targetCol.id,
        constraint_name: 'fk_' + table.name + '_' + column.name,
        on_delete: 'RESTRICT',
        on_update: 'CASCADE',
        deferrable: false
      };
      relations.push({
        id: uid('rel'),
        from_table_id: table.id,
        from_col_id: column.id,
        to_table_id: targetTable.id,
        to_col_id: targetCol.id,
        name: 'fk_' + table.name + '_' + column.name,
        on_delete: 'RESTRICT',
        on_update: 'CASCADE',
        nullable: column.nullable,
        edge: { type: 'orthogonal', waypoints: [] }
      });
      delete column._fkTarget;
    });
  });
  tables.forEach(function(table){
    table.columns.forEach(function(column){ delete column._fkTarget; });
  });
  return relations;
}

function buildNotes(){
  return [
    { id: uid('note'), content: 'One party master, one item master, one organization hierarchy.', canvas: { x: 60, y: 40, w: 280, h: 70 } },
    { id: uid('note'), content: 'Orders keep released BOM and route snapshots. MES records events, not mutable truth.', canvas: { x: 1040, y: 40, w: 340, h: 80 } },
    { id: uid('note'), content: 'Inventory is ledger-first. eQMS links directly to PO/SO/WO/lot/serial/document.', canvas: { x: 1820, y: 40, w: 360, h: 80 } }
  ];
}

// Foundation
addTable('foundation', 'org_enterprise', 'Enterprise root.', [pk('enterprise_id'), v('enterprise_code', 40, false), v('enterprise_name', 180, false), v('home_currency_code', 10, false), v('status_code', 30, false), ts('created_at', false, 'now()')]);
addTable('foundation', 'org_company', 'Legal and reporting company.', [pk('company_id'), fk('enterprise_id', 'org_enterprise.enterprise_id', false), v('company_code', 40, false), v('legal_name', 180, false), v('functional_currency_code', 10, false), v('status_code', 30, false)]);
addTable('foundation', 'org_site', 'Operational site.', [pk('site_id'), fk('company_id', 'org_company.company_id', false), v('site_code', 40, false), v('site_name', 180, false), v('site_type', 40, false), v('status_code', 30, false)]);
addTable('foundation', 'org_plant', 'Production plant.', [pk('plant_id'), fk('site_id', 'org_site.site_id', false), v('plant_code', 40, false), v('plant_name', 180, false), v('status_code', 30, false)]);
addTable('foundation', 'org_warehouse', 'Warehouse and stock node.', [pk('warehouse_id'), fk('plant_id', 'org_plant.plant_id', false), v('warehouse_code', 40, false), v('warehouse_name', 180, false), v('warehouse_type', 40, false), v('status_code', 30, false)]);
addTable('foundation', 'org_work_center', 'Capacity bucket.', [pk('work_center_id'), fk('plant_id', 'org_plant.plant_id', false), v('work_center_code', 40, false), v('work_center_name', 180, false), v('capacity_uom_code', 20, false)]);
addTable('foundation', 'org_work_unit', 'Specific machine or cell.', [pk('work_unit_id'), fk('work_center_id', 'org_work_center.work_center_id', false), v('work_unit_code', 60, false), v('work_unit_name', 180, false), v('equipment_class', 60), v('status_code', 30, false)]);
addTable('foundation', 'party', 'Unified party master.', [pk('party_id'), v('party_code', 60, false), v('party_type', 40, false), v('display_name', 180, false), v('status_code', 30, false)]);
addTable('foundation', 'party_role', 'Party roles across processes.', [pk('party_role_id'), fk('party_id', 'party.party_id', false), v('role_code', 60, false), v('scope_entity_name', 60), fk('scope_entity_id', 'org_site.site_id'), ts('effective_from', false, 'now()')]);
addTable('foundation', 'party_site', 'Address and business site.', [pk('party_site_id'), fk('party_id', 'party.party_id', false), v('site_role_code', 40, false), v('site_name', 160, false), v('country_code', 10), bool('is_default', false, 'false')]);
addTable('foundation', 'party_contact', 'Contact person.', [pk('party_contact_id'), fk('party_id', 'party.party_id', false), fk('party_site_id', 'party_site.party_site_id'), v('contact_name', 160, false), v('email_address', 180), v('phone_number', 80)]);
addTable('foundation', 'uom', 'Unit of measure.', [col('uom_code', 'varchar', { length: 20, nullable: false, primary_key: true }), v('uom_name', 120, false), v('uom_category', 40, false), v('base_uom_code', 20)]);
addTable('foundation', 'calendar', 'Factory calendar.', [pk('calendar_id'), v('calendar_code', 40, false), v('calendar_name', 160, false), v('timezone', 100, false)]);
addTable('foundation', 'shift', 'Shift definition.', [pk('shift_id'), fk('calendar_id', 'calendar.calendar_id', false), v('shift_code', 20, false), v('shift_name', 120, false), col('start_time', 'time', { nullable: false }), col('end_time', 'time', { nullable: false })]);
addTable('foundation', 'reason_code', 'Governed reason list.', [pk('reason_code_id'), v('reason_domain', 40, false), v('reason_code', 40, false), v('reason_name', 160, false), v('severity_code', 30)]);
addTable('foundation', 'status_code', 'Governed status list.', [pk('status_code_id'), v('status_domain', 40, false), v('status_code', 40, false), v('status_name', 160, false), intcol('sequence_no', false)]);
addTable('foundation', 'electronic_signature', 'Part 11 compliant signature.', [pk('electronic_signature_id'), fk('signed_by_party_id', 'party.party_id'), v('signature_meaning', 120, false), v('signature_status', 30, false), textcol('hash_value', false), ts('signed_at', false, 'now()')]);
addTable('foundation', 'approval', 'Cross-entity approval.', [pk('approval_id'), v('entity_name', 80, false), fk('entity_id', 'document.document_id'), v('approval_step_code', 60, false), fk('approver_party_id', 'party.party_id'), v('decision_code', 30)]);
addTable('foundation', 'attachment', 'Linked controlled evidence.', [pk('attachment_id'), v('entity_name', 80, false), fk('entity_id', 'document.document_id'), v('attachment_type', 40, false), v('file_name', 180, false), textcol('storage_uri', false)]);

// Master Data
addTable('master_data', 'lot_policy', 'Lot numbering and genealogy policy.', [pk('lot_policy_id'), v('policy_code', 40, false), v('lot_numbering_rule', 120, false), intcol('shelf_life_days'), bool('genealogy_required', false, 'true')]);
addTable('master_data', 'serial_policy', 'Serialization policy.', [pk('serial_policy_id'), v('policy_code', 40, false), v('serial_numbering_rule', 120, false), v('serialization_point', 60, false), v('uniqueness_scope', 40, false)]);
addTable('master_data', 'shelf_life_policy', 'Shelf life and retest policy.', [pk('shelf_life_policy_id'), v('policy_code', 40, false), intcol('total_shelf_life_days', false), intcol('retest_interval_days'), bool('quarantine_on_expiry', false, 'true')]);
addTable('master_data', 'item', 'One item master.', [pk('item_id'), v('item_code', 80, false), v('item_name', 180, false), v('item_type', 40, false), v('base_uom_code', 20), fk('lot_policy_id', 'lot_policy.lot_policy_id'), fk('serial_policy_id', 'serial_policy.serial_policy_id'), fk('shelf_life_policy_id', 'shelf_life_policy.shelf_life_policy_id')]);
addTable('master_data', 'item_class', 'Classification hierarchy.', [pk('item_class_id'), v('class_code', 60, false), v('class_name', 180, false), fk('parent_class_id', 'item_class.item_class_id')]);
addTable('master_data', 'item_revision', 'Released product revision.', [pk('item_revision_id'), fk('item_id', 'item.item_id', false), v('revision_code', 40, false), v('lifecycle_state', 30, false), ts('effective_from', false, 'now()'), v('approval_state', 30, false)]);
addTable('master_data', 'item_variant', 'Configurable released variant.', [pk('item_variant_id'), fk('item_revision_id', 'item_revision.item_revision_id', false), v('variant_code', 80, false), v('variant_name', 180, false), jsonb('option_payload', false)]);
addTable('master_data', 'item_site', 'Site planning extension of item.', [pk('item_site_id'), fk('item_id', 'item.item_id', false), fk('site_id', 'org_site.site_id', false), v('planner_code', 60), v('procurement_type', 30, false), fk('default_warehouse_id', 'org_warehouse.warehouse_id')]);
addTable('master_data', 'item_attr', 'Bounded extensibility attributes.', [pk('item_attr_id'), fk('item_id', 'item.item_id', false), v('attr_name', 80, false), v('attr_type', 30, false), textcol('attr_value_text'), num('attr_value_num'), bool('attr_value_bool')]);
addTable('master_data', 'item_spec', 'Product specification.', [pk('item_spec_id'), fk('item_revision_id', 'item_revision.item_revision_id', false), v('spec_code', 60, false), v('spec_name', 180, false), v('spec_type', 40, false), textcol('target_value_text'), num('lower_limit_num'), num('upper_limit_num')]);

// Engineering
addTable('engineering', 'bom', 'BOM header.', [pk('bom_id'), v('bom_code', 80, false), fk('parent_item_revision_id', 'item_revision.item_revision_id', false), v('bom_type', 30, false), v('alternate_code', 30), v('status_code', 30, false)]);
addTable('engineering', 'bom_version', 'Released BOM version.', [pk('bom_version_id'), fk('bom_id', 'bom.bom_id', false), v('version_code', 40, false), ts('effective_from', false, 'now()'), v('approval_state', 30, false)]);
addTable('engineering', 'bom_line', 'BOM component line.', [pk('bom_line_id'), fk('bom_version_id', 'bom_version.bom_version_id', false), fk('component_item_revision_id', 'item_revision.item_revision_id', false), intcol('sequence_no', false), num('qty_per', false), v('issue_method', 30, false)]);
addTable('engineering', 'bom_substitute', 'Approved substitute component.', [pk('bom_substitute_id'), fk('bom_line_id', 'bom_line.bom_line_id', false), fk('substitute_item_revision_id', 'item_revision.item_revision_id', false), intcol('priority_no', false), num('quantity_factor', false)]);
addTable('engineering', 'work_definition', 'Manufacturing route identity.', [pk('work_definition_id'), v('work_definition_code', 80, false), fk('item_revision_id', 'item_revision.item_revision_id', false), fk('plant_id', 'org_plant.plant_id', false), v('definition_type', 30, false)]);
addTable('engineering', 'work_definition_version', 'Released route version.', [pk('work_definition_version_id'), fk('work_definition_id', 'work_definition.work_definition_id', false), v('version_code', 40, false), ts('effective_from', false, 'now()'), v('approval_state', 30, false)]);
addTable('engineering', 'operation', 'Sequenced operation.', [pk('operation_id'), fk('work_definition_version_id', 'work_definition_version.work_definition_version_id', false), v('operation_code', 60, false), v('operation_name', 180, false), intcol('sequence_no', false)]);
addTable('engineering', 'operation_resource', 'Required work center/unit.', [pk('operation_resource_id'), fk('operation_id', 'operation.operation_id', false), v('resource_type', 30, false), fk('work_center_id', 'org_work_center.work_center_id'), fk('work_unit_id', 'org_work_unit.work_unit_id')]);
addTable('engineering', 'operation_material', 'Point-of-use material rule.', [pk('operation_material_id'), fk('operation_id', 'operation.operation_id', false), fk('item_revision_id', 'item_revision.item_revision_id', false), v('issue_method', 30, false), num('quantity_per', false)]);
addTable('engineering', 'operation_output', 'Output of an operation.', [pk('operation_output_id'), fk('operation_id', 'operation.operation_id', false), fk('item_revision_id', 'item_revision.item_revision_id', false), v('output_type', 30, false), num('yield_factor_pct', false)]);
addTable('engineering', 'work_instruction', 'Controlled instruction step.', [pk('work_instruction_id'), fk('operation_id', 'operation.operation_id', false), v('instruction_code', 80, false), v('instruction_title', 180, false), fk('document_revision_id', 'document_revision.document_revision_id'), intcol('sequence_no', false)]);

// Planning ERP
addTable('planning_erp', 'demand', 'Net demand signal.', [pk('demand_id'), v('demand_source', 30, false), v('source_document_no', 80), fk('item_site_id', 'item_site.item_site_id', false), ts('required_date', false), num('demand_qty', false)]);
addTable('planning_erp', 'forecast', 'Forecast bucket.', [pk('forecast_id'), fk('item_site_id', 'item_site.item_site_id', false), fk('customer_party_id', 'party.party_id'), col('period_start', 'date', { nullable: false }), col('period_end', 'date', { nullable: false }), num('forecast_qty', false)]);
addTable('planning_erp', 'sales_order', 'Customer order header.', [pk('sales_order_id'), v('sales_order_no', 80, false), fk('customer_party_id', 'party.party_id', false), ts('order_date', false, 'now()'), ts('requested_ship_date'), v('status_code', 30, false)]);
addTable('planning_erp', 'sales_order_line', 'Customer order line.', [pk('sales_order_line_id'), fk('sales_order_id', 'sales_order.sales_order_id', false), intcol('line_no', false), fk('item_revision_id', 'item_revision.item_revision_id', false), num('ordered_qty', false)]);
addTable('planning_erp', 'purchase_order', 'Supplier order header.', [pk('purchase_order_id'), v('purchase_order_no', 80, false), fk('supplier_party_id', 'party.party_id', false), ts('order_date', false, 'now()'), ts('requested_receipt_date'), v('status_code', 30, false)]);
addTable('planning_erp', 'purchase_order_line', 'Supplier order line.', [pk('purchase_order_line_id'), fk('purchase_order_id', 'purchase_order.purchase_order_id', false), intcol('line_no', false), fk('item_revision_id', 'item_revision.item_revision_id', false), num('ordered_qty', false)]);
addTable('planning_erp', 'mrp_signal', 'Planning exception or shortage.', [pk('mrp_signal_id'), fk('item_site_id', 'item_site.item_site_id', false), v('signal_type', 40, false), v('source_entity_name', 80), fk('source_entity_id', 'sales_order_line.sales_order_line_id'), num('shortage_qty'), ts('due_at')]);
addTable('planning_erp', 'planned_supply', 'Planned replenishment.', [pk('planned_supply_id'), fk('mrp_signal_id', 'mrp_signal.mrp_signal_id'), v('supply_type', 30, false), fk('item_site_id', 'item_site.item_site_id', false), num('planned_qty', false)]);
addTable('planning_erp', 'allocation', 'Reservation of supply to demand.', [pk('allocation_id'), v('supply_entity_name', 80, false), fk('supply_entity_id', 'planned_supply.planned_supply_id', false), v('demand_entity_name', 80, false), fk('demand_entity_id', 'demand.demand_id', false), num('allocated_qty', false)]);
addTable('planning_erp', 'pegging', 'Parent-child planning dependency.', [pk('pegging_id'), v('parent_entity_name', 80, false), fk('parent_entity_id', 'planned_supply.planned_supply_id', false), v('child_entity_name', 80, false), fk('child_entity_id', 'demand.demand_id', false), num('pegged_qty', false)]);
addTable('planning_erp', 'production_order', 'Released manufacturing order.', [pk('production_order_id'), v('production_order_no', 80, false), fk('item_revision_id', 'item_revision.item_revision_id', false), fk('plant_id', 'org_plant.plant_id', false), num('planned_qty', false), v('release_state', 30, false)]);
addTable('planning_erp', 'production_order_bom_snapshot', 'Frozen BOM at release.', [pk('production_order_bom_snapshot_id'), fk('production_order_id', 'production_order.production_order_id', false), fk('bom_version_id', 'bom_version.bom_version_id'), jsonb('snapshot_json', false), ts('frozen_at', false, 'now()')]);
addTable('planning_erp', 'production_order_route_snapshot', 'Frozen route at release.', [pk('production_order_route_snapshot_id'), fk('production_order_id', 'production_order.production_order_id', false), fk('work_definition_version_id', 'work_definition_version.work_definition_version_id'), jsonb('snapshot_json', false), ts('frozen_at', false, 'now()')]);

// MES Execution
addTable('mes_execution', 'work_order', 'Executable order segment.', [pk('work_order_id'), v('work_order_no', 80, false), fk('production_order_id', 'production_order.production_order_id', false), fk('operation_id', 'operation.operation_id'), num('planned_qty', false), v('release_state', 30, false)]);
addTable('mes_execution', 'job', 'Dispatchable execution unit.', [pk('job_id'), v('job_no', 80, false), fk('work_order_id', 'work_order.work_order_id', false), fk('work_unit_id', 'org_work_unit.work_unit_id'), ts('planned_start_at'), v('current_state', 30, false)]);
addTable('mes_execution', 'track_in', 'Start execution event.', [pk('track_in_id'), fk('job_id', 'job.job_id', false), fk('work_unit_id', 'org_work_unit.work_unit_id'), fk('tracked_by_party_id', 'party.party_id'), ts('tracked_at', false, 'now()')]);
addTable('mes_execution', 'track_out', 'Completion event.', [pk('track_out_id'), fk('job_id', 'job.job_id', false), num('good_qty', false), num('reject_qty', false), fk('tracked_by_party_id', 'party.party_id'), ts('tracked_at', false, 'now()')]);
addTable('mes_execution', 'pause_resume', 'Pause and resume history.', [pk('pause_resume_id'), fk('job_id', 'job.job_id', false), v('action_code', 20, false), v('reason_code', 60), fk('acted_by_party_id', 'party.party_id')]);
addTable('mes_execution', 'dispatch_queue', 'Dispatch sequence.', [pk('dispatch_queue_id'), fk('work_center_id', 'org_work_center.work_center_id', false), col('queue_date', 'date', { nullable: false }), intcol('dispatch_sequence', false), fk('job_id', 'job.job_id', false)]);
addTable('mes_execution', 'job_event', 'Append-only job event.', [pk('job_event_id'), fk('job_id', 'job.job_id', false), v('event_type', 40, false), fk('operator_party_id', 'party.party_id'), ts('event_at', false, 'now()'), jsonb('event_value_json', false)]);
addTable('mes_execution', 'machine_event', 'Machine telemetry event.', [pk('machine_event_id'), fk('work_unit_id', 'org_work_unit.work_unit_id', false), v('event_type', 40, false), v('severity_code', 30, false), ts('event_at', false, 'now()')]);
addTable('mes_execution', 'downtime_event', 'Downtime record.', [pk('downtime_event_id'), fk('work_unit_id', 'org_work_unit.work_unit_id', false), fk('production_order_id', 'production_order.production_order_id'), v('reason_code', 60), ts('started_at', false), ts('ended_at')]);
addTable('mes_execution', 'alarm_event', 'Alarm lifecycle event.', [pk('alarm_event_id'), fk('work_unit_id', 'org_work_unit.work_unit_id', false), v('alarm_code', 80, false), v('severity_code', 30), v('alarm_state', 30, false), ts('occurred_at', false, 'now()')]);
addTable('mes_execution', 'process_param_capture', 'Captured process parameter.', [pk('process_param_capture_id'), fk('job_id', 'job.job_id', false), fk('operation_id', 'operation.operation_id'), v('param_code', 80, false), textcol('param_value_text'), num('param_value_num'), v('uom_code', 20)]);
addTable('mes_execution', 'labor_capture', 'Captured labor actual.', [pk('labor_capture_id'), fk('job_id', 'job.job_id', false), fk('party_id', 'party.party_id', false), num('labor_minutes', false), v('labor_type', 30, false)]);
addTable('mes_execution', 'tool_usage', 'Tool usage event.', [pk('tool_usage_id'), fk('job_id', 'job.job_id', false), fk('work_unit_id', 'org_work_unit.work_unit_id'), v('tool_code', 80, false), intcol('usage_cycles'), num('usage_minutes')]);
addTable('mes_execution', 'material_consumption', 'Actual issue/consume.', [pk('material_consumption_id'), fk('job_id', 'job.job_id', false), fk('item_revision_id', 'item_revision.item_revision_id', false), v('lot_no', 120), v('serial_no', 120), num('consumed_qty', false)]);
addTable('mes_execution', 'production_completion', 'Actual completion.', [pk('production_completion_id'), fk('job_id', 'job.job_id', false), v('output_lot_no', 120), v('output_serial_no', 120), num('good_qty', false), num('reject_qty', false)]);
addTable('mes_execution', 'scrap', 'Explicit scrap event.', [pk('scrap_id'), fk('production_order_id', 'production_order.production_order_id', false), fk('job_id', 'job.job_id'), fk('item_revision_id', 'item_revision.item_revision_id', false), num('scrap_qty', false), v('reason_code', 60)]);
addTable('mes_execution', 'rework', 'Rework case.', [pk('rework_id'), fk('production_order_id', 'production_order.production_order_id', false), fk('job_id', 'job.job_id'), v('source_entity_name', 80), fk('source_entity_id', 'nonconformance.nonconformance_id'), v('rework_status', 30, false)]);
addTable('mes_execution', 'genealogy_link', 'Parent-child genealogy.', [pk('genealogy_link_id'), fk('production_order_id', 'production_order.production_order_id'), v('parent_lot_no', 120), v('child_lot_no', 120), v('link_type', 40, false), ts('linked_at', false, 'now()')]);

// Inventory
addTable('inventory_traceability', 'lot', 'Lot identity.', [pk('lot_id'), v('lot_no', 120, false), fk('item_revision_id', 'item_revision.item_revision_id', false), v('lot_status', 30, false), col('manufacture_date', 'date'), col('expiry_date', 'date')]);
addTable('inventory_traceability', 'serial', 'Serialized identity.', [pk('serial_id'), v('serial_no', 120, false), fk('item_revision_id', 'item_revision.item_revision_id', false), v('serial_status', 30, false), fk('parent_lot_id', 'lot.lot_id')]);
addTable('inventory_traceability', 'container', 'Handling unit.', [pk('container_id'), v('container_code', 80, false), v('container_type', 40, false), fk('parent_container_id', 'container.container_id'), fk('current_warehouse_id', 'org_warehouse.warehouse_id')]);
addTable('inventory_traceability', 'inventory_ledger', 'Movement ledger.', [pk('inventory_ledger_id'), fk('item_site_id', 'item_site.item_site_id', false), fk('warehouse_id', 'org_warehouse.warehouse_id'), fk('lot_id', 'lot.lot_id'), fk('serial_id', 'serial.serial_id'), v('movement_type', 40, false), num('qty_delta', false)]);
addTable('inventory_traceability', 'inventory_balance_snapshot', 'Inventory snapshot.', [pk('inventory_balance_snapshot_id'), fk('item_site_id', 'item_site.item_site_id', false), fk('warehouse_id', 'org_warehouse.warehouse_id'), fk('lot_id', 'lot.lot_id'), fk('serial_id', 'serial.serial_id'), num('on_hand_qty', false), ts('snapshot_at', false, 'now()')]);
addTable('inventory_traceability', 'location_balance', 'Current location balance.', [pk('location_balance_id'), fk('item_site_id', 'item_site.item_site_id', false), fk('warehouse_id', 'org_warehouse.warehouse_id'), fk('container_id', 'container.container_id'), fk('lot_id', 'lot.lot_id'), num('on_hand_qty', false)]);
addTable('inventory_traceability', 'cost_ledger', 'Cost event ledger.', [pk('cost_ledger_id'), v('cost_object_type', 40, false), fk('cost_object_id', 'production_order.production_order_id', false), v('cost_element_code', 40, false), num('cost_amount', false), v('currency_code', 10, false)]);
addTable('inventory_traceability', 'wip_ledger', 'WIP valuation ledger.', [pk('wip_ledger_id'), fk('production_order_id', 'production_order.production_order_id', false), fk('item_revision_id', 'item_revision.item_revision_id', false), v('stage_code', 40, false), num('quantity_delta', false), num('amount_delta')]);

// eQMS
addTable('eqms_compliance', 'inspection_plan', 'Released inspection method.', [pk('inspection_plan_id'), fk('item_revision_id', 'item_revision.item_revision_id', false), v('plan_code', 80, false), v('plan_type', 40, false), v('revision_code', 40, false)]);
addTable('eqms_compliance', 'inspection_characteristic', 'Inspection measure definition.', [pk('inspection_characteristic_id'), fk('inspection_plan_id', 'inspection_plan.inspection_plan_id', false), v('characteristic_code', 80, false), v('characteristic_name', 180, false), intcol('sequence_no', false), num('lower_spec_limit'), num('upper_spec_limit')]);
addTable('eqms_compliance', 'inspection_lot', 'Inspection work object.', [pk('inspection_lot_id'), v('inspection_lot_no', 80, false), v('source_type', 40, false), fk('source_id', 'production_order.production_order_id'), fk('item_revision_id', 'item_revision.item_revision_id'), fk('lot_id', 'lot.lot_id'), fk('serial_id', 'serial.serial_id')]);
addTable('eqms_compliance', 'inspection_result', 'Measured result.', [pk('inspection_result_id'), fk('inspection_lot_id', 'inspection_lot.inspection_lot_id', false), fk('inspection_characteristic_id', 'inspection_characteristic.inspection_characteristic_id'), v('characteristic_code', 80, false), textcol('result_value_text'), num('result_value_num')]);
addTable('eqms_compliance', 'quality_order', 'Universal quality case.', [pk('quality_order_id'), v('quality_order_no', 80, false), v('source_type', 40, false), fk('source_id', 'inspection_lot.inspection_lot_id'), v('case_type', 40, false), fk('owner_party_id', 'party.party_id')]);
addTable('eqms_compliance', 'quality_case_link', 'Typed link to source object.', [pk('quality_case_link_id'), fk('quality_order_id', 'quality_order.quality_order_id', false), v('linked_entity_name', 80, false), fk('linked_entity_id', 'production_order.production_order_id', false), v('relationship_code', 40, false)]);
addTable('eqms_compliance', 'nonconformance', 'Formal NC record.', [pk('nonconformance_id'), v('nonconformance_no', 80, false), fk('quality_order_id', 'quality_order.quality_order_id'), v('source_type', 40), fk('source_id', 'inspection_lot.inspection_lot_id'), v('disposition_code', 40)]);
addTable('eqms_compliance', 'deviation', 'Approved deviation.', [pk('deviation_id'), v('deviation_no', 80, false), v('source_type', 40), fk('source_id', 'production_order.production_order_id'), v('reason_code', 60), v('disposition_code', 40)]);
addTable('eqms_compliance', 'capa', 'Corrective/preventive action.', [pk('capa_id'), v('capa_no', 80, false), v('source_case_name', 40, false), fk('source_case_id', 'nonconformance.nonconformance_id', false), v('root_cause_method', 40), fk('owner_party_id', 'party.party_id')]);
addTable('eqms_compliance', 'complaint', 'Complaint file.', [pk('complaint_id'), v('complaint_no', 80, false), fk('customer_party_id', 'party.party_id'), fk('reported_item_revision_id', 'item_revision.item_revision_id'), fk('reported_lot_id', 'lot.lot_id'), textcol('complaint_text', false)]);
addTable('eqms_compliance', 'document', 'Controlled document.', [pk('document_id'), v('document_no', 80, false), v('document_type', 40, false), v('title_text', 180, false), fk('owner_party_id', 'party.party_id'), v('lifecycle_state', 30, false)]);
addTable('eqms_compliance', 'document_revision', 'Revision-controlled document.', [pk('document_revision_id'), fk('document_id', 'document.document_id', false), v('revision_code', 40, false), v('approval_state', 30, false), ts('effective_from', false, 'now()'), fk('electronic_signature_id', 'electronic_signature.electronic_signature_id')]);
addTable('eqms_compliance', 'change_control', 'Formal change control.', [pk('change_control_id'), v('change_control_no', 80, false), v('change_type', 40, false), fk('source_document_revision_id', 'document_revision.document_revision_id'), textcol('impact_summary'), v('approval_state', 30, false)]);
addTable('eqms_compliance', 'audit_program', 'Audit program master.', [pk('audit_program_id'), v('audit_program_code', 80, false), v('program_name', 180, false), textcol('scope_text'), fk('owner_party_id', 'party.party_id')]);
addTable('eqms_compliance', 'audit', 'Audit execution.', [pk('audit_id'), fk('audit_program_id', 'audit_program.audit_program_id'), v('audit_no', 80, false), v('audit_type', 40, false), fk('auditee_party_id', 'party.party_id'), v('status_code', 30, false)]);
addTable('eqms_compliance', 'finding', 'Audit finding.', [pk('finding_id'), fk('audit_id', 'audit.audit_id', false), v('finding_no', 80, false), v('finding_type', 40, false), v('severity_code', 30), textcol('finding_text', false)]);
addTable('eqms_compliance', 'competency', 'Competency master.', [pk('competency_id'), v('competency_code', 80, false), v('competency_name', 180, false), v('competency_type', 40, false)]);
addTable('eqms_compliance', 'training_matrix', 'Role-to-training requirement.', [pk('training_matrix_id'), v('role_code', 40, false), fk('document_id', 'document.document_id'), fk('competency_id', 'competency.competency_id'), bool('required_flag', false, 'true')]);
addTable('eqms_compliance', 'training_record', 'Person training evidence.', [pk('training_record_id'), fk('party_id', 'party.party_id', false), fk('training_matrix_id', 'training_matrix.training_matrix_id'), ts('completed_at'), ts('expiry_at'), v('status_code', 30, false)]);
addTable('eqms_compliance', 'supplier_quality_case', 'Supplier quality issue.', [pk('supplier_quality_case_id'), fk('supplier_party_id', 'party.party_id', false), v('source_type', 40, false), fk('source_id', 'purchase_order.purchase_order_id', false), v('issue_code', 40), v('status_code', 30, false)]);
addTable('eqms_compliance', 'risk_register', 'Enterprise and quality risk.', [pk('risk_register_id'), v('risk_code', 80, false), v('risk_domain', 40, false), v('source_entity_name', 80), fk('source_entity_id', 'change_control.change_control_id'), v('severity_code', 30)]);
addTable('eqms_compliance', 'audit_trail', 'Immutable audit ledger.', [pk('audit_trail_id'), v('entity_name', 80, false), fk('entity_id', 'document.document_id', false), v('action_code', 40, false), jsonb('old_payload'), jsonb('new_payload'), fk('acted_by_party_id', 'party.party_id')]);

const schema = {
  _meta: {
    id: 'canonical_erp_mes_eqms_7layer_core',
    name: 'Canonical ERP+MES+eQMS 7-Layer Core',
    version: '1.0',
    profile: 'canonical_architecture',
    generated_at: new Date().toISOString(),
    source: 'generator-canonical-design',
    description: 'Execution-grade canonical schema map aligned to ISA-95, SAP, Oracle, Dynamics, and regulated eQMS controls.'
  },
  enums: [],
  tables: tables,
  relations: buildRelations(),
  groups: buildGroups(),
  notes: buildNotes()
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
console.log('Wrote ' + outputPath);
console.log('tables=' + tables.length + ' relations=' + schema.relations.length);
