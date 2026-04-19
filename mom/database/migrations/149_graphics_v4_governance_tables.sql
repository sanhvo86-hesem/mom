-- ============================================================================
-- Migration 149: Graphics Authority — V4 governance extension
-- ============================================================================
-- Purpose:   Implement 5 missing V4 governance features identified by the
--            rules-extraction pass (_reports/agent-audits/graphics-v4-rules-
--            extraction-2026-04-19.md):
--              1. Token version history (R-084) — rollback evidence
--              2. QA gate runner (R-082) — persist 19-gate results
--              3. Contrast audit matrix (R-016/R-017/R-019) — text×bg pairs
--              4. Template zone × allowedBlocks binding (R-041, R-089)
--              5. Regulated entity registry (R-086, R-106) — 21 CFR / AS9100
--
-- Pattern:   SAP Save/Publish/Activate + retain-previous; SLDS component
--            contracts; Fluent triad (Light/Dark/HighContrast mandatory).
--
-- Author:    Graphics Control Plane rebuild — V4 conformance pass
-- Date:      2026-04-19
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: graphics_token_version
-- Snapshot per mutation of graphics_token_value. Fuels 7-day rollback
-- (V4 rule R-084). Write path: Repository/Service on commit; retention policy
-- trims rows older than retain_days (default 7 for non-critical, indefinite
-- for regulated tokens).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_token_version (
    version_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    token_key           VARCHAR(200) NOT NULL REFERENCES graphics_token_catalog(token_key) ON UPDATE CASCADE ON DELETE CASCADE,
    scope_type          VARCHAR(30)  NOT NULL,
    scope_id            VARCHAR(120) NOT NULL,
    color_mode          VARCHAR(20)  NOT NULL,
    value               TEXT         NOT NULL,
    version_number      INTEGER      NOT NULL,
    rollout_id          UUID         REFERENCES graphics_rollout_scope(rollout_id) ON DELETE SET NULL,
    captured_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    captured_by         VARCHAR(120),
    retain_days         INTEGER      NOT NULL DEFAULT 7,
    regulated_scope     TEXT[]       NOT NULL DEFAULT '{}',   -- ['21_CFR_11','AS9100'] — prevents auto-trim
    reason              TEXT,
    CONSTRAINT uq_graphics_token_version_order UNIQUE (token_key, scope_type, scope_id, color_mode, version_number)
);

CREATE INDEX IF NOT EXISTS idx_graphics_token_version_captured_at ON graphics_token_version(captured_at);
CREATE INDEX IF NOT EXISTS idx_graphics_token_version_rollout     ON graphics_token_version(rollout_id);
CREATE INDEX IF NOT EXISTS idx_graphics_token_version_key         ON graphics_token_version(token_key);

COMMENT ON TABLE  graphics_token_version IS 'Append-only history of token_value mutations. Fuels 1-click rollback (V4 R-084). 7-day default retention; regulated tokens retained indefinitely.';
COMMENT ON COLUMN graphics_token_version.regulated_scope IS 'If non-empty the row is regulated (21 CFR 11, AS9100, IATF 16949) and MUST NOT be auto-trimmed.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: graphics_qa_gate_result
-- Persists the 19-gate Standard-36 QA run per rollout (V4 R-082).
-- Gates:
--   G01 schema_validation   G02 template_match      G03 token_consistency
--   G04 dark_mode_sync      G05 contrast_aa         G06 wcag_22
--   G07 focus_ring          G08 responsive          G09 density
--   G10 manufacturing       G11 print_output        G12 perf_budget
--   G13 rollback_safety     G14 audit_trail         G15 naming_standard
--   G16 build_packet        G17 block_contract      G18 release_signoff
--   G19 platform_specific
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_qa_gate_result (
    result_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rollout_id          UUID         REFERENCES graphics_rollout_scope(rollout_id) ON DELETE CASCADE,
    simulation_run_id   UUID         REFERENCES graphics_simulation_run(run_id)    ON DELETE SET NULL,
    gate_id             VARCHAR(10)  NOT NULL,    -- G01..G19
    gate_name           VARCHAR(80)  NOT NULL,
    status              VARCHAR(20)  NOT NULL,    -- pass | warn | fail | skip | waived
    score               NUMERIC(5,2),             -- 0..100 when applicable
    findings            JSONB        NOT NULL DEFAULT '[]'::jsonb,
    blocker             BOOLEAN      NOT NULL DEFAULT FALSE,
    waiver_id           UUID,
    evaluator           VARCHAR(120),             -- 'automated:contrast', 'reviewer:<username>'
    evaluated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    evidence_url        TEXT,
    CONSTRAINT uq_graphics_qa_gate_result UNIQUE (rollout_id, gate_id)
);

