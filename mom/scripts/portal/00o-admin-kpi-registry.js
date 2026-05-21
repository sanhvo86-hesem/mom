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

/* Editable governance groups + read-only reference groups. */
var GROUPS = [
  { key:'company',      tier:'company',      editable:true,
    vi:'KPI cấp công ty', en:'Company KPIs',
    descVi:'KPI lãnh đạo — giao hàng, chất lượng, an toàn, biên lợi nhuận.',
    descEn:'Leadership KPIs — delivery, quality, safety, margin.' },
  { key:'value_stream', tier:'value_stream', editable:true,
    vi:'KPI value-stream', en:'Value-stream KPIs',
    descVi:'KPI hiệu lực RFQ → Plan → sản xuất → Ship → Hóa đơn.',
    descEn:'Value-stream effectiveness KPIs.' },
  { key:'department',   tier:'department',   editable:true,
    vi:'KPI phòng ban', en:'Department KPIs',
    descVi:'KPI trong phạm vi kiểm soát của từng phòng ban.',
    descEn:'Department-scoped KPIs.' },
  { key:'gate',         tier:null,           editable:false,
    vi:'Gate metric', en:'Gate metrics',
    descVi:'Metric đo điều kiện pass cổng G0→G7 (chỉ xem).',
    descEn:'Gate pass-condition metrics G0→G7 (read-only).' },
  { key:'proposed',     tier:null,           editable:false,
    vi:'Metric đề xuất', en:'Proposed metrics',
    descVi:'Metric TOC / Lean đề xuất, chờ data contract (chỉ xem).',
    descEn:'Proposed TOC / Lean metrics (read-only).' }
];

var _state = {
  loading:false, saving:false, error:'', message:'',
  config:null, overrides:{}, reason:'', activeGroup:'overview'
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
      _state.overrides = {};
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
    governance_overrides: _state.overrides,
    reason: _state.reason || ''
  }, 'POST', 90000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'save_failed');
      _state.config = data.config || {};
      _state.overrides = {};
      _state.reason = '';
      _state.message = _t('Đã lưu và đồng bộ ANNEX-122.', 'Saved and synced ANNEX-122.')
        + (data.annex122_updated ? '' : ' ' + _t('(ANNEX-122 không đổi)', '(ANNEX-122 unchanged)'));
    })
    .catch(function(err){
      _state.error = _t('Lưu thất bại.', 'Save failed.') + ' ' + (err && err.message ? err.message : '');
    })
    .finally(function(){ _state.saving = false; _render(); });
}

/* ── Draft model — overrides keyed by code ─────────────────────────── */
function _kpis(){
  return (_state.config && Array.isArray(_state.config.governance_kpis))
    ? _state.config.governance_kpis : [];
}
function _kpisByTier(tier){
  return _kpis().filter(function(k){ return k.tier === tier; });
}
function _dirty(){ return Object.keys(_state.overrides).length > 0; }

/* Effective value of an editable field: override wins over config. */
function _val(kpi, field){
  var code = kpi.canonical_code;
  if(_state.overrides[code] && Object.prototype.hasOwnProperty.call(_state.overrides[code], field)){
    return _state.overrides[code][field];
  }
  return kpi[field];
}
function _threshold(kpi, key){
  var t = _val(kpi, 'thresholds') || kpi.thresholds || {};
  return t[key] != null ? t[key] : '';
}

