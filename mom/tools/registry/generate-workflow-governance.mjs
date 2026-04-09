import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const generatedAt = new Date().toISOString();

const STANDARD_BY_DOMAIN = {
  quality_management: 'AS9100',
  calibration_equipment: 'ISO17025',
  audit_risk: 'ISO9001',
  document_control: 'ISO9001',
  supplier_relationship: 'AS9100',
  shipping_compliance: 'AS9100',
  trade_compliance: 'ITAR/EAR',
  ehs_sustainability: 'ISO14001',
  plant_maintenance: 'internal',
  mes_execution: 'internal',
  fmea_apqp: 'AIAG',
  quality_lab: 'ISO17025',
};

const CATEGORY_BY_DOMAIN = {
  quality_management: 'quality',
  audit_risk: 'quality',
  quality_lab: 'quality',
  fmea_apqp: 'quality',
  production: 'manufacturing',
  mes_execution: 'manufacturing',
  mfg_engineering: 'manufacturing',
  tooling_lifecycle: 'manufacturing',
  master_data: 'manufacturing',
  calibration_equipment: 'maintenance',
  plant_maintenance: 'maintenance',
  sales: 'planning',
  advanced_planning: 'planning',
  demand_supply_planning: 'planning',
  purchasing: 'supplier',
  supplier_relationship: 'supplier',
  inventory: 'supplier',
  warehouse_management: 'supplier',
  finance: 'finance',
  finance_extended: 'finance',
  finance_treasury: 'finance',
  shipping_compliance: 'compliance',
  transportation: 'compliance',
  trade_compliance: 'compliance',
  document_control: 'compliance',
  evidence_vault: 'compliance',
  digital_product_passport: 'compliance',
  core_system: 'system',
  system_infrastructure: 'system',
  forms_system: 'system',
  record_system: 'system',
  customer_portal: 'system',
};

const ROLE_GUARDS_BY_DOMAIN = {
  quality_management: ['quality_engineer', 'quality_manager', 'system_admin'],
  audit_risk: ['quality_manager', 'compliance_manager', 'system_admin'],
  calibration_equipment: ['metrology_technician', 'quality_manager', 'system_admin'],
  plant_maintenance: ['maintenance_supervisor', 'plant_manager', 'system_admin'],
  production: ['production_supervisor', 'operations_manager', 'system_admin'],
  mes_execution: ['production_supervisor', 'operations_manager', 'system_admin'],
  purchasing: ['buyer', 'purchasing_manager', 'system_admin'],
  supplier_relationship: ['supplier_quality_engineer', 'purchasing_manager', 'system_admin'],
  sales: ['sales_manager', 'program_manager', 'system_admin'],
  finance: ['accountant', 'finance_manager', 'system_admin'],
  finance_extended: ['finance_manager', 'controller', 'system_admin'],
  finance_treasury: ['treasury_manager', 'controller', 'system_admin'],
  transportation: ['logistics_manager', 'shipping_manager', 'trade_compliance_officer', 'system_admin'],
  shipping_compliance: ['shipping_manager', 'trade_compliance_officer', 'system_admin'],
  trade_compliance: ['trade_compliance_officer', 'export_control_manager', 'system_admin'],
  document_control: ['document_controller', 'quality_manager', 'system_admin'],
  hcm_workforce: ['hr_manager', 'training_coordinator', 'system_admin'],
  warehouse_management: ['warehouse_supervisor', 'logistics_manager', 'system_admin'],
  customer_portal: ['customer_service_manager', 'system_admin'],
};

