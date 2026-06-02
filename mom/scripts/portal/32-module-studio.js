/* ============================================================================
 * 32-module-studio.js — Module Studio  v0.4 (A↔B integration)
 * ----------------------------------------------------------------------------
 * Functional Module Studio with 3 surfaces, all wired to backend (Session B):
 *   🧱 Lego   — Lego Block Master (L3/L4/Engine library + Assemble/Author + drill-down,
 *               Author edits/saves L3 contract via graphics_block_contract_save)
 *   📦 Modules — list / create / soft-delete / restore / version-history via
 *               module_schema_{list,get,save,delete,restore,versions,restore_version}
 *   🎨 Theme  — preset list / apply (LegoTheme) / clone via graphics_theme_preset_{list,save}
 *
 * SSOT: every gap/padding = --o3-space(8)/--o3-space-section(12)/0; control = 32;
 * radius 4/8/pill; colors = --o3-* tokens. No hardcoded hex/px authority.
 * Writes go through window.apiCall (CSRF-safe); reads via fetch.
 * Mounted by 02-state-auth-ui.js into #page-template-demo. window.ModuleStudio.render(el).
 * ==========================================================================*/
(function () {
  'use strict';

  var STYLE_ID = 'module-studio-css';
  var ROOT = 'mstudio';
  var state = {
    surface: 'lego',        // 'lego' | 'modules' | 'presets' | 'settings' | 'governance' | 'reference'
    mode: 'assemble',       // lego mode: 'assemble' | 'author'
    sel: null,              // lego selection { kind, key, data }
    modules: null,          // cached module list
    presets: null,          // cached theme presets
    demo: null,             // { byType:{engineType→config} } harvested from Lego Showcase
    editing: null,          // { kind:'module'|'theme', id, draft } inline edit buffer
    includeDeleted: false,  // module list filter — SSOT for the archive checkbox
    msg: ''                 // transient status line
  };
  var hostEl = null;

  /* ── Surface registry (v2 parallelization) ───────────────────────────────
     External files (32a/32b/32c-mstudio-*.js) register or REPLACE a surface from
     their own file via window.MStudio.registerSurface(key, def) — so parallel
     sessions never edit this shell or each other's files. A registered surface:
       { label, icon, render():string, onMount(host), onAction(key,target,ev):bool,
         order:number }
     onAction returns true when it fully handled the click (shell then stops). The
     built-in surfaces below remain as fallback until each is migrated out. */
  window.MStudio = window.MStudio || {};
  var SURFACE_META = {
    lego:       { label: '🧱 Lego',          order: 10 },
    modules:    { label: '📦 Modules',        order: 30 },
    presets:    { label: '🎨 Presets',        order: 40 },
    settings:   { label: '⚙ Settings',        order: 45 },
    governance: { label: '🏛 Governance',     order: 47 },
    reference:  { label: '📖 Tham chiếu',     order: 50 },
    // Legacy aliases — hidden from tab bar; navigating to them redirects silently
    tokens: { label: '🎛️ Tokens', order: 20, hidden: true, redirectTo: 'lego' },
    theme:  { label: '🎨 Theme',  order: 40, hidden: true, redirectTo: 'presets' }
  };
  window.MStudio._ext = window.MStudio._ext || {};
  window.MStudio.registerSurface = function (key, def) {
    if (!key) { return; }
    window.MStudio._ext[key] = def || {};
    if (hostEl) { paint(); }
  };
  function extSurface(key) { return window.MStudio._ext[key]; }
  function surfaceList() {
    var keys = {}; Object.keys(SURFACE_META).forEach(function (k) { keys[k] = true; });
    Object.keys(window.MStudio._ext).forEach(function (k) { keys[k] = true; });
    return Object.keys(keys).sort(function (a, b) {
      var oa = (extSurface(a) && extSurface(a).order != null) ? extSurface(a).order : (SURFACE_META[a] ? SURFACE_META[a].order : 999);
      var ob = (extSurface(b) && extSurface(b).order != null) ? extSurface(b).order : (SURFACE_META[b] ? SURFACE_META[b].order : 999);
      return oa - ob;
    }).filter(function (k) { var e = extSurface(k); var m = SURFACE_META[k]; return !(e && e.hidden) && !(m && m.hidden); });
  }
  function surfaceLabel(key) {
    var e = extSurface(key); if (e && e.label) { return e.label; }
    return SURFACE_META[key] ? SURFACE_META[key].label : key;
  }

  /* L3 curated block_key → representative engine type(s) to borrow demo content
     from, so the canvas paints a populated preview (L3 and its engine equivalent
     are visually identical — L3 is the curated wrapper). */
  var L3_DEMO_ALIAS = {
    'kpi.grid': ['kpi-row', 'kpi-grid', 'metric-strip'],
    'table.data': ['data-table', 'advanced-table', 'table', 'record-table'],
    'toolbar.filtered': ['filter-bar', 'toolbar', 'action-toolbar', 'search-toolbar'],
    'panel.standard': ['card', 'card-container', 'section-card', 'info-card'],
    'empty.state': ['empty-state', 'empty'],
    'shell.workspace': ['two-column', 'three-column', 'workspace']
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(m, t) { try { if (typeof window.showToast === 'function') { window.showToast(m, t || 'info'); } } catch (e) { /* noop */ } state.msg = m; }
  function getJson(action, qs) {
    return fetch('/mom/api/index.php?action=' + action + (qs || ''), { cache: 'no-store' })
      .then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function post(action, body) {
    if (typeof window.apiCall === 'function') { return window.apiCall(action, body || {}, 'POST'); }
    return Promise.reject(new Error('apiCall unavailable'));
  }
  function engineCatalog() { var be = window.HmBlockEngine; return (be && be.BLOCK_CATALOG) ? be.BLOCK_CATALOG : {}; }
  function l3Blocks() { var r = window.__HM_BLOCK_REGISTRY__; return (r && Array.isArray(r.blocks)) ? r.blocks.filter(function (b) { return b && b.status === 'published'; }) : []; }
  function l4Archetypes() { var r = window.__HM_ARCHETYPE_REGISTRY__; return (r && Array.isArray(r.archetypes)) ? r.archetypes.filter(function (a) { return a && a.status === 'published'; }) : []; }
  function groupEngineByCategory() {
    var cat = engineCatalog(), g = {};
    Object.keys(cat).forEach(function (k) { var b = cat[k] || {}, c = b.category || 'other'; (g[c] = g[c] || []).push({ key: k, label: b.label || k, icon: b.icon || '▫' }); });
    return g;
  }

  /* ── styles (strict on-grid, token-bound) ────────────────────────────── */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) { return; }
    var sp = 'var(--o3-space,8px)', sc = 'var(--o3-space-section,12px)', rd = 'var(--o3-radius,4px)',
        rc = 'var(--o3-radius-card,8px)', pill = 'var(--o3-radius-pill,999px)', ch = 'var(--o3-control-h-standard,32px)',
        sf = 'var(--o3-surface-card,#fff)', sfm = 'var(--o3-surface-muted,#f1f5f9)',
        bsub = 'var(--o3-border-subtle,#e5e7eb)', bdef = 'var(--o3-border-default,#cbd5e1)',
        ts = 'var(--o3-text-strong,#0f172a)', td = 'var(--o3-text-default,#475569)', tm = 'var(--o3-text-muted,#94a3b8)',
        br = 'var(--o3-brand,#0c4a6e)', brs = 'var(--o3-brand-soft,#e0f2fe)',
        ok = 'var(--o3-success,#15803d)', oks = 'var(--o3-success-soft,#dcfce7)',
        wn = 'var(--o3-warning,#b45309)', wns = 'var(--o3-warning-soft,#fef3c7)',
        dg = 'var(--o3-danger,#b91c1c)', dgs = 'var(--o3-danger-soft,#fee2e2)',
        sh = 'var(--o3-shadow-card,0 1px 2px rgba(15,23,42,.06))';
    var R = '.' + ROOT;
    var css =
      R + '{display:flex;flex-direction:column;height:100%;min-height:calc(100vh - 130px);color:' + ts + ';font-size:13px;border-left:1px solid ' + bsub + '}' +
      R + '__bar{display:flex;align-items:center;gap:' + sp + ';padding:' + sp + ' ' + sc + ';background:' + sf + ';border-bottom:1px solid ' + bsub + ';flex:0 0 auto;flex-wrap:wrap}' +
      R + '__title{font-weight:800;font-size:15px;display:flex;align-items:center;gap:' + sp + '}' +
      R + '__surfaces{display:flex;gap:' + sp + ';margin-left:' + sp + '}' +
      R + '__surf-tab{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bsub + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:13px;font-weight:600;color:' + td + '}' +
      R + '__surf-tab.is-on{background:' + br + ';color:#fff;border-color:' + br + '}' +
      R + '__modes{display:flex;gap:' + sp + ';margin-left:' + sp + '}' +
      R + '__mode{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bsub + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:13px;font-weight:600;color:' + td + '}' +
      R + '__mode.is-on{background:' + br + ';color:#fff;border-color:' + br + '}' +
      R + '__act{margin-left:auto;display:flex;gap:' + sp + ';align-items:center}' +
      R + '__btn{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bdef + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:12px;color:' + ts + ';display:inline-flex;align-items:center;gap:' + sp + '}' +
      R + '__btn:hover{background:' + sfm + '}' +
      R + '__btn--pri{background:' + br + ';border-color:' + br + ';color:#fff;font-weight:600}' +
      R + '__btn--pri:hover{background:' + br + ';filter:brightness(.94)}' +
      R + '__btn--dgr{color:' + dg + ';border-color:' + dg + '}' +
      /* --sm keeps the single-standard control height (32); only padding/font tighten (no off-grid height literal) */
      R + '__btn--sm{padding:0 ' + sp + ';font-size:11px}' +
      R + '__body{flex:1;min-height:0;display:grid;grid-template-columns:248px 1fr 312px}' +
      R + '__body--single{display:block;overflow:auto}' +
      R + '__col{min-height:0;overflow:auto}' +
      R + '__lib{border-right:1px solid ' + bsub + ';background:' + sf + '}' +
      R + '__search{position:sticky;top:0;background:' + sf + ';padding:' + sp + ' ' + sc + ';border-bottom:1px solid ' + bsub + ';z-index:1}' +
      R + '__in{height:' + ch + ';width:100%;box-sizing:border-box;border:1px solid ' + bdef + ';border-radius:' + rd + ';padding:0 ' + sc + ';font:inherit;font-size:12px;background:' + sf + ';color:' + ts + '}' +
      R + '__cat{padding:' + sp + ' ' + sc + ' 0;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:' + tm + '}' +
      R + '__blk{display:flex;align-items:center;gap:' + sp + ';cursor:pointer;padding:' + sp + ' ' + sc + ';font-size:12px;color:' + ts + '}' +
      R + '__blk:hover{background:' + brs + '}' +
      R + '__blk.is-sel{background:' + brs + ';box-shadow:inset 3px 0 0 ' + br + '}' +
      R + '__blk .ic{width:24px;text-align:center}' + R + '__blk .nm{flex:1;line-height:1.3}' + R + '__blk .nm small{display:block;color:' + tm + ';font-size:10px}' +
      R + '__bd{display:inline-flex;align-items:center;height:16px;padding:0 ' + sp + ';border-radius:' + pill + ';font-size:9px;font-weight:700;text-transform:uppercase}' +
      R + '__bd--ssot{background:' + oks + ';color:' + ok + '}' + R + '__bd--l4{background:' + brs + ';color:' + br + '}' +
      R + '__cv{background:' + sfm + ';padding:' + sp + '}' +
      R + '__surfbox{background:' + sf + ';border:1px solid ' + bsub + ';border-radius:' + rc + ';padding:' + sp + ';min-height:200px}' +
      R + '__hint{color:' + tm + ';font-size:12px;text-align:center;padding:' + sc + '}' +
      R + '__zone{border:1px dashed ' + bdef + ';border-radius:' + rd + ';margin-bottom:' + sp + ';overflow:hidden}' +
      R + '__zlbl{font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:' + tm + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px dashed ' + bsub + '}' +
      R + '__zbody{padding:' + sp + ' ' + sc + ';font-size:11px;color:' + td + '}' +
      R + '__insp{border-left:1px solid ' + bsub + ';background:' + sf + '}' +
      R + '__insp .hd{position:sticky;top:0;background:' + sf + ';border-bottom:1px solid ' + bsub + ';padding:' + sp + ' ' + sc + ';font-size:11px;color:' + tm + '}' +
      R + '__insp .bd{padding:' + sp + '}' +
      R + '__f{margin-bottom:' + sc + '}' + R + '__f label{display:block;font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:' + tm + ';margin-bottom:' + sp + '}' +
      R + '__pill{display:inline-flex;align-items:center;height:' + sc + ';padding:0 ' + sp + ';border-radius:' + pill + ';font-size:10px;font-weight:800;letter-spacing:.4px;background:' + brs + ';color:' + br + '}' +
      R + '__chip{display:inline-flex;align-items:center;height:24px;padding:0 ' + sp + ';margin:0 ' + sp + ' ' + sp + ' 0;border:1px solid ' + bsub + ';border-radius:' + pill + ';font-size:11px;background:' + sfm + '}' +
      R + '__note{font-size:11px;line-height:1.5;color:' + td + ';background:' + sfm + ';border:1px solid ' + bsub + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + ';margin-top:' + sp + '}' +
      /* table for Modules/Theme surfaces */
      R + '__pad{padding:' + sc + '}' +
      R + '__tbl{width:100%;border-collapse:collapse;font-size:12px;background:' + sf + ';border:1px solid ' + bsub + ';border-radius:' + rc + ';overflow:hidden}' +
      R + '__tbl th{text-align:left;font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:' + tm + ';background:' + sfm + ';padding:' + sp + ' ' + sc + ';border-bottom:1px solid ' + bsub + '}' +
      R + '__tbl td{padding:' + sp + ' ' + sc + ';border-bottom:1px solid ' + bsub + ';vertical-align:middle}' +
      R + '__tbl tr:last-child td{border-bottom:0}' +
      R + '__st{display:inline-flex;align-items:center;height:20px;padding:0 ' + sp + ';border-radius:' + pill + ';font-size:11px;font-weight:600}' +
      R + '__st--active{background:' + oks + ';color:' + ok + '}' + R + '__st--deleted{background:' + dgs + ';color:' + dg + '}' + R + '__st--draft{background:' + wns + ';color:' + wn + '}' +
      R + '__sw{width:20px;height:20px;border-radius:' + rd + ';border:1px solid ' + bdef + ';display:inline-block;vertical-align:middle;margin-right:' + sp + '}' +
      R + '__toolbar{display:flex;gap:' + sp + ';align-items:center;margin-bottom:' + sc + ';flex-wrap:wrap}' +
      /* modal overlay */
      R + '__mback{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9100;display:flex;align-items:center;justify-content:center}' +
      R + '__modal{background:' + sf + ';border-radius:' + rc + ';box-shadow:0 8px 32px rgba(15,23,42,.22);padding:' + sc + ';min-width:440px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto}' +
      R + '__modal-hd{font-size:14px;font-weight:800;color:' + ts + ';margin-bottom:' + sc + '}' +
      R + '__modal-ft{display:flex;gap:' + sp + ';margin-top:' + sc + ';justify-content:flex-end}' +
      R + '__modal .mstudio__in{appearance:none;-webkit-appearance:none;transition:none}';
    var el = document.createElement('style'); el.id = STYLE_ID; el.textContent = css; document.head.appendChild(el);
  }

  /* ── LEGO surface ────────────────────────────────────────────────────── */
  function blkRow(kind, key, label, sub, icon, badge) {
    var sel = (state.sel && state.sel.kind === kind && state.sel.key === key) ? ' is-sel' : '';
    return '<div class="' + ROOT + '__blk' + sel + '" data-ms="sel" data-kind="' + kind + '" data-key="' + esc(key) + '">' +
      '<span class="ic">' + esc(icon || '▫') + '</span><span class="nm">' + esc(label) + '<small>' + esc(sub) + '</small></span>' + (badge || '') + '</div>';
  }
  function renderLibrary() {
    var h = '<div class="' + ROOT + '__search"><input class="' + ROOT + '__in" data-ms="search" placeholder="🔍 Thư viện Lego"></div>';
    var l3 = l3Blocks();
    if (l3.length) { h += '<div class="' + ROOT + '__cat">⭐ Curated · L3 SSOT · ' + l3.length + '</div>'; l3.forEach(function (b) { h += blkRow('l3', b.block_key, (b.display_name_vi || b.block_key), b.block_key, '🧱', '<span class="' + ROOT + '__bd ' + ROOT + '__bd--ssot">ssot</span>'); }); }
    var l4 = l4Archetypes();
    if (l4.length) { h += '<div class="' + ROOT + '__cat">📐 Archetype · L4 · ' + l4.length + '</div>'; l4.forEach(function (a) { h += blkRow('l4', a.archetype_key, (a.display_name_vi || a.archetype_key), a.archetype_key, '▱', '<span class="' + ROOT + '__bd ' + ROOT + '__bd--l4">l4</span>'); }); }
    var g = groupEngineByCategory(), cats = Object.keys(g).sort();
    h += '<div class="' + ROOT + '__cat">⚙ Engine catalog · ' + Object.keys(engineCatalog()).length + '</div>';
    cats.forEach(function (c) { h += '<div class="' + ROOT + '__cat">' + esc(c) + ' · ' + g[c].length + '</div>'; g[c].forEach(function (b) { h += blkRow('engine', b.key, b.label, b.key, b.icon, ''); }); });
    return h;
  }
  /* Demo content harvested from the Lego Showcase module so previews paint
     realistic graphics instead of empty shells. Returns the engine type to
     render + the demo config to feed it, for a given selection. */
  function demoTypeAndConfig(kind, key) {
    var byType = (state.demo && state.demo.byType) || {};
    if (kind === 'engine') { return { type: key, cfg: byType[key] || {} }; }
    if (kind === 'l3') {
      var cands = L3_DEMO_ALIAS[key] || [];
      for (var i = 0; i < cands.length; i++) { if (byType[cands[i]]) { return { type: cands[i], cfg: byType[cands[i]] }; } }
      // fall back to rendering the L3 by its own key (structural shell)
      return { type: key, cfg: {} };
    }
    return { type: key, cfg: {} };
  }
  function safeRender(type, cfg) {
    try { if (window.Blocks && typeof window.Blocks.render === 'function') { return window.Blocks.render(type, cfg || {}, { preview: true }) || ''; } } catch (e) { /* noop */ }
    return '';
  }
  function renderCanvas() {
    var s = state.sel;
    if (!s) { return '<div class="' + ROOT + '__surfbox"><div class="' + ROOT + '__hint">Chọn một block ở thư viện trái để xem đồ họa thật.</div></div>'; }
    if (s.kind === 'l4') {
      var zones = (s.data && s.data.zones) ? s.data.zones : {};
      var zh = Object.keys(zones).map(function (z) { var v = zones[z], a = Array.isArray(v) ? v.join(', ') : (v && v.allowed ? [].concat(v.allowed).join(', ') : ''); return '<div class="' + ROOT + '__zone"><div class="' + ROOT + '__zlbl">zone: ' + esc(z) + '</div><div class="' + ROOT + '__zbody">' + (a ? 'blocks: ' + esc(a) : '—') + '</div></div>'; }).join('');
      return '<div class="' + ROOT + '__surfbox">' + (zh || '<div class="' + ROOT + '__hint">Archetype không khai báo zones.</div>') + '</div>';
    }
    var loading = (state.demo == null) ? '<div class="' + ROOT + '__hint" style="padding:0 0 ' + 'var(--o3-space,8px)' + '">Đang nạp demo…</div>' : '';
    var tc = demoTypeAndConfig(s.kind, s.key);
    var inner = safeRender(tc.type, tc.cfg);
    if (!inner) { var m = (s.kind === 'engine') ? (engineCatalog()[s.key] || {}) : {}; inner = '<div class="' + ROOT + '__hint">' + esc(m.icon || '🧱') + ' ' + esc(m.label || s.key) + '<br><small>' + esc(s.key) + '</small></div>'; }
    return '<div class="' + ROOT + '__surfbox">' + loading + inner + '</div>';
  }
  function chips(arr) { if (!arr || !arr.length) { return '<span class="' + ROOT + '__chip">—</span>'; } return arr.map(function (x) { return '<span class="' + ROOT + '__chip">' + esc(x) + '</span>'; }).join(''); }
  function renderInspector() {
    var s = state.sel;
    if (!s) { return '<div class="hd">chưa chọn</div><div class="bd"><div class="' + ROOT + '__note">Chọn mục để xem ' + (state.mode === 'author' ? 'định nghĩa (Author)' : 'thuộc tính (Assemble)') + '.</div></div>'; }
    if (s.kind === 'l3') {
      var b = s.data || {}, slots = b.slots ? Object.keys(b.slots) : [], a11y = b.a11y_contract ? JSON.stringify(b.a11y_contract) : '—';
      var editable = state.mode === 'author';
      var body = '<div class="' + ROOT + '__f"><span class="' + ROOT + '__pill">' + (editable ? 'L3 · BLOCK CONTRACT (Author)' : 'ASSEMBLE · L3') + '</span></div>' +
        '<div class="' + ROOT + '__f"><label>block_key</label>' + chips([s.key]) + '</div>';
      if (editable) {
        body += '<div class="' + ROOT + '__f"><label>Tên hiển thị (VI)</label><input class="' + ROOT + '__in" data-ms="edit-name" value="' + esc(b.display_name_vi || '') + '"></div>' +
          '<div class="' + ROOT + '__f"><label>Trạng thái</label><select class="' + ROOT + '__in" data-ms="edit-status">' +
          ['published', 'draft', 'deprecated'].map(function (o) { return '<option value="' + o + '"' + ((b.status === o) ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>';
      }
      body += '<div class="' + ROOT + '__f"><label>composed_of (L2)</label>' + chips(b.composed_of) + '</div>' +
        '<div class="' + ROOT + '__f"><label>slots</label>' + chips(slots) + '</div>' +
        '<div class="' + ROOT + '__f"><label>required_tokens</label>' + chips(b.required_tokens) + '</div>' +
        '<div class="' + ROOT + '__f"><label>a11y</label><div class="' + ROOT + '__note">' + esc(a11y) + '</div></div>';
      if (editable) { body += '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" data-ms="save-block">Lưu contract (Mô phỏng→Publish)</button><div class="' + ROOT + '__note">Lưu qua graphics_block_contract_save (backend) + ghi audit.</div>'; }
      else { body += '<div class="' + ROOT + '__note">Assemble: chỉ gán slot/data; sang Author để sửa định nghĩa.</div>'; }
      return '<div class="hd">' + (editable ? 'L3' : 'Assemble') + ' ▸ ' + esc(s.key) + '</div><div class="bd">' + body + '</div>';
    }
    if (s.kind === 'l4') {
      var a = s.data || {};
      return '<div class="hd">L4 ▸ ' + esc(s.key) + '</div><div class="bd">' +
        '<div class="' + ROOT + '__f"><span class="' + ROOT + '__pill">L4 · ARCHETYPE</span></div>' +
        '<div class="' + ROOT + '__f"><label>zones</label>' + chips(a.zones ? Object.keys(a.zones) : []) + '</div>' +
        '<div class="' + ROOT + '__f"><label>required_blocks</label>' + chips(a.required_blocks) + '</div>' +
        '<div class="' + ROOT + '__f"><label>forbidden_patterns</label>' + chips(a.forbidden_patterns) + '</div>' +
        '<div class="' + ROOT + '__note">Tạo module từ archetype này ở surface 📦 Modules.</div></div>';
    }
    var meta = engineCatalog()[s.key] || {};
    return '<div class="hd">' + (state.mode === 'author' ? 'Engine' : 'Assemble') + ' ▸ ' + esc(s.key) + '</div><div class="bd">' +
      '<div class="' + ROOT + '__f"><span class="' + ROOT + '__pill">' + (state.mode === 'author' ? 'ENGINE (chưa curate L3)' : 'ASSEMBLE') + '</span></div>' +
      '<div class="' + ROOT + '__f"><label>type</label>' + chips([s.key]) + '</div>' +
      '<div class="' + ROOT + '__f"><label>nhãn</label><div>' + esc(meta.label || s.key) + '</div></div>' +
      '<div class="' + ROOT + '__f"><label>category</label>' + chips([meta.category || 'other']) + '</div>' +
      '<div class="' + ROOT + '__note">Engine block chưa curate L3. Đăng ký graphics_block_contract để lên ⭐ Curated.</div></div>';
  }
  function renderLego() {
    return '<div class="' + ROOT + '__col ' + ROOT + '__lib" data-ms="libcol">' + renderLibrary() + '</div>' +
      '<div class="' + ROOT + '__col ' + ROOT + '__cv" data-ms="cvcol">' + renderCanvas() + '</div>' +
      '<div class="' + ROOT + '__col ' + ROOT + '__insp" data-ms="inspcol">' + renderInspector() + '</div>';
  }

  /* ── MODULES surface ─────────────────────────────────────────────────── */
  function moduleTitle(m) { var t = m.title; return (t && (t.vi || t.en)) || t || m.moduleId || m.id || '(không tên)'; }
  function renderModules() {
    var rows;
    if (state.modules == null) { rows = '<tr><td colspan="5" class="' + ROOT + '__hint">Đang tải…</td></tr>'; }
    else if (!state.modules.length) { rows = '<tr><td colspan="5" class="' + ROOT + '__hint">Chưa có module. Bấm “＋ Tạo module”.</td></tr>'; }
    else {
      rows = state.modules.map(function (m) {
        var id = m.moduleId || m.id, st = m.status || 'active';
        var stcls = st === 'deleted' ? 'deleted' : (st === 'draft' ? 'draft' : 'active');
        var acts = (st === 'deleted')
          ? '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="mod-restore" data-id="' + esc(id) + '">↩ Khôi phục</button>'
          : '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm ' + ROOT + '__btn--pri" data-ms="mod-edit-meta" data-id="' + esc(id) + '">✎ Thông tin</button> ' +
            '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm ' + ROOT + '__btn--pri" data-ms="mod-edit-content" data-id="' + esc(id) + '">🧩 Nội dung</button> ' +
            '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="mod-versions" data-id="' + esc(id) + '">Lịch sử</button> ' +
            '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm ' + ROOT + '__btn--dgr" data-ms="mod-archive" data-id="' + esc(id) + '">Archive</button>';
        return '<tr><td><b>' + esc(moduleTitle(m)) + '</b><br><small style="color:var(--o3-text-muted,#94a3b8)">' + esc(id) + '</small></td>' +
          '<td>' + esc(m.moduleArchetype || m.archetype_key || '—') + '</td>' +
          '<td>v' + esc(m.version != null ? m.version : '—') + '</td>' +
          '<td><span class="' + ROOT + '__st ' + ROOT + '__st--' + stcls + '">' + esc(st) + '</span></td>' +
          '<td>' + acts + '</td></tr>';
      }).join('');
    }
    return '<div class="' + ROOT + '__pad">' +
      '<div class="' + ROOT + '__toolbar">' +
        '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" data-ms="mod-create">＋ Tạo module</button>' +
        '<button class="' + ROOT + '__btn" data-ms="mod-refresh">↻ Làm mới</button>' +
        '<label style="display:inline-flex;align-items:center;gap:var(--o3-space,8px);font-size:12px"><input type="checkbox" data-ms="mod-incdel"' + (state.includeDeleted ? ' checked' : '') + '> hiện đã archive</label>' +
      '</div>' +
      '<table class="' + ROOT + '__tbl"><thead><tr><th>Module</th><th>Archetype</th><th>Ver</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div id="ms-mod-detail">' + (state.editing && state.editing.kind === 'module' ? renderModuleForm(state.editing.draft) : '') + '</div></div>';
  }

  /* ── THEME surface ───────────────────────────────────────────────────── */
  function renderTheme() {
    var rows;
    if (state.presets == null) { rows = '<tr><td colspan="5" class="' + ROOT + '__hint">Đang tải…</td></tr>'; }
    else if (!state.presets.length) { rows = '<tr><td colspan="5" class="' + ROOT + '__hint">Chưa có preset.</td></tr>'; }
    else {
      rows = state.presets.map(function (p) {
        return '<tr><td><span class="' + ROOT + '__sw" style="background:' + esc(p.brand || '#0c4a6e') + '"></span><b>' + esc(p.display_name_vi || p.preset_key) + '</b><br><small style="color:var(--o3-text-muted,#94a3b8)">' + esc(p.preset_key) + '</small></td>' +
          '<td><code style="font-size:11px">' + esc(p.brand || '—') + '</code></td>' +
          '<td>' + esc(p.density_px != null ? p.density_px + 'px' : '—') + ' / ' + esc(p.control_h_px != null ? p.control_h_px + 'px' : '—') + '</td>' +
          '<td>' + (p.is_builtin ? '<span class="' + ROOT + '__bd ' + ROOT + '__bd--l4">builtin</span>' : '<span class="' + ROOT + '__st ' + ROOT + '__st--active">' + esc(p.status || 'published') + '</span>') + '</td>' +
          '<td><button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="theme-apply" data-key="' + esc(p.preset_key) + '">Áp dụng</button> ' +
          (p.is_builtin ? '' : '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm ' + ROOT + '__btn--pri" data-ms="theme-edit" data-key="' + esc(p.preset_key) + '">✎ Sửa</button> ') +
          '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="theme-clone" data-key="' + esc(p.preset_key) + '">⎘ Clone</button>' +
          (p.is_builtin ? '' : ' <button class="' + ROOT + '__btn ' + ROOT + '__btn--sm ' + ROOT + '__btn--dgr" data-ms="theme-delete" data-key="' + esc(p.preset_key) + '">Xoá</button>') +
          '</td></tr>';
      }).join('');
    }
    // Phase B: global theme knobs (absorbed from the Appearance Theme tab) sit
    // above the preset library. Reuses _renderAdmThemeHtml + _wireAdmTheme verbatim.
    var knobs = (typeof window._renderAdmThemeHtml === 'function')
      ? ('<div class="' + ROOT + '__cat">🎨 Token theme toàn cục (knob)</div><div id="adm-appearance-panel-theme" style="margin-bottom:var(--o3-space-section,12px)">' + window._renderAdmThemeHtml(L) + '</div>')
      : '';
    return '<div class="' + ROOT + '__pad">' +
      knobs +
      '<div class="' + ROOT + '__cat">🗂️ Thư viện preset</div>' +
      '<div class="' + ROOT + '__toolbar"><button class="' + ROOT + '__btn" data-ms="theme-refresh">↻ Làm mới</button>' +
      '<span style="font-size:11px;color:var(--o3-text-muted,#94a3b8)">Preset = bộ override token; “Áp dụng” lưu org-wide qua cùng authority với knob (SSOT).</span></div>' +
      '<table class="' + ROOT + '__tbl"><thead><tr><th>Preset</th><th>Brand</th><th>Density/Control</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div id="ms-theme-detail">' + (state.editing && state.editing.kind === 'theme' ? renderThemeForm(state.editing.draft) : '') + '</div></div>';
  }
  /* ── edit forms (inline) ─────────────────────────────────────────────── */
  function field(label, name, value, type) {
    return '<div class="' + ROOT + '__f" style="margin-bottom:var(--o3-space,8px)"><label>' + esc(label) + '</label>' +
      '<input class="' + ROOT + '__in" data-ef="' + name + '" type="' + (type || 'text') + '" value="' + esc(value == null ? '' : value) + '"></div>';
  }
  function selectField(label, name, value, opts) {
    return '<div class="' + ROOT + '__f" style="margin-bottom:var(--o3-space,8px)"><label>' + esc(label) + '</label>' +
      '<select class="' + ROOT + '__in" data-ef="' + name + '">' + opts.map(function (o) {
        var v = (typeof o === 'object') ? o.v : o, t = (typeof o === 'object') ? o.t : o;
        return '<option value="' + esc(v) + '"' + (String(value) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join('') + '</select></div>';
  }
  function renderThemeForm(p) {
    return '<div style="margin-top:var(--o3-space-section,12px)"><div class="' + ROOT + '__cat">✎ Chỉnh sửa preset · ' + esc(p.preset_key) + '</div>' +
      '<div class="' + ROOT + '__surfbox" style="min-height:0">' +
      field('Tên hiển thị (VI)', 'display_name_vi', p.display_name_vi) +
      field('Brand (màu)', 'brand', p.brand || '#0c4a6e', 'color') +
      field('Mật độ (density_px)', 'density_px', p.density_px, 'number') +
      field('Cao control (control_h_px)', 'control_h_px', p.control_h_px, 'number') +
      field('Radius ngoài (radius_outer_px)', 'radius_outer_px', p.radius_outer_px, 'number') +
      field('Radius trong (radius_inner_px)', 'radius_inner_px', p.radius_inner_px, 'number') +
      '<div style="display:flex;gap:var(--o3-space,8px);margin-top:var(--o3-space,8px)">' +
      '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" data-ms="theme-save">Lưu preset</button>' +
      '<button class="' + ROOT + '__btn" data-ms="edit-cancel">Huỷ</button></div></div></div>';
  }
  function renderModuleForm(m) {
    var l4 = l4Archetypes().map(function (a) { return { v: a.archetype_key, t: a.display_name_vi || a.archetype_key }; });
    if (!l4.length) { l4 = [{ v: m.moduleArchetype || 'workspace-projection', t: m.moduleArchetype || 'workspace-projection' }]; }
    var presets = (state.presets || []).map(function (p) { return { v: p.preset_key, t: p.display_name_vi || p.preset_key }; });
    if (!presets.length) { presets = [{ v: (m.config && m.config.theme) || 'hesem-default', t: (m.config && m.config.theme) || 'hesem-default' }]; }
    var title = m.title || {};
    return '<div style="margin-top:var(--o3-space-section,12px)"><div class="' + ROOT + '__cat">✎ Chỉnh sửa module · ' + esc(m.moduleId) + ' (v' + esc(m.version != null ? m.version : '?') + ')</div>' +
      '<div class="' + ROOT + '__surfbox" style="min-height:0">' +
      field('Tên (VI)', 'title_vi', title.vi || '') +
      field('Tên (EN)', 'title_en', title.en || '') +
      field('Icon', 'icon', m.icon || '📦') +
      field('Route', 'route', m.route || '') +
      field('Roles (phẩy)', 'roles', (m.roles || []).join(', ')) +
      selectField('Archetype', 'moduleArchetype', m.moduleArchetype || '', l4) +
      selectField('Theme', 'theme', (m.config && m.config.theme) || 'hesem-default', presets) +
      '<div style="display:flex;gap:var(--o3-space,8px);margin-top:var(--o3-space,8px)">' +
      '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" data-ms="mod-save">Lưu module</button>' +
      '<button class="' + ROOT + '__btn" data-ms="edit-cancel">Huỷ</button></div></div></div>';
  }
  function efVal(name) { var e = hostEl && hostEl.querySelector('[data-ef="' + name + '"]'); return e ? e.value : ''; }

  /* ── shell + render ──────────────────────────────────────────────────── */
  function bar() {
    var st = function (k, lbl) { return '<button class="' + ROOT + '__surf-tab' + (state.surface === k ? ' is-on' : '') + '" data-ms="surface" data-surface="' + k + '">' + lbl + '</button>'; };
    var modes = state.surface === 'lego'
      ? '<div class="' + ROOT + '__modes">' +
          '<button class="' + ROOT + '__mode' + (state.mode === 'assemble' ? ' is-on' : '') + '" data-ms="mode" data-mode="assemble">⬡ Assemble</button>' +
          '<button class="' + ROOT + '__mode' + (state.mode === 'author' ? ' is-on' : '') + '" data-ms="mode" data-mode="author">✎ Author</button></div>'
      : '';
    return '<div class="' + ROOT + '__bar">' +
        '<span class="' + ROOT + '__title">🧩 Module Studio</span>' +
        '<div class="' + ROOT + '__surfaces">' + surfaceList().map(function (k) { return st(k, surfaceLabel(k)); }).join('') + '</div>' +
        modes +
        '<div class="' + ROOT + '__act"><button class="' + ROOT + '__btn" data-ms="simulate">Mô phỏng</button></div>' +
      '</div>';
  }
  // L() helper for the embedded Appearance renderers (they take an L(vi,en) fn).
  function L(vi, en) { return (window.__lang === 'en') ? (en || vi) : (vi || en); }
  /* Absorbed Appearance surfaces (Phase B): reuse the existing global renderers
     verbatim so there is ONE implementation. The Module Master dock self-wires
     via its MutationObserver; the Theme knobs need _wireAdmTheme() after mount.
     Panel IDs match what the wiring queries (adm-appearance-panel-*). */
  function renderTokens() {
    var inner = (typeof window._renderAdmModuleSampleHtml === 'function')
      ? window._renderAdmModuleSampleHtml(L)
      : '<div class="' + ROOT + '__pad ' + ROOT + '__hint">Module Master renderer chưa nạp.</div>';
    return '<div class="' + ROOT + '__pad" id="adm-appearance-panel-module-sample">' + inner + '</div>';
  }
  function renderReference() {
    function blk(title, fn) {
      var html = (typeof window[fn] === 'function') ? (window[fn]() || '') : '';
      if (!html) { return ''; }
      return '<details open style="margin-bottom:var(--o3-space-section,12px)"><summary class="' + ROOT + '__cat" style="cursor:pointer;padding:var(--o3-space,8px) 0">' + esc(title) + '</summary>' + html + '</details>';
    }
    var body = blk('♿ Trợ năng & WCAG', '_renderAdmAccessibility') +
      blk('📊 Xuất & Phân tích', '_renderAdmAnalytics') +
      blk('📖 Chuẩn thiết kế', '_renderAdmStandard');
    return '<div class="' + ROOT + '__pad" id="adm-appearance-panel-reference">' + (body || '<div class="' + ROOT + '__hint">Reference renderers chưa nạp.</div>') + '</div>';
  }
  function bodyHtml() {
    var ext = extSurface(state.surface);
    if (ext && typeof ext.render === 'function') {
      var single = (ext.layout === 'grid') ? '' : (' ' + ROOT + '__body--single');
      var html = ''; try { html = ext.render() || ''; } catch (e) { html = '<div class="' + ROOT + '__pad ' + ROOT + '__hint">Lỗi render surface.</div>'; }
      return '<div class="' + ROOT + '__body' + single + '" data-ms="surfacebody">' + html + '</div>';
    }
    if (state.surface === 'modules') { return '<div class="' + ROOT + '__body ' + ROOT + '__body--single" data-ms="surfacebody">' + renderModules() + '</div>'; }
    if (state.surface === 'presets' || state.surface === 'theme') { return '<div class="' + ROOT + '__body ' + ROOT + '__body--single" data-ms="surfacebody">' + renderTheme() + '</div>'; }
    if (state.surface === 'tokens') { return '<div class="' + ROOT + '__body ' + ROOT + '__body--single" data-ms="surfacebody">' + renderTokens() + '</div>'; }
    if (state.surface === 'reference') { return '<div class="' + ROOT + '__body ' + ROOT + '__body--single" data-ms="surfacebody">' + renderReference() + '</div>'; }
    if (state.surface === 'settings' || state.surface === 'governance') {
      return '<div class="' + ROOT + '__body ' + ROOT + '__body--single" data-ms="surfacebody"><div class="' + ROOT + '__pad ' + ROOT + '__hint">Surface <b>' + esc(state.surface) + '</b> — đang cài đặt bởi session P2.</div></div>';
    }
    return '<div class="' + ROOT + '__body" data-ms="surfacebody">' + renderLego() + '</div>';
  }
  function afterPaint() {
    var ext = extSurface(state.surface);
    if (ext && typeof ext.onMount === 'function') { setTimeout(function () { try { ext.onMount(hostEl); } catch (e) { /* noop */ } }, 0); }
    // Wire the absorbed Appearance renderers after their HTML is in the DOM.
    if (state.surface === 'theme' || state.surface === 'presets') {
      setTimeout(function () { try { if (typeof window._wireAdmTheme === 'function') { window._wireAdmTheme(); } } catch (e) { /* noop */ } }, 0);
    }
    if (state.surface === 'tokens') {
      // dock self-wires via MutationObserver; lazyHydrate seeds saved overrides from backend
      setTimeout(function () { try { if (window._moduleMasterStore && window._moduleMasterStore.lazyHydrate) { window._moduleMasterStore.lazyHydrate(); } } catch (e) { /* noop */ } }, 0);
    }
  }
  function paint() { if (!hostEl) { return; } hostEl.innerHTML = bar() + bodyHtml(); afterPaint(); }
  function paintBody() { if (!hostEl) { return; } var b = hostEl.querySelector('[data-ms="surfacebody"]'); if (b) { b.outerHTML = bodyHtml(); afterPaint(); } }

  function loadModules(includeDeleted) {
    state.includeDeleted = !!includeDeleted; // SSOT — set before repaint so checkbox re-renders correctly
    state.modules = null; paintBody();
    getJson('module_schema_list', state.includeDeleted ? '&includeDeleted=1' : '').then(function (j) {
      state.modules = (j && (j.schemas || j.data || j.modules)) || []; paintBody();
    });
  }
  function loadPresets() {
    state.presets = null; paintBody();
    getJson('graphics_theme_preset_list').then(function (j) { state.presets = (j && (j.presets || j.data)) || []; paintBody(); });
  }
  // Harvest realistic demo configs from the Lego Showcase module so the canvas
  // paints populated graphics. Indexed by engine block type (first instance wins).
  function loadDemo() {
    if (state.demo != null) { return; }
    state.demo = {}; // mark in-flight (truthy-but-empty) to avoid double fetch
    getJson('module_schema_get', '&id=M-lego-showcase').then(function (j) {
      var schema = (j && (j.schema || j.data)) || j || {};
      var byType = {};
      function walk(arr) {
        (arr || []).forEach(function (b) {
          if (b && b.type && b.config && !byType[b.type]) { byType[b.type] = b.config; }
          if (b && b.blocks) { walk(b.blocks); }
          if (b && b.children) { walk(b.children); }
        });
      }
      (schema.tabs || []).forEach(function (t) {
        walk(t.blocks || []);
        if (t.zones) { Object.keys(t.zones).forEach(function (z) { walk(t.zones[z]); }); }
      });
      walk(schema.blocks || []);
      state.demo = { byType: byType };
      if (state.surface === 'lego' && state.sel) { paintCanvas(); }
    }).catch(function () { state.demo = { byType: {} }; });
  }
  function paintCanvas() {
    if (!hostEl) { return; }
    var c = hostEl.querySelector('[data-ms="cvcol"]');
    if (c) { c.innerHTML = renderCanvas(); }
  }
  function incDelChecked() { return state.includeDeleted; }
  function lookup(kind, key) {
    if (kind === 'l3') { return l3Blocks().filter(function (b) { return b.block_key === key; })[0] || null; }
    if (kind === 'l4') { return l4Archetypes().filter(function (a) { return a.archetype_key === key; })[0] || null; }
    return engineCatalog()[key] || null;
  }

  /* ── actions ─────────────────────────────────────────────────────────── */
  function doCreateModule() {
    var l4opts = l4Archetypes().map(function (a) { return { v: a.archetype_key, t: a.display_name_vi || a.archetype_key }; });
    if (!l4opts.length) { l4opts = [{ v: 'workspace-projection', t: 'workspace-projection' }]; }
    var pOpts = (state.presets || []).map(function (p) { return { v: p.preset_key, t: p.display_name_vi || p.preset_key }; });
    if (!pOpts.length) { pOpts = [{ v: 'hesem-default', t: 'hesem-default' }]; }

    var html = '<div class="' + ROOT + '__mback" id="ms-create-back">' +
      '<div class="' + ROOT + '__modal">' +
      '<div class="' + ROOT + '__modal-hd">＋ Tạo module mới</div>' +
      field('Tên (VI) *', 'cm-title-vi', '') +
      field('Tên (EN)', 'cm-title-en', '') +
      field('Phụ đề (VI)', 'cm-subtitle-vi', '') +
      field('Icon', 'cm-icon', '📦') +
      field('Route', 'cm-route', '/') +
      field('Roles (phân cách bằng dấu phẩy)', 'cm-roles', 'it_admin') +
      selectField('Archetype', 'cm-archetype', l4opts[0].v, l4opts) +
      selectField('Theme preset', 'cm-theme', pOpts[0].v, pOpts) +
      field('Domain', 'cm-domain', '') +
      '<div class="' + ROOT + '__modal-ft">' +
      '<button class="' + ROOT + '__btn ' + ROOT + '__btn--pri" id="ms-create-ok">Tạo module</button>' +
      '<button class="' + ROOT + '__btn" id="ms-create-cancel">Huỷ</button></div></div></div>';

    var wrap = document.createElement('div'); wrap.innerHTML = html;
    var back = wrap.firstChild; document.body.appendChild(back);

    var titleF = back.querySelector('[data-ef="cm-title-vi"]');
    var routeF = back.querySelector('[data-ef="cm-route"]');
    if (titleF) { setTimeout(function () { titleF.focus(); }, 40); }
    if (titleF && routeF) {
      titleF.addEventListener('input', function () {
        if (routeF.dataset.manual) { return; }
        var slug = titleF.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
        routeF.value = slug ? '/' + slug : '/';
      });
      routeF.addEventListener('input', function () { routeF.dataset.manual = '1'; });
    }
    back.addEventListener('click', function (ev) { if (ev.target === back) { back.remove(); } });
    var cancelBtn = back.querySelector('#ms-create-cancel');
    if (cancelBtn) { cancelBtn.addEventListener('click', function () { back.remove(); }); }
    var okBtn = back.querySelector('#ms-create-ok');
    if (okBtn) {
      okBtn.addEventListener('click', function () {
        var vi = (titleF || {}).value || '';
        if (!vi.trim()) { if (titleF) { titleF.style.borderColor = 'var(--o3-danger,#b91c1c)'; titleF.focus(); } return; }
        var route = (routeF || {}).value || '/' + vi.trim().toLowerCase().replace(/\s+/g, '-');
        var slug = route.replace(/^\//, '').replace(/[^\w\-]/g, '');
        var id = 'custom-' + (slug || Date.now().toString(36));
        function fv(name, def) { var el = back.querySelector('[data-ef="' + name + '"]'); return el ? el.value : (def || ''); }
        var schema = {
          moduleId: id,
          title: { vi: vi, en: fv('cm-title-en') },
          subtitle: { vi: fv('cm-subtitle-vi'), en: '' },
          icon: fv('cm-icon', '📦') || '📦',
          route: route,
          roles: fv('cm-roles', 'it_admin').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
          moduleArchetype: fv('cm-archetype', 'workspace-projection') || 'workspace-projection',
          config: { theme: fv('cm-theme', 'hesem-default') || 'hesem-default' },
          domain: fv('cm-domain'),
          version: 1, tabs: []
        };
        okBtn.disabled = true; okBtn.textContent = 'Đang tạo…';
        post('module_schema_save', { schema: schema }).then(function (r) {
          if (r && r.ok !== false) {
            toast('Đã tạo module "' + vi + '".', 'success'); back.remove(); loadModules(state.includeDeleted);
          } else {
            okBtn.disabled = false; okBtn.textContent = 'Tạo module';
            toast('Tạo module thất bại' + (r && r.error ? ': ' + r.error : '') + '.', 'error');
          }
        }).catch(function (e) { okBtn.disabled = false; okBtn.textContent = 'Tạo module'; toast('Tạo module lỗi: ' + e, 'error'); });
      });
    }
  }
  function doArchive(id) {
    if (!window.confirm('Archive (soft-delete) module ' + id + '? Có thể khôi phục.')) { return; }
    post('module_schema_delete', { moduleId: id }).then(function (r) { toast(r && r.ok !== false ? 'Đã archive.' : 'Archive thất bại.', r && r.ok !== false ? 'success' : 'error'); loadModules(state.includeDeleted); }).catch(function (e) { toast('Archive lỗi: ' + e, 'error'); });
  }
  function doRestore(id) {
    post('module_schema_restore', { moduleId: id }).then(function (r) { toast(r && r.ok !== false ? 'Đã khôi phục.' : 'Khôi phục thất bại.', r && r.ok !== false ? 'success' : 'error'); loadModules(state.includeDeleted); }).catch(function (e) { toast('Khôi phục lỗi: ' + e, 'error'); });
  }
  function doVersions(id) {
    var box = document.getElementById('ms-mod-detail'); if (box) { box.innerHTML = '<div class="' + ROOT + '__note">Đang tải lịch sử…</div>'; }
    getJson('module_schema_versions', '&id=' + encodeURIComponent(id)).then(function (j) {
      var vs = (j && (j.versions || j.data)) || [];
      var rows = vs.length ? vs.map(function (v) { return '<tr><td>v' + esc(v.version) + '</td><td>' + esc(v.snapshotAt || v.updatedAt || '') + '</td><td>' + esc(v.updatedBy || '') + '</td><td>' + esc(v.status || '') + '</td><td><button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="mod-restore-ver" data-id="' + esc(id) + '" data-ver="' + esc(v.version) + '">Rollback</button></td></tr>'; }).join('') : '<tr><td colspan="5" class="' + ROOT + '__hint">Chưa có snapshot.</td></tr>';
      if (box) { box.innerHTML = '<div style="margin-top:var(--o3-space-section,12px)"><div class="' + ROOT + '__cat">Lịch sử version · ' + esc(id) + '</div><table class="' + ROOT + '__tbl"><thead><tr><th>Ver</th><th>Lúc</th><th>Bởi</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'; }
    });
  }
  function doRestoreVersion(id, ver) {
    post('module_schema_restore_version', { moduleId: id, version: parseInt(ver, 10) }).then(function (r) { toast(r && r.ok !== false ? 'Đã rollback về v' + ver : 'Rollback thất bại.', r && r.ok !== false ? 'success' : 'error'); loadModules(state.includeDeleted); }).catch(function (e) { toast('Rollback lỗi: ' + e, 'error'); });
  }
  /* Phase A SSOT unification: applying a preset must PERSIST org-wide through the
     SAME authority the Appearance Theme tab uses (o3-theme + per-property overrides
     → _moduleMasterStore.persist → cfg.moduleMaster → boot hydrate), not just a
     runtime re-skin. Projects the preset onto the canonical o3-theme shape; exact
     off-grid control heights (e.g. 28/44px) ride the per-property override layer so
     nothing is lost to the 3-step density quantization. */
  function persistPresetAsOrgTheme(p) {
    var LS;
    try { LS = window.localStorage; } catch (e) { return false; }
    if (!LS) { return false; }
    var theme = {};
    try { theme = JSON.parse(LS.getItem('o3-theme') || '{}') || {}; } catch (e) { theme = {}; }
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
    try { LS.setItem('o3-theme', JSON.stringify(theme)); } catch (e) { return false; }
    // exact control height via per-property override (lossless for off-step px)
    if (ch != null) {
      // NOTE: these stores may already hold an empty ARRAY ("[]") from older seeds;
      // setting a named prop on an array is dropped by JSON.stringify, so coerce to
      // a plain object first (the override never persisted before this guard).
      var ov = {}, vals = {};
      function asObj(raw) { var v; try { v = JSON.parse(raw || '{}'); } catch (e) { v = null; } return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
      ov = asObj(LS.getItem('o3-props-overrides'));
      vals = asObj(LS.getItem('o3-props-values'));
      ov['control.height.standard'] = true;
      ['--o3-control-h-standard', '--o3-control-h-md', '--o3-control-h-sm', '--o3-control-h-lg'].forEach(function (cv) { vals[cv] = ch + 'px'; });
      try { LS.setItem('o3-props-overrides', JSON.stringify(ov)); LS.setItem('o3-props-values', JSON.stringify(vals)); } catch (e) { /* noop */ }
    }
    // push org-wide via the canonical shared store (identical path to Theme tab Save)
    if (window._moduleMasterStore && typeof window._moduleMasterStore.persist === 'function') {
      window._moduleMasterStore.persist(function (ok, mode) {
        toast(ok ? ('Đã áp dụng + lưu theme “' + p.preset_key + '” cho tổ chức.') : 'Áp dụng runtime OK; lưu org thất bại.', ok ? 'success' : 'warning');
      });
      return true;
    }
    // fallback: the module-sample store isn't loaded (Module Studio is its own nav);
    // replicate persistModuleMaster's read-merge-write into cfg.moduleMaster directly.
    var HmTheme = window.HmTheme;
    if (HmTheme && typeof HmTheme.getAdminConfig === 'function' && typeof HmTheme.saveAdminConfig === 'function') {
      var blob = {
        theme: theme,
        overrides: (function () { try { return JSON.parse(LS.getItem('o3-props-overrides') || '{}') || {}; } catch (e) { return {}; } })(),
        values: (function () { try { return JSON.parse(LS.getItem('o3-props-values') || '{}') || {}; } catch (e) { return {}; } })(),
        _savedAt: new Date().toISOString()
      };
      var cfg; try { cfg = HmTheme.getAdminConfig() || {}; } catch (e) { cfg = {}; }
      var next = {}; Object.keys(cfg).forEach(function (k) { next[k] = cfg[k]; });
      next.moduleMaster = blob;
      try {
        HmTheme.saveAdminConfig(next, function (ok) { toast(ok ? ('Đã áp dụng + lưu theme “' + p.preset_key + '” cho tổ chức.') : 'Áp dụng runtime OK; lưu org thất bại.', ok ? 'success' : 'warning'); });
        return true;
      } catch (e) { return false; }
    }
    return false;
  }
  function doApplyTheme(key) {
    // 1) instant runtime re-skin
    try { if (window.LegoTheme && typeof window.LegoTheme.applyTheme === 'function') { window.LegoTheme.applyTheme(key); } } catch (e) { /* noop */ }
    var p = (state.presets || []).filter(function (x) { return x.preset_key === key; })[0];
    // 2) persist org-wide through the unified authority
    if (p && persistPresetAsOrgTheme(p)) { return; }
    toast('Đã áp dụng theme “' + key + '” (runtime). Lưu org chưa sẵn sàng.', 'warning');
  }
  function doCloneTheme(key) {
    var src = (state.presets || []).filter(function (p) { return p.preset_key === key; })[0];
    if (!src) { toast('Không tìm thấy preset.', 'error'); return; }
    var nk = window.prompt('preset_key mới (clone từ ' + key + '):', key + '-copy');
    if (!nk) { return; }
    var clone = JSON.parse(JSON.stringify(src)); clone.preset_key = nk; clone.is_builtin = false; clone.is_default = false;
    clone.display_name_vi = (src.display_name_vi || key) + ' (copy)';
    delete clone.preset_id;
    post('graphics_theme_preset_save', { preset: clone }).then(function (r) {
      if (r && r.ok !== false) {
        toast('Đã clone preset “' + nk + '”. Mở chỉnh sửa…', 'success');
        getJson('graphics_theme_preset_list').then(function (j) {
          state.presets = (j && (j.presets || j.data)) || []; paintBody();
          // open edit on the freshly-cloned (now editable) preset
          if (state.presets.some(function (p) { return p.preset_key === nk; })) { doEditTheme(nk); }
        });
      } else { toast('Clone thất bại.', 'error'); }
    }).catch(function (e) { toast('Clone lỗi: ' + e, 'error'); });
  }
  function doEditModuleMeta(id) { doEditModule(id); }
  function doEditModuleContent(id) {
    // Hands off to Lego Assemble surface (P3 — 32c-mstudio-modules.js).
    // Until P3 ships, delegate through the api so any registered handler can intercept.
    if (window.MStudio && window.MStudio.api && typeof window.MStudio.api.openModuleContent === 'function') {
      window.MStudio.api.openModuleContent(id); return;
    }
    toast('Sửa nội dung module ' + id + ' — Lego Assemble surface (P3) chưa nạp.', 'info');
  }
  function doEditModule(id) {
    var box = document.getElementById('ms-mod-detail'); if (box) { box.innerHTML = '<div class="' + ROOT + '__note">Đang tải schema…</div>'; }
    // ensure the Theme dropdown has the full preset list
    if (state.presets == null) { getJson('graphics_theme_preset_list').then(function (j) { state.presets = (j && (j.presets || j.data)) || []; }); }
    getJson('module_schema_get', '&id=' + encodeURIComponent(id)).then(function (j) {
      var schema = (j && (j.schema || j.data)) || j || null;
      if (!schema || !(schema.moduleId || schema.id)) { toast('Không tải được schema module.', 'error'); if (box) { box.innerHTML = ''; } return; }
      state.editing = { kind: 'module', id: id, draft: schema };
      if (box) { box.innerHTML = renderModuleForm(schema); box.scrollIntoView({ block: 'nearest' }); }
    });
  }
  function doSaveModuleEdit() {
    var d = state.editing && state.editing.kind === 'module' ? state.editing.draft : null; if (!d) { return; }
    d.title = d.title || {}; d.title.vi = efVal('title_vi'); d.title.en = efVal('title_en');
    d.icon = efVal('icon'); d.route = efVal('route');
    d.roles = efVal('roles').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    d.moduleArchetype = efVal('moduleArchetype');
    d.config = d.config || {}; d.config.theme = efVal('theme');
    var payload = { schema: d };
    if (d.version != null) { payload.baseVersion = d.version; } // optimistic lock
    post('module_schema_save', payload).then(function (r) {
      if (r && r.ok !== false) { toast('Đã lưu module “' + (d.title.vi || d.moduleId) + '” (v' + (r.version || '?') + ').', 'success'); state.editing = null; loadModules(state.includeDeleted); }
      else { toast('Lưu module thất bại' + (r && r.error ? ': ' + r.error : '') + '.', 'error'); }
    }).catch(function (e) { toast('Lưu module lỗi: ' + e, 'error'); });
  }
  function doEditTheme(key) {
    var p = (state.presets || []).filter(function (x) { return x.preset_key === key; })[0];
    if (!p) { toast('Không tìm thấy preset.', 'error'); return; }
    state.editing = { kind: 'theme', id: key, draft: JSON.parse(JSON.stringify(p)) };
    var box = document.getElementById('ms-theme-detail');
    if (box) { box.innerHTML = renderThemeForm(state.editing.draft); box.scrollIntoView({ block: 'nearest' }); }
  }
  function doSaveThemeEdit() {
    var d = state.editing && state.editing.kind === 'theme' ? state.editing.draft : null; if (!d) { return; }
    d.display_name_vi = efVal('display_name_vi'); d.brand = efVal('brand');
    ['density_px', 'control_h_px', 'radius_outer_px', 'radius_inner_px'].forEach(function (k) { var v = efVal(k); d[k] = (v === '' ? null : parseInt(v, 10)); });
    post('graphics_theme_preset_save', { preset: d }).then(function (r) {
      if (r && r.ok !== false) { toast('Đã lưu preset “' + d.preset_key + '”.', 'success'); state.editing = null; loadPresets(); }
      else { toast('Lưu preset thất bại' + (r && r.error ? ': ' + r.error : '') + '.', 'error'); }
    }).catch(function (e) { toast('Lưu preset lỗi: ' + e, 'error'); });
  }
  function doCancelEdit() {
    state.editing = null;
    var mb = document.getElementById('ms-mod-detail'); if (mb) { mb.innerHTML = ''; }
    var tb = document.getElementById('ms-theme-detail'); if (tb) { tb.innerHTML = ''; }
  }
  function doDeleteTheme(key) {
    if (!window.confirm('Xoá preset “' + key + '”? Không thể hoàn tác.')) { return; }
    post('graphics_theme_preset_delete', { preset_key: key }).then(function (r) {
      toast(r && r.ok !== false ? 'Đã xoá preset “' + key + '”.' : 'Xoá thất bại.', r && r.ok !== false ? 'success' : 'error');
      loadPresets();
    }).catch(function (e) { toast('Xoá preset lỗi: ' + e, 'error'); });
  }
  function doSaveBlock() {
    var s = state.sel; if (!s || s.kind !== 'l3' || !s.data) { return; }
    var nameEl = hostEl.querySelector('[data-ms="edit-name"]'), stEl = hostEl.querySelector('[data-ms="edit-status"]');
    var block = JSON.parse(JSON.stringify(s.data));
    if (nameEl) { block.display_name_vi = nameEl.value; }
    if (stEl) { block.status = stEl.value; }
    post('graphics_block_contract_save', { block: block }).then(function (r) {
      toast(r && r.ok !== false ? 'Đã lưu contract “' + s.key + '”.' : 'Lưu contract thất bại.', r && r.ok !== false ? 'success' : 'error');
    }).catch(function (e) { toast('Lưu contract lỗi: ' + e, 'error'); });
  }
  function doSimulate() {
    try { if (window.GraphicsAuthority && window.GraphicsAuthority.preview && window.GraphicsAuthority.preview.simulate) { window.GraphicsAuthority.preview.simulate(); return; } } catch (e) { /* noop */ }
    toast('Mô phỏng: Graphics Authority preview chưa sẵn.', 'info');
  }

  /* ── mount ───────────────────────────────────────────────────────────── */
  function render(el) {
    if (!el) { return; }
    hostEl = el; ensureStyle(); el.classList.add(ROOT); el.style.padding = '0';
    paint();
    loadDemo();
    if (state.surface === 'modules' && state.modules == null) { loadModules(state.includeDeleted); }
    if ((state.surface === 'presets' || state.surface === 'theme') && state.presets == null) { loadPresets(); }
    // Pre-load presets in background so the create-module modal dropdown is populated
    // even when the user hasn't visited the Presets surface yet.
    if (state.presets == null) { getJson('graphics_theme_preset_list').then(function (j) { if (state.presets == null) { state.presets = (j && (j.presets || j.data)) || []; } }); }

    // Listeners are delegated on `el` and read module-level state; attach exactly once
    // per host node. 02-state-auth-ui re-invokes render() on every nav return, which
    // would otherwise stack duplicate handlers → one click firing N times (double POST).
    if (el.__msWired) { return el; }
    el.__msWired = true;

    el.addEventListener('click', function (ev) {
      var t = (ev.target && ev.target.closest) ? ev.target.closest('[data-ms]') : null;
      if (!t || !el.contains(t)) { return; }
      var k = t.getAttribute('data-ms');
      if (k === 'surface') {
        var tgt = t.getAttribute('data-surface');
        var smeta = SURFACE_META[tgt]; if (smeta && smeta.redirectTo) { tgt = smeta.redirectTo; }
        state.surface = tgt; paint();
        if (state.surface === 'modules') { loadModules(state.includeDeleted); }
        if (state.surface === 'presets' || state.surface === 'theme') { loadPresets(); }
        return;
      }
      // give a registered (external) surface first chance to handle its own actions
      var _ext = extSurface(state.surface);
      if (_ext && typeof _ext.onAction === 'function') { var handled = false; try { handled = _ext.onAction(k, t, ev); } catch (e) { /* noop */ } if (handled) { return; } }
      if (k === 'mode') { state.mode = t.getAttribute('data-mode') || 'assemble'; paintBody(); }
      else if (k === 'sel') { state.sel = { kind: t.getAttribute('data-kind'), key: t.getAttribute('data-key'), data: lookup(t.getAttribute('data-kind'), t.getAttribute('data-key')) }; paintBody(); }
      else if (k === 'simulate') { doSimulate(); }
      else if (k === 'save-block') { doSaveBlock(); }
      else if (k === 'mod-create') { doCreateModule(); }
      else if (k === 'mod-edit-meta') { doEditModuleMeta(t.getAttribute('data-id')); }
      else if (k === 'mod-edit-content') { doEditModuleContent(t.getAttribute('data-id')); }
      else if (k === 'mod-edit') { doEditModule(t.getAttribute('data-id')); } // legacy compat
      else if (k === 'mod-save') { doSaveModuleEdit(); }
      else if (k === 'edit-cancel') { doCancelEdit(); }
      else if (k === 'mod-refresh') { loadModules(state.includeDeleted); }
      else if (k === 'mod-archive') { doArchive(t.getAttribute('data-id')); }
      else if (k === 'mod-restore') { doRestore(t.getAttribute('data-id')); }
      else if (k === 'mod-versions') { doVersions(t.getAttribute('data-id')); }
      else if (k === 'mod-restore-ver') { doRestoreVersion(t.getAttribute('data-id'), t.getAttribute('data-ver')); }
      else if (k === 'theme-refresh') { loadPresets(); }
      else if (k === 'theme-apply') { doApplyTheme(t.getAttribute('data-key')); }
      else if (k === 'theme-clone') { doCloneTheme(t.getAttribute('data-key')); }
      else if (k === 'theme-edit') { doEditTheme(t.getAttribute('data-key')); }
      else if (k === 'theme-save') { doSaveThemeEdit(); }
      else if (k === 'theme-delete') { doDeleteTheme(t.getAttribute('data-key')); }
    });
    el.addEventListener('change', function (ev) {
      var t = ev.target;
      // state.includeDeleted is the SSOT; loadModules() sets it before repainting
      if (t && t.getAttribute && t.getAttribute('data-ms') === 'mod-incdel') { loadModules(t.checked); }
    });
    el.addEventListener('input', function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute || t.getAttribute('data-ms') !== 'search') { return; }
      var q = String(t.value || '').trim().toLowerCase();
      el.querySelectorAll('[data-ms="sel"]').forEach(function (row) { row.style.display = (!q || row.textContent.toLowerCase().indexOf(q) >= 0) ? '' : 'none'; });
    });
    return el;
  }

  window.ModuleStudio = { render: render, setMode: function (m) { state.mode = (m === 'author') ? 'author' : 'assemble'; }, _state: state, version: '0.7.0-surface-registry' };
  /* Shell API for registered (external) surfaces — so 32a/32b/32c can reuse the
     shell's data + repaint without importing closure internals. */
  window.MStudio.api = {
    getJson: getJson, post: post, toast: toast, esc: esc,
    state: state, host: function () { return hostEl; },
    repaint: function () { if (hostEl) { paint(); } },
    repaintBody: function () { if (hostEl) { paintBody(); } },
    selectSurface: function (key) {
      var m = SURFACE_META[key]; if (m && m.redirectTo) { key = m.redirectTo; }
      state.surface = key; if (hostEl) { paint(); }
      if (key === 'modules') { loadModules(state.includeDeleted); }
      if (key === 'presets' || key === 'theme') { loadPresets(); }
    },
    openModuleContent: function (id) {
      // P3 (32c-mstudio-modules.js) overrides this when it registers its surface.
      // Placeholder: ensure modules surface is visible, avoid redundant reload.
      if (state.surface !== 'modules') { state.surface = 'modules'; if (hostEl) { paint(); } loadModules(state.includeDeleted); }
      toast('Mở nội dung module ' + id + ' — Lego Assemble (P3) chưa nạp.', 'info');
    },
    openModuleMetadata: function (id) { doEditModule(id); },
    validateModule: function (schema) {
      if (!schema || !schema.moduleId) { return { ok: false, errors: ['moduleId required'] }; }
      if (!schema.title || (!schema.title.vi && !schema.title.en)) { return { ok: false, errors: ['title required'] }; }
      return { ok: true, errors: [] };
    }
  };
})();
