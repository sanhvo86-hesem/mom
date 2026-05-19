-- ============================================================================
-- Migration 191: Translation Runtime Settings — admin-toggleable runtime flags
-- ============================================================================
-- Purpose:
--   Provide a small key/value store for runtime-toggleable translation
--   settings. First user: a global `auto_translate_enabled` switch surfaced
--   in the Translated Docs admin tab so operators can turn off automatic
--   re-translation on document save / create / submit / approve hooks (and
--   the periodic cron) to save Opus tokens. Manual "Retranslate" buttons in
--   the admin remain unaffected — they represent explicit user intent.
--
-- Why a dedicated table:
--   - translation_routing already exists but is per-doc-pattern, not global
--   - translation_provider_config is per-provider, not global
--   - JSON-file approach was rejected because cron + FPM read different
--     working directories on the VPS; a DB row is the single source of truth
--
-- Workflow:
--   1. Boot: a single row exists with auto_translate_enabled = TRUE so the
--      existing event-driven auto-translate keeps working (preserves
--      backward compatibility for the live deployment).
--   2. Admin toggles OFF via /api/v1/dcc/admin/translation/auto-translate.
--      All 5 trigger sites in DocumentController + the cron worker query
--      TranslationRuntimeSettingsService::isAutoTranslateEnabled() and
--      bail out before spawning the translator command. Manual retranslate
--      stays unconditional.
--   3. Toggle back ON resumes auto-translate on the next eligible event.
--
-- Standards:
--   ISO 9001 §7.5 (control of documented information),
--   ISO 27001 A.12.4 (logging and monitoring of admin-mutated state).
-- Date: 2026-05-20
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS translation_runtime_setting (
    setting_key    VARCHAR(80)  PRIMARY KEY,
    setting_value  JSONB        NOT NULL,
    description    TEXT,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by     VARCHAR(120)
);

COMMENT ON TABLE translation_runtime_setting
    IS 'Global runtime flags for the translation pipeline (admin-toggleable). One row per setting key, JSONB value for flexibility.';
COMMENT ON COLUMN translation_runtime_setting.setting_key
    IS 'Stable identifier: auto_translate_enabled, etc. SCREAMING_SNAKE_CASE not used to stay consistent with provider_key style elsewhere in the schema.';
COMMENT ON COLUMN translation_runtime_setting.setting_value
    IS 'JSONB so future flags can carry richer payloads (thresholds, schedules). Today: {"enabled": true|false}.';

-- Seed: auto_translate_enabled = TRUE. Preserves existing behavior on
-- live VPS deploys where event-driven auto-translate was already running.
INSERT INTO translation_runtime_setting (setting_key, setting_value, description, updated_by)
VALUES (
    'auto_translate_enabled',
    '{"enabled": true}'::jsonb,
    'Global ON/OFF switch for event-driven and cron-driven auto-translation. When false, only explicit admin "Retranslate" button calls trigger translator runs.',
    'system.migration_191'
)
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
