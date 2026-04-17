-- ============================================================================
-- Migration 141: Extend eqms_documents + migrate legacy records → EQMS surface
-- ============================================================================
-- Safe:       Column additions use IF NOT EXISTS; INSERT uses WHERE NOT EXISTS
-- Direction:  records (document-like types) → eqms_documents
-- Scope:      Only record_type values that are evidence/document records;
--             NCR/CAPA/RISK/SCAR are excluded (already migrated in M140/M136).
-- Source:     Legacy records table preserved (no DELETE); data is additive.
-- Author:     System — module-consolidation sprint 5
-- Date:       2026-04-17
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Extend eqms_documents with Evidence Control columns
-- ─────────────────────────────────────────────────────────────────────────────
-- evidence_type  : original record_type from legacy records table (lineage)
-- linked_exception_id : link to a related NCR/CAPA record (nullable)
-- source_record_id    : legacy records.record_id for traceability (VARCHAR 120)
-- updated_at / updated_by : audit trail columns
-- form_code           : form template reference migrated from records.form_code
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE eqms_documents
    ADD COLUMN IF NOT EXISTS evidence_type       VARCHAR(60),
    ADD COLUMN IF NOT EXISTS linked_exception_id UUID,
    ADD COLUMN IF NOT EXISTS source_record_id    VARCHAR(120),
    ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_by          VARCHAR(120),
    ADD COLUMN IF NOT EXISTS form_code           VARCHAR(20);

COMMENT ON COLUMN eqms_documents.evidence_type
    IS 'Original record_type from legacy records registry (lineage tracing).';
COMMENT ON COLUMN eqms_documents.linked_exception_id
    IS 'UUID of related eqms_ncr_records or eqms_capa_records (nullable foreign key).';
COMMENT ON COLUMN eqms_documents.source_record_id
    IS 'Legacy records.record_id — preserved for lineage; NULL for native EQMS docs.';
COMMENT ON COLUMN eqms_documents.form_code
    IS 'Form template reference (from legacy records.form_code).';

-- Index to support lookups by source_record_id (lineage queries)
CREATE INDEX IF NOT EXISTS idx_eqms_docs_source_record
    ON eqms_documents (source_record_id)
    WHERE source_record_id IS NOT NULL;

