import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const portalRoot = path.resolve(__dirname, '..', '..');
const registryDir = path.join(portalRoot, 'qms-data', 'registry');
const generatedAt = new Date().toISOString();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toArrayMap(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function loadDataFields() {
  const index = readJson(path.join(registryDir, 'data-fields.json'));
  const parts = index?.parts || index?._meta?.parts || [];
  if (!Array.isArray(parts) || !parts.length) return index;
  const merged = { ...index };
  for (const part of parts) {
    const file = String(part?.file || '');
    if (!file) continue;
    const payload = readJson(path.join(registryDir, file));
    for (const [key, value] of Object.entries(payload)) {
      if (key === '_meta') continue;
      merged[key] = value;
    }
  }
  return merged;
}

function endpointKindMeta(kind) {
  switch (kind) {
    case 'list':
      return { method: 'GET', handler: 'listRecords', kind: 'list' };
    case 'detail':
      return { method: 'GET', handler: 'getDetail', kind: 'detail' };
    case 'create':
      return { method: 'POST', handler: 'createRecord', kind: 'create' };
    case 'update':
      return { method: 'PUT', handler: 'updateRecord', kind: 'update' };
    case 'delete':
      return { method: 'DELETE', handler: 'deleteRecord', kind: 'delete' };
    case 'transition':
      return { method: 'POST', handler: 'transitionRecord', kind: 'transition' };
    default:
      return { method: 'GET', handler: 'listRecords', kind };
  }
}

function endpointLabel(table, kind) {
  const base = table?.label || table?.labelEn || 'Bản ghi';
  const labels = {
    list: `Danh sách ${base}`,
    detail: `Chi tiết ${base}`,
    create: `Tạo ${base}`,
    update: `Cập nhật ${base}`,
    delete: `Xóa ${base}`,
    transition: `Chuyển trạng thái ${base}`,
  };
  return labels[kind] || `${base} ${kind}`;
}

function endpointLabelEn(table, kind) {
  const base = table?.labelEn || table?.label || 'Record';
  const labels = {
    list: `${base} List`,
    detail: `${base} Detail`,
    create: `Create ${base}`,
    update: `Update ${base}`,
    delete: `Delete ${base}`,
    transition: `${base} Transition`,
  };
  return labels[kind] || `${base} ${kind}`;
}

function trimFieldForPack(field) {
  return {
    key: field.key,
    label: field.label,
    labelEn: field.labelEn,
    type: field.type,
    required: !!field.required,
    filterable: !!field.filterable,
    sortable: !!field.sortable,
    group: field.group || 'general',
    source: field.source || 'db_column',
    dbTable: field.dbTable || null,
    dbColumn: field.dbColumn || null,
    constraints: field.constraints || {},
  };
}

function uniqueFields(fields) {
  const seen = new Set();
  return fields.filter((field) => {
    const key = String(field?.key || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildEndpointCatalog(tableRegistry, domainArchitecture, dataFields) {
  const endpoints = {};
  const domains = domainArchitecture.domains || {};
  for (const [action, fields] of Object.entries(dataFields)) {
    if (action === '_meta' || !Array.isArray(fields)) continue;
    const parts = action.split('.');
    if (parts.length !== 3) continue;
    const [domain, tableName, kind] = parts;
    const table = tableRegistry.tables?.[tableName];
    const domainMeta = domains[domain] || tableRegistry.domains?.[domain] || {};
    if (!table) continue;
    const meta = endpointKindMeta(kind);
    const primaryKey = Array.isArray(table.primaryKey) ? table.primaryKey[0] : table.primaryKey;
    const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(meta.method);
    endpoints[action] = {
      action,
      label: endpointLabel(table, kind),
      labelEn: endpointLabelEn(table, kind),
      module: domainMeta.label || domain,
      moduleEn: domainMeta.labelEn || domainMeta.label || domain,
      method: meta.method,
      controller: 'GenericCrudController',
      handler: meta.handler,
      source: 'table-registry+data-fields',
      kind: meta.kind,
      domain,
      entity: tableName,
      primary_key: primaryKey || null,
      field_count: fields.length,
      field_packs: [`${tableName}_header`, `${tableName}_list_columns`, `${tableName}_filters`, `${tableName}_create_form`, `${tableName}_search`],
      status_refs: table.statusSet ? [table.statusSet] : [],
      security: {
        auth_required: true,
        csrf_required: requiresCsrf,
        admin_only: false,
        permission_keys: [],
        dynamic_permission: true,
      },
      request: {
        query_params: meta.method === 'GET' ? ['domain', 'table'] : [],
        body_fields: meta.method === 'GET' ? [] : fields.filter((field) => field.dbColumn).map((field) => field.key),
        required_body_fields: meta.method === 'GET' ? [] : fields.filter((field) => field.required).map((field) => field.key),
      },
      response: {
        collection_key: kind === 'list' ? 'records' : null,
        response_fields: fields.map((field) => field.key),
        paginated: kind === 'list',
      },
    };
  }

  return {
    _meta: {
      version: '5.0',
      description: 'Registry-backed endpoint catalog generated from table-registry and split data-fields.',
      generatedAt,
      endpointCount: Object.keys(endpoints).length,
    },
    endpoints,
  };
}

function buildDomainFieldPacks(tableRegistry, dataFields) {
  const packs = {};
  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    const prefix = `${table.domain}.${tableName}`;
    const listFields = uniqueFields((dataFields[`${prefix}.list`] || []).map(trimFieldForPack));
    const detailFields = uniqueFields((dataFields[`${prefix}.detail`] || []).map(trimFieldForPack));
    const createFields = uniqueFields((dataFields[`${prefix}.create`] || []).map(trimFieldForPack));
    const updateFields = uniqueFields((dataFields[`${prefix}.update`] || []).map(trimFieldForPack));
    const transitionFields = uniqueFields((dataFields[`${prefix}.transition`] || []).map(trimFieldForPack));

    packs[`${tableName}_header`] = detailFields.slice(0, 12);
    packs[`${tableName}_list_columns`] = listFields.slice(0, 16);
    packs[`${tableName}_filters`] = uniqueFields(listFields.filter((field) => field.filterable).slice(0, 12));
    packs[`${tableName}_create_form`] = uniqueFields([...createFields, ...updateFields]).slice(0, 20);
    packs[`${tableName}_search`] = uniqueFields(listFields.filter((field) => /identification|general|status/.test(String(field.group || ''))).slice(0, 10));
    packs[`${tableName}_status`] = uniqueFields(transitionFields.length ? transitionFields : listFields.filter((field) => /status/i.test(field.key)).slice(0, 6));
  }

  return {
    _meta: {
      version: '5.0',
      description: 'Generated Module Builder field packs aligned to registry-backed CRUD endpoints.',
      generatedAt,
      packCount: Object.keys(packs).length,
    },
    packs,
  };
}

function buildRelationMap(tableRegistry) {
  const entities = {};
  const edges = [];

  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    const primaryKey = Array.isArray(table.primaryKey) ? table.primaryKey[0] : table.primaryKey;
    entities[tableName] = {
      entity: tableName,
      label: table.label,
      labelEn: table.labelEn,
      primaryKey: primaryKey || null,
      domain: table.domain,
      fields: Object.keys(table.columns || {}),
      digitalThread: !!(table.digitalThread && ((table.digitalThread.upstream || []).length || (table.digitalThread.downstream || []).length)),
    };

    for (const fk of table.foreignKeys || []) {
      const [targetTable, targetField] = String(fk.references || '').split('.');
      if (!targetTable || !targetField) continue;
      const targetMeta = tableRegistry.tables?.[targetTable] || {};
      edges.push({
        from: { entity: tableName, field: fk.column },
        to: { entity: targetTable, field: targetField },
        type: 'many_to_one',
        label: `${table.label} → ${targetMeta.label || targetTable}`,
        labelEn: `${table.labelEn} → ${targetMeta.labelEn || targetTable}`,
        domain: `${table.domain} -> ${targetMeta.domain || 'unknown'}`,
        digitalThread: true,
        cascadeActions: [],
      });
    }
  }

  return {
    _meta: {
      version: '5.0',
      description: 'Relation map generated directly from table-registry foreign keys.',
      generatedAt,
      edgeCount: edges.length,
    },
    entities,
    edges,
    relations: edges,
  };
}

function buildManifest(endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, dataFields) {
  const endpointCount = Object.keys(endpointCatalog.endpoints || {}).length;
  const packCount = Object.keys(packs.packs || {}).length;
  const relationCount = (relationMap.edges || relationMap.relations || []).length;
  const workflowCount = Object.keys(workflowLibrary.workflows || workflowLibrary).filter((key) => key !== '_meta').length;
  const statusCount = Object.keys(statusOptions).filter((key) => key !== '_meta').length;
  const ruleCount = (validationRules.rules || validationRules).length;
  const formulaCount = Object.keys(formulas).filter((key) => key !== '_meta').length;
  const uniqueFieldKeys = new Set();
  let fieldDefinitions = 0;

  for (const [endpoint, fields] of Object.entries(dataFields)) {
    if (endpoint === '_meta' || !Array.isArray(fields)) continue;
    for (const field of fields) {
      fieldDefinitions += 1;
      if (field && field.key) uniqueFieldKeys.add(field.key);
    }
  }

  return {
    _meta: {
      version: '5.0',
      description: 'Registry manifest and coverage index for the registry-backed runtime.',
      generatedAt,
    },
    coverage: {
      router_actions: endpointCount,
      field_registry_actions: endpointCount,
      field_definitions: fieldDefinitions,
      unique_field_keys: uniqueFieldKeys.size,
      status_sets: statusCount,
      workflow_count: workflowCount,
      relation_edges: relationCount,
      validation_rules: ruleCount,
      formula_count: formulaCount,
      domain_pack_count: packCount,
    },
    assets: {
      'endpoint-catalog.json': { kind: 'endpoint-catalog', records: endpointCount },
      'domain-field-packs.json': { kind: 'pack-library', records: packCount },
      'relation-map.json': { kind: 'relation-map', records: relationCount },
      'registry-manifest.json': { kind: 'manifest', records: 1 },
      'registry-quality-report.json': { kind: 'quality-report', records: 1 },
    },
  };
}

function buildQualityReport(tableRegistry, dataFields, endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions) {
  const tableNames = Object.keys(tableRegistry.tables || {});
  const endpointKeys = Object.keys(endpointCatalog.endpoints || {});
  const packKeys = Object.keys(packs.packs || {});
  const relationEdges = relationMap.edges || relationMap.relations || [];
  const validationList = validationRules.rules || validationRules || [];
  const workflowMap = workflowLibrary.workflows || workflowLibrary || {};
  const formulaKeys = Object.keys(formulas).filter((key) => key !== '_meta');
  const statusKeys = Object.keys(statusOptions || {}).filter((key) => key !== '_meta');
  const workflowKeys = Object.keys(workflowMap).filter((key) => key !== '_meta');

  const tableFieldCoverage = tableNames.filter((tableName) => {
    const domain = tableRegistry.tables[tableName].domain;
    return ['list', 'detail', 'create', 'update'].every((kind) => Array.isArray(dataFields[`${domain}.${tableName}.${kind}`]));
  });

  const tablePackCoverage = tableNames.filter((tableName) =>
    packKeys.some((packKey) => packKey.startsWith(`${tableName}_`))
  );

  const tableEndpointCoverage = tableNames.filter((tableName) => {
    const domain = tableRegistry.tables[tableName].domain;
    return endpointKeys.includes(`${domain}.${tableName}.list`)
      && endpointKeys.includes(`${domain}.${tableName}.detail`)
      && endpointKeys.includes(`${domain}.${tableName}.create`)
      && endpointKeys.includes(`${domain}.${tableName}.update`);
  });

  const fkCount = tableNames.reduce((sum, tableName) => sum + (tableRegistry.tables[tableName].foreignKeys || []).length, 0);
  const fieldContextCount = Object.entries(dataFields).reduce((sum, [key, fields]) => (
    key === '_meta' || !Array.isArray(fields) ? sum : sum + fields.length
  ), 0);
  const workflowCoverage = tableNames.filter((tableName) => {
    const table = tableRegistry.tables[tableName];
    return !!table.supportTable || !!(table.workflowId && workflowKeys.includes(table.workflowId));
  });
  const statusTables = tableNames.filter((tableName) => !!tableRegistry.tables[tableName].statusColumn);
  const statusCoverage = statusTables.filter((tableName) => {
    const statusSet = tableRegistry.tables[tableName].statusSet;
    return !!statusSet && statusKeys.includes(statusSet);
  });
  const domainWorkflowCoverage = Object.keys((tableRegistry.domains || {})).filter((domain) =>
    workflowKeys.some((workflowId) => (workflowMap[workflowId]?.domain || '') === domain)
  );
  const formulaReferenceCount = formulaKeys.filter((formulaId) => Array.isArray(formulas[formulaId]?.referencedBy) && formulas[formulaId].referencedBy.length > 0).length;

  const checks = [
    { id: 'tables_have_fields', passed: tableFieldCoverage.length === tableNames.length, actual: tableFieldCoverage.length, target: tableNames.length },
    { id: 'tables_have_endpoint_catalog', passed: tableEndpointCoverage.length === tableNames.length, actual: tableEndpointCoverage.length, target: tableNames.length },
    { id: 'tables_have_pack', passed: tablePackCoverage.length === tableNames.length, actual: tablePackCoverage.length, target: tableNames.length },
    { id: 'fk_edges_covered', passed: relationEdges.length === fkCount, actual: relationEdges.length, target: fkCount },
    { id: 'workflow_coverage', passed: workflowCoverage.length === tableNames.length, actual: workflowCoverage.length, target: tableNames.length },
    { id: 'status_coverage', passed: statusCoverage.length === statusTables.length, actual: statusCoverage.length, target: statusTables.length },
    { id: 'workflow_count_target', passed: workflowKeys.length >= 60, actual: workflowKeys.length, target: 60 },
    { id: 'domain_workflow_target', passed: domainWorkflowCoverage.length === Object.keys(tableRegistry.domains || {}).length, actual: domainWorkflowCoverage.length, target: Object.keys(tableRegistry.domains || {}).length },
    { id: 'status_set_target', passed: statusKeys.length >= 180, actual: statusKeys.length, target: 180 },
    { id: 'validation_rule_target', passed: validationList.length >= 5000, actual: validationList.length, target: 5000 },
    { id: 'formula_target', passed: formulaKeys.length >= 200, actual: formulaKeys.length, target: 200 },
    { id: 'formula_reference_target', passed: formulaReferenceCount === formulaKeys.length, actual: formulaReferenceCount, target: formulaKeys.length },
  ];

  return {
    _meta: {
      version: '5.0',
      description: 'Internal quality report for registry-backed Module Builder assets.',
      generatedAt,
    },
    summary: {
      endpoint_count: endpointKeys.length,
      pack_count: packKeys.length,
      relation_edge_count: relationEdges.length,
      workflow_count: workflowKeys.length,
      status_set_count: statusKeys.length,
      validation_rule_count: validationList.length,
      formula_count: formulaKeys.length,
      formula_reference_count: formulaReferenceCount,
      field_context_count: fieldContextCount,
    },
    checks,
    all_passed: checks.every((check) => check.passed),
  };
}

function main() {
  const tableRegistry = readJson(path.join(registryDir, 'table-registry.json'));
  const domainArchitecture = readJson(path.join(registryDir, 'domain-architecture.json'));
  const dataFields = loadDataFields();
  const workflowLibrary = readJson(path.join(registryDir, 'workflow-library.json'));
  const validationRules = readJson(path.join(registryDir, 'validation-rules.json'));
  const formulas = readJson(path.join(registryDir, 'computed-formulas.json'));
  const statusOptions = readJson(path.join(registryDir, 'status-options.json'));

  const endpointCatalog = buildEndpointCatalog(tableRegistry, domainArchitecture, dataFields);
  const packs = buildDomainFieldPacks(tableRegistry, dataFields);
  const relationMap = buildRelationMap(tableRegistry);
  const manifest = buildManifest(endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, dataFields);
  const qualityReport = buildQualityReport(tableRegistry, dataFields, endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions);

  writeJson(path.join(registryDir, 'endpoint-catalog.json'), endpointCatalog);
  writeJson(path.join(registryDir, 'domain-field-packs.json'), packs);
  writeJson(path.join(registryDir, 'relation-map.json'), relationMap);
  writeJson(path.join(registryDir, 'registry-manifest.json'), manifest);
  writeJson(path.join(registryDir, 'registry-quality-report.json'), qualityReport);

  console.log(JSON.stringify({
    endpointCount: Object.keys(endpointCatalog.endpoints).length,
    packCount: Object.keys(packs.packs).length,
    relationCount: relationMap.edges.length,
    qualityChecksPassed: qualityReport.all_passed,
  }, null, 2));
}

main();
