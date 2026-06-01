/* ============================================================================
 * 32-module-studio.js — Module Studio shell (Lego Block Master)
 * ----------------------------------------------------------------------------
 * P2 of the Module Studio rearchitecture (see
 * _reports/lego-empire/LOCKED-ARCHITECTURE-FINAL-2026-06-01.md).
 *
 * Renders the unified 3-column workspace:
 *   ┌ Library rail ┬ Canvas / Preview ┬ Inspector ┐
 * with the **mode wall** (Assemble = consumer / Author = role-gated registry
 * editing) and a **drill-down inspector** (select a block → its contract).
 *
 * SSOT discipline:
 *   - Library reads the existing engine catalog (window.HmBlockEngine.BLOCK_CATALOG)
 *     — single source of block types; no parallel list.
 *   - Preview routes through window.Blocks.render (the one production render gate).
 *   - All visual values bind to --o3-* tokens (var(...) with safe fallbacks),
 *     no free hex/px authority.
 *
 * Safety: this file is INERT — not loaded by mom/portal.html yet. It exposes
 * window.ModuleStudio.render(el) for the host to mount when wired (later step).
 * ==========================================================================*/
(function () {
  'use strict';

  var STYLE_ID = 'module-studio-css';
  var ROOT_CLASS = 'mstudio';

  var state = {
    mode: 'assemble',          // 'assemble' | 'author'
    selectedKey: null,         // catalog key of the selected block
    selectedLayer: 'assemble', // 'assemble' | 'l3' | 'l2' | 'l4'
    _hostId: null
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function catalog() {
    var be = window.HmBlockEngine;
    return (be && be.BLOCK_CATALOG) ? be.BLOCK_CATALOG : {};
  }

  /* group catalog entries by category → { category: [{key,label,icon}] } */
  function groupByCategory() {
    var cat = catalog();
    var groups = {};
    Object.keys(cat).forEach(function (key) {
      var b = cat[key] || {};
      var c = b.category || 'other';
      (groups[c] = groups[c] || []).push({
        key: key,
        label: b.label || key,
        icon: b.icon || '▫'
      });
    });
    return groups;
  }

  /* is this catalog type a published L3 block (curated SSOT)? best-effort */
  function isSsot(key) {
    try {
      var b = window.Blocks;
      if (b && typeof b.isPublished === 'function') { return b.isPublished(key) === true; }
    } catch (e) { /* noop */ }
    return false;
  }

  /* ── scoped styles (token-bound) ─────────────────────────────────────── */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) { return; }
    var css =
      '.' + ROOT_CLASS + '{display:flex;flex-direction:column;height:100%;min-height:0;' +
        'font-family:var(--font-family-base,inherit);color:var(--o3-text-strong,#0f172a)}' +
      '.' + ROOT_CLASS + '__bar{display:flex;align-items:center;gap:var(--o3-space,8px);' +
        'padding:var(--o3-space,8px) var(--o3-space-section,12px);background:var(--o3-surface-card,#fff);' +
        'border-bottom:1px solid var(--o3-border-subtle,#e5e7eb)}' +
      '.' + ROOT_CLASS + '__title{font-weight:800;font-size:15px;display:flex;align-items:center;gap:8px}' +
      '.' + ROOT_CLASS + '__modes{display:flex;gap:3px;background:var(--o3-surface-muted,#f1f5f9);' +
        'border-radius:var(--o3-radius,4px);padding:3px}' +
      '.' + ROOT_CLASS + '__mode{height:26px;padding:0 12px;border:0;background:transparent;cursor:pointer;' +
        'border-radius:var(--o3-radius,4px);font:inherit;font-size:12px;font-weight:600;color:var(--o3-text-default,#475569)}' +
      '.' + ROOT_CLASS + '__mode.is-on{background:var(--o3-surface-card,#fff);color:var(--o3-brand,#0c4a6e);' +
        'box-shadow:var(--o3-shadow-card,0 1px 2px rgba(15,23,42,.06))}' +
      '.' + ROOT_CLASS + '__spacer{margin-left:auto}' +
      '.' + ROOT_CLASS + '__body{flex:1;min-height:0;display:grid;' +
        'grid-template-columns:236px 1fr 304px}' +
      '.' + ROOT_CLASS + '__col{min-height:0;overflow:auto}' +
      '.' + ROOT_CLASS + '__lib{border-right:1px solid var(--o3-border-subtle,#e5e7eb);background:var(--o3-surface-card,#fff)}' +
      '.' + ROOT_CLASS + '__search{position:sticky;top:0;background:var(--o3-surface-card,#fff);' +
        'padding:var(--o3-space,8px) var(--o3-space-section,12px);border-bottom:1px solid var(--o3-border-subtle,#e5e7eb)}' +
      '.' + ROOT_CLASS + '__in{height:var(--o3-control-h-standard,32px);width:100%;box-sizing:border-box;' +
        'border:1px solid var(--o3-border-default,#cbd5e1);border-radius:var(--o3-radius,4px);' +
        'padding:0 10px;font:inherit;font-size:12px;background:var(--o3-surface-card,#fff);color:var(--o3-text-strong,#0f172a)}' +
      '.' + ROOT_CLASS + '__cat{padding:7px var(--o3-space-section,12px) 2px;font-size:10px;font-weight:700;' +
        'letter-spacing:.5px;text-transform:uppercase;color:var(--o3-text-muted,#94a3b8)}' +
      '.' + ROOT_CLASS + '__blk{display:flex;align-items:center;gap:8px;cursor:pointer;' +
        'padding:6px var(--o3-space-section,12px);font-size:12px;color:var(--o3-text-strong,#0f172a)}' +
      '.' + ROOT_CLASS + '__blk:hover{background:var(--o3-brand-soft,#e0f2fe)}' +
      '.' + ROOT_CLASS + '__blk.is-sel{background:var(--o3-brand-soft,#e0f2fe);' +
        'box-shadow:inset 2px 0 0 var(--o3-brand,#0c4a6e)}' +
      '.' + ROOT_CLASS + '__blk .ic{width:18px;text-align:center}' +
      '.' + ROOT_CLASS + '__blk .nm{flex:1}.' + ROOT_CLASS + '__blk .nm small{display:block;' +
        'color:var(--o3-text-muted,#94a3b8);font-size:10px}' +
      '.' + ROOT_CLASS + '__bd{display:inline-flex;align-items:center;height:16px;padding:0 6px;' +
        'border-radius:var(--o3-radius-pill,999px);font-size:9px;font-weight:700;text-transform:uppercase;' +
        'background:var(--o3-success-soft,#dcfce7);color:var(--o3-success,#15803d)}' +
      '.' + ROOT_CLASS + '__cv{background:var(--o3-surface-muted,#f1f5f9);padding:var(--o3-space-section,12px)}' +
      '.' + ROOT_CLASS + '__surf{background:var(--o3-surface-card,#fff);border:1px solid var(--o3-border-subtle,#e5e7eb);' +
        'border-radius:var(--o3-radius-card,8px);padding:var(--o3-space-section,12px);min-height:200px}' +
      '.' + ROOT_CLASS + '__hint{color:var(--o3-text-muted,#94a3b8);font-size:12px;text-align:center;padding:40px 12px}' +
      '.' + ROOT_CLASS + '__insp{border-left:1px solid var(--o3-border-subtle,#e5e7eb);' +
        'background:var(--o3-surface-card,#fff)}' +
      '.' + ROOT_CLASS + '__insp .hd{position:sticky;top:0;background:var(--o3-surface-card,#fff);' +
        'border-bottom:1px solid var(--o3-border-subtle,#e5e7eb);padding:var(--o3-space,8px) var(--o3-space-section,12px);' +
        'font-size:11px;color:var(--o3-text-muted,#94a3b8)}' +
      '.' + ROOT_CLASS + '__insp .bd{padding:var(--o3-space-section,12px)}' +
      '.' + ROOT_CLASS + '__f{margin-bottom:11px}' +
      '.' + ROOT_CLASS + '__f label{display:block;font-size:10px;font-weight:700;letter-spacing:.3px;' +
        'text-transform:uppercase;color:var(--o3-text-muted,#94a3b8);margin-bottom:5px}' +
      '.' + ROOT_CLASS + '__pill{display:inline-flex;align-items:center;height:20px;padding:0 9px;border-radius:var(--o3-radius-pill,999px);' +
        'font-size:10px;font-weight:800;letter-spacing:.4px;background:var(--o3-brand-soft,#e0f2fe);color:var(--o3-brand,#0c4a6e)}' +
      '.' + ROOT_CLASS + '__chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;margin:0 4px 4px 0;' +
        'border:1px solid var(--o3-border-subtle,#e5e7eb);border-radius:var(--o3-radius-pill,999px);' +
        'font-size:11px;background:var(--o3-surface-muted,#f1f5f9)}' +
      '.' + ROOT_CLASS + '__note{font-size:11px;line-height:1.5;color:var(--o3-text-default,#475569);' +
        'background:var(--o3-surface-muted,#f1f5f9);border:1px solid var(--o3-border-subtle,#e5e7eb);' +
        'border-radius:var(--o3-radius,4px);padding:8px 10px;margin-top:8px}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ── renderers ───────────────────────────────────────────────────────── */
  function renderLibrary() {
    var groups = groupByCategory();
    var cats = Object.keys(groups).sort();
    var h = '<div class="' + ROOT_CLASS + '__search"><input class="' + ROOT_CLASS + '__in" ' +
      'data-ms="search" placeholder="🔍 Thư viện Lego (' + Object.keys(catalog()).length + ')"></div>';
    cats.forEach(function (c) {
      h += '<div class="' + ROOT_CLASS + '__cat">' + esc(c) + ' · ' + groups[c].length + '</div>';
      groups[c].forEach(function (b) {
        var sel = state.selectedKey === b.key ? ' is-sel' : '';
        var badge = isSsot(b.key) ? '<span class="' + ROOT_CLASS + '__bd">ssot</span>' : '';
        h += '<div class="' + ROOT_CLASS + '__blk' + sel + '" data-ms="block" data-key="' + esc(b.key) + '">' +
          '<span class="ic">' + esc(b.icon) + '</span>' +
          '<span class="nm">' + esc(b.label) + '<small>' + esc(b.key) + '</small></span>' + badge + '</div>';
      });
    });
    return h;
  }

  function renderCanvas() {
    var key = state.selectedKey;
    if (!key) {
      return '<div class="' + ROOT_CLASS + '__surf"><div class="' + ROOT_CLASS + '__hint">' +
        'Chọn một Lego block ở thư viện bên trái để xem trước (render production qua window.Blocks.render).' +
        '</div></div>';
    }
    var inner = '';
    try {
      if (window.Blocks && typeof window.Blocks.render === 'function') {
        inner = window.Blocks.render(key, {}, { preview: true }) || '';
      }
    } catch (e) { inner = ''; }
    if (!inner) {
      var meta = catalog()[key] || {};
      inner = '<div class="' + ROOT_CLASS + '__hint">' + esc(meta.icon || '▫') + ' ' +
        esc(meta.label || key) + '<br><small>' + esc(key) + '</small></div>';
    }
    return '<div class="' + ROOT_CLASS + '__surf">' + inner + '</div>';
  }

  function renderInspector() {
    var key = state.selectedKey;
    var crumb, body;
    if (!key) {
      crumb = 'chưa chọn';
      body = '<div class="' + ROOT_CLASS + '__note">Chọn block để xem ' +
        (state.mode === 'author' ? 'định nghĩa (Author)' : 'thuộc tính (Assemble)') + '.</div>';
      return '<div class="hd">' + crumb + '</div><div class="bd">' + body + '</div>';
    }
    var meta = catalog()[key] || {};
    if (state.mode === 'author') {
      crumb = 'L3 ▸ ' + esc(key);
      body =
        '<div style="margin-bottom:10px"><span class="' + ROOT_CLASS + '__pill">L3 · BLOCK CONTRACT</span></div>' +
        '<div class="' + ROOT_CLASS + '__f"><label>Khoá</label><div class="' + ROOT_CLASS + '__chip">' + esc(key) + '</div></div>' +
        '<div class="' + ROOT_CLASS + '__f"><label>Nhóm</label><div class="' + ROOT_CLASS + '__chip">' + esc(meta.category || 'other') + '</div></div>' +
        '<div class="' + ROOT_CLASS + '__f"><label>Hợp đồng token (đọc từ graphics_*_contract — backend)</label>' +
        '<div class="' + ROOT_CLASS + '__note">Trình sửa contract L2/L3 do track backend (Session B) cung cấp qua graphics_block_contract_save. ' +
        'Khi sẵn, inspector này bind vào đó để chỉnh composed_of / slots / required_tokens.</div></div>';
    } else {
      crumb = 'Assemble ▸ ' + esc(key);
      body =
        '<div style="margin-bottom:10px"><span class="' + ROOT_CLASS + '__pill">ASSEMBLE</span></div>' +
        '<div class="' + ROOT_CLASS + '__f"><label>Block</label><div class="' + ROOT_CLASS + '__chip">' + esc(key) + '</div></div>' +
        '<div class="' + ROOT_CLASS + '__f"><label>Nhãn</label><div>' + esc(meta.label || key) + '</div></div>' +
        '<div class="' + ROOT_CLASS + '__note">Mode Assemble: chỉ chọn block đã đăng ký + gán slot/data. Không gõ hex/px; ' +
        'không sửa định nghĩa block (đó là mode Author).</div>';
    }
    return '<div class="hd">' + crumb + '</div><div class="bd">' + body + '</div>';
  }

  function shellHtml() {
    return '' +
      '<div class="' + ROOT_CLASS + '__bar">' +
        '<span class="' + ROOT_CLASS + '__title">🧩 Module Studio · Lego Block Master</span>' +
        '<div class="' + ROOT_CLASS + '__modes">' +
          '<button class="' + ROOT_CLASS + '__mode' + (state.mode === 'assemble' ? ' is-on' : '') + '" data-ms="mode" data-mode="assemble">⬡ Assemble</button>' +
          '<button class="' + ROOT_CLASS + '__mode' + (state.mode === 'author' ? ' is-on' : '') + '" data-ms="mode" data-mode="author">✎ Author</button>' +
        '</div>' +
        '<span class="' + ROOT_CLASS + '__spacer"></span>' +
      '</div>' +
      '<div class="' + ROOT_CLASS + '__body">' +
        '<div class="' + ROOT_CLASS + '__col ' + ROOT_CLASS + '__lib" data-ms="libcol">' + renderLibrary() + '</div>' +
        '<div class="' + ROOT_CLASS + '__col ' + ROOT_CLASS + '__cv" data-ms="cvcol">' + renderCanvas() + '</div>' +
        '<div class="' + ROOT_CLASS + '__col ' + ROOT_CLASS + '__insp" data-ms="inspcol">' + renderInspector() + '</div>' +
      '</div>';
  }

  function refresh(host) {
    var lib = host.querySelector('[data-ms="libcol"]');
    var cv = host.querySelector('[data-ms="cvcol"]');
    var insp = host.querySelector('[data-ms="inspcol"]');
    if (lib) { lib.innerHTML = renderLibrary(); }
    if (cv) { cv.innerHTML = renderCanvas(); }
    if (insp) { insp.innerHTML = renderInspector(); }
    host.querySelectorAll('[data-ms="mode"]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-mode') === state.mode);
    });
  }

  /* ── public mount ────────────────────────────────────────────────────── */
  function render(el) {
    if (!el) { return; }
    ensureStyle();
    el.classList.add(ROOT_CLASS);
    el.innerHTML = shellHtml();

    el.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest('[data-ms]') : null;
      if (!t || !el.contains(t)) { return; }
      var kind = t.getAttribute('data-ms');
      if (kind === 'mode') {
        state.mode = t.getAttribute('data-mode') || 'assemble';
        refresh(el);
      } else if (kind === 'block') {
        state.selectedKey = t.getAttribute('data-key');
        refresh(el);
      }
    });
    return el;
  }

  window.ModuleStudio = {
    render: render,
    setMode: function (m) { state.mode = (m === 'author') ? 'author' : 'assemble'; },
    _state: state,
    version: '0.1.0-scaffold'
  };
})();
