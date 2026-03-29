/* ===================================================================
   14-mes-control-center.js
   HESEM QMS Portal -- MES Control Center
   =================================================================== */

(function(){
'use strict';

var state = {
  container: null,
  snapshot: null,
  exceptions: null,
  master: null,
  search: '',
  workCenter: '',
  dispatchStatus: '',
  modal: null,
  refreshTimer: null,
  loading: false
};

var STATUS_META = {
  scheduled:   { labelVi:'Đã lên lịch', labelEn:'Scheduled', color:'#64748b' },
  setup:       { labelVi:'Đang setup', labelEn:'Setup', color:'#2563eb' },
  running:     { labelVi:'Đang chạy', labelEn:'Running', color:'#0f9d58' },
  inspection:  { labelVi:'Đang kiểm tra', labelEn:'Inspection', color:'#7c3aed' },
  completed:   { labelVi:'Hoàn thành', labelEn:'Completed', color:'#059669' },
  on_hold:     { labelVi:'Tạm dừng', labelEn:'On hold', color:'#dc2626' },
  down:        { labelVi:'Dừng máy', labelEn:'Machine down', color:'#dc2626' },
  maintenance: { labelVi:'Bảo trì', labelEn:'Maintenance', color:'#d97706' },
  idle:        { labelVi:'Rảnh', labelEn:'Idle', color:'#475569' },
  open:        { labelVi:'Mở', labelEn:'Open', color:'#dc2626' },
  approved:    { labelVi:'Đã duyệt', labelEn:'Approved', color:'#2563eb' },
  in_progress: { labelVi:'Đang xử lý', labelEn:'In progress', color:'#d97706' },
  resolved:    { labelVi:'Đã khôi phục', labelEn:'Resolved', color:'#059669' },
  cancelled:   { labelVi:'Đã hủy', labelEn:'Cancelled', color:'#6b7280' }
};

var EXCEPTION_META = {
  overdue_allocations: {
    labelVi:'Allocation quá hạn',
    labelEn:'Overdue allocations',
    noteVi:'Đã tải form nhưng quá hạn chưa nộp lại.',
    noteEn:'Forms issued long ago but still not submitted.'
  },
  failed_uploads: {
    labelVi:'Upload thất bại',
    labelEn:'Failed uploads',
    noteVi:'Đang nằm trong hàng đợi exception để xử lý.',
    noteEn:'Files currently waiting in the exception queue.'
  },
  overdue_orders: {
    labelVi:'Đơn hàng quá hạn',
    labelEn:'Overdue orders',
    noteVi:'SO / JO / WO đã vượt ngày giao hoặc ngày hoàn tất.',
    noteEn:'SO / JO / WO past due date.'
  },
  overdue_capas: {
    labelVi:'CAPA mở quá hạn',
    labelEn:'Overdue CAPA',
    noteVi:'Các CAPA mở quá lâu cần escalation.',
    noteEn:'Long-open CAPA items that need escalation.'
  },
  wo_missing_evidence: {
    labelVi:'WO thiếu chứng cứ',
    labelEn:'WO missing evidence',
    noteVi:'WO đang hoạt động nhưng chưa có liên kết hồ sơ.',
    noteEn:'Active WO without linked evidence.'
  },
  orphan_links: {
    labelVi:'Liên kết mồ côi',
    labelEn:'Orphan links',
    noteVi:'Link hồ sơ không còn tìm thấy SO / JO / WO gốc.',
    noteEn:'Evidence links without valid SO / JO / WO parent.'
  }
};

function t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function esc(value){ var d = document.createElement('div'); d.appendChild(document.createTextNode(String(value == null ? '' : value))); return d.innerHTML; }
function jsonAttr(value){ return encodeURIComponent(JSON.stringify(value || {})); }
function parseJsonAttr(value){ try { return JSON.parse(decodeURIComponent(String(value || ''))); } catch (_e) { return {}; } }
function nowInputValue(){
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function fmtDate(value){
  if(!value) return '—';
  var d = new Date(value);
  if(isNaN(d.getTime())) return String(value);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
function fmtDateTime(value){
  if(!value) return '—';
  var d = new Date(value);
  if(isNaN(d.getTime())) return String(value);
  return fmtDate(value) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function statusMeta(key){
  var normalized = String(key || '').toLowerCase();
  return STATUS_META[normalized] || { labelVi:key || '—', labelEn:key || '—', color:'#64748b' };
}
function statusBadge(key){
  var meta = statusMeta(key);
  return '<span class="mes-badge" style="--badge:' + meta.color + '">' + esc(t(meta.labelVi, meta.labelEn)) + '</span>';
}
function toast(message, type){
  if(typeof window._fhShowToast === 'function') return window._fhShowToast(message, type);
  if(window.console) console.log('[MES]', type || 'info', message);
}
function api(action, payload, method){
  var callMethod = method || 'GET';
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, callMethod, 30000);
  var url = 'api.php?action=' + encodeURIComponent(action);
  if(callMethod === 'GET' && payload){
    Object.keys(payload).forEach(function(key){
      if(payload[key] === undefined || payload[key] === null || payload[key] === '') return;
      url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(String(payload[key]));
    });
  }
  var options = { method: callMethod, credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) options.headers['X-CSRF-Token'] = csrfToken;
  if(callMethod !== 'GET'){
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload || {});
  }
  return fetch(url, options).then(function(resp){ return resp.json(); });
}

function ensureStyles(){
  if(document.getElementById('mes-cc-styles')) return;
  var style = document.createElement('style');
  style.id = 'mes-cc-styles';
  style.textContent = [
    '.mes-wrap{padding:24px 24px 40px;max-width:1520px;margin:0 auto;color:#0f172a}',
    '.mes-hero{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(340px,.88fr);gap:18px;align-items:stretch;margin-bottom:18px}',
    '.mes-poster{position:relative;overflow:hidden;border-radius:28px;padding:26px 28px;background:linear-gradient(135deg,#0c2d48 0%,#15466f 52%,#1f6aa5 100%);color:#fff;box-shadow:0 24px 60px rgba(12,45,72,.24)}',
    '.mes-poster::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,0) 40%)}',
    '.mes-poster::after{content:"";position:absolute;right:-80px;top:-70px;width:240px;height:240px;border-radius:999px;background:radial-gradient(circle,rgba(249,168,37,.22) 0%,rgba(249,168,37,0) 68%)}',
    '.mes-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.72);font-weight:800}.mes-poster-head{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;position:relative;z-index:1}.mes-brand{display:flex;gap:14px;align-items:center}.mes-brand-logo{width:54px;height:54px;border-radius:14px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)}.mes-brand-logo img{width:36px;height:36px;object-fit:contain}.mes-poster h1{margin:10px 0 10px;font-size:32px;line-height:1.08;letter-spacing:-.03em}.mes-poster p{margin:0;color:rgba(255,255,255,.82);max-width:760px;line-height:1.7;font-size:14px}.mes-poster-facts{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.mes-fact{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.10);font-size:12px;font-weight:700;color:#fff;border:1px solid rgba(255,255,255,.12)}',
    '.mes-poster-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.mes-btn{height:42px;border:none;border-radius:14px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;cursor:pointer;transition:transform .14s ease,box-shadow .14s ease,background .14s ease}.mes-btn:hover{transform:translateY(-1px)}.mes-btn.primary{background:#f9a825;color:#102133;box-shadow:0 12px 24px rgba(249,168,37,.26)}.mes-btn.secondary{background:rgba(255,255,255,.10);color:#fff;border:1px solid rgba(255,255,255,.16)}.mes-btn.ghost{background:#fff;color:#0c2d48;border:1px solid #dbe4ef}',
    '.mes-side{display:grid;grid-template-rows:auto auto;gap:18px}.mes-card{background:#fff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 16px 40px rgba(15,23,42,.06)}.mes-clock{padding:22px 22px 18px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)}.mes-clock-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.mes-clock strong{font-size:30px;line-height:1;color:#0c2d48;display:block;margin-top:10px}.mes-clock small{display:block;font-size:12px;color:#64748b;line-height:1.7}',
    '.mes-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:18px}.mes-kpi{border-radius:18px;padding:16px;background:#f8fafc;border:1px solid #e5edf6}.mes-kpi small{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px}.mes-kpi strong{display:block;font-size:28px;line-height:1;color:#0c2d48}.mes-kpi span{display:block;font-size:12px;color:#64748b;margin-top:8px}',
    '.mes-summary{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.mes-panel{background:#fff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 16px 40px rgba(15,23,42,.05);padding:18px}.mes-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.mes-panel-head h2,.mes-panel-head h3{margin:0;font-size:18px;color:#0c2d48}.mes-panel-head p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.7}.mes-chips{display:flex;flex-wrap:wrap;gap:10px}.mes-chip{padding:10px 12px;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px;color:#334155;font-weight:700}',
    '.mes-main{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(360px,.82fr);gap:18px;align-items:start}.mes-stack{display:grid;gap:18px}.mes-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}.mes-input,.mes-select,.mes-textarea{width:100%;border:1px solid #d7e1ec;border-radius:14px;padding:10px 12px;font-family:inherit;font-size:13px;box-sizing:border-box;background:#fff}.mes-input:focus,.mes-select:focus,.mes-textarea:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12)}.mes-input.search{max-width:320px}.mes-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:18px}.mes-table{width:100%;border-collapse:collapse;min-width:940px}.mes-table th,.mes-table td{padding:12px 14px;border-bottom:1px solid #eef2f6;font-size:12px;text-align:left;vertical-align:top}.mes-table th{background:#f8fafc;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:800;position:sticky;top:0;z-index:1}',
    '.mes-code{font-family:Consolas,monospace;font-size:12px;font-weight:800;color:#0f172a}.mes-sub{display:block;margin-top:4px;color:#64748b;font-size:11px;line-height:1.5}.mes-row-actions,.mes-mini-actions{display:flex;gap:8px;flex-wrap:wrap}.mes-link-btn{border:none;background:#eef4fb;color:#0c2d48;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer}.mes-link-btn.warning{background:#fff7ed;color:#c2410c}.mes-link-btn[disabled]{opacity:.45;cursor:not-allowed}',
    '.mes-wall{display:grid;gap:12px}.mes-machine{border:1px solid #e2e8f0;border-radius:18px;padding:16px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)}.mes-machine-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mes-machine h4{margin:0;font-size:15px;color:#0f172a}.mes-machine p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.55}.mes-machine-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.mes-cell{border:1px solid #edf2f7;border-radius:12px;padding:10px;background:#f8fafc}.mes-cell small{display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:5px}.mes-cell strong{display:block;font-size:12px;color:#0f172a;line-height:1.45}',
    '.mes-list{display:grid;gap:10px}.mes-list-item{border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#fff}.mes-list-item h4{margin:0;font-size:14px;color:#0f172a}.mes-list-item p{margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.6}.mes-list-item .mes-meta-line{margin-top:8px;font-size:11px;color:#475569;line-height:1.6}.mes-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:color-mix(in srgb, var(--badge) 14%, white);color:var(--badge);font-size:11px;font-weight:800}',
    '.mes-exc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.mes-exc{border:none;width:100%;text-align:left;border-radius:16px;padding:14px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}.mes-exc:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(21,101,192,.08);border-color:#93c5fd}.mes-exc strong{display:block;font-size:24px;line-height:1;color:#0c2d48;margin-bottom:6px}.mes-exc span{display:block;font-size:12px;color:#475569;font-weight:700}.mes-exc small{display:block;margin-top:6px;font-size:11px;color:#64748b;line-height:1.5}',
    '.mes-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.52);backdrop-filter:blur(6px);z-index:12000;display:flex;align-items:center;justify-content:center;padding:24px}.mes-modal{width:min(760px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;box-shadow:0 30px 80px rgba(15,23,42,.28)}.mes-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:22px 24px 16px;border-bottom:1px solid #e2e8f0}.mes-modal-head h3{margin:0;font-size:20px;color:#0c2d48}.mes-modal-head p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.7}.mes-x{border:none;background:#eef2f7;color:#334155;width:38px;height:38px;border-radius:12px;cursor:pointer;font-size:20px}.mes-modal-body{padding:20px 24px 24px}.mes-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.mes-form-grid .full{grid-column:1 / -1}.mes-field label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:800;margin-bottom:6px}.mes-textarea{min-height:110px;resize:vertical}.mes-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding-top:16px}.mes-detail-table{width:100%;border-collapse:collapse}.mes-detail-table th,.mes-detail-table td{padding:10px 12px;border-bottom:1px solid #eef2f6;font-size:12px;text-align:left;vertical-align:top}.mes-detail-table th{font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.08em;font-weight:800;background:#f8fafc}',
    '.mes-empty{padding:20px;border:1px dashed #cbd5e1;border-radius:16px;background:#f8fafc;text-align:center;font-size:12px;color:#64748b;line-height:1.6}.mes-empty strong{display:block;color:#0c2d48;margin-bottom:5px}',
    '@media (max-width:1280px){.mes-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mes-main,.mes-summary,.mes-hero{grid-template-columns:1fr}}',
    '@media (max-width:860px){.mes-exc-grid,.mes-machine-grid,.mes-form-grid{grid-template-columns:1fr}.mes-wrap{padding:18px 16px 28px}.mes-poster h1{font-size:26px}.mes-kpi-grid{grid-template-columns:1fr 1fr}.mes-table{min-width:760px}}'
  ].join('\n');
  document.head.appendChild(style);
}

function filteredDispatch(){
  var rows = state.snapshot && Array.isArray(state.snapshot.dispatch) ? state.snapshot.dispatch.slice() : [];
  var search = String(state.search || '').trim().toLowerCase();
  if(state.workCenter) rows = rows.filter(function(row){ return String(row.work_center_id || '') === String(state.workCenter); });
  if(state.dispatchStatus) rows = rows.filter(function(row){ return String(row.status || '') === String(state.dispatchStatus); });
  if(search){
    rows = rows.filter(function(row){
      var hay = [row.wo_number, row.jo_number, row.so_number, row.customer_name, row.customer_id, row.part_number, row.part_revision, row.operation_desc, row.machine_id, row.machine_name, row.operator_name, row.operator_id, row.work_center_id, row.work_center_name].join(' ').toLowerCase();
      return hay.indexOf(search) >= 0;
    });
  }
  return rows;
}

function currentStamp(){ return fmtDateTime(new Date().toISOString()); }

function loadData(){
  state.loading = true;
  return Promise.all([api('mes_snapshot', {}, 'GET'), api('exception_dashboard', {}, 'GET'), api('master_data_snapshot', {}, 'GET')]).then(function(results){
    state.snapshot = results[0] && results[0].data ? results[0].data : null;
    state.exceptions = results[1] && results[1].ok ? results[1] : null;
    state.master = results[2] && results[2].data ? results[2].data : {};
    state.loading = false;
    render();
  }).catch(function(error){
    state.loading = false;
    if(state.container){
      state.container.innerHTML = '<div class="mes-wrap"><div class="mes-empty"><strong>' + esc(t('Không thể tải dữ liệu MES', 'Could not load MES data')) + '</strong>' + esc((error && error.message) || t('Vui lòng thử lại sau.', 'Please try again later.')) + '</div></div>';
    }
  });
}

function openEvidenceForm(formCode, context){
  if(typeof window.renderOnlineForms !== 'function' || typeof navigateTo !== 'function') return;
  if(window._fhState){
    window._fhState.pendingContext = Object.assign({}, context || {});
    window._fhState.pendingFillSelection = { formCode: formCode };
    window._fhState.activeTab = 'fill-download';
  }
  navigateTo('forms');
}

function fieldDisplay(label, value){
  return '<div class="mes-field"><label>' + esc(label) + '</label><div class="mes-cell" style="padding:12px"><strong>' + esc(value || '—') + '</strong></div></div>';
}
function editableField(id, label, controlHtml, full){
  return '<div class="mes-field' + (full ? ' full' : '') + '" id="' + id + '"><label>' + esc(label) + '</label>' + controlHtml + '</div>';
}
function showModal(title, subtitle, bodyHtml, onSubmit){
  closeModal();
  var wrap = document.createElement('div');
  wrap.className = 'mes-modal-backdrop';
  wrap.innerHTML = '<div class="mes-modal"><div class="mes-modal-head"><div><h3>' + esc(title) + '</h3><p>' + esc(subtitle || '') + '</p></div><button type="button" class="mes-x" aria-label="Close">×</button></div><div class="mes-modal-body">' + bodyHtml + '</div></div>';
  document.body.appendChild(wrap);
  wrap.querySelector('.mes-x').onclick = closeModal;
  wrap.onclick = function(event){ if(event.target === wrap) closeModal(); };
  var submit = wrap.querySelector('[data-modal-submit]');
  if(submit) submit.onclick = function(){ if(onSubmit) onSubmit(wrap, submit); };
  state.modal = wrap;
}
function closeModal(){
  if(state.modal && state.modal.parentNode) state.modal.parentNode.removeChild(state.modal);
  state.modal = null;
}
function bindModalButtons(){
  if(!state.modal) return;
  var cancel = state.modal.querySelector('[data-modal-cancel]');
  if(cancel) cancel.onclick = closeModal;
}

function renderKpi(label, value, sub){
  return '<div class="mes-kpi"><small>' + esc(label) + '</small><strong>' + esc(value) + '</strong><span>' + esc(sub) + '</span></div>';
}
function renderWorkCenterChip(center){
  return '<div class="mes-chip">' + esc(center.work_center_id || '') + ' · ' + esc(center.work_center_name || '') + ' · ' + esc(center.running_count || 0) + '/' + esc(center.machine_count || 0) + ' ' + esc(t('máy đang chạy', 'machines running')) + '</div>';
}
function renderExceptionGrid(exceptions){
  var items = Object.keys(EXCEPTION_META).map(function(key){ return Object.assign({ key:key, value:Number(exceptions && exceptions[key] || 0) }, EXCEPTION_META[key]); });
  return '<div class="mes-exc-grid">' + items.map(function(item){
    return '<button type="button" class="mes-exc" data-exception-type="' + esc(item.key) + '"><strong>' + esc(item.value) + '</strong><span>' + esc(t(item.labelVi, item.labelEn)) + '</span><small>' + esc(t(item.noteVi, item.noteEn)) + '</small></button>';
  }).join('') + '</div>';
}
function renderDispatchTable(rows){
  if(!rows.length){
    return '<div class="mes-empty"><strong>' + esc(t('Không có WO khớp bộ lọc', 'No WO matches the current filters')) + '</strong>' + esc(t('Thử bỏ bớt bộ lọc hoặc làm mới dữ liệu MES.', 'Try clearing filters or refreshing the MES snapshot.')) + '</div>';
  }
  return '<div class="mes-table-wrap"><table class="mes-table"><thead><tr><th>' + esc(t('WO', 'WO')) + '</th><th>' + esc(t('Khách hàng / Part', 'Customer / Part')) + '</th><th>' + esc(t('Machine / WC', 'Machine / WC')) + '</th><th>' + esc(t('Tiến độ', 'Progress')) + '</th><th>' + esc(t('Lịch', 'Schedule')) + '</th><th>' + esc(t('Hành động', 'Actions')) + '</th></tr></thead><tbody>' + rows.map(function(row){
    var progress = Number(row.qty_completed || 0) + '/' + Number(row.qty_ordered || 0);
    var ctx = { customer_id:row.customer_id || '', so_number:row.so_number || '', jo_number:row.jo_number || '', wo_number:row.wo_number || '', part_number:row.part_number || '', part_revision:row.part_revision || '', machine_id:row.machine_id || '', work_center_id:row.work_center_id || '', operator_id:row.operator_id || '' };
    return '<tr><td><span class="mes-code">' + esc(row.wo_number || '') + '</span><span class="mes-sub">' + esc(row.jo_number || '') + ' · ' + esc(t(statusMeta(row.status).labelVi, statusMeta(row.status).labelEn)) + '</span></td><td><strong>' + esc(row.customer_name || row.customer_id || '—') + '</strong><span class="mes-sub">' + esc([row.part_number || '', row.part_revision || '', row.operation_desc || ''].filter(Boolean).join(' · ')) + '</span></td><td><strong>' + esc(row.machine_id || '—') + '</strong><span class="mes-sub">' + esc([row.machine_name || '', row.work_center_id || '', row.operator_name || row.operator_id || ''].filter(Boolean).join(' · ')) + '</span></td><td>' + statusBadge(row.status || '') + '<span class="mes-sub">' + esc(progress + ' · Scrap ' + Number(row.qty_scrap || 0)) + '</span></td><td><strong>' + esc(fmtDateTime(row.scheduled_start || '')) + '</strong><span class="mes-sub">' + esc(fmtDateTime(row.scheduled_end || '')) + '</span></td><td><div class="mes-row-actions"><button type="button" class="mes-link-btn" data-progress="' + esc(row.wo_number || '') + '">' + esc(t('Báo tiến độ', 'Report progress')) + '</button><button type="button" class="mes-link-btn" data-form="FRM-519" data-context="' + esc(jsonAttr(ctx)) + '">' + esc(t('Mở pre-run', 'Open pre-run')) + '</button><button type="button" class="mes-link-btn warning" data-form="FRM-512" data-context="' + esc(jsonAttr(ctx)) + '">' + esc(t('Form downtime', 'Downtime form')) + '</button></div></td></tr>';
  }).join('') + '</tbody></table></div>';
}
function renderMachineCard(machine){
  var active = machine.active_work_order || {};
  var downtime = machine.open_downtime;
  var maintenance = machine.open_maintenance;
  var context = { wo_number:active.wo_number || '', jo_number:active.jo_number || '', so_number:active.so_number || '', customer_id:active.customer_id || '', part_number:active.part_number || '', part_revision:active.part_revision || '', machine_id:machine.machine_id || '', work_center_id:machine.work_center_id || '', operator_id:active.operator_id || machine.preferred_operator_id || '' };
  return '<article class="mes-machine"><div class="mes-machine-head"><div><h4>' + esc(machine.machine_id || '') + ' · ' + esc(machine.machine_name || '') + '</h4><p>' + esc([machine.work_center_id || '', machine.machine_type || '', machine.location || ''].filter(Boolean).join(' · ')) + '</p></div>' + statusBadge(machine.status || '') + '</div><div class="mes-machine-grid"><div class="mes-cell"><small>' + esc(t('WO hiện tại', 'Active WO')) + '</small><strong>' + esc(active.wo_number || '—') + '</strong></div><div class="mes-cell"><small>' + esc(t('Queue', 'Queue')) + '</small><strong>' + esc(machine.queue_count || 0) + ' ' + esc(t('WO', 'WO')) + '</strong></div><div class="mes-cell"><small>' + esc(t('Operator ưu tiên', 'Preferred operator')) + '</small><strong>' + esc(machine.preferred_operator_name || machine.preferred_operator_id || '—') + '</strong></div><div class="mes-cell"><small>' + esc(t('PM kế tiếp', 'Next PM')) + '</small><strong>' + esc(fmtDate(machine.next_pm_date || '')) + '</strong></div></div>' + (downtime ? '<p class="mes-sub" style="margin-top:12px;color:#b91c1c"><strong>' + esc(t('Downtime mở', 'Open downtime')) + ':</strong> ' + esc((downtime.reason || '').slice(0, 120)) + '</p>' : '') + (maintenance ? '<p class="mes-sub" style="margin-top:8px;color:#b45309"><strong>' + esc(t('Maintenance mở', 'Open maintenance')) + ':</strong> ' + esc(maintenance.title || '') + '</p>' : '') + '<div class="mes-mini-actions" style="margin-top:14px"><button type="button" class="mes-link-btn" data-progress="' + esc(active.wo_number || '') + '"' + (!active.wo_number ? ' disabled' : '') + '>' + esc(t('Báo tiến độ', 'Report progress')) + '</button>' + (downtime ? '<button type="button" class="mes-link-btn warning" data-resolve-downtime="' + esc(downtime.downtime_id || '') + '">' + esc(t('Khôi phục', 'Resolve')) + '</button>' : '<button type="button" class="mes-link-btn warning" data-new-downtime="' + esc(machine.machine_id || '') + '">' + esc(t('Báo dừng máy', 'Log downtime')) + '</button>') + '<button type="button" class="mes-link-btn" data-new-maintenance="' + esc(machine.machine_id || '') + '">' + esc(t('Tạo bảo trì', 'New maintenance')) + '</button><button type="button" class="mes-link-btn" data-form="FRM-521" data-context="' + esc(jsonAttr(context)) + '">' + esc(t('Mở PM form', 'Open PM form')) + '</button></div></article>';
}
function renderDowntimeList(rows){
  if(!rows.length){
    return '<div class="mes-empty"><strong>' + esc(t('Không có downtime mở', 'No open downtime')) + '</strong>' + esc(t('Tất cả máy đang hoạt động hoặc đã được xử lý.', 'All machines are running or already recovered.')) + '</div>';
  }
  return rows.map(function(row){
    var ctx = { wo_number:row.wo_number || '', machine_id:row.machine_id || '', work_center_id:row.work_center_id || '' };
    return '<div class="mes-list-item"><h4>' + esc(row.machine_id || '') + ' · ' + esc(row.machine_name || '') + '</h4><p>' + esc(row.reason || '') + '</p><div class="mes-meta-line">' + esc([row.wo_number || '', row.category || '', row.severity || '', fmtDateTime(row.started_at || '')].filter(Boolean).join(' · ')) + '</div><div class="mes-mini-actions" style="margin-top:10px"><button type="button" class="mes-link-btn warning" data-resolve-downtime="' + esc(row.downtime_id || '') + '">' + esc(t('Khôi phục', 'Resolve')) + '</button><button type="button" class="mes-link-btn" data-form="FRM-512" data-context="' + esc(jsonAttr(ctx)) + '">' + esc(t('Mở form downtime', 'Open downtime form')) + '</button></div></div>';
  }).join('');
}
function renderMaintenanceList(rows){
  if(!rows.length){
    return '<div class="mes-empty"><strong>' + esc(t('Không có maintenance mở', 'No open maintenance')) + '</strong>' + esc(t('Queue bảo trì hiện đang trống.', 'The maintenance queue is currently empty.')) + '</div>';
  }
  return rows.map(function(row){
    var ctx = { machine_id:row.machine_id || '', work_center_id:row.work_center_id || '', wo_number:row.wo_number || '' };
    return '<div class="mes-list-item"><h4>' + esc(row.machine_id || '') + ' · ' + esc(row.title || '') + '</h4><p>' + esc(row.description || '') + '</p><div class="mes-meta-line">' + esc([row.maintenance_type || '', row.priority || '', row.assigned_to || '', row.due_date || ''].filter(Boolean).join(' · ')) + '</div><div class="mes-mini-actions" style="margin-top:10px"><button type="button" class="mes-link-btn" data-maintenance-status="' + esc(row.request_id || '') + ':approved">' + esc(t('Duyệt', 'Approve')) + '</button><button type="button" class="mes-link-btn" data-maintenance-status="' + esc(row.request_id || '') + ':in_progress">' + esc(t('Bắt đầu', 'Start')) + '</button><button type="button" class="mes-link-btn" data-maintenance-status="' + esc(row.request_id || '') + ':completed">' + esc(t('Hoàn tất', 'Complete')) + '</button><button type="button" class="mes-link-btn" data-form="FRM-521" data-context="' + esc(jsonAttr(ctx)) + '">' + esc(t('Mở PM form', 'Open PM form')) + '</button></div></div>';
  }).join('');
}
function renderProgressList(rows){
  if(!rows.length){
    return '<div class="mes-empty"><strong>' + esc(t('Chưa có progress report', 'No progress report yet')) + '</strong>' + esc(t('Shop-floor chưa gửi báo tiến độ nào trong runtime này.', 'No shop-floor progress report has been submitted in this runtime.')) + '</div>';
  }
  return rows.map(function(row){
    return '<div class="mes-list-item"><h4>' + esc(row.wo_number || '') + ' · ' + esc(t(statusMeta(row.status || '').labelVi, statusMeta(row.status || '').labelEn)) + '</h4><p>' + esc(row.note || '') + '</p><div class="mes-meta-line">' + esc([row.machine_id || '', row.operator_id || '', 'OK ' + Number(row.qty_completed || 0), 'Scrap ' + Number(row.qty_scrap || 0), fmtDateTime(row.reported_at || '')].join(' · ')) + '</div></div>';
  }).join('');
}

function render(){
  if(!state.container) return;
  if(state.loading && !state.snapshot){
    state.container.innerHTML = '<div class="mes-wrap"><div class="mes-empty"><strong>' + esc(t('Đang tải trung tâm điều hành MES...', 'Loading the MES control center...')) + '</strong>' + esc(t('Vui lòng đợi trong giây lát.', 'Please wait a moment.')) + '</div></div>';
    return;
  }
  var snapshot = state.snapshot || { kpis:{}, machine_wall:[], dispatch:[], open_downtimes:[], maintenance_queue:[], progress_reports:[], work_center_summary:[] };
  var dispatchRows = filteredDispatch();
  var workCenters = snapshot.work_center_summary || [];
  var exceptionData = state.exceptions || {};
  var statusOptions = ['scheduled','setup','running','inspection','on_hold','completed'];
  state.container.innerHTML = '<div class="mes-wrap">' +
    '<section class="mes-hero">' +
      '<article class="mes-poster">' +
        '<div class="mes-poster-head">' +
          '<div class="mes-brand"><div class="mes-brand-logo"><img src="./assets/hesem-logo.svg" alt="HESEM"></div><div><div class="mes-kicker">HESEM CNC MOM / MES</div><h1>' + esc(t('Trung tâm điều hành MES', 'MES control center')) + '</h1><p>' + esc(t('Điều độ WO, machine wall, downtime, maintenance và exception được gom về một màn hình để trưởng ca và quản lý xưởng ra quyết định nhanh theo ngữ cảnh thật.', 'Dispatch, machine wall, downtime, maintenance, and exceptions are unified in one operating screen so supervisors can react in real production context.')) + '</p><div class="mes-poster-facts"><span class="mes-fact">⏱ ' + esc(currentStamp()) + '</span><span class="mes-fact">🏭 ' + esc(snapshot.kpis.wo_active || 0) + ' ' + esc(t('WO đang hoạt động', 'active WO')) + '</span><span class="mes-fact">🛠 ' + esc(snapshot.kpis.machines_total || 0) + ' ' + esc(t('tài sản đang theo dõi', 'assets tracked')) + '</span></div></div></div>' +
          '<div>' + statusBadge(snapshot.kpis.machines_down ? 'down' : 'running') + '</div>' +
        '</div>' +
        '<div class="mes-poster-actions">' +
          '<button type="button" class="mes-btn primary" id="mes-refresh">⟳ ' + esc(t('Làm mới runtime', 'Refresh runtime')) + '</button>' +
          '<button type="button" class="mes-btn secondary" id="mes-open-orders">📦 ' + esc(t('Mở quản lý đơn hàng', 'Open order management')) + '</button>' +
          '<button type="button" class="mes-btn secondary" id="mes-open-master">🧭 ' + esc(t('Mở master data', 'Open master data')) + '</button>' +
          '<button type="button" class="mes-btn secondary" id="mes-open-forms">📋 ' + esc(t('Mở kiểm soát chứng cứ', 'Open evidence control')) + '</button>' +
        '</div>' +
      '</article>' +
      '<aside class="mes-side">' +
        '<article class="mes-card mes-clock"><div class="mes-clock-top"><div><div class="mes-kicker">' + esc(t('Snapshot runtime', 'Runtime snapshot')) + '</div><strong>' + esc(currentStamp()) + '</strong><small>' + esc(t('Nguồn dữ liệu: Order Management + Master Data + MES runtime + Exception dashboard.', 'Data source: Order Management + Master Data + MES runtime + Exception dashboard.')) + '</small></div>' + statusBadge('approved') + '</div></article>' +
        '<article class="mes-card"><div class="mes-kpi-grid">' +
          renderKpi(t('Máy đang chạy', 'Machines running'), snapshot.kpis.machines_running || 0, t('Bao gồm chạy, setup và inspection', 'Running, setup, and inspection')) +
          renderKpi(t('Máy dừng', 'Machines down'), snapshot.kpis.machines_down || 0, t('Downtime chưa khôi phục', 'Unresolved downtime')) +
          renderKpi(t('Maintenance mở', 'Open maintenance'), snapshot.kpis.maintenance_open || 0, t('Request chưa đóng', 'Open requests')) +
          renderKpi(t('WO quá hạn', 'Overdue WO'), snapshot.kpis.wo_overdue || 0, t('Cần điều độ hoặc escalation', 'Needs dispatching or escalation')) +
        '</div></article>' +
      '</aside>' +
    '</section>' +
    '<section class="mes-summary">' +
      '<article class="mes-panel"><div class="mes-panel-head"><div><h2>' + esc(t('Toàn cảnh work center', 'Work center overview')) + '</h2><p>' + esc(t('Đếm máy, WO và tình trạng theo từng cell để trưởng ca nhìn ra bottleneck ngay.', 'See machines, WO, and status by cell to spot bottlenecks quickly.')) + '</p></div></div><div class="mes-chips">' + (workCenters.length ? workCenters.map(renderWorkCenterChip).join('') : '<div class="mes-empty"><strong>' + esc(t('Chưa có work center', 'No work center data')) + '</strong>' + esc(t('Kiểm tra lại master data hoặc cấu hình runtime.', 'Check the master data or runtime configuration.')) + '</div>') + '</div></article>' +
      '<article class="mes-panel"><div class="mes-panel-head"><div><h2>' + esc(t('Exception cần xử lý', 'Operational exceptions')) + '</h2><p>' + esc(t('Nhấn vào từng nhóm để xem chi tiết và xử lý tận gốc các ngoại lệ ảnh hưởng tới truy xuất, giao hàng và kiểm soát chứng cứ.', 'Click any group to inspect details and resolve the exceptions that affect traceability, delivery, and evidence control.')) + '</p></div></div>' + renderExceptionGrid(exceptionData) + '</article>' +
    '</section>' +
    '<section class="mes-main">' +
      '<article class="mes-panel"><div class="mes-panel-head"><div><h2>' + esc(t('Dispatch board theo Work Order', 'Work Order dispatch board')) + '</h2><p>' + esc(t('Lọc theo work center, trạng thái và tìm nhanh WO để báo tiến độ hoặc mở form chứng cứ đúng ngữ cảnh.', 'Filter by work center and status, then report progress or open the right evidence form with real context.')) + '</p></div></div><div class="mes-toolbar"><input class="mes-input search" id="mes-search" type="search" value="' + esc(state.search) + '" placeholder="' + esc(t('Tìm WO / Part / máy / khách hàng...', 'Search WO / part / machine / customer...')) + '"><select class="mes-select" id="mes-filter-center"><option value="">' + esc(t('Tất cả work center', 'All work centers')) + '</option>' + workCenters.map(function(center){ return '<option value="' + esc(center.work_center_id || '') + '"' + (state.workCenter === center.work_center_id ? ' selected' : '') + '>' + esc(center.work_center_id + ' · ' + center.work_center_name) + '</option>'; }).join('') + '</select><select class="mes-select" id="mes-filter-status"><option value="">' + esc(t('Tất cả trạng thái', 'All statuses')) + '</option>' + statusOptions.map(function(key){ return '<option value="' + esc(key) + '"' + (state.dispatchStatus === key ? ' selected' : '') + '>' + esc(t(statusMeta(key).labelVi, statusMeta(key).labelEn)) + '</option>'; }).join('') + '</select></div>' + renderDispatchTable(dispatchRows) + '</article>' +
      '<div class="mes-stack">' +
        '<article class="mes-panel"><div class="mes-panel-head"><div><h3>' + esc(t('Machine wall', 'Machine wall')) + '</h3><p>' + esc(t('Trạng thái từng máy, queue WO và nút tác vụ nhanh cho downtime / maintenance / form.', 'Per-machine status, WO queue, and quick actions for downtime, maintenance, and forms.')) + '</p></div></div><div class="mes-wall">' + ((snapshot.machine_wall || []).length ? snapshot.machine_wall.map(renderMachineCard).join('') : '<div class="mes-empty"><strong>' + esc(t('Chưa có machine wall', 'No machine wall data')) + '</strong>' + esc(t('Hãy khai báo máy trong master data.', 'Define machines in master data first.')) + '</div>') + '</div></article>' +
        '<article class="mes-panel"><div class="mes-panel-head"><div><h3>' + esc(t('Downtime mở', 'Open downtime')) + '</h3><p>' + esc(t('Theo dõi máy đang dừng và khôi phục theo WO bị ảnh hưởng.', 'Track machines currently down and restore them in the affected WO context.')) + '</p></div></div><div class="mes-list">' + renderDowntimeList(snapshot.open_downtimes || []) + '</div></article>' +
        '<article class="mes-panel"><div class="mes-panel-head"><div><h3>' + esc(t('Hàng đợi bảo trì', 'Maintenance queue')) + '</h3><p>' + esc(t('Quản lý request bảo trì, chuyển trạng thái và mở PM form từ cùng một màn hình.', 'Manage maintenance requests, transition status, and launch PM forms from the same screen.')) + '</p></div></div><div class="mes-list">' + renderMaintenanceList(snapshot.maintenance_queue || []) + '</div></article>' +
        '<article class="mes-panel"><div class="mes-panel-head"><div><h3>' + esc(t('Báo tiến độ gần nhất', 'Recent progress reports')) + '</h3><p>' + esc(t('Nhật ký runtime gần nhất cho shop-floor reporting.', 'Most recent runtime log for shop-floor reporting.')) + '</p></div></div><div class="mes-list">' + renderProgressList(snapshot.progress_reports || []) + '</div></article>' +
      '</div>' +
    '</section>' +
  '</div>';
  bind();
}

function bind(){
  if(!state.container) return;
  var search = document.getElementById('mes-search');
  if(search) search.oninput = function(){ state.search = search.value || ''; render(); };
  var center = document.getElementById('mes-filter-center');
  if(center) center.onchange = function(){ state.workCenter = center.value || ''; render(); };
  var status = document.getElementById('mes-filter-status');
  if(status) status.onchange = function(){ state.dispatchStatus = status.value || ''; render(); };
  var refresh = document.getElementById('mes-refresh');
  if(refresh) refresh.onclick = function(){ loadData(); };
  var openOrders = document.getElementById('mes-open-orders');
  if(openOrders) openOrders.onclick = function(){ if(typeof navigateTo === 'function') navigateTo('orders'); };
  var openMaster = document.getElementById('mes-open-master');
  if(openMaster) openMaster.onclick = function(){ if(typeof window._mdOpenControl === 'function') window._mdOpenControl(); };
  var openForms = document.getElementById('mes-open-forms');
  if(openForms) openForms.onclick = function(){ if(typeof navigateTo === 'function') navigateTo('forms'); };

  Array.prototype.forEach.call(state.container.querySelectorAll('[data-form]'), function(node){ node.onclick = function(){ openEvidenceForm(node.getAttribute('data-form') || '', parseJsonAttr(node.getAttribute('data-context') || '')); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-progress]'), function(node){ node.onclick = function(){ var woNumber = node.getAttribute('data-progress') || ''; if(woNumber) openProgressModal(woNumber); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-new-downtime]'), function(node){ node.onclick = function(){ openDowntimeModal(node.getAttribute('data-new-downtime') || ''); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-resolve-downtime]'), function(node){ node.onclick = function(){ openResolveDowntimeModal(node.getAttribute('data-resolve-downtime') || ''); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-new-maintenance]'), function(node){ node.onclick = function(){ openMaintenanceModal(node.getAttribute('data-new-maintenance') || ''); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-maintenance-status]'), function(node){ node.onclick = function(){ var raw = String(node.getAttribute('data-maintenance-status') || ''); var parts = raw.split(':'); if(parts[0]) openMaintenanceStatusModal(parts[0], parts[1] || ''); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-exception-type]'), function(node){ node.onclick = function(){ openExceptionDetail(node.getAttribute('data-exception-type') || ''); }; });
}

function rowByWo(woNumber){
  var rows = state.snapshot && Array.isArray(state.snapshot.dispatch) ? state.snapshot.dispatch : [];
  return rows.find(function(row){ return String(row.wo_number || '') === String(woNumber || ''); }) || null;
}
function machineById(machineId){
  var rows = state.snapshot && Array.isArray(state.snapshot.machine_wall) ? state.snapshot.machine_wall : [];
  return rows.find(function(row){ return String(row.machine_id || '') === String(machineId || ''); }) || null;
}
function downtimeById(downtimeId){
  var rows = state.snapshot && Array.isArray(state.snapshot.open_downtimes) ? state.snapshot.open_downtimes : [];
  return rows.find(function(row){ return String(row.downtime_id || '') === String(downtimeId || ''); }) || null;
}
function maintenanceById(requestId){
  var rows = state.snapshot && Array.isArray(state.snapshot.maintenance_queue) ? state.snapshot.maintenance_queue : [];
  return rows.find(function(row){ return String(row.request_id || '') === String(requestId || ''); }) || null;
}

function operatorOptions(){
  var rows = state.master && Array.isArray(state.master.operators) ? state.master.operators : [];
  return rows.map(function(item){
    return '<option value="' + esc(item.operator_id || '') + '">' + esc([item.operator_id || '', item.operator_name || '', item.role || ''].filter(Boolean).join(' · ')) + '</option>';
  }).join('');
}

function openProgressModal(woNumber){
  var row = rowByWo(woNumber);
  if(!row){ toast(t('Không tìm thấy WO trong snapshot hiện tại.', 'The work order was not found in the current snapshot.'), 'error'); return; }
  showModal(
    t('Báo tiến độ WO', 'Report WO progress'),
    (row.wo_number || '') + ' · ' + (row.part_number || '') + ' · ' + (row.machine_id || ''),
    '<div class="mes-form-grid">' +
      fieldDisplay(t('Khách hàng', 'Customer'), row.customer_name || row.customer_id || '—') +
      fieldDisplay(t('Work center', 'Work center'), row.work_center_name || row.work_center_id || '—') +
      editableField('mes-progress-status', t('Trạng thái mới', 'New status'), '<select class="mes-select" id="mes-progress-status"><option value="setup"' + (row.status === 'setup' ? ' selected' : '') + '>Setup</option><option value="running"' + (row.status === 'running' ? ' selected' : '') + '>Running</option><option value="inspection"' + (row.status === 'inspection' ? ' selected' : '') + '>Inspection</option><option value="on_hold"' + (row.status === 'on_hold' ? ' selected' : '') + '>On Hold</option><option value="completed"' + (row.status === 'completed' ? ' selected' : '') + '>Completed</option></select>') +
      editableField('mes-progress-operator', t('Người vận hành', 'Operator'), '<select class="mes-select" id="mes-progress-operator"><option value="">' + esc(t('Giữ nguyên', 'Keep current')) + '</option>' + operatorOptions() + '</select>') +
      editableField('mes-progress-ok', t('Số lượng OK', 'Qty completed'), '<input class="mes-input" id="mes-progress-ok" type="number" min="0" value="' + esc(Number(row.qty_completed || 0)) + '">') +
      editableField('mes-progress-scrap', t('Số lượng Scrap', 'Qty scrap'), '<input class="mes-input" id="mes-progress-scrap" type="number" min="0" value="' + esc(Number(row.qty_scrap || 0)) + '">') +
      editableField('mes-progress-setup-min', t('Setup thực tế (phút)', 'Actual setup minutes'), '<input class="mes-input" id="mes-progress-setup-min" type="number" min="0" value="' + esc(Number(row.setup_time_actual || 0)) + '">') +
      editableField('mes-progress-run-min', t('Run thực tế (phút)', 'Actual run minutes'), '<input class="mes-input" id="mes-progress-run-min" type="number" min="0" value="' + esc(Number(row.run_time_actual || 0)) + '">') +
      editableField('mes-progress-note', t('Ghi chú shop-floor', 'Shop-floor note'), '<textarea class="mes-textarea" id="mes-progress-note" placeholder="' + esc(t('Ví dụ: hoàn tất prove-out, đang chuyển qua inspection...', 'Example: prove-out completed, moving to inspection...')) + '"></textarea>', true) +
      '<div class="full mes-modal-foot"><button type="button" class="mes-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mes-btn primary" data-modal-submit>💾 ' + esc(t('Lưu tiến độ', 'Save progress')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_wo_report_progress', {
        wo_number: row.wo_number || '',
        status: (modal.querySelector('#mes-progress-status') || {}).value || row.status,
        operator_id: (modal.querySelector('#mes-progress-operator') || {}).value || row.operator_id || '',
        qty_completed: Number((modal.querySelector('#mes-progress-ok') || {}).value || 0),
        qty_scrap: Number((modal.querySelector('#mes-progress-scrap') || {}).value || 0),
        setup_time_actual: Number((modal.querySelector('#mes-progress-setup-min') || {}).value || 0),
        run_time_actual: Number((modal.querySelector('#mes-progress-run-min') || {}).value || 0),
        note: (modal.querySelector('#mes-progress-note') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'progress_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã cập nhật tiến độ WO.', 'Work-order progress updated.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể cập nhật tiến độ WO.', 'Could not update work-order progress.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openDowntimeModal(machineId){
  var machine = machineById(machineId);
  if(!machine){ toast(t('Không tìm thấy máy trong snapshot hiện tại.', 'The machine was not found in the current snapshot.'), 'error'); return; }
  var active = machine.active_work_order || {};
  showModal(
    t('Ghi nhận downtime', 'Create downtime event'),
    (machine.machine_id || '') + ' · ' + (machine.machine_name || ''),
    '<div class="mes-form-grid">' +
      fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') +
      fieldDisplay(t('WO bị ảnh hưởng', 'Affected WO'), active.wo_number || '—') +
      editableField('mes-dt-category', t('Phân loại', 'Category'), '<select class="mes-select" id="mes-dt-category"><option value="breakdown">Breakdown</option><option value="planned_pm">Planned PM</option><option value="setup">Setup / Changeover</option><option value="material_wait">Material wait</option><option value="quality_hold">Quality hold</option><option value="tool_change">Tool change</option><option value="utility">Utility / power</option><option value="other">Other</option></select>') +
      editableField('mes-dt-severity', t('Mức độ', 'Severity'), '<select class="mes-select" id="mes-dt-severity"><option value="minor">' + esc(t('Nhẹ', 'Minor')) + '</option><option value="major" selected>' + esc(t('Lớn', 'Major')) + '</option><option value="critical">' + esc(t('Nghiêm trọng', 'Critical')) + '</option></select>') +
      editableField('mes-dt-start', t('Bắt đầu dừng', 'Downtime start'), '<input class="mes-input" id="mes-dt-start" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-dt-wo', t('WO liên quan', 'Affected WO'), '<input class="mes-input" id="mes-dt-wo" type="text" value="' + esc(active.wo_number || '') + '" placeholder="' + esc(t('Ví dụ: WO-2026-00001', 'Example: WO-2026-00001')) + '">') +
      editableField('mes-dt-reason', t('Lý do / triệu chứng', 'Reason / symptom'), '<textarea class="mes-textarea" id="mes-dt-reason" placeholder="' + esc(t('Mô tả điều gì đang xảy ra trên máy...', 'Describe what is happening on the machine...')) + '"></textarea>', true) +
      editableField('mes-dt-note', t('Ghi chú thêm', 'Additional note'), '<textarea class="mes-textarea" id="mes-dt-note" placeholder="' + esc(t('Ai đã escalation, có ảnh hưởng giao hàng hay không...', 'Who escalated it, whether delivery is affected, etc.')) + '"></textarea>', true) +
      '<div class="full mes-modal-foot"><button type="button" class="mes-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mes-btn primary" data-modal-submit>🚨 ' + esc(t('Tạo downtime', 'Create downtime')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_downtime_create', {
        machine_id: machine.machine_id || '',
        work_center_id: machine.work_center_id || '',
        wo_number: (modal.querySelector('#mes-dt-wo') || {}).value || '',
        category: (modal.querySelector('#mes-dt-category') || {}).value || 'breakdown',
        severity: (modal.querySelector('#mes-dt-severity') || {}).value || 'major',
        started_at: (modal.querySelector('#mes-dt-start') || {}).value || '',
        reason: (modal.querySelector('#mes-dt-reason') || {}).value || '',
        note: (modal.querySelector('#mes-dt-note') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'downtime_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã tạo sự kiện downtime.', 'Downtime event created.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể tạo downtime.', 'Could not create the downtime event.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openResolveDowntimeModal(downtimeId){
  var row = downtimeById(downtimeId);
  if(!row){ toast(t('Không tìm thấy downtime cần khôi phục.', 'Could not find the downtime event to resolve.'), 'error'); return; }
  showModal(
    t('Khôi phục downtime', 'Resolve downtime'),
    (row.machine_id || '') + ' · ' + (row.wo_number || t('Không có WO', 'No WO')),
    '<div class="mes-form-grid">' +
      fieldDisplay(t('Lý do gốc', 'Root reason'), row.reason || '—') +
      fieldDisplay(t('Bắt đầu dừng', 'Downtime start'), fmtDateTime(row.started_at || '')) +
      editableField('mes-dt-resume', t('Trạng thái WO sau khôi phục', 'WO status after recovery'), '<select class="mes-select" id="mes-dt-resume"><option value="setup">Setup</option><option value="running" selected>Running</option><option value="inspection">Inspection</option><option value="on_hold">On Hold</option></select>') +
      editableField('mes-dt-code', t('Mã khôi phục', 'Resolution code'), '<select class="mes-select" id="mes-dt-code"><option value="resolved">' + esc(t('Đã khôi phục', 'Resolved')) + '</option><option value="temporary_fix">' + esc(t('Khắc phục tạm', 'Temporary fix')) + '</option><option value="awaiting_parts">' + esc(t('Chờ phụ tùng', 'Awaiting parts')) + '</option></select>') +
      editableField('mes-dt-resolved-at', t('Thời điểm khôi phục', 'Resolved at'), '<input class="mes-input" id="mes-dt-resolved-at" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-dt-action', t('Hành động khắc phục', 'Corrective action'), '<textarea class="mes-textarea" id="mes-dt-action" placeholder="' + esc(t('Mô tả hành động khắc phục đã thực hiện...', 'Describe the corrective action applied...')) + '"></textarea>', true) +
      '<div class="full mes-modal-foot"><button type="button" class="mes-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mes-btn primary" data-modal-submit>✅ ' + esc(t('Khôi phục và đóng downtime', 'Resolve and close downtime')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_downtime_resolve', {
        downtime_id: row.downtime_id || '',
        resume_status: (modal.querySelector('#mes-dt-resume') || {}).value || 'running',
        resolution_code: (modal.querySelector('#mes-dt-code') || {}).value || 'resolved',
        resolved_at: (modal.querySelector('#mes-dt-resolved-at') || {}).value || '',
        corrective_action: (modal.querySelector('#mes-dt-action') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'resolve_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã khôi phục downtime.', 'Downtime resolved.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể khôi phục downtime.', 'Could not resolve the downtime event.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openMaintenanceModal(machineId){
  var machine = machineById(machineId);
  if(!machine){ toast(t('Không tìm thấy máy cần tạo bảo trì.', 'Could not find the machine for the maintenance request.'), 'error'); return; }
  showModal(
    t('Tạo yêu cầu bảo trì', 'Create maintenance request'),
    (machine.machine_id || '') + ' · ' + (machine.machine_name || ''),
    '<div class="mes-form-grid">' +
      fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') +
      fieldDisplay(t('PM kế tiếp', 'Next PM'), fmtDate(machine.next_pm_date || '')) +
      editableField('mes-mnt-type', t('Loại bảo trì', 'Maintenance type'), '<select class="mes-select" id="mes-mnt-type"><option value="corrective">' + esc(t('Khắc phục', 'Corrective')) + '</option><option value="preventive">' + esc(t('Phòng ngừa', 'Preventive')) + '</option><option value="inspection">' + esc(t('Kiểm tra', 'Inspection')) + '</option></select>') +
      editableField('mes-mnt-priority', t('Ưu tiên', 'Priority'), '<select class="mes-select" id="mes-mnt-priority"><option value="low">' + esc(t('Thấp', 'Low')) + '</option><option value="medium" selected>' + esc(t('Trung bình', 'Medium')) + '</option><option value="high">' + esc(t('Cao', 'High')) + '</option><option value="critical">' + esc(t('Khẩn cấp', 'Critical')) + '</option></select>') +
      editableField('mes-mnt-title', t('Tiêu đề', 'Title'), '<input class="mes-input" id="mes-mnt-title" type="text" placeholder="' + esc(t('Ví dụ: Rò rỉ coolant trục chính', 'Example: Spindle coolant leak')) + '">', true) +
      editableField('mes-mnt-desc', t('Mô tả công việc', 'Work description'), '<textarea class="mes-textarea" id="mes-mnt-desc" placeholder="' + esc(t('Mô tả rõ triệu chứng, rủi ro và yêu cầu xử lý...', 'Describe the symptom, risk, and requested action...')) + '"></textarea>', true) +
      editableField('mes-mnt-wo', t('WO liên quan', 'Related WO'), '<input class="mes-input" id="mes-mnt-wo" type="text" value="' + esc((machine.active_work_order || {}).wo_number || '') + '" placeholder="' + esc(t('Nếu ảnh hưởng WO cụ thể', 'If this affects a specific WO')) + '">') +
      editableField('mes-mnt-assigned', t('Phân công', 'Assigned to'), '<select class="mes-select" id="mes-mnt-assigned"><option value="">' + esc(t('Chưa phân công', 'Unassigned')) + '</option>' + operatorOptions() + '</select>') +
      editableField('mes-mnt-due', t('Ngày cần xong', 'Due date'), '<input class="mes-input" id="mes-mnt-due" type="date" value="' + esc((machine.next_pm_date || '').slice(0, 10)) + '">') +
      '<div class="full mes-modal-foot"><button type="button" class="mes-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mes-btn primary" data-modal-submit>🛠 ' + esc(t('Tạo request', 'Create request')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_maintenance_create', {
        machine_id: machine.machine_id || '',
        maintenance_type: (modal.querySelector('#mes-mnt-type') || {}).value || 'corrective',
        priority: (modal.querySelector('#mes-mnt-priority') || {}).value || 'medium',
        title: (modal.querySelector('#mes-mnt-title') || {}).value || '',
        description: (modal.querySelector('#mes-mnt-desc') || {}).value || '',
        wo_number: (modal.querySelector('#mes-mnt-wo') || {}).value || '',
        assigned_to: (modal.querySelector('#mes-mnt-assigned') || {}).value || '',
        due_date: (modal.querySelector('#mes-mnt-due') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'maintenance_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã tạo yêu cầu bảo trì.', 'Maintenance request created.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể tạo yêu cầu bảo trì.', 'Could not create the maintenance request.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openMaintenanceStatusModal(requestId, suggestedStatus){
  var row = maintenanceById(requestId);
  if(!row){ toast(t('Không tìm thấy maintenance request.', 'Could not find the maintenance request.'), 'error'); return; }
  showModal(
    t('Cập nhật trạng thái bảo trì', 'Update maintenance status'),
    (row.machine_id || '') + ' · ' + (row.title || ''),
    '<div class="mes-form-grid">' +
      fieldDisplay(t('Request ID', 'Request ID'), row.request_id || '—') +
      fieldDisplay(t('Loại bảo trì', 'Maintenance type'), row.maintenance_type || '—') +
      editableField('mes-mu-status', t('Trạng thái mới', 'New status'), '<select class="mes-select" id="mes-mu-status"><option value="approved"' + (suggestedStatus === 'approved' ? ' selected' : '') + '>' + esc(t('Đã duyệt', 'Approved')) + '</option><option value="in_progress"' + (suggestedStatus === 'in_progress' ? ' selected' : '') + '>' + esc(t('Đang thực hiện', 'In progress')) + '</option><option value="completed"' + (suggestedStatus === 'completed' ? ' selected' : '') + '>' + esc(t('Hoàn tất', 'Completed')) + '</option><option value="cancelled"' + (suggestedStatus === 'cancelled' ? ' selected' : '') + '>' + esc(t('Đã hủy', 'Cancelled')) + '</option></select>') +
      editableField('mes-mu-assigned', t('Phân công', 'Assigned to'), '<select class="mes-select" id="mes-mu-assigned"><option value="">' + esc(t('Giữ nguyên', 'Keep current')) + '</option>' + operatorOptions() + '</select>') +
      editableField('mes-mu-next-pm', t('Ngày PM kế tiếp', 'Next PM date'), '<input class="mes-input" id="mes-mu-next-pm" type="date" value="">') +
      editableField('mes-mu-note', t('Ghi chú kỹ thuật', 'Technical note'), '<textarea class="mes-textarea" id="mes-mu-note" placeholder="' + esc(t('Mô tả xử lý, linh kiện thay thế, rủi ro còn lại...', 'Describe the fix, replaced parts, and remaining risk...')) + '"></textarea>', true) +
      '<div class="full mes-modal-foot"><button type="button" class="mes-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mes-btn primary" data-modal-submit>💾 ' + esc(t('Cập nhật trạng thái', 'Update status')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_maintenance_update_status', {
        request_id: row.request_id || '',
        status: (modal.querySelector('#mes-mu-status') || {}).value || suggestedStatus || 'approved',
        assigned_to: (modal.querySelector('#mes-mu-assigned') || {}).value || '',
        note: (modal.querySelector('#mes-mu-note') || {}).value || '',
        next_pm_date: (modal.querySelector('#mes-mu-next-pm') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'maintenance_update_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã cập nhật trạng thái bảo trì.', 'Maintenance status updated.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể cập nhật trạng thái bảo trì.', 'Could not update the maintenance status.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openExceptionDetail(type){
  if(!type) return;
  api('exception_detail', { type:type, page:1, per_page:25 }, 'GET').then(function(resp){
    var rows = resp && Array.isArray(resp.items) ? resp.items : [];
    var meta = EXCEPTION_META[type] || { labelVi:type, labelEn:type, noteVi:'', noteEn:'' };
    var body = rows.length ? '<table class="mes-detail-table"><thead><tr><th>' + esc(t('Mã', 'ID')) + '</th><th>' + esc(t('Ngày', 'Date')) + '</th><th>' + esc(t('Phụ trách', 'Responsible')) + '</th><th>' + esc(t('Chi tiết', 'Detail')) + '</th></tr></thead><tbody>' + rows.map(function(item){ return '<tr><td class="mes-code">' + esc(item.id || '') + '</td><td>' + esc(item.date || '—') + '</td><td>' + esc(item.responsible || '—') + '</td><td>' + esc(item.detail || '—') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="mes-empty"><strong>' + esc(t('Không có bản ghi exception', 'No exception records')) + '</strong>' + esc(t('Snapshot hiện tại không ghi nhận mục chi tiết nào trong nhóm này.', 'The current snapshot has no detail rows in this exception group.')) + '</div>';
    showModal(t(meta.labelVi, meta.labelEn), t(meta.noteVi, meta.noteEn), body + '<div class="mes-modal-foot"><button type="button" class="mes-btn ghost" data-modal-cancel>↩ ' + esc(t('Đóng', 'Close')) + '</button></div>');
    bindModalButtons();
  }).catch(function(error){
    toast(t('Không thể tải chi tiết exception.', 'Could not load the exception detail.'), 'error');
    if(window.console) console.error(error);
  });
}

window._renderMesControlCenter = function(container){
  state.container = container || document.getElementById('page-mes');
  ensureStyles();
  loadData();
  if(state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(function(){ if(state.container && !state.modal) loadData(); }, 60000);
};

})();
