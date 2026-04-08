/* ===================================================================
   27-knowledge-base.js
   HESEM MOM Portal - Knowledge Base / Tribal Knowledge Capture
   Tips, best practices, setup tricks, machining know-how grouped
   by machine, material, and part. Voting, comments, analytics.
   =================================================================== */

(function(){
'use strict';

/* -- helpers -------------------------------------------------- */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }
function _api(action, payload, method){
  if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000);
  return fetch('api.php?action='+encodeURIComponent(action),{method:method||'POST',credentials:'include',headers:{'Content-Type':'application/json',...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})}).then(function(r){return r.json();});
}
function _toast(msg, type){ if(typeof showToast==='function') return showToast(msg, type); var box=document.createElement('div'); box.className='sj-toast '+(type||'info'); box.textContent=msg; document.body.appendChild(box); requestAnimationFrame(function(){ box.classList.add('show'); }); setTimeout(function(){ box.classList.remove('show'); setTimeout(function(){ if(box.parentNode) box.remove(); },180); },3200); }
function _fmtDate(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }

/* -- constants ------------------------------------------------ */
var STYLE_ID = 'kb-styles';
var TABS = [
  { key:'browse',   vi:'Duyet Tips',        en:'Browse Tips' },
  { key:'add',      vi:'Them Tip',          en:'Add Tip' },
  { key:'detail',   vi:'Chi tiet',          en:'Tip Detail' },
  { key:'machine',  vi:'Theo May',          en:'Machine Knowledge' },
  { key:'analytics',vi:'Thong ke',          en:'Analytics' }
];

var CATEGORIES = {
  setup:     { vi:'Cai dat',      en:'Setup',     color:'#3b82f6', bg:'rgba(59,130,246,.1)' },
  machining: { vi:'Gia cong',     en:'Machining', color:'#8b5cf6', bg:'rgba(139,92,246,.1)' },
  quality:   { vi:'Chat luong',   en:'Quality',   color:'#22c55e', bg:'rgba(34,197,94,.1)' },
  tooling:   { vi:'Dung cu',      en:'Tooling',   color:'#f59e0b', bg:'rgba(245,158,11,.1)' },
  material:  { vi:'Vat lieu',     en:'Material',  color:'#06b6d4', bg:'rgba(6,182,212,.1)' },
  safety:    { vi:'An toan',      en:'Safety',    color:'#ef4444', bg:'rgba(239,68,68,.1)' }
};

/* -- state ---------------------------------------------------- */
var state = {
  container: null,
  activeTab: 'browse',
  tips: [],
  selectedTip: null,
  filters: { machine:'', material:'', part:'', tag:'', category:'all' },
  search: '',
  comments: [],
  machines: [],
  analytics: null,
  loading: false
};

