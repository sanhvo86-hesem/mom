// RENDER WORKFLOW UI
// ═══════════════════════════════════════════════════

function showRevisionTypeDialog(code, majorNext, minorNext){
  return new Promise(function(resolve){
    var existing=document.getElementById('mm-rev-dialog-overlay');
    if(existing) existing.remove();
    var overlay=document.createElement('div');
    overlay.id='mm-rev-dialog-overlay';
    overlay.className='mm-rev-overlay';
    var title=lang==='en'?('New revision for '+code):('Phiên bản chỉnh sửa mới cho '+code);
    var descMajor=lang==='en'?'Restructured / breaking change':'Thay đổi lớn / cấu trúc lại';
    var descMinor=lang==='en'?'Small edits / corrections':'Sửa nhỏ / bổ sung';
    var cancelLbl=lang==='en'?'Cancel':'Hủy';
    overlay.innerHTML='<div class="mm-rev-dialog"><div class="mm-rev-dialog-header"><h4>'+title+'</h4></div><div class="mm-rev-dialog-body"><button class="mm-rev-btn mm-btn-major" id="mm-rev-major"><span class="mm-rev-btn-label">Major</span><span class="mm-rev-btn-ver">v'+majorNext+'</span><span class="mm-rev-btn-desc">'+descMajor+'</span></button><button class="mm-rev-btn mm-btn-minor" id="mm-rev-minor"><span class="mm-rev-btn-label">Minor</span><span class="mm-rev-btn-ver">v'+minorNext+'</span><span class="mm-rev-btn-desc">'+descMinor+'</span></button></div><div class="mm-rev-dialog-footer"><button id="mm-rev-cancel">'+cancelLbl+'</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#mm-rev-major').onclick=function(){overlay.remove();resolve('major');};
    overlay.querySelector('#mm-rev-minor').onclick=function(){overlay.remove();resolve('minor');};
    overlay.querySelector('#mm-rev-cancel').onclick=function(){overlay.remove();resolve(null);};
    overlay.addEventListener('click',function(e){if(e.target===overlay){overlay.remove();resolve(null);}});
  });
}

function renderWorkflowPanel(doc){
  if(!doc) return;

  // NOTE: Workflow action buttons have been moved to the Doc Viewer header
  // (Edit/Save Draft/Submit/Cancel/Approve/Reject). The workflow panel is now
  // hidden to reduce clutter, matching the updated UI screenshots.
  const panel=document.getElementById('wf-panel');
  if(panel){
    panel.style.display='none';
    panel.innerHTML='';
  }

  // Keep watermark for in_review / obsolete states
  const status=getDocStatus(doc);
  const wm=document.getElementById('wf-watermark');
  if(status==='in_review'){wm.textContent='IN REVIEW';wm.style.display='block';}
  else if(status==='obsolete'){wm.textContent='OBSOLETE';wm.style.display='block';}
  else{wm.style.display='none';}

  // Ensure header reflects the latest state/actions
  updateDocViewerHeader(doc);
}

