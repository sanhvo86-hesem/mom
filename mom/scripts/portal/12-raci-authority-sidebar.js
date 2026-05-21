/* ============================================================================
 * RACI / Authority Sidebar — HESEM Portal
 * ----------------------------------------------------------------------------
 * Renders a collapsible side panel on controlled SOP and JD documents showing
 * the RACI assignments and authority thresholds ("ngưỡng trách nhiệm") relevant
 * to the current document.
 *
 * Single-source-of-truth model — NOTHING is duplicated:
 *   - RACI (A/R/C/I per CDR/gate) is read live from ANNEX-121 §5 gate matrix.
 *   - Authority thresholds (L1/L2/L3 + escalation) are read live from the
 *     ANNEX-120 decision register.
 * Both are fetched and parsed in the browser at open time, so the panel can
 * never drift from the SSOT — it IS the SSOT, projected.
 *
 * Loaded automatically by 11-dcc-header-renderer.js on every controlled doc.
 * Exposes window.RaciSidebar.
 *
 * @since 4.2.0
 * ========================================================================== */
(function(){
'use strict';

var WIDGET_VERSION = '2026-05-21-1';
var ROLE_COLS = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR/IT'];
/* RACI source docs — never render the sidebar on the matrices themselves. */
var SOURCE_DOCS = { 'ANNEX-120':1, 'ANNEX-121':1, 'RACI-MASTER-MATRIX':1, 'AUTHORITY-MATRIX':1 };

/* ── Self-discovery of deployment base (mirrors the DCC renderer) ───────── */
var _scriptUrl = (function(){
    try { if (document.currentScript && document.currentScript.src) return document.currentScript.src; } catch(e){}
    try {
        var l = document.querySelectorAll('script[src*="12-raci-authority-sidebar.js"]');
        if (l.length) return l[l.length-1].src;
    } catch(e){}
    return '';
})();
function _appBase(){
    var m = _scriptUrl.match(/^(.*?)\/scripts\/portal\/12-raci-authority-sidebar\.js/);
    if (m && m[1]) {
        try { return new URL(m[1]).pathname.replace(/\/$/,''); }
        catch(e){ return m[1].replace(/^https?:\/\/[^/]+/,'').replace(/\/$/,''); }
    }
    return '';
}
var APP_BASE = _appBase();

/* ── Document-root resolution from the current URL ──────────────────────── */
function _docRoot(){
    var p = (window.location && window.location.pathname) || '';
    var i = p.indexOf('/docs/');
    if (i >= 0) return p.slice(0, i) + '/docs/';
    return APP_BASE + '/docs/';
}
function _annexUrl(name){
    return _docRoot() + 'operations/references/01-ANNEX-100/'
         + '12-ANNEX-120-Authority-KPI-and-Deputy-Control/' + name;
}

/* ── Current document identity ──────────────────────────────────────────── */
function _docInfo(){
    var path = (window.location && window.location.pathname) || '';
    var base = (path.split('/').pop() || '').replace(/\.[^.]+$/, '').toLowerCase();
    var info = { base: base, code: '', type: 'OTHER' };
    var m;
    if ((m = base.match(/^(sop-\d{3})/)))      { info.code = m[1].toUpperCase(); info.type = 'SOP'; }
    else if ((m = base.match(/^(annex-\d{3})/))){ info.code = m[1].toUpperCase(); info.type = 'ANNEX'; }
    else if (/^jd-/.test(base))                { info.code = base.toUpperCase(); info.type = 'JD'; }
    return info;
}

/* ── Network ────────────────────────────────────────────────────────────── */
function _fetchDoc(url){
    return fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'text/html' } })
        .then(function(res){
            if (!res.ok) throw new Error('raci_fetch_' + res.status + '_' + url);
            return res.text();
        })
        .then(function(html){ return new DOMParser().parseFromString(html, 'text/html'); });
}

