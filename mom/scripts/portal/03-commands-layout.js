// COMMANDS LAYOUT MODULE
// Extracted from editor core for focused layout command maintenance.
(function(){
  function _isVi(){
    return window.lang !== 'en';
  }

  function _toast(msgVi,msgEn){
    try{
      if(typeof window.showToast === 'function'){
        window.showToast(_isVi() ? msgVi : msgEn);
      }
    }catch(e){}
  }

  function _markModified(){
    try{
      if(typeof window.edMarkModified === 'function'){
        window.edMarkModified();
      }
    }catch(e){}
  }

  function _isTiptapActive(){
    try{
      return (
        typeof window.edGetEngineMode === 'function' &&
        window.edGetEngineMode() === 'tiptap' &&
        window.edTiptapAdapter &&
        !!window.edTiptapAdapter.ready
      );
    }catch(e){
      return false;
    }
  }

  function _resetSpacingSelect(){
    var sel = document.getElementById('ed-spacing');
    if(sel){
      sel.selectedIndex = 0;
    }
  }

  function _normalizeSpacing(val){
    var spacing = String(val == null ? '' : val).trim();
    if(!spacing) return '';
    if(/^\d+(\.\d+)?$/.test(spacing)){
      var num = parseFloat(spacing);
      if(isFinite(num) && num > 0 && num <= 6){
        return String(num);
      }
      return '';
    }
    if(/^\d+(\.\d+)?(px|em|rem|%)$/.test(spacing)){
      return spacing;
    }
    return '';
  }

  function _closestBlock(node,root){
    var cur = node;
    while(cur && cur !== root){
      if(cur.nodeType === 1 && /^(P|DIV|LI|TD|TH|BLOCKQUOTE|PRE|H1|H2|H3|H4|H5|H6)$/.test(cur.tagName)){
        return cur;
      }
      cur = cur.parentNode;
    }
    return null;
  }

  function _applyLineSpacingLegacy(spacing){
    var area = document.getElementById('editor-area');
    if(!area) return false;

    var sel = window.getSelection();
    if(!sel || !sel.rangeCount){
      area.style.lineHeight = spacing;
      return true;
    }

    var range = sel.getRangeAt(0);
    var anc = range.commonAncestorContainer;
    if(anc && anc.nodeType !== 1){
      anc = anc.parentElement;
    }

    if(!anc || !area.contains(anc)){
      area.style.lineHeight = spacing;
      return true;
    }

    var blocks = [];
    if(range.collapsed){
      var one = _closestBlock(anc, area);
      if(one) blocks.push(one);
    }else{
      var selector = 'p,div,li,td,th,blockquote,pre,h1,h2,h3,h4,h5,h6';
      var candidates = Array.from(area.querySelectorAll(selector));
      candidates.forEach(function(el){
        try{
          if(range.intersectsNode(el)){
            blocks.push(el);
          }
        }catch(e){}
      });
      if(!blocks.length){
        var sNode = range.startContainer;
        if(sNode && sNode.nodeType !== 1){
          sNode = sNode.parentElement;
        }
        var fallback = _closestBlock(sNode, area);
        if(fallback) blocks.push(fallback);
      }
    }

    if(!blocks.length){
      area.style.lineHeight = spacing;
      return true;
    }

    var seen = new Set();
    blocks.forEach(function(el){
      if(seen.has(el)) return;
      seen.add(el);
      el.style.lineHeight = spacing;
    });

    return true;
  }

  function edLineSpacing(val){
    var spacing = _normalizeSpacing(val);
    if(!spacing){
      _resetSpacingSelect();
      return;
    }

    if(_isTiptapActive()){
      try{
        if(typeof window.edFocusAndRestore === 'function'){
          window.edFocusAndRestore();
        }
      }catch(e){}

      var ok = false;
      try{
        if(typeof window.edExecCommand === 'function'){
          ok = window.edExecCommand('lineSpacing', false, spacing);
        }
      }catch(e){
        ok = false;
      }

      if(ok !== false){
        _markModified();
      }else{
        _toast('\u26a0 Chua ho tro gian dong trong Tiptap pilot','\u26a0 Line spacing is not supported in Tiptap pilot yet');
      }
      _resetSpacingSelect();
      return;
    }

    try{
      if(typeof window.edFocusAndRestore === 'function'){
        window.edFocusAndRestore();
      }
    }catch(e){}

    if(_applyLineSpacingLegacy(spacing)){
      _markModified();
    }
    _resetSpacingSelect();
  }

  window.edLineSpacing = edLineSpacing;
  window.edCommandsLayout = {
    lineSpacing: edLineSpacing
  };
})();
