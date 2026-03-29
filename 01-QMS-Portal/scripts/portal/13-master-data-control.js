/* ===================================================================
   13-master-data-control.js -- Governed Master Data Control
   HESEM QMS Portal -- Customer / Supplier / Part / Revision / CAPA / Work Center / Machine / Operator
   Shared source for Order Management, Evidence Control, and MES runtime lookups
   =================================================================== */

(function(){
'use strict';

var _mdCache = null;
var _mdPromise = null;
var _mdState = {
  entity: 'customers',
  search: '',
  selectedId: '',
  draft: null
};

var ENTITY_CONFIG = {
  customers: {
    key: 'customer_id',
    labelVi: 'Khách hàng',
    labelEn: 'Customers',
    emptyVi: 'Chưa có khách hàng nào.',
    listColumns: [
      { key:'customer_id', label:'Mã' },
      { key:'customer_name', label:'Tên khách hàng' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'customer_id', type:'text', required:true, label:'Mã khách hàng' },
      { key:'customer_name', type:'text', required:true, label:'Tên khách hàng' },
      { key:'customer_name_vi', type:'text', label:'Tên tiếng Việt' },
      { key:'customer_type', type:'select', required:true, label:'Loại khách hàng', options:['OEM','Tier 1','Tier 2','Internal'] },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['active','inactive','blocked'] },
      { key:'contact_name', type:'text', label:'Người liên hệ' },
      { key:'contact_email', type:'email', label:'Email liên hệ' },
      { key:'site_code', type:'text', label:'Mã site / plant' }
    ]
  },
  suppliers: {
    key: 'supplier_id',
    labelVi: 'Nhà cung cấp',
    labelEn: 'Suppliers',
    emptyVi: 'Chưa có nhà cung cấp nào.',
    listColumns: [
      { key:'supplier_id', label:'Mã' },
      { key:'supplier_name', label:'Tên nhà cung cấp' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'supplier_id', type:'text', required:true, label:'Mã nhà cung cấp' },
      { key:'supplier_name', type:'text', required:true, label:'Tên nhà cung cấp' },
      { key:'supplier_name_vi', type:'text', label:'Tên tiếng Việt' },
      { key:'supplier_type', type:'select', required:true, label:'Loại', options:['raw_material','special_process','calibration','outsource','service'] },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['approved','conditional','blocked','inactive'] },
      { key:'approved_customers', type:'text', label:'Khách hàng áp dụng', helper:'Nhập danh sách mã khách hàng, phân tách bằng dấu phẩy.' },
      { key:'contact_name', type:'text', label:'Người liên hệ' },
      { key:'contact_email', type:'email', label:'Email liên hệ' }
    ]
  },
  parts: {
    key: 'part_number',
    labelVi: 'Part number',
    labelEn: 'Parts',
    emptyVi: 'Chưa có part number nào.',
    listColumns: [
      { key:'part_number', label:'Part Number' },
      { key:'part_description', label:'Mô tả' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'part_number', type:'text', required:true, label:'Part Number' },
      { key:'part_description', type:'text', required:true, label:'Mô tả chi tiết' },
      { key:'customer_id', type:'lookup', entity:'customers', required:true, label:'Khách hàng' },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['active','inactive','obsolete'] },
      { key:'preferred_supplier_id', type:'lookup', entity:'suppliers', label:'Nhà cung cấp ưu tiên' }
    ]
  },
  revisions: {
    key: 'revision_id',
    labelVi: 'Revision',
    labelEn: 'Revisions',
    emptyVi: 'Chưa có revision nào.',
    listColumns: [
      { key:'revision_id', label:'Mã revision' },
      { key:'part_number', label:'Part Number' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'revision_id', type:'text', required:true, label:'Mã revision' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'revision', type:'text', required:true, label:'Revision' },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['draft','released','superseded','obsolete'] },
      { key:'release_date', type:'date', label:'Ngày phát hành' }
    ]
  },
  capas: {
    key: 'capa_number',
    labelVi: 'CAPA',
    labelEn: 'CAPA',
    emptyVi: 'Chưa có CAPA nào.',
    listColumns: [
      { key:'capa_number', label:'Số CAPA' },
      { key:'title', label:'Tiêu đề' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'capa_number', type:'text', required:true, label:'Số CAPA' },
      { key:'title', type:'text', required:true, label:'Tiêu đề' },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['open','in_progress','closed','cancelled'] },
      { key:'customer_id', type:'lookup', entity:'customers', label:'Khách hàng' },
      { key:'part_number', type:'lookup', entity:'parts', label:'Part Number' }
    ]
  },
  work_centers: {
    key: 'work_center_id',
    labelVi: 'Work center',
    labelEn: 'Work centers',
    emptyVi: 'Chưa có work center nào.',
    listColumns: [
      { key:'work_center_id', label:'Mã' },
      { key:'work_center_name', label:'Tên work center' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'work_center_id', type:'text', required:true, label:'Mã work center' },
      { key:'work_center_name', type:'text', required:true, label:'Tên work center' },
      { key:'department', type:'select', required:true, label:'Phòng ban', options:['PRO','QA','ENG','SCM','MNT'] },
      { key:'process_family', type:'select', label:'Nhóm công nghệ', options:['3-axis','5-axis','turning','inspection','maintenance','grinding'] },
      { key:'area', type:'text', label:'Khu vực / line' },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['active','inactive','blocked'] }
    ]
  },
  machines: {
    key: 'machine_id',
    labelVi: 'Máy / thiết bị',
    labelEn: 'Machines',
    emptyVi: 'Chưa có máy hoặc thiết bị nào.',
    listColumns: [
      { key:'machine_id', label:'Mã máy' },
      { key:'machine_name', label:'Tên máy' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'machine_id', type:'text', required:true, label:'Mã máy' },
      { key:'machine_name', type:'text', required:true, label:'Tên máy' },
      { key:'work_center_id', type:'lookup', entity:'work_centers', required:true, label:'Work center' },
      { key:'machine_type', type:'select', required:true, label:'Loại máy', options:['5-axis','3-axis','turning','mill-turn','cmm','washing','support'] },
      { key:'location', type:'text', label:'Vị trí máy' },
      { key:'preferred_operator_id', type:'lookup', entity:'operators', label:'Người vận hành ưu tiên' },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['active','idle','maintenance','down','blocked','retired'] },
      { key:'last_pm_date', type:'date', label:'Ngày PM gần nhất' },
      { key:'next_pm_date', type:'date', label:'Ngày PM tiếp theo' }
    ]
  },
  operators: {
    key: 'operator_id',
    labelVi: 'Nhân lực vận hành',
    labelEn: 'Operators',
    emptyVi: 'Chưa có nhân lực vận hành nào.',
    listColumns: [
      { key:'operator_id', label:'Mã' },
      { key:'operator_name', label:'Họ tên' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'operator_id', type:'text', required:true, label:'Mã nhân lực' },
      { key:'operator_name', type:'text', required:true, label:'Họ tên' },
      { key:'role', type:'select', required:true, label:'Vai trò', options:['operator','qc_inspector','shift_leader','maintenance_tech','planner','engineer'] },
      { key:'work_center_id', type:'lookup', entity:'work_centers', label:'Work center chính' },
      { key:'shift', type:'select', label:'Ca làm việc', options:['1','2','3','day','night','office'] },
      { key:'skills', type:'text', label:'Kỹ năng / chứng nhận', helper:'Nhập các kỹ năng chính, phân tách bằng dấu phẩy.' },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['active','inactive','training','blocked'] }
    ]
  },
  tooling_assets: {
    key: 'tool_id',
    labelVi: 'Dao / tooling',
    labelEn: 'Tooling assets',
    emptyVi: 'Chưa có dao hoặc tooling nào.',
    listColumns: [
      { key:'tool_id', label:'Mã tool' },
      { key:'tool_name', label:'Tên tooling' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'tool_id', type:'text', required:true, label:'Mã tooling' },
      { key:'tool_name', type:'text', required:true, label:'Tên tooling' },
      { key:'tool_type', type:'select', required:true, label:'Loại tooling', options:['endmill','drill','insert','tap','reamer','probe','holder','fixture'] },
      { key:'machine_type', type:'select', label:'Machine family', options:['5-axis','3-axis','turning','mill-turn','cmm','multi'] },
      { key:'preferred_work_center_id', type:'lookup', entity:'work_centers', label:'Work center ưu tiên' },
      { key:'life_limit_minutes', type:'number', label:'Giới hạn life (phút)' },
      { key:'life_limit_parts', type:'number', label:'Giới hạn life (số chi tiết)' },
      { key:'warning_pct', type:'number', label:'Ngưỡng cảnh báo (%)' },
      { key:'critical_pct', type:'number', label:'Ngưỡng tới hạn (%)' },
      { key:'default_offset_band_mm', type:'number', label:'Dải offset chuẩn (mm)' },
      { key:'status', type:'select', required:true, label:'Trạng thái', options:['active','quarantine','retired'] }
    ]
  }
};

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _escHtml(value){ var d = document.createElement('div'); d.appendChild(document.createTextNode(String(value || ''))); return d.innerHTML; }
function _clone(obj){ return JSON.parse(JSON.stringify(obj || {})); }
function _toast(message, type){ if(typeof showToast === 'function') return showToast(message, type); if(window.console) console.log('[mdc]', message); }

