-- MDA runtime authority closure: universal governed-table guard plus
-- server-side SoD and privileged re-auth evidence stores.

CREATE TABLE IF NOT EXISTS domain_command_sod_exception (
    exception_id TEXT PRIMARY KEY,
    command_name TEXT NOT NULL,
    subject_type TEXT,
    subject_ref TEXT,
    requested_by TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    approval_signature_event_id UUID,
    reason TEXT NOT NULL,
    scope_site_id TEXT,
    org_id TEXT,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'approved', 'rejected', 'revoked', 'expired')),
    one_time BOOLEAN NOT NULL DEFAULT TRUE,
    consumed_at TIMESTAMPTZ,
    command_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (requested_by <> approved_by)
);

CREATE INDEX IF NOT EXISTS idx_domain_command_sod_exception_scope
    ON domain_command_sod_exception (command_name, subject_type, subject_ref, scope_site_id, status, valid_until);

CREATE TABLE IF NOT EXISTS domain_command_reauth_challenge (
    challenge_id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    command_name TEXT NOT NULL,
    payload_hash_sha256 CHAR(64),
    intent_hash_sha256 CHAR(64),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    result TEXT NOT NULL DEFAULT 'issued'
        CHECK (result IN ('issued', 'verified', 'failed', 'expired', 'consumed', 'revoked')),
    evidence_signature_event_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_domain_command_reauth_challenge_actor
    ON domain_command_reauth_challenge (actor_id, command_name, expires_at)
    WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS domain_command_break_glass_grant (
    grant_id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    permission TEXT NOT NULL,
    reason TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    approval_signature_event_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'approved', 'rejected', 'revoked', 'expired')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    one_time BOOLEAN NOT NULL DEFAULT TRUE,
    consumed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (requested_by <> approved_by)
);

CREATE INDEX IF NOT EXISTS idx_domain_command_break_glass_grant_actor
    ON domain_command_break_glass_grant (actor_id, permission, valid_until)
    WHERE status = 'approved';

CREATE TABLE IF NOT EXISTS generic_crud_denial_event (
    denial_id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    root_code TEXT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    sql_state TEXT NOT NULL DEFAULT '42501',
    actor_name TEXT NOT NULL DEFAULT CURRENT_USER,
    application_name TEXT NOT NULL DEFAULT CURRENT_SETTING('application_name', TRUE),
    detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION hesem_governed_generic_crud_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_root_code TEXT;
    v_policy TEXT;
    v_commands JSONB;
    v_domain_context TEXT;
    v_domain_command_name TEXT;
    v_domain_command_id TEXT;
    v_generic_context TEXT;
BEGIN
    SELECT root_code, generic_mutation_policy, allowed_commands
      INTO v_root_code, v_policy, v_commands
      FROM governed_entity_registry
     WHERE table_name = TG_TABLE_NAME
       AND active = TRUE
     ORDER BY registry_id
     LIMIT 1;

    IF v_policy IS NULL OR v_policy <> 'domain_command_required' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    v_generic_context := COALESCE(current_setting('hesem.generic_crud_context', TRUE), '0');
    v_domain_context := COALESCE(current_setting('hesem.domain_command_context', TRUE), '0');
    v_domain_command_name := COALESCE(current_setting('hesem.domain_command_name', TRUE), '');
    v_domain_command_id := COALESCE(current_setting('hesem.domain_command_id', TRUE), '');

    IF v_generic_context <> '1'
       AND v_domain_context = '1'
       AND v_domain_command_name <> ''
       AND v_domain_command_id <> '' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    INSERT INTO generic_crud_denial_event (root_code, table_name, operation, detail)
    VALUES (
        v_root_code,
        TG_TABLE_NAME,
        TG_OP,
        jsonb_build_object(
            'problem_type', 'https://hesemeng.com/problems/domain-command-required',
            'allowed_commands', COALESCE(v_commands, '[]'::jsonb),
            'generic_crud_context', v_generic_context,
            'domain_command_context', v_domain_context,
            'domain_command_name', v_domain_command_name,
            'domain_command_id_present', v_domain_command_id <> ''
        )
    );

    RAISE EXCEPTION 'domain_command_required: governed table % requires trusted DomainCommandGateway context', TG_TABLE_NAME
        USING ERRCODE = '42501',
              DETAIL = 'Direct INSERT/UPDATE/DELETE and Generic CRUD are denied for governed tables unless a trusted domain command transaction sets hesem.domain_command_* context.';
END;
$$;

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOR v_table IN
        SELECT table_name
          FROM governed_entity_registry
         WHERE active = TRUE
         ORDER BY table_name
    LOOP
        IF to_regclass(v_table) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_governed_generic_crud_guard ON %I', v_table);
            EXECUTE format(
                'CREATE TRIGGER trg_governed_generic_crud_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hesem_governed_generic_crud_guard()',
                v_table
            );
        END IF;
    END LOOP;
END;
$$;
