(function(){
'use strict';

var state = {
  forms: [],
  formsByCode: {},
  activeTab: 'catalog',
  activeFilter: 'all',
  searchQuery: '',
  pendingFillSelection: null,
  pendingContext: null
};

var FORM_COLORS = {
  production:  { bg:'#e7f5ff', border:'#1971c2', icon:'🏭', label:'Sản xuất', labelEn:'Production' },
  quality:     { bg:'#ebfbee', border:'#2f9e44', icon:'🔎', label:'Chất lượng', labelEn:'Quality' },
  maintenance: { bg:'#fff9db', border:'#e67700', icon:'🔧', label:'Bảo trì', labelEn:'Maintenance' },
  hr:          { bg:'#f3f0ff', border:'#7950f2', icon:'👥', label:'Nhân sự & Đào tạo', labelEn:'HR & Training' },
  logistics:   { bg:'#fff4e6', border:'#d9480f', icon:'📦', label:'Kho vận', labelEn:'Logistics' },
  safety:      { bg:'#fff5f5', border:'#e03131', icon:'⚠', label:'An toàn', labelEn:'Safety' },
  other:       { bg:'#f8fafc', border:'#64748b', icon:'🗂', label:'Khác', labelEn:'Other' }
};

var TABS = [
  { id:'catalog',       icon:'📋', labelVi:'Danh mục form',          labelEn:'Form catalog' },
  { id:'fill-download', icon:'✍', labelVi:'Điền & Tải form',        labelEn:'Fill & Download' },
  { id:'record-id',     icon:'🔢', labelVi:'Trợ lý tạo mã',         labelEn:'Record ID Assistant' },
  { id:'upload',        icon:'📤', labelVi:'Tải lên & Kiểm tra',    labelEn:'Upload & Verify' }
];

function t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function esc(value){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(value == null ? '' : value))); return d.innerHTML; }
function showToast(message, type){
  if(typeof window._fhShowToast === 'function' && window._fhShowToast !== showToast){
    return window._fhShowToast(message, type);
  }
  var toast = document.createElement('div');
  toast.className = 'form-toast form-toast-' + (type || 'info');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.classList.add('show'); }, 10);
  setTimeout(function(){ toast.classList.remove('show'); setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 240); }, 2800);
}

window._fhState = state;
window._fhT = t;
window._fhEscHtml = esc;
window._fhShowToast = showToast;
window._fhFormColors = FORM_COLORS;

window.renderOnlineForms = function(formCode){
  var page = document.getElementById('page-forms');
  if(!page) return;
  if(formCode){
    state.pendingFillSelection = { formCode: formCode };
    state.activeTab = 'fill-download';
  }
  loadCatalog().then(function(){
    renderHub(page);
  }).catch(function(){
    page.innerHTML = '<div class="fh"><div class="fh-section"><div class="fh-section-head"><h2>' + esc(t('Không thể tải danh mục form', 'Could not load form catalog')) + '</h2><span>' + esc(t('Vui lòng thử lại sau.', 'Please try again later.')) + '</span></div></div></div>';
  });
};

window._fhSwitchTab = function(tabId){
  state.activeTab = tabId;
  renderActiveTab();
};

function api(action, payload, method){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', 30000);
  var options = { method: method || 'GET', credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) options.headers['X-CSRF-Token'] = csrfToken;
  if((method || 'GET') !== 'GET'){
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload || {});
  }
  return fetch('api.php?action=' + encodeURIComponent(action), options).then(function(r){ return r.json(); });
}

function loadCatalog(){
  return api('form_catalog_snapshot', {}, 'GET').then(function(resp){
    var forms = (resp && Array.isArray(resp.forms)) ? resp.forms.slice() : [];
    forms.forEach(function(form){
      if(!form.category) form.category = 'other';
      if(!form.delivery_mode) form.delivery_mode = form.online === false ? 'offline' : 'online';
      if(form.online !== false) form.online = true;
      state.formsByCode[form.form_code] = form;
    });
    state.forms = forms;
    return forms;
  });
}

