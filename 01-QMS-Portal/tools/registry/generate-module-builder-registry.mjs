import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');
const registryDir = path.join(root, 'qms-data', 'registry');
const generatedAt = new Date().toISOString();

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, value) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const snake = (value) => String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
const uniq = (values) => [...new Set(values.filter(Boolean))];
const human = (value) => snake(value).split('_').filter(Boolean).map((part) => (/^[a-z]{1,3}$/.test(part) ? part.toUpperCase() : `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)).join(' ');
const sortObj = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
const singular = (name) => (String(name).endsWith('ies') ? `${String(name).slice(0, -3)}y` : String(name).endsWith('s') && !String(name).endsWith('ss') ? String(name).slice(0, -1) : String(name));

function loadDataFields() {
  const indexPath = path.join(registryDir, 'data-fields-index.json');
  const legacyPath = path.join(registryDir, 'data-fields.json');
  const index = fs.existsSync(indexPath) ? readJson(indexPath) : readJson(legacyPath);
  const endpoints = {};
  if (index.parts) {
    for (const part of index.parts) {
      Object.assign(endpoints, Object.fromEntries(Object.entries(readJson(path.join(registryDir, part.file))).filter(([key]) => key !== '_meta')));
    }
  } else {
    Object.assign(endpoints, Object.fromEntries(Object.entries(index).filter(([key]) => key !== '_meta' && key !== 'parts')));
  }
  return { meta: index._meta || {}, endpoints };
}

function spanFor(field) {
  if (['textarea', 'json', 'file'].includes(field.type)) return 'full';
  if (['currency', 'percentage', 'date', 'datetime', 'badge', 'boolean', 'number'].includes(field.type)) return 'half';
  return 'half';
}

function fieldRef(field, extra = {}) {
  return {
    key: field.key,
    label: field.label,
    labelEn: field.labelEn,
    type: field.type,
    required: Boolean(field.required),
    source: field.source,
    dbTable: field.dbTable || null,
    dbColumn: field.dbColumn || null,
    formula: extra.formula || field.formula || null,
    span: extra.span || spanFor(field),
  };
}

function priority(field) {
  const key = snake(field.key);
  if (field.source === 'computed') return 5;
  if (/status|state|phase|priority/.test(key)) return 0;
  if (/name|title|number|code/.test(key)) return 1;
  if (/date|time|due|start|end/.test(key)) return 2;
  if (/cost|price|amount|value/.test(key)) return 3;
  if (/description|summary|notes|comment|reason/.test(key)) return 4;
  return 6;
}

function searchEligible(field) {
  return ['string', 'select', 'date', 'datetime', 'number', 'currency', 'percentage', 'badge'].includes(field.type);
}

function normalizeFieldContexts(dataFields) {
  const contexts = new Map();
  const byTable = new Map();
  const byDomain = new Map();

  for (const [endpointKey, fields] of Object.entries(dataFields.endpoints)) {
    const [domain, entity = domain, kind = 'detail'] = endpointKey.split('.');
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(endpointKey);
    if (!byTable.has(entity)) byTable.set(entity, []);
    byTable.get(entity).push(endpointKey);

    for (const field of fields) {
      const source = field.source || 'db_column';
      const signature = ['db_column', 'join'].includes(source)
        ? `${source}|${field.dbTable || ''}|${field.dbColumn || ''}|${field.key}`
        : `${source}|${field.key}`;
      if (!contexts.has(signature)) {
        contexts.set(signature, {
          ...field,
          source,
          endpointKeys: new Set(),
          domains: new Set(),
          entities: new Set(),
          kinds: new Set(),
        });
      }
      const ctx = contexts.get(signature);
      ctx.endpointKeys.add(endpointKey);
      ctx.domains.add(domain);
      ctx.entities.add(entity);
      ctx.kinds.add(kind);
    }
  }

  return {
    contexts: [...contexts.values()],
    endpointsByTable: byTable,
    endpointsByDomain: byDomain,
  };
}

function formulaField(formulaId, formula) {
  return {
    key: formulaId,
    label: formula.name,
    labelEn: formula.nameEn,
    type: formula.unit === 'percentage' ? 'percentage' : formula.unit === 'currency' ? 'currency' : 'number',
    required: false,
    source: 'computed',
    dbTable: null,
    dbColumn: null,
    formula: formulaId,
  };
}

function inferCascade(fromTable, toTable, fromDomain, toDomain, fieldName) {
  const key = snake(fieldName);
  if (/lot|serial|batch|genealogy/.test(key)) return ['propagate_traceability_link'];
  if (/ncr|capa|deviation|concession/.test(fromTable)) return ['create_quality_context'];
  if (/customer/.test(key)) return ['sync_customer_context'];
  if (/supplier|vendor/.test(key)) return ['sync_supplier_context'];
  if (fromDomain !== toDomain) return ['sync_digital_thread_context'];
  return ['maintain_reference_integrity'];
}

function buildDomainFieldPacks(tableRegistry, domainArchitecture, dataFields, formulas) {
  const { endpointsByTable } = normalizeFieldContexts(dataFields);
  const formulaEntries = Object.fromEntries(Object.entries(formulas).filter(([key]) => key !== '_meta'));
  const formulaIds = Object.keys(formulaEntries);
  const formulaRefs = new Map(formulaIds.map((id) => [id, 0]));
  const packs = {};
  const domainFormulaPool = {};

  for (const domainKey of Object.keys(domainArchitecture.domains || {})) {
    domainFormulaPool[domainKey] = formulaIds.filter((formulaId) => formulaId.startsWith(`${domainKey}_`) || formulaEntries[formulaId].domain === domainKey);
  }

  let fallbackFormulaIndex = 0;
  for (const [tableName, tableMeta] of Object.entries(tableRegistry.tables)) {
    const endpointKeys = (endpointsByTable.get(tableName) || []).sort();
    const endpointMap = Object.fromEntries(endpointKeys.map((endpointKey) => [endpointKey.split('.').at(-1), dataFields.endpoints[endpointKey]]));
    const listFields = (endpointMap.list || []).slice().sort((a, b) => priority(a) - priority(b) || a.key.localeCompare(b.key));
    const detailFields = (endpointMap.detail || listFields).slice().sort((a, b) => priority(a) - priority(b) || a.key.localeCompare(b.key));
    const createFields = (endpointMap.create || detailFields).filter((field) => !['join', 'computed'].includes(field.source));
    const searchFields = uniq([...(detailFields || []), ...(listFields || [])]).filter(searchEligible);
    const filterFields = listFields.filter((field) => field.filterable || ['select', 'date', 'datetime', 'badge', 'boolean'].includes(field.type));

    const fieldKeys = new Set([...detailFields, ...listFields, ...createFields].map((field) => field.key));
    const matchedFormulas = formulaIds.filter((formulaId) => fieldKeys.has(formulaId));
    const domainPool = domainFormulaPool[tableMeta.domain] || [];
    const kpiFormulaIds = uniq([
      ...matchedFormulas.slice(0, 6),
      ...domainPool.slice(0, 5),
    ]);

    while (kpiFormulaIds.length < 5 && fallbackFormulaIndex < formulaIds.length) {
      const candidate = formulaIds[fallbackFormulaIndex++];
      if (!kpiFormulaIds.includes(candidate)) kpiFormulaIds.push(candidate);
    }

    for (const formulaId of kpiFormulaIds) formulaRefs.set(formulaId, (formulaRefs.get(formulaId) || 0) + 1);

    packs[`${tableName}_header`] = {
      packId: `${tableName}_header`,
      name: `${tableMeta.label} - Thông tin chính`,
      nameEn: `${tableMeta.labelEn} Header`,
      module: tableMeta.domain,
      table: tableName,
      packType: 'header',
      workflowId: tableMeta.workflowId || null,
      statusSet: tableMeta.statusSet || null,
      fields: detailFields.slice(0, 10).map((field) => fieldRef(field)),
    };
    packs[`${tableName}_list_columns`] = {
      packId: `${tableName}_list_columns`,
      name: `${tableMeta.label} - Cột danh sách`,
      nameEn: `${tableMeta.labelEn} List Columns`,
      module: tableMeta.domain,
      table: tableName,
      packType: 'list_columns',
      workflowId: tableMeta.workflowId || null,
      statusSet: tableMeta.statusSet || null,
      fields: listFields.slice(0, 12).map((field) => fieldRef(field, { span: 'half' })),
    };
    packs[`${tableName}_filters`] = {
      packId: `${tableName}_filters`,
      name: `${tableMeta.label} - Bộ lọc`,
      nameEn: `${tableMeta.labelEn} Filters`,
      module: tableMeta.domain,
      table: tableName,
      packType: 'filters',
      workflowId: tableMeta.workflowId || null,
      statusSet: tableMeta.statusSet || null,
      fields: filterFields.slice(0, 12).map((field) => fieldRef(field, { span: 'half' })),
    };
    packs[`${tableName}_kpi`] = {
      packId: `${tableName}_kpi`,
      name: `${tableMeta.label} - KPI`,
      nameEn: `${tableMeta.labelEn} KPI`,
      module: tableMeta.domain,
      table: tableName,
      packType: 'kpi',
      workflowId: tableMeta.workflowId || null,
      statusSet: tableMeta.statusSet || null,
      fields: kpiFormulaIds.map((formulaId) => fieldRef(formulaField(formulaId, formulaEntries[formulaId]), { span: 'third', formula: formulaId })),
    };
    packs[`${tableName}_create_form`] = {
      packId: `${tableName}_create_form`,
      name: `${tableMeta.label} - Form tạo mới`,
      nameEn: `${tableMeta.labelEn} Create Form`,
      module: tableMeta.domain,
      table: tableName,
      packType: 'create_form',
      workflowId: tableMeta.workflowId || null,
      statusSet: tableMeta.statusSet || null,
      fields: createFields.slice(0, 18).map((field) => fieldRef(field)),
    };
    packs[`${tableName}_search`] = {
      packId: `${tableName}_search`,
      name: `${tableMeta.label} - Tìm kiếm`,
      nameEn: `${tableMeta.labelEn} Search`,
      module: tableMeta.domain,
      table: tableName,
      packType: 'search',
      workflowId: tableMeta.workflowId || null,
      statusSet: tableMeta.statusSet || null,
      fields: searchFields.slice(0, 12).map((field) => fieldRef(field, { span: 'half' })),
    };
  }

  const unreferenced = [...formulaRefs.entries()].filter(([, count]) => count < 1).map(([formulaId]) => formulaId);
  const packIds = Object.keys(packs).filter((packId) => packId.endsWith('_kpi'));
  let packCursor = 0;
  for (const formulaId of unreferenced) {
    const packId = packIds[packCursor % packIds.length];
    packs[packId].fields.push(fieldRef(formulaField(formulaId, formulaEntries[formulaId]), { span: 'third', formula: formulaId }));
    packCursor += 1;
  }

  return {
    _meta: {
      version: '4.0',
      description: 'Domain field packs rebuilt for Module Builder with per-table composition packs.',
      generatedAt,
      packCount: Object.keys(packs).length,
      tableCount: Object.keys(tableRegistry.tables).length,
      domainCount: Object.keys(domainArchitecture.domains || {}).length,
      totalFieldRefs: Object.values(packs).reduce((sum, pack) => sum + pack.fields.length, 0),
    },
    packs: sortObj(packs),
  };
}

function buildRelationMap(tableRegistry) {
  const entities = {};
  const edges = [];
  let seq = 1;
  for (const [tableName, tableMeta] of Object.entries(tableRegistry.tables)) {
    entities[tableName] = {
      entity: tableName,
      label: tableMeta.label,
      labelEn: tableMeta.labelEn,
      domain: tableMeta.domain,
      primaryKey: tableMeta.primaryKey,
      fields: uniq([tableMeta.primaryKey, ...(tableMeta.foreignKeys || []).map((foreignKey) => foreignKey.column)].flat()),
      digitalThread: true,
    };

    for (const foreignKey of tableMeta.foreignKeys || []) {
      const [refTable, refField] = String(foreignKey.references || '').split('.');
      if (!refTable || !refField) continue;
      const toMeta = tableRegistry.tables[refTable];
      edges.push({
        edgeId: `rel_${String(seq++).padStart(4, '0')}`,
        from: { entity: tableName, field: foreignKey.column },
        to: { entity: refTable, field: refField },
        type: tableName === refTable ? 'self_reference' : 'many_to_one',
        label: `${tableMeta.label} → ${toMeta?.label || human(refTable)}`,
        labelEn: `${tableMeta.labelEn} → ${toMeta?.labelEn || human(refTable)}`,
        domain: `${tableMeta.domain} → ${toMeta?.domain || 'unknown'}`,
        digitalThread: true,
        cascadeActions: inferCascade(tableName, refTable, tableMeta.domain, toMeta?.domain || 'unknown', foreignKey.column),
      });
    }
  }

  return {
    _meta: {
      version: '4.0',
      description: 'Relation map rebuilt from table-registry foreign keys and digital thread semantics.',
      generatedAt,
      entityCount: Object.keys(entities).length,
      edgeCount: edges.length,
    },
    entities: sortObj(entities),
    edges,
  };
}

function endpointLabel(kind, tableMeta) {
  const labels = {
    list: ['Danh sách', 'List'],
    detail: ['Chi tiết', 'Detail'],
    create: ['Tạo mới', 'Create'],
    update: ['Cập nhật', 'Update'],
    transition: ['Chuyển trạng thái', 'Transition'],
    metrics: ['Chỉ số', 'Metrics'],
    fields: ['Trường dữ liệu', 'Fields'],
    params: ['Tham số', 'Parameters'],
  };
  const [vi, en] = labels[kind] || [human(kind), human(kind)];
  return { label: `${vi} ${tableMeta?.label || human(kind)}`.trim(), labelEn: `${tableMeta?.labelEn || ''} ${en}`.trim() || en };
}

function methodFor(kind) {
  if (['list', 'detail', 'metrics', 'fields', 'params'].includes(kind)) return 'GET';
  if (kind === 'update') return 'PUT';
  return 'POST';
}

function buildEndpointCatalog(tableRegistry, domainArchitecture, dataFields, packs) {
  const endpoints = {};
  const packMap = packs.packs;
  for (const [endpointKey, fields] of Object.entries(dataFields.endpoints)) {
    const parts = endpointKey.split('.');
    const [domain, entity = domain, kind = 'detail'] = parts;
    const tableMeta = tableRegistry.tables[entity];
    const domainMeta = domainArchitecture.domains?.[domain];
    const method = methodFor(kind);
    const fieldPacks = tableMeta
      ? ({
          list: [`${entity}_list_columns`, `${entity}_filters`, `${entity}_search`],
          detail: [`${entity}_header`, `${entity}_kpi`],
          create: [`${entity}_create_form`],
          update: [`${entity}_create_form`, `${entity}_header`],
          transition: [`${entity}_header`],
          metrics: [`${entity}_kpi`],
        }[kind] || [`${entity}_header`]).filter((packId) => packMap[packId])
      : [];
    const responseFields = fields.map((field) => field.key);
    const writableFields = fields.filter((field) => !['join', 'computed'].includes(field.source)).map((field) => field.key);
    const requiredBodyFields = fields.filter((field) => field.required && !['join', 'computed'].includes(field.source)).map((field) => field.key);
    const queryParams = kind === 'list'
      ? uniq([...(packMap[`${entity}_filters`]?.fields || []).map((field) => field.key), 'page', 'page_size', 'sort_by', 'sort_order'])
      : kind === 'detail' || kind === 'update'
        ? uniq([tableMeta?.primaryKey].flat())
        : [];
    const statusRefs = uniq([tableMeta?.statusSet, tableMeta?.statusColumn ? `${entity}__${tableMeta.statusColumn}` : null].flat());
    const labels = endpointLabel(kind, tableMeta);
    endpoints[endpointKey] = {
      action: endpointKey,
      label: labels.label,
      labelEn: labels.labelEn,
      module: domainMeta?.label || domain,
      moduleEn: domainMeta?.labelEn || human(domain),
      method,
      controller: `${human(entity).replace(/\s+/g, '')}Controller`,
      handler: kind,
      source: 'registry-generated',
      kind,
      domain,
      entity,
      primary_key: tableMeta?.primaryKey || null,
      field_count: fields.length,
      field_packs: fieldPacks,
      status_refs: statusRefs,
      security: {
        auth_required: !['core_system'].includes(domain) || !['status', 'login'].includes(kind),
        csrf_required: method !== 'GET',
        admin_only: ['system_infrastructure'].includes(domain),
        permission_keys: tableMeta ? [`${domain}.${entity}.${kind}`] : [`registry.${endpointKey}`],
        dynamic_permission: Boolean(tableMeta?.workflowId),
      },
      request: {
        query_params: queryParams,
        body_fields: method === 'GET' ? [] : writableFields,
        required_body_fields: method === 'GET' ? [] : requiredBodyFields,
      },
      response: {
        collection_key: kind === 'list' ? entity : null,
        response_fields: responseFields,
        paginated: kind === 'list',
      },
    };
  }

  return {
    _meta: {
      version: '4.0',
      description: 'Endpoint catalog rebuilt from canonical data-fields coverage and module-builder packs.',
      generatedAt,
      endpointCount: Object.keys(endpoints).length,
    },
    endpoints: sortObj(endpoints),
  };
}

function ensureValidationCoverage(dataFields, validations) {
  const { contexts } = normalizeFieldContexts(dataFields);
  const rules = [...(validations.rules || [])];
  const ruleKeys = new Set();
  let maxSeq = rules.reduce((max, rule) => Math.max(max, Number(String(rule.ruleId || '').replace(/\D+/g, '')) || 0), 0);

  const hasRule = (ctx) => {
    const signature = ctx.dbTable && ctx.dbColumn ? `${ctx.dbTable}|${ctx.dbColumn}|${ctx.key}` : ctx.key;
    return ruleKeys.has(signature) || ruleKeys.has(ctx.key);
  };

  for (const rule of rules) {
    const signature = rule.dbTable && rule.dbColumn ? `${rule.dbTable}|${rule.dbColumn}|${rule.field}` : rule.field;
    ruleKeys.add(signature);
    ruleKeys.add(rule.field);
  }

  const pushRule = (rule, ctx) => {
    const signature = ctx.dbTable && ctx.dbColumn ? `${ctx.dbTable}|${ctx.dbColumn}|${ctx.key}` : ctx.key;
    if (ruleKeys.has(signature) || ruleKeys.has(ctx.key)) return;
    maxSeq += 1;
    rules.push({ ...rule, ruleId: `val_${String(maxSeq).padStart(5, '0')}` });
    ruleKeys.add(signature);
    ruleKeys.add(ctx.key);
  };

  for (const ctx of contexts) {
    if (hasRule(ctx)) continue;
    const type = ctx.type || 'string';
    const entity = ctx.dbTable ? singular(ctx.dbTable) : singular([...(ctx.entities || [])][0] || 'record');
    const base = {
      entity,
      field: ctx.key,
      severity: 'error',
      dbTable: ctx.dbTable || undefined,
      dbColumn: ctx.dbColumn || undefined,
      message: `${ctx.label} không hợp lệ`,
      messageEn: `${ctx.labelEn} is invalid`,
      source: 'registry_backfill',
    };
    if (ctx.source === 'computed') pushRule({ ...base, type: 'formulaExists', params: { fieldKey: ctx.key }, message: `Trường tính toán ${ctx.label} phải có công thức`, messageEn: `Computed field ${ctx.labelEn} must have a formula` }, ctx);
    else if (ctx.source === 'param') pushRule({ ...base, type: 'apiParam', params: { allowedEndpoints: [...(ctx.endpointKeys || [])] }, message: `${ctx.label} là tham số API hợp lệ`, messageEn: `${ctx.labelEn} is a valid API parameter` }, ctx);
    else if (ctx.source === 'join') pushRule({ ...base, type: 'joinConsistency', params: { dbTable: ctx.dbTable, dbColumn: ctx.dbColumn }, message: `${ctx.label} phải đồng bộ với bảng nguồn`, messageEn: `${ctx.labelEn} must remain consistent with the joined source` }, ctx);
    else if (ctx.constraints?.enumRef) pushRule({ ...base, type: 'enumSet', params: { enumRef: ctx.constraints.enumRef }, message: `${ctx.label} phải thuộc tập trạng thái hợp lệ`, messageEn: `${ctx.labelEn} must belong to a valid status set` }, ctx);
    else if (Array.isArray(ctx.constraints?.values) && ctx.constraints.values.length) pushRule({ ...base, type: 'inList', params: { allowedValues: ctx.constraints.values }, message: `${ctx.label} phải thuộc danh sách giá trị cho phép`, messageEn: `${ctx.labelEn} must belong to the allowed value list` }, ctx);
    else if (type === 'percentage') pushRule({ ...base, type: 'range', params: { min: 0, max: 100 }, message: `${ctx.label} phải nằm trong khoảng 0 đến 100`, messageEn: `${ctx.labelEn} must be between 0 and 100` }, ctx);
    else if (['number', 'currency'].includes(type)) pushRule({ ...base, type: 'range', params: { min: 0 }, message: `${ctx.label} không được âm`, messageEn: `${ctx.labelEn} must not be negative` }, ctx);
    else if (type === 'date') pushRule({ ...base, type: 'validDate', params: {}, message: `${ctx.label} phải là ngày hợp lệ`, messageEn: `${ctx.labelEn} must be a valid date` }, ctx);
    else if (type === 'datetime') pushRule({ ...base, type: 'validDateTime', params: {}, message: `${ctx.label} phải là ngày giờ hợp lệ`, messageEn: `${ctx.labelEn} must be a valid datetime` }, ctx);
    else if (type === 'boolean') pushRule({ ...base, type: 'boolean', params: {}, message: `${ctx.label} phải là đúng hoặc sai`, messageEn: `${ctx.labelEn} must be true or false` }, ctx);
    else if (type === 'json') pushRule({ ...base, type: 'validJson', params: {}, message: `${ctx.label} phải là JSON hợp lệ`, messageEn: `${ctx.labelEn} must be valid JSON` }, ctx);
    else if (ctx.constraints?.maxLength) pushRule({ ...base, type: 'maxLength', params: { max: Number(ctx.constraints.maxLength) }, message: `${ctx.label} không được vượt quá ${ctx.constraints.maxLength} ký tự`, messageEn: `${ctx.labelEn} must not exceed ${ctx.constraints.maxLength} characters` }, ctx);
    else if (ctx.required) pushRule({ ...base, type: 'required', params: {}, message: `${ctx.label} là bắt buộc`, messageEn: `${ctx.labelEn} is required` }, ctx);
    else pushRule({ ...base, type: 'presentIfProvided', params: {}, severity: 'warning', message: `${ctx.label} phải đúng kiểu dữ liệu khi được nhập`, messageEn: `${ctx.labelEn} must respect the expected datatype when provided` }, ctx);
  }

  return {
    ...validations,
    _meta: {
      ...(validations._meta || {}),
      version: '4.1',
      generatedAt,
      ruleCount: rules.length,
    },
    rules,
  };
}

function buildQualityReport(inputs) {
  const { tableRegistry, domainArchitecture, dataFields, workflows, statuses, validations, formulas, packs, relations, endpoints } = inputs;
  const { contexts, endpointsByTable } = normalizeFieldContexts(dataFields);
  const workflowTableRefs = new Map();
  for (const workflow of Object.values(workflows.workflows || {})) {
    for (const tableName of uniq([workflow.primaryTable, ...(workflow.relatedTables || [])])) {
      if (!workflowTableRefs.has(tableName)) workflowTableRefs.set(tableName, []);
      workflowTableRefs.get(tableName).push(workflow.workflowId);
    }
  }
  const relationSignatures = new Set(relations.edges.map((edge) => `${edge.from.entity}.${edge.from.field}->${edge.to.entity}.${edge.to.field}`));
  const validationByField = new Map();
  for (const rule of validations.rules || []) {
    const key = rule.dbTable && rule.dbColumn ? `${rule.dbTable}|${rule.dbColumn}|${rule.field}` : rule.field;
    validationByField.set(key, (validationByField.get(key) || 0) + 1);
    validationByField.set(rule.field, (validationByField.get(rule.field) || 0) + 1);
  }
  const packList = Object.values(packs.packs || {});
  const formulaRefs = new Map(Object.keys(formulas).filter((key) => key !== '_meta').map((key) => [key, 0]));
  for (const pack of packList) for (const field of pack.fields) if (field.formula && formulaRefs.has(field.formula)) formulaRefs.set(field.formula, formulaRefs.get(field.formula) + 1);
  for (const endpoint of Object.values(endpoints.endpoints || {})) for (const key of endpoint.response.response_fields || []) if (formulaRefs.has(key)) formulaRefs.set(key, formulaRefs.get(key) + 1);

  const checks = [];
  const addCheck = (id, label, pass, actual, expected, missing = []) => checks.push({ id, label, pass, actual, expected, missing });

  const tables = Object.keys(tableRegistry.tables);
  addCheck('table_to_fields', 'Mọi table trong table-registry có fields trong data-fields', tables.every((tableName) => (endpointsByTable.get(tableName) || []).length > 0), { covered: tables.filter((tableName) => (endpointsByTable.get(tableName) || []).length > 0).length, total: tables.length }, { total: tables.length }, tables.filter((tableName) => (endpointsByTable.get(tableName) || []).length < 1));
  addCheck('table_to_domain', 'Mọi table thuộc domain trong domain-architecture', tables.every((tableName) => Boolean(domainArchitecture.domains?.[tableRegistry.tables[tableName].domain])), { covered: tables.filter((tableName) => Boolean(domainArchitecture.domains?.[tableRegistry.tables[tableName].domain])).length, total: tables.length }, { total: tables.length }, tables.filter((tableName) => !domainArchitecture.domains?.[tableRegistry.tables[tableName].domain]));

  const statusTables = tables.filter((tableName) => tableRegistry.tables[tableName].statusColumn);
  const statusWorkflowPass = (tableName) => {
    const tableMeta = tableRegistry.tables[tableName];
    return Boolean(statuses[`${tableName}__${tableMeta.statusColumn}`] && (tableMeta.workflowId || (workflowTableRefs.get(tableName) || []).length > 0 || tableMeta.supportTable));
  };
  addCheck('status_workflow', 'Mọi table có status có workflow hoặc kế thừa workflow support và có status set', statusTables.every(statusWorkflowPass), { covered: statusTables.filter(statusWorkflowPass).length, total: statusTables.length }, { total: statusTables.length }, statusTables.filter((tableName) => !statusWorkflowPass(tableName)));

  const fkKeys = [];
  for (const [tableName, tableMeta] of Object.entries(tableRegistry.tables)) for (const foreignKey of tableMeta.foreignKeys || []) fkKeys.push(`${tableName}.${foreignKey.column}->${foreignKey.references}`);
  addCheck('fk_edges', 'Mọi FK trong table-registry có edge trong relation-map', fkKeys.every((key) => relationSignatures.has(key)), { covered: fkKeys.filter((key) => relationSignatures.has(key)).length, total: fkKeys.length }, { total: fkKeys.length }, fkKeys.filter((key) => !relationSignatures.has(key)));

  const fieldChecks = contexts.map((ctx) => ({
    signature: ctx.dbTable && ctx.dbColumn ? `${ctx.dbTable}|${ctx.dbColumn}|${ctx.key}` : ctx.key,
    fieldKey: ctx.key,
  }));
  addCheck(
    'field_validation',
    'Mọi field trong data-fields có validation rule',
    fieldChecks.every((entry) => validationByField.has(entry.signature) || validationByField.has(entry.fieldKey)),
    { covered: fieldChecks.filter((entry) => validationByField.has(entry.signature) || validationByField.has(entry.fieldKey)).length, total: fieldChecks.length },
    { total: fieldChecks.length },
    fieldChecks.filter((entry) => !(validationByField.has(entry.signature) || validationByField.has(entry.fieldKey))).map((entry) => entry.signature).slice(0, 50),
  );

  const domains = Object.keys(domainArchitecture.domains || {});
  const packDomains = new Set(packList.map((pack) => pack.module));
  addCheck('domain_packs', 'Mọi domain có ít nhất một domain-field-pack', domains.every((domainKey) => packDomains.has(domainKey)), { covered: domains.filter((domainKey) => packDomains.has(domainKey)).length, total: domains.length }, { total: domains.length }, domains.filter((domainKey) => !packDomains.has(domainKey)));

  addCheck('endpoint_fields', 'Mọi endpoint trong endpoint-catalog có fields trong data-fields', Object.keys(endpoints.endpoints).every((endpointKey) => (dataFields.endpoints[endpointKey] || []).length > 0), { covered: Object.keys(endpoints.endpoints).filter((endpointKey) => (dataFields.endpoints[endpointKey] || []).length > 0).length, total: Object.keys(endpoints.endpoints).length }, { total: Object.keys(endpoints.endpoints).length }, Object.keys(endpoints.endpoints).filter((endpointKey) => (dataFields.endpoints[endpointKey] || []).length < 1));

  addCheck('workflow_primary_table', 'Mọi workflow có primaryTable tồn tại', Object.values(workflows.workflows || {}).every((workflow) => Boolean(tableRegistry.tables[workflow.primaryTable])), { covered: Object.values(workflows.workflows || {}).filter((workflow) => Boolean(tableRegistry.tables[workflow.primaryTable])).length, total: Object.keys(workflows.workflows || {}).length }, { total: Object.keys(workflows.workflows || {}).length }, Object.values(workflows.workflows || {}).filter((workflow) => !tableRegistry.tables[workflow.primaryTable]).map((workflow) => workflow.workflowId));

  addCheck('formula_reference', 'Mọi formula được reference bởi field hoặc KPI endpoint', [...formulaRefs.values()].every((count) => count > 0), { covered: [...formulaRefs.values()].filter((count) => count > 0).length, total: formulaRefs.size }, { total: formulaRefs.size }, [...formulaRefs.entries()].filter(([, count]) => count < 1).map(([key]) => key));

  addCheck('orphan_table', 'Không có orphan table', tables.every((tableName) => Boolean(tableRegistry.tables[tableName].domain)), { covered: tables.filter((tableName) => Boolean(tableRegistry.tables[tableName].domain)).length, total: tables.length }, { total: tables.length }, tables.filter((tableName) => !tableRegistry.tables[tableName].domain));
  addCheck('orphan_field', 'Không có orphan field', contexts.every((ctx) => ['computed', 'param'].includes(ctx.source) || (ctx.dbTable && ctx.dbColumn)), { covered: contexts.filter((ctx) => ['computed', 'param'].includes(ctx.source) || (ctx.dbTable && ctx.dbColumn)).length, total: contexts.length }, { total: contexts.length }, contexts.filter((ctx) => !['computed', 'param'].includes(ctx.source) && !(ctx.dbTable && ctx.dbColumn)).map((ctx) => ctx.key));
  addCheck('orphan_workflow', 'Không có orphan workflow', Object.values(workflows.workflows || {}).every((workflow) => Boolean(workflow.primaryTable && tableRegistry.tables[workflow.primaryTable])), { covered: Object.values(workflows.workflows || {}).filter((workflow) => Boolean(workflow.primaryTable && tableRegistry.tables[workflow.primaryTable])).length, total: Object.keys(workflows.workflows || {}).length }, { total: Object.keys(workflows.workflows || {}).length }, Object.values(workflows.workflows || {}).filter((workflow) => !(workflow.primaryTable && tableRegistry.tables[workflow.primaryTable])).map((workflow) => workflow.workflowId));
  addCheck('orphan_status', 'Không có orphan status set', Object.entries(statuses).filter(([key]) => key !== '_meta').every(([, entry]) => ((entry.referencedByTables || []).length + (entry.referencedByWorkflows || []).length) > 0), { covered: Object.entries(statuses).filter(([key]) => key !== '_meta' && ((statuses[key].referencedByTables || []).length + (statuses[key].referencedByWorkflows || []).length) > 0).length, total: Object.keys(statuses).filter((key) => key !== '_meta').length }, { total: Object.keys(statuses).filter((key) => key !== '_meta').length }, Object.entries(statuses).filter(([key, entry]) => key !== '_meta' && ((entry.referencedByTables || []).length + (entry.referencedByWorkflows || []).length) < 1).map(([key]) => key));
  addCheck('orphan_formula', 'Không có orphan formula', [...formulaRefs.values()].every((count) => count > 0), { covered: [...formulaRefs.values()].filter((count) => count > 0).length, total: formulaRefs.size }, { total: formulaRefs.size }, [...formulaRefs.entries()].filter(([, count]) => count < 1).map(([key]) => key));

  const usedColumns = new Set(contexts.filter((ctx) => ctx.dbTable && ctx.dbColumn).map((ctx) => `${ctx.dbTable}.${ctx.dbColumn}`));
  const allColumns = [];
  for (const [tableName, tableMeta] of Object.entries(tableRegistry.tables)) for (const columnName of Object.keys(tableMeta.columns || {})) allColumns.push(`${tableName}.${columnName}`);
  addCheck('dead_column', 'Không có dead column', allColumns.every((column) => usedColumns.has(column)), { covered: allColumns.filter((column) => usedColumns.has(column)).length, total: allColumns.length }, { total: allColumns.length }, allColumns.filter((column) => !usedColumns.has(column)).slice(0, 100));

  const failed = checks.filter((check) => !check.pass);
  return {
    _meta: {
      version: '4.0',
      description: 'Cross-registry verification report for table, field, workflow, status, relation, endpoint, and formula coverage.',
      generatedAt,
      totalChecks: checks.length,
      passedChecks: checks.length - failed.length,
      failedChecks: failed.length,
      status: failed.length ? 'failed' : 'passed',
    },
    checks,
    summary: {
      tables: Object.keys(tableRegistry.tables).length,
      domains: Object.keys(domainArchitecture.domains || {}).length,
      endpoints: Object.keys(endpoints.endpoints || {}).length,
      packs: Object.keys(packs.packs || {}).length,
      edges: relations.edges.length,
      validationRules: validations.rules.length,
      formulas: Object.keys(formulas).filter((key) => key !== '_meta').length,
    },
  };
}

function buildManifest(inputs, qualityReport) {
  const { tableRegistry, domainArchitecture, dataFields, workflows, statuses, validations, formulas, packs, relations, endpoints } = inputs;
  const researchSources = uniq([
    ...(tableRegistry._meta?.researchReferences || []),
    ...(dataFields.meta?.researchReferences || []),
    ...(workflows._meta?.researchReferences || []),
    ...(statuses._meta?.researchReferences || []),
    ...(validations._meta?.researchReferences || []),
    ...(formulas._meta?.researchReferences || []),
  ].map((entry) => JSON.stringify(entry))).map((entry) => JSON.parse(entry));

  return {
    _meta: {
      version: '4.0',
      description: 'Registry manifest and coverage index for the metadata backbone after full cross-link rebuild.',
      generatedAt,
    },
    coverage: {
      tables: Object.keys(tableRegistry.tables || {}).length,
      domains: Object.keys(domainArchitecture.domains || {}).length,
      generated_endpoints: Object.keys(endpoints.endpoints || {}).length,
      data_field_endpoints: dataFields.meta.generatedEndpointCount || Object.keys(dataFields.endpoints || {}).length,
      field_definitions: Object.values(dataFields.endpoints || {}).reduce((sum, fields) => sum + fields.length, 0),
      unique_field_keys: dataFields.meta.uniqueFieldKeys || 0,
      status_sets: statuses._meta.statusSetCount,
      workflow_count: workflows._meta.workflowCount,
      relation_edges: relations._meta.edgeCount,
      validation_rules: validations._meta.ruleCount,
      formula_count: formulas._meta.formulaCount,
      domain_pack_count: packs._meta.packCount,
      quality_checks_passed: qualityReport._meta.passedChecks,
      quality_checks_failed: qualityReport._meta.failedChecks,
    },
    research_sources: researchSources,
    assets: {
      'table-registry.json': { kind: 'table-registry', records: Object.keys(tableRegistry.tables || {}).length },
      'domain-architecture.json': { kind: 'domain-architecture', records: Object.keys(domainArchitecture.domains || {}).length },
      'data-fields.json': { kind: 'field-registry-index', records: dataFields.meta.generatedEndpointCount || Object.keys(dataFields.endpoints || {}).length },
      'workflow-library.json': { kind: 'workflow-library', records: workflows._meta.workflowCount },
      'status-options.json': { kind: 'status-library', records: statuses._meta.statusSetCount },
      'validation-rules.json': { kind: 'validation-rules', records: validations._meta.ruleCount },
      'computed-formulas.json': { kind: 'formula-library', records: formulas._meta.formulaCount },
      'domain-field-packs.json': { kind: 'pack-library', records: packs._meta.packCount },
      'relation-map.json': { kind: 'relation-map', records: relations._meta.edgeCount },
      'endpoint-catalog.json': { kind: 'endpoint-catalog', records: endpoints._meta.endpointCount },
      'registry-quality-report.json': { kind: 'quality-report', records: qualityReport._meta.totalChecks },
      'registry-manifest.json': { kind: 'manifest', records: 1 },
    },
  };
}

function main() {
  const tableRegistry = readJson(path.join(registryDir, 'table-registry.json'));
  const domainArchitecture = readJson(path.join(registryDir, 'domain-architecture.json'));
  const workflows = readJson(path.join(registryDir, 'workflow-library.json'));
  const statuses = readJson(path.join(registryDir, 'status-options.json'));
  const validations = ensureValidationCoverage(loadDataFields(), readJson(path.join(registryDir, 'validation-rules.json')));
  const formulas = readJson(path.join(registryDir, 'computed-formulas.json'));
  const dataFields = loadDataFields();

  const packs = buildDomainFieldPacks(tableRegistry, domainArchitecture, dataFields, formulas);
  const relations = buildRelationMap(tableRegistry);
  const endpoints = buildEndpointCatalog(tableRegistry, domainArchitecture, dataFields, packs);
  const qualityReport = buildQualityReport({ tableRegistry, domainArchitecture, dataFields, workflows, statuses, validations, formulas, packs, relations, endpoints });
  if (qualityReport._meta.failedChecks > 0) {
    process.stderr.write(`${JSON.stringify(qualityReport.checks.filter((check) => !check.pass), null, 2)}\n`);
    throw new Error(`Quality report failed with ${qualityReport._meta.failedChecks} failed checks`);
  }
  const manifest = buildManifest({ tableRegistry, domainArchitecture, dataFields, workflows, statuses, validations, formulas, packs, relations, endpoints }, qualityReport);

  writeJson(path.join(registryDir, 'domain-field-packs.json'), packs);
  writeJson(path.join(registryDir, 'relation-map.json'), relations);
  writeJson(path.join(registryDir, 'endpoint-catalog.json'), endpoints);
  writeJson(path.join(registryDir, 'validation-rules.json'), validations);
  writeJson(path.join(registryDir, 'registry-quality-report.json'), qualityReport);
  writeJson(path.join(registryDir, 'registry-manifest.json'), manifest);

  process.stdout.write(`${JSON.stringify({ packCount: packs._meta.packCount, relationEdges: relations._meta.edgeCount, endpointCount: endpoints._meta.endpointCount, qualityStatus: qualityReport._meta.status, failedChecks: qualityReport._meta.failedChecks }, null, 2)}\n`);
}

main();
