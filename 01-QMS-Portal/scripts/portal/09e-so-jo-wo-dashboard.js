/* ===================================================================
   09e-so-jo-wo-dashboard.js -- Tab 5: SO-JO-WO Dashboard
   HESEM QMS Portal -- Sales/Job/Work Order hierarchy, pipeline,
   table view, detail panel, KPI cards, linked forms
   Uses: apiCall (02-state-auth-ui.js), AllocationTracker (09h),
         CascadingDropdown (09g), so-jo-wo-dashboard.css
   =================================================================== */

(function(){
'use strict';

// ── Helpers ──
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}
function _uid(){
  return 'sj-' + Math.random().toString(36).substr(2, 9);
}
function _escHtml(str){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}
function _formatĐạte(dateStr){
  if(!dateStr) return '';
  try {
    var d = new Đạte(dateStr);
    if(isNaN(d.getTime())) return dateStr;
    var dd = String(d.getĐạte()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    return dd + '/' + mm + '/' + yy;
  } catch(e){ return dateStr; }
}
function _formatĐạteTime(dateStr){
  if(!dateStr) return '';
  try {
    var d = new Đạte(dateStr);
    if(isNaN(d.getTime())) return dateStr;
    var dd = String(d.getĐạte()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mi;
  } catch(e){ return dateStr; }
}
function _apiCall(action, payload, method, timeout){
  if(typeof apiCall === 'function'){
    return apiCall(action, payload, method || 'POST', timeout || 30000);
  }
  var url = 'api.php?action=' + encodeURIComponent(action);
  var opts = { method: method || 'POST', credentials: 'include', headers: {'Content-Type':'application/json'} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(payload && (method || 'POST') !== 'GET') opts.body = JSON.stringify(payload);
  return fetch(url, opts).then(function(r){ return r.json(); });
}

// ── Status Config (from so_jo_wo_config.json) ──
var SO_STATUSES = {
  draft:         { label:'Draft',         labelVi:'Nháp',           color:'#9ca3af' },
  quoted:        { label:'Quoted',        labelVi:'Đã báo giá',     color:'#3b82f6' },
  confirmed:     { label:'Confirmed',     labelVi:'Đã xác nhận',    color:'#8b5cf6' },
  in_production: { label:'In Production', labelVi:'Đang sản xuất',  color:'#f59e0b' },
  shipped:       { label:'Shipped',       labelVi:'Đã giao hàng',   color:'#10b981' },
  closed:        { label:'Closed',        labelVi:'Đóng',           color:'#6b7280' },
  cancelled:     { label:'Cancelled',     labelVi:'Đã hủy',         color:'#ef4444' }
};
var JO_STATUSES = {
  planned:   { label:'Planned',   labelVi:'Đã lập kế hoạch', color:'#9ca3af' },
  released:  { label:'Released',  labelVi:'Đã phát hành',    color:'#3b82f6' },
  active:    { label:'Active',    labelVi:'Đang chạy',       color:'#f59e0b' },
  on_hold:   { label:'On Hold',   labelVi:'Tạm dừng',        color:'#ef4444' },
  completed: { label:'Completed', labelVi:'Hoàn thành',      color:'#10b981' },
  closed:    { label:'Closed',    labelVi:'Đóng',            color:'#6b7280' }
};
var WO_STATUSES = {
  scheduled:  { label:'Scheduled',  labelVi:'Đã lên lịch',   color:'#9ca3af' },
  setup:      { label:'Setup',      labelVi:'Đang setup',    color:'#3b82f6' },
  running:    { label:'Running',    labelVi:'Đang chạy',     color:'#f59e0b' },
  inspection: { label:'Inspection', labelVi:'Đang kiểm tra', color:'#8b5cf6' },
  completed:  { label:'Completed',  labelVi:'Hoàn thành',    color:'#10b981' },
  on_hold:    { label:'On Hold',    labelVi:'Tạm dừng',      color:'#ef4444' }
};

// Pipeline column config
var PIPELINE_COLS = [
  { key:'planned',   label:'Planned',   labelVi:'Kế hoạch',    color:'#9ca3af', bg:'#f1f5f9' },
  { key:'active',    label:'Active',    labelVi:'Đang chạy',   color:'#1565c0', bg:'#dbeafe' },
  { key:'on_hold',   label:'On Hold',   labelVi:'Tạm dừng',    color:'#d97706', bg:'#fef3c7' },
  { key:'completed', label:'Completed', labelVi:'Hoàn thành',  color:'#16a34a', bg:'#dcfce7' },
  { key:'cancelled', label:'Cancelled', labelVi:'Đã hủy',      color:'#dc2626', bg:'#fef2f2' }
];

// Role-based access config
var ROLES_CONFIG = {
  so: {
    view:   ['ceo','production_director','sales_manager','estimator','customer_service','quality_manager','planning_manager'],
    edit:   ['sales_manager','estimator','customer_service'],
    create: ['sales_manager','estimator'],
    delete: ['sales_manager']
  },
  jo: {
    view:   ['ceo','production_director','production_manager','planning_manager','supervisor','quality_manager','quality_engineer','sales_manager'],
    edit:   ['production_manager','planning_manager','quality_manager'],
    create: ['production_manager','planning_manager'],
    delete: ['production_manager']
  },
  wo: {
    view:   ['ceo','production_director','production_manager','planning_manager','supervisor','operator','quality_manager','quality_engineer'],
    edit:   ['production_manager','planning_manager','supervisor','operator'],
    create: ['production_manager','planning_manager'],
    delete: ['production_manager']
  }
};

// ── Module State ──
var _containerId = '';
var _viewMode = 'hierarchy'; // hierarchy | pipeline | table
var _hierarchyĐạta = [];
var _flatĐạta = [];
var _kpiĐạta = {};
var _selectedNode = null;
var _detailOpen = false;
var _expandedNodes = {};
var _tablePage = 1;
var _tablePageSize = 20;
var _tableSort = { key: 'order_number', dir: 'asc' };
var _tableSearch = '';
var _dragItem = null;

// ===================================================================
// Main Render
// ===================================================================

window._renderSoJoWoDashboard = function(schemas, entries, container){
  _containerId = container.id || 'sojowo-root';
  if(!container.id) container.id = _containerId;
  _viewMode = 'hierarchy';
  _hierarchyĐạta = [];
  _flatĐạta = [];
  _kpiĐạta = {};
  _selectedNode = null;
  _detailOpen = false;
  _expandedNodes = {};
  _tablePage = 1;
  _tableSearch = '';

  // Show loading
  container.innerHTML = '<div class="sojowo-container"><div class="sojowo-loading-full">' +
    '<div class="sojowo-spinner"></div>' +
    '<p>' + _t('Đang tải dữ liệu đơn hàng...', 'Loading order data...') + '</p>' +
    '</div></div>';

  // Load data in parallel
  Promise.all([
    _apiCall('order_dashboard_stats', {}),
    _apiCall('order_hierarchy', {})
  ]).then(function(results){
    _kpiĐạta = (results[0] && results[0].ok) ? (results[0].data || results[0]) : {};
    _hierarchyĐạta = (results[1] && results[1].ok) ? (results[1].data || results[1].hierarchy || []) : [];
    _flatĐạta = _flattenHierarchy(_hierarchyĐạta);
    _renderDashboard(container);
  }).catch(function(){
    _kpiĐạta = {};
    _hierarchyĐạta = [];
    _flatĐạta = [];
    _renderDashboard(container);
  });
};

function _renderDashboard(container){
  var h = '';
  h += '<div class="sojowo-container">';

  // ── Header ──
  h += '<div class="sojowo-header">';
  h += '<h1>' + _t('Quản lý Đơn hàng', 'Order Management') + '</h1>';
  h += '<div class="sojowo-header-actions">';

  // Create buttons (role-based)
  if(_hasPermission('so', 'create')){
    h += '<button type="button" class="sojowo-create-btn sojowo-create-so" id="' + _containerId + '-create-so">';
    h += '+ ' + _t('Tạo SO', 'New SO') + '</button>';
  }
  if(_hasPermission('jo', 'create')){
    h += '<button type="button" class="sojowo-create-btn sojowo-create-jo" id="' + _containerId + '-create-jo">';
    h += '+ ' + _t('Tạo JO', 'New JO') + '</button>';
  }

  // View toggle
  h += '<div class="sojowo-view-toggle">';
  h += '<button type="button" class="sojowo-view-btn' + (_viewMode === 'hierarchy' ? ' active' : '') + '" data-view="hierarchy">';
  h += _t('Cây phân cấp', 'Hierarchy') + '</button>';
  h += '<button type="button" class="sojowo-view-btn' + (_viewMode === 'pipeline' ? ' active' : '') + '" data-view="pipeline">';
  h += _t('Pipeline', 'Pipeline') + '</button>';
  h += '<button type="button" class="sojowo-view-btn' + (_viewMode === 'table' ? ' active' : '') + '" data-view="table">';
  h += _t('Bảng', 'Table') + '</button>';
  h += '</div>';

  h += '</div></div>';

  // ── KPI Cards ──
  h += _renderKpiCards();

  // ── Main Content Area ──
  h += '<div class="sojowo-main" id="' + _containerId + '-main">';
  h += _renderViewContent();
  h += '</div>';

  // ── Detail Panel ──
  h += '<div class="sojowo-detail-overlay" id="' + _containerId + '-overlay"></div>';
  h += '<div class="sojowo-detail" id="' + _containerId + '-detail">';
  h += '<div class="sojowo-detail-header">';
  h += '<h2 id="' + _containerId + '-detail-title">' + _t('Chi tiết', 'Details') + '</h2>';
  h += '<button type="button" class="sojowo-detail-close" id="' + _containerId + '-detail-close">';
  h += '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
  h += '</button>';
  h += '</div>';
  h += '<div class="sojowo-detail-body" id="' + _containerId + '-detail-body"></div>';
  h += '<div class="sojowo-detail-actions" id="' + _containerId + '-detail-actions"></div>';
  h += '</div>';

  h += '</div>'; // .sojowo-container
  container.innerHTML = h;

  _bindGlobalEvents();
}

// ===================================================================
// KPI Cards
// ===================================================================

function _renderKpiCards(){
  var k = _kpiĐạta;
  var h = '<div class="sojowo-kpi">';

  // Active SOs
  h += '<div class="sojowo-kpi-card sojowo-kpi-so">';
  h += '<div class="sojowo-kpi-label">' + _t('SO đang hoạt động', 'Active SOs') + '</div>';
  h += '<strong>' + _escHtml(String(k.active_so || 0)) + '</strong>';
  h += '<span>' + _t('Đơn hàng', 'Sales Orders') + '</span>';
  h += '</div>';

  // Active JOs
  h += '<div class="sojowo-kpi-card sojowo-kpi-jo">';
  h += '<div class="sojowo-kpi-label">' + _t('JO đang hoạt động', 'Active JOs') + '</div>';
  h += '<strong>' + _escHtml(String(k.active_jo || 0)) + '</strong>';
  h += '<span>' + _t('Lệnh sản xuất', 'Job Orders') + '</span>';
  h += '</div>';

  // On-Time %
  var otd = k.otd_percent != null ? k.otd_percent : '-';
  h += '<div class="sojowo-kpi-card sojowo-kpi-completion">';
  h += '<div class="sojowo-kpi-label">' + _t('Đúng hạn', 'On-Time %') + '</div>';
  h += '<strong>' + _escHtml(String(otd)) + (otd !== '-' ? '%' : '') + '</strong>';
  h += '<span>' + _t('Mục tiêu: 95%', 'Target: 95%') + '</span>';
  if(typeof otd === 'number'){
    h += '<div class="sojowo-kpi-trend ' + (otd >= 95 ? 'sojowo-kpi-trend-up' : 'sojowo-kpi-trend-down') + '">';
    h += (otd >= 95 ? '+ ' : '') + _t('Đạt', otd >= 95 ? 'On track' : 'Below target');
    h += '</div>';
  }
  h += '</div>';

  // Overdue Count
  h += '<div class="sojowo-kpi-card sojowo-kpi-overdue">';
  h += '<div class="sojowo-kpi-label">' + _t('Quá hạn', 'Overdue') + '</div>';
  h += '<strong>' + _escHtml(String(k.overdue_count || 0)) + '</strong>';
  h += '<span>' + _t('Cần xử lý', 'Need attention') + '</span>';
  h += '</div>';

  h += '</div>';
  return h;
}

// ===================================================================
// View Rendering
// ===================================================================

function _renderViewContent(){
  if(_viewMode === 'hierarchy') return _renderHierarchyView();
  if(_viewMode === 'pipeline') return _renderPipelineView();
  if(_viewMode === 'table') return _renderTableView();
  return '';
}

// ── Hierarchy Tree View ──
function _renderHierarchyView(){
  var h = '';
  h += '<div class="sojowo-hierarchy">';
  h += '<div class="sojowo-tree-header">';
  h += '<h3>' + _t('Cây đơn hàng SO / JO / WO', 'Order Hierarchy SO / JO / WO') + '</h3>';
  h += '<input type="text" class="sojowo-tree-search" id="' + _containerId + '-tree-search" ';
  h += 'placeholder="' + _t('Tìm kiếm đơn hàng...', 'Search orders...') + '">';
  h += '</div>';
  h += '<div class="sojowo-tree-body" id="' + _containerId + '-tree-body">';

  if(!_hierarchyĐạta || _hierarchyĐạta.length === 0){
    h += '<div class="sojowo-tree-empty">';
    h += '<p>' + _t('Chưa có đơn hàng nào', 'No orders yet') + '</p>';
    h += '</div>';
  } else {
    for(var i = 0; i < _hierarchyĐạta.length; i++){
      h += _renderTreeNode(_hierarchyĐạta[i], 'so', 0);
    }
  }

  h += '</div></div>';
  return h;
}

function _renderTreeNode(node, type, depth){
  var id = node.so_number || node.jo_number || node.wo_number || '';
  var nodeId = _uid();
  var isExpanded = _expandedNodes[id] || false;
  var children = node.job_orders || node.work_orders || [];
  var hasChildren = children.length > 0;
  var isSelected = _selectedNode && _selectedNode.id === id;

  var statusMap = type === 'so' ? SO_STATUSES : (type === 'jo' ? JO_STATUSES : WO_STATUSES);
  var status = node.status || '';
  var statusCfg = statusMap[status] || { label: status, labelVi: status, color: '#94a3b8' };
  var statusLabel = _t(statusCfg.labelVi || statusCfg.label, statusCfg.label);

  // Node label
  var label = '';
  if(type === 'so'){
    label = (node.customer_name || node.customer_id || '') + (node.customer_po ? ' / PO: ' + node.customer_po : '');
  } else if(type === 'jo'){
    label = (node.part_number || '') + (node.part_revision ? ' Rev.' + node.part_revision : '');
  } else {
    label = (node.operation_desc || '') + (node.machine_id ? ' [' + node.machine_id + ']' : '');
  }

  var h = '';
  h += '<div class="sojowo-node sojowo-node-' + type + '" style="padding-left:' + (depth * 20) + 'px">';
  h += '<div class="sojowo-node-row' + (isSelected ? ' selected' : '') + '" data-node-id="' + _escHtml(id) + '" data-node-type="' + type + '">';

  // Toggle arrow
  if(hasChildren){
    h += '<button type="button" class="sojowo-node-toggle' + (isExpanded ? ' expanded' : '') + '" data-toggle-id="' + _escHtml(id) + '" aria-label="' + _t('Mở rộng', 'Expand') + '">';
    h += '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
    h += '</button>';
  } else {
    h += '<span class="sojowo-node-toggle-placeholder"></span>';
  }

  // Type icon
  var iconLabel = type.toUpperCase();
  h += '<div class="sojowo-node-icon">' + iconLabel + '</div>';

  // Label
  h += '<span class="sojowo-node-label" title="' + _escHtml(label) + '">' + _escHtml(label || '-') + '</span>';

  // ID
  h += '<span class="sojowo-node-id">' + _escHtml(id) + '</span>';

  // Due date
  var dueĐạte = node.due_date || '';
  if(dueĐạte){
    h += '<span class="sojowo-node-id" style="margin-left:6px">' + _escHtml(_formatĐạte(dueĐạte)) + '</span>';
  }

  // Qty
  var qty = node.total_qty || node.qty_ordered || node.qty_completed || '';
  if(qty){
    h += '<span class="sojowo-node-id" style="margin-left:6px">x' + _escHtml(String(qty)) + '</span>';
  }

  // Status badge
  h += '<span class="sojowo-node-status" style="color:' + statusCfg.color + ';background:' + _hexToRgba(statusCfg.color, 0.12) + '">';
  h += _escHtml(statusLabel) + '</span>';

  h += '</div>'; // .sojowo-node-row

  // Children
  if(hasChildren){
    var childType = type === 'so' ? 'jo' : 'wo';
    h += '<div class="sojowo-node-children' + (isExpanded ? '' : ' collapsed') + '">';
    for(var c = 0; c < children.length; c++){
      h += _renderTreeNode(children[c], childType, depth + 1);
    }
    h += '</div>';
  }

  h += '</div>'; // .sojowo-node
  return h;
}

// ── Pipeline (Kanban) View ──
function _renderPipelineView(){
  var grouped = _groupByPipelineStatus(_flatĐạta);

  var h = '<div class="sojowo-pipeline">';

  for(var ci = 0; ci < PIPELINE_COLS.length; ci++){
    var col = PIPELINE_COLS[ci];
    var items = grouped[col.key] || [];

    h += '<div class="sojowo-pipeline-col sojowo-col-' + col.key + '" data-pipeline-col="' + col.key + '">';
    h += '<div class="sojowo-pipeline-col-header">';
    h += '<span class="sojowo-pipeline-col-title">' + _t(col.labelVi, col.label) + '</span>';
    h += '<span class="sojowo-pipeline-col-count">' + items.length + '</span>';
    h += '</div>';
    h += '<div class="sojowo-pipeline-col-body" data-drop-col="' + col.key + '">';

    for(var j = 0; j < items.length; j++){
      h += _renderPipelineCard(items[j]);
    }

    if(items.length === 0){
      h += '<div class="sojowo-pipeline-empty">' + _t('Không có', 'Empty') + '</div>';
    }

    h += '</div></div>';
  }

  h += '</div>';
  return h;
}

function _renderPipelineCard(item){
  var type = item._type || 'so';
  var id = item.so_number || item.jo_number || item.wo_number || '';
  var label = '';
  if(type === 'so') label = item.customer_name || item.customer_id || '';
  else if(type === 'jo') label = item.part_number || '';
  else label = item.operation_desc || '';

  var dueĐạte = item.due_date || '';
  var qty = item.total_qty || item.qty_ordered || item.qty_completed || '';

  // Progress calculation for JO
  var progress = 0;
  if(type === 'jo' && item.qty_ordered > 0){
    progress = Math.min(100, Math.round(((item.qty_good || 0) / item.qty_ordered) * 100));
  }

  var h = '';
  h += '<div class="sojowo-card" draggable="true" data-card-id="' + _escHtml(id) + '" data-card-type="' + type + '">';
  h += '<div class="sojowo-card-header">';
  h += '<span class="sojowo-card-id">' + _escHtml(id) + '</span>';
  h += '<span class="sojowo-card-type sojowo-card-type-' + type + '">' + type.toUpperCase() + '</span>';
  h += '</div>';
  h += '<div class="sojowo-card-title">' + _escHtml(label || '-') + '</div>';
  h += '<div class="sojowo-card-meta">';

  if(dueĐạte){
    h += '<span class="sojowo-card-meta-item">';
    h += '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5z"/></svg>';
    h += _escHtml(_formatĐạte(dueĐạte));
    h += '</span>';
  }
  if(qty){
    h += '<span class="sojowo-card-meta-item">x' + _escHtml(String(qty)) + '</span>';
  }

  h += '</div>';

  if(type === 'jo' && progress > 0){
    var barColor = progress >= 100 ? 'green' : (progress >= 50 ? 'blue' : 'amber');
    h += '<div class="sojowo-card-progress">';
    h += '<div class="sojowo-card-progress-bar sojowo-card-progress-bar-' + barColor + '" style="width:' + progress + '%"></div>';
    h += '</div>';
  }

  h += '</div>';
  return h;
}

// ── Table View ──
function _renderTableView(){
  var h = '';
  h += '<div class="sojowo-table-container">';

  // Search & filter bar
  h += '<div class="sojowo-table-toolbar">';
  h += '<input type="text" class="sojowo-table-search" id="' + _containerId + '-table-search" ';
  h += 'placeholder="' + _t('Tìm kiếm đơn hàng...', 'Search orders...') + '" value="' + _escHtml(_tableSearch) + '">';
  h += '</div>';

  // Table
  h += '<div class="sojowo-table-wrap">';
  h += '<table class="sojowo-table" id="' + _containerId + '-table">';
  h += '<thead><tr>';

  var cols = [
    { key:'order_number', label:_t('Mã đơn', 'Order #') },
    { key:'type',         label:_t('Loại', 'Type') },
    { key:'customer',     label:_t('Khach hang / Chi tiết', 'Customer / Part') },
    { key:'status',       label:_t('Trạng thái', 'Status') },
    { key:'due_date',     label:_t('Han', 'Due Đạte') },
    { key:'qty',          label:_t('SL', 'Qty') },
    { key:'progress',     label:_t('Tiến độ', 'Progress') }
  ];

  for(var ci = 0; ci < cols.length; ci++){
    var col = cols[ci];
    var sortIcon = '';
    if(_tableSort.key === col.key){
      sortIcon = _tableSort.dir === 'asc' ? ' &#x25B2;' : ' &#x25BC;';
    }
    h += '<th class="sojowo-th-sortable" data-sort-key="' + col.key + '">' + _escHtml(col.label) + sortIcon + '</th>';
  }
  h += '</tr></thead>';
  h += '<tbody>';

  // Filter and sort data
  var filtered = _filterTableĐạta(_flatĐạta, _tableSearch);
  var sorted = _sortTableĐạta(filtered, _tableSort.key, _tableSort.dir);

  // Paginate
  var totalPages = Math.ceil(sorted.length / _tablePageSize) || 1;
  var start = (_tablePage - 1) * _tablePageSize;
  var pageItems = sorted.slice(start, start + _tablePageSize);

  if(pageItems.length === 0){
    h += '<tr><td colspan="7" class="sojowo-table-empty">' + _t('Không có kết quả', 'No results') + '</td></tr>';
  }

  for(var i = 0; i < pageItems.length; i++){
    h += _renderTableRow(pageItems[i]);
  }

  h += '</tbody></table></div>';

  // Pagination
  if(totalPages > 1){
    h += _renderTablePagination(totalPages);
  }

  h += '</div>';
  return h;
}

function _renderTableRow(item){
  var type = item._type || 'so';
  var id = item.so_number || item.jo_number || item.wo_number || '';
  var customer = '';
  if(type === 'so') customer = item.customer_name || item.customer_id || '';
  else if(type === 'jo') customer = (item.part_number || '') + (item.part_revision ? ' Rev.' + item.part_revision : '');
  else customer = item.operation_desc || '';

  var status = item.status || '';
  var statusMap = type === 'so' ? SO_STATUSES : (type === 'jo' ? JO_STATUSES : WO_STATUSES);
  var statusCfg = statusMap[status] || { label: status, labelVi: status, color: '#94a3b8' };
  var statusLabel = _t(statusCfg.labelVi || statusCfg.label, statusCfg.label);

  var dueĐạte = item.due_date || '';
  var qty = item.total_qty || item.qty_ordered || item.qty_completed || '';

  // Progress
  var progress = 0;
  if(type === 'jo' && item.qty_ordered > 0){
    progress = Math.min(100, Math.round(((item.qty_good || 0) / item.qty_ordered) * 100));
  } else if(type === 'wo' && (status === 'completed')){
    progress = 100;
  } else if(type === 'wo' && status === 'running'){
    progress = 50;
  }

  var h = '<tr class="sojowo-table-row" data-row-id="' + _escHtml(id) + '" data-row-type="' + type + '">';
  h += '<td><code class="sojowo-table-id">' + _escHtml(id) + '</code></td>';
  h += '<td><span class="sojowo-card-type sojowo-card-type-' + type + '">' + type.toUpperCase() + '</span></td>';
  h += '<td>' + _escHtml(customer) + '</td>';
  h += '<td><span class="sojowo-node-status" style="color:' + statusCfg.color + ';background:' + _hexToRgba(statusCfg.color, 0.12) + '">' + _escHtml(statusLabel) + '</span></td>';
  h += '<td class="sojowo-table-date">' + _escHtml(_formatĐạte(dueĐạte)) + '</td>';
  h += '<td class="sojowo-table-center">' + _escHtml(qty ? String(qty) : '-') + '</td>';

  // Progress bar
  h += '<td>';
  if(progress > 0){
    var barColor = progress >= 100 ? 'green' : (progress >= 50 ? 'blue' : 'amber');
    h += '<div class="sojowo-card-progress" style="min-width:60px">';
    h += '<div class="sojowo-card-progress-bar sojowo-card-progress-bar-' + barColor + '" style="width:' + progress + '%"></div>';
    h += '</div>';
    h += '<span style="font-size:10px;color:#64748b;margin-left:4px">' + progress + '%</span>';
  } else {
    h += '<span style="font-size:10px;color:#94a3b8">-</span>';
  }
  h += '</td>';

  h += '</tr>';
  return h;
}

function _renderTablePagination(totalPages){
  var h = '<div class="sojowo-table-pagination">';
  h += '<button type="button" class="sojowo-tpage-btn" data-page="' + (_tablePage - 1) + '"' + (_tablePage <= 1 ? ' disabled' : '') + '>';
  h += '&laquo; ' + _t('Trước', 'Prev') + '</button>';

  var startP = Math.max(1, _tablePage - 2);
  var endP = Math.min(totalPages, _tablePage + 2);
  for(var p = startP; p <= endP; p++){
    h += '<button type="button" class="sojowo-tpage-btn' + (p === _tablePage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
  }

  h += '<button type="button" class="sojowo-tpage-btn" data-page="' + (_tablePage + 1) + '"' + (_tablePage >= totalPages ? ' disabled' : '') + '>';
  h += _t('Sau', 'Next') + ' &raquo;</button>';
  h += '</div>';
  return h;
}

// ===================================================================
// Detail Panel
// ===================================================================

function _openDetail(id, type){
  _detailOpen = true;
  var panel = document.getElementById(_containerId + '-detail');
  var overlay = document.getElementById(_containerId + '-overlay');
  if(!panel || !overlay) return;

  panel.classList.add('open');
  overlay.classList.add('active');

  var titleEl = document.getElementById(_containerId + '-detail-title');
  var bodyEl = document.getElementById(_containerId + '-detail-body');
  var actionsEl = document.getElementById(_containerId + '-detail-actions');
  if(!bodyEl) return;

  // Loading state
  bodyEl.innerHTML = '<div class="sojowo-detail-loading"><div class="sojowo-spinner"></div></div>';
  if(actionsEl) actionsEl.innerHTML = '';
  if(titleEl) titleEl.textContent = id;

  // Fetch detail
  _apiCall('order_detail', { order_id: id, order_type: type }).then(function(data){
    if(!data || !data.ok){
      bodyEl.innerHTML = '<p style="color:#dc2626">' + _t('Không thể tải chi tiết', 'Could not load details') + '</p>';
      return;
    }

    var order = data.data || data;
    _selectedNode = { id: id, type: type, data: order };
    _renderDetailContent(order, type, bodyEl, actionsEl);
  }).catch(function(){
    bodyEl.innerHTML = '<p style="color:#dc2626">' + _t('Lỗi mạng', 'Network error') + '</p>';
  });
}

function _closeDetail(){
  _detailOpen = false;
  _selectedNode = null;
  var panel = document.getElementById(_containerId + '-detail');
  var overlay = document.getElementById(_containerId + '-overlay');
  if(panel) panel.classList.remove('open');
  if(overlay) overlay.classList.remove('active');
}

function _renderDetailContent(order, type, bodyEl, actionsEl){
  var h = '';

  // ── Order Information Section ──
  h += '<div class="sojowo-detail-section">';
  h += '<h4>' + _t('Thông tin đơn hàng', 'Order Information') + '</h4>';

  var fields = _getFieldsForType(type);
  for(var i = 0; i < fields.length; i++){
    var f = fields[i];
    var val = order[f.key];
    if(val === undefined || val === null) val = '';

    // Format special types
    if(f.type === 'date') val = _formatĐạte(val);
    if(f.type === 'datetime') val = _formatĐạteTime(val);
    if(f.type === 'boolean') val = val ? _t('Co', 'Yes') : _t('Khong', 'No');

    // Status field with badge
    if(f.key === 'status'){
      var statusMap = type === 'so' ? SO_STATUSES : (type === 'jo' ? JO_STATUSES : WO_STATUSES);
      var sCfg = statusMap[val] || { label: val, color: '#94a3b8' };
      h += '<div class="sojowo-detail-field">';
      h += '<span class="sojowo-detail-field-label">' + _escHtml(f.label) + '</span>';
      h += '<span class="sojowo-node-status" style="color:' + sCfg.color + ';background:' + _hexToRgba(sCfg.color, 0.12) + '">';
      h += _escHtml(_t(sCfg.labelVi || sCfg.label, sCfg.label)) + '</span>';
      h += '</div>';
      continue;
    }

    h += '<div class="sojowo-detail-field">';
    h += '<span class="sojowo-detail-field-label">' + _escHtml(f.label) + '</span>';
    h += '<span class="sojowo-detail-field-value">' + _escHtml(String(val) || '-') + '</span>';
    h += '</div>';
  }
  h += '</div>';

  // ── Status Timeline ──
  if(order.status_history && order.status_history.length > 0){
    h += '<div class="sojowo-detail-section">';
    h += '<h4>' + _t('Lịch sử trạng thái', 'Status Timeline') + '</h4>';
    h += '<div class="sojowo-timeline">';
    for(var t = 0; t < order.status_history.length; t++){
      var th = order.status_history[t];
      h += '<div class="sojowo-timeline-item">';
      h += '<div class="sojowo-timeline-dot"></div>';
      h += '<div class="sojowo-timeline-content">';
      h += '<span class="sojowo-timeline-status">' + _escHtml(th.status || '') + '</span>';
      h += '<span class="sojowo-timeline-date">' + _escHtml(_formatĐạteTime(th.timestamp || th.date || '')) + '</span>';
      if(th.user) h += '<span class="sojowo-timeline-user">' + _escHtml(th.user) + '</span>';
      h += '</div></div>';
    }
    h += '</div></div>';
  }

  // ── Operations List (for JO) ──
  if(type === 'jo' && order.operations && order.operations.length > 0){
    h += '<div class="sojowo-detail-section">';
    h += '<h4>' + _t('Các công đoạn', 'Operations') + '</h4>';
    h += '<div class="sojowo-ops-list">';
    for(var o = 0; o < order.operations.length; o++){
      var op = order.operations[o];
      var opStatus = WO_STATUSES[op.status] || { label: op.status || '', color: '#94a3b8' };
      h += '<div class="sojowo-ops-item">';
      h += '<div class="sojowo-ops-num">OP' + _escHtml(String(op.operation_number || '')) + '</div>';
      h += '<div class="sojowo-ops-info">';
      h += '<div class="sojowo-ops-desc">' + _escHtml(op.operation_desc || '') + '</div>';
      h += '<div class="sojowo-ops-meta">';
      if(op.machine_id) h += '<span>' + _escHtml(op.machine_id) + '</span>';
      if(op.setup_time_est) h += '<span>Setup: ' + _escHtml(String(op.setup_time_est)) + 'min</span>';
      if(op.run_time_est) h += '<span>Run: ' + _escHtml(String(op.run_time_est)) + 'min</span>';
      h += '</div></div>';
      h += '<span class="sojowo-node-status" style="color:' + opStatus.color + ';background:' + _hexToRgba(opStatus.color, 0.12) + '">';
      h += _escHtml(_t(opStatus.labelVi || opStatus.label, opStatus.label)) + '</span>';
      h += '</div>';
    }
    h += '</div></div>';
  }

  // ── Linked Forms / Records ──
  h += '<div class="sojowo-linked-forms">';
  h += '<h4>' + _t('Biểu mẫu / Hồ sơ liên kết', 'Linked Forms & Records') + '</h4>';

  if(order.linked_forms && order.linked_forms.length > 0){
    for(var lf = 0; lf < order.linked_forms.length; lf++){
      var form = order.linked_forms[lf];
      var iconClass = 'sojowo-linked-form-icon-default';
      if(form.type === 'NCR') iconClass = 'sojowo-linked-form-icon-ncr';
      else if(form.type === 'CAPA') iconClass = 'sojowo-linked-form-icon-capa';
      else if(form.type === 'FAI') iconClass = 'sojowo-linked-form-icon-fai';

      h += '<div class="sojowo-linked-form-item" data-linked-id="' + _escHtml(form.record_id || '') + '">';
      h += '<div class="sojowo-linked-form-icon ' + iconClass + '">' + _escHtml((form.type || '?').charAt(0)) + '</div>';
      h += '<div class="sojowo-linked-form-info">';
      h += '<span class="sojowo-linked-form-code">' + _escHtml(form.record_id || form.form_code || '') + '</span>';
      h += '<span class="sojowo-linked-form-title">' + _escHtml(form.title || form.description || '') + '</span>';
      h += '</div>';
      if(form.status){
        h += '<span class="sojowo-linked-form-status" style="background:#f1f5f9;color:#64748b">' + _escHtml(form.status) + '</span>';
      }
      h += '</div>';
    }
  } else {
    h += '<p style="font-size:12px;color:#94a3b8">' + _t('Chưa có biểu mẫu liên kết', 'No linked forms yet') + '</p>';
  }

  // Link form button
  if(_hasPermission(type, 'edit')){
    h += '<button type="button" class="sojowo-link-form-btn" id="' + _containerId + '-link-form-btn">';
    h += '+ ' + _t('Liên kết biểu mẫu', 'Link form') + '</button>';
  }

  h += '</div>';

  bodyEl.innerHTML = h;

  // ── Actions Bar ──
  if(actionsEl){
    var ah = '';
    var status = order.status || '';
    var transitions = _getTransitions(type, status);

    if(transitions.length > 0 && _hasPermission(type, 'edit')){
      for(var ti = 0; ti < transitions.length; ti++){
        var tr = transitions[ti];
        var trStatusMap = type === 'so' ? SO_STATUSES : (type === 'jo' ? JO_STATUSES : WO_STATUSES);
        var trCfg = trStatusMap[tr] || { label: tr, color: '#64748b' };

        ah += '<button type="button" class="sojowo-action-btn" data-transition="' + _escHtml(tr) + '" ';
        ah += 'style="border-color:' + trCfg.color + ';color:' + trCfg.color + '">';
        ah += _t(trCfg.labelVi || trCfg.label, trCfg.label);
        ah += '</button>';
      }
    }

    actionsEl.innerHTML = ah;

    // Bind transition buttons
    actionsEl.addEventListener('click', function(e){
      var btn = e.target.closest('.sojowo-action-btn');
      if(!btn) return;
      var newStatus = btn.getAttribute('data-transition');
      if(newStatus && _selectedNode){
        _updateOrderStatus(_selectedNode.id, _selectedNode.type, newStatus);
      }
    });

    // Bind link form button
    var linkBtn = document.getElementById(_containerId + '-link-form-btn');
    if(linkBtn){
      linkBtn.addEventListener('click', function(){
        _showLinkFormModal();
      });
    }
  }
}

function _updateOrderStatus(orderId, type, newStatus){
  var actionMap = { so: 'order_so_update_status', jo: 'order_jo_update_status', wo: 'order_wo_update_status' };
  var action = actionMap[type] || 'order_jo_update_status';

  _apiCall(action, { order_id: orderId, status: newStatus }).then(function(data){
    if(data && data.ok){
      _showToast(_t('Đã cập nhật trạng thái', 'Status updated'), 'success');
      // Re-open detail to refresh
      _openDetail(orderId, type);
      // Refresh main view
      _refreshMainView();
    } else {
      _showToast(_t('Lỗi cập nhật: ' + (data && data.error || ''), 'Update error: ' + (data && data.error || '')), 'error');
    }
  }).catch(function(){
    _showToast(_t('Lỗi mạng', 'Network error'), 'error');
  });
}

// ===================================================================
// Create / Edit Modals
// ===================================================================

function _showCreateModal(type){
  var fields = _getFieldsForType(type);
  var title = type === 'so' ? _t('Tạo Sales Order mới', 'Create New Sales Order') : _t('Tạo Job Order mới', 'Create New Job Order');

  var overlay = document.createElement('div');
  overlay.className = 'sojowo-modal-overlay';
  overlay.id = _containerId + '-modal-overlay';

  var modal = document.createElement('div');
  modal.className = 'sojowo-modal';
  modal.id = _containerId + '-modal';

  var h = '';
  h += '<div class="sojowo-modal-header">';
  h += '<h3>' + _escHtml(title) + '</h3>';
  h += '<button type="button" class="sojowo-detail-close sojowo-modal-close">';
  h += '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
  h += '</button>';
  h += '</div>';
  h += '<div class="sojowo-modal-body">';
  h += '<form class="sojowo-modal-form" id="' + _containerId + '-modal-form">';

  for(var i = 0; i < fields.length; i++){
    var f = fields[i];
    if(f.key === 'status' || f.key === 'so_number' && type === 'so' || f.key === 'jo_number' && type === 'jo' || f.key === 'wo_number') continue;
    if(f.key.indexOf('actual_') === 0 || f.key === 'qty_good' || f.key === 'qty_scrap' || f.key === 'qty_completed') continue;

    h += '<div class="sojowo-modal-field">';
    h += '<label class="sojowo-modal-label">' + _escHtml(f.label) + (f.required ? ' <span style="color:#dc2626">*</span>' : '') + '</label>';

    if(f.type === 'text'){
      h += '<textarea class="sojowo-modal-input" name="' + f.key + '" rows="3"' + (f.required ? ' required' : '') + '></textarea>';
    } else if(f.type === 'date' || f.type === 'datetime'){
      h += '<input type="date" class="sojowo-modal-input" name="' + f.key + '"' + (f.required ? ' required' : '') + '>';
    } else if(f.type === 'boolean'){
      h += '<select class="sojowo-modal-input" name="' + f.key + '">';
      h += '<option value="">' + _t('Chọn', 'Select') + '</option>';
      h += '<option value="true">' + _t('Co', 'Yes') + '</option>';
      h += '<option value="false">' + _t('Khong', 'No') + '</option>';
      h += '</select>';
    } else if(f.type === 'integer' || f.type === 'number'){
      h += '<input type="number" class="sojowo-modal-input" name="' + f.key + '"' + (f.required ? ' required' : '') + ' step="' + (f.type === 'number' ? 'any' : '1') + '">';
    } else if(f.enum){
      h += '<select class="sojowo-modal-input" name="' + f.key + '"' + (f.required ? ' required' : '') + '>';
      h += '<option value="">' + _t('Chọn', 'Select') + '</option>';
      for(var ei = 0; ei < f.enum.length; ei++){
        h += '<option value="' + _escHtml(f.enum[ei]) + '">' + _escHtml(f.enum[ei]) + '</option>';
      }
      h += '</select>';
    } else {
      h += '<input type="text" class="sojowo-modal-input" name="' + f.key + '"' + (f.required ? ' required' : '') + '>';
    }

    h += '</div>';
  }

  h += '</form>';
  h += '</div>';
  h += '<div class="sojowo-modal-footer">';
  h += '<button type="button" class="sojowo-modal-cancel">' + _t('Hủy', 'Cancel') + '</button>';
  h += '<button type="button" class="sojowo-modal-submit" id="' + _containerId + '-modal-submit">' + _t('Tao', 'Create') + '</button>';
  h += '</div>';

  modal.innerHTML = h;
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  // Bind events
  overlay.addEventListener('click', _closeCreateModal);
  modal.querySelector('.sojowo-modal-close').addEventListener('click', _closeCreateModal);
  modal.querySelector('.sojowo-modal-cancel').addEventListener('click', _closeCreateModal);

  var submitBtn = document.getElementById(_containerId + '-modal-submit');
  submitBtn.addEventListener('click', function(){
    _submitCreateForm(type);
  });
}

function _closeCreateModal(){
  var overlay = document.getElementById(_containerId + '-modal-overlay');
  var modal = document.getElementById(_containerId + '-modal');
  if(overlay) overlay.parentNode.removeChild(overlay);
  if(modal) modal.parentNode.removeChild(modal);
}

function _submitCreateForm(type){
  var form = document.getElementById(_containerId + '-modal-form');
  if(!form) return;

  // Check validity
  if(!form.checkValidity()){
    form.reportValidity();
    return;
  }

  // Collect data
  var formĐạta = {};
  var inputs = form.querySelectorAll('input, select, textarea');
  for(var i = 0; i < inputs.length; i++){
    var input = inputs[i];
    var name = input.name;
    var val = input.value;
    if(name && val !== '') formĐạta[name] = val;
  }

  var actionMap = { so: 'order_so_create', jo: 'order_jo_create', wo: 'order_wo_create' };
  var action = actionMap[type] || 'order_so_create';

  var submitBtn = document.getElementById(_containerId + '-modal-submit');
  if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = _t('Đang tạo...', 'Creating...'); }

  _apiCall(action, formĐạta).then(function(data){
    if(data && data.ok){
      _showToast(_t('Đã tạo thành công', 'Created successfully'), 'success');
      _closeCreateModal();
      _refreshMainView();
    } else {
      _showToast(_t('Lỗi tạo: ' + (data && data.error || ''), 'Create error: ' + (data && data.error || '')), 'error');
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = _t('Tao', 'Create'); }
    }
  }).catch(function(){
    _showToast(_t('Lỗi mạng', 'Network error'), 'error');
    if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = _t('Tao', 'Create'); }
  });
}

function _showLinkFormModal(){
  if(!_selectedNode) return;

  var overlay = document.createElement('div');
  overlay.className = 'sojowo-modal-overlay';
  overlay.id = _containerId + '-link-overlay';

  var modal = document.createElement('div');
  modal.className = 'sojowo-modal sojowo-modal-sm';
  modal.id = _containerId + '-link-modal';

  var h = '';
  h += '<div class="sojowo-modal-header">';
  h += '<h3>' + _t('Liên kết biểu mẫu', 'Link Form / Record') + '</h3>';
  h += '<button type="button" class="sojowo-detail-close sojowo-link-close">';
  h += '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
  h += '</button></div>';
  h += '<div class="sojowo-modal-body">';
  h += '<div class="sojowo-modal-field">';
  h += '<label class="sojowo-modal-label">' + _t('Mã hồ sơ', 'Record ID') + '</label>';
  h += '<input type="text" class="sojowo-modal-input" id="' + _containerId + '-link-record-id" placeholder="NCR-2026-001">';
  h += '</div>';
  h += '</div>';
  h += '<div class="sojowo-modal-footer">';
  h += '<button type="button" class="sojowo-modal-cancel sojowo-link-cancel">' + _t('Hủy', 'Cancel') + '</button>';
  h += '<button type="button" class="sojowo-modal-submit" id="' + _containerId + '-link-submit">' + _t('Liên kết', 'Link') + '</button>';
  h += '</div>';

  modal.innerHTML = h;
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  var closeLink = function(){
    if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if(modal.parentNode) modal.parentNode.removeChild(modal);
  };

  overlay.addEventListener('click', closeLink);
  modal.querySelector('.sojowo-link-close').addEventListener('click', closeLink);
  modal.querySelector('.sojowo-link-cancel').addEventListener('click', closeLink);

  document.getElementById(_containerId + '-link-submit').addEventListener('click', function(){
    var recordId = (document.getElementById(_containerId + '-link-record-id') || {}).value || '';
    if(!recordId.trim()){
      _showToast(_t('Vui lòng nhập mã hồ sơ', 'Please enter a record ID'), 'warn');
      return;
    }
    _apiCall('order_link_form', {
      order_id: _selectedNode.id,
      order_type: _selectedNode.type,
      record_id: recordId.trim()
    }).then(function(data){
      if(data && data.ok){
        _showToast(_t('Đã liên kết thành công', 'Linked successfully'), 'success');
        closeLink();
        _openDetail(_selectedNode.id, _selectedNode.type);
      } else {
        _showToast(_t('Lỗi: ' + (data && data.error || ''), 'Error: ' + (data && data.error || '')), 'error');
      }
    }).catch(function(){
      _showToast(_t('Lỗi mạng', 'Network error'), 'error');
    });
  });
}

// ===================================================================
// Event Binding
// ===================================================================

function _bindGlobalEvents(){
  var container = document.getElementById(_containerId);
  if(!container) return;

  // View toggle
  container.addEventListener('click', function(e){
    var viewBtn = e.target.closest('.sojowo-view-btn');
    if(viewBtn){
      var view = viewBtn.getAttribute('data-view');
      if(view && view !== _viewMode){
        _viewMode = view;
        // Update toggle buttons
        var btns = container.querySelectorAll('.sojowo-view-btn');
        for(var b = 0; b < btns.length; b++) btns[b].classList.remove('active');
        viewBtn.classList.add('active');
        // Re-render main content
        var main = document.getElementById(_containerId + '-main');
        if(main) main.innerHTML = _renderViewContent();
        _bindViewEvents();
      }
      return;
    }

    // Create buttons
    if(e.target.closest('#' + _containerId + '-create-so')){
      _showCreateModal('so');
      return;
    }
    if(e.target.closest('#' + _containerId + '-create-jo')){
      _showCreateModal('jo');
      return;
    }
  });

  // Detail close
  var closeBtn = document.getElementById(_containerId + '-detail-close');
  if(closeBtn) closeBtn.addEventListener('click', _closeDetail);
  var overlayEl = document.getElementById(_containerId + '-overlay');
  if(overlayEl) overlayEl.addEventListener('click', _closeDetail);

  // Keyboard: Escape closes detail
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && _detailOpen) _closeDetail();
  });

  _bindViewEvents();
}

