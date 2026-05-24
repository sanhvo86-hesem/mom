/* ============================================================================
 * JD KPI-Scorecard Renderer — HESEM Portal
 * ----------------------------------------------------------------------------
 * Hydrates the §KPI section of every job-description document with the
 * researched, weighted role scorecard from the KPI Authority registry
 * (jd_kpi_scorecards). Each JD shows active measures, candidate/rotation
 * banks, evidence, controllability, attribution, blockers and lifecycle —
 * instead of the old generic, un-weighted KPI text.
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
  manual_governed: ['✎', 'Nhập tay có kiểm soát'],
  staged_data_contract: ['○', 'Chờ hợp đồng dữ liệu'],
  retired: ['⊘', 'Đã ngừng dùng']
};

function _injectStyle() {
  if (document.getElementById('jd-scorecard-style')) return;
  var css =
    '.jd-scorecard-note{font-size:13px;color:var(--text-2);margin:0 0 8px}' +
    '.jd-scorecard table{table-layout:fixed;width:100%}' +
    '.jd-scorecard td,.jd-scorecard th{vertical-align:top;overflow-wrap:break-word;' +
      'word-break:break-word}' +
    '.jd-scorecard .jd-sc-kpi{font-weight:600}' +
    '.jd-scorecard .jd-sc-code{display:inline-block;font-family:monospace;font-size:10px;' +
      'background:var(--surface-2);padding:1px 5px;border-radius:5px;overflow-wrap:anywhere}' +
    '.jd-scorecard .jd-sc-tag{display:inline-block;font-size:11px;border:1px solid var(--border);' +
      'border-radius:5px;padding:1px 6px;margin:0 4px 4px 0;background:var(--surface-2)}' +
    '.jd-scorecard .jd-sc-detail{margin-top:5px}.jd-scorecard .jd-sc-detail summary{cursor:pointer;' +
      'font-size:12px;color:var(--text-2)}' +
    /* weight cell: % above, full-width thin bar below — no column collision */
    '.jd-sc-wt{display:flex;flex-direction:column;gap:4px;align-items:flex-start}' +
    '.jd-sc-w{font-weight:700;color:var(--accent);font-size:14px;line-height:1}' +
    '.jd-sc-wbar{display:block;width:100%;height:8px;border-radius:999px;background:var(--accent-soft);' +
      'overflow:hidden;border:1px solid var(--border)}' +
    '.jd-sc-wfill{display:block;height:100%;background:var(--accent)}' +
    '.jd-sc-g{color:var(--success)}.jd-sc-y{color:var(--warning)}.jd-sc-r{color:var(--danger)}' +
    '.jd-sc-muted{color:var(--text-3)}.jd-sc-sym{cursor:help}.jd-scorecard-bank{margin-top:8px}' +
    '.jd-scorecard-warning{border:1px solid var(--warning);background:var(--warning-soft);' +
      'padding:8px;border-radius:6px;margin:8px 0;font-size:13px}' +
    '.jd-scorecard-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:8px 0}' +
    '.jd-scorecard-meta div{border:1px solid var(--border);border-radius:6px;padding:8px;background:var(--surface-1)}';
  var st = document.createElement('style');
  st.id = 'jd-scorecard-style';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
}

function _list(values) {
  if (!values || !values.length) return '<span class="jd-sc-muted">—</span>';
  return values.slice(0, 8).map(function (v) {
    if (v && typeof v === 'object') {
      return '<span class="jd-sc-tag"><span class="jd-sc-code">' + _esc(v.code || v.kpi_code || '') +
        '</span> ' + _esc(v.description || v.reason || '') + '</span>';
    }
    return '<span class="jd-sc-tag">' + _esc(v) + '</span>';
  }).join(' ');
}

function _textDetail(label, value) {
  if (!value) return '';
  return '<details class="jd-sc-detail"><summary>' + _esc(label) + '</summary><div>' +
    _esc(value) + '</div></details>';
}

