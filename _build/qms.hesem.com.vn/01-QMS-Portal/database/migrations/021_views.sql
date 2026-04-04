-- Migration: 021_views.sql
-- Description: ALL views - active documents, open NCRs, overdue calibrations, open CAPAs, job status, expiring certs, overdue records, vendor scorecard
-- Dependencies: 003, 005, 006, 007, 008, 010, 011, 012, 013
-- Rollback: DROP VIEW v_vendor_scorecard, v_overdue_records, v_expiring_certifications, v_job_status_summary, v_open_capas, v_overdue_calibrations, v_open_ncrs, v_active_documents;

BEGIN;

-- Active (current) documents
CREATE VIEW v_active_documents AS
SELECT d.doc_id, d.doc_type, d.title, d.title_vi, d.dept_code,
       d.current_rev, d.status, d.owner_role,
       dv.effective_date, dv.author, dv.approver
FROM documents d
LEFT JOIN document_versions dv ON d.doc_id = dv.doc_id AND dv.rev = d.current_rev
WHERE d.status = 'approved';
COMMENT ON VIEW v_active_documents IS 'Currently active approved documents. / Tai lieu hien tai da phe duyet.';

-- Open NCRs with RPN
CREATE VIEW v_open_ncrs AS
SELECT n.ncr_number, n.defect_type, n.disposition, n.ncr_status,
       n.severity, n.occurrence, n.detection, n.rpn,
       n.job_number, n.part_number, n.customer,
       r.created_by, r.assigned_to, r.due_date, r.dept_code,
       r.created_at
FROM ncr_records n
JOIN records r ON n.record_id = r.record_id
WHERE n.ncr_status NOT IN ('Closed', 'Verified');
COMMENT ON VIEW v_open_ncrs IS 'Open NCRs with RPN scores. / NCR dang mo voi diem RPN.';

-- Overdue calibrations
CREATE VIEW v_overdue_calibrations AS
SELECT e.equipment_id, e.equipment_name, e.equipment_type,
       e.calibration_due,
       cr.calibration_date AS last_cal_date,
       cr.calibration_result AS last_result,
       cr.next_due
FROM equipment e
LEFT JOIN LATERAL (
    SELECT calibration_date, calibration_result, next_due
    FROM calibration_records
    WHERE equipment_id = e.equipment_id
    ORDER BY calibration_date DESC
    LIMIT 1
) cr ON TRUE
WHERE e.calibration_due < CURRENT_DATE
  AND e.is_active = TRUE;
COMMENT ON VIEW v_overdue_calibrations IS 'Equipment with overdue calibrations. / Thiet bi qua han hieu chuan.';

-- Open CAPA with aging
CREATE VIEW v_open_capas AS
SELECT c.record_id, c.capa_status, c.target_date, c.completion_date,
       c.root_cause_method, c.verification_result,
       r.dept_code, r.assigned_to, r.created_at,
       CURRENT_DATE - r.created_at::date AS age_days
FROM capa_records c
JOIN records r ON c.record_id = r.record_id
WHERE c.capa_status NOT IN ('Closed Effective', 'Closed Not Effective');
COMMENT ON VIEW v_open_capas IS 'Open CAPAs with aging. / CAPA dang mo voi so ngay.';

-- Job order status summary
CREATE VIEW v_job_status_summary AS
SELECT jo.job_number, jo.job_status, jo.item_id, i.description AS item_desc,
       jo.order_qty, jo.completed_qty, jo.scrapped_qty, jo.pct_complete,
       jo.start_date_planned, jo.end_date_planned,
       jo.customer_id, c.customer_name,
       jo.actual_total_cost, jo.est_total_cost
FROM job_orders jo
LEFT JOIN items i ON jo.item_id = i.item_id
LEFT JOIN customers c ON jo.customer_id = c.customer_id
WHERE jo.job_status NOT IN ('completed', 'closed');
COMMENT ON VIEW v_job_status_summary IS 'Active job order status summary. / Tong hop trang thai lenh san xuat dang hoat dong.';

-- Expiring employee certifications (within 90 days)
CREATE VIEW v_expiring_certifications AS
SELECT ec.employee_id, emp.employee_name, ec.certification_name,
       ec.certification_body, ec.expiry_date,
       ec.expiry_date - CURRENT_DATE AS days_until_expiry
FROM employee_certifications ec
JOIN employees emp ON ec.employee_id = emp.employee_id
WHERE ec.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  AND ec.status = 'active';
COMMENT ON VIEW v_expiring_certifications IS 'Employee certs expiring within 90 days. / Chung chi nhan vien het han trong 90 ngay.';

-- Overdue records
CREATE VIEW v_overdue_records AS
SELECT r.record_id, r.record_type, r.dept_code, r.status,
       r.due_date, CURRENT_DATE - r.due_date AS days_overdue,
       r.assigned_to, u.full_name AS assignee_name
FROM records r
LEFT JOIN users u ON r.assigned_to = u.user_id
WHERE r.due_date < CURRENT_DATE
  AND r.status NOT IN ('closed', 'cancelled');
COMMENT ON VIEW v_overdue_records IS 'Overdue records across all types. / Ho so qua han o tat ca loai.';

-- Vendor scorecard
CREATE VIEW v_vendor_scorecard AS
SELECT v.vendor_id, v.vendor_name, v.vendor_type, v.vendor_status,
       v.vendor_rating_score, v.vendor_rating_grade,
       v.on_time_delivery_pct, v.quality_rejection_pct,
       v.scar_open_count, v.risk_level,
       v.certification_expiry, v.next_audit_due
FROM vendors v
WHERE v.vendor_status != 'disqualified';
COMMENT ON VIEW v_vendor_scorecard IS 'Vendor scorecard for supply chain review. / Bang diem nha cung cap.';

COMMIT;

-- Rollback:
-- DROP VIEW IF EXISTS v_vendor_scorecard CASCADE;
-- DROP VIEW IF EXISTS v_overdue_records CASCADE;
-- DROP VIEW IF EXISTS v_expiring_certifications CASCADE;
-- DROP VIEW IF EXISTS v_job_status_summary CASCADE;
-- DROP VIEW IF EXISTS v_open_capas CASCADE;
-- DROP VIEW IF EXISTS v_overdue_calibrations CASCADE;
-- DROP VIEW IF EXISTS v_open_ncrs CASCADE;
-- DROP VIEW IF EXISTS v_active_documents CASCADE;
