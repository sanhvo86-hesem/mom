/* ═══════════════════════════════════════════════════
   09b-form-fill-download.js — Evidence Workspace
   HESEM QMS Portal — Unified allocate + fill + download + upload + sign
   ═══════════════════════════════════════════════════ */

(function(){
'use strict';

/* ── Shared refs ── */
var t = function(vi,en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; };
var esc = function(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; };
function api(action,payload,method){
  if(typeof window._ecApi === 'function') return window._ecApi(action,payload,method);
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', 30000);
  var opts = { method: method || 'GET', credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if((method||'GET')!=='GET'){ opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(payload||{}); }
  return fetch('api.php?action='+encodeURIComponent(action),opts).then(function(r){return r.json();});
}
function toast(msg,type){ if(typeof window._ecShowToast==='function') window._ecShowToast(msg,type); }
function user(){
  var u=(typeof currentUser!=='undefined'&&currentUser)?currentUser:{};
  return { username:String(u.username||'').trim(), name:String(u.display_name||u.name||u.username||'').trim(), title:String(u.title||u.role||'').trim(), dept:String(u.dept||'').trim(), signerId:String(u.username||'').trim().toUpperCase() };
}

var DEPARTMENTS = [
  {v:'QA',l:'Đảm bảo chất lượng',e:'Quality Assurance'},
  {v:'PRO',l:'Sản xuất',e:'Production'},
  {v:'ENG',l:'Kỹ thuật',e:'Engineering'},
  {v:'SCM',l:'Chuỗi cung ứng',e:'Supply Chain'},
  {v:'HR',l:'Nhân sự & Đào tạo',e:'HR & Training'},
  {v:'EXE',l:'Ban giám đốc',e:'Executive'},
  {v:'SAL',l:'Kinh doanh',e:'Sales'},
  {v:'WH',l:'Kho vận',e:'Warehouse'},
  {v:'IT',l:'Công nghệ thông tin',e:'IT'},
  {v:'EHS',l:'An toàn & Môi trường',e:'EHS'}
];

var RELATED_RELATIONS = [
  { value:'related', labelVi:'Liên quan', labelEn:'Related' },
  { value:'corrective_for', labelVi:'Khắc phục cho', labelEn:'Corrective for' },
  { value:'caused_by', labelVi:'Phát sinh từ', labelEn:'Caused by' },
  { value:'verifies', labelVi:'Xác minh cho', labelEn:'Verifies' },
  { value:'references', labelVi:'Tham chiếu', labelEn:'References' },
  { value:'supersedes', labelVi:'Thay thế', labelEn:'Supersedes' },
  { value:'training_for', labelVi:'Đào tạo cho', labelEn:'Training for' }
];

/* ── Workspace state ── */
var ws = {
  master: null,
  orders: { sales_orders:[], job_orders:[], work_orders:[] },
  schema: null,
  fieldValues: {},
  signatures: {},
  lookupInstances: {},
  draftKey: '',
  uploadFiles: [],
  allocBusy: false,
  allocDept: '',
  allocNotes: '',
  allocError: null,
  lastFormCode: '',
  checklistCache: {},
  checklistLoading: {},
  relatedCache: {},
  relatedLoading: {},
  relatedSearch: {},
  retentionCache: {},
  retentionLoading: {},
  retentionEditor: {},
  slaCache: {},
  slaLoading: {},
  slaEditor: {},
  draftCleanupDone: false
};

/* ── Data helpers ── */
function ensureMaster(){
  if(ws.master) return Promise.resolve(ws.master);
  if(typeof window._mdEnsureSnapshot==='function') return window._mdEnsureSnapshot(true).then(function(s){ ws.master=s||(typeof window._mdGetSnapshot==='function'?window._mdGetSnapshot():{})||{}; return ws.master; });
  return api('master_data_snapshot',{},'GET').then(function(r){ ws.master=(r&&r.data)?r.data:{}; return ws.master; });
}
function ensureOrders(){
  if(ws.orders.sales_orders.length||ws.orders.job_orders.length||ws.orders.work_orders.length) return Promise.resolve(ws.orders);
  return api('order_hierarchy',{},'GET').then(function(r){ ws.orders=flattenOrders((r&&(r.hierarchy||r.data))||[]); return ws.orders; }).catch(function(){ return ws.orders; });
}
function flattenOrders(list){
  var out={sales_orders:[],job_orders:[],work_orders:[]};
  (list||[]).forEach(function(so){
    out.sales_orders.push({value:so.so_number,label:so.so_number,sub:[so.customer_id||'',so.customer_name||''].filter(Boolean).join(' · '),so_number:so.so_number||'',customer_id:so.customer_id||'',customer_name:so.customer_name||''});
    (so.job_orders||[]).forEach(function(jo){
      out.job_orders.push({value:jo.jo_number,label:jo.jo_number,sub:[jo.part_number||'',jo.part_revision||''].filter(Boolean).join(' · '),so_number:so.so_number||'',jo_number:jo.jo_number||'',customer_id:so.customer_id||'',customer_name:so.customer_name||'',part_number:jo.part_number||'',part_revision:jo.part_revision||''});
      (jo.work_orders||[]).forEach(function(wo){
        out.work_orders.push({value:wo.wo_number,label:wo.wo_number,sub:[wo.operation_desc||'',wo.machine_id||''].filter(Boolean).join(' · '),so_number:so.so_number||'',jo_number:jo.jo_number||'',wo_number:wo.wo_number||'',customer_id:so.customer_id||'',customer_name:so.customer_name||'',part_number:jo.part_number||'',part_revision:jo.part_revision||'',machine_id:wo.machine_id||'',work_center_id:wo.work_center_id||''});
      });
    });
  });
  return out;
}
function loadSchema(code){
  if(!code) return Promise.resolve(null);
  var st=window._ecState||{};
  var form=st.formMap&&st.formMap[code];
  if(form&&form.schema&&form.schema.fields) return Promise.resolve(form.schema);
  return api('form_fill_load_schema',{form_code:code},'GET').then(function(r){
    if(r&&r.ok&&r.schema){ ws.schema=r.schema; if(form) form.schema=r.schema; return r.schema; }
    return null;
  }).catch(function(){ return null; });
}

function detectRecordType(form){
  var st=window._ecState||{};
  var code = String(form && form.form_code || '').trim().toUpperCase();
  var direct = String(
    (form && form.record_type) ||
    (form && form.schema && form.schema.record_type) ||
    (form && form.schema && form.schema.record_context && form.schema.record_context.record_type) ||
    ''
  ).trim().toUpperCase();
  return (st.formToRecordType&&st.formToRecordType[code])||direct||'';
}
function detectDepartment(form){
  var st=window._ecState||{};
  var rt=detectRecordType(form);
  var cfg = (rt&&st.recordTypes&&st.recordTypes[rt]) ? st.recordTypes[rt] : null;
  return cfg ? (cfg.department_owner || cfg.department || '') : '';
}
function departmentLabel(code){
  var key = String(code || '').trim().toUpperCase();
  var match = DEPARTMENTS.find(function(item){ return String(item.v || '').trim().toUpperCase() === key; }) || null;
  return match ? t(match.l, match.e) : key;
}
function selectedAllocation(){
  var st=window._ecState||{};
  var allocation=(st.allocations||[]).find(function(a){ return a.allocation_id===st.selectedAllocationId; })||null;
  if(!allocation && st.selectedAllocationId && window.console && typeof window.console.warn === 'function'){
    window.console.warn('[EvidenceControl] allocation not found for selectedAllocationId:', st.selectedAllocationId);
  }
  return allocation;
}

function activeTraceContext(allocation){
  if(allocation && allocation.master_context) return allocation.master_context;
  if(window._ecState && window._ecState.pendingContext) return window._ecState.pendingContext;
  return {};
}

function traceSummary(ctx){
  ctx = ctx || {};
  var parts = [];
  if(ctx.customer_id) parts.push(ctx.customer_id);
  if(ctx.so_number) parts.push('SO ' + ctx.so_number);
  if(ctx.jo_number) parts.push('JO ' + ctx.jo_number);
  if(ctx.wo_number) parts.push('WO ' + ctx.wo_number);
  if(ctx.part_number || ctx.part_revision) parts.push([ctx.part_number || '', ctx.part_revision || ''].filter(Boolean).join('/'));
  if(ctx.capa_number) parts.push(ctx.capa_number);
  return parts.join(' · ');
}

function renderWorkspaceOverview(form, allocation){
  var rt = detectRecordType(form);
  var st = window._ecState || {};
  var rtCfg = rt ? (st.recordTypes[rt] || {}) : {};
  var ownerDept = departmentLabel(detectDepartment(form) || rtCfg.department_owner || '');
  var modeLabel = form.online === false ? t('Ngoại tuyến', 'Offline') : t('Trực tuyến', 'Online');
  var statusText = allocation ? historyStatusLabel(allocation.status || 'allocated') : t('Sẵn sàng cấp mã', 'Ready to allocate');
  var trace = traceSummary(activeTraceContext(allocation));
  return '<div class="ec-overview">' +
    '<div class="ec-overview-card"><small>' + esc(t('Loại hồ sơ', 'Record type')) + '</small><strong>' + esc(rt ? (rt + ' · ' + (rtCfg.label || rtCfg.label_vi || rt)) : t('Chưa ánh xạ', 'Not mapped')) + '</strong><span>' + esc(t('Form này bám theo loại hồ sơ đã cấu hình trong registry vận hành.', 'This form follows the record-type mapping from the operational registry.')) + '</span></div>' +
    '<div class="ec-overview-card"><small>' + esc(t('Phòng ban sở hữu', 'Owning department')) + '</small><strong>' + esc(ownerDept || '—') + '</strong><span>' + esc(t('Phòng ban mặc định sẽ được đề xuất khi cấp mã, nhưng vẫn có thể đổi theo ca thực tế.', 'The default department is suggested during allocation and can still be adjusted for the actual case.')) + '</span></div>' +
    '<div class="ec-overview-card"><small>' + esc(t('Chế độ thực hiện', 'Execution mode')) + '</small><strong>' + esc(modeLabel) + '</strong><span>' + esc(form.online === false ? t('Cấp mã xong sẽ phát hành gói Excel có kiểm soát để điền và nộp lại.', 'After allocation, the governed Excel package is issued for completion and resubmission.') : t('Cấp mã xong sẽ mở ngay phần điền biểu mẫu, ký số và gửi duyệt.', 'After allocation, the form opens directly for completion, signing, and review.')) + '</span></div>' +
    '<div class="ec-overview-card"><small>' + esc(t('Trạng thái hiện tại', 'Current status')) + '</small><strong>' + esc(statusText) + '</strong><span>' + esc(allocation ? (t('Mã hồ sơ đang chọn: ', 'Selected record: ') + (allocation.record_id || '—')) : (t('Số mã đã cấp cho form này: ', 'Allocations already issued for this form: ') + String((st.allocations || []).length || 0))) + '</span></div>' +
    (trace ? '<div class="ec-overview-trace"><small>' + esc(t('Ngữ cảnh truy xuất đang mang theo', 'Active traceability context')) + '</small><strong>' + esc(trace) + '</strong></div>' : '') +
  '</div>';
}

function renderAllocateError(){
  if(!ws.allocError || !ws.allocError.message) return '';
  return '<div class="ec-inline-alert error"><strong>' + esc(t('Cấp mã chưa thành công', 'Allocation did not complete')) + '</strong><span>' + esc(ws.allocError.message || '') + '</span>' + (ws.allocError.detail ? '<small>' + esc(ws.allocError.detail) + '</small>' : '') + '</div>';
}

/* ── Draft management ── */
function resetWorkspaceForForm(form){
  var code = form && form.form_code ? form.form_code : '';
  if(!code || ws.lastFormCode === code) return;
  ws.lastFormCode = code;
  ws.fieldValues = {};
  ws.signatures = {};
  ws.lookupInstances = {};
  ws.uploadFiles = [];
  ws.draftKey = '';
  ws.allocBusy = false;
  ws.allocDept = '';
  ws.allocNotes = '';
  ws.allocError = null;
}

function checklistStage(allocation){
  var status = String((allocation && allocation.status) || '').toLowerCase();
  return (status === 'in_review' || status === 'approved') ? 'approval' : 'review';
}

function checklistKey(allocation, stage){
  return ((allocation && allocation.allocation_id) || '') + '::' + (stage || 'review');
}

function loadChecklist(allocation, stage){
  if(!allocation || !allocation.allocation_id) return Promise.resolve(null);
  stage = stage || checklistStage(allocation);
  var key = checklistKey(allocation, stage);
  if(ws.checklistCache[key]) return Promise.resolve(ws.checklistCache[key]);
  if(ws.checklistLoading[key]) return ws.checklistLoading[key];
  ws.checklistLoading[key] = api('evidence_checklist', { allocation_id: allocation.allocation_id, stage: stage }, 'GET').then(function(resp){
    if(resp && resp.ok && resp.checklist) ws.checklistCache[key] = resp.checklist;
    return ws.checklistCache[key] || null;
  }).catch(function(){ return null; }).finally(function(){ delete ws.checklistLoading[key]; });
  return ws.checklistLoading[key];
}

function cacheChecklist(allocation, stage, checklist){
  if(!allocation || !allocation.allocation_id || !checklist) return;
  ws.checklistCache[checklistKey(allocation, stage || checklistStage(allocation))] = checklist;
}

function renderChecklist(allocation){
  if(!allocation || !allocation.allocation_id) return '';
  var stage = checklistStage(allocation);
  var key = checklistKey(allocation, stage);
  var checklist = ws.checklistCache[key] || null;
  if(!checklist){
    return '<div class="ec-checklist loading"><div class="ec-checklist-head"><strong>' + esc(t('Danh mục kiểm tra chứng cứ', 'Evidence checklist')) + '</strong><span>' + esc(t('Đang tải...', 'Loading...')) + '</span></div></div>';
  }
  var items = Array.isArray(checklist.items) ? checklist.items : [];
  return '<div class="ec-checklist ' + (checklist.ok ? 'ok' : 'fail') + '">' +
    '<div class="ec-checklist-head"><strong>' + esc(t('Danh mục kiểm tra chứng cứ', 'Evidence checklist')) + '</strong><span>' + esc((checklist.complete_count || 0) + '/' + (checklist.required_count || 0)) + '</span></div>' +
    '<div class="ec-checklist-list">' + items.map(function(item){
      var statusClass = item.required ? (item.ok ? 'ok' : 'miss') : 'skip';
      var detail = t(item.detail_vi || '', item.detail_en || item.detail_vi || '');
      return '<div class="ec-check-item ' + statusClass + '">' +
        '<div class="ec-check-item-title">' + esc(t(item.label_vi || item.label || item.id, item.label_en || item.label || item.id)) + '</div>' +
        (detail ? '<div class="ec-check-item-detail">' + esc(detail) + '</div>' : '') +
      '</div>';
    }).join('') + '</div>' +
  '</div>';
}

function checklistData(allocation){
  if(!allocation || !allocation.allocation_id) return null;
  return ws.checklistCache[checklistKey(allocation, checklistStage(allocation))] || null;
}

function fieldOptionLabel(schema, fieldId, value){
  var fields = schema && Array.isArray(schema.fields) ? schema.fields : [];
  var field = fields.find(function(row){ return row && row.id === fieldId; }) || null;
  var options = field && Array.isArray(field.options) ? field.options : [];
  var match = options.find(function(option){ return option && String(option.value || '') === String(value || ''); }) || null;
  return match ? t(match.label_vi || match.label || value || '—', match.label_en || match.label || value || '—') : (value || '—');
}

function renderCapaEffectivenessCard(form, allocation){
  if(!allocation || detectRecordType(form) !== 'CAPA') return '';
  var checklist = checklistData(allocation);
  if(!checklist){
    return '<div class="ec-checklist loading"><div class="ec-checklist-head"><strong>' + esc(t('Kiểm tra hiệu lực CAPA', 'CAPA effectiveness review')) + '</strong><span>' + esc(t('Đang tải...', 'Loading...')) + '</span></div></div>';
  }
  var items = Array.isArray(checklist.items) ? checklist.items : [];
  var completionItem = items.find(function(item){ return item && item.id === 'capa_action_completion'; }) || null;
  var effectItem = items.find(function(item){ return item && item.id === 'capa_effectiveness_review'; }) || null;
  if(!completionItem && !effectItem) return '';

  var meta = effectItem && effectItem.meta ? effectItem.meta : {};
  var schema = form.schema || ws.schema || {};
  var summary = effectItem
    ? (effectItem.required ? (effectItem.ok ? t('Đạt điều kiện duyệt', 'Ready for approval') : t('Chưa đủ điều kiện duyệt', 'Not ready for approval')) : t('Sẽ được kiểm tra khi duyệt', 'Will be checked during approval'))
    : t('Đang theo dõi', 'Monitoring');
  var tone = effectItem && effectItem.required ? (effectItem.ok ? 'ok' : 'fail') : 'ok';
  var statusText = fieldOptionLabel(schema, 'status', meta.status_value || '');

  return '<div class="ec-checklist ' + tone + '">' +
    '<div class="ec-checklist-head"><strong>' + esc(t('Kiểm tra hiệu lực CAPA', 'CAPA effectiveness review')) + '</strong><span>' + esc(summary) + '</span></div>' +
    '<div class="ec-checklist-list">' +
      '<div class="ec-check-item ' + (completionItem ? (completionItem.required ? (completionItem.ok ? 'ok' : 'miss') : 'skip') : 'skip') + '">' +
        '<div class="ec-check-item-title">' + esc(t('Xác nhận hoàn tất hành động', 'Action completion verification')) + '</div>' +
        '<div class="ec-check-item-detail">' + esc(completionItem ? t(completionItem.detail_vi || '', completionItem.detail_en || '') : t('Chưa có dữ liệu xác nhận hoàn tất.', 'No completion verification data yet.')) + '</div>' +
      '</div>' +
      '<div class="ec-check-item ' + (effectItem ? (effectItem.required ? (effectItem.ok ? 'ok' : 'miss') : 'skip') : 'skip') + '">' +
        '<div class="ec-check-item-title">' + esc(t('Hiệu lực sau thực hiện', 'Post-action effectiveness')) + '</div>' +
        '<div class="ec-check-item-detail">' + esc(effectItem ? t(effectItem.detail_vi || '', effectItem.detail_en || '') : t('Chưa có dữ liệu đánh giá hiệu lực.', 'No effectiveness review data yet.')) + '</div>' +
      '</div>' +
      '<div class="ec-check-item skip">' +
        '<div class="ec-check-item-title">' + esc(t('Tóm tắt CAPA', 'CAPA summary')) + '</div>' +
        '<div class="ec-check-item-detail">' + esc(t('Trạng thái', 'Status')) + ': ' + esc(statusText) + ' · ' + esc(t('Ngày hoàn thành', 'Completion date')) + ': ' + esc(meta.completion_date || '—') + ' · ' + esc(t('Ngày kiểm tra hiệu lực', 'Effectiveness date')) + ': ' + esc(meta.effectiveness_check_date || '—') + '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function relatedState(allocation){
  var key = allocation && allocation.allocation_id ? allocation.allocation_id : '__none__';
  if(!ws.relatedSearch[key]){
    ws.relatedSearch[key] = {
      query: '',
      relation: 'related',
      note: '',
      results: [],
      loading: false,
      error: ''
    };
  }
  return ws.relatedSearch[key];
}

function relatedLinksData(allocation){
  if(!allocation || !allocation.allocation_id) return null;
  return ws.relatedCache[allocation.allocation_id] || null;
}

function loadRelatedRecords(allocation, force){
  if(!allocation || !allocation.allocation_id) return Promise.resolve(null);
  var key = allocation.allocation_id;
  if(!force && ws.relatedCache[key]) return Promise.resolve(ws.relatedCache[key]);
  if(ws.relatedLoading[key]) return ws.relatedLoading[key];
  ws.relatedLoading[key] = api('evidence_link_list', { allocation_id: key }, 'GET').then(function(resp){
    ws.relatedCache[key] = {
      links: resp && resp.ok && Array.isArray(resp.links) ? resp.links : [],
      error: resp && resp.ok ? '' : t('Không thể tải hồ sơ liên quan.', 'Could not load related records.')
    };
    return ws.relatedCache[key];
  }).catch(function(){
    ws.relatedCache[key] = {
      links: [],
      error: t('Không thể tải hồ sơ liên quan.', 'Could not load related records.')
    };
    return ws.relatedCache[key];
  }).finally(function(){
    delete ws.relatedLoading[key];
  });
  return ws.relatedLoading[key];
}

function relatedTraceSummary(ctx){
  ctx = ctx || {};
  var parts = [];
  if(ctx.customer_id) parts.push(ctx.customer_id);
  if(ctx.so_number) parts.push(ctx.so_number);
  if(ctx.jo_number) parts.push(ctx.jo_number);
  if(ctx.wo_number) parts.push(ctx.wo_number);
  if(ctx.part_number || ctx.part_revision) parts.push([ctx.part_number || '', ctx.part_revision || ''].filter(Boolean).join('/'));
  if(ctx.capa_number) parts.push(ctx.capa_number);
  return parts.join(' · ');
}

function renderRelatedRecords(allocation){
  if(!allocation || !allocation.allocation_id) return '';
  var data = relatedLinksData(allocation);
  var state = relatedState(allocation);

  var linksHtml = '';
  if(!data){
    linksHtml = '<div class="ec-related-empty">' + esc(t('Đang tải hồ sơ liên quan...', 'Loading related records...')) + '</div>';
  } else if(data.error){
    linksHtml = '<div class="ec-inline-alert">' + esc(data.error) + '</div>';
  } else if(Array.isArray(data.links) && data.links.length){
    linksHtml = data.links.map(function(link){
      var counterpart = link.counterpart || {};
      var recordId = counterpart.record_id || '—';
      var title = counterpart.form_title_vi || counterpart.form_code || counterpart.record_type || recordId;
      var trace = relatedTraceSummary(counterpart.master_context || {});
      return '<div class="ec-related-item">' +
        '<div class="ec-related-top">' +
          '<div>' +
            '<div class="ec-related-id">' + esc(recordId) + '</div>' +
            '<div class="ec-related-title">' + esc(title) + '</div>' +
          '</div>' +
          '<span class="ec-badge info">' + esc(t(link.relation_label_vi || '', link.relation_label_en || '')) + '</span>' +
        '</div>' +
        '<div class="ec-related-meta">' +
          '<span>' + esc(counterpart.form_code || '—') + '</span>' +
          '<span>' + esc(counterpart.status || '—') + '</span>' +
          (trace ? '<span>' + esc(trace) + '</span>' : '') +
        '</div>' +
        (link.notes ? '<div class="ec-related-note">' + esc(link.notes) + '</div>' : '') +
        '<div class="ec-related-actions">' +
          '<button type="button" class="ec-btn secondary" data-related-open="' + esc(counterpart.allocation_id || '') + '" data-related-form="' + esc(counterpart.form_code || '') + '">' + esc(t('Mở hồ sơ', 'Open record')) + '</button>' +
          '<button type="button" class="ec-btn ghost" data-related-remove="' + esc(link.link_id || '') + '">' + esc(t('Gỡ liên kết', 'Remove link')) + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } else {
    linksHtml = '<div class="ec-related-empty">' + esc(t('Chưa có hồ sơ liên quan. Hãy tìm mã hồ sơ để liên kết 2 chiều cho truy xuất audit.', 'No related records yet. Search a record ID below to create a bidirectional link.')) + '</div>';
  }

  var resultsHtml = '';
  if(state.loading){
    resultsHtml = '<div class="ec-related-empty">' + esc(t('Đang tìm hồ sơ...', 'Searching records...')) + '</div>';
  } else if(state.error){
    resultsHtml = '<div class="ec-inline-alert">' + esc(state.error) + '</div>';
  } else if(Array.isArray(state.results) && state.results.length){
    resultsHtml = '<div class="ec-related-results">' + state.results.map(function(item){
      var trace = relatedTraceSummary(item.master_context || {});
      return '<div class="ec-related-item result">' +
        '<div class="ec-related-top">' +
          '<div>' +
            '<div class="ec-related-id">' + esc(item.record_id || '—') + '</div>' +
            '<div class="ec-related-title">' + esc(item.form_code || item.record_type || '') + '</div>' +
          '</div>' +
          '<span class="ec-badge warn">' + esc(item.status || '—') + '</span>' +
        '</div>' +
        '<div class="ec-related-meta">' +
          '<span>' + esc(item.department || '—') + '</span>' +
          (trace ? '<span>' + esc(trace) + '</span>' : '') +
        '</div>' +
        '<div class="ec-related-actions">' +
          '<button type="button" class="ec-btn primary" data-related-add="' + esc(item.allocation_id || '') + '">' + esc(t('Liên kết hồ sơ này', 'Link this record')) + '</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  return '<section class="ec-related">' +
    '<div class="ec-related-head">' +
      '<div><strong>' + esc(t('Hồ sơ liên quan', 'Related records')) + '</strong><p>' + esc(t('Thiết lập liên kết 2 chiều giữa NCR, CAPA, đào tạo, audit và các hồ sơ liên đới khác.', 'Create bidirectional links between NCR, CAPA, training, audit, and other related records.')) + '</p></div>' +
      '<button type="button" class="ec-btn ghost" id="ec-related-refresh">' + esc(t('Làm mới', 'Refresh')) + '</button>' +
    '</div>' +
    '<div class="ec-related-list">' + linksHtml + '</div>' +
    '<div class="ec-related-builder">' +
      '<div class="ec-related-grid">' +
        '<div><label class="ec-label" for="ec-related-query">' + esc(t('Tìm mã hồ sơ', 'Search record ID')) + '</label><input class="ec-input" id="ec-related-query" type="text" value="' + esc(state.query || '') + '" placeholder="' + esc(t('Ví dụ: NCR-2026-001 hoặc CAPA', 'Example: NCR-2026-001 or CAPA')) + '"></div>' +
        '<div><label class="ec-label" for="ec-related-relation">' + esc(t('Quan hệ', 'Relation')) + '</label><select class="ec-select" id="ec-related-relation">' + RELATED_RELATIONS.map(function(option){
          return '<option value="' + esc(option.value) + '"' + (option.value === state.relation ? ' selected' : '') + '>' + esc(t(option.labelVi, option.labelEn)) + '</option>';
        }).join('') + '</select></div>' +
        '<div><label class="ec-label" for="ec-related-note">' + esc(t('Ghi chú liên kết', 'Link note')) + '</label><input class="ec-input" id="ec-related-note" type="text" value="' + esc(state.note || '') + '" placeholder="' + esc(t('Tùy chọn', 'Optional')) + '"></div>' +
      '</div>' +
      '<div class="ec-related-builder-actions">' +
        '<button type="button" class="ec-btn secondary" id="ec-related-search">' + esc(t('Tìm hồ sơ', 'Search records')) + '</button>' +
      '</div>' +
      (resultsHtml || '') +
    '</div>' +
  '</section>';
}

function retentionEditorState(allocation){
  var key = allocation && allocation.allocation_id ? allocation.allocation_id : '__none__';
  if(!ws.retentionEditor[key]){
    ws.retentionEditor[key] = {
      years: 5,
      trigger: 'approved',
      disposition: 'review_before_disposal'
    };
  }
  return ws.retentionEditor[key];
}

function retentionData(allocation){
  if(!allocation || !allocation.allocation_id) return null;
  return ws.retentionCache[allocation.allocation_id] || null;
}

function slaEditorState(allocation){
  var key = allocation && allocation.allocation_id ? allocation.allocation_id : '__none__';
  if(!ws.slaEditor[key]){
    ws.slaEditor[key] = {
      reviewHours: 72,
      warnHours: 12,
      escalateHours: 24,
      escalationRoles: ''
    };
  }
  return ws.slaEditor[key];
}

function slaData(allocation){
  if(!allocation || !allocation.allocation_id) return null;
  return ws.slaCache[allocation.allocation_id] || null;
}

function formatLocalDateTime(value, includeTime){
  if(!value) return '—';
  try{
    var locale = (typeof lang !== 'undefined' && lang === 'en') ? 'en-US' : 'vi-VN';
    var options = includeTime === false ? { dateStyle:'medium' } : { dateStyle:'medium', timeStyle:'short' };
    return new Intl.DateTimeFormat(locale, options).format(new Date(value));
  }catch(_err){
    return String(value || '—');
  }
}

function formatHourSpan(hours){
  hours = Number(hours);
  if(!isFinite(hours)) return '—';
  var abs = Math.abs(hours);
  if(abs >= 24){
    var days = Math.round((abs / 24) * 10) / 10;
    return String(days).replace(/\.0$/, '') + ' ' + t('ngày', 'days');
  }
  return Math.round(abs) + ' ' + t('giờ', 'hours');
}

function formatRoleList(roles){
  if(!Array.isArray(roles) || !roles.length) return '—';
  return roles.map(function(role){
    return String(role || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function(ch){ return ch.toUpperCase(); });
  }).join(', ');
}

function reviewSlaStatusMeta(reviewSla){
  var state = String(reviewSla && reviewSla.state || '').toLowerCase();
  if(state === 'escalated') return { tone:'fail', label:t('Đã leo cấp', 'Escalated') };
  if(state === 'overdue') return { tone:'fail', label:t('Quá hạn SLA', 'SLA overdue') };
  if(state === 'due_soon') return { tone:'warn', label:t('Sắp đến hạn', 'Due soon') };
  if(state === 'closed_after_escalation') return { tone:'fail', label:t('Đóng sau leo cấp', 'Closed after escalation') };
  if(state === 'closed_late') return { tone:'warn', label:t('Đóng trễ SLA', 'Closed late') };
  if(state === 'closed_on_time') return { tone:'pass', label:t('Đóng trong SLA', 'Closed in SLA') };
  if(state === 'not_started') return { tone:'info', label:t('Chưa bắt đầu SLA', 'SLA not started') };
  return { tone:'pass', label:t('Đang trong SLA', 'Within SLA') };
}

function loadSlaStatus(allocation, force){
  if(!allocation || !allocation.allocation_id) return Promise.resolve(null);
  var key = allocation.allocation_id;
  if(!force && ws.slaCache[key]) return Promise.resolve(ws.slaCache[key]);
  if(ws.slaLoading[key]) return ws.slaLoading[key];
  ws.slaLoading[key] = api('evidence_sla_status', { allocation_id:key }, 'GET').then(function(resp){
    var cached = {
      reviewSla: resp && resp.ok ? (resp.review_sla || null) : null,
      currentPolicy: resp && resp.ok ? (resp.current_policy || null) : null,
      canManage: !!(resp && resp.can_manage),
      error: resp && resp.ok ? '' : t('Không thể tải trạng thái SLA duyệt.', 'Could not load review SLA status.')
    };
    ws.slaCache[key] = cached;
    var editor = slaEditorState(allocation);
    var policy = cached.currentPolicy || (cached.reviewSla && cached.reviewSla.policy_snapshot) || {};
    editor.reviewHours = Number(policy.review_hours || 72) || 72;
    editor.warnHours = Number(policy.warn_hours_before_due || 12) || 12;
    editor.escalateHours = Number(policy.escalate_hours_after_due || 24) || 24;
    editor.escalationRoles = Array.isArray(policy.escalation_roles) ? policy.escalation_roles.join(', ') : '';
    return cached;
  }).catch(function(){
    ws.slaCache[key] = {
      reviewSla: null,
      currentPolicy: null,
      canManage: false,
      error: t('Không thể tải trạng thái SLA duyệt.', 'Could not load review SLA status.')
    };
    return ws.slaCache[key];
  }).finally(function(){
    delete ws.slaLoading[key];
  });
  return ws.slaLoading[key];
}

function retentionTriggerLabel(trigger){
  var map = {
    approved: t('Ngày phê duyệt', 'Approval date'),
    received: t('Ngày tiếp nhận', 'Receipt date'),
    submitted: t('Ngày nộp', 'Submission date'),
    created: t('Ngày tạo', 'Created date'),
    updated: t('Ngày cập nhật', 'Updated date')
  };
  return map[String(trigger || '').toLowerCase()] || String(trigger || '—');
}

function retentionDispositionLabel(action){
  var map = {
    review_before_disposal: t('Xem xét trước khi tiêu hủy', 'Review before disposal'),
    archive_only: t('Chỉ lưu archive, không tiêu hủy tự động', 'Archive only')
  };
  return map[String(action || '').toLowerCase()] || String(action || '—');
}

function retentionStatusMeta(retention){
  var state = String(retention && retention.state || '').toLowerCase();
  if(state === 'on_hold') return { tone:'info', label:t('Đang legal hold', 'On legal hold') };
  if(state === 'due_for_disposition') return { tone:'fail', label:t('Đến hạn xử lý', 'Due for disposition') };
  if(state === 'due_soon') return { tone:'warn', label:t('Sắp đến hạn', 'Due soon') };
  return { tone:'pass', label:t('Đang lưu giữ', 'Active retention') };
}

function loadRetentionStatus(allocation, force){
  if(!allocation || !allocation.allocation_id) return Promise.resolve(null);
  var key = allocation.allocation_id;
  if(!force && ws.retentionCache[key]) return Promise.resolve(ws.retentionCache[key]);
  if(ws.retentionLoading[key]) return ws.retentionLoading[key];
  ws.retentionLoading[key] = api('evidence_retention_status', { allocation_id:key }, 'GET').then(function(resp){
    var cached = {
      retention: resp && resp.ok ? (resp.retention || null) : null,
      canManage: !!(resp && resp.can_manage),
      error: resp && resp.ok ? '' : t('Không thể tải trạng thái lưu giữ.', 'Could not load retention status.')
    };
    ws.retentionCache[key] = cached;
    if(cached.retention && cached.retention.policy){
      var editor = retentionEditorState(allocation);
      editor.years = Number(cached.retention.policy.retention_years || 5) || 5;
      editor.trigger = cached.retention.policy.retention_trigger || 'approved';
      editor.disposition = cached.retention.policy.disposition_action || 'review_before_disposal';
    }
    return cached;
  }).catch(function(){
    ws.retentionCache[key] = {
      retention: null,
      canManage: false,
      error: t('Không thể tải trạng thái lưu giữ.', 'Could not load retention status.')
    };
    return ws.retentionCache[key];
  }).finally(function(){
    delete ws.retentionLoading[key];
  });
  return ws.retentionLoading[key];
}

function renderRetentionCard(form, allocation){
  void form;
  if(!allocation || !allocation.allocation_id) return '';
  var data = retentionData(allocation);
  if(!data){
    return '<section class="ec-retention"><div class="ec-retention-head"><strong>' + esc(t('Lưu giữ hồ sơ', 'Record retention')) + '</strong><span>' + esc(t('Đang tải...', 'Loading...')) + '</span></div></section>';
  }
  if(data.error){
    return '<section class="ec-retention"><div class="ec-retention-head"><strong>' + esc(t('Lưu giữ hồ sơ', 'Record retention')) + '</strong></div><div class="ec-inline-alert">' + esc(data.error) + '</div></section>';
  }

  var retention = data.retention || {};
  var policy = retention.policy || {};
  var editor = retentionEditorState(allocation);
  var meta = retentionStatusMeta(retention);
  var daysRemaining = retention.days_remaining;
  var daysText = daysRemaining === null || daysRemaining === undefined
    ? '—'
    : (daysRemaining >= 0 ? (daysRemaining + ' ' + t('ngày', 'days')) : (Math.abs(daysRemaining) + ' ' + t('ngày quá hạn', 'days overdue')));

  return '<section class="ec-retention">' +
    '<div class="ec-retention-head">' +
      '<div><strong>' + esc(t('Lưu giữ hồ sơ', 'Record retention')) + '</strong><p>' + esc(t('Chính sách lưu giữ và legal hold của hồ sơ này được áp dụng theo loại hồ sơ.', 'Retention policy and legal hold for this record are applied by record type.')) + '</p></div>' +
      '<span class="ec-badge ' + meta.tone + '">' + esc(meta.label) + '</span>' +
    '</div>' +
    '<div class="ec-retention-grid">' +
      '<div class="ec-retention-cell"><small>' + esc(t('Loại hồ sơ', 'Record type')) + '</small><strong>' + esc(retention.record_type || allocation.record_type || '—') + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Thời hạn lưu giữ', 'Retention period')) + '</small><strong>' + esc((policy.retention_years || 0) + ' ' + t('năm', 'years')) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Mốc bắt đầu', 'Trigger event')) + '</small><strong>' + esc(retentionTriggerLabel(policy.retention_trigger || 'approved')) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Bắt đầu tính từ', 'Retention start')) + '</small><strong>' + esc(formatLocalDateTime(retention.start_at, false)) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Đến hạn xử lý', 'Disposition due')) + '</small><strong>' + esc(formatLocalDateTime(retention.due_at, false)) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Khoảng còn lại', 'Time remaining')) + '</small><strong>' + esc(daysText) + '</strong></div>' +
      '<div class="ec-retention-cell full"><small>' + esc(t('Hướng xử lý', 'Disposition path')) + '</small><strong>' + esc(retentionDispositionLabel(policy.disposition_action || 'review_before_disposal')) + '</strong></div>' +
      '<div class="ec-retention-cell full"><small>' + esc(t('Legal hold', 'Legal hold')) + '</small><strong>' + esc(retention.legal_hold && retention.legal_hold.active ? t('Đang giữ: ', 'On hold: ') + (retention.legal_hold.reason || '—') : t('Không có legal hold đang hoạt động', 'No active legal hold')) + '</strong></div>' +
    '</div>' +
    (data.canManage ? '<div class="ec-retention-editor">' +
      '<div class="ec-retention-grid editor">' +
        '<div><label class="ec-label" for="ec-retention-years">' + esc(t('Số năm lưu giữ', 'Retention years')) + '</label><input class="ec-input" id="ec-retention-years" type="number" min="1" max="50" value="' + esc(editor.years) + '"></div>' +
        '<div><label class="ec-label" for="ec-retention-trigger">' + esc(t('Mốc bắt đầu tính', 'Retention trigger')) + '</label><select class="ec-select" id="ec-retention-trigger">' +
          ['approved','received','submitted','created','updated'].map(function(option){
            return '<option value="' + esc(option) + '"' + (editor.trigger === option ? ' selected' : '') + '>' + esc(retentionTriggerLabel(option)) + '</option>';
          }).join('') +
        '</select></div>' +
        '<div><label class="ec-label" for="ec-retention-disposition">' + esc(t('Hướng xử lý', 'Disposition path')) + '</label><select class="ec-select" id="ec-retention-disposition">' +
          ['review_before_disposal','archive_only'].map(function(option){
            return '<option value="' + esc(option) + '"' + (editor.disposition === option ? ' selected' : '') + '>' + esc(retentionDispositionLabel(option)) + '</option>';
          }).join('') +
        '</select></div>' +
      '</div>' +
      '<div class="ec-retention-actions">' +
        '<button type="button" class="ec-btn secondary" id="ec-retention-save">' + esc(t('Lưu chính sách', 'Save policy')) + '</button>' +
        '<button type="button" class="ec-btn ghost" id="ec-retention-hold" data-hold-action="' + esc(retention.legal_hold && retention.legal_hold.active ? 'release' : 'set') + '">' + esc(retention.legal_hold && retention.legal_hold.active ? t('Gỡ legal hold', 'Release legal hold') : t('Đặt legal hold', 'Set legal hold')) + '</button>' +
      '</div>' +
    '</div>' : '') +
  '</section>';
}

function renderSlaCard(form, allocation){
  void form;
  if(!allocation || !allocation.allocation_id) return '';
  var data = slaData(allocation);
  if(!data){
    return '<section class="ec-retention ec-sla"><div class="ec-retention-head"><strong>' + esc(t('SLA duyệt hồ sơ', 'Review SLA')) + '</strong><span>' + esc(t('Đang tải...', 'Loading...')) + '</span></div></section>';
  }
  if(data.error){
    return '<section class="ec-retention ec-sla"><div class="ec-retention-head"><strong>' + esc(t('SLA duyệt hồ sơ', 'Review SLA')) + '</strong></div><div class="ec-inline-alert">' + esc(data.error) + '</div></section>';
  }

  var reviewSla = data.reviewSla || {};
  var appliedPolicy = reviewSla.policy_snapshot || data.currentPolicy || {};
  var editor = slaEditorState(allocation);
  var meta = reviewSlaStatusMeta(reviewSla);
  var remainingText = '—';
  if(reviewSla.state === 'overdue' || reviewSla.state === 'escalated' || reviewSla.state === 'closed_late' || reviewSla.state === 'closed_after_escalation'){
    remainingText = formatHourSpan(reviewSla.overdue_hours != null ? reviewSla.overdue_hours : reviewSla.remaining_hours) + ' ' + t('quá hạn', 'overdue');
  } else if(reviewSla.state === 'not_started'){
    remainingText = t('Sẽ bắt đầu khi gửi duyệt', 'Starts when submitted for review');
  } else if(reviewSla.remaining_hours !== null && reviewSla.remaining_hours !== undefined){
    remainingText = formatHourSpan(reviewSla.remaining_hours) + ' ' + t('còn lại', 'remaining');
  }
  var escalationText = reviewSla.state === 'escalated' || reviewSla.state === 'closed_after_escalation'
    ? t('Đã vượt mốc leo cấp', 'Escalation threshold reached')
    : (reviewSla.hours_to_escalation !== null && reviewSla.hours_to_escalation !== undefined && isFinite(Number(reviewSla.hours_to_escalation))
      ? (Number(reviewSla.hours_to_escalation) > 0
        ? formatHourSpan(reviewSla.hours_to_escalation) + ' ' + t('nữa sẽ leo cấp', 'until escalation')
        : t('Đã vượt mốc leo cấp', 'Escalation threshold reached'))
      : '—');
  var note = reviewSla.started_at
    ? t('Chu kỳ SLA này đã được chốt tại thời điểm gửi duyệt để bảo toàn dấu vết audit.', 'This SLA cycle was snapshotted when the record entered review.')
    : t('Chính sách hiện tại sẽ được chụp lại khi hồ sơ được gửi duyệt.', 'The current policy will be snapshotted when the record enters review.');

  return '<section class="ec-retention ec-sla">' +
    '<div class="ec-retention-head">' +
      '<div><strong>' + esc(t('SLA duyệt hồ sơ', 'Review SLA')) + '</strong><p>' + esc(note) + '</p></div>' +
      '<span class="ec-badge ' + meta.tone + '">' + esc(meta.label) + '</span>' +
    '</div>' +
    '<div class="ec-retention-grid">' +
      '<div class="ec-retention-cell"><small>' + esc(t('Loại hồ sơ', 'Record type')) + '</small><strong>' + esc(reviewSla.record_type || allocation.record_type || '—') + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Chu kỳ duyệt', 'Review window')) + '</small><strong>' + esc(formatHourSpan(appliedPolicy.review_hours || 0)) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Cảnh báo trước hạn', 'Warning before due')) + '</small><strong>' + esc(formatHourSpan(appliedPolicy.warn_hours_before_due || 0)) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Bắt đầu theo dõi', 'Review started')) + '</small><strong>' + esc(formatLocalDateTime(reviewSla.started_at, false)) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Hạn duyệt', 'Review due')) + '</small><strong>' + esc(formatLocalDateTime(reviewSla.due_at, false)) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Khoảng còn lại', 'Time remaining')) + '</small><strong>' + esc(remainingText) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Mốc leo cấp', 'Escalation point')) + '</small><strong>' + esc(formatLocalDateTime(reviewSla.escalation_due_at, false)) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Khoảng đến leo cấp', 'Time to escalation')) + '</small><strong>' + esc(escalationText) + '</strong></div>' +
      '<div class="ec-retention-cell"><small>' + esc(t('Đích leo cấp', 'Escalation roles')) + '</small><strong>' + esc(formatRoleList(appliedPolicy.escalation_roles || [])) + '</strong></div>' +
    '</div>' +
    (data.canManage ? '<div class="ec-retention-editor">' +
      '<div class="ec-retention-grid editor">' +
        '<div><label class="ec-label" for="ec-sla-review-hours">' + esc(t('Số giờ duyệt', 'Review hours')) + '</label><input class="ec-input" id="ec-sla-review-hours" type="number" min="1" max="240" value="' + esc(editor.reviewHours) + '"></div>' +
        '<div><label class="ec-label" for="ec-sla-warn-hours">' + esc(t('Cảnh báo trước hạn (giờ)', 'Warn before due (hours)')) + '</label><input class="ec-input" id="ec-sla-warn-hours" type="number" min="1" max="240" value="' + esc(editor.warnHours) + '"></div>' +
        '<div><label class="ec-label" for="ec-sla-escalate-hours">' + esc(t('Leo cấp sau quá hạn (giờ)', 'Escalate after due (hours)')) + '</label><input class="ec-input" id="ec-sla-escalate-hours" type="number" min="1" max="240" value="' + esc(editor.escalateHours) + '"></div>' +
        '<div class="ec-retention-cell full ec-sla-note"><small>' + esc(t('Vai trò nhận leo cấp', 'Escalation roles')) + '</small><strong>' + esc(t('Danh sách cách nhau bằng dấu phẩy. Thay đổi này áp dụng cho các chu kỳ duyệt mới của loại hồ sơ này.', 'Use comma-separated roles. Changes apply to new review cycles for this record type.')) + '</strong></div>' +
        '<div class="ec-retention-cell full"><label class="ec-label" for="ec-sla-roles">' + esc(t('Vai trò leo cấp', 'Escalation roles')) + '</label><input class="ec-input" id="ec-sla-roles" type="text" value="' + esc(editor.escalationRoles) + '" placeholder="' + esc(t('Ví dụ: qa_manager, engineering_manager', 'Example: qa_manager, engineering_manager')) + '"></div>' +
      '</div>' +
      '<div class="ec-retention-actions">' +
        '<button type="button" class="ec-btn secondary" id="ec-sla-save">' + esc(t('Lưu chính sách SLA', 'Save SLA policy')) + '</button>' +
      '</div>' +
    '</div>' : '') +
  '</section>';
}

