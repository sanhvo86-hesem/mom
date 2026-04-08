/* ===================================================================
   09c-record-id-generator.js -- Evidence Control / Tab 3
   HESEM MOM Portal -- governed Record ID issuance with shared history
   =================================================================== */

(function(){
'use strict';

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _escHtml(value){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(value == null ? '' : value))); return d.innerHTML; }
function _uid(){ return 'rid-' + Math.random().toString(36).slice(2, 10); }
function _recordTypeLabel(item){ return _t(RECORD_TYPE_LABELS_VI[item.code] || item.label_vi || item.label || item.code, item.label || item.code); }

var _moduleId = _uid();
var _recordTypes = {};
var _selectedDept = '';
var _selectedType = '';
var _selectedYear = new Date().getFullYear();
var _historyFilters = { recordType:'', department:'', status:'', search:'', page:1, pageSize:20 };
var _container = null;
var _notesDraft = '';
var _masterData = null;
var _orderData = { sales_orders: [], job_orders: [], work_orders: [] };
var _lookupInstances = {};
var _contextValues = {};
var _previewState = { loading:false, nextId:'', duplicate:null, error:'' };

function _resetRenderState(){
  _moduleId = _uid();
  _selectedDept = '';
  _selectedType = '';
  _selectedYear = new Date().getFullYear();
  _historyFilters = { recordType:'', department:'', status:'', search:'', page:1, pageSize:20 };
  _notesDraft = '';
  _lookupInstances = {};
  _previewState = { loading:false, nextId:'', duplicate:null, error:'' };
}

var DEPARTMENTS = [
  { value:'QA',  label:'Đảm bảo chất lượng', labelEn:'Quality Assurance' },
  { value:'PRO', label:'Sản xuất', labelEn:'Production' },
  { value:'ENG', label:'Kỹ thuật', labelEn:'Engineering' },
  { value:'SCM', label:'Chuỗi cung ứng', labelEn:'Supply Chain' },
  { value:'HR',  label:'Nhân sự & Đào tạo', labelEn:'HR & Training' },
  { value:'EXE', label:'Ban giám đốc', labelEn:'Executive / Management' },
  { value:'SAL', label:'Kinh doanh', labelEn:'Sales' },
  { value:'WH',  label:'Kho vận', labelEn:'Warehouse / Logistics' },
  { value:'IT',  label:'Công nghệ thông tin', labelEn:'IT / Digital' },
  { value:'EHS', label:'An toàn & Môi trường', labelEn:'EHS / Safety' }
];

var RECORD_TYPE_LABELS_VI = {
  NCR: 'Phiếu báo lỗi không phù hợp',
  CAPA: 'Hành động khắc phục / phòng ngừa',
  FAI: 'Kiểm tra sản phẩm đầu tiên',
  TRN: 'Sự kiện đào tạo',
  AUD: 'Đánh giá',
  ECR: 'Yêu cầu thay đổi kỹ thuật',
  IMP: 'Dự án cải tiến',
  MR: 'Xem xét của lãnh đạo',
  RISK: 'Đánh giá rủi ro',
  CAL: 'Hồ sơ hiệu chuẩn',
  SCAR: 'Hành động khắc phục nhà cung cấp',
  DOWNTIME: 'Sự cố dừng máy',
  'PO-EXCEPTION': 'Ngoại lệ đơn mua hàng',
  'PM-ORDER': 'Lệnh bảo trì phòng ngừa',
  'CM-ORDER': 'Lệnh bảo trì khắc phục',
  'SPARE-PART': 'Yêu cầu phụ tùng'
};

window._renderRecordIdGenerator = function(schemas, entries, container){
  if(!container) return;
  _resetRenderState();
  _container = container;
  if(typeof currentUser !== 'undefined' && currentUser && currentUser.dept){
    _selectedDept = String(currentUser.dept || '').trim().toUpperCase();
    _historyFilters.department = _selectedDept;
  }
  _contextValues = {};
  if(window._fhState && window._fhState.pendingContext && typeof window._fhState.pendingContext === 'object'){
    _contextValues = Object.assign({}, window._fhState.pendingContext);
  }
  Promise.all([_ensureRecordTypes(), _ensureLookupSources()]).then(function(){
    if(!Object.keys(_recordTypes || {}).length && !_hasLookupData()){
      _showInlineMessage(_t('Không tải được loại hồ sơ hoặc master data. Hãy kiểm tra phiên đăng nhập và kết nối.', 'Could not load record types or master data. Check your session and connection.'), 'error');
    }
    _rerender(true);
  }).catch(function(){
    _showInlineMessage(_t('Không khởi tạo được Trợ lý tạo mã.', 'Could not initialize the Record ID Assistant.'), 'error');
    _rerender(false);
  });
};