function _bindViewEvents(){
  if(_viewMode === 'hierarchy') _bindHierarchyEvents();
  else if(_viewMode === 'pipeline') _bindPipelineEvents();
  else if(_viewMode === 'table') _bindTableEvents();
}

function _bindHierarchyEvents(){
  var treeBody = document.getElementById(_containerId + '-tree-body');
  if(!treeBody) return;

  treeBody.addEventListener('click', function(e){
    // Toggle expand
    var toggle = e.target.closest('.sojowo-node-toggle');
    if(toggle){
      e.stopPropagation();
      var toggleId = toggle.getAttribute('data-toggle-id');
      _expandedNodes[toggleId] = !_expandedNodes[toggleId];
      toggle.classList.toggle('expanded');
      var children = toggle.closest('.sojowo-node').querySelector('.sojowo-node-children');
      if(children) children.classList.toggle('collapsed');
      return;
    }

    // Node click -> open detail
    var nodeRow = e.target.closest('.sojowo-node-row');
    if(nodeRow){
      var nodeId = nodeRow.getAttribute('data-node-id');
      var nodeType = nodeRow.getAttribute('data-node-type');
      if(nodeId && nodeType){
        // Highlight
        var allRows = treeBody.querySelectorAll('.sojowo-node-row');
        for(var r = 0; r < allRows.length; r++) allRows[r].classList.remove('selected');
        nodeRow.classList.add('selected');

        // Also expand
        var nId = nodeRow.getAttribute('data-node-id');
        _expandedNodes[nId] = true;
        var toggleBtn = nodeRow.querySelector('.sojowo-node-toggle');
        if(toggleBtn) toggleBtn.classList.add('expanded');
        var chEl = nodeRow.closest('.sojowo-node').querySelector('.sojowo-node-children');
        if(chEl) chEl.classList.remove('collapsed');

        _openDetail(nodeId, nodeType);
      }
    }
  });

  // Tree search
  var searchInput = document.getElementById(_containerId + '-tree-search');
  if(searchInput){
    var debounce = null;
    searchInput.addEventListener('input', function(){
      clearTimeout(debounce);
      var q = searchInput.value.toLowerCase().trim();
      debounce = setTimeout(function(){
        var nodes = treeBody.querySelectorAll('.sojowo-node');
        for(var n = 0; n < nodes.length; n++){
          var text = nodes[n].textContent.toLowerCase();
          nodes[n].style.display = (!q || text.indexOf(q) >= 0) ? '' : 'none';
        }
      }, 200);
    });
  }
}

