/* ============================================================================
 * 32-module-studio.js — Module Studio shell (Lego Block Master)  v0.3
 * ----------------------------------------------------------------------------
 * P2 of the Module Studio rearchitecture (LOCKED-ARCHITECTURE-FINAL-2026-06-01).
 *
 * 3-column workspace: Library rail · Canvas/Preview · Inspector, with the
 * Assemble/Author mode wall + drill-down inspector.
 *
 * v0.3 — STRICT SSOT density compliance: every gap / padding / margin resolves
 * to --o3-space (8px) or --o3-space-section (12px) or 0; every radius to
 * --o3-radius (4) / --o3-radius-card (8) / --o3-radius-pill; every interactive
 * control height to --o3-control-h-standard (32px). No off-grid (no 5/6/9/10/11px).
 *
 * Library layers (single sources of truth):
 *   ⭐ Curated L3 : window.__HM_BLOCK_REGISTRY__.blocks (status=published)
 *   📐 Archetype  : window.__HM_ARCHETYPE_REGISTRY__.archetypes (published)
 *   ⚙ Engine      : window.HmBlockEngine.BLOCK_CATALOG (174 × 12 cats)
 * Preview routes through window.Blocks.render (one production render gate).
 *
 * Mounted by 02-state-auth-ui.js into #page-template-demo. window.ModuleStudio.render(el).
 * ==========================================================================*/