function renderHub(page){
  var totalForms = state.forms.length;
  var onlineForms = state.forms.filter(function(form){ return form.online !== false; }).length;
  var offlineForms = totalForms - onlineForms;

  page.innerHTML = '' +
    '<div class="fh">' +
      '<div class="fh-hero">' +
        '<div>' +
          '<div class="fh-hero-kicker">HESEM QMS · Evidence Control Runtime</div>' +
          '<h1>' + esc(t('Kiểm soát chứng cứ — Trung tâm quản lý biểu mẫu', 'Evidence Control — Central form runtime')) + '</h1>' +
          '<p>' + esc(t('Danh mục form, cấp phát mã, điền online, tải Excel và kiểm tra upload được điều phối trong một runtime thống nhất.', 'Catalog, record allocation, online entry, Excel download, and upload verification are orchestrated in one governed runtime.')) + '</p>' +
        '</div>' +
        '<div class="fh-hero-side">' +
          '<div class="fh-side-card"><span class="fh-side-label">' + esc(t('Tổng form', 'Total forms')) + '</span><strong>' + totalForms + '</strong><div>' + esc(t('Đang khả dụng', 'Available')) + '</div></div>' +
          '<div class="fh-side-card"><span class="fh-side-label">' + esc(t('Online', 'Online')) + '</span><strong>' + onlineForms + '</strong><div>' + esc(t('Trực tuyến', 'Live')) + '</div></div>' +
          '<div class="fh-side-card"><span class="fh-side-label">' + esc(t('Offline', 'Offline')) + '</span><strong>' + offlineForms + '</strong><div>' + esc(t('Excel kiểm soát', 'Excel governed')) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="fh-summary">' +
        kpiCard('blue', totalForms, t('Tổng form', 'Total forms'), t('Danh mục dùng chung', 'Shared catalog')) +
        kpiCard('green', onlineForms, t('Form online', 'Online forms'), t('Điền trực tiếp', 'Live entry')) +
        kpiCard('amber', offlineForms, t('Form offline', 'Offline forms'), t('Cấp phát & tải Excel', 'Issued Excel')) +
        kpiCard('purple', state.pendingFillSelection && state.pendingFillSelection.recordId ? 1 : 0, t('Đang xử lý', 'In context'), t('Ngữ cảnh đang mở', 'Working context')) +
        kpiCard('red', 1, t('Runtime', 'Runtime'), t('Compatibility layer', 'Compatibility layer')) +
      '</div>' +
      '<div class="fh-tabs">' + TABS.map(function(tab){
        return '<button type="button" class="fh-tab' + (state.activeTab === tab.id ? ' active' : '') + '" data-tab="' + tab.id + '" onclick="_fhSwitchTab(\'' + tab.id + '\')">' +
          '<span class="fh-tab-icon">' + tab.icon + '</span>' + esc(t(tab.labelVi, tab.labelEn)) + (tab.id === 'catalog' ? ' <span class="fh-tab-count">' + totalForms + '</span>' : '') +
        '</button>';
      }).join('') + '</div>' +
      '<div id="fh-tab-catalog" class="fh-panel"></div>' +
      '<div id="fh-tab-fill-download" class="fh-panel"></div>' +
      '<div id="fh-tab-record-id" class="fh-panel"></div>' +
      '<div id="fh-tab-upload" class="fh-panel"></div>' +
    '</div>';

  renderActiveTab();
}

function kpiCard(color, value, label, sub){
  return '<div class="fh-kpi fh-kpi-' + color + '"><div class="fh-kpi-label">' + esc(label) + '</div><strong>' + value + '</strong><span>' + esc(sub) + '</span></div>';
}

function renderActiveTab(){
  Array.prototype.forEach.call(document.querySelectorAll('.fh-tab'), function(tab){
    tab.classList.toggle('active', tab.getAttribute('data-tab') === state.activeTab);
  });
  Array.prototype.forEach.call(document.querySelectorAll('.fh-panel'), function(panel){
    panel.classList.remove('active');
  });
  var panel = document.getElementById('fh-tab-' + state.activeTab);
  if(!panel) return;
  panel.classList.add('active');

  if(state.activeTab === 'catalog') return renderCatalog(panel);
  if(state.activeTab === 'fill-download'){
    if(typeof window._renderFillDownload === 'function') return window._renderFillDownload(state.forms, {}, panel);
    panel.innerHTML = emptyBlock(t('Module Điền & Tải form chưa sẵn sàng.', 'Fill & Download module is not ready yet.'));
    return;
  }
  if(state.activeTab === 'record-id'){
    if(typeof window._renderRecordIdGenerator === 'function') return window._renderRecordIdGenerator(state.forms, {}, panel);
    panel.innerHTML = emptyBlock(t('Module Trợ lý tạo mã chưa sẵn sàng.', 'Record ID Assistant is not ready yet.'));
    return;
  }
  if(state.activeTab === 'upload'){
    if(typeof window._renderUploadVerify === 'function') return window._renderUploadVerify(state.forms, {}, panel);
    panel.innerHTML = emptyBlock(t('Module Tải lên & Kiểm tra chưa sẵn sàng.', 'Upload & Verify module is not ready yet.'));
  }
}

function emptyBlock(message){
  return '<div class="fh-section"><div class="fh-section-head"><h2>' + esc(message) + '</h2></div></div>';
}