function _bindPipelineEvents(){
  var container = document.getElementById(_containerId + '-main');
  if(!container) return;

  // Card click -> detail
  container.addEventListener('click', function(e){
    var card = e.target.closest('.sojowo-card');
    if(card){
      var cardId = card.getAttribute('data-card-id');
      var cardType = card.getAttribute('data-card-type');
      if(cardId && cardType) _openDetail(cardId, cardType);
    }
  });

  // Drag & drop
  var cards = container.querySelectorAll('.sojowo-card[draggable]');
  for(var i = 0; i < cards.length; i++){
    cards[i].addEventListener('dragstart', function(e){
      _dragItem = {
        id: this.getAttribute('data-card-id'),
        type: this.getAttribute('data-card-type')
      };
      this.classList.add('sojowo-card-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setĐạta('text/plain', this.getAttribute('data-card-id'));
    });
    cards[i].addEventListener('dragend', function(){
      this.classList.remove('sojowo-card-dragging');
      _dragItem = null;
      // Remove all highlight states
      var cols = container.querySelectorAll('.sojowo-pipeline-col-body');
      for(var c = 0; c < cols.length; c++) cols[c].classList.remove('sojowo-drop-highlight');
    });
  }

  var colBodies = container.querySelectorAll('.sojowo-pipeline-col-body');
  for(var j = 0; j < colBodies.length; j++){
    colBodies[j].addEventListener('dragover', function(e){
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.classList.add('sojowo-drop-highlight');
    });
    colBodies[j].addEventListener('dragleave', function(){
      this.classList.remove('sojowo-drop-highlight');
    });
    colBodies[j].addEventListener('drop', function(e){
      e.preventDefault();
      this.classList.remove('sojowo-drop-highlight');
      if(!_dragItem) return;

      var targetStatus = this.getAttribute('data-drop-col');
      if(!targetStatus) return;

      // Map pipeline column to actual status
      var statusMapping = _mapPipelineToStatus(_dragItem.type, targetStatus);
      if(statusMapping && _hasPermission(_dragItem.type, 'edit')){
        _updateOrderStatus(_dragItem.id, _dragItem.type, statusMapping);
      }
    });
  }
}

function _bindTableEvents(){
  var container = document.getElementById(_containerId + '-main');
  if(!container) return;

  // Row click -> detail
  container.addEventListener('click', function(e){
    var row = e.target.closest('.sojowo-table-row');
    if(row){
      var rowId = row.getAttribute('data-row-id');
      var rowType = row.getAttribute('data-row-type');
      if(rowId && rowType) _openDetail(rowId, rowType);
      return;
    }

    // Sort header click
    var th = e.target.closest('.sojowo-th-sortable');
    if(th){
      var key = th.getAttribute('data-sort-key');
      if(key){
        if(_tableSort.key === key) _tableSort.dir = _tableSort.dir === 'asc' ? 'desc' : 'asc';
        else { _tableSort.key = key; _tableSort.dir = 'asc'; }
        var main = document.getElementById(_containerId + '-main');
        if(main){ main.innerHTML = _renderTableView(); _bindTableEvents(); }
      }
      return;
    }

    // Pagination
    var pageBtn = e.target.closest('.sojowo-tpage-btn');
    if(pageBtn && !pageBtn.disabled){
      var page = parseInt(pageBtn.getAttribute('data-page'), 10);
      if(page >= 1){
        _tablePage = page;
        var mainEl = document.getElementById(_containerId + '-main');
        if(mainEl){ mainEl.innerHTML = _renderTableView(); _bindTableEvents(); }
      }
    }
  });

  // Search
  var searchInput = document.getElementById(_containerId + '-table-search');
  if(searchInput){
    var debounce = null;
    searchInput.addEventListener('input', function(){
      clearTimeout(debounce);
      debounce = setTimeout(function(){
        _tableSearch = searchInput.value;
        _tablePage = 1;
        var main = document.getElementById(_containerId + '-main');
        if(main){ main.innerHTML = _renderTableView(); _bindTableEvents(); }
        // Re-focus search
        var newInput = document.getElementById(_containerId + '-table-search');
        if(newInput){ newInput.focus(); newInput.selectionStart = newInput.selectionEnd = newInput.value.length; }
      }, 300);
    });
  }
}

// ===================================================================
// Đạta Utilities
// ===================================================================

function _flattenHierarchy(hierarchy){
  var result = [];
  if(!hierarchy) return result;

  for(var i = 0; i < hierarchy.length; i++){
    var so = hierarchy[i];
    so._type = 'so';
    result.push(so);

    var jos = so.job_orders || [];
    for(var j = 0; j < jos.length; j++){
      var jo = jos[j];
      jo._type = 'jo';
      result.push(jo);

      var wos = jo.work_orders || [];
      for(var w = 0; w < wos.length; w++){
        var wo = wos[w];
        wo._type = 'wo';
        result.push(wo);
      }
    }
  }
  return result;
}

function _groupByPipelineStatus(items){
  var grouped = {};
  for(var ci = 0; ci < PIPELINE_COLS.length; ci++){
    grouped[PIPELINE_COLS[ci].key] = [];
  }

  for(var i = 0; i < items.length; i++){
    var item = items[i];
    var col = _mapStatusToPipeline(item._type, item.status || '');
    if(grouped[col]) grouped[col].push(item);
    else {
      if(!grouped['planned']) grouped['planned'] = [];
      grouped['planned'].push(item);
    }
  }
  return grouped;
}

function _mapStatusToPipeline(type, status){
  // Map various statuses to pipeline columns
  var map = {
    // SO
    draft: 'planned', quoted: 'planned', confirmed: 'active', in_production: 'active',
    shipped: 'completed', closed: 'completed',
    // JO
    planned: 'planned', released: 'planned', active: 'active',
    on_hold: 'on_hold', completed: 'completed',
    // WO
    scheduled: 'planned', setup: 'active', running: 'active',
    inspection: 'active',
    // Common
    cancelled: 'cancelled'
  };
  return map[status] || 'planned';
}

function _mapPipelineToStatus(type, pipelineCol){
  // Map pipeline column back to the most common status for that type
  var map = {
    so: { planned: 'draft', active: 'in_production', on_hold: null, completed: 'shipped', cancelled: 'cancelled' },
    jo: { planned: 'planned', active: 'active', on_hold: 'on_hold', completed: 'completed', cancelled: null },
    wo: { planned: 'scheduled', active: 'running', on_hold: 'on_hold', completed: 'completed', cancelled: null }
  };
  var m = map[type];
  return m ? m[pipelineCol] : null;
}

function _filterTableĐạta(data, search){
  if(!search || !search.trim()) return data;
  var q = search.toLowerCase().trim();
  return data.filter(function(item){
    var searchable = [
      item.so_number, item.jo_number, item.wo_number,
      item.customer_name, item.customer_id, item.customer_po,
      item.part_number, item.operation_desc, item.status,
      item._type
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.indexOf(q) >= 0;
  });
}

function _sortTableĐạta(data, key, dir){
  return data.slice().sort(function(a, b){
    var va = _getSortValue(a, key);
    var vb = _getSortValue(b, key);
    var cmp = va < vb ? -1 : (va > vb ? 1 : 0);
    return dir === 'asc' ? cmp : -cmp;
  });
}

function _getSortValue(item, key){
  if(key === 'order_number') return (item.so_number || item.jo_number || item.wo_number || '').toLowerCase();
  if(key === 'type') return (item._type || '');
  if(key === 'customer') return (item.customer_name || item.part_number || item.operation_desc || '').toLowerCase();
  if(key === 'status') return (item.status || '');
  if(key === 'due_date') return (item.due_date || '');
  if(key === 'qty') return parseInt(item.total_qty || item.qty_ordered || item.qty_completed || '0', 10);
  if(key === 'progress'){
    if(item._type === 'jo' && item.qty_ordered > 0) return Math.round(((item.qty_good || 0) / item.qty_ordered) * 100);
    return 0;
  }
  return '';
}

function _getFieldsForType(type){
  var fieldsMap = {
    so: [
      { key:'so_number', type:'string', required:true, label:'SO Number' },
      { key:'customer_id', type:'string', required:true, label:'Customer ID' },
      { key:'customer_name', type:'string', required:true, label:'Customer Name' },
      { key:'customer_po', type:'string', required:true, label:'Customer PO' },
      { key:'order_date', type:'date', required:true, label:'Order Đạte' },
      { key:'due_date', type:'date', required:true, label:'Due Đạte' },
      { key:'total_qty', type:'integer', required:true, label:'Total Qty' },
      { key:'total_value', type:'number', required:false, label:'Order Value (USD)' },
      { key:'priority', type:'string', required:false, label:'Priority', enum:['normal','high','urgent','aog'] },
      { key:'contract_review', type:'string', required:false, label:'Contract Review Ref' },
      { key:'special_requirements', type:'text', required:false, label:'Special Requirements' },
      { key:'status', type:'string', required:true, label:'Status' }
    ],
    jo: [
      { key:'jo_number', type:'string', required:true, label:'JO Number' },
      { key:'so_number', type:'string', required:true, label:'Parent SO' },
      { key:'part_number', type:'string', required:true, label:'Part Number' },
      { key:'part_revision', type:'string', required:true, label:'Part Revision' },
      { key:'part_description', type:'string', required:true, label:'Part Description' },
      { key:'material_spec', type:'string', required:true, label:'Material Spec' },
      { key:'qty_ordered', type:'integer', required:true, label:'Qty Ordered' },
      { key:'qty_good', type:'integer', required:false, label:'Qty Good' },
      { key:'qty_scrap', type:'integer', required:false, label:'Qty Scrap' },
      { key:'start_date', type:'date', required:true, label:'Start Đạte' },
      { key:'due_date', type:'date', required:true, label:'Due Đạte' },
      { key:'routing_id', type:'string', required:false, label:'Routing ID' },
      { key:'fai_required', type:'boolean', required:false, label:'FAI Required?' },
      { key:'customer_source_inspection', type:'boolean', required:false, label:'Customer Source Inspection?' },
      { key:'special_process', type:'string', required:false, label:'Special Process' },
      { key:'status', type:'string', required:true, label:'Status' }
    ],
    wo: [
      { key:'wo_number', type:'string', required:true, label:'WO Number' },
      { key:'jo_number', type:'string', required:true, label:'Parent JO' },
      { key:'operation_number', type:'integer', required:true, label:'Operation #' },
      { key:'operation_desc', type:'string', required:true, label:'Operation Desc' },
      { key:'machine_id', type:'string', required:true, label:'Machine' },
      { key:'work_center_id', type:'string', required:true, label:'Work Center' },
      { key:'operator_id', type:'string', required:false, label:'Operator' },
      { key:'nc_program_id', type:'string', required:false, label:'NC Program' },
      { key:'setup_time_est', type:'number', required:false, label:'Est. Setup (min)' },
      { key:'run_time_est', type:'number', required:false, label:'Est. Run (min)' },
      { key:'setup_time_actual', type:'number', required:false, label:'Actual Setup (min)' },
      { key:'run_time_actual', type:'number', required:false, label:'Actual Run (min)' },
      { key:'qty_completed', type:'integer', required:false, label:'Qty Completed' },
      { key:'qty_scrap', type:'integer', required:false, label:'Qty Scrap' },
      { key:'scheduled_start', type:'datetime', required:false, label:'Sched. Start' },
      { key:'scheduled_end', type:'datetime', required:false, label:'Sched. End' },
      { key:'actual_start', type:'datetime', required:false, label:'Actual Start' },
      { key:'actual_end', type:'datetime', required:false, label:'Actual End' },
      { key:'fixture_id', type:'string', required:false, label:'Fixture' },
      { key:'status', type:'string', required:true, label:'Status' }
    ]
  };
  return fieldsMap[type] || [];
}

function _getTransitions(type, currentStatus){
  var flowMap = {
    so: {
      draft:['quoted','cancelled'], quoted:['confirmed','draft','cancelled'],
      confirmed:['in_production','cancelled'], in_production:['shipped','cancelled'],
      shipped:['closed'], closed:[], cancelled:[]
    },
    jo: {
      planned:['released'], released:['active','on_hold'],
      active:['on_hold','completed'], on_hold:['active','released'],
      completed:['closed'], closed:[]
    },
    wo: {
      scheduled:['setup','on_hold'], setup:['running','on_hold'],
      running:['inspection','completed','on_hold'], inspection:['completed','running'],
      completed:[], on_hold:['scheduled','setup','running']
    }
  };
  var flow = flowMap[type];
  return (flow && flow[currentStatus]) ? flow[currentStatus] : [];
}

function _hasPermission(type, action){
  // type: so, jo, wo; action: view, edit, create, delete
  var config = ROLES_CONFIG[type];
  if(!config || !config[action]) return false;

  var allowedRoles = config[action];
  var currentRole = '';
  if(typeof currentUser !== 'undefined' && currentUser){
    currentRole = currentUser.role || currentUser.roles || '';
  }

  if(!currentRole) return true; // If no role system, allow all

  // Handle array of roles
  if(Array.isArray(currentRole)){
    for(var i = 0; i < currentRole.length; i++){
      if(allowedRoles.indexOf(currentRole[i]) >= 0) return true;
    }
    return false;
  }

  return allowedRoles.indexOf(currentRole) >= 0;
}

function _refreshMainView(){
  // Re-fetch hierarchy data and re-render
  _apiCall('order_hierarchy', {}).then(function(data){
    _hierarchyĐạta = (data && data.ok) ? (data.data || data.hierarchy || []) : [];
    _flatĐạta = _flattenHierarchy(_hierarchyĐạta);
    var main = document.getElementById(_containerId + '-main');
    if(main){
      main.innerHTML = _renderViewContent();
      _bindViewEvents();
    }
  }).catch(function(){
    // Silent fail, keep current data
  });

  // Also refresh KPIs
  _apiCall('order_dashboard_stats', {}).then(function(data){
    _kpiĐạta = (data && data.ok) ? (data.data || data) : _kpiĐạta;
    var kpiContainer = document.querySelector('.sojowo-kpi');
    if(kpiContainer){
      var temp = document.createElement('div');
      temp.innerHTML = _renderKpiCards();
      kpiContainer.parentNode.replaceChild(temp.firstElementChild, kpiContainer);
    }
  }).catch(function(){});
}

// ===================================================================
// UI Utilities
// ===================================================================

function _hexToRgba(hex, alpha){
  if(!hex) return 'rgba(148,163,184,' + alpha + ')';
  var r = parseInt(hex.slice(1,3), 16) || 0;
  var g = parseInt(hex.slice(3,5), 16) || 0;
  var b = parseInt(hex.slice(5,7), 16) || 0;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function _showToast(message, type){
  type = type || 'info';
  var colors = {
    success: { bg:'#dcfce7', border:'#16a34a', color:'#15803d' },
    error:   { bg:'#fef2f2', border:'#dc2626', color:'#b91c1c' },
    info:    { bg:'#dbeafe', border:'#3b82f6', color:'#1d4ed8' },
    warn:    { bg:'#fef3c7', border:'#d97706', color:'#b45309' }
  };
  var c = colors[type] || colors.info;

  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;max-width:440px;padding:12px 16px;border-radius:10px;' +
    'font-size:13px;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.12);' +
    'border-left:4px solid ' + c.border + ';background:' + c.bg + ';color:' + c.color + ';' +
    'opacity:0;transform:translateY(10px);transition:all .25s ease';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(function(){
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(function(){
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(function(){
      if(toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

// ===================================================================
// Inline Styles (injected once, supplements so-jo-wo-dashboard.css)
// ===================================================================

(function _injectStyles(){
  if(document.getElementById('sojowo-extra-styles')) return;
  var style = document.createElement('style');
  style.id = 'sojowo-extra-styles';
  style.textContent = [
    /* Loading */
    '.sojowo-loading-full{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:12px;color:#94a3b8;font-size:14px}',
    '.sojowo-spinner{width:28px;height:28px;border:3px solid #e2e8f0;border-top-color:#1565c0;border-radius:50%;animation:sojowo-spin .7s linear infinite}',
    '@keyframes sojowo-spin{to{transform:rotate(360deg)}}',
    '.sojowo-detail-loading{display:flex;align-items:center;justify-content:center;min-height:200px}',

    /* Create buttons */
    '.sojowo-create-btn{padding:6px 14px;font-size:12px;font-weight:600;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;transition:all .15s}',
    '.sojowo-create-btn:hover{background:#f1f5f9}',
    '.sojowo-create-so{border-color:#1565c0;color:#1565c0}',
    '.sojowo-create-so:hover{background:#e3f2fd}',
    '.sojowo-create-jo{border-color:#7c3aed;color:#7c3aed}',
    '.sojowo-create-jo:hover{background:#ede9fe}',

    /* Tree empty */
    '.sojowo-tree-empty{padding:32px;text-align:center;color:#94a3b8;font-size:13px}',

    /* Pipeline empty & drag */
    '.sojowo-pipeline-empty{text-align:center;padding:16px;font-size:11px;color:#94a3b8}',
    '.sojowo-card-dragging{opacity:.4}',
    '.sojowo-drop-highlight{background:#dbeafe!important;border:2px dashed #1565c0;border-radius:8px}',

    /* Table view */
    '.sojowo-table-container{border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow:hidden}',
    '.sojowo-table-toolbar{padding:12px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc}',
    '.sojowo-table-search{width:100%;max-width:320px;padding:7px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit}',
    '.sojowo-table-search:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.1)}',
    '.sojowo-table-wrap{overflow-x:auto}',
    '.sojowo-table{width:100%;border-collapse:collapse;font-size:12px}',
    '.sojowo-table th{text-align:left;padding:10px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0;white-space:nowrap;cursor:pointer;user-select:none}',
    '.sojowo-table th:hover{background:#f1f5f9}',
    '.sojowo-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#374151}',
    '.sojowo-table-row{cursor:pointer;transition:background .12s}',
    '.sojowo-table-row:hover td{background:#f8fafc}',
    '.sojowo-table-id{font-family:"SF Mono",Consolas,monospace;font-size:11px;font-weight:600;color:#1565c0}',
    '.sojowo-table-date{white-space:nowrap;color:#94a3b8;font-size:11px}',
    '.sojowo-table-center{text-align:center}',
    '.sojowo-table-empty{text-align:center;padding:24px;color:#94a3b8}',
    '.sojowo-table-pagination{display:flex;justify-content:center;gap:4px;padding:12px}',
    '.sojowo-tpage-btn{padding:4px 10px;font-size:11px;font-weight:600;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;transition:all .15s}',
    '.sojowo-tpage-btn:hover:not(:disabled){background:#f1f5f9}',
    '.sojowo-tpage-btn:disabled{opacity:.4;cursor:not-allowed}',
    '.sojowo-tpage-btn.active{background:#1565c0;color:#fff;border-color:#1565c0}',

    /* Timeline */
    '.sojowo-timeline{position:relative;padding-left:20px}',
    '.sojowo-timeline::before{content:"";position:absolute;left:6px;top:0;bottom:0;width:2px;background:#e2e8f0}',
    '.sojowo-timeline-item{position:relative;margin-bottom:12px;display:flex;gap:10px}',
    '.sojowo-timeline-dot{width:12px;height:12px;border-radius:50%;background:#1565c0;border:2px solid #fff;box-shadow:0 0 0 2px #e2e8f0;flex-shrink:0;margin-top:2px;position:relative;z-index:1}',
    '.sojowo-timeline-content{font-size:12px}',
    '.sojowo-timeline-status{font-weight:600;color:#374151}',
    '.sojowo-timeline-date{display:block;font-size:11px;color:#94a3b8;margin-top:1px}',
    '.sojowo-timeline-user{display:block;font-size:11px;color:#64748b}',

    /* Operations list */
    '.sojowo-ops-list{display:flex;flex-direction:column;gap:6px}',
    '.sojowo-ops-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px}',
    '.sojowo-ops-num{font-family:"SF Mono",Consolas,monospace;font-size:11px;font-weight:700;color:#94a3b8;min-width:44px}',
    '.sojowo-ops-info{flex:1;min-width:0}',
    '.sojowo-ops-desc{font-size:12px;font-weight:600;color:#374151}',
    '.sojowo-ops-meta{display:flex;gap:8px;font-size:10px;color:#94a3b8;margin-top:2px}',

    /* Link form button */
    '.sojowo-link-form-btn{margin-top:8px;padding:6px 14px;font-size:12px;font-weight:600;border:1px dashed #d1d5db;border-radius:6px;background:#fff;color:#64748b;cursor:pointer;transition:all .15s}',
    '.sojowo-link-form-btn:hover{border-color:#1565c0;color:#1565c0;background:#f0f7ff}',

    /* Modal */
    '.sojowo-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.4);z-index:300}',
    '.sojowo-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.2);z-index:301;width:560px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column}',
    '.sojowo-modal-sm{width:400px}',
    '.sojowo-modal-header{padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}',
    '.sojowo-modal-header h3{margin:0;font-size:16px;font-weight:700;color:#0c2d48}',
    '.sojowo-modal-body{flex:1;overflow-y:auto;padding:20px}',
    '.sojowo-modal-form{display:flex;flex-direction:column;gap:12px}',
    '.sojowo-modal-field{display:flex;flex-direction:column;gap:4px}',
    '.sojowo-modal-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em}',
    '.sojowo-modal-input{padding:7px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;transition:border-color .15s}',
    '.sojowo-modal-input:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.1)}',
    '.sojowo-modal-footer{padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px}',
    '.sojowo-modal-cancel{padding:7px 16px;font-size:13px;font-weight:600;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;color:#64748b}',
    '.sojowo-modal-cancel:hover{background:#f1f5f9}',
    '.sojowo-modal-submit{padding:7px 20px;font-size:13px;font-weight:700;border:none;border-radius:8px;background:#1565c0;color:#fff;cursor:pointer;transition:background .15s}',
    '.sojowo-modal-submit:hover{background:#0d47a1}',
    '.sojowo-modal-submit:disabled{opacity:.5;cursor:not-allowed}',

    /* Action buttons in detail */
    '.sojowo-action-btn{padding:6px 14px;font-size:12px;font-weight:600;border:1px solid;border-radius:6px;background:#fff;cursor:pointer;transition:all .15s}',
    '.sojowo-action-btn:hover{filter:brightness(.92)}',

    /* Responsive */
    '@media(max-width:768px){',
    '  .sojowo-modal{width:95vw;max-height:85vh}',
    '  .sojowo-table-search{max-width:100%}',
    '  .sojowo-header{flex-direction:column;align-items:flex-start}',
    '  .sojowo-header-actions{flex-wrap:wrap}',
    '}'
  ].join('\n');
  document.head.appendChild(style);
})();

})();
