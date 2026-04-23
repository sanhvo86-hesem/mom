#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {
  extraEnums as deepExtraEnums,
  normalizedComputedFormulas,
  normalizedFieldTypes,
  normalizedIotConnectors,
  workflowBlueprints,
  relationBlueprints,
  complianceStandards,
  registryResearchAnchors,
  unitLibrary,
  identifierPatterns,
} from './reference-data.mjs';

const root = process.cwd();
const momRoot = path.join(root, 'mom');
const regDir = path.join(momRoot, 'data', 'registry');
const dataFieldsPath = path.join(regDir, 'data-fields.json');
const apiParamsPath = path.join(regDir, 'api-params.json');
const statusPath = path.join(regDir, 'status-options.json');
const packsPath = path.join(regDir, 'domain-field-packs.json');
const schemaLibPath = path.join(regDir, 'schema-library.json');
const fieldTypesPath = path.join(regDir, 'field-types.json');
const formulasPath = path.join(regDir, 'computed-formulas.json');
const iotPath = path.join(regDir, 'iot-connectors.json');
const manifestPath = path.join(regDir, 'registry-manifest.json');
const endpointCatalogPath = path.join(regDir, 'endpoint-catalog.json');
const validationRulesPath = path.join(regDir, 'validation-rules.json');
const relationMapPath = path.join(regDir, 'relation-map.json');
const workflowLibraryPath = path.join(regDir, 'workflow-library.json');
const complianceCrosswalkPath = path.join(regDir, 'compliance-crosswalk.json');
const qualityReportPath = path.join(regDir, 'registry-quality-report.json');
const unitLibraryPath = path.join(regDir, 'unit-library.json');
const identifierPatternsPath = path.join(regDir, 'identifier-patterns.json');
const varLibPath = path.join(momRoot, 'data', 'config', 'variable_library.json');
const apiCatalogPath = path.join(momRoot, 'scripts', 'portal', '00-block-engine.js');
const routesDir = path.join(momRoot, 'api', 'routes');
const controllersDir = path.join(momRoot, 'api', 'controllers');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const titleize = (k) => String(k || '')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (m) => m.toUpperCase())
  .replace(/\bSo\b/g, 'SO')
  .replace(/\bJo\b/g, 'JO')
  .replace(/\bWo\b/g, 'WO')
  .replace(/\bNcr\b/g, 'NCR')
  .replace(/\bCapa\b/g, 'CAPA')
  .replace(/\bMfa\b/g, 'MFA')
  .replace(/\bOtp\b/g, 'OTP')
  .replace(/\bApi\b/g, 'API');

const moduleFromAction = (action, controller) => {
  const prefix = action.split('_')[0];
  const controllerModules = {
    AuthController: 'System',
    DocumentController: 'Document Control',
    FormController: 'Forms',
    FileController: 'Files',
    UserController: 'Administration',
    AdminController: 'Administration',
    DictController: 'Reference Data',
    DashboardController: 'Analytics',
    OrderController: 'Order Management',
    ExceptionController: 'Quality',
    SupplierController: 'Supplier Quality',
    QuoteController: 'Quoting',
    EvidenceController: 'Evidence',
    FmeaController: 'FMEA',
    ApqpController: 'APQP',
    DispatchController: 'Dispatch',
    LogisticsController: 'Logistics',
    MasterDataController: 'Master Data',
    MobileController: 'Mobile MES',
    CncProgramController: 'NC Programming',
    ProductPassportController: 'Digital Passport',
    AiSchedulingController: 'AI Scheduling',
    CustomerPortalController: 'Customer Portal',
    ComplianceReportController: 'Compliance',
    KnowledgeController: 'Knowledge',
    CiController: 'Continuous Improvement',
    EnergyController: 'Energy',
    ModuleSchemaController: 'Administration',
    RegistryController: 'Administration',
  };
  const prefixModules = {
    status: 'System',
    auth: 'System',
    doc: 'Document Control',
    docs: 'Document Control',
    online: 'Forms',
    record: 'Forms',
    scan: 'Files',
    admin: 'Administration',
    dict: 'Reference Data',
    dashboard: 'Analytics',
    kpi: 'Analytics',
    spc: 'Analytics',
    order: 'Order Management',
    quality: 'Quality',
    supplier: 'Supplier Quality',
    quote: 'Quoting',
    evidence: 'Evidence',
    fmea: 'FMEA',
    apqp: 'APQP',
    ppap: 'APQP',
    cp: 'Control Plan',
    dispatch: 'Dispatch',
    subcontract: 'Logistics',
    oqc: 'Logistics',
    packing: 'Logistics',
    delivery: 'Logistics',
    master: 'Master Data',
    mobile: 'Mobile MES',
    cnc: 'NC Programming',
    product: 'Digital Passport',
    ai: 'AI Scheduling',
    schedule: 'AI Scheduling',
    customer: 'Customer Portal',
    compliance: 'Compliance',
    knowledge: 'Knowledge',
    ci: 'Continuous Improvement',
    energy: 'Energy',
    module: 'Administration',
    registry: 'Administration',
  };
  return controllerModules[controller] || prefixModules[prefix] || titleize(prefix);
};

const catalogText = fs.readFileSync(apiCatalogPath, 'utf8');
const jsCatalog = [...catalogText.matchAll(/action:'([^']+)',\s*method:'([^']+)',\s*label:'([^']+)',\s*module:'([^']+)'/g)]
  .map((m) => ({ action: m[1], method: m[2], label: m[3], module: m[4] }));
const jsCatalogMap = Object.fromEntries(jsCatalog.map((entry) => [entry.action, entry]));
const routeSourceText = fs.readdirSync(routesDir)
  .filter((entry) => entry.endsWith('.php'))
  .sort()
  .map((entry) => fs.readFileSync(path.join(routesDir, entry), 'utf8'))
  .join('\n');
const phpRoutes = [...routeSourceText.matchAll(/'([^']+)'\s*=>\s*\[([A-Za-z0-9_\\]+)::class,\s*'([^']+)'\]/g)]
  .map((m) => ({
    action: m[1],
    controller: m[2].split('\\').pop(),
    handler: m[3],
  }));
const apiCatalog = phpRoutes.map((route) => ({
  action: route.action,
  method: jsCatalogMap[route.action]?.method || null,
  label: jsCatalogMap[route.action]?.label || titleize(route.action),
  module: jsCatalogMap[route.action]?.module || moduleFromAction(route.action, route.controller),
  controller: route.controller,
  handler: route.handler,
  source: jsCatalogMap[route.action] ? 'ui+router' : 'router-only',
}));
const currentFields = readJson(dataFieldsPath);
const currentStatus = readJson(statusPath);
const variableLibrary = readJson(varLibPath);
const controllerCache = new Map();

