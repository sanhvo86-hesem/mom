-- ============================================================================
-- Migration 207: AEOI LLM Routing — multi-provider extraction router
-- ============================================================================
-- Purpose:
--   Replace OrderEmailParserService's hardcoded Anthropic API call with a
--   tier-based router so the admin can pick which LLM extracts each kind of
--   email/attachment. Mirrors the translation_routing pattern from
--   migration 157 but scoped to AEOI (Email Order Intake) use cases.
--
--   Three default tiers:
--     • extraction_default  — body-only emails when the deterministic
--                              [HESEM-ORDER-INTAKE] header parser comes up
--                              empty. Light/cheap model is fine.
--     • extraction_pdf      — emails with a PDF attachment that needs
--                              text extraction first. Medium-quality
--                              model since PDFs are noisier.
--     • extraction_complex  — multi-page PO, revisions, change orders.
--                              Best available model.
--
--   Each tier has a primary provider+model plus an ordered fallback chain.
--   Resolution order (highest priority wins): doc_code > doc_pattern >
--   tier > global_default. Same shape as translation_routing so admins
--   already know the mental model.
--
-- Design contract:
--   - We REUSE translation_provider_config as the provider registry. Adding
--     a row for `ollama_local` (Llama 3.1 8B) is enough — no parallel
--     registry. The provider_kind 'local_model' already exists for NLLB.
--   - aeoi_llm_routing references translation_provider_config(provider_key)
--     to prevent stale references when a provider is deleted.
--   - If no routing rule resolves and ANTHROPIC_API_KEY is set, the legacy
--     OrderEmailParserService::extractOrder() path still works as a final
--     fallback. So this migration is non-breaking.
--
-- Tables:
--   aeoi_llm_routing — per-scope provider+model assignment for AEOI
--
-- Seed:
--   • Adds ollama_local provider to translation_provider_config (id ROLLBACK-safe
--     via ON CONFLICT DO NOTHING — install-time only).
--   • Adds global_default rule routing to anthropic+claude-haiku-4-5 with
--     ollama_local as fallback. Admin can edit via the new "LLM Model" tab.
--
-- Standards:
--   ISO 9001 §7.5 (control of documented information),
--   ISO 27001 A.12.4 (logging and monitoring).
-- Date: 2026-05-27
-- ============================================================================

BEGIN;

-- ── 1. Add Ollama (Llama 3.1) to the provider registry ─────────────────────
--    Driver command is the host:port; OllamaService.php parses it. We do not
--    shell-out to `ollama run` because that requires a TTY and is slower than
--    the HTTP API. provider_kind=local_model so it appears in the same UI
--    column as NLLB on the translation page.

INSERT INTO translation_provider_config (
    provider_key, display_name, provider_kind, driver_command,
    capabilities, default_options, is_enabled, health_status
) VALUES (
    'ollama_local',
    'Ollama (Llama 3.1 8B, local)',
    'local_model',
    'http://127.0.0.1:11434',
    jsonb_build_object(
        'supports_models',      true,
        'supports_json_mode',   true,
        'requires_credentials', false,
        'requires_cli_auth',    false,
        'max_input_chars',      32768,
        'candidate_models',     jsonb_build_array(
            'llama3.1:8b', 'llama3.1:8b-instruct-q4_K_M',
            'mistral:7b-instruct', 'mixtral:8x7b-instruct',
            'qwen2.5:7b-instruct'
        )
    ),
    jsonb_build_object(
        'temperature',     0.0,
        'top_p',           0.95,
        'num_ctx',         8192,
        'response_format', 'json'
    ),
    TRUE,
    'unknown'
)
ON CONFLICT (provider_key) DO UPDATE
    SET display_name   = EXCLUDED.display_name,
        driver_command = EXCLUDED.driver_command,
        capabilities   = EXCLUDED.capabilities,
        updated_at     = now();

