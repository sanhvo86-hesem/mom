/* ===================================================================
   21-product-passport.js
   HESEM QMS Portal - Digital Product Passport (DPP)
   Full traceability per serialized part: material to shipment,
   lifecycle events, genealogy, and QR code tracking.
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

/* ── constants ────────────────────────────────────────── */
var STYLE_ID = 'pp-styles';
var TABS = [
  { key:'browse',  vi:'Duyet',          en:'Browse' },
  { key:'detail',  vi:'Chi tiet',       en:'Passport Detail' },
  { key:'create',  vi:'Tao moi',        en:'Create Passport' },
  { key:'event',   vi:'Them su kien',   en:'Add Event' },
  { key:'trace',   vi:'Truy xuat',      en:'Trace' }
];

var STATUS = {
  draft:       { vi:'Nhap',        en:'Draft',       color:'#94a3b8' },
  active:      { vi:'Hoat dong',   en:'Active',      color:'#3b82f6' },
  shipped:     { vi:'Da giao',     en:'Shipped',     color:'#10b981' },
  in_service:  { vi:'Dang su dung', en:'In Service', color:'#8b5cf6' },
  end_of_life: { vi:'Het han',     en:'End of Life', color:'#6b7280' },
  recalled:    { vi:'Thu hoi',     en:'Recalled',    color:'#ef4444' }
};

var EVENT_TYPES = {
  material_received: { vi:'Nhan vat lieu',  en:'Material Received', icon:'\ud83d\udce6' },
  machining:         { vi:'Gia cong',       en:'Machining',         icon:'\u2699\ufe0f' },
  treatment:         { vi:'Xu ly',          en:'Treatment',         icon:'\ud83d\udd25' },
  inspection:        { vi:'Kiem tra',       en:'Inspection',        icon:'\ud83d\udd0d' },
  certified:         { vi:'Chung nhan',     en:'Certified',         icon:'\u2705' },
  shipped:           { vi:'Giao hang',      en:'Shipped',           icon:'\ud83d\ude9a' },
  rework:            { vi:'Sua chua',       en:'Rework',            icon:'\ud83d\udee0\ufe0f' },
  testing:           { vi:'Thu nghiem',     en:'Testing',           icon:'\ud83e\uddea' }
};

var DOC_TYPES = {
  coc:        { vi:'CoC',           en:'CoC' },
  coa:        { vi:'CoA',           en:'CoA' },
  fai:        { vi:'FAI',           en:'FAI' },
  material:   { vi:'Chung chi VL',  en:'Material Cert' },
  test:       { vi:'Bao cao TN',    en:'Test Report' }
};

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'browse',
  passports: [],
  selectedPassport: null,
  events: [],
  traceResult: null,
  filters: { status:'all', part:'', serial:'' },
  pagination: { offset:0, limit:50, total:0 },
  loading: false
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.pp{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.pp-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.pp-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.pp-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.pp-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.pp-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.pp-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.pp-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.pp-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.pp-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.pp-filters select,.pp-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}',
    '.pp-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;cursor:pointer;transition:box-shadow .15s}',
    '.pp-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}',
    '.pp-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.pp-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.pp-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.pp-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.pp-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff;white-space:nowrap}',
    '.pp-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.pp-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.pp-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.pp-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.pp-btn-secondary:hover{background:#e2e8f0}',
    '.pp-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.pp-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.pp-form input,.pp-form select,.pp-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.pp-form textarea{min-height:60px;resize:vertical}',
    '.pp-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    '.pp-paging{display:flex;justify-content:center;gap:8px;margin-top:16px;align-items:center;font-size:.8125rem}',
    '.pp-paging button{padding:6px 12px;border:1px solid var(--border,#d1d5db);border-radius:6px;background:var(--surface,#fff);cursor:pointer;font-size:.8125rem}',
    '.pp-paging button:disabled{opacity:.4;cursor:default}',
    '.pp-timeline{position:relative;padding-left:36px;margin-top:16px}',
    '.pp-timeline::before{content:"";position:absolute;left:14px;top:0;bottom:0;width:2px;background:var(--border,#e2e8f0)}',
    '.pp-timeline-item{position:relative;margin-bottom:16px;padding:12px 16px;background:var(--surface,#f8fafc);border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.8125rem}',
    '.pp-timeline-icon{position:absolute;left:-36px;top:12px;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid var(--border,#e2e8f0);display:flex;align-items:center;justify-content:center;font-size:.75rem}',
    '.pp-detail{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:20px;margin-bottom:16px}',
    '.pp-qr{width:120px;height:120px;border:1px solid var(--border,#e2e8f0);border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fff;font-size:.6875rem;color:var(--text-secondary,#94a3b8);text-align:center}',
    '.pp-doc-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
    '.pp-doc-chip{padding:4px 10px;border-radius:6px;font-size:.6875rem;font-weight:600;background:var(--surface,#f1f5f9);border:1px solid var(--border,#d1d5db);cursor:pointer}',
    '.pp-tree{padding-left:20px;font-size:.8125rem}',
    '.pp-tree-node{padding:6px 0;border-left:2px solid var(--border,#e2e8f0);padding-left:14px;margin-left:6px}',
    '.pp-tree-node-label{font-weight:600}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── badge / KPI helpers ─────────────────────────────── */
