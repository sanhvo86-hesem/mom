/* ===================================================================
   19-customer-portal-admin.js
   HESEM QMS Portal - Customer Portal Administration
   Manage external portal users, access grants, complaint inbox,
   shared documents, and portal usage analytics.
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
var STYLE_ID = 'cp-styles';
var TABS = [
  { key:'users',      vi:'Người dùng',       en:'Portal Users' },
  { key:'access',     vi:'Quyền truy cập',   en:'Access Management' },
  { key:'complaints', vi:'Khiếu nại',        en:'Complaint Inbox' },
  { key:'documents',  vi:'Tài liệu',         en:'Document Access' },
  { key:'analytics',  vi:'Phân tích',        en:'Analytics' }
];

var USER_STATUS = {
  active:      { vi:'Hoạt động',    en:'Active',      color:'#22c55e' },
  pending:     { vi:'Chờ xác nhận', en:'Pending',     color:'#f59e0b' },
  deactivated: { vi:'Vô hiệu',     en:'Deactivated', color:'#94a3b8' },
  locked:      { vi:'Bị khóa',     en:'Locked',      color:'#ef4444' }
};

var COMPLAINT_STATUS = {
  new:         { vi:'Mới',         en:'New',         color:'#3b82f6' },
  acknowledged:{ vi:'Đã nhận',     en:'Acknowledged', color:'#f59e0b' },
  investigating:{ vi:'Đang xử lý', en:'Investigating', color:'#8b5cf6' },
  resolved:    { vi:'Đã giải quyết', en:'Resolved',  color:'#22c55e' },
  closed:      { vi:'Đóng',        en:'Closed',      color:'#6b7280' }
};

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'users',
  portalUsers: [],
  orderViews: [],
  complaints: [],
  documents: [],
  analytics: {},
  filters: { status:'all', search:'', customer:'' },
  pagination: { offset:0, limit:50, total:0 },
  loading: false
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.cp{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.cp-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.cp-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.cp-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.cp-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.cp-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.cp-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.cp-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.cp-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.cp-kpi-sub{font-size:.6875rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    '.cp-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.cp-filters select,.cp-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.cp-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.cp-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.cp-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.cp-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.cp-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff;white-space:nowrap}',
    '.cp-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.cp-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.cp-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.cp-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.cp-btn-secondary:hover{background:#e2e8f0}',
    '.cp-btn-danger{background:#ef4444;color:#fff}',
    '.cp-btn-danger:hover{background:#dc2626}',
    '.cp-btn-success{background:#22c55e;color:#fff}',
    '.cp-btn-success:hover{background:#16a34a}',
    '.cp-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:18px;margin-bottom:12px}',
    '.cp-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.cp-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.cp-form input,.cp-form select,.cp-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.cp-form textarea{min-height:80px;resize:vertical}',
    '.cp-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    '.cp-paging{display:flex;justify-content:center;gap:8px;margin-top:16px;align-items:center;font-size:.8125rem}',
    '.cp-paging button{padding:6px 12px;border:1px solid var(--border,#d1d5db);border-radius:6px;background:var(--surface,#fff);cursor:pointer;font-size:.8125rem}',
    '.cp-paging button:disabled{opacity:.4;cursor:default}',
    '.cp-access-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}',
    '.cp-stat-bar{height:8px;border-radius:4px;background:#e2e8f0;overflow:hidden;min-width:80px}',
    '.cp-stat-fill{height:100%;border-radius:4px;transition:width .3s}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── badge helpers ────────────────────────────────────── */