function renderEvidenceActions(allocation){
  if(!allocation || !allocation.allocation_id) return '';
  return '<div class="ec-actions"><button class="ec-btn ghost" id="ec-export-pack">' + esc(t('Xuất bộ chứng cứ', 'Export evidence pack')) + '</button></div>';
}

function historyStatusLabel(status){
  var key = String(status || '').trim().toLowerCase();
  var labels = {
    allocated: t('Đã cấp mã', 'Allocated'),
    downloaded: t('Đã tải biểu mẫu', 'Downloaded'),
    submitted: t('Đã nộp', 'Submitted'),
    received: t('Đã tiếp nhận', 'Received'),
    in_review: t('Đang xem xét', 'In review'),
    approved: t('Đã phê duyệt', 'Approved'),
    rejected: t('Bị từ chối', 'Rejected'),
    voided: t('Đã hủy', 'Voided'),
    void: t('Đã hủy', 'Voided')
  };
  return labels[key] || String(status || '-');
}

function renderHistoryStatusBadge(status){
  var key = String(status || '').trim().toLowerCase();
  var tone = key === 'approved' ? 'pass' : (key === 'rejected' || key === 'voided' || key === 'void' ? 'fail' : (key === 'submitted' || key === 'received' || key === 'in_review' ? 'warn' : 'info'));
  return '<span class="ec-badge ' + tone + '">' + esc(historyStatusLabel(status)) + '</span>';
}

function isLockedContextField(fieldId, allocation){
  var ctx = allocation && allocation.master_context ? allocation.master_context : null;
  if(!ctx) return false;
  return Object.prototype.hasOwnProperty.call(ctx, fieldId) && ctx[fieldId] !== '' && ctx[fieldId] !== null && ctx[fieldId] !== undefined;
}

function isRecordReadOnly(allocation){
  if(!allocation) return false;
  var status = String(allocation.status || '').trim().toLowerCase();
  if((allocation.online_submission && allocation.online_submission.entry_id) || (allocation.online_submission && allocation.online_submission.submitted_at)) return true;
  return ['submitted','received','in_review','approved','rejected'].indexOf(status) >= 0;
}

function draftKey(form,alloc){ return 'qms_ec_'+((form&&form.form_code)||'')+'_'+((alloc&&alloc.allocation_id)||''); }
function loadDraftLegacy(form,alloc){
  var key=draftKey(form,alloc);
  if(ws.draftKey===key) return;
  ws.draftKey=key; ws.fieldValues={}; ws.signatures={};
  try{ var raw=localStorage.getItem(key); if(raw){ var p=JSON.parse(raw); ws.fieldValues=p.fieldValues||{}; ws.signatures=p.signatures||{}; } }catch(e){}
  hydrateFromAlloc(alloc);
}
function saveDraftLegacy(form,alloc){
  try{ localStorage.setItem(draftKey(form,alloc),JSON.stringify({fieldValues:ws.fieldValues,signatures:ws.signatures})); toast(t('Đã lưu nháp.','Draft saved.'),'success'); }catch(e){}
  saveDraftToServer(form, alloc);
}
function clearDraft(form,alloc){ try{localStorage.removeItem(draftKey(form,alloc));}catch(e){} }
function hydrateFromAlloc(alloc){
  if(!alloc) return;
  var ctx=alloc.master_context||{};
  ['customer_id','supplier_id','so_number','jo_number','wo_number','part_number','part_revision','capa_number'].forEach(function(k){ if(!ws.fieldValues[k]&&ctx[k]) ws.fieldValues[k]=ctx[k]; });
}

