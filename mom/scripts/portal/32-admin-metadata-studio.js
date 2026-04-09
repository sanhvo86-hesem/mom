/**
 * 32-admin-metadata-studio.js — World-Class API & DB Studio v3.0
 * Redesigned April 2026 — Most powerful API + DB management tool
 *
 * Tabs: Command Center | API Explorer | DB Studio | Field Forge | Schema Architect | Variables | Registry Ops
 * Features: Live API tester · ERD canvas · DB data preview · Schema diff · Permission matrix ·
 *           Field reuse analysis · OpenAPI export · Registry compile & release · Health scoring
 */
(function () {
'use strict';

/* ═══════════════════════════ CONSTANTS ═══════════════════════════ */

var STYLE_ID = 'ams3-styles';

var TABS = [
  { id:'command',  icon:'⚡', label:'Command Center' },
  { id:'apis',     icon:'🔌', label:'API Explorer'   },
  { id:'db',       icon:'🗄️', label:'DB Studio'      },
  { id:'fields',   icon:'🧩', label:'Field Forge'    },
  { id:'schema',   icon:'🏗️', label:'Schema'         },
  { id:'vars',     icon:'📦', label:'Variables'      },
  { id:'ops',      icon:'⚙️', label:'Registry Ops'  }
];

var METHOD_CFG = {
  GET:    { bg:'var(--green-100,#dcfce7)',   text:'var(--green-700,#15803d)',   dot:'var(--green-500,#22c55e)'  },
  POST:   { bg:'var(--brand-9,#dbeafe)',     text:'var(--blue-700,#1d4ed8)',    dot:'var(--brand-2,#2563eb)'    },
  PUT:    { bg:'var(--amber-100,#fef3c7)',   text:'var(--amber-700,#b45309)',   dot:'var(--amber-500,#f59e0b)'  },
  PATCH:  { bg:'var(--purple-100,#ede9fe)',  text:'var(--purple-700,#6d28d9)',  dot:'var(--purple-500,#8b5cf6)' },
  DELETE: { bg:'var(--red-100,#fee2e2)',     text:'var(--red-700,#b91c1c)',     dot:'var(--red-500,#ef4444)'    }
};

var DOMAIN_ICON = {
  finance:'💰', production:'🏭', quality:'✅', logistics:'🚚', procurement:'📦',
  hr:'👥', sales:'💼', maintenance:'🔧', compliance:'📋', engineering:'⚙️',
  admin:'🛡️', core:'🔷', supplier:'🤝', inventory:'📊', planning:'📅', analytics:'📈'
};

var UITYPE_ICON = {
  string:'Aa', number:'#', currency:'$', date:'📅', boolean:'☑',
  select:'▾', reference:'🔗', json:'{}', uuid:'🔑', textarea:'¶', file:'📎'
};

/* ═══════════════════════════ STATE ═══════════════════════════ */

var S = {
  container: null,
  tab: 'command',
  loading: false, loaded: false, error: '',
  detailLoading: false, saveLoading: false,
  testLoading: false, previewLoading: false,
  summary: null,
  /* filters */
  apiSearch:'', apiMethod:'ALL', apiDomain:'ALL', apiKind:'ALL',
  tableSearch:'', tableDomain:'ALL',
  fieldSearch:'', schemaSearch:'', varSearch:'',
  /* selections */
  selApi:'', selTable:'', selSchema:'', selVar:'',
  apiDetailTab:'overview',
  dbDetailTab:'columns',
  /* editors */
  apiEditor:null, tableEditor:null, schemaEditor:null, varEditor:null,
  /* tester */
  testerOpen:false, testerMethod:'GET', testerUrl:'', testerBody:'{}',
  testerResult:null, testerStatus:0, testerLatency:0,
  /* db preview */
  previewData:null, previewPage:1, previewTotal:0,
  /* erd */
  erdNodes:[], erdScale:1, erdOffX:0, erdOffY:0,
  /* ops log */
  opsLog:[]
};

/* ═══════════════════════════ UTILS ═══════════════════════════ */

function esc(v) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(v == null ? '' : String(v)));
  return d.innerHTML;
}

function T(vi, en) {
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}

function fmt(n, d) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: d || 0 });
}

function pct(n) {
  if (n == null || isNaN(n)) return '0%';
  return Math.round(Number(n)) + '%';
}

function scoreClass(n) {
  n = Number(n) || 0;
  if (n >= 90) return 'excellent';
  if (n >= 70) return 'good';
  if (n >= 40) return 'warn';
  return 'poor';
}

function methodBadge(m) {
  var c = METHOD_CFG[m] || METHOD_CFG.GET;
  return '<span class="ams3-method" style="background:' + c.bg + ';color:' + c.text + '">' + esc(m) + '</span>';
}

function domainIcon(d) {
  return DOMAIN_ICON[String(d).toLowerCase()] || '📂';
}

function arr(v) { return Array.isArray(v) ? v : []; }
function obj(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }

function keys(o) { return Object.keys(obj(o)); }

function debounce(fn, ms) {
  var t;
  return function() { var a = arguments; clearTimeout(t); t = setTimeout(function(){ fn.apply(null, a); }, ms); };
}

function hlJson(v) {
  var s = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  return s.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|true|false|null|-?\d+(?:\.\d+)?)/g, function(m) {
    if (/^"/.test(m)) return m.endsWith(':') ? '<span class="jk">' + esc(m) + '</span>' : '<span class="js">' + esc(m) + '</span>';
    if (/true|false/.test(m)) return '<span class="jb">' + m + '</span>';
    if (/null/.test(m)) return '<span class="jn">' + m + '</span>';
    return '<span class="jnum">' + m + '</span>';
  });
}

function apiSummaries() { return arr((obj(S.summary).lists || {}).apis); }
function tableSummaries() { return arr((obj(S.summary).lists || {}).tables); }
function schemaSummaries() { return arr((obj(S.summary).lists || {}).schemas); }
function varSummaries() { return arr((obj(S.summary).lists || {}).variables); }

/* ═══════════════════════════ API ═══════════════════════════ */

function _api(action, payload, method) {
  method = method || 'GET';
  var url = 'api/index.php?action=' + encodeURIComponent(action);
  var opts = { method: method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } };
  if (method !== 'GET' && payload) opts.body = JSON.stringify(payload);
  else if (method === 'GET' && payload) url += '&' + Object.keys(payload).map(function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]); }).join('&');
  return fetch(url, opts).then(function(r){ return r.json(); });
}

/* ═══════════════════════════ STYLES ═══════════════════════════ */

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  var el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS_RULES.join('');
  document.head.appendChild(el);
}