/* ── Parse ANNEX-121 §5 gate matrix ─────────────────────────────────────── */
function _parseGateMatrix(doc){
    var tables = doc.querySelectorAll('table');
    var gate = null;
    for (var t = 0; t < tables.length; t++) {
        var head = tables[t].querySelector('thead');
        if (!head) continue;
        var h = head.textContent || '';
        if (h.indexOf('CDR') >= 0 && h.indexOf('WKM') >= 0 && h.indexOf('EHS') >= 0
            && h.indexOf('CEO') >= 0) { gate = tables[t]; break; }
    }
    if (!gate) return [];
    var rows = gate.querySelectorAll('tbody > tr');
    var out = [];
    for (var r = 0; r < rows.length; r++) {
        var tds = rows[r].children;
        if (tds.length !== 15) continue;
        var roles = {};
        for (var c = 0; c < ROLE_COLS.length; c++) {
            var v = (tds[c + 3].textContent || '').trim().toUpperCase();
            if (v === 'A' || v === 'R' || v === 'C' || v === 'I') roles[ROLE_COLS[c]] = v;
        }
        out.push({
            gate: (tds[0].textContent || '').trim(),
            cdr: (tds[1].textContent || '').trim(),
            activity: (tds[2].textContent || '').trim(),
            roles: roles,
            evidence: (tds[14].textContent || '').trim().toUpperCase()
        });
    }
    return out;
}

/* ── Parse ANNEX-120 decision register: cdr -> thresholds ───────────────── */
function _parseThresholds(doc){
    var map = {};
    var trs = doc.querySelectorAll('tr[id^="cdr-"]');
    for (var i = 0; i < trs.length; i++) {
        var code = trs[i].id.slice(4).toUpperCase();
        var tds = trs[i].children;
        if (tds.length < 9) continue;
        map[code] = {
            l1: (tds[3].textContent || '').trim(),
            l2: (tds[4].textContent || '').trim(),
            l3: (tds[5].textContent || '').trim(),
            escalation: (tds[8].textContent || '').trim()
        };
    }
    return map;
}

/* ── Parse ANNEX-121 support-function supplement (MNT / FIN) ────────────── */
function _parseSupplement(doc){
    var tables = doc.querySelectorAll('table');
    var sup = null;
    for (var t = 0; t < tables.length; t++) {
        var head = tables[t].querySelector('thead');
        if (!head) continue;
        var h = head.textContent || '';
        if (h.indexOf('Vai trò hỗ trợ') >= 0 && h.indexOf('Lý do tham gia') >= 0) {
            sup = tables[t]; break;
        }
    }
    if (!sup) return [];
    var rows = sup.querySelectorAll('tbody > tr');
    var out = [];
    for (var r = 0; r < rows.length; r++) {
        var tds = rows[r].children;
        if (tds.length < 5) continue;
        out.push({
            gate: (tds[0].textContent || '').trim(),
            cdr: (tds[1].textContent || '').trim(),
            activity: (tds[2].textContent || '').trim(),
            role: (tds[3].textContent || '').trim().toUpperCase(),
            letter: (tds[4].textContent || '').trim().toUpperCase()
        });
    }
    return out;
}

/* ── Detect the role code of the current JD page ────────────────────────── */
function _currentJdRole(){
    var ths = document.querySelectorAll('th');
    for (var i = 0; i < ths.length; i++) {
        if (/Mã vai trò/i.test(ths[i].textContent || '')) {
            var td = ths[i].nextElementSibling;
            if (td) {
                var rc = td.querySelector('.role-code, .entity-code');
                var txt = ((rc && rc.textContent) || td.textContent || '').trim().toUpperCase();
                txt = txt.split(/[\s/[\]]+/)[0];
                if (txt) return txt;
            }
        }
    }
    return '';
}

/* ── Relevance filter ───────────────────────────────────────────────────── */
function _relevantRows(info, gateRows, suppRows){
    if (info.type === 'SOP') {
        return gateRows.filter(function(row){ return row.evidence.indexOf(info.code) >= 0; });
    }
    if (info.type === 'JD') {
        var role = _currentJdRole();
        if (!role) return [];
        // map common JD sub-roles onto core RACI columns
        var ALIAS = { ENGM:'ENG', PE:'ENG', CAM:'ENG', DFM:'ENG', BUY:'SCM', XNK:'SCM',
                      ITA:'HR/IT', ESA:'HR/IT', QCL:'QA', QC:'QA', QE:'QA',
                      SL:'WKM', SET:'WKM', OPR:'WKM' };
        var col = ALIAS[role] || role;
        var main = gateRows.filter(function(row){ return !!row.roles[col]; }).map(function(row){
            row.__highlight = col; return row;
        });
        if (main.length) return main;
        // role absent from the core columns (MNT/FIN) → project the support supplement
        return (suppRows || []).filter(function(s){ return s.role === role; }).map(function(s){
            var roles = {}; roles[s.role] = s.letter;
            return { gate: s.gate, cdr: s.cdr, activity: s.activity,
                     roles: roles, __highlight: s.role };
        });
    }
    return [];
}