function _userBadge(status){
  var m=USER_STATUS[status]||{vi:status,en:status,color:'#64748b'};
  return '<span class="cp-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _complaintBadge(status){
  var m=COMPLAINT_STATUS[status]||{vi:status,en:status,color:'#64748b'};
  return '<span class="cp-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}

/* ── KPI card ─────────────────────────────────────────── */
function _kpiCard(label, value, color, sub){
  var html='<div class="cp-kpi"><div class="cp-kpi-label">'+_esc(label)+'</div><div class="cp-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div>';
  if(sub) html+='<div class="cp-kpi-sub">'+_esc(sub)+'</div>';
  html+='</div>';
  return html;
}

/* ── tab: users ──────────────────────────────────────── */
function _renderUsersTab(){
  /* summary KPIs */
  var active=0, pending=0, deactivated=0;
  state.portalUsers.forEach(function(u){
    if(u.status==='active') active++;
    else if(u.status==='pending') pending++;
    else if(u.status==='deactivated'||u.status==='locked') deactivated++;
  });
  var html='<div class="cp-kpis">'
    +_kpiCard(_t('Hoat dong','Active'), active, '#22c55e')
    +_kpiCard(_t('Cho xac nhan','Pending'), pending, '#f59e0b')
    +_kpiCard(_t('Vo hieu hoa','Deactivated'), deactivated, '#94a3b8')
    +_kpiCard(_t('Tong cong','Total'), state.portalUsers.length, 'inherit')
  +'</div>';

  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_t('Quản lý người dùng portal','Portal User Management')+'</h3>'
    +'<button class="cp-btn cp-btn-primary" data-action="create-user">+ '+_t('Tạo người dùng','New User')+'</button>'
  +'</div>';
  html+='<div id="cp-user-form"></div>';

  html+='<div class="cp-filters">';
  html+='<input type="text" data-filter="search" placeholder="'+_t('Tìm email / tên','Search email / name')+'" value="'+_esc(state.filters.search)+'" style="width:220px">';
  html+='<select data-filter="status"><option value="all">'+_t('Tất cả trạng thái','All Status')+'</option>';
  Object.keys(USER_STATUS).forEach(function(k){var m=USER_STATUS[k]; html+='<option value="'+k+'"'+(state.filters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>';

  if(!state.portalUsers.length) return html+'<div class="cp-empty">'+_t('Chưa có người dùng','No portal users')+'</div>';

  html+='<table class="cp-table"><thead><tr><th>Email</th><th>'+_t('Khách hàng','Customer')+'</th><th>'+_t('Trạng thái','Status')+'</th><th>'+_t('Lần đăng nhập cuối','Last Login')+'</th><th>'+_t('Đơn hàng','Orders')+'</th><th></th></tr></thead><tbody>';
  state.portalUsers.forEach(function(u){
    html+='<tr><td>'+_esc(u.email)+'</td><td>'+_esc(u.customer_name||'-')+'</td><td>'+_userBadge(u.status)+'</td><td>'+_fmtDateTime(u.last_login)+'</td><td>'+_esc(u.order_count||0)+'</td>'
      +'<td style="display:flex;gap:4px">'
        +'<button class="cp-btn cp-btn-secondary" style="padding:4px 8px;font-size:.75rem" data-action="edit-user" data-id="'+_esc(u.id)+'">'+_t('Sửa','Edit')+'</button>';
    if(u.status==='active'){
      html+='<button class="cp-btn cp-btn-danger" style="padding:4px 8px;font-size:.75rem" data-action="deactivate-user" data-id="'+_esc(u.id)+'">'+_t('Vô hiệu','Deactivate')+'</button>';
    } else if(u.status==='deactivated'||u.status==='locked'){
      html+='<button class="cp-btn cp-btn-success" style="padding:4px 8px;font-size:.75rem" data-action="activate-user" data-id="'+_esc(u.id)+'">'+_t('Kích hoạt','Activate')+'</button>';
    }
    if(u.status==='pending'){
      html+='<button class="cp-btn" style="padding:4px 8px;font-size:.75rem;background:#3b82f6;color:#fff" data-action="resend-verify" data-id="'+_esc(u.id)+'">'+_t('Gửi lại','Resend')+'</button>';
    }
    html+='</td></tr>';
  });
  html+='</tbody></table>';
  html+=_renderPaging();
  return html;
}

/* ── user detail inline ──────────────────────────────── */
function _showUserDetail(userId){
  var user=state.portalUsers.find(function(u){return String(u.id)===String(userId);});
  if(!user) return;
  var el=state.container.querySelector('#cp-user-form');
  if(!el) return;
  var html='<div class="cp-card"><h4 style="margin:0 0 12px">'+_t('Chi tiet nguoi dung','User Detail')+' - '+_esc(user.email)+'</h4>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:.8125rem;margin-bottom:12px">';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Ten','Name')+':</span> '+_esc(user.name||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">Email:</span> '+_esc(user.email)+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Khach hang','Customer')+':</span> '+_esc(user.customer_name||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Dien thoai','Phone')+':</span> '+_esc(user.phone||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Trang thai','Status')+':</span> '+_userBadge(user.status)+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Dang nhap cuoi','Last Login')+':</span> '+_fmtDateTime(user.last_login)+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Ngay tao','Created')+':</span> '+_fmtDate(user.created_at)+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('So don hang','Orders')+':</span> '+_esc(user.order_count||0)+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:600">'+_t('Khieu nai','Complaints')+':</span> '+_esc(user.complaint_count||0)+'</div>';
  html+='</div>';

  /* login history */
  var history=user.login_history||[];
  if(history.length){
    html+='<h5 style="margin:12px 0 6px;font-size:.75rem;text-transform:uppercase;color:var(--text-secondary,#64748b)">'+_t('Lich su dang nhap','Login History')+'</h5>';
    html+='<table class="cp-table"><thead><tr><th>'+_t('Thoi gian','Time')+'</th><th>IP</th><th>'+_t('Thiet bi','Device')+'</th></tr></thead><tbody>';
    history.slice(0,10).forEach(function(h){
      html+='<tr><td>'+_fmtDateTime(h.timestamp)+'</td><td>'+_esc(h.ip||'-')+'</td><td>'+_esc(h.device||'-')+'</td></tr>';
    });
    html+='</tbody></table>';
  }

  html+='<div style="margin-top:12px"><button class="cp-btn cp-btn-secondary" data-action="cancel-form">'+_t('Dong','Close')+'</button></div>';
  html+='</div>';
  el.innerHTML=html;
}

/* ── tab: access management ──────────────────────────── */
function _renderAccessTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Quản lý quyền truy cập SO','SO Access Management')+'</h3>';

  if(!state.orderViews.length) return html+'<div class="cp-empty">'+_t('Chưa có cấp quyền','No access grants')+'</div>';

  html+='<div class="cp-access-grid">';
  state.orderViews.forEach(function(grant){
    html+='<div class="cp-card">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
        +'<strong>'+_esc(grant.user_email)+'</strong>'
        +_userBadge(grant.user_status||'active')
      +'</div>'
      +'<div style="font-size:.75rem;color:var(--text-secondary,#64748b);margin-bottom:10px">'+_esc(grant.customer_name||'-')+'</div>';

    var orders=grant.orders||[];
    if(orders.length){
      html+='<table class="cp-table" style="margin-bottom:8px"><thead><tr><th>SO#</th><th>'+_t('Trạng thái','Status')+'</th><th></th></tr></thead><tbody>';
      orders.forEach(function(o){
        html+='<tr><td>'+_esc(o.so_number)+'</td><td>'+_esc(o.status||'-')+'</td>'
          +'<td><button class="cp-btn cp-btn-danger" style="padding:2px 8px;font-size:.6875rem" data-action="revoke-access" data-user="'+_esc(grant.user_id)+'" data-so="'+_esc(o.so_id)+'">'+_t('Thu hồi','Revoke')+'</button></td></tr>';
      });
      html+='</tbody></table>';
    } else {
      html+='<div style="font-size:.8125rem;color:#94a3b8">'+_t('Chưa cấp SO','No SO grants')+'</div>';
    }
    html+='<button class="cp-btn cp-btn-primary" style="padding:4px 10px;font-size:.75rem" data-action="grant-access" data-user="'+_esc(grant.user_id)+'">+ '+_t('Cấp SO','Grant SO')+'</button>';
    html+='</div>';
  });
  html+='</div>';
  return html;
}

/* ── tab: complaint inbox ────────────────────────────── */
function _renderComplaintsTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_t('Hộp thư khiếu nại','Complaint Inbox')+'</h3>'
  +'</div>';

  html+='<div class="cp-filters">';
  html+='<select data-filter="complaint_status"><option value="all">'+_t('Tất cả','All Status')+'</option>';
  Object.keys(COMPLAINT_STATUS).forEach(function(k){var m=COMPLAINT_STATUS[k]; html+='<option value="'+k+'"'+(state.filters.complaint_status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select></div>';

  if(!state.complaints.length) return html+'<div class="cp-empty">'+_t('Chưa có khiếu nại','No complaints')+'</div>';

  state.complaints.forEach(function(c){
    html+='<div class="cp-card" style="cursor:default">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">'
        +'<div><strong>'+_esc(c.complaint_number||c.id)+'</strong> - '+_esc(c.subject||'-')+'</div>'
        +_complaintBadge(c.status)
      +'</div>'
      +'<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:6px">'
        +_t('Khách hàng','Customer')+': '+_esc(c.customer_name||'-')
        +' | '+_t('Ngày gửi','Submitted')+': '+_fmtDateTime(c.submitted_at)
      +'</div>'
      +'<div style="font-size:.8125rem;margin-top:8px">'+_esc(c.description||'-')+'</div>'
      +'<div style="display:flex;gap:6px;margin-top:10px">';
    if(c.status==='new'){
      html+='<button class="cp-btn" style="padding:4px 10px;font-size:.75rem;background:#f59e0b;color:#fff" data-action="acknowledge-complaint" data-id="'+_esc(c.id)+'">'+_t('Xác nhận','Acknowledge')+'</button>';
    }
    if(c.status!=='closed'&&c.status!=='resolved'){
      html+='<button class="cp-btn cp-btn-primary" style="padding:4px 10px;font-size:.75rem" data-action="link-8d" data-id="'+_esc(c.id)+'">'+_t('Liên kết 8D','Link to 8D')+'</button>';
      html+='<button class="cp-btn cp-btn-success" style="padding:4px 10px;font-size:.75rem" data-action="resolve-complaint" data-id="'+_esc(c.id)+'">'+_t('Giải quyết','Resolve')+'</button>';
    }
    html+='</div></div>';
  });
  html+=_renderPaging();
  return html;
}

/* ── tab: document access ────────────────────────────── */
function _renderDocumentsTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Tài liệu đã chia sẻ','Shared Documents')+'</h3>';

  if(!state.documents.length) return html+'<div class="cp-empty">'+_t('Chưa có tài liệu','No shared documents')+'</div>';

  html+='<table class="cp-table"><thead><tr><th>'+_t('Tài liệu','Document')+'</th><th>'+_t('Loại','Type')+'</th><th>'+_t('Khách hàng','Customer')+'</th><th>'+_t('Chia sẻ bởi','Shared By')+'</th><th>'+_t('Ngày','Date')+'</th><th>'+_t('Tải xuống','Downloads')+'</th><th></th></tr></thead><tbody>';
  state.documents.forEach(function(doc){
    html+='<tr><td>'+_esc(doc.title||doc.filename)+'</td><td>'+_esc(doc.doc_type||'-')+'</td><td>'+_esc(doc.customer_name||'-')+'</td><td>'+_esc(doc.shared_by||'-')+'</td><td>'+_fmtDate(doc.shared_at)+'</td><td>'+_esc(doc.download_count||0)+'</td>'
      +'<td><button class="cp-btn cp-btn-danger" style="padding:4px 8px;font-size:.75rem" data-action="revoke-doc" data-id="'+_esc(doc.id)+'">'+_t('Thu hồi','Revoke')+'</button></td></tr>';
  });
  html+='</tbody></table>';
  html+=_renderPaging();
  return html;
}

/* ── tab: analytics ──────────────────────────────────── */
function _renderAnalyticsTab(){
  var k=state.analytics;
  var html='<div class="cp-kpis">'
    +_kpiCard(_t('Người dùng hoạt động','Active Users'), k.active_users||0, '#22c55e')
    +_kpiCard(_t('Đăng nhập tháng này','Logins This Month'), k.logins_this_month||0, '#3b82f6')
    +_kpiCard(_t('Tài liệu tải xuống','Documents Downloaded'), k.docs_downloaded||0, '#8b5cf6')
    +_kpiCard(_t('Khiếu nại gửi','Complaints Submitted'), k.complaints_submitted||0, '#f59e0b')
    +_kpiCard(_t('Tổng người dùng','Total Users'), k.total_users||0, 'inherit')
  +'</div>';

  /* recent activity */
  var activity=k.recent_activity||[];
  html+='<div class="cp-card"><h4 style="margin:0 0 12px">'+_t('Hoạt động gần đây','Recent Activity')+'</h4>';
  if(activity.length){
    html+='<table class="cp-table"><thead><tr><th>'+_t('Thời gian','Time')+'</th><th>'+_t('Người dùng','User')+'</th><th>'+_t('Hành động','Action')+'</th><th>'+_t('Chi tiết','Detail')+'</th></tr></thead><tbody>';
    activity.forEach(function(a){
      html+='<tr><td>'+_fmtDateTime(a.timestamp)+'</td><td>'+_esc(a.user_email||'-')+'</td><td>'+_esc(a.action||'-')+'</td><td>'+_esc(a.detail||'-')+'</td></tr>';
    });
    html+='</tbody></table>';
  } else { html+='<div class="cp-empty">-</div>'; }
  html+='</div>';

  /* login trend */
  var trend=k.login_trend||[];
  if(trend.length){
    html+='<div class="cp-card"><h4 style="margin:0 0 12px">'+_t('Xu hướng đăng nhập','Login Trend')+'</h4>';
    html+='<div style="display:flex;align-items:flex-end;gap:4px;height:120px">';
    var maxVal=Math.max.apply(null, trend.map(function(t){return t.count||0;}))||1;
    trend.forEach(function(t){
      var pct=Math.round(((t.count||0)/maxVal)*100);
      html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">'
        +'<span style="font-size:.6875rem;font-weight:700">'+_esc(t.count||0)+'</span>'
        +'<div style="width:100%;background:var(--brand,#1565c0);border-radius:4px 4px 0 0;height:'+pct+'%"></div>'
        +'<span style="font-size:.6rem;color:var(--text-secondary,#64748b)">'+_esc(t.label||'')+'</span>'
      +'</div>';
    });
    html+='</div></div>';
  }
  return html;
}

/* ── paging ───────────────────────────────────────────── */
function _renderPaging(){
  var p=state.pagination;
  var page=Math.floor(p.offset/p.limit)+1;
  var pages=Math.max(1,Math.ceil(p.total/p.limit));
  return '<div class="cp-paging">'
    +'<button data-action="page-prev"'+(page<=1?' disabled':'')+'>'+_t('Truoc','Prev')+'</button>'
    +'<span>'+page+' / '+pages+' ('+p.total+')</span>'
    +'<button data-action="page-next"'+(page>=pages?' disabled':'')+'>'+_t('Sau','Next')+'</button>'
  +'</div>';
}

/* ── inline forms ─────────────────────────────────────── */
function _showUserForm(){
  var el=state.container.querySelector('#cp-user-form');
  if(!el) return;
  el.innerHTML='<div class="cp-card"><h4 style="margin:0 0 12px">'+_t('Tạo người dùng portal','New Portal User')+'</h4>'
    +'<div class="cp-form">'
      +'<div><label>Email</label><input type="email" id="cp-f-email"></div>'
      +'<div><label>'+_t('Tên','Name')+'</label><input type="text" id="cp-f-name"></div>'
      +'<div><label>'+_t('Khách hàng','Customer')+'</label><input type="text" id="cp-f-customer"></div>'
      +'<div><label>'+_t('Điện thoại','Phone')+'</label><input type="text" id="cp-f-phone"></div>'
    +'</div>'
    +'<div style="margin-top:12px;display:flex;gap:8px">'
      +'<button class="cp-btn cp-btn-primary" data-action="submit-user">'+_t('Tạo & gửi xác nhận','Create & Send Verification')+'</button>'
      +'<button class="cp-btn cp-btn-secondary" data-action="cancel-form">'+_t('Huy','Cancel')+'</button>'
    +'</div></div>';
}

/* ── data loading ─────────────────────────────────────── */
function _loadData(){
  state.loading=true; _paint();
  var p=Object.assign({}, state.filters, { offset:state.pagination.offset, limit:state.pagination.limit });
  _api('customer_portal_data', p).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.portalUsers=r.users||[];
      state.orderViews=r.order_views||[];
      state.complaints=r.complaints||[];
      state.documents=r.documents||[];
      state.analytics=r.analytics||{};
      state.pagination.total=r.total||0;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="cp">';
  html+='<div class="cp-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="cp-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="cp-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'users':      html+=_renderUsersTab(); break;
      case 'access':     html+=_renderAccessTab(); break;
      case 'complaints': html+=_renderComplaintsTab(); break;
      case 'documents':  html+=_renderDocumentsTab(); break;
      case 'analytics':  html+=_renderAnalyticsTab(); break;
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
        state.pagination.offset=0;
        _paint();
        break;
      case 'create-user': _showUserForm(); break;
      case 'cancel-form':
        var el=state.container.querySelector('#cp-user-form'); if(el) el.innerHTML='';
        break;
      case 'submit-user':
        _api('customer_portal_user_create',{
          email:(state.container.querySelector('#cp-f-email')||{}).value||'',
          name:(state.container.querySelector('#cp-f-name')||{}).value||'',
          customer:(state.container.querySelector('#cp-f-customer')||{}).value||'',
          phone:(state.container.querySelector('#cp-f-phone')||{}).value||''
        }).then(function(r){ if(r&&r.ok){_toast(_t('Da tao nguoi dung','User created'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');} });
        break;
      case 'deactivate-user':
        _api('customer_portal_user_update',{id:t.getAttribute('data-id'),status:'deactivated'}).then(function(r){
          if(r&&r.ok){_toast(_t('Da vo hieu','Deactivated'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'activate-user':
        _api('customer_portal_user_update',{id:t.getAttribute('data-id'),status:'active'}).then(function(r){
          if(r&&r.ok){_toast(_t('Da kich hoat','Activated'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'resend-verify':
        _api('customer_portal_resend_verification',{id:t.getAttribute('data-id')}).then(function(r){
          if(r&&r.ok){_toast(_t('Da gui lai','Verification resent'),'success');} else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'edit-user':
        _showUserDetail(t.getAttribute('data-id'));
        break;
      case 'revoke-access':
        _api('customer_portal_revoke_access',{user_id:t.getAttribute('data-user'),so_id:t.getAttribute('data-so')}).then(function(r){
          if(r&&r.ok){_toast(_t('Da thu hoi','Access revoked'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'grant-access':
        var soNumber=prompt(_t('Nhap so SO:','Enter SO number:'));
        if(soNumber){
          _api('customer_portal_grant_access',{user_id:t.getAttribute('data-user'),so_number:soNumber}).then(function(r){
            if(r&&r.ok){_toast(_t('Da cap quyen','Access granted'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');}
          });
        }
        break;
      case 'acknowledge-complaint':
        _api('customer_portal_complaint_update',{id:t.getAttribute('data-id'),status:'acknowledged'}).then(function(r){
          if(r&&r.ok){_toast(_t('Da xac nhan','Acknowledged'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'resolve-complaint':
        _api('customer_portal_complaint_update',{id:t.getAttribute('data-id'),status:'resolved'}).then(function(r){
          if(r&&r.ok){_toast(_t('Da giai quyet','Resolved'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'link-8d':
        _toast(_t('Lien ket 8D dang phat trien','8D linking in development'),'info');
        break;
      case 'revoke-doc':
        _api('customer_portal_revoke_doc',{id:t.getAttribute('data-id')}).then(function(r){
          if(r&&r.ok){_toast(_t('Da thu hoi tai lieu','Document revoked'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');}
        });
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
    if(f==='search'){ state.filters.search=e.target.value; }
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='users';
  state.pagination.offset=0;
  _paint();
  _bind();
  _loadData();
}

window._renderCustomerPortalAdmin = render;

})();
