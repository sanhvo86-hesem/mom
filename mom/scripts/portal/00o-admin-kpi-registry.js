/* ===================================================================
   00o-admin-kpi-registry.js
   Admin: KPI Console — governed editor for the KPI authority registry.
   Dashboard landing + grouped views:
     • KPI công ty / value-stream / phòng ban  — editable governance KPIs
     • Gate metric / Proposed                  — read-only reference
   Editing is field-structured (no raw JSON): thresholds, owner, data
   steward, cadence, decision/action, counter-metric. Saving writes the
   runtime overlay and regenerates the §4/§5/§6 regions of ANNEX-122.
   Mirrors the RACI Console (00n-admin-raci-matrix.js).
   =================================================================== */

(function(){
'use strict';

var _el = null;
var _lang = 'vi';

/* Tier display labels — tier is a filter chip in the library-only console. */
var TIER_VI = {
  company:'Cấp công ty', value_stream:'Value-stream', department:'Phòng ban',
  position:'Cấp vị trí'
};

var _state = {
  loading:false, saving:false, error:'', message:'',
  config:null,
  /* overrides keyed by section then code */
  overrides:{ governance:{}, gate:{}, proposed:{} },
  /* Console-added KPIs already persisted in the overlay (re-sent verbatim
     on every save) + new drafts created this session, keyed by group. */
  addedSeed:{ governance:[], gate:[], proposed:[] },
  addedDraft:{ governance:[], gate:[], proposed:[] },
  /* retired codes (editable) + the loaded baseline for the dirty check */
  retired:{ governance:[], gate:[], proposed:[] },
  retiredBaseline:{ governance:[], gate:[], proposed:[] },
  /* add-KPI form draft — null when the form is closed */
  addForm:null,
  /* the one library card expanded into its inline editor: "group:CODE" */
  expandedCode:'',
  activeView:'overview',
  reason:'',
  /* KPI Library filters (the only view; group + tier are filter chips) */
  filters:{ process:'', category:'', group:'', tier:'', jd:'', status:'', search:'', retired:'',
    metric_subtype:'', control_intent:'', evaluation_use:'', reward_mode:'', lifecycle_status:'' }
};

/* A fresh add-KPI form draft. */
function _newAddForm(){
  return { group:'governance', tier:'department', canonical_code:'', name:'', name_vi:'',
    process:'unclassified', category:'internal', owner_role:'',
    counter_metric:{ name_vi:'', name:'', intent:'' },
    cadence:'monthly', direction:'higher_is_better', unit:'percent',
    green_point:'', yellow_point:'', target:'', purpose:'',
    decision_action:'', data_contract_gap:'', target_graduation_condition:'',
    evidence_source:'', blocking_conditions:'',
    // MCS-EXT-1 fields (all optional; empty string preserves legacy add).
    metric_subtype:'', control_intent:'', measurement_data_type:'',
    scoring_model_detail:'', evaluation_use:'', reward_mode:'',
    paired_metric:'', attribution_rule:'', lifecycle_status:'' };
}
/* Deep-clone a {governance,gate,proposed} group map. */
function _cloneGroups(src){
  src = src || {};
  return {
    governance:(src.governance || []).slice(),
    gate:(src.gate || []).slice(),
    proposed:(src.proposed || []).slice()
  };
}
/* Seed the add/retire working state from a freshly loaded config. */
function _seedAddRetireState(cfg){
  cfg = cfg || {};
  _state.addedSeed       = _cloneGroups(cfg.overlay_added);
  _state.addedDraft      = { governance:[], gate:[], proposed:[] };
  _state.retired         = _cloneGroups(cfg.overlay_retired);
  _state.retiredBaseline = _cloneGroups(cfg.overlay_retired);
  _state.addForm = null;
}
/* Merge persisted + draft added KPIs for the save payload. */
function _addedPayload(){
  var s = _state.addedSeed, d = _state.addedDraft;
  return {
    governance:(s.governance || []).concat(d.governance || []),
    gate:(s.gate || []).concat(d.gate || []),
    proposed:(s.proposed || []).concat(d.proposed || [])
  };
}
/* Has the retired set diverged from the loaded baseline? */
function _retiredChanged(){
  var norm = function(m){
    return ['governance','gate','proposed'].map(function(g){
      return (m[g] || []).map(String).sort().join(',');
    }).join('|');
  };
  return norm(_state.retired) !== norm(_state.retiredBaseline);
}

/* Group display labels. */
var GROUP_VI = {
  governance:'Governance', gate:'Gate', proposed:'Đề xuất / Vị trí'
};

/* Category display labels. */
var CATEGORY_VI = {
  internal:'Nội bộ', supplier:'Nhà cung cấp', customer:'Khách hàng',
  safety:'An toàn', financial:'Tài chính', system:'Hệ thống'
};

window._renderAdminKpiRegistry = function(el, langCode){
  _el = el;
  _lang = langCode || (typeof lang !== 'undefined' ? lang : 'vi');
  if(!_state.config && !_state.loading){ _load(); return; }
  _render();
};

function _t(vi, en){ return _lang === 'en' ? en : vi; }

function _esc(value){
  return String(value == null ? '' : value)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* ── Data load / save ─────────────────────────────────────────────── */
function _load(){
  _state.loading = true; _state.error = ''; _state.message = '';
  _render();
  apiCall('admin_kpi_registry_get', null, 'GET', 45000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'load_failed');
      _state.config = data.config || {};
      _state.overrides = { governance:{}, gate:{}, proposed:{} };
      _seedAddRetireState(_state.config);
      _state.reason = '';
    })
    .catch(function(err){
      _state.error = _t('Không tải được Console KPI.', 'Cannot load the KPI console.')
        + ' ' + (err && err.message ? err.message : '');
    })
    .finally(function(){ _state.loading = false; _render(); });
}

function _save(){
  if(_state.saving) return;
  if(!_dirty()){
    _state.error = _t('Chưa có thay đổi nào để lưu.', 'No changes to save.');
    _syncStatus(); return;
  }
  _state.saving = true; _state.error = ''; _state.message = '';
  _render();
  apiCall('admin_kpi_registry_save', {
    governance_overrides: _state.overrides.governance || {},
    gate_overrides:       _state.overrides.gate || {},
    proposed_overrides:   _state.overrides.proposed || {},
    added_kpis:           _addedPayload(),
    retired_codes:        _state.retired || {},
    reason: _state.reason || ''
  }, 'POST', 90000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'save_failed');
      _state.config = data.config || {};
      _state.overrides = { governance:{}, gate:{}, proposed:{} };
      _seedAddRetireState(_state.config);
      _state.reason = '';
      var nAdd = (data.added_count || 0), nRet = (data.retired_count || 0);
      _state.message = _t('Đã lưu và đồng bộ ANNEX-122.', 'Saved and synced ANNEX-122.')
        + (nAdd ? ' +' + nAdd + ' ' + _t('KPI mới', 'new KPI') : '')
        + (nRet ? ' · ' + nRet + ' ' + _t('KPI ngừng dùng', 'retired') : '')
        + (data.annex122_updated ? '' : ' ' + _t('(ANNEX-122 không đổi)', '(ANNEX-122 unchanged)'));
    })
    .catch(function(err){
      _state.error = _t('Lưu thất bại.', 'Save failed.') + ' ' + (err && err.message ? err.message : '');
    })
    .finally(function(){ _state.saving = false; _render(); });
}

/* ── Draft model — overrides keyed by section then code ────────────── */
function _kpis(){
  return (_state.config && Array.isArray(_state.config.governance_kpis))
    ? _state.config.governance_kpis : [];
}
function _sectionMetrics(section){
  if(!_state.config) return [];
  if(section === 'gate') return _state.config.gate_control_metrics || [];
  if(section === 'proposed') return _state.config.proposed_operating_metrics || [];
  return _kpis();
}
function _dirty(){
  var o = _state.overrides, d = _state.addedDraft;
  var n = Object.keys(o.governance||{}).length
        + Object.keys(o.gate||{}).length
        + Object.keys(o.proposed||{}).length
        + (d.governance||[]).length + (d.gate||[]).length + (d.proposed||[]).length;
  return n > 0 || _retiredChanged();
}

/* Effective value of an editable field: override wins over config. */
function _val(metric, section, field){
  var sec = _state.overrides[section] || {};
  var code = metric.canonical_code;
  if(sec[code] && Object.prototype.hasOwnProperty.call(sec[code], field)){
    return sec[code][field];
  }
  return metric[field];
}
function _threshold(metric, section, key){
  var t = _val(metric, section, 'thresholds') || metric.thresholds || {};
  return t[key] != null ? t[key] : '';
}

function _setField(section, code, field, value){
  if(!_state.overrides[section]) _state.overrides[section] = {};
  if(!_state.overrides[section][code]) _state.overrides[section][code] = {};
  _state.overrides[section][code][field] = value;
  _state.error = ''; _state.message = '';
  _syncStatus();
}
function _setThreshold(section, code, key, value){
  var metric = null, list = _sectionMetrics(section);
  for(var i=0;i<list.length;i++){ if(list[i].canonical_code===code){ metric=list[i]; break; } }
  if(!metric) return;
  var sec = _state.overrides[section] || {};
  var cur = (sec[code] && sec[code].thresholds)
    ? sec[code].thresholds
    : Object.assign({}, metric.thresholds || {});
  // green_point / yellow_point / target are numeric SSOT fields.
  if(key === 'green_point' || key === 'yellow_point' || key === 'target'){
    var n = parseFloat(value);
    cur[key] = isNaN(n) ? value : n;
  } else {
    cur[key] = value;
  }
  _setField(section, code, 'thresholds', cur);
  // Live-link: the xanh/vàng/đỏ box reflects the edited points immediately.
  _refreshRag(section, code);
}

/* Effective value of one key inside the dedicated counter-metric object. */
function _counterVal(m, section, key){
  var cm = _val(m, section, 'counter_metric');
  return (cm && typeof cm === 'object' && cm[key] != null) ? cm[key] : '';
}
/* Edit one key of the dedicated counter-metric object on the override draft. */
function _setCounter(section, code, key, value){
  var metric = null, list = _sectionMetrics(section);
  for(var i=0;i<list.length;i++){ if(list[i].canonical_code===code){ metric=list[i]; break; } }
  if(!metric) return;
  var sec = _state.overrides[section] || {};
  var existing = (sec[code] && sec[code].counter_metric && typeof sec[code].counter_metric === 'object')
    ? sec[code].counter_metric : null;
  var base = (metric.counter_metric && typeof metric.counter_metric === 'object')
    ? metric.counter_metric : {};
  var cur = existing || Object.assign({}, base);
  cur[key] = value;
  _setField(section, code, 'counter_metric', cur);
}

/* Derive (green,yellow,red) display bands from numeric thresholds — mirrors
   the registry-render logic so the editor preview matches ANNEX-122. */
function _ragBands(t){
  if(!t || t.green_point == null || t.yellow_point == null) return null;
  var suf = {percent:'%',ppm:' ppm',day:' ngày',rate:'',ratio:'',count:'',vnd:' ₫'}[t.unit] || '';
  var g = t.green_point, y = t.yellow_point;
  if(t.direction === 'lower_is_better'){
    return {green:'≤ '+g+suf, yellow:'>'+g+' – ≤'+y+suf, red:'> '+y+suf};
  }
  return {green:'≥ '+g+suf, yellow:y+' – <'+g+suf, red:'< '+y+suf};
}
function _setReason(value){ _state.reason = value; }
function _reset(){
  _state.overrides = { governance:{}, gate:{}, proposed:{} };
  _state.addedDraft = { governance:[], gate:[], proposed:[] };
  _state.retired = _cloneGroups(_state.retiredBaseline);
  _state.addForm = null;
  _state.reason = '';
  _state.error = ''; _state.message = _t('Đã hoàn tác các thay đổi chưa lưu.', 'Reverted unsaved changes.');
  _render();
}

