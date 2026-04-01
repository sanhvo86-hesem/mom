/* ============================================================================
   HESEM QMS — MASTER MODULE TEMPLATE v1.0

   Đây là template chuẩn cho TẤT CẢ 10 modules.
   Sử dụng: Design Tokens (hesem-design-tokens.css) + Block Engine (00-block-engine.js)
   CSS classes: hm-* prefix (từ Design System)

   Quy tắc:
   1. KHÔNG tự tạo CSS riêng — chỉ dùng hm-* classes
   2. KHÔNG gọi fetch() trực tiếp — dùng _api()
   3. MỌI text phải bilingual _t(vi, en)
   4. MỌI status phải dùng HmBlockEngine.badge(status)
   5. MỌI progress phải dùng HmBlockEngine.progressBar(value, max)
   6. Toast dùng HmBlockEngine.toast(msg, type)
   ============================================================================ */
(function(){
'use strict';

/* ── Helpers (chuẩn cho mọi module) ─────────────────────────────────────── */
var BE = window.HmBlockEngine || {};
function _t(vi,en){ return BE._t ? BE._t(vi,en) : vi; }
function _esc(v){ return BE._esc ? BE._esc(v) : String(v==null?'':v); }
function _api(action,payload,method){
  if(typeof apiCall==='function') return apiCall(action,payload||{},method||'POST',30000);
  return fetch('api.php?action='+encodeURIComponent(action),{
    method:method||'POST', credentials:'include',
    headers:{'Content-Type':'application/json',...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},
    body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})
  }).then(function(r){return r.json();});
}
function _toast(msg,type){ BE.toast ? BE.toast(msg,type) : alert(msg); }
function _badge(status){ return BE.badge ? BE.badge(status) : '<span>'+_esc(status)+'</span>'; }
function _progress(val,max,color){ return BE.progressBar ? BE.progressBar(val,max,color) : ''; }
function _fmtDate(v){ if(!v) return '-'; var d=v.substring(0,10).split('-'); return d[2]+'/'+d[1]+'/'+d[0]; }
function _fmtNum(v,dec){ return Number(v||0).toFixed(dec||0); }

/* ── Module State ────────────────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'tab1',      // Tab mặc định
  loading: false,

  // Data per tab (mỗi tab load riêng, cache ở đây)
  kpi: {},
  listData: [],
  detailData: null,
  formData: {},

  // Filters
  filters: {},

  // Pagination
  pagination: { offset:0, limit:50, total:0 }
};

/* ── Tab Definitions ─────────────────────────────────────────────────────── */
var TABS = [
  { key:'tab1', label:'Tổng quan',       labelEn:'Overview',    icon:'📊' },
  { key:'tab2', label:'Danh sách',       labelEn:'List',        icon:'📋' },
  { key:'tab3', label:'Tạo mới',         labelEn:'Create',      icon:'➕' },
  { key:'tab4', label:'Chi tiết',        labelEn:'Detail',      icon:'🔍' },
];

/* ── RENDER ENTRY POINT ──────────────────────────────────────────────────── */
function render(container){
  state.container = container;
  _paint();
  _loadTab(state.activeTab);
}