function _rerender(reloadHistory){
  if(!_container) return;
  _render(_container);
  _bind(_container);
  _mountContextLookups();
  if(reloadHistory !== false) _loadHistory();
}

function _ensureRecordTypes(){
  if(Object.keys(_recordTypes).length) return Promise.resolve(_recordTypes);
  if(typeof apiCall === 'function'){
    return apiCall('config_record_types', {}, 'GET').then(function(resp){
      _recordTypes = resp && resp.record_types ? resp.record_types : {};
      return _recordTypes;
    }).catch(function(){ _recordTypes = {}; return _recordTypes; });
  }
  return fetch('api.php?action=config_record_types', { credentials:'include' })
    .then(function(r){ return r.json(); })
    .then(function(resp){ _recordTypes = resp && resp.record_types ? resp.record_types : {}; return _recordTypes; })
    .catch(function(){ _recordTypes = {}; return _recordTypes; });
}

function _api(action, payload, method){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', 30000);
  var opts = { method: method || 'GET', credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if((method || 'GET') !== 'GET'){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(payload || {});
  }
  return fetch('api.php?action=' + encodeURIComponent(action), opts).then(function(r){ return r.json(); });
}

function _apiGet(action, payload){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, 'GET', 30000);
  var params = new URLSearchParams();
  Object.keys(payload || {}).forEach(function(key){
    var value = payload[key];
    if(value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  var url = 'api.php?action=' + encodeURIComponent(action) + (params.toString() ? '&' + params.toString() : '');
  return fetch(url, { credentials:'include' }).then(function(r){ return r.json(); });
}

function _flattenOrders(list){
  var out = { sales_orders: [], job_orders: [], work_orders: [] };
  (list || []).forEach(function(so){
    out.sales_orders.push({ value:so.so_number, label:so.so_number, sub:[so.customer_id || '', so.customer_name || '', so.customer_po ? ('PO ' + so.customer_po) : ''].filter(Boolean).join(' · '), so_number:so.so_number || '', customer_id:so.customer_id || '', customer_name:so.customer_name || '' });
    (so.job_orders || []).forEach(function(jo){
      out.job_orders.push({ value:jo.jo_number, label:jo.jo_number, sub:[jo.part_number || '', jo.part_revision || '', jo.part_description || ''].filter(Boolean).join(' · '), so_number:so.so_number || '', jo_number:jo.jo_number || '', customer_id:so.customer_id || '', customer_name:so.customer_name || '', part_number:jo.part_number || '', part_revision:jo.part_revision || '' });
      (jo.work_orders || []).forEach(function(wo){
        out.work_orders.push({ value:wo.wo_number, label:wo.wo_number, sub:[wo.operation_desc || '', wo.machine_id || '', wo.work_center_id || ''].filter(Boolean).join(' · '), so_number:so.so_number || '', jo_number:jo.jo_number || '', wo_number:wo.wo_number || '', customer_id:so.customer_id || '', customer_name:so.customer_name || '', part_number:jo.part_number || '', part_revision:jo.part_revision || '' });
      });
    });
  });
  return out;
}

function _ensureLookupSources(){
  var masterPromise = _masterData ? Promise.resolve(_masterData) : ((typeof window._mdEnsureSnapshot === 'function')
    ? window._mdEnsureSnapshot(true).then(function(snapshot){ _masterData = snapshot || (typeof window._mdGetSnapshot === 'function' ? window._mdGetSnapshot() : {}) || {}; return _masterData; })
    : _api('master_data_snapshot', {}, 'GET').then(function(resp){ _masterData = (resp && resp.data) ? resp.data : {}; return _masterData; }));
  var orderPromise = (_orderData.sales_orders.length || _orderData.job_orders.length || _orderData.work_orders.length)
    ? Promise.resolve(_orderData)
    : _api('order_hierarchy', {}, 'GET').then(function(resp){ _orderData = _flattenOrders((resp && (resp.hierarchy || resp.data)) || []); return _orderData; }).catch(function(){ _orderData = { sales_orders: [], job_orders: [], work_orders: [] }; return _orderData; });
  return Promise.all([masterPromise, orderPromise]);
}

function _contextFields(){
  return [
    { id:'customer_id', source:'customers', labelVi:'Khách hàng', labelEn:'Customer' },
    { id:'so_number', source:'sales_orders', labelVi:'Sales Order', labelEn:'Sales Order' },
    { id:'jo_number', source:'job_orders', labelVi:'Job Order', labelEn:'Job Order' },
    { id:'wo_number', source:'work_orders', labelVi:'Work Order', labelEn:'Work Order' },
    { id:'part_number', source:'parts', labelVi:'Part Number', labelEn:'Part Number' },
    { id:'part_revision', source:'revisions', labelVi:'Revision', labelEn:'Revision' },
    { id:'capa_number', source:'capas', labelVi:'CAPA liên kết', labelEn:'Linked CAPA' }
  ];
}

function _buildContextItems(source){
  var master = _masterData || {};
  var customerId = _contextValues.customer_id || '';
  var soNumber = _contextValues.so_number || '';
  var joNumber = _contextValues.jo_number || '';
  var partNumber = _contextValues.part_number || '';
  if(source === 'customers') return (master.customers || []).map(function(item){ return { value:item.customer_id, label:item.customer_id, sub:item.customer_name || '', customer_id:item.customer_id, customer_name:item.customer_name || '' }; });
  if(source === 'parts') return (master.parts || []).filter(function(item){ return !customerId || String(item.customer_id || '') === String(customerId); }).map(function(item){ return { value:item.part_number, label:item.part_number, sub:item.part_description || '', customer_id:item.customer_id || '', part_number:item.part_number || '' }; });
  if(source === 'revisions') return (master.revisions || []).filter(function(item){ return !partNumber || String(item.part_number || '') === String(partNumber); }).map(function(item){ return { value:item.revision, label:item.revision, sub:[item.part_number || '', item.status || ''].filter(Boolean).join(' · '), part_number:item.part_number || '', part_revision:item.revision || '' }; });
  if(source === 'capas') return (master.capas || []).filter(function(item){ if(customerId && String(item.customer_id || '') !== String(customerId)) return false; if(partNumber && String(item.part_number || '') !== String(partNumber)) return false; return true; }).map(function(item){ return { value:item.capa_number, label:item.capa_number, sub:[item.title || '', item.status || ''].filter(Boolean).join(' · '), customer_id:item.customer_id || '', part_number:item.part_number || '', capa_number:item.capa_number || '' }; });
  if(source === 'sales_orders') return (_orderData.sales_orders || []).filter(function(item){ return !customerId || String(item.customer_id || '') === String(customerId); });
  if(source === 'job_orders') return (_orderData.job_orders || []).filter(function(item){ return !soNumber || String(item.so_number || '') === String(soNumber); });
  if(source === 'work_orders') return (_orderData.work_orders || []).filter(function(item){ return !joNumber || String(item.jo_number || '') === String(joNumber); });
  return [];
}

function _normalizeContext(){
  var cleaned = {};
  ['customer_id', 'so_number', 'jo_number', 'wo_number', 'part_number', 'part_revision', 'capa_number'].forEach(function(key){
    if(_contextValues[key]) cleaned[key] = _contextValues[key];
  });
  _contextValues = cleaned;
  if(window._fhState) window._fhState.pendingContext = cleaned;
  return cleaned;
}

function _hasLookupData(){
  return !!(
    (_masterData && Object.keys(_masterData).length) ||
    (_orderData.sales_orders.length || _orderData.job_orders.length || _orderData.work_orders.length)
  );
}

function _applyContextSelection(fieldId, item){
  var next = Object.assign({}, _contextValues);
  if(!item){
    delete next[fieldId];
  } else {
    next[fieldId] = item.value || '';
    ['customer_id', 'so_number', 'jo_number', 'wo_number', 'part_number', 'part_revision', 'capa_number'].forEach(function(key){
      if(item[key]) next[key] = item[key];
    });
  }
  if(fieldId === 'customer_id'){ delete next.so_number; delete next.jo_number; delete next.wo_number; delete next.part_number; delete next.part_revision; delete next.capa_number; }
  if(fieldId === 'so_number'){ delete next.jo_number; delete next.wo_number; delete next.part_number; delete next.part_revision; delete next.capa_number; }
  if(fieldId === 'jo_number'){ delete next.wo_number; delete next.part_number; delete next.part_revision; delete next.capa_number; }
  if(fieldId === 'part_number'){ delete next.part_revision; delete next.capa_number; }
  if(fieldId === 'part_revision'){ delete next.capa_number; }
  _contextValues = next;
  _normalizeContext();
  _rerender(false);
}

function _contextSummary(){
  return [ _contextValues.customer_id, _contextValues.so_number, _contextValues.jo_number, _contextValues.wo_number, _contextValues.part_number, _contextValues.part_revision, _contextValues.capa_number ].filter(Boolean).join(' · ');
}

function _render(container){
  container.innerHTML = '' +
    '<section class="fh-section">' +
      '<div class="fh-section-head">' +
        '<h2>🔢 ' + _t('Trợ lý tạo mã hồ sơ', 'Record ID Assistant') + '</h2>' +
        '<span>' + _t('Cấp phát mã theo loại hồ sơ, phòng ban và năm. Mọi mã đều được ghi nhật ký và dùng chung cho các tab khác.', 'Issue governed record IDs by type, department, and year. Every allocation is logged and shared with the other tabs.') + '</span>' +
      '</div>' +
    '</section>' +
    '<section class="rid-shell">' +
      '<div class="rid-issue-card">' +
        '<div class="rid-grid">' +
          '<div class="rid-field"><label for="' + _moduleId + '-dept">' + _t('Phòng ban', 'Department') + '</label><select id="' + _moduleId + '-dept"></select></div>' +
          '<div class="rid-field"><label for="' + _moduleId + '-type">' + _t('Loại hồ sơ', 'Record Type') + '</label><select id="' + _moduleId + '-type"><option value="">' + _t('Chọn loại hồ sơ', 'Select record type') + '</option></select></div>' +
          '<div class="rid-field"><label for="' + _moduleId + '-year">' + _t('Năm', 'Year') + '</label><select id="' + _moduleId + '-year"></select></div>' +
          '<div class="rid-field rid-field-wide"><label for="' + _moduleId + '-notes">' + _t('Ghi chú cấp phát', 'Allocation note') + '</label><input id="' + _moduleId + '-notes" type="text" value="' + _escHtml(_notesDraft) + '" placeholder="' + _escHtml(_t('Ví dụ: NCR cho WO-2026-0012', 'Example: NCR for WO-2026-0012')) + '"></div>' +
        '</div>' +
        _renderContextCard() +
        '<div class="rid-preview-card" id="' + _moduleId + '-preview-card">' +
          '<div class="rid-preview-kicker">' + _t('Xem trước', 'Preview') + '</div>' +
          '<div class="rid-preview-code" id="' + _moduleId + '-preview-id">' + _t('Chọn loại hồ sơ để xem mã dự kiến', 'Select a record type to preview the next ID') + '</div>' +
          '<div class="rid-preview-meta" id="' + _moduleId + '-preview-meta"></div>' +
        '</div>' +
        '<div class="rid-action-row">' +
          '<button type="button" class="rid-primary" id="' + _moduleId + '-generate">⚡ ' + _t('Xác nhận cấp mã', 'Issue record ID') + '</button>' +
        '</div>' +
        '<div class="rid-result" id="' + _moduleId + '-result"></div>' +
      '</div>' +
      '<div class="rid-history-card">' +
        '<div class="rid-history-head"><h3>' + _t('Nhật ký cấp phát', 'Allocation log') + '</h3></div>' +
        '<div class="rid-history-filters">' +
          '<select id="' + _moduleId + '-filter-type"><option value="">' + _t('Tất cả loại hồ sơ', 'All record types') + '</option></select>' +
          '<select id="' + _moduleId + '-filter-status">' +
            '<option value="">' + _t('Tất cả trạng thái', 'All statuses') + '</option>' +
            '<option value="allocated">' + _t('Đã cấp mã', 'Allocated') + '</option>' +
            '<option value="downloaded">' + _t('Đã tải form', 'Downloaded') + '</option>' +
            '<option value="submitted">' + _t('Đã nộp', 'Submitted') + '</option>' +
            '<option value="received">' + _t('Đã tiếp nhận', 'Received') + '</option>' +
            '<option value="void">' + _t('Đã hủy', 'Void') + '</option>' +
          '</select>' +
          '<input id="' + _moduleId + '-filter-search" type="search" placeholder="' + _escHtml(_t('Tìm theo mã, form, SO/JO/WO...', 'Search by ID, form, SO/JO/WO...')) + '">' +
        '</div>' +
        '<div id="' + _moduleId + '-history"></div>' +
        '<div id="' + _moduleId + '-pagination"></div>' +
      '</div>' +
    '</section>';

  _renderDepartmentSelect();
  _renderYearSelect();
  _renderTypeFilters();
  _refreshPreview();
}

function _renderContextCard(){
  return '' +
    '<div class="rid-context-card">' +
      '<div class="rid-context-head">' +
        '<div><h3>' + _t('Ngữ cảnh master data bắt buộc', 'Required governed context') + '</h3><p>' + _t('Chọn trực tiếp từ Customer / SO / JO / WO / Part / Revision / CAPA đã được quản lý. Runtime sẽ dùng cùng context này cho cấp mã, điền form và upload kiểm tra.', 'Select from governed Customer / SO / JO / WO / Part / Revision / CAPA data. The runtime will reuse the same context for allocation, form entry, and upload verification.') + '</p></div>' +
      '</div>' +
      '<div class="rid-context-grid">' + _contextFields().map(function(field){
        return '<div class="rid-field"><label for="' + _moduleId + '-lookup-' + field.id + '">' + _escHtml(_t(field.labelVi, field.labelEn)) + '</label><div id="' + _moduleId + '-ctx-' + field.id + '"></div></div>';
      }).join('') + '</div>' +
      '<div class="rid-context-note">' + _escHtml(_contextSummary() || _t('Chưa chọn ngữ cảnh nào. Nếu hồ sơ có liên quan đơn hàng hoặc part, hãy chọn trước khi cấp mã để tránh mất truy xuất.', 'No governed context selected yet. Choose the order/part context before issuing the record ID when traceability is required.')) + '</div>' +
    '</div>';
}

function _bind(container){
  var dept = document.getElementById(_moduleId + '-dept');
  var type = document.getElementById(_moduleId + '-type');
  var year = document.getElementById(_moduleId + '-year');
  var notes = document.getElementById(_moduleId + '-notes');
  var generate = document.getElementById(_moduleId + '-generate');
  var filterType = document.getElementById(_moduleId + '-filter-type');
  var filterStatus = document.getElementById(_moduleId + '-filter-status');
  var filterSearch = document.getElementById(_moduleId + '-filter-search');

  dept.onchange = function(){ _selectedDept = dept.value; _renderTypeSelect(); _refreshPreview(); _historyFilters.department = dept.value; _historyFilters.page = 1; _loadHistory(); };
  type.onchange = function(){ _selectedType = type.value; _refreshPreview(); };
  year.onchange = function(){ _selectedYear = parseInt(year.value, 10) || new Date().getFullYear(); _refreshPreview(); };
  if(notes) notes.oninput = function(){ _notesDraft = notes.value || ''; };
  generate.onclick = _generate;

  filterType.onchange = function(){ _historyFilters.recordType = filterType.value; _historyFilters.page = 1; _loadHistory(); };
  filterStatus.onchange = function(){ _historyFilters.status = filterStatus.value; _historyFilters.page = 1; _loadHistory(); };
  filterSearch.oninput = function(){ _historyFilters.search = filterSearch.value; _historyFilters.page = 1; _loadHistory(); };

  if(window.AllocationTracker){
    window.AllocationTracker.on('action_void', function(payload){
      if(!payload || !payload.allocationId) return;
      if(!confirm(_t('Hủy mã hồ sơ này?', 'Void this allocation?'))) return;
      window.AllocationTracker.void(payload.allocationId, _t('Hủy từ tab Trợ lý tạo mã', 'Voided from Record ID Assistant')).then(function(resp){
        if(resp && resp.ok){
          _showInlineMessage(_t('Đã hủy mã hồ sơ.', 'Allocation voided.'), 'success');
          _loadHistory();
        } else {
          _showInlineMessage(_t('Không thể hủy mã hồ sơ.', 'Could not void the allocation.'), 'error');
        }
      });
    });
  }
}

function _renderDepartmentSelect(){
  var el = document.getElementById(_moduleId + '-dept');
  if(!el) return;
  var html = '<option value="">' + _t('Chọn phòng ban', 'Select department') + '</option>';
  DEPARTMENTS.forEach(function(dept){
    html += '<option value="' + dept.value + '"' + (dept.value === _selectedDept ? ' selected' : '') + '>' + _escHtml(_t(dept.label, dept.labelEn)) + '</option>';
  });
  el.innerHTML = html;
}

function _renderYearSelect(){
  var el = document.getElementById(_moduleId + '-year');
  if(!el) return;
  var current = new Date().getFullYear();
  var html = '';
  for(var year = current + 1; year >= current - 2; year--){
    html += '<option value="' + year + '"' + (year === _selectedYear ? ' selected' : '') + '>' + year + '</option>';
  }
  el.innerHTML = html;
}

function _renderTypeSelect(){
  var el = document.getElementById(_moduleId + '-type');
  if(!el) return;
  var html = '<option value="">' + _t('Chọn loại hồ sơ', 'Select record type') + '</option>';
  var rows = Object.keys(_recordTypes).map(function(key){ return _recordTypes[key]; }).filter(function(item){
    return !_selectedDept || String(item.department_owner || '') === _selectedDept;
  }).sort(function(a, b){ return String(a.code || '').localeCompare(String(b.code || '')); });

  rows.forEach(function(item){
    item.code = item.code || '';
    var label = _recordTypeLabel(item);
    html += '<option value="' + _escHtml(item.code || '') + '"' + ((_selectedType === item.code) ? ' selected' : '') + '>' + _escHtml((item.code || '') + ' · ' + label) + '</option>';
  });
  el.innerHTML = html;
}

function _renderTypeFilters(){
  var el = document.getElementById(_moduleId + '-filter-type');
  if(!el) return;
  var html = '<option value="">' + _t('Tất cả loại hồ sơ', 'All record types') + '</option>';
  Object.keys(_recordTypes).sort().forEach(function(code){
    var item = _recordTypes[code] || {};
    item.code = item.code || code;
    html += '<option value="' + _escHtml(code) + '">' + _escHtml(code + ' · ' + _recordTypeLabel(item)) + '</option>';
  });
  el.innerHTML = html;
}

function _previewFilename(nextId, cfg){
  cfg = cfg || {};
  if(!nextId) return '';
  if(cfg.linked_form){
    return [cfg.linked_form, nextId].filter(Boolean).join('_') + '.xlsx';
  }
  return nextId + '.txt';
}

function _refreshPreview(){
  var previewId = document.getElementById(_moduleId + '-preview-id');
  var previewMeta = document.getElementById(_moduleId + '-preview-meta');
  var generateBtn = document.getElementById(_moduleId + '-generate');
  if(!previewId || !previewMeta) return;
  if(!_selectedType){
    _previewState = { loading:false, nextId:'', duplicate:null, error:'' };
    previewId.textContent = _t('Chọn loại hồ sơ để xem mã dự kiến', 'Select a record type to preview the next ID');
    previewMeta.textContent = '';
    if(generateBtn) generateBtn.disabled = true;
    return;
  }
  var cfg = _recordTypes[_selectedType] || {};
  _previewState.loading = true;
  _previewState.error = '';
  _previewState.nextId = '';
  _previewState.duplicate = null;
  previewId.textContent = _t('Đang xem mã kế tiếp...', 'Checking next ID...');
  previewMeta.innerHTML = '<span>' + _escHtml((cfg.department_owner || '—') + ' · ' + (cfg.linked_form || '—')) + '</span>' + (_contextSummary() ? '<br><span>' + _escHtml(_contextSummary()) + '</span>' : '');
  if(generateBtn) generateBtn.disabled = true;

  _apiGet('record_id_peek', { prefix:_selectedType, year:_selectedYear }).then(function(resp){
    if(!resp || !resp.ok){
      _previewState.loading = false;
      _previewState.error = 'peek_failed';
      previewId.textContent = _t('Không xem được mã kế tiếp', 'Could not preview the next ID');
      previewMeta.innerHTML = '<span>' + _escHtml((cfg.department_owner || '—') + ' · ' + (cfg.linked_form || '—')) + '</span>';
      return;
    }

    _previewState.nextId = String(resp.next_id || '');
    previewId.textContent = _previewState.nextId || String(cfg.format_pattern || (_selectedType + '-{YYYY}-{NNN}')).replace('{YYYY}', _selectedYear).replace('{NNN}', '###');

    var duplicateReq = window.AllocationTracker && _previewState.nextId
      ? window.AllocationTracker.checkDuplicate(_previewState.nextId)
      : Promise.resolve({ ok:true, duplicate:false });

    return duplicateReq.then(function(dupResp){
      _previewState.loading = false;
      _previewState.duplicate = !!(dupResp && dupResp.duplicate);
      var filenameHint = _previewFilename(_previewState.nextId, cfg);
      previewMeta.innerHTML =
        '<span>' + _escHtml((cfg.department_owner || '—') + ' · ' + (cfg.linked_form || '—')) + '</span>' +
        (_contextSummary() ? '<br><span>' + _escHtml(_contextSummary()) + '</span>' : '') +
        (filenameHint ? '<br><span>' + _escHtml(_t('Tên file gợi ý: ', 'Suggested filename: ') + filenameHint) + '</span>' : '') +
        '<br><span>' + _escHtml(_previewState.duplicate ? _t('Cảnh báo: mã dự kiến đang bị trùng.', 'Warning: the next ID appears to be duplicated.') : _t('Mã dự kiến đang an toàn để cấp.', 'The previewed ID is clear to issue.')) + '</span>';
      if(generateBtn) generateBtn.disabled = _previewState.duplicate;
    });
  }).catch(function(){
    _previewState.loading = false;
    _previewState.error = 'preview_failed';
    previewId.textContent = _t('Không xem được mã kế tiếp', 'Could not preview the next ID');
    previewMeta.innerHTML = '<span>' + _escHtml((cfg.department_owner || '—') + ' · ' + (cfg.linked_form || '—')) + '</span>';
  });
}

function _mountContextLookups(){
  if(typeof window.SearchableInput !== 'function') return;
  _lookupInstances = {};
  _contextFields().forEach(function(field){
    var hostId = _moduleId + '-ctx-' + field.id;
    if(!document.getElementById(hostId)) return;
    var instance = new window.SearchableInput({
      containerId: hostId,
      fieldId: _moduleId + '-lookup-' + field.id,
      name: field.id,
      dataSource: _buildContextItems(field.source),
      displayField: 'label',
      valueField: 'value',
      subField: 'sub',
      strictSelect: true,
      storeValueInHiddenField: true,
      placeholderVi: _t('Tìm và chọn từ dữ liệu đã kiểm soát', 'Search and select governed data'),
      placeholder: 'Search and select governed data',
      onSelect: function(item){ _applyContextSelection(field.id, item); }
    });
    _lookupInstances[field.id] = instance;
    if(_contextValues[field.id]) instance.setValue(_contextValues[field.id]);
  });
}

function _generate(){
  if(!_selectedDept || !_selectedType){
    _showInlineMessage(_t('Vui lòng chọn phòng ban và loại hồ sơ.', 'Please select a department and record type.'), 'warn');
    return;
  }
  if(_previewState.loading){
    _showInlineMessage(_t('Hãy chờ hệ thống kiểm tra mã kế tiếp.', 'Please wait for the preview check to finish.'), 'warn');
    return;
  }
  if(_previewState.duplicate){
    _showInlineMessage(_t('Mã dự kiến đang bị trùng. Hãy kiểm tra lại counter trước khi cấp.', 'The previewed ID appears duplicated. Check the counter before issuing.'), 'error');
    return;
  }
  var cfg = _recordTypes[_selectedType] || {};
  var masterContext = _normalizeContext();
  if(window._fhState) window._fhState.pendingContext = masterContext;
  window.AllocationTracker.allocate(_selectedType, _selectedDept, {
    year: _selectedYear,
    form_code: cfg.linked_form || '',
    notes: (_notesDraft || '').trim(),
    master_context: masterContext,
    linked_order_id: masterContext.wo_number || masterContext.jo_number || masterContext.so_number || ''
  }).then(function(resp){
    if(!resp || !resp.ok){
      var errMeta = window.AllocationTracker && typeof window.AllocationTracker.describeError === 'function'
        ? window.AllocationTracker.describeError(resp, 'allocate')
        : { message:_t('Không thể cấp mã hồ sơ.', 'Could not issue the record ID.') };
      _showInlineMessage(errMeta.message || _t('Không thể cấp mã hồ sơ.', 'Could not issue the record ID.'), 'error');
      return;
    }
    _showResult(resp);
    _loadHistory();
  });
}

function _showResult(resp){
  var result = document.getElementById(_moduleId + '-result');
  if(!result) return;
  var actionLabel = resp.delivery_mode === 'offline' ? _t('Mở tab Điền & Tải form', 'Open Fill & Download') : _t('Mở tab Điền form', 'Open Fill & Download');
  var contextSummary = _contextSummary();
  result.innerHTML = '' +
    '<div class="rid-success-card">' +
      '<div class="rid-success-kicker">' + _t('Cấp mã thành công', 'Allocation created') + '</div>' +
      '<div class="rid-success-id">' + _escHtml(resp.record_id || '') + '</div>' +
      '<div class="rid-success-meta">' +
        '<div><small>' + _t('Form liên kết', 'Linked form') + '</small><strong>' + _escHtml(resp.form_code || '—') + '</strong></div>' +
        '<div><small>' + _t('Chế độ', 'Mode') + '</small><strong>' + _escHtml(resp.delivery_mode || '—') + '</strong></div>' +
        '<div><small>' + _t('Tên file gợi ý', 'Suggested filename') + '</small><strong>' + _escHtml(resp.suggested_filename || '—') + '</strong></div>' +
        '<div><small>' + _t('Ngữ cảnh truy xuất', 'Traceability context') + '</small><strong>' + _escHtml(contextSummary || '—') + '</strong></div>' +
      '</div>' +
      '<div class="rid-success-actions">' +
        '<button type="button" class="rid-secondary" data-copy="record">⧉ ' + _t('Sao chép mã', 'Copy ID') + '</button>' +
        '<button type="button" class="rid-secondary" data-copy="filename">⧉ ' + _t('Sao chép tên file', 'Copy filename') + '</button>' +
        '<button type="button" class="rid-secondary" data-download="txt">⬇ ' + _t('Tải file TXT', 'Download TXT') + '</button>' +
        '<button type="button" class="rid-primary" data-open="fill">✍ ' + actionLabel + '</button>' +
      '</div>' +
    '</div>';
  result.classList.add('show');
  result.onclick = function(e){
    var copy = e.target.closest('[data-copy]');
    if(copy){
      if(copy.getAttribute('data-copy') === 'record') window.AllocationTracker.copyToClipboard(resp.record_id || '');
      if(copy.getAttribute('data-copy') === 'filename') window.AllocationTracker.copyToClipboard(resp.suggested_filename || '');
      return;
    }
    if(e.target.closest('[data-download="txt"]')){
      window.AllocationTracker.downloadRecordTxt(resp.record_id || 'record', [
        'Record ID: ' + (resp.record_id || ''),
        'Form Code: ' + (resp.form_code || ''),
        'Delivery Mode: ' + (resp.delivery_mode || ''),
        'Suggested Filename: ' + (resp.suggested_filename || '')
      ].join('\r\n'));
      return;
    }
    if(e.target.closest('[data-open="fill"]')){
      if(window._fhState){
        window._fhState.pendingFillSelection = {
          formCode: resp.form_code || '',
          allocationId: resp.allocation_id || '',
          recordId: resp.record_id || '',
          deliveryMode: resp.delivery_mode || ''
        };
      }
      if(typeof window._fhSwitchTab === 'function') window._fhSwitchTab('fill-download');
    }
  };
}

function _loadHistory(){
  if(!window.AllocationTracker) return;
  window.AllocationTracker.getHistory(_historyFilters).then(function(resp){
    if(!resp || !resp.ok){
      _showInlineMessage(_t('Không thể tải lịch sử cấp phát.', 'Could not load allocation history.'), 'error');
      return;
    }
    window.AllocationTracker.renderHistoryTable(_moduleId + '-history', resp.entries || [], {
      searchable: true,
      emptyMessage: _t('Chưa có bản ghi cấp phát nào.', 'No allocation history yet.')
    });
    window.AllocationTracker.renderPagination(_moduleId + '-pagination', resp.page || 1, resp.total_pages || 1, function(nextPage){
      _historyFilters.page = nextPage;
      _loadHistory();
    });
  });
}

function _showInlineMessage(message, type){
  var result = document.getElementById(_moduleId + '-result');
  if(!result) return;
  var tone = type || 'info';
  result.innerHTML = '<div class="rid-inline rid-inline-' + tone + '">' + _escHtml(message) + '</div>';
  result.classList.add('show');
}

})();
