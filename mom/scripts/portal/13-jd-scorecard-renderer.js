/* ============================================================================
 * JD KPI-Scorecard Renderer — HESEM Portal
 * ----------------------------------------------------------------------------
 * Hydrates the §KPI section of every job-description document with the
 * researched, weighted KPI scorecard from the KPI Authority registry
 * (jd_kpi_scorecards). Each JD shows its own KPIs with weight, threshold
 * (G/Y/R), the dedicated counter-metric and the rationale — instead of the
 * old generic, un-weighted KPI text.
 *
 * The renderer derives the JD from the document filename, fetches
 * /api.php?action=kpi_jd_scorecards, matches the role whose jd_file ends with
 * that filename, and replaces the KPI-section table. On a failed fetch the
 * static table is left intact.
 *
 * Auto-boots on DOMContentLoaded; also exposes window.JdScorecard.render().
 * ========================================================================== */
(function () {
'use strict';

function _appBase() {
  try {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if ((all[i].src || '').indexOf('13-jd-scorecard-renderer.js') >= 0) { s = all[i]; break; }
      }
    }
    if (s && s.src) {
      var m = s.src.match(/^(https?:\/\/[^/]+)?(.*)\/scripts\/portal\/13-jd-scorecard-renderer\.js/);
      if (m) return m[2] || '';
    }
  } catch (e) {}
  return (location.pathname.indexOf('/mom/') === 0) ? '/mom' : '';
}

var APP_BASE = _appBase();
var API_URL = APP_BASE + '/api.php?action=kpi_jd_scorecards';
var UNIT_SUFFIX = { percent: '%', ppm: ' ppm', day: ' ngày', rate: '', ratio: '', count: '', vnd: ' ₫' };

function _esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function _num(x) {
  var n = Number(x);
  if (!isFinite(n)) return String(x);
  return String(parseFloat(n.toFixed(4)));
}
/* G/Y/R display from numeric thresholds — same logic as the KPI Authority. */
function _bands(t) {
  if (!t || t.green_point == null || t.yellow_point == null) return null;
  var suf = UNIT_SUFFIX[t.unit] != null ? UNIT_SUFFIX[t.unit] : '';
  var g = _num(t.green_point), y = _num(t.yellow_point);
  if (t.direction === 'lower_is_better') {
    return { g: '≤ ' + g + suf, y: '>' + g + ' – ≤' + y + suf, r: '> ' + y + suf };
  }
  return { g: '≥ ' + g + suf, y: y + ' – <' + g + suf, r: '< ' + y + suf };
}
var STATUS_SYM = {
  runtime_calculated: ['⚙', 'Tính runtime'],
  manual: ['✎', 'Nhập tay'],
  staged_data_contract: ['○', 'Chờ hợp đồng dữ liệu']
};

function _injectStyle() {
  if (document.getElementById('jd-scorecard-style')) return;
  var css =
    '.jd-scorecard-note{font-size:13px;color:#55617a;margin:0 0 8px}' +
    '.jd-scorecard table{table-layout:fixed;width:100%}' +
    '.jd-scorecard td,.jd-scorecard th{vertical-align:top;overflow-wrap:break-word;' +
      'word-break:break-word}' +
    '.jd-scorecard .jd-sc-kpi{font-weight:600}' +
    '.jd-scorecard .jd-sc-code{display:inline-block;font-family:monospace;font-size:10px;' +
      'background:#f1f3f7;padding:1px 5px;border-radius:5px;overflow-wrap:anywhere}' +
    /* weight cell: % above, full-width thin bar below — no column collision */
    '.jd-sc-wt{display:flex;flex-direction:column;gap:4px;align-items:flex-start}' +
    '.jd-sc-w{font-weight:700;color:#2563eb;font-size:14px;line-height:1}' +
    '.jd-sc-wbar{display:block;width:100%;height:8px;border-radius:999px;background:#e7f0ff;' +
      'overflow:hidden;border:1px solid #d7deea}' +
    '.jd-sc-wfill{display:block;height:100%;background:#2563eb}' +
    '.jd-sc-g{color:#2b8a3e}.jd-sc-y{color:#e67700}.jd-sc-r{color:#c92a2a}' +
    '.jd-sc-sym{cursor:help}';
  var st = document.createElement('style');
  st.id = 'jd-scorecard-style';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
}