const STATUS_LABELS = {
  draft: ['Nháp', 'Draft'],
  new: ['Mới', 'New'],
  submitted: ['Đã gửi', 'Submitted'],
  under_review: ['Đang xem xét', 'Under Review'],
  review: ['Xem xét', 'Review'],
  approved: ['Đã phê duyệt', 'Approved'],
  released: ['Đã phát hành', 'Released'],
  published: ['Đã công bố', 'Published'],
  in_progress: ['Đang thực hiện', 'In Progress'],
  active: ['Hoạt động', 'Active'],
  picking: ['Đang lấy hàng', 'Picking'],
  packed: ['Đã đóng gói', 'Packed'],
  shipped: ['Đã giao vận', 'Shipped'],
  in_transit: ['Đang vận chuyển', 'In Transit'],
  delivered: ['Đã giao', 'Delivered'],
  received: ['Đã nhận', 'Received'],
  verified: ['Đã xác nhận', 'Verified'],
  validated: ['Đã xác thực', 'Validated'],
  implemented: ['Đã triển khai', 'Implemented'],
  posted: ['Đã hạch toán', 'Posted'],
  completed: ['Hoàn thành', 'Completed'],
  closed: ['Đã đóng', 'Closed'],
  archived: ['Đã lưu trữ', 'Archived'],
  frozen: ['Đã đóng băng', 'Frozen'],
  on_hold: ['Tạm dừng', 'On Hold'],
  hold: ['Tạm giữ', 'Hold'],
  pending: ['Chờ xử lý', 'Pending'],
  planned: ['Đã lập kế hoạch', 'Planned'],
  assigned: ['Đã phân công', 'Assigned'],
  won: ['Thắng', 'Won'],
  lost: ['Thua', 'Lost'],
  resolved: ['Đã giải quyết', 'Resolved'],
  expired: ['Hết hạn', 'Expired'],
  renewed: ['Đã gia hạn', 'Renewed'],
  passed: ['Đạt', 'Passed'],
  failed: ['Không đạt', 'Failed'],
  rejected: ['Từ chối', 'Rejected'],
  cancelled: ['Đã hủy', 'Cancelled'],
  partial: ['Một phần', 'Partial'],
  complete: ['Hoàn chỉnh', 'Complete'],
  broken: ['Đứt gãy', 'Broken'],
  overdue: ['Quá hạn', 'Overdue'],
  open: ['Đang mở', 'Open'],
  paid: ['Đã thanh toán', 'Paid'],
  prospective: ['Tiềm năng', 'Prospective'],
  inactive: ['Ngưng hoạt động', 'Inactive'],
  preboarding: ['Tiền nhận việc', 'Preboarding'],
  suspended: ['Tạm đình chỉ', 'Suspended'],
  terminated: ['Chấm dứt', 'Terminated'],
  blocked: ['Bị chặn', 'Blocked'],
  spend_authorized: ['Được phép mua', 'Spend Authorized'],
  dispatched: ['Đã điều xe', 'Dispatched'],
  disputed: ['Tranh chấp', 'Disputed'],
  retired: ['Ngừng sử dụng', 'Retired'],
  disposed: ['Đã thanh lý', 'Disposed'],
  accepted: ['Đạt', 'Accepted'],
  waived: ['Miễn kiểm', 'Waived'],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function titleCase(value) {
  return String(value || '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function broadCategory(domain) {
  return CATEGORY_BY_DOMAIN[domain] || 'system';
}

function standardForDomain(domain) {
  return STANDARD_BY_DOMAIN[domain] || 'internal';
}

function rolesForDomain(domain) {
  return ROLE_GUARDS_BY_DOMAIN[domain] || ['module_admin', 'system_admin'];
}

function loadWave1LifecycleNormalization() {
  const filePath = path.join(registryDir, 'wave1-lifecycle-normalization.json');
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}

const WAVE1_LIFECYCLE_NORMALIZATION = loadWave1LifecycleNormalization();

function wave1EntityOverride(tableName) {
  return WAVE1_LIFECYCLE_NORMALIZATION?.normalized_entities?.[tableName] || null;
}

function effectiveStatusColumn(tableName, table) {
  const override = wave1EntityOverride(tableName);
  const overrideField = String(override?.status_field_override || '').trim();
  if (overrideField && table?.columns?.[overrideField]) return overrideField;
  return String(table?.statusColumn || '').trim();
}

function effectiveStatusSet(tableName, table) {
  const override = wave1EntityOverride(tableName);
  const overrideKey = String(override?.status_set_key || '').trim();
  if (overrideKey) return overrideKey;
  return String(table?.statusSet || '').trim();
}

function normalizeStatusSets(raw) {
  const sets = {};
  if (raw && raw.statusSets && typeof raw.statusSets === 'object') {
    for (const [key, value] of Object.entries(raw.statusSets)) {
      if (value && Array.isArray(value.options)) sets[key] = clone(value);
    }
  }
  for (const [key, value] of Object.entries(raw || {})) {
    if (key === '_meta' || key === 'statusSets') continue;
    if (value && Array.isArray(value.options)) sets[key] = clone(value);
  }
  return sets;
}

function normalizeWorkflowMap(raw) {
  if (raw && raw.workflows && typeof raw.workflows === 'object') return clone(raw.workflows);
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (key === '_meta') continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = clone(value);
  }
  return out;
}

function normalizeRules(raw) {
  return clone(Array.isArray(raw) ? raw : (raw?.rules || []));
}

function normalizeFormulaMap(raw) {
  const formulas = raw && raw.formulas && typeof raw.formulas === 'object' ? raw.formulas : raw;
  const out = {};
  for (const [key, value] of Object.entries(formulas || {})) {
    if (key === '_meta' || key === 'formulas') continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = clone(value);
  }
  return out;
}

function loadDataFields() {
  const index = readJson(path.join(registryDir, 'data-fields.json'));
  const parts = Array.isArray(index.parts) ? index.parts : (Array.isArray(index?._meta?.parts) ? index._meta.parts : []);
  if (!parts.length) {
    const direct = {};
    for (const [key, value] of Object.entries(index || {})) {
      if (key !== '_meta' && Array.isArray(value)) direct[key] = value;
    }
    return direct;
  }

  const merged = {};
  for (const part of parts) {
    const file = String(part?.file || '');
    if (!file) continue;
    const payload = readJson(path.join(registryDir, file));
    for (const [key, value] of Object.entries(payload || {})) {
      if (key !== '_meta' && Array.isArray(value)) merged[key] = value;
    }
  }
  return merged;
}

function parseVarcharLength(type) {
  const match = String(type || '').match(/(?:VAR)?CHAR\((\d+)\)/i);
  return match ? Number(match[1]) : null;
}

function isNumericType(type, uiType) {
  return /NUMERIC|DECIMAL|REAL|DOUBLE|INTEGER|BIGINT|SMALLINT/i.test(String(type || '')) || ['number', 'currency', 'percentage'].includes(String(uiType || ''));
}

function statusColor(value) {
  const key = String(value || '').toLowerCase();
  if (/(approved|released|published|paid|delivered|verified|validated|implemented|completed|closed|won|passed|active|renewed|received|qualified|spend_authorized|accepted)/.test(key)) return '#10b981';
  if (/(draft|new|planned|assigned|submitted|open|pending|review|under_review|in_progress|picking|packed|shipped|in_transit|partial|frozen|prospective|preboarding|ready|dispatched)/.test(key)) return '#3b82f6';
  if (/(hold|on_hold|overdue|expired|suspended|inactive|waived)/.test(key)) return '#f59e0b';
  if (/(rejected|cancelled|failed|lost|broken|blocked|disputed|retired|disposed|terminated)/.test(key)) return '#ef4444';
  return '#6b7280';
}

function statusIcon(value) {
  const key = String(value || '').toLowerCase();
  if (/(approved|released|published|completed|closed|verified|implemented|passed|paid|delivered|won|qualified|spend_authorized|accepted)/.test(key)) return 'CheckCircle2';
  if (/(submitted|shipped|in_transit|dispatched)/.test(key)) return 'Send';
  if (/(draft|new|prospective|preboarding)/.test(key)) return 'FileEdit';
  if (/(review|under_review|validated)/.test(key)) return 'Search';
  if (/(in_progress|active|picking|packed|ready)/.test(key)) return 'Play';
  if (/(hold|on_hold|frozen|pending|planned|assigned|partial|inactive|suspended|waived)/.test(key)) return 'Clock';
  if (/(rejected|cancelled|failed|lost|broken|expired|blocked|disputed|retired|disposed|terminated)/.test(key)) return 'Ban';
  return 'CircleDot';
}

function stateLabels(value) {
  const found = STATUS_LABELS[String(value || '').toLowerCase()];
  if (found) return { label: found[0], labelEn: found[1] };
  return {
    label: titleCase(String(value || '').replace(/_/g, ' ')),
    labelEn: titleCase(String(value || '').replace(/_/g, ' ')),
  };
}

function terminalStatuses(values) {
  return new Set(values.filter((value) => /(closed|completed|archived|cancelled|rejected|lost|failed|expired|paid|delivered|won|passed|broken)/.test(value)));
}

function normalizedWave1StatusOptions(tableName, table) {
  const override = wave1EntityOverride(tableName);
  const options = Array.isArray(override?.status_options) ? override.status_options : [];
  if (!options.length) return null;
  return options.map((option) => {
    const value = String(option?.value || '').trim();
    const labels = stateLabels(value);
    return {
      value,
      label: option?.label || labels.label,
      labelEn: option?.labelEn || labels.labelEn,
      color: option?.color || statusColor(value),
      icon: option?.icon || statusIcon(value),
      allowedTransitionsFrom: Array.isArray(option?.allowedTransitionsFrom)
        ? option.allowedTransitionsFrom.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [],
    };
  }).filter((option) => option.value);
}

function inferStatusValues(tableName, table, currentSet) {
  const normalized = normalizedWave1StatusOptions(tableName, table);
  if (normalized?.length) return normalized;
  if (currentSet?.options?.length) return clone(currentSet.options);

  const statusColumn = effectiveStatusColumn(tableName, table);
  const text = `${tableName} ${table.domain} ${statusColumn} ${table.labelEn || ''}`.toLowerCase();
  let values;

  if (/payment|invoice|receivable|payable/.test(text)) {
    values = ['draft', 'open', 'partial', 'paid', 'overdue', 'cancelled'];
  } else if (/shipment|delivery|transport|carrier|dispatch/.test(text)) {
    values = ['planned', 'released', 'shipped', 'in_transit', 'delivered', 'closed', 'cancelled'];
  } else if (/maintenance|pm_|equipment/.test(text)) {
    values = ['draft', 'planned', 'released', 'in_progress', 'completed', 'closed', 'cancelled'];
  } else if (/training|skill|cert/.test(text)) {
    values = ['active', 'expiring', 'expired', 'renewed', 'closed'];
  } else if (/portal|user|access/.test(text)) {
    values = ['draft', 'active', 'on_hold', 'closed', 'archived'];
  } else if (/crm|opportunity|lead/.test(text)) {
    values = ['draft', 'qualified', 'quoted', 'under_review', 'won', 'lost'];
  } else if (/aps|plan|schedule|scenario|project|forecast|demand|supply/.test(text)) {
    values = ['draft', 'under_review', 'published', 'frozen', 'completed', 'archived'];
  } else if (/inspection|audit|ncr|capa|exception|complaint|deviation|certificate|fmea|apqp|ppap|lab|risk|ehs/.test(text)) {
    values = ['draft', 'submitted', 'under_review', 'approved', 'implemented', 'verified', 'closed', 'rejected'];
  } else if (/quote/.test(text)) {
    values = ['draft', 'submitted', 'under_review', 'approved', 'won', 'lost'];
  } else if (/purchase|supplier|vendor|receipt|po/.test(text)) {
    values = ['draft', 'submitted', 'approved', 'released', 'received', 'closed', 'cancelled'];
  } else if (/sales|order|job|work|routing|bom|wo|jo/.test(text)) {
    values = ['draft', 'released', 'in_progress', 'completed', 'closed', 'cancelled'];
  } else {
    values = ['draft', 'active', 'on_hold', 'completed', 'closed', 'cancelled'];
  }

  const terminal = terminalStatuses(values);
  return values.map((value, index) => {
    const labels = stateLabels(value);
    const allowedTransitionsFrom = [];
    if (index > 0) allowedTransitionsFrom.push(values[index - 1]);
    if (terminal.has(value)) {
      for (const prior of values.slice(0, index)) {
        if (!terminal.has(prior) && !allowedTransitionsFrom.includes(prior)) allowedTransitionsFrom.push(prior);
      }
    }
    return {
      value,
      label: labels.label,
      labelEn: labels.labelEn,
      color: statusColor(value),
      icon: statusIcon(value),
      allowedTransitionsFrom,
    };
  });
}

function buildStatusOptions(tableRegistry, existingRaw) {
  const existing = normalizeStatusSets(existingRaw);
  const result = {};
  const usage = {};

  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    const statusColumn = effectiveStatusColumn(tableName, table);
    const statusSet = effectiveStatusSet(tableName, table);
    if (!statusColumn) continue;
    const key = statusSet || `${tableName}_${statusColumn}`;
    usage[key] = usage[key] || [];
    usage[key].push(tableName);
  }

  for (const [key, value] of Object.entries(existing)) {
    result[key] = clone(value);
  }

  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    const statusColumn = effectiveStatusColumn(tableName, table);
    const baseKey = effectiveStatusSet(tableName, table) || `${tableName}_${statusColumn}`;
    if (!statusColumn) continue;
    const existingSet = result[baseKey] || existing[baseKey] || null;
    const options = inferStatusValues(tableName, table, existingSet);
    const baseLabel = `${table.label} - ${titleCase(String(statusColumn).replace(/_/g, ' '))}`;
    const baseLabelEn = `${table.labelEn || titleCase(tableName)} ${titleCase(String(statusColumn).replace(/_/g, ' '))}`;
    result[baseKey] = {
      label: existingSet?.label || baseLabel,
      labelEn: existingSet?.labelEn || baseLabelEn,
      source: existingSet?.source || (wave1EntityOverride(tableName) ? 'wave1-lifecycle-normalization' : 'table-registry'),
      standard: existingSet?.standard || standardForDomain(table.domain),
      sourceTable: tableName,
      statusColumn,
      options,
    };

    const aliasCandidates = new Set([
      `${tableName}_${statusColumn}`,
      statusColumn === 'status' ? `${tableName}_status` : '',
      usage[baseKey] && usage[baseKey].length > 1 ? `${tableName}__${statusColumn}_set` : '',
    ]);

    for (const alias of aliasCandidates) {
      const aliasKey = slug(alias);
      if (!aliasKey || aliasKey === baseKey || result[aliasKey]) continue;
      result[aliasKey] = {
        label: baseLabel,
        labelEn: baseLabelEn,
        source: wave1EntityOverride(tableName) ? 'wave1-lifecycle-normalization-alias' : 'table-registry-alias',
        standard: standardForDomain(table.domain),
        sourceTable: tableName,
        statusColumn,
        aliasOf: baseKey,
        options: clone(options),
      };
    }
  }

  return {
    _meta: {
      version: '4.0',
      description: 'Expanded status and enum registry generated from table-registry workflow coverage.',
      generatedAt,
      enumCount: Object.keys(result).length,
    },
    ...result,
  };
}

