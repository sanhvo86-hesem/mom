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

/* All KPI groups are uniformly editable — thresholds + counter-metric. */
var GROUPS = [
  { key:'company',      tier:'company',      section:'governance', editable:true,
    vi:'KPI cấp công ty', en:'Company KPIs',
    descVi:'KPI lãnh đạo — giao hàng, chất lượng, an toàn, biên lợi nhuận.',
    descEn:'Leadership KPIs — delivery, quality, safety, margin.' },
  { key:'value_stream', tier:'value_stream', section:'governance', editable:true,
    vi:'KPI value-stream', en:'Value-stream KPIs',
    descVi:'KPI hiệu lực RFQ → Plan → sản xuất → Ship → Hóa đơn.',
    descEn:'Value-stream effectiveness KPIs.' },
  { key:'department',   tier:'department',   section:'governance', editable:true,
    vi:'KPI phòng ban', en:'Department KPIs',
    descVi:'KPI trong phạm vi kiểm soát của từng phòng ban.',
    descEn:'Department-scoped KPIs.' },
  { key:'gate',         tier:null,           section:'gate',      editable:true,
    vi:'Gate metric', en:'Gate metrics',
    descVi:'Metric đo điều kiện pass cổng G0→G7 — chỉnh ngưỡng & counter-metric.',
    descEn:'Gate pass-condition metrics G0→G7 — editable thresholds & counter.' },
  { key:'proposed',     tier:null,           section:'proposed',  editable:true,
    vi:'Metric đề xuất', en:'Proposed metrics',
    descVi:'Metric TOC / Lean đề xuất — chỉnh ngưỡng & counter-metric.',
    descEn:'Proposed TOC / Lean metrics — editable thresholds & counter.' }
];

var _state = {
  loading:false, saving:false, error:'', message:'',
  config:null,
  /* overrides keyed by section then code */
  overrides:{ governance:{}, gate:{}, proposed:{} },
  reason:'', activeGroup:'overview',
  /* KPI Library filters */
  filters:{ process:'', category:'', group:'', jd:'', status:'', search:'' }
};

/* Group key → section, for jumping from a library row to its editor. */
var _GROUP_OF_SECTION = { governance:'company', gate:'gate', proposed:'proposed' };

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
    reason: _state.reason || ''
  }, 'POST', 90000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'save_failed');
      _state.config = data.config || {};
      _state.overrides = { governance:{}, gate:{}, proposed:{} };
      _state.reason = '';
      _state.message = _t('Đã lưu và đồng bộ ANNEX-122.', 'Saved and synced ANNEX-122.')
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
function _kpisByTier(tier){
  return _kpis().filter(function(k){ return k.tier === tier; });
}
function _sectionMetrics(section){
  if(!_state.config) return [];
  if(section === 'gate') return _state.config.gate_control_metrics || [];
  if(section === 'proposed') return _state.config.proposed_operating_metrics || [];
  return _kpis();
}
function _dirty(){
  var o = _state.overrides;
  return Object.keys(o.governance||{}).length
       + Object.keys(o.gate||{}).length
       + Object.keys(o.proposed||{}).length > 0;
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
  _state.reason = '';
  _state.error = ''; _state.message = _t('Đã hoàn tác các thay đổi chưa lưu.', 'Reverted unsaved changes.');
  _render();
}
function _go(group){
  _state.activeGroup = group || 'overview';
  _render();
  var host = _el || document.getElementById('admin-content');
  if(host && host.scrollIntoView) host.scrollIntoView({ block:'start' });
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
  var group = _state.activeGroup;
  var body = (group === 'overview') ? _renderOverview()
           : (group === 'library')  ? _renderLibrary()
           : _renderGroup(group);

  el.innerHTML =
'<section class="kpi-console">' + _styleBlock() +
  '<header class="kc-head">' +
    '<div class="kc-head-titles">' +
      '<span class="kc-eyebrow">' + _t('Quản trị điều hành', 'Operations governance') + '</span>' +
      '<h2>' + _t('Console KPI', 'KPI console') + '</h2>' +
      '<p>' + _t('Điểm điều khiển duy nhất cho hệ KPI thực chiến — xem và biên tập ngưỡng, owner, nhịp, hành động và counter-metric. Lưu tại đây ghi overlay runtime và tái tạo các vùng §4/§5/§6 trong ANNEX-122.',
                 'The single control point for the operating KPI system. Saving writes the runtime overlay and regenerates the §4/§5/§6 regions of ANNEX-122.') + '</p>' +
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
  body +
'</section>';
  _syncStatus();
}

