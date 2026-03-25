// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════
function startEdit(code){
  try{
    if(window.edTiptapAdapter && typeof window.edTiptapAdapter.destroy==='function'){
      try{ window.edTiptapAdapter.destroy(true); }catch(_e){}
    }
    const doc=DOCS.find(d=>d.code===code);
    if(!doc||!canEdit(doc)) return;
    // Safety: do not allow editing while Google Translate is active (EN mode)
    // to avoid saving translated DOM back into the Vietnamese master HTML.
    if(lang==='en'){
      showToast(lang==='en'?'↩ Switch to Vietnamese to edit':'↩ Vui lòng chuyển về tiếng Việt để chỉnh sửa');
      try{ setLang('vi'); }catch(e){}
      return;
    }
    editingDoc=code;
    editMode=true;
    edModified=false;
    
    const iframe=document.getElementById('doc-iframe');
    if(!iframe){
      showToast(lang==='en'?'Document not loaded':'Chưa tải tài liệu');
      editMode=false; editingDoc=null;
      return;
    }
    const saved=getEditedHtml(code);
    const recovery=(!saved && typeof edGetRecoveryDraft==='function') ? edGetRecoveryDraft(code) : null;
    
    // Build an editor shell from the currently loaded iframe so edit mode renders
    // the full document (header + correct HTML/CSS context) instead of only docContent.
    var shellHtml=null;
    try{
      var iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if(iframeDoc && iframeDoc.body){
        var bodyClone = iframeDoc.body.cloneNode(true);
        bodyClone.querySelectorAll('script').forEach(function(s){s.remove();});
        bodyClone.querySelectorAll('#goog-gt-tt,.goog-te-banner-frame,#google_translate_element').forEach(function(el){el.remove();});
        // Remove only auto-injected duplicate header; keep original .form-header visible
        bodyClone.querySelectorAll('#auto-header').forEach(function(el){el.remove();});
        // Mark form-header as non-editable so it stays visible but can't be changed
        bodyClone.querySelectorAll('.form-header').forEach(function(el){
          el.setAttribute('contenteditable','false');
          el.style.pointerEvents='none';
          el.style.userSelect='none';
          el.style.opacity='0.85';
        });
        shellHtml = bodyClone.innerHTML;
      }
    }catch(e){ shellHtml=null; }
    
    function _activateEditor(html){
      var safeHtml=String(html==null?'':html);
      try{
        if(typeof _edSanitizeHtmlFragment==='function'){
          safeHtml=_edSanitizeHtmlFragment(safeHtml,{
            forPaste:false,
            stripClasses:false,
            stripIds:false,
            preserveDataAttrs:true
          });
        }
      }catch(e){}
      originalHtml=safeHtml;
      iframe.style.display='none';
      var ec=document.getElementById('editor-container');
      ec.style.display='flex';
      var _ea=document.getElementById('editor-area');
      if(shellHtml){
        // Doc-shell mode: inject full document shell so the editor renders
        // header/graphics exactly like view mode. Also remove the editor
        // paper constraints (handled by .ed-doc-shell CSS).
        _ea.classList.add('ed-doc-shell');
        _ea.innerHTML='<div class="qms-doc">'+shellHtml+'</div>';
        const wrap=_ea.querySelector('.qms-doc');
        const dc=wrap ? wrap.querySelector('#docContent') : null;
        // Don't set contenteditable=false on wrapper - it blocks execCommand on children
        // Instead, use CSS user-select:none and pointer-events:none on non-editable parts
        if(wrap){
          wrap.style.cssText='cursor:default;';
          // Make only shell branches outside the editable content non-editable.
          // Some templates nest #docContent inside a wrapper (.container/.page/...),
          // so locking every direct child except #docContent can accidentally lock
          // the whole editable branch and break typing/find-replace inside tables.
          wrap.querySelectorAll(':scope > *').forEach(el=>{
            if(dc && (el===dc || el.contains(dc))) return;
            el.setAttribute('contenteditable','false');
            el.style.pointerEvents='none';
            el.style.userSelect='none';
          });
        }
        if(dc){
          dc.innerHTML=originalHtml;
          dc.setAttribute('contenteditable','true');
          dc.setAttribute('spellcheck','true');
          dc.style.pointerEvents='auto';
          dc.style.userSelect='auto';
          dc.style.cursor='text';
          dc.style.minHeight='200px';
          // Remove any contenteditable=false from children of docContent
          dc.querySelectorAll('[contenteditable="false"]').forEach(el=>{
            if(
              el.classList.contains('ed-tbl-float-bar') ||
              el.classList.contains('ed-img-wrap') ||
              el.classList.contains('ed-img-resize-wrap') ||
              el.classList.contains('ed-textbox') ||
              el.classList.contains('ed-shape') ||
              el.classList.contains('ed-chart') ||
              el.closest('.ed-textbox,.ed-shape,.ed-chart,.ed-img-resize-wrap')
            ) return;
            el.removeAttribute('contenteditable');
          });
        }else{
          _ea.innerHTML=originalHtml;
        }
      }else{
        _ea.classList.remove('ed-doc-shell');
        _ea.innerHTML=originalHtml;
      }
      try{
        if(typeof edApplyGlobalTablePolicy==='function'){
          var policyRoot = _ea.querySelector('.qms-doc') || _ea.querySelector('#docContent') || _ea;
          edApplyGlobalTablePolicy(policyRoot, {force:true, source:'startEdit'});
        }
      }catch(e){}
      setTimeout(edInitContent,100);
      edSourceMode=false;
      edZoom=100;
      document.getElementById('ed-source').style.display='none';
      document.getElementById('ed-page-wrap').style.display='flex';
      buildEditorToolbar();
      edUpdateWordCount();
      const st=document.getElementById('ed-status-save');
      if(st){st.textContent=(lang==='en'?'Ready':'Sẵn sàng');st.className='';}
      renderWorkflowPanel(doc);
    }
    
    if(saved){
      _activateEditor(saved);
      return;
    }

    // Crash-recovery path (localStorage): offer restore when session draft is gone.
    if(recovery && recovery.html){
      var recStamp='';
      try{
        recStamp=(typeof edFormatRecoveryTime==='function') ? edFormatRecoveryTime(recovery.ts) : '';
      }catch(e){ recStamp=''; }
      var recMsg=(lang==='en')
        ? ('A local recovery draft was found' + (recStamp?(' ('+recStamp+')'):'') + '. Restore now?')
        : ('\u0110\u00e3 ph\u00e1t hi\u1ec7n b\u1ea3n nh\u00e1p kh\u00f4i ph\u1ee5c c\u1ee5c b\u1ed9' + (recStamp?(' ('+recStamp+')'):'') + '. B\u1ea1n c\u00f3 mu\u1ed1n kh\u00f4i ph\u1ee5c ngay kh\u00f4ng?');
      if(confirm(recMsg)){
        try{ setEditedHtml(code, recovery.html); }catch(e){}
        try{
          if(recovery.shell && typeof recovery.shell==='string'){
            edCleanShellHtml = recovery.shell;
          }
        }catch(e){}
        _activateEditor(recovery.html);
        showToast(lang==='en'?'Recovered local draft loaded':'\u0110\u00e3 t\u1ea3i b\u1ea3n nh\u00e1p kh\u00f4i ph\u1ee5c c\u1ee5c b\u1ed9');
        return;
      }
      try{ if(typeof edClearRecoveryDraft==='function') edClearRecoveryDraft(code); }catch(e){}
    }
    
    // Try direct iframe access first
    try{
      var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if(iframeDoc && iframeDoc.body){
        var docContent = iframeDoc.getElementById('docContent');
        if(docContent){
          _activateEditor(docContent.innerHTML);
          return;
        }
        if(iframeDoc.body.innerHTML.length > 100){
          _activateEditor(iframeDoc.body.innerHTML);
          return;
        }
      }
    }catch(e){/* cross-origin */}
    
    // Fallback: use postMessage to request content from iframe
    var _pmTimeout;
    function _onMessage(evt){
      if(evt.data && evt.data.type==='docContent'){
        window.removeEventListener('message', _onMessage);
        clearTimeout(_pmTimeout);
        _activateEditor(evt.data.html);
      }
    }
    window.addEventListener('message', _onMessage);
    try{
      iframe.contentWindow.postMessage('getContent','*');
    }catch(e){}
    
    // Timeout fallback after 1.5s
    _pmTimeout=setTimeout(function(){
      window.removeEventListener('message', _onMessage);
      _activateEditor('<h2>'+doc.title+'</h2><p>'+doc.code+' — '+(lang==='en'?'Edit content here. If the document did not load, please open it first then try editing again.':'Chỉnh sửa nội dung tại đây. Nếu tài liệu chưa tải, hãy mở tài liệu trước rồi nhấn chỉnh sửa lại.')+'</p>');
    },1500);
  }catch(err){
    console.error('startEdit error:', err);
    editMode=false;
    editingDoc=null;
  }
}

// ═══════════════════════════════════════════════════
// DOM INSPECTOR PANEL (Dreamweaver-style)
// ═══════════════════════════════════════════════════
let edDomActive = false;
let edDomSelected = null;
let edDomDragPath = null;

function edDomToggle(){
  const panel = document.getElementById('ed-dom-panel');
  if(!panel) return;
  edDomActive = !edDomActive;
  if(edDomActive){
    // Move panel to editor-container for absolute positioning (outside scroll area)
    var ec = document.getElementById('editor-container');
    if(ec && panel.parentElement !== ec){
      ec.appendChild(panel);
    }
    panel.style.display = 'flex';
    edDomRefresh();
  }else{
    panel.style.display = 'none';
  }
}

function edDomRefresh(){
  const tree = document.getElementById('ed-dom-tree');
  const area = document.getElementById('editor-area');
  if(!tree || !area) return;
  const root = area.querySelector('#docContent') || area;
  tree.innerHTML = edDomBuildTree(root, '', 0);
}