/* -- CSS injection -------------------------------------------- */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.kb{padding:16px;max-width:1200px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.kb-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}',
    '.kb-tab{padding:8px 16px;font-size:.82rem;font-weight:600;cursor:pointer;border-radius:8px;border:2px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);transition:all .15s}',
    '.kb-tab:hover{border-color:var(--brand,#1565c0);color:var(--brand,#1565c0)}',
    '.kb-tab.active{border-color:var(--brand,#1565c0);background:var(--brand,#1565c0);color:#fff}',
    /* search bar */
    '.kb-search{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}',
    '.kb-search input,.kb-search select{padding:8px 12px;border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.85rem;background:var(--surface,#fff)}',
    '.kb-search input{flex:1;min-width:200px}',
    /* card grid */
    '.kb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}',
    '.kb-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:16px;cursor:pointer;transition:box-shadow .15s,border-color .15s}',
    '.kb-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.08);border-color:var(--brand,#1565c0)}',
    '.kb-card-title{font-size:.95rem;font-weight:700;margin-bottom:6px}',
    '.kb-card-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;font-size:.75rem;color:var(--text-secondary,#64748b)}',
    '.kb-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:700;text-transform:uppercase}',
    '.kb-tag{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.7rem;background:var(--bg-alt,#f1f5f9);color:var(--text-secondary,#64748b)}',
    '.kb-card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border,#e2e8f0);font-size:.75rem;color:var(--text-secondary,#64748b)}',
    '.kb-votes{display:flex;align-items:center;gap:4px;font-weight:600}',
    '.kb-votes .up{color:#22c55e}',
    '.kb-votes .down{color:#ef4444}',
    /* detail */
    '.kb-detail{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:24px}',
    '.kb-detail-title{font-size:1.25rem;font-weight:700;margin-bottom:12px}',
    '.kb-detail-body{line-height:1.7;margin-bottom:16px;white-space:pre-wrap}',
    '.kb-photos{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}',
    '.kb-photo{width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border,#e2e8f0)}',
    '.kb-vote-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:8px;border:1px solid var(--border,#e2e8f0);cursor:pointer;font-size:.85rem;font-weight:600;background:var(--surface,#fff);transition:all .15s}',
    '.kb-vote-btn:hover{background:var(--bg-alt,#f1f5f9)}',
    '.kb-vote-btn.voted{border-color:var(--brand,#1565c0);color:var(--brand,#1565c0)}',
    '.kb-comments{margin-top:20px}',
    '.kb-comment{padding:10px 14px;border:1px solid var(--border,#e2e8f0);border-radius:10px;margin-bottom:8px}',
    '.kb-comment-author{font-weight:600;font-size:.82rem}',
    '.kb-comment-date{font-size:.72rem;color:var(--text-secondary,#64748b);margin-left:8px}',
    '.kb-comment-body{margin-top:4px;font-size:.85rem;line-height:1.5}',
    /* form */
    '.kb-form{display:grid;gap:14px;max-width:700px}',
    '.kb-form label{display:block;font-weight:600;font-size:.82rem;margin-bottom:4px}',
    '.kb-form input,.kb-form select,.kb-form textarea{width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.85rem;background:var(--surface,#fff);box-sizing:border-box}',
    '.kb-form textarea{min-height:120px;resize:vertical}',
    /* buttons */
    '.kb-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;border:none;transition:all .15s}',
    '.kb-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.kb-btn-primary:hover{opacity:.9}',
    '.kb-btn-secondary{background:var(--bg-alt,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#e2e8f0)}',
    '.kb-btn-secondary:hover{background:var(--border,#e2e8f0)}',
    /* accordion */
    '.kb-accordion{border:1px solid var(--border,#e2e8f0);border-radius:10px;margin-bottom:8px;overflow:hidden}',
    '.kb-accordion-head{padding:12px 16px;cursor:pointer;font-weight:700;font-size:.88rem;background:var(--bg-alt,#f1f5f9);display:flex;justify-content:space-between;align-items:center}',
    '.kb-accordion-body{display:none;padding:12px 16px}',
    '.kb-accordion.open .kb-accordion-body{display:block}',
    /* kpi row */
    '.kb-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}',
    '.kb-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;text-align:center}',
    '.kb-kpi-val{font-size:1.6rem;font-weight:800;color:var(--brand,#1565c0)}',
    '.kb-kpi-label{font-size:.75rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    '.kb-leaderboard{max-width:500px}',
    '.kb-lb-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border,#e2e8f0);font-size:.85rem}',
    '.kb-lb-rank{font-weight:800;color:var(--brand,#1565c0);width:24px;text-align:center}',
    '.kb-lb-name{flex:1;font-weight:600}',
    '.kb-lb-count{font-weight:700;color:var(--text-secondary,#64748b)}',
    '.kb-bar-chart{display:flex;flex-direction:column;gap:6px;max-width:600px;margin-top:12px}',
    '.kb-bar-row{display:flex;align-items:center;gap:8px;font-size:.8rem}',
    '.kb-bar-label{width:120px;text-align:right;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.kb-bar{height:22px;border-radius:4px;background:var(--brand,#1565c0);min-width:4px;transition:width .3s}',
    '.kb-bar-val{font-weight:700;font-size:.75rem;color:var(--text-secondary,#64748b)}',
    '.kb-empty{text-align:center;padding:40px 20px;color:var(--text-secondary,#64748b);font-size:.9rem}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ============================================================= */