function _api(action, payload, method){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'POST');
  var url = 'api.php?action=' + encodeURIComponent(action);
  var opts = { method: method || 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(opts.method !== 'GET') opts.body = JSON.stringify(payload || {});
  return fetch(url, opts).then(function(r){ return r.json(); });
}

function _injectStyles(){
  if(document.getElementById('mdc-styles')) return;
  var style = document.createElement('style');
  style.id = 'mdc-styles';
  style.textContent = [
    '.mdc-overlay{position:fixed;inset:0;background:rgba(15,23,42,.46);backdrop-filter:blur(6px);z-index:12000;display:flex;align-items:center;justify-content:center;padding:24px}',
    '.mdc-shell{width:min(1240px,96vw);height:min(86vh,880px);background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(12,45,72,.24);display:grid;grid-template-rows:auto 1fr}',
    '.mdc-header{display:flex;align-items:flex-end;justify-content:space-between;padding:24px 28px 18px;background:linear-gradient(135deg,#0c2d48 0%,#15466f 58%,#1d5e96 100%);color:#fff}',
    '.mdc-title{font-size:1.5rem;font-weight:700;letter-spacing:.01em}.mdc-subtitle{font-size:.9rem;color:rgba(255,255,255,.76);margin-top:4px}.mdc-close{border:none;background:rgba(255,255,255,.08);color:#fff;width:42px;height:42px;border-radius:12px;cursor:pointer;font-size:18px}',
    '.mdc-body{display:grid;grid-template-columns:220px minmax(0,1fr) 360px;min-height:0}.mdc-rail{border-right:1px solid #e2e8f0;background:#f8fafc;padding:18px 14px 18px 18px;overflow:auto}.mdc-list{padding:20px 22px;overflow:auto;background:#fff}.mdc-editor{border-left:1px solid #e2e8f0;background:#fcfdff;display:flex;flex-direction:column;min-height:0}',
    '.mdc-rail-title{font-size:.73rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:14px}.mdc-entity-btn{width:100%;text-align:left;border:none;background:transparent;border-radius:16px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .16s ease;color:#1e293b}.mdc-entity-btn:hover{background:#eef4fb}.mdc-entity-btn.active{background:#e8f1fb;box-shadow:inset 0 0 0 1px rgba(21,101,192,.16)}.mdc-entity-name{display:block;font-weight:700;font-size:.95rem}.mdc-entity-meta{display:block;font-size:.76rem;color:#64748b;margin-top:4px}',
    '.mdc-toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px}.mdc-search{flex:1;max-width:340px;height:42px;border:1px solid #d9e2ec;border-radius:14px;padding:0 14px;background:#fff}.mdc-search:focus,.mdc-input:focus,.mdc-select:focus,.mdc-textarea:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
    '.mdc-btn{height:42px;border:none;border-radius:14px;padding:0 16px;cursor:pointer;font-weight:700}.mdc-btn-primary{background:#1565c0;color:#fff}.mdc-btn-ghost{background:#eef2f7;color:#334155}',
    '.mdc-grid{border:1px solid #e2e8f0;border-radius:18px;overflow:hidden}.mdc-grid-head,.mdc-grid-row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,1fr);align-items:center}.mdc-grid-head{background:#f8fafc;font-size:.73rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b}.mdc-grid-head>div,.mdc-grid-row>div{padding:12px 14px;border-bottom:1px solid #edf2f7;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mdc-grid-row{cursor:pointer;font-size:.9rem}.mdc-grid-row:hover{background:#f8fbff}.mdc-grid-row.active{background:#eef5ff}.mdc-empty{padding:26px 18px;color:#64748b;font-size:.92rem}',
    '.mdc-editor-head{padding:20px 22px 12px;border-bottom:1px solid #e2e8f0}.mdc-editor-title{font-size:1rem;font-weight:800;color:#0f172a}.mdc-editor-sub{font-size:.82rem;color:#64748b;margin-top:4px}.mdc-editor-body{padding:18px 22px 24px;overflow:auto}',
    '.mdc-field{margin-bottom:14px}.mdc-label{display:block;font-size:.8rem;font-weight:700;color:#334155;margin-bottom:6px}.mdc-helper{display:block;font-size:.72rem;color:#64748b;margin-top:6px}.mdc-input,.mdc-select{width:100%;height:40px;border:1px solid #d9e2ec;border-radius:12px;padding:0 12px;background:#fff}.mdc-textarea{width:100%;min-height:88px;border:1px solid #d9e2ec;border-radius:12px;padding:10px 12px;background:#fff;resize:vertical}.mdc-footer{display:flex;gap:10px;justify-content:flex-end;padding-top:8px}',
    '.mdc-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:#eef4fb;color:#31537c;font-size:.74rem;font-weight:700}',
    '@media (max-width:1100px){.mdc-body{grid-template-columns:190px minmax(0,1fr)}.mdc-editor{grid-column:1 / -1;border-left:none;border-top:1px solid #e2e8f0}}',
    '@media (max-width:760px){.mdc-overlay{padding:10px}.mdc-shell{width:100%;height:92vh;border-radius:18px}.mdc-body{grid-template-columns:1fr}.mdc-rail{border-right:none;border-bottom:1px solid #e2e8f0}.mdc-grid-head,.mdc-grid-row{grid-template-columns:1.15fr 1.35fr .9fr}}'
  ].join('\n');
  document.head.appendChild(style);
}

