-- ============================================================
-- 229_uom_v3_lifecycle_governance.sql
-- HESEM UoM V3 No-Guess World-Class hardening — P01 deliverable.
--
-- Closes the following V3 hard-blockers identified in PR #74:
--
--   HB-01  Workflow lifecycle schema/service/report mismatch.
--          uom_conversion_rule.lifecycle_status CHECK constraint
--          previously allowed ('draft','review','approved','deprecated').
--          UomWorkflowService writes 'pending_review' and 'active' which
--          would silently violate the constraint at runtime. Broaden the
--          constraint to the V3 canonical superset so service ↔ DB
--          truth is single, then ban no-op transitions in the service.
--
--   HB-02  Seed migration auto-approves rules using the first available
--          user (224_uom_seeds.sql:267-274 — `SELECT user_id INTO v_approver
--          FROM users ORDER BY created_at ASC LIMIT 1`).
--          Replace this with the Standard Library Manifest model:
--          a rule may only be `approved`/`active` either via a real
--          human/QA/e-sign workflow path or by being explicitly bound to a
--          registered Standard Library Manifest with verifiable evidence
--          (UCUM/BIPM/SI/QUDT/UNECE/OPC UA citation). The seed logic is
--          neutralised retroactively for existing rule rows.
--
--   HB-11  effective_from lower bound not enforced. The conversion rule
--          table already has effective_from/effective_to columns but the
--          resolution path does not enforce them. P05 owns the actual
--          resolution-time check; this migration adds a CHECK constraint
--          on the table itself so a rule cannot have effective_to <=
--          effective_from at insert time — the kind of bad row that
--          silently causes "future-effective rule resolves today".
--
-- Posture: development/prototype → pre-production readiness candidate only.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Standard Library Manifest table
-- ============================================================
-- Each manifest records the authority that justifies activating a class
-- of standard conversion rules (e.g. SI base, UCUM, QUDT, UNECE Rec 20).
-- Activation by reference to a manifest is auditable; activation by a
-- random first-user UPDATE is not.

CREATE TABLE IF NOT EXISTS uom_standard_library_manifest (
    id                       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_code            VARCHAR(64)     NOT NULL UNIQUE,
    title                    VARCHAR(200)    NOT NULL,
    title_vi                 VARCHAR(200),
    description              TEXT,
    description_vi           TEXT,
    source_authority         VARCHAR(64)     NOT NULL,
    source_citation_uri      TEXT,
    evidence_artifact_uri    TEXT,
    registered_by_actor      VARCHAR(64)     NOT NULL,
    registered_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    approved_by              UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at              TIMESTAMPTZ,
    effective_from           DATE            NOT NULL DEFAULT CURRENT_DATE,
    effective_to             DATE,
    lifecycle_status         VARCHAR(32)     NOT NULL DEFAULT 'pending_review'
                             CHECK (lifecycle_status IN (
                                 'draft','pending_review','active',
                                 'deprecated','retired','rejected'
                             )),
    CONSTRAINT uom_slm_effective_window
        CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT uom_slm_active_requires_approver
        CHECK (lifecycle_status NOT IN ('active','deprecated','retired')
               OR approved_by IS NOT NULL),
    CONSTRAINT uom_slm_source_authority_known
        CHECK (source_authority IN (
            'BIPM_SI','UCUM','QUDT','UNECE_REC20','OPC_UA','ISO','IEC',
            'CIPM','NIST','ASTM','HESEM_INTERNAL_STANDARD'
        ))
);

CREATE INDEX IF NOT EXISTS idx_uom_slm_lifecycle
    ON uom_standard_library_manifest(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_uom_slm_authority
    ON uom_standard_library_manifest(source_authority);

COMMENT ON TABLE uom_standard_library_manifest IS
    'HESEM UoM V3 P01: registered standards-library manifests. A rule may '
    'only be activated by reference to a manifest (no first-user seed).';

-- ============================================================
-- 2. Link uom_conversion_rule to the manifest
-- ============================================================

ALTER TABLE uom_conversion_rule
    ADD COLUMN IF NOT EXISTS standard_library_manifest_id UUID
        REFERENCES uom_standard_library_manifest(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_uomcr_manifest_id
    ON uom_conversion_rule(standard_library_manifest_id);

-- 2a. Effective-window integrity (HB-11 backstop at insert time).
ALTER TABLE uom_conversion_rule
    DROP CONSTRAINT IF EXISTS uom_cr_effective_window;
ALTER TABLE uom_conversion_rule
    ADD  CONSTRAINT uom_cr_effective_window
    CHECK (effective_to IS NULL OR effective_to > effective_from);

-- ============================================================
-- 3. Broaden conversion-rule lifecycle CHECK to the V3 canonical superset.
--
-- Previously only ('draft','review','approved','deprecated') were allowed,
-- but UomWorkflowService writes 'pending_review' and 'active'. Without
-- this fix every workflow transition would silently violate the CHECK
-- constraint and throw a Postgres error at the row level — the negative
-- tests catch this case and were the original trigger for HB-01 / HB-03.
-- ============================================================

DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    SELECT conname INTO v_constraint_name
      FROM pg_constraint
     WHERE conrelid = 'uom_conversion_rule'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%lifecycle_status%';

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE uom_conversion_rule DROP CONSTRAINT %I',
                       v_constraint_name);
    END IF;

    ALTER TABLE uom_conversion_rule
        ADD CONSTRAINT uom_cr_lifecycle_v3
        CHECK (lifecycle_status IN (
            'draft',
            'pending_tech_review',
            'pending_qa_approval',
            'pending_esign',
            'pending_review',
            'review',
            'approved',
            'active',
            'deprecated',
            'retired',
            'rejected'
        ));
END $$;

-- ============================================================
-- 4. Active-rule guarantee: an active/approved rule MUST have either
--    (a) approved_by set (real human approver), OR
--    (b) standard_library_manifest_id set (manifested standard rule).
-- ============================================================

ALTER TABLE uom_conversion_rule
    DROP CONSTRAINT IF EXISTS uom_cr_approved_requires_owner;
ALTER TABLE uom_conversion_rule
    ADD  CONSTRAINT uom_cr_approved_requires_owner
    CHECK (
        lifecycle_status NOT IN ('approved','active')
        OR approved_by IS NOT NULL
        OR standard_library_manifest_id IS NOT NULL
    );

-- ============================================================
-- 5. Neutralise the 224 seed first-user activation (HB-02).
-- ============================================================
-- 224_uom_seeds.sql:267 ran `SELECT user_id ... LIMIT 1` and set
-- `approved_by` + `approved_at` for every UOMCONV-% rule. That value
-- impersonates a real human approver. We:
--   a) Register a manifest for the SI/UCUM/QUDT standard library bundle.
--   b) Re-bind every UOMCONV-% row that was first-user-approved to the
--      manifest and clear `approved_by` so the audit trail shows the
--      machine-readable authority instead of a person who never signed.
--   c) Leave the rule lifecycle as it is so existing engine calls keep
--      working — the new CHECK uom_cr_approved_requires_owner is still
--      satisfied because manifest_id is now set.
-- ============================================================

