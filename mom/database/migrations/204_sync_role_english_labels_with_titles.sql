-- 204_sync_role_english_labels_with_titles.sql
-- Align authoritative RBAC English labels with the JD/title wording used by
-- the portal so Admin -> Roles no longer drifts from the role/title surface.

BEGIN;

UPDATE roles
SET role_label = CASE role_code
    WHEN 'shift_leader' THEN 'Shift Supervisor'
    WHEN 'engineering_lead' THEN 'Engineering Manager'
    WHEN 'qa_manager' THEN 'Quality Manager'
    WHEN 'qms_engineer' THEN 'QMS Engineer / Document Controller'
    WHEN 'internal_auditor' THEN 'Internal Audit Specialist'
    WHEN 'qc_inspector' THEN 'QC Inspector / CMM Programmer'
    WHEN 'buyer' THEN 'Purchasing Officer'
    WHEN 'tool_storekeeper' THEN 'Tool Storekeeper'
    WHEN 'logistics_coordinator' THEN 'Import-Export Coordinator'
    WHEN 'customer_service' THEN 'Customer Service Officer'
    WHEN 'hr_manager' THEN 'Human Resources Manager'
    WHEN 'it_admin' THEN 'IT Systems Administrator'
    WHEN 'epicor_admin' THEN 'Epicor ERP Administrator'
    ELSE role_label
END
WHERE role_code IN (
    'shift_leader',
    'engineering_lead',
    'qa_manager',
    'qms_engineer',
    'internal_auditor',
    'qc_inspector',
    'buyer',
    'tool_storekeeper',
    'logistics_coordinator',
    'customer_service',
    'hr_manager',
    'it_admin',
    'epicor_admin'
);

COMMIT;
