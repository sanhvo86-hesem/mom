import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  englishLabelFromKey,
  parseMigrations,
  vietnameseLabelFromKeyV2,
} from './generate-table-architecture.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const portalRoot = path.resolve(__dirname, '..', '..');
function resolveRegistryDir() {
  const candidates = [
    path.join(portalRoot, 'data', 'registry'),
    path.join(portalRoot, 'qms-data', 'registry'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}
const registryDir = resolveRegistryDir();
const docsDir = path.join(portalRoot, 'docs');
const generatedAt = new Date().toISOString();

const viTokens = {
  account: 'tÃ i khoáº£n', actual: 'thá»±c táº¿', action: 'hÃ nh Ä‘á»™ng', alert: 'cáº£nh bÃ¡o', analysis: 'phÃ¢n tÃ­ch',
  approver: 'ngÆ°á»i phÃª duyá»‡t', audit: 'Ä‘Ã¡nh giÃ¡', batch: 'lÃ´', book: 'Ä‘áº·t hÃ ng', branch: 'nhÃ¡nh',
  capacity: 'nÄƒng lá»±c', certificate: 'chá»©ng chá»‰', code: 'mÃ£', company: 'cÃ´ng ty', compliance: 'tuÃ¢n thá»§',
  confidence: 'Ä‘á»™ tin cáº­y', contract: 'há»£p Ä‘á»“ng', cost: 'chi phÃ­', count: 'sá»‘ lÆ°á»£ng', customer: 'khÃ¡ch hÃ ng',
  cycle: 'chu ká»³', date: 'ngÃ y', defect: 'lá»—i', delivery: 'giao hÃ ng', department: 'phÃ²ng ban',
  detail: 'chi tiáº¿t', dimension: 'kÃ­ch thÆ°á»›c', disposition: 'xá»­ lÃ½', document: 'tÃ i liá»‡u', due: 'Ä‘áº¿n háº¡n',
  email: 'email', end: 'káº¿t thÃºc', equipment: 'thiáº¿t bá»‹', event: 'sá»± kiá»‡n', evidence: 'báº±ng chá»©ng',
  field: 'trÆ°á»ng', file: 'tá»‡p', formula: 'cÃ´ng thá»©c', from: 'tá»«', genealogy: 'pháº£ há»‡', hold: 'táº¡m giá»¯',
  id: 'mÃ£', inspection: 'kiá»ƒm tra', issue: 'váº¥n Ä‘á»', item: 'mÃ£ hÃ ng', job: 'lá»‡nh', joined: 'liÃªn káº¿t',
  label: 'nhÃ£n', line: 'dÃ²ng', list: 'danh sÃ¡ch', lot: 'lÃ´', message: 'thÃ´ng Ä‘iá»‡p', metadata: 'siÃªu dá»¯ liá»‡u',
  metric: 'chá»‰ sá»‘', month: 'thÃ¡ng', name: 'tÃªn', next: 'káº¿ tiáº¿p', note: 'ghi chÃº', number: 'sá»‘',
  operation: 'cÃ´ng Ä‘oáº¡n', order: 'Ä‘Æ¡n hÃ ng', outcome: 'káº¿t quáº£', owner: 'chá»§ sá»Ÿ há»¯u', param: 'tham sá»‘',
  passport: 'há»™ chiáº¿u', path: 'Ä‘Æ°á»ng dáº«n', pct: 'tá»· lá»‡', phase: 'giai Ä‘oáº¡n', phone: 'Ä‘iá»‡n thoáº¡i',
  prediction: 'dá»± bÃ¡o', price: 'giÃ¡', priority: 'Æ°u tiÃªn', process: 'quy trÃ¬nh', quantity: 'sá»‘ lÆ°á»£ng',
  quality: 'cháº¥t lÆ°á»£ng', reason: 'lÃ½ do', record: 'há»“ sÆ¡', reference: 'tham chiáº¿u', related: 'liÃªn quan',
  result: 'káº¿t quáº£', review: 'xem xÃ©t', risk: 'rá»§i ro', routing: 'quy trÃ¬nh cÃ´ng nghá»‡', sales: 'bÃ¡n hÃ ng',
  schedule: 'lá»‹ch', score: 'Ä‘iá»ƒm', serial: 'sá»‘ sÃª-ri', severity: 'má»©c Ä‘á»™ nghiÃªm trá»ng', shipment: 'lÃ´ giao',
  source: 'nguá»“n', start: 'báº¯t Ä‘áº§u', state: 'tráº¡ng thÃ¡i', status: 'tráº¡ng thÃ¡i', supplier: 'nhÃ  cung cáº¥p',
  summary: 'tÃ³m táº¯t', table: 'báº£ng', target: 'má»¥c tiÃªu', time: 'thá»i gian', title: 'tiÃªu Ä‘á»',
  total: 'tá»•ng', traceability: 'truy xuáº¥t', transition: 'chuyá»ƒn tráº¡ng thÃ¡i', type: 'loáº¡i', update: 'cáº­p nháº­t',
  user: 'ngÆ°á»i dÃ¹ng', value: 'giÃ¡ trá»‹', version: 'phiÃªn báº£n', warehouse: 'kho', workflow: 'luá»“ng cÃ´ng viá»‡c',
};

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, value) { fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function toSnakeCase(value) { return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[.\-\s/]+/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '').toLowerCase(); }
function loadWave1LifecycleNormalization() {
  const filePath = path.join(registryDir, 'wave1-lifecycle-normalization.json');
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}
function isVietnamese(label) { return /[Ã Ã¡áº£Ã£áº¡Äƒáº¯áº±áº³áºµáº·Ã¢áº¥áº§áº©áº«áº­Ä‘Ã¨Ã©áº»áº½áº¹Ãªáº¿á»á»ƒá»…á»‡Ã¬Ã­á»‰Ä©á»‹Ã²Ã³á»Ãµá»Ã´á»‘á»“á»•á»—á»™Æ¡á»›á»á»Ÿá»¡á»£Ã¹Ãºá»§Å©á»¥Æ°á»©á»«á»­á»¯á»±á»³Ã½á»·á»¹á»µ]/i.test(label || ''); }
function humanize(key) { return englishLabelFromKey(key); }
function viLabel(key) {
  return vietnameseLabelFromKeyV2(key);
}
function fieldType(key, dbType, uiType, kind, statusColumn, statusSet) {
  const k = toSnakeCase(key);
  const type = String(dbType || '').trim().toLowerCase();
  if ((k === statusColumn || k.endsWith('_status')) && ['list', 'detail'].includes(kind)) return 'badge';
  if ((k === statusColumn || k.endsWith('_status')) && statusSet) return 'select';
  if (/jsonb?(?:\[\])?$/.test(type)) return 'json';
  if (/^bool(?:ean)?$/.test(type)) return 'boolean';
  if (/timestamp|timestamptz/.test(type)) return 'datetime';
  if (/^date$/.test(type)) return 'date';
  if (/^time(?: with(?:out)? time zone)?$/.test(type)) return 'datetime';
  if (/uuid|char|varchar|text|citext/.test(type)) {
    if (uiType === 'select' || uiType === 'reference') return 'select';
    if (uiType === 'textarea') return 'textarea';
    if (uiType === 'json') return 'json';
    if (uiType === 'date') return 'date';
    if (uiType === 'datetime') return 'datetime';
    if (uiType === 'currency') return 'currency';
    if (uiType === 'percentage') return 'percentage';
    if (uiType === 'file') return 'file';
    if (uiType === 'boolean') return 'boolean';
    if (['number', 'duration', 'temperature', 'weight', 'pressure'].includes(uiType)) return 'number';
    if (/notes|description|message|summary|detail|reason|comment/.test(k)) return 'textarea';
    if (/json|metadata|trend|breakdown/.test(k)) return 'json';
    if (/flag|required|enabled|active|logged_in|initialized|expired/.test(k)) return 'boolean';
    return 'string';
  }
  if (/numeric|decimal|real|double precision|money/.test(type)) {
    if (/pct|percent|ratio|rate|yield|score|confidence/.test(k)) return 'percentage';
    if (/cost|price|amount|value|revenue|budget/.test(k)) return 'currency';
    return 'number';
  }
  if (/smallint|integer|bigint|serial|bigserial/.test(type)) {
    if (/pct|percent|ratio|rate|yield|score|confidence/.test(k)) return 'percentage';
    if (/cost|price|amount|value|revenue|budget/.test(k)) return 'currency';
    return 'number';
  }
  if (/\[\]$/.test(type)) return 'json';
  if (uiType === 'select' || uiType === 'reference') return 'select';
  if (uiType === 'textarea') return 'textarea';
  if (uiType === 'json') return 'json';
  if (uiType === 'date') return 'date';
  if (uiType === 'datetime') return 'datetime';
  if (uiType === 'currency') return 'currency';
  if (uiType === 'percentage') return 'percentage';
  if (uiType === 'file') return 'file';
  if (uiType === 'boolean') return 'boolean';
  if (['number', 'duration', 'temperature', 'weight', 'pressure'].includes(uiType)) return 'number';
  if (/pct|percent|ratio|rate|yield|score|confidence/.test(k)) return 'percentage';
  if (/cost|price|amount|value|revenue|budget/.test(k)) return 'currency';
  if (/date$|_date/.test(k)) return 'date';
  if (/_at$|time$|_time|timestamp/.test(k)) return 'datetime';
  if (/qty|quantity|count|hours|minutes|duration|number|days/.test(k)) return 'number';
  if (/notes|description|message|summary|detail|reason|comment/.test(k)) return 'textarea';
  if (/json|metadata|trend|breakdown/.test(k)) return 'json';
  if (/flag|required|enabled|active|logged_in|initialized|expired/.test(k)) return 'boolean';
  return 'string';
}
function fieldGroup(key, tableName = '', source = 'db_column') {
  const k = toSnakeCase(key);
  const ref = `${toSnakeCase(tableName)}_${k}`;
  if (/status|state|phase|priority|severity|hold/.test(k)) return 'status';
  if (/id$|code|number|name|title|username|email|phone|rev|version/.test(k)) return 'identification';
  if (/date|time|due|schedule|start|end|shift|calendar|duration|queue|operation/.test(k)) return 'scheduling';
  if (/cost|price|amount|value|budget|revenue|burden|labor|material_cost|overhead/.test(k)) return 'costing';
  if (/quality|defect|ncr|capa|fai|inspection|certificate|calibration|fmea|spc|sample|lab|ppm|cpk|ppk/.test(ref)) return 'quality';
  if (/eccn|itar|export|license|customs|dfars|as9100|iso|audit|hazard|safety|compliance|screen|duty/.test(ref)) return 'compliance';
  if (/serial|lot|batch|trace|genealogy|shipment|passport|evidence|custody/.test(ref)) return 'traceability';
  if (/dimension|length|width|height|diameter|weight|uom|unit|size|pressure|temperature/.test(k)) return 'dimensions';
  return source === 'param' ? 'general' : 'general';
}
function parseConstraints(type, tableName, columnName, table) {
  const constraints = {};
  const varchar = String(type).match(/(?:VAR)?CHAR\((\d+)\)/i);
  const numeric = String(type).match(/(?:NUMERIC|DECIMAL)\((\d+)\s*,\s*(\d+)\)/i);
  if (varchar) constraints.maxLength = Number(varchar[1]);
  if (numeric) { constraints.precision = Number(numeric[1]); constraints.scale = Number(numeric[2]); }
  const statusColumn = effectiveStatusColumn(tableName, table);
  const statusSet = effectiveStatusSet(tableName, table);
  if (statusColumn === columnName && statusSet) constraints.enumRef = statusSet;
  if (/ncr_number/.test(columnName)) constraints.pattern = '^NCR-\\d{4}-\\d{4}$';
  if (/capa_number/.test(columnName)) constraints.pattern = '^CAPA-\\d{4}-\\d{4}$';
  if (/fai_number/.test(columnName)) constraints.pattern = '^FAI-\\d{4}-\\d{4}$';
  return constraints;
}
function uniqueFields(fields) { const seen = new Set(); return fields.filter((f) => f?.key && !seen.has(f.key) && seen.add(f.key)); }
function ensureMin(endpointKey, fields) {
  const items = uniqueFields(fields);
  if (items.length >= 3) return items;
  const fallback = [
    { key: 'ok', label: 'Káº¿t quáº£', labelEn: 'OK', type: 'boolean', required: false, filterable: false, sortable: false, group: 'status', source: 'param', constraints: {} },
    { key: 'response_message', label: 'Response Message', labelEn: 'Response Message', type: 'textarea', required: false, filterable: false, sortable: false, group: 'general', source: 'param', constraints: { maxLength: 4000 } },
    { key: 'server_time', label: 'Thá»i gian mÃ¡y chá»§', labelEn: 'Server Time', type: 'datetime', required: false, filterable: false, sortable: false, group: 'general', source: 'param', constraints: {} },
  ];
  const merged = uniqueFields([...items, ...fallback]);
  if (merged.length < 3) throw new Error(`Endpoint ${endpointKey} has fewer than 3 fields`);
  return merged;
}

const context = {
  tableRegistry: readJson(path.join(registryDir, 'table-registry.json')),
  orphanResolution: readJson(path.join(registryDir, 'orphan-resolution.json')),
  currentDataFields: readJson(path.join(registryDir, 'data-fields.json')),
  statusOptions: readJson(path.join(registryDir, 'status-options.json')),
  endpointCatalog: readJson(path.join(registryDir, 'endpoint-catalog.json')).endpoints,
  wave1LifecycleNormalization: loadWave1LifecycleNormalization(),
  baselineColumns: readJson(path.join(docsDir, 'table_columns.json')),
  parsed: parseMigrations(),
};

const tables = context.tableRegistry.tables;
const domains = context.tableRegistry.domains;
const researchReferences = context.tableRegistry._meta.researchReferences || [];
const removeKeys = new Set(context.orphanResolution.orphan_fields.should_remove.fields.map((x) => toSnakeCase(x.key)));
const keepSyntheticField = (entry) => !removeKeys.has(toSnakeCase(entry.key));
const orphanComputed = context.orphanResolution.orphan_fields.computed.fields.filter(keepSyntheticField);
const orphanAggregate = context.orphanResolution.orphan_fields.aggregate.fields.filter(keepSyntheticField);
const orphanJoined = context.orphanResolution.orphan_fields.joined.fields.filter(keepSyntheticField);
const orphanParams = context.orphanResolution.orphan_fields.api_param.fields.filter(keepSyntheticField);
const columnIndex = new Map();
for (const [tableName, table] of Object.entries(tables)) for (const [columnName, column] of Object.entries(table.columns)) { if (!columnIndex.has(columnName)) columnIndex.set(columnName, []); columnIndex.get(columnName).push({ tableName, column }); }
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

function wave1EntityOverride(tableName) {
  return context.wave1LifecycleNormalization?.normalized_entities?.[tableName] || null;
}

function effectiveStatusColumn(tableName, table) {
  const override = wave1EntityOverride(tableName);
  const overrideField = String(override?.status_field_override || '').trim();
  if (overrideField && table.columns?.[overrideField]) return overrideField;
  return String(table.statusColumn || '').trim();
}

function effectiveStatusSet(tableName, table) {
  const override = wave1EntityOverride(tableName);
  const overrideKey = String(override?.status_set_key || '').trim();
  if (overrideKey) return overrideKey;
  return String(table.statusSet || '').trim();
}

function primaryKeyFields(table) {
  const raw = Array.isArray(table.primaryKey) ? table.primaryKey : [table.primaryKey];
  return raw
    .map((value) => String(value || '').trim())
    .filter((value) => value && table.columns[value]);
}

function primaryKeyMeta(table) {
  const fields = primaryKeyFields(table);
  if (fields.length === 1) return { mode: 'scalar', fields, key: fields[0] };
  if (fields.length > 1) return { mode: 'composite', fields, key: null };
  return { mode: 'missing', fields: [], key: null };
}

function primaryKeyName(table) {
  return primaryKeyMeta(table).key || '';
}

function hasPrimaryKey(table) {
  return primaryKeyMeta(table).mode !== 'missing';
}

function writeColumnsFor(table, kind) {
  const primaryKeys = new Set(primaryKeyFields(table));
  return Object.keys(table.columns).filter((columnName) => {
    const column = table.columns[columnName];
    if (!column || column.generated) return false;
    if (SYSTEM_MANAGED_FIELDS.has(columnName)) return false;
    if (kind === 'update' && primaryKeys.has(columnName)) return false;
    if (kind === 'update' && table.statusColumn && columnName === table.statusColumn) return false;
    if (kind === 'create' && primaryKeys.has(columnName) && column.default) return false;
    return true;
  });
}

function deleteFieldsFor(table) {
  const primaryKeys = primaryKeyFields(table);
  if (!primaryKeys.length) return [];
  return [
    ...primaryKeys.map((primaryKey) => dbField(table.tableName, primaryKey, table, 'detail')),
    ...concurrencyParamFieldsFor(table),
    { key: 'confirm_delete', label: 'Xác nhận xóa', labelEn: 'Confirm Delete', type: 'boolean', required: true, filterable: false, sortable: false, group: 'status', source: 'param', constraints: {} },
    { key: 'delete_reason', label: 'Lý do xóa', labelEn: 'Delete Reason', type: 'textarea', required: false, filterable: false, sortable: false, group: 'general', source: 'param', constraints: { maxLength: 2000 } },
  ];
}

function concurrencyParamFieldsFor(table) {
  if (!table.columns.row_version) return [];
  return [{
    key: 'row_version',
    label: 'Phiên bản bản ghi',
    labelEn: 'Record Version',
    type: 'number',
    required: true,
    filterable: false,
    sortable: false,
    group: 'status',
    source: 'param',
    constraints: { min: 0 },
  }];
}

function dbField(tableName, columnName, table, kind) {
  const column = table.columns[columnName];
  const statusColumn = effectiveStatusColumn(tableName, table);
  const statusSet = effectiveStatusSet(tableName, table);
  return {
    key: columnName,
    label: isVietnamese(column.label) ? column.label : viLabel(columnName),
    labelEn: column.labelEn || humanize(columnName),
    type: fieldType(columnName, column.type, column.uiType, kind, statusColumn, statusSet),
    required: ['create', 'update'].includes(kind) ? Boolean(column.required && !column.default) : Boolean(column.required),
    filterable: ['list', 'detail'].includes(kind) && !['json', 'file', 'textarea'].includes(fieldType(columnName, column.type, column.uiType, kind, statusColumn, statusSet)),
    sortable: ['list', 'detail'].includes(kind) && !['json', 'file', 'textarea'].includes(fieldType(columnName, column.type, column.uiType, kind, statusColumn, statusSet)),
    group: fieldGroup(columnName, tableName, 'db_column'),
    source: 'db_column',
    dbColumn: columnName,
    dbTable: tableName,
    constraints: parseConstraints(column.type, tableName, columnName, table),
  };
}

function joinDisplayCandidates(targetTable) {
  const columns = Object.keys(targetTable.columns || {});
  const preferred = [
    'display_name',
    'full_name',
    'name',
    'title',
    'username',
    'email',
    ...columns.filter((c) => /(?:^|_)name$/.test(c) && !/_name_vi$/.test(c)),
    ...columns.filter((c) => /(?:^|_)title$/.test(c) && !/_title_vi$/.test(c)),
    ...columns.filter((c) => /(?:^|_)number$/.test(c)),
    ...columns.filter((c) => /(?:^|_)code$/.test(c)),
    ...columns.filter((c) => /(?:^|_)description$/.test(c)),
    'description',
    'code',
    'number',
  ];
  const unique = [];
  const seen = new Set();
  for (const candidate of preferred) {
    if (!candidate || !targetTable.columns[candidate] || seen.has(candidate)) continue;
    seen.add(candidate);
    unique.push(candidate);
  }
  const primaryKey = Array.isArray(targetTable.primaryKey) ? targetTable.primaryKey[0] : targetTable.primaryKey;
  if (primaryKey && targetTable.columns[primaryKey] && !seen.has(primaryKey)) unique.push(primaryKey);
  return unique;
}

function joinDisplayColumn(targetTable) {
  return joinDisplayCandidates(targetTable)[0] || null;
}

function compactJoinSuffix(displayKey, semanticBase) {
  const base = toSnakeCase(semanticBase);
  const display = toSnakeCase(displayKey);
  if (display.startsWith(`${base}_`)) return display.slice(base.length + 1);
  return display;
}

function joinFieldKey(fkColumn, displayColumn) {
  const fkKey = toSnakeCase(fkColumn);
  const displayKey = toSnakeCase(displayColumn);
  const semanticBase = fkKey.replace(/_(id|code|number)$/, '');
  const semanticRoot = displayKey.replace(/_(name|title|code|number|description)$/, '');
  let candidate = `${semanticBase}_${displayKey}`;

  if (displayKey === 'name') candidate = `${semanticBase}_name`;
  else if (displayKey === 'title') candidate = `${semanticBase}_title`;
  else if (displayKey === 'description') candidate = `${semanticBase}_description`;
  else if (displayKey === 'username') candidate = `${semanticBase}_username`;
  else if (displayKey === 'email') candidate = `${semanticBase}_email`;
  else if (/(?:_name|_title|_code|_number)$/.test(displayKey) && (semanticBase === semanticRoot || semanticBase.endsWith(`_${semanticRoot}`))) {
    candidate = `${semanticBase}_${displayKey.split('_').slice(-1)[0]}`;
  }

  if (
    candidate === fkKey
    || candidate === displayKey
    || fkKey.endsWith(`_${displayKey}`)
    || semanticBase.endsWith(`_${displayKey}`)
    || columnIndex.has(candidate)
  ) {
    candidate = `${semanticBase}_lookup_${compactJoinSuffix(displayKey, semanticBase)}`;
  }

  return candidate;
}

function joinField(tableName, fk, targetName, targetTable, kind) {
  const displayColumn = joinDisplayColumn(targetTable);
  if (!displayColumn || !targetTable.columns[displayColumn]) return null;
  const key = joinFieldKey(fk.column, displayColumn);
  const targetStatusColumn = effectiveStatusColumn(targetName, targetTable);
  const targetStatusSet = effectiveStatusSet(targetName, targetTable);
  return {
    key,
    label: viLabel(key),
    labelEn: humanize(key),
    type: fieldType(displayColumn, targetTable.columns[displayColumn].type, targetTable.columns[displayColumn].uiType, kind, targetStatusColumn, targetStatusSet),
    required: false,
    filterable: ['list', 'detail'].includes(kind),
    sortable: ['list', 'detail'].includes(kind),
    group: fieldGroup(key, tableName, 'join'),
    source: 'join',
    dbTable: targetName,
    dbColumn: displayColumn,
    joinVia: fk.column,
    constraints: {},
  };
}

function formulaFor(key, aggregate = false) {
  const k = toSnakeCase(key);
  if (/accuracy_pct/.test(k)) return '(good_count / NULLIF(total_count, 0)) * 100';
  if (/backlog_value/.test(k)) return 'SUM(open_order_value)';
  if (/book_to_bill_ratio/.test(k)) return 'SUM(booked_value) / NULLIF(SUM(billed_value), 0)';
  if (/buy_to_fly/.test(k)) return 'SUM(raw_material_weight) / NULLIF(SUM(finished_part_weight), 0)';
  if (/completion_pct/.test(k)) return '(completed_qty / NULLIF(planned_qty, 0)) * 100';
  if (/conversion_rate/.test(k)) return '(won_quote_count / NULLIF(total_quote_count, 0)) * 100';
  if (/cost_per_part/.test(k)) return 'SUM(total_cost) / NULLIF(SUM(completed_qty), 0)';
  if (/cycle_time/.test(k)) return 'AVG(actual_cycle_time_sec)';
  if (/current_counter/.test(k)) return 'MAX(counter_reading)';
  if (/current_wear_pct/.test(k)) return 'MAX(wear_pct)';
  if (aggregate && /_this_week$/.test(k)) return "COUNT(*) FILTER (WHERE created_at >= date_trunc('week', now()))";
  if (aggregate && /_this_month$/.test(k)) return "COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))";
  if (aggregate && /_count$|^count$/.test(k)) return 'COUNT(*)';
  if (aggregate && /by_/.test(k)) return `GROUP BY ${k.replace(/^by_/, '')}`;
  return `${aggregate ? 'agg' : 'calc'}_${k}`;
}

function resolveJoined(entry) {
  if (entry.sourceTable && tables[entry.sourceTable]) return { dbTable: entry.sourceTable, dbColumn: tables[entry.sourceTable].columns[entry.sourceColumn] ? entry.sourceColumn : joinDisplayColumn(tables[entry.sourceTable]) };
  if (entry.sourceColumn && columnIndex.has(entry.sourceColumn) && columnIndex.get(entry.sourceColumn).length === 1) return { dbTable: columnIndex.get(entry.sourceColumn)[0].tableName, dbColumn: entry.sourceColumn };
  const k = toSnakeCase(entry.key);
  if (/^customer_/.test(k)) return { dbTable: 'customers', dbColumn: tables.customers.columns.name ? 'name' : joinDisplayColumn(tables.customers) };
  if (/^supplier_|^vendor_/.test(k)) return { dbTable: 'vendors', dbColumn: joinDisplayColumn(tables.vendors) };
  if (/^item_|^part_|^component_/.test(k)) return { dbTable: 'items', dbColumn: joinDisplayColumn(tables.items) };
  return { dbTable: 'users', dbColumn: tables.users.columns.username ? 'username' : joinDisplayColumn(tables.users) };
}

const generated = {};
for (const [tableName, table] of Object.entries(tables)) {
  table.tableName = tableName;
  const statusColumn = effectiveStatusColumn(tableName, table);
  const statusSet = effectiveStatusSet(tableName, table);
  const listCols = Object.keys(table.columns).sort((a, b) => {
    const score = (c) => (c === statusColumn ? 0 : /name|title|code|number/.test(c) ? 1 : /date|time|qty|amount|cost|value/.test(c) ? 2 : table.columns[c].uiType === 'json' ? 9 : 5);
    return score(a) - score(b) || a.localeCompare(b);
  }).filter((c) => !(table.columns[c].uiType === 'json' || table.columns[c].uiType === 'textarea')).slice(0, 12);
  const createCols = writeColumnsFor(table, 'create');
  const updateCols = writeColumnsFor(table, 'update');
  const primaryKey = primaryKeyName(table);
  const primaryKeys = primaryKeyFields(table);
  generated[`${table.domain}.${tableName}.list`] = ensureMin(`${table.domain}.${tableName}.list`, listCols.map((c) => dbField(tableName, c, table, 'list')));
  if (hasPrimaryKey(table)) {
    generated[`${table.domain}.${tableName}.detail`] = ensureMin(`${table.domain}.${tableName}.detail`, Object.keys(table.columns).map((c) => dbField(tableName, c, table, 'detail')));
    generated[`${table.domain}.${tableName}.update`] = ensureMin(`${table.domain}.${tableName}.update`, [
      ...updateCols.map((c) => dbField(tableName, c, table, 'update')),
      ...concurrencyParamFieldsFor(table),
    ]);
    generated[`${table.domain}.${tableName}.delete`] = ensureMin(`${table.domain}.${tableName}.delete`, deleteFieldsFor(table));
  }
  generated[`${table.domain}.${tableName}.create`] = ensureMin(`${table.domain}.${tableName}.create`, createCols.map((c) => dbField(tableName, c, table, 'create')));
  if (primaryKeys.length && statusColumn && statusSet) generated[`${table.domain}.${tableName}.transition`] = ensureMin(`${table.domain}.${tableName}.transition`, [
    ...primaryKeys.map((key) => dbField(tableName, key, table, 'detail')),
    ...concurrencyParamFieldsFor(table),
    dbField(tableName, statusColumn, table, 'detail'),
    { key: 'to_status', label: 'Trạng thái đích', labelEn: 'Target Status', type: 'select', required: true, filterable: false, sortable: false, group: 'status', source: 'param', constraints: { enumRef: statusSet } },
    { key: 'transition_note', label: 'Ghi chú chuyển trạng thái', labelEn: 'Transition Note', type: 'textarea', required: false, filterable: false, sortable: false, group: 'status', source: 'param', constraints: { maxLength: 2000 } },
  ]);
  for (const fk of (table.foreignKeys || [])) {
    const targetName = String(fk.references).split('.')[0];
    const targetTable = tables[targetName];
    if (!targetTable) continue;
    const listJoin = joinField(tableName, fk, targetName, targetTable, 'list');
    const detailJoin = hasPrimaryKey(table) ? joinField(tableName, fk, targetName, targetTable, 'detail') : null;
    if (listJoin) generated[`${table.domain}.${tableName}.list`].push(listJoin);
    if (detailJoin && generated[`${table.domain}.${tableName}.detail`]) generated[`${table.domain}.${tableName}.detail`].push(detailJoin);
  }
  generated[`${table.domain}.${tableName}.list`] = uniqueFields(generated[`${table.domain}.${tableName}.list`]);
  if (generated[`${table.domain}.${tableName}.detail`]) generated[`${table.domain}.${tableName}.detail`] = uniqueFields(generated[`${table.domain}.${tableName}.detail`]);
}

const reservedKeys = new Set();
for (const fields of Object.values(generated)) {
  for (const field of fields) {
    if (['db_column', 'join', 'param'].includes(field.source)) reservedKeys.add(field.key);
  }
}
const filterSyntheticCollisions = (entries) => entries.filter((entry) => !reservedKeys.has(entry.key));

generated['registry_support.computed.metrics'] = ensureMin('registry_support.computed.metrics', filterSyntheticCollisions(orphanComputed).map((e) => ({ key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: fieldType(e.key, '', 'string', 'detail', null, null), required: false, filterable: false, sortable: true, group: fieldGroup(e.key, '', 'computed'), source: 'computed', formula: formulaFor(e.key, false), constraints: {} })));
generated['registry_support.aggregate.metrics'] = ensureMin('registry_support.aggregate.metrics', filterSyntheticCollisions(orphanAggregate).map((e) => ({ key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: fieldType(e.key, '', 'string', 'detail', null, null), required: false, filterable: false, sortable: true, group: fieldGroup(e.key, '', 'computed'), source: 'computed', formula: formulaFor(e.key, true), constraints: {} })));
generated['registry_support.join.fields'] = ensureMin('registry_support.join.fields', filterSyntheticCollisions(orphanJoined).map((e) => { const r = resolveJoined(e); return { key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: 'string', required: false, filterable: true, sortable: true, group: fieldGroup(e.key, r.dbTable, 'join'), source: 'join', dbTable: r.dbTable, dbColumn: r.dbColumn, joinVia: e.joinVia || null, constraints: {} }; }));
generated['platform.runtime.params'] = ensureMin('platform.runtime.params', filterSyntheticCollisions(orphanParams).map((e) => ({ key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: fieldType(e.key, '', 'string', 'detail', null, null), required: false, filterable: false, sortable: false, group: fieldGroup(e.key, '', 'param'), source: 'param', constraints: {} })));

const endpointKeys = Object.keys(generated);
const uniqueKeys = new Set();
const coveredNames = new Set();
const coveredPairs = new Set();
for (const [endpointKey, fields] of Object.entries(generated)) {
  if (fields.length < 3) throw new Error(`Endpoint ${endpointKey} has fewer than 3 fields`);
  for (const field of fields) {
    if (removeKeys.has(toSnakeCase(field.key)) && !['db_column', 'join'].includes(field.source)) {
      throw new Error(`Should-remove field leaked into output: ${field.key}`);
    }
    uniqueKeys.add(field.key);
    if (field.source === 'db_column') {
      if (!tables[field.dbTable]?.columns[field.dbColumn]) throw new Error(`Invalid DB mapping ${field.dbTable}.${field.dbColumn}`);
      coveredNames.add(field.dbColumn);
      coveredPairs.add(`${field.dbTable}.${field.dbColumn}`);
    }
    if (field.source === 'join' && !tables[field.dbTable]?.columns[field.dbColumn]) throw new Error(`Invalid JOIN mapping ${field.dbTable}.${field.dbColumn}`);
    if (!field.dbTable && !['computed', 'join', 'param'].includes(field.source)) throw new Error(`Field ${field.key} missing dbTable/source`);
  }
}
for (const [tableName, table] of Object.entries(tables)) {
  for (const columnName of Object.keys(table.columns)) {
    if (SYSTEM_MANAGED_FIELDS.has(columnName)) continue;
    if (!coveredPairs.has(`${tableName}.${columnName}`)) throw new Error(`Missing coverage for ${tableName}.${columnName}`);
  }
}
const registryColumnNames = new Set(Object.values(tables).flatMap((table) => Object.keys(table.columns)));
for (const columns of Object.values(context.baselineColumns)) {
  for (const columnName of columns) {
    if (!registryColumnNames.has(columnName)) continue;
    if (SYSTEM_MANAGED_FIELDS.has(columnName)) continue;
    if (!coveredNames.has(columnName)) throw new Error(`Baseline column ${columnName} missing field def`);
  }
}
for (const domainKey of Object.keys(domains)) if (endpointKeys.filter((k) => k.startsWith(`${domainKey}.`)).length < 5) throw new Error(`Domain ${domainKey} has fewer than 5 endpoints`);
if (endpointKeys.length < 1500) throw new Error(`Endpoint count too low: ${endpointKeys.length}`);
if (uniqueKeys.size < 3500) throw new Error(`Unique field key count too low: ${uniqueKeys.size}`);

const output = {
  _meta: {
    version: '4.0',
    generatedAt,
    description: 'Canonical data field registry rebuilt from table-registry coverage, orphan field normalization, and full migration-backed schema validation.',
    sourceEndpointCount: Object.keys(context.currentDataFields).length - 1,
    generatedEndpointCount: endpointKeys.length,
    uniqueFieldKeys: uniqueKeys.size,
    uniqueDbColumnNamesCovered: coveredNames.size,
    totalDbTableColumnsCovered: coveredPairs.size,
    baselineUniqueColumnCoverage: new Set(Object.values(context.baselineColumns).flat().filter((columnName) => registryColumnNames.has(columnName))).size,
    migrationCount: context.parsed.migrationFiles.length,
    researchReferences,
  },
  ...generated,
};

const pretty = JSON.stringify(output, null, 2);
const lineCount = pretty.split(/\r?\n/).length;
if (lineCount > 100000) {
  const domainKeys = Object.keys(domains);
  const part1Domains = new Set(domainKeys.slice(0, 25));
  const part2Domains = new Set(domainKeys.slice(25));
  const part1 = { _meta: { version: '4.0', generatedAt, part: 1, domains: [...part1Domains], description: 'data-fields split part 1' } };
  const part2 = { _meta: { version: '4.0', generatedAt, part: 2, domains: [...part2Domains], description: 'data-fields split part 2' } };
  for (const [endpointKey, fields] of Object.entries(generated)) {
    const domainKey = endpointKey.split('.')[0];
    const target = part2Domains.has(domainKey) ? part2 : part1;
    target[endpointKey] = fields;
  }
  part1._meta.endpointCount = Object.keys(part1).length - 1;
  part2._meta.endpointCount = Object.keys(part2).length - 1;
  const index = {
    _meta: output._meta,
    split: true,
    lineCount,
    parts: [
      { file: 'data-fields-part1.json', endpointCount: part1._meta.endpointCount, domains: [...part1Domains] },
      { file: 'data-fields-part2.json', endpointCount: part2._meta.endpointCount, domains: [...part2Domains] },
    ],
  };
  writeJson(path.join(registryDir, 'data-fields-part1.json'), part1);
  writeJson(path.join(registryDir, 'data-fields-part2.json'), part2);
  writeJson(path.join(registryDir, 'data-fields-index.json'), index);
  writeJson(path.join(registryDir, 'data-fields.json'), index);
  console.log(JSON.stringify({ generatedAt, split: true, lineCount, endpointCount: endpointKeys.length, uniqueFieldKeys: uniqueKeys.size, uniqueDbColumnNamesCovered: coveredNames.size, totalDbTableColumnsCovered: coveredPairs.size }, null, 2));
} else {
  writeJson(path.join(registryDir, 'data-fields.json'), output);
  console.log(JSON.stringify({ generatedAt, split: false, lineCount, endpointCount: endpointKeys.length, uniqueFieldKeys: uniqueKeys.size, uniqueDbColumnNamesCovered: coveredNames.size, totalDbTableColumnsCovered: coveredPairs.size }, null, 2));
}
