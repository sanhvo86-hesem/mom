-- ============================================================================
-- 268_uom_v5_manifest_human_approval_lock.sql
-- HESEM UoM V5 P04: Standard Authority Manifest human approval lock.
--
-- Purpose:
--   * Register the RBAC permission used by UomStandardLibraryManifestService.
--   * Grant it only through the canonical roles.permissions JSONB source,
--     using existing permission evidence rather than frontend role strings.
--   * Quarantine any manifest/rule state that was activated by the historical
--     legacy seed bridge until a real human approval occurs through the service.
--
-- Posture: development/prototype -> pre-production readiness candidate.
-- ============================================================================

BEGIN;

INSERT INTO permission_catalog (
    permission_code,
    module_code,
    activity_code,
    label,
    label_vi,
    description,
    description_vi,
    is_dangerous,
    requires_reason,
    required_aal_level,
    sod_tags,
    compliance_refs,
    sort_order,
    metadata
) VALUES (
    'uom.standard_library_manifest.approve',
    'uom',
    '78',
    'Approve UoM standard library manifest',
    'Duyet manifest thu vien chuan UoM',
    'Approve standards-library manifests that can sponsor governed UoM conversion rules.',
    'Duyet manifest thu vien chuan co the bao tro quy tac chuyen doi UoM duoc kiem soat.',
    TRUE,
    TRUE,
    2,
    ARRAY['approve_uom_standard_manifest']::TEXT[],
    ARRAY['NIST 800-53 AC-6', '21 CFR Part 11 audit intent']::TEXT[],
    820,
    jsonb_build_object('prompt', 'UOM_V5_P04', 'source', 'migration_257')
)
ON CONFLICT (permission_code) DO UPDATE
   SET module_code = EXCLUDED.module_code,
       activity_code = EXCLUDED.activity_code,
       label = EXCLUDED.label,
       label_vi = EXCLUDED.label_vi,
       description = EXCLUDED.description,
       description_vi = EXCLUDED.description_vi,
       is_dangerous = EXCLUDED.is_dangerous,
       requires_reason = EXCLUDED.requires_reason,
       required_aal_level = EXCLUDED.required_aal_level,
       sod_tags = EXCLUDED.sod_tags,
       compliance_refs = EXCLUDED.compliance_refs,
       metadata = permission_catalog.metadata || EXCLUDED.metadata,
       updated_at = now();

-- Live databases may still retain the original 217 constraint name even
-- after historical governance migrations were recorded. Normalize the rule
-- lifecycle CHECK before quarantining legacy seed approvals to pending_review.
ALTER TABLE uom_conversion_rule
    DROP CONSTRAINT IF EXISTS uom_conversion_rule_lifecycle_status_check;
ALTER TABLE uom_conversion_rule
    DROP CONSTRAINT IF EXISTS uom_cr_lifecycle_v3;
ALTER TABLE uom_conversion_rule
    DROP CONSTRAINT IF EXISTS uom_cr_lifecycle_v5_manifest_lock;
ALTER TABLE uom_conversion_rule
    ADD CONSTRAINT uom_cr_lifecycle_v5_manifest_lock
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

-- Grant by canonical capability evidence, not by hardcoded role strings:
-- only roles that already have both document approval and audit export
-- authority get the UoM manifest approval privilege. Explicit denies still
-- override in the service.
UPDATE roles
   SET permissions = jsonb_set(
        COALESCE(permissions, '{}'::jsonb),
        '{permissions}',
        (
            SELECT to_jsonb(ARRAY(
                SELECT DISTINCT p
                  FROM (
                    SELECT jsonb_array_elements_text(COALESCE(roles.permissions->'permissions', '[]'::jsonb)) AS p
                    UNION ALL
                    SELECT 'uom.standard_library_manifest.approve'
                  ) grants
                 ORDER BY p
            ))
        ),
        true
       ),
       updated_at = now()
 WHERE COALESCE(permissions->'permissions', '[]'::jsonb) ? 'docs.approve'
   AND COALESCE(permissions->'permissions', '[]'::jsonb) ? 'audit.export'
   AND NOT (COALESCE(permissions->'denies', '[]'::jsonb) ? 'uom.standard_library_manifest.approve');

-- The V3 bridge made the core manifest active by assigning the first user.
-- P04 forbids that hidden authority. Put those rows back into human review
-- and make linked rules non-active until approval is replayed through the
-- permissioned service path.
WITH bridge_manifest AS (
    UPDATE uom_standard_library_manifest slm
       SET lifecycle_status = 'pending_review',
           approved_by = NULL,
           approved_at = NULL
      FROM (
        SELECT id, approved_by
          FROM uom_standard_library_manifest
         WHERE manifest_code = 'SLM-SI-UCUM-CORE-2026'
           AND approved_by IS NOT NULL
           AND registered_by_actor LIKE 'migration:%'
           AND lifecycle_status = 'active'
      ) old
     WHERE slm.id = old.id
     RETURNING slm.id, slm.manifest_code, old.approved_by AS previous_approver
),
rules_quarantined AS (
    UPDATE uom_conversion_rule r
       SET lifecycle_status = 'pending_review',
           approved_by = NULL,
           approved_at = NULL
      FROM bridge_manifest bm
     WHERE r.standard_library_manifest_id = bm.id
       AND r.lifecycle_status IN ('approved', 'active')
     RETURNING r.rule_code, bm.manifest_code, bm.previous_approver
)
INSERT INTO audit_events (
    event_type,
    aggregate_type,
    aggregate_id,
    actor_name,
    payload,
    metadata,
    recorded_at
)
SELECT
    'uom.v5.p04.first_user_bridge_quarantined',
    'uom_conversion_rule',
    rule_code,
    'migration:268_uom_v5_manifest_human_approval_lock',
    jsonb_build_object(
        'rule_code', rule_code,
        'manifest_code', manifest_code,
        'previous_approver', previous_approver,
        'new_lifecycle_status', 'pending_review',
        'reason', 'P04 forbids legacy seed or system impersonation for standard manifest activation'
    ),
    jsonb_build_object(
        'prompt', 'UOM_V5_P04',
        'severity', 'INFO'
    ),
    now()
FROM rules_quarantined;

COMMIT;

-- Rollback:
--   BEGIN;
--   DELETE FROM permission_catalog
--    WHERE permission_code = 'uom.standard_library_manifest.approve';
--   UPDATE roles
--      SET permissions = jsonb_set(
--          permissions,
--          '{permissions}',
--          COALESCE((
--              SELECT jsonb_agg(p)
--                FROM jsonb_array_elements_text(permissions->'permissions') p
--               WHERE p <> 'uom.standard_library_manifest.approve'
--          ), '[]'::jsonb),
--          true
--      );
--   COMMIT;
