/* ============================================================================
 * 32-module-studio.js — Module Studio shell (Lego Block Master)
 * ----------------------------------------------------------------------------
 * P2 of the Module Studio rearchitecture (see
 * _reports/lego-empire/LOCKED-ARCHITECTURE-FINAL-2026-06-01.md).
 *
 * Unified 3-column workspace:
 *   ┌ Library rail ┬ Canvas / Preview ┬ Inspector ┐
 * with the **mode wall** (Assemble = consumer / Author = role-gated registry
 * editing) and a **drill-down inspector** (select item → its contract).
 *
 * Library layers (single sources of truth, no parallel lists):
 *   - Curated L3 blocks  : window.__HM_BLOCK_REGISTRY__.blocks (status=published)
 *   - Archetypes (L4)    : window.__HM_ARCHETYPE_REGISTRY__.archetypes (published)
 *   - Engine catalog     : window.HmBlockEngine.BLOCK_CATALOG (174 types × 12 cats)
 * Preview routes through window.Blocks.render (the one production render gate).
 * All visual values bind to --o3-* tokens; no free hex/px authority.
 *
 * Safety: INERT — not auto-mounted. Host calls window.ModuleStudio.render(el).
 * v0.2 adds real L3/L4 registry reads + contract drill-down.
 * ==========================================================================*/
