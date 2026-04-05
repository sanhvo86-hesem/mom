import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const portalRoot = path.resolve(__dirname, '..', '..');
const registryDir = path.join(portalRoot, 'qms-data', 'registry');
const generatedAt = new Date().toISOString();
const SYSTEM_MANAGED_FIELDS = new Set([
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'recorded_at',
  'row_version',
  'payload_schema_version',
  'source_record_id',
  'source_system',
]);

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
  delete merged.parts;
  delete merged.split;
  return merged;
}

function primaryKeyMeta(table) {
  const columnNames = Object.keys(table?.columns || {});
  const resolveField = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (columnNames.includes(raw)) return raw;
    const tokens = Array.from(raw.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)).map((match) => String(match[0] || '').trim());
    return tokens.find((token) => columnNames.includes(token)) || '';
  };
  const raw = Array.isArray(table?.primaryKey) ? table.primaryKey : [table?.primaryKey];
  const fields = Array.from(new Set(raw.map(resolveField).filter(Boolean)));
  if (fields.length === 1) {
    return { mode: 'scalar', fields, key: fields[0] };
  }
  return { mode: fields.length ? 'composite' : 'missing', fields, key: null };
}

function supportedEndpointKinds(table) {
  const pk = primaryKeyMeta(table);
  const kinds = ['list', 'create'];
  if (pk.mode !== 'missing') {
    kinds.push('detail', 'update', 'delete');
    if (table?.statusColumn) {
      kinds.push('transition');
    }
  }
  return kinds;
}

function externalIdentityFields(pk) {
  return pk.mode === 'scalar' ? ['id'] : pk.fields;
}

function identityFieldMap(pk) {
  if (pk.mode === 'scalar' && pk.key) {
    return { id: pk.key, [pk.key]: pk.key };
  }
  return Object.fromEntries(pk.fields.map((field) => [field, field]));
}

function identityQueryParams(pk) {
  return ['domain', 'table', ...externalIdentityFields(pk)];
}

function identityPathSegment(pk) {
  return externalIdentityFields(pk).map((field) => `{${field}}`).join('/');
}

function supportedEndpointSet(table) {
  return new Set(supportedEndpointKinds(table));
}

function isSystemManagedFieldKey(fieldKey) {
  return SYSTEM_MANAGED_FIELDS.has(String(fieldKey || '').trim());
}

function filterableFieldKeys(fields) {
  return uniqueFields((fields || []).filter((field) => field && field.filterable).map(trimFieldForPack))
    .map((field) => field.key);
}

function sortableFieldKeys(fields) {
  return uniqueFields((fields || []).filter((field) => field && field.sortable).map(trimFieldForPack))
    .map((field) => field.key);
}

function searchableFieldKeys(fields) {
  return uniqueFields((fields || []).filter((field) => (
    field && /identification|general|status/.test(String(field.group || ''))
  )).map(trimFieldForPack))
    .map((field) => field.key);
}

function transitionTargets(statusOptions, statusSet) {
  return (statusOptions?.[statusSet]?.options || [])
    .map((option) => String(option?.value || '').trim())
    .filter(Boolean);
}

function orgScopeFields(table) {
  return ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id']
    .filter((field) => table?.columns?.[field]);
}

function hasOptimisticConcurrency(table) {
  return !!table?.columns?.row_version;
}

function optimisticConcurrencyContract(table, required = false) {
  const enabled = hasOptimisticConcurrency(table);
  return {
    enabled,
    required: enabled ? required : false,
    mode: enabled ? 'optimistic' : null,
    field: enabled ? 'row_version' : null,
    accepted_headers: enabled ? ['If-Match', 'X-Row-Version'] : [],
    accepted_query_params: enabled ? ['expected_row_version', 'row_version', 'version'] : [],
    accepted_body_fields: enabled ? ['expected_row_version', 'row_version', 'version', 'expectedVersion', 'etag'] : [],
  };
}

function scopeContract(table, kind) {
  const fields = orgScopeFields(table);
  return {
    fields,
    enforced_if_available: fields.length > 0,
    auto_populated_on_create: kind === 'create' && fields.length > 0,
    mutable_for_privileged_only: ['create', 'update'].includes(kind) && fields.length > 0,
  };
}

