import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fieldLabelOverrides, tokenTranslations } from './registry-v3-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const portalRoot = path.resolve(__dirname, '..', '..');
const migrationsDir = path.join(portalRoot, 'database', 'migrations');
const docsDir = path.join(portalRoot, 'docs');
const generatedAt = new Date().toISOString();

function resolveRegistryDir() {
  const candidates = [
    path.join(portalRoot, 'data', 'registry'),
    path.join(portalRoot, 'qms-data', 'registry'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

const registryDir = resolveRegistryDir();

const researchReferences = [
  {
    key: 'sap_inspection_lot',
    platform: 'SAP S/4HANA / SAP ERP',
    url: 'https://help.sap.com/docs/SAP_ERP/250374f0514e4e0f9057066374265eba/a7e4b65334e6b54ce10000000a174cb4.html',
    focus: ['QM integration with MM, PP, SD, PM', 'inspection lot lifecycle', 'normalized logistics linkages'],
  },
  {
    key: 'sap_status_management',
    platform: 'SAP S/4HANA',
    url: 'https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/5e23dc8fe9be4fd496f8ab556667ea05/0ed49753858ced23e10000000a174cb4.html',
    focus: ['system status and user status', 'business transaction controls'],
  },
  {
    key: 'sap_language_texts',
    platform: 'SAP',
    url: 'https://help.sap.com/doc/saphelp_ewm900/9.0/en-US/4a/40815bacb51cece10000000a42189b/content.htm',
    focus: ['language-dependent text tables', 'text-key pattern'],
  },
  {
    key: 'epicor_cpc',
    platform: 'Epicor Kinetic / CPC',
    url: 'https://www.epicor.com/en/products/connected-worker/epicor-connected-process-control/',
    focus: ['operator guidance', 'traceability', 'task-level data collection'],
  },
  {
    key: 'epicor_track_trace',
    platform: 'Epicor Kinetic / CPC',
    url: 'https://www.epicor.com/en/products/connected-worker/epicor-connected-process-control/control-track-and-trace/',
    focus: ['serial and lot traceability', 'quality containment'],
  },
  {
    key: 'epicor_industrial_machinery',
    platform: 'Epicor Kinetic',
    url: 'https://ondemand.epicor.com/courseResources/r2378_Industrial%20Machinery%20Manufacturing_Transcript_1.pdf',
    focus: ['part', 'job', 'APS', 'manufacturing quote flow'],
  },
  {
    key: 'ifs_projection',
    platform: 'IFS Cloud',
    url: 'https://docs.ifs.com/techdocs/25r2/030_administration/010_security/020_permission_sets/004_permission_set_overview/010_projections/',
    focus: ['projection as self-contained business function', 'bounded API surface'],
  },
  {
    key: 'ifs_custom_fields',
    platform: 'IFS Cloud',
    url: 'https://docs.ifs.com/techdocs/Foundation1/040_administration/220_user_interface/020_custom_objects/040_custom_fields/',
    focus: ['logical units', 'persistent and calculated custom fields'],
  },
  {
    key: 'ifs_translation_manager',
    platform: 'IFS Cloud',
    url: 'https://docs.ifs.com/techdocs/22r2/060_development/050_development_tools/025_translation_manager_aurena/',
    focus: ['field descriptions', 'field description translations', 'translation manager'],
  },
  {
    key: 'ifs_cloud_brochure',
    platform: 'IFS Cloud',
    url: 'https://www.ifs.com/-/media10/project/ifs/ifs/assets/ifs-cloud-brochure-24r2_02_2025.pdf',
    focus: ['manufacturing', 'supply chain', 'finance', 'projects', 'asset', 'service'],
  },
  {
    key: 'oracle_workflow_status',
    platform: 'Oracle Fusion Cloud SCM',
    url: 'https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25a/fauqm/workflow-status.html',
    focus: ['quality issue and action workflows', 'predefined status models'],
  },
  {
    key: 'oracle_workflow_templates',
    platform: 'Oracle Fusion Cloud SCM',
    url: 'https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/24b/fauqm/workflow-templates.html',
    focus: ['workflow templates', 'status sequence governance'],
  },
  {
    key: 'oracle_translation_table',
    platform: 'Oracle Fusion Cloud',
    url: 'https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/oedsc/acdcomponenttlint-25230.html',
    focus: ['_TL translation table pattern', 'MLS support', 'who columns'],
  },
  {
    key: 'oracle_who_columns',
    platform: 'Oracle Applications',
    url: 'https://docs.oracle.com/cd/B25516_20/current/acrobat/iby115ig.pdf',
    focus: ['WHO columns', 'base and translation table pattern'],
  },
  {
    key: 'dynamics_virtual_tables',
    platform: 'Microsoft Dynamics 365 / Dataverse',
    url: 'https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-edit-virtual-entities',
    focus: ['virtual tables', 'external runtime data', 'schema metadata'],
  },
  {
    key: 'dynamics_table_metadata',
    platform: 'Microsoft Dynamics 365 / Dataverse',
    url: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-update-entity-definitions-using-web-api',
    focus: ['schema names', 'display names', 'localized labels', 'solution prefixes'],
  },
  {
    key: 'dynamics_audit_columns',
    platform: 'Microsoft Dynamics 365 / Dataverse',
    url: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/account',
    focus: ['createdby', 'createdon', 'modifiedby', 'modifiedon', 'logical names'],
  },
];

const domainDefinitions = {
  core_system: {
    label: 'Hệ thống lõi',
    labelEn: 'Core System',
    icon: 'fa-user-shield',
    color: '#0f766e',
    description: 'Người dùng, vai trò, phiên, tổ chức và nhật ký hệ thống lõi.',
    businessProcess: 'Identity, authorization, tenancy, security, and audit foundation.',
    workflowPlan: ['wf_core_access_governance'],
    supportDomain: false,
  },
  foundation_governance: {
    label: 'Nền tảng và governance',
    labelEn: 'Foundation Governance',
    icon: 'fa-sitemap',
    color: '#0f766e',
    description: 'Cấu trúc tổ chức, party, UOM, lịch, mã chuẩn, approval, e-signature và attachment nền tảng.',
    businessProcess: 'Enterprise structure, identity-bearing party master, governed codes, approvals, and compliant signatures.',
    workflowPlan: ['wf_foundation_governance', 'wf_approval_group'],
    supportDomain: false,
  },
  document_control: {
    label: 'Kiểm soát tài liệu',
    labelEn: 'Document Control',
    icon: 'fa-file-signature',
    color: '#2563eb',
    description: 'Tài liệu có kiểm soát, phiên bản, phân phối và xác nhận đọc.',
    businessProcess: 'Controlled documents, revisions, release, acknowledgment, and retrieval.',
    workflowPlan: ['wf_document_change_control'],
    supportDomain: false,
  },
  master_data: {
    label: 'Dữ liệu chủ',
    labelEn: 'Master Data',
    icon: 'fa-database',
    color: '#0284c7',
    description: 'Mã hàng, BOM, routing, work center và revision chuẩn sản xuất.',
    businessProcess: 'Item, BOM, routing, work center, and revision master governance.',
    workflowPlan: ['wf_master_data_lifecycle'],
    supportDomain: false,
  },
  sales: {
    label: 'Bán hàng',
    labelEn: 'Sales',
    icon: 'fa-cart-shopping',
    color: '#0891b2',
    description: 'Khách hàng, đơn hàng bán, line và cộng tác thực hiện đơn.',
    businessProcess: 'Quote-to-order, order promising, contract review, and customer delivery commitments.',
    workflowPlan: ['wf_quote_lifecycle', 'wf_sales_order'],
    supportDomain: false,
  },
  purchasing: {
    label: 'Mua hàng',
    labelEn: 'Purchasing',
    icon: 'fa-truck-ramp-box',
    color: '#7c3aed',
    description: 'Nhà cung cấp, PO, line, đánh giá và nguồn cung.',
    businessProcess: 'Source-to-order, supplier evaluation, approval, and procurement control.',
    workflowPlan: ['wf_purchase_order', 'wf_supplier_qualification'],
    supportDomain: false,
  },
  inventory: {
    label: 'Tồn kho',
    labelEn: 'Inventory',
    icon: 'fa-boxes-stacked',
    color: '#6d28d9',
    description: 'Kho, vị trí, lô, serial và giao dịch tồn kho nền tảng.',
    businessProcess: 'Inventory receiving, stocking, lot/serial traceability, and stock movement.',
    workflowPlan: ['wf_goods_receipt', 'wf_inventory_transaction'],
    supportDomain: false,
  },
  production: {
    label: 'Sản xuất',
    labelEn: 'Production',
    icon: 'fa-industry',
    color: '#ea580c',
    description: 'JO, công đoạn, lao động, lịch và điều độ xưởng.',
    businessProcess: 'Plan-to-produce, execution dispatching, labor collection, and shift performance.',
    workflowPlan: ['wf_job_order', 'wf_work_order_execution', 'wf_production_dispatch'],
    supportDomain: false,
  },
  quality_management: {
    label: 'Quản lý chất lượng',
    labelEn: 'Quality Management',
    icon: 'fa-shield-halved',
    color: '#dc2626',
    description: 'Kiểm tra, NCR, CAPA, FAI, SPC, OQC và chất lượng vận hành.',
    businessProcess: 'Inspection, nonconformance, CAPA, first article, SPC, and containment.',
    workflowPlan: ['wf_receiving_inspection', 'wf_ncr', 'wf_capa', 'wf_fai'],
    supportDomain: false,
  },
  calibration_equipment: {
    label: 'Hiệu chuẩn và thiết bị',
    labelEn: 'Calibration and Equipment',
    icon: 'fa-ruler-combined',
    color: '#b91c1c',
    description: 'Thiết bị, hiệu chuẩn, bảo trì cơ bản và dao dụng cụ nền tảng.',
    businessProcess: 'Calibration scheduling, equipment control, and baseline tooling records.',
    workflowPlan: ['wf_calibration_control', 'wf_tool_life'],
    supportDomain: false,
  },
  audit_risk: {
    label: 'Đánh giá và rủi ro',
    labelEn: 'Audit and Risk',
    icon: 'fa-magnifying-glass-chart',
    color: '#be123c',
    description: 'Đánh giá, phát hiện, hành động, rủi ro và cải tiến.',
    businessProcess: 'Audit planning, findings, action closure, management review, and risk tracking.',
    workflowPlan: ['wf_audit_program', 'wf_risk_treatment'],
    supportDomain: false,
  },
  training_hr: {
    label: 'Đào tạo và nhân sự',
    labelEn: 'Training and HR',
    icon: 'fa-user-graduate',
    color: '#0d9488',
    description: 'Hồ sơ nhân viên, đào tạo, kỹ năng và chứng chỉ nền tảng.',
    businessProcess: 'Competency, certification, and personnel qualification baseline.',
    workflowPlan: ['wf_training_qualification'],
    supportDomain: false,
  },
  finance: {
    label: 'Tài chính',
    labelEn: 'Finance',
    icon: 'fa-coins',
    color: '#a16207',
    description: 'Giá thành, GL, AP/AR và nghiệp vụ tài chính lõi.',
    businessProcess: 'Costing, accounting, invoicing, and financial transaction control.',
    workflowPlan: ['wf_financial_close'],
    supportDomain: false,
  },
  shipping_compliance: {
    label: 'Giao hàng và tuân thủ',
    labelEn: 'Shipping and Compliance',
    icon: 'fa-truck-fast',
    color: '#0369a1',
    description: 'Lô giao, kiện hàng, release giao và hồ sơ tuân thủ xuất hàng.',
    businessProcess: 'Shipment preparation, compliance release, export documentation, and customer release.',
    workflowPlan: ['wf_shipment_release'],
    supportDomain: false,
  },
  mes_execution: {
    label: 'MES thực thi',
    labelEn: 'MES Execution',
    icon: 'fa-microchip',
    color: '#1d4ed8',
    description: 'MES shopfloor gồm core, execution, telemetry, inline quality, material, integration và analytics.',
    businessProcess: 'Machine connectivity, execution tracking, telemetry, inline quality, genealogy, and OEE.',
    workflowPlan: ['wf_mes_execution', 'wf_integration_monitor'],
    supportDomain: false,
  },
  plant_maintenance: {
    label: 'Bảo trì nhà máy',
    labelEn: 'Plant Maintenance',
    icon: 'fa-screwdriver-wrench',
    color: '#b45309',
    description: 'CMMS/EAM cho thiết bị, kế hoạch PM, WO, failure và reliability.',
    businessProcess: 'Preventive, corrective, condition-based maintenance and reliability management.',
    workflowPlan: ['wf_pm_work_order', 'wf_pm_maintenance_plan'],
    supportDomain: false,
  },
  advanced_planning: {
    label: 'Hoạch định nâng cao',
    labelEn: 'Advanced Planning',
    icon: 'fa-diagram-project',
    color: '#7c2d12',
    description: 'APS, finite capacity scheduling, scenarios và pegging.',
    businessProcess: 'Scenario planning, finite scheduling, capacity balancing, and pegging.',
    workflowPlan: ['wf_capacity_plan', 'wf_aps_scenario'],
    supportDomain: false,
  },
  plm_change_control: {
    label: 'PLM và thay đổi kỹ thuật',
    labelEn: 'PLM and Change Control',
    icon: 'fa-code-branch',
    color: '#9333ea',
    description: 'ECR/ECO, review board, yêu cầu, test plan và deviation permit.',
    businessProcess: 'Engineering change, configuration control, design validation, and product traceability.',
    workflowPlan: ['wf_plm_change_order', 'wf_plm_change_request'],
    supportDomain: false,
  },
  hcm_workforce: {
    label: 'Nhân lực mở rộng',
    labelEn: 'HCM Workforce',
    icon: 'fa-users-gear',
    color: '#0f766e',
    description: 'Cơ cấu tổ chức, vị trí, kỹ năng, chứng chỉ, chấm công và payroll.',
    businessProcess: 'Workforce structure, qualifications, attendance, and payroll.',
    workflowPlan: ['wf_hcm_qualification', 'wf_payroll_run'],
    supportDomain: false,
  },
  warehouse_management: {
    label: 'Quản lý kho nâng cao',
    labelEn: 'Warehouse Management',
    icon: 'fa-warehouse',
    color: '#7e22ce',
    description: 'Zone, bin, transfer order, putaway, pick list, cycle count và HU.',
    businessProcess: 'Putaway, bin control, picking, cycle counting, quarantine, and handling units.',
    workflowPlan: ['wf_wms_transfer_order', 'wf_wms_pick_list'],
    supportDomain: false,
  },
  finance_extended: {
    label: 'Tài chính thương mại mở rộng',
    labelEn: 'Extended Finance Trade',
    icon: 'fa-money-bill-transfer',
    color: '#92400e',
    description: 'Tiền tệ, tỷ giá, customs declarations, LC và thuế quốc gia.',
    businessProcess: 'Multi-currency, trade finance, customs, FX, and tax profile control.',
    workflowPlan: ['wf_trade_finance', 'wf_customs_declaration'],
    supportDomain: false,
  },
  project_management: {
    label: 'Quản lý dự án',
    labelEn: 'Project Management',
    icon: 'fa-list-check',
    color: '#1d4ed8',
    description: 'Project, WBS, milestone, time, cost, earned value và change request.',
    businessProcess: 'Project execution, milestone billing, earned value, and project risk/change governance.',
    workflowPlan: ['wf_project_execution', 'wf_project_change_request'],
    supportDomain: false,
  },
  crm: {
    label: 'CRM',
    labelEn: 'CRM',
    icon: 'fa-handshake',
    color: '#0284c7',
    description: 'Account, contact, lead, opportunity, campaign và forecast.',
    businessProcess: 'Lead-to-opportunity, customer engagement, and pipeline forecasting.',
    workflowPlan: ['wf_crm_opportunity', 'wf_crm_campaign'],
    supportDomain: false,
  },
  transportation: {
    label: 'Vận tải',
    labelEn: 'Transportation',
    icon: 'fa-route',
    color: '#2563eb',
    description: 'Carrier, route, shipment line, customs docs, freight audit và delivery events.',
    businessProcess: 'Freight planning, routing, customs documents, export screening, and proof of delivery.',
    workflowPlan: ['wf_tms_shipment', 'wf_freight_order', 'wf_freight_audit'],
    supportDomain: false,
  },
  bi_datawarehouse: {
    label: 'BI và kho dữ liệu',
    labelEn: 'BI and Data Warehouse',
    icon: 'fa-chart-line',
    color: '#0f766e',
    description: 'Dimension, fact, ETL run, KPI snapshots và semantic analytics.',
    businessProcess: 'Dimensional analytics, KPI scorecards, and ETL orchestration.',
    workflowPlan: ['wf_dw_etl_run'],
    supportDomain: true,
  },
  supplier_relationship: {
    label: 'Quan hệ nhà cung cấp',
    labelEn: 'Supplier Relationship',
    icon: 'fa-people-arrows',
    color: '#7c3aed',
    description: 'Supplier quality, sourcing, bids, portal, development plan và VMI.',
    businessProcess: 'Supplier onboarding, quality, sourcing, collaboration, and performance improvement.',
    workflowPlan: ['wf_supplier_qualification', 'wf_supplier_scorecard', 'wf_supplier_action_request'],
    supportDomain: false,
  },
  tooling_lifecycle: {
    label: 'Vòng đời tooling',
    labelEn: 'Tooling Lifecycle',
    icon: 'fa-toolbox',
    color: '#ca8a04',
    description: 'Tooling family, preset, kit, life limits, regrind, fixture lifecycle.',
    businessProcess: 'Tool crib, presetting, tool life control, fixture maintenance, and assembly kits.',
    workflowPlan: ['wf_tool_life', 'wf_tooling_kit'],
    supportDomain: false,
  },
  demand_supply_planning: {
    label: 'Cân đối cung cầu',
    labelEn: 'Demand and Supply Planning',
    icon: 'fa-chart-column',
    color: '#1d4ed8',
    description: 'S&OP, demand consensus, supply consensus, buffer và replenishment policies.',
    businessProcess: 'Demand consensus, supply consensus, replenishment, and inventory policy management.',
    workflowPlan: ['wf_sop_cycle', 'wf_mrp_suggestion'],
    supportDomain: false,
  },
  service_warranty: {
    label: 'Dịch vụ và bảo hành',
    labelEn: 'Service and Warranty',
    icon: 'fa-screwdriver',
    color: '#15803d',
    description: 'Installed base, contract, warranty claim, RMA, service request và field visit.',
    businessProcess: 'Installed-base service, warranty claims, returns, and service work execution.',
    workflowPlan: ['wf_service_request', 'wf_warranty_claim'],
    supportDomain: false,
  },
  finance_treasury: {
    label: 'Ngân quỹ và tài sản',
    labelEn: 'Finance Treasury',
    icon: 'fa-building-columns',
    color: '#a16207',
    description: 'Standard cost, budget, fixed asset, cash, bank reconciliation và revenue schedule.',
    businessProcess: 'Treasury, budgets, fixed assets, cash management, and revenue scheduling.',
    workflowPlan: ['wf_treasury_close', 'wf_asset_lifecycle'],
    supportDomain: false,
  },
  quality_lab: {
    label: 'Phòng lab chất lượng',
    labelEn: 'Quality Lab',
    icon: 'fa-flask-vial',
    color: '#dc2626',
    description: 'Phương pháp thử, sample, chứng nhận, obligation, escape, containment và FA package.',
    businessProcess: 'Laboratory test governance, compliance evidence, escape containment, and effectiveness review.',
    workflowPlan: ['wf_quality_lab_case', 'wf_quality_obligation'],
    supportDomain: false,
  },
  ehs_sustainability: {
    label: 'EHS và phát triển bền vững',
    labelEn: 'EHS and Sustainability',
    icon: 'fa-leaf',
    color: '#15803d',
    description: 'Permit, hazardous material, PPE, waste, emissions và sustainability projects.',
    businessProcess: 'EHS compliance, waste/emissions reporting, contractor safety, and sustainability actions.',
    workflowPlan: ['wf_ehs_incident', 'wf_safety_observation', 'wf_ehs_corrective_action'],
    supportDomain: false,
  },
  mfg_engineering: {
    label: 'Kỹ thuật sản xuất',
    labelEn: 'Manufacturing Engineering',
    icon: 'fa-gears',
    color: '#c2410c',
    description: 'Process family, standard operations, time standards, instructions và calendars.',
    businessProcess: 'Industrialization, standard work, time standards, and engineering readiness.',
    workflowPlan: ['wf_eng_change_control', 'wf_work_instruction_release'],
    supportDomain: false,
  },
  master_data_governance: {
    label: 'Quản trị dữ liệu chủ',
    labelEn: 'Master Data Governance',
    icon: 'fa-stamp',
    color: '#0f766e',
    description: 'Item class, attributes, reference codes, site params, number series và stewardship.',
    businessProcess: 'Stewardship, number series, duplicate control, and MDM issue resolution.',
    workflowPlan: ['wf_mdm_governance', 'wf_retention_policy'],
    supportDomain: false,
  },
  commercial_contracts: {
    label: 'Thương mại và hợp đồng',
    labelEn: 'Commercial Contracts',
    icon: 'fa-file-contract',
    color: '#0369a1',
    description: 'Contract, price list, rebate, incoterms, credit profile và order promises.',
    businessProcess: 'Contract governance, pricing, rebates, commercial scorecards, and promise management.',
    workflowPlan: ['wf_contract_lifecycle', 'wf_order_promise'],
    supportDomain: false,
  },
  traceability_serialization: {
    label: 'Truy xuất và serialization',
    labelEn: 'Traceability and Serialization',
    icon: 'fa-qrcode',
    color: '#7c3aed',
    description: 'Genealogy, serial events, lot attributes, travelers, labels và recall.',
    businessProcess: 'Lot/serial genealogy, traveler control, labeling, and recall execution.',
    workflowPlan: ['wf_traceability_recall', 'wf_traceability_traveler'],
    supportDomain: false,
  },
  outsource_execution: {
    label: 'Gia công ngoài',
    labelEn: 'Outsource Execution',
    icon: 'fa-people-carry-box',
    color: '#b45309',
    description: 'Subcontract plan, dispatch batch, receipt, chargeback, recovery và supplier execution.',
    businessProcess: 'Outside processing planning, dispatch, receipt, recovery, and supplier performance.',
    workflowPlan: ['wf_outsource_dispatch', 'wf_outsource_receipt'],
    supportDomain: false,
  },
  trade_compliance: {
    label: 'Tuân thủ thương mại',
    labelEn: 'Trade Compliance',
    icon: 'fa-passport',
    color: '#7f1d1d',
    description: 'ECCN, screening, end use, preference program, drawbacks và audits.',
    businessProcess: 'Export control, screening, broker management, duty recovery, and compliance audit.',
    workflowPlan: ['wf_trade_screening', 'wf_trade_compliance_audit'],
    supportDomain: false,
  },
  forms_system: {
    label: 'Hệ thống biểu mẫu',
    labelEn: 'Forms System',
    icon: 'fa-rectangle-list',
    color: '#2563eb',
    description: 'Schema biểu mẫu, entry và attachment runtime.',
    businessProcess: 'Schema-driven form publishing, submission, approval, and attachment capture.',
    workflowPlan: ['wf_form_submission'],
    supportDomain: false,
  },
  record_system: {
    label: 'Hệ thống hồ sơ',
    labelEn: 'Record System',
    icon: 'fa-folder-open',
    color: '#475569',
    description: 'Counter, hồ sơ và liên kết hồ sơ dùng chung toàn portal.',
    businessProcess: 'Record numbering, lifecycle governance, and cross-record linkage.',
    workflowPlan: ['wf_record_lifecycle'],
    supportDomain: false,
  },
  system_infrastructure: {
    label: 'Hạ tầng hệ thống',
    labelEn: 'System Infrastructure',
    icon: 'fa-server',
    color: '#334155',
    description: 'Biến hệ thống, naming, file, tag, comment, notification và workflow runtime.',
    businessProcess: 'Infrastructure, metadata, notification, workflow runtime, and system-level services.',
    workflowPlan: ['wf_integration_monitor', 'wf_system_notification'],
    supportDomain: true,
  },
  customer_portal: {
    label: 'Cổng khách hàng',
    labelEn: 'Customer Portal',
    icon: 'fa-user-circle',
    color: '#0284c7',
    description: 'Portal user, session, token, order view, complaint submission và access.',
    businessProcess: 'External customer visibility, complaint intake, and secure portal access.',
    workflowPlan: ['wf_customer_portal_access', 'wf_customer_complaint'],
    supportDomain: false,
  },
  evidence_vault: {
    label: 'Kho bằng chứng',
    labelEn: 'Evidence Vault',
    icon: 'fa-vault',
    color: '#4338ca',
    description: 'Evidence, chain-of-custody, links và full-text search.',
    businessProcess: 'Evidence retention, chain of custody, indexing, and audit support.',
    workflowPlan: ['wf_evidence_chain'],
    supportDomain: true,
  },
  cnc_programs: {
    label: 'Chương trình CNC',
    labelEn: 'CNC Programs',
    icon: 'fa-code',
    color: '#0f766e',
    description: 'Program, version, approval, setup sheet và item setup.',
    businessProcess: 'NC program version control, approval, and setup-sheet release.',
    workflowPlan: ['wf_cnc_program_approval'],
    supportDomain: false,
  },
  digital_product_passport: {
    label: 'Hộ chiếu sản phẩm số',
    labelEn: 'Digital Product Passport',
    icon: 'fa-id-card',
    color: '#1d4ed8',
    description: 'Passport, event và access log cho vòng đời sản phẩm.',
    businessProcess: 'Passport issuance, event trace, and controlled downstream access.',
    workflowPlan: ['wf_product_passport'],
    supportDomain: false,
  },
  ai_predictive: {
    label: 'AI dự báo',
    labelEn: 'AI Predictive',
    icon: 'fa-brain',
    color: '#7c3aed',
    description: 'Prediction models, quality predictions, anomaly rules và AI scheduling signals.',
    businessProcess: 'Predictive quality, anomaly detection, and AI-assisted planning decisions.',
    workflowPlan: ['wf_predictive_quality'],
    supportDomain: false,
  },
  fmea_apqp: {
    label: 'FMEA và APQP',
    labelEn: 'FMEA and APQP',
    icon: 'fa-triangle-exclamation',
    color: '#dc2626',
    description: 'FMEA, action, revision, control plan, APQP và PPAP.',
    businessProcess: 'Risk analysis, control planning, APQP phase gates, and PPAP readiness.',
    workflowPlan: ['wf_fmea', 'wf_apqp_project', 'wf_ppap_submission'],
    supportDomain: false,
  },
  mobile_operations: {
    label: 'Vận hành di động',
    labelEn: 'Mobile Operations',
    icon: 'fa-mobile-screen-button',
    color: '#0891b2',
    description: 'Shopfloor mobile queue, time entry và capture kiểm tra hiện trường.',
    businessProcess: 'Mobile task execution, labor capture, and inline inspection collection.',
    workflowPlan: ['wf_mobile_task'],
    supportDomain: false,
  },
  lean_manufacturing: {
    label: 'Lean Manufacturing',
    labelEn: 'Lean Manufacturing',
    icon: 'fa-arrows-to-dot',
    color: '#ea580c',
    description: 'Kaizen, QRQC, Andon, 5S, Gemba, SMED va tier meeting cho world-class shopfloor.',
    businessProcess: 'Continuous improvement, rapid response, visual management, layered audits, and lean execution discipline.',
    workflowPlan: ['wf_lean_kaizen', 'wf_lean_qrqc', 'wf_lean_andon', 'wf_lean_tier_meeting'],
    supportDomain: false,
  },
};

const migrationDomainDefaults = new Map([
  ['002_core_system.sql', 'core_system'],
  ['003_document_management.sql', 'document_control'],
  ['004_form_system.sql', 'forms_system'],
  ['005_record_management.sql', 'record_system'],
  ['006_erp_master_data.sql', 'master_data'],
  ['007_customers_sales.sql', 'sales'],
  ['008_vendors_purchasing.sql', 'purchasing'],
  ['009_inventory.sql', 'inventory'],
  ['010_production.sql', 'production'],
  ['011_quality.sql', 'quality_management'],
  ['012_calibration_equipment.sql', 'calibration_equipment'],
  ['013_training_hr.sql', 'training_hr'],
  ['014_audit_risk.sql', 'audit_risk'],
  ['015_finance.sql', 'finance'],
  ['016_shipping_compliance.sql', 'shipping_compliance'],
  ['017_subcontracting_rma.sql', 'service_warranty'],
  ['018_projects_kpi.sql', 'project_management'],
  ['019_system_tables.sql', 'system_infrastructure'],
  ['025_mes_tables.sql', 'mes_execution'],
  ['026_mes_world_class_foundations.sql', 'mes_execution'],
  ['028_epicor_mes_integration_foundations.sql', 'mes_execution'],
  ['031_mes_dpp_energy_cost_foundations.sql', 'mes_execution'],
  ['032_order_management_world_class_foundations.sql', 'sales'],
  ['033_order_management_extended.sql', 'sales'],
  ['034_exception_management.sql', 'quality_management'],
  ['035_supplier_quality_management.sql', 'supplier_relationship'],
  ['036_quoting_estimation.sql', 'sales'],
  ['037_evidence_vault.sql', 'evidence_vault'],
  ['038_customer_portal.sql', 'customer_portal'],
  ['039_cnc_program_management.sql', 'cnc_programs'],
  ['040_digital_product_passport.sql', 'digital_product_passport'],
  ['041_ai_predictive_quality_aps.sql', 'ai_predictive'],
  ['042_fmea_apqp_control_plan_mobile.sql', 'fmea_apqp'],
  ['043_production_dispatch_shift_targets.sql', 'production'],
  ['044_shift_calendar.sql', 'production'],
  ['045_oqc_packing_outsource.sql', 'quality_management'],
  ['046_plant_maintenance_cmms.sql', 'plant_maintenance'],
  ['047_advanced_planning_scheduling.sql', 'advanced_planning'],
  ['048_plm_change_control.sql', 'plm_change_control'],
  ['049_hcm_workforce_management.sql', 'hcm_workforce'],
  ['050_wms_extended_warehouse.sql', 'warehouse_management'],
  ['051_finance_trade_multicurrency.sql', 'finance_extended'],
  ['052_project_system_earned_value.sql', 'project_management'],
  ['053_crm_pipeline_management.sql', 'crm'],
  ['054_transportation_management.sql', 'transportation'],
  ['055_bi_data_warehouse.sql', 'bi_datawarehouse'],
  ['056_supplier_relationship_management.sql', 'supplier_relationship'],
  ['057_tooling_lifecycle_management.sql', 'tooling_lifecycle'],
  ['058_sop_demand_supply_planning.sql', 'demand_supply_planning'],
  ['059_service_warranty_management.sql', 'service_warranty'],
  ['060_finance_treasury_assets.sql', 'finance_treasury'],
  ['061_quality_lab_compliance.sql', 'quality_lab'],
  ['062_ehs_sustainability_management.sql', 'ehs_sustainability'],
  ['063_manufacturing_engineering_industrialization.sql', 'mfg_engineering'],
  ['064_master_data_governance.sql', 'master_data_governance'],
  ['065_commercial_contract_pricing.sql', 'commercial_contracts'],
  ['066_traceability_serialization.sql', 'traceability_serialization'],
  ['067_outsource_supplier_execution.sql', 'outsource_execution'],
  ['068_trade_compliance_advanced.sql', 'trade_compliance'],
  ['069_lean_manufacturing_world_class.sql', 'lean_manufacturing'],
  ['070_enterprise_governance_uplift.sql', 'master_data_governance'],
  ['072_canonical_foundation_governance.sql', 'foundation_governance'],
  ['073_canonical_master_data_core.sql', 'master_data'],
  ['074_canonical_engineering_definition.sql', 'mfg_engineering'],
  ['075_canonical_planning_erp_orchestration.sql', 'demand_supply_planning'],
  ['076_canonical_mes_execution_spine.sql', 'mes_execution'],
  ['077_canonical_inventory_cost_traceability.sql', 'inventory'],
  ['078_canonical_eqms_compliance_backbone.sql', 'quality_management'],
  ['082_allocation_lifecycle.sql', 'record_system'],
  ['083_procurement_recovery_chain.sql', 'purchasing'],
  ['084_execution_quality_projection.sql', 'production'],
  ['085_operational_lifecycle_hardening.sql', 'master_data_governance'],
  ['086_canonical_transportation_freight_orders.sql', 'transportation'],
  ['087_canonical_ehs_safety_observations.sql', 'ehs_sustainability'],
  ['088_canonical_finance_inventory_valuations.sql', 'finance'],
  ['089_canonical_analytics_plant_performance_snapshots.sql', 'bi_datawarehouse'],
  ['090_canonical_projection_lineage_hardening.sql', 'bi_datawarehouse'],
  ['091_runtime_governance_continuity.sql', 'system_infrastructure'],
  ['092_risk_register_contract_alignment.sql', 'audit_risk'],
  ['093_runtime_observed_contract_columns.sql', 'system_infrastructure'],
  ['094_department_enum_operational_alignment.sql', 'foundation_governance'],
  ['095_department_master_operational_alignment.sql', 'foundation_governance'],
  ['096_runtime_identifier_and_state_contract_alignment.sql', 'system_infrastructure'],
  ['097_idempotency_replay_ledger.sql', 'system_infrastructure'],
  ['098_canonical_manufacturing_event_backbone.sql', 'mes_execution'],
  ['099_ai_integration_foundation.sql', 'ai_predictive'],
  ['100_trusted_release_record_spine.sql', 'mes_execution'],
  ['101_eqms_control_plane_foundation.sql', 'record_system'],
  ['102_eqms_document_form_control.sql', 'document_control'],
  ['103_eqms_evidence_package_publication.sql', 'evidence_vault'],
  ['104_eqms_change_authority_field_governance.sql', 'plm_change_control'],
  ['105_connected_governance_revision_training_execution.sql', 'quality_management'],
  ['106_eqms_world_class_control_plane.sql', 'quality_management'],
  ['107_phase1_shopfloor_execution_bridge.sql', 'production'],
  ['108_world_class_control_plane_execution.sql', 'record_system'],
  ['109_control_plane_cutover_hardening.sql', 'record_system'],
]);

const tableDomainOverrides = {
  // Canonical 7-layer blueprint tables rely on explicit governance mapping
  // because many intentionally avoid module-specific prefixes.
  org_enterprise: 'foundation_governance',
  org_company: 'foundation_governance',
  org_site: 'foundation_governance',
  org_plant: 'foundation_governance',
  org_warehouse: 'foundation_governance',
  org_work_center: 'foundation_governance',
  org_work_unit: 'foundation_governance',
  party: 'foundation_governance',
  party_role: 'foundation_governance',
  party_site: 'foundation_governance',
  party_contact: 'foundation_governance',
  uom: 'foundation_governance',
  calendar: 'foundation_governance',
  shift: 'foundation_governance',
  reason_code: 'foundation_governance',
  status_code: 'foundation_governance',
  electronic_signature: 'foundation_governance',
  attachment: 'foundation_governance',
  approval: 'foundation_governance',
  lot_policy: 'master_data',
  serial_policy: 'master_data',
  shelf_life_policy: 'master_data',
  item: 'master_data',
  item_class: 'master_data',
  item_revision: 'master_data',
  item_variant: 'master_data',
  item_site: 'master_data',
  item_attr: 'master_data',
  item_spec: 'master_data',
  bom: 'mfg_engineering',
  bom_version: 'mfg_engineering',
  bom_line: 'mfg_engineering',
  bom_substitute: 'mfg_engineering',
  work_definition: 'mfg_engineering',
  work_definition_version: 'mfg_engineering',
  operation: 'mfg_engineering',
  operation_resource: 'mfg_engineering',
  operation_material: 'mfg_engineering',
  operation_output: 'mfg_engineering',
  work_instruction: 'mfg_engineering',
  demand: 'demand_supply_planning',
  forecast: 'demand_supply_planning',
  sales_order: 'sales',
  sales_order_line: 'sales',
  purchase_order: 'purchasing',
  purchase_order_line: 'purchasing',
  production_order: 'production',
  mrp_signal: 'demand_supply_planning',
  planned_supply: 'demand_supply_planning',
  allocation: 'demand_supply_planning',
  pegging: 'demand_supply_planning',
  production_order_bom_snapshot: 'production',
  production_order_route_snapshot: 'production',
  work_order: 'mes_execution',
  job: 'mes_execution',
  track_in: 'mes_execution',
  track_out: 'mes_execution',
  pause_resume: 'mes_execution',
  dispatch_queue: 'mes_execution',
  job_event: 'mes_execution',
  machine_event: 'mes_execution',
  downtime_event: 'mes_execution',
  alarm_event: 'mes_execution',
  process_param_capture: 'mes_execution',
  labor_capture: 'mes_execution',
  tool_usage: 'mes_execution',
  material_consumption: 'mes_execution',
  production_completion: 'mes_execution',
  scrap: 'mes_execution',
  rework: 'mes_execution',
  genealogy_link: 'traceability_serialization',
  lot: 'traceability_serialization',
  serial: 'traceability_serialization',
  container: 'inventory',
  inventory_ledger: 'inventory',
  inventory_balance_snapshot: 'inventory',
  location_balance: 'inventory',
  cost_ledger: 'finance',
  wip_ledger: 'finance',
  inspection_plan: 'quality_management',
  inspection_characteristic: 'quality_management',
  inspection_lot: 'quality_management',
  inspection_result: 'quality_management',
  quality_order: 'quality_management',
  quality_case_link: 'quality_management',
  nonconformance: 'quality_management',
  deviation: 'quality_management',
  capa: 'quality_management',
  complaint: 'quality_management',
  document: 'document_control',
  document_revision: 'document_control',
  change_control: 'plm_change_control',
  audit_program: 'audit_risk',
  audit: 'audit_risk',
  finding: 'audit_risk',
  competency: 'training_hr',
  training_matrix: 'training_hr',
  training_record: 'training_hr',
  supplier_quality_case: 'supplier_relationship',
  risk_register: 'audit_risk',
  audit_trail: 'audit_risk',
  allocations: 'record_system',
  allocation_events: 'record_system',
  form_drafts: 'forms_system',
  electronic_signatures: 'record_system',
  master_data_store: 'master_data_governance',
  npi_projects: 'project_management',
  ehs_incidents: 'ehs_sustainability',
  engineering_change_requests: 'plm_change_control',
  workflow_step_data: 'system_infrastructure',
  idempotency_replay_ledger: 'system_infrastructure',
  ncr_mrb_decisions: 'quality_management',
  ncr_human_factors: 'quality_management',
  capa_8d_steps: 'quality_management',
  capa_effectiveness_checks: 'quality_management',
  calibration_oot_investigations: 'calibration_equipment',
  calibration_grr_studies: 'calibration_equipment',
  fai_trigger_log: 'quality_management',
  subcontract_orders: 'outsource_execution',
  subcontract_receipts: 'outsource_execution',
  rma_orders: 'service_warranty',
  kpi_definitions: 'bi_datawarehouse',
  kpi_snapshots: 'bi_datawarehouse',
  mrp_planned_orders: 'advanced_planning',
  customer_sites: 'sales',
  commercial_accounts: 'commercial_contracts',
  order_holds: 'sales',
  order_milestones: 'sales',
  order_document_requirements: 'sales',
  job_release_gates: 'production',
  outside_processing_orders: 'outsource_execution',
  shipment_releases: 'shipping_compliance',
  order_collaboration_events: 'sales',
  contract_review_items: 'sales',
  order_notes: 'sales',
  order_documents_required: 'sales',
  order_timeline_events: 'sales',
  customer_complaints: 'quality_management',
  material_review_board: 'quality_management',
  deviations: 'quality_management',
  concessions: 'quality_management',
  copq_ledger: 'quality_management',
  escalation_rules: 'system_infrastructure',
  escalation_log: 'system_infrastructure',
  supplier_scorecards: 'supplier_relationship',
  incoming_inspections: 'quality_management',
  incoming_inspection_results: 'quality_management',
  ap_invoices: 'finance',
  ap_invoice_lines: 'finance',
  ipqc_inspections: 'quality_management',
  ipqc_inspection_results: 'quality_management',
  stock_balances: 'inventory',
  skip_lot_tracking: 'supplier_relationship',
  approved_supplier_list: 'supplier_relationship',
  scar_records: 'supplier_relationship',
  supplier_audit_schedule: 'supplier_relationship',
  quotes: 'sales',
  quote_lines: 'sales',
  material_cost_templates: 'commercial_contracts',
  machine_rate_cards: 'commercial_contracts',
  quote_history: 'sales',
  shift_definitions: 'production',
  shift_assignments: 'production',
  shift_calendar_holidays: 'production',
  oqc_inspections: 'quality_management',
  packing_lists: 'shipping_compliance',
  packing_list_items: 'shipping_compliance',
  quality_predictions: 'ai_predictive',
  prediction_models: 'ai_predictive',
  spc_anomaly_rules: 'ai_predictive',
  production_schedule_slots: 'advanced_planning',
  schedule_conflicts: 'advanced_planning',
  capacity_snapshots: 'advanced_planning',
  machine_telemetry_extended: 'mes_execution',
  mobile_work_queue: 'mobile_operations',
  mobile_time_entries: 'mobile_operations',
  mobile_inspection_captures: 'mobile_operations',
  lean_kaizen_events: 'lean_manufacturing',
  lean_qrqc_events: 'lean_manufacturing',
  lean_andon_events: 'lean_manufacturing',
  lean_5s_audits: 'lean_manufacturing',
  lean_gemba_walks: 'lean_manufacturing',
  lean_smed_events: 'lean_manufacturing',
  lean_tier_meetings: 'lean_manufacturing',
  lean_tier_escalations: 'lean_manufacturing',
  domain_outbox_events: 'system_infrastructure',
  eqms_electronic_signature_event: 'foundation_governance',
  eqms_document_family: 'document_control',
  eqms_document_revision: 'document_control',
  eqms_document_effectivity: 'document_control',
  eqms_document_distribution: 'document_control',
  eqms_document_read_ack: 'document_control',
  eqms_form_family: 'forms_system',
  eqms_form_template_revision: 'forms_system',
  eqms_form_schema_version: 'forms_system',
  eqms_form_issuance: 'forms_system',
  eqms_form_submission_attempt: 'forms_system',
  eqms_form_record: 'forms_system',
  eqms_form_record_version: 'forms_system',
  eqms_evidence_record: 'evidence_vault',
  eqms_evidence_manifest: 'evidence_vault',
  eqms_evidence_version: 'evidence_vault',
  eqms_evidence_artifact: 'evidence_vault',
  eqms_publication_target: 'evidence_vault',
  eqms_publication_job: 'evidence_vault',
  eqms_publication_event: 'evidence_vault',
  eqms_retention_lock: 'record_system',
  eqms_integrity_digest: 'evidence_vault',
  eqms_integrity_exception: 'evidence_vault',
  eqms_change_affected_object: 'plm_change_control',
  eqms_change_resulting_object: 'plm_change_control',
  eqms_field_governance_rule: 'plm_change_control',
  eqms_field_change_authorization: 'plm_change_control',
  eqms_controlled_revision_rollout: 'quality_management',
  eqms_training_obligation: 'training_hr',
  eqms_execution_entitlement_decision: 'mes_execution',
  doc_families: 'document_control',
  doc_revisions: 'document_control',
  doc_effectivities: 'document_control',
  doc_distributions: 'document_control',
  doc_read_acknowledgements: 'document_control',
  frm_families: 'forms_system',
  frm_template_revisions: 'forms_system',
  frm_schema_versions: 'forms_system',
  frm_issuances: 'forms_system',
  frm_submission_attempts: 'forms_system',
  evidence_records: 'evidence_vault',
  evidence_versions: 'evidence_vault',
  evidence_artifacts: 'evidence_vault',
  evidence_publications: 'evidence_vault',
  signature_events: 'foundation_governance',
  plm_change_affected_objects: 'plm_change_control',
  plm_change_resulting_objects: 'plm_change_control',
  plm_change_effectivities: 'plm_change_control',
  plm_change_training_requirements: 'plm_change_control',
  plm_change_verifications: 'plm_change_control',
  plm_change_effectiveness_reviews: 'plm_change_control',
  field_governance_rules: 'plm_change_control',
  release_manifests: 'record_system',
  promotion_receipts: 'record_system',
  reverse_sync_intakes: 'system_infrastructure',
  source_boundary_violations: 'system_infrastructure',
  eqms_command_ledger: 'record_system',
  control_plane_object_registry: 'record_system',
  state_transition_events: 'record_system',
  submission_validation_results: 'forms_system',
  submission_validation_errors: 'forms_system',
  duplicate_detection_fingerprints: 'system_infrastructure',
  online_form_sessions: 'forms_system',
  effectivity_conflicts: 'plm_change_control',
  wip_dispositions: 'quality_management',
  training_gate_decisions: 'training_hr',
  read_ack_gate_decisions: 'document_control',
  publication_attempts: 'evidence_vault',
  publication_receipts: 'evidence_vault',
  immutable_storage_objects: 'record_system',
  audit_pack_exports: 'record_system',
  legal_holds: 'record_system',
  genealogy_nodes: 'traceability_serialization',
  genealogy_edges: 'traceability_serialization',
  as_manufactured_snapshots: 'traceability_serialization',
  traceability_exceptions: 'traceability_serialization',
  outbox_events: 'system_infrastructure',
  background_jobs: 'system_infrastructure',
  integrity_digests: 'evidence_vault',
  integrity_exceptions: 'evidence_vault',
  retention_locks: 'record_system',
  governed_route_registry: 'record_system',
  legacy_authority_sunset: 'record_system',
  control_plane_command_handlers: 'record_system',
  periodic_evaluations: 'record_system',
  emergency_change_controls: 'plm_change_control',
  rollback_requirements: 'plm_change_control',
  genealogy_edge_facts: 'traceability_serialization',
  traceability_5m_obligations: 'traceability_serialization',
};

const mesSubdomains = {
  mes_core: new Set(['mes_sites', 'mes_areas', 'mes_equipment_extended', 'mes_shop_floor_layout']),
  mes_execution: new Set([
    'mes_job_execution',
    'mes_operation_execution',
    'mes_cycle_events',
    'mes_operator_sessions',
    'mes_operator_qualifications',
    'mes_shift_handover',
    'mes_dispatch_queue',
    'mes_pm_execution',
    'mes_program_events',
    'mes_connectivity_adapters',
    'mes_connectivity_events',
    'mes_nc_release_packages',
    'mes_nc_download_receipts',
  ]),
  mes_telemetry: new Set([
    'mes_machine_state_events',
    'mes_machine_telemetry',
    'mes_machine_alarms',
    'mes_alarm_catalog',
    'mes_alarm_playbooks',
    'mes_downtime_events',
    'mes_machine_snapshot',
  ]),
  mes_quality: new Set(['mes_inline_measurements', 'mes_spc_control_limits', 'mes_spc_violations']),
  mes_material: new Set([
    'mes_material_consumption',
    'mes_wip_location',
    'mes_wip_movements',
    'mes_spare_parts_consumption',
    'mes_part_genealogy',
    'mes_genealogy_operations',
  ]),
  mes_integration: new Set([
    'mes_erp_inbound_queue',
    'mes_erp_outbound_queue',
    'mes_event_subscriptions',
    'mes_erp_sync_runs',
    'mes_erp_reconciliation_exceptions',
  ]),
  mes_analytics: new Set([
    'mes_oee_loss_events',
    'mes_oee_snapshots',
    'mes_production_kpi_daily',
    'mes_on_time_delivery',
    'mes_dpp_passports',
    'mes_energy_snapshots',
    'mes_cost_tracking',
    'mes_tool_life_events',
    'mes_fixture_assignments',
    'mes_tool_preset_offsets',
    'mes_tool_assemblies',
  ]),
};

const entityPrimaryTable = {
  quote: 'quotes',
  quotation: 'quotes',
  sales_order: 'sales_orders',
  job_order: 'job_orders',
  work_order: 'pm_work_orders',
  purchase_order: 'purchase_orders',
  goods_receipt: 'subcontract_receipts',
  receiving_inspection: 'incoming_inspections',
  supplier: 'vendors',
  ncr: 'ncr_records',
  capa: 'capa_records',
  fai: 'fai_records',
  document: 'documents',
  training: 'training_records',
  shipment_release: 'shipment_releases',
  tool: 'tools',
  supplier_scorecard: 'supplier_scorecards',
  retention_policy: 'retention_policies',
  integration_monitor: 'integration_monitors',
  scrap_report: 'copq_ledger',
  resource_calendar: 'eng_factory_calendars',
  capacity_plan: 'aps_planning_scenarios',
  mrp_suggestion: 'mrp_planned_orders',
  doc_master: 'documents',
  audit_log_viewer: 'audit_events',
  customer_complaint: 'customer_complaints',
  cnc_program: 'cnc_programs',
  product_passport: 'product_passports',
  fmea: 'fmea_records',
  apqp: 'apqp_projects',
  incoming_inspection: 'incoming_inspections',
  supplier_audit: 'supplier_audit_schedule',
  project: 'projects',
  mobile: 'mobile_work_queue',
  oqc: 'oqc_inspections',
  customer_portal_user: 'portal_users',
  lean_kaizen: 'lean_kaizen_events',
  lean_qrqc: 'lean_qrqc_events',
  lean_andon: 'lean_andon_events',
  lean_5s_audit: 'lean_5s_audits',
  lean_gemba_walk: 'lean_gemba_walks',
  lean_smed: 'lean_smed_events',
  lean_tier_meeting: 'lean_tier_meetings',
};

const supportTableNamePatterns = [
  /_lines$/,
  /_line$/,
  /_items$/,
  /_item$/,
  /_links$/,
  /_link$/,
  /_results$/,
  /_result$/,
  /_events$/,
  /_snapshots$/,
  /_logs$/,
  /_log$/,
  /_history$/,
  /_assignments$/,
  /_members$/,
  /_attributes$/,
  /_templates$/,
  /_revisions$/,
  /_versions$/,
  /_steps$/,
  /_parts$/,
  /_operations$/,
  /_requirements$/,
  /_evidence$/,
  /^workflow_step_data$/,
];

const nonSupportTableNameOverrides = new Set([
  'job_operations',
  'lean_andon_events',
  'lean_kaizen_events',
  'lean_qrqc_events',
  'lean_smed_events',
]);

const genericAuditColumns = new Set([
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'recorded_at',
  'created_date',
  'updated_date',
  'approved_by',
  'approved_at',
  'approved_date',
  'submitted_by',
  'submitted_at',
  'closed_at',
  'valid_from',
  'valid_to',
  'effective_date',
  'effective_from',
  'effective_to',
  'last_update_date',
  'last_updated_by',
  'creation_date',
  'last_update_login',
  'last_login',
  'last_login_at',
  'expires_at',
  'recorded_by',
  'requested_by',
  'assigned_to',
  'performed_by',
]);

const apiParamHints = new Set([
  'api',
  'code',
  'otp',
  'secret',
  'otpauth_url',
  'csrf_token',
  'before_head',
  'after_head',
  'branch',
  'account',
  'issuer',
  'server_time',
  'pending_expires_in',
]);

const extraVietnameseTokens = {
  sales: 'bán hàng',
  order: 'đơn hàng',
  orders: 'đơn hàng',
  review: 'xem xét',
  reviewed: 'đã xem xét',
  contract: 'hợp đồng',
  bill: 'thanh toán',
  by: 'bởi',
  from: 'từ',
  to: 'đến',
  actual: 'thực tế',
  ship: 'giao hàng',
  shipment: 'lô giao',
  transfer: 'chuyển kho',
  blanket: 'bao khung',
  ref: 'tham chiếu',
  completed: 'hoàn tất',
  closeout: 'kết thúc',
  analysis: 'phân tích',
  conformance: 'phù hợp',
  recall: 'thu hồi',
  scope: 'phạm vi',
  campaign: 'chiến dịch',
  site: 'địa điểm',
  hold: 'tạm giữ',
  milestone: 'mốc',
  timeline: 'dòng thời gian',
  telemetry: 'telemetry',
  ambient: 'môi trường',
  axis: 'trục',
  coolant: 'dung dịch làm mát',
  concentration: 'nồng độ',
  pressure: 'áp suất',
  vault: 'kho lưu',
  trace: 'truy xuất',
  portal: 'cổng',
  work: 'công việc',
  maintenance: 'bảo trì',
  minutes: 'phút',
  minute: 'phút',
};

const supplementalVietnameseTokens = {
  purchase: 'mua',
  purchases: 'mua',
  purchasing: 'mua hàng',
  of: '',
  at: 'lúc',
  shipments: 'lô giao',
  campaigns: 'chiến dịch',
  sites: 'địa điểm',
  milestones: 'mốc',
  line: 'dòng',
  lines: 'dòng',
  event: 'sự kiện',
  events: 'sự kiện',
  record: 'hồ sơ',
  records: 'hồ sơ',
  plan: 'kế hoạch',
  plans: 'kế hoạch',
  snapshot: 'ảnh chụp',
  snapshots: 'ảnh chụp',
  profile: 'hồ sơ',
  profiles: 'hồ sơ',
  requirement: 'yêu cầu',
  requirements: 'yêu cầu',
  request: 'yêu cầu',
  requests: 'yêu cầu',
  transaction: 'giao dịch',
  transactions: 'giao dịch',
  program: 'chương trình',
  programs: 'chương trình',
  quote: 'báo giá',
  quotes: 'báo giá',
  invoice: 'hóa đơn',
  invoices: 'hóa đơn',
  finding: 'phát hiện',
  findings: 'phát hiện',
  component: 'thành phần',
  components: 'thành phần',
  calibration: 'hiệu chuẩn',
  certificates: 'chứng chỉ',
  cnc: 'CNC',
  scorecards: 'thẻ điểm',
  activity: 'hoạt động',
  activities: 'hoạt động',
  contact: 'liên hệ',
  contacts: 'liên hệ',
  touchpoints: 'điểm chạm',
  lead: 'khách hàng tiềm năng',
  leads: 'khách hàng tiềm năng',
  opportunity: 'cơ hội',
  opportunities: 'cơ hội',
  complaints: 'khiếu nại',
  classifications: 'phân loại',
  departments: 'phòng ban',
  deviations: 'sai lệch',
  corrective: 'khắc phục',
  emergency: 'khẩn cấp',
  drills: 'diễn tập',
  emissions: 'phát thải',
  assessments: 'đánh giá',
  hazardous: 'nguy hại',
  incidents: 'sự cố',
  safety: 'an toàn',
  permit: 'giấy phép',
  issue: 'vấn đề',
  regulatory: 'quy định',
  sustainability: 'bền vững',
  master: 'chuẩn',
  version: 'phiên bản',
  versions: 'phiên bản',
  run: 'lần chạy',
  runs: 'lần chạy',
  submission: 'bản nộp',
  submissions: 'bản nộp',
  certification: 'chứng nhận',
  certifications: 'chứng nhận',
  rule: 'quy tắc',
  rules: 'quy tắc',
  tax: 'thuế',
  customs: 'hải quan',
  fixture: 'đồ gá',
  fixtures: 'đồ gá',
  form: 'biểu mẫu',
  forms: 'biểu mẫu',
  entry: 'bản nhập',
  entries: 'bản nhập',
  skill: 'kỹ năng',
  skills: 'kỹ năng',
  payroll: 'bảng lương',
  definition: 'định nghĩa',
  definitions: 'định nghĩa',
  template: 'mẫu',
  templates: 'mẫu',
  tracking: 'theo dõi',
  assignment: 'phân công',
  assignments: 'phân công',
  receipt: 'phiếu nhận',
  receipts: 'phiếu nhận',
  mobile: 'di động',
  access: 'truy cập',
  users: 'người dùng',
  bucket: 'bucket',
  buckets: 'bucket',
  resources: 'nguồn lực',
  forecast: 'dự báo',
  forecasts: 'dự báo',
  planning: 'hoạch định',
  conflict: 'xung đột',
  conflicts: 'xung đột',
  credit: 'tín dụng',
  rebate: 'chiết khấu',
  characteristic: 'đặc tính',
  characteristics: 'đặc tính',
  element: 'yếu tố',
  elements: 'yếu tố',
  monitoring: 'giám sát',
  energy: 'năng lượng',
  ppe: 'PPE',
  matrix: 'ma trận',
  waste: 'chất thải',
  employees: 'nhân viên',
  models: 'mô hình',
  standards: 'tiêu chuẩn',
  factory: 'nhà máy',
  calendar: 'lịch',
  families: 'nhóm',
  step: 'bước',
  steps: 'bước',
  escalation: 'leo thang',
  budget: 'ngân sách',
  cash: 'tiền mặt',
  exchange: 'tỷ giá',
  asset: 'tài sản',
  assets: 'tài sản',
  catalog: 'danh mục',
  incoming: 'đầu vào',
  board: 'hội đồng',
  attribute: 'thuộc tính',
  attributes: 'thuộc tính',
  reference: 'tham chiếu',
  alarm: 'cảnh báo',
  alarms: 'cảnh báo',
  connectivity: 'kết nối',
  measurement: 'đo lường',
  measurements: 'đo lường',
  consumption: 'tiêu hao',
  operator: 'người vận hành',
  spare: 'dự phòng',
  limit: 'giới hạn',
  limits: 'giới hạn',
  assembly: 'cụm lắp',
  assemblies: 'cụm lắp',
  claims: 'khiếu nại',
  packing: 'đóng gói',
  passport: 'hộ chiếu',
  passports: 'hộ chiếu',
  product: 'sản phẩm',
  project: 'dự án',
  projects: 'dự án',
  sample: 'mẫu',
  supply: 'cung ứng',
  sourcing: 'tìm nguồn',
  freight: 'vận chuyển',
  label: 'nhãn',
  labels: 'nhãn',
  license: 'giấy phép',
  licenses: 'giấy phép',
  pick: 'lấy hàng',
  queue: 'hàng đợi',
  queues: 'hàng đợi',
  trade: 'thương mại',
  com: 'thương mại',
  eng: 'kỹ thuật',
  prj: 'dự án',
  capacity: 'năng lực',
  pegging: 'gán nối',
  setup: 'thiết lập',
  matrices: 'ma trận',
  comment: 'bình luận',
  comments: 'bình luận',
  concession: 'nhượng bộ',
  concessions: 'nhượng bộ',
  contamination: 'nhiễm bẩn',
  check: 'kiểm tra',
  checks: 'kiểm tra',
  copq: 'COPQ',
  ledger: 'sổ cái',
  demand: 'nhu cầu',
  history: 'lịch sử',
  contractor: 'nhà thầu',
  contractors: 'nhà thầu',
  bank: 'ngân hàng',
  reconciliation: 'đối soát',
  intercompany: 'liên công ty',
  multi: 'đa',
  book: 'sổ',
  realized: 'đã thực hiện',
  fx: 'FX',
  gain: 'lãi',
  gains: 'lãi',
  revenue: 'doanh thu',
  schedule: 'lịch',
  schedules: 'lịch',
  leave: 'nghỉ phép',
  balance: 'số dư',
  balances: 'số dư',
  position: 'vị trí',
  positions: 'vị trí',
  duplicate: 'trùng lặp',
  candidate: 'ứng viên',
  candidates: 'ứng viên',
  governance: 'quản trị',
  uom: 'đơn vị tính',
  conversion: 'chuyển đổi',
  conversions: 'chuyển đổi',
  area: 'khu vực',
  areas: 'khu vực',
  exception: 'ngoại lệ',
  exceptions: 'ngoại lệ',
  handover: 'bàn giao ca',
  shop: 'xưởng',
  floor: 'sàn',
  layout: 'bố trí',
  violation: 'vi phạm',
  violations: 'vi phạm',
  movement: 'dịch chuyển',
  movements: 'dịch chuyển',
  naming: 'đặt tên',
  pattern: 'mẫu',
  patterns: 'mẫu',
  notification: 'thông báo',
  notifications: 'thông báo',
  test: 'thử nghiệm',
  labs: 'phòng thí nghiệm',
  role: 'vai trò',
  roles: 'vai trò',
  consensus: 'đồng thuận',
  meeting: 'cuộc họp',
  scenario: 'kịch bản',
  scenarios: 'kịch bản',
  assumption: 'giả định',
  assumptions: 'giả định',
  bid: 'chào giá',
  comparison: 'so sánh',
  comparisons: 'so sánh',
  installed: 'đã lắp đặt',
  base: 'cơ sở',
  return: 'trả về',
  authorization: 'ủy quyền',
  authorizations: 'ủy quyền',
  carrier: 'đơn vị vận chuyển',
  carriers: 'đơn vị vận chuyển',
  dangerous: 'nguy hiểm',
  goods: 'hàng hóa',
  route: 'tuyến',
  routes: 'tuyến',
  kit: 'bộ kit',
  kits: 'bộ kit',
  preset: 'thiết lập sẵn',
  presets: 'thiết lập sẵn',
  regrind: 'mài lại',
  variable: 'biến',
  variables: 'biến',
  registry: 'sổ đăng ký',
  warehouse: 'kho',
  warehouses: 'kho',
  storage: 'lưu trữ',
  bin: 'ô kệ',
  bins: 'ô kệ',
  zone: 'khu',
  zones: 'khu',
  metadata: 'siêu dữ liệu',
  certified: 'được chứng nhận',
  accredited: 'được công nhận',
  gate: 'cổng',
  linked: 'liên kết',
  planner: 'điều độ viên',
  crew: 'tổ máy',
  shortage: 'thiếu hụt',
  free: 'tự do',
  frozen: 'đóng băng',
  slushy: 'linh hoạt',
  tolerance: 'dung sai',
  sequence: 'trình tự',
  verification: 'xác minh',
  payload: 'gói dữ liệu',
  phantom: 'ảo',
  standard: 'tiêu chuẩn',
  uncertainty: 'độ không đảm bảo',
  link: 'liên kết',
  links: 'liên kết',
  part: 'phụ tùng',
  parts: 'phụ tùng',
  fact: 'sự kiện',
  financial: 'tài chính',
  tag: 'thẻ',
  tooling: 'tooling',
  aging: 'lão hóa',
  allocated: 'đã phân bổ',
  bottleneck: 'nút cổ chai',
  day: 'ngày',
  days: 'ngày',
  locked: 'khóa',
  until: 'đến',
  actor: 'người thao tác',
  aggregate: 'tổng thể',
  alternate: 'thay thế',
  cal: 'CAL',
  grr: 'GRR',
  result: 'kết quả',
  results: 'kết quả',
  file: 'tệp',
  path: 'đường dẫn',
  size: 'kích thước',
  byte: 'byte',
  bytes: 'byte',
  piece: 'chi tiết',
  software: 'phần mềm',
  amendment: 'phụ lục',
  summary: 'tóm tắt',
  responsibility: 'trách nhiệm',
  discount: 'chiết khấu',
  accrual: 'trích trước',
  period: 'kỳ',
  american: 'Mỹ',
  compliant: 'tuân thủ',
  dfars: 'DFARS',
  jurisdiction: 'thẩm quyền',
  restricted: 'hạn chế',
  party: 'đối tượng',
  screen: 'sàng lọc',
  specialty: 'đặc chủng',
  metal: 'kim loại',
  nonconformance: 'không phù hợp',
  detail: 'chi tiết',
  inspector: 'thanh tra',
  reviewer: 'người xem xét',
  owner: 'chủ sở hữu',
  author: 'tác giả',
  parent: 'cha',
  subject: 'chủ đề',
  phone: 'điện thoại',
  primary: 'chính',
  touchpoint: 'điểm chạm',
  sentiment: 'cảm xúc',
  channel: 'kênh',
  team: 'nhóm',
  closure: 'đóng',
  capability: 'năng lực',
  intermittency: 'gián đoạn',
  variability: 'biến thiên',
  chunk: 'khối',
  embedding: 'nhúng',
  text: 'văn bản',
  spec: 'quy cách',
  profit: 'lợi nhuận',
  center: 'trung tâm',
  industry: 'ngành',
  segment: 'phân khúc',
  baseline: 'chuẩn gốc',
};

const tableModulePrefixes = new Set(['ap', 'ar', 'aps', 'crm', 'wms', 'mes', 'mdm', 'ehs', 'hcm', 'tms', 'srm', 'svc', 'fin', 'qual', 'osc', 'trade', 'trace', 'eng', 'com', 'prj', 'pm']);
const phraseModifierTokens = new Set([
  'actual',
  'approved',
  'audit',
  'calibration',
  'commercial',
  'contract',
  'control',
  'customer',
  'incoming',
  'machine',
  'master',
  'mobile',
  'operator',
  'price',
  'quality',
  'recall',
  'sales',
  'service',
  'shipping',
  'supplier',
  'tooling',
  'trace',
  'trade',
  'purchase',
  'work',
]);
const ambiguousGenericColumns = new Set(['status', 'type', 'reason_code', 'priority', 'category', 'severity', 'level', 'name', 'code', 'number', 'metadata', 'description']);
const tableLabelOverrides = {
  ap_ar_invoices: 'Hóa đơn AP AR',
  aps_pegging_links: 'Liên kết gán nối APS',
  bill_of_materials: 'Định mức vật liệu',
  dw_fact_financial: 'Bảng sự kiện tài chính DW',
  evidence_links: 'Liên kết bằng chứng',
  ncr_records: 'Hồ sơ NCR',
  capa_records: 'Hồ sơ CAPA',
  fai_records: 'Hồ sơ FAI',
  job_orders: 'Lệnh sản xuất',
  record_links: 'Liên kết hồ sơ',
  sales_orders: 'Đơn hàng bán',
  purchase_orders: 'Đơn hàng mua',
  svc_service_parts: 'Phụ tùng dịch vụ SVC',
  tags: 'Thẻ',
  tooling_calibration_links: 'Liên kết hiệu chuẩn tooling',
  trace_genealogy_links: 'Liên kết phả hệ truy xuất',
  warehouses: 'Kho hàng',
  wms_transfer_orders: 'Lệnh chuyển kho WMS',
  wms_zones: 'Khu vực WMS',
  approved_supplier_list: 'Danh sách nhà cung cấp được duyệt',
};
const labelOverridesV2 = {
  bill_to_address_id: 'ID địa chỉ thanh toán',
  ship_to_address_id: 'ID địa chỉ giao hàng',
  certificate_of_analysis_required: 'Yêu cầu chứng chỉ phân tích',
  certificate_of_conformance_required: 'Yêu cầu chứng chỉ phù hợp',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toSnakeCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
}

function toTitleCase(value) {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^(api|erp|mes|qms|aps|plm|crm|wms|hcm|sop|mdm|ehs|dw|fmea|apqp|ppap|ncr|capa|fai|spc|oqc|pm|tms|srm|svc|fin|qual|osc|trace|eccn|dpp|kpi|oee|wip|po|so|jo|wo|bom|uom|mrb|grr|oot|qrqc|smed)$/i.test(part)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function capitalizeLabel(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function joinVietnameseTokens(parts) {
  return parts
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyEnglishOnlyLabel(value) {
  if (!value) return true;
  if (/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(value)) return false;
  return /^[A-Za-z0-9\s\-_/()]+$/.test(value);
}

function humanizeKey(key) {
  return toTitleCase(
    key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .trim(),
  );
}

function englishLabelFromKey(key) {
  if (fieldLabelOverrides[key]?.en) return fieldLabelOverrides[key].en;
  return humanizeKey(key)
    .replace(/\bWo\b/g, 'WO')
    .replace(/\bPo\b/g, 'PO')
    .replace(/\bSo\b/g, 'SO')
    .replace(/\bJo\b/g, 'JO')
    .replace(/\bNcr\b/g, 'NCR')
    .replace(/\bCapa\b/g, 'CAPA')
    .replace(/\bFai\b/g, 'FAI')
    .replace(/\bFmea\b/g, 'FMEA')
    .replace(/\bSpc\b/g, 'SPC')
    .replace(/\bOee\b/g, 'OEE')
    .replace(/\bPpk\b/g, 'Ppk')
    .replace(/\bCpk\b/g, 'Cpk')
    .replace(/\bAps\b/g, 'APS')
    .replace(/\bPlm\b/g, 'PLM')
    .replace(/\bWms\b/g, 'WMS')
    .replace(/\bHcm\b/g, 'HCM')
    .replace(/\bMes\b/g, 'MES')
    .replace(/\bDw\b/g, 'DW')
    .replace(/\bMdm\b/g, 'MDM')
    .replace(/\bTms\b/g, 'TMS')
    .replace(/\bSrm\b/g, 'SRM')
    .replace(/\bSvc\b/g, 'SVC')
    .replace(/\bEhs\b/g, 'EHS')
    .replace(/\bOsc\b/g, 'OSC')
    .replace(/\bUom\b/g, 'UOM')
    .replace(/\bMrb\b/g, 'MRB')
    .replace(/\bGrr\b/g, 'GRR')
    .replace(/\bOot\b/g, 'OOT')
    .replace(/\bQrqc\b/g, 'QRQC')
    .replace(/\bSmed\b/g, 'SMED');
}

function translateVietnameseToken(token) {
  if (fieldLabelOverrides[token]?.vi) return fieldLabelOverrides[token].vi;
  if (extraVietnameseTokens[token]) return extraVietnameseTokens[token];
  if (tokenTranslations[token]) return tokenTranslations[token];
  if (/^(api|erp|mes|qms|aps|plm|crm|wms|hcm|sop|mdm|ehs|dw|fmea|apqp|ppap|ncr|capa|fai|spc|oqc|pm|tms|srm|svc|fin|qual|osc|eccn|dpp|kpi|oee|wip|po|so|jo|wo|bom|uom|mrb|grr|oot|qrqc|smed)$/i.test(token)) {
    return token.toUpperCase();
  }
  return toTitleCase(token);
}

function vietnameseLabelFromKey(key) {
  if (fieldLabelOverrides[key]?.vi) return fieldLabelOverrides[key].vi;
  const normalized = toSnakeCase(key);
  const tokens = normalized.split('_').filter(Boolean);
  if (!tokens.length) return key;
  if (tokens.at(-1) === 'id' && tokens.length > 1) return `ID ${tokens.slice(0, -1).map(translateVietnameseToken).join(' ')}`;
  if (tokens.at(-1) === 'status' && tokens.length > 1) return `Trạng thái ${tokens.slice(0, -1).map(translateVietnameseToken).join(' ')}`;
  if (tokens.at(-1) === 'number' && tokens.length > 1) return `Số ${tokens.slice(0, -1).map(translateVietnameseToken).join(' ')}`;
  if (tokens.at(-1) === 'date' && tokens.length > 1) return `Ngày ${tokens.slice(0, -1).map(translateVietnameseToken).join(' ')}`;
  if (tokens.at(-1) === 'code' && tokens.length > 1) return `Mã ${tokens.slice(0, -1).map(translateVietnameseToken).join(' ')}`;
  if ((tokens.at(-1) === 'qty' || tokens.at(-1) === 'quantity') && tokens.length > 1) return `Số lượng ${tokens.slice(0, -1).map(translateVietnameseToken).join(' ')}`;
  if (['pct', 'percent', 'ratio'].includes(tokens.at(-1)) && tokens.length > 1) return `Tỷ lệ ${tokens.slice(0, -1).map(translateVietnameseToken).join(' ')}`;
  return tokens.map(translateVietnameseToken).join(' ');
}

function translateVietnameseTokenV2(token) {
  if (supplementalVietnameseTokens[token]) return supplementalVietnameseTokens[token];
  if (token.endsWith('sis')) return translateVietnameseToken(token);
  if (token.length > 4 && token.endsWith('ies')) return translateVietnameseTokenV2(`${token.slice(0, -3)}y`);
  if (token.length > 4 && /(ches|shes|xes|zes|sses)$/.test(token)) return translateVietnameseTokenV2(token.slice(0, -2));
  if (token.length > 3 && token.endsWith('s')) return translateVietnameseTokenV2(token.slice(0, -1));
  return translateVietnameseToken(token);
}

function vietnamesePhrase(tokens) {
  if (!tokens.length) return '';
  if (tokens.length === 1) return translateVietnameseTokenV2(tokens[0]);
  const [first, ...rest] = tokens;
  if (phraseModifierTokens.has(first)) {
    return joinVietnameseTokens([vietnamesePhrase(rest), translateVietnameseTokenV2(first)]);
  }
  return joinVietnameseTokens(tokens.map((token) => translateVietnameseTokenV2(token)));
}

function vietnameseLabelFromKeyV2(key) {
  if (labelOverridesV2[key]) return labelOverridesV2[key];
  if (fieldLabelOverrides[key]?.vi && !isLikelyEnglishOnlyLabel(fieldLabelOverrides[key].vi)) return fieldLabelOverrides[key].vi;
  const normalized = toSnakeCase(key);
  const tokens = normalized.split('_').filter(Boolean);
  if (!tokens.length) return key;
  if (tokens[0] === 'is' && tokens.length > 1) return capitalizeLabel(vietnamesePhrase(tokens.slice(1)));
  if (tokens.at(-1) === 'id' && tokens.length > 1) return capitalizeLabel(`ID ${vietnamesePhrase(tokens.slice(0, -1))}`);
  if (tokens.at(-1) === 'status' && tokens.length > 1) return capitalizeLabel(`Trạng thái ${vietnamesePhrase(tokens.slice(0, -1))}`);
  if (tokens.at(-1) === 'number' && tokens.length > 1) return capitalizeLabel(`Số ${vietnamesePhrase(tokens.slice(0, -1))}`);
  if (tokens.at(-1) === 'date' && tokens.length > 1) return capitalizeLabel(`Ngày ${vietnamesePhrase(tokens.slice(0, -1))}`);
  if (tokens.at(-1) === 'code' && tokens.length > 1) return capitalizeLabel(`Mã ${vietnamesePhrase(tokens.slice(0, -1))}`);
  if (tokens.at(-1) === 'at' && tokens.length > 1) return capitalizeLabel(`${vietnamesePhrase(tokens.slice(0, -1))} lúc`);
  if (tokens.at(-1) === 'by' && tokens.length > 1) return capitalizeLabel(`${vietnamesePhrase(tokens.slice(0, -1))} bởi`);
  if (tokens.at(-1) === 'required' && tokens.length > 1) return capitalizeLabel(`Yêu cầu ${vietnamesePhrase(tokens.slice(0, -1))}`);
  if ((tokens.at(-1) === 'qty' || tokens.at(-1) === 'quantity') && tokens.length > 1) return capitalizeLabel(`Số lượng ${vietnamesePhrase(tokens.slice(0, -1))}`);
  if (['pct', 'percent', 'ratio'].includes(tokens.at(-1)) && tokens.length > 1) return capitalizeLabel(`Tỷ lệ ${vietnamesePhrase(tokens.slice(0, -1))}`);
  return capitalizeLabel(vietnamesePhrase(tokens));
}

function vietnameseTableLabelFromKey(key) {
  const normalized = toSnakeCase(key);
  if (tableLabelOverrides[normalized]) return tableLabelOverrides[normalized];
  const tokens = normalized.split('_').filter(Boolean);
  if (!tokens.length) return key;
  const modifiers = [];
  while (tokens.length > 1 && tableModulePrefixes.has(tokens[0])) {
    modifiers.push(tokens.shift());
  }
  const base = vietnamesePhrase(tokens);
  return capitalizeLabel(joinVietnameseTokens([base, modifiers.map((token) => translateVietnameseTokenV2(token))]));
}

function maskSingleQuotedLiterals(text) {
  let result = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'") {
      result += ' ';
      i += 1;
      while (i < text.length) {
        const inner = text[i];
        if (inner === "'" && text[i + 1] === "'") {
          result += '  ';
          i += 2;
          continue;
        }
        result += inner === '\n' ? '\n' : ' ';
        if (inner === "'") break;
        i += 1;
      }
      continue;
    }
    result += ch;
  }
  return result;
}

function splitStatements(text) {
  const statements = [];
  let current = '';
  let lineComment = false;
  let blockComment = false;
  let quote = null;
  let dollarTag = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (lineComment) {
      if (ch === '\n') {
        lineComment = false;
        current += ch;
      }
      continue;
    }

    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (dollarTag) {
      if (text.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (quote) {
      current += ch;
      if (quote === "'" && ch === "'" && next === "'") {
        current += next;
        i += 1;
        continue;
      }
      if (quote === '"' && ch === '"' && next === '"') {
        current += next;
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '-' && next === '-') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '$') {
      const match = text.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }
    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function findMatching(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote) {
      if (quote === "'" && ch === "'" && next === "'") {
        i += 1;
        continue;
      }
      if (quote === '"' && ch === '"' && next === '"') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === openChar) depth += 1;
    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(text, delimiter = ',') {
  const result = [];
  let current = '';
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote) {
      current += ch;
      if (quote === "'" && ch === "'" && next === "'") {
        current += next;
        i += 1;
        continue;
      }
      if (quote === '"' && ch === '"' && next === '"') {
        current += next;
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') depthParen += 1;
    if (ch === ')') depthParen -= 1;
    if (ch === '{') depthBrace += 1;
    if (ch === '}') depthBrace -= 1;
    if (ch === '[') depthBracket += 1;
    if (ch === ']') depthBracket -= 1;
    if (ch === delimiter && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function normalizeIdentifier(identifier) {
  return identifier.replace(/"/g, '').split('.').at(-1);
}

function splitIdentifierList(value) {
  return splitTopLevel(String(value || ''))
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveConstraintColumn(table, expression) {
  const direct = normalizeIdentifier(String(expression || '').trim());
  if (table.columns.has(direct)) return direct;
  const matches = Array.from(String(expression || '').matchAll(/[A-Za-z_][A-Za-z0-9_]*/g))
    .map((match) => normalizeIdentifier(match[0]));
  for (const candidate of matches) {
    if (table.columns.has(candidate)) return candidate;
  }
  return direct;
}

function ensureTable(tables, tableName, migration) {
  if (!tables.has(tableName)) {
    tables.set(tableName, {
      tableName,
      migration,
      columns: new Map(),
      foreignKeys: [],
      uniqueGroups: [],
      primaryKey: [],
      comments: new Map(),
    });
  }
  return tables.get(tableName);
}

function parseType(rest) {
  const tokens = [];
  let current = '';
  let depth = 0;
  const pushCurrent = () => {
    if (current.trim()) tokens.push(current.trim());
    current = '';
  };
  const parts = [];
  for (let i = 0; i < rest.length; i += 1) {
    const ch = rest[i];
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (/\s/.test(ch) && depth === 0) {
      pushCurrent();
    } else {
      current += ch;
    }
  }
  pushCurrent();
  const constraintKeywords = new Set(['NOT', 'NULL', 'DEFAULT', 'PRIMARY', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'REFERENCES', 'GENERATED', 'COLLATE']);
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (constraintKeywords.has(upper)) break;
    parts.push(token);
  }
  return parts.join(' ');
}

function normalizeTypeForRegistry(type) {
  return String(type || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^"?public"?\./i, '')
    .replace(/"([^"]+)"/g, '$1')
    .toUpperCase();
}

function parseCheckValues(text, columnName) {
  const patterns = [
    new RegExp(`CHECK\\s*\\(\\s*${columnName}\\s+IN\\s*\\(([^)]+)\\)`, 'i'),
    new RegExp(`CHECK\\s*\\(\\s*${columnName}\\s*=\\s*ANY\\s*\\(\\s*ARRAY\\s*\\[([^\\]]+)\\]`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const values = [...match[1].matchAll(/'([^']+)'/g)].map((part) => part[1]);
    if (values.length) return values;
  }
  return [];
}

function parseColumnDefinition(entry) {
  const match = entry.match(/^("?[\w]+"?)\s+([\s\S]+)$/);
  if (!match) return null;
  const name = normalizeIdentifier(match[1]);
  if (/^(constraint|primary|foreign|unique|check)$/i.test(name)) return null;
  const rest = match[2].trim();
  const rawType = parseType(rest);
  const referencesMatch = rest.match(/REFERENCES\s+("?[\w.]+"?)\s*\(([^)]+)\)/i);
  return {
    name,
    type: normalizeTypeForRegistry(rawType),
    required: /\bNOT\s+NULL\b/i.test(rest),
    pk: /\bPRIMARY\s+KEY\b/i.test(rest),
    unique: /\bUNIQUE\b/i.test(rest),
    generated: /\bGENERATED\b/i.test(rest),
    default: rest.match(/\bDEFAULT\b\s+(.+?)(?=\s+(?:NOT|NULL|PRIMARY|UNIQUE|CHECK|REFERENCES|CONSTRAINT|GENERATED|COLLATE)\b|$)/i)?.[1]?.trim() ?? null,
    references: referencesMatch
      ? {
          table: normalizeIdentifier(referencesMatch[1]),
          columns: splitIdentifierList(referencesMatch[2]).map((part) => normalizeIdentifier(part)),
        }
      : null,
    checkValues: parseCheckValues(rest, name),
  };
}

function parseAlterColumnTypeClause(table, clause) {
  const match = clause.match(/^ALTER\s+(?:COLUMN\s+)?("?[\w]+"?)\s+(?:SET\s+DATA\s+)?TYPE\s+([\s\S]+)$/i);
  if (!match) return false;
  const name = normalizeIdentifier(match[1]);
  const typeExpression = match[2]
    .replace(/\s+(?:COLLATE|USING)\b[\s\S]*$/i, '')
    .trim();
  if (!typeExpression) return true;
  const existing = table.columns.get(name);
  if (existing) {
    existing.type = normalizeTypeForRegistry(typeExpression);
    return true;
  }
  table.columns.set(name, {
    name,
    type: normalizeTypeForRegistry(typeExpression),
    required: false,
    pk: false,
    unique: false,
    generated: false,
    default: null,
    references: null,
    checkValues: [],
  });
  return true;
}

function parseConstraint(table, entry) {
  const normalized = entry.replace(/\s+/g, ' ').trim();
  const primaryMatch = normalized.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
  if (primaryMatch) {
    table.primaryKey = splitIdentifierList(primaryMatch[1]).map((part) => resolveConstraintColumn(table, part));
    for (const pkColumn of table.primaryKey) {
      const column = table.columns.get(pkColumn);
      if (column) column.pk = true;
    }
  }
  const uniqueMatch = normalized.match(/UNIQUE\s*\(([^)]+)\)/i);
  if (uniqueMatch) {
    table.uniqueGroups.push(splitIdentifierList(uniqueMatch[1]).map((part) => resolveConstraintColumn(table, part)));
  }
  const foreignMatch = normalized.match(/FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+("?[\w.]+"?)\s*\(([^)]+)\)/i);
  if (foreignMatch) {
    table.foreignKeys.push({
      columns: splitIdentifierList(foreignMatch[1]).map((part) => resolveConstraintColumn(table, part)),
      referencesTable: normalizeIdentifier(foreignMatch[2]),
      referencesColumns: splitIdentifierList(foreignMatch[3]).map((part) => normalizeIdentifier(part)),
    });
  }
}

function mergeColumn(table, column) {
  const existing = table.columns.get(column.name);
  if (!existing) {
    table.columns.set(column.name, column);
    return;
  }
  table.columns.set(column.name, {
    ...existing,
    ...column,
    pk: existing.pk || column.pk,
    unique: existing.unique || column.unique,
    required: existing.required || column.required,
    references: existing.references ?? column.references,
    checkValues: existing.checkValues?.length ? existing.checkValues : column.checkValues,
    default: existing.default ?? column.default,
  });
}

function parseCreateTableStatement(stmt, tables, migration) {
  const createMatch = stmt.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+("?[\w.]+"?)/i);
  if (!createMatch) return false;
  if (/\bPARTITION\s+OF\b/i.test(stmt)) return true;
  const tableName = normalizeIdentifier(createMatch[1]);
  const openParenIndex = stmt.indexOf('(', createMatch.index);
  const closeParenIndex = findMatching(stmt, openParenIndex, '(', ')');
  if (openParenIndex < 0 || closeParenIndex < 0) return true;
  const table = ensureTable(tables, tableName, migration);
  const body = stmt.slice(openParenIndex + 1, closeParenIndex);
  for (const entry of splitTopLevel(body)) {
    if (/^(CONSTRAINT|PRIMARY KEY|UNIQUE|FOREIGN KEY|CHECK|EXCLUDE)\b/i.test(entry)) {
      parseConstraint(table, entry);
      continue;
    }
    const column = parseColumnDefinition(entry);
    if (!column) continue;
    mergeColumn(table, column);
    if (column.references) {
      table.foreignKeys.push({
        columns: [column.name],
        referencesTable: column.references.table,
        referencesColumns: column.references.columns,
      });
    }
    if (column.pk && !table.primaryKey.includes(column.name)) table.primaryKey.push(column.name);
  }
  return true;
}

function parseAlterTableStatement(stmt, tables, migration) {
  const masked = maskSingleQuotedLiterals(stmt);
  const match = masked.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?("?[\w.]+"?)/i);
  if (!match) return false;
  if (!/\bADD\s+(?:COLUMN|CONSTRAINT|PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY)\b/i.test(masked)
      && !/\bALTER\s+(?:COLUMN\s+)?"?[\w]+"?\s+(?:SET\s+DATA\s+)?TYPE\b/i.test(masked)) {
    return true;
  }
  const tableName = normalizeIdentifier(match[1]);
  const table = ensureTable(tables, tableName, migration);
  const actionText = stmt.slice(match.index + match[0].length).trim();
  const clauses = splitTopLevel(actionText);
  for (const clause of clauses) {
    if (/^ADD\s+COLUMN\b/i.test(clause)) {
      const idempotentAdd = /^ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/i.test(clause);
      const normalized = clause.replace(/^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?/i, '');
      const column = parseColumnDefinition(normalized);
      if (!column) continue;
      if (idempotentAdd && table.columns.has(column.name)) continue;
      mergeColumn(table, column);
      if (column.references) {
        table.foreignKeys.push({
          columns: [column.name],
          referencesTable: column.references.table,
          referencesColumns: column.references.columns,
        });
      }
      continue;
    }
    if (parseAlterColumnTypeClause(table, clause)) {
      continue;
    }
    if (/^ADD\s+CONSTRAINT\b/i.test(clause) || /^ADD\s+FOREIGN KEY\b/i.test(clause) || /^ADD\s+PRIMARY KEY\b/i.test(clause) || /^ADD\s+UNIQUE\b/i.test(clause)) {
      parseConstraint(table, clause.replace(/^ADD\s+/i, ''));
    }
  }
  return true;
}

function parseCommentStatement(stmt, tables) {
  const match = stmt.match(/COMMENT\s+ON\s+COLUMN\s+("?[\w.]+"?)\.(("?[\w]+"?))\s+IS\s+'([\s\S]*)'$/i);
  if (!match) return false;
  const tableName = normalizeIdentifier(match[1]);
  const columnName = normalizeIdentifier(match[2]);
  const table = tables.get(tableName);
  if (!table) return true;
  table.comments.set(columnName, match[3].replace(/''/g, "'"));
  return true;
}

function parseDoBlock(stmt, tables, migration) {
  if (!/^DO\b/i.test(stmt)) return false;
  const tagMatch = stmt.match(/\$[A-Za-z0-9_]*\$/);
  if (!tagMatch) return true;
  const tag = tagMatch[0];
  const start = stmt.indexOf(tag) + tag.length;
  const end = stmt.lastIndexOf(tag);
  if (start < tag.length || end <= start) return true;
  const body = stmt.slice(start, end);
  for (const inner of splitStatements(body)) {
    parseStatement(inner, tables, migration);
  }
  return true;
}

function parseStatement(stmt, tables, migration) {
  if (parseDoBlock(stmt, tables, migration)) return;
  if (parseCreateTableStatement(stmt, tables, migration)) return;
  if (parseAlterTableStatement(stmt, tables, migration)) return;
  parseCommentStatement(stmt, tables);
}

function parseMigrations() {
  const tables = new Map();
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d{3}_.+\.sql$/i.test(file))
    .sort();
  for (const migrationFile of migrationFiles) {
    const raw = fs.readFileSync(path.join(migrationsDir, migrationFile), 'utf8');
    for (const stmt of splitStatements(raw)) {
      parseStatement(stmt, tables, migrationFile);
    }
  }
  return { migrationFiles, tables };
}

function inferFieldUiType(columnName, dbTypes = []) {
  const normalized = toSnakeCase(columnName);
  const type = dbTypes[0] ?? '';
  if (/^is_|flag$|enabled$|required$|active$/.test(normalized) || type.includes('BOOLEAN')) return 'boolean';
  if (/status|severity|priority|phase|state|result|type|classification|category|level|method|regime|reason_code/.test(normalized)) return 'select';
  if (/notes|description|summary|comment|analysis|history|content|payload|message/.test(normalized)) return 'textarea';
  if (/json|metadata/.test(normalized) || type.includes('JSON')) return 'json';
  if (/date$|_date|effective|expiry|due_date|valid_from|valid_to/.test(normalized) || type.includes('DATE')) return 'date';
  if (/_at$|timestamp|time$|_time|logged_at|recorded_at/.test(normalized) || type.includes('TIMESTAMP')) return 'datetime';
  if (/amount|cost|price|value|revenue|budget|claim|gain|depreciation/.test(normalized)) return 'currency';
  if (/pct|percent|ratio|yield|utilization|score/.test(normalized)) return 'percentage';
  if (/weight|kg/.test(normalized)) return 'weight';
  if (/pressure/.test(normalized)) return 'pressure';
  if (/temperature|temp/.test(normalized)) return 'temperature';
  if (/hours|minutes|duration|cycle_time|setup_time|run_time|downtime/.test(normalized)) return 'duration';
  if ((/qty|quantity|count|seq|line_number|sort_order/.test(normalized) || /INT|NUMERIC|DECIMAL|BIGINT|SMALLINT/.test(type)) && !type.startsWith('VARCHAR')) return 'number';
  if (/number$/.test(normalized) && type.startsWith('VARCHAR')) return 'string';
  if (/file|attachment|document|certificate|image|url|path/.test(normalized)) return 'file';
  if (normalized === 'id' || normalized.endsWith('_id')) return 'reference';
  return 'string';
}

function collectRegistryMaps() {
  const dataFields = readJson(path.join(registryDir, 'data-fields.json'));
  const domainFieldPacks = readJson(path.join(registryDir, 'domain-field-packs.json'));
  const apiParams = readJson(path.join(registryDir, 'api-params.json'));
  const endpointCatalog = readJson(path.join(registryDir, 'endpoint-catalog.json')).endpoints;
  const workflows = readJson(path.join(registryDir, 'workflow-library.json')).workflows;
  const statusOptions = readJson(path.join(registryDir, 'status-options.json'));
  const computedFormulas = readJson(path.join(registryDir, 'computed-formulas.json'));
  const relationMap = readJson(path.join(registryDir, 'relation-map.json'));
  const auditReport = readJson(path.join(docsDir, 'schema-field-audit-full.json'));

  const fieldByKey = new Map();
  const fieldByDbColumn = new Map();
  const fieldUsage = new Map();
  const requestUsage = new Map();

  const ingestField = (field, endpointKey) => {
    if (!field?.key) return;
    const key = field.key;
    if (!fieldByKey.has(key)) fieldByKey.set(key, []);
    fieldByKey.get(key).push({ endpointKey, field });
    if (field.dbColumn) {
      const dbColumn = toSnakeCase(field.dbColumn);
      if (!fieldByDbColumn.has(dbColumn)) fieldByDbColumn.set(dbColumn, []);
      fieldByDbColumn.get(dbColumn).push({ endpointKey, field });
    }
    if (!fieldUsage.has(key)) fieldUsage.set(key, new Set());
    fieldUsage.get(key).add(endpointKey);
  };

  for (const [endpointKey, fields] of Object.entries(dataFields)) {
    if (endpointKey === '_meta' || !Array.isArray(fields)) continue;
    for (const field of fields) ingestField(field, endpointKey);
  }

  const packEntries = domainFieldPacks.packs ?? domainFieldPacks;
  for (const [packKey, fields] of Object.entries(packEntries)) {
    if (!Array.isArray(fields)) continue;
    for (const field of fields) ingestField(field, `pack:${packKey}`);
  }

  for (const [endpointKey, descriptor] of Object.entries(apiParams)) {
    if (endpointKey === '_meta') continue;
    for (const param of descriptor.params ?? []) {
      if (!requestUsage.has(param.key)) requestUsage.set(param.key, new Set());
      requestUsage.get(param.key).add(endpointKey);
    }
  }

  return {
    dataFields,
    apiParams,
    endpointCatalog,
    workflows,
    statusOptions,
    computedFormulas,
    relationMap,
    auditReport,
    fieldByKey,
    fieldByDbColumn,
    fieldUsage,
    requestUsage,
  };
}

function buildStatusSignatures(statusOptions) {
  const signatures = new Map();
  for (const [key, entry] of Object.entries(statusOptions)) {
    if (key === '_meta' || !Array.isArray(entry?.options)) continue;
    const signature = entry.options.map((option) => option.value).join('|');
    if (!signatures.has(signature)) signatures.set(signature, []);
    signatures.get(signature).push(key);
  }
  return signatures;
}

function inferDomain(tableName, migration) {
  if (tableDomainOverrides[tableName]) return tableDomainOverrides[tableName];
  if (/^mes_/.test(tableName)) return 'mes_execution';
  if (/^ai_/.test(tableName)) return 'ai_predictive';
  if (/^pm_/.test(tableName)) return 'plant_maintenance';
  if (/^aps_/.test(tableName)) return 'advanced_planning';
  if (/^plm_/.test(tableName)) return 'plm_change_control';
  if (/^hcm_/.test(tableName)) return 'hcm_workforce';
  if (/^wms_/.test(tableName)) return 'warehouse_management';
  if (/^fin_/.test(tableName)) return migration === '051_finance_trade_multicurrency.sql' ? 'finance_extended' : 'finance_treasury';
  if (/^prj_/.test(tableName)) return 'project_management';
  if (/^crm_/.test(tableName)) return 'crm';
  if (/^tms_/.test(tableName)) return 'transportation';
  if (/^dw_/.test(tableName)) return 'bi_datawarehouse';
  if (/^srm_/.test(tableName)) return 'supplier_relationship';
  if (/^tooling_/.test(tableName) || /^fixture_/.test(tableName)) return 'tooling_lifecycle';
  if (/^sop_/.test(tableName) || /^demand_/.test(tableName) || /^inventory_buffer_/.test(tableName) || /^supply_replenishment_/.test(tableName)) return 'demand_supply_planning';
  if (/^svc_/.test(tableName)) return 'service_warranty';
  if (/^qual_/.test(tableName)) return 'quality_lab';
  if (/^ehs_/.test(tableName)) return 'ehs_sustainability';
  if (/^eng_/.test(tableName)) return 'mfg_engineering';
  if (/^mdm_/.test(tableName)) return 'master_data_governance';
  if (/^com_/.test(tableName)) return 'commercial_contracts';
  if (/^trace_/.test(tableName)) return 'traceability_serialization';
  if (/^osc_/.test(tableName)) return 'outsource_execution';
  if (/^trade_/.test(tableName)) return 'trade_compliance';
  if (/^calibration_/.test(tableName)) return 'calibration_equipment';
  if (/^lean_/.test(tableName)) return 'lean_manufacturing';
  if (/^org_/.test(tableName)) return 'foundation_governance';
  if (/^retention_/.test(tableName) || /^source_system_/.test(tableName) || /^data_archival_/.test(tableName)) return 'master_data_governance';
  if (/^integration_/.test(tableName)) return 'system_infrastructure';
  return migrationDomainDefaults.get(migration) ?? null;
}

function inferMesSubdomain(tableName) {
  for (const [subdomain, tables] of Object.entries(mesSubdomains)) {
    if (tables.has(tableName)) return subdomain;
  }
  return 'mes_execution';
}

function inferSupportTable(tableName) {
  if (nonSupportTableNameOverrides.has(tableName)) return false;
  return supportTableNamePatterns.some((pattern) => pattern.test(tableName));
}

function singularizeTable(tableName) {
  if (tableName.endsWith('ies')) return tableName.slice(0, -3) + 'y';
  if (tableName.endsWith('ses')) return tableName.slice(0, -2);
  if (tableName.endsWith('s') && !tableName.endsWith('ss')) return tableName.slice(0, -1);
  return tableName;
}

function hasWorkflowSignal(tableName, table) {
  const key = String(tableName || '').trim().toLowerCase();
  const excludedLifecycleCandidates = new Set([
    'alarm_state',
    'machine_state',
    'state_name',
    'state_since',
    'state_duration_sec',
    'e10_state',
    'e10_substate',
    'current_e10_state',
    'current_e10_substate',
  ]);
  const nonLifecycleRecords = /(event|snapshot|history|result|results|trail|log|line|package|stop|dim|fact|telemetry|queue|bucket|note|view)$/.test(key)
    || /(monitoring|scorecard|study|review|analysis|matrix|rating|trend)/.test(key);
  if (nonLifecycleRecords) return false;
  const columnNames = [...(table?.columns?.keys?.() || [])].map((name) => String(name || '').trim().toLowerCase());
  return columnNames.some((name) =>
    name === 'status' ||
    name === 'status_code' ||
    name === 'approval_state' ||
    name === 'lifecycle_state' ||
    name === 'workflow_state' ||
    name === 'current_state' ||
    name === 'release_state' ||
    name.endsWith('_status') ||
    (name.endsWith('_state') && !excludedLifecycleCandidates.has(name) && !name.includes('substate'))
  );
}

function inferWorkflowId(tableName, table, supportTable) {
  const overrides = {
    quotes: 'wf_quote_lifecycle',
    quote_history: 'wf_quote_lifecycle',
    items: 'wf_items',
    sales_orders: 'wf_sales_order',
    sales_order_lines: 'wf_sales_order',
    job_orders: 'wf_job_order',
    job_operations: 'wf_production_operation',
    purchase_orders: 'wf_purchase_order',
    purchase_order_lines: 'wf_purchase_order',
    warehouses: 'wf_warehouse',
    work_orders: 'wf_work_order_execution',
    incoming_inspections: 'wf_receiving_inspection',
    incoming_inspection_results: null,
    ncr_records: 'wf_ncr',
    capa_records: 'wf_capa',
    fai_records: 'wf_fai',
    documents: 'wf_document_change_control',
    document_versions: 'wf_document_change_control',
    training_records: 'wf_training_qualification',
    shipments: 'wf_shipment_release',
    shipment_releases: 'wf_shipment_release',
    tools: 'wf_tool_life',
    supplier_scorecards: null,
    form_entries: 'wf_form_submission',
    records: 'wf_record_lifecycle',
    cnc_programs: 'wf_cnc_program_approval',
    cnc_program_versions: 'wf_cnc_program_approval',
    cnc_program_approvals: 'wf_cnc_program_approval',
    product_passports: 'wf_product_passport',
    passport_events: 'wf_product_passport',
    fmea_records: 'wf_fmea',
    fmea_failure_modes: 'wf_fmea',
    fmea_actions: 'wf_fmea',
    control_plans: 'wf_fmea',
    apqp_projects: 'wf_apqp_project',
    apqp_gate_reviews: 'wf_apqp_project',
    ppap_submissions: 'wf_ppap_submission',
    mobile_work_queue: 'wf_mobile_task',
    mobile_time_entries: 'wf_mobile_task',
    mobile_inspection_captures: 'wf_mobile_task',
    pm_work_orders: 'wf_pm_work_order',
    pm_maintenance_plans: 'wf_pm_maintenance_plan',
    aps_planning_scenarios: 'wf_aps_scenario',
    plm_change_requests: 'wf_plm_change_request',
    plm_change_orders: 'wf_plm_change_order',
    wms_transfer_orders: 'wf_wms_transfer_order',
    wms_pick_lists: 'wf_wms_pick_list',
    prj_projects: 'wf_project_execution',
    prj_change_requests: 'wf_project_change_request',
    crm_opportunities: 'wf_crm_opportunity',
    crm_campaigns: 'wf_crm_campaign',
    tms_shipments: 'wf_tms_shipment',
    tms_freight_audits: 'wf_freight_audit',
    dw_etl_runs: 'wf_dw_etl_run',
    srm_supplier_action_requests: 'wf_supplier_action_request',
    tooling_life_limits: 'wf_tool_life',
    sop_meeting_cycles: 'wf_sop_cycle',
    svc_service_requests: 'wf_service_request',
    svc_warranty_claims: 'wf_warranty_claim',
    fin_bank_reconciliations: 'wf_treasury_close',
    qual_compliance_obligations: 'wf_quality_obligation',
    qual_sample_batches: 'wf_quality_lab_case',
    ehs_corrective_actions: 'wf_ehs_corrective_action',
    ehs_sustainability_projects: 'wf_ehs_incident',
    eng_work_instructions: 'wf_work_instruction_release',
    mdm_governance_issues: 'wf_mdm_governance',
    com_contracts: 'wf_contract_lifecycle',
    com_order_promises: 'wf_order_promise',
    trace_recall_campaigns: 'wf_traceability_recall',
    trace_job_travelers: 'wf_traceability_traveler',
    osc_dispatch_batches: 'wf_outsource_dispatch',
    osc_supplier_receipts: 'wf_outsource_receipt',
    trade_screening_hits: 'wf_trade_screening',
    trade_compliance_audits: 'wf_trade_compliance_audit',
    quality_predictions: 'wf_predictive_quality',
    prediction_models: 'wf_predictive_quality',
    ncr_mrb_decisions: 'wf_ncr',
    ncr_human_factors: 'wf_ncr',
    capa_8d_steps: 'wf_capa',
    capa_effectiveness_checks: 'wf_capa',
    audit_program: 'wf_audit_program',
    capa: 'wf_capa',
    calibration_oot_investigations: 'wf_calibration_control',
    calibration_grr_studies: null,
    dispatch_queue: null,
    mes_dispatch_queue: 'wf_mes_dispatch_queue',
    freight_order_stops: null,
    inventory_valuations: null,
    lean_kaizen_events: 'wf_lean_kaizen',
    lean_qrqc_events: 'wf_lean_qrqc',
    lean_andon_events: 'wf_lean_andon',
    lean_5s_audits: 'wf_lean_5s_audit',
    lean_gemba_walks: 'wf_lean_gemba_walk',
    lean_smed_events: 'wf_lean_smed',
    lean_tier_meetings: 'wf_lean_tier_meeting',
    lean_tier_escalations: 'wf_lean_tier_meeting',
    nonconformance: 'wf_ncr',
    oqc_inspections: 'wf_oqc_inspection',
    qual_effectiveness_reviews: null,
    safety_observation_actions: null,
  };
  if (Object.prototype.hasOwnProperty.call(overrides, tableName)) return overrides[tableName];
  if (supportTable) return null;
  if (!hasWorkflowSignal(tableName, table)) return null;
  const singular = singularizeTable(tableName);
  return `wf_${singular}`;
}

function inferStatusColumn(table) {
  const explicitOverrides = {
    audit_program: 'status_code',
    oqc_inspections: 'result',
    supplier_quality_case: 'status_code',
  };
  const explicitColumn = explicitOverrides[table.tableName];
  if (explicitColumn && table.columns.has(explicitColumn)) {
    return table.columns.get(explicitColumn);
  }
  const candidates = [...table.columns.values()].filter((column) =>
    column.name === 'status' ||
    column.name === 'status_code' ||
    column.name === 'approval_state' ||
    column.name === 'lifecycle_state' ||
    column.name === 'workflow_state' ||
    column.name === 'current_state' ||
    column.name === 'release_state' ||
    column.name.endsWith('_status') ||
    (
      column.name.endsWith('_state')
      && !['alarm_state', 'machine_state', 'state_name', 'state_since', 'state_duration_sec', 'e10_state', 'e10_substate', 'current_e10_state', 'current_e10_substate'].includes(column.name)
      && !column.name.includes('substate')
    )
  );
  if (!candidates.length) return null;
  const priority = new Map([
    ['status', 0],
    ['status_code', 1],
    ['workflow_state', 2],
    ['lifecycle_state', 3],
    ['approval_state', 4],
    ['current_state', 5],
    ['release_state', 6],
  ]);
  candidates.sort((left, right) => {
    const leftPriority = priority.has(left.name) ? priority.get(left.name) : 50;
    const rightPriority = priority.has(right.name) ? priority.get(right.name) : 50;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.name.length - right.name.length || left.name.localeCompare(right.name);
  });
  return candidates[0];
}

function inferStatusSet(table, statusOptions, statusSignatures, workflowId) {
  const statusColumn = inferStatusColumn(table);
  if (!statusColumn) return null;
  const explicitOverride = {
    documents: 'doc_status',
    sales_orders: 'sales_order_status',
    job_orders: 'job_order_status',
    purchase_orders: 'purchase_order_status',
    incoming_inspections: 'incoming_inspection_status',
    supplier_scorecards: 'supplier_scorecard_status',
    scar_records: 'scar_status',
    portal_users: 'customer_portal_user_status',
    cnc_programs: 'cnc_program_status',
    product_passports: 'dpp_status',
    fmea_records: 'fmea_status',
    fmea_actions: 'fmea_action_status',
    control_plans: 'control_plan_status',
    apqp_projects: 'apqp_project_status',
    apqp_gate_reviews: 'apqp_gate_status',
    customer_complaints: 'complaint_status',
    deviations: 'exception_status',
    concessions: 'exception_status',
    mes_dispatch_queue: 'mes_dispatch_queue_queue_status_set',
    oqc_inspections: 'oqc_inspections_result_status',
    quality_predictions: 'validation',
    pm_work_orders: 'maintenance_order',
    pm_work_order_operations: 'maintenance_order',
    audit_program: 'supplier_audit_status',
    supplier_quality_case: 'supplier_quality_case_status_code',
  };
  if (explicitOverride[table.tableName]) return explicitOverride[table.tableName];

  const valueSignature = statusColumn.checkValues?.length ? statusColumn.checkValues.join('|') : null;
  if (valueSignature && statusSignatures.has(valueSignature)) {
    return statusSignatures.get(valueSignature)[0];
  }

  const candidates = [
    statusColumn.name,
    `${singularizeTable(table.tableName)}_${statusColumn.name}`,
    `${table.tableName}_${statusColumn.name}`,
    `${singularizeTable(table.tableName)}_status`,
    `${table.tableName}_status`,
    singularizeTable(table.tableName),
    workflowId ? workflowId.replace(/^wf_/, '') : null,
    workflowId ? `${workflowId.replace(/^wf_/, '')}_status` : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (statusOptions[candidate]) return candidate;
    if (statusOptions[toSnakeCase(candidate)]) return toSnakeCase(candidate);
  }

  if (statusColumn.name.endsWith('_status') && statusOptions[statusColumn.name]) return statusColumn.name;
  return 'digital_thread_status';
}

function chooseColumnLabels(columnName, fieldByKey, fieldByDbColumn) {
  if (labelOverridesV2[columnName]) {
    return {
      label: labelOverridesV2[columnName],
      labelEn: englishLabelFromKey(columnName),
    };
  }
  const dbFields = fieldByDbColumn.get(columnName) ?? [];
  const dbFieldLabels = new Set(dbFields.map((entry) => `${entry.field.label}|${entry.field.labelEn}`));
  if (dbFields.length === 1 || dbFieldLabels.size === 1) {
    const dbField = dbFields[0]?.field;
    if (dbField) {
      const candidateLabel = dbField.label;
      return {
        label: candidateLabel && !isLikelyEnglishOnlyLabel(candidateLabel) ? candidateLabel : vietnameseLabelFromKeyV2(columnName),
        labelEn: dbField.labelEn || englishLabelFromKey(columnName),
      };
    }
  }
  const directFields = fieldByKey.get(columnName) ?? [];
  const directLabels = new Set(directFields.map((entry) => `${entry.field.label}|${entry.field.labelEn}`));
  if (ambiguousGenericColumns.has(columnName)) {
    return {
      label: vietnameseLabelFromKeyV2(columnName),
      labelEn: englishLabelFromKey(columnName),
    };
  }
  if (directFields.length === 1 || directLabels.size === 1) {
    const directField = directFields[0]?.field;
    if (directField) {
      const candidateLabel = directField.label;
      return {
        label: candidateLabel && !isLikelyEnglishOnlyLabel(candidateLabel) ? candidateLabel : vietnameseLabelFromKeyV2(columnName),
        labelEn: directField.labelEn || englishLabelFromKey(columnName),
      };
    }
  }
  if (dbFields.length > 1 || directFields.length > 1) {
    return {
      label: vietnameseLabelFromKeyV2(columnName),
      labelEn: englishLabelFromKey(columnName),
    };
  }
  return {
    label: vietnameseLabelFromKeyV2(columnName),
    labelEn: englishLabelFromKey(columnName),
  };
}

function buildForeignKeyIndex(tables) {
  const incoming = new Map();
  for (const table of tables.values()) {
    for (const fk of table.foreignKeys) {
      if (!incoming.has(fk.referencesTable)) incoming.set(fk.referencesTable, []);
      incoming.get(fk.referencesTable).push({
        table: table.tableName,
        columns: fk.columns,
        referencesColumns: fk.referencesColumns,
      });
    }
  }
  return incoming;
}

function buildTableDescription(tableName, domain) {
  const singular = singularizeTable(tableName);
  const readable = englishLabelFromKey(singular);
  const domainLabel = domainDefinitions[domain]?.labelEn ?? englishLabelFromKey(domain);
  if (/_lines?$/.test(tableName)) return `${readable} line-level records supporting ${domainLabel} transactions.`;
  if (/_items?$/.test(tableName)) return `${readable} item-level records supporting ${domainLabel} execution.`;
  if (/_results?$/.test(tableName)) return `${readable} outcome records supporting ${domainLabel} evidence and traceability.`;
  if (/_events?$/.test(tableName)) return `${readable} event records supporting ${domainLabel} digital thread visibility.`;
  if (/_snapshots?$/.test(tableName)) return `${readable} snapshot records supporting ${domainLabel} analytics and historical review.`;
  if (/_history$/.test(tableName)) return `${readable} history records supporting ${domainLabel} auditability.`;
  if (/_master$/.test(tableName)) return `${readable} master records supporting ${domainLabel} reference control.`;
  if (/_plans?$/.test(tableName)) return `${readable} planning records supporting ${domainLabel} orchestration.`;
  if (/_reviews?$/.test(tableName)) return `${readable} review records supporting ${domainLabel} approvals and governance.`;
  return `${readable} records supporting ${domainLabel} business processes.`;
}

function buildTableRegistry(parsed, registryMaps) {
  const statusSignatures = buildStatusSignatures(registryMaps.statusOptions);
  const incomingIndex = buildForeignKeyIndex(parsed.tables);
  const domainMembers = new Map();
  const tableRegistry = {};

  for (const table of [...parsed.tables.values()].sort((left, right) => left.tableName.localeCompare(right.tableName))) {
    const domain = inferDomain(table.tableName, table.migration);
    if (!domain) throw new Error(`Unable to map domain for table ${table.tableName}`);
    if (!domainMembers.has(domain)) domainMembers.set(domain, []);
    domainMembers.get(domain).push(table.tableName);

    const subDomain = domain === 'mes_execution' ? inferMesSubdomain(table.tableName) : null;
    const supportTable = inferSupportTable(table.tableName);
    const workflowId = inferWorkflowId(table.tableName, table, supportTable);
    const statusColumn = inferStatusColumn(table);
    const statusSet = statusColumn ? inferStatusSet(table, registryMaps.statusOptions, statusSignatures, workflowId) : null;

    const columns = {};
    for (const column of [...table.columns.values()].sort((left, right) => left.name.localeCompare(right.name))) {
      const labels = chooseColumnLabels(column.name, registryMaps.fieldByKey, registryMaps.fieldByDbColumn);
      columns[column.name] = {
        type: column.type,
        label: labels.label,
        labelEn: labels.labelEn,
        required: column.required,
        pk: Boolean(column.pk),
        unique: Boolean(column.unique),
        generated: Boolean(column.generated),
        default: column.default,
        uiType: column.references ? 'reference' : inferFieldUiType(column.name, [column.type]),
        references: column.references ? `${column.references.table}.${column.references.columns.join(',')}` : null,
        description: table.comments.get(column.name) ?? null,
      };
    }

    const upstream = new Set(table.foreignKeys.map((fk) => fk.referencesTable));
    const downstream = new Set((incomingIndex.get(table.tableName) ?? []).map((entry) => entry.table));

    tableRegistry[table.tableName] = {
      domain,
      ...(subDomain ? { subDomain } : {}),
      migration: table.migration,
      label: vietnameseTableLabelFromKey(table.tableName),
      labelEn: englishLabelFromKey(table.tableName),
      description: buildTableDescription(table.tableName, domain),
      primaryKey: table.primaryKey.length <= 1 ? table.primaryKey[0] ?? null : table.primaryKey,
      statusColumn: statusColumn?.name ?? null,
      statusSet,
      workflowId,
      supportTable,
      columnCount: table.columns.size,
      columns,
      foreignKeys: table.foreignKeys.map((fk) => ({
        column: fk.columns.length === 1 ? fk.columns[0] : fk.columns,
        references: `${fk.referencesTable}.${fk.referencesColumns.join(',')}`,
        label: fk.columns.length === 1 ? vietnameseLabelFromKeyV2(fk.columns[0]) : vietnameseLabelFromKeyV2(fk.columns.join('_')),
      })),
      digitalThread: {
        upstream: [...upstream].sort(),
        downstream: [...downstream].sort(),
      },
    };
  }

  const domainSummary = {};
  for (const [domainKey, definition] of Object.entries(domainDefinitions)) {
    const tables = (domainMembers.get(domainKey) ?? []).sort();
    domainSummary[domainKey] = {
      label: definition.label,
      labelEn: definition.labelEn,
      icon: definition.icon,
      color: definition.color,
      description: definition.description,
      tables,
      workflows: definition.workflowPlan,
      relatedDomains: [],
      supportDomain: definition.supportDomain,
    };
  }

  return { tableRegistry, domainSummary };
}

function buildDomainArchitecture(parsed, tableRegistry) {
  const domainTables = new Map();
  const domainWorkflows = new Map();
  const upstreamDomains = new Map();
  const downstreamDomains = new Map();

  for (const [tableName, descriptor] of Object.entries(tableRegistry)) {
    if (!domainTables.has(descriptor.domain)) domainTables.set(descriptor.domain, []);
    domainTables.get(descriptor.domain).push(tableName);
    if (descriptor.workflowId) {
      if (!domainWorkflows.has(descriptor.domain)) domainWorkflows.set(descriptor.domain, new Set());
      domainWorkflows.get(descriptor.domain).add(descriptor.workflowId);
    }
  }

  for (const table of parsed.tables.values()) {
    const fromDomain = tableRegistry[table.tableName].domain;
    for (const fk of table.foreignKeys) {
      const target = tableRegistry[fk.referencesTable];
      if (!target) continue;
      const toDomain = target.domain;
      if (fromDomain === toDomain) continue;
      if (!upstreamDomains.has(fromDomain)) upstreamDomains.set(fromDomain, new Set());
      if (!downstreamDomains.has(toDomain)) downstreamDomains.set(toDomain, new Set());
      upstreamDomains.get(fromDomain).add(toDomain);
      downstreamDomains.get(toDomain).add(fromDomain);
    }
  }

  const domains = {};
  for (const [domainKey, definition] of Object.entries(domainDefinitions)) {
    const tables = (domainTables.get(domainKey) ?? []).sort();
    const workflows = [...(domainWorkflows.get(domainKey) ?? new Set(definition.workflowPlan))];
    const subDomains =
      domainKey === 'mes_execution'
        ? Object.fromEntries(
            Object.entries(mesSubdomains).map(([subdomain, members]) => [
              subdomain,
              {
                label: vietnameseLabelFromKeyV2(subdomain),
                labelEn: englishLabelFromKey(subdomain),
                tables: [...members].filter((tableName) => tableRegistry[tableName]).sort(),
              },
            ]),
          )
        : undefined;
    domains[domainKey] = {
      label: definition.label,
      labelEn: definition.labelEn,
      icon: definition.icon,
      color: definition.color,
      description: definition.description,
      businessProcess: definition.businessProcess,
      tables,
      primaryWorkflows: workflows,
      upstreamDomains: [...(upstreamDomains.get(domainKey) ?? [])].sort(),
      downstreamDomains: [...(downstreamDomains.get(domainKey) ?? [])].sort(),
      supportDomain: definition.supportDomain,
      ...(subDomains ? { subDomains } : {}),
    };
  }

  return {
    _meta: {
      version: '1.0',
      generatedAt,
      domainCount: Object.keys(domainDefinitions).length,
      tableCount: Object.keys(tableRegistry).length,
      description: 'Domain architecture map for HESEM QMS Portal aligned to SAP, Epicor, IFS, Oracle, and Dynamics patterns.',
      researchReferences,
      benchmarkPatterns: {
        sap_s4hana: {
          modules: ['PP', 'QM', 'PM', 'MM', 'SD', 'FI', 'CO', 'PS', 'HCM'],
          namingConvention: 'Short, stable technical table names with language text tables and status profiles.',
          linkPattern: 'Normalized transactional model with strong integration across logistics and finance objects.',
          auditPattern: 'System status, user status, change documents, and language-dependent text tables.',
          multilingualPattern: 'Text tables keyed by language and often by business object key.',
        },
        epicor_kinetic: {
          modules: ['Part', 'Job', 'PO', 'SO', 'Quality', 'Inspection', 'APS', 'WMS'],
          namingConvention: 'Business-object naming around parts, jobs, operations, suppliers, and order flows.',
          linkPattern: 'Normalized operational entities with execution and traceability records around job/part flow.',
          auditPattern: 'Execution history, operator trace, and approval records around shop-floor objects.',
          multilingualPattern: 'Localized UI metadata with business-object centric labels rather than text-table-heavy design.',
        },
        ifs_cloud: {
          modules: ['Manufacturing', 'Supply Chain', 'Asset', 'Projects', 'Finance', 'HR', 'Service'],
          namingConvention: 'Bounded logical units exposed via projections that implement defined business functions.',
          linkPattern: 'DDD-like logical units and projections instead of a monolithic API surface.',
          auditPattern: 'Persistent custom attributes on logical units plus permissioned projection access.',
          multilingualPattern: 'Translation Manager and field-description translations over logical units and custom objects.',
        },
        oracle_fusion: {
          modules: ['Product Management', 'Quality', 'Manufacturing', 'SCM', 'Financials'],
          namingConvention: 'Business objects backed by base tables, translation tables (_TL), and extensible flexfields.',
          linkPattern: 'Business-object-centric normalized core with WHO columns and translation tables.',
          auditPattern: 'WHO columns such as CREATED_BY, CREATION_DATE, LAST_UPDATED_BY, LAST_UPDATE_DATE.',
          multilingualPattern: 'Translation tables keyed by LANGUAGE and SOURCE_LANG for translatable attributes.',
        },
        dynamics_365: {
          modules: ['Dataverse tables', 'Virtual tables', 'Supply Chain entities'],
          namingConvention: 'SchemaName + logical name + localized DisplayName/DisplayCollectionName.',
          linkPattern: 'Metadata-driven tables with lookup columns and optional virtual-table federation.',
          auditPattern: 'CreatedBy, CreatedOn, ModifiedBy, ModifiedOn as standard system-managed fields.',
          multilingualPattern: 'LocalizedLabels on metadata objects and label merge semantics by language code.',
        },
      },
    },
    domains,
  };
}

function buildFieldEntityFrequency(registryMaps) {
  const fieldEntityFrequency = new Map();
  for (const [fieldKey, endpointSet] of registryMaps.fieldUsage.entries()) {
    const counter = new Map();
    for (const endpointKey of endpointSet) {
      const endpoint = registryMaps.endpointCatalog[endpointKey];
      const entity = endpoint?.entity ? toSnakeCase(endpoint.entity) : null;
      if (!entity) continue;
      counter.set(entity, (counter.get(entity) ?? 0) + 1);
    }
    fieldEntityFrequency.set(fieldKey, counter);
  }
  return fieldEntityFrequency;
}

function chooseSuggestedTable(fieldKey, fieldEntityFrequency) {
  const entityCounter = fieldEntityFrequency.get(fieldKey);
  if (entityCounter?.size) {
    const [entity] = [...entityCounter.entries()].sort((left, right) => right[1] - left[1])[0];
    if (entityPrimaryTable[entity]) return entityPrimaryTable[entity];
  }

  const normalized = toSnakeCase(fieldKey);
  if (/quote|quoted|quotation/.test(normalized)) return /line|item|part|qty|quantity|price|cost/.test(normalized) ? 'quote_lines' : 'quotes';
  if (/sales_order|so_|customer_po|ship_to|delivery|promise/.test(normalized)) return 'sales_orders';
  if (/job_|jo_|routing|bom|work_center|capacity_hours|launch/.test(normalized)) return 'job_orders';
  if (/operation|cycle_time|setup|dispatch/.test(normalized)) return 'job_operations';
  if (/supplier|vendor|incoming|scar|skip_lot/.test(normalized)) return 'supplier_scorecards';
  if (/inspection|aql|sample/.test(normalized)) return 'incoming_inspections';
  if (/ncr|capa|containment|root_cause/.test(normalized)) return normalized.includes('capa') ? 'capa_records' : 'ncr_records';
  if (/fai|as9102/.test(normalized)) return 'fai_records';
  if (/shipment|packing|export|customs/.test(normalized)) return 'shipments';
  if (/program|setup_sheet/.test(normalized)) return 'cnc_programs';
  if (/fmea|control_plan|apqp|ppap/.test(normalized)) return 'fmea_records';
  if (/project|milestone|wbs/.test(normalized)) return 'prj_projects';
  if (/lead|opportunity|campaign/.test(normalized)) return 'crm_opportunities';
  return null;
}

function inferMissingColumnType(fieldKey, fieldDefinitions) {
  const definition = fieldDefinitions.get(fieldKey)?.[0]?.field;
  if (definition?.type) {
    const kind = definition.type.toLowerCase();
    if (['number', 'currency', 'percentage', 'weight', 'duration'].includes(kind)) return 'NUMERIC(14,4)';
    if (kind === 'boolean') return 'BOOLEAN';
    if (kind === 'date') return 'DATE';
    if (kind === 'datetime') return 'TIMESTAMPTZ';
    if (kind === 'json') return 'JSONB';
    if (kind === 'textarea') return 'TEXT';
  }
  const normalized = toSnakeCase(fieldKey);
  if (/_id$/.test(normalized)) return 'UUID';
  if (/date$|_date/.test(normalized)) return 'DATE';
  if (/_at$|timestamp|time$/.test(normalized)) return 'TIMESTAMPTZ';
  if (/qty|quantity|hours|cost|price|amount|value|pct|percent|rate|score|load|confidence|wear/.test(normalized)) return 'NUMERIC(14,4)';
  if (/flag|required|active|approved|completed|closed|valid/.test(normalized)) return 'BOOLEAN';
  if (/notes|description|summary|analysis|content|comment|breakdown/.test(normalized)) return 'TEXT';
  if (/list|data|assignments|approvals|checklist|changes|log|charts/.test(normalized)) return 'JSONB';
  return 'VARCHAR(255)';
}

function classifyOrphanFields(registryMaps) {
  const orphanFieldKeys = registryMaps.auditReport.orphan_fields.genuine;
  const fieldEntityFrequency = buildFieldEntityFrequency(registryMaps);
  const computed = [];
  const joined = [];
  const apiParam = [];
  const aggregate = [];
  const missingColumn = [];
  const shouldRemove = [];

  for (const fieldKey of orphanFieldKeys) {
    const normalized = toSnakeCase(fieldKey);
    const usageCount = registryMaps.fieldUsage.get(fieldKey)?.size ?? 0;
    const requestCount = registryMaps.requestUsage.get(fieldKey)?.size ?? 0;
    const totalEndpoints = usageCount + requestCount;

    const metricLike = /^(avg_|total_|count_|sum_|min_|max_|trend_|ratio_|variance_|delta_|accuracy_|completion_|conversion_|backlog_|book_to_bill_|buy_to_fly|confidence$|cost_per_|cycle_time$|capacity$|yield_|current_counter$|current_wear_pct$)|(_trend$)/.test(normalized);
    const aggregateLike = /(count$|_count$|_this_week$|_this_month$|_today$|_open$|_closed$|_pending$|_overdue$|_backlog$|by_|breakdown|charts$|alerts_this_|anomalies_this_|completed_today$|cost_month$)/.test(normalized);
    const joinedLike = /(_name(_|$)|_email$|_phone$|_role$|_dept$|_number$|_status$|customer_po$|contact_person$|auditor$|actor$|custody_owner$|current_user_)/.test(normalized);
    const apiLike = apiParamHints.has(normalized) || /^(before_head|after_head|branch|api|code|commit_output|commit_date|browser_language|auth_expired|issuer|initialized|pending_expires_in)$/.test(normalized);
    const persistenceLike = /(_type$|_status$|_date$|_number$|_ref$|_flag$|_code$|_id$|_reason$|_category$|_level$|_method$|_outcome$)/.test(normalized);

    if (apiLike) {
      apiParam.push({
        key: fieldKey,
        endpoints: totalEndpoints,
        reason: 'Appears as API/runtime parameter rather than persisted business data.',
      });
      continue;
    }
    if (metricLike) {
      computed.push({
        key: fieldKey,
        endpoints: totalEndpoints,
        formulaHint: registryMaps.computedFormulas[fieldKey]?.formula ?? null,
        reason: 'Behaves like a KPI/derived measure and is better modeled as runtime or analytics formula.',
      });
      continue;
    }
    if (aggregateLike) {
      aggregate.push({
        key: fieldKey,
        endpoints: totalEndpoints,
        reason: 'Behaves like an aggregate/dashboard measure rather than a persisted base attribute.',
      });
      continue;
    }
    if (joinedLike) {
      const suggestedTable = chooseSuggestedTable(fieldKey, fieldEntityFrequency);
      joined.push({
        key: fieldKey,
        sourceTable: suggestedTable,
        sourceColumn: normalized.replace(/_name(_.*)?$/, '_id').replace(/_email$/, '_email').replace(/_phone$/, '_phone').replace(/_number$/, '_number'),
        joinVia: normalized.endsWith('_name') ? normalized.replace(/_name$/, '_id') : null,
      });
      continue;
    }

    const suggestedTable = chooseSuggestedTable(fieldKey, fieldEntityFrequency);
    if (suggestedTable && (totalEndpoints >= 2 || persistenceLike)) {
      missingColumn.push({
        key: fieldKey,
        suggestedTable,
        type: inferMissingColumnType(fieldKey, registryMaps.fieldByKey),
        reason: `Used in ${Math.max(totalEndpoints, 1)} endpoint(s) and behaves like a persistent ${englishLabelFromKey(fieldKey)} attribute aligned with ERP/MES/QMS object modeling.`,
      });
      continue;
    }

    if (persistenceLike && totalEndpoints >= 1) {
      missingColumn.push({
        key: fieldKey,
        suggestedTable: suggestedTable ?? 'records',
        type: inferMissingColumnType(fieldKey, registryMaps.fieldByKey),
        reason: `Field name implies a persisted business attribute and it appears in ${Math.max(totalEndpoints, 1)} endpoint(s), so it should map to a real column or an explicit computed rule.`,
      });
      continue;
    }

    if (totalEndpoints <= 1 || /^(blockcount|breakdown|changes|changed_files|approvals|assignments|checklist|comment|comment_text|content|completed|count)$/.test(normalized)) {
      shouldRemove.push({
        key: fieldKey,
        reason: 'Low evidence of persistence or appears to be UI/transient presentation data.',
      });
      continue;
    }

    missingColumn.push({
      key: fieldKey,
      suggestedTable: suggestedTable ?? 'records',
      type: inferMissingColumnType(fieldKey, registryMaps.fieldByKey),
      reason: `Conservative persistence recommendation because the field appears across ${Math.max(totalEndpoints, 1)} endpoint(s) and is not credibly explainable as runtime-only data.`,
    });
  }

  const total = computed.length + joined.length + apiParam.length + aggregate.length + missingColumn.length + shouldRemove.length;
  if (total !== orphanFieldKeys.length) {
    throw new Error(`Orphan field classification mismatch: expected ${orphanFieldKeys.length}, got ${total}`);
  }

  return {
    orphan_fields: {
      computed: {
        description: 'Tính toán runtime, công thức phân tích hoặc KPI không cần DB column vật lý.',
        count: computed.length,
        fields: computed,
      },
      joined: {
        description: 'Lấy từ JOIN/lookup qua bảng khác, không cần lặp lại ở bảng đích.',
        count: joined.length,
        fields: joined,
      },
      api_param: {
        description: 'Tham số API hoặc runtime context, không phải dữ liệu nghiệp vụ cần persist.',
        count: apiParam.length,
        fields: apiParam,
      },
      aggregate: {
        description: 'Dashboard count/sum/rate hoặc snapshot tổng hợp, nên tính từ query/materialized view.',
        count: aggregate.length,
        fields: aggregate,
      },
      missing_column: {
        description: 'Field hợp lệ nhưng DB đang thiếu cột vật lý hoặc cần persisted attribute.',
        count: missingColumn.length,
        fields: missingColumn,
      },
      should_remove: {
        description: 'Thiếu bằng chứng nghiệp vụ/persistence; nên loại khỏi registry nếu không có consumer thực sự.',
        count: shouldRemove.length,
        fields: shouldRemove,
      },
    },
  };
}

function buildColumnIndex(parsed, registryMaps) {
  const fieldKeys = new Set(registryMaps.fieldByKey.keys());
  const uniqueColumns = new Map();
  for (const table of parsed.tables.values()) {
    for (const columnName of table.columns.keys()) {
      if (!uniqueColumns.has(columnName)) {
        uniqueColumns.set(columnName, {
          name: columnName,
          tables: new Set(),
          dbTypes: new Set(),
          pk: false,
          fk: false,
          generated: false,
        });
      }
      const entry = uniqueColumns.get(columnName);
      entry.tables.add(table.tableName);
      const parsedColumn = table.columns.get(columnName);
      if (parsedColumn) {
        entry.dbTypes.add(parsedColumn.type);
        entry.pk = entry.pk || parsedColumn.pk;
        entry.fk = entry.fk || Boolean(parsedColumn.references);
        entry.generated = entry.generated || Boolean(parsedColumn.generated);
      }
      for (const fk of table.foreignKeys ?? []) {
        if (fk.columns.includes(columnName)) entry.fk = true;
      }
    }
  }

  const orphanColumns = [...uniqueColumns.values()].filter((entry) => !fieldKeys.has(entry.name));
  return { uniqueColumns, orphanColumns };
}

function classifyOrphanColumns(parsed, registryMaps) {
  const { orphanColumns } = buildColumnIndex(parsed, registryMaps);
  const needsFieldDef = [];
  const auditColumns = [];
  const pkFkColumns = [];
  const shouldRemove = [];

  for (const column of orphanColumns) {
    const tables = [...column.tables].sort();
    const dbTypes = [...column.dbTypes].sort();
    const uiType = inferFieldUiType(column.name, dbTypes);

    if (genericAuditColumns.has(column.name) || (/_at$/.test(column.name) && tables.length >= 4)) {
      auditColumns.push({
        column: column.name,
        tables,
        dbTypes,
      });
      continue;
    }

    if (column.pk || column.fk || column.name === 'id' || column.name.endsWith('_id')) {
      pkFkColumns.push({
        column: column.name,
        tables,
        dbTypes,
        role: column.pk && column.fk ? 'pk_fk' : column.pk ? 'primary_key' : 'foreign_key',
      });
      continue;
    }

    if (/^legacy_|^tmp_|^temp_|^deprecated_/.test(column.name)) {
      shouldRemove.push({
        column: column.name,
        tables,
        reason: 'Legacy/temp naming strongly suggests cleanup candidate.',
      });
      continue;
    }

    needsFieldDef.push({
      column: column.name,
      tables,
      suggestedLabel: vietnameseLabelFromKeyV2(column.name),
      suggestedLabelEn: englishLabelFromKey(column.name),
      suggestedType: uiType,
      dbTypes,
      reason: 'Real persisted column without a registry field definition; should be surfaced to Module Builder.',
    });
  }

  const total = needsFieldDef.length + auditColumns.length + pkFkColumns.length + shouldRemove.length;
  if (total !== orphanColumns.length) {
    throw new Error(`Orphan column classification mismatch: expected ${orphanColumns.length}, got ${total}`);
  }

  return {
    orphan_columns: {
      needs_field_def: {
        description: 'Columns thực tế nhưng chưa có field definition trong registry.',
        count: needsFieldDef.length,
        columns: needsFieldDef,
      },
      audit_columns: {
        description: 'Audit/governance columns lặp lại nhiều nơi, nên có field def dùng chung.',
        count: auditColumns.length,
        columns: auditColumns,
      },
      pk_fk_columns: {
        description: 'Primary key / foreign key / technical identifiers nên có quy ước reference chung trong registry.',
        count: pkFkColumns.length,
        columns: pkFkColumns,
      },
      should_remove: {
        description: 'Tên cột cho thấy khả năng cao là legacy/temp và cần đánh giá loại bỏ khỏi migration.',
        count: shouldRemove.length,
        columns: shouldRemove,
      },
    },
  };
}

function selfAudit(parsed, tableRegistry, domainArchitecture, orphanResolution) {
  if (parsed.tables.size !== Object.keys(tableRegistry).length) {
    throw new Error(`Table registry count mismatch: schema=${parsed.tables.size}, registry=${Object.keys(tableRegistry).length}`);
  }

  for (const [tableName, descriptor] of Object.entries(tableRegistry)) {
    if (!descriptor.domain) throw new Error(`Table ${tableName} missing domain`);
    if (descriptor.statusColumn && !descriptor.statusSet) throw new Error(`Table ${tableName} missing status set`);
    for (const [columnName, column] of Object.entries(descriptor.columns)) {
      if (!column.label || !column.labelEn) throw new Error(`Column ${tableName}.${columnName} missing labels`);
    }
  }

  const fieldTotal = Object.values(orphanResolution.orphan_fields).reduce((sum, entry) => sum + entry.count, 0);
  const columnTotal = Object.values(orphanResolution.orphan_columns).reduce((sum, entry) => sum + entry.count, 0);
  if (!Number.isFinite(fieldTotal)) throw new Error('Orphan field classification is invalid');
  if (!Number.isFinite(columnTotal)) throw new Error('Orphan column classification is invalid');

  for (const [domainKey, domain] of Object.entries(domainArchitecture.domains)) {
    if (!domain.supportDomain && !(domain.primaryWorkflows?.length)) {
      throw new Error(`Domain ${domainKey} lacks workflow coverage`);
    }
  }
}

function main() {
  const parsed = parseMigrations();
  const registryMaps = collectRegistryMaps();
  const { tableRegistry, domainSummary } = buildTableRegistry(parsed, registryMaps);
  const domainArchitecture = buildDomainArchitecture(parsed, tableRegistry);
  for (const [domainKey, summary] of Object.entries(domainSummary)) {
    const architectureDomain = domainArchitecture.domains[domainKey];
    summary.relatedDomains = [...new Set([...(architectureDomain?.upstreamDomains ?? []), ...(architectureDomain?.downstreamDomains ?? [])])].sort();
  }
  const orphanFields = classifyOrphanFields(registryMaps);
  const orphanColumns = classifyOrphanColumns(parsed, registryMaps);

  const orphanResolution = {
    _meta: {
      version: '1.0',
      generatedAt,
      description: `Resolution plan for ${Object.values(orphanFields.orphan_fields).reduce((sum, entry) => sum + entry.count, 0)} orphan registry fields and ${Object.values(orphanColumns.orphan_columns).reduce((sum, entry) => sum + entry.count, 0)} orphan DB column names.`,
    },
    ...orphanFields,
    ...orphanColumns,
  };

  const tableRegistryOutput = {
    _meta: {
      version: '1.0',
      generatedAt,
      tableCount: Object.keys(tableRegistry).length,
      domainCount: Object.keys(domainDefinitions).length,
      description: 'Master registry of all database tables with domain, workflow, and field mapping.',
      researchReferences,
    },
    domains: domainSummary,
    tables: tableRegistry,
  };

  selfAudit(parsed, tableRegistry, domainArchitecture, orphanResolution);

  writeJson(path.join(registryDir, 'table-registry.json'), tableRegistryOutput);
  writeJson(path.join(registryDir, 'domain-architecture.json'), domainArchitecture);
  writeJson(path.join(registryDir, 'orphan-resolution.json'), orphanResolution);
  writeJson(
    path.join(docsDir, 'table_columns.json'),
    Object.fromEntries(
      [...parsed.tables.values()]
        .sort((left, right) => left.tableName.localeCompare(right.tableName))
        .map((table) => [table.tableName, [...table.columns.keys()].sort()]),
    ),
  );

  console.log(
    JSON.stringify(
      {
        generatedAt,
        tables: parsed.tables.size,
        columns: [...parsed.tables.values()].reduce((sum, table) => sum + table.columns.size, 0),
        uniqueColumns: new Set([...parsed.tables.values()].flatMap((table) => [...table.columns.keys()])).size,
        domains: Object.keys(domainDefinitions).length,
        orphanFields: Object.values(orphanResolution.orphan_fields).reduce((sum, entry) => sum + entry.count, 0),
        orphanColumns: Object.values(orphanResolution.orphan_columns).reduce((sum, entry) => sum + entry.count, 0),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}

export {
  englishLabelFromKey,
  vietnameseLabelFromKeyV2,
  collectRegistryMaps,
  parseMigrations,
  buildColumnIndex,
  classifyOrphanColumns,
  classifyOrphanFields,
};