function triggerForStatus(to) {
  const key = String(to || '').toLowerCase();
  if (/submitted/.test(key)) return 'submit';
  if (/approved/.test(key)) return 'approve';
  if (/released/.test(key)) return 'release';
  if (/spend_authorized/.test(key)) return 'authorize_spend';
  if (/published/.test(key)) return 'publish';
  if (/in_progress/.test(key)) return 'start';
  if (/completed/.test(key)) return 'complete';
  if (/verified|validated/.test(key)) return 'verify';
  if (/implemented/.test(key)) return 'implement';
  if (/posted/.test(key)) return 'post';
  if (/received/.test(key)) return 'receive';
  if (/shipped/.test(key)) return 'ship';
  if (/accepted/.test(key)) return 'accept';
  if (/waived/.test(key)) return 'waive';
  if (/blocked/.test(key)) return 'block';
  if (/suspended/.test(key)) return 'suspend';
  if (/terminated/.test(key)) return 'terminate';
  if (/retired/.test(key)) return 'retire';
  if (/disposed/.test(key)) return 'dispose';
  if (/delivered/.test(key)) return 'deliver';
  if (/closed/.test(key)) return 'close';
  if (/archived/.test(key)) return 'archive';
  if (/cancelled/.test(key)) return 'cancel';
  if (/rejected/.test(key)) return 'reject';
  if (/lost/.test(key)) return 'mark_lost';
  if (/won/.test(key)) return 'mark_won';
  return `move_to_${key}`;
}