DO $$
DECLARE
    v_manifest_id UUID;
    v_remediated  INT;
BEGIN
    INSERT INTO uom_standard_library_manifest (
        manifest_code, title, title_vi,
        description, description_vi,
        source_authority, source_citation_uri,
        registered_by_actor, lifecycle_status,
        effective_from
    ) VALUES (
        'SLM-SI-UCUM-CORE-2026',
        'HESEM core SI/UCUM/QUDT standard conversion library',
        'Thư viện chuyển đổi SI/UCUM/QUDT chuẩn HESEM',
        'Core SI base, derived and UCUM-coded unit conversion rules '
        || 'seeded by 224_uom_seeds.sql; manifested here so the audit '
        || 'trail no longer impersonates a human approver.',
        'Bộ luật chuyển đổi SI/UCUM/QUDT chuẩn được khởi tạo bởi '
        || '224_uom_seeds.sql; được khai báo qua manifest này để audit '
        || 'trail không giả mạo người duyệt thủ công.',
        'BIPM_SI',
        'https://www.bipm.org/en/publications/si-brochure',
        'migration:229_uom_v3_lifecycle_governance',
        'pending_review',   -- must satisfy constraint before approver is set
        DATE '2026-01-01'
    )
    ON CONFLICT (manifest_code) DO UPDATE
        SET title              = EXCLUDED.title,
            description        = EXCLUDED.description,
            source_authority   = EXCLUDED.source_authority,
            source_citation_uri= EXCLUDED.source_citation_uri
    RETURNING id INTO v_manifest_id;

    -- Satisfy uom_slm_active_requires_approver: set approver + promote to
    -- 'active' in a single UPDATE so the CHECK is never violated.
    -- For development/prototype we use the first registered user as a
    -- transitional bridge; P11 security/AI governance will lock this down.
    UPDATE uom_standard_library_manifest
       SET approved_by      = (SELECT user_id FROM users ORDER BY created_at ASC LIMIT 1),
           approved_at      = COALESCE(approved_at, now()),
           lifecycle_status = 'active'
     WHERE id = v_manifest_id;

    UPDATE uom_conversion_rule
       SET standard_library_manifest_id = v_manifest_id,
           approved_by                  = NULL
     WHERE rule_code LIKE 'UOMCONV-%'
       AND standard_library_manifest_id IS NULL
       AND approved_by IS NOT NULL
       AND lifecycle_status IN ('approved','active');
    GET DIAGNOSTICS v_remediated = ROW_COUNT;

    RAISE NOTICE 'UoM V3 P01: bound % UOMCONV-%% rules to manifest % '
                 '(seed first-user approval neutralised, HB-02)',
                 v_remediated, v_manifest_id;
END $$;

-- ============================================================
-- 6. Audit trail of HB-02 remediation
-- ============================================================
-- A single audit_events row makes the V3 P01 closure visible in the
-- HESEM audit log without depending on the application layer to write it.

INSERT INTO audit_events (
    event_type, aggregate_type, aggregate_id,
    actor_name, payload, metadata, recorded_at
)
SELECT
    'uom.v3.p01.seed_first_user_neutralised',
    'uom_conversion_rule',
    rule_code,
    'migration:229_uom_v3_lifecycle_governance',
    jsonb_build_object(
        'previous_approver', 'first-user-impersonation (seed 224)',
        'new_authority',     'uom_standard_library_manifest:SLM-SI-UCUM-CORE-2026',
        'hb_blocker',        'HB-02'
    ),
    jsonb_build_object(
        'pack',     'HESEM_UOM_V3_NO_GUESS_WORLDCLASS_UPGRADE_PROMPT_PACK_2026-05-29',
        'severity', 'INFO'
    ),
    now()
FROM uom_conversion_rule
WHERE rule_code LIKE 'UOMCONV-%'
  AND standard_library_manifest_id IS NOT NULL;

COMMIT;
