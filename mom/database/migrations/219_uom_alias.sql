-- Migration 219: UoM Alias and Alias Quarantine
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_alias (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_string         VARCHAR(128) NOT NULL,
    canonical_code       VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    source_system        VARCHAR(64) NOT NULL,
    context_scope        VARCHAR(64),
    confidence           VARCHAR(20) NOT NULL CHECK (confidence IN ('VERIFIED','HIGH','MEDIUM','LOW')),
    risk_level           VARCHAR(20) NOT NULL CHECK (risk_level IN ('low','medium','high','regulated')),
    approved_by          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_at          TIMESTAMPTZ NOT NULL,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_alias_source_context UNIQUE(alias_string, source_system, context_scope)
);

CREATE TABLE IF NOT EXISTS uom_alias_quarantine (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_string         VARCHAR(128) NOT NULL,
    source_system        VARCHAR(64) NOT NULL,
    raw_payload          JSONB,
    ambiguity_candidates JSONB,
    ai_suggested         BOOLEAN NOT NULL DEFAULT false,
    ai_suggestion        JSONB,
    status               VARCHAR(32) NOT NULL DEFAULT 'pending_review'
                         CHECK (status IN ('pending_review','ai_suggested','resolved','rejected','unknown')),
    resolved_canonical_code VARCHAR(64) REFERENCES uom_unit_catalog(canonical_code) ON DELETE SET NULL,
    reviewed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uom_alias_string ON uom_alias(alias_string);
CREATE INDEX IF NOT EXISTS idx_uom_alias_canonical ON uom_alias(canonical_code);
CREATE INDEX IF NOT EXISTS idx_uom_quarantine_status ON uom_alias_quarantine(status);
CREATE INDEX IF NOT EXISTS idx_uom_quarantine_alias ON uom_alias_quarantine(alias_string);