function transitionLabel(to) {
  const labels = stateLabels(to);
  return {
    label: labels.label,
    labelEn: labels.labelEn,
  };
}

function actionsForTransition(to, domain) {
  const actions = [{
    type: 'notify',
    to: rolesForDomain(domain)[0],
    template: `${slug(domain)}_${slug(to)}`,
  }];
  if (/(submitted|approved|released|published|completed|closed|verified|validated|implemented|posted|shipped|delivered|received|won|lost|cancelled|rejected|accepted|waived|spend_authorized|blocked|retired|disposed|terminated|archived)/.test(String(to))) {
    actions.push({
      type: 'setField',
      field: `${slug(to)}_at`,
      value: 'NOW()',
    });
  }
  return actions;
}

function guardsForTransition(to, domain) {
  const roles = rolesForDomain(domain);
  if (/(approved|released|published|posted|closed|cancelled|rejected|verified|validated|implemented|won|lost|spend_authorized|blocked|accepted|waived|retired|disposed|terminated|archived)/.test(String(to))) {
    return [{ type: 'role', roles }];
  }
  return [];
}

function buildTransitionsFromStates(states, domain) {
  const transitions = [];
  const seen = new Set();

  for (let i = 0; i < states.length; i += 1) {
    const state = states[i];
    const fromList = Array.isArray(state.allowedTransitionsFrom) && state.allowedTransitionsFrom.length
      ? state.allowedTransitionsFrom
      : (i > 0 ? [states[i - 1].id] : []);

    for (const from of fromList) {
      const key = `${from}->${state.id}`;
      if (!from || seen.has(key)) continue;
      seen.add(key);
      const labels = transitionLabel(state.id);
      transitions.push({
        from,
        to: state.id,
        trigger: triggerForStatus(state.id),
        label: labels.label,
        labelEn: labels.labelEn,
        guards: guardsForTransition(state.id, domain),
        actions: actionsForTransition(state.id, domain),
      });
    }
  }

  return transitions;
}

