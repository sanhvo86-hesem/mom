-- ============================================================================
-- Migration 162: role_sod_conflict — Separation of Duties matrix
-- ----------------------------------------------------------------------------
-- COBIT 5 (DSS06.03), SOX §404, ISO 27001 (A.6.1.2), and NIST 800-53 (AC-5)
-- all require that a single user must not simultaneously hold two roles that
-- can perform a complete fraud cycle (e.g. "create PO" + "approve PO" +
-- "execute payment"). This table is the canonical conflict matrix.
--
-- Each row declares: holding role_a together with role_b is a violation of
-- severity {block | warn | info}. The application enforces:
--   * block: assigning the second role is rejected outright by RBAC
--   * warn : assignment proceeds but raises an audit event + access-review
--             flag
--   * info : informational, surfaced in dashboards only
--
-- Idempotent.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS role_sod_conflict (
    conflict_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_a_id               UUID            NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    role_b_id               UUID            NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    severity                VARCHAR(10)     NOT NULL DEFAULT 'block'
                            CHECK (severity IN ('block','warn','info')),
    label                   VARCHAR(200),
    label_vi                VARCHAR(200),
    rationale               TEXT            NOT NULL,
    rationale_vi            TEXT,
    compliance_refs         TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    detection_query         TEXT,
    waiver_allowed          BOOLEAN         NOT NULL DEFAULT FALSE,
    waiver_max_days         INTEGER,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata                JSONB           NOT NULL DEFAULT '{}'::jsonb,
    payload_schema_version  VARCHAR(30)     NOT NULL DEFAULT '1.0',
    org_company_code        VARCHAR(30),
    org_legal_entity_code   VARCHAR(30),
    org_plant_id            VARCHAR(30),
    org_site_id             VARCHAR(30),
    row_version             INTEGER         NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID,
    CHECK (role_a_id <> role_b_id)
);

COMMENT ON TABLE role_sod_conflict IS 'Separation-of-Duties conflict matrix (COBIT 5 DSS06.03 / SOX 404 / ISO 27001 A.6.1.2). / Ma tran xung dot tach trach nhiem.';
COMMENT ON COLUMN role_sod_conflict.severity IS 'block = reject second-role assignment; warn = allow but audit; info = surface only.';
COMMENT ON COLUMN role_sod_conflict.detection_query IS 'Optional SQL returning user_id rows in violation; used by access_review jobs.';
COMMENT ON COLUMN role_sod_conflict.waiver_allowed IS 'TRUE if a temporary waiver (recorded in mfa_challenge audit) may bypass the block.';

