// DOCUMENT WORKFLOW & EDITING ENGINE
// ═══════════════════════════════════════════════════

// States: draft | in_review | pending_approval | approved | obsolete
// Workflow: draft → in_review → approved (version bump) OR → draft (rejected)

let editingDoc = null;  // currently editing doc code
let currentDoc = null;  // currently viewing doc code
let editMode = false;
let originalHtml = '';   // snapshot before edit
// When editing in "doc-shell" mode (full document rendered inside the editor),
// we also need to preserve updates that happen OUTSIDE #docContent (e.g. tables
// inside annex/backmatter blocks). This variable stores the cleaned shell HTML
// (BODY innerHTML) captured at save/submit time so the server export can keep
// those updates too.
let edCleanShellHtml = null;

function getDocState(code){
  try{
    if(SERVER_DOC_STATE && SERVER_DOC_STATE[code]) return SERVER_DOC_STATE[code];
  }catch(e){}
  return null;
}
function setDocState(code, state){
  try{ SERVER_DOC_STATE[code]=state; }catch(e){}
}
function getDocVersions(code){
  try{
    if(SERVER_DOC_VERSIONS && Array.isArray(SERVER_DOC_VERSIONS[code])) return SERVER_DOC_VERSIONS[code];
  }catch(e){}
  return [];
}
function setDocVersions(code, versions){
  try{ SERVER_DOC_VERSIONS[code]=versions; }catch(e){}
}
const ED_SESSION_DRAFT_PREFIX = 'doc_html_';
const ED_RECOVERY_DRAFT_PREFIX = 'doc_recovery_';
const ED_RECOVERY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const ED_RECOVERY_MAX_BYTES = 4.5 * 1024 * 1024; // keep below localStorage quota
let edUnloadGuardBound = false;

function edDraftKey(code){ return ED_SESSION_DRAFT_PREFIX + code; }
function edRecoveryKey(code){ return ED_RECOVERY_DRAFT_PREFIX + code; }
function edMeasureBytes(text){
  var s=String(text==null?'':text);
  try{
    if(typeof Blob!=='undefined') return new Blob([s]).size;
  }catch(e){}
  // UTF-16 fallback estimate
  return s.length * 2;
}
function getEditedHtml(code){
  if(!code) return null;
  try{
    var value=sessionStorage.getItem(edDraftKey(code));
    if(value==null || value==='') return null;
    return value;
  }catch(e){return null;}
}
function setEditedHtml(code, html){
  if(!code) return;
  var safeHtml=String(html==null?'':html);
  try{
    if(safeHtml) sessionStorage.setItem(edDraftKey(code), safeHtml);
    else sessionStorage.removeItem(edDraftKey(code));
  }catch(e){}
  try{
    if(safeHtml) edSetRecoveryDraft(code, safeHtml, edCleanShellHtml);
    else edClearRecoveryDraft(code);
  }catch(e){}
}
function edHasUnsavedChanges(code){
  if(!code) return !!edModified;
  try{
    return !!getEditedHtml(code) || !!edModified;
  }catch(e){
    return !!edModified;
  }
}
function edSetRecoveryDraft(code, html, shellHtml){
  if(!code) return false;
  var safeHtml=String(html==null?'':html);
  if(!safeHtml.trim()){
    edClearRecoveryDraft(code);
    return true;
  }
  var payload={
    v:1,
    ts:Date.now(),
    html:safeHtml
  };
  if(typeof shellHtml==='string' && shellHtml.trim()){
    payload.shell=shellHtml;
  }
  var raw='';
  try{
    raw=JSON.stringify(payload);
  }catch(e){
    return false;
  }
  if(edMeasureBytes(raw)>ED_RECOVERY_MAX_BYTES){
    return false;
  }
  try{
    localStorage.setItem(edRecoveryKey(code), raw);
    return true;
  }catch(e){
    return false;
  }
}
function edGetRecoveryDraft(code){
  if(!code) return null;
  try{
    var raw=localStorage.getItem(edRecoveryKey(code));
    if(!raw) return null;
    var data=JSON.parse(raw);
    if(!data || typeof data.html!=='string' || !data.html.trim()){
      localStorage.removeItem(edRecoveryKey(code));
      return null;
    }
    var ts=Number(data.ts)||0;
    if(ts>0 && (Date.now()-ts)>ED_RECOVERY_MAX_AGE_MS){
      localStorage.removeItem(edRecoveryKey(code));
      return null;
    }
    return {
      html:data.html,
      shell:(typeof data.shell==='string'?data.shell:''),
      ts:ts
    };
  }catch(e){
    return null;
  }
}
function edClearRecoveryDraft(code){
  if(!code) return;
  try{ localStorage.removeItem(edRecoveryKey(code)); }catch(e){}
}
function edFormatRecoveryTime(ts){
  var n=Number(ts)||0;
  if(!n) return '';
  try{
    return new Date(n).toLocaleString(lang==='en'?'en-GB':'vi-VN',{hour12:false});
  }catch(e){
    return '';
  }
}
function edPersistCurrentDraft(){
  if(!editMode || !editingDoc) return;
  var html='';
  try{ html=edCleanHTML(); }catch(e){ html=''; }
  if(!html || !html.trim()) return;
  setEditedHtml(editingDoc, html);
}
function edBindUnloadGuards(){
  if(edUnloadGuardBound) return;
  edUnloadGuardBound=true;
  window.addEventListener('beforeunload',function(e){
    if(!editMode || !editingDoc) return;
    try{ edPersistCurrentDraft(); }catch(_e){}
    var pending=getEditedHtml(editingDoc);
    if(!pending && !edModified) return;
    var msg=(lang==='en')
      ? 'You have unsaved edits. Leave this page anyway?'
      : 'B\u1ea1n c\u00f3 thay \u0111\u1ed5i ch\u01b0a l\u01b0u. V\u1eabn tho\u00e1t trang?';
    e.preventDefault();
    e.returnValue=msg;
    return msg;
  });
  window.addEventListener('pagehide',function(){
    try{ edPersistCurrentDraft(); }catch(e){}
  });
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){
      try{ edPersistCurrentDraft(); }catch(e){}
    }
  });
}
edBindUnloadGuards();
function now(){return new Date().toISOString().slice(0,16).replace('T',' ');}

// Who can do what
function canEdit(doc){
  if(!currentUser || !canAccessDoc(doc.code)) return false;
  const r=ROLES[currentUser.role];
  if(!r) return false;
  const state=getDocState(doc.code);
  const status=state?state.status:'draft';
  if(status==='approved'||status==='in_review'||status==='pending_approval') return false;
  return r.canEditDocs === true;
}
function canReview(doc){
  if(!currentUser) return false;
  const r=ROLES[currentUser.role];
  const state=getDocState(doc.code);
  if(!state||state.status!=='in_review') return false;
  // Reviewer: QA Manager or level <= 1
  return r.approve || currentUser.role==='qa_manager';
}
function canApprove(doc){
  if(!currentUser) return false;
  const r=ROLES[currentUser.role];
  const state=getDocState(doc.code);
  if(!state||state.status!=='in_review') return false;
  return r.approve;
}

function canCreateNewDoc(){
  if(!currentUser) return false;
  const r=ROLES[currentUser.role];
  return !!(r && r.canCreateDocs);
}

function getDocRevision(doc){
  const state=getDocState(doc.code);
  return state ? state.revision : doc.rev;
}

function getDocStatus(doc){
  const state=getDocState(doc.code);
  return state ? state.status : (doc.status || 'draft');
}

function statusLabel(status){
  const map={
    draft:T('wf_draft'),
    in_review:T('wf_in_review'),
    pending_approval:T('wf_pending'),
    approved:T('wf_approved'),
    initial_release:(lang==='en'?'Initial Release':'Phát hành lần đầu'),
    obsolete:T('wf_obsolete')
  };
  return map[status]||status;
}

function statusColor(status){
  const map={
    draft:'#f59e0b',
    in_review:'#3b82f6',
    pending_approval:'#8b5cf6',
    approved:'#16a34a',
    initial_release:'#16a34a',
    obsolete:'#94a3b8'
  };
  return map[status]||'#94a3b8';
}

// ═══════════════════════════════════════════════════
// PROFESSIONAL DOCUMENT EDITOR
// ═══════════════════════════════════════════════════
let edSourceMode = false;
let edZoom = 100;
let edModified = false;
let edAutoSaveTimer = null;

// SVG Icons
const S='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const EI={
  undo:S+'<path d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5"/></svg>',
  redo:S+'<path d="M21 10H11a5 5 0 00-5 5v2M21 10l-5-5M21 10l-5 5"/></svg>',
  bold:'<b style="font-size:15px;font-family:serif">B</b>',
  italic:'<i style="font-size:15px;font-family:serif">I</i>',
  underline:'<u style="font-size:14px">U</u>',
  strike:'<s style="font-size:14px">ab</s>',
  sub:'A<sub style="font-size:9px">2</sub>',
  sup:'A<sup style="font-size:9px">2</sup>',
  alignL:S+'<path d="M3 6h18M3 12h12M3 18h18"/></svg>',
  alignC:S+'<path d="M3 6h18M6 12h12M3 18h18"/></svg>',
  alignR:S+'<path d="M3 6h18M9 12h12M3 18h18"/></svg>',
  alignJ:S+'<path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  ul:S+'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>',
  ol:S+'<path d="M10 6h11M10 12h11M10 18h11"/><text x="2" y="8" fill="currentColor" stroke="none" font-size="8" font-weight="700">1</text><text x="2" y="14" fill="currentColor" stroke="none" font-size="8" font-weight="700">2</text><text x="2" y="20" fill="currentColor" stroke="none" font-size="8" font-weight="700">3</text></svg>',
  indent:S+'<path d="M3 6h18M11 12h10M3 18h18M3 9l4 3-4 3"/></svg>',
  outdent:S+'<path d="M3 6h18M11 12h10M3 18h18M7 9l-4 3 4 3"/></svg>',
  link:S+'<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
  image:S+'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  table:S+'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  hr:S+'<path d="M3 12h18"/></svg>',
  quote:S+'<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
  code:S+'<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>',
  clear:S+'<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
  find:S+'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
  source:S+'<path d="M14 4l-4 16M16 18l2-2-2-2M8 18l-2-2 2-2"/></svg>',
  print:S+'<path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  zoomIn:S+'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>',
  zoomOut:S+'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>',
  fullscreen:S+'<path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
  pilcrow:'<span style="font-size:16px;font-weight:700;font-family:serif;opacity:.7">¶</span>',
  spacing:S+'<path d="M3 6h18M3 12h18M3 18h18M20 6v12"/></svg>',
  pageBreak:S+'<path d="M3 9h2M9 9h2M15 9h2M21 9h0M7 3v6M17 3v6M7 15v6M17 15v6"/></svg>',
  painter:S+'<rect x="12" y="2" width="8" height="6" rx="1.5" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="1.5"/><path d="M14 8v2H8v4H6V9a1 1 0 011-1h7z" fill="currentColor"/><path d="M6 14v5l2-2v-3" fill="currentColor"/></svg>',
  checklist:S+'<path d="M3.5 5.5l2 2 4-4M3.5 14.5l2 2 4-4M13 6h8M13 15h8"/></svg>',
  special:S+'<path d="M4 20h16M12 4v12M8 8l4-4 4 4"/></svg>',
  minus:S+'<path d="M5 12h14"/></svg>'
};

function btn(icon,cmd,title,extra){
  return '<button class="ed-btn" data-cmd="'+cmd+'" onclick="edCmd(this.dataset.cmd)" title="'+title+'"'+(extra||'')+'>'+icon+'</button>';
}

function buildEditorToolbar(){
  // Save selection when user clicks toolbar (before focus moves away from editor)
  setTimeout(()=>{
    const tb = document.getElementById('ed-toolbar');
    if(tb) tb.addEventListener('mousedown', edSaveSelection, true);
  }, 50);
  const tb=document.getElementById('ed-toolbar');
  const v=lang!=='en';
  tb.innerHTML=`
    <div class="ed-toolbar-row">
      ${btn(EI.undo,'undo',v?'Hoàn tác · Ctrl+Z':'Undo · Ctrl+Z')}
      ${btn(EI.redo,'redo',v?'Làm lại · Ctrl+Y':'Redo · Ctrl+Y')}
      <div class="ed-sep"></div>
      ${btn(EI.painter,'_painter',v?'Sao chép định dạng':'Format Painter')}
      ${btn(EI.pilcrow,'_pilcrow',v?'Hiện dấu đoạn ¶':'Show Paragraph Marks')}
      <div class="ed-sep"></div>
      <select class="ed-sel ed-sel-heading" id="ed-heading" onchange="edCmd('formatBlock',this.value);this.selectedIndex=0" title="${v?'Kiểu đoạn':'Style'}">
        <option value="">${v?'¶ Kiểu':'¶ Style'}</option>
        <option value="h1">${v?'Tiêu đề 1':'Heading 1'}</option>
        <option value="h2">${v?'Tiêu đề 2':'Heading 2'}</option>
        <option value="h3">${v?'Tiêu đề 3':'Heading 3'}</option>
        <option value="h4">${v?'Tiêu đề 4':'Heading 4'}</option>
        <option value="p">${v?'Đoạn văn':'Normal'}</option>
        <option value="pre">${v?'Mã nguồn':'Code Block'}</option>
      </select>
      <select class="ed-sel ed-sel-font" id="ed-font" onchange="edApplyFont(this.value)" title="Font" style="width:130px">
        <option value="Arial" style="font-family:Arial">Arial</option>
        <option value="Arial Black" style="font-family:Arial Black">Arial Black</option>
        <option value="Book Antiqua" style="font-family:Book Antiqua,Palatino">Book Antiqua</option>
        <option value="Calibri" style="font-family:Calibri,Segoe UI">Calibri</option>
        <option value="Cambria" style="font-family:Cambria,Georgia">Cambria</option>
        <option value="Comic Sans MS" style="font-family:Comic Sans MS,cursive">Comic Sans MS</option>
        <option value="Consolas" style="font-family:Consolas,monospace">Consolas</option>
        <option value="Courier New" style="font-family:Courier New,monospace">Courier New</option>
        <option value="Georgia" style="font-family:Georgia,serif">Georgia</option>
        <option value="Helvetica" style="font-family:Helvetica,Arial">Helvetica</option>
        <option value="Impact" style="font-family:Impact,sans-serif">Impact</option>
        <option value="Lucida Console" style="font-family:Lucida Console,monospace">Lucida Console</option>
        <option value="Palatino Linotype" style="font-family:Palatino Linotype,serif">Palatino</option>
        <option value="Segoe UI" style="font-family:Segoe UI" selected>Segoe UI</option>
        <option value="Tahoma" style="font-family:Tahoma">Tahoma</option>
        <option value="Times New Roman" style="font-family:Times New Roman,serif">Times New Roman</option>
        <option value="Trebuchet MS" style="font-family:Trebuchet MS">Trebuchet MS</option>
        <option value="Verdana" style="font-family:Verdana">Verdana</option>
      </select>
      <select class="ed-sel ed-sel-size" id="ed-size" onchange="edCmd('fontSize',this.value)" title="${v?'Cỡ chữ':'Size'}">
        <option value="">—</option>
        <option value="1">8</option><option value="2">10</option><option value="3">12</option>
        <option value="4">14</option><option value="5">18</option><option value="6">24</option><option value="7">36</option>
      </select>
      <select class="ed-sel ed-sel-spacing" id="ed-spacing" onchange="edLineSpacing(this.value)" title="${v?'Khoảng cách dòng':'Line Spacing'}">
        <option value="">↕</option>
        <option value="1">1.0</option><option value="1.15">1.15</option><option value="1.5">1.5</option>
        <option value="2">2.0</option><option value="2.5">2.5</option><option value="3">3.0</option>
      </select>
      <div class="ed-sep"></div>
      ${btn(EI.bold,'bold',v?'Đậm · Ctrl+B':'Bold · Ctrl+B')}
      ${btn(EI.italic,'italic',v?'Nghiêng · Ctrl+I':'Italic · Ctrl+I')}
      ${btn(EI.underline,'underline',v?'Gạch chân · Ctrl+U':'Underline · Ctrl+U')}
      ${btn(EI.strike,'strikeThrough',v?'Gạch ngang':'Strikethrough')}
      <div class="ed-cpick" id="ed-cpick-fg">
        <button class="ed-cpick-main" onmousedown="edSaveSelection();event.preventDefault()" onclick="edApplyColor('fg')" title="${v?'Màu chữ':'Text Color'}">
          <span style="font-weight:700;font-size:15px;font-family:serif;color:var(--ed-fg-c,#c00)">A</span>
          <div class="ed-cpick-bar" id="ed-fg-bar" style="background:var(--ed-fg-c,#cc0000)"></div>
        </button>
        <button class="ed-cpick-arrow" onmousedown="edSaveSelection();event.preventDefault()" onclick="edToggleColorDD('fg')" title="${v?'Chọn màu chữ':'Pick text color'}">▾</button>
        <div class="ed-cpick-dd" id="ed-fg-dd"></div>
      </div>
      <div class="ed-cpick" id="ed-cpick-bg">
        <button class="ed-cpick-main" onmousedown="edSaveSelection();event.preventDefault()" onclick="edApplyColor('bg')" title="${v?'Màu nền chữ':'Highlight'}">
          <span style="font-weight:700;font-size:14px;padding:0 3px;border-radius:2px;background:var(--ed-bg-c,#ff0)">A</span>
          <div class="ed-cpick-bar" id="ed-bg-bar" style="background:var(--ed-bg-c,#ffff00)"></div>
        </button>
        <button class="ed-cpick-arrow" onmousedown="edSaveSelection();event.preventDefault()" onclick="edToggleColorDD('bg')" title="${v?'Chọn tô nền':'Pick highlight color'}">▾</button>
        <div class="ed-cpick-dd" id="ed-bg-dd"></div>
      </div>
      ${btn(EI.sup,'superscript',v?'Chỉ số trên':'Superscript')}
      ${btn(EI.sub,'subscript',v?'Chỉ số dưới':'Subscript')}
      <div class="ed-sep"></div>
      ${btn(EI.link,'_link',v?'Liên kết':'Link')}
      ${btn(EI.image,'_image',v?'Hình ảnh':'Image')}

      <div class="ed-sep"></div>
      ${btn(EI.alignL,'justifyLeft',v?'Căn trái':'Left')}
      ${btn(EI.alignC,'justifyCenter',v?'Căn giữa':'Center')}
      ${btn(EI.alignR,'justifyRight',v?'Căn phải':'Right')}
      ${btn(EI.alignJ,'justifyFull',v?'Căn đều':'Justify')}
      <div class="ed-sep"></div>
      <div class="ed-cpick" id="ed-cpick-ul">
        <button class="ed-cpick-main" onclick="edCmd('insertUnorderedList')" title="${v?'Danh sách':'Bullets'}" style="width:28px">${EI.ul}</button>
        <button class="ed-cpick-arrow" onclick="edToggleListDD('ul')" title="${v?'Mở kiểu bullet':'Open bullet styles'}">&#9662;</button>
        <div class="ed-cpick-dd" id="ed-ul-dd"></div>
      </div>
      <div class="ed-cpick" id="ed-cpick-ol">
        <button class="ed-cpick-main" onclick="edCmd('insertOrderedList')" title="${v?'Số thứ tự':'Numbering'}" style="width:28px">${EI.ol}</button>
        <button class="ed-cpick-arrow" onclick="edToggleListDD('ol')" title="${v?'Mở kiểu đánh số':'Open numbering styles'}">&#9662;</button>
        <div class="ed-cpick-dd" id="ed-ol-dd"></div>
      </div>
      ${btn(EI.checklist,'_checklist',v?'Danh sách kiểm':'Checklist')}
      ${btn(EI.indent,'indent',v?'Thụt vào':'Indent')}
      ${btn(EI.outdent,'outdent',v?'Thụt ra':'Outdent')}
      <div class="ed-sep"></div>
      ${btn(EI.table,'_table',v?'Bảng':'Table')}
      ${btn(EI.hr,'insertHorizontalRule',v?'Đường kẻ':'Line')}
      ${btn(EI.quote,'_quote',v?'Trích dẫn':'Quote')}
      ${btn(EI.code,'_code',v?'Mã':'Code')}
      ${btn(EI.pageBreak,'_pageBreak',v?'Ngắt trang':'Page Break')}
      <div class="ed-sep"></div>
      <span style="font-size:8px;color:#94a3b8;font-weight:700;letter-spacing:.3px;padding:0 1px">${v?'CHÈN':'INS'}</span>
      ${btn('<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><text x="4.5" y="11" font-size="8.5" font-weight="700" fill="currentColor" stroke="none">T</text></svg>','_textbox',v?'Hộp văn bản':'Text Box')}
      ${btn('<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="3" width="6" height="6" rx=".5" fill="#60a5fa" stroke="#2563eb" stroke-width=".8"/><circle cx="12" cy="5" r="3" fill="#4ade80" stroke="#16a34a" stroke-width=".8"/><polygon points="11,10 15,15 7,15" fill="#fbbf24" stroke="#d97706" stroke-width=".8"/></svg>','_shape',v?'Hình dạng':'Shapes')}
      ${btn('<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2.5" y="5" width="2.5" height="9" rx=".4" fill="#3b82f6"/><rect x="6.5" y="2" width="2.5" height="12" rx=".4" fill="#22c55e"/><rect x="10.5" y="7" width="2.5" height="7" rx=".4" fill="#f59e0b"/></svg>','_chart',v?'Biểu đồ':'Chart')}
      ${btn('<svg width="16" height="16" viewBox="0 0 16 16"><text x="1" y="13" font-size="13" font-family="serif" font-weight="700" fill="currentColor" stroke="none">\u03A3</text></svg>','_math',v?'Công thức toán':'Math')}
      <div style="position:relative;display:inline-flex;flex-shrink:0">
        ${btn('<svg width="16" height="16" viewBox="0 0 16 16"><text x="2" y="13" font-size="13" fill="currentColor" stroke="none">\u03A9</text></svg>','_special',v?'Ký tự đặc biệt':'Special Chars')}
        <div class="ed-special-panel" id="ed-special-panel"></div>
      </div>
      ${btn('<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2.2" y="3" width="11.6" height="10.6" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M4 1.8v2.4M12 1.8v2.4M2.8 6h10.4" stroke="currentColor" stroke-width="1.1"/><circle cx="8" cy="10" r="1.5" fill="currentColor" stroke="none"/></svg>','_date',v?'Chèn ngày giờ · Alt+Shift+D':'Insert date/time · Alt+Shift+D')}
      <div style="position:relative;display:inline-flex;flex-shrink:0">
        ${btn('<span style="font-size:10px;font-weight:800;letter-spacing:.4px">QMS</span>','_qms',v?'Khối QMS nhanh':'QMS Quick Insert')}
        <div class="ed-special-panel ed-qms-panel" id="ed-qms-panel"></div>
      </div>
      <div class="ed-sep"></div>
      ${btn(EI.clear,'removeFormat',v?'Xóa định dạng':'Clear')}

      ${btn(EI.find,'_find',v?'Tìm / Thay thế (Ctrl+F / Ctrl+H)':'Find / Replace (Ctrl+F / Ctrl+H)')}
      ${btn(EI.source,'_source',v?'HTML':'HTML')}
      <button class="ed-btn" onclick="edDomToggle()" title="${v?'DOM Inspector (bố cục)':'DOM Inspector (layout)'}" style="font-size:11px;font-weight:700;letter-spacing:-.5px">🏗️</button>
      ${btn(EI.print,'_print',v?'In':'Print')}

      <div class="ed-sep"></div>
      ${btn(EI.zoomOut,'_zoomOut',v?'Thu nhỏ':'Zoom out')}
      <span style="font-size:10px;font-weight:600;color:#666;min-width:30px;text-align:center;flex-shrink:0" id="ed-zoom-label">100%</span>
      ${btn(EI.zoomIn,'_zoomIn','+')}
      ${btn(EI.fullscreen,'_fullscreen',v?'Toàn màn hình':'Fullscreen')}
    </div>
  `;
  const area=document.getElementById('editor-area');
  area.removeEventListener('input',edOnInput);
  area.removeEventListener('keydown',edKeyDown);
  area.removeEventListener('mouseup',edUpdateState);
  area.removeEventListener('keyup',edUpdateState);
  area.addEventListener('input',edOnInput);
  area.addEventListener('keydown',edKeyDown);
  area.addEventListener('mouseup',edUpdateState);
  // Named handlers to avoid stacking on repeated buildEditorToolbar calls
  if(!window._edClosePopups){
    window._edClosePopups=function(){document.querySelectorAll('.ed-cpick-dd,.ed-special-panel').forEach(function(d){d.classList.remove('open');});};
  }
  area.removeEventListener('mousedown',window._edClosePopups);
  area.addEventListener('mousedown',window._edClosePopups);
  area.addEventListener('keyup',edUpdateState);
  // Paste handler - clean HTML from Word/web
  if(!window._edPasteHandler){
    window._edPasteHandler=function(e){
      var sel=window.getSelection();
      if(sel.anchorNode){
        var p=sel.anchorNode.parentElement;
        if(p&&(p.closest('pre')||p.closest('code')||p.closest('.ed-sh-text')))return;
      }
      var cb=e.clipboardData;
      if(!cb) return;
      var clipHtml=cb.getData('text/html')||'';
      var clipText=cb.getData('text/plain')||'';
      if(!clipHtml && !clipText) return;
      e.preventDefault();

      if(clipHtml){
        var clean='';
        try{
          clean=_edSanitizeHtmlFragment(clipHtml,{
            forPaste:true,
            stripClasses:true,
            stripIds:true,
            preserveDataAttrs:false
          });
        }catch(_e){
          clean='';
        }
        if(clean && clean.replace(/<[^>]+>/g,'').trim().length>0){
          var okH=edExecCommand('insertHTML',false,clean);
          if(okH!==false){
            try{ edApplyGlobalTablePolicy(edGetContentRoot()||document.getElementById('editor-area'), {force:true, source:'paste-html'}); }catch(_e){}
            edMarkModified();
            edUpdateState();
          }
          return;
        }
      }

      if(clipText){
        var t=String(clipText).replace(/\r\n?/g,'\n');
        var html=_edEscapeHtml(t).replace(/\n/g,'<br>');
        var okT=edExecCommand('insertHTML',false,html);
        if(okT!==false){
          try{ edApplyGlobalTablePolicy(edGetContentRoot()||document.getElementById('editor-area'), {force:true, source:'paste-text'}); }catch(_e){}
          edMarkModified();
          edUpdateState();
        }
      }
    };
  }
  area.removeEventListener('paste',window._edPasteHandler);
  area.addEventListener('paste',window._edPasteHandler);

  // Global deselect handler for shapes/textbox/chart - named
  if(!window._edDeselectAll){
    window._edDeselectAll=function(e){
      if(!e.target.closest('.ed-textbox')){
        document.querySelectorAll('.ed-textbox .ed-tb-handle,.ed-textbox .ed-tb-bar').forEach(function(x){x.remove();});
      }
      if(!e.target.closest('.ed-shape')){
        edDeselectAllShapes();
      }
      if(!e.target.closest('.ed-chart')){
        document.querySelectorAll('.ed-chart .ed-ch-bar,.ed-chart .ed-ch-handle').forEach(function(x){x.remove();});
      }
      if(!e.target.closest('.ed-qms-block,.ed-qms-toolbar')){
        edDeselectAllQmsBlocks();
      }
    };
  }
  area.removeEventListener('click',window._edDeselectAll);
  area.addEventListener('click',window._edDeselectAll);

  // Setup sub-systems only once (they add listeners to area)
  if(!area._edSetupDone){
    area._edSetupDone=true;
    edSetupImageHandlers();
    edSetupTableContext();
    edSetupTableResize();
  }
  edUpdateWordCount();

  // Global document mousedown - only add once
  if(!document._edGlobalDeselect){
    document._edGlobalDeselect=function(e){
      if(e.target.closest('.ed-shape,.ed-textbox,.ed-chart,.ed-qms-block,.ed-qms-toolbar,.ed-sh-bar,.ed-tb-bar,.ed-ch-bar,#ed-color-popup,.ed-cpick-dd,.ed-modal-overlay,.ed-tbl-float-bar'))return;
      if(window._edPendingShapeInsert && !e.target.closest('#editor-area')){
        edClearPendingShapePlacement();
      }
      edDeselectAllShapes();
      edDeselectAllQmsBlocks();
      document.querySelectorAll('.ed-tb-handle,.ed-tb-bar,.ed-ch-handle,.ed-ch-bar').forEach(function(el){el.remove();});
    };
    document.addEventListener('mousedown',document._edGlobalDeselect);
  }
}

let edShowMarks=false;
let edFormatPainter=null;
let edFullscreen=false;


function edApplyFont(font){
  edFocusAndRestore();
  var ok=edExecCommand('fontName',false,font);
  if(ok!==false) edMarkModified();
  edUpdateState();
}
// Standard color palette used for all color pickers
function edColorPalette(onPick,currentColor){
  var colors=[
    '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef','#f3f3f3','#ffffff',
    '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff','#ff00ff',
    '#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc',
    '#dd7e6b','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#a4c2f4','#9fc5e8','#b4a7d6','#d5a6bd',
    '#cc4125','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6d9eeb','#6fa8dc','#8e7cc3','#c27ba0',
    '#a61c00','#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3c78d8','#3d85c6','#674ea7','#a64d79',
    '#85200c','#990000','#b45f06','#bf9000','#38761d','#134f5c','#1155cc','#0b5394','#351c75','#741b47',
    '#5b0f00','#660000','#783f04','#7f6000','#274e13','#0c343d','#1c4587','#073763','#20124d','#4c1130'
  ];
  var html='<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:2px;padding:4px">';
  for(var i=0;i<colors.length;i++){
    var c=colors[i];
    var sel=c===currentColor?' outline:2px solid #1967d2;outline-offset:1px;':'';
    html+='<button style="width:20px;height:20px;border:1px solid '+(c==='#ffffff'?'#ddd':'transparent')+';border-radius:2px;background:'+c+';cursor:pointer;padding:0;'+sel+'" data-color="'+c+'"></button>';
  }
  html+='</div>';
  html+='<div style="display:flex;gap:4px;align-items:center;margin-top:6px;padding:0 4px"><label style="font-size:10px;color:#666">Custom:</label><input type="color" value="'+(currentColor||'#000000')+'" style="width:28px;height:22px;border:1px solid #ddd;border-radius:3px;cursor:pointer;padding:0" data-custom="1"><button style="font-size:10px;padding:2px 8px;border:1px solid #ddd;border-radius:3px;background:#fff;cursor:pointer" data-apply="1">OK</button>';
  if(currentColor){html+='<button style="font-size:10px;padding:2px 6px;border:1px solid #ddd;border-radius:3px;background:#fff;cursor:pointer;color:#dc2626" data-clear="1">✕</button>';}
  html+='</div>';
  var div=document.createElement('div');
  div.innerHTML=html;
  div.querySelectorAll('button[data-color]').forEach(function(btn){
    btn.addEventListener('click',function(e){e.stopPropagation();onPick(this.dataset.color);});
  });
  var customInput=div.querySelector('input[data-custom]');
  var applyBtn=div.querySelector('button[data-apply]');
  if(applyBtn)applyBtn.addEventListener('click',function(e){e.stopPropagation();onPick(customInput.value);});
  var clearBtn=div.querySelector('button[data-clear]');
  if(clearBtn)clearBtn.addEventListener('click',function(e){e.stopPropagation();onPick('transparent');});
  return div;
}

function edShowColorPopup(target,callback){
  // Remove existing popup
  var old=document.getElementById('ed-color-popup');if(old)old.remove();
  var popup=document.createElement('div');
  popup.id='ed-color-popup';
  popup.style.cssText='position:fixed;background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:8px;box-shadow:0 8px 32px rgba(0,0,0,.2);z-index:1000001';
  var rect=target.getBoundingClientRect();
  var popTop=rect.bottom+4;
  var popLeft=Math.min(rect.left,window.innerWidth-240);
  // Adjust if below viewport
  if(popTop+300>window.innerHeight)popTop=Math.max(4,rect.top-300);
  popup.style.top=popTop+'px';
  popup.style.left=Math.max(4,popLeft)+'px';
  var palette=edColorPalette(function(color){callback(color);popup.remove();},null);
  popup.appendChild(palette);
  document.body.appendChild(popup);
  setTimeout(function(){
    document.addEventListener('click',function _cp(e){
      if(!popup.contains(e.target)){popup.remove();document.removeEventListener('click',_cp);}
    });
  },10);
}

// Selection save/restore for editor commands
let _edSavedRange = null;
function edSaveSelection(){
  try{
    const sel = window.getSelection();
    if(sel && sel.rangeCount > 0){
      const area = document.getElementById('editor-area');
      const range = sel.getRangeAt(0);
      // Only save if selection is inside the editor area
      if(area && area.contains(range.commonAncestorContainer)){
        _edSavedRange = range.cloneRange();
      }
    }
  }catch(e){}
}
function edRestoreSelection(){
  try{
    if(_edSavedRange){
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(_edSavedRange);
    }
  }catch(e){}
}
// Focus editor and restore cursor to saved position (used by ALL insert functions)
function edFocusAndRestore(){
  if(
    edGetEngineMode()==='tiptap' &&
    window.edTiptapAdapter &&
    window.edTiptapAdapter.ready &&
    typeof window.edTiptapAdapter.focus==='function'
  ){
    try{
      window.edTiptapAdapter.focus();
      return;
    }catch(e){}
  }
  const area = document.getElementById('editor-area');
  if(!area) return;
  const editTarget = area.querySelector('#docContent[contenteditable="true"]') || area.querySelector('[contenteditable="true"]') || area;
  editTarget.focus();
  edRestoreSelection();
  // Verify selection is inside editTarget, fallback to end if not
  try{
    const sel = window.getSelection();
    if(sel.rangeCount > 0){
      const range = sel.getRangeAt(0);
      if(!editTarget.contains(range.commonAncestorContainer)){
        const r = document.createRange();
        r.selectNodeContents(editTarget);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    } else {
      const r = document.createRange();
      r.selectNodeContents(editTarget);
      r.collapse(false);
      const sel2 = window.getSelection();
      sel2.removeAllRanges();
      sel2.addRange(r);
    }
  }catch(e){}
}

function edGetEngineMode(){
  try{
    var cfg=window.qmsEditorConfig||{};
    if(cfg.engine==='tiptap' && !!cfg.tiptapPilot) return 'tiptap';
    return 'legacy';
  }catch(e){
    return 'legacy';
  }
}

// Command adapter: keeps legacy behavior, while allowing gradual migration to Tiptap.
// Supports both call styles:
// - edExecCommand(cmd, val)
// - edExecCommand(cmd, false, val)  // legacy execCommand signature
function edExecCommand(cmd,arg2,arg3){
  var val = (arguments.length>=3) ? arg3 : arg2;
  var mode=edGetEngineMode();
  if(mode==='tiptap' && window.edTiptapAdapter){
    if(window.edTiptapAdapter.ready && typeof window.edTiptapAdapter.exec==='function'){
      try{
        return !!window.edTiptapAdapter.exec(cmd,val);
      }catch(e){
        return false;
      }
    }
  }
  try{
    return document.execCommand(cmd,false,(val===undefined?null:val));
  }catch(e){
    return false;
  }
}

function edCmd(cmd,val){
  // Block formatting commands in source mode (only allow source/find/print/zoom/fullscreen)
  if(edSourceMode&&cmd!=='_source'&&cmd!=='_find'&&cmd!=='_print'&&cmd!=='_zoomIn'&&cmd!=='_zoomOut'&&cmd!=='_fullscreen'){
    showToast(lang!=='en'?'⚠ Chuyển về WYSIWYG trước khi chỉnh sửa':'⚠ Switch back to WYSIWYG before editing');
    return;
  }
  const area=document.getElementById('editor-area');
  if(cmd==='formatBlock'&&val&&!val.startsWith('<'))val='<'+val+'>';
  if(cmd==='_link')return edInsertLink();
  if(cmd==='_image')return edInsertImage();
  if(cmd==='_table')return edInsertTable();
  if(cmd==='_quote')return edInsertQuote();
  if(cmd==='_code')return edInsertCode();
  if(cmd==='_find')return edToggleFind();
  if(cmd==='_source')return edToggleSource();
  if(cmd==='_print')return edPrint();
  if(cmd==='_zoomIn')return edSetZoom(edZoom+10);
  if(cmd==='_zoomOut')return edSetZoom(edZoom-10);
  if(cmd==='_fullscreen')return edToggleFullscreen();
  if(cmd==='_pilcrow')return edToggleMarks();
  if(cmd==='_painter')return edFormatPaint();
  if(cmd==='_pageBreak')return edInsertPageBreak();
  if(cmd==='_checklist')return edInsertChecklist();
  if(cmd==='_special')return edToggleSpecial();
  if(cmd==='_math')return edInsertMath();
  if(cmd==='_date')return edInsertDateTime();
  if(cmd==='_qms')return edToggleQmsTools();
  if(cmd==='_tableColor')return edTableCellColor();
  if(cmd==='_textbox')return edInsertTextbox();
  if(cmd==='_shape')return edInsertShape();
  if(cmd==='_chart')return edInsertChart();
  var tiptapActive=(
    edGetEngineMode()==='tiptap' &&
    window.edTiptapAdapter &&
    window.edTiptapAdapter.ready
  );
  // Restore selection then execute command on the right contenteditable element
  var editTarget = area.querySelector('#docContent[contenteditable="true"]') || area.querySelector('[contenteditable="true"]') || area;
  if(!tiptapActive){
    // Ensure we focus the contenteditable element and selection is inside it
    if(document.activeElement !== editTarget) editTarget.focus();
    edRestoreSelection();
    // For some commands, ensure selection is in the right context
    try{
      var sel = window.getSelection();
      if(sel.rangeCount > 0){
        var range = sel.getRangeAt(0);
        if(!editTarget.contains(range.commonAncestorContainer)){
          // Selection is outside editTarget, move it inside
          var r = document.createRange();
          r.selectNodeContents(editTarget);
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }
    }catch(e){}
  }
  if(!tiptapActive && (cmd==='indent' || cmd==='outdent')){
    if(_edHandleListIndent(cmd==='indent')){
      edMarkModified();
      edUpdateState();
      return;
    }
  }
  var ok=edExecCommand(cmd,false,val||null);
  if(ok!==false){
    edMarkModified();
  }else if(tiptapActive){
    showToast(lang!=='en'?'⚠ Lệnh này chưa hỗ trợ trong Tiptap pilot':'⚠ This command is not supported in Tiptap pilot yet');
  }
  edUpdateState();
}

function edToggleMarks(){
  edShowMarks=!edShowMarks;
  document.getElementById('editor-area').classList.toggle('show-marks',edShowMarks);
}

function edFormatPaint(){
  const sel=window.getSelection();
  if(!sel.rangeCount)return;
  const node=sel.anchorNode&&sel.anchorNode.parentElement;
  if(!node)return;
  const cs=window.getComputedStyle(node);
  edFormatPainter={fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,fontStyle:cs.fontStyle,textDecoration:cs.textDecoration,color:cs.color,backgroundColor:cs.backgroundColor};
  document.getElementById('editor-area').style.cursor='copy';
  document.getElementById('editor-area').addEventListener('mouseup',edApplyPaint,{once:true});
  showToast(lang!=='en'?'🖌 Chọn văn bản để áp dụng định dạng':'🖌 Select text to apply format');
}
function edApplyPaint(){
  if(!edFormatPainter)return;
  var sel=window.getSelection();
  if(sel.rangeCount&&!sel.isCollapsed){
    try{
      var range=sel.getRangeAt(0);
      var span=document.createElement('span');
      Object.assign(span.style,edFormatPainter);
      // Use extractContents + appendChild for cross-element safety
      var contents=range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      sel.removeAllRanges();
      edMarkModified();
    }catch(ex){
      // Fallback: apply via execCommand for basic formatting
      try{
        if(edFormatPainter.fontWeight==='700'||edFormatPainter.fontWeight==='bold')edExecCommand('bold');
        if(edFormatPainter.fontStyle==='italic')edExecCommand('italic');
        if(edFormatPainter.textDecoration&&edFormatPainter.textDecoration.includes('underline'))edExecCommand('underline');
        if(edFormatPainter.color)edExecCommand('foreColor',false,edFormatPainter.color);
        if(edFormatPainter.fontFamily)edExecCommand('fontName',false,edFormatPainter.fontFamily);
        edMarkModified();
      }catch(ex2){}
    }
  }
  edFormatPainter=null;
  document.getElementById('editor-area').style.cursor='';
}

function edLineSpacing(val){
  if(!val)return;
  var spacing=String(val).trim();
  if(!spacing)return;
  var tiptapActive=(
    edGetEngineMode()==='tiptap' &&
    window.edTiptapAdapter &&
    window.edTiptapAdapter.ready
  );
  if(tiptapActive){
    edFocusAndRestore();
    var okSpacing=edExecCommand('lineSpacing',false,spacing);
    if(okSpacing!==false){
      edMarkModified();
    }else{
      showToast(lang!=='en'?'\u26a0 Ch\u01b0a h\u1ed7 tr\u1ee3 gi\u00e3n d\u00f2ng trong Tiptap pilot':'\u26a0 Line spacing is not supported in Tiptap pilot yet');
    }
    var spT=document.getElementById('ed-spacing');
    if(spT)spT.selectedIndex=0;
    return;
  }
  var area=document.getElementById('editor-area');
  edFocusAndRestore();
  var sel=window.getSelection();
  if(sel.rangeCount){
    var node=sel.anchorNode;
    while(node&&node!==area&&node.nodeType!==1)node=node.parentNode;
    if(node&&node!==area){node.style.lineHeight=spacing;}
    else{area.style.lineHeight=spacing;}
  }else{area.style.lineHeight=spacing;}
  edMarkModified();
  // Reset dropdown so it shows the placeholder again
  var sp=document.getElementById('ed-spacing');
  if(sp)sp.selectedIndex=0;
}

function edInsertPageBreak(){
  edFocusAndRestore();
  edExecCommand('insertHTML',false,'<hr class="page-break">');
  edMarkModified();
}

function edInsertChecklist(){
  edFocusAndRestore();
  const vi=lang!=='en';
  const items=[vi?'Mục 1':'Item 1',vi?'Mục 2':'Item 2',vi?'Mục 3':'Item 3'];
  let html='';
  items.forEach(t=>{
    html+='<div class="ed-check-item" style="display:flex;align-items:center;gap:8px;margin:4px 0;padding:2px 0"><input type="checkbox" style="width:16px;height:16px;accent-color:#1967d2;flex-shrink:0"><span contenteditable="true" style="flex:1;outline:none">'+t+'</span></div>';
  });
  edExecCommand('insertHTML',false,html+'<p><br></p>');
  edMarkModified();
}

function edToggleFullscreen(){
  edFullscreen=!edFullscreen;
  if(edFullscreen){
    document.body.dataset.edFs='1';
    document.getElementById('sidebar').style.display='none';
    document.getElementById('header').style.display='none';
    var wfp=document.getElementById('wf-panel');if(wfp)wfp.style.display='none';
    var dvh=document.getElementById('doc-viewer-header');if(dvh)dvh.style.display='none';
    var main=document.getElementById('content');if(main){main.style.padding='0';main.style.margin='0';}
    var app=document.getElementById('app');if(app)app.style.overflow='hidden';
    var dv=document.getElementById('doc-viewer');if(dv){dv.style.position='fixed';dv.style.inset='0';dv.style.zIndex='9990';dv.style.background='#fff';}
  }else{
    delete document.body.dataset.edFs;
    document.getElementById('sidebar').style.display='';
    document.getElementById('header').style.display='';
    var wfp=document.getElementById('wf-panel');if(wfp)wfp.style.display='';
    var dvh=document.getElementById('doc-viewer-header');if(dvh)dvh.style.display='';
    var main=document.getElementById('content');if(main){main.style.padding='';main.style.margin='';}
    var app=document.getElementById('app');if(app)app.style.overflow='';
    var dv=document.getElementById('doc-viewer');if(dv){dv.style.position='';dv.style.inset='';dv.style.zIndex='';dv.style.background='';}
  }
}

// ═══════════════════════════════════════════════════
// COLOR PICKER DROPDOWNS (Word-style)
// ═══════════════════════════════════════════════════
const ED_COLORS=[
  '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef','#f3f3f3','#ffffff',
  '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff','#ff00ff',
  '#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc',
  '#dd7e6b','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#a4c2f4','#9fc5e8','#b4a7d6','#d5a6bd',
  '#cc4125','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6d9eeb','#6fa8dc','#8e7cc3','#c27ba0',
  '#a61c00','#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3c78d8','#3d85c6','#674ea7','#a64d79',
  '#85200c','#990000','#b45f06','#bf9000','#38761d','#134f5c','#1155cc','#0b5394','#351c75','#741b47',
  '#5b0f00','#660000','#783f04','#7f6000','#274e13','#0c343d','#1c4587','#073763','#20124d','#4c1130'

];

function edBuildColorDD(type){
  const dd=document.getElementById('ed-'+type+'-dd');
  const vi=lang!=='en';
  const isHighlight=type==='bg';
  let html='<h5>'+(isHighlight?(vi?'Màu nền':'Highlight Color'):(vi?'Màu chữ':'Text Color'))+'</h5><div class="ed-cpick-grid">';
  if(isHighlight) html+='<button class="nocolor" onclick="edPickColor(\'bg\',\'transparent\')" title="'+(vi?'Không màu':'No Color')+'"></button>';
  ED_COLORS.forEach(c=>{
    html+='<button style="background:'+c+'" onclick="edPickColor(\''+type+'\',\''+c+'\')" title="'+c+'"></button>';
  });
  html+='</div><div class="ed-cpick-custom"><label>'+(vi?'Tùy chỉnh':'Custom')+'</label><input type="color" id="ed-custom-'+type+'" value="'+(isHighlight?'#ffff00':'#cc0000')+'"><button onclick="edPickColor(\''+type+'\',document.getElementById(\'ed-custom-'+type+'\').value)">OK</button></div>';
  dd.innerHTML=html;
}

function edToggleColorDD(type){
  edSaveSelection(); // Save selection BEFORE opening dropdown
  const dd=document.getElementById('ed-'+type+'-dd');
  const isOpen=dd.classList.contains('open');
  document.querySelectorAll('.ed-cpick-dd,.ed-special-panel').forEach(d=>d.classList.remove('open'));
  if(!isOpen){
    edBuildColorDD(type);
    // Move to body to escape stacking contexts
    if(dd.parentElement!==document.body)document.body.appendChild(dd);
    // Prevent mousedown from stealing focus from editor
    if(!dd._edPreventMouseDown){
      dd._edPreventMouseDown=true;
      dd.addEventListener('mousedown',function(e){e.preventDefault();},{capture:true});
    }
    const arrow=document.querySelector('#ed-cpick-'+type+' .ed-cpick-arrow');
    const rect=arrow.getBoundingClientRect();
    dd.style.top=(rect.bottom+4)+'px';
    dd.style.left=Math.max(4,Math.min(rect.left,window.innerWidth-230))+'px';
    dd.classList.add('open');
    setTimeout(()=>document.addEventListener('click',function _cl(e){
      if(!dd.contains(e.target)&&!e.target.closest('.ed-cpick')){dd.classList.remove('open');document.removeEventListener('click',_cl);}
    }),10);
  }
}

function edApplyColor(type){
  const isHighlight=type==='bg';
  const root=document.getElementById('ed-cpick-'+type);
  const color=getComputedStyle(root).getPropertyValue('--ed-'+type+'-c').trim()||( isHighlight?'#ffff00':'#cc0000');
  const tiptapActive=(
    edGetEngineMode()==='tiptap' &&
    window.edTiptapAdapter &&
    window.edTiptapAdapter.ready
  );
  if(tiptapActive){
    var okT=edExecCommand(isHighlight?'hiliteColor':'foreColor',false,color);
    if(okT!==false) edMarkModified();
    return;
  }
  const area=document.getElementById('editor-area');
  const editTarget=area.querySelector('#docContent[contenteditable="true"]')||area.querySelector('[contenteditable="true"]')||area;
  editTarget.focus();
  edRestoreSelection();
  // Verify selection exists and is inside editTarget
  try{
    var sel=window.getSelection();
    if(!sel.rangeCount||!editTarget.contains(sel.getRangeAt(0).commonAncestorContainer)){
      return; // No valid selection to apply color to
    }
  }catch(e){}
  var ok=edExecCommand(isHighlight?'hiliteColor':'foreColor',false,color);
  if(ok!==false) edMarkModified();
}

function edPickColor(type,color){
  const root=document.getElementById('ed-cpick-'+type);
  root.style.setProperty('--ed-'+type+'-c',color);
  document.getElementById('ed-'+type+'-bar').style.background=color;
  document.querySelectorAll('.ed-cpick-dd').forEach(d=>d.classList.remove('open'));
  const isHighlight=type==='bg';
  const tiptapActive=(
    edGetEngineMode()==='tiptap' &&
    window.edTiptapAdapter &&
    window.edTiptapAdapter.ready
  );
  if(tiptapActive){
    var okT=false;
    if(color==='transparent'){
      okT=edExecCommand('hiliteColor',false,'transparent');
    }else{
      okT=edExecCommand(isHighlight?'hiliteColor':'foreColor',false,color);
    }
    if(okT!==false) edMarkModified();
    return;
  }
  const area=document.getElementById('editor-area');
  const editTarget=area.querySelector('#docContent[contenteditable="true"]')||area.querySelector('[contenteditable="true"]')||area;
  editTarget.focus();
  edRestoreSelection();
  // Verify selection is valid inside editTarget
  try{
    var sel=window.getSelection();
    if(!sel.rangeCount||!editTarget.contains(sel.getRangeAt(0).commonAncestorContainer)){
      showToast(lang!=='en'?'⚠ Hãy chọn văn bản trước khi đổi màu':'⚠ Select text before changing color');
      return;
    }
  }catch(e){}
  if(color==='transparent'){
    var ok=edExecCommand('hiliteColor',false,'transparent');
    if(ok!==false) edMarkModified();
  }else{
    var ok2=edExecCommand(isHighlight?'hiliteColor':'foreColor',false,color);
    if(ok2!==false) edMarkModified();
  }
}

// ═══════════════════════════════════════════════════
// SPECIAL CHARACTERS PANEL (CKEditor Ω)
// ═══════════════════════════════════════════════════
const ED_SPECIAL_CATS={
  'common':['©','®','™','°','±','×','÷','µ','¶','§','†','‡','•','…','—','–','€','£','¥','¢','¤','ƒ','¹','²','³','¼','½','¾','‰','←','→','↑','↓','↔','↕','⇐','⇒','⇑','⇓'],
  'math':['∀','∂','∃','∅','∇','∈','∉','∋','∏','∑','−','∗','√','∝','∞','∠','∧','∨','∩','∪','∫','∴','∼','≅','≈','≠','≡','≤','≥','⊂','⊃','⊄','⊆','⊇','⊕','⊗','⊥','⋅','⟨','⟩'],
  'arrows':['←','→','↑','↓','↔','↕','⇐','⇒','⇑','⇓','⇔','↩','↪','↰','↱','↲','↳','↶','↷','↺','↻','➔','➜','➝','➞','➡','⬆','⬇','⬅','⬊','⬈','⬉','⬋'],
  'greek':['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ','Τ','Υ','Φ','Χ','Ψ','Ω','α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω'],
  'emoji':['😀','😂','🥰','😎','🤔','👍','👎','❤️','⭐','🔥','✅','❌','⚠️','📌','📎','📊','📈','📉','🏆','🎯','💡','🔔','📝','✏️','📂','💼','🔒','🔓','✉️','📞','🌐','⏰','🗓️','⚡','♻️','🎉'],
  'shapes':['■','□','▪','▫','▲','△','▼','▽','◆','◇','○','●','◎','◉','★','☆','♠','♣','♥','♦','♤','♧','♡','♢','✓','✗','✘','✔','✖','✚','✛','✜','✝','✞','✟','☐','☑','☒'],
  'currency':['$','€','£','¥','¢','₹','₽','₩','₺','₴','₿','฿','₫','₱','₦','₵','₡','₲','₮','₸','₼','₾','﷼','﹩']
};

let edSpecialCat='common';
function edToggleSpecial(){
  const panel=document.getElementById('ed-special-panel');
  if(panel.parentElement!==document.body)document.body.appendChild(panel);
  // Prevent panel clicks from stealing focus from editor
  if(!panel._preventFocus){
    panel._preventFocus=true;
    panel.addEventListener('mousedown',function(e){if(e.target.tagName==='BUTTON')e.preventDefault();},{capture:true});
  }
  const isOpen=panel.classList.contains('open');
  document.querySelectorAll('.ed-cpick-dd,.ed-special-panel').forEach(d=>d.classList.remove('open'));
  if(!isOpen){
    edBuildSpecialPanel();
    const trigger=document.querySelector('[data-cmd="_special"]');
    const rect=trigger.getBoundingClientRect();
    panel.style.top=(rect.bottom+4)+'px';
    panel.style.left=Math.max(4,Math.min(rect.left-150,window.innerWidth-350))+'px';
    panel.classList.add('open');
    setTimeout(()=>document.addEventListener('click',function _cl(e){
      if(!panel.contains(e.target)&&!e.target.closest('[data-cmd="_special"]')){panel.classList.remove('open');document.removeEventListener('click',_cl);}
    }),10);
  }
}

function edBuildSpecialPanel(){
  const panel=document.getElementById('ed-special-panel');
  const vi=lang!=='en';
  const catNames={common:vi?'Phổ biến':'Common',math:vi?'Toán học':'Math',arrows:vi?'Mũi tên':'Arrows',greek:vi?'Hy Lạp':'Greek',emoji:'Emoji',shapes:vi?'Hình dạng':'Shapes',currency:vi?'Tiền tệ':'Currency'};
  let html='<div class="ed-special-cats">';
  Object.keys(ED_SPECIAL_CATS).forEach(k=>{
    html+='<button onmousedown="event.preventDefault()"'+(k===edSpecialCat?' class="active"':'')+' onclick="event.stopPropagation();edSpecialCat=\''+k+'\';edBuildSpecialPanel()">'+catNames[k]+'</button>';
  });
  html+='</div><div class="ed-special-grid">';
  ED_SPECIAL_CATS[edSpecialCat].forEach(ch=>{
    html+='<button onmousedown="event.preventDefault()" onclick="edInsertChar(\''+ch.replace(/'/g,"\\'")+'\');event.stopPropagation()" title="'+ch+'">'+ch+'</button>';
  });
  html+='</div>';
  panel.innerHTML=html;
}

function edInsertChar(ch){
  edFocusAndRestore();
  edExecCommand('insertText',false,ch);
  edSaveSelection(); // Save new cursor position for next char insert
  edMarkModified();
}

function _edInsertHtmlBlock(html){
  edFocusAndRestore();
  var ok=edExecCommand('insertHTML',false,String(html==null?'':html));
  if(ok!==false){
    try{ edApplyGlobalTablePolicy(edGetContentRoot()||document.getElementById('editor-area'), {force:true, source:'qms-insert'}); }catch(e){}
    edSaveSelection();
    edMarkModified();
    edUpdateState();
  }
}

function edInsertDateTime(){
  var stamp='';
  try{
    stamp=new Date().toLocaleString(lang==='en'?'en-GB':'vi-VN',{
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hour12:false
    });
  }catch(e){
    stamp=now();
  }
  _edInsertHtmlBlock('<span class="tag">'+_edEscapeHtml(stamp)+'</span>');
}

function edToggleQmsTools(){
  const panel=document.getElementById('ed-qms-panel');
  if(panel.parentElement!==document.body)document.body.appendChild(panel);
  if(!panel._preventFocus){
    panel._preventFocus=true;
    panel.addEventListener('mousedown',function(e){if(e.target.tagName==='BUTTON')e.preventDefault();},{capture:true});
  }
  const isOpen=panel.classList.contains('open');
  document.querySelectorAll('.ed-cpick-dd,.ed-special-panel').forEach(d=>d.classList.remove('open'));
  if(!isOpen){
    edBuildQmsPanel();
    const trigger=document.querySelector('[data-cmd="_qms"]');
    const rect=trigger.getBoundingClientRect();
    panel.style.top=(rect.bottom+4)+'px';
    panel.style.left=Math.max(4,Math.min(rect.left-140,window.innerWidth-400))+'px';
    panel.classList.add('open');
    setTimeout(()=>document.addEventListener('click',function _cl(e){
      if(!panel.contains(e.target)&&!e.target.closest('[data-cmd="_qms"]')){panel.classList.remove('open');document.removeEventListener('click',_cl);}
    }),10);
  }
}

function edBuildQmsPanel(){
  const panel=document.getElementById('ed-qms-panel');
  const vi=lang!=='en';
  const items=[
    {kind:'docControl', title:vi?'Khối kiểm soát tài liệu':'Document control', desc:vi?'Mã, phiên bản, owner, hiệu lực, phê duyệt':'Code, revision, owner, effective date, approval'},
    {kind:'revisionTable', title:vi?'Bảng lịch sử sửa đổi':'Revision history', desc:vi?'Bảng Rev / ngày / mô tả / người thực hiện':'Rev / date / description / owner table'},
    {kind:'approval', title:vi?'Khối ký duyệt':'Approval signatures', desc:vi?'Lập, rà soát, phê duyệt':'Prepared, reviewed, approved'},
    {kind:'actionTable', title:vi?'Bảng hành động / CAPA':'Action / CAPA table', desc:vi?'Hành động, owner, due date, trạng thái':'Action, owner, due date, status'},
    {kind:'riskTable', title:vi?'Bảng rủi ro & kiểm soát':'Risk & control table', desc:vi?'Rủi ro, tác động, kiểm soát, owner':'Risk, impact, control, owner'},
    {kind:'callout', title:vi?'Callout ISO':'ISO callout', desc:vi?'Khối yêu cầu kiểm soát nổi bật':'Highlighted controlled requirement'},
    {kind:'note', title:vi?'Ghi chú vận hành':'Operational note', desc:vi?'Khối lưu ý / cảnh báo thực hiện':'Operational note / warning'},
    {kind:'blankField', title:vi?'Dòng trống điền tay':'Blank field', desc:vi?'Dòng trống cho form/QMS record':'Blank line for forms and records'}
  ];
  let html='<div class="ed-qms-head">'+(vi?'QMS Quick Insert':'QMS Quick Insert')+'</div>';
  html+='<div class="ed-qms-sub">'+(vi?'Chèn nhanh các khối chuẩn cho SOP/WI/FRM/QMS record.':'Insert standard blocks for SOP/WI/FRM/QMS records.')+'</div>';
  html+='<div class="ed-qms-grid">';
  items.forEach(function(item){
    html+='<button onmousedown="event.preventDefault()" onclick="edInsertQmsTemplate(\''+item.kind+'\');event.stopPropagation()"><span class="ed-qms-title">'+_edEscapeHtml(item.title)+'</span><span class="ed-qms-desc">'+_edEscapeHtml(item.desc)+'</span></button>';
  });
  html+='</div>';
  panel.innerHTML=html;
}

function edInsertQmsTemplate(kind){
  const panel=document.getElementById('ed-qms-panel');
  if(panel) panel.classList.remove('open');
  const wrapped=edWrapQmsTemplateHtml(kind,edBuildQmsTemplateHtml(kind));
  _edInsertHtmlBlock(wrapped.html);
  setTimeout(function(){
    const area=document.getElementById('editor-area');
    const ctx=edGetContentRoot()||area;
    if(ctx) edInitQmsBlocks(ctx);
    const block=document.getElementById(wrapped.id);
    if(block){
      edSelectQmsBlock(block);
      edFocusQmsBlock(block);
    }
  },0);
}

function edQmsKindMeta(kind){
  const vi=lang!=='en';
  const map={
    docControl:{title:vi?'Kiểm soát tài liệu':'Document control'},
    revisionTable:{title:vi?'Lịch sử sửa đổi':'Revision history'},
    approval:{title:vi?'Ký duyệt':'Approval'},
    actionTable:{title:vi?'Bảng hành động / CAPA':'Action / CAPA'},
    riskTable:{title:vi?'Rủi ro & kiểm soát':'Risk & control'},
    callout:{title:vi?'Callout ISO':'ISO callout'},
    note:{title:vi?'Ghi chú vận hành':'Operational note'},
    blankField:{title:vi?'Dòng điền tay':'Blank field'}
  };
  return map[kind]||map.note;
}

function edQmsInlineField(minWidth,placeholder){
  const style=minWidth?' style="min-width:'+minWidth+'px"':'';
  return '<span class="blank ed-qms-field ed-qms-inline-field is-empty" contenteditable="true" data-placeholder="'+_edEscapeHtml(placeholder||((lang!=='en')?'Điền nội dung':'Fill in'))+'"'+style+'></span>';
}

function edQmsBlockField(minHeight,placeholder){
  const style=minHeight?' style="min-height:'+minHeight+'px"':'';
  return '<div class="input ed-qms-field ed-qms-block-field is-empty" contenteditable="true" data-placeholder="'+_edEscapeHtml(placeholder||((lang!=='en')?'Nhập nội dung':'Enter details'))+'"'+style+'></div>';
}

function edBuildQmsTemplateHtml(kind){
  const vi=lang!=='en';
  const today=(function(){
    try{
      return new Date().toLocaleDateString(lang==='en'?'en-GB':'vi-VN',{year:'numeric',month:'2-digit',day:'2-digit'});
    }catch(e){
      return now().slice(0,10);
    }
  })();
  const blank=function(w,ph){return edQmsInlineField(w,ph);};
  const block=function(h,ph){return edQmsBlockField(h,ph);};
  const templates={
    docControl:
      '<div class="card"><div class="card-title">'+(vi?'Thông tin kiểm soát tài liệu':'Document Control Information')+'</div><table class="form-table"><tbody>'
      +'<tr><th style="width:28%">'+(vi?'Mã tài liệu':'Document code')+'</th><td>'+blank(180,vi?'Nhập mã tài liệu':'Enter document code')+'</td><th style="width:22%">'+(vi?'Phiên bản':'Revision')+'</th><td>'+blank(120,vi?'Rev':'Rev')+'</td></tr>'
      +'<tr><th>'+(vi?'Chủ sở hữu':'Owner')+'</th><td>'+blank(180,vi?'Tên owner':'Owner name')+'</td><th>'+(vi?'Ngày hiệu lực':'Effective date')+'</th><td>'+blank(120,vi?'dd/mm/yyyy':'dd/mm/yyyy')+'</td></tr>'
      +'<tr><th>'+(vi?'Phòng ban':'Department')+'</th><td>'+blank(180,vi?'Tên phòng ban':'Department name')+'</td><th>'+(vi?'Phê duyệt':'Approved by')+'</th><td>'+blank(120,vi?'Người phê duyệt':'Approver')+'</td></tr>'
      +'</tbody></table></div>',
    revisionTable:
      '<div class="table-card"><table class="form-table"><thead><tr><th style="width:12%">'+(vi?'Rev':'Rev')+'</th><th style="width:18%">'+(vi?'Ngày':'Date')+'</th><th>'+(vi?'Mô tả thay đổi':'Change description')+'</th><th style="width:18%">'+(vi?'Người cập nhật':'Updated by')+'</th><th style="width:18%">'+(vi?'Phê duyệt':'Approved by')+'</th></tr></thead><tbody>'
      +'<tr><td>0</td><td>'+today+'</td><td>'+(vi?'Phát hành ban đầu':'Initial release')+'</td><td>'+blank(100,vi?'Người cập nhật':'Updated by')+'</td><td>'+blank(100,vi?'Phê duyệt':'Approved by')+'</td></tr>'
      +'<tr><td>'+blank(48,'1')+'</td><td>'+blank(90,vi?'dd/mm/yyyy':'dd/mm/yyyy')+'</td><td>'+block(38,vi?'Mô tả thay đổi':'Describe the change')+'</td><td>'+blank(100,vi?'Người cập nhật':'Updated by')+'</td><td>'+blank(100,vi?'Phê duyệt':'Approved by')+'</td></tr>'
      +'<tr><td>'+blank(48,'2')+'</td><td>'+blank(90,vi?'dd/mm/yyyy':'dd/mm/yyyy')+'</td><td>'+block(38,vi?'Mô tả thay đổi':'Describe the change')+'</td><td>'+blank(100,vi?'Người cập nhật':'Updated by')+'</td><td>'+blank(100,vi?'Phê duyệt':'Approved by')+'</td></tr>'
      +'</tbody></table></div>',
    approval:
      '<h2 class="h2">'+(vi?'Ký duyệt':'Approval')+'</h2><div class="sig-row">'
      +'<div class="sig-box"><b>'+(vi?'Lập':'Prepared')+'</b><br><span class="muted small">'+(vi?'Họ tên / Chữ ký / Ngày':'Name / Signature / Date')+'</span>'+block(46,vi?'Điền tên, ký và ngày':'Enter name, signature, date')+'</div>'
      +'<div class="sig-box"><b>'+(vi?'Rà soát':'Reviewed')+'</b><br><span class="muted small">'+(vi?'Họ tên / Chữ ký / Ngày':'Name / Signature / Date')+'</span>'+block(46,vi?'Điền tên, ký và ngày':'Enter name, signature, date')+'</div>'
      +'<div class="sig-box"><b>'+(vi?'Phê duyệt':'Approved')+'</b><br><span class="muted small">'+(vi?'Họ tên / Chữ ký / Ngày':'Name / Signature / Date')+'</span>'+block(46,vi?'Điền tên, ký và ngày':'Enter name, signature, date')+'</div>'
      +'</div>',
    actionTable:
      '<div class="table-card"><table class="form-table"><thead><tr><th style="width:7%">#</th><th>'+(vi?'Hành động / CAPA':'Action / CAPA')+'</th><th style="width:18%">'+(vi?'Owner':'Owner')+'</th><th style="width:16%">'+(vi?'Hạn hoàn thành':'Due date')+'</th><th style="width:16%">'+(vi?'Trạng thái':'Status')+'</th><th style="width:18%">'+(vi?'Bằng chứng':'Evidence')+'</th></tr></thead><tbody>'
      +'<tr><td>1</td><td>'+block(42,vi?'Mô tả hành động / CAPA':'Describe the action / CAPA')+'</td><td>'+blank(100,vi?'Owner':'Owner')+'</td><td>'+blank(90,vi?'dd/mm/yyyy':'dd/mm/yyyy')+'</td><td><span class="tag orange">'+(vi?'Open':'Open')+'</span></td><td>'+block(42,vi?'Link hoặc bằng chứng':'Evidence or link')+'</td></tr>'
      +'<tr><td>2</td><td>'+block(42,vi?'Mô tả hành động / CAPA':'Describe the action / CAPA')+'</td><td>'+blank(100,vi?'Owner':'Owner')+'</td><td>'+blank(90,vi?'dd/mm/yyyy':'dd/mm/yyyy')+'</td><td><span class="tag">'+(vi?'Planned':'Planned')+'</span></td><td>'+block(42,vi?'Link hoặc bằng chứng':'Evidence or link')+'</td></tr>'
      +'<tr><td>3</td><td>'+block(42,vi?'Mô tả hành động / CAPA':'Describe the action / CAPA')+'</td><td>'+blank(100,vi?'Owner':'Owner')+'</td><td>'+blank(90,vi?'dd/mm/yyyy':'dd/mm/yyyy')+'</td><td><span class="tag teal">'+(vi?'Done':'Done')+'</span></td><td>'+block(42,vi?'Link hoặc bằng chứng':'Evidence or link')+'</td></tr>'
      +'</tbody></table></div>',
    riskTable:
      '<div class="table-card"><table class="form-table"><thead><tr><th style="width:8%">#</th><th>'+(vi?'Rủi ro':'Risk')+'</th><th style="width:18%">'+(vi?'Tác động':'Impact')+'</th><th>'+(vi?'Kiểm soát hiện có / đề xuất':'Existing / proposed control')+'</th><th style="width:18%">'+(vi?'Owner':'Owner')+'</th></tr></thead><tbody>'
      +'<tr><td>1</td><td>'+block(38,vi?'Mô tả rủi ro':'Describe the risk')+'</td><td><span class="level l2">M</span></td><td>'+block(38,vi?'Mô tả kiểm soát':'Describe the control')+'</td><td>'+blank(100,vi?'Owner':'Owner')+'</td></tr>'
      +'<tr><td>2</td><td>'+block(38,vi?'Mô tả rủi ro':'Describe the risk')+'</td><td><span class="level l3">H</span></td><td>'+block(38,vi?'Mô tả kiểm soát':'Describe the control')+'</td><td>'+blank(100,vi?'Owner':'Owner')+'</td></tr>'
      +'</tbody></table></div>',
    callout:
      '<div class="callout"><b>'+(vi?'Yêu cầu kiểm soát:':'Controlled requirement:')+'</b> '+(vi?'Nêu rõ yêu cầu bắt buộc, tiêu chí chấp nhận hoặc điểm kiểm soát quan trọng tại đây.':'State the mandatory requirement, acceptance criteria, or key control point here.')+'</div>',
    note:
      '<div class="note"><b>'+(vi?'Lưu ý thực hiện:':'Operational note:')+'</b> '+(vi?'Bổ sung lưu ý, cảnh báo, hoặc hướng dẫn quan trọng để tránh lỗi thao tác.':'Add execution notes, warnings, or important guidance to avoid process errors.')+'</div>',
    blankField:'<p>'+blank(180,vi?'Điền thông tin':'Fill in here')+'</p>'
  };
  return templates[kind]||templates.note;
}

function edWrapQmsTemplateHtml(kind,bodyHtml){
  const id='ed-qms-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  return {
    id:id,
    html:'<div class="ed-qms-block" id="'+id+'" data-qms-kind="'+_edEscapeHtml(kind||'note')+'" contenteditable="false"><div class="ed-qms-body" contenteditable="true">'+String(bodyHtml||'')+'</div></div><p><br></p>'
  };
}

function edIsQmsSpacer(node){
  if(!node||node.nodeType!==1||node.tagName!=='P') return false;
  const html=String(node.innerHTML||'')
    .replace(/<br\s*\/?>/gi,'')
    .replace(/&nbsp;/gi,'')
    .trim();
  return html==='';
}

function edCreateQmsBlockShell(kind){
  const shell=document.createElement('div');
  shell.className='ed-qms-block';
  shell.dataset.qmsKind=kind||'note';
  shell.setAttribute('contenteditable','false');
  const body=document.createElement('div');
  body.className='ed-qms-body';
  body.setAttribute('contenteditable','true');
  shell.appendChild(body);
  return shell;
}

function edGuessQmsKindFromElement(el){
  if(!el||!el.classList) return 'note';
  const text=String(el.textContent||'').toLowerCase();
  if(el.classList.contains('callout')) return 'callout';
  if(el.classList.contains('note')) return 'note';
  if(el.classList.contains('sig-row')) return 'approval';
  if(el.classList.contains('table-card')){
    if(text.indexOf('capa')!==-1||text.indexOf('hành động')!==-1||text.indexOf('due date')!==-1) return 'actionTable';
    if(text.indexOf('rủi ro')!==-1||text.indexOf('risk')!==-1||text.indexOf('impact')!==-1) return 'riskTable';
    return 'revisionTable';
  }
  if(el.classList.contains('card')) return 'docControl';
  return 'note';
}

function edWrapLegacyQmsElement(target,kind,includeHeading){
  if(!target||target.closest('.ed-qms-block')||!target.parentNode) return null;
  let firstNode=target;
  if(includeHeading){
    const prev=target.previousElementSibling;
    const prevText=prev?String(prev.textContent||'').toLowerCase():'';
    if(prev&&/^H[1-6]$/.test(prev.tagName)&&(prevText.indexOf('approval')!==-1||prevText.indexOf('ký duyệt')!==-1)){
      firstNode=prev;
    }
  }
  const shell=edCreateQmsBlockShell(kind);
  target.parentNode.insertBefore(shell,firstNode);
  if(firstNode!==target) shell.querySelector('.ed-qms-body').appendChild(firstNode);
  shell.querySelector('.ed-qms-body').appendChild(target);
  return shell;
}

function edWrapLegacyQmsBlocks(ctx){
  if(!ctx||!ctx.querySelectorAll) return;
  Array.from(ctx.querySelectorAll('.sig-row')).forEach(function(row){
    if(!row.closest('.ed-qms-block')) edWrapLegacyQmsElement(row,'approval',true);
  });
  Array.from(ctx.querySelectorAll('.card,.table-card,.callout,.note')).forEach(function(el){
    if(el.closest('.ed-qms-block')) return;
    if(el.classList.contains('card') && !el.querySelector('.card-title,.form-table')) return;
    if(el.classList.contains('table-card') && !el.querySelector('table')) return;
    edWrapLegacyQmsElement(el,edGuessQmsKindFromElement(el),false);
  });
  Array.from(ctx.querySelectorAll('span.blank,div.input')).forEach(function(field){
    if(field.closest('.ed-qms-block,.card,.table-card,.callout,.note,.sig-box,td,th')) return;
    let host=field;
    if(field.parentElement&&field.parentElement.tagName==='P'&&field.parentElement.childNodes.length===1){
      host=field.parentElement;
    }
    edWrapLegacyQmsElement(host,'blankField',false);
  });
}

function edQmsFieldText(field){
  return String(field&&field.textContent||'')
    .replace(/\u200b/g,'')
    .replace(/\u00a0/g,' ')
    .trim();
}

function edSyncQmsFieldState(field){
  if(!field) return;
  const empty=edQmsFieldText(field)==='';
  field.classList.toggle('is-empty',empty);
}

function edNormalizeQmsField(field){
  if(!field||!(field instanceof Element)||field.closest('.ed-qms-toolbar')) return;
  const isBlock=field.tagName==='DIV'||field.classList.contains('input');
  field.classList.add('ed-qms-field');
  field.classList.toggle('ed-qms-block-field',isBlock);
  field.classList.toggle('ed-qms-inline-field',!isBlock);
  field.setAttribute('contenteditable','true');
  if(!field.getAttribute('data-placeholder')){
    field.setAttribute('data-placeholder',isBlock
      ? ((lang!=='en')?'Nhập nội dung':'Enter details')
      : ((lang!=='en')?'Điền nội dung':'Fill in'));
  }
  if(!isBlock && !field.style.minWidth) field.style.minWidth='72px';
  if(isBlock){
    if(field.style.height && !field.style.minHeight){
      field.style.minHeight=field.style.height;
      field.style.height='';
    }
    if(!field.style.minHeight) field.style.minHeight='36px';
  }
  if(!field.dataset.edInit){
    field.dataset.edInit='1';
    field.addEventListener('focus',function(){
      const block=field.closest('.ed-qms-block');
      if(block) edSelectQmsBlock(block);
      edSyncQmsFieldState(field);
    });
    field.addEventListener('click',function(){
      const block=field.closest('.ed-qms-block');
      if(block) edSelectQmsBlock(block);
    });
    field.addEventListener('input',function(){edSyncQmsFieldState(field);});
    field.addEventListener('blur',function(){edSyncQmsFieldState(field);});
  }
  edSyncQmsFieldState(field);
}

function edNormalizeQmsSignatureBoxes(ctx){
  if(!ctx||!ctx.querySelectorAll) return;
  ctx.querySelectorAll('.sig-box').forEach(function(box){
    Array.from(box.children).forEach(function(child){
      if(child.classList&&child.classList.contains('ed-qms-field')) return;
      if(child.classList&&(child.classList.contains('blank')||child.classList.contains('input'))) return;
      if(child.tagName==='DIV'&&!child.querySelector('*')&&edQmsFieldText(child)===''){
        child.classList.add('input');
        if(!child.getAttribute('data-placeholder')){
          child.setAttribute('data-placeholder',(lang!=='en')?'Điền tên, ký và ngày':'Enter name, signature, date');
        }
      }
    });
  });
}

function edDeselectAllQmsBlocks(){
  document.querySelectorAll('.ed-qms-block').forEach(function(block){
    block.classList.remove('ed-qms-selected');
    block.querySelectorAll('.ed-qms-toolbar').forEach(function(x){x.remove();});
  });
  window._edActiveQms=null;
}

function edBuildQmsToolbar(block){
  const vi=lang!=='en';
  const bar=document.createElement('div');
  bar.className='ed-qms-toolbar';
  bar.setAttribute('contenteditable','false');
  bar.setAttribute('data-kind-label',edQmsKindMeta((block&&block.dataset&&block.dataset.qmsKind)||'note').title);
  bar.addEventListener('mousedown',function(ev){ev.preventDefault();ev.stopPropagation();});
  bar.addEventListener('click',function(ev){ev.stopPropagation();});
  [
    {action:'edit',icon:'✎',title:vi?'Chỉnh sửa':'Edit',handler:function(){edFocusQmsBlock(block);}},
    {action:'duplicate',icon:'⧉',title:vi?'Nhân bản':'Duplicate',handler:function(){edDuplicateQmsBlock(block);}},
    {action:'delete',icon:'🗑',title:vi?'Xóa':'Delete',handler:function(){edDeleteQmsBlock(block);}}
  ].forEach(function(cfg){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='ed-qms-toolbtn'+(cfg.action==='delete'?' is-danger':'');
    btn.setAttribute('data-action',cfg.action);
    btn.setAttribute('title',cfg.title);
    btn.textContent=cfg.icon;
    btn.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      cfg.handler();
    });
    bar.appendChild(btn);
  });
  return bar;
}

function edSelectQmsBlock(block){
  if(!block) return;
  document.querySelectorAll('.ed-textbox .ed-tb-handle,.ed-textbox .ed-tb-bar').forEach(function(x){x.remove();});
  document.querySelectorAll('.ed-chart .ed-ch-bar,.ed-chart .ed-ch-handle').forEach(function(x){x.remove();});
  edDeselectAllShapes();
  edDeselectImg();
  edDeselectAllQmsBlocks();
  window._edActiveQms=block;
  block.classList.add('ed-qms-selected');
  block.appendChild(edBuildQmsToolbar(block));
}

function edFocusQmsBlock(block){
  if(!block) return;
  const target=block.querySelector('.ed-qms-field,.ed-qms-body');
  if(!target) return;
  try{
    target.focus();
    _edPlaceCaretAtStart(target);
    edSaveSelection();
  }catch(e){}
}

function edDeleteQmsBlock(block){
  if(!block||!block.parentNode) return;
  const next=block.nextElementSibling;
  if(edIsQmsSpacer(next)) next.remove();
  block.remove();
  window._edActiveQms=null;
  edMarkModified();
  edUpdateState();
}

function edDuplicateQmsBlock(block){
  if(!block||!block.parentNode) return;
  const clone=block.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.remove('ed-qms-selected');
  clone.querySelectorAll('.ed-qms-toolbar').forEach(function(x){x.remove();});
  let insertAfter=block;
  if(edIsQmsSpacer(block.nextElementSibling)) insertAfter=block.nextElementSibling;
  insertAfter.parentNode.insertBefore(clone,insertAfter.nextSibling);
  const spacer=document.createElement('p');
  spacer.innerHTML='<br>';
  clone.parentNode.insertBefore(spacer,clone.nextSibling);
  const ctx=clone.parentNode||document.getElementById('editor-area');
  if(ctx) edInitQmsBlocks(ctx);
  edSelectQmsBlock(clone);
  edFocusQmsBlock(clone);
  edMarkModified();
  edUpdateState();
}

function edQmsEditActive(block){
  if(!block) return false;
  try{
    const ae=document.activeElement;
    if(ae&&ae.closest&&ae.closest('.ed-qms-body,.ed-qms-field')&&block.contains(ae)) return true;
  }catch(e){}
  try{
    const sel=window.getSelection();
    if(sel&&sel.rangeCount){
      const node=sel.anchorNode;
      const el=node?(node.nodeType===1?node:node.parentElement):null;
      if(el&&el.closest&&el.closest('.ed-qms-body,.ed-qms-field')&&block.contains(el)) return true;
    }
  }catch(e2){}
  return false;
}

function edInitQmsBlocks(ctx){
  if(!ctx||!ctx.querySelectorAll) return;
  edWrapLegacyQmsBlocks(ctx);
  edNormalizeQmsSignatureBoxes(ctx);
  const blocks=[];
  if(ctx.matches&&ctx.matches('.ed-qms-block')) blocks.push(ctx);
  ctx.querySelectorAll('.ed-qms-block').forEach(function(block){blocks.push(block);});
  blocks.forEach(function(block){
    block.setAttribute('contenteditable','false');
    block.querySelectorAll('.ed-qms-toolbar').forEach(function(x){x.remove();});
    block.classList.remove('ed-qms-selected');
    const body=block.querySelector('.ed-qms-body');
    if(body){
      body.setAttribute('contenteditable','true');
      if(!body.dataset.edInit){
        body.dataset.edInit='1';
        body.addEventListener('focusin',function(){edSelectQmsBlock(block);});
        body.addEventListener('click',function(){edSelectQmsBlock(block);});
      }
    }
    if(!block.dataset.edInit){
      block.dataset.edInit='1';
      block.addEventListener('click',function(ev){
        if(ev.target.closest('.ed-qms-toolbar')) return;
        edSelectQmsBlock(block);
      });
    }
  });
  const fields=[];
  if(ctx.matches&&ctx.matches('.blank,.input,.ed-qms-field')) fields.push(ctx);
  ctx.querySelectorAll('.blank,.input,.ed-qms-field').forEach(function(field){fields.push(field);});
  fields.forEach(function(field){
    edNormalizeQmsField(field);
  });
}

// ═══════════════════════════════════════════════════
// TABLE CELL BACKGROUND COLOR
// ═══════════════════════════════════════════════════
function edTableCellColor(){
  const sel=window.getSelection();
  if(!sel.rangeCount)return;
  let node=sel.anchorNode;
  while(node&&node.tagName!=='TD'&&node.tagName!=='TH'&&node!==document.getElementById('editor-area'))node=node.parentElement;
  if(!node||node===document.getElementById('editor-area')||(node.tagName!=='TD'&&node.tagName!=='TH')){
    showToast(lang!=='en'?'⚠ Đặt con trỏ vào ô bảng trước':'⚠ Place cursor in a table cell first');return;
  }
  edGetModalRoot()._cellNode=node;
  edShowCellColorDialog('cell');
}

function edShowCellColorDialog(scope){
  const vi=lang!=='en';
  const root=edGetModalRoot();
  const scopeLabel={cell:vi?'Ô':'Cell',row:vi?'Hàng':'Row',col:vi?'Cột':'Column'}[scope];
  const colors=['transparent','#ffffff','#f3f3f3','#efefef','#d9d9d9','#cccccc','#b7b7b7','#999999',
   '#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc',
   '#f4cccc','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#a4c2f4','#9fc5e8',
   '#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6d9eeb','#6fa8dc','#8e7cc3',
   '#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3c78d8','#3d85c6','#674ea7',
   '#990000','#b45f06','#bf9000','#38761d','#134f5c','#1155cc','#0b5394','#351c75'];
  let html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal"><h4>🎨 '+(vi?'Màu nền — ':'Background — ')+scopeLabel+'</h4>';
  // Scope buttons
  html+='<div style="display:flex;gap:4px;margin-bottom:10px">';
  ['cell','row','col'].forEach(s=>{
    const lbl={cell:vi?'🔲 Ô':'🔲 Cell',row:vi?'☰ Hàng':'☰ Row',col:vi?'▥ Cột':'▥ Col'}[s];
    html+='<button style="flex:1;padding:6px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid '+(s===scope?'#1967d2':'#ddd')+';background:'+(s===scope?'#e8f0fe':'#fff')+';color:'+(s===scope?'#1967d2':'#666')+';cursor:pointer" onclick="edShowCellColorDialog(\''+s+'\')">'+lbl+'</button>';
  });
  html+='</div>';
  html+='<div class="ed-cpick-grid" style="margin:8px 0">';
  colors.forEach(c=>{
    const style=c==='transparent'?'background:linear-gradient(135deg,#fff 45%,#f00 45%,#f00 55%,#fff 55%)':'background:'+c;
    html+='<button style="'+style+';width:20px;height:20px" onclick="edApplyCellColor(\''+scope+'\',\''+c+'\')"></button>';
  });
  html+='</div><div class="ed-cpick-custom"><label>'+(vi?'Tùy chỉnh':'Custom')+'</label><input type="color" id="ed-cell-color" value="#ffffff"><button onclick="edApplyCellColor(\''+scope+'\',document.getElementById(\'ed-cell-color\').value)">OK</button></div>';
  html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Đóng':'Close')+'</button></div></div></div>';
  root.innerHTML=html;
}

function edApplyCellColor(scope,color){
  const node=edGetModalRoot()._cellNode;
  if(!node)return;
  const val=color==='transparent'?'':color;
  if(scope==='cell'){
    node.style.backgroundColor=val;
  }else if(scope==='row'){
    const tr=node.closest('tr');
    if(tr)tr.querySelectorAll('td,th').forEach(c=>c.style.backgroundColor=val);
  }else if(scope==='col'){
    const idx=Array.from(node.parentElement.children).indexOf(node);
    const table=node.closest('table');
    if(table)table.querySelectorAll('tr').forEach(tr=>{const c=tr.children[idx];if(c)c.style.backgroundColor=val;});
  }
  edMarkModified();edCloseModal();
}

function edSetCellBg(color){edApplyCellColor('cell',color);}

function edSetCellBgAll(){
  const node=edGetModalRoot()._cellNode;
  if(!node)return;
  const color=document.getElementById('ed-cell-color').value;
  const tr=node.closest('tr');
  if(tr)tr.querySelectorAll('td,th').forEach(c=>c.style.backgroundColor=color);
  edMarkModified();edCloseModal();
}



// ═══════════════════════════════════════════════════
// IMAGE RESIZE HANDLES (CKEditor-style)
// ═══════════════════════════════════════════════════
let edSelectedImg=null;
let edResizing=false;

function edSetupImageHandlers(){
  const area=document.getElementById('editor-area');
  area.addEventListener('click',function(e){
    // Deselect previous
    edDeselectImg();
    if(e.target.tagName==='IMG'){
      e.preventDefault();
      edSelectImg(e.target);
    }
  });
  area.addEventListener('keydown',function(e){
    if(edSelectedImg&&(e.key==='Delete'||e.key==='Backspace')){
      const wrap=edSelectedImg.closest('.ed-img-resize-wrap');
      if(wrap)wrap.remove();else edSelectedImg.remove();
      edSelectedImg=null;edMarkModified();e.preventDefault();
    }
  });
}

function edSelectImg(img){
  // Deselect any active shapes/textboxes/charts first
  edDeselectAllShapes();
  document.querySelectorAll('.ed-tb-handle,.ed-tb-bar,.ed-ch-handle,.ed-ch-bar').forEach(function(x){x.remove();});
  edDeselectAllQmsBlocks();
  edSelectedImg=img;
  // Wrap if not wrapped
  if(!img.parentElement.classList.contains('ed-img-resize-wrap')){
    const wrap=document.createElement('span');
    wrap.className='ed-img-resize-wrap';
    wrap.contentEditable='false';
    wrap.style.display='inline-block';
    wrap.style.position='relative';
    img.parentNode.insertBefore(wrap,img);
    wrap.appendChild(img);
  }
  const wrap=img.parentElement;
  // Clear old handles
  wrap.querySelectorAll('.ed-img-handle,.ed-img-size-tooltip,.ed-img-bar').forEach(e=>e.remove());
  img.classList.add('ed-img-selected');
  // Add handles
  ['tl','tr','bl','br','ml','mr'].forEach(pos=>{
    const h=document.createElement('span');
    h.className='ed-img-handle '+pos;
    h.contentEditable='false';
    h.addEventListener('mousedown',function(e){edStartResize(e,img,pos);});
    wrap.appendChild(h);
  });
  // Size tooltip
  const tip=document.createElement('span');
  tip.className='ed-img-size-tooltip';
  tip.textContent=Math.round(img.offsetWidth)+'×'+Math.round(img.offsetHeight);
  wrap.appendChild(tip);
  // Alignment bar
  const bar=document.createElement('div');
  bar.className='ed-img-bar';
  bar.contentEditable='false';
  bar.innerHTML='<button onclick="edImgAlign(\'left\')" title="Left">⫷</button><button onclick="edImgAlign(\'center\')" title="Center">☰</button><button onclick="edImgAlign(\'right\')" title="Right">⫸</button><button onclick="edImgAlign(\'none\')" title="Inline">↩</button><button onclick="edImgResize50()" title="50%">½</button><button onclick="edImgResize75()" title="75%">¾</button><button onclick="edImgResize100()" title="100%">1</button>';
  wrap.appendChild(bar);
}

function edDeselectImg(){
  if(edSelectedImg){
    edSelectedImg.classList.remove('ed-img-selected');
    const wrap=edSelectedImg.closest('.ed-img-resize-wrap');
    if(wrap){
      wrap.querySelectorAll('.ed-img-handle,.ed-img-size-tooltip,.ed-img-bar').forEach(function(e){e.remove();});
      // Unwrap image (remove wrapper, keep image)
      var parent=wrap.parentNode;
      if(parent){
        parent.insertBefore(edSelectedImg,wrap);
        wrap.remove();
      }
    }
    edSelectedImg=null;
  }
}

function edStartResize(e,img,pos){
  e.preventDefault();e.stopPropagation();
  edResizing=true;
  const startX=e.clientX,startY=e.clientY;
  const startW=img.offsetWidth,startH=img.offsetHeight;
  const ratio=startW/startH;
  function onMove(ev){
    const dx=ev.clientX-startX,dy=ev.clientY-startY;
    let nw=startW,nh=startH;
    if(pos==='br'){nw=startW+dx;nh=nw/ratio;}
    else if(pos==='bl'){nw=startW-dx;nh=nw/ratio;}
    else if(pos==='tr'){nw=startW+dx;nh=nw/ratio;}
    else if(pos==='tl'){nw=startW-dx;nh=nw/ratio;}
    else if(pos==='mr'){nw=startW+dx;nh=startH;}
    else if(pos==='ml'){nw=startW-dx;nh=startH;}
    nw=Math.max(30,nw);nh=Math.max(20,nh);
    img.style.width=Math.round(nw)+'px';
    img.style.height=(pos==='mr'||pos==='ml')?'auto':Math.round(nh)+'px';
    img.style.maxWidth='none';
    const tip=img.closest('.ed-img-resize-wrap').querySelector('.ed-img-size-tooltip');
    if(tip)tip.textContent=Math.round(nw)+'×'+Math.round(pos==='mr'||pos==='ml'?img.offsetHeight:nh);
  }
  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    edResizing=false;edMarkModified();
  }
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}

function edImgAlign(align){
  if(!edSelectedImg)return;
  const wrap=edSelectedImg.closest('.ed-img-resize-wrap')||edSelectedImg;
  wrap.style.display=align==='center'?'block':'inline-block';
  if(align==='left'){wrap.style.float='left';wrap.style.marginRight='12px';wrap.style.marginLeft='0';wrap.style.textAlign='';}
  else if(align==='right'){wrap.style.float='right';wrap.style.marginLeft='12px';wrap.style.marginRight='0';wrap.style.textAlign='';}
  else if(align==='center'){wrap.style.float='none';wrap.style.margin='8px auto';wrap.style.textAlign='center';}
  else{wrap.style.float='none';wrap.style.margin='';wrap.style.display='inline-block';wrap.style.textAlign='';}
  edMarkModified();
}
function _edImgUpdateTip(){
  if(!edSelectedImg)return;
  var wrap=edSelectedImg.closest('.ed-img-resize-wrap');
  if(wrap){var tip=wrap.querySelector('.ed-img-size-tooltip');if(tip)setTimeout(function(){tip.textContent=Math.round(edSelectedImg.offsetWidth)+'\u00d7'+Math.round(edSelectedImg.offsetHeight);},50);}
}
function edImgResize50(){if(edSelectedImg){var p=edSelectedImg.closest('.ed-page');if(p){edSelectedImg.style.width=Math.round(p.offsetWidth*.5)+'px';edSelectedImg.style.height='auto';edSelectedImg.style.maxWidth='none';edMarkModified();_edImgUpdateTip();}}}
function edImgResize75(){if(edSelectedImg){var p=edSelectedImg.closest('.ed-page');if(p){edSelectedImg.style.width=Math.round(p.offsetWidth*.75)+'px';edSelectedImg.style.height='auto';edSelectedImg.style.maxWidth='none';edMarkModified();_edImgUpdateTip();}}}
function edImgResize100(){if(edSelectedImg){edSelectedImg.style.width='100%';edSelectedImg.style.height='auto';edSelectedImg.style.maxWidth='100%';edMarkModified();_edImgUpdateTip();}}

// ═══════════════════════════════════════════════════
// TABLE CONTEXT MENU (Right-click)
// ═══════════════════════════════════════════════════

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TABLE COLUMN WIDTH ENGINE (colgroup-based)
// Fix: support tables WITH <colgroup> widths, allow drag + numeric width edits
// Applied globally in editor mode
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _edTableDefaults = new WeakMap();

function edTableSetAutofitState(table, mode, lock){
  if(!table || table.nodeType !== 1) return;
  var nextMode = String(mode || '').trim().toLowerCase();
  if(nextMode) table.setAttribute('data-ed-autofit', nextMode);
  else table.removeAttribute('data-ed-autofit');
  if(lock === true) table.setAttribute('data-ed-autofit-lock', '1');
  else if(lock === false) table.setAttribute('data-ed-autofit-lock', '0');
  else table.removeAttribute('data-ed-autofit-lock');
}

function edTableMarkFixed(table){
  if(!table || table.nodeType !== 1) return;
  table.style.tableLayout = 'fixed';
  table.classList.add('ed-tbl-fixed');
  edTableSetAutofitState(table, 'fixed', true);
}

function edTableMarkBalanced(table){
  if(!table || table.nodeType !== 1) return;
  table.classList.remove('ed-tbl-fixed');
  edTableSetAutofitState(table, 'balanced', false);
}

function edTableRememberDefaults(table){
  if(!table || _edTableDefaults.has(table)) return;
  // Capture only once per table per session (used for Reset / restore colgroup)
  var cg = null;
  for(var i=0;i<table.children.length;i++){
    if(table.children[i].tagName==='COLGROUP'){ cg = table.children[i]; break; }
  }
  _edTableDefaults.set(table,{
    width: table.style.width || '',
    tableLayout: table.style.tableLayout || '',
    fontSize: table.style.fontSize || '',
    marginLeft: table.style.marginLeft || '',
    marginRight: table.style.marginRight || '',
    autofit: table.getAttribute('data-ed-autofit') || '',
    autofitLock: table.getAttribute('data-ed-autofit-lock') || '',
    fixedClass: table.classList.contains('ed-tbl-fixed'),
    colgroupHTML: cg ? cg.outerHTML : null
  });
}

function edTableRestoreColgroup(table){
  if(!table) return;
  var d = _edTableDefaults.get(table);
  // Find current direct child colgroup
  var curCg = null;
  for(var i=0;i<table.children.length;i++){
    if(table.children[i].tagName==='COLGROUP'){ curCg = table.children[i]; break; }
  }
  if(d && d.colgroupHTML){
    var tmp = document.createElement('div');
    tmp.innerHTML = d.colgroupHTML;
    var newCg = tmp.firstElementChild;
    if(newCg){
      if(curCg) curCg.replaceWith(newCg);
      else table.insertBefore(newCg, table.firstChild);
    }
  } else {
    // No original colgroup: remove generated one, otherwise just clear widths
    if(curCg && curCg.getAttribute('data-ed-gen')==='1') curCg.remove();
    else if(curCg) curCg.querySelectorAll('col').forEach(function(col){ col.style.width=''; });
  }
}

function edTableRestoreDefaults(table){
  if(!table) return;
  var d = _edTableDefaults.get(table);

  // Always clear cell-level overrides
  table.querySelectorAll('td,th').forEach(function(c){
    c.style.width='';
    c.style.fontSize='';
  });

  table.classList.remove('ed-tbl-fixed');
  edTableSetAutofitState(table, '', null);

  if(!d){
    // Fallback: best-effort reset
    table.style.tableLayout='';
    table.style.width='100%';
    table.style.fontSize='';
    table.style.marginLeft='';
    table.style.marginRight='';
    edTableRestoreColgroup(table);
    return;
  }

  table.style.width = d.width || '';
  table.style.tableLayout = d.tableLayout || '';
  table.style.fontSize = d.fontSize || '';
  table.style.marginLeft = d.marginLeft || '';
  table.style.marginRight = d.marginRight || '';
  if(d.fixedClass) table.classList.add('ed-tbl-fixed');
  else table.classList.remove('ed-tbl-fixed');
  edTableSetAutofitState(
    table,
    d.autofit || '',
    d.autofitLock==='' ? null : (d.autofitLock === '1')
  );

  edTableRestoreColgroup(table);
}

function edTableGetColCount(table){
  if(!table) return 0;
  var max = 0;
  Array.from(table.rows || []).forEach(function(row){
    var n = 0;
    Array.from(row.cells || []).forEach(function(cell){
      var cs = parseInt(cell.getAttribute('colspan') || cell.colSpan || 1, 10);
      n += (isFinite(cs) && cs>0) ? cs : 1;
    });
    if(n > max) max = n;
  });
  return max;
}

function edTableGetColStartIndex(cell){
  if(!cell || !cell.parentElement) return 0;
  var idx = 0;
  var n = cell.parentElement.firstElementChild;
  while(n && n !== cell){
    if(n.tagName==='TD' || n.tagName==='TH'){
      var cs = parseInt(n.getAttribute('colspan') || n.colSpan || 1, 10);
      idx += (isFinite(cs) && cs>0) ? cs : 1;
    }
    n = n.nextElementSibling;
  }
  return idx;
}

function edTableMeasureColWidths(table, colCount){
  var widths = new Array(colCount).fill(0);
  if(!table || !colCount) return widths;
  var firstRow = table.querySelector('tr');
  var tw = Math.round(table.getBoundingClientRect().width) || table.offsetWidth || 600;
  var avg = tw / Math.max(1, colCount);

  if(!firstRow) return widths.map(function(){return avg;});

  var col = 0;
  Array.from(firstRow.children).forEach(function(cell){
    if(cell.tagName!=='TD' && cell.tagName!=='TH') return;
    var span = parseInt(cell.getAttribute('colspan') || cell.colSpan || 1, 10);
    span = (isFinite(span) && span>0) ? span : 1;
    var w = cell.getBoundingClientRect().width || cell.offsetWidth || avg*span;
    var per = w / span;
    for(var s=0;s<span;s++){
      if((col+s) < colCount) widths[col+s] = per;
    }
    col += span;
  });

  for(var i=0;i<colCount;i++){
    if(!widths[i] || widths[i] < 1) widths[i] = avg;
  }
  return widths;
}

function edTableEnsureColgroup(table, colCount){
  // Find direct child <colgroup>
  var cg = null;
  for(var i=0;i<table.children.length;i++){
    if(table.children[i].tagName==='COLGROUP'){ cg = table.children[i]; break; }
  }
  if(!cg){
    cg = document.createElement('colgroup');
    cg.setAttribute('data-ed-gen','1');
    table.insertBefore(cg, table.firstChild);
  }

  // Normalize number of <col>
  var cols = Array.from(cg.children).filter(function(n){ return n.tagName==='COL'; });
  while(cols.length < colCount){
    var col = document.createElement('col');
    cg.appendChild(col);
    cols.push(col);
  }
  while(cols.length > colCount){
    cols[cols.length-1].remove();
    cols.pop();
  }
  return { cg: cg, cols: cols };
}

function edTableGetColWidthsPx(table, colCount){
  var ens = edTableEnsureColgroup(table, colCount);
  var cols = ens.cols;
  var measured = edTableMeasureColWidths(table, colCount);
  var tw = Math.round(table.getBoundingClientRect().width) || table.offsetWidth || measured.reduce(function(a,b){return a+b;},0) || 600;

  return cols.map(function(col, i){
    var w = (col.style.width || '').trim();
    if(w.endsWith('px')) {
      var px = parseFloat(w);
      return (isFinite(px) && px>0) ? px : measured[i];
    }
    if(w.endsWith('%')) {
      var pct = parseFloat(w);
      return (isFinite(pct) && pct>0) ? (tw * pct / 100) : measured[i];
    }
    return measured[i];
  });
}

function edTableApplyFixed(table){
  edTableRememberDefaults(table);
  if(!table) return;

  var colCount = edTableGetColCount(table);
  if(!colCount) return;

  var tw = Math.round(table.getBoundingClientRect().width) || table.offsetWidth || 600;
  var widths = edTableMeasureColWidths(table, colCount).map(function(w){
    return Math.max(25, Math.round(w));
  });

  var ens = edTableEnsureColgroup(table, colCount);
  var cols = ens.cols;

  // Clear cell-level width overrides to avoid conflicts with colgroup widths
  table.querySelectorAll('td,th').forEach(function(c){ c.style.width=''; });

  cols.forEach(function(col, i){ col.style.width = widths[i] + 'px'; });

  edTableMarkFixed(table);
  table.style.width = tw + 'px';
}

function edTableSetColWidth(table, idx, newPx){
  if(!table) return;
  var colCount = edTableGetColCount(table);
  if(!colCount || idx<0 || idx>=colCount) return;

  // Ensure fixed mode
  if(getComputedStyle(table).tableLayout !== 'fixed' || !(table.style.width && table.style.width.indexOf('px')>-1)){
    edTableApplyFixed(table);
  }else{
    edTableEnsureColgroup(table, colCount);
    edTableMarkFixed(table);
  }

  var minW = 25;
  newPx = Math.max(minW, parseInt(newPx || 0, 10) || minW);

  var ens = edTableEnsureColgroup(table, colCount);
  var cols = ens.cols;

  var widths = edTableGetColWidthsPx(table, colCount).map(function(w){ return Math.max(minW, Math.round(w)); });

  var oldW = widths[idx];
  var neighbor = (idx < colCount-1) ? (idx+1) : (idx-1);

  if(neighbor >= 0 && neighbor < colCount){
    var delta = newPx - oldW;
    var neighW = widths[neighbor] - delta;

    // Clamp neighbor, adjust delta accordingly
    if(neighW < minW){
      neighW = minW;
      delta = widths[neighbor] - neighW;
      newPx = oldW + delta;
    }
    widths[idx] = Math.max(minW, newPx);
    widths[neighbor] = Math.max(minW, neighW);
  } else {
    widths[idx] = Math.max(minW, newPx);
  }

  // Apply
  cols.forEach(function(col, i){ col.style.width = widths[i] + 'px'; });

  // Keep table width consistent with total columns (avoids browser re-distribution)
  var sum = widths.reduce(function(a,b){ return a + b; }, 0);
  table.style.width = Math.max(120, Math.round(sum)) + 'px';
  edTableMarkFixed(table);

  edTableUpdateActiveBar(table);
}

function edTableSetTableWidthPx(table, newTableW){
  if(!table) return;
  var w = Math.max(120, parseInt(newTableW || 0, 10) || 0);
  if(!w) return;

  var colCount = edTableGetColCount(table);
  if(!colCount){ table.style.width = w + 'px'; return; }

  // Ensure fixed mode and colgroup
  if(getComputedStyle(table).tableLayout !== 'fixed' || !(table.style.width && table.style.width.indexOf('px')>-1)){
    edTableApplyFixed(table);
  }else{
    edTableEnsureColgroup(table, colCount);
  }

  var ens = edTableEnsureColgroup(table, colCount);
  var cols = ens.cols;
  var minW = 25;

  var widths = edTableGetColWidthsPx(table, colCount).map(function(x){ return Math.max(minW, Math.round(x)); });
  var sum = widths.reduce(function(a,b){ return a+b; }, 0);

  var diff = w - sum;
  if(diff !== 0){
    // Adjust last columns to fit new table width (practical behavior)
    for(var i=colCount-1; i>=0 && diff!==0; i--){
      var can = widths[i] + diff;
      if(can < minW){
        diff += (widths[i] - minW);
        widths[i] = minW;
      }else{
        widths[i] = can;
        diff = 0;
      }
    }
  }

  cols.forEach(function(col, i){ col.style.width = Math.round(widths[i]) + 'px'; });
  table.style.width = w + 'px';
  edTableMarkFixed(table);

  edTableUpdateActiveBar(table);
}

function edTableUpdateActiveBar(table){
  // Sync numeric inputs if the floating bar is visible for this table
  document.querySelectorAll('.ed-tbl-float-bar').forEach(function(bar){
    if(bar._table !== table) return;

    var colCount = edTableGetColCount(table);
    if(!colCount) return;
    var ens = edTableEnsureColgroup(table, colCount);
    var cols = ens.cols;

    bar.querySelectorAll('input[data-ed-col]').forEach(function(inp){
      var idx = parseInt(inp.getAttribute('data-ed-col') || '-1', 10);
      if(!(idx>=0 && idx<cols.length)) return;
      var w = (cols[idx].style.width || '').trim();
      if(w.endsWith('px')) inp.value = Math.max(20, Math.round(parseFloat(w)));
    });

    var pxInp = bar.querySelector('input[data-ed-tbl-width-px]');
    if(pxInp && table.style.width && table.style.width.indexOf('px')>-1){
      pxInp.value = Math.round(parseFloat(table.style.width));
    }
  });
}

function edTableSyncColgroupCount(table){
  // Keep <colgroup><col> count in sync after add/del column (best-effort)
  if(!table) return;
  var colCount = edTableGetColCount(table);
  if(!colCount) return;

  var hasCg = false;
  for(var i=0;i<table.children.length;i++){
    if(table.children[i].tagName==='COLGROUP'){ hasCg = true; break; }
  }
  var autoBalanced = _edTableIsBalancedAuto(table);
  var isFixed = !autoBalanced && edTableHasManualFixedLayout(table);
  if(!hasCg && !isFixed && !autoBalanced) return;

  if(autoBalanced){
    try{ edTableEnsureColgroup(table, colCount); }catch(_e){}
    try{ edTableApplyAutoPolicy(table, {force:true, source:'sync-colgroup'}); }catch(_e){}
    edTableUpdateActiveBar(table);
    return;
  }

  var ens = edTableEnsureColgroup(table, colCount);
  if(isFixed){
    // Re-measure and apply widths (stable after structural change)
    var widths = edTableMeasureColWidths(table, colCount).map(function(w){ return Math.max(25, Math.round(w)); });
    ens.cols.forEach(function(col, i){ col.style.width = widths[i] + 'px'; });
    var sum = widths.reduce(function(a,b){return a+b;},0);
    table.style.width = Math.max(120, Math.round(sum)) + 'px';
    edTableMarkFixed(table);
  }
  edTableUpdateActiveBar(table);
}

function _edTableParseSpan(cell, name){
  if(!cell) return 1;
  var prop = (name === 'rowspan') ? cell.rowSpan : cell.colSpan;
  var raw = cell.getAttribute(name);
  var n = parseInt(raw || prop || 1, 10);
  return (isFinite(n) && n > 0) ? n : 1;
}

function _edTableBuildAnchors(table){
  var rows = Array.from((table && table.rows) || []);
  var grid = [];
  var anchors = [];
  rows.forEach(function(row, rowIdx){
    if(!grid[rowIdx]) grid[rowIdx] = [];
    var col = 0;
    Array.from(row.cells || []).forEach(function(cell){
      while(grid[rowIdx][col]) col++;
      var rs = _edTableParseSpan(cell, 'rowspan');
      var cs = _edTableParseSpan(cell, 'colspan');
      anchors.push({ cell: cell, row: rowIdx, col: col, rowspan: rs, colspan: cs });
      for(var r=rowIdx; r<rowIdx+rs; r++){
        if(!grid[r]) grid[r] = [];
        for(var c=col; c<col+cs; c++) grid[r][c] = cell;
      }
      col += cs;
    });
  });
  var width = 0;
  grid.forEach(function(r){ if(r && r.length > width) width = r.length; });
  return { anchors: anchors, colCount: Math.max(1, width) };
}

function _edTableCellWeight(cell){
  if(!cell) return 1;
  var txt = String(cell.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  var len = txt.length;
  var longest = 0;
  if(len){
    txt.split(' ').forEach(function(tok){
      if(tok.length > longest) longest = tok.length;
    });
  }
  var weight = 1 + (Math.min(240, len) / 30) + (Math.min(160, longest) / 45);
  if(cell.tagName === 'TH') weight *= 1.1;
  if(cell.querySelector('img,svg,canvas,video,iframe,table')) weight += 3;
  if(cell.querySelector('input,select,textarea,.blank,.check,.chk')) weight += 1.5;
  return Math.max(0.25, weight);
}

function _edTableBalancedPercents(table, colCount){
  var count = Math.max(1, parseInt(colCount || 0, 10) || 1);
  var weights = new Array(count).fill(1);
  var info = _edTableBuildAnchors(table);
  info.anchors.forEach(function(a){
    var start = Math.max(0, Math.min(count - 1, a.col));
    var span = Math.max(1, Math.min(count - start, a.colspan || 1));
    var part = _edTableCellWeight(a.cell) / span;
    for(var i=0; i<span; i++){
      var idx = start + i;
      if(idx >= 0 && idx < count) weights[idx] += part;
    }
  });

  var sum = weights.reduce(function(acc, val){ return acc + val; }, 0);
  if(!sum || sum < 0.0001) return new Array(count).fill(100 / count);

  var minPct = (count >= 10) ? 3.5 : (count >= 8 ? 4.5 : (count >= 6 ? 6 : 8));
  var maxPct = (count <= 3) ? 72 : (count <= 5 ? 52 : (count <= 8 ? 40 : 30));
  var pct = weights.map(function(w){ return (w / sum) * 100; });

  // Two clamp passes are enough to stabilize while keeping sum=100%.
  for(var pass=0; pass<2; pass++){
    for(var j=0; j<pct.length; j++){
      pct[j] = Math.max(minPct, Math.min(maxPct, pct[j]));
    }
    var s2 = pct.reduce(function(acc, val){ return acc + val; }, 0) || 100;
    pct = pct.map(function(v){ return (v / s2) * 100; });
  }

  var out = pct.map(function(v){ return Math.max(0.1, Math.round(v * 100) / 100); });
  var s3 = out.reduce(function(acc, val){ return acc + val; }, 0) || 100;
  var diff = Math.round((100 - s3) * 100) / 100;
  out[out.length - 1] = Math.max(0.1, Math.round((out[out.length - 1] + diff) * 100) / 100);
  return out;
}

function _edTableIsBalancedAuto(table){
  if(!table || table.nodeType !== 1) return false;
  if(table.getAttribute('data-ed-autofit') !== 'balanced') return false;
  return table.getAttribute('data-ed-autofit-lock') !== '1';
}

function edTableHasManualFixedLayout(table){
  if(!table || table.nodeType !== 1) return false;
  if(_edTableIsBalancedAuto(table)) return false;

  var mode = String(table.getAttribute('data-ed-autofit') || '').toLowerCase();
  if(mode === 'fixed') return true;
  if(table.getAttribute('data-ed-autofit-lock') === '1') return true;

  var styleLayout = String(table.style.tableLayout || '').toLowerCase();
  var styleWidth = String(table.style.width || '').trim().toLowerCase();
  if(styleLayout === 'fixed' && (table.classList.contains('ed-tbl-fixed') || /px$/.test(styleWidth))){
    return true;
  }

  for(var i=0;i<table.children.length;i++){
    if(table.children[i].tagName !== 'COLGROUP') continue;
    var cols = Array.from(table.children[i].querySelectorAll('col'));
    for(var j=0;j<cols.length;j++){
      if(/^\d+(\.\d+)?px$/i.test(String(cols[j].style.width || '').trim())) return true;
    }
    break;
  }
  return false;
}

function edTableApplyAutoPolicy(table, opts){
  if(!table || table.nodeType !== 1) return false;
  if(table.closest('.ed-modal-overlay,.ed-tbl-float-bar')) return false;
  opts = opts || {};
  var force = !!opts.force;
  var overrideManual = !!opts.overrideManual;
  if(edTableHasManualFixedLayout(table) && !overrideManual) return false;
  if(!force && table.getAttribute('data-ed-autofit-lock') === '1') return false;

  var colCount = edTableGetColCount(table);
  if(!colCount) return false;

  table.removeAttribute('width');
  table.style.width = '100%';
  table.style.maxWidth = '100%';
  table.style.minWidth = '0';
  table.style.tableLayout = 'fixed';
  edTableMarkBalanced(table);

  table.querySelectorAll('colgroup col').forEach(function(col){
    if(col.hasAttribute('width')) col.removeAttribute('width');
  });

  table.querySelectorAll('td,th').forEach(function(cell){
    var w = String(cell.style.width || '').trim().toLowerCase();
    var mw = String(cell.style.maxWidth || '').trim().toLowerCase();
    var minw = String(cell.style.minWidth || '').trim().toLowerCase();
    if(/(px|pt|cm|mm|in)$/.test(w)) cell.style.width = '';
    if(/(px|pt|cm|mm|in)$/.test(mw)) cell.style.maxWidth = '';
    if(/(px|pt|cm|mm|in)$/.test(minw)) cell.style.minWidth = '';
    if(cell.hasAttribute('width')) cell.removeAttribute('width');
    if(cell.hasAttribute('nowrap')) cell.removeAttribute('nowrap');
    if(String(cell.style.whiteSpace || '').trim().toLowerCase() === 'nowrap'){
      cell.style.whiteSpace = '';
    }
    cell.style.overflowWrap = 'anywhere';
    cell.style.wordBreak = 'break-word';
  });

  var percents = _edTableBalancedPercents(table, colCount);
  try{
    var ens = edTableEnsureColgroup(table, colCount);
    if(ens && ens.cols && ens.cols.length){
      ens.cols.forEach(function(col, idx){
        var p = percents[idx];
        if(!(isFinite(p) && p > 0)) p = 100 / colCount;
        col.style.width = p.toFixed(2) + '%';
      });
    }
  }catch(e){}
  return true;
}

function edNormalizeTableDom(table){
  if(!table || !(table instanceof Element)) return false;
  var changed = false;
  table.querySelectorAll('td,th').forEach(function(cell){
    if(!cell || !(cell instanceof Element)) return;
    var txt = String(cell.textContent || '').replace(/\u00a0/g,' ').trim();
    var hasRich = !!cell.querySelector('img,svg,canvas,table,ul,ol,pre,code,iframe,video,audio,input,textarea,select,button');
    if(!txt && !hasRich){
      var compact = String(cell.innerHTML || '').replace(/\s|&nbsp;|&#160;|<br\s*\/?>/gi,'');
      if(compact !== ''){
        cell.innerHTML = '<br>';
        changed = true;
      }else if(String(cell.innerHTML || '').trim().toLowerCase() !== '<br>'){
        cell.innerHTML = '<br>';
        changed = true;
      }
    }
    if(!String(cell.style.overflowWrap || '').trim()){
      cell.style.overflowWrap = 'anywhere';
      changed = true;
    }
    if(!String(cell.style.wordBreak || '').trim()){
      cell.style.wordBreak = 'break-word';
      changed = true;
    }
  });
  var isConnected = !!table.isConnected;
  if(!isConnected){
    try{
      var docEl = table.ownerDocument && table.ownerDocument.documentElement;
      isConnected = !!(docEl && docEl.contains(table));
    }catch(_e){ isConnected = false; }
  }
  if(isConnected){
    try{ edTableSyncColgroupCount(table); }catch(_e){}
  }
  return changed;
}

function edApplyGlobalTablePolicy(root, opts){
  var ctx = root || null;
  if(!ctx){
    var area = document.getElementById('editor-area');
    ctx = edGetContentRoot() || area || document;
  }
  var tables = [];
  if(ctx.querySelectorAll) tables = Array.from(ctx.querySelectorAll('table'));
  else if(ctx.getElementsByTagName) tables = Array.from(ctx.getElementsByTagName('table'));

  var changed = 0;
  tables.forEach(function(table){
    var touched = false;
    try{ if(edNormalizeTableDom(table)) touched = true; }catch(_e){}
    try{ if(edTableApplyAutoPolicy(table, opts)) touched = true; }catch(_e){}
    if(touched) changed++;
  });
  return { total: tables.length, changed: changed };
}

function edApplyGlobalTablePolicyToDocument(doc, opts){
  if(!doc) return { total: 0, changed: 0 };
  var root = null;
  try{
    root = doc.getElementById('docContent') || doc.querySelector('.doc-content,.form-sheet,body') || doc.body || doc;
  }catch(e){
    root = doc;
  }
  return edApplyGlobalTablePolicy(root, opts);
}

function edShowTableBar(table){
  document.querySelectorAll('.ed-tbl-float-bar').forEach(function(b){b.remove();});
  var bar=document.createElement('div');bar.className='ed-tbl-float-bar';bar.contentEditable='false';
  bar.setAttribute('data-no-edit','true');
  bar.style.cssText='position:fixed;display:flex;gap:5px;background:#fff;border:1px solid #c9cdd3;border-radius:8px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,.15);z-index:999990;align-items:center;flex-wrap:wrap;max-width:92vw;user-select:none';

  // Remember defaults for Reset / restore colgroup (ONLY once per session)
  edTableRememberDefaults(table);

  // *** CRITICAL: block event propagation from bar (bubble phase) ***
  // Using bubble phase so events still reach child elements (inputs, selects, buttons)
  ['mousedown','mouseup','click','pointerdown','pointerup','touchstart'].forEach(function(evt){
    bar.addEventListener(evt,function(ev){ev.stopPropagation();},false);
  });

  var vi=lang!=='en';

  // === Helper: separator ===
  function mkSep(){var s=document.createElement('span');s.style.cssText='width:1px;height:18px;background:#d1d5db;margin:0 3px;flex-shrink:0';return s;}

  // === Helper: label ===
  function mkLbl(txt){var l=document.createElement('span');l.textContent=txt;l.style.cssText='font-weight:700;font-size:10px;color:#475569;white-space:nowrap';return l;}

  // === Helper: button ===
  function mkBtn(label,tip,fn,extraCSS){
    var b=document.createElement('button');b.type='button';b.textContent=label;b.title=tip||label;
    b.style.cssText='height:26px;min-width:26px;padding:0 7px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;color:#475569;white-space:nowrap;'+(extraCSS||'');
    b.onmouseover=function(){this.style.background='#e0ecff';};
    b.onmouseout=function(){this.style.background=extraCSS&&extraCSS.indexOf('background')>=0?'':'#f8fafc';};
    b.onclick=function(ev){ev.preventDefault();fn();};
    return b;
  }

  // === Helper: number input ===
  function mkNumInput(val,w,tip,onChange){
    var inp=document.createElement('input');inp.type='number';inp.value=val;inp.min=20;
    inp.title=tip||'';
    inp.style.cssText='width:'+(w||50)+'px;height:26px;padding:0 4px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;text-align:center;background:#fff;outline:none;-moz-appearance:textfield';
    inp.onfocus=function(){this.select();};
    inp.onchange=function(){onChange(this);};
    return inp;
  }

  // ═══ 1) TABLE WIDTH (bề rộng bảng) ═══
  bar.appendChild(mkLbl(vi?'Bảng:':'Table:'));

  var tblW = Math.round(table.getBoundingClientRect().width) || table.offsetWidth || 600;
  var parentW = (table.parentElement?Math.round(table.parentElement.getBoundingClientRect().width):tblW) || tblW;
  var curWPct = Math.round(tblW/parentW*100);
  curWPct = Math.max(10, Math.min(100, curWPct));

  var isFixed = edTableHasManualFixedLayout(table);
  var isPx = isFixed && (table.style.width && table.style.width.indexOf('px')>-1);

  // Width mode select: %, px
  var wModeSel=document.createElement('select');
  wModeSel.style.cssText='height:26px;padding:0 2px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;cursor:pointer;background:#fff;outline:none';

  var wModes=[{v:'100',t:'100%'},{v:'90',t:'90%'},{v:'80',t:'80%'},{v:'70',t:'70%'},{v:'60',t:'60%'},{v:'50',t:'50%'},{v:'px',t:'px'}];
  wModes.forEach(function(m){
    var o=document.createElement('option');o.value=m.v;o.textContent=m.t;
    if(m.v==='px' && isPx){o.selected=true;}
    else if(m.v!=='px' && !isPx && parseInt(m.v,10)===curWPct){o.selected=true;}
    wModeSel.appendChild(o);
  });

  // PX width input (shown only when px mode)
  var pxInp=mkNumInput(isPx?Math.round(parseFloat(table.style.width)||tblW):tblW,65,vi?'Bề rộng (px)':'Width (px)',function(inp){
    // When editing px width, keep column widths consistent by adjusting last column
    edTableSetTableWidthPx(table, inp.value);
    edMarkModified();
  });
  pxInp.setAttribute('data-ed-tbl-width-px','1');
  pxInp.style.display=isPx?'':'none';

  wModeSel.onchange=function(){
    var v=this.value;
    if(v==='px'){
      // Convert to fixed layout with px columns (works even when <colgroup> exists)
      edTableApplyFixed(table);
      // Ensure px width input visible + synced
      pxInp.value = Math.round(parseFloat(table.style.width) || tblW);
      pxInp.style.display='';
    } else {
      // Percent width mode: restore original colgroup widths, clear fixed overrides
      table.style.width=v+'%';
      table.style.tableLayout='auto';
      edTableMarkBalanced(table);
      table.querySelectorAll('td,th').forEach(function(c){c.style.width='';});
      edTableRestoreColgroup(table);
      pxInp.style.display='none';
    }
    edMarkModified();
    edTableUpdateActiveBar(table);
  };

  bar.appendChild(wModeSel);
  bar.appendChild(pxInp);
  bar.appendChild(mkSep());

  // ═══ 2) FONT SIZE ═══
  bar.appendChild(mkLbl(vi?'Chữ:':'Font:'));
  var curFs=Math.round(parseFloat(getComputedStyle(table).fontSize))||12;
  var fsSel=document.createElement('select');
  fsSel.style.cssText='height:26px;padding:0 4px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;cursor:pointer;background:#fff;outline:none';
  [7,8,9,10,11,12,13,14,16,18].forEach(function(s){
    var o=document.createElement('option');o.value=s;o.textContent=s+'px';
    if(s===curFs)o.selected=true;
    fsSel.appendChild(o);
  });
  fsSel.onchange=function(){
    var sz=this.value+'px';
    table.style.fontSize=sz;
    table.querySelectorAll('td,th').forEach(function(c){c.style.fontSize=sz;});
    edMarkModified();
  };
  bar.appendChild(fsSel);
  bar.appendChild(mkSep());

  // ═══ 3) COLUMN WIDTHS (works with/without colgroup) ═══
  var colCount = edTableGetColCount(table);
  if(colCount>0 && colCount<=12){
    bar.appendChild(mkLbl(vi?'Cột:':'Col:'));
    var widthsPx = edTableGetColWidthsPx(table, colCount).map(function(w){return Math.max(20, Math.round(w));});
    for(var i=0;i<colCount;i++){
      (function(colIdx){
        var inp=mkNumInput(widthsPx[colIdx],48,'C'+(colIdx+1),function(el){
          // Auto-switch to fixed layout when user sets column width
          if(getComputedStyle(table).tableLayout!=='fixed' || !(table.style.width && table.style.width.indexOf('px')>-1)){
            edTableApplyFixed(table);
            // Update the table width select
            wModeSel.value='px';
            pxInp.value=Math.round(parseFloat(table.style.width)||table.getBoundingClientRect().width);
            pxInp.style.display='';
          }
          edTableSetColWidth(table, colIdx, el.value);
          edMarkModified();
        });
        inp.setAttribute('data-ed-col', String(colIdx));
        inp.style.width='44px';inp.style.fontSize='10px';
        bar.appendChild(inp);
      })(i);
    }
    bar.appendChild(mkSep());
  }

  // ═══ 4) ALIGNMENT ═══
  bar.appendChild(mkBtn('◧',vi?'Trái':'Left',function(){table.style.marginLeft='';table.style.marginRight='';edMarkModified();}));
  bar.appendChild(mkBtn('◫',vi?'Giữa':'Center',function(){table.style.marginLeft='auto';table.style.marginRight='auto';edMarkModified();}));
  bar.appendChild(mkBtn('◨',vi?'Phải':'Right',function(){table.style.marginLeft='auto';table.style.marginRight='0';edMarkModified();}));
  bar.appendChild(mkSep());

  // ═══ 5) RESET ═══
  bar.appendChild(mkBtn('↺ Reset',vi?'Đặt lại mặc định':'Reset to default',function(){
    edTableRestoreDefaults(table);
    edMarkModified();
    edShowTableBar(table); // rebuild UI + refresh values
  },'color:#dc2626;border-color:#fca5a5;background:#fef2f2'));

  // ═══ Position bar above table ═══
  document.body.appendChild(bar);
  bar._table=table;
  function posBar(){
    var r=table.getBoundingClientRect();
    var bw=bar.offsetWidth||300;
    bar.style.top=Math.max(4,r.top-44)+'px';
    bar.style.left=Math.max(4,Math.min(r.left+r.width/2-bw/2,window.innerWidth-bw-8))+'px';
  }
  requestAnimationFrame(posBar);

  // Reposition on scroll
  var pw=document.getElementById('ed-page-wrap');
  if(pw){
    var _repo=function(){posBar();};
    pw.addEventListener('scroll',_repo);
    var obs=new MutationObserver(function(muts){muts.forEach(function(m){m.removedNodes.forEach(function(n){if(n===bar){pw.removeEventListener('scroll',_repo);obs.disconnect();}});});});
    obs.observe(bar.parentNode||document.body,{childList:true});
  }
}

function edSetupTableContext(){
  const area=document.getElementById('editor-area');
  area.addEventListener('click',function(e){
    // Don't remove bar if clicking inside it or its children
    if(e.target.closest('.ed-tbl-float-bar'))return;
    var tbl=e.target.closest('table');
    document.querySelectorAll('.ed-tbl-float-bar').forEach(function(b){b.remove();});
    if(tbl&&editMode)edShowTableBar(tbl);
  });
  // Also handle clicks outside editor that should dismiss the bar
  document.addEventListener('click',function(e){
    if(e.target.closest('.ed-tbl-float-bar'))return;
    if(e.target.closest('#editor-area'))return; // handled by area handler above
    if(!e.target.closest('#editor-container'))document.querySelectorAll('.ed-tbl-float-bar').forEach(function(b){b.remove();});
  });
  area.addEventListener('contextmenu',function(e){
    let node=e.target;
    while(node&&node!==area&&node.tagName!=='TD'&&node.tagName!=='TH')node=node.parentElement;
    if(!node||node===area||(node.tagName!=='TD'&&node.tagName!=='TH'))return;
    e.preventDefault();
    edShowTableMenu(e.clientX,e.clientY,node);
  });
}

function edShowTableMenu(x,y,cell){
  edCloseCtxMenu();
  const vi=lang!=='en';
  const menu=document.createElement('div');
  menu.className='ed-ctx-menu';
  menu.id='ed-ctx-menu';
  menu.style.top=y+'px';
  menu.style.left=Math.min(x,window.innerWidth-210)+'px';
  const table=cell.closest('table');
  const tr=cell.closest('tr');
  const cellIdx=Array.from(tr.children).indexOf(cell);
  
  const _b=function(cmd,ico,tip,danger){return '<button onclick="'+cmd+'" title="'+tip+'" style="width:28px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:4px;background:none;cursor:pointer;padding:0;font-size:13px'+(danger?';color:#dc2626':'')+'"onmouseover="this.style.background=\''+(danger?'#fee2e2':'#e8f0fe')+'\'"onmouseout="this.style.background=\'none\'">'+ico+'</button>';};
  const _s='<span style="width:1px;height:18px;background:#e2e8f0;margin:0 1px;flex-shrink:0"></span>';
  const _g=function(l){return '<span style="font-size:7px;color:#94a3b8;padding:0 2px;font-weight:700;letter-spacing:.5px">'+l+'</span>';};
  menu.style.minWidth='auto';menu.style.width='auto';menu.style.padding='0';menu.style.borderRadius='8px';
  menu.innerHTML=`<div style="display:flex;align-items:center;gap:1px;padding:5px 6px;flex-wrap:wrap;max-width:400px">
    ${_g(vi?'HG':'ROW')}${_b("edTblAddRow('above')","↑",vi?'Thêm hàng trên':'Row above')}${_b("edTblAddRow('below')","↓",vi?'Thêm hàng dưới':'Row below')}${_b("edTblDelRow()","✕",vi?'Xóa hàng':'Del row',1)}${_s}${_g(vi?'CT':'COL')}${_b("edTblAddCol('before')","←",vi?'Thêm cột trái':'Col left')}${_b("edTblAddCol('after')","→",vi?'Thêm cột phải':'Col right')}${_b("edTblDelCol()","✕",vi?'Xóa cột':'Del col',1)}${_s}${_g(vi?'CĂN':'AL')}${_b("edTblCellAlign('left')","◧",vi?'Trái':'Left')}${_b("edTblCellAlign('center')","◫",vi?'Giữa':'Center')}${_b("edTblCellAlign('right')","◨",vi?'Phải':'Right')}${_b("edTblVertAlign('top')","⬆",vi?'Trên':'Top')}${_b("edTblVertAlign('middle')","⬌",vi?'Giữa dọc':'Mid')}${_s}${_g(vi?'GỘP':'MG')}${_b("edTblMergeRight()","⇥",vi?'Gộp phải':'Merge →')}${_b("edTblMergeDown()","⇩",vi?'Gộp dưới':'Merge ↓')}${_b("edTblSplitCell()","⊞",vi?'Tách':'Split')}${_s}${_g(vi?'MÀU':'CLR')}${_b("edTblCellBg()","🎨",vi?'Màu ô':'Cell')}${_b("edTblRowBgPicker()","☰",vi?'Màu hàng':'Row')}${_b("edTblColBgPicker()","▥",vi?'Màu cột':'Col')}${_s}${_b("edTblBorderPicker()","▢",vi?'Viền':'Border')}${_b("edTblRadiusPicker()","◔",vi?'Bo góc':'Radius')}${_b("edTblProperties()","⚙",vi?'Thuộc tính':'Props')}${_b("edTblDelete()","🗑",vi?'Xóa bảng':'Del table',1)}
  </div>`;
  document.body.appendChild(menu);
  menu._cell=cell;menu._table=table;menu._tr=tr;menu._cellIdx=cellIdx;
  
  setTimeout(()=>document.addEventListener('click',function _cl(e){
    if(!menu.contains(e.target)){edCloseCtxMenu();document.removeEventListener('click',_cl);}
  }),10);
}

function edCloseCtxMenu(){const m=document.getElementById('ed-ctx-menu');if(m)m.remove();}
function _getCtx(){const m=document.getElementById('ed-ctx-menu');return m?{cell:m._cell,table:m._table,tr:m._tr,idx:m._cellIdx}:null;}
function _edTableModuleCall(name,args){
  try{
    if(window.edCommandsTable && typeof window.edCommandsTable[name]==='function'){
      return window.edCommandsTable[name].apply(window,args||[]);
    }
  }catch(e){}
  return null;
}

function edTblAddRow(where){
  if(_edTableModuleCall('addRow',[where])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const tr=c.tr;const cols=tr.children.length;
  const newTr=document.createElement('tr');
  for(let i=0;i<cols;i++){const td=document.createElement('td');td.innerHTML='&nbsp;';newTr.appendChild(td);}
  if(where==='above')tr.before(newTr);else tr.after(newTr);
  edMarkModified();
}
function edTblDelRow(){
  if(_edTableModuleCall('delRow',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  if(c.table.querySelectorAll('tr').length<=1){c.table.remove();}else{c.tr.remove();}
  edMarkModified();
}
function edTblAddCol(where){
  if(_edTableModuleCall('addCol',[where])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const idx=c.idx;
  c.table.querySelectorAll('tr').forEach(tr=>{
    const cell=document.createElement(tr.children[0]&&tr.children[0].tagName==='TH'?'th':'td');
    cell.innerHTML='&nbsp;';
    const ref=tr.children[where==='before'?idx:idx+1];
    if(ref)tr.insertBefore(cell,ref);else tr.appendChild(cell);
  });
  try{edTableSyncColgroupCount(c.table);}catch(ex){}
  edMarkModified();
}
function edTblDelCol(){
  if(_edTableModuleCall('delCol',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const idx=c.idx;
  if(c.tr.children.length<=1){c.table.remove();}
  else{c.table.querySelectorAll('tr').forEach(tr=>{if(tr.children[idx])tr.children[idx].remove();});}
  try{edTableSyncColgroupCount(c.table);}catch(ex){}
  edMarkModified();
}
function edTblMergeRight(){
  if(_edTableModuleCall('mergeRight',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const next=c.cell.nextElementSibling;
  if(!next)return;
  const span=parseInt(c.cell.getAttribute('colspan')||1)+parseInt(next.getAttribute('colspan')||1);
  c.cell.setAttribute('colspan',span);
  c.cell.innerHTML+=next.innerHTML;
  next.remove();edMarkModified();
}
function edTblMergeDown(){
  if(_edTableModuleCall('mergeDown',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const nextTr=c.tr.nextElementSibling;
  if(!nextTr||!nextTr.children[c.idx])return;
  const span=parseInt(c.cell.getAttribute('rowspan')||1)+1;
  c.cell.setAttribute('rowspan',span);
  c.cell.innerHTML+='<br>'+nextTr.children[c.idx].innerHTML;
  nextTr.children[c.idx].remove();edMarkModified();
}
function edTblSplitCell(){
  if(_edTableModuleCall('splitCell',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const colspan=parseInt(c.cell.getAttribute('colspan')||1);
  const rowspan=parseInt(c.cell.getAttribute('rowspan')||1);
  var changed=false;
  if(colspan>1){
    c.cell.removeAttribute('colspan');
    for(let i=1;i<colspan;i++){
      const td=document.createElement(c.cell.tagName.toLowerCase());
      td.innerHTML='&nbsp;';
      if(rowspan>1)td.setAttribute('rowspan',rowspan);
      c.cell.after(td);
    }
    changed=true;
  }
  if(rowspan>1){
    c.cell.removeAttribute('rowspan');
    // Add cells back to rows below
    var tr=c.tr;
    var cIdx=c.idx;
    for(let r=1;r<rowspan;r++){
      tr=tr.nextElementSibling;
      if(!tr)break;
      var curColspan=parseInt(c.cell.getAttribute('colspan')||1)||colspan;
      for(let cc=0;cc<(changed?colspan:1);cc++){
        var td=document.createElement(c.cell.tagName.toLowerCase());
        td.innerHTML='&nbsp;';
        var ref=tr.children[cIdx];
        if(ref)tr.insertBefore(td,ref);else tr.appendChild(td);
      }
    }
    changed=true;
  }
  if(changed)edMarkModified();
}
function edTblCellBg(){
  if(_edTableModuleCall('cellBg',[])!==null)return;
  const c=_getCtx();if(!c)return;
  var cell=c.cell;edCloseCtxMenu();
  edShowColorPopup(cell,function(color){
    if(color==='transparent')cell.style.backgroundColor='';
    else cell.style.backgroundColor=color;
    edMarkModified();
  });
}
function edTblCellAlign(align){
  if(_edTableModuleCall('cellAlign',[align])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  c.cell.style.textAlign=align;edMarkModified();
}
function edTblVertAlign(va){
  if(_edTableModuleCall('vertAlign',[va])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  c.cell.style.verticalAlign=va;edMarkModified();
}
function edTblRowBgPicker(){
  if(_edTableModuleCall('rowBg',[])!==null)return;
  const c=_getCtx();if(!c)return;
  var tr=c.tr;edCloseCtxMenu();
  edShowColorPopup(tr,function(color){
    tr.querySelectorAll('td,th').forEach(function(cell){
      cell.style.backgroundColor=color==='transparent'?'':color;
    });
    edMarkModified();
  });
}
function edTblColBgPicker(){
  if(_edTableModuleCall('colBg',[])!==null)return;
  const c=_getCtx();if(!c)return;
  var table=c.table;var idx=c.idx;edCloseCtxMenu();
  edShowColorPopup(c.cell,function(color){
    table.querySelectorAll('tr').forEach(function(tr){
      var cell=tr.children[idx];
      if(cell)cell.style.backgroundColor=color==='transparent'?'':color;
    });
    edMarkModified();
  });
}
function edTblBorderPicker(){
  if(_edTableModuleCall('borderPicker',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const vi=lang!=='en';const root=edGetModalRoot();const table=c.table;
  const colors=['#cbd5e1','#1e293b','#1967d2','#dc2626','#16a34a','#f59e0b','#7c3aed','#transparent'];
  let html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal"><h4>▢ '+(vi?'Đường viền bảng':'Table Border')+'</h4>';
  html+='<div style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap">';
  [{w:'0',l:vi?'Không':'None'},{w:'1',l:'1px'},{w:'2',l:'2px'},{w:'3',l:'3px'}].forEach(o=>{
    html+='<button style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:11px;font-weight:600" onclick="edApplyTblBorder(\''+o.w+'\')">'+o.l+'</button>';
  });
  html+='</div><label style="font-size:11px;color:#666">'+(vi?'Màu viền':'Border Color')+'</label>';
  html+='<div class="ed-cpick-grid" style="margin:6px 0;grid-template-columns:repeat(8,1fr)">';
  colors.forEach(co=>{
    const st=co==='#transparent'?'background:linear-gradient(135deg,#fff 45%,#f00 45%,#f00 55%,#fff 55%)':'background:'+co;
    html+='<button style="'+st+';width:24px;height:24px" onclick="edApplyTblBorderColor(\''+co+'\')"></button>';
  });
  html+='</div><div class="ed-cpick-custom"><label>'+(vi?'Tùy chỉnh':'Custom')+'</label><input type="color" id="ed-tbl-bc" value="#cbd5e1"><button onclick="edApplyTblBorderColor(document.getElementById(\'ed-tbl-bc\').value)">OK</button></div>';
  html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Đóng':'Close')+'</button></div></div></div>';
  root.innerHTML=html;root._tblBorderTarget=table;
}
function edApplyTblBorder(w){
  if(_edTableModuleCall('applyBorder',[w])!==null)return;
  const table=edGetModalRoot()._tblBorderTarget;if(!table)return;
  if(w==='0'){table.style.border='none';table.querySelectorAll('td,th').forEach(c=>c.style.border='none');}
  else{table.style.border=w+'px solid '+(table._borderColor||'#cbd5e1');table.querySelectorAll('td,th').forEach(c=>c.style.border=w+'px solid '+(table._borderColor||'#cbd5e1'));}
  edMarkModified();
}
function edApplyTblBorderColor(color){
  if(_edTableModuleCall('applyBorderColor',[color])!==null)return;
  const table=edGetModalRoot()._tblBorderTarget;if(!table)return;
  if(color==='#transparent'){table.style.border='none';table.querySelectorAll('td,th').forEach(c=>c.style.border='none');}
  else{table._borderColor=color;const w=parseInt(table.style.borderWidth)||1;table.style.borderColor=color;table.querySelectorAll('td,th').forEach(c=>c.style.borderColor=color);}
  edMarkModified();edCloseModal();
}
function edTblRadiusPicker(){
  if(_edTableModuleCall('radiusPicker',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const vi=lang!=='en';const root=edGetModalRoot();const table=c.table;
  let html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal"><h4>◔ '+(vi?'Bo góc bảng':'Table Border Radius')+'</h4>';
  html+='<div style="display:flex;gap:8px;margin:12px 0">';
  [0,4,8,12,16,20].forEach(r=>{
    html+='<button style="width:50px;height:40px;border:2px solid #1967d2;border-radius:'+r+'px;background:#e8f0fe;cursor:pointer;font-size:11px;font-weight:600" onclick="edApplyTblRadius('+r+')">'+r+'px</button>';
  });
  html+='</div><div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Đóng':'Close')+'</button></div></div></div>';
  root.innerHTML=html;root._tblRadiusTarget=table;
}
function edTblWidth(w){
  if(_edTableModuleCall('width',[w])!==null)return;
  var c=_getCtx();if(!c)return;edCloseCtxMenu();
  var t=c.table;
  t.style.tableLayout='auto';
  t.style.width=w;
  // Clear all column fixed widths
  t.querySelectorAll('td,th').forEach(function(cell){cell.style.width='';});
  edMarkModified();
}
function edTblAlignTable(align){
  if(_edTableModuleCall('alignTable',[align])!==null)return;
  var c=_getCtx();if(!c)return;edCloseCtxMenu();
  var t=c.table;
  if(align==='center'){t.style.marginLeft='auto';t.style.marginRight='auto';}
  else if(align==='right'){t.style.marginLeft='auto';t.style.marginRight='0';}
  else{t.style.marginLeft='';t.style.marginRight='';}
  edMarkModified();
}

function edApplyTblRadius(r){
  if(_edTableModuleCall('applyRadius',[r])!==null)return;
  const table=edGetModalRoot()._tblRadiusTarget;if(!table)return;
  table.style.borderRadius=r+'px';
  if(r>0){
    table.style.overflow='hidden';
    table.style.borderCollapse='separate';
    table.style.borderSpacing='0';
    // Make sure outer border is visible
    if(!table.style.border||table.style.border==='none'){
      table.style.border='1px solid #cbd5e1';
    }
    // Remove individual cell borders that conflict
    table.querySelectorAll('td,th').forEach(function(c){
      c.style.borderLeft='none';c.style.borderTop='none';
      c.style.borderRight='1px solid #e2e8f0';c.style.borderBottom='1px solid #e2e8f0';
    });
  }
  edMarkModified();edCloseModal();
}
function edTblDelete(){
  if(_edTableModuleCall('deleteTable',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  if(confirm(lang!=='en'?'Xóa bảng này?':'Delete this table?'))c.table.remove();
  edMarkModified();
}

function edTblProperties(){
  if(_edTableModuleCall('properties',[])!==null)return;
  const c=_getCtx();if(!c)return;edCloseCtxMenu();
  const vi=lang!=='en';const table=c.table;
  const root=edGetModalRoot();
  let html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal"><h4>⚙ '+(vi?'Thuộc tính bảng':'Table Properties')+'</h4>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  html+='<div><label>'+( vi?'Chiều rộng':'Width')+'</label><input id="ed-tp-w" value="'+(table.style.width||'100%')+'"></div>';
  html+='<div><label>'+(vi?'Căn chỉnh':'Alignment')+'</label><select id="ed-tp-align"><option value="">'+( vi?'Mặc định':'Default')+'</option><option value="center"'+(table.style.margin==='0px auto'?' selected':'')+'>'+( vi?'Giữa':'Center')+'</option><option value="left">'+( vi?'Trái':'Left')+'</option></select></div>';
  html+='<div><label>'+(vi?'Viền':'Border')+'</label><input id="ed-tp-border" value="1" type="number" min="0" max="5"></div>';
  html+='<div><label>'+(vi?'Màu viền':'Border Color')+'</label><input id="ed-tp-bc" type="color" value="#cbd5e1"></div>';
  html+='<div><label>'+(vi?'Padding ô':'Cell Padding')+'</label><input id="ed-tp-pad" value="8" type="number" min="0" max="30"></div>';
  html+='<div><label>'+(vi?'Spacing':'Spacing')+'</label><input id="ed-tp-space" value="0" type="number" min="0" max="10"></div>';
  html+='</div>';
  html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Hủy':'Cancel')+'</button><button class="ed-m-ok" onclick="edApplyTblProps()">'+(vi?'Áp dụng':'Apply')+'</button></div></div></div>';
  root.innerHTML=html;
  root._tblPropTarget=table;
}

function edApplyTblProps(){
  if(_edTableModuleCall('applyProperties',[])!==null)return;
  const root=edGetModalRoot();
  const table=root._tblPropTarget;if(!table)return;
  const w=document.getElementById('ed-tp-w').value;
  const align=document.getElementById('ed-tp-align').value;
  const border=document.getElementById('ed-tp-border').value;
  const bc=document.getElementById('ed-tp-bc').value;
  const pad=document.getElementById('ed-tp-pad').value;
  const space=document.getElementById('ed-tp-space').value;
  table.style.width=w;
  if(align==='center'){table.style.margin='0 auto';}else{table.style.margin='';}
  table.style.border=border+'px solid '+bc;
  table.style.borderSpacing=space+'px';
  if(parseInt(space)>0)table.style.borderCollapse='separate';else table.style.borderCollapse='collapse';
  table.querySelectorAll('td,th').forEach(c=>{c.style.border=border+'px solid '+bc;c.style.padding=pad+'px';});
  edMarkModified();edCloseModal();
}


// ═══════════════════════════════════════════════════
// LIST STYLE DROPDOWNS
// ═══════════════════════════════════════════════════
function edToggleListDD(type){
  document.querySelectorAll('.ed-cpick-dd,.ed-special-panel').forEach(d=>d.classList.remove('open'));
  const dd=document.getElementById('ed-'+type+'-dd');
  if(dd.parentElement!==document.body)document.body.appendChild(dd);
  const arrow=document.querySelector('#ed-cpick-'+type+' .ed-cpick-arrow');
  const rect=arrow.getBoundingClientRect();
  dd.style.top=(rect.bottom+4)+'px';
  dd.style.left=Math.max(4,rect.left-40)+'px';
  dd.style.width='180px';
  const vi=lang!=='en';
  if(type==='ul'){
    dd.innerHTML='<h5>'+(vi?'Kiểu dấu đầu dòng':'Bullet Style')+'</h5>'+
      '<div style="display:flex;flex-direction:column;gap:2px">'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'disc\')">● '+(vi?'Tròn đặc':'Disc')+'</button>'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'circle\')">○ '+(vi?'Tròn rỗng':'Circle')+'</button>'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'square\')">■ '+(vi?'Vuông':'Square')+'</button>'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'none\')">— '+(vi?'Không dấu':'None')+'</button>'+
      '</div>';
  }else{
    dd.innerHTML='<h5>'+(vi?'Kiểu đánh số':'Number Style')+'</h5>'+
      '<div style="display:flex;flex-direction:column;gap:2px">'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'decimal\')">1. 2. 3. '+(vi?'Số':'Decimal')+'</button>'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'lower-alpha\')">a. b. c. '+(vi?'Chữ thường':'Lower Alpha')+'</button>'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'upper-alpha\')">A. B. C. '+(vi?'Chữ hoa':'Upper Alpha')+'</button>'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'lower-roman\')">i. ii. iii. '+(vi?'La Mã thường':'Lower Roman')+'</button>'+
      '<button style="text-align:left;padding:6px 10px;border:1px solid #eee;border-radius:4px;background:none;cursor:pointer;font-size:12px" onclick="edListStyle(\'upper-roman\')">I. II. III. '+(vi?'La Mã hoa':'Upper Roman')+'</button>'+
      '</div>';
  }
  dd.classList.add('open');
  setTimeout(()=>document.addEventListener('click',function _cl(e){
    if(!dd.contains(e.target)){dd.classList.remove('open');document.removeEventListener('click',_cl);}
  }),10);
}

function edListStyle(style){
  const area=document.getElementById('editor-area');
  edFocusAndRestore();
  const sel=window.getSelection();
  if(!sel.rangeCount)return;
  let node=sel.anchorNode;
  while(node&&node!==area&&node.tagName!=='UL'&&node.tagName!=='OL')node=node.parentElement;
  if(node&&(node.tagName==='UL'||node.tagName==='OL')){
    node.style.listStyleType=style;
  }else{
    const isList=style==='disc'||style==='circle'||style==='square'||style==='none';
    edExecCommand(isList?'insertUnorderedList':'insertOrderedList');
    // Find the newly created list
    setTimeout(()=>{
      let n=sel.anchorNode;
      while(n&&n!==area&&n.tagName!=='UL'&&n.tagName!=='OL')n=n.parentElement;
      if(n&&(n.tagName==='UL'||n.tagName==='OL'))n.style.listStyleType=style;
    },50);
  }
  document.querySelectorAll('.ed-cpick-dd').forEach(d=>d.classList.remove('open'));
  edMarkModified();
}

function _edCurrentListItem(){
  var sel=window.getSelection();
  if(!sel||!sel.rangeCount) return null;
  var node=sel.anchorNode;
  var el=(node&&node.nodeType===1)?node:(node&&node.parentElement);
  return el&&el.closest?el.closest('li'):null;
}

function _edPlaceCaretAtStart(node){
  if(!node) return false;
  try{
    var sel=window.getSelection();
    if(!sel) return false;
    var range=document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }catch(e){
    return false;
  }
}

function _edHandleListIndent(forward){
  var li=_edCurrentListItem();
  if(!li) return false;
  var list=li.parentElement;
  if(!list||!/^(UL|OL)$/i.test(list.tagName)) return false;

  if(forward){
    var prev=li.previousElementSibling;
    while(prev&&prev.tagName!=='LI') prev=prev.previousElementSibling;
    if(!prev) return false;
    var nested=null;
    for(var i=prev.children.length-1;i>=0;i--){
      var child=prev.children[i];
      if(child&&child.tagName===list.tagName){ nested=child; break; }
    }
    if(!nested){
      nested=list.cloneNode(false);
      nested.removeAttribute('id');
      prev.appendChild(nested);
    }
    nested.appendChild(li);
    _edPlaceCaretAtStart(li);
    return true;
  }

  var parentLi=list.parentElement;
  if(!parentLi||parentLi.tagName!=='LI') return false;
  var outerList=parentLi.parentElement;
  if(!outerList||!/^(UL|OL)$/i.test(outerList.tagName)) return false;
  if(parentLi.nextElementSibling) outerList.insertBefore(li,parentLi.nextElementSibling);
  else outerList.appendChild(li);
  if(!list.querySelector('li')) list.remove();
  _edPlaceCaretAtStart(li);
  return true;
}

function _edSelectionCollapsed(){
  try{
    var sel=window.getSelection();
    return !!(sel&&sel.rangeCount&&sel.isCollapsed);
  }catch(e){
    return false;
  }
}

function _edCaretAtStartOf(node){
  if(!node) return false;
  try{
    var sel=window.getSelection();
    if(!sel||!sel.rangeCount||!sel.isCollapsed) return false;
    var range=sel.getRangeAt(0);
    if(!node.contains(range.startContainer)) return false;
    var probe=range.cloneRange();
    probe.selectNodeContents(node);
    probe.setEnd(range.startContainer,range.startOffset);
    return String(probe.toString()||'').replace(/\u00a0/g,' ').trim()==='';
  }catch(e){
    return false;
  }
}

function _edIsListItemEmpty(li){
  if(!li) return false;
  var clone=li.cloneNode(true);
  clone.querySelectorAll('ul,ol').forEach(function(list){ list.remove(); });
  var txt=String(clone.textContent||'').replace(/\u00a0/g,' ').trim();
  if(txt) return false;
  return !clone.querySelector('img,svg,canvas,table,pre,code,iframe,video,audio,input,textarea,select,button');
}

function _edExitEmptyListItem(){
  var li=_edCurrentListItem();
  if(!li||!_edSelectionCollapsed()||!_edIsListItemEmpty(li)) return false;
  var list=li.parentElement;
  if(!list||!/^(UL|OL)$/i.test(list.tagName)||!list.parentNode) return false;

  var nestedParent=(list.parentElement&&list.parentElement.tagName==='LI')?list.parentElement:null;
  if(nestedParent){
    return _edHandleListIndent(false);
  }

  var parent=list.parentNode;
  var afterRef=list.nextSibling;
  var tail=list.cloneNode(false);
  var move=li.nextElementSibling;
  while(move){
    var next=move.nextElementSibling;
    if(move.tagName==='LI') tail.appendChild(move);
    move=next;
  }

  li.remove();

  var paragraph=document.createElement('p');
  paragraph.innerHTML='<br>';
  parent.insertBefore(paragraph,afterRef);
  if(tail.querySelector('li')){
    if(paragraph.nextSibling) parent.insertBefore(tail,paragraph.nextSibling);
    else parent.appendChild(tail);
  }
  if(!list.querySelector('li')) list.remove();
  _edPlaceCaretAtStart(paragraph);
  return true;
}

function _edCurrentTableCell(){
  try{
    var sel=window.getSelection();
    if(!sel||!sel.rangeCount) return null;
    var node=sel.anchorNode;
    var el=(node&&node.nodeType===1)?node:(node&&node.parentElement);
    return el&&el.closest?el.closest('td,th'):null;
  }catch(e){
    return null;
  }
}

function _edIsTableCellEmpty(cell){
  if(!cell) return false;
  var txt=String(cell.textContent||'').replace(/\u00a0/g,' ').trim();
  if(txt) return false;
  return !cell.querySelector('img,svg,canvas,table,ul,ol,pre,code,iframe,video,audio,input,textarea,select,button');
}

function _edNormalizeEmptyTableCell(cell){
  if(!cell||!_edIsTableCellEmpty(cell)) return false;
  cell.innerHTML='<br>';
  cell.style.overflowWrap=cell.style.overflowWrap||'anywhere';
  cell.style.wordBreak=cell.style.wordBreak||'break-word';
  _edPlaceCaretAtStart(cell);
  return true;
}

// ═══════════════════════════════════════════════════
// MATH EQUATION INSERT (CKEditor-style)
// ═══════════════════════════════════════════════════
function edInsertMath(){
  var vi=lang!=='en';
  var root=edGetModalRoot();
  // Templates with ACTUAL Unicode characters
  var tpls=[
    {label:'x²+y²',text:'x² + y² = z²'},
    {label:'a/b',text:'a/b',html:'<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:14px;line-height:1.1"><span style="border-bottom:1px solid #333;padding:0 4px">a</span><span style="padding:0 4px">b</span></span>'},
    {label:'√x',text:'√x',html:'√<span style="text-decoration:overline;padding:0 2px">x</span>'},
    {label:'∑',text:'∑ i=1..n',html:'<span style="font-size:20px;vertical-align:middle">∑</span><sub>i=1</sub><sup>n</sup>'},
    {label:'∫',text:'∫ a..b',html:'<span style="font-size:22px;vertical-align:middle">∫</span><sub>a</sub><sup>b</sup>'},
    {label:'lim',text:'lim x→∞',html:'<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle"><span>lim</span><span style="font-size:10px">x→∞</span></span>'},
    {label:'≤ ≥ ≠',text:'≤ ≥ ≠ ≈ ∝ ∞'},
    {label:'xⁿ',text:'xⁿ',html:'x<sup>n</sup>'},
    {label:'x₁',text:'x₁',html:'x<sub>1</sub>'},
    {label:'π',text:'π ≈ 3.14159'},
    {label:'Δ',text:'Δ = b² − 4ac'},
    {label:'Matrix',text:'[a b; c d]',html:'<span style="display:inline-flex;align-items:center;vertical-align:middle;font-family:serif"><span style="font-size:18px">[</span><table style="display:inline-table;border-collapse:collapse;vertical-align:middle;margin:0 2px"><tr><td style="border:none;padding:1px 6px;font-size:13px">a</td><td style="border:none;padding:1px 6px;font-size:13px">b</td></tr><tr><td style="border:none;padding:1px 6px;font-size:13px">c</td><td style="border:none;padding:1px 6px;font-size:13px">d</td></tr></table><span style="font-size:18px">]</span></span>'},
    {label:'α β γ',text:'α β γ δ ε θ λ σ'},
    {label:'∂/∂x',text:'∂f/∂x',html:'<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:14px;line-height:1.1"><span style="border-bottom:1px solid #333;padding:0 3px">∂f</span><span style="padding:0 3px">∂x</span></span>'},
    {label:'n!',text:'n! = n(n-1)(n-2)...1'},
    {label:'log',text:'log?(x)',html:'log<sub>2</sub>(x)'}
  ];
  var html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal" style="width:520px"><h4>∑ '+(vi?'Chèn công thức toán':'Insert Math')+'</h4>';
  html+='<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:#666;margin-bottom:4px">'+(vi?'Mẫu có sẵn — click chèn vào ô soạn':'Templates — click to insert into editor below')+'</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">';
  for(var i=0;i<tpls.length;i++){
    var t=tpls[i];
    html+='<button style="padding:6px 4px;border:1px solid #e2e8f0;border-radius:6px;background:#fafafa;cursor:pointer;font-size:15px;font-family:serif;text-align:center;line-height:1.3" onclick="edInsertMathTpl('+i+')" title="'+t.label+'">'+(t.html||t.text||t.label)+'</button>';
  }
  html+='</div></div>';
  html+='<div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:4px">';
  html+='<div style="font-size:10px;font-weight:600;color:#666;margin-bottom:4px">'+(vi?'Nhập trực tiếp (click ký tự bên dưới)':'Type directly (click symbols below)')+'</div>';
  html+='<div style="display:flex;gap:3px;margin-bottom:6px;flex-wrap:wrap">';
  var syms=['²','³','ⁿ','₁','√','π','Δ','∑','∏','∫','∂','∞','→','↔','≤','≥','≠','≈','±','×','÷','∙','≡','∝','⊂','⊃','∈','∉','∪','∩','α','β','γ','δ','ε','θ','λ','σ','φ','ω'];
  for(var j=0;j<syms.length;j++){
    html+='<button style="width:26px;height:26px;border:1px solid #e2e8f0;border-radius:4px;background:#fff;cursor:pointer;font-size:14px;font-family:serif;padding:0" onclick="edMathInsertSym(this.textContent)" title="'+syms[j]+'">'+syms[j]+'</button>';
  }
  html+='</div>';
  html+='<div contenteditable="true" id="ed-math-input" style="width:100%;min-height:36px;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:16px;font-family:serif;outline:none;box-sizing:border-box;background:#fff" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"></div>';
  html+='<div id="ed-math-preview" style="margin-top:4px;padding:6px;background:#f8f9fa;border-radius:6px;min-height:28px;font-size:18px;font-family:serif;text-align:center;color:#1e293b"></div>';
  html+='</div>';
  html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Hủy':'Cancel')+'</button><button class="ed-m-ok" onclick="edInsertMathOK()">'+(vi?'Chèn':'Insert')+'</button></div></div></div>';
  root.innerHTML=html;
  root._mathTemplates=tpls;
  var inp=document.getElementById('ed-math-input');
  inp.addEventListener('input',function(){
    var safe=_edSanitizeHtmlFragment(this.innerHTML,{forPaste:true,stripClasses:false,stripIds:true,preserveDataAttrs:false});
    document.getElementById('ed-math-preview').innerHTML=safe;
  });
}

function _edInsertTextInEditable(el,text){
  if(!el) return false;
  try{
    el.focus();
    var ok=document.execCommand('insertText',false,String(text==null?'':text));
    if(ok) return true;
  }catch(e){}
  try{
    var sel=window.getSelection();
    if(!sel || !sel.rangeCount) return false;
    var r=sel.getRangeAt(0);
    if(!el.contains(r.commonAncestorContainer)) return false;
    var tn=document.createTextNode(String(text==null?'':text));
    r.deleteContents();
    r.insertNode(tn);
    r.setStartAfter(tn);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }catch(e2){
    return false;
  }
}

function edMathInsertSym(sym){
  var inp=document.getElementById('ed-math-input');
  if(!inp)return;
  _edInsertTextInEditable(inp,sym);
  var safe=_edSanitizeHtmlFragment(inp.innerHTML,{forPaste:true,stripClasses:false,stripIds:true,preserveDataAttrs:false});
  document.getElementById('ed-math-preview').innerHTML=safe;
}

function edInsertMathTpl(idx){
  var root=edGetModalRoot();
  var t=root._mathTemplates[idx];if(!t)return;
  // Insert into the input field, NOT directly into editor
  var inp=document.getElementById('ed-math-input');
  if(!inp)return;
  inp.focus();
  inp.innerHTML=t.html||t.text||t.label;
  document.getElementById('ed-math-preview').innerHTML=inp.innerHTML;
}

function edInsertMathOK(){
  var inp=document.getElementById('ed-math-input');
  if(!inp||!inp.innerHTML.trim())return;
  var mathHtml=_edSanitizeHtmlFragment(inp.innerHTML,{
    forPaste:true,
    stripClasses:false,
    stripIds:true,
    preserveDataAttrs:false
  });
  if(!mathHtml) return;
  edFocusAndRestore();
  edExecCommand('insertHTML',false,'<span class="ed-math" style="font-family:serif;font-size:15px;padding:0 4px;background:#f0f4ff;border-radius:3px" contenteditable="true">'+mathHtml+'</span>&nbsp;');
  edMarkModified();edCloseModal();
}

// ═══════════════════════════════════════════════════
// TABLE RESIZE (drag column/row borders)
// ═══════════════════════════════════════════════════
function edSetupTableResize(){
  const area=document.getElementById('editor-area');
  let dragging=false;

  function _cellFromTarget(t){
    if(!t) return null;
    if(t.tagName==='TD' || t.tagName==='TH') return t;
    if(t.closest){
      var c=t.closest('td,th');
      if(c && area.contains(c)) return c;
    }
    return null;
  }

  area.addEventListener('mousemove',function(e){
    if(dragging) return;
    const cell=_cellFromTarget(e.target);
    if(!cell) return;
    const rect=cell.getBoundingClientRect();
    // Larger hot-zone (6px) improves usability
    const nearRight = e.clientX > rect.right - 6;
    const nearBottom = e.clientY > rect.bottom - 6;
    cell.style.cursor = nearRight ? 'col-resize' : (nearBottom ? 'row-resize' : '');
  });

  area.addEventListener('mousedown',function(e){
    const cell=_cellFromTarget(e.target);
    if(!cell) return;

    const rect=cell.getBoundingClientRect();
    const isCol = e.clientX > rect.right - 6;
    const isRow = e.clientY > rect.bottom - 6;
    if(!isCol && !isRow) return;

    e.preventDefault();
    dragging=true;

    const table=cell.closest('table'), tr=cell.closest('tr');
    if(!table || !tr){ dragging=false; return; }

    // Snapshot defaults once (for Reset)
    edTableRememberDefaults(table);

    if(isCol){
      const colCount = edTableGetColCount(table);
      if(!colCount){ dragging=false; return; }

      // Ensure fixed mode + colgroup widths (critical for tables that already have <colgroup>)
      if(getComputedStyle(table).tableLayout !== 'fixed' || !(table.style.width && table.style.width.indexOf('px')>-1)){
        edTableApplyFixed(table);
      }else{
        edTableEnsureColgroup(table, colCount);
        edTableMarkFixed(table);
      }

      const ens = edTableEnsureColgroup(table, colCount);
      const cols = ens.cols;
      const startWidths = edTableGetColWidthsPx(table, colCount).map(w=>Math.max(25, Math.round(w)));

      const startX = e.clientX;
      const startIdx = edTableGetColStartIndex(cell);
      const span = parseInt(cell.getAttribute('colspan') || cell.colSpan || 1, 10) || 1;

      // Resizing the RIGHT border of the active cell => affects the last column in its span
      const leftCol = Math.min(colCount-1, startIdx + span - 1);
      const rightCol = leftCol + 1;
      const minW = 25;

      const startTableW = Math.round(parseFloat(table.style.width) || table.getBoundingClientRect().width || startWidths.reduce((a,b)=>a+b,0));

      function mv(ev){
        const dx = ev.clientX - startX;

        if(rightCol < colCount){
          var newLeft = startWidths[leftCol] + dx;
          var newRight = startWidths[rightCol] - dx;

          // Clamp both sides to min width and adjust the other side accordingly
          if(newLeft < minW){
            var adj = minW - newLeft;
            newLeft = minW;
            newRight = startWidths[rightCol] - (dx - adj);
          }
          if(newRight < minW){
            var adj2 = minW - newRight;
            newRight = minW;
            newLeft = startWidths[leftCol] + (dx - adj2);
          }

          newLeft = Math.max(minW, Math.round(newLeft));
          newRight = Math.max(minW, Math.round(newRight));

          cols[leftCol].style.width = newLeft + 'px';
          cols[rightCol].style.width = newRight + 'px';

          // Keep table width consistent with sum of columns
          var sum = 0;
          for(var i=0;i<colCount;i++){
            var w = (i===leftCol)?newLeft:(i===rightCol)?newRight:startWidths[i];
            sum += w;
          }
          table.style.width = Math.max(120, Math.round(sum)) + 'px';
        } else {
          // Last column: adjust table width and that last column together
          var newLast = Math.max(minW, Math.round(startWidths[leftCol] + dx));
          cols[leftCol].style.width = newLast + 'px';
          table.style.width = Math.max(120, Math.round(startTableW + dx)) + 'px';
        }

        edTableMarkFixed(table);
        edTableUpdateActiveBar(table);
      }

      function up(){
        document.removeEventListener('mousemove', mv);
        document.removeEventListener('mouseup', up);
        dragging=false;
        edMarkModified();
      }

      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    }

    if(isRow){
      const startY=e.clientY, startH=tr.getBoundingClientRect().height;
      function mvR(ev){tr.style.height=Math.max(20,startH+(ev.clientY-startY))+'px';}
      function upR(){document.removeEventListener('mousemove',mvR);document.removeEventListener('mouseup',upR);dragging=false;edMarkModified();}
      document.addEventListener('mousemove',mvR);
      document.addEventListener('mouseup',upR);
    }
  });

  // Double-click a table cell to clear fixed sizing (revert to responsive + restore original colgroup)
  area.addEventListener('dblclick',function(e){
    const cell=_cellFromTarget(e.target);
    if(!cell) return;
    const table=cell.closest('table');if(!table) return;

    table.style.tableLayout='';
    edTableMarkBalanced(table);
    table.style.width='100%';
    table.querySelectorAll('td,th').forEach(function(c){c.style.width='';});

    edTableRestoreColgroup(table);
    edMarkModified();
    edTableUpdateActiveBar(table);
  });
}
// ═══════════════════════════════════════════════════
// TEXTBOX (like Word)
// ═══════════════════════════════════════════════════


function edInsertTextbox(){
  edFocusAndRestore();
  const vi=lang!=='en';
  const id='tb'+Date.now();
  const html='<div class="ed-textbox" id="'+id+'" contenteditable="false" style="width:240px;min-height:60px;display:inline-block">'+
    '<div class="ed-tb-content" contenteditable="true" style="outline:none;min-height:30px">'+(vi?'Nhập văn bản...':'Type here...')+'</div>'+
    '</div>&nbsp;';
  edExecCommand('insertHTML',false,html);
  // Attach click via delegation after insertion
  setTimeout(function(){
    var el=document.getElementById(id);
    if(el){el.addEventListener('click',function(ev){
      if(ev.target.closest('.ed-tb-bar,.ed-tb-handle'))return;
      if(!el.querySelector('.ed-tb-bar'))edSelectTextbox(el);
    });}
  },50);
  edMarkModified();
}


function edSelectTextbox(el){
  // Deselect ALL element types first
  document.querySelectorAll('.ed-textbox .ed-tb-handle,.ed-textbox .ed-tb-bar').forEach(function(x){x.remove();});
  edDeselectAllShapes();
  document.querySelectorAll('.ed-chart .ed-ch-bar,.ed-chart .ed-ch-handle').forEach(function(x){x.remove();});
  edDeselectAllQmsBlocks();
  edDeselectImg();
  window._edActiveTB=el;
  ['br','mr','bm'].forEach(function(pos){
    var hd=document.createElement('span');hd.className='ed-tb-handle '+pos;hd.contentEditable='false';
    hd.addEventListener('mousedown',function(e){e.stopPropagation();edResizeBox(e,el,pos);});
    el.appendChild(hd);
  });
  var bar=document.createElement('div');
  bar.className='ed-tb-bar';bar.contentEditable='false';
  bar.onmousedown=function(ev){ev.stopPropagation();};
  bar.onclick=function(ev){ev.stopPropagation();};
  var vi=lang!=='en';
  // Text color button  
  var btnTC=document.createElement('button');btnTC.style.cssText='width:22px;height:22px;border:1px solid #ddd;border-radius:3px;background:#fff;cursor:pointer;padding:0;font-size:12px;font-weight:700;color:'+(el.querySelector('.ed-tb-content')?el.querySelector('.ed-tb-content').style.color||'#333':'#333');
  btnTC.textContent='A';btnTC.title=vi?'Màu chữ':'Text color';
  btnTC.addEventListener('click',function(ev){ev.stopPropagation();edShowColorPopup(ev.target,function(c){var cnt=el.querySelector('.ed-tb-content');if(cnt){cnt.style.color=c;btnTC.style.color=c;}edMarkModified();});});
  bar.appendChild(btnTC);
  // Border color button
  var btnBC=document.createElement('button');btnBC.style.cssText='width:22px;height:22px;border:2px solid '+(_rgb2hex(el.style.borderColor)||'#1967d2')+';border-radius:3px;background:#fff;cursor:pointer;padding:0;font-size:9px';
  btnBC.textContent='B';btnBC.title=vi?'Màu viền':'Border';
  btnBC.addEventListener('click',function(ev){ev.stopPropagation();edShowColorPopup(ev.target,function(c){el.style.borderColor=c;btnBC.style.borderColor=c;edMarkModified();});});
  bar.appendChild(btnBC);
  // Fill color button
  var btnFC=document.createElement('button');btnFC.style.cssText='width:22px;height:22px;border:1px solid #ddd;border-radius:3px;background:'+(_rgb2hex(el.style.backgroundColor)||'#fff')+';cursor:pointer;padding:0;font-size:9px';
  btnFC.textContent='F';btnFC.title=vi?'Nền':'Fill';
  btnFC.addEventListener('click',function(ev){ev.stopPropagation();edShowColorPopup(ev.target,function(c){if(c==='transparent'){el.style.backgroundColor='';btnFC.style.background='#fff';}else{el.style.backgroundColor=c;btnFC.style.background=c;}edMarkModified();});});
  bar.appendChild(btnFC);
  // Border width
  var selW=document.createElement('select');selW.title=vi?'Bề rộng viền':'Border width';
  selW.style.cssText='width:36px;font-size:9px;border:1px solid #ddd;border-radius:3px;padding:0 1px;height:22px;cursor:pointer';
  ['0','1','2','3','4'].forEach(function(v){var o=document.createElement('option');o.value=v+'px';o.textContent=v;if(el.style.borderWidth===v+'px')o.selected=true;selW.appendChild(o);});
  selW.addEventListener('change',function(){el.style.borderWidth=this.value;edMarkModified();});
  bar.appendChild(selW);
  // Border style
  var selS=document.createElement('select');selS.title=vi?'Kiểu viền':'Border style';
  selS.style.cssText='width:42px;font-size:9px;border:1px solid #ddd;border-radius:3px;padding:0 1px;height:22px;cursor:pointer';
  [{v:'solid',l:'\u2500\u2500'},{v:'dashed',l:'- -'},{v:'dotted',l:'\u00b7\u00b7'},{v:'double',l:'\u2550\u2550'},{v:'none',l:'\u2715'}].forEach(function(o){
    var opt=document.createElement('option');opt.value=o.v;opt.textContent=o.l;if(el.style.borderStyle===o.v)opt.selected=true;selS.appendChild(opt);
  });
  selS.addEventListener('change',function(){el.style.borderStyle=this.value;edMarkModified();});
  bar.appendChild(selS);
  // Border radius
  var selR=document.createElement('select');selR.title=vi?'Bo góc':'Radius';
  selR.style.cssText='width:32px;font-size:9px;border:1px solid #ddd;border-radius:3px;padding:0 1px;height:22px;cursor:pointer';
  ['0','4','8','12','50%'].forEach(function(v){var o=document.createElement('option');o.value=v==='50%'?v:v+'px';o.textContent=v;selR.appendChild(o);});
  selR.addEventListener('change',function(){el.style.borderRadius=this.value;edMarkModified();});
  bar.appendChild(selR);
  // Delete
  var btnDel=document.createElement('button');btnDel.textContent='\u2717';btnDel.title=vi?'Xóa':'Del';
  btnDel.style.cssText='width:22px;height:22px;border:none;background:none;border-radius:3px;cursor:pointer;font-size:14px;color:#dc2626';
  btnDel.addEventListener('click',function(){el.remove();edMarkModified();});
  bar.appendChild(btnDel);
  el.appendChild(bar);
  // Drag - named handler to avoid stacking on repeated selections
  if(el._edDragHandler)el.removeEventListener('mousedown',el._edDragHandler);
  el._edDragHandler=function(e){
    if(e.target.closest('.ed-tb-content,.ed-tb-handle,.ed-tb-bar'))return;
    var rect=el.getBoundingClientRect();
    var inBorder=(e.clientX-rect.left<6||rect.right-e.clientX<6||e.clientY-rect.top<6||rect.bottom-e.clientY<6);
    if(!inBorder&&e.target!==el)return;
    e.preventDefault();e.stopPropagation();
    var startX=e.clientX,startY=e.clientY;
    var ml=parseInt(el.style.marginLeft)||0,mt=parseInt(el.style.marginTop)||0;
    function m(ev){el.style.marginLeft=(ml+ev.clientX-startX)+'px';el.style.marginTop=(mt+ev.clientY-startY)+'px';}
    function u(){document.removeEventListener('mousemove',m);document.removeEventListener('mouseup',u);edMarkModified();}
    document.addEventListener('mousemove',m);document.addEventListener('mouseup',u);
  };
  el.addEventListener('mousedown',el._edDragHandler);
}


function edResizeBox(e,el,pos){
  e.preventDefault();e.stopPropagation();
  const startX=e.clientX,startY=e.clientY;
  const startW=el.offsetWidth,startH=el.offsetHeight;
  function m(ev){
    if(pos==='br'||pos==='mr')el.style.width=Math.max(60,startW+(ev.clientX-startX))+'px';
    if(pos==='br'||pos==='bm')el.style.minHeight=Math.max(30,startH+(ev.clientY-startY))+'px';
  }
  function u(){document.removeEventListener('mousemove',m);document.removeEventListener('mouseup',u);edMarkModified();}
  document.addEventListener('mousemove',m);document.addEventListener('mouseup',u);
}

function _rgb2hex(c){
  if(!c||c==='transparent')return'#ffffff';
  if(c.startsWith('#'))return c;
  const m=c.match(/\d+/g);
  if(!m||m.length<3)return'#ffffff';
  return'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('');
}

// ═══════════════════════════════════════════════════
// SHAPES — Word-like drawing objects (V2 — event delegation)
// ═══════════════════════════════════════════════════
const ED_SHAPES={};
const ED_SHAPE_CATS=[
  {id:'lines',name:'Lines',nameVi:'Đường kẻ'},
  {id:'rect',name:'Rectangles',nameVi:'Hình chữ nhật'},
  {id:'basic',name:'Basic Shapes',nameVi:'Hình cơ bản'},
  {id:'arrows',name:'Block Arrows',nameVi:'Mũi tên khối'},
  {id:'equation',name:'Equation Shapes',nameVi:'Phương trình'},
  {id:'flow',name:'Flowchart',nameVi:'Lưu đồ'},
  {id:'stars',name:'Stars and Banners',nameVi:'Ngôi sao & Biểu ngữ'},
  {id:'callout',name:'Callouts',nameVi:'Chú thích'}
];
(function(){
  function S(k,n,cat,fn){ED_SHAPES[k]={name:n,cat:cat,svg:fn};}
  var P=Math.PI;

  // ═══ LINES ═══
  S('ln_h','Line','lines',function(w,h){return '<line x1="4" y1="'+h/2+'" x2="'+(w-4)+'" y2="'+h/2+'"/>';});
  S('ln_d1','Diagonal ╲','lines',function(w,h){return '<line x1="4" y1="4" x2="'+(w-4)+'" y2="'+(h-4)+'"/>';});
  S('ln_d2','Diagonal ╱','lines',function(w,h){return '<line x1="4" y1="'+(h-4)+'" x2="'+(w-4)+'" y2="4"/>';});
  S('ln_v','Vertical','lines',function(w,h){return '<line x1="'+w/2+'" y1="4" x2="'+w/2+'" y2="'+(h-4)+'"/>';});
  S('ln_45a','Elbow ∠','lines',function(w,h){return '<polyline points="4,'+(h-4)+' 4,4 '+(w-4)+',4" fill="none"/>';});
  S('ln_45b','Elbow ∟','lines',function(w,h){return '<polyline points="4,4 '+(w-4)+',4 '+(w-4)+','+(h-4)+'" fill="none"/>';});
  S('ln_elbow','Elbow ⌐','lines',function(w,h){return '<polyline points="4,'+h/2+' '+w/2+','+h/2+' '+w/2+','+(h-4)+'" fill="none"/>';});
  S('ln_elbow2','Double Elbow','lines',function(w,h){return '<polyline points="4,'+(h*.3).toFixed(0)+' '+(w*.35).toFixed(0)+','+(h*.3).toFixed(0)+' '+(w*.35).toFixed(0)+','+(h*.7).toFixed(0)+' '+(w-4)+','+(h*.7).toFixed(0)+'" fill="none"/>';});
  S('ln_curve','Curve ⌢','lines',function(w,h){return '<path d="M4,'+(h-4)+' Q'+w/2+',4 '+(w-4)+','+(h-4)+'" fill="none"/>';});
  S('ln_scurve','S-Curve','lines',function(w,h){return '<path d="M4,'+h/2+' C'+(w*.3).toFixed(0)+',4 '+(w*.7).toFixed(0)+','+(h-4)+' '+(w-4)+','+h/2+'" fill="none"/>';});
  (function(){
    S('ln_arr_r','Arrow →','lines',function(w,h){var u='ar'+Date.now().toString(36);return '<defs><marker id="'+u+'" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6Z" fill="currentColor"/></marker></defs><line x1="4" y1="'+h/2+'" x2="'+(w-10)+'" y2="'+h/2+'" marker-end="url(#'+u+')"/>';});
    S('ln_arr_l','Arrow ←','lines',function(w,h){var u='al'+Date.now().toString(36);return '<defs><marker id="'+u+'" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto"><path d="M8,0 L0,3 L8,6Z" fill="currentColor"/></marker></defs><line x1="10" y1="'+h/2+'" x2="'+(w-4)+'" y2="'+h/2+'" marker-start="url(#'+u+')"/>';});
    S('ln_arr_lr','Arrow ↔','lines',function(w,h){var u1='a2r'+Date.now().toString(36),u2='a2l'+Date.now().toString(36);return '<defs><marker id="'+u1+'" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6Z" fill="currentColor"/></marker><marker id="'+u2+'" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto"><path d="M8,0 L0,3 L8,6Z" fill="currentColor"/></marker></defs><line x1="10" y1="'+h/2+'" x2="'+(w-10)+'" y2="'+h/2+'" marker-start="url(#'+u2+')" marker-end="url(#'+u1+')"/>';});
    S('ln_arr_d','Arrow ↗','lines',function(w,h){var u='ad'+Date.now().toString(36);return '<defs><marker id="'+u+'" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6Z" fill="currentColor"/></marker></defs><line x1="4" y1="'+(h-4)+'" x2="'+(w-10)+'" y2="8" marker-end="url(#'+u+')"/>';});
  })();
  S('ln_arc','Arc \u2312','lines',function(w,h){return '<path d="M4,'+h/2+' A'+(w/2-4)+','+(h/2-4)+' 0 0 1 '+(w-4)+','+h/2+'" fill="none"/>';});
  S('ln_freeform','Freeform','lines',function(w,h){return '<path d="M4,'+(h*.6).toFixed(0)+' C'+(w*.2).toFixed(0)+','+(h*.2).toFixed(0)+' '+(w*.4).toFixed(0)+','+(h*.8).toFixed(0)+' '+(w*.6).toFixed(0)+','+(h*.4).toFixed(0)+' S'+(w*.9).toFixed(0)+','+(h*.3).toFixed(0)+' '+(w-4)+','+(h*.5).toFixed(0)+'" fill="none"/>';});

  // ═══ RECTANGLES ═══
  S('r_rect','Rectangle','rect',function(w,h){return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'"/>';});
  S('r_rrect','Rounded Rectangle','rect',function(w,h){var r=Math.min(w,h)*.15;return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'" rx="'+r+'"/>';});
  S('r_rrect1','Round Single Corner','rect',function(w,h){var r=Math.min(w,h)*.2;return '<path d="M'+(2+r)+',2 H'+(w-2)+' V'+(h-2)+' H2 V'+(2+r)+' A'+r+','+r+' 0 0 1 '+(2+r)+',2 Z"/>';});
  S('r_snip1','Snip Single Corner','rect',function(w,h){var s=Math.min(w,h)*.2;return '<polygon points="2,2 '+(w-2-s)+',2 '+(w-2)+','+(2+s)+' '+(w-2)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('r_snip2','Snip Same Side','rect',function(w,h){var s=Math.min(w,h)*.18;return '<polygon points="'+(2+s)+',2 '+(w-2-s)+',2 '+(w-2)+','+(2+s)+' '+(w-2)+','+(h-2)+' 2,'+(h-2)+' 2,'+(2+s)+'"/>';});
  S('r_rsnip','Round and Snip','rect',function(w,h){var r=Math.min(w,h)*.18;return '<path d="M'+(2+r)+',2 H'+(w-2-r)+' L'+(w-2)+','+(2+r)+' V'+(h-2)+' H2 V'+(2+r)+' A'+r+','+r+' 0 0 1 '+(2+r)+',2 Z"/>';});
  S('r_snipd','Snip Diagonal','rect',function(w,h){var s=Math.min(w,h)*.18;return '<polygon points="'+(2+s)+',2 '+(w-2)+',2 '+(w-2)+','+(h-2-s)+' '+(w-2-s)+','+(h-2)+' 2,'+(h-2)+' 2,'+(2+s)+'"/>';});
  S('r_rndall','Same Side Corners','rect',function(w,h){var r=Math.min(w,h)*.2;return '<path d="M'+(2+r)+',2 H'+(w-2-r)+' Q'+(w-2)+',2 '+(w-2)+','+(2+r)+' V'+(h-2)+' H2 V'+(2+r)+' Q2,2 '+(2+r)+',2 Z"/>';});

  // ═══ BASIC SHAPES ═══
  S('b_textbox','Text Box','basic',function(w,h){return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'" rx="2" fill-opacity="0.05"/>';});
  S('b_ellipse','Oval','basic',function(w,h){return '<ellipse cx="'+w/2+'" cy="'+h/2+'" rx="'+(w/2-2)+'" ry="'+(h/2-2)+'"/>';});
  S('b_tri','Isosceles Triangle','basic',function(w,h){return '<polygon points="'+w/2+',2 '+(w-2)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('b_rtri','Right Triangle','basic',function(w,h){return '<polygon points="2,2 '+(w-2)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('b_diamond','Diamond','basic',function(w,h){return '<polygon points="'+w/2+',2 '+(w-2)+','+h/2+' '+w/2+','+(h-2)+' 2,'+h/2+'"/>';});
  S('b_para','Parallelogram','basic',function(w,h){return '<polygon points="'+(w*.2).toFixed(0)+','+(h-2)+' 2,2 '+(w*.8).toFixed(0)+',2 '+(w-2)+','+(h-2)+'"/>';});
  S('b_trap','Trapezoid','basic',function(w,h){return '<polygon points="2,'+(h-2)+' '+(w*.2).toFixed(0)+',2 '+(w*.8).toFixed(0)+',2 '+(w-2)+','+(h-2)+'"/>';});
  S('b_pent','Pentagon','basic',function(w,h){var p='';for(var i=0;i<5;i++){var a=-P/2+i*2*P/5;p+=(w/2+(w/2-3)*Math.cos(a)).toFixed(1)+','+(h/2+(h/2-3)*Math.sin(a)).toFixed(1)+' ';}return '<polygon points="'+p.trim()+'"/>';});
  S('b_hex','Hexagon','basic',function(w,h){var p='';for(var i=0;i<6;i++){var a=i*P/3;p+=(w/2+(w/2-3)*Math.cos(a)).toFixed(1)+','+(h/2+(h/2-3)*Math.sin(a)).toFixed(1)+' ';}return '<polygon points="'+p.trim()+'"/>';});
  S('b_hept','Heptagon','basic',function(w,h){var p='';for(var i=0;i<7;i++){var a=-P/2+i*2*P/7;p+=(w/2+(w/2-3)*Math.cos(a)).toFixed(1)+','+(h/2+(h/2-3)*Math.sin(a)).toFixed(1)+' ';}return '<polygon points="'+p.trim()+'"/>';});
  S('b_oct','Octagon','basic',function(w,h){var p='';for(var i=0;i<8;i++){var a=-P/2+i*2*P/8;p+=(w/2+(w/2-3)*Math.cos(a)).toFixed(1)+','+(h/2+(h/2-3)*Math.sin(a)).toFixed(1)+' ';}return '<polygon points="'+p.trim()+'"/>';});
  S('b_dec','Decagon','basic',function(w,h){var p='';for(var i=0;i<10;i++){var a=-P/2+i*2*P/10;p+=(w/2+(w/2-3)*Math.cos(a)).toFixed(1)+','+(h/2+(h/2-3)*Math.sin(a)).toFixed(1)+' ';}return '<polygon points="'+p.trim()+'"/>';});
  S('b_12gon','Dodecagon','basic',function(w,h){var p='';for(var i=0;i<12;i++){var a=-P/2+i*2*P/12;p+=(w/2+(w/2-3)*Math.cos(a)).toFixed(1)+','+(h/2+(h/2-3)*Math.sin(a)).toFixed(1)+' ';}return '<polygon points="'+p.trim()+'"/>';});
  S('b_cross','Cross','basic',function(w,h){return '<polygon points="'+(w*.35).toFixed(0)+',2 '+(w*.65).toFixed(0)+',2 '+(w*.65).toFixed(0)+','+(h*.35).toFixed(0)+' '+(w-2)+','+(h*.35).toFixed(0)+' '+(w-2)+','+(h*.65).toFixed(0)+' '+(w*.65).toFixed(0)+','+(h*.65).toFixed(0)+' '+(w*.65).toFixed(0)+','+(h-2)+' '+(w*.35).toFixed(0)+','+(h-2)+' '+(w*.35).toFixed(0)+','+(h*.65).toFixed(0)+' 2,'+(h*.65).toFixed(0)+' 2,'+(h*.35).toFixed(0)+' '+(w*.35).toFixed(0)+','+(h*.35).toFixed(0)+'"/>';});
  S('b_frame','Frame','basic',function(w,h){return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'"/><rect x="'+(w*.15).toFixed(0)+'" y="'+(h*.15).toFixed(0)+'" width="'+(w*.7).toFixed(0)+'" height="'+(h*.7).toFixed(0)+'" fill="#fff"/>';});
  S('b_halfcircle','Half Circle','basic',function(w,h){var r=Math.min(w,h)/2-2;return '<path d="M'+w/2+','+(h/2-r)+' A'+r+','+r+' 0 0 1 '+w/2+','+(h/2+r)+' Z"/>';});
  S('b_chord','Chord','basic',function(w,h){var r=Math.min(w,h)/2-3;return '<path d="M'+(w/2-r*0.7).toFixed(1)+','+(h/2-r*0.7).toFixed(1)+' A'+r+','+r+' 0 1 1 '+(w/2+r*0.7).toFixed(1)+','+(h/2-r*0.7).toFixed(1)+' Z"/>';});
  S('b_pie','Pie','basic',function(w,h){var cx=w/2,cy=h/2,r=Math.min(w,h)/2-3;return '<path d="M'+cx+','+cy+' L'+cx+','+(cy-r)+' A'+r+','+r+' 0 1 1 '+(cx-r)+','+cy+' Z"/>';});
  S('b_ring','Donut','basic',function(w,h){var r1=Math.min(w,h)/2-2,r2=r1*0.6;return '<circle cx="'+w/2+'" cy="'+h/2+'" r="'+r1+'"/><circle cx="'+w/2+'" cy="'+h/2+'" r="'+r2+'" fill="#fff"/>';});
  S('b_noentry','No Symbol','basic',function(w,h){var r=Math.min(w,h)/2-2;return '<circle cx="'+w/2+'" cy="'+h/2+'" r="'+r+'"/><line x1="'+(w/2-r*0.7).toFixed(0)+'" y1="'+(h/2+r*0.7).toFixed(0)+'" x2="'+(w/2+r*0.7).toFixed(0)+'" y2="'+(h/2-r*0.7).toFixed(0)+'" stroke-width="3"/>';});
  S('b_heart','Heart','basic',function(w,h){var cx=w/2;return '<path d="M'+cx+','+(h*.85).toFixed(0)+' C'+(w*.1).toFixed(0)+','+(h*.55).toFixed(0)+' 2,'+(h*.3).toFixed(0)+' '+(w*.25).toFixed(0)+','+(h*.15).toFixed(0)+' C'+(w*.4).toFixed(0)+','+(h*.05).toFixed(0)+' '+cx+','+(h*.2).toFixed(0)+' '+cx+','+(h*.35).toFixed(0)+' C'+cx+','+(h*.2).toFixed(0)+' '+(w*.6).toFixed(0)+','+(h*.05).toFixed(0)+' '+(w*.75).toFixed(0)+','+(h*.15).toFixed(0)+' C'+(w-2)+','+(h*.3).toFixed(0)+' '+(w*.9).toFixed(0)+','+(h*.55).toFixed(0)+' '+cx+','+(h*.85).toFixed(0)+'Z"/>';});
  S('b_lightning','Lightning Bolt','basic',function(w,h){return '<polygon points="'+(w*.55).toFixed(0)+',2 '+(w*.25).toFixed(0)+','+(h*.45).toFixed(0)+' '+(w*.45).toFixed(0)+','+(h*.45).toFixed(0)+' '+(w*.35).toFixed(0)+','+(h-2)+' '+(w*.75).toFixed(0)+','+(h*.4).toFixed(0)+' '+(w*.55).toFixed(0)+','+(h*.4).toFixed(0)+' '+(w*.65).toFixed(0)+',2"/>';});
  S('b_moon','Moon','basic',function(w,h){var r=Math.min(w,h)/2-3;return '<path d="M'+(w/2+r*0.3).toFixed(1)+','+(h/2-r)+' A'+r+','+r+' 0 1 0 '+(w/2+r*0.3).toFixed(1)+','+(h/2+r)+' A'+(r*0.7).toFixed(1)+','+(r*0.7).toFixed(1)+' 0 0 1 '+(w/2+r*0.3).toFixed(1)+','+(h/2-r)+' Z"/>';});
  S('b_cloud','Cloud','basic',function(w,h){return '<path d="M'+(w*.2).toFixed(0)+','+(h*.7).toFixed(0)+' A'+(w*.12).toFixed(0)+','+(h*.15).toFixed(0)+' 0 0 1 '+(w*.15).toFixed(0)+','+(h*.45).toFixed(0)+' A'+(w*.15).toFixed(0)+','+(h*.18).toFixed(0)+' 0 0 1 '+(w*.35).toFixed(0)+','+(h*.25).toFixed(0)+' A'+(w*.14).toFixed(0)+','+(h*.15).toFixed(0)+' 0 0 1 '+(w*.55).toFixed(0)+','+(h*.2).toFixed(0)+' A'+(w*.15).toFixed(0)+','+(h*.18).toFixed(0)+' 0 0 1 '+(w*.78).toFixed(0)+','+(h*.32).toFixed(0)+' A'+(w*.12).toFixed(0)+','+(h*.15).toFixed(0)+' 0 0 1 '+(w*.85).toFixed(0)+','+(h*.55).toFixed(0)+' A'+(w*.1).toFixed(0)+','+(h*.12).toFixed(0)+' 0 0 1 '+(w*.78).toFixed(0)+','+(h*.7).toFixed(0)+' Z"/>';});
  S('b_cylinder','Cylinder','basic',function(w,h){var ey=h*.12;return '<ellipse cx="'+w/2+'" cy="'+ey.toFixed(0)+'" rx="'+(w/2-3)+'" ry="'+ey.toFixed(0)+'" fill-opacity="0.3"/><rect x="3" y="'+ey.toFixed(0)+'" width="'+(w-6)+'" height="'+(h-2*ey).toFixed(0)+'"/><ellipse cx="'+w/2+'" cy="'+(h-ey).toFixed(0)+'" rx="'+(w/2-3)+'" ry="'+ey.toFixed(0)+'"/>';});
  S('b_cube','Cube','basic',function(w,h){var d=w*.2;return '<polygon points="'+(2+d)+',2 '+(w-2)+',2 '+(w-2)+','+(h-2-d)+' '+(w-2-d)+','+(h-2)+' 2,'+(h-2)+' 2,'+(2+d)+'"/><polyline points="2,'+(2+d)+' '+(w-2-d)+','+(2+d)+' '+(w-2-d)+','+(h-2)+'" fill="none"/><polyline points="'+(w-2-d)+','+(2+d)+' '+(w-2)+',2" fill="none"/>';});
  S('b_lbrace','Left Brace','basic',function(w,h){return '<path d="M'+(w*.7).toFixed(0)+',4 C'+(w*.4).toFixed(0)+',4 '+(w*.4).toFixed(0)+','+(h*.35).toFixed(0)+' '+(w*.25).toFixed(0)+','+h/2+' C'+(w*.4).toFixed(0)+','+(h*.65).toFixed(0)+' '+(w*.4).toFixed(0)+','+(h-4)+' '+(w*.7).toFixed(0)+','+(h-4)+'" fill="none"/>';});
  S('b_rbrace','Right Brace','basic',function(w,h){return '<path d="M'+(w*.3).toFixed(0)+',4 C'+(w*.6).toFixed(0)+',4 '+(w*.6).toFixed(0)+','+(h*.35).toFixed(0)+' '+(w*.75).toFixed(0)+','+h/2+' C'+(w*.6).toFixed(0)+','+(h*.65).toFixed(0)+' '+(w*.6).toFixed(0)+','+(h-4)+' '+(w*.3).toFixed(0)+','+(h-4)+'" fill="none"/>';});
  S('b_lbracket','Left Bracket','basic',function(w,h){return '<polyline points="'+(w*.65).toFixed(0)+',4 '+(w*.35).toFixed(0)+',4 '+(w*.35).toFixed(0)+','+(h-4)+' '+(w*.65).toFixed(0)+','+(h-4)+'" fill="none"/>';});
  S('b_rbracket','Right Bracket','basic',function(w,h){return '<polyline points="'+(w*.35).toFixed(0)+',4 '+(w*.65).toFixed(0)+',4 '+(w*.65).toFixed(0)+','+(h-4)+' '+(w*.35).toFixed(0)+','+(h-4)+'" fill="none"/>';});

  // ═══ BLOCK ARROWS ═══
  S('a_right','Right Arrow','arrows',function(w,h){return '<polygon points="2,'+(h*.3).toFixed(0)+' '+(w*.6).toFixed(0)+','+(h*.3).toFixed(0)+' '+(w*.6).toFixed(0)+',2 '+(w-2)+','+h/2+' '+(w*.6).toFixed(0)+','+(h-2)+' '+(w*.6).toFixed(0)+','+(h*.7).toFixed(0)+' 2,'+(h*.7).toFixed(0)+'"/>';});
  S('a_left','Left Arrow','arrows',function(w,h){return '<polygon points="'+(w-2)+','+(h*.3).toFixed(0)+' '+(w*.4).toFixed(0)+','+(h*.3).toFixed(0)+' '+(w*.4).toFixed(0)+',2 2,'+h/2+' '+(w*.4).toFixed(0)+','+(h-2)+' '+(w*.4).toFixed(0)+','+(h*.7).toFixed(0)+' '+(w-2)+','+(h*.7).toFixed(0)+'"/>';});
  S('a_up','Up Arrow','arrows',function(w,h){return '<polygon points="'+(w*.3).toFixed(0)+','+(h-2)+' '+(w*.3).toFixed(0)+','+(h*.4).toFixed(0)+' 2,'+(h*.4).toFixed(0)+' '+w/2+',2 '+(w-2)+','+(h*.4).toFixed(0)+' '+(w*.7).toFixed(0)+','+(h*.4).toFixed(0)+' '+(w*.7).toFixed(0)+','+(h-2)+'"/>';});
  S('a_down','Down Arrow','arrows',function(w,h){return '<polygon points="'+(w*.3).toFixed(0)+',2 '+(w*.7).toFixed(0)+',2 '+(w*.7).toFixed(0)+','+(h*.6).toFixed(0)+' '+(w-2)+','+(h*.6).toFixed(0)+' '+w/2+','+(h-2)+' 2,'+(h*.6).toFixed(0)+' '+(w*.3).toFixed(0)+','+(h*.6).toFixed(0)+'"/>';});
  S('a_lr','Left-Right Arrow','arrows',function(w,h){return '<polygon points="2,'+h/2+' '+(w*.18).toFixed(0)+','+(h*.2).toFixed(0)+' '+(w*.18).toFixed(0)+','+(h*.38).toFixed(0)+' '+(w*.82).toFixed(0)+','+(h*.38).toFixed(0)+' '+(w*.82).toFixed(0)+','+(h*.2).toFixed(0)+' '+(w-2)+','+h/2+' '+(w*.82).toFixed(0)+','+(h*.8).toFixed(0)+' '+(w*.82).toFixed(0)+','+(h*.62).toFixed(0)+' '+(w*.18).toFixed(0)+','+(h*.62).toFixed(0)+' '+(w*.18).toFixed(0)+','+(h*.8).toFixed(0)+'"/>';});
  S('a_ud','Up-Down Arrow','arrows',function(w,h){return '<polygon points="'+w/2+',2 '+(w*.8).toFixed(0)+','+(h*.18).toFixed(0)+' '+(w*.62).toFixed(0)+','+(h*.18).toFixed(0)+' '+(w*.62).toFixed(0)+','+(h*.82).toFixed(0)+' '+(w*.8).toFixed(0)+','+(h*.82).toFixed(0)+' '+w/2+','+(h-2)+' '+(w*.2).toFixed(0)+','+(h*.82).toFixed(0)+' '+(w*.38).toFixed(0)+','+(h*.82).toFixed(0)+' '+(w*.38).toFixed(0)+','+(h*.18).toFixed(0)+' '+(w*.2).toFixed(0)+','+(h*.18).toFixed(0)+'"/>';});
  S('a_quad','Quad Arrow','arrows',function(w,h){return '<polygon points="'+w/2+',2 '+(w*.62).toFixed(0)+','+(h*.25).toFixed(0)+' '+(w*.62).toFixed(0)+','+(h*.38).toFixed(0)+' '+(w*.75).toFixed(0)+','+(h*.38).toFixed(0)+' '+(w-2)+','+h/2+' '+(w*.75).toFixed(0)+','+(h*.62).toFixed(0)+' '+(w*.62).toFixed(0)+','+(h*.62).toFixed(0)+' '+(w*.62).toFixed(0)+','+(h*.75).toFixed(0)+' '+w/2+','+(h-2)+' '+(w*.38).toFixed(0)+','+(h*.75).toFixed(0)+' '+(w*.38).toFixed(0)+','+(h*.62).toFixed(0)+' '+(w*.25).toFixed(0)+','+(h*.62).toFixed(0)+' 2,'+h/2+' '+(w*.25).toFixed(0)+','+(h*.38).toFixed(0)+' '+(w*.38).toFixed(0)+','+(h*.38).toFixed(0)+' '+(w*.38).toFixed(0)+','+(h*.25).toFixed(0)+'"/>';});
  S('a_lrarr','Bent Arrow','arrows',function(w,h){return '<polygon points="2,'+(h*.25).toFixed(0)+' '+(w*.15).toFixed(0)+','+(h*.1).toFixed(0)+' '+(w*.15).toFixed(0)+','+(h*.2).toFixed(0)+' '+(w-2)+','+(h*.2).toFixed(0)+' '+(w-2)+','+(h*.3).toFixed(0)+' '+(w*.15).toFixed(0)+','+(h*.3).toFixed(0)+' '+(w*.15).toFixed(0)+','+(h*.4).toFixed(0)+'"/><polygon points="'+(w-2)+','+(h*.75).toFixed(0)+' '+(w*.85).toFixed(0)+','+(h*.6).toFixed(0)+' '+(w*.85).toFixed(0)+','+(h*.7).toFixed(0)+' 2,'+(h*.7).toFixed(0)+' 2,'+(h*.8).toFixed(0)+' '+(w*.85).toFixed(0)+','+(h*.8).toFixed(0)+' '+(w*.85).toFixed(0)+','+(h*.9).toFixed(0)+'"/>';});
  S('a_uturn','U-Turn Arrow','arrows',function(w,h){return '<path d="M'+(w*.25).toFixed(0)+','+(h-2)+' V'+(h*.35).toFixed(0)+' A'+(w*.25).toFixed(0)+','+(h*.25).toFixed(0)+' 0 0 1 '+(w*.75).toFixed(0)+','+(h*.35).toFixed(0)+' V'+(h*.55).toFixed(0)+' L'+(w-2)+','+(h*.55).toFixed(0)+' L'+(w*.6).toFixed(0)+','+(h*.8).toFixed(0)+' L'+(w*.6).toFixed(0)+','+(h*.55).toFixed(0)+'" fill="none"/>';});
  S('a_curved','Curved Arrow','arrows',function(w,h){return '<path d="M4,'+(h*.3).toFixed(0)+' Q'+w/2+',2 '+(w*.7).toFixed(0)+','+(h*.3).toFixed(0)+' L'+(w*.7).toFixed(0)+','+(h*.15).toFixed(0)+' L'+(w-2)+','+(h*.45).toFixed(0)+' L'+(w*.55).toFixed(0)+','+(h*.45).toFixed(0)+' L'+(w*.55).toFixed(0)+','+(h*.3).toFixed(0)+' Q'+w/2+','+(h*.15).toFixed(0)+' '+(w*.25).toFixed(0)+','+(h*.3).toFixed(0)+' Z"/>';});
  S('a_chev','Chevron','arrows',function(w,h){return '<polygon points="2,2 '+(w*.65).toFixed(0)+',2 '+(w-2)+','+h/2+' '+(w*.65).toFixed(0)+','+(h-2)+' 2,'+(h-2)+' '+(w*.35).toFixed(0)+','+h/2+'"/>';});
  S('a_pent','Pentagon Arrow','arrows',function(w,h){return '<polygon points="2,2 '+(w*.75).toFixed(0)+',2 '+(w-2)+','+h/2+' '+(w*.75).toFixed(0)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('a_strip','Striped Arrow','arrows',function(w,h){return '<polygon points="2,'+(h*.25).toFixed(0)+' '+(w*.7).toFixed(0)+','+(h*.25).toFixed(0)+' '+(w*.7).toFixed(0)+',2 '+(w-2)+','+h/2+' '+(w*.7).toFixed(0)+','+(h-2)+' '+(w*.7).toFixed(0)+','+(h*.75).toFixed(0)+' 2,'+(h*.75).toFixed(0)+' '+(w*.2).toFixed(0)+','+h/2+'"/>';});
  S('a_notch','Notched Arrow','arrows',function(w,h){return '<polygon points="2,'+(h*.3).toFixed(0)+' '+(w*.55).toFixed(0)+','+(h*.3).toFixed(0)+' '+(w*.55).toFixed(0)+',2 '+(w-2)+','+h/2+' '+(w*.55).toFixed(0)+','+(h-2)+' '+(w*.55).toFixed(0)+','+(h*.7).toFixed(0)+' 2,'+(h*.7).toFixed(0)+' '+(w*.15).toFixed(0)+','+h/2+'"/>';});
  S('a_circular','Circular Arrow','arrows',function(w,h){var r=Math.min(w,h)/2-4;var cx=w/2,cy=h/2;return '<path d="M'+(cx+r*0.7).toFixed(1)+','+(cy-r*0.7).toFixed(1)+' A'+r+','+r+' 0 1 0 '+(cx+r).toFixed(1)+','+cy+'" fill="none" stroke-width="'+(Math.min(w,h)*0.08).toFixed(0)+'"/><polygon points="'+(cx+r+4)+','+(cy-4)+' '+(cx+r+4)+','+(cy+4)+' '+(cx+r-4)+','+cy+'" fill="currentColor" stroke="none"/>';});

  // ═══ EQUATION SHAPES ═══
  S('eq_plus','Plus','equation',function(w,h){return '<polygon points="'+(w*.35).toFixed(0)+',2 '+(w*.65).toFixed(0)+',2 '+(w*.65).toFixed(0)+','+(h*.35).toFixed(0)+' '+(w-2)+','+(h*.35).toFixed(0)+' '+(w-2)+','+(h*.65).toFixed(0)+' '+(w*.65).toFixed(0)+','+(h*.65).toFixed(0)+' '+(w*.65).toFixed(0)+','+(h-2)+' '+(w*.35).toFixed(0)+','+(h-2)+' '+(w*.35).toFixed(0)+','+(h*.65).toFixed(0)+' 2,'+(h*.65).toFixed(0)+' 2,'+(h*.35).toFixed(0)+' '+(w*.35).toFixed(0)+','+(h*.35).toFixed(0)+'"/>';});
  S('eq_minus','Minus','equation',function(w,h){return '<rect x="2" y="'+(h*.38).toFixed(0)+'" width="'+(w-4)+'" height="'+(h*.24).toFixed(0)+'" rx="2"/>';});
  S('eq_mult','Multiply','equation',function(w,h){return '<path d="M'+(w*.2).toFixed(0)+','+(h*.2).toFixed(0)+' L'+(w*.8).toFixed(0)+','+(h*.8).toFixed(0)+' M'+(w*.8).toFixed(0)+','+(h*.2).toFixed(0)+' L'+(w*.2).toFixed(0)+','+(h*.8).toFixed(0)+'" fill="none" stroke-width="'+(Math.min(w,h)*.12).toFixed(0)+'" stroke-linecap="round"/>';});
  S('eq_div','Divide','equation',function(w,h){var r=Math.min(w,h)*.08;return '<rect x="2" y="'+(h*.43).toFixed(0)+'" width="'+(w-4)+'" height="'+(h*.14).toFixed(0)+'" rx="2"/><circle cx="'+w/2+'" cy="'+(h*.22).toFixed(0)+'" r="'+r.toFixed(0)+'"/><circle cx="'+w/2+'" cy="'+(h*.78).toFixed(0)+'" r="'+r.toFixed(0)+'"/>';});
  S('eq_equal','Equal','equation',function(w,h){return '<rect x="4" y="'+(h*.28).toFixed(0)+'" width="'+(w-8)+'" height="'+(h*.14).toFixed(0)+'" rx="2"/><rect x="4" y="'+(h*.58).toFixed(0)+'" width="'+(w-8)+'" height="'+(h*.14).toFixed(0)+'" rx="2"/>';});
  S('eq_neq','Not Equal','equation',function(w,h){return '<rect x="4" y="'+(h*.28).toFixed(0)+'" width="'+(w-8)+'" height="'+(h*.12).toFixed(0)+'" rx="2"/><rect x="4" y="'+(h*.58).toFixed(0)+'" width="'+(w-8)+'" height="'+(h*.12).toFixed(0)+'" rx="2"/><line x1="'+(w*.65).toFixed(0)+'" y1="'+(h*.15).toFixed(0)+'" x2="'+(w*.35).toFixed(0)+'" y2="'+(h*.85).toFixed(0)+'" fill="none" stroke-width="3"/>';});

  // ═══ FLOWCHART ═══
  S('f_process','Process','flow',function(w,h){return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'"/>';});
  S('f_decision','Decision','flow',function(w,h){return '<polygon points="'+w/2+',2 '+(w-2)+','+h/2+' '+w/2+','+(h-2)+' 2,'+h/2+'"/>';});
  S('f_data','Data','flow',function(w,h){return '<polygon points="'+(w*.15).toFixed(0)+','+(h-2)+' 2,2 '+(w*.85).toFixed(0)+',2 '+(w-2)+','+(h-2)+'"/>';});
  S('f_predef','Predefined Process','flow',function(w,h){return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'"/><line x1="'+(w*.12).toFixed(0)+'" y1="2" x2="'+(w*.12).toFixed(0)+'" y2="'+(h-2)+'"/><line x1="'+(w*.88).toFixed(0)+'" y1="2" x2="'+(w*.88).toFixed(0)+'" y2="'+(h-2)+'"/>';});
  S('f_intstore','Internal Storage','flow',function(w,h){return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'"/><line x1="2" y1="'+(h*.2).toFixed(0)+'" x2="'+(w-2)+'" y2="'+(h*.2).toFixed(0)+'"/><line x1="'+(w*.15).toFixed(0)+'" y1="2" x2="'+(w*.15).toFixed(0)+'" y2="'+(h-2)+'"/>';});
  S('f_document','Document','flow',function(w,h){return '<path d="M2,2 H'+(w-2)+' V'+(h*.75).toFixed(0)+' C'+(w*.75).toFixed(0)+','+(h*.65).toFixed(0)+' '+(w*.5).toFixed(0)+','+(h*.9).toFixed(0)+' '+(w*.25).toFixed(0)+','+(h*.75).toFixed(0)+' C'+(w*.12).toFixed(0)+','+(h*.68).toFixed(0)+' 2,'+(h*.85).toFixed(0)+' 2,'+(h*.85).toFixed(0)+' Z"/>';});
  S('f_multidoc','Multi-Document','flow',function(w,h){return '<rect x="6" y="2" width="'+(w-12)+'" height="'+(h-12)+'" rx="2"/><rect x="4" y="5" width="'+(w-12)+'" height="'+(h-12)+'" rx="2"/><rect x="2" y="8" width="'+(w-12)+'" height="'+(h-12)+'" rx="2"/>';});
  S('f_term','Terminator','flow',function(w,h){var r=h/2-2;return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'" rx="'+r+'"/>';});
  S('f_prep','Preparation','flow',function(w,h){return '<polygon points="'+(w*.15).toFixed(0)+','+h/2+' '+(w*.3).toFixed(0)+',2 '+(w*.7).toFixed(0)+',2 '+(w*.85).toFixed(0)+','+h/2+' '+(w*.7).toFixed(0)+','+(h-2)+' '+(w*.3).toFixed(0)+','+(h-2)+'"/>';});
  S('f_manual','Manual Operation','flow',function(w,h){return '<polygon points="2,2 '+(w-2)+',2 '+(w*.8).toFixed(0)+','+(h-2)+' '+(w*.2).toFixed(0)+','+(h-2)+'"/>';});
  S('f_manualinp','Manual Input','flow',function(w,h){return '<polygon points="2,'+(h*.25).toFixed(0)+' '+(w-2)+',2 '+(w-2)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('f_display','Display','flow',function(w,h){var r=h/2;return '<path d="M'+(w*.15).toFixed(0)+',2 H'+(w*.7).toFixed(0)+' C'+(w-2)+',2 '+(w-2)+','+(h-2)+' '+(w*.7).toFixed(0)+','+(h-2)+' H'+(w*.15).toFixed(0)+' L2,'+h/2+' Z"/>';});
  S('f_offpage','Off-page Connector','flow',function(w,h){return '<polygon points="2,2 '+(w-2)+',2 '+(w-2)+','+(h*.65).toFixed(0)+' '+w/2+','+(h-2)+' 2,'+(h*.65).toFixed(0)+'"/>';});
  S('f_merge','Merge','flow',function(w,h){return '<polygon points="2,2 '+(w-2)+',2 '+w/2+','+(h-2)+'"/>';});
  S('f_delay','Delay','flow',function(w,h){return '<path d="M2,2 H'+(w*.6).toFixed(0)+' A'+(w*.38).toFixed(0)+','+(h/2-2)+' 0 0 1 '+(w*.6).toFixed(0)+','+(h-2)+' H2 Z"/>';});
  S('f_sortop','Sort','flow',function(w,h){return '<polygon points="'+w/2+',2 '+(w-2)+','+h/2+' '+w/2+','+(h-2)+' 2,'+h/2+'"/><line x1="2" y1="'+h/2+'" x2="'+(w-2)+'" y2="'+h/2+'"/>';});
  S('f_or','Or','flow',function(w,h){var r=Math.min(w,h)/2-2;return '<circle cx="'+w/2+'" cy="'+h/2+'" r="'+r+'"/><line x1="'+w/2+'" y1="'+(h/2-r)+'" x2="'+w/2+'" y2="'+(h/2+r)+'"/><line x1="'+(w/2-r)+'" y1="'+h/2+'" x2="'+(w/2+r)+'" y2="'+h/2+'"/>';});
  S('f_collate','Collate','flow',function(w,h){return '<polygon points="2,2 '+(w-2)+',2 '+w/2+','+h/2+'"/><polygon points="'+w/2+','+h/2+' '+(w-2)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('f_sum','Summing Junction','flow',function(w,h){return '<polygon points="2,2 '+(w-2)+',2 '+w/2+','+h/2+' '+(w-2)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('f_extract','Extract','flow',function(w,h){return '<polygon points="'+w/2+',2 '+(w-2)+','+(h-2)+' 2,'+(h-2)+'"/>';});
  S('f_db','Database','flow',function(w,h){var ey=h*.12;return '<ellipse cx="'+w/2+'" cy="'+ey.toFixed(0)+'" rx="'+(w/2-3)+'" ry="'+ey.toFixed(0)+'"/><rect x="3" y="'+ey.toFixed(0)+'" width="'+(w-6)+'" height="'+(h-2*ey).toFixed(0)+'"/><ellipse cx="'+w/2+'" cy="'+(h-ey).toFixed(0)+'" rx="'+(w/2-3)+'" ry="'+ey.toFixed(0)+'"/>';});
  S('f_connector','Connector','flow',function(w,h){var r=Math.min(w,h)/2-2;return '<circle cx="'+w/2+'" cy="'+h/2+'" r="'+r+'"/>';});

  // ═══ STARS AND BANNERS ═══
  function star(n,w,h,ir){var cx=w/2,cy=h/2,or=Math.min(w,h)/2-2,inn=or*(ir||0.4),p='';for(var i=0;i<n;i++){var a1=-P/2+i*2*P/n,a2=a1+P/n;p+=(cx+or*Math.cos(a1)).toFixed(1)+','+(cy+or*Math.sin(a1)).toFixed(1)+' '+(cx+inn*Math.cos(a2)).toFixed(1)+','+(cy+inn*Math.sin(a2)).toFixed(1)+' ';}return '<polygon points="'+p.trim()+'"/>';}
  S('s_star4','4-Point Star','stars',function(w,h){return star(4,w,h,0.45);});
  S('s_star5','5-Point Star','stars',function(w,h){return star(5,w,h,0.4);});
  S('s_star6','6-Point Star','stars',function(w,h){return star(6,w,h,0.5);});
  S('s_star7','7-Point Star','stars',function(w,h){return star(7,w,h,0.45);});
  S('s_star8','8-Point Star','stars',function(w,h){return star(8,w,h,0.38);});
  S('s_star10','10-Point Star','stars',function(w,h){return star(10,w,h,0.45);});
  S('s_star12','12-Point Star','stars',function(w,h){return star(12,w,h,0.5);});
  S('s_star16','16-Point Star','stars',function(w,h){return star(16,w,h,0.55);});
  S('s_star24','24-Point Star','stars',function(w,h){return star(24,w,h,0.6);});
  S('s_star32','32-Point Star','stars',function(w,h){return star(32,w,h,0.65);});
  S('s_explosion1','Explosion 1','stars',function(w,h){return star(8,w,h,0.3);});
  S('s_explosion2','Explosion 2','stars',function(w,h){return star(12,w,h,0.3);});
  S('s_ribbon','Horizontal Scroll','stars',function(w,h){return '<path d="M2,'+(h*.2).toFixed(0)+' H'+(w-2)+' V'+(h*.8).toFixed(0)+' H2 Z M2,'+(h*.2).toFixed(0)+' L'+(w*.08).toFixed(0)+',2 L'+(w*.16).toFixed(0)+','+(h*.2).toFixed(0)+' M'+(w-2)+','+(h*.2).toFixed(0)+' L'+(w*.92).toFixed(0)+',2 L'+(w*.84).toFixed(0)+','+(h*.2).toFixed(0)+'"/>';});
  S('s_scroll','Vertical Scroll','stars',function(w,h){var t=h*.12;return '<rect x="'+(t*1.2).toFixed(0)+'" y="'+t.toFixed(0)+'" width="'+(w-t*2.4).toFixed(0)+'" height="'+(h-t*2).toFixed(0)+'" rx="2"/><ellipse cx="'+(t*1.2).toFixed(0)+'" cy="'+t.toFixed(0)+'" rx="'+(t*.6).toFixed(0)+'" ry="'+t.toFixed(0)+'"/><ellipse cx="'+(w-t*1.2).toFixed(0)+'" cy="'+(h-t).toFixed(0)+'" rx="'+(t*.6).toFixed(0)+'" ry="'+t.toFixed(0)+'"/>';});
  S('s_wave','Wave','stars',function(w,h){return '<path d="M2,'+(h*.35).toFixed(0)+' Q'+(w*.25).toFixed(0)+',2 '+w/2+','+(h*.35).toFixed(0)+' Q'+(w*.75).toFixed(0)+','+(h*.7).toFixed(0)+' '+(w-2)+','+(h*.35).toFixed(0)+' V'+(h*.65).toFixed(0)+' Q'+(w*.75).toFixed(0)+','+(h-2)+' '+w/2+','+(h*.65).toFixed(0)+' Q'+(w*.25).toFixed(0)+','+(h*.3).toFixed(0)+' 2,'+(h*.65).toFixed(0)+' Z"/>';});
  S('s_dwave','Double Wave','stars',function(w,h){return '<path d="M2,'+(h*.25).toFixed(0)+' Q'+(w*.15).toFixed(0)+',2 '+(w*.3).toFixed(0)+','+(h*.25).toFixed(0)+' Q'+(w*.45).toFixed(0)+','+(h*.5).toFixed(0)+' '+(w*.6).toFixed(0)+','+(h*.25).toFixed(0)+' Q'+(w*.75).toFixed(0)+',2 '+(w-2)+','+(h*.25).toFixed(0)+' V'+(h*.75).toFixed(0)+' Q'+(w*.75).toFixed(0)+','+(h-2)+' '+(w*.6).toFixed(0)+','+(h*.75).toFixed(0)+' Q'+(w*.45).toFixed(0)+','+(h*.5).toFixed(0)+' '+(w*.3).toFixed(0)+','+(h*.75).toFixed(0)+' Q'+(w*.15).toFixed(0)+','+(h-2)+' 2,'+(h*.75).toFixed(0)+' Z"/>';});

  // ═══ CALLOUTS ═══
  S('c_rect','Rectangular Callout','callout',function(w,h){return '<path d="M2,2 H'+(w-2)+' V'+(h*.65).toFixed(0)+' H'+(w*.4).toFixed(0)+' L'+(w*.15).toFixed(0)+','+(h-2)+' L'+(w*.3).toFixed(0)+','+(h*.65).toFixed(0)+' H2 Z"/>';});
  S('c_rrect','Rounded Callout','callout',function(w,h){var r=Math.min(w,h)*.1;return '<path d="M'+(2+r)+',2 H'+(w-2-r)+' Q'+(w-2)+',2 '+(w-2)+','+(2+r)+' V'+(h*.65-r).toFixed(0)+' Q'+(w-2)+','+(h*.65).toFixed(0)+' '+(w-2-r)+','+(h*.65).toFixed(0)+' H'+(w*.4).toFixed(0)+' L'+(w*.15).toFixed(0)+','+(h-2)+' L'+(w*.3).toFixed(0)+','+(h*.65).toFixed(0)+' H'+(2+r)+' Q2,'+(h*.65).toFixed(0)+' 2,'+(h*.65-r).toFixed(0)+' V'+(2+r)+' Q2,2 '+(2+r)+',2 Z"/>';});
  S('c_ellipse','Oval Callout','callout',function(w,h){return '<ellipse cx="'+w/2+'" cy="'+(h*.42).toFixed(0)+'" rx="'+(w/2-3)+'" ry="'+(h*.38).toFixed(0)+'"/><polygon points="'+(w*.35).toFixed(0)+','+(h*.72).toFixed(0)+' '+(w*.15).toFixed(0)+','+(h-2)+' '+(w*.45).toFixed(0)+','+(h*.72).toFixed(0)+'"/>';});
  S('c_cloud','Cloud Callout','callout',function(w,h){return '<path d="M'+(w*.2).toFixed(0)+','+(h*.6).toFixed(0)+' A'+(w*.12).toFixed(0)+','+(h*.12).toFixed(0)+' 0 0 1 '+(w*.15).toFixed(0)+','+(h*.4).toFixed(0)+' A'+(w*.15).toFixed(0)+','+(h*.15).toFixed(0)+' 0 0 1 '+(w*.35).toFixed(0)+','+(h*.2).toFixed(0)+' A'+(w*.14).toFixed(0)+','+(h*.12).toFixed(0)+' 0 0 1 '+(w*.55).toFixed(0)+','+(h*.15).toFixed(0)+' A'+(w*.15).toFixed(0)+','+(h*.15).toFixed(0)+' 0 0 1 '+(w*.78).toFixed(0)+','+(h*.28).toFixed(0)+' A'+(w*.12).toFixed(0)+','+(h*.12).toFixed(0)+' 0 0 1 '+(w*.85).toFixed(0)+','+(h*.48).toFixed(0)+' A'+(w*.1).toFixed(0)+','+(h*.1).toFixed(0)+' 0 0 1 '+(w*.78).toFixed(0)+','+(h*.6).toFixed(0)+' Z"/><circle cx="'+(w*.28).toFixed(0)+'" cy="'+(h*.72).toFixed(0)+'" r="'+(Math.min(w,h)*.06).toFixed(0)+'"/><circle cx="'+(w*.18).toFixed(0)+'" cy="'+(h*.82).toFixed(0)+'" r="'+(Math.min(w,h)*.04).toFixed(0)+'"/>';});
  S('c_line_r','Line Callout R','callout',function(w,h){return '<rect x="2" y="2" width="'+(w*.75).toFixed(0)+'" height="'+(h-4)+'" rx="2"/><line x1="'+(w*.77).toFixed(0)+'" y1="'+h/2+'" x2="'+(w-2)+'" y2="'+h/2+'"/>';});
  S('c_line_l','Line Callout L','callout',function(w,h){return '<rect x="'+(w*.25).toFixed(0)+'" y="2" width="'+(w*.73).toFixed(0)+'" height="'+(h-4)+'" rx="2"/><line x1="2" y1="'+h/2+'" x2="'+(w*.25).toFixed(0)+'" y2="'+h/2+'"/>';});
  S('c_line_d','Line Callout D','callout',function(w,h){return '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h*.7).toFixed(0)+'" rx="2"/><line x1="'+w/2+'" y1="'+(h*.72).toFixed(0)+'" x2="'+w/2+'" y2="'+(h-2)+'"/>';});
  S('c_line_u','Line Callout U','callout',function(w,h){return '<rect x="2" y="'+(h*.3).toFixed(0)+'" width="'+(w-4)+'" height="'+(h*.68).toFixed(0)+'" rx="2"/><line x1="'+w/2+'" y1="2" x2="'+w/2+'" y2="'+(h*.3).toFixed(0)+'"/>';});
})();


// ═══════════════════════════════════════════════════
// SHAPE PICKER DIALOG
// ═══════════════════════════════════════════════════
function edInsertShape(){
  edClearPendingShapePlacement();
  edSaveSelection();
  var vi=lang!=='en';
  var root=edGetModalRoot();
  var html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal" style="width:580px;max-height:85vh;display:flex;flex-direction:column"><h4 style="margin:0 0 8px;font-size:15px">'+(vi?'Chèn Hình Dạng':'Insert Shape')+'</h4>';
  // Settings bar
  html+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;padding:6px 8px;background:#f8f9fa;border-radius:6px;font-size:11px">';
  html+='<label style="color:#666">W:</label><input id="ed-sh-w" type="number" value="120" min="30" max="800" style="width:48px;padding:2px 4px;border:1px solid #ddd;border-radius:4px;font-size:11px">';
  html+='<label style="color:#666">H:</label><input id="ed-sh-h" type="number" value="80" min="20" max="600" style="width:48px;padding:2px 4px;border:1px solid #ddd;border-radius:4px;font-size:11px">';
  html+='<label style="color:#666">'+(vi?'Nền':'Fill')+':</label><input type="color" id="ed-sh-fill" value="#4285f4" style="width:22px;height:20px;border:1px solid #ddd;border-radius:3px;cursor:pointer;padding:0">';
  html+='<label style="color:#666">'+(vi?'Viền':'Stroke')+':</label><input type="color" id="ed-sh-stroke" value="#1a73e8" style="width:22px;height:20px;border:1px solid #ddd;border-radius:3px;cursor:pointer;padding:0">';
  html+='<select id="ed-sh-sw" style="height:20px;font-size:10px;border:1px solid #ddd;border-radius:3px"><option value="0">0px</option><option value="1">1px</option><option value="1.5" selected>1.5px</option><option value="2">2px</option><option value="3">3px</option></select>';
  html+='<label style="color:#666;margin-left:4px"><input type="checkbox" id="ed-sh-text"> '+(vi?'Có text':'Text')+'</label>';
  html+='</div>';
  // Category sections — grid of SVG previews like Word
  html+='<div style="overflow-y:auto;flex:1;padding-right:4px">';
  ED_SHAPE_CATS.forEach(function(cat){
    var shapes=Object.keys(ED_SHAPES).filter(function(k){return ED_SHAPES[k].cat===cat.id;});
    if(!shapes.length) return;
    html+='<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;border-bottom:1px solid #e5e7eb;padding-bottom:2px">'+(vi?cat.nameVi:cat.name)+'</div>';
    html+='<div style="display:flex;flex-wrap:wrap;gap:2px">';
    shapes.forEach(function(k){
      var s=ED_SHAPES[k];
      try{
        var svgContent=s.svg(26,20);
        var isLine=cat.id==='lines'||cat.id==='equation';
        html+='<button onmousedown="event.preventDefault()" onclick="edDoInsertShape(\''+k+'\',event)" title="'+s.name+'" style="width:32px;height:28px;border:1px solid #e5e7eb;border-radius:3px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:1px;transition:all .1s" onmouseenter="this.style.background=\'#e8f0fe\';this.style.borderColor=\'#1a73e8\'" onmouseleave="this.style.background=\'#fff\';this.style.borderColor=\'#e5e7eb\'">';
        html+='<svg width="26" height="20" viewBox="0 0 26 20"><g fill="'+(isLine?'none':'#90b4f8')+'" stroke="#1a73e8" stroke-width="1"'+(isLine?' stroke-linecap="round"':'')+'>'+svgContent+'</g></svg>';
        html+='</button>';
      }catch(e2){}
    });
    html+='</div></div>';
  });
  html+='</div>';
  html+='<div class="ed-modal-actions" style="margin-top:8px"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Đóng':'Close')+'</button></div></div></div>';
  root.innerHTML=html;
}


// ═══════════════════════════════════════════════════
// INSERT SHAPE INTO EDITOR
// ═══════════════════════════════════════════════════
function edDoInsertShape(key,triggerEvent){
  var s=ED_SHAPES[key];if(!s){showToast('Shape not found: '+key);return;}
  var w=parseInt(document.getElementById('ed-sh-w').value)||120;
  var ht=parseInt(document.getElementById('ed-sh-h').value)||80;
  var fill=document.getElementById('ed-sh-fill').value;
  var stroke=document.getElementById('ed-sh-stroke').value;
  var swEl=document.getElementById('ed-sh-sw');
  var sw=swEl?swEl.value:'1.5';
  var hasText=document.getElementById('ed-sh-text')&&document.getElementById('ed-sh-text').checked;
  edBeginShapePlacement({
    key:key,
    w:w,
    h:ht,
    fill:fill,
    stroke:stroke,
    sw:sw,
    hasText:!!hasText,
    triggerStamp:triggerEvent&&typeof triggerEvent.timeStamp==='number' ? triggerEvent.timeStamp : 0
  });
}


// ═══════════════════════════════════════════════════
// SHAPE SELECTION — handles, toolbar, drag, rotate
// ═══════════════════════════════════════════════════
function edDeselectAllShapes(){
  document.querySelectorAll('.ed-shape').forEach(function(s){
    s.classList.remove('ed-sh-selected');
    s.querySelectorAll('.ed-sh-handle,.ed-sh-bar,.ed-sh-rotate').forEach(function(x){x.remove();});
  });
  window._edActiveSh=null;
}

window._edPendingShapeInsert=null;
window._edShapePlacementOverlay=null;

function edIsLineLikeShape(el){
  return !!(el && el.dataset && el.dataset.cat==='lines');
}

function edIsFloatingShape(el){
  return !!(el && el.dataset && el.dataset.float==='1');
}

function edGetShapePosition(el){
  if(edIsFloatingShape(el)){
    return {
      x: parseFloat(el.style.left)||0,
      y: parseFloat(el.style.top)||0
    };
  }
  return {
    x: parseFloat(el.style.marginLeft)||0,
    y: parseFloat(el.style.marginTop)||0
  };
}

function edSetShapePosition(el,x,y){
  if(edIsFloatingShape(el)){
    el.style.left=x+'px';
    el.style.top=y+'px';
    return;
  }
  el.style.marginLeft=x+'px';
  el.style.marginTop=y+'px';
}

function edEnsureShapeDragState(el){
  if(!el || !el.dataset) return;
  if(typeof el.dataset.dragArmed==='undefined' || el.dataset.dragArmed===''){
    el.dataset.dragArmed='1';
  }
}

function edLockFreshShapeDrag(el){
  if(!el || !el.dataset) return;
  el.dataset.dragArmed='0';
  el.dataset.justPlacedAt=String(Date.now());
}

function edArmShapeDrag(el){
  if(!el || !el.dataset) return;
  el.dataset.dragArmed='1';
  if(el.dataset.justPlacedAt) delete el.dataset.justPlacedAt;
}

function edGetShapeHandlePositions(el){
  var type=el&&el.dataset?el.dataset.type:'';
  if(!edIsLineLikeShape(el)) return ['tl','tc','tr','ml','mr','bl','bc','br'];
  if(type==='ln_v') return ['tc','bc'];
  if(type==='ln_d2') return ['bl','tr'];
  if(type==='ln_d1' || type==='ln_arr_d') return ['tl','br'];
  if(type==='ln_h' || type==='ln_arr_r' || type==='ln_arr_l' || type==='ln_arr_lr') return ['ml','mr'];
  return ['tl','tr','bl','br'];
}

function edPreventShapeNativeDrag(e){
  if(e && typeof e.preventDefault==='function') e.preventDefault();
  if(e && typeof e.stopPropagation==='function') e.stopPropagation();
  return false;
}

function edShapeMouseReleased(e){
  return !!(e && typeof e.buttons==='number' && (e.buttons&1)!==1);
}

function edBeginShapePointerShield(cursor){
  edEndShapePointerShield(true);
  if(!document.body) return null;
  var guard=document.createElement('div');
  guard.className='ed-sh-transform-guard';
  guard.setAttribute('aria-hidden','true');
  guard.style.cssText='position:fixed;inset:0;background:transparent;z-index:2147483646;cursor:'+(cursor||'default')+';user-select:none;-webkit-user-select:none;-webkit-user-drag:none;touch-action:none';
  guard.onmousedown=edPreventShapeNativeDrag;
  guard.onmouseup=function(e){
    if(e && typeof e.preventDefault==='function') e.preventDefault();
  };
  guard.onclick=edPreventShapeNativeDrag;
  guard.ondragstart=edPreventShapeNativeDrag;
  document.body.appendChild(guard);
  document.body.classList.add('ed-shape-transforming');
  window._edShapePointerShield=guard;
  return guard;
}

function edEndShapePointerShield(immediate){
  if(window._edShapePointerShieldTimer){
    clearTimeout(window._edShapePointerShieldTimer);
    window._edShapePointerShieldTimer=0;
  }
  var guard=window._edShapePointerShield;
  if(!guard){
    if(document.body) document.body.classList.remove('ed-shape-transforming');
    return;
  }
  var cleanup=function(){
    if(guard.parentNode) guard.parentNode.removeChild(guard);
    if(window._edShapePointerShield===guard) window._edShapePointerShield=null;
    if(document.body) document.body.classList.remove('ed-shape-transforming');
  };
  if(immediate){
    cleanup();
    return;
  }
  window._edShapePointerShieldTimer=setTimeout(cleanup,40);
}

function edClearPendingShapePlacement(){
  window._edPendingShapeInsert=null;
  if(window._edShapePlacementOverlay){
    try{ window._edShapePlacementOverlay.remove(); }catch(e){}
    window._edShapePlacementOverlay=null;
  }
  if(window._edShapePlacementKeyHandler){
    document.removeEventListener('keydown',window._edShapePlacementKeyHandler,true);
    window._edShapePlacementKeyHandler=null;
  }
  if(document.body) document.body.classList.remove('ed-shape-placement');
  var area=document.getElementById('editor-area');
  if(area) area.classList.remove('ed-shape-placement');
}

function edGetShapePlacementHost(){
  return edGetContentRoot()||document.getElementById('editor-area');
}

function edShapePlacementInsideHost(clientX,clientY){
  var host=edGetShapePlacementHost();
  if(!host) return false;
  var rect=host.getBoundingClientRect();
  return clientX>=rect.left && clientX<=rect.right && clientY>=rect.top && clientY<=rect.bottom;
}

function edEnsureShapePlacementOverlay(){
  if(window._edShapePlacementOverlay && window._edShapePlacementOverlay.parentNode){
    return window._edShapePlacementOverlay;
  }
  if(!document.body) return null;
  var overlay=document.createElement('div');
  overlay.className='ed-shape-placement-overlay';
  overlay.setAttribute('aria-hidden','true');
  overlay.addEventListener('mousedown',function(e){
    if(!window._edPendingShapeInsert) return;
    e.preventDefault();
    e.stopPropagation();
  },true);
  overlay.addEventListener('click',function(e){
    var pending=window._edPendingShapeInsert;
    if(!pending) return;
    e.preventDefault();
    e.stopPropagation();
    if(pending.triggerStamp && e.timeStamp && Math.abs(e.timeStamp-pending.triggerStamp)<20){
      return;
    }
    if(!edShapePlacementInsideHost(e.clientX,e.clientY)){
      showToast(lang!=='en'?'Nhấp vào đúng vùng tài liệu để đặt shape':'Click inside the document page to place the shape');
      return;
    }
    edPlacePendingShapeAt(e.clientX,e.clientY);
  },true);
  overlay.addEventListener('contextmenu',function(e){
    if(!window._edPendingShapeInsert) return;
    e.preventDefault();
    e.stopPropagation();
  },true);
  document.body.appendChild(overlay);
  window._edShapePlacementOverlay=overlay;
  if(!window._edShapePlacementKeyHandler){
    window._edShapePlacementKeyHandler=function(e){
      if(window._edPendingShapeInsert && e.key==='Escape'){
        e.preventDefault();
        e.stopPropagation();
        edClearPendingShapePlacement();
      }
    };
  }
  document.addEventListener('keydown',window._edShapePlacementKeyHandler,true);
  return overlay;
}

function edBuildShapeElement(key,cfg){
  var s=ED_SHAPES[key];
  if(!s) return null;
  var w=Math.max(20,parseInt(cfg&&cfg.w,10)||120);
  var ht=Math.max(15,parseInt(cfg&&cfg.h,10)||80);
  var fill=(cfg&&cfg.fill)||'#4285f4';
  var stroke=(cfg&&cfg.stroke)||'#1a73e8';
  var sw=(cfg&&cfg.sw)!=null?String(cfg.sw):'1.5';
  var hasText=!!(cfg&&cfg.hasText);
  var isLine=(s.cat==='lines'||s.cat==='equation');
  var svgFill=isLine?'none':fill;
  var svgStr='<svg width="'+w+'" height="'+ht+'" viewBox="0 0 '+w+' '+ht+'" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;pointer-events:none"><g fill="'+svgFill+'" stroke="'+stroke+'" stroke-width="'+sw+'" color="'+stroke+'"'+(isLine?' stroke-linecap="round"':'')+'>'+s.svg(w,ht)+'</g></svg>';
  var el=document.createElement('span');
  el.className='ed-shape ed-sh-floating';
  el.id=(cfg&&cfg.id)||('sh'+Date.now());
  el.setAttribute('contenteditable','false');
  el.setAttribute('tabindex','-1');
  el.setAttribute('draggable','false');
  el.dataset.type=key;
  el.dataset.cat=s.cat;
  el.dataset.fill=fill;
  el.dataset.stroke=stroke;
  el.dataset.sw=sw;
  el.dataset.rot='0';
  el.dataset.float='1';
  el.dataset.dragArmed='1';
  el.style.cssText='position:absolute;left:'+((cfg&&cfg.left)||0)+'px;top:'+((cfg&&cfg.top)||0)+'px;width:'+w+'px;height:'+ht+'px;margin:0;display:block;z-index:30';
  el.innerHTML=svgStr+(hasText?'<div class="ed-sh-text" contenteditable="true">Text</div>':'');
  el.ondragstart=edPreventShapeNativeDrag;
  return el;
}

function edPlacePendingShapeAt(clientX,clientY){
  var pending=window._edPendingShapeInsert;
  if(!pending) return null;
  var host=edGetShapePlacementHost();
  if(!host) return null;
  try{
    if(getComputedStyle(host).position==='static') host.style.position='relative';
  }catch(e){}
  var rect=host.getBoundingClientRect();
  var scaleX=rect.width&&host.offsetWidth ? (rect.width/host.offsetWidth) : 1;
  var scaleY=rect.height&&host.offsetHeight ? (rect.height/host.offsetHeight) : 1;
  if(!isFinite(scaleX)||scaleX<=0) scaleX=1;
  if(!isFinite(scaleY)||scaleY<=0) scaleY=1;
  var left=((clientX-rect.left)+(host.scrollLeft||0))/scaleX;
  var top=((clientY-rect.top)+(host.scrollTop||0))/scaleY;
  left=Math.max(0,left-18);
  top=Math.max(0,top-12);
  var el=edBuildShapeElement(pending.key,{
    w:pending.w,
    h:pending.h,
    fill:pending.fill,
    stroke:pending.stroke,
    sw:pending.sw,
    hasText:pending.hasText,
    left:left,
    top:top
  });
  if(!el) return null;
  host.appendChild(el);
  edLockFreshShapeDrag(el);
  edClearPendingShapePlacement();
  edMarkModified();
  setTimeout(function(){edSelectShape(el);},20);
  return el;
}

function edBeginShapePlacement(cfg){
  edClearPendingShapePlacement();
  window._edPendingShapeInsert=cfg;
  if(document.body) document.body.classList.add('ed-shape-placement');
  var area=document.getElementById('editor-area');
  if(area) area.classList.add('ed-shape-placement');
  edEnsureShapePlacementOverlay();
  edCloseModal();
  showToast(lang!=='en'?'Nhấp vào tài liệu để đặt shape':'Click in the document to place the shape');
}

function edSelectShape(el){
  // Deselect ALL other element types
  edDeselectAllShapes();
  document.querySelectorAll('.ed-textbox .ed-tb-handle,.ed-textbox .ed-tb-bar').forEach(function(x){x.remove();});
  document.querySelectorAll('.ed-chart .ed-ch-bar,.ed-chart .ed-ch-handle').forEach(function(x){x.remove();});
  edDeselectAllQmsBlocks();
  edDeselectImg();
  // Mark as selected
  window._edActiveSh=el;
  edEnsureShapeDragState(el);
  el.classList.add('ed-sh-selected');
  el.setAttribute('draggable','false');
  el.ondragstart=edPreventShapeNativeDrag;
  // Line-like shapes use fewer handles so the selection feels closer to Word
  edGetShapeHandlePositions(el).forEach(function(pos){
    var hd=document.createElement('span');hd.className='ed-sh-handle '+pos;hd.contentEditable='false';
    hd.setAttribute('draggable','false');
    hd.ondragstart=edPreventShapeNativeDrag;
    hd.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();edResizeShape(e,el,pos);});
    el.appendChild(hd);
  });
  // Add rotation handle
  var rot=document.createElement('span');rot.className='ed-sh-rotate';rot.contentEditable='false';
  rot.setAttribute('draggable','false');
  rot.ondragstart=edPreventShapeNativeDrag;
  rot.innerHTML='<svg width="12" height="12" viewBox="0 0 16 16"><path d="M8,1 A7,7 0 1 1 1,8" fill="none" stroke="#1a73e8" stroke-width="1.5"/><path d="M5,1 L8,1 L8,4" fill="none" stroke="#1a73e8" stroke-width="1.5"/></svg>';
  rot.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();edRotateShape(e,el);});
  el.appendChild(rot);
  // Build floating toolbar
  var bar=document.createElement('div');bar.className='ed-sh-bar';bar.contentEditable='false';
  bar.setAttribute('draggable','false');
  bar.ondragstart=edPreventShapeNativeDrag;
  bar.onmousedown=function(ev){ev.stopPropagation();};
  bar.onclick=function(ev){ev.stopPropagation();};
  var vi=lang!=='en';
  var fill=el.dataset.fill||'#4285f4';var stroke=el.dataset.stroke||'#1a73e8';
  // Fill color
  var btnF=document.createElement('button');btnF.style.cssText='width:22px;height:22px;border:1px solid #ddd;border-radius:3px;background:'+fill+';cursor:pointer;padding:0';
  btnF.title=vi?'Màu nền':'Fill';
  btnF.addEventListener('click',function(ev){ev.stopPropagation();edShowColorPopup(ev.target,function(c){edRecolorShape(el,c,null);btnF.style.background=c;});});
  bar.appendChild(btnF);
  // Stroke color
  var btnS=document.createElement('button');btnS.style.cssText='width:22px;height:22px;border:3px solid '+stroke+';border-radius:3px;background:#fff;cursor:pointer;padding:0';
  btnS.title=vi?'Màu viền':'Stroke';
  btnS.addEventListener('click',function(ev){ev.stopPropagation();edShowColorPopup(ev.target,function(c){edRecolorShape(el,null,c);btnS.style.borderColor=c;});});
  bar.appendChild(btnS);
  // Stroke width
  var selSW=document.createElement('select');selSW.title=vi?'Bề rộng viền':'Width';
  selSW.style.cssText='height:22px;font-size:9px;border:1px solid #ddd;border-radius:3px;padding:0 1px;cursor:pointer';
  ['0','0.5','1','1.5','2','3','4'].forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v+'px';if(v===(el.dataset.sw||'1.5'))o.selected=true;selSW.appendChild(o);});
  selSW.addEventListener('change',function(){el.dataset.sw=this.value;var g=el.querySelector('svg g');if(g)g.setAttribute('stroke-width',this.value);edMarkModified();});
  bar.appendChild(selSW);
  // Text toggle
  var shText=el.querySelector('.ed-sh-text');
  var btnTxt=document.createElement('button');
  btnTxt.textContent=shText?'AÌ²':'A';
  btnTxt.title=vi?'Thêm/Xóa text':'Toggle text';
  btnTxt.style.cssText='height:22px;font-size:11px;font-weight:700;border:1px solid #ddd;border-radius:3px;background:'+(shText?'#e8f0fe':'#fff')+';cursor:pointer;padding:0 5px;color:#1a73e8';
  btnTxt.addEventListener('click',function(ev){
    ev.stopPropagation();
    var txt=el.querySelector('.ed-sh-text');
    if(txt){txt.remove();btnTxt.style.background='#fff';btnTxt.textContent='A';}
    else{
      var nd=document.createElement('div');nd.className='ed-sh-text';nd.contentEditable='true';
      nd.textContent='Text';
      el.appendChild(nd);btnTxt.style.background='#e8f0fe';btnTxt.textContent='AÌ²';
    }
    edMarkModified();
  });
  bar.appendChild(btnTxt);
  // Text color
  if(shText){
    var btnTC=document.createElement('button');btnTC.style.cssText='width:22px;height:22px;border:1px solid #ddd;border-radius:3px;background:#fff;cursor:pointer;padding:0;font-size:12px;font-weight:700;color:'+(shText.style.color||'#333');
    btnTC.textContent='T';btnTC.title=vi?'Màu chữ':'Text color';
    btnTC.addEventListener('click',function(ev){ev.stopPropagation();edShowColorPopup(ev.target,function(c){var t=el.querySelector('.ed-sh-text');if(t)t.style.color=c;btnTC.style.color=c;edMarkModified();});});
    bar.appendChild(btnTC);
  }
  // Duplicate
  var btnDup=document.createElement('button');btnDup.textContent='⧉';btnDup.title=vi?'Nhân bản':'Duplicate';
  btnDup.style.cssText='height:22px;font-size:13px;border:1px solid #ddd;border-radius:3px;background:#fff;cursor:pointer;padding:0 4px';
  btnDup.addEventListener('click',function(ev){
    ev.stopPropagation();
    var clone=el.cloneNode(true);
    clone.id='sh'+Date.now();
    clone.classList.remove('ed-sh-selected');
    clone.querySelectorAll('.ed-sh-handle,.ed-sh-bar,.ed-sh-rotate').forEach(function(x){x.remove();});
    el.parentNode.insertBefore(clone,el.nextSibling);
    edMarkModified();edSelectShape(clone);
  });
  bar.appendChild(btnDup);
  // Delete
  var btnDel=document.createElement('button');btnDel.textContent='🗑';btnDel.title=vi?'Xóa':'Delete';
  btnDel.style.cssText='height:22px;font-size:12px;border:1px solid #fca5a5;border-radius:3px;background:#fff;cursor:pointer;padding:0 4px;color:#dc2626';
  btnDel.addEventListener('click',function(ev){ev.stopPropagation();el.remove();window._edActiveSh=null;edMarkModified();});
  bar.appendChild(btnDel);
  el.appendChild(bar);
}


// ═══════════════════════════════════════════════════
// SHAPE EVENT DELEGATION — single handler on editor
// ═══════════════════════════════════════════════════
function edSetupShapeDelegation(area){
  if(area._edShapeDelegationDone) return;
  area._edShapeDelegationDone=true;

  area.addEventListener('dragstart',function(e){
    if(e.target.closest('.ed-shape,.ed-sh-handle,.ed-sh-bar,.ed-sh-rotate')){
      e.preventDefault();
      e.stopPropagation();
    }
  },true);

  // MOUSEDOWN on editor area — handles shape selection + drag initiation
  area.addEventListener('mousedown',function(e){
    if(window._edPendingShapeInsert){
      if(!window._edShapePlacementOverlay || !window._edShapePlacementOverlay.parentNode){
        edEnsureShapePlacementOverlay();
      }
      return;
    }
    var shapeEl=e.target.closest('.ed-shape');
    var wasSelected=!!(shapeEl && shapeEl.classList.contains('ed-sh-selected'));

    // Click on handle/bar/rotate — let their own handlers deal with it
    if(e.target.closest('.ed-sh-handle,.ed-sh-bar,.ed-sh-rotate')) return;

    // Click on shape text area — let contenteditable work
    if(e.target.closest('.ed-sh-text')){
      // Still select the shape but don't prevent default (allow text editing)
      if(shapeEl && !shapeEl.classList.contains('ed-sh-selected')){
        edSelectShape(shapeEl);
        edArmShapeDrag(shapeEl);
      }
      return;
    }

    // Click on a shape body
    if(shapeEl){
      e.preventDefault();
      e.stopPropagation();

      // Select shape if not selected
      if(!wasSelected){
        edSelectShape(shapeEl);
        edArmShapeDrag(shapeEl);
        return;
      }

      if(shapeEl.dataset.dragArmed==='0'){
        edArmShapeDrag(shapeEl);
        return;
      }

      // Drag only after the shape was already selected before this click.
      if(shapeEl.classList.contains('ed-sh-selected') && shapeEl.querySelector('.ed-sh-handle')){
        _edShapeDragStart(e,shapeEl);
      }
      return;
    }

    // Click outside any shape — deselect all shapes
    if(window._edActiveSh){
      edDeselectAllShapes();
    }
  },true); // capture phase to beat contenteditable

  // Keyboard: Delete/Backspace removes selected shape
  area.addEventListener('keydown',function(e){
    if(window._edPendingShapeInsert && e.key==='Escape'){
      e.preventDefault();
      edClearPendingShapePlacement();
      return;
    }
    if(window._edActiveSh && (e.key==='Delete'||e.key==='Backspace')){
      // Don't delete if editing text inside shape
      if(document.activeElement && document.activeElement.closest('.ed-sh-text')) return;
      e.preventDefault();
      window._edActiveSh.remove();
      window._edActiveSh=null;
      edMarkModified();
    }
  });
}

// Drag shape (Word-like move via margin offsets)
function _edShapeDragStart(e,el){
  e.preventDefault();
  e.stopPropagation();
  var startX=e.clientX,startY=e.clientY;
  var startPos=edGetShapePosition(el);
  var origML=startPos.x,origMT=startPos.y;
  var moved=false,dragging=false;
  function onMove(e2){
    if(edShapeMouseReleased(e2)){
      onUp();
      return;
    }
    var dx=e2.clientX-startX,dy=e2.clientY-startY;
    if(!dragging){
      if(Math.abs(dx)<=3&&Math.abs(dy)<=3) return;
      dragging=true;
      edBeginShapePointerShield('move');
    }
    e2.preventDefault();
    moved=true;
    edSetShapePosition(el,origML+dx,origMT+dy);
  }
  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp,true);
    window.removeEventListener('blur',onUp);
    if(dragging) edEndShapePointerShield(false);
    if(moved)edMarkModified();
  }
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp,true);
  window.addEventListener('blur',onUp);
}


// ═══════════════════════════════════════════════════
// SHAPE ROTATE
// ═══════════════════════════════════════════════════
function edRotateShape(e,el){
  e.preventDefault();
  e.stopPropagation();
  var rect=el.getBoundingClientRect();
  var cx=rect.left+rect.width/2;
  var cy=rect.top+rect.height/2;
  var startAngle=parseFloat(el.dataset.rot)||0;
  var initAngle=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;
  edBeginShapePointerShield('grabbing');
  function onMove(e2){
    if(edShapeMouseReleased(e2)){
      onUp();
      return;
    }
    e2.preventDefault();
    var angle=Math.atan2(e2.clientY-cy,e2.clientX-cx)*180/Math.PI;
    var delta=angle-initAngle;
    var newRot=startAngle+delta;
    if(e2.shiftKey) newRot=Math.round(newRot/15)*15;
    el.style.transform='rotate('+newRot.toFixed(1)+'deg)';
    el.dataset.rot=newRot.toFixed(1);
  }
  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp,true);
    window.removeEventListener('blur',onUp);
    edEndShapePointerShield(false);
    edMarkModified();
  }
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp,true);
  window.addEventListener('blur',onUp);
}


// ═══════════════════════════════════════════════════
// SHAPE RESIZE
// ═══════════════════════════════════════════════════
function edResizeShape(e,el,pos){
  e.preventDefault();
  e.stopPropagation();
  var startX=e.clientX,startY=e.clientY;
  var startW=el.offsetWidth,startH=el.offsetHeight;
  var startPos=edGetShapePosition(el);
  var startL=startPos.x;
  var startT=startPos.y;
  var aspectRatio=startW/startH;
  var isLineLike=edIsLineLikeShape(el);
  edBeginShapePointerShield(pos.indexOf('m')!==-1?'ew-resize':pos.indexOf('c')!==-1?'ns-resize':'nwse-resize');
  function onMove(e2){
    if(edShapeMouseReleased(e2)){
      onUp();
      return;
    }
    e2.preventDefault();
    var dx=e2.clientX-startX,dy=e2.clientY-startY;
    var newW=startW,newH=startH,newL=startL,newT=startT;
    if(pos==='br'){newW=startW+dx;newH=startH+dy;}
    else if(pos==='mr'){newW=startW+dx;}
    else if(pos==='bc'){newH=startH+dy;}
    else if(pos==='bl'){newW=startW-dx;newH=startH+dy;newL=startL+dx;}
    else if(pos==='ml'){newW=startW-dx;newL=startL+dx;}
    else if(pos==='tl'){newW=startW-dx;newH=startH-dy;newL=startL+dx;newT=startT+dy;}
    else if(pos==='tc'){newH=startH-dy;newT=startT+dy;}
    else if(pos==='tr'){newW=startW+dx;newH=startH-dy;newT=startT+dy;}
    // Shift = maintain aspect
    if(e2.shiftKey && (pos==='br'||pos==='tl'||pos==='bl'||pos==='tr')){
      newH=newW/aspectRatio;
      if(pos==='tl'||pos==='bl')newT=startT+(startH-newH);
    }
    if(isLineLike){
      if(pos==='ml' || pos==='mr'){newH=startH;}
      if(pos==='tc' || pos==='bc'){newW=startW;}
    }
    if(newW<20)newW=20;
    if(newH<15)newH=15;
    el.style.width=newW+'px';
    el.style.height=newH+'px';
    edSetShapePosition(el,newL,newT);
    // Re-render SVG at new size
    var key=el.dataset.type;
    var shDef=ED_SHAPES[key];
    if(shDef){
      var svg=el.querySelector('svg');
      if(svg){
        svg.setAttribute('width',newW);
        svg.setAttribute('height',newH);
        svg.setAttribute('viewBox','0 0 '+newW+' '+newH);
        var g=svg.querySelector('g');
        if(g) g.innerHTML=shDef.svg(newW,newH);
      }
    }
  }
  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp,true);
    window.removeEventListener('blur',onUp);
    edEndShapePointerShield(false);
    edMarkModified();
  }
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp,true);
  window.addEventListener('blur',onUp);
}


// ═══════════════════════════════════════════════════
// SHAPE RECOLOR
// ═══════════════════════════════════════════════════
function edRecolorShape(el,newFill,newStroke){
  if(newFill){el.dataset.fill=newFill;}
  if(newStroke){el.dataset.stroke=newStroke;}
  var g=el.querySelector('svg g');
  if(g){
    var isLine=(el.dataset.cat==='lines'||el.dataset.cat==='equation');
    if(newFill && !isLine)g.setAttribute('fill',newFill);
    if(newStroke){g.setAttribute('stroke',newStroke);g.setAttribute('color',newStroke);}
  }
  edMarkModified();
}

// ═══════════════════════════════════════════════════
// CHARTS (like Word)
// ═══════════════════════════════════════════════════
function edInsertChart(){
  const vi=lang!=='en';
  const root=edGetModalRoot();
  let html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal" style="width:480px"><h4>📊 '+(vi?'Chèn biểu đồ':'Insert Chart')+'</h4>';
  // Chart type picker
  html+='<div style="display:flex;gap:8px;margin-bottom:12px">';
  [{t:'bar',icon:'📊',l:vi?'Cột':'Bar'},{t:'line',icon:'📈',l:vi?'Đường':'Line'},{t:'pie',icon:'🥧',l:vi?'Tròn':'Pie'},{t:'hbar',icon:'📊',l:vi?'Ngang':'H-Bar'}].forEach((c,i)=>{
    html+='<button onclick="edChartType=\''+c.t+'\';edChartPreview();this.parentElement.querySelectorAll(\'button\').forEach(b=>b.style.outline=\'none\');this.style.outline=\'2px solid #1967d2\'" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:2px'+(i===0?';outline:2px solid #1967d2':'')+'"><span style="font-size:20px">'+c.icon+'</span>'+c.l+'</button>';
  });
  html+='</div>';
  // Data editor
  html+='<label style="font-size:11px;font-weight:600;color:#666">'+(vi?'Dữ liệu (mỗi dòng: Nhãn, Giá trị)':'Data (each line: Label, Value)')+'</label>';
  html+='<textarea id="ed-chart-data" rows="5" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:monospace;outline:none;resize:none;margin-top:4px" oninput="edChartPreview()">'+(vi?'Quý 1, 35\nQuý 2, 50\nQuý 3, 42\nQuý 4, 68':'Q1, 35\nQ2, 50\nQ3, 42\nQ4, 68')+'</textarea>';
  html+='<div style="display:flex;gap:8px;margin:8px 0;align-items:center"><label style="font-size:11px;color:#666">'+(vi?'Tiêu đề:':'Title:')+'</label><input id="ed-chart-title" value="'+(vi?'Doanh thu':'Revenue')+'" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:12px" oninput="edChartPreview()">';
  html+='<label style="font-size:11px;color:#666">'+(vi?'Màu:':'Color:')+'</label><input type="color" id="ed-chart-color" value="#4285f4" style="width:28px;height:24px;border:1px solid #ddd;border-radius:4px" onchange="edChartPreview()"></div>';
  // Preview
  html+='<div id="ed-chart-preview" style="background:#f8f9fa;border-radius:6px;padding:8px;min-height:120px;display:flex;align-items:center;justify-content:center"></div>';
  html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Hủy':'Cancel')+'</button><button class="ed-m-ok" onclick="edDoInsertChart()">'+(vi?'Chèn':'Insert')+'</button></div></div></div>';
  root.innerHTML=html;
  window.edChartType='bar';
  setTimeout(edChartPreview,50);
}

function edParseChartData(){
  const raw=document.getElementById('ed-chart-data').value.trim();
  return raw.split('\n').map(line=>{
    const parts=line.split(',');
    return{label:(parts[0]||'').trim(),value:parseFloat(parts[1])||0};
  }).filter(d=>d.label);
}

function edChartPreview(){
  const data=edParseChartData();
  const title=document.getElementById('ed-chart-title').value;
  const color=document.getElementById('ed-chart-color').value;
  const type=window.edChartType||'bar';
  const svg=edBuildChartSVG(data,title,color,type,360,200);
  document.getElementById('ed-chart-preview').innerHTML=svg;
}

function edBuildChartSVG(data,title,color,type,W,H){
  if(!data.length)return'<span style="color:#999">No data</span>';
  const max=Math.max(...data.map(d=>d.value))||1;
  const colors=['#4285f4','#ea4335','#fbbc04','#34a853','#ff6d01','#46bdc6','#7baaf7','#f07b72','#fdd663','#57bb8a'];
  let svg='<svg data-chart="1" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="font-family:Segoe UI,sans-serif">';
  // Title
  if(title){var safeTitle=title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');svg+='<text x="'+W/2+'" y="16" text-anchor="middle" font-size="12" font-weight="700" fill="#333">'+safeTitle+'</text>';}
  const top=title?28:8;const bottom=H-20;const left=40;const right=W-10;const ch=bottom-top;const cw=right-left;
  
  if(type==='bar'){
    const bw=Math.min(40,cw/data.length*.7);const gap=(cw-bw*data.length)/(data.length+1);
    // Grid
    for(let i=0;i<=4;i++){const y=bottom-ch*i/4;svg+='<line x1="'+left+'" y1="'+y+'" x2="'+right+'" y2="'+y+'" stroke="#e8e8e8"/><text x="'+(left-4)+'" y="'+(y+4)+'" text-anchor="end" font-size="9" fill="#999">'+Math.round(max*i/4)+'</text>';}
    data.forEach((d,i)=>{
      const x=left+gap+(bw+gap)*i;const bh=ch*d.value/max;
      svg+='<rect x="'+x+'" y="'+(bottom-bh)+'" width="'+bw+'" height="'+bh+'" fill="'+(colors[i%colors.length])+'" rx="2"/>';
      svg+='<text x="'+(x+bw/2)+'" y="'+(H-6)+'" text-anchor="middle" font-size="9" fill="#666">'+d.label.replace(/</g,'&lt;')+'</text>';
      svg+='<text x="'+(x+bw/2)+'" y="'+(bottom-bh-4)+'" text-anchor="middle" font-size="9" fill="#333" font-weight="600">'+d.value+'</text>';
    });
  }else if(type==='hbar'){
    const bh=Math.min(28,ch/data.length*.7);const gap=(ch-bh*data.length)/(data.length+1);
    data.forEach((d,i)=>{
      const y=top+gap+(bh+gap)*i;const bw2=cw*d.value/max;
      svg+='<rect x="'+left+'" y="'+y+'" width="'+bw2+'" height="'+bh+'" fill="'+(colors[i%colors.length])+'" rx="2"/>';
      svg+='<text x="'+(left-4)+'" y="'+(y+bh/2+3)+'" text-anchor="end" font-size="9" fill="#666">'+d.label.replace(/</g,'&lt;')+'</text>';
      svg+='<text x="'+(left+bw2+4)+'" y="'+(y+bh/2+3)+'" font-size="9" fill="#333" font-weight="600">'+d.value+'</text>';
    });
  }else if(type==='line'){
    for(let i=0;i<=4;i++){const y=bottom-ch*i/4;svg+='<line x1="'+left+'" y1="'+y+'" x2="'+right+'" y2="'+y+'" stroke="#e8e8e8"/><text x="'+(left-4)+'" y="'+(y+4)+'" text-anchor="end" font-size="9" fill="#999">'+Math.round(max*i/4)+'</text>';}
    const step=cw/(data.length-1||1);
    let pts='';let area='M'+left+','+bottom+' ';
    data.forEach((d,i)=>{const x=left+step*i;const y=bottom-ch*d.value/max;pts+=x+','+y+' ';area+='L'+x+','+y+' ';});
    area+='L'+(left+step*(data.length-1))+','+bottom+' Z';
    svg+='<path d="'+area+'" fill="'+color+'" opacity=".15"/>';
    svg+='<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    data.forEach((d,i)=>{const x=left+step*i;const y=bottom-ch*d.value/max;
      svg+='<circle cx="'+x+'" cy="'+y+'" r="4" fill="#fff" stroke="'+color+'" stroke-width="2"/>';
      svg+='<text x="'+x+'" y="'+(y-8)+'" text-anchor="middle" font-size="9" fill="#333" font-weight="600">'+d.value+'</text>';
      svg+='<text x="'+x+'" y="'+(H-6)+'" text-anchor="middle" font-size="9" fill="#666">'+d.label.replace(/</g,'&lt;')+'</text>';
    });
  }else if(type==='pie'){
    const total=data.reduce((s,d)=>s+d.value,0)||1;
    const cx=W/2;const cy=(top+bottom)/2;const r=Math.min(cw,ch)/2-4;
    let startAngle=-Math.PI/2;
    data.forEach((d,i)=>{
      const angle=2*Math.PI*d.value/total;
      const x1=cx+r*Math.cos(startAngle);const y1=cy+r*Math.sin(startAngle);
      const x2=cx+r*Math.cos(startAngle+angle);const y2=cy+r*Math.sin(startAngle+angle);
      const large=angle>Math.PI?1:0;
      svg+='<path d="M'+cx+','+cy+' L'+x1+','+y1+' A'+r+','+r+' 0 '+large+',1 '+x2+','+y2+' Z" fill="'+colors[i%colors.length]+'" stroke="#fff" stroke-width="2"/>';
      const mid=startAngle+angle/2;const lx=cx+(r*.65)*Math.cos(mid);const ly=cy+(r*.65)*Math.sin(mid);
      svg+='<text x="'+lx+'" y="'+ly+'" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">'+Math.round(d.value/total*100)+'%</text>';
      startAngle+=angle;
    });
    // Legend
    const lx=W-80;
    data.forEach((d,i)=>{
      if(i<6){svg+='<rect x="'+lx+'" y="'+(top+i*14)+'" width="10" height="10" rx="2" fill="'+colors[i%colors.length]+'"/><text x="'+(lx+14)+'" y="'+(top+i*14+9)+'" font-size="9" fill="#666">'+d.label.replace(/</g,'&lt;')+'</text>';}
    });
  }
  svg+='</svg>';return svg;
}

function edDoInsertChart(){
  var data=edParseChartData();
  var title=document.getElementById('ed-chart-title').value;
  var color=document.getElementById('ed-chart-color').value;
  var type=window.edChartType||'bar';
  var svg=edBuildChartSVG(data,title,color,type,480,260);
  var dataStr=document.getElementById('ed-chart-data').value;
  // If editing existing chart, update it
  if(window._edEditingChart){
    var el=window._edEditingChart;
    el.dataset.type=type;el.dataset.title=title;el.dataset.color=color;el.dataset.csv=dataStr;
    var _cs=el.querySelector('svg[data-chart]');if(_cs)_cs.outerHTML=svg;
    window._edEditingChart=null;
    edMarkModified();edCloseModal();
    return;
  }
  var id='ch'+Date.now();
  var html='<span class="ed-chart" id="'+id+'" contenteditable="false" data-type="'+_edEscapeHtml(type)+'" data-title="'+_edEscapeHtml(title)+'" data-color="'+_edEscapeHtml(color)+'" data-csv="'+_edEscapeHtml(dataStr)+'">'+svg+'</span><p><br></p>';
  edFocusAndRestore();
  edExecCommand('insertHTML',false,html);
  setTimeout(function(){
    var el=document.getElementById(id);
    if(el)el.addEventListener('click',function(ev){
      if(ev.target.closest('.ed-ch-bar,.ed-ch-handle'))return;
      edSelectChart(el);
    });
  },50);
  edMarkModified();edCloseModal();
}


function edSelectChart(el){
  // Deselect ALL element types first
  document.querySelectorAll('.ed-chart .ed-ch-bar,.ed-chart .ed-ch-handle').forEach(function(x){x.remove();});
  document.querySelectorAll('.ed-textbox .ed-tb-handle,.ed-textbox .ed-tb-bar').forEach(function(x){x.remove();});
  edDeselectAllShapes();
  edDeselectAllQmsBlocks();
  edDeselectImg();
  window._edActiveChart=el;
  var vi=lang!=='en';
  ['br','mr','bm'].forEach(function(pos){
    var hd=document.createElement('span');hd.className='ed-ch-handle '+pos;hd.contentEditable='false';
    hd.addEventListener('mousedown',function(e){e.stopPropagation();edResizeChart(e,el,pos);});
    el.appendChild(hd);
  });
  var bar=document.createElement('div');bar.className='ed-ch-bar';bar.contentEditable='false';
  bar.addEventListener('click',function(e){e.stopPropagation();});
  bar.addEventListener('mousedown',function(e){e.stopPropagation();});
  var btnEdit=document.createElement('button');
  btnEdit.innerHTML=vi?'✏️ Sửa dữ liệu':'✏️ Edit';
  btnEdit.style.cssText='padding:0 8px;font-weight:600';
  btnEdit.addEventListener('click',function(ev){ev.stopPropagation();edEditChart(el);});
  bar.appendChild(btnEdit);
  var btnDel=document.createElement('button');
  btnDel.textContent='\uD83D\uDDD1';
  btnDel.addEventListener('click',function(){el.remove();edMarkModified();});
  bar.appendChild(btnDel);
  el.appendChild(bar);
}


function edResizeChart(e,el,pos){
  e.preventDefault();e.stopPropagation();
  var svg=el.querySelector('svg[data-chart]')||el.querySelector('svg');if(!svg)return;
  var startX=e.clientX,startY=e.clientY;
  var startW=parseInt(svg.getAttribute('width'))||480;
  var startH=parseInt(svg.getAttribute('height'))||260;
  function m(ev){
    var nw=startW,nh=startH;
    if(pos==='br'||pos==='mr')nw=Math.max(200,startW+(ev.clientX-startX));
    if(pos==='br'||pos==='bm')nh=Math.max(120,startH+(ev.clientY-startY));
    var csv=_edDecodeHtml(el.dataset.csv||'');
    var data=csv.split('\n').map(function(line){var p=line.split(',');return{label:(p[0]||'').trim(),value:parseFloat(p[1])||0};}).filter(function(d){return d.label;});
    var newSvg=edBuildChartSVG(data,_edDecodeHtml(el.dataset.title||''),_edDecodeHtml(el.dataset.color||'#4285f4'),_edDecodeHtml(el.dataset.type||'bar'),nw,nh);
    var tmp=document.createElement('div');tmp.innerHTML=newSvg;
    var newEl=tmp.firstChild;
    svg.parentNode.replaceChild(newEl,svg);
    svg=newEl;
  }
  function u(){document.removeEventListener('mousemove',m);document.removeEventListener('mouseup',u);edMarkModified();}
  document.addEventListener('mousemove',m);document.addEventListener('mouseup',u);
}


function edEditChart(el){
  // Remove handles first
  document.querySelectorAll('.ed-chart .ed-ch-bar,.ed-chart .ed-ch-handle').forEach(function(x){x.remove();});
  var type=_edDecodeHtml(el.dataset.type||'bar');
  var title=_edDecodeHtml(el.dataset.title||'');
  var color=_edDecodeHtml(el.dataset.color||'#4285f4');
  var csv=_edDecodeHtml(el.dataset.csv||'');
  window._edEditingChart=el;
  edInsertChart();
  setTimeout(function(){
    window.edChartType=type;
    var dataEl=document.getElementById('ed-chart-data');
    var titleEl=document.getElementById('ed-chart-title');
    var colorEl=document.getElementById('ed-chart-color');
    if(dataEl)dataEl.value=csv;
    if(titleEl)titleEl.value=title;
    if(colorEl)colorEl.value=color;
    // Highlight correct type
    var btns=document.querySelectorAll('.ed-modal button[onclick*="edChartType"]');
    btns.forEach(function(b){
      if(b.getAttribute('onclick'))b.style.outline=b.getAttribute('onclick').indexOf("'"+type+"'")>=0?'2px solid #1967d2':'none';
    });
    edChartPreview();
  },100);
}


function edSetCellBgCol(){
  const node=edGetModalRoot()._cellNode;
  if(!node)return;
  const color=document.getElementById('ed-cell-color').value;
  const idx=Array.from(node.parentElement.children).indexOf(node);
  const table=node.closest('table');
  if(table)table.querySelectorAll('tr').forEach(tr=>{
    const cell=tr.children[idx];if(cell)cell.style.backgroundColor=color;
  });
  edMarkModified();edCloseModal();
}


// Re-initialize interactive elements after loading saved content

function edGetContentRoot(){
  var area=document.getElementById('editor-area');
  if(!area)return null;
  return area.querySelector('#docContent') || area;
}

function edInitContent(){
  // Save selection on every interaction for toolbar commands
  const _ea = document.getElementById('editor-area');
  if(_ea){
    const _edTarget = _ea.querySelector('#docContent') || _ea;
    ['mouseup','keyup','mousedown'].forEach(evt=>{
      _edTarget.removeEventListener(evt, edSaveSelection);
      _edTarget.addEventListener(evt, edSaveSelection);
    });
  }
  var area=document.getElementById('editor-area');
  var ctx=edGetContentRoot()||area;
  if(edGetEngineMode()==='tiptap' && window.edTiptapAdapter && typeof window.edTiptapAdapter.maybeMount==='function'){
    var target=(area&&area.querySelector('#docContent'))||ctx;
    if(window.edTiptapAdapter.maybeMount(target)){
      edUpdateWordCount();
      return;
    }
  }
  // Clean up stale UI from saved content
  area.querySelectorAll('.ed-tbl-float-bar,.ed-img-handle,.ed-img-bar,.ed-img-size-tooltip').forEach(function(x){x.remove();});
  // Unwrap image resize wrappers from saved content
  ctx.querySelectorAll('.ed-img-resize-wrap').forEach(function(wrap){
    var img=wrap.querySelector('img');
    if(img){
      img.classList.remove('ed-img-selected');
      wrap.parentNode.insertBefore(img,wrap);
    }
    wrap.remove();
  });
  // Remove find highlights from saved content
  area.querySelectorAll('mark.ed-hl').forEach(function(m){
    var parent=m.parentNode;
    while(m.firstChild)parent.insertBefore(m.firstChild,m);
    parent.removeChild(m);
    parent.normalize();
  });
  edInitQmsBlocks(ctx);
  // Textboxes - use data-ed-init flag to avoid duplicate listeners
  ctx.querySelectorAll('.ed-textbox').forEach(function(el){
    el.setAttribute('contenteditable','false');
    el.querySelectorAll('.ed-tb-handle,.ed-tb-bar').forEach(function(x){x.remove();});
    if(!el.dataset.edInit){
      el.dataset.edInit='1';
      el.addEventListener('click',function(ev){
        if(ev.target.closest('.ed-tb-bar,.ed-tb-handle'))return;
        if(!el.querySelector('.ed-tb-bar'))edSelectTextbox(el);
      });
    }
    var content=el.querySelector('.ed-tb-content');
    if(content){
      content.setAttribute('contenteditable','true');
      if(!content.dataset.edInit){
        content.dataset.edInit='1';
        content.addEventListener('click',function(ev){ev.stopPropagation();});
      }
    }
  });
  // Shapes — clean up stale UI, set contenteditable on text, use delegation
  ctx.querySelectorAll('.ed-shape').forEach(function(el){
    el.querySelectorAll('.ed-sh-handle,.ed-sh-bar,.ed-sh-rotate').forEach(function(x){x.remove();});
    el.classList.remove('ed-sh-selected');
    el.setAttribute('contenteditable','false');
    el.setAttribute('tabindex','-1');
    if(el.dataset.dragArmed) delete el.dataset.dragArmed;
    if(el.dataset.justPlacedAt) delete el.dataset.justPlacedAt;
    var textDiv=el.querySelector('.ed-sh-text');
    if(textDiv) textDiv.setAttribute('contenteditable','true');
  });
  // Set up event delegation for shapes (one-time on editor area)
  edSetupShapeDelegation(area);
  // Charts - use data-ed-init flag
  ctx.querySelectorAll('.ed-chart').forEach(function(el){
    el.setAttribute('contenteditable','false');
    el.querySelectorAll('.ed-ch-bar,.ed-ch-handle').forEach(function(x){x.remove();});
    if(!el.dataset.edInit){
      el.dataset.edInit='1';
      el.addEventListener('click',function(ev){
        if(ev.target.closest('.ed-ch-bar,.ed-ch-handle'))return;
        edSelectChart(el);
      });
    }
  });
  // Checklists - ensure checkboxes work
  ctx.querySelectorAll('.ed-check-item input[type=checkbox]').forEach(function(cb){
    if(!cb.dataset.edInit){
      cb.dataset.edInit='1';
      cb.addEventListener('click',function(ev){ev.stopPropagation();});
    }
  });
}

// Clean HTML by stripping all editor UI control elements
function edCleanHTML(){
  var area=document.getElementById('editor-area');
  if(!area) return '';
  var tiptapHtml=null;
  if(edGetEngineMode()==='tiptap' && window.edTiptapAdapter && window.edTiptapAdapter.ready){
    try{
      tiptapHtml=window.edTiptapAdapter.getHTML()||null;
    }catch(e){}
  }
  // In doc-shell mode we render the FULL document (header + annex/backmatter).
  // The editable region is #docContent, but users can still resize tables in
  // annex/backmatter. To avoid losing those table width changes, we capture a
  // cleaned copy of the whole shell here, and later merge it back when exporting
  // a full HTML file.
  var shell = (area.classList.contains('ed-doc-shell') ? area.querySelector('.qms-doc') : null);
  var ctx = shell ? shell : (edGetContentRoot()||area);

  // Reset cached shell export unless we are in shell mode
  if(!shell) edCleanShellHtml = null;
  // Sync checkbox states to HTML attributes before cloning
  ctx.querySelectorAll('input[type=checkbox]').forEach(function(cb){
    if(cb.checked)cb.setAttribute('checked','checked');
    else cb.removeAttribute('checked');
  });
  var clone=ctx.cloneNode(true);
  if(tiptapHtml){
    if(shell){
      var dcClone=clone.querySelector('#docContent');
      if(dcClone) dcClone.innerHTML=tiptapHtml;
    }else{
      clone.innerHTML=tiptapHtml;
    }
  }
  // Remove textbox controls
  clone.querySelectorAll('.ed-tb-handle,.ed-tb-bar').forEach(function(x){x.remove();});
  // Remove shape controls
  clone.querySelectorAll('.ed-sh-handle,.ed-sh-bar,.ed-sh-rotate').forEach(function(x){x.remove();});
  clone.querySelectorAll('.ed-shape.ed-sh-selected').forEach(function(x){x.classList.remove('ed-sh-selected');});
  clone.querySelectorAll('.ed-shape').forEach(function(x){
    x.removeAttribute('data-drag-armed');
    x.removeAttribute('data-just-placed-at');
  });
  clone.querySelectorAll('.ed-qms-toolbar').forEach(function(x){x.remove();});
  clone.querySelectorAll('.ed-qms-selected').forEach(function(x){x.classList.remove('ed-qms-selected');});
  // Remove chart controls
  clone.querySelectorAll('.ed-ch-bar,.ed-ch-handle').forEach(function(x){x.remove();});
  // Remove table float bar
  clone.querySelectorAll('.ed-tbl-float-bar').forEach(function(x){x.remove();});
  // Unwrap image resize wrappers (keep the img, remove wrapper)
  clone.querySelectorAll('.ed-img-resize-wrap').forEach(function(wrap){
    var img=wrap.querySelector('img');
    if(img){
      img.classList.remove('ed-img-selected');
      wrap.parentNode.insertBefore(img,wrap);
    }
    wrap.remove();
  });
  // Remove stray image handles/bars/tooltips
  clone.querySelectorAll('.ed-img-handle,.ed-img-bar,.ed-img-size-tooltip').forEach(function(x){x.remove();});
  // Remove any selection outlines
  clone.querySelectorAll('.ed-img-selected').forEach(function(x){x.classList.remove('ed-img-selected');});
  // Remove find highlights (unwrap <mark> back to text)
  clone.querySelectorAll('mark.ed-hl').forEach(function(m){
    var parent=m.parentNode;
    while(m.firstChild)parent.insertBefore(m.firstChild,m);
    parent.removeChild(m);
    parent.normalize();
  });
  // Remove data-ed-init attributes (internal use only)
  clone.querySelectorAll('[data-ed-init]').forEach(function(el){el.removeAttribute('data-ed-init');});
  // Apply global table policy, but keep manually fixed-width tables intact.
  try{ edApplyGlobalTablePolicy(clone, {force:true, source:'clean'}); }catch(_e){}
  // Normalize tables for export so resized column widths are preserved
  // consistently across Draft -> InReview -> Approved.
  try{ edNormalizeTablesForExport(clone); }catch(_e){}

  // If we are in shell mode: store the cleaned shell (BODY innerHTML) and
  // return ONLY #docContent HTML (the main editable content).
  if(shell){
    try{ edCleanShellHtml = clone.innerHTML; }catch(e){ edCleanShellHtml = null; }
    var dc = clone.querySelector('#docContent');
    return dc ? dc.innerHTML : clone.innerHTML;
  }

  return clone.innerHTML;
}

// Convert fixed pixel table widths (created by the editor's table resize) into
// percentage widths so tables remain responsive and do not visually "reset"
// when switching to review/approved states.
function edNormalizeTablesForExport(root){
  if(!root) return;
  var tables = root.querySelectorAll('table');
  tables.forEach(function(table){
    if(!table || table.nodeType !== 1) return;
    if(table.closest('.ed-modal-overlay,.ed-tbl-float-bar')) return;
    var manualFixed = false;
    try{ manualFixed = edTableHasManualFixedLayout(table); }catch(_e){}
    if(!manualFixed){
      try{ edTableApplyAutoPolicy(table, {force:true, source:'export'}); }catch(_e){}
    }

    // Get direct <colgroup>
    var cg = null;
    for(var i=0;i<table.children.length;i++){
      if(table.children[i].tagName === 'COLGROUP'){ cg = table.children[i]; break; }
    }
    var cols = cg ? Array.prototype.slice.call(cg.querySelectorAll('col')) : [];

    var styleW = (table.style.width || '').trim().toLowerCase();
    var tableWpx = null;
    if(styleW && styleW.indexOf('px') > -1){
      var p = parseFloat(styleW);
      if(isFinite(p) && p > 0) tableWpx = p;
    }

    // Extract px widths from cols if any
    var hasPxCol = false;
    var colPx = [];
    if(cols.length){
      cols.forEach(function(col){
        var w = (col.style.width || '').trim().toLowerCase();
        if(!w){ colPx.push(null); return; }
        if(w.indexOf('px') > -1){
          var px = parseFloat(w);
          if(isFinite(px) && px > 0){ hasPxCol = true; colPx.push(px); }
          else colPx.push(null);
        } else {
          // For % or other units: keep as-is (no conversion)
          colPx.push(null);
        }
      });
    }

    // A) Table has px columns -> convert to %
    if(hasPxCol){
      var sum = colPx.reduce(function(a,b){ return a + (b||0); }, 0);
      if((!sum || sum < 1) && tableWpx) sum = tableWpx;
      if(!sum || sum < 1) return;

      // Fill missing widths evenly
      var missing = colPx.filter(function(v){ return !v; }).length;
      if(missing){
        var used = colPx.reduce(function(a,b){ return a + (b||0); }, 0);
        var remain = Math.max(0, sum - used);
        var fill = remain / missing;
        colPx = colPx.map(function(v){ return v || (fill || (sum / Math.max(1, colPx.length))); });
        sum = colPx.reduce(function(a,b){ return a + (b||0); }, 0);
      }

      cols.forEach(function(col, idx){
        var pct = (colPx[idx] / sum) * 100;
        col.style.width = pct.toFixed(2) + '%';
      });

      table.style.width = '100%';
      table.style.maxWidth = '100%';
      table.style.tableLayout = 'fixed';
      table.classList.remove('ed-tbl-fixed');
      return;
    }

    // B) Table has px width but no px columns -> make responsive
    if(tableWpx){
      table.style.width = '100%';
      table.style.maxWidth = '100%';
      if((table.style.tableLayout||'').toLowerCase() === 'fixed') table.style.tableLayout = '';
      table.classList.remove('ed-tbl-fixed');
    }
  });
}

function edOnInput(){
  edMarkModified();
  edUpdateWordCount();
  // Auto-save after 3 seconds of inactivity
  clearTimeout(edAutoSaveTimer);
  edAutoSaveTimer = setTimeout(()=>{
    if(editingDoc && editMode){
      var html = edCleanHTML();
      setEditedHtml(editingDoc, html);
      const el = document.getElementById('ed-status-save');
      if(el){el.textContent=(lang!=='en'?'💾 Đã tự lưu':'💾 Auto-saved');el.className='ed-autosave';}
    }
  }, 3000);
}

function edMarkModified(){
  edModified = true;
  const el = document.getElementById('ed-status-save');
  if(el){el.textContent='● '+(lang!=='en'?'Chưa lưu':'Modified');el.className='ed-modified';}
}
function edMarkSaved(message){
  edModified = false;
  const el = document.getElementById('ed-status-save');
  if(el){
    el.textContent = message || (lang!=='en'?'\u2713 \u0110\u00e3 l\u01b0u':'\u2713 Saved');
    el.className = 'ed-autosave';
  }
}

function edUpdateWordCount(){
  const area=document.getElementById('editor-area');
  if(!area)return;
  const ctx=edGetContentRoot()||area;
  const text=ctx.innerText||'';
  const words=text.trim().split(/\s+/).filter(w=>w.length>0).length;
  const chars=text.length;
  const lines=(text.match(/\n/g)||[]).length+1;
  const w=document.getElementById('ed-status-words');
  const c=document.getElementById('ed-status-chars');
  const l=document.getElementById('ed-status-lines');
  const m=document.getElementById('ed-status-mode');
  if(w)w.textContent=words+' '+(lang!=='en'?'từ':'words');
  if(c)c.textContent=chars+' '+(lang!=='en'?'ký tự':'chars');
  if(l)l.textContent=lines+' '+(lang!=='en'?'dòng':'lines');
  if(m)m.textContent=edSourceMode?'HTML':'WYSIWYG';
}

function edUpdateState(){
  if(edSourceMode)return;  // Don't update state in source mode
  if(edGetEngineMode()==='tiptap' && window.edTiptapAdapter && window.edTiptapAdapter.ready && typeof window.edTiptapAdapter.queryState==='function'){
    try{
      ['bold','italic','underline','strikeThrough','superscript','subscript','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight','justifyFull'].forEach(function(cmd){
        var btn=document.querySelector('[data-cmd="'+cmd+'"]');
        if(btn){
          try{btn.classList.toggle('active',!!window.edTiptapAdapter.queryState(cmd));}catch(e){}
        }
      });
      if(typeof window.edTiptapAdapter.queryValue==='function'){
        try{
          var fontSelT=document.getElementById('ed-font');
          if(fontSelT){
            var fnT=String(window.edTiptapAdapter.queryValue('fontName')||'').replace(/['"]/g,'');
            if(fnT){
              for(var fi=0;fi<fontSelT.options.length;fi++){
                var ov=String(fontSelT.options[fi].value||'');
                if(ov.toLowerCase()===fnT.toLowerCase()){
                  fontSelT.selectedIndex=fi;
                  break;
                }
              }
            }
          }
          var sizeSelT=document.getElementById('ed-size');
          if(sizeSelT){
            var fsT=String(window.edTiptapAdapter.queryValue('fontSize')||'');
            if(fsT){
              for(var si=0;si<sizeSelT.options.length;si++){
                if(String(sizeSelT.options[si].value||'')===fsT){
                  sizeSelT.selectedIndex=si;
                  break;
                }
              }
            }
          }
        }catch(e){}
      }
      return;
    }catch(e){}
  }
  try{
    // Update toolbar button active states
    ['bold','italic','underline','strikeThrough','superscript','subscript','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight','justifyFull'].forEach(function(cmd){
      var btn=document.querySelector('[data-cmd="'+cmd+'"]');
      if(btn){
        try{btn.classList.toggle('active',document.queryCommandState(cmd));}catch(e){}
      }
    });
    // Sync font selector
    try{
      var fontSel=document.getElementById('ed-font');
      if(fontSel){
        var fn=document.queryCommandValue('fontName').replace(/['"]/g,'');
        if(fn){for(var i=0;i<fontSel.options.length;i++){if(fontSel.options[i].value===fn){fontSel.selectedIndex=i;break;}}}
      }
      var sizeSel=document.getElementById('ed-size');
      if(sizeSel){
        var fs=document.queryCommandValue('fontSize');
        if(fs){for(var i=0;i<sizeSel.options.length;i++){if(sizeSel.options[i].value===fs){sizeSel.selectedIndex=i;break;}}}
      }
    }catch(e){}
  }catch(e){}
}

function _edMoveTabInTable(forward){
  var sel=window.getSelection();
  if(!sel||!sel.rangeCount) return false;
  var node=sel.anchorNode;
  var el=(node&&node.nodeType===1)?node:(node&&node.parentElement);
  if(!el) return false;
  var cell=el.closest('td,th');
  if(!cell) return false;
  var row=cell.parentElement;
  if(!row||row.tagName!=='TR') return false;
  var rowCells=Array.from(row.children).filter(function(c){return c.tagName==='TD'||c.tagName==='TH';});
  var idx=rowCells.indexOf(cell);
  if(idx<0) return false;

  var target=null;
  if(forward){
    if(idx<rowCells.length-1){
      target=rowCells[idx+1];
    }else{
      var nextRow=row.nextElementSibling;
      while(nextRow&&nextRow.tagName!=='TR') nextRow=nextRow.nextElementSibling;
      if(nextRow){
        var nextCells=Array.from(nextRow.children).filter(function(c){return c.tagName==='TD'||c.tagName==='TH';});
        target=nextCells[0]||null;
      }else{
        // Word-like behavior: Tab at the last cell creates a new row.
        var parent=row.parentElement;
        if(parent){
          var newRow=document.createElement('tr');
          rowCells.forEach(function(srcCell){
            var tag=(srcCell.tagName||'TD').toLowerCase();
            var nc=document.createElement(tag);
            nc.style.cssText=srcCell.style.cssText||'';
            nc.innerHTML='<br>';
            newRow.appendChild(nc);
          });
          parent.appendChild(newRow);
          var newCells=Array.from(newRow.children).filter(function(c){return c.tagName==='TD'||c.tagName==='TH';});
          target=newCells[0]||null;
          if(target) edMarkModified();
        }
      }
    }
  }else{
    if(idx>0){
      target=rowCells[idx-1];
    }else{
      var prevRow=row.previousElementSibling;
      while(prevRow&&prevRow.tagName!=='TR') prevRow=prevRow.previousElementSibling;
      if(prevRow){
        var prevCells=Array.from(prevRow.children).filter(function(c){return c.tagName==='TD'||c.tagName==='TH';});
        target=prevCells.length?prevCells[prevCells.length-1]:null;
      }
    }
  }
  if(!target) return false;

  var range=document.createRange();
  range.selectNodeContents(target);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

function edKeyDown(e){
  var tiptapActive=(
    edGetEngineMode()==='tiptap' &&
    window.edTiptapAdapter &&
    window.edTiptapAdapter.ready
  );
  if((e.key==='Delete'||e.key==='Backspace') && window._edActiveQms && !edQmsEditActive(window._edActiveQms)){
    e.preventDefault();
    edDeleteQmsBlock(window._edActiveQms);
    return;
  }
  if(e.key==='Escape' && window._edActiveQms){
    if(edQmsEditActive(window._edActiveQms)){
      edSelectQmsBlock(window._edActiveQms);
    }else{
      edDeselectAllQmsBlocks();
    }
    return;
  }
  // Delete selected shape/textbox with Delete or Backspace
  if((e.key==='Delete'||e.key==='Backspace') && window._edActiveSh){
    // Don't delete if editing text inside shape
    if(document.activeElement && document.activeElement.closest('.ed-sh-text'))return;
    e.preventDefault();
    window._edActiveSh.remove();
    window._edActiveSh=null;
    edMarkModified();
    return;
  }
  // Escape to deselect shape
  if(e.key==='Escape' && window._edActiveSh){
    edDeselectAllShapes();
    return;
  }
  if(e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey){
    var altKey=e.key.toLowerCase();
    if(altKey==='d'){
      e.preventDefault();
      edInsertDateTime();
      return;
    }
  }
  // Keyboard shortcuts
  if(e.ctrlKey || e.metaKey){
    var key=e.key.toLowerCase();
    if(e.altKey && (key==='1' || key==='2' || key==='3')){
      e.preventDefault();
      edCmd('formatBlock','h'+key);
      return;
    }
    if(e.shiftKey && key==='n'){
      e.preventDefault();
      edCmd('formatBlock','p');
      return;
    }
    if(e.shiftKey && key==='l'){
      e.preventDefault();
      edCmd('insertUnorderedList');
      return;
    }
    if(key==='f'){
      e.preventDefault();
      edToggleFind();
      var fi=document.getElementById('ed-find-input');
      if(fi) fi.focus();
      return;
    }
    if(key==='h'){
      e.preventDefault();
      edToggleFind();
      var ri=document.getElementById('ed-replace-input');
      if(ri) ri.focus();
      return;
    }
    if(!e.shiftKey && !e.altKey && key==='e'){e.preventDefault();edCmd('justifyCenter');return;}
    if(!e.shiftKey && !e.altKey && key==='r'){e.preventDefault();edCmd('justifyRight');return;}
    if(!e.shiftKey && !e.altKey && key==='j'){e.preventDefault();edCmd('justifyFull');return;}
    if(!e.shiftKey && !e.altKey && key==='m'){e.preventDefault();edCmd('indent');return;}
    if(e.shiftKey && !e.altKey && key==='m'){e.preventDefault();edCmd('outdent');return;}
    if(key==='s'){e.preventDefault();if(editingDoc)saveDraft(editingDoc);return;}
    if(key==='p'){e.preventDefault();edPrint();return;}
  }
  if(!tiptapActive && e.key==='Enter' && !e.shiftKey){
    if(_edExitEmptyListItem()){
      e.preventDefault();
      edMarkModified();
      edUpdateState();
      return;
    }
  }
  if(!tiptapActive && (e.key==='Backspace'||e.key==='Delete')){
    var activeCell=_edCurrentTableCell();
    if(activeCell && _edSelectionCollapsed() && _edIsTableCellEmpty(activeCell)){
      e.preventDefault();
      _edNormalizeEmptyTableCell(activeCell);
      edUpdateState();
      return;
    }
    if(e.key==='Backspace'){
      var activeLi=_edCurrentListItem();
      if(activeLi && _edCaretAtStartOf(activeLi) && _edExitEmptyListItem()){
        e.preventDefault();
        edMarkModified();
        edUpdateState();
        return;
      }
    }
  }
  // Tab inserts indent in editor
  if(e.key==='Tab'){
    if(tiptapActive){
      e.preventDefault();
      var tabOk=false;
      try{
        if(window.edTiptapAdapter && typeof window.edTiptapAdapter.exec==='function'){
          tabOk=window.edTiptapAdapter.exec(e.shiftKey?'_tabBackward':'_tabForward',null);
        }
      }catch(_e){}
      if(tabOk!==false){
        edMarkModified();
        edUpdateState();
      }
      return;
    }
    e.preventDefault();
    // Word-like behavior: move between table cells when caret is in table.
    if(_edMoveTabInTable(!e.shiftKey)){
      edUpdateState();
      return;
    }
    var sel=window.getSelection();
    var node=sel&&sel.anchorNode;
    var el=(node&&node.nodeType===1)?node:(node&&node.parentElement);
    var inList=el&&el.closest('li');
    if(inList){
      if(_edHandleListIndent(!e.shiftKey) || edExecCommand(e.shiftKey?'outdent':'indent',false,null)!==false){
        edMarkModified();
        edUpdateState();
      }
      return;
    }
    var tabInsertOk=edExecCommand('insertHTML',false,'&nbsp;&nbsp;&nbsp;&nbsp;');
    if(tabInsertOk!==false){
      edMarkModified();
      edUpdateState();
    }
  }
  // Escape to close find bar / fullscreen
  if(e.key==='Escape'){
    var fb=document.getElementById('ed-find-bar');
    if(fb&&fb.classList.contains('open')){edCloseFind();return;}
    if(edFullscreen){edToggleFullscreen();return;}
  }
}

// ═══════════════════════════════════════════════════
// RICH INSERT DIALOGS
// ═══════════════════════════════════════════════════
function edShowModal(title, fields, onOK){
  const root = edGetModalRoot();
  const vi = lang!=='en';
  let html = '<div class="ed-modal-overlay" id="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal"><h4>'+_edEscapeHtml(title||'')+'</h4>';
  fields.forEach((f,i)=>{
    var lbl=_edEscapeHtml((f&&f.label)||'');
    var typ=_edEscapeHtml((f&&f.type)||'text');
    var val=_edEscapeHtml((f&&f.value)||'');
    var ph=_edEscapeHtml((f&&f.ph)||'');
    html += '<label>'+lbl+'</label><input type="'+typ+'" id="ed-modal-f'+i+'" value="'+val+'" placeholder="'+ph+'">';
  });
  html += '<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Hủy':'Cancel')+'</button><button class="ed-m-ok" onclick="edModalOK()">'+(vi?'Chèn':'Insert')+'</button></div></div></div>';
  root.innerHTML = html;
  root._onOK = onOK;
  root._fieldCount = fields.length;
  setTimeout(()=>{const f=document.getElementById('ed-modal-f0');if(f)f.focus();},50);
}
function edGetModalRoot(){
  var r=document.getElementById('ed-modal-root');
  if(!r){r=document.createElement('div');r.id='ed-modal-root';document.body.appendChild(r);}
  return r;
}
function edCloseModal(){edGetModalRoot().innerHTML='';}
function edModalOK(){
  const root = edGetModalRoot();
  const vals = [];
  for(let i=0;i<root._fieldCount;i++){
    const el = document.getElementById('ed-modal-f'+i);
    vals.push(el?el.value:'');
  }
  if(root._onOK) root._onOK(vals);
  edCloseModal();
}

function _edEscapeHtml(val){
  return String(val==null?'':val)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function _edDecodeHtml(val){
  var s=String(val==null?'':val);
  if(!s) return '';
  var t=document.createElement('textarea');
  t.innerHTML=s;
  return t.value;
}

function _edSanitizeUrl(raw,opt){
  var cfg;
  if(typeof opt==='object' && opt){
    cfg=Object.assign({
      allowData:false,
      allowBlob:false,
      dataImageOnly:false
    },opt);
  }else{
    var yes=!!opt;
    cfg={allowData:yes,allowBlob:yes,dataImageOnly:yes};
  }
  var v=String(raw==null?'':raw).replace(/[\u0000-\u001F\u007F]+/g,'').trim();
  if(!v) return '';
  var lower=v.toLowerCase();
  if(lower.startsWith('javascript:')||lower.startsWith('vbscript:')||lower.startsWith('file:')) return '';
  if(lower.startsWith('data:')){
    if(!cfg.allowData) return '';
    if(cfg.dataImageOnly && !/^data:image\/[a-z0-9.+-]+(?:;[a-z0-9=._+-]+)*,/i.test(lower)) return '';
    return v;
  }
  if(lower.startsWith('blob:')) return cfg.allowBlob?v:'';
  if(lower.startsWith('http://')||lower.startsWith('https://')||lower.startsWith('mailto:')||lower.startsWith('tel:')||lower.startsWith('#')||lower.startsWith('/')) return v;
  if(/^[a-z][a-z0-9+.-]*:/i.test(v)) return '';
  return v;
}

function _edSanitizeCssSize(raw,fallback){
  var v=String(raw==null?'':raw).trim();
  if(!v) return fallback;
  var m=v.match(/^(\d+(?:\.\d+)?)(px|%|em|rem|vw|vh)?$/i);
  if(!m) return fallback;
  var num=parseFloat(m[1]);
  if(!isFinite(num) || num<=0) return fallback;
  var unit=(m[2]||'px').toLowerCase();
  if(unit==='%'){
    if(num<1) num=1;
    if(num>400) num=400;
  }else{
    if(num>5000) num=5000;
  }
  var norm=(Math.round(num*100)/100).toString().replace(/\.0+$/,'').replace(/(\.\d*[1-9])0+$/,'$1');
  return norm+unit;
}

function _edSanitizeInlineStyle(styleText,opts){
  var cfg=Object.assign({forPaste:false},opts||{});
  var txt=String(styleText==null?'':styleText);
  if(!txt) return '';
  var out=[];
  txt.split(';').forEach(function(part){
    var i=part.indexOf(':');
    if(i<1) return;
    var prop=part.slice(0,i).trim().toLowerCase();
    var val=part.slice(i+1).trim();
    if(!prop||!val) return;
    if(/^mso-/.test(prop)) return;
    if(prop==='behavior' || prop==='-moz-binding') return;
    if(cfg.forPaste && (prop==='position'||prop==='left'||prop==='right'||prop==='top'||prop==='bottom'||prop==='z-index')) return;
    if(/expression\s*\(|javascript:|vbscript:|@import/i.test(val)) return;
    if(/url\s*\(/i.test(val)) return;
    if(val.length>400) return;
    out.push(prop+':'+val);
  });
  return out.join(';');
}

function _edSanitizeHtmlFragment(rawHtml,opts){
  var cfg=Object.assign({
    forPaste:false,
    stripClasses:false,
    stripIds:false,
    preserveDataAttrs:true
  },opts||{});
  var html=String(rawHtml==null?'':rawHtml);
  if(!html) return '';

  var tpl=document.createElement('template');
  tpl.innerHTML=html.replace(/<!--[\s\S]*?-->/g,'');

  var forbidden='script,style,meta,link,iframe,frame,frameset,object,embed,applet,base,noscript';
  if(cfg.forPaste) forbidden+=',form,button,select,textarea,input';
  tpl.content.querySelectorAll(forbidden).forEach(function(el){el.remove();});

  tpl.content.querySelectorAll('*').forEach(function(el){
    var tag=(el.tagName||'').toLowerCase();
    Array.from(el.attributes||[]).forEach(function(a){
      var n=(a.name||'').toLowerCase();
      var v=a.value;
      if(!n) return;
      if(n.startsWith('on')||n==='srcdoc'||n==='nonce'||n==='integrity'||n==='crossorigin'||n==='referrerpolicy'){
        el.removeAttribute(a.name);return;
      }
      if(n==='style'){
        var s=_edSanitizeInlineStyle(v,{forPaste:cfg.forPaste});
        if(s) el.setAttribute('style',s); else el.removeAttribute(a.name);
        return;
      }
      if(n==='href'||n==='xlink:href'||n==='formaction'||n==='action'){
        var u=_edSanitizeUrl(v,{allowData:false,allowBlob:false});
        if(u) el.setAttribute(a.name,u); else el.removeAttribute(a.name);
        return;
      }
      if(n==='src'){
        var allowImg=(tag==='img');
        var us=_edSanitizeUrl(v,{allowData:allowImg,allowBlob:allowImg,dataImageOnly:allowImg});
        if(us) el.setAttribute(a.name,us); else el.removeAttribute(a.name);
        return;
      }
      if(n==='class' && cfg.stripClasses){ el.removeAttribute(a.name); return; }
      if(n==='id' && cfg.stripIds){ el.removeAttribute(a.name); return; }
      if(n.startsWith('data-') && !cfg.preserveDataAttrs){ el.removeAttribute(a.name); return; }
      if(n==='contenteditable'){
        var cv=String(v==null?'':v).toLowerCase();
        if(cv!=='true'&&cv!=='false') el.removeAttribute(a.name);
        else el.setAttribute(a.name,cv);
        return;
      }
      if(n==='target'){
        var tv=String(v==null?'':v).toLowerCase();
        if(tv!=='_blank'&&tv!=='_self'&&tv!=='_parent'&&tv!=='_top') el.removeAttribute(a.name);
        else el.setAttribute(a.name,tv);
      }
    });

    if(tag==='a'){
      var href=el.getAttribute('href');
      if(!href){
        var parent=el.parentNode;
        if(parent){
          while(el.firstChild) parent.insertBefore(el.firstChild,el);
          parent.removeChild(el);
        }
        return;
      }
      if(!el.hasAttribute('rel')) el.setAttribute('rel','noopener noreferrer');
      if(el.getAttribute('target')==='_blank'){
        var rel=String(el.getAttribute('rel')||'').toLowerCase();
        if(rel.indexOf('noopener')<0||rel.indexOf('noreferrer')<0){
          el.setAttribute('rel','noopener noreferrer');
        }
      }
    }
  });

  if(cfg.forPaste){
    tpl.content.querySelectorAll('span').forEach(function(sp){
      if((sp.attributes||[]).length===0){
        var p=sp.parentNode;
        if(p){
          while(sp.firstChild) p.insertBefore(sp.firstChild,sp);
          p.removeChild(sp);
        }
      }
    });
  }
  return tpl.innerHTML.trim();
}

function edInsertLink(){
  const vi = lang!=='en';
  let selectedText='';
  try{
    const sel=window.getSelection();
    if(sel&&sel.rangeCount&&!sel.getRangeAt(0).collapsed){
      selectedText=String(sel.toString()||'').trim();
    }
  }catch(e){}
  edShowModal(vi?'Chèn liên kết':'Insert Link',[
    {label:'URL',ph:'https://example.com',value:'https://'},
    {label:vi?'Văn bản hiển thị':'Display Text',ph:vi?'Nhấn vào đây':'Click here',value:selectedText}
  ],(vals)=>{
    var url=_edSanitizeUrl(vals[0],false);
    var textRaw=String(vals[1]||'').trim();
    if(!url){
      showToast(vi?'\u26a0 Liên kết không hợp lệ':'\u26a0 Invalid link URL');
      return;
    }
    edFocusAndRestore();
    let activeSelText='';
    let hasSelection=false;
    try{
      const sel=window.getSelection();
      hasSelection=!!(sel&&sel.rangeCount&&!sel.getRangeAt(0).collapsed);
      activeSelText=hasSelection?String(sel.toString()||'').trim():'';
    }catch(e){}

    // Keep selected text when display text is empty/same, similar to Word behavior.
    if(hasSelection && (!textRaw || textRaw===activeSelText)){
      var okLink=edExecCommand('createLink',false,url);
      if(okLink!==false){
        edMarkModified();
        return;
      }
    }

    var displayText=textRaw||activeSelText||url;
    var safeHtml='<a href="'+_edEscapeHtml(url)+'" target="_blank" rel="noopener noreferrer">'+_edEscapeHtml(displayText)+'</a>';
    var okInsert=edExecCommand('insertHTML',false,safeHtml);
    if(okInsert!==false) edMarkModified();
  });
}

function edInsertImage(){
  const vi=lang!=='en';
  const root=edGetModalRoot();
  root.innerHTML='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal"><h4>'+(vi?'Chèn hình ảnh':'Insert Image')+'</h4>'+
    '<div class="ed-img-tabs"><button class="active" onclick="edImgTab(0,this)">URL</button><button onclick="edImgTab(1,this)">'+(vi?'Tải lên từ máy':'Upload from PC')+'</button></div>'+
    '<div id="ed-img-pane0"><label>URL</label><input id="ed-modal-f0" placeholder="https://example.com/image.jpg" value="https://"><label>'+(vi?'Mô tả':'Alt Text')+'</label><input id="ed-modal-f1" placeholder="'+(vi?'Mô tả hình':'Description')+'"><label>'+(vi?'Chiều rộng':'Width')+'</label><input id="ed-modal-f2" value="100%" placeholder="100%"></div>'+
    '<div id="ed-img-pane1" style="display:none"><div class="ed-img-upload-area" id="ed-img-drop" tabindex="0" role="button" aria-label="'+(vi?'Chọn hình ảnh từ máy':'Choose image from computer')+'">'+
    '<div class="ed-img-upload-icon">📁</div><div class="ed-img-upload-copy">'+(vi?'Nhấn hoặc kéo thả hình ảnh vào đây':'Click or drag & drop image here')+'</div><div class="ed-img-upload-subcopy">'+(vi?'PNG, JPG, WEBP, GIF · tối đa 10MB':'PNG, JPG, WEBP, GIF · up to 10MB')+'</div><div class="ed-img-upload-status" id="ed-img-drop-status"></div><button type="button" class="ed-img-upload-btn" id="ed-img-upload-trigger">'+(vi?'Chọn ảnh':'Choose image')+'</button><input type="file" id="ed-file-upload2" accept="image/*" style="display:none"></div>'+
    '<img id="ed-img-preview" class="ed-img-preview"><label>'+(vi?'Mô tả':'Alt Text')+'</label><input id="ed-modal-f3" placeholder="'+(vi?'Mô tả hình':'Description')+'"><label>'+(vi?'Chiều rộng':'Width')+'</label><input id="ed-modal-f4" value="100%"></div>'+
    '<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Hủy':'Cancel')+'</button><button class="ed-m-ok" onclick="edInsertImgOK()">'+(vi?'Chèn':'Insert')+'</button></div></div></div>';
  root._imgTab=0;root._imgData=null;
  edInitImageModal(root);
}
function edInitImageModal(root){
  var drop=document.getElementById('ed-img-drop');
  var input=document.getElementById('ed-file-upload2');
  var trigger=document.getElementById('ed-img-upload-trigger');
  if(!drop||!input) return;
  var openPicker=function(){
    try{ input.click(); }
    catch(e){ showToast(lang!=='en'?'⚠ Không thể mở hộp chọn ảnh':'⚠ Cannot open image picker'); }
  };
  if(trigger){
    trigger.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      openPicker();
    };
  }
  drop.onclick=function(e){
    if(e.target===input) return;
    if(trigger&&trigger.contains(e.target)) return;
    openPicker();
  };
  drop.onkeydown=function(e){
    if(e.key==='Enter' || e.key===' '){
      e.preventDefault();
      openPicker();
    }
  };
  drop.ondragover=function(e){
    e.preventDefault();
    drop.classList.add('dragover');
  };
  drop.ondragleave=function(){
    drop.classList.remove('dragover');
  };
  drop.ondrop=function(e){
    edHandleDrop(e);
  };
  input.onchange=function(){
    edHandleModalFile(this);
  };
}
function edImgTab(idx,el){
  document.getElementById('ed-img-pane0').style.display=idx===0?'block':'none';
  document.getElementById('ed-img-pane1').style.display=idx===1?'block':'none';
  el.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  edGetModalRoot()._imgTab=idx;
}
function edHandleDrop(e){
  e.preventDefault();e.currentTarget.classList.remove('dragover');
  var f=e.dataTransfer.files[0];
  if(f&&f.type.startsWith('image/')){
    if(f.size>10*1024*1024){showToast(lang!=='en'?'⚠ Hình ảnh quá lớn (tối đa 10MB)':'⚠ Image too large (max 10MB)');return;}
    edReadImageFile(f);
  }
}
function edHandleModalFile(input){
  var f=input.files[0];
  if(f){
    if(f.size>10*1024*1024){showToast(lang!=='en'?'⚠ Hình ảnh quá lớn (tối đa 10MB)':'⚠ Image too large (max 10MB)');input.value='';return;}
    edReadImageFile(f);
  }
  input.value='';
}
function edReadImageFile(file){
  // Check file size (max 10MB)
  var maxSize=10*1024*1024;
  if(file.size>maxSize){
    showToast(lang!=='en'?'⚠ Hình ảnh quá lớn (tối đa 10MB)':'⚠ Image too large (max 10MB)');
    return;
  }
  // Check file type
  if(!file.type.startsWith('image/')){
    showToast(lang!=='en'?'⚠ Chỉ chấp nhận file hình ảnh':'⚠ Only image files accepted');
    return;
  }
  var reader=new FileReader();
  reader.onload=function(e){
    edGetModalRoot()._imgData=e.target.result;
    var prev=document.getElementById('ed-img-preview');
    if(prev){ prev.src=e.target.result;prev.style.display='block'; }
    var safeName=_edEscapeHtml(file.name||'');
    var sizeStr=file.size<1024*1024?Math.round(file.size/1024)+'KB':Math.round(file.size/1024/1024*10)/10+'MB';
    var status=document.getElementById('ed-img-drop-status');
    var drop=document.getElementById('ed-img-drop');
    if(status){
      status.innerHTML='<span class="ed-img-upload-ok">✓</span> '+(lang!=='en'?'Đã chọn: ':'Selected: ')+safeName+' ('+sizeStr+')';
      status.style.display='block';
    }
    if(drop) drop.classList.add('has-file');
  };
  reader.readAsDataURL(file);
}
function edInsertImgOK(){
  const root=edGetModalRoot();
  edFocusAndRestore();
  if(root._imgTab===0){
    const url=_edSanitizeUrl(document.getElementById('ed-modal-f0').value,{allowData:true,allowBlob:true,dataImageOnly:true});
    const alt=document.getElementById('ed-modal-f1').value;
    const w=_edSanitizeCssSize(document.getElementById('ed-modal-f2').value,'100%');
    var safeAlt=_edEscapeHtml(alt||'');
    if(url&&url!=='https://'){
      var okUrl=edExecCommand('insertHTML',false,'<img src="'+_edEscapeHtml(url)+'" alt="'+safeAlt+'" style="max-width:'+w+';height:auto;border-radius:4px">');
      if(okUrl!==false) edMarkModified();
    }
  }else{
    const data=_edSanitizeUrl(root._imgData,{allowData:true,allowBlob:true,dataImageOnly:true});
    const alt=document.getElementById('ed-modal-f3').value;
    const w=_edSanitizeCssSize(document.getElementById('ed-modal-f4').value,'100%');
    var safeAlt2=_edEscapeHtml(alt||'');
    if(data){
      var okData=edExecCommand('insertHTML',false,'<img src="'+_edEscapeHtml(data)+'" alt="'+safeAlt2+'" style="max-width:'+w+';height:auto;border-radius:4px">');
      if(okData!==false) edMarkModified();
    }
  }
  edCloseModal();
}
function edUploadImage(){
  var input=document.getElementById('ed-file-upload');
  if(!input){
    showToast(lang!=='en'?'⚠ Không tìm thấy bộ chọn ảnh':'⚠ Image picker not found');
    return;
  }
  try{ input.click(); }
  catch(e){ showToast(lang!=='en'?'⚠ Không thể mở hộp chọn ảnh':'⚠ Cannot open image picker'); }
}
function edHandleFileUpload(input){
  var f=input.files[0];if(!f)return;
  // Check file size (max 10MB)
  if(f.size>10*1024*1024){
    showToast(lang!=='en'?'⚠ Hình ảnh quá lớn (tối đa 10MB)':'⚠ Image too large (max 10MB)');
    input.value='';return;
  }
  if(!f.type.startsWith('image/')){
    showToast(lang!=='en'?'⚠ Chỉ chấp nhận file hình ảnh':'⚠ Only image files accepted');
    input.value='';return;
  }
  var reader=new FileReader();
  reader.onload=function(e){
    edFocusAndRestore();
    var safeName=_edEscapeHtml(f.name||'');
    var src=_edSanitizeUrl(e.target && e.target.result,{allowData:true,allowBlob:true,dataImageOnly:true});
    if(!src){
      showToast(lang!=='en'?'⚠ Dữ liệu ảnh không hợp lệ':'⚠ Invalid image data');
      return;
    }
    var ok=edExecCommand('insertHTML',false,'<img src="'+_edEscapeHtml(src)+'" alt="'+safeName+'" style="max-width:100%;height:auto;border-radius:4px">');
    if(ok!==false) edMarkModified();
  };
  reader.readAsDataURL(f);
  input.value='';
}

function edInsertTable(){
  const vi=lang!=='en';
  const root=edGetModalRoot();
  let html='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal"><h4>'+(vi?'Chèn bảng':'Insert Table')+'</h4>';
  // Grid picker
  html+='<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:600;color:#666">'+(vi?'Chọn kích thước (kéo chuột)':'Pick size (hover)')+'</label>';
  html+='<div id="ed-tbl-grid" style="display:inline-grid;grid-template-columns:repeat(10,22px);gap:2px;margin:8px 0;padding:4px;background:#f8f9fa;border-radius:6px">';
  for(let r=0;r<8;r++)for(let c=0;c<10;c++){
    html+='<div data-r="'+(r+1)+'" data-c="'+(c+1)+'" style="width:20px;height:16px;border:1px solid #d1d5db;border-radius:2px;cursor:pointer;transition:background .05s" onmouseover="edTblGridHover(this)" onclick="edTblGridPick(this)"></div>';
  }
  html+='</div><div id="ed-tbl-grid-label" style="font-size:11px;color:#666;margin-bottom:8px">0 × 0</div></div>';
  // Or manual input
  html+='<div style="display:flex;gap:8px;align-items:center"><label style="font-size:11px;color:#666">'+(vi?'Hoặc:':'Or:')+'</label>';
  html+='<input id="ed-tbl-rows" type="number" value="3" min="1" max="50" style="width:50px;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"> × ';
  html+='<input id="ed-tbl-cols" type="number" value="3" min="1" max="20" style="width:50px;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px">';
  html+='<label style="font-size:11px;color:#666;margin-left:8px"><input type="checkbox" id="ed-tbl-header" checked> '+(vi?'Tiêu đề':'Header')+'</label></div>';
  html+='<div style="margin-top:10px"><label style="font-size:11px;font-weight:600;color:#666">'+(vi?'Kiểu bảng':'Table Style')+'</label>';
  html+='<div style="display:flex;gap:6px;margin-top:4px">';
  const styles=[
    {name:vi?'Cơ bản':'Basic',border:'#cbd5e1',headerBg:'#f1f5f9',stripe:''},
    {name:vi?'Xanh':'Blue',border:'#93c5fd',headerBg:'#1d4ed8',headerColor:'#fff',stripe:'#eff6ff'},
    {name:vi?'Xanh lá':'Green',border:'#86efac',headerBg:'#15803d',headerColor:'#fff',stripe:'#f0fdf4'},
    {name:vi?'Tím':'Purple',border:'#c4b5fd',headerBg:'#7c3aed',headerColor:'#fff',stripe:'#faf5ff'},
    {name:vi?'Không viền':'Minimal',border:'transparent',headerBg:'#f8fafc',stripe:'#f8fafc'}
  ];
  styles.forEach((s,i)=>{
    html+='<button onclick="document.getElementById(\'ed-modal-root\')._tblStyle='+i+';this.parentElement.querySelectorAll(\'button\').forEach(b=>b.style.outline=\'none\');this.style.outline=\'2px solid #1967d2\'" style="padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:10px;background:#fff;cursor:pointer;font-weight:600'+(i===0?';outline:2px solid #1967d2':'')+'" title="'+s.name+'">'+s.name+'</button>';
  });
  html+='</div></div>';
  html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Hủy':'Cancel')+'</button><button class="ed-m-ok" onclick="edDoInsertTable()">'+(vi?'Chèn':'Insert')+'</button></div></div></div>';
  root.innerHTML=html;
  root._tblStyle=0;
  root._tblStyles=styles;
}
function edTblGridHover(el){
  const r=+el.dataset.r,c=+el.dataset.c;
  document.getElementById('ed-tbl-grid-label').textContent=r+' × '+c;
  document.querySelectorAll('#ed-tbl-grid > div').forEach(d=>{
    d.style.background=(+d.dataset.r<=r&&+d.dataset.c<=c)?'#8ab4f8':'';
  });
}
function edTblGridPick(el){
  document.getElementById('ed-tbl-rows').value=el.dataset.r;
  document.getElementById('ed-tbl-cols').value=el.dataset.c;
  edDoInsertTable();
}
function edDoInsertTable(){
  const vi=lang!=='en';
  const rows=parseInt(document.getElementById('ed-tbl-rows').value)||3;
  const cols=parseInt(document.getElementById('ed-tbl-cols').value)||3;
  const header=document.getElementById('ed-tbl-header').checked;
  const root=edGetModalRoot();
  var tiptapActive=(
    edGetEngineMode()==='tiptap' &&
    window.edTiptapAdapter &&
    window.edTiptapAdapter.ready
  );
  if(tiptapActive){
    edFocusAndRestore();
    var okTable=edExecCommand('insertTable',false,{
      rows:Math.max(1,Math.min(50,rows)),
      cols:Math.max(1,Math.min(20,cols)),
      withHeaderRow:!!header
    });
    if(okTable!==false){
      if((root._tblStyle||0)!==0){
        showToast(vi?'\u2139 Bảng Tiptap dùng kiểu chuẩn trong pilot':'\u2139 Tiptap table uses default style in pilot');
      }
      try{
        if(typeof edApplyGlobalTablePolicy==='function'){
          edApplyGlobalTablePolicy(edGetContentRoot()||document.getElementById('editor-area'), {force:true, source:'insert-table-tiptap'});
        }
      }catch(e){}
      edMarkModified();
      edCloseModal();
      return;
    }
  }
  const sIdx=root._tblStyle||0;
  const s=root._tblStyles[sIdx];
  const colW=Math.floor(100/cols);
  let t='<table style="width:100%;border:1px solid '+s.border+';border-collapse:collapse">';
  if(header){
    t+='<thead><tr>';
    for(let c=0;c<cols;c++) t+='<th style="border:1px solid '+s.border+';padding:8px 12px;background:'+s.headerBg+(s.headerColor?';color:'+s.headerColor:'')+';width:'+colW+'%">'+(vi?'Cột':'Col')+' '+(c+1)+'</th>';
    t+='</tr></thead>';
  }
  t+='<tbody>';
  for(let r=0;r<rows;r++){
    const bg=(s.stripe&&r%2===1)?';background:'+s.stripe:'';
    t+='<tr>';
    for(let c=0;c<cols;c++) t+='<td style="border:1px solid '+s.border+';padding:8px 12px'+bg+'">&nbsp;</td>';
    t+='</tr>';
  }
  t+='</tbody></table><p><br></p>';
  edFocusAndRestore();
  edExecCommand('insertHTML',false,t);
  try{
    if(typeof edApplyGlobalTablePolicy==='function'){
      edApplyGlobalTablePolicy(edGetContentRoot()||document.getElementById('editor-area'), {force:true, source:'insert-table-html'});
    }
  }catch(e){}
  edMarkModified();edCloseModal();
}

function edInsertQuote(){
  edFocusAndRestore();
  edExecCommand('insertHTML',false,'<blockquote>'+(lang!=='en'?'Nhập nội dung trích dẫn...':'Enter quote text...')+'</blockquote>');
  edMarkModified();
}

function edInsertCode(){
  edFocusAndRestore();
  edExecCommand('insertHTML',false,'<pre><code>// code here</code></pre>');
  edMarkModified();
}

// ═══════════════════════════════════════════════════
// SOURCE CODE VIEW
// ═══════════════════════════════════════════════════
function edToggleSource(){
  const area = document.getElementById('editor-area');
  const src = document.getElementById('ed-source');
  const wrap = document.getElementById('ed-page-wrap');
  edSourceMode = !edSourceMode;
  if(edSourceMode){
    // Format HTML nicely - use edCleanHTML to strip UI controls
    let html = edCleanHTML();
    html = html.replace(/>\s*</g,'>\n<');
    src.value = html;
    if(edGetEngineMode()==='tiptap' && window.edTiptapAdapter && typeof window.edTiptapAdapter.destroy==='function'){
      try{window.edTiptapAdapter.destroy(true);}catch(e){}
    }
    wrap.style.display = 'none';
    src.style.display = 'block';
    src.focus();
    edUpdateWordCount();
  } else {
    var rawHtml=src.value||'';
    var safeHtml=rawHtml;
    try{
      safeHtml=_edSanitizeHtmlFragment(rawHtml,{
        forPaste:false,
        stripClasses:false,
        stripIds:false,
        preserveDataAttrs:true
      });
    }catch(e){
      safeHtml=rawHtml;
    }
    var dc=(area.classList.contains('ed-doc-shell')?area.querySelector('.qms-doc #docContent'):null);
    if(dc) dc.innerHTML = safeHtml;
    else area.innerHTML = safeHtml;
    if(safeHtml.trim()!==String(rawHtml).trim()){
      showToast(lang!=='en'?'⚠ Đã loại bỏ đoạn HTML không an toàn':'⚠ Unsafe HTML was removed');
    }
    wrap.style.display = 'flex';
    src.style.display = 'none';
    area.focus();
    edMarkModified();
    edUpdateWordCount();
    // Re-initialize all embedded elements (textboxes, shapes, charts, checklists)
    setTimeout(function(){
      edInitContent();
      edUpdateState();
    },50);
  }
}

// ═══════════════════════════════════════════════════
// FIND & REPLACE
// ═══════════════════════════════════════════════════
let edFindActiveIndex = -1;
let edFindLastKey = '';
let edFindMatchCase = false;
let edFindWholeWord = false;

function edToggleFind(){
  const bar = document.getElementById('ed-find-bar');
  bar.classList.toggle('open');
  if(bar.classList.contains('open')){
    _edUpdateFindOptionUi();
    document.getElementById('ed-find-input').focus();
    if(document.getElementById('ed-find-input').value) edFindInDoc(0,true);
  }
}
function edCloseFind(){
  document.getElementById('ed-find-bar').classList.remove('open');
  edFindActiveIndex = -1;
  edFindLastKey = '';
  _edClearHighlights();
  var cnt=document.getElementById('ed-find-count');if(cnt)cnt.textContent='';
}
function _edClearHighlights(){
  var area=document.getElementById('editor-area');
  area.querySelectorAll('mark.ed-hl').forEach(function(m){
    var parent=m.parentNode;
    while(m.firstChild)parent.insertBefore(m.firstChild,m);
    parent.removeChild(m);
    parent.normalize();
  });
}
function _edEscapeRegExp(text){
  return String(text==null?'':text).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}
function _edGetFindKey(q){
  return [String(q||''),edFindMatchCase?'1':'0',edFindWholeWord?'1':'0'].join('\u0001');
}
function _edBuildFindRegex(q){
  var escaped=_edEscapeRegExp(q);
  var flags='g'+(edFindMatchCase?'':'i')+'u';
  if(edFindWholeWord){
    try{
      return new RegExp('(?<![\\p{L}\\p{N}_])'+escaped+'(?![\\p{L}\\p{N}_])',flags);
    }catch(e){
      return new RegExp('\\b'+escaped+'\\b',flags.replace('u',''));
    }
  }
  try{
    return new RegExp(escaped,flags);
  }catch(e){
    return new RegExp(escaped,flags.replace('u',''));
  }
}
function _edUpdateFindOptionUi(){
  var caseBtn=document.getElementById('ed-find-case');
  var wordBtn=document.getElementById('ed-find-word');
  if(caseBtn){
    caseBtn.classList.toggle('is-active',!!edFindMatchCase);
    caseBtn.setAttribute('aria-pressed',edFindMatchCase?'true':'false');
  }
  if(wordBtn){
    wordBtn.classList.toggle('is-active',!!edFindWholeWord);
    wordBtn.setAttribute('aria-pressed',edFindWholeWord?'true':'false');
  }
}
function _edUpdateFindCount(total,index){
  var cnt=document.getElementById('ed-find-count');
  if(!cnt) return;
  if(!total){
    cnt.textContent='0';
    return;
  }
  cnt.textContent=(index+1)+'/'+total;
}
function _edActivateFindMatch(index,scrollIntoView){
  var area=document.getElementById('editor-area');
  if(!area) return;
  var marks=Array.from(area.querySelectorAll('mark.ed-hl'));
  if(!marks.length){
    edFindActiveIndex=-1;
    _edUpdateFindCount(0,0);
    return;
  }
  var next=((Number(index)||0)%marks.length+marks.length)%marks.length;
  edFindActiveIndex=next;
  marks.forEach(function(mark,i){
    mark.classList.toggle('ed-hl-active',i===next);
    if(i===next){
      mark.style.background='#f59e0b';
      mark.style.color='#111827';
    }else{
      mark.style.background='#fde047';
      mark.style.color='';
    }
  });
  _edUpdateFindCount(marks.length,next);
  if(scrollIntoView && marks[next]){
    marks[next].scrollIntoView({behavior:'smooth',block:'center'});
  }
}
function edToggleFindOption(kind){
  if(kind==='case') edFindMatchCase=!edFindMatchCase;
  else if(kind==='word') edFindWholeWord=!edFindWholeWord;
  _edUpdateFindOptionUi();
  edFindInDoc(0);
}
function edFindPrev(){ edFindInDoc(-1,true); }
function edFindNext(){ edFindInDoc(1,true); }
function edFindInputKeydown(e){
  if(e.key==='Enter'){
    e.preventDefault();
    edFindInDoc(e.shiftKey?-1:1,true);
    return;
  }
  if(e.key==='Escape'){
    e.preventDefault();
    edCloseFind();
    return;
  }
  if(e.altKey && (e.key==='c' || e.key==='C')){
    e.preventDefault();
    edToggleFindOption('case');
    return;
  }
  if(e.altKey && (e.key==='w' || e.key==='W')){
    e.preventDefault();
    edToggleFindOption('word');
  }
}
function edReplaceInputKeydown(e){
  if(e.key==='Enter'){
    e.preventDefault();
    if(e.ctrlKey || e.metaKey) edReplaceAll();
    else edReplaceOne();
    return;
  }
  if(e.key==='Escape'){
    e.preventDefault();
    edCloseFind();
  }
}
function _edWalkTextNodes(root,fn){
  var activeRoot=null;
  try{
    activeRoot=(root && root.querySelector)
      ? (root.querySelector('#docContent[contenteditable="true"]') || root.querySelector('[contenteditable="true"]'))
      : null;
  }catch(e){ activeRoot=null; }
  var tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    var p=n.parentElement;
    if(!p) return NodeFilter.FILTER_REJECT;
    if(p.closest('.ed-sh-text,.ed-tb-content')) return NodeFilter.FILTER_ACCEPT;
    if(p.tagName==='SCRIPT'||p.tagName==='STYLE') return NodeFilter.FILTER_REJECT;
    if(p.closest('svg,.ed-tb-bar,.ed-sh-bar,.ed-ch-bar,.ed-qms-toolbar')) return NodeFilter.FILTER_REJECT;
    var blocked=p.closest('[contenteditable="false"]');
    if(blocked){
      if(!(activeRoot && (blocked===activeRoot || blocked.contains(activeRoot) || activeRoot.contains(blocked)))){
        return NodeFilter.FILTER_REJECT;
      }
    }
    return NodeFilter.FILTER_ACCEPT;
  }});
  var nodes=[];while(tw.nextNode())nodes.push(tw.currentNode);
  nodes.forEach(fn);
}
function edFindInDoc(step,preserveIndex){
  var navStep=(typeof step==='number' && isFinite(step)) ? step : 0;
  var keepIndex=!!preserveIndex;
  var q=document.getElementById('ed-find-input').value;
  var area=document.getElementById('editor-area');
  var prevKey=edFindLastKey;
  var prevIndex=edFindActiveIndex;
  _edClearHighlights();
  if(!q||q.length<1){
    edFindLastKey='';
    edFindActiveIndex=-1;
    document.getElementById('ed-find-count').textContent='';
    return;
  }
  var regex=_edBuildFindRegex(q);
  var count=0;
  _edWalkTextNodes(area,function(textNode){
    var text=textNode.nodeValue;
    var matches=[];var m;
    regex.lastIndex=0;
    while((m=regex.exec(text))!==null){matches.push({start:m.index,end:m.index+m[0].length});count++;}
    if(!matches.length)return;
    var parent=textNode.parentNode;
    var frag=document.createDocumentFragment();
    var lastIdx=0;
    matches.forEach(function(mt){
      if(mt.start>lastIdx)frag.appendChild(document.createTextNode(text.slice(lastIdx,mt.start)));
      var mark=document.createElement('mark');
      mark.className='ed-hl';
      mark.style.cssText='background:#fde047;padding:0 1px;border-radius:2px';
      mark.textContent=text.slice(mt.start,mt.end);
      frag.appendChild(mark);
      lastIdx=mt.end;
    });
    if(lastIdx<text.length)frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    parent.replaceChild(frag,textNode);
  });
  var key=_edGetFindKey(q);
  edFindLastKey=key;
  if(!count){
    edFindActiveIndex=-1;
    _edUpdateFindCount(0,0);
    return;
  }
  var nextIndex=0;
  if(key===prevKey){
    if(navStep!==0) nextIndex=prevIndex+navStep;
    else if(keepIndex && prevIndex>=0) nextIndex=prevIndex;
  }else if(navStep<0){
    nextIndex=count-1;
  }
  _edActivateFindMatch(nextIndex,true);
}
function edReplaceOne(){
  var area=document.getElementById('editor-area');
  var mark=area.querySelector('mark.ed-hl-active') || area.querySelector('mark.ed-hl');
  if(!mark)return;
  var currentIndex=Math.max(0,edFindActiveIndex);
  var replacement=document.getElementById('ed-replace-input').value;
  var textNode=document.createTextNode(replacement);
  mark.parentNode.replaceChild(textNode,mark);
  textNode.parentNode.normalize();
  edMarkModified();
  edFindActiveIndex=currentIndex;
  edFindInDoc(0,true);
}
function edReplaceAll(){
  var q=document.getElementById('ed-find-input').value;
  var r=document.getElementById('ed-replace-input').value;
  if(!q)return;
  var area=document.getElementById('editor-area');
  var marks=area.querySelectorAll('mark.ed-hl');
  if(marks.length===0){edFindInDoc(0,true);marks=area.querySelectorAll('mark.ed-hl');}
  marks.forEach(function(m){
    var textNode=document.createTextNode(r);
    m.parentNode.replaceChild(textNode,m);
    textNode.parentNode.normalize();
  });
  edMarkModified();
  edUpdateWordCount();
  edFindInDoc(0,true);
}

// ═══════════════════════════════════════════════════
// ZOOM
// ═══════════════════════════════════════════════════
function edSetZoom(z){
  edZoom=Math.max(50,Math.min(200,z));
  const page=document.getElementById('editor-area');
  if(edZoom===100){page.style.transform='';page.style.transformOrigin='';}
  else{page.style.transform='scale('+(edZoom/100)+')';page.style.transformOrigin='top center';}
  const label=document.getElementById('ed-zoom-label');
  if(label)label.textContent=edZoom+'%';
  const status=document.getElementById('ed-status-zoom');
  if(status)status.textContent=edZoom+'%';
}

function edPrint(){
  var cleanHtml=edCleanHTML();
  var win=window.open('','_blank');
  win.document.write('<html><head><title>Print</title><style>body{font-family:Segoe UI,sans-serif;padding:40px;line-height:1.8;font-size:14px}h1,h2,h3{color:#1e40af}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}th{background:#f1f5f9}.ed-textbox{border:2px solid #1967d2;border-radius:4px;padding:10px;display:inline-block}.ed-shape{display:inline-block;position:relative}.ed-chart{display:inline-block}@media print{body{padding:0}}</style></head><body>'+cleanHtml+'</body></html>');
  win.document.close();
  win.print();
}

// ═══════════════════════════════════════════════════

