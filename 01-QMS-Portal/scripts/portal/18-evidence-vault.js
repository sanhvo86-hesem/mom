/* ===================================================================
   18-evidence-vault.js
   HESEM QMS Portal - Evidence Vault
   Secure evidence storage with chain-of-custody, hash verification,
   linking to quality entities, drag-and-drop upload.
   =================================================================== */

(function(){
'use strict';

/* ── helpers ──────────────────────────────────────────── */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }
function _api(action, payload, method){
  if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000);
  return fetch('api.php?action='+encodeURIComponent(action),{method:method||'POST',credentials:'include',headers:{'Content-Type':'application/json',...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})}).then(function(r){return r.json();});
}
function _toast(msg, type){ if(typeof showToast==='function') return showToast(msg, type); var box=document.createElement('div'); box.className='sj-toast '+(type||'info'); box.textContent=msg; document.body.appendChild(box); requestAnimationFrame(function(){ box.classList.add('show'); }); setTimeout(function(){ box.classList.remove('show'); setTimeout(function(){ if(box.parentNode) box.remove(); },180); },3200); }
function _fmtDate(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function _fmtDateTime(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):_fmtDate(v)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function _fmtSize(bytes){ if(!bytes) return '-'; if(bytes<1024) return bytes+' B'; if(bytes<1048576) return (bytes/1024).toFixed(1)+' KB'; return (bytes/1048576).toFixed(1)+' MB'; }

/* ── constants ────────────────────────────────────────── */
var STYLE_ID = 'ev-styles';
function _hasExternalStylesheet(hrefPart){
  try{ return !!document.querySelector('link[rel="stylesheet"][href*="'+hrefPart+'"]'); }
  catch(_){ return false; }
}
var TABS = [
  { key:'browse',    vi:'Duyệt',        en:'Browse' },
  { key:'upload',    vi:'Tải lên',       en:'Upload' },
  { key:'detail',    vi:'Chi tiết',      en:'Detail' },
  { key:'search',    vi:'Tìm kiếm',     en:'Search' },
  { key:'integrity', vi:'Toàn vẹn',      en:'Integrity' }
];

var EV_TYPES = {
  photo:       { vi:'Ảnh',          en:'Photo',        icon:'\ud83d\udcf7' },
  video:       { vi:'Video',        en:'Video',        icon:'\ud83c\udfac' },
  document:    { vi:'Tài liệu',     en:'Document',     icon:'\ud83d\udcc4' },
  measurement: { vi:'Đo lường',     en:'Measurement',  icon:'\ud83d\udccf' },
  machine_log: { vi:'Log máy',      en:'Machine Log',  icon:'\ud83d\udda5\ufe0f' },
  cert:        { vi:'Chứng chỉ',    en:'Certificate',  icon:'\ud83d\udee1\ufe0f' }
};

var CUSTODY_ACTIONS = {
  uploaded:  { vi:'Đã tải lên',     en:'Uploaded',     color:'var(--blue,#2563eb)' },
  viewed:    { vi:'Đã xem',        en:'Viewed',       color:'var(--purple,#8b5cf6)' },
  linked:    { vi:'Đã liên kết',    en:'Linked',       color:'var(--amber,#f59e0b)' },
  verified:  { vi:'Đã xác minh',    en:'Verified',     color:'var(--green,#22c55e)' },
  modified:  { vi:'Đã sửa',        en:'Modified',     color:'var(--red,#ef4444)' },
  downloaded:{ vi:'Đã tải xuống',   en:'Downloaded',   color:'var(--cyan,#06b6d4)' }
};

var ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','video/mp4','video/quicktime','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','text/plain','application/json'];

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'browse',
  evidence: [],
  selectedId: null,
  selectedItem: null,
  custody: [],
  chainValid: null,
  searchQuery: '',
  searchResults: [],
  filters: { type:'all', dateFrom:'', dateTo:'', linkedTo:'' },
  pagination: { offset:0, limit:50, total:0 },
  loading: false,
  uploading: false,
  verifying: false,
  verifyProgress: 0
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(_hasExternalStylesheet('styles/evidence-vault.css') || _hasExternalStylesheet('evidence-vault.css')) return;
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.ev{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.ev-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.ev-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.ev-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.ev-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}',
    '.ev-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;overflow:hidden;cursor:pointer;transition:box-shadow .15s}',
    '.ev-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}',
    '.ev-card-thumb{height:120px;display:flex;align-items:center;justify-content:center;background:var(--surface,#f8fafc);font-size:2.5rem;border-bottom:1px solid var(--border,#e2e8f0)}',
    '.ev-card-thumb img{width:100%;height:100%;object-fit:cover}',
    '.ev-card-body{padding:10px 12px}',
    '.ev-card-title{font-size:.8125rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ev-card-meta{font-size:.6875rem;color:var(--text-secondary,#64748b);margin-top:4px;display:flex;gap:8px}',
    '.ev-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff;white-space:nowrap}',
    '.ev-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.ev-filters select,.ev-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.ev-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.ev-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.ev-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.ev-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.ev-btn-secondary:hover{background:#e2e8f0}',
    '.ev-btn-success{background:var(--green,#22c55e);color:#fff}',
    '.ev-btn-success:hover{background:#16a34a}',
    '.ev-dropzone{border:2px dashed var(--border,#d1d5db);border-radius:12px;padding:40px;text-align:center;transition:border-color .15s,background .15s;cursor:pointer}',
    '.ev-dropzone.drag-over{border-color:var(--brand,#1565c0);background:rgba(21,101,192,.04)}',
    '.ev-dropzone-icon{font-size:3rem;margin-bottom:8px;opacity:.5}',
    '.ev-dropzone-text{font-size:.875rem;color:var(--text-secondary,#64748b)}',
    '.ev-dropzone-hint{font-size:.75rem;color:var(--text-secondary,#94a3b8);margin-top:4px}',
    '.ev-detail{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:20px;margin-bottom:16px}',
    '.ev-detail h3{font-size:1rem;font-weight:800;margin:0 0 12px}',
    '.ev-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.8125rem}',
    '.ev-detail-label{font-weight:700;color:var(--text-secondary,#64748b);font-size:.75rem}',
    '.ev-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.ev-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.ev-form input,.ev-form select,.ev-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.ev-form textarea{min-height:60px;resize:vertical}',
    '.ev-timeline{position:relative;padding-left:28px;margin-top:16px}',
    '.ev-timeline::before{content:"";position:absolute;left:10px;top:0;bottom:0;width:2px;background:var(--border,#e2e8f0)}',
    '.ev-timeline-item{position:relative;margin-bottom:14px;padding:10px 14px;background:var(--surface,#f8fafc);border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.8125rem}',
    '.ev-timeline-item::before{content:"";position:absolute;left:-22px;top:14px;width:10px;height:10px;border-radius:50%;border:2px solid #fff}',
    '.ev-chain{margin-top:16px}',
    '.ev-chain-link{display:flex;align-items:center;gap:10px;margin-bottom:6px;padding:8px 12px;border-radius:6px;font-size:.8125rem}',
    '.ev-chain-hash{font-family:monospace;font-size:.6875rem;color:var(--text-secondary,#64748b);overflow:hidden;text-overflow:ellipsis;max-width:200px}',
    '.ev-chain-valid{background:#f0fdf4;border:1px solid #bbf7d0}',
    '.ev-chain-invalid{background:#fef2f2;border:1px solid #fecaca}',
    '.ev-chain-pending{background:var(--surface,#f8fafc);border:1px solid var(--border,#e2e8f0)}',
    '.ev-progress{height:8px;border-radius:4px;background:#e2e8f0;overflow:hidden;margin:12px 0}',
    '.ev-progress-fill{height:100%;border-radius:4px;background:var(--brand,#1565c0);transition:width .3s}',
    '.ev-search-result{padding:12px;border:1px solid var(--border,#e2e8f0);border-radius:8px;margin-bottom:8px;cursor:pointer;transition:background .15s}',
    '.ev-search-result:hover{background:var(--surface,#f8fafc)}',
    '.ev-search-highlight{background:#fef08a;color:#92400e;border-radius:2px;padding:0 2px}',
    '.ev-paging{display:flex;justify-content:center;gap:8px;margin-top:16px;align-items:center;font-size:.8125rem}',
    '.ev-paging button{padding:6px 12px;border:1px solid var(--border,#d1d5db);border-radius:6px;background:var(--surface,#fff);cursor:pointer;font-size:.8125rem}',
    '.ev-paging button:disabled{opacity:.4;cursor:default}',
    '.ev-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    '.ev-linked-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
    '.ev-linked-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:.6875rem;font-weight:600;background:var(--surface,#f1f5f9);border:1px solid var(--border,#e2e8f0);color:var(--text,#0f172a)}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── type helpers ─────────────────────────────────────── */
function _typeIcon(type){
  var m=EV_TYPES[type];
  return m?m.icon:'\ud83d\udcc4';
}
function _typeBadge(type){
  var m=EV_TYPES[type]||{vi:type,en:type,icon:'\ud83d\udcc4'};
  return '<span class="ev-badge" style="background:var(--ev-primary,var(--brand-2,#1565c0))">'+m.icon+' '+_esc(_t(m.vi,m.en))+'</span>';
}

/* ── tab: browse ──────────────────────────────────────── */
function _renderBrowseTab(){
  var html=_renderFilters();
  if(!state.evidence.length) return html+'<div class="ev-empty">'+_t('Chưa có bằng chứng','No evidence found')+'</div>';

  html+='<div class="ev-grid">';
  state.evidence.forEach(function(item){
    var isImage=item.type==='photo'&&item.thumbnail_url;
    html+='<div class="ev-card" data-action="view-detail" data-id="'+_esc(item.id)+'">';
    if(isImage){
      html+='<div class="ev-card-thumb"><img src="'+_esc(item.thumbnail_url)+'" alt="'+_esc(item.title)+'"></div>';
    } else {
      html+='<div class="ev-card-thumb">'+_typeIcon(item.type)+'</div>';
    }
    html+='<div class="ev-card-body">'
      +'<div class="ev-card-title">'+_esc(item.title||item.filename||'-')+'</div>'
      +'<div class="ev-card-meta">'
        +_typeBadge(item.type)
        +'<span>'+_fmtDate(item.created_at)+'</span>'
        +'<span>'+_fmtSize(item.file_size)+'</span>'
      +'</div>'
    +'</div></div>';
  });
  html+='</div>';
  html+=_renderPaging();
  return html;
}

function _renderFilters(){
  var f=state.filters;
  var html='<div class="ev-filters">';
  html+='<select data-filter="type"><option value="all">'+_t('Tất cả loại','All Types')+'</option>';
  Object.keys(EV_TYPES).forEach(function(k){var m=EV_TYPES[k]; html+='<option value="'+k+'"'+(f.type===k?' selected':'')+'>'+m.icon+' '+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select>';
  html+='<input type="date" data-filter="dateFrom" value="'+_esc(f.dateFrom)+'" title="'+_t('Từ ngày','From')+'">';
  html+='<input type="date" data-filter="dateTo" value="'+_esc(f.dateTo)+'" title="'+_t('Đến ngày','To')+'">';
  html+='<input type="text" data-filter="linkedTo" placeholder="'+_t('Liên kết (NCR, SO...)','Linked to (NCR, SO...)')+'" value="'+_esc(f.linkedTo)+'" style="width:180px">';
  html+='</div>';
  return html;
}

/* ── tab: upload ──────────────────────────────────────── */
function _renderUploadTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Tải bằng chứng lên','Upload Evidence')+'</h3>';

  html+='<div class="ev-dropzone" id="ev-dropzone">'
    +'<div class="ev-dropzone-icon">\ud83d\udce4</div>'
    +'<div class="ev-dropzone-text">'+_t('Kéo thả file vào đây hoặc nhấp để chọn','Drag & drop files here or click to browse')+'</div>'
    +'<div class="ev-dropzone-hint">'+_t('Hỗ trợ: ảnh, PDF, video, CSV, Excel','Supported: images, PDF, video, CSV, Excel')+'</div>'
    +'<input type="file" id="ev-file-input" style="display:none" multiple accept="'+ALLOWED_TYPES.join(',')+'">'
  +'</div>';

  if(state.uploading){
    html+='<div style="margin-top:16px;text-align:center;color:var(--text-secondary)">'+_t('Đang tải lên...','Uploading...')+'</div>';
  }

  html+='<div class="ev-detail" style="margin-top:20px"><h4 style="margin:0 0 12px">'+_t('Thông tin bổ sung','Metadata')+'</h4>'
    +'<div class="ev-form">'
      +'<div><label>'+_t('Tiêu đề','Title')+'</label><input type="text" id="ev-f-title"></div>'
      +'<div><label>'+_t('Loại','Type')+'</label><select id="ev-f-type">';
  Object.keys(EV_TYPES).forEach(function(k){var m=EV_TYPES[k]; html+='<option value="'+k+'">'+m.icon+' '+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>'
    +'<div><label>'+_t('Tags','Tags')+'</label><input type="text" id="ev-f-tags" placeholder="'+_t('tag1, tag2...','tag1, tag2...')+'"></div>'
    +'<div><label>'+_t('Liên kết','Linked To')+'</label><input type="text" id="ev-f-linked" placeholder="'+_t('NCR-001, SO-123...','NCR-001, SO-123...')+'"></div>'
    +'<div style="grid-column:1/-1"><label>'+_t('Mô tả','Description')+'</label><textarea id="ev-f-desc"></textarea></div>'
  +'</div>'
  +'<div style="margin-top:12px"><button class="ev-btn ev-btn-primary" data-action="submit-upload">'+_t('Tải lên','Upload')+'</button></div>'
  +'</div>';
  return html;
}

/* ── tab: detail ──────────────────────────────────────── */
function _renderDetailTab(){
  var item=state.selectedItem;
  if(!item) return '<div class="ev-empty">'+_t('Chọn một bằng chứng để xem chi tiết','Select evidence to view details')+'</div>';

  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_esc(item.title||item.filename||'-')+'</h3>'
    +'<button class="ev-btn ev-btn-secondary" data-action="back-browse">'+_t('Quay lại','Back')+'</button>'
  +'</div>';

  /* preview */
  html+='<div class="ev-detail">';
  if(item.type==='photo'&&item.url){
    html+='<div style="text-align:center;margin-bottom:16px"><img src="'+_esc(item.url)+'" style="max-width:100%;max-height:400px;border-radius:var(--radius-lg,8px);border:var(--card-border-width,1px) solid var(--border,#e2e8f0)" alt="'+_esc(item.title)+'"></div>';
  } else {
    html+='<div style="text-align:center;padding:40px;font-size:4rem;opacity:.3">'+_typeIcon(item.type)+'</div>';
  }

  html+='<div class="ev-detail-grid">'
    +'<div><div class="ev-detail-label">'+_t('Loại','Type')+'</div>'+_typeBadge(item.type)+'</div>'
    +'<div><div class="ev-detail-label">'+_t('Kích thước','Size')+'</div>'+_esc(_fmtSize(item.file_size))+'</div>'
    +'<div><div class="ev-detail-label">'+_t('Ngày tạo','Created')+'</div>'+_fmtDateTime(item.created_at)+'</div>'
    +'<div><div class="ev-detail-label">'+_t('Người tạo','Created By')+'</div>'+_esc(item.created_by||'-')+'</div>'
    +'<div><div class="ev-detail-label">'+_t('Tên file','Filename')+'</div>'+_esc(item.filename||'-')+'</div>'
    +'<div><div class="ev-detail-label">'+_t('Hash SHA-256','SHA-256 Hash')+'</div><span style="font-family:monospace;font-size:.6875rem;word-break:break-all">'+_esc(item.hash||'-')+'</span></div>'
  +'</div>';

  if(item.description){
    html+='<div style="margin-top:12px"><div class="ev-detail-label">'+_t('Mô tả','Description')+'</div>'+_esc(item.description)+'</div>';
  }

  /* tags */
  var tags=item.tags||[];
  if(tags.length){
    html+='<div style="margin-top:12px"><div class="ev-detail-label">Tags</div><div class="ev-linked-tags">';
    tags.forEach(function(tag){ html+='<span class="ev-linked-tag">'+_esc(tag)+'</span>'; });
    html+='</div></div>';
  }

  /* linked entities */
  var linked=item.linked_entities||[];
  if(linked.length){
    html+='<div style="margin-top:12px"><div class="ev-detail-label">'+_t('Liên kết','Linked Entities')+'</div><div class="ev-linked-tags">';
    linked.forEach(function(le){ html+='<span class="ev-linked-tag">'+_esc(le.type||'')+': '+_esc(le.id||le.label||'')+'</span>'; });
    html+='</div></div>';
  }
  html+='</div>';

  /* chain of custody */
  html+='<div class="ev-detail"><h4 style="margin:0 0 12px">'+_t('Chuỗi lưu giữ','Chain of Custody')+'</h4>';
  var custody=state.custody;
  if(!custody.length){
    html+='<div class="ev-empty">'+_t('Chưa có dữ liệu','No custody data')+'</div>';
  } else {
    html+='<div class="ev-timeline">';
    custody.forEach(function(entry){
      var act=CUSTODY_ACTIONS[entry.action]||{vi:entry.action,en:entry.action,color:'var(--text-secondary,#64748b)'};
      html+='<div class="ev-timeline-item" style="border-left-color:'+act.color+'">'
        +'<div style="position:absolute;left:-22px;top:14px;width:10px;height:10px;border-radius:50%;background:'+act.color+';border:2px solid var(--bg-surface,#fff)"></div>'
        +'<div style="display:flex;justify-content:space-between;align-items:center">'
          +'<strong>'+_esc(_t(act.vi,act.en))+'</strong>'
          +'<span style="font-size:.6875rem;color:var(--text-secondary)">'+_fmtDateTime(entry.timestamp)+'</span>'
        +'</div>'
        +'<div style="font-size:.75rem;color:var(--text-secondary);margin-top:4px">'+_esc(entry.user||'-')+(entry.note?' - '+_esc(entry.note):'')+'</div>'
      +'</div>';
    });
    html+='</div>';
  }
  html+='</div>';

  /* link new entity */
  html+='<div class="ev-detail"><h4 style="margin:0 0 10px">'+_t('Liên kết thêm','Link to Entity')+'</h4>'
    +'<div style="display:flex;gap:8px;align-items:center">'
      +'<input type="text" id="ev-link-entity" placeholder="'+_t('VD: NCR-001, SO-456','e.g. NCR-001, SO-456')+'" style="flex:1;min-height:0;height:auto;padding:var(--input-padding-y,0px) var(--hds-control-px,10px);border:var(--input-border-width,1px) solid var(--border,#d1d5db);border-radius:var(--hds-control-radius,var(--radius-md,6px));font-size:var(--hds-control-font,13px);background:var(--input-bg,var(--bg-surface,#fff));color:var(--text-primary,#0f172a)">'
      +'<button class="ev-btn ev-btn-primary" data-action="link-entity" data-id="'+_esc(item.id)+'">'+_t('Liên kết','Link')+'</button>'
    +'</div></div>';
  return html;
}

/* ── tab: search ──────────────────────────────────────── */
function _renderSearchTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Tìm kiếm bằng chứng','Search Evidence')+'</h3>';
  html+='<div style="display:flex;gap:8px;margin-bottom:16px">'
    +'<input type="text" id="ev-search-input" placeholder="'+_t('Nhập từ khóa...','Enter keywords...')+'" value="'+_esc(state.searchQuery)+'" style="flex:1;min-height:0;height:auto;padding:var(--input-padding-y,0px) var(--hds-control-px,12px);border:var(--input-border-width,1px) solid var(--border,#d1d5db);border-radius:var(--hds-control-radius,var(--radius-md,6px));font-size:var(--hds-control-font,14px);background:var(--input-bg,var(--bg-surface,#fff));color:var(--text-primary,#0f172a)">'
    +'<button class="ev-btn ev-btn-primary" data-action="do-search">'+_t('Tìm','Search')+'</button>'
  +'</div>';

  if(!state.searchResults.length&&state.searchQuery){
    html+='<div class="ev-empty">'+_t('Không tìm thấy kết quả','No results found')+'</div>';
  } else {
    state.searchResults.forEach(function(item){
      var snippet=item.snippet||item.description||'';
      if(state.searchQuery){
        var re=new RegExp('('+_esc(state.searchQuery).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
        snippet=_esc(snippet).replace(re,'<span class="ev-search-highlight">$1</span>');
      } else {
        snippet=_esc(snippet);
      }
      html+='<div class="ev-search-result" data-action="view-detail" data-id="'+_esc(item.id)+'">'
        +'<div style="display:flex;align-items:center;gap:8px">'
          +'<span style="font-size:1.25rem">'+_typeIcon(item.type)+'</span>'
          +'<strong>'+_esc(item.title||item.filename||'-')+'</strong>'
          +_typeBadge(item.type)
          +'<span style="font-size:.6875rem;color:var(--text-secondary)">'+_fmtDate(item.created_at)+'</span>'
        +'</div>'
        +'<div style="font-size:.8125rem;color:var(--text-secondary);margin-top:6px">'+snippet+'</div>'
      +'</div>';
    });
  }
  return html;
}

/* ── tab: integrity ───────────────────────────────────── */
function _renderIntegrityTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Xác minh toàn vẹn','Integrity Verification')+'</h3>';
  html+='<div class="ev-detail">'
    +'<p style="font-size:.8125rem;color:var(--text-secondary)">'+_t('Kiểm tra chuỗi hash để xác minh toàn vẹn dữ liệu. Mỗi bằng chứng có SHA-256 hash và liên kết theo chuỗi.','Verify the hash chain to ensure data integrity. Each evidence item has a SHA-256 hash linked in sequence.')+'</p>'
    +'<button class="ev-btn ev-btn-primary" data-action="verify-chain"'+(state.verifying?' disabled':'')+'>'+_t('Bắt đầu xác minh','Start Verification')+'</button>'
  +'</div>';

  if(state.verifying){
    html+='<div class="ev-detail"><h4 style="margin:0 0 8px">'+_t('Đang xác minh...','Verifying...')+'</h4>'
      +'<div class="ev-progress"><div class="ev-progress-fill" style="width:'+state.verifyProgress+'%"></div></div>'
      +'<div style="text-align:center;font-size:.8125rem;color:var(--text-secondary)">'+state.verifyProgress+'%</div>'
    +'</div>';
  }

  if(state.chainValid!==null){
    var chains=state.chainValid;
    if(Array.isArray(chains)&&chains.length){
      html+='<div class="ev-detail"><h4 style="margin:0 0 12px">'+_t('Kết quả','Results')+'</h4>';
      var allValid=true;
      html+='<div class="ev-chain">';
      chains.forEach(function(link, idx){
        var valid=link.valid;
        if(!valid) allValid=false;
        var cls=valid?'ev-chain-valid':'ev-chain-invalid';
        html+='<div class="ev-chain-link '+cls+'">'
          +'<span style="font-weight:700;width:30px">#'+(idx+1)+'</span>'
          +'<span style="flex:1">'+_esc(link.title||link.id||'-')+'</span>'
          +'<span class="ev-chain-hash" title="'+_esc(link.hash||'')+'">'+_esc((link.hash||'').substring(0,16))+'...</span>'
          +'<span style="font-weight:700;color:'+(valid?'var(--green,#22c55e)':'var(--red,#ef4444)')+'">'+(valid?'\u2713':'\u2717')+'</span>'
        +'</div>';
      });
      html+='</div>';
      html+='<div style="margin-top:12px;padding:12px;border-radius:var(--radius-lg,8px);font-weight:700;text-align:center;'+(allValid?'background:color-mix(in srgb, var(--green,#22c55e) 10%, var(--bg-surface,#fff));color:color-mix(in srgb, var(--green,#22c55e) 82%, #000);border:1px solid color-mix(in srgb, var(--green,#22c55e) 26%, var(--border,#e2e8f0))':'background:color-mix(in srgb, var(--red,#ef4444) 10%, var(--bg-surface,#fff));color:color-mix(in srgb, var(--red,#ef4444) 82%, #000);border:1px solid color-mix(in srgb, var(--red,#ef4444) 26%, var(--border,#e2e8f0))')+'">'
        +(allValid?_t('Chuoi hash HOP LE - Toan ven du lieu duoc dam bao','Hash chain VALID - Data integrity verified'):_t('Chuoi hash KHONG HOP LE - Phat hien thay doi trai phep','Hash chain INVALID - Tampering detected'))
      +'</div>';
      html+='</div>';
    } else if(chains===true){
      html+='<div class="ev-detail" style="background:color-mix(in srgb, var(--green,#22c55e) 10%, var(--bg-surface,#fff));border-color:color-mix(in srgb, var(--green,#22c55e) 26%, var(--border,#e2e8f0));text-align:center;padding:24px">'
        +'<div style="font-size:2rem;margin-bottom:8px">\u2705</div>'
        +'<div style="font-weight:800;color:color-mix(in srgb, var(--green,#22c55e) 82%, #000)">'+_t('Toan ven duoc xac minh','Integrity Verified')+'</div>'
      +'</div>';
    } else {
      html+='<div class="ev-detail" style="background:color-mix(in srgb, var(--red,#ef4444) 10%, var(--bg-surface,#fff));border-color:color-mix(in srgb, var(--red,#ef4444) 26%, var(--border,#e2e8f0));text-align:center;padding:24px">'
        +'<div style="font-size:2rem;margin-bottom:8px">\u274c</div>'
        +'<div style="font-weight:800;color:color-mix(in srgb, var(--red,#ef4444) 82%, #000)">'+_t('Phat hien van de toan ven','Integrity Issue Detected')+'</div>'
      +'</div>';
    }
  }
  return html;
}

/* ── paging ───────────────────────────────────────────── */
function _renderPaging(){
  var p=state.pagination;
  var page=Math.floor(p.offset/p.limit)+1;
  var pages=Math.max(1,Math.ceil(p.total/p.limit));
  return '<div class="ev-paging">'
    +'<button data-action="page-prev"'+(page<=1?' disabled':'')+'>'+_t('Trước','Prev')+'</button>'
    +'<span>'+page+' / '+pages+' ('+p.total+')</span>'
    +'<button data-action="page-next"'+(page>=pages?' disabled':'')+'>'+_t('Sau','Next')+'</button>'
  +'</div>';
}

/* ── data loading ─────────────────────────────────────── */
function _loadEvidence(){
  state.loading=true; _paint();
  var p=Object.assign({}, state.filters, {offset:state.pagination.offset, limit:state.pagination.limit});
  _api('evidence_list', p).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.evidence=r.items||[];
      state.pagination.total=r.total||0;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Lỗi kết nối','Connection error'),'error'); _paint(); });
}

function _loadDetail(id){
  _api('evidence_detail',{id:id}).then(function(r){
    if(r&&r.ok){
      state.selectedItem=r.item||null;
      state.custody=r.custody||[];
      state.activeTab='detail';
    } else {
      _toast(_t('Không tìm thấy','Not found'),'error');
    }
    _paint();
  }).catch(function(){ _toast(_t('Lỗi kết nối','Connection error'),'error'); });
}

function _doSearch(){
  if(!state.searchQuery){ state.searchResults=[]; _paint(); return; }
  state.loading=true; _paint();
  _api('evidence_search',{query:state.searchQuery}).then(function(r){
    state.loading=false;
    state.searchResults=(r&&r.ok)?r.items||[]:[];
    _paint();
  }).catch(function(){ state.loading=false; _paint(); });
}

function _doUpload(files){
  if(!files||!files.length) return;
  var title=(state.container.querySelector('#ev-f-title')||{}).value||'';
  var type=(state.container.querySelector('#ev-f-type')||{}).value||'document';
  var tags=(state.container.querySelector('#ev-f-tags')||{}).value||'';
  var linked=(state.container.querySelector('#ev-f-linked')||{}).value||'';
  var desc=(state.container.querySelector('#ev-f-desc')||{}).value||'';

  var formData=new FormData();
  for(var i=0;i<files.length;i++){
    var file=files[i];
    if(ALLOWED_TYPES.indexOf(file.type)<0){
      _toast(_t('Loại file không hỗ trợ: ','Unsupported file type: ')+file.name,'error');
      continue;
    }
    formData.append('files[]', file);
  }
  formData.append('title', title);
  formData.append('type', type);
  formData.append('tags', tags);
  formData.append('linked', linked);
  formData.append('description', desc);

  state.uploading=true; _paint();
  var url='api.php?action=evidence_upload';
  var headers={};
  if(typeof csrfToken!=='undefined'&&csrfToken) headers['X-CSRF-Token']=csrfToken;
  fetch(url,{method:'POST',credentials:'include',headers:headers,body:formData}).then(function(r){return r.json();}).then(function(r){
    state.uploading=false;
    if(r&&r.ok){
      _toast(_t('Tải lên thành công','Upload successful'),'success');
      state.activeTab='browse';
      _loadEvidence();
    } else {
      _toast(r&&r.message?r.message:_t('Lỗi tải lên','Upload failed'),'error');
      _paint();
    }
  }).catch(function(){ state.uploading=false; _toast(_t('Lỗi kết nối','Connection error'),'error'); _paint(); });
}

function _verifyChain(){
  state.verifying=true; state.verifyProgress=0; state.chainValid=null; _paint();
  var progress=setInterval(function(){
    state.verifyProgress=Math.min(90, state.verifyProgress+10);
    _paint();
  }, 300);

  _api('evidence_verify_chain',{}).then(function(r){
    clearInterval(progress);
    state.verifying=false;
    state.verifyProgress=100;
    if(r&&r.ok){
      state.chainValid=r.chain||r.valid||true;
    } else {
      state.chainValid=false;
    }
    _paint();
  }).catch(function(){
    clearInterval(progress);
    state.verifying=false;
    state.chainValid=false;
    _toast(_t('Lỗi xác minh','Verification error'),'error');
    _paint();
  });
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="ev">';
  html+='<div class="ev-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="ev-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading&&state.activeTab!=='integrity'){
    html+='<div class="ev-empty">'+_t('Đang tải...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'browse':    html+=_renderBrowseTab(); break;
      case 'upload':    html+=_renderUploadTab(); break;
      case 'detail':    html+=_renderDetailTab(); break;
      case 'search':    html+=_renderSearchTab(); break;
      case 'integrity': html+=_renderIntegrityTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;
  _bindDropzone();
}

/* ── dropzone binding ─────────────────────────────────── */
function _bindDropzone(){
  var dz=state.container.querySelector('#ev-dropzone');
  var fi=state.container.querySelector('#ev-file-input');
  if(!dz||!fi) return;

  dz.addEventListener('click', function(){ fi.click(); });
  fi.addEventListener('change', function(){ if(fi.files&&fi.files.length) _doUpload(fi.files); });

  dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', function(e){ e.preventDefault(); dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', function(e){
    e.preventDefault(); dz.classList.remove('drag-over');
    if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length) _doUpload(e.dataTransfer.files);
  });
}

/* ── event delegation ─────────────────────────────────── */
function _bind(){
  state.container.addEventListener('click', function(e){
    var t=e.target.closest('[data-action]');
    if(!t) return;
    var action=t.getAttribute('data-action');
    switch(action){
      case 'tab':
        state.activeTab=t.getAttribute('data-tab');
        if(state.activeTab==='browse') _loadEvidence();
        _paint();
        break;
      case 'view-detail':
        var id=t.getAttribute('data-id');
        state.selectedId=id;
        _loadDetail(id);
        break;
      case 'back-browse':
        state.selectedItem=null;
        state.selectedId=null;
        state.activeTab='browse';
        _paint();
        break;
      case 'submit-upload':
        var fi=state.container.querySelector('#ev-file-input');
        if(fi&&fi.files&&fi.files.length){
          _doUpload(fi.files);
        } else {
          _toast(_t('Chưa chọn file','No file selected'),'error');
        }
        break;
      case 'do-search':
        var inp=state.container.querySelector('#ev-search-input');
        state.searchQuery=inp?inp.value:'';
        _doSearch();
        break;
      case 'verify-chain':
        _verifyChain();
        break;
      case 'link-entity':
        var eId=t.getAttribute('data-id');
        var entityVal=(state.container.querySelector('#ev-link-entity')||{}).value||'';
        if(!entityVal){ _toast(_t('Nhập entity','Enter entity'),'error'); break; }
        _api('evidence_link',{id:eId,entity:entityVal}).then(function(r){
          if(r&&r.ok){_toast(_t('Đã liên kết','Linked'),'success');_loadDetail(eId);}
          else {_toast(_t('Lỗi','Error'),'error');}
        }).catch(function(){_toast(_t('Lỗi kết nối','Connection error'),'error');});
        break;
      case 'page-prev':
        state.pagination.offset=Math.max(0,state.pagination.offset-state.pagination.limit);
        _loadEvidence();
        break;
      case 'page-next':
        state.pagination.offset+=state.pagination.limit;
        _loadEvidence();
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; state.pagination.offset=0; _loadEvidence(); }
  });

  state.container.addEventListener('keydown', function(e){
    if(e.key==='Enter'){
      var inp=state.container.querySelector('#ev-search-input');
      if(e.target===inp){
        state.searchQuery=inp.value;
        _doSearch();
      }
    }
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='browse';
  state.selectedId=null;
  state.selectedItem=null;
  state.chainValid=null;
  state.verifying=false;
  state.pagination.offset=0;
  _paint();
  _bind();
  _loadEvidence();
}

window._renderEvidenceVault = render;

})();
