-- ============================================================================
-- Migration 193: Seed translation_learning with badge label rules
-- ============================================================================
-- Seeds the "LEO THANG" → "ESCALATION" rule that the post-translation
-- substitution engine needs. DecisionThresholdService hardcodes "LEO THANG"
-- in threshold-badge-escalation spans; the LLM treats it as a code identifier
-- and leaves it untranslated. This approved rule forces the correct output.
-- ============================================================================

INSERT INTO translation_learning (
    vi_pattern,
    en_wrong_pattern,
    en_correct,
    category,
    severity,
    status,
    hit_count,
    dedupe_hash
)
VALUES (
    'LEO THANG',
    'LEO THANG',
    'ESCALATION',
    'badge_label',
    'critical',
    'approved',
    0,
    encode(sha256(convert_to(lower('leo thang') || '|' || lower('badge_label'), 'UTF8')), 'hex')
)
ON CONFLICT (dedupe_hash) DO UPDATE
    SET en_correct  = EXCLUDED.en_correct,
        status      = 'approved',
        category    = EXCLUDED.category,
        severity    = EXCLUDED.severity;
