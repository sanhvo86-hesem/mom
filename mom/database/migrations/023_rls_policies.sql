-- Migration: 023_rls_policies.sql
-- Description: ALL Row Level Security policies - department-based access control for records, documents, forms, NCR, CAPA, job orders
-- Dependencies: 003, 004, 005, 010, 011
-- Rollback: DROP all policies, then ALTER TABLE ... DISABLE ROW LEVEL SECURITY on each table

BEGIN;

-- Enable RLS on key tables
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see records from their own department or if they are admin
CREATE POLICY rls_records_dept ON records
    USING (
        dept_code = current_setting('app.current_dept', true)::dept_code
        OR current_setting('app.is_admin', true) = 'true'
    );

CREATE POLICY rls_documents_dept ON documents
    USING (
        dept_code = current_setting('app.current_dept', true)::dept_code
        OR current_setting('app.is_admin', true) = 'true'
        OR status = 'approved'  -- approved documents are visible to all
    );

CREATE POLICY rls_form_entries_dept ON form_entries
    USING (
        submitted_by = current_setting('app.current_user_id', true)::UUID
        OR current_setting('app.is_admin', true) = 'true'
    );

-- NCR/CAPA visible to QA, the owning dept, and admins
CREATE POLICY rls_ncr_dept ON ncr_records
    USING (
        EXISTS (
            SELECT 1 FROM records r
            WHERE r.record_id = ncr_records.record_id
            AND (
                r.dept_code = current_setting('app.current_dept', true)::dept_code
                OR current_setting('app.current_dept', true) = 'QA'
                OR current_setting('app.is_admin', true) = 'true'
            )
        )
    );

CREATE POLICY rls_capa_dept ON capa_records
    USING (
        EXISTS (
            SELECT 1 FROM records r
            WHERE r.record_id = capa_records.record_id
            AND (
                r.dept_code = current_setting('app.current_dept', true)::dept_code
                OR current_setting('app.current_dept', true) = 'QA'
                OR current_setting('app.is_admin', true) = 'true'
            )
        )
    );

-- Job orders visible to production, engineering, QA, and admins
CREATE POLICY rls_job_orders_dept ON job_orders
    USING (
        current_setting('app.current_dept', true) IN ('PRO', 'ENG', 'QA', 'SCM')
        OR current_setting('app.is_admin', true) = 'true'
    );

COMMIT;

-- Rollback:
-- DROP POLICY IF EXISTS rls_job_orders_dept ON job_orders;
-- DROP POLICY IF EXISTS rls_capa_dept ON capa_records;
-- DROP POLICY IF EXISTS rls_ncr_dept ON ncr_records;
-- DROP POLICY IF EXISTS rls_form_entries_dept ON form_entries;
-- DROP POLICY IF EXISTS rls_documents_dept ON documents;
-- DROP POLICY IF EXISTS rls_records_dept ON records;
-- ALTER TABLE job_orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE capa_records DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ncr_records DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE form_entries DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE records DISABLE ROW LEVEL SECURITY;