function edDomNodeFromPath(path){
  const area = document.getElementById('editor-area');
  const root = area ? (area.querySelector('#docContent') || area) : null;
  if(!root) return null;
  if(!path) return root;
  const parts = path.split('.').filter(Boolean).map(Number);
  let target = root;
  for(const idx of parts){
    const children = Array.from(target.childNodes).filter(n=>n.nodeType===1 || (n.nodeType===3 && (n.textContent||'').trim()));
    target = children[idx];
    if(!target) return null;
  }
  return target;
}

function edDomBuildTree(node, parentPath, depth){
  if(depth > 8) return '';
  let html = '';
  const indent = depth * 12;
  const BLOCK_TAGS = new Set(['div','p','h1','h2','h3','h4','h5','h6','section','article','table','thead','tbody','tfoot','tr','td','th','ul','ol','li','blockquote','pre','figure','figcaption','details','summary','hr','img','form','fieldset','header','footer','nav','main','aside']);
  const children = Array.from(node.childNodes).filter(c=>c.nodeType===1);
  children.forEach((child, i)=>{
    const path = parentPath ? `${parentPath}.${i}` : `${i}`;
    const tag = child.tagName.toLowerCase();
    if(child.contentEditable === 'false' && !BLOCK_TAGS.has(tag)) return;
    // Only show block-level elements in block view
    if(!BLOCK_TAGS.has(tag) && !child.querySelector('div,p,h1,h2,h3,h4,h5,h6,table,section,ul,ol,img')) return;
    const hasBlockChildren = Array.from(child.children).some(c=>BLOCK_TAGS.has(c.tagName.toLowerCase()));
    const uid = 'dom-'+path.replace(/\./g,'-');
    const collapsed = (depth > 1 && hasBlockChildren);
    // Get preview text
    let preview = '';
    if(tag.match(/^h[1-6]$/)) preview = (child.textContent||'').trim().substring(0,60);
    else if(tag === 'p') preview = (child.textContent||'').trim().substring(0,50);
    else if(tag === 'img') preview = child.alt || child.src.split('/').pop().substring(0,30) || 'image';
    else if(tag === 'table') preview = (child.rows?child.rows.length+' rows':'table');
    else if(tag === 'div' || tag === 'section'){ 
      const cls = child.className && typeof child.className === 'string' ? child.className.split(' ')[0] : '';
      preview = cls ? '.'+cls : (child.textContent||'').trim().substring(0,40);
    }
    else if(tag === 'ul' || tag === 'ol') preview = child.children.length + ' items';
    else if(tag === 'li') preview = (child.textContent||'').trim().substring(0,50);
    else preview = (child.textContent||'').trim().substring(0,40);
    if(preview.length>55) preview=preview.substring(0,55)+'…';
    // Tag color class
    const tagCls = ['h1','h2','h3','h4','h5','h6','p','div','table','ul','ol','img','section'].includes(tag) ? 'tag-'+tag : 'tag-default';
    html += `<div class="dom-node dom-block" draggable="true" style="padding-left:${indent}px" data-dom-path="${path}" onclick="edDomSelect(this,event)" ondblclick="edDomFocus(this)" ondragstart="edDomDragStart(event,this)" ondragover="edDomDragOver(event,this)" ondragleave="edDomDragLeave(event,this)" ondrop="edDomDrop(event,this)" ondragend="edDomDragEnd(event,this)">`;
    html += hasBlockChildren ? `<span class="dom-toggle" onclick="event.stopPropagation();edDomToggleNode(this)" data-uid="${uid}">${collapsed?'\u25B8':'\u25BE'}</span>` : '<span class="dom-toggle" style="width:14px"> </span>';
    html += `<span class="dom-block-tag ${tagCls}">${tag}</span>`;
    html += `<span class="dom-block-preview">${escapeHtml(preview)}</span>`;
    html += `</div>`;
    if(hasBlockChildren){
      html += `<div class="dom-children" id="${uid}" style="${collapsed?'display:none':''}">`;
      html += edDomBuildTree(child, path, depth+1);
      html += `</div>`;
    }
  });
  return html;
}

function edDomToggleNode(toggler){
  const uid = toggler.dataset.uid;
  const el = document.getElementById(uid);
  if(!el) return;
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : '';
  toggler.textContent = visible ? '\u25B8' : '\u25BE';
}

function edDomSelect(nodeEl, event){
  if(event) event.stopPropagation();
  document.querySelectorAll('#ed-dom-tree .dom-node.selected').forEach(n=>n.classList.remove('selected'));
  nodeEl.classList.add('selected');
  const path = nodeEl.dataset.domPath;
  if(path == null) return;
  const target = edDomNodeFromPath(path);
  edDomSelected = target;
  edDomShowProps(target);
  document.querySelectorAll('.ed-dom-highlight').forEach(el=>el.classList.remove('ed-dom-highlight'));
  const area = document.getElementById('editor-area');
  const root = area ? (area.querySelector('#docContent') || area) : null;
  if(target && target.nodeType === 1 && target !== root){
    target.classList.add('ed-dom-highlight');
    target.scrollIntoView({behavior:'smooth', block:'center'});
  }
  edDomUpdateBreadcrumb(target);
}

function edDomDragStart(event,nodeEl){
  edDomDragPath = nodeEl.dataset.domPath || null;
  nodeEl.classList.add('drag-source');
  try{ event.dataTransfer.setData('text/plain', edDomDragPath || ''); }catch(e){}
  event.dataTransfer.effectAllowed='move';
}
function edDomDragOver(event,nodeEl){
  event.preventDefault();
  if(!edDomDragPath || edDomDragPath===nodeEl.dataset.domPath) return;
  const rect=nodeEl.getBoundingClientRect();
  const y=event.clientY-rect.top;
  const ratio=y/Math.max(rect.height,1);
  nodeEl.classList.remove('drag-over-before','drag-over-after','drag-over-inside');
  if(ratio<0.25) nodeEl.classList.add('drag-over-before');
  else if(ratio>0.75) nodeEl.classList.add('drag-over-after');
  else nodeEl.classList.add('drag-over-inside');
  event.dataTransfer.dropEffect='move';
}
function edDomDragLeave(event,nodeEl){
  nodeEl.classList.remove('drag-over-before','drag-over-after','drag-over-inside');
}
function edDomDragEnd(event,nodeEl){
  document.querySelectorAll('#ed-dom-tree .dom-node').forEach(n=>n.classList.remove('drag-source','drag-over-before','drag-over-after','drag-over-inside'));
  edDomDragPath=null;
}
function edDomDrop(event,nodeEl){
  event.preventDefault();
  const sourcePath = edDomDragPath || (event.dataTransfer ? event.dataTransfer.getData('text/plain') : '');
  const targetPath = nodeEl.dataset.domPath || '';
  if(!sourcePath || !targetPath || sourcePath===targetPath) return edDomDragEnd(event,nodeEl);
  const sourceNode = edDomNodeFromPath(sourcePath);
  const targetNode = edDomNodeFromPath(targetPath);
  if(!sourceNode || !targetNode || sourceNode===targetNode) return edDomDragEnd(event,nodeEl);
  if(sourceNode.contains && sourceNode.contains(targetNode)) return edDomDragEnd(event,nodeEl);
  const before=nodeEl.classList.contains('drag-over-before');
  const after=nodeEl.classList.contains('drag-over-after');
  try{
    if(before) targetNode.parentNode.insertBefore(sourceNode, targetNode);
    else if(after) targetNode.parentNode.insertBefore(sourceNode, targetNode.nextSibling);
    else targetNode.appendChild(sourceNode);
    edDomRefresh();
  }finally{ edDomDragEnd(event,nodeEl); }
}

