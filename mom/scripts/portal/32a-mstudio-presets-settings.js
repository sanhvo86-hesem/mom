/* ============================================================================
 * 32a-mstudio-presets-settings.js — Module Studio vNext P2
 * ----------------------------------------------------------------------------
 * Registers TWO surfaces over the shell (32-module-studio.js):
 *
 *   🎨 Thư viện preset  (key: 'theme', order 40)
 *     – full preset library table + RICH grouped attribute editor (16 T2 groups)
 *     – OKLCH brand-seed derivation via LegoTheme._color helpers
 *     – DTCG export, Validate (pass/warn/fail), Apply org-wide round-trip
 *
 *   ⚙️ Cài đặt          (key: 'settings', order 45)
 *     – org-level policy: Mode · Typography · Motion intensity
 *     – persists via _moduleMasterStore.persist (same authority as Theme save)
 *
 * SSOT rules (enforced here, not elsewhere):
 *   • density/radius/control/brand edited ONLY in preset editor
 *   • mode/font-family/font-base/motion-intensity edited ONLY in Settings
 *   • localStorage = preview cache only; backend is authority
 *   • all writes via MStudio.api.post() (CSRF-safe apiCall)
 *
 * Three-tier token architecture (DTCG 2025.10):
 *   T1 Primitive  → constrained palette (never consumed by components directly)
 *   T2 Semantic   → alias/intent layer (what presets edit)
 *   T3 Component  → per-component divergence (in overrides JSONB bag)
 * ==========================================================================*/