var CSS_RULES = [
/* ── Root ── */
'.ams3{display:flex;flex-direction:column;height:100%;min-height:600px;font-family:var(--font-sans,"Inter",system-ui,sans-serif);background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);box-sizing:border-box;}',
'.ams3 *{box-sizing:border-box;}',
'@keyframes ams3-spin{to{transform:rotate(360deg)}}',
'@keyframes ams3-pulse{0%,100%{opacity:.6}50%{opacity:1}}',

/* ── Header ── */
'.ams3-hd{padding:16px 24px 0;border-bottom:1px solid var(--border,#e2e8f0);flex-shrink:0;}',
'.ams3-hd-top{display:flex;align-items:center;gap:12px;margin-bottom:12px;}',
'.ams3-hd-title{font-size:18px;font-weight:900;letter-spacing:-.025em;margin:0;flex:1;}',
'.ams3-hd-badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;background:var(--brand-9,#dbeafe);color:var(--brand-2,#2563eb);}',
'.ams3-hd-actions{display:flex;gap:6px;align-items:center;}',
'.ams3-tabs{display:flex;gap:2px;overflow-x:auto;padding-bottom:0;scrollbar-width:none;}',
'.ams3-tabs::-webkit-scrollbar{display:none;}',
'.ams3-tab{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:10px 10px 0 0;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:.15s;color:var(--text-muted,#64748b);border:1px solid transparent;border-bottom:none;position:relative;}',
'.ams3-tab:hover{color:var(--text-secondary,#475569);background:var(--bg-surface-alt,#f8fafc);}',
'.ams3-tab.active{color:var(--brand-2,#2563eb);background:var(--bg-surface,#fff);border-color:var(--border,#e2e8f0);top:1px;}',
'.ams3-tab-n{font-size:10px;font-weight:800;padding:1px 6px;border-radius:999px;background:var(--bg-surface-alt,#f8fafc);color:var(--text-muted,#64748b);}',
'.ams3-tab.active .ams3-tab-n{background:var(--brand-9,#dbeafe);color:var(--brand-2,#2563eb);}',

/* ── Body ── */
'.ams3-body{flex:1;overflow:auto;padding:20px 24px;}',
'.ams3-loading{display:flex;align-items:center;justify-content:center;height:240px;gap:12px;color:var(--text-muted,#64748b);font-size:14px;}',
'.ams3-spinner{width:22px;height:22px;border:3px solid var(--border,#e2e8f0);border-top-color:var(--brand-2,#2563eb);border-radius:50%;animation:ams3-spin .7s linear infinite;flex-shrink:0;}',
'.ams3-err{background:var(--red-50,#fef2f2);border:1px solid var(--red-200,#fecaca);border-radius:12px;padding:12px 16px;color:var(--red-700,#b91c1c);font-size:13px;margin-bottom:16px;}',
'.ams3-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:60px 24px;color:var(--text-muted,#64748b);}',
'.ams3-empty-icon{font-size:44px;opacity:.35;}',
'.ams3-empty-t{font-size:14px;font-weight:700;color:var(--text-secondary,#475569);}',
'.ams3-empty-s{font-size:12px;text-align:center;max-width:260px;line-height:1.4;}',

/* ── Section ── */
'.ams3-sec{margin-bottom:22px;}',
'.ams3-sec-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted,#64748b);margin:0 0 10px;display:flex;align-items:center;gap:10px;}',
'.ams3-sec-title::after{content:"";flex:1;height:1px;background:var(--border,#e2e8f0);}',

/* ── Buttons ── */
'.ams3-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;transition:.15s;border:none;outline:none;white-space:nowrap;}',
'.ams3-btn.primary{background:var(--brand-2,#2563eb);color:var(--white,#fff);}',
'.ams3-btn.primary:hover{background:var(--blue-700,#1d4ed8);}',
'.ams3-btn.ghost{background:transparent;border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#475569);}',
'.ams3-btn.ghost:hover{border-color:var(--text-secondary,#475569);}',
'.ams3-btn.success{background:var(--green-600,#16a34a);color:var(--white,#fff);}',
'.ams3-btn.success:hover{background:var(--green-700,#15803d);}',
'.ams3-btn.danger{background:var(--red-500,#ef4444);color:var(--white,#fff);}',
'.ams3-btn.sm{padding:5px 10px;font-size:11px;border-radius:7px;}',
'.ams3-btn:disabled{opacity:.45;cursor:default;}',

/* ── Chips / badges ── */
'.ams3-method{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;font-size:9px;font-weight:900;letter-spacing:.04em;flex-shrink:0;}',
'.ams3-chip{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f8fafc);color:var(--text-secondary,#475569);}',
'.ams3-chip.auth{background:var(--amber-100,#fef3c7);border-color:var(--amber-200,#fde68a);color:var(--amber-700,#b45309);}',
'.ams3-chip.admin{background:var(--red-100,#fee2e2);border-color:var(--red-200,#fecaca);color:var(--red-700,#b91c1c);}',
'.ams3-chip.csrf{background:var(--purple-100,#ede9fe);border-color:var(--purple-200,#ddd6fe);color:var(--purple-700,#6d28d9);}',
'.ams3-chip.ok{background:var(--green-100,#dcfce7);border-color:var(--green-200,#bbf7d0);color:var(--green-700,#15803d);}',
'.ams3-chip.info{background:var(--brand-9,#dbeafe);border-color:var(--brand-7,#93c5fd);color:var(--blue-700,#1d4ed8);}',

/* ── KPI cards ── */
'.ams3-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px;}',
'.ams3-kpi{background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:14px 16px;display:grid;gap:4px;transition:.15s;}',
'.ams3-kpi:hover{border-color:var(--brand-2,#2563eb);box-shadow:0 0 0 3px var(--brand-9,#dbeafe);}',
'.ams3-kpi-val{font-size:26px;font-weight:900;letter-spacing:-.03em;line-height:1;}',
'.ams3-kpi-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#64748b);}',
'.ams3-kpi.blue .ams3-kpi-val{color:var(--brand-2,#2563eb);}',
'.ams3-kpi.green .ams3-kpi-val{color:var(--green-600,#16a34a);}',
'.ams3-kpi.purple .ams3-kpi-val{color:var(--purple-500,#8b5cf6);}',
'.ams3-kpi.amber .ams3-kpi-val{color:var(--amber-500,#f59e0b);}',
'.ams3-kpi.cyan .ams3-kpi-val{color:var(--cyan-500,#06b6d4);}',

/* ── Hero ── */
'.ams3-hero{background:linear-gradient(135deg,var(--text-primary,#0f172a) 0%,rgba(37,99,235,.85) 100%);border-radius:18px;padding:24px 28px;color:var(--white,#fff);margin-bottom:20px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;}',
'.ams3-hero-t{font-size:24px;font-weight:900;letter-spacing:-.03em;margin:0 0 5px;}',
'.ams3-hero-s{font-size:12px;opacity:.7;margin:0;}',
'.ams3-hero-stats{display:flex;flex-direction:column;gap:6px;text-align:right;}',
'.ams3-hero-stat{font-size:12px;opacity:.8;}',
'.ams3-hero-stat strong{font-size:18px;font-weight:900;display:block;line-height:1;}',

/* ── Health grid ── */
'.ams3-health{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:20px;}',
'.ams3-hcard{background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:7px;}',
'.ams3-hcard-name{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#64748b);}',
'.ams3-hcard-score{font-size:30px;font-weight:900;letter-spacing:-.03em;line-height:1;}',
'.ams3-hcard-bar{height:5px;background:var(--bg-surface-alt,#f8fafc);border-radius:999px;overflow:hidden;}',
'.ams3-hcard-fill{height:100%;border-radius:999px;transition:width .6s cubic-bezier(.4,0,.2,1);}',
'.sc-excellent .ams3-hcard-score{color:var(--green-600,#16a34a);}.sc-excellent .ams3-hcard-fill{background:var(--green-500,#22c55e);}',
'.sc-good .ams3-hcard-score{color:var(--brand-2,#2563eb);}.sc-good .ams3-hcard-fill{background:var(--brand-2,#2563eb);}',
'.sc-warn .ams3-hcard-score{color:var(--amber-500,#f59e0b);}.sc-warn .ams3-hcard-fill{background:var(--amber-500,#f59e0b);}',
'.sc-poor .ams3-hcard-score{color:var(--red-500,#ef4444);}.sc-poor .ams3-hcard-fill{background:var(--red-500,#ef4444);}',

/* ── Explorer (API + DB) split layout ── */
'.ams3-split{display:grid;grid-template-columns:340px 1fr;gap:0;border:1px solid var(--border,#e2e8f0);border-radius:16px;overflow:hidden;height:calc(100vh - 200px);min-height:520px;}',
'.ams3-split-list{border-right:1px solid var(--border,#e2e8f0);display:flex;flex-direction:column;overflow:hidden;background:var(--bg-surface-alt,#f8fafc);}',
'.ams3-split-detail{display:flex;flex-direction:column;overflow:hidden;background:var(--bg-surface,#fff);}',
'.ams3-toolbar{padding:10px;display:flex;flex-direction:column;gap:7px;border-bottom:1px solid var(--border,#e2e8f0);}',
'.ams3-searchbox{display:flex;align-items:center;gap:7px;background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:9px;padding:7px 10px;}',
'.ams3-searchbox input{flex:1;border:none;background:transparent;font-size:12px;outline:none;color:var(--text-primary,#0f172a);min-width:0;}',
'.ams3-searchbox input::placeholder{color:var(--text-muted,#64748b);}',
'.ams3-filters{display:flex;gap:5px;}',
'.ams3-sel{flex:1;border:1px solid var(--border,#e2e8f0);border-radius:7px;padding:5px 7px;font-size:11px;font-weight:600;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);cursor:pointer;outline:none;min-width:0;}',
'.ams3-list-items{flex:1;overflow-y:auto;}',
'.ams3-list-items::-webkit-scrollbar{width:4px;}.ams3-list-items::-webkit-scrollbar-thumb{background:var(--border,#e2e8f0);border-radius:999px;}',
'.ams3-list-foot{padding:7px 10px;font-size:10px;color:var(--text-muted,#64748b);border-top:1px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f8fafc);}',

/* ── API list items ── */
'.ams3-api-row{padding:9px 10px;cursor:pointer;border-bottom:1px solid var(--border,#e2e8f0);display:grid;gap:3px;transition:.1s;}',
'.ams3-api-row:hover{background:var(--bg-surface,#fff);}',
'.ams3-api-row.sel{background:var(--brand-9,#dbeafe);border-left:3px solid var(--brand-2,#2563eb);}',
'.ams3-api-r1{display:flex;align-items:center;gap:7px;}',
'.ams3-api-action{font-size:11px;font-weight:700;color:var(--text-primary,#0f172a);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;}',
'.ams3-api-label{font-size:10px;color:var(--text-muted,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
'.ams3-api-meta{display:flex;gap:5px;align-items:center;}',

/* ── Detail panel ── */
'.ams3-detail-hd{padding:14px 18px;border-bottom:1px solid var(--border,#e2e8f0);display:flex;align-items:flex-start;gap:12px;flex-shrink:0;}',
'.ams3-detail-hd-info{flex:1;min-width:0;}',
'.ams3-detail-name{font-size:15px;font-weight:800;margin:0 0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
'.ams3-detail-path{font-size:11px;font-family:monospace;color:var(--text-muted,#64748b);}',
'.ams3-detail-tabs{display:flex;gap:1px;padding:0 18px;background:var(--bg-surface-alt,#f8fafc);border-bottom:1px solid var(--border,#e2e8f0);flex-shrink:0;overflow-x:auto;}',
'.ams3-dtab{padding:8px 11px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text-muted,#64748b);border-bottom:2px solid transparent;white-space:nowrap;transition:.12s;}',
'.ams3-dtab.active{color:var(--brand-2,#2563eb);border-bottom-color:var(--brand-2,#2563eb);}',
'.ams3-detail-body{flex:1;overflow-y:auto;padding:16px 18px;}',
'.ams3-detail-body::-webkit-scrollbar{width:4px;}.ams3-detail-body::-webkit-scrollbar-thumb{background:var(--border,#e2e8f0);border-radius:999px;}',

/* ── Property rows ── */
'.ams3-props{display:grid;gap:0;margin-bottom:16px;border:1px solid var(--border,#e2e8f0);border-radius:12px;overflow:hidden;}',
'.ams3-prop{display:grid;grid-template-columns:140px 1fr;padding:9px 12px;border-bottom:1px solid var(--border,#e2e8f0);font-size:12px;align-items:start;}',
'.ams3-prop:last-child{border-bottom:none;}',
'.ams3-prop-k{color:var(--text-muted,#64748b);font-weight:700;padding-right:10px;}',
'.ams3-prop-v{color:var(--text-primary,#0f172a);}',
'.ams3-prop-v code{font-family:monospace;font-size:11px;background:var(--bg-surface-alt,#f8fafc);padding:1px 5px;border-radius:4px;color:var(--text-secondary,#475569);}',

/* ── Tester ── */
'.ams3-tester{background:var(--text-primary,#0f172a);border-radius:14px;overflow:hidden;margin-bottom:16px;}',
'.ams3-tester-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;}',
'.ams3-tester-meth{background:var(--brand-2,#2563eb);color:var(--white,#fff);border:none;border-radius:7px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer;min-width:60px;}',
'.ams3-tester-url{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:7px 10px;font-size:11px;font-family:monospace;color:var(--white,#fff);outline:none;}',
'.ams3-tester-send{background:var(--green-600,#16a34a);color:var(--white,#fff);border:none;border-radius:7px;padding:7px 14px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;}',
'.ams3-tester-send:hover{background:var(--green-500,#22c55e);}',
'.ams3-tester-send:disabled{opacity:.5;cursor:default;}',
'.ams3-tester-body{padding:0 14px 10px;}',
'.ams3-tester-body textarea{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:8px;font-size:10px;font-family:monospace;color:var(--white,#fff);resize:vertical;min-height:70px;outline:none;}',
'.ams3-tester-res{margin:0 14px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:9px;overflow:hidden;}',
'.ams3-tester-res-hd{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);font-size:10px;}',
'.ams3-st-pill{font-size:9px;font-weight:800;padding:2px 7px;border-radius:999px;}',
'.ams3-st-2xx{background:rgba(34,197,94,.2);color:var(--green-300,#86efac);}',
'.ams3-st-4xx{background:rgba(251,191,36,.2);color:var(--amber-300,#fcd34d);}',
'.ams3-st-5xx{background:rgba(239,68,68,.2);color:var(--red-300,#fca5a5);}',
'.ams3-tester-json{padding:10px;font-size:10px;font-family:monospace;white-space:pre-wrap;color:rgba(255,255,255,.8);max-height:280px;overflow-y:auto;line-height:1.5;}',
'.ams3-tester-json .jk{color:var(--cyan-300,#7dd3fc);}',
'.ams3-tester-json .js{color:var(--green-300,#86efac);}',
'.ams3-tester-json .jnum{color:var(--amber-300,#fcd34d);}',
'.ams3-tester-json .jb{color:var(--purple-400,#a78bfa);}',
'.ams3-tester-json .jn{color:var(--red-400,#f87171);}',

/* ── Column table ── */
'.ams3-tbl{width:100%;border-collapse:collapse;font-size:11px;}',
'.ams3-tbl th{text-align:left;padding:7px 9px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#64748b);border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;background:var(--bg-surface-alt,#f8fafc);}',
'.ams3-tbl td{padding:7px 9px;border-bottom:1px solid var(--border,#e2e8f0);vertical-align:middle;}',
'.ams3-tbl tr:last-child td{border-bottom:none;}',
'.ams3-tbl tr:hover td{background:var(--bg-surface-alt,#f8fafc);}',
'.ams3-type-pill{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;font-family:monospace;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#475569);}',
'.ams3-pk{font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;background:var(--amber-100,#fef3c7);color:var(--amber-700,#b45309);border:1px solid var(--amber-200,#fde68a);}',
'.ams3-fk{font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;background:var(--purple-100,#ede9fe);color:var(--purple-700,#6d28d9);border:1px solid var(--purple-200,#ddd6fe);}',
'.ams3-req-dot{width:6px;height:6px;border-radius:50%;display:inline-block;background:var(--red-500,#ef4444);}',
'.ams3-opt-dot{width:6px;height:6px;border-radius:50%;display:inline-block;background:var(--border,#e2e8f0);}',

/* ── ERD ── */
'.ams3-erd-wrap{position:relative;background:var(--bg-surface-alt,#f8fafc);border-radius:12px;overflow:hidden;margin-bottom:16px;}',
'.ams3-erd-canvas{display:block;cursor:grab;}',
'.ams3-erd-canvas.grabbing{cursor:grabbing;}',
'.ams3-erd-ctl{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:4px;}',
'.ams3-erd-btn{width:30px;height:30px;border-radius:7px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;transition:.12s;}',
'.ams3-erd-btn:hover{border-color:var(--brand-2,#2563eb);background:var(--brand-9,#dbeafe);}',
'.ams3-erd-legend{position:absolute;bottom:10px;left:10px;background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:8px 10px;font-size:10px;display:flex;flex-direction:column;gap:4px;}',
'.ams3-erd-leg-row{display:flex;align-items:center;gap:6px;color:var(--text-muted,#64748b);}',
'.ams3-erd-leg-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0;}',

/* ── Data preview ── */
'.ams3-preview-wrap{overflow:auto;margin-bottom:10px;border:1px solid var(--border,#e2e8f0);border-radius:10px;}',
'.ams3-prev-tbl{width:100%;border-collapse:collapse;font-size:10px;white-space:nowrap;}',
'.ams3-prev-tbl th{padding:6px 9px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted,#64748b);border-bottom:2px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f8fafc);position:sticky;top:0;}',
'.ams3-prev-tbl td{padding:5px 9px;border-bottom:1px solid var(--border,#e2e8f0);font-family:monospace;max-width:180px;overflow:hidden;text-overflow:ellipsis;}',
'.ams3-prev-tbl tr:last-child td{border-bottom:none;}',
'.ams3-prev-tbl tr:hover td{background:var(--bg-surface-alt,#f8fafc);}',
'.pv-null{color:var(--text-muted,#64748b);font-style:italic;}',
'.pv-t{color:var(--green-600,#16a34a);font-weight:700;}',
'.pv-f{color:var(--red-500,#ef4444);}',
'.ams3-pager{display:flex;align-items:center;gap:7px;justify-content:center;padding:8px 0;font-size:11px;color:var(--text-muted,#64748b);}',
'.ams3-pg-btn{padding:4px 10px;border-radius:6px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);cursor:pointer;font-size:11px;font-weight:600;}',
'.ams3-pg-btn:hover{border-color:var(--brand-2,#2563eb);}',
'.ams3-pg-btn:disabled{opacity:.4;cursor:default;}',

/* ── Schema diff ── */
'.ams3-diff-row{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:9px;margin-bottom:4px;font-size:11px;}',
'.ams3-diff-ok{background:var(--green-100,#dcfce7);}',
'.ams3-diff-warn{background:var(--amber-100,#fef3c7);}',
'.ams3-diff-err{background:var(--red-100,#fee2e2);}',
'.ams3-diff-icon{font-size:14px;flex-shrink:0;margin-top:1px;}',
'.ams3-diff-info{flex:1;}',
'.ams3-diff-title{font-weight:700;color:var(--text-primary,#0f172a);}',
'.ams3-diff-detail{color:var(--text-muted,#64748b);margin-top:2px;font-size:10px;}',

/* ── Field Forge grid ── */
'.ams3-field-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;}',
'.ams3-fcard{background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:12px 14px;display:grid;gap:6px;transition:.15s;}',
'.ams3-fcard:hover{border-color:var(--brand-2,#2563eb);box-shadow:0 0 0 3px var(--brand-9,#dbeafe);}',
'.ams3-fcard-name{font-size:12px;font-weight:700;font-family:monospace;color:var(--text-primary,#0f172a);}',
'.ams3-fcard-meta{display:flex;gap:5px;align-items:center;flex-wrap:wrap;}',
'.ams3-fcard-desc{font-size:10px;color:var(--text-muted,#64748b);line-height:1.4;}',
'.ams3-fcard-usage{font-size:10px;font-weight:700;color:var(--brand-2,#2563eb);}',

/* ── Schema grid ── */
'.ams3-schema-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}',
'.ams3-scard{background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:14px 16px;display:grid;gap:8px;cursor:pointer;transition:.15s;}',
'.ams3-scard:hover{border-color:var(--brand-2,#2563eb);box-shadow:0 4px 18px rgba(37,99,235,.07);}',
'.ams3-scard.sel{border-color:var(--brand-2,#2563eb);box-shadow:0 0 0 3px var(--brand-9,#dbeafe);}',
'.ams3-scard-name{font-size:13px;font-weight:800;color:var(--text-primary,#0f172a);}',
'.ams3-scard-desc{font-size:11px;color:var(--text-muted,#64748b);line-height:1.4;}',
'.ams3-scard-tables{display:flex;flex-wrap:wrap;gap:4px;}',
'.ams3-stag{font-size:9px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#475569);font-family:monospace;}',

/* ── Variables ── */
'.ams3-var-cats{display:grid;gap:14px;}',
'.ams3-vcat{background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;overflow:hidden;}',
'.ams3-vcat-hd{padding:11px 16px;border-bottom:1px solid var(--border,#e2e8f0);display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--bg-surface-alt,#f8fafc);}',
'.ams3-vcat-name{font-size:12px;font-weight:800;color:var(--text-primary,#0f172a);flex:1;}',
'.ams3-vcat-n{font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--border,#e2e8f0);color:var(--text-muted,#64748b);}',
'.ams3-var-tbl{width:100%;border-collapse:collapse;font-size:11px;}',
'.ams3-var-tbl th{padding:6px 14px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#64748b);border-bottom:1px solid var(--border,#e2e8f0);}',
'.ams3-var-tbl td{padding:7px 14px;border-bottom:1px solid var(--border,#e2e8f0);}',
'.ams3-var-tbl tr:last-child td{border-bottom:none;}',
'.ams3-var-key{font-family:monospace;font-weight:700;font-size:10px;color:var(--text-primary,#0f172a);}',
'.ams3-var-type{font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;background:var(--purple-100,#ede9fe);color:var(--purple-700,#6d28d9);}',
'.ams3-var-ex{font-family:monospace;font-size:10px;color:var(--text-muted,#64748b);}',

/* ── Ops ── */
'.ams3-ops-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;margin-bottom:20px;}',
'.ams3-ocard{background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:16px;display:grid;gap:8px;}',
'.ams3-ocard-icon{font-size:26px;}',
'.ams3-ocard-title{font-size:13px;font-weight:800;color:var(--text-primary,#0f172a);}',
'.ams3-ocard-desc{font-size:11px;color:var(--text-muted,#64748b);line-height:1.4;}',
'.ams3-ocard-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:9px;font-size:11px;font-weight:800;cursor:pointer;border:none;width:100%;transition:.15s;}',
'.ams3-ocard-btn.primary{background:var(--brand-2,#2563eb);color:var(--white,#fff);}',
'.ams3-ocard-btn.primary:hover{background:var(--blue-700,#1d4ed8);}',
'.ams3-ocard-btn.success{background:var(--green-600,#16a34a);color:var(--white,#fff);}',
'.ams3-ocard-btn.ghost{background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#475569);}',
'.ams3-ops-log{background:var(--text-primary,#0f172a);border-radius:12px;padding:14px;font-size:10px;font-family:monospace;color:rgba(255,255,255,.8);max-height:220px;overflow-y:auto;line-height:1.8;}',
'.ams3-log-ok{color:var(--green-300,#86efac);}',
'.ams3-log-err{color:var(--red-400,#f87171);}',
'.ams3-log-info{color:var(--cyan-300,#7dd3fc);}',
'.ams3-log-warn{color:var(--amber-300,#fcd34d);}',

/* ── JSON viewer ── */
'.ams3-json{background:var(--text-primary,#0f172a);border-radius:10px;padding:12px;font-size:10px;font-family:monospace;color:rgba(255,255,255,.85);overflow:auto;max-height:360px;line-height:1.5;white-space:pre-wrap;}',
'.ams3-json .jk{color:var(--cyan-300,#7dd3fc);}',
'.ams3-json .js{color:var(--green-300,#86efac);}',
'.ams3-json .jnum{color:var(--amber-300,#fcd34d);}',
'.ams3-json .jb{color:var(--purple-400,#a78bfa);}',
'.ams3-json .jn{color:var(--red-400,#f87171);}',

/* ── Responsive ── */
'@media(max-width:900px){.ams3-split{grid-template-columns:1fr;height:auto;}.ams3-split-list{height:280px;}.ams3-hero{grid-template-columns:1fr;}.ams3-kpis{grid-template-columns:repeat(2,1fr);}.ams3-health{grid-template-columns:repeat(2,1fr);}}'
];