function purgeOldDrafts(){
  if(ws.draftCleanupDone || typeof localStorage === 'undefined') return;
  ws.draftCleanupDone = true;
  var now = Date.now();
  var maxAge = 45 * 24 * 60 * 60 * 1000;
  try {
    for(var i = localStorage.length - 1; i >= 0; i--){
      var key = localStorage.key(i);
      if(!key || key.indexOf('qms_ec_') !== 0) continue;
      var raw = localStorage.getItem(key);
      if(!raw){ localStorage.removeItem(key); continue; }
      var parsed = JSON.parse(raw);
      var savedAt = parsed && parsed.savedAt ? new Date(parsed.savedAt).getTime() : 0;
      if(!savedAt || !isFinite(savedAt) || (now - savedAt) > maxAge) localStorage.removeItem(key);
    }
  } catch(_err){}
}

function flashActionButton(button, temporaryLabel, fallbackLabel){
  if(!button) return;
  var original = button.getAttribute('data-label-original') || button.textContent || fallbackLabel || '';
  button.setAttribute('data-label-original', original);
  button.textContent = temporaryLabel || original;
  button.disabled = true;
  setTimeout(function(){
    button.textContent = original;
    button.disabled = false;
  }, 1500);
}

function reloadCurrentFormWorkspace(formCode, allocationId){
  if(typeof window._fhOpenFormWorkspace === 'function'){
    window._fhOpenFormWorkspace(formCode || '', allocationId || '');
    return;
  }
  if(typeof window.renderOnlineForms === 'function') window.renderOnlineForms(formCode || '');
}

function loadDraft(form,alloc){
  var key=draftKey(form,alloc);
  if(ws.draftKey===key) return;
  purgeOldDrafts();
  ws.draftKey=key; ws.fieldValues={}; ws.signatures={};
  try{
    var raw=localStorage.getItem(key);
    if(raw){
      var p=JSON.parse(raw);
      ws.fieldValues=p.fieldValues||{};
      ws.signatures=p.signatures||{};
    }
  }catch(e){}
  hydrateFromAlloc(alloc);
}

function saveDraft(form,alloc){
  try{
    localStorage.setItem(draftKey(form,alloc),JSON.stringify({
      fieldValues:ws.fieldValues,
      signatures:ws.signatures,
      savedAt:new Date().toISOString()
    }));
    toast(t('ÄÃ£ lÆ°u nhÃ¡p.','Draft saved.'),'success');
  }catch(e){}
  saveDraftToServer(form, alloc);
}

/* ══════════════════════════════════════════════════════
   MAIN RENDER — called by orchestrator
   ══════════════════════════════════════════════════════ */

window._renderWorkspace = function(form, allocation, container){
  resetWorkspaceForForm(form);
  Promise.all([ensureMaster(), ensureOrders(), loadSchema(form.form_code)]).then(function(){
    ws.schema = form.schema || ws.schema;
    if(!ws.allocDept) ws.allocDept = detectDepartment(form);
    loadDraft(form, allocation);
    return preloadSelectedOnlineEntry(form, allocation);
  }).then(function(){
    renderWorkspace(form, allocation, container);
    return Promise.all([loadChecklist(allocation), loadRelatedRecords(allocation), loadRetentionStatus(allocation), loadSlaStatus(allocation)]);
  }).then(function(){
    if(allocation) renderWorkspace(form, allocation, container);
  }).catch(function(){
    renderWorkspace(form, allocation, container);
  });
};

function renderWorkspace(form, allocation, container){
  var isOnline = form.online !== false;
  var meta = { quality:{bg:'#dcfce7',icon:'\uD83D\uDD0E'}, production:{bg:'#fef3c7',icon:'\uD83C\uDFED'}, maintenance:{bg:'#fff9db',icon:'\uD83D\uDD27'}, hr:{bg:'#f3e8ff',icon:'\uD83D\uDC65'}, other:{bg:'#f1f5f9',icon:'\uD83D\uDDC2'} };
  var catMeta = meta[form.category] || meta.other;

  var html = '';

  /* ── Header ── */
  html += '<div class="ec-header">' +
    '<div class="ec-header-badge" style="background:rgba(255,255,255,.12)">' + catMeta.icon + '</div>' +
    '<div class="ec-header-info">' +
      '<div class="ec-header-kicker">' + esc(form.form_code + ' · ' + (form.version || 'V1') + (form.sop_ref ? ' · ' + form.sop_ref : '')) + '</div>' +
      '<div class="ec-header-title">' + esc(form.title_vi || form.title || form.form_code) + '</div>' +
      '<p class="ec-header-desc">' + esc(t(form.description_vi || form.description || '', form.description || '')) + '</p>' +
    '</div>' +
    '<div class="ec-header-tags">' +
      '<span class="ec-tag">' + esc(isOnline ? t('Trực tuyến', 'Online') : t('Ngoại tuyến', 'Offline')) + '</span>' +
      (allocation ? '<span class="ec-tag done">' + esc(allocation.record_id || '') + '</span>' : '') +
    '</div>' +
  '</div>';

  /* ── Step 1: Allocate ── */
  html += renderWorkspaceOverview(form, allocation);
  var hasAlloc = !!allocation;
  html += '<div class="ec-step' + (hasAlloc ? ' collapsed' : '') + '" id="ec-step-alloc">' +
    '<div class="ec-step-head" data-toggle="ec-step-alloc">' +
      '<div class="ec-step-num' + (hasAlloc ? ' done' : '') + '">' + (hasAlloc ? '\u2713' : '1') + '</div>' +
      '<div class="ec-step-title">' + esc(t('Cấp mã hồ sơ', 'Allocate record ID')) + '</div>' +
      '<div class="ec-step-status">' + (hasAlloc ? esc(allocation.record_id || '') : esc(t('Chưa cấp mã', 'Not allocated'))) + '</div>' +
    '</div>' +
    '<div class="ec-step-body">' + renderAllocateStep(form) + '</div>' +
  '</div>';

  /* ── Step 2: Fill / Download ── */
  if(hasAlloc){
    if(isOnline){
      html += renderOnlineStep(form, allocation);
    } else {
      html += renderOfflineStepModern(form, allocation);
    }
  }

  /* ── Step 3: History ── */
  if(hasAlloc){
    html += '<div class="ec-step" id="ec-step-history">' +
      '<div class="ec-step-head" data-toggle="ec-step-history">' +
        '<div class="ec-step-num pending">\uD83D\uDCCB</div>' +
        '<div class="ec-step-title">' + esc(t('Lịch sử', 'History')) + '</div>' +
      '</div>' +
      '<div class="ec-step-body"><div id="ec-history-content">' + esc(t('Đang tải...', 'Loading...')) + '</div></div>' +
    '</div>';
  }

  container.innerHTML = html;
  bindWorkspace(form, allocation, container);
  if(hasAlloc) loadHistory(form);
}

/* ── Step 1: Allocate ── */
function renderAllocateStep(form){
  var rt = detectRecordType(form);
  var st = window._ecState || {};
  var rtCfg = rt ? (st.recordTypes[rt] || {}) : {};
  var defaultDept = ws.allocDept || detectDepartment(form) || 'QA';
  var isOffline = form.online === false;
  var busy = ws.allocBusy;
  var trace = traceSummary(activeTraceContext(null));

  return '<div class="ec-allocate-intro">' +
    '<strong>' + esc(t('Cấp mã ngay trong workspace này', 'Issue the record ID directly in this workspace')) + '</strong>' +
    '<span>' + esc(isOffline ? t('Hệ thống sẽ cấp mã, tạo tên tệp chuẩn, rồi tải ngay gói biểu mẫu ngoại tuyến có kiểm soát.', 'The system will issue the ID, generate the governed filename, and immediately download the controlled offline package.') : t('Hệ thống sẽ cấp mã, khóa ngữ cảnh truy xuất, rồi mở luôn phần điền và ký mà không cần đổi tab.', 'The system will issue the ID, lock the traceability context, and continue directly into fill and sign without tab switching.')) + '</span>' +
  '</div>' +
  (trace ? '<div class="ec-trace-card"><small>' + esc(t('Ngữ cảnh truy xuất dự kiến', 'Projected traceability context')) + '</small><strong>' + esc(trace) + '</strong></div>' : '') +
  renderAllocateError() +
  '<div class="ec-allocate-grid">' +
    '<div><label class="ec-label">' + esc(t('Loại hồ sơ', 'Record type')) + '</label>' +
      '<input class="ec-input" value="' + esc(rt ? (rt + ' · ' + (rtCfg.label || rt)) : t('Không xác định', 'Unknown')) + '" readonly style="background:var(--ec-bg);cursor:default">' +
    '</div>' +
    '<div><label class="ec-label">' + esc(t('Phòng ban', 'Department')) + '</label>' +
      '<select class="ec-select" id="ec-alloc-dept">' + DEPARTMENTS.map(function(d){
        return '<option value="'+d.v+'"'+(d.v===defaultDept?' selected':'')+'>'+esc(t(d.l,d.e))+'</option>';
      }).join('') + '</select>' +
    '</div>' +
    '<div><label class="ec-label">' + esc(t('Ghi chú', 'Note')) + '</label>' +
      '<input class="ec-input" id="ec-alloc-notes" type="text" value="'+esc(ws.allocNotes||'')+'" placeholder="'+esc(t('Tùy chọn','Optional'))+'">' +
    '</div>' +
  '</div>' +
  '<div style="display:flex;justify-content:flex-end;gap:8px">' +
    (!rt ? '<span style="font-size:11px;color:var(--ec-danger);margin-right:auto">'+esc(t('Không tìm thấy loại hồ sơ liên kết','No linked record type found'))+'</span>' : '') +
    '<span class="ec-step-help">' + esc(t('Nếu máy chủ vừa đổi phiên hoặc CSRF, hệ thống sẽ tự thử đồng bộ lại trước khi báo lỗi.', 'If the server rotated the session or CSRF token, the client will attempt a recovery before showing an error.')) + '</span>' +
    '<button class="ec-btn primary lg" id="ec-alloc-btn"'+(busy||!rt?' disabled':'')+' style="min-width:200px">' +
      (busy ? esc(t('Đang xử lý...','Processing...')) : esc(isOffline ? t('Cấp mã & tải form','Allocate & download') : t('Cấp mã & tiếp tục','Allocate & continue'))) +
    '</button>' +
  '</div>';
}

function fieldById(schema, fieldId){
  return (schema && Array.isArray(schema.fields) ? schema.fields : []).find(function(field){
    return field && field.id === fieldId;
  }) || null;
}

function primeFieldDefaults(schema, allocation){
  (schema && Array.isArray(schema.fields) ? schema.fields : []).forEach(function(field){
    if(!field) return;
    if(field.type === 'table'){ ensureTableRows(field); return; }
    if(ws.fieldValues[field.id]!==undefined&&ws.fieldValues[field.id]!==null&&ws.fieldValues[field.id]!=='') return;
    if(field.default==='today'&&field.type==='date'){ ws.fieldValues[field.id]=new Date().toISOString().slice(0,10); return; }
    if(field.default!==undefined&&field.default!==null&&field.default!==''&&field.default!=='today'){ ws.fieldValues[field.id]=field.default; return; }
    var ctx = allocation && allocation.master_context ? allocation.master_context : {};
    if(ctx[field.id] !== undefined && ctx[field.id] !== null && ctx[field.id] !== '') ws.fieldValues[field.id]=ctx[field.id];
  });
}

function fieldVisible(field){
  if(!field || !field.show_if || !field.show_if.field) return true;
  var rule = field.show_if || {};
  var source = ws.fieldValues[rule.field];
  if(Array.isArray(rule.values) && rule.values.length){
    if(Array.isArray(source)) return rule.values.some(function(item){ return source.indexOf(item) >= 0; });
    return rule.values.some(function(item){ return String(item) === String(source); });
  }
  if(Object.prototype.hasOwnProperty.call(rule, 'value')){
    if(Array.isArray(source)) return source.indexOf(rule.value) >= 0;
    if(typeof rule.value === 'boolean') return !!source === !!rule.value;
    return String(source) === String(rule.value);
  }
  return !!source;
}

function fieldHasValue(field, value){
  if(!field) return false;
  if(field.type === 'multi_select') return Array.isArray(value) && value.length > 0;
  if(field.type === 'checkbox') return value === true;
  if(field.type === 'table'){
    var rows = Array.isArray(value) ? value : [];
    return rows.some(function(row){
      return row && Object.keys(row).some(function(key){
        var cell = row[key];
        return !(cell === undefined || cell === null || cell === '');
      });
    });
  }
  return !(value === undefined || value === null || value === '');
}

function ensureTableRows(field){
  var rows = Array.isArray(ws.fieldValues[field.id]) ? ws.fieldValues[field.id].map(function(row){
    return row && typeof row === 'object' ? row : {};
  }) : [];
  var minRows = Math.max(1, Number(field.min_rows || 1) || 1);
  if(!rows.length){
    for(var i = 0; i < minRows; i++) rows.push({});
  }
  ws.fieldValues[field.id] = rows;
  return rows;
}

function visibleFieldIds(section, schema){
  var ids = Array.isArray(section && section.field_ids) ? section.field_ids : [];
  return ids.filter(function(id){
    return fieldVisible(fieldById(schema, id));
  });
}

function normalizeOnlineSections(schema){
  if(schema && Array.isArray(schema.sections) && schema.sections.length){
    return schema.sections.map(function(section){
      return {
        id: section.id || 'section',
        title: section.title || section.id || 'section',
        title_vi: section.title_vi || section.title || section.id || 'section',
        title_en: section.title_en || section.title || section.id || 'section',
        description_vi: section.description_vi || '',
        description_en: section.description_en || '',
        field_ids: Array.isArray(section.field_ids) ? section.field_ids.slice() : []
      };
    }).filter(function(section){ return visibleFieldIds(section, schema).length; });
  }
  var fields = Array.isArray(schema && schema.fields) ? schema.fields : [];
  var groups = {
    core: [],
    tables: [],
    narrative: [],
    confirm: []
  };
  fields.forEach(function(field){
    if(!field) return;
    if(field.type === 'table') groups.tables.push(field.id);
    else if(field.type === 'textarea') groups.narrative.push(field.id);
    else if(field.type === 'checkbox') groups.confirm.push(field.id);
    else groups.core.push(field.id);
  });
  return [
    { id:'core', title_vi:'Thông tin chính', title_en:'Core details', description_vi:'Các trường nền để nhận diện hồ sơ, phạm vi và bối cảnh vận hành.', description_en:'Primary fields describing the record, scope, and operational context.', field_ids: groups.core },
    { id:'tables', title_vi:'Bảng dữ liệu', title_en:'Structured tables', description_vi:'Các bảng dữ liệu cần nhập theo từng dòng nghiệp vụ.', description_en:'Structured row-based data required by the workflow.', field_ids: groups.tables },
    { id:'narrative', title_vi:'Đánh giá & diễn giải', title_en:'Assessment & narrative', description_vi:'Phần mô tả, đánh giá tác động, nhận định và ghi chú chi tiết.', description_en:'Narrative fields for assessment, impact, and detailed notes.', field_ids: groups.narrative },
    { id:'confirm', title_vi:'Xác nhận bổ sung', title_en:'Additional confirmations', description_vi:'Các xác nhận, điều kiện kích hoạt hoặc ô kiểm đặc biệt.', description_en:'Additional confirmations, toggles, or conditional checks.', field_ids: groups.confirm }
  ].filter(function(section){ return visibleFieldIds(section, schema).length; });
}

function sectionCompletion(section, schema){
  var ids = visibleFieldIds(section, schema);
  var stats = { required: 0, complete: 0, visible: ids.length };
  ids.forEach(function(fieldId){
    var field = fieldById(schema, fieldId);
    if(!field || !field.required) return;
    stats.required += 1;
    if(fieldHasValue(field, ws.fieldValues[field.id])) stats.complete += 1;
  });
  return stats;
}

function formProgressMeta(schema){
  var fields = Array.isArray(schema && schema.fields) ? schema.fields.filter(fieldVisible) : [];
  var required = 0;
  var complete = 0;
  fields.forEach(function(field){
    if(!field || !field.required) return;
    required += 1;
    if(fieldHasValue(field, ws.fieldValues[field.id])) complete += 1;
  });
  var blocks = Array.isArray(schema && schema.signature_blocks) ? schema.signature_blocks : [];
  var signed = blocks.filter(function(block){ return !!ws.signatures[block.id]; }).length;
  return {
    required: required,
    complete: complete,
    visibleFields: fields.length,
    signed: signed,
    signatures: blocks.length,
    completionPercent: required ? Math.round((complete / required) * 100) : 100
  };
}

function sectionDomId(section){
  return 'ec-online-section-' + String(section && section.id || 'section')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function roleLabel(role){
  var raw = String(role || '').trim();
  if(!raw) return '';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, function(ch){ return ch.toUpperCase(); });
}

function renderDocumentHeader(form, allocation, schema){
  var owner = departmentLabel(detectDepartment(form) || user().dept || '');
  var review = approvalSummary(allocation || {}, schema || {});
  var approvalText = review.rolesAllowed && review.rolesAllowed.length
    ? review.rolesAllowed.map(roleLabel).join(' · ')
    : t('Theo cấu hình biểu mẫu', 'Per form configuration');
  var title = t(form.title_vi || form.title || form.form_code, form.title_en || form.title || form.form_code);
  var description = t(form.description_vi || form.description || '', form.description_en || form.description || '');
  var extra = [allocation.record_id || '', form.sop_ref || '', form.online === false ? t('Ngoại tuyến', 'Offline') : t('Trực tuyến', 'Online')].filter(Boolean).join(' · ');
  return '<div class="form-header ec-doc-header">' +
    '<div class="fh-left">' +
      '<a class="brand-logo" href="./portal.html"><img alt="HESEM Logo" src="./assets/hesem-logo.svg"></a>' +
      '<div class="fh-company">' +
        '<a href="./portal.html">HESEM kỹ thuật</a>' +
        '<span>Tài liệu kiểm soát</span>' +
      '</div>' +
    '</div>' +
    '<div class="title">' +
      '<strong>' + esc(form.form_code + ' · ' + title) + '</strong>' +
      (description ? '<span class="sub-vn">' + esc(description) + '</span>' : '') +
      (extra ? '<span class="muted">' + esc(extra) + '</span>' : '') +
    '</div>' +
    '<div class="meta">' +
      '<div class="row"><span><b>' + esc(t('Mã', 'Code')) + ':</b></span><span>' + esc(form.form_code || '—') + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('Phiên bản', 'Version')) + ':</b></span><span>' + esc(form.version || 'V0') + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('Ngày hiệu lực', 'Effective date')) + ':</b></span><span>' + esc(form.effective_date || t('Theo quyết định ban hành', 'Per release decision')) + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('Chủ sở hữu', 'Owner')) + ':</b></span><span>' + esc(owner || t('Theo phân quyền', 'Per ownership rules')) + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('Phê duyệt', 'Approval')) + ':</b></span><span>' + esc(approvalText) + '</span></div>' +
    '</div>' +
  '</div>';
}

function renderFormSummaryStrip(form, allocation, schema){
  var ctx = allocation.master_context || {};
  var progress = formProgressMeta(schema);
  var review = approvalSummary(allocation, schema);
  var items = [
    { label:t('Mã hồ sơ', 'Record ID'), value: allocation.record_id || '—' },
    { label:t('Trạng thái', 'Status'), value: historyStatusLabel(allocation.status || 'allocated') },
    { label:t('Loại hồ sơ', 'Record type'), value: detectRecordType(form) || '—' },
    { label:t('Phê duyệt', 'Approval'), value: t(review.labelVi || '', review.labelEn || '') || '—' }
  ];
  if(ctx.customer_id) items.push({ label:t('Khách hàng', 'Customer'), value: ctx.customer_id });
  if(ctx.part_number) items.push({ label:'Part/Rev', value:[ctx.part_number, ctx.part_revision].filter(Boolean).join(' · ') });
  if(ctx.so_number || ctx.jo_number || ctx.wo_number) items.push({ label:'SO / JO / WO', value:[ctx.so_number, ctx.jo_number, ctx.wo_number].filter(Boolean).join(' · ') });
  return '<div class="ec-form-ribbon">' +
    '<div class="ec-form-ribbon-grid">' + items.map(function(item){
      return '<div class="ec-form-ribbon-item"><small>' + esc(item.label) + '</small><strong>' + esc(item.value || '—') + '</strong></div>';
    }).join('') + '</div>' +
    '<div class="ec-form-ribbon-side">' +
      '<span class="ec-badge info">' + esc(progress.complete + '/' + progress.required + ' ' + t('trường bắt buộc', 'required fields')) + '</span>' +
      '<span class="ec-badge neutral">' + esc(progress.signed + '/' + progress.signatures + ' ' + t('chữ ký', 'signatures')) + '</span>' +
    '</div>' +
  '</div>';
}

function renderSectionNavigator(sections, schema){
  if(!sections.length) return '';
  return '<div class="ec-form-nav">' + sections.map(function(section){
    var stats = sectionCompletion(section, schema);
    return '<button type="button" class="ec-form-nav-btn" data-scroll-section="' + esc(sectionDomId(section)) + '">' +
      '<strong>' + esc(t(section.title_vi || section.title || section.id, section.title_en || section.title || section.id)) + '</strong>' +
      '<span>' + esc(stats.required ? (stats.complete + '/' + stats.required + ' ' + t('bắt buộc', 'required')) : t('Nội dung bổ trợ', 'Supporting content')) + '</span>' +
    '</button>';
  }).join('') + '</div>';
}

function renderFormAside(form, allocation, schema, sections){
  var ctx = allocation.master_context || {};
  var progress = formProgressMeta(schema);
  var trace = traceSummary(ctx);
  var review = approvalSummary(allocation, schema);
  var accent = 'style="--ec-progress:' + Math.max(0, Math.min(progress.completionPercent, 100)) + '%"';
  return '<aside class="ec-form-aside">' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('Tiến độ biểu mẫu', 'Form completion')) + '</small>' +
      '<strong>' + esc(progress.completionPercent + '%') + '</strong>' +
      '<span>' + esc(progress.complete + '/' + progress.required + ' ' + t('trường bắt buộc đã hoàn tất', 'required fields completed')) + '</span>' +
      '<div class="ec-form-progress" ' + accent + '><span></span></div>' +
    '</div>' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('Điều phối thực thi', 'Execution control')) + '</small>' +
      '<ul class="ec-form-facts">' +
        '<li><span>' + esc(t('SOP tham chiếu', 'SOP reference')) + '</span><strong>' + esc(form.sop_ref || '—') + '</strong></li>' +
        '<li><span>' + esc(t('Cơ chế duyệt', 'Approval mode')) + '</span><strong>' + esc(t(review.labelVi || '', review.labelEn || '') || '—') + '</strong></li>' +
        '<li><span>' + esc(t('Số phần biểu mẫu', 'Sections')) + '</span><strong>' + esc(String(sections.length)) + '</strong></li>' +
        '<li><span>' + esc(t('Chữ ký điện tử', 'Electronic signatures')) + '</span><strong>' + esc(progress.signed + '/' + progress.signatures) + '</strong></li>' +
      '</ul>' +
    '</div>' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('Ngữ cảnh truy xuất', 'Traceability context')) + '</small>' +
      (trace ? '<strong>' + esc(trace) + '</strong>' : '<strong>' + esc(t('Chưa mang theo ngữ cảnh mở rộng', 'No extended trace context')) + '</strong>') +
      '<span>' + esc(t('Mọi trường bị khóa sẽ bám theo mã hồ sơ và ngữ cảnh đã cấp để giữ tính toàn vẹn truy xuất.', 'Locked fields follow the issued record context to preserve traceability integrity.')) + '</span>' +
    '</div>' +
  '</aside>';
}