function renderCatalog(container){
  var forms = state.forms.slice();
  var query = String(state.searchQuery || '').trim().toLowerCase();
  var filter = state.activeFilter || 'all';
  if(filter !== 'all') forms = forms.filter(function(form){ return String(form.category || 'other') === filter; });
  if(query){
    forms = forms.filter(function(form){
      var hay = [form.form_code, form.title, form.title_vi, form.description, form.description_vi, form.sop_ref, form.category].join(' ').toLowerCase();
      return hay.indexOf(query) >= 0;
    });
  }

  var html = '' +
    '<section class="fh-section">' +
      '<div class="fh-section-head"><h2>' + esc(t('Danh mục form được kiểm soát', 'Governed form catalog')) + '</h2><span>' + esc(t('Chọn form để chuyển sang luồng điền online hoặc tải Excel đã kiểm soát.', 'Pick a form to continue to online runtime or governed Excel issuance.')) + '</span></div>' +
      '<div class="fh-filter-bar">' +
        '<input id="fh-catalog-search" class="fh-search" type="search" value="' + esc(state.searchQuery || '') + '" placeholder="' + esc(t('Tìm theo mã form, tiêu đề, SOP...', 'Search by form code, title, SOP...')) + '">' +
        '<div class="fh-filter-chips">' + ['all','quality','production','maintenance','hr','logistics','safety','other'].map(function(key){
          var meta = FORM_COLORS[key] || FORM_COLORS.other;
          var label = key === 'all' ? t('Tất cả', 'All') : t(meta.label, meta.labelEn);
          return '<button type="button" class="fh-chip' + (state.activeFilter === key ? ' active' : '') + '" data-filter="' + key + '">' + esc(label) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
    '</section>';

  if(!forms.length){
    html += '<div class="fh-section"><div class="forms-page"><div class="forms-stat-card"><div class="stat-value">0</div><div class="stat-label">' + esc(t('Không có kết quả', 'No results')) + '</div></div></div></div>';
    container.innerHTML = html;
    bindCatalogEvents(container);
    return;
  }

  var grouped = {};
  forms.forEach(function(form){
    var group = form.category || 'other';
    if(!grouped[group]) grouped[group] = [];
    grouped[group].push(form);
  });

  Object.keys(grouped).sort(function(a, b){ return String(a).localeCompare(String(b)); }).forEach(function(groupKey){
    var meta = FORM_COLORS[groupKey] || FORM_COLORS.other;
    html += '<section class="forms-group">' +
      '<h3 class="forms-group-title"><span class="forms-group-icon">' + meta.icon + '</span>' + esc(t(meta.label, meta.labelEn)) + ' <span class="fh-tab-count">' + grouped[groupKey].length + '</span></h3>' +
      '<div class="forms-grid">';
    grouped[groupKey].forEach(function(form){
      var modeClass = form.online === false ? 'form-card-excel' : 'form-card-online';
      var modeLabel = form.online === false ? t('Offline', 'Offline') : t('Online', 'Online');
      var actionLabel = form.online === false ? t('Mở luồng tải form', 'Open download flow') : t('Mở form online', 'Open online form');
      html += '' +
        '<article class="form-card" data-open-form="' + esc(form.form_code) + '">' +
          '<div class="form-card-type ' + modeClass + '">' + esc(modeLabel) + '</div>' +
          '<div class="form-card-header">' +
            '<span class="form-card-code">' + esc(form.form_code || '') + '</span>' +
            '<span class="form-card-freq">' + esc(form.version || 'V1') + '</span>' +
          '</div>' +
          '<div class="form-card-title">' + esc(form.title_vi || form.title || form.form_code) + '</div>' +
          '<div class="form-card-desc">' + esc(t(form.description_vi || form.description || 'Chưa có mô tả chi tiết cho form này.', form.description || 'No detailed description available for this form yet.')) + '</div>' +
          '<div class="form-card-footer">' +
            '<span class="form-card-ref">' + esc(form.sop_ref || '—') + '</span>' +
            '<button type="button" class="form-card-btn">' + esc(actionLabel) + '</button>' +
          '</div>' +
        '</article>';
    });
    html += '</div></section>';
  });

  container.innerHTML = html;
  bindCatalogEvents(container);
}

function bindCatalogEvents(container){
  var search = container.querySelector('#fh-catalog-search');
  if(search){
    search.oninput = function(){ state.searchQuery = search.value || ''; renderCatalog(container); };
  }
  Array.prototype.forEach.call(container.querySelectorAll('[data-filter]'), function(btn){
    btn.onclick = function(){ state.activeFilter = btn.getAttribute('data-filter') || 'all'; renderCatalog(container); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-open-form]'), function(card){
    card.addEventListener('click', function(){
      var formCode = card.getAttribute('data-open-form') || '';
      if(!formCode) return;
      state.pendingFillSelection = { formCode: formCode };
      state.activeTab = 'fill-download';
      renderActiveTab();
    });
  });
}

})();
