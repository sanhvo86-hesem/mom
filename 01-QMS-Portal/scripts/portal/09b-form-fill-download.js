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
  allocNotes: ''
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
  return (st.formToRecordType&&st.formToRecordType[form.form_code])||'';
}
function detectDepartment(form){
  var st=window._ecState||{};
  var rt=detectRecordType(form);
  return (rt&&st.recordTypes&&st.recordTypes[rt])?st.recordTypes[rt].department_owner||'':'';
}
function selectedAllocation(){
  var st=window._ecState||{};
  return (st.allocations||[]).find(function(a){ return a.allocation_id===st.selectedAllocationId; })||null;
}

/* ── Draft management ── */
function draftKey(form,alloc){ return 'qms_ec_'+((form&&form.form_code)||'')+'_'+((alloc&&alloc.allocation_id)||''); }
function loadDraft(form,alloc){
  var key=draftKey(form,alloc);
  if(ws.draftKey===key) return;
  ws.draftKey=key; ws.fieldValues={}; ws.signatures={};
  try{ var raw=localStorage.getItem(key); if(raw){ var p=JSON.parse(raw); ws.fieldValues=p.fieldValues||{}; ws.signatures=p.signatures||{}; } }catch(e){}
  hydrateFromAlloc(alloc);
}
function saveDraft(form,alloc){
  try{ localStorage.setItem(draftKey(form,alloc),JSON.stringify({fieldValues:ws.fieldValues,signatures:ws.signatures})); toast(t('Đã lưu nháp.','Draft saved.'),'success'); }catch(e){}
  api('form_fill_save_draft',{allocation_id:(alloc&&alloc.allocation_id)||'',form_code:(form&&form.form_code)||'',data:{fieldValues:ws.fieldValues,signatures:ws.signatures}},'POST').catch(function(){});
}
function clearDraft(form,alloc){ try{localStorage.removeItem(draftKey(form,alloc));}catch(e){} }
function hydrateFromAlloc(alloc){
  if(!alloc) return;
  var ctx=alloc.master_context||{};
  ['customer_id','supplier_id','so_number','jo_number','wo_number','part_number','part_revision','capa_number'].forEach(function(k){ if(!ws.fieldValues[k]&&ctx[k]) ws.fieldValues[k]=ctx[k]; });
}

/* ══════════════════════════════════════════════════════
   MAIN RENDER — called by orchestrator
   ══════════════════════════════════════════════════════ */

