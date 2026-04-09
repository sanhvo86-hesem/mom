/* ===================================================================
   17-quoting-engine.js
   HESEM MOM Portal - Quoting & Estimation Engine
   Quote lifecycle, line-item cost breakdown, margin analysis,
   pipeline dashboard, quote-to-SO conversion.
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
function _fmtCurrency(v){ return '$'+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

/* ── constants ────────────────────────────────────────── */
var STYLE_ID = 'qe-styles';
var TABS = [
  { key:'list',      vi:'Danh sách',     en:'List' },
  { key:'edit',      vi:'Tạo / Sửa',     en:'Create / Edit' },
  { key:'cost',      vi:'Chi phí',        en:'Cost Breakdown' },
  { key:'dashboard', vi:'Phân tích',      en:'Dashboard' }
];

/* QUOTE_STATUS — đọc từ HmRegistry (status-options.json → 'quote_status') */
var QUOTE_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){
    var opts = HmRegistry.statusSet('quote_status');
    opts.forEach(function(o){ map[o.value] = { vi:o.label, en:o.labelEn, color:o.color }; });
  }
  if(!Object.keys(map).length){
    /* fallback nếu HmRegistry chưa load */
    map = {
      draft:{vi:'Nháp',en:'Draft',color:'var(--text-secondary,#94a3b8)'}, sent:{vi:'Đã gửi',en:'Sent',color:'var(--blue-light,#3b82f6)'},
      review:{vi:'Đang xem xét',en:'In Review',color:'var(--purple-light,#8b5cf6)'}, accepted:{vi:'Chấp nhận',en:'Accepted',color:'var(--green-light,#22c55e)'},
      rejected:{vi:'Từ chối',en:'Rejected',color:'var(--red-light,#ef4444)'}, expired:{vi:'Hết hạn',en:'Expired',color:'var(--text-secondary,#6b7280)'},
      converted:{vi:'Đã chuyển SO',en:'Converted',color:'var(--green-light,#10b981)'}
    };
  }
  return map;
})();

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'list',
  quotes: [],
  selectedQuote: null,
  rateCards: [],
  materialTemplates: [],
  kpi: {},
  filters: { status:'all', customer:'', dateFrom:'', dateTo:'' },
  pagination: { offset:0, limit:50, total:0 },
  loading: false,
  editingQuote: null,
  lineItems: []
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.qe{padding:var(--space-5,24px);max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.qe-tabs{display:flex;gap:var(--space-1,4px);border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:var(--space-5,20px);flex-wrap:wrap}',
    '.qe-tab{padding:var(--space-3,10px) 18px;font-size:var(--text-sm,.8125rem);font-weight:var(--font-heading-weight,600);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:var(--radius-md,6px) var(--radius-md,6px) 0 0;white-space:nowrap}',
    '.qe-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.qe-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.qe-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-4,14px);margin-bottom:var(--space-5,20px)}',
    '.qe-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:var(--radius-lg,10px);padding:var(--space-4,16px) 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.qe-kpi-label{font-size:var(--text-xs,.6875rem);text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:var(--font-display-weight,700);margin-bottom:var(--space-1,4px)}',
    '.qe-kpi-value{font-size:var(--text-xl,1.75rem);font-weight:var(--font-display-weight,800);letter-spacing:-.02em}',
    '.qe-filters{display:flex;gap:var(--space-3,10px);flex-wrap:wrap;margin-bottom:var(--space-4,16px);align-items:center}',
    '.qe-filters select,.qe-filters input{height:34px;padding:0 var(--space-3,10px);border:1px solid var(--border,#d1d5db);border-radius:var(--radius-md,6px);font-size:var(--text-sm,.8125rem);background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.qe-table{width:100%;border-collapse:collapse;font-size:var(--text-sm,.8125rem)}',
    '.qe-table th{text-align:left;padding:var(--space-3,10px) var(--space-3,12px);font-weight:var(--font-display-weight,700);border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:var(--text-xs,.6875rem);text-transform:uppercase;letter-spacing:.06em}',
    '.qe-table td{padding:var(--space-3,10px) var(--space-3,12px);border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.qe-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.qe-badge{display:inline-block;padding:2px var(--space-3,10px);border-radius:999px;font-size:var(--text-xs,.6875rem);font-weight:var(--font-display-weight,700);color:var(--text-inverse,#fff);white-space:nowrap}',
    '.qe-btn{display:inline-flex;align-items:center;gap:var(--space-2,6px);padding:var(--space-2,8px) var(--space-4,16px);border:none;border-radius:var(--radius-md,6px);font-size:var(--text-sm,.8125rem);font-weight:var(--font-heading-weight,600);cursor:pointer;transition:background .15s}',
    '.qe-btn-primary{background:var(--brand,#1565c0);color:var(--text-inverse,#fff)}',
    '.qe-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.qe-btn-secondary{background:var(--bg-surface-alt,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.qe-btn-secondary:hover{background:var(--border,#e2e8f0)}',
    '.qe-btn-success{background:var(--green-light,#22c55e);color:var(--text-inverse,#fff)}',
    '.qe-btn-success:hover{background:var(--green-dark,#16a34a)}',
    '.qe-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:var(--radius-lg,10px);padding:18px;margin-bottom:var(--space-3,12px)}',
    '.qe-form{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4,14px)}',
    '.qe-form label{display:block;font-size:var(--text-xs,.75rem);font-weight:var(--font-heading-weight,600);margin-bottom:var(--space-1,4px);color:var(--text-secondary,#64748b)}',
    '.qe-form input,.qe-form select,.qe-form textarea{width:100%;padding:var(--space-2,8px) var(--space-3,10px);border:1px solid var(--border,#d1d5db);border-radius:var(--radius-md,6px);font-size:var(--text-sm,.8125rem)}',
    '.qe-form textarea{min-height:60px;resize:vertical}',
    '.qe-line-table{width:100%;border-collapse:collapse;font-size:var(--text-xs,.75rem);margin-top:var(--space-3,12px)}',
    '.qe-line-table th{padding:var(--space-2,6px) var(--space-2,8px);text-align:left;font-weight:var(--font-display-weight,700);border-bottom:2px solid var(--border,#e2e8f0);font-size:var(--text-xs,.6875rem);text-transform:uppercase;color:var(--text-secondary,#64748b)}',
    '.qe-line-table td{padding:var(--space-2,6px) var(--space-2,8px);border-bottom:1px solid var(--border,#f1f5f9)}',
    '.qe-line-table input,.qe-line-table select{width:100%;padding:var(--space-1,4px) var(--space-2,6px);border:1px solid var(--border,#d1d5db);border-radius:var(--radius-sm,4px);font-size:var(--text-xs,.75rem)}',
    '.qe-margin-bar{height:24px;border-radius:var(--radius-md,6px);overflow:hidden;background:var(--border,#e2e8f0);position:relative;min-width:120px}',
    '.qe-margin-fill{height:100%;border-radius:var(--radius-md,6px);transition:width .3s;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs,.625rem);font-weight:var(--font-display-weight,700);color:var(--text-inverse,#fff)}',
    '.qe-cost-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-3,10px);margin-bottom:var(--space-4,16px)}',
    '.qe-cost-item{padding:var(--space-3,12px);background:var(--surface,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:var(--radius-lg,8px)}',
    '.qe-cost-label{font-size:var(--text-xs,.6875rem);color:var(--text-secondary,#64748b);text-transform:uppercase;font-weight:var(--font-heading-weight,600)}',
    '.qe-cost-value{font-size:var(--text-lg,1.125rem);font-weight:var(--font-display-weight,800);margin-top:2px}',
    '.qe-funnel{margin:var(--space-4,16px) 0}',
    '.qe-funnel-stage{display:flex;align-items:center;gap:var(--space-3,12px);margin-bottom:var(--space-2,6px)}',
    '.qe-funnel-bar{height:28px;border-radius:var(--radius-md,6px);display:flex;align-items:center;padding:0 var(--space-3,10px);font-size:var(--text-xs,.75rem);font-weight:var(--font-display-weight,700);color:var(--text-inverse,#fff);transition:width .3s;min-width:40px}',
    '.qe-funnel-label{width:100px;font-size:var(--text-xs,.75rem);text-align:right;color:var(--text-secondary,#64748b)}',
    '.qe-funnel-count{font-size:var(--text-xs,.75rem);font-weight:var(--font-display-weight,700);width:40px}',
    '.qe-paging{display:flex;justify-content:center;gap:var(--space-2,8px);margin-top:var(--space-4,16px);align-items:center;font-size:var(--text-sm,.8125rem)}',
    '.qe-paging button{padding:var(--space-2,6px) var(--space-3,12px);border:1px solid var(--border,#d1d5db);border-radius:var(--radius-md,6px);background:var(--surface,#fff);cursor:pointer;font-size:var(--text-sm,.8125rem)}',
    '.qe-paging button:disabled{opacity:.4;cursor:default}',
    '.qe-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:var(--text-sm,.875rem)}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── badge / margin helpers ───────────────────────────── */
function _statusBadge(status){
  if(window.HmRegistry) return HmRegistry.badge('quote_status', status);
  var m=QUOTE_STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="qe-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}

function _marginBar(margin){
  var pct=Math.min(100,Math.max(0,margin));
  var color=pct>=30?'var(--green-light,#22c55e)':pct>=15?'var(--amber-light,#f59e0b)':'var(--red-light,#ef4444)';
  return '<div class="qe-margin-bar"><div class="qe-margin-fill" style="width:'+pct+'%;background:'+color+'">'+pct.toFixed(1)+'%</div></div>';
}

function _calcLineTotal(line){
  var mat=Number(line.material_cost)||0;
  var lab=Number(line.labor_cost)||0;
  var tool=Number(line.tooling_cost)||0;
  var out=Number(line.outside_cost)||0;
  var oh=Number(line.overhead_cost)||0;
  return mat+lab+tool+out+oh;
}

function _calcLinePrice(line){
  var cost=_calcLineTotal(line);
  var margin=Number(line.margin)||25;
  return cost/(1-margin/100);
}

/* ── KPI card ─────────────────────────────────────────── */
function _kpiCard(label, value, color){
  return '<div class="qe-kpi"><div class="qe-kpi-label">'+_esc(label)+'</div><div class="qe-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div></div>';
}

/* ── tab: list ────────────────────────────────────────── */
function _renderListTab(){
  var k=state.kpi;
  var html='<div class="qe-kpis">'
    +_kpiCard(_t('Giá trị Pipeline','Pipeline Value'), _fmtCurrency(k.pipeline_value), 'var(--blue-light,#3b82f6)')
    +_kpiCard(_t('Tỷ lệ thắng','Win Rate'), (k.win_rate||0)+'%', 'var(--green-light,#22c55e)')
    +_kpiCard(_t('TB phản hồi','Avg Response'), (k.avg_response_days||0)+_t(' ngày',' days'), 'var(--amber-light,#f59e0b)')
    +_kpiCard(_t('Báo giá tháng','Quotes MTD'), k.quotes_mtd||0, 'var(--purple-light,#8b5cf6)')
  +'</div>';

  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4,16px)">'
    +'<div class="qe-filters">'
      +'<select data-filter="status"><option value="all">'+_t('Tất cả','All Status')+'</option>';
  Object.keys(QUOTE_STATUS).forEach(function(k){var m=QUOTE_STATUS[k]; html+='<option value="'+k+'"'+(state.filters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select>'
    +'<input type="text" data-filter="customer" placeholder="'+_t('Khách hàng','Customer')+'" value="'+_esc(state.filters.customer)+'" style="width:160px">'
    +'<input type="date" data-filter="dateFrom" value="'+_esc(state.filters.dateFrom)+'">'
    +'<input type="date" data-filter="dateTo" value="'+_esc(state.filters.dateTo)+'">'
  +'</div>'
    +'<button class="qe-btn qe-btn-primary" data-action="new-quote">+ '+_t('Tạo báo giá','New Quote')+'</button>'
  +'</div>';

  if(!state.quotes.length) return html+'<div class="qe-empty">'+_t('Chưa có báo giá','No quotes found')+'</div>';

  html+='<table class="qe-table"><thead><tr>'
    +'<th>ID</th><th>'+_t('Khách hàng','Customer')+'</th><th>'+_t('Ngày','Date')+'</th>'
    +'<th>'+_t('Giá trị','Value')+'</th><th>'+_t('Margin','Margin')+'</th>'
    +'<th>'+_t('Trạng thái','Status')+'</th><th></th>'
  +'</tr></thead><tbody>';
  state.quotes.forEach(function(q){
    html+='<tr>'
      +'<td>'+_esc(q.id)+'</td><td>'+_esc(q.customer_name||'-')+'</td><td>'+_fmtDate(q.date)+'</td>'
      +'<td>'+_fmtCurrency(q.total_value)+'</td>'
      +'<td>'+_marginBar(q.avg_margin||0)+'</td>'
      +'<td>'+_statusBadge(q.status)+'</td>'
      +'<td style="display:flex;gap:var(--space-1,4px)">'
        +'<button class="qe-btn qe-btn-secondary" style="padding:var(--space-1,4px) var(--space-2,8px);font-size:var(--text-xs,.75rem)" data-action="edit-quote" data-id="'+_esc(q.id)+'">'+_t('Sửa','Edit')+'</button>'
        +(q.status==='accepted'?'<button class="qe-btn qe-btn-success" style="padding:var(--space-1,4px) var(--space-2,8px);font-size:var(--text-xs,.75rem)" data-action="convert-to-so" data-id="'+_esc(q.id)+'">'+_t('Chuyển SO','Convert to SO')+'</button>':'')
      +'</td></tr>';
  });
  html+='</tbody></table>';
  html+=_renderPaging();
  return html;
}

/* ── tab: edit ────────────────────────────────────────── */
function _renderEditTab(){
  var q=state.editingQuote||{};
  var isNew=!q.id;
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+(isNew?_t('Tạo báo giá mới','New Quote'):_t('Sửa báo giá','Edit Quote')+' #'+_esc(q.id))+'</h3>';
  html+='<div class="qe-card"><div class="qe-form">'
    +'<div><label>'+_t('Khách hàng','Customer')+'</label><input type="text" id="qe-f-customer" value="'+_esc(q.customer_name||'')+'"></div>'
    +'<div><label>'+_t('Ngày','Date')+'</label><input type="date" id="qe-f-date" value="'+_esc(q.date||new Date().toISOString().slice(0,10))+'"></div>'
    +'<div><label>'+_t('Hạn hiệu lực','Valid Until')+'</label><input type="date" id="qe-f-valid" value="'+_esc(q.valid_until||'')+'"></div>'
    +'<div><label>'+_t('Trạng thái','Status')+'</label><select id="qe-f-status">';
  Object.keys(QUOTE_STATUS).forEach(function(k){var m=QUOTE_STATUS[k]; html+='<option value="'+k+'"'+(q.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>'
    +'<div style="grid-column:1/-1"><label>'+_t('Ghi chú','Notes')+'</label><textarea id="qe-f-notes">'+_esc(q.notes||'')+'</textarea></div>'
  +'</div></div>';

  /* line items */
  var lines=state.lineItems;
  html+='<div class="qe-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3,10px)">'
    +'<h4 style="margin:0">'+_t('Hạng mục','Line Items')+'</h4>'
    +'<button class="qe-btn qe-btn-secondary" data-action="add-line">+ '+_t('Thêm hàng','Add Line')+'</button>'
  +'</div>';
  html+='<div style="overflow-x:auto"><table class="qe-line-table"><thead><tr>'
    +'<th>#</th><th>'+_t('Part','Part')+'</th><th>'+_t('SL','Qty')+'</th>'
    +'<th>'+_t('Vật liệu','Material')+'</th><th>'+_t('Kích thước','Dims')+'</th>'
    +'<th>'+_t('Setup','Setup')+'</th><th>'+_t('Cycle','Cycle')+'</th><th>'+_t('Máy','Machine')+'</th>'
    +'<th>'+_t('Chi phí','Unit Cost')+'</th><th>'+_t('Margin %','Margin %')+'</th><th>'+_t('Đơn giá','Unit Price')+'</th>'
    +'<th></th>'
  +'</tr></thead><tbody>';
  lines.forEach(function(line, idx){
    var unitCost=_calcLineTotal(line);
    var unitPrice=_calcLinePrice(line);
    var margin=Number(line.margin)||25;
    var mColor=margin>=30?'var(--green-light,#22c55e)':margin>=15?'var(--amber-light,#f59e0b)':'var(--red-light,#ef4444)';
    html+='<tr>'
      +'<td>'+(idx+1)+'</td>'
      +'<td><input type="text" data-line="'+idx+'" data-field="part" value="'+_esc(line.part||'')+'"></td>'
      +'<td><input type="number" data-line="'+idx+'" data-field="qty" value="'+_esc(line.qty||1)+'" style="width:60px"></td>'
      +'<td><input type="text" data-line="'+idx+'" data-field="material_type" value="'+_esc(line.material_type||'')+'"></td>'
      +'<td><input type="text" data-line="'+idx+'" data-field="dimensions" value="'+_esc(line.dimensions||'')+'"></td>'
      +'<td><input type="number" data-line="'+idx+'" data-field="setup_time" value="'+_esc(line.setup_time||0)+'" style="width:60px" step="0.1"></td>'
      +'<td><input type="number" data-line="'+idx+'" data-field="cycle_time" value="'+_esc(line.cycle_time||0)+'" style="width:60px" step="0.1">'
        +'<button class="qe-btn qe-btn-secondary" style="padding:2px var(--space-2,6px);font-size:var(--text-xs,.625rem);margin-top:2px" data-action="est-cycle" data-line="'+idx+'">Est</button></td>'
      +'<td><input type="text" data-line="'+idx+'" data-field="machine_type" value="'+_esc(line.machine_type||'')+'"></td>'
      +'<td style="font-weight:var(--font-display-weight,700)">'+_fmtCurrency(unitCost)+'</td>'
      +'<td><input type="number" data-line="'+idx+'" data-field="margin" value="'+_esc(margin)+'" style="width:60px;color:'+mColor+';font-weight:var(--font-display-weight,700)" step="0.5">'
        +'<div style="height:4px;border-radius:2px;background:var(--border,#e2e8f0);margin-top:2px"><div style="height:100%;border-radius:2px;width:'+Math.min(100,margin)+'%;background:'+mColor+'"></div></div></td>'
      +'<td style="font-weight:var(--font-display-weight,700)">'+_fmtCurrency(unitPrice)+'</td>'
      +'<td><button class="qe-btn" style="padding:2px var(--space-2,6px);font-size:var(--text-xs,.75rem);background:var(--red-light,#ef4444);color:var(--text-inverse,#fff)" data-action="remove-line" data-line="'+idx+'">X</button></td>'
    +'</tr>';
  });
  html+='</tbody></table></div>';

  /* totals */
  var totalCost=0, totalValue=0;
  lines.forEach(function(l){ var qty=Number(l.qty)||1; totalCost+=_calcLineTotal(l)*qty; totalValue+=_calcLinePrice(l)*qty; });
  var totalMargin=totalValue>0?((totalValue-totalCost)/totalValue*100):0;
  html+='<div style="display:flex;gap:var(--space-4,16px);margin-top:var(--space-3,12px);align-items:center;flex-wrap:wrap">'
    +'<span>'+_t('Tổng chi phí','Total Cost')+': <strong>'+_fmtCurrency(totalCost)+'</strong></span>'
    +'<span>'+_t('Tổng giá trị','Total Value')+': <strong>'+_fmtCurrency(totalValue)+'</strong></span>'
    +'<span>'+_t('Margin TB','Avg Margin')+': <strong style="color:'+(totalMargin>=30?'var(--green-light,#22c55e)':totalMargin>=15?'var(--amber-light,#f59e0b)':'var(--red-light,#ef4444)')+'">'+totalMargin.toFixed(1)+'%</strong></span>'
  +'</div>';
  html+='</div>';

  html+='<div style="display:flex;gap:var(--space-2,8px);margin-top:var(--space-4,16px)">'
    +'<button class="qe-btn qe-btn-primary" data-action="save-quote">'+_t('Lưu','Save')+'</button>'
    +'<button class="qe-btn qe-btn-secondary" data-action="cancel-edit">'+_t('Hủy','Cancel')+'</button>'
  +'</div>';
  return html;
}

/* ── tab: cost breakdown ──────────────────────────────── */
function _renderCostTab(){
  var q=state.editingQuote;
  if(!q||!state.lineItems.length) return '<div class="qe-empty">'+_t('Chọn báo giá để xem chi tiết chi phí','Select a quote to view cost breakdown')+'</div>';
  var lines=state.lineItems;
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Chi tiết chi phí','Cost Breakdown')+' - '+(q.id?'#'+_esc(q.id):_t('Báo giá mới','New Quote'))+'</h3>';

  lines.forEach(function(line, idx){
    var mat=Number(line.material_cost)||0;
    var lab=Number(line.labor_cost)||0;
    var tool=Number(line.tooling_cost)||0;
    var out=Number(line.outside_cost)||0;
    var oh=Number(line.overhead_cost)||0;
    var total=mat+lab+tool+out+oh;
    var margin=Number(line.margin)||25;
    var price=total/(1-margin/100);
    var qty=Number(line.qty)||1;

    html+='<div class="qe-card"><h4 style="margin:0 0 var(--space-3,10px)">'+(idx+1)+'. '+_esc(line.part||_t('Hạng mục','Line Item'))+'  (x'+qty+')</h4>';
    html+='<div class="qe-cost-grid">'
      +'<div class="qe-cost-item"><div class="qe-cost-label">'+_t('Vật liệu','Material')+'</div><div class="qe-cost-value">'+_fmtCurrency(mat)+'</div>'
        +'<button class="qe-btn qe-btn-secondary" style="padding:2px var(--space-2,8px);font-size:var(--text-xs,.625rem);margin-top:var(--space-1,4px)" data-action="est-material" data-line="'+idx+'">'+_t('Ước lượng','Estimate')+'</button></div>'
      +'<div class="qe-cost-item"><div class="qe-cost-label">'+_t('Nhân công','Labor')+'</div><div class="qe-cost-value">'+_fmtCurrency(lab)+'</div></div>'
      +'<div class="qe-cost-item"><div class="qe-cost-label">'+_t('Dụng cụ','Tooling')+'</div><div class="qe-cost-value">'+_fmtCurrency(tool)+'</div></div>'
      +'<div class="qe-cost-item"><div class="qe-cost-label">'+_t('Gia công ngoài','Outside')+'</div><div class="qe-cost-value">'+_fmtCurrency(out)+'</div></div>'
      +'<div class="qe-cost-item"><div class="qe-cost-label">'+_t('Chi phí chung','Overhead')+'</div><div class="qe-cost-value">'+_fmtCurrency(oh)+'</div></div>'
      +'<div class="qe-cost-item" style="background:var(--bg-surface-alt,#f0fdf4);border-color:var(--green-light,#bbf7d0)"><div class="qe-cost-label">'+_t('Đơn giá','Unit Cost')+'</div><div class="qe-cost-value" style="color:var(--green-dark,#16a34a)">'+_fmtCurrency(total)+'</div></div>'
    +'</div>';
    html+='<div style="display:flex;align-items:center;gap:var(--space-3,12px);flex-wrap:wrap">'
      +'<span>Margin: </span>'+_marginBar(margin)
      +'<span>'+_t('Giá bán','Unit Price')+': <strong>'+_fmtCurrency(price)+'</strong></span>'
      +'<span>'+_t('Tổng hàng','Line Total')+': <strong>'+_fmtCurrency(price*qty)+'</strong></span>'
    +'</div>';

    /* editable cost fields */
    html+='<div class="qe-form" style="margin-top:var(--space-3,10px)">'
      +'<div><label>'+_t('Chi phí vật liệu','Material Cost')+'</label><input type="number" data-cost-line="'+idx+'" data-cost-field="material_cost" value="'+mat+'" step="0.01"></div>'
      +'<div><label>'+_t('Chi phí nhân công','Labor Cost')+'</label><input type="number" data-cost-line="'+idx+'" data-cost-field="labor_cost" value="'+lab+'" step="0.01"></div>'
      +'<div><label>'+_t('Chi phí dụng cụ','Tooling Cost')+'</label><input type="number" data-cost-line="'+idx+'" data-cost-field="tooling_cost" value="'+tool+'" step="0.01"></div>'
      +'<div><label>'+_t('Chi phí gia công ngoài','Outside Cost')+'</label><input type="number" data-cost-line="'+idx+'" data-cost-field="outside_cost" value="'+out+'" step="0.01"></div>'
      +'<div><label>'+_t('Chi phí chung','Overhead Cost')+'</label><input type="number" data-cost-line="'+idx+'" data-cost-field="overhead_cost" value="'+oh+'" step="0.01"></div>'
    +'</div>';
    html+='</div>';
  });
  return html;
}

/* ── tab: dashboard ───────────────────────────────────── */
function _renderDashboardTab(){
  var k=state.kpi;
  var html='<h3 style="margin:0 0 16px">'+_t('Phân tích báo giá','Quote Analytics')+'</h3>';

  /* Win / Loss summary */
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
  html+='<div class="qe-card"><h4 style="margin:0 0 10px">'+_t('Thắng / Thua','Win / Loss')+'</h4>';
  var wins=k.wins||0, losses=k.losses||0, total=wins+losses||1;
  html+='<div style="display:flex;gap:16px;align-items:center">'
    +'<div style="text-align:center"><div style="font-size:2rem;font-weight:800;color:var(--green-light,#22c55e)">'+wins+'</div><div style="font-size:.75rem;color:var(--text-secondary)">'+_t('Thắng','Won')+'</div></div>'
    +'<div style="text-align:center"><div style="font-size:2rem;font-weight:800;color:var(--red-light,#ef4444)">'+losses+'</div><div style="font-size:.75rem;color:var(--text-secondary)">'+_t('Thua','Lost')+'</div></div>'
    +'<div style="flex:1"><div style="height:24px;border-radius:12px;background:var(--border,#e2e8f0);overflow:hidden;display:flex">'
      +'<div style="width:'+Math.round(wins/total*100)+'%;background:var(--green-light,#22c55e);height:100%"></div>'
      +'<div style="width:'+Math.round(losses/total*100)+'%;background:var(--red-light,#ef4444);height:100%"></div>'
    +'</div></div></div></div>';

  /* Response time trend */
  html+='<div class="qe-card"><h4 style="margin:0 0 10px">'+_t('Thời gian phản hồi','Response Time Trend')+'</h4>';
  var respTrend=k.response_trend||[];
  if(!respTrend.length){
    html+='<div class="qe-empty">-</div>';
  } else {
    var maxResp=1; respTrend.forEach(function(r){if(r.days>maxResp) maxResp=r.days;});
    html+='<div style="display:flex;align-items:flex-end;gap:4px;height:120px">';
    respTrend.forEach(function(r){
      var h=Math.round((r.days/maxResp)*100);
      html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">'
        +'<div style="font-size:.625rem;font-weight:700">'+r.days+'d</div>'
        +'<div style="width:100%;height:'+h+'px;background:var(--brand,#1565c0);border-radius:3px 3px 0 0"></div>'
        +'<div style="font-size:.5625rem;color:var(--text-secondary)">'+_esc(r.label||'')+'</div></div>';
    });
    html+='</div>';
  }
  html+='</div></div>';

  /* Pipeline funnel */
  html+='<div class="qe-card"><h4 style="margin:0 0 10px">'+_t('Pipeline','Pipeline Funnel')+'</h4>';
  var funnel=k.funnel||[];
  if(!funnel.length){
    html+='<div class="qe-empty">-</div>';
  } else {
    var fMax=1; funnel.forEach(function(f){if(f.count>fMax) fMax=f.count;});
    var fColors=['#3b82f6','#8b5cf6','#f59e0b','#22c55e','#ef4444','#6b7280','#10b981'];
    html+='<div class="qe-funnel">';
    funnel.forEach(function(f,i){
      var w=Math.max(10,Math.round((f.count/fMax)*100));
      html+='<div class="qe-funnel-stage">'
        +'<div class="qe-funnel-label">'+_esc(f.label||'-')+'</div>'
        +'<div class="qe-funnel-bar" style="width:'+w+'%;background:'+fColors[i%fColors.length]+'">'+_fmtCurrency(f.value||0)+'</div>'
        +'<div class="qe-funnel-count">'+_esc(f.count)+'</div>'
      +'</div>';
    });
    html+='</div>';
  }
  html+='</div>';
  return html;
}

/* ── paging ───────────────────────────────────────────── */
function _renderPaging(){
  var p=state.pagination;
  var page=Math.floor(p.offset/p.limit)+1;
  var pages=Math.max(1,Math.ceil(p.total/p.limit));
  return '<div class="qe-paging">'
    +'<button data-action="page-prev"'+(page<=1?' disabled':'')+'>'+_t('Trước','Prev')+'</button>'
    +'<span>'+page+' / '+pages+' ('+p.total+')</span>'
    +'<button data-action="page-next"'+(page>=pages?' disabled':'')+'>'+_t('Sau','Next')+'</button>'
  +'</div>';
}

/* ── data loading ─────────────────────────────────────── */
function _loadQuotes(){
  state.loading=true; _paint();
  var p=Object.assign({}, state.filters, {offset:state.pagination.offset, limit:state.pagination.limit});
  _api('quote_list', p).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.quotes=r.items||[];
      state.pagination.total=r.total||0;
      state.kpi=r.kpi||state.kpi;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Lỗi kết nối','Connection error'),'error'); _paint(); });
}

function _loadKpi(){
  _api('quote_kpi',{}).then(function(r){
    if(r&&r.ok) state.kpi=r.kpi||{};
    _paint();
  }).catch(function(){});
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="qe">';
  html+='<div class="qe-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="qe-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="qe-empty">'+_t('Đang tải...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'list':      html+=_renderListTab(); break;
      case 'edit':      html+=_renderEditTab(); break;
      case 'cost':      html+=_renderCostTab(); break;
      case 'dashboard': html+=_renderDashboardTab(); break;
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
        _paint();
        break;
      case 'new-quote':
        state.editingQuote={status:'draft'};
        state.lineItems=[{qty:1,margin:25}];
        state.activeTab='edit';
        _paint();
        break;
      case 'edit-quote':
        var qId=t.getAttribute('data-id');
        var found=state.quotes.find(function(q){return q.id===qId;});
        state.editingQuote=found?JSON.parse(JSON.stringify(found)):{};
        state.lineItems=(found&&found.lines)?JSON.parse(JSON.stringify(found.lines)):[{qty:1,margin:25}];
        state.activeTab='edit';
        _paint();
        break;
      case 'add-line':
        state.lineItems.push({qty:1,margin:25});
        _paint();
        break;
      case 'remove-line':
        var li=parseInt(t.getAttribute('data-line'));
        state.lineItems.splice(li,1);
        _paint();
        break;
      case 'save-quote':
        var qData={
          customer_name:(state.container.querySelector('#qe-f-customer')||{}).value||'',
          date:(state.container.querySelector('#qe-f-date')||{}).value||'',
          valid_until:(state.container.querySelector('#qe-f-valid')||{}).value||'',
          status:(state.container.querySelector('#qe-f-status')||{}).value||'draft',
          notes:(state.container.querySelector('#qe-f-notes')||{}).value||'',
          lines:state.lineItems
        };
        if(state.editingQuote&&state.editingQuote.id) qData.id=state.editingQuote.id;
        _api('quote_save', qData).then(function(r){
          if(r&&r.ok){_toast(_t('Đã lưu','Saved'),'success'); state.activeTab='list'; _loadQuotes();}
          else {_toast(_t('Lỗi lưu','Save failed'),'error');}
        }).catch(function(){_toast(_t('Lỗi kết nối','Connection error'),'error');});
        break;
      case 'cancel-edit':
        state.activeTab='list'; _paint();
        break;
      case 'convert-to-so':
        var cId=t.getAttribute('data-id');
        _api('quote_convert_to_so',{id:cId}).then(function(r){
          if(r&&r.ok){_toast(_t('Đã chuyển thành SO','Converted to SO'),'success');_loadQuotes();}
          else {_toast(r&&r.message?r.message:_t('Lỗi','Error'),'error');}
        }).catch(function(){_toast(_t('Lỗi kết nối','Connection error'),'error');});
        break;
      case 'est-cycle':
        var eLine=parseInt(t.getAttribute('data-line'));
        var ePart=state.lineItems[eLine];
        if(!ePart) break;
        _api('quote_estimate_cycle',{part:ePart.part,material_type:ePart.material_type,dimensions:ePart.dimensions,machine_type:ePart.machine_type}).then(function(r){
          if(r&&r.ok&&r.cycle_time!=null){state.lineItems[eLine].cycle_time=r.cycle_time;_toast(_t('Ước lượng cycle: ','Cycle estimate: ')+r.cycle_time,'info');_paint();}
          else {_toast(_t('Không thể ước lượng','Cannot estimate'),'error');}
        });
        break;
      case 'est-material':
        var mLine=parseInt(t.getAttribute('data-line'));
        var mPart=state.lineItems[mLine];
        if(!mPart) break;
        _api('quote_estimate_material',{material_type:mPart.material_type,dimensions:mPart.dimensions}).then(function(r){
          if(r&&r.ok&&r.cost!=null){state.lineItems[mLine].material_cost=r.cost;_toast(_t('Ước lượng vật liệu: $','Material estimate: $')+r.cost,'info');_paint();}
          else {_toast(_t('Không thể ước lượng','Cannot estimate'),'error');}
        });
        break;
      case 'page-prev':
        state.pagination.offset=Math.max(0,state.pagination.offset-state.pagination.limit);
        _loadQuotes();
        break;
      case 'page-next':
        state.pagination.offset+=state.pagination.limit;
        _loadQuotes();
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; state.pagination.offset=0; _loadQuotes(); return; }
    var lineIdx=e.target.getAttribute('data-line');
    var lineField=e.target.getAttribute('data-field');
    if(lineIdx!==null&&lineField){
      var idx=parseInt(lineIdx);
      if(state.lineItems[idx]){
        var val=e.target.value;
        if(['qty','setup_time','cycle_time','margin'].indexOf(lineField)>=0) val=parseFloat(val)||0;
        state.lineItems[idx][lineField]=val;
        _paint();
      }
      return;
    }
    var costLine=e.target.getAttribute('data-cost-line');
    var costField=e.target.getAttribute('data-cost-field');
    if(costLine!==null&&costField){
      var ci=parseInt(costLine);
      if(state.lineItems[ci]){
        state.lineItems[ci][costField]=parseFloat(e.target.value)||0;
        _paint();
      }
    }
  });

  state.container.addEventListener('input', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='customer') state.filters.customer=e.target.value;
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='list';
  state.editingQuote=null;
  state.lineItems=[];
  state.pagination.offset=0;
  _paint();
  _bind();
  _loadKpi();
  _loadQuotes();
}

window._renderQuotingEngine = render;

})();