function _setField(code, field, value){
  if(!_state.overrides[code]) _state.overrides[code] = {};
  _state.overrides[code][field] = value;
  _state.error = ''; _state.message = '';
  _syncStatus();
}
function _setThreshold(code, key, value){
  var kpi = null, list = _kpis();
  for(var i=0;i<list.length;i++){ if(list[i].canonical_code===code){ kpi=list[i]; break; } }
  if(!kpi) return;
  var cur = (_state.overrides[code] && _state.overrides[code].thresholds)
    ? _state.overrides[code].thresholds
    : Object.assign({}, kpi.thresholds || {});
  cur[key] = value;
  _setField(code, 'thresholds', cur);
}
function _setReason(value){ _state.reason = value; }
function _reset(){
  _state.overrides = {}; _state.reason = '';
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
  var body = (group === 'overview') ? _renderOverview() : _renderGroup(group);

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
    var count = g.editable ? _kpisByTier(g.tier).length
      : (g.key === 'gate' ? (cfg.gate_control_metrics || []).length
                          : (cfg.proposed_operating_metrics || []).length);
    return '<button class="kc-tile" type="button" onclick="_kpiGo(\'' + g.key + '\')">' +
      '<span class="kc-tile-top"><span class="kc-tile-name">' + _esc(_t(g.vi, g.en)) + '</span>' +
      '<span class="kc-tile-count">' + count + '</span></span>' +
      '<span class="kc-tile-desc">' + _esc(_t(g.descVi, g.descEn)) + '</span>' +
      '<span class="kc-tag ' + (g.editable ? 'kc-tag-edit' : 'kc-tag-ro') + '">' +
        (g.editable ? _t('Biên tập được', 'Editable') : _t('Chỉ xem', 'Read-only')) + '</span>' +
    '</button>';
  }).join('');

  var meta = '<p class="kc-meta">' +
    _esc(_t('Registry', 'Registry')) + ': <b>' + _esc(cfg.registry_version || '—') + '</b> · ' +
    _esc(_t('schema', 'schema')) + ' v' + _esc(cfg.schema_version || '—') + ' · ' +
    (cfg.overlay_present
      ? _esc(_t('Overlay runtime cập nhật bởi', 'Runtime overlay updated by')) + ' ' + _esc(cfg.overlay_updated_by || '—')
      : _esc(_t('Chưa có overlay runtime', 'No runtime overlay'))) +
    '</p>';

  return '<div class="kc-stats">' + statHtml + '</div>' + meta +
         '<div class="kc-tiles">' + tiles + '</div>';
}

