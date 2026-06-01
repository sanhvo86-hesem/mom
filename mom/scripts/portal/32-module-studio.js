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
    surface: 'lego',     // 'lego' | 'modules' | 'theme'
    mode: 'assemble',    // lego mode: 'assemble' | 'author'
    sel: null,           // lego selection { kind, key, data }
    modules: null,       // cached module list
    presets: null,       // cached theme presets
    msg: ''              // transient status line
  };
  var hostEl = null;

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
      R + '__btn--sm{height:24px;padding:0 ' + sp + ';font-size:11px}' +
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
      R + '__toolbar{display:flex;gap:' + sp + ';align-items:center;margin-bottom:' + sc + ';flex-wrap:wrap}';
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
  function safeRender(key) { try { if (window.Blocks && typeof window.Blocks.render === 'function') { return window.Blocks.render(key, {}, { preview: true }) || ''; } } catch (e) { /* noop */ } return ''; }
  function renderCanvas() {
    var s = state.sel;
    if (!s) { return '<div class="' + ROOT + '__surfbox"><div class="' + ROOT + '__hint">Chọn một mục ở thư viện trái để xem trước (window.Blocks.render).</div></div>'; }
    if (s.kind === 'l4') {
      var zones = (s.data && s.data.zones) ? s.data.zones : {};
      var zh = Object.keys(zones).map(function (z) { var v = zones[z], a = Array.isArray(v) ? v.join(', ') : (v && v.allowed ? [].concat(v.allowed).join(', ') : ''); return '<div class="' + ROOT + '__zone"><div class="' + ROOT + '__zlbl">zone: ' + esc(z) + '</div><div class="' + ROOT + '__zbody">' + (a ? 'blocks: ' + esc(a) : '—') + '</div></div>'; }).join('');
      return '<div class="' + ROOT + '__surfbox">' + (zh || '<div class="' + ROOT + '__hint">Archetype không khai báo zones.</div>') + '</div>';
    }
    var inner = safeRender(s.key);
    if (!inner) { var m = (s.kind === 'engine') ? (engineCatalog()[s.key] || {}) : {}; inner = '<div class="' + ROOT + '__hint">' + esc(m.icon || '🧱') + ' ' + esc(m.label || s.key) + '<br><small>' + esc(s.key) + '</small></div>'; }
    return '<div class="' + ROOT + '__surfbox">' + inner + '</div>';
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
          : '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="mod-versions" data-id="' + esc(id) + '">Lịch sử</button> ' +
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
        '<label style="display:inline-flex;align-items:center;gap:var(--o3-space,8px);font-size:12px"><input type="checkbox" data-ms="mod-incdel"> hiện đã archive</label>' +
      '</div>' +
      '<table class="' + ROOT + '__tbl"><thead><tr><th>Module</th><th>Archetype</th><th>Ver</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div id="ms-mod-detail"></div></div>';
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
          '<button class="' + ROOT + '__btn ' + ROOT + '__btn--sm" data-ms="theme-clone" data-key="' + esc(p.preset_key) + '">⎘ Clone</button></td></tr>';
      }).join('');
    }
    return '<div class="' + ROOT + '__pad">' +
      '<div class="' + ROOT + '__toolbar"><button class="' + ROOT + '__btn" data-ms="theme-refresh">↻ Làm mới</button>' +
      '<span style="font-size:11px;color:var(--o3-text-muted,#94a3b8)">Theme preset = bộ override token; module trỏ preset_key. Áp dụng dùng LegoTheme runtime.</span></div>' +
      '<table class="' + ROOT + '__tbl"><thead><tr><th>Preset</th><th>Brand</th><th>Density/Control</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

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
        '<div class="' + ROOT + '__surfaces">' + st('lego', '🧱 Lego') + st('modules', '📦 Modules') + st('theme', '🎨 Theme') + '</div>' +
        modes +
        '<div class="' + ROOT + '__act"><button class="' + ROOT + '__btn" data-ms="simulate">Mô phỏng</button></div>' +
      '</div>';
  }
  function bodyHtml() {
    if (state.surface === 'modules') { return '<div class="' + ROOT + '__body ' + ROOT + '__body--single" data-ms="surfacebody">' + renderModules() + '</div>'; }
    if (state.surface === 'theme') { return '<div class="' + ROOT + '__body ' + ROOT + '__body--single" data-ms="surfacebody">' + renderTheme() + '</div>'; }
    return '<div class="' + ROOT + '__body" data-ms="surfacebody">' + renderLego() + '</div>';
  }
  function paint() { if (!hostEl) { return; } hostEl.innerHTML = bar() + bodyHtml(); }
  function paintBody() { if (!hostEl) { return; } var b = hostEl.querySelector('[data-ms="surfacebody"]'); if (b) { b.outerHTML = bodyHtml(); } }

  function loadModules(includeDeleted) {
    state.modules = null; paintBody();
    getJson('module_schema_list', includeDeleted ? '&includeDeleted=1' : '').then(function (j) {
      state.modules = (j && (j.schemas || j.data || j.modules)) || []; paintBody();
    });
  }
  function loadPresets() {
    state.presets = null; paintBody();
    getJson('graphics_theme_preset_list').then(function (j) { state.presets = (j && (j.presets || j.data)) || []; paintBody(); });
  }
  function lookup(kind, key) {
    if (kind === 'l3') { return l3Blocks().filter(function (b) { return b.block_key === key; })[0] || null; }
    if (kind === 'l4') { return l4Archetypes().filter(function (a) { return a.archetype_key === key; })[0] || null; }
    return engineCatalog()[key] || null;
  }

  /* ── actions ─────────────────────────────────────────────────────────── */
  function doCreateModule() {
    var name = window.prompt('Tên module mới (VI):', 'Module mới');
    if (!name) { return; }
    var arche = (l4Archetypes()[0] || {}).archetype_key || 'workspace-projection';
    var id = 'custom-' + Date.now().toString(36);
    var schema = { moduleId: id, title: { vi: name, en: name }, subtitle: { vi: '', en: '' }, icon: '📦',
      route: '/' + id, roles: ['it_admin'], version: 1, moduleArchetype: arche, config: { theme: 'hesem-default' }, tabs: [] };
    post('module_schema_save', { schema: schema }).then(function (r) {
      toast(r && r.ok !== false ? 'Đã tạo module “' + name + '”.' : 'Tạo module thất bại.', r && r.ok !== false ? 'success' : 'error');
      loadModules(false);
    }).catch(function (e) { toast('Tạo module lỗi: ' + e, 'error'); });
  }
  function doArchive(id) {
    if (!window.confirm('Archive (soft-delete) module ' + id + '? Có thể khôi phục.')) { return; }
    post('module_schema_delete', { moduleId: id }).then(function (r) { toast(r && r.ok !== false ? 'Đã archive.' : 'Archive thất bại.', r && r.ok !== false ? 'success' : 'error'); loadModules(hostEl.querySelector('[data-ms="mod-incdel"]') && hostEl.querySelector('[data-ms="mod-incdel"]').checked); }).catch(function (e) { toast('Archive lỗi: ' + e, 'error'); });
  }
  function doRestore(id) {
    post('module_schema_restore', { moduleId: id }).then(function (r) { toast(r && r.ok !== false ? 'Đã khôi phục.' : 'Khôi phục thất bại.', r && r.ok !== false ? 'success' : 'error'); loadModules(true); }).catch(function (e) { toast('Khôi phục lỗi: ' + e, 'error'); });
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
    post('module_schema_restore_version', { moduleId: id, version: parseInt(ver, 10) }).then(function (r) { toast(r && r.ok !== false ? 'Đã rollback về v' + ver : 'Rollback thất bại.', r && r.ok !== false ? 'success' : 'error'); loadModules(false); }).catch(function (e) { toast('Rollback lỗi: ' + e, 'error'); });
  }
  function doApplyTheme(key) {
    try { if (window.LegoTheme && typeof window.LegoTheme.applyTheme === 'function') { window.LegoTheme.applyTheme(key); toast('Đã áp dụng theme “' + key + '” (runtime preview).', 'success'); return; } } catch (e) { /* noop */ }
    toast('LegoTheme chưa sẵn sàng.', 'warning');
  }
  function doCloneTheme(key) {
    var src = (state.presets || []).filter(function (p) { return p.preset_key === key; })[0];
    if (!src) { toast('Không tìm thấy preset.', 'error'); return; }
    var nk = window.prompt('preset_key mới (clone từ ' + key + '):', key + '-copy');
    if (!nk) { return; }
    var clone = JSON.parse(JSON.stringify(src)); clone.preset_key = nk; clone.is_builtin = false; clone.is_default = false;
    clone.display_name_vi = (src.display_name_vi || key) + ' (copy)';
    delete clone.preset_id;
    post('graphics_theme_preset_save', { preset: clone }).then(function (r) { toast(r && r.ok !== false ? 'Đã clone preset “' + nk + '”.' : 'Clone thất bại.', r && r.ok !== false ? 'success' : 'error'); loadPresets(); }).catch(function (e) { toast('Clone lỗi: ' + e, 'error'); });
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
    if (state.surface === 'modules' && state.modules == null) { loadModules(false); }
    if (state.surface === 'theme' && state.presets == null) { loadPresets(); }

    el.addEventListener('click', function (ev) {
      var t = (ev.target && ev.target.closest) ? ev.target.closest('[data-ms]') : null;
      if (!t || !el.contains(t)) { return; }
      var k = t.getAttribute('data-ms');
      if (k === 'surface') { state.surface = t.getAttribute('data-surface'); paint(); if (state.surface === 'modules') { loadModules(false); } if (state.surface === 'theme') { loadPresets(); } }
      else if (k === 'mode') { state.mode = t.getAttribute('data-mode') || 'assemble'; paintBody(); }
      else if (k === 'sel') { state.sel = { kind: t.getAttribute('data-kind'), key: t.getAttribute('data-key'), data: lookup(t.getAttribute('data-kind'), t.getAttribute('data-key')) }; paintBody(); }
      else if (k === 'simulate') { doSimulate(); }
      else if (k === 'save-block') { doSaveBlock(); }
      else if (k === 'mod-create') { doCreateModule(); }
      else if (k === 'mod-refresh') { loadModules(t && false); }
      else if (k === 'mod-archive') { doArchive(t.getAttribute('data-id')); }
      else if (k === 'mod-restore') { doRestore(t.getAttribute('data-id')); }
      else if (k === 'mod-versions') { doVersions(t.getAttribute('data-id')); }
      else if (k === 'mod-restore-ver') { doRestoreVersion(t.getAttribute('data-id'), t.getAttribute('data-ver')); }
      else if (k === 'theme-refresh') { loadPresets(); }
      else if (k === 'theme-apply') { doApplyTheme(t.getAttribute('data-key')); }
      else if (k === 'theme-clone') { doCloneTheme(t.getAttribute('data-key')); }
    });
    el.addEventListener('change', function (ev) {
      var t = ev.target;
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

  window.ModuleStudio = { render: render, setMode: function (m) { state.mode = (m === 'author') ? 'author' : 'assemble'; }, _state: state, version: '0.4.0-integrated' };
})();