-- Also surface anthropic_api as an AEOI-eligible provider if it doesn't
-- already exist (translation didn't need a row for it because translation
-- uses the CLI variant). The AEOI router calls Anthropic via REST.

INSERT INTO translation_provider_config (
    provider_key, display_name, provider_kind, driver_command,
    capabilities, default_options, is_enabled, health_status
) VALUES (
    'anthropic_api',
    'Anthropic Claude API (REST)',
    'http_api',
    'https://api.anthropic.com/v1/messages',
    jsonb_build_object(
        'supports_models',      true,
        'supports_json_mode',   true,
        'requires_credentials', true,
        'requires_cli_auth',    false,
        'max_input_chars',      200000,
        'candidate_models',     jsonb_build_array(
            'claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-7'
        )
    ),
    jsonb_build_object(
        'temperature', 0.0,
        'max_tokens',  4096
    ),
    TRUE,
    'unknown'
)
ON CONFLICT (provider_key) DO NOTHING;

-- Similarly add openai_api so it's visible in the picker.

INSERT INTO translation_provider_config (
    provider_key, display_name, provider_kind, driver_command,
    capabilities, default_options, is_enabled, health_status
) VALUES (
    'openai_api',
    'OpenAI GPT API (REST)',
    'http_api',
    'https://api.openai.com/v1/chat/completions',
    jsonb_build_object(
        'supports_models',      true,
        'supports_json_mode',   true,
        'requires_credentials', true,
        'requires_cli_auth',    false,
        'max_input_chars',      128000,
        'candidate_models',     jsonb_build_array(
            'gpt-4o-mini', 'gpt-4o', 'gpt-5'
        )
    ),
    jsonb_build_object(
        'temperature',     0.0,
        'response_format', 'json'
    ),
    FALSE,
    'unknown'
)
ON CONFLICT (provider_key) DO NOTHING;