function _renderOverview(){
  var cfg = _state.config || {};
  var st = cfg.stats || {};
  var bs = st.by_calculation_status || {};
  var stats = [
    { v: st.total || 0, label: _t('KPI governance', 'Governance KPIs') },
    { v: (bs.runtime_calculated || 0), label: _t('Tính runtime', 'Runtime-calculated') },
    { v: (bs.staged_data_contract || 0), label: _t('Chờ data contract', 'Staged data contract') },
    { v: (bs.manual || 0), label: _t('Nhập tay', 'Manual') },
    { v: (st.threshold_coverage_pct || 0) + '%', label: _t('Đủ ngưỡng', 'Threshold coverage') },
    { v: (st.counter_coverage_pct || 0) + '%', label: _t('Có counter-metric', 'Counter coverage') }
  ];
  var statHtml = stats.map(function(s){
    return '<div class="kc-stat"><span class="kc-stat-v">' + _esc(s.v) + '</span>' +
           '<span class="kc-stat-l">' + _esc(s.label) + '</span></div>';
  }).join('');

  var tiles = GROUPS.map(function(g){
    var count = (g.section === 'governance') ? _kpisByTier(g.tier).length
      : (g.section === 'gate' ? (cfg.gate_control_metrics || []).length
                              : (cfg.proposed_operating_metrics || []).length);
    return '<button class="kc-tile" type="button" onclick="_kpiGo(\'' + g.key + '\')">' +
      '<span class="kc-tile-top"><span class="kc-tile-name">' + _esc(_t(g.vi, g.en)) + '</span>' +
      '<span class="kc-tile-count">' + count + '</span></span>' +
      '<span class="kc-tile-desc">' + _esc(_t(g.descVi, g.descEn)) + '</span>' +
      '<span class="kc-tag kc-tag-edit">' + _t('Biên tập được', 'Editable') + '</span>' +
    '</button>';
  }).join('');

  var meta = '<p class="kc-meta">' +
    _esc(_t('Registry', 'Registry')) + ': <b>' + _esc(cfg.registry_version || '—') + '</b> · ' +
    _esc(_t('schema', 'schema')) + ' v' + _esc(cfg.schema_version || '—') + ' · ' +
    (cfg.overlay_present
      ? _esc(_t('Overlay runtime cập nhật bởi', 'Runtime overlay updated by')) + ' ' + _esc(cfg.overlay_updated_by || '—')
      : _esc(_t('Chưa có overlay runtime', 'No runtime overlay'))) +
    '</p>';

  var libCount = (cfg.library || []).length;
  var libBtn = '<button class="kc-lib-cta" type="button" onclick="_kpiGo(\'library\')">' +
    '<span class="kc-lib-cta-ico">📚</span>' +
    '<span class="kc-lib-cta-txt"><b>' + _t('Thư viện KPI', 'KPI Library') + '</b>' +
    '<span>' + _t('Tra cứu & lọc ' + libCount + ' KPI theo quá trình, phân loại, JD, trạng thái',
                   'Browse & filter ' + libCount + ' KPIs by process, category, JD, status') + '</span></span>' +
    '<span class="kc-lib-cta-go">→</span></button>';

  return '<div class="kc-stats">' + statHtml + '</div>' + meta + libBtn +
         '<div class="kc-tiles">' + tiles + '</div>';
}