const readControllerText = (controller) => {
  if (!controllerCache.has(controller)) {
    const file = path.join(controllersDir, `${controller}.php`);
    controllerCache.set(controller, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
  }
  return controllerCache.get(controller);
};

const extractMethodBody = (text, name) => {
  const re = new RegExp(`public function ${name}\\([^)]*\\)\\s*:\\s*never\\s*\\{`, 'm');
  const match = re.exec(text);
  if (!match) return '';
  let i = match.index + match[0].length;
  let depth = 1;
  while (i < text.length && depth > 0) {
    const ch = text[i++];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
  }
  return text.slice(match.index, i);
};

const parseRouteContract = (route) => {
  const text = readControllerText(route.controller);
  const body = extractMethodBody(text, route.handler);
  const requiredBodyFields = uniq(
    [...body.matchAll(/requireFields\([^\[]*\[([^\]]*)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])),
  );
  const bodyFields = uniq([...body.matchAll(/\$body\[['"]([^'"]+)['"]\]/g)].map((m) => m[1]));
  const queryParams = uniq([...body.matchAll(/query\('([^']+)'/g)].map((m) => m[1]));
  const permissionKeys = uniq([...body.matchAll(/require[A-Za-z0-9_]*Permission\(\$[A-Za-z_]+,\s*'([^']+)'/g)].map((m) => m[1]));
  const responseKeys = uniq([
    ...[...body.matchAll(/success\(\[([\s\S]*?)\]\s*(?:,\s*\d+)?\)/g)]
      .flatMap((m) => [...m[1].matchAll(/'([^']+)'\s*=>/g)].map((x) => x[1])),
    /paginated\('([^']+)'/.exec(body)?.[1],
  ]);
  const collectionKey = /paginated\('([^']+)'/.exec(body)?.[1] || null;
  const usesJsonBody = /\$body\s*=\s*\$this->jsonBody\(\)/.test(body);
  return {
    authRequired: /requireAuth\(/.test(body),
    csrfRequired: /requireCsrf\(/.test(body),
    adminOnly: /requireAdmin\(/.test(body),
    usesJsonBody,
    bodyFields,
    requiredBodyFields,
    queryParams,
    permissionKeys,
    hasDynamicPermission: /require[A-Za-z0-9_]*Permission\(\$[A-Za-z_]+,\s*\$/.test(body),
    responseKeys,
    collectionKey,
    paginated: !!collectionKey,
    raw: body,
  };
};

const routeContracts = Object.fromEntries(
  apiCatalog.map((route) => [route.action, parseRouteContract(route)]),
);
const actionMethod = (api) => {
  if (api.method) return api.method;
  if (/(create|update|save|delete|reset|transition|approve|reject|confirm|sync|grant|revoke|upload|submit|report|generate|compare|verify|login|logout|acknowledge|resolve|convert|add|attach|comment|vote|clear|calculate)/.test(api.action)) {
    return 'POST';
  }
  return (routeContracts[api.action]?.csrfRequired || routeContracts[api.action]?.usesJsonBody) ? 'POST' : 'GET';
};

const quotas = {
  list: 18,
  detail: 36,
  create: 18,
  update: 18,
  dashboard: 14,
  history: 16,
  hierarchy: 14,
  search: 16,
  action: 10,
};

const prefixCats = {
  quote: ['erp_sales_order', 'erp_customer_master', 'erp_master_data', 'erp_costing', 'erp_routing', 'job_context', 'erp_compliance_regulatory'],
  order: ['erp_sales_order', 'erp_job_order', 'erp_shipping_logistics', 'erp_inventory', 'erp_master_data', 'job_context', 'shipment', 'erp_quality_extended', 'erp_mes_integration_governance', 'mes_digital_product_passport'],
  dispatch: ['erp_scheduling', 'erp_work_center', 'production', 'equipment', 'erp_job_order', 'mes_shift_handover_governance', 'mes_connectivity_adapter'],
  schedule: ['erp_scheduling', 'erp_work_center', 'equipment', 'production'],
  supplier: ['supplier', 'erp_purchase_order', 'erp_vendor_master', 'erp_subcontracting', 'erp_quality_extended', 'audit', 'finance'],
  subcontract: ['erp_subcontracting', 'supplier', 'erp_vendor_master', 'erp_shipping_logistics', 'erp_quality_extended'],
  mobile: ['production', 'quality_inspection', 'equipment', 'personnel', 'erp_labor_tracking', 'mes_shift_handover_governance', 'mes_material_genealogy_governance', 'mes_tool_offset_governance'],
  cnc: ['production', 'equipment', 'engineering', 'erp_routing', 'mes_nc_release_governance', 'mes_tool_offset_governance', 'mes_connectivity_adapter'],
  exception: ['ncr_capa', 'quality_inspection', 'risk', 'supplier', 'audit', 'finance'],
  fmea: ['engineering', 'risk', 'erp_npi', 'erp_quality_extended', 'production'],
  apqp: ['erp_npi', 'engineering', 'erp_quality_extended', 'audit', 'shipment'],
  evidence: ['document_header', 'record_identification', 'erp_document_control', 'quality_inspection', 'shipment'],
  doc: ['document_header', 'erp_document_control', 'record_identification', 'workflow_state', 'audit'],
  docs: ['document_header', 'erp_document_control', 'record_identification', 'workflow_state'],
  compliance: ['erp_compliance_regulatory', 'erp_document_control', 'audit', 'quality_inspection', 'shipment'],
  ci: ['improvement', 'kpi_metrics', 'audit', 'workflow_state'],
  master: ['erp_master_data', 'erp_vendor_master', 'erp_customer_master', 'equipment', 'personnel', 'training', 'workflow_state'],
  admin: ['portal_system', 'personnel', 'audit', 'workflow_state'],
  auth: ['portal_system', 'audit'],
  status: ['portal_system', 'timestamp'],
  knowledge: ['document_header', 'record_identification', 'personnel', 'workflow_state'],
  product: ['mes_digital_product_passport', 'mes_material_genealogy_governance', 'shipment', 'quality_inspection', 'erp_compliance_regulatory'],
  energy: ['mes_energy_management', 'mes_cost_governance', 'equipment', 'kpi_metrics'],
  ai: ['kpi_metrics', 'erp_scheduling', 'risk', 'portal_system', 'erp_mes_integration_governance'],
  customer: ['erp_customer_master', 'erp_sales_order', 'shipment', 'document_header', 'workflow_state'],
  online: ['document_header', 'record_identification', 'workflow_state'],
  form: ['document_header', 'record_identification', 'workflow_state'],
  module: ['portal_system', 'workflow_state'],
  record: ['record_identification', 'timestamp', 'workflow_state'],
  packing: ['shipment', 'erp_shipping_logistics', 'erp_sales_order'],
  oqc: ['quality_inspection', 'shipment', 'erp_quality_extended'],
  spc: ['quality_inspection', 'erp_quality_extended', 'kpi_metrics'],
  delivery: ['shipment', 'erp_shipping_logistics', 'erp_sales_order'],
  scan: ['record_identification', 'erp_inventory', 'shipment'],
  role: ['personnel', 'training', 'portal_system'],
};

const baseCats = {
  list: ['timestamp', 'workflow_state'],
  detail: ['timestamp', 'workflow_state', 'record_identification'],
  create: ['timestamp'],
  update: ['timestamp'],
  dashboard: ['kpi_metrics'],
  history: ['timestamp'],
  hierarchy: ['timestamp'],
  search: ['timestamp'],
  action: ['timestamp'],
};
const manualPacks = {
  cockpit: [
    ['requested_date', 'Requested Date', 'Requested Date', 'date'],
    ['promise_date', 'Promise Date', 'Promise Date', 'date'],
    ['internal_commit_date', 'Internal Commit Date', 'Internal Commit Date', 'date'],
    ['fulfillment_status', 'Fulfillment Status', 'Fulfillment Status', 'enum'],
    ['health_band', 'Health Band', 'Health Band', 'enum'],
    ['readiness_score', 'Readiness Score', 'Readiness Score', 'number'],
    ['blocked', 'Blocked', 'Blocked', 'boolean'],
    ['late_days', 'Late Days', 'Late Days', 'number'],
    ['gate_cards', 'Gate Cards', 'Gate Cards', 'json'],
    ['exception_cards', 'Exception Cards', 'Exception Cards', 'json'],
    ['milestones', 'Milestones', 'Milestones', 'json'],
    ['next_action_owner', 'Next Action Owner', 'Next Action Owner', 'string'],
    ['next_action_due', 'Next Action Due', 'Next Action Due', 'date'],
    ['document_requirements', 'Document Requirements', 'Document Requirements', 'json'],
  ],
  timeline: [
    ['event_id', 'Event ID', 'Event ID', 'string'],
    ['event_type', 'Event Type', 'Event Type', 'enum'],
    ['event_title', 'Event Title', 'Event Title', 'string'],
    ['event_description', 'Event Description', 'Event Description', 'textarea'],
    ['event_at', 'Event Timestamp', 'Event Timestamp', 'timestamp'],
    ['actor_name', 'Actor Name', 'Actor Name', 'string'],
    ['actor_role', 'Actor Role', 'Actor Role', 'string'],
    ['status_from', 'Status From', 'Status From', 'string'],
    ['status_to', 'Status To', 'Status To', 'string'],
    ['reference_number', 'Reference Number', 'Reference Number', 'string'],
  ],
  hierarchy: [
    ['node_id', 'Node ID', 'Node ID', 'string'],
    ['parent_id', 'Parent ID', 'Parent ID', 'string'],
    ['node_type', 'Node Type', 'Node Type', 'enum'],
    ['node_number', 'Node Number', 'Node Number', 'string'],
    ['node_label', 'Node Label', 'Node Label', 'string'],
    ['node_path', 'Node Path', 'Node Path', 'string'],
    ['depth_level', 'Depth Level', 'Depth Level', 'integer'],
    ['children', 'Children', 'Children', 'json'],
  ],
  security: [
    ['username', 'Username', 'Username', 'string'],
    ['password', 'Password', 'Password', 'string'],
    ['device_name', 'Device Name', 'Device Name', 'string'],
    ['remember_me', 'Remember Me', 'Remember Me', 'boolean'],
    ['mfa_code', 'MFA Code', 'MFA Code', 'string'],
    ['requires_mfa', 'Requires MFA', 'Requires MFA', 'boolean'],
    ['token', 'Token', 'Token', 'string'],
    ['session_id', 'Session ID', 'Session ID', 'string'],
    ['success', 'Success', 'Success', 'boolean'],
  ],
  integration: [
    ['sync_run_id', 'Sync Run ID', 'Sync Run ID', 'string'],
    ['sync_direction', 'Sync Direction', 'Sync Direction', 'string'],
    ['sync_domain', 'Sync Domain', 'Sync Domain', 'string'],
    ['sync_status', 'Sync Status', 'Sync Status', 'enum'],
    ['last_success_at', 'Last Success At', 'Last Success At', 'timestamp'],
    ['reconciliation_gap_qty', 'Reconciliation Gap Qty', 'Reconciliation Gap Qty', 'number'],
    ['reconciliation_gap_minutes', 'Reconciliation Gap Minutes', 'Reconciliation Gap Minutes', 'integer'],
    ['outbox_event_id', 'Outbox Event ID', 'Outbox Event ID', 'string'],
    ['transaction_type', 'Transaction Type', 'Transaction Type', 'string'],
    ['last_error', 'Last Error', 'Last Error', 'textarea'],
  ],
  metrics: [
    ['metric_name', 'Metric Name', 'Metric Name', 'string'],
    ['metric_value', 'Metric Value', 'Metric Value', 'number'],
    ['metric_target', 'Metric Target', 'Metric Target', 'number'],
    ['metric_unit', 'Metric Unit', 'Metric Unit', 'string'],
    ['trend_direction', 'Trend Direction', 'Trend Direction', 'enum'],
    ['trend_pct', 'Trend Percent', 'Trend Percent', 'number'],
    ['period_label', 'Period Label', 'Period Label', 'string'],
    ['generated_at', 'Generated At', 'Generated At', 'timestamp'],
  ],
  api_meta: [
    ['ok', 'OK', 'OK', 'boolean'],
    ['message', 'Message', 'Message', 'string'],
    ['estimate', 'Estimate', 'Estimate', 'number'],
    ['quote', 'Quote', 'Quote', 'json'],
    ['schemas', 'Schemas', 'Schemas', 'json'],
    ['schema', 'Schema', 'Schema', 'json'],
    ['tabs', 'Tabs', 'Tabs', 'json'],
    ['keys', 'Keys', 'Keys', 'json'],
  ],
  auth_session: [
    ['logged_in', 'Logged In', 'Logged In', 'boolean'],
    ['mfa_pending', 'MFA Pending', 'MFA Pending', 'boolean'],
    ['enroll_pending', 'Enrollment Pending', 'Enrollment Pending', 'boolean'],
    ['mfa_required', 'MFA Required', 'MFA Required', 'boolean'],
    ['enroll_required', 'Enrollment Required', 'Enrollment Required', 'boolean'],
    ['pending_expires_in', 'Pending Expires In', 'Pending Expires In', 'integer'],
    ['auth_expired', 'Auth Expired', 'Auth Expired', 'string'],
    ['initialized', 'Initialized', 'Initialized', 'boolean'],
    ['csrf_token', 'CSRF Token', 'CSRF Token', 'string'],
    ['server_time', 'Server Time', 'Server Time', 'timestamp'],
    ['issuer', 'Issuer', 'Issuer', 'string'],
    ['account', 'Account', 'Account', 'string'],
    ['secret', 'Secret', 'Secret', 'string'],
    ['otpauth_url', 'OTPAuth URL', 'OTPAuth URL', 'url'],
    ['code', 'Code', 'Code', 'string'],
    ['otp', 'OTP', 'OTP', 'string'],
    ['recovery', 'Recovery Code', 'Recovery Code', 'string'],
  ],
  git_admin: [
    ['pushed', 'Pushed', 'Pushed', 'boolean'],
    ['pulled', 'Pulled', 'Pulled', 'boolean'],
    ['branch', 'Branch', 'Branch', 'string'],
    ['files', 'Files', 'Files', 'json'],
    ['status_entries', 'Status Entries', 'Status Entries', 'json'],
    ['commit_output', 'Commit Output', 'Commit Output', 'textarea'],
    ['push_output', 'Push Output', 'Push Output', 'textarea'],
    ['head_before', 'Head Before', 'Head Before', 'string'],
    ['head_after', 'Head After', 'Head After', 'string'],
    ['before_head', 'Before Head', 'Before Head', 'string'],
    ['after_head', 'After Head', 'After Head', 'string'],
    ['changed_files', 'Changed Files', 'Changed Files', 'json'],
    ['presync', 'Presync', 'Presync', 'json'],
    ['fetch_output', 'Fetch Output', 'Fetch Output', 'textarea'],
    ['pull_output', 'Pull Output', 'Pull Output', 'textarea'],
  ],
  module_schema_contract: [
    ['moduleId', 'Module ID', 'Module ID', 'string'],
    ['title', 'Title', 'Title', 'json'],
    ['roles', 'Roles', 'Roles', 'json'],
    ['version', 'Version', 'Version', 'integer'],
    ['tabCount', 'Tab Count', 'Tab Count', 'integer'],
    ['blockCount', 'Block Count', 'Block Count', 'integer'],
    ['saved', 'Saved', 'Saved', 'boolean'],
    ['deleted', 'Deleted', 'Deleted', 'boolean'],
    ['reset', 'Reset', 'Reset', 'boolean'],
    ['action', 'Action', 'Action', 'string'],
    ['method', 'Method', 'Method', 'string'],
    ['label', 'Label', 'Label', 'string'],
    ['module', 'Module', 'Module', 'string'],
  ],
  quote_contract: [
    ['id', 'ID', 'ID', 'string'],
    ['contact_name', 'Contact Name', 'Contact Name', 'string'],
    ['contact_email', 'Contact Email', 'Contact Email', 'email'],
    ['rfq_number', 'RFQ Number', 'RFQ Number', 'string'],
    ['line_items', 'Line Items', 'Line Items', 'json'],
    ['to_status', 'To Status', 'To Status', 'string'],
    ['po_number', 'PO Number', 'PO Number', 'string'],
    ['dimensions', 'Dimensions', 'Dimensions', 'json'],
    ['complexity', 'Complexity', 'Complexity', 'string'],
  ],
};
const extraEnums = {
  inspection_level: {
    label: 'Inspection Level',
    labelEn: 'Inspection Level',
    options: [
      { value: 'I', label: 'Level I', labelEn: 'Level I', color: '#94a3b8' },
      { value: 'II', label: 'Level II', labelEn: 'Level II', color: '#3b82f6' },
      { value: 'III', label: 'Level III', labelEn: 'Level III', color: '#8b5cf6' },
      { value: 'S1', label: 'Special S1', labelEn: 'Special S1', color: '#10b981' },
      { value: 'S2', label: 'Special S2', labelEn: 'Special S2', color: '#0ea5e9' },
      { value: 'S3', label: 'Special S3', labelEn: 'Special S3', color: '#f59e0b' },
      { value: 'S4', label: 'Special S4', labelEn: 'Special S4', color: '#ef4444' },
    ],
  },
  export_control: {
    label: 'Export Control',
    labelEn: 'Export Control',
    options: [
      { value: 'not_controlled', label: 'Not Controlled', labelEn: 'Not Controlled', color: '#94a3b8' },
      { value: 'ear99', label: 'EAR99', labelEn: 'EAR99', color: '#3b82f6' },
      { value: 'eccn', label: 'ECCN', labelEn: 'ECCN', color: '#8b5cf6' },
      { value: 'itar', label: 'ITAR', labelEn: 'ITAR', color: '#ef4444' },
      { value: 'dual_use', label: 'Dual Use', labelEn: 'Dual Use', color: '#f59e0b' },
    ],
  },
  nadcap_process: {
    label: 'NADCAP Process',
    labelEn: 'NADCAP Process',
    options: [
      { value: 'heat_treat', label: 'Heat Treat', labelEn: 'Heat Treat', color: '#ef4444' },
      { value: 'chemical_processing', label: 'Chemical Processing', labelEn: 'Chemical Processing', color: '#3b82f6' },
      { value: 'coatings', label: 'Coatings', labelEn: 'Coatings', color: '#8b5cf6' },
      { value: 'ndt', label: 'NDT', labelEn: 'NDT', color: '#10b981' },
      { value: 'welding', label: 'Welding', labelEn: 'Welding', color: '#f59e0b' },
    ],
  },
  fulfillment_status: {
    label: 'Fulfillment Status',
    labelEn: 'Fulfillment Status',
    options: [
      { value: 'planning', label: 'Planning', labelEn: 'Planning', color: '#94a3b8' },
      { value: 'ready_to_release', label: 'Ready to Release', labelEn: 'Ready to Release', color: '#3b82f6' },
      { value: 'in_process', label: 'In Process', labelEn: 'In Process', color: '#f59e0b' },
      { value: 'pending_shipment', label: 'Pending Shipment', labelEn: 'Pending Shipment', color: '#8b5cf6' },
      { value: 'shipped', label: 'Shipped', labelEn: 'Shipped', color: '#10b981' },
      { value: 'closed', label: 'Closed', labelEn: 'Closed', color: '#6b7280' },
      { value: 'on_hold', label: 'On Hold', labelEn: 'On Hold', color: '#ef4444' },
    ],
  },
  contract_review_status: {
    label: 'Contract Review Status',
    labelEn: 'Contract Review Status',
    options: [
      { value: 'pending', label: 'Pending', labelEn: 'Pending', color: '#94a3b8' },
      { value: 'in_review', label: 'In Review', labelEn: 'In Review', color: '#3b82f6' },
      { value: 'approved', label: 'Approved', labelEn: 'Approved', color: '#10b981' },
      { value: 'conditional', label: 'Conditional', labelEn: 'Conditional', color: '#f59e0b' },
      { value: 'rejected', label: 'Rejected', labelEn: 'Rejected', color: '#ef4444' },
    ],
  },
  sync_status: {
    label: 'Sync Status',
    labelEn: 'Sync Status',
    options: [
      { value: 'queued', label: 'Queued', labelEn: 'Queued', color: '#94a3b8' },
      { value: 'running', label: 'Running', labelEn: 'Running', color: '#3b82f6' },
      { value: 'success', label: 'Success', labelEn: 'Success', color: '#10b981' },
      { value: 'partial', label: 'Partial', labelEn: 'Partial', color: '#f59e0b' },
      { value: 'failed', label: 'Failed', labelEn: 'Failed', color: '#ef4444' },
    ],
  },
};
const mergedEnums = { ...extraEnums, ...deepExtraEnums };

const specialFieldSpecs = {
  status: [
    { key: 'ok', type: 'boolean' },
    { key: 'logged_in', type: 'boolean' },
    { key: 'mfa_pending', type: 'boolean' },
    { key: 'enroll_pending', type: 'boolean' },
    { key: 'pending_expires_in', type: 'integer' },
    { key: 'auth_expired', type: 'string' },
    { key: 'user', type: 'json' },
    { key: 'csrf_token', type: 'string' },
    { key: 'server_time', type: 'datetime' },
    { key: 'initialized', type: 'boolean' },
    { key: 'issuer', type: 'string' },
    { key: 'account', type: 'string' },
    { key: 'username', type: 'string' },
    { key: 'secret', type: 'string' },
    { key: 'otpauth_url', type: 'url' },
  ],
  auth_login: [
    { key: 'username', type: 'string', required: true },
    { key: 'password', type: 'string', required: true },
    { key: 'code', type: 'string' },
    { key: 'otp', type: 'string' },
    { key: 'user', type: 'json' },
    { key: 'ok', type: 'boolean' },
    { key: 'logged_in', type: 'boolean' },
    { key: 'mfa_required', type: 'boolean' },
    { key: 'enroll_required', type: 'boolean' },
    { key: 'message', type: 'string' },
    { key: 'pending_expires_in', type: 'integer' },
    { key: 'issuer', type: 'string' },
    { key: 'account', type: 'string' },
    { key: 'secret', type: 'string' },
    { key: 'otpauth_url', type: 'url' },
    { key: 'csrf_token', type: 'string' },
  ],
  auth_logout: [
    { key: 'ok', type: 'boolean' },
    { key: 'logged_in', type: 'boolean' },
  ],
  auth_mfa_verify: [
    { key: 'username', type: 'string' },
    { key: 'password', type: 'string' },
    { key: 'code', type: 'string', required: true },
    { key: 'ok', type: 'boolean' },
    { key: 'logged_in', type: 'boolean' },
    { key: 'user', type: 'json' },
    { key: 'csrf_token', type: 'string' },
  ],
  admin_git_status: [
    { key: 'repo_path', type: 'string' },
    { key: 'remote_url', type: 'string' },
    { key: 'branch', type: 'string' },
    { key: 'remote_branch', type: 'string' },
    { key: 'head', type: 'json' },
    { key: 'remote_head', type: 'json' },
    { key: 'ahead_count', type: 'integer' },
    { key: 'behind_count', type: 'integer' },
    { key: 'working_tree_clean', type: 'boolean' },
    { key: 'meaningful_dirty_count', type: 'integer' },
    { key: 'meaningful_dirty_paths', type: 'json' },
    { key: 'meaningful_dirty_entries', type: 'json' },
    { key: 'remote_origin_hash', type: 'string' },
    { key: 'remote_ref_stale', type: 'boolean' },
    { key: 'fetch_error', type: 'string' },
    { key: 'server_time', type: 'datetime' },
  ],
  admin_clear_site_cache: [
    { key: 'message', type: 'string' },
  ],
  module_api_catalog: [
    { key: 'action', type: 'string', filterable: true, sortable: true },
    { key: 'method', type: 'string', filterable: true, sortable: true },
    { key: 'label', type: 'string' },
    { key: 'module', type: 'string', filterable: true, sortable: true },
    { key: 'keys', type: 'json' },
  ],
  module_schema_list: [
    { key: 'moduleId', type: 'string', filterable: true, sortable: true },
    { key: 'title', type: 'json' },
    { key: 'icon', type: 'string' },
    { key: 'route', type: 'string' },
    { key: 'roles', type: 'json' },
    { key: 'version', type: 'integer', sortable: true },
    { key: 'tabCount', type: 'integer', sortable: true },
    { key: 'blockCount', type: 'integer', sortable: true },
  ],
  module_schema_get: [
    { key: 'moduleId', type: 'string' },
    { key: 'title', type: 'json' },
    { key: 'icon', type: 'string' },
    { key: 'route', type: 'string' },
    { key: 'roles', type: 'json' },
    { key: 'version', type: 'integer' },
    { key: 'tabs', type: 'json' },
  ],
  module_schema_save: [
    { key: 'moduleId', type: 'string', required: true },
    { key: 'title', type: 'json' },
    { key: 'icon', type: 'string' },
    { key: 'route', type: 'string' },
    { key: 'roles', type: 'json' },
    { key: 'tabs', type: 'json' },
    { key: 'version', type: 'integer' },
    { key: 'saved', type: 'boolean' },
  ],
  module_schema_delete: [
    { key: 'moduleId', type: 'string', required: true },
    { key: 'deleted', type: 'boolean' },
  ],
  module_schema_reset: [
    { key: 'moduleId', type: 'string', required: true },
    { key: 'reset', type: 'boolean' },
  ],
  quote_create: [
    { key: 'customer_id', type: 'string', required: true },
    { key: 'customer_name', type: 'string', required: true },
    { key: 'contact_name', type: 'string' },
    { key: 'contact_email', type: 'email' },
    { key: 'rfq_number', type: 'string' },
    { key: 'valid_until', type: 'date' },
    { key: 'currency', type: 'select' },
    { key: 'notes', type: 'textarea' },
    { key: 'line_items', type: 'json', required: true },
    { key: 'quote_id', type: 'uuid' },
    { key: 'status', type: 'badge' },
    { key: 'revision', type: 'integer' },
    { key: 'total_value', type: 'currency' },
    { key: 'lines', type: 'json' },
    { key: 'created_at', type: 'datetime' },
    { key: 'updated_at', type: 'datetime' },
  ],
  quote_update: [
    { key: 'id', type: 'string', required: true },
    { key: 'customer_id', type: 'string' },
    { key: 'customer_name', type: 'string' },
    { key: 'contact_name', type: 'string' },
    { key: 'contact_email', type: 'email' },
    { key: 'rfq_number', type: 'string' },
    { key: 'valid_until', type: 'date' },
    { key: 'currency', type: 'select' },
    { key: 'notes', type: 'textarea' },
    { key: 'line_items', type: 'json' },
    { key: 'quote_id', type: 'uuid' },
    { key: 'status', type: 'badge' },
    { key: 'revision', type: 'integer' },
    { key: 'total_value', type: 'currency' },
    { key: 'lines', type: 'json' },
    { key: 'updated_at', type: 'datetime' },
    { key: 'updated_by', type: 'string' },
  ],
  quote_transition: [
    { key: 'id', type: 'string', required: true },
    { key: 'to_status', type: 'string', required: true },
    { key: 'comment', type: 'textarea' },
    { key: 'quote_id', type: 'uuid' },
    { key: 'status', type: 'badge' },
    { key: 'status_history', type: 'json' },
    { key: 'updated_at', type: 'datetime' },
  ],
  quote_convert_to_so: [
    { key: 'id', type: 'string', required: true },
    { key: 'po_number', type: 'string' },
    { key: 'quote_id', type: 'uuid' },
    { key: 'so_number', type: 'string' },
    { key: 'quote', type: 'json' },
  ],
  quote_estimate_cycle: [
    { key: 'material', type: 'string', required: true },
    { key: 'operations', type: 'json', required: true },
    { key: 'dimensions', type: 'json' },
    { key: 'complexity', type: 'string' },
    { key: 'estimate', type: 'number' },
  ],
  quote_estimate_material: [
    { key: 'material_type', type: 'string', required: true },
    { key: 'dimensions', type: 'json', required: true },
    { key: 'buy_to_fly', type: 'number' },
    { key: 'qty', type: 'integer' },
    { key: 'estimate', type: 'number' },
  ],
};
const specialApiSpecs = {
  status: {
    descriptionEn: 'Get current authentication and enrollment status',
    params: [],
    response: { type: 'object', fields: specialFieldSpecs.status.map((f) => f.key), pagination: false },
  },
  auth_login: {
    descriptionEn: 'Authenticate with username, password, and optional one-time code',
    params: [
      { key: 'username', type: 'string', required: true, description: 'Username' },
      { key: 'password', type: 'string', required: true, description: 'Password' },
      { key: 'code', type: 'string', required: false, description: 'Inline authenticator code' },
      { key: 'otp', type: 'string', required: false, description: 'Alias for inline authenticator code' },
    ],
    response: { type: 'object', fields: ['ok', 'logged_in', 'user', 'csrf_token', 'mfa_required', 'enroll_required', 'message', 'pending_expires_in', 'issuer', 'account', 'secret', 'otpauth_url'], pagination: false },
  },
  auth_logout: {
    descriptionEn: 'Destroy the current authenticated session',
    params: [],
    response: { type: 'object', fields: ['ok', 'logged_in'], pagination: false },
  },
  auth_mfa_verify: {
    descriptionEn: 'Verify MFA code and complete login',
    params: [
      { key: 'code', type: 'string', required: true, description: 'Authenticator verification code' },
      { key: 'username', type: 'string', required: false, description: 'Username fallback when preauth session is absent' },
      { key: 'password', type: 'string', required: false, description: 'Password fallback when preauth session is absent' },
    ],
    response: { type: 'object', fields: ['ok', 'logged_in', 'user', 'csrf_token'], pagination: false },
  },
  admin_git_status: {
    descriptionEn: 'Read live repository status from the VPS without modifying the working tree',
    params: [],
    response: { type: 'object', fields: specialFieldSpecs.admin_git_status.map((f) => f.key), pagination: false },
  },
  admin_clear_site_cache: {
    descriptionEn: 'Request origin and browser cache invalidation',
    params: [],
    response: { type: 'object', fields: ['message'], pagination: false },
  },
  module_api_catalog: {
    descriptionEn: 'List bindable API endpoints for the module builder',
    params: [],
    response: { type: 'object', fields: specialFieldSpecs.module_api_catalog.map((f) => f.key), pagination: false, collection_key: 'catalog' },
  },
  module_schema_list: {
    descriptionEn: 'List all saved module schemas',
    params: [],
    response: { type: 'object', fields: specialFieldSpecs.module_schema_list.map((f) => f.key), pagination: true, collection_key: 'schemas', total_field: 'count' },
  },
  module_schema_get: {
    descriptionEn: 'Get a single module schema by module ID',
    params: [
      { key: 'id', type: 'string', required: true, description: 'Module schema identifier' },
    ],
    response: { type: 'object', fields: specialFieldSpecs.module_schema_get.map((f) => f.key), pagination: false, entity_key: 'schema' },
  },
  module_schema_save: {
    descriptionEn: 'Create or update a module schema',
    params: [
      { key: 'moduleId', type: 'string', required: true, description: 'Module schema identifier' },
      { key: 'title', type: 'object', required: false, description: 'Localized module title object' },
      { key: 'icon', type: 'string', required: false, description: 'Module icon name' },
      { key: 'route', type: 'string', required: false, description: 'Portal route' },
      { key: 'roles', type: 'array', required: false, description: 'Allowed role list' },
      { key: 'tabs', type: 'array', required: false, description: 'Tab and block schema payload' },
      { key: 'schema', type: 'object', required: false, description: 'Complete schema payload when nested under schema' },
    ],
    response: { type: 'object', fields: ['saved', 'moduleId', 'version'], pagination: false },
  },
  module_schema_delete: {
    descriptionEn: 'Delete a module schema',
    params: [
      { key: 'moduleId', type: 'string', required: true, description: 'Module schema identifier' },
    ],
    response: { type: 'object', fields: ['deleted'], pagination: false },
  },
  module_schema_reset: {
    descriptionEn: 'Reset a module schema from defaults',
    params: [
      { key: 'moduleId', type: 'string', required: true, description: 'Module schema identifier' },
    ],
    response: { type: 'object', fields: ['reset', 'moduleId'], pagination: false },
  },
  quote_create: {
    descriptionEn: 'Create a quote header and line-item package',
    params: [
      { key: 'customer_id', type: 'string', required: true, description: 'Customer identifier' },
      { key: 'customer_name', type: 'string', required: true, description: 'Customer display name' },
      { key: 'contact_name', type: 'string', required: false, description: 'Customer contact name' },
      { key: 'contact_email', type: 'string', required: false, description: 'Customer contact email' },
      { key: 'rfq_number', type: 'string', required: false, description: 'Customer RFQ number' },
      { key: 'valid_until', type: 'string', required: false, description: 'Quote valid-until date (YYYY-MM-DD)' },
      { key: 'currency', type: 'string', required: false, description: 'Quote currency code' },
      { key: 'notes', type: 'string', required: false, description: 'Header notes' },
      { key: 'line_items', type: 'array', required: true, description: 'Array of quote line items' },
    ],
    response: { type: 'object', fields: ['quote_id', 'status', 'revision', 'total_value', 'lines', 'created_at', 'updated_at'], pagination: false, entity_key: 'quote' },
  },
  quote_update: {
    descriptionEn: 'Update an existing quote header or line set',
    params: [
      { key: 'id', type: 'string', required: true, description: 'Quote identifier' },
      { key: 'customer_id', type: 'string', required: false, description: 'Customer identifier' },
      { key: 'customer_name', type: 'string', required: false, description: 'Customer display name' },
      { key: 'contact_name', type: 'string', required: false, description: 'Customer contact name' },
      { key: 'contact_email', type: 'string', required: false, description: 'Customer contact email' },
      { key: 'rfq_number', type: 'string', required: false, description: 'Customer RFQ number' },
      { key: 'valid_until', type: 'string', required: false, description: 'Quote valid-until date (YYYY-MM-DD)' },
      { key: 'currency', type: 'string', required: false, description: 'Quote currency code' },
      { key: 'notes', type: 'string', required: false, description: 'Header notes' },
      { key: 'line_items', type: 'array', required: false, description: 'Array of quote line items' },
    ],
    response: { type: 'object', fields: ['quote_id', 'status', 'revision', 'total_value', 'lines', 'updated_at', 'updated_by'], pagination: false, entity_key: 'quote' },
  },
  quote_transition: {
    descriptionEn: 'Transition a quote between lifecycle statuses',
    params: [
      { key: 'id', type: 'string', required: true, description: 'Quote identifier' },
      { key: 'to_status', type: 'string', required: true, description: 'Target quote status' },
      { key: 'comment', type: 'string', required: false, description: 'Transition comment' },
    ],
    response: { type: 'object', fields: ['quote_id', 'status', 'status_history', 'updated_at'], pagination: false, entity_key: 'quote' },
  },
  quote_convert_to_so: {
    descriptionEn: 'Convert an accepted quote into a sales order',
    params: [
      { key: 'id', type: 'string', required: true, description: 'Quote identifier' },
      { key: 'po_number', type: 'string', required: false, description: 'Customer purchase order number' },
    ],
    response: { type: 'object', fields: ['quote', 'so_number'], pagination: false },
  },
  quote_estimate_cycle: {
    descriptionEn: 'Estimate CNC cycle time from material and operation parameters',
    params: [
      { key: 'material', type: 'string', required: true, description: 'Material type' },
      { key: 'operations', type: 'array', required: true, description: 'Operation list' },
      { key: 'dimensions', type: 'object', required: false, description: 'Part dimensions' },
      { key: 'complexity', type: 'string', required: false, description: 'Complexity band' },
    ],
    response: { type: 'object', fields: ['estimate'], pagination: false },
  },
  quote_estimate_material: {
    descriptionEn: 'Estimate material cost from dimensions and buy-to-fly assumptions',
    params: [
      { key: 'material_type', type: 'string', required: true, description: 'Material grade or family' },
      { key: 'dimensions', type: 'object', required: true, description: 'Raw stock dimensions' },
      { key: 'buy_to_fly', type: 'number', required: false, description: 'Buy-to-fly ratio' },
      { key: 'qty', type: 'integer', required: false, description: 'Quantity' },
    ],
    response: { type: 'object', fields: ['estimate'], pagination: false },
  },
};

const packKeys = {};
const lib = {};
for (const [cat, cfg] of Object.entries(variableLibrary.categories || {})) {
  packKeys[cat] = [];
  for (const [rawKey, def] of Object.entries(cfg.variables || {})) {
    const key = def.key || rawKey;
    if (!lib[key]) {
      lib[key] = {
        key,
        label: def.label_vi || titleize(key),
        labelEn: def.label || titleize(key),
        vType: def.type || 'string',
        required: !!def.required,
        enumValues: def.enum_values || null,
      };
    }
    packKeys[cat].push(key);
  }
}
for (const [pack, defs] of Object.entries(manualPacks)) {
  packKeys[pack] = defs.map((d) => d[0]);
  for (const [key, label, labelEn, vType] of defs) {
    if (!lib[key]) lib[key] = { key, label, labelEn, vType, required: false };
  }
}
for (const [endpoint, fields] of Object.entries(currentFields)) {
  if (endpoint === '_meta' || !Array.isArray(fields)) continue;
  for (const f of fields) {
    if (!lib[f.key]) {
      lib[f.key] = {
        key: f.key,
        label: f.label || titleize(f.key),
        labelEn: f.labelEn || titleize(f.key),
        vType: 'string',
        required: !!f.required,
        currentType: f.type,
      };
    }
  }
}
const kindOf = (action, method) => {
  if (action === 'status') return 'detail';
  if (action === 'module_api_catalog' || action === 'module_schema_list') return 'list';
  if (action.endsWith('_list') || /_users$|_entities$|_types$/.test(action)) return 'list';
  if (action.endsWith('_detail') || action.endsWith('_get')) return 'detail';
  if (action.endsWith('_create') || action.endsWith('_add') || action.endsWith('_slot_create')) return 'create';
  if (action.endsWith('_update') || action.endsWith('_save') || action.endsWith('_slot_update')) return 'update';
  if (/(dashboard|analytics|_kpi|_stats|summary|overview)/.test(action)) return 'dashboard';
  if (/(timeline|history)/.test(action)) return 'history';
  if (/(hierarchy|tree)/.test(action)) return 'hierarchy';
  if (/(search)/.test(action)) return 'search';
  if (/(transition|status|hold|release|send|confirm|convert|assign|approve|reject|acknowledge|clock|sync|delete|reset|pull|clear|vote|comment|generate|estimate|report|export|scan|login|logout|verify|peek)/.test(action)) return 'action';
  return method === 'GET' ? 'detail' : 'action';
};

const prefixOf = (action) => action.split('_')[0];
const scalarSortable = (type) => !['json', 'textarea', 'image'].includes(type);
const idLike = (key) => /(^id$|_id$|Id$|_number$|_code$)/.test(key);
const fallbackIdForAction = (action) => {
  if (action === 'status' || /^auth_/.test(action) || /^dashboard_/.test(action) || /^registry_/.test(action)) return null;
  if (/^order_so_/.test(action)) return 'so_id';
  if (/^order_jo_/.test(action)) return 'jo_id';
  if (/^order_wo_/.test(action)) return 'wo_id';
  if (/^quote_/.test(action)) return 'quote_id';
  if (/^supplier_incoming_/.test(action)) return 'inspection_id';
  if (/^supplier_scar_/.test(action)) return 'scar_id';
  if (/^supplier_audit_/.test(action)) return 'audit_id';
  if (/^supplier_asl_/.test(action)) return 'asl_id';
  if (/^quality_exception_/.test(action)) return 'ncr_id';
  if (/^product_passport_/.test(action)) return 'passport_id';
  if (/^cnc_program_/.test(action)) return 'program_id';
  if (/^schedule_slot_/.test(action)) return 'slot_id';
  if (/^module_schema_/.test(action)) return 'module_id';
  return `${action.split('_')[0]}_id`;
};
const mainId = (fields, candidates, action) => {
  const keys = [
    ...fields.map((f) => f.key),
    ...candidates,
  ];
  return keys.find((k) => /_id$|Id$|^id$/.test(k)) || fallbackIdForAction(action);
};

const fieldType = (def, key, kind, existingType) => {
  if (existingType) return existingType;
  if (def.currentType) return def.currentType;
  if (key === 'timezone' || key === 'time_compact' || key === 'date_compact') return 'string';
  if (def.vType === 'timestamp') return 'datetime';
  if (def.vType === 'date') return 'date';
  if (def.vType === 'boolean') return 'boolean';
  if (def.vType === 'enum') {
    return kind === 'create' || kind === 'update' || kind === 'action'
      ? 'select'
      : /(status|phase|priority|severity|result|approval|rating|hold|band)/.test(key)
        ? 'badge'
        : 'select';
  }
  if (/(email)/.test(key)) return 'email';
  if (/(phone|mobile)/.test(key)) return 'phone';
  if (/(url|link)$/.test(key)) return 'url';
  if (/(image|photo|qr_code)/.test(key)) return 'image';
  if (/(json|payload|metadata|requirements|lines|line_items|operations|events|cards|milestones|documents|measurements|children|elements|deliverables|team_members|photos|results|breakdown|summary|roles|tabs|schemas|catalog|quote|user|presync|files|keys|dimensions)/.test(key)) return 'json';
  if (/(notes|description|comment|reason|analysis|scope|minutes|error|output|message)/.test(key)) return 'textarea';
  if (/(program|checksum|source_code|nc_code)/.test(key)) return 'code';
  if (/(progress|completion_pct|readiness_score)/.test(key)) return 'progress';
  if (/(weight)/.test(key)) return 'weight';
  if (/(length|width|height|diameter|thickness|depth|nominal|usl|lsl|tolerance|dimension|offset)/.test(key)) return 'dimension';
  if (/(time|duration|hours|minutes|queue|setup_time|run_time|cycle_time|lead_time)/.test(key) && !/(date|_at$)/.test(key)) return 'duration';
  if (/(cost|price|amount|value|revenue|expense|budget|margin|credit|debit|balance)/.test(key)) return 'currency';
  if (/(pct|percent|rate|yield|utilization|efficiency|score)/.test(key)) return 'percent';
  if (/(qty|quantity|count|days|level|revision|sequence|seq|attempts|balloon_number)/.test(key)) return 'integer';
  if (def.vType === 'number') return 'number';
  return 'string';
};

const buildField = (spec, prev, def, key, kind, pk) => {
  const type = spec.type || fieldType(def, key, kind, prev?.type);
  const required = spec.required ?? (kind === 'update' ? key === pk : kind === 'create' ? !!(prev?.required ?? def.required) : false);
  return {
    key,
    label: spec.label || prev?.label || def.label || titleize(key),
    labelEn: spec.labelEn || prev?.labelEn || def.labelEn || titleize(key),
    type,
    required,
    filterable: spec.filterable ?? false,
    sortable: spec.sortable ?? false,
  };
};

const generatedFields = { _meta: currentFields._meta };
const fieldPackHints = {};
const fieldPackRegistry = {
  _meta: {
    version: '1.0',
    description: 'Canonical domain field packs generated from variable_library, benchmarks, and ERP/QMS world-class research.',
  },
  packs: {},
};
for (const [pack, keys] of Object.entries(packKeys)) {
  fieldPackRegistry.packs[pack] = keys.map((k) => ({
    key: k,
    label: lib[k].label,
    labelEn: lib[k].labelEn,
  }));
}

for (const api of apiCatalog) {
  const kind = kindOf(api.action, actionMethod(api));
  const contract = routeContracts[api.action] || {};
  const prefix = prefixOf(api.action);
  const existing = Array.isArray(currentFields[api.action]) ? currentFields[api.action] : [];
  const exMap = Object.fromEntries(existing.map((f) => [f.key, f]));

  if (specialFieldSpecs[api.action]) {
    const pk = mainId(existing, specialFieldSpecs[api.action].map((f) => f.key), api.action);
    generatedFields[api.action] = specialFieldSpecs[api.action].map((spec) => {
      const key = spec.key;
      const prev = exMap[key];
      const def = lib[key] || { key, label: titleize(key), labelEn: titleize(key), vType: 'string', required: false };
      return buildField(spec, prev, def, key, kind, pk);
    });
    continue;
  }

  const extras = uniq([
    ...existing.map((f) => f.key),
    ...(contract.bodyFields || []),
    ...(contract.queryParams || []),
    ...(baseCats[kind] || []),
    ...(prefixCats[prefix] || []),
    /(timeline|history)/.test(api.action) ? 'timeline' : '',
    /(hierarchy|tree)/.test(api.action) ? 'hierarchy' : '',
    /(dashboard|analytics|_kpi|summary|stats)/.test(api.action) ? 'metrics' : '',
    /(login|logout|mfa)/.test(api.action) ? 'security' : '',
    /(sync|reconcile|git)/.test(api.action) ? 'integration' : '',
    /order|quote|dispatch|delivery|packing|mobile|supplier|subcontract|cnc|product/.test(api.action) ? 'cockpit' : '',
  ]);
  fieldPackHints[api.action] = extras.filter((name) => packKeys[name]);
  const candidates = uniq(extras.flatMap((name) => packKeys[name] || [name]));
  const pk = mainId(existing, candidates, api.action);
  const limit = Math.max(
    existing.length,
    (contract.bodyFields || []).length + (contract.queryParams || []).length + 6,
    /(delete|reset|clear|logout)$/.test(api.action) ? 4 : /(login|verify|acknowledge|release|confirm|vote|comment)$/.test(api.action) ? 8 : quotas[kind] || 10,
  );
  generatedFields[api.action] = candidates.slice(0, limit).map((key) => {
    const prev = exMap[key];
    const def = lib[key] || { key, label: titleize(key), labelEn: titleize(key), vType: 'string', required: false };
    const type = fieldType(def, key, kind, prev?.type);
    const required = kind === 'update'
      ? key === pk || (contract.requiredBodyFields || []).includes(key)
      : kind === 'create'
        ? ((contract.requiredBodyFields || []).includes(key) || (prev?.required ?? def.required))
        : kind === 'action'
          ? !!(prev?.required || (contract.requiredBodyFields || []).includes(key) || key === pk || ['entity_id', 'target_status', 'username', 'password', 'mfa_code'].includes(key))
          : !!prev?.required;
    const filterable = ['list', 'search', 'history', 'hierarchy'].includes(kind)
      ? true
      : kind === 'detail'
        ? idLike(key) || /(status|date|priority|severity|customer|vendor|machine|part|job|order)/.test(key)
        : false;
    const sortable = ['list', 'search', 'history', 'hierarchy'].includes(kind)
      ? scalarSortable(type)
      : kind === 'detail'
        ? scalarSortable(type) && (idLike(key) || /(date|status|priority|severity|score|amount|value|qty|quantity)/.test(key))
        : false;
    return {
      key,
      label: prev?.label || def.label || titleize(key),
      labelEn: prev?.labelEn || def.labelEn || titleize(key),
      type,
      required,
      filterable,
      sortable,
    };
  });
}
const paramType = (type) => {
  if (type === 'integer') return 'integer';
  if (['number', 'currency', 'percent', 'progress', 'weight', 'dimension', 'duration'].includes(type)) return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'json') return 'object';
  if (type === 'tags') return 'array';
  return 'string';
};

const params = {
  _meta: {
    version: '1.0',
    description: 'API parameter definitions - input params and response schema for every endpoint',
    generatedAt: new Date().toISOString(),
  },
};

for (const api of apiCatalog) {
  if (specialApiSpecs[api.action]) {
    params[api.action] = {
      method: actionMethod(api),
      module: api.module,
      description: api.label,
      descriptionEn: specialApiSpecs[api.action].descriptionEn,
      params: specialApiSpecs[api.action].params,
      response: specialApiSpecs[api.action].response,
    };
    continue;
  }

  const fields = generatedFields[api.action] || [];
  const kind = kindOf(api.action, actionMethod(api));
  const contract = routeContracts[api.action] || {};
  const pk = mainId(fields, fields.map((f) => f.key), api.action);
  let p = [];

  if (['list', 'search', 'history'].includes(kind)) {
    const keys = uniq([
      'status',
      'search',
      'date_from',
      'date_to',
      'sort_by',
      'sort_dir',
      'page',
      'per_page',
      ...fields.map((f) => f.key)
        .filter((k) => /(customer_id|customer_name|vendor_id|item_id|part_number|so_number|jo_number|wo_number|machine_id|work_center_id|priority|severity|result|site_id|shift_code|phase|inspection_type)/.test(k))
        .slice(0, 8),
    ]);
    p = keys.map((k) => ({
      key: k,
      type: ['page', 'per_page'].includes(k) ? 'integer' : paramType(fields.find((f) => f.key === k)?.type || 'string'),
      required: false,
      description: k === 'search'
        ? 'Full-text search keyword'
        : k === 'date_from'
          ? 'Filter from date (YYYY-MM-DD)'
          : k === 'date_to'
            ? 'Filter to date (YYYY-MM-DD)'
            : k === 'sort_by'
              ? 'Sort column name'
              : k === 'sort_dir'
                ? 'Sort direction (asc or desc)'
                : k === 'page'
                  ? 'Page number (default 1)'
                  : k === 'per_page'
                    ? 'Items per page (default 50)'
                    : `Filter by ${titleize(k)}`,
    }));
  } else if (['detail', 'hierarchy'].includes(kind)) {
    p = [
      { key: pk, type: 'string', required: true, description: `Primary identifier for ${titleize(pk)}` },
      { key: 'include_history', type: 'boolean', required: false, description: 'Include change history' },
      { key: 'include_relations', type: 'boolean', required: false, description: 'Include related records' },
    ];
  } else if (kind === 'create' || kind === 'update') {
    const base = kind === 'update'
      ? [{ key: pk, type: 'string', required: true, description: `Primary identifier for ${titleize(pk)}` }]
      : [];
    p = [
      ...base,
      ...fields
        .filter((f) => f.key !== pk && !/(created_at|updated_at|created_by|updated_by|token|success|requires_mfa|last_login)/.test(f.key))
        .map((f) => ({
          key: f.key,
          type: paramType(f.type),
          required: kind === 'create' ? !!f.required : false,
          description: titleize(f.key),
        })),
    ].slice(0, 24);
  } else if (kind === 'dashboard') {
    p = [
      { key: 'period', type: 'string', required: false, description: 'Reporting period' },
      { key: 'date_from', type: 'string', required: false, description: 'Filter from date (YYYY-MM-DD)' },
      { key: 'date_to', type: 'string', required: false, description: 'Filter to date (YYYY-MM-DD)' },
      ...fields
        .map((f) => f.key)
        .filter((k) => /(site_id|customer_id|vendor_id|part_number|work_center_id|shift_code|status)/.test(k))
        .slice(0, 6)
        .map((k) => ({ key: k, type: 'string', required: false, description: `Filter by ${titleize(k)}` })),
    ];
  } else if (/login/.test(api.action)) {
    p = [
      { key: 'username', type: 'string', required: true, description: 'Username' },
      { key: 'password', type: 'string', required: true, description: 'Password' },
      { key: 'device_name', type: 'string', required: false, description: 'Client device name' },
      { key: 'remember_me', type: 'boolean', required: false, description: 'Persist session' },
      { key: 'mfa_code', type: 'string', required: false, description: 'MFA verification code' },
    ];
  } else if (/logout/.test(api.action)) {
    p = [
      { key: 'session_id', type: 'string', required: false, description: 'Session identifier' },
      { key: 'logout_reason', type: 'string', required: false, description: 'Logout reason' },
    ];
  } else if (/mfa_verify/.test(api.action)) {
    p = [
      { key: 'code', type: 'string', required: true, description: 'Verification code' },
      { key: 'session_id', type: 'string', required: false, description: 'Session identifier' },
    ];
  } else if (/(transition|hold|release|approve|reject|confirm|status|acknowledge)/.test(api.action)) {
    p = [
      { key: pk || 'entity_id', type: 'string', required: true, description: `Primary identifier for ${titleize(pk || 'entity_id')}` },
      { key: 'target_status', type: 'string', required: /transition|status/.test(api.action), description: 'Target status' },
      { key: 'comment', type: 'string', required: false, description: 'Operator comment' },
      { key: 'reason_code', type: 'string', required: false, description: 'Reason code' },
      { key: 'effective_at', type: 'string', required: false, description: 'Effective timestamp' },
    ];
  } else if (/(delete|reset|clear)/.test(api.action)) {
    p = [
      { key: pk || 'entity_id', type: 'string', required: true, description: `Primary identifier for ${titleize(pk || 'entity_id')}` },
      { key: 'confirm', type: 'boolean', required: true, description: 'Confirmation flag' },
      { key: 'reason_code', type: 'string', required: false, description: 'Reason code' },
    ];
  } else if (/(sync|reconcile|git)/.test(api.action)) {
    p = [
      { key: 'sync_direction', type: 'string', required: false, description: 'Sync direction' },
      { key: 'sync_domain', type: 'string', required: false, description: 'Sync domain' },
      { key: 'retry_failed', type: 'boolean', required: false, description: 'Retry failed records' },
      { key: 'limit', type: 'integer', required: false, description: 'Batch size' },
      { key: 'dry_run', type: 'boolean', required: false, description: 'Simulate without commit' },
    ];
  } else {
    p = fields.slice(0, 12).map((f) => ({
      key: f.key,
      type: paramType(f.type),
      required: !!f.required,
      description: titleize(f.key),
    }));
  }

  const contractKeys = actionMethod(api) === 'GET'
    ? (contract.queryParams || [])
    : uniq([...(contract.bodyFields || []), ...(contract.queryParams || [])]);
  if (contractKeys.length) {
    const contractParams = contractKeys.map((key) => {
      const field = fields.find((f) => f.key === key);
      const required = ['detail', 'hierarchy'].includes(kind)
        ? key === pk
        : (contract.requiredBodyFields || []).includes(key);
      return {
        key,
        type: paramType(field?.type || 'string'),
        required,
        description: titleize(key),
      };
    });
    p = uniq(contractParams.map((item) => item.key)).map((key) => contractParams.find((item) => item.key === key));
  }

  const responseFields = contract.responseKeys?.length
    ? uniq([
      ...contract.responseKeys,
      ...(contract.paginated ? ['total_count', 'offset', 'limit'] : []),
      ...(pk ? [pk] : []),
    ]).filter(Boolean)
    : ['list', 'detail', 'dashboard', 'history', 'hierarchy', 'search'].includes(kind)
      ? fields.map((f) => f.key)
      : uniq([pk, ...fields.map((f) => f.key).filter((k) => /(_number$|status$|_status$|created_at|updated_at|token|success|requires_mfa|sync_status)/.test(k))]).filter(Boolean);

  params[api.action] = {
    method: actionMethod(api),
    module: api.module,
    description: api.label,
    descriptionEn: `${{
      list: 'List',
      detail: 'Get details for',
      create: 'Create',
      update: 'Update',
      dashboard: 'Dashboard for',
      history: 'History for',
      hierarchy: 'Hierarchy for',
      search: 'Search',
      action: 'Execute action for',
    }[kind] || 'Manage'} ${titleize(api.action)}`.replace(/\s+/g, ' ').trim(),
    params: p,
    response: {
      type: 'object',
      fields: responseFields,
      pagination: contract.paginated || ['list', 'search', 'history'].includes(kind),
      total_field: contract.paginated || ['list', 'search', 'history'].includes(kind) ? 'total_count' : undefined,
    },
  };
}

const schemaLibrary = {
  _meta: {
    version: '1.0',
    description: 'Canonical schema blueprints for ERP/QMS/MES domains cross-referenced to HESEM migrations.',
  },
  entities: {
    commercial_ordering: {
      description: 'Customer, quote, sales order, shipment release, promise, and fulfillment governance.',
      tables: ['customers', 'customer_sites', 'commercial_accounts', 'sales_orders', 'sales_order_lines', 'shipment_releases', 'order_document_requirements'],
      migrations: ['007_customers_sales.sql', '032_order_management_world_class_foundations.sql'],
    },
    engineering_and_planning: {
      description: 'Item master, revisions, BOM, routing, work centers, control plans, inspection plans, APQP, and PPAP.',
      tables: ['items', 'item_revisions', 'bill_of_materials', 'bom_components', 'routings', 'routing_operations', 'work_centers', 'control_plans', 'inspection_plans', 'apqp_projects', 'ppap_submissions'],
      migrations: ['006_erp_master_data.sql', '011_quality.sql', '042_fmea_apqp_control_plan_mobile.sql'],
    },
    manufacturing_execution: {
      description: 'Job and work orders, dispatching, mobile execution, NC release, adapters, alarms, handover, genealogy, energy, cost, and digital passport.',
      tables: ['job_orders', 'job_operations', 'mobile_work_queue', 'mobile_time_entries', 'mobile_inspection_captures', 'mes_connectivity_adapters', 'mes_connectivity_events', 'mes_alarm_catalog', 'mes_nc_release_packages', 'mes_nc_download_receipts', 'mes_tool_preset_offsets', 'product_passports', 'passport_events'],
      migrations: ['010_production.sql', '026_mes_world_class_foundations.sql', '032_order_management_world_class_foundations.sql', '040_digital_product_passport.sql', '042_fmea_apqp_control_plan_mobile.sql'],
    },
    quality_and_compliance: {
      description: 'Inspection, SPC, NCR, CAPA, FAI, certificates, contamination/FOD, supplier quality, and export-regulatory controls.',
      tables: ['inspection_results', 'spc_data', 'ncr_records', 'capa_records', 'fai_records', 'fai_characteristics', 'certificates', 'contamination_checks', 'incoming_inspections', 'incoming_inspection_results', 'approved_supplier_list', 'scar_records', 'supplier_audit_schedule'],
      migrations: ['011_quality.sql', '035_supplier_quality_management.sql'],
    },
    inventory_and_traceability: {
      description: 'Warehouses, locations, lot/serial, traceability, subcontract returns, and CoC/CoA evidence.',
      tables: ['warehouses', 'inventory_locations', 'lot_master', 'serial_master', 'inventory_transactions', 'outside_processing_orders'],
      migrations: ['009_inventory.sql', '032_order_management_world_class_foundations.sql'],
    },
  },
};

const nextStatus = { ...currentStatus };
for (const [key, value] of Object.entries(mergedEnums)) {
  if (!nextStatus[key]) nextStatus[key] = value;
}

const generatedAt = new Date().toISOString();
generatedFields._meta = {
  version: '2.0',
  description: 'Canonical field definitions for every routed action in the QMS / ERP / MES platform.',
  generatedAt,
  routerActions: apiCatalog.length,
  uiActions: jsCatalog.length,
};
params._meta = {
  version: '2.0',
  description: 'API input and response contracts generated from routed actions and controller contracts.',
  generatedAt,
  routerActions: apiCatalog.length,
  uiActions: jsCatalog.length,
};
fieldPackRegistry._meta = {
  version: '2.0',
  description: 'Canonical domain field packs generated from variable_library, heuristics, and world-class ERP/QMS research.',
  generatedAt,
  packCount: Object.keys(fieldPackRegistry.packs).length,
};
schemaLibrary._meta = {
  version: '2.0',
  description: 'Canonical schema blueprints for ERP/QMS/MES domains cross-referenced to HESEM migrations.',
  generatedAt,
  entityGroups: Object.keys(schemaLibrary.entities).length,
};

const endpointCount = Object.keys(generatedFields).filter((k) => k !== '_meta').length;
const fieldCount = Object.entries(generatedFields)
  .filter(([k]) => k !== '_meta')
  .reduce((sum, [, value]) => sum + value.length, 0);

const domainForAction = (action) => {
  const prefix = prefixOf(action);
  const map = {
    status: 'platform',
    auth: 'platform',
    admin: 'platform',
    module: 'platform',
    registry: 'platform',
    dict: 'platform',
    doc: 'document_control',
    docs: 'document_control',
    online: 'document_control',
    record: 'document_control',
    order: 'commercial_operations',
    quote: 'commercial_operations',
    dispatch: 'manufacturing_execution',
    schedule: 'manufacturing_execution',
    mobile: 'manufacturing_execution',
    cnc: 'manufacturing_execution',
    product: 'traceability',
    supplier: 'supplier_quality',
    subcontract: 'supplier_quality',
    oqc: 'shipping_quality',
    packing: 'shipping_quality',
    delivery: 'shipping_quality',
    quality: 'quality_management',
    evidence: 'quality_management',
    fmea: 'engineering_quality',
    apqp: 'engineering_quality',
    ppap: 'engineering_quality',
    cp: 'engineering_quality',
    dashboard: 'analytics',
    kpi: 'analytics',
    spc: 'analytics',
    ai: 'analytics',
    customer: 'customer_portal',
    compliance: 'compliance',
    knowledge: 'continuous_improvement',
    ci: 'continuous_improvement',
    energy: 'sustainability',
    master: 'master_data',
  };
  return map[prefix] || 'general';
};

const entityFromAction = (action, contract) => {
  const explicit = {
    order_so: 'sales_order',
    order_jo: 'job_order',
    order_wo: 'work_order',
    quality_exception: 'ncr_record',
    supplier_incoming: 'incoming_inspection',
    supplier_asl: 'asl_entry',
    supplier_scar: 'scar',
    supplier_audit: 'supplier_audit',
    product_passport: 'product_passport',
    schedule_slot: 'schedule_slot',
    module_schema: 'module_schema',
    customer_portal_access: 'customer_access_grant',
    customer_portal_user: 'customer_portal_user',
  };
  const key3 = action.split('_').slice(0, 3).join('_');
  const key2 = action.split('_').slice(0, 2).join('_');
  if (explicit[key3]) return explicit[key3];
  if (explicit[key2]) return explicit[key2];
  if (contract.collectionKey) return contract.collectionKey.replace(/s$/, '');
  return action
    .replace(/_(list|detail|get|create|update|save|delete|reset|transition|approve|reject|confirm|history|overview|dashboard|summary|generate|trace|qr|status|sync|vote|comment|add_event|grant|revoke)$/g, '')
    .replace(/^order_/, '')
    .replace(/^supplier_/, 'supplier_')
    .replace(/^customer_portal_/, 'customer_portal_');
};

const enumRefForKey = (key) => nextStatus[key] ? key : null;
const formatHintFor = (key, type) => {
  if (/email/.test(key)) return 'email';
  if (/phone|mobile/.test(key)) return 'phone';
  if (/_at$/.test(key) || type === 'datetime') return 'iso-8601-datetime';
  if (/date/.test(key) || type === 'date') return 'yyyy-mm-dd';
  if (key === 'otpauth_url' || /url|link/.test(key)) return 'uri';
  if (/^id$|_id$/.test(key)) return 'identifier';
  if (/_number$/.test(key)) return 'business-document-number';
  return type === 'json' ? 'json-object' : null;
};

const fieldUsage = new Map();
for (const [action, fields] of Object.entries(generatedFields)) {
  if (action === '_meta') continue;
  for (const field of fields) {
    if (!fieldUsage.has(field.key)) {
      fieldUsage.set(field.key, { type: field.type, actions: [], modules: new Set(), requiredCount: 0 });
    }
    const meta = fieldUsage.get(field.key);
    meta.type = meta.type || field.type;
    meta.actions.push(action);
    meta.modules.add(apiCatalog.find((api) => api.action === action)?.module || 'General');
    if (field.required) meta.requiredCount += 1;
  }
}

const fieldRules = Object.fromEntries(
  [...fieldUsage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, meta]) => [key, {
      type: meta.type,
      enum_ref: enumRefForKey(key),
      format: formatHintFor(key, meta.type),
      relation_entity: /(^id$|_id$)/.test(key) ? key.replace(/_id$/, '') : null,
      recommended_index: /(^id$|_id$|_number$|status$|_status$|date|_at$)/.test(key),
      searchable: /(name|number|code|title|subject|description|customer|vendor|part)/.test(key),
      used_by_endpoints: meta.actions.length,
      modules: [...meta.modules].sort(),
      required_in_endpoints: meta.requiredCount,
    }]),
);

const endpointCatalog = {
  _meta: {
    version: '2.0',
    description: 'Endpoint registry built from api/index.php, controller contracts, and field registry coverage.',
    generatedAt,
    endpointCount: apiCatalog.length,
  },
  endpoints: {},
};

for (const api of apiCatalog) {
  const fields = generatedFields[api.action] || [];
  const contract = routeContracts[api.action] || {};
  const kind = kindOf(api.action, actionMethod(api));
  const pk = mainId(fields, fields.map((f) => f.key), api.action);
  const statusRefs = uniq(fields.map((field) => enumRefForKey(field.key)).filter(Boolean));
  endpointCatalog.endpoints[api.action] = {
    action: api.action,
    label: api.label,
    module: api.module,
    method: actionMethod(api),
    controller: api.controller,
    handler: api.handler,
    source: api.source,
    kind,
    domain: domainForAction(api.action),
    entity: entityFromAction(api.action, contract),
    primary_key: pk,
    field_count: fields.length,
    field_packs: fieldPackHints[api.action] || [],
    status_refs: statusRefs,
    security: {
      auth_required: contract.authRequired,
      csrf_required: contract.csrfRequired,
      admin_only: contract.adminOnly,
      permission_keys: contract.permissionKeys || [],
      dynamic_permission: !!contract.hasDynamicPermission,
    },
    request: {
      query_params: contract.queryParams || [],
      body_fields: contract.bodyFields || [],
      required_body_fields: contract.requiredBodyFields || [],
    },
    response: {
      collection_key: contract.collectionKey,
      response_fields: params[api.action]?.response?.fields || [],
      paginated: !!params[api.action]?.response?.pagination,
    },
  };
}

const relationEntities = {};
for (const endpoint of Object.values(endpointCatalog.endpoints)) {
  if (!relationEntities[endpoint.entity]) {
    relationEntities[endpoint.entity] = {
      domain: endpoint.domain,
      endpoints: [],
      primary_keys: [],
      status_refs: [],
    };
  }
  relationEntities[endpoint.entity].endpoints.push(endpoint.action);
  relationEntities[endpoint.entity].primary_keys = uniq([...relationEntities[endpoint.entity].primary_keys, endpoint.primary_key]);
  relationEntities[endpoint.entity].status_refs = uniq([...relationEntities[endpoint.entity].status_refs, ...endpoint.status_refs]);
}
for (const [entity, meta] of Object.entries(relationEntities)) {
  meta.endpoints = uniq(meta.endpoints).filter(Boolean);
}

const relationMap = {
  _meta: {
    version: '2.0',
    description: 'Entity relation map for commercial, production, quality, and compliance flows.',
    generatedAt,
    edgeCount: relationBlueprints.length,
  },
  entities: relationEntities,
  edges: relationBlueprints,
};

const workflowLibrary = {
  _meta: {
    version: '2.0',
    description: 'Cross-module workflow blueprints linking status models, endpoints, and KPI formulas.',
    generatedAt,
    workflowCount: workflowBlueprints.length,
  },
  workflows: Object.fromEntries(workflowBlueprints.map((workflow) => [workflow.key, workflow])),
};

const complianceCrosswalk = {
  _meta: {
    version: '2.0',
    description: 'Compliance and industry-standard crosswalk for HESEM registry coverage.',
    generatedAt,
    standardCount: Object.keys(complianceStandards).length,
  },
  standards: Object.fromEntries(
    Object.entries(complianceStandards).map(([key, value]) => [key, {
      ...value,
      available_endpoints: (value.endpointHints || []).filter((endpoint) => endpointCatalog.endpoints[endpoint]),
      available_status_refs: (value.statusRefs || []).filter((statusKey) => nextStatus[statusKey]),
    }]),
  ),
};

const fieldTypesRegistry = {
  _meta: {
    version: '2.0',
    description: 'Normalized UI and API field type definitions used across the registry.',
    generatedAt,
    typeCount: Object.keys(normalizedFieldTypes).length,
  },
  ...normalizedFieldTypes,
};
const computedFormulasRegistry = {
  _meta: {
    version: '2.0',
    description: 'World-class computed formula presets for finance, production, quality, supplier, energy, and traceability.',
    generatedAt,
    formulaCount: Object.keys(normalizedComputedFormulas).length,
  },
  ...normalizedComputedFormulas,
};
const iotConnectorsRegistry = {
  _meta: {
    version: '2.0',
    description: 'Normalized connector library for machine, gateway, ERP, batch, and event-stream integrations.',
    generatedAt,
    connectorCount: Object.keys(normalizedIotConnectors).length,
  },
  ...normalizedIotConnectors,
};
const unitLibraryRegistry = {
  _meta: {
    version: '1.0',
    description: 'Canonical unit system registry for metric-first manufacturing and aerospace workflows.',
    generatedAt,
  },
  ...unitLibrary,
};
const identifierPatternsRegistry = {
  _meta: {
    version: '1.0',
    description: 'Canonical business identifier formats for commercial, quality, and compliance records.',
    generatedAt,
    patternCount: Object.keys(identifierPatterns).length,
  },
  patterns: identifierPatterns,
};

const validationRules = {
  _meta: {
    version: '2.0',
    description: 'Endpoint validation and canonical field rule registry.',
    generatedAt,
    endpointRuleCount: apiCatalog.length,
    fieldRuleCount: Object.keys(fieldRules).length,
  },
  endpoint_rules: Object.fromEntries(
    apiCatalog.map((api) => [api.action, {
      method: actionMethod(api),
      auth_required: routeContracts[api.action]?.authRequired || false,
      csrf_required: routeContracts[api.action]?.csrfRequired || false,
      admin_only: routeContracts[api.action]?.adminOnly || false,
      permission_keys: routeContracts[api.action]?.permissionKeys || [],
      query_params: (routeContracts[api.action]?.queryParams || []).map((key) => ({ key, rule_ref: key })),
      body_fields: (routeContracts[api.action]?.bodyFields || []).map((key) => ({
        key,
        required: (routeContracts[api.action]?.requiredBodyFields || []).includes(key),
        rule_ref: key,
      })),
      response_fields: params[api.action]?.response?.fields || [],
    }]),
  ),
  field_rules: fieldRules,
};

const registryManifest = {
  _meta: {
    version: '2.0',
    description: 'Registry manifest and coverage index for the metadata backbone.',
    generatedAt,
  },
  coverage: {
    router_actions: apiCatalog.length,
    ui_actions: jsCatalog.length,
    field_definitions: fieldCount,
    unique_field_keys: Object.keys(fieldRules).length,
    status_sets: Object.keys(nextStatus).length - 1,
    workflow_count: workflowBlueprints.length,
    relation_edges: relationBlueprints.length,
    standard_crosswalks: Object.keys(complianceStandards).length,
  },
  research_sources: registryResearchAnchors,
  assets: {
    'data-fields.json': { kind: 'field-registry', records: fieldCount },
    'api-params.json': { kind: 'api-contracts', records: endpointCount },
    'field-types.json': { kind: 'type-library', records: Object.keys(normalizedFieldTypes).length },
    'status-options.json': { kind: 'enum-library', records: Object.keys(nextStatus).length - 1 },
    'computed-formulas.json': { kind: 'formula-library', records: Object.keys(normalizedComputedFormulas).length },
    'iot-connectors.json': { kind: 'connector-library', records: Object.keys(normalizedIotConnectors).length },
    'domain-field-packs.json': { kind: 'pack-library', records: Object.keys(fieldPackRegistry.packs).length },
    'schema-library.json': { kind: 'schema-library', records: Object.keys(schemaLibrary.entities).length },
    'endpoint-catalog.json': { kind: 'endpoint-catalog', records: apiCatalog.length },
    'validation-rules.json': { kind: 'validation-rules', records: apiCatalog.length + Object.keys(fieldRules).length },
    'relation-map.json': { kind: 'relation-map', records: relationBlueprints.length },
    'workflow-library.json': { kind: 'workflow-library', records: workflowBlueprints.length },
    'compliance-crosswalk.json': { kind: 'compliance-crosswalk', records: Object.keys(complianceStandards).length },
    'registry-quality-report.json': { kind: 'quality-report', records: 1 },
    'unit-library.json': { kind: 'unit-library', records: Object.keys(unitLibrary.dimensions).length },
    'identifier-patterns.json': { kind: 'identifier-patterns', records: Object.keys(identifierPatterns).length },
  },
};

const complexity = apiCatalog
  .map((api) => ({
    action: api.action,
    params: (params[api.action]?.params || []).length,
    fields: (generatedFields[api.action] || []).length,
    permissions: (routeContracts[api.action]?.permissionKeys || []).length,
  }))
  .sort((a, b) => (b.params + b.fields + b.permissions) - (a.params + a.fields + a.permissions))
  .slice(0, 12);

const qualityReport = {
  _meta: {
    version: '2.0',
    description: 'Internal quality report for registry completeness and normalization.',
    generatedAt,
  },
  summary: {
    endpoint_count: endpointCount,
    field_count: fieldCount,
    average_fields_per_endpoint: +(fieldCount / endpointCount).toFixed(2),
    unique_field_keys: Object.keys(fieldRules).length,
    status_set_count: Object.keys(nextStatus).length - 1,
    formula_count: Object.keys(normalizedComputedFormulas).length,
    connector_count: Object.keys(normalizedIotConnectors).length,
    workflow_count: workflowBlueprints.length,
    standards_count: Object.keys(complianceStandards).length,
  },
  coverage: {
    router_only_actions: apiCatalog.filter((api) => api.source === 'router-only').length,
    auth_protected_actions: Object.values(routeContracts).filter((meta) => meta.authRequired).length,
    csrf_protected_actions: Object.values(routeContracts).filter((meta) => meta.csrfRequired).length,
    admin_actions: Object.values(routeContracts).filter((meta) => meta.adminOnly).length,
    paginated_actions: Object.values(routeContracts).filter((meta) => meta.paginated).length,
    actions_with_permission_keys: Object.values(routeContracts).filter((meta) => (meta.permissionKeys || []).length > 0 || meta.hasDynamicPermission).length,
  },
  highest_complexity_endpoints: complexity,
  recommendations: [
    'Use endpoint-catalog.json as the canonical inventory for routed actions.',
    'Use validation-rules.json when generating schema validators and API guards.',
    'Use identifier-patterns.json and unit-library.json when expanding database migrations.',
    'Use workflow-library.json and compliance-crosswalk.json to keep new modules aligned to aerospace quality expectations.',
  ],
};

writeJson(dataFieldsPath, generatedFields);
writeJson(apiParamsPath, params);
writeJson(statusPath, nextStatus);
writeJson(packsPath, fieldPackRegistry);
writeJson(schemaLibPath, schemaLibrary);
writeJson(fieldTypesPath, fieldTypesRegistry);
writeJson(formulasPath, computedFormulasRegistry);
writeJson(iotPath, iotConnectorsRegistry);
writeJson(manifestPath, registryManifest);
writeJson(endpointCatalogPath, endpointCatalog);
writeJson(validationRulesPath, validationRules);
writeJson(relationMapPath, relationMap);
writeJson(workflowLibraryPath, workflowLibrary);
writeJson(complianceCrosswalkPath, complianceCrosswalk);
writeJson(qualityReportPath, qualityReport);
writeJson(unitLibraryPath, unitLibraryRegistry);
writeJson(identifierPatternsPath, identifierPatternsRegistry);

console.log(JSON.stringify({
  endpoints: endpointCount,
  routerActions: apiCatalog.length,
  fields: fieldCount,
  average: +(fieldCount / endpointCount).toFixed(2),
  uniqueFieldKeys: Object.keys(fieldRules).length,
  statusSets: Object.keys(nextStatus).length - 1,
  workflowCount: workflowBlueprints.length,
  standards: Object.keys(complianceStandards).length,
  extraJsons: [
    'domain-field-packs.json',
    'schema-library.json',
    'registry-manifest.json',
    'endpoint-catalog.json',
    'validation-rules.json',
    'relation-map.json',
    'workflow-library.json',
    'compliance-crosswalk.json',
    'registry-quality-report.json',
    'unit-library.json',
    'identifier-patterns.json',
  ],
}, null, 2));