function defaultStatesForTable(primaryTable, statusSets) {
  const statusColumn = effectiveStatusColumn(primaryTable.tableName, primaryTable);
  const statusSet = effectiveStatusSet(primaryTable.tableName, primaryTable);
  if (statusColumn && statusSet && statusSets[statusSet]) {
    return statusSets[statusSet].options.map((option) => ({
      id: option.value,
      label: option.label,
      labelEn: option.labelEn,
      color: option.color || statusColor(option.value),
      entryActions: [],
      exitActions: [],
      allowedTransitionsFrom: clone(option.allowedTransitionsFrom || []),
    }));
  }

  return inferStatusValues(primaryTable.tableName, primaryTable, null).map((option) => ({
    id: option.value,
    label: option.label,
    labelEn: option.labelEn,
    color: option.color || statusColor(option.value),
    entryActions: [],
    exitActions: [],
    allowedTransitionsFrom: clone(option.allowedTransitionsFrom || []),
  }));
}

function workflowName(table) {
  return `${table.label} - Luồng xử lý`;
}

function workflowNameEn(table) {
  return `${table.labelEn || titleCase(table.tableName)} Workflow`;
}

function persistedStatesForTable(primaryTable, statusSets) {
  const statusColumn = effectiveStatusColumn(primaryTable.tableName, primaryTable);
  const statusSet = effectiveStatusSet(primaryTable.tableName, primaryTable);
  return statusColumn && statusSet && statusSets[statusSet]
    ? defaultStatesForTable(primaryTable, statusSets)
    : [];
}

function stableWorkflowName(table) {
  return `${table.label} - Luong xu ly`;
}

function lifecycleModeForTable(primaryTable, statusSets) {
  const override = wave1EntityOverride(primaryTable.tableName);
  const overrideMode = String(override?.lifecycle_mode || '').trim();
  if (overrideMode) {
    return overrideMode;
  }
  const statusColumn = effectiveStatusColumn(primaryTable.tableName, primaryTable);
  const statusSet = effectiveStatusSet(primaryTable.tableName, primaryTable);
  if (!(statusColumn && statusSet && statusSets[statusSet])) {
    return 'stateless';
  }
  if (statusSet === 'digital_thread_status') {
    return 'generic_status_only';
  }
  return 'persisted';
}

function buildWorkflowLibrary(tableRegistry, statusOptionsRaw, existingRaw) {
  const existing = normalizeWorkflowMap(existingRaw);
  const statusSets = normalizeStatusSets(statusOptionsRaw);
  const groups = new Map();

  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    if (table.supportTable) continue;
    const workflowId = table.workflowId || `wf_${slug(tableName)}`;
    const entry = groups.get(workflowId) || [];
    entry.push({ tableName, ...table });
    groups.set(workflowId, entry);
  }

  const workflows = {};
  for (const [workflowId, tables] of groups.entries()) {
    const existingWorkflow = existing[workflowId] || null;
    const primaryTable = tables.find((table) => effectiveStatusColumn(table.tableName, table)) || tables[0];
    const override = wave1EntityOverride(primaryTable.tableName);
    const statusColumn = effectiveStatusColumn(primaryTable.tableName, primaryTable);
    const statusSet = effectiveStatusSet(primaryTable.tableName, primaryTable);
    const lifecycleMode = lifecycleModeForTable(primaryTable, statusSets);
    const hasExplicitTransitionLifecycle = ['persisted', 'guarded_transition_runtime'].includes(lifecycleMode);
    const states = hasExplicitTransitionLifecycle
      ? (override?.status_options?.length
        ? defaultStatesForTable(primaryTable, statusSets)
        : (existingWorkflow?.states?.length ? clone(existingWorkflow.states) : persistedStatesForTable(primaryTable, statusSets)))
      : [];
    const transitions = hasExplicitTransitionLifecycle
      ? (override?.status_options?.length
        ? buildTransitionsFromStates(states, primaryTable.domain)
        : (existingWorkflow?.transitions?.length ? clone(existingWorkflow.transitions) : buildTransitionsFromStates(states, primaryTable.domain)))
      : [];
    const relatedTables = Array.from(new Set([
      ...tables.map((table) => table.tableName),
      ...((primaryTable.foreignKeys || []).map((fk) => String(fk.references || '').split('.')[0]).filter(Boolean)),
      ...(primaryTable.digitalThread?.upstream || []),
      ...(primaryTable.digitalThread?.downstream || []),
    ]));

    const sla = hasExplicitTransitionLifecycle
      ? ((override?.status_options?.length ? null : existingWorkflow?.sla) || Object.fromEntries(
        transitions.map((transition) => [`${transition.from}_to_${transition.to}`, { hours: /(approved|closed|completed|posted|delivered)/.test(transition.to) ? 72 : 24, escalateTo: rolesForDomain(primaryTable.domain)[0] }]),
      ))
      : {};

    workflows[workflowId] = {
      workflowId,
      name: existingWorkflow?.name || stableWorkflowName(primaryTable),
      nameEn: existingWorkflow?.nameEn || workflowNameEn(primaryTable),
      entity: existingWorkflow?.entity || primaryTable.tableName,
      domain: primaryTable.domain,
      standard: existingWorkflow?.standard || standardForDomain(primaryTable.domain),
      primaryTable: primaryTable.tableName,
      relatedTables,
      stateField: statusColumn || '',
      statusSet: statusSet || '',
      lifecycleMode,
      states,
      transitions,
      sla,
      digitalThread: existingWorkflow?.digitalThread || {
        upstreamTriggers: clone(primaryTable.digitalThread?.upstream || []),
        downstreamEffects: clone(primaryTable.digitalThread?.downstream || []),
      },
    };
  }

  for (const [workflowId, value] of Object.entries(existing)) {
    if (!workflows[workflowId]) workflows[workflowId] = clone(value);
  }

  return {
    _meta: {
      version: '4.0',
      description: 'Workflow library expanded from table-registry and domain-driven lifecycle heuristics.',
      generatedAt,
      workflowCount: Object.keys(workflows).length,
    },
    workflows,
  };
}