(function () {
  'use strict';

  var STYLE_ID = 'module-studio-css';
  var ROOT = 'mstudio';

  var state = {
    mode: 'assemble',   // 'assemble' | 'author'
    sel: null           // { kind:'l3'|'l4'|'engine', key:string, data:object }
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function engineCatalog() {
    var be = window.HmBlockEngine;
    return (be && be.BLOCK_CATALOG) ? be.BLOCK_CATALOG : {};
  }
  function l3Blocks() {
    var reg = window.__HM_BLOCK_REGISTRY__;
    var arr = (reg && Array.isArray(reg.blocks)) ? reg.blocks : [];
    return arr.filter(function (b) { return b && b.status === 'published'; });
  }
  function l4Archetypes() {
    var reg = window.__HM_ARCHETYPE_REGISTRY__;
    var arr = (reg && Array.isArray(reg.archetypes)) ? reg.archetypes : [];
    return arr.filter(function (a) { return a && a.status === 'published'; });
  }
  function groupEngineByCategory() {
    var cat = engineCatalog(), groups = {};
    Object.keys(cat).forEach(function (key) {
      var b = cat[key] || {}, c = b.category || 'other';
      (groups[c] = groups[c] || []).push({ key: key, label: b.label || key, icon: b.icon || '▫' });
    });
    return groups;
  }

  /* ── scoped styles (token-bound) ─────────────────────────────────────── */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) { return; }
    var R = '.' + ROOT;
    var css =
      R + '{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--o3-text-strong,#0f172a)}' +
      R + '__bar{display:flex;align-items:center;gap:var(--o3-space,8px);padding:var(--o3-space,8px) var(--o3-space-section,12px);' +
        'background:var(--o3-surface-card,#fff);border-bottom:1px solid var(--o3-border-subtle,#e5e7eb)}' +
      R + '__title{font-weight:800;font-size:15px;display:flex;align-items:center;gap:8px}' +
      R + '__modes{display:flex;gap:3px;background:var(--o3-surface-muted,#f1f5f9);border-radius:var(--o3-radius,4px);padding:3px}' +
      R + '__mode{height:26px;padding:0 12px;border:0;background:transparent;cursor:pointer;border-radius:var(--o3-radius,4px);' +
        'font:inherit;font-size:12px;font-weight:600;color:var(--o3-text-default,#475569)}' +
      R + '__mode.is-on{background:var(--o3-surface-card,#fff);color:var(--o3-brand,#0c4a6e);box-shadow:var(--o3-shadow-card,0 1px 2px rgba(15,23,42,.06))}' +
      R + '__spacer{margin-left:auto}' +
      R + '__body{flex:1;min-height:0;display:grid;grid-template-columns:240px 1fr 312px}' +
      R + '__col{min-height:0;overflow:auto}' +
      R + '__lib{border-right:1px solid var(--o3-border-subtle,#e5e7eb);background:var(--o3-surface-card,#fff)}' +
      R + '__search{position:sticky;top:0;background:var(--o3-surface-card,#fff);padding:var(--o3-space,8px) var(--o3-space-section,12px);' +
        'border-bottom:1px solid var(--o3-border-subtle,#e5e7eb);z-index:1}' +
      R + '__in{height:var(--o3-control-h-standard,32px);width:100%;box-sizing:border-box;border:1px solid var(--o3-border-default,#cbd5e1);' +
        'border-radius:var(--o3-radius,4px);padding:0 10px;font:inherit;font-size:12px;background:var(--o3-surface-card,#fff);color:var(--o3-text-strong,#0f172a)}' +
      R + '__cat{padding:8px var(--o3-space-section,12px) 2px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--o3-text-muted,#94a3b8)}' +
      R + '__blk{display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px var(--o3-space-section,12px);font-size:12px;color:var(--o3-text-strong,#0f172a)}' +
      R + '__blk:hover{background:var(--o3-brand-soft,#e0f2fe)}' +
      R + '__blk.is-sel{background:var(--o3-brand-soft,#e0f2fe);box-shadow:inset 2px 0 0 var(--o3-brand,#0c4a6e)}' +
      R + '__blk .ic{width:18px;text-align:center}' +
      R + '__blk .nm{flex:1}' + R + '__blk .nm small{display:block;color:var(--o3-text-muted,#94a3b8);font-size:10px}' +
      R + '__bd{display:inline-flex;align-items:center;height:16px;padding:0 6px;border-radius:var(--o3-radius-pill,999px);font-size:9px;font-weight:700;text-transform:uppercase}' +
      R + '__bd--ssot{background:var(--o3-success-soft,#dcfce7);color:var(--o3-success,#15803d)}' +
      R + '__bd--l4{background:var(--o3-brand-soft,#e0f2fe);color:var(--o3-brand,#0c4a6e)}' +
      R + '__cv{background:var(--o3-surface-muted,#f1f5f9);padding:var(--o3-space-section,12px)}' +
      R + '__surf{background:var(--o3-surface-card,#fff);border:1px solid var(--o3-border-subtle,#e5e7eb);border-radius:var(--o3-radius-card,8px);padding:var(--o3-space-section,12px);min-height:200px}' +
      R + '__hint{color:var(--o3-text-muted,#94a3b8);font-size:12px;text-align:center;padding:40px 12px}' +
      R + '__zone{border:1px dashed var(--o3-border-default,#cbd5e1);border-radius:var(--o3-radius,4px);margin-bottom:var(--o3-space,8px);overflow:hidden}' +
      R + '__zlbl{font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--o3-text-muted,#94a3b8);padding:4px 10px;background:var(--o3-surface-muted,#f1f5f9);border-bottom:1px dashed var(--o3-border-subtle,#e5e7eb)}' +
      R + '__zbody{padding:8px 10px;font-size:11px;color:var(--o3-text-default,#475569)}' +
      R + '__insp{border-left:1px solid var(--o3-border-subtle,#e5e7eb);background:var(--o3-surface-card,#fff)}' +
      R + '__insp .hd{position:sticky;top:0;background:var(--o3-surface-card,#fff);border-bottom:1px solid var(--o3-border-subtle,#e5e7eb);padding:var(--o3-space,8px) var(--o3-space-section,12px);font-size:11px;color:var(--o3-text-muted,#94a3b8)}' +
      R + '__insp .bd{padding:var(--o3-space-section,12px)}' +
      R + '__f{margin-bottom:11px}' +
      R + '__f label{display:block;font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:var(--o3-text-muted,#94a3b8);margin-bottom:5px}' +
      R + '__pill{display:inline-flex;align-items:center;height:20px;padding:0 9px;border-radius:var(--o3-radius-pill,999px);font-size:10px;font-weight:800;letter-spacing:.4px;background:var(--o3-brand-soft,#e0f2fe);color:var(--o3-brand,#0c4a6e)}' +
      R + '__chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;margin:0 4px 4px 0;border:1px solid var(--o3-border-subtle,#e5e7eb);border-radius:var(--o3-radius-pill,999px);font-size:11px;background:var(--o3-surface-muted,#f1f5f9)}' +
      R + '__note{font-size:11px;line-height:1.5;color:var(--o3-text-default,#475569);background:var(--o3-surface-muted,#f1f5f9);border:1px solid var(--o3-border-subtle,#e5e7eb);border-radius:var(--o3-radius,4px);padding:8px 10px;margin-top:8px}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ── library ─────────────────────────────────────────────────────────── */
  function blkRow(kind, key, label, sub, icon, badge) {
    var sel = (state.sel && state.sel.kind === kind && state.sel.key === key) ? ' is-sel' : '';
    return '<div class="' + ROOT + '__blk' + sel + '" data-ms="sel" data-kind="' + kind + '" data-key="' + esc(key) + '">' +
      '<span class="ic">' + esc(icon || '▫') + '</span>' +
      '<span class="nm">' + esc(label) + '<small>' + esc(sub) + '</small></span>' + (badge || '') + '</div>';
  }
  function renderLibrary() {
    var h = '<div class="' + ROOT + '__search"><input class="' + ROOT + '__in" data-ms="search" placeholder="🔍 Thư viện Lego"></div>';
    var l3 = l3Blocks();
    if (l3.length) {
      h += '<div class="' + ROOT + '__cat">⭐ Curated · L3 SSOT · ' + l3.length + '</div>';
      l3.forEach(function (b) {
        h += blkRow('l3', b.block_key, (b.display_name_vi || b.block_key), b.block_key, '🧱',
          '<span class="' + ROOT + '__bd ' + ROOT + '__bd--ssot">ssot</span>');
      });
    }
    var l4 = l4Archetypes();
    if (l4.length) {
      h += '<div class="' + ROOT + '__cat">📐 Archetype · L4 · ' + l4.length + '</div>';
      l4.forEach(function (a) {
        h += blkRow('l4', a.archetype_key, (a.display_name_vi || a.archetype_key), a.archetype_key, '▱',
          '<span class="' + ROOT + '__bd ' + ROOT + '__bd--l4">l4</span>');
      });
    }
    var groups = groupEngineByCategory(), cats = Object.keys(groups).sort();
    h += '<div class="' + ROOT + '__cat">⚙ Engine catalog · ' + Object.keys(engineCatalog()).length + '</div>';
    cats.forEach(function (c) {
      h += '<div class="' + ROOT + '__cat" style="padding-top:4px">' + esc(c) + ' · ' + groups[c].length + '</div>';
      groups[c].forEach(function (b) { h += blkRow('engine', b.key, b.label, b.key, b.icon, ''); });
    });
    return h;
  }

  /* ── canvas ──────────────────────────────────────────────────────────── */
  function safeRender(key) {
    try {
      if (window.Blocks && typeof window.Blocks.render === 'function') {
        return window.Blocks.render(key, {}, { preview: true }) || '';
      }
    } catch (e) { /* noop */ }
    return '';
  }
  function renderCanvas() {
    var s = state.sel;
    if (!s) {
      return '<div class="' + ROOT + '__surf"><div class="' + ROOT + '__hint">Chọn một mục ở thư viện trái: ⭐ block L3, 📐 archetype L4, hoặc ⚙ engine block. Preview render qua window.Blocks.render (renderer production).</div></div>';
    }
    if (s.kind === 'l4') {
      var zones = (s.data && s.data.zones) ? s.data.zones : {};
      var zh = Object.keys(zones).map(function (z) {
        var allowed = Array.isArray(zones[z]) ? zones[z].join(', ') : (zones[z] && zones[z].allowed ? [].concat(zones[z].allowed).join(', ') : '');
        return '<div class="' + ROOT + '__zone"><div class="' + ROOT + '__zlbl">zone: ' + esc(z) + '</div>' +
          '<div class="' + ROOT + '__zbody">' + (allowed ? 'blocks: ' + esc(allowed) : '—') + '</div></div>';
      }).join('');
      return '<div class="' + ROOT + '__surf">' + (zh || '<div class="' + ROOT + '__hint">Archetype không khai báo zones.</div>') + '</div>';
    }
    var inner = safeRender(s.key);
    if (!inner) {
      var meta = (s.kind === 'engine') ? (engineCatalog()[s.key] || {}) : {};
      inner = '<div class="' + ROOT + '__hint">' + esc(meta.icon || '🧱') + ' ' + esc(meta.label || s.key) + '<br><small>' + esc(s.key) + '</small></div>';
    }
    return '<div class="' + ROOT + '__surf">' + inner + '</div>';
  }

  /* ── inspector ───────────────────────────────────────────────────────── */
  function chips(arr) {
    if (!arr || !arr.length) { return '<span class="' + ROOT + '__chip">—</span>'; }
    return arr.map(function (x) { return '<span class="' + ROOT + '__chip">' + esc(x) + '</span>'; }).join('');
  }
  function renderInspector() {
    var s = state.sel;
    if (!s) {
      return '<div class="hd">chưa chọn</div><div class="bd"><div class="' + ROOT + '__note">Chọn mục để xem ' +
        (state.mode === 'author' ? 'định nghĩa (Author)' : 'thuộc tính (Assemble)') + '.</div></div>';
    }
    if (s.kind === 'l3') {
      var b = s.data || {};
      var slots = b.slots ? Object.keys(b.slots) : [];
      var a11y = b.a11y_contract ? JSON.stringify(b.a11y_contract) : '—';
      var pill = state.mode === 'author' ? 'L3 · BLOCK CONTRACT' : 'ASSEMBLE · L3';
      return '<div class="hd">' + (state.mode === 'author' ? 'L3' : 'Assemble') + ' ▸ ' + esc(s.key) + '</div><div class="bd">' +
        '<div style="margin-bottom:10px"><span class="' + ROOT + '__pill">' + pill + '</span></div>' +
        '<div class="' + ROOT + '__f"><label>block_key</label>' + chips([s.key]) + '</div>' +
        '<div class="' + ROOT + '__f"><label>composed_of (L2)</label>' + chips(b.composed_of) + '</div>' +
        '<div class="' + ROOT + '__f"><label>slots</label>' + chips(slots) + '</div>' +
        '<div class="' + ROOT + '__f"><label>required_tokens</label>' + chips(b.required_tokens) + '</div>' +
        '<div class="' + ROOT + '__f"><label>a11y</label><div class="' + ROOT + '__note" style="margin:0">' + esc(a11y) + '</div></div>' +
        (state.mode === 'author'
          ? '<div class="' + ROOT + '__note">Sửa contract qua graphics_block_contract_save (backend Session B). Khi sẵn, các field trên thành editable.</div>'
          : '<div class="' + ROOT + '__note">Assemble: chỉ gán slot/data, không sửa định nghĩa (đó là Author).</div>') +
        '</div>';
    }
    if (s.kind === 'l4') {
      var a = s.data || {};
      return '<div class="hd">L4 ▸ ' + esc(s.key) + '</div><div class="bd">' +
        '<div style="margin-bottom:10px"><span class="' + ROOT + '__pill">L4 · ARCHETYPE</span></div>' +
        '<div class="' + ROOT + '__f"><label>zones</label>' + chips(a.zones ? Object.keys(a.zones) : []) + '</div>' +
        '<div class="' + ROOT + '__f"><label>required_blocks</label>' + chips(a.required_blocks) + '</div>' +
        '<div class="' + ROOT + '__f"><label>forbidden_patterns</label>' + chips(a.forbidden_patterns) + '</div>' +
        '<div class="' + ROOT + '__note">Tạo module = chọn archetype này → gán block published vào từng zone → bind data.</div></div>';
    }
    var meta = engineCatalog()[s.key] || {};
    var p = state.mode === 'author' ? 'ENGINE (chưa curate L3)' : 'ASSEMBLE';
    return '<div class="hd">' + (state.mode === 'author' ? 'Engine' : 'Assemble') + ' ▸ ' + esc(s.key) + '</div><div class="bd">' +
      '<div style="margin-bottom:10px"><span class="' + ROOT + '__pill">' + p + '</span></div>' +
      '<div class="' + ROOT + '__f"><label>type</label>' + chips([s.key]) + '</div>' +
      '<div class="' + ROOT + '__f"><label>nhãn</label><div>' + esc(meta.label || s.key) + '</div></div>' +
      '<div class="' + ROOT + '__f"><label>category</label>' + chips([meta.category || 'other']) + '</div>' +
      (state.mode === 'author'
        ? '<div class="' + ROOT + '__note">Block engine chưa được curate lên L3. Muốn governed → đăng ký vào graphics_block_contract (Session B) rồi nó lên section ⭐ Curated.</div>'
        : '<div class="' + ROOT + '__note">Assemble: gán slot/data; không gõ hex/px.</div>') + '</div>';
  }

  /* ── shell + wiring ──────────────────────────────────────────────────── */
  function shellHtml() {
    return '<div class="' + ROOT + '__bar">' +
        '<span class="' + ROOT + '__title">🧩 Module Studio · Lego Block Master</span>' +
        '<div class="' + ROOT + '__modes">' +
          '<button class="' + ROOT + '__mode' + (state.mode === 'assemble' ? ' is-on' : '') + '" data-ms="mode" data-mode="assemble">⬡ Assemble</button>' +
          '<button class="' + ROOT + '__mode' + (state.mode === 'author' ? ' is-on' : '') + '" data-ms="mode" data-mode="author">✎ Author</button>' +
        '</div><span class="' + ROOT + '__spacer"></span></div>' +
      '<div class="' + ROOT + '__body">' +
        '<div class="' + ROOT + '__col ' + ROOT + '__lib" data-ms="libcol">' + renderLibrary() + '</div>' +
        '<div class="' + ROOT + '__col ' + ROOT + '__cv" data-ms="cvcol">' + renderCanvas() + '</div>' +
        '<div class="' + ROOT + '__col ' + ROOT + '__insp" data-ms="inspcol">' + renderInspector() + '</div>' +
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
  function lookup(kind, key) {
    if (kind === 'l3') { return l3Blocks().filter(function (b) { return b.block_key === key; })[0] || null; }
    if (kind === 'l4') { return l4Archetypes().filter(function (a) { return a.archetype_key === key; })[0] || null; }
    return engineCatalog()[key] || null;
  }

  function render(el) {
    if (!el) { return; }
    ensureStyle();
    el.classList.add(ROOT);
    el.innerHTML = shellHtml();
    el.addEventListener('click', function (ev) {
      var t = (ev.target && ev.target.closest) ? ev.target.closest('[data-ms]') : null;
      if (!t || !el.contains(t)) { return; }
      var kind = t.getAttribute('data-ms');
      if (kind === 'mode') {
        state.mode = t.getAttribute('data-mode') || 'assemble';
        refresh(el);
      } else if (kind === 'sel') {
        var k = t.getAttribute('data-kind'), key = t.getAttribute('data-key');
        state.sel = { kind: k, key: key, data: lookup(k, key) };
        refresh(el);
      }
    });
    return el;
  }

  window.ModuleStudio = {
    render: render,
    setMode: function (m) { state.mode = (m === 'author') ? 'author' : 'assemble'; },
    _state: state,
    version: '0.2.0-scaffold'
  };
})();
