/* ===================================================================
   16-supplier-quality.js
   HESEM QMS Portal - Supplier Quality Management
   Scorecards, incoming inspection, ASL, SCAR lifecycle, audits.
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

/* ── constants ────────────────────────────────────────── */
var STYLE_ID = 'sq-styles';
var TABS = [
  { key:'dashboard',  vi:'Tổng quan',    en:'Dashboard' },
  { key:'scorecards', vi:'Scorecard',     en:'Scorecards' },
  { key:'incoming',   vi:'Kiểm hàng nhận', en:'Incoming' },
  { key:'asl',        vi:'ASL',           en:'ASL' },
  { key:'scar',       vi:'SCAR',          en:'SCAR' },
  { key:'audits',     vi:'Đánh giá',      en:'Audits' }
];

var RATING = {
  preferred:  { vi:'Ưu tiên',    en:'Preferred',  color:'#22c55e' },
  approved:   { vi:'Đã duyệt',   en:'Approved',   color:'#3b82f6' },
  conditional:{ vi:'Có điều kiện', en:'Conditional', color:'#f59e0b' },
  probation:  { vi:'Thử thách',   en:'Probation',  color:'#ef4444' },
  suspended:  { vi:'Đình chỉ',    en:'Suspended',  color:'#94a3b8' }
};

/* SCAR_STATUS — đọc từ HmRegistry → 'scar_status' */
var SCAR_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('scar_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {issued:{vi:'Đã phát hành',en:'Issued',color:'#ef4444'},acknowledged:{vi:'Đã nhận',en:'Acknowledged',color:'#f59e0b'},root_cause:{vi:'Phân tích NC',en:'Root Cause',color:'#8b5cf6'},corrective:{vi:'Hành động KP',en:'Corrective',color:'#3b82f6'},verify:{vi:'Xác minh',en:'Verify',color:'#06b6d4'},closed:{vi:'Đóng',en:'Closed',color:'#22c55e'}}; }
  return map;
})();

/* AUDIT_STATUS — đọc từ HmRegistry → 'supplier_audit_status' */
var AUDIT_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('supplier_audit_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {planned:{vi:'Đã lên lịch',en:'Planned',color:'#94a3b8'},in_progress:{vi:'Đang thực hiện',en:'In Progress',color:'#f59e0b'},completed:{vi:'Hoàn thành',en:'Completed',color:'#22c55e'},cancelled:{vi:'Đã hủy',en:'Cancelled',color:'#6b7280'}}; }
  return map;
})();

/* INSPECTION_STATUS — đọc từ HmRegistry → 'incoming_inspection_status' */
var INSPECTION_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('incoming_inspection_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {pending:{vi:'Chờ kiểm',en:'Pending',color:'#94a3b8'},pass:{vi:'Đạt',en:'Pass',color:'#22c55e'},fail:{vi:'Không đạt',en:'Fail',color:'#ef4444'},conditional:{vi:'Có điều kiện',en:'Conditional',color:'#f59e0b'}}; }
  return map;
})();

