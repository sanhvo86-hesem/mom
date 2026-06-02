/* ============================================================================
 * 32c-mstudio-governance-reference.js — Module Studio vNext · P3
 *   🛡️ Governance — release lifecycle + WCAG evidence (reuses 00c renderers)
 *   📖 Reference  — Authority Playbook (read-only, generated)
 * ----------------------------------------------------------------------------
 * SSOT: --o3-* tokens; spacing 8/12; control 32; radius 4/8/pill.
 * NO hex/px authority in JS.
 * ==========================================================================*/
(function () {
  'use strict';

  if (!window.MStudio || typeof window.MStudio.registerSurface !== 'function') { return; }

  var R = 'ms-gov';
  var STYLE_ID = 'ms-gov-css';
  var sp = 'var(--o3-space,8px)', sc = 'var(--o3-space-section,12px)',
      rd = 'var(--o3-radius,4px)', rc = 'var(--o3-radius-card,8px)', pill = 'var(--o3-radius-pill,999px)',
      ch = 'var(--o3-control-h-standard,32px)',
      sf = 'var(--o3-surface-card,#fff)', sfm = 'var(--o3-surface-muted,#f1f5f9)',
      bsub = 'var(--o3-border-subtle,#e5e7eb)', bdef = 'var(--o3-border-default,#cbd5e1)',
      ts = 'var(--o3-text-strong,#0f172a)', td = 'var(--o3-text-default,#475569)', tm = 'var(--o3-text-muted,#94a3b8)',
      br = 'var(--o3-brand,#0c4a6e)', brs = 'var(--o3-brand-soft,#e0f2fe)',
      ok = 'var(--o3-success,#15803d)', oks = 'var(--o3-success-soft,#dcfce7)',
      wn = 'var(--o3-warning,#b45309)', wns = 'var(--o3-warning-soft,#fef3c7)',
      dg = 'var(--o3-danger,#b91c1c)', dgs = 'var(--o3-danger-soft,#fee2e2)',
      info = 'var(--o3-info,#0369a1)', infos = 'var(--o3-info-soft,#e0f2fe)';

  /* ── helpers ────────────────────────────────────────────────────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function api() { return window.MStudio && window.MStudio.api ? window.MStudio.api : null; }
  function toast(m, t) { var a = api(); if (a) { a.toast(m, t); } }

  /* ── CSS ─────────────────────────────────────────────────────────────── */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) { return; }
    var css =
      '.' + R + '{padding:' + sc + ';overflow:auto;min-height:0;flex:1}' +
      '.' + R + '__tabs{display:flex;gap:' + sp + ';margin-bottom:' + sc + ';border-bottom:1px solid ' + bsub + ';padding-bottom:1px}' +
      '.' + R + '__tab{height:' + ch + ';padding:0 ' + sc + ';border:none;background:none;cursor:pointer;font:inherit;font-size:13px;font-weight:600;color:' + td + ';border-bottom:2px solid transparent;margin-bottom:-1px}' +
      '.' + R + '__tab.on{color:' + br + ';border-bottom-color:' + br + '}' +
      '.' + R + '__panel{display:none}.' + R + '__panel.on{display:block}' +
      '.' + R + '__card{background:' + sf + ';border:1px solid ' + bsub + ';border-radius:' + rc + ';margin-bottom:' + sc + ';overflow:hidden}' +
      '.' + R + '__cardHd{display:flex;align-items:center;gap:' + sp + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px solid ' + bsub + ';font-size:11px;font-weight:700;color:' + td + '}' +
      '.' + R + '__cardBd{padding:' + sc + '}' +
      '.' + R + '__tbl{width:100%;border-collapse:collapse;font-size:12px}' +
      '.' + R + '__tbl th{text-align:left;font-size:10px;letter-spacing:.3px;text-transform:uppercase;color:' + tm + ';padding:' + sp + ' ' + sc + ';background:' + sfm + ';border-bottom:1px solid ' + bsub + '}' +
      '.' + R + '__tbl td{padding:' + sp + ' ' + sc + ';border-bottom:1px solid ' + bsub + ';vertical-align:top;font-size:12px}' +
      '.' + R + '__tbl tr:last-child td{border-bottom:0}' +
      '.' + R + '__badge{display:inline-flex;align-items:center;height:16px;padding:0 ' + sp + ';border-radius:' + pill + ';font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}' +
      '.' + R + '__badge--pass{background:' + oks + ';color:' + ok + '}' +
      '.' + R + '__badge--warn{background:' + wns + ';color:' + wn + '}' +
      '.' + R + '__badge--fail{background:' + dgs + ';color:' + dg + '}' +
      '.' + R + '__badge--info{background:' + infos + ';color:' + info + '}' +
      '.' + R + '__badge--default{background:' + sfm + ';color:' + td + '}' +
      '.' + R + '__code{font-family:var(--o3-font-mono,monospace);font-size:11px;background:' + sfm + ';border-radius:' + rd + ';padding:1px ' + sp + '}' +
      '.' + R + '__note{font-size:11px;line-height:1.6;color:' + td + ';background:' + sfm + ';border:1px solid ' + bsub + ';border-radius:' + rd + ';padding:' + sp + ' ' + sc + '}' +
      '.' + R + '__btn{height:' + ch + ';padding:0 ' + sc + ';border:1px solid ' + bdef + ';background:' + sf + ';cursor:pointer;border-radius:' + rd + ';font:inherit;font-size:12px;color:' + ts + '}' +
      '.' + R + '__btn:hover{background:' + sfm + '}' +
      '.' + R + '__hint{text-align:center;color:' + tm + ';font-size:12px;padding:' + sc + '}' +
      '.' + R + '__section{margin-bottom:' + sc + '}' +
      '.' + R + '__section h4{margin:0 0 ' + sp + ' 0;font-size:12px;font-weight:700;color:' + ts + '}' +
      /* WCAG contrast table */
      '.' + R + '__contrastRow{display:flex;align-items:center;gap:' + sc + ';padding:' + sp + ' 0;border-bottom:1px solid ' + bsub + ';font-size:12px}' +
      '.' + R + '__contrastRow:last-child{border-bottom:0}' +
      '.' + R + '__swatch{display:inline-flex;align-items:center;gap:' + sp + '}' +
      '.' + R + '__swBox{width:20px;height:20px;border-radius:' + rd + ';border:1px solid ' + bsub + ';flex-shrink:0}';
    var el = document.createElement('style'); el.id = STYLE_ID; el.textContent = css; document.head.appendChild(el);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * GOVERNANCE SURFACE
   * Reuses the live 00c-admin-appearance renderers (exposed as globals):
   *   window._renderAdmGovernance()  — full governance control plane
   *   window._renderAdmTemplates()   — template registry lifecycle
   *   window._renderAdmAdvanced()    — changeset/waiver/import-export (rollout REMOVED)
   * WCAG contrast evidence is computed fresh from :root tokens here.
   * ═══════════════════════════════════════════════════════════════════════ */

  var govState = { tab: 'wcag' }; // 'wcag' | 'governance' | 'templates' | 'advanced'

  function renderGovernanceTabs() {
    var tabs = [
      { key: 'wcag', label: '♿ WCAG Evidence' },
      { key: 'governance', label: '🛡️ Governance' },
      { key: 'templates', label: '📐 Templates' },
      { key: 'advanced', label: '🧩 Advanced' }
    ];
    return '<div class="' + R + '__tabs">' +
      tabs.map(function (t) {
        return '<button class="' + R + '__tab' + (govState.tab === t.key ? ' on' : '') + '" data-gc="tab" data-tab="' + t.key + '">' + esc(t.label) + '</button>';
      }).join('') +
      '</div>';
  }

  /* WCAG 2.2 AA contrast panel — computed live from resolved :root tokens */
  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') { return null; }
    hex = hex.trim().replace('#', '');
    if (hex.length === 3) { hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]; }
    if (hex.length !== 6) { return null; }
    return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
  }
  function relLum(c) {
    return ['r','g','b'].reduce(function (s, k, i) {
      var v = c[k] / 255; v = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      return s + [0.2126, 0.7152, 0.0722][i] * v;
    }, 0);
  }
  function contrastRatio(hex1, hex2) {
    var c1 = hexToRgb(hex1), c2 = hexToRgb(hex2); if (!c1 || !c2) { return 1; }
    var l1 = relLum(c1), l2 = relLum(c2), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function getToken(cssVar) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim(); } catch (e) { return ''; }
  }
  function wcagBadge(ratio) {
    if (ratio >= 7) { return '<span class="' + R + '__badge ' + R + '__badge--pass">AAA ' + ratio.toFixed(1) + ':1</span>'; }
    if (ratio >= 4.5) { return '<span class="' + R + '__badge ' + R + '__badge--pass">AA ' + ratio.toFixed(1) + ':1</span>'; }
    if (ratio >= 3) { return '<span class="' + R + '__badge ' + R + '__badge--warn">AA-Large ' + ratio.toFixed(1) + ':1</span>'; }
    return '<span class="' + R + '__badge ' + R + '__badge--fail">FAIL ' + ratio.toFixed(1) + ':1</span>';
  }
  function apcaLc(textHex, bgHex) {
    /* Simplified APCA-W3 Lc approximation (guidance only, not WCAG-3 compliance) */
    var c1 = hexToRgb(textHex), c2 = hexToRgb(bgHex); if (!c1 || !c2) { return null; }
    function sRGB(c) { return ['r','g','b'].reduce(function (s,k,i){ var v=c[k]/255; v=v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); return s+[0.2126,0.7152,0.0722][i]*v; },0); }
    var sa = sRGB(c2), sb = sRGB(c1);
    var Sapc = Math.pow(sa, 0.56) - Math.pow(sb, 0.57);
    return (Sapc > 0 ? 1.14 : 1.14) * Sapc * 100; // simplified
  }

  function renderWcagPanel() {
    var cs = getComputedStyle(document.documentElement);
    var textStrong  = cs.getPropertyValue('--o3-text-strong').trim()   || '#0f172a';
    var textDefault = cs.getPropertyValue('--o3-text-default').trim()  || '#475569';
    var textMuted   = cs.getPropertyValue('--o3-text-muted').trim()    || '#94a3b8';
    var brand       = cs.getPropertyValue('--o3-brand').trim()         || '#0c4a6e';
    var surfCard    = cs.getPropertyValue('--o3-surface-card').trim()  || '#ffffff';
    var surfMuted   = cs.getPropertyValue('--o3-surface-muted').trim() || '#f1f5f9';
    var dangerColor = cs.getPropertyValue('--o3-danger').trim()        || '#b91c1c';
    var successColor= cs.getPropertyValue('--o3-success').trim()       || '#15803d';

    var pairs = [
      { label: 'Text Strong / Surface Card',    fg: textStrong,  bg: surfCard  },
      { label: 'Text Strong / Surface Muted',   fg: textStrong,  bg: surfMuted },
      { label: 'Text Default / Surface Card',   fg: textDefault, bg: surfCard  },
      { label: 'Text Muted / Surface Card',     fg: textMuted,   bg: surfCard  },
      { label: 'Brand (White text / Brand bg)', fg: '#ffffff',   bg: brand     },
      { label: 'Danger text / Surface Card',    fg: dangerColor, bg: surfCard  },
      { label: 'Success text / Surface Card',   fg: successColor,bg: surfCard  }
    ];

    var allPass = pairs.every(function (p) { var r = contrastRatio(p.fg, p.bg); return r >= 4.5 || (r >= 3); });
    var failCount = pairs.filter(function (p) { return contrastRatio(p.fg, p.bg) < 3; }).length;

    var h = '<div class="' + R + '__card"><div class="' + R + '__cardHd">♿ WCAG 2.2 AA Live Contrast Audit' +
      '<span class="' + R + '__badge ' + (failCount ? R + '__badge--fail' : R + '__badge--pass') + '" style="margin-left:auto">' +
      (failCount ? failCount + ' FAIL' : 'ALL PASS') + '</span></div><div class="' + R + '__cardBd">';

    h += '<div style="font-size:11px;color:' + tm + ';margin-bottom:' + sc + '">Tính từ token :root thực tế. WCAG 2.2 AA = 4.5:1 text, 3:1 large/UI. APCA Lc = tham chiếu nhận thức (draft, không phải compliance).</div>';

    h += '<table class="' + R + '__tbl"><thead><tr>' +
      '<th>Token pair</th><th>FG color</th><th>BG color</th><th>WCAG 2.2</th><th>APCA Lc</th>' +
      '</tr></thead><tbody>' +
      pairs.map(function (p) {
        var ratio = contrastRatio(p.fg, p.bg);
        var lc = apcaLc(p.fg, p.bg);
        return '<tr>' +
          '<td>' + esc(p.label) + '</td>' +
          '<td><span style="display:inline-flex;align-items:center;gap:' + sp + '">' +
            '<span style="width:14px;height:14px;border-radius:' + rd + ';background:' + esc(p.fg) + ';border:1px solid ' + bsub + ';flex-shrink:0"></span>' +
            '<span class="' + R + '__code">' + esc(p.fg || '?') + '</span></span></td>' +
          '<td><span style="display:inline-flex;align-items:center;gap:' + sp + '">' +
            '<span style="width:14px;height:14px;border-radius:' + rd + ';background:' + esc(p.bg) + ';border:1px solid ' + bsub + ';flex-shrink:0"></span>' +
            '<span class="' + R + '__code">' + esc(p.bg || '?') + '</span></span></td>' +
          '<td>' + wcagBadge(ratio) + '</td>' +
          '<td><span style="font-size:11px;color:' + tm + '">' + (lc !== null ? 'Lc ' + lc.toFixed(0) : '—') + '</span></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    /* Evidence record button */
    h += '<div style="margin-top:' + sc + ';display:flex;gap:' + sp + ';align-items:center">' +
      '<button class="' + R + '__btn" data-gc="record-wcag-evidence">📋 Ghi evidence vào graphics_simulation_run_record</button>' +
      '<span id="ms-gov-wcag-status" style="font-size:11px;color:' + tm + '"></span>' +
      '</div>';

    h += '</div></div>';

    /* APCA guidance note */
    h += '<div class="' + R + '__note">APCA (Accessible Perceptual Contrast Algorithm) = công cụ hướng dẫn cho dark mode / chữ mảnh (WCAG-3, còn draft). Dùng WCAG 2.2 cho compliance; APCA để tinh chỉnh.</div>';

    return h;
  }

  /* Wraps existing 00c renderers — if not yet exposed as globals, show placeholder */
  function callAdm(fn) {
    if (typeof window[fn] === 'function') {
      try { return window[fn]() || ''; } catch (e) { return '<div class="' + R + '__note">Lỗi render ' + esc(fn) + ': ' + esc(String(e)) + '</div>'; }
    }
    return '<div class="' + R + '__note">' + esc(fn) + ' chưa nạp — kiểm tra 00c-admin-appearance.js expose globals.</div>';
  }

  function renderGovPanel() {
    /* Reuse live governance control plane from 00c-admin-appearance.js */
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">🛡️ Graphics Governance Control Plane</div><div class="' + R + '__cardBd">' +
      callAdm('_renderAdmGovernance') +
      '</div></div>';
  }

  function renderTemplatesPanel() {
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">📐 Template Registry Lifecycle</div><div class="' + R + '__cardBd">' +
      callAdm('_renderAdmTemplates') +
      '</div></div>';
  }

  function renderAdvancedPanel() {
    /* renderAdvanced reuse — rollout buttons removed there per de-dup rule (templates owns rollout) */
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">🧩 Advanced · Changeset / Waiver / Import-Export</div><div class="' + R + '__cardBd">' +
      callAdm('_renderAdmAdvanced') +
      '</div></div>';
  }

  /* ── Governance render entry ─────────────────────────────────────────── */
  function renderGovernance() {
    ensureStyle();
    var h = '<div class="' + R + '">' + renderGovernanceTabs();
    h += '<div class="' + R + '__panel' + (govState.tab === 'wcag' ? ' on' : '') + '" data-gc-panel="wcag">' + renderWcagPanel() + '</div>';
    h += '<div class="' + R + '__panel' + (govState.tab === 'governance' ? ' on' : '') + '" data-gc-panel="governance">' + (govState.tab === 'governance' ? renderGovPanel() : '') + '</div>';
    h += '<div class="' + R + '__panel' + (govState.tab === 'templates' ? ' on' : '') + '" data-gc-panel="templates">' + (govState.tab === 'templates' ? renderTemplatesPanel() : '') + '</div>';
    h += '<div class="' + R + '__panel' + (govState.tab === 'advanced' ? ' on' : '') + '" data-gc-panel="advanced">' + (govState.tab === 'advanced' ? renderAdvancedPanel() : '') + '</div>';
    h += '</div>';
    return h;
  }

  function govOnMount(host) {
    if (host.__govDelegated) { return; }
    host.__govDelegated = true;
    host.addEventListener('click', function(ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('[data-gc]') : null;
      if (t && host.contains(t)) { govActionRouter(t.getAttribute('data-gc'), t, ev); }
    });
  }

  function govOnAction(k, target, ev) {
    var a = api();
    if (k === 'tab') {
      var newTab = target.getAttribute('data-tab') || 'wcag';
      govState.tab = newTab;
      /* repaint body so lazy panels load */
      if (a) { a.repaintBody(); }
      return true;
    }
    if (k === 'record-wcag-evidence') {
      var pairs2 = [];
      var cs = getComputedStyle(document.documentElement);
      var textStrong2 = cs.getPropertyValue('--o3-text-strong').trim() || '#0f172a';
      var surfCard2   = cs.getPropertyValue('--o3-surface-card').trim() || '#ffffff';
      pairs2.push({ pair: 'text-strong/surface-card', ratio: contrastRatio(textStrong2, surfCard2).toFixed(2) });
      var body = { target_key: 'wcag-live-audit', target_kind: 'governance', gate_results: pairs2.map(function (p) { return { id: p.pair, label: p.pair, status: p.ratio >= 4.5 ? 'PASS' : p.ratio >= 3 ? 'WARN' : 'FAIL_BLOCK', detail: p.ratio + ':1' }; }), run_at: new Date().toISOString() };
      if (a) {
        a.post('graphics_simulation_run_record', body).then(function (r) {
          var el = document.getElementById('ms-gov-wcag-status');
          if (el) { el.textContent = r && r.ok !== false ? '✅ Evidence ghi xong.' : '⚠ Ghi thất bại.'; }
        }).catch(function () { var el = document.getElementById('ms-gov-wcag-status'); if (el) { el.textContent = '⚠ Backend chưa implement — evidence local only.'; } });
      }
      return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * REFERENCE SURFACE — Authority Playbook (read-only, generated)
   * ═══════════════════════════════════════════════════════════════════════ */

  var refState = { section: 'authority-map' };
  var REF_SECTIONS = [
    { key: 'authority-map', icon: '🗺', label: 'Authority Map' },
    { key: 'level-model',   icon: '🏗', label: 'Level Model L0–L5' },
    { key: 'standards',     icon: '📋', label: 'Standards & Gates' },
    { key: 'anti-patterns', icon: '🚫', label: 'Anti-pattern Catalog' },
    { key: 'decision-log',  icon: '📜', label: 'Decision Log' },
    { key: 'troubleshoot',  icon: '🔧', label: 'Troubleshooting' }
  ];

  function renderRefNav() {
    return '<div style="display:flex;flex-wrap:wrap;gap:' + sp + ';margin-bottom:' + sc + ';border-bottom:1px solid ' + bsub + ';padding-bottom:1px">' +
      REF_SECTIONS.map(function (s) {
        return '<button class="' + R + '__tab' + (refState.section === s.key ? ' on' : '') + '" data-rf="section" data-sec="' + s.key + '">' + s.icon + ' ' + esc(s.label) + '</button>';
      }).join('') +
      '</div>';
  }

  /* ── Authority Map ───────────────────────────────────────────────────── */
  var AUTHORITY_MAP = [
    { concept: 'T1 Primitive tokens', owner: 'graphics_token_catalog (tier=primitive)', writePath: 'Migration → catalog row', action: 'graphics_token_catalog_upsert', table: 'graphics_token_catalog', evidence: 'graphics_simulation_run', consumers: 'T2 semantic aliases' },
    { concept: 'T2 Semantic tokens',  owner: 'graphics_token_catalog (tier=semantic)',  writePath: 'Theme preset → org-wide', action: 'graphics_theme_preset_save → apply', table: 'graphics_token_catalog + graphics_token_value', evidence: 'graphics_simulation_run', consumers: 'T3 component tokens, CSS :root vars' },
    { concept: 'T3 Component tokens', owner: 'graphics_token_catalog (tier=component)', writePath: 'Lego L2 Author', action: 'graphics_block_contract_save (required_tokens)', table: 'graphics_token_catalog', evidence: 'graphics_qa_gate_run', consumers: 'Module CSS, block renders' },
    { concept: 'L3 Block contract',   owner: '__HM_BLOCK_REGISTRY__',                   writePath: 'Lego Author → save', action: 'graphics_block_contract_save', table: 'graphics_block_contract', evidence: 'audit_events + graphics_qa_gate_run', consumers: 'Assemble mode, HmBlockEngine.render()' },
    { concept: 'L4 Archetype',        owner: '__HM_ARCHETYPE_REGISTRY__',               writePath: 'Lego Author → save', action: 'graphics_module_archetype_save', table: 'graphics_module_archetype', evidence: 'audit_events', consumers: 'module_schema.moduleArchetype, Assemble zone contracts' },
    { concept: 'L5 Module schema',    owner: 'module_schema (Modules surface)',         writePath: '✎ Sửa thông tin / 🧩 Sửa nội dung', action: 'module_schema_save (+ baseVersion)', table: 'module_schema', evidence: 'audit_events + versions', consumers: 'Portal router, HmBlockEngine.renderModuleFromSchema()' },
    { concept: 'Theme preset',        owner: 'graphics_theme_preset (Theme/Settings)',  writePath: 'Theme surface → Áp dụng', action: 'graphics_theme_preset_save + apply', table: 'graphics_theme_preset', evidence: 'audit_events + graphics_simulation_run', consumers: 'Org-wide CSS :root, LegoTheme' },
    { concept: 'Template lifecycle',  owner: 'graphics_template_registry (Governance)', writePath: 'Templates tab → Publish/Stage/Rollback', action: '_admGraphicsTemplateAction / _admGraphicsStageCanary', table: 'graphics_template_registry', evidence: 'audit_events + release dashboard', consumers: 'Module zone scaffolding' },
    { concept: 'Waiver/Blocker',      owner: 'Governance tab (Standard 36)',            writePath: 'Governance → Waiver workflow', action: '_admGraphicsWaiverAction', table: 'compliance_waivers', evidence: 'waiver_id + expiry in audit_events', consumers: 'Release blocker resolution' },
    { concept: 'WCAG evidence',       owner: 'Governance/Validate surfaces',            writePath: 'Run Validate / Record WCAG Evidence', action: 'graphics_simulation_run_record + graphics_qa_gate_run', table: 'graphics_simulation_run + graphics_qa_gate_run', evidence: 'run_id + gate_results JSON', consumers: 'Compliance audit, release blockers' }
  ];

  function renderAuthorityMap() {
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">🗺 Authority Map — concept → owner → write path → backend action → table → evidence → consumers</div>' +
      '<div style="overflow-x:auto"><table class="' + R + '__tbl"><thead><tr>' +
      '<th>Concept</th><th>Owner</th><th>Write path</th><th>Backend action</th><th>Table</th><th>Evidence</th><th>Consumers</th>' +
      '</tr></thead><tbody>' +
      AUTHORITY_MAP.map(function (row) {
        return '<tr>' +
          '<td><strong>' + esc(row.concept) + '</strong></td>' +
          '<td><span class="' + R + '__code">' + esc(row.owner) + '</span></td>' +
          '<td>' + esc(row.writePath) + '</td>' +
          '<td><span class="' + R + '__code">' + esc(row.action) + '</span></td>' +
          '<td><span class="' + R + '__code">' + esc(row.table) + '</span></td>' +
          '<td style="font-size:11px;color:' + tm + '">' + esc(row.evidence) + '</td>' +
          '<td style="font-size:11px;color:' + td + '">' + esc(row.consumers) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  /* ── Level Model ─────────────────────────────────────────────────────── */
  var LEVEL_MODEL = [
    { level: 'L0a', name: 'Primitive (T1)', icon: '⚛', desc: 'Raw, context-free values: color ramp, spacing scale, type scale, elevation, motion durations. Components NEVER consume these directly — they flow through T2 semantic aliases.', examples: 'color.blue.500, space.4, radius.8, type.13, motion.200ms', owned_by: 'graphics_token_catalog (tier=primitive)', editable_in: 'Migration + admin catalog only' },
    { level: 'L0b', name: 'Semantic (T2)',  icon: '🎯', desc: 'Intent aliases referencing T1 primitives: brand.primary, color.bg.interactive, space.master. A theme preset edits T2 + brand seed only. This is the theming layer — editing T2 changes the org-wide look.', examples: 'brand.primary, space.master, control.height.standard, color.bg.surface', owned_by: 'graphics_token_catalog (tier=semantic) + graphics_token_value', editable_in: 'Theme/Settings surface → preset editor' },
    { level: 'L2',  name: 'Components (T3)', icon: '🧩', desc: 'Per-component token contracts referencing T2. Only when a component genuinely needs to diverge from T2. Editing here overrides for that component only without touching others.', examples: 'button.bg → brand.primary, kpi.value.color → brand.primary', owned_by: 'graphics_token_catalog (tier=component)', editable_in: 'Lego Author mode (L2 token dock) + Module Sample' },
    { level: 'L3',  name: 'Blocks',          icon: '🧱', desc: 'Curated organisms composed of L2 components. Has a full contract: slots, variant_axes, required_tokens, a11y_contract, preview_scene_key. Must be published to __HM_BLOCK_REGISTRY__ before use.', examples: 'kpi.grid, table.data, toolbar.filtered, panel.standard', owned_by: 'graphics_block_contract', editable_in: 'Lego Author mode → graphics_block_contract_save' },
    { level: 'L4',  name: 'Templates',       icon: '📐', desc: 'Zone skeleton archetypes defining permitted blocks per zone. Restricts what blocks can appear where — enforced at Assemble time. Archetype definitions here; promotion lifecycle → Governance.', examples: 'workspace-projection, authoritative-record-shell', owned_by: 'graphics_module_archetype', editable_in: 'Lego Author mode → graphics_module_archetype_save' },
    { level: 'L5',  name: 'Build Packets',   icon: '📦', desc: 'Fully assembled module manifests (module_schema). Metadata (id/title/route/roles/archetype/preset) + content (zones→blocks→slot data). Two-edit split: ✎ metadata | 🧩 content.', examples: 'M-orders-v3, M-lego-showcase, M-dispatch-board', owned_by: 'module_schema', editable_in: 'Modules surface → module_schema_save' }
  ];

  function renderLevelModel() {
    return LEVEL_MODEL.map(function (lv) {
      return '<div class="' + R + '__card"><div class="' + R + '__cardHd">' + lv.icon + ' ' + esc(lv.level) + ' · ' + esc(lv.name) + '</div><div class="' + R + '__cardBd">' +
        '<p style="margin:0 0 ' + sp + ' 0;font-size:12px;line-height:1.6;color:' + td + '">' + esc(lv.desc) + '</p>' +
        '<table style="width:100%;font-size:11px;border-collapse:collapse"><tbody>' +
        [['Examples', lv.examples], ['Owned by', lv.owned_by], ['Editable in', lv.editable_in]].map(function (row) {
          return '<tr><td style="color:' + tm + ';padding:2px ' + sp + ' 2px 0;width:90px;font-weight:700;vertical-align:top">' + esc(row[0]) + '</td>' +
            '<td style="color:' + ts + ';padding:2px 0"><span class="' + R + '__code">' + esc(row[1]) + '</span></td></tr>';
        }).join('') + '</tbody></table>' +
        '</div></div>';
    }).join('');
  }

  /* ── Standards & Gates ───────────────────────────────────────────────── */
  var STANDARDS = [
    { std: 'DTCG 2025.10', gate: 'T1/T2/T3 tier field in graphics_token_catalog', enforcement: 'CI check: every new token must have tier ∈ {primitive,semantic,component}', status: 'ACTIVE' },
    { std: 'WCAG 2.2 AA',  gate: '4.5:1 text, 3:1 large/UI — computed from :root tokens', enforcement: 'Governance/Validate surfaces + graphics_qa_gate_run evidence', status: 'ACTIVE' },
    { std: 'EightShapes naming', gate: 'namespace.object.base.modifier dot-notation', enforcement: 'Code review + catalog audit', status: 'ACTIVE' },
    { std: 'Block contract', gate: 'slots + required_tokens + a11y_contract + preview_scene_key all present', enforcement: 'Lego Author save-gate + graphics_qa_gate_run', status: 'ACTIVE' },
    { std: 'RFC 9457 (Problem Details)', gate: 'All API error responses use {type,title,status,detail,instance}', enforcement: 'ProblemDetailsFactory in SecurityBoundaryMiddleware', status: 'ACTIVE' },
    { std: 'No-hardcode rule', gate: 'Zero hex/px authority in JS — only --o3-* CSS vars', enforcement: 'Code review grep + SSOT proof in exec reports', status: 'ACTIVE' },
    { std: 'HESEM SSOT (migration 230)', gate: 'control.height.standard = 32px, space.master = 8px, space.section = 12px, radius.master = 4px, radius.card = 8px', enforcement: 'Module Sample renders + Graphics Authority tokens', status: 'ACTIVE' },
    { std: 'Simulation evidence', gate: 'Every save writes graphics_simulation_run_record row', enforcement: 'Theme/Lego/Validate surfaces fire record automatically on save', status: 'ACTIVE' }
  ];

  function renderStandardsGates() {
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">📋 Standards & Gates</div><div style="overflow-x:auto">' +
      '<table class="' + R + '__tbl"><thead><tr><th>Standard</th><th>Gate definition</th><th>Enforcement</th><th>Status</th></tr></thead><tbody>' +
      STANDARDS.map(function (s) {
        return '<tr><td><strong>' + esc(s.std) + '</strong></td><td>' + esc(s.gate) + '</td><td style="font-size:11px">' + esc(s.enforcement) + '</td>' +
          '<td><span class="' + R + '__badge ' + R + '__badge--pass">' + esc(s.status) + '</span></td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  /* ── Anti-pattern Catalog ────────────────────────────────────────────── */
  var ANTI_PATTERNS = [
    { id: 'AP-001', name: 'Hardcoded hex/px in JS', why: 'Bypasses token authority — theme changes do not propagate; visual drift guaranteed', fix: 'Use --o3-* CSS variables. E.g. style.color = "var(--o3-brand)" not "#0c4a6e"' },
    { id: 'AP-002', name: 'T2 edited at L3/L2', why: 'Two surfaces editing the same token tier → SSOT violation. Last write wins, state diverges', fix: 'T2 semantic → Theme/Settings preset editor only. T3 component → Lego L2 Author' },
    { id: 'AP-003', name: 'L3 block without a11y_contract', why: 'Screen reader / keyboard consumers have no contract to verify against; fails WCAG gate', fix: 'Add a11y_contract JSON to every L3 definition in Lego Author mode' },
    { id: 'AP-004', name: 'Archetype definitions in Governance', why: 'Definitions belong in Lego L4 Author. Governance owns promotion lifecycle, not schema', fix: 'Lego L4 Author → graphics_module_archetype_save. Governance = Publish/Stage/Rollback only' },
    { id: 'AP-005', name: 'Duplicate rollout buttons in Advanced', why: 'Templates tab owns rollout UI. Duplication creates two competing trigger paths for the same action', fix: 'Advanced tab: keep only changeset/waiver/import-export. Templates owns Publish/Stage/Rollback' },
    { id: 'AP-006', name: 'Stacked WCAG/analytics/standard panels in Reference', why: 'Old Reference was three unrelated panels concatenated — no navigation, content unpredictable, 165KB blob', fix: 'Reference = Authority Playbook with navigation (this surface). Panels removed.' },
    { id: 'AP-007', name: 'Simulate button top-bar (old "Mo phong")', why: 'Manual simulate was a one-shot action disconnected from the save flow; evidence was not always recorded', fix: 'Validate mode (Lego) + WCAG Evidence tab (Governance) fire evidence automatically on save and validate run' },
    { id: 'AP-008', name: 'Flat 174-item block dump in Lego', why: 'No dependency context — engineer cannot tell which tier a block belongs to or what it consumes', fix: 'Level rail L0a/L0b/L2/L3/L4/L5 with dependency graph per selection (Spectrum token-usage pattern)' },
    { id: 'AP-009', name: 'Admin-only design tokens (admin.toolbarPadding etc.)', why: 'Parallel admin design system → two sources of truth; admin drifts from production modules', fix: 'Admin uses SAME tokens as every module: control.height.standard, radius.card, space.master (migration 230)' }
  ];

  function renderAntiPatterns() {
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">🚫 Anti-pattern Catalog</div><div style="overflow-x:auto">' +
      '<table class="' + R + '__tbl"><thead><tr><th>ID</th><th>Anti-pattern</th><th>Why it hurts</th><th>Fix</th></tr></thead><tbody>' +
      ANTI_PATTERNS.map(function (p) {
        return '<tr><td><span class="' + R + '__badge ' + R + '__badge--fail">' + esc(p.id) + '</span></td>' +
          '<td><strong>' + esc(p.name) + '</strong></td>' +
          '<td style="font-size:11px;color:' + td + '">' + esc(p.why) + '</td>' +
          '<td style="font-size:11px">' + esc(p.fix) + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  /* ── Decision Log ────────────────────────────────────────────────────── */
  var DECISIONS = [
    { id: 'DEC-001', date: '2026-06-02', title: 'L0 splits into L0a Primitive + L0b Semantic',      rationale: 'DTCG 2025.10 three-tier model. Spotify lesson: retrofitting semantic tier is expensive. HESEM builds it right from the start.', ref: 'Foundation §1' },
    { id: 'DEC-002', date: '2026-06-02', title: 'Validate replaces standalone "Mô phỏng" button',   rationale: 'Manual simulate was disconnected from save. Validate mode runs WCAG + contract + backend-binding in one pass and records evidence automatically.', ref: 'Corrections §4' },
    { id: 'DEC-003', date: '2026-06-02', title: 'Governance reuses 00c renderers, not rebuilt',     rationale: 'Absorb-by-reuse (v0.6 pattern). Avoids duplicate logic and keeps the 00c authority as the single implementation of the release/waiver workflow.', ref: 'Corrections §3' },
    { id: 'DEC-004', date: '2026-06-02', title: 'Reference = Authority Playbook, not stacked panels', rationale: 'Old stacked WCAG/analytics/standard panels had no navigation and unpredictable content size. Playbook gives structured, searchable, authoritative reference.', ref: 'Corrections §5' },
    { id: 'DEC-005', date: '2026-06-02', title: 'Advanced tab de-duped: rollout buttons removed',   rationale: 'Templates owns Publish/Stage/Rollback. Having duplicates in Advanced created competing trigger paths for the same backend action.', ref: 'Corrections §3 de-dup rule' },
    { id: 'DEC-006', date: '2026-05-29', title: 'control.height.standard = 32px, ONE standard',     rationale: 'Research: Atlassian/Vercel 32px, Linear/Notion 28px, SAP Fiori 36px, Bloomberg 24px. 32 = modern-industrial sweet spot. Eliminates toolbar drift class of bugs.', ref: 'CLAUDE.md migration 230' },
    { id: 'DEC-007', date: '2026-06-01', title: 'Archetype definitions → Lego L4 Author',           rationale: 'Definitions are registry content (Lego authoring concern). Promotion lifecycle is release governance (Governance concern). Clean separation of concerns.', ref: 'Corrections §4' },
    { id: 'DEC-008', date: '2026-06-02', title: 'Dependency graph navigation in Lego (not flat dump)', rationale: 'Spectrum/Storybook pattern: each level shows what tokens/levels it consumes. Flat 174-item dumps give no context for decision-making.', ref: 'Foundation §3, Corrections §2' }
  ];

  function renderDecisionLog() {
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">📜 Decision Log</div>' +
      '<table class="' + R + '__tbl"><thead><tr><th>ID</th><th>Date</th><th>Decision</th><th>Rationale</th><th>Ref</th></tr></thead><tbody>' +
      DECISIONS.map(function (d) {
        return '<tr><td><span class="' + R + '__badge ' + R + '__badge--info">' + esc(d.id) + '</span></td>' +
          '<td style="white-space:nowrap">' + esc(d.date) + '</td>' +
          '<td><strong style="font-size:12px">' + esc(d.title) + '</strong></td>' +
          '<td style="font-size:11px;color:' + td + '">' + esc(d.rationale) + '</td>' +
          '<td style="font-size:11px;color:' + tm + '">' + esc(d.ref) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* ── Troubleshooting ─────────────────────────────────────────────────── */
  var TROUBLESHOOT = [
    { symptom: 'Token change not reflecting on screen', causes: '1) Token saved but CSS var not mapped in graphics_token_catalog.css_variable · 2) Browser cache — force reload · 3) Token tier mismatch (writing T3 when T2 needed)', fix: 'Check css_variable column in catalog · force cache bust (?v=sha) · verify tier tag' },
    { symptom: 'L3 block renders empty shell', causes: '1) Demo config not harvested (M-lego-showcase missing block type) · 2) Block renderer not registered in HmBlockEngine.BLOCK_CATALOG · 3) safeRender returns "" without error', fix: 'Check M-lego-showcase module schema · verify window.Blocks.render(type) works in console · check block_key vs engine type mapping in L3_ALIAS' },
    { symptom: 'graphics_block_contract_save returns ok:false', causes: '1) block_key already exists as published — needs status override · 2) slots/a11y JSON parse error on server · 3) CSRF token missing (apiCall not used)', fix: 'Ensure post() uses window.apiCall (CSRF-safe) · validate JSON locally first · check server logs for parse errors' },
    { symptom: 'Governance tab shows blank panels', causes: '1) _renderAdmGovernance / _renderAdmTemplates / _renderAdmAdvanced not exposed as globals yet · 2) 00c-admin-appearance.js loaded after 32c', fix: 'Add window._renderAdmGovernance = function(){ return renderGovernance(); }; etc. in 00c-admin-appearance.js (after function declarations)' },
    { symptom: 'WCAG audit shows wrong colors', causes: '1) Token CSS var not set on :root — getComputedStyle returns empty · 2) Theme preset not applied · 3) Dark mode active', fix: 'Apply theme preset · check --o3-text-strong on :root in DevTools · run in same color mode as production' },
    { symptom: 'Validate shows BACKEND_GAP for all gates', causes: 'graphics_qa_gate_run / module_schema_validate_bindings / graphics_simulation_run_record actions not yet implemented on server', fix: 'Implement API actions in DomainCommandGateway · until then, Validate still runs local WCAG + no-hardcode gates' },
    { symptom: 'Level rail not switching panels', causes: 'Event delegation not working — onAction() not receiving k=level', fix: 'Check data-lw="level" attribute on rail buttons · verify 32b is loaded after 32-module-studio.js (shell) in portal.html' }
  ];

  function renderTroubleshooting() {
    return '<div class="' + R + '__card"><div class="' + R + '__cardHd">🔧 Troubleshooting</div>' +
      TROUBLESHOOT.map(function (t) {
        return '<div class="' + R + '__cardBd" style="border-bottom:1px solid ' + bsub + '">' +
          '<div style="font-weight:700;font-size:12px;margin-bottom:' + sp + '">' + esc(t.symptom) + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:' + sc + '">' +
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:' + tm + ';margin-bottom:' + sp + '">Causes</div><div style="font-size:11px;color:' + td + '">' + esc(t.causes).replace(/ · /g, '<br>• ') + '</div></div>' +
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:' + tm + ';margin-bottom:' + sp + '">Fix</div><div style="font-size:11px;color:' + ts + '">' + esc(t.fix) + '</div></div>' +
          '</div></div>';
      }).join('') + '</div>';
  }

  /* ── Reference render entry ──────────────────────────────────────────── */
  function renderReference() {
    ensureStyle();
    var content = '';
    switch (refState.section) {
      case 'authority-map': content = renderAuthorityMap(); break;
      case 'level-model':   content = renderLevelModel();   break;
      case 'standards':     content = renderStandardsGates(); break;
      case 'anti-patterns': content = renderAntiPatterns();   break;
      case 'decision-log':  content = renderDecisionLog();    break;
      case 'troubleshoot':  content = renderTroubleshooting(); break;
      default: content = renderAuthorityMap();
    }
    return '<div class="' + R + '">' + renderRefNav() + content + '</div>';
  }

  function refOnMount(host) {
    if (!host || host.__refDelegated) { return; }
    host.__refDelegated = true;
    host.addEventListener('click', function(ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('[data-rf]') : null;
      if (t && host.contains(t)) { refActionRouter(t.getAttribute('data-rf'), t, ev); }
    });
  }

  function refOnAction(k, target) {
    var a = api();
    if (k === 'section') {
      refState.section = target.getAttribute('data-sec') || 'authority-map';
      if (a) { a.repaintBody(); }
      return true;
    }
    return false;
  }

  /* ── Route tab actions through the correct surface ────────────────────── */
  function govActionRouter(k, target, ev) {
    /* Governance tab-strip clicks */
    if (target.getAttribute('data-gc')) {
      return govOnAction(target.getAttribute('data-gc'), target, ev);
    }
    return govOnAction(k, target, ev);
  }
  function refActionRouter(k, target, ev) {
    if (target.getAttribute('data-rf')) {
      return refOnAction(target.getAttribute('data-rf'), target);
    }
    return refOnAction(k, target);
  }

  /* ── register ─────────────────────────────────────────────────────────── */
  window.MStudio.registerSurface('governance', {
    label: '🛡️ Governance', order: 45,
    render: renderGovernance,
    onMount: govOnMount,
    onAction: govActionRouter
  });

  window.MStudio.registerSurface('reference', {
    label: '📖 Reference', order: 50,
    render: renderReference,
    onMount: refOnMount,
    onAction: refActionRouter
  });

})();
