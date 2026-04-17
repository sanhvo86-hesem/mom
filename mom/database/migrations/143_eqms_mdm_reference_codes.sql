-- Migration: 143_eqms_mdm_reference_codes.sql
-- Description: Seed governed EQMS reference-code sets for DB-backed dropdowns.
-- Dependencies: 064_master_data_governance.sql
-- Rollback: DELETE FROM mdm_reference_code_values WHERE mdm_reference_code_id IN (SELECT mdm_reference_code_id FROM mdm_reference_codes WHERE code_set LIKE 'eqms.%'); DELETE FROM mdm_reference_codes WHERE code_set LIKE 'eqms.%';

BEGIN;

CREATE TEMP TABLE _eqms_reference_seed (
    code_set    VARCHAR(50)  NOT NULL,
    description VARCHAR(200) NOT NULL,
    code_value  VARCHAR(80)  NOT NULL,
    value_label VARCHAR(200) NOT NULL,
    sort_order  INT          NOT NULL
) ON COMMIT DROP;

INSERT INTO _eqms_reference_seed (code_set, description, code_value, value_label, sort_order) VALUES
('eqms.status', 'Common governed EQMS workflow states.', 'draft', 'Draft', 10),
('eqms.status', 'Common governed EQMS workflow states.', 'open', 'Open', 20),
('eqms.status', 'Common governed EQMS workflow states.', 'in_progress', 'In progress', 30),
('eqms.status', 'Common governed EQMS workflow states.', 'under_review', 'Under review', 40),
('eqms.status', 'Common governed EQMS workflow states.', 'pending_approval', 'Pending approval', 50),
('eqms.status', 'Common governed EQMS workflow states.', 'approved', 'Approved', 60),
('eqms.status', 'Common governed EQMS workflow states.', 'active', 'Active', 70),
('eqms.status', 'Common governed EQMS workflow states.', 'assigned', 'Assigned', 80),
('eqms.status', 'Common governed EQMS workflow states.', 'completed', 'Completed', 90),
('eqms.status', 'Common governed EQMS workflow states.', 'closed', 'Closed', 100),
('eqms.status', 'Common governed EQMS workflow states.', 'cancelled', 'Cancelled', 110),
('eqms.status', 'Common governed EQMS workflow states.', 'rejected', 'Rejected', 120),
('eqms.status', 'Common governed EQMS workflow states.', 'on_hold', 'On hold', 130),
('eqms.status', 'Common governed EQMS workflow states.', 'overdue', 'Overdue', 140),
('eqms.status', 'Common governed EQMS workflow states.', 'expired', 'Expired', 150),

('eqms.severity', 'EQMS severity levels.', 'critical', 'Critical', 10),
('eqms.severity', 'EQMS severity levels.', 'major', 'Major', 20),
('eqms.severity', 'EQMS severity levels.', 'minor', 'Minor', 30),
('eqms.severity', 'EQMS severity levels.', 'high', 'High', 40),
('eqms.severity', 'EQMS severity levels.', 'medium', 'Medium', 50),
('eqms.severity', 'EQMS severity levels.', 'low', 'Low', 60),

('eqms.priority', 'EQMS priority levels.', 'critical', 'Critical', 10),
('eqms.priority', 'EQMS priority levels.', 'high', 'High', 20),
('eqms.priority', 'EQMS priority levels.', 'medium', 'Medium', 30),
('eqms.priority', 'EQMS priority levels.', 'low', 'Low', 40),