/*  Tab renderers                                                 */
/* ============================================================= */

/* -- Browse Tips ---------------------------------------------- */
function _renderBrowseTab(){
  var html='<div class="kb-search">';
  html+='<input type="text" placeholder="'+_esc(_t('Tim kiem...','Search...'))+'" data-bind="search" value="'+_esc(state.search)+'">';
  html+='<select data-filter="category"><option value="all">'+_esc(_t('Tat ca danh muc','All Categories'))+'</option>';
  Object.keys(CATEGORIES).forEach(function(k){ var c=CATEGORIES[k]; html+='<option value="'+k+'"'+(state.filters.category===k?' selected':'')+'>'+_esc(_t(c.vi,c.en))+'</option>'; });
  html+='</select>';
  html+='<input type="text" placeholder="'+_esc(_t('May...','Machine...'))+'" data-filter="machine" value="'+_esc(state.filters.machine)+'" style="max-width:140px">';
  html+='<input type="text" placeholder="'+_esc(_t('Vat lieu...','Material...'))+'" data-filter="material" value="'+_esc(state.filters.material)+'" style="max-width:140px">';
  html+='<input type="text" placeholder="'+_esc(_t('Ma SP...','Part #...'))+'" data-filter="part" value="'+_esc(state.filters.part)+'" style="max-width:120px">';
  html+='</div>';

  var tips = _filteredTips();
  if(!tips.length){
    html+='<div class="kb-empty">'+_t('Khong co tip nao.','No tips found.')+'</div>';
    return html;
  }
  html+='<div class="kb-grid">';
  tips.forEach(function(tip){
    var cat=CATEGORIES[tip.category]||CATEGORIES.setup;
    html+='<div class="kb-card" data-action="select-tip" data-id="'+_esc(tip.id)+'">';
    html+='<div class="kb-card-title">'+_esc(tip.title)+'</div>';
    html+='<div class="kb-card-meta">';
    html+='<span class="kb-badge" style="background:'+cat.bg+';color:'+cat.color+'">'+_esc(_t(cat.vi,cat.en))+'</span>';
    if(tip.machine) html+='<span class="kb-tag">'+_esc(tip.machine)+'</span>';
    if(tip.material) html+='<span class="kb-tag">'+_esc(tip.material)+'</span>';
    html+='</div>';
    html+='<div style="font-size:.82rem;color:var(--text-secondary,#64748b);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+_esc((tip.description||'').substring(0,120))+'</div>';
    html+='<div class="kb-card-footer">';
    html+='<span>'+_esc(tip.author||'---')+' &middot; '+_esc(_fmtDate(tip.created_at))+'</span>';
    html+='<span class="kb-votes"><span class="up">&#9650; '+_esc(tip.votes_up||0)+'</span> <span class="down">&#9660; '+_esc(tip.votes_down||0)+'</span></span>';
    html+='</div></div>';
  });
  html+='</div>';
  return html;
}

function _filteredTips(){
  var list=state.tips.slice();
  var s=state.search.toLowerCase();
  if(s) list=list.filter(function(t){ return (t.title||'').toLowerCase().indexOf(s)>=0||(t.description||'').toLowerCase().indexOf(s)>=0||(t.tags||'').toLowerCase().indexOf(s)>=0; });
  if(state.filters.category&&state.filters.category!=='all') list=list.filter(function(t){ return t.category===state.filters.category; });
  if(state.filters.machine) list=list.filter(function(t){ return (t.machine||'').toLowerCase().indexOf(state.filters.machine.toLowerCase())>=0; });
  if(state.filters.material) list=list.filter(function(t){ return (t.material||'').toLowerCase().indexOf(state.filters.material.toLowerCase())>=0; });
  if(state.filters.part) list=list.filter(function(t){ return (t.part_number||'').toLowerCase().indexOf(state.filters.part.toLowerCase())>=0; });
  return list;
}