(function () {
  'use strict';

  var STYLE_ID = 'module-studio-css';
  var ROOT = 'mstudio';
  var state = { mode: 'assemble', sel: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function engineCatalog() { var be = window.HmBlockEngine; return (be && be.BLOCK_CATALOG) ? be.BLOCK_CATALOG : {}; }
  function l3Blocks() {
    var r = window.__HM_BLOCK_REGISTRY__;
    return (r && Array.isArray(r.blocks)) ? r.blocks.filter(function (b) { return b && b.status === 'published'; }) : [];
  }
  function l4Archetypes() {
    var r = window.__HM_ARCHETYPE_REGISTRY__;
    return (r && Array.isArray(r.archetypes)) ? r.archetypes.filter(function (a) { return a && a.status === 'published'; }) : [];
  }
  function groupEngineByCategory() {
    var cat = engineCatalog(), g = {};
    Object.keys(cat).forEach(function (k) {
      var b = cat[k] || {}, c = b.category || 'other';
      (g[c] = g[c] || []).push({ key: k, label: b.label || k, icon: b.icon || '▫' });
    });
    return g;
  }

  /* ── styles: STRICT on-grid, token-bound ─────────────────────────────────
     spacing → --o3-space(8) | --o3-space-section(12) | 0
     radius  → --o3-radius(4) | --o3-radius-card(8) | --o3-radius-pill
     control → --o3-control-h-standard(32) */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) { return; }
    var sp = 'var(--o3-space,8px)', sc = 'var(--o3-space-section,12px)', rd = 'var(--o3-radius,4px)',
        rc = 'var(--o3-radius-card,8px)', pill = 'var(--o3-radius-pill,999px)', ch = 'var(--o3-control-h-standard,32px)',
        sf = 'var(--o3-surface-card,#fff)', sfm = 'var(--o3-surface-muted,#f1f5f9)',
        bsub = 'var(--o3-border-subtle,#e5e7eb)', bdef = 'var(--o3-border-default,#cbd5e1)',
        ts = 'var(--o3-text-strong,#0f172a)', td = 'var(--o3-text-default,#475569)', tm = 'var(--o3-text-muted,#94a3b8)',
        br = 'var(--o3-brand,#0c4a6e)', brs = 'var(--o3-brand-soft,#e0f2fe)',
        ok = 'var(--o3-success,#15803d)', oks = 'var(--o3-success-soft,#dcfce7)',
        sh = 'var(--o3-shadow-card,0 1px 2px rgba(15,23,42,.06))';
    var R = '.' + ROOT;
    var css =
      R + '{display:flex;flex-direction:column;height:100%;min-height:calc(100vh - 130px);color:' + ts + ';font-size:13px}' +
      R + '__bar{display:flex;align-items:center;gap:' + sp + ';padding:' + sp + ' ' + sc + ';background:' + sf + ';border-bottom:1px solid ' + bsub + ';flex:0 0 auto}' +
      R + '__title{font-weight:800;font-size:15px;display:flex;align-items:center;gap:' + sp + '}' +
      R + '__modes{display:flex;gap:' + sp + ';margin-left:' + sp + '}' +
      R + '__mode{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bsub + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:13px;font-weight:600;color:' + td + ';display:inline-flex;align-items:center;gap:' + sp + '}' +
      R + '__mode.is-on{background:' + br + ';color:#fff;border-color:' + br + '}' +
      R + '__act{margin-left:auto;display:flex;gap:' + sp + ';align-items:center}' +
      R + '__btn{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bdef + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:12px;color:' + ts + '}' +
      R + '__btn--pri{background:' + br + ';border-color:' + br + ';color:#fff;font-weight:600}' +
      R + '__body{flex:1;min-height:0;display:grid;grid-template-columns:248px 1fr 312px}' +
      R + '__col{min-height:0;overflow:auto}' +
      R + '__lib{border-right:1px solid ' + bsub + ';background:' + sf + '}' +
      R + '__search{position:sticky;top:0;background:' + sf + ';padding:' + sp + ' ' + sc + ';border-bottom:1px solid ' + bsub + ';z-index:1}' +
      R + '__in{height:' + ch + ';width:100%;box-sizing:border-box;border:1px solid ' + bdef + ';border-radius:' + rd + ';padding:0 ' + sc + ';font:inherit;font-size:12px;background:' + sf + ';color:' + ts + '}' +
      R + '__cat{padding:' + sp + ' ' + sc + ' 0;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:' + tm + '}' +
      R + '__cat--sub{padding:' + sp + ' ' + sc + ' 0}' +
      R + '__blk{display:flex;align-items:center;gap:' + sp + ';cursor:pointer;padding:' + sp + ' ' + sc + ';font-size:12px;color:' + ts + '}' +
      R + '__blk:hover{background:' + brs + '}' +
      R + '__blk.is-sel{background:' + brs + ';box-shadow:inset ' + sp + ' 0 0 ' + br + ' inset}' +
      R + '__blk.is-sel{box-shadow:inset 3px 0 0 ' + br + '}' +
      R + '__blk .ic{width:24px;text-align:center}' +
      R + '__blk .nm{flex:1;line-height:1.3}' + R + '__blk .nm small{display:block;color:' + tm + ';font-size:10px}' +
      R + '__bd{display:inline-flex;align-items:center;height:16px;padding:0 ' + sp + ';border-radius:' + pill + ';font-size:9px;font-weight:700;text-transform:uppercase}' +
      R + '__bd--ssot{background:' + oks + ';color:' + ok + '}' +
      R + '__bd--l4{background:' + brs + ';color:' + br + '}' +
      R + '__cv{background:' + sfm + ';padding:' + sp + '}' +
      R + '__surf{background:' + sf + ';border:1px solid ' + bsub + ';border-radius:' + rc + ';padding:' + sc + ';min-height:200px}' +
      R + '__hint{color:' + tm + ';font-size:12px;text-align:center;padding:' + sc + '}' +
      R + '__zone{border:1px dashed ' + bdef + ';border-radius:' + rd + ';margin-bottom:' + sp + ';overflow:hidden}' +
      R + '__zlbl{font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:' + tm + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px dashed ' + bsub + '}' +
      R + '__zbody{padding:' + sp + ' ' + sc + ';font-size:11px;color:' + td + '}' +
      R + '__insp{border-left:1px solid ' + bsub + ';background:' + sf + '}' +
      R + '__insp .hd{position:sticky;top:0;background:' + sf + ';border-bottom:1px solid ' + bsub + ';padding:' + sp + ' ' + sc + ';font-size:11px;color:' + tm + '}' +
      R + '__insp .bd{padding:' + sp + '}' +
      R + '__f{margin-bottom:' + sc + '}' +
      R + '__f label{display:block;font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:' + tm + ';margin-bottom:' + sp + '}' +
      R + '__pill{display:inline-flex;align-items:center;height:' + sc + ';padding:0 ' + sp + ';border-radius:' + pill + ';font-size:10px;font-weight:800;letter-spacing:.4px;background:' + brs + ';color:' + br + '}' +
      R + '__chip{display:inline-flex;align-items:center;height:24px;padding:0 ' + sp + ';margin:0 ' + sp + ' ' + sp + ' 0;border:1px solid ' + bsub + ';border-radius:' + pill + ';font-size:11px;background:' + sfm + '}' +
      R + '__note{font-size:11px;line-height:1.5;color:' + td + ';background:' + sfm + ';border:1px solid ' + bsub + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + ';margin-top:' + sp + '}';
    var el = document.createElement('style');
    el.id = STYLE_ID; el.textContent = css; document.head.appendChild(el);
  }

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
      l3.forEach(function (b) { h += blkRow('l3', b.block_key, (b.display_name_vi || b.block_key), b.block_key, '🧱', '<span class="' + ROOT + '__bd ' + ROOT + '__bd--ssot">ssot</span>'); });
    }
    var l4 = l4Archetypes();
    if (l4.length) {
      h += '<div class="' + ROOT + '__cat">📐 Archetype · L4 · ' + l4.length + '</div>';
      l4.forEach(function (a) { h += blkRow('l4', a.archetype_key, (a.display_name_vi || a.archetype_key), a.archetype_key, '▱', '<span class="' + ROOT + '__bd ' + ROOT + '__bd--l4">l4</span>'); });
    }
    var g = groupEngineByCategory(), cats = Object.keys(g).sort();
    h += '<div class="' + ROOT + '__cat">⚙ Engine catalog · ' + Object.keys(engineCatalog()).length + '</div>';
    cats.forEach(function (c) {
      h += '<div class="' + ROOT + '__cat ' + ROOT + '__cat--sub">' + esc(c) + ' · ' + g[c].length + '</div>';
      g[c].forEach(function (b) { h += blkRow('engine', b.key, b.label, b.key, b.icon, ''); });
    });
    return h;
  }

  function safeRender(key) {
    try { if (window.Blocks && typeof window.Blocks.render === 'function') { return window.Blocks.render(key, {}, { preview: true }) || ''; } } catch (e) { /* noop */ }
    return '';
  }
  function renderCanvas() {
    var s = state.sel;
    if (!s) { return '<div class="' + ROOT + '__surf"><div class="' + ROOT + '__hint">Chọn một mục ở thư viện trái: ⭐ block L3, 📐 archetype L4, hoặc ⚙ engine block. Preview render qua window.Blocks.render.</div></div>'; }
    if (s.kind === 'l4') {
      var zones = (s.data && s.data.zones) ? s.data.zones : {};
      var zh = Object.keys(zones).map(function (z) {
        var v = zones[z], allowed = Array.isArray(v) ? v.join(', ') : (v && v.allowed ? [].concat(v.allowed).join(', ') : '');
        return '<div class="' + ROOT + '__zone"><div class="' + ROOT + '__zlbl">zone: ' + esc(z) + '</div><div class="' + ROOT + '__zbody">' + (allowed ? 'blocks: ' + esc(allowed) : '—') + '</div></div>';
      }).join('');
      return '<div class="' + ROOT + '__surf">' + (zh || '<div class="' + ROOT + '__hint">Archetype không khai báo zones.</div>') + '</div>';
    }
    var inner = safeRender(s.key);
    if (!inner) { var m = (s.kind === 'engine') ? (engineCatalog()[s.key] || {}) : {}; inner = '<div class="' + ROOT + '__hint">' + esc(m.icon || '🧱') + ' ' + esc(m.label || s.key) + '<br><small>' + esc(s.key) + '</small></div>'; }
    return '<div class="' + ROOT + '__surf">' + inner + '</div>';
  }

  function chips(arr) {
    if (!arr || !arr.length) { return '<span class="' + ROOT + '__chip">—</span>'; }
    return arr.map(function (x) { return '<span class="' + ROOT + '__chip">' + esc(x) + '</span>'; }).join('');
  }
  function renderInspector() {
    var s = state.sel;
    if (!s) { return '<div class="hd">chưa chọn</div><div class="bd"><div class="' + ROOT + '__note">Chọn mục để xem ' + (state.mode === 'author' ? 'định nghĩa (Author)' : 'thuộc tính (Assemble)') + '.</div></div>'; }
    if (s.kind === 'l3') {
      var b = s.data || {}, slots = b.slots ? Object.keys(b.slots) : [], a11y = b.a11y_contract ? JSON.stringify(b.a11y_contract) : '—';
      return '<div class="hd">' + (state.mode === 'author' ? 'L3' : 'Assemble') + ' ▸ ' + esc(s.key) + '</div><div class="bd">' +
        '<div class="' + ROOT + '__f"><span class="' + ROOT + '__pill">' + (state.mode === 'author' ? 'L3 · BLOCK CONTRACT' : 'ASSEMBLE · L3') + '</span></div>' +
        '<div class="' + ROOT + '__f"><label>block_key</label>' + chips([s.key]) + '</div>' +
        '<div class="' + ROOT + '__f"><label>composed_of (L2)</label>' + chips(b.composed_of) + '</div>' +
        '<div class="' + ROOT + '__f"><label>slots</label>' + chips(slots) + '</div>' +
        '<div class="' + ROOT + '__f"><label>required_tokens</label>' + chips(b.required_tokens) + '</div>' +
        '<div class="' + ROOT + '__f"><label>a11y</label><div class="' + ROOT + '__note">' + esc(a11y) + '</div></div>' +
        (state.mode === 'author' ? '<div class="' + ROOT + '__note">Sửa contract qua graphics_block_contract_save (backend). Khi sẵn, các field trên editable.</div>' : '<div class="' + ROOT + '__note">Assemble: chỉ gán slot/data, không sửa định nghĩa.</div>') + '</div>';
    }
    if (s.kind === 'l4') {
      var a = s.data || {};
      return '<div class="hd">L4 ▸ ' + esc(s.key) + '</div><div class="bd">' +
        '<div class="' + ROOT + '__f"><span class="' + ROOT + '__pill">L4 · ARCHETYPE</span></div>' +
        '<div class="' + ROOT + '__f"><label>zones</label>' + chips(a.zones ? Object.keys(a.zones) : []) + '</div>' +
        '<div class="' + ROOT + '__f"><label>required_blocks</label>' + chips(a.required_blocks) + '</div>' +
        '<div class="' + ROOT + '__f"><label>forbidden_patterns</label>' + chips(a.forbidden_patterns) + '</div>' +
        '<div class="' + ROOT + '__note">Tạo module = chọn archetype → gán block published vào từng zone → bind data.</div></div>';
    }
    var meta = engineCatalog()[s.key] || {};
    return '<div class="hd">' + (state.mode === 'author' ? 'Engine' : 'Assemble') + ' ▸ ' + esc(s.key) + '</div><div class="bd">' +
      '<div class="' + ROOT + '__f"><span class="' + ROOT + '__pill">' + (state.mode === 'author' ? 'ENGINE (chưa curate L3)' : 'ASSEMBLE') + '</span></div>' +
      '<div class="' + ROOT + '__f"><label>type</label>' + chips([s.key]) + '</div>' +
      '<div class="' + ROOT + '__f"><label>nhãn</label><div>' + esc(meta.label || s.key) + '</div></div>' +
      '<div class="' + ROOT + '__f"><label>category</label>' + chips([meta.category || 'other']) + '</div>' +
      (state.mode === 'author' ? '<div class="' + ROOT + '__note">Block engine chưa curate L3. Muốn governed → đăng ký graphics_block_contract rồi nó lên ⭐ Curated.</div>' : '<div class="' + ROOT + '__note">Assemble: gán slot/data; không gõ hex/px.</div>') + '</div>';
  }

  function shellHtml() {
    return '<div class="' + ROOT + '__bar">' +
        '<span class="' + ROOT + '__title">🧩 Module Studio · Lego Block Master</span>' +
        '<div class="' + ROOT + '__modes">' +
          '<button class="' + ROOT + '__mode' + (state.mode === 'assemble' ? ' is-on' : '') + '" data-ms="mode" data-mode="assemble">⬡ Assemble</button>' +
          '<button class="' + ROOT + '__mode' + (state.mode === 'author' ? ' is-on' : '') + '" data-ms="mode" data-mode="author">✎ Author</button>' +
        '</div>' +
        '<div class="' + ROOT + '__act"><button class="' + ROOT + '__btn" data-ms="simulate">Mô phỏng</button></div>' +
      '</div>' +
      '<div class="' + ROOT + '__body">' +
        '<div class="' + ROOT + '__col ' + ROOT + '__lib" data-ms="libcol">' + renderLibrary() + '</div>' +
        '<div class="' + ROOT + '__col ' + ROOT + '__cv" data-ms="cvcol">' + renderCanvas() + '</div>' +
        '<div class="' + ROOT + '__col ' + ROOT + '__insp" data-ms="inspcol">' + renderInspector() + '</div>' +
      '</div>';
  }
  function refresh(host) {
    var lib = host.querySelector('[data-ms="libcol"]'), cv = host.querySelector('[data-ms="cvcol"]'), insp = host.querySelector('[data-ms="inspcol"]');
    if (lib) { lib.innerHTML = renderLibrary(); }
    if (cv) { cv.innerHTML = renderCanvas(); }
    if (insp) { insp.innerHTML = renderInspector(); }
    host.querySelectorAll('[data-ms="mode"]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-mode') === state.mode); });
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
    /* edge-to-edge: drop the host page container's 24px gutter (no orphan gutters,
       per HESEM space-utilization rule). Removal only — not a tunable gap. */
    el.style.padding = '0';
    el.innerHTML = shellHtml();
    el.addEventListener('click', function (ev) {
      var t = (ev.target && ev.target.closest) ? ev.target.closest('[data-ms]') : null;
      if (!t || !el.contains(t)) { return; }
      var kind = t.getAttribute('data-ms');
      if (kind === 'mode') { state.mode = t.getAttribute('data-mode') || 'assemble'; refresh(el); }
      else if (kind === 'sel') { var k = t.getAttribute('data-kind'), key = t.getAttribute('data-key'); state.sel = { kind: k, key: key, data: lookup(k, key) }; refresh(el); }
      else if (kind === 'simulate') {
        try { if (window.GraphicsAuthority && window.GraphicsAuthority.preview && window.GraphicsAuthority.preview.simulate) { window.GraphicsAuthority.preview.simulate(); return; } } catch (e) { /* noop */ }
        if (typeof window.showToast === 'function') { window.showToast('Mô phỏng: cần Graphics Authority preview (sẽ bind khi đủ).', 'info'); }
      }
    });
    el.addEventListener('input', function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute || t.getAttribute('data-ms') !== 'search') { return; }
      var q = String(t.value || '').trim().toLowerCase();
      el.querySelectorAll('[data-ms="sel"]').forEach(function (row) {
        row.style.display = (!q || row.textContent.toLowerCase().indexOf(q) >= 0) ? '' : 'none';
      });
    });
    return el;
  }

  window.ModuleStudio = { render: render, setMode: function (m) { state.mode = (m === 'author') ? 'author' : 'assemble'; }, _state: state, version: '0.3.0-ssot' };
})();