('eqms.source_type', 'EQMS source and trigger types.', 'customer', 'Customer', 10),
('eqms.source_type', 'EQMS source and trigger types.', 'field', 'Field', 20),
('eqms.source_type', 'EQMS source and trigger types.', 'distributor', 'Distributor', 30),
('eqms.source_type', 'EQMS source and trigger types.', 'internal', 'Internal', 40),
('eqms.source_type', 'EQMS source and trigger types.', 'production', 'Production', 50),
('eqms.source_type', 'EQMS source and trigger types.', 'receiving', 'Receiving inspection', 60),
('eqms.source_type', 'EQMS source and trigger types.', 'audit', 'Audit', 70),
('eqms.source_type', 'EQMS source and trigger types.', 'process', 'Process', 80),
('eqms.source_type', 'EQMS source and trigger types.', 'ncr', 'NCR', 90),
('eqms.source_type', 'EQMS source and trigger types.', 'complaint', 'Complaint', 100),
('eqms.source_type', 'EQMS source and trigger types.', 'deviation', 'Deviation', 110),
('eqms.source_type', 'EQMS source and trigger types.', 'spc', 'SPC signal', 120),
('eqms.source_type', 'EQMS source and trigger types.', 'other', 'Other', 130),

('eqms.change_type', 'EQMS change-control types.', 'document', 'Document', 10),
('eqms.change_type', 'EQMS change-control types.', 'process', 'Process', 20),
('eqms.change_type', 'EQMS change-control types.', 'product', 'Product', 30),
('eqms.change_type', 'EQMS change-control types.', 'equipment', 'Equipment', 40),
('eqms.change_type', 'EQMS change-control types.', 'system', 'System', 50),
('eqms.change_type', 'EQMS change-control types.', 'quality', 'Quality system', 60),
('eqms.change_type', 'EQMS change-control types.', 'regulatory', 'Regulatory', 70),
('eqms.change_type', 'EQMS change-control types.', 'facility', 'Facility', 80),
('eqms.change_type', 'EQMS change-control types.', 'design', 'Design', 90),
('eqms.change_type', 'EQMS change-control types.', 'material', 'Material', 100),
('eqms.change_type', 'EQMS change-control types.', 'tooling', 'Tooling', 110),
('eqms.change_type', 'EQMS change-control types.', 'supplier', 'Supplier', 120),

('eqms.change_category', 'EQMS engineering/change categories.', 'major', 'Major', 10),
('eqms.change_category', 'EQMS engineering/change categories.', 'minor', 'Minor', 20),
('eqms.change_category', 'EQMS engineering/change categories.', 'administrative', 'Administrative', 30),
('eqms.change_category', 'EQMS engineering/change categories.', 'design', 'Design', 40),
('eqms.change_category', 'EQMS engineering/change categories.', 'material', 'Material', 50),
('eqms.change_category', 'EQMS engineering/change categories.', 'process', 'Process', 60),
('eqms.change_category', 'EQMS engineering/change categories.', 'tooling', 'Tooling', 70),
('eqms.change_category', 'EQMS engineering/change categories.', 'supplier', 'Supplier', 80),

('eqms.deviation_type', 'EQMS deviation types.', 'planned', 'Planned', 10),
('eqms.deviation_type', 'EQMS deviation types.', 'unplanned', 'Unplanned', 20),
('eqms.deviation_type', 'EQMS deviation types.', 'emergency', 'Emergency', 30),
('eqms.deviation_type', 'EQMS deviation types.', 'process', 'Process', 40),
('eqms.deviation_type', 'EQMS deviation types.', 'product', 'Product', 50),
('eqms.deviation_type', 'EQMS deviation types.', 'material', 'Material', 60),
('eqms.deviation_type', 'EQMS deviation types.', 'system', 'System', 70),
('eqms.deviation_type', 'EQMS deviation types.', 'environmental', 'Environmental', 80),

('eqms.document_type', 'EQMS document types.', 'SOP', 'SOP', 10),
('eqms.document_type', 'EQMS document types.', 'WI', 'Work instruction', 20),
('eqms.document_type', 'EQMS document types.', 'form', 'Form', 30),
('eqms.document_type', 'EQMS document types.', 'policy', 'Policy', 40),
('eqms.document_type', 'EQMS document types.', 'spec', 'Specification', 50),
('eqms.document_type', 'EQMS document types.', 'record', 'Record', 60),
('eqms.document_type', 'EQMS document types.', 'procedure', 'Procedure', 70),
('eqms.document_type', 'EQMS document types.', 'manual', 'Manual', 80),

