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
    // v3-G24: density default = 'compact' so the derived control height is
    // 32px — matching the HESEM single-standard SSOT (control.height.standard
    // = 32px, CLAUDE.md). Previously 'cozy' (36px) silently overrode the
    // stylesheet SSOT on every load. compact/cozy/comfortable = 32/36/40.
    'density': 'compact',
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
    var dh = { compact: 32, cozy: 36, comfortable: 40 }[theme['density']] || 32;
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
    // v3-G17: notify listeners (Module Master dock) so non-Custom rows
    // can re-read their inherited values from root computed style.
    try { document.dispatchEvent(new CustomEvent('o3:theme-applied', { detail: { theme: theme } })); } catch (e) {}
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

  function resetTheme(alsoClearOverrides){
    try { localStorage.removeItem('o3-theme'); } catch (e) {}
    if (alsoClearOverrides) {
      try { localStorage.removeItem('o3-props-overrides'); } catch (e) {}
      // Remove any inline overrides on :root so the cascade returns
      // to the stylesheet defaults
      var commonVars = ['--o3-space','--o3-space-section','--o3-radius','--o3-radius-card','--o3-control-h-standard','--o3-control-h-md','--o3-control-h-sm','--o3-control-h-lg','--o3-brand','--brand-primary','--o3-font-size-md','--o3-font-size-sm','--o3-font-size-lg','--master-gap','--section-gap','--master-radius','--card-radius','--o3-motion-fast','--o3-motion-base','--o3-motion-slow'];
      commonVars.forEach(function(v){ document.documentElement.style.removeProperty(v); });
    }
    applyTheme(THEME_DEFAULTS);
  }

  /* ── Render the Theme tab body ───────────────────────────────────── */
  /* Active sub-tab inside Theme tab. Persist per session so admin
   * returning to Theme lands on the same panel. */
  var _activeThemeSubtab = (function(){
    try { return sessionStorage.getItem('o3-theme-subtab') || 'mode'; }
    catch (e) { return 'mode'; }
  })();
  window._admThemeSetSubtab = function(id){
    _activeThemeSubtab = id || 'mode';
    try { sessionStorage.setItem('o3-theme-subtab', _activeThemeSubtab); } catch (e) {}
    var panel = document.getElementById('adm-appearance-panel-theme');
    if (panel) {
      panel.innerHTML = window._renderAdmThemeHtml(window.__lang === 'en'
        ? function(vi,en){ return en || vi; }
        : function(vi,en){ return vi || en; });
      if (typeof window._wireAdmTheme === 'function') window._wireAdmTheme();
    }
  };

  function renderSeg(name, options, current){
    return '<div style="display:inline-flex;border:1px solid var(--o3-border-subtle);border-radius:6px;overflow:hidden">'
      + options.map(function(o){
          var active = o.v === current;
          return '<button type="button" data-theme-seg="' + esc(name) + '" data-theme-val="' + esc(o.v) + '"'
            + ' style="border:0;padding:6px 12px;cursor:pointer;font-size:12px;'
            + (active ? 'background:var(--o3-brand);color:#fff' : 'background:transparent;color:var(--text-primary,#0f172a)')
            + '">' + esc(o.l) + '</button>';
        }).join('')
      + '</div>';
  }
  function renderRow(label, control, hint){
    return '<div style="display:grid;grid-template-columns:200px 1fr;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--o3-border-subtle)">'
      + '<div><div style="font-size:13px;font-weight:500;color:var(--text-primary,#0f172a)">' + esc(label) + '</div>'
      + (hint ? '<div style="font-size:10.5px;color:var(--text-tertiary,#94a3b8);margin-top:2px">' + esc(hint) + '</div>' : '')
      + '</div>'
      + '<div>' + control + '</div>'
      + '</div>';
  }
  function renderSwatch(label, cssVar){
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">'
      + '<div style="width:40px;height:40px;border-radius:6px;background:var(' + cssVar + ');border:1px solid var(--o3-border-subtle);box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></div>'
      + '<span style="font-size:10px;color:var(--text-secondary,#475569)">' + esc(label) + '</span>'
      + '</div>';
  }

  /* ── Sub-tab content renderers (each returns innerHTML for body) ── */
  function renderModeTab(L, t){
    return ''
      + renderRow(L('Chế độ màu','Color mode'),
          renderSeg('color-mode', [{v:'light',l:'☀ Light'},{v:'dark',l:'☾ Dark'},{v:'auto',l:'◐ Auto'}], t['color-mode']),
          L('Auto theo system preference (prefers-color-scheme).', 'Auto follows system preference.'));
  }
  function renderColorTab(L, t){
    return ''
      + renderRow(L('Brand chính','Brand primary'),
          '<input type="color" id="theme-brand" value="' + esc(t['brand']) + '" style="width:48px;height:32px;border:1px solid var(--o3-border-subtle);border-radius:6px;background:transparent;cursor:pointer">'
          + ' <code style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-tertiary,#94a3b8);margin-left:8px">' + esc(t['brand']) + '</code>',
          L('Material 3 — màu chính của tổ chức.', 'Material 3 — organisation primary.'))
      + '<div style="display:flex;gap:14px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--o3-border-subtle)">'
      +   renderSwatch('brand', '--o3-brand')
      +   renderSwatch('brand·hover', '--o3-brand-hover')
      +   renderSwatch('brand·soft', '--o3-brand-soft')
      +   renderSwatch('success', '--o3-success')
      +   renderSwatch('warning', '--o3-warning')
      +   renderSwatch('danger', '--o3-danger')
      +   renderSwatch('info', '--o3-info')
      +   renderSwatch('neutral', '--o3-neutral')
      + '</div>'
      + '<div style="padding-top:14px;font-size:11.5px;color:var(--text-tertiary,#94a3b8);line-height:1.5">'
      +   esc(L('Swatch trạng thái auto-derive từ palette gốc. Roadmap v3-G16: HSL harmonization để hover/soft xoay theo brand.',
                'Status swatches derive from base palette. Roadmap: HSL harmonisation so hover/soft shift with brand.'))
      + '</div>';
  }
  function renderTypographyTab(L, t){
    return ''
      + renderRow(L('Font family','Font family'),
          '<select id="theme-font-family" style="width:300px;height:32px;padding:0 8px;border:1px solid var(--o3-border-subtle);border-radius:6px;font-size:12px;background:var(--bg-surface) !important;color:var(--text-primary) !important">'
          + ['Inter, -apple-system, "SF Pro Text", system-ui, sans-serif',
             '"IBM Plex Sans", -apple-system, sans-serif',
             '"Noto Sans", -apple-system, sans-serif',
             'system-ui, -apple-system, "Segoe UI", sans-serif',
             '"SF Pro Text", -apple-system, system-ui, sans-serif'
            ].map(function(f){
              var first = f.split(',')[0].replace(/['"]/g, '');
              return '<option value="' + esc(f) + '"' + (f === t['font-family'] ? ' selected' : '') + ' style="font-family:' + esc(f) + '">' + esc(first) + '</option>';
            }).join('')
          + '</select>',
          L('Inter (Vercel), IBM Plex (Carbon), system-ui (native).', 'Inter, IBM Plex, system-ui.'))
      + renderRow(L('Cỡ chữ chuẩn','Base font size'),
          '<input type="number" id="theme-font-base" value="' + t['font-base'] + '" min="11" max="16" step="1" style="width:64px;height:32px;padding:0 6px;border:1px solid var(--o3-border-subtle);border-radius:6px;font-size:12px;background:var(--bg-surface) !important;color:var(--text-primary) !important">'
          + ' <span style="font-size:11px;color:var(--text-tertiary,#94a3b8);margin-left:4px">px</span>',
          L('Body 13px là chuẩn Vercel/Linear cho industrial UI.', 'Body 13px is Vercel/Linear industrial standard.'))
      + '<div style="padding-top:14px;font-size:11.5px;color:var(--text-tertiary,#94a3b8);line-height:1.5">'
      +   esc(L('Type ramp tự sinh từ base: XS = base × 0.85, SM × 0.92, MD = base, LG × 1.15, XL × 1.4, 2XL × 1.7, 3XL × 2.15.',
                'Type ramp auto-scales from base: XS×0.85, SM×0.92, MD=base, LG×1.15, XL×1.4, 2XL×1.7, 3XL×2.15.'))
      + '</div>';
  }
  function renderDensityTab(L, t){
    return ''
      + renderRow(L('Mật độ','Density'),
          renderSeg('density', [{v:'compact',l:'Compact 32'},{v:'cozy',l:'Cozy 36'},{v:'comfortable',l:'Comfortable 40'}], t['density']),
          L('Atlassian 3-tier — Compact dày, Comfortable touch.', 'Atlassian 3-tier — Compact dense, Comfortable for touch.'))
      + renderRow(L('Khe hở chính','Master gap'),
          '<input type="range" id="theme-master-gap" min="2" max="24" value="' + t['master-gap'] + '" style="width:200px">'
          + ' <span style="font-size:11px;color:var(--text-tertiary,#94a3b8);margin-left:8px"><span id="theme-master-gap-val">' + t['master-gap'] + '</span>px</span>')
      + renderRow(L('Khe phân đoạn','Section gap'),
          '<input type="range" id="theme-section-gap" min="4" max="32" value="' + t['section-gap'] + '" style="width:200px">'
          + ' <span style="font-size:11px;color:var(--text-tertiary,#94a3b8);margin-left:8px"><span id="theme-section-gap-val">' + t['section-gap'] + '</span>px</span>')
      + renderRow(L('Bo góc control','Control radius'),
          '<input type="range" id="theme-master-radius" min="0" max="16" value="' + t['master-radius'] + '" style="width:200px">'
          + ' <span style="font-size:11px;color:var(--text-tertiary,#94a3b8);margin-left:8px"><span id="theme-master-radius-val">' + t['master-radius'] + '</span>px</span>')
      + renderRow(L('Bo góc card','Card radius'),
          '<input type="range" id="theme-card-radius" min="0" max="20" value="' + t['card-radius'] + '" style="width:200px">'
          + ' <span style="font-size:11px;color:var(--text-tertiary,#94a3b8);margin-left:8px"><span id="theme-card-radius-val">' + t['card-radius'] + '</span>px</span>');
  }
  function renderMotionTab(L, t){
    return ''
      + renderRow(L('Cường độ','Intensity'),
          renderSeg('motion', [{v:'subtle',l:'Subtle (0.7×)'},{v:'standard',l:'Standard (1.0×)'},{v:'expressive',l:'Expressive (1.4×)'}], t['motion']),
          L('Linear khuyến nghị Subtle cho ops, Expressive cho marketing.', 'Linear recommends Subtle for ops, Expressive for marketing.'))
      + '<div style="padding-top:14px;font-size:11.5px;color:var(--text-tertiary,#94a3b8);line-height:1.5">'
      +   esc(L('Cường độ multiply lên 3 mức cơ bản: Fast 120ms, Base 200ms, Slow 320ms (Material 3 spec).',
                'Intensity multiplies 3 base tiers: Fast 120ms, Base 200ms, Slow 320ms (Material 3 spec).'))
      + '</div>';
  }

  /* ── Theme Template editor (graphics_theme_preset, migration 263) ──────────
     Create / edit / save named themes; Simulate applies live to the whole app;
     Save persists via the DB-backed API. The Module Builder picker + runtime
     applyTheme() read the SAME store, so a saved preset ripples everywhere. New
     presets default to the locked HESEM standard (gap 8 / outer 8 / inner 4). */
  var _tpDraft = null;
  var _tpWarmed = false;
  function _tpBlank(){
    return { preset_key:'', display_name_vi:'', display_name_en:'', brand:'#0c4a6e',
      density_px:8, radius_outer_px:8, radius_inner_px:4, control_h_px:32, frame_px:8, is_builtin:false, _new:true };
  }
  function _tpFromTheme(key){
    var LT = window.LegoTheme, th = LT && LT.themes && LT.themes[key];
    if (!th) return _tpBlank();
    var outer = (th.radius != null) ? th.radius : 8;
    return { preset_key:key,
      display_name_vi:(th.label && th.label.vi) || key, display_name_en:(th.label && th.label.en) || key,
      brand:th.brand || '#0c4a6e', density_px:(th.density != null) ? th.density : 8,
      radius_outer_px:outer, radius_inner_px:(th.radiusInner != null) ? th.radiusInner : Math.max(2, Math.round(outer/2)),
      control_h_px:(th.controlH != null) ? th.controlH : 32, frame_px:(th.frame != null) ? th.frame : ((th.density != null) ? th.density : 8),
      is_builtin:!!th._builtin, _new:false };
  }
  function _tpApi(action){ return 'api.php?action=' + encodeURIComponent(action); }
  function _tpToast(m, k){ if (typeof window.showToast === 'function') window.showToast(m, k || 'info'); }
  function _tpEN(){ return window.__lang === 'en'; }
  function _tpRerender(){
    var panel = document.getElementById('adm-appearance-panel-theme');
    if (!panel) return;
    panel.innerHTML = window._renderAdmThemeHtml(_tpEN() ? function(vi,en){return en||vi;} : function(vi,en){return vi||en;});
    if (typeof window._wireAdmTheme === 'function') window._wireAdmTheme();
  }
  window._admTpSelect = function(key){ _tpDraft = (key === '__new__') ? _tpBlank() : _tpFromTheme(key); _tpRerender(); };
  window._admTpNew = function(){ _tpDraft = _tpBlank(); _tpRerender(); };
  window._admTpField = function(id){
    var el = document.getElementById(id); if (!el || !_tpDraft) return;
    var map = { 'tp-key':'preset_key','tp-name-vi':'display_name_vi','tp-name-en':'display_name_en','tp-brand':'brand',
      'tp-density':'density_px','tp-outer':'radius_outer_px','tp-inner':'radius_inner_px','tp-ctrl':'control_h_px' };
    var f = map[id]; if (!f) return;
    var v = el.value;
    if (f.slice(-3) === '_px') v = parseInt(v, 10) || 0;
    if (f === 'preset_key') v = String(v).toLowerCase().replace(/[^a-z0-9\-]/g, '');
    _tpDraft[f] = v;
  };
  window._admTpSimulate = function(){
    var LT = window.LegoTheme, d = _tpDraft; if (!LT || !d) return;
    var root = document.documentElement;
    try {
      if (LT.applyBrand)      LT.applyBrand(d.brand, { scope: root });
      if (LT.setDensity)      LT.setDensity(d.density_px, { scope: root });
      if (LT.setRadius)       LT.setRadius(d.radius_inner_px, { scope: root });
      if (LT.setCardRadius)   LT.setCardRadius(d.radius_outer_px, { scope: root });
      if (LT.setControlHeight)LT.setControlHeight(d.control_h_px, { scope: root });
      _tpToast(_tpEN() ? 'Simulating theme live' : 'Đang mô phỏng theme trực tiếp', 'success');
    } catch (e) { _tpToast('Simulate error: ' + e, 'error'); }
  };
  window._admTpSave = function(){
    var d = _tpDraft; if (!d) return;
    if (!d.preset_key){ _tpToast(_tpEN() ? 'Enter a preset key' : 'Nhập mã preset', 'warning'); return; }
    fetch(_tpApi('graphics_theme_preset_save'), { method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ preset: d }) })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { ok:r.ok, j:j }; }); })
      .then(function(res){
        if (!res.ok){ _tpToast((_tpEN() ? 'Save failed: ' : 'Lưu lỗi: ') + ((res.j && (res.j.error || res.j.detail)) || ''), 'error'); return; }
        _tpToast(_tpEN() ? 'Theme saved' : 'Đã lưu theme', 'success');
        var LT = window.LegoTheme;
        (LT && LT.loadPresets ? LT.loadPresets(true) : Promise.resolve()).then(function(){ _tpDraft = _tpFromTheme(d.preset_key); _tpRerender(); });
      })
      .catch(function(e){ _tpToast('Save error: ' + e, 'error'); });
  };
  window._admTpDelete = function(){
    var d = _tpDraft; if (!d || !d.preset_key) return;
    if (d.is_builtin){ _tpToast(_tpEN() ? 'Built-in presets cannot be deleted' : 'Không thể xoá preset mặc định', 'warning'); return; }
    fetch(_tpApi('graphics_theme_preset_delete'), { method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ preset_key: d.preset_key }) })
      .then(function(r){ return r.ok; })
      .then(function(ok){
        _tpToast(ok ? (_tpEN() ? 'Deleted' : 'Đã xoá') : (_tpEN() ? 'Delete failed' : 'Xoá lỗi'), ok ? 'success' : 'error');
        var LT = window.LegoTheme;
        (LT && LT.loadPresets ? LT.loadPresets(true) : Promise.resolve()).then(function(){ _tpDraft = null; _tpRerender(); });
      });
  };
  function renderTemplatesTab(L, t){
    var LT = window.LegoTheme;
    if (!_tpWarmed && LT && LT.loadPresets){ _tpWarmed = true; LT.loadPresets(true).then(function(){ _tpRerender(); }); }
    var themes = (LT && LT.themes) || {};
    var keys = Object.keys(themes);
    if (!_tpDraft) _tpDraft = _tpFromTheme(keys[0] || 'hesem-default');
    var d = _tpDraft, en = _tpEN();
    function inp(id, val, type, attrs){
      attrs = attrs || '';
      var base = (attrs.indexOf('style=') >= 0) ? ''
        : ' style="padding:6px 8px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius,4px);font-size:12px;background:var(--o3-surface-card);color:var(--text-primary,#0f172a)"';
      return '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val) + '" ' + attrs + base + ' oninput="_admTpField(\'' + id + '\')">';
    }
    var optHtml = keys.map(function(k){
      var lab = (themes[k].label && (en ? themes[k].label.en : themes[k].label.vi)) || k;
      return '<option value="' + esc(k) + '"' + (k === d.preset_key ? ' selected' : '') + '>' + esc(lab) + (themes[k]._builtin ? (en ? ' · built-in' : ' · mặc định') : '') + '</option>';
    }).join('') + '<option value="__new__">' + esc(L('➕ Tạo preset mới', '➕ New preset')) + '</option>';
    var h = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.5">'
      + esc(L('🎭 Tạo/sửa Theme Template lưu vào DB (graphics_theme_preset). Module Builder + runtime dùng đúng các preset này. Chuẩn mặc định: khe hở 8 · bo ngoài 8 · bo trong 4.',
              '🎭 Create/edit DB-backed theme templates. Module Builder + runtime use these. Default standard: gap 8 · outer 8 · inner 4.')) + '</div>';
    h += renderRow(L('Preset', 'Preset'),
      '<select id="tp-select" onchange="_admTpSelect(this.value)" style="padding:6px 8px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius,4px);font-size:12px;min-width:240px">' + optHtml + '</select>'
      + (d.is_builtin ? ' <span class="o3-chip">built-in</span>' : ''));
    h += renderRow(L('Mã (key)', 'Key'), inp('tp-key', d.preset_key, 'text', d.is_builtin ? 'readonly' : ''), d.is_builtin ? L('Built-in: khoá cố định', 'Built-in: key fixed') : L('chữ thường, gạch ngang', 'lowercase, dashes'));
    h += renderRow(L('Tên (VN)', 'Name (VN)'), inp('tp-name-vi', d.display_name_vi));
    h += renderRow(L('Tên (EN)', 'Name (EN)'), inp('tp-name-en', d.display_name_en));
    h += renderRow(L('Màu thương hiệu', 'Brand color'), inp('tp-brand', d.brand, 'color', 'style="width:54px;height:32px;padding:2px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius,4px);cursor:pointer"'));
    h += renderRow(L('Khe hở (gap) px', 'Gap px'), inp('tp-density', d.density_px, 'number', 'min="2" max="24"'), 'space.master');
    h += renderRow(L('Bo góc NGOÀI cấp 1 px', 'Outer radius (lvl 1) px'), inp('tp-outer', d.radius_outer_px, 'number', 'min="0" max="40"'), L('thẻ / khung / panel', 'cards / panels'));
    h += renderRow(L('Bo góc TRONG cấp 2/3 px', 'Inner radius (lvl 2/3) px'), inp('tp-inner', d.radius_inner_px, 'number', 'min="0" max="32"'), L('nút / input / chip', 'buttons / inputs'));
    h += renderRow(L('Cao control px', 'Control height px'), inp('tp-ctrl', d.control_h_px, 'number', 'min="24" max="56"'));
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:14px">'
      + '<button type="button" onclick="_admTpSimulate()" style="padding:8px 14px;border:1px solid var(--o3-border-subtle);background:var(--o3-surface-card);border-radius:var(--o3-radius,4px);cursor:pointer;font-size:12px">🔬 ' + esc(L('Mô phỏng', 'Simulate')) + '</button>'
      + '<button type="button" onclick="_admTpNew()" style="padding:8px 14px;border:1px solid var(--o3-border-subtle);background:var(--o3-surface-card);border-radius:var(--o3-radius,4px);cursor:pointer;font-size:12px">➕ ' + esc(L('Mới', 'New')) + '</button>'
      + (d.is_builtin ? '' : '<button type="button" onclick="_admTpDelete()" style="padding:8px 14px;border:1px solid var(--o3-danger,#b91c1c);color:var(--o3-danger,#b91c1c);background:var(--o3-surface-card);border-radius:var(--o3-radius,4px);cursor:pointer;font-size:12px">🗑 ' + esc(L('Xoá', 'Delete')) + '</button>')
      + '<button type="button" onclick="_admTpSave()" style="padding:8px 14px;border:0;background:var(--o3-brand);color:#fff;border-radius:var(--o3-radius,4px);cursor:pointer;font-size:12px;font-weight:600">💾 ' + esc(L('Lưu Template', 'Save template')) + '</button>'
      + '</div>';
    return h;
  }

  window._renderAdmThemeHtml = function(L){
    L = L || function(vi, en){ return vi || en; };
    var t = readTheme();
    var SUBTABS = [
      { id: 'mode',       vi: '☾ Chế độ',   en: '☾ Mode',       render: renderModeTab },
      { id: 'color',      vi: '🎨 Màu',     en: '🎨 Color',     render: renderColorTab },
      { id: 'typography', vi: '🔠 Chữ',     en: '🔠 Typography',render: renderTypographyTab },
      { id: 'density',    vi: '📐 Mật độ',  en: '📐 Density',   render: renderDensityTab },
      { id: 'motion',     vi: '⚡ Chuyển động','en': '⚡ Motion', render: renderMotionTab },
      { id: 'templates',  vi: '🎭 Theme Template', en: '🎭 Theme Templates', render: renderTemplatesTab }
    ];
    var active = SUBTABS.find(function(x){ return x.id === _activeThemeSubtab; }) || SUBTABS[0];

    var tabStrip = '<nav style="display:flex;gap:0;border-bottom:1px solid var(--o3-border-subtle);margin:0 0 14px">'
      + SUBTABS.map(function(s){
          var isAct = s.id === active.id;
          return '<button type="button" data-theme-subtab="' + esc(s.id) + '"'
            + ' onclick="_admThemeSetSubtab(\'' + esc(s.id) + '\')"'
            + ' style="border:0;padding:8px 14px;background:transparent;cursor:pointer;font-size:12.5px;'
            + 'color:' + (isAct ? 'var(--o3-brand)' : 'var(--text-secondary,#475569)') + ';'
            + 'border-bottom:2px solid ' + (isAct ? 'var(--o3-brand)' : 'transparent') + ';'
            + 'font-weight:' + (isAct ? '600' : '500') + '">'
            + esc(L(s.vi, s.en)) + '</button>';
        }).join('')
      + '</nav>';

    return ''
      + '<div style="font-size:12px;color:var(--text-secondary,#475569);margin:0 0 12px;line-height:1.5">'
      +   esc(L('🎨 Global Theme — chỉnh ở đây cascade tới toàn bộ Module Master. Per-property nếu muốn override thì bấm Custom trong dock Module Master.',
                '🎨 Global Theme — edits cascade to every Module Master section. Per-property overrides live in the Module Master dock via Custom checkbox.'))
      + '</div>'
      + tabStrip
      + '<section style="background:var(--o3-surface-card);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius);padding:14px 18px">'
      +   active.render(L, t)
      + '</section>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end;padding:14px 0">'
      +   '<button type="button" id="theme-reset" style="padding:8px 14px;border:1px solid var(--o3-border-subtle);background:var(--o3-surface-card);color:var(--text-primary,#0f172a);border-radius:6px;cursor:pointer;font-size:12px">'
      +     esc(L('Reset to design defaults', 'Reset to design defaults'))
      +   '</button>'
      +   '<button type="button" id="theme-save" style="padding:8px 14px;border:0;background:var(--o3-brand);color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">'
      +     esc(L('Lưu Theme cho tổ chức', 'Save Theme for org'))
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
        var overrides = readOverrides();
        var overrideCount = Object.keys(overrides).filter(function(k){ return overrides[k]; }).length;
        var msg = 'Reset Global Theme về research-backed defaults?';
        var alsoClear = false;
        if (overrideCount > 0) {
          alsoClear = confirm(msg + '\n\n' + overrideCount + ' Custom override đang được giữ nguyên trong Module Master.\n\nBấm OK để CŨNG XOÁ HẾT các override (full reset).\nBấm Cancel để CHỈ reset Theme (giữ overrides).');
        } else {
          if (!confirm(msg)) return;
        }
        resetTheme(alsoClear);
        var panel = document.getElementById('adm-appearance-panel-theme');
        if (panel) panel.innerHTML = window._renderAdmThemeHtml(window.__lang === 'en'
          ? function(vi,en){ return en || vi; }
          : function(vi,en){ return vi || en; });
        if (typeof window._wireAdmTheme === 'function') window._wireAdmTheme();
      });
    }
    // Save — v3-G23: REAL backend persistence via the shared moduleMaster
    // store (read-merge-write into the org design config through
    // HmTheme.saveAdminConfig). localStorage is already up to date from
    // applyTheme(); this pushes it to the server so it survives re-login
    // on any device. GraphicsAuthority staging is kept as best-effort
    // WCAG-simulation evidence only.
    var sb = document.getElementById('theme-save');
    if (sb && sb.getAttribute('data-theme-wired') !== '1') {
      sb.setAttribute('data-theme-wired', '1');
      sb.addEventListener('click', function(){
        var theme = readTheme();
        var btn = this, origLabel = btn.textContent;
        // Best-effort: stage tokens into GraphicsAuthority for the WCAG
        // simulation evidence trail (graphics_simulation_run).
        try {
          if (window.GraphicsAuthority && window.GraphicsAuthority.tokens
              && typeof window.GraphicsAuthority.tokens.stage === 'function') {
            var dHeight = ({compact:32,cozy:36,comfortable:40}[theme['density']] || 36);
            [['space.master', theme['master-gap']+'px'],
             ['space.section', theme['section-gap']+'px'],
             ['radius.master', theme['master-radius']+'px'],
             ['radius.card',   theme['card-radius']+'px'],
             ['control.height.standard', dHeight+'px'],
             ['brand.primary', theme['brand']]].forEach(function(p){
              try { window.GraphicsAuthority.tokens.stage(p[0], p[1]); } catch(e){}
            });
          }
        } catch (e) {}
        // Real persistence through the shared store (defined in 00c).
        if (window._moduleMasterStore && typeof window._moduleMasterStore.persist === 'function') {
          btn.disabled = true; btn.textContent = 'Đang lưu…';
          window._moduleMasterStore.persist(function(ok, mode){
            btn.disabled = false; btn.textContent = origLabel;
            if (window._moduleMasterStore.toast) window._moduleMasterStore.toast(ok, mode);
          });
        } else {
          // Fallback toast if 00c didn't load (defensive only).
          var toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 20px;background:#0f172a;color:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.30);font-size:13px;z-index:99999;border-left:3px solid #d97706';
          toast.textContent = '⚠ Đã lưu vào trình duyệt này. Backend store chưa sẵn sàng.';
          document.body.appendChild(toast);
          setTimeout(function(){ toast.style.transition='opacity 300ms'; toast.style.opacity='0'; setTimeout(function(){ toast.remove(); }, 350); }, 4000);
        }
      });
    }
  };

  /* Apply theme on page load so the saved theme persists across reloads
   * without requiring the admin to visit the Theme tab. */
  function bootApply(){
    try { applyTheme(readTheme()); } catch (e) {}
    // v3-G23: immediately re-apply cached per-component override VALUES so
    // custom heights/paddings/colours persist visually across reloads
    // (the backend hydrate in 00c will confirm/refresh shortly after).
    try {
      if (window._moduleMasterStore && typeof window._moduleMasterStore.reapplyValues === 'function') {
        window._moduleMasterStore.reapplyValues();
      }
    } catch (e) {}
    try { startSidebarInlineColorStripper(); } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApply);
  } else {
    bootApply();
  }

  /* v3-G18: in dark mode, strip inline `color:` attributes from sidebar
   * text elements so legacy inline styles don't keep displaying dark
   * text on dark background. Runs only when [data-color-mode=dark] is
   * active and re-runs whenever sidebar mutates. */
  function startSidebarInlineColorStripper(){
    if (typeof MutationObserver === 'undefined') return;
    function stripIfDark(){
      if (document.documentElement.getAttribute('data-color-mode') !== 'dark') return;
      var sb = document.getElementById('sidebar');
      if (!sb) return;
      // Strip the `color:` part from inline `style` of sidebar text
      // descendants. Don't remove the whole style — preserve display/
      // position/etc.
      Array.prototype.forEach.call(sb.querySelectorAll('[style*="color"]'), function(el){
        var s = el.getAttribute('style') || '';
        var stripped = s.replace(/(?:^|;)\s*color\s*:\s*[^;]+;?/gi, '').trim();
        if (stripped !== s) el.setAttribute('style', stripped);
      });
    }
    stripIfDark();
    var observer = new MutationObserver(function(){ stripIfDark(); });
    var sb = document.getElementById('sidebar');
    if (sb) observer.observe(sb, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    // Re-strip when color-mode flips
    var htmlObserver = new MutationObserver(function(){ stripIfDark(); });
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
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
