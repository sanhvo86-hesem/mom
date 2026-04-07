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
const DELETE_GOVERNED_DOMAINS = new Set([
  'audit_risk',
  'calibration_equipment',
  'customer_portal',
  'document_control',
  'evidence_vault',
  'forms_system',
  'master_data_governance',
  'quality_lab',
  'quality_management',
  'record_system',
  'shipping_compliance',
  'supplier_relationship',
  'trade_compliance',
]);
const WORKFLOW_ENGINE_MODELS = Object.freeze({
  DOC: ['draft', 'in_review', 'pending_approval', 'approved', 'effective', 'obsolete'],
  NCR: ['draft', 'submitted', 'under_review', 'disposition_set', 'containment_active', 'close_requested', 'closed'],
  CAPA: ['draft', 'initiated', 'action_planning', 'implementation', 'effectiveness_review', 'closed'],
  FAI: ['triggered', 'planning', 'form1_part_accountability', 'form2_material_process', 'form3_characteristics', 'review', 'conditional_approval', 'approved', 'closed'],
  CAL: ['complete', 'partial', 'broken', 'pending'],
  AUD: ['planned', 'in_progress', 'reporting', 'follow_up', 'closed'],
  TRN: ['scheduled', 'in_progress', 'assessment', 'certified'],
  ECR: ['submitted', 'review', 'approved', 'implemented', 'verified'],
  SCAR: ['issued', 'acknowledged', 'root_cause_analysis', 'corrective_action', 'verification', 'closed', 'overdue'],
  SCAR_RECORD: ['issued', 'acknowledged', 'root_cause_analysis', 'corrective_action', 'verification', 'closed', 'overdue'],
  RISK: ['identified', 'assessed', 'mitigated', 'monitored', 'closed'],
  IMP: ['proposed', 'approved', 'pdca_do', 'pdca_check', 'pdca_act', 'closed'],
  MR: ['scheduled', 'in_progress', 'minutes_drafted', 'approved'],

  APQP_PROJECT: ['not_started', 'open', 'ready', 'approved', 'blocked'],
  APS_PLANNING_HORIZON: ['complete', 'partial', 'broken', 'pending'],
  AUDIT_ACTION: ['complete', 'partial', 'broken', 'pending'],
  CALIBRATION_CONTROL: ['complete', 'partial', 'broken', 'pending'],
  CERTIFICATE: ['planning', 'collecting', 'submitted', 'customer_review', 'approved', 'rejected'],
  CNC_PROGRAM_APPROVAL: ['draft', 'in_review', 'approved', 'released', 'superseded', 'obsolete'],
  CONCESSION: ['open', 'in_progress', 'pending_review', 'closed', 'rejected'],
  CUSTOMER_COMPLAINT: ['new', 'acknowledged', 'investigating', 'resolved', 'closed'],
  DEVIATION: ['open', 'in_progress', 'pending_review', 'closed', 'rejected'],
  DOCUMENT_CHANGE_CONTROL: ['draft', 'in_review', 'pending_approval', 'approved', 'effective', 'obsolete'],
  DW_SUPPLIER_DIM: ['draft', 'assessment', 'approved', 'conditional', 'hold', 'inactive'],
  EHS_CORRECTIVE_ACTION: ['complete', 'partial', 'broken', 'pending'],
  EHS_INCIDENT: ['complete', 'partial', 'broken', 'pending'],
  EHS_PERMIT_REGISTER: ['complete', 'partial', 'broken', 'pending'],
  EHS_REGULATORY_SUBMISSION: ['complete', 'partial', 'broken', 'pending'],
  EMPLOYEE_CERTIFICATION: ['complete', 'partial', 'broken', 'pending'],
  EXPORT_LICENS: ['complete', 'partial', 'broken', 'pending'],
  FIN_CUSTOMS_DECLARATION: ['complete', 'partial', 'broken', 'pending'],
  FIN_LC_DRAW_REQUEST: ['complete', 'partial', 'broken', 'pending'],
  FIN_LETTERS_OF_CREDIT: ['complete', 'partial', 'broken', 'pending'],
  FIN_MULTI_BOOK_LEDGER: ['complete', 'partial', 'broken', 'pending'],
  FIN_WITHHOLDING_TAX_CODE: ['complete', 'partial', 'broken', 'pending'],
  FMEA: ['draft', 'active', 'archived'],
  FORM_SCHEMA: ['complete', 'partial', 'broken', 'pending'],
  HCM_CERTIFICATION: ['complete', 'partial', 'broken', 'pending'],
  HCM_DISCIPLINARY_ACTION: ['complete', 'partial', 'broken', 'pending'],
  HCM_ORG_UNIT: ['complete', 'partial', 'broken', 'pending'],
  HCM_PAYROLL_PERIOD: ['complete', 'partial', 'broken', 'pending'],
  HCM_POSITION: ['complete', 'partial', 'broken', 'pending'],
  HCM_SKILLS_CATALOG: ['complete', 'partial', 'broken', 'pending'],
  INTEGRATION_MONITOR: ['draft', 'active', 'closed'],
  ITEM: ['draft', 'active', 'hold', 'obsolete_requested', 'obsolete'],
  JOB_ORDER: ['draft', 'planned', 'released', 'active', 'completed', 'closed'],
  LEAN_5S_AUDIT: ['complete', 'partial', 'broken', 'pending'],
  LEAN_ANDON: ['complete', 'partial', 'broken', 'pending'],
  LEAN_GEMBA_WALK: ['complete', 'partial', 'broken', 'pending'],
  LEAN_KAIZEN: ['complete', 'partial', 'broken', 'pending'],
  LEAN_QRQC: ['complete', 'partial', 'broken', 'pending'],
  LEAN_SMED: ['complete', 'partial', 'broken', 'pending'],
  LEAN_TIER_MEETING: ['complete', 'partial', 'broken', 'pending'],
  MAINTENANCE_WORK_ORDER: ['scheduled', 'setup', 'running', 'inspection', 'completed', 'on_hold'],
  MATERIAL_REVIEW_BOARD: ['complete', 'partial', 'broken', 'pending'],
  MDM_GOVERNANCE: ['complete', 'partial', 'broken', 'pending'],
  MES_ERP_RECONCILIATION_EXCEPTION: ['open', 'in_progress', 'pending_review', 'closed', 'rejected'],
  MES_ERP_SYNC_RUN: ['queued', 'running', 'success', 'partial', 'failed'],
  MOBILE_TASK: ['queued', 'running', 'success', 'partial', 'failed'],
  PACKING_LIST: ['complete', 'partial', 'broken', 'pending'],
  PLM_CHANGE_ORDER: ['complete', 'partial', 'broken', 'pending'],
  PLM_CHANGE_REQUEST: ['complete', 'partial', 'broken', 'pending'],
  PLM_DEVIATION_PERMIT: ['complete', 'partial', 'broken', 'pending'],
  PLM_TEST_PLAN: ['complete', 'partial', 'broken', 'pending'],
  PM_EQUIPMENT_MASTER: ['complete', 'partial', 'broken', 'pending'],
  PM_FUNCTIONAL_LOCATION: ['complete', 'partial', 'broken', 'pending'],
  PM_MAINTENANCE_BUDGET: ['complete', 'partial', 'broken', 'pending'],
  PM_MAINTENANCE_PLAN: ['complete', 'partial', 'broken', 'pending'],
  PM_WORK_ORDER: ['draft', 'planned', 'released', 'in_progress', 'completed', 'cancelled'],
  PORTAL_COMPLAINT_SUBMISSION: ['complete', 'partial', 'broken', 'pending'],
  PORTAL_USER: ['active', 'pending', 'deactivated', 'locked'],
  PREDICTIVE_QUALITY: ['planned', 'in_progress', 'passed', 'failed', 'deferred'],
  PRODUCT_PASSPORT: ['draft', 'active', 'shipped', 'in_service', 'end_of_life', 'recalled'],
  PROJECT_MILESTONE: ['complete', 'partial', 'broken', 'pending'],
  PURCHASE_ORDER: ['draft', 'pending_approval', 'approved', 'released', 'partial', 'received', 'closed'],
  QUAL_AUDIT_PROGRAM: ['complete', 'partial', 'broken', 'pending'],
  QUAL_CONTAINMENT_ACTION: ['complete', 'partial', 'broken', 'pending'],
  QUAL_LAB_EQUIPMENT: ['complete', 'partial', 'broken', 'pending'],
  QUOTE_LIFECYCLE: ['draft', 'review', 'sent', 'won', 'lost', 'expired'],
  RECEIVING_INSPECTION: ['queued', 'in_progress', 'accepted', 'rejected', 'waived'],
  RECORD_LIFECYCLE: ['complete', 'partial', 'broken', 'pending'],
  RETENTION_POLICY: ['draft', 'active', 'closed'],
  ROUTING: ['inactive', 'active'],
  SALES_ORDER: ['draft', 'confirmed', 'engineering_ready', 'in_production', 'shipped', 'closed'],
  SCAR_RECORD: ['issued', 'acknowledged', 'root_cause_analysis', 'corrective_action', 'verification', 'closed', 'overdue'],
  SERIAL_MASTER: ['complete', 'partial', 'broken', 'pending'],
  SETUP_SHEET: ['complete', 'partial', 'broken', 'pending'],
  SHIFT_TARGET: ['planned', 'dispatched', 'in_progress', 'completed', 'cancelled'],
  SHIPMENT_RELEASE: ['blocked', 'ready', 'released', 'dispatched', 'delivered'],
  SRM_SUPPLIER_DEVELOPMENT_PLAN: ['open', 'in_progress', 'completed', 'cancelled'],
  SUPPLIER_AUDIT_SCHEDULE: ['complete', 'partial', 'broken', 'pending'],
  SVC_CUSTOMER_ASSET: ['complete', 'partial', 'broken', 'pending'],
  SVC_SERVICE_WORK_ORDER: ['draft', 'planned', 'released', 'in_production', 'quality_hold', 'closed', 'cancelled'],
  USER: ['complete', 'partial', 'broken', 'pending'],
  WMS_CYCLE_COUNT_PLAN: ['complete', 'partial', 'broken', 'pending'],
  WMS_MATERIAL_HANDLING_UNIT: ['complete', 'partial', 'broken', 'pending'],
  WMS_PICK_LIST: ['open', 'in_progress', 'completed', 'cancelled'],
  WMS_PUTAWAY_RULE: ['complete', 'partial', 'broken', 'pending'],
  WMS_QUARANTINE_HOLD: ['complete', 'partial', 'broken', 'pending'],
  WMS_TRANSFER_ORDER: ['complete', 'partial', 'broken', 'pending'],
  WMS_WAVE_PLAN: ['complete', 'partial', 'broken', 'pending'],
  WMS_ZONE: ['complete', 'partial', 'broken', 'pending'],
});
const EXPLICIT_WORKFLOW_ENGINE_BRIDGES = Object.freeze({
  wf_capa: { record_type: 'CAPA', identity_candidates: ['record_id', 'source_record_id', 'capa_id', 'step_id'] },
  wf_document_change_control: { record_type: 'DOC', identity_candidates: ['record_id', 'source_record_id', 'version_id', 'document_id'] },
  wf_ncr: { record_type: 'NCR', identity_candidates: ['record_id', 'source_record_id'] },
  wf_calibration_control: { record_type: 'CAL', identity_candidates: ['record_id', 'source_record_id'] },
  wf_calibration_record: { record_type: 'CAL', identity_candidates: ['record_id', 'source_record_id'] },
  wf_audit: { record_type: 'AUD', identity_candidates: ['record_id', 'source_record_id'] },
  wf_training_qualification: { record_type: 'TRN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_engineering_change_request: { record_type: 'ECR', identity_candidates: ['record_id', 'source_record_id'] },
  wf_scar_record: { record_type: 'SCAR', identity_candidates: ['record_id', 'source_record_id'] },
  wf_fai: { record_type: 'FAI', identity_candidates: ['record_id', 'source_record_id'] },
  wf_management_review: { record_type: 'MR', identity_candidates: ['record_id', 'source_record_id'] },
  wf_improvement_project: { record_type: 'IMP', identity_candidates: ['record_id', 'source_record_id'] },
  wf_apqp_project: { record_type: 'APQP_PROJECT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_aps_planning_horizon: { record_type: 'APS_PLANNING_HORIZON', identity_candidates: ['record_id', 'source_record_id'] },
  wf_audit_action: { record_type: 'AUDIT_ACTION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_certificate: { record_type: 'CERTIFICATE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_cnc_program_approval: { record_type: 'CNC_PROGRAM_APPROVAL', identity_candidates: ['record_id', 'source_record_id', 'version_id', 'program_id'] },
  wf_concession: { record_type: 'CONCESSION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_customer_complaint: { record_type: 'CUSTOMER_COMPLAINT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_deviation: { record_type: 'DEVIATION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_dw_supplier_dim: { record_type: 'DW_SUPPLIER_DIM', identity_candidates: ['record_id', 'source_record_id', 'vendor_id'] },
  wf_ehs_corrective_action: { record_type: 'EHS_CORRECTIVE_ACTION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_ehs_incident: { record_type: 'EHS_INCIDENT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_ehs_permit_register: { record_type: 'EHS_PERMIT_REGISTER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_ehs_regulatory_submission: { record_type: 'EHS_REGULATORY_SUBMISSION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_employee_certification: { record_type: 'EMPLOYEE_CERTIFICATION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_export_licens: { record_type: 'EXPORT_LICENS', identity_candidates: ['record_id', 'source_record_id'] },
  wf_fin_customs_declaration: { record_type: 'FIN_CUSTOMS_DECLARATION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_fin_lc_draw_request: { record_type: 'FIN_LC_DRAW_REQUEST', identity_candidates: ['record_id', 'source_record_id'] },
  wf_fin_letters_of_credit: { record_type: 'FIN_LETTERS_OF_CREDIT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_fin_multi_book_ledger: { record_type: 'FIN_MULTI_BOOK_LEDGER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_fin_withholding_tax_code: { record_type: 'FIN_WITHHOLDING_TAX_CODE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_fmea: { record_type: 'FMEA', identity_candidates: ['record_id', 'source_record_id'] },
  wf_form_schema: { record_type: 'FORM_SCHEMA', identity_candidates: ['record_id', 'source_record_id'] },
  wf_hcm_certification: { record_type: 'HCM_CERTIFICATION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_hcm_disciplinary_action: { record_type: 'HCM_DISCIPLINARY_ACTION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_hcm_org_unit: { record_type: 'HCM_ORG_UNIT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_hcm_payroll_period: { record_type: 'HCM_PAYROLL_PERIOD', identity_candidates: ['record_id', 'source_record_id'] },
  wf_hcm_position: { record_type: 'HCM_POSITION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_hcm_skills_catalog: { record_type: 'HCM_SKILLS_CATALOG', identity_candidates: ['record_id', 'source_record_id'] },
  wf_integration_monitor: { record_type: 'INTEGRATION_MONITOR', identity_candidates: ['record_id', 'source_record_id', 'integration_id'] },
  wf_item: { record_type: 'ITEM', identity_candidates: ['record_id', 'source_record_id'] },
  wf_job_order: { record_type: 'JOB_ORDER', identity_candidates: ['record_id', 'source_record_id', 'job_order_id', 'job_op_id'] },
  wf_lean_5s_audit: { record_type: 'LEAN_5S_AUDIT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_lean_andon: { record_type: 'LEAN_ANDON', identity_candidates: ['record_id', 'source_record_id'] },
  wf_lean_gemba_walk: { record_type: 'LEAN_GEMBA_WALK', identity_candidates: ['record_id', 'source_record_id'] },
  wf_lean_kaizen: { record_type: 'LEAN_KAIZEN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_lean_qrqc: { record_type: 'LEAN_QRQC', identity_candidates: ['record_id', 'source_record_id'] },
  wf_lean_smed: { record_type: 'LEAN_SMED', identity_candidates: ['record_id', 'source_record_id'] },
  wf_lean_tier_meeting: { record_type: 'LEAN_TIER_MEETING', identity_candidates: ['record_id', 'source_record_id'] },
  wf_maintenance_work_order: { record_type: 'MAINTENANCE_WORK_ORDER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_material_review_board: { record_type: 'MATERIAL_REVIEW_BOARD', identity_candidates: ['record_id', 'source_record_id'] },
  wf_mdm_governance: { record_type: 'MDM_GOVERNANCE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_mes_erp_reconciliation_exception: { record_type: 'MES_ERP_RECONCILIATION_EXCEPTION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_mes_erp_sync_run: { record_type: 'MES_ERP_SYNC_RUN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_mobile_task: { record_type: 'MOBILE_TASK', identity_candidates: ['record_id', 'source_record_id'] },
  wf_packing_list: { record_type: 'PACKING_LIST', identity_candidates: ['record_id', 'source_record_id'] },
  wf_plm_change_order: { record_type: 'PLM_CHANGE_ORDER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_plm_change_request: { record_type: 'PLM_CHANGE_REQUEST', identity_candidates: ['record_id', 'source_record_id'] },
  wf_plm_deviation_permit: { record_type: 'PLM_DEVIATION_PERMIT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_plm_test_plan: { record_type: 'PLM_TEST_PLAN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_pm_equipment_master: { record_type: 'PM_EQUIPMENT_MASTER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_pm_functional_location: { record_type: 'PM_FUNCTIONAL_LOCATION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_pm_maintenance_budget: { record_type: 'PM_MAINTENANCE_BUDGET', identity_candidates: ['record_id', 'source_record_id'] },
  wf_pm_maintenance_plan: { record_type: 'PM_MAINTENANCE_PLAN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_pm_work_order: { record_type: 'PM_WORK_ORDER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_portal_complaint_submission: { record_type: 'PORTAL_COMPLAINT_SUBMISSION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_portal_user: { record_type: 'PORTAL_USER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_predictive_quality: { record_type: 'PREDICTIVE_QUALITY', identity_candidates: ['record_id', 'source_record_id'] },
  wf_product_passport: { record_type: 'PRODUCT_PASSPORT', identity_candidates: ['record_id', 'source_record_id', 'event_id', 'passport_id'] },
  wf_project_milestone: { record_type: 'PROJECT_MILESTONE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_purchase_order: { record_type: 'PURCHASE_ORDER', identity_candidates: ['record_id', 'source_record_id', 'po_line_id', 'po_id'] },
  wf_qual_audit_program: { record_type: 'QUAL_AUDIT_PROGRAM', identity_candidates: ['record_id', 'source_record_id'] },
  wf_qual_containment_action: { record_type: 'QUAL_CONTAINMENT_ACTION', identity_candidates: ['record_id', 'source_record_id'] },
  wf_qual_lab_equipment: { record_type: 'QUAL_LAB_EQUIPMENT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_quote_lifecycle: { record_type: 'QUOTE_LIFECYCLE', identity_candidates: ['record_id', 'source_record_id', 'history_id', 'quote_id'] },
  wf_receiving_inspection: { record_type: 'RECEIVING_INSPECTION', identity_candidates: ['record_id', 'source_record_id', 'result_id', 'inspection_id'] },
  wf_record_lifecycle: { record_type: 'RECORD_LIFECYCLE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_retention_policy: { record_type: 'RETENTION_POLICY', identity_candidates: ['record_id', 'source_record_id', 'policy_id'] },
  wf_routing: { record_type: 'ROUTING', identity_candidates: ['record_id', 'source_record_id'] },
  wf_sales_order: { record_type: 'SALES_ORDER', identity_candidates: ['record_id', 'source_record_id', 'so_line_id', 'so_id'] },
  wf_serial_master: { record_type: 'SERIAL_MASTER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_setup_sheet: { record_type: 'SETUP_SHEET', identity_candidates: ['record_id', 'source_record_id'] },
  wf_shift_target: { record_type: 'SHIFT_TARGET', identity_candidates: ['record_id', 'source_record_id'] },
  wf_shipment_release: { record_type: 'SHIPMENT_RELEASE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_srm_supplier_development_plan: { record_type: 'SRM_SUPPLIER_DEVELOPMENT_PLAN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_supplier_audit_schedule: { record_type: 'SUPPLIER_AUDIT_SCHEDULE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_svc_customer_asset: { record_type: 'SVC_CUSTOMER_ASSET', identity_candidates: ['record_id', 'source_record_id'] },
  wf_svc_service_work_order: { record_type: 'SVC_SERVICE_WORK_ORDER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_user: { record_type: 'USER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_cycle_count_plan: { record_type: 'WMS_CYCLE_COUNT_PLAN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_material_handling_unit: { record_type: 'WMS_MATERIAL_HANDLING_UNIT', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_pick_list: { record_type: 'WMS_PICK_LIST', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_putaway_rule: { record_type: 'WMS_PUTAWAY_RULE', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_quarantine_hold: { record_type: 'WMS_QUARANTINE_HOLD', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_transfer_order: { record_type: 'WMS_TRANSFER_ORDER', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_wave_plan: { record_type: 'WMS_WAVE_PLAN', identity_candidates: ['record_id', 'source_record_id'] },
  wf_wms_zone: { record_type: 'WMS_ZONE', identity_candidates: ['record_id', 'source_record_id'] },
});
const FRONTEND_SECTION_LABELS = Object.freeze({
  general: { vi: 'Tong quan', en: 'Overview' },
  identification: { vi: 'Nhan dien', en: 'Identity' },
  dimensions: { vi: 'Quy cach', en: 'Dimensions' },
  quality: { vi: 'Chat luong', en: 'Quality' },
  scheduling: { vi: 'Dieu do', en: 'Scheduling' },
  compliance: { vi: 'Tuan thu', en: 'Compliance' },
  traceability: { vi: 'Truy xuat', en: 'Traceability' },
  cost: { vi: 'Chi phi', en: 'Cost' },
  workflow: { vi: 'Phe duyet', en: 'Workflow' },
  analytics: { vi: 'Phan tich', en: 'Analytics' },
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const ROLE_GROUPS = {
  admin: ['it_admin', 'ceo', 'qa_manager', 'quality_manager'],
  quality_lead: ['qa_manager', 'quality_manager', 'qms_engineer'],
  quality_ops: ['quality_engineer', 'qc_inspector'],
  production_lead: ['production_director', 'production_manager', 'cnc_workshop_manager', 'production_planner'],
  production_ops: ['shift_leader', 'cnc_operator', 'setup_technician', 'maintenance_technician'],
  engineering_lead: ['engineering_manager', 'engineering_lead'],
  engineering_ops: ['cam_nc_programmer', 'process_engineer'],
  supply_lead: ['supply_chain_manager'],
  supply_ops: ['buyer', 'warehouse_clerk', 'tool_storekeeper', 'logistics_coordinator'],
  finance_lead: ['finance_manager', 'gl_payroll_accountant', 'ap_ar_accountant'],
  hr_lead: ['hr_manager'],
  commercial: ['estimator', 'sales_manager', 'customer_service'],
};

function expandRuntimeRoles(...groups) {
  const roles = [];
  for (const group of groups.flat()) {
    if (!group) continue;
    if (ROLE_GROUPS[group]) {
      roles.push(...ROLE_GROUPS[group]);
      continue;
    }
    roles.push(String(group));
  }
  return Array.from(new Set(roles.map((role) => String(role || '').trim()).filter(Boolean)));
}

function runtimeAccessTemplate(overrides = {}) {
  return {
    list: ['authenticated'],
    detail: ['authenticated'],
    create: expandRuntimeRoles('admin', 'quality_lead'),
    update: expandRuntimeRoles('admin', 'quality_lead'),
    transition: expandRuntimeRoles('admin', 'quality_lead'),
    delete: expandRuntimeRoles('admin'),
    ...overrides,
  };
}

function runtimeAccessProfileForDomain(domain) {
  const key = String(domain || '').trim().toLowerCase();
  if (!key) {
    return runtimeAccessTemplate();
  }

  if (['core_system', 'system_infrastructure', 'forms_system', 'record_system', 'master_data_governance', 'customer_portal'].includes(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin'),
      detail: expandRuntimeRoles('admin'),
      create: expandRuntimeRoles('admin'),
      update: expandRuntimeRoles('admin'),
      transition: expandRuntimeRoles('admin'),
    });
  }

  if (/^finance/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'finance_lead'),
      detail: expandRuntimeRoles('admin', 'finance_lead'),
      create: expandRuntimeRoles('admin', 'finance_lead'),
      update: expandRuntimeRoles('admin', 'finance_lead'),
      transition: expandRuntimeRoles('admin', 'finance_lead'),
    });
  }

  if (/training|hr/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'hr_lead', 'quality_lead'),
      detail: expandRuntimeRoles('admin', 'hr_lead', 'quality_lead'),
      create: expandRuntimeRoles('admin', 'hr_lead', 'quality_lead'),
      update: expandRuntimeRoles('admin', 'hr_lead', 'quality_lead'),
      transition: expandRuntimeRoles('admin', 'hr_lead', 'quality_lead'),
    });
  }

  if (/quality|audit|calibration|supplier_relationship|compliance/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'quality_lead', 'quality_ops', 'supply_lead'),
      detail: expandRuntimeRoles('admin', 'quality_lead', 'quality_ops', 'supply_lead'),
      create: expandRuntimeRoles('admin', 'quality_lead', 'quality_ops', 'supply_lead'),
      update: expandRuntimeRoles('admin', 'quality_lead', 'quality_ops', 'supply_lead'),
      transition: expandRuntimeRoles('admin', 'quality_lead', 'quality_ops', 'supply_lead'),
    });
  }

  if (/planning|production|mes|dispatch|maintenance|tooling/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'production_lead', 'production_ops', 'engineering_lead', 'engineering_ops', 'quality_lead'),
      detail: expandRuntimeRoles('admin', 'production_lead', 'production_ops', 'engineering_lead', 'engineering_ops', 'quality_lead'),
      create: expandRuntimeRoles('admin', 'production_lead', 'engineering_lead', 'quality_lead'),
      update: expandRuntimeRoles('admin', 'production_lead', 'engineering_lead', 'quality_lead'),
      transition: expandRuntimeRoles('admin', 'production_lead', 'engineering_lead', 'quality_lead'),
    });
  }

  if (/engineering|plm|fmea|apqp|master_data/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'engineering_lead', 'engineering_ops', 'quality_lead', 'production_lead'),
      detail: expandRuntimeRoles('admin', 'engineering_lead', 'engineering_ops', 'quality_lead', 'production_lead'),
      create: expandRuntimeRoles('admin', 'engineering_lead', 'quality_lead', 'production_lead'),
      update: expandRuntimeRoles('admin', 'engineering_lead', 'quality_lead', 'production_lead'),
      transition: expandRuntimeRoles('admin', 'engineering_lead', 'quality_lead', 'production_lead'),
    });
  }

  if (/warehouse|inventory|supply|purchasing|shipping|transport|trade|logistics|outsource/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'supply_lead', 'supply_ops', 'quality_lead'),
      detail: expandRuntimeRoles('admin', 'supply_lead', 'supply_ops', 'quality_lead'),
      create: expandRuntimeRoles('admin', 'supply_lead', 'quality_lead'),
      update: expandRuntimeRoles('admin', 'supply_lead', 'quality_lead'),
      transition: expandRuntimeRoles('admin', 'supply_lead', 'quality_lead'),
    });
  }

  if (/commercial|crm|quote|order|customer/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'commercial', 'finance_lead', 'production_lead'),
      detail: expandRuntimeRoles('admin', 'commercial', 'finance_lead', 'production_lead'),
      create: expandRuntimeRoles('admin', 'commercial', 'finance_lead', 'production_lead'),
      update: expandRuntimeRoles('admin', 'commercial', 'finance_lead', 'production_lead'),
      transition: expandRuntimeRoles('admin', 'commercial', 'finance_lead', 'production_lead'),
    });
  }

  return runtimeAccessTemplate();
}

function runtimeAccessProfileForTable(tableName, table) {
  const key = String(tableName || '').trim().toLowerCase();
  if (!key) {
    return null;
  }

  if (['users', 'roles', 'user_roles'].includes(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin'),
      detail: expandRuntimeRoles('admin'),
      create: expandRuntimeRoles('admin'),
      update: expandRuntimeRoles('admin'),
      transition: expandRuntimeRoles('admin'),
    });
  }

  if (key === 'audit_events') {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'quality_lead'),
      detail: expandRuntimeRoles('admin', 'quality_lead'),
      create: [],
      update: [],
      transition: [],
      delete: [],
    });
  }

  if (/^workflow_/.test(key)) {
    return runtimeAccessTemplate({
      list: expandRuntimeRoles('admin', 'quality_lead'),
      detail: expandRuntimeRoles('admin', 'quality_lead'),
      create: expandRuntimeRoles('admin'),
      update: expandRuntimeRoles('admin'),
      transition: [],
      delete: [],
    });
  }

  if (table?.supportTable) {
    return runtimeAccessTemplate({
      delete: [],
    });
  }

  return null;
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

function hasColumn(table, field) {
  return !!table?.columns?.[field];
}

function workflowStateIds(workflow) {
  const states = Array.isArray(workflow?.states) ? workflow.states : [];
  return states
    .map((state) => {
      if (typeof state === 'string') return state.trim().toLowerCase();
      if (state && typeof state === 'object') return String(state.id || '').trim().toLowerCase();
      return '';
    })
    .filter(Boolean);
}

function workflowEngineBridgeContract(tableName, table, workflow) {
  const workflowId = String(table?.workflowId || '').trim();
  const bridgeSpec = EXPLICIT_WORKFLOW_ENGINE_BRIDGES[workflowId] || null;
  const recordType = String(bridgeSpec?.record_type || '').trim().toUpperCase();
  const engineStates = Array.isArray(WORKFLOW_ENGINE_MODELS[recordType]) ? WORKFLOW_ENGINE_MODELS[recordType] : [];
  const registryStates = workflowStateIds(workflow);
  const sharedStates = registryStates.filter((state) => engineStates.includes(state));
  const missingEngineStates = registryStates.filter((state) => !engineStates.includes(state));
  const missingRegistryStates = engineStates.filter((state) => !registryStates.includes(state));
  const identityCandidates = Array.isArray(bridgeSpec?.identity_candidates)
    ? bridgeSpec.identity_candidates.filter(Boolean)
    : ['record_id', 'source_record_id'];
  const identityField = identityCandidates.find((field) => hasColumn(table, field)) || null;
  const exactStateAlignment = registryStates.length > 0
    && missingEngineStates.length === 0
    && missingRegistryStates.length === 0;
  const stateAlignmentRatio = registryStates.length > 0
    ? Number((sharedStates.length / registryStates.length).toFixed(3))
    : 0;
  const blockReasons = [];

  if (!bridgeSpec) blockReasons.push('missing_explicit_record_type_mapping');
  if (!identityField) blockReasons.push('missing_engine_record_identity');
  if (registryStates.length === 0) blockReasons.push('missing_registry_states');
  if (engineStates.length === 0) blockReasons.push('missing_engine_state_model');
  if (registryStates.length > 0 && engineStates.length > 0 && !exactStateAlignment) {
    blockReasons.push('state_model_mismatch');
  }

  return {
    table: tableName,
    workflow_id: workflowId || null,
    configured: Boolean(bridgeSpec),
    ready: Boolean(bridgeSpec && identityField && exactStateAlignment),
    record_type: recordType || null,
    identity_field: identityField,
    identity_candidates: identityCandidates,
    registry_states: registryStates,
    engine_states: engineStates,
    shared_states: sharedStates,
    missing_engine_states: missingEngineStates,
    missing_registry_states: missingRegistryStates,
    state_alignment_ratio: stateAlignmentRatio,
    exact_state_alignment: exactStateAlignment,
    state_map: exactStateAlignment
      ? Object.fromEntries(registryStates.map((state) => [state, state]))
      : {},
    block_reasons: blockReasons,
    advisory: blockReasons.length
      ? 'Persisted workflow cannot safely use the workflow engine bridge yet; resolve identity and state-model mismatches before production transitions.'
      : 'Persisted workflow is aligned for workflow-engine execution.',
  };
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

function workflowRuntimeContract(tableName, table, workflowLibrary) {
  const workflowMap = workflowLibrary?.workflows || workflowLibrary || {};
  const workflow = workflowMap[String(table?.workflowId || '')] || null;
  const lifecycleMode = String(
    workflow?.lifecycleMode || (table?.statusColumn ? 'generic_status_only' : 'stateless')
  ).trim().toLowerCase();
  const transitions = Array.isArray(workflow?.transitions)
    ? workflow.transitions.filter((transition) => transition && typeof transition === 'object')
    : [];
  const transitionCount = transitions.length;
  const hasRoleGuards = transitions.some((transition) =>
    Array.isArray(transition.guards) && transition.guards.some((guard) => guard && guard.type === 'role')
  );
  const hasActions = transitions.some((transition) =>
    Array.isArray(transition.actions) && transition.actions.length > 0
  );
  const engineBridge = lifecycleMode === 'persisted'
    ? workflowEngineBridgeContract(tableName, table, workflow)
    : {
      configured: false,
      ready: false,
      record_type: null,
      identity_field: null,
      identity_candidates: [],
      registry_states: [],
      engine_states: [],
      shared_states: [],
      missing_engine_states: [],
      missing_registry_states: [],
      state_alignment_ratio: 0,
      exact_state_alignment: false,
      state_map: {},
      block_reasons: [],
      advisory: '',
    };
  const genericRuntimeSafe = lifecycleMode !== 'persisted';
  const engineBridgeRequired = lifecycleMode === 'persisted' && transitionCount > 0;
  const engineBridgeBlocked = lifecycleMode === 'persisted' && !engineBridge.ready;

  return {
    table: tableName,
    lifecycle_mode: lifecycleMode,
    execution_mode: lifecycleMode === 'persisted'
      ? (engineBridge.ready ? 'workflow_engine' : 'workflow_engine_required')
      : (lifecycleMode === 'generic_status_only' ? 'generic_status_only' : 'stateless'),
    transition_count: transitionCount,
    has_role_guards: hasRoleGuards,
    has_actions: hasActions,
    generic_runtime_safe: genericRuntimeSafe,
    builder_auto_bind_transition_endpoint: genericRuntimeSafe && !engineBridgeBlocked,
    engine_bridge_required: engineBridgeRequired,
    engine_bridge_blocked: engineBridgeBlocked,
    engine_bridge: engineBridge,
    generic_transition_policy: lifecycleMode === 'generic_status_only'
      ? 'allow_any_valid_status_value'
      : (lifecycleMode === 'persisted' ? 'registry_transition_map' : 'not_applicable'),
    advisory: engineBridgeBlocked
      ? engineBridge.advisory
      : (engineBridgeRequired
        ? 'Persisted workflow carries explicit transitions and should be bridged to a dedicated workflow engine before production rollout.'
        : ''),
    transition_execution_guard: engineBridgeBlocked
      ? 'deny_generic_runtime_until_bridge_ready'
      : (lifecycleMode === 'persisted' ? 'workflow_engine' : 'allow_generic_runtime'),
    frontend_transition_affordance: engineBridgeBlocked
      ? 'builder_sync_only'
      : (lifecycleMode === 'persisted' ? 'workflow_engine' : 'generic_runtime'),
    runtime_error_code: engineBridgeBlocked ? 'workflow_engine_required' : null,
    runtime_error_status: engineBridgeBlocked ? 409 : null,
    runtime_error_detail: engineBridgeBlocked
      ? 'Persisted workflow transitions are blocked in generic runtime until the workflow-engine bridge is explicitly aligned.'
      : '',
  };
}

function deleteContract(tableName, table) {
  if (table?.supportTable) {
    return {
      mode: 'hard_delete',
      governance_level: 'support',
      hard_delete_allowed: true,
      soft_delete_fields: [],
      frontend_affordance: 'danger_delete',
      runtime_enforced: false,
      advisory: '',
    };
  }

  const softDeleteFields = ['deleted_at', 'is_deleted', 'archived_at'].filter((field) => hasColumn(table, field));
  if (softDeleteFields.length > 0) {
    return {
      mode: 'soft_delete',
      governance_level: 'governed',
      hard_delete_allowed: false,
      soft_delete_fields: softDeleteFields,
      frontend_affordance: 'archive',
      runtime_enforced: true,
      advisory: 'Delete requests should map to a soft-delete update using the available lifecycle columns.',
    };
  }

  const normalizedTable = String(tableName || '').trim().toLowerCase();
  const normalizedDomain = String(table?.domain || '').trim().toLowerCase();
  const archiveOnly = Boolean(
    table?.workflowId
    || table?.statusColumn
    || DELETE_GOVERNED_DOMAINS.has(normalizedDomain)
    || /(audit|evidence|document|record|retention|allocation|certificate|passport|training|complaint|shipment|invoice|order|supplier|customer|workflow)/.test(normalizedTable)
  );

  if (archiveOnly) {
    return {
      mode: 'archive_only',
      governance_level: 'governed',
      hard_delete_allowed: false,
      soft_delete_fields: [],
      frontend_affordance: 'archive',
      runtime_enforced: true,
      advisory: 'Hard delete should be blocked; route users through archive, retention, or governed disposal flows instead.',
    };
  }

  return {
    mode: 'hard_delete',
    governance_level: 'standard',
    hard_delete_allowed: true,
    soft_delete_fields: [],
    frontend_affordance: 'danger_delete',
    runtime_enforced: false,
    advisory: '',
  };
}

function requestContract(kind, tableName, table, fields, statusOptions) {
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
  const deletion = deleteContract(tableName, table);

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
      deletion,
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
    deletion: kind === 'delete' ? deletion : undefined,
  };
}

function responseContract(kind, tableName, table, fields) {
  const pk = primaryKeyMeta(table);
  const deletion = deleteContract(tableName, table);
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
    deletion,
  };
}

function workflowContract(tableName, table, workflowLibrary) {
  const workflowMap = workflowLibrary?.workflows || workflowLibrary || {};
  const workflow = workflowMap[String(table?.workflowId || '')] || null;
  const isWorkflowOwner = !workflow?.primaryTable || workflow.primaryTable === tableName;
  const runtime = workflowRuntimeContract(tableName, table, workflowLibrary);

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
    lifecycle_mode: runtime.lifecycle_mode,
    runtime,
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

function uniqueStrings(values) {
  return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
}

function humanizeKey(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function fieldKeys(fields) {
  return uniqueStrings((fields || []).map((field) => field?.key));
}

function hasFieldMatch(fields, table, matchers) {
  return Boolean(findFieldKey(fields, table, matchers));
}

function findFieldKey(fields, table, matchers, exclude = []) {
  const availableFields = fieldKeys(fields);
  const availableColumns = uniqueStrings(Object.keys(table?.columns || {}));
  const excluded = new Set(uniqueStrings(exclude));
  const pools = [availableFields, availableColumns];

  for (const pool of pools) {
    for (const matcher of matchers) {
      const key = pool.find((candidate) => {
        if (excluded.has(candidate)) return false;
        if (matcher instanceof RegExp) return matcher.test(candidate);
        return candidate === String(matcher || '').trim();
      });
      if (key) return key;
    }
  }

  return null;
}

function sectionLabel(group) {
  const key = String(group || 'general').trim().toLowerCase();
  return FRONTEND_SECTION_LABELS[key] || {
    vi: humanizeKey(key),
    en: humanizeKey(key),
  };
}

function frontendProfile(tableName, table) {
  const domain = String(table?.domain || '').trim().toLowerCase();
  const key = String(tableName || '').trim().toLowerCase();
  const operatorSignals = ['job_id', 'job_no', 'work_order_id', 'operation_id', 'operation_seq', 'resource_id', 'machine_id', 'equipment_id'];
  const hasOperatorSignals = operatorSignals.some((field) => hasColumn(table, field));

  if (/planning|advanced_planning|dispatch/.test(domain) || /^aps_/.test(key)) {
    return 'planning_console';
  }
  if ((/mes|production|maintenance|tooling|quality_lab/.test(domain) || /work_order|job_order|machine|dispatch|inspection_lot/.test(key)) && hasOperatorSignals) {
    return 'operator_console';
  }
  if (table?.workflowId || /quality|audit|calibration|supplier_relationship|trade_compliance|compliance/.test(domain)) {
    return 'governed_case';
  }
  if (/document|record|evidence|training/.test(domain) || /document|record|evidence|passport|certificate|revision/.test(key)) {
    return 'document_record';
  }
  if (/master_data/.test(domain) || /^org_|^item|^bom_|^routing_/.test(key)) {
    return 'master_data';
  }
  if (/customer_portal|service/.test(domain)) {
    return 'service_workspace';
  }
  if (/finance|commercial|crm|warehouse|inventory|purchasing|shipping|transport|logistics/.test(domain)) {
    return 'transactional_record';
  }
  return 'business_record';
}

function recommendedPatternsForProfile(profile) {
  switch (profile) {
    case 'planning_console':
      return ['list_report', 'scenario_compare', 'planning_board', 'timeline_grid', 'related_lists', 'analytics'];
    case 'operator_console':
      return ['dispatch_queue', 'record_shell', 'work_instructions', 'genealogy', 'defect_capture', 'spc', 'offline'];
    case 'document_record':
      return ['record_shell', 'revision_history', 'approval_flow', 'attachments', 'audit_history', 'related_lists'];
    case 'governed_case':
      return ['object_page', 'related_lists', 'workflow_panel', 'timeline', 'attachments', 'audit_history', 'analytics'];
    case 'master_data':
      return ['list_report', 'record_shell', 'lookup_picker', 'effective_dates', 'translations', 'related_lists'];
    case 'service_workspace':
      return ['workspace_tabs', 'record_header', 'activity_stream', 'related_lists', 'declarative_actions', 'templates'];
    case 'transactional_record':
      return ['list_report', 'object_page', 'related_lists', 'actions', 'attachments', 'analytics'];
    default:
      return ['list_report', 'record_shell', 'related_lists', 'actions'];
  }
}

function formulaAliasesForDomain(domain, profile) {
  const key = String(domain || '').trim().toLowerCase();
  const aliases = [key];
  if (/quality|audit|calibration|supplier_relationship|trade_compliance|compliance/.test(key) || ['governed_case', 'document_record'].includes(profile)) {
    aliases.push('quality', 'compliance');
  }
  if (/planning|production|mes|maintenance|tooling/.test(key) || ['planning_console', 'operator_console'].includes(profile)) {
    aliases.push('manufacturing', 'planning');
  }
  if (/finance/.test(key)) aliases.push('finance');
  if (/warehouse|inventory|purchasing|shipping|transport|logistics/.test(key)) aliases.push('supply_chain', 'logistics');
  if (/commercial|crm|quote|order|customer/.test(key)) aliases.push('commercial', 'sales', 'system');
  if (/bi_|dw_/.test(key)) aliases.push('system');
  return uniqueStrings(aliases);
}

function formulaCountForDomain(formulas, domain, profile) {
  const aliases = new Set(formulaAliasesForDomain(domain, profile));
  return Object.entries(formulas || {}).filter(([key, formula]) => {
    if (key === '_meta' || !formula || typeof formula !== 'object') return false;
    const category = String(formula.category || '').trim().toLowerCase();
    return aliases.has(category);
  }).length;
}

function detailSections(detailFields) {
  const grouped = new Map();
  const orderedGroups = ['general', 'identification', 'quality', 'traceability', 'scheduling', 'compliance', 'cost', 'dimensions'];

  for (const field of detailFields || []) {
    const group = String(field?.group || 'general').trim().toLowerCase() || 'general';
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(field);
  }

  const ordered = uniqueStrings([...orderedGroups, ...Array.from(grouped.keys()).sort()]);
  const sections = ordered.map((group) => {
    const fields = grouped.get(group) || [];
    return {
      key: group,
      label: sectionLabel(group),
      field_keys: fieldKeys(fields).slice(0, 10),
      field_count: fieldKeys(fields).length,
    };
  }).filter((section) => section.field_keys.length > 0);

  if (sections.length) return sections.slice(0, 6);

  return detailFields.length ? [{
    key: 'overview',
    label: { vi: 'Tong quan', en: 'Overview' },
    field_keys: fieldKeys(detailFields).slice(0, 10),
    field_count: Math.min(fieldKeys(detailFields).length, 10),
  }] : [];
}

function capabilityState(recommended, ready, partial = false) {
  if (!recommended) return 'not_applicable';
  if (ready) return 'ready';
  if (partial) return 'partial';
  return 'blocked';
}

function capabilityContract(recommended, ready, blockers = [], extras = {}, partial = false) {
  return {
    recommended,
    ready: recommended ? ready : false,
    state: capabilityState(recommended, ready, partial),
    blockers: recommended && !ready ? uniqueStrings(blockers) : [],
    ...extras,
  };
}

function relationNeighborhood(tableName, tableRegistry, relationMap) {
  const edges = relationMap?.edges || relationMap?.relations || [];
  const outgoing = edges
    .filter((edge) => edge?.from?.entity === tableName)
    .slice(0, 8)
    .map((edge) => ({
      direction: 'lookup',
      relation: edge.type || edge.cardinality || 'many_to_one',
      entity: edge.to?.entity || null,
      domain: edge.toDomain || null,
      endpoint: edge.lookupEndpoint || (edge.toDomain && edge.to?.entity ? `${edge.toDomain}.${edge.to.entity}.detail` : null),
      via_field: edge.from?.field || null,
      label_field: edge.displayField || null,
      value_field: edge.valueField || edge.to?.field || null,
    }));
  const incoming = edges
    .filter((edge) => edge?.to?.entity === tableName)
    .slice(0, 12)
    .map((edge) => {
      const sourceTable = tableRegistry?.tables?.[edge.from?.entity || ''] || {};
      const pk = primaryKeyMeta(sourceTable);
      return {
        direction: 'related_list',
        relation: edge.type || edge.cardinality || 'one_to_many',
        entity: edge.from?.entity || null,
        domain: edge.fromDomain || null,
        endpoint: edge.fromDomain && edge.from?.entity ? `${edge.fromDomain}.${edge.from.entity}.list` : null,
        filter_field: edge.from?.field || null,
        primary_key_fields: pk.fields,
        label_field: displayFieldForTable(sourceTable),
      };
    });

  return { outgoing, incoming };
}

function metadataFieldNames(table, fields = []) {
  return uniqueStrings([
    ...Object.keys(table?.columns || {}),
    ...fieldKeys(fields),
  ]);
}

function supportEntityMeta(entityName, fallbackDomain, endpointCatalog, tableRegistry) {
  const table = tableRegistry?.tables?.[entityName];
  const domain = String(table?.domain || fallbackDomain || '').trim();
  if (!table || !domain) return null;
  const prefix = `${domain}.${entityName}`;
  const pk = primaryKeyMeta(table);
  const listEndpoint = endpointCatalog?.endpoints?.[`${prefix}.list`] || null;
  if (!listEndpoint) return null;
  return {
    entity: entityName,
    domain,
    table,
    primary_key: pk,
    fields: metadataFieldNames(table),
    list_endpoint: listEndpoint,
    detail_endpoint: endpointCatalog?.endpoints?.[`${prefix}.detail`] || null,
    create_endpoint: endpointCatalog?.endpoints?.[`${prefix}.create`] || null,
    update_endpoint: endpointCatalog?.endpoints?.[`${prefix}.update`] || null,
  };
}

function interactionBindingsForSubject(tableName, table, allFields, support) {
  if (!support) return [];
  const bindings = [];
  const subjectFields = metadataFieldNames(table, allFields);
  const pk = primaryKeyMeta(table);

  if (pk.mode === 'scalar' && pk.key && support.fields.includes('entity_id') && support.fields.includes('entity_type')) {
    bindings.push({
      mode: 'entity_ref',
      subject_identity_field: pk.key,
      filters: [
        { support_field: 'entity_id', subject_field: pk.key, operator: 'eq' },
        { support_field: 'entity_type', constant: tableName, operator: 'eq' },
      ],
    });
  }

  const recordBindingField = ['record_id', 'source_record_id'].find((field) => subjectFields.includes(field)) || null;
  if (recordBindingField && support.fields.includes('source_record_id')) {
    bindings.push({
      mode: 'source_record_ref',
      subject_identity_field: recordBindingField,
      filters: [
        { support_field: 'source_record_id', subject_field: recordBindingField, operator: 'eq' },
      ],
    });
  }

  return bindings;
}

function interactionContractForSubject(kind, tableName, table, allFields, endpointCatalog, tableRegistry) {
  const supportMap = {
    attachments: ['file_attachments', 'system_infrastructure'],
    comments: ['comments', 'system_infrastructure'],
    activities: ['crm_activities', 'crm'],
  };
  const [entityName, fallbackDomain] = supportMap[kind] || [];
  const support = supportEntityMeta(entityName, fallbackDomain, endpointCatalog, tableRegistry);
  if (!support) return null;
  const bindings = interactionBindingsForSubject(tableName, table, allFields, support);
  if (!bindings.length) return null;
  const filterableFields = support.list_endpoint?.capabilities?.filterable_fields || [];
  const preferredFields = [
    'entity_id',
    'entity_type',
    'source_record_id',
    'created_at',
    'updated_at',
    'uploaded_at',
    'scheduled_at',
    'completed_at',
    'activity_status',
    'parent_id',
    'uploaded_by_full_name',
    'author_full_name',
    'owner_full_name',
  ];
  const timelineField = ['uploaded_at', 'created_at', 'updated_at', 'scheduled_at', 'completed_at'].find((field) => support.fields.includes(field)) || null;
  return {
    kind,
    entity: support.entity,
    domain: support.domain,
    primary_key_fields: support.primary_key.fields,
    list_endpoint: support.list_endpoint?.action || null,
    detail_endpoint: support.detail_endpoint?.action || null,
    create_endpoint: support.create_endpoint?.action || null,
    update_endpoint: support.update_endpoint?.action || null,
    binding_modes: bindings.map((binding) => binding.mode),
    default_binding_mode: bindings[0]?.mode || null,
    bindings,
    filterable_fields: preferredFields.filter((field) => filterableFields.includes(field)),
    timeline_field: timelineField,
    status_field: support.fields.includes('activity_status') ? 'activity_status' : null,
    threaded: support.fields.includes('parent_id'),
  };
}

function frontendFoundationContract(tableName, table, dataFields, endpointCatalog, relationMap, tableRegistry, formulas) {
  const prefix = `${table.domain}.${tableName}`;
  const listFields = uniqueFields((dataFields[`${prefix}.list`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
  const detailFields = uniqueFields((dataFields[`${prefix}.detail`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
  const createFields = uniqueFields((dataFields[`${prefix}.create`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
  const updateFields = uniqueFields((dataFields[`${prefix}.update`] || []).map((field) => trimFieldForPack(field, tableRegistry)));
  const allFields = uniqueFields([...detailFields, ...listFields, ...createFields, ...updateFields]);
  const profile = frontendProfile(tableName, table);
  const listEndpoint = endpointCatalog.endpoints?.[`${prefix}.list`] || null;
  const detailEndpoint = endpointCatalog.endpoints?.[`${prefix}.detail`] || null;
  const createEndpoint = endpointCatalog.endpoints?.[`${prefix}.create`] || null;
  const updateEndpoint = endpointCatalog.endpoints?.[`${prefix}.update`] || null;
  const transitionEndpoint = endpointCatalog.endpoints?.[`${prefix}.transition`] || null;
  const deleteEndpoint = endpointCatalog.endpoints?.[`${prefix}.delete`] || null;
  const workflowRuntime = transitionEndpoint?.workflow?.runtime || listEndpoint?.workflow?.runtime || {};
  const relations = relationNeighborhood(tableName, tableRegistry, relationMap);
  const attachmentContract = interactionContractForSubject('attachments', tableName, table, allFields, endpointCatalog, tableRegistry);
  const commentContract = interactionContractForSubject('comments', tableName, table, allFields, endpointCatalog, tableRegistry);
  const activityContract = interactionContractForSubject('activities', tableName, table, allFields, endpointCatalog, tableRegistry);
  const titleField = findFieldKey(allFields, table, [
    displayFieldForTable(table),
    'record_number',
    'document_no',
    'doc_no',
    'invoice_number',
    'job_no',
    'lot_no',
    'serial_no',
    /^.*_number$/,
    /^.*_code$/,
    /^.*_name$/,
    /^.*_title$/,
  ]);
  const subtitleField = findFieldKey(allFields, table, [
    'description',
    'summary',
    'item_name',
    'document_title',
    'complaint_text',
    'finding_text',
    'comment_text',
    /^.*_description$/,
    /^.*_name$/,
  ], [titleField]);
  const statusField = findFieldKey(allFields, table, [
    table?.statusColumn,
    'status',
    'state',
    'lifecycle_state',
    'approval_state',
    'workflow_status',
    'is_active',
    'conformance',
    'result',
    'outcome',
    'priority',
    'severity',
    'level',
    'category',
    'type',
    /^.*_status$/,
    /^.*_state$/,
    /^.*_result$/,
  ]);
  const ownerField = findFieldKey(allFields, table, [
    'owner_name',
    'owner_user_id',
    'assigned_to',
    'assigned_user_id',
    'assigned_party_id',
    'responsible_party_id',
    'approver_party_id',
    'created_by',
    /^owner_/,
    /^assigned_/,
    /^responsible_/,
  ]);
  const updatedAtField = findFieldKey(allFields, table, [
    'updated_at',
    'modified_at',
    'changed_at',
    'last_updated_at',
    'event_at',
    'created_at',
    'completed_at',
    'closed_at',
    'acknowledged_at',
    'cleared_at',
    'processed_at',
    'released_at',
    'uploaded_at',
    'distributed_at',
    'detected_at',
    'moved_at',
    'consumed_at',
    'assessed_at',
    'measured_at',
    /^.*updated.*$/,
    /^.*changed.*$/,
    /^.*_at$/,
  ]);
  const createdAtField = findFieldKey(allFields, table, [
    'created_at',
    'recorded_at',
    'started_at',
    'event_at',
    'uploaded_at',
    'issue_date',
    'issued_at',
    'received_at',
    'opened_at',
    'granted_at',
    'distributed_at',
    'alarm_time',
    'kpi_date',
    'study_date',
    'calendar_date',
    'effective_date_from',
    'planned_date',
    'start_date',
    /^.*created.*$/,
    /^.*_date$/,
    /^.*_at$/,
  ]);
  const dueDateField = findFieldKey(allFields, table, [
    'due_date',
    'target_date',
    'required_by',
    'need_by_date',
    'effectiveness_due_date',
    /^.*due.*$/,
    /^.*target.*$/,
  ]);
  const startDateField = findFieldKey(allFields, table, [
    'start_date',
    'planned_start_at',
    'started_at',
    'effective_from',
    'effective_date_from',
    'period_start',
    'planned_start',
    'issue_date',
    'planned_date',
    'calendar_date',
    /^.*start.*$/,
    /^.*_from$/,
    /^.*begin.*$/,
  ]);
  const endDateField = findFieldKey(allFields, table, [
    'end_date',
    'planned_end_at',
    'ended_at',
    'effective_to',
    'effective_date_to',
    'period_end',
    'planned_end',
    'expiry_date',
    'actual_date',
    /^.*end.*$/,
    /^.*_to$/,
    /^.*expir.*$/,
  ]);
  const resourceField = findFieldKey(allFields, table, [
    'resource_id',
    'machine_id',
    'equipment_id',
    'work_center_id',
    'workstation_id',
    'line_id',
    'asset_id',
    'location_id',
    'functional_location_id',
    'supplier_id',
    'vendor_id',
    'employee_id',
    'user_id',
    'party_id',
    'org_plant_id',
    'org_site_id',
    'plant_id',
    'site_id',
    /^.*resource.*$/,
    /^.*machine.*$/,
    /^.*equipment.*$/,
    /^.*_id$/,
  ]);
  const operationField = findFieldKey(allFields, table, [
    'operation_id',
    'operation_seq',
    'routing_operation_id',
    'operation_code',
    'step_code',
    'step_id',
    'task_id',
    'task_code',
    'process_step',
    'activity_id',
    'job_operation_id',
    /^operation_/,
    /^step_/,
    /^task_/,
  ]);
  const traceabilityField = findFieldKey(allFields, table, [
    'lot_id',
    'lot_no',
    'serial_id',
    'serial_no',
    'child_lot_no',
    'child_serial_no',
    'genealogy_link_id',
    'source_record_id',
    'record_id',
    'trace_id',
    'batch_id',
    'batch_no',
    'tracking_id',
    'reference_id',
    'parent_id',
    /^lot_/,
    /^serial_/,
    /^genealogy_/,
    /^trace_/,
    /^batch_/,
    /^tracking_/,
  ]);
  const instructionSignal = hasFieldMatch(allFields, table, [
    'instruction_title',
    'drawing_reference',
    'procedure_reference',
    'sop_reference',
    'method_reference',
    'specification_reference',
    'notes',
    'description',
    /^instruction_/,
    /^work_instruction/,
    /^procedure_/,
    /^sop_/,
  ]);
  const attachmentSignal = hasFieldMatch(allFields, table, [
    'attachment_type',
    'file_name',
    'document_no',
    'evidence_id',
    'report_file',
    'certificate_file',
    'photo_url',
    'image_url',
    'drawing_reference',
    'specification_reference',
    /^attachment_/,
    /^document_/,
    /^file_/,
    /^evidence_/,
    /^report_/,
    /^certificate_/,
  ]) || relations.incoming.some((relation) => /(attachment|document|file|evidence|record)/.test(String(relation.entity || '').toLowerCase())) || Boolean(attachmentContract);
  const collaborationSignal = relations.incoming.some((relation) => /(comment|note|activity|task|message|approval)/.test(String(relation.entity || '').toLowerCase())) || Boolean(commentContract || activityContract);
  const formulaCount = formulaCountForDomain(formulas, table.domain, profile);
  const sections = detailSections(detailFields);
  const detailBlockers = [];
  const listBlockers = [];
  const formBlockers = [];
  const relatedBlockers = [];
  const workflowBlockers = [];
  const timelineBlockers = [];
  const attachmentBlockers = [];
  const collaborationBlockers = [];
  const analyticsBlockers = [];
  const planningBlockers = [];
  const operatorBlockers = [];
  const timelineSources = [];

  if (createdAtField) {
    timelineSources.push({
      kind: 'record_created',
      subject_field: createdAtField,
      endpoint: detailEndpoint?.action || null,
    });
  }
  if (updatedAtField && updatedAtField !== createdAtField) {
    timelineSources.push({
      kind: 'record_updated',
      subject_field: updatedAtField,
      endpoint: detailEndpoint?.action || null,
    });
  }
  if (commentContract) {
    timelineSources.push({
      kind: 'comments',
      endpoint: commentContract.list_endpoint,
      timestamp_field: commentContract.timeline_field,
      binding_mode: commentContract.default_binding_mode,
    });
  }
  if (activityContract) {
    timelineSources.push({
      kind: 'activities',
      endpoint: activityContract.list_endpoint,
      timestamp_field: activityContract.timeline_field,
      binding_mode: activityContract.default_binding_mode,
    });
  }
  if (attachmentContract) {
    timelineSources.push({
      kind: 'attachments',
      endpoint: attachmentContract.list_endpoint,
      timestamp_field: attachmentContract.timeline_field,
      binding_mode: attachmentContract.default_binding_mode,
    });
  }

  if (!detailEndpoint) detailBlockers.push('missing_detail_endpoint');
  if (!titleField) detailBlockers.push('missing_title_field');
  if (!sections.length) detailBlockers.push('missing_detail_sections');
  if (!listEndpoint) listBlockers.push('missing_list_endpoint');
  if (listFields.length < 4) listBlockers.push('insufficient_list_fields');
  if (!createEndpoint && !updateEndpoint) formBlockers.push('missing_form_mutation_endpoints');
  if (!createFields.length && !updateFields.length) formBlockers.push('missing_editable_fields');
  if (!relations.incoming.length && !relations.outgoing.length) relatedBlockers.push('missing_relation_topology');
  if (table?.statusColumn && !statusField) workflowBlockers.push('missing_status_field_contract');
  if (workflowRuntime?.execution_mode === 'workflow_engine_required') workflowBlockers.push('workflow_engine_bridge_blocked');
  if ((table?.workflowId || statusField) && !createdAtField && !updatedAtField) timelineBlockers.push('missing_record_timestamps');
  if (['governed_case', 'document_record', 'transactional_record', 'operator_console'].includes(profile) && !attachmentSignal) {
    attachmentBlockers.push('missing_attachment_contract');
  }
  if ((table?.workflowId || profile === 'service_workspace') && !ownerField && !collaborationSignal) {
    collaborationBlockers.push('missing_assignment_or_activity_contract');
  }
  if ((profile === 'governed_case' || profile === 'transactional_record' || profile === 'planning_console') && formulaCount === 0) {
    analyticsBlockers.push('missing_formula_or_aggregate_contract');
  }
  if (profile === 'planning_console') {
    if (!startDateField && !dueDateField) planningBlockers.push('missing_planning_time_axis');
    if (!resourceField) planningBlockers.push('missing_resource_dimension');
    if (!statusField) planningBlockers.push('missing_planning_status_dimension');
  }
  if (profile === 'operator_console') {
    if (!operationField) operatorBlockers.push('missing_operation_context');
    if (!resourceField) operatorBlockers.push('missing_station_or_resource_context');
    if (!traceabilityField) operatorBlockers.push('missing_traceability_identity');
    if (!instructionSignal && !attachmentSignal) operatorBlockers.push('missing_work_instruction_signal');
    if (!statusField) operatorBlockers.push('missing_execution_status');
  }

  const capabilities = {
    list: capabilityContract(true, listBlockers.length === 0, listBlockers, {
      endpoint: listEndpoint?.action || null,
      searchable_fields: listEndpoint?.capabilities?.searchable_fields || [],
      sortable_fields: listEndpoint?.capabilities?.sortable_fields || [],
      filterable_fields: listEndpoint?.capabilities?.filterable_fields || [],
      default_columns: fieldKeys(listFields).slice(0, 10),
    }),
    detail: capabilityContract(true, detailBlockers.length === 0, detailBlockers, {
      endpoint: detailEndpoint?.action || null,
      sections,
      hero_fields: uniqueStrings([titleField, subtitleField, statusField, ownerField, updatedAtField, dueDateField]).slice(0, 6),
      quick_view_refs: relations.outgoing,
      related_lists: relations.incoming,
    }),
    form: capabilityContract(true, formBlockers.length === 0, formBlockers, {
      create_endpoint: createEndpoint?.action || null,
      update_endpoint: updateEndpoint?.action || null,
      editable_fields: fieldKeys(uniqueFields([...createFields, ...updateFields])).slice(0, 20),
      required_fields: fieldKeys(uniqueFields([...createFields, ...updateFields].filter((field) => field.required))).slice(0, 12),
    }),
    workflow: capabilityContract(Boolean(table?.statusColumn), Boolean(table?.statusColumn) && workflowBlockers.length === 0, workflowBlockers, {
      transition_endpoint: transitionEndpoint?.action || null,
      execution_mode: workflowRuntime?.execution_mode || 'not_applicable',
      lifecycle_mode: workflowRuntime?.lifecycle_mode || 'stateless',
      transition_guard: workflowRuntime?.transition_execution_guard || null,
      transition_targets: transitionEndpoint?.capabilities?.transition_targets || [],
    }),
    related_data: capabilityContract(relations.incoming.length > 0 || relations.outgoing.length > 0, relatedBlockers.length === 0, relatedBlockers, {
      related_lists: relations.incoming,
      quick_view_refs: relations.outgoing,
      relation_count: relations.incoming.length + relations.outgoing.length,
    }),
    timeline: capabilityContract(Boolean(table?.workflowId || createdAtField || updatedAtField || timelineSources.length), timelineBlockers.length === 0, timelineBlockers, {
      created_at_field: createdAtField,
      updated_at_field: updatedAtField,
      audit_ready: Boolean(createdAtField && updatedAtField && table?.workflowId),
      activity_ready: Boolean(commentContract || activityContract || collaborationSignal),
      sources: timelineSources,
    }, Boolean(createdAtField || updatedAtField || timelineSources.length)),
    attachments: capabilityContract(['governed_case', 'document_record', 'transactional_record', 'operator_console'].includes(profile), attachmentBlockers.length === 0, attachmentBlockers, {
      signal_fields: uniqueStrings(fieldKeys(allFields).filter((field) => /(attachment|document|file|evidence)/.test(String(field || '').toLowerCase()))).slice(0, 8),
      related_entities: relations.incoming.filter((relation) => /(attachment|document|file|evidence|record)/.test(String(relation.entity || '').toLowerCase())),
      contract: attachmentContract,
    }),
    collaboration: capabilityContract(Boolean(table?.workflowId || ownerField || collaborationSignal), collaborationBlockers.length === 0, collaborationBlockers, {
      owner_field: ownerField,
      activity_entities: relations.incoming.filter((relation) => /(comment|note|activity|task|message|approval)/.test(String(relation.entity || '').toLowerCase())),
      comment_contract: commentContract,
      activity_contract: activityContract,
    }, Boolean(ownerField || collaborationSignal)),
    analytics: capabilityContract(['governed_case', 'transactional_record', 'planning_console', 'operator_console'].includes(profile), formulaCount > 0 && analyticsBlockers.length === 0, analyticsBlockers, {
      formula_count: formulaCount,
      time_fields: uniqueStrings([createdAtField, updatedAtField, startDateField, endDateField, dueDateField]).slice(0, 5),
      status_field: statusField,
    }, formulaCount > 0 || Boolean(statusField && (createdAtField || updatedAtField))),
    planning_board: capabilityContract(profile === 'planning_console', planningBlockers.length === 0, planningBlockers, {
      time_axis_fields: uniqueStrings([startDateField, endDateField, dueDateField]).slice(0, 3),
      resource_field: resourceField,
      status_field: statusField,
    }),
    operator_console: capabilityContract(profile === 'operator_console', operatorBlockers.length === 0, operatorBlockers, {
      operation_field: operationField,
      resource_field: resourceField,
      traceability_field: traceabilityField,
      instruction_signal: instructionSignal,
      offline_candidate: Boolean(profile === 'operator_console' && (resourceField || operationField)),
    }),
  };

  const weights = {
    list: 12,
    detail: 16,
    form: 12,
    related_data: 10,
    workflow: 14,
    timeline: 10,
    attachments: 8,
    collaboration: 6,
    analytics: 8,
    planning_board: 7,
    operator_console: 7,
  };
  let weightedScore = 0;
  let totalWeight = 0;
  for (const [key, capability] of Object.entries(capabilities)) {
    const weight = weights[key] || 5;
    const multiplier = capability.state === 'ready'
      ? 1
      : (capability.state === 'partial' || capability.state === 'not_applicable' ? 0.6 : 0);
    totalWeight += weight;
    weightedScore += weight * multiplier;
  }
  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  const blockers = uniqueStrings(Object.values(capabilities).flatMap((capability) => capability.blockers || []));
  const warningSet = [];
  if (!subtitleField) warningSet.push('missing_subtitle_field');
  if (!ownerField && ['governed_case', 'service_workspace', 'operator_console'].includes(profile)) warningSet.push('missing_owner_field');
  if (!updatedAtField) warningSet.push('missing_updated_at_field');
  if (!relations.incoming.length) warningSet.push('no_reverse_related_lists');
  if (!relations.outgoing.length) warningSet.push('no_lookup_reference_panels');

  return {
    entity_key: prefix,
    domain: table.domain,
    entity: tableName,
    profile,
    recommended_patterns: recommendedPatternsForProfile(profile),
    actions: {
      list: listEndpoint?.action || null,
      detail: detailEndpoint?.action || null,
      create: createEndpoint?.action || null,
      update: updateEndpoint?.action || null,
      transition: transitionEndpoint?.action || null,
      delete: deleteEndpoint?.action || null,
    },
    semantic_slots: {
      title_field: titleField,
      subtitle_field: subtitleField,
      status_field: statusField,
      owner_field: ownerField,
      updated_at_field: updatedAtField,
      created_at_field: createdAtField,
      due_date_field: dueDateField,
      start_date_field: startDateField,
      end_date_field: endDateField,
      resource_field: resourceField,
      operation_field: operationField,
      traceability_field: traceabilityField,
    },
    detail_layout: {
      sections,
      quick_view_refs: relations.outgoing,
      related_lists: relations.incoming,
    },
    interaction_contracts: {
      attachments: attachmentContract,
      comments: commentContract,
      activities: activityContract,
      timeline_sources: timelineSources,
    },
    capabilities,
    readiness: {
      score,
      verdict: blockers.length === 0 && score >= 80
        ? 'ready'
        : (score >= 55 ? 'partial' : 'blocked'),
      blockers,
      warnings: uniqueStrings(warningSet),
    },
  };
}

function buildFrontendFoundationCatalog(tableRegistry, dataFields, endpointCatalog, relationMap, formulas) {
  const entities = {};
  const summary = {
    entity_count: 0,
    ready_entities: 0,
    partial_entities: 0,
    blocked_entities: 0,
    workflow_ready_entities: 0,
    related_ready_entities: 0,
    analytics_ready_entities: 0,
    planning_console_entities: 0,
    operator_console_entities: 0,
    attachment_contract_entities: 0,
    comment_contract_entities: 0,
    activity_contract_entities: 0,
  };

  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    const contract = frontendFoundationContract(tableName, table, dataFields, endpointCatalog, relationMap, tableRegistry, formulas);
    entities[contract.entity_key] = contract;
    summary.entity_count += 1;
    if (contract.readiness.verdict === 'ready') summary.ready_entities += 1;
    if (contract.readiness.verdict === 'partial') summary.partial_entities += 1;
    if (contract.readiness.verdict === 'blocked') summary.blocked_entities += 1;
    if (contract.capabilities.workflow.state === 'ready') summary.workflow_ready_entities += 1;
    if (contract.capabilities.related_data.state === 'ready') summary.related_ready_entities += 1;
    if (contract.capabilities.analytics.state === 'ready') summary.analytics_ready_entities += 1;
    if (contract.profile === 'planning_console') summary.planning_console_entities += 1;
    if (contract.profile === 'operator_console') summary.operator_console_entities += 1;
    if (contract.interaction_contracts?.attachments?.list_endpoint) summary.attachment_contract_entities += 1;
    if (contract.interaction_contracts?.comments?.list_endpoint) summary.comment_contract_entities += 1;
    if (contract.interaction_contracts?.activities?.list_endpoint) summary.activity_contract_entities += 1;
  }

  return {
    _meta: {
      version: '1.0',
      description: 'Frontend-first capability blueprint generated from runtime registry artifacts and table metadata.',
      generatedAt,
    },
    summary,
    entities,
  };
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
    const workflow = workflowContract(tableName, table, workflowLibrary);
    const deletion = deleteContract(tableName, table);
    const contract = requestContract(kind, tableName, table, fields, statusOptions);
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
      workflow,
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
        workflow_runtime: workflow.runtime,
        deletion,
      },
      request: contract,
      response: responseContract(kind, tableName, table, ['create', 'update', 'delete', 'transition'].includes(kind) && detailFields.length ? detailFields : fields),
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

function buildRuntimeAccessPolicy(tableRegistry, domainArchitecture) {
  const domainKeys = new Set(Object.keys(domainArchitecture.domains || {}));
  for (const table of Object.values(tableRegistry.tables || {})) {
    if (table?.domain) {
      domainKeys.add(String(table.domain));
    }
  }

  const domains = {};
  for (const domain of Array.from(domainKeys).sort()) {
    domains[domain] = runtimeAccessProfileForDomain(domain);
  }

  const tables = {};
  for (const [tableName, table] of Object.entries(tableRegistry.tables || {})) {
    const override = runtimeAccessProfileForTable(tableName, table);
    if (override) {
      tables[tableName] = override;
    }
  }

  return {
    _meta: {
      version: '1.0',
      generatedAt,
      description: 'Runtime access policy generated from domain architecture and table-registry defaults.',
      domainPolicyCount: Object.keys(domains).length,
      tableOverrideCount: Object.keys(tables).length,
    },
    defaults: runtimeAccessTemplate(),
    domains,
    tables,
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

function buildManifest(endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, fieldTypes, dataFields, frontendFoundation) {
  const endpointCount = Object.keys(endpointCatalog.endpoints || {}).length;
  const packCount = Object.keys(packs.packs || {}).length;
  const relationCount = (relationMap.edges || relationMap.relations || []).length;
  const workflowCount = Object.keys(workflowLibrary.workflows || workflowLibrary).filter((key) => key !== '_meta').length;
  const statusCount = Object.keys(statusOptions).filter((key) => key !== '_meta').length;
  const fieldTypeCount = Object.keys(fieldTypes).filter((key) => key !== '_meta').length;
  const ruleCount = (validationRules.rules || validationRules).length;
  const formulaCount = Object.keys(formulas).filter((key) => key !== '_meta').length;
  const fieldRegistryActionCount = Object.keys(dataFields).filter((key) => key !== '_meta' && Array.isArray(dataFields[key])).length;
  const workflowRuntimeModes = { stateless: 0, generic_status_only: 0, persisted: 0, unknown: 0 };
  const deletionModes = { hard_delete: 0, soft_delete: 0, archive_only: 0 };
  const engineBridgeCounts = { ready: 0, blocked: 0, unneeded: 0 };
  const frontendFoundationSummary = frontendFoundation?.summary || {};
  const uniqueFieldKeys = new Set();
  let fieldDefinitions = 0;

  for (const [endpoint, fields] of Object.entries(dataFields)) {
    if (endpoint === '_meta' || !Array.isArray(fields)) continue;
    for (const field of fields) {
      fieldDefinitions += 1;
      if (field && field.key) uniqueFieldKeys.add(field.key);
    }
  }

  for (const endpoint of Object.values(endpointCatalog.endpoints || {})) {
    if (endpoint?.kind === 'list') {
      const workflowMode = String(endpoint?.workflow?.lifecycle_mode || 'unknown');
      if (workflowRuntimeModes[workflowMode] != null) {
        workflowRuntimeModes[workflowMode] += 1;
      } else {
        workflowRuntimeModes.unknown += 1;
      }

      const deletionMode = String(endpoint?.capabilities?.deletion?.mode || 'hard_delete');
      if (deletionModes[deletionMode] != null) {
        deletionModes[deletionMode] += 1;
      }

      const workflowRuntime = endpoint?.capabilities?.workflow_runtime || endpoint?.workflow?.runtime || {};
      if (workflowRuntime?.lifecycle_mode === 'persisted') {
        if (workflowRuntime?.engine_bridge?.ready) {
          engineBridgeCounts.ready += 1;
        } else {
          engineBridgeCounts.blocked += 1;
        }
      } else {
        engineBridgeCounts.unneeded += 1;
      }
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
      workflow_runtime_modes: workflowRuntimeModes,
      deletion_modes: deletionModes,
      workflow_engine_bridge: engineBridgeCounts,
      frontend_foundation: {
        entity_count: frontendFoundationSummary.entity_count || 0,
        ready_entities: frontendFoundationSummary.ready_entities || 0,
        partial_entities: frontendFoundationSummary.partial_entities || 0,
        blocked_entities: frontendFoundationSummary.blocked_entities || 0,
        workflow_ready_entities: frontendFoundationSummary.workflow_ready_entities || 0,
        related_ready_entities: frontendFoundationSummary.related_ready_entities || 0,
        analytics_ready_entities: frontendFoundationSummary.analytics_ready_entities || 0,
        planning_console_entities: frontendFoundationSummary.planning_console_entities || 0,
        operator_console_entities: frontendFoundationSummary.operator_console_entities || 0,
      },
    },
    assets: {
      'data-fields-index.json': { kind: 'field-registry-index', records: fieldRegistryActionCount },
      'endpoint-catalog.json': { kind: 'endpoint-catalog', records: endpointCount },
      'runtime-access-policy.json': { kind: 'runtime-access-policy', records: 1 },
      'domain-field-packs.json': { kind: 'pack-library', records: packCount },
      'relation-map.json': { kind: 'relation-map', records: relationCount },
      'frontend-foundation-catalog.json': { kind: 'frontend-foundation-catalog', records: frontendFoundationSummary.entity_count || 0 },
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

function buildQualityReport(tableRegistry, dataFields, endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, frontendFoundation) {
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
  const transitionRuntimeWarnings = [];
  const workflowEngineBridgeWarnings = [];
  const deleteGovernanceWarnings = [];
  const workflowLifecycleModes = { stateless: 0, generic_status_only: 0, persisted: 0, unknown: 0 };
  const deletionModes = { hard_delete: 0, soft_delete: 0, archive_only: 0 };
  const workflowEngineBridgeCounts = { ready: 0, blocked: 0 };
  const frontendEntities = frontendFoundation?.entities || {};
  const frontendContracts = Object.values(frontendEntities);
  const frontendReadyEntities = frontendContracts.filter((entity) => entity?.readiness?.verdict === 'ready');
  const frontendPartialEntities = frontendContracts.filter((entity) => entity?.readiness?.verdict === 'partial');
  const frontendBlockedEntities = frontendContracts.filter((entity) => entity?.readiness?.verdict === 'blocked');
  const attachmentContractEntities = frontendContracts.filter((entity) => entity?.interaction_contracts?.attachments?.list_endpoint);
  const commentContractEntities = frontendContracts.filter((entity) => entity?.interaction_contracts?.comments?.list_endpoint);
  const activityContractEntities = frontendContracts.filter((entity) => entity?.interaction_contracts?.activities?.list_endpoint);
  const frontendFoundationWarnings = frontendBlockedEntities.slice(0, 60).map((entity) => ({
    entity_key: entity?.entity_key || '',
    profile: entity?.profile || '',
    blockers: entity?.readiness?.blockers || [],
    score: entity?.readiness?.score ?? 0,
  }));

  for (const tableName of tableNames) {
    const table = tableRegistry.tables[tableName];
    const domain = table.domain;
    const supportedKinds = new Set(supportedEndpointKinds(table));
    const pk = primaryKeyMeta(table);
    const workflowMeta = workflowRuntimeContract(tableName, table, workflowLibrary);
    const deletionMeta = deleteContract(tableName, table);
    if (workflowLifecycleModes[workflowMeta.lifecycle_mode] != null) {
      workflowLifecycleModes[workflowMeta.lifecycle_mode] += 1;
    } else {
      workflowLifecycleModes.unknown += 1;
    }
    if (deletionModes[deletionMeta.mode] != null) {
      deletionModes[deletionMeta.mode] += 1;
    }

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

    if (workflowMeta.engine_bridge_required) {
      transitionRuntimeWarnings.push({
        table: tableName,
        workflowId: table.workflowId,
        lifecycle_mode: workflowMeta.lifecycle_mode,
        execution_mode: workflowMeta.execution_mode,
        warning: 'Persisted workflow currently exceeds the guarantees of plain generic status updates.',
      });
    }

    if (workflowMeta.lifecycle_mode === 'persisted') {
      if (workflowMeta.engine_bridge?.ready) {
        workflowEngineBridgeCounts.ready += 1;
      } else {
        workflowEngineBridgeCounts.blocked += 1;
        workflowEngineBridgeWarnings.push({
          table: tableName,
          workflowId: table.workflowId,
          record_type: workflowMeta.engine_bridge?.record_type || null,
          identity_field: workflowMeta.engine_bridge?.identity_field || null,
          state_alignment_ratio: workflowMeta.engine_bridge?.state_alignment_ratio ?? 0,
          block_reasons: workflowMeta.engine_bridge?.block_reasons || [],
          advisory: workflowMeta.engine_bridge?.advisory || workflowMeta.advisory || '',
        });
      }
    }

    if (deletionMeta.mode === 'archive_only') {
      deleteGovernanceWarnings.push({
        table: tableName,
        domain,
        mode: deletionMeta.mode,
        governance_level: deletionMeta.governance_level,
      });
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
    { id: 'frontend_foundation_coverage', passed: frontendContracts.length === tableNames.length, actual: frontendContracts.length, target: tableNames.length },
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

  const publishabilityChecks = [
    {
      id: 'frontend_entities_publishable',
      passed: frontendPartialEntities.length === 0 && frontendBlockedEntities.length === 0,
      actual: frontendPartialEntities.length + frontendBlockedEntities.length,
      target: 0,
    },
    {
      id: 'workflow_engine_bridges_ready',
      passed: workflowEngineBridgeCounts.blocked === 0,
      actual: workflowEngineBridgeCounts.blocked,
      target: 0,
    },
    {
      id: 'record_endpoint_contracts_clean',
      passed: unsupportedRecordEndpoints.length === 0 && contractIssues.length === 0,
      actual: unsupportedRecordEndpoints.length + contractIssues.length,
      target: 0,
    },
  ];
  const integrityPassed = checks.every((check) => check.passed);
  const publishabilityReady = publishabilityChecks.every((check) => check.passed);

  return {
    _meta: {
      version: '5.0',
      description: 'Internal quality report for registry-backed Module Builder assets.',
      generatedAt,
      integrity_gate: 'all_passed',
      publishability_gate: 'publishability.ready',
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
      transition_runtime_warnings: transitionRuntimeWarnings.length,
      workflow_engine_bridge_ready: workflowEngineBridgeCounts.ready,
      workflow_engine_bridge_blocked: workflowEngineBridgeCounts.blocked,
      archive_only_tables: deletionModes.archive_only,
      soft_delete_tables: deletionModes.soft_delete,
      hard_delete_tables: deletionModes.hard_delete,
      workflow_lifecycle_modes: workflowLifecycleModes,
      frontend_foundation_entities: frontendContracts.length,
      frontend_ready_entities: frontendReadyEntities.length,
      frontend_partial_entities: frontendPartialEntities.length,
      frontend_blocked_entities: frontendBlockedEntities.length,
      attachment_contract_entities: attachmentContractEntities.length,
      comment_contract_entities: commentContractEntities.length,
      activity_contract_entities: activityContractEntities.length,
      publishability_ready: publishabilityReady,
      publishability_review_required_entities: frontendPartialEntities.length + frontendBlockedEntities.length,
    },
    publishability: {
      ready: publishabilityReady,
      status: publishabilityReady ? 'ready' : 'review_required',
      review_required: !publishabilityReady,
      failed_checks: publishabilityChecks.filter((check) => !check.passed),
      blocking_counts: {
        frontend_partial_entities: frontendPartialEntities.length,
        frontend_blocked_entities: frontendBlockedEntities.length,
        workflow_engine_bridge_blocked: workflowEngineBridgeCounts.blocked,
        unsupported_record_endpoints: unsupportedRecordEndpoints.length,
        contract_issues: contractIssues.length,
      },
      recommended_next_actions: publishabilityReady ? [] : [
        'Promote partial frontend foundation entities into publishable contracts.',
        'Bridge persisted workflows into the workflow engine before exposing transition UX.',
        'Resolve remaining record endpoint/runtime contract gaps before publishing modules.',
      ],
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
      transition_runtime_warnings: transitionRuntimeWarnings.slice(0, 40),
      workflow_engine_bridge: workflowEngineBridgeWarnings.slice(0, 40),
      delete_governance: deleteGovernanceWarnings.slice(0, 60),
      frontend_foundation: frontendFoundationWarnings,
    },
    all_passed: integrityPassed,
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
  const runtimeAccessPolicy = buildRuntimeAccessPolicy(tableRegistry, domainArchitecture);
  const packs = buildDomainFieldPacks(tableRegistry, dataFields);
  const relationMap = buildRelationMap(tableRegistry);
  const frontendFoundation = buildFrontendFoundationCatalog(tableRegistry, dataFields, endpointCatalog, relationMap, formulas);
  const manifest = buildManifest(endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, fieldTypes, dataFields, frontendFoundation);
  const qualityReport = buildQualityReport(tableRegistry, dataFields, endpointCatalog, packs, relationMap, workflowLibrary, validationRules, formulas, statusOptions, frontendFoundation);

  writeJson(path.join(registryDir, 'endpoint-catalog.json'), endpointCatalog);
  writeJson(path.join(registryDir, 'runtime-access-policy.json'), runtimeAccessPolicy);
  writeJson(path.join(registryDir, 'domain-field-packs.json'), packs);
  writeJson(path.join(registryDir, 'relation-map.json'), relationMap);
  writeJson(path.join(registryDir, 'frontend-foundation-catalog.json'), frontendFoundation);
  writeJson(path.join(registryDir, 'registry-manifest.json'), manifest);
  writeJson(path.join(registryDir, 'registry-quality-report.json'), qualityReport);

  console.log(JSON.stringify({
    endpointCount: Object.keys(endpointCatalog.endpoints).length,
    runtimePolicyDomains: Object.keys(runtimeAccessPolicy.domains || {}).length,
    packCount: Object.keys(packs.packs).length,
    relationCount: relationMap.edges.length,
    frontendFoundationEntities: Object.keys(frontendFoundation.entities || {}).length,
    qualityChecksPassed: qualityReport.all_passed,
  }, null, 2));
}

main();