function requestContract(kind, table, fields, statusOptions) {
  const pk = primaryKeyMeta(table);
  const identityFields = externalIdentityFields(pk);
  const canonicalIdentityFields = pk.fields;
  const identityMap = identityFieldMap(pk);
  const filterParams = kind === 'list' ? filterableFieldKeys(fields) : [];
  const transitionStatusTargets = transitionTargets(statusOptions, String(table?.statusSet || ''));
  const paramFields = uniqueFields((fields || []).filter((field) => field?.source === 'param').map(trimFieldForPack)).map((field) => field.key);
  const editableDbFields = uniqueFields((fields || []).filter((field) => field?.dbColumn && !isSystemManagedFieldKey(field.key)).map(trimFieldForPack))
    .filter((field) => !(kind === 'update' && canonicalIdentityFields.includes(field.key)))
    .filter((field) => !(kind === 'update' && field.key === String(table?.statusColumn || '')));
  const concurrency = optimisticConcurrencyContract(table, ['update', 'delete', 'transition'].includes(kind));
  const scope = scopeContract(table, kind);

  if (kind === 'list') {
    return {
      query_params: ['domain', 'table', 'search', 'q', 'sort', 'direction', 'limit', 'offset', ...(table?.statusColumn ? ['status'] : [])],
      filter_params: filterParams,
      body_fields: [],
      required_body_fields: [],
      identity_fields: [],
      body_mode: 'none',
      optimistic_concurrency: optimisticConcurrencyContract(table, false),
      org_scope: scope,
    };
  }

  if (kind === 'detail') {
    return {
      query_params: identityQueryParams(pk),
      filter_params: [],
      body_fields: [],
      required_body_fields: [],
      identity_fields: identityFields,
      canonical_identity_fields: canonicalIdentityFields,
      identity_field_map: identityMap,
      body_mode: 'none',
      optimistic_concurrency: optimisticConcurrencyContract(table, false),
      org_scope: scope,
    };
  }

  if (kind === 'delete') {
    return {
      query_params: identityQueryParams(pk),
      filter_params: [],
      body_fields: uniqueFields([...identityFields.map((key) => ({ key })), ...paramFields.map((key) => ({ key }))]).map((field) => field.key),
      required_body_fields: [...identityFields, ...(paramFields.includes('confirm_delete') ? ['confirm_delete'] : [])],
      identity_fields: identityFields,
      canonical_identity_fields: canonicalIdentityFields,
      identity_field_map: identityMap,
      body_mode: 'root',
      optimistic_concurrency: concurrency,
      org_scope: scope,
    };
  }

  if (kind === 'transition') {
    const transitionAliases = uniqueFields([
      { key: 'to_status' },
      { key: 'to' },
      { key: 'status' },
      { key: 'toStatus' },
      ...paramFields.map((key) => ({ key })),
    ]).map((field) => field.key);
    return {
      query_params: identityQueryParams(pk),
      filter_params: [],
      body_fields: uniqueFields([...identityFields.map((key) => ({ key })), ...transitionAliases.map((key) => ({ key }))]).map((field) => field.key),
      required_body_fields: identityFields,
      required_any_of: [['to_status', 'to', 'status', 'toStatus']],
      accepted_body_aliases: { target_status: ['to_status', 'to', 'status', 'toStatus'] },
      canonical_body_fields: { target_status: paramFields.includes('to_status') ? 'to_status' : 'to' },
      identity_fields: identityFields,
      canonical_identity_fields: canonicalIdentityFields,
      identity_field_map: identityMap,
      body_mode: 'root',
      transition_status_values: transitionStatusTargets,
      optimistic_concurrency: concurrency,
      org_scope: scope,
    };
  }

  const dbFields = editableDbFields.map((field) => field.key);
  const requiredBodyFields = kind === 'update' ? identityFields : editableDbFields.filter((field) => field.required).map((field) => field.key);

  return {
    query_params: kind === 'update' ? identityQueryParams(pk) : [],
    filter_params: [],
    body_fields: kind === 'update' ? [...identityFields, ...dbFields] : dbFields,
    required_body_fields: requiredBodyFields,
    identity_fields: kind === 'update' ? identityFields : [],
    canonical_identity_fields: kind === 'update' ? canonicalIdentityFields : [],
    identity_field_map: kind === 'update' ? identityMap : {},
    body_mode: 'root_or_data_wrapper',
    optimistic_concurrency: kind === 'update' ? concurrency : optimisticConcurrencyContract(table, false),
    org_scope: scope,
  };
}