window._renderWorkspace = function(form, allocation, container){
  Promise.all([ensureMaster(), ensureOrders(), loadSchema(form.form_code)]).then(function(){
    ws.schema = form.schema || ws.schema;
    if(!ws.allocDept) ws.allocDept = detectDepartment(form);
    loadDraft(form, allocation);
    renderWorkspace(form, allocation, container);
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
      '<span class="ec-tag">' + (isOnline ? 'Online' : 'Offline') + '</span>' +
      (allocation ? '<span class="ec-tag done">' + esc(allocation.record_id || '') + '</span>' : '') +
    '</div>' +
  '</div>';

  /* ── Step 1: Allocate ── */
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
      html += renderOfflineStep(form, allocation);
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

  return '<div class="ec-allocate-grid">' +
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
    '<button class="ec-btn primary lg" id="ec-alloc-btn"'+(busy||!rt?' disabled':'')+' style="min-width:200px">' +
      (busy ? esc(t('Đang xử lý...','Processing...')) : esc(isOffline ? t('Cấp mã & tải form','Allocate & download') : t('Cấp mã & tiếp tục','Allocate & continue'))) +
    '</button>' +
  '</div>';
}

/* ── Step 2: Online form ── */
function renderOnlineStep(form, allocation){
  var schema = form.schema || ws.schema || {};
  var sections = Array.isArray(schema.sections) && schema.sections.length ? schema.sections : [{id:'main',title:t('Thông tin biểu mẫu','Form information'),field_ids:(schema.fields||[]).map(function(f){return f.id;})}];
  var ctx = allocation.master_context || {};

  var html = '<div class="ec-step" id="ec-step-fill">' +
    '<div class="ec-step-head" data-toggle="ec-step-fill">' +
      '<div class="ec-step-num">2</div>' +
      '<div class="ec-step-title">' + esc(t('Điền biểu mẫu online', 'Fill online form')) + '</div>' +
    '</div>' +
    '<div class="ec-step-body">';

  /* context chips */
  html += '<div class="ec-context">';
  html += renderContextChip(t('Mã hồ sơ','Record ID'), allocation.record_id);
  if(ctx.customer_id) html += renderContextChip(t('Khách hàng','Customer'), ctx.customer_id);
  if(ctx.so_number||ctx.jo_number||ctx.wo_number) html += renderContextChip('SO/JO/WO', [ctx.so_number,ctx.jo_number,ctx.wo_number].filter(Boolean).join(' · '));
  if(ctx.part_number) html += renderContextChip('Part/Rev', [ctx.part_number,ctx.part_revision].filter(Boolean).join(' · '));
  html += '</div>';

  /* form sections */
  sections.forEach(function(section){
    var ids = Array.isArray(section.field_ids) ? section.field_ids : [];
    html += '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:700;color:var(--ec-text);margin-bottom:10px">' + esc(t(section.title_vi||section.title||section.id, section.title_en||section.title||section.id)) + '</div>';
    html += '<div class="ec-fields">' + ids.map(function(id){
      var field = (schema.fields||[]).find(function(f){return f.id===id;});
      return field ? renderField(field) : '';
    }).join('') + '</div></div>';
  });

  /* signatures */
  var blocks = Array.isArray(schema.signature_blocks) ? schema.signature_blocks : [];
  if(blocks.length){
    html += '<div style="margin-top:16px"><div style="font-size:13px;font-weight:700;color:var(--ec-text);margin-bottom:10px">' + esc(t('Chữ ký điện tử','Electronic signatures')) + '</div>';
    html += '<div class="ec-signatures">' + blocks.map(function(block){
      var signed = !!ws.signatures[block.id];
      var locked = !canSignBlock(schema, block.id);
      return '<div class="ec-sign'+(locked?' locked':'')+'">' +
        '<div class="ec-sign-title">' + esc(t(block.label_vi||block.label||block.id, block.label_en||block.label||block.id)) + '</div>' +
        '<div class="ec-sign-sub">' + esc(t(block.help_vi||block.help||'', block.help_en||block.help||'')) + '</div>' +
        '<div class="ec-sign-pad" id="ec-sig-pad-'+esc(block.id)+'">' + (signed ? '' : '<div class="ec-sign-empty">'+esc(t('Chưa ký','Not signed'))+'</div>') + '</div>' +
        '<div class="ec-sign-actions">' +
          '<button class="ec-btn secondary" data-sign="'+esc(block.id)+'"'+(locked?' disabled':'')+'>'+esc(signed?t('Ký lại','Re-sign'):t('Ký','Sign'))+'</button>' +
          (signed ? '<button class="ec-btn ghost" data-sign-clear="'+esc(block.id)+'">'+esc(t('Xóa','Clear'))+'</button>' : '') +
        '</div>' +
      '</div>';
    }).join('') + '</div></div>';
  }

  /* actions */
  html += '<div class="ec-actions">' +
    '<button class="ec-btn secondary" id="ec-save-draft">' + esc(t('Lưu nháp','Save draft')) + '</button>' +
    '<button class="ec-btn ghost" id="ec-reset-form">' + esc(t('Xóa dữ liệu','Reset')) + '</button>' +
    '<button class="ec-btn primary" id="ec-submit-online">' + esc(t('Gửi biểu mẫu','Submit form')) + '</button>' +
  '</div>';

  /* approval bar */
  html += renderApprovalBar(allocation);

  html += '</div></div>';
  return html;
}

/* ── Step 2: Offline form ── */
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
  if(fname) html += renderContextChip(t('Tên file','Filename'), fname);
  html += '</div>';

  /* download section */
  html += '<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">' +
    '<button class="ec-btn primary lg" id="ec-download-offline">' + esc(t('Tải gói Excel đã kiểm soát','Download governed Excel package')) + '</button>' +
    (fname ? '<button class="ec-btn secondary" id="ec-copy-filename">' + esc(t('Sao chép tên file','Copy filename')) + '</button>' : '') +
  '</div>';

  /* upload section */
  html += '<div style="border-top:1px solid var(--ec-border);padding-top:16px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--ec-text);margin-bottom:10px">' + esc(t('Nộp workbook đã điền', 'Submit completed workbook')) + '</div>' +
    '<label class="ec-dropzone" id="ec-dropzone"><input id="ec-file-input" type="file" accept=".xlsx,.xlsm" multiple style="display:none">' +
      '<div class="ec-dropzone-icon">\uD83D\uDCE4</div>' +
      '<strong>' + esc(t('Kéo thả workbook vào đây hoặc nhấn để chọn','Drop workbook here or click to browse')) + '</strong>' +
      '<p>' + esc(t('Chỉ nhận .xlsx/.xlsm đã được hệ thống cấp phát.','Only .xlsx/.xlsm files issued by the system.')) + '</p>' +
    '</label>' +
    '<div id="ec-upload-queue">' + renderUploadQueue() + '</div>' +
    (ws.uploadFiles.length ? '<div class="ec-actions"><button class="ec-btn secondary" id="ec-clear-queue">' + esc(t('Xóa danh sách','Clear')) + '</button><button class="ec-btn success" id="ec-receive-all">' + esc(t('Tiếp nhận file hợp lệ','Receive valid files')) + '</button></div>' : '') +
  '</div>';

  html += '</div></div>';
  return html;
}

/* ── Upload queue ── */
function renderUploadQueue(){
  if(!ws.uploadFiles.length) return '';
  return ws.uploadFiles.map(function(item){
    var v = item.inspect && item.inspect.verification ? item.inspect.verification : {status:'pending'};
    var status = v.status || item.status || 'pending';
    var badgeClass = status==='verified'?'pass':status==='warning'?'warn':status==='rejected'?'fail':'neutral';
    var alloc = item.inspect && item.inspect.allocation ? item.inspect.allocation : null;
    var md = item.inspect && item.inspect.metadata ? item.inspect.metadata : {};
    return '<div class="ec-file">' +
      '<div class="ec-file-head"><div><div class="ec-file-name">'+esc(item.file.name)+'</div><div class="ec-file-meta">'+esc(Math.round(item.file.size/1024)+'KB')+'</div></div>' +
        '<span class="ec-badge '+badgeClass+'">'+esc(status==='verified'?t('Hợp lệ','Valid'):status==='warning'?t('Cảnh báo','Warning'):status==='rejected'?t('Từ chối','Rejected'):t('Đang kiểm tra','Inspecting'))+'</span>' +
      '</div>' +
      '<div class="ec-file-grid">' +
        '<div class="ec-file-cell"><small>Record ID</small><strong>'+esc((alloc&&alloc.record_id)||md.issued_record_id||'—')+'</strong></div>' +
        '<div class="ec-file-cell"><small>Form</small><strong>'+esc(md.form_code||(alloc&&alloc.form_code)||'—')+'</strong></div>' +
        '<div class="ec-file-cell"><small>Version</small><strong>'+esc(md.form_version||'—')+'</strong></div>' +
      '</div>' +
      ((v.warnings||[]).length?'<div class="ec-file-meta" style="color:var(--ec-warning);margin-top:6px">'+esc(v.warnings.join(', '))+'</div>':'') +
      ((v.issues||[]).length?'<div class="ec-file-meta" style="color:var(--ec-danger);margin-top:4px">'+esc(v.issues.join(', '))+'</div>':'') +
    '</div>';
  }).join('');
}

/* ── Field rendering ── */
function renderField(field){
  var cls='ec-field';
  if(field.width==='full'||field.type==='textarea'||field.type==='multi_select') cls+=' full';
  else if(field.width==='third') cls+=' third';
  var label=t(field.label_vi||field.label||field.id,field.label_en||field.label||field.id);
  var req=field.required?'<span class="req">*</span>':'';
  var note=field.helper_vi||field.helper||field.note_vi||field.note||'';
  var val=ws.fieldValues[field.id];
  if(val===undefined||val===null) val='';

  var h='<div class="'+cls+'"><label class="ec-label" for="ec-f-'+esc(field.id)+'">'+esc(label)+req+'</label>';
  if(field.type==='lookup'){
    h+='<div id="ec-f-'+esc(field.id)+'"></div>';
  } else if(field.type==='select'){
    h+='<select class="ec-select" id="ec-f-'+esc(field.id)+'"><option value="">'+esc(t('Chọn','Select'))+'</option>'+(field.options||[]).map(function(o){var v=typeof o==='string'?o:o.value;var txt=typeof o==='string'?o:(o.label_vi||o.label||o.value);return '<option value="'+esc(v)+'"'+(String(val)===String(v)?' selected':'')+'>'+esc(t(txt,o.label_en||o.label||v))+'</option>';}).join('')+'</select>';
  } else if(field.type==='multi_select'){
    var cur=Array.isArray(val)?val:[];
    h+='<div class="ec-multi">'+(field.options||[]).map(function(o){var v=typeof o==='string'?o:o.value;var txt=typeof o==='string'?o:(o.label_vi||o.label||o.value);return '<label class="ec-check"><input type="checkbox" data-multi="'+esc(field.id)+'" value="'+esc(v)+'"'+(cur.indexOf(v)>=0?' checked':'')+'><span>'+esc(t(txt,o.label_en||o.label||v))+'</span></label>';}).join('')+'</div>';
  } else if(field.type==='checkbox'){
    h+='<label class="ec-check"><input id="ec-f-'+esc(field.id)+'" type="checkbox"'+(val===true||val==='true'||val===1?' checked':'')+'><span>'+esc(t(field.checkbox_label_vi||field.label_vi||field.id,field.checkbox_label_en||field.label_en||field.id))+'</span></label>';
  } else if(field.type==='textarea'){
    h+='<textarea class="ec-textarea" id="ec-f-'+esc(field.id)+'" placeholder="'+esc(t(field.placeholder_vi||'',field.placeholder_en||''))+'">'+esc(val)+'</textarea>';
  } else {
    var type=field.type==='date'?'date':field.type==='time'?'time':field.type==='number'?'number':'text';
    h+='<input class="ec-input" id="ec-f-'+esc(field.id)+'" type="'+type+'" value="'+esc(val)+'" placeholder="'+esc(t(field.placeholder_vi||'',field.placeholder_en||''))+'">';
  }
  if(note) h+='<div class="ec-note">'+esc(t(note,field.helper_en||field.note_en||note))+'</div>';
  h+='</div>';
  return h;
}

function renderContextChip(label,value){
  return '<div class="ec-context-chip"><small>'+esc(label)+'</small><strong>'+esc(value||'—')+'</strong></div>';
}

/* ── Signature helpers ── */
function approvalSteps(schema){
  if(Array.isArray(schema.approval_flow)&&schema.approval_flow.length) return schema.approval_flow.filter(function(s){return s&&(s.signature_block_id||s.id);}).map(function(s){return {id:String(s.signature_block_id||s.id),requiredOnSubmit:s.required_on_submit===true};});
  return (schema.signature_blocks||[]).filter(function(b){return b&&b.id;}).map(function(b){return {id:String(b.id),requiredOnSubmit:b.required_on_submit===true};});
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
function renderApprovalBar(allocation){
  if(!allocation) return '';
  var status=String(allocation.status||'').toLowerCase();
  if(status!=='submitted'&&status!=='in_review'&&status!=='approved'&&status!=='rejected') return '';
  var cls=status.replace('_','-');
  var html='<div class="ec-approval '+status+'">';
  if(status==='submitted') html+='<div class="ec-approval-text" style="color:var(--ec-warning)">'+esc(t('Chứng cứ đã nộp — sẵn sàng gửi duyệt','Evidence submitted — ready for review'))+'</div><button class="ec-btn primary" id="ec-submit-review" style="background:var(--ec-warning)">'+esc(t('Gửi duyệt','Submit for review'))+'</button>';
  else if(status==='in_review') html+='<div class="ec-approval-text" style="color:#c2410c">'+esc(t('Đang chờ xem xét','Pending review'))+'</div><button class="ec-btn danger" id="ec-reject">'+esc(t('Từ chối','Reject'))+'</button><button class="ec-btn success" id="ec-approve">'+esc(t('Duyệt','Approve'))+'</button>';
  else if(status==='approved') html+='<div class="ec-approval-text" style="color:var(--ec-success)">\u2713 '+esc(t('Đã phê duyệt','Approved'))+(allocation.approved_by?' — '+esc(allocation.approved_by):'')+'</div>';
  else if(status==='rejected') html+='<div class="ec-approval-text" style="color:var(--ec-danger)">\u2717 '+esc(t('Bị từ chối','Rejected'))+(allocation.rejection_reason?': '+esc(allocation.rejection_reason):'')+'</div>';
  html+='</div>';
  return html;
}

/* ── History ── */
function loadHistory(form){
  var el=document.getElementById('ec-history-content');
  if(!el) return;
  api('form_fill_history',{form_code:form.form_code,page:1,page_size:10},'GET').then(function(r){
    var entries=(r&&r.ok&&Array.isArray(r.entries))?r.entries:[];
    if(!entries.length){ el.innerHTML='<div style="text-align:center;color:var(--ec-text-muted);font-size:12px;padding:16px">'+esc(t('Chưa có bản nộp nào.','No submissions yet.'))+'</div>'; return; }
    el.innerHTML='<table class="ec-table"><thead><tr><th>'+esc(t('Mã hồ sơ','Record ID'))+'</th><th>'+esc(t('Người nộp','Submitted by'))+'</th><th>'+esc(t('Ngày','Date'))+'</th><th>'+esc(t('Trạng thái','Status'))+'</th></tr></thead><tbody>'+entries.map(function(e){
      var dt=e.submitted_at||e.created_at||'';
      return '<tr><td class="mono">'+esc(e.record_id||'—')+'</td><td>'+esc(e.submitted_by||'—')+'</td><td>'+esc(dt?new Date(dt).toLocaleString():'—')+'</td><td>'+(window.AllocationTracker?window.AllocationTracker.renderStatusBadge(e._status||e.approval_state||'submitted'):esc(e._status||'submitted'))+'</td></tr>';
    }).join('')+'</tbody></table>';
  }).catch(function(){ el.innerHTML='<div style="color:var(--ec-text-muted);font-size:12px">'+esc(t('Không thể tải lịch sử.','Could not load history.'))+'</div>'; });
}

/* ══════════════════════════════════════════════════════
   EVENT BINDING
   ══════════════════════════════════════════════════════ */

function bindWorkspace(form, allocation, container){
  /* step toggles */
  container.addEventListener('click', function(e){
    var toggle=e.target.closest('[data-toggle]');
    if(toggle){
      var stepEl=document.getElementById(toggle.getAttribute('data-toggle'));
      if(stepEl) stepEl.classList.toggle('collapsed');
    }
  });

  /* allocate */
  var deptEl=document.getElementById('ec-alloc-dept');
  if(deptEl) deptEl.onchange=function(){ws.allocDept=deptEl.value;};
  var notesEl=document.getElementById('ec-alloc-notes');
  if(notesEl) notesEl.oninput=function(){ws.allocNotes=notesEl.value;};
  var allocBtn=document.getElementById('ec-alloc-btn');
  if(allocBtn) allocBtn.onclick=function(){ doAllocate(form, container); };

  /* online form */
  if(allocation && form.online !== false){
    bindFormFields(form, allocation);
    bindSignatures(form);
    var saveDraftBtn=document.getElementById('ec-save-draft');
    if(saveDraftBtn) saveDraftBtn.onclick=function(){ saveDraft(form,allocation); };
    var resetBtn=document.getElementById('ec-reset-form');
    if(resetBtn) resetBtn.onclick=function(){ if(!confirm(t('Xóa dữ liệu đang nhập?','Clear form data?'))) return; ws.fieldValues={}; ws.signatures={}; clearDraft(form,allocation); renderWorkspace(form,allocation,container); bindWorkspace(form,allocation,container); };
    var submitBtn=document.getElementById('ec-submit-online');
    if(submitBtn) submitBtn.onclick=function(){ doSubmitOnline(form,allocation,submitBtn,container); };
    bindApprovalActions(form,allocation,container);
  }

  /* offline form */
  if(allocation && form.online === false){
    bindOffline(form, allocation, container);
  }
}

function doAllocate(form, container){
  if(ws.allocBusy) return;
  var rt=detectRecordType(form);
  if(!rt){ toast(t('Không xác định loại hồ sơ.','Cannot determine record type.'),'error'); return; }
  var dept=ws.allocDept||detectDepartment(form)||'QA';
  ws.allocBusy=true;
  renderWorkspace(form,null,container);
  bindWorkspace(form,null,container);

  var masterCtx={};
  if(window._ecState&&window._ecState.pendingContext) masterCtx=window._ecState.pendingContext;

  window.AllocationTracker.allocate(rt,dept,{
    year:new Date().getFullYear(),
    form_code:form.form_code,
    notes:(ws.allocNotes||'').trim(),
    master_context:masterCtx,
    linked_order_id:masterCtx.wo_number||masterCtx.jo_number||masterCtx.so_number||''
  }).then(function(resp){
    ws.allocBusy=false;
    ws.allocNotes='';
    if(!resp||!resp.ok){ toast(t('Không thể cấp mã.','Could not allocate.'),'error'); renderWorkspace(form,null,container); bindWorkspace(form,null,container); return; }
    toast(t('Đã cấp mã: ','Allocated: ')+(resp.record_id||''),'success');
    var st=window._ecState;
    st.selectedAllocationId=resp.allocation_id||'';

    /* reload allocations and re-render the entire page */
    var page=document.getElementById('page-forms');
    if(page && typeof window.renderOnlineForms === 'function'){
      /* quick reload: just refresh allocations and re-render */
      window.AllocationTracker.getHistory({form_code:form.form_code,page_size:50}).then(function(r){
        st.allocations=(r&&Array.isArray(r.entries))?r.entries.filter(function(a){return String(a.form_code||'')===form.form_code;}):[];
        if(!st.selectedAllocationId&&st.allocations.length) st.selectedAllocationId=st.allocations[0].allocation_id;
        /* re-render full page */
        var renderFn=window.renderOnlineForms;
        renderFn(form.form_code);

        /* auto-trigger download for offline */
        if(form.online===false){
          setTimeout(function(){
            var dlBtn=document.getElementById('ec-download-offline');
            if(dlBtn) dlBtn.click();
          },500);
        }
      });
    }
  }).catch(function(){
    ws.allocBusy=false;
    toast(t('Lỗi kết nối.','Connection error.'),'error');
    renderWorkspace(form,null,container);
    bindWorkspace(form,null,container);
  });
}

function bindFormFields(form,allocation){
  var schema=form.schema||ws.schema||{};
  /* hydrate defaults */
  (schema.fields||[]).forEach(function(field){
    if(ws.fieldValues[field.id]!==undefined&&ws.fieldValues[field.id]!==null&&ws.fieldValues[field.id]!=='') return;
    if(field.default==='today'&&field.type==='date'){ ws.fieldValues[field.id]=new Date().toISOString().slice(0,10); return; }
    if(field.default!==undefined&&field.default!==null&&field.default!==''&&field.default!=='today'){ ws.fieldValues[field.id]=field.default; return; }
    var ctx=allocation.master_context||{}; if(ctx[field.id]) ws.fieldValues[field.id]=ctx[field.id];
  });

  /* bind simple fields */
  (schema.fields||[]).forEach(function(field){
    if(field.type==='lookup') return;
    if(field.type==='multi_select'){
      var cur=Array.isArray(ws.fieldValues[field.id])?ws.fieldValues[field.id]:[];
      Array.prototype.forEach.call(document.querySelectorAll('[data-multi="'+field.id+'"]'),function(box){
        box.checked=cur.indexOf(box.value)>=0;
        box.onchange=function(){ ws.fieldValues[field.id]=Array.prototype.filter.call(document.querySelectorAll('[data-multi="'+field.id+'"]:checked'),function(n){return n.checked;}).map(function(n){return n.value;}); };
      });
      return;
    }
    var el=document.getElementById('ec-f-'+field.id); if(!el) return;
    var val=ws.fieldValues[field.id]; if(val===undefined||val===null) val='';
    if(field.type==='checkbox'){ el.checked=val===true||val==='true'||val===1; el.onchange=function(){ws.fieldValues[field.id]=!!el.checked;}; return; }
    el.value=val;
    el.oninput=el.onchange=function(){ ws.fieldValues[field.id]=field.type==='number'?(el.value===''?'':Number(el.value)):el.value; };
  });

  /* mount lookups */
  ws.lookupInstances={};
  (schema.fields||[]).filter(function(f){return f.type==='lookup';}).forEach(function(field){
    var hostId='ec-f-'+field.id; if(!document.getElementById(hostId)) return;
    var items=buildLookupItems(field);
    if(typeof window.SearchableInput==='function'){
      var inst=new window.SearchableInput({containerId:hostId,fieldId:'ec-si-'+field.id,name:field.id,dataSource:items,displayField:'label',valueField:'value',subField:'sub',strictSelect:field.strict_select!==false,storeValueInHiddenField:true,placeholderVi:field.placeholder_vi||t('Tìm và chọn','Search and select'),placeholder:field.placeholder_en||'Search and select',onSelect:function(item){ ws.fieldValues[field.id]=item?item.value:''; if(item&&field.autofill_map) Object.keys(field.autofill_map).forEach(function(target){var src=field.autofill_map[target];if(item[src]!==undefined) ws.fieldValues[target]=item[src];}); }});
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
  if(src==='machines') return (master.machines||[]).filter(function(i){return !cv.work_center_id||String(i.work_center_id||'')===String(cv.work_center_id);}).map(function(i){return {value:i.machine_id,label:i.machine_id,sub:i.machine_name||''};});
  if(src==='operators') return (master.operators||[]).map(function(i){return {value:i.operator_id,label:i.operator_id,sub:i.operator_name||''};});
  if(src==='sales_orders') return (ws.orders.sales_orders||[]).filter(function(i){return !cv.customer_id||String(i.customer_id||'')===String(cv.customer_id);});
  if(src==='job_orders') return (ws.orders.job_orders||[]).filter(function(i){return !cv.so_number||String(i.so_number||'')===String(cv.so_number);});
  if(src==='work_orders') return (ws.orders.work_orders||[]).filter(function(i){return !cv.jo_number||String(i.jo_number||'')===String(cv.jo_number);});
  if(src==='nc_program_releases') return (master.nc_program_releases||[]).map(function(i){return {value:i.program_id,label:i.program_id,sub:i.release_title||''};});
  if(src==='tooling_assets') return (master.tooling_assets||[]).map(function(i){return {value:i.tool_id,label:i.tool_id,sub:i.tool_name||''};});
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
    if(!f.required) return;
    var v=ws.fieldValues[f.id];
    if(f.type==='multi_select'){if(!Array.isArray(v)||!v.length) missing.push(t(f.label_vi||f.id,f.label_en||f.id));return;}
    if(f.type==='checkbox'){if(v!==true) missing.push(t(f.label_vi||f.id,f.label_en||f.id));return;}
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
      toast(t('Đã gửi biểu mẫu thành công.','Form submitted successfully.'),'success');
      if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);
    } else toast(t('Không thể gửi.','Could not submit.'),'error');
  }).catch(function(){toast(t('Lỗi kết nối.','Connection error.'),'error');}).finally(function(){button.disabled=false;});
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
      var pw=prompt(t('Nhập mật khẩu xác nhận:','Enter password to confirm:'));
      if(!pw){toast(t('Đã hủy.','Cancelled.'),'warn');return;}
      approveBtn.disabled=true;
      api('evidence_review',{allocation_id:allocation.allocation_id,action:'approve',reason:sigData.reason||'',signature_data:sigData,password:pw},'POST').then(function(r){
        if(r&&r.ok){toast(t('Đã phê duyệt.','Approved.'),'success');if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);}
        else toast(t('Lỗi: ','Error: ')+(r&&r.error||''),'error');
      }).finally(function(){approveBtn.disabled=false;});
    }});
  };
  var rejectBtn=document.getElementById('ec-reject');
  if(rejectBtn) rejectBtn.onclick=function(){
    var reason=prompt(t('Lý do từ chối:','Rejection reason:'));
    if(!reason||!reason.trim()){toast(t('Phải nhập lý do.','Reason required.'),'warn');return;}
    rejectBtn.disabled=true;
    api('evidence_review',{allocation_id:allocation.allocation_id,action:'reject',reason:reason.trim()},'POST').then(function(r){
      if(r&&r.ok){toast(t('Đã từ chối.','Rejected.'),'success');if(typeof window.renderOnlineForms==='function') window.renderOnlineForms(form.form_code);}
      else toast(t('Lỗi.','Error.'),'error');
    }).finally(function(){rejectBtn.disabled=false;});
  };
}

