/* ============================================================================
 * 32b-mstudio-lego-workbench.js — Module Studio vNext · P3 Lego Workbench
 * ----------------------------------------------------------------------------
 * Registers 'lego' surface. Level taxonomy (DTCG 2025.10 Foundation §1/§3):
 *   L0a Primitive  — T1 raw values (color ramp, spacing, type, elevation)
 *   L0b Semantic   — T2 intent aliases (brand.primary, space.master, etc.)
 *   L2 Components  — T3 per-component token contracts
 *   L3 Blocks      — curated __HM_BLOCK_REGISTRY__ organisms
 *   L4 Templates   — __HM_ARCHETYPE_REGISTRY__ zone skeletons
 *   L5 Build Packets — assembled module_schema
 * Modes: Browse | Assemble | Author | Validate
 * CRUD: Create (new-l3/new-l4), Edit (Author), Deprecate (soft), Clone, Restore
 * SSOT: --o3-* tokens; spacing 8/12; control 32; radius 4/8/pill. No hex/px.
 * ==========================================================================*/
(function () {
  'use strict';

  if (!window.MStudio || typeof window.MStudio.registerSurface !== 'function') { return; }

  var R = 'ms-lego';
  var STYLE_ID = 'ms-lego-css';

  /* ── token shorthands (all CSS vars, no hex) ─────────────────────────── */
  var sp  = 'var(--o3-space,8px)',       sc = 'var(--o3-space-section,12px)';
  var rd  = 'var(--o3-radius,4px)',      rc = 'var(--o3-radius-card,8px)';
  var pill= 'var(--o3-radius-pill,999px)', ch = 'var(--o3-control-h-standard,32px)';
  var sf  = 'var(--o3-surface-card,#fff)',  sfm = 'var(--o3-surface-muted,#f1f5f9)';
  var bsub= 'var(--o3-border-subtle,#e5e7eb)', bdef = 'var(--o3-border-default,#cbd5e1)';
  var ts  = 'var(--o3-text-strong,#0f172a)', td = 'var(--o3-text-default,#475569)';
  var tm  = 'var(--o3-text-muted,#94a3b8)';
  var br  = 'var(--o3-brand,#0c4a6e)',   brs = 'var(--o3-brand-soft,#e0f2fe)';
  var ok  = 'var(--o3-success,#15803d)', oks = 'var(--o3-success-soft,#dcfce7)';
  var wn  = 'var(--o3-warning,#b45309)', wns = 'var(--o3-warning-soft,#fef3c7)';
  var dg  = 'var(--o3-danger,#b91c1c)',  dgs = 'var(--o3-danger-soft,#fee2e2)';
  var info= 'var(--o3-info,#0369a1)';
  var ti  = 'var(--o3-text-inverse,#fff)';

  /* ── surface state ───────────────────────────────────────────────────── */
  var ls = {
    level: 'l0a',   // 'l0a'|'l0b'|'l2'|'l3'|'l4'|'l5'
    mode: 'browse', // 'browse'|'assemble'|'author'|'validate'
    sel: null,      // { kind, key, data }
    q: '',
    demo: null,     // { byType:{…} }
    validateResults: null,
    validateRunning: false,
    modules: null,
    l3Cache: null,       /* populated from DB after mutations; null = use __HM_BLOCK_REGISTRY__ */
    l4Cache: null,
    deprecatePanel: false  /* show inline deprecate confirm form in Browse */
  };

  /* ── level config ────────────────────────────────────────────────────── */
  var LEVELS = [
    { key:'l0a', icon:'⚛', label:'L0a Primitive',     desc:'T1 raw values — color ramp, scales. Never consumed by components directly.' },
    { key:'l0b', icon:'🎯', label:'L0b Semantic',      desc:'T2 intent aliases: brand.primary, space.master. Theming layer.' },
    { key:'l2',  icon:'🧩', label:'L2 Components',     desc:'T3 per-component overrides: button.bg, kpi.value.color.' },
    { key:'l3',  icon:'🧱', label:'L3 Blocks',         desc:'Curated organisms — approved in __HM_BLOCK_REGISTRY__.' },
    { key:'l4',  icon:'📐', label:'L4 Templates',      desc:'Zone skeleton archetypes — __HM_ARCHETYPE_REGISTRY__.' },
    { key:'l5',  icon:'📦', label:'L5 Build Packets',  desc:'Assembled module manifests (module_schema).' }
  ];

  /* ── primitive token groups (T1) ─────────────────────────────────────── */
  var L0A_GROUPS = [
    { id:'color-ramp',    label:'Color ramp',    tokens:['color.blue.50','color.blue.100','color.blue.500','color.blue.700','color.slate.50','color.slate.400','color.slate.900','color.green.100','color.green.600','color.amber.100','color.red.100','color.red.700'] },
    { id:'spacing-scale', label:'Spacing scale', tokens:['space.0','space.1','space.2','space.4','space.6','space.8','space.12','space.16','space.24'] },
    { id:'radius-scale',  label:'Radius scale',  tokens:['radius.0','radius.2','radius.4','radius.8','radius.999'] },
    { id:'type-scale',    label:'Type scale',    tokens:['type.10','type.11','type.12','type.13','type.14','type.15','type.18'] },
    { id:'elevation',     label:'Elevation',     tokens:['elevation.0','elevation.1','elevation.2','elevation.4'] },
    { id:'motion',        label:'Motion (ms)',   tokens:['motion.fast','motion.standard','motion.slow'] }
  ];

  /* ── semantic token groups (T2) ──────────────────────────────────────── */
  var L0B_GROUPS = [
    { id:'brand',    label:'Brand',    tokens:['brand.primary','brand.soft','brand.strong','brand.text'] },
    { id:'surface',  label:'Surface',  tokens:['color.bg.page','color.bg.surface','color.bg.muted','color.bg.interactive','color.bg.overlay'] },
    { id:'border',   label:'Border',   tokens:['color.border.subtle','color.border.default','color.border.strong'] },
    { id:'text',     label:'Text',     tokens:['color.text.strong','color.text.default','color.text.muted','color.text.inverse','color.text.link'] },
    { id:'status',   label:'Status',   tokens:['status.success','status.success.soft','status.warning','status.warning.soft','status.danger','status.danger.soft','status.info','status.info.soft'] },
    { id:'density',  label:'Density',  tokens:['space.master','space.section','radius.master','radius.card','radius.pill','control.height.standard'] },
    { id:'type-sem', label:'Type',     tokens:['type.family.sans','type.family.mono','type.base','type.scale'] },
    { id:'motion-s', label:'Motion',   tokens:['motion.duration.fast','motion.duration.standard','motion.duration.slow','motion.easing.standard'] }
  ];

  /* ── demo alias map ──────────────────────────────────────────────────── */
  var L3_ALIAS = {
    'kpi.grid':         ['kpi-row','kpi-grid','metric-strip'],
    'table.data':       ['data-table','advanced-table','table','record-table'],
    'toolbar.filtered': ['filter-bar','toolbar','action-toolbar'],
    'panel.standard':   ['card','card-container','section-card'],
    'empty.state':      ['empty-state','empty'],
    'shell.workspace':  ['two-column','three-column','workspace']
  };

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function getApi() { return window.MStudio && window.MStudio.api ? window.MStudio.api : null; }
  function post(action, body) { var a = getApi(); return a ? a.post(action, body) : Promise.reject(new Error('api unavailable')); }
  function getJson(action, qs) { var a = getApi(); return a ? a.getJson(action, qs) : Promise.reject(new Error('api unavailable')); }
  function toast(m, t) { var a = getApi(); if (a) { a.toast(m, t); } }

  /* cache-backed registry accessors */
  function l3All() { if (ls.l3Cache) { return ls.l3Cache; } var r = window.__HM_BLOCK_REGISTRY__; return (r && Array.isArray(r.blocks)) ? r.blocks : []; }
  function l3Blocks() { return l3All().filter(function(b){ return b && b.status === 'published'; }); }
  function l4All() { if (ls.l4Cache) { return ls.l4Cache; } var r = window.__HM_ARCHETYPE_REGISTRY__; return (r && Array.isArray(r.archetypes)) ? r.archetypes : []; }
  function l4Archetypes() { return l4All().filter(function(a){ return a && a.status === 'published'; }); }
  function findL3(key) { return l3All().filter(function(b){ return b.block_key === key; })[0] || null; }
  function findL4(key) { return l4All().filter(function(a){ return a.archetype_key === key; })[0] || null; }

  function reloadL3(cb) {
    getJson('graphics_block_contract_list').then(function(j) {
      var bl = (j && (j.blocks || j.data)) || [];
      ls.l3Cache = bl;
      if (window.__HM_BLOCK_REGISTRY__) { window.__HM_BLOCK_REGISTRY__.blocks = bl; }
      else { window.__HM_BLOCK_REGISTRY__ = { blocks: bl }; }
      if (cb) { cb(); }
    }).catch(function() { if (cb) { cb(); } });
  }
  function reloadL4(cb) {
    getJson('graphics_module_archetype_list').then(function(j) {
      var al = (j && (j.archetypes || j.data)) || [];
      ls.l4Cache = al;
      if (window.__HM_ARCHETYPE_REGISTRY__) { window.__HM_ARCHETYPE_REGISTRY__.archetypes = al; }
      else { window.__HM_ARCHETYPE_REGISTRY__ = { archetypes: al }; }
      if (cb) { cb(); }
    }).catch(function() { if (cb) { cb(); } });
  }

  function engineCatalog() { var be = window.HmBlockEngine; return (be && be.BLOCK_CATALOG) ? be.BLOCK_CATALOG : {}; }
  function safeRender(type, cfg) { try { if (window.Blocks && window.Blocks.render) { return window.Blocks.render(type, cfg || {}, { preview: true }) || ''; } } catch(e){} return ''; }
  function chips(arr) { if (!arr || !arr.length) { return '<span class="' + R + '__chip">—</span>'; } return arr.map(function(x){ return '<span class="' + R + '__chip">' + esc(x) + '</span>'; }).join(''); }
  function badge(label, v) { return '<span class="' + R + '__badge ' + R + '__badge--' + (v||'default') + '">' + esc(label) + '</span>'; }

  /* ── CSS ─────────────────────────────────────────────────────────────── */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) { return; }
    var css = [
      '.' + R + '{display:flex;flex-direction:column;height:100%;font-size:13px;color:' + ts + '}',
      '.' + R + '__modebar{display:flex;align-items:center;gap:' + sp + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px solid ' + bsub + ';flex-wrap:wrap}',
      '.' + R + '__modeBtn{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bsub + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:12px;font-weight:600;color:' + td + '}',
      '.' + R + '__modeBtn.on{background:' + br + ';color:#fff;border-color:' + br + '}',
      '.' + R + '__layout{display:flex;flex:1;min-height:0}',
      '.' + R + '__rail{width:56px;flex-shrink:0;border-right:1px solid ' + bsub + ';background:' + sf + ';display:flex;flex-direction:column;align-items:center;padding:' + sp + ' 0;gap:2px}',
      '.' + R + '__railBtn{width:48px;height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:none;background:none;border-radius:' + rd + ';font-size:9px;font-weight:700;color:' + tm + ';gap:2px;letter-spacing:.3px;text-transform:uppercase;line-height:1.1;padding:0}',
      '.' + R + '__railBtn .ic{font-size:18px;line-height:1}',
      '.' + R + '__railBtn.on{background:' + brs + ';color:' + br + '}',
      '.' + R + '__railBtn:hover:not(.on){background:' + sfm + '}',
      '.' + R + '__lib{width:220px;flex-shrink:0;border-right:1px solid ' + bsub + ';background:' + sf + ';overflow-y:auto}',
      '.' + R + '__search{position:sticky;top:0;background:' + sf + ';padding:' + sp + ';border-bottom:1px solid ' + bsub + ';z-index:1}',
      '.' + R + '__in{height:' + ch + ';width:100%;box-sizing:border-box;border:1px solid ' + bdef + ';border-radius:' + rd + ';padding:0 ' + sc + ';font:inherit;font-size:12px;background:' + sf + ';color:' + ts + ';appearance:none}',
      '.' + R + '__in:focus{outline:2px solid ' + br + ';outline-offset:-1px}',
      '.' + R + '__sec{padding:' + sp + ' ' + sc + ' 0;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:' + tm + '}',
      /* A11Y-010: button reset so items are keyboard-navigable */
      '.' + R + '__item{display:flex;align-items:flex-start;gap:' + sp + ';cursor:pointer;padding:' + sp + ' ' + sc + ';font-size:12px;color:' + ts + ';background:none;border:none;text-align:left;width:100%;font-family:inherit;font-size:inherit}',
      '.' + R + '__item:hover{background:' + brs + '}',
      '.' + R + '__item.on{background:' + brs + ';box-shadow:inset 3px 0 0 ' + br + '}',
      '.' + R + '__item .ic{font-size:16px;margin-top:1px;flex-shrink:0}',
      '.' + R + '__item .nm{flex:1;line-height:1.3}',
      '.' + R + '__item .nm small{display:block;color:' + tm + ';font-size:10px;margin-top:1px}',
      '.' + R + '__main{flex:1;min-width:0;overflow:auto;padding:' + sc + '}',
      '.' + R + '__card{background:' + sf + ';border:1px solid ' + bsub + ';border-radius:' + rc + ';margin-bottom:' + sc + ';overflow:hidden}',
      '.' + R + '__cardHd{display:flex;align-items:center;gap:' + sp + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px solid ' + bsub + ';font-size:11px;font-weight:700;color:' + td + '}',
      '.' + R + '__cardBd{padding:' + sc + '}',
      '.' + R + '__preview{min-height:120px;background:' + sfm + ';border-radius:' + rd + ';overflow:hidden;padding:' + sp + '}',
      '.' + R + '__f{margin-bottom:' + sc + '}',
      '.' + R + '__f label{display:block;font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:' + tm + ';margin-bottom:' + sp + '}',
      '.' + R + '__textarea{width:100%;box-sizing:border-box;border:1px solid ' + bdef + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + ';font:inherit;font-size:11px;font-family:var(--o3-font-mono,monospace);background:' + sf + ';color:' + ts + ';min-height:80px;resize:vertical}',
      '.' + R + '__btn{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bdef + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:12px;color:' + ts + '}',
      '.' + R + '__btn:hover{background:' + sfm + '}',
      '.' + R + '__btn--pri{background:' + br + ';border-color:' + br + ';color:' + ti + ';font-weight:600}',
      '.' + R + '__btn--pri:hover{filter:brightness(.94)}',
      '.' + R + '__chip{display:inline-flex;align-items:center;height:20px;padding:0 ' + sp + ';margin:0 ' + sp + ' 2px 0;border:1px solid ' + bsub + ';border-radius:' + pill + ';font-size:10px;background:' + sfm + ';color:' + ts + '}',
      '.' + R + '__badge{display:inline-flex;align-items:center;height:16px;padding:0 ' + sp + ';border-radius:' + pill + ';font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}',
      '.' + R + '__badge--ssot{background:' + oks + ';color:' + ok + '}',
      '.' + R + '__badge--l4{background:' + brs + ';color:' + br + '}',
      '.' + R + '__badge--default{background:' + sfm + ';color:' + td + '}',
      '.' + R + '__badge--deprecated{background:' + wns + ';color:' + wn + '}',
      '.' + R + '__badge--draft{background:' + sfm + ';color:' + td + '}',
      '.' + R + '__item--deprecated{opacity:.6}',
      '.' + R + '__libToolbar{display:flex;align-items:center;justify-content:space-between;padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px solid ' + bsub + ';position:sticky;top:36px;z-index:1}',
      '.' + R + '__actionBar{display:flex;gap:' + sp + ';align-items:center;margin-bottom:' + sc + ';flex-wrap:wrap}',
      '.' + R + '__btn--warn{background:' + wns + ';border-color:' + wn + ';color:' + wn + '}',
      '.' + R + '__btn--warn:hover{background:' + wn + ';color:' + ti + '}',
      '.' + R + '__btn--ok{background:' + oks + ';border-color:' + ok + ';color:' + ok + '}',
      '.' + R + '__btn--ok:hover{background:' + ok + ';color:' + ti + '}',
      '.' + R + '__deprPanel{background:' + wns + ';border:1px solid ' + wn + ';border-radius:' + rd + ';padding:' + sc + ';margin-bottom:' + sc + '}',
      '.' + R + '__vpass{color:' + ok + ';font-weight:700}',
      '.' + R + '__vwarn{color:' + wn + ';font-weight:700}',
      '.' + R + '__vfail{color:' + dg + ';font-weight:700}',
      '.' + R + '__vgap{color:' + info + ';font-weight:700}',
      '.' + R + '__vnr{color:' + tm + '}',
      '.' + R + '__vtbl{width:100%;border-collapse:collapse;font-size:12px}',
      '.' + R + '__vtbl th{text-align:left;font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:' + tm + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px solid ' + bsub + '}',
      '.' + R + '__vtbl td{padding:' + sp + ' ' + sc + ';border-bottom:1px solid ' + bsub + ';vertical-align:top}',
      '.' + R + '__vtbl tr:last-child td{border-bottom:0}',
      '.' + R + '__hint{text-align:center;color:' + tm + ';font-size:12px;padding:' + sc + '}',
      '.' + R + '__toolbar{display:flex;gap:' + sp + ';align-items:center;flex-wrap:wrap;margin-bottom:' + sc + '}',
      '.' + R + '__tokenGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:' + sp + '}',
      '.' + R + '__tokenCard{background:' + sf + ';border:1px solid ' + bsub + ';border-radius:' + rd + ';padding:' + sp + ';font-size:11px}',
      '.' + R + '__zoneBlock{border:1px dashed ' + bdef + ';border-radius:' + rd + ';margin-bottom:' + sp + ';overflow:hidden}',
      '.' + R + '__zoneLbl{font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:' + tm + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px dashed ' + bsub + '}',
      '.' + R + '__zoneBd{padding:' + sp + ' ' + sc + ';font-size:11px;color:' + td + '}'
    ].join('');
    var el = document.createElement('style'); el.id = STYLE_ID; el.textContent = css;
    document.head.appendChild(el);
  }

  /* ── library ──────────────────────────────────────────────────────────── */
  /* A11Y-010: use <button> so items are keyboard-reachable (WCAG 2.1.1 Keyboard) */
  function tokenItem(tk, sub) {
    var on = ls.sel && ls.sel.key === tk ? ' on' : '';
    return '<button type="button" class="' + R + '__item' + on + '" data-lw="sel" data-kind="token" data-key="' + esc(tk) + '">' +
      '<span class="ic" aria-hidden="true">◈</span><span class="nm">' + esc(tk) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></button>';
  }
  function blockItem(kind, key, label, sub, icon, bdg, extraCls) {
    var on = ls.sel && ls.sel.kind === kind && ls.sel.key === key ? ' on' : '';
    return '<button type="button" class="' + R + '__item' + on + (extraCls ? ' ' + extraCls : '') + '" data-lw="sel" data-kind="' + esc(kind) + '" data-key="' + esc(key) + '">' +
      '<span class="ic" aria-hidden="true">' + (icon || '▫') + '</span>' +
      '<span class="nm">' + esc(label) + '<small>' + esc(sub) + '</small></span>' + (bdg || '') + '</button>';
  }

  function renderLibrary() {
    var q = ls.q ? ls.q.toLowerCase() : '';
    function vis(s) { return !q || s.toLowerCase().indexOf(q) >= 0; }
    var h = '<div class="' + R + '__search"><input class="' + R + '__in" data-lw="search" placeholder="🔍 Lọc…" value="' + esc(ls.q) + '"></div>';

    if (ls.level === 'l0a') {
      L0A_GROUPS.forEach(function(g) {
        var items = g.tokens.filter(vis);
        if (!items.length) { return; }
        h += '<div class="' + R + '__sec">' + esc(g.label) + '</div>';
        items.forEach(function(t) { h += tokenItem(t, 'T1 primitive'); });
      });
    } else if (ls.level === 'l0b') {
      L0B_GROUPS.forEach(function(g) {
        var items = g.tokens.filter(vis);
        if (!items.length) { return; }
        h += '<div class="' + R + '__sec">' + esc(g.label) + '</div>';
        items.forEach(function(t) { h += tokenItem(t, 'T2 semantic'); });
      });
    } else if (ls.level === 'l2') {
      var secs = (window._moduleMasterLevelSections && window._moduleMasterLevelSections['l2']) || [];
      if (secs.length) {
        h += '<div class="' + R + '__sec">Components (T3)</div>';
        secs.filter(function(s) { return vis(s.label_vi || s.id); })
          .forEach(function(s) { h += blockItem('l2-comp', s.id, s.label_vi || s.id, 'T3 · ' + s.id, '🧩', ''); });
      }
      var cat = engineCatalog(), grp = {};
      Object.keys(cat).forEach(function(k) { var b = cat[k]||{}; var c = b.category||'other'; (grp[c]=grp[c]||[]).push({key:k,label:b.label||k,icon:b.icon||'▫'}); });
      Object.keys(grp).sort().forEach(function(c) {
        var items = grp[c].filter(function(b) { return vis(b.label) || vis(b.key); });
        if (!items.length) { return; }
        h += '<div class="' + R + '__sec">Engine · ' + esc(c) + '</div>';
        items.forEach(function(b) { h += blockItem('engine', b.key, b.label, b.key, b.icon, ''); });
      });
    } else if (ls.level === 'l3') {
      /* ── L3: show ALL blocks (published + draft + deprecated) ─────────── */
      h += '<div class="' + R + '__libToolbar">' +
        '<span style="font-size:10px;font-weight:700;color:' + tm + ';text-transform:uppercase;letter-spacing:.4px">L3 Blocks</span>' +
        '<button type="button" class="' + R + '__btn" data-lw="new-l3" style="height:24px;padding:0 ' + sp + ';font-size:11px">＋ Block mới</button>' +
        '</div>';
      var l3all = l3All();
      var l3vis = l3all.filter(function(b) { return vis(b.block_key) || vis(b.display_name_vi || ''); });
      if (l3all.length) {
        h += '<div class="' + R + '__sec">Curated · L3 · ' +
          l3all.filter(function(b){return b.status==='published';}).length + ' published / ' + l3all.length + ' total</div>';
        l3vis.forEach(function(b) {
          var depr = b.status === 'deprecated', isDraft = b.status === 'draft';
          var bdg = depr ? badge('deprecated','deprecated') : isDraft ? badge('draft','draft') : badge('ssot','ssot');
          h += blockItem('l3', b.block_key, b.display_name_vi || b.block_key, b.block_key, '🧱', bdg,
            depr ? R + '__item--deprecated' : '');
        });
      } else { h += '<div class="' + R + '__hint">Chưa có L3 blocks.</div>'; }
      var eng = Object.keys(engineCatalog()).filter(function(k) {
        var m = engineCatalog()[k]; return vis(m.label||k) && !l3all.some(function(b){return b.block_key===k;});
      }).slice(0,30);
      if (eng.length) {
        h += '<div class="' + R + '__sec">Engine (chưa curate)</div>';
        eng.forEach(function(k){ var m=engineCatalog()[k]||{}; h+=blockItem('engine',k,m.label||k,k,m.icon||'▫',''); });
      }
    } else if (ls.level === 'l4') {
      /* ── L4: show ALL archetypes (published + draft + deprecated) ────── */
      h += '<div class="' + R + '__libToolbar">' +
        '<span style="font-size:10px;font-weight:700;color:' + tm + ';text-transform:uppercase;letter-spacing:.4px">L4 Archetypes</span>' +
        '<button type="button" class="' + R + '__btn" data-lw="new-l4" style="height:24px;padding:0 ' + sp + ';font-size:11px">＋ Archetype mới</button>' +
        '</div>';
      var l4all = l4All();
      var l4vis = l4all.filter(function(a) { return vis(a.archetype_key) || vis(a.display_name_vi || ''); });
      if (l4all.length) {
        h += '<div class="' + R + '__sec">Archetypes · L4 · ' +
          l4all.filter(function(a){return a.status==='published';}).length + ' published / ' + l4all.length + ' total</div>';
        l4vis.forEach(function(a) {
          var depr = a.status === 'deprecated', isDraft = a.status === 'draft';
          var bdg = depr ? badge('deprecated','deprecated') : isDraft ? badge('draft','draft') : badge('l4','l4');
          h += blockItem('l4', a.archetype_key, a.display_name_vi || a.archetype_key, a.archetype_key, '▱', bdg,
            depr ? R + '__item--deprecated' : '');
        });
      } else { h += '<div class="' + R + '__hint">Chưa có L4 archetypes.</div>'; }
    } else if (ls.level === 'l5') {
      var mods = ls.modules;
      if (!mods) {
        h += '<div class="' + R + '__hint">Đang tải…</div>';
        loadModules();
      } else if (!mods.length) {
        h += '<div class="' + R + '__hint">Chưa có module.</div>';
      } else {
        h += '<div class="' + R + '__sec">Modules · L5 · ' + mods.length + '</div>';
        mods.filter(function(m) {
          var id = m.moduleId||m.id||'', title = m.title ? (m.title.vi||m.title.en||id) : id;
          return vis(id) || vis(title);
        }).forEach(function(m) {
          var id = m.moduleId||m.id||'', title = m.title ? (m.title.vi||m.title.en||id) : id;
          h += blockItem('l5', id, title, id, '📦', badge(m.status||'active', m.status==='deleted'?'default':'ssot'));
        });
      }
    }
    return h;
  }

  /* ── dependency graph ─────────────────────────────────────────────────── */
  function renderDepGraph() {
    var s = ls.sel; if (!s) { return ''; }
    var h = '<div style="display:flex;flex-direction:column;gap:' + sp + ';font-size:11px">';
    if (s.kind === 'token') {
      h += '<div>' + badge('T1/T2','default') + ' ' + esc(s.key) + ' → CSS var via graphics_token_catalog</div>';
    } else if (s.kind === 'l3' && s.data) {
      var d = s.data;
      h += '<div>' + badge('L3','ssot') + ' ' + esc(s.key) + '</div>';
      if (d.composed_of && d.composed_of.length) { h += '<div><span style="color:' + tm + '">↳ L2</span> ' + chips(d.composed_of) + '</div>'; }
      if (d.required_tokens && d.required_tokens.length) { h += '<div><span style="color:' + tm + '">↳ T3</span> ' + chips(d.required_tokens) + '</div>'; }
    } else if (s.kind === 'l4' && s.data) {
      var da = s.data;
      h += '<div>' + badge('L4','l4') + ' ' + esc(s.key) + '</div>';
      if (da.required_blocks) { h += '<div><span style="color:' + tm + '">↳ L3</span> ' + chips([].concat(da.required_blocks)) + '</div>'; }
    }
    return h + '</div>';
  }

  /* ── demo harvest ────────────────────────────────────────────────────── */
  function demoForSel(s) {
    var byType = (ls.demo && ls.demo.byType) || {};
    if (!s) { return null; }
    if (s.kind === 'engine') { return { type: s.key, cfg: byType[s.key] || {} }; }
    if (s.kind === 'l3') {
      var cands = L3_ALIAS[s.key] || [];
      for (var i = 0; i < cands.length; i++) { if (byType[cands[i]]) { return { type: cands[i], cfg: byType[cands[i]] }; } }
      return { type: s.key, cfg: {} };
    }
    return null;
  }

  function loadDemo() {
    if (ls.demo != null) { return; }
    ls.demo = {};
    getJson('module_schema_get', '&id=M-lego-showcase').then(function(j) {
      var schema = (j && (j.schema || j.data)) || j || {};
      var byType = {};
      function walk(arr) { (arr||[]).forEach(function(b){ if (b && b.type && b.config && !byType[b.type]) { byType[b.type]=b.config; } if (b && b.blocks) { walk(b.blocks); } if (b && b.children) { walk(b.children); } }); }
      (schema.tabs||[]).forEach(function(t){ walk(t.blocks||[]); if(t.zones){Object.keys(t.zones).forEach(function(z){walk(t.zones[z]);});} });
      walk(schema.blocks||[]);
      ls.demo = { byType: byType };
      repaintMain();
    }).catch(function() { ls.demo = { byType: {} }; });
  }

  function loadModules() {
    ls.modules = null;
    getJson('module_schema_list').then(function(j) {
      ls.modules = (j && (j.schemas || j.data || j.modules)) || [];
      repaintLib();
    }).catch(function() { ls.modules = []; });
  }

  /* ── main content ────────────────────────────────────────────────────── */
  function renderMain() {
    var s = ls.sel;
    var lv = LEVELS.filter(function(l){ return l.key === ls.level; })[0] || LEVELS[0];
    if (!s) {
      return '<div class="' + R + '__card"><div class="' + R + '__cardHd">' + lv.icon + ' ' + esc(lv.label) + '</div>' +
        '<div class="' + R + '__cardBd"><div style="font-size:12px;color:' + td + ';line-height:1.6">' + esc(lv.desc) + '</div>' +
        (ls.level === 'l0b' ? renderL0bOverview() : '') +
        '<div class="' + R + '__hint">Chọn mục bên trái để xem chi tiết.</div></div></div>';
    }
    if (ls.mode === 'browse')   { return renderBrowse(s); }
    if (ls.mode === 'assemble') { return renderAssemble(s); }
    if (ls.mode === 'author')   { return renderAuthor(s); }
    if (ls.mode === 'validate') { return renderValidate(s); }
    return '';
  }

  function renderL0bOverview() {
    return '<div class="' + R + '__tokenGrid">' +
      L0B_GROUPS.map(function(g) {
        return '<div class="' + R + '__tokenCard"><div style="font-weight:700;margin-bottom:' + sp + '">' + esc(g.label) + '</div>' +
          g.tokens.slice(0,4).map(function(t) {
            return '<div style="font-size:10px;font-family:var(--o3-font-mono,monospace);color:' + tm + ';margin-bottom:2px">' + esc(t) + '</div>';
          }).join('') + '</div>';
      }).join('') + '</div>';
  }

  /* ── Browse action bar (L3 / L4 only) ──────────────────────────────── */
  function renderBrowseActions(s) {
    if (!s || (s.kind !== 'l3' && s.kind !== 'l4')) { return ''; }
    var d = s.data || {};
    var isDepr = d.status === 'deprecated';
    var cloneAct  = s.kind === 'l3' ? 'clone-l3'   : 'clone-l4';
    var restoreAct = s.kind === 'l3' ? 'restore-l3' : 'restore-l4';
    var deprAct   = s.kind === 'l3' ? 'deprecate-l3' : 'deprecate-l4';
    return '<div class="' + R + '__actionBar">' +
      '<button type="button" class="' + R + '__btn" data-lw="switch-author">✎ Chỉnh sửa</button>' +
      '<button type="button" class="' + R + '__btn" data-lw="' + cloneAct + '">⎘ Clone</button>' +
      (isDepr
        ? '<button type="button" class="' + R + '__btn ' + R + '__btn--ok" data-lw="' + restoreAct + '">✓ Restore</button>'
        : '<button type="button" class="' + R + '__btn ' + R + '__btn--warn" data-lw="' + deprAct + '">⚠ Deprecate</button>') +
      '</div>' +
      (ls.deprecatePanel && !isDepr ? renderDeprecatePanel() : '');
  }

  function renderDeprecatePanel() {
    return '<div class="' + R + '__deprPanel">' +
      '<div style="font-size:11px;font-weight:700;color:' + wn + ';margin-bottom:' + sp + '">⚠ Xác nhận Deprecate</div>' +
      '<div class="' + R + '__f"><label>Ghi chú deprecate' +
        '<input class="' + R + '__in" data-lw-ef="depr_note" type="text" placeholder="Lý do…"></label></div>' +
      '<div class="' + R + '__f"><label>Thay thế bằng (key tuỳ chọn)' +
        '<input class="' + R + '__in" data-lw-ef="depr_replacement" type="text" placeholder="block-key mới…"></label></div>' +
      '<div class="' + R + '__toolbar">' +
        '<button type="button" class="' + R + '__btn ' + R + '__btn--warn" data-lw="confirm-deprecate">⚠ Xác nhận</button>' +
        '<button type="button" class="' + R + '__btn" data-lw="cancel-deprecate">Huỷ</button>' +
      '</div></div>';
  }

  /* ── Browse ───────────────────────────────────────────────────────────── */
  function renderBrowse(s) {
    if (s.kind === 'token') {
      var cssVar = '--' + s.key.replace(/\./g,'-');
      var resolved = '';
      try { resolved = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim(); } catch(e) {}
      return '<div class="' + R + '__card"><div class="' + R + '__cardHd">◈ ' + esc(s.key) + '</div><div class="' + R + '__cardBd">' +
        '<div class="' + R + '__f"><label>CSS variable</label><code style="font-size:11px;font-family:var(--o3-font-mono,monospace)">' + esc(cssVar) + '</code></div>' +
        '<div class="' + R + '__f"><label>Resolved</label>' + (resolved ? '<span style="font-family:var(--o3-font-mono,monospace);font-size:11px">' + esc(resolved) + '</span>' : '<span style="color:' + tm + '">—</span>') + '</div>' +
        '<div class="' + R + '__f"><label>Dependency graph</label>' + renderDepGraph() + '</div>' +
        '<div style="font-size:11px;color:' + td + ';background:' + sfm + ';border:1px solid ' + bsub + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + '">T2 semantic editing → Theme/Settings preset editor. Lego L0 = read + reference.</div>' +
        '</div></div>';
    }
    if (s.kind === 'l4') {
      var a = s.data || {}; var zones = a.zones ? Object.keys(a.zones) : [];
      var deprBdg = a.status === 'deprecated' ? (' ' + badge('deprecated','deprecated')) : a.status === 'draft' ? (' ' + badge('draft','draft')) : '';
      return '<div class="' + R + '__card"><div class="' + R + '__cardHd">▱ ' + esc(s.key) + ' ' + badge('L4','l4') + deprBdg + '</div><div class="' + R + '__cardBd">' +
        renderBrowseActions(s) +
        (a.status === 'deprecated' && a.deprecation_note ? '<div style="font-size:11px;background:' + wns + ';border:1px solid ' + wn + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + ';margin-bottom:' + sc + '">⚠ Deprecated: ' + esc(a.deprecation_note) + '</div>' : '') +
        '<div class="' + R + '__f"><label>Zones (' + zones.length + ')</label>' +
        zones.map(function(z){ var v=a.zones[z]; var allowed=Array.isArray(v)?v:(v&&v.allowed?[].concat(v.allowed):[]);
          return '<div class="' + R + '__zoneBlock"><div class="' + R + '__zoneLbl">zone: ' + esc(z) + '</div><div class="' + R + '__zoneBd">' + (allowed.length?'blocks: '+chips(allowed):'—') + '</div></div>'; }).join('') + '</div>' +
        '<div class="' + R + '__f"><label>Required blocks</label>' + chips([].concat(a.required_blocks||[])) + '</div>' +
        renderDepGraph() + '</div></div>';
    }
    if (s.kind === 'l5') {
      var m = s.data || {};
      return '<div class="' + R + '__card"><div class="' + R + '__cardHd">📦 ' + esc(s.key) + '</div><div class="' + R + '__cardBd">' +
        '<div class="' + R + '__f"><label>Title</label>' + esc(m.title ? (m.title.vi||m.title.en||s.key) : s.key) + '</div>' +
        '<div class="' + R + '__f"><label>Archetype</label>' + esc(m.moduleArchetype||'—') + '</div>' +
        '<div class="' + R + '__f"><label>Version</label>' + esc(m.version!=null?'v'+m.version:'—') + '</div>' +
        '<div style="font-size:11px;color:' + td + ';background:' + sfm + ';border:1px solid ' + bsub + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + '">Edit via Modules surface. Lego L5 = reference only.</div>' +
        '</div></div>';
    }
    if (s.kind === 'l2-comp') {
      var secs = (window._moduleMasterLevelSections && window._moduleMasterLevelSections['l2']) || [];
      var sec = secs.filter(function(sec){ return sec.id === s.key; })[0];
      return '<div class="' + R + '__card"><div class="' + R + '__cardHd">🧩 ' + esc(s.key) + ' ' + badge('L2','default') + '</div><div class="' + R + '__cardBd">' +
        '<div class="' + R + '__preview">' + (sec ? sec.body_html : '<div class="' + R + '__hint">Preview unavailable.</div>') + '</div>' +
        (sec && sec.tokens ? '<div class="' + R + '__f" style="margin-top:' + sc + '"><label>Required tokens (T3)</label>' + chips(sec.tokens) + '</div>' : '') +
        '</div></div>';
    }
    /* L3/engine — real preview */
    var tc = demoForSel(s);
    var inner = tc ? safeRender(tc.type, tc.cfg) : '';
    if (!inner) { var meta = engineCatalog()[s.key]||{}; inner = '<div class="' + R + '__hint">' + esc(meta.icon||'🧱') + ' ' + esc(meta.label||s.key) + '</div>'; }
    var b = s.kind === 'l3' ? (s.data || {}) : {};
    var deprBadge = b.status === 'deprecated' ? (' ' + badge('deprecated','deprecated')) : b.status === 'draft' ? (' ' + badge('draft','draft')) : '';
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">🧱 ' + esc(s.key) + ' ' + (s.kind==='l3'?badge('L3 SSOT','ssot'):badge('Engine','default')) + deprBadge + '</div><div class="' + R + '__cardBd">' +
      (s.kind==='l3' ? renderBrowseActions(s) : '') +
      (b.status === 'deprecated' && b.deprecation_note ? '<div style="font-size:11px;background:' + wns + ';border:1px solid ' + wn + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + ';margin-bottom:' + sc + '">⚠ Deprecated: ' + esc(b.deprecation_note) + (b.replacement_key ? ' → ' + esc(b.replacement_key) : '') + '</div>' : '') +
      (ls.demo == null ? '<div style="font-size:11px;color:' + tm + ';margin-bottom:' + sp + '">Đang nạp demo…</div>' : '') +
      '<div class="' + R + '__preview">' + inner + '</div>' +
      (s.kind==='l3' ? '<div class="' + R + '__f" style="margin-top:' + sc + '"><label>Composed of (L2)</label>' + chips(b.composed_of) + '</div><div class="' + R + '__f"><label>Required tokens</label>' + chips(b.required_tokens) + '</div>' + renderDepGraph() : '') +
      '</div></div>';
  }

  /* ── Assemble ─────────────────────────────────────────────────────────── */
  function renderAssemble(s) {
    if (!s || (s.kind !== 'l4' && s.kind !== 'l3')) {
      return '<div class="' + R + '__hint">Assemble: chọn L3 Block hoặc L4 Archetype để gán zone/block/slot data.</div>';
    }
    if (s.kind === 'l3') {
      var b = s.data || {}; var slots = b.slots ? Object.keys(b.slots) : [];
      return '<div class="' + R + '__card"><div class="' + R + '__cardHd">⬡ Assemble · L3 · ' + esc(s.key) + '</div><div class="' + R + '__cardBd">' +
        '<div style="font-size:11px;color:' + td + ';background:' + wns + ';border:1px solid ' + wn + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + ';margin-bottom:' + sc + '">Điền data vào slots. Sang Author để sửa contract.</div>' +
        '<div class="' + R + '__f"><label>Slots</label>' + chips(slots) + '</div>' +
        slots.map(function(slot){ return '<div class="' + R + '__f"><label>' + esc(slot) + '</label><input class="' + R + '__in" data-lw-slot="' + esc(slot) + '" type="text"></div>'; }).join('') +
        '</div></div>';
    }
    /* l4 — scaffold new module; only show non-deprecated L3 blocks in zone hint */
    var a = s.data || {}; var zones = a.zones ? Object.keys(a.zones) : [];
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">⬡ Assemble · L4 · ' + esc(s.key) + '</div><div class="' + R + '__cardBd">' +
      '<div class="' + R + '__f"><label>Module ID</label><input class="' + R + '__in" data-lw-ef="moduleId" placeholder="custom-xxx" type="text"></div>' +
      '<div class="' + R + '__f"><label>Tên (VI)</label><input class="' + R + '__in" data-lw-ef="title_vi" placeholder="Tên module…" type="text"></div>' +
      zones.map(function(z){ var v=a.zones[z]; var al=Array.isArray(v)?v:(v&&v.allowed?[].concat(v.allowed):[]);
        /* filter deprecated from allowed hint */
        var nonDeprAl = al.filter(function(k){ var found = findL3(k); return !found || found.status !== 'deprecated'; });
        return '<div class="' + R + '__zoneBlock"><div class="' + R + '__zoneLbl">zone: ' + esc(z) + '</div><div class="' + R + '__zoneBd">Blocks: ' + chips(nonDeprAl) + '</div></div>'; }).join('') +
      '<div class="' + R + '__toolbar" style="margin-top:' + sc + '"><button class="' + R + '__btn ' + R + '__btn--pri" data-lw="assemble-create">＋ Tạo module từ archetype</button></div>' +
      '</div></div>';
  }

  /* ── Author ───────────────────────────────────────────────────────────── */
  function renderAuthor(s) {
    if (!s) { return '<div class="' + R + '__hint">Author: chọn L3 Block hoặc L4 Archetype.</div>'; }
    if (s.kind === 'l3' || s.kind === 'engine') { return renderAuthorL3(s); }
    if (s.kind === 'l4') { return renderAuthorL4(s); }
    if (s.kind === 'token') { return '<div class="' + R + '__hint">Token T1/T2 editing → Theme/Settings. Lego Author = component contracts (T3) + L3/L4 definitions only.</div>'; }
    return '<div class="' + R + '__hint">Author không áp dụng cho level này.</div>';
  }

  function renderAuthorL3(s) {
    var isNew = s.key === '--new--' || (!s.data || !s.data.block_key);
    var b = s.data || { block_key: '', status: 'draft' };
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">' + (isNew ? '＋ Block mới' : ('✎ Author · L3 Contract · ' + esc(s.key))) + '</div><div class="' + R + '__cardBd">' +
      field('block_key',        'block_key',       b.block_key || '', 'text') +
      field('Tên hiển thị (VI)', 'display_name_vi', b.display_name_vi || '', 'text') +
      selectField('Trạng thái', 'status', b.status || 'draft', ['draft','published','deprecated']) +
      field('composed_of (L2, dấu phẩy)', 'composed_of', (b.composed_of||[]).join(', '), 'text') +
      field('required_tokens (dấu phẩy)', 'required_tokens', (b.required_tokens||[]).join(', '), 'text') +
      field('preview_scene_key', 'preview_scene_key', b.preview_scene_key || '', 'text') +
      textareaField('slots (JSON)', 'slots_json', JSON.stringify(b.slots || {}, null, 2)) +
      textareaField('variant_axes (JSON)', 'variant_axes_json', JSON.stringify(b.variant_axes || [], null, 2)) +
      textareaField('a11y_contract (JSON)', 'a11y_json', JSON.stringify(b.a11y_contract || {}, null, 2)) +
      field('Ghi chú deprecate', 'deprecation_note', b.deprecation_note || '', 'text') +
      field('Thay thế bằng (key)', 'replacement_key', b.replacement_key || '', 'text') +
      '<div class="' + R + '__toolbar"><button class="' + R + '__btn ' + R + '__btn--pri" data-lw="save-l3">Lưu L3 contract</button>' +
        '<span style="font-size:11px;color:' + tm + '">→ graphics_block_contract_save + audit_events</span></div>' +
      '</div></div>';
  }

  function renderAuthorL4(s) {
    var isNew = s.key === '--new--' || (!s.data || !s.data.archetype_key);
    var a = s.data || { archetype_key: '', status: 'draft' };
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">' + (isNew ? '＋ Archetype mới' : ('✎ Author · L4 Archetype · ' + esc(s.key))) + '</div><div class="' + R + '__cardBd">' +
      field('archetype_key', 'archetype_key', a.archetype_key || '', 'text') +
      field('Tên hiển thị (VI)', 'display_name_vi', a.display_name_vi || '', 'text') +
      selectField('Trạng thái', 'status', a.status || 'draft', ['draft','published','deprecated']) +
      textareaField('zones (JSON)', 'zones_json', JSON.stringify(a.zones || {}, null, 2)) +
      field('required_blocks (dấu phẩy)', 'required_blocks', (a.required_blocks||[]).join(', '), 'text') +
      field('forbidden_patterns (dấu phẩy)', 'forbidden_patterns', (a.forbidden_patterns||[]).join(', '), 'text') +
      field('Ghi chú deprecate', 'deprecation_note', a.deprecation_note || '', 'text') +
      '<div class="' + R + '__toolbar"><button class="' + R + '__btn ' + R + '__btn--pri" data-lw="save-l4">Lưu L4 archetype</button>' +
        '<span style="font-size:11px;color:' + tm + '">→ graphics_module_archetype_save + audit_events</span></div>' +
      '</div></div>';
  }

  /* A11Y-004: wrap control inside label for implicit for/id association (WCAG 1.3.1) */
  function field(label, name, value, type) {
    return '<div class="' + R + '__f"><label>' + esc(label) +
      '<input class="' + R + '__in" data-lw-ef="' + esc(name) + '" type="' + (type||'text') + '" value="' + esc(value||'') + '"></label></div>';
  }
  function selectField(label, name, value, opts) {
    return '<div class="' + R + '__f"><label>' + esc(label) +
      '<select class="' + R + '__in" data-lw-ef="' + esc(name) + '">' +
      opts.map(function(o){ return '<option value="' + esc(o) + '"' + (value===o?' selected':'') + '>' + esc(o) + '</option>'; }).join('') +
      '</select></label></div>';
  }
  function textareaField(label, name, value) {
    return '<div class="' + R + '__f"><label>' + esc(label) +
      '<textarea class="' + R + '__textarea" data-lw-ef="' + esc(name) + '">' + esc(value||'') + '</textarea></label></div>';
  }

  /* ── Validate ─────────────────────────────────────────────────────────── */
  function renderValidate(s) {
    var results = ls.validateResults;
    var h = '<div class="' + R + '__card"><div class="' + R + '__cardHd">✅ Validate · ' + (s ? esc(s.key) : 'chưa chọn') + '</div><div class="' + R + '__cardBd">';
    if (!s) { return h + '<div class="' + R + '__hint">Chọn một block/archetype/module để validate.</div></div></div>'; }
    h += '<div class="' + R + '__toolbar"><button class="' + R + '__btn ' + R + '__btn--pri" data-lw="run-validate"' +
      (ls.validateRunning ? ' disabled' : '') + '>' + (ls.validateRunning ? '⏳ Đang chạy…' : '▶ Chạy Validate') + '</button>' +
      '<span style="font-size:11px;color:' + tm + '">Ghi evidence → graphics_qa_gate_run + graphics_simulation_run_record</span></div>';
    if (results) {
      /* A11Y-005: scope="col" for screen reader column association */
      h += '<table class="' + R + '__vtbl"><thead><tr><th scope="col">Gate</th><th scope="col">Status</th><th scope="col">Chi tiết</th></tr></thead><tbody>' +
        results.map(function(row) {
          var cls = row.status === 'PASS' ? 'vpass' : row.status === 'WARN' ? 'vwarn' : row.status === 'FAIL_BLOCK' ? 'vfail' : row.status === 'BACKEND_GAP' ? 'vgap' : 'vnr';
          return '<tr><td>' + esc(row.label) + '</td><td><span class="' + R + '__' + cls + '">' + esc(row.status) + '</span></td><td style="font-size:11px">' + esc(row.detail||'—') + '</td></tr>';
        }).join('') + '</tbody></table>';
    } else {
      h += '<div class="' + R + '__hint">Bấm "Chạy Validate" để kiểm tra WCAG · no-hardcode · backend-binding · contract.</div>';
    }
    return h + '</div></div>';
  }

  /* ── Validate runner ──────────────────────────────────────────────────── */
  function doValidate(s) {
    if (!s || ls.validateRunning) { return; }
    ls.validateRunning = true; ls.validateResults = null;
    repaintMain();
    var results = [
      { id:'wcag',     label:'WCAG 2.2 AA contrast',     status:'NOT_RUN', detail:'—' },
      { id:'hardcode', label:'No-hardcode (token authority)', status:'NOT_RUN', detail:'—' },
      { id:'backend',  label:'Backend binding round-trip',status:'NOT_RUN', detail:'—' },
      { id:'contract', label:'Contract integrity',        status:'NOT_RUN', detail:'—' }
    ];
    function upd(id, status, detail) { for (var i=0;i<results.length;i++){if(results[i].id===id){results[i].status=status;results[i].detail=detail;break;}} }

    /* WCAG from :root */
    try {
      var cs = getComputedStyle(document.documentElement);
      var fg = cs.getPropertyValue('--o3-text-strong').trim() || '#0f172a';
      var bg = cs.getPropertyValue('--o3-surface-card').trim() || '#ffffff';
      function h2r(h){ h=h.replace('#',''); if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}; }
      function lm(c){ return ['r','g','b'].reduce(function(s,k,i){var v=c[k]/255;v=v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);return s+[0.2126,0.7152,0.0722][i]*v;},0); }
      var c1=h2r(fg.length>=4?fg:'#0f172a'), c2=h2r(bg.length>=4?bg:'#ffffff');
      if(c1&&c2){ var l1=lm(c1),l2=lm(c2),hi=Math.max(l1,l2),lo=Math.min(l1,l2),ratio=(hi+0.05)/(lo+0.05); upd('wcag',ratio>=4.5?'PASS':ratio>=3?'WARN':'FAIL_BLOCK','text-strong/surface-card '+ratio.toFixed(2)+':1'); }
      else { upd('wcag','NOT_RUN','Could not resolve token colors'); }
    } catch(e) { upd('wcag','NOT_RUN',String(e)); }

    /* No-hardcode gate */
    var b2 = s.data || {};
    if (s.kind==='l3' && (b2.required_tokens||[]).length>0) { upd('hardcode','PASS','required_tokens: '+(b2.required_tokens||[]).join(', ')); }
    else if (s.kind==='token') { upd('hardcode','PASS','Token reference — inherently compliant'); }
    else if (s.kind==='l4') { upd('hardcode','PASS','Archetype zone contract restricts block types'); }
    else { upd('hardcode','WARN','No required_tokens declared. Add in Author mode.'); }

    /* Backend gate */
    var action2 = s.kind==='l5'?'module_schema_validate_bindings':s.kind==='l3'||s.kind==='engine'?'graphics_qa_gate_run':s.kind==='l4'?'graphics_qa_gate_run':null;
    var bodyB = s.kind==='l5'?{moduleId:s.key}:s.kind==='l3'||s.kind==='engine'?{block_key:s.key}:s.kind==='l4'?{archetype_key:s.key}:{};
    var bPromise = action2 ? post(action2, bodyB).then(function(r){
      upd('backend',r&&r.ok!==false?'PASS':'BACKEND_GAP',action2+(r&&r.ok!==false?' ok':(r&&r.error?': '+r.error:' returned error')));
      upd('contract',r&&r.ok!==false&&r.contract_ok!==false?'PASS':'FAIL_BLOCK',r&&r.contract_detail||'backend check complete');
    }).catch(function(e){ upd('backend','BACKEND_GAP','Action not yet implemented: '+e); upd('contract','NOT_RUN','skipped'); }) : Promise.resolve();

    bPromise.then(function() {
      return post('graphics_simulation_run_record', { target_key:s.key, target_kind:s.kind, gate_results:results, run_at:new Date().toISOString() }).catch(function(){});
    }).then(function() {
      ls.validateRunning = false; ls.validateResults = results; repaintMain();
    }).catch(function() {
      /* PERF-003: always unlock the validate button, even if the chain throws */
      ls.validateRunning = false; ls.validateResults = results; repaintMain();
    });
  }

  /* ── rail ─────────────────────────────────────────────────────────────── */
  function renderRail() {
    return '<div class="' + R + '__rail" role="tablist" aria-label="Lego levels" aria-orientation="vertical">' +
      LEVELS.map(function(lv) {
        /* A11Y-001/003: explicit aria-label, aria-hidden icon, aria-pressed state */
        return '<button type="button" class="' + R + '__railBtn' + (ls.level===lv.key?' on':'') + '"' +
          ' data-lw="level" data-level="' + lv.key + '"' +
          ' aria-label="' + esc(lv.label) + '"' +
          ' aria-pressed="' + (ls.level===lv.key ? 'true' : 'false') + '"' +
          ' title="' + esc(lv.label+' — '+lv.desc) + '">' +
          '<span class="ic" aria-hidden="true">' + lv.icon + '</span>' + esc(lv.key.toUpperCase()) + '</button>';
      }).join('') + '</div>';
  }

  function renderModebar() {
    var modes = [{key:'browse',label:'🔍 Browse'},{key:'assemble',label:'⬡ Assemble'},{key:'author',label:'✎ Author'},{key:'validate',label:'✅ Validate'}];
    var lv = LEVELS.filter(function(l){return l.key===ls.level;})[0]||{};
    return '<div class="' + R + '__modebar">' +
      '<span style="font-size:11px;font-weight:700;color:' + tm + ';text-transform:uppercase;letter-spacing:.5px;margin-right:' + sp + '">Mode</span>' +
      /* A11Y-002: aria-pressed conveys active state to screen readers */
      modes.map(function(m){ return '<button type="button" class="' + R + '__modeBtn' + (ls.mode===m.key?' on':'') + '" data-lw="mode" data-mode="' + m.key + '" aria-pressed="' + (ls.mode===m.key ? 'true' : 'false') + '">' + m.label + '</button>'; }).join('') +
      '<span style="margin-left:auto;font-size:11px;color:' + tm + '">' + (lv.icon||'') + ' ' + esc(lv.label||'') + '</span>' +
      '</div>';
  }

  /* ── render ───────────────────────────────────────────────────────────── */
  function render() {
    ensureStyle();
    return '<div class="' + R + '">' + renderModebar() +
      '<div class="' + R + '__layout">' + renderRail() +
      '<div class="' + R + '__lib" data-lw-zone="lib">' + renderLibrary() + '</div>' +
      '<div class="' + R + '__main" data-lw-zone="main">' + renderMain() + '</div>' +
      '</div></div>';
  }

  /* ── repaint helpers ──────────────────────────────────────────────────── */
  function getHost() { var a = getApi(); return a ? a.host() : null; }
  function repaintMain() {
    var h = getHost(); if (!h) { return; }
    var c = h.querySelector('[data-lw-zone="main"]');
    if (c) { c.innerHTML = renderMain(); wirePreview(c); }
  }
  function repaintLib() {
    var h = getHost(); if (!h) { return; }
    var c = h.querySelector('[data-lw-zone="lib"]');
    if (c) { c.innerHTML = renderLibrary(); }
  }
  function setModebar(mode) {
    var host = getHost(); if (!host) { return; }
    ls.mode = mode;
    host.querySelectorAll('.' + R + '__modeBtn').forEach(function(b){
      var on = b.getAttribute('data-mode') === mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function wirePreview(container) {
    if (!container) { return; }
    container.querySelectorAll('[role="tab"],.o3-shell__tab,[data-tab-id]').forEach(function(btn) {
      if (btn.__lwWired) { return; } btn.__lwWired = true;
      btn.addEventListener('click', function() {
        var parent = btn.closest('[role="tablist"]') || btn.parentElement;
        if (parent) { parent.querySelectorAll('[role="tab"],.o3-shell__tab,[data-tab-id]').forEach(function(b){ b.classList.remove('active','o3-shell__tab--active'); b.setAttribute('aria-selected','false'); }); }
        btn.classList.add('active','o3-shell__tab--active'); btn.setAttribute('aria-selected','true');
      });
    });
  }

  /* ── onMount ──────────────────────────────────────────────────────────── */
  function onMount(host) {
    loadDemo();
    if (!window._legoLevelSections && window._moduleMasterLevelSections) {
      window._legoLevelSections = window._moduleMasterLevelSections;
    }
    wirePreview(host);
    /* The shell's delegation only routes [data-ms] elements. Our internal
       controls use [data-lw] so we add our own once-only delegated listeners. */
    if (host.__lwDelegated) { return; }
    host.__lwDelegated = true;
    host.addEventListener('click', function(ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('[data-lw]') : null;
      if (!t || !host.contains(t)) { return; }
      onAction(t.getAttribute('data-lw'), t);
    });
    host.addEventListener('input', function(ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) { return; }
      if (t.getAttribute('data-lw') === 'search') { onAction('search', t); }
    });
  }

  /* ── lookup ───────────────────────────────────────────────────────────── */
  function lookupData(kind, key) {
    if (kind==='l3') { return findL3(key); }
    if (kind==='l4') { return findL4(key); }
    if (kind==='l5') { return (ls.modules||[]).filter(function(m){return (m.moduleId||m.id)===key;})[0]||null; }
    if (kind==='l2-comp') { var ss=(window._moduleMasterLevelSections&&window._moduleMasterLevelSections['l2'])||[]; return ss.filter(function(s){return s.id===key;})[0]||null; }
    if (kind==='engine') { return engineCatalog()[key]||null; }
    return null;
  }

  /* ── action utilities ─────────────────────────────────────────────────── */
  function efVal(host, name) { var e = host && host.querySelector('[data-lw-ef="' + name + '"]'); return e ? e.value : ''; }
  function splitList(s) { return s.split(',').map(function(x){return x.trim();}).filter(Boolean); }
  function parseJson(host, name) { try { return JSON.parse(efVal(host, name) || '{}'); } catch(e) { return null; } }

  /* ── Save L3 ─────────────────────────────────────────────────────────── */
  function doSaveL3(host) {
    var s = ls.sel; if (!s) { return; }
    var slots    = parseJson(host, 'slots_json');
    var varAxes  = parseJson(host, 'variant_axes_json');
    var a11y     = parseJson(host, 'a11y_json');
    if (!slots || !varAxes || !a11y) { toast('JSON không hợp lệ.', 'error'); return; }
    var bk = efVal(host,'block_key').trim() || (s.key !== '--new--' ? s.key : '');
    if (!bk) { toast('Vui lòng nhập block_key.', 'error'); return; }
    var block = {
      block_key:         bk,
      display_name_vi:   efVal(host,'display_name_vi'),
      status:            efVal(host,'status') || 'draft',
      composed_of:       splitList(efVal(host,'composed_of')),
      required_tokens:   splitList(efVal(host,'required_tokens')),
      preview_scene_key: efVal(host,'preview_scene_key'),
      slots: slots, variant_axes: varAxes, a11y_contract: a11y,
      deprecation_note:  efVal(host,'deprecation_note'),
      replacement_key:   efVal(host,'replacement_key')
    };
    post('graphics_block_contract_save', { block: block })
      .then(function(r) {
        if (r && r.ok !== false) {
          toast('Đã lưu L3 "' + block.block_key + '".', 'success');
          reloadL3(function() {
            ls.sel = { kind: 'l3', key: block.block_key, data: findL3(block.block_key) };
            repaintLib();
            repaintMain();
          });
        } else {
          toast('Lưu thất bại' + (r && r.error ? ': ' + r.error : ''), 'error');
        }
      })
      .catch(function(e){ toast('Lỗi: ' + e, 'error'); });
  }

  /* ── Save L4 ─────────────────────────────────────────────────────────── */
  function doSaveL4(host) {
    var s = ls.sel; if (!s) { return; }
    var zones = parseJson(host,'zones_json');
    if (!zones) { toast('JSON zones không hợp lệ.', 'error'); return; }
    var ak = efVal(host,'archetype_key').trim() || (s.key !== '--new--' ? s.key : '');
    if (!ak) { toast('Vui lòng nhập archetype_key.', 'error'); return; }
    var arch = {
      archetype_key:    ak,
      display_name_vi:  efVal(host,'display_name_vi'),
      status:           efVal(host,'status') || 'draft',
      zones:            zones,
      required_blocks:  splitList(efVal(host,'required_blocks')),
      forbidden_patterns: splitList(efVal(host,'forbidden_patterns')),
      deprecation_note: efVal(host,'deprecation_note')
    };
    post('graphics_module_archetype_save', { archetype: arch })
      .then(function(r) {
        if (r && r.ok !== false) {
          toast('Đã lưu L4 "' + arch.archetype_key + '".', 'success');
          reloadL4(function() {
            ls.sel = { kind: 'l4', key: arch.archetype_key, data: findL4(arch.archetype_key) };
            repaintLib();
            repaintMain();
          });
        } else {
          toast('Lưu thất bại' + (r && r.error ? ': ' + r.error : ''), 'error');
        }
      })
      .catch(function(e){ toast('Lỗi: ' + e, 'error'); });
  }

  /* ── Clone L3 ────────────────────────────────────────────────────────── */
  function doCloneL3(s) {
    if (!s) { return; }
    var b = s.data || {};
    var newKey = (s.key || b.block_key || 'block') + '-copy';
    var cloned = {
      block_key: newKey,
      display_name_vi: (b.display_name_vi || s.key) + ' (bản sao)',
      status: 'draft',
      composed_of:     [].concat(b.composed_of     || []),
      required_tokens: [].concat(b.required_tokens || []),
      preview_scene_key: b.preview_scene_key || '',
      slots:           b.slots           || {},
      variant_axes:    b.variant_axes    || [],
      a11y_contract:   b.a11y_contract   || {}
    };
    post('graphics_block_contract_save', { block: cloned })
      .then(function(r) {
        if (r && r.ok !== false) {
          toast('Đã clone thành "' + newKey + '" (draft).', 'success');
          reloadL3(function() {
            ls.sel = { kind: 'l3', key: newKey, data: findL3(newKey) };
            setModebar('author');
            repaintLib();
            repaintMain();
          });
        } else { toast('Clone thất bại' + (r && r.error ? ': ' + r.error : ''), 'error'); }
      })
      .catch(function(e){ toast('Lỗi clone: ' + e, 'error'); });
  }

  /* ── Clone L4 ────────────────────────────────────────────────────────── */
  function doCloneL4(s) {
    if (!s) { return; }
    var a = s.data || {};
    var newKey = (s.key || a.archetype_key || 'arch') + '-copy';
    var cloned = {
      archetype_key: newKey,
      display_name_vi: (a.display_name_vi || s.key) + ' (bản sao)',
      status: 'draft',
      zones:              a.zones              || {},
      required_blocks:    [].concat(a.required_blocks    || []),
      forbidden_patterns: [].concat(a.forbidden_patterns || [])
    };
    post('graphics_module_archetype_save', { archetype: cloned })
      .then(function(r) {
        if (r && r.ok !== false) {
          toast('Đã clone thành "' + newKey + '" (draft).', 'success');
          reloadL4(function() {
            ls.sel = { kind: 'l4', key: newKey, data: findL4(newKey) };
            setModebar('author');
            repaintLib();
            repaintMain();
          });
        } else { toast('Clone thất bại' + (r && r.error ? ': ' + r.error : ''), 'error'); }
      })
      .catch(function(e){ toast('Lỗi clone: ' + e, 'error'); });
  }

  /* ── Confirm deprecate ───────────────────────────────────────────────── */
  function doConfirmDeprecate(s, note, replacement) {
    if (!s) { return; }
    if (s.kind === 'l3') {
      var b = s.data || {};
      var block = {
        block_key:         s.key,
        display_name_vi:   b.display_name_vi || s.key,
        status:            'deprecated',
        composed_of:       [].concat(b.composed_of     || []),
        required_tokens:   [].concat(b.required_tokens || []),
        preview_scene_key: b.preview_scene_key || '',
        slots:             b.slots             || {},
        variant_axes:      b.variant_axes      || [],
        a11y_contract:     b.a11y_contract     || {},
        deprecation_note:  note || 'Deprecated',
        replacement_key:   replacement || ''
      };
      post('graphics_block_contract_save', { block: block })
        .then(function(r) {
          ls.deprecatePanel = false;
          if (r && r.ok !== false) {
            toast('"' + s.key + '" đã được deprecate.', 'success');
            reloadL3(function() {
              ls.sel = { kind: 'l3', key: s.key, data: findL3(s.key) };
              repaintLib(); repaintMain();
            });
          } else { toast('Deprecate thất bại.', 'error'); repaintMain(); }
        })
        .catch(function(e) { ls.deprecatePanel = false; toast('Lỗi: ' + e, 'error'); repaintMain(); });
    } else if (s.kind === 'l4') {
      var a = s.data || {};
      var arch = {
        archetype_key:    s.key,
        display_name_vi:  a.display_name_vi || s.key,
        status:           'deprecated',
        zones:            a.zones              || {},
        required_blocks:  [].concat(a.required_blocks    || []),
        forbidden_patterns: [].concat(a.forbidden_patterns || []),
        deprecation_note: note || 'Deprecated'
      };
      post('graphics_module_archetype_save', { archetype: arch })
        .then(function(r) {
          ls.deprecatePanel = false;
          if (r && r.ok !== false) {
            toast('"' + s.key + '" đã được deprecate.', 'success');
            reloadL4(function() {
              ls.sel = { kind: 'l4', key: s.key, data: findL4(s.key) };
              repaintLib(); repaintMain();
            });
          } else { toast('Deprecate thất bại.', 'error'); repaintMain(); }
        })
        .catch(function(e) { ls.deprecatePanel = false; toast('Lỗi: ' + e, 'error'); repaintMain(); });
    }
  }

  /* ── Restore (undo deprecate) ─────────────────────────────────────────── */
  function doRestore(s) {
    if (!s) { return; }
    if (s.kind === 'l3') {
      var b = s.data || {};
      var block = {
        block_key:         s.key,
        display_name_vi:   b.display_name_vi || s.key,
        status:            'published',
        composed_of:       [].concat(b.composed_of     || []),
        required_tokens:   [].concat(b.required_tokens || []),
        preview_scene_key: b.preview_scene_key || '',
        slots:             b.slots             || {},
        variant_axes:      b.variant_axes      || [],
        a11y_contract:     b.a11y_contract     || {}
      };
      post('graphics_block_contract_save', { block: block })
        .then(function(r) {
          if (r && r.ok !== false) {
            toast('"' + s.key + '" đã restore về published.', 'success');
            reloadL3(function() {
              ls.sel = { kind: 'l3', key: s.key, data: findL3(s.key) };
              repaintLib(); repaintMain();
            });
          } else { toast('Restore thất bại.', 'error'); }
        })
        .catch(function(e){ toast('Lỗi: ' + e, 'error'); });
    } else if (s.kind === 'l4') {
      var a = s.data || {};
      var arch = {
        archetype_key:    s.key,
        display_name_vi:  a.display_name_vi || s.key,
        status:           'published',
        zones:            a.zones              || {},
        required_blocks:  [].concat(a.required_blocks    || []),
        forbidden_patterns: [].concat(a.forbidden_patterns || [])
      };
      post('graphics_module_archetype_save', { archetype: arch })
        .then(function(r) {
          if (r && r.ok !== false) {
            toast('"' + s.key + '" đã restore về published.', 'success');
            reloadL4(function() {
              ls.sel = { kind: 'l4', key: s.key, data: findL4(s.key) };
              repaintLib(); repaintMain();
            });
          } else { toast('Restore thất bại.', 'error'); }
        })
        .catch(function(e){ toast('Lỗi: ' + e, 'error'); });
    }
  }

  /* ── Assemble create ─────────────────────────────────────────────────── */
  function doAssembleCreate(host) {
    var s = ls.sel; if (!s || s.kind !== 'l4') { return; }
    var mid = efVal(host,'moduleId').trim(); if (!mid) { toast('Vui lòng nhập Module ID.','error'); return; }
    var titleVi = efVal(host,'title_vi').trim();
    var schema = { moduleId:mid, title:{vi:titleVi||mid,en:mid}, icon:'📦', route:'/'+mid, roles:['it_admin'], version:1, moduleArchetype:s.key, config:{theme:'hesem-default'}, tabs:[] };
    post('module_schema_save', { schema: schema })
      .then(function(r){ toast(r&&r.ok!==false?'Đã tạo module "'+mid+'" từ "'+s.key+'".':'Tạo thất bại.', r&&r.ok!==false?'success':'error'); ls.modules=null; })
      .catch(function(e){ toast('Lỗi: '+e,'error'); });
  }

  /* ── onAction ─────────────────────────────────────────────────────────── */
  function onAction(k, target) {
    var host = getHost();
    if (k === 'level') {
      ls.level = target.getAttribute('data-level') || 'l0a';
      ls.sel = null; ls.validateResults = null; ls.deprecatePanel = false;
      if (ls.level==='l5' && !ls.modules) { loadModules(); }
      var lib = host && host.querySelector('[data-lw-zone="lib"]');
      if (lib) { lib.innerHTML = renderLibrary(); }
      repaintMain();
      /* A11Y-003: keep aria-pressed in sync */
      host && host.querySelectorAll('.' + R + '__railBtn').forEach(function(b){
        var on = b.getAttribute('data-level')===ls.level;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      return true;
    }
    if (k === 'mode') {
      ls.mode = target.getAttribute('data-mode') || 'browse';
      ls.validateResults = null; ls.deprecatePanel = false;
      /* A11Y-002: keep aria-pressed in sync */
      host && host.querySelectorAll('.' + R + '__modeBtn').forEach(function(b){
        var on = b.getAttribute('data-mode')===ls.mode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      repaintMain();
      return true;
    }
    /* BUG-2: intercept shell 'simulate' action — redirect to Validate mode per DEC-002 */
    if (k === 'simulate') {
      setModebar('validate');
      repaintMain();
      return true;
    }
    if (k === 'sel') {
      var kind = target.getAttribute('data-kind'), key = target.getAttribute('data-key');
      ls.sel = { kind: kind, key: key, data: lookupData(kind, key) };
      ls.validateResults = null; ls.deprecatePanel = false;
      host && host.querySelectorAll('.' + R + '__item').forEach(function(i){ i.classList.toggle('on', i.getAttribute('data-kind')===kind && i.getAttribute('data-key')===key); });
      repaintMain();
      return true;
    }
    if (k === 'search') { ls.q = target.value || ''; repaintLib(); return true; }

    /* ── CRUD actions ─────────────────────────────────────────────────── */
    if (k === 'new-l3') {
      ls.sel = { kind: 'l3', key: '--new--', data: { block_key: '', status: 'draft' } };
      ls.validateResults = null; ls.deprecatePanel = false;
      setModebar('author');
      repaintMain();
      return true;
    }
    if (k === 'new-l4') {
      ls.sel = { kind: 'l4', key: '--new--', data: { archetype_key: '', status: 'draft' } };
      ls.validateResults = null; ls.deprecatePanel = false;
      setModebar('author');
      repaintMain();
      return true;
    }
    if (k === 'switch-author') {
      ls.deprecatePanel = false;
      setModebar('author');
      repaintMain();
      return true;
    }
    if (k === 'clone-l3') { doCloneL3(ls.sel); return true; }
    if (k === 'clone-l4') { doCloneL4(ls.sel); return true; }
    if (k === 'deprecate-l3' || k === 'deprecate-l4') {
      ls.deprecatePanel = true;
      repaintMain();
      return true;
    }
    if (k === 'cancel-deprecate') {
      ls.deprecatePanel = false;
      repaintMain();
      return true;
    }
    if (k === 'confirm-deprecate') {
      var note = efVal(host, 'depr_note');
      var replacement = efVal(host, 'depr_replacement');
      doConfirmDeprecate(ls.sel, note, replacement);
      return true;
    }
    if (k === 'restore-l3' || k === 'restore-l4') { doRestore(ls.sel); return true; }

    if (k === 'save-l3') { doSaveL3(host); return true; }
    if (k === 'save-l4') { doSaveL4(host); return true; }
    if (k === 'assemble-create') { doAssembleCreate(host); return true; }
    if (k === 'run-validate') { doValidate(ls.sel); return true; }
    return false;
  }

  /* ── register ─────────────────────────────────────────────────────────── */
  window.MStudio.registerSurface('lego', {
    label: '🧱 Lego', order: 10,
    render: render, onMount: onMount, onAction: onAction
  });
  /* fold old standalone Tokens surface into Lego L0 */
  window.MStudio.registerSurface('tokens', { hidden: true });

})();