('eqms.audit_type', 'EQMS audit types.', 'internal', 'Internal', 10),
('eqms.audit_type', 'EQMS audit types.', 'external', 'External', 20),
('eqms.audit_type', 'EQMS audit types.', 'supplier', 'Supplier', 30),
('eqms.audit_type', 'EQMS audit types.', 'regulatory', 'Regulatory', 40),
('eqms.audit_type', 'EQMS audit types.', 'onsite', 'Onsite', 50),
('eqms.audit_type', 'EQMS audit types.', 'remote', 'Remote', 60),
('eqms.audit_type', 'EQMS audit types.', 'document', 'Document', 70),

('eqms.standard_ref', 'Quality management standard references.', 'ISO 9001', 'ISO 9001', 10),
('eqms.standard_ref', 'Quality management standard references.', 'ISO 13485', 'ISO 13485', 20),
('eqms.standard_ref', 'Quality management standard references.', 'AS9100D', 'AS9100D', 30),
('eqms.standard_ref', 'Quality management standard references.', 'IATF 16949', 'IATF 16949', 40),
('eqms.standard_ref', 'Quality management standard references.', 'FDA 21 CFR 820', 'FDA 21 CFR 820', 50),
('eqms.standard_ref', 'Quality management standard references.', 'ISO 14001', 'ISO 14001', 60),
('eqms.standard_ref', 'Quality management standard references.', 'ISO 45001', 'ISO 45001', 70),

('eqms.risk_level', 'EQMS qualitative risk levels.', 'critical', 'Critical', 10),
('eqms.risk_level', 'EQMS qualitative risk levels.', 'high', 'High', 20),
('eqms.risk_level', 'EQMS qualitative risk levels.', 'medium', 'Medium', 30),
('eqms.risk_level', 'EQMS qualitative risk levels.', 'low', 'Low', 40),
('eqms.risk_level', 'EQMS qualitative risk levels.', 'negligible', 'Negligible', 50),

('eqms.disposition', 'NCR and batch disposition decisions.', 'rework', 'Rework', 10),
('eqms.disposition', 'NCR and batch disposition decisions.', 'repair', 'Repair', 20),
('eqms.disposition', 'NCR and batch disposition decisions.', 'use_as_is', 'Use as is', 30),
('eqms.disposition', 'NCR and batch disposition decisions.', 'return_to_vendor', 'Return to vendor', 40),
('eqms.disposition', 'NCR and batch disposition decisions.', 'scrap', 'Scrap', 50),
('eqms.disposition', 'NCR and batch disposition decisions.', 'release', 'Release', 60),
('eqms.disposition', 'NCR and batch disposition decisions.', 'conditional_release', 'Conditional release', 70),
('eqms.disposition', 'NCR and batch disposition decisions.', 'hold', 'Hold', 80),
('eqms.disposition', 'NCR and batch disposition decisions.', 'reject', 'Reject', 90),

('eqms.training_type', 'EQMS training delivery types.', 'read_and_sign', 'Read and sign', 10),
('eqms.training_type', 'EQMS training delivery types.', 'instructor_led', 'Instructor led', 20),
('eqms.training_type', 'EQMS training delivery types.', 'online', 'Online', 30),
('eqms.training_type', 'EQMS training delivery types.', 'on_the_job', 'On the job', 40),
('eqms.training_type', 'EQMS training delivery types.', 'exam', 'Exam', 50),

('eqms.category', 'Common EQMS category values.', 'visual', 'Visual', 10),
('eqms.category', 'Common EQMS category values.', 'dimensional', 'Dimensional', 20),
('eqms.category', 'Common EQMS category values.', 'functional', 'Functional', 30),
('eqms.category', 'Common EQMS category values.', 'material', 'Material', 40),
('eqms.category', 'Common EQMS category values.', 'contamination', 'Contamination', 50),
('eqms.category', 'Common EQMS category values.', 'documentation', 'Documentation', 60),
('eqms.category', 'Common EQMS category values.', 'process', 'Process', 70),
('eqms.category', 'Common EQMS category values.', 'product', 'Product', 80),
('eqms.category', 'Common EQMS category values.', 'supplier', 'Supplier', 90),
('eqms.category', 'Common EQMS category values.', 'regulatory', 'Regulatory', 100),
('eqms.category', 'Common EQMS category values.', 'system', 'System', 110),
('eqms.category', 'Common EQMS category values.', 'major', 'Major', 120),
('eqms.category', 'Common EQMS category values.', 'minor', 'Minor', 130),
('eqms.category', 'Common EQMS category values.', 'observation', 'Observation', 140),
('eqms.category', 'Common EQMS category values.', 'opportunity', 'Opportunity', 150),

