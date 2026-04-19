/* ============================================================================
   HESEM MOM — Graphics Authority Namespace v1.0 (2026-04-18 rebuild)
   ============================================================================
   Single-source-of-truth client for the Graphics Control Plane.

   Four public namespaces replace the ad-hoc globals of the legacy admin
   appearance module:

     window.GraphicsAuthority  — state, mutations, token resolution
     window.ControlKit         — widget factory (slider, colorSwatch, ...)
     window.PreviewScenes      — replayable preview scene renderers
     window.GovernancePanels   — governance panel facade

   Design pattern (stolen from vendors):
     SAP Theme Designer           — Save / Publish / Activate split + rollback
     Microsoft Fluent 2           — Light + Dark + HighContrast triad required
     Salesforce SLDS              — component contract whitelist
     Atlassian Design Tokens      — foundation → semantic → component layering
     Material 3 "Material You"    — dynamic tonal ramp from seed color
     Adobe Spectrum               — density + platform dimensions

   Every mutating path flows: stage → simulate → commit → publish → rollback.
   Every edit widget MUST open a simulation scene before committing; the
   simulation run is recorded as evidence in graphics_simulation_run.

   Load order: AFTER 00a-registry-service.js, 00b-theme-manager.js,
               00ba-graphics-governance-service.js, BEFORE 00c-admin-appearance.js
   ============================================================================ */