/* ── DOM helpers ────────────────────────────────────────────────────────── */
function _el(tag, cls, text){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
}

function _raciLine(label, roles){
    if (!roles.length) return null;
    var line = _el('div', 'raci-sb-line');
    line.appendChild(_el('span', 'raci-sb-tag raci-sb-tag--' + label.toLowerCase(), label));
    line.appendChild(_el('span', 'raci-sb-roles', roles.join(', ')));
    return line;
}

function _card(row, thr){
    var card = _el('div', 'raci-sb-card');
    var head = _el('div', 'raci-sb-card__head');
    head.appendChild(_el('span', 'raci-sb-gate', row.gate));
    head.appendChild(_el('span', 'raci-sb-cdr', row.cdr));
    card.appendChild(head);
    card.appendChild(_el('div', 'raci-sb-activity', row.activity));

    var byLetter = { A: [], R: [], C: [], I: [] };
    Object.keys(row.roles).forEach(function(role){
        var mark = role + (row.__highlight === role ? ' ◀' : '');
        byLetter[row.roles[role]].push(mark);
    });
    ['A','R','C','I'].forEach(function(L){
        var ln = _raciLine(L, byLetter[L]);
        if (ln) card.appendChild(ln);
    });

    if (thr) {
        var th = _el('div', 'raci-sb-thr');
        th.appendChild(_el('div', 'raci-sb-thr__title', 'Ngưỡng thẩm quyền'));
        if (thr.l1) th.appendChild(_thrRow('L1', thr.l1));
        if (thr.l2) th.appendChild(_thrRow('L2', thr.l2));
        if (thr.l3) th.appendChild(_thrRow('L3', thr.l3));
        if (thr.escalation) {
            var esc = _el('div', 'raci-sb-thr__esc');
            esc.appendChild(_el('span', 'raci-sb-tag raci-sb-tag--esc', 'Leo thang'));
            esc.appendChild(_el('span', null, thr.escalation));
            th.appendChild(esc);
        }
        card.appendChild(th);
    }

    var links = _el('div', 'raci-sb-links');
    links.appendChild(_link(_annexUrl('annex-120-authority-matrix.html') + '#cdr-' + row.cdr,
                            'ANNEX-120 · ' + row.cdr));
    links.appendChild(_link(_annexUrl('annex-121-raci-master-matrix.html') + '#r5gate',
                            'ANNEX-121 §5'));
    card.appendChild(links);
    return card;
}
function _thrRow(tag, text){
    var row = _el('div', 'raci-sb-thr__row');
    row.appendChild(_el('span', 'raci-sb-lvl', tag));
    row.appendChild(_el('span', null, text));
    return row;
}
function _link(href, text){
    var a = _el('a', 'raci-sb-link', text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
}

/* ── Stylesheet ─────────────────────────────────────────────────────────── */
function _injectCss(){
    if (document.querySelector('link[data-raci-sidebar-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = APP_BASE + '/styles/raci-sidebar.css?v=' + WIDGET_VERSION;
    link.setAttribute('data-raci-sidebar-css', '1');
    (document.head || document.documentElement).appendChild(link);
}

/* ── Panel state ────────────────────────────────────────────────────────── */
var _loaded = false;
var _loading = false;

function _setBody(panel, node){
    var body = panel.querySelector('.raci-sb-panel__body');
    while (body.firstChild) body.removeChild(body.firstChild);
    body.appendChild(node);
}

function _populate(panel, info){
    if (_loaded || _loading) return;
    _loading = true;
    _setBody(panel, _el('div', 'raci-sb-msg', 'Đang tải RACI từ ANNEX-121…'));
    Promise.all([
        _fetchDoc(_annexUrl('annex-121-raci-master-matrix.html')),
        _fetchDoc(_annexUrl('annex-120-authority-matrix.html'))
    ]).then(function(docs){
        var gateRows = _parseGateMatrix(docs[0]);
        var suppRows = _parseSupplement(docs[0]);
        var thresholds = _parseThresholds(docs[1]);
        var rows = _relevantRows(info, gateRows, suppRows);
        var frag = document.createDocumentFragment();
        if (!rows.length) {
            var msg = _el('div', 'raci-sb-msg',
                info.type === 'JD'
                    ? 'Không xác định được vai trò RACI từ trang JD này. Tra trực tiếp tại ANNEX-121 §5.'
                    : 'Không có mã CDR nào trỏ trực tiếp về tài liệu này. Tra ANNEX-121 §5.');
            frag.appendChild(msg);
            frag.appendChild(_link(_annexUrl('annex-121-raci-master-matrix.html') + '#r5gate',
                                   'Mở ANNEX-121 §5'));
        } else {
            rows.sort(function(a,b){ return a.gate < b.gate ? -1 : a.gate > b.gate ? 1 : 0; });
            for (var i = 0; i < rows.length; i++) {
                frag.appendChild(_card(rows[i], thresholds[rows[i].cdr]));
            }
        }
        _setBody(panel, frag);
        _loaded = true;
        _loading = false;
    }).catch(function(err){
        _loading = false;
        var box = _el('div', 'raci-sb-msg raci-sb-msg--err',
                      'Không tải được RACI: ' + (err && err.message || 'lỗi không rõ'));
        _setBody(panel, box);
        try { console.warn('[RaciSidebar]', err); } catch(e){}
    });
}

/* ── Build the launcher + panel ─────────────────────────────────────────── */
function _build(info){
    _injectCss();

    var launcher = _el('button', 'raci-sb-launcher');
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Thẩm quyền & RACI');
    launcher.appendChild(_el('span', 'raci-sb-launcher__txt', 'Thẩm quyền & RACI'));

    var scrim = _el('div', 'raci-sb-scrim');

    var panel = _el('aside', 'raci-sb-panel');
    panel.setAttribute('aria-hidden', 'true');
    var head = _el('div', 'raci-sb-panel__head');
    head.appendChild(_el('div', 'raci-sb-panel__title', 'Thẩm quyền & RACI'));
    var close = _el('button', 'raci-sb-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng');
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(_el('div', 'raci-sb-panel__sub',
        info.code + ' — nguồn: ANNEX-121 (RACI) + ANNEX-120 (ngưỡng)'));
    panel.appendChild(_el('div', 'raci-sb-panel__body'));
    var foot = _el('div', 'raci-sb-panel__foot',
        'Bảng phái sinh đọc trực tiếp từ SSOT — không chỉnh sửa tại đây.');
    panel.appendChild(foot);

    function open(){
        panel.classList.add('is-open');
        scrim.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        _populate(panel, info);
    }
    function shut(){
        panel.classList.remove('is-open');
        scrim.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
    }
    launcher.addEventListener('click', open);
    close.addEventListener('click', shut);
    scrim.addEventListener('click', shut);
    document.addEventListener('keydown', function(e){
        if (e.key === 'Escape' && panel.classList.contains('is-open')) shut();
    });

    var host = document.body || document.documentElement;
    host.appendChild(scrim);
    host.appendChild(panel);
    host.appendChild(launcher);
    return { open: open, close: shut };
}

/* ── Boot ───────────────────────────────────────────────────────────────── */
var _api = { built: false };
function boot(){
    try {
        var info = _docInfo();
        if (info.type !== 'SOP' && info.type !== 'JD') return;       // v1: SOP + JD only
        if (SOURCE_DOCS[info.code]) return;                          // never on the matrices
        if (document.querySelector('.raci-sb-launcher')) return;     // idempotent
        var ctl = _build(info);
        _api.built = true;
        _api.open = ctl.open;
        _api.close = ctl.close;
    } catch(e){
        try { console.warn('[RaciSidebar] boot failed', e); } catch(_){}
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

window.RaciSidebar = _api;
})();
