// COMMANDS TABLE MODULE
// Word-like table engine: stable structural commands for merged tables.
(function(){
  function _isVi(){ return window.lang !== 'en'; }
  function _toast(vi,en){ try{ if(typeof window.showToast==='function') window.showToast(_isVi()?vi:en); }catch(e){} }
  function _markModified(){ try{ if(typeof window.edMarkModified==='function') window.edMarkModified(); }catch(e){} }
  function _closeCtx(){ try{ if(typeof window.edCloseCtxMenu==='function') window.edCloseCtxMenu(); }catch(e){} }
  function _syncColgroup(table){ try{ if(table&&typeof window.edTableSyncColgroupCount==='function') window.edTableSyncColgroupCount(table); }catch(e){} }
  function _updateBar(table){ try{ if(table&&typeof window.edTableUpdateActiveBar==='function') window.edTableUpdateActiveBar(table); }catch(e){} }
  function _reflowTable(table,source){
    if(!table) return;
    try{
      if(typeof window.edTableApplyAutoPolicy==='function'){
        var mode=String(table.getAttribute('data-ed-autofit')||'').toLowerCase();
        var lock=(table.getAttribute('data-ed-autofit-lock')==='1');
        if(mode==='balanced' || (!lock && mode!=='fixed')){
          window.edTableApplyAutoPolicy(table,{force:true,source:source||'table-cmd'});
        }
      }
    }catch(e){}
  }
  function _afterStructural(table,source){
    _syncColgroup(table);
    _reflowTable(table,source);
    _updateBar(table);
    _markModified();
  }
  function _escapeHtml(text){
    try{ if(typeof window._edEscapeHtml==='function') return window._edEscapeHtml(text); }catch(e){}
    return String(text==null?'':text)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _sanitizeWidth(val,fallback){
    var s=String(val==null?'':val).trim();
    if(!s) return fallback||'100%';
    if(/^auto$/i.test(s)) return 'auto';
    if(/^\d+(\.\d+)?$/.test(s)) return s+'px';
    if(/^\d+(\.\d+)?(px|%|em|rem|vw|vh)$/i.test(s)) return s;
    return fallback||'100%';
  }
  function _toHexColor(input,fallback){
    var fb=fallback||'#cbd5e1';
    var s=String(input==null?'':input).trim().toLowerCase();
    if(!s) return fb;
    if(/^#[0-9a-f]{6}$/.test(s)) return s;
    if(/^#[0-9a-f]{3}$/.test(s)) return '#'+s.charAt(1)+s.charAt(1)+s.charAt(2)+s.charAt(2)+s.charAt(3)+s.charAt(3);
    var m=s.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if(m){
      var r=Math.max(0,Math.min(255,parseInt(m[1],10)||0));
      var g=Math.max(0,Math.min(255,parseInt(m[2],10)||0));
      var b=Math.max(0,Math.min(255,parseInt(m[3],10)||0));
      var hx=function(v){ var t=v.toString(16); return t.length<2?('0'+t):t; };
      return '#'+hx(r)+hx(g)+hx(b);
    }
    return fb;
  }

  function _isTiptapActive(){
    try{
      return typeof window.edGetEngineMode==='function' &&
        window.edGetEngineMode()==='tiptap' &&
        window.edTiptapAdapter && !!window.edTiptapAdapter.ready;
    }catch(e){ return false; }
  }
  function _tiptapExec(cmd,msgVi,msgEn){
    if(!_isTiptapActive()) return false;
    try{
      if(typeof window.edExecCommand==='function'){
        var ok=window.edExecCommand(cmd,false,null);
        if(ok!==false){ _markModified(); return true; }
      }
    }catch(e){}
    _toast(msgVi||'Lenh nay chua ho tro trong Tiptap pilot',msgEn||'This command is not supported in Tiptap pilot');
    return true;
  }

  function _cellFromSelection(){
    try{
      var sel=window.getSelection();
      if(!sel||!sel.rangeCount) return null;
      var n=sel.anchorNode;
      var el=(n&&n.nodeType===1)?n:(n&&n.parentElement);
      return el?el.closest('td,th'):null;
    }catch(e){ return null; }
  }
  function _resolveCtx(){
    try{
      if(typeof window._getCtx==='function'){
        var c=window._getCtx();
        if(c&&c.cell&&c.table) return c;
      }
    }catch(e){}
    var cell=_cellFromSelection();
    if(!cell) return null;
    var table=cell.closest('table');
    if(!table) return null;
    return {cell:cell,table:table,tr:cell.closest('tr'),idx:-1};
  }
  function _parseSpan(cell,name){
    var n=parseInt(cell.getAttribute(name)||'1',10);
    return (!isFinite(n)||n<1)?1:n;
  }
  function _setSpan(cell,name,n){
    n=parseInt(n,10)||1;
    if(n>1) cell.setAttribute(name,String(n)); else cell.removeAttribute(name);
  }

  function _buildTableMap(table){
    var rows=Array.from((table&&table.rows)||[]);
    var grid=[]; var anchors=new Map();
    rows.forEach(function(rowEl,rowIdx){
      if(!grid[rowIdx]) grid[rowIdx]=[];
      var col=0;
      Array.from(rowEl.cells||[]).forEach(function(cell){
        while(grid[rowIdx][col]) col++;
        var rs=_parseSpan(cell,'rowspan'), cs=_parseSpan(cell,'colspan');
        anchors.set(cell,{row:rowIdx,col:col,rowspan:rs,colspan:cs,rowEl:rowEl});
        for(var r=rowIdx;r<rowIdx+rs;r++){
          if(!grid[r]) grid[r]=[];
          for(var c=col;c<col+cs;c++) grid[r][c]=cell;
        }
        col+=cs;
      });
    });
    var width=0;
    grid.forEach(function(r){ if(r&&r.length>width) width=r.length; });
    return {rows:rows,grid:grid,anchors:anchors,width:Math.max(1,width)};
  }
  function _orderedCells(map){
    return Array.from(map.anchors.entries()).sort(function(a,b){
      return (a[1].row-b[1].row)||(a[1].col-b[1].col);
    }).map(function(x){return x[0];});
  }
  function _refCellAt(map,row,col){
    if(!map||!map.grid.length) return null;
    var rr=Math.max(0,Math.min(map.grid.length-1,row));
    var arr=map.grid[rr]||[];
    if(!arr.length) return null;
    var cc=Math.max(0,Math.min(arr.length-1,col));
    return arr[cc]||null;
  }
  function _isCellEmpty(cell){
    if(!cell) return true;
    var txt=String(cell.textContent||'').replace(/\u00a0/g,' ').trim();
    if(txt) return false;
    return !cell.querySelector('img,svg,canvas,table,ul,ol,pre,code,iframe,video,audio');
  }
  function _cloneBlankCellLike(src){
    var c=src?src.cloneNode(false):document.createElement('td');
    c.removeAttribute('id'); c.removeAttribute('rowspan'); c.removeAttribute('colspan');
    c.innerHTML='&nbsp;';
    return c;
  }
  function _appendMergedContent(target,source){
    if(!target||!source||_isCellEmpty(source)) return;
    var targetEmpty=_isCellEmpty(target);
    var frag=document.createDocumentFragment();
    while(source.firstChild) frag.appendChild(source.firstChild);
    if(!targetEmpty) target.appendChild(document.createElement('br'));
    target.appendChild(frag);
  }
  function _placeCaretAtStart(cell){
    if(!cell) return false;
    try{
      if(!cell.firstChild) cell.innerHTML='<br>';
      var sel=window.getSelection(); if(!sel) return false;
      var r=document.createRange();
      r.selectNodeContents(cell); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
      return true;
    }catch(e){ return false; }
  }
  function _findInsertRefByCol(rowEl,anchors,colStart){
    var cells=Array.from((rowEl&&rowEl.cells)||[]);
    for(var i=0;i<cells.length;i++){
      var info=anchors.get(cells[i]);
      if(info&&info.col>=colStart) return cells[i];
    }
    return null;
  }
  function _insertCellAtCol(rowEl,cell,anchors,colStart){
    if(!rowEl||!cell) return;
    var ref=_findInsertRefByCol(rowEl,anchors,colStart);
    if(ref) rowEl.insertBefore(cell,ref); else rowEl.appendChild(cell);
  }
  function _resolveInsertSection(table,map,insertAt){
    if(map.rows.length&&insertAt<map.rows.length){
      return {section:map.rows[insertAt].parentElement,before:map.rows[insertAt]};
    }
    if(map.rows.length){
      var last=map.rows[map.rows.length-1];
      return {section:last.parentElement,before:null};
    }
    var sec=(table.tBodies&&table.tBodies[0])||document.createElement('tbody');
    if(!sec.parentElement) table.appendChild(sec);
    return {section:sec,before:null};
  }
  function _appendWordLikeRow(table,map){
    if(!map.rows.length){
      var ins=_resolveInsertSection(table,map,0);
      var tr=document.createElement('tr'), td=document.createElement('td');
      td.innerHTML='<br>'; tr.appendChild(td); ins.section.appendChild(tr); _syncColgroup(table); return td;
    }
    var lastIdx=map.rows.length-1, lastRow=map.rows[lastIdx], sec=lastRow.parentElement;
    if(!sec||sec.tagName==='THEAD'||sec.tagName==='TFOOT'){
      sec=(table.tBodies&&table.tBodies[0])||document.createElement('tbody');
      if(!sec.parentElement) table.appendChild(sec);
    }
    var tr=document.createElement('tr');
    tr.className=lastRow.className||''; tr.style.cssText=lastRow.style.cssText||'';
    for(var col=0;col<map.width;col++){
      var tmpl=_refCellAt(map,lastIdx,col);
      var cell=tmpl?tmpl.cloneNode(false):document.createElement('td');
      cell.removeAttribute('id'); cell.removeAttribute('rowspan'); cell.removeAttribute('colspan');
      cell.innerHTML='<br>'; tr.appendChild(cell);
    }
    sec.appendChild(tr); _syncColgroup(table);
    return tr.cells.length?tr.cells[0]:null;
  }

  function _insertLogicalRow(table,map,insertAt,templateRowIdx){
    var ins=_resolveInsertSection(table,map,insertAt), width=Math.max(1,map.width||1);
    var occupied=new Array(width); for(var i=0;i<width;i++) occupied[i]=false;
    map.anchors.forEach(function(info,cell){
      if(info.row<insertAt && info.row+info.rowspan>insertAt){
        _setSpan(cell,'rowspan',info.rowspan+1);
        for(var c=info.col;c<info.col+info.colspan;c++) if(c>=0&&c<width) occupied[c]=true;
      }
    });
    var tpl=(templateRowIdx>=0&&templateRowIdx<map.rows.length)?map.rows[templateRowIdx]:null;
    var tr=document.createElement('tr');
    if(tpl){ tr.className=tpl.className||''; tr.style.cssText=tpl.style.cssText||''; }
    var col=0;
    while(col<width){
      if(occupied[col]){ col++; continue; }
      var ref=_refCellAt(map,templateRowIdx,col), span=1;
      while(col+span<width && !occupied[col+span] && _refCellAt(map,templateRowIdx,col+span)===ref) span++;
      var nc=_cloneBlankCellLike(ref || (tpl&&tpl.cells&&tpl.cells[0]) || null);
      if(span>1) nc.setAttribute('colspan',String(span));
      tr.appendChild(nc); col+=span;
    }
    ins.section.insertBefore(tr,ins.before);
    return true;
  }
  function _deleteLogicalRow(table,map,rowIdx){
    if(map.rows.length<=1){ table.remove(); return true; }
    var rowEl=map.rows[rowIdx], target=(rowIdx+1<map.rows.length)?map.rows[rowIdx+1]:null;
    var moves=[], removes=[], shrinks=[];
    map.anchors.forEach(function(info,cell){
      var end=info.row+info.rowspan-1;
      if(info.row===rowIdx){ if(info.rowspan>1) moves.push({cell:cell,info:info}); else removes.push(cell); }
      else if(info.row<rowIdx&&end>=rowIdx) shrinks.push({cell:cell,info:info});
    });
    shrinks.forEach(function(x){ _setSpan(x.cell,'rowspan',x.info.rowspan-1); });
    moves.sort(function(a,b){ return a.info.col-b.info.col; });
    moves.forEach(function(x){
      _setSpan(x.cell,'rowspan',x.info.rowspan-1);
      if(target) _insertCellAtCol(target,x.cell,map.anchors,x.info.col); else x.cell.remove();
    });
    removes.forEach(function(c){ c.remove(); });
    rowEl.remove(); if(!table.querySelector('td,th')) table.remove();
    return true;
  }
  function _insertLogicalCol(table,map,insertCol){
    var width=Math.max(1,map.width||1), colIdx=Math.max(0,Math.min(width,insertCol)), coveredRows={};
    map.anchors.forEach(function(info,cell){
      if(info.col<colIdx && info.col+info.colspan>colIdx){
        _setSpan(cell,'colspan',info.colspan+1);
        for(var r=info.row;r<info.row+info.rowspan;r++) coveredRows[r]=true;
      }
    });
    for(var row=0;row<map.rows.length;row++){
      if(coveredRows[row]) continue;
      var rowEl=map.rows[row], look=Math.min(Math.max(colIdx,0),Math.max(0,width-1));
      var ref=_refCellAt(map,row,look)|| (look>0?_refCellAt(map,row,look-1):null);
      var nc=_cloneBlankCellLike(ref); _insertCellAtCol(rowEl,nc,map.anchors,colIdx);
    }
    return true;
  }
  function _deleteLogicalCol(table,map,colIdx){
    if(map.width<=1){ table.remove(); return true; }
    var col=Math.max(0,Math.min(map.width-1,colIdx));
    map.anchors.forEach(function(info,cell){
      var start=info.col, end=info.col+info.colspan-1;
      if(start===col){ if(info.colspan>1)_setSpan(cell,'colspan',info.colspan-1); else cell.remove(); }
      else if(start<col&&end>=col){ _setSpan(cell,'colspan',info.colspan-1); }
    });
    if(!table.querySelector('td,th')) table.remove();
    return true;
  }

  function edTblAddRow(where){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table||!ctx.cell) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec(where==='above'?'addRowBefore':'addRowAfter','Tiptap chua them duoc hang o day','Tiptap cannot add row here yet'); return; }
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    var insertAt=(where==='above')?cur.row:(cur.row+cur.rowspan);
    var tpl=(where==='above')?Math.min(map.rows.length-1,cur.row):Math.max(0,cur.row+cur.rowspan-1);
    if(_insertLogicalRow(ctx.table,map,insertAt,tpl)){ _afterStructural(ctx.table,'add-row'); }
  }
  function edTblDelRow(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table||!ctx.cell) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec('deleteRow','Tiptap chua xoa duoc hang o day','Tiptap cannot delete row here yet'); return; }
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    if(_deleteLogicalRow(ctx.table,map,cur.row)){ _afterStructural(ctx.table,'delete-row'); }
  }
  function edTblAddCol(where){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table||!ctx.cell) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec(where==='before'?'addColumnBefore':'addColumnAfter','Tiptap chua them duoc cot o day','Tiptap cannot add column here yet'); return; }
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    var insertCol=(where==='before')?cur.col:(cur.col+cur.colspan);
    if(_insertLogicalCol(ctx.table,map,insertCol)){ _afterStructural(ctx.table,'add-col'); }
  }
  function edTblDelCol(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table||!ctx.cell) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec('deleteColumn','Tiptap chua xoa duoc cot o day','Tiptap cannot delete column here yet'); return; }
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    if(_deleteLogicalCol(ctx.table,map,cur.col)){ _afterStructural(ctx.table,'delete-col'); }
  }
  function edTblMergeRight(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell||!ctx.table) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec('mergeCells','Voi Tiptap hay chon nhieu o roi merge','In Tiptap select multiple cells then merge'); return; }
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    var rightCol=cur.col+cur.colspan, rightCell=(map.grid[cur.row]||[])[rightCol];
    if(!rightCell||rightCell===ctx.cell){ _toast('Khong tim thay o ben phai de gop','No cell to the right to merge'); return; }
    var right=map.anchors.get(rightCell); if(!right){ _toast('Khong the gop hai o nay','Unable to merge these cells'); return; }
    var ok=right.row===cur.row && right.col===rightCol && right.rowspan===cur.rowspan;
    if(ok){ for(var rr=cur.row;rr<cur.row+cur.rowspan;rr++){ if(!map.grid[rr]||map.grid[rr][rightCol]!==rightCell){ ok=false; break; } } }
    if(!ok){ _toast('Hai o khong thang hang de gop ngang','Cells are not aligned for horizontal merge'); return; }
    _appendMergedContent(ctx.cell,rightCell); _setSpan(ctx.cell,'colspan',cur.colspan+right.colspan); rightCell.remove();
    _afterStructural(ctx.table,'merge-right');
  }
  function edTblMergeDown(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell||!ctx.table) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec('mergeCells','Voi Tiptap hay chon nhieu o roi merge','In Tiptap select multiple cells then merge'); return; }
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    var nextRow=cur.row+cur.rowspan, downCell=(map.grid[nextRow]||[])[cur.col];
    if(!downCell||downCell===ctx.cell){ _toast('Khong tim thay o ben duoi de gop','No cell below to merge'); return; }
    var down=map.anchors.get(downCell); if(!down){ _toast('Khong the gop hai o nay','Unable to merge these cells'); return; }
    var ok=down.row===nextRow && down.col===cur.col && down.colspan===cur.colspan;
    if(ok){ for(var cc=cur.col;cc<cur.col+cur.colspan;cc++){ if(!map.grid[nextRow]||map.grid[nextRow][cc]!==downCell){ ok=false; break; } } }
    if(!ok){ _toast('Hai o khong thang hang de gop doc','Cells are not aligned for vertical merge'); return; }
    _appendMergedContent(ctx.cell,downCell); _setSpan(ctx.cell,'rowspan',cur.rowspan+down.rowspan); downCell.remove();
    _afterStructural(ctx.table,'merge-down');
  }
  function edTblSplitCell(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell||!ctx.table) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec('splitCell','Tiptap chua split o tu menu nay','Split cell is not available in this Tiptap menu yet'); return; }
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    var colspan=cur.colspan, rowspan=cur.rowspan;
    if(colspan<=1&&rowspan<=1){ _toast('O nay khong co span de tach','This cell is not merged'); return; }
    var source=ctx.cell; source.removeAttribute('colspan'); source.removeAttribute('rowspan');
    var pivot=source;
    for(var c=1;c<colspan;c++){ var top=_cloneBlankCellLike(source); pivot.after(top); pivot=top; }
    var rightBoundary=cur.col+colspan;
    for(var r=cur.row+1;r<cur.row+rowspan&&r<map.rows.length;r++){
      var rowEl=map.rows[r], ref=_findInsertRefByCol(rowEl,map.anchors,rightBoundary);
      for(var k=0;k<colspan;k++){ var extra=_cloneBlankCellLike(source); if(ref) rowEl.insertBefore(extra,ref); else rowEl.appendChild(extra); }
    }
    _afterStructural(ctx.table,'split-cell');
  }

  function _edMoveTabInTable(forward){
    var cell=_cellFromSelection(); if(!cell) return false;
    var table=cell.closest('table'); if(!table) return false;
    if(_isTiptapActive()) return false;
    var map=_buildTableMap(table), order=_orderedCells(map); if(!order.length) return true;
    var idx=order.indexOf(cell); if(idx<0) return true;
    var target=null;
    if(forward){ if(idx<order.length-1) target=order[idx+1]; else { target=_appendWordLikeRow(table,map); if(target){ _afterStructural(table,'tab-append-row'); } } }
    else { if(idx>0) target=order[idx-1]; }
    if(!target) return true;
    _placeCaretAtStart(target);
    return true;
  }

  function edTblToggleHeaderRow(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec('toggleHeaderRow'); return; }
    var map=_buildTableMap(ctx.table), cells=[];
    map.anchors.forEach(function(info,cell){ if(info.row===0) cells.push(cell); });
    if(!cells.length) return;
    var makeTh=!cells.every(function(c){ return c.tagName==='TH'; });
    cells.forEach(function(cell){
      if((makeTh&&cell.tagName==='TH')||(!makeTh&&cell.tagName==='TD')) return;
      var repl=document.createElement(makeTh?'th':'td');
      Array.from(cell.attributes||[]).forEach(function(a){ repl.setAttribute(a.name,a.value); });
      repl.innerHTML=cell.innerHTML; repl.style.cssText=cell.style.cssText||''; cell.replaceWith(repl);
    });
    _markModified();
  }
  function edTblToggleHeaderCol(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    if(_isTiptapActive()){ _tiptapExec('toggleHeaderColumn'); return; }
    var map=_buildTableMap(ctx.table), cells=[];
    map.anchors.forEach(function(info,cell){ if(info.col===0) cells.push(cell); });
    if(!cells.length) return;
    var makeTh=!cells.every(function(c){ return c.tagName==='TH'; });
    cells.forEach(function(cell){
      if((makeTh&&cell.tagName==='TH')||(!makeTh&&cell.tagName==='TD')) return;
      var repl=document.createElement(makeTh?'th':'td');
      Array.from(cell.attributes||[]).forEach(function(a){ repl.setAttribute(a.name,a.value); });
      repl.innerHTML=cell.innerHTML; repl.style.cssText=cell.style.cssText||''; cell.replaceWith(repl);
    });
    _markModified();
  }

  function edTblCellBg(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell) return;
    _closeCtx();
    if(typeof window.edShowColorPopup!=='function') return;
    window.edShowColorPopup(ctx.cell,function(color){
      ctx.cell.style.backgroundColor=(color==='transparent')?'':color;
      _markModified();
    });
  }
  function edTblCellAlign(align){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell) return; _closeCtx();
    var val=String(align||'left').toLowerCase();
    if(['left','center','right','justify'].indexOf(val)<0) val='left';
    ctx.cell.style.textAlign=val;
    _markModified();
  }
  function edTblVertAlign(va){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell) return; _closeCtx();
    var val=String(va||'middle').toLowerCase();
    if(['top','middle','bottom'].indexOf(val)<0) val='middle';
    ctx.cell.style.verticalAlign=val;
    _markModified();
  }
  function edTblRowBgPicker(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell||!ctx.table) return;
    _closeCtx();
    if(typeof window.edShowColorPopup!=='function') return;
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    var targets=[];
    map.anchors.forEach(function(info,cell){
      if(info.row<=cur.row && cur.row<info.row+info.rowspan) targets.push(cell);
    });
    window.edShowColorPopup(ctx.cell,function(color){
      var bg=(color==='transparent')?'':color;
      targets.forEach(function(cell){ cell.style.backgroundColor=bg; });
      _markModified();
    });
  }
  function edTblColBgPicker(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell||!ctx.table) return;
    _closeCtx();
    if(typeof window.edShowColorPopup!=='function') return;
    var map=_buildTableMap(ctx.table), cur=map.anchors.get(ctx.cell); if(!cur) return;
    var targets=[];
    map.anchors.forEach(function(info,cell){
      if(info.col<=cur.col && cur.col<info.col+info.colspan) targets.push(cell);
    });
    window.edShowColorPopup(ctx.cell,function(color){
      var bg=(color==='transparent')?'':color;
      targets.forEach(function(cell){ cell.style.backgroundColor=bg; });
      _markModified();
    });
  }

  function edTblDistributeCols(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var table=ctx.table;
    var colCount=0;
    try{ if(typeof window.edTableGetColCount==='function') colCount=window.edTableGetColCount(table); }catch(e){}
    if(!colCount){ colCount=_buildTableMap(table).width; }
    if(!colCount||colCount<1) return;
    try{
      if(typeof window.edTableApplyFixed==='function') window.edTableApplyFixed(table);
      else table.style.tableLayout='fixed';
    }catch(e){ table.style.tableLayout='fixed'; }
    var total=Math.round(parseFloat(table.style.width)||table.getBoundingClientRect().width||(colCount*120));
    total=Math.max(120,total);
    var each=Math.max(25,Math.floor(total/colCount));
    var rem=Math.max(0,total-each*colCount);
    var done=false;
    try{
      if(typeof window.edTableEnsureColgroup==='function'){
        var ens=window.edTableEnsureColgroup(table,colCount);
        if(ens&&ens.cols&&ens.cols.length){
          for(var i=0;i<ens.cols.length;i++){
            ens.cols[i].style.width=(each+(i===ens.cols.length-1?rem:0))+'px';
          }
          done=true;
        }
      }
    }catch(e){}
    if(!done){
      var pct=(100/colCount).toFixed(4)+'%';
      var first=table.rows&&table.rows[0];
      if(first){
        Array.from(first.cells||[]).forEach(function(cell){
          var sp=_parseSpan(cell,'colspan');
          cell.style.width=(sp>1?(100*sp/colCount).toFixed(4)+'%':pct);
        });
      }
    }
    table.style.width=total+'px';
    table.classList.add('ed-tbl-fixed');
    table.setAttribute('data-ed-autofit','fixed');
    table.setAttribute('data-ed-autofit-lock','1');
    _afterStructural(table,'distribute-cols');
  }
  function edTblDistributeRows(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var rows=Array.from(ctx.table.rows||[]); if(!rows.length) return;
    var total=0; rows.forEach(function(r){ total+=Math.max(20,Math.round(r.getBoundingClientRect().height||20)); });
    var each=Math.max(20,Math.round(total/rows.length));
    rows.forEach(function(r){ r.style.height=each+'px'; });
    _markModified();
  }
  function _applyAutoFitTable(t,mode){
    if(!t) return false;
    var m=String(mode==null?'':mode).toLowerCase();
    if(m==='window'){
      t.setAttribute('data-ed-autofit','balanced');
      t.setAttribute('data-ed-autofit-lock','0');
      if(typeof window.edTableApplyAutoPolicy==='function'){
        window.edTableApplyAutoPolicy(t,{force:true,source:'ctx-autofit-window'});
      }else{
        t.style.width='100%'; t.style.tableLayout='auto'; t.classList.remove('ed-tbl-fixed');
        t.querySelectorAll('colgroup col').forEach(function(col){ col.style.width=''; });
      }
    }else if(m==='content'||m==='contents'){
      t.setAttribute('data-ed-autofit','balanced');
      t.setAttribute('data-ed-autofit-lock','0');
      if(typeof window.edTableApplyAutoPolicy==='function'){
        window.edTableApplyAutoPolicy(t,{force:true,source:'ctx-autofit-content'});
      }else{
        t.style.width=''; t.style.tableLayout='auto'; t.classList.remove('ed-tbl-fixed');
        t.querySelectorAll('colgroup col').forEach(function(col){ col.style.width=''; });
      }
    }else if(m==='fixed'){
      t.setAttribute('data-ed-autofit','fixed');
      t.setAttribute('data-ed-autofit-lock','1');
      try{ if(typeof window.edTableApplyFixed==='function') window.edTableApplyFixed(t); else t.style.tableLayout='fixed'; }catch(e){ t.style.tableLayout='fixed'; }
    }else{
      return false;
    }
    _syncColgroup(t);
    _reflowTable(t,'autofit-'+m);
    _updateBar(t);
    return true;
  }
  function edTblAutoFit(mode){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    if(_applyAutoFitTable(ctx.table,mode)) _markModified();
  }
  function edTblWidth(w){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var table=ctx.table;
    table.style.width=_sanitizeWidth(w,table.style.width||'100%');
    table.style.tableLayout='auto';
    table.classList.remove('ed-tbl-fixed');
    table.setAttribute('data-ed-autofit','balanced');
    table.setAttribute('data-ed-autofit-lock','0');
    table.querySelectorAll('colgroup col').forEach(function(col){ col.style.width=''; });
    table.querySelectorAll('td,th').forEach(function(cell){ cell.style.width=''; });
    _afterStructural(table,'table-width');
  }
  function edTblAlignTable(align){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var table=ctx.table;
    var val=String(align||'left').toLowerCase();
    if(val==='center'){ table.style.marginLeft='auto'; table.style.marginRight='auto'; }
    else if(val==='right'){ table.style.marginLeft='auto'; table.style.marginRight='0'; }
    else { table.style.marginLeft=''; table.style.marginRight=''; }
    _afterStructural(table,'table-align');
  }
  function edTblClearCell(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.cell) return; _closeCtx();
    ctx.cell.innerHTML='&nbsp;';
    _markModified();
  }
  function edTblBorderPicker(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var table=ctx.table;
    var root=(typeof window.edGetModalRoot==='function')?window.edGetModalRoot():null;
    if(!root) return;
    var vi=_isVi();
    var cs=getComputedStyle(table);
    var borderW=Math.max(0,Math.min(12,parseInt(cs.borderTopWidth,10)||1));
    var borderStyle=String(cs.borderTopStyle||'solid').toLowerCase();
    if(['solid','dashed','dotted'].indexOf(borderStyle)<0) borderStyle='solid';
    var borderColor=_toHexColor(cs.borderTopColor,'#cbd5e1');
    var html='';
    html+='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal">';
    html+='<h4>'+(vi?'Table Border':'Table Border')+'</h4>';
    html+='<div style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap">';
    [0,1,2,3,4].forEach(function(w){
      html+='<button style="padding:6px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:11px;font-weight:600" onclick="edApplyTblBorder('+w+')">'+(w===0?'None':(w+'px'))+'</button>';
    });
    html+='</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
    html+='<div><label>'+(vi?'Style':'Style')+'</label><select id="ed-tbl-bstyle"><option value="solid"'+(borderStyle==='solid'?' selected':'')+'>solid</option><option value="dashed"'+(borderStyle==='dashed'?' selected':'')+'>dashed</option><option value="dotted"'+(borderStyle==='dotted'?' selected':'')+'>dotted</option></select></div>';
    html+='<div><label>'+(vi?'Color':'Color')+'</label><input id="ed-tbl-bc" type="color" value="'+borderColor+'"></div>';
    html+='</div>';
    html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Close':'Close')+'</button><button class="ed-m-ok" onclick="edApplyTblBorderColor(document.getElementById(\'ed-tbl-bc\').value)">'+(vi?'Apply':'Apply')+'</button></div>';
    html+='</div></div>';
    root.innerHTML=html;
    root._tblBorderTarget=table;
  }
  function edApplyTblBorder(w){
    var root=(typeof window.edGetModalRoot==='function')?window.edGetModalRoot():null;
    var table=root?root._tblBorderTarget:null; if(!table) return;
    var width=Math.max(0,Math.min(12,parseInt(w,10)||0));
    var style='solid';
    var styleEl=document.getElementById('ed-tbl-bstyle');
    if(styleEl){ style=String(styleEl.value||'solid').toLowerCase(); }
    if(['solid','dashed','dotted'].indexOf(style)<0) style='solid';
    var color='#cbd5e1';
    var cEl=document.getElementById('ed-tbl-bc');
    if(cEl) color=_toHexColor(cEl.value,'#cbd5e1');
    if(width<=0){
      table.style.border='none';
      table.querySelectorAll('td,th').forEach(function(c){ c.style.border='none'; });
    }else{
      var rule=width+'px '+style+' '+color;
      table.style.border=rule;
      table.querySelectorAll('td,th').forEach(function(c){ c.style.border=rule; });
    }
    _markModified();
  }
  function edApplyTblBorderColor(color){
    var root=(typeof window.edGetModalRoot==='function')?window.edGetModalRoot():null;
    var table=root?root._tblBorderTarget:null; if(!table) return;
    var hex=_toHexColor(color,'#cbd5e1');
    var cs=getComputedStyle(table);
    var width=Math.max(0,Math.min(12,parseInt(cs.borderTopWidth,10)||1));
    var style=String(cs.borderTopStyle||'solid').toLowerCase();
    if(['solid','dashed','dotted'].indexOf(style)<0) style='solid';
    if(width<=0||style==='none'){
      table.style.border='none';
      table.querySelectorAll('td,th').forEach(function(c){ c.style.border='none'; });
    }else{
      var rule=width+'px '+style+' '+hex;
      table.style.border=rule;
      table.querySelectorAll('td,th').forEach(function(c){ c.style.borderColor=hex; });
    }
    _markModified();
    try{ if(typeof window.edCloseModal==='function') window.edCloseModal(); }catch(e){}
  }
  function edTblRadiusPicker(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var table=ctx.table;
    var root=(typeof window.edGetModalRoot==='function')?window.edGetModalRoot():null;
    if(!root) return;
    var vi=_isVi();
    var html='';
    html+='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal">';
    html+='<h4>'+(vi?'Table Radius':'Table Radius')+'</h4>';
    html+='<div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap">';
    [0,4,8,12,16,20].forEach(function(r){
      html+='<button style="width:56px;height:40px;border:2px solid #1967d2;border-radius:'+r+'px;background:#e8f0fe;cursor:pointer;font-size:11px;font-weight:600" onclick="edApplyTblRadius('+r+')">'+r+'px</button>';
    });
    html+='</div>';
    html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Close':'Close')+'</button></div>';
    html+='</div></div>';
    root.innerHTML=html;
    root._tblRadiusTarget=table;
  }
  function edApplyTblRadius(r){
    var root=(typeof window.edGetModalRoot==='function')?window.edGetModalRoot():null;
    var table=root?root._tblRadiusTarget:null; if(!table) return;
    var radius=Math.max(0,Math.min(40,parseInt(r,10)||0));
    table.style.borderRadius=radius+'px';
    if(radius>0){
      table.style.overflow='hidden';
      table.style.borderCollapse='separate';
      table.style.borderSpacing=table.style.borderSpacing||'0';
      if(!table.style.border||table.style.border==='none'){
        table.style.border='1px solid #cbd5e1';
      }
    }else{
      table.style.overflow='';
    }
    _markModified();
    try{ if(typeof window.edCloseModal==='function') window.edCloseModal(); }catch(e){}
  }

  function _tableAlignValue(table){
    var ml=String(table.style.marginLeft||'').trim();
    var mr=String(table.style.marginRight||'').trim();
    if(ml==='auto'&&mr==='auto') return 'center';
    if(ml==='auto'&&(mr==='0px'||mr==='0')) return 'right';
    return 'left';
  }
  function _headerState(table,axis){
    var map=_buildTableMap(table), cells=[];
    map.anchors.forEach(function(info,cell){
      if(axis==='row' && info.row===0) cells.push(cell);
      if(axis==='col' && info.col===0) cells.push(cell);
    });
    return cells.length>0 && cells.every(function(c){ return c.tagName==='TH'; });
  }
  function _applyHeaderState(table,axis,wantTh){
    var map=_buildTableMap(table);
    map.anchors.forEach(function(info,cell){
      var hit=(axis==='row'&&info.row===0)||(axis==='col'&&info.col===0);
      if(!hit) return;
      if((wantTh&&cell.tagName==='TH')||(!wantTh&&cell.tagName==='TD')) return;
      var repl=document.createElement(wantTh?'th':'td');
      Array.from(cell.attributes||[]).forEach(function(a){ repl.setAttribute(a.name,a.value); });
      repl.innerHTML=cell.innerHTML;
      repl.style.cssText=cell.style.cssText||'';
      cell.replaceWith(repl);
    });
  }

  function edTblDelete(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var ok=false;
    try{ ok=window.confirm(_isVi()?'Xoa bang nay?':'Delete this table?'); }catch(e){ ok=false; }
    if(!ok) return;
    ctx.table.remove();
    _markModified();
  }

  function edTblProperties(){
    var ctx=_resolveCtx(); if(!ctx||!ctx.table) return; _closeCtx();
    var table=ctx.table;
    var root=(typeof window.edGetModalRoot==='function')?window.edGetModalRoot():null;
    if(!root) return;
    var cs=getComputedStyle(table);
    var firstCell=table.querySelector('td,th');
    var ccs=firstCell?getComputedStyle(firstCell):null;
    var vi=_isVi();
    var widthVal=table.style.width || (Math.max(120,Math.round(table.getBoundingClientRect().width||600))+'px');
    var alignVal=_tableAlignValue(table);
    var layoutVal=String(table.style.tableLayout||cs.tableLayout||'auto').toLowerCase();
    if(layoutVal!=='fixed') layoutVal='auto';
    var borderW=Math.max(0,Math.min(12,parseInt(cs.borderTopWidth,10)||1));
    var borderStyle=String(cs.borderTopStyle||'solid').toLowerCase();
    if(['solid','dashed','dotted','double','none'].indexOf(borderStyle)<0) borderStyle='solid';
    var borderColor=_toHexColor(cs.borderTopColor || (firstCell?getComputedStyle(firstCell).borderTopColor:''), '#cbd5e1');
    var pad=Math.max(0,Math.min(60,parseInt(ccs?ccs.paddingTop:'8',10)||8));
    var space=Math.max(0,Math.min(30,parseInt(table.style.borderSpacing||'0',10)||0));
    var caption=table.caption?String(table.caption.textContent||''):'';
    var headRow=_headerState(table,'row');
    var headCol=_headerState(table,'col');

    var html='';
    html+='<div class="ed-modal-overlay" onclick="if(event.target===this)edCloseModal()"><div class="ed-modal">';
    html+='<h4>'+(vi?'Table Properties':'Table Properties')+'</h4>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    html+='<div><label>'+ (vi?'Width':'Width') +'</label><input id="ed-tp-w" value="'+_escapeHtml(widthVal)+'"></div>';
    html+='<div><label>'+ (vi?'Layout':'Layout') +'</label><select id="ed-tp-layout"><option value="auto"'+(layoutVal==='auto'?' selected':'')+'>Auto</option><option value="fixed"'+(layoutVal==='fixed'?' selected':'')+'>Fixed</option></select></div>';
    html+='<div><label>'+ (vi?'Alignment':'Alignment') +'</label><select id="ed-tp-align"><option value="left"'+(alignVal==='left'?' selected':'')+'>Left</option><option value="center"'+(alignVal==='center'?' selected':'')+'>Center</option><option value="right"'+(alignVal==='right'?' selected':'')+'>Right</option></select></div>';
    html+='<div><label>'+ (vi?'Autofit':'Autofit') +'</label><select id="ed-tp-fit"><option value="none">None</option><option value="window">To Window</option><option value="content">To Content</option><option value="fixed">Keep Fixed</option></select></div>';
    html+='<div><label>'+ (vi?'Border Width':'Border Width') +'</label><input id="ed-tp-border" type="number" min="0" max="12" value="'+borderW+'"></div>';
    html+='<div><label>'+ (vi?'Border Style':'Border Style') +'</label><select id="ed-tp-bs"><option value="solid"'+(borderStyle==='solid'?' selected':'')+'>solid</option><option value="dashed"'+(borderStyle==='dashed'?' selected':'')+'>dashed</option><option value="dotted"'+(borderStyle==='dotted'?' selected':'')+'>dotted</option><option value="double"'+(borderStyle==='double'?' selected':'')+'>double</option><option value="none"'+(borderStyle==='none'?' selected':'')+'>none</option></select></div>';
    html+='<div><label>'+ (vi?'Border Color':'Border Color') +'</label><input id="ed-tp-bc" type="color" value="'+borderColor+'"></div>';
    html+='<div><label>'+ (vi?'Cell Padding':'Cell Padding') +'</label><input id="ed-tp-pad" type="number" min="0" max="60" value="'+pad+'"></div>';
    html+='<div><label>'+ (vi?'Cell Spacing':'Cell Spacing') +'</label><input id="ed-tp-space" type="number" min="0" max="30" value="'+space+'"></div>';
    html+='<div><label>'+ (vi?'Caption':'Caption') +'</label><input id="ed-tp-cap" value="'+_escapeHtml(caption)+'"></div>';
    html+='</div>';
    html+='<div style="display:flex;gap:12px;margin-top:10px;align-items:center;flex-wrap:wrap">';
    html+='<label style="font-size:12px"><input type="checkbox" id="ed-tp-hr"'+(headRow?' checked':'')+'> Header Row</label>';
    html+='<label style="font-size:12px"><input type="checkbox" id="ed-tp-hc"'+(headCol?' checked':'')+'> Header Col</label>';
    html+='</div>';
    html+='<div class="ed-modal-actions"><button class="ed-m-cancel" onclick="edCloseModal()">'+(vi?'Huy':'Cancel')+'</button><button class="ed-m-ok" onclick="edApplyTblProps()">'+(vi?'Ap dung':'Apply')+'</button></div>';
    html+='</div></div>';
    root.innerHTML=html;
    root._tblPropTarget=table;
  }

  function edApplyTblProps(){
    var root=(typeof window.edGetModalRoot==='function')?window.edGetModalRoot():null;
    if(!root||!root._tblPropTarget) return;
    var table=root._tblPropTarget;
    var widthVal=_sanitizeWidth(document.getElementById('ed-tp-w').value,table.style.width||'100%');
    var alignVal=String(document.getElementById('ed-tp-align').value||'left').toLowerCase();
    var layoutVal=String(document.getElementById('ed-tp-layout').value||'auto').toLowerCase();
    var fitVal=String(document.getElementById('ed-tp-fit').value||'none').toLowerCase();
    var borderW=Math.max(0,Math.min(12,parseInt(document.getElementById('ed-tp-border').value,10)||0));
    var borderStyle=String(document.getElementById('ed-tp-bs').value||'solid').toLowerCase();
    var borderColor=_toHexColor(document.getElementById('ed-tp-bc').value,'#cbd5e1');
    var pad=Math.max(0,Math.min(60,parseInt(document.getElementById('ed-tp-pad').value,10)||0));
    var space=Math.max(0,Math.min(30,parseInt(document.getElementById('ed-tp-space').value,10)||0));
    var caption=String(document.getElementById('ed-tp-cap').value||'').trim();
    var headRow=!!document.getElementById('ed-tp-hr').checked;
    var headCol=!!document.getElementById('ed-tp-hc').checked;

    table.style.width=widthVal;
    if(alignVal==='center'){ table.style.marginLeft='auto'; table.style.marginRight='auto'; }
    else if(alignVal==='right'){ table.style.marginLeft='auto'; table.style.marginRight='0'; }
    else { table.style.marginLeft=''; table.style.marginRight=''; }

    if(layoutVal==='fixed'){
      table.setAttribute('data-ed-autofit','fixed');
      table.setAttribute('data-ed-autofit-lock','1');
      try{ if(typeof window.edTableApplyFixed==='function') window.edTableApplyFixed(table); else table.style.tableLayout='fixed'; }catch(e){ table.style.tableLayout='fixed'; }
    }else{
      table.style.tableLayout='auto';
      table.classList.remove('ed-tbl-fixed');
      table.setAttribute('data-ed-autofit','balanced');
      table.setAttribute('data-ed-autofit-lock','0');
    }

    if(borderW<=0||borderStyle==='none'){
      table.style.border='none';
      table.querySelectorAll('td,th').forEach(function(c){ c.style.border='none'; });
    }else{
      var rule=borderW+'px '+borderStyle+' '+borderColor;
      table.style.border=rule;
      table.querySelectorAll('td,th').forEach(function(c){ c.style.border=rule; });
    }

    table.style.borderSpacing=space+'px';
    table.style.borderCollapse=space>0?'separate':'collapse';
    table.querySelectorAll('td,th').forEach(function(c){ c.style.padding=pad+'px'; });

    if(caption){
      var cap=table.caption;
      if(!cap){ cap=document.createElement('caption'); table.insertBefore(cap,table.firstChild); }
      cap.textContent=caption;
      cap.style.captionSide='top';
      cap.style.textAlign='left';
      cap.style.fontWeight='600';
      cap.style.padding='4px 0';
    }else if(table.caption){
      table.caption.remove();
    }

    _applyHeaderState(table,'row',headRow);
    _applyHeaderState(table,'col',headCol);

    if(fitVal!=='none') _applyAutoFitTable(table,fitVal);
    else if(layoutVal!=='fixed') _reflowTable(table,'table-props-auto');

    _afterStructural(table,'table-props');
    try{ if(typeof window.edCloseModal==='function') window.edCloseModal(); }catch(e){}
  }

  function _tableMenuCellState(cell,table){
    var align='left', vAlign='middle';
    try{
      var cs=cell?getComputedStyle(cell):null;
      if(cs){
        align=String(cs.textAlign||'left').toLowerCase();
        vAlign=String(cs.verticalAlign||'middle').toLowerCase();
      }
    }catch(e){}
    if(align==='start') align='left';
    if(align==='end') align='right';
    if(['left','center','right','justify'].indexOf(align)<0) align='left';
    if(vAlign==='center') vAlign='middle';
    if(['top','middle','bottom'].indexOf(vAlign)<0) vAlign='middle';
    return {
      headerRow:_headerState(table,'row'),
      headerCol:_headerState(table,'col'),
      align:align,
      vAlign:vAlign
    };
  }
  function _tableMenuButtonHtml(item){
    var cls='ed-table-menu-btn';
    if(item.danger) cls+=' is-danger';
    if(item.active) cls+=' is-active';
    return '<button type="button" class="'+cls+'" data-action="'+_escapeHtml(item.action)+'" title="'+_escapeHtml(item.tip||item.label)+'">'
      +'<span class="ed-table-menu-ico">'+_escapeHtml(item.icon||'')+'</span>'
      +'<span class="ed-table-menu-label">'+_escapeHtml(item.label||'')+'</span>'
      +'</button>';
  }
  function _tableMenuSectionHtml(title,items){
    return '<section class="ed-table-menu-section">'
      +'<div class="ed-table-menu-section-title">'+_escapeHtml(title)+'</div>'
      +'<div class="ed-table-menu-section-grid">'+items.map(_tableMenuButtonHtml).join('')+'</div>'
      +'</section>';
  }
  function _tableMenuSections(vi,state){
    return [
      {
        title:vi?'Hàng':'Rows',
        items:[
          {action:'row-above',icon:'↑',label:vi?'Chèn trên':'Insert above',tip:vi?'Thêm hàng phía trên':'Insert row above'},
          {action:'row-below',icon:'↓',label:vi?'Chèn dưới':'Insert below',tip:vi?'Thêm hàng phía dưới':'Insert row below'},
          {action:'row-distribute',icon:'≡',label:vi?'Đều hàng':'Even rows',tip:vi?'Chia đều chiều cao hàng':'Distribute row height'},
          {action:'row-delete',icon:'✕',label:vi?'Xóa hàng':'Delete row',tip:vi?'Xóa hàng hiện tại':'Delete current row',danger:true}
        ]
      },
      {
        title:vi?'Cột':'Columns',
        items:[
          {action:'col-before',icon:'←',label:vi?'Chèn trái':'Insert left',tip:vi?'Thêm cột bên trái':'Insert column to the left'},
          {action:'col-after',icon:'→',label:vi?'Chèn phải':'Insert right',tip:vi?'Thêm cột bên phải':'Insert column to the right'},
          {action:'col-distribute',icon:'⇆',label:vi?'Đều cột':'Even cols',tip:vi?'Chia đều chiều rộng cột':'Distribute column width'},
          {action:'col-delete',icon:'✕',label:vi?'Xóa cột':'Delete col',tip:vi?'Xóa cột hiện tại':'Delete current column',danger:true}
        ]
      },
      {
        title:vi?'Gộp ô':'Merge',
        items:[
          {action:'merge-right',icon:'⇥',label:vi?'Gộp phải':'Merge right',tip:vi?'Gộp với ô bên phải':'Merge with right cell'},
          {action:'merge-down',icon:'⇩',label:vi?'Gộp xuống':'Merge down',tip:vi?'Gộp với ô bên dưới':'Merge with cell below'},
          {action:'split-cell',icon:'⊞',label:vi?'Tách ô':'Split cell',tip:vi?'Tách ô đã gộp':'Split merged cell'}
        ]
      },
      {
        title:vi?'Ô hiện tại':'Cell',
        items:[
          {action:'align-left',icon:'⟸',label:vi?'Căn trái':'Align left',tip:vi?'Căn trái nội dung ô':'Align cell content left',active:state.align==='left'},
          {action:'align-center',icon:'≡',label:vi?'Căn giữa':'Align center',tip:vi?'Căn giữa nội dung ô':'Align cell content center',active:state.align==='center'},
          {action:'align-right',icon:'⟹',label:vi?'Căn phải':'Align right',tip:vi?'Căn phải nội dung ô':'Align cell content right',active:state.align==='right'},
          {action:'valign-top',icon:'⤒',label:vi?'Trên':'Top',tip:vi?'Canh trên theo chiều dọc':'Align top',active:state.vAlign==='top'},
          {action:'valign-middle',icon:'↕',label:vi?'Giữa dọc':'Middle',tip:vi?'Canh giữa theo chiều dọc':'Align middle',active:state.vAlign==='middle'},
          {action:'valign-bottom',icon:'⤓',label:vi?'Dưới':'Bottom',tip:vi?'Canh dưới theo chiều dọc':'Align bottom',active:state.vAlign==='bottom'},
          {action:'clear-cell',icon:'⌫',label:vi?'Xóa nội dung':'Clear cell',tip:vi?'Xóa nội dung ô hiện tại':'Clear current cell'}
        ]
      },
      {
        title:vi?'Header':'Headers',
        items:[
          {action:'header-row',icon:'H↔',label:vi?'Header hàng':'Header row',tip:vi?'Bật hoặc tắt hàng tiêu đề':'Toggle header row',active:!!state.headerRow},
          {action:'header-col',icon:'H↕',label:vi?'Header cột':'Header col',tip:vi?'Bật hoặc tắt cột tiêu đề':'Toggle header column',active:!!state.headerCol}
        ]
      },
      {
        title:vi?'Màu & Viền':'Style',
        items:[
          {action:'bg-cell',icon:'◧',label:vi?'Màu ô':'Cell fill',tip:vi?'Tô màu ô hiện tại':'Fill current cell'},
          {action:'bg-row',icon:'☰',label:vi?'Màu hàng':'Row fill',tip:vi?'Tô màu cả hàng':'Fill row'},
          {action:'bg-col',icon:'▥',label:vi?'Màu cột':'Col fill',tip:vi?'Tô màu cả cột':'Fill column'},
          {action:'border',icon:'▣',label:vi?'Viền bảng':'Borders',tip:vi?'Chỉnh viền bảng':'Table borders'},
          {action:'radius',icon:'◔',label:vi?'Bo góc':'Radius',tip:vi?'Bo góc bảng':'Table corner radius'}
        ]
      },
      {
        title:vi?'Bảng':'Table',
        items:[
          {action:'fit-window',icon:'⤢',label:vi?'Vừa khung':'Fit page',tip:vi?'Canh bảng vừa theo khung trang':'Auto fit table to page width'},
          {action:'fit-content',icon:'⤡',label:vi?'Vừa nội dung':'Fit content',tip:vi?'Tự co giãn theo nội dung':'Auto fit to content'},
          {action:'fit-fixed',icon:'⛶',label:vi?'Cố định':'Fixed layout',tip:vi?'Giữ chiều rộng cột cố định':'Keep fixed column widths'},
          {action:'properties',icon:'⚙',label:vi?'Thuộc tính':'Properties',tip:vi?'Mở thuộc tính chi tiết của bảng':'Open table properties'},
          {action:'delete-table',icon:'🗑',label:vi?'Xóa bảng':'Delete table',tip:vi?'Xóa toàn bộ bảng':'Delete table',danger:true}
        ]
      }
    ];
  }
  function _runTableMenuAction(action){
    switch(String(action||'')){
      case 'row-above': edTblAddRow('above'); return true;
      case 'row-below': edTblAddRow('below'); return true;
      case 'row-distribute': edTblDistributeRows(); return true;
      case 'row-delete': edTblDelRow(); return true;
      case 'col-before': edTblAddCol('before'); return true;
      case 'col-after': edTblAddCol('after'); return true;
      case 'col-distribute': edTblDistributeCols(); return true;
      case 'col-delete': edTblDelCol(); return true;
      case 'merge-right': edTblMergeRight(); return true;
      case 'merge-down': edTblMergeDown(); return true;
      case 'split-cell': edTblSplitCell(); return true;
      case 'align-left': edTblCellAlign('left'); return true;
      case 'align-center': edTblCellAlign('center'); return true;
      case 'align-right': edTblCellAlign('right'); return true;
      case 'valign-top': edTblVertAlign('top'); return true;
      case 'valign-middle': edTblVertAlign('middle'); return true;
      case 'valign-bottom': edTblVertAlign('bottom'); return true;
      case 'clear-cell': edTblClearCell(); return true;
      case 'header-row': edTblToggleHeaderRow(); return true;
      case 'header-col': edTblToggleHeaderCol(); return true;
      case 'bg-cell': edTblCellBg(); return true;
      case 'bg-row': edTblRowBgPicker(); return true;
      case 'bg-col': edTblColBgPicker(); return true;
      case 'border': edTblBorderPicker(); return true;
      case 'radius': edTblRadiusPicker(); return true;
      case 'fit-window': edTblAutoFit('window'); return true;
      case 'fit-content': edTblAutoFit('content'); return true;
      case 'fit-fixed': edTblAutoFit('fixed'); return true;
      case 'properties': edTblProperties(); return true;
      case 'delete-table': edTblDelete(); return true;
      default: return false;
    }
  }
  function _positionTableMenu(menu,x,y){
    if(!menu) return;
    var gap=12;
    var width=menu.offsetWidth||360;
    var height=menu.offsetHeight||320;
    var left=Math.max(gap,Math.min(x,window.innerWidth-width-gap));
    var top=Math.max(gap,Math.min(y,window.innerHeight-height-gap));
    menu.style.left=left+'px';
    menu.style.top=top+'px';
  }

  function edShowTableMenu(x,y,cell){
    _closeCtx();
    if(!cell) return;
    var table=cell.closest('table'), tr=cell.closest('tr');
    if(!table||!tr) return;
    var map=_buildTableMap(table), inf=map.anchors.get(cell);
    var logicalIdx=inf?inf.col:Array.from(tr.children).indexOf(cell);
    var vi=_isVi();
    var state=_tableMenuCellState(cell,table);
    var menu=document.createElement('div');
    menu.className='ed-ctx-menu ed-table-menu';
    menu.id='ed-ctx-menu';
    menu.innerHTML=''
      +'<div class="ed-table-menu-head">'
      +'<div class="ed-table-menu-title">'+_escapeHtml(vi?'Công cụ bảng':'Table tools')+'</div>'
      +'<div class="ed-table-menu-subtitle">'+_escapeHtml(vi?'Lệnh nhanh cho hàng, cột, ô và bố cục bảng':'Quick actions for rows, columns, cells, and layout')+'</div>'
      +'</div>'
      +'<div class="ed-table-menu-sections">'
      +_tableMenuSections(vi,state).map(function(section){ return _tableMenuSectionHtml(section.title,section.items); }).join('')
      +'</div>';
    document.body.appendChild(menu);
    _positionTableMenu(menu,x,y);
    menu._cell=cell; menu._table=table; menu._tr=tr; menu._cellIdx=logicalIdx;
    menu.addEventListener('click',function(e){
      var btn=e.target.closest('.ed-table-menu-btn');
      if(!btn||!menu.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      _runTableMenuAction(btn.getAttribute('data-action'));
    });
    requestAnimationFrame(function(){ _positionTableMenu(menu,x,y); });
    setTimeout(function(){
      document.addEventListener('click',function _cl(e){
        if(!menu.contains(e.target)){ _closeCtx(); document.removeEventListener('click',_cl); }
      });
    },10);
  }

  window.edTblAddRow=edTblAddRow;
  window.edTblDelRow=edTblDelRow;
  window.edTblAddCol=edTblAddCol;
  window.edTblDelCol=edTblDelCol;
  window.edTblMergeRight=edTblMergeRight;
  window.edTblMergeDown=edTblMergeDown;
  window.edTblSplitCell=edTblSplitCell;
  window.edTblCellBg=edTblCellBg;
  window.edTblCellAlign=edTblCellAlign;
  window.edTblVertAlign=edTblVertAlign;
  window.edTblRowBgPicker=edTblRowBgPicker;
  window.edTblColBgPicker=edTblColBgPicker;
  window.edTblToggleHeaderRow=edTblToggleHeaderRow;
  window.edTblToggleHeaderCol=edTblToggleHeaderCol;
  window.edTblDistributeCols=edTblDistributeCols;
  window.edTblDistributeRows=edTblDistributeRows;
  window.edTblAutoFit=edTblAutoFit;
  window.edTblWidth=edTblWidth;
  window.edTblAlignTable=edTblAlignTable;
  window.edTblClearCell=edTblClearCell;
  window.edTblBorderPicker=edTblBorderPicker;
  window.edApplyTblBorder=edApplyTblBorder;
  window.edApplyTblBorderColor=edApplyTblBorderColor;
  window.edTblRadiusPicker=edTblRadiusPicker;
  window.edApplyTblRadius=edApplyTblRadius;
  window.edTblDelete=edTblDelete;
  window.edTblProperties=edTblProperties;
  window.edApplyTblProps=edApplyTblProps;
  window.edShowTableMenu=edShowTableMenu;
  window._edMoveTabInTable=_edMoveTabInTable;
  window.edCommandsTable={
    addRow:edTblAddRow,delRow:edTblDelRow,addCol:edTblAddCol,delCol:edTblDelCol,
    mergeRight:edTblMergeRight,mergeDown:edTblMergeDown,splitCell:edTblSplitCell,
    cellBg:edTblCellBg,cellAlign:edTblCellAlign,vertAlign:edTblVertAlign,
    rowBg:edTblRowBgPicker,colBg:edTblColBgPicker,
    toggleHeaderRow:edTblToggleHeaderRow,toggleHeaderCol:edTblToggleHeaderCol,
    distributeCols:edTblDistributeCols,distributeRows:edTblDistributeRows,
    borderPicker:edTblBorderPicker,radiusPicker:edTblRadiusPicker,
    applyBorder:edApplyTblBorder,applyBorderColor:edApplyTblBorderColor,applyRadius:edApplyTblRadius,
    autoFit:edTblAutoFit,width:edTblWidth,alignTable:edTblAlignTable,clearCell:edTblClearCell,
    deleteTable:edTblDelete,properties:edTblProperties,applyProperties:edApplyTblProps,
    moveTabInTable:_edMoveTabInTable,showMenu:edShowTableMenu
  };
})();