function _renderGroup(key){
  var g = null;
  for(var i=0;i<GROUPS.length;i++){ if(GROUPS[i].key===key){ g=GROUPS[i]; break; } }
  if(!g) return _renderOverview();

  var nav = '<div class="kc-nav"><button class="kc-btn" type="button" onclick="_kpiGo(\'overview\')">‹ ' +
    _t('Tổng quan', 'Overview') + '</button><span class="kc-nav-title">' + _esc(_t(g.vi, g.en)) + '</span></div>';

  var rows;
  if(g.editable){
    rows = _kpisByTier(g.tier).map(_renderEditCard).join('');
    if(!rows) rows = '<div class="hm-empty">' + _t('Không có KPI.', 'No KPIs.') + '</div>';
    return nav + '<div class="kc-cards">' + rows + '</div>';
  }
  var list = (key === 'gate')
    ? (_state.config.gate_control_metrics || [])
    : (_state.config.proposed_operating_metrics || []);
  rows = list.map(_renderReadOnlyRow).join('');
  return nav +
    '<div class="kc-table-wrap"><table class="kc-table"><thead><tr>' +
      '<th>' + _t('Mã', 'Code') + '</th><th>' + _t('Tên', 'Name') + '</th>' +
      '<th>' + _t('Chi tiết', 'Detail') + '</th><th>' + _t('Trạng thái', 'Status') + '</th>' +
    '</tr></thead><tbody>' + (rows || '') + '</tbody></table></div>';
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
  var codes = _kpis().map(function(k){ return k.canonical_code; });
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

function _renderEditCard(kpi){
  var code = kpi.canonical_code;
  var dirty = !!_state.overrides[code];
  var c = function(s){ return _esc(s == null ? '' : s); };
  return '<article class="kc-card' + (dirty ? ' kc-card--dirty' : '') + '" data-kpi-code="' + c(code) + '">' +
    '<div class="kc-card-head">' +
      '<div><span class="kc-code">' + c(code) + '</span> ' +
        '<span class="kc-card-name">' + c(kpi.name_vi || kpi.name) + '</span></div>' +
      _calcBadge(kpi.calculation_status) +
    '</div>' +
    (kpi.calculation_status === 'staged_data_contract'
      ? '<div class="kc-warn">' + _t('KPI chưa có hợp đồng dữ liệu — số liệu hiển thị là tạm.', 'KPI has no data contract yet — values shown are provisional.') + '</div>'
      : '') +
    '<div class="kc-grid">' +
      _field(_t('Ngưỡng xanh', 'Green threshold'),
        '<input class="kc-input" type="text" value="' + c(_threshold(kpi,'green')) +
        '" oninput="_kpiSetThreshold(\'' + c(code) + '\',\'green\',this.value)">') +
      _field(_t('Ngưỡng vàng', 'Yellow threshold'),
        '<input class="kc-input" type="text" value="' + c(_threshold(kpi,'yellow')) +
        '" oninput="_kpiSetThreshold(\'' + c(code) + '\',\'yellow\',this.value)">') +
      _field(_t('Ngưỡng đỏ', 'Red threshold'),
        '<input class="kc-input" type="text" value="' + c(_threshold(kpi,'red')) +
        '" oninput="_kpiSetThreshold(\'' + c(code) + '\',\'red\',this.value)">') +
      _field(_t('Owner', 'Owner'),
        '<select class="kc-input" onchange="_kpiSetField(\'' + c(code) + '\',\'owner_role\',this.value)">' +
        _roleOptions(_val(kpi,'owner_role')) + '</select>') +
      _field(_t('Xác nhận dữ liệu', 'Data steward'),
        '<select class="kc-input" onchange="_kpiSetField(\'' + c(code) + '\',\'data_stewardship_role\',this.value)">' +
        _roleOptions(_val(kpi,'data_stewardship_role')) + '</select>') +
      _field(_t('Nhịp', 'Cadence'),
        '<select class="kc-input" onchange="_kpiSetField(\'' + c(code) + '\',\'cadence\',this.value)">' +
        _cadenceOptions(_val(kpi,'cadence')) + '</select>') +
      _field(_t('Counter-metric', 'Counter-metric'),
        '<select class="kc-input" onchange="_kpiSetField(\'' + c(code) + '\',\'counter_metric\',this.value)">' +
        _counterOptions(_val(kpi,'counter_metric')) + '</select>') +
    '</div>' +
    _field(_t('Căn cứ ngưỡng', 'Threshold basis'),
      '<textarea class="kc-input kc-ta" oninput="_kpiSetThreshold(\'' + c(code) + '\',\'basis\',this.value)">' +
      c(_threshold(kpi,'basis')) + '</textarea>') +
    _field(_t('Quyết định khi lệch ngưỡng', 'Decision on threshold breach'),
      '<textarea class="kc-input kc-ta" oninput="_kpiSetField(\'' + c(code) + '\',\'decision_action\',this.value)">' +
      c(_val(kpi,'decision_action')) + '</textarea>') +
    _field(_t('Tham chiếu hành động (CDR / SOP / WI)', 'Action reference (CDR / SOP / WI)'),
      '<textarea class="kc-input kc-ta" oninput="_kpiSetField(\'' + c(code) + '\',\'action_reference\',this.value)">' +
      c(_val(kpi,'action_reference')) + '</textarea>') +
  '</article>';
}

function _field(label, control){
  return '<div class="kc-f"><label>' + _esc(label) + '</label>' + control + '</div>';
}

function _renderReadOnlyRow(m){
  var detail;
  if(m.gate){
    detail = _t('Cổng', 'Gate') + ' ' + _esc(m.gate) +
      ' · CDR ' + _esc((m.linked_cdr || []).join(', ')) +
      '<br><span class="kc-mini">' + _esc(m.gate_pass_condition || '') + '</span>';
  } else {
    detail = _esc(m.layer || '') + '<br><span class="kc-mini">' + _esc(m.name || '') + '</span>';
  }
  return '<tr><td><span class="kc-code">' + _esc(m.canonical_code || m.local_id || '') + '</span></td>' +
    '<td>' + _esc(m.name || '') + '</td><td>' + detail + '</td>' +
    '<td>' + _calcBadge(m.calculation_status || (m.status === 'retained' ? 'staged_data_contract' : m.status)) + '</td></tr>';
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
  '</style>';
}

/* ── Window-exposed handlers ──────────────────────────────────────── */
window._kpiReload    = function(){ _state.config = null; _load(); };
window._kpiReset     = function(){ _reset(); };
window._kpiSave      = function(){ _save(); };
window._kpiGo        = function(g){ _go(g); };
window._kpiSetReason = function(v){ _setReason(v); };
window._kpiSetField  = function(code, field, value){ _setField(code, field, value); };
window._kpiSetThreshold = function(code, key, value){ _setThreshold(code, key, value); };

})();