/* ── KPI Library — classified, multi-filter browse view ────────────── */
function _libRows(){
  return (_state.config && Array.isArray(_state.config.library)) ? _state.config.library : [];
}
function _setFilter(key, value){ _state.filters[key] = value; _render(); }

function _filteredLib(){
  var f = _state.filters;
  var q = (f.search || '').trim().toLowerCase();
  return _libRows().filter(function(r){
    if(f.process  && r.process  !== f.process)  return false;
    if(f.category && r.category !== f.category) return false;
    if(f.group    && r.group    !== f.group)    return false;
    if(f.status   && r.calculation_status !== f.status) return false;
    if(f.jd && (r.applicable_jds || []).indexOf(f.jd) < 0) return false;
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

function _renderLibrary(){
  var cfg = _state.config || {};
  var f = _state.filters;
  var facets = cfg.facets || {};
  var nav = '<div class="kc-nav"><button class="kc-btn" type="button" onclick="_kpiGo(\'overview\')">‹ ' +
    _t('Tổng quan', 'Overview') + '</button><span class="kc-nav-title">📚 ' +
    _t('Thư viện KPI', 'KPI Library') + '</span></div>';

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
  var jdOpts = [['', _t('— Mọi JD / vai trò —', '— All JDs / roles —')]];
  Object.keys(facets.applicable_jds || {}).forEach(function(k){
    jdOpts.push([k, k + ' (' + facets.applicable_jds[k] + ')']);
  });
  var stOpts = [['', _t('— Mọi trạng thái —', '— All statuses —')],
    ['runtime_calculated', _t('Tính runtime', 'Runtime')],
    ['staged_data_contract', _t('Chờ data contract', 'Staged')],
    ['manual', _t('Nhập tay', 'Manual')]];

  var filterBar =
    '<div class="kc-filterbar">' +
      '<input class="kc-search" type="search" placeholder="' +
        _t('Tìm mã hoặc tên KPI...', 'Search KPI code or name...') + '" value="' + _esc(f.search) +
        '" oninput="_kpiSetFilter(\'search\',this.value)">' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'process\',this.value)">' + _selOptions(procOpts, f.process) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'category\',this.value)">' + _selOptions(catOpts, f.category) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'group\',this.value)">' + _selOptions(grpOpts, f.group) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'jd\',this.value)">' + _selOptions(jdOpts, f.jd) + '</select>' +
      '<select class="kc-input" onchange="_kpiSetFilter(\'status\',this.value)">' + _selOptions(stOpts, f.status) + '</select>' +
      '<button class="kc-btn" type="button" onclick="_kpiClearFilters()">' + _t('Xóa lọc', 'Clear') + '</button>' +
    '</div>';

  var rows = _filteredLib();
  var resultHead = '<div class="kc-result-head">' +
    '<b>' + rows.length + '</b> / ' + _libRows().length + ' ' + _t('KPI khớp bộ lọc', 'KPIs match the filter') +
    '</div>';

  var grid = rows.map(_renderLibCard).join('');
  if(!grid) grid = '<div class="hm-empty">' + _t('Không có KPI khớp bộ lọc.', 'No KPI matches the filter.') + '</div>';

  return nav + filterBar + resultHead + '<div class="kc-lib-grid">' + grid + '</div>';
}

function _renderLibCard(r){
  var c = function(s){ return _esc(s == null ? '' : s); };
  var b = _ragBands(r.thresholds || {});
  var procLabel = r.process;
  var facets = (_state.config || {}).facets || {};
  (facets.process || []).forEach(function(p){ if(p.key === r.process) procLabel = p.label; });
  var groupKey = _GROUP_OF_SECTION[r.group] || 'overview';
  return '<button class="kc-lib-card" type="button" onclick="_kpiGo(\'' + groupKey + '\')">' +
    '<div class="kc-lib-card-top">' +
      '<span class="kc-code">' + c(r.canonical_code) + '</span>' +
      _calcBadge(r.calculation_status) +
    '</div>' +
    '<div class="kc-lib-card-name">' + c(r.name_vi || r.name) + '</div>' +
    '<div class="kc-lib-tags">' +
      '<span class="kc-chip kc-chip-proc">' + c(procLabel) + '</span>' +
      '<span class="kc-chip kc-chip-cat kc-cat-' + c(r.category) + '">' + c(CATEGORY_VI[r.category] || r.category) + '</span>' +
      '<span class="kc-chip">' + c(r.group) + '</span>' +
      (r.gate ? '<span class="kc-chip">' + c(r.gate) + '</span>' : '') +
    '</div>' +
    (b ? '<div class="kc-rag"><span class="kc-badge kc-badge-ok">' + _esc(b.green) + '</span>' +
         '<span class="kc-badge kc-badge-staged">' + _esc(b.yellow) + '</span>' +
         '<span class="kc-badge kc-badge-bad">' + _esc(b.red) + '</span></div>' : '') +
    '<div class="kc-lib-foot">' +
      '<span class="kc-mini">JD: ' + c((r.applicable_jds || []).join(', ') || '—') + '</span>' +
      '<span class="kc-mini">↔ ' + c(r.counter_metric || '—') + '</span>' +
    '</div>' +
  '</button>';
}

function _renderGroup(key){
  var g = null;
  for(var i=0;i<GROUPS.length;i++){ if(GROUPS[i].key===key){ g=GROUPS[i]; break; } }
  if(!g) return _renderOverview();

  var nav = '<div class="kc-nav"><button class="kc-btn" type="button" onclick="_kpiGo(\'overview\')">‹ ' +
    _t('Tổng quan', 'Overview') + '</button><span class="kc-nav-title">' + _esc(_t(g.vi, g.en)) + '</span></div>';

  var list = (g.section === 'governance') ? _kpisByTier(g.tier) : _sectionMetrics(g.section);
  var rows = list.map(function(m){ return _renderEditCard(m, g.section); }).join('');
  if(!rows) rows = '<div class="hm-empty">' + _t('Không có KPI.', 'No KPIs.') + '</div>';
  return nav + '<div class="kc-cards">' + rows + '</div>';
}

/* Role / counter-metric option lists. */
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
function _counterOptions(selected){
  // Span every governed metric code (governance + gate + proposed) so a
  // counter-metric can be picked across groups.
  var codes = (_state.config && _state.config.all_metric_codes) || [];
  return ['<option value=""' + (!selected ? ' selected' : '') + '>— ' + _t('không có', 'none') + ' —</option>'].concat(
    codes.map(function(c){
      return '<option value="' + _esc(c) + '"' + (c === selected ? ' selected' : '') + '>' + _esc(c) + '</option>';
    })).join('');
}

function _calcBadge(status){
  if(status === 'runtime_calculated')
    return '<span class="kc-badge kc-badge-ok">' + _t('Tính runtime', 'Runtime') + '</span>';
  if(status === 'manual')
    return '<span class="kc-badge kc-badge-manual">' + _t('Nhập tay', 'Manual') + '</span>';
  return '<span class="kc-badge kc-badge-staged">' + _t('Chưa có data contract', 'No data contract') + '</span>';
}

/* Unified edit card for every group. Threshold + counter-metric are
   editable for all metrics; governance KPIs additionally expose owner,
   data steward, cadence, decision and action; gate metrics expose owner
   and cadence. Structural fields (formula, gate, linked_cdr) are read-only. */
function _renderEditCard(m, section){
  var code = m.canonical_code;
  var c = function(s){ return _esc(s == null ? '' : s); };
  var sec = _state.overrides[section] || {};
  var dirty = !!sec[code];
  var hasThresholds = !!(_val(m, section, 'thresholds') || m.thresholds);
  var status = m.calculation_status || (m.status === 'retained_from_annex122' ? 'staged_data_contract' : m.status);

  var html = '<article class="kc-card' + (dirty ? ' kc-card--dirty' : '') + '" data-kpi-code="' + c(code) + '">' +
    '<div class="kc-card-head">' +
      '<div><span class="kc-code">' + c(code) + '</span> ' +
        '<span class="kc-card-name">' + c(m.name_vi || m.name) + '</span></div>' +
      _calcBadge(status) +
    '</div>';

  if(section === 'gate'){
    html += '<div class="kc-mini">' + _t('Cổng', 'Gate') + ' ' + c(m.gate || '—') +
      ' · CDR ' + c((m.linked_cdr || []).join(', ')) + '</div>';
  }
  if(status === 'staged_data_contract'){
    html += '<div class="kc-warn">' + _t('KPI chưa có hợp đồng dữ liệu — nhập số qua endpoint nhập liệu.',
      'KPI has no data contract — feed it via the data-input endpoint.') + '</div>';
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
  html += _field(_t('Counter-metric', 'Counter-metric'),
    '<select class="kc-input" onchange="_kpiSetField(\'' + section + '\',\'' + c(code) + '\',\'counter_metric\',this.value)">' +
    _counterOptions(_val(m,section,'counter_metric')) + '</select>');
  html += '</div>';

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
  return html + '</article>';
}

function _field(label, control){
  return '<div class="kc-f"><label>' + _esc(label) + '</label>' + control + '</div>';
}

/* Live RAG-band preview from the (possibly edited) numeric thresholds. */
function _ragPreview(m, section){
  var t = _val(m, section, 'thresholds') || m.thresholds || {};
  var b = _ragBands(t);
  if(!b) return '';
  return '<div class="kc-rag">' +
    '<span class="kc-badge kc-badge-ok">' + _esc(b.green) + '</span> ' +
    '<span class="kc-badge kc-badge-staged">' + _esc(b.yellow) + '</span> ' +
    '<span class="kc-badge kc-badge-bad">' + _esc(b.red) + '</span></div>';
}

/* ── Styles — Graphics Authority tokens only ──────────────────────── */
function _styleBlock(){
  return '<style>' +
  '.kpi-console{display:flex;flex-direction:column;gap:14px;color:var(--text-1,#1a2233)}' +
  '.kc-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start}' +
  '.kc-eyebrow{font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:var(--text-3,#7a869a)}' +
  '.kc-head h2{margin:4px 0;font-size:20px;color:var(--text-1,#1a2233)}' +
  '.kc-head p{margin:0;font-size:13px;color:var(--text-2,#55617a);max-width:60ch}' +
  '.kc-actions{display:flex;gap:8px;flex-wrap:wrap}' +
  '.kc-btn{border:1px solid var(--border,#d7deea);background:var(--surface,#fff);color:var(--text-1,#1a2233);' +
    'border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}' +
  '.kc-btn.primary{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}' +
  '.kc-btn[disabled]{opacity:.5;cursor:not-allowed}' +
  '.kc-alert{border-radius:8px;padding:9px 12px;font-size:13px}' +
  '.kc-alert.error{background:var(--danger-soft,#fff5f5);color:var(--danger,#c92a2a);border:1px solid var(--danger,#c92a2a)}' +
  '.kc-alert.ok{background:var(--success-soft,#ebfbee);color:var(--success,#2b8a3e);border:1px solid var(--success,#2b8a3e)}' +
  '.kc-field label{display:block;font-size:12px;color:var(--text-3,#7a869a);margin-bottom:4px}' +
  '.kc-reason{width:100%;min-height:48px;border:1px solid var(--border,#d7deea);border-radius:8px;' +
    'padding:8px;font-size:13px;background:var(--surface,#fff);color:var(--text-1,#1a2233)}' +
  '.kc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}' +
  '.kc-stat{border:1px solid var(--border,#d7deea);border-radius:10px;background:var(--surface-2,#f8fafc);' +
    'padding:14px;display:flex;flex-direction:column;gap:4px}' +
  '.kc-stat-v{font-size:22px;font-weight:700;color:var(--accent,#2563eb)}' +
  '.kc-stat-l{font-size:12px;color:var(--text-2,#55617a)}' +
  '.kc-meta{font-size:12px;color:var(--text-3,#7a869a);margin:0}' +
  '.kc-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}' +
  '.kc-tile{text-align:left;border:1px solid var(--border,#d7deea);border-radius:10px;' +
    'background:var(--surface,#fff);padding:14px;cursor:pointer;display:flex;flex-direction:column;gap:6px}' +
  '.kc-tile-top{display:flex;justify-content:space-between;align-items:center}' +
  '.kc-tile-name{font-weight:700;font-size:14px;color:var(--text-1,#1a2233)}' +
  '.kc-tile-count{font-size:18px;font-weight:700;color:var(--accent,#2563eb)}' +
  '.kc-tile-desc{font-size:12px;color:var(--text-2,#55617a)}' +
  '.kc-tag{align-self:flex-start;font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px}' +
  '.kc-tag-edit{background:var(--accent-soft,#e7f0ff);color:var(--accent,#2563eb)}' +
  '.kc-tag-ro{background:var(--surface-2,#f1f3f7);color:var(--text-3,#7a869a)}' +
  '.kc-nav{display:flex;align-items:center;gap:10px}' +
  '.kc-nav-title{font-weight:700;font-size:15px}' +
  '.kc-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}' +
  '.kc-card{border:1px solid var(--border,#d7deea);border-radius:10px;background:var(--surface,#fff);' +
    'padding:13px;display:flex;flex-direction:column;gap:8px}' +
  '.kc-card--dirty{border-color:var(--accent,#2563eb);box-shadow:inset 3px 0 0 var(--accent,#2563eb)}' +
  '.kc-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}' +
  '.kc-code{font-family:var(--mono,monospace);font-size:11px;background:var(--surface-2,#f1f3f7);' +
    'padding:2px 6px;border-radius:5px}' +
  '.kc-card-name{font-size:13px;font-weight:600}' +
  '.kc-badge{font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}' +
  '.kc-badge-ok{background:var(--success-soft,#ebfbee);color:var(--success,#2b8a3e)}' +
  '.kc-badge-staged{background:var(--warning-soft,#fff9db);color:var(--warning,#e67700)}' +
  '.kc-badge-manual{background:var(--accent-soft,#eef2ff);color:var(--accent,#3730a3)}' +
  '.kc-badge-bad{background:var(--danger-soft,#fff5f5);color:var(--danger,#c92a2a)}' +
  '.kc-rag{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 4px}' +
  '.kc-warn{font-size:11px;color:var(--warning,#e67700);background:var(--warning-soft,#fff9db);' +
    'border-radius:6px;padding:5px 8px}' +
  '.kc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}' +
  '.kc-f{display:flex;flex-direction:column;gap:3px}' +
  '.kc-f label{font-size:11px;color:var(--text-3,#7a869a)}' +
  '.kc-input{border:1px solid var(--border,#d7deea);border-radius:6px;padding:6px 8px;font-size:12px;' +
    'background:var(--surface,#fff);color:var(--text-1,#1a2233);width:100%}' +
  '.kc-ta{min-height:54px;resize:vertical;font-family:inherit}' +
  '.kc-table-wrap{overflow-x:auto;border:1px solid var(--border,#d7deea);border-radius:10px}' +
  '.kc-table{width:100%;border-collapse:collapse;font-size:12px}' +
  '.kc-table th{text-align:left;padding:8px 10px;background:var(--surface-2,#f1f3f7);' +
    'color:var(--text-2,#55617a);font-size:11px;text-transform:uppercase}' +
  '.kc-table td{padding:8px 10px;border-top:1px solid var(--border,#d7deea);vertical-align:top}' +
  '.kc-mini{font-size:11px;color:var(--text-3,#7a869a)}' +
  /* ── KPI Library ── */
  '.kc-lib-cta{display:flex;align-items:center;gap:14px;width:100%;text-align:left;cursor:pointer;' +
    'border:1px solid var(--accent,#2563eb);border-radius:12px;padding:14px 18px;' +
    'background:var(--accent-soft,#e7f0ff)}' +
  '.kc-lib-cta-ico{font-size:26px}' +
  '.kc-lib-cta-txt{display:flex;flex-direction:column;gap:2px;flex:1}' +
  '.kc-lib-cta-txt b{font-size:15px;color:var(--text-1,#1a2233)}' +
  '.kc-lib-cta-txt span{font-size:12px;color:var(--text-2,#55617a)}' +
  '.kc-lib-cta-go{font-size:22px;color:var(--accent,#2563eb)}' +
  '.kc-filterbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;' +
    'border:1px solid var(--border,#d7deea);border-radius:10px;padding:10px;' +
    'background:var(--surface-2,#f8fafc)}' +
  '.kc-search{flex:1;min-width:180px;border:1px solid var(--border,#d7deea);border-radius:7px;' +
    'padding:7px 10px;font-size:13px;background:var(--surface,#fff);color:var(--text-1,#1a2233)}' +
  '.kc-filterbar .kc-input{width:auto;min-width:150px;flex:0 0 auto}' +
  '.kc-result-head{font-size:13px;color:var(--text-2,#55617a);padding:2px 2px}' +
  '.kc-result-head b{color:var(--accent,#2563eb);font-size:15px}' +
  '.kc-lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}' +
  '.kc-lib-card{text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:7px;' +
    'border:1px solid var(--border,#d7deea);border-radius:10px;padding:12px;background:var(--surface,#fff)}' +
  '.kc-lib-card:hover{border-color:var(--accent,#2563eb);box-shadow:0 1px 6px rgba(0,0,0,.08)}' +
  '.kc-lib-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '.kc-lib-card-name{font-size:13px;font-weight:600;color:var(--text-1,#1a2233)}' +
  '.kc-lib-tags{display:flex;gap:4px;flex-wrap:wrap}' +
  '.kc-chip{font-size:10px;border-radius:999px;padding:2px 8px;' +
    'background:var(--surface-2,#f1f3f7);color:var(--text-2,#55617a)}' +
  '.kc-chip-proc{background:var(--accent-soft,#e7f0ff);color:var(--accent,#2563eb)}' +
  '.kc-cat-supplier{background:#fff4e6;color:#d9480f}' +
  '.kc-cat-customer{background:#e7f5ff;color:#1971c2}' +
  '.kc-cat-safety{background:#fff5f5;color:#c92a2a}' +
  '.kc-cat-financial{background:#ebfbee;color:#2b8a3e}' +
  '.kc-cat-system{background:#f3f0ff;color:#5f3dc4}' +
  '.kc-lib-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;' +
    'border-top:1px solid var(--border,#d7deea);padding-top:6px}' +
  '</style>';
}

/* ── Window-exposed handlers ──────────────────────────────────────── */
window._kpiReload    = function(){ _state.config = null; _load(); };
window._kpiReset     = function(){ _reset(); };
window._kpiSave      = function(){ _save(); };
window._kpiGo        = function(g){ _go(g); };
window._kpiSetReason = function(v){ _setReason(v); };
window._kpiSetField  = function(section, code, field, value){ _setField(section, code, field, value); };
window._kpiSetThreshold = function(section, code, key, value){ _setThreshold(section, code, key, value); };
window._kpiSetFilter = function(key, value){ _setFilter(key, value); };
window._kpiClearFilters = function(){
  _state.filters = { process:'', category:'', group:'', jd:'', status:'', search:'' };
  _render();
};

})();
