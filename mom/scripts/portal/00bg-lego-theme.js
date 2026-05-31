/* ============================================================================
 * 00bg-lego-theme.js — HESEM Lego runtime theming engine (window.LegoTheme)
 *
 * One brand seed -> a full OKLCH-derived palette, applied live by writing CSS
 * custom properties. Mirrors the build-time math in tools/scripts/gen-lego-tokens.mjs
 * so runtime and generated CSS agree. Additive + reversible:
 *   - LegoTheme.applyBrand('#1565c0', { scope })  -> recompute --lego-* + bridge to
 *     the production-consumed vars (--brand-primary/--brand-2/--o3-brand…) on `scope`
 *   - LegoTheme.setDensity(px) / setRadius(px) / setControlHeight(px)
 *   - LegoTheme.contrast(fgHex, bgHex) -> WCAG ratio  ; LegoTheme.wcag(ratio,'AA')
 *   - LegoTheme.reset(scope)  -> clear all overrides this engine set on `scope`
 *
 * `scope` defaults to document.documentElement (whole app) but accepts any element
 * so a preview can be confined to one subtree. Nothing is persisted here; durable
 * changes go through GraphicsAuthority.publish.rollout().
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* ── OKLab/OKLCH math (Björn Ottosson, public domain) ── */
  var clamp = function (x, lo, hi) { return Math.min(hi, Math.max(lo, x)); };
  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function toHex2(n) { return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'); }
  function rgbToHex(a) { return '#' + toHex2(a[0]) + toHex2(a[1]) + toHex2(a[2]); }
  function sToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function linToS(c) { var v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return v * 255; }
  function rgbToOklab(rgb) {
    var lr = sToLin(rgb[0]), lg = sToLin(rgb[1]), lb = sToLin(rgb[2]);
    var l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    var m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    var s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    var l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
    return [
      0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
      1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    ];
  }
  function oklabToRgb(lab) {
    var L = lab[0], a = lab[1], b = lab[2];
    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [
      linToS(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      linToS(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      linToS(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    ].map(function (v) { return clamp(v, 0, 255); });
  }
  function rgbToOklch(rgb) {
    var lab = rgbToOklab(rgb), C = Math.hypot(lab[1], lab[2]);
    var H = Math.atan2(lab[2], lab[1]) * 180 / Math.PI; if (H < 0) H += 360;
    return { L: lab[0], C: C, H: H };
  }
  function oklchToRgb(o) {
    var hr = o.H * Math.PI / 180;
    return oklabToRgb([o.L, o.C * Math.cos(hr), o.C * Math.sin(hr)]);
  }
  function oklchToHex(o) { return rgbToHex(oklchToRgb(o)); }

  function deriveRamp(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return null; // invalid input — caller must handle null
    var base = rgbToOklch(rgb);
    var hover = { L: clamp(base.L - 0.05, 0, 1), C: base.C, H: base.H };
    var active = { L: clamp(base.L - 0.10, 0, 1), C: base.C, H: base.H };
    var on = base.L < 0.62 ? { L: 0.99, C: 0, H: base.H } : { L: 0.20, C: 0.01, H: base.H };
    return {
      base: oklchToHex(base),
      baseOklch: base,
      hover: oklchToHex(hover),
      active: oklchToHex(active),
      on: oklchToHex(on)
    };
  }

  /* ── WCAG contrast ── */
  function relLum(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(fgHex, bgHex) {
    var f = hexToRgb(fgHex), b = hexToRgb(bgHex);
    if (!f || !b) return 0;
    var L1 = relLum(f), L2 = relLum(b);
    var hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  }
  function wcag(ratio, level, large) {
    var min = large ? (level === 'AAA' ? 4.5 : 3) : (level === 'AAA' ? 7 : 4.5);
    return ratio >= min;
  }

  /* ── apply / bridge ── */
  // Production vars the live app actually consumes, fed from the derived ramp so a
  // brand swap is visible immediately across orders-v3 / showcase / admin.
  // Only vars actually consumed somewhere in the live CSS (verified by grep) —
  // phantom names that nothing reads were removed so a brand swap has real effect.
  var BRAND_BRIDGE = {
    base: ['--brand', '--brand-primary', '--brand-2', '--o3-brand'],
    hover: ['--o3-brand-hover'],
    active: [],
    on: ['--text-on-brand', '--o3-text-inverse'],
    subtle: ['--o3-brand-soft']
  };
  var TOUCHED = '__legoThemeProps';

  function track(el, prop) {
    if (!el[TOUCHED]) el[TOUCHED] = {};
    el[TOUCHED][prop] = true;
  }
  function setVar(el, prop, val) { el.style.setProperty(prop, val); track(el, prop); }

  function applyBrand(hex, opts) {
    opts = opts || {};
    var el = opts.scope || document.documentElement;
    var rgb = hexToRgb(hex);
    if (!rgb) return { ok: false, error: 'invalid color: ' + hex };
    var r = deriveRamp(hex);
    var subtle = 'color-mix(in oklab, ' + r.base + ', white 88%)';
    // namespaced foundation tokens
    setVar(el, '--lego-brand', r.base);
    setVar(el, '--lego-brand-hover', r.hover);
    setVar(el, '--lego-brand-active', r.active);
    setVar(el, '--lego-brand-on', r.on);
    // bridge to production-consumed vars
    BRAND_BRIDGE.base.forEach(function (p) { setVar(el, p, r.base); });
    BRAND_BRIDGE.hover.forEach(function (p) { setVar(el, p, r.hover); });
    BRAND_BRIDGE.active.forEach(function (p) { setVar(el, p, r.active); });
    BRAND_BRIDGE.on.forEach(function (p) { setVar(el, p, r.on); });
    BRAND_BRIDGE.subtle.forEach(function (p) { setVar(el, p, subtle); });
    return {
      ok: true, ramp: r,
      contrastOnBrand: contrast(r.on, r.base),
      passesAA: wcag(contrast(r.on, r.base), 'AA')
    };
  }

  function setDensity(px, opts) {
    var el = (opts && opts.scope) || document.documentElement;
    var v = parseInt(px, 10);
    if (!isFinite(v) || v < 2 || v > 24) return false;
    setVar(el, '--lego-space', v + 'px');
    setVar(el, '--o3-space', v + 'px');
    setVar(el, '--master-gap', v + 'px');
    return true;
  }
  // INNER / control radius (cấp 2-3): buttons, inputs, chips, tree nodes.
  // HESEM standard default = 4px. Bound to --o3-radius / --master-radius.
  function setRadius(px, opts) {
    var el = (opts && opts.scope) || document.documentElement;
    var v = parseInt(px, 10);
    if (!isFinite(v) || v < 0 || v > 32) return false;
    setVar(el, '--lego-radius', v + 'px');
    setVar(el, '--o3-radius', v + 'px');
    setVar(el, '--master-radius', v + 'px');
    return true;
  }
  // OUTER / container radius (cấp 1): cards, panels, KPI tiles, drawers, the
  // shell frame. HESEM standard default = 8px. Bound to --o3-radius-card /
  // --card-radius / --lego-block-radius. Kept distinct from the inner radius so
  // the two-level rounding (8 outer / 4 inner) holds across every theme.
  function setCardRadius(px, opts) {
    var el = (opts && opts.scope) || document.documentElement;
    var v = parseInt(px, 10);
    if (!isFinite(v) || v < 0 || v > 40) return false;
    setVar(el, '--lego-block-radius', v + 'px');
    setVar(el, '--o3-radius-card', v + 'px');
    setVar(el, '--card-radius', v + 'px');
    return true;
  }
  function setControlHeight(px, opts) {
    var el = (opts && opts.scope) || document.documentElement;
    var v = parseInt(px, 10);
    if (!isFinite(v) || v < 24 || v > 56) return false;
    setVar(el, '--lego-control-h', v + 'px');
    setVar(el, '--o3-control-h-standard', v + 'px');
    return true;
  }

  // Theme Layout: the uniform shell frame (gap-to-edge == gap-between) + block
  // rounding. One call tunes the whole module layout; bound by lego-shell.css.
  function setLayout(opts, scopeOpts) {
    opts = opts || {};
    var el = (scopeOpts && scopeOpts.scope) || document.documentElement;
    var ok = false;
    if (opts.frame != null) {
      var f = parseInt(opts.frame, 10);
      if (isFinite(f) && f >= 0 && f <= 40) { setVar(el, '--lego-frame', f + 'px'); ok = true; }
    }
    if (opts.radius != null) {
      var r = parseInt(opts.radius, 10);
      if (isFinite(r) && r >= 0 && r <= 32) { setVar(el, '--lego-block-radius', r + 'px'); ok = true; }
    }
    return ok;
  }

  function reset(scope) {
    var el = scope || document.documentElement;
    var t = el[TOUCHED]; if (!t) return;
    Object.keys(t).forEach(function (p) { el.style.removeProperty(p); });
    el[TOUCHED] = {};
  }

  /* ── Theme presets (for the Module Creator: pick a theme, then add Lego blocks).
     Each preset is one brand seed + density/radius/control-height — all expressed
     through the same master tokens, so a module inherits a coherent, tunable look.
     Admins can edit a preset by adjusting tokens in Module Master. ── */
  var THEMES = {
    'hesem-default':    { label: { vi:'HESEM mặc định', en:'HESEM Default' },   brand:'#1565c0', density:8,  radius:8,  controlH:32, frame:8 },
    'industrial-dense': { label: { vi:'Công nghiệp dày', en:'Industrial Dense' }, brand:'#1565c0', density:6,  radius:4,  controlH:28, frame:6 },
    'comfortable':      { label: { vi:'Thoáng',          en:'Comfortable' },     brand:'#1565c0', density:12, radius:10, controlH:36, frame:12 },
    'shop-floor':       { label: { vi:'Xưởng (cảm ứng)', en:'Shop-floor (touch)' }, brand:'#0f766e', density:10, radius:8,  controlH:44, frame:10 },
    'violet':           { label: { vi:'Tím',             en:'Violet' },          brand:'#7c3aed', density:8,  radius:8,  controlH:32, frame:8 },
    'slate':            { label: { vi:'Xám đen',         en:'Slate' },           brand:'#334155', density:8,  radius:6,  controlH:32, frame:8 }
  };
  function listThemes(){
    return Object.keys(THEMES).map(function(k){ return { key:k, label:THEMES[k].label, brand:THEMES[k].brand }; });
  }

  /* Load DB-backed presets (graphics_theme_preset, migration 263) and merge them
     over the built-ins so the Module Builder picker + runtime applyTheme() see
     admin-created/edited themes. radius_outer_px → radius (cấp1), radius_inner_px
     → radiusInner (cấp2-3, honored by applyTheme). Network/JSON failure keeps the
     6 built-ins. Fire-and-forget on load; callers can await for freshness. */
  var _presetsLoaded = false;
  function loadPresets(force){
    if (_presetsLoaded && !force) return Promise.resolve(THEMES);
    if (typeof fetch !== 'function') return Promise.resolve(THEMES);
    return fetch('api.php?action=graphics_theme_preset_list', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
      .then(function(r){ return r && r.ok ? r.json() : null; })
      .then(function(res){
        var list = res && res.presets;
        if (Array.isArray(list) && list.length){
          list.forEach(function(p){
            if (!p || !p.preset_key) return;
            var outer = (p.radius_outer_px != null) ? p.radius_outer_px : 8;
            THEMES[p.preset_key] = {
              label: { vi: p.display_name_vi || p.preset_key, en: p.display_name_en || p.preset_key },
              brand: p.brand || '#1565c0',
              density: (p.density_px != null) ? p.density_px : 8,
              radius: outer,
              radiusInner: (p.radius_inner_px != null) ? p.radius_inner_px : Math.max(2, Math.round(outer / 2)),
              controlH: (p.control_h_px != null) ? p.control_h_px : 32,
              frame: (p.frame_px != null) ? p.frame_px : ((p.density_px != null) ? p.density_px : 8),
              overrides: p.overrides || {},
              _db: true, _builtin: !!p.is_builtin, _default: !!p.is_default
            };
          });
          _presetsLoaded = true;
        }
        return THEMES;
      })
      .catch(function(){ return THEMES; });
  }
  function applyTheme(name, opts){
    var t = THEMES[name];
    if(!t) return { ok:false, error:'unknown theme: ' + name };
    var r = applyBrand(t.brand, opts);
    if(t.density != null) setDensity(t.density, opts);
    if(t.radius != null){
      // preset.radius is the OUTER/container radius (cấp 1). The INNER/control
      // radius (cấp 2-3) is half of it, so the HESEM standard 8→4 holds for the
      // default and the two-level distinction scales for every other preset.
      var cardR = parseInt(t.radius, 10);
      var ctrlR = (t.radiusInner != null) ? parseInt(t.radiusInner, 10) : Math.max(2, Math.round(cardR / 2));
      setRadius(ctrlR, opts);
      setCardRadius(cardR, opts);
    }
    if(t.controlH != null) setControlHeight(t.controlH, opts);
    setLayout({ frame: t.frame != null ? t.frame : t.density, radius: t.radius }, opts);
    return { ok: !!(r && r.ok), theme:name, ramp: r && r.ramp };
  }

  global.LegoTheme = {
    version: '1.3.0',
    themes: THEMES,
    listThemes: listThemes,
    loadPresets: loadPresets,
    applyTheme: applyTheme,
    applyBrand: applyBrand,
    setDensity: setDensity,
    setRadius: setRadius,
    setCardRadius: setCardRadius,
    setControlHeight: setControlHeight,
    setLayout: setLayout,
    deriveRamp: deriveRamp,
    contrast: contrast,
    wcag: wcag,
    reset: reset,
    // expose primitives for tests / the admin theming console
    _color: { hexToRgb: hexToRgb, rgbToOklch: rgbToOklch, oklchToHex: oklchToHex }
  };

  /* Eagerly warm the DB-backed presets so the builder picker shows admin themes.
     Safe no-op if the endpoint is unavailable (keeps the 6 built-ins). */
  try { loadPresets(); } catch (_e) {}
})(typeof window !== 'undefined' ? window : this);