/* ── PAINT (Re-render toàn bộ UI) ────────────────────────────────────────── */
function _paint(){
  var c = state.container;
  if(!c) return;

  var html = '';

  /* ── Page Header ──────────────────────────────────────────────────────── */
  html += '<div class="hm-page-header">';
  html += '<div>';
  html += '<h1 class="hm-page-title">'+_t('Tên Module','Module Name')+'</h1>';
  html += '<p class="hm-page-subtitle">'+_t('Mô tả ngắn về module này','Short description of this module')+'</p>';
  html += '</div>';
  html += '<div style="display:flex;gap:var(--space-2)">';
  html += '<button class="hm-btn hm-btn-primary" data-action="create-new">'+_t('+ Tạo mới','+ Create New')+'</button>';
  html += '<button class="hm-btn hm-btn-secondary" data-action="refresh">'+_t('Làm mới','Refresh')+'</button>';
  html += '</div>';
  html += '</div>';

  /* ── Tab Bar ──────────────────────────────────────────────────────────── */
  html += '<div class="hm-tabs">';
  TABS.forEach(function(tab){
    var cls = 'hm-tab' + (state.activeTab === tab.key ? ' active' : '');
    html += '<button class="'+cls+'" data-action="switch-tab" data-tab="'+_esc(tab.key)+'">';
    html += tab.icon + ' ' + _t(tab.label, tab.labelEn);
    html += '</button>';
  });
  html += '</div>';

  /* ── Tab Content ──────────────────────────────────────────────────────── */
  html += '<div class="hm-tab-content">';

  switch(state.activeTab){
    case 'tab1': html += _renderOverviewTab(); break;
    case 'tab2': html += _renderListTab(); break;
    case 'tab3': html += _renderCreateTab(); break;
    case 'tab4': html += _renderDetailTab(); break;
    default:     html += '<div class="hm-empty">'+_t('Chọn tab','Select a tab')+'</div>';
  }

  html += '</div>';

  c.innerHTML = html;

  /* ── Event Delegation (1 listener cho toàn bộ module) ─────────────────── */
  c.removeEventListener('click', _handleClick);
  c.addEventListener('click', _handleClick);
  c.removeEventListener('change', _handleChange);
  c.addEventListener('change', _handleChange);
}

/* ── TAB 1: TỔNG QUAN (KPI + Quick Summary) ─────────────────────────────── */
function _renderOverviewTab(){
  var h = '';

  /* KPI Row — dùng class chuẩn hm-kpi-* */
  h += '<div class="hm-kpi-row">';

  var kpis = [
    { key:'total',      label:'Tổng cộng',       labelEn:'Total',       color:'var(--brand-2)', suffix:'' },
    { key:'active',     label:'Đang hoạt động',   labelEn:'Active',      color:'var(--amber)',   suffix:'' },
    { key:'completed',  label:'Hoàn thành',       labelEn:'Completed',   color:'var(--green)',   suffix:'' },
    { key:'overdue',    label:'Quá hạn',          labelEn:'Overdue',     color:'var(--red)',     suffix:'' },
    { key:'rate',       label:'Tỷ lệ đạt',       labelEn:'Achievement', color:'var(--green)',   suffix:'%' },
  ];

  kpis.forEach(function(kpi){
    var val = state.kpi[kpi.key] !== undefined ? state.kpi[kpi.key] : 0;
    h += '<div class="hm-kpi-card">';
    h += '<div class="hm-kpi-value" style="color:'+kpi.color+'">'+_esc(String(val))+kpi.suffix+'</div>';
    h += '<div class="hm-kpi-label">'+_t(kpi.label, kpi.labelEn)+'</div>';
    h += '</div>';
  });

  h += '</div>';

  /* Quick table — top 5 recent items */
  h += '<div class="hm-card" style="margin-top:var(--space-4)">';
  h += '<h3 style="margin:0 0 var(--space-3);font-size:var(--text-md);font-weight:var(--font-bold)">'+_t('Gần đây','Recent')+'</h3>';

  if(state.loading){
    h += '<div class="hm-empty">'+_t('Đang tải...','Loading...')+'</div>';
  } else if(!state.listData.length){
    h += '<div class="hm-empty">';
    h += '<div class="hm-empty-icon">📭</div>';
    h += _t('Chưa có dữ liệu','No data yet');
    h += '</div>';
  } else {
    h += '<table class="hm-table">';
    h += '<thead><tr>';
    h += '<th>#</th>';
    h += '<th>'+_t('Mã','Code')+'</th>';
    h += '<th>'+_t('Tên','Name')+'</th>';
    h += '<th>'+_t('Ngày','Date')+'</th>';
    h += '<th>'+_t('Trạng thái','Status')+'</th>';
    h += '<th></th>';
    h += '</tr></thead><tbody>';

    state.listData.slice(0,5).forEach(function(row, i){
      h += '<tr>';
      h += '<td style="color:var(--text-tertiary)">'+(i+1)+'</td>';
      h += '<td style="font-weight:var(--font-semibold)">'+_esc(row.code || row.id || '')+'</td>';
      h += '<td>'+_esc(row.name || row.title || row.description || '')+'</td>';
      h += '<td>'+_fmtDate(row.created_at || row.date || '')+'</td>';
      h += '<td>'+_badge(row.status || 'draft')+'</td>';
      h += '<td><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="view-detail" data-id="'+_esc(row.id || row.code || '')+'">'+_t('Xem','View')+'</button></td>';
      h += '</tr>';
    });

    h += '</tbody></table>';
  }
  h += '</div>';

  return h;
}

