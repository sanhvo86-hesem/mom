import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMigrations } from './generate-table-architecture.mjs';
import { tokenTranslations } from './registry-v3-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');
const registryDir = path.join(root, 'qms-data', 'registry');
const migrationsDir = path.join(root, 'database', 'migrations');
const generatedAt = new Date().toISOString();

const regulatedDomains = new Set([
  'quality_management', 'calibration_equipment', 'quality_lab', 'fmea_apqp', 'plm_change_control',
  'trade_compliance', 'shipping_compliance', 'evidence_vault', 'traceability_serialization',
  'supplier_relationship', 'outsource_execution', 'document_control', 'ehs_sustainability',
]);
const genericAudit = new Set(['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'deleted_by']);
const workflowNoise = /(_lines?|_history|_events|_logs|_snapshots|_results|_attachments|_links|_queues?|_telemetry|_alarms|_facts?|_dim)$/i;

const genericTemplates = {
  generic_review_status: { label: 'Trạng thái phê duyệt chung', labelEn: 'Generic Review Status', values: ['draft', 'submitted', 'in_review', 'approved', 'released', 'closed', 'cancelled'] },
  generic_operational_status: { label: 'Trạng thái vận hành chung', labelEn: 'Generic Operational Status', values: ['planned', 'released', 'in_progress', 'completed', 'closed', 'cancelled'] },
  generic_project_status: { label: 'Trạng thái dự án chung', labelEn: 'Generic Project Status', values: ['initiation', 'planning', 'execution', 'monitoring', 'closure', 'cancelled'] },
  generic_incident_status: { label: 'Trạng thái sự vụ chung', labelEn: 'Generic Incident Status', values: ['reported', 'investigating', 'corrective_action', 'verified', 'closed'] },
  generic_service_status: { label: 'Trạng thái dịch vụ chung', labelEn: 'Generic Service Status', values: ['new', 'assigned', 'in_progress', 'resolved', 'closed'] },
  generic_pipeline_status: { label: 'Trạng thái cơ hội chung', labelEn: 'Generic Pipeline Status', values: ['prospect', 'qualified', 'quoted', 'negotiation', 'won', 'lost'] },
  generic_data_status: { label: 'Trạng thái dữ liệu chung', labelEn: 'Generic Data Status', values: ['draft', 'validated', 'published', 'archived'] },
  generic_certificate_status: { label: 'Trạng thái chứng nhận chung', labelEn: 'Generic Certification Status', values: ['active', 'expiring', 'expired', 'renewed', 'suspended'] },
  generic_finance_status: { label: 'Trạng thái tài chính chung', labelEn: 'Generic Finance Status', values: ['draft', 'submitted', 'approved', 'posted', 'closed', 'reversed'] },
};

const statusVi = {
  accepted: 'Được chấp nhận', active: 'Đang hiệu lực', approved: 'Đã phê duyệt', archived: 'Đã lưu trữ',
  assigned: 'Đã phân công', cancelled: 'Đã hủy', cleared: 'Đã thông quan', closed: 'Đã đóng',
  completed: 'Hoàn thành', conflict: 'Xung đột', contained: 'Đã ngăn chặn', corrective_action: 'Đang hành động khắc phục',
  created: 'Đã tạo', draft: 'Nháp', expired: 'Hết hạn', expiring: 'Sắp hết hạn', failed: 'Thất bại',
  frozen: 'Đã khóa', hold: 'Tạm giữ', in_progress: 'Đang thực hiện', in_production: 'Đang sản xuất',
  in_review: 'Đang xem xét', inactive: 'Ngừng hiệu lực', initiation: 'Khởi tạo', implemented: 'Đã triển khai',
  investigating: 'Đang điều tra', issued: 'Đã phát hành', lost: 'Thua', maintenance: 'Bảo trì',
  monitoring: 'Giám sát', negotiation: 'Đàm phán', new: 'Mới', on_hold: 'Tạm dừng', open: 'Mở',
  paid: 'Đã thanh toán', paused: 'Tạm ngưng', pending: 'Chờ xử lý', pending_approval: 'Chờ phê duyệt',
  pending_review: 'Chờ xem xét', pending_sync: 'Chờ đồng bộ', planned: 'Đã lập kế hoạch',
  planning: 'Lập kế hoạch', posted: 'Đã hạch toán', processing: 'Đang xử lý', prospect: 'Tiềm năng',
  published: 'Đã công bố', qualified: 'Đã đủ điều kiện', reconciled: 'Đã đối soát', rejected: 'Bị từ chối',
  released: 'Đã phát hành', renewed: 'Đã gia hạn', reported: 'Đã báo cáo', resolved: 'Đã xử lý xong',
  retired: 'Ngưng sử dụng', revised: 'Đã điều chỉnh', reversed: 'Đảo bút toán', running: 'Đang chạy',
  scheduled: 'Đã lên lịch', shipped: 'Đã giao hàng', submitted: 'Đã gửi', suspended: 'Tạm đình chỉ',
  synced: 'Đã đồng bộ', terminated: 'Đã chấm dứt', validated: 'Đã thẩm định', verified: 'Đã xác nhận hiệu lực',
  void: 'Vô hiệu', waived: 'Được miễn trừ', won: 'Thắng',
};

const researchReferences = [
  { key: 'sap_status_management', url: 'https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/5e23dc8fe9be4fd496f8ab556667ea05/0ed49753858ced23e10000000a174cb4.html' },
  { key: 'sap_inspection_lot', url: 'https://help.sap.com/docs/SAP_ERP/250374f0514e4e0f9057066374265eba/a7e4b65334e6b54ce10000000a174cb4.html' },
  { key: 'epicor_connected_process_control', url: 'https://www.epicor.com/en/products/connected-worker/epicor-connected-process-control/' },
  { key: 'ifs_projection', url: 'https://docs.ifs.com/techdocs/25r2/030_administration/010_security/020_permission_sets/004_permission_set_overview/010_projections/' },
  { key: 'oracle_workflow_status', url: 'https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25a/fauqm/workflow-status.html' },
  { key: 'dynamics_virtual_tables', url: 'https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-edit-virtual-entities' },
  { key: 'mastercontrol_quality_event', url: 'https://www.mastercontrol.com/glossary-page/quality-event/' },
  { key: 'etq_nonconformance', url: 'https://www.etq.com/nonconformance-handling/' },
];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, value) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const snake = (value) => String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
const uniq = (values) => [...new Set(values.filter(Boolean))];
const hasVi = (value) => /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(value || '');
const human = (value) => snake(value).split('_').filter(Boolean).map((part) => (/^[a-z]{1,3}$/.test(part) ? part.toUpperCase() : `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)).join(' ');
const normStatus = (value) => snake(value).replace(/^status_/, '');
const singular = (name) => (name.endsWith('ies') ? `${name.slice(0, -3)}y` : name.endsWith('s') && !name.endsWith('ss') ? name.slice(0, -1) : name);
const sortObj = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));

function viLabel(key, fallback = '') {
  if (fallback && hasVi(fallback)) return fallback;
  const words = snake(key).split('_').filter(Boolean);
  const label = words.map((word) => {
    if (statusVi[word]) return statusVi[word].toLowerCase();
    if (word === 'id') return 'mã';
    return tokenTranslations?.[word] ? String(tokenTranslations[word]).toLowerCase() : human(word).toLowerCase();
  }).join(' ').replace(/\s+/g, ' ').trim();
  return hasVi(label) ? label.replace(/^./, (char) => char.toUpperCase()) : `Trường ${human(key)}`;
}

function statusLabelVi(value) {
  const normalized = normStatus(value);
  const label = statusVi[normalized] || (hasVi(value) ? value : viLabel(normalized));
  return hasVi(label) ? label : `Trạng thái ${human(value)}`;
}

function statusLabelEn(value) {
  return /^[A-Z0-9_ -]+$/.test(String(value)) && !String(value).includes(' ') ? String(value) : human(value);
}

function statusColor(value) {
  const normalized = normStatus(value);
  if (/(cancel|reject|fail|lost|void|conflict|terminate)/.test(normalized)) return '#dc2626';
  if (/(closed|completed|verified|won|paid|posted|reconciled|cleared|shipped|delivered|released|implemented)/.test(normalized)) return '#16a34a';
  if (/(approved|published|accepted|qualified|active|validated|renewed)/.test(normalized)) return '#2563eb';
  if (/(review|pending|submitted|reported|assigned|processing|monitoring|planning)/.test(normalized)) return '#7c3aed';
  if (/(hold|paused|suspended|investigating|corrective|maintenance|expiring|frozen)/.test(normalized)) return '#f59e0b';
  return '#64748b';
}

function statusIcon(value) {
  const normalized = normStatus(value);
  if (/(cancel|reject|fail|lost|void)/.test(normalized)) return 'Ban';
  if (/(closed|completed|verified|won|paid|posted|reconciled|cleared|delivered)/.test(normalized)) return 'CheckCircle2';
  if (/(approved|released|published|accepted|qualified|active)/.test(normalized)) return 'BadgeCheck';
  if (/(review|pending|submitted|reported|processing|planning)/.test(normalized)) return 'ClipboardCheck';
  if (/(hold|paused|suspended|investigating)/.test(normalized)) return 'PauseCircle';
  return 'FileEdit';
}

function standardFor(domain) {
  if (['calibration_equipment', 'quality_lab'].includes(domain)) return 'NADCAP';
  if (regulatedDomains.has(domain)) return 'AS9100';
  if (/(system|analytics|bi_datawarehouse|customer_portal|mobile_operations|forms_system|record_system)/.test(domain)) return 'internal';
  return 'ISO9001';
}

function rolesFor(domain) {
  const base = domain.replace(/^mes_/, 'mes').replace(/^bi_/, 'data');
  return uniq([`${base}_owner`, `${base}_manager`, regulatedDomains.has(domain) ? 'quality_manager' : null]);
}

function fieldType(dbType = '', uiType = '') {
  const type = String(uiType || dbType).toLowerCase();
  const db = String(dbType).toUpperCase();
  if (/badge/.test(type)) return 'badge';
  if (/select|reference/.test(type)) return 'select';
  if (/textarea/.test(type)) return 'textarea';
  if (/json/.test(type) || /JSON/.test(db)) return 'json';
  if (/date/.test(type) || /\bDATE\b/.test(db)) return 'date';
  if (/datetime/.test(type) || /TIMESTAMP/.test(db)) return 'datetime';
  if (/boolean/.test(type) || /\bBOOLEAN\b/.test(db)) return 'boolean';
  if (/currency/.test(type) || /(AMOUNT|PRICE|COST|VALUE)/.test(db)) return 'currency';
  if (/percentage/.test(type) || /(PCT|PERCENT|RATIO|YIELD|UTILIZATION|SCORE)/i.test(type)) return 'percentage';
  if (/number|duration|weight|pressure|temperature/.test(type) || /(NUMERIC|DECIMAL|INT|BIGINT|SMALLINT|DOUBLE|REAL)/.test(db)) return 'number';
  return 'string';
}

function maxLength(dbType = '') { const match = String(dbType).match(/(?:VARCHAR|CHAR)\((\d+)\)/i); return match ? Number(match[1]) : null; }
function precisionScale(dbType = '') { const match = String(dbType).match(/(?:NUMERIC|DECIMAL)\((\d+)\s*,\s*(\d+)\)/i); return match ? { precision: Number(match[1]), scale: Number(match[2]) } : null; }

function scanEnums() {
  const enums = new Map();
  const files = fs.readdirSync(migrationsDir).filter((file) => /^\d{3}_.+\.sql$/i.test(file)).sort();
  const regex = /CREATE\s+TYPE\s+([a-zA-Z0-9_."-]+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);/gim;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    let match = regex.exec(raw);
    while (match) {
      enums.set(String(match[1]).replace(/"/g, '').split('.').pop().toLowerCase(), [...match[2].matchAll(/'([^']+)'/g)].map((entry) => entry[1]));
      match = regex.exec(raw);
    }
    regex.lastIndex = 0;
  }
  return enums;
}

function loadDataFields() {
  const indexPath = path.join(registryDir, 'data-fields-index.json');
  const index = fs.existsSync(indexPath) ? readJson(indexPath) : readJson(path.join(registryDir, 'data-fields.json'));
  const endpoints = {};
  if (index.parts) {
    for (const part of index.parts) Object.assign(endpoints, Object.fromEntries(Object.entries(readJson(path.join(registryDir, part.file))).filter(([key]) => key !== '_meta')));
  } else {
    Object.assign(endpoints, Object.fromEntries(Object.entries(index).filter(([key]) => key !== '_meta' && key !== 'parts')));
  }
  return { meta: index._meta || {}, endpoints };
}

function templateKey(domain, tableName, workflowId) {
  const ref = `${domain}_${tableName}_${workflowId}`.toLowerCase();
  if (/(opportunity|lead|quote|pipeline|campaign|commercial)/.test(ref)) return 'generic_pipeline_status';
  if (/(project|milestone|wbs|apqp)/.test(ref)) return 'generic_project_status';
  if (/(incident|audit|finding|risk|ncr|capa|complaint|action|issue|deviation|concession|service_call)/.test(ref)) return 'generic_incident_status';
  if (/(journal|invoice|payment|payroll|reconciliation|treasury|budget|cash|ledger|revenue|asset)/.test(ref)) return 'generic_finance_status';
  if (/(certification|qualification|training|skill|license|permit)/.test(ref)) return 'generic_certificate_status';
  if (/(forecast|scenario|schedule|plan|etl|snapshot|dim|fact|analytics|warehouse)/.test(ref)) return 'generic_data_status';
  if (/(order|shipment|transfer|pick|receipt|dispatch|job|work|operation|execution)/.test(ref)) return 'generic_operational_status';
  return 'generic_review_status';
}

function heuristicValues(domain, tableName, statusColumn, workflowId) {
  const ref = `${domain}_${tableName}_${statusColumn}_${workflowId}`.toLowerCase();
  if (/(sales_order|so_status)/.test(ref)) return ['draft', 'quoted', 'confirmed', 'in_production', 'shipped', 'closed', 'cancelled'];
  if (/(quote|commercial_status|opportunity|lead)/.test(ref)) return ['draft', 'submitted', 'qualified', 'quoted', 'negotiation', 'won', 'lost'];
  if (/(purchase|po_|receipt|transfer_order|pick_list|shipment)/.test(ref)) return ['created', 'released', 'in_progress', 'completed', 'closed', 'cancelled'];
  if (/(job|work_order|operation|dispatch|production|schedule_block|batch|plan_status)/.test(ref)) return ['planned', 'released', 'in_progress', 'completed', 'closed', 'cancelled'];
  if (/(maintenance|pm_|equipment|fixture|tool|asset)/.test(ref)) return ['active', 'on_hold', 'maintenance', 'retired'];
  if (/(document|change|revision|ecr|eco|approval|contract)/.test(ref)) return ['draft', 'submitted', 'in_review', 'approved', 'released', 'closed', 'cancelled'];
  if (/(incident|complaint|ncr|capa|audit|finding|risk|deviation|concession|nonconformance)/.test(ref)) return ['open', 'contained', 'investigating', 'corrective_action', 'verified', 'closed'];
  if (/(pay|invoice|journal|ledger|treasury|reconciliation|customs|lc|declaration)/.test(ref)) return ['draft', 'submitted', 'approved', 'posted', 'closed', 'reversed'];
  if (/(customer|account|vendor|supplier|employee|position|org_unit|site|portal_user)/.test(ref)) return ['active', 'inactive', 'suspended', 'closed'];
  if (/(forecast|scenario|snapshot|etl|analytics|passport)/.test(ref)) return ['draft', 'validated', 'published', 'archived'];
  return genericTemplates[templateKey(domain, tableName, workflowId)].values;
}

function choosePrimary(tables, registry) {
  return [...tables].sort((left, right) => {
    const score = (meta, tableName) => (meta.supportTable ? 100 : 0) + (!meta.statusColumn ? 10 : 0) + (workflowNoise.test(tableName) ? 25 : 0);
    return score(registry[left], left) - score(registry[right], right) || left.localeCompare(right);
  })[0];
}

function detectDate(tableMeta, names) {
  return names.find((name) => tableMeta.columns?.[name]) || null;
}

function statusEntry(setKey, values, options = {}) {
  const list = uniq(values).map((value) => String(value));
  return {
    label: options.label || viLabel(setKey),
    labelEn: options.labelEn || human(setKey),
    source: options.source || 'workflow_template',
    standard: options.standard || 'internal',
    primaryTable: options.primaryTable || null,
    statusColumn: options.statusColumn || null,
    referencedByTables: uniq(options.referencedByTables || []),
    referencedByWorkflows: uniq(options.referencedByWorkflows || []),
    aliasOf: options.aliasOf || null,
    options: list.map((value, index) => ({
      value,
      label: statusLabelVi(value),
      labelEn: statusLabelEn(value),
      color: statusColor(value),
      icon: statusIcon(value),
      allowedTransitionsFrom: index === 0 ? [] : list.slice(Math.max(0, index - 2), index),
    })),
  };
}

function transitionTrigger(fromValue, toValue) {
  const to = normStatus(toValue);
  if (/submitted|pending_review|in_review/.test(to)) return 'submit';
  if (/approved/.test(to)) return 'approve';
  if (/released|published|issued/.test(to)) return /published/.test(to) ? 'publish' : 'release';
  if (/qualified/.test(to)) return 'qualify';
  if (/quoted/.test(to)) return 'quote';
  if (/negotiation/.test(to)) return 'negotiate';
  if (/assigned/.test(to)) return 'assign';
  if (/in_progress|execution|processing|running|active/.test(to)) return 'start';
  if (/corrective_action/.test(to)) return 'launch_corrective_action';
  if (/investigating/.test(to)) return 'investigate';
  if (/contained/.test(to)) return 'contain';
  if (/verified|validated/.test(to)) return 'verify';
  if (/completed/.test(to)) return 'complete';
  if (/closed|closure/.test(to)) return 'close';
  if (/posted/.test(to)) return 'post';
  if (/paid/.test(to)) return 'pay';
  if (/reconciled/.test(to)) return 'reconcile';
  if (/cleared/.test(to)) return 'clear_customs';
  if (/shipped|delivered/.test(to)) return /delivered/.test(to) ? 'deliver' : 'ship';
  if (/cancelled|void/.test(to)) return 'cancel';
  if (/rejected|lost|disqualified/.test(to)) return /lost/.test(to) ? 'mark_lost' : 'reject';
  if (/expired|retired|archived|obsolete|terminated/.test(to)) return /archived/.test(to) ? 'archive' : 'retire';
  if (/renewed/.test(to)) return 'renew';
  if (/revised/.test(to)) return 'revise';
  if (/synced/.test(to)) return 'sync';
  return 'transition';
}

function transitionLabel(trigger, vi = true) {
  const labels = {
    submit: ['Gửi xử lý', 'Submit'], approve: ['Phê duyệt', 'Approve'], release: ['Phát hành', 'Release'],
    publish: ['Công bố', 'Publish'], qualify: ['Đánh giá đủ điều kiện', 'Qualify'], quote: ['Lập báo giá', 'Quote'],
    negotiate: ['Đàm phán', 'Negotiate'], assign: ['Phân công', 'Assign'], start: ['Bắt đầu thực hiện', 'Start'],
    investigate: ['Điều tra', 'Investigate'], contain: ['Ngăn chặn', 'Contain'], launch_corrective_action: ['Khởi tạo hành động khắc phục', 'Launch Corrective Action'],
    verify: ['Xác nhận hiệu lực', 'Verify'], complete: ['Hoàn thành', 'Complete'], close: ['Đóng hồ sơ', 'Close'],
    post: ['Hạch toán', 'Post'], pay: ['Thanh toán', 'Pay'], reconcile: ['Đối soát', 'Reconcile'],
    clear_customs: ['Thông quan', 'Clear Customs'], ship: ['Xuất giao', 'Ship'], deliver: ['Hoàn tất giao hàng', 'Deliver'],
    cancel: ['Hủy', 'Cancel'], reject: ['Từ chối', 'Reject'], mark_lost: ['Đánh dấu thua', 'Mark Lost'],
    retire: ['Ngưng sử dụng', 'Retire'], archive: ['Lưu trữ', 'Archive'], renew: ['Gia hạn', 'Renew'],
    revise: ['Điều chỉnh', 'Revise'], sync: ['Đồng bộ', 'Synchronize'], transition: ['Chuyển trạng thái', 'Transition'],
  };
  return labels[trigger]?.[vi ? 0 : 1] || labels.transition[vi ? 0 : 1];
}

function hoursFor(value) {
  const normalized = normStatus(value);
  if (/draft|new|created|prospect/.test(normalized)) return 24;
  if (/submitted|pending|review|reported|assigned/.test(normalized)) return 48;
  if (/approved|released|published|qualified|quoted|negotiation|processing/.test(normalized)) return 24;
  if (/active|running|in_progress|execution|monitoring|investigating|corrective_action/.test(normalized)) return 72;
  return 24;
}

function fieldContexts(fieldRegistry, tableRegistry, parsed) {
  const map = new Map();
  for (const [endpointKey, fields] of Object.entries(fieldRegistry.endpoints)) {
    const [domain, entity = domain] = endpointKey.split('.');
    for (const field of fields) {
      const source = field.source || 'db_column';
      const sig = ['db_column', 'join'].includes(source) ? `${source}|${field.dbTable}|${field.dbColumn}|${field.key}` : `${source}|${field.key}`;
      if (!map.has(sig)) map.set(sig, { ...field, source, domains: new Set(), entities: new Set(), endpoints: new Set(), constraints: { ...(field.constraints || {}) } });
      const ctx = map.get(sig);
      ctx.domains.add(domain);
      ctx.entities.add(field.dbTable ? singular(field.dbTable) : singular(entity));
      ctx.endpoints.add(endpointKey);
      ctx.required = ctx.required || Boolean(field.required);
      if (field.dbTable && field.dbColumn) {
        const regCol = tableRegistry.tables[field.dbTable]?.columns?.[field.dbColumn];
        const parsedCol = parsed.tables.get(field.dbTable)?.columns.get(field.dbColumn);
        ctx.dbType = regCol?.type || parsedCol?.type || null;
        ctx.required = ctx.required || Boolean(regCol?.required || parsedCol?.required);
        if (!ctx.label) ctx.label = regCol?.label || viLabel(field.dbColumn);
        if (!ctx.labelEn) ctx.labelEn = regCol?.labelEn || human(field.dbColumn);
        if (!ctx.type) ctx.type = fieldType(ctx.dbType, regCol?.uiType);
        if (!ctx.constraints.maxLength) ctx.constraints.maxLength = maxLength(ctx.dbType);
        if (!ctx.constraints.precision) Object.assign(ctx.constraints, precisionScale(ctx.dbType) || {});
        if (!ctx.constraints.values && parsedCol?.checkValues?.length) ctx.constraints.values = parsedCol.checkValues;
      }
      if (!ctx.label) ctx.label = viLabel(field.key);
      if (!ctx.labelEn) ctx.labelEn = human(field.key);
    }
  }
  return [...map.values()];
}

function buildRules(contexts, statusSets) {
  const rules = [];
  const seen = new Set();
  let seq = 1;
  const push = (rule) => {
    const signature = [rule.entity, rule.field, rule.type, JSON.stringify(rule.params || {}), rule.dbTable || '', rule.dbColumn || ''].join('|');
    if (seen.has(signature)) return;
    seen.add(signature);
    rules.push({ ...rule, ruleId: `val_${String(seq++).padStart(5, '0')}` });
  };
  for (const ctx of contexts) {
    const entity = uniq([...ctx.entities])[0] || singular(ctx.dbTable || 'record');
    const type = ctx.type || fieldType(ctx.dbType);
    const label = ctx.label || viLabel(ctx.key);
    const labelEn = ctx.labelEn || human(ctx.key);
    if (ctx.required) push({ entity, field: ctx.key, type: 'required', params: {}, message: `${label} là bắt buộc`, messageEn: `${labelEn} is required`, severity: 'error', source: 'migration_not_null', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (['string', 'textarea'].includes(type) && ctx.constraints.maxLength) push({ entity, field: ctx.key, type: 'maxLength', params: { max: Number(ctx.constraints.maxLength) }, message: `${label} không được vượt quá ${ctx.constraints.maxLength} ký tự`, messageEn: `${labelEn} must not exceed ${ctx.constraints.maxLength} characters`, severity: 'error', source: 'migration_type', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (ctx.constraints.pattern) push({ entity, field: ctx.key, type: 'pattern', params: { pattern: ctx.constraints.pattern }, message: `${label} không đúng định dạng yêu cầu`, messageEn: `${labelEn} does not match the required format`, severity: 'error', source: 'field_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (ctx.constraints.enumRef && statusSets[ctx.constraints.enumRef]) push({ entity, field: ctx.key, type: 'enumSet', params: { enumRef: ctx.constraints.enumRef, allowedValues: statusSets[ctx.constraints.enumRef].options.map((option) => option.value) }, message: `${label} phải thuộc tập trạng thái ${ctx.constraints.enumRef}`, messageEn: `${labelEn} must belong to status set ${ctx.constraints.enumRef}`, severity: 'error', source: 'status_options', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (Array.isArray(ctx.constraints.values) && ctx.constraints.values.length) push({ entity, field: ctx.key, type: 'inList', params: { allowedValues: ctx.constraints.values }, message: `${label} phải thuộc danh sách giá trị cho phép`, messageEn: `${labelEn} must belong to the allowed value list`, severity: 'error', source: 'migration_check', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (['number', 'currency', 'percentage'].includes(type)) push({ entity, field: ctx.key, type: 'range', params: type === 'percentage' ? { min: 0, max: 100 } : { min: 0 }, message: type === 'percentage' ? `${label} phải nằm trong khoảng 0 đến 100` : `${label} không được âm`, messageEn: type === 'percentage' ? `${labelEn} must be between 0 and 100` : `${labelEn} must not be negative`, severity: 'error', source: 'numeric_semantics', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (ctx.constraints.precision) push({ entity, field: ctx.key, type: 'precision', params: { precision: ctx.constraints.precision, scale: ctx.constraints.scale ?? 0 }, message: `${label} phải tuân thủ độ chính xác số học đã khai báo`, messageEn: `${labelEn} must respect declared numeric precision`, severity: 'error', source: 'migration_type', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (['date', 'datetime'].includes(type)) push({ entity, field: ctx.key, type: type === 'date' ? 'validDate' : 'validDateTime', params: {}, message: `${label} phải là giá trị ngày giờ hợp lệ`, messageEn: `${labelEn} must be a valid ${type === 'date' ? 'date' : 'datetime'}`, severity: 'error', source: 'field_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (type === 'boolean') push({ entity, field: ctx.key, type: 'boolean', params: {}, message: `${label} phải là giá trị đúng hoặc sai`, messageEn: `${labelEn} must be a boolean value`, severity: 'error', source: 'field_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (type === 'json') push({ entity, field: ctx.key, type: 'validJson', params: {}, message: `${label} phải là JSON hợp lệ`, messageEn: `${labelEn} must be valid JSON`, severity: 'error', source: 'field_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (/_id$/.test(ctx.dbColumn || ctx.key) && ctx.source === 'db_column') push({ entity, field: ctx.key, type: 'referenceExists', params: { required: ctx.required }, message: `${label} phải tham chiếu đến bản ghi hợp lệ`, messageEn: `${labelEn} must reference a valid record`, severity: ctx.required ? 'error' : 'warning', source: 'foreign_key_convention', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
    if (ctx.source === 'join') { push({ entity, field: ctx.key, type: 'readOnly', params: { mode: 'join' }, message: `${label} là trường lấy qua liên kết và chỉ đọc`, messageEn: `${labelEn} is join-derived and read only`, severity: 'warning', source: 'join_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn }); push({ entity, field: ctx.key, type: 'joinConsistency', params: { dbTable: ctx.dbTable, dbColumn: ctx.dbColumn }, message: `${label} phải đồng bộ với dữ liệu nguồn liên kết`, messageEn: `${labelEn} must stay consistent with the joined source`, severity: 'error', source: 'join_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn }); }
    if (ctx.source === 'computed') { push({ entity, field: ctx.key, type: 'formulaExists', params: { fieldKey: ctx.key }, message: `Trường tính toán ${label} phải có công thức đã đăng ký`, messageEn: `Computed field ${labelEn} must have a registered formula`, severity: 'error', source: 'computed_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn }); push({ entity, field: ctx.key, type: 'readOnly', params: { mode: 'computed' }, message: `${label} là trường tính toán và chỉ đọc`, messageEn: `${labelEn} is computed and read only`, severity: 'warning', source: 'computed_registry', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn }); }
    if (ctx.source === 'param') push({ entity, field: ctx.key, type: 'apiParam', params: { allowedEndpoints: [...ctx.endpoints].sort() }, message: `${label} là tham số API và chỉ hợp lệ trong ngữ cảnh endpoint phù hợp`, messageEn: `${labelEn} is an API parameter and is only valid in matching endpoint context`, severity: 'warning', source: 'api_contract', dbTable: ctx.dbTable, dbColumn: ctx.dbColumn });
  }
  return rules.sort((a, b) => a.entity.localeCompare(b.entity) || a.field.localeCompare(b.field) || a.type.localeCompare(b.type) || a.ruleId.localeCompare(b.ruleId));
}

function formulaVars(expression) {
  return uniq([...String(expression).matchAll(/\b([a-z_][a-z0-9_]*)\b/gi)].map((match) => match[1]).filter((name) => !['sum', 'avg', 'count', 'filter', 'where', 'case', 'when', 'then', 'else', 'end', 'nullif', 'extract', 'epoch', 'from', 'now', 'date_trunc', 'distinct', 'and', 'or', 'not', 'in'].includes(name.toLowerCase())));
}

function formulaEntry(formulaId, name, nameEn, category, formula, tables, domain, unit = 'number') {
  const target = unit === 'percentage' ? { worldClass: 98, minimum: 90 } : category === 'quality' ? { worldClass: 99, minimum: 95 } : { worldClass: 95, minimum: 80 };
  return { formulaId, name, nameEn, category, domain, formula, variables: formulaVars(formula), unit, target, dataSource: { tables: uniq(tables).slice(0, 8), refreshInterval: category === 'analytics' ? '15m' : '60m' } };
}

function buildFormulas(currentFormulas, orphanResolution, domainArchitecture, tableRegistry) {
  const formulas = Object.fromEntries(Object.entries(currentFormulas).filter(([key]) => key !== '_meta'));
  const hints = {
    accuracy_pct: ['(accurate_count / NULLIF(total_count, 0)) * 100', 'percentage', 'quality'],
    accuracy_trend: ['AVG(accuracy_pct) OVER (ORDER BY snapshot_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)', 'percentage', 'analytics'],
    backlog_value: ['SUM(open_order_value)', 'currency', 'financial'],
    book_to_bill_ratio: ['SUM(booked_value) / NULLIF(SUM(billed_value), 0)', 'number', 'financial'],
    buy_to_fly: ['SUM(raw_material_weight) / NULLIF(SUM(finished_part_weight), 0)', 'number', 'production'],
    capacity: ['SUM(available_hours)', 'number', 'planning'],
    completion_pct: ['(completed_qty / NULLIF(planned_qty, 0)) * 100', 'percentage', 'production'],
    confidence: ['AVG(confidence_score)', 'percentage', 'analytics'],
    conversion_rate: ['(won_quote_count / NULLIF(total_quote_count, 0)) * 100', 'percentage', 'sales'],
    cost_per_part: ['SUM(total_cost) / NULLIF(SUM(completed_qty), 0)', 'currency', 'financial'],
    current_counter: ['MAX(counter_reading)', 'number', 'maintenance'],
    current_wear_pct: ['MAX(wear_pct)', 'percentage', 'maintenance'],
    cycle_time: ['AVG(actual_cycle_time_sec)', 'number', 'production'],
    daily_trend: ['AVG(metric_value) OVER (PARTITION BY metric_key ORDER BY snapshot_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)', 'number', 'analytics'],
    monthly_trend: ['AVG(metric_value) OVER (PARTITION BY metric_key ORDER BY snapshot_month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW)', 'number', 'analytics'],
  };
  for (const field of orphanResolution.orphan_fields.computed.fields || []) {
    if (formulas[field.key]) continue;
    const [formula, unit, category] = hints[field.key] || [`calc_${snake(field.key)}`, /(pct|rate|ratio|yield|confidence)/.test(field.key) ? 'percentage' : /(cost|value|amount|price)/.test(field.key) ? 'currency' : 'number', /(cost|value|amount|price)/.test(field.key) ? 'financial' : 'analytics'];
    formulas[field.key] = formulaEntry(field.key, viLabel(field.key), human(field.key), category, formula, ['registry_support'], 'cross_domain', unit);
  }
  for (const field of orphanResolution.orphan_fields.aggregate.fields || []) {
    if (formulas[field.key]) continue;
    const formula = /_this_week$/.test(field.key) ? "COUNT(*) FILTER (WHERE created_at >= date_trunc('week', now()))" : /_this_month$/.test(field.key) ? "COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))" : /(count|open|total|completed|closed|alerts|anomalies|conflict)/.test(field.key) ? 'COUNT(*)' : /(cost|value|amount)/.test(field.key) ? 'SUM(amount)' : `agg_${snake(field.key)}`;
    formulas[field.key] = formulaEntry(field.key, viLabel(field.key), human(field.key), /(cost|value|amount)/.test(field.key) ? 'financial' : 'analytics', formula, ['registry_support'], 'cross_domain', /(cost|value|amount)/.test(field.key) ? 'currency' : 'number');
  }
  const domainMetrics = [
    ['record_count', 'Số hồ sơ', 'Record Count', 'analytics', 'number', () => 'COUNT(*)'],
    ['active_count', 'Số hồ sơ đang mở', 'Active Record Count', 'analytics', 'number', (tableMeta) => tableMeta.statusColumn ? `COUNT(*) FILTER (WHERE ${tableMeta.statusColumn} NOT IN ('closed','completed','cancelled','archived','retired'))` : 'COUNT(*)'],
    ['closure_rate_pct', 'Tỷ lệ đóng', 'Closure Rate Percent', 'quality', 'percentage', (tableMeta) => tableMeta.statusColumn ? `(COUNT(*) FILTER (WHERE ${tableMeta.statusColumn} IN ('closed','completed','verified','approved','posted','delivered')) / NULLIF(COUNT(*), 0)) * 100` : '(closed_count / NULLIF(total_count, 0)) * 100'],
    ['cycle_time_hours', 'Thời gian chu kỳ giờ', 'Cycle Time Hours', 'production', 'number', (tableMeta) => { const start = detectDate(tableMeta, ['actual_start', 'actual_start_date', 'started_at', 'start_date', 'opened_at', 'created_at', 'submitted_at', 'order_date']); const end = detectDate(tableMeta, ['actual_end', 'actual_end_date', 'completed_at', 'closed_at', 'resolved_at', 'verified_at', 'posted_at', 'shipped_at', 'delivered_at', 'updated_at']); return start && end ? `AVG(EXTRACT(EPOCH FROM (${end} - ${start})) / 3600)` : 'AVG(processing_hours)'; }],
    ['on_time_rate_pct', 'Tỷ lệ đúng hạn', 'On-Time Rate Percent', 'planning', 'percentage', (tableMeta) => { const end = detectDate(tableMeta, ['actual_end', 'actual_end_date', 'completed_at', 'closed_at', 'resolved_at', 'verified_at', 'posted_at', 'shipped_at', 'delivered_at', 'updated_at']); const due = detectDate(tableMeta, ['due_date', 'required_date', 'promise_date', 'expected_close_date', 'scheduled_ship_date', 'valid_to', 'expiry_date']); return end && due ? `(COUNT(*) FILTER (WHERE ${end} <= ${due}) / NULLIF(COUNT(*), 0)) * 100` : '(on_time_count / NULLIF(total_count, 0)) * 100'; }],
  ];
  for (const [domainKey, domainEntry] of Object.entries(domainArchitecture.domains || {})) {
    const tables = domainEntry.tables || [];
    if (!tables.length) continue;
    const primaryTable = tables.find((tableName) => tableRegistry.tables[tableName]?.statusColumn) || tables[0];
    const tableMeta = tableRegistry.tables[primaryTable];
    for (const [suffix, label, labelEn, category, unit, builder] of domainMetrics) {
      const formulaId = `${domainKey}_${suffix}`;
      if (!formulas[formulaId]) formulas[formulaId] = formulaEntry(formulaId, `${domainEntry.label} ${label}`, `${domainEntry.labelEn} ${labelEn}`, category, builder(tableMeta), tables.slice(0, 6), domainKey, unit);
    }
  }
  return sortObj(formulas);
}

function main() {
  const tableRegistry = readJson(path.join(registryDir, 'table-registry.json'));
  const domainArchitecture = readJson(path.join(registryDir, 'domain-architecture.json'));
  const orphanResolution = readJson(path.join(registryDir, 'orphan-resolution.json'));
  const currentWorkflows = readJson(path.join(registryDir, 'workflow-library.json'));
  const currentStatus = readJson(path.join(registryDir, 'status-options.json'));
  const currentFormulas = readJson(path.join(registryDir, 'computed-formulas.json'));
  const parsed = parseMigrations();
  const enums = scanEnums();
  const fields = loadDataFields();

  const workflowGroups = new Map();
  for (const [tableName, tableMeta] of Object.entries(tableRegistry.tables)) {
    if (!tableMeta.workflowId) continue;
    if (!workflowGroups.has(tableMeta.workflowId)) workflowGroups.set(tableMeta.workflowId, []);
    workflowGroups.get(tableMeta.workflowId).push(tableName);
  }

  const statusOptions = {};
  const tableSetKey = new Map();
  const canonicalRefs = new Map();
  for (const [tableName, tableMeta] of Object.entries(tableRegistry.tables)) {
    if (!tableMeta.statusColumn) continue;
    const parsedCol = parsed.tables.get(tableName)?.columns.get(tableMeta.statusColumn);
    const typeKey = String(tableMeta.columns?.[tableMeta.statusColumn]?.type || parsedCol?.type || '').replace(/"/g, '').split('.').pop().toLowerCase();
    const currentSet = currentStatus[tableMeta.statusSet];
    const values = parsedCol?.checkValues?.length ? parsedCol.checkValues : enums.get(typeKey)?.length ? enums.get(typeKey) : currentSet?.options?.length ? currentSet.options.map((option) => option.value) : heuristicValues(tableMeta.domain, tableName, tableMeta.statusColumn, tableMeta.workflowId);
    const setKey = `${tableName}__${tableMeta.statusColumn}`;
    tableSetKey.set(tableName, setKey);
    statusOptions[setKey] = statusEntry(setKey, values, { label: `Trạng thái ${tableMeta.label}`, labelEn: `${tableMeta.labelEn} Status`, source: parsedCol?.checkValues?.length ? 'migration_check' : enums.has(typeKey) ? 'migration_enum' : currentSet ? 'registry_seed' : 'domain_template', standard: standardFor(tableMeta.domain), primaryTable: tableName, statusColumn: tableMeta.statusColumn, referencedByTables: [tableName], referencedByWorkflows: tableMeta.workflowId ? [tableMeta.workflowId] : [] });
    if (tableMeta.statusSet) {
      if (!canonicalRefs.has(tableMeta.statusSet)) canonicalRefs.set(tableMeta.statusSet, []);
      canonicalRefs.get(tableMeta.statusSet).push(tableName);
    }
  }
  for (const [statusSetKey, tables] of canonicalRefs.entries()) {
    const currentSet = currentStatus[statusSetKey];
    const primaryTable = tables[0];
    const values = currentSet?.options?.length ? currentSet.options.map((option) => option.value) : statusOptions[tableSetKey.get(primaryTable)].options.map((option) => option.value);
    statusOptions[statusSetKey] = statusEntry(statusSetKey, values, { label: currentSet?.label || `Tập trạng thái ${statusSetKey}`, labelEn: currentSet?.labelEn || human(statusSetKey), source: currentSet ? 'registry_seed' : 'status_alias', standard: standardFor(tableRegistry.tables[primaryTable].domain), primaryTable, statusColumn: tableRegistry.tables[primaryTable].statusColumn, referencedByTables: tables, referencedByWorkflows: uniq(tables.map((tableName) => tableRegistry.tables[tableName].workflowId)), aliasOf: tableSetKey.get(primaryTable) });
  }
  for (const [templateKeyName, template] of Object.entries(genericTemplates)) statusOptions[templateKeyName] = statusEntry(templateKeyName, template.values, { label: template.label, labelEn: template.labelEn, source: 'workflow_template', standard: 'internal', referencedByTables: [], referencedByWorkflows: [] });

  const workflows = {};
  const statusValueSet = new Set(Object.values(statusOptions).flatMap((entry) => entry.options.map((option) => option.value)));
  for (const [workflowId, tables] of workflowGroups.entries()) {
    const primaryTable = choosePrimary(tables, tableRegistry.tables);
    const primaryMeta = tableRegistry.tables[primaryTable];
    const domainMeta = domainArchitecture.domains?.[primaryMeta.domain] || {};
    const chosenSet = primaryMeta.statusColumn ? tableSetKey.get(primaryTable) : templateKey(primaryMeta.domain, primaryTable, workflowId);
    statusOptions[chosenSet].referencedByWorkflows = uniq([...(statusOptions[chosenSet].referencedByWorkflows || []), workflowId]);
    const states = statusOptions[chosenSet].options.map((option) => ({
      id: option.value,
      label: option.label,
      labelEn: option.labelEn,
      color: option.color,
      entryActions: uniq([/draft|new|created|reported/.test(normStatus(option.value)) ? 'assign_workflow_owner' : null, /review|pending|submitted/.test(normStatus(option.value)) ? 'route_for_review' : null, /approved|released|published|active/.test(normStatus(option.value)) ? 'release_control_plan' : null, /in_progress|processing|running/.test(normStatus(option.value)) ? 'capture_execution_snapshot' : null, /closed|completed|verified|posted|paid|delivered|archived/.test(normStatus(option.value)) ? 'lock_record' : null]),
      exitActions: uniq(['validate_transition_readiness', regulatedDomains.has(primaryMeta.domain) ? 'record_audit_trail' : null]),
    }));
    const requiredField = Object.entries(primaryMeta.columns || {}).find(([columnName, columnMeta]) => columnMeta.required && !genericAudit.has(columnName) && columnName !== primaryMeta.statusColumn && !columnMeta.pk);
    const negativeTerminal = states.filter((state) => /(cancel|reject|lost|void|not_effective|not effective|fail|disqual|waiv)/.test(normStatus(state.id)));
    const linearStates = states.filter((state) => !negativeTerminal.some((terminal) => terminal.id === state.id));
    const branchSource = negativeTerminal.length
      ? (/(closed|completed|verified|won|posted|delivered|paid|archived|expired|retired)/.test(normStatus(linearStates.at(-1)?.id || '')) ? linearStates.at(-2) : linearStates.at(-1)) || linearStates[0] || states[0]
      : null;
    const pairs = [
      ...linearStates.slice(0, -1).map((state, index) => [state, linearStates[index + 1]]),
      ...negativeTerminal.map((state) => [branchSource, state]).filter(([from]) => from),
    ];
    const transitions = pairs.map(([state, next]) => {
      const trigger = transitionTrigger(state.id, next.id);
      const stamp = detectDate(primaryMeta, [`${normStatus(next.id)}_at`, `${normStatus(next.id)}_date`, 'updated_at']);
      return {
        from: state.id,
        to: next.id,
        trigger,
        label: transitionLabel(trigger, true),
        labelEn: transitionLabel(trigger, false),
        guards: [{ type: 'role', roles: rolesFor(primaryMeta.domain) }, ...(requiredField ? [{ type: 'fieldRequired', field: requiredField[0], message: `Phải có ${requiredField[1].label || viLabel(requiredField[0])}` }] : [])],
        actions: [{ type: 'notify', to: rolesFor(primaryMeta.domain)[0], template: `${workflowId}_${trigger}` }, ...(stamp ? [{ type: 'setField', field: stamp, value: 'NOW()' }] : []), ...(regulatedDomains.has(primaryMeta.domain) ? [{ type: 'evidence', action: 'snapshot', reason: `${primaryMeta.label} - ${transitionLabel(trigger, true)}` }] : [])],
      };
    });
    workflows[workflowId] = {
      workflowId,
      name: currentWorkflows.workflows?.[workflowId]?.name || `Luồng xử lý ${primaryMeta.label}`,
      nameEn: currentWorkflows.workflows?.[workflowId]?.nameEn || `${primaryMeta.labelEn} Workflow`,
      entity: singular(primaryTable),
      domain: primaryMeta.domain,
      standard: standardFor(primaryMeta.domain),
      primaryTable,
      relatedTables: uniq([...tables.filter((tableName) => tableName !== primaryTable), ...(primaryMeta.foreignKeys || []).map((foreignKey) => String(foreignKey.references).split('.')[0])]).filter((tableName) => tableRegistry.tables[tableName]).slice(0, 12),
      statusSet: chosenSet,
      states,
      transitions,
      sla: Object.fromEntries(states.slice(0, -1).map((state, index) => [`${normStatus(state.id)}_to_${normStatus(states[index + 1].id)}`, { hours: hoursFor(states[index + 1].id), escalateTo: rolesFor(primaryMeta.domain)[0] }])),
      digitalThread: { upstreamTriggers: uniq([`${primaryTable}_created`, ...((domainMeta.upstreamDomains || []).slice(0, 4).map((domainKey) => `${domainKey}_released`))]), downstreamEffects: uniq([ ...((domainMeta.downstreamDomains || []).slice(0, 4).map((domainKey) => `${domainKey}_sync_${singular(primaryTable)}`)), regulatedDomains.has(primaryMeta.domain) ? 'evidence_snapshot' : null ]) },
    };
  }
  for (const workflow of Object.values(workflows)) for (const state of workflow.states) if (!statusValueSet.has(state.id)) throw new Error(`Workflow state ${state.id} missing in status-options`);
  for (const [setKey, entry] of Object.entries(statusOptions)) {
    if ((entry.referencedByTables?.length || 0) + (entry.referencedByWorkflows?.length || 0) < 1) delete statusOptions[setKey];
  }

  const rules = buildRules(fieldContexts(fields, tableRegistry, parsed), statusOptions);
  const formulas = buildFormulas(currentFormulas, orphanResolution, domainArchitecture, tableRegistry);
  const workflowLibrary = { _meta: { version: '4.0', description: 'Workflow governance rebuilt from full schema coverage, domain architecture, and benchmark lifecycle patterns.', generatedAt, workflowCount: Object.keys(workflows).length, domainCoverage: uniq(Object.values(workflows).map((workflow) => workflow.domain)).length, researchReferences }, workflows: sortObj(workflows) };
  const statusRegistry = { _meta: { version: '4.0', description: 'Status option sets rebuilt from table-registry status columns, migration enums/checks, and workflow templates.', generatedAt, statusSetCount: Object.keys(statusOptions).length, enumCount: Object.keys(statusOptions).length, referencedTableCount: Object.values(tableRegistry.tables).filter((table) => table.statusColumn).length, researchReferences }, ...sortObj(statusOptions) };
  const validationRegistry = { _meta: { version: '4.0', description: 'Validation rules regenerated from migration NOT NULL/CHECK semantics, field constraints, and workflow governance requirements.', generatedAt, ruleCount: rules.length, uniqueFieldContexts: fieldContexts(fields, tableRegistry, parsed).length, researchReferences }, rules };
  const computedRegistry = { _meta: { version: '4.0', description: 'Computed formulas regenerated for cross-domain KPIs, derived fields, and dashboard aggregates.', generatedAt, formulaCount: Object.keys(formulas).length, domainCoverage: Object.keys(domainArchitecture.domains || {}).length, researchReferences }, ...formulas };

  if (workflowLibrary._meta.workflowCount < 60) throw new Error(`Expected at least 60 workflows, found ${workflowLibrary._meta.workflowCount}`);
  for (const domainKey of Object.keys(domainArchitecture.domains || {})) if (!Object.values(workflowLibrary.workflows).some((workflow) => workflow.domain === domainKey)) throw new Error(`Domain ${domainKey} has no workflow`);
  if (statusRegistry._meta.statusSetCount < 180) throw new Error(`Expected at least 180 status sets, found ${statusRegistry._meta.statusSetCount}`);
  if (!Object.entries(statusRegistry).filter(([key]) => key !== '_meta').every(([, entry]) => (entry.referencedByTables?.length || 0) + (entry.referencedByWorkflows?.length || 0) > 0)) throw new Error('Found orphaned status set');
  if (validationRegistry._meta.ruleCount < 5000) throw new Error(`Expected at least 5000 validation rules, found ${validationRegistry._meta.ruleCount}`);
  if (computedRegistry._meta.formulaCount < 200) throw new Error(`Expected at least 200 formulas, found ${computedRegistry._meta.formulaCount}`);
  if (!Object.entries(statusRegistry).filter(([key]) => key !== '_meta').flatMap(([, entry]) => entry.options.map((option) => option.label)).every((label) => hasVi(label))) throw new Error('Found status label without Vietnamese diacritics');

  writeJson(path.join(registryDir, 'workflow-library.json'), workflowLibrary);
  writeJson(path.join(registryDir, 'status-options.json'), statusRegistry);
  writeJson(path.join(registryDir, 'validation-rules.json'), validationRegistry);
  writeJson(path.join(registryDir, 'computed-formulas.json'), computedRegistry);
  process.stdout.write(`${JSON.stringify({ workflowCount: workflowLibrary._meta.workflowCount, statusSetCount: statusRegistry._meta.statusSetCount, validationRuleCount: validationRegistry._meta.ruleCount, formulaCount: computedRegistry._meta.formulaCount }, null, 2)}\n`);
}

main();