function inferFieldHints(dataFields) {
  const hints = new Map();
  for (const fields of Object.values(dataFields || {})) {
    if (!Array.isArray(fields)) continue;
    for (const field of fields) {
      const key = field.dbTable && field.dbColumn ? `${field.dbTable}.${field.dbColumn}` : (field.dbTable && field.key ? `${field.dbTable}.${field.key}` : null);
      if (!key) continue;
      const current = hints.get(key) || {
        required: false,
        type: field.type || '',
        constraints: {},
        label: field.label || field.labelEn || field.key,
        labelEn: field.labelEn || field.label || field.key,
      };
      current.required = current.required || !!field.required;
      current.type = current.type || field.type || '';
      current.label = current.label || field.label || field.labelEn || field.key;
      current.labelEn = current.labelEn || field.labelEn || field.label || field.key;
      current.constraints = { ...current.constraints, ...(field.constraints || {}) };
      hints.set(key, current);
    }
  }
  return hints;
}

function rangeForColumn(columnName, column, hint) {
  if (typeof hint?.constraints?.min === 'number' || typeof hint?.constraints?.max === 'number') {
    return {
      min: typeof hint.constraints.min === 'number' ? hint.constraints.min : undefined,
      max: typeof hint.constraints.max === 'number' ? hint.constraints.max : undefined,
    };
  }

  const text = `${columnName} ${column.type} ${column.uiType}`.toLowerCase();
  if (/pct|percent|rate/.test(text)) return { min: 0, max: 100 };
  if (/qty|quantity|count|amount|cost|price|hours|minutes|days|weight|value|stock|balance|capacity|demand|supply|score|sequence|age|duration|lead|load|volume|distance/.test(text)) {
    return { min: 0, max: 999999999999 };
  }
  return null;
}

function patternForColumn(columnName, hint) {
  if (typeof hint?.constraints?.pattern === 'string' && hint.constraints.pattern.trim()) return hint.constraints.pattern.trim();
  const text = String(columnName || '').toLowerCase();
  if (/(number|code|serial|lot|batch|reference|ref|eccn|license|bond)/.test(text)) return '^[A-Za-z0-9._/-]+$';
  return null;
}

function enumValuesForColumn(table, columnName, column, statusSets) {
  const statusColumn = effectiveStatusColumn(table.tableName, table);
  const statusSet = effectiveStatusSet(table.tableName, table);
  if (statusColumn === columnName && statusSet && statusSets[statusSet]) {
    return statusSets[statusSet].options.map((option) => option.value);
  }
  const rawType = slug(String(column.type || '').replace(/_enum$/i, ''));
  if (rawType && statusSets[rawType]) {
    return statusSets[rawType].options.map((option) => option.value);
  }
  if (column.uiType === 'boolean' || /BOOLEAN/i.test(String(column.type || ''))) {
    return [true, false];
  }
  return null;
}

