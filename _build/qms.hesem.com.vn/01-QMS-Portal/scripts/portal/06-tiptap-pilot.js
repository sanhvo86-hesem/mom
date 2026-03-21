// TIPTAP PILOT ADAPTER
// Non-breaking bridge for gradual migration from legacy execCommand editor.
(function(){
  var TIPTAP_VERSION = '2.6.6';
  var TIPTAP_CDN = 'https://esm.sh';

  var _dynamicImport = null;
  try{
    _dynamicImport = new Function('u','return import(u);');
  }catch(_e){
    _dynamicImport = null;
  }

  var _loadPromise = null;
  var _mods = null;
  var _editor = null;
  var _target = null;
  var _ready = false;
  var _pendingTarget = null;
  var _lastHtml = '';
  var _syncing = false;
  var _warnedUnsupported = false;
  var _warnedLoadFail = false;
  var _pilotToastShown = false;

  var DISABLED_PILOT_COMMANDS = [
    '_painter',
    '_textbox',
    '_shape',
    '_chart',
    '_checklist',
    '_math'
  ];

  var UNSUPPORTED_SELECTOR = [
    '.ed-textbox',
    '.ed-shape',
    '.ed-chart',
    '.ed-check-item',
    '.ed-math',
    '.ed-img-resize-wrap',
    '.ed-tbl-float-bar',
    '[data-ed-init]'
  ].join(',');

  function _isPilotEnabled(){
    try{
      var cfg = window.qmsEditorConfig || {};
      return cfg.engine === 'tiptap' && !!cfg.tiptapPilot;
    }catch(e){
      return false;
    }
  }

  function _safeToast(msgVi,msgEn){
    try{
      if(typeof window.showToast !== 'function') return;
      if(window.lang === 'en') window.showToast(msgEn);
      else window.showToast(msgVi);
    }catch(e){}
  }

  function _warnUnsupported(){
    if(_warnedUnsupported) return;
    _warnedUnsupported = true;
    console.warn('[QMS Tiptap] Unsupported advanced widgets detected. Staying on legacy engine.');
  }

  function _warnLoadFailure(err){
    if(_warnedLoadFail) return;
    _warnedLoadFail = true;
    console.warn('[QMS Tiptap] Failed to load Tiptap modules. Falling back to legacy.', err);
  }

  function _hasUnsupportedContent(target){
    if(!target || !(target instanceof Element)) return true;
    try{
      return !!target.querySelector(UNSUPPORTED_SELECTOR);
    }catch(e){
      return true;
    }
  }

  function _togglePilotButtons(disabled){
    DISABLED_PILOT_COMMANDS.forEach(function(cmd){
      var btn = document.querySelector('[data-cmd="'+cmd+'"]');
      if(!btn) return;
      if(disabled){
        if(!btn.dataset.edPilotTitle) btn.dataset.edPilotTitle = btn.getAttribute('title') || '';
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.pointerEvents = 'none';
        btn.setAttribute('title', (btn.dataset.edPilotTitle||'') + ' (Tiptap pilot: disabled)');
      }else{
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
        if(btn.dataset.edPilotTitle){
          btn.setAttribute('title', btn.dataset.edPilotTitle);
          delete btn.dataset.edPilotTitle;
        }
      }
    });
  }

  function _notifyEditorUi(){
    try{ if(typeof window.edUpdateState === 'function') window.edUpdateState(); }catch(e){}
    try{ if(typeof window.edUpdateWordCount === 'function') window.edUpdateWordCount(); }catch(e){}
  }

  function _pickDefault(mod, name){
    if(!mod) return null;
    if(mod.default) return mod.default;
    if(name && mod[name]) return mod[name];
    return null;
  }

  function _normalizeFontSize(v){
    var map = {
      '1':'10px',
      '2':'13px',
      '3':'16px',
      '4':'18px',
      '5':'24px',
      '6':'32px',
      '7':'48px'
    };
    var s = String(v == null ? '' : v).trim();
    if(!s) return null;
    if(map[s]) return map[s];
    if(/^\d+(\.\d+)?$/.test(s)) return s + 'px';
    return s;
  }

  function _normalizeLineSpacing(v){
    var s = String(v == null ? '' : v).trim();
    if(!s) return null;
    if(/^\d+(\.\d+)?$/.test(s)) return s;
    if(/^\d+(\.\d+)?(px|em|rem|%)$/i.test(s)) return s;
    return null;
  }

  function _fontSizeToLegacy(size){
    var px=parseFloat(String(size==null?'':size));
    if(!isFinite(px)||px<=0) return '';
    var map=[10,13,16,18,24,32,48];
    var idx=0;
    var best=Math.abs(px-map[0]);
    for(var i=1;i<map.length;i++){
      var d=Math.abs(px-map[i]);
      if(d<best){best=d;idx=i;}
    }
    return String(idx+1);
  }

  function _buildFontSizeExtension(core){
    if(!core || !core.Extension) return null;
    try{
      return core.Extension.create({
        name:'fontSize',
        addOptions:function(){
          return {types:['textStyle']};
        },
        addGlobalAttributes:function(){
          return [{
            types:this.options.types,
            attributes:{
              fontSize:{
                default:null,
                parseHTML:function(el){
                  return (el.style && el.style.fontSize) ? el.style.fontSize : null;
                },
                renderHTML:function(attrs){
                  if(!attrs.fontSize) return {};
                  return {style:'font-size:' + attrs.fontSize};
                }
              }
            }
          }];
        },
        addCommands:function(){
          return {
            setFontSize:function(size){
              return function(ctx){
                return ctx.chain().setMark('textStyle', {fontSize:size}).run();
              };
            },
            unsetFontSize:function(){
              return function(ctx){
                return ctx.chain().setMark('textStyle', {fontSize:null}).removeEmptyTextStyle().run();
              };
            }
          };
        }
      });
    }catch(e){
      return null;
    }
  }

  function _buildLineHeightExtension(core){
    if(!core || !core.Extension) return null;
    try{
      return core.Extension.create({
        name:'lineHeight',
        addOptions:function(){
          return {types:['textStyle']};
        },
        addGlobalAttributes:function(){
          return [{
            types:this.options.types,
            attributes:{
              lineHeight:{
                default:null,
                parseHTML:function(el){
                  return (el.style && el.style.lineHeight) ? el.style.lineHeight : null;
                },
                renderHTML:function(attrs){
                  if(!attrs.lineHeight) return {};
                  return {style:'line-height:' + attrs.lineHeight};
                }
              }
            }
          }];
        },
        addCommands:function(){
          return {
            setLineHeight:function(value){
              return function(ctx){
                return ctx.chain().setMark('textStyle', {lineHeight:value}).run();
              };
            },
            unsetLineHeight:function(){
              return function(ctx){
                return ctx.chain().setMark('textStyle', {lineHeight:null}).removeEmptyTextStyle().run();
              };
            }
          };
        }
      });
    }catch(e){
      return null;
    }
  }

  function _sanitizeInsertHtml(raw){
    var html = String(raw == null ? '' : raw);
    try{
      if(typeof window._edSanitizeHtmlFragment === 'function'){
        html = window._edSanitizeHtmlFragment(html,{
          forPaste:false,
          stripClasses:false,
          stripIds:false,
          preserveDataAttrs:true
        });
      }
    }catch(e){}
    return html;
  }

  function _tiptapImport(path){
    if(!_dynamicImport) return Promise.reject(new Error('Dynamic import is not supported.'));
    return _dynamicImport(TIPTAP_CDN + '/' + path + '@' + TIPTAP_VERSION + '?bundle');
  }

  function _ensureLoaded(){
    if(_mods) return Promise.resolve(_mods);
    if(_loadPromise) return _loadPromise;
    _loadPromise = Promise.all([
      _tiptapImport('@tiptap/core'),
      _tiptapImport('@tiptap/starter-kit'),
      _tiptapImport('@tiptap/extension-link'),
      _tiptapImport('@tiptap/extension-underline'),
      _tiptapImport('@tiptap/extension-highlight'),
      _tiptapImport('@tiptap/extension-text-style'),
      _tiptapImport('@tiptap/extension-color'),
      _tiptapImport('@tiptap/extension-table'),
      _tiptapImport('@tiptap/extension-table-row'),
      _tiptapImport('@tiptap/extension-table-cell'),
      _tiptapImport('@tiptap/extension-table-header'),
      _tiptapImport('@tiptap/extension-text-align'),
      _tiptapImport('@tiptap/extension-font-family'),
      _tiptapImport('@tiptap/extension-subscript'),
      _tiptapImport('@tiptap/extension-superscript')
    ]).then(function(m){
      var core = m[0];
      _mods = {
        core: core,
        Editor: core.Editor || (core.default && core.default.Editor),
        StarterKit: _pickDefault(m[1]),
        Link: _pickDefault(m[2]),
        Underline: _pickDefault(m[3]),
        Highlight: _pickDefault(m[4]),
        TextStyle: _pickDefault(m[5]),
        Color: _pickDefault(m[6]),
        Table: _pickDefault(m[7]),
        TableRow: _pickDefault(m[8]),
        TableCell: _pickDefault(m[9]),
        TableHeader: _pickDefault(m[10]),
        TextAlign: _pickDefault(m[11]),
        FontFamily: _pickDefault(m[12]),
        Subscript: _pickDefault(m[13]),
        Superscript: _pickDefault(m[14])
      };
      _mods.FontSize = _buildFontSizeExtension(core);
      _mods.LineHeight = _buildLineHeightExtension(core);
      if(!_mods.Editor || !_mods.StarterKit){
        throw new Error('Missing required Tiptap exports.');
      }
      return _mods;
    }).catch(function(err){
      _mods = null;
      throw err;
    }).finally(function(){
      _loadPromise = null;
    });
    return _loadPromise;
  }

  function _buildExtensions(){
    var ext = [];
    ext.push(_mods.StarterKit.configure({history:true}));
    if(_mods.Underline) ext.push(_mods.Underline);
    if(_mods.TextStyle) ext.push(_mods.TextStyle);
    if(_mods.Color) ext.push(_mods.Color);
    if(_mods.Highlight) ext.push(_mods.Highlight.configure({multicolor:true}));
    if(_mods.Link) ext.push(_mods.Link.configure({openOnClick:false, autolink:false}));
    if(_mods.TextAlign) ext.push(_mods.TextAlign.configure({types:['heading','paragraph']}));
    if(_mods.FontFamily) ext.push(_mods.FontFamily.configure({types:['textStyle']}));
    if(_mods.FontSize) ext.push(_mods.FontSize);
    if(_mods.LineHeight) ext.push(_mods.LineHeight);
    if(_mods.Subscript) ext.push(_mods.Subscript);
    if(_mods.Superscript) ext.push(_mods.Superscript);
    if(_mods.Table) ext.push(_mods.Table.configure({resizable:true}));
    if(_mods.TableRow) ext.push(_mods.TableRow);
    if(_mods.TableHeader) ext.push(_mods.TableHeader);
    if(_mods.TableCell) ext.push(_mods.TableCell);
    return ext;
  }

  function _mount(target){
    if(!_mods || !_mods.Editor || !target || !target.isConnected) return false;
    if(_editor && _target === target && _ready) return true;
    if(_hasUnsupportedContent(target)){
      _warnUnsupported();
      return false;
    }

    adapter.destroy(true);
    _target = target;
    _syncing = true;

    try{
      _editor = new _mods.Editor({
        element: target,
        extensions: _buildExtensions(),
        content: target.innerHTML || '<p></p>',
        editorProps:{
          attributes:{
            class:'qms-tiptap-content',
            spellcheck:'true'
          }
        },
        onCreate:function(ctx){
          _ready = true;
          _syncing = false;
          try{ _lastHtml = ctx.editor.getHTML(); }catch(e){ _lastHtml = ''; }
          if(_target){
            _target.setAttribute('data-ed-engine','tiptap');
            _target.classList.add('ed-tiptap-host');
          }
          _togglePilotButtons(true);
          _notifyEditorUi();
          if(!_pilotToastShown){
            _pilotToastShown = true;
            _safeToast('Dang chay Tiptap pilot (lenh core).','Tiptap pilot is active (core commands).');
          }
        },
        onUpdate:function(ctx){
          if(_syncing) return;
          var html = '';
          try{ html = ctx.editor.getHTML(); }catch(e){ html = ''; }
          if(html !== _lastHtml){
            _lastHtml = html;
            try{ if(typeof window.edMarkModified === 'function') window.edMarkModified(); }catch(e){}
          }
          _notifyEditorUi();
        },
        onSelectionUpdate:function(){
          try{ if(typeof window.edUpdateState === 'function') window.edUpdateState(); }catch(e){}
        }
      });
      return true;
    }catch(err){
      console.warn('[QMS Tiptap] Mount error. Fallback to legacy.', err);
      _syncing = false;
      adapter.destroy(false);
      return false;
    }
  }

  function _setTextAlign(value){
    if(!_editor) return false;
    try{ return _editor.chain().focus().setTextAlign(value).run(); }catch(e){ return false; }
  }

  function _exec(cmd, val){
    if(!_ready || !_editor) return false;
    var chain = _editor.chain().focus();
    try{
      switch(cmd){
        case 'undo': return chain.undo().run();
        case 'redo': return chain.redo().run();
        case 'bold': return chain.toggleBold().run();
        case 'italic': return chain.toggleItalic().run();
        case 'underline': return chain.toggleUnderline().run();
        case 'strikeThrough': return chain.toggleStrike().run();
        case 'superscript': return chain.toggleSuperscript().run();
        case 'subscript': return chain.toggleSubscript().run();
        case 'insertUnorderedList': return chain.toggleBulletList().run();
        case 'insertOrderedList': return chain.toggleOrderedList().run();
        case 'insertHorizontalRule': return chain.setHorizontalRule().run();
        case 'insertParagraph': return chain.setParagraph().run();
        case 'insertText':
          return chain.insertContent({type:'text', text:String(val == null ? '' : val)}).run();
        case 'removeFormat': return chain.unsetAllMarks().clearNodes().run();
        case 'insertHTML': {
          var safeHtml = _sanitizeInsertHtml(val);
          if(!safeHtml) return false;
          return chain.insertContent(safeHtml).run();
        }
        case 'insertTable': {
          var opts = (val && typeof val === 'object') ? val : {};
          var rows = Math.max(1, Math.min(50, parseInt(opts.rows,10) || 3));
          var cols = Math.max(1, Math.min(20, parseInt(opts.cols,10) || 3));
          var withHeaderRow = (opts.withHeaderRow !== false);
          if(_editor.commands.insertTable){
            return chain.insertTable({rows:rows, cols:cols, withHeaderRow:withHeaderRow}).run();
          }
          return false;
        }
        case 'mergeCells':
          if(_editor.commands.mergeCells){
            return chain.mergeCells().run();
          }
          return false;
        case 'splitCell':
          if(_editor.commands.splitCell){
            return chain.splitCell().run();
          }
          return false;
        case 'addRowBefore':
          if(_editor.commands.addRowBefore){
            return chain.addRowBefore().run();
          }
          return false;
        case 'addRowAfter':
          if(_editor.commands.addRowAfter){
            return chain.addRowAfter().run();
          }
          return false;
        case 'deleteRow':
          if(_editor.commands.deleteRow){
            return chain.deleteRow().run();
          }
          return false;
        case 'addColumnBefore':
          if(_editor.commands.addColumnBefore){
            return chain.addColumnBefore().run();
          }
          return false;
        case 'addColumnAfter':
          if(_editor.commands.addColumnAfter){
            return chain.addColumnAfter().run();
          }
          return false;
        case 'deleteColumn':
          if(_editor.commands.deleteColumn){
            return chain.deleteColumn().run();
          }
          return false;
        case 'toggleHeaderRow':
          if(_editor.commands.toggleHeaderRow){
            return chain.toggleHeaderRow().run();
          }
          return false;
        case 'toggleHeaderColumn':
          if(_editor.commands.toggleHeaderColumn){
            return chain.toggleHeaderColumn().run();
          }
          return false;
        case 'createLink':
          if(!val) return false;
          return chain.extendMarkRange('link').setLink({
            href:String(val),
            target:'_blank',
            rel:'noopener noreferrer'
          }).run();
        case 'unlink':
          return chain.extendMarkRange('link').unsetLink().run();
        case 'foreColor':
          if(!val || val === 'transparent') return chain.unsetColor().run();
          return chain.setColor(String(val)).run();
        case 'hiliteColor':
          if(!val || val === 'transparent') return chain.unsetHighlight().run();
          return chain.setHighlight({color:String(val)}).run();
        case 'justifyLeft': return _setTextAlign('left');
        case 'justifyCenter': return _setTextAlign('center');
        case 'justifyRight': return _setTextAlign('right');
        case 'justifyFull': return _setTextAlign('justify');
        case 'indent':
          if(_editor.isActive('listItem')) return chain.sinkListItem('listItem').run();
          return false;
        case 'outdent':
          if(_editor.isActive('listItem')) return chain.liftListItem('listItem').run();
          return false;
        case '_tabForward':
          if(_editor.commands.goToNextCell){
            if(_editor.commands.goToNextCell()) return true;
            if(_editor.commands.addRowAfter){
              return _editor.chain().focus().addRowAfter().goToNextCell().run();
            }
          }
          if(_editor.isActive('listItem')) return chain.sinkListItem('listItem').run();
          return chain.insertContent('&nbsp;&nbsp;&nbsp;&nbsp;').run();
        case '_tabBackward':
          if(_editor.commands.goToPreviousCell){
            if(_editor.commands.goToPreviousCell()) return true;
          }
          if(_editor.isActive('listItem')) return chain.liftListItem('listItem').run();
          return false;
        case 'formatBlock': {
          var tag = String(val == null ? '' : val).replace(/[<>]/g,'').trim().toLowerCase();
          if(!tag || tag === 'p') return chain.setParagraph().run();
          if(tag === 'pre') return chain.toggleCodeBlock().run();
          var m = tag.match(/^h([1-6])$/);
          if(m) return chain.toggleHeading({level:parseInt(m[1],10)}).run();
          if(tag === 'blockquote') return chain.toggleBlockquote().run();
          return false;
        }
        case 'fontName':
          if(_editor.commands.setFontFamily && val) return chain.setFontFamily(String(val)).run();
          return false;
        case 'fontSize': {
          var size = _normalizeFontSize(val);
          if(!size) return false;
          if(_editor.commands.setFontSize) return chain.setFontSize(size).run();
          return false;
        }
        case 'lineSpacing': {
          var spacing = _normalizeLineSpacing(val);
          if(!spacing) return false;
          if(_editor.commands.setLineHeight) return chain.setLineHeight(spacing).run();
          return false;
        }
        default:
          return false;
      }
    }catch(e){
      return false;
    }
  }

  var adapter = {
    maybeMount:function(target){
      if(!_isPilotEnabled()) return false;
      if(!target || !target.isConnected) return false;
      if(_editor && _target === target && _ready) return true;
      if(_hasUnsupportedContent(target)){
        _warnUnsupported();
        return false;
      }
      if(_mods) return _mount(target);

      _pendingTarget = target;
      _ensureLoaded().then(function(){
        var t = _pendingTarget;
        if(!t || !t.isConnected) return;
        if(!_isPilotEnabled()) return;
        if(_hasUnsupportedContent(t)){
          _warnUnsupported();
          return;
        }
        _mount(t);
      }).catch(function(err){
        _warnLoadFailure(err);
      });
      return false;
    },
    mount:function(target){
      if(!_isPilotEnabled()) return false;
      if(!target || !target.isConnected) return false;
      if(_hasUnsupportedContent(target)){
        _warnUnsupported();
        return false;
      }
      return _ensureLoaded().then(function(){
        return _mount(target);
      }).catch(function(err){
        _warnLoadFailure(err);
        return false;
      });
    },
    destroy:function(syncDom){
      if(_editor){
        if(syncDom && _target){
          try{
            _target.innerHTML = _editor.getHTML();
          }catch(e){}
        }
        try{ _editor.destroy(); }catch(e){}
      }
      if(_target){
        _target.removeAttribute('data-ed-engine');
        _target.classList.remove('ed-tiptap-host');
      }
      _editor = null;
      _target = null;
      _ready = false;
      _lastHtml = '';
      _syncing = false;
      _pendingTarget = null;
      _togglePilotButtons(false);
      _notifyEditorUi();
      return true;
    },
    exec:function(cmd,val){
      return _exec(cmd,val);
    },
    focus:function(){
      if(!_ready || !_editor) return false;
      try{
        return _editor.chain().focus().run();
      }catch(e){
        return false;
      }
    },
    queryState:function(cmd){
      if(!_ready || !_editor) return false;
      try{
        switch(cmd){
          case 'bold': return _editor.isActive('bold');
          case 'italic': return _editor.isActive('italic');
          case 'underline': return _editor.isActive('underline');
          case 'strikeThrough': return _editor.isActive('strike');
          case 'superscript': return _editor.isActive('superscript');
          case 'subscript': return _editor.isActive('subscript');
          case 'insertUnorderedList': return _editor.isActive('bulletList');
          case 'insertOrderedList': return _editor.isActive('orderedList');
          case 'justifyLeft':
            return _editor.isActive({textAlign:'left'}) || (
              !_editor.isActive({textAlign:'center'}) &&
              !_editor.isActive({textAlign:'right'}) &&
              !_editor.isActive({textAlign:'justify'})
            );
          case 'justifyCenter': return _editor.isActive({textAlign:'center'});
          case 'justifyRight': return _editor.isActive({textAlign:'right'});
          case 'justifyFull': return _editor.isActive({textAlign:'justify'});
          default: return false;
        }
      }catch(e){
        return false;
      }
    },
    queryValue:function(key){
      if(!_ready || !_editor) return '';
      try{
        if(key==='fontName'){
          var ff=_editor.getAttributes('textStyle').fontFamily;
          return ff?String(ff):'';
        }
        if(key==='fontSize'){
          var fs=_editor.getAttributes('textStyle').fontSize;
          return fs?_fontSizeToLegacy(fs):'';
        }
        if(key==='lineSpacing'){
          var lh=_editor.getAttributes('textStyle').lineHeight;
          return lh?String(lh):'';
        }
      }catch(e){}
      return '';
    },
    getHTML:function(){
      if(_ready && _editor){
        try{ return _editor.getHTML(); }catch(e){}
      }
      if(_target) return _target.innerHTML || '';
      return '';
    },
    setHTML:function(html){
      if(!_ready || !_editor) return false;
      _syncing = true;
      try{
        _editor.commands.setContent(String(html == null ? '' : html), false);
        _lastHtml = _editor.getHTML();
        _syncing = false;
        _notifyEditorUi();
        return true;
      }catch(e){
        _syncing = false;
        return false;
      }
    }
  };

  Object.defineProperty(adapter,'ready',{
    enumerable:true,
    get:function(){ return !!_ready; }
  });

  window.edTiptapAdapter = adapter;
})();
