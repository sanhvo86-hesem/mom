/* ═══════════════════════════════════════════════════
   09-online-forms.js — Evidence Control Orchestrator
   HESEM QMS Portal — Single-page workspace design
   ═══════════════════════════════════════════════════ */

(function(){
'use strict';

var FORM_COLORS = {
  production:  { bg:'#fef3c7', icon:'\uD83C\uDFED' },
  quality:     { bg:'#dcfce7', icon:'\uD83D\uDD0E' },
  maintenance: { bg:'#fff9db', icon:'\uD83D\uDD27' },
  hr:          { bg:'#f3e8ff', icon:'\uD83D\uDC65' },
  logistics:   { bg:'#fff4e6', icon:'\uD83D\uDCE6' },
  safety:      { bg:'#fee2e2', icon:'\u26A0' },
  other:       { bg:'#f1f5f9', icon:'\uD83D\uDDC2' }
};

var state = {
  forms: [],
  formMap: {},
  recordTypes: {},
  formToRecordType: {},
  selectedFormCode: '',
  selectedAllocationId: '',
  allocations: [],
  filter: 'all',
  search: '',
  ready: false
};

window._ecState = state;

function t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }

function showToast(message, type){
  var existing = document.querySelector('.ec-toast');
  if(existing) existing.remove();
  var el = document.createElement('div');
  el.className = 'ec-toast ' + (type || 'info');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(function(){ el.classList.add('show'); }, 10);
  setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ if(el.parentNode) el.remove(); }, 300); }, 3000);
}

window._ecShowToast = showToast;
window._ecT = t;
window._ecEsc = esc;