function _getEntityRows(entity){ return (_mdCache && Array.isArray(_mdCache[entity])) ? _mdCache[entity] : []; }
function _normalizeText(value){ return String(value || '').toLowerCase(); }
function _matchesSearch(item, query){ if(!query) return true; var hay = Object.keys(item || {}).map(function(key){ return _normalizeText(item[key]); }).join(' '); return hay.indexOf(query) >= 0; }

function _optionLabel(entity, row){
  if(!row) return '';
  if(entity === 'customers') return row.customer_name || row.customer_id || '';
  if(entity === 'suppliers') return row.supplier_name || row.supplier_id || '';
  if(entity === 'parts') return row.part_number || '';
  if(entity === 'revisions') return row.revision_id || row.revision || '';
  if(entity === 'capas') return row.capa_number || '';
  if(entity === 'work_centers') return row.work_center_name || row.work_center_id || '';
  if(entity === 'machines') return row.machine_name || row.machine_id || '';
  if(entity === 'operators') return row.operator_name || row.operator_id || '';
  if(entity === 'tooling_assets') return row.tool_name || row.tool_id || '';
  return '';
}

function _lookupOptions(entity){
  return _getEntityRows(entity).map(function(row){
    var value = row[ENTITY_CONFIG[entity].key];
    return { value:value, label:_optionLabel(entity, row) };
  });
}