(function () {
  'use strict';

  var ROOT = 'mstudio';
  /* Module-level state (presets surface) */
  var _ps = {
    list: null,      /* array of preset objects from backend, null = not loaded */
    editing: null,   /* preset_key being edited */
    draft: null,     /* mutable draft object */
    saving: false,
    validating: false,
    validateResult: null /* { ok, level:'pass'|'warn'|'fail', issues:[] } */
  };
  /* Module-level state (settings surface) */
  var _ss = {
    settings: null,  /* current org settings (from localStorage + defaults) */
    saving: false
  };
  /* Suppress live-preview while loading to avoid flash */
  var _previewPaused = false;

  /* ── Helpers (mirror MStudio.api, safe to call before api is ready) ─── */
  function api() { return window.MStudio && window.MStudio.api; }
  function esc(s) { var a = api(); return a ? a.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { var a = api(); if (a) { a.toast(m, t); } }
  function post(action, body) { var a = api(); return a ? a.post(action, body) : Promise.reject(new Error('api not ready')); }
  function getJson(action, qs) { var a = api(); return a ? a.getJson(action, qs) : Promise.reject(new Error('api not ready')); }
  function repaintBody() { var a = api(); if (a) { a.repaintBody(); } }

  /* ── OKLCH ramp (reuse LegoTheme._color; fall back to inline if not loaded) */
  function deriveRamp(hex) {
    var LT = window.LegoTheme;
    if (LT && LT._color && typeof LT._color.hexToRgb === 'function') {
      return LT.applyBrand ? (function () {
        /* derive without actually applying (just math) */
        var c = LT._color;
        var rgb = c.hexToRgb(hex); if (!rgb) { return null; }
        var base = c.rgbToOklch(rgb);
        var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
        var hover = { L: clamp(base.L - 0.05, 0, 1), C: base.C, H: base.H };
        var soft = { L: clamp(base.L + 0.30, 0, 1), C: clamp(base.C * 0.20, 0, 0.4), H: base.H };
        var strong = { L: clamp(base.L - 0.12, 0, 1), C: base.C, H: base.H };
        var on = (base.L < 0.62) ? { L: 0.99, C: 0, H: base.H } : { L: 0.20, C: 0.01, H: base.H };
        return {
          base: c.oklchToHex ? c.oklchToHex(base) : hex,
          hover: c.oklchToHex ? c.oklchToHex(hover) : hex,
          soft: c.oklchToHex ? c.oklchToHex(soft) : '#e0f2fe',
          strong: c.oklchToHex ? c.oklchToHex(strong) : hex,
          on: c.oklchToHex ? c.oklchToHex(on) : '#ffffff'
        };
      })() : null;
    }
    return null;
  }

  /* ── persistPresetAsOrgTheme (mirrors shell's implementation) ─────────── */
  function persistPresetAsOrgTheme(p, cb) {
    var LS; try { LS = window.localStorage; } catch (e) { return false; }
    if (!LS) { return false; }
    var theme = {}; try { theme = JSON.parse(LS.getItem('o3-theme') || '{}') || {}; } catch (e) { theme = {}; }
    theme['color-mode'] = theme['color-mode'] || 'light';
    theme['font-family'] = theme['font-family'] || 'Inter, -apple-system, "SF Pro Text", system-ui, sans-serif';
    theme['font-base'] = theme['font-base'] || 13; theme['font-scale'] = theme['font-scale'] || 1;
    theme['motion'] = theme['motion'] || 'standard';
    theme['motion-fast'] = theme['motion-fast'] || 120; theme['motion-base'] = theme['motion-base'] || 200; theme['motion-slow'] = theme['motion-slow'] || 320;
    if (p.brand) { theme['brand'] = p.brand; }
    if (p.density_px != null) { theme['master-gap'] = p.density_px; }
    theme['section-gap'] = theme['section-gap'] || 12;
    if (p.radius_inner_px != null) { theme['master-radius'] = p.radius_inner_px; }
    if (p.radius_outer_px != null) { theme['card-radius'] = p.radius_outer_px; }
    var ch = p.control_h_px;
    if (ch != null) { theme['density'] = ({ 32: 'compact', 36: 'cozy', 40: 'comfortable' })[ch] || 'compact'; }
    /* Apply motion durations from overrides if present */
    var ov = (p.overrides && typeof p.overrides === 'object') ? p.overrides : {};
    if (ov['motion.fast'] != null) { theme['motion-fast'] = parseInt(ov['motion.fast'], 10) || theme['motion-fast']; }
    if (ov['motion.base'] != null) { theme['motion-base'] = parseInt(ov['motion.base'], 10) || theme['motion-base']; }
    if (ov['motion.slow'] != null) { theme['motion-slow'] = parseInt(ov['motion.slow'], 10) || theme['motion-slow']; }
    try { LS.setItem('o3-theme', JSON.stringify(theme)); } catch (e) { return false; }
    /* exact control height via per-property override */
    if (ch != null) {
      var propOv = {}, propVals = {};
      function asObj(raw) { var v; try { v = JSON.parse(raw || '{}'); } catch (e) { v = null; } return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
      propOv = asObj(LS.getItem('o3-props-overrides'));
      propVals = asObj(LS.getItem('o3-props-values'));
      propOv['control.height.standard'] = true;
      ['--o3-control-h-standard', '--o3-control-h-md', '--o3-control-h-sm', '--o3-control-h-lg'].forEach(function (cv) { propVals[cv] = ch + 'px'; });
      try { LS.setItem('o3-props-overrides', JSON.stringify(propOv)); LS.setItem('o3-props-values', JSON.stringify(propVals)); } catch (e) { /* noop */ }
    }
    /* instant runtime re-skin */
    try { if (window.LegoTheme && typeof window.LegoTheme.applyTheme === 'function') { window.LegoTheme.applyTheme(p.preset_key); } } catch (e) { /* noop */ }
    try { if (window._admTheme && typeof window._admTheme.apply === 'function') { window._admTheme.apply(theme); } } catch (e) { /* noop */ }
    /* push org-wide via shared store */
    if (window._moduleMasterStore && typeof window._moduleMasterStore.persist === 'function') {
      window._moduleMasterStore.persist(function (ok) {
        toast(ok ? ('Đã áp dụng + lưu preset "' + p.preset_key + '" cho tổ chức.') : 'Áp dụng runtime OK; lưu org thất bại.', ok ? 'success' : 'warning');
        if (cb) { cb(ok); }
      });
      return true;
    }
    /* fallback: direct HmTheme save */
    var HmTheme = window.HmTheme;
    if (HmTheme && typeof HmTheme.getAdminConfig === 'function' && typeof HmTheme.saveAdminConfig === 'function') {
      var blob = { theme: theme, overrides: (function () { try { return JSON.parse(LS.getItem('o3-props-overrides') || '{}') || {}; } catch (e) { return {}; } })(), values: (function () { try { return JSON.parse(LS.getItem('o3-props-values') || '{}') || {}; } catch (e) { return {}; } })(), _savedAt: new Date().toISOString() };
      var cfg; try { cfg = HmTheme.getAdminConfig() || {}; } catch (e) { cfg = {}; }
      var next = {}; Object.keys(cfg).forEach(function (k) { next[k] = cfg[k]; }); next.moduleMaster = blob;
      try { HmTheme.saveAdminConfig(next, function (ok) { toast(ok ? ('Đã áp dụng + lưu preset "' + p.preset_key + '" cho tổ chức.') : 'Áp dụng runtime OK; lưu org thất bại.', ok ? 'success' : 'warning'); if (cb) { cb(ok); } }); return true; } catch (e) { return false; }
    }
    toast('Đã áp dụng preset "' + p.preset_key + '" (runtime). Backend store chưa sẵn.', 'warning');
    if (cb) { cb(false); }
    return false;
  }

  /* ── DTCG export ─────────────────────────────────────────────────────── */
  function dtcgExport(preset) {
    var p = preset || {};
    var ov = (p.overrides && typeof p.overrides === 'object') ? p.overrides : {};
    var out = {
      '$schema': 'https://design-tokens.community/schema.json',
      '$description': 'HESEM theme preset: ' + (p.display_name_vi || p.preset_key || 'unnamed'),
      'brand': { '$value': p.brand || '#0c4a6e', '$type': 'color', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': 'brand.primary' } },
      'space': {
        'master': { '$value': (p.density_px != null ? p.density_px : 8) + 'px', '$type': 'dimension', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': 'space.master' } },
        'section': { '$value': (ov['space.section'] || 12) + 'px', '$type': 'dimension', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': 'space.section' } }
      },
      'radius': {
        'master': { '$value': (p.radius_inner_px != null ? p.radius_inner_px : 4) + 'px', '$type': 'dimension', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': 'radius.master' } },
        'card': { '$value': (p.radius_outer_px != null ? p.radius_outer_px : 8) + 'px', '$type': 'dimension', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': 'radius.card' } },
        'pill': { '$value': '999px', '$type': 'dimension', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': 'radius.pill' } }
      },
      'control': {
        'height': {
          'standard': { '$value': (p.control_h_px != null ? p.control_h_px : 32) + 'px', '$type': 'dimension', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': 'control.height.standard' } }
        }
      },
      'motion': {
        'fast': { '$value': (ov['motion.fast'] != null ? ov['motion.fast'] : 120) + 'ms', '$type': 'duration' },
        'base': { '$value': (ov['motion.base'] != null ? ov['motion.base'] : 200) + 'ms', '$type': 'duration' },
        'slow': { '$value': (ov['motion.slow'] != null ? ov['motion.slow'] : 320) + 'ms', '$type': 'duration' }
      }
    };
    /* Semantic color overrides */
    var colorKeys = ['status.success', 'status.warning', 'status.danger', 'status.info', 'status.neutral', 'surface.card', 'surface.muted', 'text.default', 'text.strong', 'text.muted'];
    var colorGroup = {};
    colorKeys.forEach(function (k) { if (ov[k]) { var parts = k.split('.'); var node = colorGroup; for (var i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; } node[parts[parts.length - 1]] = { '$value': ov[k], '$type': 'color', '$extensions': { 'hesem.tier': 'T2-semantic', 'hesem.key': k } }; } });
    if (Object.keys(colorGroup).length) { Object.keys(colorGroup).forEach(function (k) { out[k] = (out[k] || {}); Object.keys(colorGroup[k]).forEach(function (kk) { out[k][kk] = colorGroup[k][kk]; }); }); }
    return out;
  }

  /* ── Validate preset ─────────────────────────────────────────────────── */
  function validatePreset(p) {
    var issues = [];
    var ov = (p.overrides && typeof p.overrides === 'object') ? p.overrides : {};
    /* 1. Required fields */
    if (!p.preset_key) { issues.push({ level: 'fail', msg: 'preset_key bắt buộc (chữ thường + gạch ngang).' }); }
    if (!p.brand || !/^#[0-9a-fA-F]{6}$/.test(p.brand)) { issues.push({ level: 'fail', msg: 'brand phải là hex 6 ký tự hợp lệ (ví dụ #0c4a6e).' }); }
    /* 2. SSOT ranges */
    if (p.density_px != null && (p.density_px < 2 || p.density_px > 24)) { issues.push({ level: 'warn', msg: 'density_px nằm ngoài khoảng SSOT (2–24 px).' }); }
    if (p.radius_inner_px != null && (p.radius_inner_px < 0 || p.radius_inner_px > 20)) { issues.push({ level: 'warn', msg: 'radius_inner_px nằm ngoài khoảng (0–20 px).' }); }
    if (p.radius_outer_px != null && (p.radius_outer_px < p.radius_inner_px || p.radius_outer_px > 32)) { issues.push({ level: 'warn', msg: 'radius_outer_px phải ≥ radius_inner_px và ≤ 32.' }); }
    if (p.control_h_px != null && p.control_h_px !== 32) { issues.push({ level: 'warn', msg: 'control_h_px khác SSOT 32px — cần simulation evidence.' }); }
    /* 3. No raw hex literals in semantic override keys (only color keys allowed) */
    var nonColorKeys = Object.keys(ov).filter(function (k) { return !/^(status\.|surface\.|text\.|border\.|focus\.)/.test(k) && /^#[0-9a-fA-F]{6}$/.test(ov[k]); });
    if (nonColorKeys.length) { issues.push({ level: 'warn', msg: 'T2 semantic overrides với giá trị hex literal ngoài color slots: ' + nonColorKeys.join(', ') }); }
    /* 4. WCAG contrast check for brand on white */
    if (p.brand && window.LegoTheme && typeof window.LegoTheme.contrast === 'function') {
      var ratio = window.LegoTheme.contrast(p.brand, '#ffffff');
      if (ratio < 3) { issues.push({ level: 'fail', msg: 'Brand trên nền trắng: WCAG ratio ' + ratio + ':1 < 3:1 (UI minimum).' }); }
      else if (ratio < 4.5) { issues.push({ level: 'warn', msg: 'Brand trên nền trắng: WCAG ratio ' + ratio + ':1 — pass cho UI nhưng thấp hơn AA text (4.5:1).' }); }
    }
    /* 5. Token key taxonomy check for overrides */
    Object.keys(ov).forEach(function (k) {
      if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9\-]*)*$/.test(k)) { issues.push({ level: 'warn', msg: 'Override key "' + k + '" không theo namespace.object.modifier taxonomy.' }); }
    });
    var fails = issues.filter(function (i) { return i.level === 'fail'; });
    var warns = issues.filter(function (i) { return i.level === 'warn'; });
    return { ok: !fails.length, level: fails.length ? 'fail' : (warns.length ? 'warn' : 'pass'), issues: issues };
  }

  /* ── CSS helpers ─────────────────────────────────────────────────────── */
  var sp = 'var(--o3-space,8px)', sc = 'var(--o3-space-section,12px)', rd = 'var(--o3-radius,4px)',
      rc = 'var(--o3-radius-card,8px)', ch = 'var(--o3-control-h-standard,32px)',
      sf = 'var(--o3-surface-card,#fff)', sfm = 'var(--o3-surface-muted,#f1f5f9)',
      bsub = 'var(--o3-border-subtle,#e5e7eb)', bdef = 'var(--o3-border-default,#cbd5e1)',
      ts = 'var(--o3-text-strong,#0f172a)', td = 'var(--o3-text-default,#475569)', tm = 'var(--o3-text-muted,#94a3b8)',
      br = 'var(--o3-brand,#0c4a6e)', brs = 'var(--o3-brand-soft,#e0f2fe)',
      ok = 'var(--o3-success,#15803d)', oks = 'var(--o3-success-soft,#dcfce7)',
      wn = 'var(--o3-warning,#b45309)', wns = 'var(--o3-warning-soft,#fef3c7)',
      dg = 'var(--o3-danger,#b91c1c)', dgs = 'var(--o3-danger-soft,#fee2e2)',
      pill = 'var(--o3-radius-pill,999px)';

  function ensureStyle() {
    var id = 'p2-presets-css'; if (document.getElementById(id)) { return; }
    var css = [
      '.p2-grp{border:1px solid ' + bsub + ';border-radius:' + rc + ';margin-bottom:' + sp + ';overflow:hidden}',
      '.p2-grp summary{display:flex;align-items:center;gap:' + sp + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';cursor:pointer;font-size:12px;font-weight:700;color:' + td + ';list-style:none;user-select:none}',
      '.p2-grp summary::-webkit-details-marker{display:none}',
      '.p2-grp summary::before{content:"▸";font-size:10px;transition:transform var(--o3-motion-fast,120ms)}',
      '.p2-grp[open] summary::before{transform:rotate(90deg)}',
      '.p2-grp-body{padding:' + sc + ';background:' + sf + '}',
      '.p2-row{display:grid;grid-template-columns:160px 1fr;align-items:center;gap:' + sc + ';padding:' + sp + ' 0;border-bottom:1px solid ' + bsub + '}',
      '.p2-row:last-child{border-bottom:0}',
      '.p2-lbl{font-size:11px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:' + tm + '}',
      '.p2-hint{font-size:10px;color:' + tm + ';margin-top:2px;line-height:1.4}',
      '.p2-in{height:' + ch + ';box-sizing:border-box;border:1px solid ' + bdef + ';border-radius:' + rd + ';padding:0 ' + sc + ';font:inherit;font-size:12px;background:' + sf + ';color:' + ts + '}',
      '.p2-in[type=color]{width:44px;padding:2px 4px;cursor:pointer}',
      '.p2-in[type=range]{border:none;background:none;padding:0;width:160px}',
      '.p2-in[type=number]{width:72px}',
      '.p2-ramp{display:flex;gap:' + sp + ';align-items:center;flex-wrap:wrap;margin-top:' + sp + '}',
      '.p2-swatch{width:28px;height:28px;border-radius:' + rd + ';border:1px solid ' + bsub + ';flex-shrink:0}',
      '.p2-swatch-lbl{font-size:9px;text-align:center;color:' + tm + ';margin-top:2px;width:28px}',
      '.p2-swatch-grp{display:flex;flex-direction:column;align-items:center}',
      '.p2-validate{display:inline-flex;align-items:center;gap:' + sp + ';font-size:11px;font-weight:600;padding:4px ' + sc + ';border-radius:' + pill + '}',
      '.p2-validate--pass{background:' + oks + ';color:' + ok + '}',
      '.p2-validate--warn{background:' + wns + ';color:' + wn + '}',
      '.p2-validate--fail{background:' + dgs + ';color:' + dg + '}',
      '.p2-issue{font-size:11px;line-height:1.4;margin:2px 0}',
      '.p2-issue--fail{color:' + dg + '}',
      '.p2-issue--warn{color:' + wn + '}',
      '.p2-seg{display:inline-flex;border:1px solid ' + bdef + ';border-radius:' + rd + ';overflow:hidden}',
      '.p2-seg-btn{height:' + ch + ';padding:0 ' + sc + ';border:0;font:inherit;font-size:12px;cursor:pointer;background:' + sf + ';color:' + td + '}',
      '.p2-seg-btn.is-on{background:' + br + ';color:#fff;font-weight:600}'
    ].join('');
    var el = document.createElement('style'); el.id = id; el.textContent = css; document.head.appendChild(el);
  }

  /* ── Render helpers ──────────────────────────────────────────────────── */
  function row(label, control, hint) {
    return '<div class="p2-row"><div><div class="p2-lbl">' + esc(label) + '</div>' + (hint ? '<div class="p2-hint">' + esc(hint) + '</div>' : '') + '</div><div>' + control + '</div></div>';
  }
  function grp(title, id, body, open) {
    return '<details class="p2-grp"' + (open !== false ? ' open' : '') + '><summary data-p2g="' + esc(id) + '">' + esc(title) + '</summary><div class="p2-grp-body">' + body + '</div></details>';
  }
  function nin(id, val, type, attrs) {
    return '<input class="p2-in" id="' + esc(id) + '" type="' + (type || 'text') + '" value="' + esc(val) + '"' + (attrs || '') + ' data-p2f="' + esc(id) + '">';
  }
  function seg(name, opts, current) {
    return '<div class="p2-seg">' + opts.map(function (o) { return '<button type="button" class="p2-seg-btn' + (o.v === current ? ' is-on' : '') + '" data-p2s="' + esc(name) + '" data-p2v="' + esc(o.v) + '">' + esc(o.l) + '</button>'; }).join('') + '</div>';
  }
  function swatches(map) {
    return '<div class="p2-ramp">' + map.map(function (s) { return '<div class="p2-swatch-grp"><div class="p2-swatch" style="background:' + esc(s.color) + '"></div><div class="p2-swatch-lbl">' + esc(s.label) + '</div></div>'; }).join('') + '</div>';
  }
  function colorInput(id, val) {
    return '<div style="display:inline-flex;align-items:center;gap:' + sp + '">' + nin(id, val, 'color') + '<code style="font-size:11px;color:' + tm + '" id="' + esc(id) + '-hex">' + esc(val || '') + '</code></div>';
  }

  /* ── Rich grouped preset editor ──────────────────────────────────────── */
  function renderRichEditor(draft, vr) {
    var d = draft || {};
    var ov = (d.overrides && typeof d.overrides === 'object') ? d.overrides : {};
    var ramp = d.brand ? deriveRamp(d.brand) : null;
    var isBuiltin = !!d.is_builtin;
    /* Group 1 — Brand & Color (T2 semantic brand + OKLCH ramp preview) */
    var g1 = row('Brand seed', colorInput('p2-brand', d.brand || '#0c4a6e'), 'T2: brand.primary → OKLCH hover/soft/strong auto-derived') +
      (ramp ? swatches([{ color: ramp.base, label: 'base' }, { color: ramp.hover, label: 'hover' }, { color: ramp.soft, label: 'soft' }, { color: ramp.strong, label: 'strong' }, { color: ramp.on, label: 'on' }]) : '') +
      row('Success', colorInput('p2-ov-status.success', ov['status.success'] || ''), 'T2: status.success — override (blank = from token catalog)') +
      row('Warning', colorInput('p2-ov-status.warning', ov['status.warning'] || ''), 'T2: status.warning') +
      row('Danger', colorInput('p2-ov-status.danger', ov['status.danger'] || ''), 'T2: status.danger') +
      row('Info', colorInput('p2-ov-status.info', ov['status.info'] || ''), 'T2: status.info') +
      row('Neutral', colorInput('p2-ov-status.neutral', ov['status.neutral'] || ''), 'T2: status.neutral');
    /* Group 2 — Surfaces */
    var g2 = row('Surface card', colorInput('p2-ov-surface.card', ov['surface.card'] || ''), 'T2: surface.card — panel/card background') +
      row('Surface muted', colorInput('p2-ov-surface.muted', ov['surface.muted'] || ''), 'T2: surface.muted — sidebar/alternate row');
    /* Group 3 — Text */
    var g3 = row('Text strong', colorInput('p2-ov-text.strong', ov['text.strong'] || ''), 'T2: text.strong — headings') +
      row('Text default', colorInput('p2-ov-text.default', ov['text.default'] || ''), 'T2: text.default — body') +
      row('Text muted', colorInput('p2-ov-text.muted', ov['text.muted'] || ''), 'T2: text.muted — captions, placeholders');
    /* Group 4 — Density */
    var g4 = row('Khe hở chính (gap)', '<div style="display:flex;align-items:center;gap:' + sc + '">' + nin('p2-density', d.density_px != null ? d.density_px : 8, 'range', 'min="2" max="24" step="1"') + '<span style="font-size:11px;color:' + tm + ';min-width:28px" id="p2-density-val">' + (d.density_px != null ? d.density_px : 8) + 'px</span></div>', 'T2: space.master (8px SSOT default)') +
      row('Khe phân đoạn', '<div style="display:flex;align-items:center;gap:' + sc + '">' + nin('p2-ov-space.section', ov['space.section'] != null ? ov['space.section'] : 12, 'range', 'min="4" max="32" step="1"') + '<span style="font-size:11px;color:' + tm + ';min-width:28px" id="p2-ov-space.section-val">' + (ov['space.section'] != null ? ov['space.section'] : 12) + 'px</span></div>', 'T2: space.section (12px SSOT default)') +
      row('Frame', nin('p2-frame', d.frame_px != null ? d.frame_px : 8, 'number', 'min="0" max="32"') + ' <span style="font-size:11px;color:' + tm + '">px</span>', 'T2: frame inset padding for module canvas');
    /* Group 5 — Radius */
    var g5 = row('Bo góc cấp 1 (card)', nin('p2-radius-outer', d.radius_outer_px != null ? d.radius_outer_px : 8, 'number', 'min="0" max="32"') + ' <span style="font-size:11px;color:' + tm + '">px · radius.card</span>', 'Container / panel radius (cấp 1 = 8px SSOT)') +
      row('Bo góc cấp 2 (control)', nin('p2-radius-inner', d.radius_inner_px != null ? d.radius_inner_px : 4, 'number', 'min="0" max="20"') + ' <span style="font-size:11px;color:' + tm + '">px · radius.master</span>', 'Button / input / chip radius (cấp 2 = 4px SSOT)');
    /* Group 6 — Control */
    var g6 = row('Chiều cao control', seg('p2-ctrl-h', [{ v: '28', l: '28px (Notion)' }, { v: '32', l: '32px (SSOT ✓)' }, { v: '36', l: '36px (Cozy)' }, { v: '40', l: '40px (Comfortable)' }], String(d.control_h_px != null ? d.control_h_px : 32)), 'T2: control.height.standard — SSOT default 32px. Other values need simulation evidence.');
    /* Group 7 — Typography (within-preset overrides; org defaults in Settings) */
    var g7 = row('Heading weight', nin('p2-ov-type.heading-weight', ov['type.heading-weight'] || '700', 'number', 'min="400" max="900" step="100"'), 'T2: type.heading-weight — weight for H1–H3') +
      row('Tỉ lệ type scale', nin('p2-ov-type.scale-ratio', ov['type.scale-ratio'] || '1.0', 'number', 'min="1.0" max="1.4" step="0.05"'), 'T2: type.scale-ratio — XS→3XL ramp multiplier (1.0 = SSOT)');
    /* Group 8 — Elevation */
    var elevOpts = [{ v: 'none', l: 'None' }, { v: 'card', l: 'Card' }, { v: 'modal', l: 'Modal' }];
    var g8 = row('Shadow set', seg('p2-elevation', elevOpts, ov['elevation.preset'] || 'card'), 'T2: elevation.preset — shadow intensity for cards/panels');
    /* Group 9 — Motion */
    var g9 = row('Fast duration', nin('p2-ov-motion.fast', ov['motion.fast'] != null ? ov['motion.fast'] : 120, 'number', 'min="50" max="400"') + ' <span style="font-size:11px;color:' + tm + '">ms</span>', 'T2: motion.fast (M3 default 120ms)') +
      row('Base duration', nin('p2-ov-motion.base', ov['motion.base'] != null ? ov['motion.base'] : 200, 'number', 'min="80" max="800"') + ' <span style="font-size:11px;color:' + tm + '">ms</span>', 'T2: motion.base (M3 default 200ms)') +
      row('Slow duration', nin('p2-ov-motion.slow', ov['motion.slow'] != null ? ov['motion.slow'] : 320, 'number', 'min="100" max="1200"') + ' <span style="font-size:11px;color:' + tm + '">ms</span>', 'T2: motion.slow (M3 default 320ms)');
    /* Validation result */
    var vrHtml = '';
    if (vr) {
      var badge = '<span class="p2-validate p2-validate--' + esc(vr.level) + '">' + (vr.level === 'pass' ? '✓ Pass' : (vr.level === 'warn' ? '⚠ Warn' : '✗ Fail')) + '</span>';
      var issueList = vr.issues.length ? vr.issues.map(function (i) { return '<div class="p2-issue p2-issue--' + esc(i.level) + '">• ' + esc(i.msg) + '</div>'; }).join('') : '<div style="font-size:11px;color:' + ok + '">Tất cả kiểm tra đều qua.</div>';
      vrHtml = '<div style="margin:' + sc + ' 0;padding:' + sc + ';border:1px solid ' + bsub + ';border-radius:' + rc + ';background:' + sfm + '">' + badge + '<div style="margin-top:' + sp + '">' + issueList + '</div></div>';
    }
    return '<div id="p2-rich-editor">' +
      '<div class="' + ROOT + '__cat" style="margin-bottom:' + sp + '">✎ Chỉnh sửa preset · <b>' + esc(d.preset_key) + '</b>' + (isBuiltin ? ' <span style="font-size:10px;color:' + br + ';font-weight:700"> · BUILTIN (read-only)</span>' : '') + '</div>' +
      (isBuiltin ? '<div style="font-size:11px;color:' + wn + ';background:' + wns + ';padding:' + sp + ' ' + sc + ';border-radius:' + rd + ';margin-bottom:' + sc + '">Builtin preset chỉ đọc — clone trước để chỉnh sửa.</div>' : '') +
      (!isBuiltin ? ('<div class="p2-row" style="grid-template-columns:160px 1fr;border-bottom:1px solid ' + bsub + ';padding-bottom:' + sc + ';margin-bottom:' + sc + '">' +
        '<div class="p2-lbl">Tên hiển thị (VN)</div>' +
        nin('p2-name-vi', d.display_name_vi || '', 'text', 'style="min-width:240px"') + '</div>') : '') +
      grp('🎨 Brand & màu sắc (T2 semantic)', 'color', g1, true) +
      grp('🪟 Bề mặt (surfaces)', 'surfaces', g2, false) +
      grp('🔤 Chữ (text roles)', 'text', g3, false) +
      grp('📐 Mật độ (density)', 'density', g4, true) +
      grp('🔵 Bo góc (radius)', 'radius', g5, true) +
      grp('📏 Cao control', 'control', g6, true) +
      grp('🔠 Typography (preset overrides)', 'typography', g7, false) +
      grp('🌒 Elevation/Shadow', 'elevation', g8, false) +
      grp('⚡ Chuyển động (motion)', 'motion', g9, false) +
      vrHtml +
      (!isBuiltin ? (
        '<div style="display:flex;gap:' + sp + ';align-items:center;flex-wrap:wrap;margin-top:' + sc + '">' +
        '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" data-ms="p2-save-preset">' + (_ps.saving ? 'Đang lưu…' : '💾 Lưu preset') + '</button>' +
        '<button class="' + ROOT + '__btn" data-ms="p2-validate">🔍 Validate</button>' +
        '<button class="' + ROOT + '__btn" data-ms="p2-dtcg-export">📤 Xuất DTCG</button>' +
        '<button class="' + ROOT + '__btn" data-ms="p2-cancel-edit">Huỷ</button>' +
        '</div>'
      ) : (
        '<div style="display:flex;gap:' + sp + ';margin-top:' + sc + '">' +
        '<button class="' + ROOT + '__btn" data-ms="p2-dtcg-export">📤 Xuất DTCG</button>' +
        '<button class="' + ROOT + '__btn" data-ms="p2-cancel-edit">Đóng</button>' +
        '</div>'
      )) +
      '</div>';
  }

  /* ── Preset list (Presets surface body) ──────────────────────────────── */
  function renderPresets() {
    var list = _ps.list;
    var rows;
    if (list === null) { rows = '<tr><td colspan="5" class="' + ROOT + '__hint">Đang tải…</td></tr>'; }
    else if (!list.length) { rows = '<tr><td colspan="5" class="' + ROOT + '__hint">Chưa có preset. Bấm "＋ Tạo preset".</td></tr>'; }
    else {
      rows = list.map(function (p) {
        var brand = p.brand || '#0c4a6e';
        var isBuiltin = !!p.is_builtin;
        return '<tr>' +
          '<td><span class="' + ROOT + '__sw" style="background:' + esc(brand) + '"></span>' +
          '<b>' + esc(p.display_name_vi || p.preset_key) + '</b><br>' +
          '<small style="color:' + tm + '">' + esc(p.preset_key) + '</small></td>' +
          '<td><code style="font-size:11px">' + esc(brand) + '</code></td>' +
          '<td style="font-size:11px">' + esc(p.density_px != null ? p.density_px : '—') + 'px / ' + esc(p.control_h_px != null ? p.control_h_px : '—') + 'px</td>' +
          '<td>' + (isBuiltin ? '<span class="' + ROOT + '__bd ' + ROOT + '__bd--l4">builtin</span>' : '<span class="' + ROOT + '__st ' + ROOT + '__st--active">' + esc(p.status || 'published') + '</span>') + '</td>' +
          '<td style="white-space:nowrap">' +
          '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm ' + ROOT + '__btn--pri" data-ms="p2-apply" data-key="' + esc(p.preset_key) + '">▶ Áp dụng</button> ' +
          '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="p2-edit" data-key="' + esc(p.preset_key) + '">✎ Sửa</button> ' +
          '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="p2-clone" data-key="' + esc(p.preset_key) + '">⎘ Clone</button>' +
          (isBuiltin ? '' : ' <button class="' + ROOT + '__btn ' + ROOT + '__btn--sm ' + ROOT + '__btn--dgr" data-ms="p2-delete" data-key="' + esc(p.preset_key) + '">Xoá</button>') +
          '</td></tr>';
      }).join('');
    }
    var editorHtml = (_ps.editing && _ps.draft)
      ? renderRichEditor(_ps.draft, _ps.validateResult)
      : '';
    return '<div class="' + ROOT + '__pad">' +
      '<div class="' + ROOT + '__toolbar">' +
      '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" data-ms="p2-new">＋ Tạo preset</button>' +
      '<button class="' + ROOT + '__btn" data-ms="p2-refresh">↻ Làm mới</button>' +
      '<span style="font-size:11px;color:' + tm + '">Preset = bộ override T2 semantic token. "Áp dụng" ghi org-wide qua authority (SSOT).</span>' +
      '</div>' +
      '<table class="' + ROOT + '__tbl"><thead><tr>' +
      '<th>Preset</th><th>Brand</th><th>Gap/CtrlH</th><th>Trạng thái</th><th>Thao tác</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div id="p2-editor-slot" style="margin-top:' + sc + '">' + editorHtml + '</div>' +
      '</div>';
  }

  /* ── Settings surface ────────────────────────────────────────────────── */
  function readOrgSettings() {
    var t; try { t = JSON.parse(localStorage.getItem('o3-theme') || '{}') || {}; } catch (e) { t = {}; }
    return {
      'color-mode': t['color-mode'] || 'light',
      'font-family': t['font-family'] || 'Inter, -apple-system, "SF Pro Text", system-ui, sans-serif',
      'font-base': t['font-base'] || 13,
      'motion': t['motion'] || 'standard'
    };
  }
  function renderSettings() {
    var s = _ss.settings || readOrgSettings();
    var fontOpts = [
      'Inter, -apple-system, "SF Pro Text", system-ui, sans-serif',
      '"IBM Plex Sans", -apple-system, sans-serif',
      '"Noto Sans", -apple-system, sans-serif',
      'system-ui, -apple-system, "Segoe UI", sans-serif',
      '"SF Pro Text", -apple-system, system-ui, sans-serif'
    ];
    var fontSelect = '<select class="p2-in" id="p2-s-font" data-p2s-key="font-family" style="min-width:280px">' +
      fontOpts.map(function (f) { var first = f.split(',')[0].replace(/['"]/g, ''); return '<option value="' + esc(f) + '"' + (f === s['font-family'] ? ' selected' : '') + '>' + esc(first) + '</option>'; }).join('') +
      '</select>';
    return '<div class="' + ROOT + '__pad">' +
      '<div class="' + ROOT + '__cat" style="margin-bottom:' + sc + '">⚙️ Cài đặt tổ chức (org-level policy)</div>' +
      '<div style="font-size:11px;color:' + tm + ';margin-bottom:' + sc + ';line-height:1.5">' +
      'Cài đặt ở đây áp dụng cho TOÀN bộ tổ chức và KHÔNG ghi đè vào preset. Chỉ: Chế độ màu · Phông chữ mặc định · Cường độ chuyển động.' +
      '</div>' +
      grp('☾ Chế độ màu', 's-mode',
        row('Chế độ màu',
          seg('color-mode', [{ v: 'light', l: '☀ Light' }, { v: 'dark', l: '☾ Dark' }, { v: 'auto', l: '◐ Auto' }], s['color-mode']),
          'T2: org policy — Auto theo system preference (prefers-color-scheme).'), true) +
      grp('🔠 Phông chữ mặc định', 's-font',
        row('Font family', fontSelect, 'Org default — preset có thể override.') +
        row('Cỡ chữ cơ sở', '<input class="p2-in" id="p2-s-fontbase" type="number" min="11" max="16" step="1" value="' + esc(s['font-base']) + '" data-p2s-key="font-base"> <span style="font-size:11px;color:' + tm + '">px (Vercel/Linear chuẩn: 13px)</span>', 'T2: font.size.md base'), true) +
      grp('⚡ Cường độ chuyển động', 's-motion',
        row('Motion intensity',
          seg('motion', [{ v: 'subtle', l: 'Subtle 0.7×' }, { v: 'standard', l: 'Standard 1×' }, { v: 'expressive', l: 'Expressive 1.4×' }], s['motion']),
          'Multiplies Fast/Base/Slow durations. Org default — Linear khuyến nghị Subtle cho ops.'), true) +
      '<div style="display:flex;gap:' + sp + ';margin-top:' + sc + ';align-items:center">' +
      '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" data-ms="p2-settings-save">' + (_ss.saving ? 'Đang lưu…' : '💾 Lưu cài đặt cho tổ chức') + '</button>' +
      '<button class="' + ROOT + '__btn" data-ms="p2-settings-reset">↺ Reset về mặc định</button>' +
      '</div>' +
      '</div>';
  }

  /* ── onMount: load data + wire live preview ──────────────────────────── */
  function onPresetsMount(host) {
    ensureStyle();
    if (_ps.list === null) { loadPresets(); }
    wirePresetLivePreview(host);
    /* If an editor is open, re-wire its inputs */
    if (_ps.editing && _ps.draft) { wirePresetLivePreview(host); }
  }
  function onSettingsMount() {
    ensureStyle();
    _ss.settings = readOrgSettings();
  }

  /* Live preview: any change to the rich editor inputs immediately re-skins
   * the app (via LegoTheme + _admTheme.apply). Does NOT persist. */
  function wirePresetLivePreview(host) {
    if (!host) { return; }
    /* range sliders: update value display + live skin */
    host.querySelectorAll('.p2-in[type="range"]').forEach(function (inp) {
      if (inp.getAttribute('data-p2-wired') === '1') { return; }
      inp.setAttribute('data-p2-wired', '1');
      inp.addEventListener('input', function () {
        var valSpan = document.getElementById(inp.id + '-val');
        if (valSpan) { valSpan.textContent = inp.value + 'px'; }
        applyDraftLivePreview(host);
      });
    });
    /* color inputs: update hex display + live skin */
    host.querySelectorAll('.p2-in[type="color"]').forEach(function (inp) {
      if (inp.getAttribute('data-p2-wired') === '1') { return; }
      inp.setAttribute('data-p2-wired', '1');
      inp.addEventListener('input', function () {
        var hexSpan = document.getElementById(inp.id + '-hex');
        if (hexSpan) { hexSpan.textContent = inp.value; }
        applyDraftLivePreview(host);
      });
    });
    /* segmented buttons for control-height and elevation */
    host.querySelectorAll('[data-p2s]').forEach(function (btn) {
      if (btn.getAttribute('data-p2-wired') === '1') { return; }
      btn.setAttribute('data-p2-wired', '1');
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-p2s'), val = btn.getAttribute('data-p2v');
        /* update visual active state */
        var seg = btn.closest('.p2-seg'); if (seg) { seg.querySelectorAll('[data-p2s="' + name + '"]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-p2v') === val); }); }
        applyDraftLivePreview(host);
      });
    });
    /* Settings segmented buttons */
    host.querySelectorAll('[data-p2s-key]').forEach(function (el) {
      if (el.getAttribute('data-p2-wired') === '1') { return; }
      el.setAttribute('data-p2-wired', '1');
      el.addEventListener('change', function () { applySettingsLivePreview(host); });
    });
  }

  function collectDraft(host) {
    if (!host || !_ps.draft) { return; }
    var d = _ps.draft;
    function gv(id) { var el = host.querySelector('#' + id); return el ? el.value : null; }
    if (gv('p2-name-vi') !== null) { d.display_name_vi = gv('p2-name-vi'); }
    if (gv('p2-brand') !== null) { d.brand = gv('p2-brand'); }
    if (gv('p2-density') !== null) { d.density_px = parseInt(gv('p2-density'), 10) || 8; }
    if (gv('p2-frame') !== null) { d.frame_px = parseInt(gv('p2-frame'), 10) || 8; }
    if (gv('p2-radius-outer') !== null) { d.radius_outer_px = parseInt(gv('p2-radius-outer'), 10) || 8; }
    if (gv('p2-radius-inner') !== null) { d.radius_inner_px = parseInt(gv('p2-radius-inner'), 10) || 4; }
    /* control height from segment */
    var chSeg = host.querySelector('[data-p2s="p2-ctrl-h"].is-on'); if (chSeg) { d.control_h_px = parseInt(chSeg.getAttribute('data-p2v'), 10) || 32; }
    /* overrides */
    var ov = d.overrides || {}; d.overrides = ov;
    var ovKeys = ['status.success', 'status.warning', 'status.danger', 'status.info', 'status.neutral', 'surface.card', 'surface.muted', 'text.strong', 'text.default', 'text.muted', 'space.section', 'type.heading-weight', 'type.scale-ratio', 'motion.fast', 'motion.base', 'motion.slow'];
    ovKeys.forEach(function (k) { var el = host.querySelector('#p2-ov-' + k.replace(/\./g, '\\.')); if (el) { var v = el.value; if (v === '' || v === null) { delete ov[k]; } else { ov[k] = (el.type === 'number' || el.type === 'range') ? (parseFloat(v) || 0) : v; } } });
    /* elevation segment */
    var elSeg = host.querySelector('[data-p2s="p2-elevation"].is-on'); if (elSeg) { ov['elevation.preset'] = elSeg.getAttribute('data-p2v'); }
  }

  function applyDraftLivePreview(host) {
    if (_previewPaused) { return; }
    collectDraft(host);
    var d = _ps.draft; if (!d) { return; }
    var LT = window.LegoTheme;
    if (LT) {
      try { if (d.brand && LT.applyBrand) { LT.applyBrand(d.brand, { scope: document.documentElement }); } } catch (e) { /* noop */ }
      try { if (d.density_px != null && LT.setDensity) { LT.setDensity(d.density_px, { scope: document.documentElement }); } } catch (e) { /* noop */ }
      try { if (d.radius_inner_px != null && LT.setRadius) { LT.setRadius(d.radius_inner_px, { scope: document.documentElement }); } } catch (e) { /* noop */ }
      try { if (d.radius_outer_px != null && LT.setCardRadius) { LT.setCardRadius(d.radius_outer_px, { scope: document.documentElement }); } } catch (e) { /* noop */ }
      try { if (d.control_h_px != null && LT.setControlHeight) { LT.setControlHeight(d.control_h_px, { scope: document.documentElement }); } } catch (e) { /* noop */ }
    }
    /* Update OKLCH ramp preview */
    if (d.brand) {
      var ramp = deriveRamp(d.brand);
      if (ramp) {
        var slot = host.querySelector('.p2-ramp'); if (slot) { slot.querySelectorAll('.p2-swatch').forEach(function (sw, i) { var colors = [ramp.base, ramp.hover, ramp.soft, ramp.strong, ramp.on]; if (colors[i]) { sw.style.background = colors[i]; } }); } }
    }
  }
  function applySettingsLivePreview(host) {
    if (!host) { return; }
    var mode = host.querySelector('#p2-s-color-mode-seg'); /* handled via seg click */
    var font = host.querySelector('#p2-s-font'); if (font) { document.documentElement.style.setProperty('--o3-font-sans', font.value); document.body && (document.body.style.fontFamily = font.value); }
    var fb = host.querySelector('#p2-s-fontbase'); if (fb) { var fbv = parseInt(fb.value, 10) || 13; document.documentElement.style.setProperty('--o3-font-size-md', fbv + 'px'); }
  }

  /* ── Actions ─────────────────────────────────────────────────────────── */
  function loadPresets() {
    _ps.list = null; repaintBody();
    getJson('graphics_theme_preset_list').then(function (j) {
      _ps.list = (j && (j.presets || j.data)) || []; repaintBody();
    }).catch(function () { _ps.list = []; repaintBody(); });
  }
  function doApply(key) {
    var p = (_ps.list || []).filter(function (x) { return x.preset_key === key; })[0];
    if (!p) { toast('Không tìm thấy preset "' + key + '".', 'error'); return; }
    persistPresetAsOrgTheme(p, function (ok) { if (!ok) { toast('Runtime áp dụng nhưng lưu org thất bại.', 'warning'); } });
  }
  function doEdit(key) {
    var p = (_ps.list || []).filter(function (x) { return x.preset_key === key; })[0];
    if (!p) { toast('Không tìm thấy preset.', 'error'); return; }
    _ps.editing = key; _ps.draft = JSON.parse(JSON.stringify(p)); if (!_ps.draft.overrides || typeof _ps.draft.overrides !== 'object') { _ps.draft.overrides = {}; }
    _ps.validateResult = null;
    repaintBody();
    setTimeout(function () { var slot = document.getElementById('p2-editor-slot'); if (slot) { slot.scrollIntoView({ block: 'nearest' }); } var host = api() && api().host(); if (host) { wirePresetLivePreview(host); } }, 50);
  }
  function doNew() {
    _ps.editing = '__new__';
    _ps.draft = { preset_key: '', display_name_vi: '', display_name_en: '', brand: '#0c4a6e', density_px: 8, radius_outer_px: 8, radius_inner_px: 4, control_h_px: 32, frame_px: 8, is_builtin: false, status: 'draft', overrides: {} };
    _ps.validateResult = null;
    repaintBody();
    setTimeout(function () { var slot = document.getElementById('p2-editor-slot'); if (slot) { slot.scrollIntoView({ block: 'nearest' }); } var host = api() && api().host(); if (host) { wirePresetLivePreview(host); } }, 50);
  }
  function doClone(key) {
    var src = (_ps.list || []).filter(function (p) { return p.preset_key === key; })[0];
    if (!src) { toast('Không tìm thấy preset.', 'error'); return; }
    var nk = window.prompt('Mã preset mới (clone từ ' + key + '):', key + '-copy');
    if (!nk) { return; }
    nk = String(nk).toLowerCase().replace(/[^a-z0-9\-]/g, '');
    if (!nk) { toast('Mã preset không hợp lệ.', 'error'); return; }
    post('graphics_theme_preset_save', { preset: Object.assign({}, src, { preset_key: nk, is_builtin: false, is_default: false, display_name_vi: (src.display_name_vi || key) + ' (copy)', preset_id: undefined }) }).then(function (r) {
      if (r && r.ok !== false) { toast('Đã clone preset "' + nk + '".', 'success'); loadPresets(); } else { toast('Clone thất bại.', 'error'); }
    }).catch(function (e) { toast('Clone lỗi: ' + e, 'error'); });
  }
  function doDelete(key) {
    if (!window.confirm('Xoá preset "' + key + '"? Không thể hoàn tác.')) { return; }
    post('graphics_theme_preset_delete', { preset_key: key }).then(function (r) {
      toast(r && r.ok !== false ? 'Đã xoá preset "' + key + '".' : 'Xoá thất bại.', r && r.ok !== false ? 'success' : 'error');
      if (_ps.editing === key) { _ps.editing = null; _ps.draft = null; }
      loadPresets();
    }).catch(function (e) { toast('Xoá lỗi: ' + e, 'error'); });
  }
  function doCancelEdit() { _ps.editing = null; _ps.draft = null; _ps.validateResult = null; repaintBody(); }
  function doValidate(host) {
    collectDraft(host); var d = _ps.draft; if (!d) { return; }
    _ps.validateResult = validatePreset(d); repaintBody();
    setTimeout(function () { var slot = document.getElementById('p2-editor-slot'); if (slot) { slot.scrollIntoView({ block: 'nearest' }); } }, 50);
  }
  function doDtcgExport(host) {
    if (_ps.draft) { collectDraft(host); }
    var d = _ps.draft || ((_ps.list && _ps.list[0]) ? _ps.list[0] : null);
    if (!d) { toast('Không có preset để xuất.', 'error'); return; }
    var exported = dtcgExport(d);
    var json = JSON.stringify(exported, null, 2);
    /* Offer download via a blob */
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = (d.preset_key || 'preset') + '-dtcg.json'; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('Đã xuất DTCG JSON: ' + (d.preset_key || 'preset') + '-dtcg.json', 'success');
    } catch (e) { toast('Export lỗi: ' + e, 'error'); }
  }
  function doSavePreset(host) {
    if (_ps.saving) { return; }
    collectDraft(host);
    var d = _ps.draft; if (!d) { return; }
    if (!d.preset_key) { toast('Nhập mã preset (preset_key).', 'error'); return; }
    var vr = validatePreset(d);
    if (!vr.ok) {
      _ps.validateResult = vr; repaintBody();
      setTimeout(function () { var slot = document.getElementById('p2-editor-slot'); if (slot) { slot.scrollIntoView({ block: 'nearest' }); } }, 50);
      toast('Preset có lỗi validation — xem danh sách bên dưới.', 'error'); return;
    }
    _ps.saving = true; repaintBody();
    post('graphics_theme_preset_save', { preset: d }).then(function (r) {
      _ps.saving = false;
      if (r && r.ok !== false) {
        toast('Đã lưu preset "' + d.preset_key + '".', 'success');
        _ps.editing = null; _ps.draft = null; _ps.validateResult = null;
        loadPresets();
      } else { toast('Lưu preset thất bại' + (r && r.error ? ': ' + r.error : '') + '.', 'error'); repaintBody(); }
    }).catch(function (e) { _ps.saving = false; toast('Lưu preset lỗi: ' + e, 'error'); repaintBody(); });
  }
  function doSettingsSave(host) {
    if (_ss.saving || !host) { return; }
    var s = readOrgSettings();
    /* Collect from DOM */
    var modeBtn = host.querySelector('[data-p2s="color-mode"].is-on'); if (modeBtn) { s['color-mode'] = modeBtn.getAttribute('data-p2v'); }
    var fontEl = host.querySelector('#p2-s-font'); if (fontEl) { s['font-family'] = fontEl.value; }
    var fbEl = host.querySelector('#p2-s-fontbase'); if (fbEl) { s['font-base'] = parseInt(fbEl.value, 10) || 13; }
    var motionBtn = host.querySelector('[data-p2s="motion"].is-on'); if (motionBtn) { s['motion'] = motionBtn.getAttribute('data-p2v'); }
    /* Apply immediately */
    try { if (window._admTheme && typeof window._admTheme.apply === 'function') { window._admTheme.apply(s); } } catch (e) { /* noop */ }
    _ss.settings = s; _ss.saving = true; repaintBody();
    /* Persist org-wide */
    if (window._moduleMasterStore && typeof window._moduleMasterStore.persist === 'function') {
      window._moduleMasterStore.persist(function (ok) {
        _ss.saving = false;
        toast(ok ? 'Đã lưu cài đặt cho tổ chức.' : 'Áp dụng runtime OK; lưu org thất bại.', ok ? 'success' : 'warning');
        repaintBody();
      });
    } else {
      _ss.saving = false;
      toast('Đã áp dụng cài đặt (runtime). Backend store chưa sẵn.', 'warning');
      repaintBody();
    }
  }
  function doSettingsReset(host) {
    if (!window.confirm('Reset cài đặt tổ chức về mặc định?')) { return; }
    _ss.settings = null;
    try { if (window._admTheme && typeof window._admTheme.reset === 'function') { window._admTheme.reset(false); } } catch (e) { /* noop */ }
    repaintBody();
    toast('Đã reset cài đặt.', 'success');
  }

  /* ── onAction: click handler (returns true if handled) ──────────────── */
  function onPresetsAction(k, t) {
    var key = t.getAttribute('data-key');
    var host = api() && api().host();
    if (k === 'p2-refresh') { loadPresets(); return true; }
    if (k === 'p2-new') { doNew(); return true; }
    if (k === 'p2-apply') { doApply(key); return true; }
    if (k === 'p2-edit') { doEdit(key); return true; }
    if (k === 'p2-clone') { doClone(key); return true; }
    if (k === 'p2-delete') { doDelete(key); return true; }
    if (k === 'p2-cancel-edit') { doCancelEdit(); return true; }
    if (k === 'p2-validate') { doValidate(host); return true; }
    if (k === 'p2-dtcg-export') { doDtcgExport(host); return true; }
    if (k === 'p2-save-preset') { doSavePreset(host); return true; }
    /* Segmented buttons inside the editor (control-height) */
    var seg = t.getAttribute('data-p2s');
    if (seg === 'p2-ctrl-h' || seg === 'p2-elevation') {
      /* visual already updated by wirePresetLivePreview; collect+preview */
      setTimeout(function () { applyDraftLivePreview(host); }, 0);
      return true;
    }
    return false;
  }
  function onSettingsAction(k, t) {
    var host = api() && api().host();
    if (k === 'p2-settings-save') { doSettingsSave(host); return true; }
    if (k === 'p2-settings-reset') { doSettingsReset(host); return true; }
    /* Color-mode segment buttons wired here */
    var seg = t.getAttribute('data-p2s');
    if (seg === 'color-mode') {
      var val = t.getAttribute('data-p2v');
      var root = document.documentElement;
      if (val === 'auto') { root.removeAttribute('data-color-mode'); } else { root.setAttribute('data-color-mode', val); }
      /* update visual */
      var parent = t.closest('.p2-seg'); if (parent) { parent.querySelectorAll('[data-p2s="color-mode"]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-p2v') === val); }); }
      return true;
    }
    if (seg === 'motion') {
      var parent2 = t.closest('.p2-seg'); if (parent2) { parent2.querySelectorAll('[data-p2s="motion"]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-p2v') === t.getAttribute('data-p2v')); }); }
      return true;
    }
    return false;
  }

  /* ── Registration (retry until MStudio is available) ────────────────── */
  function register() {
    if (!(window.MStudio && typeof window.MStudio.registerSurface === 'function')) {
      setTimeout(register, 40); return;
    }
    /* Register under 'presets' — P1 shell marks theme:{hidden:true,redirectTo:'presets'} */
    window.MStudio.registerSurface('presets', {
      label: '🎨 Thư viện preset',
      order: 40,
      render: renderPresets,
      onMount: onPresetsMount,
      onAction: onPresetsAction
    });
    window.MStudio.registerSurface('settings', {
      label: '⚙️ Cài đặt',
      order: 45,
      render: renderSettings,
      onMount: onSettingsMount,
      onAction: onSettingsAction
    });
    console.info('[MSP2] Presets + Settings surfaces registered.');
  }
  register();
})();