function api(action, payload, method){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', 30000);
  var opts = { method: method || 'GET', credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if((method || 'GET') !== 'GET'){ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(payload || {}); }
  return fetch('api.php?action=' + encodeURIComponent(action), opts).then(function(r){ return r.json(); });
}

window._ecApi = api;

/* ── Data loading ── */

function loadAll(){
  return Promise.all([
    api('form_catalog_snapshot', {}, 'GET').then(function(resp){
      state.forms = (resp && Array.isArray(resp.forms)) ? resp.forms : [];
      state.formMap = {};
      state.forms.forEach(function(f){
        if(!f.category) f.category = 'other';
        if(f.online !== false) f.online = true;
        state.formMap[f.form_code] = f;
      });
    }).catch(function(){ state.forms = []; }),
    api('config_record_types', {}, 'GET').then(function(resp){
      state.recordTypes = resp && resp.record_types ? resp.record_types : {};
      state.formToRecordType = {};
      Object.keys(state.recordTypes).forEach(function(code){
        var linked = (state.recordTypes[code] || {}).linked_form;
        if(linked) state.formToRecordType[linked] = code;
      });
    }).catch(function(){ state.recordTypes = {}; state.formToRecordType = {}; })
  ]);
}

function loadAllocations(){
  if(!state.selectedFormCode || !window.AllocationTracker) { state.allocations = []; return Promise.resolve([]); }
  return window.AllocationTracker.getHistory({ form_code: state.selectedFormCode, page_size: 50 }).then(function(resp){
    state.allocations = (resp && Array.isArray(resp.entries)) ? resp.entries.filter(function(r){ return String(r.form_code || '') === String(state.selectedFormCode); }) : [];
    if(!state.selectedAllocationId && state.allocations.length) state.selectedAllocationId = state.allocations[0].allocation_id || '';
    if(state.selectedAllocationId && !state.allocations.some(function(r){ return r.allocation_id === state.selectedAllocationId; })){
      state.selectedAllocationId = state.allocations.length ? state.allocations[0].allocation_id : '';
    }
    return state.allocations;
  }).catch(function(){ state.allocations = []; return []; });
}

/* ── Rendering ── */

function render(container){
  container.innerHTML = '<div class="ec-shell">' + renderSidebar() + '<div class="ec-workspace" id="ec-workspace"></div></div>';
  bindSidebar(container);
  renderWorkspace();
}

function renderSidebar(){
  var forms = filterForms();
  var categories = {};
  forms.forEach(function(f){ var c = f.category || 'other'; if(!categories[c]) categories[c] = []; categories[c].push(f); });

  var formListHtml = '';
  if(!forms.length){
    formListHtml = '<div style="padding:24px;text-align:center;color:var(--ec-text-muted);font-size:12px">' + esc(t('Không tìm thấy form nào', 'No forms found')) + '</div>';
  } else {
    Object.keys(categories).sort().forEach(function(cat){
      var meta = FORM_COLORS[cat] || FORM_COLORS.other;
      formListHtml += categories[cat].map(function(f){
        var isActive = state.selectedFormCode === f.form_code;
        return '<div class="ec-form-item' + (isActive ? ' active' : '') + '" data-form="' + esc(f.form_code) + '">' +
          '<div class="ec-form-icon" style="background:' + meta.bg + '">' + meta.icon + '</div>' +
          '<div class="ec-form-info"><div class="ec-form-code">' + esc(f.form_code) + '</div><div class="ec-form-name">' + esc(f.title_vi || f.title || f.form_code) + '</div></div>' +
          '<span class="ec-mode-badge ' + (f.online === false ? 'offline' : 'online') + '">' + (f.online === false ? 'Offline' : 'Online') + '</span>' +
        '</div>';
      }).join('');
    });
  }

  var allocHtml = '';
  if(state.selectedFormCode && state.allocations.length){
    allocHtml = state.allocations.map(function(a){
      var isActive = state.selectedAllocationId === a.allocation_id;
      return '<div class="ec-alloc-item' + (isActive ? ' active' : '') + '" data-alloc="' + esc(a.allocation_id) + '">' +
        '<div style="flex:1;min-width:0"><div class="ec-alloc-id">' + esc(a.record_id || '') + '</div><div class="ec-alloc-meta">' + esc(a.department || '') + ' · ' + esc(a.status || 'allocated') + '</div></div>' +
        (window.AllocationTracker ? window.AllocationTracker.renderStatusBadge(a.status || 'allocated') : '') +
      '</div>';
    }).join('');
  }

  var cats = ['all','quality','production','maintenance','hr','logistics','safety','other'];
  var catLabels = { all: t('Tất cả','All'), quality: t('Chất lượng','Quality'), production: t('Sản xuất','Production'), maintenance: t('Bảo trì','Maintenance'), hr: t('Nhân sự','HR'), logistics: t('Kho vận','Logistics'), safety: t('An toàn','Safety'), other: t('Khác','Other') };

  return '<aside class="ec-sidebar">' +
    '<div class="ec-sidebar-header">' +
      '<div class="ec-sidebar-title">' + esc(t('Danh mục biểu mẫu', 'Form catalog')) + '</div>' +
      '<input class="ec-search" id="ec-search" type="search" value="' + esc(state.search) + '" placeholder="' + esc(t('Tìm form...', 'Search forms...')) + '">' +
    '</div>' +
    '<div class="ec-filters" id="ec-filters">' + cats.map(function(c){
      return '<button type="button" class="ec-chip' + (state.filter === c ? ' active' : '') + '" data-filter="' + c + '">' + esc(catLabels[c] || c) + '</button>';
    }).join('') + '</div>' +
    '<div class="ec-form-list" id="ec-form-list">' + formListHtml + '</div>' +
    (state.selectedFormCode ? '<div class="ec-alloc-section"><div class="ec-alloc-section-head"><span>' + esc(t('Mã đã cấp', 'Allocations')) + ' (' + state.allocations.length + ')</span></div>' + (allocHtml || '<div style="padding:8px 16px;font-size:11px;color:var(--ec-text-muted)">' + esc(t('Chưa có mã', 'None yet')) + '</div>') + '</div>' : '') +
  '</aside>';
}

function filterForms(){
  return state.forms.filter(function(f){
    if(state.filter !== 'all' && (f.category || 'other') !== state.filter) return false;
    if(state.search){
      var q = state.search.toLowerCase();
      var hay = [f.form_code, f.title, f.title_vi, f.description, f.description_vi, f.sop_ref, f.category].join(' ').toLowerCase();
      if(hay.indexOf(q) < 0) return false;
    }
    return true;
  });
}

function renderWorkspace(){
  var ws = document.getElementById('ec-workspace');
  if(!ws) return;
  var form = state.formMap[state.selectedFormCode] || null;
  if(!form){
    ws.innerHTML = '<div class="ec-empty"><div class="ec-empty-icon">\uD83D\uDCCB</div><h3>' + esc(t('Chọn biểu mẫu để bắt đầu', 'Select a form to begin')) + '</h3><p>' + esc(t('Chọn form từ danh mục bên trái. Hệ thống sẽ hướng dẫn bạn qua từng bước: cấp mã → điền/tải → ký & gửi.', 'Pick a form from the catalog. The system will guide you through each step: allocate → fill/download → sign & submit.')) + '</p></div>';
    return;
  }
  var allocation = state.allocations.find(function(a){ return a.allocation_id === state.selectedAllocationId; }) || null;
  if(typeof window._renderWorkspace === 'function'){
    window._renderWorkspace(form, allocation, ws);
  } else {
    ws.innerHTML = '<div class="ec-empty"><h3>' + esc(t('Module workspace chưa sẵn sàng', 'Workspace module not ready')) + '</h3></div>';
  }
}

/* ── Event binding ── */

function bindSidebar(container){
  var searchEl = document.getElementById('ec-search');
  if(searchEl) searchEl.oninput = function(){ state.search = searchEl.value; refreshFormList(container); };

  container.addEventListener('click', function(e){
    var filterBtn = e.target.closest('[data-filter]');
    if(filterBtn){
      state.filter = filterBtn.getAttribute('data-filter') || 'all';
      refreshFormList(container);
      return;
    }
    var formItem = e.target.closest('[data-form]');
    if(formItem){
      var code = formItem.getAttribute('data-form');
      if(code === state.selectedFormCode) return;
      state.selectedFormCode = code;
      state.selectedAllocationId = '';
      state.allocations = [];
      loadAllocations().then(function(){ render(container); });
      return;
    }
    var allocItem = e.target.closest('[data-alloc]');
    if(allocItem){
      state.selectedAllocationId = allocItem.getAttribute('data-alloc') || '';
      render(container);
    }
  });
}

function refreshFormList(container){
  var listEl = document.getElementById('ec-form-list');
  var filtersEl = document.getElementById('ec-filters');
  if(!listEl) return;

  var forms = filterForms();
  var categories = {};
  forms.forEach(function(f){ var c = f.category || 'other'; if(!categories[c]) categories[c] = []; categories[c].push(f); });

  var html = '';
  if(!forms.length){
    html = '<div style="padding:24px;text-align:center;color:var(--ec-text-muted);font-size:12px">' + esc(t('Không tìm thấy form nào', 'No forms found')) + '</div>';
  } else {
    Object.keys(categories).sort().forEach(function(cat){
      var meta = FORM_COLORS[cat] || FORM_COLORS.other;
      html += categories[cat].map(function(f){
        return '<div class="ec-form-item' + (state.selectedFormCode === f.form_code ? ' active' : '') + '" data-form="' + esc(f.form_code) + '">' +
          '<div class="ec-form-icon" style="background:' + meta.bg + '">' + meta.icon + '</div>' +
          '<div class="ec-form-info"><div class="ec-form-code">' + esc(f.form_code) + '</div><div class="ec-form-name">' + esc(f.title_vi || f.title || f.form_code) + '</div></div>' +
          '<span class="ec-mode-badge ' + (f.online === false ? 'offline' : 'online') + '">' + (f.online === false ? 'Offline' : 'Online') + '</span>' +
        '</div>';
      }).join('');
    });
  }
  listEl.innerHTML = html;

  if(filtersEl){
    Array.prototype.forEach.call(filtersEl.querySelectorAll('.ec-chip'), function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-filter') === state.filter);
    });
  }
}

/* ── Public entry point ── */

window.renderOnlineForms = function(formCode){
  var page = document.getElementById('page-forms');
  if(!page) return;
  if(formCode) state.selectedFormCode = formCode;
  page.innerHTML = '<div class="ec-empty" style="min-height:300px"><div style="font-size:14px;color:var(--ec-text-muted)">' + esc(t('Đang tải...', 'Loading...')) + '</div></div>';
  loadAll().then(function(){
    if(!state.selectedFormCode && state.forms.length) state.selectedFormCode = state.forms[0].form_code;
    return loadAllocations();
  }).then(function(){
    state.ready = true;
    render(page);
  }).catch(function(){
    page.innerHTML = '<div class="ec-empty"><h3>' + esc(t('Không thể tải dữ liệu', 'Could not load data')) + '</h3><p>' + esc(t('Vui lòng kiểm tra kết nối và thử lại.', 'Please check your connection and try again.')) + '</p></div>';
  });
};

/* backward compat */
window._fhSwitchTab = function(){};
window._fhState = state;
window._fhShowToast = showToast;
window._fhT = t;
window._fhEscHtml = esc;

})();