function edDomFocus(nodeEl){
  if(edDomSelected && edDomSelected.nodeType === 1){
    edDomSelected.scrollIntoView({behavior:'smooth', block:'center'});
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(edDomSelected);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function edDomSelectText(nodeEl,event){
  if(event) event.stopPropagation();
  document.querySelectorAll('#ed-dom-tree .dom-node.selected').forEach(n=>n.classList.remove('selected'));
  nodeEl.classList.add('selected');
}

function edDomUpdateBreadcrumb(el){
  const bc = document.getElementById('ed-dom-breadcrumb');
  if(!bc || !el) return;
  const parts = [];
  let cur = el;
  const area = document.getElementById('editor-area');
  while(cur && cur !== area && cur !== document.body){
    const tag = cur.tagName ? cur.tagName.toLowerCase() : '#text';
    const id = cur.id ? '#'+cur.id : '';
    const cls = cur.className && typeof cur.className === 'string' ? '.'+cur.className.trim().split(/\s+/)[0] : '';
    parts.unshift(`<span onclick="edDomJumpTo(this)" title="${tag}${id}${cls}">${tag}${id}</span>`);
    cur = cur.parentNode;
  }
  bc.innerHTML = parts.join(' <span style="color:#45475a">›</span> ');
}

function edDomJumpTo(){}

function edDomShowProps(el){
  const propsDiv = document.getElementById('ed-dom-props');
  if(!propsDiv || !el || el.nodeType !== 1) {
    if(propsDiv) propsDiv.innerHTML = '<div style="color:#6c7086;font-size:10px;text-align:center;padding:10px">Select an element</div>';
    return;
  }
  const tag = el.tagName.toLowerCase();
  const cs = window.getComputedStyle(el);
  
  propsDiv.innerHTML = `
    <div style="font-weight:700;font-size:10px;color:#89b4fa;margin-bottom:6px">${tag}${el.id?'#'+el.id:''} — Properties</div>
    <div class="prop-row"><span class="prop-key">tag</span><div class="prop-val"><input value="${tag}" onchange="edDomChangeTag(this.value)"></div></div>
    <div class="prop-row"><span class="prop-key">id</span><div class="prop-val"><input value="${el.id||''}" onchange="if(edDomSelected)edDomSelected.id=this.value"></div></div>
    <div class="prop-row"><span class="prop-key">class</span><div class="prop-val"><input value="${el.className||''}" onchange="if(edDomSelected)edDomSelected.className=this.value"></div></div>
    <div style="border-top:1px solid #313244;margin:6px 0;padding-top:6px">
      <div style="font-size:9px;color:#6c7086;margin-bottom:4px">Computed Style</div>
      <div class="prop-row"><span class="prop-key">display</span><div class="prop-val"><select onchange="if(edDomSelected)edDomSelected.style.display=this.value">
        ${['','block','inline','inline-block','flex','grid','none','table'].map(v=>`<option ${cs.display===v?'selected':''}>${v||'(auto)'}</option>`).join('')}
      </select></div></div>
      <div class="prop-row"><span class="prop-key">margin</span><div class="prop-val"><input value="${cs.margin}" onchange="if(edDomSelected)edDomSelected.style.margin=this.value"></div></div>
      <div class="prop-row"><span class="prop-key">padding</span><div class="prop-val"><input value="${cs.padding}" onchange="if(edDomSelected)edDomSelected.style.padding=this.value"></div></div>
      <div class="prop-row"><span class="prop-key">width</span><div class="prop-val"><input value="${cs.width}" onchange="if(edDomSelected)edDomSelected.style.width=this.value"></div></div>
      <div class="prop-row"><span class="prop-key">height</span><div class="prop-val"><input value="${cs.height}" onchange="if(edDomSelected)edDomSelected.style.height=this.value"></div></div>
      <div class="prop-row"><span class="prop-key">color</span><div class="prop-val"><input type="color" value="${rgbToHex(cs.color)}" onchange="if(edDomSelected)edDomSelected.style.color=this.value" style="height:22px;padding:0"></div></div>
      <div class="prop-row"><span class="prop-key">bg</span><div class="prop-val"><input type="color" value="${rgbToHex(cs.backgroundColor)}" onchange="if(edDomSelected)edDomSelected.style.backgroundColor=this.value" style="height:22px;padding:0"></div></div>
      <div class="prop-row"><span class="prop-key">font</span><div class="prop-val"><input value="${cs.fontSize} ${cs.fontWeight}" onchange="if(edDomSelected){const p=this.value.split(' ');edDomSelected.style.fontSize=p[0];if(p[1])edDomSelected.style.fontWeight=p[1];}"></div></div>
      <div class="prop-row"><span class="prop-key">border</span><div class="prop-val"><input value="${cs.border}" onchange="if(edDomSelected)edDomSelected.style.border=this.value"></div></div>
    </div>
    <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
      <button onclick="edDomMoveUp()" style="font-size:9px;padding:2px 6px;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;cursor:pointer" title="Move up">↑</button>
      <button onclick="edDomMoveDown()" style="font-size:9px;padding:2px 6px;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;cursor:pointer" title="Move down">↓</button>
      <button onclick="edDomDuplicate()" style="font-size:9px;padding:2px 6px;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;cursor:pointer" title="Duplicate">📋</button>
      <button onclick="edDomDelete()" style="font-size:9px;padding:2px 6px;background:#45171a;border:1px solid #f38ba8;color:#f38ba8;border-radius:4px;cursor:pointer" title="Delete">🗑</button>
      <button onclick="edDomWrap()" style="font-size:9px;padding:2px 6px;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;cursor:pointer" title="Wrap in div">📦 Wrap</button>
    </div>`;
}

function edDomChangeTag(newTag){
  if(!edDomSelected || !newTag) return;
  const newEl = document.createElement(newTag);
  while(edDomSelected.firstChild) newEl.appendChild(edDomSelected.firstChild);
  for(const attr of edDomSelected.attributes) newEl.setAttribute(attr.name, attr.value);
  edDomSelected.parentNode.replaceChild(newEl, edDomSelected);
  edDomSelected = newEl;
  edDomRefresh();
}

function edDomMoveUp(){
  if(!edDomSelected || !edDomSelected.previousElementSibling) return;
  edDomSelected.parentNode.insertBefore(edDomSelected, edDomSelected.previousElementSibling);
  edDomRefresh();
}
function edDomMoveDown(){
  if(!edDomSelected || !edDomSelected.nextElementSibling) return;
  edDomSelected.parentNode.insertBefore(edDomSelected.nextElementSibling, edDomSelected);
  edDomRefresh();
}
function edDomDuplicate(){
  if(!edDomSelected) return;
  const clone = edDomSelected.cloneNode(true);
  edDomSelected.parentNode.insertBefore(clone, edDomSelected.nextSibling);
  edDomRefresh();
}
function edDomDelete(){
  if(!edDomSelected) return;
  if(!confirm(lang==='en'?'Delete this element?':'Xóa phần tử này?')) return;
  edDomSelected.parentNode.removeChild(edDomSelected);
  edDomSelected = null;
  edDomRefresh();
}
function edDomWrap(){
  if(!edDomSelected) return;
  const wrapper = document.createElement('div');
  edDomSelected.parentNode.insertBefore(wrapper, edDomSelected);
  wrapper.appendChild(edDomSelected);
  edDomSelected = wrapper;
  edDomRefresh();
}

function rgbToHex(rgb){
  if(!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';
  const m = rgb.match(/(\d+)/g);
  if(!m || m.length < 3) return '#000000';
  return '#'+(1<<24|m[0]<<16|m[1]<<8|+m[2]).toString(16).slice(1);
}

// ── Unsaved Changes Dialog ──
function showUnsavedDialog(editingCode, targetCode){
  try{ document.querySelectorAll('.unsaved-modal-overlay').forEach(el=>el.remove()); }catch(e){}
  const editDoc = DOCS.find(d=>d.code===editingCode);
  const overlay = document.createElement('div');
  overlay.className = 'unsaved-modal-overlay';
  overlay.id = 'unsaved-modal-overlay';
  overlay.innerHTML = `
    <div class="unsaved-modal">
      <div class="um-header">
        <h3>${lang==='en'?'Unsaved Changes':'Thay đổi chưa lưu'}</h3>
        <p>${lang==='en'?'You have unsaved changes in':'Bạn có thay đổi chưa lưu trong'} <b>${editingCode}</b>${editDoc?' — '+editDoc.title:''}</p>
      </div>
      <div class="um-body">
        <button class="um-btn um-save" onclick="unsavedAction('save','${editingCode}','${targetCode}')">
          <span class="um-icon">💾</span>
          <div>
            <div class="um-label">${lang==='en'?'Save Draft':'Lưu nháp'}</div>
            <div class="um-desc">${lang==='en'?'Save current changes as draft, then navigate':'Lưu thay đổi hiện tại thành bản nháp, rồi chuyển trang'}</div>
          </div>
        </button>
        <button class="um-btn um-discard" onclick="unsavedAction('discard','${editingCode}','${targetCode}')">
          <span class="um-icon">🚫</span>
          <div>
            <div class="um-label">${lang==='en'?'Discard Changes':'Không lưu thay đổi'}</div>
            <div class="um-desc">${lang==='en'?'Discard all unsaved edits and navigate':'Hủy tất cả chỉnh sửa chưa lưu và chuyển trang'}</div>
          </div>
        </button>
        <button class="um-btn um-review" onclick="unsavedAction('review','${editingCode}','${targetCode}')">
          <span class="um-icon">📤</span>
          <div>
            <div class="um-label">${lang==='en'?'Submit for Review':'Gửi xem xét'}</div>
            <div class="um-desc">${lang==='en'?'Submit current changes for approval':'Gửi thay đổi hiện tại để xem xét duyệt'}</div>
          </div>
        </button>
      </div>
      <div class="um-footer">
        <button onclick="closeUnsavedDialog()">${lang==='en'?'Cancel':'Hủy'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) closeUnsavedDialog(); });
}

function closeUnsavedDialog(){
  try{ document.querySelectorAll('.unsaved-modal-overlay').forEach(el=>el.remove()); }catch(e){}
}

async function unsavedAction(action, editingCode, targetCode){
  closeUnsavedDialog();
  try{
    if(action === 'save'){
      // Save draft silently then navigate
      await saveDraftSilent(editingCode);
      cancelEdit();
      if(targetCode && targetCode !== 'null') openDoc(targetCode);
      else { closeDocViewerForce(); }
    } else if(action === 'discard'){
      // Discard changes and navigate
      try{ setEditedHtml(editingCode, ''); }catch(e){}
      cancelEdit();
      if(targetCode && targetCode !== 'null') openDoc(targetCode);
      else { closeDocViewerForce(); }
    } else if(action === 'review'){
      // Open submit for review modal (stay on current doc)
      submitForReview(editingCode);
    }
  }catch(err){
    console.error('unsavedAction error:', err);
    showToast('Error: '+(err&&err.message?err.message:err));
  }
}

// Force close doc viewer without unsaved check
function closeDocViewerForce(){
  editMode=false;
  editingDoc=null;
  currentDoc=null;
  try{ resetDocViewerZoom(); }catch(e){}
  var iframe=document.getElementById('doc-iframe');
  iframe.onload=null;
  iframe.removeAttribute('srcdoc');
  iframe.removeAttribute('src');
  iframe.style.opacity='1';
  document.getElementById('iframe-loading').style.display='none';
  document.getElementById('wf-panel').style.display='none';
  document.getElementById('editor-container').style.display='none';
  document.querySelectorAll('#content > .page').forEach(p=>p.classList.remove('active'));
  navigateTo('documents');
}

// Save draft without prompting for note (silent save for navigation guard)
async function saveDraftSilent(code){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;
    if(lang==='en'){ try{ setLang('vi'); }catch(e){} }
    const innerHtml = _getCurrentEditorInnerHtml();
    const fullHtml = buildFullDocHtmlFromIframe(innerHtml, doc.path);
    const st = getDocState(code) || {};
    const revision = String(st.revision || doc.rev || '0');
    const res = await apiCall('doc_save_draft', {code: code, base_path: doc.path, revision, note: 'Auto-save before navigation', html: fullHtml});
    if(res && res.ok){
      SERVER_DOC_STATE[doc.code] = res.state;
      if(res.versions) setDocVersions(doc.code, res.versions);
      try{ setEditedHtml(code, ''); }catch(e){}
      try{
        if(typeof edMarkSaved==='function'){
          edMarkSaved(lang==='en'?'\u2713 Draft synced':'\u2713 \u0110\u00e3 \u0111\u1ed3ng b\u1ed9 b\u1ea3n nh\u00e1p');
        }
      }catch(e){}
      showToast(lang==='en'?'💾 Draft auto-saved':'💾 Đã tự lưu nháp');
    }
  }catch(err){
    console.error('saveDraftSilent error:', err);
  }
}

// ── Collapsible Property Panel ──
let edPropsCollapsed = false;
function edTogglePropsPanel(){
  edPropsCollapsed = !edPropsCollapsed;
  const propsDiv = document.getElementById('ed-dom-props');
  const toggleDiv = document.getElementById('ed-dom-props-toggle');
  if(propsDiv){
    propsDiv.classList.toggle('collapsed', edPropsCollapsed);
  }
  if(toggleDiv){
    toggleDiv.classList.toggle('collapsed', edPropsCollapsed);
    const arrow = toggleDiv.querySelector('.toggle-arrow');
    if(arrow) arrow.textContent = edPropsCollapsed ? '\u25BC' : '\u25B2';
  }
}

function cancelEdit(){
  var code=editingDoc;
  if(window.edTiptapAdapter && typeof window.edTiptapAdapter.destroy==='function'){
    try{ window.edTiptapAdapter.destroy(true); }catch(_e){}
  }
  editMode=false;
  editingDoc=null;
  edSourceMode=false;
  edModified=false;
  edZoom=100;
  edCleanShellHtml=null;
  edDomActive=false; edDomSelected=null;
  var domPanel=document.getElementById('ed-dom-panel');if(domPanel)domPanel.style.display='none';
  document.querySelectorAll('.ed-dom-highlight').forEach(function(el){el.classList.remove('ed-dom-highlight');});
  // Full cleanup of editor UI state
  var fb=document.getElementById('ed-find-bar');
  if(fb)fb.classList.remove('open');
  edDeselectAllShapes();
  document.querySelectorAll('.ed-tbl-float-bar,.ed-tb-handle,.ed-tb-bar,.ed-ch-handle,.ed-ch-bar').forEach(function(x){x.remove();});
  document.querySelectorAll('.ed-cpick-dd,.ed-special-panel').forEach(function(d){d.classList.remove('open');});
  var popup=document.getElementById('ed-color-popup');if(popup)popup.remove();
  var ctx=document.getElementById('ed-ctx-menu');if(ctx)ctx.remove();
  edDeselectImg();
  edCloseModal();
  clearTimeout(edAutoSaveTimer);
  // Reset zoom on editor-area
  var ea=document.getElementById('editor-area');
  if(ea){ea.style.transform='';ea.style.transformOrigin='';ea.classList.remove('ed-doc-shell');}
  document.getElementById('editor-container').style.display='none';
  if(edFullscreen){edToggleFullscreen();}
  document.getElementById('doc-iframe').style.display='';
  var doc=DOCS.find(function(d){return d.code===code;});
  if(doc){renderWorkflowPanel(doc);renderVersionHistory(doc);}
}

// Build a FULL HTML document for server-side archive/publish.
// We clone the current iframe document (template with header/graphics/styles)
// and only replace #docContent with the edited HTML.
function _getIframeDoc(){
  const iframe=document.getElementById('doc-iframe');
  try{ return iframe ? (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document)) : null; }catch(e){ return null; }
}

function relPrefixForDocPath(docPath){
  try{
    if(!docPath) return '';
    const parts = String(docPath).split('/').filter(Boolean);
    const depth = Math.max(0, parts.length - 1);
    return '../'.repeat(depth);
  }catch(e){ return ''; }
}

function qmsDocAppBridgeUrl(){
  try{
    return new URL('../assets/app.js', window.location.href).href;
  }catch(e){
    return '../assets/app.js';
  }
}

function qmsLooksLikeStrayDocCss(text){
  const s = String(text || '');
  if(!s) return false;
  return /PAGE BREAK\s*&\s*OVERFLOW FIX/i.test(s) ||
    (/@media\s+print/i.test(s) && /\.page-body\s*\{/i.test(s)) ||
    (/\.table-card[^{}]*\{[^}]*overflow-x\s*:\s*auto/i.test(s) && /table\s*\{[^}]*max-width\s*:\s*100%/i.test(s));
}

function qmsNormalizeRecoveredDocCss(text){
  let s = String(text || '');
  if(!s) return '';
  s = s.replace(/<style\b[^>]*>/ig, '');
  s = s.replace(/<\/style>/ig, '');
  s = s.trim();
  return qmsLooksLikeStrayDocCss(s) ? s : '';
}

function qmsCollectLeadingBrokenStyleNodes(container){
  const nodes = [];
  if(!container) return nodes;
  const pending = [];
  let started = false;
  for(let node = container.firstChild; node; node = node.nextSibling){
    const type = node.nodeType;
    if(type !== 3 && type !== 8) break;
    const text = String(node.nodeValue || '');
    if(!started){
      if(/^\s*$/.test(text)){
        pending.push(node);
        continue;
      }
      if(qmsLooksLikeStrayDocCss(text) || /<\/style>/i.test(text)){
        started = true;
        nodes.push.apply(nodes, pending);
        nodes.push(node);
        continue;
      }
      break;
    }
    if(/^\s*$/.test(text) || qmsLooksLikeStrayDocCss(text) || /<\/style>/i.test(text) || /[{};@]/.test(text)){
      nodes.push(node);
      continue;
    }
    break;
  }
  return started ? nodes : [];
}

function repairBrokenDocStyleArtifacts(docOrRoot){
  try{
    const isDoc = !!(docOrRoot && docOrRoot.nodeType === 9);
    const root = isDoc ? docOrRoot.documentElement : docOrRoot;
    if(!root || !root.querySelector) return false;
    const ownerDoc = isDoc ? docOrRoot : (root.ownerDocument || document);
    const head = isDoc ? docOrRoot.head : root.querySelector('head');
    const body = isDoc ? docOrRoot.body : root.querySelector('body');
    if(!head || !body) return false;

    let removed = false;
    const recoveredParts = [];
    [head, body].forEach(function(container){
      const nodes = qmsCollectLeadingBrokenStyleNodes(container);
      if(!nodes.length) return;
      let chunk = '';
      nodes.forEach(function(node){
        chunk += String(node.nodeValue || '') + '\n';
      });
      if(chunk.trim()) recoveredParts.push(chunk);
      nodes.forEach(function(node){
        if(node.parentNode) node.parentNode.removeChild(node);
      });
      removed = true;
    });

    const recoveredCss = qmsNormalizeRecoveredDocCss(recoveredParts.join('\n'));
    if(!recoveredCss) return removed;

    let styleNode = Array.from(head.querySelectorAll('style')).find(function(el){
      return qmsLooksLikeStrayDocCss(el.textContent || '');
    });
    if(styleNode){
      const current = String(styleNode.textContent || '').trim();
      if(current.indexOf(recoveredCss) === -1){
        styleNode.textContent = current ? (current.replace(/\s+$/, '') + '\n' + recoveredCss + '\n') : ('\n' + recoveredCss + '\n');
      }
    }else{
      styleNode = ownerDoc.createElement('style');
      styleNode.setAttribute('data-qms-recovered-style', '1');
      styleNode.textContent = '\n' + recoveredCss + '\n';
      head.appendChild(styleNode);
    }
    return true;
  }catch(e){
    return false;
  }
}

function ensureIframeDocLanguageBridge(iframe){
  return new Promise(function(resolve){
    try{
      const idoc = iframe ? (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document)) : null;
      const iwin = iframe ? iframe.contentWindow : null;
      if(!idoc || !iwin){
        resolve(false);
        return;
      }
      try{ repairBrokenDocStyleArtifacts(idoc); }catch(_e){}
      if(iwin.HesemApp && typeof iwin.HesemApp.applyDocumentLanguage==='function'){
        resolve(true);
        return;
      }
      var existing = idoc.querySelector('script[data-qms-portal-bridge="1"], script[src*="/assets/app.js"], script[src*="assets/app.js"]');
      var done = false;
      function finish(ok){
        if(done) return;
        done = true;
        resolve(!!ok);
      }
      function checkReady(){
        return !!(iwin.HesemApp && typeof iwin.HesemApp.applyDocumentLanguage==='function');
      }
      if(existing){
        if(checkReady()){
          finish(true);
          return;
        }
        existing.addEventListener('load', function(){ finish(checkReady()); }, { once:true });
        existing.addEventListener('error', function(){ finish(false); }, { once:true });
        setTimeout(function(){ finish(checkReady()); }, 2500);
        return;
      }
      var script = idoc.createElement('script');
      script.src = qmsDocAppBridgeUrl();
      script.async = true;
      script.defer = true;
      script.setAttribute('data-qms-portal-bridge', '1');
      script.onload = function(){ finish(checkReady()); };
      script.onerror = function(){ finish(false); };
      (idoc.body || idoc.documentElement || idoc.head).appendChild(script);
      setTimeout(function(){ finish(checkReady()); }, 3000);
    }catch(e){
      resolve(false);
    }
  });
}

function syncIframeDocumentLanguage(iframe, targetLang){
  return ensureIframeDocLanguageBridge(iframe).then(function(ready){
    try{
      const iwin = iframe && iframe.contentWindow;
      if(iwin && ready && iwin.HesemApp && typeof iwin.HesemApp.applyDocumentLanguage==='function'){
        return Promise.resolve(iwin.HesemApp.applyDocumentLanguage(targetLang)).then(function(){
          return true;
        }).catch(function(){
          try{ iwin.postMessage({type:'setLang',lang:targetLang},'*'); }catch(_e){}
          return false;
        });
      }
      if(iwin){
        try{ iwin.postMessage({type:'setLang',lang:targetLang},'*'); }catch(_e){}
      }
    }catch(e){}
    return false;
  }).catch(function(){
    try{
      if(iframe && iframe.contentWindow){
        iframe.contentWindow.postMessage({type:'setLang',lang:targetLang},'*');
      }
    }catch(_e){}
    return false;
  });
}

function scheduleIframeDocumentLanguageSync(iframe, targetLang){
  if(!iframe) return Promise.resolve(false);
  const normalizedLang = targetLang === 'en' ? 'en' : 'vi';
  const syncToken = String(Date.now()) + ':' + Math.random().toString(36).slice(2);
  const retryDelays = normalizedLang === 'en' ? [0, 400, 1200, 2600, 5200] : [0, 180];
  iframe.__qmsLangSyncToken = syncToken;
  let chain = Promise.resolve(false);
  retryDelays.forEach(function(delay){
    chain = chain.then(function(lastResult){
      return new Promise(function(resolve){
        function runSync(){
          if(!iframe || iframe.__qmsLangSyncToken !== syncToken){
            resolve(lastResult);
            return;
          }
          syncIframeDocumentLanguage(iframe, normalizedLang).then(function(result){
            resolve(!!result || lastResult);
          }).catch(function(){
            resolve(lastResult);
          });
        }
        if(delay > 0) setTimeout(runSync, delay);
        else runSync();
      });
    });
  });
  return chain;
}

function ensureDocHtmlHasLanguageBridge(clone, docPath){
  try{
    if(!clone) return;
    if(clone.querySelector('script[src*="/assets/app.js"], script[src*="assets/app.js"]')) return;
    const body = clone.querySelector('body') || clone;
    if(!body) return;
    const script = clone.ownerDocument.createElement('script');
    script.setAttribute('src', relPrefixForDocPath(docPath) + 'assets/app.js');
    body.appendChild(script);
  }catch(e){}
}

function _sanitizeEditorHtml(raw){
  var html=String(raw==null?'':raw);
  try{
    if(typeof _edSanitizeHtmlFragment==='function'){
      html=_edSanitizeHtmlFragment(html,{
        forPaste:false,
        stripClasses:false,
        stripIds:false,
        preserveDataAttrs:true
      });
    }
  }catch(e){}
  return html;
}

function _getCurrentEditorInnerHtml(){
  // Source mode edits are not reflected in editor DOM yet.
  if(editMode && edSourceMode){
    var src=document.getElementById('ed-source');
    if(src) return _sanitizeEditorHtml(src.value||'');
  }
  var innerHtml='';
  try{ innerHtml = edCleanHTML(); }catch(e){ innerHtml=''; }
  if(!innerHtml || innerHtml.trim().length<1){
    try{
      var ea=document.getElementById('editor-area');
      if(ea){
        var contentRoot = ea.querySelector('#docContent') || ea.querySelector('.doc-content') || ea;
        innerHtml = contentRoot.innerHTML || ea.innerHTML || '';
      }
    }catch(_e){ innerHtml=''; }
  }
  return _sanitizeEditorHtml(innerHtml);
}

function buildFullDocHtmlFromIframe(editedInnerHtml, docPath){
  var safeInnerHtml=_sanitizeEditorHtml(editedInnerHtml);
  try{
    const idoc=_getIframeDoc();
    if(idoc && idoc.documentElement){
      const clone=idoc.documentElement.cloneNode(true);
      const dc=clone.querySelector('#docContent');
      if(dc) dc.innerHTML=safeInnerHtml;
      else {
        const body=clone.querySelector('body');
        if(body) body.innerHTML=safeInnerHtml;
      }

      // ALSO preserve edits that happen outside #docContent in doc-shell mode.
      // Typical case: tables in annex/backmatter blocks where users adjust
      // column widths. Those widths must survive Draft -> InReview -> Approved.
      try{
        if(edCleanShellHtml && typeof edCleanShellHtml==='string'){
          const tmp=document.createElement('div');
          let shellSafe=edCleanShellHtml;
          try{
            if(typeof _edSanitizeHtmlFragment==='function'){
              shellSafe=_edSanitizeHtmlFragment(shellSafe,{
                forPaste:false,
                stripClasses:false,
                stripIds:false,
                preserveDataAttrs:true
              });
            }
          }catch(e){}
          tmp.innerHTML = shellSafe;

          // Sync annex blocks (if any)
          const newAnnex = tmp.querySelectorAll('.annex-block');
          const oldAnnex = clone.querySelectorAll('.annex-block');
          const n = Math.min(newAnnex.length, oldAnnex.length);
          for(let i=0;i<n;i++){
            oldAnnex[i].replaceWith(newAnnex[i].cloneNode(true));
          }

          // If the template has no annex-block but the edited shell does, append them
          if(oldAnnex.length===0 && newAnnex.length>0){
            const body = clone.querySelector('body');
            if(body){
              const firstScript = body.querySelector('script');
              newAnnex.forEach(function(el){
                body.insertBefore(el.cloneNode(true), firstScript);
              });
            }
          }
        }
      }catch(_e){}

      // Enforce global table auto-fit before serializing the final HTML.
      try{
        if(typeof edApplyGlobalTablePolicy==='function'){
          edApplyGlobalTablePolicy(clone, {force:true, source:'build-full'});
        }
      }catch(_e){}

      repairBrokenDocStyleArtifacts(clone);
      ensureDocHtmlHasLanguageBridge(clone, docPath);

      return '<!DOCTYPE html>\n'+clone.outerHTML;
    }
  }catch(e){}

  // Minimal fallback (should rarely happen)
    const rel = relPrefixForDocPath(docPath);
  return '<!DOCTYPE html><html lang="'+(lang==='en'?'en':'vi')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="../assets/style.css"></head><body><div class="doc-content" id="docContent">'+safeInnerHtml+'</div><script src="'+rel+'assets/app.js"><\/script></body></html>';
}

function getIframeFullHtml(){
  try{
    const idoc=_getIframeDoc();
    if(idoc && idoc.documentElement) return '<!DOCTYPE html>\n'+idoc.documentElement.outerHTML;
  }catch(e){}
  return null;
}

async function saveDraft(code){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;

    
    // Prevent saving while viewing translated EN to avoid capturing translated header/UI into master HTML
    if(lang==='en'){
      showToast(lang==='en'?'↩ Switch to Vietnamese to save':'↩ Vui lòng chuyển về tiếng Việt trước khi lưu');
      try{ setLang('vi'); }catch(e){}
      return;
    }
const innerHtml = _getCurrentEditorInnerHtml();
    const note = prompt(T('wf_note_label'),'');
    if(note===null) return;

    const fullHtml = buildFullDocHtmlFromIframe(innerHtml, doc.path);

    // IMPORTANT: do NOT auto-bump revision on every draft save.
    // The target revision should be decided when starting a new revision (major/minor),
    // and then drafts overwrite the same *_DRAFT.html file for that target revision.
    const st = getDocState(code) || {};
    const revision = String(st.revision || doc.rev || '0');

    const res = await apiCall('doc_save_draft', {code: code, base_path: doc.path, revision, note: note||'', html: fullHtml});
    if(res && res.ok){
      SERVER_DOC_STATE[doc.code] = res.state;
      if(res.versions) setDocVersions(doc.code, res.versions);
      try{ setEditedHtml(code, ''); }catch(e){}
      try{
        if(typeof edMarkSaved==='function'){
          edMarkSaved(lang==='en'?('\u2713 Draft saved \u2014 v'+revision):('\u2713 \u0110\u00e3 l\u01b0u nh\u00e1p \u2014 v'+revision));
        }
      }catch(e){}
      showToast(lang==='en'?'💾 Draft saved — v'+revision:'💾 Đã lưu nháp — v'+revision);
      // refresh workflow panel/DCR record in preview
      try{ renderWorkflowPanel(doc); }catch(e){}
      try{ renderVersionHistory(doc); }catch(e){}
    }else{
      if(res && res.error==='approve_revision_mismatch'){
        const exp = String(res.expected_revision||'').trim();
        const got = String(res.received_revision||'').trim();
        showToast('⚠ ' + (lang==='en'
          ? `Revision mismatch. Server expects v${exp} but received v${got}. Please reload and approve again.`
          : `Lệch phiên bản. Server yêu cầu v${exp} nhưng nhận v${got}. Vui lòng tải lại và duyệt lại.`));
        try{ await openDocPreview(doc.code); }catch(e){}
        return;
      }
      showToast('\u26A0 '+((res&&res.error)?res.error:'server_error'));
    }
  }catch(err){
    console.error('saveDraft error:', err);
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}


function submitForReview(code){
  try{
    const doc=DOCS.find(d=>d.code===code);
    if(!doc) return;
    if(typeof isDownloadOnlyDoc==='function' && isDownloadOnlyDoc(doc)){
      submitWorkbookForReview(code);
      return;
    }

    
    // Prevent submit while viewing translated EN to avoid capturing translated header/UI into archive HTML
    if(lang==='en'){
      showToast(lang==='en'?'↩ Switch to Vietnamese to submit':'↩ Vui lòng chuyển về tiếng Việt trước khi gửi xem xét');
      try{ setLang('vi'); }catch(e){}
      return;
    }
// Ensure source-mode edits are applied to the editor DOM before submitting
    if(editMode && edSourceMode){
      const raw=document.getElementById('ed-source').value||'';
      let html=raw;
      try{
        if(typeof _edSanitizeHtmlFragment==='function'){
          html=_edSanitizeHtmlFragment(raw,{
            forPaste:false,
            stripClasses:false,
            stripIds:false,
            preserveDataAttrs:true
          });
        }
      }catch(e){ html=raw; }
      const ea=document.getElementById('editor-area');
      const dc=(ea && ea.classList.contains('ed-doc-shell')) ? ea.querySelector('.qms-doc #docContent') : null;
      if(dc) dc.innerHTML=html;
      else if(ea) ea.innerHTML=html;
      edSourceMode=false;
    }

    const state=getDocState(code)||{status:'draft',revision:doc.rev||'0'};
    const currentRev=state.revision||'0';

    // Use latest RELEASED revision as the "from" version in the submit modal.
    // This avoids showing a misleading revision jump when the current draft is already the current revision
    // based on a released v0.
    const versions=getDocVersions(code)||[];
    let released=null;
    for(const v of versions){
      if(v && (v.status==='approved' || v.status==='initial_release')){ released=v; break; }
    }
    const baseRev=(released && released.version)? released.version : currentRev;

    const parts=String(baseRev).split('.');
    const baseMajor=parseInt(parts[0])||0;
    const baseMinor=parseInt(parts[1])||0;
    const majorPreview=(baseMajor+1)+'.0';
    const minorPreview=baseMajor+'.'+(baseMinor+1);

    // Infer update type from the current draft revision (when it matches).
    let inferredType=null;
    if(String(currentRev)===String(majorPreview)) inferredType='major';
    else if(String(currentRev)===String(minorPreview)) inferredType='minor';

    const submitDate=now();

    // Build the submit modal
    const overlay=document.createElement('div');
    overlay.className='submit-modal-overlay';
    overlay.id='submit-modal-overlay';
    overlay.innerHTML=`
      <div class="submit-modal">
        <div class="sm-header">
          <h3>${T('sm_title')}</h3>
          <p>${T('sm_subtitle')}</p>
        </div>
        <div class="sm-body">
          <div class="sm-submitter">
            <div class="sm-avatar">${currentUser.avatar||'👤'}</div>
            <div class="sm-info">
              <div class="sm-name">${currentUser.name}</div>
              <div class="sm-role">${ROLES[currentUser.role]?(lang==='en'?ROLES[currentUser.role].labelEn||ROLES[currentUser.role].label:ROLES[currentUser.role].label):currentUser.role}</div>
              <div class="sm-date">📅 ${T('sm_submit_date')}: ${submitDate}</div>
            </div>
          </div>

          <div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:8px">${T('sm_update_type')} <span style="color:#dc2626">*</span></div>
          <div class="sm-type-grid">
            <div class="sm-type-card" id="sm-card-minor" onclick="selectSubmitType('minor')">
              <div class="sm-check" id="sm-check-minor"></div>
              <div class="sm-type-icon">📝</div>
              <div class="sm-type-title">${T('sm_minor')}</div>
              <div class="sm-type-ver">v${baseRev} → v${minorPreview}</div>
              <div class="sm-type-desc">${T('sm_minor_desc')}</div>
              <div class="sm-type-examples">${T('sm_minor_examples')}</div>
            </div>
            <div class="sm-type-card" id="sm-card-major" onclick="selectSubmitType('major')">
              <div class="sm-check" id="sm-check-major"></div>
              <div class="sm-type-icon">🔄</div>
              <div class="sm-type-title">${T('sm_major')}</div>
              <div class="sm-type-ver">v${baseRev} → v${majorPreview}</div>
              <div class="sm-type-desc">${T('sm_major_desc')}</div>
              <div class="sm-type-examples">${T('sm_major_examples')}</div>
            </div>
          </div>

          <div class="sm-note">
            <label>${T('sm_note_label')}</label>
            <textarea id="sm-change-note" placeholder="${T('sm_note_placeholder')}"></textarea>
          </div>
        </div>
        <div class="sm-footer">
          <button class="sm-cancel" onclick="closeSubmitModal()">${T('sm_cancel')}</button>
          <button class="sm-submit" id="sm-submit-btn" disabled onclick="confirmSubmitForReview('${code}')">${T('sm_submit_btn')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Lock selection when the draft revision already implies the update type.
    _submitTypeLock = inferredType || null;
    if(inferredType){
      const minorCard=document.getElementById('sm-card-minor');
      const majorCard=document.getElementById('sm-card-major');
      if(inferredType==='major' && minorCard) minorCard.classList.add('disabled');
      if(inferredType==='minor' && majorCard) majorCard.classList.add('disabled');
      try{ selectSubmitType(inferredType); }catch(e){}
    }

    overlay.addEventListener('click',e=>{if(e.target===overlay)closeSubmitModal();});

  }catch(err){
    console.error('submitForReview error:', err);
    showToast('Error: '+err.message);
  }
}

async function uploadFormDraft(code){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;
    const state = getDocState(code) || {revision:doc.rev||'0', status:'draft'};
    if(state.status === 'approved'){
      showToast(lang==='en'?'Start a new revision first':'Hãy bắt đầu phiên bản mới trước');
      return;
    }
    const revision = String(state.revision || doc.rev || '0');
    const note = prompt(
      lang==='en'
        ? `Upload workbook draft for ${doc.code} (v${revision})\n\nAdd a short check-in comment:`
        : `Upload workbook nháp cho ${doc.code} (v${revision})\n\nNhập ghi chú check-in ngắn:`,
      ''
    );
    if(note === null) return;
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.xlsx,.xlsm,.xls,.csv';
    picker.style.display = 'none';
    picker.onchange = async function(){
      try{
        const file = picker.files && picker.files[0];
        if(!file) return;
        const fd = new FormData();
        fd.append('code', doc.code);
        fd.append('base_path', doc.path);
        fd.append('revision', revision);
        fd.append('note', note || '');
        fd.append('file', file, file.name);
        showToast(lang==='en'?'Uploading workbook draft...':'Đang upload workbook nháp...');
        const res = await apiCallFormData('form_upload_draft', fd, 180000);
        if(res && res.ok){
          if(res.state) setDocState(code, res.state);
          if(res.versions) setDocVersions(code, res.versions);
          showToast(lang==='en'?'✅ Workbook draft uploaded':'✅ Đã upload workbook nháp');
          await openDocPreview(code);
          return;
        }
        showToast('\u26A0 ' + ((res && (res.detail || res.error)) ? (res.detail || res.error) : 'upload_failed'));
      }catch(err){
        console.error('uploadFormDraft error:', err);
        showToast('Error: '+(err && err.message ? err.message : err));
      }finally{
        setTimeout(()=>{ try{ picker.remove(); }catch(e){} }, 0);
      }
    };
    document.body.appendChild(picker);
    picker.click();
  }catch(err){
    console.error('uploadFormDraft error:', err);
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}

async function submitWorkbookForReview(code){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;
    const state = getDocState(code) || {status:'draft', revision:doc.rev||'0'};
    const revision = String(state.revision || doc.rev || '0');
    const versions = getDocVersions(code) || [];
    const hasDraftUpload = versions.some(v=>v && v.status==='draft' && String(v.version||'').replace(/^v/i,'')===revision && versionHasAccess(doc, v));
    if(!hasDraftUpload){
      showToast(lang==='en'?'Upload a draft workbook first':'Hãy upload workbook nháp trước');
      return;
    }
    const note = prompt(
      lang==='en'
        ? `Submit workbook ${doc.code} v${revision} for review\n\nChange note:`
        : `Gửi workbook ${doc.code} v${revision} để xem xét\n\nGhi chú thay đổi:`,
      ''
    );
    if(note === null) return;
    const updateType = String(state.updateType || 'minor') === 'major' ? 'major' : 'minor';
    const res = await apiCall('doc_submit_review', {code: doc.code, base_path: doc.path, revision, updateType, note: note || ''});
    if(res && res.ok){
      if(res.state) setDocState(code, res.state);
      if(res.versions) setDocVersions(code, res.versions);
      showToast(lang==='en'?'📤 Workbook submitted for review':'📤 Đã gửi workbook để xem xét');
      await openDocPreview(code);
      return;
    }
    showToast('\u26A0 ' + ((res && (res.detail || res.error)) ? (res.detail || res.error) : 'submit_failed'));
  }catch(err){
    console.error('submitWorkbookForReview error:', err);
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}

let _selectedSubmitType=null;
let _submitTypeLock=null;

function selectSubmitType(type){
  if(_submitTypeLock && type!==_submitTypeLock) return;
  _selectedSubmitType=type;
  const minorCard=document.getElementById('sm-card-minor');
  const majorCard=document.getElementById('sm-card-major');
  const minorCheck=document.getElementById('sm-check-minor');
  const majorCheck=document.getElementById('sm-check-major');
  minorCard.classList.toggle('selected', type==='minor');
  majorCard.classList.toggle('selected', type==='major');
  minorCheck.textContent=type==='minor'?'✓':'';
  majorCheck.textContent=type==='major'?'✓':'';
  document.getElementById('sm-submit-btn').disabled=false;
}

function closeSubmitModal(){
  const overlay=document.getElementById('submit-modal-overlay');
  if(overlay) overlay.remove();
  _selectedSubmitType=null;
}

async function confirmSubmitForReview(code){
  try{
    if(!_selectedSubmitType){
      showToast(T('sm_select_type'));
      return;
    }
    const doc=DOCS.find(d=>d.code===code);
    if(!doc) return;

    const changeNote=(document.getElementById('sm-change-note')||{}).value||'';
    const updateType=_selectedSubmitType; // 'minor' or 'major'
    closeSubmitModal();

    // Get the latest edited HTML from editor/source mode and sanitize before submit
    let innerHtml = '';
    try{ innerHtml = _getCurrentEditorInnerHtml(); }catch(e){ console.warn('editor html capture error:', e); }

    let fullHtml = '';
    try{ fullHtml = buildFullDocHtmlFromIframe(innerHtml, doc.path); }catch(e){ console.warn('buildFullDocHtml error:', e); }
    
    // Final validation
    if(!fullHtml || fullHtml.trim().length < 30){
      showToast(lang==='en'?'⚠ Cannot capture document content. Please try saving draft first.':'⚠ Không thể lấy nội dung tài liệu. Hãy thử lưu nháp trước.');
      return;
    }

    const st=getDocState(code)||{status:'draft',revision:doc.rev||'0'};
    const rev = st.revision || doc.rev || '0';

    const res = await apiCall('doc_submit_review', {code: code, base_path: doc.path, revision: rev, updateType: updateType, note: changeNote||'', html: fullHtml});
    if(res && res.ok){
      if(res.state) setDocState(code, res.state);
      if(res.versions) setDocVersions(code, res.versions);
      try{ setEditedHtml(code, ''); }catch(e){}
      edModified=false;
      edCleanShellHtml=null;

      // Exit edit mode
      editMode=false;
      editingDoc=null;
      edFullscreen=false;
      document.getElementById('editor-container').style.display='none';
      document.getElementById('editor-container').classList.remove('ed-fullscreen');
      document.getElementById('doc-iframe').style.display='';

      loadDocContent(code);

      const toastType=updateType==='major'?'🔄 MAJOR':'📝 MINOR';
      showToast(lang==='en'?'📤 Submitted for review ('+toastType+')':'📤 Đã gửi xem xét ('+toastType+')');
      renderWorkflowPanel(doc);
      renderVersionHistory(doc);
      updateDocViewerHeader(doc);
      return;
    }

    // Show specific server error if available
    const errMsg = (res && res.error) ? res.error : (lang==='en'?'Submit failed':'Gửi xem xét thất bại');
    showToast('\u26A0 ' + errMsg);
  }catch(err){
    console.error('confirmSubmitForReview error:', err);
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}

async function approveDoc(code){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;

    const state = getDocState(code) || {status:'draft', revision: doc.rev||'0'};
    const updateType = state.updateType || (state.submittedUpdateType||'minor');
    const versions = (typeof getDocVersions==='function') ? (getDocVersions(code)||[]) : [];
    const reviewEntry = versions.find(v=>v && v.status==='in_review')
      || versions.find(v=>v && v.status==='pending_approval')
      || versions.find(v=>v && v.status==='draft');
    const reviewRev = reviewEntry ? String(reviewEntry.version||'').replace(/^v/i,'').trim() : '';
    const currentRev = String(reviewRev || state.revision || doc.rev || '0');
    const prevRev = String(state.released_revision || doc.rev || '0');

    // IMPORTANT: do NOT bump revision here.
    // The revision to approve is the current state.revision (set when starting a new revision / submitting for review).
    const newRevision = currentRev;

    const isInitial = (state.has_release === false);

    const msg = isInitial
      ? (lang==='en'
          ? `Approve INITIAL RELEASE (v${newRevision})?`
          : `Duyệt PHÁT HÀNH LẦN ĐẦU (v${newRevision})?`)
      : (lang==='en'
          ? `Approve ${doc.code}\n\n${prevRev===newRevision?`v${newRevision}`:`v${prevRev} → v${newRevision}`}\nType: ${String(updateType||'').toUpperCase()}`
          : `Duyệt ${doc.code}\n\n${prevRev===newRevision?`v${newRevision}`:`v${prevRev} → v${newRevision}`}\nLoại: ${String(updateType||'').toUpperCase()}`);

    if(!confirm(msg)) return;

    const res = await apiCall('doc_approve', {
      code: doc.code,
      base_path: doc.path,
      prevRevision: prevRev,
      newRevision: newRevision,
      updateType: updateType
    });

    if(res && res.ok){
      SERVER_DOC_STATE[doc.code] = res.state;
      if(res.versions) setDocVersions(doc.code, res.versions);
      showToast(lang==='en'?'✅ Approved':'✅ Đã duyệt');

      // Refresh the preview + lists
      await openDocPreview(doc.code);
      renderDocuments();
      renderSidebar();
    }else{
      showToast('\u26A0 '+((res&&res.error)?res.error:'server_error'));
    }
  }catch(err){
    console.error('approveDoc error:', err);
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}


async function rejectDoc(code){
  try{
    const reason=prompt(T('wf_confirm_reject'));
    if(reason===null) return;
    const doc=DOCS.find(d=>d.code===code);
    if(!doc) return;

    const res = await apiCall('doc_reject', {code: code, base_path: doc.path, reason: reason||''});
    if(res && res.ok){
      if(res.state) setDocState(code, res.state);
      // Reload versions/state from server to keep folder-sync
      await refreshDocFromServer(code);
      showToast(lang==='en'?'↩ Rejected — returned to author':'↩ Đã trả lại — về tác giả');
      renderWorkflowPanel(doc);
      renderVersionHistory(doc);
      updateDocViewerHeader(doc);
      loadDocContent(code);
      refreshAllDocStatesFromServer().then(()=>{ try{ renderSidebar(); }catch(e){} });
      return;
    }
    showToast(lang==='en'?'Reject failed':'Trả lại thất bại');
  }catch(err){
    console.error('rejectDoc error:', err);
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}

async function restoreVersion(code, idx){
  const doc=DOCS.find(d=>d.code===code);
  if(!doc) return;
  if(typeof isDownloadOnlyDoc==='function' && isDownloadOnlyDoc(doc)){
    showToast(lang==='en'?'Restore to draft is not available for workbook versions. Start a new revision and upload a workbook draft instead.':'Khôi phục thành nháp chưa áp dụng cho workbook. Hãy bắt đầu phiên bản mới rồi upload workbook nháp.');
    return;
  }
  const versions=getDocVersions(code);
  const v=versions[idx];
  const url = getVersionAccessUrl(doc, v);
  if(!v || !url) return;

  const msg = lang==='en'
    ? ('Restore ' + (v.version||'this version') + ' as a NEW draft?')
    : ('Khôi phục ' + (v.version||'phiên bản này') + ' thành bản nháp MỚI?');
  if(!confirm(msg)) return;

  try{
    // Fetch the full HTML file of the selected version
    const html = await fetch(url + (url.indexOf('?')>=0 ? '&' : '?') + 't=' + Date.now(), {credentials:'include'}).then(r=>r.text());
    const rev = (v.version||'v0').replace(/^v/i,'') || '0';
    const note = (lang==='en'?'Restored from ':'Khôi phục từ ') + (v.version||'');

    const res = await apiCall('doc_save_draft', {code: code, base_path: doc.path, revision: rev, note: note, html: html});
    if(res && res.ok){
      if(res.state) setDocState(code, res.state);
      if(res.versions) setDocVersions(code, res.versions);
      try{ setEditedHtml(code, ''); }catch(e){}
      edCleanShellHtml=null;
      showToast(lang==='en'?'↩ Restored as draft':'↩ Đã khôi phục thành bản nháp');
      openDoc(code);
      return;
    }
  }catch(err){
    console.error('restoreVersion error:', err);
  }

  showToast(lang==='en'?'Restore failed':'Khôi phục thất bại');
}

// Pick the best file to show in the iframe:
// - Approved/current: live file in main folders (doc.path)
// - Draft / In Review: working copy stored as an independent file inside /archive
function getLatestWorkingFile(code){
  try{
    const versions=getDocVersions(code)||[];
    for(let i=0;i<versions.length;i++){
      const v=versions[i];
      if(!v) continue;
      if((v.status==='in_review' || v.status==='draft' || v.status==='pending_approval') && v.file){
        return v.file;
      }
    }
  }catch(e){}
  return null;
}

function getDocViewFile(doc){
  if(!doc) return null;
  const code=doc.code;
  const st=getDocState(code)||{};
  const working=getLatestWorkingFile(code);
  if(working && (st.status==='draft' || st.status==='in_review' || st.status==='pending_approval')){
    // ISO-style: only editors/reviewers/approvers/admin see the working copy
    if(isAdmin() || canEdit(doc) || canReview(doc) || canApprove(doc)) return working;
  }
  return doc.path;
}

let viewerDocZoom = 100;
const VIEWER_DOC_ZOOM_MIN = 60;
const VIEWER_DOC_ZOOM_MAX = 200;
const VIEWER_DOC_ZOOM_STEP = 10;

function clampViewerDocZoom(value){
  const numeric = Number(value);
  if(!Number.isFinite(numeric)) return 100;
  return Math.max(VIEWER_DOC_ZOOM_MIN, Math.min(VIEWER_DOC_ZOOM_MAX, numeric));
}

function getDocIframeDocument(iframe){
  try{
    return iframe ? (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document)) : null;
  }catch(e){
    return null;
  }
}

function applyDocViewerZoomToDocument(idoc){
  try{
    if(!idoc) return;
    const target = idoc.body || idoc.documentElement;
    if(!target) return;
    let styleEl = idoc.getElementById('portal-doc-viewer-zoom-style');
    if(!styleEl){
      styleEl = idoc.createElement('style');
      styleEl.id = 'portal-doc-viewer-zoom-style';
      (idoc.head || idoc.documentElement || target).appendChild(styleEl);
    }
    styleEl.textContent = `html{overflow:auto;}body{zoom:${viewerDocZoom}% !important;}`;
  }catch(e){}
}

function resetDocViewerZoom(){
  viewerDocZoom = 100;
  const iframe = document.getElementById('doc-iframe');
  const idoc = getDocIframeDocument(iframe);
  if(idoc) applyDocViewerZoomToDocument(idoc);
}

function attachIframeViewerZoom(iframe){
  const idoc = getDocIframeDocument(iframe);
  if(!idoc || !idoc.documentElement) return;
  applyDocViewerZoomToDocument(idoc);
  if(idoc.__portalViewerZoomAttached) return;
  const wheelHandler = function(event){
    if(!event || !event.ctrlKey) return;
    const delta = Number(event.deltaY || 0);
    if(!Number.isFinite(delta) || delta === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const nextZoom = clampViewerDocZoom(viewerDocZoom + (delta < 0 ? VIEWER_DOC_ZOOM_STEP : -VIEWER_DOC_ZOOM_STEP));
    if(nextZoom === viewerDocZoom) return;
    viewerDocZoom = nextZoom;
    applyDocViewerZoomToDocument(idoc);
  };
  idoc.addEventListener('wheel', wheelHandler, {capture:true, passive:false});
  idoc.__portalViewerZoomAttached = true;
}

function syncIframeDocumentHeaderMetadata(idoc, doc){
  if(!idoc || !doc) return;
  try{
    const code = String(doc.code || '').trim();
    const title = String((typeof getDocDisplayTitle === 'function' ? getDocDisplayTitle(doc) : (doc.title || '')) || '').trim();
    const desc = String((typeof getDocDisplayDescription === 'function' ? getDocDisplayDescription(doc) : '') || '').trim();
    const combinedTitle = [code, title].filter(Boolean).join(' — ');

    const titleWrap = idoc.querySelector('.form-header .title');
    if(titleWrap){
      const strongEl = titleWrap.querySelector('strong');
      if(strongEl && combinedTitle){
        strongEl.textContent = combinedTitle;
      }

      const subEl = titleWrap.querySelector('.sub-vn, .sub');
      if(subEl){
        subEl.textContent = desc;
      }else if(desc){
        const createdSub = idoc.createElement('span');
        createdSub.className = 'sub-vn';
        createdSub.textContent = desc;
        titleWrap.appendChild(createdSub);
      }
    }

    const codeRows = idoc.querySelectorAll('.form-header .meta .row');
    codeRows.forEach(function(row){
      try{
        const labelEl = row.querySelector('b');
        const valueEl = row.querySelector('span:last-child');
        const label = String(labelEl ? labelEl.textContent : '').toLowerCase();
        if(valueEl && /code|mã/.test(label) && code){
          valueEl.textContent = code;
        }
      }catch(_e){}
    });
  }catch(e){}
}

function loadDocContent(code){
  const doc=DOCS.find(d=>d.code===code);
  if(!doc) return;

  const edited=getEditedHtml(code);
  const iframe=document.getElementById('doc-iframe');
  const loading=document.getElementById('iframe-loading');

  // Show loading indicator while refreshing the iframe
  if(loading){
    loading.style.display='block';
    loading.innerHTML='<div class="spinner"></div>'+T('loading_doc');
  }
  iframe.style.opacity='0';

  try{
    iframe.onload=null;
    iframe.removeAttribute('srcdoc');
    iframe.removeAttribute('src');
  }catch(e){}

  if(typeof isDownloadOnlyDoc==='function' && isDownloadOnlyDoc(doc)){
    const state=getDocState(code)||{};
    const versions=getDocVersions(code)||[];
    const currentEntry=versions.find(v=>isCurrentVersionEntry(doc,v)) || versions.find(v=>v && (v.status==='approved' || v.status==='initial_release')) || null;
    const workingEntry=versions.find(v=>v && (v.status==='draft' || v.status==='in_review')) || null;
    const currentUrl=currentEntry ? getVersionAccessUrl(doc,currentEntry) : buildDocStreamUrl(doc,true);
    const workingUrl=workingEntry ? getVersionAccessUrl(doc,workingEntry) : '';
    const revision=String(getDocRevision(doc)||'0');
    const status=String(getDocStatus(doc)||'approved');
    const title=(typeof escapeHtml==='function') ? escapeHtml(getDocDisplayTitle(doc)||doc.title||doc.code) : (getDocDisplayTitle(doc)||doc.title||doc.code);
    const desc=(typeof escapeHtml==='function') ? escapeHtml(getDocDisplayDescription(doc)||'') : (getDocDisplayDescription(doc)||'');
    const owner=(typeof escapeHtml==='function') ? escapeHtml(String((state&&state.owner)||doc.owner||'QA/QMS')) : String((state&&state.owner)||doc.owner||'QA/QMS');
    const docExt=String(doc.ext || '').toLowerCase();
    const docTypeLabel=docExt==='pdf'
      ? (lang==='en' ? 'Controlled PDF file' : 'Tai lieu PDF duoc kiem soat')
      : (/^(doc|docx|docm)$/i.test(docExt)
        ? (lang==='en' ? 'Controlled Word file' : 'Tep Word duoc kiem soat')
        : (/^(ppt|pptx|pptm)$/i.test(docExt)
          ? (lang==='en' ? 'Controlled PowerPoint file' : 'Tep PowerPoint duoc kiem soat')
          : (/^(xls|xlsx|xlsm|xlsb|csv)$/i.test(docExt)
            ? (lang==='en' ? 'Controlled Excel file' : 'Tep Excel duoc kiem soat')
            : (docExt ? (lang==='en' ? `Controlled file (.${docExt})` : `Tep duoc kiem soat (.${docExt})`) : (lang==='en' ? 'Controlled file' : 'Tep duoc kiem soat')))));
    const currentFileLabel=lang==='en' ? 'Download current file' : 'Tai file hien hanh';
    const workingFileLabel=lang==='en' ? 'Download working copy' : 'Tai ban lam viec';
    const fileNote=lang==='en'
      ? 'Non-HTML controlled files are version-managed through private staging, review, approval, and immutable archive. Use the buttons below to retrieve the current released file or the latest working copy.'
      : 'Cac tep khong phai HTML duoc kiem soat phien ban qua private staging, review, approval va immutable archive. Dung cac nut ben duoi de tai file phat hanh hien hanh hoac ban lam viec moi nhat.';
    iframe.onload=function(){
      try{ attachIframeViewerZoom(iframe); }catch(e){}
      if(loading) loading.style.display='none';
      iframe.style.opacity='1';
    };
    iframe.srcdoc = `<!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body{margin:0;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a}
          .wrap{padding:24px}
          .card{background:#fff;border:1px solid #dbe3ef;border-radius:18px;padding:24px;box-shadow:0 16px 40px rgba(15,23,42,.06)}
          .eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#475569;margin-bottom:8px}
          h1{margin:0 0 8px;font-size:28px;line-height:1.2}
          .sub{font-size:14px;color:#475569;margin-bottom:18px}
          .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:18px 0 22px}
          .meta{border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#f8fafc}
          .meta b{display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
          .meta span{font-size:14px;font-weight:600}
          .cta{display:flex;flex-wrap:wrap;gap:12px}
          .btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;font:inherit}
          .btn.primary{background:#0f766e;color:#fff;border-color:#0f766e}
          .note{margin-top:18px;padding:14px 16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:13px;line-height:1.6}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="eyebrow">${docTypeLabel}</div>
            <h1>${doc.code} — ${title}</h1>
            ${desc?`<div class="sub">${desc}</div>`:''}
            <div class="grid">
              <div class="meta"><b>${lang==='en'?'Current revision':'Phiên bản hiện hành'}</b><span>v${revision}</span></div>
              <div class="meta"><b>${lang==='en'?'Status':'Trạng thái'}</b><span>${status}</span></div>
              <div class="meta"><b>${lang==='en'?'Owner':'Chủ sở hữu'}</b><span>${owner}</span></div>
              <div class="meta"><b>${lang==='en'?'Delivery mode':'Cách phát hành'}</b><span>${lang==='en'?'Download only':'Chỉ tải về'}</span></div>
            </div>
            <div class="cta">
              <button class="btn primary" type="button" onclick='parent.triggerDownloadUrl(${JSON.stringify(currentUrl)})'>${currentFileLabel}</button>
              ${workingUrl?`<button class="btn" type="button" onclick='parent.triggerDownloadUrl(${JSON.stringify(workingUrl)})'>${workingFileLabel}</button>`:''}
            </div>
            <div class="note">
              ${fileNote}
            </div>
          </div>
        </div>
      </body>
      </html>`;
    setTimeout(function(){
      if(loading && loading.style.display!=='none'){ loading.style.display='none'; iframe.style.opacity='1'; }
    }, 5000);
    return;
  }

  // Load the best file (live approved OR archive working copy), then inject any
  // unsaved local edits (editor-only) on top.
  setTimeout(function(){
    const viewFile = getDocViewFile(doc) || doc.path;
    const src='../'+viewFile;
    const bust='t='+Date.now();
    iframe.src = src + (src.indexOf('?')>=0 ? '&' : '?') + bust;
    iframe.onload=function(){
      try{
        const idoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        try{ repairBrokenDocStyleArtifacts(idoc); }catch(_e){}
        if(edited && idoc){
          const dc = idoc.getElementById('docContent');
          if(dc) dc.innerHTML = edited;
          else if(idoc.body) idoc.body.innerHTML = edited;
        }
        try{ syncIframeDocumentHeaderMetadata(idoc, doc); }catch(_e){}
        try{
          if(idoc && typeof edApplyGlobalTablePolicyToDocument==='function'){
            edApplyGlobalTablePolicyToDocument(idoc, {force:true, source:'view-load'});
            // Re-run after initial render so late layout changes (fonts/images)
            // cannot push table width beyond page frame.
            setTimeout(function(){
              try{ edApplyGlobalTablePolicyToDocument(idoc, {force:true, source:'view-load-late-1'}); }catch(_e){}
            }, 220);
            setTimeout(function(){
              try{ edApplyGlobalTablePolicyToDocument(idoc, {force:true, source:'view-load-late-2'}); }catch(_e){}
            }, 1200);
          }
        }catch(e){}
        // Sync language after injection, even for legacy docs that never loaded assets/app.js.
        // Retry a few times in EN mode because Google Translate inside the iframe
        // can initialize asynchronously after the document load event.
        try{ scheduleIframeDocumentLanguageSync(iframe, lang); }catch(e){}
        try{ if(typeof attachIframeLinkBridge==='function') attachIframeLinkBridge(iframe, doc, viewFile); }catch(e){}
        try{ attachIframeViewerZoom(iframe); }catch(e){}
      }catch(e){}
      if(loading) loading.style.display='none';
      iframe.style.opacity='1';
    };
    // Fallback
    setTimeout(function(){
      if(loading && loading.style.display!=='none'){ loading.style.display='none'; iframe.style.opacity='1'; }
    }, 5000);
  }, 30);
}


// ═══════════════════════════════════════════════════