('eqms.release_type', 'EQMS batch-release decision types.', 'standard', 'Standard release', 10),
('eqms.release_type', 'EQMS batch-release decision types.', 'expedited', 'Expedited release', 20),
('eqms.release_type', 'EQMS batch-release decision types.', 'conditional', 'Conditional release', 30),

('eqms.action_type', 'EQMS field-action types.', 'recall', 'Recall', 10),
('eqms.action_type', 'EQMS field-action types.', 'field_safety_notice', 'Field safety notice', 20),
('eqms.action_type', 'EQMS field-action types.', 'advisory', 'Advisory', 30),
('eqms.action_type', 'EQMS field-action types.', 'investigation', 'Investigation', 40),

('eqms.boolean', 'Generic governed yes-no values.', 'yes', 'Yes', 10),
('eqms.boolean', 'Generic governed yes-no values.', 'no', 'No', 20),

('eqms.type', 'Generic EQMS type values for legacy forms.', 'corrective', 'Corrective', 10),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'preventive', 'Preventive', 20),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'document', 'Document', 30),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'process', 'Process', 40),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'product', 'Product', 50),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'equipment', 'Equipment', 60),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'system', 'System', 70),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'supplier', 'Supplier', 80),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'internal', 'Internal', 90),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'external', 'External', 100),
('eqms.type', 'Generic EQMS type values for legacy forms.', 'regulatory', 'Regulatory', 110),

('eqms.classification', 'EQMS classification values.', 'internal', 'Internal', 10),
('eqms.classification', 'EQMS classification values.', 'confidential', 'Confidential', 20),
('eqms.classification', 'EQMS classification values.', 'restricted', 'Restricted', 30),
('eqms.classification', 'EQMS classification values.', 'process', 'Process', 40),
('eqms.classification', 'EQMS classification values.', 'product', 'Product', 50),
('eqms.classification', 'EQMS classification values.', 'material', 'Material', 60),
('eqms.classification', 'EQMS classification values.', 'system', 'System', 70),
('eqms.classification', 'EQMS classification values.', 'environmental', 'Environmental', 80),
('eqms.classification', 'EQMS classification values.', 'voluntary', 'Voluntary', 90),
('eqms.classification', 'EQMS classification values.', 'mandatory', 'Mandatory', 100),

('eqms.nc_type', 'NCR nonconformance types.', 'product', 'Product', 10),
('eqms.nc_type', 'NCR nonconformance types.', 'process', 'Process', 20),
('eqms.nc_type', 'NCR nonconformance types.', 'material', 'Material', 30),
('eqms.nc_type', 'NCR nonconformance types.', 'supplier', 'Supplier', 40),
('eqms.nc_type', 'NCR nonconformance types.', 'documentation', 'Documentation', 50),
('eqms.nc_type', 'NCR nonconformance types.', 'customer', 'Customer', 60),

('eqms.defect_type', 'EQMS defect types.', 'visual', 'Visual', 10),
('eqms.defect_type', 'EQMS defect types.', 'dimensional', 'Dimensional', 20),
('eqms.defect_type', 'EQMS defect types.', 'functional', 'Functional', 30),
('eqms.defect_type', 'EQMS defect types.', 'material', 'Material', 40),
('eqms.defect_type', 'EQMS defect types.', 'contamination', 'Contamination', 50),
('eqms.defect_type', 'EQMS defect types.', 'documentation', 'Documentation', 60),
('eqms.defect_type', 'EQMS defect types.', 'other', 'Other', 70),