/* -- Add Tip -------------------------------------------------- */
function _renderAddTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Chia se kinh nghiem','Share Your Knowledge')+'</h3>';
  html+='<div class="kb-form">';
  html+='<div><label>'+_t('Tieu de','Title')+' *</label><input type="text" id="kb-f-title"></div>';
  html+='<div><label>'+_t('Danh muc','Category')+' *</label><select id="kb-f-category">';
  Object.keys(CATEGORIES).forEach(function(k){ var c=CATEGORIES[k]; html+='<option value="'+k+'">'+_esc(_t(c.vi,c.en))+'</option>'; });
  html+='</select></div>';
  html+='<div><label>'+_t('Mo ta chi tiet','Description')+' *</label><textarea id="kb-f-desc" placeholder="'+_esc(_t('Mo ta kinh nghiem, meo vat, cach lam...','Describe the tip, trick, or best practice...'))+'"></textarea></div>';
  html+='<div><label>'+_t('May (Machine)','Machine')+'</label><input type="text" id="kb-f-machine" placeholder="e.g. DMG-MORI-5X-01"></div>';
  html+='<div><label>'+_t('Vat lieu','Material')+'</label><input type="text" id="kb-f-material" placeholder="e.g. Inconel 718, Ti-6Al-4V"></div>';
  html+='<div><label>'+_t('Ma san pham','Part Number')+'</label><input type="text" id="kb-f-part" placeholder="e.g. HSM-1234"></div>';
  html+='<div><label>'+_t('Tag (cach nhau boi dau phay)','Tags (comma-separated)')+'</label><input type="text" id="kb-f-tags" placeholder="e.g. feeds, speeds, coolant, deburring"></div>';
  html+='<div><label>'+_t('Hinh anh','Photos')+'</label><input type="file" id="kb-f-photos" multiple accept="image/*"></div>';
  html+='<div style="display:flex;gap:8px;margin-top:4px">';
  html+='<button class="kb-btn kb-btn-primary" data-action="submit-tip">'+_t('Gui Tip','Submit Tip')+'</button>';
  html+='<button class="kb-btn kb-btn-secondary" data-action="tab" data-tab="browse">'+_t('Huy','Cancel')+'</button>';
  html+='</div></div>';
  return html;
}

