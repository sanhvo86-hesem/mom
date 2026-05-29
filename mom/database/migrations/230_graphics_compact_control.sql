-- ============================================================================
-- Migration 230: Compact control-height (36 → 32px)
-- ============================================================================
-- User feedback 2026-05-29: Module Sample components feel chunky
-- compared to Linear/Notion/Atlassian/Vercel. Research:
--   Linear     28px
--   Notion     28px
--   Vercel     32px
--   Atlassian  32px
--   SAP Fiori  36px (industrial touch — was our previous default)
--   Bloomberg  24px (data-dense)
--
-- HESEM lands at 32px — Atlassian/Vercel sweet spot. Industrial-
-- friendly (≥30px), but visibly tighter than the old 36.
-- ============================================================================

BEGIN;

UPDATE graphics_token_catalog
   SET default_light = '32px',
       default_dark  = '32px',
       default_high_contrast = '32px',
       min_numeric = 24,
       max_numeric = 40,
       description = 'STANDARD control height (32px) — Atlassian/Vercel sweet spot. Linear/Notion go 28, SAP/touch-targets 36. 32 keeps industrial reach while feeling refined.'
 WHERE token_key = 'control.height.standard';

COMMIT;