function _defaultDraft(entity){
  var draft = {};
  ENTITY_CONFIG[entity].fields.forEach(function(field){ draft[field.key] = ''; });
  if(entity === 'customers') draft.status = 'active';
  if(entity === 'suppliers') draft.status = 'approved';
  if(entity === 'parts') draft.status = 'active';
  if(entity === 'revisions') draft.status = 'released';
  if(entity === 'capas') draft.status = 'open';
  if(entity === 'work_centers') draft.status = 'active';
  if(entity === 'machines') draft.status = 'active';
  if(entity === 'operators') draft.status = 'active';
  if(entity === 'tooling_assets') { draft.status = 'active'; draft.warning_pct = '80'; draft.critical_pct = '95'; }
  return draft;
}

function _removeModal(){ var existing = document.getElementById('mdc-overlay'); if(existing) existing.remove(); }

function _renderModal(){
  _removeModal();
  var overlay = document.createElement('div');
  overlay.className = 'mdc-overlay';
  overlay.id = 'mdc-overlay';
  overlay.innerHTML = '' +
    '<div class="mdc-shell">' +
      '<div class="mdc-header">' +
        '<div><div class="mdc-title">' + _escHtml(_t('Quản lý dữ liệu nền', 'Master Data Control')) + '</div><div class="mdc-subtitle">' + _escHtml(_t('Quản trị dữ liệu dùng chung cho biểu mẫu, đơn hàng và tra cứu runtime.', 'Governed shared data for forms, orders, and runtime lookups.')) + '</div></div>' +
        '<button type="button" class="mdc-close" id="mdc-close">×</button>' +
      '</div>' +
      '<div class="mdc-body">' +
        '<aside class="mdc-rail" id="mdc-rail"></aside>' +
        '<section class="mdc-list"><div class="mdc-toolbar"><input type="search" class="mdc-search" id="mdc-search" placeholder="' + _escHtml(_t('Tìm kiếm dữ liệu nền...', 'Search master data...')) + '"><button type="button" class="mdc-btn mdc-btn-primary" id="mdc-create">' + _escHtml(_t('Tạo mới', 'Create')) + '</button></div><div id="mdc-grid"></div></section>' +
        '<section class="mdc-editor" id="mdc-editor"></section>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('mdc-close').onclick = _removeModal;
  overlay.addEventListener('click', function(e){ if(e.target === overlay) _removeModal(); });
  document.getElementById('mdc-search').addEventListener('input', function(e){ _mdState.search = _normalizeText(e.target.value); _renderList(); });
  document.getElementById('mdc-create').addEventListener('click', function(){ _mdState.selectedId = ''; _mdState.draft = _defaultDraft(_mdState.entity); _renderList(); _renderEditor(); });
  _renderRail();
  _renderList();
  _renderEditor();
}