/* -- Tip Detail ----------------------------------------------- */
function _renderDetailTab(){
  var tip=state.selectedTip;
  if(!tip) return '<div class="kb-empty">'+_t('Chua chon tip nao.','No tip selected.')+'</div>';
  var cat=CATEGORIES[tip.category]||CATEGORIES.setup;

  var html='<div class="kb-detail">';
  html+='<div style="margin-bottom:12px"><button class="kb-btn kb-btn-secondary" data-action="tab" data-tab="browse">&larr; '+_t('Quay lai','Back')+'</button></div>';
  html+='<div class="kb-detail-title">'+_esc(tip.title)+'</div>';
  html+='<div class="kb-card-meta" style="margin-bottom:12px">';
  html+='<span class="kb-badge" style="background:'+cat.bg+';color:'+cat.color+'">'+_esc(_t(cat.vi,cat.en))+'</span>';
  if(tip.machine) html+='<span class="kb-tag">'+_esc(tip.machine)+'</span>';
  if(tip.material) html+='<span class="kb-tag">'+_esc(tip.material)+'</span>';
  if(tip.part_number) html+='<span class="kb-tag">'+_esc(tip.part_number)+'</span>';
  html+='</div>';
  html+='<div style="font-size:.82rem;color:var(--text-secondary,#64748b);margin-bottom:12px">';
  html+='<strong>'+_esc(tip.author||'Unknown')+'</strong> &middot; '+_esc(_fmtDate(tip.created_at));
  html+='</div>';
  html+='<div class="kb-detail-body">'+_esc(tip.description)+'</div>';

  /* photos */
  if(tip.photos && tip.photos.length){
    html+='<div class="kb-photos">';
    tip.photos.forEach(function(p){ html+='<img class="kb-photo" src="'+_esc(p.url||p)+'" alt="'+_esc(p.name||'photo')+'">'; });
    html+='</div>';
  }

  /* tags */
  if(tip.tags){
    html+='<div style="margin-bottom:14px">';
    tip.tags.split(',').forEach(function(tag){ tag=tag.trim(); if(tag) html+='<span class="kb-tag" style="margin-right:4px">'+_esc(tag)+'</span>'; });
    html+='</div>';
  }

  /* linked items */
  if(tip.linked_setup_sheets && tip.linked_setup_sheets.length){
    html+='<div style="margin-bottom:10px;font-size:.85rem"><strong>'+_t('Setup sheets lien quan:','Linked Setup Sheets:')+'</strong> ';
    tip.linked_setup_sheets.forEach(function(ls,i){ html+=(i?', ':'')+_esc(ls.name||ls); });
    html+='</div>';
  }
  if(tip.linked_work_orders && tip.linked_work_orders.length){
    html+='<div style="margin-bottom:10px;font-size:.85rem"><strong>'+_t('WO lien quan:','Linked Work Orders:')+'</strong> ';
    tip.linked_work_orders.forEach(function(wo,i){ html+=(i?', ':'')+_esc(wo.number||wo); });
    html+='</div>';
  }

  /* vote buttons */
  html+='<div style="display:flex;gap:10px;margin-bottom:20px">';
  html+='<span class="kb-vote-btn'+(tip.user_vote==='up'?' voted':'')+'" data-action="vote" data-vote="up" data-id="'+_esc(tip.id)+'">&#9650; '+_t('Huu ich','Helpful')+' ('+_esc(tip.votes_up||0)+')</span>';
  html+='<span class="kb-vote-btn'+(tip.user_vote==='down'?' voted':'')+'" data-action="vote" data-vote="down" data-id="'+_esc(tip.id)+'">&#9660; '+_t('Khong huu ich','Not Helpful')+' ('+_esc(tip.votes_down||0)+')</span>';
  html+='</div>';

  /* comments */
  html+='<div class="kb-comments"><h4 style="margin:0 0 10px">'+_t('Binh luan','Comments')+' ('+state.comments.length+')</h4>';
  state.comments.forEach(function(c){
    html+='<div class="kb-comment"><span class="kb-comment-author">'+_esc(c.author)+'</span><span class="kb-comment-date">'+_esc(_fmtDate(c.created_at))+'</span>';
    html+='<div class="kb-comment-body">'+_esc(c.body)+'</div></div>';
  });
  html+='<div style="display:flex;gap:8px;margin-top:10px"><input type="text" id="kb-comment-input" placeholder="'+_esc(_t('Viet binh luan...','Add a comment...'))+'" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.85rem">';
  html+='<button class="kb-btn kb-btn-primary" data-action="add-comment">'+_t('Gui','Post')+'</button></div>';
  html+='</div></div>';
  return html;
}

/* -- Machine Knowledge ---------------------------------------- */
function _renderMachineTab(){
  var grouped={};
  state.tips.forEach(function(t){
    var m=t.machine||_t('Khong xac dinh','Unassigned');
    if(!grouped[m]) grouped[m]=[];
    grouped[m].push(t);
  });
  var machines=Object.keys(grouped).sort();
  if(!machines.length) return '<div class="kb-empty">'+_t('Chua co tip nao.','No tips available.')+'</div>';

  var html='<h3 style="margin:0 0 16px">'+_t('Kien thuc theo may','Knowledge by Machine')+'</h3>';
  machines.forEach(function(m){
    var tips=grouped[m];
    html+='<div class="kb-accordion" data-action="toggle-accordion">';
    html+='<div class="kb-accordion-head">'+_esc(m)+' <span style="font-weight:400;font-size:.8rem;color:var(--text-secondary,#64748b)">('+tips.length+' tips)</span></div>';
    html+='<div class="kb-accordion-body">';
    tips.forEach(function(tip){
      var cat=CATEGORIES[tip.category]||CATEGORIES.setup;
      html+='<div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);cursor:pointer" data-action="select-tip" data-id="'+_esc(tip.id)+'">';
      html+='<span class="kb-badge" style="background:'+cat.bg+';color:'+cat.color+';margin-right:6px">'+_esc(_t(cat.vi,cat.en))+'</span>';
      html+='<strong>'+_esc(tip.title)+'</strong>';
      html+='<span style="margin-left:8px;font-size:.75rem;color:var(--text-secondary,#64748b)">'+_esc(tip.author)+' &middot; &#9650;'+_esc(tip.votes_up||0)+'</span>';
      html+='</div>';
    });
    html+='</div></div>';
  });
  return html;
}

