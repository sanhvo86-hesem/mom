-- ============================================================================
-- HESEM MOM - Department Master Operational Alignment
-- ============================================================================
-- Purpose:
--   Seed canonical metadata for live department codes added in migration 094.
--   Existing department records are preserved; this only fills blank metadata.
-- ============================================================================

INSERT INTO departments (dept_code, label, label_vi, icon, color, record_types, form_series)
VALUES
    ('FIN', 'Finance / Accounting', 'Tài chính / Kế toán', 'FIN', '#0f766e', ARRAY[]::TEXT[], ARRAY[]::INT[]),
    ('GEN', 'General / Administration', 'Hành chính / Tổng vụ', 'GEN', '#64748b', ARRAY[]::TEXT[], ARRAY[]::INT[])
ON CONFLICT (dept_code) DO UPDATE
SET
    label = COALESCE(NULLIF(departments.label, ''), EXCLUDED.label),
    label_vi = COALESCE(NULLIF(departments.label_vi, ''), EXCLUDED.label_vi),
    icon = COALESCE(NULLIF(departments.icon, ''), EXCLUDED.icon),
    color = COALESCE(NULLIF(departments.color, ''), EXCLUDED.color),
    record_types = CASE
        WHEN departments.record_types IS NULL OR array_length(departments.record_types, 1) IS NULL THEN EXCLUDED.record_types
        ELSE departments.record_types
    END,
    form_series = CASE
        WHEN departments.form_series IS NULL OR array_length(departments.form_series, 1) IS NULL THEN EXCLUDED.form_series
        ELSE departments.form_series
    END;
