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
const registryDir = path.join(portalRoot, 'qms-data', 'registry');
const docsDir = path.join(portalRoot, 'docs');
const generatedAt = new Date().toISOString();

const viTokens = {
  account: 'tài khoản', actual: 'thực tế', action: 'hành động', alert: 'cảnh báo', analysis: 'phân tích',
  approver: 'người phê duyệt', audit: 'đánh giá', batch: 'lô', book: 'đặt hàng', branch: 'nhánh',
  capacity: 'năng lực', certificate: 'chứng chỉ', code: 'mã', company: 'công ty', compliance: 'tuân thủ',
  confidence: 'độ tin cậy', contract: 'hợp đồng', cost: 'chi phí', count: 'số lượng', customer: 'khách hàng',
  cycle: 'chu kỳ', date: 'ngày', defect: 'lỗi', delivery: 'giao hàng', department: 'phòng ban',
  detail: 'chi tiết', dimension: 'kích thước', disposition: 'xử lý', document: 'tài liệu', due: 'đến hạn',
  email: 'email', end: 'kết thúc', equipment: 'thiết bị', event: 'sự kiện', evidence: 'bằng chứng',
  field: 'trường', file: 'tệp', formula: 'công thức', from: 'từ', genealogy: 'phả hệ', hold: 'tạm giữ',
  id: 'mã', inspection: 'kiểm tra', issue: 'vấn đề', item: 'mã hàng', job: 'lệnh', joined: 'liên kết',
  label: 'nhãn', line: 'dòng', list: 'danh sách', lot: 'lô', message: 'thông điệp', metadata: 'siêu dữ liệu',
  metric: 'chỉ số', month: 'tháng', name: 'tên', next: 'kế tiếp', note: 'ghi chú', number: 'số',
  operation: 'công đoạn', order: 'đơn hàng', outcome: 'kết quả', owner: 'chủ sở hữu', param: 'tham số',
  passport: 'hộ chiếu', path: 'đường dẫn', pct: 'tỷ lệ', phase: 'giai đoạn', phone: 'điện thoại',
  prediction: 'dự báo', price: 'giá', priority: 'ưu tiên', process: 'quy trình', quantity: 'số lượng',
  quality: 'chất lượng', reason: 'lý do', record: 'hồ sơ', reference: 'tham chiếu', related: 'liên quan',
  result: 'kết quả', review: 'xem xét', risk: 'rủi ro', routing: 'quy trình công nghệ', sales: 'bán hàng',
  schedule: 'lịch', score: 'điểm', serial: 'số sê-ri', severity: 'mức độ nghiêm trọng', shipment: 'lô giao',
  source: 'nguồn', start: 'bắt đầu', state: 'trạng thái', status: 'trạng thái', supplier: 'nhà cung cấp',
  summary: 'tóm tắt', table: 'bảng', target: 'mục tiêu', time: 'thời gian', title: 'tiêu đề',
  total: 'tổng', traceability: 'truy xuất', transition: 'chuyển trạng thái', type: 'loại', update: 'cập nhật',
  user: 'người dùng', value: 'giá trị', version: 'phiên bản', warehouse: 'kho', workflow: 'luồng công việc',
};

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, value) { fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function toSnakeCase(value) { return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[.\-\s/]+/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '').toLowerCase(); }
function isVietnamese(label) { return /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(label || ''); }
function humanize(key) { return englishLabelFromKey(key); }
function viLabel(key) {
  return vietnameseLabelFromKeyV2(key);
}
function fieldType(key, uiType, kind, statusColumn) {
  const k = toSnakeCase(key);
  if ((k === statusColumn || k.endsWith('_status')) && ['list', 'detail'].includes(kind)) return 'badge';
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
function parseConstraints(type, columnName, table) {
  const constraints = {};
  const varchar = String(type).match(/(?:VAR)?CHAR\((\d+)\)/i);
  const numeric = String(type).match(/(?:NUMERIC|DECIMAL)\((\d+)\s*,\s*(\d+)\)/i);
  if (varchar) constraints.maxLength = Number(varchar[1]);
  if (numeric) { constraints.precision = Number(numeric[1]); constraints.scale = Number(numeric[2]); }
  if (table.statusColumn === columnName && table.statusSet) constraints.enumRef = table.statusSet;
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
    { key: 'ok', label: 'Kết quả', labelEn: 'OK', type: 'boolean', required: false, filterable: false, sortable: false, group: 'status', source: 'param', constraints: {} },
    { key: 'message', label: 'Thông điệp', labelEn: 'Message', type: 'textarea', required: false, filterable: false, sortable: false, group: 'general', source: 'param', constraints: { maxLength: 4000 } },
    { key: 'server_time', label: 'Thời gian máy chủ', labelEn: 'Server Time', type: 'datetime', required: false, filterable: false, sortable: false, group: 'general', source: 'param', constraints: {} },
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

function dbField(tableName, columnName, table, kind) {
  const column = table.columns[columnName];
  return {
    key: columnName,
    label: isVietnamese(column.label) ? column.label : viLabel(columnName),
    labelEn: column.labelEn || humanize(columnName),
    type: fieldType(columnName, column.uiType, kind, table.statusColumn),
    required: ['create', 'update'].includes(kind) ? Boolean(column.required && !column.default) : Boolean(column.required),
    filterable: ['list', 'detail'].includes(kind) && !['json', 'file', 'textarea'].includes(fieldType(columnName, column.uiType, kind, table.statusColumn)),
    sortable: ['list', 'detail'].includes(kind) && !['json', 'file', 'textarea'].includes(fieldType(columnName, column.uiType, kind, table.statusColumn)),
    group: fieldGroup(columnName, tableName, 'db_column'),
    source: 'db_column',
    dbColumn: columnName,
    dbTable: tableName,
    constraints: parseConstraints(column.type, columnName, table),
  };
}

function joinDisplayColumn(targetTable) {
  const preferred = ['name', 'title', 'description', 'code', 'number', 'username', 'email', 'display_name', 'full_name'];
  for (const candidate of preferred) if (targetTable.columns[candidate]) return candidate;
  const alt = Object.keys(targetTable.columns).find((c) => /_number$/.test(c)) || Object.keys(targetTable.columns).find((c) => /_code$/.test(c));
  return alt || (Array.isArray(targetTable.primaryKey) ? targetTable.primaryKey[0] : targetTable.primaryKey);
}

function joinField(tableName, fk, targetName, targetTable, kind) {
  const displayColumn = joinDisplayColumn(targetTable);
  if (!displayColumn || !targetTable.columns[displayColumn]) return null;
  const keyBase = String(fk.column).replace(/_id$/, '');
  const key = `${toSnakeCase(keyBase)}_${toSnakeCase(displayColumn === 'name' ? 'name' : displayColumn)}`;
  const displayMeta = targetTable.columns[displayColumn];
  return {
    key,
    label: `${targetTable.label} ${isVietnamese(displayMeta.label) ? displayMeta.label.toLowerCase() : viLabel(displayColumn).toLowerCase()}`.trim(),
    labelEn: `${targetTable.labelEn} ${displayMeta.labelEn || humanize(displayColumn)}`.trim(),
    type: fieldType(displayColumn, displayMeta.uiType, kind, targetTable.statusColumn),
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
  const listCols = Object.keys(table.columns).sort((a, b) => {
    const score = (c) => (c === table.statusColumn ? 0 : /name|title|code|number/.test(c) ? 1 : /date|time|qty|amount|cost|value/.test(c) ? 2 : table.columns[c].uiType === 'json' ? 9 : 5);
    return score(a) - score(b) || a.localeCompare(b);
  }).filter((c) => !(table.columns[c].uiType === 'json' || table.columns[c].uiType === 'textarea')).slice(0, 12);
  const writeCols = Object.keys(table.columns).filter((c) => !(table.columns[c].generated || ['created_at', 'updated_at', 'created_by', 'updated_by'].includes(c) || (table.columns[c].pk && table.columns[c].default)));
  generated[`${table.domain}.${tableName}.list`] = ensureMin(`${table.domain}.${tableName}.list`, listCols.map((c) => dbField(tableName, c, table, 'list')));
  generated[`${table.domain}.${tableName}.detail`] = ensureMin(`${table.domain}.${tableName}.detail`, Object.keys(table.columns).map((c) => dbField(tableName, c, table, 'detail')));
  generated[`${table.domain}.${tableName}.create`] = ensureMin(`${table.domain}.${tableName}.create`, writeCols.map((c) => dbField(tableName, c, table, 'create')));
  generated[`${table.domain}.${tableName}.update`] = ensureMin(`${table.domain}.${tableName}.update`, writeCols.map((c) => dbField(tableName, c, table, 'update')));
  if (table.statusColumn && table.statusSet) generated[`${table.domain}.${tableName}.transition`] = ensureMin(`${table.domain}.${tableName}.transition`, [
    dbField(tableName, Array.isArray(table.primaryKey) ? table.primaryKey[0] : table.primaryKey, table, 'detail'),
    dbField(tableName, table.statusColumn, table, 'detail'),
    { key: 'next_status', label: 'Trạng thái kế tiếp', labelEn: 'Next Status', type: 'select', required: true, filterable: false, sortable: false, group: 'status', source: 'param', constraints: { enumRef: table.statusSet } },
    { key: 'transition_note', label: 'Ghi chú chuyển trạng thái', labelEn: 'Transition Note', type: 'textarea', required: false, filterable: false, sortable: false, group: 'status', source: 'param', constraints: { maxLength: 2000 } },
  ]);
  for (const fk of table.foreignKeys) {
    const targetName = String(fk.references).split('.')[0];
    const targetTable = tables[targetName];
    if (!targetTable) continue;
    const listJoin = joinField(tableName, fk, targetName, targetTable, 'list');
    const detailJoin = joinField(tableName, fk, targetName, targetTable, 'detail');
    if (listJoin) generated[`${table.domain}.${tableName}.list`].push(listJoin);
    if (detailJoin) generated[`${table.domain}.${tableName}.detail`].push(detailJoin);
  }
  generated[`${table.domain}.${tableName}.list`] = uniqueFields(generated[`${table.domain}.${tableName}.list`]);
  generated[`${table.domain}.${tableName}.detail`] = uniqueFields(generated[`${table.domain}.${tableName}.detail`]);
}

generated['registry_support.computed.metrics'] = ensureMin('registry_support.computed.metrics', orphanComputed.map((e) => ({ key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: fieldType(e.key, 'string', 'detail', null), required: false, filterable: false, sortable: true, group: fieldGroup(e.key, '', 'computed'), source: 'computed', formula: formulaFor(e.key, false), constraints: {} })));
generated['registry_support.aggregate.metrics'] = ensureMin('registry_support.aggregate.metrics', orphanAggregate.map((e) => ({ key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: fieldType(e.key, 'string', 'detail', null), required: false, filterable: false, sortable: true, group: fieldGroup(e.key, '', 'computed'), source: 'computed', formula: formulaFor(e.key, true), constraints: {} })));
generated['registry_support.join.fields'] = ensureMin('registry_support.join.fields', orphanJoined.map((e) => { const r = resolveJoined(e); return { key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: 'string', required: false, filterable: true, sortable: true, group: fieldGroup(e.key, r.dbTable, 'join'), source: 'join', dbTable: r.dbTable, dbColumn: r.dbColumn, joinVia: e.joinVia || null, constraints: {} }; }));
generated['platform.runtime.params'] = ensureMin('platform.runtime.params', orphanParams.map((e) => ({ key: e.key, label: viLabel(e.key), labelEn: humanize(e.key), type: fieldType(e.key, 'string', 'detail', null), required: false, filterable: false, sortable: false, group: fieldGroup(e.key, '', 'param'), source: 'param', constraints: {} })));

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
for (const [tableName, table] of Object.entries(tables)) for (const columnName of Object.keys(table.columns)) if (!coveredPairs.has(`${tableName}.${columnName}`)) throw new Error(`Missing coverage for ${tableName}.${columnName}`);
const registryColumnNames = new Set(Object.values(tables).flatMap((table) => Object.keys(table.columns)));
for (const columns of Object.values(context.baselineColumns)) {
  for (const columnName of columns) {
    if (!registryColumnNames.has(columnName)) continue;
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