/* -- Analytics ------------------------------------------------ */
function _renderAnalyticsTab(){
  var a=state.analytics||{};
  var html='<h3 style="margin:0 0 16px">'+_t('Thong ke kien thuc','Knowledge Analytics')+'</h3>';
  html+='<div class="kb-kpi-row">';
  html+='<div class="kb-kpi"><div class="kb-kpi-val">'+_esc(a.total_tips||state.tips.length)+'</div><div class="kb-kpi-label">'+_t('Tong tip','Total Tips')+'</div></div>';
  html+='<div class="kb-kpi"><div class="kb-kpi-val">'+_esc(a.tips_this_month||0)+'</div><div class="kb-kpi-label">'+_t('Thang nay','This Month')+'</div></div>';
  html+='<div class="kb-kpi"><div class="kb-kpi-val">'+_esc(a.total_votes||0)+'</div><div class="kb-kpi-label">'+_t('Luot danh gia','Total Votes')+'</div></div>';
  html+='<div class="kb-kpi"><div class="kb-kpi-val">'+_esc(a.unique_contributors||0)+'</div><div class="kb-kpi-label">'+_t('Nguoi dong gop','Contributors')+'</div></div>';
  html+='</div>';

  /* leaderboard */
  var contributors=a.top_contributors||[];
  if(contributors.length){
    html+='<h4 style="margin:16px 0 8px">'+_t('Nguoi dong gop hang dau','Top Contributors')+'</h4>';
    html+='<div class="kb-leaderboard">';
    contributors.forEach(function(c,i){
      html+='<div class="kb-lb-row"><span class="kb-lb-rank">'+(i+1)+'</span><span class="kb-lb-name">'+_esc(c.name)+'</span><span class="kb-lb-count">'+_esc(c.count)+' tips</span></div>';
    });
    html+='</div>';
  }

  /* most referenced machines */
  var machines=a.top_machines||[];
  if(machines.length){
    html+='<h4 style="margin:20px 0 8px">'+_t('May duoc tham chieu nhieu','Most Referenced Machines')+'</h4>';
    var maxM=Math.max.apply(null,machines.map(function(m){return m.count||0;}))||1;
    html+='<div class="kb-bar-chart">';
    machines.forEach(function(m){
      var pct=Math.round(((m.count||0)/maxM)*100);
      html+='<div class="kb-bar-row"><span class="kb-bar-label">'+_esc(m.name)+'</span><div class="kb-bar" style="width:'+pct+'%"></div><span class="kb-bar-val">'+_esc(m.count)+'</span></div>';
    });
    html+='</div>';
  }

  /* top categories */
  var cats=a.top_categories||[];
  if(cats.length){
    html+='<h4 style="margin:20px 0 8px">'+_t('Danh muc pho bien','Top Categories')+'</h4>';
    var maxC=Math.max.apply(null,cats.map(function(c){return c.count||0;}))||1;
    html+='<div class="kb-bar-chart">';
    cats.forEach(function(c){
      var cat=CATEGORIES[c.key]||CATEGORIES.setup;
      var pct=Math.round(((c.count||0)/maxC)*100);
      html+='<div class="kb-bar-row"><span class="kb-bar-label">'+_esc(_t(cat.vi,cat.en))+'</span><div class="kb-bar" style="width:'+pct+'%;background:'+cat.color+'"></div><span class="kb-bar-val">'+_esc(c.count)+'</span></div>';
    });
    html+='</div>';
  }

  return html;
}