/* ═══════════════════════════ RENDER ENTRY ═══════════════════════════ */

function render() {
  var c = S.container;
  if (!c) return;
  ensureStyles();

  if (S.loading) {
    c.innerHTML = '<div class="ams3"><div class="ams3-loading"><div class="ams3-spinner"></div>Loading studio data…</div></div>';
    return;
  }

  var tabCounts = buildTabCounts();
  var tabs = TABS.map(function(t) {
    var n = tabCounts[t.id];
    return '<div class="ams3-tab' + (S.tab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' +
      t.icon + ' ' + t.label +
      (n != null ? ' <span class="ams3-tab-n">' + fmt(n) + '</span>' : '') +
    '</div>';
  }).join('');

  var overview = obj(obj(S.summary).overview);
  var endpointCount = overview.endpointCount || 0;
  var tableCount = overview.tableCount || 0;

  var body = '';
  if (S.error) body = '<div class="ams3-err">⚠️ ' + esc(S.error) + ' <button class="ams3-btn ghost sm" data-action="reload">Retry</button></div>';

  if (S.loaded) {
    switch (S.tab) {
      case 'command': body += renderCommandCenter(); break;
      case 'apis':    body += renderApiExplorer();   break;
      case 'db':      body += renderDbStudio();      break;
      case 'fields':  body += renderFieldForge();    break;
      case 'schema':  body += renderSchemaArchitect(); break;
      case 'vars':    body += renderVariables();     break;
      case 'ops':     body += renderRegistryOps();   break;
    }
  } else if (!S.error) {
    body = '<div class="ams3-loading"><div class="ams3-spinner"></div>Initializing…</div>';
  }

  c.innerHTML =
    '<div class="ams3">' +
      '<div class="ams3-hd">' +
        '<div class="ams3-hd-top">' +
          '<h2 class="ams3-hd-title">⚡ API &amp; DB Studio</h2>' +
          '<span class="ams3-hd-badge">v3.0 — ' + fmt(endpointCount) + ' endpoints · ' + fmt(tableCount) + ' tables</span>' +
          '<div class="ams3-hd-actions">' +
            '<button class="ams3-btn ghost sm" data-action="reload">↻ Refresh</button>' +
            '<button class="ams3-btn ghost sm" data-action="export-openapi">↓ OpenAPI</button>' +
            '<button class="ams3-btn primary sm" data-action="compile">⚡ Compile</button>' +
          '</div>' +
        '</div>' +
        '<div class="ams3-tabs">' + tabs + '</div>' +
      '</div>' +
      '<div class="ams3-body">' + body + '</div>' +
    '</div>';

  attachEvents(c);
}

function buildTabCounts() {
  if (!S.summary) return {};
  var ov = obj(S.summary.overview);
  return {
    apis:   ov.endpointCount,
    db:     ov.tableCount,
    fields: ov.dataFieldEndpointCount,
    schema: ov.schemaCount,
    vars:   ov.variableCount
  };
}

/* ═══════════════════════════ COMMAND CENTER ═══════════════════════════ */

function renderCommandCenter() {
  if (!S.summary) return '<div class="ams3-empty"><div class="ams3-empty-icon">📊</div><div class="ams3-empty-t">No data yet</div></div>';
  var ov = obj(S.summary.overview);
  var ss = obj(S.summary.schemaStudio);
  var manifest = obj(ss.manifest);
  var diag = obj(ss.diagnostics);
  var exp  = obj(ss.experienceReport);
  var ops  = obj(ss.operationsReport);
  var cmd  = obj(ss.commandCenterReport);

  /* Health scores */
  var scores = [
    { name:'Experience',        val: pctVal(exp.summary, 'overallExperienceScore') || pctVal(cmd, 'experienceScore') },
    { name:'Operations',        val: pctVal(ops.summary, 'overallOperationsScore') || pctVal(cmd, 'operationsScore') },
    { name:'Promotion Ready',   val: pctVal(cmd, 'promotionReadinessScore') },
    { name:'Firewall',          val: pctVal(cmd, 'firewallScore') },
    { name:'Observability',     val: pctVal(cmd, 'observabilityScore') },
    { name:'Compliance',        val: pctVal(cmd, 'complianceReadinessScore') },
    { name:'Performance',       val: pctVal(cmd, 'performancePostureScore') },
    { name:'Registry Sync',     val: pctVal(cmd, 'registrySyncScore') },
    { name:'AI Copilot',        val: pctVal(cmd, 'aiCopilotScore') },
    { name:'Coverage',          val: pctVal(ov, 'canonicalCoverage') }
  ];

  var healthCards = scores.map(function(s) {
    var sc = scoreClass(s.val);
    return '<div class="ams3-hcard sc-' + sc + '">' +
      '<div class="ams3-hcard-name">' + esc(s.name) + '</div>' +
      '<div class="ams3-hcard-score">' + Math.round(s.val) + '%</div>' +
      '<div class="ams3-hcard-bar"><div class="ams3-hcard-fill" style="width:' + Math.min(100, Math.round(s.val)) + '%"></div></div>' +
    '</div>';
  }).join('');

  /* KPIs */
  var kpis = [
    { val: ov.endpointCount,    lbl:'Endpoints',  tone:'blue'   },
    { val: ov.tableCount,       lbl:'DB Tables',  tone:'green'  },
    { val: ov.schemaCount,      lbl:'Schemas',    tone:'purple' },
    { val: ov.variableCount,    lbl:'Variables',  tone:'amber'  },
    { val: ov.dataFieldEndpointCount, lbl:'Field Defs', tone:'cyan' },
    { val: ov.domainCount,      lbl:'Domains',    tone:'blue'   },
    { val: ov.workflowCount,    lbl:'Workflows',  tone:'green'  },
    { val: ov.migrationCount,   lbl:'Migrations', tone:'purple' }
  ].map(function(k) {
    return '<div class="ams3-kpi ' + k.tone + '">' +
      '<div class="ams3-kpi-val">' + fmt(k.val || 0) + '</div>' +
      '<div class="ams3-kpi-lbl">' + esc(k.lbl) + '</div>' +
    '</div>';
  }).join('');

  /* Blockers / hotspots */
  var hotspots = pctVal(cmd, 'hotspots') || 0;
  var blockers  = pctVal(cmd, 'blockers') || 0;

  /* Principles */
  var principles = arr(S.summary.principles);
  var prinHtml = principles.length ? principles.map(function(p) {
    return '<div class="ams3-diff-row ams3-diff-ok">' +
      '<div class="ams3-diff-icon">✅</div>' +
      '<div class="ams3-diff-info">' +
        '<div class="ams3-diff-title">' + esc(p.title || p.name || '') + '</div>' +
        (p.description ? '<div class="ams3-diff-detail">' + esc(p.description) + '</div>' : '') +
      '</div></div>';
  }).join('') : '';

  return [
    '<div class="ams3-hero">',
      '<div>',
        '<div class="ams3-hero-t">⚡ API &amp; DB Command Center</div>',
        '<div class="ams3-hero-s">Unified metadata governance · Registry-driven · Zero hardcoding</div>',
      '</div>',
      '<div class="ams3-hero-stats">',
        '<div class="ams3-hero-stat"><strong>' + fmt(hotspots) + '</strong>Hotspots</div>',
        '<div class="ams3-hero-stat"><strong>' + fmt(blockers) + '</strong>Blockers</div>',
      '</div>',
    '</div>',

    '<div class="ams3-sec"><div class="ams3-sec-title">System KPIs</div>',
      '<div class="ams3-kpis">' + kpis + '</div>',
    '</div>',

    '<div class="ams3-sec"><div class="ams3-sec-title">Health Scores</div>',
      '<div class="ams3-health">' + healthCards + '</div>',
    '</div>',

    principles.length ? '<div class="ams3-sec"><div class="ams3-sec-title">Governance Principles</div>' + prinHtml + '</div>' : '',

    manifest && manifest.headline ? [
      '<div class="ams3-sec"><div class="ams3-sec-title">Schema Studio Manifest</div>',
        '<div class="ams3-props">',
          prop('Version', manifest.schemaStudioVersion || manifest.version),
          prop('Headline', manifest.headline),
          prop('Architecture', manifest.architectureMode),
          prop('Generated', manifest.generatedAt ? new Date(manifest.generatedAt).toLocaleString() : null),
        '</div>',
      '</div>'
    ].join('') : ''

  ].join('');
}

function pctVal(o, k) { return Number(obj(o)[k]) || 0; }

/* ═══════════════════════════ API EXPLORER ═══════════════════════════ */

function renderApiExplorer() {
  var all = apiSummaries();

  /* filter */
  var methods = ['ALL'].concat(Object.keys(METHOD_CFG));
  var domains = ['ALL'].concat(uniqueVals(all, 'domain').sort());
  var kinds   = ['ALL'].concat(uniqueVals(all, 'kind').sort());

  var filtered = all.filter(function(a) {
    var q = S.apiSearch.toLowerCase();
    var mOk = S.apiMethod === 'ALL' || a.method === S.apiMethod;
    var dOk = S.apiDomain === 'ALL' || a.domain === S.apiDomain;
    var kOk = S.apiKind   === 'ALL' || a.kind   === S.apiKind;
    var sOk = !q || (a.action||'').toLowerCase().includes(q) || (a.label||'').toLowerCase().includes(q) || (a.labelEn||'').toLowerCase().includes(q) || (a.entity||'').toLowerCase().includes(q);
    return mOk && dOk && kOk && sOk;
  });

  var listHtml = filtered.length ? filtered.map(function(a) {
    var sel = S.selApi === a.key;
    var mc = METHOD_CFG[a.method] || METHOD_CFG.GET;
    return '<div class="ams3-api-row' + (sel ? ' sel' : '') + '" data-api-key="' + esc(a.key || a.action) + '">' +
      '<div class="ams3-api-r1">' +
        '<span class="ams3-method" style="background:' + mc.bg + ';color:' + mc.text + '">' + esc(a.method) + '</span>' +
        '<span class="ams3-api-action">' + esc(a.action || a.key) + '</span>' +
      '</div>' +
      '<div class="ams3-api-label">' + esc(a.label || a.labelEn || '') + '</div>' +
      '<div class="ams3-api-meta">' +
        (a.domain ? '<span class="ams3-chip">' + domainIcon(a.domain) + ' ' + esc(a.domain) + '</span>' : '') +
        (a.kind   ? '<span class="ams3-chip">' + esc(a.kind) + '</span>' : '') +
        (a.field_count ? '<span style="font-size:10px;color:var(--text-muted,#64748b);">' + a.field_count + ' fields</span>' : '') +
      '</div>' +
    '</div>';
  }).join('') : '<div class="ams3-empty" style="padding:30px;"><div class="ams3-empty-icon">🔍</div><div class="ams3-empty-t">No endpoints match</div></div>';

  var detail = S.selApi && S.apiEditor ? renderApiDetail() : renderApiEmpty();

  return '<div class="ams3-split">' +
    '<div class="ams3-split-list">' +
      '<div class="ams3-toolbar">' +
        '<div class="ams3-searchbox"><span>🔍</span><input type="text" placeholder="Search action, label, entity…" value="' + esc(S.apiSearch) + '" data-filter="apiSearch"></div>' +
        '<div class="ams3-filters">' +
          selFilter('apiMethod', methods, S.apiMethod, 'Method') +
          selFilter('apiDomain', domains, S.apiDomain, 'Domain') +
          selFilter('apiKind',   kinds,   S.apiKind,   'Kind') +
        '</div>' +
      '</div>' +
      '<div class="ams3-list-items">' + listHtml + '</div>' +
      '<div class="ams3-list-foot">' + filtered.length + ' / ' + all.length + ' endpoints</div>' +
    '</div>' +
    '<div class="ams3-split-detail">' + detail + '</div>' +
  '</div>';
}

function renderApiDetail() {
  var ed = S.apiEditor;
  if (!ed) return renderApiEmpty();
  var it = obj(ed.item);
  var sec = obj(it.security);
  var req = obj(it.request);
  var res = obj(it.response);
  var mc = METHOD_CFG[it.method] || METHOD_CFG.GET;

  var dtabs = ['overview','contract','fields','tester'].map(function(t) {
    return '<div class="ams3-dtab' + (S.apiDetailTab === t ? ' active' : '') + '" data-api-dtab="' + t + '">' +
      { overview:'📋 Overview', contract:'📐 Contract', fields:'🧩 Fields', tester:'🚀 Tester' }[t] +
    '</div>';
  }).join('');

  var body = '';
  if (S.detailLoading) {
    body = '<div class="ams3-loading"><div class="ams3-spinner"></div>Loading…</div>';
  } else {
    switch (S.apiDetailTab) {
      case 'overview':  body = renderApiOverview(ed); break;
      case 'contract':  body = renderApiContract(ed); break;
      case 'fields':    body = renderApiFields(ed);   break;
      case 'tester':    body = renderTester(ed);      break;
    }
  }

  return [
    '<div class="ams3-detail-hd">',
      '<div style="margin-top:2px">' + '<span class="ams3-method" style="background:' + mc.bg + ';color:' + mc.text + ';font-size:11px;padding:3px 8px">' + esc(it.method) + '</span>' + '</div>',
      '<div class="ams3-detail-hd-info">',
        '<div class="ams3-detail-name">' + esc(it.action || ed.key) + '</div>',
        '<div class="ams3-detail-path">' +
          (it.path ? '<code>' + esc(it.path) + '</code>' : '') +
          (it.entity ? ' · <span class="ams3-chip">' + esc(it.entity) + '</span>' : '') +
        '</div>',
      '</div>',
    '</div>',
    '<div class="ams3-detail-tabs">' + dtabs + '</div>',
    '<div class="ams3-detail-body">' + body + '</div>'
  ].join('');
}

function renderApiOverview(ed) {
  var it = obj(ed.item);
  var sec = obj(it.security);
  var ap = obj(ed.apiParams);
  return [
    '<div class="ams3-props">',
      prop('Action',    it.action),
      prop('Label',     it.label || it.labelEn),
      prop('Module',    it.module || it.moduleEn),
      prop('Domain',    (it.domain ? domainIcon(it.domain) + ' ' : '') + (it.domain || '—')),
      prop('Entity',    it.entity),
      prop('Kind',      it.kind),
      prop('Path',      it.path),
    '</div>',
    '<div class="ams3-sec-title" style="margin-top:12px">Security</div>',
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">',
      sec.auth_required  ? '<span class="ams3-chip auth">🔒 Auth Required</span>' : '<span class="ams3-chip">Public</span>',
      sec.csrf_required  ? '<span class="ams3-chip csrf">🛡️ CSRF</span>' : '',
      sec.admin_only     ? '<span class="ams3-chip admin">👑 Admin Only</span>' : '',
      sec.dynamic_permission ? '<span class="ams3-chip info">⚙️ Dynamic Perm</span>' : '',
      arr(sec.permission_keys).map(function(k){ return '<span class="ams3-chip">' + esc(k) + '</span>'; }).join(''),
    '</div>',
    ap && ap.description ? '<div style="font-size:12px;color:var(--text-muted,#64748b);line-height:1.5;margin-bottom:12px;">' + esc(ap.description) + '</div>' : ''
  ].join('');
}

function renderApiContract(ed) {
  var it = obj(ed.item);
  var req = obj(it.request);
  var res = obj(it.response);
  var cap = obj(it.capabilities);
  return [
    '<div class="ams3-sec-title">Request</div>',
    '<div class="ams3-props">',
      prop('Query Params',    arr(req.query_params).join(', ') || '—'),
      prop('Body Fields',     arr(req.body_fields).join(', ')  || '—'),
      prop('Required Fields', arr(req.required_body_fields).join(', ') || '—'),
      prop('Body Mode',       req.body_mode),
      prop('Org Scope',       req.org_scope ? '✅' : '—'),
    '</div>',
    '<div class="ams3-sec-title" style="margin-top:12px">Response</div>',
    '<div class="ams3-props">',
      prop('Collection Key',  res.collection_key),
      prop('Response Fields', arr(res.response_fields).join(', ') || '—'),
      prop('Paginated',       res.paginated ? '✅ Yes' : 'No'),
    '</div>',
    cap && arr(cap.searchable_fields).length ? [
      '<div class="ams3-sec-title" style="margin-top:12px">Capabilities</div>',
      '<div class="ams3-props">',
        prop('Searchable',  arr(cap.searchable_fields).join(', ')  || '—'),
        prop('Sortable',    arr(cap.sortable_fields).join(', ')    || '—'),
        prop('Filterable',  arr(cap.filterable_fields).join(', ')  || '—'),
        prop('Transitions', arr(cap.transition_targets).join(', ') || '—'),
      '</div>'
    ].join('') : ''
  ].join('');
}

function renderApiFields(ed) {
  var fields = arr(ed.fields);
  if (!fields.length) return '<div class="ams3-empty" style="padding:30px;"><div class="ams3-empty-icon">🧩</div><div class="ams3-empty-t">No fields defined</div></div>';
  return '<table class="ams3-tbl"><thead><tr>' +
    '<th>Key</th><th>Label</th><th>Type</th><th>DB Table</th><th>DB Column</th><th>Req</th>' +
    '</tr></thead><tbody>' +
    fields.map(function(f) {
      return '<tr>' +
        '<td><code style="font-family:monospace;font-size:10px">' + esc(f.key) + '</code></td>' +
        '<td>' + esc(f.label || f.labelEn || '') + '</td>' +
        '<td><span class="ams3-type-pill">' + esc(f.type || '') + '</span></td>' +
        '<td style="font-family:monospace;font-size:10px">' + esc(f.dbTable || '') + '</td>' +
        '<td style="font-family:monospace;font-size:10px">' + esc(f.dbColumn || '') + '</td>' +
        '<td>' + (f.required ? '<span class="ams3-req-dot"></span>' : '<span class="ams3-opt-dot"></span>') + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

function renderTester(ed) {
  var it = obj(ed ? ed.item : {});
  var url = 'api/index.php?action=' + encodeURIComponent(it.action || '');
  var method = it.method || 'GET';
  var showBody = method !== 'GET';
  var hasResult = S.testerResult != null;

  var statusPillClass = 'ams3-st-' + (S.testerStatus >= 500 ? '5xx' : S.testerStatus >= 400 ? '4xx' : '2xx');

  return [
    '<div class="ams3-tester">',
      '<div class="ams3-tester-bar">',
        '<button class="ams3-tester-meth" data-action="tester-toggle-method">' + esc(S.testerMethod || method) + '</button>',
        '<input class="ams3-tester-url" type="text" value="' + esc(S.testerUrl || url) + '" data-tester="url" placeholder="Request URL">',
        '<button class="ams3-tester-send" data-action="tester-send"' + (S.testLoading ? ' disabled' : '') + '>' +
          (S.testLoading ? '⏳ Sending…' : '▶ Send') +
        '</button>',
      '</div>',
      showBody || S.testerMethod !== 'GET' ? [
        '<div class="ams3-tester-body">',
          '<textarea data-tester="body" placeholder=\'{"key": "value"}\'>' + esc(S.testerBody || '{}') + '</textarea>',
        '</div>'
      ].join('') : '',
      hasResult ? [
        '<div class="ams3-tester-res">',
          '<div class="ams3-tester-res-hd">',
            '<span class="ams3-st-pill ' + statusPillClass + '">' + (S.testerStatus || '—') + '</span>',
            '<span style="color:rgba(255,255,255,.6)">' + (S.testerLatency ? S.testerLatency + 'ms' : '') + '</span>',
            '<span style="flex:1"></span>',
            '<button class="ams3-btn ghost sm" style="font-size:10px;padding:3px 8px" data-action="tester-copy">Copy</button>',
          '</div>',
          '<div class="ams3-tester-json">' + hlJson(S.testerResult) + '</div>',
        '</div>'
      ].join('') : '',
    '</div>',
    '<div style="font-size:10px;color:var(--text-muted,#64748b);margin-top:-8px">Execute real API requests directly from the studio. Responses are live from the server.</div>'
  ].join('');
}

function renderApiEmpty() {
  return '<div class="ams3-empty"><div class="ams3-empty-icon">🔌</div><div class="ams3-empty-t">Select an API endpoint</div><div class="ams3-empty-s">Search and click any endpoint from the list to view full contract, fields, and run live tests.</div></div>';
}

/* ═══════════════════════════ DB STUDIO ═══════════════════════════ */

function renderDbStudio() {
  var all = tableSummaries();
  var domains = ['ALL'].concat(uniqueVals(all, 'domain').sort());
  var filtered = all.filter(function(t) {
    var q = S.tableSearch.toLowerCase();
    var dOk = S.tableDomain === 'ALL' || t.domain === S.tableDomain;
    var sOk = !q || (t.key||'').toLowerCase().includes(q) || (t.label||'').toLowerCase().includes(q) || (t.labelEn||'').toLowerCase().includes(q);
    return dOk && sOk;
  });

  var listHtml = filtered.map(function(t) {
    var sel = S.selTable === t.key;
    return '<div class="ams3-api-row' + (sel ? ' sel' : '') + '" data-table-key="' + esc(t.key) + '">' +
      '<div class="ams3-api-r1">' +
        '<span style="font-size:16px">' + domainIcon(t.domain) + '</span>' +
        '<span class="ams3-api-action">' + esc(t.key) + '</span>' +
      '</div>' +
      '<div class="ams3-api-label">' + esc(t.label || t.labelEn || '') + '</div>' +
      '<div class="ams3-api-meta">' +
        '<span class="ams3-chip">' + esc(t.domain || '') + '</span>' +
        '<span style="font-size:10px;color:var(--text-muted,#64748b);">' + (t.columnCount || 0) + ' cols</span>' +
        (t.workflowId ? '<span class="ams3-chip ok">⚡ workflow</span>' : '') +
        (t.supportTable ? '<span class="ams3-chip info">ref</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  var detail = S.selTable && S.tableEditor ? renderTableDetail() : renderTableEmpty();

  return '<div class="ams3-split">' +
    '<div class="ams3-split-list">' +
      '<div class="ams3-toolbar">' +
        '<div class="ams3-searchbox"><span>🔍</span><input type="text" placeholder="Search table…" value="' + esc(S.tableSearch) + '" data-filter="tableSearch"></div>' +
        '<div class="ams3-filters">' + selFilter('tableDomain', domains, S.tableDomain, 'Domain') + '</div>' +
      '</div>' +
      '<div class="ams3-list-items">' + listHtml + '</div>' +
      '<div class="ams3-list-foot">' + filtered.length + ' / ' + all.length + ' tables</div>' +
    '</div>' +
    '<div class="ams3-split-detail">' + detail + '</div>' +
  '</div>';
}

function renderTableDetail() {
  var ed = S.tableEditor;
  if (!ed) return renderTableEmpty();
  var it = obj(ed.item);

  var dtabs = ['columns','relations','preview','diff'].map(function(t) {
    return '<div class="ams3-dtab' + (S.dbDetailTab === t ? ' active' : '') + '" data-db-dtab="' + t + '">' +
      { columns:'📋 Columns', relations:'🔗 Relations', preview:'👁 Preview', diff:'⚡ Schema Diff' }[t] +
    '</div>';
  }).join('');

  var body = S.detailLoading
    ? '<div class="ams3-loading"><div class="ams3-spinner"></div>Loading…</div>'
    : ({
        columns:   renderTableColumns(ed),
        relations: renderTableRelations(ed),
        preview:   renderDataPreview(ed),
        diff:      renderSchemaDiff(ed)
      })[S.dbDetailTab] || '';

  return [
    '<div class="ams3-detail-hd">',
      '<div style="font-size:28px">' + domainIcon(it.domain) + '</div>',
      '<div class="ams3-detail-hd-info">',
        '<div class="ams3-detail-name">' + esc(ed.key) + '</div>',
        '<div class="ams3-detail-path">' +
          esc(it.label || it.labelEn || '') +
          (it.domain ? ' · <span class="ams3-chip">' + esc(it.domain) + '</span>' : '') +
          (it.workflowId ? ' · <span class="ams3-chip ok">⚡ ' + esc(it.workflowId) + '</span>' : '') +
          (it.statusColumn ? ' · <span class="ams3-chip info">status: ' + esc(it.statusColumn) + '</span>' : '') +
        '</div>',
      '</div>',
      '<button class="ams3-btn ghost sm" data-action="table-preview" data-table="' + esc(ed.key) + '">👁 Live Preview</button>',
    '</div>',
    '<div class="ams3-detail-tabs">' + dtabs + '</div>',
    '<div class="ams3-detail-body">' + body + '</div>'
  ].join('');
}

function renderTableColumns(ed) {
  var it = obj(ed.item);
  var cols = ed.columnsList || [];
  if (!cols.length) return '<div class="ams3-empty" style="padding:30px;"><div class="ams3-empty-icon">📋</div><div class="ams3-empty-t">No columns defined</div></div>';

  return [
    '<div class="ams3-props" style="margin-bottom:12px">',
      prop('Table',      ed.key),
      prop('Primary Key', Array.isArray(it.primaryKey) ? it.primaryKey.join(', ') : (it.primaryKey || '—')),
      prop('Migration',  it.migration),
      prop('Description', it.description),
    '</div>',
    '<table class="ams3-tbl"><thead><tr>',
      '<th>Column</th><th>SQL Type</th><th>UI Type</th><th>Label</th><th>Req</th><th>Flags</th><th>References</th>',
    '</tr></thead><tbody>',
    cols.map(function(col) {
      var flags = [];
      if (col.pk)        flags.push('<span class="ams3-pk">PK</span>');
      if (col.unique)    flags.push('<span class="ams3-chip" style="font-size:9px">UQ</span>');
      if (col.generated) flags.push('<span class="ams3-chip" style="font-size:9px">GEN</span>');
      if (col.fk || col.references) flags.push('<span class="ams3-fk">FK</span>');
      var uiIcon = UITYPE_ICON[col.uiType] || '—';
      return '<tr>' +
        '<td style="font-family:monospace;font-weight:700;font-size:11px">' + esc(col.key) + '</td>' +
        '<td><span class="ams3-type-pill">' + esc(col.type || '') + '</span></td>' +
        '<td title="' + esc(col.uiType || '') + '" style="font-size:12px">' + esc(uiIcon) + '</td>' +
        '<td style="font-size:11px">' + esc(col.label || col.labelEn || '') + '</td>' +
        '<td>' + (col.required ? '<span class="ams3-req-dot"></span>' : '<span class="ams3-opt-dot"></span>') + '</td>' +
        '<td style="display:flex;gap:3px;flex-wrap:wrap">' + (flags.join('') || '—') + '</td>' +
        '<td style="font-family:monospace;font-size:10px;color:var(--text-muted,#64748b)">' + esc(col.references || '') + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>'
  ].join('');
}

function renderTableRelations(ed) {
  var it = obj(ed.item);
  var fks = arr(it.foreignKeys);
  var dt  = obj(it.digitalThread);
  var upstream   = arr(dt.upstream);
  var downstream = arr(dt.downstream);

  return [
    fks.length ? [
      '<div class="ams3-sec-title">Foreign Keys (' + fks.length + ')</div>',
      '<table class="ams3-tbl"><thead><tr><th>Column</th><th>References</th><th>Label</th></tr></thead><tbody>',
      fks.map(function(fk) {
        return '<tr><td style="font-family:monospace;font-weight:700">' + esc(fk.column) + '</td><td style="font-family:monospace;color:var(--brand-2,#2563eb)">' + esc(fk.references) + '</td><td>' + esc(fk.label || '') + '</td></tr>';
      }).join(''),
      '</tbody></table>'
    ].join('') : '<div style="color:var(--text-muted,#64748b);font-size:12px;margin-bottom:12px">No foreign keys</div>',

    upstream.length || downstream.length ? [
      '<div class="ams3-sec-title" style="margin-top:16px">Digital Thread</div>',
      upstream.length ? '<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b)">⬆ Upstream:</span> ' + upstream.map(function(t){ return '<span class="ams3-stag">' + esc(t) + '</span>'; }).join(' ') + '</div>' : '',
      downstream.length ? '<div><span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b)">⬇ Downstream:</span> ' + downstream.map(function(t){ return '<span class="ams3-stag">' + esc(t) + '</span>'; }).join(' ') + '</div>' : ''
    ].join('') : ''
  ].join('');
}

function renderDataPreview(ed) {
  if (S.previewLoading) return '<div class="ams3-loading"><div class="ams3-spinner"></div>Loading live data…</div>';
  if (!S.previewData) {
    return '<div class="ams3-empty" style="padding:30px;">' +
      '<div class="ams3-empty-icon">👁</div>' +
      '<div class="ams3-empty-t">Live Data Preview</div>' +
      '<div class="ams3-empty-s">Fetch real rows directly from the database.</div>' +
      '<button class="ams3-btn primary" style="margin-top:12px" data-action="table-preview" data-table="' + esc(ed.key) + '">Load Data</button>' +
    '</div>';
  }

  var rows = arr(S.previewData.rows);
  var cols = arr(S.previewData.columns);
  if (!rows.length) return '<div style="color:var(--text-muted,#64748b);font-size:13px;padding:20px">Table is empty</div>';

  var theads = cols.map(function(c){ return '<th>' + esc(c) + '</th>'; }).join('');
  var tbody = rows.map(function(row) {
    var tds = cols.map(function(c) {
      var v = row[c];
      if (v === null || v === undefined) return '<td class="pv-null">null</td>';
      if (v === true)  return '<td class="pv-t">true</td>';
      if (v === false) return '<td class="pv-f">false</td>';
      return '<td>' + esc(String(v).substring(0, 80)) + '</td>';
    }).join('');
    return '<tr>' + tds + '</tr>';
  }).join('');

  return [
    '<div class="ams3-preview-wrap"><table class="ams3-prev-tbl"><thead><tr>' + theads + '</tr></thead><tbody>' + tbody + '</tbody></table></div>',
    '<div class="ams3-pager">',
      '<button class="ams3-pg-btn" data-action="preview-prev"' + (S.previewPage <= 1 ? ' disabled' : '') + '>← Prev</button>',
      '<span>Page ' + S.previewPage + (S.previewTotal ? ' of ' + Math.ceil(S.previewTotal / 25) : '') + '</span>',
      '<button class="ams3-pg-btn" data-action="preview-next">Next →</button>',
      '<span style="margin-left:8px;font-size:10px">' + (S.previewTotal ? fmt(S.previewTotal) + ' rows total' : '') + '</span>',
    '</div>'
  ].join('');
}

function renderSchemaDiff(ed) {
  var it = obj(ed.item);
  var cols = ed.columnsList || [];
  /* Simulate diff based on registry data — actual diff happens via reverse_engineer */
  var items = [
    { type:'ok',   title:'Table exists in registry & DB', detail: ed.key + ' · ' + (it.migration || 'no migration ref') },
    { type:'ok',   title:cols.length + ' columns defined in registry', detail: 'Use "Reverse Engineer" in Registry Ops to sync from actual DB schema.' },
    it.workflowId ? { type:'ok', title:'Workflow binding: ' + it.workflowId, detail:'Status column: ' + (it.statusColumn || '—') } : null,
    it.statusColumn && !it.statusSet ? { type:'warn', title:'Status set not configured', detail:'statusSet is empty — add registry:' + ed.key + '_status reference.' } : null,
    !it.migration  ? { type:'warn', title:'No migration file referenced', detail:'Add migration field to table registry entry.' } : null,
    !it.description ? { type:'warn', title:'Missing table description', detail:'Add a description to improve discoverability.' } : null
  ].filter(Boolean);

  return [
    '<div style="margin-bottom:10px;font-size:12px;color:var(--text-muted,#64748b)">Registry vs. DB schema analysis. Run <strong>Reverse Engineer</strong> in Registry Ops for a full live diff.</div>',
    items.map(function(item) {
      return '<div class="ams3-diff-row ams3-diff-' + esc(item.type) + '">' +
        '<div class="ams3-diff-icon">' + { ok:'✅', warn:'⚠️', err:'❌' }[item.type] + '</div>' +
        '<div class="ams3-diff-info">' +
          '<div class="ams3-diff-title">' + esc(item.title) + '</div>' +
          '<div class="ams3-diff-detail">' + esc(item.detail) + '</div>' +
        '</div>' +
      '</div>';
    }).join('')
  ].join('');
}

function renderTableEmpty() {
  return '<div class="ams3-empty"><div class="ams3-empty-icon">🗄️</div><div class="ams3-empty-t">Select a table</div><div class="ams3-empty-s">Browse 528 tables, inspect columns, FK relationships, live data, and schema diff.</div></div>';
}

/* ═══════════════════════════ FIELD FORGE ═══════════════════════════ */

function renderFieldForge() {
  var all = apiSummaries();
  /* build field list from loaded apiEditor if available */
  var fields = S.apiEditor ? arr(S.apiEditor.fields) : [];
  var q = S.fieldSearch.toLowerCase();
  if (q) fields = fields.filter(function(f){ return (f.key||'').toLowerCase().includes(q) || (f.label||'').toLowerCase().includes(q) || (f.type||'').toLowerCase().includes(q); });

  var sideList = all.slice(0, 50).map(function(a) {
    var sel = S.selApi === a.key;
    var mc = METHOD_CFG[a.method] || METHOD_CFG.GET;
    return '<div class="ams3-api-row' + (sel ? ' sel' : '') + '" data-field-api="' + esc(a.key || a.action) + '">' +
      '<div class="ams3-api-r1">' +
        '<span class="ams3-method" style="background:' + mc.bg + ';color:' + mc.text + '">' + esc(a.method) + '</span>' +
        '<span class="ams3-api-action">' + esc(a.action || a.key) + '</span>' +
      '</div>' +
      '<div class="ams3-api-label">' + (a.field_count || 0) + ' fields · ' + esc(a.entity || '') + '</div>' +
    '</div>';
  }).join('');

  var fieldHtml = fields.length ? [
    '<div class="ams3-searchbox" style="margin-bottom:12px"><span>🔍</span><input type="text" placeholder="Filter fields…" value="' + esc(S.fieldSearch) + '" data-filter="fieldSearch"></div>',
    '<div class="ams3-field-grid">',
    fields.map(function(f) {
      var uiIcon = UITYPE_ICON[f.type] || '?';
      return '<div class="ams3-fcard">' +
        '<div class="ams3-fcard-name">' + esc(f.key) + '</div>' +
        '<div class="ams3-fcard-meta">' +
          '<span class="ams3-type-pill">' + esc(uiIcon + ' ' + (f.type || 'string')) + '</span>' +
          (f.required ? '<span class="ams3-chip admin" style="font-size:9px">required</span>' : '') +
          (f.dbTable ? '<span class="ams3-chip info" style="font-size:9px">' + esc(f.dbTable + '.' + (f.dbColumn || f.key)) + '</span>' : '') +
        '</div>' +
        (f.label || f.labelEn ? '<div class="ams3-fcard-desc">' + esc(f.label || f.labelEn) + '</div>' : '') +
      '</div>';
    }).join(''),
    '</div>'
  ].join('') : '<div class="ams3-empty" style="padding:40px;"><div class="ams3-empty-icon">🧩</div><div class="ams3-empty-t">Select an API to inspect its fields</div></div>';

  return '<div class="ams3-split">' +
    '<div class="ams3-split-list">' +
      '<div class="ams3-toolbar"><div class="ams3-searchbox"><span>🔍</span><input type="text" placeholder="Find API…" value="" data-filter="apiSearch"></div></div>' +
      '<div class="ams3-list-items">' + sideList + '</div>' +
      '<div class="ams3-list-foot">Select API → inspect fields</div>' +
    '</div>' +
    '<div class="ams3-split-detail"><div class="ams3-detail-body">' + fieldHtml + '</div></div>' +
  '</div>';
}

/* ═══════════════════════════ SCHEMA ARCHITECT ═══════════════════════════ */

function renderSchemaArchitect() {
  var all = schemaSummaries();
  var q = S.schemaSearch.toLowerCase();
  var filtered = q ? all.filter(function(s){ return (s.key||'').toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q); }) : all;

  var selected = S.selSchema ? all.find(function(s){ return s.key === S.selSchema; }) : null;

  var cards = filtered.map(function(s) {
    var sel = S.selSchema === s.key;
    var tables = arr(s.tables || (S.summary && S.summary.schemaLibrary && S.summary.schemaLibrary[s.key] ? S.summary.schemaLibrary[s.key].tables : []));
    return '<div class="ams3-scard' + (sel ? ' sel' : '') + '" data-schema-key="' + esc(s.key) + '">' +
      '<div class="ams3-scard-name">🏗️ ' + esc(s.key) + '</div>' +
      '<div class="ams3-scard-desc">' + esc(s.description || '') + '</div>' +
      '<div class="ams3-scard-tables">' +
        '<span class="ams3-chip">' + (s.tableCount || tables.length || 0) + ' tables</span>' +
        (s.migrationCount ? '<span class="ams3-chip info">' + s.migrationCount + ' migrations</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  return [
    '<div class="ams3-searchbox" style="margin-bottom:14px"><span>🔍</span><input type="text" placeholder="Search schemas…" value="' + esc(S.schemaSearch) + '" data-filter="schemaSearch"></div>',
    '<div style="font-size:11px;color:var(--text-muted,#64748b);margin-bottom:12px">' + filtered.length + ' schema groups</div>',
    '<div class="ams3-schema-grid">' + (cards || '<div class="ams3-empty" style="padding:40px"><div class="ams3-empty-icon">🏗️</div><div class="ams3-empty-t">No schemas found</div></div>') + '</div>'
  ].join('');
}

/* ═══════════════════════════ VARIABLES ═══════════════════════════ */

function renderVariables() {
  var all = varSummaries();
  var q = S.varSearch.toLowerCase();
  var filtered = q ? all.filter(function(v){ return (v.key||'').toLowerCase().includes(q) || (v.label||'').toLowerCase().includes(q); }) : all;

  /* Expand one category with variable rows if apiEditor has variablesList */
  var cats = filtered.map(function(cat) {
    var vcount = cat.variableCount || 0;
    return '<div class="ams3-vcat">' +
      '<div class="ams3-vcat-hd" data-var-cat="' + esc(cat.key) + '">' +
        '<span style="font-size:18px">📦</span>' +
        '<div>' +
          '<div class="ams3-vcat-name">' + esc(cat.label || cat.key) + '</div>' +
          '<div style="font-size:10px;color:var(--text-muted,#64748b)">' + esc(cat.label_vi || cat.description || '') + '</div>' +
        '</div>' +
        '<span class="ams3-vcat-n">' + vcount + '</span>' +
      '</div>' +
      (S.selVar === cat.key && S.varEditor ? renderVarRows(S.varEditor) : '') +
    '</div>';
  }).join('');

  return [
    '<div class="ams3-searchbox" style="margin-bottom:14px"><span>🔍</span><input type="text" placeholder="Search variable categories…" value="' + esc(S.varSearch) + '" data-filter="varSearch"></div>',
    '<div class="ams3-var-cats">' + (cats || '<div class="ams3-empty"><div class="ams3-empty-icon">📦</div><div class="ams3-empty-t">No variable categories</div></div>') + '</div>'
  ].join('');
}

function renderVarRows(ed) {
  var rows = arr(ed.variablesList);
  if (!rows.length) return '<div style="padding:12px 16px;font-size:11px;color:var(--text-muted,#64748b)">No variables in this category.</div>';
  return '<table class="ams3-var-tbl"><thead><tr>' +
    '<th>Key</th><th>Label</th><th>Type</th><th>Required</th><th>Example</th><th>Description</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(v) {
      return '<tr>' +
        '<td><span class="ams3-var-key">' + esc(v.key) + '</span></td>' +
        '<td>' + esc(v.label || v.label_vi || '') + '</td>' +
        '<td><span class="ams3-var-type">' + esc(v.type || '') + '</span></td>' +
        '<td>' + (v.required ? '<span class="ams3-req-dot"></span>' : '<span class="ams3-opt-dot"></span>') + '</td>' +
        '<td><span class="ams3-var-ex">' + esc(v.example || '') + '</span></td>' +
        '<td style="font-size:10px;color:var(--text-muted,#64748b)">' + esc(v.description || '') + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

/* ═══════════════════════════ REGISTRY OPS ═══════════════════════════ */

function renderRegistryOps() {
  var ov = obj(obj(S.summary).overview);
  var ss = obj(obj(S.summary).schemaStudio);
  var manifest = obj(ss.manifest);

  var ops = [
    { icon:'⚡', title:'Compile Registry', desc:'Rebuild endpoint-catalog.json, table-registry.json, data-fields.json from source schemas. Runs all Schema Studio rounds.', action:'ops-compile', cls:'primary' },
    { icon:'🔄', title:'Reverse Engineer', desc:'Introspect the live database and sync schema changes back into the table registry.', action:'ops-reverse', cls:'success' },
    { icon:'📤', title:'Export OpenAPI 3.0', desc:'Generate a full OpenAPI 3.0 specification from the endpoint catalog.', action:'ops-export-openapi', cls:'ghost' },
    { icon:'📬', title:'Export Postman Collection', desc:'Generate a Postman v2.1 collection with all 2,800+ endpoints pre-configured.', action:'ops-export-postman', cls:'ghost' },
    { icon:'🚀', title:'Release Bundle', desc:'Package and publish the compiled registry as a versioned release bundle.', action:'ops-release', cls:'success' },
    { icon:'📊', title:'Quality Report', desc:'Run the full registry quality analysis: coverage gaps, orphan detection, enum drift, FK integrity.', action:'ops-quality', cls:'ghost' },
    { icon:'🧹', title:'Orphan Resolution', desc:'Detect and resolve orphaned fields, unmapped tables, and dangling schema references.', action:'ops-orphans', cls:'ghost' },
    { icon:'🔍', title:'Parity Check', desc:'Compare schema registry against actual DB enums, tables and columns. Shows drift report.', action:'ops-parity', cls:'ghost' }
  ];

  var cards = ops.map(function(op) {
    return '<div class="ams3-ocard">' +
      '<div class="ams3-ocard-icon">' + op.icon + '</div>' +
      '<div class="ams3-ocard-title">' + esc(op.title) + '</div>' +
      '<div class="ams3-ocard-desc">' + esc(op.desc) + '</div>' +
      '<button class="ams3-ocard-btn ' + op.cls + '" data-action="' + op.action + '">' + op.icon + ' ' + esc(op.title) + '</button>' +
    '</div>';
  }).join('');

  var logHtml = S.opsLog.length
    ? S.opsLog.map(function(l) {
        return '<div class="ams3-log-' + esc(l.type) + '">' + esc('[' + l.time + '] ' + l.msg) + '</div>';
      }).join('')
    : '<span style="opacity:.5">No operations logged yet. Run an operation above.</span>';

  return [
    manifest.headline ? [
      '<div class="ams3-props" style="margin-bottom:16px">',
        prop('Version',      manifest.schemaStudioVersion || manifest.version),
        prop('Generated',    manifest.generatedAt ? new Date(manifest.generatedAt).toLocaleString() : '—'),
        prop('Architecture', manifest.architectureMode),
        prop('Endpoints',    fmt(ov.endpointCount)),
        prop('Tables',       fmt(ov.tableCount)),
      '</div>'
    ].join('') : '',

    '<div class="ams3-ops-grid">' + cards + '</div>',
    '<div class="ams3-sec-title">Operations Log</div>',
    '<div class="ams3-ops-log">' + logHtml + '</div>'
  ].join('');
}

/* ═══════════════════════════ HELPERS ═══════════════════════════ */

function prop(k, v) {
  if (v == null || v === '') return '';
  return '<div class="ams3-prop"><div class="ams3-prop-k">' + esc(k) + '</div><div class="ams3-prop-v">' + esc(String(v)) + '</div></div>';
}

function selFilter(id, options, current, placeholder) {
  return '<select class="ams3-sel" data-filter="' + id + '">' +
    options.map(function(o) {
      return '<option value="' + esc(o) + '"' + (o === current ? ' selected' : '') + '>' + (o === 'ALL' ? placeholder + ': All' : esc(o)) + '</option>';
    }).join('') +
  '</select>';
}

function uniqueVals(arr, key) {
  var seen = {}, out = [];
  arr.forEach(function(item) { var v = item[key]; if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
  return out;
}

function opsLog(type, msg) {
  var now = new Date().toLocaleTimeString();
  S.opsLog.unshift({ type: type, time: now, msg: msg });
  if (S.opsLog.length > 50) S.opsLog.length = 50;
}

/* ═══════════════════════════ DATA LOADING ═══════════════════════════ */

function loadSummary() {
  if (S.loading) return;
  S.loading = true; S.error = '';
  render();
  _api('admin_metadata_studio_summary', null, 'GET').then(function(d) {
    S.loading = false;
    if (!d || d.ok === false) { S.error = (d && d.error) || 'Server error'; render(); return; }
    S.summary = d;
    S.loaded = true;
    render();
  }).catch(function(err) {
    S.loading = false;
    S.error = String(err);
    render();
  });
}

function loadApiDetail(key) {
  S.detailLoading = true;
  _api('admin_metadata_studio_detail', { type: 'api', key: key }, 'GET').then(function(d) {
    S.detailLoading = false;
    if (d && d.ok !== false) {
      S.apiEditor = d;
      S.testerMethod = (d.item && d.item.method) || 'GET';
      S.testerUrl = 'api/index.php?action=' + encodeURIComponent(d.item && d.item.action ? d.item.action : key);
      S.testerResult = null;
    }
    render();
  }).catch(function() { S.detailLoading = false; render(); });
}

function loadTableDetail(key) {
  S.detailLoading = true;
  _api('admin_metadata_studio_detail', { type: 'table', key: key }, 'GET').then(function(d) {
    S.detailLoading = false;
    if (d && d.ok !== false) S.tableEditor = d;
    S.previewData = null;
    render();
  }).catch(function() { S.detailLoading = false; render(); });
}

function loadVarDetail(key) {
  S.detailLoading = true;
  _api('admin_metadata_studio_detail', { type: 'variable', key: key }, 'GET').then(function(d) {
    S.detailLoading = false;
    if (d && d.ok !== false) S.varEditor = d;
    render();
  }).catch(function() { S.detailLoading = false; render(); });
}

function loadTablePreview(key, page) {
  S.previewLoading = true;
  render();
  _api('schema_studio_table_preview', { table_key: key, page: page || 1, per_page: 25 }, 'POST').then(function(d) {
    S.previewLoading = false;
    if (d && d.ok !== false) {
      S.previewData = d;
      S.previewTotal = d.total || 0;
      S.previewPage = page || 1;
    }
    render();
  }).catch(function() { S.previewLoading = false; render(); });
}

function runApiTest() {
  if (S.testLoading) return;
  S.testLoading = true; S.testerResult = null;
  render();
  var start = Date.now();
  var method = S.testerMethod || 'GET';
  var url = S.testerUrl;
  var opts = { method: method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } };
  if (method !== 'GET') { try { opts.body = S.testerBody || '{}'; } catch(e){} }
  fetch(url, opts).then(function(r) {
    S.testerStatus = r.status;
    S.testerLatency = Date.now() - start;
    return r.json().catch(function(){ return { error: 'Non-JSON response', status: r.status }; });
  }).then(function(data) {
    S.testLoading = false;
    S.testerResult = data;
    render();
  }).catch(function(err) {
    S.testLoading = false;
    S.testerResult = { error: String(err) };
    S.testerStatus = 0;
    render();
  });
}

function runOpsAction(action) {
  var actionMap = {
    'ops-compile':        ['schema_studio_compile_registry',  { design_id: 'workspace' }],
    'ops-reverse':        ['schema_studio_reverse_engineer',  { design_id: 'workspace' }],
    'ops-release':        ['schema_studio_release_bundle',    { design_id: 'workspace' }],
    'ops-quality':        ['schema_studio_quality_report',    { design_id: 'workspace' }],
    'ops-orphans':        ['schema_studio_orphan_resolution', { design_id: 'workspace' }],
    'ops-parity':         ['schema_studio_parity_check',      { design_id: 'workspace' }],
    'ops-export-openapi': ['schema_studio_export_openapi',    { design_id: 'workspace' }],
    'ops-export-postman': ['schema_studio_export_postman',    { design_id: 'workspace' }]
  };
  var cfg = actionMap[action];
  if (!cfg) return;
  opsLog('info', 'Starting: ' + action + '…');
  render();
  _api(cfg[0], cfg[1], 'POST').then(function(d) {
    if (d && d.ok !== false) {
      opsLog('ok', 'Completed: ' + action + (d.message ? ' — ' + d.message : ''));
      if (action === 'ops-compile' || action === 'ops-reverse') loadSummary();
    } else {
      opsLog('err', 'Failed: ' + action + (d && d.error ? ' — ' + d.error : ''));
    }
    render();
  }).catch(function(err) {
    opsLog('err', 'Error: ' + String(err));
    render();
  });
}

/* ═══════════════════════════ EVENTS ═══════════════════════════ */

var _debouncedSearch = debounce(function() { render(); }, 200);

function attachEvents(container) {
  /* Remove old listener via clone trick */
  var root = container.querySelector('.ams3');
  if (!root) return;

  root.addEventListener('click', function(e) {
    var el = e.target;

    /* Tab switching */
    var tabEl = el.closest('[data-tab]');
    if (tabEl) { S.tab = tabEl.dataset.tab; S.selApi = ''; S.selTable = ''; S.apiEditor = null; S.tableEditor = null; render(); return; }

    /* API list select */
    var apiRow = el.closest('[data-api-key]');
    if (apiRow) { S.selApi = apiRow.dataset.apiKey; S.apiDetailTab = 'overview'; S.testerResult = null; loadApiDetail(S.selApi); return; }

    /* DB table select */
    var tableRow = el.closest('[data-table-key]');
    if (tableRow) { S.selTable = tableRow.dataset.tableKey; S.dbDetailTab = 'columns'; S.previewData = null; loadTableDetail(S.selTable); return; }

    /* API detail sub-tab */
    var apiDtab = el.closest('[data-api-dtab]');
    if (apiDtab) { S.apiDetailTab = apiDtab.dataset.apiDtab; render(); return; }

    /* DB detail sub-tab */
    var dbDtab = el.closest('[data-db-dtab]');
    if (dbDtab) { S.dbDetailTab = dbDtab.dataset.dbDtab; render(); return; }

    /* Field Forge API select */
    var fieldApi = el.closest('[data-field-api]');
    if (fieldApi) { S.selApi = fieldApi.dataset.fieldApi; loadApiDetail(S.selApi); return; }

    /* Schema select */
    var schemaEl = el.closest('[data-schema-key]');
    if (schemaEl) { S.selSchema = schemaEl.dataset.schemaKey; render(); return; }

    /* Variable category expand */
    var varCat = el.closest('[data-var-cat]');
    if (varCat) {
      var key = varCat.dataset.varCat;
      if (S.selVar === key) { S.selVar = ''; S.varEditor = null; render(); }
      else { S.selVar = key; loadVarDetail(key); }
      return;
    }

    /* Actions */
    var btn = el.closest('[data-action]');
    if (btn) {
      var act = btn.dataset.action;
      if (act === 'reload')       { loadSummary(); return; }
      if (act === 'compile')      { S.tab = 'ops'; render(); setTimeout(function(){ runOpsAction('ops-compile'); }, 100); return; }
      if (act === 'tester-send')  { runApiTest(); return; }
      if (act === 'tester-copy')  { navigator.clipboard && S.testerResult && navigator.clipboard.writeText(JSON.stringify(S.testerResult, null, 2)); return; }
      if (act === 'tester-toggle-method') {
        var methods = Object.keys(METHOD_CFG);
        var idx = methods.indexOf(S.testerMethod);
        S.testerMethod = methods[(idx + 1) % methods.length];
        render(); return;
      }
      if (act === 'table-preview') { S.dbDetailTab = 'preview'; loadTablePreview(btn.dataset.table || S.selTable, 1); return; }
      if (act === 'preview-prev')  { loadTablePreview(S.selTable, Math.max(1, S.previewPage - 1)); return; }
      if (act === 'preview-next')  { loadTablePreview(S.selTable, S.previewPage + 1); return; }
      if (act === 'export-openapi') { runOpsAction('ops-export-openapi'); return; }
      if (act.startsWith('ops-')) { runOpsAction(act); return; }
    }
  });

  /* Filter inputs */
  root.addEventListener('input', function(e) {
    var el = e.target;
    var filterKey = el.dataset.filter;
    var testerKey = el.dataset.tester;
    if (filterKey && filterKey in S) {
      S[filterKey] = el.value;
      _debouncedSearch();
    }
    if (testerKey === 'url')  { S.testerUrl  = el.value; }
    if (testerKey === 'body') { S.testerBody = el.value; }
  });

  root.addEventListener('change', function(e) {
    var el = e.target;
    var filterKey = el.dataset.filter;
    if (filterKey && filterKey in S) { S[filterKey] = el.value; render(); }
  });

  /* Keyboard shortcut: Escape resets selection */
  root.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      S.selApi = ''; S.selTable = ''; S.apiEditor = null; S.tableEditor = null;
      render();
    }
  });
}

/* ═══════════════════════════ MODULE ENTRY ═══════════════════════════ */

window._renderAdminMetadataStudio = function(container) {
  if (!container) return;
  /* Reset on new container */
  if (S.container !== container) {
    S.container = container;
    S.loaded = false;
    S.summary = null;
    S.selApi = ''; S.selTable = '';
    S.apiEditor = null; S.tableEditor = null;
    S.opsLog = [];
  }
  if (!S.loaded && !S.loading) loadSummary();
  else render();
};

})();