/* ── Status helpers ───────────────────────────────────────────────── */
function _setAlert(id, text){
  var node = document.getElementById(id);
  if(!node) return;
  node.textContent = text || '';
  node.hidden = !text;
}
function _syncStatus(){
  _setAlert('kc-error-alert', _state.error || '');
  _setAlert('kc-message-alert', _state.message || '');
  var btn = document.getElementById('kc-save-btn');
  if(btn) btn.disabled = _state.saving || !_dirty();
}

/* ── Render ───────────────────────────────────────────────────────── */
function _render(){
  var el = _el || document.getElementById('admin-content');
  if(!el || !document.contains(el)) return;
  if(_state.loading){
    el.innerHTML = '<div class="hm-empty">' + _t('Đang tải Console KPI...', 'Loading KPI console...') + '</div>';
    return;
  }
  var body = _renderActiveView();

  el.innerHTML =
'<section class="kpi-console">' + _styleBlock() +
  '<header class="kc-head">' +
    '<div class="kc-head-titles">' +
      '<span class="kc-eyebrow">' + _t('Quản trị điều hành', 'Operations governance') + '</span>' +
      '<h2>' + _t('Console KPI — Governance', 'KPI Console — Governance') + '</h2>' +
      '<p>' + _t('Thư viện KPI thực chiến: lọc, mở thẻ để biên tập ngưỡng / owner / nhịp / counter-metric. Lưu ghi overlay runtime và tái tạo §4/§5/§6 trong ANNEX-122.',
                 'The operating-KPI governance console: structured tabs, no raw JSON editing, with runtime/manual/staged/retired labels and ANNEX-122 sync.') + '</p>' +
    '</div>' +
    '<div class="kc-actions">' +
      '<button class="kc-btn" type="button" onclick="_kpiReload()">' + _t('Tải lại', 'Reload') + '</button>' +
      '<button class="kc-btn" type="button" onclick="_kpiReset()">' + _t('Hoàn tác', 'Reset') + '</button>' +
      '<button class="kc-btn primary" id="kc-save-btn" type="button" ' + ((_state.saving || !_dirty()) ? 'disabled' : '') +
        ' onclick="_kpiSave()">' + (_state.saving ? _t('Đang lưu...', 'Saving...') : _t('Lưu & đồng bộ tài liệu', 'Save & sync documents')) + '</button>' +
    '</div>' +
  '</header>' +
  '<div class="kc-alert error" id="kc-error-alert" ' + (_state.error ? '' : 'hidden') + '>' + _esc(_state.error) + '</div>' +
  '<div class="kc-alert ok" id="kc-message-alert" ' + (_state.message ? '' : 'hidden') + '>' + _esc(_state.message) + '</div>' +
  '<div class="kc-field"><label>' + _t('Lý do cập nhật (ghi vào nhật ký kiểm toán)', 'Change reason (written to the audit log)') + '</label>' +
    '<textarea class="kc-reason" oninput="_kpiSetReason(this.value)" placeholder="' +
      _t('Ví dụ: siết ngưỡng đỏ OTD theo cam kết khách hàng mới...', 'Example: tighten OTD red threshold per new customer commitment...') +
      '">' + _esc(_state.reason || '') + '</textarea></div>' +
  _renderTabs() +
  body +
'</section>';
  _syncStatus();
}

var _viewDefs = [
  ['overview', 'Tổng quan', 'Overview'],
  ['official', 'Official KPI', 'Official KPI'],
  ['operating', 'Operating', 'Operating'],
  ['gate', 'Gate G0-G7', 'Gate G0-G7'],
  ['jd', 'JD', 'JD'],
  ['data', 'Data Contracts', 'Data Contracts'],
  ['counter', 'Counter/Blockers', 'Counter/Blockers'],
  ['retired', 'Retired/Aliases', 'Retired/Aliases'],
  ['audit', 'Audit/Drift', 'Audit/Drift']
];

function _renderTabs(){
  return '<nav class="kc-tabs" aria-label="KPI console sections">' +
    _viewDefs.map(function(v){
      var active = _state.activeView === v[0];
      var label = _t(v[1], v[2]);
      return '<button class="kc-tab' + (active ? ' is-active' : '') + '" type="button" onclick="_kpiSetView(\'' +
        _esc(v[0]) + '\')" aria-pressed="' + (active ? 'true' : 'false') + '">' + _esc(label) + '</button>';
    }).join('') + '</nav>';
}

function _viewRows(key){
  var cfg = _state.config || {};
  var views = cfg.admin_views || {};
  if(Array.isArray(views[key])) return views[key];
  if(Array.isArray(cfg[key])) return cfg[key];
  return [];
}

function _renderActiveView(){
  if(_state.addForm) return _renderAddForm();
  if(_state.activeView === 'overview') return _renderOverview();
  if(_state.activeView === 'official')
    return _metricPanel(_t('Official KPI Scorecard', 'Official KPI Scorecard'), _viewRows('official_kpis'), true);
  if(_state.activeView === 'operating')
    return _metricPanel(_t('Operating Metrics', 'Operating Metrics'), _viewRows('operating_metrics'), true);
  if(_state.activeView === 'gate')
    return _renderGateCoverage() + _metricPanel(_t('Gate Control Metrics', 'Gate Control Metrics'), _viewRows('gate_control_metrics'), true);
  if(_state.activeView === 'jd') return _renderJdScorecards();
  if(_state.activeView === 'data') return _renderDataContracts();
  if(_state.activeView === 'counter') return _renderCounterBlockers();
  if(_state.activeView === 'retired')
    return _metricPanel(_t('Retired / Aliases', 'Retired / Aliases'), _viewRows('retired_metrics'), false);
  if(_state.activeView === 'audit') return _renderAuditDrift();
  return _renderOverview();
}

function _renderOverview(){
  var cfg = _state.config || {};
  var views = cfg.admin_views || {};
  var counts = views.counts || {};
  var integrity = views.integrity_status || cfg.integrity_status || {};
  var gate = views.gate_coverage || cfg.gate_coverage || {};
  var boxes = [
    [_t('Tổng metric', 'Total metrics'), counts.total_metrics || ((_state.config || {}).library || []).length],
    [_t('Official active', 'Official active'), counts.official_active || 0],
    [_t('Staged', 'Staged'), counts.staged || 0],
    [_t('Counter', 'Counter'), counts.counter_metrics || 0],
    [_t('JD scorecard', 'JD scorecard'), counts.role_scorecards || 0],
    [_t('Gate CDR', 'Gate CDR'), (gate.with_linked_cdr || 0) + '/' + (gate.total_gate_metrics || 0)]
  ];
  var status = String(integrity.status || 'PASS');
  var html = '<section class="kc-panel"><div class="kc-panel-head"><h3>' +
    _t('Tổng quan kiểm soát KPI', 'KPI control overview') + '</h3><span class="kc-integrity kc-integrity-' +
    _esc(status.toLowerCase()) + '">' + _esc(status) + '</span></div>' +
    '<div class="kc-summary-grid">' + boxes.map(function(b){
      return '<div class="kc-summary"><span>' + _esc(b[0]) + '</span><b>' + _esc(b[1]) + '</b></div>';
    }).join('') + '</div>' +
    '<div class="kc-metric-split"><div>' + _summaryList(_t('Theo trạng thái', 'By status'), counts.by_calculation_status || {}) +
    '</div><div>' + _summaryList(_t('Theo loại metric', 'By metric type'), counts.by_metric_type || {}) + '</div></div>';
  var findings = integrity.findings || [];
  if(findings.length){
    html += '<div class="kc-finding-list"><h4>' + _t('Integrity findings', 'Integrity findings') + '</h4>' +
      findings.slice(0, 8).map(_findingRow).join('') + '</div>';
  }
  html += '</section>';
  return html;
}

function _summaryList(title, map){
  var keys = Object.keys(map || {});
  if(!keys.length) return '<div class="kc-mini">' + _esc(title) + ': —</div>';
  return '<h4>' + _esc(title) + '</h4><div class="kc-pill-list">' + keys.map(function(k){
    return '<span class="kc-pill">' + _esc(k) + ' <b>' + _esc(map[k]) + '</b></span>';
  }).join('') + '</div>';
}

function _metricPanel(title, rows, editable){
  rows = rows || [];
  var nav = '<div class="kc-nav"><span class="kc-nav-title">' + _esc(title) + '</span><span class="kc-nav-spacer"></span>' +
    (editable ? '<button class="kc-btn primary" type="button" onclick="_kpiAddOpen()">+ ' +
      _t('Đề xuất metric', 'Propose metric') + '</button>' : '') + '</div>';
  if(!rows.length) return nav + '<div class="hm-empty">' + _t('Chưa có dữ liệu cho view này.', 'No data for this view yet.') + '</div>';
  return nav + '<div class="kc-lib-grid">' + rows.map(_renderLibCard).join('') + '</div>';
}

function _renderGateCoverage(){
  var cov = (_state.config && (_state.config.gate_coverage || ((_state.config.admin_views || {}).gate_coverage))) || {};
  var gates = cov.by_gate || [];
  if(!gates.length) return '';
  return '<section class="kc-panel"><div class="kc-panel-head"><h3>Gate G0-G7</h3><span class="kc-mini">' +
    _esc(cov.coverage_pct || 0) + '% CDR</span></div><div class="kc-gate-grid">' +
    gates.map(function(g){
      return '<div class="kc-gate"><b>' + _esc(g.gate) + '</b><span>' + _esc(g.with_cdr || 0) + '/' +
        _esc(g.count || 0) + ' CDR</span><div class="kc-mini">' +
        (g.metrics || []).slice(0, 4).map(function(m){ return _esc(m.canonical_code); }).join(', ') +
        '</div></div>';
    }).join('') + '</div></section>';
}

function _renderJdScorecards(){
  var roles = _viewRows('role_scorecards');
  if(!roles.length){
    var legacy = ((_state.config || {}).jd_kpi_scorecards || {}).roles || {};
    roles = Object.keys(legacy).map(function(k){
      var role = legacy[k] || {};
      var items = role.active_scorecard || role.scorecard || [];
      var total = items.reduce(function(sum, it){ return sum + (parseInt(it.weight,10) || 0); }, 0);
      return { role_code:k, jd_title_vi:role.jd_title_vi || '', active_measure_count:items.length,
        active_weight_total:total, candidate_count:(role.candidate_bank || []).length,
        optional_count:(role.optional_rotate || []).length, do_not_use_count:(role.do_not_use || []).length };
    });
  }
  return '<section class="kc-panel"><div class="kc-panel-head"><h3>JD Scorecards</h3><span class="kc-mini">' +
    _esc(roles.length) + ' roles</span></div>' +
    _simpleTable(['Role','JD','Active','Weight','Candidate','Optional','Do not use'], roles.map(function(r){
      return [r.role_code, r.jd_title_vi || '', r.active_measure_count || 0,
        (r.active_weight_total == null ? '—' : r.active_weight_total + '%'),
        r.candidate_count || 0, r.optional_count || 0, r.do_not_use_count || 0];
    })) + '</section>';
}

function _renderDataContracts(){
  var rows = _viewRows('data_contracts');
  return '<section class="kc-panel"><div class="kc-panel-head"><h3>Data Contracts</h3><span class="kc-mini">' +
    _esc(rows.length) + ' metrics</span></div>' +
    _simpleTable(['Code','Status','Gap','Graduation','Input','Runtime'], rows.map(function(r){
      return [r.canonical_code, r.calculation_status || r.data_contract_status,
        r.data_contract_gap || '—', r.target_graduation_condition || '—',
        r.input_endpoint || '—', r.runtime_endpoint || '—'];
    })) + '</section>';
}