(function(){
'use strict';

/* ── Internal state ─────────────────────────────────────────────────────── */
var _catalog = null;           /* cached token catalog from DB */
var _catalogEtag = '';
var _snapshot = {};            /* effective token_key → value (current scope + mode) */
var _snapshotScope = { scope: {}, color_mode: 'light' };
var _previewScenes = null;
var _componentContracts = null;
var _themeSchedules = null;
var _draftChanges = {};        /* token_key → { from, to, colorMode } since last commit */
var _subscribers = [];

/* ── Utilities ──────────────────────────────────────────────────────────── */
function _api(action){ return 'api.php?action=' + encodeURIComponent(action); }
function _fetchJson(url, opts){
  opts = opts || {};
  opts.credentials = opts.credentials || 'same-origin';
  opts.headers = Object.assign({'Accept':'application/json'}, opts.headers || {});
  return fetch(url, opts).then(function(r){
    if(!r.ok) throw new Error('http ' + r.status + ' ' + url);
    return r.json();
  });
}

function _toast(msg, kind){
  if(typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  else if(window.console) console.log('[GraphicsAuthority]', kind || '', msg);
}

function _uuid(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
    var r = Math.random()*16|0, v = c==='x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function _emit(event, payload){
  _subscribers.forEach(function(fn){
    try { fn(event, payload); } catch(e){}
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 *   GraphicsAuthority — Token catalog + draft + rollout client
 * ═══════════════════════════════════════════════════════════════════════════ */

var GraphicsAuthority = {
  /* ── Initialization ─────────────────────────────────────────────────── */
  init: function(opts){
    opts = opts || {};
    return GraphicsAuthority.catalog.load(opts.refresh === true).then(function(){
      return GraphicsAuthority.snapshot.load(opts.scope || {}, opts.colorMode || 'light');
    });
  },

  /* ── Catalog (authoritative list of tunable tokens) ─────────────────── */
  catalog: {
    load: function(force){
      if(_catalog && !force) return Promise.resolve(_catalog);
      return _fetchJson(_api('graphics_token_catalog_list')).then(function(r){
        _catalog = (r && r.tokens) || [];
        _catalogEtag = (r && r._meta && r._meta.capturedAt) || '';
        _emit('catalog:loaded', { count: _catalog.length });
        return _catalog;
      }).catch(function(){
        _catalog = _catalog || [];
        return _catalog;
      });
    },
    list: function(filter){
      filter = filter || {};
      return (_catalog || []).filter(function(t){
        if(filter.layer && t.layer !== filter.layer) return false;
        if(filter.family && t.family !== filter.family) return false;
        if(filter.component_scope && t.component_scope !== filter.component_scope) return false;
        if(filter.tag && (!t.tags || t.tags.indexOf(filter.tag) < 0)) return false;
        return true;
      });
    },
    find: function(tokenKey){
      return (_catalog || []).filter(function(t){ return t.token_key === tokenKey; })[0] || null;
    },
    etag: function(){ return _catalogEtag; }
  },

  /* ── Snapshot (effective values for a scope + color mode) ──────────── */
  snapshot: {
    load: function(scope, colorMode){
      scope = scope || {};
      colorMode = colorMode || 'light';
      var q = 'graphics_token_catalog_snapshot&color_mode=' + encodeURIComponent(colorMode);
      if(scope.tenant) q += '&tenant=' + encodeURIComponent(scope.tenant);
      if(scope.environment) q += '&environment=' + encodeURIComponent(scope.environment);
      return _fetchJson('api.php?action=' + q).then(function(r){
        _snapshot = (r && r.snapshot) || {};
        _snapshotScope = { scope: scope, color_mode: colorMode };
        _emit('snapshot:loaded', { colorMode: colorMode, count: Object.keys(_snapshot).length });
        return _snapshot;
      }).catch(function(){ return _snapshot || {}; });
    },
    get: function(){ return Object.assign({}, _snapshot); },
    scope: function(){ return Object.assign({}, _snapshotScope); }
  },

  /* ── Tokens (read + stage) ─────────────────────────────────────────── */
  tokens: {
    /* READ token value — the single function every consumer module must use.
       Modules MUST NOT hardcode colors/px/fonts; they MUST call
       GraphicsAuthority.tokens.read('<token_key>') or consume via CSS var. */
    read: function(tokenKey, fallback){
      if(_snapshot && Object.prototype.hasOwnProperty.call(_snapshot, tokenKey)){
        return _snapshot[tokenKey];
      }
      if(window.HmTheme && HmTheme.getDeep){
        var v = HmTheme.getDeep(tokenKey);
        if(v !== '' && v !== undefined && v !== null) return v;
      }
      return (fallback === undefined ? null : fallback);
    },

    /* READ as numeric (strips units) */
    readNumeric: function(tokenKey, fallback){
      var raw = GraphicsAuthority.tokens.read(tokenKey, null);
      if(raw === null) return (fallback === undefined ? NaN : fallback);
      var n = parseFloat(String(raw));
      return isNaN(n) ? (fallback === undefined ? NaN : fallback) : n;
    },

    /* Stage a change into the draft buffer (in-memory, not yet committed).
       Triggers a visual preview through HmTheme.setPreviewVar for instant feedback. */
    stage: function(tokenKey, value, opts){
      opts = opts || {};
      var token = GraphicsAuthority.catalog.find(tokenKey);
      var colorMode = opts.colorMode || _snapshotScope.color_mode || 'light';
      var cssVar = (token && token.css_variable) || null;

      var prior = _draftChanges[tokenKey] && _draftChanges[tokenKey].from;
      if(prior === undefined) prior = GraphicsAuthority.tokens.read(tokenKey);

      _draftChanges[tokenKey] = { from: prior, to: value, colorMode: colorMode };

      if(cssVar && window.HmTheme && HmTheme.setPreviewVar){
        HmTheme.setPreviewVar(cssVar, value);
      }
      if(window.HmTheme && HmTheme.setPreviewDeep){
        HmTheme.setPreviewDeep(tokenKey, value);
      }
      _emit('draft:staged', { tokenKey: tokenKey, value: value, colorMode: colorMode });
      return { tokenKey: tokenKey, value: value, colorMode: colorMode };
    },

    /* Stage a value with unit suffix (e.g. 16 + 'px') */
    stageWithUnit: function(tokenKey, value, unit){
      var raw = value == null ? '' : String(value);
      if(unit && /^-?\d*\.?\d+$/.test(raw)) raw = raw + unit;
      return GraphicsAuthority.tokens.stage(tokenKey, raw);
    },

    /* Revert a staged change */
    revert: function(tokenKey){
      var change = _draftChanges[tokenKey];
      if(!change) return;
      delete _draftChanges[tokenKey];
      var token = GraphicsAuthority.catalog.find(tokenKey);
      if(token && token.css_variable && window.HmTheme && HmTheme.setPreviewVar){
        HmTheme.setPreviewVar(token.css_variable, change.from == null ? '' : String(change.from));
      }
      if(window.HmTheme && HmTheme.setPreviewDeep){
        HmTheme.setPreviewDeep(tokenKey, change.from);
      }
      _emit('draft:reverted', { tokenKey: tokenKey });
    }
  },

  /* ── Draft buffer (all staged changes since last commit) ─────────────── */
  draft: {
    snapshot: function(){ return JSON.parse(JSON.stringify(_draftChanges)); },
    isEmpty: function(){ return Object.keys(_draftChanges).length === 0; },
    recordChange: function(kind, path, value){
      /* Legacy bridge: lets the old _admGraphicsMarkChange hook reach the draft. */
      _draftChanges[path] = { from: GraphicsAuthority.tokens.read(path), to: value, kind: kind };
      _emit('draft:legacy-change', { kind: kind, path: path, value: value });
    },
    clear: function(){ _draftChanges = {}; _emit('draft:cleared', {}); }
  },

  /* ── Preview (simulation-before-commit) ─────────────────────────────── */
  preview: {
    /* Open the simulation modal with the current draft. */
    simulate: function(opts){
      opts = opts || {};
      var sceneKeys = opts.scenes || PreviewScenes.suggestForDraft(_draftChanges);
      return PreviewScenes.openSimulationModal({
        sceneKeys: sceneKeys,
        draftChanges: GraphicsAuthority.draft.snapshot(),
        onCommit: opts.onCommit,
        onDiscard: opts.onDiscard,
        colorMode: opts.colorMode || _snapshotScope.color_mode
      });
    }
  },

  /* ── Commit / rollout orchestration ─────────────────────────────────── */
  rollout: {
    stage: function(opts){
      opts = opts || {};
      return _fetchJson(_api('graphics_rollout_stage'), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          label: opts.label || 'rollout-' + new Date().toISOString(),
          scopeMode: opts.scopeMode || 'preview-only',
          scopeTargets: opts.scopeTargets || {},
          changeset: _draftChanges
        })
      });
    },
    apply: function(rolloutId, opts){
      return _fetchJson(_api('graphics_rollout_apply'), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ rolloutId: rolloutId, options: opts || {} })
      });
    },
    rollback: function(rolloutId, reason){
      return _fetchJson(_api('graphics_rollout_rollback'), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ rolloutId: rolloutId, reason: reason || '' })
      });
    }
  },

  /* ── Backend client shortcuts ─────────────────────────────────────── */
  backend: {
    recordSimulation: function(payload){
      return _fetchJson(_api('graphics_simulation_run_record'), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ run: payload })
      });
    },
    listPreviewScenes: function(category){
      var url = _api('graphics_preview_scenes_list');
      if(category) url += '&category=' + encodeURIComponent(category);
      return _fetchJson(url).then(function(r){ return (r && r.scenes) || []; });
    },
    listComponentContracts: function(operatorVisibleOnly){
      var url = _api('graphics_component_contract_list');
      if(operatorVisibleOnly !== undefined) url += '&operator_visible=' + (operatorVisibleOnly ? '1' : '0');
      return _fetchJson(url).then(function(r){ return (r && r.contracts) || []; });
    },
    listThemeSchedules: function(){
      return _fetchJson(_api('graphics_theme_schedule_list')).then(function(r){ return (r && r.schedules) || []; });
    },
    runQaGates: function(payload){
      /* Run the 19 Standard-36 QA gates server-side. Typically called
         right before Commit to get authoritative blocker status. */
      return _fetchJson(_api('graphics_qa_gate_run'), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload || {})
      });
    }
  },

  /* ── Color-mode management ────────────────────────────────────────
     Triad Light / Dark / HighContrast per Microsoft Fluent 2. Switches
     data-color-mode on <html> (which our CSS overrides key off) AND
     reloads the effective-token snapshot from the backend so the cached
     token values flip. */
  colorMode: {
    supported: ['light','dark','high-contrast','print'],
    current: function(){ return (_snapshotScope.color_mode || 'light'); },
    set: function(mode){
      mode = String(mode || 'light');
      if(GraphicsAuthority.colorMode.supported.indexOf(mode) < 0) mode = 'light';
      document.documentElement.setAttribute('data-color-mode', mode);
      GraphicsAuthority.a11y.announce(GraphicsAuthority.i18n.bi(
        'Đã chuyển color mode sang ', 'Color mode switched to ') + mode);
      return GraphicsAuthority.snapshot.load(_snapshotScope.scope, mode);
    }
  },

  /* ── i18n ─────────────────────────────────────────────────────────── */
  i18n: {
    t: function(key){ /* delegate to existing portal i18n */
      return key;
    },
    bi: function(vi, en){
      return (typeof window.lang !== 'undefined' && window.lang === 'en') ? (en || vi) : vi;
    }
  },

  /* ── Accessibility ────────────────────────────────────────────────── */
  a11y: {
    announce: function(msg){
      var live = document.getElementById('adm-graphics-live');
      if(live) live.textContent = String(msg || '');
    },
    contrastRatio: function(fg, bg){
      if(window.HmTheme && HmTheme.contrastRatio) return HmTheme.contrastRatio(fg, bg);
      /* Minimal WCAG 2.1 relative-luminance implementation */
      function hexToRgb(h){
        h = String(h || '').replace('#','');
        if(h.length === 3) h = h.split('').map(function(c){ return c+c; }).join('');
        var n = parseInt(h, 16) || 0;
        return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
      }
      function lum(c){
        var a = [c.r, c.g, c.b].map(function(v){
          v /= 255;
          return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
        });
        return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
      }
      var l1 = lum(hexToRgb(fg)), l2 = lum(hexToRgb(bg));
      var hi = Math.max(l1,l2), lo = Math.min(l1,l2);
      return (hi + 0.05) / (lo + 0.05);
    },
    wcagLevel: function(ratio, isLargeText){
      if(ratio >= 7.0) return 'AAA';
      if(ratio >= 4.5) return 'AA';
      if(ratio >= 3.0 && isLargeText) return 'AA-large';
      return 'FAIL';
    }
  },

  /* ── Runtime subscription ─────────────────────────────────────────── */
  runtime: {
    subscribe: function(fn){ _subscribers.push(fn); return function(){ var i = _subscribers.indexOf(fn); if(i>=0) _subscribers.splice(i,1); }; },
    primeSubscription: function(){
      /* Listen to HmTheme changes so our snapshot stays coherent */
      if(window.HmTheme && HmTheme.on){
        HmTheme.on('admin-config-updated', function(){ GraphicsAuthority.snapshot.load(_snapshotScope.scope, _snapshotScope.color_mode); });
      }
    }
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
 *   ControlKit — widget factory (replaces slider(), colorPick(), etc.)
 *   Every widget stages the value into the draft buffer on change. The
 *   admin still has to click Commit (or walk the simulation) before the
 *   change is persisted.
 * ═══════════════════════════════════════════════════════════════════════════ */

var ControlKit = {
  /* Dimension slider (replaces slider()).
     opts: { tokenKey, label, min, max, step, unit, onChange } */
  renderDimensionSlider: function(opts){
    var token = GraphicsAuthority.catalog.find(opts.tokenKey);
    var min = opts.min !== undefined ? opts.min : (token && token.min_numeric !== null ? token.min_numeric : 0);
    var max = opts.max !== undefined ? opts.max : (token && token.max_numeric !== null ? token.max_numeric : 100);
    var step = opts.step !== undefined ? opts.step : (token && token.step_numeric !== null ? token.step_numeric : 1);
    var unit = opts.unit !== undefined ? opts.unit : (token && token.unit ? token.unit : 'px');
    var current = parseFloat(String(GraphicsAuthority.tokens.read(opts.tokenKey, ''))) || 0;
    var id = 'ck_s_' + (opts.tokenKey || '').replace(/\W/g, '_');
    var html = '';
    html += '<div class="ck-row ck-slider" data-token="' + _esc(opts.tokenKey) + '">';
    html +=   '<label for="' + id + '" class="ck-label">' + _esc(opts.label || opts.tokenKey) + '</label>';
    html +=   '<input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + current + '"';
    html +=       ' oninput="ControlKit._onSliderInput(this, \'' + _jsAttr(opts.tokenKey) + '\', \'' + _jsAttr(unit || '') + '\')" />';
    html +=   '<input id="' + id + '_n" type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + current + '"';
    html +=       ' onchange="ControlKit._onSliderInput(this, \'' + _jsAttr(opts.tokenKey) + '\', \'' + _jsAttr(unit || '') + '\')" />';
    html +=   '<span class="ck-unit">' + _esc(unit) + '</span>';
    html +=   '<button type="button" class="ck-simulate" onclick="GraphicsAuthority.preview.simulate({scenes:[\'' + _jsAttr(token && token.component_scope ? 'components.' + token.component_scope : 'color.surfaces') + '\']})" title="Mô phỏng thay đổi"><span aria-hidden="true">▶</span></button>';
    html += '</div>';
    return html;
  },

  _onSliderInput: function(el, tokenKey, unit){
    var row = el.closest('.ck-slider');
    if(row){
      var range = row.querySelector('input[type=range]');
      var number = row.querySelector('input[type=number]');
      if(range && number){
        if(el === range) number.value = range.value;
        else range.value = number.value;
      }
    }
    GraphicsAuthority.tokens.stageWithUnit(tokenKey, el.value, unit || '');
  },

  /* Color swatch (replaces colorPick()) */
  renderColorSwatch: function(opts){
    var current = GraphicsAuthority.tokens.read(opts.tokenKey, '#000000') || '#000000';
    var id = 'ck_c_' + (opts.tokenKey || '').replace(/\W/g, '_');
    var html = '';
    html += '<div class="ck-row ck-color" data-token="' + _esc(opts.tokenKey) + '">';
    html +=   '<label for="' + id + '" class="ck-label">' + _esc(opts.label || opts.tokenKey) + '</label>';
    html +=   '<input id="' + id + '" type="color" value="' + _esc(String(current).substring(0,7)) + '"';
    html +=       ' oninput="ControlKit._onColorInput(this, \'' + _jsAttr(opts.tokenKey) + '\')" />';
    html +=   '<input id="' + id + '_t" type="text" value="' + _esc(current) + '"';
    html +=       ' onchange="ControlKit._onColorInput(this, \'' + _jsAttr(opts.tokenKey) + '\')" />';
    html +=   '<button type="button" class="ck-simulate" onclick="GraphicsAuthority.preview.simulate({scenes:[\'color.brand\',\'color.surfaces\']})" title="Mô phỏng thay đổi">▶</button>';
    html +=   '<span id="' + id + '_wcag" class="ck-wcag"></span>';
    html += '</div>';
    return html;
  },

  _onColorInput: function(el, tokenKey){
    var row = el.closest('.ck-color');
    if(row){
      var color = row.querySelector('input[type=color]');
      var text  = row.querySelector('input[type=text]');
      if(color && text){ if(el === color) text.value = color.value; else color.value = text.value; }
    }
    GraphicsAuthority.tokens.stage(tokenKey, el.value);
    ControlKit._refreshWcagBadge(tokenKey);
  },

  _refreshWcagBadge: function(tokenKey){
    var token = GraphicsAuthority.catalog.find(tokenKey);
    if(!token || !token.wcag_pair_token) return;
    var fg = GraphicsAuthority.tokens.read(tokenKey);
    var bg = GraphicsAuthority.tokens.read(token.wcag_pair_token);
    if(!fg || !bg) return;
    var ratio = GraphicsAuthority.a11y.contrastRatio(fg, bg);
    var level = GraphicsAuthority.a11y.wcagLevel(ratio, false);
    var badgeId = 'ck_c_' + tokenKey.replace(/\W/g, '_') + '_wcag';
    var badge = document.getElementById(badgeId);
    if(badge){
      badge.textContent = level + ' (' + ratio.toFixed(2) + ')';
      badge.className = 'ck-wcag ' + (level === 'FAIL' ? 'ck-wcag-fail' : 'ck-wcag-pass');
    }
  },

  /* Font-stack picker (replaces fontSelect) */
  renderFontStackPicker: function(opts){
    var current = GraphicsAuthority.tokens.read(opts.tokenKey, '');
    var id = 'ck_f_' + (opts.tokenKey || '').replace(/\W/g, '_');
    return '<div class="ck-row ck-font" data-token="' + _esc(opts.tokenKey) + '">' +
           '<label for="' + id + '" class="ck-label">' + _esc(opts.label || opts.tokenKey) + '</label>' +
           '<input id="' + id + '" type="text" value="' + _esc(current) + '"' +
           ' onchange="GraphicsAuthority.tokens.stage(\'' + _jsAttr(opts.tokenKey) + '\', this.value)" />' +
           '<button type="button" class="ck-simulate" onclick="GraphicsAuthority.preview.simulate({scenes:[\'typography.family\']})" title="Mô phỏng">▶</button>' +
           '</div>';
  },

  /* Text field (replaces textInput) */
  renderTextField: function(opts){
    var current = GraphicsAuthority.tokens.read(opts.tokenKey, '');
    var id = 'ck_t_' + (opts.tokenKey || '').replace(/\W/g, '_');
    return '<div class="ck-row ck-text" data-token="' + _esc(opts.tokenKey) + '">' +
           '<label for="' + id + '" class="ck-label">' + _esc(opts.label || opts.tokenKey) + '</label>' +
           '<input id="' + id + '" type="text" value="' + _esc(current) + '"' +
           ' onchange="GraphicsAuthority.tokens.stage(\'' + _jsAttr(opts.tokenKey) + '\', this.value)" />' +
           '</div>';
  },

  /* Segmented option (replaces radioRow) */
  renderSegmentedOption: function(opts){
    var current = GraphicsAuthority.tokens.read(opts.tokenKey, opts.options[0] && opts.options[0].value);
    var html = '<div class="ck-row ck-segmented" data-token="' + _esc(opts.tokenKey) + '">';
    html += '<label class="ck-label">' + _esc(opts.label || opts.tokenKey) + '</label>';
    html += '<div class="ck-segment-group" role="radiogroup" aria-label="' + _esc(opts.label || opts.tokenKey) + '">';
    (opts.options || []).forEach(function(o){
      var active = String(current) === String(o.value);
      html += '<button type="button" role="radio" aria-checked="' + (active ? 'true' : 'false') + '"' +
              ' class="ck-segment' + (active ? ' is-active' : '') + '"' +
              ' onclick="GraphicsAuthority.tokens.stage(\'' + _jsAttr(opts.tokenKey) + '\', \'' + _jsAttr(o.value) + '\');' +
              ' ControlKit._syncSegment(this)"' +
              '>' + _esc(o.label || o.value) + '</button>';
    });
    html += '</div></div>';
    return html;
  },

  _syncSegment: function(btn){
    var group = btn.parentElement;
    if(!group) return;
    Array.prototype.forEach.call(group.children, function(b){
      b.classList.remove('is-active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-checked', 'true');
  },

  /* Preview frame (replaces previewBox) */
  previewFrame: function(title, innerHtml, hint){
    return '<div class="ck-preview-frame">' +
           (title ? '<div class="ck-preview-title">' + _esc(title) + '</div>' : '') +
           '<div class="ck-preview-body">' + (innerHtml || '') + '</div>' +
           (hint ? '<div class="ck-preview-hint">' + _esc(hint) + '</div>' : '') +
           '</div>';
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
 *   PreviewScenes — simulation scene renderers
 *   Every scene key declared in DB (graphics_preview_scene.renderer) maps to
 *   a function here. Scenes render into the simulation modal and re-render
 *   on any draft change.
 * ═══════════════════════════════════════════════════════════════════════════ */

var PreviewScenes = {
  renderers: {
    typographyFamily: function(){
      var stacks = ['display','heading','body','label','mono'].map(function(k){
        var fam = GraphicsAuthority.tokens.read('typography.' + k + '.family', 'sans-serif');
        return '<p style="font-family:' + String(fam).replace(/"/g,'&quot;') + ';margin:.5em 0">' +
               '<strong>' + k + '</strong> — Lorem ipsum dolor — Đồ họa tuân thủ ISO — 0123456789</p>';
      }).join('');
      return ControlKit.previewFrame('Font stacks', stacks);
    },
    typographyScale: function(){
      var sizes = ['xs','sm','base','md','lg','xl','2xl','3xl'];
      return ControlKit.previewFrame('Typography scale', sizes.map(function(s){
        var px = GraphicsAuthority.tokens.read('fontScale.' + s, '14px');
        var v = /px/.test(px) ? px : (px + 'px');
        return '<div style="font-size:' + v + '">' + s + ' — ' + v + ' — HESEM World-Class MOM</div>';
      }).join(''));
    },
    typographyLineHeight: function(){
      return ControlKit.previewFrame('Line height', ['tight','normal','relaxed'].map(function(k){
        var lh = GraphicsAuthority.tokens.read('lineHeight.' + k, '1.5');
        return '<p style="line-height:' + lh + ';margin:.5em 0"><strong>' + k + ' (' + lh + ')</strong> — Dòng văn bản mẫu để kiểm tra chiều cao dòng. Lorem ipsum dolor sit amet.</p>';
      }).join(''));
    },
    colorBrand: function(){
      return _colorSwatchGallery('Brand', ['brand.primary','brand.light','brand.dark','brand.accent','brand.accentLight']);
    },
    colorStatus: function(){
      return _colorSwatchGallery('Status', ['status.success.light','status.error.light','status.warning.light','status.info.light','status.purple.light','status.cyan.light']);
    },
    colorSurfaces: function(){
      return _colorSwatchGallery('Surfaces', ['colorsLight.bgPage','colorsLight.bgSurface','colorsLight.bgSurfaceAlt','colorsLight.bgHeader','colorsLight.bgHover']);
    },
    layoutRadius: function(){
      return ControlKit.previewFrame('Radius scale', ['20px','18px','14px','8px','4px'].map(function(r){
        return '<div style="display:inline-block;margin:6px;padding:16px 24px;background:#1565c0;color:#fff;border-radius:' + r + '">r=' + r + '</div>';
      }).join(''));
    },
    layoutSpacing: function(){
      return ControlKit.previewFrame('Spacing scale', 'Spacing preview: gap/padding tokens applied live in the editor.');
    },
    effectsMotion: function(){
      return ControlKit.previewFrame('Motion', '<div class="ck-motion-demo" style="padding:24px;background:#f8fafc;border-radius:12px">Hover the button — transitions use the staged motion tokens.</div><button type="button" style="transition:transform var(--motion-normal,150ms) var(--easing-out,cubic-bezier(0,0,0.2,1));padding:8px 16px;background:#1565c0;color:#fff;border:0;border-radius:6px" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">Hover me</button>');
    },
    effectsFocusRing: function(){
      return ControlKit.previewFrame('Focus ring', '<input type="text" placeholder="Tab in here to preview focus ring" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;width:100%"/>');
    },
    dashboardAndon: function(){
      return ControlKit.previewFrame('Andon 4K projection',
        '<div style="padding:32px;background:#0f172a;color:#fff;border-radius:14px;font-size:28px;text-align:center">' +
        '<div style="color:' + GraphicsAuthority.tokens.read('status.success.light','#16a34a') + ';font-size:48px;font-weight:800">OK</div>' +
        '<div style="color:' + GraphicsAuthority.tokens.read('status.warning.light','#d97706') + ';font-size:36px">WARNING</div>' +
        '<div style="color:' + GraphicsAuthority.tokens.read('status.error.light','#dc2626') + ';font-size:36px">ALARM</div>' +
        '</div>',
        'Projection mode simulates an 8-ft andon board');
    },
    componentButton: function(){
      return ControlKit.previewFrame('Button gallery',
        '<button type="button" class="ck-demo-btn">Primary</button> ' +
        '<button type="button" class="ck-demo-btn ck-demo-btn-secondary">Secondary</button> ' +
        '<button type="button" class="ck-demo-btn ck-demo-btn-ghost">Ghost</button>'
      );
    },
    componentTable: function(){
      return ControlKit.previewFrame('Table gallery',
        '<table class="ck-demo-table"><thead><tr><th>Part</th><th>Status</th><th>Qty</th></tr></thead>' +
        '<tbody><tr><td>PT-001</td><td>OK</td><td>120</td></tr><tr><td>PT-002</td><td>Hold</td><td>0</td></tr></tbody></table>'
      );
    },
    componentCard: function(){
      return ControlKit.previewFrame('Card gallery', '<div class="ck-demo-card"><h4>Operation 10</h4><p>Rough milling — status: running</p></div>');
    },
    componentKpi: function(){
      return ControlKit.previewFrame('KPI gallery',
        '<div class="ck-demo-kpi"><div class="ck-demo-kpi-label">OEE</div><div class="ck-demo-kpi-value">84.3%</div></div>' +
        '<div class="ck-demo-kpi"><div class="ck-demo-kpi-label">FPY</div><div class="ck-demo-kpi-value">97.1%</div></div>'
      );
    },
    componentModal: function(){
      return ControlKit.previewFrame('Modal gallery', '<div class="ck-demo-modal"><div class="ck-demo-modal-header">Work order WO-2041</div><div class="ck-demo-modal-body">Confirm close?</div></div>');
    }
  },

  /* Scene dispatch */
  render: function(sceneKey){
    var cached = _previewScenes && _previewScenes.filter(function(s){ return s.scene_key === sceneKey; })[0];
    var rendererKey = (cached && cached.renderer) || sceneKey.split('.').pop();
    var fn = PreviewScenes.renderers[rendererKey] || PreviewScenes.renderers[sceneKey];
    if(!fn) return '<div class="ck-preview-missing">No renderer for ' + _esc(sceneKey) + '</div>';
    try { return fn(); } catch(e){ return '<div class="ck-preview-missing">Preview error: ' + _esc(e.message || 'unknown') + '</div>'; }
  },

  /* Suggest scenes relevant to the staged draft */
  suggestForDraft: function(draft){
    var keys = Object.keys(draft || {});
    var scenes = {};
    keys.forEach(function(k){
      if(/^brand\./.test(k))                scenes['color.brand'] = true;
      if(/^status\./.test(k))               scenes['color.status'] = true;
      if(/^colorsLight\./.test(k))          scenes['color.surfaces'] = true;
      if(/^typography\./.test(k))           scenes['typography.family'] = true;
      if(/^fontScale\./.test(k))            scenes['typography.scale'] = true;
      if(/^lineHeight\./.test(k))           scenes['typography.lineHeight'] = true;
      if(/^effects\.motion|easing/.test(k)) scenes['effects.motion'] = true;
      if(/^effects\.focus/.test(k))         scenes['effects.focusRing'] = true;
      if(/^components\.btn/.test(k))        scenes['components.button'] = true;
      if(/^components\.table/.test(k))      scenes['components.table'] = true;
      if(/^components\.card/.test(k))       scenes['components.card'] = true;
      if(/^components\.kpi/.test(k))        scenes['components.kpi'] = true;
      if(/^components\.modal/.test(k))      scenes['components.modal'] = true;
      if(/^layout\./.test(k))               scenes['layout.spacing'] = true;
    });
    var list = Object.keys(scenes);
    if(list.length === 0) list = ['color.surfaces','components.button'];
    return list;
  },

  /* ── Simulation modal ─────────────────────────────────────────────── */
  openSimulationModal: function(opts){
    opts = opts || {};
    var sceneKeys = (opts.sceneKeys && opts.sceneKeys.length) ? opts.sceneKeys : ['color.surfaces'];
    var draft = opts.draftChanges || {};
    var runId = _uuid();
    var colorMode = opts.colorMode || 'light';

    var modal = document.createElement('div');
    modal.className = 'ga-sim-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label', GraphicsAuthority.i18n.bi('Mô phỏng thay đổi đồ họa', 'Graphics change simulation'));

    var changeCount = Object.keys(draft).length;
    var wcagRows = [];
    var wcagFailures = 0;
    (GraphicsAuthority.catalog.list() || []).forEach(function(t){
      if(!t.wcag_pair_token) return;
      if(!Object.prototype.hasOwnProperty.call(draft, t.token_key) &&
         !Object.prototype.hasOwnProperty.call(draft, t.wcag_pair_token)) return;
      var fg = GraphicsAuthority.tokens.read(t.token_key);
      var bg = GraphicsAuthority.tokens.read(t.wcag_pair_token);
      if(!fg || !bg) return;
      var ratio = GraphicsAuthority.a11y.contrastRatio(fg, bg);
      var level = GraphicsAuthority.a11y.wcagLevel(ratio, false);
      if(level === 'FAIL') wcagFailures++;
      wcagRows.push({ token: t.token_key, paired: t.wcag_pair_token, ratio: ratio, level: level });
    });

    modal.innerHTML =
      '<div class="ga-sim-backdrop" onclick="PreviewScenes._closeSim()"></div>' +
      '<div class="ga-sim-dialog" tabindex="-1">' +
        '<header class="ga-sim-header">' +
          '<h2>' + GraphicsAuthority.i18n.bi('Mô phỏng thay đổi', 'Simulation') +
          ' <small class="ga-sim-meta">' + changeCount + ' ' + GraphicsAuthority.i18n.bi('thay đổi', 'changes') + ' • ' + _esc(colorMode) + '</small></h2>' +
          '<button type="button" class="ga-sim-close" onclick="PreviewScenes._closeSim()" aria-label="Close">×</button>' +
        '</header>' +
        '<div class="ga-sim-body">' +
          '<section class="ga-sim-scenes">' +
            sceneKeys.map(function(key){
              return '<article class="ga-sim-scene" data-scene="' + _esc(key) + '">' +
                     '<h3>' + _esc(key) + '</h3>' +
                     PreviewScenes.render(key) +
                     '</article>';
            }).join('') +
          '</section>' +
          '<aside class="ga-sim-panel">' +
            '<h3>' + GraphicsAuthority.i18n.bi('Cổng WCAG', 'WCAG Gate') + '</h3>' +
            (wcagRows.length ? '<ul class="ga-sim-wcag">' + wcagRows.map(function(r){
              return '<li class="ga-sim-wcag-' + (r.level === 'FAIL' ? 'fail' : 'pass') + '">' +
                     '<code>' + _esc(r.token) + '</code> vs <code>' + _esc(r.paired) + '</code> — ' +
                     r.ratio.toFixed(2) + ' (' + r.level + ')</li>';
            }).join('') + '</ul>' : '<p>No paired tokens staged — contrast gate skipped.</p>') +
            '<h3>' + GraphicsAuthority.i18n.bi('Thay đổi đã stage', 'Staged changes') + '</h3>' +
            '<ul class="ga-sim-draft">' + Object.keys(draft).map(function(k){
              return '<li><code>' + _esc(k) + '</code>: <del>' + _esc(draft[k].from) + '</del> → <strong>' + _esc(draft[k].to) + '</strong></li>';
            }).join('') + '</ul>' +
          '</aside>' +
        '</div>' +
        '<footer class="ga-sim-footer">' +
          (wcagFailures > 0 ? '<div class="ga-sim-blocker">' + GraphicsAuthority.i18n.bi('Cổng WCAG chặn commit', 'WCAG gate blocks commit') + ' (' + wcagFailures + ' fail)</div>' : '') +
          '<button type="button" class="ga-sim-discard" onclick="PreviewScenes._closeSim(\'discarded\')">' + GraphicsAuthority.i18n.bi('Huỷ', 'Discard') + '</button>' +
          '<button type="button" class="ga-sim-commit" ' + (wcagFailures > 0 ? 'disabled' : '') +
            ' onclick="PreviewScenes._closeSim(\'committed\')">' +
            GraphicsAuthority.i18n.bi('Commit vào draft', 'Commit to draft') + '</button>' +
        '</footer>' +
      '</div>';

    document.body.appendChild(modal);
    var dialog = modal.querySelector('.ga-sim-dialog');
    if(dialog && dialog.focus) dialog.focus();

    PreviewScenes._currentSim = {
      modal: modal,
      runId: runId,
      sceneKeys: sceneKeys,
      draftChanges: draft,
      wcagRows: wcagRows,
      wcagFailures: wcagFailures,
      colorMode: colorMode,
      onCommit: opts.onCommit,
      onDiscard: opts.onDiscard
    };

    GraphicsAuthority.a11y.announce(GraphicsAuthority.i18n.bi(
      'Đã mở mô phỏng với ' + changeCount + ' thay đổi, ' + wcagRows.length + ' kiểm tra WCAG.',
      'Simulation opened with ' + changeCount + ' changes, ' + wcagRows.length + ' WCAG checks.'
    ));

    return { run_id: runId, sceneKeys: sceneKeys };
  },

  _closeSim: function(outcome){
    var sim = PreviewScenes._currentSim;
    if(!sim) return;
    outcome = outcome || 'reviewed';
    var payload = {
      run_id: sim.runId,
      label: 'sim-' + new Date().toISOString(),
      outcome: outcome,
      color_mode: sim.colorMode,
      staged_changes: sim.draftChanges,
      scenes_rendered: sim.sceneKeys,
      wcag_report: { rows: sim.wcagRows, failures: sim.wcagFailures }
    };
    GraphicsAuthority.backend.recordSimulation(payload).catch(function(){});

    if(sim.modal && sim.modal.parentNode) sim.modal.parentNode.removeChild(sim.modal);
    PreviewScenes._currentSim = null;

    if(outcome === 'committed' && typeof sim.onCommit === 'function'){
      try { sim.onCommit(sim.draftChanges); } catch(e){}
    } else if(outcome === 'discarded' && typeof sim.onDiscard === 'function'){
      try { sim.onDiscard(sim.draftChanges); } catch(e){}
    }
    _emit('sim:closed', { runId: sim.runId, outcome: outcome });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
 *   GovernancePanels — thin facade over existing governance panels
 * ═══════════════════════════════════════════════════════════════════════════ */

var GovernancePanels = {
  impact: function(args){ return _delegateLegacyPanel('renderImpactAnalysisPanel', args); },
  rollout: function(args){ return _delegateLegacyPanel('renderRolloutControls', args); },
  audit: function(args){ return _delegateLegacyPanel('renderAuditHistoryPanel', args); },
  compliance: function(args){ return _delegateLegacyPanel('renderComplianceMatrixPanel', args); },
  drift: function(args){ return _delegateLegacyPanel('renderDriftDetectorPanel', args); },
  changeSet: function(args){ return _delegateLegacyPanel('renderChangeSetPanel', args); },
  lineage: function(args){ return _delegateLegacyPanel('renderLineageGraphPanel', args); },
  runtimeBeacon: function(args){ return _delegateLegacyPanel('renderRuntimeBeaconPanel', args); },
  debt: function(args){ return _delegateLegacyPanel('renderDebtObservatoryPanel', args); }
};

function _delegateLegacyPanel(fnName, args){
  if(typeof window[fnName] === 'function') return window[fnName].apply(null, args || []);
  return '<div class="ga-panel-pending">Panel ' + fnName + ' is not yet registered.</div>';
}

/* ── helpers ──────────────────────────────────────────────────────────── */
function _esc(v){ var d = document.createElement('div'); d.appendChild(document.createTextNode(v == null ? '' : String(v))); return d.innerHTML; }
/* Escape a value destined for a single-quoted JS string literal embedded
   inside an HTML attribute (e.g. onclick="foo('<value>')"). _esc alone
   does NOT escape ' or \, so this wrapper closes that hole. */
function _jsAttr(v){
  return _esc(v).replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
}

function _colorSwatchGallery(title, tokenKeys){
  var body = tokenKeys.map(function(k){
    var v = GraphicsAuthority.tokens.read(k, '#999999');
    return '<div class="ga-swatch" style="background:' + String(v).replace(/"/g,'') + '"><code>' + _esc(k) + '</code><span>' + _esc(v) + '</span></div>';
  }).join('');
  return ControlKit.previewFrame(title, '<div class="ga-swatch-row">' + body + '</div>');
}

/* ── EXPOSE ───────────────────────────────────────────────────────────── */
window.GraphicsAuthority = GraphicsAuthority;
window.ControlKit        = ControlKit;
window.PreviewScenes     = PreviewScenes;
window.GovernancePanels  = GovernancePanels;

/* Backward-compatible aliases so existing 00c-admin-appearance.js keeps
   working while we migrate its 400K body. Every old global routes through
   the new namespace, so the draft buffer / simulation evidence trail is
   populated even from legacy call sites. */
if(typeof window._hmSet !== 'function'){
  window._hmSet = function(cssVar, path, value){
    if(cssVar && window.HmTheme && HmTheme.setPreviewVar) HmTheme.setPreviewVar(cssVar, value);
    if(path) GraphicsAuthority.tokens.stage(path, value);
  };
}
if(typeof window._hmSetWithUnit !== 'function'){
  window._hmSetWithUnit = function(cssVar, path, value, unit){
    if(unit && /^-?\d*\.?\d+$/.test(String(value))) value = value + unit;
    window._hmSet(cssVar, path, value);
  };
}
if(typeof window._admGraphicsMarkChange !== 'function'){
  window._admGraphicsMarkChange = function(kind, path, value){
    GraphicsAuthority.draft.recordChange(kind, path, value);
  };
}

/* Auto-init on first admin access to the Appearance tab */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ GraphicsAuthority.init().catch(function(){}); });
} else {
  GraphicsAuthority.init().catch(function(){});
}

})();