('eqms.detection_method', 'EQMS detection methods.', 'customer_report', 'Customer report', 10),
('eqms.detection_method', 'EQMS detection methods.', 'field_service', 'Field service', 20),
('eqms.detection_method', 'EQMS detection methods.', 'incoming_inspection', 'Incoming inspection', 30),
('eqms.detection_method', 'EQMS detection methods.', 'in_process', 'In-process inspection', 40),
('eqms.detection_method', 'EQMS detection methods.', 'final_inspection', 'Final inspection', 50),
('eqms.detection_method', 'EQMS detection methods.', 'audit', 'Audit', 60),
('eqms.detection_method', 'EQMS detection methods.', 'spc', 'SPC signal', 70),
('eqms.detection_method', 'EQMS detection methods.', 'other', 'Other', 80),

('eqms.detection_point', 'EQMS detection points.', 'receiving', 'Receiving', 10),
('eqms.detection_point', 'EQMS detection points.', 'in_process', 'In process', 20),
('eqms.detection_point', 'EQMS detection points.', 'final_inspection', 'Final inspection', 30),
('eqms.detection_point', 'EQMS detection points.', 'customer', 'Customer', 40),
('eqms.detection_point', 'EQMS detection points.', 'audit', 'Audit', 50),
('eqms.detection_point', 'EQMS detection points.', 'field', 'Field', 60),

('eqms.regulatory_impact', 'EQMS regulatory impact levels.', 'none', 'None', 10),
('eqms.regulatory_impact', 'EQMS regulatory impact levels.', 'low', 'Low', 20),
('eqms.regulatory_impact', 'EQMS regulatory impact levels.', 'medium', 'Medium', 30),
('eqms.regulatory_impact', 'EQMS regulatory impact levels.', 'high', 'High', 40),
('eqms.regulatory_impact', 'EQMS regulatory impact levels.', 'critical', 'Critical', 50),
('eqms.regulatory_impact', 'EQMS regulatory impact levels.', 'yes', 'Yes', 60),
('eqms.regulatory_impact', 'EQMS regulatory impact levels.', 'no', 'No', 70),

('eqms.effectiveness', 'EQMS effectiveness outcomes.', 'pending', 'Pending', 10),
('eqms.effectiveness', 'EQMS effectiveness outcomes.', 'not_due', 'Not due', 20),
('eqms.effectiveness', 'EQMS effectiveness outcomes.', 'effective', 'Effective', 30),
('eqms.effectiveness', 'EQMS effectiveness outcomes.', 'partially_effective', 'Partially effective', 40),
('eqms.effectiveness', 'EQMS effectiveness outcomes.', 'ineffective', 'Ineffective', 50),

('eqms.training_matrix_status', 'Training matrix status values.', 'qualified', 'Qualified', 10),
('eqms.training_matrix_status', 'Training matrix status values.', 'due_soon', 'Due soon', 20),
('eqms.training_matrix_status', 'Training matrix status values.', 'overdue', 'Overdue', 30),
('eqms.training_matrix_status', 'Training matrix status values.', 'not_assigned', 'Not assigned', 40),

('eqms.overdue_filter', 'EQMS overdue filter values.', 'overdue', 'Overdue only', 10),
('eqms.overdue_filter', 'EQMS overdue filter values.', 'all', 'All records', 20),

('eqms.control_status', 'EQMS control status values.', 'effective', 'Effective', 10),
('eqms.control_status', 'EQMS control status values.', 'partially_effective', 'Partially effective', 20),
('eqms.control_status', 'EQMS control status values.', 'ineffective', 'Ineffective', 30),
('eqms.control_status', 'EQMS control status values.', 'pending', 'Pending', 40),
('eqms.control_status', 'EQMS control status values.', 'retired', 'Retired', 50),