/* ── TAB 2: DANH SÁCH (Filter + Paginated Table) ────────────────────────── */
function _renderListTab(){
  var h = '';

  /* Filter Bar — dùng class chuẩn hm-filter-bar */
  h += '<div class="hm-filter-bar">';
  h += '<input type="text" class="hm-input" placeholder="'+_t('Tìm kiếm...','Search...')+'" data-filter="search" value="'+_esc(state.filters.search || '')+'" style="max-width:240px">';
  h += '<select class="hm-input hm-select" data-filter="status" style="max-width:160px">';
  h += '<option value="">'+_t('Tất cả trạng thái','All statuses')+'</option>';
  h += '<option value="draft">Draft</option>';
  h += '<option value="active">Active</option>';
  h += '<option value="completed">Completed</option>';
  h += '</select>';
  h += '<input type="date" class="hm-input" data-filter="date_from" style="max-width:160px">';
  h += '<input type="date" class="hm-input" data-filter="date_to" style="max-width:160px">';
  h += '<button class="hm-btn hm-btn-primary" data-action="apply-filter">'+_t('Tìm','Search')+'</button>';
  h += '</div>';

  /* Data Table */
  if(state.loading){
    h += '<div class="hm-empty">'+_t('Đang tải...','Loading...')+'</div>';
  } else if(!state.listData.length){
    h += '<div class="hm-empty">';
    h += '<div class="hm-empty-icon">📭</div>';
    h += _t('Không tìm thấy dữ liệu','No data found');
    h += '</div>';
  } else {
    h += '<div style="overflow-x:auto">';
    h += '<table class="hm-table">';
    h += '<thead><tr>';
    h += '<th>'+_t('Mã','Code')+'</th>';
    h += '<th>'+_t('Tên / Mô tả','Name / Description')+'</th>';
    h += '<th>'+_t('Ngày tạo','Created')+'</th>';
    h += '<th>'+_t('Trạng thái','Status')+'</th>';
    h += '<th>'+_t('Người tạo','Created by')+'</th>';
    h += '<th style="text-align:center">'+_t('Thao tác','Actions')+'</th>';
    h += '</tr></thead><tbody>';

    state.listData.forEach(function(row){
      h += '<tr>';
      h += '<td style="font-weight:var(--font-semibold);white-space:nowrap">'+_esc(row.code || row.id || '')+'</td>';
      h += '<td>'+_esc(row.name || row.title || row.description || '')+'</td>';
      h += '<td style="white-space:nowrap">'+_fmtDate(row.created_at || '')+'</td>';
      h += '<td>'+_badge(row.status || 'draft')+'</td>';
      h += '<td>'+_esc(row.created_by || '')+'</td>';
      h += '<td style="text-align:center;white-space:nowrap">';
      h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="view-detail" data-id="'+_esc(row.id || row.code || '')+'">'+_t('Xem','View')+'</button> ';
      h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="edit" data-id="'+_esc(row.id || row.code || '')+'">'+_t('Sửa','Edit')+'</button>';
      h += '</td>';
      h += '</tr>';
    });

    h += '</tbody></table>';
    h += '</div>';

    /* Pagination */
    var p = state.pagination;
    var totalPages = Math.ceil(p.total / p.limit) || 1;
    var currentPage = Math.floor(p.offset / p.limit) + 1;

    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary)">';
    h += '<span>'+_t('Hiển thị','Showing')+' '+(p.offset+1)+'-'+Math.min(p.offset+p.limit, p.total)+' / '+p.total+'</span>';
    h += '<div style="display:flex;gap:var(--space-1)">';
    if(currentPage > 1){
      h += '<button class="hm-btn hm-btn-secondary hm-btn-sm" data-action="page-prev">←</button>';
    }
    h += '<span style="padding:0 var(--space-3);line-height:28px">'+currentPage+' / '+totalPages+'</span>';
    if(currentPage < totalPages){
      h += '<button class="hm-btn hm-btn-secondary hm-btn-sm" data-action="page-next">→</button>';
    }
    h += '</div></div>';
  }

  return h;
}

