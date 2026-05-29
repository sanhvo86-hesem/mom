-- Migration 219: UoM Alias and Alias Quarantine
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

-- Canonical alias table: maps external/informal unit strings to canonical codes.
-- lookup is case-insensitive: index on lower(alias_code).
-- Scope narrows resolution: SYSTEM (global), SUPPLIER, CUSTOMER.
CREATE TABLE IF NOT EXISTS uom_alias (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_code           VARCHAR(128) NOT NULL,
    canonical_code       VARCHAR(64)  NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    context_scope        VARCHAR(64)  NOT NULL DEFAULT 'SYSTEM'
                         CHECK (context_scope IN ('SUPPLIER','CUSTOMER','SYSTEM','LIMS')),
    supplier_id          VARCHAR(100),           -- NULL = applies to all suppliers in scope
    effective_from       DATE         NOT NULL DEFAULT CURRENT_DATE,
    effective_to         DATE,                   -- NULL = no expiry
    notes                TEXT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_alias_code_scope UNIQUE(alias_code, context_scope, COALESCE(supplier_id, ''))
);

CREATE INDEX IF NOT EXISTS idx_uom_alias_code_lower ON uom_alias(lower(alias_code));
CREATE INDEX IF NOT EXISTS idx_uom_alias_canonical   ON uom_alias(canonical_code);
CREATE INDEX IF NOT EXISTS idx_uom_alias_scope        ON uom_alias(context_scope);
CREATE INDEX IF NOT EXISTS idx_uom_alias_supplier     ON uom_alias(supplier_id) WHERE supplier_id IS NOT NULL;

-- Quarantine: holds unresolved alias strings for metrology team review.
CREATE TABLE IF NOT EXISTS uom_alias_quarantine (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_code              VARCHAR(128) NOT NULL,
    context_scope           VARCHAR(64)  NOT NULL DEFAULT 'SYSTEM',
    supplier_id             VARCHAR(100),
    submitted_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    review_status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                            CHECK (review_status IN ('PENDING','RESOLVED','REJECTED','ESCALATED')),
    resolved_canonical_code VARCHAR(64) REFERENCES uom_unit_catalog(canonical_code) ON DELETE SET NULL,
    reviewed_by             UUID REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at             TIMESTAMPTZ,
    ai_suggested            BOOLEAN      NOT NULL DEFAULT FALSE,
    ai_suggestion           JSONB,
    raw_payload             JSONB,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quarantine_alias UNIQUE(alias_code, context_scope, COALESCE(supplier_id,''))
);

CREATE INDEX IF NOT EXISTS idx_uom_quarantine_status  ON uom_alias_quarantine(review_status) WHERE review_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_uom_quarantine_alias   ON uom_alias_quarantine(alias_code);
