-- ============================================================================
-- Migration 229: Revert scrollbar amber (user feedback)
-- ============================================================================
-- Migration 227 flipped scrollbar defaults to HESEM amber. User asked
-- to keep the original colors (2026-05-29 chat feedback). Restore the
-- pre-227 catalog values + drop the amber master-density.css overrides
-- (handled separately in master-density.css edit).
-- ============================================================================

BEGIN;

UPDATE graphics_token_catalog
   SET default_light = '#cbd5e1',
       default_dark  = '#475569',
       default_high_contrast = '#888888',
       description = 'Scrollbar thumb — neutral slate (system default). User opted to keep original colors.'
 WHERE token_key = 'effects.scrollbarThumb';

UPDATE graphics_token_catalog
   SET default_light = '#f1f5f9',
       default_dark  = '#1e293b',
       default_high_contrast = '#e0e0e0',
       description = 'Scrollbar track — neutral slate-50 (system default).'
 WHERE token_key = 'effects.scrollbarTrack';

COMMIT;