function buildValidationRules(tableRegistry, dataFields, statusOptionsRaw, existingRaw) {
  const statusSets = normalizeStatusSets(statusOptionsRaw);
  const hints = inferFieldHints(dataFields);
  const rules = [];
  const seen = new Set();
  let counter = 1;

  function addRule(entity, field, type, params, message, messageEn, severity = 'error', source = 'registry-auto') {
    const key = JSON.stringify([entity, field, type, params || {}]);
    if (!entity || !field || seen.has(key)) return;
    seen.add(key);
    rules.push({
      entity,
      field,
      type,
      params: params || {},
      message,
      messageEn,
      severity,
      source,
      ruleId: `val_${String(counter).padStart(5, '0')}`,
    });
    counter += 1;
  }

  for (const rule of normalizeRules(existingRaw)) {
    addRule(
      rule.entity,
      rule.field,
      rule.type,
      rule.params || {},
      rule.message || `${rule.field || 'Field'} không hợp lệ`,
      rule.messageEn || `${rule.field || 'Field'} is invalid`,
      rule.severity || 'error',
      rule.source || 'existing',
    );
  }

  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    table.tableName = tableName;
    for (const [columnName, column] of Object.entries(table.columns || {})) {
      if (column.generated) continue;
      const hint = hints.get(`${tableName}.${columnName}`) || null;
      const label = hint?.label || column.label || titleCase(columnName);
      const labelEn = hint?.labelEn || column.labelEn || titleCase(columnName);

      addRule(tableName, columnName, 'type', { expected: hint?.type || column.uiType || column.type || 'string' }, `${label} phải đúng kiểu dữ liệu`, `${labelEn} must match the expected data type`, 'error', 'table-registry');
      if (column.required || hint?.required) addRule(tableName, columnName, 'required', {}, `Bắt buộc nhập ${label.toLowerCase()}`, `${labelEn} is required`, 'error', 'table-registry');

      const varcharLength = parseVarcharLength(column.type);
      const maxLength = typeof hint?.constraints?.maxLength === 'number' ? hint.constraints.maxLength : varcharLength;
      if (typeof maxLength === 'number' && Number.isFinite(maxLength)) {
        addRule(tableName, columnName, 'maxLength', { max: maxLength }, `${label} vượt quá độ dài tối đa ${maxLength} ký tự`, `${labelEn} exceeds the maximum length of ${maxLength} characters`, 'error', hint?.constraints?.maxLength ? 'data-fields' : 'table-registry');
      }

      const pattern = patternForColumn(columnName, hint);
      if (pattern) addRule(tableName, columnName, 'pattern', { regex: pattern }, `${label} không đúng định dạng`, `${labelEn} has an invalid format`, 'error', hint?.constraints?.pattern ? 'data-fields' : 'table-registry');

      const range = isNumericType(column.type, hint?.type || column.uiType) ? rangeForColumn(columnName, column, hint) : null;
      if (range && (typeof range.min === 'number' || typeof range.max === 'number')) {
        addRule(tableName, columnName, 'range', {
          ...(typeof range.min === 'number' ? { min: range.min } : {}),
          ...(typeof range.max === 'number' ? { max: range.max } : {}),
        }, `${label} nằm ngoài phạm vi hợp lệ`, `${labelEn} is outside the valid range`, 'error', 'table-registry');
      }

      const enumValues = enumValuesForColumn(table, columnName, column, statusSets);
      if (Array.isArray(enumValues) && enumValues.length) {
        addRule(tableName, columnName, 'enum', { values: enumValues }, `${label} không nằm trong danh sách hợp lệ`, `${labelEn} is not within the allowed option set`, 'error', 'status-options');
      }
    }
  }

  for (const [endpoint, fields] of Object.entries(dataFields || {})) {
    if (!Array.isArray(fields)) continue;
    for (const field of fields) {
      if (field.source !== 'param') continue;
      const label = field.label || field.labelEn || field.key;
      const labelEn = field.labelEn || field.label || field.key;
      addRule(endpoint, field.key, 'type', { expected: field.type || 'string' }, `${label} phải đúng kiểu dữ liệu`, `${labelEn} must match the expected data type`, 'error', 'api-param');
      if (field.required) addRule(endpoint, field.key, 'required', {}, `Bắt buộc nhập ${String(label).toLowerCase()}`, `${labelEn} is required`, 'error', 'api-param');
      if (typeof field.constraints?.maxLength === 'number') {
        addRule(endpoint, field.key, 'maxLength', { max: field.constraints.maxLength }, `${label} vượt quá độ dài tối đa ${field.constraints.maxLength} ký tự`, `${labelEn} exceeds the maximum length of ${field.constraints.maxLength} characters`, 'error', 'api-param');
      }
    }
  }

  return {
    _meta: {
      version: '4.0',
      description: 'Validation rules expanded from table-registry, field constraints, and status sets.',
      generatedAt,
      ruleCount: rules.length,
    },
    rules,
  };
}

function formulaReference(entry, ref) {
  const refs = Array.isArray(entry.referencedBy) ? entry.referencedBy : [];
  const key = JSON.stringify(ref);
  if (!refs.some((item) => JSON.stringify(item) === key)) refs.push(ref);
  entry.referencedBy = refs;
}

function inferFormulaCategory(tableRegistry, endpoint, dbTable) {
  if (dbTable && tableRegistry.tables?.[dbTable]?.domain) return broadCategory(tableRegistry.tables[dbTable].domain);
  const text = String(endpoint || '').toLowerCase();
  if (/quality|ncr|capa|inspection|audit|fmea|lab/.test(text)) return 'quality';
  if (/production|work_order|job_order|mes|routing|tool/.test(text)) return 'manufacturing';
  if (/sales|quote|demand|planning|project|forecast/.test(text)) return 'planning';
  if (/purchase|supplier|warehouse|inventory|shipment/.test(text)) return 'supplier';
  if (/finance|invoice|cost|treasury/.test(text)) return 'finance';
  if (/trade|compliance|document|evidence|passport/.test(text)) return 'compliance';
  return 'system';
}

