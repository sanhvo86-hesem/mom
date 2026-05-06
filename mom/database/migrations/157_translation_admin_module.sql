-- ============================================================================
-- Migration 157: Translation Admin Module — multi-provider routing & cost log
-- ============================================================================
-- Purpose:
--   Replace the single-provider toggle (mom/data/config/dcc-translation-config.json)
--   with a database-backed registry that supports multiple translation
--   providers (NLLB local, Claude CLI, Codex CLI, plus future API providers),
--   per-tier routing, per-document overrides, and a usage/cost ledger.
--
-- Design contract:
--   - The existing JSON config remains as a legacy fallback. If no routing
--     rule resolves for a given doc, automation falls back to the JSON file,
--     which itself falls back to env vars (DCC_TRANSLATION_DRIVER /
--     DCC_TRANSLATION_COMMAND). This preserves the v4.1 behavior.
--   - All four tables are admin-only writable. Read access is gated through
--     the same admin role policy as DocumentControlController.
--   - API keys (translation_credentials.ciphertext) are encrypted with
--     libsodium secretbox. Master key sourced from APP_SECRET_KEY env var.
--     If that env var is unset, the SecretVaultService refuses to encrypt
--     and the UI shows a setup banner.
--
-- Tables:
--   translation_provider_config — registry of available providers
--   translation_credentials     — encrypted API keys + per-key probe state
--   translation_routing         — per-scope provider+model assignment
--   translation_usage_log       — append-only ledger of every translate call
--
-- Standards:
--   ISO 9001 §7.5 (control of documented information),
--   ISO 27001 A.10.1 (cryptography),
--   ISO 27001 A.12.4 (logging and monitoring).
-- Date: 2026-05-06
-- ============================================================================

BEGIN;

-- ── 1. Provider registry ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS translation_provider_config (
    provider_key       VARCHAR(40)  PRIMARY KEY,
    display_name       VARCHAR(120) NOT NULL,
    provider_kind      VARCHAR(20)  NOT NULL,
    driver_command     VARCHAR(500) NOT NULL,
    capabilities       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    default_options    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    health_status      VARCHAR(20)  NOT NULL DEFAULT 'unknown',
    health_checked_at  TIMESTAMPTZ,
    health_message     TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_translation_provider_kind
        CHECK (provider_kind IN ('local_model', 'cli_subscription', 'http_api')),
    CONSTRAINT ck_translation_provider_health
        CHECK (health_status IN ('unknown', 'ok', 'degraded', 'unauthenticated', 'down'))
);

COMMENT ON TABLE translation_provider_config
    IS 'Registry of translation providers available to the admin routing module. Each row maps a logical provider_key to a driver command (Python script invocation).';
COMMENT ON COLUMN translation_provider_config.provider_kind
    IS 'local_model = on-prem (NLLB/Argos), cli_subscription = OAuth subscription CLI (claude/codex), http_api = pay-per-token API (anthropic/openai REST)';
COMMENT ON COLUMN translation_provider_config.capabilities
    IS 'JSON: {supports_models, max_input_chars, supports_streaming, requires_credentials, requires_cli_auth, candidate_models:[]}';

-- ── 2. Encrypted credentials + CLI runtime state ────────────────────────────

CREATE TABLE IF NOT EXISTS translation_credentials (
    provider_key       VARCHAR(40)  PRIMARY KEY
        REFERENCES translation_provider_config(provider_key) ON DELETE CASCADE,
    credential_kind    VARCHAR(20)  NOT NULL DEFAULT 'api_key',
    ciphertext         BYTEA,
    nonce              BYTEA,
    key_fingerprint    VARCHAR(32),
    cli_binary_path    VARCHAR(400),
    cli_auth_home_path VARCHAR(400),
    cli_auth_subject   VARCHAR(200),
    available_models   JSONB,
    models_fetched_at  TIMESTAMPTZ,
    last_test_at       TIMESTAMPTZ,
    last_test_status   VARCHAR(20),
    last_test_message  TEXT,
    rate_limit_window  JSONB,
    created_by         VARCHAR(120),
    rotated_at         TIMESTAMPTZ,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_translation_credential_kind
        CHECK (credential_kind IN ('api_key', 'cli_auth', 'none')),
    CONSTRAINT ck_translation_credential_test_status
        CHECK (last_test_status IS NULL OR last_test_status IN
               ('ok', 'auth_failed', 'quota_exceeded', 'network_error',
                'timeout', 'binary_missing', 'config_error'))
);

