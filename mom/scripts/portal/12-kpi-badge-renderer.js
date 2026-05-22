/* ============================================================================
 * KPI RAG-Badge Renderer — HESEM Portal
 * ----------------------------------------------------------------------------
 * Hydrates the xanh/vàng/đỏ (green/yellow/red) threshold badge boxes embedded
 * in controlled documents (ANNEX-122 §4/§5/§6 KPI cascade tables) LIVE from
 * the KPI Authority registry, so the bands always reflect the system — never
 * a value hardcoded into the document.
 *
 * A reader can tell at a glance:
 *   • box carries the "🔗 Authority" marker  → KPI is bound to the registry
 *   • threshold cell with no badge box       → KPI is hardcoded / ungoverned
 *
 * Each badge box is emitted by KpiRegistryAdminService::renderGovernanceRow as
 *   <div class="kpi-rag-badge" data-kpi-rag="authority" data-kpi-code="OTD">…</div>
 * This renderer fetches /api.php?action=kpi_threshold_badges once, recomputes
 * the RAG display strings from the registry's numeric thresholds, and rebuilds
 * each box. On a failed fetch (offline / not authenticated) the statically
 * generated bands are left intact — they were correct at generation time.
 *
 * Auto-boots on DOMContentLoaded; also exposes window.KpiBadges.render().
 *
 * @exposes window.KpiBadges
 * ========================================================================== */
(function () {
'use strict';

/* ── App base — mirrors the DCC renderer so the API URL resolves whether the
 * document is served directly, via the portal, or through doc_stream. ─────── */
function _appBase() {
  try {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if ((all[i].src || '').indexOf('12-kpi-badge-renderer.js') >= 0) { s = all[i]; break; }
      }
    }
    if (s && s.src) {
      var m = s.src.match(/^(https?:\/\/[^/]+)?(.*)\/scripts\/portal\/12-kpi-badge-renderer\.js/);
      if (m) return m[2] || '';
    }
  } catch (e) {}
  return (location.pathname.indexOf('/mom/') === 0) ? '/mom' : '';
}

var APP_BASE = _appBase();
var API_URL = APP_BASE + '/api.php?action=kpi_threshold_badges';

var UNIT_SUFFIX = {
  percent: '%', ppm: ' ppm', day: ' ngày', rate: '', ratio: '', count: '', vnd: ' ₫'
};

/* Trim trailing zeros the way PHP's %g does (95.0 → "95", 99.5 → "99.5"). */
function _num(x) {
  var n = Number(x);
  if (!isFinite(n)) return String(x);
  return String(parseFloat(n.toFixed(4)));
}

/* Derive (green, yellow, red) display strings from numeric thresholds —
 * byte-compatible with KpiRegistryAdminService::thresholdDisplay and the
 * Console's _ragBands so every surface shows the same bands. */
function _bands(b) {
  var suf = UNIT_SUFFIX[b.unit] != null ? UNIT_SUFFIX[b.unit] : '';
  var g = _num(b.green_point), y = _num(b.yellow_point);
  if (b.direction === 'lower_is_better') {
    return { green: '≤ ' + g + suf, yellow: '>' + g + ' – ≤' + y + suf, red: '> ' + y + suf };
  }
  return { green: '≥ ' + g + suf, yellow: y + ' – <' + g + suf, red: '< ' + y + suf };
}

function _esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _injectStyle() {
  if (document.getElementById('kpi-rag-badge-style')) return;
  var css =
    /* the G/Y/R box sits on its own line; the Căn cứ note drops below it */
    '.kpi-rag-badge{display:flex;flex-direction:column;gap:3px;align-items:flex-start;' +
      'width:fit-content;border:1px dashed #2b8a3e;border-radius:8px;' +
      'padding:5px 7px;background:#ebfbee;margin-bottom:4px}' +
    '.kpi-rag-badge[data-kpi-rag-state="unlinked"]{border-color:#e67700;background:#fff9db}' +
    '.kpi-rag-badge .kpi-good,.kpi-rag-badge .kpi-warn,.kpi-rag-badge .kpi-bad{' +
      'padding:1px 5px;border-radius:4px;white-space:nowrap}' +
    '.kpi-rag-mark{font-size:9px;font-weight:700;letter-spacing:.2px;color:#2b8a3e;margin-top:1px}' +
    '.kpi-rag-mark--off{color:#e67700}';
  var st = document.createElement('style');
  st.id = 'kpi-rag-badge-style';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
}

/* Rebuild one badge box from a live registry record (or flag it unlinked). */
function _paint(box, rec) {
  if (!rec) {
    box.setAttribute('data-kpi-rag-state', 'unlinked');
    if (!box.querySelector('.kpi-rag-mark')) {
      var warn = document.createElement('span');
      warn.className = 'kpi-rag-mark kpi-rag-mark--off';
      warn.textContent = '⚠ Chưa liên kết Authority';
      warn.title = 'Mã KPI này không có trong KPI Authority — ngưỡng đang hardcode trong tài liệu.';
      box.appendChild(warn);
    }
    return;
  }
  var rag = _bands(rec);
  var retired = rec.retired ? ' · KPI đã ngừng dùng' : '';
  box.setAttribute('data-kpi-rag-state', 'linked');
  box.innerHTML =
    '<span class="kpi-good">G ' + _esc(rag.green) + '</span>' +
    '<span class="kpi-warn">Y ' + _esc(rag.yellow) + '</span>' +
    '<span class="kpi-bad">R ' + _esc(rag.red) + '</span>' +
    '<span class="kpi-rag-mark" title="Ngưỡng đồng bộ trực tiếp từ KPI Authority registry' +
      ' (mã ' + _esc(rec.code) + ')' + _esc(retired) + '">🔗 Authority KPI</span>';
}

function render(root) {
  root = root || document;
  var boxes = root.querySelectorAll('.kpi-rag-badge[data-kpi-code]');
  if (!boxes.length) return;
  _injectStyle();

  var opts = { credentials: 'same-origin', headers: { 'Accept': 'application/json' } };
  fetch(API_URL, opts)
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      var badges = (data && (data.badges || (data.data && data.data.badges))) || null;
      if (!badges) return;  // not authenticated / unavailable — keep static bands
      for (var i = 0; i < boxes.length; i++) {
        var code = (boxes[i].getAttribute('data-kpi-code') || '').toUpperCase();
        _paint(boxes[i], badges[code] || null);
      }
    })
    .catch(function () { /* offline — static bands remain valid */ });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { render(document); });
} else {
  render(document);
}

window.KpiBadges = { render: render, apiUrl: API_URL };

})();