/* ── TAB 3: TẠO MỚI (Form) ──────────────────────────────────────────────── */
function _renderCreateTab(){
  var h = '';

  h += '<div class="hm-card" style="max-width:800px">';
  h += '<h3 style="margin:0 0 var(--space-5);font-size:var(--text-lg);font-weight:var(--font-bold)">'+_t('Tạo mới','Create New')+'</h3>';

  /* Form grid — 2 columns */
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">';

  /* Field: Mã (auto-generated) */
  h += '<div>';
  h += '<label class="hm-label">'+_t('Mã','Code')+' <span style="color:var(--text-tertiary);font-weight:normal">('+_t('tự động','auto')+')</span></label>';
  h += '<input type="text" class="hm-input" id="tpl-code" disabled placeholder="'+_t('Tự động tạo','Auto-generated')+'">';
  h += '</div>';

  /* Field: Tên */
  h += '<div>';
  h += '<label class="hm-label hm-label-required">'+_t('Tên / Mô tả','Name / Description')+'</label>';
  h += '<input type="text" class="hm-input" id="tpl-name" placeholder="'+_t('Nhập tên...','Enter name...')+'">';
  h += '</div>';

  /* Field: Dropdown */
  h += '<div>';
  h += '<label class="hm-label hm-label-required">'+_t('Loại','Type')+'</label>';
  h += '<select class="hm-input hm-select" id="tpl-type">';
  h += '<option value="">-- '+_t('Chọn','Select')+' --</option>';
  h += '<option value="type_a">'+_t('Loại A','Type A')+'</option>';
  h += '<option value="type_b">'+_t('Loại B','Type B')+'</option>';
  h += '<option value="type_c">'+_t('Loại C','Type C')+'</option>';
  h += '</select>';
  h += '</div>';

  /* Field: Date */
  h += '<div>';
  h += '<label class="hm-label hm-label-required">'+_t('Ngày','Date')+'</label>';
  h += '<input type="date" class="hm-input" id="tpl-date" value="'+(new Date().toISOString().substring(0,10))+'">';
  h += '</div>';

  /* Field: Number */
  h += '<div>';
  h += '<label class="hm-label">'+_t('Số lượng','Quantity')+'</label>';
  h += '<input type="number" class="hm-input" id="tpl-qty" min="0" value="0">';
  h += '</div>';

  /* Field: Priority slider */
  h += '<div>';
  h += '<label class="hm-label">'+_t('Độ ưu tiên','Priority')+' <span id="tpl-priority-val" style="font-weight:var(--font-bold)">50</span>/100</label>';
  h += '<input type="range" min="1" max="100" value="50" id="tpl-priority" style="width:100%">';
  h += '</div>';

  h += '</div>'; // close grid

  /* Field: Textarea (full width) */
  h += '<div style="margin-top:var(--space-4)">';
  h += '<label class="hm-label">'+_t('Ghi chú','Notes')+'</label>';
  h += '<textarea class="hm-input hm-textarea" id="tpl-notes" rows="3" placeholder="'+_t('Ghi chú thêm...','Additional notes...')+'"></textarea>';
  h += '</div>';

  /* Action buttons */
  h += '<div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--border)">';
  h += '<button class="hm-btn hm-btn-secondary" data-action="cancel-create">'+_t('Hủy','Cancel')+'</button>';
  h += '<button class="hm-btn hm-btn-primary" data-action="submit-create">'+_t('Tạo mới','Create')+'</button>';
  h += '</div>';

  h += '</div>'; // close card

  return h;
}