/* Build the live scorecard table-card HTML. */
function _render(role) {
  var items = role.active_scorecard || role.scorecard || [];
  var candidate = role.candidate_bank || [];
  var optional = role.optional_rotate || [];
  var doNotUse = role.do_not_use || [];
  var blockers = role.role_blockers || [];
  var total = 0;
  var rows = items.map(function (it) {
    total += (parseInt(it.weight, 10) || 0);
    var b = _bands(it.thresholds);
    var band = b
      ? '<span class="jd-sc-g">' + _esc(b.g) + '</span> · <span class="jd-sc-y">' + _esc(b.y) +
        '</span> · <span class="jd-sc-r">' + _esc(b.r) + '</span>'
      : '<span class="jd-sc-muted">—</span>';
    var sym = STATUS_SYM[it.calculation_status] || STATUS_SYM.staged_data_contract;
    var w = parseInt(it.weight, 10) || 0;
    var lifecycle = it.lifecycle_status || it.scorecard_scoring_status || it.calculation_status || '—';
    var evidence = it.evidence_source || '—';
    var control = it.controllability_scope || it.owner_control_boundary || '—';
    var action = it.action_when_red || '—';
    var target = it.target_definition || band;
    var checklist = it.formula_or_checklist || '';
    var attr = it.attribution_rule || '';
    var itemBlockers = it.blocking_conditions || [];
    return '<tr>' +
      '<td><span class="jd-sc-kpi">' + _esc(it.measure_name_vi || it.name_vi || it.kpi_code) + '</span><br>' +
        '<span class="jd-sc-code">' + _esc(it.role_measure_code || it.kpi_code) + '</span> ' +
        '<span class="jd-sc-code">' + _esc(it.kpi_code) + '</span> ' +
        '<span class="jd-sc-sym" title="' + _esc(sym[1]) + '">' + sym[0] + '</span></td>' +
      '<td><div class="jd-sc-wt"><span class="jd-sc-w">' + w + '%</span>' +
        '<span class="jd-sc-wbar"><span class="jd-sc-wfill" style="width:' + w + '%"></span>' +
        '</span><span class="jd-sc-tag">' + _esc(lifecycle) + '</span></div></td>' +
      '<td><b>Bằng chứng</b><br>' + _esc(evidence) +
        _textDetail('Target / checklist', target + (checklist ? ' | ' + checklist : '')) + '</td>' +
      '<td><b>Phạm vi kiểm soát</b><br>' + _esc(control) +
        _textDetail('Hành động khi đỏ', action) + _textDetail('Quy tắc quy trách nhiệm', attr) + '</td>' +
      '<td><span class="jd-sc-code">' + _esc(it.counter_code || '—') + '</span><br>' +
        '<span class="jd-sc-muted">' + _esc(it.counter_status || '') + '</span>' +
        _textDetail('Blocker', itemBlockers.join(', ')) + '</td>' +
    '</tr>';
  }).join('');
  var warning = 'Thẻ điểm vai trò chỉ dùng cho coaching, OJT, đánh giá năng lực và review đã hiệu chuẩn; không tự động tạo thưởng, payout hoặc kỷ luật.';
  var meta = '<div class="jd-scorecard-meta">' +
    '<div><b>Nhóm candidate</b><br>' + _list(candidate) + '</div>' +
    '<div><b>Nhóm xoay vòng tùy chọn</b><br>' + _list(optional) + '</div>' +
    '<div><b>Không được dùng</b><br>' + _list(doNotUse) + '</div>' +
    '<div><b>Blocker theo vai trò</b><br>' + _list(blockers) + '</div>' +
    '</div>';
  return '<p class="jd-scorecard-note">Thẻ điểm KPI đang áp dụng cho chức danh ' +
      '<b>' + _esc(role.jd_title_vi || role.role_code) + '</b> — đồng bộ trực tiếp từ ' +
      'KPI Authority (đang áp dụng ' + _esc(role.active_measure_count || items.length) + '/' +
      _esc(role.recommended_active_count || items.length) + ', tổng trọng số ' + total + '%).</p>' +
    '<div class="jd-scorecard-warning">' + _esc(warning) + '</div>' +
    meta +
    '<div class="table-card jd-scorecard"><table class="table">' +
      '<colgroup><col style="width:24%"><col style="width:10%"><col style="width:23%">' +
      '<col style="width:27%"><col style="width:16%"></colgroup>' +
      '<thead><tr><th>Role measure đang áp dụng</th><th>Trọng số / lifecycle</th><th>Bằng chứng / target</th>' +
      '<th>Phạm vi kiểm soát / hành động</th><th>Counter / blocker</th></tr></thead>' +
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
      var items = match && (match.active_scorecard || match.scorecard);
      if (items && items.length) _hydrate(match);
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
