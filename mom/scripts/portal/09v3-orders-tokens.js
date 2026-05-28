/* ════════════════════════════════════════════════════════════════════════
 * Orders v3 — Token bridge
 *
 * Hex-free namespace for all theme tokens used by the v3 module. Reads
 * from the Graphics Authority if available, otherwise falls through to
 * the CSS variables defined in orders-v3.css.
 *
 * Audit gate: a build-time grep for hex literals in 09v3-*.js must
 * return nothing. This file is the ONLY allowed source of color/
 * spacing/radius/motion values.
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function readToken(key, fallbackCssVar){
    // Prefer the Graphics Authority published token if loaded.
    try {
      if (window.GraphicsAuthority &&
          window.GraphicsAuthority.tokens &&
          typeof window.GraphicsAuthority.tokens.read === 'function') {
        var v = window.GraphicsAuthority.tokens.read(key);
        if (v !== undefined && v !== null && v !== '') return v;
      }
    } catch (e) {}
    // Fall back to the CSS variable resolved at runtime. Empty string is
    // fine — the CSS layer has its own --o3-* fallback chain.
    if (fallbackCssVar && typeof window.getComputedStyle === 'function') {
      var root = document.documentElement;
      if (root) {
        var val = window.getComputedStyle(root).getPropertyValue(fallbackCssVar);
        if (val) return val.trim();
      }
    }
    return '';
  }

  // Token API — only string lookups. Values returned MAY be CSS-var
  // expressions like "var(--o3-brand)". Callers must use them in
  // style="color: TOKEN" contexts (CSS variable resolution does the
  // rest). They MUST NOT split or substring them.
  var tokens = {
    color: {
      // surfaces
      page:        'var(--o3-surface-page)',
      card:        'var(--o3-surface-card)',
      raised:      'var(--o3-surface-raised)',
      muted:       'var(--o3-surface-muted)',
      // text
      textStrong:  'var(--o3-text-strong)',
      text:        'var(--o3-text-default)',
      textMuted:   'var(--o3-text-muted)',
      textInverse: 'var(--o3-text-inverse)',
      // borders
      borderSubtle:  'var(--o3-border-subtle)',
      border:        'var(--o3-border-default)',
      borderStrong:  'var(--o3-border-strong)',
      // brand
      brand:       'var(--o3-brand)',
      brandHover:  'var(--o3-brand-hover)',
      brandSoft:   'var(--o3-brand-soft)',
      // semantic
      success:     'var(--o3-success)',
      successSoft: 'var(--o3-success-soft)',
      warning:     'var(--o3-warning)',
      warningSoft: 'var(--o3-warning-soft)',
      danger:      'var(--o3-danger)',
      dangerSoft:  'var(--o3-danger-soft)',
      info:        'var(--o3-info)',
      infoSoft:    'var(--o3-info-soft)',
      neutral:     'var(--o3-neutral)',
      neutralSoft: 'var(--o3-neutral-soft)'
    },
    space: {
      xs:  'var(--o3-space-xs)',
      sm:  'var(--o3-space-sm)',
      md:  'var(--o3-space-md)',
      lg:  'var(--o3-space-lg)',
      xl:  'var(--o3-space-xl)',
      xxl: 'var(--o3-space-2xl)',
      xxxl:'var(--o3-space-3xl)'
    },
    radius: {
      sm:   'var(--o3-radius-sm)',
      md:   'var(--o3-radius-md)',
      lg:   'var(--o3-radius-lg)',
      pill: 'var(--o3-radius-pill)'
    },
    motion: {
      fast: 'var(--o3-motion-fast)',
      base: 'var(--o3-motion-base)',
      slow: 'var(--o3-motion-slow)',
      ease: 'var(--o3-motion-ease)'
    },
    type: {
      xs:  'var(--o3-font-size-xs)',
      sm:  'var(--o3-font-size-sm)',
      md:  'var(--o3-font-size-md)',
      lg:  'var(--o3-font-size-lg)',
      xl:  'var(--o3-font-size-xl)',
      xxl: 'var(--o3-font-size-2xl)',
      xxxl:'var(--o3-font-size-3xl)',
      regular: 'var(--o3-font-weight-regular)',
      medium:  'var(--o3-font-weight-medium)',
      semi:    'var(--o3-font-weight-semi)',
      bold:    'var(--o3-font-weight-bold)'
    },
    // Severity → semantic mapping used by exception rendering
    severity: function(s){
      var key = String(s || '').toLowerCase();
      if (key === 'critical' || key === 'high' || key === 'danger') return 'danger';
      if (key === 'warning' || key === 'medium')                    return 'warning';
      if (key === 'info' || key === 'low')                          return 'info';
      if (key === 'success' || key === 'ok')                        return 'success';
      return 'neutral';
    },
    // Read raw resolved value (rare — only when computing rgba(), etc.)
    read: readToken
  };

  window.OrdersV3 = window.OrdersV3 || {};
  window.OrdersV3.tokens = tokens;
})();