/* ============================================================= */
/*  Data loading                                                  */
/* ============================================================= */
function _loadTips(){
  state.loading=true; _paint();
  _api('knowledge_list', state.filters).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.tips=r.tips||[];
      state.analytics=r.analytics||null;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadTipDetail(id){
  state.loading=true; _paint();
  _api('knowledge_detail', {id:id}).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.selectedTip=r.tip||null;
      state.comments=r.comments||[];
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

/* ============================================================= */
/*  Main paint                                                    */
/* ============================================================= */
function _paint(){
  if(!state.container) return;
  var html='<div class="kb">';
  html+='<div class="kb-tabs">';
  TABS.forEach(function(tab){
    if(tab.key==='detail'&&!state.selectedTip) return;
    html+='<div class="kb-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="kb-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'browse':    html+=_renderBrowseTab(); break;
      case 'add':       html+=_renderAddTab(); break;
      case 'detail':    html+=_renderDetailTab(); break;
      case 'machine':   html+=_renderMachineTab(); break;
      case 'analytics': html+=_renderAnalyticsTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;
}

/* ============================================================= */
/*  Event delegation                                              */
/* ============================================================= */
function _bind(){
  state.container.addEventListener('click', function(e){
    var t=e.target.closest('[data-action]');
    if(!t) return;
    var action=t.getAttribute('data-action');
    switch(action){
      case 'tab':
        state.activeTab=t.getAttribute('data-tab'); _paint(); break;
      case 'select-tip':
        _loadTipDetail(t.getAttribute('data-id'));
        state.activeTab='detail';
        break;
      case 'submit-tip':
        var title=(state.container.querySelector('#kb-f-title')||{}).value||'';
        var desc=(state.container.querySelector('#kb-f-desc')||{}).value||'';
        if(!title||!desc){ _toast(_t('Vui long nhap tieu de va mo ta','Please enter title and description'),'warning'); break; }
        var payload={
          title:title,
          category:(state.container.querySelector('#kb-f-category')||{}).value||'setup',
          description:desc,
          machine:(state.container.querySelector('#kb-f-machine')||{}).value||'',
          material:(state.container.querySelector('#kb-f-material')||{}).value||'',
          part_number:(state.container.querySelector('#kb-f-part')||{}).value||'',
          tags:(state.container.querySelector('#kb-f-tags')||{}).value||''
        };
        _api('knowledge_create', payload).then(function(r){
          if(r&&r.ok){ _toast(_t('Da tao tip!','Tip created!'),'success'); state.activeTab='browse'; _loadTips(); }
          else { _toast(_t('Loi tao tip','Error creating tip'),'error'); }
        });
        break;
      case 'vote':
        var voteType=t.getAttribute('data-vote');
        var tipId=t.getAttribute('data-id');
        _api('knowledge_vote',{id:tipId, vote:voteType}).then(function(r){
          if(r&&r.ok){ _toast(_t('Da danh gia','Voted'),'success'); _loadTipDetail(tipId); }
          else { _toast(_t('Loi','Error'),'error'); }
        });
        break;
      case 'add-comment':
        var body=(state.container.querySelector('#kb-comment-input')||{}).value||'';
        if(!body.trim()){ _toast(_t('Nhap binh luan','Enter a comment'),'warning'); break; }
        _api('knowledge_comment',{id:state.selectedTip.id, body:body}).then(function(r){
          if(r&&r.ok){ _toast(_t('Da binh luan','Comment posted'),'success'); _loadTipDetail(state.selectedTip.id); }
          else { _toast(_t('Loi','Error'),'error'); }
        });
        break;
      case 'toggle-accordion':
        var acc=t.closest('.kb-accordion');
        if(acc) acc.classList.toggle('open');
        break;
    }
  });

  state.container.addEventListener('input', function(e){
    if(e.target.getAttribute('data-bind')==='search'){ state.search=e.target.value; _paint(); return; }
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; _paint(); }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; _paint(); }
  });
}

/* ============================================================= */
/*  Entry point                                                   */
/* ============================================================= */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='browse';
  state.selectedTip=null;
  state.search='';
  state.filters={machine:'',material:'',part:'',tag:'',category:'all'};
  _paint();
  _bind();
  _loadTips();
}

window._renderKnowledgeBase = render;

})();