function _renderRail(){
  var rail = document.getElementById('mdc-rail');
  if(!rail) return;
  var html = '<div class="mdc-rail-title">' + _escHtml(_t('Thực thể dữ liệu', 'Data entities')) + '</div>';
  Object.keys(ENTITY_CONFIG).forEach(function(entity){
    var cfg = ENTITY_CONFIG[entity];
    var active = entity === _mdState.entity ? ' active' : '';
    html += '<button type="button" class="mdc-entity-btn' + active + '" data-entity="' + entity + '">' +
      '<span class="mdc-entity-name">' + _escHtml(cfg.labelVi) + '</span>' +
      '<span class="mdc-entity-meta">' + _escHtml(String(_getEntityRows(entity).length)) + ' ' + _escHtml(_t('bản ghi', 'records')) + '</span>' +
    '</button>';
  });
  rail.innerHTML = html;
  Array.prototype.forEach.call(rail.querySelectorAll('[data-entity]'), function(btn){
    btn.addEventListener('click', function(){
      _mdState.entity = btn.getAttribute('data-entity') || 'customers';
      _mdState.search = '';
      _mdState.selectedId = '';
      _mdState.draft = _defaultDraft(_mdState.entity);
      var search = document.getElementById('mdc-search'); if(search) search.value = '';
      _renderRail(); _renderList(); _renderEditor();
    });
  });
}

