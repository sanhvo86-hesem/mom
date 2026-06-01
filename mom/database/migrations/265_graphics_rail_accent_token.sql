-- ============================================================================
-- Migration 265: Graphics Authority — governed active-rail accent width token
-- ============================================================================
-- Purpose:   Register the active-rail / tab accent-bar thickness as a FIRST-CLASS
--            governed token so it is editable via the Admin Graphics plane instead
--            of being a hardcoded literal.
--
--            Before this, the 3px accent bar was a hardcoded literal in:
--              - .o3-shell__nav-item  (orders-v3.css, the canonical rail sample)
--              - #sidebar-nav .nav-item.active  (graphics-authority.css, global sidebar)
--              - .admin-tab-v2.active underline
--            All three now bind to var(--o3-rail-accent-w). The CSS runtime value
--            lives in orders-v3.css :root (--o3-rail-accent-w: 3px); this row makes
--            it discoverable + admin-editable through graphics_token_catalog
--            (Admin → Mặt phẳng đồ họa), per the no-hardcode Graphics Authority rule.
--
-- Safety:    Idempotent (ON CONFLICT DO NOTHING). No schema change.
-- ============================================================================

INSERT INTO graphics_token_catalog
  (token_key, css_variable, layer, family, subfamily, value_type, unit,
   default_light, default_dark, default_high_contrast,
   description, tags)
VALUES
  ('control.accent.width', '--o3-rail-accent-w', 'semantic', 'sizing', 'control', 'px', 'px',
   '3px', '3px', '3px',
   'Active-rail / tab accent-bar thickness — o3-shell rail, global sidebar active item, admin tab underline.',
   ARRAY['v3','sizing','accent'])
ON CONFLICT (token_key) DO NOTHING;