/* ── TAB 4: CHI TIẾT (Detail View) ──────────────────────────────────────── */
function _renderDetailTab(){
  var h = '';
  var d = state.detailData;

  if(!d){
    h += '<div class="hm-empty">';
    h += '<div class="hm-empty-icon">🔍</div>';
    h += _t('Chọn một mục từ danh sách để xem chi tiết','Select an item from the list to view details');
    h += '</div>';
    return h;
  }

  /* Detail header */
  h += '<div class="hm-card">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4)">';
  h += '<div>';
  h += '<h2 style="margin:0;font-size:var(--text-xl);font-weight:var(--font-bold)">'+_esc(d.code || d.id || '')+'</h2>';
  h += '<p style="margin:var(--space-1) 0 0;color:var(--text-secondary)">'+_esc(d.name || d.title || '')+'</p>';
  h += '</div>';
  h += '<div style="display:flex;gap:var(--space-2);align-items:center">';
  h += _badge(d.status || 'draft');
  h += '<button class="hm-btn hm-btn-secondary hm-btn-sm" data-action="edit" data-id="'+_esc(d.id || d.code || '')+'">'+_t('Sửa','Edit')+'</button>';
  h += '</div>';
  h += '</div>';

  /* Detail grid */
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);font-size:var(--text-sm)">';

  var fields = [
    { label:'Loại',        labelEn:'Type',       value: d.type || '-' },
    { label:'Ngày tạo',    labelEn:'Created',    value: _fmtDate(d.created_at) },
    { label:'Người tạo',   labelEn:'Created by', value: d.created_by || '-' },
    { label:'Cập nhật',    labelEn:'Updated',    value: _fmtDate(d.updated_at) },
    { label:'Số lượng',    labelEn:'Quantity',   value: d.qty || d.quantity || '-' },
    { label:'Ưu tiên',     labelEn:'Priority',   value: d.priority || '-' },
  ];

  fields.forEach(function(f){
    h += '<div style="padding:var(--space-2) 0;border-bottom:1px solid var(--border)">';
    h += '<span style="color:var(--text-secondary);display:block;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">'+_t(f.label,f.labelEn)+'</span>';
    h += '<span style="font-weight:var(--font-medium)">'+_esc(String(f.value))+'</span>';
    h += '</div>';
  });

  h += '</div>';

  /* Notes */
  if(d.notes){
    h += '<div style="margin-top:var(--space-4);padding:var(--space-3);background:var(--bg-surface-alt);border-radius:var(--radius-md)">';
    h += '<span style="font-size:var(--text-xs);color:var(--text-secondary);text-transform:uppercase">'+_t('Ghi chú','Notes')+'</span>';
    h += '<p style="margin:var(--space-1) 0 0;white-space:pre-wrap">'+_esc(d.notes)+'</p>';
    h += '</div>';
  }

  /* Progress bar example */
  if(d.progress !== undefined){
    h += '<div style="margin-top:var(--space-4)">';
    h += '<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:var(--space-1)">';
    h += '<span>'+_t('Tiến độ','Progress')+'</span>';
    h += '<span style="font-weight:var(--font-bold)">'+_fmtNum(d.progress)+'%</span>';
    h += '</div>';
    h += _progress(d.progress, 100);
    h += '</div>';
  }

  h += '</div>';

  return h;
}

/* ── EVENT HANDLERS ──────────────────────────────────────────────────────── */
function _handleClick(e){
  var btn = e.target.closest('[data-action]');
  if(!btn) return;
  var action = btn.getAttribute('data-action');

  switch(action){
    case 'switch-tab':
      var tab = btn.getAttribute('data-tab');
      if(tab && tab !== state.activeTab){
        state.activeTab = tab;
        _paint();
        _loadTab(tab);
      }
      break;

    case 'refresh':
      _loadTab(state.activeTab);
      break;

    case 'create-new':
      state.activeTab = 'tab3';
      _paint();
      break;

    case 'submit-create':
      _submitCreate();
      break;

    case 'cancel-create':
      state.activeTab = 'tab1';
      _paint();
      _loadTab('tab1');
      break;

    case 'view-detail':
      var id = btn.getAttribute('data-id');
      if(id) _loadDetail(id);
      break;

    case 'apply-filter':
      _applyFilters();
      break;

    case 'page-prev':
      if(state.pagination.offset >= state.pagination.limit){
        state.pagination.offset -= state.pagination.limit;
        _loadList();
      }
      break;

    case 'page-next':
      if(state.pagination.offset + state.pagination.limit < state.pagination.total){
        state.pagination.offset += state.pagination.limit;
        _loadList();
      }
      break;
  }
}