CREATE INDEX IF NOT EXISTS idx_graphics_qa_gate_rollout ON graphics_qa_gate_result(rollout_id);
CREATE INDEX IF NOT EXISTS idx_graphics_qa_gate_blocker ON graphics_qa_gate_result(blocker);
CREATE INDEX IF NOT EXISTS idx_graphics_qa_gate_status  ON graphics_qa_gate_result(status);

COMMENT ON TABLE graphics_qa_gate_result IS 'Per-rollout result for each of the 19 Standard-36 QA gates. A blocker=true row prevents graphics_rollout_scope from transitioning to applied unless waived.';

-- Seed the 19 gates into a lookup (helps UI display; values repeated per row for query simplicity)
CREATE TABLE IF NOT EXISTS graphics_qa_gate_catalog (
    gate_id             VARCHAR(10)  PRIMARY KEY,
    gate_name           VARCHAR(80)  NOT NULL,
    category            VARCHAR(30)  NOT NULL,   -- schema | visual | a11y | perf | compliance
    is_automated        BOOLEAN      NOT NULL DEFAULT FALSE,
    default_blocker     BOOLEAN      NOT NULL DEFAULT TRUE,
    description         TEXT
);

INSERT INTO graphics_qa_gate_catalog (gate_id, gate_name, category, is_automated, default_blocker, description) VALUES
('G01','Schema validation','schema',TRUE, TRUE, 'design-system-config and token catalog validate against JSON-Schema'),
('G02','Template match','schema',TRUE, TRUE, 'Selected template archetype matches module archetype per naming standard'),
('G03','Token consistency','schema',TRUE, TRUE, 'Every consumed token key exists in graphics_token_catalog'),
('G04','Dark mode sync','visual',TRUE, TRUE, 'Every token has a default_dark value (Fluent triad rule)'),
('G05','Contrast AA','a11y',TRUE, TRUE, 'WCAG AA contrast on all (text, surface) pairs; see graphics_contrast_check'),
('G06','WCAG 2.2','a11y',TRUE, FALSE,'axe-core scan on the component gallery'),
('G07','Focus ring','a11y',TRUE, TRUE, 'Focus ring ≥3:1 against every --bg-* surface'),
('G08','Responsive','visual',FALSE,TRUE, 'Grid collapses 4→2→1 at tokens’ breakpoints; reflow @320px / @400%'),
('G09','Density','visual',FALSE,FALSE,'Compact density preserves ≥24×24 touch targets'),
('G10','Manufacturing','compliance',FALSE,FALSE,'Machine-status theme invariance; ISO 3864 safety colors'),
('G11','Print output','visual',FALSE,TRUE, '@media print forces B&W, removes shadows, 11pt minimum'),
('G12','Perf budget','perf',TRUE, FALSE,'Bundle < 256 KB gzip for portal theme CSS'),
('G13','Rollback safety','compliance',TRUE, TRUE, 'prior_snapshot present and restorable'),
('G14','Audit trail','compliance',TRUE, TRUE, 'Simulation run and audit events written before apply'),
('G15','Naming standard','schema',TRUE, FALSE,'Tokens match --{category}-{name}-{variant}'),
('G16','Build packet','schema',TRUE, FALSE,'Module build packet carries all 24 required fields'),
('G17','Block contract','schema',TRUE, FALSE,'Block carries 14 required contract fields'),
('G18','Release signoff','compliance',FALSE,TRUE, 'CAB / approver recorded in rollout_scope.approved_by'),
('G19','Platform specific','visual',FALSE,FALSE,'Mobile scanner / shopfloor-board / andon projection tested')
ON CONFLICT (gate_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: graphics_contrast_check
-- Materialized WCAG 2.2 contrast audit row per (rollout × text_token × bg_token
-- × color_mode). Gates rollout apply; feeds admin contrast matrix UI.
-- Replaces the ad-hoc JSON in graphics_simulation_run.wcag_report when the
-- check needs to be queryable.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_contrast_check (
    check_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rollout_id          UUID         REFERENCES graphics_rollout_scope(rollout_id) ON DELETE CASCADE,
    simulation_run_id   UUID         REFERENCES graphics_simulation_run(run_id)    ON DELETE SET NULL,
    text_token_key      VARCHAR(200) NOT NULL REFERENCES graphics_token_catalog(token_key) ON UPDATE CASCADE ON DELETE CASCADE,
    bg_token_key        VARCHAR(200) NOT NULL REFERENCES graphics_token_catalog(token_key) ON UPDATE CASCADE ON DELETE CASCADE,
    color_mode          VARCHAR(20)  NOT NULL,
    text_value          TEXT         NOT NULL,
    bg_value            TEXT         NOT NULL,
    contrast_ratio      NUMERIC(6,3) NOT NULL,
    wcag_level          VARCHAR(10)  NOT NULL,         -- AAA | AA | AA-large | FAIL
    is_large_text       BOOLEAN      NOT NULL DEFAULT FALSE,
    required_min        NUMERIC(4,2) NOT NULL DEFAULT 4.50,
    blocker             BOOLEAN      NOT NULL DEFAULT FALSE,
    colorblind_sim      JSONB,                          -- {deuteranopia:ratio, protanopia:ratio, tritanopia:ratio, achromatopsia:ratio}
    checked_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_graphics_contrast_check UNIQUE (rollout_id, text_token_key, bg_token_key, color_mode)
);

CREATE INDEX IF NOT EXISTS idx_graphics_contrast_rollout ON graphics_contrast_check(rollout_id);
CREATE INDEX IF NOT EXISTS idx_graphics_contrast_blocker ON graphics_contrast_check(blocker);
CREATE INDEX IF NOT EXISTS idx_graphics_contrast_level   ON graphics_contrast_check(wcag_level);

COMMENT ON TABLE graphics_contrast_check IS 'WCAG AA/AAA contrast row per (text_token × bg_token × color_mode × rollout). Drives the admin contrast matrix and the G05 QA gate.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: graphics_template_zone_binding
-- Per-template whitelist of which block types may render in which zone
-- (V4 R-041, R-089). Populated by template seed; block engine reads and
-- rejects unknown block/zone combinations at runtime.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_template_zone_binding (
    binding_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         VARCHAR(120) NOT NULL,
    template_version    VARCHAR(30)  NOT NULL,
    zone_key            VARCHAR(60)  NOT NULL,       -- header | main | sidebar | kpi-bar | filter | footer | chart-area | scroll-sticky
    allowed_block_types TEXT[]       NOT NULL DEFAULT '{}',
    required_block_types TEXT[]      NOT NULL DEFAULT '{}',
    max_blocks          INTEGER,
    responsive_visible  JSONB        NOT NULL DEFAULT '{"mobile":true,"tablet":true,"desktop":true}'::jsonb,
    priority_weight     INTEGER      NOT NULL DEFAULT 100,
    a11y_landmark       VARCHAR(40),                  -- banner | main | navigation | complementary | contentinfo
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_graphics_template_zone UNIQUE (template_id, template_version, zone_key)
);

CREATE INDEX IF NOT EXISTS idx_graphics_template_zone_template ON graphics_template_zone_binding(template_id);

COMMENT ON TABLE graphics_template_zone_binding IS 'Zone×allowed_block_types whitelist per template version (V4 R-041/R-089). Block engine MUST reject any block whose type is not allowed in the target zone.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: graphics_regulated_entity
-- Registry of entity types that fall under 21 CFR Part 11 / AS9100 / IATF
-- 16949 / GDPR. The Change-Control gate routes mutations on these entity
-- types through explicit approval (V4 R-086, R-106).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graphics_regulated_entity (
    entity_registry_id  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_key          VARCHAR(80)  NOT NULL UNIQUE,   -- ncr | capa | wo | doc_controlled | training | calibration | ...
    display_name        VARCHAR(120) NOT NULL,
    regulatory_scope    TEXT[]       NOT NULL,           -- ['21_CFR_11','AS9100','IATF_16949','GDPR','ISO_9001','FDA_820']
    esignature_required BOOLEAN      NOT NULL DEFAULT TRUE,
    audit_trail_required BOOLEAN     NOT NULL DEFAULT TRUE,
    retention_days      INTEGER      NOT NULL DEFAULT 3650,   -- 10 years default for 21 CFR Part 11
    change_control_required BOOLEAN  NOT NULL DEFAULT TRUE,
    change_control_board VARCHAR(120),                   -- role key that approves changes
    immutable_once_approved BOOLEAN  NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE graphics_regulated_entity IS 'Which entity types trigger 21 CFR Part 11 / AS9100 / IATF 16949 gates. Consumed by the change-control router, audit service, and token version retention policy.';

-- Seed the most common regulated entities (conservative — everything defaults
-- to "regulated" so a reviewer must explicitly opt a new entity out).
INSERT INTO graphics_regulated_entity (entity_key, display_name, regulatory_scope, esignature_required, retention_days, change_control_board, notes) VALUES
('ncr',               'Non-conformance report',        ARRAY['21_CFR_11','AS9100','IATF_16949','ISO_9001'], TRUE, 3650, 'role.quality_manager', 'NCR full 21 CFR Part 11'),
('capa',              'Corrective & preventive action',ARRAY['21_CFR_11','AS9100','IATF_16949','ISO_9001'], TRUE, 3650, 'role.quality_manager', 'CAPA full 21 CFR Part 11'),
('complaint',         'Customer complaint',            ARRAY['21_CFR_11','ISO_9001'], TRUE, 3650, 'role.customer_quality', 'Customer voice — full regulated'),
('deviation',         'Deviation',                     ARRAY['21_CFR_11','AS9100','IATF_16949'], TRUE, 3650, 'role.quality_manager', ''),
('change_control',    'Engineering change control',    ARRAY['21_CFR_11','AS9100','IATF_16949'], TRUE, 3650, 'role.change_control_board', ''),
('doc_controlled',    'Controlled document',           ARRAY['21_CFR_11','AS9100','IATF_16949','ISO_9001'], TRUE, 3650, 'role.document_control', ''),
('training',          'Training record',               ARRAY['21_CFR_11','AS9100','IATF_16949'], TRUE, 3650, 'role.training_lead', ''),
('competency',        'Competency assessment',         ARRAY['AS9100','IATF_16949'], TRUE, 3650, 'role.training_lead', ''),
('calibration',       'Calibration record',            ARRAY['21_CFR_11','AS9100','IATF_16949','ISO_9001'], TRUE, 3650, 'role.calibration_lead', ''),
('audit',             'Audit (internal/external)',     ARRAY['AS9100','IATF_16949','ISO_9001'], TRUE, 3650, 'role.quality_manager', ''),
('validation',        'Process/software validation',   ARRAY['21_CFR_11','AS9100'], TRUE, 3650, 'role.validation_lead', ''),
('fai',               'First article inspection',      ARRAY['AS9100','IATF_16949'], TRUE, 3650, 'role.quality_engineer', 'AS9102 FAI'),
('esignature',        'Electronic signature record',   ARRAY['21_CFR_11'], TRUE, 3650, 'role.system', 'Immutable, indefinite retention recommended'),
('lot_release',       'Lot release',                   ARRAY['21_CFR_11','AS9100','IATF_16949'], TRUE, 3650, 'role.quality_manager', ''),
('supplier',          'Supplier master',               ARRAY['AS9100','IATF_16949','ISO_9001'], FALSE, 3650, 'role.procurement_lead', ''),
('scar',              'Supplier corrective action',    ARRAY['AS9100','IATF_16949','ISO_9001'], TRUE, 3650, 'role.supplier_quality', '')
ON CONFLICT (entity_key) DO NOTHING;

COMMIT;

-- ============================================================================
-- Migration 149 complete. Acceptance criteria:
-- • graphics_token_version populated on every graphics_token_value update
--   (wired from DesignTokenCatalogService::publishRollout + rollbackRollout)
-- • graphics_qa_gate_result rows created by QaGateRunnerService (one per G01..G19
--   per rollout). Any blocker=true row prevents applied transition.
-- • graphics_contrast_check rows created by ContrastAuditService — matrix
--   of every text_token × bg_token × color_mode for the staged change set.
-- • graphics_template_zone_binding consulted by block engine before rendering
--   every block; a block outside its zone whitelist MUST throw at runtime.
-- • graphics_regulated_entity consulted by change-control gate before a
--   regulated entity's related token can move from draft → applied.
-- ============================================================================