('eqms.outcome', 'EQMS outcome values.', 'accepted', 'Accepted', 10),
('eqms.outcome', 'EQMS outcome values.', 'rejected', 'Rejected', 20),
('eqms.outcome', 'EQMS outcome values.', 'requires_action', 'Requires action', 30),
('eqms.outcome', 'EQMS outcome values.', 'effective', 'Effective', 40),
('eqms.outcome', 'EQMS outcome values.', 'ineffective', 'Ineffective', 50),

('eqms.strategic_classification', 'Supplier strategic classification values.', 'strategic', 'Strategic', 10),
('eqms.strategic_classification', 'Supplier strategic classification values.', 'preferred', 'Preferred', 20),
('eqms.strategic_classification', 'Supplier strategic classification values.', 'approved', 'Approved', 30),
('eqms.strategic_classification', 'Supplier strategic classification values.', 'conditional', 'Conditional', 40),
('eqms.strategic_classification', 'Supplier strategic classification values.', 'development', 'Development', 50),
('eqms.strategic_classification', 'Supplier strategic classification values.', 'disqualified', 'Disqualified', 60),

('eqms.checklist_template', 'EQMS audit checklist templates.', 'iso9001', 'ISO 9001', 10),
('eqms.checklist_template', 'EQMS audit checklist templates.', 'as9100', 'AS9100', 20),
('eqms.checklist_template', 'EQMS audit checklist templates.', 'iatf16949', 'IATF 16949', 30),
('eqms.checklist_template', 'EQMS audit checklist templates.', 'iso13485', 'ISO 13485', 40),
('eqms.checklist_template', 'EQMS audit checklist templates.', 'process_audit', 'Process audit', 50),
('eqms.checklist_template', 'EQMS audit checklist templates.', 'supplier_audit', 'Supplier audit', 60),

('eqms.validation_type', 'EQMS validation types.', 'iq', 'IQ', 10),
('eqms.validation_type', 'EQMS validation types.', 'oq', 'OQ', 20),
('eqms.validation_type', 'EQMS validation types.', 'pq', 'PQ', 30),
('eqms.validation_type', 'EQMS validation types.', 'csv', 'CSV', 40),
('eqms.validation_type', 'EQMS validation types.', 'cleaning', 'Cleaning validation', 50),
('eqms.validation_type', 'EQMS validation types.', 'process_validation', 'Process validation', 60),
('eqms.validation_type', 'EQMS validation types.', 'method_validation', 'Method validation', 70),

('eqms.requirement_priority', 'EQMS requirement priority values.', 'critical', 'Critical', 10),
('eqms.requirement_priority', 'EQMS requirement priority values.', 'high', 'High', 20),
('eqms.requirement_priority', 'EQMS requirement priority values.', 'medium', 'Medium', 30),
('eqms.requirement_priority', 'EQMS requirement priority values.', 'low', 'Low', 40),

('eqms.requirement_type', 'EQMS requirement types.', 'user', 'User', 10),
('eqms.requirement_type', 'EQMS requirement types.', 'business', 'Business', 20),
('eqms.requirement_type', 'EQMS requirement types.', 'functional', 'Functional', 30),
('eqms.requirement_type', 'EQMS requirement types.', 'regulatory', 'Regulatory', 40),
('eqms.requirement_type', 'EQMS requirement types.', 'data', 'Data', 50),
('eqms.requirement_type', 'EQMS requirement types.', 'security', 'Security', 60),
('eqms.requirement_type', 'EQMS requirement types.', 'integration', 'Integration', 70),

('eqms.execution_status', 'EQMS execution status values.', 'not_started', 'Not started', 10),
('eqms.execution_status', 'EQMS execution status values.', 'in_progress', 'In progress', 20),
('eqms.execution_status', 'EQMS execution status values.', 'pass', 'Pass', 30),
('eqms.execution_status', 'EQMS execution status values.', 'fail', 'Fail', 40),
('eqms.execution_status', 'EQMS execution status values.', 'blocked', 'Blocked', 50),
('eqms.execution_status', 'EQMS execution status values.', 'deviation', 'Deviation', 60),