-- Index to support linked_exception_id FK lookups
CREATE INDEX IF NOT EXISTS idx_eqms_docs_linked_exception
    ON eqms_documents (linked_exception_id)
    WHERE linked_exception_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Migrate legacy records → eqms_documents
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Inclusion criteria (document-type evidence records only):
--   FAI               → First Article Inspection report
--   TRN               → Training record / competency log
--   AUD               → Internal audit report
--   ECR               → Engineering Change Request document
--   CAL               → Calibration record
--   IMP               → Improvement/Kaizen record
--   MR                → Management Review minutes
--   SOP-NUMBER        → Standard Operating Procedure document
--   WORK-INSTRUCTION-NUMBER → Work Instruction document
--   ANNEX-NUMBER      → Annex / appendix document
--   MATERIAL-CERT     → Material certificate / CoC
--   CONTROL-PLAN      → Control plan document
--   MSA               → Measurement System Analysis study
--   SPC-STUDY         → Statistical Process Control study
--   PFMEA             → Process FMEA document
--
-- Excluded (already handled by dedicated EQMS modules):
--   NCR, CAPA         → eqms_ncr_records, eqms_capa_records (migration 140)
--   SCAR              → eqms_supplier_audits (EqmsSupplierAuditsController)
--   RISK              → eqms_risk_register (EqmsRisksController)
--   CONCESSION, DEVIATION, REWORK, RMA → eqms_deviations/ncr
--   CUSTOMER-COMPLAINT → eqms_complaints
--   SUPPLIER-AUDIT    → eqms_supplier_audits
--   PART/TOOL/GAGE/FIXTURE-NUMBER → master data (not documents)
--   DOWNTIME, PO-EXCEPTION, PM-ORDER, CM-ORDER, SPARE-PART, NPI → ops/maintenance
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO eqms_documents (
    doc_number,
    title,
    document_type,
    department,
    owner,
    revision_code,
    effective_date,
    expiry_date,
    storage_ref,
    form_code,
    status,
    version,
    created_at,
    created_by,
    updated_at,
    evidence_type,
    source_record_id
)
SELECT
    -- doc_number: use record_id directly (≤50 chars, already unique formatted string)
    r.record_id,

    -- title: prefer explicit title, fallback to "TYPE — ID"
    COALESCE(
        NULLIF(TRIM(r.title), ''),
        r.record_type::text || ' — ' || r.record_id
    ),

    -- document_type: map record_type_enum → eqms document type vocabulary
    CASE r.record_type::text
        WHEN 'FAI'                      THEN 'first_article_inspection'
        WHEN 'TRN'                      THEN 'training_record'
        WHEN 'AUD'                      THEN 'audit_report'
        WHEN 'ECR'                      THEN 'engineering_change'
        WHEN 'CAL'                      THEN 'calibration_record'
        WHEN 'IMP'                      THEN 'improvement_record'
        WHEN 'MR'                       THEN 'management_review'
        WHEN 'SOP-NUMBER'               THEN 'SOP'
        WHEN 'WORK-INSTRUCTION-NUMBER'  THEN 'WI'
        WHEN 'ANNEX-NUMBER'             THEN 'annex'
        WHEN 'MATERIAL-CERT'            THEN 'material_cert'
        WHEN 'CONTROL-PLAN'             THEN 'control_plan'
        WHEN 'MSA'                      THEN 'MSA_study'
        WHEN 'SPC-STUDY'                THEN 'SPC_study'
        WHEN 'PFMEA'                    THEN 'PFMEA'
        ELSE                                 'other'
    END,

    -- department: direct from dept_code (VARCHAR → VARCHAR)
    r.dept_code::text,

    -- owner: resolve UUID → username; NULL if unassigned
    (SELECT u.username FROM users u WHERE u.user_id = r.assigned_to LIMIT 1),

    -- revision_code: default '00' (records table has no revision concept)
    '00',

    -- effective_date: valid_from (best approximation for effective date)
    r.valid_from::date,

    -- expiry_date: valid_to if set, else due_date (both represent a deadline)
    COALESCE(r.valid_to::date, r.due_date),

    -- storage_ref: external file location from sharepoint_path
    r.sharepoint_path,

    -- form_code: preserve form template reference
    r.form_code,

    -- status: map record_status enum → EQMS document lifecycle
    -- EQMS doc states: draft | in_review | pending_approval | approved | released | obsolete
    CASE r.status::text
        WHEN 'open'               THEN 'draft'
        WHEN 'in_progress'        THEN 'in_review'
        WHEN 'pending_review'     THEN 'in_review'
        WHEN 'pending_approval'   THEN 'pending_approval'
        WHEN 'closed'             THEN 'released'
        WHEN 'cancelled'          THEN 'obsolete'
        WHEN 'on_hold'            THEN 'draft'
        ELSE                           'draft'
    END,

    -- version: default 1 (legacy records have no document version counter)
    1,

    -- created_at: preserve original timestamp
    r.created_at,

    -- created_by: resolve UUID → username; fallback to sentinel for tracing
    COALESCE(
        (SELECT u.username FROM users u WHERE u.user_id = r.created_by LIMIT 1),
        'system_migration'
    ),

    -- updated_at: use records.updated_at
    r.updated_at,

    -- evidence_type: preserve original record_type for lineage
    r.record_type::text,

    -- source_record_id: preserve original primary key for lineage
    r.record_id

FROM records r
WHERE r.record_type::text IN (
    'FAI', 'TRN', 'AUD', 'ECR', 'CAL', 'IMP', 'MR',
    'SOP-NUMBER', 'WORK-INSTRUCTION-NUMBER', 'ANNEX-NUMBER',
    'MATERIAL-CERT', 'CONTROL-PLAN', 'MSA', 'SPC-STUDY', 'PFMEA'
)
AND NOT EXISTS (
    SELECT 1 FROM eqms_documents d WHERE d.source_record_id = r.record_id
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Link migrated documents to their parent NCR (where capa_link / source_record
--         resolves to a migrated NCR in eqms_ncr_records)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE eqms_documents d
SET    linked_exception_id = n.ncr_id
FROM   records r
JOIN   eqms_ncr_records n ON n.ncr_number = r.source_record
WHERE  d.source_record_id  = r.record_id
AND    r.source_record     IS NOT NULL
AND    d.linked_exception_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4: Migration audit log
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_migrated   INTEGER;
    v_eligible   INTEGER;
    v_linked     INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_eligible
    FROM records
    WHERE record_type::text IN (
        'FAI', 'TRN', 'AUD', 'ECR', 'CAL', 'IMP', 'MR',
        'SOP-NUMBER', 'WORK-INSTRUCTION-NUMBER', 'ANNEX-NUMBER',
        'MATERIAL-CERT', 'CONTROL-PLAN', 'MSA', 'SPC-STUDY', 'PFMEA'
    );

    SELECT COUNT(*) INTO v_migrated
    FROM eqms_documents WHERE source_record_id IS NOT NULL;

    SELECT COUNT(*) INTO v_linked
    FROM eqms_documents WHERE linked_exception_id IS NOT NULL AND source_record_id IS NOT NULL;

    RAISE NOTICE '[Migration 141] eqms_documents: %/% eligible records migrated; % linked to NCR',
        v_migrated, v_eligible, v_linked;
END;
$$;

COMMIT;
