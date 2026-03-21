// RENDER WORKFLOW UI
// ═══════════════════════════════════════════════════
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
  const baseRev = String(st.revision || doc.rev || '0');
  const hasRelease = (st.has_release === false) ? false : true; // default true if unknown
  let updateType = 'minor';

  if(hasRelease){
    const parts = baseRev.split('.');
    const maj = parseInt(parts[0]||'0',10) || 0;
    const min = parseInt(parts[1]||'0',10) || 0;
    const minorNext = `${maj}.${min+1}`;
    const majorNext = `${maj+1}.0`;

    const msg = (lang==='en'
      ? `Start a new revision for ${doc.code}\n\nOK = MAJOR (v${majorNext})\nCancel = MINOR (v${minorNext})`
      : `Bắt đầu phiên bản chỉnh sửa mới cho ${doc.code}\n\nOK = MAJOR (v${majorNext})\nCancel = MINOR (v${minorNext})`);
    const isMajor = confirm(msg);
    updateType = isMajor ? 'major' : 'minor';
  }

  try{
    const res = await apiCall('doc_start_new_revision', {code: doc.code, base_path: doc.path, updateType});
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
  try{ sessionStorage.removeItem('doc_html_'+code); }catch(e){}

  // Delete server-backed draft/review files inside /archive (ISO-style)
  try{
    const res = await apiCall('doc_delete_drafts', {code, base_path: doc.path});
    if(res && res.ok){
      if(res.state) setDocState(code, res.state);
      if(res.versions) setDocVersions(code, res.versions);
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
    const res = await apiCall('doc_delete_drafts', {code, base_path: doc.path});
    if(res && res.ok){
      if(res.state) setDocState(code, res.state);
      if(res.versions) setDocVersions(code, res.versions);
    }
  }catch(e){}

  showToast(lang==='en'?'🗑 Draft history cleared (archive cleaned)':'🗑 Đã xóa lịch sử nháp (đã dọn archive)');
  renderVersionHistory(doc);
}

function showFilteredDocs(filter){
  // Build filtered list
  var list=[];
  var title='';
  var VDOCS = getVisibleDocs();
  if(filter==='all'){
    list=VDOCS;
    title=lang==='en'?'All Documents':'Tất cả tài liệu';
  } else if(filter==='approved'){
    list=VDOCS.filter(function(d){return getDocStatus(d)==='approved';});
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
    // Recently updated (approved within last 30 days)
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
            recentEntries.push({doc:d, version:v.version, date:v.date, user:v.user, updateType:v.updateType||'', submittedBy:v.submittedBy||'', dateObj:vDate});
          }
        }
      });
    });
    recentEntries.sort(function(a,b){return b.dateObj-a.dateObj;});
    // Build recent-specific rows
    title=lang==='en'?'🔄 Recently Updated (Last 30 Days)':'🔄 Cập nhật gần đây (30 ngày)';
    var recentRows=recentEntries.map(function(ru){
      var cat=CATEGORIES.find(function(c){return c.id===ru.doc.cat;});
      var daysDiff=Math.floor((new Date()-ru.dateObj)/(1000*60*60*24));
      var daysText=daysDiff===0?(lang==='en'?'Today':'Hôm nay'):(daysDiff+(lang==='en'?' days ago':' ngày trước'));
      var typeBadge=ru.updateType?('<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;'+(ru.updateType==='major'?'background:#fee2e2;color:#dc2626':'background:#dcfce7;color:#16a34a')+'">'+(ru.updateType==='major'?'MAJOR':'MINOR')+'</span>'):'';
      return '<tr style="cursor:pointer" onclick="closeFilterModal();openDoc(\''+ru.doc.code+'\')">'
        +'<td style="font-weight:600;color:#1565c0;white-space:nowrap">'+ru.doc.code+'</td>'
        +'<td>'+ru.doc.title+'</td>'
        +'<td><span style="font-family:var(--mono);font-weight:700;color:#059669">'+ru.version+'</span> '+typeBadge+'</td>'
        +'<td>'+ru.date+'</td>'
        +'<td>'+ru.user+(ru.submittedBy?' <span style="color:#94a3b8;font-size:10px">(📤 '+ru.submittedBy+')</span>':'')+'</td>'
        +'<td style="color:#6b7280;font-size:10px;font-weight:600">'+daysText+'</td>'
        +'</tr>';
    }).join('');
    var modal=document.createElement('div');
    modal.id='filter-modal';
    modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);z-index:99999;display:flex;align-items:center;justify-content:center';
    var thApproved=lang==='en'?'Approved':'Ngày duyệt';
    var thApprover=lang==='en'?'Approver':'Người duyệt';
    var thTime=lang==='en'?'Time':'Thời gian';
    modal.innerHTML='<div style="background:#fff;border-radius:12px;width:90%;max-width:950px;max-height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2)">'
      +'<div style="padding:20px 24px;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center">'
      +'<h3 style="font-size:16px;font-weight:700;color:#059669">'+title+' <span style="font-size:12px;font-weight:400;color:#868e96;background:#d1fae5;padding:2px 10px;border-radius:20px">'+recentEntries.length+'</span></h3>'
      +'<button onclick="closeFilterModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#adb5bd">&times;</button>'
      +'</div>'
      +'<div style="overflow-y:auto;max-height:calc(80vh - 70px);padding:0">'
      +(recentEntries.length===0
        ?'<div style="padding:40px;text-align:center;color:#94a3b8;font-size:13px">'+(lang==='en'?'No documents updated in the last 30 days':'Không có tài liệu nào được cập nhật trong 30 ngày qua')+'</div>'
        :'<table style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<thead><tr style="background:#f0fdf4"><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;border-bottom:2px solid #d1fae5">Code</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;border-bottom:2px solid #d1fae5">'+T('title_label')+'</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;border-bottom:2px solid #d1fae5">Version</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;border-bottom:2px solid #d1fae5">'+thApproved+'</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;border-bottom:2px solid #d1fae5">'+thApprover+'</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;border-bottom:2px solid #d1fae5">'+thTime+'</th></tr></thead>'
        +'<tbody>'+recentRows+'</tbody></table>'
      )
      +'</div></div>';
    modal.onclick=function(ev){if(ev.target===modal)closeFilterModal();};
    document.body.appendChild(modal);
    return; // Early return for recent - custom table
  }

  // Standard filter modal (approved, draft, review, accessible, all)
  var rows=list.map(function(d){
    var cat=CATEGORIES.find(function(c){return c.id===d.cat;});
    var st=getDocStatus(d);
    var rev=getDocRevision(d);
    var state=getDocState(d.code);
    var submitterInfo='';
    if(filter==='review' && state && state.submittedBy){
      var sb=state.submittedBy;
      var utBadge=sb.updateType?(' <span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;'+(sb.updateType==='major'?'background:#fee2e2;color:#dc2626':'background:#dcfce7;color:#16a34a')+'">'+(sb.updateType==='major'?'MAJ':'MIN')+'</span>'):'';
      submitterInfo='<div style="font-size:10px;color:#64748b;margin-top:1px">📤 '+sb.name+' · '+sb.date+utBadge+'</div>';
    }
    if(filter==='approved' && state && state.approvedBy){
      submitterInfo='<div style="font-size:10px;color:#64748b;margin-top:1px">✅ '+state.approvedBy.name+' · '+(state.approvedBy.date||state.approvedDate||'')+'</div>';
    }
    return '<tr style="cursor:pointer" onclick="closeFilterModal();openDoc(\''+d.code+'\')">'
      +'<td style="font-weight:600;color:#1565c0;white-space:nowrap">'+d.code+'</td>'
      +'<td>'+d.title+submitterInfo+'</td>'
      +'<td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+(cat?cat.color:'#999')+';margin-right:4px"></span>'+(cat?catLabel(cat):'')+'</td>'
      +'<td style="white-space:nowrap"><span style="color:'+statusColor(st)+';font-weight:600">v'+rev+'</span></td>'
      +'<td><span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;background:'+statusColor(st)+'15;color:'+statusColor(st)+'">'+statusLabel(st)+'</span></td>'
      +'</tr>';
  }).join('');
  var modal=document.createElement('div');
  modal.id='filter-modal';
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);z-index:99999;display:flex;align-items:center;justify-content:center';
  var thVer=lang==='en'?'Version':'Phiên bản';
  var thSt=lang==='en'?'Status':'Trạng thái';
  modal.innerHTML='<div style="background:#fff;border-radius:12px;width:90%;max-width:900px;max-height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2)">'
    +'<div style="padding:20px 24px;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center">'
    +'<h3 style="font-size:16px;font-weight:700;color:#0c2d48">'+title+' <span style="font-size:12px;font-weight:400;color:#868e96;background:#f1f3f5;padding:2px 10px;border-radius:20px">'+list.length+'</span></h3>'
    +'<button onclick="closeFilterModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#adb5bd">&times;</button>'
    +'</div>'
    +'<div style="overflow-y:auto;max-height:calc(80vh - 70px);padding:0">'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="background:#f8f9fa"><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#0c2d48;text-transform:uppercase;border-bottom:2px solid #dee2e6">Code</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#0c2d48;text-transform:uppercase;border-bottom:2px solid #dee2e6">'+T('title_label')+'</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#0c2d48;text-transform:uppercase;border-bottom:2px solid #dee2e6">'+T('category_label')+'</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#0c2d48;text-transform:uppercase;border-bottom:2px solid #dee2e6">'+thVer+'</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:#0c2d48;text-transform:uppercase;border-bottom:2px solid #dee2e6">'+thSt+'</th></tr></thead>'
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
  const v=versions[idx];
  if(!confirm((lang==='en'?'Permanently delete version ':'Xóa vĩnh viễn phiên bản ')+v.version+'?')) return;
  try{
    const res = await apiCall('doc_delete_version', {code: code, base_path: doc.path, id: v.id});
    if(res && res.ok){
      if(res.versions) setDocVersions(code, res.versions);
      showToast(lang==='en'?'🗑 Version '+v.version+' deleted':'🗑 Đã xóa phiên bản '+v.version);
      const doc=DOCS.find(d=>d.code===code);
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
      if(v && canDeleteVersion(d.code,v) && v.id){
        try{
          const res = await apiCall('doc_delete_version', {code: d.code, base_path: d.path, id: v.id});
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
  <div class="admin-note" style="margin-bottom:12px">${lang==='en'?'Check/uncheck to show/hide documents. Structure mirrors server folders.':'Tick/bỏ tick để hiện/ẩn tài liệu. Cấu trúc phản ánh folder thực tế.'}</div>`;

  groups.forEach(g=>{
    const cat=g.cat;
    const catId=String(cat.id||'OTHER');
    const total=g.docs.length;
    const visCount=g.docs.filter(d=>!isDocHidden(d.code)).length;
    const allVis=(visCount===total);

    out+=`<div class="perm-cat-header" style="margin-top:12px">
      <input type="checkbox" ${allVis?'checked':''} onchange="toggleDocGroupHidden('${escapeHtml(catId)}')">
      ${cat.icon||'📁'} ${escapeHtml(cat.label||catId)}
      <span style="font-weight:400;font-size:10px;color:var(--text-3)">${visCount}/${total} ${lang==='en'?'visible':'hiện'}</span>
    </div>`;

    // Tree-based subfolder grouping
    const tree = buildDocFolderTree(g.docs, catId);
    if(tree.children && tree.children.length > 0){
      out += renderEffDocTree(tree, catId, 0);
      // Root docs
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
    html+=`<div style="margin:2px 0 2px ${depth*12+8}px;padding:3px 8px;background:${depth>0?'var(--bg-1)':'var(--bg-2)'};border-radius:8px;border:1px solid var(--border-light,#e2e8f0)">
      <div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px;font-weight:600;color:#475569">
        <input type="checkbox" ${allVis?'checked':''} onchange="toggleSubfolderHidden('${escapeHtml(catId)}','${escapeHtml(subPath)}')" style="margin:0">
        📁 ${escapeHtml(getSubfolderLabel(subPath))}
        <span style="font-weight:400;font-size:10px;color:var(--text-3);margin-left:auto">${visCount}/${allDocs.length}</span>
      </div>`;
    if(child.children && child.children.length>0){
      html+=renderEffDocTree(child, catId, depth+1);
    }
    child.docs.forEach(d=>{
      const vis=!isDocHidden(d.code);
      html+=`<div class="perm-doc-row" style="padding-left:${16+depth*8}px"><label>
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
  
  el.innerHTML=`
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px">📋 ${lang==='en'?'Document Retention Policy':'Chính sách lưu giữ tài liệu'}</div>
      <div style="font-size:11px;color:var(--text-3);line-height:1.6;margin-bottom:16px">
        ${lang==='en'
          ?'Configure retention period per document type. Obsolete versions can only be deleted after the configured number of years. Aligned with documented-information control and retention requirements.'
          :'Cấu hình thời gian lưu giữ theo loại tài liệu. Phiên bản lỗi thời chỉ có thể xóa sau số năm quy định. Phù hợp yêu cầu kiểm soát và lưu giữ thông tin dạng văn bản.'}
      </div>
    </div>
    <table class="admin-table">
      <thead><tr>
        <th></th>
        <th>${lang==='en'?'Document Type':'Loại tài liệu'}</th>
        <th style="text-align:center">#</th>
        <th style="text-align:center;min-width:160px">${lang==='en'?'Retention (years)':'Lưu giữ (năm)'}</th>
        <th style="text-align:center">ISO</th>
        <th>${lang==='en'?'Note':'Ghi chú'}</th>
      </tr></thead>
      <tbody>
        ${cats.map(cat=>{
          const dc=DOCS.filter(d=>d.cat===cat.id).length;
          const y=policy[cat.id]||5;
          return `<tr>
            <td>${cat.icon}</td>
            <td><b>${catLabel(cat)}</b></td>
            <td style="text-align:center">${dc}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;justify-content:center;gap:6px">
                <input type="range" min="1" max="20" value="${y}" style="width:80px;accent-color:${cat.color}"
                  oninput="this.nextElementSibling.textContent=this.value+' '+(lang==='en'?'yrs':'năm')"
                  onchange="updateRetention('${cat.id}',+this.value)">
                <span style="font-size:12px;font-weight:700;min-width:50px;color:${cat.color}">${y} ${lang==='en'?'yrs':'năm'}</span>
              </div>
            </td>
            <td style="text-align:center;font-size:10px;color:var(--text-3)">${getISORef(cat.id)}</td>
            <td style="font-size:10px;color:var(--text-3)">${getRetentionNote(cat.id)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="margin-top:16px;padding:12px 16px;background:${totalDeletable>0?'#fefce8':'#f0fdf4'};border:1px solid ${totalDeletable>0?'#fde68a':'#bbf7d0'};border-radius:8px;display:flex;align-items:center;gap:12px">
      <span style="font-size:24px">${totalDeletable>0?'🗑':'✅'}</span>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700;color:${totalDeletable>0?'#92400e':'#166534'}">${lang==='en'?'Deletable Versions':'Phiên bản có thể xóa'}: <span style="font-size:16px">${totalDeletable}</span></div>
        <div style="font-size:10px;color:${totalDeletable>0?'#a16207':'#15803d'};margin-top:2px">${totalDeletable>0?(lang==='en'?'Obsolete versions past retention period. Delete via DCR record or Purge All below.':'Phiên bản lỗi thời đã quá hạn. Xóa qua Lịch sử phiên bản hoặc Xóa tất cả.'):(lang==='en'?'No versions eligible for deletion.':'Không có phiên bản nào đủ điều kiện xóa.')}</div>
      </div>
      ${totalDeletable>0?'<button class="btn-admin danger" onclick="bulkDeleteExpired()" style="flex-shrink:0">🗑 '+(lang==='en'?'Purge All Expired':'Xóa tất cả hết hạn')+'</button>':''}
    </div>
    <div class="admin-save-bar">
      <span class="save-hint">${adminUnsaved?'<b>⚠ '+(lang==='en'?'Unsaved changes':'Có thay đổi chưa lưu')+'</b>':lang==='en'?'Adjust retention then Save':'Điều chỉnh rồi nhấn Lưu'}</span>
      <button class="btn-admin secondary" onclick="sessionStorage.removeItem('hesem_retention');showToast('Reset OK');renderAdminRetention()">↩ Reset</button>
      <button class="btn-admin primary" onclick="adminSaveAll()" style="padding:8px 24px;font-size:13px">💾 ${lang==='en'?'SAVE':'LƯU'}</button>
    </div>`;
}

function renderVersionHistory(doc){
  if(!doc) return;
  const container=document.getElementById('vh-container');

  // Load + normalize history
  let versions=getDocVersions(doc.code);
  versions=(versions||[]).map(v=>{ if(v&&v.status==='review') v.status='in_review'; if(v&&v.status==='pending') v.status='pending_approval'; return v; });

  // NOTE: DCR record is server-backed (manifest in /archive). We do not
  // auto-clean entries on the client to avoid desync with folder state.

  container.innerHTML=`
    <div class="vh-panel">
      <div class="vh-header" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.vh-toggle').textContent=this.nextElementSibling.classList.contains('open')?'▲ '+(lang==='en'?'Collapse':'Thu gọn'):'▼ '+(lang==='en'?'Expand':'Mở rộng')">
        <h4>${T('wf_ver_history')} (${versions.length})</h4>
        <span class="vh-toggle">▼ ${lang==='en'?'Expand':'Mở rộng'}</span>
      </div>
      <div class="vh-body">
        ${(function(){
          var st=getDocState(doc.code)||{};
          var summaryHtml='';
          // Show last editor info
          if(st.lastEdit && st.lastEdit.by){
            summaryHtml+='<div style="padding:6px 12px;font-size:10px;color:#475569;border-bottom:1px solid #e2e8f0;background:#f8fafc">✏️ '+(lang==='en'?'Last editor':'Người chỉnh sửa cuối')+': <b>'+st.lastEdit.by+'</b>'+(st.lastEdit.role?' — '+st.lastEdit.role:'')+(st.lastEdit.date?' · '+st.lastEdit.date:'')+'</div>';
          }
          // Show last review submission
          if(st.submittedBy && st.submittedBy.name){
            summaryHtml+='<div style="padding:6px 12px;font-size:10px;color:#0369a1;border-bottom:1px solid #e2e8f0;background:#f0f9ff">📤 '+(lang==='en'?'Last review submission':'Gửi xem xét cuối cùng')+': <b>'+st.submittedBy.name+'</b>'+(st.submittedBy.date?' · '+st.submittedBy.date:'')+(st.submittedBy.updateType?(' <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;'+(st.submittedBy.updateType==='major'?'background:#fee2e2;color:#dc2626':'background:#dcfce7;color:#16a34a')+'">'+(st.submittedBy.updateType==='major'?'MAJOR':'MINOR')+'</span>'):'')+'</div>';
          }
          return summaryHtml;
        })()}
        ${versions.length===0
          ?'<div style="padding:16px;text-align:center;font-size:11px;color:#94a3b8">'+T('wf_no_history')+'</div>'
          :versions.map((v,i)=>`
            <div class="vh-entry ${(v.status==='approved' && v.file===doc.path)?'vh-current':''} ${v.file?'vh-clickable':''}" ${v.file?'onclick="openVersionPreview(\''+doc.code+'\','+i+')"':''}>
              <div class="vh-dot ${v.status}"></div>
              <div class="vh-info">
                <span class="ver">${v.version}</span>
                <span style="color:${statusColor(v.status)};font-size:10px;font-weight:600;margin-left:6px">${statusLabel(v.status)}</span>
                ${v.updateType?'<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;'+(v.updateType==='major'?'background:#fee2e2;color:#dc2626':'background:#dcfce7;color:#16a34a')+'">'+(v.updateType==='major'?'MAJOR':'MINOR')+'</span>':''}
                ${(v.status==='approved' && v.file===doc.path)?'<span style="background:#dcfce7;color:#16a34a;font-size:9px;padding:1px 6px;border-radius:8px;margin-left:4px;font-weight:700">'+T('wf_current')+'</span>':''}
                ${v.file?'<span style="font-size:9px;color:#1565c0;margin-left:4px;cursor:pointer" title="'+(lang==='en'?'Click to view':'Nhấn để xem')+'">👁 '+(lang==='en'?'View':'Xem')+'</span>':''}
                <div class="date">${v.date}</div>
                <div class="who">${v.user} — ${v.role}</div>
                ${v.submittedBy?'<div style="font-size:10px;color:#0369a1;margin-top:2px">📤 '+(lang==='en'?'Submitted by':'Gửi bởi')+': '+v.submittedBy+(v.submittedDate?' · '+v.submittedDate:'')+'</div>':''}
                ${v.lastEditBy?'<div style="font-size:10px;color:#475569;margin-top:2px">✏️ '+(lang==='en'?'Last editor':'Người chỉnh sửa cuối')+': '+v.lastEditBy+(v.lastEditRole?' — '+v.lastEditRole:'')+(v.lastEditDate?' · '+v.lastEditDate:'')+'</div>':''}
                ${v.approvedBy?'<div style="font-size:10px;color:#16a34a;margin-top:2px">✅ '+(lang==='en'?'Approved by':'Duyệt bởi')+': '+v.approvedBy+(v.approvedDate?' · '+v.approvedDate:'')+'</div>':''}
                ${v.note?'<div class="note">"'+v.note+'"</div>':''}
              </div>
              ${i>0&&v.file&&canEdit({code:doc.code})?'<button class="vh-restore" onclick="event.stopPropagation();restoreVersion(\''+doc.code+'\','+i+')">'+T('wf_restore')+'</button>':''}
              ${canDeleteVersion(doc.code,v)&&isAdmin()?'<button class="vh-restore" style="color:#dc2626;border-color:#fca5a5" onclick="event.stopPropagation();deleteVersion(\''+doc.code+'\','+i+')" title="'+(lang==='en'?'Retention period exceeded':'Hết hạn lưu giữ')+'">🗑 '+(lang==='en'?'Delete':'Xóa')+'</button>':''}
            </div>
          `).join('')
        }
        ${(function(){
          var st=getDocState(doc.code)||{};
          var hasEdited=!!getEditedHtml(doc.code);
          var docSt=getDocStatus(doc);
          var draftCount=versions.filter(function(v){return v && v.status==='draft';}).length;
          // Show footer if there is draft history OR there is an active draft/edited content
          if(!(draftCount>0 || (docSt==='draft' && (hasEdited||st.lastEdit)))) return '';

          var btnClear = draftCount>0
            ? '<button style="font-size:10px;padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;background:#fff;color:#dc2626;cursor:pointer" onclick="clearDraftHistory(\''+doc.code+'\')">🧹 '+(lang==='en'?'Clear all drafts':'Xóa tất cả nháp')+'</button>'
            : '';
          var btnDel = (docSt==='draft' && (hasEdited||st.lastEdit))
            ? '<button style="font-size:10px;padding:4px 10px;border:1px solid #fecaca;border-radius:6px;background:#fff;color:#dc2626;cursor:pointer" onclick="deleteDraft(\''+doc.code+'\')" title="'+(lang==='en'?'Delete draft & restore original':'Xóa nháp & khôi phục bản gốc')+'">'+T('delete_draft_btn')+'</button>'
            : '';

          if(!btnClear && !btnDel) return '';
          return '<div style="padding:8px 12px;border-top:1px solid #e9ecef;display:flex;gap:8px;align-items:center;justify-content:flex-end">'+btnDel+btnClear+'</div>';
        })()}
      </div>
    </div>
  `;
}

function openVersionPreview(code, idx){
  try{ document.querySelectorAll('.vp-overlay').forEach(el=>el.remove()); }catch(e){}

  const versions=getDocVersions(code);
  const v=versions[idx];
  if(!v||!v.file) return;
  const doc=DOCS.find(d=>d.code===code);

  const overlay=document.createElement('div');
  overlay.className='vp-overlay';
  overlay.innerHTML=`
    <div class="vp-modal">
      <div class="vp-header">
        <div>
          <h4>${doc?doc.code:code} — ${v.version} <span style="color:${statusColor(v.status)};font-size:11px">${statusLabel(v.status)}</span></h4>
          <div class="vp-meta">${v.date} · ${v.user} · ${v.role}${v.note?' · "'+v.note+'"':''}</div>
        </div>
        <div class="vp-actions">
          <button class="vp-open" onclick="event.stopPropagation();window.open('../${v.file}${v.file.indexOf('?')>=0?'&':'?'}t=${Date.now()}','_blank')">↗ ${lang==='en'?'Open in new tab':'Mở tab mới'}</button>
          <button class="vp-close" onclick="event.stopPropagation();var o=this.closest('.vp-overlay'); if(o) o.remove();">✕</button>
        </div>
      </div>
      <div class="vp-body" style="padding:0">
        <iframe src="../${v.file}${v.file.indexOf('?')>=0?'&':'?'}t=${Date.now()}" style="width:100%;height:75vh;border:0"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // Sync language (VI/EN) for the preview iframe
  try{
    const fr=overlay.querySelector('iframe');
    if(fr){
      fr.addEventListener('load', ()=>{
        try{
          if(fr.contentDocument && typeof repairBrokenDocStyleArtifacts==='function') repairBrokenDocStyleArtifacts(fr.contentDocument);
          if(typeof syncIframeDocumentLanguage==='function') syncIframeDocumentLanguage(fr, lang);
          else if(fr.contentWindow) fr.contentWindow.postMessage({type:'setLang',lang:lang},'*');
        }catch(_e){}
      });
      setTimeout(()=>{
        try{
          if(fr.contentDocument && typeof repairBrokenDocStyleArtifacts==='function') repairBrokenDocStyleArtifacts(fr.contentDocument);
          if(typeof syncIframeDocumentLanguage==='function') syncIframeDocumentLanguage(fr, lang);
          else if(fr.contentWindow) fr.contentWindow.postMessage({type:'setLang',lang:lang},'*');
        }catch(_e){}
      }, 200);
    }
  }catch(e){}
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
}

// ═══════════════════════════════════════════════════