('eqms.hazard_class', 'EQMS health hazard classifications.', 'none', 'None', 10),
('eqms.hazard_class', 'EQMS health hazard classifications.', 'class_i', 'Class I', 20),
('eqms.hazard_class', 'EQMS health hazard classifications.', 'class_ii', 'Class II', 30),
('eqms.hazard_class', 'EQMS health hazard classifications.', 'class_iii', 'Class III', 40),
('eqms.hazard_class', 'EQMS health hazard classifications.', 'low', 'Low', 50),
('eqms.hazard_class', 'EQMS health hazard classifications.', 'medium', 'Medium', 60),
('eqms.hazard_class', 'EQMS health hazard classifications.', 'high', 'High', 70),

('eqms.urgency', 'EQMS urgency values.', 'routine', 'Routine', 10),
('eqms.urgency', 'EQMS urgency values.', 'urgent', 'Urgent', 20),
('eqms.urgency', 'EQMS urgency values.', 'emergency', 'Emergency', 30),
('eqms.urgency', 'EQMS urgency values.', 'critical', 'Critical', 40),

('eqms.capability_level', 'Supplier and process capability levels.', 'capable', 'Capable', 10),
('eqms.capability_level', 'Supplier and process capability levels.', 'conditional', 'Conditional', 20),
('eqms.capability_level', 'Supplier and process capability levels.', 'not_capable', 'Not capable', 30),

('eqms.due_status', 'EQMS due-date status values.', 'not_due', 'Not due', 10),
('eqms.due_status', 'EQMS due-date status values.', 'due_soon', 'Due soon', 20),
('eqms.due_status', 'EQMS due-date status values.', 'due', 'Due', 30),
('eqms.due_status', 'EQMS due-date status values.', 'overdue', 'Overdue', 40),
('eqms.due_status', 'EQMS due-date status values.', 'completed', 'Completed', 50),

('eqms.equipment_type', 'EQMS equipment type values.', 'cnc_machine', 'CNC machine', 10),
('eqms.equipment_type', 'EQMS equipment type values.', 'measurement_device', 'Measurement device', 20),
('eqms.equipment_type', 'EQMS equipment type values.', 'fixture', 'Fixture', 30),
('eqms.equipment_type', 'EQMS equipment type values.', 'tooling', 'Tooling', 40),
('eqms.equipment_type', 'EQMS equipment type values.', 'software', 'Software', 50),
('eqms.equipment_type', 'EQMS equipment type values.', 'utility', 'Utility', 60),

('eqms.fmea_type', 'EQMS FMEA type values.', 'dfmea', 'DFMEA', 10),
('eqms.fmea_type', 'EQMS FMEA type values.', 'pfmea', 'PFMEA', 20),
('eqms.fmea_type', 'EQMS FMEA type values.', 'process', 'Process FMEA', 30),
('eqms.fmea_type', 'EQMS FMEA type values.', 'design', 'Design FMEA', 40),
('eqms.fmea_type', 'EQMS FMEA type values.', 'machine', 'Machine FMEA', 50),

('eqms.response_method', 'EQMS response method values.', 'containment', 'Containment', 10),
('eqms.response_method', 'EQMS response method values.', 'correction', 'Correction', 20),
('eqms.response_method', 'EQMS response method values.', 'corrective_action', 'Corrective action', 30),
('eqms.response_method', 'EQMS response method values.', 'preventive_action', 'Preventive action', 40),
('eqms.response_method', 'EQMS response method values.', 'notification', 'Notification', 50),

('eqms.rt_type', 'EQMS risk and traceability type values.', 'risk', 'Risk', 10),
('eqms.rt_type', 'EQMS risk and traceability type values.', 'requirement', 'Requirement', 20),
('eqms.rt_type', 'EQMS risk and traceability type values.', 'test', 'Test', 30),
('eqms.rt_type', 'EQMS risk and traceability type values.', 'trace', 'Trace', 40),
('eqms.rt_type', 'EQMS risk and traceability type values.', 'evidence', 'Evidence', 50),

