-- ============================================================================
-- Migration 186: Authorization kernel — apikeys + jwt catalog entries
-- ----------------------------------------------------------------------------
-- Adds the catalog rows for API key + JWT management permissions so the
-- AuthorizationKernel can gate ApiKeyController correctly. Without these
-- rows the kernel falls through to `no_grant_catalog_missing` even when a
-- role's grant pattern matches — costing observability and surprise behaviour
-- in JSON_ONLY mode.
--
-- Grants only the admin tier (it_admin explicit; ceo via existing `*` wildcard).
-- Every other role gets default-deny via the kernel.
--
-- Rationale:
--   * apikeys.view    AAL2 — list API keys (hashes redacted at the response layer)
--   * apikeys.create  AAL2, dangerous — mints a long-lived service credential
--   * apikeys.revoke  AAL2, dangerous — instant credential kill-switch
--   * jwt.issue       AAL2, dangerous — short-lived bearer tokens
--
-- Compatibility: rows are idempotent on permission_code, role grants use
-- jsonb_set with array append guarded by NOT IN to avoid duplicate keys.
-- Safe to re-run.
-- ============================================================================

BEGIN;

-- ── (1) Catalog rows ─────────────────────────────────────────────────────
INSERT INTO permission_catalog
    (permission_code, module_code, activity_code, label, label_vi,
     description, description_vi,
     is_dangerous, requires_reason, required_aal_level,
     sod_tags, compliance_refs, sort_order, is_active,
     payload_schema_version)
VALUES
    ('apikeys.view',   'apikeys', '01',
     'List API keys',  'Xem danh sách API key',
     'List API service credentials (hashes redacted).',
     'Xem danh sách API key dịch vụ (đã ẩn hash).',
     FALSE, FALSE, 2,
     ARRAY['credentials']::TEXT[], ARRAY['ISO27001:A.9.4','NIST:AC-3']::TEXT[],
     500, TRUE, '1.0'),
    ('apikeys.create', 'apikeys', '02',
     'Create API key', 'Tạo API key',
     'Mint a new long-lived API service credential. The raw key is shown once.',
     'Tạo API key dịch vụ mới. Khóa thô chỉ hiện 1 lần.',
     TRUE, TRUE, 2,
     ARRAY['credentials']::TEXT[], ARRAY['ISO27001:A.9.4','NIST:AC-3','21CFR11:11.10(d)']::TEXT[],
     501, TRUE, '1.0'),
    ('apikeys.revoke', 'apikeys', '03',
     'Revoke API key', 'Thu hồi API key',
     'Revoke an existing API service credential. Effect is immediate.',
     'Thu hồi API key dịch vụ. Có hiệu lực ngay.',
     TRUE, TRUE, 2,
     ARRAY['credentials']::TEXT[], ARRAY['ISO27001:A.9.4','NIST:AC-3','21CFR11:11.10(d)']::TEXT[],
     502, TRUE, '1.0'),
    ('jwt.issue',      'apikeys', '04',
     'Issue JWT token', 'Cấp JWT',
     'Issue a short-lived JWT bearer token for service-to-service auth.',
     'Cấp JWT bearer ngắn hạn cho gọi dịch vụ.',
     TRUE, FALSE, 2,
     ARRAY['credentials']::TEXT[], ARRAY['ISO27001:A.9.4','NIST:AC-3']::TEXT[],
     503, TRUE, '1.0')
ON CONFLICT (permission_code) DO UPDATE SET
    label              = EXCLUDED.label,
    label_vi           = EXCLUDED.label_vi,
    description        = EXCLUDED.description,
    description_vi     = EXCLUDED.description_vi,
    is_dangerous       = EXCLUDED.is_dangerous,
    required_aal_level = EXCLUDED.required_aal_level,
    sod_tags           = EXCLUDED.sod_tags,
    compliance_refs    = EXCLUDED.compliance_refs,
    is_active          = EXCLUDED.is_active,
    updated_at         = now();

-- ── (2) Grant the new perms to it_admin explicitly ───────────────────────
-- ceo already holds `*` (allowAllPermissions=true), so it inherits these.
-- Use a function to append a pattern to the grants[] array if missing.
DO $migration_186$
DECLARE
    grants_now JSONB;
    new_pat TEXT;
    target_role TEXT := 'it_admin';
    candidates TEXT[] := ARRAY['apikeys.*', 'jwt.issue'];
BEGIN
    SELECT permissions->'permissions' INTO grants_now
      FROM roles WHERE role_code = target_role;

    IF grants_now IS NULL THEN
        RAISE NOTICE 'Migration 186: role % not present — skipping grant.', target_role;
        RETURN;
    END IF;

    FOREACH new_pat IN ARRAY candidates LOOP
        IF NOT (grants_now @> to_jsonb(new_pat)) THEN
            grants_now := grants_now || to_jsonb(new_pat);
        END IF;
    END LOOP;

    UPDATE roles
       SET permissions = jsonb_set(permissions, '{permissions}', grants_now),
           updated_at  = now(),
           row_version = row_version + 1
     WHERE role_code = target_role;
END
$migration_186$;

COMMIT;

-- ============================================================================
-- Rollback (manual):
--   BEGIN;
--   UPDATE roles
--      SET permissions = jsonb_set(
--            permissions,
--            '{permissions}',
--            (SELECT jsonb_agg(p) FROM jsonb_array_elements(permissions->'permissions') p
--              WHERE p::text NOT IN ('"apikeys.*"','"jwt.issue"'))
--          ),
--          row_version = row_version + 1
--    WHERE role_code = 'it_admin';
--   DELETE FROM permission_catalog
--    WHERE permission_code IN ('apikeys.view','apikeys.create','apikeys.revoke','jwt.issue');
--   COMMIT;
-- ============================================================================