function _renderList(){
  var host = document.getElementById('mdc-grid');
  if(!host) return;
  var cfg = ENTITY_CONFIG[_mdState.entity];
  var rows = _getEntityRows(_mdState.entity).filter(function(item){ return _matchesSearch(item, _mdState.search); });
  if(!rows.length){
    host.innerHTML = '<div class="mdc-grid"><div class="mdc-empty">' + _escHtml(cfg.emptyVi) + '</div></div>';
    return;
  }
  var html = '<div class="mdc-grid"><div class="mdc-grid-head">';
  cfg.listColumns.forEach(function(col){ html += '<div>' + _escHtml(col.label) + '</div>'; });
  html += '</div>';
  rows.forEach(function(row){
    var id = String(row[cfg.key] || '');
    var active = id === _mdState.selectedId ? ' active' : '';
    html += '<div class="mdc-grid-row' + active + '" data-id="' + _escHtml(id) + '">';
    cfg.listColumns.forEach(function(col){ html += '<div>' + _escHtml(row[col.key] || '—') + '</div>'; });
    html += '</div>';
  });
  html += '</div>';
  host.innerHTML = html;
  Array.prototype.forEach.call(host.querySelectorAll('.mdc-grid-row'), function(rowEl){
    rowEl.addEventListener('click', function(){
      var id = rowEl.getAttribute('data-id') || '';
      _mdState.selectedId = id;
      _mdState.draft = _clone(_getEntityRows(_mdState.entity).find(function(row){ return String(row[cfg.key] || '') === id; }) || _defaultDraft(_mdState.entity));
      _renderList();
      _renderEditor();
    });
  });
}

function _renderField(field, value){
  if(field.type === 'select'){
    var selectHtml = '<select class="mdc-select" name="' + field.key + '"' + (field.required ? ' required' : '') + '><option value="">' + _escHtml(_t('Chọn', 'Select')) + '</option>';
    (field.options || []).forEach(function(opt){
      var selected = String(value || '') === String(opt) ? ' selected' : '';
      selectHtml += '<option value="' + _escHtml(opt) + '"' + selected + '>' + _escHtml(opt) + '</option>';
    });
    return selectHtml + '</select>';
  }
  if(field.type === 'lookup'){
    var options = _lookupOptions(field.entity || 'customers');
    var html = '<select class="mdc-select" name="' + field.key + '"' + (field.required ? ' required' : '') + '><option value="">' + _escHtml(_t('Chọn', 'Select')) + '</option>';
    options.forEach(function(opt){
      var selected = String(value || '') === String(opt.value) ? ' selected' : '';
      html += '<option value="' + _escHtml(opt.value) + '"' + selected + '>' + _escHtml(opt.label) + '</option>';
    });
    return html + '</select>';
  }
  if(field.type === 'textarea') return '<textarea class="mdc-textarea" name="' + field.key + '"' + (field.required ? ' required' : '') + '>' + _escHtml(value || '') + '</textarea>';
  return '<input class="mdc-input" type="' + _escHtml(field.type || 'text') + '" name="' + field.key + '" value="' + _escHtml(value || '') + '"' + (field.required ? ' required' : '') + '>';
}