-- ── 2. AEOI routing table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS aeoi_llm_routing (
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
    CONSTRAINT ck_aeoi_routing_scope
        CHECK (scope_type IN ('global_default', 'tier', 'doc_pattern', 'doc_code')),
    CONSTRAINT ck_aeoi_routing_tier_value
        CHECK (scope_type <> 'tier' OR scope_value IN
               ('extraction_default', 'extraction_pdf', 'extraction_complex')),
    CONSTRAINT ck_aeoi_routing_global_value
        CHECK (scope_type <> 'global_default' OR scope_value = '*')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_aeoi_routing_scope
    ON aeoi_llm_routing(scope_type, scope_value)
    WHERE is_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_aeoi_routing_priority
    ON aeoi_llm_routing(priority DESC, scope_type);

COMMENT ON TABLE aeoi_llm_routing
    IS 'AEOI extraction routing rules. Resolution order (highest priority wins): doc_code > doc_pattern > tier > global_default. fallback_chain is an ordered JSON array of {provider, model} tried on primary failure.';
COMMENT ON COLUMN aeoi_llm_routing.scope_value
    IS 'global_default: "*". tier: extraction_default|extraction_pdf|extraction_complex. doc_pattern: glob like "PO_CHANGE*". doc_code: exact like "CUSTOMER_PO".';
COMMENT ON COLUMN aeoi_llm_routing.fallback_chain
    IS 'Ordered JSON array: [{"provider":"ollama_local","model":"llama3.1:8b"}, ...]. Tried in order on primary failure / quality gate.';

-- ── 3. Seed default routing ─────────────────────────────────────────────────
--    Default global rule: Ollama first (free, local, ~95% quality for
--    HESEM-format orders). Fall back to Anthropic API if Ollama returns
--    invalid JSON or is unreachable. Admin can swap order via the UI.

INSERT INTO aeoi_llm_routing (
    scope_type, scope_value, primary_provider, primary_model,
    fallback_chain, priority, description, created_by
) VALUES (
    'global_default', '*',
    'ollama_local', 'llama3.1:8b',
    jsonb_build_array(
        jsonb_build_object('provider', 'anthropic_api', 'model', 'claude-haiku-4-5'),
        jsonb_build_object('provider', 'anthropic_api', 'model', 'claude-sonnet-4-6')
    ),
    50,
    'Default AEOI extraction: try local Ollama first, fall back to Anthropic API only when local fails. Saves cost on the vast majority of standard PO emails.',
    'system.migration_207'
)
ON CONFLICT (scope_type, scope_value) WHERE is_enabled = TRUE DO NOTHING;

-- Tier defaults — overridable in admin UI.

INSERT INTO aeoi_llm_routing (
    scope_type, scope_value, primary_provider, primary_model,
    fallback_chain, priority, description, created_by
) VALUES
    ('tier', 'extraction_default',
     'ollama_local', 'llama3.1:8b',
     jsonb_build_array(jsonb_build_object('provider','anthropic_api','model','claude-haiku-4-5')),
     100,
     'Body-only emails where the deterministic header parser came up empty. Light/cheap model.',
     'system.migration_207'),
    ('tier', 'extraction_pdf',
     'anthropic_api', 'claude-haiku-4-5',
     jsonb_build_array(
        jsonb_build_object('provider','ollama_local','model','llama3.1:8b'),
        jsonb_build_object('provider','anthropic_api','model','claude-sonnet-4-6')
     ),
     100,
     'Emails with PDF attachments. Medium-quality model since PDFs vary in layout.',
     'system.migration_207'),
    ('tier', 'extraction_complex',
     'anthropic_api', 'claude-sonnet-4-6',
     jsonb_build_array(jsonb_build_object('provider','anthropic_api','model','claude-opus-4-7')),
     100,
     'Multi-page PO, change orders, expedites. Best model wins.',
     'system.migration_207')
ON CONFLICT (scope_type, scope_value) WHERE is_enabled = TRUE DO NOTHING;

-- ── 4. PDF text cache on attachment table ───────────────────────────────────
--    Avoid re-running pdftotext on every re-validation. Cache after the
--    first successful extraction.

ALTER TABLE email_intake_attachment
    ADD COLUMN IF NOT EXISTS pdf_text_extracted TEXT,
    ADD COLUMN IF NOT EXISTS pdf_text_extracted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pdf_text_chars INTEGER;

COMMENT ON COLUMN email_intake_attachment.pdf_text_extracted
    IS 'Cached output of pdftotext -layout on the attached PDF. Capped at ~200KB. Empty for non-PDF attachments.';

-- ── 5. Auto-create audit trail ─────────────────────────────────────────────
--    When the IMAP poll auto-creates a customer or part from PO data, we
--    want to know which case triggered it so QC can review.

CREATE TABLE IF NOT EXISTS aeoi_auto_created_record (
    id                 BIGSERIAL    PRIMARY KEY,
    case_id            BIGINT       NOT NULL
        REFERENCES email_intake_case(id) ON DELETE CASCADE,
    record_kind        VARCHAR(20)  NOT NULL,
    record_key         VARCHAR(200) NOT NULL,
    source             VARCHAR(40)  NOT NULL,
    source_evidence    JSONB,
    created_by         VARCHAR(120),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_aeoi_auto_record_kind
        CHECK (record_kind IN ('customer', 'part', 'revision', 'ship_to'))
);

CREATE INDEX IF NOT EXISTS idx_aeoi_auto_created_case
    ON aeoi_auto_created_record(case_id);
CREATE INDEX IF NOT EXISTS idx_aeoi_auto_created_kind
    ON aeoi_auto_created_record(record_kind, created_at DESC);

COMMENT ON TABLE aeoi_auto_created_record
    IS 'Audit trail of master-data records auto-created from AEOI extraction. Source field identifies which case+attachment+model produced the data so QC can review and either confirm or roll back.';

COMMIT;