/* ── Offline binding ── */
function bindOffline(form,allocation,container){
  var dlBtn=document.getElementById('ec-download-offline');
  if(dlBtn&&window.AllocationTracker) dlBtn.onclick=function(){
    dlBtn.disabled=true;
    window.AllocationTracker.downloadForm(allocation.allocation_id,form.form_code,{master_context:allocation.master_context||{}}).then(function(r){
      if(r&&r.ok) toast(t('Đã tải gói Excel.','Excel package downloaded.'),'success');
      else toast(t('Không thể tải.','Could not download.'),'error');
    }).finally(function(){dlBtn.disabled=false;});
  };

  var copyBtn=document.getElementById('ec-copy-filename');
  if(copyBtn) copyBtn.onclick=function(){
    var fname=(allocation.offline_package&&allocation.offline_package.filename)||allocation.suggested_filename||'';
    if(window.AllocationTracker) window.AllocationTracker.copyToClipboard(fname);
    toast(t('Đã sao chép.','Copied.'),'success');
  };

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
    if(!valid.length){toast(t('Không có file hợp lệ.','No valid files.'),'warn');return;}
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

/* backward compat */
window._renderFillDownload = function(forms, entries, container){
  /* no-op: old orchestrator calls this, but new one uses _renderWorkspace */
};
window._renderRecordIdGenerator = function(){};
window._renderUploadVerify = function(){};

})();