function renderOnlineSection(section, schema){
  var ids = visibleFieldIds(section, schema);
  if(!ids.length) return '';
  return '<section class="ec-form-section" id="' + esc(sectionDomId(section)) + '">' +
    '<div class="ec-form-section-head">' +
      '<div>' +
        '<small>' + esc(t('Phần biểu mẫu', 'Form section')) + '</small>' +
        '<h3>' + esc(t(section.title_vi || section.title || section.id, section.title_en || section.title || section.id)) + '</h3>' +
      '</div>' +
      '<p>' + esc(t(section.description_vi || section.description || '', section.description_en || section.description || '') || t('Điền đầy đủ dữ liệu vận hành và bằng chứng nền cho phần nội dung này.', 'Complete the operational data and supporting evidence for this section.')) + '</p>' +
    '</div>' +
    '<div class="ec-form-section-body ec-fields">' + ids.map(function(id){
      var field = fieldById(schema, id);
      return field ? renderField(field) : '';
    }).join('') + '</div>' +
  '</section>';
}

function renderSignaturesPanel(schema){
  var blocks = Array.isArray(schema && schema.signature_blocks) ? schema.signature_blocks : [];
  if(!blocks.length) return '';
  var recordLocked = isRecordReadOnly(selectedAllocation());
  return '<section class="ec-form-section" id="ec-online-section-signatures">' +
    '<div class="ec-form-section-head">' +
      '<div><small>' + esc(t('Xác nhận điện tử', 'Electronic attestations')) + '</small><h3>' + esc(t('Chữ ký điện tử', 'Electronic signatures')) + '</h3></div>' +
      '<p>' + esc(t('Ký theo đúng thứ tự cấu hình để khóa trách nhiệm, lý do ký và dấu vết phê duyệt theo hồ sơ.', 'Sign in the configured order to lock accountability, signing intent, and approval traceability.')) + '</p>' +
    '</div>' +
    '<div class="ec-signatures">' + blocks.map(function(block){
      var signed = !!ws.signatures[block.id];
      var locked = recordLocked || !canSignBlock(schema, block.id);
      return '<div class="ec-sign'+(locked?' locked':'')+'">' +
        '<div class="ec-sign-title">' + esc(t(block.label_vi||block.label||block.id, block.label_en||block.label||block.id)) + '</div>' +
        '<div class="ec-sign-sub">' + esc(t(block.help_vi||block.help||'', block.help_en||block.help||'')) + '</div>' +
        '<div class="ec-sign-pad" id="ec-sig-pad-'+esc(block.id)+'">' + (signed ? '' : '<div class="ec-sign-empty">'+esc(t('Chưa ký','Not signed'))+'</div>') + '</div>' +
        '<div class="ec-sign-actions">' +
          '<button class="ec-btn secondary" data-sign="'+esc(block.id)+'"'+(locked?' disabled':'')+'>'+esc(signed?t('Ký lại','Re-sign'):t('Ký','Sign'))+'</button>' +
          (signed ? '<button class="ec-btn ghost" data-sign-clear="'+esc(block.id)+'">'+esc(t('Xóa','Clear'))+'</button>' : '') +
        '</div>' +
      '</div>';
    }).join('') + '</div>' +
  '</section>';
}