function buildComputedFormulas(tableRegistry, dataFields, existingRaw) {
  const formulas = normalizeFormulaMap(existingRaw);

  for (const [key, value] of Object.entries(formulas)) {
    value.formulaId = value.formulaId || key;
    value.name = value.name || value.label || titleCase(key);
    value.nameEn = value.nameEn || value.labelEn || value.name || titleCase(key);
    value.category = value.category || inferFormulaCategory(tableRegistry, '', value.dbTable || '');
    value.referencedBy = Array.isArray(value.referencedBy) ? value.referencedBy : [];
  }

  for (const [endpoint, fields] of Object.entries(dataFields || {})) {
    if (!Array.isArray(fields)) continue;
    for (const field of fields) {
      if (field.source !== 'computed') continue;
      const formulaId = slug(field.key || field.formula || '') || `formula_${Object.keys(formulas).length + 1}`;
      const existing = formulas[formulaId] || {
        formulaId,
        name: field.label || field.labelEn || titleCase(field.key || formulaId),
        nameEn: field.labelEn || field.label || titleCase(field.key || formulaId),
        category: inferFormulaCategory(tableRegistry, endpoint, field.dbTable || ''),
        domain: field.dbTable && tableRegistry.tables?.[field.dbTable]?.domain ? tableRegistry.tables[field.dbTable].domain : 'registry_support',
        unit: field.type === 'percentage' ? 'percentage' : '',
        outputType: field.type || 'number',
        expression: field.formula || `calc_${formulaId}`,
        source: 'data-fields',
        referencedBy: [],
      };
      formulaReference(existing, { type: 'field', endpoint, key: field.key });
      formulas[formulaId] = existing;
    }
  }

  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    const category = broadCategory(table.domain);
    const recordCountId = `f_${slug(tableName)}_record_count`;
    const recordCount = formulas[recordCountId] || {
      formulaId: recordCountId,
      name: `${table.label} - Số bản ghi`,
      nameEn: `${table.labelEn || titleCase(tableName)} Record Count`,
      category,
      domain: table.domain,
      unit: 'records',
      outputType: 'number',
      expression: `COUNT(*) FROM ${tableName}`,
      source: 'registry-auto',
      referencedBy: [],
    };
    formulaReference(recordCount, { type: 'pack', id: `${tableName}_kpi` });
    formulaReference(recordCount, { type: 'endpoint', id: `${table.domain}.${tableName}.list` });
    formulas[recordCountId] = recordCount;

    const statusColumn = effectiveStatusColumn(tableName, table);
    if (statusColumn) {
      const closedCountId = `f_${slug(tableName)}_closed_count`;
      const closedCount = formulas[closedCountId] || {
        formulaId: closedCountId,
        name: `${table.label} - Số hồ sơ đã đóng`,
        nameEn: `${table.labelEn || titleCase(tableName)} Closed Count`,
        category,
        domain: table.domain,
        unit: 'records',
        outputType: 'number',
        expression: `COUNT(*) FILTER (WHERE ${statusColumn} IN ('closed','completed','archived','paid','delivered')) FROM ${tableName}`,
        source: 'registry-auto',
        referencedBy: [],
      };
      formulaReference(closedCount, { type: 'pack', id: `${tableName}_status` });
      formulaReference(closedCount, { type: 'endpoint', id: `${table.domain}.${tableName}.transition` });
      formulas[closedCountId] = closedCount;
    }
  }

  for (const [formulaId, formula] of Object.entries(formulas)) {
    if (!Array.isArray(formula.referencedBy) || !formula.referencedBy.length) {
      const fallbackEndpoint = formula.domain && formula.domain !== 'registry_support'
        ? `${formula.domain}.dashboard.summary`
        : 'registry_support.computed.metrics';
      formulaReference(formula, { type: 'endpoint', id: fallbackEndpoint });
      formulaReference(formula, { type: 'catalog', id: formulaId });
    }
  }

  return {
    _meta: {
      version: '4.0',
      description: 'Computed formula library expanded from computed field registry and table-level KPI coverage.',
      generatedAt,
      formulaCount: Object.keys(formulas).length,
    },
    ...formulas,
  };
}

function syncDomainArchitecture(domainArchitecture, workflowLibrary) {
  const next = clone(domainArchitecture || {});
  const workflowsByDomain = {};
  for (const [workflowId, workflow] of Object.entries(workflowLibrary.workflows || {})) {
    const domain = workflow?.domain;
    if (!domain) continue;
    workflowsByDomain[domain] = workflowsByDomain[domain] || [];
    workflowsByDomain[domain].push(workflowId);
  }

  for (const [domain, definition] of Object.entries(next.domains || {})) {
    definition.workflows = Array.from(new Set(workflowsByDomain[domain] || [])).sort();
  }

  if (next._meta && typeof next._meta === 'object') {
    next._meta.workflowCoverageGeneratedAt = generatedAt;
  }
  return next;
}

function main() {
  const tableRegistry = readJson(path.join(registryDir, 'table-registry.json'));
  const domainArchitecture = readJson(path.join(registryDir, 'domain-architecture.json'));
  const dataFields = loadDataFields();
  const existingWorkflow = readJson(path.join(registryDir, 'workflow-library.json'));
  const existingStatus = readJson(path.join(registryDir, 'status-options.json'));
  const existingValidation = readJson(path.join(registryDir, 'validation-rules.json'));
  const existingFormulas = readJson(path.join(registryDir, 'computed-formulas.json'));

  const statusOptions = buildStatusOptions(tableRegistry, existingStatus);
  const workflowLibrary = buildWorkflowLibrary(tableRegistry, statusOptions, existingWorkflow);
  const validationRules = buildValidationRules(tableRegistry, dataFields, statusOptions, existingValidation);
  const computedFormulas = buildComputedFormulas(tableRegistry, dataFields, existingFormulas);
  const syncedDomainArchitecture = syncDomainArchitecture(domainArchitecture, workflowLibrary);

  writeJson(path.join(registryDir, 'status-options.json'), statusOptions);
  writeJson(path.join(registryDir, 'workflow-library.json'), workflowLibrary);
  writeJson(path.join(registryDir, 'validation-rules.json'), validationRules);
  writeJson(path.join(registryDir, 'computed-formulas.json'), computedFormulas);
  writeJson(path.join(registryDir, 'domain-architecture.json'), syncedDomainArchitecture);

  console.log(JSON.stringify({
    generatedAt,
    workflows: Object.keys(workflowLibrary.workflows || {}).length,
    statusSets: Object.keys(statusOptions).filter((key) => key !== '_meta').length,
    validationRules: validationRules.rules.length,
    formulas: Object.keys(computedFormulas).filter((key) => key !== '_meta').length,
  }, null, 2));
}

main();
