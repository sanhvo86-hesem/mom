-- HESEM V8 Authority Ledger DDL
-- Per V8 file 04 §2

CREATE TABLE authority_ledger_v8 (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_code                   TEXT NOT NULL,
  resource_family             TEXT NOT NULL,
  authority_class             TEXT NOT NULL CHECK (authority_class IN
                                ('authoritative','projection','dependency','platform','vertical')),
  allowed_commands            JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_surfaces          JSONB NOT NULL DEFAULT '[]'::jsonb,
  guard_requirements          JSONB NOT NULL,
  audit_requirements          JSONB NOT NULL,
  rollback_model              TEXT NOT NULL CHECK (rollback_model IN
                                ('compensating_command','revert','no_reversal','custom')),
  rollback_definition_uri     TEXT,
  maturity_level              SMALLINT NOT NULL DEFAULT 0 CHECK (maturity_level BETWEEN 0 AND 7),
  validation_scope            TEXT NOT NULL CHECK (validation_scope IN
                                ('regulated_gxp','regulated_iatf','regulated_as9100',
                                 'regulated_itar','regulated_med_device','regulated_food','non_regulated')),
  intended_use                TEXT NOT NULL,
  out_of_scope                TEXT,
  forbidden_uses              JSONB NOT NULL DEFAULT '[]'::jsonb,
  tenant_id                   UUID,
  effective_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at               TIMESTAMPTZ,
  superseded_by_id            UUID REFERENCES authority_ledger_v8(id),
  signed_by                   TEXT NOT NULL,
  signature                   BYTEA NOT NULL,
  signature_algo              TEXT NOT NULL DEFAULT 'ed25519',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  UUID NOT NULL,
  metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT al_v8_root_unique UNIQUE (root_code, resource_family, authority_class, tenant_id, effective_at)
);

CREATE INDEX al_v8_root_idx ON authority_ledger_v8 (root_code);
CREATE INDEX al_v8_resource_family_idx ON authority_ledger_v8 (resource_family);
CREATE INDEX al_v8_authority_class_idx ON authority_ledger_v8 (authority_class);
CREATE INDEX al_v8_tenant_idx ON authority_ledger_v8 (tenant_id);
CREATE INDEX al_v8_active_idx ON authority_ledger_v8 (root_code, resource_family) WHERE superseded_at IS NULL;
CREATE INDEX al_v8_metadata_idx ON authority_ledger_v8 USING gin (metadata);
CREATE INDEX al_v8_allowed_commands_idx ON authority_ledger_v8 USING gin (allowed_commands);
CREATE INDEX al_v8_forbidden_surfaces_idx ON authority_ledger_v8 USING gin (forbidden_surfaces);

-- RLS
ALTER TABLE authority_ledger_v8 ENABLE ROW LEVEL SECURITY;
CREATE POLICY al_v8_tenant_iso ON authority_ledger_v8
  USING (tenant_id IS NULL OR
         tenant_id = current_setting('app.tenant_id', true)::uuid OR
         current_setting('app.tenant_id', true) = 'hesem-system');

-- Materialized view: active ledger entries
CREATE MATERIALIZED VIEW mv_authority_ledger_active AS
SELECT * FROM authority_ledger_v8 WHERE superseded_at IS NULL;
CREATE UNIQUE INDEX mv_al_active_pk ON mv_authority_ledger_active (root_code, resource_family, authority_class, tenant_id);

-- Axiom triggers (online enforcement; A-AL-1, A-AL-2, A-AL-7, A-AL-10 hot path)

-- A-AL-2: Active uniqueness (one entry with superseded_at IS NULL per (root, resource_family, authority_class, tenant))
CREATE UNIQUE INDEX al_v8_active_uniqueness
  ON authority_ledger_v8 (root_code, resource_family, authority_class, tenant_id)
  WHERE superseded_at IS NULL;

-- A-AL-3: effective_at <= NOW() at promotion (handled at app layer)

-- A-AL-7: signed_by must be active signer (validated at app layer; signer table)

-- A-AL-10: tenant_id NULL = system-level; cross-tenant edges only system-level
-- Enforced by RLS + middleware

-- Offline integrity job: axiom_AL_audit_job (per V8 file 04 §4)
-- - A-AL-1 every row has root_code in data/root_backlog_v8.json
-- - A-AL-4 maturity_level >= 5 → non-empty allowed_commands + workflow guards
-- - A-AL-5 regulated + maturity_level >= 5 → e_sign required
-- - A-AL-6 forbidden_surfaces contains WS for authority_class='authoritative'
-- - A-AL-8 every allowed_command exists in command_registry_v8
-- - A-AL-9 rollback_definition_uri present when rollback_model != 'no_reversal'
-- - A-AL-11 maturity_level transition by >1 step requires signed entry