('eqms.study_type', 'EQMS SPC and study type values.', 'capability', 'Capability study', 10),
('eqms.study_type', 'EQMS SPC and study type values.', 'gage_rr', 'Gage R&R', 20),
('eqms.study_type', 'EQMS SPC and study type values.', 'msa', 'MSA', 30),
('eqms.study_type', 'EQMS SPC and study type values.', 'control_chart', 'Control chart', 40),
('eqms.study_type', 'EQMS SPC and study type values.', 'stability', 'Stability study', 50),

('eqms.scope', 'EQMS scope values.', 'product', 'Product', 10),
('eqms.scope', 'EQMS scope values.', 'process', 'Process', 20),
('eqms.scope', 'EQMS scope values.', 'site', 'Site', 30),
('eqms.scope', 'EQMS scope values.', 'supplier', 'Supplier', 40),
('eqms.scope', 'EQMS scope values.', 'customer', 'Customer', 50),
('eqms.scope', 'EQMS scope values.', 'system', 'System', 60),

('eqms.format', 'EQMS document copy formats.', 'paper', 'Paper', 10),
('eqms.format', 'EQMS document copy formats.', 'electronic', 'Electronic', 20),
('eqms.format', 'EQMS document copy formats.', 'controlled_pdf', 'Controlled PDF', 30),

('eqms.decision', 'EQMS review decision values.', 'approve', 'Approve', 10),
('eqms.decision', 'EQMS review decision values.', 'reject', 'Reject', 20),
('eqms.decision', 'EQMS review decision values.', 'revise', 'Revise', 30),
('eqms.decision', 'EQMS review decision values.', 'defer', 'Defer', 40),

('eqms.vote', 'EQMS board vote values.', 'approve', 'Approve', 10),
('eqms.vote', 'EQMS board vote values.', 'reject', 'Reject', 20),
('eqms.vote', 'EQMS board vote values.', 'abstain', 'Abstain', 30),

('eqms.impact', 'EQMS impact values.', 'none', 'None', 10),
('eqms.impact', 'EQMS impact values.', 'low', 'Low', 20),
('eqms.impact', 'EQMS impact values.', 'medium', 'Medium', 30),
('eqms.impact', 'EQMS impact values.', 'high', 'High', 40),
('eqms.impact', 'EQMS impact values.', 'critical', 'Critical', 50),

('eqms.quality_status', 'EQMS quality status values.', 'accepted', 'Accepted', 10),
('eqms.quality_status', 'EQMS quality status values.', 'hold', 'Hold', 20),
('eqms.quality_status', 'EQMS quality status values.', 'rejected', 'Rejected', 30),
('eqms.quality_status', 'EQMS quality status values.', 'released', 'Released', 40);

INSERT INTO mdm_reference_codes (code_set, description, metadata)
SELECT
    code_set,
    MAX(description) AS description,
    jsonb_build_object(
        'domain', 'eqms',
        'authority', 'mdm_reference_codes',
        'seed_migration', '143_eqms_mdm_reference_codes'
    ) AS metadata
FROM _eqms_reference_seed
GROUP BY code_set
ON CONFLICT (code_set) DO UPDATE
SET description = EXCLUDED.description,
    metadata = mdm_reference_codes.metadata || EXCLUDED.metadata;

INSERT INTO mdm_reference_code_values (
    mdm_reference_code_id,
    code_value,
    value_label,
    sort_order,
    metadata
)
SELECT
    c.mdm_reference_code_id,
    s.code_value,
    s.value_label,
    s.sort_order,
    jsonb_build_object(
        'domain', 'eqms',
        'authority', 'mdm_reference_codes',
        'seed_migration', '143_eqms_mdm_reference_codes'
    ) AS metadata
FROM _eqms_reference_seed s
JOIN mdm_reference_codes c
  ON c.code_set = s.code_set
ON CONFLICT (mdm_reference_code_id, code_value) DO UPDATE
SET value_label = EXCLUDED.value_label,
    sort_order = EXCLUDED.sort_order,
    metadata = mdm_reference_code_values.metadata || EXCLUDED.metadata;

COMMIT;
