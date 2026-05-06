-- ============================================================================
-- Migration 158: translation admin — fix model catalogue (real Claude/Codex names)
-- ----------------------------------------------------------------------------
-- The seed in 157_translation_admin_module.sql hardcoded model names that do
-- not exist on the actual CLI binaries:
--   * claude-opus-4-7 / claude-sonnet-4-6        → reject by Anthropic API
--   * gpt-5 / gpt-5-codex / o3 / codex-mini-…     → rejected for ChatGPT-account auth
-- Verified via direct CLI probe on VPS 2026-05-06:
--   * claude (2.1.131) accepts: alias `opus`/`sonnet`/`haiku` (resolve to current
--     latest), or full `claude-opus-4-5` / `claude-sonnet-4-5` / `claude-haiku-4-5`.
--   * codex (0.128.0) ChatGPT-account ONLY accepts: gpt-5.5, gpt-5.4,
--     gpt-5.4-mini, gpt-5.3-codex, gpt-5.2. Everything else (gpt-5, gpt-5-codex,
--     gpt-5-pro, codex-mini-latest, o3, o4-mini) returns:
--       "model is not supported when using Codex with a ChatGPT account."
--
-- This migration replaces those values everywhere they are persisted:
--   * translation_provider_config.capabilities.candidate_models
--   * translation_credentials.available_models
--   * translation_routing.primary_model + fallback_chain
-- It is idempotent — re-running has no effect once values match expected.
-- ============================================================================

BEGIN;

-- 1. Provider catalogue ------------------------------------------------------

UPDATE translation_provider_config
SET capabilities = jsonb_set(
        capabilities,
        '{candidate_models}',
        jsonb_build_array(
            jsonb_build_object('id','opus',                'label','Claude Opus (alias → latest 4.x)'),
            jsonb_build_object('id','sonnet',              'label','Claude Sonnet (alias → latest 4.x)'),
            jsonb_build_object('id','haiku',               'label','Claude Haiku (alias → fast & cheap)'),
            jsonb_build_object('id','claude-opus-4-5',     'label','Claude Opus 4.5 (highest quality)'),
            jsonb_build_object('id','claude-sonnet-4-5',   'label','Claude Sonnet 4.5 (balanced)'),
            jsonb_build_object('id','claude-haiku-4-5',    'label','Claude Haiku 4.5 (fast)')
        ),
        true
    )
WHERE provider_key = 'claude_cli';

UPDATE translation_provider_config
SET capabilities = jsonb_set(
        capabilities,
        '{candidate_models}',
        jsonb_build_array(
            jsonb_build_object('id','gpt-5.5',         'label','GPT-5.5 (best — ChatGPT Pro)'),
            jsonb_build_object('id','gpt-5.4',         'label','GPT-5.4'),
            jsonb_build_object('id','gpt-5.4-mini',    'label','GPT-5.4 Mini (fast)'),
            jsonb_build_object('id','gpt-5.3-codex',   'label','GPT-5.3 Codex'),
            jsonb_build_object('id','gpt-5.2',         'label','GPT-5.2')
        ),
        true
    )
WHERE provider_key = 'codex_cli';

-- 2. Credential available_models snapshot -----------------------------------

UPDATE translation_credentials
SET available_models = jsonb_build_array(
    jsonb_build_object('id','opus',                'label','Claude Opus (alias)',          'state','candidate'),
    jsonb_build_object('id','sonnet',              'label','Claude Sonnet (alias)',        'state','candidate'),
    jsonb_build_object('id','haiku',               'label','Claude Haiku (alias)',         'state','candidate'),
    jsonb_build_object('id','claude-opus-4-5',     'label','Claude Opus 4.5',              'state','candidate'),
    jsonb_build_object('id','claude-sonnet-4-5',   'label','Claude Sonnet 4.5',            'state','candidate'),
    jsonb_build_object('id','claude-haiku-4-5',    'label','Claude Haiku 4.5',             'state','candidate')
)
WHERE provider_key = 'claude_cli';

UPDATE translation_credentials
SET available_models = jsonb_build_array(
    jsonb_build_object('id','gpt-5.5',         'label','GPT-5.5',         'state','candidate'),
    jsonb_build_object('id','gpt-5.4',         'label','GPT-5.4',         'state','candidate'),
    jsonb_build_object('id','gpt-5.4-mini',    'label','GPT-5.4 Mini',    'state','candidate'),
    jsonb_build_object('id','gpt-5.3-codex',   'label','GPT-5.3 Codex',   'state','candidate'),
    jsonb_build_object('id','gpt-5.2',         'label','GPT-5.2',         'state','candidate')
)
WHERE provider_key = 'codex_cli';

-- 3. Routing rules -----------------------------------------------------------

-- Tier 1 (MAN/POL) → claude_cli/sonnet (alias resolves to latest), fallback gpt-5.5 then nllb
UPDATE translation_routing
SET primary_model   = 'sonnet',
    fallback_chain  = jsonb_build_array(
        jsonb_build_object('provider','codex_cli', 'model','gpt-5.5'),
        jsonb_build_object('provider','nllb',      'model','nllb-200-distilled-600M')
    )
WHERE scope_type = 'tier' AND scope_value = 'tier_1';

-- Tier 2 (SOP/WI) → codex_cli/gpt-5.5 (verified working with ChatGPT-Pro auth)
UPDATE translation_routing
SET primary_model   = 'gpt-5.5',
    fallback_chain  = jsonb_build_array(
        jsonb_build_object('provider','nllb', 'model','nllb-200-distilled-600M')
    )
WHERE scope_type = 'tier' AND scope_value = 'tier_2';

-- Tier 3 stays NLLB-local (no change needed; included for completeness check).

COMMIT;