/* Build the live scorecard table-card HTML. */
function _render(role) {
  var items = role.scorecard || [];
  var total = 0;
  var rows = items.map(function (it) {
    total += (parseInt(it.weight, 10) || 0);
    var b = _bands(it.thresholds);
    var band = b
      ? '<span class="jd-sc-g">' + _esc(b.g) + '</span> · <span class="jd-sc-y">' + _esc(b.y) +
        '</span> · <span class="jd-sc-r">' + _esc(b.r) + '</span>'
      : '<span style="color:#7a869a">—</span>';
    var sym = STATUS_SYM[it.calculation_status] || STATUS_SYM.staged_data_contract;
    var w = parseInt(it.weight, 10) || 0;
    return '<tr>' +
      '<td><span class="jd-sc-kpi">' + _esc(it.name_vi || it.kpi_code) + '</span><br>' +
        '<span class="jd-sc-code">' + _esc(it.kpi_code) + '</span> ' +
        '<span class="jd-sc-sym" title="' + _esc(sym[1]) + '">' + sym[0] + '</span></td>' +
      '<td><div class="jd-sc-wt"><span class="jd-sc-w">' + w + '%</span>' +
        '<span class="jd-sc-wbar"><span class="jd-sc-wfill" style="width:' + w + '%"></span>' +
        '</span></div></td>' +
      '<td>' + band + '</td>' +
      '<td><span class="jd-sc-code">' + _esc(it.counter_code || '—') + '</span></td>' +
      '<td>' + _esc(it.rationale || '') + '</td>' +
    '</tr>';
  }).join('');
  return '<p class="jd-scorecard-note">Thẻ điểm KPI có trọng số cho chức danh ' +
      '<b>' + _esc(role.jd_title_vi || role.role_code) + '</b> — đồng bộ trực tiếp từ ' +
      'KPI Authority (tổng trọng số ' + total + '%). Mỗi KPI có ngưỡng G/Y/R và ' +
      'counter-metric chống gaming riêng.</p>' +
    '<div class="table-card jd-scorecard"><table class="table">' +
      '<colgroup><col style="width:30%"><col style="width:11%"><col style="width:19%">' +
      '<col style="width:19%"><col style="width:21%"></colgroup>' +
      '<thead><tr><th>KPI trọng yếu</th><th>Trọng số</th><th>Ngưỡng G/Y/R</th>' +
      '<th>Counter-metric</th><th>Vì sao đo vị trí này</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
}

/* Universal rule for every JD document (all 39, regardless of the §KPI
 * section's internal markup):
 *   1. find the §KPI heading — text contains "KPI" (both wordings:
 *      "8. KPI cá nhân" and "8. … (KPI) cá nhân");
 *   2. remove EVERY sibling element after it up to the next heading —
 *      the old intro paragraph + old table, whatever they were;
 *   3. insert the live registry scorecard right after the heading.
 * This makes the result identical on every JD and never duplicates the
 * old static table. */
function _hydrate(role) {
  _injectStyle();
  // The §KPI section appears under several heading wordings across the 39
  // JDs — "KPI cá nhân", "… (KPI) cá nhân", "Chỉ số đánh giá hiệu quả công
  // việc", "Chỉ số đánh giá kết quả". The stable stem is "chỉ số đánh giá"
  // (or the word "KPI"). Match either, lower-cased — diacritic-safe.
  var heads = document.querySelectorAll('h1,h2,h3,h4');
  var heading = null, generic = null;
  for (var i = 0; i < heads.length; i++) {
    var low = (heads[i].textContent || '').trim().toLowerCase();
    var isKpi = low.indexOf('kpi') >= 0 || low.indexOf('chỉ số đánh giá') >= 0;
    if (!isKpi) continue;
    if (low.indexOf('cá nhân') >= 0) { heading = heads[i]; break; }
    if (!generic) generic = heads[i];
  }
  heading = heading || generic;
  var html = _render(role);
  if (!heading) {
    var body = document.querySelector('.page-body') || document.body;
    body.insertAdjacentHTML('beforeend', '<h2 class="h2">KPI cá nhân</h2>' + html);
    return;
  }
  var node = heading.nextElementSibling;
  while (node && !/^H[1-4]$/.test(node.tagName)) {
    var next = node.nextElementSibling;
    node.parentNode.removeChild(node);
    node = next;
  }
  heading.insertAdjacentHTML('afterend', html);
}

function render() {
  var file = (location.pathname.split('/').pop() || '').toLowerCase();
  if (file.indexOf('jd-') !== 0) return;
  fetch(API_URL, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      var roles = data && (data.roles || (data.data && data.data.roles)) || null;
      if (!roles) return;
      var match = null;
      for (var rc in roles) {
        if (!Object.prototype.hasOwnProperty.call(roles, rc)) continue;
        var jf = String(roles[rc].jd_file || '').toLowerCase();
        if (jf && jf.split('/').pop() === file) { match = roles[rc]; break; }
      }
      if (match && match.scorecard && match.scorecard.length) _hydrate(match);
    })
    .catch(function () { /* offline — static KPI text stays */ });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}
window.JdScorecard = { render: render, apiUrl: API_URL };

})();