function _handleChange(e){
  var el = e.target;

  /* Priority slider live update */
  if(el.id === 'tpl-priority'){
    var span = state.container.querySelector('#tpl-priority-val');
    if(span) span.textContent = el.value;
  }

  /* Filter change */
  if(el.hasAttribute('data-filter')){
    state.filters[el.getAttribute('data-filter')] = el.value;
  }
}

/* ── DATA LOADING ────────────────────────────────────────────────────────── */
function _loadTab(tab){
  switch(tab){
    case 'tab1': _loadKpi(); _loadList(); break;
    case 'tab2': _loadList(); break;
    case 'tab3': break; // form, no data load
    case 'tab4': break; // detail loaded on click
  }
}

function _loadKpi(){
  // ← THAY API ACTION PHÙ HỢP VỚI MODULE CỤ THỂ
  // Ví dụ: dispatch_dashboard, exception_dashboard, supplier_dashboard, etc.
  _api('MODULE_DASHBOARD_ACTION', {}, 'GET').then(function(r){
    if(r && r.ok){
      state.kpi = {
        total:     r.total_tasks || r.total || 0,
        active:    r.in_progress || r.active || 0,
        completed: r.completed || 0,
        overdue:   r.overdue || 0,
        rate:      r.achievement_pct || r.rate || 0,
      };
    }
    _paint();
  }).catch(function(){ _paint(); });
}

function _loadList(){
  state.loading = true;
  _paint();

  var params = Object.assign({
    offset: state.pagination.offset,
    limit:  state.pagination.limit,
  }, state.filters);

  // ← THAY API ACTION PHÙ HỢP
  _api('MODULE_LIST_ACTION', params, 'GET').then(function(r){
    state.loading = false;
    if(r && r.ok){
      // ← THAY data key phù hợp (r.targets, r.quotes, r.exceptions, etc.)
      state.listData = r.items || r.targets || r.data || [];
      state.pagination.total = r.total || state.listData.length;
    }
    _paint();
  }).catch(function(){
    state.loading = false;
    _paint();
    _toast(_t('Lỗi tải dữ liệu','Error loading data'), 'error');
  });
}

function _loadDetail(id){
  state.activeTab = 'tab4';
  state.loading = true;
  _paint();

  // ← THAY API ACTION PHÙ HỢP
  _api('MODULE_DETAIL_ACTION', { id: id }, 'GET').then(function(r){
    state.loading = false;
    if(r && r.ok){
      state.detailData = r.record || r.data || r;
    }
    _paint();
  }).catch(function(){
    state.loading = false;
    _paint();
  });
}

function _submitCreate(){
  var c = state.container;
  var name = (c.querySelector('#tpl-name') || {}).value || '';
  var type = (c.querySelector('#tpl-type') || {}).value || '';
  var date = (c.querySelector('#tpl-date') || {}).value || '';

  if(!name.trim()){
    _toast(_t('Vui lòng nhập tên','Please enter a name'), 'warning');
    return;
  }

  var payload = {
    name:     name.trim(),
    type:     type,
    date:     date,
    qty:      parseInt((c.querySelector('#tpl-qty') || {}).value) || 0,
    priority: parseInt((c.querySelector('#tpl-priority') || {}).value) || 50,
    notes:    (c.querySelector('#tpl-notes') || {}).value || '',
  };

  // ← THAY API ACTION PHÙ HỢP
  _api('MODULE_CREATE_ACTION', payload).then(function(r){
    if(r && r.ok){
      _toast(_t('Tạo thành công!','Created successfully!'), 'success');
      state.activeTab = 'tab1';
      _loadTab('tab1');
    } else {
      _toast((r && r.error) || _t('Lỗi tạo mới','Error creating'), 'error');
    }
  }).catch(function(){
    _toast(_t('Lỗi kết nối','Connection error'), 'error');
  });
}

function _applyFilters(){
  state.pagination.offset = 0;
  _loadList();
}

/* ── EXPORT ──────────────────────────────────────────────────────────────── */
// ← ĐỔI TÊN EXPORT PHÙ HỢP VỚI MODULE
window._renderTemplateModule = render;

})();