function responseContract(kind, table, fields) {
  const pk = primaryKeyMeta(table);
  return {
    collection_key: kind === 'list' ? 'records' : null,
    record_key: kind === 'list' ? null : 'record',
    response_fields: fields.map((field) => field.key),
    paginated: kind === 'list',
    pagination_fields: kind === 'list' ? ['total', 'offset', 'limit', 'has_more'] : [],
    primary_key: pk.key,
    primary_key_fields: pk.fields,
    record_addressing: pk.mode,
    optimistic_concurrency: {
      enabled: hasOptimisticConcurrency(table),
      field: hasOptimisticConcurrency(table) ? 'row_version' : null,
    },
    org_scope_fields: orgScopeFields(table),
  };
}

function workflowContract(tableName, table, workflowLibrary) {
  const workflowMap = workflowLibrary?.workflows || workflowLibrary || {};
  const workflow = workflowMap[String(table?.workflowId || '')] || null;
  const isWorkflowOwner = !workflow?.primaryTable || workflow.primaryTable === tableName;

  return {
    workflow_id: table?.workflowId || null,
    state_field: table?.statusColumn || null,
    status_set: table?.statusSet || null,
    workflow_state_field: workflow?.stateField || null,
    workflow_status_set: workflow?.statusSet || null,
    workflow_primary_table: workflow?.primaryTable || null,
    table_is_workflow_owner: isWorkflowOwner,
    status_set_aligned: !workflow || !workflow.statusSet || !isWorkflowOwner || workflow.statusSet === table?.statusSet,
    state_field_aligned: !workflow || !workflow.stateField || !isWorkflowOwner || workflow.stateField === table?.statusColumn,
  };
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

function endpointLabelVi(table, kind) {
  const base = table?.label || table?.labelEn || 'Ban ghi';
  const labels = {
    list: `Danh sach ${base}`,
    detail: `Chi tiet ${base}`,
    create: `Tao ${base}`,
    update: `Cap nhat ${base}`,
    delete: `Xoa ${base}`,
    transition: `Chuyen trang thai ${base}`,
  };
  return labels[kind] || `${base} ${kind}`;
}

function displayFieldForTable(table) {
  const columns = Object.keys(table?.columns || {});
  const candidates = [
    'display_name',
    'full_name',
    'name',
    'title',
    'code',
    'number',
    ...columns.filter((column) => /(?:^|_)name$/.test(column)),
    ...columns.filter((column) => /(?:^|_)title$/.test(column)),
    ...columns.filter((column) => /(?:^|_)code$/.test(column)),
    ...columns.filter((column) => /(?:^|_)number$/.test(column)),
  ];
  return candidates.find((column) => columns.includes(column)) || columns[0] || null;
}

function lookupMetaForField(tableRegistry, field) {
  const tableName = String(field?.dbTable || '').trim();
  const columnName = String(field?.dbColumn || '').trim();
  const columnMeta = tableRegistry?.tables?.[tableName]?.columns?.[columnName];
  const reference = String(columnMeta?.references || '').trim();
  if (!tableName || !columnName || !reference.includes('.')) {
    return {};
  }

  const [refTable, refColumn] = reference.split('.');
  const targetTable = tableRegistry?.tables?.[refTable] || {};
  const targetDomain = String(targetTable?.domain || '').trim();
  const displayField = displayFieldForTable(targetTable);

  return {
    relationRef: `${tableName}.${columnName}->${refTable}.${refColumn}`,
    optionsRef: targetDomain ? `${targetDomain}.${refTable}.list` : null,
    lookup: {
      entity: refTable,
      domain: targetDomain || null,
      endpoint: targetDomain ? `${targetDomain}.${refTable}.list` : null,
      labelField: displayField,
      valueField: refColumn || null,
      searchFields: displayField ? [displayField] : [],
    },
  };
}

function trimFieldForPack(field, tableRegistry = null) {
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
    ...lookupMetaForField(tableRegistry, field),
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

function buildEndpointCatalog(tableRegistry, domainArchitecture, dataFields, workflowLibrary, statusOptions) {
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
    if (!supportedEndpointSet(table).has(kind)) continue;
    const meta = endpointKindMeta(kind);
    const pk = primaryKeyMeta(table);
    const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(meta.method);
    const listFields = uniqueFields((dataFields[`${domain}.${tableName}.list`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
    const detailFields = uniqueFields((dataFields[`${domain}.${tableName}.detail`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
    const contract = requestContract(kind, table, fields, statusOptions);
    endpoints[action] = {
      action,
      label: endpointLabelVi(table, kind),
      labelEn: endpointLabelEn(table, kind),
      module: domainMeta.label || domain,
      moduleEn: domainMeta.labelEn || domainMeta.label || domain,
      method: meta.method,
      path: kind === 'list' || kind === 'create'
        ? `/api/runtime/${domain}/${tableName}`
        : (kind === 'transition'
          ? `/api/runtime/${domain}/${tableName}/${identityPathSegment(pk)}/transition`
          : `/api/runtime/${domain}/${tableName}/${identityPathSegment(pk)}`),
      controller: 'GenericCrudController',
      handler: meta.handler,
      source: 'table-registry+data-fields',
      kind: meta.kind,
      domain,
      entity: tableName,
      primary_key: pk.key,
      record_addressing: pk.mode,
      primary_key_fields: pk.fields,
      field_count: fields.length,
      field_packs: [`${tableName}_header`, `${tableName}_list_columns`, `${tableName}_filters`, `${tableName}_create_form`, `${tableName}_search`],
      status_refs: table.statusSet ? [table.statusSet] : [],
      workflow: workflowContract(tableName, table, workflowLibrary),
      security: {
        auth_required: true,
        csrf_required: requiresCsrf,
        admin_only: false,
        permission_keys: [kind === 'list' || kind === 'detail' ? `${domain}.${tableName}.read` : `${domain}.${tableName}.${kind}`],
        dynamic_permission: true,
      },
      capabilities: {
        searchable_fields: kind === 'list' ? searchableFieldKeys(listFields) : [],
        sortable_fields: kind === 'list' ? sortableFieldKeys(listFields) : [],
        filterable_fields: kind === 'list' ? filterableFieldKeys(listFields) : [],
        transition_targets: kind === 'transition' ? contract.transition_status_values || [] : [],
      },
      request: contract,
      response: responseContract(kind, table, ['create', 'update', 'delete', 'transition'].includes(kind) && detailFields.length ? detailFields : fields),
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
    const listFields = uniqueFields((dataFields[`${prefix}.list`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
    const detailFields = uniqueFields((dataFields[`${prefix}.detail`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
    const createFields = uniqueFields((dataFields[`${prefix}.create`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
    const updateFields = uniqueFields((dataFields[`${prefix}.update`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
    const transitionFields = uniqueFields((dataFields[`${prefix}.transition`] || []).map((field) => trimFieldForPack(field, tableRegistry)));

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
    const pk = primaryKeyMeta(table);
    const columns = table.columns || {};
    const jsonColumns = Object.entries(columns).filter(([, meta]) => /JSONB?/i.test(String(meta?.type || '')));
    const governanceFields = ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id', 'source_system', 'source_record_id', 'row_version', 'payload_schema_version'];
    const missingGovernance = governanceFields.filter((field) => !columns[field]);
    entities[tableName] = {
      entity: tableName,
      label: table.label,
      labelEn: table.labelEn,
      primaryKey: pk.key,
      recordAddressing: pk.mode,
      primaryKeyFields: pk.fields,
      domain: table.domain,
      fields: Object.keys(columns),
      statusField: table.statusColumn || null,
      statusSet: table.statusSet || null,
      workflowId: table.workflowId || null,
      supportTable: !!table.supportTable,
      jsonbFieldCount: jsonColumns.length,
      jsonbFields: jsonColumns.map(([field]) => field),
      governanceComplete: missingGovernance.length === 0,
      governanceMissing: missingGovernance,
      digitalThread: !!(table.digitalThread && ((table.digitalThread.upstream || []).length || (table.digitalThread.downstream || []).length)),
    };

    for (const fk of table.foreignKeys || []) {
      const [targetTable, targetField] = String(fk.references || '').split('.');
      if (!targetTable || !targetField) continue;
      const targetMeta = tableRegistry.tables?.[targetTable] || {};
      const targetDisplayField = displayFieldForTable(targetMeta);
      const sourceColumnMeta = columns?.[fk.column] || {};
      edges.push({
        id: `rel_${tableName}_${String(fk.column || '').replace(/[^a-z0-9_]+/gi, '_')}_${targetTable}_${targetField}`.toLowerCase(),
        from: { entity: tableName, field: fk.column },
        to: { entity: targetTable, field: targetField },
        type: 'many_to_one',
        cardinality: 'many_to_one',
        constraintName: fk.name || fk.constraintName || `fk_${tableName}_${fk.column}`,
        nullable: !sourceColumnMeta.required,
        label: `${table.label} → ${targetMeta.label || targetTable}`,
        labelEn: `${table.labelEn} → ${targetMeta.labelEn || targetTable}`,
        domain: `${table.domain} -> ${targetMeta.domain || 'unknown'}`,
        fromDomain: table.domain,
        toDomain: targetMeta.domain || null,
        sourceColumn: fk.column,
        targetColumn: targetField,
        lookupEntity: targetTable,
        lookupEndpoint: targetMeta.domain ? `${targetMeta.domain}.${targetTable}.list` : null,
        displayField: targetDisplayField,
        valueField: targetField,
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

function buildManifest(endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, fieldTypes, dataFields) {
  const endpointCount = Object.keys(endpointCatalog.endpoints || {}).length;
  const packCount = Object.keys(packs.packs || {}).length;
  const relationCount = (relationMap.edges || relationMap.relations || []).length;
  const workflowCount = Object.keys(workflowLibrary.workflows || workflowLibrary).filter((key) => key !== '_meta').length;
  const statusCount = Object.keys(statusOptions).filter((key) => key !== '_meta').length;
  const fieldTypeCount = Object.keys(fieldTypes).filter((key) => key !== '_meta').length;
  const ruleCount = (validationRules.rules || validationRules).length;
  const formulaCount = Object.keys(formulas).filter((key) => key !== '_meta').length;
  const fieldRegistryActionCount = Object.keys(dataFields).filter((key) => key !== '_meta' && Array.isArray(dataFields[key])).length;
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
      field_registry_actions: fieldRegistryActionCount,
      field_definitions: fieldDefinitions,
      unique_field_keys: uniqueFieldKeys.size,
      status_sets: statusCount,
      workflow_count: workflowCount,
      relation_edges: relationCount,
      validation_rules: ruleCount,
      formula_count: formulaCount,
      domain_pack_count: packCount,
      scalar_record_endpoints: Object.values(endpointCatalog.endpoints || {}).filter((endpoint) => endpoint.record_addressing === 'scalar').length,
    },
    assets: {
      'data-fields-index.json': { kind: 'field-registry-index', records: fieldRegistryActionCount },
      'endpoint-catalog.json': { kind: 'endpoint-catalog', records: endpointCount },
      'domain-field-packs.json': { kind: 'pack-library', records: packCount },
      'relation-map.json': { kind: 'relation-map', records: relationCount },
      'workflow-library.json': { kind: 'workflow-library', records: workflowCount },
      'status-options.json': { kind: 'status-library', records: statusCount },
      'field-types.json': { kind: 'field-types', records: fieldTypeCount },
      'validation-rules.json': { kind: 'validation-rules', records: ruleCount },
      'computed-formulas.json': { kind: 'formula-library', records: formulaCount },
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
    return supportedEndpointKinds(tableRegistry.tables[tableName]).every((kind) => Array.isArray(dataFields[`${domain}.${tableName}.${kind}`]));
  });

  const tablePackCoverage = tableNames.filter((tableName) =>
    packKeys.some((packKey) => packKey.startsWith(`${tableName}_`))
  );

  const tableEndpointCoverage = tableNames.filter((tableName) => {
    const domain = tableRegistry.tables[tableName].domain;
    return supportedEndpointKinds(tableRegistry.tables[tableName]).every((kind) =>
      endpointKeys.includes(`${domain}.${tableName}.${kind}`)
    );
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
  const unsupportedRecordEndpoints = [];
  const contractIssues = [];
  const workflowAlignmentIssues = [];
  const scalarPkTables = tableNames.filter((tableName) => primaryKeyMeta(tableRegistry.tables[tableName]).mode === 'scalar');
  const compositePkTables = tableNames.filter((tableName) => primaryKeyMeta(tableRegistry.tables[tableName]).mode === 'composite');
  const missingPkTables = tableNames.filter((tableName) => primaryKeyMeta(tableRegistry.tables[tableName]).mode === 'missing');
  const rowVersionTables = tableNames.filter((tableName) => hasOptimisticConcurrency(tableRegistry.tables[tableName]));
  const orgScopedTables = tableNames.filter((tableName) => orgScopeFields(tableRegistry.tables[tableName]).length > 0);
  const optimisticConcurrencyIssues = [];
  const orgScopeContractIssues = [];

  for (const tableName of tableNames) {
    const table = tableRegistry.tables[tableName];
    const domain = table.domain;
    const supportedKinds = new Set(supportedEndpointKinds(table));
    const pk = primaryKeyMeta(table);

    ['detail', 'update', 'delete', 'transition'].forEach((kind) => {
      if (!supportedKinds.has(kind) && endpointKeys.includes(`${domain}.${tableName}.${kind}`)) {
        unsupportedRecordEndpoints.push(`${domain}.${tableName}.${kind}`);
      }
    });

    if (table.workflowId) {
      const workflow = workflowMap[table.workflowId];
      const isWorkflowOwner = !workflow?.primaryTable || workflow.primaryTable === tableName;
      if (workflow && isWorkflowOwner && table.statusSet && workflow.statusSet && workflow.statusSet !== table.statusSet) {
        workflowAlignmentIssues.push({
          table: tableName,
          workflowId: table.workflowId,
          issue: 'status_set_mismatch',
          tableStatusSet: table.statusSet,
          workflowStatusSet: workflow.statusSet,
        });
      }
      if (workflow && isWorkflowOwner && table.statusColumn && workflow.stateField && workflow.stateField !== table.statusColumn) {
        workflowAlignmentIssues.push({
          table: tableName,
          workflowId: table.workflowId,
          issue: 'state_field_mismatch',
          tableStateField: table.statusColumn,
          workflowStateField: workflow.stateField,
        });
      }
    }

    if (pk.mode === 'missing') {
      continue;
    }

    const expectedIdentityFields = externalIdentityFields(pk);

    ['detail', 'update', 'delete'].forEach((kind) => {
      const endpoint = endpointCatalog.endpoints?.[`${domain}.${tableName}.${kind}`];
      if (!endpoint) return;
      const identityFields = endpoint.request?.identity_fields || [];
      const queryParams = endpoint.request?.query_params || [];
      if (expectedIdentityFields.some((field) => !identityFields.includes(field))) {
        contractIssues.push(`${domain}.${tableName}.${kind}:missing_identity_fields`);
      }
      if (expectedIdentityFields.some((field) => !queryParams.includes(field))) {
        contractIssues.push(`${domain}.${tableName}.${kind}:missing_identity_query`);
      }
      if (['update', 'delete'].includes(kind)) {
        const bodyFields = endpoint.request?.body_fields || [];
        if (expectedIdentityFields.some((field) => !bodyFields.includes(field))) {
          contractIssues.push(`${domain}.${tableName}.${kind}:missing_identity_body`);
        }
      }
    });

    const listEndpoint = endpointCatalog.endpoints?.[`${domain}.${tableName}.list`];
    if (listEndpoint) {
      const queryParams = new Set(listEndpoint.request?.query_params || []);
      ['search', 'q', 'sort', 'direction', 'limit', 'offset'].forEach((key) => {
        if (!queryParams.has(key)) {
          contractIssues.push(`${domain}.${tableName}.list:missing_${key}`);
        }
      });
    }

    if (table.statusColumn) {
      const transitionEndpoint = endpointCatalog.endpoints?.[`${domain}.${tableName}.transition`];
      const targets = transitionEndpoint?.capabilities?.transition_targets || [];
      if (!transitionEndpoint || !targets.length) {
        contractIssues.push(`${domain}.${tableName}.transition:missing_targets`);
      } else if (expectedIdentityFields.some((field) => !(transitionEndpoint.request?.identity_fields || []).includes(field))) {
        contractIssues.push(`${domain}.${tableName}.transition:missing_identity_fields`);
      }
    }

    if (hasOptimisticConcurrency(table)) {
      for (const kind of ['detail', 'create', 'update', 'delete', 'transition']) {
        if (!supportedKinds.has(kind)) continue;
        const endpoint = endpointCatalog.endpoints?.[`${domain}.${tableName}.${kind}`];
        if (!endpoint) continue;
        const responseConcurrency = endpoint.response?.optimistic_concurrency || {};
        if (!responseConcurrency.enabled || responseConcurrency.field !== 'row_version') {
          optimisticConcurrencyIssues.push(`${domain}.${tableName}.${kind}:missing_response_concurrency`);
        }
      }

      for (const kind of ['update', 'delete', 'transition']) {
        if (!supportedKinds.has(kind)) continue;
        const endpoint = endpointCatalog.endpoints?.[`${domain}.${tableName}.${kind}`];
        if (!endpoint) continue;
        const requestConcurrency = endpoint.request?.optimistic_concurrency || {};
        if (!requestConcurrency.enabled || requestConcurrency.field !== 'row_version') {
          optimisticConcurrencyIssues.push(`${domain}.${tableName}.${kind}:missing_request_concurrency`);
        }
        if (requestConcurrency.required !== true) {
          optimisticConcurrencyIssues.push(`${domain}.${tableName}.${kind}:missing_required_concurrency`);
        }
      }
    }

    const expectedScopeFields = orgScopeFields(table);
    if (expectedScopeFields.length > 0) {
      for (const kind of supportedKinds) {
        const endpoint = endpointCatalog.endpoints?.[`${domain}.${tableName}.${kind}`];
        if (!endpoint) continue;

        const requestScopeFields = endpoint.request?.org_scope?.fields || [];
        const responseScopeFields = endpoint.response?.org_scope_fields || [];
        if (expectedScopeFields.some((field) => !requestScopeFields.includes(field))) {
          orgScopeContractIssues.push(`${domain}.${tableName}.${kind}:missing_request_scope_fields`);
        }
        if (expectedScopeFields.some((field) => !responseScopeFields.includes(field))) {
          orgScopeContractIssues.push(`${domain}.${tableName}.${kind}:missing_response_scope_fields`);
        }
      }
    }

    for (const kind of supportedEndpointKinds(table)) {
      const endpoint = endpointCatalog.endpoints?.[`${domain}.${tableName}.${kind}`];
      if (endpoint && (!Array.isArray(endpoint.security?.permission_keys) || !endpoint.security.permission_keys.length)) {
        contractIssues.push(`${domain}.${tableName}.${kind}:missing_permissions`);
      }
    }
  }

  contractIssues.push(...optimisticConcurrencyIssues, ...orgScopeContractIssues);

  const checks = [
    { id: 'tables_have_fields', passed: tableFieldCoverage.length === tableNames.length, actual: tableFieldCoverage.length, target: tableNames.length },
    { id: 'tables_have_endpoint_catalog', passed: tableEndpointCoverage.length === tableNames.length, actual: tableEndpointCoverage.length, target: tableNames.length },
    { id: 'tables_have_pack', passed: tablePackCoverage.length === tableNames.length, actual: tablePackCoverage.length, target: tableNames.length },
    { id: 'fk_edges_covered', passed: relationEdges.length === fkCount, actual: relationEdges.length, target: fkCount },
    { id: 'workflow_coverage', passed: workflowCoverage.length === tableNames.length, actual: workflowCoverage.length, target: tableNames.length },
    { id: 'status_coverage', passed: statusCoverage.length === statusTables.length, actual: statusCoverage.length, target: statusTables.length },
    { id: 'scalar_pk_tables', passed: scalarPkTables.length >= (tableNames.length - 32), actual: scalarPkTables.length, target: tableNames.length - 32 },
    { id: 'optimistic_concurrency_contracts', passed: optimisticConcurrencyIssues.length === 0, actual: optimisticConcurrencyIssues.length, target: 0 },
    { id: 'org_scope_contracts', passed: orgScopeContractIssues.length === 0, actual: orgScopeContractIssues.length, target: 0 },
    { id: 'frontend_record_readiness', passed: missingPkTables.length === 0, actual: missingPkTables.length, target: 0 },
    { id: 'no_unsupported_record_endpoints', passed: unsupportedRecordEndpoints.length === 0, actual: unsupportedRecordEndpoints.length, target: 0 },
    { id: 'endpoint_contract_readiness', passed: contractIssues.length === 0, actual: contractIssues.length, target: 0 },
    { id: 'workflow_status_alignment', passed: workflowAlignmentIssues.length === 0, actual: workflowAlignmentIssues.length, target: 0 },
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
      row_version_tables: rowVersionTables.length,
      org_scoped_tables: orgScopedTables.length,
      composite_pk_tables: compositePkTables.length,
      missing_primary_key_tables: missingPkTables.length,
      unsupported_record_endpoints: unsupportedRecordEndpoints.length,
      optimistic_concurrency_issues: optimisticConcurrencyIssues.length,
      org_scope_contract_issues: orgScopeContractIssues.length,
      contract_issues: contractIssues.length,
      workflow_alignment_issues: workflowAlignmentIssues.length,
    },
    checks,
    warnings: {
      row_version_tables: rowVersionTables.slice(0, 60).map((tableName) => ({
        table: tableName,
        concurrency_field: 'row_version',
      })),
      org_scoped_tables: orgScopedTables.slice(0, 60).map((tableName) => ({
        table: tableName,
        scope_fields: orgScopeFields(tableRegistry.tables[tableName]),
      })),
      composite_pk_tables: compositePkTables.slice(0, 40).map((tableName) => ({
        table: tableName,
        primary_key_mode: primaryKeyMeta(tableRegistry.tables[tableName]).mode,
        primary_key_fields: primaryKeyMeta(tableRegistry.tables[tableName]).fields,
      })),
      missing_primary_key_tables: missingPkTables.slice(0, 40).map((tableName) => ({
        table: tableName,
        primary_key_mode: primaryKeyMeta(tableRegistry.tables[tableName]).mode,
        primary_key_fields: primaryKeyMeta(tableRegistry.tables[tableName]).fields,
      })),
      unsupported_record_endpoints: unsupportedRecordEndpoints.slice(0, 30),
      optimistic_concurrency_issues: optimisticConcurrencyIssues.slice(0, 60),
      org_scope_contract_issues: orgScopeContractIssues.slice(0, 60),
      contract_issues: contractIssues.slice(0, 40),
      workflow_alignment_issues: workflowAlignmentIssues.slice(0, 40),
    },
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
  const fieldTypes = readJson(path.join(registryDir, 'field-types.json'));

  const endpointCatalog = buildEndpointCatalog(tableRegistry, domainArchitecture, dataFields, workflowLibrary, statusOptions);
  const packs = buildDomainFieldPacks(tableRegistry, dataFields);
  const relationMap = buildRelationMap(tableRegistry);
  const manifest = buildManifest(endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, fieldTypes, dataFields);
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
