/* ════════════════════════════════════════════════════════════════════════
 * Admin → Appearance → 🎨 Theme tab  (v3-G14, 2026-05-29)
 *
 * Global design controls — sibling of Module Master. Edits here cascade
 * to every component preview in Module Master EXCEPT properties that
 * the user has explicitly toggled "Custom" in the dock.
 *
 * Persistence (current iteration): localStorage key 'o3-theme'.
 * Future: POST to /api/v1/graphics/theme + graphics_token_value table
 * with scope='theme'.
 *
 * SSOT note: every control writes a CSS custom property on
 * document.documentElement so the change is visible immediately
 * everywhere. Reads use getComputedStyle for round-trip verification.
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function esc(s){
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* Research-backed defaults — applied when user clicks "Reset to design
   * defaults". Citations in inline comments. */
  var THEME_DEFAULTS = {
    'color-mode': 'light',                  // Material 3 — default to light
    'font-family': 'Inter, -apple-system, "SF Pro Text", system-ui, sans-serif',  // Inter — most-used industrial UI font
    'font-base': 13,                        // Vercel Geist body 13px, Linear 13px
    'font-scale': 1.0,                      // multiplier for the XS→3XL ramp
    'brand': '#0c4a6e',                     // HESEM sky-900
    'density': 'cozy',                      // Atlassian default
    'master-gap': 8,                        // SSOT
    'section-gap': 12,                      // SSOT
    'master-radius': 4,                     // Carbon "rounded"
    'card-radius': 8,                       // SLDS "small"
    'motion': 'standard',
    'motion-fast': 120,                     // M3 fast
    'motion-base': 200,                     // M3 normal
    'motion-slow': 320                      // M3 slow
  };

  /* Apply theme values to :root inline styles + persist to localStorage.
   * Theme application is INERT for properties that have a custom
   * override (stored separately under 'o3-props-overrides'). */
  function applyTheme(theme){
    var root = document.documentElement;
    // Color mode
    if (theme['color-mode'] === 'auto') {
      root.removeAttribute('data-color-mode');
    } else {
      root.setAttribute('data-color-mode', theme['color-mode'] || 'light');
    }
    // Numeric tokens (px) — apply only if NOT overridden by per-property custom
    var overrides = readOverrides();
    function setVar(cssVar, value, overrideKey){
      if (overrides[overrideKey]) return;  // Custom override takes precedence
      root.style.setProperty(cssVar, value);
    }
    setVar('--o3-space',              theme['master-gap']    + 'px', 'space.master');
    setVar('--master-gap',            theme['master-gap']    + 'px', 'space.master');
    setVar('--o3-space-section',      theme['section-gap']   + 'px', 'space.section');
    setVar('--section-gap',           theme['section-gap']   + 'px', 'space.section');
    setVar('--o3-radius',             theme['master-radius'] + 'px', 'radius.master');
    setVar('--master-radius',         theme['master-radius'] + 'px', 'radius.master');
    setVar('--o3-radius-card',        theme['card-radius']   + 'px', 'radius.card');
    setVar('--card-radius',           theme['card-radius']   + 'px', 'radius.card');
    setVar('--o3-font-size-md',       theme['font-base']     + 'px', 'font.size.md');
    setVar('--o3-font-size-sm',       Math.round(theme['font-base'] * 0.92) + 'px', 'font.size.sm');
    setVar('--o3-font-size-lg',       Math.round(theme['font-base'] * 1.15) + 'px', 'font.size.lg');
    setVar('--o3-motion-fast',        theme['motion-fast']   + 'ms', 'motion.fast');
    setVar('--o3-motion-base',        theme['motion-base']   + 'ms', 'motion.base');
    setVar('--o3-motion-slow',        theme['motion-slow']   + 'ms', 'motion.slow');
    if (theme['brand'] && !overrides['brand.primary']) {
      root.style.setProperty('--o3-brand', theme['brand']);
      root.style.setProperty('--brand-primary', theme['brand']);
    }
    // Density preset → control-height
    var dh = { compact: 32, cozy: 36, comfortable: 40 }[theme['density']] || 36;
    if (!overrides['control.height.standard']) {
      root.style.setProperty('--o3-control-h-standard', dh + 'px');
      root.style.setProperty('--o3-control-h-md', dh + 'px');
      root.style.setProperty('--o3-control-h-sm', dh + 'px');
      root.style.setProperty('--o3-control-h-lg', dh + 'px');
    }
    // Motion preset → fast/base/slow multipliers
    var motionMult = { subtle: 0.7, standard: 1.0, expressive: 1.4 }[theme['motion']] || 1.0;
    if (motionMult !== 1.0) {
      if (!overrides['motion.fast']) root.style.setProperty('--o3-motion-fast', Math.round(theme['motion-fast'] * motionMult) + 'ms');
      if (!overrides['motion.base']) root.style.setProperty('--o3-motion-base', Math.round(theme['motion-base'] * motionMult) + 'ms');
      if (!overrides['motion.slow']) root.style.setProperty('--o3-motion-slow', Math.round(theme['motion-slow'] * motionMult) + 'ms');
    }
    // Font family applies globally; not part of per-property override
    if (theme['font-family']) {
      root.style.setProperty('--o3-font-sans', theme['font-family']);
      document.body && (document.body.style.fontFamily = theme['font-family']);
    }
    // Persist
    try { localStorage.setItem('o3-theme', JSON.stringify(theme)); } catch (e) {}
  }

  function readTheme(){
    try {
      var raw = localStorage.getItem('o3-theme');
      if (!raw) return Object.assign({}, THEME_DEFAULTS);
      var parsed = JSON.parse(raw);
      // Merge with defaults so new keys appear after upgrade
      var merged = Object.assign({}, THEME_DEFAULTS);
      Object.keys(parsed || {}).forEach(function(k){ merged[k] = parsed[k]; });
      return merged;
    } catch (e) { return Object.assign({}, THEME_DEFAULTS); }
  }

  function readOverrides(){
    try {
      var raw = localStorage.getItem('o3-props-overrides');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function resetTheme(){
    try { localStorage.removeItem('o3-theme'); } catch (e) {}
    applyTheme(THEME_DEFAULTS);
  }

  /* ── Render the Theme tab body ───────────────────────────────────── */
  window._renderAdmThemeHtml = function(L){
    L = L || function(vi, en){ return vi || en; };
    var t = readTheme();
    var swatch = function(label, cssVar){
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">'
        + '<div style="width:36px;height:36px;border-radius:6px;background:var(' + cssVar + ');border:1px solid var(--o3-border-subtle)"></div>'
        + '<span style="font-size:10px;color:var(--text-secondary)">' + esc(label) + '</span>'
        + '</div>';
    };
    var seg = function(name, options, current){
      return '<div style="display:inline-flex;border:1px solid var(--o3-border-subtle);border-radius:6px;overflow:hidden">'
        + options.map(function(o){
            var active = o.v === current;
            return '<button type="button" data-theme-seg="' + esc(name) + '" data-theme-val="' + esc(o.v) + '"'
              + ' style="border:0;padding:6px 12px;cursor:pointer;font-size:12px;'
              + (active ? 'background:var(--o3-brand);color:#fff' : 'background:transparent;color:var(--text-primary)')
              + '">' + esc(o.l) + '</button>';
          }).join('')
        + '</div>';
    };
    var row = function(label, control, hint){
      return '<div style="display:grid;grid-template-columns:200px 1fr;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid var(--o3-border-subtle)">'
        + '<div><div style="font-size:13px;font-weight:500;color:var(--text-primary)">' + esc(label) + '</div>'
        + (hint ? '<div style="font-size:10.5px;color:var(--text-tertiary);margin-top:2px">' + esc(hint) + '</div>' : '')
        + '</div>'
        + '<div>' + control + '</div>'
        + '</div>';
    };
    return ''
      + '<div style="font-size:12px;color:var(--text-secondary);margin:0 0 10px;line-height:1.5">'
      +   esc(L('🎨 Global Theme — chỉnh ở đây cascade tới toàn bộ Module Master. Per-property nếu muốn override thì bấm Custom trong Module Master.',
                '🎨 Global Theme — edits cascade to every Module Master section. Per-property overrides live in the Module Master dock.'))
      + '</div>'

      + '<section style="background:var(--o3-surface-card);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius);padding:16px;margin-bottom:14px">'
      +   '<h3 style="margin:0 0 8px;font-size:13px;font-weight:600">' + esc(L('Chế độ màu','Color mode')) + '</h3>'
      +   row(L('Chế độ','Mode'),
            seg('color-mode', [{v:'light',l:'☀ Light'},{v:'dark',l:'☾ Dark'},{v:'auto',l:'◐ Auto'}], t['color-mode']),
            L('Auto theo system preference (prefers-color-scheme).', 'Auto follows system preference.'))
      + '</section>'

      + '<section style="background:var(--o3-surface-card);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius);padding:16px;margin-bottom:14px">'
      +   '<h3 style="margin:0 0 8px;font-size:13px;font-weight:600">' + esc(L('Thương hiệu + Bảng màu','Brand + Palette')) + '</h3>'
      +   row(L('Brand chính','Brand primary'),
            '<input type="color" id="theme-brand" value="' + esc(t['brand']) + '" style="width:48px;height:32px;border:1px solid var(--o3-border-subtle);border-radius:6px;background:transparent;cursor:pointer">'
            + ' <code style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-tertiary);margin-left:8px">' + esc(t['brand']) + '</code>',
            L('Material 3 — màu chính của tổ chức.', 'Material 3 — organisation primary.'))
      +   '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">'
      +     swatch('brand', '--o3-brand')
      +     swatch('brand·hover', '--o3-brand-hover')
      +     swatch('brand·soft', '--o3-brand-soft')
      +     swatch('success', '--o3-success')
      +     swatch('warning', '--o3-warning')
      +     swatch('danger', '--o3-danger')
      +     swatch('info', '--o3-info')
      +     swatch('neutral', '--o3-neutral')
      +   '</div>'
      + '</section>'

      + '<section style="background:var(--o3-surface-card);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius);padding:16px;margin-bottom:14px">'
      +   '<h3 style="margin:0 0 8px;font-size:13px;font-weight:600">' + esc(L('Typography','Typography')) + '</h3>'
      +   row(L('Font family','Font family'),
            '<select id="theme-font-family" style="width:300px;height:32px;padding:0 8px;border:1px solid var(--o3-border-subtle);border-radius:6px;background:var(--o3-surface-card);font-size:12px">'
            + ['Inter, -apple-system, "SF Pro Text", system-ui, sans-serif',
               '"IBM Plex Sans", -apple-system, sans-serif',
               '"Noto Sans", -apple-system, sans-serif',
               'system-ui, -apple-system, "Segoe UI", sans-serif',
               '"SF Pro Text", -apple-system, system-ui, sans-serif'
              ].map(function(f){
                return '<option value="' + esc(f) + '"' + (f === t['font-family'] ? ' selected' : '') + '>' + esc(f.split(',')[0].replace(/['"]/g, '')) + '</option>';
              }).join('')
            + '</select>',
            L('Font công nghiệp phổ biến — Inter (Vercel), IBM Plex (Carbon), system-ui (native).', 'Industrial fonts — Inter, IBM Plex, system-ui.'))
      +   row(L('Cỡ chữ chuẩn','Base font size'),
            '<input type="number" id="theme-font-base" value="' + t['font-base'] + '" min="11" max="16" step="1" style="width:60px;height:32px;padding:0 6px;border:1px solid var(--o3-border-subtle);border-radius:6px;font-size:12px">'
            + ' <span style="font-size:11px;color:var(--text-tertiary);margin-left:4px">px</span>',
            L('Body 13px là chuẩn Vercel/Linear cho industrial UI.', 'Body 13px is Vercel/Linear industrial standard.'))
      + '</section>'

      + '<section style="background:var(--o3-surface-card);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius);padding:16px;margin-bottom:14px">'
      +   '<h3 style="margin:0 0 8px;font-size:13px;font-weight:600">' + esc(L('Mật độ + Hình dạng','Density + Shape')) + '</h3>'
      +   row(L('Mật độ','Density'),
            seg('density', [{v:'compact',l:'Compact 32'},{v:'cozy',l:'Cozy 36'},{v:'comfortable',l:'Comfortable 40'}], t['density']),
            L('Atlassian gọi 3 mức — Compact cho dashboards dày, Comfortable cho touch.', 'Atlassian 3-tier — Compact for dense dashboards, Comfortable for touch.'))
      +   row(L('Khe hở chính','Master gap'),
            '<input type="range" id="theme-master-gap" min="2" max="24" value="' + t['master-gap'] + '" style="width:200px">'
            + ' <span style="font-size:11px;color:var(--text-tertiary);margin-left:8px"><span id="theme-master-gap-val">' + t['master-gap'] + '</span>px</span>')
      +   row(L('Khe phân đoạn','Section gap'),
            '<input type="range" id="theme-section-gap" min="4" max="32" value="' + t['section-gap'] + '" style="width:200px">'
            + ' <span style="font-size:11px;color:var(--text-tertiary);margin-left:8px"><span id="theme-section-gap-val">' + t['section-gap'] + '</span>px</span>')
      +   row(L('Bo góc control','Control radius'),
            '<input type="range" id="theme-master-radius" min="0" max="16" value="' + t['master-radius'] + '" style="width:200px">'
            + ' <span style="font-size:11px;color:var(--text-tertiary);margin-left:8px"><span id="theme-master-radius-val">' + t['master-radius'] + '</span>px</span>')
      +   row(L('Bo góc card','Card radius'),
            '<input type="range" id="theme-card-radius" min="0" max="20" value="' + t['card-radius'] + '" style="width:200px">'
            + ' <span style="font-size:11px;color:var(--text-tertiary);margin-left:8px"><span id="theme-card-radius-val">' + t['card-radius'] + '</span>px</span>')
      + '</section>'

      + '<section style="background:var(--o3-surface-card);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius);padding:16px;margin-bottom:14px">'
      +   '<h3 style="margin:0 0 8px;font-size:13px;font-weight:600">' + esc(L('Chuyển động','Motion')) + '</h3>'
      +   row(L('Cường độ','Intensity'),
            seg('motion', [{v:'subtle',l:'Subtle'},{v:'standard',l:'Standard'},{v:'expressive',l:'Expressive'}], t['motion']),
            L('Linear khuyến nghị Subtle cho ops. Expressive cho marketing surface.', 'Linear recommends Subtle for ops, Expressive for marketing.'))
      + '</section>'

      + '<div style="display:flex;gap:10px;justify-content:flex-end;padding:16px 0">'
      +   '<button type="button" id="theme-reset" style="padding:8px 14px;border:1px solid var(--o3-border-subtle);background:var(--o3-surface-card);border-radius:6px;cursor:pointer;font-size:12px">'
      +     esc(L('Reset to design defaults', 'Reset to design defaults'))
      +   '</button>'
      + '</div>';
  };

  /* Wire interactivity once theme HTML is in DOM. Called by 00c-admin-appearance.js
   * after the panel mounts. Idempotent via data-theme-wired flag. */
  window._wireAdmTheme = function(){
    var t = readTheme();

    function persistAndApply(patch){
      t = Object.assign(t, patch);
      applyTheme(t);
    }

    // Segmented buttons
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-seg]'), function(btn){
      if (btn.getAttribute('data-theme-wired') === '1') return;
      btn.setAttribute('data-theme-wired', '1');
      btn.addEventListener('click', function(){
        var name = btn.getAttribute('data-theme-seg');
        var val = btn.getAttribute('data-theme-val');
        var patch = {}; patch[name] = val;
        persistAndApply(patch);
        // Visually re-render: refresh active state
        var parent = btn.parentElement;
        Array.prototype.forEach.call(parent.querySelectorAll('[data-theme-seg="' + name + '"]'), function(b){
          var isAct = b.getAttribute('data-theme-val') === val;
          b.style.background = isAct ? 'var(--o3-brand)' : 'transparent';
          b.style.color = isAct ? '#fff' : 'var(--text-primary)';
        });
      });
    });

    // Brand color
    var brand = document.getElementById('theme-brand');
    if (brand && brand.getAttribute('data-theme-wired') !== '1') {
      brand.setAttribute('data-theme-wired', '1');
      brand.addEventListener('input', function(){ persistAndApply({brand: brand.value}); });
    }
    // Font family
    var ff = document.getElementById('theme-font-family');
    if (ff && ff.getAttribute('data-theme-wired') !== '1') {
      ff.setAttribute('data-theme-wired', '1');
      ff.addEventListener('change', function(){ persistAndApply({'font-family': ff.value}); });
    }
    // Font base size
    var fb = document.getElementById('theme-font-base');
    if (fb && fb.getAttribute('data-theme-wired') !== '1') {
      fb.setAttribute('data-theme-wired', '1');
      fb.addEventListener('input', function(){ persistAndApply({'font-base': parseInt(fb.value, 10) || 13}); });
    }
    // Range sliders
    [['theme-master-gap','master-gap'],['theme-section-gap','section-gap'],['theme-master-radius','master-radius'],['theme-card-radius','card-radius']].forEach(function(p){
      var inp = document.getElementById(p[0]);
      var out = document.getElementById(p[0] + '-val');
      if (!inp || inp.getAttribute('data-theme-wired') === '1') return;
      inp.setAttribute('data-theme-wired', '1');
      inp.addEventListener('input', function(){
        if (out) out.textContent = inp.value;
        var patch = {}; patch[p[1]] = parseInt(inp.value, 10) || 0;
        persistAndApply(patch);
      });
    });
    // Reset
    var rb = document.getElementById('theme-reset');
    if (rb && rb.getAttribute('data-theme-wired') !== '1') {
      rb.setAttribute('data-theme-wired', '1');
      rb.addEventListener('click', function(){
        if (!confirm('Reset Theme về defaults? Mọi Custom override trong Module Master vẫn giữ nguyên.')) return;
        resetTheme();
        // Re-render Theme tab to reflect reset values
        var panel = document.getElementById('adm-appearance-panel-theme');
        if (panel) panel.innerHTML = window._renderAdmThemeHtml(window.__lang === 'en'
          ? function(vi,en){ return en || vi; }
          : function(vi,en){ return vi || en; });
        if (typeof window._wireAdmTheme === 'function') window._wireAdmTheme();
      });
    }
  };

  /* Apply theme on page load so the saved theme persists across reloads
   * without requiring the admin to visit the Theme tab. */
  function bootApply(){
    try { applyTheme(readTheme()); } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApply);
  } else {
    bootApply();
  }

  // Public helpers for the dock to read theme + overrides
  window._admTheme = {
    read: readTheme,
    apply: applyTheme,
    reset: resetTheme,
    defaults: THEME_DEFAULTS,
    readOverrides: readOverrides
  };

  console.info('[AdmTheme] loaded — Theme tab + dark mode controller ready');
})();