async function startNewRevision(code){
  const doc = DOCS.find(d=>d.code===code);
  if(!doc) return;
  if(!currentUser){ showToast('\u26A0 Not logged in'); return; }

  
  if(lang==='en'){
    showToast(lang==='en'?'↩ Switch to Vietnamese to start editing':'↩ Vui lòng chuyển về tiếng Việt để bắt đầu chỉnh sửa');
    try{ setLang('vi'); }catch(e){}
    return;
  }
// Decide target revision at the start (so Draft/InReview/Approve all use the SAME revision)
  const st = getDocState(doc.code) || {};
  const baseRev = String((typeof getDocRevision==='function' ? getDocRevision(doc) : '') || st.released_revision || st.revision || doc.rev || '0');
  const hasRelease = (st.has_release === false) ? false : true; // default true if unknown
  let updateType = 'minor';

  if(hasRelease){
    const parts = baseRev.split('.');
    const maj = parseInt(parts[0]||'0',10) || 0;
    const min = parseInt(parts[1]||'0',10) || 0;
    const minorNext = `${maj}.${min+1}`;
    const majorNext = `${maj+1}.0`;

    const choice = await showRevisionTypeDialog(doc.code, majorNext, minorNext);
    if(choice === null) return;
    updateType = choice;
  }

  try{
    const res = await controlPlaneDocumentAuthoringRequest('start-new-revision', {code: doc.code, base_path: doc.path, updateType});
    if(res && res.ok){
      SERVER_DOC_STATE[doc.code] = res.state;
      if(res.versions) setDocVersions(doc.code, res.versions);
      showToast('✅ '+T('wf_newrev_ok'));
      await openDocPreview(doc.code);
      startEdit(doc.code);
    }else{
      showToast('\u26A0 '+((res&&res.error)?res.error:'server_error'));
    }
  }catch(err){
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}


async function deleteDraft(code){
  const doc=DOCS.find(d=>d.code===code);
  if(!doc) return;
  const msg=lang==='en'
    ?'Delete draft for '+doc.code+'? This removes all unsaved edits, review data, and resets to original.'
    :'Xóa bản nháp '+doc.code+'? Tất cả chỉnh sửa, dữ liệu xem xét sẽ bị xóa và tài liệu trở về bản gốc.';
  if(!confirm(msg)) return;
  // Clear local unsaved edits
  try{
    if(typeof setEditedHtml==='function') setEditedHtml(code, '');
    else sessionStorage.removeItem('doc_html_'+code);
  }catch(e){}
  try{ if(typeof edClearRecoveryDraft==='function') edClearRecoveryDraft(code); }catch(e){}

  // Delete server-backed draft/review files inside /archive (ISO-style)
  try{
    const res = await controlPlaneDocumentAuthoringRequest('delete-drafts', {code, base_path: doc.path});
    if(res && res.ok){
      if(res.versions) setDocVersions(code, res.versions);
      if(res.state){
        const nextState = Object.assign({}, res.state);
        const hasWorkingVersion = Array.isArray(res.versions) && res.versions.some(function(v){
          return v && (v.status==='draft' || v.status==='in_review' || v.status==='pending_approval');
        });
        if(!hasWorkingVersion){
          delete nextState.lastEdit;
          delete nextState.submittedBy;
          delete nextState.submittedDate;
          delete nextState.submittedUpdateType;
          delete nextState.rejectedBy;
          delete nextState.rejectedDate;
          delete nextState.checked_out_by;
        }
        setDocState(code, nextState);
      }
    }
  }catch(e){}

  showToast(lang==='en'?'🗑 Draft deleted (archive cleaned)':'🗑 Đã xóa nháp (đã dọn thư mục archive)');
  openDoc(code);
}

async function clearDraftHistory(code){
  const doc=DOCS.find(d=>d.code===code);
  if(!doc) return;
  let versions=getDocVersions(code);
  versions=(versions||[]).map(v=>{ if(v&&v.status==='review') v.status='in_review'; if(v&&v.status==='pending') v.status='pending_approval'; return v; });

  const drafts=versions.filter(v=>v && (v.status==='draft' || v.status==='in_review' || v.status==='pending_approval'));
  if(drafts.length===0){
    showToast(lang==='en'?'No draft history to clear':'Không có lịch sử nháp để xóa');
    return;
  }
  const msg=lang==='en'
    ?'Clear '+drafts.length+' draft/review version(s) from history of '+doc.code+'?'
    :'Xóa '+drafts.length+' bản nháp/đang xem xét trong lịch sử của '+doc.code+'?';
  if(!confirm(msg)) return;

  try{
    const res = await controlPlaneDocumentAuthoringRequest('delete-drafts', {code, base_path: doc.path});
    if(res && res.ok){
      if(res.versions) setDocVersions(code, res.versions);
      if(res.state){
        const nextState = Object.assign({}, res.state);
        const hasWorkingVersion = Array.isArray(res.versions) && res.versions.some(function(v){
          return v && (v.status==='draft' || v.status==='in_review' || v.status==='pending_approval');
        });
        if(!hasWorkingVersion){
          delete nextState.lastEdit;
          delete nextState.submittedBy;
          delete nextState.submittedDate;
          delete nextState.submittedUpdateType;
          delete nextState.rejectedBy;
          delete nextState.rejectedDate;
          delete nextState.checked_out_by;
        }
        setDocState(code, nextState);
      }
    }
  }catch(e){}

  showToast(lang==='en'?'🗑 Draft history cleared (archive cleaned)':'🗑 Đã xóa lịch sử nháp (đã dọn archive)');
  renderVersionHistory(doc);
}

function showFilteredDocs(filter){
  var list=[];
  var title='';
  var VDOCS = getVisibleDocs();
  if(filter==='all'){
    list=VDOCS;
    title=lang==='en'?'All Documents':'Tất cả tài liệu';
  } else if(filter==='approved'){
    list=VDOCS.filter(function(d){
      var status = getDocStatus(d);
      return (typeof isDocRevisionSourceStatus==='function' && isDocRevisionSourceStatus(status)) || status==='approved';
    });
    title=lang==='en'?'Approved Documents':'Tài liệu đã duyệt';
  } else if(filter==='draft'){
    list=VDOCS.filter(function(d){return getDocStatus(d)==='draft';});
    title=lang==='en'?'Draft Documents':'Tài liệu dự thảo';
  } else if(filter==='review'){
    list=VDOCS.filter(function(d){return getDocStatus(d)==='in_review';});
    title=lang==='en'?'In Review':'Đang xem xét';
  } else if(filter==='accessible'){
    list=VDOCS.filter(function(d){return canAccessDoc(d.code);});
    title=lang==='en'?'Accessible Documents':'Tài liệu được phép truy cập';
  } else if(filter==='recent'){
    var thirtyDaysAgo=new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
    var recentEntries=[];
    DOCS.forEach(function(d){
      var versions=getDocVersions(d.code);
      if(!versions||versions.length===0) return;
      versions.forEach(function(v){
        if(v.status==='approved' && v.date){
          var vDate=new Date(v.date.replace(' ','T'));
          if(vDate>=thirtyDaysAgo){
            recentEntries.push({doc:d, version:v.version, date:v.date, user:v.by||v.user||'', updateType:v.updateType||'', submittedBy:v.submittedBy||'', dateObj:vDate});
          }
        }
      });
    });
    recentEntries.sort(function(a,b){return b.dateObj-a.dateObj;});
    title=lang==='en'?'🔄 Recently Updated (Last 30 Days)':'🔄 Cập nhật gần đây (30 ngày)';
    var recentRows=recentEntries.map(function(ru){
      var daysDiff=Math.floor((new Date()-ru.dateObj)/(1000*60*60*24));
      var daysText=daysDiff===0?(lang==='en'?'Today':'Hôm nay'):(daysDiff+(lang==='en'?' days ago':' ngày trước'));
      return '<tr onclick="closeFilterModal();openDoc(\''+ru.doc.code+'\')">'
        +'<td class="wf-filter-code">'+ru.doc.code+'</td>'
        +'<td>'+ru.doc.title+'</td>'
        +'<td><span class="wf-filter-version">'+ru.version+'</span> '+workflowUpdateTypeBadge(ru.updateType,false)+'</td>'
        +'<td>'+ru.date+'</td>'
        +'<td>'+ru.user+(ru.submittedBy?' <span class="wf-filter-meta">(📤 '+ru.submittedBy+')</span>':'')+'</td>'
        +'<td class="wf-filter-time">'+daysText+'</td>'
        +'</tr>';
    }).join('');
    var modal=document.createElement('div');
    modal.id='filter-modal';
    modal.className='wf-filter-overlay';
    var thApproved=lang==='en'?'Approved':'Ngày duyệt';
    var thApprover=lang==='en'?'Approver':'Người duyệt';
    var thTime=lang==='en'?'Time':'Thời gian';
    modal.innerHTML='<div class="wf-filter-modal recent">'
      +'<div class="wf-filter-header">'
      +'<h3 class="wf-filter-title recent">'+title+' <span class="wf-filter-count">'+recentEntries.length+'</span></h3>'
      +'<button class="wf-filter-close" onclick="closeFilterModal()">&times;</button>'
      +'</div>'
      +'<div class="wf-filter-body">'
      +(recentEntries.length===0
        ?'<div class="wf-filter-empty">'+(lang==='en'?'No documents updated in the last 30 days':'Không có tài liệu nào được cập nhật trong 30 ngày qua')+'</div>'
        :'<table class="admin-table wf-filter-table wf-filter-table--recent">'
        +'<thead><tr><th>Code</th><th>'+T('title_label')+'</th><th>Version</th><th>'+thApproved+'</th><th>'+thApprover+'</th><th>'+thTime+'</th></tr></thead>'
        +'<tbody>'+recentRows+'</tbody></table>'
      )
      +'</div></div>';
    modal.onclick=function(ev){if(ev.target===modal)closeFilterModal();};
    document.body.appendChild(modal);
    return;
  }

  var rows=list.map(function(d){
    var cat=CATEGORIES.find(function(c){return c.id===d.cat;});
    var st=getDocStatus(d);
    var rev=getDocRevision(d);
    var state=getDocState(d.code);
    var submitterInfo='';
    if(filter==='review' && state && state.submittedBy){
      var sb=state.submittedBy;
      submitterInfo='<div class="wf-filter-meta">📤 '+sb.name+' · '+sb.date+workflowUpdateTypeBadge(sb.updateType,true)+'</div>';
    }
    if(filter==='approved' && state && state.approvedBy){
      submitterInfo='<div class="wf-filter-meta">✅ '+state.approvedBy.name+' · '+(state.approvedBy.date||state.approvedDate||'')+'</div>';
    }
    return '<tr onclick="closeFilterModal();openDoc(\''+d.code+'\')">'
      +'<td class="wf-filter-code">'+d.code+'</td>'
      +'<td>'+d.title+submitterInfo+'</td>'
      +'<td><span class="wf-cat-dot" style="--wf-cat-color:'+(cat?cat.color:'#999')+'"></span>'+(cat?catLabel(cat):'')+'</td>'
      +'<td><span class="wf-filter-version">v'+rev+'</span></td>'
      +'<td>'+workflowStatusChip(st,'')+'</td>'
      +'</tr>';
  }).join('');
  var modal=document.createElement('div');
  modal.id='filter-modal';
  modal.className='wf-filter-overlay';
  var thVer=lang==='en'?'Version':'Phiên bản';
  var thSt=lang==='en'?'Status':'Trạng thái';
  modal.innerHTML='<div class="wf-filter-modal">'
    +'<div class="wf-filter-header">'
    +'<h3 class="wf-filter-title">'+title+' <span class="wf-filter-count">'+list.length+'</span></h3>'
    +'<button class="wf-filter-close" onclick="closeFilterModal()">&times;</button>'
    +'</div>'
    +'<div class="wf-filter-body">'
    +'<table class="admin-table wf-filter-table">'
    +'<thead><tr><th>Code</th><th>'+T('title_label')+'</th><th>'+T('category_label')+'</th><th>'+thVer+'</th><th>'+thSt+'</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table></div></div>';
  modal.onclick=function(ev){if(ev.target===modal)closeFilterModal();};
  document.body.appendChild(modal);
}
function closeFilterModal(){var m=document.getElementById('filter-modal');if(m)m.remove();}

function clearAllDrafts(){
  if(!isAdmin()) return;
  const msg=lang==='en'
    ?'Clear ALL draft data for ALL documents? This cannot be undone.'
    :'Xóa TẤT CẢ dữ liệu nháp của TẤT CẢ tài liệu? Không thể hoàn tác.';
  if(!confirm(msg)) return;
  let count=0;
  try{
    const keys=Object.keys(sessionStorage);
    keys.forEach(k=>{
      if(k.startsWith('doc_state_')||k.startsWith('doc_html_')||k.startsWith('doc_versions_')){
        sessionStorage.removeItem(k);
        count++;
      }
    });
  }catch(e){}
  showToast(lang==='en'?'🗑 Cleared all draft data ('+count+' entries)':'🗑 Đã xóa tất cả dữ liệu nháp ('+count+' mục)');
  if(currentDoc) openDoc(currentDoc);
}

// ═══════════════════════════════════════════════════
// RETENTION POLICY (ISO 9001 §7.5.3 compliant)
// ═══════════════════════════════════════════════════
const DEFAULT_RETENTION={POL:10,MAN:10,SOP:7,PROC:7,WI:5,FRM:5,ANNEX:7,DEP:5,ORG:5,TRN:5,COMP:5,TMATRIX:5,LABOR:10,DICT:99};

function getRetentionPolicy(){
  try{const s=sessionStorage.getItem('hesem_retention');if(s){const p=JSON.parse(s);if(p&&typeof p==='object')return Object.assign({},DEFAULT_RETENTION,p);}}catch(e){}
  return Object.assign({},DEFAULT_RETENTION);
}
function saveRetentionPolicy(p){try{sessionStorage.setItem('hesem_retention',JSON.stringify(p));}catch(e){}}

function canDeleteVersion(docCode,v){
  if(!v||!v.date||v.status!=='obsolete') return false;
  const doc=DOCS.find(d=>d.code===docCode);
  if(!doc) return false;
  const policy=getRetentionPolicy();
  const yrs=policy[doc.cat]||5;
  const vDate=new Date(v.date.replace(' ','T'));
  if(isNaN(vDate.getTime())) return false;
  return (new Date()-vDate)/(1000*60*60*24*365.25)>=yrs;
}

async function deleteVersion(code,idx){
  const versions=getDocVersions(code);
  if(!versions[idx]) return;
  const doc=DOCS.find(d=>d.code===code);
  if(!doc) return;
  const v=versions[idx];
  if(!confirm((lang==='en'?'Permanently delete version ':'Xóa vĩnh viễn phiên bản ')+v.version+'?')) return;
  try{
    const res = await controlPlaneDocumentAuthoringRequest('delete-version', {code: code, base_path: doc.path, version: v.version});
    if(res && res.ok){
      if(res.versions) setDocVersions(code, res.versions);
      showToast(lang==='en'?'🗑 Version '+v.version+' deleted':'🗑 Đã xóa phiên bản '+v.version);
      renderVersionHistory(doc);
      return;
    }
  }catch(e){}
  showToast(lang==='en'?'Delete failed':'Xóa thất bại');
}

async function bulkDeleteExpired(){
  if(!confirm(lang==='en'?'Permanently delete ALL expired obsolete versions?':'Xóa vĩnh viễn TẤT CẢ phiên bản lỗi thời đã hết hạn?')) return;
  let count=0;
  for(let di=0; di<DOCS.length; di++){
    const d=DOCS[di];
    const versions=(getDocVersions(d.code)||[]).slice();
    // Delete from oldest to newest to keep indexes stable
    for(let i=versions.length-1; i>=0; i--){
      const v=versions[i];
      if(v && canDeleteVersion(d.code,v) && v.version){
        try{
          const res = await controlPlaneDocumentAuthoringRequest('delete-version', {code: d.code, base_path: d.path, version: v.version});
          if(res && res.ok && res.versions){
            setDocVersions(d.code, res.versions);
            count++;
          }
        }catch(e){}
      }
    }
  }
  showToast(lang==='en'?'🗑 Purged '+count+' expired versions':'🗑 Đã xóa '+count+' phiên bản hết hạn');
  renderAdminRetention();
}

function updateRetention(catId,years){
  const p=getRetentionPolicy();p[catId]=years;saveRetentionPolicy(p);markUnsaved();
}

function getISORef(catId){
  return {POL:'§5.2',MAN:'§4.4, §7.5',SOP:'§7.5.3',PROC:'§8.1',WI:'§7.5.3, §8.5',FRM:'§7.5.3',JD:'§5.3, §7.2',ANNEX:'§7.5.3',DEP:'§5.3',ORG:'§5.3',TRN:'§7.2',COMP:'§7.2',TMATRIX:'§7.2',LABOR:'§7.1.2',DICT:'—'}[catId]||'§7.5.3';
}

function getRetentionNote(catId){
  const n={POL:{vi:'Chính sách — lưu lâu dài',en:'Policies — long-term'},MAN:{vi:'Sổ tay QMS gốc',en:'Master QMS manual'},SOP:{vi:'Bắt buộc lưu ISO',en:'Mandatory ISO retention'},PROC:{vi:'Quy trình vận hành',en:'Operating procedures'},WI:{vi:'Cập nhật thường xuyên',en:'Frequently updated'},FRM:{vi:'Hồ sơ hoạt động',en:'Operational records'},JD:{vi:'Mô tả công việc phòng ban',en:'Department job descriptions'},TRN:{vi:'Hồ sơ đào tạo',en:'Training records'},LABOR:{vi:'Quy định pháp luật VN',en:'VN legal requirement'}}[catId];
  return n?(lang==='en'?n.en:n.vi):'';
}




function workflowDocStatusClass(status){
  const raw=String(status||'').toLowerCase();
  if(raw==='review') return 'in_review';
  if(raw==='pending') return 'pending_approval';
  return raw.replace(/[^a-z0-9_-]/g,'_') || 'obsolete';
}

function workflowStatusText(status, extraClass){
  const cls=workflowDocStatusClass(status);
  return `<span class="wf-status-text ${cls}${extraClass?' '+extraClass:''}">${statusLabel(status)}</span>`;
}

function workflowStatusChip(status, extraClass){
  const cls=workflowDocStatusClass(status);
  return `<span class="wf-status-chip ${cls}${extraClass?' '+extraClass:''}">${statusLabel(status)}</span>`;
}

function workflowUpdateTypeBadge(updateType, compact){
  if(!updateType) return '';
  const tone=String(updateType||'').toLowerCase()==='major'?'major':'minor';
  const label=compact ? (tone==='major'?'MAJ':'MIN') : tone.toUpperCase();
  return `<span class="wf-update-badge ${tone}${compact?' compact':''}">${label}</span>`;
}

function toggleVersionHistoryPanel(header){
  if(!header) return;
  const body=header.nextElementSibling;
  const toggle=header.querySelector('.vh-toggle');
  if(!body || !toggle) return;
  const open=body.classList.toggle('open');
  toggle.textContent=(open?'▲ ':'▼ ')+(lang==='en'?'Collapse':'Thu gọn');
}

function renderAdminEffectiveDocs(){
  const el=document.getElementById('admin-content');
  if(!el)return;

  const docs=DOCS.slice();
  const catMap={};
  (CATEGORIES||[]).forEach(c=>{ catMap[c.id]=c; });

  const groups=[];
  (CATEGORIES||[]).forEach(cat=>{
    const gdocs=docs.filter(d=>String(d.cat||d.category||'')===String(cat.id));
    if(gdocs.length) groups.push({cat, docs:gdocs});
  });

  let out=`<div class="admin-title">${lang==='en'?'Effective documents':'Tài liệu hiệu lực'}</div>
  <div class="admin-note admin-note-spaced">${lang==='en'?'Check/uncheck to show/hide documents. Structure mirrors server folders.':'Tick/bỏ tick để hiện/ẩn tài liệu. Cấu trúc phản ánh folder thực tế.'}</div>`;

  groups.forEach(g=>{
    const cat=g.cat;
    const catId=String(cat.id||'OTHER');
    const total=g.docs.length;
    const visCount=g.docs.filter(d=>!isDocHidden(d.code)).length;
    const allVis=(visCount===total);

    out+=`<div class="perm-cat-header">
      <input type="checkbox" ${allVis?'checked':''} onchange="toggleDocGroupHidden('${escapeHtml(catId)}')">
      ${cat.icon||'📁'} ${escapeHtml(cat.label||catId)}
      <span class="perm-cat-count">${visCount}/${total} ${lang==='en'?'visible':'hiện'}</span>
    </div>`;

    const tree = buildDocFolderTree(g.docs, catId);
    if(tree.children && tree.children.length > 0){
      out += renderEffDocTree(tree, catId, 0);
      if(tree.docs && tree.docs.length > 0){
        tree.docs.forEach(d=>{
          const vis=!isDocHidden(d.code);
          out+=`<div class="perm-doc-row"><label>
            <input type="checkbox" ${vis?'checked':''} onchange="toggleDocHidden('${escapeHtml(d.code)}')">
            <span class="doc-code">${d.code}</span> ${d.title.substring(0,50)}${d.title.length>50?'...':''}
          </label></div>`;
        });
      }
    } else {
      g.docs.forEach(d=>{
        const vis=!isDocHidden(d.code);
        out+=`<div class="perm-doc-row"><label>
          <input type="checkbox" ${vis?'checked':''} onchange="toggleDocHidden('${escapeHtml(d.code)}')">
          <span class="doc-code">${d.code}</span> ${d.title.substring(0,55)}${d.title.length>55?'...':''}
        </label></div>`;
      });
    }
  });

  out+=`<div class="admin-save-bar">
    <span class="save-hint">${lang==='en'?'Changes save automatically':'Thay đổi lưu tự động'}</span>
  </div>`;

  el.innerHTML=out;
}
// Recursive tree renderer for effective docs checkboxes
function renderEffDocTree(node, catId, depth){
  let html='';
  if(!node.children) return html;
  node.children.forEach(child=>{
    const allDocs=collectTreeDocs(child);
    if(allDocs.length===0) return;
    const visCount=allDocs.filter(d=>!isDocHidden(d.code)).length;
    const allVis=(visCount===allDocs.length);
    const subPath=child.path.split('/').pop()||child.name;
    html+=`<div class="eff-tree-node ${depth>0?'is-nested':'is-root'}" style="--eff-tree-indent:${depth*12+8}px">
      <div class="eff-tree-header">
        <input type="checkbox" ${allVis?'checked':''} onchange="toggleSubfolderHidden('${escapeHtml(catId)}','${escapeHtml(subPath)}')">
        📁 ${escapeHtml(getSubfolderLabel(subPath))}
        <span class="eff-tree-count">${visCount}/${allDocs.length}</span>
      </div>`;
    if(child.children && child.children.length>0){
      html+=renderEffDocTree(child, catId, depth+1);
    }
    child.docs.forEach(d=>{
      const vis=!isDocHidden(d.code);
      html+=`<div class="perm-doc-row has-indent" style="--doc-indent:${16+depth*8}px"><label>
        <input type="checkbox" ${vis?'checked':''} onchange="toggleDocHidden('${escapeHtml(d.code)}')">
        <span class="doc-code">${d.code}</span> ${d.title.substring(0,45)}${d.title.length>45?'...':''}
      </label></div>`;
    });
    html+=`</div>`;
  });
  return html;
}
async function toggleDocGroupHidden(catId){
  let docsInGroup=[];
  if(String(catId)==='OTHER'){
    const catMap={};
    (CATEGORIES||[]).forEach(c=>{catMap[c.id]=1;});
    docsInGroup = DOCS.filter(d=>!catMap[String(d.cat||d.category||'')]);
  }else{
    docsInGroup = DOCS.filter(d=>String(d.cat||d.category||'')===String(catId));
  }
  if(!docsInGroup.length){ showToast(lang==='en'?'No documents':'Không có tài liệu'); return; }
  const allHidden = docsInGroup.every(d=>isDocHidden(d.code));
  const makeHidden = !allHidden;
  docsInGroup.forEach(d=>{ if(makeHidden) HIDDEN_DOCS.add(d.code); else HIDDEN_DOCS.delete(d.code); });
  await saveDocVisibilityToServer();
  renderAdminEffectiveDocs();
  if(currentPage==='documents'){ renderDocuments(); renderSidebar(); }
  showToast(makeHidden?(lang==='en'?'🙈 Group hidden':'🙈 Đã ẩn nhóm'):(lang==='en'?'👁️ Group visible':'👁️ Đã hiện nhóm'));
}

// Multi-level subfolder hide/show (matches any docs under the given subfolder)
async function toggleSubfolderHidden(catId, subName){
  // Multi-level: match all docs under this subfolder (including nested sub-subfolders)
  const docsInSub = DOCS.filter(d=>{
    if(String(d.cat||'')!==String(catId)) return false;
    const p = d.path || '';
    const parts = p.split('/');
    return parts.some(part => part === subName);
  });
  if(!docsInSub.length){ showToast(lang==='en'?'No documents':'Không có tài liệu'); return; }
  const allHidden = docsInSub.every(d=>isDocHidden(d.code));
  const makeHidden = !allHidden;
  docsInSub.forEach(d=>{ if(makeHidden) HIDDEN_DOCS.add(d.code); else HIDDEN_DOCS.delete(d.code); });
  await saveDocVisibilityToServer();
  renderAdminEffectiveDocs();
  if(currentPage==='documents'){ renderDocuments(); renderSidebar(); }
  const label = getSubfolderLabel(subName);
  showToast(makeHidden?(lang==='en'?`🙈 ${label} hidden`:`🙈 Đã ẩn ${label}`):(lang==='en'?`👁️ ${label} visible`:`👁️ Đã hiện ${label}`));
}

async function toggleDocHidden(code){
  try{
    const c = String(code||'').trim();
    if(!c) return;
    if(!HIDDEN_DOCS) HIDDEN_DOCS = new Set();

    if(HIDDEN_DOCS.has(c)) HIDDEN_DOCS.delete(c);
    else HIDDEN_DOCS.add(c);

    const res = await saveDocVisibilityToServer();
    if(res && res.ok){
      HIDDEN_DOCS = new Set(Array.isArray(res.hidden)?res.hidden:[]);
      showToast(lang==='en'?'✅ Updated':'✅ Đã cập nhật');
      // Update UI lists
      renderSidebar();
      if(currentPage==='documents') renderDocuments();
      if(currentPage==='admin') renderAdmin();
    }else{
      showToast(lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server');
    }
  }catch(e){
    console.error(e);
    showToast(lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server');
  }
}

async function refreshAdminEffectiveDocs(){
  await loadDocVisibilityFromServer();
  renderAdminEffectiveDocs();
}

function renderAdminRetention(){
  const el=document.getElementById('admin-content');
  const policy=getRetentionPolicy();
  const cats=CATEGORIES.filter(c=>DOCS.some(d=>d.cat===c.id));
  let totalDeletable=0;
  DOCS.forEach(d=>{getDocVersions(d.code).forEach(v=>{if(canDeleteVersion(d.code,v))totalDeletable++;});});
  const summaryClass=totalDeletable>0?'retention-summary is-warning':'retention-summary';

  el.innerHTML=`
    <div class="retention-intro">
      <div class="retention-title">📋 ${lang==='en'?'Document Retention Policy':'Chính sách lưu giữ tài liệu'}</div>
      <div class="retention-copy">
        ${lang==='en'
          ?'Configure retention period per document type. Obsolete versions can only be deleted after the configured number of years. Aligned with documented-information control and retention requirements.'
          :'Cấu hình thời gian lưu giữ theo loại tài liệu. Phiên bản lỗi thời chỉ có thể xóa sau số năm quy định. Phù hợp yêu cầu kiểm soát và lưu giữ thông tin dạng văn bản.'}
      </div>
    </div>
    <table class="admin-table">
      <thead><tr>
        <th></th>
        <th>${lang==='en'?'Document Type':'Loại tài liệu'}</th>
        <th class="ta-center">#</th>
        <th class="ta-center">${lang==='en'?'Retention (years)':'Lưu giữ (năm)'}</th>
        <th class="ta-center">ISO</th>
        <th>${lang==='en'?'Note':'Ghi chú'}</th>
      </tr></thead>
      <tbody>
        ${cats.map(cat=>{
          const dc=DOCS.filter(d=>d.cat===cat.id).length;
          const y=policy[cat.id]||5;
          return `<tr>
            <td>${cat.icon}</td>
            <td><b>${catLabel(cat)}</b></td>
            <td class="ta-center">${dc}</td>
            <td class="ta-center">
              <div class="retention-slider" style="--retention-accent:${cat.color}">
                <input class="retention-range" type="range" min="1" max="20" value="${y}"
                  oninput="this.nextElementSibling.textContent=this.value+' '+(lang==='en'?'yrs':'năm')"
                  onchange="updateRetention('${cat.id}',+this.value)">
                <span class="retention-value">${y} ${lang==='en'?'yrs':'năm'}</span>
              </div>
            </td>
            <td class="ta-center retention-iso">${getISORef(cat.id)}</td>
            <td class="retention-note">${getRetentionNote(cat.id)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="${summaryClass}">
      <span class="retention-summary-icon">${totalDeletable>0?'🗑':'✅'}</span>
      <div class="retention-summary-copy">
        <div class="retention-summary-title">${lang==='en'?'Deletable Versions':'Phiên bản có thể xóa'}: <span class="retention-summary-count">${totalDeletable}</span></div>
        <div class="retention-summary-note">${totalDeletable>0?(lang==='en'?'Obsolete versions past retention period. Delete via DCR record or Purge All below.':'Phiên bản lỗi thời đã quá hạn. Xóa qua Lịch sử phiên bản hoặc Xóa tất cả.'):(lang==='en'?'No versions eligible for deletion.':'Không có phiên bản nào đủ điều kiện xóa.')}</div>
      </div>
      ${totalDeletable>0?'<button class="btn-admin danger retention-summary-action" onclick="bulkDeleteExpired()">🗑 '+(lang==='en'?'Purge All Expired':'Xóa tất cả hết hạn')+'</button>':''}
    </div>
    <div class="admin-save-bar">
      <span class="save-hint">${adminUnsaved?'<b>⚠ '+(lang==='en'?'Unsaved changes':'Có thay đổi chưa lưu')+'</b>':lang==='en'?'Adjust retention then Save':'Điều chỉnh rồi nhấn Lưu'}</span>
      <button class="btn-admin secondary" onclick="sessionStorage.removeItem('hesem_retention');showToast('Reset OK');renderAdminRetention()">↩ Reset</button>
      <button class="btn-admin primary lg" onclick="adminSaveAll()">💾 ${lang==='en'?'SAVE':'LƯU'}</button>
    </div>`;
}
function renderVersionHistory(doc){
  if(!doc) return;
  const container=document.getElementById('vh-container');
  if(container){
    container.classList.toggle('is-collapsed', !!(typeof docHeaderMetaCollapsed!=='undefined' && docHeaderMetaCollapsed));
  }
  const isWorkbook = (typeof isDownloadOnlyDoc==='function') ? isDownloadOnlyDoc(doc) : false;

  let versions=getDocVersions(doc.code);
  versions=(versions||[]).map(v=>{ if(v&&v.status==='review') v.status='in_review'; if(v&&v.status==='pending') v.status='pending_approval'; return v; });

  container.innerHTML=`
    <div class="vh-panel">
      <div class="vh-header" onclick="toggleVersionHistoryPanel(this)">
        <h4>${T('wf_ver_history')} (${versions.length})</h4>
        <span class="vh-toggle">▼ ${lang==='en'?'Expand':'Mở rộng'}</span>
      </div>
      <div class="vh-body">
        ${(function(){
          var st=getDocState(doc.code)||{};
          var summaryHtml='';
          var hasEdited=!!getEditedHtml(doc.code);
          var hasWorkingVersion=(typeof docHasWorkingVersion==='function') ? docHasWorkingVersion(doc.code) : false;
          var hasDraftArtifacts=hasEdited || hasWorkingVersion;
          if(st.lastEdit && st.lastEdit.by && hasDraftArtifacts){
            summaryHtml+='<div class="vh-summary-line">✏️ '+(lang==='en'?'Last editor':'Người chỉnh sửa cuối')+': <b>'+st.lastEdit.by+'</b>'+(st.lastEdit.role?' — '+st.lastEdit.role:'')+(st.lastEdit.date?' · '+st.lastEdit.date:'')+'</div>';
          }
          if(st.submittedBy && st.submittedBy.name){
            summaryHtml+='<div class="vh-summary-line submitted">📤 '+(lang==='en'?'Last review submission':'Gửi xem xét cuối cùng')+': <b>'+st.submittedBy.name+'</b>'+(st.submittedBy.date?' · '+st.submittedBy.date:'')+workflowUpdateTypeBadge(st.submittedBy.updateType,false)+'</div>';
          }
          return summaryHtml;
        })()}
        ${versions.length===0
          ?'<div class="vh-empty">'+T('wf_no_history')+'</div>'
          :versions.map((v,i)=>`
            <div class="vh-entry ${isCurrentVersionEntry(doc,v)?'vh-current':''} ${versionHasAccess(doc,v)?'vh-clickable':''}" ${versionHasAccess(doc,v)?'onclick="openVersionPreview(\''+doc.code+'\','+i+')"':''}>
              <div class="vh-dot ${v.status}"></div>
              <div class="vh-info">
                <span class="ver">${v.version}</span>
                ${workflowStatusText(v.status,'')}
                ${workflowUpdateTypeBadge(v.updateType,false)}
                ${isCurrentVersionEntry(doc,v)?'<span class="vh-current-pill">'+T('wf_current')+'</span>':''}
                ${versionHasAccess(doc,v)?'<span class="vh-access-hint" title="'+(lang==='en'?(isWorkbook?'Click to download':'Click to view'):(isWorkbook?'Nhấn để tải':'Nhấn để xem'))+'">'+(isWorkbook?'⬇':'👁')+' '+(lang==='en'?(isWorkbook?'Download':'View'):(isWorkbook?'Tải':'Xem'))+'</span>':''}
                ${v.approvedBy
                  ? ''
                  : '<div class="date">'+v.date+'</div><div class="who">'+(v.by||v.user||'')+((v.by||v.user)&&v.role?' — '+v.role:'')+'</div>'}
                ${v.submittedBy?'<div class="vh-meta-line link">📤 '+(lang==='en'?'Submitted by':'Người gởi')+': '+v.submittedBy+(v.submittedDate?' · '+v.submittedDate:'')+'</div>':''}
                ${v.lastEditBy?'<div class="vh-meta-line">✏️ '+(lang==='en'?'Last editor':'Người chỉnh sửa cuối')+': '+v.lastEditBy+(v.lastEditRole?' — '+v.lastEditRole:'')+(v.lastEditDate?' · '+v.lastEditDate:'')+'</div>':''}
                ${v.approvedBy?'<div class="vh-meta-line success">✅ '+(lang==='en'?'Approved by':'Người duyệt')+': '+v.approvedBy+(v.approvedDate?' · '+v.approvedDate:'')+'</div>':''}
                ${v.note?'<div class="note">"'+v.note+'"</div>':''}
              </div>
              ${!isWorkbook && i>0 && versionHasAccess(doc,v) && canEdit({code:doc.code})?'<button class="vh-restore" onclick="event.stopPropagation();restoreVersion(\''+doc.code+'\','+i+')">'+T('wf_restore')+'</button>':''}
              ${canDeleteVersion(doc.code,v)&&isAdmin()?'<button class="vh-restore danger" onclick="event.stopPropagation();deleteVersion(\''+doc.code+'\','+i+')" title="'+(lang==='en'?'Retention period exceeded':'Hết hạn lưu giữ')+'">🗑 '+(lang==='en'?'Delete':'Xóa')+'</button>':''}
            </div>
          `).join('')
        }
        ${(function(){
          var st=getDocState(doc.code)||{};
          var hasEdited=!!getEditedHtml(doc.code);
          var docSt=getDocStatus(doc);
          var workingVersionCount=versions.filter(function(v){
            return v && (v.status==='draft' || v.status==='in_review' || v.status==='pending_approval');
          }).length;
          var hasWorkingVersion=(typeof docHasWorkingVersion==='function') ? docHasWorkingVersion(doc.code) : (workingVersionCount>0);
          if(!(workingVersionCount>0 || (docSt==='draft' && (hasEdited || (st.lastEdit && hasWorkingVersion))))) return '';

          var btnClear = workingVersionCount>0
            ? '<button class="vh-footer-btn" onclick="clearDraftHistory(\''+doc.code+'\')">🧹 '+(lang==='en'?'Clear all drafts':'Xóa tất cả nháp')+'</button>'
            : '';
          var btnDel = (docSt==='draft' && (hasEdited || (st.lastEdit && hasWorkingVersion)))
            ? '<button class="vh-footer-btn" onclick="deleteDraft(\''+doc.code+'\')" title="'+(lang==='en'?'Delete draft & restore original':'Xóa nháp & khôi phục bản gốc')+'">'+T('delete_draft_btn')+'</button>'
            : '';

          if(!btnClear && !btnDel) return '';
          return '<div class="vh-footer-actions">'+btnDel+btnClear+'</div>';
        })()}
      </div>
    </div>
  `;
  if(typeof syncDocViewerDetailVisibility==='function'){
    syncDocViewerDetailVisibility();
  }
}
function openVersionPreview(code, idx){
  try{ document.querySelectorAll('.vp-overlay').forEach(el=>el.remove()); }catch(e){}

  const versions=getDocVersions(code);
  const v=versions[idx];
  const doc=DOCS.find(d=>d.code===code);
  const accessUrl=(typeof getVersionLocaleAccessUrl==='function')
    ? getVersionLocaleAccessUrl(doc,v)
    : getVersionAccessUrl(doc,v);
  if(!v || !accessUrl){
    if(lang==='en'){
      showToast(lang==='en'
        ? 'English version history preview is available only for the current published locale artifact'
        : 'Lịch sử phiên bản tiếng Anh chỉ khả dụng cho artifact locale hiện hành đã phát hành');
    }
    return;
  }
  const isWorkbook = (typeof isDownloadOnlyDoc==='function') ? isDownloadOnlyDoc(doc) : false;

  const overlay=document.createElement('div');
  overlay.className='vp-overlay';
  overlay.innerHTML=isWorkbook ? `
    <div class="vp-modal" style="max-width:720px">
      <div class="vp-header">
        <div>
          <h4>${doc?doc.code:code} — ${v.version} <span style="color:${statusColor(v.status)};font-size:11px">${statusLabel(v.status)}</span></h4>
          <div class="vp-meta">${v.date}${(v.by||v.user)?' · '+(v.by||v.user):''}${v.role?' · '+v.role:''}${v.note?' · "'+v.note+'"':''}</div>
        </div>
        <div class="vp-actions">
          <button class="vp-open" onclick='event.stopPropagation();triggerDownloadUrl(${JSON.stringify(accessUrl)})'>⬇ ${lang==='en'?'Download version':'Tải phiên bản'}</button>
          <button class="vp-close" onclick="event.stopPropagation();var o=this.closest('.vp-overlay'); if(o) o.remove();">✕</button>
        </div>
      </div>
      <div class="vp-body" style="padding:22px;background:var(--bg-surface-alt,#f8fafc)">
        <div style="background:var(--bg-surface,#fff);border:1px solid var(--border);border-radius:16px;padding:20px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">${lang==='en'?'Controlled workbook version':'Phiên bản workbook được kiểm soát'}</div>
          <div style="font-size:26px;font-weight:800;color:var(--text-primary);margin-bottom:6px">${v.version}</div>
          <div style="font-size:14px;color:var(--text-secondary);line-height:1.6">
            ${lang==='en'
              ?'This Excel version is stored under controlled release history. Use the button above to download the exact staged or archived workbook.'
              :'Phiên bản Excel này được lưu trong lịch sử phát hành có kiểm soát. Dùng nút phía trên để tải đúng workbook đã được stage hoặc archive.'}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:18px">
            <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--bg-surface,#fff)"><b style="display:block;font-size:11px;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:4px">${lang==='en'?'Status':'Trạng thái'}</b><span>${statusLabel(v.status)}</span></div>
            <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--bg-surface,#fff)"><b style="display:block;font-size:11px;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:4px">${lang==='en'?'Updated by':'Cập nhật bởi'}</b><span>${v.by||v.user||'—'}</span></div>
            <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--bg-surface,#fff)"><b style="display:block;font-size:11px;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:4px">${lang==='en'?'When':'Thời điểm'}</b><span>${v.date||'—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  ` : `
    <div class="vp-modal">
      <div class="vp-header">
        <div>
          <h4>${doc?doc.code:code} — ${v.version} <span style="color:${statusColor(v.status)};font-size:11px">${statusLabel(v.status)}</span></h4>
          <div class="vp-meta">${v.date}${(v.by||v.user)?' · '+(v.by||v.user):''}${v.role?' · '+v.role:''}${v.note?' · "'+v.note+'"':''}</div>
        </div>
        <div class="vp-actions">
          <button class="vp-open" onclick="event.stopPropagation();window.open('${accessUrl}${accessUrl.indexOf('?')>=0?'&':'?'}t=${Date.now()}','_blank')">↗ ${lang==='en'?'Open in new tab':'Mở tab mới'}</button>
          <button class="vp-close" onclick="event.stopPropagation();var o=this.closest('.vp-overlay'); if(o) o.remove();">✕</button>
        </div>
      </div>
      <div class="vp-body" style="padding:0">
        <iframe src="${accessUrl}${accessUrl.indexOf('?')>=0?'&':'?'}t=${Date.now()}" style="width:100%;height:75vh;border:0"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if(isWorkbook){
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
    return;
  }
  // Sync locale metadata for the preview iframe when the loaded artifact supports it.
  try{
    const fr=overlay.querySelector('iframe');
    if(fr){
      fr.addEventListener('load', ()=>{
        try{
          if(fr.contentDocument && typeof repairBrokenDocStyleArtifacts==='function') repairBrokenDocStyleArtifacts(fr.contentDocument);
                if(typeof scheduleIframeDocumentLanguageSync==='function') scheduleIframeDocumentLanguageSync(fr, lang);
                else if(typeof syncIframeDocumentLanguage==='function') syncIframeDocumentLanguage(fr, lang);
                else if(fr.contentWindow) fr.contentWindow.postMessage({type:'setLang',lang:lang},new URL(fr.getAttribute('src') || window.location.href, window.location.href).origin);
        }catch(_e){}
      });
      setTimeout(()=>{
        try{
          if(fr.contentDocument && typeof repairBrokenDocStyleArtifacts==='function') repairBrokenDocStyleArtifacts(fr.contentDocument);
                if(typeof scheduleIframeDocumentLanguageSync==='function') scheduleIframeDocumentLanguageSync(fr, lang);
                else if(typeof syncIframeDocumentLanguage==='function') syncIframeDocumentLanguage(fr, lang);
                else if(fr.contentWindow) fr.contentWindow.postMessage({type:'setLang',lang:lang},new URL(fr.getAttribute('src') || window.location.href, window.location.href).origin);
        }catch(_e){}
      }, 200);
    }
  }catch(e){}
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
}

// ═══════════════════════════════════════════════════