function _renderCounterBlockers(){
  var rows = _viewRows('counter_metrics');
  return '<section class="kc-panel"><div class="kc-panel-head"><h3>Counter / Blockers</h3><span class="kc-mini">' +
    _esc(rows.length) + ' counters</span></div>' +
    _simpleTable(['Parent','Counter','Intent','Parent status','Reward'], rows.map(function(r){
      return [r.parent_code, r.counter_code, r.intent || r.name_vi || '—',
        r.parent_status || '—', r.parent_reward_eligible ? 'yes' : 'no'];
    })) + '</section>';
}

function _renderAuditDrift(){
  var views = ((_state.config || {}).admin_views || {});
  var integrity = views.integrity_status || (_state.config || {}).integrity_status || {};
  var findings = integrity.findings || [];
  var rows = findings.map(function(f){
    return [f.priority || '', f.code || '', f.metric_code || f.role_code || '', f.message || ''];
  });
  return '<section class="kc-panel"><div class="kc-panel-head"><h3>Audit / Drift</h3><span class="kc-integrity kc-integrity-' +
    _esc(String(integrity.status || 'pass').toLowerCase()) + '">' + _esc(integrity.status || 'PASS') +
    '</span></div>' + (rows.length ? _simpleTable(['P','Finding','Object','Message'], rows)
      : '<div class="hm-empty">' + _t('Không có finding integrity đang hiển thị.', 'No integrity finding to show.') + '</div>') +
    '</section>';
}

function _findingRow(f){
  return '<div class="kc-finding"><b>' + _esc(f.priority || '') + '</b><span>' +
    _esc(f.code || '') + '</span><small>' + _esc(f.metric_code || f.role_code || '') +
    '</small><p>' + _esc(f.message || '') + '</p></div>';
}

