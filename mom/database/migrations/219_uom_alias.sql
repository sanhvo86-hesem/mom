-- Migration 219: UoM Alias and Alias Quarantine
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_alias (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_code           VARCHAR(128) NOT NULL,
    canonical_code       VARCHAR(64)  NOT NULL REFERENCES uom_unit_catalog(canonical_code) ON DELETE RESTRICT,
    context_scope        VARCHAR(64)  NOT NULL DEFAULT 'SYSTEM'
                         CHECK (context_scope IN ('SUPPLIER','CUSTOMER','SYSTEM','LIMS')),
    supplier_id          VARCHAR(100),
    effective_from       DATE         NOT NULL DEFAULT CURRENT_DATE,
    effective_to         DATE,
    notes                TEXT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Unique index handles NULL supplier_id via COALESCE (can't do this in CONSTRAINT UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS uq_alias_code_scope
    ON uom_alias(alias_code, context_scope, COALESCE(supplier_id, ''));
CREATE INDEX IF NOT EXISTS idx_uom_alias_code_lower ON uom_alias(lower(alias_code));
CREATE INDEX IF NOT EXISTS idx_uom_alias_canonical   ON uom_alias(canonical_code);
CREATE INDEX IF NOT EXISTS idx_uom_alias_scope        ON uom_alias(context_scope);

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
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quarantine_alias
    ON uom_alias_quarantine(alias_code, context_scope, COALESCE(supplier_id,''));
CREATE INDEX IF NOT EXISTS idx_uom_quarantine_status
    ON uom_alias_quarantine(review_status) WHERE review_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_uom_quarantine_alias ON uom_alias_quarantine(alias_code);