var RADAR_AXES = [
  { key:'quality',   vi:'Chất lượng', en:'Quality' },
  { key:'delivery',  vi:'Giao hàng',  en:'Delivery' },
  { key:'cost',      vi:'Chi phí',    en:'Cost' },
  { key:'response',  vi:'Phản hồi',   en:'Response' },
  { key:'compliance',vi:'Tuân thủ',   en:'Compliance' }
];

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'dashboard',
  scorecards: [],
  incoming: [],
  asl: [],
  scar: [],
  audits: [],
  selectedVendor: null,
  kpi: {},
  filters: { vendor:'', period:'', rating:'all', status:'all' },
  pagination: { offset:0, limit:50, total:0 },
  loading: false
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.sq{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.sq-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.sq-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.sq-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.sq-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.sq-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.sq-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.sq-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.sq-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.sq-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.sq-filters select,.sq-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.sq-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.sq-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.sq-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.sq-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.sq-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff;white-space:nowrap}',
    '.sq-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.sq-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.sq-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.sq-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.sq-btn-secondary:hover{background:#e2e8f0}',
    '.sq-btn-danger{background:#ef4444;color:#fff}',
    '.sq-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:18px;margin-bottom:12px}',
    '.sq-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.sq-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.sq-form input,.sq-form select,.sq-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.sq-form textarea{min-height:80px;resize:vertical}',
    '.sq-radar{position:relative;width:280px;height:280px;margin:0 auto}',
    '.sq-detail{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:20px;margin-bottom:16px}',
    '.sq-paging{display:flex;justify-content:center;gap:8px;margin-top:16px;align-items:center;font-size:.8125rem}',
    '.sq-paging button{padding:6px 12px;border:1px solid var(--border,#d1d5db);border-radius:6px;background:var(--surface,#fff);cursor:pointer;font-size:.8125rem}',
    '.sq-paging button:disabled{opacity:.4;cursor:default}',
    '.sq-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    '.sq-score-bar{height:8px;border-radius:4px;background:#e2e8f0;overflow:hidden;min-width:80px}',
    '.sq-score-fill{height:100%;border-radius:4px;transition:width .3s}',
    '.sq-timeline{position:relative;padding-left:28px}',
    '.sq-timeline::before{content:"";position:absolute;left:10px;top:0;bottom:0;width:2px;background:var(--border,#e2e8f0)}',
    '.sq-timeline-item{position:relative;margin-bottom:16px;padding:10px 14px;background:var(--surface,#f8fafc);border-radius:8px;border:1px solid var(--border,#e2e8f0)}',
    '.sq-timeline-item::before{content:"";position:absolute;left:-22px;top:14px;width:10px;height:10px;border-radius:50%;background:var(--brand,#1565c0);border:2px solid #fff}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── badge helpers ────────────────────────────────────── */
function _ratingBadge(rating){
  var m=RATING[rating]||{vi:rating,en:rating,color:'#64748b'};
  return '<span class="sq-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _scarBadge(status){
  var m=SCAR_STATUS[status]||{vi:status,en:status,color:'#64748b'};
  return '<span class="sq-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _auditBadge(status){
  var m=AUDIT_STATUS[status]||{vi:status,en:status,color:'#64748b'};
  return '<span class="sq-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _inspBadge(status){
  var m=INSPECTION_STATUS[status]||{vi:status,en:status,color:'#64748b'};
  return '<span class="sq-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _scoreFill(score){
  var pct=Math.min(100,Math.max(0,score));
  var color=pct>=80?'#22c55e':pct>=60?'#f59e0b':'#ef4444';
  return '<div class="sq-score-bar"><div class="sq-score-fill" style="width:'+pct+'%;background:'+color+'"></div></div>';
}

/* ── KPI card ─────────────────────────────────────────── */
function _kpiCard(label, value, color){
  return '<div class="sq-kpi"><div class="sq-kpi-label">'+_esc(label)+'</div><div class="sq-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div></div>';
}

/* ── radar chart (CSS/SVG) ────────────────────────────── */
function _renderRadar(scores){
  var n=RADAR_AXES.length;
  var cx=140, cy=140, r=110;
  var angleStep=(2*Math.PI)/n;
  var svgPoly='';
  var labels='';
  var gridLines='';

  [0.25,0.5,0.75,1].forEach(function(f){
    var pts=[];
    for(var i=0;i<n;i++){
      var a=-Math.PI/2+i*angleStep;
      pts.push(Math.round(cx+r*f*Math.cos(a))+','+Math.round(cy+r*f*Math.sin(a)));
    }
    gridLines+='<polygon points="'+pts.join(' ')+'" fill="none" stroke="#e2e8f0" stroke-width="1"/>';
  });

  var dataPts=[];
  for(var i=0;i<n;i++){
    var axis=RADAR_AXES[i];
    var val=Math.min(100,Math.max(0,(scores||{})[axis.key]||0))/100;
    var a=-Math.PI/2+i*angleStep;
    dataPts.push(Math.round(cx+r*val*Math.cos(a))+','+Math.round(cy+r*val*Math.sin(a)));
    var lx=Math.round(cx+(r+18)*Math.cos(a));
    var ly=Math.round(cy+(r+18)*Math.sin(a));
    labels+='<text x="'+lx+'" y="'+ly+'" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#64748b">'+_esc(_t(axis.vi,axis.en))+'</text>';
    labels+='<text x="'+lx+'" y="'+(ly+12)+'" text-anchor="middle" font-size="9" font-weight="700" fill="#0f172a">'+((scores||{})[axis.key]||0)+'</text>';
  }
  svgPoly='<polygon points="'+dataPts.join(' ')+'" fill="rgba(21,101,192,.15)" stroke="var(--brand,#1565c0)" stroke-width="2"/>';

  return '<div class="sq-radar"><svg viewBox="0 0 280 280" width="280" height="280">'+gridLines+svgPoly+labels+'</svg></div>';
}

/* ── tab: dashboard ───────────────────────────────────── */
function _renderDashboardTab(){
  var k=state.kpi;
  var html='<div class="sq-kpis">'
    +_kpiCard(_t('Điểm TB','Avg Score'), (k.avg_score||0)+'%', k.avg_score>=80?'#22c55e':'#f59e0b')
    +_kpiCard(_t('Nhà CC rủi ro','At-Risk Suppliers'), k.at_risk||0, '#ef4444')
    +_kpiCard(_t('SCAR đang mở','Open SCARs'), k.open_scars||0, '#f59e0b')
    +_kpiCard(_t('Tỷ lệ từ chối','Incoming Reject %'), (k.reject_rate||0)+'%', '#ef4444')
  +'</div>';

  /* top / bottom suppliers */
  var top=k.top_suppliers||[];
  var bottom=k.bottom_suppliers||[];

  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
  html+='<div class="sq-card"><h4 style="margin:0 0 10px">'+_t('Top nhà cung cấp','Top Suppliers')+'</h4>';
  if(top.length){
    html+='<table class="sq-table"><thead><tr><th>'+_t('Nhà CC','Vendor')+'</th><th>'+_t('Điểm','Score')+'</th><th>'+_t('Đánh giá','Rating')+'</th></tr></thead><tbody>';
    top.forEach(function(v){ html+='<tr><td>'+_esc(v.name)+'</td><td><div style="display:flex;align-items:center;gap:6px"><span>'+_esc(v.score)+'</span>'+_scoreFill(v.score)+'</div></td><td>'+_ratingBadge(v.rating)+'</td></tr>'; });
    html+='</tbody></table>';
  } else { html+='<div class="sq-empty">-</div>'; }
  html+='</div>';

  html+='<div class="sq-card"><h4 style="margin:0 0 10px">'+_t('Nhà CC cần cải thiện','Needs Improvement')+'</h4>';
  if(bottom.length){
    html+='<table class="sq-table"><thead><tr><th>'+_t('Nhà CC','Vendor')+'</th><th>'+_t('Điểm','Score')+'</th><th>'+_t('Đánh giá','Rating')+'</th></tr></thead><tbody>';
    bottom.forEach(function(v){ html+='<tr><td>'+_esc(v.name)+'</td><td><div style="display:flex;align-items:center;gap:6px"><span>'+_esc(v.score)+'</span>'+_scoreFill(v.score)+'</div></td><td>'+_ratingBadge(v.rating)+'</td></tr>'; });
    html+='</tbody></table>';
  } else { html+='<div class="sq-empty">-</div>'; }
  html+='</div></div>';
  return html;
}

/* ── tab: scorecards ──────────────────────────────────── */
function _renderScorecardsTab(){
  if(state.selectedVendor){
    var v=state.scorecards.find(function(s){return s.id===state.selectedVendor;});
    if(!v) return '<div class="sq-empty">'+_t('Không tìm thấy','Not found')+'</div>';
    var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      +'<h3 style="margin:0">'+_esc(v.name)+' - Scorecard</h3>'
      +'<button class="sq-btn sq-btn-secondary" data-action="deselect-vendor">'+_t('Quay lại','Back')+'</button>'
    +'</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    html+='<div class="sq-card">'+_renderRadar(v.scores||{})+'</div>';
    html+='<div class="sq-card"><h4 style="margin:0 0 12px">'+_t('Chi tiết','Details')+'</h4>';
    html+='<table class="sq-table"><tbody>';
    RADAR_AXES.forEach(function(a){
      var val=(v.scores||{})[a.key]||0;
      html+='<tr><td style="font-weight:600">'+_esc(_t(a.vi,a.en))+'</td><td><div style="display:flex;align-items:center;gap:8px"><span>'+val+'%</span>'+_scoreFill(val)+'</div></td></tr>';
    });
    html+='<tr><td style="font-weight:600">'+_t('Tổng','Overall')+'</td><td><span style="font-size:1.25rem;font-weight:800">'+(v.overall_score||0)+'%</span></td></tr>';
    html+='<tr><td style="font-weight:600">'+_t('Đánh giá','Rating')+'</td><td>'+_ratingBadge(v.rating)+'</td></tr>';
    html+='</tbody></table></div></div>';

    var hist=v.history||[];
    if(hist.length){
      html+='<div class="sq-card"><h4 style="margin:0 0 12px">'+_t('Lịch sử điểm','Score History')+'</h4>';
      html+='<table class="sq-table"><thead><tr><th>'+_t('Kỳ','Period')+'</th><th>'+_t('Điểm','Score')+'</th><th>'+_t('Đánh giá','Rating')+'</th></tr></thead><tbody>';
      hist.forEach(function(h){ html+='<tr><td>'+_esc(h.period)+'</td><td>'+_esc(h.score)+'%</td><td>'+_ratingBadge(h.rating)+'</td></tr>'; });
      html+='</tbody></table></div>';
    }
    return html;
  }

  var html='<div class="sq-filters">';
  html+='<input type="text" data-filter="vendor" placeholder="'+_t('Tìm nhà CC','Search vendor')+'" value="'+_esc(state.filters.vendor)+'" style="width:200px">';
  html+='<select data-filter="rating"><option value="all">'+_t('Tất cả','All Ratings')+'</option>';
  Object.keys(RATING).forEach(function(k){var m=RATING[k]; html+='<option value="'+k+'"'+(state.filters.rating===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>';

  if(!state.scorecards.length) return html+'<div class="sq-empty">'+_t('Chưa có dữ liệu','No data')+'</div>';
  html+='<table class="sq-table"><thead><tr><th>'+_t('Nhà CC','Vendor')+'</th><th>'+_t('Điểm','Score')+'</th><th>'+_t('Đánh giá','Rating')+'</th><th>'+_t('SCAR','SCARs')+'</th><th></th></tr></thead><tbody>';
  state.scorecards.forEach(function(v){
    html+='<tr><td>'+_esc(v.name)+'</td><td><div style="display:flex;align-items:center;gap:6px"><span>'+_esc(v.overall_score||0)+'</span>'+_scoreFill(v.overall_score||0)+'</div></td><td>'+_ratingBadge(v.rating)+'</td><td>'+_esc(v.open_scars||0)+'</td>'
      +'<td><button class="sq-btn sq-btn-secondary" data-action="select-vendor" data-id="'+_esc(v.id)+'">'+_t('Chi tiết','Detail')+'</button></td></tr>';
  });
  html+='</tbody></table>';
  html+=_renderPaging();
  return html;
}

/* ── tab: incoming ────────────────────────────────────── */
function _renderIncomingTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_t('Kiểm tra hàng nhận','Incoming Inspection')+'</h3>'
    +'<button class="sq-btn sq-btn-primary" data-action="create-incoming">+ '+_t('Tạo mới','New')+'</button>'
  +'</div>';
  html+='<div id="sq-incoming-form"></div>';
  if(!state.incoming.length) return html+'<div class="sq-empty">'+_t('Chưa có dữ liệu','No data')+'</div>';
  html+='<table class="sq-table"><thead><tr><th>ID</th><th>'+_t('Nhà CC','Vendor')+'</th><th>'+_t('Vật tư','Material')+'</th><th>'+_t('SL','Qty')+'</th><th>'+_t('Ngày','Date')+'</th><th>'+_t('Kết quả','Result')+'</th><th></th></tr></thead><tbody>';
  state.incoming.forEach(function(item){
    html+='<tr><td>'+_esc(item.id)+'</td><td>'+_esc(item.vendor_name||'-')+'</td><td>'+_esc(item.material||'-')+'</td><td>'+_esc(item.qty||'-')+'</td><td>'+_fmtDate(item.date)+'</td><td>'+_inspBadge(item.status)+'</td>'
      +'<td style="display:flex;gap:4px">'
        +'<button class="sq-btn sq-btn-secondary" style="padding:4px 8px;font-size:.75rem" data-action="insp-pass" data-id="'+_esc(item.id)+'">'+_t('Đạt','Pass')+'</button>'
        +'<button class="sq-btn sq-btn-danger" style="padding:4px 8px;font-size:.75rem" data-action="insp-fail" data-id="'+_esc(item.id)+'">'+_t('Loại','Fail')+'</button>'
      +'</td></tr>';
  });
  html+='</tbody></table>';
  html+=_renderPaging();
  return html;
}

/* ── tab: ASL ─────────────────────────────────────────── */
function _renderAslTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_t('Danh sách nhà CC đã duyệt','Approved Supplier List')+'</h3>'
    +'<button class="sq-btn sq-btn-primary" data-action="create-asl">+ '+_t('Thêm','Add')+'</button>'
  +'</div>';
  html+='<div id="sq-asl-form"></div>';
  if(!state.asl.length) return html+'<div class="sq-empty">'+_t('Chưa có dữ liệu','No data')+'</div>';
  html+='<table class="sq-table"><thead><tr><th>'+_t('Nhà CC','Vendor')+'</th><th>'+_t('Loại','Type')+'</th><th>'+_t('Đánh giá','Rating')+'</th><th>'+_t('Ngày duyệt','Approved Date')+'</th><th>'+_t('Hết hạn','Expiry')+'</th><th></th></tr></thead><tbody>';
  state.asl.forEach(function(item){
    html+='<tr><td>'+_esc(item.vendor_name||'-')+'</td><td>'+_esc(item.type||'-')+'</td><td>'+_ratingBadge(item.rating)+'</td><td>'+_fmtDate(item.approved_date)+'</td><td>'+_fmtDate(item.expiry_date)+'</td>'
      +'<td><button class="sq-btn sq-btn-secondary" style="padding:4px 8px;font-size:.75rem" data-action="edit-asl" data-id="'+_esc(item.id)+'">'+_t('Sửa','Edit')+'</button>'
      +' <button class="sq-btn" style="padding:4px 8px;font-size:.75rem;background:#f59e0b;color:#fff" data-action="suspend-asl" data-id="'+_esc(item.id)+'">'+_t('Đình chỉ','Suspend')+'</button></td></tr>';
  });
  html+='</tbody></table>';
  return html;
}

/* ── tab: SCAR ────────────────────────────────────────── */
function _renderScarTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_t('Quản lý SCAR','SCAR Management')+'</h3>'
    +'<button class="sq-btn sq-btn-primary" data-action="create-scar">+ '+_t('Tạo SCAR','New SCAR')+'</button>'
  +'</div>';
  html+='<div id="sq-scar-form"></div>';
  if(!state.scar.length) return html+'<div class="sq-empty">'+_t('Chưa có SCAR','No SCARs')+'</div>';

  html+='<div class="sq-filters"><select data-filter="status"><option value="all">'+_t('Tất cả','All Status')+'</option>';
  Object.keys(SCAR_STATUS).forEach(function(k){var m=SCAR_STATUS[k]; html+='<option value="'+k+'"'+(state.filters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>';

  state.scar.forEach(function(item){
    var nextStates=_scarNextStates(item.status);
    html+='<div class="sq-card">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">'
        +'<div><strong>'+_esc(item.id)+'</strong> - '+_esc(item.vendor_name||'-')+'</div>'
        +_scarBadge(item.status)
      +'</div>'
      +'<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:6px">'+_esc(item.description||'-')+'</div>'
      +'<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">';
    nextStates.forEach(function(ns){
      var m=SCAR_STATUS[ns]||{vi:ns,en:ns,color:'#64748b'};
      html+='<button class="sq-btn" style="padding:4px 10px;font-size:.75rem;background:'+m.color+';color:#fff" data-action="scar-transition" data-id="'+_esc(item.id)+'" data-status="'+ns+'">'+_esc(_t(m.vi,m.en))+'</button>';
    });
    html+='</div></div>';
  });
  html+=_renderPaging();
  return html;
}

function _scarNextStates(current){
  var map={ issued:['acknowledged'], acknowledged:['root_cause'], root_cause:['corrective'], corrective:['verify'], verify:['closed'], closed:[] };
  return map[current]||[];
}

/* ── tab: audits ──────────────────────────────────────── */
function _renderAuditsTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_t('Lịch đánh giá nhà CC','Supplier Audit Schedule')+'</h3>'
    +'<button class="sq-btn sq-btn-primary" data-action="create-audit">+ '+_t('Tạo mới','New Audit')+'</button>'
  +'</div>';
  html+='<div id="sq-audit-form"></div>';
  if(!state.audits.length) return html+'<div class="sq-empty">'+_t('Chưa có audit','No audits')+'</div>';
  html+='<table class="sq-table"><thead><tr><th>ID</th><th>'+_t('Nhà CC','Vendor')+'</th><th>'+_t('Loại','Type')+'</th><th>'+_t('Ngày','Date')+'</th><th>'+_t('Trạng thái','Status')+'</th><th>'+_t('Điểm','Score')+'</th><th></th></tr></thead><tbody>';
  state.audits.forEach(function(item){
    html+='<tr><td>'+_esc(item.id)+'</td><td>'+_esc(item.vendor_name||'-')+'</td><td>'+_esc(item.audit_type||'-')+'</td><td>'+_fmtDate(item.audit_date)+'</td><td>'+_auditBadge(item.status)+'</td><td>'+_esc(item.score||'-')+'</td>'
      +'<td><button class="sq-btn sq-btn-secondary" style="padding:4px 8px;font-size:.75rem" data-action="edit-audit" data-id="'+_esc(item.id)+'">'+_t('Sửa','Edit')+'</button></td></tr>';
  });
  html+='</tbody></table>';
  return html;
}

/* ── paging ───────────────────────────────────────────── */
function _renderPaging(){
  var p=state.pagination;
  var page=Math.floor(p.offset/p.limit)+1;
  var pages=Math.max(1,Math.ceil(p.total/p.limit));
  return '<div class="sq-paging">'
    +'<button data-action="page-prev"'+(page<=1?' disabled':'')+'>'+_t('Trước','Prev')+'</button>'
    +'<span>'+page+' / '+pages+' ('+p.total+')</span>'
    +'<button data-action="page-next"'+(page>=pages?' disabled':'')+'>'+_t('Sau','Next')+'</button>'
  +'</div>';
}

/* ── inline forms ─────────────────────────────────────── */
function _showIncomingForm(){
  var el=state.container.querySelector('#sq-incoming-form');
  if(!el) return;
  el.innerHTML='<div class="sq-card"><h4 style="margin:0 0 12px">'+_t('Kiểm tra hàng nhận mới','New Incoming Inspection')+'</h4>'
    +'<div class="sq-form">'
      +'<div><label>'+_t('Nhà CC','Vendor')+'</label><input type="text" id="sq-f-vendor"></div>'
      +'<div><label>'+_t('Vật tư','Material')+'</label><input type="text" id="sq-f-material"></div>'
      +'<div><label>'+_t('Số lượng','Qty')+'</label><input type="number" id="sq-f-qty"></div>'
      +'<div><label>'+_t('Ngày','Date')+'</label><input type="date" id="sq-f-date"></div>'
      +'<div style="grid-column:1/-1"><label>'+_t('Ghi chú','Notes')+'</label><textarea id="sq-f-notes"></textarea></div>'
    +'</div>'
    +'<div style="margin-top:12px;display:flex;gap:8px">'
      +'<button class="sq-btn sq-btn-primary" data-action="submit-incoming">'+_t('Lưu','Save')+'</button>'
      +'<button class="sq-btn sq-btn-secondary" data-action="cancel-form">'+_t('Hủy','Cancel')+'</button>'
    +'</div></div>';
}

function _showScarForm(){
  var el=state.container.querySelector('#sq-scar-form');
  if(!el) return;
  el.innerHTML='<div class="sq-card"><h4 style="margin:0 0 12px">'+_t('Tạo SCAR mới','New SCAR')+'</h4>'
    +'<div class="sq-form">'
      +'<div><label>'+_t('Nhà CC','Vendor')+'</label><input type="text" id="sq-f-scar-vendor"></div>'
      +'<div><label>'+_t('Loại NC','NC Type')+'</label><select id="sq-f-scar-type"><option value="quality">'+_t('Chất lượng','Quality')+'</option><option value="delivery">'+_t('Giao hàng','Delivery')+'</option><option value="documentation">'+_t('Hồ sơ','Documentation')+'</option></select></div>'
      +'<div style="grid-column:1/-1"><label>'+_t('Mô tả','Description')+'</label><textarea id="sq-f-scar-desc"></textarea></div>'
    +'</div>'
    +'<div style="margin-top:12px;display:flex;gap:8px">'
      +'<button class="sq-btn sq-btn-primary" data-action="submit-scar">'+_t('Lưu','Save')+'</button>'
      +'<button class="sq-btn sq-btn-secondary" data-action="cancel-form">'+_t('Hủy','Cancel')+'</button>'
    +'</div></div>';
}

function _showAslForm(){
  var el=state.container.querySelector('#sq-asl-form');
  if(!el) return;
  el.innerHTML='<div class="sq-card"><h4 style="margin:0 0 12px">'+_t('Thêm nhà CC vào ASL','Add Vendor to ASL')+'</h4>'
    +'<div class="sq-form">'
      +'<div><label>'+_t('Nhà CC','Vendor')+'</label><input type="text" id="sq-f-asl-vendor"></div>'
      +'<div><label>'+_t('Loại','Type')+'</label><input type="text" id="sq-f-asl-type"></div>'
      +'<div><label>'+_t('Đánh giá','Rating')+'</label><select id="sq-f-asl-rating">';
  Object.keys(RATING).forEach(function(k){var m=RATING[k]; el.innerHTML; }); // build inline
  var opts=''; Object.keys(RATING).forEach(function(k){var m=RATING[k]; opts+='<option value="'+k+'">'+_t(m.vi,m.en)+'</option>';});
  el.innerHTML='<div class="sq-card"><h4 style="margin:0 0 12px">'+_t('Thêm nhà CC vào ASL','Add Vendor to ASL')+'</h4>'
    +'<div class="sq-form">'
      +'<div><label>'+_t('Nhà CC','Vendor')+'</label><input type="text" id="sq-f-asl-vendor"></div>'
      +'<div><label>'+_t('Loại','Type')+'</label><input type="text" id="sq-f-asl-type"></div>'
      +'<div><label>'+_t('Đánh giá','Rating')+'</label><select id="sq-f-asl-rating">'+opts+'</select></div>'
      +'<div><label>'+_t('Ngày hết hạn','Expiry')+'</label><input type="date" id="sq-f-asl-expiry"></div>'
    +'</div>'
    +'<div style="margin-top:12px;display:flex;gap:8px">'
      +'<button class="sq-btn sq-btn-primary" data-action="submit-asl">'+_t('Lưu','Save')+'</button>'
      +'<button class="sq-btn sq-btn-secondary" data-action="cancel-form">'+_t('Hủy','Cancel')+'</button>'
    +'</div></div>';
}

function _showAuditForm(){
  var el=state.container.querySelector('#sq-audit-form');
  if(!el) return;
  el.innerHTML='<div class="sq-card"><h4 style="margin:0 0 12px">'+_t('Tạo audit mới','New Audit')+'</h4>'
    +'<div class="sq-form">'
      +'<div><label>'+_t('Nhà CC','Vendor')+'</label><input type="text" id="sq-f-aud-vendor"></div>'
      +'<div><label>'+_t('Loại','Type')+'</label><select id="sq-f-aud-type"><option value="process">Process</option><option value="system">System</option><option value="product">Product</option></select></div>'
      +'<div><label>'+_t('Ngày','Date')+'</label><input type="date" id="sq-f-aud-date"></div>'
      +'<div><label>'+_t('Người đánh giá','Auditor')+'</label><input type="text" id="sq-f-aud-auditor"></div>'
      +'<div style="grid-column:1/-1"><label>'+_t('Ghi chú','Notes')+'</label><textarea id="sq-f-aud-notes"></textarea></div>'
    +'</div>'
    +'<div style="margin-top:12px;display:flex;gap:8px">'
      +'<button class="sq-btn sq-btn-primary" data-action="submit-audit">'+_t('Lưu','Save')+'</button>'
      +'<button class="sq-btn sq-btn-secondary" data-action="cancel-form">'+_t('Hủy','Cancel')+'</button>'
    +'</div></div>';
}

/* ── data loading ─────────────────────────────────────── */
function _loadData(){
  state.loading=true; _paint();
  var p=Object.assign({}, state.filters, { offset:state.pagination.offset, limit:state.pagination.limit });
  _api('supplier_quality_data', p).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.scorecards=r.scorecards||[];
      state.incoming=r.incoming||[];
      state.asl=r.asl||[];
      state.scar=r.scar||[];
      state.audits=r.audits||[];
      state.kpi=r.kpi||{};
      state.pagination.total=r.total||0;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Lỗi kết nối','Connection error'),'error'); _paint(); });
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="sq">';
  html+='<div class="sq-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="sq-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="sq-empty">'+_t('Đang tải...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'dashboard':  html+=_renderDashboardTab(); break;
      case 'scorecards': html+=_renderScorecardsTab(); break;
      case 'incoming':   html+=_renderIncomingTab(); break;
      case 'asl':        html+=_renderAslTab(); break;
      case 'scar':       html+=_renderScarTab(); break;
      case 'audits':     html+=_renderAuditsTab(); break;
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
    switch(action){
      case 'tab':
        state.activeTab=t.getAttribute('data-tab');
        state.selectedVendor=null;
        _paint();
        break;
      case 'select-vendor':
        state.selectedVendor=t.getAttribute('data-id');
        _paint();
        break;
      case 'deselect-vendor':
        state.selectedVendor=null;
        _paint();
        break;
      case 'create-incoming': _showIncomingForm(); break;
      case 'create-scar': _showScarForm(); break;
      case 'create-asl': _showAslForm(); break;
      case 'create-audit': _showAuditForm(); break;
      case 'cancel-form':
        ['#sq-incoming-form','#sq-scar-form','#sq-asl-form','#sq-audit-form'].forEach(function(sel){
          var el=state.container.querySelector(sel); if(el) el.innerHTML='';
        });
        break;
      case 'submit-incoming':
        _api('supplier_incoming_create',{
          vendor:(state.container.querySelector('#sq-f-vendor')||{}).value||'',
          material:(state.container.querySelector('#sq-f-material')||{}).value||'',
          qty:parseInt((state.container.querySelector('#sq-f-qty')||{}).value)||0,
          date:(state.container.querySelector('#sq-f-date')||{}).value||'',
          notes:(state.container.querySelector('#sq-f-notes')||{}).value||''
        }).then(function(r){ if(r&&r.ok){_toast(_t('Tạo thành công','Created'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');} });
        break;
      case 'submit-scar':
        _api('supplier_scar_create',{
          vendor:(state.container.querySelector('#sq-f-scar-vendor')||{}).value||'',
          nc_type:(state.container.querySelector('#sq-f-scar-type')||{}).value||'',
          description:(state.container.querySelector('#sq-f-scar-desc')||{}).value||''
        }).then(function(r){ if(r&&r.ok){_toast(_t('SCAR tạo thành công','SCAR created'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');} });
        break;
      case 'submit-asl':
        _api('supplier_asl_create',{
          vendor:(state.container.querySelector('#sq-f-asl-vendor')||{}).value||'',
          type:(state.container.querySelector('#sq-f-asl-type')||{}).value||'',
          rating:(state.container.querySelector('#sq-f-asl-rating')||{}).value||'approved',
          expiry_date:(state.container.querySelector('#sq-f-asl-expiry')||{}).value||''
        }).then(function(r){ if(r&&r.ok){_toast(_t('Đã thêm vào ASL','Added to ASL'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');} });
        break;
      case 'submit-audit':
        _api('supplier_audit_create',{
          vendor:(state.container.querySelector('#sq-f-aud-vendor')||{}).value||'',
          audit_type:(state.container.querySelector('#sq-f-aud-type')||{}).value||'',
          audit_date:(state.container.querySelector('#sq-f-aud-date')||{}).value||'',
          auditor:(state.container.querySelector('#sq-f-aud-auditor')||{}).value||'',
          notes:(state.container.querySelector('#sq-f-aud-notes')||{}).value||''
        }).then(function(r){ if(r&&r.ok){_toast(_t('Audit tạo thành công','Audit created'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');} });
        break;
      case 'insp-pass':
        _api('supplier_incoming_disposition',{id:t.getAttribute('data-id'),status:'pass'}).then(function(r){
          if(r&&r.ok){_toast(_t('Đạt','Passed'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');}
        });
        break;
      case 'insp-fail':
        _api('supplier_incoming_disposition',{id:t.getAttribute('data-id'),status:'fail'}).then(function(r){
          if(r&&r.ok){_toast(_t('Đã từ chối','Failed'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');}
        });
        break;
      case 'suspend-asl':
        _api('supplier_asl_suspend',{id:t.getAttribute('data-id')}).then(function(r){
          if(r&&r.ok){_toast(_t('Đã đình chỉ','Suspended'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');}
        });
        break;
      case 'scar-transition':
        _api('supplier_scar_transition',{id:t.getAttribute('data-id'),status:t.getAttribute('data-status')}).then(function(r){
          if(r&&r.ok){_toast(_t('Cập nhật thành công','Updated'),'success');_loadData();} else {_toast(_t('Lỗi','Error'),'error');}
        });
        break;
      case 'edit-asl':
      case 'edit-audit':
        _toast(_t('Chức năng sửa đang phát triển','Edit feature in development'),'info');
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
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='dashboard';
  state.selectedVendor=null;
  state.pagination.offset=0;
  _paint();
  _bind();
  _loadData();
}

window._renderSupplierQuality = render;

})();