var HEADER_ROLE_META = {
  ceo: { code:'CEO', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html' },
  production_director: { code:'PD', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-production-director.html' },
  cnc_workshop_manager: { code:'WKM', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/02-JD-Production/jd-cnc-workshop-manager.html' },
  production_planner: { code:'PPL', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/02-JD-Production/jd-production-planner.html' },
  shift_leader: { code:'SL', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/02-JD-Production/jd-shift-leader.html' },
  engineering_lead: { code:'ENGM', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html' },
  process_engineer: { code:'PE', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/03-JD-Engineering/jd-process-engineer.html' },
  cam_nc_programmer: { code:'CAM', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/03-JD-Engineering/jd-cam-nc-programmer.html' },
  qa_manager: { code:'QA', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html' },
  quality_engineer: { code:'QE', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-quality-engineer.html' },
  qms_engineer: { code:'QMS', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html' },
  supply_chain_manager: { code:'SCM', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html' },
  buyer: { code:'BUY', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-buyer-purchasing.html' },
  customer_service: { code:'CS', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/06-JD-Sales/jd-customer-service.html' },
  estimator: { code:'EST', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/06-JD-Sales/jd-estimator.html' },
  finance_manager: { code:'FIN', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html' },
  hr_manager: { code:'HR', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/08-JD-HR/jd-hr-manager.html' },
  ehs_specialist: { code:'EHS', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/09-JD-EHS/jd-ehs-specialist.html' },
  it_admin: { code:'ITA', href:'../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/10-JD-IT/jd-it-admin.html' }
};

var HEADER_DEPARTMENT_META = {
  EXE: { code:'D-EXE', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-executive-handbook.html' },
  PRO: { code:'D-PROD', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-production-handbook.html' },
  ENG: { code:'D-ENG', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-engineering-handbook.html' },
  QA: { code:'D-QUAL', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-quality-handbook.html' },
  SCM: { code:'D-SCM', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-supply-chain-handbook.html' },
  SAL: { code:'D-SAL', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html' },
  FIN: { code:'D-FIN', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-finance-handbook.html' },
  HR: { code:'D-HR', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-hr-handbook.html' },
  EHS: { code:'D-EHS', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-ehs-handbook.html' },
  IT: { code:'D-IT', href:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-it-handbook.html' }
};

function renderRoleToken(role){
  var key = String(role || '').trim().toLowerCase();
  if(!key) return '';
  var meta = HEADER_ROLE_META[key] || null;
  var ro = (typeof ROLES !== 'undefined' && ROLES && ROLES[key]) ? ROLES[key] : null;
  var code = meta && meta.code ? meta.code : roleLabel(key);
  var title = ro ? t(ro.label || roleLabel(key), ro.labelEn || roleLabel(key)) : roleLabel(key);
  var inner = '<span class="entity-code role-code">' + esc(code) + '</span>';
  if(meta && meta.href){
    return '<a class="entity-link role-link ec-role-link" href="' + esc(meta.href) + '" title="' + esc(title) + '">' + inner + '</a>';
  }
  return '<span class="ec-role-chip" title="' + esc(title) + '">' + inner + '</span>';
}

function renderRoleCluster(roles){
  var list = Array.isArray(roles) ? roles.map(function(role){
    return String(role || '').trim().toLowerCase();
  }).filter(Boolean) : [];
  list = list.filter(function(role, index){ return list.indexOf(role) === index; });
  if(!list.length) return esc(t('\u0054\u0068\u0065\u006f\u0020\u0063\u1ea5\u0075\u0020\u0068\u00ec\u006e\u0068\u0020\u0062\u0069\u1ec3\u0075\u0020\u006d\u1eabu', 'Per form configuration'));
  return '<span class="entity-cluster role-cluster ec-role-cluster">' + list.map(renderRoleToken).join('<span class="entity-sep role-sep">/</span>') + '</span>';
}

function renderDepartmentToken(code){
  var key = String(code || '').trim().toUpperCase();
  if(!key) return esc(t('\u0054\u0068\u0065\u006f\u0020\u0070\u0068\u00e2\u006e\u0020\u0071\u0075\u0079\u1ec1\u006e', 'Per ownership rules'));
  var meta = HEADER_DEPARTMENT_META[key] || null;
  var label = departmentLabel(key) || key;
  var codeLabel = meta && meta.code ? meta.code : key;
  var inner = '<span class="entity-code dept-code">' + esc(codeLabel) + '</span>';
  if(meta && meta.href){
    return '<a class="entity-link dept-link ec-dept-link" href="' + esc(meta.href) + '" title="' + esc(label) + '">' + inner + '</a>';
  }
  return '<span class="ec-role-chip" title="' + esc(label) + '">' + inner + '</span>';
}

function nextRequiredSectionLabel(sections, schema){
  var list = Array.isArray(sections) ? sections : [];
  for(var i = 0; i < list.length; i++){
    var stats = sectionCompletion(list[i], schema);
    if(stats.required && stats.complete < stats.required){
      return t(list[i].title_vi || list[i].title || list[i].id, list[i].title_en || list[i].title || list[i].id);
    }
  }
  return '';
}

function renderDocumentHeader(form, allocation, schema){
  var owner = renderDepartmentToken(detectDepartment(form) || user().dept || '');
  var review = approvalSummary(allocation || {}, schema || {});
  var approvalText = renderRoleCluster(review.rolesAllowed || []);
  var title = t(form.title_vi || form.title || form.form_code, form.title_en || form.title || form.form_code);
  var description = t(form.title_note_vi || form.description_vi || form.description || '', form.title_note_en || form.description_en || form.description || '');
  var extra = [allocation.record_id || '', form.sop_ref || '', form.online === false ? t('\u004e\u0067\u006f\u1ea1\u0069\u0020\u0074\u0075\u0079\u1ebf\u006e', 'Offline') : t('\u0054\u0072\u1ef1\u0063\u0020\u0074\u0075\u0079\u1ebf\u006e', 'Online')].filter(Boolean).join(' / ');
  return '<div class="form-header ec-doc-header">' +
    '<div class="fh-left">' +
      '<a class="brand-logo" href="./portal.html"><img alt="HESEM Logo" src="./assets/hesem-logo.svg"></a>' +
      '<div class="fh-company">' +
        '<a href="./portal.html">HESEM ENGINEERING</a>' +
        '<span>' + esc(t('\u0054\u00e0\u0069\u0020\u006c\u0069\u1ec7\u0075\u0020\u006b\u0069\u1ec3\u006d\u0020\u0073\u006f\u00e1\u0074', 'Controlled document')) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="title">' +
      '<span class="doc-code">' + esc(form.form_code || '\u2014') + '</span>' +
      '<strong class="doc-name">' + esc(title) + '</strong>' +
      (description ? '<span class="sub-vn">' + esc(description) + '</span>' : '') +
      (extra ? '<span class="muted">' + esc(extra) + '</span>' : '') +
    '</div>' +
    '<div class="meta">' +
      '<div class="row"><span><b>' + esc(t('\u004d\u00e3', 'Code')) + ':</b></span><span class="doc-code">' + esc(form.form_code || '\u2014') + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('\u0050\u0068\u0069\u00ea\u006e\u0020\u0062\u1ea3\u006e', 'Version')) + ':</b></span><span>' + esc(form.version || 'V0') + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('\u004e\u0067\u00e0\u0079\u0020\u0068\u0069\u1ec7\u0075\u0020\u006c\u1ef1\u0063', 'Effective date')) + ':</b></span><span>' + esc(form.effective_date || t('\u0054\u0068\u0065\u006f\u0020\u0071\u0075\u0079\u1ebf\u0074\u0020\u0111\u1ecb\u006e\u0068\u0020\u0062\u0061\u006e\u0020\u0068\u00e0\u006e\u0068', 'Per release decision')) + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('\u0043\u0068\u1ee7\u0020\u0073\u1edf\u0020\u0068\u1eef\u0075', 'Owner')) + ':</b></span><span>' + owner + '</span></div>' +
      '<div class="row"><span><b>' + esc(t('\u0050\u0068\u00ea\u0020\u0064\u0075\u0079\u1ec7\u0074', 'Approval')) + ':</b></span><span>' + approvalText + '</span></div>' +
    '</div>' +
  '</div>';
}

function renderFormSummaryStrip(form, allocation, schema){
  var sections = normalizeOnlineSections(schema);
  var ctx = allocation.master_context || {};
  var progress = formProgressMeta(schema);
  var review = approvalSummary(allocation, schema);
  var trace = traceSummary(ctx);
  var nextSection = nextRequiredSectionLabel(sections, schema);
  var items = [
    { label:t('\u004d\u00e3\u0020\u0068\u1ed3\u0020\u0073\u01a1', 'Record ID'), value: allocation.record_id || '\u2014' },
    { label:t('\u0054\u0072\u1ea1\u006e\u0067\u0020\u0074\u0068\u00e1\u0069', 'Status'), value: historyStatusLabel(allocation.status || 'allocated') },
    { label:t('\u004c\u006f\u1ea1\u0069\u0020\u0068\u1ed3\u0020\u0073\u01a1', 'Record type'), value: detectRecordType(form) || '\u2014' },
    { label:t('\u0043\u01a1\u0020\u0063\u0068\u1ebf\u0020\u0064\u0075\u0079\u1ec7\u0074', 'Approval flow'), value: t(review.labelVi || '', review.labelEn || '') || '\u2014' },
    { label:t('\u01afu\u0020\u0074\u0069\u00ea\u006e', 'Next focus'), value: nextSection || t('\u0053\u1eb5\u006e\u0020\u0073\u00e0\u006e\u0067\u0020\u0067\u1eedi', 'Ready to submit') },
    { label:t('\u0043\u0068\u1eef\u0020\u006b\u00fd\u0020\u0111\u0069\u1ec7\u006e\u0020\u0074\u1eed', 'Electronic signatures'), value: progress.signed + '/' + progress.signatures }
  ];
  var tags = [
    allocation.record_id || '',
    form.sop_ref || '',
    trace || '',
    form.online === false ? t('\u004e\u0067\u006f\u1ea1\u0069\u0020\u0074\u0075\u0079\u1ebf\u006e', 'Offline') : t('\u0054\u0072\u1ef1\u0063\u0020\u0074\u0075\u0079\u1ebf\u006e', 'Online')
  ].filter(Boolean);
  if(ctx.customer_id) tags.push(ctx.customer_id);
  if(ctx.part_number) tags.push([ctx.part_number, ctx.part_revision].filter(Boolean).join(' / '));
  if(ctx.so_number || ctx.jo_number || ctx.wo_number) tags.push([ctx.so_number, ctx.jo_number, ctx.wo_number].filter(Boolean).join(' / '));
  return '<div class="ec-form-ribbon">' +
    '<div class="ec-form-brief-main">' +
      '<small>' + esc(t('\u0110\u1ecb\u006e\u0068\u0020\u0068\u01b0\u1edb\u006e\u0067\u0020\u0074\u0068\u1ef1\u0063\u0020\u0074\u0068\u0069', 'Operational brief')) + '</small>' +
      '<h2>' + esc(t(form.title_vi || form.title || form.form_code, form.title_en || form.title || form.form_code)) + '</h2>' +
      '<p>' + esc(t(form.description_vi || form.description || '\u0047\u0068\u0069\u0020\u006e\u0068\u1ead\u006e\u0020\u0111\u1ee7\u0020\u0064\u1eef\u0020\u006c\u0069\u1ec7\u0075\u0020\u0074\u0072\u0075\u0079\u0020\u0078\u0075\u1ea5\u0074\u002c\u0020\u0062\u1eb1\u006e\u0067\u0020\u0063\u0068\u1ee9\u006e\u0067\u0020\u0076\u00e0\u0020\u0078\u00e1\u0063\u0020\u006e\u0068\u1ead\u006e\u0020\u0111\u1ec3\u0020\u0068\u1ed3\u0020\u0073\u01a1\u0020\u0111\u1ea1\u0074\u0020\u0074\u1ea7\u006d\u0020\u0064\u1ee5\u006e\u0067\u0020\u006e\u0067\u0061\u0079\u0020\u0074\u1ea1\u0069\u0020\u0111\u0069\u1ec3\u006d\u0020\u0073\u1eed\u0020\u0064\u1ee5\u006e\u0067\u002e', 'Capture traceability, evidence, and approvals in one governed sheet ready for operational use.'), form.description_en || form.description || 'Capture traceability, evidence, and approvals in one governed sheet ready for operational use.') + '</p>' +
      '<div class="ec-form-tags">' + tags.map(function(tag){
        return '<span class="ec-form-tag">' + esc(tag) + '</span>';
      }).join('') + '</div>' +
    '</div>' +
    '<div class="ec-form-brief-side">' +
      '<div class="ec-form-progress-card">' +
        '<small>' + esc(t('\u0054\u0069\u1ebf\u006e\u0020\u0111\u1ed9\u0020\u0062\u0069\u1ec3\u0075\u0020\u006d\u1eabu', 'Form completion')) + '</small>' +
        '<strong>' + esc(progress.completionPercent + '%') + '</strong>' +
        '<span>' + esc(progress.complete + '/' + progress.required + ' ' + t('\u0074\u0072\u01b0\u1edd\u006e\u0067\u0020\u0062\u1ea5\u0074\u0020\u0062\u0075\u1ed9\u0063', 'required fields')) + '</span>' +
        '<div class="ec-form-progress" style="--ec-progress:' + Math.max(0, Math.min(progress.completionPercent, 100)) + '%"><span></span></div>' +
        '<div class="ec-form-progress-note">' + esc(nextSection ? (t('\u01afu\u0020\u0074\u0069\u00ea\u006e', 'Priority') + ': ' + nextSection) : t('\u0054\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u0063\u00e1\u0063\u0020\u0074\u0072\u01b0\u1edd\u006e\u0067\u0020\u0062\u1ea5\u0074\u0020\u0062\u0075\u1ed9\u0063\u0020\u0111\u00e3\u0020\u0068\u006f\u00e0\u006e\u0020\u0074\u1ea5\u0074', 'All required fields are complete')) + '</div>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="ec-form-control-strip">' + items.map(function(item){
    return '<div class="ec-form-control-item"><small>' + esc(item.label) + '</small><strong>' + esc(item.value || '\u2014') + '</strong></div>';
  }).join('') + '</div>';
}

function renderSectionNavigator(sections, schema){
  if(!sections.length) return '';
  return '<div class="ec-form-nav-wrap"><div class="ec-form-nav-head"><small>' + esc(t('\u0042\u1ea3\u006e\u0020\u0111\u1ed3\u0020\u0062\u0069\u1ec3\u0075\u0020\u006d\u1eabu', 'Form map')) + '</small><strong>' + esc(t('\u0044\u0069\u0020\u0063\u0068\u0075\u0079\u1ec3\u006e\u0020\u006e\u0068\u0061\u006e\u0068\u0020\u0111\u1ebf\u006e\u0020\u0111\u00fa\u006e\u0067\u0020\u0070\u0068\u1ea7\u006e\u0020\u0111\u0061\u006e\u0067\u0020\u0063\u1ea7\u006e\u0020\u0111\u0069\u1ec1\u006e', 'Jump directly to the section you need')) + '</strong></div><div class="ec-form-nav">' + sections.map(function(section, index){
    var stats = sectionCompletion(section, schema);
    var statusText = stats.required ? (stats.complete + '/' + stats.required + ' ' + t('\u0062\u1ea5\u0074\u0020\u0062\u0075\u1ed9\u0063', 'required')) : t('\u004e\u1ed9\u0069\u0020\u0064\u0075\u006e\u0067\u0020\u0062\u1ed5\u0020\u0074\u0072\u1ee3', 'Supporting content');
    return '<button type="button" class="ec-form-nav-btn" data-scroll-section="' + esc(sectionDomId(section)) + '">' +
      '<span class="ec-form-nav-num">' + esc(String(index + 1).padStart(2, '0')) + '</span>' +
      '<span class="ec-form-nav-copy"><strong>' + esc(t(section.title_vi || section.title || section.id, section.title_en || section.title || section.id)) + '</strong><span>' + esc(statusText) + '</span></span>' +
    '</button>';
  }).join('') + '</div></div>';
}

function renderFormAside(form, allocation, schema, sections){
  var ctx = allocation.master_context || {};
  var progress = formProgressMeta(schema);
  var trace = traceSummary(ctx);
  var review = approvalSummary(allocation, schema);
  var nextSection = nextRequiredSectionLabel(sections, schema);
  var accent = 'style="--ec-progress:' + Math.max(0, Math.min(progress.completionPercent, 100)) + '%"';
  return '<aside class="ec-form-aside">' +
    '<div class="ec-form-aside-block ec-form-aside-primary">' +
      '<small>' + esc(t('\u0054\u0069\u1ebf\u006e\u0020\u0111\u1ed9\u0020\u0062\u0069\u1ec3\u0075\u0020\u006d\u1eabu', 'Form completion')) + '</small>' +
      '<strong>' + esc(progress.completionPercent + '%') + '</strong>' +
      '<span>' + esc(progress.complete + '/' + progress.required + ' ' + t('\u0074\u0072\u01b0\u1edd\u006e\u0067\u0020\u0062\u1ea5\u0074\u0020\u0062\u0075\u1ed9\u0063\u0020\u0111\u00e3\u0020\u0068\u006f\u00e0\u006e\u0020\u0074\u1ea5\u0074', 'required fields completed')) + '</span>' +
      '<div class="ec-form-progress" ' + accent + '><span></span></div>' +
      '<div class="ec-form-side-note">' + esc(nextSection ? (t('\u004b\u1ebf\u0020\u0074\u0069\u1ebf\u0070', 'Next focus') + ': ' + nextSection) : t('\u0053\u1eb5\u006e\u0020\u0073\u00e0\u006e\u0067\u0020\u0063\u0068\u1ed1\u0074\u0020\u0062\u0069\u1ec3\u0075\u0020\u006d\u1eabu', 'Ready to finalize the form')) + '</div>' +
    '</div>' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('\u0110\u0069\u1ec1\u0075\u0020\u0070\u0068\u1ed1\u0069\u0020\u0074\u0068\u1ef1\u0063\u0020\u0074\u0068\u0069', 'Execution control')) + '</small>' +
      '<ul class="ec-form-facts">' +
        '<li><span>' + esc(t('SOP tham chi\u1ebfu', 'SOP reference')) + '</span><strong>' + esc(form.sop_ref || '\u2014') + '</strong></li>' +
        '<li><span>' + esc(t('\u0043\u01a1\u0020\u0063\u0068\u1ebf\u0020\u0064\u0075\u0079\u1ec7\u0074', 'Approval mode')) + '</span><strong>' + esc(t(review.labelVi || '', review.labelEn || '') || '\u2014') + '</strong></li>' +
        '<li><span>' + esc(t('\u0053\u1ed1\u0020\u0070\u0068\u1ea7\u006e\u0020\u0062\u0069\u1ec3\u0075\u0020\u006d\u1eabu', 'Sections')) + '</span><strong>' + esc(String(sections.length)) + '</strong></li>' +
        '<li><span>' + esc(t('\u0043\u0068\u1eef\u0020\u006b\u00fd\u0020\u0111\u0069\u1ec7\u006e\u0020\u0074\u1eed', 'Electronic signatures')) + '</span><strong>' + esc(progress.signed + '/' + progress.signatures) + '</strong></li>' +
      '</ul>' +
    '</div>' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('\u004e\u0067\u1eef\u0020\u0063\u1ea3\u006e\u0068\u0020\u0074\u0072\u0075\u0079\u0020\u0078\u0075\u1ea5\u0074', 'Traceability context')) + '</small>' +
      (trace ? '<strong>' + esc(trace) + '</strong>' : '<strong>' + esc(t('\u0043\u0068\u01b0\u0061\u0020\u006d\u0061\u006e\u0067\u0020\u0074\u0068\u0065\u006f\u0020\u006e\u0067\u1eef\u0020\u0063\u1ea3\u006e\u0068\u0020\u006d\u1edf\u0020\u0072\u1ed9\u006e\u0067', 'No extended trace context')) + '</strong>') +
      '<span>' + esc(t('\u004d\u1ecd\u0069\u0020\u0074\u0072\u01b0\u1edd\u006e\u0067\u0020\u0062\u1ecb\u0020\u006b\u0068\u00f3\u0061\u0020\u0073\u1ebd\u0020\u0062\u00e1\u006d\u0020\u0074\u0068\u0065\u006f\u0020\u006d\u00e3\u0020\u0068\u1ed3\u0020\u0073\u01a1\u0020\u0076\u00e0\u0020\u006e\u0067\u1eef\u0020\u0063\u1ea3\u006e\u0068\u0020\u0111\u00e3\u0020\u0063\u1ea5\u0070\u0020\u0111\u1ec3\u0020\u0067\u0069\u1eef\u0020\u0074\u00ed\u006e\u0068\u0020\u0074\u006f\u00e0\u006e\u0020\u0076\u1eb9\u006e\u0020\u0074\u0072\u0075\u0079\u0020\u0078\u0075\u1ea5\u0074\u002e', 'Locked fields follow the issued record context to preserve traceability integrity.')) + '</span>' +
    '</div>' +
  '</aside>';
}

function renderOnlineSection(section, schema){
  var ids = visibleFieldIds(section, schema);
  if(!ids.length) return '';
  var stats = sectionCompletion(section, schema);
  var order = normalizeOnlineSections(schema).findIndex(function(item){ return item && item.id === section.id; });
  var statusText = stats.required ? (stats.complete + '/' + stats.required + ' ' + t('\u0062\u1ea5\u0074\u0020\u0062\u0075\u1ed9\u0063', 'required')) : t('\u004b\u0068\u00f4\u006e\u0067\u0020\u0063\u00f3\u0020\u0074\u0072\u01b0\u1edd\u006e\u0067\u0020\u0062\u1ea5\u0074\u0020\u0062\u0075\u1ed9\u0063', 'No required fields');
  return '<section class="ec-form-section" id="' + esc(sectionDomId(section)) + '">' +
    '<div class="ec-form-section-head">' +
      '<div class="ec-form-section-lead">' +
        '<span class="ec-form-section-index">' + esc(String((order >= 0 ? order : 0) + 1).padStart(2, '0')) + '</span>' +
        '<div>' +
          '<small>' + esc(t('\u0050\u0068\u1ea7\u006e\u0020\u0062\u0069\u1ec3\u0075\u0020\u006d\u1eabu', 'Form section')) + '</small>' +
          '<h3>' + esc(t(section.title_vi || section.title || section.id, section.title_en || section.title || section.id)) + '</h3>' +
          '<p>' + esc(t(section.description_vi || section.description || '', section.description_en || section.description || '') || t('\u0110\u0069\u1ec1\u006e\u0020\u0111\u1ea7\u0079\u0020\u0111\u1ee7\u0020\u0064\u1eef\u0020\u006c\u0069\u1ec7\u0075\u0020\u0076\u1ead\u006e\u0020\u0068\u00e0\u006e\u0068\u0020\u0076\u00e0\u0020\u0062\u1eb1\u006e\u0067\u0020\u0063\u0068\u1ee9\u006e\u0067\u0020\u006e\u1ec1\u006e\u0020\u0063\u0068\u006f\u0020\u0070\u0068\u1ea7\u006e\u0020\u006e\u1ed9\u0069\u0020\u0064\u0075\u006e\u0067\u0020\u006e\u00e0\u0079\u002e', 'Complete the operational data and supporting evidence for this section.')) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="ec-form-section-state"><strong>' + esc(statusText) + '</strong><span>' + esc(stats.visible + ' ' + t('\u0074\u0072\u01b0\u1edd\u006e\u0067\u0020\u0068\u0069\u1ec3\u006e', 'visible fields')) + '</span></div>' +
    '</div>' +
    '<div class="ec-form-section-body ec-fields">' + ids.map(function(id){
      var field = fieldById(schema, id);
      return field ? renderField(field) : '';
    }).join('') + '</div>' +
  '</section>';
}

function standaloneOnlinePath(form){
  var schema = form && form.schema ? form.schema : (ws.schema || {});
  return String(
    (form && form.standalone_html) ||
    (schema && schema.standalone_html) ||
    ''
  ).trim();
}

function standaloneRuntimeFrameId(form, allocation){
  return 'ec-runtime-frame-' + slugify((form && form.form_code) || 'form') + '-' + slugify((allocation && allocation.allocation_id) || 'allocation');
}

function standaloneRuntimeSrc(form, allocation){
  var path = standaloneOnlinePath(form);
  if(!path) return '';
  var params = new URLSearchParams();
  params.set('form_code', String(form && form.form_code || ''));
  params.set('allocation_id', String(allocation && allocation.allocation_id || ''));
  params.set('record_id', String(allocation && allocation.record_id || ''));
  params.set('lang', (typeof lang !== 'undefined' && lang === 'en') ? 'en' : 'vi');
  params.set('_runtime_ts', String(Date.now()));
  return path + (path.indexOf('?') >= 0 ? '&' : '?') + params.toString();
}

function renderStandaloneOnlineStep(form, allocation){
  var frameId = standaloneRuntimeFrameId(form, allocation);
  var src = standaloneRuntimeSrc(form, allocation);
  return '<div class="ec-step" id="ec-step-fill">' +
    '<div class="ec-step-head" data-toggle="ec-step-fill">' +
      '<div class="ec-step-num">2</div>' +
      '<div class="ec-step-title">' + esc(t('Điền biểu mẫu trực tuyến', 'Fill online form')) + '</div>' +
    '</div>' +
    '<div class="ec-step-body">' +
      '<div class="ec-runtime-shell">' +
        '<div class="ec-runtime-head">' +
          '<div>' +
            '<strong>' + esc(t('Biểu mẫu HTML độc lập', 'Standalone HTML form')) + '</strong>' +
            '<span>' + esc(t('Form này có cấu trúc HTML, điều khiển nhập liệu, phép tính, lưu nháp và gửi hồ sơ trong runtime riêng. Portal giữ checklist, approval và workflow ở ngoài.', 'This form owns its HTML layout, input logic, calculations, draft save, and submission in its own runtime. The portal keeps checklist, approval, and workflow outside.')) + '</span>' +
          '</div>' +
          '<a class="ec-btn secondary" href="' + esc(src) + '" target="_blank" rel="noopener">' + esc(t('Mở ở tab riêng', 'Open in new tab')) + '</a>' +
        '</div>' +
        '<iframe id="' + esc(frameId) + '" class="ec-runtime-frame" data-form-code="' + esc(form.form_code || '') + '" data-allocation-id="' + esc(allocation.allocation_id || '') + '" src="' + esc(src) + '" title="' + esc(t('Biểu mẫu trực tuyến độc lập', 'Standalone online form')) + '"></iframe>' +
      '</div>' +
      '<div class="ec-form-appendix">' +
        renderChecklist(allocation) +
        renderCapaEffectivenessCard(form, allocation) +
        renderRelatedRecords(allocation) +
        renderRetentionCard(form, allocation) +
        renderSlaCard(form, allocation) +
        renderEvidenceActions(allocation) +
        renderApprovalBar(form, allocation) +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ── Step 2: Online form ── */
function renderOnlineStep(form, allocation){
  if(standaloneOnlinePath(form)) return renderStandaloneOnlineStep(form, allocation);
  var schema = form.schema || ws.schema || {};
  primeFieldDefaults(schema, allocation);
  var sections = normalizeOnlineSections(schema);
  var html = '<div class="ec-step" id="ec-step-fill">' +
    '<div class="ec-step-head" data-toggle="ec-step-fill">' +
      '<div class="ec-step-num">2</div>' +
      '<div class="ec-step-title">' + esc(t('Điền biểu mẫu trực tuyến', 'Fill online form')) + '</div>' +
    '</div>' +
    '<div class="ec-step-body">' +
      '<div class="ec-form-frame">' +
        '<div class="ec-form-sheet">' +
          renderDocumentHeader(form, allocation, schema) +
          renderFormSummaryStrip(form, allocation, schema) +
          renderSectionNavigator(sections, schema) +
          '<div class="ec-form-canvas">' +
            '<div class="ec-form-main">' +
              sections.map(function(section){ return renderOnlineSection(section, schema); }).join('') +
              renderSignaturesPanel(schema) +
              '<div class="ec-form-footer">' +
                '<div class="ec-form-footer-copy">' +
                  '<strong>' + esc(t('Sẵn sàng gửi biểu mẫu', 'Ready to submit')) + '</strong>' +
                  '<span>' + esc(t('Lưu nháp bất cứ lúc nào. Khi gửi, hệ thống sẽ kiểm tra checklist, chữ ký và quy tắc review đang áp dụng cho hồ sơ này.', 'You can save a draft anytime. On submit, the system validates checklist, signatures, and the active review rules for this record.')) + '</span>' +
                '</div>' +
                '<div class="ec-actions ec-form-actions">' +
                  '<button class="ec-btn secondary" id="ec-save-draft">' + esc(t('Lưu nháp','Save draft')) + '</button>' +
                  '<button class="ec-btn ghost" id="ec-reset-form">' + esc(t('Xóa dữ liệu','Reset')) + '</button>' +
                  '<button class="ec-btn primary" id="ec-submit-online">' + esc(t('Gửi biểu mẫu','Submit form')) + '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            renderFormAside(form, allocation, schema, sections) +
          '</div>' +
        '</div>' +
        '<div class="ec-form-appendix">' +
          renderChecklist(allocation) +
          renderCapaEffectivenessCard(form, allocation) +
          renderRelatedRecords(allocation) +
          renderRetentionCard(form, allocation) +
          renderSlaCard(form, allocation) +
          renderEvidenceActions(allocation) +
          renderApprovalBar(form, allocation) +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
  return html;
}

/* ── Step 2: Offline form ── */
function renderOfflineNavigator(){
  return '<div class="ec-form-nav">' +
    '<button type="button" class="ec-form-nav-btn" data-scroll-section="ec-offline-section-package">' +
      '<strong>' + esc(t('Phát hành gói biểu mẫu', 'Issue governed package')) + '</strong>' +
      '<span>' + esc(t('Tải gói Excel và khóa tên tệp chuẩn', 'Download the governed Excel package and filename')) + '</span>' +
    '</button>' +
    '<button type="button" class="ec-form-nav-btn" data-scroll-section="ec-offline-section-upload">' +
      '<strong>' + esc(t('Tiếp nhận bản đã điền', 'Receive completed workbook')) + '</strong>' +
      '<span>' + esc(t('Kéo thả, kiểm tra và tiếp nhận đúng mã hồ sơ', 'Drop, verify, and receive against the issued record')) + '</span>' +
    '</button>' +
  '</div>';
}

function renderOfflineAside(form, allocation){
  var ctx = allocation.master_context || {};
  var fname = (allocation.offline_package && allocation.offline_package.filename) || allocation.suggested_filename || '';
  var latest = allocation.latest_stored_filename || '';
  var trace = traceSummary(ctx);
  return '<aside class="ec-form-aside">' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('Trạng thái phát hành', 'Issuance status')) + '</small>' +
      '<strong>' + esc(historyStatusLabel(allocation.status || 'allocated')) + '</strong>' +
      '<span>' + esc(fname ? t('Tên tệp governed đã sẵn sàng để phát hành và theo dõi xuyên suốt vòng đời hồ sơ.', 'The governed filename is ready to issue and track throughout the record lifecycle.') : t('Hệ thống sẽ tạo tên tệp governed ngay khi phát hành biểu mẫu.', 'The system will generate the governed filename when issuing the workbook.')) + '</span>' +
    '</div>' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('Tài liệu kiểm soát', 'Controlled references')) + '</small>' +
      '<ul class="ec-form-facts">' +
        '<li><span>' + esc(t('SOP tham chiếu', 'SOP reference')) + '</span><strong>' + esc(form.sop_ref || '—') + '</strong></li>' +
        '<li><span>' + esc(t('Tên tệp governed', 'Governed filename')) + '</span><strong>' + esc(fname || '—') + '</strong></li>' +
        '<li><span>' + esc(t('Bản đã nộp gần nhất', 'Latest submitted file')) + '</span><strong>' + esc(latest || t('Chưa có', 'Not yet')) + '</strong></li>' +
      '</ul>' +
    '</div>' +
    '<div class="ec-form-aside-block">' +
      '<small>' + esc(t('Ngữ cảnh truy xuất', 'Traceability context')) + '</small>' +
      (trace ? '<strong>' + esc(trace) + '</strong>' : '<strong>' + esc(t('Chưa có ngữ cảnh mở rộng', 'No extended trace context')) + '</strong>') +
      '<span>' + esc(t('Bản Excel nộp lên phải khớp metadata đã phát hành để hệ thống tiếp nhận đúng hồ sơ.', 'The uploaded workbook must match the issued metadata so the system receives it into the correct record.')) + '</span>' +
    '</div>' +
  '</aside>';
}

function renderOfflineStepModern(form, allocation){
  var schema = form.schema || ws.schema || {};
  primeFieldDefaults(schema, allocation);
  var fname = (allocation.offline_package && allocation.offline_package.filename) || allocation.suggested_filename || '';
  var sopRef = form.sop_ref || '';
  var blankFile = form.blank_filename || form.blank_path || '';
  return '<div class="ec-step" id="ec-step-offline">' +
    '<div class="ec-step-head" data-toggle="ec-step-offline">' +
      '<div class="ec-step-num">2</div>' +
      '<div class="ec-step-title">' + esc(t('Tải & Nộp biểu mẫu Excel', 'Download & submit Excel form')) + '</div>' +
    '</div>' +
    '<div class="ec-step-body">' +
      '<div class="ec-form-frame">' +
        '<div class="ec-form-sheet">' +
          renderDocumentHeader(form, allocation, schema) +
          renderFormSummaryStrip(form, allocation, schema) +
          renderOfflineNavigator() +
          '<div class="ec-form-canvas">' +
            '<div class="ec-form-main">' +
              '<section class="ec-form-section" id="ec-offline-section-package">' +
                '<div class="ec-form-section-head">' +
                  '<div><small>' + esc(t('Phát hành biểu mẫu', 'Workbook issuance')) + '</small><h3>' + esc(t('Tải gói Excel đã kiểm soát', 'Download governed Excel package')) + '</h3></div>' +
                  '<p>' + esc(t('Phát hành đúng biểu mẫu, đúng phiên bản và đúng tên tệp governed trước khi điền ngoài hệ thống.', 'Issue the correct form, revision, and governed filename before completion outside the system.')) + '</p>' +
                '</div>' +
                (sopRef || blankFile ? '<div class="ec-doc-ref">' +
                  '<div class="ec-doc-ref-title">' + esc(t('Tài liệu liên kết', 'Linked documents')) + '</div>' +
                  '<div class="ec-doc-ref-grid">' +
                    (sopRef ? '<div class="ec-doc-ref-item"><small>' + esc(t('Quy trình SOP', 'SOP Reference')) + '</small><a href="#" data-navigate-doc="' + esc(sopRef) + '">' + esc(sopRef) + '</a></div>' : '') +
                    (blankFile ? '<div class="ec-doc-ref-item"><small>' + esc(t('Mẫu biểu mẫu gốc', 'Original template')) + '</small><span>' + esc(blankFile) + '</span></div>' : '') +
                    '<div class="ec-doc-ref-item"><small>' + esc(t('Phiên bản kiểm soát', 'Controlled version')) + '</small><span>' + esc(form.version || 'V0') + '</span></div>' +
                    (allocation.template_checksum ? '<div class="ec-doc-ref-item"><small>SHA-256</small><span class="ec-mono-sm">' + esc(String(allocation.template_checksum).substring(0, 16) + '...') + '</span></div>' : '') +
                  '</div>' +
                '</div>' : '') +
                '<div class="ec-offline-panel">' +
                  '<div class="ec-offline-highlight">' +
                    '<small>' + esc(t('Tên tệp governed', 'Governed filename')) + '</small>' +
                    '<strong>' + esc(fname || t('Sẽ được tạo khi phát hành', 'Generated on issue')) + '</strong>' +
                    '<span>' + esc(t('Tên tệp này là điểm neo để kiểm soát truy xuất, kiểm tra metadata ẩn và tiếp nhận đúng hồ sơ sau khi người dùng nộp lại.', 'This filename anchors traceability, hidden metadata inspection, and correct receipt into the target record when the workbook is returned.')) + '</span>' +
                  '</div>' +
                  '<div class="ec-offline-actions">' +
                    '<button class="ec-btn primary lg" id="ec-download-offline">' + esc(t('Tải gói Excel đã kiểm soát','Download governed Excel package')) + '</button>' +
                    (fname ? '<button class="ec-btn secondary" id="ec-copy-filename">' + esc(t('Sao chép tên tệp','Copy filename')) + '</button>' : '') +
                    (allocation.latest_stored_filename ? '<button class="ec-btn secondary" id="ec-download-received">' + esc(t('Tải bản Excel đã nộp gần nhất', 'Download latest submitted workbook')) + '</button>' : '') +
                  '</div>' +
                '</div>' +
              '</section>' +
              '<section class="ec-form-section" id="ec-offline-section-upload">' +
                '<div class="ec-form-section-head">' +
                  '<div><small>' + esc(t('Tiếp nhận', 'Receipt & verification')) + '</small><h3>' + esc(t('Nộp bản Excel đã điền', 'Submit completed workbook')) + '</h3></div>' +
                  '<p>' + esc(t('Tệp tải lên sẽ được đọc metadata ẩn, đối chiếu mã hồ sơ và chỉ tiếp nhận khi hợp lệ với gói đã phát hành.', 'Uploaded workbooks are inspected for hidden metadata, matched against the record ID, and only received when they align with the issued package.')) + '</p>' +
                '</div>' +
                '<label class="ec-dropzone" id="ec-dropzone"><input id="ec-file-input" type="file" accept=".xlsx,.xlsm" multiple style="display:none">' +
                  '<div class="ec-dropzone-icon">\uD83D\uDCE4</div>' +
                  '<strong>' + esc(t('Kéo thả tệp Excel vào đây hoặc nhấn để chọn','Drop workbook here or click to browse')) + '</strong>' +
                  '<p>' + esc(t('Chỉ nhận .xlsx/.xlsm đã được hệ thống cấp phát và còn giữ nguyên metadata kiểm soát.','Only .xlsx/.xlsm files issued by the system with intact governed metadata are accepted.')) + '</p>' +
                '</label>' +
                '<div id="ec-upload-queue">' + renderUploadQueue() + '</div>' +
                (ws.uploadFiles.length ? '<div class="ec-actions"><button class="ec-btn secondary" id="ec-clear-queue">' + esc(t('Xóa danh sách','Clear')) + '</button><button class="ec-btn success" id="ec-receive-all">' + esc(t('Tiếp nhận tệp hợp lệ','Receive valid files')) + '</button></div>' : '') +
              '</section>' +
            '</div>' +
            renderOfflineAside(form, allocation) +
          '</div>' +
        '</div>' +
        '<div class="ec-form-appendix">' +
          renderChecklist(allocation) +
          renderCapaEffectivenessCard(form, allocation) +
          renderRelatedRecords(allocation) +
          renderRetentionCard(form, allocation) +
          renderSlaCard(form, allocation) +
          renderEvidenceActions(allocation) +
          renderApprovalBar(form, allocation) +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderOfflineStep(form, allocation){
  var ctx = allocation.master_context || {};
  var html = '<div class="ec-step" id="ec-step-offline">' +
    '<div class="ec-step-head" data-toggle="ec-step-offline">' +
      '<div class="ec-step-num">2</div>' +
      '<div class="ec-step-title">' + esc(t('Tải & Nộp biểu mẫu Excel', 'Download & submit Excel form')) + '</div>' +
    '</div>' +
    '<div class="ec-step-body">';

  /* context chips */
  html += '<div class="ec-context">';
  html += renderContextChip(t('Mã hồ sơ','Record ID'), allocation.record_id);
  if(ctx.customer_id) html += renderContextChip(t('Khách hàng','Customer'), ctx.customer_id);
  if(ctx.so_number||ctx.jo_number||ctx.wo_number) html += renderContextChip('SO/JO/WO', [ctx.so_number,ctx.jo_number,ctx.wo_number].filter(Boolean).join(' · '));
  if(ctx.part_number) html += renderContextChip('Part/Rev', [ctx.part_number,ctx.part_revision].filter(Boolean).join(' · '));
  var fname = (allocation.offline_package && allocation.offline_package.filename) || allocation.suggested_filename || '';
  if(fname) html += renderContextChip(t('Tên tệp','Filename'), fname);
  html += '</div>';

  /* document reference */
  var sopRef = form.sop_ref || '';
  var blankFile = form.blank_filename || form.blank_path || '';
  if(sopRef || blankFile){
    html += '<div class="ec-doc-ref">' +
      '<div class="ec-doc-ref-title">' + esc(t('Tài liệu liên kết', 'Linked documents')) + '</div>' +
      '<div class="ec-doc-ref-grid">';
    if(sopRef) html += '<div class="ec-doc-ref-item"><small>' + esc(t('Quy trình SOP', 'SOP Reference')) + '</small><a href="#" data-navigate-doc="' + esc(sopRef) + '">' + esc(sopRef) + '</a></div>';
    if(blankFile) html += '<div class="ec-doc-ref-item"><small>' + esc(t('Mẫu biểu mẫu gốc', 'Original template')) + '</small><span>' + esc(blankFile) + '</span></div>';
    html += '<div class="ec-doc-ref-item"><small>' + esc(t('Phiên bản kiểm soát', 'Controlled version')) + '</small><span>' + esc(form.version || 'V0') + '</span></div>';
    if(allocation.template_checksum) html += '<div class="ec-doc-ref-item"><small>SHA-256</small><span class="ec-mono-sm">' + esc(String(allocation.template_checksum).substring(0, 16) + '...') + '</span></div>';
    html += '</div></div>';
  }

  /* download section */
  html += '<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">' +
    '<button class="ec-btn primary lg" id="ec-download-offline">' + esc(t('Tải gói Excel đã kiểm soát','Download governed Excel package')) + '</button>' +
    (fname ? '<button class="ec-btn secondary" id="ec-copy-filename">' + esc(t('Sao chép tên tệp','Copy filename')) + '</button>' : '') +
  '</div>';

  if(allocation.latest_stored_filename){
    html += '<div style="margin:-8px 0 16px"><button class="ec-btn secondary" id="ec-download-received">' + esc(t('Tải bản Excel đã nộp gần nhất', 'Download latest submitted workbook')) + '</button></div>';
  }

  /* upload section */
  html += '<div style="border-top:1px solid var(--ec-border);padding-top:16px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--ec-text);margin-bottom:10px">' + esc(t('Nộp tệp Excel đã điền', 'Submit completed workbook')) + '</div>' +
    '<label class="ec-dropzone" id="ec-dropzone"><input id="ec-file-input" type="file" accept=".xlsx,.xlsm" multiple style="display:none">' +
      '<div class="ec-dropzone-icon">\uD83D\uDCE4</div>' +
      '<strong>' + esc(t('Kéo thả tệp Excel vào đây hoặc nhấn để chọn','Drop workbook here or click to browse')) + '</strong>' +
      '<p>' + esc(t('Chỉ nhận .xlsx/.xlsm đã được hệ thống cấp phát.','Only .xlsx/.xlsm files issued by the system.')) + '</p>' +
    '</label>' +
    '<div id="ec-upload-queue">' + renderUploadQueue() + '</div>' +
    (ws.uploadFiles.length ? '<div class="ec-actions"><button class="ec-btn secondary" id="ec-clear-queue">' + esc(t('Xóa danh sách','Clear')) + '</button><button class="ec-btn success" id="ec-receive-all">' + esc(t('Tiếp nhận tệp hợp lệ','Receive valid files')) + '</button></div>' : '') +
  '</div>';

  html += renderChecklist(allocation);
  html += renderCapaEffectivenessCard(form, allocation);
  html += renderRelatedRecords(allocation);
  html += renderRetentionCard(form, allocation);
  html += renderSlaCard(form, allocation);
  html += renderEvidenceActions(allocation);
  html += renderApprovalBar(form, allocation);
  html += '</div></div>';
  return html;
}

/* ── Upload queue ── */
function formatFileSize(bytes){
  var size = Number(bytes || 0);
  if(!(size > 0)) return '0 KB';
  if(size < 1024) return size + ' B';
  if(size < 1024 * 1024){
    return new Intl.NumberFormat((typeof lang !== 'undefined' && lang === 'en') ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }).format(size / 1024) + ' KB';
  }
  return new Intl.NumberFormat((typeof lang !== 'undefined' && lang === 'en') ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }).format(size / (1024 * 1024)) + ' MB';
}

function renderUploadQueue(){
  if(!ws.uploadFiles.length) return '';
  return ws.uploadFiles.map(function(item){
    var v = item.inspect && item.inspect.verification ? item.inspect.verification : {status:'pending'};
    var status = v.status || item.status || 'pending';
    var badgeClass = status==='verified'?'pass':status==='warning'?'warn':status==='rejected'?'fail':'neutral';
    var alloc = item.inspect && item.inspect.allocation ? item.inspect.allocation : null;
    var md = item.inspect && item.inspect.metadata ? item.inspect.metadata : {};
    return '<div class="ec-file">' +
      '<div class="ec-file-head"><div><div class="ec-file-name">'+esc(item.file.name)+'</div><div class="ec-file-meta">'+esc(formatFileSize(item.file.size))+'</div></div>' +
        '<span class="ec-badge '+badgeClass+'">'+esc(status==='verified'?t('Hợp lệ','Valid'):status==='warning'?t('Cảnh báo','Warning'):status==='rejected'?t('Từ chối','Rejected'):t('Đang kiểm tra','Inspecting'))+'</span>' +
      '</div>' +
      '<div class="ec-file-grid">' +
        '<div class="ec-file-cell"><small>'+esc(t('Mã hồ sơ','Record ID'))+'</small><strong>'+esc((alloc&&alloc.record_id)||md.issued_record_id||'—')+'</strong></div>' +
        '<div class="ec-file-cell"><small>'+esc(t('Biểu mẫu','Form'))+'</small><strong>'+esc(md.form_code||(alloc&&alloc.form_code)||'—')+'</strong></div>' +
        '<div class="ec-file-cell"><small>'+esc(t('Phiên bản','Version'))+'</small><strong>'+esc(md.form_version||'—')+'</strong></div>' +
      '</div>' +
      ((v.warnings||[]).length?'<div class="ec-file-meta" style="color:var(--ec-warning);margin-top:6px">'+esc(v.warnings.join(', '))+'</div>':'') +
      ((v.issues||[]).length?'<div class="ec-file-meta" style="color:var(--ec-danger);margin-top:4px">'+esc(v.issues.join(', '))+'</div>':'') +
    '</div>';
  }).join('');
}

/* ── Field rendering ── */
function fieldStateMeta(field){
  var value = ws.fieldValues[field.id];
  if(field.type === 'table'){
    var rows = ensureTableRows(field);
    var filledRows = rows.filter(function(row){
      return row && Object.keys(row).some(function(key){
        var cell = row[key];
        return !(cell === undefined || cell === null || cell === '');
      });
    }).length;
    if(field.required){
      return {
        tone: filledRows ? 'ready' : 'required',
        label: filledRows
          ? (filledRows + ' ' + t('dòng đã nhập', 'rows entered'))
          : t('Cần nhập dữ liệu', 'Input required')
      };
    }
    return {
      tone: filledRows ? 'optional-filled' : 'optional',
      label: filledRows ? (filledRows + ' ' + t('dòng dữ liệu', 'data rows')) : t('Tùy chọn', 'Optional')
    };
  }
  var complete = fieldHasValue(field, value);
  if(field.required){
    return { tone: complete ? 'ready' : 'required', label: complete ? t('Đã điền', 'Completed') : t('Bắt buộc', 'Required') };
  }
  return { tone: complete ? 'optional-filled' : 'optional', label: complete ? t('Đã điền', 'Completed') : t('Tùy chọn', 'Optional') };
}

function renderTableCell(fieldId, rowIndex, column, value, locked){
  var attrs = ' data-table-field="' + esc(fieldId) + '" data-row-index="' + esc(String(rowIndex)) + '" data-col-id="' + esc(column.id) + '"' + (locked ? ' disabled aria-disabled="true"' : '');
  var placeholder = esc(t(column.placeholder_vi || column.placeholder || '', column.placeholder_en || column.placeholder || ''));
  if(column.type === 'select'){
    return '<select class="ec-select ec-table-input"' + attrs + '><option value="">' + esc(t('Chọn', 'Select')) + '</option>' + (column.options || []).map(function(option){
      var optionValue = typeof option === 'string' ? option : option.value;
      var optionLabel = typeof option === 'string' ? option : t(option.label_vi || option.label || option.value, option.label_en || option.label || option.value);
      return '<option value="' + esc(optionValue) + '"' + (String(value || '') === String(optionValue) ? ' selected' : '') + '>' + esc(optionLabel) + '</option>';
    }).join('') + '</select>';
  }
  if(column.type === 'checkbox'){
    return '<label class="ec-check ec-table-check"><input type="checkbox"' + attrs + (value === true || value === 'true' || value === 1 ? ' checked' : '') + '><span>' + esc(t('Đạt', 'Checked')) + '</span></label>';
  }
  if(column.type === 'textarea'){
    return '<textarea class="ec-textarea ec-table-textarea"' + attrs + ' placeholder="' + placeholder + '"' + (locked ? ' readonly' : '') + '>' + esc(value || '') + '</textarea>';
  }
  var inputType = column.type === 'date' ? 'date' : column.type === 'time' ? 'time' : column.type === 'number' ? 'number' : 'text';
  var extra = '';
  if(column.min !== undefined) extra += ' min="' + esc(String(column.min)) + '"';
  if(column.max !== undefined) extra += ' max="' + esc(String(column.max)) + '"';
  if(column.step !== undefined) extra += ' step="' + esc(String(column.step)) + '"';
  return '<input class="ec-input ec-table-input" type="' + inputType + '"' + attrs + extra + ' value="' + esc(value || '') + '" placeholder="' + placeholder + '"' + (locked ? ' readonly' : '') + '>';
}

function renderTableField(field, locked){
  var rows = ensureTableRows(field);
  var columns = Array.isArray(field.columns) ? field.columns : [];
  var minRows = Math.max(1, Number(field.min_rows || 1) || 1);
  var maxRows = Math.max(minRows, Number(field.max_rows || 50) || 50);
  return '<div class="ec-table-field" id="ec-f-' + esc(field.id) + '">' +
    '<div class="ec-table-toolbar">' +
      '<div class="ec-table-meta">' +
        '<strong>' + esc(rows.length + ' ' + t('dòng', 'rows')) + '</strong>' +
        '<span>' + esc(t('Giữ cấu trúc bảng theo đúng biểu mẫu gốc để đồng bộ dữ liệu, bằng chứng và xuất hồ sơ.', 'Keep the original table structure so data, evidence, and exports stay synchronized.')) + '</span>' +
      '</div>' +
      '<div class="ec-table-actions">' +
        '<button type="button" class="ec-btn secondary" data-table-add="' + esc(field.id) + '"' + ((locked || rows.length >= maxRows) ? ' disabled' : '') + '>' + esc(t('Thêm dòng', 'Add row')) + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="ec-table-scroll">' +
      '<table class="ec-data-table">' +
        '<thead><tr><th>#</th>' + columns.map(function(column){
          return '<th>' + esc(t(column.label_vi || column.label || column.id, column.label_en || column.label || column.id)) + (column.required ? ' *' : '') + '</th>';
        }).join('') + '<th>' + esc(t('Tác vụ', 'Action')) + '</th></tr></thead>' +
        '<tbody>' + rows.map(function(row, rowIndex){
          return '<tr>' +
            '<td class="ec-data-table-index">' + esc(String(rowIndex + 1)) + '</td>' +
            columns.map(function(column){
              return '<td>' + renderTableCell(field.id, rowIndex, column, row ? row[column.id] : '', locked) + '</td>';
            }).join('') +
            '<td class="ec-data-table-actions"><button type="button" class="ec-btn ghost" data-table-remove="' + esc(field.id) + '" data-row-index="' + esc(String(rowIndex)) + '"' + ((locked || rows.length <= minRows) ? ' disabled' : '') + '>' + esc(t('Xóa', 'Remove')) + '</button></td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

function renderField(field){
  var cls='ec-field';
  if(field.width==='full'||field.type==='textarea'||field.type==='multi_select'||field.type==='table') cls+=' full';
  else if(field.width==='third') cls+=' third';
  var allocation = selectedAllocation();
  var locked = isLockedContextField(field.id, allocation);
  var label=t(field.label_vi||field.label||field.id,field.label_en||field.label||field.id);
  var req=field.required?'<span class="req">*</span>':'';
  var lockHint=locked?'<span class="ec-lock-badge" aria-hidden="true">'+esc(t('Khóa ngữ cảnh','Context locked'))+'</span>':'';
  var state = fieldStateMeta(field);
  var note=field.helper_vi||field.helper||field.note_vi||field.note||'';
  var val=ws.fieldValues[field.id];
  if(val===undefined||val===null) val='';

  var lockAttrs = locked ? ' disabled aria-disabled="true"' : '';
  var lockReadOnly = locked ? ' readonly aria-disabled="true"' : '';
  var h='<div class="'+cls+(locked?' ec-field-locked':'')+'"><div class="ec-field-panel"><div class="ec-field-head"><label class="ec-label" for="ec-f-'+esc(field.id)+'">'+esc(label)+req+lockHint+'</label><span class="ec-field-state '+esc(state.tone)+'">'+esc(state.label)+'</span></div><div class="ec-field-control">';
  if(field.type==='lookup'){
    h+='<div id="ec-f-'+esc(field.id)+'"'+(locked?' data-locked="1"':'')+'></div>';
  } else if(field.type==='table'){
    h+=renderTableField(field, locked);
  } else if(field.type==='select'){
    h+='<select class="ec-select" id="ec-f-'+esc(field.id)+'"'+lockAttrs+'><option value="">'+esc(t('Chọn','Select'))+'</option>'+(field.options||[]).map(function(o){var v=typeof o==='string'?o:o.value;var txt=typeof o==='string'?o:(o.label_vi||o.label||o.value);return '<option value="'+esc(v)+'"'+(String(val)===String(v)?' selected':'')+'>'+esc(t(txt,o.label_en||o.label||v))+'</option>';}).join('')+'</select>';
  } else if(field.type==='multi_select'){
    var cur=Array.isArray(val)?val:[];
    h+='<div class="ec-multi">'+(field.options||[]).map(function(o){var v=typeof o==='string'?o:o.value;var txt=typeof o==='string'?o:(o.label_vi||o.label||o.value);return '<label class="ec-check"><input type="checkbox" data-multi="'+esc(field.id)+'" value="'+esc(v)+'"'+(cur.indexOf(v)>=0?' checked':'')+lockAttrs+'><span>'+esc(t(txt,o.label_en||o.label||v))+'</span></label>';}).join('')+'</div>';
  } else if(field.type==='checkbox'){
    h+='<label class="ec-check"><input id="ec-f-'+esc(field.id)+'" type="checkbox"'+(val===true||val==='true'||val===1?' checked':'')+lockAttrs+'><span>'+esc(t(field.checkbox_label_vi||field.label_vi||field.id,field.checkbox_label_en||field.label_en||field.id))+'</span></label>';
  } else if(field.type==='textarea'){
    h+='<textarea class="ec-textarea" id="ec-f-'+esc(field.id)+'"'+lockReadOnly+' placeholder="'+esc(t(field.placeholder_vi||'',field.placeholder_en||''))+'">'+esc(val)+'</textarea>';
  } else {
    var type=field.type==='date'?'date':field.type==='time'?'time':field.type==='number'?'number':'text';
    h+='<input class="ec-input" id="ec-f-'+esc(field.id)+'" type="'+type+'"'+lockReadOnly+' value="'+esc(val)+'" placeholder="'+esc(t(field.placeholder_vi||'',field.placeholder_en||''))+'">';
  }
  h+='</div>';
  if(note) h+='<div class="ec-note">'+esc(t(note,field.helper_en||field.note_en||note))+'</div>';
  h+='</div></div>';
  return h;
}

function renderContextChip(label,value){
  return '<div class="ec-context-chip"><small>'+esc(label)+'</small><strong>'+esc(value||'—')+'</strong></div>';
}

/* ── Signature helpers ── */
function reviewConfig(schema){
  var cfg = schema && typeof schema.evidence_review === 'object' && schema.evidence_review ? schema.evidence_review : {};
  var mode = String(cfg.approval_mode || 'serial').toLowerCase() === 'parallel' ? 'parallel' : 'serial';
  var rolesAllowed = Array.isArray(cfg.roles_allowed) && cfg.roles_allowed.length
    ? cfg.roles_allowed
    : (Array.isArray(schema && schema.roles_allowed) ? schema.roles_allowed : []);
  rolesAllowed = rolesAllowed.map(function(role){ return String(role || '').trim().toLowerCase(); }).filter(Boolean);
  rolesAllowed = rolesAllowed.filter(function(role, idx){ return rolesAllowed.indexOf(role) === idx; });
  var minimumApprovals = Number(cfg.minimum_approvals || cfg.min_approvals || 0);
  if(mode === 'parallel'){
    if(minimumApprovals < 1) minimumApprovals = 2;
    if(rolesAllowed.length) minimumApprovals = Math.min(minimumApprovals, rolesAllowed.length);
    if(minimumApprovals < 1) minimumApprovals = 1;
  } else {
    minimumApprovals = 1;
  }
  return {
    approvalMode: mode,
    minimumApprovals: minimumApprovals,
    rolesAllowed: rolesAllowed,
    labelVi: String(cfg.label_vi || (mode === 'parallel' ? 'Phê duyệt song song' : 'Phê duyệt tuần tự')),
    labelEn: String(cfg.label_en || (mode === 'parallel' ? 'Parallel approval' : 'Serial approval'))
  };
}
function approvalSummary(allocation, schema){
  var cfg = reviewConfig(schema || {});
  var raw = allocation && allocation.approval_summary && typeof allocation.approval_summary === 'object' ? allocation.approval_summary : {};
  var approvers = Array.isArray(raw.approvers) ? raw.approvers.slice() : [];
  if(!approvers.length && allocation && allocation.approved_by){
    approvers = [{
      username: allocation.approved_by,
      display_name: allocation.approved_by,
      approved_at: allocation.approved_at || '',
      reason: allocation.approval_reason || '',
      roles: []
    }];
  }
  var required = Number(raw.minimum_approvals || cfg.minimumApprovals || 1);
  if(String(raw.approval_mode || cfg.approvalMode || 'serial') === 'parallel' && required < 1) required = 2;
  if(required < 1) required = 1;
  var collected = Number(raw.collected_approvals);
  if(!(collected > 0) && approvers.length) collected = approvers.length;
  var currentUsername = String(user().username || '').trim().toLowerCase();
  return {
    approvalMode: String(raw.approval_mode || cfg.approvalMode || 'serial'),
    labelVi: String(raw.label_vi || cfg.labelVi),
    labelEn: String(raw.label_en || cfg.labelEn),
    rolesAllowed: Array.isArray(raw.roles_allowed) && raw.roles_allowed.length ? raw.roles_allowed : cfg.rolesAllowed,
    minimumApprovals: required,
    collectedApprovals: collected,
    remainingApprovals: Math.max(0, required - collected),
    isComplete: raw.is_complete === true || collected >= required,
    approvers: approvers,
    currentUserApproved: approvers.some(function(item){
      return String(item && item.username || '').trim().toLowerCase() === currentUsername;
    })
  };
}
function approvalSteps(schema){
  if(Array.isArray(schema.approval_flow)&&schema.approval_flow.length) return schema.approval_flow.filter(function(s){return s&&(s.signature_block_id||s.id);}).map(function(s){return {id:String(s.signature_block_id||s.id),requiredOnSubmit:s.required_on_submit===true||s.requiredOnSubmit===true};});
  return (schema.signature_blocks||[]).filter(function(b){return b&&b.id;}).map(function(b){return {id:String(b.id),requiredOnSubmit:b.required_on_submit===true||b.requiredOnSubmit===true};});
}
function canSignBlock(schema,blockId){
  var flow=approvalSteps(schema);
  var idx=flow.findIndex(function(s){return s.id===blockId;});
  if(idx<=0) return true;
  for(var i=0;i<idx;i++) if(!ws.signatures[flow[i].id]) return false;
  return true;
}
function currentApprovalState(schema){
  var flow=approvalSteps(schema);
  var last='draft';
  flow.forEach(function(s){if(ws.signatures[s.id]) last=s.id;});
  return last;
}

/* ── Approval bar ── */
function renderApprovalBarLegacy(allocation){
  if(!allocation) return '';
  var status=String(allocation.status||'').toLowerCase();
  if(status!=='submitted'&&status!=='received'&&status!=='in_review'&&status!=='approved'&&status!=='rejected') return '';
  var canApprove=userHasApproveRole();
  var html='<div class="ec-approval '+status+'">';

  if(status==='submitted' || status==='received'){
    html+='<div class="ec-approval-text" style="color:var(--ec-warning)">'+esc(t('Chứng cứ đã nộp — sẵn sàng gửi duyệt','Evidence submitted — ready for review'))+'</div>';
    html+='<button class="ec-btn primary" id="ec-submit-review" style="background:var(--ec-warning)">'+esc(t('Gửi duyệt','Submit for review'))+'</button>';
  } else if(status==='in_review'){
    html+='<div class="ec-approval-text" style="color:#c2410c">'+esc(t('Đang chờ xem xét và phê duyệt','Pending review and approval'))+'</div>';
    if(canApprove){
      html+='<button class="ec-btn danger" id="ec-reject">'+esc(t('Từ chối','Reject'))+'</button>';
      html+='<button class="ec-btn success" id="ec-approve">'+esc(t('Duyệt','Approve'))+'</button>';
    } else {
      html+='<span style="font-size:11px;color:var(--ec-text-muted)">'+esc(t('Bạn không có quyền duyệt.','You do not have approval authority.'))+'</span>';
    }
  } else if(status==='approved'){
    html+='<div class="ec-approval-text" style="color:var(--ec-success)">\u2713 '+esc(t('Đã phê duyệt','Approved'))+(allocation.approved_by?' — '+esc(allocation.approved_by):'')+(allocation.approved_at?' · '+esc(new Date(allocation.approved_at).toLocaleString()):'')+'</div>';
    if(canApprove) html+='<button class="ec-btn ghost" id="ec-reopen">'+esc(t('Mở lại','Reopen'))+'</button>';
  } else if(status==='rejected'){
    html+='<div class="ec-approval-text" style="color:var(--ec-danger)">\u2717 '+esc(t('Bị từ chối','Rejected'))+(allocation.rejected_by?' — '+esc(allocation.rejected_by):'')+(allocation.rejection_reason?': '+esc(allocation.rejection_reason):'')+'</div>';
    if(canApprove) html+='<button class="ec-btn ghost" id="ec-reopen">'+esc(t('Mở lại','Reopen'))+'</button>';
  }

  html+='</div>';
  return html;
}

/* ── History ── */
function renderApprovalBar(form, allocation){
  if(arguments.length < 2 || (form && form.allocation_id && !allocation)){
    allocation = form || null;
    var st = window._ecState || {};
    form = st.formMap && st.selectedFormCode ? st.formMap[st.selectedFormCode] : null;
  }
  if(!allocation) return '';
  var schema = form && form.schema ? form.schema : (ws.schema || {});
  var status=String(allocation.status||'').toLowerCase();
  if(status!=='submitted'&&status!=='received'&&status!=='in_review'&&status!=='approved'&&status!=='rejected') return '';
  var canApprove=userHasApproveRole(schema);
  var review = approvalSummary(allocation, schema);
  var isParallel = review.approvalMode === 'parallel';
  var progressBadges = '';
  var approverList = '';
  if(isParallel){
    progressBadges =
      '<div class="ec-approval-meta">' +
        '<span class="ec-badge ' + (review.isComplete ? 'pass' : 'info') + '">' + esc(review.collectedApprovals + '/' + review.minimumApprovals + ' ' + t('phê duyệt', 'approvals')) + '</span>' +
        '<span class="ec-badge neutral">' + esc(t(review.labelVi, review.labelEn)) + '</span>' +
      '</div>';
    if(review.approvers.length){
      approverList = '<div class="ec-approval-approvers">' + review.approvers.map(function(item){
        var name = item.display_name || item.username || '—';
        var stamp = item.approved_at ? formatLocalDateTime(item.approved_at, true) : '';
        return '<span class="ec-approval-chip">' + esc(name) + (stamp ? '<small>' + esc(stamp) + '</small>' : '') + '</span>';
      }).join('') + '</div>';
    }
  }

  var html='<div class="ec-approval '+status+'"><div class="ec-approval-copy">';

  if(status==='submitted' || status==='received'){
    html+='<div class="ec-approval-text" style="color:var(--ec-warning)">'+esc(isParallel ? t('Chứng cứ đã nộp — sẵn sàng mở vòng phê duyệt song song','Evidence submitted — ready to start parallel approval') : t('Chứng cứ đã nộp — sẵn sàng gửi duyệt','Evidence submitted — ready for review'))+'</div>';
    html+=progressBadges+approverList+'</div>';
    html+='<button class="ec-btn primary" id="ec-submit-review" style="background:var(--ec-warning)">'+esc(t('Gửi duyệt','Submit for review'))+'</button>';
  } else if(status==='in_review'){
    html+='<div class="ec-approval-text" style="color:#c2410c">'+esc(isParallel ? (review.remainingApprovals > 0 ? t('Đang chờ đủ số phê duyệt bắt buộc để hoàn tất hồ sơ','Waiting for the required approvals to complete the record') : t('Đã đủ số phê duyệt, hệ thống đang chốt hồ sơ','Required approvals collected, finalizing the record')) : t('Đang chờ xem xét và phê duyệt','Pending review and approval'))+'</div>';
    html+=progressBadges+approverList+'</div>';
    if(canApprove){
      html+='<button class="ec-btn danger" id="ec-reject">'+esc(t('Từ chối','Reject'))+'</button>';
      html+='<button class="ec-btn success" id="ec-approve">'+esc(isParallel ? (review.currentUserApproved ? t('Cập nhật phê duyệt của tôi','Update my approval') : t('Ghi nhận phê duyệt của tôi','Record my approval')) : t('Duyệt','Approve'))+'</button>';
    } else {
      html+='<span style="font-size:11px;color:var(--ec-text-muted)">'+esc(t('Bạn không có quyền duyệt.','You do not have approval authority.'))+'</span>';
    }
  } else if(status==='approved'){
    html+='<div class="ec-approval-text" style="color:var(--ec-success)">\u2713 '+esc(isParallel ? t('Đã hoàn tất phê duyệt song song','Parallel approval completed') : t('Đã phê duyệt','Approved'))+(allocation.approved_by?' — '+esc(allocation.approved_by):'')+(allocation.approved_at?' · '+esc(formatLocalDateTime(allocation.approved_at, true)):'')+'</div>';
    html+=progressBadges+approverList+'</div>';
    if(canApprove) html+='<button class="ec-btn ghost" id="ec-reopen">'+esc(t('Mở lại','Reopen'))+'</button>';
  } else if(status==='rejected'){
    html+='<div class="ec-approval-text" style="color:var(--ec-danger)">\u2717 '+esc(t('Bị từ chối','Rejected'))+(allocation.rejected_by?' — '+esc(allocation.rejected_by):'')+(allocation.rejection_reason?': '+esc(allocation.rejection_reason):'')+'</div>';
    html+=progressBadges+approverList+'</div>';
    if(canApprove) html+='<button class="ec-btn ghost" id="ec-reopen">'+esc(t('Mở lại','Reopen'))+'</button>';
  }

  html+='</div>';
  return html;
}

function loadHistory(form){
  var el=document.getElementById('ec-history-content');
  if(!el) return;
  api('form_fill_history',{form_code:form.form_code,page:1,page_size:10},'GET').then(function(r){
    var entries=(r&&r.ok&&Array.isArray(r.entries))?r.entries:[];
    if(!entries.length){ el.innerHTML='<div style="text-align:center;color:var(--ec-text-muted);font-size:12px;padding:16px">'+esc(t('Chưa có bản nộp nào.','No submissions yet.'))+'</div>'; return; }
    el.innerHTML='<table class="ec-table"><thead><tr><th>'+esc(t('Mã hồ sơ','Record ID'))+'</th><th>'+esc(t('Người nộp','Submitted by'))+'</th><th>'+esc(t('Ngày','Date'))+'</th><th>'+esc(t('Trạng thái','Status'))+'</th></tr></thead><tbody>'+entries.map(function(e){
      var dt=e.submitted_at||e.created_at||'';
      return '<tr><td class="mono">'+esc(e.record_id||'—')+'</td><td>'+esc(e.submitted_by||'—')+'</td><td>'+esc(dt?new Date(dt).toLocaleString():'—')+'</td><td>'+renderHistoryStatusBadge(e._status||e.approval_state||'submitted')+'</td></tr>';
    }).join('')+'</tbody></table>';
  }).catch(function(){ el.innerHTML='<div style="color:var(--ec-text-muted);font-size:12px">'+esc(t('Không thể tải lịch sử.','Could not load history.'))+'</div>'; });
}

/* ══════════════════════════════════════════════════════
   EVENT BINDING
   ══════════════════════════════════════════════════════ */

function loadHistoryLegacy(form){
  var el=document.getElementById('ec-history-content');
  if(!el) return;
  api('form_fill_history',{form_code:form.form_code,page:1,page_size:10},'GET').then(function(r){
    var entries=(r&&r.ok&&Array.isArray(r.entries))?r.entries:[];
    entries.sort(function(a,b){
      var aTime = Date.parse(a.submitted_at || a.created_at || '') || 0;
      var bTime = Date.parse(b.submitted_at || b.created_at || '') || 0;
      return bTime - aTime;
    });
    if(!entries.length){
      el.innerHTML='<div style="text-align:center;color:var(--ec-text-muted);font-size:12px;padding:16px">'+esc(t('ChÆ°a cÃ³ báº£n ná»™p nÃ o.','No submissions yet.'))+'</div>';
      return;
    }
    el.innerHTML='<table class="ec-table"><thead><tr><th>'+esc(t('MÃ£ há»“ sÆ¡','Record ID'))+'</th><th>'+esc(t('NgÆ°á»i ná»™p','Submitted by'))+'</th><th>'+esc(t('NgÃ y','Date'))+'</th><th>'+esc(t('Tráº¡ng thÃ¡i','Status'))+'</th></tr></thead><tbody>'+entries.map(function(e){
      var dt=e.submitted_at||e.created_at||'';
      return '<tr><td class="mono">'+esc(e.record_id||'â€”')+'</td><td>'+esc(e.submitted_by||'â€”')+'</td><td>'+esc(dt?formatLocalDateTime(dt, true):'â€”')+'</td><td>'+renderHistoryStatusBadge(e._status||e.approval_state||'submitted')+'</td></tr>';
    }).join('')+'</tbody></table>';
  }).catch(function(){
    el.innerHTML='<div class="ec-inline-alert error"><strong>' + esc(t('KhÃ´ng táº£i Ä‘Æ°á»£c lá»‹ch sá»­ ná»™p', 'Could not load submission history')) + '</strong><span>' + esc(t('HÃ£y thá»­ táº£i láº¡i Ä‘á»ƒ Ä‘á»“ng bá»™ dá»¯ liá»‡u má»›i nháº¥t tá»« mÃ¡y chá»§.', 'Try reloading to sync the latest data from the server.')) + '</span><small><button type="button" class="ec-btn secondary" id="ec-history-retry">' + esc(t('Táº£i láº¡i lá»‹ch sá»­', 'Reload history')) + '</button></small></div>';
    var retry = document.getElementById('ec-history-retry');
    if(retry) retry.onclick = function(){ loadHistory(form); };
  });
}

function searchRelatedAllocations(allocation){
  var state = relatedState(allocation);
  var query = String(state.query || '').trim();
  if(query.length < 2){
    state.error = t('Hãy nhập ít nhất 2 ký tự để tìm hồ sơ.', 'Enter at least 2 characters to search.');
    state.results = [];
    return Promise.resolve([]);
  }
  state.loading = true;
  state.error = '';
  state.results = [];
  var req = window.AllocationTracker && typeof window.AllocationTracker.getHistory === 'function'
    ? window.AllocationTracker.getHistory({ search: query, page_size: 12 })
    : api('record_id_history', { search: query, page_size: 12 }, 'POST');
  return req.then(function(resp){
    var entries = resp && Array.isArray(resp.entries) ? resp.entries : [];
    state.results = entries.filter(function(item){
      return item && item.allocation_id && item.allocation_id !== allocation.allocation_id;
    });
    if(!state.results.length) state.error = t('Không tìm thấy hồ sơ phù hợp.', 'No matching records were found.');
    return state.results;
  }).catch(function(){
    state.error = t('Không thể tìm hồ sơ liên quan.', 'Could not search related records.');
    state.results = [];
    return [];
  }).finally(function(){
    state.loading = false;
  });
}

function openLinkedAllocation(formCode, allocationId){
  if(!allocationId) return;
  if(typeof window._fhOpenFormWorkspace === 'function'){
    window._fhOpenFormWorkspace(formCode || '', allocationId || '');
    return;
  }
  var st = window._fhState || window._ecState || null;
  if(st){
    st.pendingFillSelection = { formCode: formCode || '', allocationId: allocationId };
    st.selectedFormCode = formCode || st.selectedFormCode || '';
    st.selectedAllocationId = allocationId;
  }
  if(typeof window._fhSwitchTab === 'function'){
    window._fhSwitchTab('fill-download');
    return;
  }
  if(typeof window.renderOnlineForms === 'function') window.renderOnlineForms(formCode || '');
}

function bindRelatedActions(form, allocation, container){
  if(!allocation) return;
  var state = relatedState(allocation);

  var refreshBtn = document.getElementById('ec-related-refresh');
  if(refreshBtn) refreshBtn.onclick = function(){
    loadRelatedRecords(allocation, true).then(function(){
      renderWorkspace(form, allocation, container);
      bindWorkspace(form, allocation, container);
    });
  };

  var queryEl = document.getElementById('ec-related-query');
  if(queryEl){
    queryEl.oninput = function(){ state.query = queryEl.value; };
    queryEl.onkeydown = function(event){
      if(event.key === 'Enter'){
        event.preventDefault();
        searchRelatedAllocations(allocation).then(function(){
          renderWorkspace(form, allocation, container);
          bindWorkspace(form, allocation, container);
        });
      }
    };
  }

  var relationEl = document.getElementById('ec-related-relation');
  if(relationEl) relationEl.onchange = function(){ state.relation = relationEl.value || 'related'; };

  var noteEl = document.getElementById('ec-related-note');
  if(noteEl) noteEl.oninput = function(){ state.note = noteEl.value; };

  var searchBtn = document.getElementById('ec-related-search');
  if(searchBtn) searchBtn.onclick = function(){
    searchBtn.disabled = true;
    searchRelatedAllocations(allocation).then(function(){
      renderWorkspace(form, allocation, container);
      bindWorkspace(form, allocation, container);
    }).finally(function(){
      searchBtn.disabled = false;
    });
  };

  Array.prototype.forEach.call(container.querySelectorAll('[data-related-open]'), function(btn){
    btn.onclick = function(){
      openLinkedAllocation(btn.getAttribute('data-related-form') || '', btn.getAttribute('data-related-open') || '');
    };
  });

  Array.prototype.forEach.call(container.querySelectorAll('[data-related-add]'), function(btn){
    btn.onclick = function(){
      var targetId = btn.getAttribute('data-related-add') || '';
      if(!targetId) return;
      btn.disabled = true;
      api('evidence_link_add', {
        allocation_id: allocation.allocation_id,
        target_allocation_id: targetId,
        relation_type: state.relation || 'related',
        notes: String(state.note || '').trim()
      }, 'POST').then(function(resp){
        if(resp && resp.ok){
          ws.relatedCache[allocation.allocation_id] = { links: Array.isArray(resp.links) ? resp.links : [], error: '' };
          state.results = state.results.filter(function(item){ return item.allocation_id !== targetId; });
          toast(t('Đã liên kết hồ sơ liên quan.', 'Related record linked.'), 'success');
        } else {
          toast(t('Không thể liên kết hồ sơ.', 'Could not link the record.'), 'error');
        }
      }).catch(function(){
        toast(t('Không thể liên kết hồ sơ.', 'Could not link the record.'), 'error');
      }).finally(function(){
        renderWorkspace(form, allocation, container);
        bindWorkspace(form, allocation, container);
      });
    };
  });

  Array.prototype.forEach.call(container.querySelectorAll('[data-related-remove]'), function(btn){
    btn.onclick = function(){
      var linkId = btn.getAttribute('data-related-remove') || '';
      if(!linkId) return;
      if(!confirm(t('Gỡ liên kết hồ sơ này?', 'Remove this record link?'))) return;
      btn.disabled = true;
      api('evidence_link_remove', {
        allocation_id: allocation.allocation_id,
        link_id: linkId
      }, 'POST').then(function(resp){
        if(resp && resp.ok){
          ws.relatedCache[allocation.allocation_id] = { links: Array.isArray(resp.links) ? resp.links : [], error: '' };
          toast(t('Đã gỡ liên kết hồ sơ.', 'Record link removed.'), 'success');
        } else {
          toast(t('Không thể gỡ liên kết.', 'Could not remove the link.'), 'error');
        }
      }).catch(function(){
        toast(t('Không thể gỡ liên kết.', 'Could not remove the link.'), 'error');
      }).finally(function(){
        renderWorkspace(form, allocation, container);
        bindWorkspace(form, allocation, container);
      });
    };
  });
}

function bindRetentionActions(form, allocation, container){
  if(!allocation) return;
  var data = retentionData(allocation);
  if(!data || !data.canManage) return;
  var state = retentionEditorState(allocation);

  var yearsEl = document.getElementById('ec-retention-years');
  if(yearsEl) yearsEl.oninput = function(){ state.years = Math.max(1, Number(yearsEl.value || 1) || 1); };

  var triggerEl = document.getElementById('ec-retention-trigger');
  if(triggerEl) triggerEl.onchange = function(){ state.trigger = triggerEl.value || 'approved'; };

  var dispositionEl = document.getElementById('ec-retention-disposition');
  if(dispositionEl) dispositionEl.onchange = function(){ state.disposition = dispositionEl.value || 'review_before_disposal'; };

  var saveBtn = document.getElementById('ec-retention-save');
  if(saveBtn) saveBtn.onclick = function(){
    saveBtn.disabled = true;
    api('evidence_retention_policy_save', {
      record_type: allocation.record_type || detectRecordType(form),
      retention_years: state.years,
      retention_trigger: state.trigger,
      disposition_action: state.disposition
    }, 'POST').then(function(resp){
      if(resp && resp.ok){
        delete ws.retentionCache[allocation.allocation_id];
        return loadRetentionStatus(allocation, true).then(function(){
          toast(t('Đã lưu chính sách lưu giữ.', 'Retention policy saved.'), 'success');
        });
      }
      toast(t('Không thể lưu chính sách lưu giữ.', 'Could not save retention policy.'), 'error');
      return null;
    }).catch(function(){
      toast(t('Không thể lưu chính sách lưu giữ.', 'Could not save retention policy.'), 'error');
    }).finally(function(){
      renderWorkspace(form, allocation, container);
      bindWorkspace(form, allocation, container);
    });
  };

  var holdBtn = document.getElementById('ec-retention-hold');
  if(holdBtn) holdBtn.onclick = function(){
    var action = holdBtn.getAttribute('data-hold-action') || 'set';
    askTextDialog({
      title: action === 'set' ? t('Lý do legal hold', 'Legal hold reason') : t('Lý do gỡ legal hold', 'Legal hold release reason'),
      message: action === 'set'
        ? t('Nhập lý do giữ hồ sơ này khỏi quy trình tiêu hủy hoặc disposition.', 'Enter the reason for placing this record on legal hold.')
        : t('Nhập lý do gỡ legal hold khỏi hồ sơ này.', 'Enter the reason for releasing legal hold for this record.'),
      required: true,
      multiline: true,
      confirmLabel: action === 'set' ? t('Đặt hold', 'Set hold') : t('Gỡ hold', 'Release hold')
    }).then(function(reason){
      if(!reason) return null;
      holdBtn.disabled = true;
      return api('evidence_retention_hold', {
        allocation_id: allocation.allocation_id,
        action: action,
        reason: reason
      }, 'POST').then(function(resp){
        if(resp && resp.ok){
          ws.retentionCache[allocation.allocation_id] = { retention: resp.retention || null, canManage: true, error: '' };
          toast(action === 'set' ? t('Đã đặt legal hold.', 'Legal hold set.') : t('Đã gỡ legal hold.', 'Legal hold released.'), 'success');
        } else {
          toast(t('Không thể cập nhật legal hold.', 'Could not update legal hold.'), 'error');
        }
      }).catch(function(){
        toast(t('Không thể cập nhật legal hold.', 'Could not update legal hold.'), 'error');
      }).finally(function(){
        renderWorkspace(form, allocation, container);
        bindWorkspace(form, allocation, container);
      });
    });
  };
}

function bindSlaActions(form, allocation, container){
  if(!allocation) return;
  var data = slaData(allocation);
  if(!data || !data.canManage) return;
  var state = slaEditorState(allocation);

  var reviewEl = document.getElementById('ec-sla-review-hours');
  if(reviewEl) reviewEl.oninput = function(){
    state.reviewHours = Math.max(1, Number(reviewEl.value || 1) || 1);
    if(state.warnHours > state.reviewHours) state.warnHours = state.reviewHours;
  };

  var warnEl = document.getElementById('ec-sla-warn-hours');
  if(warnEl) warnEl.oninput = function(){
    state.warnHours = Math.max(1, Math.min(Number(reviewEl && reviewEl.value || state.reviewHours || 72) || 72, Number(warnEl.value || 1) || 1));
  };

  var escalateEl = document.getElementById('ec-sla-escalate-hours');
  if(escalateEl) escalateEl.oninput = function(){
    state.escalateHours = Math.max(1, Number(escalateEl.value || 1) || 1);
  };

  var rolesEl = document.getElementById('ec-sla-roles');
  if(rolesEl) rolesEl.oninput = function(){ state.escalationRoles = rolesEl.value || ''; };

  var saveBtn = document.getElementById('ec-sla-save');
  if(saveBtn) saveBtn.onclick = function(){
    saveBtn.disabled = true;
    api('evidence_sla_policy_save', {
      record_type: allocation.record_type || detectRecordType(form),
      review_hours: state.reviewHours,
      warn_hours_before_due: state.warnHours,
      escalate_hours_after_due: state.escalateHours,
      escalation_roles: String(state.escalationRoles || '').split(',').map(function(role){ return role.trim(); }).filter(Boolean)
    }, 'POST').then(function(resp){
      if(resp && resp.ok){
        delete ws.slaCache[allocation.allocation_id];
        return loadSlaStatus(allocation, true).then(function(){
          toast(t('Đã lưu chính sách SLA duyệt.', 'Review SLA policy saved.'), 'success');
        });
      }
      toast(t('Không thể lưu chính sách SLA duyệt.', 'Could not save review SLA policy.'), 'error');
      return null;
    }).catch(function(){
      toast(t('Không thể lưu chính sách SLA duyệt.', 'Could not save review SLA policy.'), 'error');
    }).finally(function(){
      renderWorkspace(form, allocation, container);
      bindWorkspace(form, allocation, container);
    });
  };
}

function bindWorkspace(form, allocation, container){
  /* step toggles */
  if(!container._ecToggleBound){
    container.addEventListener('click', function(e){
      var toggle=e.target.closest('[data-toggle]');
      if(toggle){
        var stepEl=document.getElementById(toggle.getAttribute('data-toggle'));
        if(stepEl) stepEl.classList.toggle('collapsed');
        return;
      }
      var sectionBtn = e.target.closest('[data-scroll-section]');
      if(sectionBtn){
        var target = document.getElementById(sectionBtn.getAttribute('data-scroll-section'));
        if(target && typeof target.scrollIntoView === 'function'){
          target.scrollIntoView({ behavior:'smooth', block:'start' });
        }
      }
    });
    container._ecToggleBound = true;
  }

  /* allocate */
  var deptEl=document.getElementById('ec-alloc-dept');
  if(deptEl) deptEl.onchange=function(){ws.allocDept=deptEl.value;};
  var notesEl=document.getElementById('ec-alloc-notes');
  if(notesEl) notesEl.oninput=function(){ws.allocNotes=notesEl.value;};
  var allocBtn=document.getElementById('ec-alloc-btn');
  if(allocBtn) allocBtn.onclick=function(){ doAllocate(form, container); };

  var exportBtn=document.getElementById('ec-export-pack');
  if(exportBtn && allocation) exportBtn.onclick=function(){
    var url='api.php?action=evidence_pack_export&allocation_id='+encodeURIComponent(allocation.allocation_id||'');
    var link=document.createElement('a');
    link.href=url;
    link.target='_blank';
    link.rel='noopener';
    document.body.appendChild(link);
    link.click();
    if(link.parentNode) link.parentNode.removeChild(link);
  };
  bindRelatedActions(form, allocation, container);
  bindRetentionActions(form, allocation, container);
  bindSlaActions(form, allocation, container);

  /* online form */
  if(allocation && form.online !== false){
    if(standaloneOnlinePath(form)){
      bindStandaloneRuntime(form, allocation, container);
    } else {
      bindFormFields(form, allocation);
      bindSignatures(form);
      var saveDraftBtn=document.getElementById('ec-save-draft');
      if(saveDraftBtn) saveDraftBtn.onclick=function(){ saveDraft(form,allocation); };
      var resetBtn=document.getElementById('ec-reset-form');
      if(resetBtn) resetBtn.onclick=function(){ if(!confirm(t('Xóa dữ liệu đang nhập?','Clear form data?'))) return; ws.fieldValues={}; ws.signatures={}; clearDraft(form,allocation); renderWorkspace(form,allocation,container); bindWorkspace(form,allocation,container); };
      var submitBtn=document.getElementById('ec-submit-online');
      if(submitBtn) submitBtn.onclick=function(){ doSubmitOnline(form,allocation,submitBtn,container); };
    }
    bindApprovalActions(form,allocation,container);
  }

  /* offline form */
  if(allocation && form.online === false){
    bindOffline(form, allocation, container);
  }
}

function bindStandaloneRuntime(form, allocation, container){
  var frameId = standaloneRuntimeFrameId(form, allocation);
  var iframe = document.getElementById(frameId);
  if(!iframe) return;

  if(typeof container._ecRuntimeBridge === 'function'){
    window.removeEventListener('message', container._ecRuntimeBridge);
    container._ecRuntimeBridge = null;
  }

  var syncHeight = function(){
    try {
      if(!iframe.contentWindow || !iframe.contentWindow.document || !iframe.contentWindow.document.body) return;
      var doc = iframe.contentWindow.document;
      var body = doc.body;
      var html = doc.documentElement;
      var height = Math.max(
        body ? body.scrollHeight : 0,
        html ? html.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.offsetHeight : 0,
        720
      );
      iframe.style.height = height + 'px';
    } catch(_err){}
  };

  iframe.onload = function(){
    setTimeout(syncHeight, 120);
    setTimeout(syncHeight, 360);
  };

  var onMessage = function(event){
    if(!iframe.contentWindow || event.source !== iframe.contentWindow) return;
    var data = event.data || {};
    if(!data || typeof data !== 'object') return;
    if(data.type === 'ec-form-runtime-height'){
      var nextHeight = Math.max(720, Number(data.height || 0) || 0);
      iframe.style.height = nextHeight + 'px';
      return;
    }
    if(data.type === 'ec-form-runtime-toast' && data.message){
      toast(String(data.message || ''), String(data.level || 'info'));
      return;
    }
    if(data.type === 'ec-form-runtime-refresh'){
      reloadCurrentFormWorkspace(form.form_code || '', allocation && allocation.allocation_id || '');
    }
  };

  window.addEventListener('message', onMessage);
  container._ecRuntimeBridge = onMessage;
}

function doAllocate(form, container){
  if(ws.allocBusy) return;
  var rt=detectRecordType(form);
  if(!rt){ toast(t('Không xác định loại hồ sơ.','Cannot determine record type.'),'error'); return; }
  var dept=ws.allocDept||detectDepartment(form)||'QA';
  ws.allocError = null;
  ws.allocBusy=true;
  renderWorkspace(form,null,container);
  bindWorkspace(form,null,container);

  var masterCtx={};
  var notesDraft=(ws.allocNotes||'').trim();
  if(window._ecState&&window._ecState.pendingContext) masterCtx=window._ecState.pendingContext;

  window.AllocationTracker.allocate(rt,dept,{
    year:new Date().getFullYear(),
    form_code:form.form_code,
    notes:notesDraft,
    master_context:masterCtx,
    linked_order_id:masterCtx.wo_number||masterCtx.jo_number||masterCtx.so_number||''
  }).then(function(resp){
    ws.allocBusy=false;
    if(resp&&resp.ok) ws.allocNotes='';
    if(!resp||!resp.ok){
      ws.allocError = window.AllocationTracker && typeof window.AllocationTracker.describeError === 'function'
        ? window.AllocationTracker.describeError(resp, 'allocate')
        : { code:'allocate_failed', message:t('Không thể cấp mã hồ sơ.', 'Could not allocate the record ID.'), detail:'' };
      toast(ws.allocError.message || t('Không thể cấp mã hồ sơ.', 'Could not allocate the record ID.'),'error');
      renderWorkspace(form,null,container);
      bindWorkspace(form,null,container);
      return;
    }
    ws.allocError = null;
    toast(t('Đã cấp mã: ','Allocated: ')+(resp.record_id||''),'success');
    var st=window._ecState;
    st.selectedAllocationId=resp.allocation_id||'';

    var next = Promise.resolve(resp);
    if(form.online===false){
      next = window.AllocationTracker.downloadForm(resp.allocation_id,form.form_code,{master_context:masterCtx}).then(function(downloadResp){
        if(downloadResp&&downloadResp.ok) toast(t('Đã tải gói Excel.','Excel package downloaded.'),'success');
        return downloadResp || resp;
      }).catch(function(){
        toast(t('Không thể tự tải biểu mẫu ngoại tuyến ngay sau khi cấp mã.','Could not auto-download the offline form after allocation.'),'warn');
        return resp;
      });
    }
    next.finally(function(){
      if(typeof window.renderOnlineForms === 'function') window.renderOnlineForms(form.form_code);
    });
  }).catch(function(err){
    ws.allocBusy=false;
    ws.allocError = { code:'transport_error', message:t('Không thể kết nối tới máy chủ cấp mã.', 'Could not reach the allocation server.'), detail:String(err && err.message || '') };
    toast(ws.allocError.message,'error');
    renderWorkspace(form,null,container);
    bindWorkspace(form,null,container);
  });
}

function bindFormFields(form,allocation){
  var schema=form.schema||ws.schema||{};
  /* hydrate defaults */
  primeFieldDefaults(schema, allocation);

  /* bind simple fields */
  (schema.fields||[]).forEach(function(field){
    var rerenderIfNeeded = function(){
      var hasDependents = (schema.fields || []).some(function(candidate){
        return candidate && candidate.show_if && candidate.show_if.field === field.id;
      });
      if(!hasDependents) return;
      var workspace = document.getElementById('ec-workspace');
      if(!workspace) return;
      renderWorkspace(form, allocation, workspace);
      bindWorkspace(form, allocation, workspace);
    };
    if(isLockedContextField(field.id, allocation)){
      var lockedEl=document.getElementById('ec-f-'+field.id);
      if(lockedEl){
        lockedEl.setAttribute('disabled', 'disabled');
        lockedEl.setAttribute('aria-disabled', 'true');
      }
      return;
    }
    if(field.type==='lookup') return;
    if(field.type==='table'){
      ensureTableRows(field);
      Array.prototype.forEach.call(document.querySelectorAll('[data-table-field="'+field.id+'"]'), function(input){
        var rowIndex = Number(input.getAttribute('data-row-index') || 0);
        var colId = input.getAttribute('data-col-id') || '';
        var column = (field.columns || []).find(function(item){ return item && item.id === colId; }) || {};
        var sync = function(){
          var rows = ensureTableRows(field);
          rows[rowIndex] = rows[rowIndex] && typeof rows[rowIndex] === 'object' ? rows[rowIndex] : {};
          if(column.type === 'checkbox') rows[rowIndex][colId] = !!input.checked;
          else if(column.type === 'number') rows[rowIndex][colId] = input.value === '' ? '' : Number(input.value);
          else rows[rowIndex][colId] = input.value;
        };
        if(column.type === 'checkbox'){
          input.checked = ws.fieldValues[field.id] && ws.fieldValues[field.id][rowIndex] ? !!ws.fieldValues[field.id][rowIndex][colId] : false;
          input.onchange = sync;
          return;
        }
        input.oninput = sync;
        input.onchange = sync;
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-table-add="'+field.id+'"]'), function(btn){
        btn.onclick = function(){
          var rows = ensureTableRows(field);
          var maxRows = Math.max(Math.max(1, Number(field.min_rows || 1) || 1), Number(field.max_rows || 50) || 50);
          if(rows.length >= maxRows) return;
          rows.push({});
          var workspace = document.getElementById('ec-workspace');
          if(!workspace) return;
          renderWorkspace(form, allocation, workspace);
          bindWorkspace(form, allocation, workspace);
        };
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-table-remove="'+field.id+'"]'), function(btn){
        btn.onclick = function(){
          var rows = ensureTableRows(field);
          var minRows = Math.max(1, Number(field.min_rows || 1) || 1);
          var rowIndex = Number(btn.getAttribute('data-row-index') || -1);
          if(rowIndex < 0 || rows.length <= minRows) return;
          rows.splice(rowIndex, 1);
          var workspace = document.getElementById('ec-workspace');
          if(!workspace) return;
          renderWorkspace(form, allocation, workspace);
          bindWorkspace(form, allocation, workspace);
        };
      });
      return;
    }
    if(field.type==='multi_select'){
      var cur=Array.isArray(ws.fieldValues[field.id])?ws.fieldValues[field.id]:[];
      Array.prototype.forEach.call(document.querySelectorAll('[data-multi="'+field.id+'"]'),function(box){
        box.checked=cur.indexOf(box.value)>=0;
        box.onchange=function(){ ws.fieldValues[field.id]=Array.prototype.filter.call(document.querySelectorAll('[data-multi="'+field.id+'"]:checked'),function(n){return n.checked;}).map(function(n){return n.value;}); rerenderIfNeeded(); };
      });
      return;
    }
    var el=document.getElementById('ec-f-'+field.id); if(!el) return;
    var val=ws.fieldValues[field.id]; if(val===undefined||val===null) val='';
    if(field.type==='checkbox'){ el.checked=val===true||val==='true'||val===1; el.onchange=function(){ws.fieldValues[field.id]=!!el.checked; rerenderIfNeeded();}; return; }
    el.value=val;
    el.oninput=function(){ ws.fieldValues[field.id]=field.type==='number'?(el.value===''?'':Number(el.value)):el.value; };
    el.onchange=function(){ ws.fieldValues[field.id]=field.type==='number'?(el.value===''?'':Number(el.value)):el.value; rerenderIfNeeded(); };
  });

  /* mount lookups */
  ws.lookupInstances={};
  (schema.fields||[]).filter(function(f){return f.type==='lookup';}).forEach(function(field){
    var hostId='ec-f-'+field.id; if(!document.getElementById(hostId)) return;
    if(isLockedContextField(field.id, allocation)) return;
    var items=buildLookupItems(field);
    if(typeof window.SearchableInput==='function'){
      var inst=new window.SearchableInput({containerId:hostId,fieldId:'ec-si-'+field.id,name:field.id,dataSource:items,displayField:'label',valueField:'value',subField:'sub',strictSelect:field.strict_select!==false,storeValueInHiddenField:true,placeholderVi:field.placeholder_vi||t('Tìm và chọn','Search and select'),placeholder:field.placeholder_en||'Search and select',onSelect:function(item){
        ws.fieldValues[field.id]=item?item.value:'';
        if(item&&field.autofill_map) Object.keys(field.autofill_map).forEach(function(target){var src=field.autofill_map[target];if(item[src]!==undefined) ws.fieldValues[target]=item[src];});
        var hasDependents = (schema.fields || []).some(function(candidate){
          return candidate && candidate.show_if && candidate.show_if.field === field.id;
        });
        if(hasDependents){
          var workspace = document.getElementById('ec-workspace');
          if(workspace){
            renderWorkspace(form, allocation, workspace);
            bindWorkspace(form, allocation, workspace);
          }
        }
      }});
      ws.lookupInstances[field.id]=inst;
      if(ws.fieldValues[field.id]) inst.setValue(ws.fieldValues[field.id]);
    }
  });
}

function buildLookupItems(field){
  var src=String(field.lookup_source||'').trim();
  var master=ws.master||{};
  var cv=ws.fieldValues;
  if(src==='customers') return (master.customers||[]).map(function(i){return {value:i.customer_id,label:i.customer_id,sub:i.customer_name||''};});
  if(src==='suppliers') return (master.suppliers||[]).map(function(i){return {value:i.supplier_id,label:i.supplier_id,sub:i.supplier_name||''};});
  if(src==='parts') return (master.parts||[]).filter(function(i){return !cv.customer_id||String(i.customer_id||'')===String(cv.customer_id);}).map(function(i){return {value:i.part_number,label:i.part_number,sub:i.part_description||'',part_number:i.part_number,customer_id:i.customer_id||''};});
  if(src==='revisions') return (master.revisions||[]).filter(function(i){return !cv.part_number||String(i.part_number||'')===String(cv.part_number);}).map(function(i){return {value:i.revision,label:i.revision,sub:i.part_number||'',part_number:i.part_number||''};});
  if(src==='capas') return (master.capas||[]).map(function(i){return {value:i.capa_number,label:i.capa_number,sub:i.title||''};});
  if(src==='work_centers') return (master.work_centers||[]).map(function(i){return {value:i.work_center_id,label:i.work_center_id,sub:i.work_center_name||''};});
  if(src==='machines') return (master.machines||[]).filter(function(i){return !cv.work_center_id||String(i.work_center_id||'')===String(cv.work_center_id);}).map(function(i){return {value:i.machine_id,label:i.machine_id,sub:[i.machine_name||'',i.work_center_id||'',i.machine_type||''].filter(Boolean).join(' · '),machine_id:i.machine_id||'',machine_name:i.machine_name||'',work_center_id:i.work_center_id||'',machine_type:i.machine_type||''};});
  if(src==='operators') return (master.operators||[]).filter(function(i){return !cv.work_center_id||String(i.work_center_id||'')===String(cv.work_center_id);}).map(function(i){return {value:i.operator_id,label:i.operator_id,sub:[i.operator_name||'',i.role||'',i.work_center_id||''].filter(Boolean).join(' · '),operator_id:i.operator_id||'',operator_name:i.operator_name||'',work_center_id:i.work_center_id||''};});
  if(src==='sales_orders') return (ws.orders.sales_orders||[]).filter(function(i){return !cv.customer_id||String(i.customer_id||'')===String(cv.customer_id);});
  if(src==='job_orders') return (ws.orders.job_orders||[]).filter(function(i){return !cv.so_number||String(i.so_number||'')===String(cv.so_number);});
  if(src==='work_orders') return (ws.orders.work_orders||[]).filter(function(i){if(cv.jo_number&&String(i.jo_number||'')!==String(cv.jo_number)) return false; if(cv.machine_id&&String(i.machine_id||'')!==String(cv.machine_id)) return false; return true;});
  if(src==='nc_program_releases') return (master.nc_program_releases||[]).filter(function(i){
    if(cv.part_number&&String(i.part_number||'')!==String(cv.part_number)) return false;
    if(cv.part_revision&&String(i.part_revision||'')!==String(cv.part_revision)) return false;
    return true;
  }).map(function(i){return {value:i.program_id,label:i.program_id,sub:[i.release_title||'',i.part_number||'',i.part_revision||'',i.status||''].filter(Boolean).join(' · '),program_id:i.program_id||'',part_number:i.part_number||'',part_revision:i.part_revision||'',status:i.status||'',checksum:i.checksum||''};});
  if(src==='tooling_assets') return (master.tooling_assets||[]).filter(function(i){
    if(cv.work_center_id&&String(i.preferred_work_center_id||'')!==''&&String(i.preferred_work_center_id||'')!==String(cv.work_center_id)) return false;
    return true;
  }).map(function(i){return {value:i.tool_id,label:i.tool_id,sub:[i.tool_name||'',i.tool_type||'',i.machine_type||''].filter(Boolean).join(' · '),tool_id:i.tool_id||'',tool_name:i.tool_name||'',tool_type:i.tool_type||''};});
  return [];
}

function bindSignatures(form){
  var schema=form.schema||ws.schema||{};
  /* mount stored sigs */
  if(typeof window.ESignature==='function'){
    var esig=new window.ESignature({lang:(typeof lang!=='undefined'&&lang==='en')?'en':'vi'});
    Object.keys(ws.signatures).forEach(function(id){var pad=document.getElementById('ec-sig-pad-'+id);if(pad) esig.insertSignature(pad,ws.signatures[id]);});
  }
  /* sign buttons */
  Array.prototype.forEach.call(document.querySelectorAll('[data-sign]'),function(btn){
    if(typeof window.ESignature!=='function'){
      btn.disabled=true;
      btn.setAttribute('aria-disabled','true');
      return;
    }
    var blockIdAttr=btn.getAttribute('data-sign');
    var canSignNow=canSignBlock(schema,blockIdAttr);
    btn.disabled=!canSignNow;
    btn.setAttribute('aria-disabled', canSignNow ? 'false' : 'true');
    btn.onclick=function(){
      var blockId=btn.getAttribute('data-sign');
      if(typeof window.ESignature!=='function'){toast(t('Chữ ký điện tử chưa sẵn sàng.','E-signature not available.'),'error');return;}
      if(!canSignBlock(schema,blockId)){toast(t('Hoàn tất bước ký trước đó.','Complete the previous signature step.'),'warn');return;}
      var block=(schema.signature_blocks||[]).find(function(b){return b.id===blockId;})||{};
      var u=user();
      new window.ESignature({lang:(typeof lang!=='undefined'&&lang==='en')?'en':'vi',requireReason:block.require_reason!==false,requirePin:block.require_pin===true}).show({signerId:u.signerId,signerName:u.name,signerRole:u.title||u.dept,signatureMeaning:t(block.signature_meaning_vi||'',block.signature_meaning||''),appliedTo:(selectedAllocation()?selectedAllocation().record_id:'')+':'+blockId,onSign:function(data){ws.signatures[blockId]=data;var container=document.getElementById('ec-workspace');if(container){var alloc=selectedAllocation();renderWorkspace(form,alloc,container);bindWorkspace(form,alloc,container);}}});
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-sign-clear]'),function(btn){
    btn.onclick=function(){delete ws.signatures[btn.getAttribute('data-sign-clear')];var container=document.getElementById('ec-workspace');if(container){var alloc=selectedAllocation();renderWorkspace(form,alloc,container);bindWorkspace(form,alloc,container);}};
  });
}

function doSubmitOnline(form,allocation,button,container){
  var schema=form.schema||ws.schema||{};
  var missing=[];
  (schema.fields||[]).forEach(function(f){
    if(!fieldVisible(f)) return;
    if(!f.required) return;
    var v=ws.fieldValues[f.id];
    if(f.type==='multi_select'){if(!Array.isArray(v)||!v.length) missing.push(t(f.label_vi||f.id,f.label_en||f.id));return;}
    if(f.type==='checkbox'){if(v!==true) missing.push(t(f.label_vi||f.id,f.label_en||f.id));return;}
    if(f.type==='table'){
      var rows = Array.isArray(v) ? v : [];
      var requiredCols = Array.isArray(f.columns) ? f.columns.filter(function(column){ return column && column.required; }) : [];
      var meaningful = rows.filter(function(row){
        return row && Object.keys(row).some(function(key){
          var cell = row[key];
          return !(cell === undefined || cell === null || cell === '');
        });
      });
      var validRows = meaningful.filter(function(row){
        return requiredCols.every(function(column){
          var cell = row[column.id];
          return !(cell === undefined || cell === null || cell === '');
        });
      });
      if(meaningful.length < Math.max(1, Number(f.min_rows || 1) || 1) || validRows.length !== meaningful.length) missing.push(t(f.label_vi||f.id,f.label_en||f.id));
      return;
    }
    if(v===undefined||v===null||v==='') missing.push(t(f.label_vi||f.id,f.label_en||f.id));
  });
  approvalSteps(schema).forEach(function(s){if(s.requiredOnSubmit&&!ws.signatures[s.id]) missing.push(s.id);});
  if(missing.length){toast(t('Thiếu: ','Missing: ')+missing.join(', '),'warn');return;}

  var payload={};
  Object.keys(ws.fieldValues).forEach(function(k){payload[k]=ws.fieldValues[k];});
  payload.form_code=form.form_code;
  payload.form_version=form.version||'V1';
  payload.record_id=allocation.record_id||'';
  payload.allocation_id=allocation.allocation_id||'';
  payload.master_context=allocation.master_context||{};
  payload.signatures=ws.signatures;
  payload.approval_state=currentApprovalState(schema);
  payload.runtime_mode='online';

  button.disabled=true;
  window.AllocationTracker.submitOnline(allocation.allocation_id,form.form_code,payload).then(function(resp){
    if(resp&&resp.ok){
      clearDraft(form,allocation);
      return linkOrderIfPossible(allocation).then(function(linked){
        toast(t('Đã gửi biểu mẫu thành công.','Form submitted successfully.'),'success');
        if(linked===false) toast(t('Đã gửi biểu mẫu nhưng chưa liên kết được với đơn hàng.','Form submitted, but order linking did not complete.'),'warn');
        if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);
      });
    } else toast(t('Không thể gửi.','Could not submit.'),'error');
  }).catch(function(){toast(t('Lỗi kết nối.','Connection error.'),'error');}).finally(function(){button.disabled=false;});
}

function askTextDialog(options){
  if(typeof window._ecPromptDialog === 'function') return window._ecPromptDialog(options || {});
  var fallback = window.prompt((options && options.message) || '', (options && options.value) || '');
  return Promise.resolve(fallback ? String(fallback).trim() : '');
}

function bindApprovalActions(form,allocation,container){
  var submitReview=document.getElementById('ec-submit-review');
  if(submitReview) submitReview.onclick=function(){
    if(!confirm(t('Gửi duyệt?','Submit for review?'))) return;
    submitReview.disabled=true;
    api('evidence_submit_for_review',{allocation_id:allocation.allocation_id},'POST').then(function(r){
      if(r&&r.ok){toast(t('Đã gửi duyệt.','Submitted for review.'),'success');if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);}
      else toast(t('Lỗi: ','Error: ')+(r&&r.error||''),'error');
    }).finally(function(){submitReview.disabled=false;});
  };
  var approveBtn=document.getElementById('ec-approve');
  if(approveBtn) approveBtn.onclick=function(){
    if(typeof window.ESignature!=='function'){toast(t('Chữ ký chưa sẵn sàng.','Signature not available.'),'error');return;}
    var u=user();
    new window.ESignature({lang:(typeof lang!=='undefined'&&lang==='en')?'en':'vi',requireReason:true,requirePin:false}).show({signerId:u.signerId,signerName:u.name,signerRole:u.title||u.dept,signatureMeaning:t('Phê duyệt chứng cứ','Evidence approval'),appliedTo:(allocation.record_id||'')+':approval',onSign:function(sigData){
      askTextDialog({
        title:t('Xác nhận mật khẩu','Password confirmation'),
        message:t('Nhập mật khẩu để xác nhận phê duyệt hồ sơ này.','Enter your password to confirm approval of this record.'),
        type:'password',
        required:true,
        confirmLabel:t('Duyệt','Approve')
      }).then(function(pw){
        if(!pw){toast(t('Đã hủy.','Cancelled.'),'warn');return;}
        approveBtn.disabled=true;
        api('evidence_review',{allocation_id:allocation.allocation_id,action:'approve',reason:sigData.reason||'',signature_data:sigData,password:pw},'POST').then(function(r){
          if(r&&r.ok){
            var summary = r.approval_summary || null;
            if(summary && String(summary.approval_mode || '') === 'parallel' && summary.is_complete !== true){
              toast(t('Đã ghi nhận phê duyệt của bạn. Còn ','Your approval has been recorded. ') + String(summary.remaining_approvals || 0) + t(' phê duyệt nữa.',' approvals remaining.'),'success');
            } else {
              toast(t('Đã phê duyệt.','Approved.'),'success');
            }
            if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);
          }
          else toast(t('Lỗi: ','Error: ')+(r&&r.error||''),'error');
        }).finally(function(){approveBtn.disabled=false;});
      });
    }});
  };
  var rejectBtn=document.getElementById('ec-reject');
  if(rejectBtn) rejectBtn.onclick=function(){
    askTextDialog({
      title:t('Lý do từ chối','Rejection reason'),
      message:t('Nhập lý do từ chối hồ sơ này.','Enter the reason for rejecting this record.'),
      required:true,
      multiline:true,
      confirmLabel:t('Từ chối','Reject')
    }).then(function(reason){
      if(!reason||!reason.trim()){toast(t('Phải nhập lý do.','Reason required.'),'warn');return;}
      rejectBtn.disabled=true;
      api('evidence_review',{allocation_id:allocation.allocation_id,action:'reject',reason:reason.trim()},'POST').then(function(r){
        if(r&&r.ok){toast(t('Đã từ chối.','Rejected.'),'success');if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);}
        else toast(t('Lỗi.','Error.'),'error');
      }).finally(function(){rejectBtn.disabled=false;});
    });
  };

  var reopenBtn=document.getElementById('ec-reopen');
  if(reopenBtn) reopenBtn.onclick=function(){
    askTextDialog({
      title:t('Lý do mở lại','Reopen reason'),
      message:t('Nhập lý do mở lại hồ sơ này.','Enter the reason for reopening this record.'),
      required:true,
      multiline:true,
      confirmLabel:t('Mở lại','Reopen')
    }).then(function(reason){
      if(!reason||!reason.trim()){toast(t('Phải nhập lý do.','Reason required.'),'warn');return;}
      reopenBtn.disabled=true;
      api('evidence_reopen',{allocation_id:allocation.allocation_id,reason:reason.trim()},'POST').then(function(r){
        if(r&&r.ok){toast(t('Đã mở lại.','Reopened.'),'success');if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);}
        else toast(t('Lỗi.','Error.'),'error');
      }).finally(function(){reopenBtn.disabled=false;});
    });
  };
}

/* Giữ hàm này để tương thích với các nhánh cũ đã từng gọi tên cũ. */
function bindApprovalDialogs(form, allocation){
  void form;
  void allocation;
}

function bindOffline(form,allocation,container){
  var dlBtn=document.getElementById('ec-download-offline');
  if(dlBtn&&window.AllocationTracker) dlBtn.onclick=function(){
    dlBtn.disabled=true;
    window.AllocationTracker.downloadForm(allocation.allocation_id,form.form_code,{master_context:allocation.master_context||{}}).then(function(r){
      if(r&&r.ok) toast(t('Đã tải gói Excel.','Excel package downloaded.'),'success');
      else toast(t('Không thể tải.','Could not download.'),'error');
    }).finally(function(){dlBtn.disabled=false;});
  };

  var receivedBtn=document.getElementById('ec-download-received');
  if(receivedBtn) receivedBtn.onclick=function(){
    var url='api.php?action=form_fill_download_received&allocation_id='+encodeURIComponent(allocation.allocation_id||'');
    var link=document.createElement('a');
    link.href=url;
    link.target='_blank';
    link.rel='noopener';
    document.body.appendChild(link);
    link.click();
    if(link.parentNode) link.parentNode.removeChild(link);
  };

  var copyBtn=document.getElementById('ec-copy-filename');
  if(copyBtn) copyBtn.onclick=function(){
    var fname=(allocation.offline_package&&allocation.offline_package.filename)||allocation.suggested_filename||'';
    if(window.AllocationTracker) window.AllocationTracker.copyToClipboard(fname);
    toast(t('Đã sao chép.','Copied.'),'success');
  };

  /* SOP document navigation */
  Array.prototype.forEach.call(container.querySelectorAll('[data-navigate-doc]'), function(link){
    link.onclick = function(e){
      e.preventDefault();
      var docCode = link.getAttribute('data-navigate-doc') || '';
      if(docCode && typeof navigateTo === 'function'){
        navigateTo('documents', { search: docCode });
      } else if(docCode) {
        toast(t('Mở tài liệu: ', 'Open document: ') + docCode, 'info');
      }
    };
  });

  /* dropzone */
  var dropzone=document.getElementById('ec-dropzone');
  var fileInput=document.getElementById('ec-file-input');
  if(dropzone&&fileInput){
    dropzone.onclick=function(e){if(e.target!==fileInput) fileInput.click();};
    fileInput.onchange=function(){if(fileInput.files&&fileInput.files.length) inspectFiles(fileInput.files,allocation,container,form);fileInput.value='';};
    dropzone.ondragover=function(e){e.preventDefault();dropzone.classList.add('drag');};
    dropzone.ondragleave=function(){dropzone.classList.remove('drag');};
    dropzone.ondrop=function(e){e.preventDefault();dropzone.classList.remove('drag');if(e.dataTransfer&&e.dataTransfer.files) inspectFiles(e.dataTransfer.files,allocation,container,form);};
  }

  var clearBtn=document.getElementById('ec-clear-queue');
  if(clearBtn) clearBtn.onclick=function(){ws.uploadFiles=[];renderWorkspace(form,allocation,container);bindWorkspace(form,allocation,container);};

  var receiveAll=document.getElementById('ec-receive-all');
  if(receiveAll) receiveAll.onclick=function(){
    var valid=ws.uploadFiles.filter(function(i){return i.inspect&&i.inspect.ok&&i.inspect.verification&&i.inspect.verification.status!=='rejected';});
    if(!valid.length){toast(t('Không có tệp hợp lệ.','No valid files.'),'warn');return;}
    receiveAll.disabled=true;
    Promise.all(valid.map(function(item){
      var aid=(item.inspect&&item.inspect.allocation&&item.inspect.allocation.allocation_id)||allocation.allocation_id||'';
      return window.AllocationTracker.receiveUpload(aid,item.file).then(function(r){item.receive=r;return r;});
    })).then(function(){
      toast(t('Đã tiếp nhận.','Files received.'),'success');
      ws.uploadFiles=[];
      if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);
    }).finally(function(){receiveAll.disabled=false;});
  };
}

function inspectFiles(files,allocation,container,form){
  Array.prototype.forEach.call(files,function(file){
    if(!/\.(xlsx|xlsm)$/i.test(file.name)){toast(t('Chỉ nhận .xlsx/.xlsm','Only .xlsx/.xlsm accepted'),'warn');return;}
    var item={id:'f-'+Math.random().toString(36).slice(2,8),file:file,inspect:null,status:'pending'};
    ws.uploadFiles.push(item);
    renderWorkspace(form,allocation,container);
    bindWorkspace(form,allocation,container);
    window.AllocationTracker.inspectUpload(file,allocation.allocation_id||'').then(function(r){
      item.inspect=r;
      item.status=(r&&r.ok&&r.verification)?r.verification.status:'rejected';
      renderWorkspace(form,allocation,container);
      bindWorkspace(form,allocation,container);
    }).catch(function(){
      item.status='rejected';
      renderWorkspace(form,allocation,container);
      bindWorkspace(form,allocation,container);
    });
  });
}

/* ── preload server entry for online forms ── */
function preloadSelectedOnlineEntry(form, allocation){
  if(!form || form.online === false || !allocation) return Promise.resolve(null);
  if(ws.draftKey && localStorage.getItem(ws.draftKey)) return Promise.resolve(null);
  var loadEntry = function(){
    return api('online_form_entry_get',{
      form_code: form.form_code,
      allocation_id: allocation.allocation_id || '',
      entry_id: (allocation.online_submission && allocation.online_submission.entry_id) || ''
    },'POST').then(function(resp){
      if(resp && resp.ok && resp.entry) applyStoredOnlinePayload(resp.entry, allocation);
      return resp;
    });
  };
  if(isRecordReadOnly(allocation)){
    return loadEntry().catch(function(){ return null; });
  }
  return api('form_fill_get_draft',{
    allocation_id: allocation.allocation_id || ''
  },'GET').then(function(resp){
    if(resp && resp.ok && resp.draft && resp.draft.data){
      applyStoredOnlinePayload(resp.draft.data, allocation);
      return resp;
    }
    return loadEntry();
  }).catch(function(){
    return loadEntry().catch(function(){ return null; });
  });
}

function applyStoredOnlinePayload(payload, allocation){
  if(!payload || typeof payload !== 'object') return;
  var skip = {form_code:1,form_version:1,record_id:1,allocation_id:1,master_context:1,signatures:1,approval_state:1,runtime_mode:1,_display:1,submitted_at:1,submitted_by:1,updated_at:1,updated_by:1,_server_time:1,_status:1,_ip:1,_session_user:1,online_submission:1};
  Object.keys(payload).forEach(function(k){
    if(!skip[k]) ws.fieldValues[k] = payload[k];
  });
  if(payload.signatures && typeof payload.signatures === 'object') ws.signatures = payload.signatures;
  hydrateFromAlloc(allocation);
}

/* ── link form to order when submitting ── */
function linkOrderIfPossible(allocation){
  var ctx = allocation && allocation.master_context ? allocation.master_context : {};
  var orderType = ctx.wo_number ? 'wo' : (ctx.jo_number ? 'jo' : (ctx.so_number ? 'so' : ''));
  var orderId = ctx.wo_number || ctx.jo_number || ctx.so_number || '';
  if(!orderType || !orderId || !allocation.record_id) return Promise.resolve(null);
  return api('order_link_form', { order_type: orderType, order_id: orderId, record_id: allocation.record_id }, 'POST').then(function(resp){
    return !!(resp && resp.ok);
  }).catch(function(){
    return false;
  });
}

/* ── server draft persistence ── */
function saveDraftToServer(form, allocation){
  if(!form || !allocation || !allocation.allocation_id) return;
  api('form_fill_save_draft', {
    allocation_id: allocation.allocation_id,
    form_code: form.form_code,
    data: { fieldValues: ws.fieldValues, signatures: ws.signatures }
  }, 'POST').catch(function(){
    toast(t('Không lưu được nháp lên máy chủ. Bản cục bộ vẫn còn.','Draft was not saved to the server. The local copy is still available.'),'warn');
  });
}

/* ── approval role check ── */
function userHasApproveRole(schema){
  var u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : {};
  var roles = Array.isArray(u.roles) ? u.roles : [String(u.role || '')];
  var cfg = reviewConfig(schema || {});
  var approveRoles = Array.isArray(cfg.rolesAllowed) && cfg.rolesAllowed.length
    ? cfg.rolesAllowed
    : ['admin','qa_manager','quality_manager','production_manager','engineering_manager','quality_engineer'];
  for(var i = 0; i < roles.length; i++){
    if(approveRoles.indexOf(String(roles[i]).toLowerCase()) >= 0) return true;
  }
  return false;
}

})();