function _renderEditor(){
  var editor = document.getElementById('mdc-editor');
  if(!editor) return;
  var cfg = ENTITY_CONFIG[_mdState.entity];
  var draft = _mdState.draft || _defaultDraft(_mdState.entity);
  _mdState.draft = draft;
  var isUpdate = !!_mdState.selectedId;
  var html = '' +
    '<div class="mdc-editor-head">' +
      '<div class="mdc-editor-title">' + _escHtml(_t(isUpdate ? 'Cập nhật bản ghi' : 'Tạo bản ghi mới', isUpdate ? 'Update record' : 'Create record')) + '</div>' +
      '<div class="mdc-editor-sub">' + _escHtml(_t(isUpdate ? 'Chỉnh sửa dữ liệu nền có kiểm soát trước khi dùng trong biểu mẫu hoặc đơn hàng.' : 'Thiết lập dữ liệu nền để lookup, tự điền và liên kết runtime hoạt động chính xác.', isUpdate ? 'Edit governed master data before it is used in forms or orders.' : 'Create source data for lookups, autofill, and runtime linking.')) + '</div>' +
    '</div>' +
    '<div class="mdc-editor-body"><form id="mdc-form">';
  cfg.fields.forEach(function(field){
    html += '<div class="mdc-field"><label class="mdc-label">' + _escHtml(field.label) + (field.required ? ' *' : '') + '</label>' + _renderField(field, draft[field.key] || '');
    if(field.helper) html += '<span class="mdc-helper">' + _escHtml(field.helper) + '</span>';
    html += '</div>';
  });
  html += '<div class="mdc-footer"><button type="button" class="mdc-btn mdc-btn-ghost" id="mdc-reset">' + _escHtml(_t('Đặt lại', 'Reset')) + '</button><button type="submit" class="mdc-btn mdc-btn-primary">' + _escHtml(_t('Lưu dữ liệu', 'Save data')) + '</button></div></form></div>';
  editor.innerHTML = html;

  var form = document.getElementById('mdc-form');
  var reset = document.getElementById('mdc-reset');
  if(reset) reset.onclick = function(){
    _mdState.draft = _mdState.selectedId ? _clone(_getEntityRows(_mdState.entity).find(function(row){ return String(row[cfg.key] || '') === _mdState.selectedId; }) || _defaultDraft(_mdState.entity)) : _defaultDraft(_mdState.entity);
    _renderEditor();
  };
  if(form) form.onsubmit = function(e){
    e.preventDefault();
    var payload = {};
    var invalidEl = null;
    cfg.fields.forEach(function(field){
      var el = form.querySelector('[name="' + field.key + '"]');
      var value = el ? String(el.value || '').trim() : '';
      payload[field.key] = value;
      if(field.required && !value && !invalidEl) invalidEl = el;
    });
    if(invalidEl){ invalidEl.focus(); _toast(_t('Vui lòng điền đủ các trường bắt buộc.', 'Please complete the required fields.'), 'warn'); return; }
    _api('master_data_upsert', { entity:_mdState.entity, item:payload }, 'POST').then(function(res){
      if(!res || !res.ok){ _toast(_t('Không thể lưu dữ liệu nền.', 'Could not save master data.'), 'error'); return; }
      return window._mdEnsureSnapshot(true).then(function(snapshot){
        var key = cfg.key;
        _mdState.selectedId = String((res.item || payload)[key] || payload[key] || '');
        _mdState.draft = _clone(res.item || payload);
        _renderRail(); _renderList(); _renderEditor();
        window.dispatchEvent(new CustomEvent('master-data:updated', { detail:{ snapshot:snapshot, entity:_mdState.entity, item:res.item || payload } }));
        _toast(_t('Đã lưu dữ liệu nền.', 'Master data saved.'), 'success');
      });
    }).catch(function(){ _toast(_t('Lỗi mạng khi lưu dữ liệu nền.', 'Network error while saving master data.'), 'error'); });
  };
}

window._mdEnsureSnapshot = function(force){
  if(!force && _mdCache) return Promise.resolve(_mdCache);
  if(!force && _mdPromise) return _mdPromise;
  _mdPromise = _api('master_data_snapshot', {}, 'GET').then(function(res){
    _mdCache = (res && res.ok && res.data) ? res.data : Object.keys(ENTITY_CONFIG).reduce(function(out, key){ out[key] = []; return out; }, {});
    return _mdCache;
  }).finally(function(){ _mdPromise = null; });
  return _mdPromise;
};

window._mdGetSnapshot = function(){ return _mdCache ? _clone(_mdCache) : null; };
window._mdLookupOptions = function(entity){ return _lookupOptions(entity); };
window._mdOpenControl = function(entity){
  _injectStyles();
  if(entity && ENTITY_CONFIG[entity]) _mdState.entity = entity;
  return window._mdEnsureSnapshot(false).then(function(){
    _mdState.selectedId = '';
    _mdState.search = '';
    _mdState.draft = _defaultDraft(_mdState.entity);
    _renderModal();
  });
};

})();