function _simpleTable(headers, rows){
  return '<div class="kc-table-wrap"><table class="kc-table"><thead><tr>' +
    headers.map(function(h){ return '<th>' + _esc(h) + '</th>'; }).join('') +
    '</tr></thead><tbody>' + (rows || []).map(function(row){
      return '<tr>' + row.map(function(cell){ return '<td>' + _esc(cell == null ? '' : cell) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
}

/* ── KPI Library — the single console view ─────────────────────────── */
/* Draft (unsaved this session) Console-added KPIs in library row shape.
   Persisted Console-added KPIs already arrive inside config.library. */
function _draftLibRows(){
  var out = [];
  ['governance','gate','proposed'].forEach(function(grp){
    (_state.addedDraft[grp] || []).forEach(function(r, idx){
      out.push({
        canonical_code:r.canonical_code, name:r.name, name_vi:r.name_vi,
        group:grp, tier:r.tier, process:r.process, category:r.category,
        gate:null, calculation_status:'staged_data_contract', owner_role:r.owner_role,
        applicable_jds:r.owner_role ? [r.owner_role] : [],
        counter_metric:r.counter_metric, thresholds:r.thresholds || {},
        data_contract_gap:r.data_contract_gap || '',
        target_graduation_condition:r.target_graduation_condition || '',
        evidence_source:r.evidence_source || '',
        retired:false, origin:'console_proposed', _draft:true, _draftIdx:idx
      });
    });
  });
  return out;
}
function _libRows(){
  var base = (_state.config && Array.isArray(_state.config.library)) ? _state.config.library : [];
  return base.concat(_draftLibRows());
}
/* A row is retired iff its code is in the live retired set. The set is
   seeded from the overlay on load, so it reflects persisted retirements
   and any unsaved retire/restore toggles. */
function _isRetired(r){
  var list = _state.retired[r.group] || [];
  return list.indexOf(String(r.canonical_code).toUpperCase()) >= 0;
}
function _setFilter(key, value){ _state.filters[key] = value; _render(); }

function _filteredLib(){
  var f = _state.filters;
  var q = (f.search || '').trim().toLowerCase();
  return _libRows().filter(function(r){
    var retired = _isRetired(r);
    if(f.retired === 'active' && retired) return false;
    if(f.retired === 'retired' && !retired) return false;
    if(f.process  && r.process  !== f.process)  return false;
    if(f.category && r.category !== f.category) return false;
    if(f.group    && r.group    !== f.group)    return false;
    if(f.tier     && r.tier     !== f.tier)     return false;
    if(f.status   && r.calculation_status !== f.status) return false;
    if(f.jd && (r.applicable_jds || []).indexOf(f.jd) < 0) return false;
    // MCS-EXT-1 filter axes — all optional, only filter when set.
    if(f.metric_subtype  && r.metric_subtype  !== f.metric_subtype)  return false;
    if(f.control_intent  && r.control_intent  !== f.control_intent)  return false;
    if(f.evaluation_use  && r.evaluation_use  !== f.evaluation_use)  return false;
    if(f.reward_mode     && r.reward_mode     !== f.reward_mode)     return false;
    if(f.lifecycle_status&& r.lifecycle_status!== f.lifecycle_status)return false;
    if(q){
      var hay = (r.canonical_code + ' ' + (r.name_vi||'') + ' ' + (r.name||'')).toLowerCase();
      if(hay.indexOf(q) < 0) return false;
    }
    return true;
  });
}

function _selOptions(pairs, selected){
  return pairs.map(function(p){
    return '<option value="' + _esc(p[0]) + '"' + (p[0] === selected ? ' selected' : '') +
      '>' + _esc(p[1]) + '</option>';
  }).join('');
}

/* MCS-EXT-1 filter dropdowns — appended to the filter bar.
   Only render a dropdown if the facet has at least one populated value, so the
   bar stays clean for orgs that have not yet enriched any metrics. */
function _mcsExtFilterDropdowns(facets, f){
  var html = '';
  var make = function(key, viLabel, enLabel){
    var counts = facets[key] || {};
    var keys = Object.keys(counts);
    if(!keys.length) return '';
    var opts = [['', _t('— ' + viLabel + ' —', '— ' + enLabel + ' —')]];
    keys.forEach(function(k){ opts.push([k, k + ' (' + counts[k] + ')']); });
    return '<select class="kc-input" onchange="_kpiSetFilter(\'' + key + '\',this.value)">' +
      _selOptions(opts, f[key] || '') + '</select>';
  };
  html += make('metric_subtype',   'Mọi metric subtype',   'All metric subtypes');
  html += make('control_intent',   'Mọi control intent',    'All control intents');
  html += make('evaluation_use',   'Mọi evaluation use',    'All evaluation uses');
  html += make('reward_mode',      'Mọi reward mode',        'All reward modes');
  html += make('lifecycle_status', 'Mọi lifecycle status',  'All lifecycle statuses');
  return html;
}

function _renderLibrary(){
  var cfg = _state.config || {};
  var f = _state.filters;
  var facets = cfg.facets || {};
  var nav = '<div class="kc-nav">' +
    '<span class="kc-nav-title">📚 ' + _t('Thư viện KPI', 'KPI Library') + '</span>' +
    '<span class="kc-nav-spacer"></span>' +
    '<button class="kc-btn primary" type="button" onclick="_kpiAddOpen()">+ ' +
      _t('Đề xuất metric', 'Propose metric') + '</button></div>';

  if(_state.addForm) return nav + _renderAddForm();

  /* filter option lists */
  var procOpts = [['', _t('— Mọi quá trình —', '— All processes —')]];
  (facets.process || []).forEach(function(p){
    procOpts.push([p.key, p.label + ' (' + p.count + ')']);
  });
  var catOpts = [['', _t('— Mọi phân loại —', '— All categories —')]];
  Object.keys(facets.category || {}).forEach(function(k){
    catOpts.push([k, (CATEGORY_VI[k] || k) + ' (' + facets.category[k] + ')']);
  });
  var grpOpts = [['', _t('— Mọi nhóm —', '— All groups —')],
    ['governance', _t('Governance', 'Governance')], ['gate', 'Gate'], ['proposed', _t('Đề xuất', 'Proposed')]];
  var tierOpts = [['', _t('— Mọi cấp —', '— All tiers —')]];
  Object.keys(facets.tier || {}).forEach(function(k){
    if(TIER_VI[k]) tierOpts.push([k, TIER_VI[k] + ' (' + facets.tier[k] + ')']);
  });
  var jdOpts = [['', _t('— Mọi JD / vai trò —', '— All JDs / roles —')]];
  Object.keys(facets.applicable_jds || {}).forEach(function(k){
    jdOpts.push([k, k + ' (' + facets.applicable_jds[k] + ')']);
  });
  var stOpts = [['', _t('— Mọi trạng thái —', '— All statuses —')],
    ['runtime_calculated', _t('Tính runtime', 'Runtime')],
    ['staged_data_contract', _t('Chờ data contract', 'Staged')],
    ['manual_governed', _t('Nhập tay có kiểm soát', 'Manual governed')],
    ['manual', _t('Nhập tay', 'Manual')]];
  var nRetired = (facets.retired || 0);
  var retOpts = [['', _t('— Đang dùng & ngừng dùng —', '— Active & retired —')],
    ['active', _t('Chỉ KPI đang dùng', 'Active only')],
    ['retired', _t('Chỉ KPI ngừng dùng', 'Retired only') + (nRetired ? ' (' + nRetired + ')' : '')]];

  var filterBar =
    '<div class="kc-filterbar">' +
      '<input class="kc-search" type="search" placeholder="' +
        _t('Tìm mã hoặc tên KPI...', 'Search KPI code or name...') + '" value="' + _esc(f.search) +
        '" oninput="_kpiSetFilter(\'search\',this.value)">' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'process\',this.value)">' + _selOptions(procOpts, f.process) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'category\',this.value)">' + _selOptions(catOpts, f.category) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'group\',this.value)">' + _selOptions(grpOpts, f.group) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'tier\',this.value)">' + _selOptions(tierOpts, f.tier) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'jd\',this.value)">' + _selOptions(jdOpts, f.jd) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'status\',this.value)">' + _selOptions(stOpts, f.status) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'retired\',this.value)">' + _selOptions(retOpts, f.retired) + '</select>' +
      _mcsExtFilterDropdowns(facets, f) +
      '<button class="kc-btn" type="button" onclick="_kpiClearFilters()">' + _t('Xóa lọc', 'Clear') + '</button>' +
    '</div>';

  var rows = _filteredLib();
  var resultHead = '<div class="kc-result-head">' +
    '<b>' + rows.length + '</b> / ' + _libRows().length + ' ' + _t('KPI khớp bộ lọc', 'KPIs match the filter') +
    '</div>';

  var grid = rows.map(_renderLibCard).join('');
  if(!grid) grid = '<div class="hm-empty">' + _t('Không có KPI khớp bộ lọc.', 'No KPI matches the filter.') + '</div>';

  return nav + filterBar + _renderScorecard() + resultHead +
    '<div class="kc-lib-grid">' + grid + '</div>';
}

/* Per-JD weighted KPI scorecard — shown when the JD filter selects a role
   that has a scorecard in jd_kpi_scorecards. Weights sum to 100. */
function _renderScorecard(){
  var f = _state.filters;
  var roles = ((_state.config || {}).jd_kpi_scorecards || {}).roles || {};
  var role = (f.jd && roles[f.jd]) ? roles[f.jd] : null;
  var items = role && Array.isArray(role.active_scorecard) ? role.active_scorecard :
    (role && Array.isArray(role.scorecard) ? role.scorecard : []);
  if(!items.length) return '';
  var rows = items.map(function(it){
    return '<div class="kc-sc-row">' +
      '<span class="kc-code">' + _esc(it.kpi_code) + '</span>' +
      '<span class="kc-sc-bar"><span class="kc-sc-fill" style="width:' +
        (parseInt(it.weight,10) || 0) + '%"></span></span>' +
      '<span class="kc-sc-w">' + _esc(it.weight) + '%</span>' +
      '<span class="kc-mini kc-sc-why">' + _esc(it.rationale || '') + '</span>' +
    '</div>';
  }).join('');
  return '<div class="kc-scorecard"><div class="kc-sc-head">🎯 ' +
    _t('Thẻ điểm KPI — ', 'KPI scorecard — ') + _esc(role.jd_title_vi || f.jd) +
    ' <span class="kc-mini">(' + _esc(f.jd) + ' · ' +
    _t('tổng trọng số 100%', 'weights total 100%') + ')</span></div>' +
    rows + '</div>';
}

/* ── Add-KPI form ──────────────────────────────────────────────────── */
function _afSet(key, value){
  if(!_state.addForm) return;
  _state.addForm[key] = value;
  if(key === 'group'){
    /* gate / proposed metrics carry no tier */
    _state.addForm.tier = (value === 'governance') ? 'department' : '';
    _render();
  }
}
function _renderAddForm(){
  var a = _state.addForm;
  var cfg = _state.config || {};
  var grpOpts = [['governance', _t('Governance (công ty / value-stream / phòng ban)', 'Governance')],
    ['gate', _t('Gate metric', 'Gate metric')], ['proposed', _t('Metric đề xuất', 'Proposed metric')]];
  var tierOpts = [['company', _t('Cấp công ty', 'Company')],
    ['value_stream', _t('Value-stream', 'Value-stream')], ['department', _t('Phòng ban', 'Department')]];
  var catOpts = Object.keys(CATEGORY_VI).map(function(k){ return [k, CATEGORY_VI[k]]; });
  var dirOpts = [['higher_is_better', _t('Cao hơn là tốt', 'Higher is better')],
    ['lower_is_better', _t('Thấp hơn là tốt', 'Lower is better')]];
  var unitOpts = [['percent','%'],['ppm','ppm'],['day',_t('ngày','day')],['rate','rate'],
    ['ratio','ratio'],['count',_t('đếm','count')],['vnd','VND ₫']];
  var procOpts = [['unclassified', _t('— Chưa phân loại —', '— Unclassified —')]];
  (cfg.facets && cfg.facets.process || []).forEach(function(p){ procOpts.push([p.key, p.label]); });
  var pcat = cfg.process_catalog || {};
  Object.keys(pcat).forEach(function(k){
    if(!procOpts.some(function(o){ return o[0] === k; }))
      procOpts.push([k, (pcat[k] && pcat[k].vi) || k]);
  });

  function row(label, control){ return _field(label, control); }

  // MCS-EXT-1 wizard step indicator. The add form remains a single page (faster
  // for power users) but the 8 conceptual steps from registry.wizard_steps are
  // shown as a progress strip so admins know which axis each field belongs to.
  // Steps light up as their primary field is filled.
  var ext = cfg.metric_control_schema_extension || {};
  var steps = ext.wizard_steps || [
    {step:1, name:'problem_type'}, {step:2, name:'metric_subtype'},
    {step:3, name:'measurement_data_type'}, {step:4, name:'scoring_model'},
    {step:5, name:'data_contract_evidence'}, {step:6, name:'evaluation_reward_weight'},
    {step:7, name:'role_assignments'}, {step:8, name:'counter_blocker_lifecycle'}
  ];
  var stepDone = function(s){
    if(s.name === 'problem_type')          return !!a.control_intent;
    if(s.name === 'metric_subtype')        return !!a.metric_subtype || !!a.group;
    if(s.name === 'measurement_data_type') return !!a.measurement_data_type || !!a.unit;
    if(s.name === 'scoring_model')         return !!a.scoring_model_detail || !!a.green_point;
    if(s.name === 'data_contract_evidence')return !!a.data_contract_gap || !!a.evidence_source;
    if(s.name === 'evaluation_reward_weight') return !!a.evaluation_use || !!a.reward_mode;
    if(s.name === 'role_assignments')      return !!a.owner_role;
    if(s.name === 'counter_blocker_lifecycle') return !!(a.counter_metric && a.counter_metric.name_vi) || !!a.blocking_conditions;
    return false;
  };
  var wizStrip = '<div class="kc-wiz-steps">' + steps.map(function(s){
    var cls = stepDone(s) ? 'kc-wiz-step kc-wiz-step--done' : 'kc-wiz-step';
    return '<span class="' + cls + '">' + s.step + '. ' + _esc(s.name.replace(/_/g, ' ')) + '</span>';
  }).join('') + '</div>';

  var html = '<div class="kc-addform"><h3>+ ' + _t('Đề xuất metric mới (wizard)', 'Propose a new metric (wizard)') + '</h3>' +
    wizStrip +
    '<p class="kc-mini">' + _t('Metric mới luôn ở trạng thái staged data contract. Console không được tạo runtime, công thức, hoặc scoring chính thức. Điền đủ các bước MCS-EXT để metric có ngữ nghĩa kiểm soát rõ ràng (control_intent, metric_subtype, scoring_model, evaluation_use, reward_mode).',
      'New metrics always stay staged data contract. The console cannot create runtime logic, formula truth, or official scoring. Fill the MCS-EXT steps so the metric carries explicit control semantics (control_intent, metric_subtype, scoring_model, evaluation_use, reward_mode).') + '</p>' +
    '<div class="kc-grid">' +
    row(_t('Nhóm', 'Group'),
      '<select class="kc-input" onchange="_kpiAddField(\'group\',this.value)">' + _selOptions(grpOpts, a.group) + '</select>') +
    (a.group === 'governance' ? row(_t('Cấp (tier)', 'Tier'),
      '<select class="kc-input" onchange="_kpiAddField(\'tier\',this.value)">' + _selOptions(tierOpts, a.tier) + '</select>') : '') +
    row(_t('Mã KPI (A–Z, 0–9, _)', 'KPI code (A–Z, 0–9, _)'),
      '<input class="kc-input" type="text" value="' + _esc(a.canonical_code) +
      '" placeholder="VD: TOOL_LIFE_VARIANCE" oninput="_kpiAddField(\'canonical_code\',this.value)">') +
    row(_t('Tên (tiếng Việt)', 'Name (Vietnamese)'),
      '<input class="kc-input" type="text" value="' + _esc(a.name_vi) +
      '" oninput="_kpiAddField(\'name_vi\',this.value)">') +
    row(_t('Tên (tiếng Anh)', 'Name (English)'),
      '<input class="kc-input" type="text" value="' + _esc(a.name) +
      '" oninput="_kpiAddField(\'name\',this.value)">') +
    row(_t('Quá trình', 'Process'),
      '<select class="kc-input" onchange="_kpiAddField(\'process\',this.value)">' + _selOptions(procOpts, a.process) + '</select>') +
    row(_t('Phân loại', 'Category'),
      '<select class="kc-input" onchange="_kpiAddField(\'category\',this.value)">' + _selOptions(catOpts, a.category) + '</select>') +
    row(_t('Owner', 'Owner'),
      '<select class="kc-input" onchange="_kpiAddField(\'owner_role\',this.value)">' + _roleOptions(a.owner_role) + '</select>') +
    row(_t('Nhịp', 'Cadence'),
      '<select class="kc-input" onchange="_kpiAddField(\'cadence\',this.value)">' + _cadenceOptions(a.cadence) + '</select>') +
    row(_t('Chiều', 'Direction'),
      '<select class="kc-input" onchange="_kpiAddField(\'direction\',this.value)">' + _selOptions(dirOpts, a.direction) + '</select>') +
    row(_t('Đơn vị', 'Unit'),
      '<select class="kc-input" onchange="_kpiAddField(\'unit\',this.value)">' + _selOptions(unitOpts, a.unit) + '</select>') +
    row(_t('Điểm xanh (green_point)', 'Green point'),
      '<input class="kc-input" type="number" step="any" value="' + _esc(a.green_point) +
      '" oninput="_kpiAddField(\'green_point\',this.value)">') +
    row(_t('Điểm vàng (yellow_point)', 'Yellow point'),
      '<input class="kc-input" type="number" step="any" value="' + _esc(a.yellow_point) +
      '" oninput="_kpiAddField(\'yellow_point\',this.value)">') +
    row(_t('Mục tiêu (target)', 'Target'),
      '<input class="kc-input" type="number" step="any" value="' + _esc(a.target) +
      '" oninput="_kpiAddField(\'target\',this.value)">') +
    row(_t('Counter-metric — tên (VI)', 'Counter-metric name (VI)'),
      '<input class="kc-input" type="text" value="' + _esc(a.counter_metric.name_vi) +
      '" placeholder="' + _t('VD: Tỷ lệ lô giao gấp / giao thiếu', 'e.g. Expedited shipment rate') +
      '" oninput="_kpiAddCounter(\'name_vi\',this.value)">') +
    '</div>' +
    _field(_t('Counter-metric — ý nghĩa chống gaming', 'Counter-metric — anti-gaming intent'),
      '<textarea class="kc-input kc-ta" oninput="_kpiAddCounter(\'intent\',this.value)">' + _esc(a.counter_metric.intent) + '</textarea>') +
    _field(_t('Mục đích / cách dùng', 'Purpose / usage'),
      '<textarea class="kc-input kc-ta" oninput="_kpiAddField(\'purpose\',this.value)">' + _esc(a.purpose) + '</textarea>') +
    _field(_t('Data-contract gap bắt buộc', 'Required data-contract gap'),
      '<textarea class="kc-input kc-ta" oninput="_kpiAddField(\'data_contract_gap\',this.value)">' + _esc(a.data_contract_gap) + '</textarea>') +
    _field(_t('Điều kiện graduation bắt buộc', 'Required graduation condition'),
      '<textarea class="kc-input kc-ta" oninput="_kpiAddField(\'target_graduation_condition\',this.value)">' + _esc(a.target_graduation_condition) + '</textarea>') +
    _field(_t('Nguồn evidence dự kiến', 'Expected evidence source'),
      '<textarea class="kc-input kc-ta" oninput="_kpiAddField(\'evidence_source\',this.value)">' + _esc(a.evidence_source) + '</textarea>') +
    _field(_t('Quyết định khi lệch ngưỡng', 'Decision on threshold breach'),
      '<textarea class="kc-input kc-ta" oninput="_kpiAddField(\'decision_action\',this.value)">' + _esc(a.decision_action) + '</textarea>') +
    _field(_t('Blocking conditions (mỗi dòng một điều kiện)', 'Blocking conditions (one per line)'),
      '<textarea class="kc-input kc-ta" oninput="_kpiAddField(\'blocking_conditions\',this.value)">' + _esc(a.blocking_conditions) + '</textarea>') +
    _renderMcsExtAddBlock(a, ext);

  var b = _ragBands({ green_point:parseFloat(a.green_point), yellow_point:parseFloat(a.yellow_point),
    direction:a.direction, unit:a.unit });
  if(b){
    html += '<div class="kc-rag"><span class="kc-badge kc-badge-ok">' + _esc(b.green) + '</span>' +
      '<span class="kc-badge kc-badge-staged">' + _esc(b.yellow) + '</span>' +
      '<span class="kc-badge kc-badge-bad">' + _esc(b.red) + '</span></div>';
  }
  html += '<div class="kc-addform-actions">' +
    '<button class="kc-btn" type="button" onclick="_kpiAddClose()">' + _t('Hủy', 'Cancel') + '</button>' +
    '<button class="kc-btn primary" type="button" onclick="_kpiAddSubmit()">' +
      _t('Thêm proposal vào danh sách lưu', 'Add proposal to save list') + '</button></div>' +
    '<p class="kc-mini">' + _t('Proposal sẽ được ghi khi bấm “Lưu & đồng bộ tài liệu”; vẫn không được score cho tới khi có data contract/runtime hợp lệ.',
      'The proposal is persisted when you click “Save & sync documents”; it is still not scored until a governed data contract/runtime path exists.') + '</p></div>';
  return html;
}

/* Compact display token of a counter-metric — its unique code. */
function _counterDisplay(cm){
  if(cm && typeof cm === 'object') return cm.code || cm.name_vi || '';
  return cm ? String(cm) : '';
}

function _renderLibCard(r){
  var c = function(s){ return _esc(s == null ? '' : s); };
  var b = _ragBands(r.thresholds || {});
  var procLabel = r.process;
  var facets = (_state.config || {}).facets || {};
  (facets.process || []).forEach(function(p){ if(p.key === r.process) procLabel = p.label; });
  var retired = _isRetired(r);
  var code = String(r.canonical_code);
  var key = r.group + ':' + code.toUpperCase();
  var expanded = !r._draft && _state.expandedCode === key;
  var counterName = _counterDisplay(r.counter_metric) || '—';
  var tierLabel = TIER_VI[r.tier] || r.tier;

  /* footer action — retire / restore / drop-draft */
  var action;
  if(r._draft){
    action = '<button class="kc-act kc-act-del" type="button" ' +
      'onclick="_kpiDropDraft(\'' + c(r.group) + '\',' + r._draftIdx + ')">✕ ' +
      _t('Bỏ nháp', 'Drop draft') + '</button>';
  } else if(retired){
    action = '<button class="kc-act kc-act-restore" type="button" ' +
      'onclick="event.stopPropagation();_kpiRestore(\'' + c(r.group) + '\',\'' + c(code) + '\')">↩ ' +
      _t('Khôi phục', 'Restore') + '</button>';
  } else {
    action = '<button class="kc-act kc-act-del" type="button" ' +
      'onclick="event.stopPropagation();_kpiRetire(\'' + c(r.group) + '\',\'' + c(code) + '\')">🗑 ' +
      _t('Ngừng dùng', 'Retire') + '</button>';
  }

  var mainOpen = r._draft ? '' :
    ' onclick="_kpiToggleCard(\'' + c(r.group) + '\',\'' + c(code) + '\')" role="button" tabindex="0" title="' +
    _t('Mở / đóng trình biên tập', 'Open / close the editor') + '"';

  var head = '<div class="kc-lib-card-main"' + mainOpen + '>' +
    '<div class="kc-lib-card-top">' +
      '<span class="kc-code">' + c(code) + '</span>' +
      (r._draft
        ? '<span class="kc-badge kc-badge-manual">' + _t('Bản nháp', 'Draft') + '</span>'
        : '<span class="kc-lib-status">' + _calcBadge(retired ? 'retired' : r.calculation_status) +
          '<span class="kc-caret">' + (expanded ? '▾' : '▸') + '</span></span>') +
    '</div>' +
    '<div class="kc-lib-card-name">' + c(r.name_vi || r.name) + '</div>' +
    '<div class="kc-lib-tags">' +
      '<span class="kc-chip kc-chip-proc">' + c(procLabel) + '</span>' +
      '<span class="kc-chip kc-chip-cat kc-cat-' + c(r.category) + '">' + c(CATEGORY_VI[r.category] || r.category) + '</span>' +
      '<span class="kc-chip">' + c(GROUP_VI[r.group] || r.group) + '</span>' +
      (tierLabel ? '<span class="kc-chip">' + c(tierLabel) + '</span>' : '') +
      (r.gate ? '<span class="kc-chip">' + c(r.gate) + '</span>' : '') +
    '</div>' +
    (b ? '<div class="kc-rag"><span class="kc-badge kc-badge-ok">' + _esc(b.green) + '</span>' +
         '<span class="kc-badge kc-badge-staged">' + _esc(b.yellow) + '</span>' +
         '<span class="kc-badge kc-badge-bad">' + _esc(b.red) + '</span></div>' : '') +
    '<div class="kc-lib-foot">' +
      '<span class="kc-mini">JD: ' + c((r.applicable_jds || []).join(', ') || '—') + '</span>' +
      '<span class="kc-mini" title="' + _t('Counter-metric', 'Counter-metric') + '">↔ ' + c(counterName) + '</span>' +
    '</div></div>';

  return '<div class="kc-lib-card' + (retired ? ' kc-lib-card--retired' : '') +
    (r._draft ? ' kc-lib-card--draft' : '') + (expanded ? ' kc-lib-card--expanded' : '') + '">' +
    head + '<div class="kc-lib-act">' + action + '</div>' +
    (expanded ? '<div class="kc-lib-editor">' + _inlineEditor(r) + '</div>' : '') +
  '</div>';
}

/* Inline editor for an expanded library card — the only place a KPI is
   edited now that the group views are gone. */
function _inlineEditor(r){
  var section = r.group;
  var list = _sectionMetrics(section), metric = null;
  for(var i=0;i<list.length;i++){
    if(list[i].canonical_code === r.canonical_code){ metric = list[i]; break; }
  }
  if(!metric) return '<div class="hm-empty">' + _t('Không mở được trình biên tập.', 'Cannot open the editor.') + '</div>';
  return _renderEditCard(metric, section, true);
}

/* Role / cadence option lists. */
function _roleOptions(selected){
  var roles = (_state.config && _state.config.role_codes) || [];
  return ['<option value=""' + (!selected ? ' selected' : '') + '>—</option>'].concat(
    roles.map(function(r){
      return '<option value="' + _esc(r) + '"' + (r === selected ? ' selected' : '') + '>' + _esc(r) + '</option>';
    })).join('');
}
function _cadenceOptions(selected){
  var opts = (_state.config && _state.config.cadence_options) || [];
  return ['<option value=""' + (!selected ? ' selected' : '') + '>—</option>'].concat(
    opts.map(function(c){
      return '<option value="' + _esc(c) + '"' + (c === selected ? ' selected' : '') + '>' + _esc(c) + '</option>';
    })).join('');
}
/* Calculation status as a compact symbol — runtime ⚙ / manual ✎ / staged ○.
   Full wording is kept in the tooltip so the card stays narrow. */
function _calcBadge(status){
  if(status === 'runtime_calculated')
    return '<span class="kc-stat-sym kc-sym-ok" title="' +
      _t('Tính runtime — số tính tự động từ hệ thống', 'Runtime — computed automatically') +
      '">⚙</span>';
  if(status === 'manual' || status === 'manual_governed')
    return '<span class="kc-stat-sym kc-sym-manual" title="' +
      _t('Nhập tay có kiểm soát — nạp số qua endpoint nhập liệu', 'Manual governed — fed via the data-input endpoint') +
      '">✎</span>';
  if(status === 'retired')
    return '<span class="kc-stat-sym kc-sym-bad" title="' +
      _t('Đã ngừng dùng', 'Retired') + '">⊘</span>';
  return '<span class="kc-stat-sym kc-sym-staged" title="' +
    _t('Chờ hợp đồng dữ liệu — chưa có nguồn số', 'Awaiting data contract — no source yet') +
    '">○</span>';
}

/* Unified edit card for every group. Threshold + counter-metric are
   editable for all metrics; governance KPIs additionally expose owner,
   data steward, cadence, decision and action; gate metrics expose owner
   and cadence. Structural fields (formula, gate, linked_cdr) are read-only. */
function _renderEditCard(m, section, inline){
  var code = m.canonical_code;
  var c = function(s){ return _esc(s == null ? '' : s); };
  var sec = _state.overrides[section] || {};
  var dirty = !!sec[code];
  var hasThresholds = !!(_val(m, section, 'thresholds') || m.thresholds);
  var status = m.calculation_status || (m.status === 'retained_from_annex122' ? 'staged_data_contract' : m.status);

  var html = '<article class="kc-card' + (dirty ? ' kc-card--dirty' : '') +
    (inline ? ' kc-card--inline' : '') + '" data-kpi-code="' + c(code) + '">';
  if(!inline){
    html += '<div class="kc-card-head">' +
      '<div><span class="kc-code">' + c(code) + '</span> ' +
        '<span class="kc-card-name">' + c(m.name_vi || m.name) + '</span></div>' +
      _calcBadge(status) +
    '</div>';
  }

  if(section === 'gate'){
    html += '<div class="kc-mini">' + _t('Cổng', 'Gate') + ' ' + c(m.gate || '—') +
      ' · CDR ' + c((m.linked_cdr || []).join(', ')) + '</div>';
  }
  if(status === 'staged_data_contract'){
    html += '<div class="kc-warn">' + _t('KPI chưa có hợp đồng dữ liệu — nhập số qua endpoint nhập liệu.',
      'KPI has no data contract — feed it via the data-input endpoint.') + '</div>';
  }
  if(status === 'staged_data_contract' || status === 'manual' || status === 'manual_governed'){
    html += '<div class="kc-data-contract">' +
      _field(_t('Data-contract gap', 'Data-contract gap'),
        '<textarea class="kc-input kc-ta" oninput="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'data_contract_gap\',this.value)">' +
        c(_val(m,section,'data_contract_gap')) + '</textarea>') +
      _field(_t('Điều kiện graduation', 'Graduation condition'),
        '<textarea class="kc-input kc-ta" oninput="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'target_graduation_condition\',this.value)">' +
        c(_val(m,section,'target_graduation_condition')) + '</textarea>') +
      _field(_t('Nguồn evidence', 'Evidence source'),
        '<textarea class="kc-input kc-ta" oninput="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'evidence_source\',this.value)">' +
        c(_val(m,section,'evidence_source')) + '</textarea>') +
    '</div>';
  }
  html += _ragPreview(m, section);

  html += '<div class="kc-grid">';
  if(hasThresholds){
    html += _field(_t('Điểm xanh (green_point)', 'Green point'),
        '<input class="kc-input" type="number" step="any" value="' + c(_threshold(m,section,'green_point')) +
        '" oninput="_kpiSetThreshold(\'' + section + '\',\'' + c(code) + '\',\'green_point\',this.value)">') +
      _field(_t('Điểm vàng (yellow_point)', 'Yellow point'),
        '<input class="kc-input" type="number" step="any" value="' + c(_threshold(m,section,'yellow_point')) +
        '" oninput="_kpiSetThreshold(\'' + section + '\',\'' + c(code) + '\',\'yellow_point\',this.value)">') +
      _field(_t('Chiều / đơn vị', 'Direction / unit'),
        '<input class="kc-input" type="text" disabled value="' +
        c((_threshold(m,section,'direction')||'') + ' · ' + (_threshold(m,section,'unit')||'')) + '">');
  } else {
    html += _field(_t('Ngưỡng', 'Thresholds'),
      '<input class="kc-input" type="text" disabled value="' +
      _t('Quản lý ở KPI governance cùng mã', 'Managed on the governance KPI of the same code') + '">');
  }
  if(section === 'governance' || section === 'gate'){
    html += _field(_t('Owner', 'Owner'),
      '<select class="kc-input" onchange="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'owner_role\',this.value)">' +
      _roleOptions(_val(m,section,'owner_role')) + '</select>') +
      _field(_t('Nhịp', 'Cadence'),
      '<select class="kc-input" onchange="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'cadence\',this.value)">' +
      _cadenceOptions(_val(m,section,'cadence')) + '</select>');
  }
  if(section === 'governance'){
    html += _field(_t('Xác nhận dữ liệu', 'Data steward'),
      '<select class="kc-input" onchange="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'data_stewardship_role\',this.value)">' +
      _roleOptions(_val(m,section,'data_stewardship_role')) + '</select>');
  }
  html += '</div>';

  // Dedicated counter-metric — unique code + endpoint (1:1 with the KPI),
  // plus an editable name + anti-gaming intent.
  var ctrCode = c(code) + '-CTR';
  html += '<div class="kc-counter-edit"><div class="kc-counter-head">↔ ' +
    _t('Counter-metric chuyên biệt (chống gaming)', 'Dedicated counter-metric (anti-gaming)') + '</div>' +
    '<div class="kc-counter-id"><span class="kc-code">' + ctrCode + '</span>' +
      '<span class="kc-mini">POST /api/kpi/' + ctrCode + '/input</span></div>' +
    _field(_t('Tên counter-metric (tiếng Việt)', 'Counter-metric name (VI)'),
      '<input class="kc-input" type="text" value="' + c(_counterVal(m,section,'name_vi')) +
      '" oninput="_kpiSetCounter(\'' + section + '\',\'' + c(code) + '\',\'name_vi\',this.value)">') +
    _field(_t('Ý nghĩa — phát hiện gaming khi nào', 'Intent — what gaming it detects'),
      '<textarea class="kc-input kc-ta" oninput="_kpiSetCounter(\'' + section + '\',\'' + c(code) + '\',\'intent\',this.value)">' +
      c(_counterVal(m,section,'intent')) + '</textarea>') +
    '</div>';

  if(hasThresholds){
    html += _field(_t('Căn cứ ngưỡng', 'Threshold basis'),
      '<textarea class="kc-input kc-ta" oninput="_kpiSetThreshold(\'' + section + '\',\'' + c(code) + '\',\'basis\',this.value)">' +
      c(_threshold(m,section,'basis')) + '</textarea>');
  }
  if(section === 'governance'){
    html += _field(_t('Quyết định khi lệch ngưỡng', 'Decision on threshold breach'),
      '<textarea class="kc-input kc-ta" oninput="_kpiSetField(\'governance\',\'' + c(code) + '\',\'decision_action\',this.value)">' +
      c(_val(m,section,'decision_action')) + '</textarea>') +
      _field(_t('Tham chiếu hành động (CDR / SOP / WI)', 'Action reference (CDR / SOP / WI)'),
      '<textarea class="kc-input kc-ta" oninput="_kpiSetField(\'governance\',\'' + c(code) + '\',\'action_reference\',this.value)">' +
      c(_val(m,section,'action_reference')) + '</textarea>');
  }

  // Audit fix (Prompt 01 §1.4): blocking_conditions was editable only on add.
  // Expose on edit too — multi-line list, one condition per line.
  var blkRaw = _val(m, section, 'blocking_conditions');
  var blkText = '';
  if(blkRaw && blkRaw.length){
    blkText = blkRaw.join('\n');
  } else if(m.blocking_conditions && m.blocking_conditions.length){
    blkText = m.blocking_conditions.join('\n');
  }
  html += '<div class="kc-blocker-edit">' +
    _field(_t('Điều kiện chặn (mỗi dòng một mục)', 'Blocking conditions (one per line)'),
      '<textarea class="kc-input kc-ta" rows="3" oninput="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'blocking_conditions\',this.value)">' +
      _esc(blkText) + '</textarea>') +
    '</div>';

  // MCS-EXT-1 block (Metric Control Schema extension fields).
  // Collapsed by default — admin opens it explicitly to enrich a metric.
  html += _renderMcsExtBlock(m, section, code);

  return html + '</article>';
}

/* MCS-EXT-1 fields block for the Add wizard.
   Surfaces the 8-step extension axes inline so a new metric is born with
   complete control semantics. All fields optional — defaults preserve
   legacy behavior. */
function _renderMcsExtAddBlock(a, ext){
  if(!ext || !ext.metric_subtypes){ return ''; } // schema not yet loaded
  var enumSel = function(field, current, options){
    var opts = ['<option value="">— ' + _t('chưa đặt', 'unset') + ' —</option>'];
    (options || []).forEach(function(opt){
      opts.push('<option value="' + _esc(opt) + '"' + (opt === current ? ' selected' : '') + '>' + _esc(opt) + '</option>');
    });
    return '<select class="kc-input" onchange="_kpiAddField(\'' + field + '\',this.value)">' + opts.join('') + '</select>';
  };
  var scoringOpts = ext.scoring_model || [];
  if(a.metric_subtype && ext.scoring_model_by_metric_subtype && ext.scoring_model_by_metric_subtype[a.metric_subtype]){
    scoringOpts = ext.scoring_model_by_metric_subtype[a.metric_subtype];
  }
  var grid = '<div class="kc-grid">' +
    _field(_t('Ý đồ kiểm soát (control_intent) — bước 1', 'Control intent — step 1'),
      enumSel('control_intent', a.control_intent || '', ext.control_intent)) +
    _field(_t('Metric subtype — bước 2', 'Metric subtype — step 2'),
      enumSel('metric_subtype', a.metric_subtype || '', ext.metric_subtypes)) +
    _field(_t('Kiểu dữ liệu đo — bước 3', 'Measurement data type — step 3'),
      enumSel('measurement_data_type', a.measurement_data_type || '', ext.measurement_data_type)) +
    _field(_t('Mô hình tính điểm — bước 4', 'Scoring model — step 4'),
      enumSel('scoring_model_detail', a.scoring_model_detail || '', scoringOpts)) +
    _field(_t('Mục đích đánh giá — bước 6a', 'Evaluation use — step 6a'),
      enumSel('evaluation_use', a.evaluation_use || '', ext.evaluation_use)) +
    _field(_t('Chế độ thưởng — bước 6b', 'Reward mode — step 6b'),
      enumSel('reward_mode', a.reward_mode || '', ext.reward_mode)) +
    _field(_t('Vòng đời — bước 8', 'Lifecycle status — step 8'),
      enumSel('lifecycle_status', a.lifecycle_status || '', ext.lifecycle_status)) +
    _field(_t('KPI ghép cặp — bước 8', 'Paired metric — step 8'),
      '<input class="kc-input" type="text" value="' + _esc(a.paired_metric || '') +
      '" placeholder="VD: FPY" oninput="_kpiAddField(\'paired_metric\',this.value)">') +
    '</div>';
  return '<details class="kc-mcs-ext" open><summary>⚙ ' +
    _t('Metric Control Schema (MCS-EXT-1) — các bước mở rộng',
       'Metric Control Schema (MCS-EXT-1) — extension steps') + '</summary>' + grid + '</details>';
}

/* MCS-EXT-1 progressive enrichment block — all fields optional.
   Enum dropdowns read live from _state.config.metric_control_schema_extension
   so the registry stays the single source of enum membership. */
function _renderMcsExtBlock(m, section, code){
  var c = function(s){ return _esc(s == null ? '' : s); };
  var ext = (_state.config && _state.config.metric_control_schema_extension) || {};
  if(!ext || !ext.metric_subtypes){ return ''; } // schema not yet loaded
  var subtype = _val(m, section, 'metric_subtype') || m.metric_subtype || '';
  var intent  = _val(m, section, 'control_intent') || m.control_intent || '';
  var measure = _val(m, section, 'measurement_data_type') || m.measurement_data_type || '';
  var scoring = _val(m, section, 'scoring_model_detail') || m.scoring_model_detail || '';
  var evalUse = _val(m, section, 'evaluation_use') || m.evaluation_use || '';
  var reward  = _val(m, section, 'reward_mode') || m.reward_mode || '';
  var paired  = _val(m, section, 'paired_metric') || m.paired_metric || '';
  var attrib  = _val(m, section, 'attribution_rule') || m.attribution_rule || '';
  var lifecyc = _val(m, section, 'lifecycle_status') || m.lifecycle_status || '';
  var anyExt  = !!(subtype || intent || measure || scoring || evalUse || reward || paired || attrib || lifecyc);
  var openAttr = anyExt ? ' open' : '';

  // Dynamic scoring options narrowed to subtype if available.
  var scoringOpts = ext.scoring_model || [];
  if(subtype && ext.scoring_model_by_metric_subtype && ext.scoring_model_by_metric_subtype[subtype]){
    scoringOpts = ext.scoring_model_by_metric_subtype[subtype];
  }
  var enumSel = function(field, current, options){
    var opts = ['<option value="">— ' + _t('chưa đặt', 'unset') + ' —</option>'];
    (options || []).forEach(function(opt){
      opts.push('<option value="' + _esc(opt) + '"' + (opt === current ? ' selected' : '') + '>' + _esc(opt) + '</option>');
    });
    return '<select class="kc-input" onchange="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'' + field + '\',this.value)">' +
      opts.join('') + '</select>';
  };

  var body = '<div class="kc-grid">' +
    _field(_t('Phân loại con (metric_subtype)', 'Metric subtype'), enumSel('metric_subtype', subtype, ext.metric_subtypes)) +
    _field(_t('Ý đồ kiểm soát (control_intent)', 'Control intent'), enumSel('control_intent', intent, ext.control_intent)) +
    _field(_t('Kiểu dữ liệu đo', 'Measurement data type'), enumSel('measurement_data_type', measure, ext.measurement_data_type)) +
    _field(_t('Mô hình tính điểm', 'Scoring model'), enumSel('scoring_model_detail', scoring, scoringOpts)) +
    _field(_t('Mục đích đánh giá', 'Evaluation use'), enumSel('evaluation_use', evalUse, ext.evaluation_use)) +
    _field(_t('Chế độ thưởng', 'Reward mode'), enumSel('reward_mode', reward, ext.reward_mode)) +
    _field(_t('Vòng đời', 'Lifecycle status'), enumSel('lifecycle_status', lifecyc, ext.lifecycle_status)) +
    _field(_t('KPI ghép cặp (paired_metric)', 'Paired metric'),
      '<input class="kc-input" type="text" value="' + c(paired) +
      '" placeholder="VD: FPY" oninput="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'paired_metric\',this.value)">') +
    '</div>' +
    _field(_t('Quy tắc quy trách nhiệm (attribution_rule)', 'Attribution rule'),
      '<textarea class="kc-input kc-ta" rows="2" placeholder="rule:plan_adherence_breakdown_by_cause" oninput="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'attribution_rule\',this.value)">' +
      c(attrib) + '</textarea>');

  return '<details class="kc-mcs-ext"' + openAttr + '>' +
    '<summary>⚙ ' + _t('Metric Control Schema (MCS-EXT-1) — mở rộng', 'Metric Control Schema (MCS-EXT-1) — extended attributes') +
    (anyExt ? ' <span class="kc-pill kc-pill--accent">' + _t('đã có dữ liệu', 'has data') + '</span>' : '') +
    '</summary>' + body + '</details>';
}

function _field(label, control){
  return '<div class="kc-f"><label>' + _esc(label) + '</label>' + control + '</div>';
}

/* DOM id of a card's RAG badge box, so threshold edits can refresh it
   in place without a full re-render (keeps the number input focused). */
function _ragNodeId(section, code){
  return 'kc-rag-' + section + '-' + String(code).replace(/[^A-Za-z0-9_]/g, '');
}

/* The xanh/vàng/đỏ badge box — the recognizable graphic that proves a
   KPI's bands are bound to the Authority registry's numeric thresholds.
   Carries data-kpi-authority so a reader (and the ANNEX renderer) can
   tell a system-linked KPI from a hardcoded one. */
function _ragBadgeBox(m, section){
  var t = _val(m, section, 'thresholds') || m.thresholds || {};
  var b = _ragBands(t);
  if(!b){
    return '<div class="kc-rag kc-rag--unlinked" title="' +
      _t('KPI chưa có ngưỡng số trong Authority', 'KPI has no numeric thresholds in the Authority') +
      '">' + _t('Chưa gắn ngưỡng số', 'No numeric thresholds') + '</div>';
  }
  return '<div class="kc-rag kc-rag--linked" data-kpi-authority="linked" data-kpi-code="' +
      _esc(m.canonical_code) + '">' +
    '<span class="kc-badge kc-badge-ok">' + _esc(b.green) + '</span>' +
    '<span class="kc-badge kc-badge-staged">' + _esc(b.yellow) + '</span>' +
    '<span class="kc-badge kc-badge-bad">' + _esc(b.red) + '</span>' +
    '<span class="kc-rag-mark" title="' +
      _t('Ngưỡng đồng bộ từ Authority KPI — đổi điểm xanh/vàng là hộp này đổi theo',
         'Bands are bound to the KPI Authority — editing the green/yellow points updates this box') +
      '">🔗 Authority</span>' +
  '</div>';
}

/* Live RAG-band preview, wrapped in an id'd node for in-place refresh. */
function _ragPreview(m, section){
  return '<div id="' + _ragNodeId(section, m.canonical_code) + '">' +
    _ragBadgeBox(m, section) + '</div>';
}

/* Re-render only one card's RAG box from the current (edited) thresholds. */
function _refreshRag(section, code){
  var node = document.getElementById(_ragNodeId(section, code));
  if(!node) return;
  var list = _sectionMetrics(section), metric = null;
  for(var i=0;i<list.length;i++){ if(list[i].canonical_code===code){ metric=list[i]; break; } }
  if(metric) node.innerHTML = _ragBadgeBox(metric, section);
}

/* ── Styles — Graphics Authority tokens only ──────────────────────── */
function _styleBlock(){
  return '<style>' +
  '.kpi-console{display:flex;flex-direction:column;gap:14px;color:var(--text-1)}' +
  '.kc-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start}' +
  '.kc-eyebrow{font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:var(--text-3)}' +
  '.kc-head h2{margin:4px 0;font-size:20px;color:var(--text-1)}' +
  '.kc-head p{margin:0;font-size:13px;color:var(--text-2);max-width:60ch}' +
  '.kc-actions{display:flex;gap:8px;flex-wrap:wrap}' +
  '.kc-btn{border:1px solid var(--border);background:var(--surface);color:var(--text-1);' +
    'border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}' +
  '.kc-btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}' +
  '.kc-btn[disabled]{opacity:.5;cursor:not-allowed}' +
  '.kc-alert{border-radius:8px;padding:9px 12px;font-size:13px}' +
  '.kc-alert.error{background:var(--danger-soft);color:var(--danger);border:1px solid var(--danger)}' +
  '.kc-alert.ok{background:var(--success-soft);color:var(--success);border:1px solid var(--success)}' +
  '.kc-field label{display:block;font-size:12px;color:var(--text-3);margin-bottom:4px}' +
  '.kc-reason{width:100%;min-height:48px;border:1px solid var(--border);border-radius:8px;' +
    'padding:8px;font-size:13px;background:var(--surface);color:var(--text-1)}' +
  '.kc-tabs{display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid var(--border);padding-bottom:6px}' +
  '.kc-tab{border:1px solid var(--border);background:var(--surface);color:var(--text-2);' +
    'border-radius:8px;padding:7px 10px;font-size:12px;white-space:nowrap;cursor:pointer}' +
  '.kc-tab.is-active{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}' +
  '.kc-panel{border:1px solid var(--border);border-radius:10px;background:var(--surface);' +
    'padding:14px;display:flex;flex-direction:column;gap:12px}' +
  '.kc-panel-head{display:flex;justify-content:space-between;gap:12px;align-items:center}' +
  '.kc-panel h3,.kc-panel h4{margin:0;color:var(--text-1)}' +
  '.kc-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}' +
  '.kc-summary{border:1px solid var(--border);background:var(--surface-2);border-radius:8px;' +
    'padding:10px;display:flex;flex-direction:column;gap:4px}' +
  '.kc-summary span{font-size:11px;color:var(--text-2)}.kc-summary b{font-size:20px;color:var(--accent)}' +
  '.kc-metric-split{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}' +
  '.kc-pill-list{display:flex;gap:6px;flex-wrap:wrap}.kc-pill{font-size:11px;border-radius:999px;padding:3px 8px;' +
    'background:var(--surface-2);color:var(--text-2)}' +
  '.kc-integrity{font-size:11px;font-weight:700;border-radius:999px;padding:4px 9px}' +
  '.kc-integrity-pass{background:var(--success-soft);color:var(--success)}' +
  '.kc-integrity-warn{background:var(--warning-soft);color:var(--warning)}' +
  '.kc-integrity-fail{background:var(--danger-soft);color:var(--danger)}' +
  '.kc-finding-list{display:flex;flex-direction:column;gap:8px}.kc-finding{border:1px solid var(--border);' +
    'border-radius:8px;padding:8px;background:var(--surface-2);display:grid;grid-template-columns:auto auto 1fr;gap:6px}' +
  '.kc-finding p{grid-column:1/-1;margin:0;font-size:12px;color:var(--text-2)}' +
  '.kc-gate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}' +
  '.kc-gate{border:1px solid var(--border);background:var(--surface-2);border-radius:8px;padding:9px;' +
    'display:flex;flex-direction:column;gap:3px}' +
  '.kc-data-contract{border:1px solid var(--warning);border-radius:8px;padding:8px;' +
    'background:var(--warning-soft);display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}' +
  '.kc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}' +
  '.kc-stat{border:1px solid var(--border);border-radius:10px;background:var(--surface-2);' +
    'padding:14px;display:flex;flex-direction:column;gap:4px}' +
  '.kc-stat-v{font-size:22px;font-weight:700;color:var(--accent)}' +
  '.kc-stat-l{font-size:12px;color:var(--text-2)}' +
  '.kc-meta{font-size:12px;color:var(--text-3);margin:0}' +
  '.kc-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}' +
  '.kc-tile{text-align:left;border:1px solid var(--border);border-radius:10px;' +
    'background:var(--surface);padding:14px;cursor:pointer;display:flex;flex-direction:column;gap:6px}' +
  '.kc-tile-top{display:flex;justify-content:space-between;align-items:center}' +
  '.kc-tile-name{font-weight:700;font-size:14px;color:var(--text-1)}' +
  '.kc-tile-count{font-size:18px;font-weight:700;color:var(--accent)}' +
  '.kc-tile-desc{font-size:12px;color:var(--text-2)}' +
  '.kc-tag{align-self:flex-start;font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px}' +
  '.kc-tag-edit{background:var(--accent-soft);color:var(--accent)}' +
  '.kc-tag-ro{background:var(--surface-2);color:var(--text-3)}' +
  '.kc-nav{display:flex;align-items:center;gap:10px}' +
  '.kc-nav-title{font-weight:700;font-size:15px}' +
  '.kc-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}' +
  '.kc-card{border:1px solid var(--border);border-radius:10px;background:var(--surface);' +
    'padding:13px;display:flex;flex-direction:column;gap:8px}' +
  '.kc-card--dirty{border-color:var(--accent);box-shadow:inset 3px 0 0 var(--accent)}' +
  '.kc-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}' +
  '.kc-code{font-family:var(--mono,monospace);font-size:11px;background:var(--surface-2);' +
    'padding:2px 6px;border-radius:5px}' +
  '.kc-card-name{font-size:13px;font-weight:600}' +
  '.kc-badge{font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}' +
  '.kc-badge-ok{background:var(--success-soft);color:var(--success)}' +
  '.kc-badge-staged{background:var(--warning-soft);color:var(--warning)}' +
  '.kc-badge-manual{background:var(--accent-soft);color:var(--accent)}' +
  '.kc-badge-bad{background:var(--danger-soft);color:var(--danger)}' +
  '.kc-rag{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 4px;align-items:center}' +
  '.kc-rag--linked{border:1px dashed var(--success);border-radius:8px;' +
    'padding:5px 8px;background:var(--success-soft)}' +
  '.kc-rag--unlinked{font-size:11px;color:var(--text-3);' +
    'border:1px dashed var(--border);border-radius:8px;padding:5px 8px}' +
  '.kc-rag-mark{font-size:10px;font-weight:700;color:var(--success);' +
    'margin-left:2px;letter-spacing:.2px}' +
  '.kc-warn{font-size:11px;color:var(--warning);background:var(--warning-soft);' +
    'border-radius:6px;padding:5px 8px}' +
  '.kc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}' +
  '.kc-f{display:flex;flex-direction:column;gap:3px}' +
  '.kc-f label{font-size:11px;color:var(--text-3)}' +
  '.kc-input{border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;' +
    'background:var(--surface);color:var(--text-1);width:100%}' +
  '.kc-ta{min-height:54px;resize:vertical;font-family:inherit}' +
  '.kc-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:10px}' +
  '.kc-table{width:100%;border-collapse:collapse;font-size:12px}' +
  '.kc-table th{text-align:left;padding:8px 10px;background:var(--surface-2);' +
    'color:var(--text-2);font-size:11px;text-transform:uppercase}' +
  '.kc-table td{padding:8px 10px;border-top:1px solid var(--border);vertical-align:top}' +
  '.kc-mini{font-size:11px;color:var(--text-3)}' +
  /* ── KPI Library ── */
  '.kc-lib-cta{display:flex;align-items:center;gap:14px;width:100%;text-align:left;cursor:pointer;' +
    'border:1px solid var(--accent);border-radius:12px;padding:14px 18px;' +
    'background:var(--accent-soft)}' +
  '.kc-lib-cta-ico{font-size:26px}' +
  '.kc-lib-cta-txt{display:flex;flex-direction:column;gap:2px;flex:1}' +
  '.kc-lib-cta-txt b{font-size:15px;color:var(--text-1)}' +
  '.kc-lib-cta-txt span{font-size:12px;color:var(--text-2)}' +
  '.kc-lib-cta-go{font-size:22px;color:var(--accent)}' +
  '.kc-filterbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;' +
    'border:1px solid var(--border);border-radius:10px;padding:10px;' +
    'background:var(--surface-2)}' +
  '.kc-search{flex:1;min-width:180px;border:1px solid var(--border);border-radius:7px;' +
    'padding:7px 10px;font-size:13px;background:var(--surface);color:var(--text-1)}' +
  '.kc-filterbar .kc-input{width:auto;min-width:150px;flex:0 0 auto}' +
  '.kc-result-head{font-size:13px;color:var(--text-2);padding:2px 2px}' +
  '.kc-result-head b{color:var(--accent);font-size:15px}' +
  '.kc-lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}' +
  '.kc-lib-card{text-align:left;display:flex;flex-direction:column;gap:7px;' +
    'border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)}' +
  '.kc-lib-card[role=button]{cursor:pointer}' +
  '.kc-lib-card[role=button]:hover{border-color:var(--accent);box-shadow:var(--shadow-sm)}' +
  '.kc-lib-card--retired{opacity:.62;background:var(--surface-2)}' +
  '.kc-lib-card--draft{border-color:var(--accent);border-style:dashed}' +
  '.kc-lib-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '.kc-lib-card-name{font-size:13px;font-weight:600;color:var(--text-1)}' +
  '.kc-lib-tags{display:flex;gap:4px;flex-wrap:wrap}' +
  '.kc-chip{font-size:10px;border-radius:999px;padding:2px 8px;' +
    'background:var(--surface-2);color:var(--text-2)}' +
  '.kc-chip-proc{background:var(--accent-soft);color:var(--accent)}' +
  '.kc-cat-supplier{background:var(--warning-soft);color:var(--warning)}' +
  '.kc-cat-customer{background:var(--info-soft);color:var(--info)}' +
  '.kc-cat-safety{background:var(--danger-soft);color:var(--danger)}' +
  '.kc-cat-financial{background:var(--success-soft);color:var(--success)}' +
  '.kc-cat-system{background:var(--accent-soft);color:var(--accent)}' +
  '.kc-lib-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;' +
    'border-top:1px solid var(--border);padding-top:6px}' +
  '.kc-lib-act{display:flex;justify-content:flex-end}' +
  '.kc-act{font-size:11px;font-weight:600;border-radius:6px;padding:4px 10px;cursor:pointer;' +
    'border:1px solid var(--border);background:var(--surface)}' +
  '.kc-act-del{color:var(--danger);border-color:var(--danger)}' +
  '.kc-act-restore{color:var(--success);border-color:var(--success)}' +
  '.kc-nav-spacer{flex:1}' +
  '.kc-addform{border:1px solid var(--accent);border-radius:12px;padding:16px;' +
    'background:var(--surface);display:flex;flex-direction:column;gap:10px}' +
  '.kc-addform h3{margin:0;font-size:16px;color:var(--text-1)}' +
  '.kc-addform-actions{display:flex;gap:8px;justify-content:flex-end}' +
  /* ── library-only console: status symbols, expandable cards ── */
  '.kc-stat-sym{font-size:14px;line-height:1;cursor:help;border-radius:999px;' +
    'width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center}' +
  '.kc-sym-ok{background:var(--success-soft);color:var(--success)}' +
  '.kc-sym-manual{background:var(--accent-soft);color:var(--accent)}' +
  '.kc-sym-staged{background:var(--warning-soft);color:var(--warning)}' +
  '.kc-sym-bad{background:var(--danger-soft);color:var(--danger)}' +
  '.kc-lib-status{display:inline-flex;align-items:center;gap:4px}' +
  '.kc-caret{font-size:11px;color:var(--text-3)}' +
  '.kc-lib-card-main{display:flex;flex-direction:column;gap:7px}' +
  '.kc-lib-card-main[role=button]{cursor:pointer}' +
  '.kc-lib-card--expanded{grid-column:1/-1;border-color:var(--accent);' +
    'box-shadow:var(--shadow-md)}' +
  '.kc-lib-editor{margin-top:8px;border-top:1px solid var(--border);padding-top:8px}' +
  '.kc-card--inline{border:0;padding:0;gap:8px}' +
  '.kc-counter-edit{border:1px solid var(--border);border-radius:8px;' +
    'padding:8px 10px;display:flex;flex-direction:column;gap:6px;background:var(--surface-2)}' +
  '.kc-counter-head{font-size:11px;font-weight:700;color:var(--text-2);' +
    'text-transform:uppercase;letter-spacing:.3px}' +
  '.kc-counter-id{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
  /* per-JD weighted KPI scorecard */
  '.kc-scorecard{border:1px solid var(--accent);border-radius:10px;' +
    'background:var(--accent-soft);padding:12px;display:flex;flex-direction:column;gap:6px}' +
  '.kc-sc-head{font-size:13px;font-weight:700;color:var(--text-1)}' +
  '.kc-sc-row{display:flex;align-items:center;gap:8px}' +
  '.kc-sc-bar{flex:0 0 120px;height:10px;border-radius:999px;background:var(--surface);' +
    'overflow:hidden;border:1px solid var(--border)}' +
  '.kc-sc-fill{display:block;height:100%;background:var(--accent)}' +
  '.kc-sc-w{flex:0 0 40px;font-size:12px;font-weight:700;color:var(--accent);text-align:right}' +
  '.kc-sc-why{flex:1}' +
  /* MCS-EXT-1 styling — Graphics Authority tokens only */
  '.kc-mcs-ext{border:1px solid var(--border);border-radius:8px;padding:8px 10px;' +
    'background:var(--surface-2);margin-top:8px}' +
  '.kc-mcs-ext>summary{font-size:12px;font-weight:700;color:var(--text-2);' +
    'text-transform:uppercase;letter-spacing:.3px;cursor:pointer;outline:none}' +
  '.kc-mcs-ext[open]{background:var(--surface)}' +
  '.kc-mcs-ext>div{margin-top:8px}' +
  '.kc-blocker-edit{border:1px solid var(--warning);border-radius:8px;padding:8px 10px;' +
    'background:var(--warning-soft);margin-top:8px}' +
  '.kc-pill--accent{background:var(--accent-soft);color:var(--accent);' +
    'border:1px solid var(--accent)}' +
  '.kc-wiz-steps{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}' +
  '.kc-wiz-step{font-size:11px;border:1px solid var(--border);border-radius:999px;' +
    'padding:3px 8px;color:var(--text-3);background:var(--surface)}' +
  '.kc-wiz-step--active{border-color:var(--accent);color:var(--accent);' +
    'background:var(--accent-soft);font-weight:700}' +
  '.kc-wiz-step--done{border-color:var(--success);color:var(--success)}' +
  '</style>';
}

/* ── Add / retire KPI ─────────────────────────────────────────────── */
function _addSubmit(){
  var a = _state.addForm;
  if(!a) return;
  var code = String(a.canonical_code || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  if(!code){
    _state.error = _t('Cần nhập mã KPI hợp lệ (A–Z, 0–9, _).', 'Enter a valid KPI code (A–Z, 0–9, _).');
    _render(); return;
  }
  if(_libRows().some(function(r){ return String(r.canonical_code).toUpperCase() === code; })){
    _state.error = _t('Mã KPI đã tồn tại: ', 'KPI code already exists: ') + code;
    _render(); return;
  }
  if(!a.name_vi && !a.name){
    _state.error = _t('Cần nhập tên KPI.', 'Enter a KPI name.');
    _render(); return;
  }
  var gp = parseFloat(a.green_point), yp = parseFloat(a.yellow_point);
  if(isNaN(gp) || isNaN(yp)){
    _state.error = _t('Cần nhập điểm xanh và điểm vàng (dạng số).',
      'Green and yellow points are required numbers.');
    _render(); return;
  }
  if(a.direction === 'higher_is_better' && gp < yp){
    _state.error = _t('Cao hơn là tốt: điểm xanh phải ≥ điểm vàng.',
      'higher_is_better: green point must be ≥ yellow point.');
    _render(); return;
  }
  if(a.direction === 'lower_is_better' && gp > yp){
    _state.error = _t('Thấp hơn là tốt: điểm xanh phải ≤ điểm vàng.',
      'lower_is_better: green point must be ≤ yellow point.');
    _render(); return;
  }
  if(!String(a.data_contract_gap || '').trim() || !String(a.target_graduation_condition || '').trim()){
    _state.error = _t('Cần nhập data-contract gap và điều kiện graduation cho metric staged.',
      'Data-contract gap and graduation condition are required for a staged metric.');
    _render(); return;
  }
  var thr = { direction:a.direction, unit:a.unit, green_point:gp, yellow_point:yp };
  var tgt = parseFloat(a.target);
  if(!isNaN(tgt)) thr.target = tgt;
  var cm = a.counter_metric || {};
  var counter = (cm.name_vi || cm.intent)
    ? { name_vi:(cm.name_vi || ''), name:(cm.name || cm.name_vi || ''), intent:(cm.intent || '') }
    : null;
  var row = {
    canonical_code:code, name:(a.name || a.name_vi), name_vi:(a.name_vi || a.name),
    tier:(a.group === 'governance') ? (a.tier || 'department') : '',
    process:a.process || 'unclassified', category:a.category || 'internal',
    owner_role:a.owner_role || '', counter_metric:counter,
    cadence:a.cadence || 'monthly', purpose:a.purpose || '', thresholds:thr,
    decision_action:a.decision_action || '',
    data_contract_gap:a.data_contract_gap || '',
    target_graduation_condition:a.target_graduation_condition || '',
    evidence_source:a.evidence_source || '',
    blocking_conditions:String(a.blocking_conditions || '').split(/\n+/).map(function(x){ return x.trim(); }).filter(Boolean)
  };
  // MCS-EXT-1 fields — pass through only when explicitly set so the row
  // stays compatible with legacy validators.
  ['metric_subtype','control_intent','measurement_data_type','scoring_model_detail',
   'evaluation_use','reward_mode','paired_metric','attribution_rule','lifecycle_status'
  ].forEach(function(k){ if(a[k]) row[k] = a[k]; });
  if(!_state.addedDraft[a.group]) _state.addedDraft[a.group] = [];
  _state.addedDraft[a.group].push(row);
  _state.addForm = null;
  _state.error = '';
  _state.message = _t('Đã thêm proposal metric: ', 'Draft metric proposal added: ') + code + ' — ' +
    _t('bấm “Lưu & đồng bộ tài liệu” để ghi.', 'click “Save & sync documents” to persist.');
  _render();
}

/* ── Window-exposed handlers ──────────────────────────────────────── */
window._kpiReload    = function(){ _state.config = null; _load(); };
window._kpiReset     = function(){ _reset(); };
window._kpiSave      = function(){ _save(); };
window._kpiSetReason = function(v){ _setReason(v); };
window._kpiSetField  = function(section, code, field, value){ _setField(section, code, field, value); };
window._kpiSetThreshold = function(section, code, key, value){ _setThreshold(section, code, key, value); };
window._kpiSetCounter = function(section, code, key, value){ _setCounter(section, code, key, value); };
window._kpiSetFilter = function(key, value){ _setFilter(key, value); };
window._kpiSetView = function(view){
  _state.activeView = view || 'overview';
  _state.addForm = null;
  _state.expandedCode = '';
  _render();
};
window._kpiClearFilters = function(){
  _state.filters = { process:'', category:'', group:'', tier:'', jd:'', status:'', search:'', retired:'',
    metric_subtype:'', control_intent:'', evaluation_use:'', reward_mode:'', lifecycle_status:'' };
  _render();
};
/* Toggle the inline editor for one library card (only one open at a time). */
window._kpiToggleCard = function(group, code){
  var key = group + ':' + String(code).toUpperCase();
  _state.expandedCode = (_state.expandedCode === key) ? '' : key;
  _render();
};
window._kpiAddOpen   = function(){ _state.addForm = _newAddForm(); _state.error = ''; _state.message = ''; _render(); };
window._kpiAddClose  = function(){ _state.addForm = null; _render(); };
window._kpiAddField  = function(key, value){ _afSet(key, value); };
window._kpiAddCounter = function(key, value){
  if(!_state.addForm) return;
  if(!_state.addForm.counter_metric) _state.addForm.counter_metric = {};
  _state.addForm.counter_metric[key] = value;
};
window._kpiAddSubmit = function(){ _addSubmit(); };
window._kpiRetire    = function(group, code){
  code = String(code).toUpperCase();
  if(!_state.retired[group]) _state.retired[group] = [];
  if(_state.retired[group].indexOf(code) < 0) _state.retired[group].push(code);
  _state.message = _t('Đã đánh dấu ngừng dùng: ', 'Marked for retirement: ') + code;
  _render();
};
window._kpiRestore   = function(group, code){
  code = String(code).toUpperCase();
  var list = _state.retired[group] || [];
  _state.retired[group] = list.filter(function(c){ return c !== code; });
  _render();
};
window._kpiDropDraft = function(group, idx){
  var list = _state.addedDraft[group] || [];
  if(idx >= 0 && idx < list.length) list.splice(idx, 1);
  _render();
};

})();
