// COMMANDS LINK MODULE
// Extracted from editor core for focused maintenance of link behavior.
(function(){
  function _isVi(){ return window.lang !== 'en'; }
  function _toast(msgVi,msgEn){
    try{
      if(typeof window.showToast !== 'function') return;
      window.showToast(_isVi() ? msgVi : msgEn);
    }catch(e){}
  }
  function _escapeHtml(text){
    try{
      if(typeof window._edEscapeHtml === 'function') return window._edEscapeHtml(text);
    }catch(e){}
    return String(text == null ? '' : text)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  function _sanitizeUrl(url){
    try{
      if(typeof window._edSanitizeUrl === 'function') return window._edSanitizeUrl(url,false);
    }catch(e){}
    var u=String(url == null ? '' : url).trim();
    if(!u) return '';
    return u;
  }
  function _markModified(){
    try{ if(typeof window.edMarkModified === 'function') window.edMarkModified(); }catch(e){}
  }
  function _getSelectionText(){
    try{
      var sel=window.getSelection();
      if(sel && sel.rangeCount && !sel.getRangeAt(0).collapsed){
        return String(sel.toString() || '').trim();
      }
    }catch(e){}
    return '';
  }
  function _selectionHasRange(){
    try{
      var sel=window.getSelection();
      return !!(sel && sel.rangeCount && !sel.getRangeAt(0).collapsed);
    }catch(e){
      return false;
    }
  }
  function _activeLink(){
    try{
      var sel=window.getSelection();
      if(!sel || !sel.rangeCount) return null;
      var node=sel.anchorNode;
      var el=(node && node.nodeType===1)?node:(node && node.parentElement);
      if(!el) return null;
      return el.closest('a');
    }catch(e){
      return null;
    }
  }

  function edInsertLink(){
    var vi=_isVi();
    var active=_activeLink();
    var selected=_getSelectionText();
    var presetUrl=active ? (active.getAttribute('href') || 'https://') : 'https://';
    var presetText=active ? String(active.textContent || '').trim() : selected;

    if(typeof window.edShowModal !== 'function'){
      _toast('\u26a0 Chua the mo hop thoai chen lien ket','\u26a0 Link dialog is not available');
      return;
    }

    window.edShowModal(vi?'Chen lien ket':'Insert Link',[
      {label:'URL',ph:'https://example.com',value:presetUrl},
      {label:vi?'Van ban hien thi':'Display Text',ph:vi?'Nhan vao day':'Click here',value:presetText}
    ],function(vals){
      var url=_sanitizeUrl(vals && vals.length?vals[0]:'');
      var textRaw=String(vals && vals.length>1 ? vals[1] : '').trim();
      if(!url){
        _toast('\u26a0 Lien ket khong hop le','\u26a0 Invalid link URL');
        return;
      }

      try{ if(typeof window.edFocusAndRestore === 'function') window.edFocusAndRestore(); }catch(e){}

      var hasSelection=_selectionHasRange();
      var activeSelText=_getSelectionText();

      // Word-like behavior: when caret is inside existing link, update that link first.
      if(active && !hasSelection){
        active.setAttribute('href', url);
        active.setAttribute('target','_blank');
        active.setAttribute('rel','noopener noreferrer');
        if(textRaw) active.textContent=textRaw;
        _markModified();
        return;
      }

      // If text box is empty and a range is selected, keep selected text and apply link mark.
      if(hasSelection && (!textRaw || textRaw===activeSelText)){
        var okLink=false;
        try{
          if(typeof window.edExecCommand==='function'){
            okLink=window.edExecCommand('createLink',false,url);
          }
        }catch(e){ okLink=false; }
        if(okLink!==false){
          _markModified();
          return;
        }
      }

      var displayText=textRaw || activeSelText || url;
      var safeHtml='<a href="'+_escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">'+_escapeHtml(displayText)+'</a>';
      var okInsert=false;
      try{
        if(typeof window.edExecCommand==='function'){
          okInsert=window.edExecCommand('insertHTML',false,safeHtml);
        }
      }catch(e){ okInsert=false; }
      if(okInsert!==false) _markModified();
    });
  }

  window.edInsertLink = edInsertLink;
  window.edCommandsLink = { insertLink: edInsertLink };
})();