COMMENT ON TABLE translation_credentials
    IS 'Per-provider runtime credentials. For api_key kind, ciphertext+nonce hold the libsodium-encrypted secret. For cli_auth kind, the OAuth token lives in cli_auth_home_path on disk and we only track binary location + probe state.';
COMMENT ON COLUMN translation_credentials.ciphertext
    IS 'libsodium secretbox(api_key, nonce, master_key from APP_SECRET_KEY env). Never logged. Never returned through any API.';
COMMENT ON COLUMN translation_credentials.key_fingerprint
    IS 'sha256(api_key)[:32] hex. Safe to display in UI for verification without revealing the key.';

-- ── 3. Routing table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS translation_routing (
    routing_id         BIGSERIAL    PRIMARY KEY,
    scope_type         VARCHAR(20)  NOT NULL,
    scope_value        VARCHAR(200) NOT NULL,
    primary_provider   VARCHAR(40)  NOT NULL
        REFERENCES translation_provider_config(provider_key) ON DELETE RESTRICT,
    primary_model      VARCHAR(120),
    fallback_chain     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    options_override   JSONB,
    priority           INT          NOT NULL DEFAULT 100,
    is_enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    description        TEXT,
    created_by         VARCHAR(120),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by         VARCHAR(120),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_translation_routing_scope
        CHECK (scope_type IN ('global_default', 'tier', 'doc_pattern', 'doc_code')),
    CONSTRAINT ck_translation_routing_global_value
        CHECK (scope_type <> 'global_default' OR scope_value = '*')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_translation_routing_scope
    ON translation_routing(scope_type, scope_value)
    WHERE is_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_translation_routing_priority
    ON translation_routing(priority DESC, scope_type);

COMMENT ON TABLE translation_routing
    IS 'Routing rules: which provider+model handles which document. Resolution order (highest priority wins): doc_code > doc_pattern > tier > global_default.';
COMMENT ON COLUMN translation_routing.scope_value
    IS 'global_default: "*". tier: tier_1|tier_2|tier_3. doc_pattern: glob like "qms-man-*". doc_code: exact code like "QMS-MAN-001".';
COMMENT ON COLUMN translation_routing.fallback_chain
    IS 'Ordered JSON array: [{"provider":"nllb","model":"600M"}, ...]. Tried in order on primary failure (API/quality gate).';

-- ── 4. Usage / cost ledger ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS translation_usage_log (
    usage_id            BIGSERIAL    PRIMARY KEY,
    doc_code            VARCHAR(80),
    provider_key        VARCHAR(40),
    model_id            VARCHAR(120),
    trigger_kind        VARCHAR(40)  NOT NULL DEFAULT 'edit',
    input_tokens        INT,
    cached_input_tokens INT,
    output_tokens       INT,
    cost_usd_microcents BIGINT,
    duration_ms         INT,
    outcome             VARCHAR(20)  NOT NULL,
    error_code          VARCHAR(60),
    fallback_from       VARCHAR(40),
    metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_translation_usage_outcome
        CHECK (outcome IN ('ok', 'quality_fail', 'api_error', 'timeout',
                           'auth_failed', 'rate_limited', 'driver_crash',
                           'invalid_payload'))
);

CREATE INDEX IF NOT EXISTS idx_translation_usage_provider_time
    ON translation_usage_log(provider_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_translation_usage_doc_time
    ON translation_usage_log(doc_code, created_at DESC);

COMMENT ON TABLE translation_usage_log
    IS 'Append-only ledger of every translation attempt. Powers the admin Cost & Usage dashboard and rate-limit guardrails. Cost stored as microcents (USD * 1e8) to avoid float drift.';

-- ── 5. Touch trigger (reuse pattern from migration 152) ─────────────────────

DROP TRIGGER IF EXISTS trg_translation_provider_config_touch ON translation_provider_config;
CREATE TRIGGER trg_translation_provider_config_touch
    BEFORE UPDATE ON translation_provider_config
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

DROP TRIGGER IF EXISTS trg_translation_credentials_touch ON translation_credentials;
CREATE TRIGGER trg_translation_credentials_touch
    BEFORE UPDATE ON translation_credentials
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

DROP TRIGGER IF EXISTS trg_translation_routing_touch ON translation_routing;
CREATE TRIGGER trg_translation_routing_touch
    BEFORE UPDATE ON translation_routing
    FOR EACH ROW EXECUTE FUNCTION dcc_touch_updated_at();

-- ── 6. Seed providers ───────────────────────────────────────────────────────

INSERT INTO translation_provider_config
    (provider_key, display_name, provider_kind, driver_command, capabilities, default_options, is_enabled)
VALUES
    ('nllb', 'NLLB-200 (Local, Meta)', 'local_model',
     'python3 tools/scripts/translation/dcc_nllb_vi_to_en.py',
     jsonb_build_object(
         'supports_models', true,
         'max_input_chars', 200000,
         'requires_credentials', false,
         'requires_cli_auth', false,
         'candidate_models', jsonb_build_array(
             jsonb_build_object('id','nllb-200-distilled-600M','label','NLLB-200 distilled 600M (INT8)'),
             jsonb_build_object('id','nllb-200-distilled-1.3B','label','NLLB-200 distilled 1.3B (FP16)'),
             jsonb_build_object('id','nllb-200-3.3B','label','NLLB-200 3.3B (FP16)')
         ),
         'cost_class', 'free_local'
     ),
     jsonb_build_object('beam_size', 4, 'max_decode_length', 512, 'repetition_penalty', 1.1),
     true),

    ('argos', 'Argos Translate (Local, legacy)', 'local_model',
     'python3 tools/scripts/translation/dcc_argos_vi_to_en.py',
     jsonb_build_object(
         'supports_models', false,
         'max_input_chars', 200000,
         'requires_credentials', false,
         'requires_cli_auth', false,
         'candidate_models', jsonb_build_array(),
         'cost_class', 'free_local'
     ),
     jsonb_build_object(),
     true),

    ('claude_cli', 'Claude Code CLI (Max subscription)', 'cli_subscription',
     'python3 tools/scripts/translation/dcc_claude_cli_vi_to_en.py',
     jsonb_build_object(
         'supports_models', true,
         'max_input_chars', 100000,
         'requires_credentials', false,
         'requires_cli_auth', true,
         'cli_binary_default', '/opt/homebrew/bin/claude',
         'cli_auth_home_default', '/var/www/.claude',
         'candidate_models', jsonb_build_array(
             jsonb_build_object('id','claude-opus-4-7','label','Claude Opus 4.7 (highest quality)'),
             jsonb_build_object('id','claude-sonnet-4-6','label','Claude Sonnet 4.6 (balanced)'),
             jsonb_build_object('id','claude-haiku-4-5','label','Claude Haiku 4.5 (fast & cheap)')
         ),
         'cost_class', 'subscription_flat',
         'subscription_label', 'Claude Max'
     ),
     jsonb_build_object('rate_limit_per_hour', 60, 'segment_batch_size', 8),
     true),

    ('codex_cli', 'OpenAI Codex CLI (ChatGPT Pro subscription)', 'cli_subscription',
     'python3 tools/scripts/translation/dcc_codex_cli_vi_to_en.py',
     jsonb_build_object(
         'supports_models', true,
         'max_input_chars', 100000,
         'requires_credentials', false,
         'requires_cli_auth', true,
         'cli_binary_default', '/opt/homebrew/bin/codex',
         'cli_auth_home_default', '/var/www/.codex',
         'candidate_models', jsonb_build_array(
             jsonb_build_object('id','gpt-5','label','GPT-5'),
             jsonb_build_object('id','gpt-5-codex','label','GPT-5 Codex'),
             jsonb_build_object('id','o3','label','o3 reasoning')
         ),
         'cost_class', 'subscription_flat',
         'subscription_label', 'ChatGPT Pro'
     ),
     jsonb_build_object('rate_limit_per_hour', 60, 'segment_batch_size', 8),
     true)
ON CONFLICT (provider_key) DO NOTHING;

-- ── 7. Seed default routing — global default points at NLLB to preserve current behavior

INSERT INTO translation_routing
    (scope_type, scope_value, primary_provider, primary_model,
     fallback_chain, priority, description, created_by)
VALUES
    ('global_default', '*', 'nllb', 'nllb-200-distilled-600M',
     '[]'::jsonb, 100,
     'Initial seed. Admin should adjust per-tier overrides via the UI.',
     'migration_157')
ON CONFLICT (scope_type, scope_value) WHERE is_enabled = TRUE DO NOTHING;

COMMIT;