function _statusBadge(status){
  var m=STATUS[status]||{vi:status,en:status,color:'#64748b'};
  return '<span class="pp-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _kpiCard(label, value, color){
  return '<div class="pp-kpi"><div class="pp-kpi-label">'+_esc(label)+'</div><div class="pp-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div></div>';
}

/* ── event type icon mapping ──────────────────────────── */
function _eventIcon(type){
  var m=EVENT_TYPES[type];
  return m?m.icon:'\u2022';
}
function _eventLabel(type){
  var m=EVENT_TYPES[type]||{vi:type,en:type};
  return _t(m.vi,m.en);
}

/* ── status change helper ────────────────────────────── */
function _nextStatuses(current){
  var map={
    draft:['active'],
    active:['shipped','recalled'],
    shipped:['in_service','recalled'],
    in_service:['end_of_life','recalled'],
    end_of_life:[],
    recalled:[]
  };
  return map[current]||[];
}

/* ── tab: browse ─────────────────────────────────────── */
function _renderBrowseTab(){
  /* summary KPIs */
  var counts={};
  state.passports.forEach(function(p){ counts[p.status]=(counts[p.status]||0)+1; });
  var html='<div class="pp-kpis">'
    +_kpiCard(_t('Tong passport','Total Passports'), state.pagination.total||state.passports.length, 'inherit')
    +_kpiCard(_t('Hoat dong','Active'), counts.active||0, '#3b82f6')
    +_kpiCard(_t('Da giao','Shipped'), counts.shipped||0, '#10b981')
    +_kpiCard(_t('Thu hoi','Recalled'), counts.recalled||0, '#ef4444')
  +'</div>';

  html+='<div class="pp-filters">';
  html+='<input type="text" data-filter="serial" placeholder="'+_t('Tim serial / passport','Search serial / passport')+'" value="'+_esc(state.filters.serial)+'" style="width:220px">';
  html+='<input type="text" data-filter="part" placeholder="'+_t('Part','Part')+'" value="'+_esc(state.filters.part)+'" style="width:140px">';
  html+='<select data-filter="status"><option value="all">'+_t('Tat ca','All Status')+'</option>';
  Object.keys(STATUS).forEach(function(k){var m=STATUS[k]; html+='<option value="'+k+'"'+(state.filters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>';

  if(!state.passports.length) return html+'<div class="pp-empty">'+_t('Chua co passport','No passports')+'</div>';

  html+='<div class="pp-grid">';
  state.passports.forEach(function(p){
    html+='<div class="pp-card" data-action="select-passport" data-id="'+_esc(p.id)+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
        +'<strong style="font-size:.875rem">'+_esc(p.passport_number)+'</strong>'
        +_statusBadge(p.status)
      +'</div>'
      +'<div style="font-size:.8125rem;margin-bottom:4px">'+_t('Part','Part')+': '+_esc(p.part_number||'-')+'</div>'
      +'<div style="font-size:.8125rem;margin-bottom:4px">'+_t('Serial','Serial')+': '+_esc(p.serial_number||'-')+'</div>'
      +'<div style="font-size:.75rem;color:var(--text-secondary,#64748b);display:flex;justify-content:space-between">'
        +'<span>'+_fmtDate(p.created_at)+'</span>'
        +'<span>'+_esc(p.event_count||0)+' '+_t('su kien','events')+'</span>'
      +'</div>'
    +'</div>';
  });
  html+='</div>';
  html+=_renderPaging();
  return html;
}

/* ── tab: passport detail ────────────────────────────── */
function _renderDetailTab(){
  var pp=state.selectedPassport;
  if(!pp) return '<div class="pp-empty">'+_t('Chon passport tu danh sach','Select a passport from the list')+'</div>';

  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_esc(pp.passport_number)+'</h3>'
    +'<div style="display:flex;gap:8px">'
      +_statusBadge(pp.status)
      +'<button class="pp-btn pp-btn-secondary" data-action="back-to-browse">'+_t('Quay lai','Back')+'</button>'
    +'</div>'
  +'</div>';

  /* header info + QR */
  html+='<div class="pp-detail" style="display:grid;grid-template-columns:1fr auto;gap:20px">';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.8125rem">';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Part','Part')+':</span> '+_esc(pp.part_number||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Serial','Serial')+':</span> '+_esc(pp.serial_number||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Lot','Lot')+':</span> '+_esc(pp.lot_number||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Khach hang','Customer')+':</span> '+_esc(pp.customer_name||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">SO:</span> '+_esc(pp.so_number||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Ngay tao','Created')+':</span> '+_fmtDate(pp.created_at)+'</div>';
  html+='</div>';
  html+='<div class="pp-qr">'+(pp.qr_url?'<img src="'+_esc(pp.qr_url)+'" style="width:100%;height:100%;object-fit:contain">':'QR Code<br>'+_esc(pp.passport_number))+'</div>';
  html+='</div>';

  /* event timeline */
  var events=pp.events||state.events||[];
  html+='<div class="pp-detail"><h4 style="margin:0 0 8px">'+_t('Dong thoi gian','Timeline')+'</h4>';
  if(events.length){
    html+='<div class="pp-timeline">';
    events.forEach(function(ev){
      var evType=EVENT_TYPES[ev.type]||{vi:ev.type,en:ev.type,icon:'\u2022'};
      html+='<div class="pp-timeline-item">'
        +'<div class="pp-timeline-icon">'+evType.icon+'</div>'
        +'<div style="display:flex;justify-content:space-between;align-items:center">'
          +'<strong>'+_esc(_t(evType.vi,evType.en))+'</strong>'
          +'<span style="font-size:.75rem;color:var(--text-secondary,#64748b)">'+_fmtDateTime(ev.date)+'</span>'
        +'</div>'
        +'<div style="font-size:.75rem;color:var(--text-secondary,#64748b);margin-top:4px">';
      if(ev.operator) html+=_t('Nhan vien','Operator')+': '+_esc(ev.operator)+' ';
      if(ev.machine) html+='| '+_t('May','Machine')+': '+_esc(ev.machine)+' ';
      html+='</div>';
      if(ev.measurement_data) html+='<div style="font-size:.75rem;margin-top:4px;font-family:monospace;background:#f8fafc;padding:4px 8px;border-radius:4px">'+_esc(ev.measurement_data)+'</div>';
      if(ev.photos&&ev.photos.length){
        html+='<div style="display:flex;gap:6px;margin-top:6px">';
        ev.photos.forEach(function(ph){ html+='<div style="width:60px;height:60px;border-radius:6px;background:#e2e8f0;overflow:hidden">'+(ph.url?'<img src="'+_esc(ph.url)+'" style="width:100%;height:100%;object-fit:cover">':'\ud83d\udcf7')+'</div>'; });
        html+='</div>';
      }
      html+='</div>';
    });
    html+='</div>';
  } else { html+='<div class="pp-empty">'+_t('Chua co su kien','No events')+'</div>'; }
  html+='</div>';

  /* status transitions */
  var nextStates=_nextStatuses(pp.status);
  if(nextStates.length){
    html+='<div class="pp-detail"><h4 style="margin:0 0 8px">'+_t('Chuyen trang thai','Status Transition')+'</h4>';
    html+='<div style="display:flex;gap:6px">';
    nextStates.forEach(function(ns){
      var m=STATUS[ns]||{vi:ns,en:ns,color:'#64748b'};
      html+='<button class="pp-btn" style="padding:6px 14px;background:'+m.color+';color:#fff" data-action="transition-passport" data-status="'+ns+'">'+_esc(_t(m.vi,m.en))+'</button>';
    });
    html+='</div></div>';
  }

  /* linked documents */
  var docs=pp.documents||[];
  html+='<div class="pp-detail"><h4 style="margin:0 0 8px">'+_t('Tai lieu lien ket','Linked Documents')+'</h4>';
  if(docs.length){
    html+='<div class="pp-doc-chips">';
    docs.forEach(function(doc){
      var label=(DOC_TYPES[doc.type]||{vi:doc.type,en:doc.type});
      html+='<div class="pp-doc-chip" data-action="view-doc" data-id="'+_esc(doc.id)+'">'+_esc(_t(label.vi,label.en))+': '+_esc(doc.title||doc.filename)+'</div>';
    });
    html+='</div>';
  } else { html+='<div style="font-size:.8125rem;color:#94a3b8">'+_t('Chua co tai lieu','No documents')+'</div>'; }
  html+='</div>';

  return html;
}

/* ── tab: create passport ────────────────────────────── */
function _renderCreateTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Tao Passport moi','Create New Passport')+'</h3>';
  html+='<div class="pp-detail">';
  html+='<div class="pp-form">';
  html+='<div><label>'+_t('Part','Part Number')+'</label><input type="text" id="pp-f-part"></div>';
  html+='<div><label>'+_t('Serial','Serial Number')+'</label><input type="text" id="pp-f-serial"></div>';
  html+='<div><label>'+_t('Lot','Lot Number')+'</label><input type="text" id="pp-f-lot"></div>';
  html+='<div><label>'+_t('Khach hang','Customer')+'</label><input type="text" id="pp-f-customer"></div>';
  html+='<div><label>'+_t('Tham chieu SO','SO Reference')+'</label><input type="text" id="pp-f-so"></div>';
  html+='<div><label>'+_t('Tham chieu JO','Job Reference')+'</label><input type="text" id="pp-f-job"></div>';
  html+='<div style="grid-column:1/-1"><label>'+_t('Ghi chu','Notes')+'</label><textarea id="pp-f-notes"></textarea></div>';
  html+='</div>';
  html+='<div style="margin-top:14px"><button class="pp-btn pp-btn-primary" data-action="submit-passport">'+_t('Tao Passport','Create Passport')+'</button></div>';
  html+='</div>';
  return html;
}

/* ── tab: add event ──────────────────────────────────── */
function _renderEventTab(){
  var pp=state.selectedPassport;
  if(!pp) return '<div class="pp-empty">'+_t('Chon passport truoc','Select a passport first')+'</div>';

  var html='<h3 style="margin:0 0 16px">'+_t('Them su kien','Add Event')+' - '+_esc(pp.passport_number)+'</h3>';
  html+='<div class="pp-detail">';
  html+='<div class="pp-form">';
  html+='<div><label>'+_t('Loai su kien','Event Type')+'</label><select id="pp-f-event-type">';
  Object.keys(EVENT_TYPES).forEach(function(k){var m=EVENT_TYPES[k]; html+='<option value="'+k+'">'+_esc(m.icon)+' '+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>';
  html+='<div><label>'+_t('Ngay','Date')+'</label><input type="datetime-local" id="pp-f-event-date"></div>';
  html+='<div><label>'+_t('Nhan vien','Operator')+'</label><input type="text" id="pp-f-event-operator"></div>';
  html+='<div><label>'+_t('May','Machine')+'</label><input type="text" id="pp-f-event-machine"></div>';
  html+='<div style="grid-column:1/-1"><label>'+_t('Du lieu do luong','Measurement Data')+'</label><textarea id="pp-f-event-measurement" placeholder="'+_t('JSON hoac text','JSON or text')+'"></textarea></div>';
  html+='<div style="grid-column:1/-1"><label>'+_t('Ghi chu','Notes')+'</label><textarea id="pp-f-event-notes"></textarea></div>';
  html+='</div>';
  html+='<div style="margin-top:14px"><button class="pp-btn pp-btn-primary" data-action="submit-event">'+_t('Them su kien','Add Event')+'</button></div>';
  html+='</div>';
  return html;
}

/* ── tab: trace ──────────────────────────────────────── */
function _renderTraceTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Truy xuat nguon goc','Genealogy Trace')+'</h3>';

  html+='<div class="pp-detail">';
  html+='<div class="pp-filters" style="margin-bottom:0">';
  html+='<input type="text" id="pp-trace-input" placeholder="'+_t('Nhap serial hoac lot','Enter serial or lot number')+'" style="width:280px">';
  html+='<select id="pp-trace-direction"><option value="both">'+_t('Ca hai','Both')+'</option><option value="forward">'+_t('Tien','Forward')+'</option><option value="backward">'+_t('Lui','Backward')+'</option></select>';
  html+='<button class="pp-btn pp-btn-primary" data-action="run-trace">'+_t('Truy xuat','Trace')+'</button>';
  html+='</div></div>';

  var result=state.traceResult;
  if(result){
    /* backward: where did material come from */
    if(result.backward&&result.backward.length){
      html+='<div class="pp-detail"><h4 style="margin:0 0 12px">'+_t('Nguon goc (Lui)','Origin (Backward)')+'</h4>';
      html+='<div class="pp-tree">';
      result.backward.forEach(function(node){ html+=_renderTreeNode(node, 0); });
      html+='</div></div>';
    }

    /* subject */
    if(result.subject){
      html+='<div class="pp-detail" style="border-left:3px solid var(--brand,#1565c0)">'
        +'<strong>'+_esc(result.subject.passport_number||result.subject.serial_number)+'</strong> - '+_esc(result.subject.part_number||'-')
        +' '+_statusBadge(result.subject.status)
      +'</div>';
    }

    /* forward: where did part go */
    if(result.forward&&result.forward.length){
      html+='<div class="pp-detail"><h4 style="margin:0 0 12px">'+_t('Dich den (Tien)','Destination (Forward)')+'</h4>';
      html+='<div class="pp-tree">';
      result.forward.forEach(function(node){ html+=_renderTreeNode(node, 0); });
      html+='</div></div>';
    }
  }
  return html;
}

function _renderTreeNode(node, depth){
  if(depth>10) return '';
  var indent=depth*20;
  var html='<div class="pp-tree-node" style="margin-left:'+indent+'px">';
  html+='<span class="pp-tree-node-label">'+_esc(node.label||node.serial_number||node.lot_number||'-')+'</span>';
  if(node.part_number) html+=' <span style="font-size:.75rem;color:var(--text-secondary,#64748b)">('+_esc(node.part_number)+')</span>';
  if(node.type) html+=' <span style="font-size:.6875rem;color:var(--text-secondary,#94a3b8)">['+_esc(node.type)+']</span>';
  if(node.date) html+=' <span style="font-size:.6875rem;color:var(--text-secondary,#94a3b8)">'+_fmtDate(node.date)+'</span>';
  var children=node.children||[];
  children.forEach(function(child){ html+=_renderTreeNode(child, depth+1); });
  html+='</div>';
  return html;
}

/* ── paging ───────────────────────────────────────────── */
function _renderPaging(){
  var p=state.pagination;
  var page=Math.floor(p.offset/p.limit)+1;
  var pages=Math.max(1,Math.ceil(p.total/p.limit));
  return '<div class="pp-paging">'
    +'<button data-action="page-prev"'+(page<=1?' disabled':'')+'>'+_t('Truoc','Prev')+'</button>'
    +'<span>'+page+' / '+pages+' ('+p.total+')</span>'
    +'<button data-action="page-next"'+(page>=pages?' disabled':'')+'>'+_t('Sau','Next')+'</button>'
  +'</div>';
}

/* ── data loading ─────────────────────────────────────── */
function _loadData(){
  state.loading=true; _paint();
  var p=Object.assign({}, state.filters, { offset:state.pagination.offset, limit:state.pagination.limit });
  _api('product_passport_data', p).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.passports=r.passports||[];
      state.pagination.total=r.total||0;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadPassportDetail(id){
  _api('product_passport_detail',{id:id}).then(function(r){
    if(r&&r.ok){
      state.selectedPassport=r.passport||null;
      state.events=r.events||[];
      if(state.selectedPassport) state.selectedPassport.events=state.events;
      state.activeTab='detail';
      _paint();
    } else { _toast(_t('Khong tim thay','Not found'),'error'); }
  });
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="pp">';
  html+='<div class="pp-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="pp-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="pp-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'browse': html+=_renderBrowseTab(); break;
      case 'detail': html+=_renderDetailTab(); break;
      case 'create': html+=_renderCreateTab(); break;
      case 'event':  html+=_renderEventTab(); break;
      case 'trace':  html+=_renderTraceTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;
}

/* ── event delegation ─────────────────────────────────── */
function _bind(){
  state.container.addEventListener('click', function(e){
    var t=e.target.closest('[data-action]');
    if(!t) return;
    var action=t.getAttribute('data-action');
    var id=t.getAttribute('data-id');
    switch(action){
      case 'tab':
        state.activeTab=t.getAttribute('data-tab');
        state.pagination.offset=0;
        _paint();
        break;
      case 'select-passport':
        _loadPassportDetail(id);
        break;
      case 'back-to-browse':
        state.selectedPassport=null;
        state.activeTab='browse';
        _paint();
        break;
      case 'submit-passport':
        _api('product_passport_create',{
          part_number:(state.container.querySelector('#pp-f-part')||{}).value||'',
          serial_number:(state.container.querySelector('#pp-f-serial')||{}).value||'',
          lot_number:(state.container.querySelector('#pp-f-lot')||{}).value||'',
          customer:(state.container.querySelector('#pp-f-customer')||{}).value||'',
          so_reference:(state.container.querySelector('#pp-f-so')||{}).value||'',
          job_reference:(state.container.querySelector('#pp-f-job')||{}).value||'',
          notes:(state.container.querySelector('#pp-f-notes')||{}).value||''
        }).then(function(r){
          if(r&&r.ok){_toast(_t('Da tao passport','Passport created'),'success');_loadData();state.activeTab='browse';_paint();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'submit-event':
        if(!state.selectedPassport) return;
        _api('product_passport_add_event',{
          passport_id:state.selectedPassport.id,
          type:(state.container.querySelector('#pp-f-event-type')||{}).value||'',
          date:(state.container.querySelector('#pp-f-event-date')||{}).value||'',
          operator:(state.container.querySelector('#pp-f-event-operator')||{}).value||'',
          machine:(state.container.querySelector('#pp-f-event-machine')||{}).value||'',
          measurement_data:(state.container.querySelector('#pp-f-event-measurement')||{}).value||'',
          notes:(state.container.querySelector('#pp-f-event-notes')||{}).value||''
        }).then(function(r){
          if(r&&r.ok){_toast(_t('Da them su kien','Event added'),'success');_loadPassportDetail(state.selectedPassport.id);}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'run-trace':
        var input=(state.container.querySelector('#pp-trace-input')||{}).value||'';
        var direction=(state.container.querySelector('#pp-trace-direction')||{}).value||'both';
        if(!input){ _toast(_t('Nhap serial hoac lot','Enter serial or lot'),'warning'); return; }
        _api('product_passport_trace',{query:input,direction:direction}).then(function(r){
          if(r&&r.ok){ state.traceResult=r.trace; _paint(); }
          else { _toast(_t('Khong tim thay','Not found'),'warning'); }
        });
        break;
      case 'transition-passport':
        if(!state.selectedPassport) return;
        var newStatus=t.getAttribute('data-status');
        _api('product_passport_transition',{id:state.selectedPassport.id,status:newStatus}).then(function(r){
          if(r&&r.ok){_toast(_t('Da chuyen trang thai','Status updated'),'success');_loadPassportDetail(state.selectedPassport.id);}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'view-doc':
        _toast(_t('Mo tai lieu...','Opening document...'),'info');
        break;
      case 'page-prev':
        state.pagination.offset=Math.max(0,state.pagination.offset-state.pagination.limit);
        _loadData();
        break;
      case 'page-next':
        state.pagination.offset+=state.pagination.limit;
        _loadData();
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; state.pagination.offset=0; _loadData(); }
  });

  state.container.addEventListener('input', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='serial'||f==='part') state.filters[f]=e.target.value;
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='browse';
  state.selectedPassport=null;
  state.traceResult=null;
  state.pagination.offset=0;
  _paint();
  _bind();
  _loadData();
}

window._renderProductPassport = render;

})();
