-- P51: Regulated domain command evidence, audit, and e-signature runtime spine.
-- This migration does not create a user identity authority. Signer identity
-- remains `users` / `v_user_canonical`; command evidence stores only immutable
-- links, hashes, and signer references.

BEGIN;

CREATE TABLE IF NOT EXISTS regulated_action_policy (
    policy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    command_name TEXT NOT NULL UNIQUE,
    root TEXT NOT NULL,
    site_applicability TEXT NOT NULL DEFAULT '*',
    org_applicability TEXT NOT NULL DEFAULT '*',
    risk_class TEXT NOT NULL CHECK (risk_class IN ('low', 'medium', 'high', 'critical')),
    signature_required BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_signature_meanings JSONB NOT NULL DEFAULT '[]'::jsonb,
    sod_required BOOLEAN NOT NULL DEFAULT TRUE,
    reauth_required BOOLEAN NOT NULL DEFAULT TRUE,
    evidence_required BOOLEAN NOT NULL DEFAULT TRUE,
    retention_days INTEGER NOT NULL DEFAULT 3650,
    validation_status TEXT NOT NULL DEFAULT 'pre_production_candidate'
        CHECK (validation_status IN ('draft', 'pre_production_candidate', 'validated', 'retired')),
    policy_hash_sha256 CHAR(64) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domain_command_evidence_links (
    evidence_link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    command_name TEXT NOT NULL,
    command_id TEXT NOT NULL,
    root TEXT NOT NULL,
    record_type TEXT NOT NULL,
    record_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    signature_event_id UUID REFERENCES signature_events(signature_event_id),
    requirement_snapshot_hash_sha256 CHAR(64) NOT NULL,
    command_record_hash_sha256 CHAR(64) NOT NULL,
    displayed_record_hash_sha256 CHAR(64),
    package_hash_sha256 CHAR(64),
    source_ip TEXT,
    device_id TEXT,
    session_id TEXT,
    idempotency_key TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (command_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_domain_command_evidence_links_record
    ON domain_command_evidence_links (record_type, record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_command_evidence_links_signature
    ON domain_command_evidence_links (signature_event_id)
    WHERE signature_event_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_domain_command_evidence_links_immutable_update ON domain_command_evidence_links;
CREATE TRIGGER trg_domain_command_evidence_links_immutable_update
    BEFORE UPDATE ON domain_command_evidence_links
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

DROP TRIGGER IF EXISTS trg_domain_command_evidence_links_immutable_delete ON domain_command_evidence_links;
CREATE TRIGGER trg_domain_command_evidence_links_immutable_delete
    BEFORE DELETE ON domain_command_evidence_links
    FOR EACH ROW EXECUTE FUNCTION eqms_prevent_update_delete();

WITH policy_seed(command_name, root, risk_class, signature_required, meanings) AS (
    VALUES
        ('ReleaseItemRevisionCommand', 'item_revision', 'high', TRUE, ARRAY['item_revision_release']::TEXT[]),
        ('CreateEngineeringReleasePackageCommand', 'engineering_release_package', 'medium', FALSE, ARRAY[]::TEXT[]),
        ('AddPackageMemberCommand', 'engineering_release_package', 'medium', FALSE, ARRAY[]::TEXT[]),
        ('SubmitEngineeringReleasePackageCommand', 'engineering_release_package', 'high', TRUE, ARRAY['engineering_package_submit']::TEXT[]),
        ('ApproveEngineeringReleasePackageCommand', 'engineering_release_package', 'critical', TRUE, ARRAY['engineering_package_approval']::TEXT[]),
        ('ReleaseEngineeringReleasePackageCommand', 'engineering_release_package', 'critical', TRUE, ARRAY['engineering_package_release']::TEXT[]),
        ('SupersedeEngineeringReleasePackageCommand', 'engineering_release_package', 'critical', TRUE, ARRAY['engineering_package_supersede']::TEXT[]),
        ('WithdrawEngineeringReleasePackageCommand', 'engineering_release_package', 'high', TRUE, ARRAY['engineering_package_withdraw']::TEXT[]),
        ('BindEngineeringPackageToWorkOrderCommand', 'work_order', 'critical', TRUE, ARRAY['work_order_engineering_package_bind']::TEXT[]),
        ('BindEngineeringPackageToJobOrderCommand', 'job_order', 'critical', TRUE, ARRAY['job_order_engineering_package_bind']::TEXT[]),
        ('BindEngineeringPackageToSalesOrderCommand', 'sales_order', 'critical', TRUE, ARRAY['sales_order_engineering_package_bind']::TEXT[]),
        ('ReleaseWorkOrderCommand', 'work_order', 'critical', TRUE, ARRAY['work_order_release']::TEXT[]),
        ('StartJobCommand', 'work_order', 'high', FALSE, ARRAY[]::TEXT[]),
        ('IssueMaterialToWorkOrderCommand', 'inventory_issue', 'high', FALSE, ARRAY[]::TEXT[]),
        ('LoadToolCommand', 'tooling', 'high', FALSE, ARRAY[]::TEXT[]),
        ('RecordInspectionResultCommand', 'inspection_result', 'critical', TRUE, ARRAY['inspection_result_record']::TEXT[]),
        ('CompleteOperationCommand', 'operation_execution', 'high', FALSE, ARRAY[]::TEXT[]),
        ('ApplyQualityHoldCommand', 'quality_hold', 'critical', TRUE, ARRAY['quality_hold_apply']::TEXT[]),
        ('ReleaseQualityHoldCommand', 'quality_hold', 'critical', TRUE, ARRAY['quality_hold_release']::TEXT[]),
        ('PostInventoryLedgerTransactionCommand', 'inventory_ledger', 'critical', TRUE, ARRAY['inventory_ledger_post']::TEXT[])
)
INSERT INTO regulated_action_policy
    (command_name, root, risk_class, signature_required, allowed_signature_meanings,
     sod_required, reauth_required, evidence_required, retention_days, validation_status,
     policy_hash_sha256, metadata)
SELECT
    command_name,
    root,
    risk_class,
    signature_required,
    to_jsonb(meanings),
    TRUE,
    TRUE,
    TRUE,
    3650,
    'pre_production_candidate',
    encode(digest(command_name || '|' || root || '|' || risk_class || '|' || signature_required::text || '|' || meanings::text, 'sha256'), 'hex'),
    jsonb_build_object('authority', 'P51 RegulatedActionPolicy', 'posture', 'pre_production_candidate')
FROM policy_seed
ON CONFLICT (command_name) DO UPDATE SET
    root = EXCLUDED.root,
    risk_class = EXCLUDED.risk_class,
    signature_required = EXCLUDED.signature_required,
    allowed_signature_meanings = EXCLUDED.allowed_signature_meanings,
    sod_required = EXCLUDED.sod_required,
    reauth_required = EXCLUDED.reauth_required,
    evidence_required = EXCLUDED.evidence_required,
    retention_days = EXCLUDED.retention_days,
    validation_status = EXCLUDED.validation_status,
    policy_hash_sha256 = EXCLUDED.policy_hash_sha256,
    metadata = EXCLUDED.metadata,
    updated_at = now();

CREATE TABLE IF NOT EXISTS regulated_action_validation_protocol (
    protocol_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol_code TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (validation_status IN ('draft', 'executed', 'approved', 'retired')),
    required_scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_package_ref TEXT,
    approved_signature_event_id UUID REFERENCES signature_events(signature_event_id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO regulated_action_validation_protocol
    (protocol_code, scope, required_scenarios, metadata)
VALUES
    (
        'V4-P51-REGULATED-EVIDENCE-SPINE',
        'DomainCommandGateway regulated command evidence and e-signature gate',
        '["V4-SIM-051-001","V4-SIM-051-002","V4-SIM-051-003","V4-SIM-051-004","V4-SIM-051-005","V4-SIM-051-006","V4-SIM-051-007","V4-SIM-051-008"]'::jsonb,
        '{"posture":"pre_production_candidate","authority":"P51"}'::jsonb
    )
ON CONFLICT (protocol_code) DO UPDATE SET
    required_scenarios = EXCLUDED.required_scenarios,
    metadata = EXCLUDED.metadata,
    updated_at = now();

COMMIT;