-- Canonicalize the unordered pair to prevent duplicates A↔B vs B↔A.
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_sod_conflict_pair_active
    ON role_sod_conflict (
        LEAST(role_a_id, role_b_id),
        GREATEST(role_a_id, role_b_id)
    )
    WHERE deleted_at IS NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_role_sod_conflict_role_a ON role_sod_conflict(role_a_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_role_sod_conflict_role_b ON role_sod_conflict(role_b_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_role_sod_conflict_severity ON role_sod_conflict(severity) WHERE deleted_at IS NULL AND is_active = TRUE;

-- updated_at trigger ---------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_role_sod_conflict_set_updated_at') THEN
        CREATE TRIGGER trg_role_sod_conflict_set_updated_at
            BEFORE UPDATE ON role_sod_conflict
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
EXCEPTION WHEN undefined_function THEN
    NULL;
END$$;

-- ---------------------------------------------------------------------------
-- Seed: classic SoD conflicts. Skip if either role is missing (early system).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    fin_id  UUID := (SELECT role_id FROM roles WHERE role_code = 'finance_manager');
    qa_id   UUID := (SELECT role_id FROM roles WHERE role_code = 'qa_manager');
    qms_id  UUID := (SELECT role_id FROM roles WHERE role_code = 'qms_engineer');
    int_id  UUID := (SELECT role_id FROM roles WHERE role_code = 'internal_auditor');
    ceo_id  UUID := (SELECT role_id FROM roles WHERE role_code = 'ceo');
    pd_id   UUID := (SELECT role_id FROM roles WHERE role_code = 'production_director');
    it_id   UUID := (SELECT role_id FROM roles WHERE role_code = 'it_admin');
BEGIN
    -- Finance vs Internal Auditor — auditor must not also be the manager
    IF fin_id IS NOT NULL AND int_id IS NOT NULL THEN
        INSERT INTO role_sod_conflict (role_a_id, role_b_id, severity, label, label_vi, rationale, rationale_vi, compliance_refs)
        VALUES (fin_id, int_id, 'block',
            'Finance Manager + Internal Auditor',
            'Truong Phong Tai Chinh + Kiem Toan Noi Bo',
            'Finance manager controls the books being audited; combining with internal-auditor role creates a self-audit conflict.',
            'Truong phong tai chinh kiem soat so sach can kiem toan; kiem ket hop vai tro kiem toan noi bo tao xung dot tu kiem toan.',
            ARRAY['SOX-404','ISO27001-A.6.1.2','COBIT5-DSS06.03'])
        ON CONFLICT DO NOTHING;
    END IF;

    -- QMS Engineer authoring docs + QA Manager approving them
    IF qms_id IS NOT NULL AND qa_id IS NOT NULL THEN
        INSERT INTO role_sod_conflict (role_a_id, role_b_id, severity, label, label_vi, rationale, rationale_vi, compliance_refs)
        VALUES (qms_id, qa_id, 'warn',
            'QMS Author + QA Approver',
            'Soan tai lieu QMS + Duyet tai lieu QMS',
            'Author of a controlled document should not be its sole approver; warn unless approval is delegated.',
            'Nguoi soan tai lieu kiem soat khong nen la nguoi duy nhat phe duyet; canh bao tru khi viec phe duyet duoc uy quyen.',
            ARRAY['ISO9001-7.5.3','21CFR820.40'])
        ON CONFLICT DO NOTHING;
    END IF;

    -- Production Director should not unilaterally also approve quality holds
    IF pd_id IS NOT NULL AND qa_id IS NOT NULL THEN
        INSERT INTO role_sod_conflict (role_a_id, role_b_id, severity, label, label_vi, rationale, rationale_vi, compliance_refs)
        VALUES (pd_id, qa_id, 'warn',
            'Production Director + QA Manager',
            'Giam Doc San Xuat + Truong Phong Chat Luong',
            'Production owner must not also clear quality holds; warn until process delegation is verified.',
            'Chu so huu san xuat khong nen tu xoa cac chot kiem soat chat luong; canh bao cho den khi co uy quyen quy trinh.',
            ARRAY['ISO9001-7.1','IATF16949-7.1'])
        ON CONFLICT DO NOTHING;
    END IF;

    -- IT Admin must not also have audit-export permission combined with mfa.factor.reset (god-mode)
    IF it_id IS NOT NULL AND ceo_id IS NOT NULL THEN
        INSERT INTO role_sod_conflict (role_a_id, role_b_id, severity, label, label_vi, rationale, rationale_vi, compliance_refs)
        VALUES (it_id, ceo_id, 'info',
            'IT Admin + CEO',
            'Quan Tri IT + Tong Giam Doc',
            'CEO assigned IT-Admin gains technical superuser access; review in next access-review campaign.',
            'CEO duoc gan IT-Admin se co quyen sieu nguoi dung ky thuat; danh gia trong chu ky tiep theo.',
            ARRAY['ISO27001-A.9.2.5'])
        ON CONFLICT DO NOTHING;
    END IF;
END$$;

COMMIT;

-- Rollback:
--   BEGIN;
--   DROP TABLE IF EXISTS role_sod_conflict;
--   COMMIT;
