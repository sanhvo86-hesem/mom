/* ============================================================================
   HESEM MOM Module Builder Engine v3.0
   Core file that renders ALL modules from JSON schemas.
   - Reads module schema JSON (from API or localStorage)
   - Renders tabs + blocks based on schema
   - Edit mode: block toolbar, add/remove/reorder blocks, drag-drop
   - API binding: blocks fetch data from configured API endpoints
   - Advanced data table v3 with sort/filter/resize/pagination/inline-edit
   - Reactive data binding with {{ expression }} evaluation
   - Computed fields & formula engine
   - Conditional visibility per block
   - Event system with action triggers & chaining
   - Undo/redo for schema changes
   - Drag-drop block reordering (HTML5 native)
   - Dependency graph & auto-refresh chain
   - Theme variants & block templates
   - Slot system for block composition
   - Keyboard shortcuts for edit mode
   - User overrides saved to localStorage
   ============================================================================ */
(function(){
'use strict';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function _t(vi,en){ return (typeof lang!=='undefined'&&lang==='en')?en:vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(v==null?'':String(v))); return d.innerHTML; }
function _textLabel(label, labelEn){
  if(label && typeof label === 'object') return _t(label.vi || label.label || '', label.en || label.labelEn || label.vi || '');
  return _t(label || '', labelEn || label || '');
}
function _apiErrorMessage(resp, fallbackVi, fallbackEn){
  if(resp && typeof resp === 'object'){
    if(resp.detail) return String(resp.detail);
    if(resp.message) return String(resp.message);
    if(resp.error) return String(resp.error);
  }
  return _t(fallbackVi, fallbackEn);
}
function _readDataPath(source, path){
  var current = source;
  var parts;
  var i;
  if(!path) return source;
  if(source == null) return undefined;
  if(typeof path !== 'string') return source[path];
  if(Object.prototype.hasOwnProperty.call(source, path)) return source[path];
  parts = path.split('.');
  for(i = 0; i < parts.length; i++){
    if(current == null) return undefined;
    current = current[parts[i]];
  }
  return current;
}

/** Internal API wrapper — delegates to global apiCall() when available */
function _api(action, payload, method){
  if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000);
  return fetch('api.php?action='+encodeURIComponent(action),{
    method: method||'POST', credentials:'include',
    headers:{'Content-Type':'application/json',
      ...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},
    body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})
  }).then(function(r){ return r.json(); });
}

/** Format a number with thousands separator */
function _fmt(n){
  if(n==null) return '0';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
}

/** Generate a short unique ID */
function _uid(){ return 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/** Deep clone helper */
function _clone(obj){ return JSON.parse(JSON.stringify(obj)); }

var _exprCache = {};
var _exprFilters = {
  number: function(value){
    if(value == null || value === '') return '';
    var num = typeof value === 'number' ? value : Number(value);
    if(isNaN(num)) return value;
    return _fmt(num);
  },
  currency: function(value){
    if(value == null || value === '') return '';
    var num = typeof value === 'number' ? value : Number(value);
    if(isNaN(num)) return value;
    return _fmt(num) + ' ₫';
  },
  date: function(value){
    if(value == null || value === '') return '';
    var date = value instanceof Date ? value : new Date(value);
    if(!date || isNaN(date.getTime())) return value;
    var dd = String(date.getDate());
    var mm = String(date.getMonth() + 1);
    var yyyy = String(date.getFullYear());
    if(dd.length < 2) dd = '0' + dd;
    if(mm.length < 2) mm = '0' + mm;
    return dd + '/' + mm + '/' + yyyy;
  }
};

function _exprToken(type, value){
  return { type:type, value:value };
}

function _tokenizeExpr(expr){
  var tokens = [];
  var i = 0;
  var ch;
  var pair3;
  var pair2;
  while(i < expr.length){
    ch = expr.charAt(i);
    if(/\s/.test(ch)){
      i++;
      continue;
    }
    pair3 = expr.slice(i, i + 3);
    if(pair3 === '===' || pair3 === '!=='){
      tokens.push(_exprToken('op', pair3));
      i += 3;
      continue;
    }
    pair2 = expr.slice(i, i + 2);
    if(pair2 === '&&' || pair2 === '||' || pair2 === '==' || pair2 === '!=' || pair2 === '>=' || pair2 === '<='){
      tokens.push(_exprToken('op', pair2));
      i += 2;
      continue;
    }
    if(ch === '"' || ch === "'"){
      var quote = ch;
      var value = '';
      i++;
      while(i < expr.length){
        ch = expr.charAt(i);
        if(ch === '\\'){
          i++;
          if(i >= expr.length) break;
          ch = expr.charAt(i);
          if(ch === 'n') value += '\n';
          else if(ch === 't') value += '\t';
          else value += ch;
          i++;
          continue;
        }
        if(ch === quote){
          i++;
          break;
        }
        value += ch;
        i++;
      }
      tokens.push(_exprToken('string', value));
      continue;
    }
    if(/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr.charAt(i + 1)))){
      var numberText = ch;
      i++;
      while(i < expr.length && /[0-9.]/.test(expr.charAt(i))){
        numberText += expr.charAt(i);
        i++;
      }
      tokens.push(_exprToken('number', parseFloat(numberText)));
      continue;
    }
    if(/[A-Za-z_$]/.test(ch)){
      var ident = ch;
      i++;
      while(i < expr.length && /[A-Za-z0-9_$]/.test(expr.charAt(i))){
        ident += expr.charAt(i);
        i++;
      }
      if(ident === 'true' || ident === 'false'){
        tokens.push(_exprToken('literal', ident === 'true'));
      } else if(ident === 'null'){
        tokens.push(_exprToken('literal', null));
      } else if(ident === 'undefined'){
        tokens.push(_exprToken('literal', undefined));
      } else {
        tokens.push(_exprToken('identifier', ident));
      }
      continue;
    }
    if('?:(),.!+-*/%<>|'.indexOf(ch) >= 0){
      tokens.push(_exprToken(ch === '.' || ch === '(' || ch === ')' || ch === ',' || ch === '?' || ch === ':' ? ch : 'op', ch));
      i++;
      continue;
    }
    i++;
  }
  return tokens;
}

function _splitTopLevel(text, delimiter){
  var parts = [];
  var current = '';
  var depth = 0;
  var quote = '';
  var i;
  var ch;
  for(i = 0; i < text.length; i++){
    ch = text.charAt(i);
    if(quote){
      current += ch;
      if(ch === '\\'){
        i++;
        if(i < text.length) current += text.charAt(i);
        continue;
      }
      if(ch === quote) quote = '';
      continue;
    }
    if(ch === '"' || ch === "'"){
      quote = ch;
      current += ch;
      continue;
    }
    if(ch === '('){
      depth++;
      current += ch;
      continue;
    }
    if(ch === ')'){
      if(depth > 0) depth--;
      current += ch;
      continue;
    }
    if(depth === 0 && ch === delimiter){
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function _splitExprPipes(expr){
  var parts = [];
  var current = '';
  var depth = 0;
  var quote = '';
  var i;
  var ch;
  var next;
  for(i = 0; i < expr.length; i++){
    ch = expr.charAt(i);
    next = expr.charAt(i + 1);
    if(quote){
      current += ch;
      if(ch === '\\'){
        i++;
        if(i < expr.length) current += expr.charAt(i);
        continue;
      }
      if(ch === quote) quote = '';
      continue;
    }
    if(ch === '"' || ch === "'"){
      quote = ch;
      current += ch;
      continue;
    }
    if(ch === '('){
      depth++;
      current += ch;
      continue;
    }
    if(ch === ')'){
      if(depth > 0) depth--;
      current += ch;
      continue;
    }
    if(depth === 0 && ch === '|' && next !== '|'){
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function _parseFilterSpec(text){
  var parts = _splitTopLevel(text, ':');
  var args = [];
  var argParts;
  var i;
  if(parts.length > 1 && parts[1]){
    argParts = _splitTopLevel(parts.slice(1).join(':').replace(/^\s+|\s+$/g, ''), ',');
    for(i = 0; i < argParts.length; i++){
      if(argParts[i].replace(/^\s+|\s+$/g, '')){
        args.push(_compileExpression(argParts[i].replace(/^\s+|\s+$/g, '')));
      }
    }
  }
  return {
    name: (parts[0] || '').replace(/^\s+|\s+$/g, ''),
    args: args
  };
}

function _currentExprToken(parser){
  return parser.tokens[parser.index];
}

function _consumeExprToken(parser, expectedType, expectedValue){
  var token = parser.tokens[parser.index];
  if(!token) return null;
  if(expectedType && token.type !== expectedType) return null;
  if(expectedValue && token.value !== expectedValue) return null;
  parser.index++;
  return token;
}

function _parseExpressionPrimary(parser){
  var token = _currentExprToken(parser);
  var expr;
  if(!token) return { type:'literal', value:'' };
  if(token.type === 'number' || token.type === 'string' || token.type === 'literal'){
    parser.index++;
    return { type:'literal', value:token.value };
  }
  if(token.type === 'identifier'){
    parser.index++;
    expr = { type:'identifier', name:token.value };
    while(_currentExprToken(parser) && (_currentExprToken(parser).type === '.' || _currentExprToken(parser).type === '(')){
      if(_consumeExprToken(parser, '.')){
        token = _consumeExprToken(parser, 'identifier');
        if(!token) break;
        expr = { type:'member', object:expr, property:token.value };
      } else if(_consumeExprToken(parser, '(')){
        var args = [];
        while(_currentExprToken(parser) && _currentExprToken(parser).type !== ')'){
          args.push(_parseExpressionConditional(parser));
          if(!_consumeExprToken(parser, ',')) break;
        }
        _consumeExprToken(parser, ')');
        expr = { type:'call', callee:expr, args:args };
      }
    }
    return expr;
  }
  if(_consumeExprToken(parser, '(')){
    expr = _parseExpressionConditional(parser);
    _consumeExprToken(parser, ')');
    return expr;
  }
  parser.index++;
  return { type:'literal', value:'' };
}

function _parseExpressionUnary(parser){
  var token = _currentExprToken(parser);
  if(token && token.type === 'op' && (token.value === '!' || token.value === '-')){
    parser.index++;
    return { type:'unary', operator:token.value, argument:_parseExpressionUnary(parser) };
  }
  return _parseExpressionPrimary(parser);
}

function _parseBinaryExpr(parser, nextParser, operators){
  var left = nextParser(parser);
  var token = _currentExprToken(parser);
  while(token && token.type === 'op' && operators.indexOf(token.value) >= 0){
    parser.index++;
    left = {
      type:(token.value === '&&' || token.value === '||') ? 'logical' : 'binary',
      operator:token.value,
      left:left,
      right:nextParser(parser)
    };
    token = _currentExprToken(parser);
  }
  return left;
}

function _parseExpressionMultiply(parser){
  return _parseBinaryExpr(parser, _parseExpressionUnary, ['*', '/', '%']);
}

function _parseExpressionAdd(parser){
  return _parseBinaryExpr(parser, _parseExpressionMultiply, ['+', '-']);
}

function _parseExpressionCompare(parser){
  return _parseBinaryExpr(parser, _parseExpressionAdd, ['>', '<', '>=', '<=']);
}

function _parseExpressionEqual(parser){
  return _parseBinaryExpr(parser, _parseExpressionCompare, ['==', '!=', '===', '!==']);
}

function _parseExpressionAnd(parser){
  return _parseBinaryExpr(parser, _parseExpressionEqual, ['&&']);
}

function _parseExpressionOr(parser){
  return _parseBinaryExpr(parser, _parseExpressionAnd, ['||']);
}

function _parseExpressionConditional(parser){
  var test = _parseExpressionOr(parser);
  if(_consumeExprToken(parser, '?')){
    var consequent = _parseExpressionConditional(parser);
    _consumeExprToken(parser, ':');
    var alternate = _parseExpressionConditional(parser);
    return { type:'conditional', test:test, consequent:consequent, alternate:alternate };
  }
  return test;
}

function _compileExpression(expr){
  var source = String(expr == null ? '' : expr).replace(/^\s+|\s+$/g, '');
  var parser;
  var compiled;
  var pipeParts;
  var i;
  if(!_exprCache[source]){
    pipeParts = _splitExprPipes(source);
    parser = { tokens:_tokenizeExpr(pipeParts[0] || ''), index:0 };
    compiled = {
      source: source,
      ast: _parseExpressionConditional(parser),
      filters: []
    };
    for(i = 1; i < pipeParts.length; i++){
      if(pipeParts[i].replace(/^\s+|\s+$/g, '')){
        compiled.filters.push(_parseFilterSpec(pipeParts[i]));
      }
    }
    _exprCache[source] = compiled;
  }
  return _exprCache[source];
}

function _getExprRootName(node){
  if(!node) return '';
  if(node.type === 'identifier') return node.name;
  if(node.type === 'member') return _getExprRootName(node.object);
  return '';
}

function _resolveExpressionValue(node, context){
  if(!node) return '';
  if(node.type === 'identifier') return context ? context[node.name] : undefined;
  if(node.type === 'member'){
    var owner = _evaluateExpressionAst(node.object, context);
    if(owner == null) return undefined;
    return owner[node.property];
  }
  return undefined;
}

function _resolveCallable(node, context){
  if(!node) return null;
  if(node.type === 'identifier'){
    return { fn: context ? context[node.name] : undefined, owner:null, root:node.name };
  }
  if(node.type === 'member'){
    var owner = _evaluateExpressionAst(node.object, context);
    if(owner == null) return null;
    return { fn: owner[node.property], owner:owner, root:_getExprRootName(node.object) };
  }
  return null;
}

function _isSafeCallable(callable){
  var root = callable && callable.root;
  if(!callable || typeof callable.fn !== 'function') return false;
  if(root === 'Math' || root === 'Date' || root === 'Number' || root === 'String' || root === 'filters') return true;
  if(root === 'parseInt' || root === 'parseFloat' || root === 'isNaN' || root === 'encodeURIComponent' || root === 'decodeURIComponent') return true;
  return false;
}

function _evaluateExpressionAst(node, context){
  var left;
  var right;
  var callable;
  var args;
  if(!node) return '';
  switch(node.type){
    case 'literal':
      return node.value;
    case 'identifier':
    case 'member':
      return _resolveExpressionValue(node, context || {});
    case 'unary':
      left = _evaluateExpressionAst(node.argument, context);
      if(node.operator === '!') return !left;
      if(node.operator === '-') return -Number(left || 0);
      return left;
    case 'binary':
      left = _evaluateExpressionAst(node.left, context);
      right = _evaluateExpressionAst(node.right, context);
      switch(node.operator){
        case '+': return left + right;
        case '-': return Number(left || 0) - Number(right || 0);
        case '*': return Number(left || 0) * Number(right || 0);
        case '/': return Number(right || 0) === 0 ? 0 : Number(left || 0) / Number(right || 0);
        case '%': return Number(right || 0) === 0 ? 0 : Number(left || 0) % Number(right || 0);
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left == right; // eslint-disable-line eqeqeq
        case '!=': return left != right; // eslint-disable-line eqeqeq
        case '===': return left === right;
        case '!==': return left !== right;
      }
      return '';
    case 'logical':
      if(node.operator === '&&'){
        left = _evaluateExpressionAst(node.left, context);
        return left ? _evaluateExpressionAst(node.right, context) : left;
      }
      if(node.operator === '||'){
        left = _evaluateExpressionAst(node.left, context);
        return left ? left : _evaluateExpressionAst(node.right, context);
      }
      return '';
    case 'conditional':
      return _evaluateExpressionAst(node.test, context) ? _evaluateExpressionAst(node.consequent, context) : _evaluateExpressionAst(node.alternate, context);
    case 'call':
      callable = _resolveCallable(node.callee, context || {});
      if(!_isSafeCallable(callable)) return '';
      args = (node.args || []).map(function(argNode){
        return _evaluateExpressionAst(argNode, context);
      });
      try {
        return callable.fn.apply(callable.owner || null, args);
      } catch(err){
        return '';
      }
  }
  return '';
}

function _applyExpressionFilter(value, filterSpec, context){
  var filterName = filterSpec && filterSpec.name;
  var args = [];
  var fn;
  if(!filterName) return value;
  if(filterSpec.args && filterSpec.args.length){
    args = filterSpec.args.map(function(argExpr){
      return _evaluateCompiledExpression(argExpr, context);
    });
  }
  if(context && context.filters && typeof context.filters[filterName] === 'function'){
    fn = context.filters[filterName];
  } else {
    fn = _exprFilters[filterName];
  }
  if(typeof fn !== 'function') return value;
  try {
    return fn.apply(null, [value].concat(args));
  } catch(err){
    return value;
  }
}

function _evaluateCompiledExpression(compiled, context){
  var value;
  var i;
  if(!compiled) return '';
  value = _evaluateExpressionAst(compiled.ast, context || {});
  for(i = 0; i < compiled.filters.length; i++){
    value = _applyExpressionFilter(value, compiled.filters[i], context || {});
  }
  return value;
}

function _extractTemplateBindings(template){
  var parts = [];
  var cursor = 0;
  var start;
  var end;
  while(cursor < template.length){
    start = template.indexOf('{{', cursor);
    if(start < 0){
      if(cursor < template.length) parts.push({ type:'text', value:template.slice(cursor) });
      break;
    }
    if(start > cursor) parts.push({ type:'text', value:template.slice(cursor, start) });
    end = template.indexOf('}}', start + 2);
    if(end < 0){
      parts.push({ type:'text', value:template.slice(start) });
      break;
    }
    parts.push({ type:'expr', value:template.slice(start + 2, end).replace(/^\s+|\s+$/g, '') });
    cursor = end + 2;
  }
  return parts;
}

function _evalExpr(template, context){
  var parts;
  var output;
  var i;
  var value;
  if(template == null) return template;
  if(typeof template !== 'string') return template;
  if(template.indexOf('{{') < 0 || template.indexOf('}}') < 0) return template;
  parts = _extractTemplateBindings(template);
  if(parts.length === 1 && parts[0].type === 'expr'){
    return _evaluateCompiledExpression(_compileExpression(parts[0].value), context || {});
  }
  output = '';
  for(i = 0; i < parts.length; i++){
    if(parts[i].type === 'text'){
      output += parts[i].value;
    } else {
      value = _evaluateCompiledExpression(_compileExpression(parts[i].value), context || {});
      output += value == null ? '' : String(value);
    }
  }
  return output;
}

function _resolveBindings(obj, context){
  var out;
  var key;
  if(typeof obj === 'string') return _evalExpr(obj, context || {});
  if(Array.isArray(obj)){
    return obj.map(function(item){
      return _resolveBindings(item, context || {});
    });
  }
  if(obj && typeof obj === 'object'){
    out = {};
    for(key in obj){
      if(Object.prototype.hasOwnProperty.call(obj, key)){
        out[key] = _resolveBindings(obj[key], context || {});
      }
    }
    return out;
  }
  return obj;
}

/* ── Block Registry ─────────────────────────────────────────────────────── */
var BLOCK_CATALOG = {
  /* BỐ CỤC / LAYOUT */
  'page-header':      { label:'Tiêu đề trang',        labelEn:'Page Header',      category:'layout',  icon:'📄', desc:'Tiêu đề + breadcrumb + nút hành động', descEn:'Title + breadcrumb + action buttons' },
  'kpi-row':          { label:'Dãy KPI',               labelEn:'KPI Row',          category:'layout',  icon:'📊', desc:'Hàng các thẻ KPI (1-8 thẻ)', descEn:'Row of KPI cards (1-8)' },
  'tab-bar':          { label:'Thanh tab',             labelEn:'Tab Bar',          category:'layout',  icon:'📑', desc:'Điều hướng tab', descEn:'Tab navigation' },
  'filter-bar':       { label:'Bộ lọc',               labelEn:'Filter Bar',       category:'layout',  icon:'🔍', desc:'Tìm kiếm + lọc + ngày', descEn:'Search + filter + date range' },
  'section-header':   { label:'Tiêu đề mục',          labelEn:'Section Header',   category:'layout',  icon:'📝', desc:'H2/H3 với đường kẻ', descEn:'H2/H3 with divider' },
  'spacer':           { label:'Khoảng cách',           labelEn:'Spacer',           category:'layout',  icon:'↕️', desc:'Khoảng trống giữa các block', descEn:'Empty spacing between blocks' },
  'info-banner':      { label:'Thông báo',             labelEn:'Info Banner',      category:'layout',  icon:'📢', desc:'Banner thông báo màu sắc', descEn:'Colored notice banner' },
  'two-column':       { label:'Hai cột',               labelEn:'Two Column',       category:'layout',  icon:'📐', desc:'Chia 2 cột trái-phải (tỉ lệ tùy chọn)', descEn:'Left-right split layout' },
  'card-container':   { label:'Hộp chứa',              labelEn:'Card Container',   category:'layout',  icon:'📦', desc:'Khung chứa block con (có thể thu gọn)', descEn:'Collapsible container for child blocks' },
  'divider':          { label:'Đường phân cách',       labelEn:'Divider',          category:'layout',  icon:'➖', desc:'Đường kẻ ngang phân tách nội dung', descEn:'Horizontal line separator' },

  /* DỮ LIỆU / DATA */
  'data-table':       { label:'Bảng dữ liệu',         labelEn:'Data Table',       category:'data',    icon:'📋', desc:'Bảng nâng cao: sắp xếp, lọc, phân trang, xuất file', descEn:'Advanced table: sort, filter, pagination, export' },
  'data-cards':       { label:'Lưới thẻ',              labelEn:'Card Grid',        category:'data',    icon:'🗂️', desc:'Lưới thẻ responsive (2-4 cột)', descEn:'Responsive card grid (2-4 columns)' },
  'data-list':        { label:'Danh sách',             labelEn:'List',             category:'data',    icon:'📃', desc:'Danh sách đơn giản với icon + hành động', descEn:'Simple list with icons + actions' },
  'data-tree':        { label:'Cây phân cấp',          labelEn:'Tree View',        category:'data',    icon:'🌳', desc:'Cấu trúc cây (SO→JO→WO)', descEn:'Tree structure (SO→JO→WO)' },
  'data-timeline':    { label:'Dòng thời gian',        labelEn:'Timeline',         category:'data',    icon:'📅', desc:'Timeline dọc với mốc thời gian', descEn:'Vertical timeline with events' },
  'data-gantt':       { label:'Biểu đồ Gantt',        labelEn:'Gantt Chart',      category:'data',    icon:'📊', desc:'Biểu đồ tiến độ máy × ngày × ca', descEn:'Schedule chart: machine × date × shift' },
  'data-detail':      { label:'Chi tiết bản ghi',      labelEn:'Record Detail',    category:'data',    icon:'🔍', desc:'Hiển thị chi tiết 1 bản ghi (grid 2 cột)', descEn:'Single record detail view (2-col grid)' },
  'data-kanban':      { label:'Bảng Kanban',           labelEn:'Kanban Board',     category:'data',    icon:'📌', desc:'Bảng kéo thả theo trạng thái', descEn:'Drag-drop board by status columns' },
  'data-stat-compare':{ label:'So sánh chỉ số',        labelEn:'Stat Compare',     category:'data',    icon:'📈', desc:'So sánh giá trị hiện tại vs trước đó', descEn:'Current vs previous value comparison' },

  /* BIỂU MẪU / FORM */
  'form-standard':    { label:'Biểu mẫu',             labelEn:'Form',             category:'form',    icon:'📝', desc:'Form tạo/sửa nhiều cột với validation', descEn:'Multi-column create/edit form with validation' },
  'form-wizard':      { label:'Biểu mẫu từng bước',   labelEn:'Step Wizard',      category:'form',    icon:'🧙', desc:'Form wizard theo bước (1→2→3→hoàn thành)', descEn:'Step-by-step wizard form' },
  'form-inline':      { label:'Chỉnh sửa nhanh',      labelEn:'Inline Edit',      category:'form',    icon:'✏️', desc:'Chỉnh sửa tại chỗ trên dòng dữ liệu', descEn:'In-place editing on data row' },
  'form-modal':       { label:'Form trong hộp thoại',  labelEn:'Modal Form',       category:'form',    icon:'🪟', desc:'Form mở ra trong popup modal', descEn:'Form that opens in a popup modal' },
  'form-search':      { label:'Tìm kiếm nâng cao',    labelEn:'Search Form',      category:'form',    icon:'🔎', desc:'Thanh tìm kiếm với gợi ý tự động', descEn:'Search bar with auto-suggestions' },

  /* BIỂU ĐỒ / CHART */
  'chart-bar':        { label:'Biểu đồ cột',          labelEn:'Bar Chart',        category:'chart',   icon:'📊', desc:'Biểu đồ cột ngang/dọc', descEn:'Horizontal/vertical bar chart' },
  'chart-stacked-bar':{ label:'Biểu đồ cột chồng',    labelEn:'Stacked Bar',      category:'chart',   icon:'📊', desc:'Biểu đồ cột xếp chồng nhiều series', descEn:'Multi-series stacked bar chart' },
  'chart-donut':      { label:'Biểu đồ tròn',         labelEn:'Donut Chart',      category:'chart',   icon:'🍩', desc:'Biểu đồ tròn (conic-gradient)', descEn:'CSS donut/pie chart' },
  'chart-line':       { label:'Biểu đồ đường',        labelEn:'Line Chart',       category:'chart',   icon:'📈', desc:'Biểu đồ xu hướng theo thời gian', descEn:'Trend line chart over time' },
  'chart-heatmap':    { label:'Bản đồ nhiệt',         labelEn:'Heatmap',          category:'chart',   icon:'🗺️', desc:'Lưới màu theo giá trị (máy × ngày)', descEn:'Value-colored grid (machine × day)' },
  'chart-progress':   { label:'Vòng tiến độ',          labelEn:'Progress Ring',    category:'chart',   icon:'⭕', desc:'Vòng tròn % hoàn thành', descEn:'Circular progress percentage' },
  'chart-sparkline':  { label:'Đường mini',            labelEn:'Sparkline',        category:'chart',   icon:'〰️', desc:'Biểu đồ xu hướng nhỏ gọn', descEn:'Compact inline trend line' },

  /* HÀNH ĐỘNG / ACTION */
  'action-toolbar':   { label:'Thanh công cụ',         labelEn:'Toolbar',          category:'action',  icon:'🔧', desc:'Nhóm nút hành động (tạo, lọc, xuất)', descEn:'Action button group (create, filter, export)' },
  'action-status-flow':{ label:'Chuyển trạng thái',    labelEn:'Status Flow',      category:'action',  icon:'🔄', desc:'Nút chuyển trạng thái theo workflow', descEn:'Workflow status transition buttons' },
  'action-quick-create':{ label:'Tạo nhanh',           labelEn:'Quick Create',     category:'action',  icon:'⚡', desc:'Nút + modal form tạo nhanh bản ghi', descEn:'Button + modal form for quick record creation' },
  'action-summary':   { label:'Tóm tắt',              labelEn:'Summary',          category:'action',  icon:'📋', desc:'Panel tóm tắt thông tin', descEn:'Information summary panel' },
  'action-export':    { label:'Xuất dữ liệu',          labelEn:'Export',           category:'action',  icon:'💾', desc:'Nút xuất CSV, Excel, PDF', descEn:'Export CSV, Excel, PDF buttons' },
};

var BLOCK_CATEGORIES = [
  { key:'layout',        label:'Bố cục',      labelEn:'Layout',        color:'#2563eb' },
  { key:'data',          label:'Dữ liệu',     labelEn:'Data',          color:'#0f766e' },
  { key:'form',          label:'Biểu mẫu',    labelEn:'Form',          color:'#7c3aed' },
  { key:'chart',         label:'Biểu đồ',     labelEn:'Chart',         color:'#d97706' },
  { key:'action',        label:'Hành động',   labelEn:'Action',        color:'#dc2626' },
  { key:'media',         label:'Nội dung',    labelEn:'Media',         color:'#0891b2' },
  { key:'navigation',    label:'Điều hướng',  labelEn:'Navigation',    color:'#4f46e5' },
  { key:'insight',       label:'Tổng hợp',    labelEn:'Insight',       color:'#7c2d12' },
  { key:'manufacturing', label:'Sản xuất',    labelEn:'Manufacturing', color:'#15803d' },
  { key:'quality',       label:'Chất lượng',  labelEn:'Quality',       color:'#be123c' },
  { key:'automation',    label:'Tự động hóa', labelEn:'Automation',    color:'#6d28d9' },
  { key:'iot',           label:'IoT / SCADA', labelEn:'IoT / SCADA',   color:'#0f766e' }
];

BLOCK_CATALOG = _buildExpandedBlockCatalog(BLOCK_CATALOG);

function _parseCatalogLines(text){
  return text.replace(/^\s+|\s+$/g, '').split(/\n+/).filter(function(line){
    return !!line;
  }).map(function(line){
    var parts = line.split('|');
    return {
      key: parts[0],
      label: parts[1],
      labelEn: parts[2] || parts[1],
      icon: parts[3] || '📦',
      desc: parts[4] || '',
      descEn: parts[4] || '',
      renderer: parts[5] || ''
    };
  });
}

function _blockCatalogEntry(def, category, fallbackRenderer){
  return {
    label: def.label,
    labelEn: def.labelEn || def.label,
    category: category,
    icon: def.icon || '📦',
    desc: def.desc || '',
    descEn: def.descEn || def.desc || '',
    renderer: def.renderer || fallbackRenderer || def.key
  };
}

function _extendBlockCatalog(catalog, category, fallbackRenderer, lines){
  _parseCatalogLines(lines).forEach(function(item){
    catalog[item.key] = _blockCatalogEntry(item, category, fallbackRenderer);
  });
}

function _buildExpandedBlockCatalog(seed){
  var catalog = {};

  Object.keys(seed || {}).forEach(function(key){
    catalog[key] = _clone(seed[key]);
    if(!catalog[key].renderer) catalog[key].renderer = key;
  });

  _extendBlockCatalog(catalog, 'layout', 'section-header', [
    'page-header|Tiêu đề trang|Page Header|🧭|Tiêu đề lớn và hành động chính|section-header',
    'section-header|Tiêu đề khu vực|Section Header|🏷️|Tiêu đề cho từng khu vực nội dung|section-header',
    'sub-header|Tiêu đề phụ|Sub Header|🔖|Dòng mở đầu ngắn cho khối nội dung|section-header',
    'hero-banner|Banner mở đầu|Hero Banner|🌤️|Khối giới thiệu lớn đầu trang|info-banner',
    'kpi-row|Dãy KPI|KPI Row|📊|Hàng KPI tổng hợp theo mục tiêu|kpi-row',
    'metric-strip|Thanh metric|Metric Strip|📈|Dải metric ngang gọn cho dashboard|kpi-row',
    'card-container|Nhóm thẻ|Card Container|🗂️|Khung chứa nhiều block con|card-container',
    'two-column|Hai cột|Two Column|↔️|Bố cục hai cột linh hoạt|two-column',
    'three-column|Ba cột|Three Column|🧱|Bố cục ba cột cho dashboard|card-container',
    'tab-bar|Thanh tab|Tab Bar|📑|Điều hướng bằng tab trong khu vực|action-toolbar',
    'spacer|Khoảng trống|Spacer|↕️|Khoảng trống phân tách nội dung|spacer',
    'divider-line|Đường phân cách|Divider Line|➖|Đường chia section trực quan|spacer',
    'accordion-group|Accordion|Accordion Group|📚|Danh sách có thể mở rộng hoặc thu gọn|card-container',
    'sticky-toolbar|Thanh ghim dính|Sticky Toolbar|📌|Toolbar cố định khi cuộn trang|action-toolbar'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'data', 'data-table', [
    'data-table|Bảng dữ liệu|Data Table|📋|Bảng dữ liệu nâng cao có phân trang và lọc|data-table',
    'data-cards|Thẻ dữ liệu|Data Cards|🪪|Danh sách dữ liệu hiển thị dạng thẻ|data-cards',
    'data-list|Danh sách|Data List|📝|Danh sách bản ghi đơn giản theo dòng|data-cards',
    'data-grid|Lưới dữ liệu|Data Grid|🔲|Lưới bản ghi nhiều cột dạng card|data-cards',
    'data-timeline|Timeline|Timeline|🕒|Dòng thời gian sự kiện và thay đổi|data-timeline',
    'master-detail|Master detail|Master Detail|📂|Danh sách và chi tiết|data-table',
    'kanban-board|Kanban|Kanban Board|🗃️|Lane theo trạng thái và người phụ trách|data-cards',
    'tree-view|Cây dữ liệu|Tree View|🌳|Dữ liệu phân cấp dạng cây|data-cards',
    'pivot-table|Pivot table|Pivot Table|🧮|Tổng hợp dữ liệu theo hàng và cột|data-table',
    'matrix-grid|Ma trận|Matrix Grid|🔳|Ma trận giao nhau của nhiều chiều dữ liệu|data-table',
    'record-detail|Chi tiết bản ghi|Record Detail|🧾|Card chi tiết cho một bản ghi|data-cards',
    'audit-log|Nhật ký thao tác|Audit Log|📜|Lịch sử thay đổi có dấu vết đầy đủ|data-timeline',
    'attachment-list|Tệp đính kèm|Attachment List|📎|Danh sách tệp, ảnh và media|data-cards',
    'status-board|Bảng trạng thái|Status Board|🚦|Tổng hợp bản ghi theo trạng thái|data-cards',
    'map-list|Danh sách địa điểm|Map List|🗺️|Danh sách có thông tin vị trí hoặc khu vực|data-cards',
    'schedule-grid|Lịch biểu|Schedule Grid|🗓️|Bảng lịch theo ca, ngày hoặc nguồn lực|data-table',
    'calendar-board|Lịch calendar|Calendar Board|📆|Lịch hiển thị dạng calendar theo ngày|data-table',
    'gantt-board|Biểu đồ Gantt|Gantt Board|📐|Tiến độ theo timeline và phụ thuộc|data-table',
    'heat-table|Bảng nhiệt|Heat Table|🔥|Bảng tô màu theo mức độ hoặc mật độ|data-table',
    'compliance-log|Nhật ký tuân thủ|Compliance Log|✅|Theo dõi trạng thái tuân thủ theo dòng|data-table'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'form', 'form-standard', [
    'form-standard|Form chuẩn|Standard Form|🧩|Form nhập liệu tiêu chuẩn nhiều trường|form-standard',
    'form-wizard|Form wizard|Form Wizard|🪜|Form nhiều bước có điều hướng|form-standard',
    'form-inline|Form ngang|Inline Form|↔️|Form gọn hiển thị trên một dòng|form-standard',
    'filter-bar|Thanh lọc|Filter Bar|🔎|Lọc và tìm kiếm nhanh trên màn hình|filter-bar',
    'search-panel|Panel tìm kiếm|Search Panel|🔍|Panel tìm kiếm mở rộng nhiều điều kiện|filter-bar',
    'approval-form|Form phê duyệt|Approval Form|✍️|Form phê duyệt có ghi chú và xác nhận|form-standard',
    'checklist-form|Checklist|Checklist Form|☑️|Danh sách kiểm tra theo bước hoặc tiêu chí|form-standard',
    'dynamic-form|Form động|Dynamic Form|🧠|Form thay đổi theo điều kiện nhập liệu|form-standard',
    'subform-table|Subform dạng bảng|Subform Table|🧮|Bảng dữ liệu con nằm trong form|data-table',
    'upload-center|Tải tệp|Upload Center|📤|Tải tài liệu, ảnh và minh chứng|form-standard',
    'signature-pad|Chữ ký|Signature Pad|🖊️|Nhập và xác nhận chữ ký điện tử|form-standard',
    'comment-box|Hộp bình luận|Comment Box|💬|Nhập ghi chú và trao đổi nội bộ|form-standard',
    'query-builder|Query builder|Query Builder|🧪|Xây điều kiện truy vấn nâng cao|filter-bar',
    'parameter-panel|Panel tham số|Parameter Panel|🎛️|Nhập tham số cho báo cáo hoặc truy vấn|form-standard',
    'date-range-picker|Khoảng ngày|Date Range Picker|📅|Chọn khoảng thời gian từ ngày đến ngày|filter-bar'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'chart', 'chart-bar', [
    'chart-bar|Biểu đồ cột|Bar Chart|📊|So sánh giá trị theo nhóm|chart-bar',
    'chart-line|Biểu đồ đường|Line Chart|📈|Xu hướng theo thời gian|chart-bar',
    'chart-area|Biểu đồ miền|Area Chart|🌊|Miền tích lũy theo thời gian|chart-bar',
    'chart-donut|Biểu đồ donut|Donut Chart|🍩|Tỷ lệ có lỗ ở giữa|chart-donut',
    'chart-pie|Biểu đồ tròn|Pie Chart|🥧|Cơ cấu theo tỷ lệ|chart-donut',
    'chart-stacked-bar|Cột chồng|Stacked Bar|🧱|Cột chồng nhiều series|chart-bar',
    'chart-combo|Biểu đồ kết hợp|Combo Chart|📶|Kết hợp cột và đường|chart-bar',
    'chart-radar|Biểu đồ radar|Radar Chart|🕸️|So sánh đa chiều nhiều tiêu chí|chart-bar',
    'chart-scatter|Biểu đồ scatter|Scatter Plot|⚫|Tương quan giữa nhiều biến số|chart-bar',
    'chart-bubble|Biểu đồ bubble|Bubble Chart|🫧|Scatter có kích thước bong bóng|chart-bar',
    'chart-heatmap|Heatmap|Heatmap|🔥|Ma trận nhiệt theo cường độ giá trị|chart-bar',
    'chart-gauge|Đồng hồ gauge|Gauge|🧭|Chỉ số hiện tại trên mặt đồng hồ|chart-donut',
    'chart-progress|Vòng tiến độ|Progress Ring|⭕|Tiến độ dạng vòng tròn|chart-donut',
    'chart-sparkline|Sparkline|Sparkline|〰️|Đường xu hướng gọn|chart-bar',
    'chart-waterfall|Waterfall|Waterfall|🪜|Đóng góp tăng giảm theo từng bước|chart-bar',
    'chart-control|Control chart|Control Chart|🎯|Biểu đồ kiểm soát với UCL và LCL|chart-bar',
    'chart-boxplot|Box plot|Box Plot|📦|Phân bố theo tứ phân vị|chart-bar',
    'chart-histogram|Histogram|Histogram|📚|Tần suất theo khoảng phân phối|chart-bar'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'action', 'action-toolbar', [
    'action-toolbar|Thanh công cụ|Toolbar|🛠️|Nhóm nút hành động chính|action-toolbar',
    'action-status-flow|Chuyển trạng thái|Status Flow|🔄|Workflow chuyển trạng thái bản ghi|action-toolbar',
    'action-quick-create|Tạo nhanh|Quick Create|⚡|Tạo bản ghi nhanh từ modal|action-toolbar',
    'action-summary|Tổng hợp hành động|Action Summary|📌|Tóm tắt hành động và bước kế tiếp|data-cards',
    'action-export|Xuất dữ liệu|Export|💾|Xuất CSV, Excel hoặc PDF|action-toolbar',
    'action-bulk|Xử lý hàng loạt|Bulk Actions|🧰|Thao tác trên nhiều bản ghi cùng lúc|action-toolbar',
    'action-approval|Phê duyệt|Approval Actions|✅|Đồng ý, từ chối và ghi chú phê duyệt|action-toolbar',
    'action-split|Nút chia nhanh|Split Actions|🔀|Cụm nút theo nhóm tác vụ|action-toolbar',
    'action-launchpad|Launchpad|Launchpad|🚀|Cụm hành động nhanh theo vai trò|action-toolbar',
    'action-shortcuts|Shortcut|Shortcuts|⌨️|Nút tắt cho thao tác thường dùng|action-toolbar',
    'action-refresh|Làm mới|Refresh Actions|🔁|Làm mới và đồng bộ dữ liệu|action-toolbar',
    'action-share|Chia sẻ|Share Actions|📤|Gửi liên kết và thông báo|action-toolbar'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'media', 'info-banner', [
    'info-banner|Thông báo|Info Banner|ℹ️|Banner thông báo trạng thái hoặc lưu ý|info-banner',
    'media-image|Hình ảnh|Image|🖼️|Hiển thị một hình ảnh đơn lẻ|info-banner',
    'media-gallery|Gallery|Gallery|🖼️|Nhiều ảnh dạng bộ sưu tập|data-cards',
    'media-document|Tài liệu|Document|📄|Tài liệu hướng dẫn hoặc hồ sơ|data-cards',
    'media-video|Video|Video|🎬|Khung video hướng dẫn thao tác|info-banner',
    'media-html|HTML tự do|Raw HTML|</>|Nội dung HTML tùy chỉnh|info-banner',
    'media-markdown|Markdown|Markdown|📝|Nội dung markdown có định dạng|info-banner',
    'media-pdf|PDF viewer|PDF Viewer|📕|Khung xem tài liệu PDF|info-banner',
    'media-iframe|IFrame|IFrame|🌐|Nhúng trang nội bộ hoặc bên ngoài|info-banner',
    'media-announcement|Thông báo nội bộ|Announcement|📣|Thông điệp cần nhấn mạnh|info-banner'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'navigation', 'action-toolbar', [
    'nav-breadcrumb|Breadcrumb|Breadcrumb|🧭|Đường dẫn điều hướng theo cấp|action-toolbar',
    'nav-tabs|Tabs|Tabs|📚|Điều hướng bằng tab|action-toolbar',
    'nav-pills|Pills|Pills|🏷️|Lựa chọn dạng pill theo trạng thái|action-toolbar',
    'nav-steps|Bước thực hiện|Step Navigation|🪜|Tiến trình điều hướng từng bước|action-toolbar',
    'nav-sidebar|Sidebar menu|Sidebar Menu|📂|Menu module ở thanh bên trái|action-toolbar',
    'nav-anchor|Anchor menu|Anchor Menu|📍|Nhảy nhanh đến từng section|action-toolbar',
    'nav-pagination|Phân trang|Pagination|↔️|Điều hướng qua nhiều trang dữ liệu|action-toolbar',
    'nav-related-links|Liên kết liên quan|Related Links|🔗|Liên kết nhanh đến tác vụ kế cận|action-toolbar',
    'nav-module-menu|Menu module|Module Menu|🧩|Menu module theo vai trò và quyền|action-toolbar',
    'nav-process-map|Bản đồ quy trình|Process Map|🗺️|Điều hướng theo luồng quy trình|action-toolbar'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'insight', 'kpi-row', [
    'insight-kpi-card|KPI card|KPI Card|🏁|Thẻ KPI đơn lẻ nổi bật|kpi-row',
    'insight-stat-callout|Stat callout|Stat Callout|📣|Chỉ số lớn kèm mô tả ngắn|kpi-row',
    'insight-scorecard|Scorecard|Scorecard|🧠|Bảng điểm mục tiêu và kết quả|data-table',
    'insight-funnel|Funnel|Funnel|🔻|Chuyển đổi qua các bước quy trình|chart-bar',
    'insight-cohort|Cohort|Cohort|👥|So sánh nhóm theo thời gian|chart-bar',
    'insight-alert-feed|Dòng cảnh báo|Alert Feed|🚨|Cảnh báo và bất thường cần theo dõi|data-timeline',
    'insight-driver-tree|Driver tree|Driver Tree|🌿|Cây nguyên nhân và tác động KPI|data-cards',
    'insight-variance|So sánh chênh lệch|Variance Analysis|⚖️|So sánh kế hoạch và thực tế|chart-bar',
    'insight-summary-grid|Lưới tổng hợp|Summary Grid|🔲|Tổng hợp metric dạng lưới|data-cards',
    'insight-target-tracker|Theo dõi mục tiêu|Target Tracker|🎯|Tiến độ đạt mục tiêu theo thời gian|chart-donut'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'manufacturing', 'data-table', [
    'mfg-job-board|Bảng JO|Job Board|🏭|Theo dõi lệnh sản xuất theo trạng thái|data-table',
    'mfg-machine-status|Trạng thái máy|Machine Status|🟢|Trạng thái máy theo thời gian thực|kpi-row',
    'mfg-shift-roster|Ca làm việc|Shift Roster|🕘|Nhân sự và lịch ca theo tổ|data-table',
    'mfg-capacity-grid|Công suất|Capacity Grid|📦|Công suất máy, chuyền và ca|data-table',
    'mfg-wip-lane|WIP lane|WIP Lane|🚚|Bản ghi đang ở giữa các công đoạn|data-cards',
    'mfg-route-tracker|Tuyến công đoạn|Route Tracker|🛣️|Theo dõi lộ trình công đoạn của JO|data-timeline',
    'mfg-tool-life|Tuổi dao cụ|Tool Life|🛠️|Theo dõi sử dụng và thay dao cụ|chart-bar',
    'mfg-material-flow|Dòng vật tư|Material Flow|📦|Theo dõi cấp phát vật tư và tồn tại điểm dùng|data-timeline',
    'mfg-andon-board|Andon|Andon Board|🚦|Bảng sự cố và cần trợ giúp|kpi-row',
    'mfg-setup-check|Checklist setup|Setup Checklist|✅|Checklist trước khi chạy máy|form-standard',
    'mfg-production-schedule|Lịch sản xuất|Production Schedule|🗓️|Kế hoạch sản xuất theo ca và nguồn lực|data-table',
    'mfg-downtime-feed|Dòng downtime|Downtime Feed|🛑|Lịch sử dừng máy và nguyên nhân|data-timeline',
    'mfg-oee-trend|Xu hướng OEE|OEE Trend|📈|Xu hướng OEE theo máy hoặc ca|chart-bar'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'quality', 'chart-bar', [
    'quality-spc-chart|SPC chart|SPC Chart|📏|Theo dõi SPC theo đặc tính đo|chart-bar',
    'quality-control-chart|Control chart|Control Chart|🎯|Biểu đồ kiểm soát với UCL, LCL và center line|chart-bar',
    'quality-pareto|Pareto|Pareto Chart|📚|Nhận diện nguyên nhân lỗi chính|chart-bar',
    'quality-checksheet|Checksheet|Checksheet|🗒️|Ghi nhận lỗi theo ca, máy hoặc bước kiểm|form-standard',
    'quality-defect-matrix|Ma trận lỗi|Defect Matrix|🔳|Tổng hợp lỗi theo máy và công đoạn|data-table',
    'quality-capa-board|CAPA board|CAPA Board|🛡️|Theo dõi hành động khắc phục phòng ngừa|data-cards',
    'quality-inspection-form|Form kiểm tra|Inspection Form|🧪|Form kiểm tra chất lượng theo checklist|form-standard',
    'quality-ncr-log|NCR log|NCR Log|📕|Nhật ký non-conformance|data-table',
    'quality-gage-rnr|Gage R&R|Gage R&R|📐|Đánh giá hệ thống đo lường|chart-bar',
    'quality-capability|Capability|Capability|📉|Cp, Cpk và capability process|chart-bar',
    'quality-audit-plan|Audit plan|Audit Plan|🗓️|Kế hoạch và trạng thái audit|data-table',
    'quality-traceability|Traceability|Traceability|🔗|Liên kết lot, JO, máy và công đoạn|data-timeline',
    'quality-8d-board|Bảng 8D|8D Board|🧷|Theo dõi điều tra và hành động 8D|data-cards'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'automation', 'action-toolbar', [
    'auto-rule-list|Danh sách rule|Rule List|⚙️|Danh sách rule và điều kiện kích hoạt|data-table',
    'auto-approval-lane|Lane phê duyệt|Approval Lane|✅|Tiến trình phê duyệt theo bước|data-cards',
    'auto-task-board|Task board|Task Board|🧰|Hàng đợi task tự động cần xử lý|data-cards',
    'auto-webhook-log|Webhook log|Webhook Log|🪝|Nhật ký webhook vào và ra|data-table',
    'auto-notification-center|Trung tâm thông báo|Notification Center|🔔|Thông báo, nhắc việc và escalation|data-timeline',
    'auto-escalation-map|Bản đồ escalation|Escalation Map|🧭|Quy tắc nâng cấp xử lý|data-cards',
    'auto-sla-timer|SLA timer|SLA Timer|⏱️|Đếm ngược SLA và deadline|kpi-row',
    'auto-queue-monitor|Queue monitor|Queue Monitor|📥|Hàng đợi xử lý nền theo worker|kpi-row',
    'auto-runbook|Runbook|Runbook|📘|Hướng dẫn xử lý sự cố theo bước|data-timeline',
    'auto-bot-panel|Bot panel|Bot Panel|🤖|Điều khiển bot và trợ lý tự động|action-toolbar',
    'auto-workflow-designer|Thiết kế workflow|Workflow Designer|🧬|Thiết kế luồng xử lý và rẽ nhánh|action-toolbar'
  ].join('\n'));

  _extendBlockCatalog(catalog, 'iot', 'chart-bar', [
    'iot-device-grid|Lưới thiết bị|Device Grid|📟|Danh sách thiết bị và sức khỏe kết nối|data-cards',
    'iot-sensor-strip|Thanh cảm biến|Sensor Strip|📡|Giá trị sensor theo hàng ngang|kpi-row',
    'iot-alarm-timeline|Timeline alarm|Alarm Timeline|🚨|Lịch sử alarm máy theo thời gian|data-timeline',
    'iot-live-trend|Trend realtime|Live Trend|📈|Biểu đồ trend realtime từ telemetry|chart-bar',
    'iot-connector-panel|Connector panel|Connector Panel|🔌|Chọn và cấu hình connector|form-standard',
    'iot-telemetry-table|Bảng telemetry|Telemetry Table|📋|Bảng dữ liệu stream từ máy và sensor|data-table',
    'iot-machine-twin|Machine twin|Machine Twin|🧭|Trạng thái tổng hợp của máy số hóa|data-cards',
    'iot-oee-board|Bảng OEE|OEE Board|🏁|OEE và các thành phần theo máy|kpi-row',
    'iot-energy-monitor|Energy monitor|Energy Monitor|⚡|Công suất, tiêu thụ và peak load|chart-bar',
    'iot-maintenance-panel|Bảo trì dự đoán|Maintenance Panel|🛠️|Cảnh báo bảo trì và sức khỏe thiết bị|data-cards',
    'iot-signal-map|Bản đồ signal|Signal Map|🛰️|Map point, register, topic và node|data-table',
    'iot-threshold-manager|Ngưỡng cảnh báo|Threshold Manager|🎚️|Ngưỡng và quy tắc alarm|form-standard',
    'iot-condition-monitor|Theo dõi condition|Condition Monitor|🌡️|Theo dõi vibration, nhiệt độ và tải|chart-bar',
    'iot-edge-health|Sức khỏe edge|Edge Health|🧱|Trạng thái gateway và edge app|kpi-row'
  ].join('\n'));

  return catalog;
}

var BLOCK_PROPERTIES_SCHEMA = _buildBlockPropertiesSchema(BLOCK_CATALOG);

function _schemaAssign(base, extra){
  Object.keys(extra || {}).forEach(function(key){
    base[key] = extra[key];
  });
  return base;
}

function _blockField(key, label, labelEn, type, path, extra){
  return _schemaAssign({
    key: key,
    label: label,
    labelEn: labelEn || label,
    type: type,
    path: path
  }, extra || {});
}

function _blockSection(key, label, labelEn, fields){
  return { key:key, label:label, labelEn:labelEn || label, fields:fields || [] };
}

function _blockTab(key, label, labelEn, sections, icon){
  return { key:key, label:label, labelEn:labelEn || label, sections:sections || [], icon:icon || '' };
}

function _buildBlockPropertiesSchema(catalog){
  var schema = {};
  Object.keys(catalog || {}).forEach(function(type){
    schema[type] = _buildBlockTabs(type, catalog[type] || {});
  });
  return schema;
}

function _buildBlockTabs(type, entry){
  var renderer = entry.renderer || type;
  return [
    _blockTab('general', 'Tổng quan', 'General', _buildGeneralSections(type, entry, renderer), '⚙️'),
    _blockTab('data', 'Dữ liệu', 'Data', _buildDataSections(type, entry, renderer), '🗄️'),
    _blockTab('style', 'Giao diện', 'Style', _buildStyleSections(renderer), '🎨'),
    _blockTab('events', 'Sự kiện', 'Events', _buildEventSections(), '⚡')
  ];
}

function _buildGeneralSections(type, entry, renderer){
  return [
    _blockSection('identity', 'Nhận dạng', 'Identity', [
      _blockField('titleVi', 'Tiêu đề (VI)', 'Title (VI)', 'text', 'title.vi', { default:entry.label || type }),
      _blockField('titleEn', 'Tiêu đề (EN)', 'Title (EN)', 'text', 'title.en', { default:entry.labelEn || entry.label || type }),
      _blockField('subtitleVi', 'Phụ đề (VI)', 'Subtitle (VI)', 'text', 'subtitle.vi', { default:'' }),
      _blockField('subtitleEn', 'Phụ đề (EN)', 'Subtitle (EN)', 'text', 'subtitle.en', { default:'' }),
      _blockField('icon', 'Icon', 'Icon', 'text', 'config.header.icon', { default:entry.icon || '📦' }),
      _blockField('descriptionVi', 'Mô tả (VI)', 'Description (VI)', 'textarea', 'config.header.descriptionVi', { default:'', rows:2 }),
      _blockField('descriptionEn', 'Mô tả (EN)', 'Description (EN)', 'textarea', 'config.header.descriptionEn', { default:'', rows:2 }),
      _blockField('badgeText', 'Badge', 'Badge', 'text', 'config.header.badge', { default:'' }),
      _blockField('anchor', 'Anchor ID', 'Anchor ID', 'text', 'config.anchorId', { default:'', placeholder:'overview-kpi' }),
      _blockField('testId', 'Test ID', 'Test ID', 'text', 'config.testId', { default:'' })
    ]),
    _blockSection('behavior', 'Hành vi', 'Behavior', [
      _blockField('visible', 'Đang hiện', 'Visible', 'toggle', 'visible', { default:true }),
      _blockField('visibleWhen', 'Điều kiện hiển thị', 'Visibility rule', 'expression', 'visibleWhen', { default:'', placeholder:'filters.status === "open"' }),
      _blockField('variant', 'Biến thể', 'Variant', 'select', 'config.variant', {
        default:renderer,
        options:['standard','compact','dense','spotlight']
      }),
      _blockField('roles', 'Vai trò được xem', 'Visible roles', 'text', 'config.permissions.roles', { default:'', placeholder:'ceo,it_admin' }),
      _blockField('ownerRole', 'Vai trò sở hữu', 'Owner role', 'text', 'config.permissions.ownerRole', { default:'' }),
      _blockField('selectionScope', 'Khóa ngữ cảnh', 'Selection scope', 'text', 'config.context.selectionScope', { default:'' }),
      _blockField('recordIdExpr', 'Biểu thức record ID', 'Record ID expression', 'expression', 'config.context.recordIdExpr', { default:'' }),
      _blockField('lazyLoad', 'Tải khi cần', 'Lazy load', 'toggle', 'config.behavior.lazyLoad', { default:false }),
      _blockField('hiddenInPrint', 'Ẩn khi in', 'Hide in print', 'toggle', 'config.behavior.hiddenInPrint', { default:false }),
      _blockField('builderNote', 'Ghi chú builder', 'Builder note', 'textarea', 'config.builderNote', { default:'', rows:2 })
    ])
  ];
}

function _buildDataSections(type, entry, renderer){
  var sections = [
    _blockSection('source', 'Nguồn dữ liệu', 'Data source', [
      _blockField('api', 'API endpoint', 'API endpoint', 'api-select', 'config.dataSource.api', { default:'', repaintOnChange:true }),
      _blockField('method', 'HTTP method', 'HTTP method', 'select', 'config.dataSource.method', { default:'GET', options:['GET','POST','PUT','PATCH','DELETE'] }),
      _blockField('moduleKey', 'Khóa module nguồn', 'Source module key', 'text', 'config.dataSource.moduleKey', { default:'', placeholder:'quality.ncr' }),
      _blockField('path', 'Đường dẫn dữ liệu', 'Data path', 'text', 'config.dataSource.path', { default:'', placeholder:'payload.items' }),
      _blockField('dataKey', 'Data key', 'Data key', 'text', 'config.dataSource.dataKey', { default:'items', placeholder:'items' }),
      _blockField('totalKey', 'Total key', 'Total key', 'text', 'config.dataSource.totalKey', { default:'total', placeholder:'total' }),
      _blockField('sortExpr', 'Biểu thức sắp xếp', 'Sort expression', 'expression', 'config.dataSource.sortExpr', { default:'' }),
      _blockField('filtersExpr', 'Biểu thức bộ lọc', 'Filter expression', 'expression', 'config.dataSource.filtersExpr', { default:'' }),
      _blockField('params', 'Params JSON', 'Params JSON', 'json', 'config.dataSource.params', { default:{} }),
      _blockField('transformer', 'Transformer', 'Transformer', 'code', 'config.dataSource.transformer', { default:'' })
    ]),
    _blockSection('refresh', 'Làm mới', 'Refresh', [
      _blockField('autoRefresh', 'Tự động làm mới', 'Auto refresh', 'toggle', 'config.refresh.enabled', { default:false }),
      _blockField('interval', 'Chu kỳ (ms)', 'Interval (ms)', 'number', 'config.refresh.intervalMs', { default:30000, min:0, step:500 }),
      _blockField('cache', 'Cache TTL (s)', 'Cache TTL (s)', 'number', 'config.dataSource.cacheTtlSec', { default:0, min:0, step:5 }),
      _blockField('retryEnabled', 'Cho phép thử lại', 'Enable retry', 'toggle', 'config.refresh.retryEnabled', { default:true }),
      _blockField('loadingText', 'Nội dung khi tải', 'Loading text', 'text', 'config.loadingState.message', { default:'' }),
      _blockField('emptyTitle', 'Tiêu đề rỗng', 'Empty title', 'text', 'config.emptyState.title', { default:'' }),
      _blockField('emptyText', 'Nội dung rỗng', 'Empty text', 'textarea', 'config.emptyState.message', { default:'' }),
      _blockField('emptyAction', 'CTA rỗng', 'Empty-state CTA', 'text', 'config.emptyState.actionLabel', { default:'' })
    ])
  ];

  var specialized = _buildSpecializedDataSections(type, renderer);
  if(specialized.length){
    Array.prototype.push.apply(sections, specialized);
  } else if(renderer === 'kpi-row'){
    sections.push(_blockSection('metrics', 'Metrics', 'Metrics', [
      _blockField('items', 'Danh sách KPI', 'Metric items', 'collection', 'config.items', {
        default:[
          { label:{vi:'KPI 1', en:'KPI 1'}, valueField:'value', color:'#2563eb' },
          { label:{vi:'KPI 2', en:'KPI 2'}, valueField:'value_2', color:'#16a34a' }
        ],
        addLabel:'Thêm KPI',
        itemLabel:'KPI',
        itemFields:[
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'KPI' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'KPI' }),
          _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'valueField', { default:'value' }),
          _blockField('targetField', 'Field target', 'Target field', 'field-select', 'targetField', { default:'' }),
          _blockField('formula', 'Preset formula', 'Preset formula', 'formula-select', 'formula', { default:'' }),
          _blockField('unit', 'Đơn vị', 'Unit', 'text', 'unit', { default:'' }),
          _blockField('color', 'Màu nhấn', 'Accent color', 'color', 'color', { default:'#2563eb' })
        ]
      })
    ]));
  } else if(renderer === 'data-table'){
    sections.push(_blockSection('columns', 'Cột dữ liệu', 'Columns', [
      _blockField('columns', 'Danh sách cột', 'Columns', 'collection', 'config.columns', {
        default:[
          { key:'code', label:{vi:'Mã', en:'Code'}, type:'string', width:'140', align:'left', sortable:true, filterable:true },
          { key:'name', label:{vi:'Tên', en:'Name'}, type:'string', width:'220', align:'left', sortable:true, filterable:true },
          { key:'status', label:{vi:'Trạng thái', en:'Status'}, type:'badge', width:'140', align:'center', sortable:true, filterable:true, statusSet:'so_status' }
        ],
        addLabel:'Thêm cột',
        itemLabel:'Cột',
        itemFields:[
          _blockField('key', 'Field key', 'Field key', 'field-select', 'key', { default:'field_key' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Cột' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Column' }),
          _blockField('type', 'Field type', 'Field type', 'field-type-select', 'type', { default:'string' }),
          _blockField('width', 'Width', 'Width', 'text', 'width', { default:'160' }),
          _blockField('align', 'Căn', 'Align', 'select', 'align', { default:'left', options:['left','center','right'] }),
          _blockField('formula', 'Preset formula', 'Preset formula', 'formula-select', 'formula', { default:'' }),
          _blockField('statusSet', 'Status set', 'Status set', 'status-set-select', 'statusSet', { default:'' }),
          _blockField('sortable', 'Sortable', 'Sortable', 'toggle', 'sortable', { default:true }),
          _blockField('filterable', 'Filterable', 'Filterable', 'toggle', 'filterable', { default:true })
        ]
      }),
      _blockField('pageSize', 'Page size', 'Page size', 'number', 'config.pageSize', { default:20, min:5, step:5 }),
      _blockField('rowKey', 'Row key', 'Row key', 'field-select', 'config.rowKey', { default:'id' })
    ]));
  } else if(renderer === 'data-cards'){
    sections.push(_blockSection('cards', 'Ánh xạ thẻ', 'Card mapping', [
      _blockField('titleField', 'Field tiêu đề', 'Title field', 'field-select', 'config.card.titleField', { default:'name' }),
      _blockField('subtitleField', 'Field phụ đề', 'Subtitle field', 'field-select', 'config.card.subtitleField', { default:'status' }),
      _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'config.card.valueField', { default:'' }),
      _blockField('tagField', 'Field tag', 'Tag field', 'field-select', 'config.card.tagField', { default:'' }),
      _blockField('imageField', 'Field image', 'Image field', 'field-select', 'config.card.imageField', { default:'' }),
      _blockField('columns', 'Số cột', 'Columns', 'number', 'config.columns', { default:3, min:1, max:6 })
    ]));
  } else if(renderer === 'data-timeline'){
    sections.push(_blockSection('timeline', 'Ánh xạ timeline', 'Timeline mapping', [
      _blockField('dateKey', 'Field thời gian', 'Date field', 'field-select', 'config.dateKey', { default:'created_at' }),
      _blockField('titleKey', 'Field tiêu đề', 'Title field', 'field-select', 'config.titleKey', { default:'title' }),
      _blockField('descKey', 'Field mô tả', 'Description field', 'field-select', 'config.descKey', { default:'description' }),
      _blockField('statusKey', 'Field trạng thái', 'Status field', 'field-select', 'config.statusKey', { default:'status' }),
      _blockField('groupBy', 'Group by', 'Group by', 'field-select', 'config.groupBy', { default:'' })
    ]));
  } else if(renderer === 'filter-bar'){
    sections.push(_blockSection('filters', 'Bộ lọc', 'Filters', [
      _blockField('filters', 'Danh sách filter', 'Filters', 'collection', 'config.filters', {
        default:[
          { key:'keyword', label:{vi:'Từ khóa', en:'Keyword'}, type:'search', placeholder:{vi:'Nhập từ khóa', en:'Search'} },
          { key:'status', label:{vi:'Trạng thái', en:'Status'}, type:'select', statusSet:'so_status' }
        ],
        addLabel:'Thêm filter',
        itemLabel:'Filter',
        itemFields:[
          _blockField('key', 'Key', 'Key', 'text', 'key', { default:'filter_key' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Filter' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Filter' }),
          _blockField('type', 'Loại', 'Type', 'select', 'type', { default:'text', options:['search','text','select','date-range','number-range','status','checkbox'] }),
          _blockField('fieldRef', 'Field ref', 'Field ref', 'field-select', 'fieldRef', { default:'' }),
          _blockField('statusSet', 'Status set', 'Status set', 'status-set-select', 'statusSet', { default:'' }),
          _blockField('placeholderVi', 'Placeholder VI', 'Placeholder VI', 'text', 'placeholder.vi', { default:'' }),
          _blockField('placeholderEn', 'Placeholder EN', 'Placeholder EN', 'text', 'placeholder.en', { default:'' }),
          _blockField('defaultValue', 'Mặc định', 'Default value', 'text', 'defaultValue', { default:'' })
        ]
      })
    ]));
  } else if(renderer === 'form-standard'){
    sections.push(_blockSection('fields', 'Bố cục field', 'Field layout', [
      _blockField('fields', 'Danh sách field', 'Fields', 'collection', 'config.fields', {
        default:[
          { key:'code', label:{vi:'Mã', en:'Code'}, type:'string', required:true, span:'half' },
          { key:'name', label:{vi:'Tên', en:'Name'}, type:'string', required:true, span:'half' },
          { key:'status', label:{vi:'Trạng thái', en:'Status'}, type:'select', required:false, span:'half', statusSet:'so_status' }
        ],
        addLabel:'Thêm field',
        itemLabel:'Field',
        itemFields:[
          _blockField('key', 'Key', 'Key', 'text', 'key', { default:'field_key' }),
          _blockField('fieldRef', 'Field ref', 'Field ref', 'field-select', 'fieldRef', { default:'' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Field' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Field' }),
          _blockField('type', 'Loại', 'Type', 'select', 'type', { default:'string', options:['string','textarea','number','select','date','datetime','boolean','currency','email','phone','file','signature'] }),
          _blockField('placeholderVi', 'Placeholder VI', 'Placeholder VI', 'text', 'placeholder.vi', { default:'' }),
          _blockField('placeholderEn', 'Placeholder EN', 'Placeholder EN', 'text', 'placeholder.en', { default:'' }),
          _blockField('statusSet', 'Status set', 'Status set', 'status-set-select', 'statusSet', { default:'' }),
          _blockField('required', 'Bắt buộc', 'Required', 'toggle', 'required', { default:false }),
          _blockField('span', 'Độ rộng', 'Span', 'select', 'span', { default:'half', options:['half','full'] }),
          _blockField('defaultValue', 'Mặc định', 'Default value', 'text', 'defaultValue', { default:'' }),
          _blockField('rules', 'Validation', 'Validation', 'expression', 'rules', { default:'' })
        ]
      }),
      _blockField('columns', 'Số cột form', 'Form columns', 'number', 'config.columns', { default:2, min:1, max:4 }),
      _blockField('submitEndpoint', 'Submit API', 'Submit API', 'api-select', 'config.submit.api', { default:'', repaintOnChange:true }),
      _blockField('submitMethod', 'Submit method', 'Submit method', 'select', 'config.submit.method', { default:'POST', options:['POST','PUT','PATCH'] })
    ]));
  } else if(renderer === 'chart-donut'){
    sections.push(_blockSection('segments', 'Phân đoạn', 'Segments', [
      _blockField('labelField', 'Field nhãn', 'Label field', 'field-select', 'config.chart.labelField', { default:'name' }),
      _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'config.chart.valueField', { default:'value' }),
      _blockField('innerRadius', 'Bán kính trong', 'Inner radius', 'number', 'config.chart.innerRadius', { default:60, min:0, max:95 }),
      _blockField('showPercent', 'Hiện %', 'Show percent', 'toggle', 'config.chart.showPercent', { default:true }),
      _blockField('series', 'Segments config', 'Segments config', 'collection', 'config.series', {
        default:[],
        addLabel:'Thêm segment',
        itemLabel:'Segment',
        itemFields:[
          _blockField('matchValue', 'Match value', 'Match value', 'text', 'matchValue', { default:'' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Segment' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Segment' }),
          _blockField('color', 'Màu', 'Color', 'color', 'color', { default:'#2563eb' })
        ]
      })
    ]));
  } else if(renderer === 'action-toolbar'){
    sections.push(_blockSection('buttons', 'Nút hành động', 'Buttons', [
      _blockField('buttons', 'Danh sách nút', 'Buttons', 'collection', 'config.buttons', {
        default:[
          { actionId:'refresh', label:{vi:'Làm mới', en:'Refresh'}, variant:'secondary', endpoint:'', confirmMessage:'' },
          { actionId:'export', label:{vi:'Xuất', en:'Export'}, variant:'primary', endpoint:'', confirmMessage:'' }
        ],
        addLabel:'Thêm nút',
        itemLabel:'Nút',
        itemFields:[
          _blockField('actionId', 'Action ID', 'Action ID', 'text', 'actionId', { default:'action_id' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Nút' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Button' }),
          _blockField('icon', 'Icon', 'Icon', 'text', 'icon', { default:'' }),
          _blockField('variant', 'Variant', 'Variant', 'select', 'variant', { default:'primary', options:['primary','secondary','ghost','danger','success'] }),
          _blockField('endpoint', 'API endpoint', 'API endpoint', 'api-select', 'endpoint', { default:'', repaintOnChange:true }),
          _blockField('method', 'Method', 'Method', 'select', 'method', { default:'POST', options:['GET','POST','PUT','PATCH','DELETE'] }),
          _blockField('confirmMessage', 'Confirm message', 'Confirm message', 'text', 'confirmMessage', { default:'' }),
          _blockField('visibleWhen', 'Visible when', 'Visible when', 'expression', 'visibleWhen', { default:'' })
        ]
      })
    ]));
  } else {
    sections.push(_blockSection('mapping', 'Ánh xạ', 'Mapping', [
      _blockField('titleField', 'Field tiêu đề', 'Title field', 'field-select', 'config.mapping.titleField', { default:'name' }),
      _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'config.mapping.valueField', { default:'value' }),
      _blockField('statusField', 'Field trạng thái', 'Status field', 'field-select', 'config.mapping.statusField', { default:'status' }),
      _blockField('notes', 'Ghi chú mapping', 'Mapping note', 'textarea', 'config.mapping.notes', { default:'', rows:3 })
    ]));
  }

  if(entry.category === 'quality'){
    sections.push(_blockSection('quality', 'Quy tắc chất lượng', 'Quality rules', [
      _blockField('lsl', 'LSL', 'LSL', 'number', 'config.quality.lsl', { default:0 }),
      _blockField('target', 'Target', 'Target', 'number', 'config.quality.target', { default:0 }),
      _blockField('usl', 'USL', 'USL', 'number', 'config.quality.usl', { default:0 }),
      _blockField('sampleSize', 'Cỡ mẫu', 'Sample size', 'number', 'config.quality.sampleSize', { default:1, min:1 }),
      _blockField('defectField', 'Field lỗi/defect', 'Defect field', 'field-select', 'config.quality.defectField', { default:'defect_code' }),
      _blockField('reactionPlan', 'Kế hoạch phản ứng', 'Reaction plan', 'textarea', 'config.quality.reactionPlan', { default:'', rows:2 }),
      _blockField('formula', 'Preset formula', 'Preset formula', 'formula-select', 'config.quality.formulaPreset', { default:'' }),
      _blockField('statusSet', 'Status set', 'Status set', 'status-set-select', 'config.quality.statusSet', { default:'' })
    ]));
  }

  if(entry.category === 'iot'){
    sections.push(_blockSection('iot', 'Cấu hình IoT', 'IoT config', [
      _blockField('connector', 'Connector', 'Connector', 'iot-connector-select', 'config.iot.connector', { default:'', repaintOnChange:true }),
      _blockField('deviceId', 'Device ID', 'Device ID', 'text', 'config.iot.deviceId', { default:'' }),
      _blockField('topic', 'Topic / Node', 'Topic / Node', 'text', 'config.iot.topic', { default:'' }),
      _blockField('qualityField', 'Field quality code', 'Quality-code field', 'field-select', 'config.iot.qualityField', { default:'quality_code' }),
      _blockField('staleAfterSec', 'Quá hạn sau (s)', 'Stale after (sec)', 'number', 'config.iot.staleAfterSec', { default:120, min:0 }),
      _blockField('reconnectMs', 'Chu kỳ reconnect (ms)', 'Reconnect interval (ms)', 'number', 'config.iot.reconnectMs', { default:15000, min:0, step:500 }),
      _blockField('signals', 'Signal map', 'Signal map', 'collection', 'config.iot.signals', {
        default:[],
        addLabel:'Thêm signal',
        itemLabel:'Signal',
        itemFields:[
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Signal' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Signal' }),
          _blockField('point', 'Point', 'Point', 'text', 'point', { default:'' }),
          _blockField('fieldKey', 'Field key', 'Field key', 'text', 'fieldKey', { default:'' }),
          _blockField('unit', 'Đơn vị', 'Unit', 'text', 'unit', { default:'' }),
          _blockField('threshold', 'Threshold', 'Threshold', 'number', 'threshold', { default:0 }),
          _blockField('color', 'Màu', 'Color', 'color', 'color', { default:'#f59e0b' })
        ]
      }),
      _blockField('alarmApi', 'API sự kiện alarm', 'Alarm event API', 'api-select', 'config.iot.alarm.api', { default:'', repaintOnChange:true })
    ]));
  }

  return sections;
}

function _buildSpecializedDataSections(type, renderer){
  if(type === 'data-kanban' || type === 'kanban-board' || type === 'status-board' || type === 'auto-approval-lane' || type === 'auto-task-board') return _buildKanbanSections(type);
  if(type === 'data-gantt' || type === 'schedule-grid' || type === 'calendar-board' || type === 'gantt-board' || type === 'mfg-production-schedule') return _buildScheduleSections(type);
  if(type === 'pivot-table' || type === 'matrix-grid' || type === 'heat-table' || type === 'quality-defect-matrix') return _buildMatrixSections(type);
  if(type === 'data-detail' || type === 'record-detail' || type === 'master-detail' || type === 'quality-traceability') return _buildRecordDetailSections(type);
  if(type === 'mfg-machine-status' || type === 'iot-machine-twin' || type === 'iot-edge-health') return _buildMachineStatusSections(type);
  if(type === 'mfg-oee-trend' || type === 'iot-oee-board' || type === 'iot-energy-monitor') return _buildOeeSections(type);
  if(type === 'quality-spc-chart' || type === 'quality-control-chart' || type === 'chart-control') return _buildSpcSections(type);
  if(type === 'quality-pareto' || type === 'chart-waterfall' || type === 'chart-histogram' || type === 'chart-boxplot') return _buildDistributionChartSections(type);
  if(type === 'form-wizard' || type === 'approval-form') return _buildFormWizardSections(type);
  if(type === 'form-modal' || type === 'action-quick-create') return _buildFormModalSections(type);
  if(type === 'checklist-form' || type === 'mfg-setup-check' || type === 'quality-inspection-form' || type === 'quality-checksheet') return _buildChecklistSections(type);
  if(type === 'query-builder' || type === 'search-panel') return _buildQueryBuilderSections(type);
  if(type === 'iot-connector-panel') return _buildIoTConnectorPanelSections();
  if(type === 'iot-signal-map') return _buildSignalMapSections();
  if(type === 'iot-threshold-manager' || type === 'iot-condition-monitor') return _buildThresholdSections(type);
  if(type === 'action-status-flow' || type === 'action-approval' || type === 'auto-workflow-designer') return _buildStatusFlowSections(type);
  if(type === 'action-bulk') return _buildBulkActionSections();
  if(type === 'chart-gauge' || type === 'chart-progress' || type === 'insight-target-tracker') return _buildGaugeSections(type);
  if(type === 'chart-radar' || type === 'chart-scatter' || type === 'chart-bubble' || type === 'chart-heatmap' || type === 'insight-cohort') return _buildAdvancedChartSections(type);
  if(renderer === 'chart-bar' && /^chart-/.test(type)) return _buildCartesianChartSections(type);
  return [];
}

function _buildKanbanSections(type){
  return [
    _blockSection('lanes', 'Làn trạng thái', 'Status lanes', [
      _blockField('laneField', 'Field lane', 'Lane field', 'field-select', 'config.kanban.laneField', { default:'status' }),
      _blockField('swimlaneField', 'Field swimlane', 'Swimlane field', 'field-select', 'config.kanban.swimlaneField', { default:'' }),
      _blockField('ownerField', 'Field phụ trách', 'Owner field', 'field-select', 'config.kanban.ownerField', { default:'owner_name' }),
      _blockField('wipField', 'Field WIP', 'WIP field', 'field-select', 'config.kanban.wipField', { default:'' }),
      _blockField('lanes', 'Danh sách lane', 'Lane list', 'collection', 'config.kanban.lanes', {
        default:[],
        addLabel:'Thêm lane',
        itemLabel:'Lane',
        itemFields:[
          _blockField('key', 'Mã lane', 'Lane key', 'text', 'key', { default:'new' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Mới' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'New' }),
          _blockField('limit', 'Giới hạn WIP', 'WIP limit', 'number', 'limit', { default:0, min:0 }),
          _blockField('color', 'Màu', 'Color', 'color', 'color', { default:'#2563eb' })
        ]
      })
    ]),
    _blockSection('cards', 'Hiển thị thẻ', 'Card display', [
      _blockField('titleField', 'Field tiêu đề', 'Title field', 'field-select', 'config.kanban.card.titleField', { default:'title' }),
      _blockField('subtitleField', 'Field phụ đề', 'Subtitle field', 'field-select', 'config.kanban.card.subtitleField', { default:'owner_name' }),
      _blockField('priorityField', 'Field ưu tiên', 'Priority field', 'field-select', 'config.kanban.card.priorityField', { default:'priority' }),
      _blockField('dateField', 'Field hạn xử lý', 'Due-date field', 'field-select', 'config.kanban.card.dueDateField', { default:'due_date' }),
      _blockField('tagField', 'Field tag', 'Tag field', 'field-select', 'config.kanban.card.tagField', { default:'' }),
      _blockField('allowCreate', 'Cho phép tạo nhanh', 'Allow quick create', 'toggle', 'config.kanban.allowCreate', { default:true }),
      _blockField('allowDrag', 'Cho phép kéo thả', 'Allow drag and drop', 'toggle', 'config.kanban.allowDrag', { default:true }),
      _blockField('persistApi', 'API lưu thay đổi', 'Persist API', 'api-select', 'config.kanban.persist.api', { default:'', repaintOnChange:true })
    ])
  ];
}

function _buildScheduleSections(type){
  return [
    _blockSection('timeline', 'Timeline & lịch', 'Timeline & calendar', [
      _blockField('defaultView', 'View mặc định', 'Default view', 'select', 'config.schedule.defaultView', {
        default:type === 'calendar-board' ? 'month' : (type === 'gantt-board' ? 'gantt' : 'week'),
        options:['day','week','month','timeline','gantt']
      }),
      _blockField('startField', 'Field bắt đầu', 'Start field', 'field-select', 'config.schedule.startField', { default:'start_at' }),
      _blockField('endField', 'Field kết thúc', 'End field', 'field-select', 'config.schedule.endField', { default:'end_at' }),
      _blockField('titleField', 'Field tiêu đề', 'Title field', 'field-select', 'config.schedule.titleField', { default:'title' }),
      _blockField('resourceField', 'Field nguồn lực', 'Resource field', 'field-select', 'config.schedule.resourceField', { default:'resource_name' }),
      _blockField('statusField', 'Field trạng thái', 'Status field', 'field-select', 'config.schedule.statusField', { default:'status' }),
      _blockField('progressField', 'Field tiến độ', 'Progress field', 'field-select', 'config.schedule.progressField', { default:'progress_pct' }),
      _blockField('dependencyField', 'Field phụ thuộc', 'Dependency field', 'field-select', 'config.schedule.dependencyField', { default:'depends_on' })
    ]),
    _blockSection('calendar', 'Hiển thị lịch', 'Calendar settings', [
      _blockField('slotMinutes', 'Bước thời gian (phút)', 'Slot minutes', 'number', 'config.schedule.slotMinutes', { default:30, min:5, step:5 }),
      _blockField('workdayStart', 'Giờ bắt đầu', 'Workday start', 'text', 'config.schedule.workdayStart', { default:'08:00' }),
      _blockField('workdayEnd', 'Giờ kết thúc', 'Workday end', 'text', 'config.schedule.workdayEnd', { default:'17:00' }),
      _blockField('showWeekends', 'Hiện cuối tuần', 'Show weekends', 'toggle', 'config.schedule.showWeekends', { default:false }),
      _blockField('allowOverlap', 'Cho phép chồng lịch', 'Allow overlaps', 'toggle', 'config.schedule.allowOverlap', { default:false }),
      _blockField('colorField', 'Field màu', 'Color field', 'field-select', 'config.schedule.colorField', { default:'' }),
      _blockField('groupByField', 'Nhóm theo', 'Group by', 'field-select', 'config.schedule.groupByField', { default:'' }),
      _blockField('timezone', 'Time zone', 'Time zone', 'text', 'config.schedule.timezone', { default:'Asia/Ho_Chi_Minh' })
    ])
  ];
}

function _buildMatrixSections(type){
  return [
    _blockSection('axes', 'Trục tổng hợp', 'Aggregation axes', [
      _blockField('rowField', 'Field hàng', 'Row field', 'field-select', 'config.matrix.rowField', { default:'category' }),
      _blockField('columnField', 'Field cột', 'Column field', 'field-select', 'config.matrix.columnField', { default:'period' }),
      _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'config.matrix.valueField', { default:'value' }),
      _blockField('aggregate', 'Hàm tổng hợp', 'Aggregate', 'select', 'config.matrix.aggregate', { default:'sum', options:['sum','avg','count','min','max'] }),
      _blockField('sortBy', 'Sắp xếp theo', 'Sort by', 'select', 'config.matrix.sortBy', { default:'value-desc', options:['value-desc','value-asc','label-asc','label-desc'] }),
      _blockField('showTotals', 'Hiện tổng', 'Show totals', 'toggle', 'config.matrix.showTotals', { default:true })
    ]),
    _blockSection('definitions', 'Định nghĩa hiển thị', 'Display definitions', [
      _blockField('rows', 'Danh sách hàng', 'Row definitions', 'collection', 'config.matrix.rows', {
        default:[],
        addLabel:'Thêm hàng',
        itemLabel:'Hàng',
        itemFields:[
          _blockField('key', 'Mã', 'Key', 'text', 'key', { default:'row_key' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Hàng' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Row' }),
          _blockField('formula', 'Công thức', 'Formula', 'formula-select', 'formula', { default:'' })
        ]
      }),
      _blockField('columns', 'Danh sách cột', 'Column definitions', 'collection', 'config.matrix.columns', {
        default:[],
        addLabel:'Thêm cột',
        itemLabel:'Cột',
        itemFields:[
          _blockField('key', 'Mã', 'Key', 'text', 'key', { default:'col_key' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Cột' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Column' }),
          _blockField('color', 'Màu', 'Color', 'color', 'color', { default:'#0f766e' })
        ]
      }),
      _blockField('heatScale', 'Thang nhiệt', 'Heat scale', 'select', 'config.matrix.heatScale', { default:type === 'heat-table' ? 'red-yellow-green' : 'none', options:['none','red-yellow-green','blue-scale','amber-scale'] }),
      _blockField('decimals', 'Số chữ số thập phân', 'Decimals', 'number', 'config.matrix.decimals', { default:0, min:0, max:6 })
    ])
  ];
}

function _buildRecordDetailSections(type){
  return [
    _blockSection('summary', 'Thông tin chính', 'Summary fields', [
      _blockField('titleField', 'Field tiêu đề', 'Title field', 'field-select', 'config.detail.titleField', { default:'title' }),
      _blockField('subtitleField', 'Field phụ đề', 'Subtitle field', 'field-select', 'config.detail.subtitleField', { default:'code' }),
      _blockField('statusField', 'Field trạng thái', 'Status field', 'field-select', 'config.detail.statusField', { default:'status' }),
      _blockField('ownerField', 'Field phụ trách', 'Owner field', 'field-select', 'config.detail.ownerField', { default:'owner_name' }),
      _blockField('updatedAtField', 'Field cập nhật', 'Updated-at field', 'field-select', 'config.detail.updatedAtField', { default:'updated_at' }),
      _blockField('heroImageField', 'Field ảnh đại diện', 'Hero image field', 'field-select', 'config.detail.heroImageField', { default:'' })
    ]),
    _blockSection('sections', 'Khu vực chi tiết', 'Detail sections', [
      _blockField('sections', 'Danh sách section', 'Section list', 'collection', 'config.detail.sections', {
        default:[],
        addLabel:'Thêm section',
        itemLabel:'Section',
        itemFields:[
          _blockField('key', 'Mã section', 'Section key', 'text', 'key', { default:'overview' }),
          _blockField('labelVi', 'Tiêu đề VI', 'Title VI', 'text', 'label.vi', { default:'Tổng quan' }),
          _blockField('labelEn', 'Tiêu đề EN', 'Title EN', 'text', 'label.en', { default:'Overview' }),
          _blockField('fieldsCsv', 'Danh sách field', 'Field list', 'text', 'fieldsCsv', { default:'code,name,status' }),
          _blockField('visibleWhen', 'Điều kiện hiện', 'Visible when', 'expression', 'visibleWhen', { default:'' })
        ]
      }),
      _blockField('relatedApi', 'API liên quan', 'Related-record API', 'api-select', 'config.detail.relatedApi', { default:'', repaintOnChange:true }),
      _blockField('childDataKey', 'Data key liên quan', 'Related data key', 'text', 'config.detail.relatedDataKey', { default:'items' }),
      _blockField('useTabs', 'Hiển thị dạng tab', 'Render as tabs', 'toggle', 'config.detail.useTabs', { default:type === 'master-detail' })
    ])
  ];
}

function _buildMachineStatusSections(type){
  return [
    _blockSection('machine', 'Trạng thái thiết bị', 'Machine status', [
      _blockField('assetField', 'Field máy/thiết bị', 'Asset field', 'field-select', 'config.machine.assetField', { default:'machine_name' }),
      _blockField('lineField', 'Field chuyền', 'Line field', 'field-select', 'config.machine.lineField', { default:'line_name' }),
      _blockField('statusField', 'Field trạng thái', 'Status field', 'field-select', 'config.machine.statusField', { default:'status' }),
      _blockField('reasonField', 'Field lý do', 'Reason field', 'field-select', 'config.machine.reasonField', { default:'reason' }),
      _blockField('updatedAtField', 'Field thời điểm', 'Updated-at field', 'field-select', 'config.machine.updatedAtField', { default:'updated_at' }),
      _blockField('showDowntime', 'Hiện downtime', 'Show downtime', 'toggle', 'config.machine.showDowntime', { default:true })
    ]),
    _blockSection('legend', 'Legend trạng thái', 'Status legend', [
      _blockField('statusMap', 'Danh sách trạng thái', 'Status mapping', 'collection', 'config.machine.statusMap', {
        default:[],
        addLabel:'Thêm trạng thái',
        itemLabel:'Trạng thái',
        itemFields:[
          _blockField('key', 'Mã', 'Key', 'text', 'key', { default:'running' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Đang chạy' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Running' }),
          _blockField('color', 'Màu', 'Color', 'color', 'color', { default:'#16a34a' }),
          _blockField('severity', 'Mức độ', 'Severity', 'select', 'severity', { default:'info', options:['info','warning','critical'] })
        ]
      }),
      _blockField('alertAgeMin', 'Phút cảnh báo', 'Alert age (min)', 'number', 'config.machine.alertAgeMin', { default:15, min:0 }),
      _blockField('showCounters', 'Hiện bộ đếm', 'Show counters', 'toggle', 'config.machine.showCounters', { default:true })
    ])
  ];
}

function _buildOeeSections(type){
  return [
    _blockSection('factors', 'Thành phần OEE', 'OEE factors', [
      _blockField('oeeField', 'Field OEE', 'OEE field', 'field-select', 'config.oee.oeeField', { default:'oee' }),
      _blockField('availabilityField', 'Field availability', 'Availability field', 'field-select', 'config.oee.availabilityField', { default:'availability' }),
      _blockField('performanceField', 'Field performance', 'Performance field', 'field-select', 'config.oee.performanceField', { default:'performance' }),
      _blockField('qualityField', 'Field quality', 'Quality field', 'field-select', 'config.oee.qualityField', { default:'quality' }),
      _blockField('targetField', 'Field target', 'Target field', 'field-select', 'config.oee.targetField', { default:'target_oee' }),
      _blockField('timeBucket', 'Bucket thời gian', 'Time bucket', 'select', 'config.oee.timeBucket', { default:type === 'mfg-oee-trend' ? 'shift' : 'current', options:['current','hour','shift','day','week'] })
    ]),
    _blockSection('context', 'Ngữ cảnh sản xuất', 'Manufacturing context', [
      _blockField('machineField', 'Field máy', 'Machine field', 'field-select', 'config.oee.machineField', { default:'machine_name' }),
      _blockField('shiftField', 'Field ca', 'Shift field', 'field-select', 'config.oee.shiftField', { default:'shift_name' }),
      _blockField('goodCountField', 'Field good count', 'Good-count field', 'field-select', 'config.oee.goodCountField', { default:'good_qty' }),
      _blockField('rejectCountField', 'Field reject count', 'Reject-count field', 'field-select', 'config.oee.rejectCountField', { default:'reject_qty' }),
      _blockField('runtimeField', 'Field runtime', 'Runtime field', 'field-select', 'config.oee.runtimeField', { default:'runtime_min' }),
      _blockField('downtimeField', 'Field downtime', 'Downtime field', 'field-select', 'config.oee.downtimeField', { default:'downtime_min' }),
      _blockField('showTrend', 'Hiện xu hướng', 'Show trend', 'toggle', 'config.oee.showTrend', { default:type === 'mfg-oee-trend' })
    ])
  ];
}

function _buildSpcSections(type){
  return [
    _blockSection('measurement', 'Đo lường SPC', 'SPC measurement', [
      _blockField('valueField', 'Field giá trị đo', 'Measurement field', 'field-select', 'config.spc.valueField', { default:'measured_value' }),
      _blockField('sampleField', 'Field mẫu', 'Sample field', 'field-select', 'config.spc.sampleField', { default:'sample_no' }),
      _blockField('subgroupField', 'Field subgroup', 'Subgroup field', 'field-select', 'config.spc.subgroupField', { default:'subgroup' }),
      _blockField('specTargetField', 'Field target', 'Target field', 'field-select', 'config.spc.targetField', { default:'target' }),
      _blockField('lslField', 'Field LSL', 'LSL field', 'field-select', 'config.spc.lslField', { default:'lsl' }),
      _blockField('uslField', 'Field USL', 'USL field', 'field-select', 'config.spc.uslField', { default:'usl' }),
      _blockField('timestampField', 'Field thời gian', 'Timestamp field', 'field-select', 'config.spc.timestampField', { default:'measured_at' }),
      _blockField('chartMode', 'Chế độ chart', 'Chart mode', 'select', 'config.spc.chartMode', { default:type === 'quality-control-chart' ? 'xbar-r' : 'individual', options:['individual','xbar-r','xbar-s','np','p'] })
    ]),
    _blockSection('rules', 'Luật kiểm soát', 'Control rules', [
      _blockField('uclField', 'Field UCL', 'UCL field', 'field-select', 'config.spc.uclField', { default:'ucl' }),
      _blockField('lclField', 'Field LCL', 'LCL field', 'field-select', 'config.spc.lclField', { default:'lcl' }),
      _blockField('centerLineField', 'Field center line', 'Center-line field', 'field-select', 'config.spc.centerLineField', { default:'center_line' }),
      _blockField('showSigmaBands', 'Hiện sigma bands', 'Show sigma bands', 'toggle', 'config.spc.showSigmaBands', { default:true }),
      _blockField('highlightViolations', 'Nhấn vi phạm', 'Highlight violations', 'toggle', 'config.spc.highlightViolations', { default:true }),
      _blockField('rulePreset', 'Preset rule', 'Rule preset', 'select', 'config.spc.rulePreset', { default:'western-electric', options:['western-electric','nelson','custom'] }),
      _blockField('violationField', 'Field vi phạm', 'Violation field', 'field-select', 'config.spc.violationField', { default:'violation_code' })
    ])
  ];
}

function _buildDistributionChartSections(type){
  return [
    _blockSection('distribution', 'Phân bố & thứ hạng', 'Distribution & ranking', [
      _blockField('categoryField', 'Field hạng mục', 'Category field', 'field-select', 'config.distribution.categoryField', { default:'category' }),
      _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'config.distribution.valueField', { default:'value' }),
      _blockField('secondaryValueField', 'Field phụ', 'Secondary value field', 'field-select', 'config.distribution.secondaryValueField', { default:'' }),
      _blockField('sortBy', 'Sắp xếp theo', 'Sort by', 'select', 'config.distribution.sortBy', { default:'value-desc', options:['value-desc','value-asc','category-asc','category-desc'] }),
      _blockField('topN', 'Giới hạn top N', 'Top N', 'number', 'config.distribution.topN', { default:type === 'quality-pareto' ? 10 : 0, min:0 }),
      _blockField('showCumulative', 'Hiện lũy kế', 'Show cumulative', 'toggle', 'config.distribution.showCumulative', { default:type === 'quality-pareto' || type === 'chart-waterfall' }),
      _blockField('binCount', 'Số bucket/bin', 'Bucket count', 'number', 'config.distribution.binCount', { default:type === 'chart-histogram' ? 12 : 0, min:0 }),
      _blockField('orientation', 'Hướng hiển thị', 'Orientation', 'select', 'config.distribution.orientation', { default:'vertical', options:['vertical','horizontal'] })
    ]),
    _blockSection('benchmarks', 'Mốc chuẩn', 'Benchmarks', [
      _blockField('targetValue', 'Giá trị mục tiêu', 'Target value', 'number', 'config.distribution.targetValue', { default:0 }),
      _blockField('warningValue', 'Ngưỡng cảnh báo', 'Warning value', 'number', 'config.distribution.warningValue', { default:0 }),
      _blockField('criticalValue', 'Ngưỡng nghiêm trọng', 'Critical value', 'number', 'config.distribution.criticalValue', { default:0 }),
      _blockField('showLabels', 'Hiện nhãn giá trị', 'Show value labels', 'toggle', 'config.distribution.showLabels', { default:true })
    ])
  ];
}

function _buildFormWizardSections(type){
  return [
    _blockSection('steps', 'Các bước', 'Wizard steps', [
      _blockField('steps', 'Danh sách bước', 'Step list', 'collection', 'config.wizard.steps', {
        default:[],
        addLabel:'Thêm bước',
        itemLabel:'Bước',
        itemFields:[
          _blockField('key', 'Mã bước', 'Step key', 'text', 'key', { default:'step_1' }),
          _blockField('labelVi', 'Tiêu đề VI', 'Title VI', 'text', 'label.vi', { default:'Bước 1' }),
          _blockField('labelEn', 'Tiêu đề EN', 'Title EN', 'text', 'label.en', { default:'Step 1' }),
          _blockField('fieldsCsv', 'Danh sách field', 'Field list', 'text', 'fieldsCsv', { default:'code,name' }),
          _blockField('visibleWhen', 'Điều kiện hiện', 'Visible when', 'expression', 'visibleWhen', { default:'' })
        ]
      }),
      _blockField('allowSkip', 'Cho phép bỏ qua', 'Allow skip', 'toggle', 'config.wizard.allowSkip', { default:false }),
      _blockField('showProgress', 'Hiện thanh tiến độ', 'Show progress', 'toggle', 'config.wizard.showProgress', { default:true }),
      _blockField('saveDraftApi', 'API lưu nháp', 'Save-draft API', 'api-select', 'config.wizard.saveDraft.api', { default:'', repaintOnChange:true })
    ]),
    _blockSection('submission', 'Nộp & hoàn tất', 'Submission', [
      _blockField('submitApi', 'API hoàn tất', 'Submit API', 'api-select', 'config.wizard.submit.api', { default:'', repaintOnChange:true }),
      _blockField('submitMethod', 'Phương thức nộp', 'Submit method', 'select', 'config.wizard.submit.method', { default:'POST', options:['POST','PUT','PATCH'] }),
      _blockField('successRoute', 'Route thành công', 'Success route', 'text', 'config.wizard.successRoute', { default:'' }),
      _blockField('summaryStepKey', 'Bước xác nhận', 'Review step key', 'text', 'config.wizard.summaryStepKey', { default:'' })
    ])
  ];
}

function _buildFormModalSections(type){
  return [
    _blockSection('trigger', 'Nút mở modal', 'Modal trigger', [
      _blockField('triggerLabelVi', 'Nhãn nút VI', 'Button label VI', 'text', 'config.modal.trigger.label.vi', { default:'Tạo mới' }),
      _blockField('triggerLabelEn', 'Nhãn nút EN', 'Button label EN', 'text', 'config.modal.trigger.label.en', { default:'Create new' }),
      _blockField('triggerIcon', 'Icon', 'Icon', 'text', 'config.modal.trigger.icon', { default:'+' }),
      _blockField('triggerStyle', 'Kiểu nút', 'Button style', 'select', 'config.modal.trigger.style', { default:'primary', options:['primary','secondary','ghost','danger','success'] }),
      _blockField('titleVi', 'Tiêu đề VI', 'Modal title VI', 'text', 'config.modal.title.vi', { default:'Tạo bản ghi mới' }),
      _blockField('titleEn', 'Tiêu đề EN', 'Modal title EN', 'text', 'config.modal.title.en', { default:'Create new record' }),
      _blockField('size', 'Kích thước', 'Size', 'select', 'config.modal.size', { default:'md', options:['sm','md','lg','xl'] }),
      _blockField('closeOnOverlay', 'Đóng khi bấm nền', 'Close on overlay click', 'toggle', 'config.modal.closeOnOverlay', { default:true }),
      _blockField('closeOnSubmit', 'Đóng sau khi gửi', 'Close after submit', 'toggle', 'config.modal.closeOnSubmit', { default:true })
    ]),
    _blockSection('form', 'Biểu mẫu modal', 'Modal form', [
      _blockField('fields', 'Danh sách field', 'Fields', 'collection', 'config.fields', {
        default:[
          { key:'code', label:{vi:'Mã', en:'Code'}, type:'string', required:true, span:'half' },
          { key:'name', label:{vi:'Tên', en:'Name'}, type:'string', required:true, span:'half' },
          { key:'notes', label:{vi:'Ghi chú', en:'Notes'}, type:'textarea', required:false, span:'full' }
        ],
        addLabel:'Thêm field',
        itemLabel:'Field',
        itemFields:[
          _blockField('key', 'Key', 'Key', 'text', 'key', { default:'field_key' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Field' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Field' }),
          _blockField('type', 'Loại', 'Type', 'select', 'type', { default:'string', options:['string','textarea','number','select','date','datetime','boolean','currency','email','phone'] }),
          _blockField('required', 'Bắt buộc', 'Required', 'toggle', 'required', { default:false }),
          _blockField('span', 'Độ rộng', 'Span', 'select', 'span', { default:'half', options:['half','full'] })
        ]
      }),
      _blockField('submitApi', 'Submit API', 'Submit API', 'api-select', 'config.submit.api', { default:'', repaintOnChange:true }),
      _blockField('submitMethod', 'Submit method', 'Submit method', 'select', 'config.submit.method', { default:'POST', options:['POST','PUT','PATCH'] })
    ])
  ];
}

function _buildChecklistSections(type){
  return [
    _blockSection('items', 'Danh sách kiểm tra', 'Checklist items', [
      _blockField('items', 'Danh sách item', 'Checklist items', 'collection', 'config.checklist.items', {
        default:[],
        addLabel:'Thêm item',
        itemLabel:'Item',
        itemFields:[
          _blockField('key', 'Mã item', 'Item key', 'text', 'key', { default:'item_1' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Tiêu chí kiểm tra' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Checklist item' }),
          _blockField('type', 'Loại đánh giá', 'Input type', 'select', 'type', { default:'boolean', options:['boolean','status','number','text','photo','signature'] }),
          _blockField('required', 'Bắt buộc', 'Required', 'toggle', 'required', { default:true }),
          _blockField('score', 'Điểm', 'Score', 'number', 'score', { default:1, min:0 }),
          _blockField('evidenceRequired', 'Cần minh chứng', 'Evidence required', 'toggle', 'evidenceRequired', { default:false })
        ]
      }),
      _blockField('passScore', 'Điểm đạt', 'Pass score', 'number', 'config.checklist.passScore', { default:0, min:0 }),
      _blockField('stopOnFail', 'Dừng khi fail', 'Stop on fail', 'toggle', 'config.checklist.stopOnFail', { default:false }),
      _blockField('statusSet', 'Bộ trạng thái', 'Status set', 'status-set-select', 'config.checklist.statusSet', { default:'' })
    ]),
    _blockSection('review', 'Phê duyệt & hậu kiểm', 'Review & follow-up', [
      _blockField('reviewerRole', 'Vai trò phê duyệt', 'Reviewer role', 'text', 'config.checklist.reviewerRole', { default:'' }),
      _blockField('ncrApi', 'API tạo NCR', 'NCR API', 'api-select', 'config.checklist.ncrApi', { default:'', repaintOnChange:true }),
      _blockField('autoCreateAction', 'Tạo action khi fail', 'Create action on fail', 'toggle', 'config.checklist.autoCreateAction', { default:type === 'quality-inspection-form' }),
      _blockField('failReasonField', 'Field lý do fail', 'Fail-reason field', 'field-select', 'config.checklist.failReasonField', { default:'fail_reason' })
    ])
  ];
}

function _buildQueryBuilderSections(type){
  return [
    _blockSection('clauses', 'Điều kiện truy vấn', 'Query clauses', [
      _blockField('defaultCombinator', 'Toán tử mặc định', 'Default combinator', 'select', 'config.query.defaultCombinator', { default:'AND', options:['AND','OR'] }),
      _blockField('allowNested', 'Cho phép nhóm lồng', 'Allow nested groups', 'toggle', 'config.query.allowNested', { default:true }),
      _blockField('maxDepth', 'Độ sâu tối đa', 'Max depth', 'number', 'config.query.maxDepth', { default:3, min:1, max:8 }),
      _blockField('clauses', 'Danh sách clause mẫu', 'Preset clauses', 'collection', 'config.query.clauses', {
        default:[],
        addLabel:'Thêm clause',
        itemLabel:'Clause',
        itemFields:[
          _blockField('fieldRef', 'Field ref', 'Field ref', 'field-select', 'fieldRef', { default:'' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Điều kiện' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Condition' }),
          _blockField('operator', 'Toán tử', 'Operator', 'select', 'operator', { default:'=', options:['=','!=','>','>=','<','<=','contains','between','in'] }),
          _blockField('inputType', 'Loại input', 'Input type', 'select', 'inputType', { default:'text', options:['text','number','date','select','status'] })
        ]
      })
    ]),
    _blockSection('presets', 'Preset & đầu ra', 'Presets & outputs', [
      _blockField('allowSavePreset', 'Cho phép lưu preset', 'Allow save preset', 'toggle', 'config.query.allowSavePreset', { default:true }),
      _blockField('presetStorageKey', 'Khóa lưu preset', 'Preset storage key', 'text', 'config.query.presetStorageKey', { default:'' }),
      _blockField('resultTarget', 'Đích áp dụng', 'Result target', 'select', 'config.query.resultTarget', { default:'filters', options:['filters','api-params','redirect'] }),
      _blockField('syncToRoute', 'Đồng bộ lên route', 'Sync to route', 'toggle', 'config.query.syncToRoute', { default:type === 'search-panel' })
    ])
  ];
}

function _buildIoTConnectorPanelSections(){
  return [
    _blockSection('connector', 'Kết nối thiết bị', 'Connector setup', [
      _blockField('connector', 'Connector', 'Connector', 'iot-connector-select', 'config.connector.key', { default:'', repaintOnChange:true }),
      _blockField('authMode', 'Chế độ xác thực', 'Auth mode', 'select', 'config.connector.authMode', { default:'inherited', options:['inherited','token','basic','certificate'] }),
      _blockField('endpoint', 'Endpoint / broker', 'Endpoint / broker', 'text', 'config.connector.endpoint', { default:'' }),
      _blockField('topic', 'Topic mặc định', 'Default topic', 'text', 'config.connector.topic', { default:'' }),
      _blockField('pollIntervalMs', 'Chu kỳ poll (ms)', 'Poll interval (ms)', 'number', 'config.connector.pollIntervalMs', { default:5000, min:0, step:500 }),
      _blockField('payloadPath', 'Đường dẫn payload', 'Payload path', 'text', 'config.connector.payloadPath', { default:'payload' }),
      _blockField('heartbeatField', 'Field heartbeat', 'Heartbeat field', 'field-select', 'config.connector.heartbeatField', { default:'heartbeat_at' }),
      _blockField('statusField', 'Field trạng thái', 'Status field', 'field-select', 'config.connector.statusField', { default:'status' })
    ])
  ];
}

function _buildSignalMapSections(){
  return [
    _blockSection('signals', 'Ánh xạ tín hiệu', 'Signal mapping', [
      _blockField('signals', 'Danh sách tín hiệu', 'Signal list', 'collection', 'config.signalMap.signals', {
        default:[],
        addLabel:'Thêm tín hiệu',
        itemLabel:'Tín hiệu',
        itemFields:[
          _blockField('point', 'Point / tag', 'Point / tag', 'text', 'point', { default:'machine.temp' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Nhiệt độ' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Temperature' }),
          _blockField('fieldKey', 'Field đích', 'Target field', 'text', 'fieldKey', { default:'temperature' }),
          _blockField('dataType', 'Kiểu dữ liệu', 'Data type', 'select', 'dataType', { default:'number', options:['number','boolean','string','json'] }),
          _blockField('unit', 'Đơn vị', 'Unit', 'text', 'unit', { default:'' }),
          _blockField('formula', 'Công thức', 'Formula', 'formula-select', 'formula', { default:'' }),
          _blockField('chartAxis', 'Trục chart', 'Chart axis', 'select', 'chartAxis', { default:'left', options:['left','right','hidden'] })
        ]
      }),
      _blockField('sampleMode', 'Chế độ lấy mẫu', 'Sample mode', 'select', 'config.signalMap.sampleMode', { default:'latest', options:['latest','window','aggregate'] }),
      _blockField('sampleWindowMin', 'Cửa sổ (phút)', 'Sample window (min)', 'number', 'config.signalMap.sampleWindowMin', { default:15, min:1 }),
      _blockField('includeQuality', 'Kèm quality code', 'Include quality code', 'toggle', 'config.signalMap.includeQuality', { default:true })
    ])
  ];
}

function _buildThresholdSections(type){
  return [
    _blockSection('thresholds', 'Ngưỡng giám sát', 'Monitoring thresholds', [
      _blockField('signalField', 'Field tín hiệu', 'Signal field', 'field-select', 'config.threshold.signalField', { default:'signal' }),
      _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'config.threshold.valueField', { default:'value' }),
      _blockField('thresholds', 'Danh sách ngưỡng', 'Threshold list', 'collection', 'config.threshold.rules', {
        default:[],
        addLabel:'Thêm ngưỡng',
        itemLabel:'Ngưỡng',
        itemFields:[
          _blockField('signal', 'Tín hiệu', 'Signal', 'text', 'signal', { default:'temperature' }),
          _blockField('operator', 'Toán tử', 'Operator', 'select', 'operator', { default:'>', options:['>','>=','<','<=','=','between'] }),
          _blockField('warning', 'Cảnh báo', 'Warning', 'number', 'warning', { default:0 }),
          _blockField('critical', 'Nghiêm trọng', 'Critical', 'number', 'critical', { default:0 }),
          _blockField('debounceMs', 'Debounce (ms)', 'Debounce (ms)', 'number', 'debounceMs', { default:5000, min:0 }),
          _blockField('notifyRole', 'Vai trò nhận tin', 'Notify role', 'text', 'notifyRole', { default:'' })
        ]
      }),
      _blockField('autoAcknowledge', 'Tự xác nhận', 'Auto acknowledge', 'toggle', 'config.threshold.autoAcknowledge', { default:false }),
      _blockField('showTrend', 'Hiện mini trend', 'Show mini trend', 'toggle', 'config.threshold.showTrend', { default:type === 'iot-condition-monitor' })
    ])
  ];
}

function _buildStatusFlowSections(type){
  return [
    _blockSection('transitions', 'Luồng trạng thái', 'Status transitions', [
      _blockField('workflowId', 'Workflow từ registry', 'Registry workflow', 'workflow-select', 'config.workflow.workflowId', { default:'', repaintOnChange:true }),
      _blockField('stateField', 'Field trạng thái', 'State field', 'field-select', 'config.workflow.stateField', { default:'status' }),
      _blockField('transitions', 'Danh sách chuyển trạng thái', 'Transition list', 'collection', 'config.workflow.transitions', {
        default:[],
        addLabel:'Thêm transition',
        itemLabel:'Transition',
        itemFields:[
          _blockField('from', 'Từ trạng thái', 'From state', 'text', 'from', { default:'draft' }),
          _blockField('to', 'Sang trạng thái', 'To state', 'text', 'to', { default:'submitted' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Gửi duyệt' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Submit' }),
          _blockField('role', 'Vai trò được phép', 'Allowed role', 'text', 'role', { default:'' }),
          _blockField('endpoint', 'API thực thi', 'Action API', 'api-select', 'endpoint', { default:'', repaintOnChange:true }),
          _blockField('confirmMessage', 'Xác nhận', 'Confirm message', 'text', 'confirmMessage', { default:'' }),
          _blockField('requireComment', 'Bắt buộc ghi chú', 'Require comment', 'toggle', 'requireComment', { default:false })
        ]
      }),
      _blockField('showDiagram', 'Hiện sơ đồ trạng thái', 'Show state diagram', 'toggle', 'config.workflow.showDiagram', { default:true }),
      _blockField('showSla', 'Hiện SLA', 'Show SLA', 'toggle', 'config.workflow.showSla', { default:true }),
      _blockField('showDigitalThread', 'Hiện digital thread', 'Show digital thread', 'toggle', 'config.workflow.showDigitalThread', { default:true }),
      _blockField('showHistory', 'Hiện lịch sử', 'Show transition history', 'toggle', 'config.workflow.showHistory', { default:true }),
      _blockField('escalationRole', 'Vai trò escalation', 'Escalation role', 'text', 'config.workflow.escalationRole', { default:'' })
    ])
  ];
}

function _buildBulkActionSections(){
  return [
    _blockSection('selection', 'Chọn nhiều bản ghi', 'Selection rules', [
      _blockField('selectionField', 'Field khóa', 'Selection key field', 'field-select', 'config.bulk.selectionField', { default:'id' }),
      _blockField('minSelected', 'Tối thiểu', 'Minimum selected', 'number', 'config.bulk.minSelected', { default:1, min:0 }),
      _blockField('maxSelected', 'Tối đa', 'Maximum selected', 'number', 'config.bulk.maxSelected', { default:0, min:0 }),
      _blockField('requireReason', 'Yêu cầu lý do', 'Require reason', 'toggle', 'config.bulk.requireReason', { default:false }),
      _blockField('confirmTemplate', 'Mẫu xác nhận', 'Confirm template', 'text', 'config.bulk.confirmTemplate', { default:'' }),
      _blockField('batchSize', 'Kích thước batch', 'Batch size', 'number', 'config.bulk.batchSize', { default:100, min:1, step:1 }),
      _blockField('api', 'API xử lý', 'Execution API', 'api-select', 'config.bulk.api', { default:'', repaintOnChange:true }),
      _blockField('method', 'Phương thức', 'Method', 'select', 'config.bulk.method', { default:'POST', options:['POST','PATCH','DELETE'] })
    ])
  ];
}

function _buildGaugeSections(type){
  return [
    _blockSection('gauge', 'Thang đo', 'Gauge scale', [
      _blockField('valueField', 'Field giá trị', 'Value field', 'field-select', 'config.gauge.valueField', { default:'value' }),
      _blockField('targetField', 'Field mục tiêu', 'Target field', 'field-select', 'config.gauge.targetField', { default:'target' }),
      _blockField('minValue', 'Giá trị nhỏ nhất', 'Minimum value', 'number', 'config.gauge.min', { default:0 }),
      _blockField('maxValue', 'Giá trị lớn nhất', 'Maximum value', 'number', 'config.gauge.max', { default:100 }),
      _blockField('unit', 'Đơn vị', 'Unit', 'text', 'config.gauge.unit', { default:'%' }),
      _blockField('showTarget', 'Hiện target', 'Show target', 'toggle', 'config.gauge.showTarget', { default:true }),
      _blockField('showDelta', 'Hiện chênh lệch', 'Show delta', 'toggle', 'config.gauge.showDelta', { default:type === 'insight-target-tracker' })
    ]),
    _blockSection('segments', 'Dải màu', 'Gauge segments', [
      _blockField('segments', 'Danh sách dải', 'Segment list', 'collection', 'config.gauge.segments', {
        default:[],
        addLabel:'Thêm dải',
        itemLabel:'Dải',
        itemFields:[
          _blockField('from', 'Từ', 'From', 'number', 'from', { default:0 }),
          _blockField('to', 'Đến', 'To', 'number', 'to', { default:60 }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Thấp' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Low' }),
          _blockField('color', 'Màu', 'Color', 'color', 'color', { default:'#dc2626' })
        ]
      })
    ])
  ];
}

function _buildAdvancedChartSections(type){
  return [
    _blockSection('axes', 'Trục & series', 'Axes & series', [
      _blockField('xField', 'Field X', 'X field', 'field-select', 'config.chart.xField', { default:'x' }),
      _blockField('yField', 'Field Y', 'Y field', 'field-select', 'config.chart.yField', { default:'y' }),
      _blockField('zField', 'Field Z / size', 'Z / size field', 'field-select', 'config.chart.zField', { default:'' }),
      _blockField('seriesField', 'Field nhóm series', 'Series field', 'field-select', 'config.chart.seriesField', { default:'series' }),
      _blockField('colorField', 'Field màu', 'Color field', 'field-select', 'config.chart.colorField', { default:'' }),
      _blockField('categoryField', 'Field category', 'Category field', 'field-select', 'config.chart.categoryField', { default:'' }),
      _blockField('markerSize', 'Cỡ marker', 'Marker size', 'number', 'config.chart.markerSize', { default:type === 'chart-bubble' ? 18 : 8, min:2, max:40 }),
      _blockField('showRegression', 'Hiện regression', 'Show regression', 'toggle', 'config.chart.showRegression', { default:type === 'chart-scatter' })
    ]),
    _blockSection('presentation', 'Trình bày nâng cao', 'Advanced presentation', [
      _blockField('radarFill', 'Tô vùng radar', 'Fill radar area', 'toggle', 'config.chart.radarFill', { default:type === 'chart-radar' }),
      _blockField('heatScale', 'Heat scale', 'Heat scale', 'select', 'config.chart.heatScale', { default:type === 'chart-heatmap' ? 'amber' : 'none', options:['none','amber','green','blue','red'] }),
      _blockField('showLegend', 'Hiện chú giải', 'Show legend', 'toggle', 'config.chart.showLegend', { default:true }),
      _blockField('showLabels', 'Hiện nhãn', 'Show labels', 'toggle', 'config.chart.showLabels', { default:false })
    ])
  ];
}

function _buildCartesianChartSections(type){
  return [
    _blockSection('axes', 'Trục dữ liệu', 'Data axes', [
      _blockField('xField', 'Field trục X', 'X-axis field', 'field-select', 'config.chart.xField', { default:'label' }),
      _blockField('xType', 'Kiểu trục X', 'X-axis type', 'select', 'config.xAxis.type', { default:'category', options:['category','date'] }),
      _blockField('xLabel', 'Nhãn trục X', 'X-axis label', 'text', 'config.chart.xLabel', { default:'' }),
      _blockField('yLabel', 'Nhãn trục Y', 'Y-axis label', 'text', 'config.chart.yLabel', { default:'' }),
      _blockField('yFormat', 'Định dạng Y', 'Y-axis format', 'select', 'config.yAxis.format', { default:'', options:['','number','percent','currency'] }),
      _blockField('rightYLabel', 'Nhãn trục Y phải', 'Right Y-axis label', 'text', 'config.yAxisRight.label', { default:'' }),
      _blockField('rightYFormat', 'Định dạng Y phải', 'Right Y-axis format', 'select', 'config.yAxisRight.format', { default:'', options:['','number','percent','currency'] }),
      _blockField('series', 'Danh sách series', 'Series list', 'collection', 'config.chart.series', {
        default:[],
        addLabel:'Thêm series',
        itemLabel:'Series',
        itemFields:[
          _blockField('field', 'Field', 'Field', 'field-select', 'field', { default:'value' }),
          _blockField('labelVi', 'Nhãn VI', 'Label VI', 'text', 'label.vi', { default:'Series' }),
          _blockField('labelEn', 'Nhãn EN', 'Label EN', 'text', 'label.en', { default:'Series' }),
          _blockField('type', 'Kiểu', 'Type', 'select', 'type', { default:type === 'chart-line' ? 'line' : 'bar', options:['bar','line','area'] }),
          _blockField('color', 'Màu', 'Color', 'color', 'color', { default:'#2563eb' }),
          _blockField('stack', 'Stack key', 'Stack key', 'text', 'stack', { default:'' })
        ]
      })
    ]),
    _blockSection('rendering', 'Hiển thị chart', 'Chart rendering', [
      _blockField('smooth', 'Làm mượt', 'Smooth lines', 'toggle', 'config.chart.smooth', { default:type === 'chart-line' || type === 'chart-area' }),
      _blockField('showGrid', 'Hiện lưới', 'Show grid', 'toggle', 'config.chart.showGrid', { default:true }),
      _blockField('showLegend', 'Hiện chú giải', 'Show legend', 'toggle', 'config.chart.showLegend', { default:true }),
      _blockField('stacked', 'Stacked', 'Stacked', 'toggle', 'config.stacked', { default:type === 'chart-area' }),
      _blockField('stackMode', 'Chế độ stack', 'Stack mode', 'select', 'config.chart.stackMode', { default:type === 'chart-stacked-bar' ? 'normal' : 'none', options:['none','normal','percent'] }),
      _blockField('labelRotation', 'Xoay nhãn X', 'X-label rotation', 'number', 'config.chart.labelRotation', { default:0, min:-90, max:90, step:5 }),
      _blockField('showDataLabels', 'Hiện data labels', 'Show data labels', 'toggle', 'config.chart.showDataLabels', { default:false })
    ])
  ];
}

function _buildStyleSections(renderer){
  return [
    _blockSection('layout', 'Layout', 'Layout', [
      _blockField('columns', 'Số cột desktop', 'Desktop columns', 'number', 'config.style.columns', { default:renderer === 'data-cards' ? 3 : 1, min:1, max:6 }),
      _blockField('gap', 'Khoảng cách', 'Gap', 'number', 'config.style.gap', { default:16, min:0, step:2 }),
      _blockField('padding', 'Padding', 'Padding', 'number', 'config.style.padding', { default:16, min:0, step:2 }),
      _blockField('minHeight', 'Min height', 'Min height', 'number', 'config.style.minHeight', { default:0, min:0, step:8 }),
      _blockField('maxWidth', 'Chiều rộng tối đa', 'Max width', 'text', 'config.style.maxWidth', { default:'' }),
      _blockField('justify', 'Căn bố cục', 'Justify', 'select', 'config.style.justify', { default:'start', options:['start','center','space-between','space-around'] }),
      _blockField('sticky', 'Ghim khi cuộn', 'Sticky', 'toggle', 'config.style.sticky', { default:false }),
      _blockField('stickyOffset', 'Offset sticky', 'Sticky offset', 'number', 'config.style.stickyOffset', { default:0, min:0, step:4 }),
      _blockField('compact', 'Chế độ gọn', 'Compact mode', 'toggle', 'config.style.compact', { default:false })
    ]),
    _blockSection('surface', 'Surface', 'Surface', [
      _blockField('background', 'Nền', 'Background', 'color', 'config.style.background', { default:'#ffffff' }),
      _blockField('textColor', 'Màu chữ', 'Text color', 'color', 'config.style.textColor', { default:'#0f172a' }),
      _blockField('accentColor', 'Màu nhấn', 'Accent color', 'color', 'config.style.accentColor', { default:'#2563eb' }),
      _blockField('borderColor', 'Viền', 'Border color', 'color', 'config.style.borderColor', { default:'#d7dee7' }),
      _blockField('borderWidth', 'Độ dày viền', 'Border width', 'number', 'config.style.borderWidth', { default:1, min:0, step:1 }),
      _blockField('radius', 'Làm tròn góc', 'Radius', 'number', 'config.style.radius', { default:16, min:0, step:2 }),
      _blockField('shadow', 'Đổ bóng', 'Shadow', 'select', 'config.style.shadow', { default:'sm', options:['none','xs','sm','md','lg'] }),
      _blockField('opacity', 'Độ trong suốt', 'Opacity', 'number', 'config.style.opacity', { default:100, min:0, max:100, step:5 }),
      _blockField('backdrop', 'Backdrop blur', 'Backdrop blur', 'number', 'config.style.backdropBlur', { default:0, min:0, step:1 })
    ]),
    _blockSection('typography', 'Typography', 'Typography', [
      _blockField('titleSize', 'Cỡ tiêu đề', 'Title size', 'number', 'config.style.titleSize', { default:18, min:12, max:40 }),
      _blockField('subtitleSize', 'Cỡ phụ đề', 'Subtitle size', 'number', 'config.style.subtitleSize', { default:13, min:10, max:30 }),
      _blockField('labelSize', 'Cỡ nhãn', 'Label size', 'number', 'config.style.labelSize', { default:13, min:10, max:24 }),
      _blockField('valueSize', 'Cỡ giá trị', 'Value size', 'number', 'config.style.valueSize', { default:28, min:12, max:56 }),
      _blockField('weight', 'Độ đậm', 'Weight', 'select', 'config.style.fontWeight', { default:'600', options:['400','500','600','700','800'] }),
      _blockField('lineClamp', 'Giới hạn dòng', 'Line clamp', 'number', 'config.style.lineClamp', { default:0, min:0, max:6 }),
      _blockField('letterSpacing', 'Khoảng chữ', 'Letter spacing', 'number', 'config.style.letterSpacing', { default:0, min:-1, max:8, step:0.5 }),
      _blockField('align', 'Căn nội dung', 'Content align', 'select', 'config.style.align', { default:'left', options:['left','center','right'] })
    ]),
    _blockSection('responsive', 'Responsive', 'Responsive', [
      _blockField('mobileColumns', 'Cột mobile', 'Mobile columns', 'number', 'config.responsive.mobile.columns', { default:1, min:1, max:4 }),
      _blockField('tabletColumns', 'Cột tablet', 'Tablet columns', 'number', 'config.responsive.tablet.columns', { default:2, min:1, max:6 }),
      _blockField('desktopColumns', 'Cột desktop override', 'Desktop columns override', 'number', 'config.responsive.desktop.columns', { default:0, min:0, max:8 }),
      _blockField('mobileCompact', 'Mobile compact', 'Mobile compact', 'toggle', 'config.responsive.mobile.compact', { default:true }),
      _blockField('hideHeaderMobile', 'Ẩn header trên mobile', 'Hide header on mobile', 'toggle', 'config.responsive.mobile.hideHeader', { default:false }),
      _blockField('mobileGap', 'Khoảng cách mobile', 'Mobile gap', 'number', 'config.responsive.mobile.gap', { default:12, min:0, step:2 }),
      _blockField('tabletGap', 'Khoảng cách tablet', 'Tablet gap', 'number', 'config.responsive.tablet.gap', { default:16, min:0, step:2 }),
      _blockField('printScale', 'Tỷ lệ khi in (%)', 'Print scale (%)', 'number', 'config.responsive.print.scale', { default:100, min:50, max:100, step:5 }),
      _blockField('hideInPrint', 'Ẩn toàn bộ khi in', 'Hide block in print', 'toggle', 'config.responsive.print.hide', { default:false })
    ])
  ];
}

function _buildEventSections(){
  return [
    _blockSection('actions', 'Tác vụ', 'Actions', [
      _blockField('actions', 'Danh sách event', 'Event actions', 'collection', 'config.events.actions', {
        default:[],
        addLabel:'Thêm action',
        itemLabel:'Action',
        itemFields:[
          _blockField('event', 'Event', 'Event', 'select', 'event', { default:'click', options:['click','row-click','change','submit','load','success','error'] }),
          _blockField('type', 'Loại action', 'Action type', 'select', 'type', { default:'toast', options:['toast','navigate','open-modal','api-call','set-state','emit-event'] }),
          _blockField('target', 'Target', 'Target', 'text', 'target', { default:'' }),
          _blockField('payload', 'Payload', 'Payload', 'expression', 'payload', { default:'' }),
          _blockField('confirmText', 'Thông điệp xác nhận', 'Confirm text', 'text', 'confirmText', { default:'' }),
          _blockField('successText', 'Thông điệp thành công', 'Success text', 'text', 'successText', { default:'' })
        ]
      })
    ]),
    _blockSection('lifecycle', 'Lifecycle', 'Lifecycle', [
      _blockField('refreshOnFilter', 'Làm mới khi lọc', 'Refresh on filter', 'toggle', 'config.events.refreshOnFilter', { default:true }),
      _blockField('emitOnLoad', 'Emit khi load', 'Emit on load', 'text', 'config.events.emitOnLoad', { default:'' }),
      _blockField('emitOnSuccess', 'Emit khi thành công', 'Emit on success', 'text', 'config.events.emitOnSuccess', { default:'' }),
      _blockField('emitOnError', 'Emit khi lỗi', 'Emit on error', 'text', 'config.events.emitOnError', { default:'' }),
      _blockField('successToast', 'Toast thành công', 'Success toast', 'text', 'config.events.successToast', { default:'' }),
      _blockField('errorToast', 'Toast lỗi', 'Error toast', 'text', 'config.events.errorToast', { default:'' }),
      _blockField('confirmMessage', 'Thông điệp xác nhận', 'Confirmation message', 'text', 'config.events.confirmMessage', { default:'' }),
      _blockField('debounceMs', 'Debounce (ms)', 'Debounce (ms)', 'number', 'config.events.debounceMs', { default:0, min:0, step:50 }),
      _blockField('throttleMs', 'Throttle (ms)', 'Throttle (ms)', 'number', 'config.events.throttleMs', { default:0, min:0, step:50 })
    ]),
    _blockSection('advanced', 'Nâng cao', 'Advanced', [
      _blockField('telemetryEvent', 'Telemetry event', 'Telemetry event', 'text', 'config.events.telemetryEvent', { default:'' }),
      _blockField('auditTag', 'Audit tag', 'Audit tag', 'text', 'config.events.auditTag', { default:'' }),
      _blockField('permissionExpression', 'Biểu thức quyền', 'Permission expression', 'expression', 'config.permissions.expression', { default:'' }),
      _blockField('featureFlag', 'Feature flag', 'Feature flag', 'text', 'config.permissions.featureFlag', { default:'' }),
      _blockField('beforeHook', 'Hook trước action', 'Before-action hook', 'code', 'config.events.beforeHook', { default:'' }),
      _blockField('customHook', 'Custom hook', 'Custom hook', 'code', 'config.events.customHook', { default:'' }),
      _blockField('afterHook', 'Hook sau action', 'After-action hook', 'code', 'config.events.afterHook', { default:'' })
    ])
  ];
}

/* ── API Catalog — FULL 192 endpoints organized by module ──────────────── */
var API_CATALOG = [
  /* ═══ 💰 BÁO GIÁ (Quoting) ═══════════════════════════════════════════ */
  { action:'quote_list',              method:'GET',  label:'Danh sách báo giá',         module:'Báo giá' },
  { action:'quote_detail',            method:'GET',  label:'Chi tiết báo giá',          module:'Báo giá' },
  { action:'quote_create',            method:'POST', label:'Tạo báo giá',               module:'Báo giá' },
  { action:'quote_update',            method:'POST', label:'Cập nhật báo giá',          module:'Báo giá' },
  { action:'quote_transition',        method:'POST', label:'Chuyển trạng thái báo giá', module:'Báo giá' },
  { action:'quote_convert_to_so',     method:'POST', label:'Chuyển báo giá → SO',       module:'Báo giá' },
  { action:'quote_estimate_cycle',    method:'POST', label:'Ước tính cycle time',       module:'Báo giá' },
  { action:'quote_estimate_material', method:'POST', label:'Ước tính chi phí vật liệu', module:'Báo giá' },
  { action:'quote_dashboard',         method:'GET',  label:'KPI báo giá',               module:'Báo giá' },

  /* ═══ 📦 ĐƠN HÀNG (Orders) ═══════════════════════════════════════════ */
  { action:'order_so_list',           method:'GET',  label:'Danh sách SO',              module:'Đơn hàng' },
  { action:'order_so_detail',         method:'GET',  label:'Chi tiết SO',               module:'Đơn hàng' },
  { action:'order_so_create',         method:'POST', label:'Tạo SO',                    module:'Đơn hàng' },
  { action:'order_so_update',         method:'POST', label:'Cập nhật SO',               module:'Đơn hàng' },
  { action:'order_jo_list',           method:'GET',  label:'Danh sách JO',              module:'Đơn hàng' },
  { action:'order_jo_detail',         method:'GET',  label:'Chi tiết JO',               module:'Đơn hàng' },
  { action:'order_jo_create',         method:'POST', label:'Tạo JO',                    module:'Đơn hàng' },
  { action:'order_jo_update',         method:'POST', label:'Cập nhật JO',               module:'Đơn hàng' },
  { action:'order_wo_create',         method:'POST', label:'Tạo WO',                    module:'Đơn hàng' },
  { action:'order_wo_update',         method:'POST', label:'Cập nhật WO',               module:'Đơn hàng' },
  { action:'order_transition',        method:'POST', label:'Chuyển trạng thái đơn',     module:'Đơn hàng' },
  { action:'order_hierarchy',         method:'GET',  label:'Cây SO→JO→WO',             module:'Đơn hàng' },
  { action:'order_contract_review',   method:'POST', label:'Xem xét hợp đồng',         module:'Đơn hàng' },
  { action:'order_hold_set',          method:'POST', label:'Đặt hold đơn hàng',        module:'Đơn hàng' },
  { action:'order_hold_release',      method:'POST', label:'Giải phóng hold',           module:'Đơn hàng' },
  { action:'order_note_add',          method:'POST', label:'Thêm ghi chú đơn',         module:'Đơn hàng' },
  { action:'order_timeline',          method:'GET',  label:'Dòng thời gian đơn',       module:'Đơn hàng' },
  { action:'order_dashboard_stats',   method:'GET',  label:'Thống kê đơn hàng',        module:'Đơn hàng' },
  { action:'order_dashboard_kpi',     method:'GET',  label:'KPI đơn hàng',             module:'Đơn hàng' },
  { action:'order_search',            method:'GET',  label:'Tìm kiếm đơn hàng',        module:'Đơn hàng' },
  { action:'order_link_form',         method:'POST', label:'Liên kết hồ sơ → JO',      module:'Đơn hàng' },
  { action:'order_shipment_gate',     method:'GET',  label:'Kiểm tra giao hàng (10 gates)', module:'Đơn hàng' },
  { action:'packing_list',            method:'GET',  label:'Danh sách packing list',    module:'Đơn hàng' },
  { action:'packing_create',          method:'POST', label:'Tạo packing list',          module:'Đơn hàng' },
  { action:'packing_update',          method:'POST', label:'Cập nhật packing list',     module:'Đơn hàng' },
  { action:'delivery_confirm',        method:'POST', label:'Xác nhận giao hàng',        module:'Đơn hàng' },

  /* ═══ 📋 KẾ HOẠCH (Planning) ══════════════════════════════════════════ */
  { action:'dispatch_timeline',       method:'GET',  label:'Timeline Gantt (máy×ngày×ca)', module:'Kế hoạch' },
  { action:'dispatch_dashboard',      method:'GET',  label:'Tổng hợp ca sản xuất',     module:'Kế hoạch' },
  { action:'dispatch_list_targets',   method:'GET',  label:'Danh sách lệnh sản xuất',  module:'Kế hoạch' },
  { action:'dispatch_create_target',  method:'POST', label:'Tạo lệnh sản xuất',        module:'Kế hoạch' },
  { action:'dispatch_update_target',  method:'POST', label:'Cập nhật lệnh SX',         module:'Kế hoạch' },
  { action:'dispatch_send',           method:'POST', label:'Gửi lệnh cho công nhân',   module:'Kế hoạch' },
  { action:'dispatch_operator_tasks', method:'GET',  label:'Lệnh của công nhân hôm nay', module:'Kế hoạch' },
  { action:'dispatch_report_production',method:'POST',label:'Báo cáo sản lượng',       module:'Kế hoạch' },
  { action:'schedule_get',            method:'GET',  label:'Lịch trình sản xuất',       module:'Kế hoạch' },
  { action:'schedule_slot_create',    method:'POST', label:'Tạo slot lịch trình',       module:'Kế hoạch' },
  { action:'schedule_slot_update',    method:'POST', label:'Cập nhật slot',             module:'Kế hoạch' },
  { action:'schedule_capacity',       method:'GET',  label:'Năng lực sản xuất (heatmap)', module:'Kế hoạch' },
  { action:'schedule_conflicts',      method:'GET',  label:'Xung đột lịch trình',       module:'Kế hoạch' },
  { action:'schedule_promise',        method:'POST', label:'Tính ngày giao hứa',        module:'Kế hoạch' },
  { action:'shift_list',              method:'GET',  label:'Danh sách ca làm việc',     module:'Kế hoạch' },
  { action:'shift_save',              method:'POST', label:'Lưu định nghĩa ca',         module:'Kế hoạch' },
  { action:'shift_assignments',       method:'GET',  label:'Xếp ca nhân viên',          module:'Kế hoạch' },
  { action:'shift_assign',            method:'POST', label:'Gán ca cho nhân viên',      module:'Kế hoạch' },
  { action:'shift_holidays',          method:'GET',  label:'Lịch nghỉ lễ',              module:'Kế hoạch' },
  { action:'shift_holiday_save',      method:'POST', label:'Lưu ngày nghỉ lễ',          module:'Kế hoạch' },
  { action:'subcontract_list',        method:'GET',  label:'Danh sách gia công ngoài',  module:'Kế hoạch' },
  { action:'subcontract_create',      method:'POST', label:'Tạo lệnh gia công ngoài',  module:'Kế hoạch' },
  { action:'subcontract_update',      method:'POST', label:'Cập nhật gia công ngoài',   module:'Kế hoạch' },
  { action:'subcontract_receive',     method:'POST', label:'Nhận hàng gia công ngoài',  module:'Kế hoạch' },

  /* ═══ 🚚 MUA HÀNG & IQC (Purchasing) ═════════════════════════════════ */
  { action:'supplier_dashboard',      method:'GET',  label:'KPI nhà cung cấp',          module:'Mua hàng' },
  { action:'supplier_scorecard_list', method:'GET',  label:'Danh sách điểm NCC',        module:'Mua hàng' },
  { action:'supplier_scorecard_detail',method:'GET', label:'Chi tiết điểm NCC',         module:'Mua hàng' },
  { action:'supplier_scorecard_calc', method:'POST', label:'Tính điểm NCC',             module:'Mua hàng' },
  { action:'supplier_incoming_list',  method:'GET',  label:'Danh sách kiểm tra nhận hàng', module:'Mua hàng' },
  { action:'supplier_incoming_create',method:'POST', label:'Tạo phiếu kiểm tra nhận hàng', module:'Mua hàng' },
  { action:'supplier_incoming_update',method:'POST', label:'Cập nhật kết quả IQC',      module:'Mua hàng' },
  { action:'supplier_skip_lot_status',method:'GET',  label:'Trạng thái skip-lot (Z1.4)', module:'Mua hàng' },
  { action:'supplier_skip_lot_update',method:'POST', label:'Cập nhật skip-lot',          module:'Mua hàng' },
  { action:'supplier_asl_list',       method:'GET',  label:'Danh sách NCC được duyệt (ASL)', module:'Mua hàng' },
  { action:'supplier_asl_upsert',     method:'POST', label:'Thêm/sửa ASL',              module:'Mua hàng' },
  { action:'supplier_scar_list',      method:'GET',  label:'Danh sách SCAR',             module:'Mua hàng' },
  { action:'supplier_scar_create',    method:'POST', label:'Tạo SCAR',                   module:'Mua hàng' },
  { action:'supplier_scar_update',    method:'POST', label:'Cập nhật SCAR',              module:'Mua hàng' },
  { action:'supplier_scar_transition',method:'POST', label:'Chuyển trạng thái SCAR',     module:'Mua hàng' },
  { action:'supplier_audit_list',     method:'GET',  label:'Lịch kiểm toán NCC',         module:'Mua hàng' },
  { action:'supplier_audit_upsert',   method:'POST', label:'Thêm/sửa kiểm toán NCC',    module:'Mua hàng' },

  /* ═══ 🏭 SẢN XUẤT (Production) ════════════════════════════════════════ */
  { action:'mobile_my_queue',         method:'GET',  label:'Hàng đợi công việc tôi',    module:'Sản xuất' },
  { action:'mobile_start_task',       method:'POST', label:'Bắt đầu công việc',          module:'Sản xuất' },
  { action:'mobile_complete_task',    method:'POST', label:'Hoàn thành công việc',        module:'Sản xuất' },
  { action:'mobile_clock_in',         method:'POST', label:'Chấm công vào',              module:'Sản xuất' },
  { action:'mobile_clock_out',        method:'POST', label:'Chấm công ra',               module:'Sản xuất' },
  { action:'mobile_capture_inspection',method:'POST',label:'Ghi nhận kiểm tra (FP/IPQC)', module:'Sản xuất' },
  { action:'mobile_sync_batch',       method:'POST', label:'Đồng bộ offline',            module:'Sản xuất' },
  { action:'mobile_sync_status',      method:'GET',  label:'Trạng thái đồng bộ',         module:'Sản xuất' },
  { action:'mobile_resolve_conflict', method:'POST', label:'Giải quyết xung đột sync',   module:'Sản xuất' },
  { action:'mobile_shop_overview',    method:'GET',  label:'Giám sát xưởng (toàn bộ máy)', module:'Sản xuất' },
  { action:'mobile_dashboard',        method:'GET',  label:'Dashboard công nhân',         module:'Sản xuất' },
  { action:'cnc_program_list',        method:'GET',  label:'Danh sách chương trình CNC', module:'Sản xuất' },
  { action:'cnc_program_detail',      method:'GET',  label:'Chi tiết chương trình CNC',  module:'Sản xuất' },
  { action:'cnc_program_create',      method:'POST', label:'Tạo chương trình CNC',       module:'Sản xuất' },
  { action:'cnc_program_update',      method:'POST', label:'Cập nhật chương trình CNC',  module:'Sản xuất' },
  { action:'cnc_program_upload_version',method:'POST',label:'Tải lên phiên bản mới',    module:'Sản xuất' },
  { action:'cnc_program_approve',     method:'POST', label:'Phê duyệt chương trình CNC', module:'Sản xuất' },
  { action:'cnc_program_setup_sheets',method:'GET',  label:'Danh sách setup sheet',      module:'Sản xuất' },
  { action:'cnc_program_setup_create',method:'POST', label:'Tạo setup sheet',            module:'Sản xuất' },
  { action:'knowledge_list',          method:'GET',  label:'Kho kiến thức (tips)',        module:'Sản xuất' },
  { action:'knowledge_create',        method:'POST', label:'Tạo tip kiến thức',           module:'Sản xuất' },
  { action:'knowledge_detail',        method:'GET',  label:'Chi tiết tip',                module:'Sản xuất' },
  { action:'knowledge_vote',          method:'POST', label:'Bình chọn tip',               module:'Sản xuất' },
  { action:'knowledge_comment',       method:'POST', label:'Bình luận tip',               module:'Sản xuất' },
  { action:'energy_overview',         method:'GET',  label:'Năng lượng tổng quan',        module:'Sản xuất' },
  { action:'energy_machine_detail',   method:'GET',  label:'Năng lượng theo máy',         module:'Sản xuất' },
  { action:'energy_per_part',         method:'GET',  label:'Năng lượng theo sản phẩm',    module:'Sản xuất' },
  { action:'energy_cost_trend',       method:'GET',  label:'Xu hướng chi phí năng lượng', module:'Sản xuất' },

  /* ═══ 🔴 CHẤT LƯỢNG (Quality) ═════════════════════════════════════════ */
  { action:'exception_dashboard',     method:'GET',  label:'KPI chất lượng (NCR/CAPA/COPQ)', module:'Chất lượng' },
  { action:'exception_list',          method:'GET',  label:'Danh sách ngoại lệ (NCR/CAPA)', module:'Chất lượng' },
  { action:'exception_detail',        method:'GET',  label:'Chi tiết ngoại lệ',          module:'Chất lượng' },
  { action:'exception_complaint_create',method:'POST',label:'Tạo khiếu nại khách hàng',  module:'Chất lượng' },
  { action:'exception_complaint_update',method:'POST',label:'Cập nhật khiếu nại (8D)',   module:'Chất lượng' },
  { action:'exception_mrb_create',    method:'POST', label:'Tạo phiên MRB',              module:'Chất lượng' },
  { action:'exception_mrb_update',    method:'POST', label:'Cập nhật MRB (disposition)',  module:'Chất lượng' },
  { action:'exception_deviation_create',method:'POST',label:'Tạo yêu cầu sai lệch',     module:'Chất lượng' },
  { action:'exception_deviation_update',method:'POST',label:'Cập nhật sai lệch',         module:'Chất lượng' },
  { action:'exception_concession_create',method:'POST',label:'Tạo yêu cầu nhượng bộ',   module:'Chất lượng' },
  { action:'exception_concession_update',method:'POST',label:'Cập nhật nhượng bộ',       module:'Chất lượng' },
  { action:'exception_transition',    method:'POST', label:'Chuyển trạng thái ngoại lệ', module:'Chất lượng' },
  { action:'exception_copq_summary',  method:'GET',  label:'Chi phí chất lượng kém (COPQ)', module:'Chất lượng' },
  { action:'exception_trends',        method:'GET',  label:'Xu hướng ngoại lệ (Pareto)', module:'Chất lượng' },
  { action:'exception_escalate',      method:'POST', label:'Leo thang ngoại lệ',          module:'Chất lượng' },
  { action:'oqc_list',                method:'GET',  label:'Danh sách kiểm tra cuối (OQC)', module:'Chất lượng' },
  { action:'oqc_create',              method:'POST', label:'Tạo phiếu OQC',               module:'Chất lượng' },
  { action:'oqc_update',              method:'POST', label:'Cập nhật kết quả OQC',        module:'Chất lượng' },
  { action:'fmea_list',               method:'GET',  label:'Danh sách FMEA',              module:'Chất lượng' },
  { action:'fmea_detail',             method:'GET',  label:'Chi tiết FMEA',               module:'Chất lượng' },
  { action:'fmea_create',             method:'POST', label:'Tạo FMEA (DFMEA/PFMEA)',      module:'Chất lượng' },
  { action:'fmea_update',             method:'POST', label:'Cập nhật FMEA',               module:'Chất lượng' },
  { action:'fmea_add_failure_mode',   method:'POST', label:'Thêm failure mode (S/O/D→AP)', module:'Chất lượng' },
  { action:'fmea_update_failure_mode',method:'POST', label:'Cập nhật failure mode',        module:'Chất lượng' },
  { action:'fmea_add_action',         method:'POST', label:'Thêm hành động khuyến nghị',   module:'Chất lượng' },
  { action:'fmea_complete_action',    method:'POST', label:'Hoàn thành action (S/O/D mới)', module:'Chất lượng' },
  { action:'fmea_generate_cp',        method:'POST', label:'Tự động tạo Control Plan',     module:'Chất lượng' },
  { action:'fmea_control_plans',      method:'GET',  label:'Danh sách Control Plan',       module:'Chất lượng' },
  { action:'fmea_cp_detail',          method:'GET',  label:'Chi tiết Control Plan',        module:'Chất lượng' },
  { action:'fmea_rpn_trend',          method:'GET',  label:'Xu hướng RPN (before/after)',   module:'Chất lượng' },
  { action:'fmea_link_ncr',           method:'POST', label:'Liên kết NCR → FMEA',          module:'Chất lượng' },
  { action:'apqp_list',               method:'GET',  label:'Danh sách dự án APQP',        module:'Chất lượng' },
  { action:'apqp_detail',             method:'GET',  label:'Chi tiết APQP',                module:'Chất lượng' },
  { action:'apqp_create',             method:'POST', label:'Tạo dự án APQP',               module:'Chất lượng' },
  { action:'apqp_update',             method:'POST', label:'Cập nhật APQP',                module:'Chất lượng' },
  { action:'apqp_advance_phase',      method:'POST', label:'Tiến sang phase tiếp (1→5)',    module:'Chất lượng' },
  { action:'apqp_gate_review',        method:'POST', label:'Nộp gate review',               module:'Chất lượng' },
  { action:'apqp_gate_approve',       method:'POST', label:'Phê duyệt gate',               module:'Chất lượng' },
  { action:'apqp_gate_reject',        method:'POST', label:'Từ chối gate',                  module:'Chất lượng' },
  { action:'apqp_ppap_create',        method:'POST', label:'Tạo PPAP submission',           module:'Chất lượng' },
  { action:'apqp_ppap_element',       method:'POST', label:'Cập nhật PPAP element',         module:'Chất lượng' },
  { action:'apqp_ppap_response',      method:'POST', label:'Ghi nhận phản hồi KH (PPAP)',   module:'Chất lượng' },
  { action:'apqp_deliverables',       method:'GET',  label:'Danh sách deliverables per phase', module:'Chất lượng' },
  { action:'apqp_dashboard',          method:'GET',  label:'Dashboard APQP',               module:'Chất lượng' },
  { action:'ai_prediction_list',      method:'GET',  label:'Danh sách dự đoán AI',         module:'Chất lượng' },
  { action:'ai_prediction_acknowledge',method:'POST',label:'Xác nhận dự đoán',             module:'Chất lượng' },
  { action:'ai_prediction_resolve',   method:'POST', label:'Giải quyết dự đoán',            module:'Chất lượng' },
  { action:'ai_spc_anomalies',        method:'GET',  label:'SPC anomaly (WE+Nelson)',       module:'Chất lượng' },
  { action:'ai_tool_wear',            method:'GET',  label:'Dự đoán mòn dao',               module:'Chất lượng' },
  { action:'ai_dashboard',            method:'GET',  label:'Dashboard AI chất lượng',        module:'Chất lượng' },
  { action:'spc_chart',               method:'POST', label:'Biểu đồ SPC',                   module:'Chất lượng' },
  { action:'spc_capability',          method:'POST', label:'Phân tích năng lực (Cpk/Ppk)',   module:'Chất lượng' },
  { action:'spc_alerts',              method:'GET',  label:'Cảnh báo SPC',                   module:'Chất lượng' },
  { action:'spc_summary',             method:'GET',  label:'Tóm tắt SPC',                    module:'Chất lượng' },
  { action:'kpi_get',                 method:'GET',  label:'Lấy giá trị KPI',                module:'Chất lượng' },
  { action:'kpi_trend',               method:'GET',  label:'Xu hướng KPI',                   module:'Chất lượng' },
  { action:'kpi_alerts',              method:'GET',  label:'Cảnh báo KPI',                   module:'Chất lượng' },

  /* ═══ 📋 HỒ SƠ & CHỨNG CỨ (Records) ═════════════════════════════════ */
  { action:'online_form_list',        method:'GET',  label:'Danh sách biểu mẫu online',  module:'Hồ sơ' },
  { action:'online_form_schema',      method:'GET',  label:'Schema biểu mẫu',            module:'Hồ sơ' },
  { action:'online_form_submit',      method:'POST', label:'Nộp biểu mẫu',               module:'Hồ sơ' },
  { action:'online_form_entries',     method:'GET',  label:'Danh sách bài nộp',           module:'Hồ sơ' },
  { action:'record_id_registry',      method:'GET',  label:'Sổ đăng ký mã hồ sơ',        module:'Hồ sơ' },
  { action:'record_id_next',          method:'POST', label:'Tạo mã hồ sơ tiếp theo',     module:'Hồ sơ' },
  { action:'record_id_peek',          method:'GET',  label:'Xem trước mã tiếp theo',      module:'Hồ sơ' },
  { action:'form_upload_draft',       method:'POST', label:'Tải lên bản nháp (Excel)',    module:'Hồ sơ' },
  { action:'form_version_stream',     method:'GET',  label:'Tải file biểu mẫu',           module:'Hồ sơ' },
  { action:'evidence_list',           method:'GET',  label:'Danh sách chứng cứ',          module:'Hồ sơ' },
  { action:'evidence_detail',         method:'GET',  label:'Chi tiết chứng cứ',            module:'Hồ sơ' },
  { action:'evidence_upload',         method:'POST', label:'Tải lên chứng cứ (SHA-256)',   module:'Hồ sơ' },
  { action:'evidence_link',           method:'POST', label:'Liên kết chứng cứ → entity',   module:'Hồ sơ' },
  { action:'evidence_chain_custody',  method:'GET',  label:'Chuỗi giám hộ chứng cứ',      module:'Hồ sơ' },
  { action:'evidence_verify_chain',   method:'GET',  label:'Xác minh hash chain',          module:'Hồ sơ' },
  { action:'evidence_search',         method:'GET',  label:'Tìm kiếm chứng cứ (FTS)',     module:'Hồ sơ' },
  { action:'product_passport_list',   method:'GET',  label:'Danh sách hộ chiếu sản phẩm', module:'Hồ sơ' },
  { action:'product_passport_detail', method:'GET',  label:'Chi tiết hộ chiếu SP',         module:'Hồ sơ' },
  { action:'product_passport_create', method:'POST', label:'Tạo hộ chiếu sản phẩm',       module:'Hồ sơ' },
  { action:'product_passport_add_event',method:'POST',label:'Thêm sự kiện vào hộ chiếu',  module:'Hồ sơ' },
  { action:'product_passport_trace',  method:'GET',  label:'Truy vết genealogy',            module:'Hồ sơ' },

  /* ═══ 📊 BÁO CÁO & CẢI TIẾN (Reports) ═══════════════════════════════ */
  { action:'compliance_report_types', method:'GET',  label:'Danh sách loại báo cáo',     module:'Báo cáo' },
  { action:'compliance_report_generate',method:'POST',label:'Tạo báo cáo',               module:'Báo cáo' },
  { action:'compliance_report_history',method:'GET',  label:'Lịch sử báo cáo',            module:'Báo cáo' },
  { action:'compliance_report_management_review',method:'GET',label:'Dữ liệu xem xét lãnh đạo', module:'Báo cáo' },
  { action:'compliance_report_customer_quality',method:'GET',label:'Báo cáo chất lượng KH', module:'Báo cáo' },
  { action:'compliance_report_supplier_review',method:'GET',label:'Đánh giá NCC',          module:'Báo cáo' },
  { action:'compliance_report_copq',  method:'GET',  label:'Báo cáo COPQ',                module:'Báo cáo' },
  { action:'compliance_report_evidence_package',method:'GET',label:'Gói chứng cứ giao hàng', module:'Báo cáo' },
  { action:'ci_dashboard',            method:'GET',  label:'Dashboard cải tiến liên tục',  module:'Báo cáo' },
  { action:'ci_suggestion_list',      method:'GET',  label:'Danh sách đề xuất cải tiến',  module:'Báo cáo' },
  { action:'ci_suggestion_create',    method:'POST', label:'Tạo đề xuất cải tiến',        module:'Báo cáo' },
  { action:'ci_project_list',         method:'GET',  label:'Danh sách dự án CI (PDCA)',   module:'Báo cáo' },
  { action:'ci_project_create',       method:'POST', label:'Tạo dự án CI',                module:'Báo cáo' },
  { action:'ci_project_update',       method:'POST', label:'Cập nhật dự án CI',           module:'Báo cáo' },
  { action:'ci_project_transition',   method:'POST', label:'Chuyển phase PDCA',            module:'Báo cáo' },
  { action:'ci_roi_summary',          method:'GET',  label:'Tóm tắt ROI cải tiến',        module:'Báo cáo' },
  { action:'dashboard_executive',     method:'GET',  label:'Dashboard điều hành',          module:'Báo cáo' },
  { action:'dashboard_quality',       method:'GET',  label:'Dashboard chất lượng',         module:'Báo cáo' },
  { action:'dashboard_production',    method:'GET',  label:'Dashboard sản xuất',           module:'Báo cáo' },
  { action:'dashboard_supplier',      method:'GET',  label:'Dashboard NCC',                module:'Báo cáo' },

  /* ═══ 📁 TÀI LIỆU (Documents) ════════════════════════════════════════ */
  { action:'doc_create',              method:'POST', label:'Tạo tài liệu',               module:'Tài liệu' },
  { action:'doc_save_draft',          method:'POST', label:'Lưu bản nháp',               module:'Tài liệu' },
  { action:'doc_submit_review',       method:'POST', label:'Nộp xem xét',                module:'Tài liệu' },
  { action:'doc_approve',             method:'POST', label:'Phê duyệt tài liệu',         module:'Tài liệu' },
  { action:'doc_reject',              method:'POST', label:'Từ chối tài liệu',            module:'Tài liệu' },
  { action:'doc_update_meta',         method:'POST', label:'Cập nhật metadata',           module:'Tài liệu' },
  { action:'doc_versions_list',       method:'GET',  label:'Danh sách phiên bản',         module:'Tài liệu' },
  { action:'doc_start_new_revision',  method:'POST', label:'Bắt đầu revision mới',        module:'Tài liệu' },
  { action:'doc_stream',              method:'GET',  label:'Tải file tài liệu',            module:'Tài liệu' },
  { action:'docs_custom_list',        method:'GET',  label:'Danh sách tài liệu',          module:'Tài liệu' },
  { action:'docs_snapshot',           method:'POST', label:'Snapshot tài liệu',            module:'Tài liệu' },
  { action:'scan_folders',            method:'GET',  label:'Quét thư mục',                 module:'Tài liệu' },

  /* ═══ ⚙ QUẢN TRỊ (Admin) ═════════════════════════════════════════════ */
  { action:'admin_users_list',        method:'GET',  label:'Danh sách người dùng',        module:'Quản trị' },
  { action:'admin_user_upsert',       method:'POST', label:'Thêm/sửa người dùng',        module:'Quản trị' },
  { action:'admin_user_delete',       method:'POST', label:'Xóa người dùng',              module:'Quản trị' },
  { action:'admin_user_reset_password',method:'POST',label:'Đặt lại mật khẩu',            module:'Quản trị' },
  { action:'role_perms_get',          method:'GET',  label:'Lấy phân quyền vai trò',      module:'Quản trị' },
  { action:'admin_role_perms_save',   method:'POST', label:'Lưu phân quyền vai trò',      module:'Quản trị' },
  { action:'admin_mfa_settings_get',  method:'GET',  label:'Cài đặt MFA',                 module:'Quản trị' },
  { action:'admin_mfa_settings_save', method:'POST', label:'Lưu cài đặt MFA',             module:'Quản trị' },
  { action:'master_data_list',        method:'GET',  label:'Danh sách dữ liệu nền',       module:'Quản trị' },
  { action:'master_data_detail',      method:'GET',  label:'Chi tiết dữ liệu nền',        module:'Quản trị' },
  { action:'master_data_create',      method:'POST', label:'Tạo dữ liệu nền',             module:'Quản trị' },
  { action:'master_data_update',      method:'POST', label:'Cập nhật dữ liệu nền',        module:'Quản trị' },
  { action:'master_data_delete',      method:'POST', label:'Xóa dữ liệu nền',             module:'Quản trị' },
  { action:'master_data_status',      method:'POST', label:'Đổi trạng thái dữ liệu nền',  module:'Quản trị' },
  { action:'master_data_history',     method:'GET',  label:'Lịch sử thay đổi dữ liệu',    module:'Quản trị' },
  { action:'master_data_entities',    method:'GET',  label:'Danh sách loại dữ liệu nền',   module:'Quản trị' },
  { action:'module_schema_list',      method:'GET',  label:'Danh sách schema module',      module:'Quản trị' },
  { action:'module_schema_get',       method:'GET',  label:'Lấy schema module',             module:'Quản trị' },
  { action:'module_schema_save',      method:'POST', label:'Lưu schema module',             module:'Quản trị' },
  { action:'module_schema_delete',    method:'POST', label:'Xóa schema module',             module:'Quản trị' },
  { action:'module_schema_reset',     method:'POST', label:'Reset schema mặc định',         module:'Quản trị' },
  { action:'module_api_catalog',      method:'GET',  label:'API catalog đầy đủ',             module:'Quản trị' },
  { action:'customer_portal_users',   method:'GET',  label:'Danh sách user cổng KH',       module:'Quản trị' },
  { action:'customer_portal_user_create',method:'POST',label:'Tạo user cổng KH',           module:'Quản trị' },
  { action:'customer_portal_analytics',method:'GET', label:'Thống kê cổng KH',              module:'Quản trị' },
  { action:'admin_git_sync',          method:'POST', label:'Đồng bộ Git',                   module:'Quản trị' },
  { action:'admin_git_pull',          method:'POST', label:'Git pull',                       module:'Quản trị' },
  { action:'admin_clear_site_cache',  method:'POST', label:'Xóa cache hệ thống',            module:'Quản trị' },

  /* ═══ 🔐 XÁC THỰC (Auth) ═════════════════════════════════════════════ */
  { action:'status',                  method:'GET',  label:'Trạng thái phiên đăng nhập',  module:'Hệ thống' },
  { action:'auth_login',              method:'POST', label:'Đăng nhập',                    module:'Hệ thống' },
  { action:'auth_logout',             method:'POST', label:'Đăng xuất',                    module:'Hệ thống' },
  { action:'auth_mfa_verify',         method:'POST', label:'Xác minh MFA',                 module:'Hệ thống' },
];

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — REACTIVE DATA BINDING (Appsmith-style)
   {{ expression }} evaluation with sandboxed Function constructor
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Evaluate a single expression within a safe parsed context.
 * context = { data:{}, filters:{}, state:{}, currentUser:{}, blocks:{}, row:{}, ... }
 */
function evaluateExpression(expr, context){
  var source = expr;
  var match;
  if(source == null || source === '') return '';
  source = String(source);
  match = source.match(/^\s*\{\{([\s\S]+)\}\}\s*$/);
  if(match) source = match[1];
  try {
    return _evaluateCompiledExpression(_compileExpression(source), context || {});
  } catch(e){
    return '';
  }
}

/**
 * Replace all {{ ... }} mustache bindings in a template string.
 * Example: "Tong: {{data.total}} don" -> "Tong: 42 don"
 */
function resolveBindings(template, context){
  return _evalExpr(template, context || {});
}

/**
 * Build full reactive context for a module.
 * Merges block data, filters, current user, and state into one object.
 */
function _buildReactiveContext(moduleId){
  var ms = getModuleState(moduleId);
  var schema = ms._schema;
  var blocksData = {};
  function registerBlock(block){
    var blockId = block.id || block.blockId;
    var alias = _safeBlockBindingKey(blockId);
    var entry = {
      data: ms.blockData[blockId] || null,
      config: block.config || {},
      type: block.type,
      selectedRow: ms.activeRows[blockId] || null,
      selectedRows: _readSelectedRows(ms, blockId),
      formData: ms.formDrafts[blockId] || {},
      formErrors: ms.formErrors[blockId] || {},
    };
    blocksData[blockId] = entry;
    blocksData[alias] = entry;
    if(block.blockId) blocksData[block.blockId] = entry;
  }

  // Build blocks map: blocks.blk_xxx.data = { ... }
  if(schema && schema.tabs){
    schema.tabs.forEach(function(tab){
      (tab.blocks||[]).forEach(function(block){
        registerBlock(block);
      });
    });
  }

  return {
    _moduleId: moduleId,
    data: ms.blockData || {},
    moduleData: ms.blockData || {},
    blocks: blocksData,
    filters: ms.filterValues || {},
    state: ms.customState || {},
    currentUser: (typeof currentUser !== 'undefined') ? currentUser : {},
    user: (typeof currentUser !== 'undefined') ? currentUser : {},
    module: schema || {},
    record: {},
    block: {},
    lang: (typeof lang !== 'undefined') ? lang : 'vi',
    Math: Math,
    Date: Date,
    Number: Number,
    String: String,
    Array: Array,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    encodeURIComponent: encodeURIComponent,
  };
}

/**
 * Resolve all bindings in a block's config object recursively.
 * Walks strings, arrays, and plain objects.
 */
function _resolveConfigBindings(config, context){
  return _resolveBindings(config, context || {});
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — COMPUTED FIELDS & FORMULA ENGINE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Evaluate a formula for a table row.
 * formula = '{{ row.qty * row.unit_price }}'
 * row = current row data object
 * context = module-level reactive context
 */
function evaluateFormula(formula, row, context){
  if(!formula) return '';
  // Strip {{ }} if present
  var expr = formula;
  var m = expr.match(/^\{\{(.+)\}\}$/);
  if(m) expr = m[1].trim();

  var localCtx = {};
  if(context){
    Object.keys(context).forEach(function(k){ localCtx[k] = context[k]; });
  }
  localCtx.row = row || {};
  return evaluateExpression(expr, localCtx);
}

/**
 * Apply computed columns to a data array.
 * Columns with a 'formula' property get their values computed per row.
 * Returns a new array with computed values injected.
 */
function _applyComputedColumns(columns, rows, context){
  var formulaCols = columns.filter(function(c){ return !!c.formula; });
  if(!formulaCols.length) return rows;

  return rows.map(function(originalRow){
    var row = {};
    Object.keys(originalRow).forEach(function(k){ row[k] = originalRow[k]; });
    formulaCols.forEach(function(col){
      row[col.key] = evaluateFormula(col.formula, row, context);
    });
    return row;
  });
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 3 — CONDITIONAL VISIBILITY
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Determine if a block should be visible based on visibleWhen expression.
 * block.visibleWhen = '{{ state.activeTab === "overview" }}'
 * Falls back to block.visible property if no expression set.
 */
function isBlockVisible(block, context){
  if(!block) return false;
  if(block.visibleWhen){
    var expr = block.visibleWhen;
    var m = expr.match(/^\{\{(.+)\}\}$/);
    if(m) expr = m[1].trim();
    return !!evaluateExpression(expr, context);
  }
  return block.visible !== false;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 4 — EVENT SYSTEM (Action triggers)
   ══════════════════════════════════════════════════════════════════════════ */

var EVENT_TYPES = {
  navigate: function(config, context){
    // Switch tab and pass params
    if(config.tab && context._moduleId){
      var ms = getModuleState(context._moduleId);
      ms.activeTab = resolveBindings(config.tab, context);
      if(config.pass){
        var params = {};
        Object.keys(config.pass).forEach(function(k){
          params[k] = resolveBindings(String(config.pass[k]), context);
        });
        ms.navParams = params;
      }
      if(context._container && ms._schema){
        renderModuleFromSchema(context._container, ms._schema);
      }
    }
  },

  api: function(config, context){
    var action = resolveBindings(config.action, context);
    var body = config.body ? JSON.parse(resolveBindings(
      typeof config.body === 'string' ? config.body : JSON.stringify(config.body),
      context
    )) : {};
    var method = config.method || 'POST';

    return _api(action, body, method).then(function(resp){
      // Handle onSuccess chain
      if(config.onSuccess){
        var successActions = config.onSuccess.split('|');
        successActions.forEach(function(act){
          act = act.trim();
          if(act === 'toast'){
            toast(_t('Thanh cong','Success'), 'success');
          } else if(act === 'refresh'){
            invalidateCache(action);
            if(context._container && context._moduleId){
              var ms = getModuleState(context._moduleId);
              renderModuleFromSchema(context._container, ms._schema);
            }
          } else if(act.indexOf('navigate:') === 0){
            var tab = act.split(':')[1];
            EVENT_TYPES.navigate({tab:tab}, context);
          }
        });
      }
      return resp;
    }).catch(function(err){
      if(config.onError === 'toast' || !config.onError){
        toast(_t('Lỗi: ','Error: ')+String(err), 'danger');
      }
      return null;
    });
  },

  refresh: function(config, context){
    var blockIds = config.blocks || [];
    var moduleId = context._moduleId;
    if(!moduleId) return;
    var ms = getModuleState(moduleId);
    var schema = ms._schema;
    if(!schema) return;

    // Invalidate cache for specified blocks
    blockIds.forEach(function(bid){
      var block = _findBlockById(schema, bid);
      if(block && block.config && block.config.dataSource){
        invalidateCache(block.config.dataSource.api);
      }
    });

    if(context._container){
      renderModuleFromSchema(context._container, schema);
    }
  },

  toast: function(config, context){
    var msg = resolveBindings(config.message || config.msg || '', context);
    toast(msg, config.type || 'info');
  },

  openModal: function(config, context){
    // Open a form modal with optional pre-filled data
    var title = resolveBindings(config.title || '', context);
    var formConfig = config.form || {};

    var overlay = document.createElement('div');
    overlay.className = 'hm-modal-overlay';
    var modal = document.createElement('div');
    modal.className = 'hm-modal';

    var html = '<div class="hm-modal-header">';
    html += '<h3 class="hm-modal-title">'+_esc(title)+'</h3>';
    html += '<button class="hm-modal-close" data-action="close">&times;</button>';
    html += '</div>';
    html += '<div class="hm-modal-body">';

    if(formConfig.fields){
      html += renderFormStandard(formConfig, config.data || {});
    } else {
      html += '<div class="hm-empty">'+_t('Chưa cấu hình form','No form configured')+'</div>';
    }

    html += '</div>';
    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close(){ if(overlay.parentNode) overlay.remove(); }
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) close();
      if(e.target.closest('[data-action="close"]')) close();
    });
  },

  setFilter: function(config, context){
    var moduleId = context._moduleId;
    if(!moduleId) return;
    var ms = getModuleState(moduleId);
    if(!ms.filterValues) ms.filterValues = {};
    Object.keys(config.values || {}).forEach(function(k){
      ms.filterValues[k] = resolveBindings(String(config.values[k]), context);
    });
    if(context._container && ms._schema){
      invalidateCache();
      renderModuleFromSchema(context._container, ms._schema);
    }
  },

  chain: function(config, context){
    // Run multiple actions in sequence
    var actions = config.actions || [];
    var promise = Promise.resolve();
    actions.forEach(function(actionConfig){
      promise = promise.then(function(){
        return executeEvent(actionConfig, context);
      });
    });
    return promise;
  },
};

/**
 * Execute an event action with expression resolution.
 * eventConfig = { type:'navigate', tab:'detail', pass:{ id:'{{row.id}}' } }
 */
function executeEvent(eventConfig, context){
  if(!eventConfig || !eventConfig.type) return Promise.resolve();
  var handler = EVENT_TYPES[eventConfig.type];
  if(!handler){
    console.warn('[BlockEngine] Unknown event type:', eventConfig.type);
    return Promise.resolve();
  }
  var result = handler(eventConfig, context);
  // Ensure promise return
  return (result && typeof result.then === 'function') ? result : Promise.resolve(result);
}

/**
 * Fire all events for a given event name on a block.
 * block.events = { onClick: {...}, onLoad: {...} }
 */
function _fireBlockEvent(block, eventName, context){
  if(!block || !block.events || !block.events[eventName]) return Promise.resolve();
  return executeEvent(block.events[eventName], context);
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 5 — UNDO / REDO SYSTEM
   ══════════════════════════════════════════════════════════════════════════ */

var _undoStack = []; // max 50 entries
var _redoStack = [];

/**
 * Push a schema snapshot to the undo stack before making a change.
 */
function pushUndo(moduleId, action, previousState){
  _undoStack.push({
    moduleId: moduleId,
    action: action,
    state: _clone(previousState),
    timestamp: Date.now()
  });
  if(_undoStack.length > 50) _undoStack.shift();
  _redoStack = []; // clear redo on new action
}

/**
 * Get the current schema state for undo/redo snapshots.
 */
function _getCurrentSchemaState(moduleId){
  var ms = getModuleState(moduleId);
  return ms._schema ? _clone(ms._schema) : null;
}

/**
 * Apply a schema state from an undo/redo entry.
 */
function _applySchemaState(moduleId, state){
  var ms = getModuleState(moduleId);
  ms._schema = _clone(state);
}

/**
 * Undo the last schema change.
 */
function undo(moduleId){
  if(!_undoStack.length) return false;
  // Find last entry for this module
  var idx = -1;
  for(var i = _undoStack.length - 1; i >= 0; i--){
    if(_undoStack[i].moduleId === moduleId){ idx = i; break; }
  }
  if(idx < 0) return false;

  var entry = _undoStack.splice(idx, 1)[0];
  // Save current state to redo
  _redoStack.push({
    moduleId: moduleId,
    action: entry.action,
    state: _getCurrentSchemaState(moduleId),
    timestamp: Date.now()
  });
  // Restore previous state
  _applySchemaState(moduleId, entry.state);
  toast(_t('Hoàn tác: '+entry.action, 'Undo: '+entry.action), 'info');
  return true;
}

/**
 * Redo the last undone schema change.
 */
function redo(moduleId){
  if(!_redoStack.length) return false;
  var idx = -1;
  for(var i = _redoStack.length - 1; i >= 0; i--){
    if(_redoStack[i].moduleId === moduleId){ idx = i; break; }
  }
  if(idx < 0) return false;

  var entry = _redoStack.splice(idx, 1)[0];
  // Save current state to undo
  _undoStack.push({
    moduleId: moduleId,
    action: entry.action,
    state: _getCurrentSchemaState(moduleId),
    timestamp: Date.now()
  });
  // Apply redo state
  _applySchemaState(moduleId, entry.state);
  toast(_t('Làm lại: '+entry.action, 'Redo: '+entry.action), 'info');
  return true;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 6 — DRAG-DROP BLOCK REORDERING (HTML5 native)
   ══════════════════════════════════════════════════════════════════════════ */

var _dragState = { dragging: null, placeholder: null };

/**
 * Initialize drag-drop for blocks within a container in edit mode.
 */
function initDragDrop(container, moduleId, tabKey){
  if(!container) return;

  var blocks = container.querySelectorAll('.hm-block[data-block-id]');
  blocks.forEach(function(el){
    el.setAttribute('draggable', 'true');

    el.addEventListener('dragstart', function(e){
      _dragState.dragging = el.getAttribute('data-block-id');
      el.classList.add('hm-block-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', _dragState.dragging);

      // Create placeholder
      _dragState.placeholder = document.createElement('div');
      _dragState.placeholder.className = 'hm-drop-indicator';
      _dragState.placeholder.style.cssText = 'height:4px;background:var(--brand-2,#2563eb);border-radius:2px;margin:4px 0;transition:opacity .15s';
    });

    el.addEventListener('dragend', function(){
      el.classList.remove('hm-block-dragging');
      _dragState.dragging = null;
      if(_dragState.placeholder && _dragState.placeholder.parentNode){
        _dragState.placeholder.remove();
      }
      _dragState.placeholder = null;
      // Remove all drag-over styles
      container.querySelectorAll('.hm-block-dragover').forEach(function(b){
        b.classList.remove('hm-block-dragover');
      });
    });

    el.addEventListener('dragover', function(e){
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if(!_dragState.dragging) return;
      var targetId = el.getAttribute('data-block-id');
      if(targetId === _dragState.dragging) return;

      // Determine drop position (top half vs bottom half)
      var rect = el.getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      var isAbove = e.clientY < midY;

      // Remove existing placeholder
      if(_dragState.placeholder && _dragState.placeholder.parentNode){
        _dragState.placeholder.remove();
      }

      if(isAbove){
        el.parentNode.insertBefore(_dragState.placeholder, el);
      } else {
        el.parentNode.insertBefore(_dragState.placeholder, el.nextSibling);
      }
    });

    el.addEventListener('dragleave', function(){
      el.classList.remove('hm-block-dragover');
    });

    el.addEventListener('drop', function(e){
      e.preventDefault();
      if(!_dragState.dragging) return;
      var draggedId = _dragState.dragging;
      var targetId = el.getAttribute('data-block-id');
      if(draggedId === targetId) return;

      // Determine drop position
      var rect = el.getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      var insertBefore = e.clientY < midY;

      // Push undo before reorder
      var ms = getModuleState(moduleId);
      pushUndo(moduleId, 'reorder-block', ms._schema);

      // Perform reorder in schema
      var schema = ms._schema;
      var tab = schema.tabs.find(function(t){ return t.tabId === tabKey; });
      if(!tab) return;

      // Remove dragged block
      var draggedIdx = -1;
      var draggedBlock = null;
      for(var i = 0; i < tab.blocks.length; i++){
        if(tab.blocks[i].id === draggedId){
          draggedIdx = i;
          draggedBlock = tab.blocks[i];
          break;
        }
      }
      if(!draggedBlock) return;
      tab.blocks.splice(draggedIdx, 1);

      // Find target index after removal
      var targetIdx = -1;
      for(var j = 0; j < tab.blocks.length; j++){
        if(tab.blocks[j].id === targetId){ targetIdx = j; break; }
      }
      if(targetIdx < 0) targetIdx = tab.blocks.length;

      // Insert at position
      var insertIdx = insertBefore ? targetIdx : targetIdx + 1;
      tab.blocks.splice(insertIdx, 0, draggedBlock);

      // Re-render
      renderModuleFromSchema(container.closest('[data-module]') || container, schema);
    });
  });
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 7 — DEPENDENCY GRAPH (auto-refresh chain)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Scan all blocks for {{ blocks.xxx }} references.
 * Returns: { blockId: [dependsOnBlockIds] }
 */
function buildDependencyGraph(schema){
  var graph = {};
  var aliasMap = {};
  if(!schema || !schema.tabs) return graph;

  var bindingPattern = /\{\{\s*blocks\.([A-Za-z0-9_\-]+)/g;

  schema.tabs.forEach(function(tab){
    (tab.blocks||[]).forEach(function(block){
      var blockId = block.id || block.blockId;
      aliasMap[blockId] = blockId;
      aliasMap[_safeBlockBindingKey(blockId)] = blockId;
      if(block.blockId) aliasMap[block.blockId] = blockId;
    });
  });

  schema.tabs.forEach(function(tab){
    (tab.blocks||[]).forEach(function(block){
      var deps = [];
      var configStr = JSON.stringify(block.config || {});
      // Also scan title, visibleWhen, events
      if(block.title){
        configStr += JSON.stringify(block.title);
      }
      if(block.visibleWhen) configStr += block.visibleWhen;
      if(block.events) configStr += JSON.stringify(block.events);

      var match;
      while((match = bindingPattern.exec(configStr)) !== null){
        var depId = aliasMap[match[1]] || match[1];
        if(depId !== block.id && deps.indexOf(depId) < 0){
          deps.push(depId);
        }
      }
      bindingPattern.lastIndex = 0; // reset regex

      if(deps.length) graph[block.id] = deps;
    });
  });

  return graph;
}

/**
 * Find all blocks that depend on changedBlockId (direct + transitive).
 */
function _findDependents(graph, changedBlockId){
  var dependents = [];
  Object.keys(graph).forEach(function(bid){
    if(graph[bid].indexOf(changedBlockId) >= 0){
      if(dependents.indexOf(bid) < 0) dependents.push(bid);
    }
  });
  return dependents;
}

/**
 * When a block's data changes, auto-refresh all blocks that depend on it.
 */
function refreshDependents(moduleId, changedBlockId){
  var ms = getModuleState(moduleId);
  var schema = ms._schema;
  if(!schema) return;

  var graph = buildDependencyGraph(schema);
  var toRefresh = _findDependents(graph, changedBlockId);
  if(!toRefresh.length) return;

  toRefresh.forEach(function(bid){
    var block = _findBlockById(schema, bid);
    if(!block) return;
    if(block.config && block.config.dataSource){
      invalidateCache(block.config.dataSource.api);
      ms.loading[bid] = true;
      fetchBlockData(block, moduleId).then(function(data){
        ms.loading[bid] = false;
        ms.blockData[bid] = data;
        if(_currentContainer && ms._schema) _rerenderBlockContent(_currentContainer, block, data, ms);
        // Cascade: check if this block also has dependents
        refreshDependents(moduleId, bid);
      });
    }
  });
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 8 — THEME VARIANTS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Get CSS class string for a block based on variant and color scheme.
 */
function getBlockClasses(block){
  var cls = 'hm-block';
  if(!block || !block.config) return cls;
  if(block.config.variant) cls += ' hm-block-' + block.config.variant;
  if(block.config.colorScheme) cls += ' hm-block-' + block.config.colorScheme;
  if(block.config.noPadding) cls += ' hm-block-no-pad';
  if(block.config.fullWidth) cls += ' hm-block-full';
  return cls;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 9 — BLOCK TEMPLATES (Presets)
   ══════════════════════════════════════════════════════════════════════════ */

var BLOCK_TEMPLATES = {
  'order-kpi-row': {
    type: 'kpi-row',
    title: { vi:'KPI Đơn hàng', en:'Order KPI' },
    config: {
      dataSource: { api:'order_dashboard_kpi', method:'GET' },
      items: [
        { label:'Đơn hoạt động', labelEn:'Active Orders', dataKey:'active_so_count', color:'var(--brand-2)' },
        { label:'OTD %', labelEn:'OTD %', dataKey:'on_time_pct', color:'var(--green)', suffix:'%' },
        { label:'Quá hạn', labelEn:'Overdue', dataKey:'overdue_count', color:'var(--red)' },
        { label:'Tạm dừng', labelEn:'On Hold', dataKey:'active_holds', color:'var(--amber)' },
      ]
    }
  },
  'production-shift-summary': {
    type: 'kpi-row',
    title: { vi:'Tổng hợp ca sản xuất', en:'Shift Summary' },
    config: {
      dataSource: { api:'dispatch_dashboard', method:'GET' },
      items: [
        { label:'Tổng task', labelEn:'Total Tasks', dataKey:'total_tasks', color:'var(--brand-2)' },
        { label:'Sản phẩm tốt', labelEn:'Good Output', dataKey:'total_good', color:'var(--green)' },
        { label:'NG', labelEn:'NG', dataKey:'total_ng', color:'var(--red)' },
        { label:'Đạt %', labelEn:'Achievement', dataKey:'achievement_pct', color:'var(--brand-1)', suffix:'%' },
      ]
    }
  },
  'quality-ncr-table': {
    type: 'data-table',
    title: { vi:'Danh sách NCR', en:'NCR List' },
    config: {
      dataSource: { api:'ncr_list', method:'GET', dataKey:'ncrs' },
      dataKey: 'ncrs',
      pageSize: 20,
      columns: [
        { key:'ncr_id', label:'Mã NCR', labelEn:'NCR ID', type:'text' },
        { key:'title', label:'Tiêu đề', labelEn:'Title', type:'text' },
        { key:'status', label:'Trạng thái', labelEn:'Status', type:'badge' },
        { key:'severity', label:'Mức độ', labelEn:'Severity', type:'badge' },
        { key:'created_at', label:'Ngày tạo', labelEn:'Created', type:'date' },
        { key:'assigned_to', label:'Người xử lý', labelEn:'Assignee', type:'text' },
      ]
    }
  },
  'quality-exception-kpi': {
    type: 'kpi-row',
    title: { vi:'KPI Chất lượng', en:'Quality KPI' },
    config: {
      dataSource: { api:'exception_dashboard', method:'GET' },
      items: [
        { label:'NCR mở', labelEn:'Open NCR', dataKey:'open_ncr', color:'var(--red)' },
        { label:'CAPA mở', labelEn:'Open CAPA', dataKey:'open_capa', color:'var(--amber)' },
        { label:'COPQ MTD', labelEn:'COPQ MTD', dataKey:'copq_mtd', color:'var(--brand-2)', suffix:' VND' },
      ]
    }
  },
  'supplier-dashboard-kpi': {
    type: 'kpi-row',
    title: { vi:'KPI Nhà cung cấp', en:'Supplier KPI' },
    config: {
      dataSource: { api:'supplier_dashboard', method:'GET' },
      items: [
        { label:'Điểm TB', labelEn:'Avg Score', dataKey:'avg_score', color:'var(--brand-2)' },
        { label:'SCAR mở', labelEn:'Open SCAR', dataKey:'open_scars', color:'var(--red)' },
        { label:'Tỉ lệ từ chối IQC', labelEn:'IQC Reject %', dataKey:'incoming_reject_rate', color:'var(--amber)', suffix:'%' },
      ]
    }
  },
  'oee-kpi-row': {
    type: 'kpi-row',
    title: { vi:'OEE Tổng hợp', en:'OEE Overview' },
    config: {
      dataSource: { api:'production_oee', method:'GET' },
      items: [
        { label:'OEE', labelEn:'OEE', dataKey:'oee', color:'var(--brand-2)', suffix:'%' },
        { label:'Availability', labelEn:'Availability', dataKey:'availability', color:'var(--green)', suffix:'%' },
        { label:'Performance', labelEn:'Performance', dataKey:'performance', color:'var(--amber)', suffix:'%' },
        { label:'Quality', labelEn:'Quality', dataKey:'quality', color:'var(--brand-1)', suffix:'%' },
      ]
    }
  },
  'empty-filter-bar': {
    type: 'filter-bar',
    title: { vi:'Bộ lọc', en:'Filters' },
    config: {
      filters: [
        { key:'search', type:'search', placeholder:'Tìm kiếm...', placeholderEn:'Search...' },
        { key:'status', type:'select', allLabel:'Tất cả', allLabelEn:'All', options:[
          { value:'active', label:'Đang hoạt động', labelEn:'Active' },
          { value:'closed', label:'Đã đóng', labelEn:'Closed' },
        ]},
      ]
    }
  },
  'empty-data-table': {
    type: 'data-table',
    title: { vi:'Bảng dữ liệu', en:'Data Table' },
    config: { columns:[], dataKey:'items', pageSize:20 }
  },
  'so-list-table': {
    type: 'data-table',
    title: { vi:'Danh sách SO', en:'Sales Order List' },
    config: {
      dataSource: { api:'order_so_list', method:'GET', dataKey:'sales_orders' },
      dataKey: 'sales_orders',
      pageSize: 20,
      columns: [
        { key:'so_number', label:'Mã SO', labelEn:'SO Number', type:'text' },
        { key:'customer', label:'Khách hàng', labelEn:'Customer', type:'text' },
        { key:'status', label:'Trạng thái', labelEn:'Status', type:'badge' },
        { key:'total_value', label:'Giá trị', labelEn:'Value', type:'number' },
        { key:'due_date', label:'Hạn giao', labelEn:'Due Date', type:'date' },
      ]
    }
  },
  'scar-list-table': {
    type: 'data-table',
    title: { vi:'Danh sách SCAR', en:'SCAR List' },
    config: {
      dataSource: { api:'scar_list', method:'GET', dataKey:'scars' },
      dataKey: 'scars',
      pageSize: 20,
      columns: [
        { key:'scar_id', label:'Mã SCAR', labelEn:'SCAR ID', type:'text' },
        { key:'supplier', label:'NCC', labelEn:'Supplier', type:'text' },
        { key:'status', label:'Trạng thái', labelEn:'Status', type:'badge' },
        { key:'issue_date', label:'Ngày phát hành', labelEn:'Issue Date', type:'date' },
      ]
    }
  },
  'equipment-list-table': {
    type: 'data-table',
    title: { vi:'Danh sách thiết bị', en:'Equipment List' },
    config: {
      dataSource: { api:'equipment_list', method:'GET', dataKey:'items' },
      dataKey: 'items',
      pageSize: 20,
      columns: [
        { key:'code', label:'Mã TB', labelEn:'Code', type:'text' },
        { key:'name', label:'Tên', labelEn:'Name', type:'text' },
        { key:'status', label:'Trạng thái', labelEn:'Status', type:'badge' },
        { key:'location', label:'Vị trí', labelEn:'Location', type:'text' },
        { key:'next_cal', label:'Hiệu chuẩn tiếp', labelEn:'Next Cal.', type:'date' },
      ]
    }
  },
  'two-col-layout': {
    type: 'two-column',
    title: { vi:'Bố cục 2 cột', en:'Two Column Layout' },
    config: { ratio:'60-40' },
    slots: { left:[], right:[] }
  },
};


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 10 — SLOT SYSTEM (Block composition)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Render a two-column block with left/right slots.
 */
/* Round 4 fix: preserve previously declared template seeds instead of resetting the catalog. */

function _tplLabel(vi, en){
  return { vi:vi, en:en };
}

function _tplSource(api, method, dataKey, totalKey, transformer){
  var source = { api:api, method:(method || 'GET') };
  if(dataKey) source.dataKey = dataKey;
  if(totalKey) source.totalKey = totalKey;
  if(transformer) source.transformer = transformer;
  return source;
}

function _tplMeta(type, vi, en, desc, module, config){
  return {
    type: type,
    label: vi,
    labelEn: en,
    title: { vi:vi, en:en },
    desc: desc,
    module: module,
    config: config || {}
  };
}

function _tplKpi(dataKey, vi, en, color, suffix, extra){
  var item = { label:_tplLabel(vi, en), dataKey:dataKey, color:(color || 'var(--brand-2)') };
  if(suffix) item.suffix = suffix;
  if(extra){
    Object.keys(extra).forEach(function(key){ item[key] = extra[key]; });
  }
  return item;
}

function _tplCol(key, vi, en, type, width, sortable, filterable, statusSet){
  var col = { key:key, label:_tplLabel(vi, en), type:(type || 'string') };
  if(width) col.width = width;
  if(typeof sortable !== 'undefined') col.sortable = sortable;
  if(typeof filterable !== 'undefined') col.filterable = filterable;
  if(statusSet) col.statusSet = statusSet;
  return col;
}

function _tplField(key, vi, en, type, required, span, extra){
  var field = { key:key, label:_tplLabel(vi, en), type:(type || 'string') };
  if(required) field.required = true;
  if(span) field.span = span;
  if(extra){
    Object.keys(extra).forEach(function(name){ field[name] = extra[name]; });
  }
  return field;
}

function _tplStep(key, vi, en, fieldsCsv, visibleWhen){
  var step = { key:key, label:_tplLabel(vi, en), fieldsCsv:(fieldsCsv || '') };
  if(visibleWhen) step.visibleWhen = visibleWhen;
  return step;
}

function _tplLane(key, vi, en, color, limit){
  return { key:key, label:_tplLabel(vi, en), color:color, limit:limit };
}

function _tplBtn(vi, en, variant, action, icon){
  return { label:_tplLabel(vi, en), variant:(variant || 'secondary'), action:(action || ''), icon:(icon || '') };
}

function _tplTransition(from, to, vi, en, endpoint, role, requireComment, confirmMessage){
  return {
    from: from,
    to: to,
    label: _tplLabel(vi, en),
    endpoint: endpoint,
    role: role || '',
    requireComment: !!requireComment,
    confirmMessage: confirmMessage || ''
  };
}

function _tplCheck(key, vi, en, type, required, score, evidenceRequired){
  return {
    key: key,
    label: _tplLabel(vi, en),
    type: (type || 'check'),
    required: !!required,
    score: (typeof score === 'number' ? score : 0),
    evidenceRequired: !!evidenceRequired
  };
}

BLOCK_TEMPLATES['tpl-quote-dashboard-kpi'] = _tplMeta('kpi-row', 'Dashboard KPI Báo giá', 'Quote Dashboard KPIs', 'Tổng hợp khối lượng và hiệu quả báo giá theo pipeline hiện hành.', 'quoting', {
  dataSource: _tplSource('quote_dashboard', 'GET'),
  items: [
    _tplKpi('total_quotes', 'Tổng báo giá', 'Total Quotes', 'var(--brand-2)'),
    _tplKpi('open_quotes', 'Chờ xử lý', 'Pending Quotes', 'var(--amber)'),
    _tplKpi('conversion_rate', 'Win Rate', 'Win Rate', 'var(--green)', '%'),
    _tplKpi('avg_quote_value', 'Giá trị TB', 'Average Value', 'var(--brand-1)', ' USD')
  ]
});

BLOCK_TEMPLATES['tpl-quote-list-table'] = _tplMeta('data-table', 'Bảng danh sách báo giá', 'Quote List Table', 'Danh sách báo giá chuẩn với cột khách hàng, giá trị và trạng thái.', 'quoting', {
  dataSource: _tplSource('quote_list', 'GET', 'quotes', 'total'),
  dataKey: 'quotes',
  pageSize: 20,
  rowKey: 'quote_id',
  columns: [
    _tplCol('quote_number', 'Số báo giá', 'Quote Number', 'string', '150', true, true),
    _tplCol('customer_name', 'Khách hàng', 'Customer', 'string', '220', true, true),
    _tplCol('total_amount', 'Tổng tiền', 'Total Amount', 'currency', '150', true, false),
    _tplCol('status', 'Trạng thái', 'Status', 'badge', '130', true, true, 'quote_status'),
    _tplCol('created_at', 'Ngày tạo', 'Created At', 'datetime', '160', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-quote-create-form'] = _tplMeta('form-wizard', 'Wizard tạo báo giá', 'Quote Create Wizard', 'Wizard 3 bước để tạo và rà soát báo giá khách hàng.', 'quoting', {
  dataSource: _tplSource('quote_create', 'POST'),
  wizard: {
    showProgress: true,
    allowSkip: false,
    summaryStepKey: 'confirm',
    steps: [
      _tplStep('info', 'Thông tin', 'Information', 'customer_name,requested_date,promise_date,currency_code'),
      _tplStep('product', 'Sản phẩm', 'Products', 'lines,markup_pct,gross_margin_pct,flight_critical_flag'),
      _tplStep('confirm', 'Xác nhận', 'Confirmation', 'payment_terms,incoterm,total_order_value')
    ],
    saveDraft: { api:'quote_create', method:'POST' },
    submit: { api:'quote_create', method:'POST' }
  }
});

BLOCK_TEMPLATES['tpl-quote-pipeline-kanban'] = _tplMeta('data-kanban', 'Kanban pipeline báo giá', 'Quote Pipeline Kanban', 'Pipeline báo giá theo trạng thái thương mại và hành động chuyển tiếp.', 'quoting', {
  dataSource: _tplSource('quote_list', 'GET', 'quotes', 'total'),
  dataKey: 'quotes',
  kanban: {
    laneField: 'status',
    allowCreate: true,
    allowDrag: true,
    lanes: [
      _tplLane('draft', 'Nháp', 'Draft', '#94a3b8', 8),
      _tplLane('sent', 'Đã gửi', 'Submitted', '#38bdf8', 6),
      _tplLane('review', 'Đang duyệt', 'Reviewing', '#f59e0b', 4),
      _tplLane('accepted', 'Trúng', 'Won', '#22c55e', 3),
      _tplLane('rejected', 'Trượt', 'Lost', '#ef4444', 2)
    ],
    card: {
      titleField: 'quote_number',
      subtitleField: 'customer_name',
      priorityField: 'flight_critical_flag',
      dueDateField: 'promise_date',
      tagField: 'currency_code'
    },
    persist: { api:'quote_transition', method:'POST' }
  }
});

BLOCK_TEMPLATES['tpl-quote-trend-chart'] = _tplMeta('chart-line', 'Xu hướng giá trị báo giá', 'Quote Value Trend', 'Xu hướng giá trị báo giá theo tháng để theo dõi pipeline và hiệu suất chào giá.', 'quoting', {
  dataSource: _tplSource('quote_dashboard', 'GET', 'monthly_trend'),
  chart: {
    xField: 'period',
    yField: 'quote_value',
    smooth: true,
    showGrid: true,
    showLegend: true,
    series: [
      { field:'quote_value', label:_tplLabel('Giá trị báo giá', 'Quote Value'), type:'line', color:'#2563eb' },
      { field:'won_value', label:_tplLabel('Giá trị trúng', 'Won Value'), type:'area', color:'#0ea5e9' }
    ]
  }
});

BLOCK_TEMPLATES['tpl-order-dashboard-kpi'] = _tplMeta('kpi-row', 'Dashboard KPI đơn hàng', 'Order Dashboard KPIs', 'Bộ KPI điều hành đơn hàng dựa trên dữ liệu dashboard tổng hợp hiện có.', 'orders', {
  dataSource: _tplSource('order_dashboard_kpi', 'GET'),
  items: [
    _tplKpi('backlog_value', 'Giá trị tồn đọng', 'Backlog Value', 'var(--brand-2)', ' USD'),
    _tplKpi('on_time_delivery', 'OTD', 'On-Time Delivery', 'var(--green)'),
    _tplKpi('revenue_this_month', 'Doanh thu tháng', 'Revenue This Month', 'var(--brand-1)', ' USD'),
    _tplKpi('book_to_bill_ratio', 'Book-to-Bill', 'Book-to-Bill', 'var(--amber)')
  ]
});

BLOCK_TEMPLATES['tpl-order-so-table'] = _tplMeta('data-table', 'Bảng Sales Order', 'Sales Order Table', 'Danh sách SO với khách hàng, giá trị, tiến độ và hạn giao hàng.', 'orders', {
  dataSource: _tplSource('order_so_list', 'GET', 'sales_orders', 'total'),
  dataKey: 'sales_orders',
  pageSize: 20,
  rowKey: 'so_id',
  columns: [
    _tplCol('so_number', 'Số SO', 'SO Number', 'string', '150', true, true),
    _tplCol('customer_name', 'Khách hàng', 'Customer', 'string', '220', true, true),
    _tplCol('total_value', 'Tổng giá trị', 'Total Value', 'currency', '150', true, false),
    _tplCol('status', 'Trạng thái', 'Status', 'badge', '130', true, true, 'so_status'),
    _tplCol('due_date', 'Hạn giao', 'Due Date', 'date', '120', true, false),
    _tplCol('order_date', 'Ngày đặt', 'Order Date', 'date', '120', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-order-tree'] = _tplMeta('data-tree', 'Cây SO > JO > WO', 'SO > JO > WO Tree', 'Cây phân rã từ sales order xuống job order và work order.', 'orders', {
  dataSource: _tplSource('order_hierarchy', 'GET', 'tree'),
  dataKey: 'tree',
  childrenKey: 'children',
  titleField: 'sales_order_number',
  subtitleField: 'so_status'
});

BLOCK_TEMPLATES['tpl-order-gantt'] = _tplMeta('data-gantt', 'Gantt điều độ đơn hàng', 'Order Schedule Gantt', 'Tiến độ WO theo máy và giai đoạn kế hoạch dùng dữ liệu capacity thực tế.', 'orders', {
  dataSource: _tplSource('schedule_capacity', 'GET', 'capacity_data'),
  dataKey: 'capacity_data',
  schedule: {
    defaultView: 'week',
    resourceField: 'machine_id',
    startField: 'start_date',
    endField: 'end_date',
    titleField: 'capacity_data',
    statusField: 'utilization_pct',
    showWeekends: false
  }
});

BLOCK_TEMPLATES['tpl-order-status-flow'] = _tplMeta('action-status-flow', 'Luồng trạng thái SO', 'Sales Order Status Flow', 'Bộ nút chuyển trạng thái SO từ báo giá tới giao hàng hoàn tất.', 'orders', {
  dataSource: _tplSource('order_so_list', 'GET', 'sales_orders', 'total'),
  workflow: {
    stateField: 'status',
    showHistory: true,
    escalationRole: 'sales_manager',
    transitions: [
      _tplTransition('draft', 'quoted', 'Chốt báo giá', 'Quote Locked', 'order_transition', 'sales', false, 'Xác nhận khóa báo giá thành đơn hàng?'),
      _tplTransition('quoted', 'confirmed', 'Xác nhận SO', 'Confirm SO', 'order_transition', 'sales_manager', false, 'Xác nhận chuyển sang confirmed?'),
      _tplTransition('confirmed', 'in_production', 'Phát hành WO', 'Release to Production', 'order_transition', 'planner', false, 'Phát hành cho sản xuất?'),
      _tplTransition('in_production', 'shipped', 'Xuất hàng', 'Ship', 'order_transition', 'logistics', true, 'Đã hoàn tất chứng từ và sẵn sàng xuất hàng?'),
      _tplTransition('shipped', 'closed', 'Đóng đơn', 'Close Order', 'order_transition', 'sales_manager', false, 'Đóng đơn hàng này?')
    ]
  }
});

BLOCK_TEMPLATES['tpl-plan-capacity-grid'] = _tplMeta('schedule-grid', 'Lưới năng lực máy theo ca', 'Machine Capacity Grid', 'Lịch năng lực theo máy và khung thời gian kế hoạch.', 'planning', {
  dataSource: _tplSource('schedule_capacity', 'GET', 'capacity_data'),
  dataKey: 'capacity_data',
  schedule: {
    defaultView: 'week',
    startField: 'start_date',
    endField: 'end_date',
    resourceField: 'machine_id',
    statusField: 'schedule_status_sch',
    progressField: 'utilization_pct',
    slotMinutes: 480,
    workdayStart: '06:00',
    workdayEnd: '22:00',
    showWeekends: false
  }
});

BLOCK_TEMPLATES['tpl-plan-mrp-table'] = _tplMeta('data-table', 'Bảng nhu cầu vật tư', 'Material Planning Table', 'Bảng vật tư kế hoạch dùng dữ liệu estimate vật liệu hiện có của hệ thống.', 'planning', {
  dataSource: _tplSource('quote_estimate_material', 'GET'),
  pageSize: 20,
  rowKey: 'material_type',
  columns: [
    _tplCol('material_type', 'Loại vật tư', 'Material Type', 'string', '180', true, true),
    _tplCol('dimensions', 'Quy cách', 'Dimensions', 'string', '180', false, true),
    _tplCol('qty', 'Nhu cầu', 'Required Qty', 'number', '100', true, false),
    _tplCol('buy_to_fly', 'Buy-to-Fly', 'Buy-to-Fly', 'number', '110', true, false),
    _tplCol('estimate', 'Ước tính', 'Estimate', 'currency', '140', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-plan-dispatch-board'] = _tplMeta('data-kanban', 'Kanban phát lệnh sản xuất', 'Dispatch Kanban', 'Bảng phát lệnh theo tình trạng mục tiêu sản xuất và ưu tiên dispatch.', 'planning', {
  dataSource: _tplSource('dispatch_list_targets', 'GET'),
  kanban: {
    laneField: 'status',
    allowCreate: false,
    allowDrag: true,
    lanes: [
      _tplLane('draft', 'Nháp', 'Draft', '#94a3b8', 6),
      _tplLane('released', 'Đã phát hành', 'Released', '#38bdf8', 5),
      _tplLane('running', 'Đang chạy', 'Running', '#22c55e', 4),
      _tplLane('hold', 'Tạm dừng', 'On Hold', '#f59e0b', 2)
    ],
    card: {
      titleField: 'wo_number',
      subtitleField: 'machine_name',
      priorityField: 'priority',
      dueDateField: 'target_date',
      tagField: 'shift_code'
    },
    persist: { api:'dispatch_update_target', method:'POST' }
  }
});

BLOCK_TEMPLATES['tpl-plan-schedule-gantt'] = _tplMeta('data-gantt', 'Gantt điều độ kế hoạch', 'Planning Schedule Gantt', 'Tiến độ WO kế hoạch theo máy và năng lực từng khung thời gian.', 'planning', {
  dataSource: _tplSource('schedule_capacity', 'GET', 'capacity_data'),
  dataKey: 'capacity_data',
  schedule: {
    defaultView: 'week',
    startField: 'start_date',
    endField: 'end_date',
    resourceField: 'machine_id',
    titleField: 'job_number_sch',
    statusField: 'schedule_status_sch',
    groupByField: 'work_center_id_sch'
  }
});

BLOCK_TEMPLATES['tpl-plan-material-shortage'] = _tplMeta('data-table', 'Bảng cảnh báo vật tư', 'Material Shortage Table', 'Danh sách vật tư cần chú ý theo buy-to-fly và estimate vật liệu.', 'planning', {
  dataSource: _tplSource('quote_estimate_material', 'GET'),
  pageSize: 20,
  rowKey: 'material_type',
  columns: [
    _tplCol('material_type', 'Loại vật tư', 'Material Type', 'string', '180', true, true),
    _tplCol('dimensions', 'Quy cách', 'Dimensions', 'string', '180', false, true),
    _tplCol('qty', 'Số lượng yêu cầu', 'Required Qty', 'number', '120', true, false),
    _tplCol('buy_to_fly', 'Tỷ lệ buy-to-fly', 'Buy-to-Fly', 'number', '130', true, false),
    _tplCol('estimate', 'Giá trị ước tính', 'Estimated Value', 'currency', '150', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-purchase-dashboard-kpi'] = _tplMeta('kpi-row', 'Dashboard KPI mua hàng', 'Purchasing Dashboard KPIs', 'Bộ KPI nhà cung cấp và chất lượng đầu vào từ dashboard hiện hành.', 'purchasing', {
  dataSource: _tplSource('supplier_dashboard', 'GET'),
  items: [
    _tplKpi('total_suppliers', 'Tổng NCC', 'Total Suppliers', 'var(--brand-2)'),
    _tplKpi('open_scars', 'SCAR đang mở', 'Open SCARs', 'var(--red)'),
    _tplKpi('avg_delivery_score', 'Điểm giao hàng', 'Delivery Score', 'var(--green)'),
    _tplKpi('iqc_acceptance_rate', 'Tỷ lệ IQC đạt', 'IQC Acceptance', 'var(--amber)', '%')
  ]
});

BLOCK_TEMPLATES['tpl-purchase-po-table'] = _tplMeta('data-table', 'Bảng PO / subcontract', 'PO / Subcontract Table', 'Danh sách đặt mua và gia công ngoài với trạng thái giao nhận.', 'purchasing', {
  dataSource: _tplSource('subcontract_list', 'GET'),
  pageSize: 20,
  rowKey: 'sc_id',
  columns: [
    _tplCol('po_number', 'Số PO', 'PO Number', 'string', '150', true, true),
    _tplCol('sc_number', 'Số subcontract', 'Subcontract Number', 'string', '160', true, true),
    _tplCol('vendor_name', 'Nhà cung cấp', 'Vendor', 'string', '220', true, true),
    _tplCol('quantity', 'Số lượng', 'Quantity', 'number', '110', true, false),
    _tplCol('status', 'Trạng thái', 'Status', 'badge', '130', true, true),
    _tplCol('expected_return', 'Ngày nhận dự kiến', 'Expected Return', 'date', '140', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-purchase-receiving-form'] = _tplMeta('form-standard', 'Form nhận hàng và kiểm tra', 'Receiving Inspection Form', 'Form nhập dữ liệu nhận hàng, số lượng đạt/không đạt và CoC.', 'purchasing', {
  dataSource: _tplSource('subcontract_receive', 'POST'),
  columns: 2,
  fields: [
    _tplField('subcontract_id', 'Mã subcontract', 'Subcontract ID', 'string', true, '', { placeholder:'SC-0001' }),
    _tplField('received_date', 'Ngày nhận', 'Received Date', 'date', true),
    _tplField('qty_received', 'Số lượng nhận', 'Qty Received', 'number', true),
    _tplField('qty_accepted', 'Số lượng đạt', 'Qty Accepted', 'number', true),
    _tplField('qty_rejected', 'Số lượng NG', 'Qty Rejected', 'number', false),
    _tplField('coc_received', 'Đã nhận CoC', 'CoC Received', 'checkbox', false),
    _tplField('condition', 'Tình trạng hàng', 'Condition', 'text', false, 'full'),
    _tplField('inspection_notes', 'Ghi chú kiểm tra', 'Inspection Notes', 'textarea', false, 'full', { rows:4 })
  ],
  showSubmit: true,
  submitAction: 'subcontract_receive',
  submitLabel: 'Ghi nhận nhận hàng',
  submitLabelEn: 'Post Receipt'
});

BLOCK_TEMPLATES['tpl-purchase-supplier-scorecard'] = _tplMeta('insight-scorecard', 'Scorecard nhà cung cấp', 'Supplier Scorecard', 'Scorecard năng lực nhà cung cấp theo chất lượng, giao hàng và chi phí.', 'purchasing', {
  dataSource: _tplSource('supplier_scorecard_list', 'GET', 'scorecards'),
  dataKey: 'scorecards',
  pageSize: 15,
  rowKey: 'vendor_id',
  columns: [
    _tplCol('vendor_name', 'Nhà cung cấp', 'Vendor', 'string', '220', true, true),
    _tplCol('quality_score', 'Điểm chất lượng', 'Quality Score', 'number', '120', true, false),
    _tplCol('delivery_score', 'Điểm giao hàng', 'Delivery Score', 'number', '120', true, false),
    _tplCol('cost_score', 'Điểm chi phí', 'Cost Score', 'number', '120', true, false),
    _tplCol('overall_score', 'Điểm tổng', 'Overall Score', 'number', '120', true, false),
    _tplCol('rating', 'Xếp hạng', 'Rating', 'badge', '110', true, true)
  ]
});

BLOCK_TEMPLATES['tpl-purchase-3way-match'] = _tplMeta('data-table', 'Đối chiếu PO / nhận hàng', 'Receipt Match Table', 'Bảng đối chiếu PO, trạng thái nhận hàng và kết quả kiểm tra đầu vào.', 'purchasing', {
  dataSource: _tplSource('supplier_incoming_list', 'GET', 'inspections'),
  dataKey: 'inspections',
  pageSize: 20,
  rowKey: 'iqc_id',
  columns: [
    _tplCol('po_number', 'Số PO', 'PO Number', 'string', '150', true, true),
    _tplCol('vendor_name', 'Nhà cung cấp', 'Vendor', 'string', '200', true, true),
    _tplCol('part_number', 'Mã vật tư', 'Part Number', 'string', '160', true, true),
    _tplCol('lot_qty', 'SL lô', 'Lot Qty', 'number', '110', true, false),
    _tplCol('result', 'Kết quả IQC', 'IQC Result', 'badge', '120', true, true),
    _tplCol('inspection_date', 'Ngày kiểm', 'Inspection Date', 'date', '130', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-mes-shopfloor-status'] = _tplMeta('mfg-machine-status', 'Trạng thái shopfloor', 'Shopfloor Machine Status', 'Lưới trạng thái máy tại shopfloor theo dữ liệu realtime hiện hành.', 'manufacturing', {
  dataSource: _tplSource('mobile_shop_overview', 'GET'),
  machine: {
    assetField: 'machine_name',
    lineField: 'machine_id',
    statusField: 'status',
    reasonField: 'alarm_code',
    updatedAtField: 'updated_at',
    showDowntime: true,
    showCounters: true,
    statusMap: [
      { key:'running', label:_tplLabel('Chạy', 'Running'), color:'var(--green)', severity:'ok' },
      { key:'idle', label:_tplLabel('Chờ', 'Idle'), color:'var(--amber)', severity:'warn' },
      { key:'down', label:_tplLabel('Dừng', 'Down'), color:'var(--red)', severity:'critical' }
    ]
  }
});

BLOCK_TEMPLATES['tpl-mes-oee-dashboard'] = _tplMeta('iot-oee-board', 'Dashboard OEE shopfloor', 'Shopfloor OEE Dashboard', 'Bảng OEE theo máy với Availability, Performance và Quality.', 'manufacturing', {
  dataSource: _tplSource('mobile_shop_overview', 'GET'),
  oee: {
    oeeField: 'oee',
    availabilityField: 'kpi_target',
    performanceField: 'kpi_actual',
    qualityField: 'part_count',
    machineField: 'machine_name',
    showTrend: true,
    timeBucket: 'shift'
  }
});

BLOCK_TEMPLATES['tpl-mes-andon'] = _tplMeta('mfg-andon-board', 'Bảng Andon trạm', 'Station Andon Board', 'Bảng Andon hiển thị tình trạng trợ giúp và cảnh báo theo trạm.', 'manufacturing', {
  dataSource: _tplSource('mobile_shop_overview', 'GET'),
  machine: {
    assetField: 'machine_name',
    statusField: 'status',
    reasonField: 'alarm_code',
    updatedAtField: 'updated_at'
  }
});

BLOCK_TEMPLATES['tpl-mes-wo-execution'] = _tplMeta('data-table', 'Bảng thực thi WO', 'WO Execution Table', 'Bảng WO đang thực thi với máy, ca, sản lượng và trạng thái chạy.', 'manufacturing', {
  dataSource: _tplSource('dispatch_list_targets', 'GET'),
  pageSize: 20,
  rowKey: 'target_id',
  columns: [
    _tplCol('wo_number', 'Số WO', 'WO Number', 'string', '150', true, true),
    _tplCol('machine_name', 'Máy', 'Machine', 'string', '160', true, true),
    _tplCol('operator_name', 'Nhân viên', 'Operator', 'string', '160', true, true),
    _tplCol('shift_code', 'Ca', 'Shift', 'string', '90', true, true),
    _tplCol('target_qty', 'Mục tiêu', 'Target Qty', 'number', '100', true, false),
    _tplCol('good_qty', 'Đạt', 'Good Qty', 'number', '90', true, false),
    _tplCol('status', 'Trạng thái', 'Status', 'badge', '120', true, true)
  ]
});

BLOCK_TEMPLATES['tpl-mes-downtime-pareto'] = _tplMeta('quality-pareto', 'Pareto nguyên nhân downtime', 'Downtime Pareto', 'Pareto downtime dựa trên alarm code và trạng thái máy shopfloor.', 'manufacturing', {
  dataSource: _tplSource('mobile_shop_overview', 'GET', 'items', '', 'var rows = Array.isArray(data) ? data : (data.items || []); var buckets = {}; rows.forEach(function(row){ var key = row.alarm_code || row.status || "unknown"; buckets[key] = (buckets[key] || 0) + 1; }); return { items:Object.keys(buckets).map(function(key){ return { category:key, value:buckets[key] }; }) };'),
  dataKey: 'items',
  distribution: {
    categoryField: 'category',
    valueField: 'value',
    showCumulative: true,
    topN: 10,
    sortBy: 'value_desc'
  }
});

BLOCK_TEMPLATES['tpl-quality-dashboard-kpi'] = _tplMeta('kpi-row', 'Dashboard KPI chất lượng', 'Quality Dashboard KPIs', 'KPI chất lượng tổng hợp cho NCR, CAPA, scrap và first pass yield.', 'quality', {
  dataSource: _tplSource('dashboard_quality', 'GET'),
  items: [
    _tplKpi('ncr_open', 'NCR đang mở', 'Open NCR', 'var(--red)'),
    _tplKpi('capa_open', 'CAPA đang mở', 'Open CAPA', 'var(--amber)'),
    _tplKpi('scrap_rate', 'Tỷ lệ scrap', 'Scrap Rate', 'var(--brand-1)', '%'),
    _tplKpi('first_pass_yield', 'FPY', 'First Pass Yield', 'var(--green)', '%')
  ]
});

BLOCK_TEMPLATES['tpl-quality-ncr-table'] = _tplMeta('data-table', 'Bảng ngoại lệ chất lượng', 'Quality Exception Table', 'Danh sách ngoại lệ chất lượng với severity, priority và người phụ trách.', 'quality', {
  dataSource: _tplSource('exception_list', 'GET', 'exceptions', 'total'),
  dataKey: 'exceptions',
  pageSize: 20,
  rowKey: 'exception_id',
  columns: [
    _tplCol('exception_number', 'Số ngoại lệ', 'Exception Number', 'string', '150', true, true),
    _tplCol('title', 'Tiêu đề', 'Title', 'string', '260', false, true),
    _tplCol('severity', 'Mức độ', 'Severity', 'badge', '110', true, true, 'severity'),
    _tplCol('priority', 'Ưu tiên', 'Priority', 'badge', '110', true, true, 'priority'),
    _tplCol('status', 'Trạng thái', 'Status', 'badge', '120', true, true),
    _tplCol('assigned_to', 'Người phụ trách', 'Assigned To', 'string', '160', true, true),
    _tplCol('created_date', 'Ngày tạo', 'Created Date', 'date', '120', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-quality-ncr-create'] = _tplMeta('form-wizard', 'Wizard tạo NCR', 'NCR Create Wizard', 'Wizard 4 bước để tạo ngoại lệ chất lượng và hành động containment.', 'quality', {
  dataSource: _tplSource('quality_exception_create', 'POST'),
  wizard: {
    showProgress: true,
    allowSkip: false,
    summaryStepKey: 'submit',
    steps: [
      _tplStep('info', 'Thông tin', 'Information', 'customer_id,source,subject,received_date'),
      _tplStep('defect', 'Lỗi', 'Defect', 'severity,description,affected_part_id,affected_qty'),
      _tplStep('containment', 'Containment', 'Containment', 'affected_so_number,description'),
      _tplStep('submit', 'Gửi', 'Submit', 'subject,description,severity')
    ],
    saveDraft: { api:'quality_exception_create', method:'POST' },
    submit: { api:'quality_exception_create', method:'POST' }
  }
});

BLOCK_TEMPLATES['tpl-quality-spc-chart'] = _tplMeta('quality-spc-chart', 'Biểu đồ SPC Xbar-R', 'SPC Xbar-R Chart', 'Biểu đồ SPC theo đặc tính đo, centerline và giới hạn kiểm soát.', 'quality', {
  dataSource: _tplSource('spc_chart', 'GET'),
  spc: {
    valueField: 'data_points',
    sampleField: 'subgroup_size',
    targetField: 'centerline',
    uclField: 'ucl',
    lclField: 'lcl',
    centerLineField: 'centerline',
    chartMode: 'xbar-r',
    highlightViolations: true
  }
});

BLOCK_TEMPLATES['tpl-quality-pareto'] = _tplMeta('quality-pareto', 'Pareto lỗi chất lượng', 'Quality Pareto', 'Pareto defect dựa trên danh sách top defect từ dashboard ngoại lệ.', 'quality', {
  dataSource: _tplSource('exception_dashboard', 'GET', 'top_defects'),
  dataKey: 'top_defects',
  distribution: {
    categoryField: 'defect',
    valueField: 'count',
    showCumulative: true,
    topN: 10,
    sortBy: 'value_desc'
  }
});

BLOCK_TEMPLATES['tpl-quality-control-chart'] = _tplMeta('quality-control-chart', 'Biểu đồ kiểm soát Xbar / R', 'Xbar / R Control Chart', 'Biểu đồ kép Xbar và R để theo dõi ổn định quá trình, Cp và Cpk.', 'quality', {
  dataSource: _tplSource('spc_chart', 'GET'),
  subgroupSize: 5,
  spc: {
    valueField: 'measured_value',
    subgroupField: 'subgroup',
    timestampField: 'measured_at'
  }
});
BLOCK_TEMPLATES['tpl-quality-checksheet'] = _tplMeta('quality-checksheet', 'Checksheet kiểm tra công đoạn', 'Process Checksheet', 'Bảng checksheet số ghi nhận tần suất NG, kết quả pass/fail và thông số đo.', 'quality', {
  rows: [
    { id:'dimension', label:{ vi:'Kích thước chính', en:'Critical dimension' } },
    { id:'surface', label:{ vi:'Bề mặt', en:'Surface finish' } },
    { id:'trace', label:{ vi:'Tem truy xuất', en:'Traceability label' } }
  ],
  columns: [
    { id:'check_1', label:{ vi:'Check', en:'Check' }, type:'check' },
    { id:'count_ng', label:{ vi:'NG', en:'NG count' }, type:'count' },
    { id:'result', label:{ vi:'Kết quả', en:'Result' }, type:'pass_fail' },
    { id:'measure', label:{ vi:'Thông số', en:'Measurement' }, type:'measurement' }
  ],
  editable: true
});
BLOCK_TEMPLATES['tpl-evidence-vault-table'] = _tplMeta('data-table', 'Kho hồ sơ chứng cứ', 'Evidence Vault Table', 'Kho chứng cứ số với hash SHA-256, liên kết hồ sơ và người tải lên.', 'evidence', {
  dataSource: _tplSource('evidence_list', 'GET', 'evidence', 'total'),
  dataKey: 'evidence',
  pageSize: 20,
  rowKey: 'evidence_id',
  columns: [
    _tplCol('evidence_id', 'Mã chứng cứ', 'Evidence ID', 'string', '150', true, true),
    _tplCol('file_type', 'Loại tệp', 'File Type', 'badge', '110', true, true),
    _tplCol('sha256_hash', 'SHA-256', 'SHA-256', 'string', '240', false, true),
    _tplCol('linked_entities', 'Liên kết hồ sơ', 'Linked Entities', 'string', '220', false, true),
    _tplCol('uploaded_at', 'Ngày tải', 'Uploaded At', 'datetime', '160', true, false),
    _tplCol('uploaded_by', 'Người tải', 'Uploaded By', 'string', '140', true, true)
  ]
});

BLOCK_TEMPLATES['tpl-evidence-chain-timeline'] = _tplMeta('data-timeline', 'Timeline chuỗi custody', 'Evidence Chain Timeline', 'Dòng thời gian xác minh chain of custody theo sự kiện chứng cứ.', 'evidence', {
  dataSource: _tplSource('evidence_chain_custody', 'GET'),
  dateKey: 'created_at',
  titleKey: 'action',
  descKey: 'notes',
  statusKey: 'workflow_status',
  groupBy: 'evidence_id'
});

BLOCK_TEMPLATES['tpl-evidence-upload'] = _tplMeta('form-standard', 'Form tải chứng cứ', 'Evidence Upload Form', 'Form tải chứng cứ kèm mô tả, entity liên kết và tags.', 'evidence', {
  dataSource: _tplSource('evidence_upload', 'POST'),
  columns: 2,
  fields: [
    _tplField('file', 'Tệp chứng cứ', 'Evidence File', 'file', true, 'full'),
    _tplField('entity_type', 'Loại đối tượng', 'Entity Type', 'select', true),
    _tplField('entity_id', 'Mã đối tượng', 'Entity ID', 'string', true),
    _tplField('tags', 'Tags', 'Tags', 'text', false),
    _tplField('description', 'Mô tả', 'Description', 'textarea', false, 'full', { rows:4 })
  ],
  showSubmit: true,
  submitAction: 'evidence_upload',
  submitLabel: 'Tải chứng cứ',
  submitLabelEn: 'Upload Evidence'
});

BLOCK_TEMPLATES['tpl-evidence-custody-log'] = _tplMeta('audit-log', 'Audit log custody', 'Custody Audit Log', 'Audit log thể hiện actor, action và trạng thái chain of custody.', 'evidence', {
  dataSource: _tplSource('evidence_chain_custody', 'GET'),
  dateKey: 'created_at',
  titleKey: 'action',
  descKey: 'notes',
  statusKey: 'workflow_status'
});

BLOCK_TEMPLATES['tpl-evidence-dashboard-kpi'] = _tplMeta('kpi-row', 'Dashboard KPI chứng cứ', 'Evidence Dashboard KPIs', 'KPI xác minh integrity của hồ sơ chứng cứ số.', 'evidence', {
  dataSource: _tplSource('evidence_verify_chain', 'GET', '', '', 'return { total_records:data.total_records || 0, verified_records:data.verified_records || 0, chain_integrity_pct:(data.total_records ? Math.round((data.verified_records / data.total_records) * 100) : (data.chain_valid ? 100 : 0)), broken_at:data.broken_at || "-", verification_time:data.verification_time || "-" };'),
  items: [
    _tplKpi('total_records', 'Tổng hồ sơ', 'Total Records', 'var(--brand-2)'),
    _tplKpi('verified_records', 'Đã xác minh', 'Verified Records', 'var(--green)'),
    _tplKpi('chain_integrity_pct', 'Toàn vẹn chain', 'Chain Integrity', 'var(--amber)', '%'),
    _tplKpi('verification_time', 'Lần xác minh', 'Verification Time', 'var(--brand-1)')
  ]
});

BLOCK_TEMPLATES['tpl-report-kpi-dashboard'] = _tplMeta('kpi-row', 'Dashboard KPI điều hành', 'Executive KPI Dashboard', 'Dashboard 8 KPI điều hành dùng dữ liệu chất lượng tổng hợp hiện có.', 'reports', {
  dataSource: _tplSource('dashboard_quality', 'GET'),
  items: [
    _tplKpi('first_pass_yield', 'FPY', 'First Pass Yield', 'var(--green)', '%'),
    _tplKpi('scrap_rate', 'Scrap', 'Scrap Rate', 'var(--red)', '%'),
    _tplKpi('copq_month', 'COPQ', 'COPQ Month', 'var(--brand-2)', ' USD'),
    _tplKpi('ncr_open', 'NCR mở', 'Open NCR', 'var(--amber)'),
    _tplKpi('capa_open', 'CAPA mở', 'Open CAPA', 'var(--amber)'),
    _tplKpi('customer_complaints', 'Khiếu nại KH', 'Customer Complaints', 'var(--red)'),
    _tplKpi('supplier_quality_score', 'Điểm NCC', 'Supplier Score', 'var(--brand-1)'),
    _tplKpi('spc_in_control', 'SPC in control', 'SPC In Control', 'var(--green)', '%')
  ]
});

BLOCK_TEMPLATES['tpl-report-copq-breakdown'] = _tplMeta('chart-donut', 'Donut COPQ breakdown', 'COPQ Breakdown Donut', 'Phân bổ chi phí chất lượng theo prevention, appraisal và failure cost.', 'reports', {
  dataSource: _tplSource('compliance_report_copq', 'GET', 'breakdown', '', 'return { breakdown:[{ label:\"Prevention\", value:data.prevention_cost || 0 }, { label:\"Appraisal\", value:data.appraisal_cost || 0 }, { label:\"Internal\", value:data.internal_failure_cost || 0 }, { label:\"External\", value:data.external_failure_cost || 0 }] };'),
  dataKey: 'breakdown',
  labelKey: 'label',
  valueKey: 'value'
});

BLOCK_TEMPLATES['tpl-report-trend-chart'] = _tplMeta('chart-line', 'Xu hướng KPI theo tháng', 'Monthly KPI Trend', 'Xu hướng KPI theo tháng phục vụ báo cáo chất lượng và tuân thủ.', 'reports', {
  dataSource: _tplSource('exception_dashboard', 'GET', 'trend_monthly'),
  dataKey: 'trend_monthly',
  chart: {
    xField: 'period',
    yField: 'value',
    smooth: true,
    showGrid: true,
    showLegend: true,
    series: [
      { field:'value', label:_tplLabel('Giá trị thực tế', 'Actual'), type:'line', color:'#2563eb' },
      { field:'target', label:_tplLabel('Mục tiêu', 'Target'), type:'line', color:'#f59e0b' }
    ]
  }
});

BLOCK_TEMPLATES['tpl-report-matrix'] = _tplMeta('matrix-grid', 'Ma trận lỗi theo bộ phận', 'Defect Matrix', 'Ma trận defect theo bộ phận và loại ngoại lệ để phân tích chéo.', 'reports', {
  dataSource: _tplSource('exception_list', 'GET', 'exceptions', 'total'),
  dataKey: 'exceptions',
  matrix: {
    rowField: 'department',
    columnField: 'type',
    valueField: 'exception_id',
    aggregate: 'count',
    showTotals: true
  }
});

BLOCK_TEMPLATES['tpl-report-export-toolbar'] = _tplMeta('action-toolbar', 'Thanh công cụ xuất báo cáo', 'Report Export Toolbar', 'Thanh công cụ xuất PDF, Excel và lịch gửi email báo cáo định kỳ.', 'reports', {
  dataSource: _tplSource('compliance_report_history', 'GET'),
  buttons: [
    _tplBtn('Xuất PDF', 'Export PDF', 'primary', 'export-pdf', '📄'),
    _tplBtn('Xuất Excel', 'Export Excel', 'secondary', 'export-excel', '📊'),
    _tplBtn('Lịch gửi email', 'Schedule Email', 'secondary', 'schedule-email', '✉️')
  ]
});

BLOCK_TEMPLATES['tpl-doc-registry-table'] = _tplMeta('data-table', 'Bảng đăng ký tài liệu', 'Document Registry Table', 'Danh mục tài liệu kiểm soát với revision, trạng thái và hiệu lực.', 'documents', {
  dataSource: _tplSource('docs_custom_list', 'GET', 'docs', 'total'),
  dataKey: 'docs',
  pageSize: 20,
  rowKey: 'doc_id',
  columns: [
    _tplCol('doc_id', 'Mã tài liệu', 'Document ID', 'string', '150', true, true),
    _tplCol('title', 'Tiêu đề', 'Title', 'string', '260', true, true),
    _tplCol('revision', 'Phiên bản', 'Revision', 'string', '90', true, true),
    _tplCol('status', 'Trạng thái', 'Status', 'badge', '120', true, true, 'doc_status'),
    _tplCol('effective_date', 'Ngày hiệu lực', 'Effective Date', 'date', '130', true, false),
    _tplCol('author', 'Người soạn', 'Author', 'string', '150', true, true)
  ]
});

BLOCK_TEMPLATES['tpl-doc-create-form'] = _tplMeta('form-wizard', 'Wizard tạo tài liệu', 'Document Create Wizard', 'Wizard 3 bước để tạo tài liệu, nhập nội dung và chọn tuyến phê duyệt.', 'documents', {
  dataSource: _tplSource('doc_create', 'POST'),
  wizard: {
    showProgress: true,
    allowSkip: false,
    summaryStepKey: 'approval',
    steps: [
      _tplStep('meta', 'Metadata', 'Metadata', 'doc_type,title,department,revision_number,effective_date'),
      _tplStep('content', 'Nội dung', 'Content', 'notes,doc_title,doc_title_vi,doc_category'),
      _tplStep('approval', 'Phê duyệt', 'Approval Route', 'author,department,rev')
    ],
    saveDraft: { api:'doc_save_draft', method:'POST' },
    submit: { api:'doc_submit_review', method:'POST' }
  }
});

BLOCK_TEMPLATES['tpl-doc-approval-flow'] = _tplMeta('action-status-flow', 'Luồng phê duyệt tài liệu', 'Document Approval Flow', 'Bộ chuyển trạng thái tài liệu từ draft tới approved và superseded.', 'documents', {
  dataSource: _tplSource('docs_custom_list', 'GET', 'docs', 'total'),
  workflow: {
    stateField: 'status',
    showHistory: true,
    escalationRole: 'qa_manager',
    transitions: [
      _tplTransition('draft', 'review', 'Gửi duyệt', 'Submit for Review', 'doc_submit_review', 'author', true, 'Gửi tài liệu sang bước review?'),
      _tplTransition('review', 'approved', 'Phê duyệt', 'Approve', 'doc_approve', 'approver', true, 'Phê duyệt tài liệu này?'),
      _tplTransition('review', 'draft', 'Trả về sửa', 'Return to Draft', 'doc_reject', 'approver', true, 'Trả tài liệu về draft để chỉnh sửa?'),
      _tplTransition('approved', 'superseded', 'Thay thế', 'Supersede', 'doc_update_meta', 'document_control', false, 'Đánh dấu tài liệu đã bị thay thế?')
    ]
  }
});

BLOCK_TEMPLATES['tpl-doc-related-list'] = _tplMeta('data-list', 'Danh sách phiên bản liên quan', 'Related Document Versions', 'Danh sách phiên bản tài liệu liên quan với thay đổi revision và workflow status.', 'documents', {
  dataSource: _tplSource('doc_versions_list', 'GET'),
  dataKey: 'items',
  titleKey: 'doc_id',
  subtitleKey: 'revision',
  badgeKey: 'workflow_status',
  bodyKeys: ['author', 'created_at', 'change_description']
});

BLOCK_TEMPLATES['tpl-doc-dashboard-kpi'] = _tplMeta('kpi-row', 'Dashboard KPI tài liệu', 'Document Dashboard KPIs', 'KPI tài liệu kiểm soát được tính từ registry tài liệu hiện hành.', 'documents', {
  dataSource: _tplSource('docs_custom_list', 'GET', '', '', 'var rows = data.docs || data.items || []; var approved = 0; var review = 0; rows.forEach(function(row){ if(row.status === "approved") approved += 1; if(row.status === "review") review += 1; }); return { total_docs:rows.length, pending_review:review, controlled_pct:(rows.length ? Math.round((approved / rows.length) * 100) : 0), overdue_review:rows.filter(function(row){ return row.status === "review"; }).length };'),
  items: [
    _tplKpi('total_docs', 'Tổng tài liệu', 'Total Documents', 'var(--brand-2)'),
    _tplKpi('pending_review', 'Chờ review', 'Pending Review', 'var(--amber)'),
    _tplKpi('overdue_review', 'Review quá hạn', 'Overdue Review', 'var(--red)'),
    _tplKpi('controlled_pct', 'Tỷ lệ kiểm soát', 'Controlled Percentage', 'var(--green)', '%')
  ]
});

BLOCK_TEMPLATES['tpl-admin-user-table'] = _tplMeta('data-table', 'Bảng người dùng hệ thống', 'System User Table', 'Danh sách người dùng hệ thống với vai trò, trạng thái và lần đăng nhập gần nhất.', 'admin', {
  dataSource: _tplSource('admin_users_list', 'GET'),
  pageSize: 20,
  rowKey: 'user_id',
  columns: [
    _tplCol('username', 'Tên đăng nhập', 'Username', 'string', '140', true, true),
    _tplCol('full_name', 'Họ và tên', 'Full Name', 'string', '200', true, true),
    _tplCol('email', 'Email', 'Email', 'string', '220', true, true),
    _tplCol('role', 'Vai trò', 'Role', 'badge', '130', true, true),
    _tplCol('is_active', 'Kích hoạt', 'Active', 'badge', '110', true, true),
    _tplCol('last_login', 'Đăng nhập cuối', 'Last Login', 'datetime', '160', true, false)
  ]
});

BLOCK_TEMPLATES['tpl-admin-role-matrix'] = _tplMeta('matrix-grid', 'Ma trận role / permission', 'Role Permission Matrix', 'Ma trận quyền theo role và tập permission đang khai báo trong hệ thống.', 'admin', {
  dataSource: _tplSource('role_perms_get', 'GET', 'items', '', 'var rows = data.items || []; if(!rows.length && data.role){ rows = [data]; } return { items:rows };'),
  dataKey: 'items',
  matrix: {
    rowField: 'role',
    columnField: 'permissions',
    valueField: 'permissions',
    aggregate: 'count',
    showTotals: true
  }
});

BLOCK_TEMPLATES['tpl-admin-audit-trail'] = _tplMeta('audit-log', 'Audit trail hệ thống', 'System Audit Trail', 'Audit trail thay đổi master data và thao tác hệ thống.', 'admin', {
  dataSource: _tplSource('master_data_history', 'GET'),
  dateKey: 'created_at',
  titleKey: 'field',
  descKey: 'new_value',
  statusKey: 'entity_type'
});

BLOCK_TEMPLATES['tpl-admin-integration-status'] = _tplMeta('mfg-machine-status', 'Trạng thái tích hợp', 'Integration Status Board', 'Theo dõi trạng thái các thiết bị đồng bộ và mức tồn đọng đồng bộ.', 'admin', {
  dataSource: _tplSource('mobile_sync_status', 'GET'),
  machine: {
    assetField: 'device_id',
    lineField: 'device_id',
    statusField: 'pending_count',
    reasonField: 'conflict_count',
    updatedAtField: 'last_sync',
    showDowntime: true,
    showCounters: true
  }
});

BLOCK_TEMPLATES['tpl-admin-system-kpi'] = _tplMeta('kpi-row', 'Dashboard KPI quản trị', 'Admin KPI Dashboard', 'KPI quản trị được tổng hợp từ người dùng hệ thống và mức bao phủ kích hoạt.', 'admin', {
  dataSource: _tplSource('admin_users_list', 'GET', '', '', 'var rows = data.items || data.users || data; rows = Array.isArray(rows) ? rows : []; var active = rows.filter(function(row){ return !!row.is_active; }).length; var mfa = rows.filter(function(row){ return !!row.mfa_enabled; }).length; var logged = rows.filter(function(row){ return !!row.last_login; }).length; var roles = {}; rows.forEach(function(row){ roles[row.role || ""] = true; }); return { active_users:active, mfa_enabled:mfa, recent_logins:logged, role_count:Object.keys(roles).filter(function(key){ return !!key; }).length };'),
  items: [
    _tplKpi('active_users', 'Người dùng kích hoạt', 'Active Users', 'var(--brand-2)'),
    _tplKpi('mfa_enabled', 'Đã bật MFA', 'MFA Enabled', 'var(--green)'),
    _tplKpi('recent_logins', 'Có đăng nhập gần đây', 'Recent Logins', 'var(--amber)'),
    _tplKpi('role_count', 'Số role', 'Role Count', 'var(--brand-1)')
  ]
});

function renderTwoColumn(block, data, state){
  var config = block.config || {};
  var ratio = config.ratio || '50-50';
  var parts = ratio.split('-');
  var leftPct = parseInt(parts[0],10) || 50;
  var rightPct = parseInt(parts[1],10) || 50;

  var slots = block.slots || {};
  var leftBlocks = slots.left || [];
  var rightBlocks = slots.right || [];

  var html = '<div class="hm-two-col" style="display:grid;grid-template-columns:'+leftPct+'fr '+rightPct+'fr;gap:var(--space-4)">';

  // Left slot
  html += '<div class="hm-slot hm-slot-left">';
  leftBlocks.forEach(function(childBlock){
    html += renderBlock(childBlock, state.blockData[childBlock.id]||{}, state);
  });
  if(state.editMode && !leftBlocks.length){
    html += '<div class="hm-slot-empty">'+_t('Keo block vao day','Drop block here')+'</div>';
  }
  html += '</div>';

  // Right slot
  html += '<div class="hm-slot hm-slot-right">';
  rightBlocks.forEach(function(childBlock){
    html += renderBlock(childBlock, state.blockData[childBlock.id]||{}, state);
  });
  if(state.editMode && !rightBlocks.length){
    html += '<div class="hm-slot-empty">'+_t('Keo block vao day','Drop block here')+'</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

function _getRuntimeLayoutStyle(layout){
  var actual = layout || {};
  var gap = actual.gap || '16px';
  var style = 'gap:' + gap + ';';
  if(actual.type === 'grid'){
    style += 'display:grid;grid-template-columns:repeat(' + Math.max(1, Math.min(6, parseInt(actual.columns, 10) || 1)) + ',minmax(0,1fr));';
  } else if(actual.type === 'flex'){
    style += 'display:flex;flex-wrap:wrap;align-items:' + (actual.align || 'stretch') + ';';
  } else {
    style += 'display:flex;flex-direction:column;';
  }
  return style;
}

/**
 * Render a card container with a single content slot.
 */
function renderCardContainer(block, data, state){
  var slots = block.slots || {};
  var children = slots.content || [];

  var html = '<div class="hm-card-container" style="' + _getRuntimeLayoutStyle(block.layout || {}) + '">';
  children.forEach(function(childBlock){
    html += renderBlock(childBlock, state.blockData[childBlock.id]||{}, state);
  });
  if(state.editMode && !children.length){
    html += '<div class="hm-slot-empty">'+_t('Keo block vao day','Drop block here')+'</div>';
  }
  html += '</div>';
  return html;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 11 — KEYBOARD SHORTCUTS
   ══════════════════════════════════════════════════════════════════════════ */

var _currentModuleId = null;
var _currentContainer = null;

var SHORTCUTS = {
  'ctrl+z': function(){ if(_currentModuleId){ undo(_currentModuleId); _rerender(); } },
  'ctrl+shift+z': function(){ if(_currentModuleId){ redo(_currentModuleId); _rerender(); } },
  'ctrl+y': function(){ if(_currentModuleId){ redo(_currentModuleId); _rerender(); } },
  'ctrl+e': function(){ if(_currentModuleId){ toggleEditMode(_currentModuleId); _rerender(); } },
  'ctrl+s': function(){ if(_currentModuleId){ var ms = getModuleState(_currentModuleId); saveModuleSchema(_currentModuleId, ms._schema); } },
  'ctrl+b': function(){ showBlockLibrary(); },
  'escape': function(){ if(_currentModuleId){ var ms = getModuleState(_currentModuleId); if(ms.editMode){ toggleEditMode(_currentModuleId); _rerender(); } } },
};

function _rerender(){
  if(_currentModuleId && _currentContainer){
    var ms = getModuleState(_currentModuleId);
    if(ms._schema) renderModuleFromSchema(_currentContainer, ms._schema);
  }
}

var _shortcutsInitialized = false;
function _initKeyboardShortcuts(){
  if(_shortcutsInitialized) return;
  _shortcutsInitialized = true;

  document.addEventListener('keydown', function(e){
    // Only active in edit mode (except ctrl+e which toggles)
    var ms = _currentModuleId ? getModuleState(_currentModuleId) : null;
    var inEdit = ms && ms.editMode;

    // Build key combo string
    var parts = [];
    if(e.ctrlKey || e.metaKey) parts.push('ctrl');
    if(e.shiftKey) parts.push('shift');
    if(e.altKey) parts.push('alt');
    var key = e.key.toLowerCase();
    if(key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta'){
      parts.push(key);
    }
    var combo = parts.join('+');

    // Check if this combo is registered
    var handler = SHORTCUTS[combo];
    if(handler){
      // ctrl+e works always; others only in edit mode
      if(combo === 'ctrl+e' || inEdit){
        e.preventDefault();
        e.stopPropagation();
        handler();
      }
    }
  });
}


/* ── Runtime State Management ────────────────────────────────────────── */
var _moduleStates = {};

BLOCK_TEMPLATES['tpl-quote-quick-create-modal'] = _tplMeta('form-modal', 'Modal tạo báo giá nhanh', 'Quick Quote Modal', 'Biểu mẫu modal tạo nhanh báo giá hoặc yêu cầu báo giá ngay trong dashboard.', 'quoting', {
  modal: {
    trigger: { label:{ vi:'Tạo báo giá nhanh', en:'Quick quote' }, icon:'+', style:'primary' },
    title: { vi:'Tạo báo giá nhanh', en:'Create quick quote' },
    size: 'lg',
    closeOnOverlay: true,
    closeOnSubmit: true
  },
  fields: [
    _tplField('customer_name', 'Khách hàng', 'Customer', 'string', true, 'half'),
    _tplField('requested_date', 'Ngày yêu cầu', 'Requested date', 'date', true, 'half'),
    _tplField('currency_code', 'Tiền tệ', 'Currency', 'string', true, 'half'),
    _tplField('total_order_value', 'Giá trị dự kiến', 'Estimated value', 'currency', false, 'half'),
    _tplField('notes', 'Ghi chú', 'Notes', 'textarea', false, 'full')
  ],
  submit: { api:'quote_create', method:'POST' }
});

BLOCK_TEMPLATES['tpl-order-record-detail'] = _tplMeta('data-detail', 'Chi tiết Sales Order', 'Sales Order Detail', 'Khối chi tiết đơn hàng với trạng thái, khách hàng và các trường điều hành chính.', 'orders', {
  dataSource: _tplSource('order_so_detail', 'GET', 'sales_order'),
  layout: '2-column',
  editable: true,
  fields: [
    { key:'so_number', label:{ vi:'Số SO', en:'SO Number' }, type:'text', span:'half' },
    { key:'customer_name', label:{ vi:'Khách hàng', en:'Customer' }, type:'text', span:'half' },
    { key:'status', label:{ vi:'Trạng thái', en:'Status' }, type:'badge', span:'third' },
    { key:'order_date', label:{ vi:'Ngày đặt', en:'Order date' }, type:'date', span:'third' },
    { key:'due_date', label:{ vi:'Hạn giao', en:'Due date' }, type:'date', span:'third' },
    { key:'total_value', label:{ vi:'Tổng giá trị', en:'Total value' }, type:'currency', span:'half' },
    { key:'priority', label:{ vi:'Ưu tiên', en:'Priority' }, type:'badge', span:'half' },
    { key:'notes', label:{ vi:'Ghi chú', en:'Notes' }, type:'textarea', span:'full' }
  ]
});

function getModuleState(moduleId){
  if(!_moduleStates[moduleId]){
    _moduleStates[moduleId] = {
      activeTab: null,
      blockData: {},
      renderedRows: {},
      activeRows: {},
      activeRowIndex: {},
      tableStates: {},
      editMode: false,
      selectedBlock: null,
      loading: {},
      filterValues: {},
      customState: {},
      navParams: {},
      inlineEdits: {},
      formDrafts: {},
      formErrors: {},
      selectedRows: {},
      expandedRows: {},
      columnVisibility: {},
      chartStates: {},
      wizardStates: {},
      modalStates: {},
      detailStates: {},
      checksheetStates: {},
      machineTimers: {},
    };
  }
  return _moduleStates[moduleId];
}

function _safeBlockBindingKey(value){
  var text = String(value == null ? '' : value).replace(/[^A-Za-z0-9_]/g, '_');
  if(!text) return 'block_ref';
  if(/^[0-9]/.test(text)) text = 'block_' + text;
  return text;
}

function _readSelectedRows(ms, blockId){
  var rows = ms.renderedRows[blockId] || [];
  var selected = [];
  var map = ms.selectedRows[blockId] || {};
  Object.keys(map).forEach(function(idx){
    var absIdx = parseInt(idx, 10);
    if(map[idx] && rows[absIdx]) selected.push(rows[absIdx]);
  });
  return selected;
}

/* ── Data Fetching per Block ─────────────────────────────────────────── */
var _fetchCache = {};  // key = action+JSON(params) -> { promise, ts }
var CACHE_TTL = 60000; // 60 s

function fetchBlockData(block, moduleId){
  var ds = block.config && block.config.dataSource;
  var params = ds ? (ds.params || {}) : {};
  var context;
  var cacheKey;
  var cached;
  var p;
  if(!ds || !ds.api) return Promise.resolve(null);

  if(moduleId){
    context = _buildReactiveContext(moduleId);
    context._moduleId = moduleId;
    context.block = block || {};
    context.data = getModuleState(moduleId).blockData[block.id || block.blockId] || {};
    try { params = _resolveBindings(params, context); } catch(err){ params = ds.params || {}; }
  }

  cacheKey = ds.api + '|' + JSON.stringify(params||{});
  cached = _fetchCache[cacheKey];
  if(cached && (Date.now()-cached.ts) < CACHE_TTL) return cached.promise;

  p = _api(ds.api, params||{}, ds.method||'GET').then(function(resp){
    if(!resp) return null;
    if(ds.dataKey){
      var extracted = _readDataPath(resp, ds.dataKey);
      return extracted !== undefined ? extracted : resp.data;
    }
    return resp.data || resp;
  }).catch(function(err){
    console.warn('[BlockEngine] fetch failed:', ds.api, err);
    return null;
  });

  _fetchCache[cacheKey] = { promise:p, ts:Date.now() };
  return p;
}

function invalidateCache(action){
  Object.keys(_fetchCache).forEach(function(k){
    if(!action || k.indexOf(action)===0) delete _fetchCache[k];
  });
}

/* ── Module Schema CRUD ──────────────────────────────────────────────── */

function loadModuleSchema(moduleId){
  // Try API first
  return _api('module_schema_get', {id:moduleId}, 'GET').then(function(resp){
    if(resp && resp.schema) return resp.schema;
    // Fallback to localStorage
    return _loadSchemaLocal(moduleId);
  }).catch(function(){
    return _loadSchemaLocal(moduleId);
  });
}

function _schemaStorageKeys(moduleId){
  return ['hm_module_schema_'+moduleId, 'hm_schema_'+moduleId];
}

function _loadSchemaLocal(moduleId){
  try{
    var keys = _schemaStorageKeys(moduleId);
    var raw = null;
    var i;
    for(i = 0; i < keys.length; i++){
      raw = localStorage.getItem(keys[i]);
      if(raw) return JSON.parse(raw);
    }
  }catch(e){ return null; }
  return null;
}

function _writeSchemaLocal(moduleId, schema){
  try{
    _schemaStorageKeys(moduleId).forEach(function(key){
      localStorage.setItem(key, JSON.stringify(schema));
    });
  }catch(e){}
}

function _clearSchemaLocal(moduleId){
  try{
    _schemaStorageKeys(moduleId).forEach(function(key){
      localStorage.removeItem(key);
    });
  }catch(e){}
}

function _legacySaveModuleSchemaRaw(moduleId, schema){
  // Save to localStorage first (backup)
  try{ localStorage.setItem('hm_schema_'+moduleId, JSON.stringify(schema)); }catch(e){}
  // Then persist via API
  return _api('module_schema_save', { moduleId:moduleId, schema:schema }, 'POST').then(function(resp){
    toast(_t('Đã lưu thành công','Saved successfully'), 'success');
    return resp;
  }).catch(function(err){
    toast(_t('Lưu thất bại, đã lưu cục bộ','Save failed, saved locally'), 'warning');
    return { ok:false, local:true };
  });
}

function _legacyResetModuleSchemaRaw(moduleId){
  try{ localStorage.removeItem('hm_schema_'+moduleId); }catch(e){}
  return _api('module_schema_reset', { moduleId:moduleId }, 'POST').then(function(resp){
    toast(_t('Đã khôi phục mặc định','Reset to defaults'), 'success');
    return resp;
  }).catch(function(){ return { ok:false }; });
}

function saveModuleSchema(moduleId, schema){
  var savedSchema = _clone(schema || {});
  var nowIso = new Date().toISOString();
  savedSchema.moduleId = savedSchema.moduleId || moduleId;
  if(!savedSchema.updatedAt) savedSchema.updatedAt = nowIso;
  _writeSchemaLocal(moduleId, savedSchema);
  if(window.HmModuleRouter && typeof window.HmModuleRouter.clearCache === 'function'){
    window.HmModuleRouter.clearCache(moduleId);
  }
  return _api('module_schema_save', { moduleId:moduleId, schema:savedSchema }, 'POST').then(function(resp){
    if(!resp || resp.ok === false || resp.saved === false){
      throw new Error((resp && (resp.detail || resp.error)) || 'save_failed');
    }
    savedSchema.version = resp.version != null ? resp.version : ((savedSchema.version || 0) + 1);
    savedSchema.updatedAt = resp.updatedAt || savedSchema.updatedAt || nowIso;
    if(resp.updatedBy) savedSchema.updatedBy = resp.updatedBy;
    _writeSchemaLocal(moduleId, savedSchema);
    if(window.HmModuleRouter && typeof window.HmModuleRouter.clearCache === 'function'){
      window.HmModuleRouter.clearCache(moduleId);
    }
    toast(_t('Đã lưu thành công','Saved successfully'), 'success');
    return { ok:true, saved:true, version:savedSchema.version, updatedAt:savedSchema.updatedAt, updatedBy:savedSchema.updatedBy || '', schema:savedSchema };
  }).catch(function(err){
    toast(_t('Lưu thất bại, đã lưu cục bộ','Save failed, saved locally'), 'warning');
    return { ok:false, local:true, error: err && err.message ? err.message : '', schema:savedSchema };
  });
}

function _legacyResetModuleSchema(moduleId){
  _clearSchemaLocal(moduleId);
  return _api('module_schema_reset', { moduleId:moduleId }, 'POST').then(function(resp){
    toast(_t('Đã khôi phục mặc định','Reset to defaults'), 'success');
    return resp;
  }).catch(function(){ return { ok:false }; });
}

function resetModuleSchema(moduleId){
  _clearSchemaLocal(moduleId);
  if(window.HmModuleRouter && typeof window.HmModuleRouter.clearCache === 'function'){
    window.HmModuleRouter.clearCache(moduleId);
  }
  return _api('module_schema_reset', { moduleId:moduleId }, 'POST').then(function(resp){
    if(window.HmModuleRouter && typeof window.HmModuleRouter.clearCache === 'function'){
      window.HmModuleRouter.clearCache(moduleId);
    }
    toast(_t('Reset ve mac dinh','Reset to defaults'), 'success');
    return resp;
  }).catch(function(){ return { ok:false }; });
}

function createNewModule(config){
  var id = config.id || ('mod-'+_uid());
  var schema = {
    moduleId: id,
    title: config.title || { vi:'Module mới', en:'New Module' },
    icon: config.icon || '\u{1F4E6}',
    route: config.route || id,
    roles: config.roles || ['admin'],
    tabs: [{
      tabId: 'main',
      title: { vi:'Chính', en:'Main' },
      blocks: []
    }]
  };
  return saveModuleSchema(id, schema).then(function(){ return schema; });
}

/* ── User Override Persistence ────────────────────────────────────────── */

function _loadUserOverrides(moduleId){
  try{
    var raw = localStorage.getItem('hesem_layout_'+moduleId);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function _saveUserOverrides(moduleId, overrides){
  try{ localStorage.setItem('hesem_layout_'+moduleId, JSON.stringify(overrides)); }catch(e){}
}

/* ── Module Schema Renderer ──────────────────────────────────────────── */

function renderModuleFromSchema(container, schema, options){
  if(!container || !schema) return;
  options = options || {};
  var moduleId = schema.moduleId;
  var state = getModuleState(moduleId);
  state._schema = schema;
  container.setAttribute('data-module', moduleId);

  // Track current module for keyboard shortcuts
  _currentModuleId = moduleId;
  _currentContainer = container;
  _initKeyboardShortcuts();

  // Build reactive context
  var reactiveCtx = _buildReactiveContext(moduleId);

  // Default to first tab
  if(!state.activeTab && schema.tabs && schema.tabs.length){
    state.activeTab = schema.tabs[0].tabId;
  }

  // Apply user overrides to tab/block ordering
  var renderSchema = _applyOverrides(moduleId, schema);

  var html = '';
  // Page header
  html += '<div class="hm-page-header">';
  html += '<h1 class="hm-page-title">';
  if(schema.icon) html += '<span class="hm-page-icon">'+schema.icon+'</span> ';
  var titleText = schema.title;
  if(typeof titleText === 'object') titleText = _t(titleText.vi||'', titleText.en||'');
  html += _esc(resolveBindings(String(titleText), reactiveCtx));
  html += '</h1>';
  // Edit mode toggle + undo/redo controls
  html += '<div class="hm-page-actions">';
  if(state.editMode){
    html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-undo" data-module="'+_esc(moduleId)+'" title="Ctrl+Z">&#8630; '+_t('Hoàn tác','Undo')+'</button>';
    html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-redo" data-module="'+_esc(moduleId)+'" title="Ctrl+Shift+Z">&#8631; '+_t('Làm lại','Redo')+'</button>';
    html += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="hm-save-schema" data-module="'+_esc(moduleId)+'" title="Ctrl+S">'+_t('Lưu','Save')+'</button>';
  }
  html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-toggle-edit" data-module="'+_esc(moduleId)+'">';
  html += state.editMode ? _t('Thoát chỉnh sửa','Exit Edit') : _t('Tùy chỉnh','Customize');
  html += '</button>';
  html += '</div></div>';

  // Tab bar
  if(renderSchema.tabs && renderSchema.tabs.length > 1){
    html += '<div class="hm-tab-bar" data-module="'+_esc(moduleId)+'">';
    renderSchema.tabs.forEach(function(tab){
      var active = tab.tabId === state.activeTab;
      html += '<button class="hm-tab'+(active?' hm-tab-active':'')+'" data-action="hm-switch-tab" data-tab="'+_esc(tab.tabId)+'" data-module="'+_esc(moduleId)+'">';
      html += _esc(_t(tab.title.vi||tab.tabId, tab.title.en||tab.tabId));
      html += '</button>';
    });
    html += '</div>';
  }

  // Active tab blocks
  var activeTab = renderSchema.tabs.find(function(t){ return t.tabId===state.activeTab; });
  if(activeTab){
    html += '<div class="hm-blocks-container" data-module="'+_esc(moduleId)+'" data-tab="'+_esc(activeTab.tabId)+'" style="'+_getRuntimeLayoutStyle(activeTab.layout || {})+'">';

    // Add-block button at top (edit mode)
    if(state.editMode){
      html += _renderAddBlockBtn(moduleId, activeTab.tabId, null);
    }

    activeTab.blocks.forEach(function(block){
      // Conditional visibility check
      var visible = isBlockVisible(block, reactiveCtx);
      if(!state.editMode && !visible) return;

      var blockClasses = getBlockClasses(block);
      if(!visible) blockClasses += ' hm-block-hidden';

      html += _renderBlockWrapper(block, state.blockData[block.id]||{}, state, blockClasses, reactiveCtx);
      if(state.editMode){
        html += _renderAddBlockBtn(moduleId, activeTab.tabId, block.id);
      }
    });

    html += '</div>';
  }

  // Properties panel (edit mode + selected block)
  if(state.editMode && state.selectedBlock){
    html += renderPropertiesPanel(state.selectedBlock, moduleId);
  }

  container.innerHTML = html;

  // Attach event delegation
  _attachModuleEvents(container, moduleId);
  _initRuntimeBlocks(container, moduleId);

  // Initialize drag-drop in edit mode
  if(state.editMode && activeTab){
    initDragDrop(
      container.querySelector('.hm-blocks-container'),
      moduleId,
      activeTab.tabId
    );
  }

  // Fetch data for blocks with data sources
  if(activeTab){
    var depGraph = buildDependencyGraph(schema);

    activeTab.blocks.forEach(function(block){
      if(block.config && block.config.dataSource){
        state.loading[block.id] = true;
        _showBlockLoading(container, block.id);
        fetchBlockData(block, moduleId).then(function(data){
          state.loading[block.id] = false;
          state.blockData[block.id] = data;
          _rerenderBlockContent(container, block, data, state);

          // Fire onLoad event if defined
          if(block.events && block.events.onLoad){
            var ctx = _buildReactiveContext(moduleId);
            ctx._moduleId = moduleId;
            ctx._container = container;
            _fireBlockEvent(block, 'onLoad', ctx);
          }

          // Auto-refresh dependents
          refreshDependents(moduleId, block.id);
        });
      }

      // Fetch data for slot children too
      if(block.slots){
        Object.keys(block.slots).forEach(function(slotKey){
          (block.slots[slotKey]||[]).forEach(function(child){
            if(child.config && child.config.dataSource){
              state.loading[child.id] = true;
              fetchBlockData(child, moduleId).then(function(data){
                state.loading[child.id] = false;
                state.blockData[child.id] = data;
              });
            }
          });
        });
      }
    });
  }
}

/**
 * Render a block wrapper with classes, toolbar, and content.
 */
function _renderBlockWrapper(block, data, state, blockClasses, reactiveCtx){
  var editMode = state && state.editMode;
  var titleCtx = reactiveCtx;

  var html = '<div class="'+blockClasses+'" data-block-id="'+_esc(block.id)+'" data-block-type="'+_esc(block.type)+'">';

  // Edit mode toolbar
  if(editMode){
    html += '<div class="hm-block-toolbar">';
    html += '<button class="hm-block-btn" data-action="hm-move-up" data-block-id="'+_esc(block.id)+'" title="'+_t('Di len','Move up')+'">&#9650;</button>';
    html += '<button class="hm-block-btn" data-action="hm-move-down" data-block-id="'+_esc(block.id)+'" title="'+_t('Di xuong','Move down')+'">&#9660;</button>';
    html += '<button class="hm-block-btn" data-action="hm-toggle-block" data-block-id="'+_esc(block.id)+'" title="'+_t('An/hien','Toggle')+'">'+(block.visible===false?'\u{1F441}\u200D\u{1F5E8}':'\u{1F441}')+'</button>';
    html += '<button class="hm-block-btn" data-action="hm-select-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Cấu hình','Config')+'">&#9881;</button>';
    html += '<button class="hm-block-btn" data-action="hm-duplicate-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Nhan ban','Duplicate')+'">&#128203;</button>';
    html += '<button class="hm-block-btn hm-block-btn-danger" data-action="hm-delete-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Xoa','Delete')+'">&#128465;</button>';
    html += '</div>';
  }

  // Block header (with binding resolution)
  if(block.title){
    var titleVi = block.title.vi || block.title;
    var titleEn = block.title.en || block.title;
    if(reactiveCtx){
      titleCtx = {};
      Object.keys(reactiveCtx).forEach(function(key){
        titleCtx[key] = reactiveCtx[key];
      });
      titleCtx.data = data || {};
      titleCtx.record = data || {};
      titleCtx.block = block || {};
      titleCtx.module = (state && state._schema) ? state._schema : (reactiveCtx.module || {});
      titleCtx.user = reactiveCtx.user || reactiveCtx.currentUser || {};
      titleCtx.currentUser = titleCtx.user;
      titleVi = _evalExpr(String(titleVi), titleCtx);
      titleEn = _evalExpr(String(titleEn), titleCtx);
    }
    html += '<div class="hm-block-header">';
    html += '<span class="hm-block-title">'+_esc(_t(titleVi, titleEn))+'</span>';
    html += '</div>';
  }

  // Block content
  html += '<div class="hm-block-content">';
  html += _renderBlockInner(block, data, state, reactiveCtx);
  html += '</div></div>';
  return html;
}

function _applyOverrides(moduleId, schema){
  var s = _clone(schema);
  var ov = _loadUserOverrides(moduleId);
  if(!ov) return s;

  // Tab ordering
  if(ov.tabOrder && Array.isArray(ov.tabOrder)){
    var ordered = [];
    ov.tabOrder.forEach(function(tid){
      var t = s.tabs.find(function(x){ return x.tabId===tid; });
      if(t) ordered.push(t);
    });
    s.tabs.forEach(function(t){
      if(!ordered.find(function(o){ return o.tabId===t.tabId; })) ordered.push(t);
    });
    s.tabs = ordered;
  }

  // Block visibility + ordering
  if(ov.hiddenBlocks || ov.blockOrder){
    s.tabs.forEach(function(tab){
      if(ov.hiddenBlocks){
        tab.blocks = tab.blocks.map(function(b){
          if(ov.hiddenBlocks.indexOf(b.id)>=0) b.visible = false;
          return b;
        });
      }
      if(ov.blockOrder && ov.blockOrder[tab.tabId]){
        var ob = [];
        ov.blockOrder[tab.tabId].forEach(function(bid){
          var bl = tab.blocks.find(function(b){ return b.id===bid; });
          if(bl) ob.push(bl);
        });
        tab.blocks.forEach(function(b){
          if(!ob.find(function(o){ return o.id===b.id; })) ob.push(b);
        });
        tab.blocks = ob;
      }
    });
  }
  return s;
}

function _showBlockLoading(container, blockId){
  var el = container.querySelector('[data-block-id="'+blockId+'"] .hm-block-content');
  if(el) el.innerHTML = '<div class="hm-skeleton"><div class="hm-skeleton-line"></div><div class="hm-skeleton-line hm-skeleton-short"></div><div class="hm-skeleton-line"></div></div>';
}

function _rerenderBlockContent(container, block, data, state){
  var el = container.querySelector('[data-block-id="'+block.id+'"] .hm-block-content');
  if(!el) return;
  var moduleId = state && state._schema ? state._schema.moduleId : '_';
  var reactiveCtx = _buildReactiveContext(moduleId);
  el.innerHTML = _renderBlockInner(block, data, state, reactiveCtx);
}

function _renderAddBlockBtn(moduleId, tabId, afterBlockId){
  return '<div class="hm-add-block-zone" data-action="hm-add-block" data-module="'+_esc(moduleId)+'" data-tab="'+_esc(tabId)+'" data-after="'+_esc(afterBlockId||'')+'">'
    + '<button class="hm-btn hm-btn-dashed hm-btn-sm">+ '+_t('Them block','Add block')+'</button></div>';
}

/* ── Event Delegation ────────────────────────────────────────────────── */

function _attachModuleEvents(container, moduleId){
  // Remove previous listener to avoid duplicates
  container.removeEventListener('click', container._hmClick);
  container._hmClick = function(e){
    var btn = e.target.closest('[data-action]');
    var rowEl;
    if(!btn){
      rowEl = e.target.closest('.hm-table-row[data-row-abs]');
      if(rowEl && !e.target.closest('input,button,select,textarea,a,label')){
        _activateTableRow(container, moduleId, rowEl);
      }
      return;
    }
    var action = btn.getAttribute('data-action');
    var state = getModuleState(moduleId);
    rowEl = btn.closest('.hm-table-row[data-row-abs]');
    if(rowEl && btn === rowEl){
      _activateTableRow(container, moduleId, rowEl);
      if(action === 'hm-table-row-click'){
        var rowBlockId = rowEl.getAttribute('data-block-id');
        var rowBlock = _findBlockById(state._schema, rowBlockId);
        var rowData = rowBlockId ? state.activeRows[rowBlockId] : null;
        if(rowBlock && rowBlock.config && rowBlock.config.rowClick && rowData){
          var rowClick = rowBlock.config.rowClick || {};
          state.customState = state.customState || {};
          if(rowClick.passField && rowData[rowClick.passField] !== undefined){
            state.customState[rowClick.stateKey || 'selectedId'] = rowData[rowClick.passField];
          }
          if(rowClick.stateMap && typeof rowClick.stateMap === 'object'){
            Object.keys(rowClick.stateMap).forEach(function(stateKey){
              var rowField = rowClick.stateMap[stateKey];
              if(typeof rowField !== 'string' || rowField === '') return;
              if(rowData[rowField] !== undefined){
                state.customState[stateKey] = rowData[rowField];
              }
            });
          }
          if(rowClick.action === 'navigate-tab' && rowClick.tab){
            state.activeTab = rowClick.tab;
            renderModuleFromSchema(container, state._schema);
            return;
          }
        }
        return;
      }
    }

    switch(action){
      case 'hm-toggle-edit':
        toggleEditMode(moduleId);
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-switch-tab':
        state.activeTab = btn.getAttribute('data-tab');
        renderModuleFromSchema(container, state._schema);
        break;
      case 'navigate-tab':
        state.activeTab = btn.getAttribute('data-tab') || state.activeTab;
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-add-block':
        var tabId = btn.getAttribute('data-tab') || btn.closest('[data-tab]').getAttribute('data-tab');
        var after = btn.getAttribute('data-after') || btn.closest('[data-after]') && btn.closest('[data-after]').getAttribute('data-after') || '';
        showBlockLibrary(function(blockType){
          pushUndo(moduleId, 'add-block', state._schema);
          addBlock(moduleId, tabId, after||null, blockType);
          renderModuleFromSchema(container, state._schema);
        });
        break;
      case 'hm-move-up':
        pushUndo(moduleId, 'move-up', state._schema);
        moveBlockUp(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-move-down':
        pushUndo(moduleId, 'move-down', state._schema);
        moveBlockDown(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-toggle-block':
        pushUndo(moduleId, 'toggle-visibility', state._schema);
        toggleBlockVisibility(moduleId, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-delete-block':
        if(confirm(_t('Xoa block nay?','Delete this block?'))){
          pushUndo(moduleId, 'delete-block', state._schema);
          deleteBlock(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
          renderModuleFromSchema(container, state._schema);
        }
        break;
      case 'hm-duplicate-block':
        pushUndo(moduleId, 'duplicate-block', state._schema);
        _duplicateBlock(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-select-block':
        state.selectedBlock = _findBlockById(state._schema, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-save-schema':
        saveModuleSchema(moduleId, state._schema).then(function(resp){
          if(resp && resp.schema){
            state._schema = resp.schema;
            pushSchemaVersion(moduleId, resp.schema);
            renderModuleFromSchema(container, resp.schema);
          }
        });
        break;
      case 'hm-undo':
        if(undo(moduleId)) renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-redo':
        if(redo(moduleId)) renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-table-sort':
        _handleTableSort(container, moduleId, btn);
        break;
      case 'hm-table-page':
        _handleTablePage(container, moduleId, btn);
        break;
      case 'hm-table-pagesize':
        _handleTablePageSize(container, moduleId, btn);
        break;
      case 'hm-table-select-row':
        _handleRowSelect(moduleId, btn);
        break;
      case 'hm-table-select-all':
        _handleSelectAll(moduleId, btn);
        break;
      case 'hm-table-expand-row':
        _handleRowExpand(container, moduleId, btn);
        break;
      case 'hm-table-col-toggle':
        _handleColumnToggle(container, moduleId, btn);
        break;
      case 'hm-table-export':
        _handleTableExport(moduleId, btn);
        break;
      case 'hm-chart-toggle-series':
        _handleChartSeriesToggle(container, moduleId, btn);
        break;
      case 'hm-chart-zoom':
        _handleChartZoom(container, moduleId, btn);
        break;
      case 'hm-chart-pan':
        _handleChartPan(container, moduleId, btn);
        break;
      case 'hm-chart-reset-view':
        _handleChartReset(container, moduleId, btn);
        break;
      case 'hm-checksheet-toggle':
        _handleChecksheetToggle(container, moduleId, btn);
        break;
      case 'hm-checksheet-increment':
        _handleChecksheetIncrement(container, moduleId, btn);
        break;
      case 'hm-checksheet-passfail':
        _handleChecksheetPassFail(container, moduleId, btn);
        break;
      case 'hm-gantt-zoom':
        _handleGanttZoom(container, moduleId, btn);
        break;
      case 'hm-detail-edit':
        _handleDetailEdit(container, moduleId, btn);
        break;
      case 'hm-wizard-prev':
        _handleWizardPrev(container, moduleId, btn);
        break;
      case 'hm-wizard-next':
        _handleWizardNext(container, moduleId, btn);
        break;
      case 'hm-wizard-submit':
        _handleWizardSubmit(container, moduleId, btn);
        break;
      case 'hm-modal-open':
        _handleModalOpen(container, moduleId, btn);
        break;
      case 'hm-modal-close':
        _handleModalClose(container, moduleId, btn);
        break;
      case 'hm-machine-card':
        _handleMachineCard(container, moduleId, btn);
        break;
      case 'hm-status-transition':
        _handleStatusTransition(container, moduleId, btn);
        break;
      case 'hm-add-from-template':
        var tplKey = btn.getAttribute('data-template');
        if(tplKey && BLOCK_TEMPLATES[tplKey]){
          pushUndo(moduleId, 'add-template', state._schema);
          _addBlockFromTemplate(moduleId, state.activeTab, null, tplKey);
          renderModuleFromSchema(container, state._schema);
        }
        break;
      case 'refresh':
        invalidateCache();
        renderModuleFromSchema(container, state._schema);
        break;
      default:
        // Check for block-level event handlers
        var blockEl = btn.closest('.hm-block[data-block-id]');
        if(blockEl){
          var blockId = blockEl.getAttribute('data-block-id');
          var block = _findBlockById(state._schema, blockId);
          if(block && block.events && block.events.onClick){
            var ctx = _buildReactiveContext(moduleId);
            ctx._moduleId = moduleId;
            ctx._container = container;
            // Pass row data if inside a table row
            var rowEl = btn.closest('[data-row-idx]');
            if(rowEl){
              ctx.rowIndex = parseInt(rowEl.getAttribute('data-row-idx'),10);
            }
            _fireBlockEvent(block, 'onClick', ctx);
          }
        }
        break;
    }
  };
  container.addEventListener('click', container._hmClick);

  // Double-click for inline editing
  container.removeEventListener('dblclick', container._hmDblClick);
  container._hmDblClick = function(e){
    var cell = e.target.closest('.hm-cell-editable');
    if(!cell) return;
    _startInlineEdit(container, moduleId, cell);
  };
  container.addEventListener('dblclick', container._hmDblClick);

  // Filter input events (debounced)
  container.removeEventListener('input', container._hmInput);
  container._hmInput = _debounce(function(e){
    var el = e.target;
    var formEl = el.form || el.closest('[data-hm-form-block]');
    if(formEl && formEl.getAttribute && formEl.getAttribute('data-hm-form-block')){
      _storeFormDraftFromElement(moduleId, formEl);
    }
    if(el.hasAttribute('data-filter')){
      var blockEl = el.closest('.hm-block');
      if(blockEl) _handleFilterChange(container, moduleId, blockEl.getAttribute('data-block-id'));
    }
    if(el.hasAttribute('data-table-filter')){
      var blockEl2 = el.closest('.hm-block');
      if(blockEl2) _handleColumnFilter(container, moduleId, blockEl2.getAttribute('data-block-id'));
    }
  }, 300);
  container.addEventListener('input', container._hmInput);

  // Change events for select-based page size
  container.removeEventListener('change', container._hmChange);
  container._hmChange = function(e){
    var el = e.target;
    var formEl = el.form || el.closest('[data-hm-form-block]');
    if(formEl && formEl.getAttribute && formEl.getAttribute('data-hm-form-block')){
      _storeFormDraftFromElement(moduleId, formEl);
    }
    if(el.hasAttribute('data-action')){
      var act = el.getAttribute('data-action');
      if(act === 'hm-table-pagesize'){
        _handleTablePageSize(container, moduleId, el);
      } else if(act === 'hm-checksheet-measure'){
        _handleChecksheetMeasure(container, moduleId, el);
      } else if(act === 'hm-detail-input'){
        _handleDetailInput(container, moduleId, el);
      }
    }
    if(el.hasAttribute('data-table-filter')){
      var blockEl = el.closest('.hm-block');
      if(blockEl) _handleColumnFilter(container, moduleId, blockEl.getAttribute('data-block-id'));
    }
    if(el.hasAttribute('data-filter')){
      var blockEl3 = el.closest('.hm-block');
      if(blockEl3) _handleFilterChange(container, moduleId, blockEl3.getAttribute('data-block-id'));
    }
  };
  container.addEventListener('change', container._hmChange);

  container.removeEventListener('submit', container._hmSubmit);
  container._hmSubmit = function(e){
    var formEl = e.target;
    if(formEl && formEl.matches && formEl.matches('form[data-hm-form-block]')){
      e.preventDefault();
      _handleFormSubmit(container, moduleId, formEl);
    }
  };
  container.addEventListener('submit', container._hmSubmit);

  container.removeEventListener('keydown', container._hmKeyDown);
  container._hmKeyDown = function(e){
    var modal = e.target && e.target.closest ? e.target.closest('.hm-form-modal[aria-modal="true"]') : null;
    var wizard = e.target && e.target.closest ? e.target.closest('.hm-form-wizard') : null;
    if(modal && e.key === 'Tab'){
      _trapModalFocus(e, modal);
      return;
    }
    if(e.key === 'Escape'){
      if(modal){
        e.preventDefault();
        _handleModalClose(container, moduleId, modal.getAttribute('data-block-id') || '');
        return;
      }
      if(wizard){
        var prevBtn = wizard.querySelector('[data-action="hm-wizard-prev"]:not([disabled])');
        if(prevBtn){
          e.preventDefault();
          prevBtn.click();
        }
      }
      return;
    }
    if(e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey){
      if(e.target && String(e.target.tagName || '').toUpperCase() === 'TEXTAREA') return;
      if(wizard){
        var nextBtn = wizard.querySelector('[data-action="hm-wizard-next"]:not([disabled])') || wizard.querySelector('[data-action="hm-wizard-submit"]:not([disabled])');
        if(nextBtn){
          e.preventDefault();
          nextBtn.click();
        }
      }
    }
  };
  container.addEventListener('keydown', container._hmKeyDown);
}

function _debounce(fn, ms){
  var t;
  return function(e){
    clearTimeout(t);
    var ev = e;
    t = setTimeout(function(){ fn(ev); }, ms);
  };
}

function _findBlockById(schema, blockId){
  if(!schema||!schema.tabs) return null;
  for(var i=0;i<schema.tabs.length;i++){
    var blocks = schema.tabs[i].blocks||[];
    for(var j=0;j<blocks.length;j++){
      if(blocks[j].id===blockId) return blocks[j];
      // Check slots
      if(blocks[j].slots){
        var slots = blocks[j].slots;
        var slotKeys = Object.keys(slots);
        for(var s=0;s<slotKeys.length;s++){
          var children = slots[slotKeys[s]]||[];
          for(var c=0;c<children.length;c++){
            if(children[c].id===blockId) return children[c];
          }
        }
      }
    }
  }
  return null;
}

/* ── Render Block ────────────────────────────────────────────────────── */

function _findActiveTab(moduleId){
  var ms = getModuleState(moduleId);
  var schema = ms._schema;
  var tabs = schema && schema.tabs ? schema.tabs : [];
  var found = null;
  tabs.forEach(function(tab){
    if(tab.tabId === ms.activeTab) found = tab;
  });
  return found || tabs[0] || null;
}

function _getBlockEntity(block){
  var config = block && block.config ? block.config : {};
  return config.entity || (config.workflow && config.workflow.entity) || '';
}

function _getFieldLabel(field){
  if(!field) return '';
  if(field.label && typeof field.label === 'object'){
    return _t(field.label.vi || field.label.en || field.key || '', field.label.en || field.label.vi || field.key || '');
  }
  return _t(field.label || field.key || '', field.labelEn || field.label || field.key || '');
}

function _readFormDataFromElement(formEl){
  var data = {};
  if(!formEl || !formEl.elements) return data;
  Array.prototype.forEach.call(formEl.elements, function(el){
    if(!el.name || el.disabled) return;
    if(el.type === 'checkbox'){
      data[el.name] = !!el.checked;
      return;
    }
    if(el.type === 'radio' && !el.checked) return;
    data[el.name] = el.value;
  });
  return data;
}

function _storeFormDraftFromElement(moduleId, formEl){
  var ms = getModuleState(moduleId);
  var blockId = formEl && formEl.getAttribute ? formEl.getAttribute('data-hm-form-block') : '';
  var formData = _readFormDataFromElement(formEl);
  if(blockId) ms.formDrafts[blockId] = formData;
  return formData;
}

function _fieldSeverity(field){
  var rules = field && field.validationRules ? field.validationRules : [];
  return rules.length ? (rules[0].severity || 'error') : 'error';
}

function _findCompanionFormBlock(moduleId, entity){
  var tab = _findActiveTab(moduleId);
  var match = null;
  var normalizedEntity = String(entity || '').toLowerCase();
  (tab && tab.blocks || []).forEach(function(block){
    if(match || !block || block.type !== 'form-standard') return;
    if(!normalizedEntity || String(_getBlockEntity(block) || '').toLowerCase() === normalizedEntity){
      match = block;
    }
  });
  return match;
}

function _workflowGuardReasons(transition, formData, context){
  var reasons = [];
  var guards = transition && transition.guards ? transition.guards : [];
  var userInfo = context.currentUser || context.user || {};
  var userRoles = Array.isArray(userInfo.roles) ? userInfo.roles.slice() : [];
  if(userInfo.role) userRoles.push(userInfo.role);
  guards.forEach(function(guard){
    var fieldValue;
    if(!guard) return;
    if(guard.type === 'role'){
      var roles = guard.roles || [];
      var allowed = roles.some(function(role){ return userRoles.indexOf(role) >= 0; });
      if(!allowed) reasons.push(guard.message || _t('Bạn không có quyền thực hiện chuyển trạng thái này.', 'You do not have permission to run this transition.'));
    } else if(guard.type === 'fieldRequired'){
      fieldValue = formData ? formData[guard.field] : null;
      if(fieldValue === '' || fieldValue === null || fieldValue === undefined){
        reasons.push(guard.message || (_t('Thiếu trường bắt buộc: ', 'Missing required field: ') + guard.field));
      }
    }
  });
  return reasons;
}

function _activateTableRow(container, moduleId, rowEl){
  var ms = getModuleState(moduleId);
  var blockId = rowEl.getAttribute('data-block-id');
  var absIdx = parseInt(rowEl.getAttribute('data-row-abs'), 10);
  if(!blockId || isNaN(absIdx)) return;
  ms.activeRowIndex[blockId] = absIdx;
  ms.activeRows[blockId] = (ms.renderedRows[blockId] || [])[absIdx] || null;
  refreshDependents(moduleId, blockId);
  renderModuleFromSchema(container, ms._schema);
}

function _handleFormSubmit(container, moduleId, formEl){
  var ms = getModuleState(moduleId);
  var blockId = formEl.getAttribute('data-hm-form-block');
  var block = _findBlockById(ms._schema, blockId);
  var formData = _storeFormDraftFromElement(moduleId, formEl);
  var context = _buildReactiveContext(moduleId);
  var validationResult = { valid:true, errors:{} };
  var submitConfig;
  var successContext;
  function finalizeSubmit(payload){
    ms.blockData[blockId] = payload && payload.data ? payload.data : payload;
    ms.formErrors[blockId] = {};
    renderModuleFromSchema(container, ms._schema);
  }
  if(!block) return;
  context._moduleId = moduleId;
  context._container = container;
  context.block = block;
  context.formData = formData;
  if(!(block.config && block.config.validation && block.config.validation.autoApply === false)){
    validationResult = validateForm(block.config.fields || [], formData, context);
  }
  ms.formErrors[blockId] = validationResult.errors || {};
  showValidationErrors(formEl, validationResult.errors || {});
  if(!validationResult.valid){
    toast(_t('Biểu mẫu còn lỗi validation.', 'The form still has validation errors.'), 'danger');
    return;
  }
  submitConfig = _normalizeSubmitConfig(block.config || {}, block.type === 'form-modal' ? 'modal' : '');
  if(!submitConfig.api){
    toast(_t('Biểu mẫu hợp lệ và đã được lưu trong phiên làm việc.', 'The form is valid and has been stored in the current session.'), 'success');
    finalizeSubmit(formData);
    return;
  }
  _api(submitConfig.api, formData, submitConfig.method || 'POST').then(function(resp){
    if(resp && resp.ok === false){
      toast(_apiErrorMessage(resp, 'Gửi biểu mẫu thất bại.', 'Form submission failed.'), 'danger');
      return;
    }
    invalidateCache(submitConfig.api);
    finalizeSubmit(resp || formData);
    successContext = _buildReactiveContext(moduleId);
    successContext._moduleId = moduleId;
    successContext._container = container;
    successContext.block = block;
    successContext.formData = formData;
    successContext.result = resp || {};
    successContext.response = resp || {};
    successContext.record = resp && (resp.data || resp.sales_order || resp.job_order || resp.work_order || resp.review || resp.shipment_gate)
      ? (resp.data || resp.sales_order || resp.job_order || resp.work_order || resp.review || resp.shipment_gate)
      : formData;
    successContext._lastResult = resp || {};
    if(block.config && block.config.onSuccess && block.config.onSuccess.type === 'chain' && Array.isArray(block.config.onSuccess.actions)){
      executeChain(block.config.onSuccess.actions, successContext).catch(function(err){
        console.warn('[BlockEngine] onSuccess chain failed', err);
      });
      return;
    }
    toast(_t('Đã gửi biểu mẫu thành công.', 'Form submitted successfully.'), 'success');
  }).catch(function(err){
    toast(_t('Gửi biểu mẫu thất bại.', 'Form submission failed.'), 'danger');
    console.warn('[BlockEngine] form submit failed', err);
  });
}

function _handleStatusTransition(container, moduleId, btn){
  var ms = getModuleState(moduleId);
  var blockId = btn.getAttribute('data-block-id');
  var transitionIndex = parseInt(btn.getAttribute('data-transition-index'), 10);
  var block = _findBlockById(ms._schema, blockId);
  var workflow = block && block.config ? (block.config.workflow || {}) : {};
  var stateField = workflow.stateField || (block && block.config && block.config.statusField) || 'status';
  var currentRecord = ms.blockData[blockId] || {};
  var currentState = currentRecord[stateField] || '';
  var transitions = workflow.transitions || [];
  var legacyTransitionApi = block && block.config ? (block.config.transitionApi || null) : null;
  if(!transitions.length && block && block.config && block.config.transitions){
    transitions = ((block.config.transitions[currentState] || []) || []).map(function(to){
      return { from: currentState, to: to, label: to };
    });
  }
  var transition = transitions[transitionIndex];
  var formBlock = _findCompanionFormBlock(moduleId, workflow.entity);
  var formEl = formBlock ? container.querySelector('[data-hm-form-block="'+formBlock.id+'"]') : null;
  var formData = formEl ? _storeFormDraftFromElement(moduleId, formEl) : (formBlock ? (ms.formDrafts[formBlock.id] || ms.blockData[formBlock.id] || {}) : {});
  var context = _buildReactiveContext(moduleId);
  var reasons;
  var validationResult;
  var payload;
  if(!block || !transition) return;
  context._moduleId = moduleId;
  context._container = container;
  context.block = block;
  context.targetStatus = transition.to;
  if(formBlock && !(formBlock.config && formBlock.config.validation && formBlock.config.validation.autoApply === false)){
    validationResult = validateForm(formBlock.config.fields || [], formData, context);
    ms.formErrors[formBlock.id] = validationResult.errors || {};
    if(formEl) showValidationErrors(formEl, ms.formErrors[formBlock.id]);
    if(validationResult && !validationResult.valid){
      toast(_t('Biểu mẫu còn lỗi, chưa thể chuyển trạng thái.', 'The form still has errors, so the transition cannot continue.'), 'warning');
      return;
    }
  }
  reasons = _workflowGuardReasons(transition, formData, context);
  if(reasons.length){
    if(formBlock){
      if(!ms.formErrors[formBlock.id]) ms.formErrors[formBlock.id] = {};
      (transition.guards || []).forEach(function(guard){
        if(guard && guard.type === 'fieldRequired' && (formData[guard.field] === '' || formData[guard.field] == null)){
          ms.formErrors[formBlock.id][guard.field] = { message: guard.message || (_t('Thiếu trường bắt buộc: ', 'Missing required field: ') + guard.field), severity:'error' };
        }
      });
      if(formEl) showValidationErrors(formEl, ms.formErrors[formBlock.id]);
    }
    toast(reasons[0], 'warning');
    return;
  }
  if(transition.confirmMessage && !confirm(_t(transition.confirmMessage, transition.confirmMessageEn || transition.confirmMessage))) return;
  if(legacyTransitionApi){
    payload = legacyTransitionApi.bodyTemplate ? _resolveBindings(legacyTransitionApi.bodyTemplate, context) : {};
  } else {
    payload = {
      from: transition.from,
      to: transition.to,
      entity: workflow.entity || '',
      data: formData
    };
  }
  if(formData && stateField) formData[stateField] = transition.to;
  if(formBlock) ms.formDrafts[formBlock.id] = formData;
  function applyLocalTransition(){
    if(ms.blockData[blockId] && typeof ms.blockData[blockId] === 'object' && stateField){
      ms.blockData[blockId][stateField] = transition.to;
    }
    toast(_t('Đã chuyển trạng thái sang ', 'Transitioned to ') + transition.to, 'success');
    refreshDependents(moduleId, blockId);
    renderModuleFromSchema(container, ms._schema);
  }
  if(transition.endpoint || legacyTransitionApi){
    var endpoint = transition.endpoint || legacyTransitionApi.action || legacyTransitionApi.api;
    var method = transition.method || legacyTransitionApi.method || 'POST';
    _api(endpoint, payload, method).then(function(resp){
      if(resp && resp.ok === false){
        toast(_apiErrorMessage(resp, 'Chuyển trạng thái thất bại.', 'Transition failed.'), 'danger');
        return;
      }
      invalidateCache(endpoint);
      applyLocalTransition();
      if(block.config && block.config.onSuccess && block.config.onSuccess.type === 'chain' && Array.isArray(block.config.onSuccess.actions)){
        context.result = resp || {};
        context.response = resp || {};
        context._lastResult = resp || {};
        executeChain(block.config.onSuccess.actions, context).catch(function(err){
          console.warn('[BlockEngine] status transition onSuccess failed', err);
        });
      }
    }).catch(function(err){
      toast(_t('Chuyển trạng thái thất bại.', 'Transition failed.'), 'danger');
      console.warn('[BlockEngine] transition failed', err);
    });
  } else {
    applyLocalTransition();
  }
}

function renderBlock(block, data, state){
  if(!block) return '';
  var blockClasses = getBlockClasses(block);
  if(block.visible===false) blockClasses += ' hm-block-hidden';
  return _renderBlockWrapper(block, data, state, blockClasses, null);
}

function _renderBlockInner(block, data, state, reactiveCtx){
  var config = block.config || {};
  var catalogEntry = BLOCK_CATALOG[block.type] || {};
  var renderType = catalogEntry.renderer || block.type;
  var blockRuntimeId = block.id || block.blockId || '';
  var blockCtx = reactiveCtx;

  // Resolve bindings in config if reactive context available
  var resolvedConfig = config;
  if(reactiveCtx){
    blockCtx = {};
    Object.keys(reactiveCtx).forEach(function(key){
      blockCtx[key] = reactiveCtx[key];
    });
    blockCtx.data = data || {};
    blockCtx.record = data || {};
    blockCtx.block = block || {};
    blockCtx.module = (state && state._schema) ? state._schema : (reactiveCtx.module || {});
    blockCtx.user = reactiveCtx.user || reactiveCtx.currentUser || {};
    blockCtx.currentUser = blockCtx.user;
    blockCtx.filters = (state && state.filterValues) || reactiveCtx.filters || {};
    try { resolvedConfig = _resolveBindings(config, blockCtx); } catch(e){ resolvedConfig = config; }
  }
  if(block.type === 'action-status-flow') renderType = 'action-status-flow';
  if(block.type === 'chart-line') renderType = 'chart-line';
  if(block.type === 'chart-area') renderType = 'chart-area';
  if(block.type === 'chart-scatter') renderType = 'chart-scatter';
  if(block.type === 'chart-radar') renderType = 'chart-radar';
  if(block.type === 'chart-combo') renderType = 'chart-combo';
  if(block.type === 'quality-spc-chart') renderType = 'quality-spc-chart';
  if(block.type === 'quality-control-chart') renderType = 'quality-control-chart';
  if(block.type === 'quality-pareto') renderType = 'quality-pareto';
  if(block.type === 'quality-checksheet') renderType = 'quality-checksheet';
  if(block.type === 'form-wizard') renderType = 'form-wizard';
  if(block.type === 'form-modal') renderType = 'form-modal';
  if(block.type === 'record-detail' || block.type === 'data-detail') renderType = 'record-detail';
  if(block.type === 'data-kanban') renderType = 'data-kanban';
  if(block.type === 'data-gantt') renderType = 'data-gantt';
  if(block.type === 'mfg-machine-status') renderType = 'mfg-machine-status';

  switch(renderType){
    case 'kpi-row':         return renderKpiRow(resolvedConfig, data);
    case 'data-table':      return renderAdvancedTableV3(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx);
    case 'data-tree':       return renderDataTree(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx);
    case 'filter-bar':      return renderFilterBar(resolvedConfig, data, state);
    case 'section-header':  return renderSectionHeader(resolvedConfig);
    case 'spacer':          return '<div style="height:'+(resolvedConfig.height||16)+'px"></div>';
    case 'info-banner':     return renderInfoBanner(resolvedConfig);
    case 'chart-bar':       return renderBarChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'chart-line':      return renderLineChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'chart-area':      return renderAreaChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'chart-scatter':   return renderScatterChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'chart-radar':     return renderRadarChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'chart-combo':     return renderComboChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'chart-donut':     return renderDonutChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'quality-spc-chart': return renderSpcChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'quality-control-chart': return renderControlChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'quality-pareto':  return renderParetoChart(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'quality-checksheet': return renderChecksheet(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'data-kanban':     return renderKanban(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'data-gantt':      return renderGantt(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'record-detail':   return renderRecordDetail(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'action-status-flow': return renderStatusFlow(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx);
    case 'action-toolbar':  return renderToolbar(resolvedConfig, data);
    case 'data-cards':      return renderCardGrid(resolvedConfig, data);
    case 'data-timeline':   return renderTimeline(resolvedConfig, data);
    case 'form-standard':   return renderFormStandard(resolvedConfig, data, blockCtx || reactiveCtx, block);
    case 'form-wizard':     return renderFormWizard(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'form-modal':      return renderFormModal(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'mfg-machine-status': return renderMachineStatus(resolvedConfig, data, state, blockRuntimeId, blockCtx || reactiveCtx, block);
    case 'two-column':
      var columnBlock = _clone(block);
      columnBlock.config = resolvedConfig;
      return renderTwoColumn(columnBlock, data, state);
    case 'card-container':
      var containerBlock = _clone(block);
      containerBlock.config = resolvedConfig;
      return renderCardContainer(containerBlock, data, state);
    default:
      return '<div class="hm-empty"><div style="font-weight:600;margin-bottom:4px">'+_esc(_t(catalogEntry.label || block.type, catalogEntry.labelEn || block.type))+'</div><div style="font-size:12px;color:var(--text-tertiary)">'+_t('Block đang dùng renderer mặc định. Cấu hình thêm trong Module Builder.','This block is using the generic renderer. Configure it in Module Builder.')+'</div></div>';
  }
}

/* ── Block Renderers ─────────────────────────────────────────────────── */

/* --- KPI Row --- */
function renderKpiRow(config, data){
  var items = config.items || [];
  var html = '<div class="hm-kpi-row">';
  items.forEach(function(item){
    var val = data && data[item.dataKey]!==undefined ? data[item.dataKey] : (item.default||0);
    var color = item.accentColor || item.color || 'var(--brand-2)';
    html += '<div class="hm-kpi-card" style="border-left:3px solid '+color+'">';
    html += '<div class="hm-kpi-value" style="color:'+color+'">'+_esc(typeof val==='number'?_fmt(val):String(val))+(item.suffix||'')+'</div>';
    html += '<div class="hm-kpi-label">'+_esc(_textLabel(item.label, item.labelEn))+'</div>';
    if(item.trend){
      var up = item.trend > 0;
      html += '<div class="hm-kpi-trend hm-kpi-trend-'+(up?'up':'down')+'">'+(up?'&#9650;':'&#9660;')+' '+Math.abs(item.trend)+'%</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* --- Advanced Data Table v3 (TanStack-inspired) --- */
function renderAdvancedTableV3(config, data, state, blockId, reactiveCtx){
  var columns = config.columns || [];
  var dataKey = config.dataKey || 'items';
  var allRows = (data && (Array.isArray(data) ? data : data[dataKey])) || [];

  if(!columns.length) return '<div class="hm-empty">'+_t('Chưa cấu hình cột','No columns configured')+'</div>';

  // Get or init table state
  var moduleId = state && state._schema ? state._schema.moduleId : '_';
  var ms = getModuleState(moduleId);
  if(!ms.tableStates[blockId]){
    ms.tableStates[blockId] = {
      sortCol: null,
      sortDir: null,
      sortStack: [],       // multi-column sort
      filters: {},
      page: 1,
      pageSize: config.pageSize||20,
      columnWidths: {},
      pinnedLeft: [],
      pinnedRight: [],
    };
  }
  var ts = ms.tableStates[blockId];

  // Column visibility
  if(!ms.columnVisibility[blockId]){
    ms.columnVisibility[blockId] = {};
    columns.forEach(function(col){ ms.columnVisibility[blockId][col.key] = true; });
  }
  var colVis = ms.columnVisibility[blockId];

  // Filter visible columns
  var visibleColumns = columns.filter(function(col){
    return colVis[col.key] !== false;
  });

  // Apply computed columns (formula engine)
  var processedRows = _applyComputedColumns(columns, allRows, reactiveCtx || {});

  // Apply column filters
  var rows = processedRows;
  visibleColumns.forEach(function(col){
    var fv = ts.filters[col.key];
    if(fv && fv !== ''){
      if(col.filterType === 'number-range'){
        // fv = { min: X, max: Y }
        if(typeof fv === 'object'){
          rows = rows.filter(function(r){
            var v = Number(r[col.key]);
            if(isNaN(v)) return false;
            if(fv.min != null && v < Number(fv.min)) return false;
            if(fv.max != null && v > Number(fv.max)) return false;
            return true;
          });
        }
      } else if(col.filterType === 'date-range'){
        if(typeof fv === 'object'){
          rows = rows.filter(function(r){
            var d = r[col.key] ? String(r[col.key]).slice(0,10) : '';
            if(!d) return false;
            if(fv.from && d < fv.from) return false;
            if(fv.to && d > fv.to) return false;
            return true;
          });
        }
      } else if(col.filterType === 'boolean'){
        rows = rows.filter(function(r){
          return String(!!r[col.key]) === String(fv);
        });
      } else {
        rows = rows.filter(function(r){
          var cell = String(r[col.key]||'').toLowerCase();
          return cell.indexOf(String(fv).toLowerCase()) >= 0;
        });
      }
    }
  });

  // Apply multi-column sort
  if(ts.sortStack && ts.sortStack.length){
    rows = rows.slice().sort(function(a,b){
      for(var si=0; si<ts.sortStack.length; si++){
        var sk = ts.sortStack[si].col;
        var dir = ts.sortStack[si].dir === 'desc' ? -1 : 1;
        var va = a[sk], vb = b[sk];
        if(va==null) va = '';
        if(vb==null) vb = '';
        var cmp = 0;
        if(typeof va==='number' && typeof vb==='number') cmp = (va-vb)*dir;
        else cmp = String(va).localeCompare(String(vb),'vi')*dir;
        if(cmp !== 0) return cmp;
      }
      return 0;
    });
  } else if(ts.sortCol){
    // Single column sort (backward compat)
    var dir = ts.sortDir === 'desc' ? -1 : 1;
    var sk = ts.sortCol;
    rows = rows.slice().sort(function(a,b){
      var va = a[sk], vb = b[sk];
      if(va==null) va = '';
      if(vb==null) vb = '';
      if(typeof va==='number' && typeof vb==='number') return (va-vb)*dir;
      return String(va).localeCompare(String(vb),'vi')*dir;
    });
  }

  // Pagination
  var totalRows = rows.length;
  var totalPages = Math.max(1, Math.ceil(totalRows / ts.pageSize));
  if(ts.page > totalPages) ts.page = totalPages;
  var startIdx = (ts.page - 1) * ts.pageSize;
  var pageRows = rows.slice(startIdx, startIdx + ts.pageSize);
  ms.renderedRows[blockId] = rows;
  if(ms.activeRowIndex[blockId] != null){
    ms.activeRows[blockId] = rows[ms.activeRowIndex[blockId]] || null;
  }

  // Aggregation calculations
  var aggregations = _computeAggregations(visibleColumns, rows);

  // Empty state
  if(!allRows.length){
    return '<div class="hm-empty"><div class="hm-empty-icon">&#128203;</div><div>'+_t('Không có dữ liệu','No data')+'</div></div>';
  }

  // Build table HTML
  var html = '';

  // Toolbar: column toggle + export
  html += '<div class="hm-table-toolbar">';
  // Column visibility dropdown
  html += '<div class="hm-dropdown">';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs">&#9776; '+_t('Cot','Columns')+'</button>';
  html += '<div class="hm-dropdown-content">';
  columns.forEach(function(col){
    var checked = colVis[col.key] !== false ? ' checked' : '';
    html += '<label class="hm-dropdown-item"><input type="checkbox" data-action="hm-table-col-toggle" data-col="'+_esc(col.key)+'" data-block-id="'+_esc(blockId)+'"'+checked+'> '+_esc(_t(col.label||col.key, col.labelEn||col.key))+'</label>';
  });
  html += '</div></div>';
  // Export buttons
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-export" data-block-id="'+_esc(blockId)+'" data-format="csv" title="CSV">&#128196; CSV</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-export" data-block-id="'+_esc(blockId)+'" data-format="json" title="JSON">{ } JSON</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-export" data-block-id="'+_esc(blockId)+'" data-format="clipboard" title="'+_t('Sao chep','Copy')+'">&#128203; '+_t('Sao chep','Copy')+'</button>';
  // Row count
  html += '<span class="hm-table-rowcount">'+_fmt(totalRows)+' '+_t('dong','rows')+'</span>';
  html += '</div>';

  // Table
  html += '<div class="hm-table-wrapper" style="overflow-x:auto;position:relative">';

  // Loading skeleton overlay
  if(ms.loading[blockId]){
    html += '<div class="hm-table-loading-overlay"><div class="hm-skeleton"><div class="hm-skeleton-line"></div><div class="hm-skeleton-line hm-skeleton-short"></div><div class="hm-skeleton-line"></div></div></div>';
  }

  html += '<table class="hm-table hm-table-advanced">';

  // Column headers with sort (supports multi-sort via shift+click)
  html += '<thead><tr>';

  // Row selection checkbox column
  if(config.selectable){
    var allSelected = pageRows.length > 0 && pageRows.every(function(r,i){ return ms.selectedRows[blockId] && ms.selectedRows[blockId][startIdx+i]; });
    html += '<th style="width:36px;text-align:center"><input type="checkbox" data-action="hm-table-select-all" data-block-id="'+_esc(blockId)+'"'+(allSelected?' checked':'')+'></th>';
  }

  // Row expansion column
  if(config.expandable){
    html += '<th style="width:36px"></th>';
  }

  visibleColumns.forEach(function(col){
    // Sort indicators (supports multi-sort)
    var sortIndicator = '';
    var sortIdx = -1;
    if(ts.sortStack){
      for(var si=0;si<ts.sortStack.length;si++){
        if(ts.sortStack[si].col===col.key){ sortIdx=si; break; }
      }
    }
    if(sortIdx >= 0){
      sortIndicator = ts.sortStack[sortIdx].dir==='asc' ? ' &#9650;' : ' &#9660;';
      if(ts.sortStack.length > 1) sortIndicator += '<sup>'+(sortIdx+1)+'</sup>';
    } else if(ts.sortCol===col.key){
      sortIndicator = ts.sortDir==='asc' ? ' &#9650;' : ' &#9660;';
    }

    var align = col.type==='number' || col.type==='currency' || col.type==='percentage' ? 'text-align:right' : '';
    var width = ts.columnWidths[col.key] ? 'width:'+ts.columnWidths[col.key]+'px;' : (col.width ? 'width:'+col.width+';' : '');
    var minW = col.minWidth ? 'min-width:'+col.minWidth+';' : '';
    var pinCls = '';
    if(ts.pinnedLeft.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-left';
    if(ts.pinnedRight.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-right';

    html += '<th class="hm-th-sortable'+pinCls+'" style="'+align+width+minW+'cursor:pointer;user-select:none;position:relative" data-action="hm-table-sort" data-col="'+_esc(col.key)+'" data-block-id="'+_esc(blockId)+'">';
    html += _esc(_t(col.label||col.key, col.labelEn||col.key));
    html += '<span class="hm-sort-indicator">'+sortIndicator+'</span>';
    // Resize handle
    html += '<span class="hm-col-resize" data-col="'+_esc(col.key)+'" data-block-id="'+_esc(blockId)+'" style="position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize"></span>';
    html += '</th>';
  });
  html += '</tr>';

  // Column filter row
  html += '<tr class="hm-table-filter-row">';
  if(config.selectable) html += '<th></th>';
  if(config.expandable) html += '<th></th>';

  visibleColumns.forEach(function(col){
    var fv = ts.filters[col.key] || '';
    if(col.filterable===false){
      html += '<th></th>';
    } else if(col.filterType==='select' && col.filterOptions){
      html += '<th><select class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'">';
      html += '<option value="">'+_t('Tat ca','All')+'</option>';
      (col.filterOptions||[]).forEach(function(opt){
        var sel = fv===String(opt.value) ? ' selected' : '';
        html += '<option value="'+_esc(opt.value)+'"'+sel+'>'+_esc(_t(opt.label, opt.labelEn||opt.label))+'</option>';
      });
      html += '</select></th>';
    } else if(col.filterType==='number-range'){
      var minVal = (typeof fv==='object' && fv.min!=null) ? fv.min : '';
      var maxVal = (typeof fv==='object' && fv.max!=null) ? fv.max : '';
      html += '<th style="display:flex;gap:2px"><input type="number" class="hm-input hm-input-xs" placeholder="Min" data-table-filter="'+_esc(col.key)+'_min" value="'+_esc(minVal)+'" style="width:50%">';
      html += '<input type="number" class="hm-input hm-input-xs" placeholder="Max" data-table-filter="'+_esc(col.key)+'_max" value="'+_esc(maxVal)+'" style="width:50%"></th>';
    } else if(col.filterType==='date-range'){
      var fromVal = (typeof fv==='object' && fv.from) ? fv.from : '';
      var toVal = (typeof fv==='object' && fv.to) ? fv.to : '';
      html += '<th style="display:flex;gap:2px"><input type="date" class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'_from" value="'+_esc(fromVal)+'" style="width:50%">';
      html += '<input type="date" class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'_to" value="'+_esc(toVal)+'" style="width:50%"></th>';
    } else if(col.filterType==='boolean'){
      html += '<th><select class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'">';
      html += '<option value="">'+_t('Tat ca','All')+'</option>';
      html += '<option value="true"'+(fv==='true'?' selected':'')+'>'+_t('Co','Yes')+'</option>';
      html += '<option value="false"'+(fv==='false'?' selected':'')+'>'+_t('Không','No')+'</option>';
      html += '</select></th>';
    } else {
      html += '<th><input type="text" class="hm-input hm-input-xs" placeholder="'+_t('Loc...','Filter...')+'" data-table-filter="'+_esc(col.key)+'" value="'+_esc(typeof fv==='string'?fv:'')+'"></th>';
    }
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  if(!pageRows.length){
    var colspan = visibleColumns.length + (config.selectable?1:0) + (config.expandable?1:0);
    html += '<tr><td colspan="'+colspan+'" class="hm-empty">'+_t('Không tìm thấy','No results found')+'</td></tr>';
  }

  pageRows.forEach(function(row, ri){
    var absIdx = startIdx + ri;
    var rowAction = config.rowAction || 'hm-table-row-click';
    var rowSelected = (ms.selectedRows[blockId] && ms.selectedRows[blockId][absIdx]) || ms.activeRowIndex[blockId] === absIdx;
    html += '<tr class="hm-table-row'+(rowSelected?' hm-row-selected':'')+'" data-action="'+_esc(rowAction)+'" data-row-idx="'+ri+'" data-row-abs="'+absIdx+'" data-block-id="'+_esc(blockId)+'" data-row-action="'+_esc(config.rowAction || '')+'" style="cursor:pointer">';

    // Selection checkbox
    if(config.selectable){
      html += '<td style="text-align:center"><input type="checkbox" data-action="hm-table-select-row" data-block-id="'+_esc(blockId)+'" data-row="'+absIdx+'"'+(rowSelected?' checked':'')+'></td>';
    }

    // Expansion toggle
    if(config.expandable){
      var isExpanded = ms.expandedRows[blockId] && ms.expandedRows[blockId][absIdx];
      html += '<td style="text-align:center;cursor:pointer" data-action="hm-table-expand-row" data-block-id="'+_esc(blockId)+'" data-row="'+absIdx+'">'+(isExpanded?'&#9660;':'&#9654;')+'</td>';
    }

    visibleColumns.forEach(function(col){
      var val = row[col.key]!=null ? row[col.key] : '';
      var align = (col.type==='number'||col.type==='currency'||col.type==='percentage') ? 'text-align:right;font-variant-numeric:tabular-nums' : '';
      var editable = col.editable ? ' hm-cell-editable' : '';
      var pinCls = '';
      if(ts.pinnedLeft.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-left';
      if(ts.pinnedRight.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-right';

      html += '<td class="'+pinCls+editable+'" style="'+align+'" data-col="'+_esc(col.key)+'" data-row-idx="'+ri+'">';
      html += _formatCellValue(val, col, row);
      html += '</td>';
    });
    html += '</tr>';

    // Expanded row detail
    if(config.expandable && ms.expandedRows[blockId] && ms.expandedRows[blockId][absIdx]){
      var expandColspan = visibleColumns.length + (config.selectable?1:0) + 1;
      html += '<tr class="hm-row-expanded"><td colspan="'+expandColspan+'">';
      if(config.expandTemplate){
        html += resolveBindings(config.expandTemplate, Object.assign({}, reactiveCtx||{}, { row:row }));
      } else {
        // Default: show all fields as key-value
        html += '<div class="hm-row-detail">';
        Object.keys(row).forEach(function(k){
          html += '<div class="hm-detail-field"><strong>'+_esc(k)+':</strong> '+_esc(String(row[k]!=null?row[k]:''))+'</div>';
        });
        html += '</div>';
      }
      html += '</td></tr>';
    }
  });
  html += '</tbody>';

  // Aggregation footer
  if(_hasAggregations(visibleColumns)){
    html += '<tfoot><tr class="hm-table-footer">';
    if(config.selectable) html += '<td></td>';
    if(config.expandable) html += '<td></td>';
    visibleColumns.forEach(function(col){
      if(col.aggregate && aggregations[col.key] != null){
        var aggLabel = col.aggregate.toUpperCase();
        var aggVal = aggregations[col.key];
        if(typeof aggVal === 'number') aggVal = _fmt(Math.round(aggVal*100)/100);
        html += '<td style="font-weight:600;'+(col.type==='number'||col.type==='currency'?'text-align:right':'')+'"><small>'+aggLabel+':</small> '+_esc(String(aggVal))+'</td>';
      } else {
        html += '<td></td>';
      }
    });
    html += '</tr></tfoot>';
  }

  html += '</table></div>';

  // Pagination bar
  html += '<div class="hm-table-pagination">';
  html += '<span class="hm-table-info">'+_t('Hien thi','Showing')+' '+(totalRows>0?startIdx+1:0)+'-'+Math.min(startIdx+ts.pageSize, totalRows)+' / '+totalRows+'</span>';
  html += '<span class="hm-table-page-controls">';
  // Page size selector
  html += '<select class="hm-input hm-input-xs" data-action="hm-table-pagesize" data-block-id="'+_esc(blockId)+'">';
  [10,20,50,100,200].forEach(function(ps){
    html += '<option value="'+ps+'"'+(ts.pageSize===ps?' selected':'')+'>'+ps+'/'+_t('trang','page')+'</option>';
  });
  html += '</select>';
  // Page buttons
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="1"'+(ts.page<=1?' disabled':'')+'>&#171;</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="'+(ts.page-1)+'"'+(ts.page<=1?' disabled':'')+'>&#8249;</button>';
  html += '<span class="hm-page-num">'+ts.page+'/'+totalPages+'</span>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="'+(ts.page+1)+'"'+(ts.page>=totalPages?' disabled':'')+'>&#8250;</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="'+totalPages+'"'+(ts.page>=totalPages?' disabled':'')+'>&#187;</button>';
  html += '</span></div>';

  return html;
}

/** Format a cell value based on column type */
function _formatCellValue(val, col, row){
  switch(col.type){
    case 'badge':
      return '<span class="hm-badge hm-badge-'+_esc(String(val))+'">'+_esc(String(val))+'</span>';
    case 'number':
      return _esc(typeof val==='number'?_fmt(val):String(val));
    case 'currency':
      var num = typeof val==='number' ? val : parseFloat(val);
      if(isNaN(num)) return _esc(String(val));
      return _esc(_fmt(Math.round(num)))+(col.currencySuffix||'');
    case 'date':
      return _esc(val ? String(val).slice(0,10) : '');
    case 'percentage':
      var pct = typeof val==='number' ? val : parseFloat(val);
      if(isNaN(pct)) return _esc(String(val));
      return '<div class="hm-pct-cell"><span>'+Math.round(pct)+'%</span><div class="hm-pct-bar" style="width:'+Math.min(100,Math.max(0,pct))+'%;background:'+(pct>=90?'var(--green,#16a34a)':pct>=70?'var(--amber,#d97706)':'var(--red,#dc2626)')+'"></div></div>';
    case 'progress':
      var p = Number(val)||0;
      return progressBar(p, 100);
    case 'boolean':
      return val ? '<span class="hm-bool-true">&#10003;</span>' : '<span class="hm-bool-false">&#10007;</span>';
    case 'link':
      return '<a href="'+_esc(String(val))+'" class="hm-link" target="_blank">'+_esc(col.linkText||String(val))+'</a>';
    case 'image':
      return val ? '<img src="'+_esc(String(val))+'" class="hm-cell-img" alt="">' : '';
    default:
      var text = _esc(String(val));
      if(col.suffix) text += _esc(col.suffix);
      if(col.prefix) text = _esc(col.prefix) + text;
      return text;
  }
}

/** Compute aggregation values for footer */
function _computeAggregations(columns, rows){
  var aggs = {};
  columns.forEach(function(col){
    if(!col.aggregate) return;
    var vals = rows.map(function(r){ return Number(r[col.key]); }).filter(function(v){ return !isNaN(v); });
    switch(col.aggregate){
      case 'sum':
        aggs[col.key] = vals.reduce(function(a,b){ return a+b; }, 0);
        break;
      case 'avg':
        aggs[col.key] = vals.length ? vals.reduce(function(a,b){ return a+b; }, 0) / vals.length : 0;
        break;
      case 'count':
        aggs[col.key] = rows.length;
        break;
      case 'min':
        aggs[col.key] = vals.length ? Math.min.apply(null, vals) : 0;
        break;
      case 'max':
        aggs[col.key] = vals.length ? Math.max.apply(null, vals) : 0;
        break;
      default:
        aggs[col.key] = null;
    }
  });
  return aggs;
}

function _hasAggregations(columns){
  return columns.some(function(c){ return !!c.aggregate; });
}

/* --- Inline Cell Editing --- */
function _startInlineEdit(container, moduleId, cell){
  var colKey = cell.getAttribute('data-col');
  var rowIdx = parseInt(cell.getAttribute('data-row-idx'),10);
  if(!colKey || isNaN(rowIdx)) return;

  var currentVal = cell.textContent.trim();
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'hm-input hm-input-xs hm-inline-edit-input';
  input.value = currentVal;
  input.style.cssText = 'width:100%;box-sizing:border-box';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  function commit(){
    var newVal = input.value;
    cell.textContent = newVal;
    // Store edit in state
    var ms = getModuleState(moduleId);
    if(!ms.inlineEdits[cell.closest('.hm-block').getAttribute('data-block-id')]){
      ms.inlineEdits[cell.closest('.hm-block').getAttribute('data-block-id')] = {};
    }
    ms.inlineEdits[cell.closest('.hm-block').getAttribute('data-block-id')][rowIdx+'_'+colKey] = newVal;
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){ input.value = currentVal; input.blur(); }
  });
}

/* --- Row Selection --- */
function _handleRowSelect(moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowIdx = parseInt(btn.getAttribute('data-row'),10);
  var ms = getModuleState(moduleId);
  if(!ms.selectedRows[blockId]) ms.selectedRows[blockId] = {};
  ms.selectedRows[blockId][rowIdx] = btn.checked;
  if(btn.checked){
    ms.activeRowIndex[blockId] = rowIdx;
    ms.activeRows[blockId] = (ms.renderedRows[blockId] || [])[rowIdx] || null;
  } else if(ms.activeRowIndex[blockId] === rowIdx){
    ms.activeRowIndex[blockId] = null;
    ms.activeRows[blockId] = null;
  }
  refreshDependents(moduleId, blockId);
}

function _handleSelectAll(moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;
  if(!ms.selectedRows[blockId]) ms.selectedRows[blockId] = {};
  var startIdx = (ts.page - 1) * ts.pageSize;
  for(var i = startIdx; i < startIdx + ts.pageSize; i++){
    ms.selectedRows[blockId][i] = btn.checked;
  }
  if(btn.checked){
    ms.activeRowIndex[blockId] = startIdx;
    ms.activeRows[blockId] = (ms.renderedRows[blockId] || [])[startIdx] || null;
  }
  // Update individual checkboxes
  var container = btn.closest('.hm-block');
  if(container){
    container.querySelectorAll('input[data-action="hm-table-select-row"]').forEach(function(cb){
      cb.checked = btn.checked;
    });
  }
  refreshDependents(moduleId, blockId);
}

/* --- Row Expansion --- */
function _handleRowExpand(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowIdx = parseInt(btn.getAttribute('data-row'),10);
  var ms = getModuleState(moduleId);
  if(!ms.expandedRows[blockId]) ms.expandedRows[blockId] = {};
  ms.expandedRows[blockId][rowIdx] = !ms.expandedRows[blockId][rowIdx];
  renderModuleFromSchema(container.closest('[data-module]') || container, ms._schema);
}

/* --- Column Toggle --- */
function _handleColumnToggle(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var colKey = btn.getAttribute('data-col');
  var ms = getModuleState(moduleId);
  if(!ms.columnVisibility[blockId]) ms.columnVisibility[blockId] = {};
  ms.columnVisibility[blockId][colKey] = btn.checked;
  renderModuleFromSchema(container.closest('[data-module]') || container, ms._schema);
}

/* --- Table Export --- */
function _handleTableExport(moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var format = btn.getAttribute('data-format') || 'csv';
  var ms = getModuleState(moduleId);
  var schema = ms._schema;
  if(!schema) return;

  var block = _findBlockById(schema, blockId);
  if(!block) return;
  var config = block.config || {};
  var columns = config.columns || [];
  var dataKey = config.dataKey || 'items';
  var data = ms.blockData[blockId];
  var allRows = (data && (Array.isArray(data) ? data : data[dataKey])) || [];

  // Apply computed columns
  var rows = _applyComputedColumns(columns, allRows, _buildReactiveContext(moduleId));

  // Filter visible columns
  var colVis = ms.columnVisibility[blockId] || {};
  var visCols = columns.filter(function(c){ return colVis[c.key] !== false; });

  if(format === 'csv'){
    var csvLines = [];
    // Header
    csvLines.push(visCols.map(function(c){ return '"'+_t(c.label||c.key, c.labelEn||c.key).replace(/"/g,'""')+'"'; }).join(','));
    // Rows
    rows.forEach(function(row){
      csvLines.push(visCols.map(function(c){
        var v = row[c.key]!=null ? String(row[c.key]) : '';
        return '"'+v.replace(/"/g,'""')+'"';
      }).join(','));
    });
    _downloadText(csvLines.join('\n'), 'export.csv', 'text/csv');
  } else if(format === 'json'){
    var jsonData = rows.map(function(row){
      var obj = {};
      visCols.forEach(function(c){ obj[c.key] = row[c.key]; });
      return obj;
    });
    _downloadText(JSON.stringify(jsonData, null, 2), 'export.json', 'application/json');
  } else if(format === 'clipboard'){
    var lines = [];
    lines.push(visCols.map(function(c){ return _t(c.label||c.key, c.labelEn||c.key); }).join('\t'));
    rows.forEach(function(row){
      lines.push(visCols.map(function(c){ return row[c.key]!=null ? String(row[c.key]) : ''; }).join('\t'));
    });
    _copyToClipboard(lines.join('\n'));
    toast(_t('Đã sao chép '+rows.length+' dòng','Copied '+rows.length+' rows'), 'success');
  }
}

function _downloadText(text, filename, mime){
  var blob = new Blob(['\uFEFF'+text], { type: mime+';charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function _copyToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function _handleChartSeriesToggle(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var seriesKey = btn.getAttribute('data-series-key');
  var ms = getModuleState(moduleId);
  if(!ms.chartStates[blockId]) ms.chartStates[blockId] = { hiddenSeries:{}, zoom:1, panX:0.5, panY:0.5, zoomLevel:'day' };
  ms.chartStates[blockId].hiddenSeries[seriesKey] = !ms.chartStates[blockId].hiddenSeries[seriesKey];
  renderModuleFromSchema(container, ms._schema);
}

function _handleChartZoom(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var delta = Number(btn.getAttribute('data-delta') || 0);
  var ms = getModuleState(moduleId);
  if(!ms.chartStates[blockId]) ms.chartStates[blockId] = { hiddenSeries:{}, zoom:1, panX:0.5, panY:0.5, zoomLevel:'day' };
  ms.chartStates[blockId].zoom = _chartClamp((ms.chartStates[blockId].zoom || 1) + delta, 1, 6);
  renderModuleFromSchema(container, ms._schema);
}

function _handleChartPan(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var axis = btn.getAttribute('data-axis') || 'x';
  var delta = Number(btn.getAttribute('data-delta') || 0);
  var ms = getModuleState(moduleId);
  if(!ms.chartStates[blockId]) ms.chartStates[blockId] = { hiddenSeries:{}, zoom:1, panX:0.5, panY:0.5, zoomLevel:'day' };
  if(axis === 'y') ms.chartStates[blockId].panY = _chartClamp((ms.chartStates[blockId].panY == null ? 0.5 : ms.chartStates[blockId].panY) + delta, 0, 1);
  else ms.chartStates[blockId].panX = _chartClamp((ms.chartStates[blockId].panX == null ? 0.5 : ms.chartStates[blockId].panX) + delta, 0, 1);
  renderModuleFromSchema(container, ms._schema);
}

function _handleChartReset(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  ms.chartStates[blockId] = { hiddenSeries:{}, zoom:1, panX:0.5, panY:0.5, zoomLevel:'day' };
  renderModuleFromSchema(container, ms._schema);
}

function _handleChecksheetToggle(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowId = btn.getAttribute('data-row');
  var colId = btn.getAttribute('data-col');
  var ms = getModuleState(moduleId);
  if(!ms.checksheetStates[blockId]) ms.checksheetStates[blockId] = {};
  if(!ms.checksheetStates[blockId][rowId]) ms.checksheetStates[blockId][rowId] = {};
  ms.checksheetStates[blockId][rowId][colId] = !ms.checksheetStates[blockId][rowId][colId];
  renderModuleFromSchema(container, ms._schema);
}

function _handleChecksheetIncrement(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowId = btn.getAttribute('data-row');
  var colId = btn.getAttribute('data-col');
  var ms = getModuleState(moduleId);
  var current = 0;
  if(!ms.checksheetStates[blockId]) ms.checksheetStates[blockId] = {};
  if(!ms.checksheetStates[blockId][rowId]) ms.checksheetStates[blockId][rowId] = {};
  current = _chartNumber(ms.checksheetStates[blockId][rowId][colId] || 0);
  ms.checksheetStates[blockId][rowId][colId] = current + 1;
  renderModuleFromSchema(container, ms._schema);
}

function _handleChecksheetPassFail(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowId = btn.getAttribute('data-row');
  var colId = btn.getAttribute('data-col');
  var value = btn.getAttribute('data-value');
  var ms = getModuleState(moduleId);
  if(!ms.checksheetStates[blockId]) ms.checksheetStates[blockId] = {};
  if(!ms.checksheetStates[blockId][rowId]) ms.checksheetStates[blockId][rowId] = {};
  ms.checksheetStates[blockId][rowId][colId] = value;
  renderModuleFromSchema(container, ms._schema);
}

function _handleChecksheetMeasure(container, moduleId, input){
  var blockId = input.getAttribute('data-block-id');
  var rowId = input.getAttribute('data-row');
  var colId = input.getAttribute('data-col');
  var ms = getModuleState(moduleId);
  if(!ms.checksheetStates[blockId]) ms.checksheetStates[blockId] = {};
  if(!ms.checksheetStates[blockId][rowId]) ms.checksheetStates[blockId][rowId] = {};
  ms.checksheetStates[blockId][rowId][colId] = _chartNumber(input.value);
  renderModuleFromSchema(container, ms._schema);
}

function _handleGanttZoom(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var zoom = btn.getAttribute('data-zoom') || 'day';
  var ms = getModuleState(moduleId);
  if(!ms.chartStates[blockId]) ms.chartStates[blockId] = { hiddenSeries:{}, zoom:1, panX:0.5, panY:0.5, zoomLevel:'day' };
  ms.chartStates[blockId].zoomLevel = zoom;
  renderModuleFromSchema(container, ms._schema);
}

function _handleDetailEdit(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var field = btn.getAttribute('data-field');
  var ms = getModuleState(moduleId);
  if(!ms.detailStates[blockId]) ms.detailStates[blockId] = {};
  ms.detailStates[blockId].editing = field;
  renderModuleFromSchema(container, ms._schema);
}

function _handleDetailInput(container, moduleId, input){
  var blockId = input.getAttribute('data-block-id');
  var field = input.getAttribute('data-field');
  var ms = getModuleState(moduleId);
  var block = _findBlockById(ms._schema, blockId);
  var record = _detailRecord(ms.blockData[blockId]);
  if(!block || !record) return;
  record[field] = input.value;
  if(!ms.detailStates[blockId]) ms.detailStates[blockId] = {};
  ms.detailStates[blockId].editing = '';
  if(block.config && block.config.updateApi){
    _api(block.config.updateApi, record, 'POST').catch(function(err){
      console.warn('[BlockEngine] detail update failed', err);
    });
  }
  renderModuleFromSchema(container, ms._schema);
}

function _initRuntimeBlocks(container, moduleId){
  _initKanbanBoards(container, moduleId);
  _initFormModals(container, moduleId);
  _initMachineStatusBoards(container, moduleId);
}

function _initKanbanBoards(container, moduleId){
  var boards = container.querySelectorAll('.hm-kanban-board[data-block-id]');
  boards.forEach(function(board){
    var blockId = board.getAttribute('data-block-id');
    board.querySelectorAll('.hm-kanban-card[draggable="true"]').forEach(function(card){
      card.addEventListener('dragstart', function(e){
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
          blockId: blockId,
          rowKey: card.getAttribute('data-row-key')
        }));
        board.classList.add('is-dragging');
      });
      card.addEventListener('dragend', function(){
        board.classList.remove('is-dragging');
      });
    });
    board.querySelectorAll('[data-kanban-column]').forEach(function(column){
      column.addEventListener('dragover', function(e){
        e.preventDefault();
        column.classList.add('is-drop-target');
      });
      column.addEventListener('dragleave', function(){
        column.classList.remove('is-drop-target');
      });
      column.addEventListener('drop', function(e){
        var payload;
        var ms = getModuleState(moduleId);
        var block = _findBlockById(ms._schema, blockId);
        var rows;
        var statusKey;
        var rowKey = 'id';
        var targetStatus;
        var draggedRow;
        var ctx;
        var onDrop;
        column.classList.remove('is-drop-target');
        try { payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}'); } catch(err){ payload = {}; }
        if(payload.blockId !== blockId || !block) return;
        rows = _runtimeRowsRef(ms.blockData[blockId], block.config || {});
        statusKey = (block.config && (block.config.statusKey || block.config.kanban && block.config.kanban.laneField)) || 'status';
        rowKey = block.config && block.config.rowKey || 'id';
        targetStatus = column.getAttribute('data-kanban-column');
        draggedRow = rows.find(function(row){ return String(row[rowKey] != null ? row[rowKey] : '') === String(payload.rowKey); });
        if(!draggedRow) return;
        draggedRow[statusKey] = targetStatus;
        onDrop = block.config && (block.config.onDrop || block.config.kanban && block.config.kanban.persist && block.config.kanban.persist.api && { type:'api-call', action:block.config.kanban.persist.api, params:{} });
        if(onDrop && onDrop.action){
          ctx = _buildReactiveContext(moduleId);
          ctx.card = draggedRow;
          ctx.row = draggedRow;
          ctx.targetColumn = targetStatus;
          _api(onDrop.action, onDrop.params ? _resolveBindings(onDrop.params, ctx) : { id: draggedRow[rowKey], status: targetStatus }, onDrop.method || 'POST').catch(function(err){
            console.warn('[BlockEngine] kanban drop failed', err);
          });
        }
        renderModuleFromSchema(container, ms._schema);
      });
    });
  });
}

/* --- v2 backward-compatible table renderer (delegates to v3) --- */
function renderAdvancedTable(config, data, state, blockId){
  return renderAdvancedTableV3(config, data, state, blockId, null);
}

/* --- Table event handlers --- */
function _handleTableSort(container, moduleId, btn){
  var col = btn.getAttribute('data-col');
  var blockId = btn.getAttribute('data-block-id') || btn.closest('.hm-block').getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;

  // Check if shift key was held (multi-sort)
  var shiftHeld = btn._hmShift || false;

  if(shiftHeld && ts.sortStack){
    // Multi-column sort
    var existing = -1;
    for(var i=0;i<ts.sortStack.length;i++){
      if(ts.sortStack[i].col===col){ existing=i; break; }
    }
    if(existing >= 0){
      var entry = ts.sortStack[existing];
      if(entry.dir === 'asc') entry.dir = 'desc';
      else if(entry.dir === 'desc') ts.sortStack.splice(existing, 1);
    } else {
      ts.sortStack.push({ col:col, dir:'asc' });
    }
    // Sync single-sort fields
    ts.sortCol = ts.sortStack.length ? ts.sortStack[0].col : null;
    ts.sortDir = ts.sortStack.length ? ts.sortStack[0].dir : null;
  } else {
    // Single column sort (original behavior)
    if(ts.sortCol===col){
      ts.sortDir = ts.sortDir==='asc' ? 'desc' : ts.sortDir==='desc' ? null : 'asc';
      if(!ts.sortDir) ts.sortCol = null;
    } else {
      ts.sortCol = col; ts.sortDir = 'asc';
    }
    // Sync multi-sort
    if(ts.sortCol){
      ts.sortStack = [{ col:ts.sortCol, dir:ts.sortDir }];
    } else {
      ts.sortStack = [];
    }
  }

  ts.page = 1;
  renderModuleFromSchema(container, ms._schema);
}

function _handleTablePage(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var page = parseInt(btn.getAttribute('data-page'),10);
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts || isNaN(page) || page<1) return;
  ts.page = page;
  renderModuleFromSchema(container, ms._schema);
}

function _handleTablePageSize(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ps = parseInt(btn.value||btn.getAttribute('data-value'),10);
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts || isNaN(ps)) return;
  ts.pageSize = ps;
  ts.page = 1;
  renderModuleFromSchema(container, ms._schema);
}

function _handleFilterChange(container, moduleId, blockId){
  var ms = getModuleState(moduleId);
  var blockEl = container.querySelector('[data-block-id="'+blockId+'"]');
  if(!ms.filterValues) ms.filterValues = {};
  if(blockEl){
    blockEl.querySelectorAll('[data-filter]').forEach(function(el){
      var key = el.getAttribute('data-filter');
      var value;
      if(!key) return;
      value = el.type === 'checkbox' ? !!el.checked : el.value;
      if(value === '' || value === null || value === undefined || value === false){
        delete ms.filterValues[key];
      } else {
        ms.filterValues[key] = value;
      }
    });
  }
  invalidateCache();
  renderModuleFromSchema(container, ms._schema);
}

function _handleColumnFilter(container, moduleId, blockId){
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;
  var blockEl = container.querySelector('[data-block-id="'+blockId+'"]');
  if(!blockEl) return;
  ts.filters = {};
  blockEl.querySelectorAll('[data-table-filter]').forEach(function(el){
    var k = el.getAttribute('data-table-filter');
    var v = el.value;

    // Handle range filters (min/max, from/to)
    if(k.match(/_min$/) || k.match(/_max$/)){
      var baseKey = k.replace(/_min$|_max$/, '');
      if(!ts.filters[baseKey]) ts.filters[baseKey] = {};
      if(k.match(/_min$/)) ts.filters[baseKey].min = v || null;
      else ts.filters[baseKey].max = v || null;
    } else if(k.match(/_from$/) || k.match(/_to$/)){
      var baseKey2 = k.replace(/_from$|_to$/, '');
      if(!ts.filters[baseKey2]) ts.filters[baseKey2] = {};
      if(k.match(/_from$/)) ts.filters[baseKey2].from = v || null;
      else ts.filters[baseKey2].to = v || null;
    } else {
      if(v) ts.filters[k] = v;
    }
  });
  ts.page = 1;
  renderModuleFromSchema(container, ms._schema);
}

/* --- Filter Bar --- */
function renderFilterBar(config, data, state){
  var filters = config.filters || [];
  var values = state && state.filterValues ? state.filterValues : {};
  var html = '<div class="hm-filter-bar">';
  filters.forEach(function(f){
    var value = values[f.key];
    if(f.type==='search'){
      html += '<input type="text" class="hm-input" placeholder="'+_esc(_t(f.placeholder||'Tim kiem...',f.placeholderEn||'Search...'))+'" data-filter="'+_esc(f.key)+'" value="'+_esc(value != null ? value : '')+'">';
    } else if(f.type==='select'){
      html += '<select class="hm-input hm-select" data-filter="'+_esc(f.key)+'">';
      html += '<option value="">'+_esc(_t(f.allLabel||'Tat ca',f.allLabelEn||'All'))+'</option>';
      (f.options||[]).forEach(function(opt){
        var selected = String(value != null ? value : '') === String(opt.value) ? ' selected' : '';
        html += '<option value="'+_esc(opt.value)+'"'+selected+'>'+_esc(_textLabel(opt.label, opt.labelEn))+'</option>';
      });
      html += '</select>';
    } else if(f.type==='date'){
      html += '<input type="date" class="hm-input" data-filter="'+_esc(f.key)+'" style="width:auto" value="'+_esc(value != null ? value : '')+'">';
    } else if(f.type==='daterange'){
      var fromValue = values[f.key+'_from'];
      var toValue = values[f.key+'_to'];
      html += '<span class="hm-filter-daterange">';
      html += '<input type="date" class="hm-input" data-filter="'+_esc(f.key)+'_from" style="width:auto" value="'+_esc(fromValue != null ? fromValue : '')+'">';
      html += '<span class="hm-filter-sep">-</span>';
      html += '<input type="date" class="hm-input" data-filter="'+_esc(f.key)+'_to" style="width:auto" value="'+_esc(toValue != null ? toValue : '')+'">';
      html += '</span>';
    }
  });
  if(config.showApply!==false){
    html += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="refresh">'+_t('Ap dung','Apply')+'</button>';
  }
  html += '</div>';
  return html;
}

function _treeChildKeys(config, node){
  var seen = {};
  var keys = [];
  function addKey(key){
    if(!key || seen[key]) return;
    seen[key] = true;
    keys.push(key);
  }
  if(Array.isArray(config.childKeys)){
    config.childKeys.forEach(addKey);
  }
  addKey(config.childrenKey);
  ['children', 'job_orders', 'work_orders', 'nodes', 'items'].forEach(function(key){
    if(node && Array.isArray(node[key])) addKey(key);
  });
  return keys;
}

function _treeChildren(config, node){
  var children = [];
  _treeChildKeys(config, node).forEach(function(key){
    (node && Array.isArray(node[key]) ? node[key] : []).forEach(function(child){
      if(child && typeof child === 'object') children.push(child);
    });
  });
  return children;
}

function renderDataTree(config, data, state, blockId, reactiveCtx){
  var rows = Array.isArray(data) ? data : ((data && data[config.dataKey || 'items']) || []);
  var expandLevel = Number(config.expandLevel || 0);
  if(!rows.length) return '<div class="hm-empty">'+_t('Không có dữ liệu cây', 'No tree data')+'</div>';

  function renderNode(node, level){
    var context = {};
    var children = _treeChildren(config, node);
    var summaryText;
    if(reactiveCtx){
      Object.keys(reactiveCtx).forEach(function(key){ context[key] = reactiveCtx[key]; });
    }
    context.node = node;
    context.row = node;
    context.record = node;
    context.data = node;
    context.level = level;
    summaryText = config.nodeTemplate ? resolveBindings(config.nodeTemplate, context) : (node.label || node.name || node.so_number || node.jo_number || node.wo_number || '');

    if(children.length){
      return '<li class="hm-tree-item" data-tree-level="'+level+'"><details'+(level < expandLevel ? ' open' : '')+'><summary class="hm-tree-summary">'+_esc(summaryText)+'</summary><ul class="hm-tree-children">'+children.map(function(child){ return renderNode(child, level + 1); }).join('')+'</ul></details></li>';
    }

    return '<li class="hm-tree-item hm-tree-leaf" data-tree-level="'+level+'"><div class="hm-tree-summary">'+_esc(summaryText)+'</div></li>';
  }

  return '<div class="hm-tree"><ul class="hm-tree-root">'+rows.map(function(node){ return renderNode(node, 0); }).join('')+'</ul></div>';
}

/* --- Bar Chart --- */
function renderBarChart(config, data){
  var items = (data && data[config.dataKey]) || config.items || [];
  if(!items.length) return '<div class="hm-empty">'+_t('Không có dữ liệu','No data')+'</div>';

  var max = 0;
  items.forEach(function(i){ if((i.value||0)>max) max = i.value||0; });
  if(max===0) max = 1;

  var html = '<div class="hm-bar-chart">';
  items.forEach(function(item){
    var pct = Math.round(((item.value||0)/max)*100);
    var color = item.color || 'var(--brand-2)';
    html += '<div class="hm-bar-row">';
    html += '<span class="hm-bar-label">'+_esc(_t(item.label||'',item.labelEn||''))+'</span>';
    html += '<div class="hm-bar-track"><div class="hm-bar-fill" style="width:'+pct+'%;background:'+color+'"></div></div>';
    html += '<span class="hm-bar-value">'+_esc(_fmt(item.value||0))+'</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* --- Donut Chart --- */
function _chartHeatColor(value, min, max, scale){
  var ratio;
  var start;
  var mid;
  var end;
  var color;
  if(max <= min) return '#cbd5e1';
  ratio = _chartClamp((value - min) / (max - min), 0, 1);
  if(scale === 'green'){
    start = [220, 252, 231];
    end = [22, 163, 74];
  } else if(scale === 'blue'){
    start = [224, 242, 254];
    end = [37, 99, 235];
  } else if(scale === 'red'){
    start = [254, 226, 226];
    end = [220, 38, 38];
  } else if(scale === 'red-yellow-green'){
    if(ratio <= 0.5){
      start = [220, 38, 38];
      end = [245, 158, 11];
      ratio = ratio / 0.5;
    } else {
      start = [245, 158, 11];
      end = [22, 163, 74];
      ratio = (ratio - 0.5) / 0.5;
    }
  } else {
    start = [255, 247, 237];
    mid = [245, 158, 11];
    end = [22, 163, 74];
    if(ratio <= 0.55){
      color = [
        Math.round(start[0] + ((mid[0] - start[0]) * (ratio / 0.55))),
        Math.round(start[1] + ((mid[1] - start[1]) * (ratio / 0.55))),
        Math.round(start[2] + ((mid[2] - start[2]) * (ratio / 0.55)))
      ];
    } else {
      color = [
        Math.round(mid[0] + ((end[0] - mid[0]) * ((ratio - 0.55) / 0.45))),
        Math.round(mid[1] + ((end[1] - mid[1]) * ((ratio - 0.55) / 0.45))),
        Math.round(mid[2] + ((end[2] - mid[2]) * ((ratio - 0.55) / 0.45)))
      ];
    }
    return 'rgb(' + color.join(',') + ')';
  }
  color = [
    Math.round(start[0] + ((end[0] - start[0]) * ratio)),
    Math.round(start[1] + ((end[1] - start[1]) * ratio)),
    Math.round(start[2] + ((end[2] - start[2]) * ratio))
  ];
  return 'rgb(' + color.join(',') + ')';
}

function _chartMappedSeriesItems(config, data){
  var chartCfg = config && config.chart ? config.chart : {};
  var rows = _chartRows(config, data);
  var labelKey = chartCfg.labelField || chartCfg.categoryField || config.labelKey || 'label';
  var valueKey = chartCfg.valueField || config.valueKey || 'value';
  var colorKey = chartCfg.colorField || config.colorKey || '';
  var series = (config && Array.isArray(config.series) ? config.series : []).slice();
  var sourceRow = rows[0] || {};
  if(series.length){
    return series.map(function(item, index){
      var valueField = item.field || item.valueField || item.key || valueKey;
      return {
        label: _chartText(item, item.key || valueField, item.key || valueField),
        value: _chartNumber(item.value != null ? item.value : sourceRow[valueField]),
        color: item.color || (colorKey && sourceRow[colorKey]) || _chartColor(index)
      };
    }).filter(function(item){
      return item.value || item.value === 0;
    });
  }
  if(rows.length){
    return rows.map(function(row, index){
      return {
        label: row[labelKey] == null ? ('Item ' + (index + 1)) : String(row[labelKey]),
        value: _chartNumber(row[valueKey]),
        color: colorKey ? row[colorKey] : _chartColor(index)
      };
    }).filter(function(item){
      return item.value || item.value === 0;
    });
  }
  if(config && Array.isArray(config.items)){
    return config.items.map(function(item, index){
      return {
        label: _chartText(item, item.label || ('Item ' + (index + 1)), item.labelEn || item.label || ('Item ' + (index + 1))),
        value: _chartNumber(item.value),
        color: item.color || _chartColor(index)
      };
    });
  }
  return [];
}

function _chartGaugePayload(config, data){
  var gaugeCfg = config && config.gauge ? config.gauge : {};
  var rows = _chartRows(config, data);
  var record = rows[0] || ((data && typeof data === 'object' && !Array.isArray(data)) ? data : {});
  var valueKey = gaugeCfg.valueField || 'value';
  var targetKey = gaugeCfg.targetField || 'target';
  var min = _chartNumber(gaugeCfg.min);
  var max = _chartNumber(gaugeCfg.max);
  if(max <= min) max = min + 100;
  return {
    value: _chartNumber(record[valueKey] != null ? record[valueKey] : config.value),
    target: _chartNumber(record[targetKey] != null ? record[targetKey] : config.target),
    min: min,
    max: max,
    unit: gaugeCfg.unit || '',
    showTarget: gaugeCfg.showTarget !== false,
    showDelta: !!gaugeCfg.showDelta,
    segments: Array.isArray(gaugeCfg.segments) ? gaugeCfg.segments.slice() : []
  };
}

function renderGaugeChart(config, data, state, blockId, block){
  var payload = _chartGaugePayload(config, data);
  var type = block && block.type ? String(block.type) : 'chart-gauge';
  var pct = _chartClamp((payload.value - payload.min) / Math.max(payload.max - payload.min, 1), 0, 1);
  var targetPct = _chartClamp((payload.target - payload.min) / Math.max(payload.max - payload.min, 1), 0, 1);
  var delta = payload.target || payload.target === 0 ? (payload.value - payload.target) : null;
  var segments = payload.segments.length ? payload.segments.slice() : [
    { to: payload.min + ((payload.max - payload.min) * 0.6), color:'#22c55e', label:{ vi:'Good', en:'Good' } },
    { to: payload.min + ((payload.max - payload.min) * 0.82), color:'#f59e0b', label:{ vi:'Watch', en:'Watch' } },
    { to: payload.max, color:'#ef4444', label:{ vi:'Critical', en:'Critical' } }
  ];
  var gradientParts = [];
  var previousPct = 0;
  var valueText = _chartFormatValue(payload.value, 'number') + payload.unit;
  var targetText = payload.target || payload.target === 0 ? (_chartFormatValue(payload.target, 'number') + payload.unit) : '';
  var html = '';
  segments.sort(function(a, b){
    return _chartNumber(a.to) - _chartNumber(b.to);
  }).forEach(function(segment){
    var stopPct = _chartClamp((_chartNumber(segment.to) - payload.min) / Math.max(payload.max - payload.min, 1), 0, 1) * 100;
    gradientParts.push((segment.color || '#94a3b8') + ' ' + previousPct.toFixed(2) + '% ' + stopPct.toFixed(2) + '%');
    previousPct = stopPct;
  });
  if(previousPct < 100) gradientParts.push('rgba(148,163,184,0.22) ' + previousPct.toFixed(2) + '% 100%');
  if(type === 'chart-progress' || type === 'insight-target-tracker'){
    html += '<div class="hm-donut-container hm-donut-container-progress">';
    html += '<div class="hm-donut-ring" style="background:conic-gradient(' + gradientParts.join(',') + ')">';
    html += '<div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--brand-2) 0 ' + Math.round(pct * 1000) / 10 + '%, rgba(255,255,255,0) ' + Math.round(pct * 1000) / 10 + '% 100%);mix-blend-mode:multiply"></div>';
    if(payload.showTarget && targetText){
      html += '<span style="position:absolute;left:50%;top:50%;width:2px;height:44%;background:var(--text-primary,#0f172a);border-radius:999px;transform-origin:bottom center;transform:translate(-50%, -100%) rotate(' + ((targetPct * 360) - 180) + 'deg)"></span>';
    }
    html += '<div class="hm-donut-hole" style="width:62%;height:62%"><div><strong>' + _esc(String(Math.round(pct * 100))) + '%</strong><div style="font-size:11px;color:var(--text-secondary)">' + _esc(valueText) + '</div></div></div>';
    html += '</div><div class="hm-donut-legend">';
    if(payload.showTarget && targetText) html += '<div class="hm-donut-legend-item"><span class="hm-donut-swatch" style="background:var(--text-primary,#0f172a)"></span><span>Target: <b>' + _esc(targetText) + '</b></span></div>';
    if(payload.showDelta && delta != null) html += '<div class="hm-donut-legend-item"><span class="hm-donut-swatch" style="background:' + (delta >= 0 ? 'var(--green-dark,#16a34a)' : 'var(--red-light,#ef4444)') + '"></span><span>Delta: <b>' + _esc((delta >= 0 ? '+' : '') + _chartFormatValue(delta, 'number') + payload.unit) + '</b></span></div>';
    html += '</div></div>';
    return html;
  }
  html += '<div class="hm-chart-card hm-chart-card-gauge"><div class="hm-chart-shell" role="img" aria-label="' + _chartAttrText('Gauge chart') + '" data-chart-block-id="' + _esc(blockId || '') + '">';
  html += '<div style="display:grid;grid-template-columns:minmax(180px, 220px) 1fr;gap:18px;align-items:center">';
  html += '<div style="position:relative;width:100%;max-width:220px;height:120px;margin:0 auto;overflow:hidden">';
  html += '<div style="position:absolute;left:50%;top:0;width:220px;height:220px;border-radius:50%;transform:translateX(-50%);background:conic-gradient(' + gradientParts.join(',') + ')"></div>';
  html += '<div style="position:absolute;left:50%;top:26px;width:156px;height:156px;border-radius:50%;background:var(--bg-surface,#fff);transform:translateX(-50%)"></div>';
  html += '<div style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);text-align:center"><div style="font-size:30px;font-weight:800;color:var(--text-primary)">' + _esc(valueText) + '</div><div style="font-size:11px;color:var(--text-secondary)">Range: ' + _esc(_chartFormatValue(payload.min, 'number') + payload.unit + ' - ' + _chartFormatValue(payload.max, 'number') + payload.unit) + '</div></div>';
  html += '<div style="position:absolute;left:50%;bottom:28px;width:2px;height:74px;background:var(--text-primary,#0f172a);border-radius:999px;transform-origin:bottom center;transform:translateX(-50%) rotate(' + ((pct * 180) - 90) + 'deg)"></div>';
  html += '<div style="position:absolute;left:50%;bottom:22px;width:14px;height:14px;border-radius:50%;background:var(--text-primary,#0f172a);transform:translateX(-50%)"></div>';
  html += '</div><div>';
  if(payload.showTarget && targetText) html += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Target: <strong style="color:var(--text-primary)">' + _esc(targetText) + '</strong></div>';
  if(payload.showDelta && delta != null) html += '<div style="font-size:12px;color:' + (delta >= 0 ? 'var(--green-dark,#16a34a)' : 'var(--red-light,#ef4444)') + ';font-weight:700;margin-bottom:12px">Delta: ' + _esc((delta >= 0 ? '+' : '') + _chartFormatValue(delta, 'number') + payload.unit) + '</div>';
  html += '<div class="hm-donut-legend">';
  segments.forEach(function(segment, index){
    html += '<div class="hm-donut-legend-item"><span class="hm-donut-swatch" style="background:' + _esc(segment.color || _chartColor(index)) + '"></span><span>' + _esc(_chartText(segment, 'Band ' + (index + 1), 'Band ' + (index + 1))) + '</span></div>';
  });
  html += '</div></div></div></div></div>';
  return html;
}

function renderDonutChart(config, data, state, blockId, reactiveCtx, block){
  var chartCfg = config && config.chart ? config.chart : {};
  var type = block && block.type ? String(block.type) : '';
  var items = _chartMappedSeriesItems(config, data);
  var total = 0;
  var gradientParts = [];
  var cumPct = 0;
  var innerRadius = _chartClamp(_chartNumber(chartCfg.innerRadius || 62), 0, 92);
  var showPercent = chartCfg.showPercent !== false;
  var html = '';
  if(type === 'chart-gauge' || type === 'chart-progress' || type === 'insight-target-tracker' || config.gauge){
    return renderGaugeChart(config, data, state, blockId, block || { type:type || 'chart-gauge' });
  }
  items.forEach(function(item){
    total += _chartNumber(item.value);
  });
  if(total > 0){
    items.forEach(function(item, index){
      var pct = (_chartNumber(item.value) / total) * 100;
      gradientParts.push((item.color || _chartColor(index)) + ' ' + cumPct.toFixed(2) + '% ' + (cumPct + pct).toFixed(2) + '%');
      item.percent = pct;
      cumPct += pct;
    });
    html += '<div class="hm-donut-container">';
    html += '<div class="hm-donut-ring" style="background:conic-gradient(' + gradientParts.join(',') + ')">';
    html += '<div class="hm-donut-hole" style="width:' + innerRadius + '%;height:' + innerRadius + '%"><div><strong>' + _esc(_fmt(total)) + '</strong>' + (showPercent ? '<div style="font-size:11px;color:var(--text-secondary)">Total</div>' : '') + '</div></div>';
    html += '</div><div class="hm-donut-legend">';
    items.forEach(function(item, index){
      html += '<div class="hm-donut-legend-item">';
      html += '<span class="hm-donut-swatch" style="background:' + _esc(item.color || _chartColor(index)) + '"></span>';
      html += '<span>' + _esc(item.label) + ': <b>' + _esc(_fmt(item.value)) + '</b>' + (showPercent ? ' <small>(' + _esc(Math.round(item.percent * 10) / 10 + '%') + ')</small>' : '') + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }
  var items = (data && data[config.dataKey]) || config.items || [];
  var total = 0;
  items.forEach(function(i){ total += (i.value||0); });
  if(total===0) return '<div class="hm-empty">'+_t('Không có dữ liệu','No data')+'</div>';

  var gradientParts = [];
  var cumPct = 0;
  items.forEach(function(item){
    var pct = ((item.value||0)/total)*100;
    gradientParts.push((item.color||'#94a3b8')+' '+cumPct+'% '+(cumPct+pct)+'%');
    cumPct += pct;
  });

  var html = '<div class="hm-donut-container">';
  html += '<div class="hm-donut-ring" style="background:conic-gradient('+gradientParts.join(',')+')">';
  html += '<div class="hm-donut-hole">'+_fmt(total)+'</div>';
  html += '</div>';
  html += '<div class="hm-donut-legend">';
  items.forEach(function(item){
    html += '<div class="hm-donut-legend-item">';
    html += '<span class="hm-donut-swatch" style="background:'+(item.color||'var(--text-secondary,#94a3b8)')+'"></span>';
    html += '<span>'+_esc(_t(item.label||'',item.labelEn||''))+': <b>'+_fmt(item.value||0)+'</b></span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function _chartRows(config, data){
  var chartCfg = config && config.chart ? config.chart : {};
  var dataKey = config && (config.dataKey || (config.dataSource && config.dataSource.dataKey) || chartCfg.dataKey) || 'items';
  if(Array.isArray(data)) return data;
  if(data && Array.isArray(data[dataKey])) return data[dataKey];
  if(data && Array.isArray(data.items)) return data.items;
  if(data && Array.isArray(data.rows)) return data.rows;
  if(data && Array.isArray(data.machines)) return data.machines;
  if(data && Array.isArray(data.assets)) return data.assets;
  if(config && Array.isArray(config.items)) return config.items;
  return [];
}

function _chartModuleId(state){
  return state && state._schema ? (state._schema.moduleId || '_') : '_';
}

function _chartState(state, blockId){
  var ms = getModuleState(_chartModuleId(state));
  if(!ms.chartStates[blockId || '_']){
    ms.chartStates[blockId || '_'] = {
      hiddenSeries: {},
      zoom: 1,
      panX: 0.5,
      panY: 0.5,
      zoomLevel: 'day'
    };
  }
  return ms.chartStates[blockId || '_'];
}

function _chartText(item, fallbackVi, fallbackEn){
  if(item && item.label && typeof item.label === 'object'){
    return _t(item.label.vi || fallbackVi || '', item.label.en || fallbackEn || item.label.vi || fallbackVi || '');
  }
  return _t(
    item && (item.labelVi || item.label || fallbackVi || '') || '',
    item && (item.labelEn || item.label || fallbackEn || fallbackVi || '') || ''
  );
}

function _chartColor(index, fallback){
  var palette = ['#2563eb','#0ea5e9','#16a34a','#f59e0b','#dc2626','#7c3aed','#14b8a6','#ea580c','#64748b','#e11d48'];
  return fallback || palette[index % palette.length];
}

function _chartEmpty(message){
  return '<div class="hm-empty">'+_esc(message || _t('Không có dữ liệu','No data'))+'</div>';
}

function _chartError(label, err){
  console.warn('[BlockEngine] chart render failed:', label, err);
  return '<div class="hm-empty">'+_esc(_t('Không thể hiển thị biểu đồ', 'Unable to render chart'))+'</div>';
}

function _chartNumber(value){
  var num = Number(value);
  return isNaN(num) ? 0 : num;
}

function _chartClamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function _chartDateLabel(value){
  var d;
  if(value == null || value === '') return '';
  d = new Date(value);
  if(isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString((typeof lang !== 'undefined' && lang === 'vi') ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: 'short'
  });
}

function _chartFormatValue(value, format){
  if(value == null || value === '') return '';
  if(format === 'percent' || format === 'percentage') return _fmt(_chartNumber(value)) + '%';
  if(format === 'currency'){
    try{
      return new Intl.NumberFormat((typeof lang !== 'undefined' && lang === 'vi') ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(_chartNumber(value));
    } catch(e){}
  }
  if(format === 'date') return _chartDateLabel(value);
  if(typeof value === 'number' || (!isNaN(Number(value)) && value !== '')){
    return _fmt(_chartNumber(value));
  }
  return String(value);
}

function _chartAttrText(text){
  return _esc(String(text == null ? '' : text)).replace(/\n/g, '&#10;');
}

function _chartAxisTicks(min, max, count){
  var ticks = [];
  var range = max - min;
  var rough;
  var factor;
  var err;
  var step;
  var niceMin;
  var niceMax;
  var v;
  if(count == null) count = 5;
  if(!isFinite(min) || !isFinite(max)) return [0, 1];
  if(min === max){
    if(min === 0) return [0, 1];
    min = min - Math.abs(min * 0.2);
    max = max + Math.abs(max * 0.2);
  }
  range = max - min;
  rough = range / Math.max(count - 1, 1);
  factor = Math.pow(10, Math.floor(Math.log(rough) / Math.LN10));
  err = rough / factor;
  if(err >= 7.5) step = 10 * factor;
  else if(err >= 3.5) step = 5 * factor;
  else if(err >= 1.5) step = 2 * factor;
  else step = factor;
  niceMin = Math.floor(min / step) * step;
  niceMax = Math.ceil(max / step) * step;
  for(v = niceMin; v <= niceMax + (step * 0.5); v += step){
    ticks.push(Number(v.toFixed(8)));
  }
  return ticks;
}

function _chartScaleX(index, total, left, width){
  if(total <= 1) return left + (width / 2);
  return left + ((width / (total - 1)) * index);
}

function _chartScaleY(value, min, max, top, height){
  if(max === min) return top + (height / 2);
  return top + height - (((value - min) / (max - min)) * height);
}

function _chartPointsToString(points){
  return points.map(function(point){
    return point.x.toFixed(2) + ',' + point.y.toFixed(2);
  }).join(' ');
}

function _chartLineLength(points){
  var total = 0;
  var i;
  for(i = 1; i < points.length; i++){
    total += Math.sqrt(Math.pow(points[i].x - points[i - 1].x, 2) + Math.pow(points[i].y - points[i - 1].y, 2));
  }
  return total || 1;
}

function _chartSeriesKey(series, index){
  return String(series.key || series.field || series.id || ('series_' + index));
}

function _chartLegend(seriesList, chartState, blockId, label){
  var html = '<div class="hm-chart-legend" role="toolbar" aria-label="'+_chartAttrText(label || _t('Chú giải biểu đồ', 'Chart legend'))+'">';
  seriesList.forEach(function(series, index){
    var key = _chartSeriesKey(series, index);
    var hidden = !!(chartState.hiddenSeries && chartState.hiddenSeries[key]);
    html += '<button type="button" class="hm-chart-legend-btn'+(hidden ? ' is-off' : '')+'" role="button" aria-pressed="'+(hidden ? 'false' : 'true')+'" aria-label="'+_chartAttrText(_chartText(series, key, key))+'" data-action="hm-chart-toggle-series" data-block-id="'+_esc(blockId || '')+'" data-series-key="'+_esc(key)+'">';
    html += '<span class="hm-chart-legend-swatch" style="background:'+_esc(series.color || _chartColor(index))+'"></span>';
    html += '<span>'+_esc(_chartText(series, key, key))+'</span>';
    html += '</button>';
  });
  html += '</div>';
  return html;
}

function _chartWindow(min, max, zoom, pan){
  var span = max - min;
  var visible = span / Math.max(zoom || 1, 1);
  var free = Math.max(span - visible, 0);
  var offset = free * _chartClamp(pan == null ? 0.5 : pan, 0, 1);
  return { min: min + offset, max: min + offset + visible };
}

function _chartTooltipAttrs(text){
  return ' data-chart-tooltip="' + _chartAttrText(text) + '" title="' + _chartAttrText(text) + '" tabindex="0"';
}

function _chartResolveCartesianSeries(config, mode){
  var chartCfg = config.chart || {};
  var series = [];
  if(mode === 'combo'){
    (config.barSeries || []).forEach(function(item, index){
      var entry = _clone(item || {});
      if(!entry.type) entry.type = 'bar';
      if(!entry.axis) entry.axis = 'left';
      if(!entry.color) entry.color = _chartColor(index, entry.color);
      series.push(entry);
    });
    (config.lineSeries || []).forEach(function(item, index){
      var lineEntry = _clone(item || {});
      if(!lineEntry.type) lineEntry.type = 'line';
      if(!lineEntry.axis) lineEntry.axis = (config.yAxisRight ? 'right' : 'left');
      if(!lineEntry.color) lineEntry.color = _chartColor(index + series.length, lineEntry.color);
      series.push(lineEntry);
    });
  }
  if(!series.length && chartCfg.series && chartCfg.series.length){
    chartCfg.series.forEach(function(item, index){
      var chartSeries = _clone(item || {});
      if(!chartSeries.type) chartSeries.type = mode === 'area' ? 'area' : (mode === 'combo' ? 'bar' : mode);
      if(!chartSeries.color) chartSeries.color = _chartColor(index, chartSeries.color);
      if(!chartSeries.axis) chartSeries.axis = chartSeries.yAxis || 'left';
      series.push(chartSeries);
    });
  }
  if(!series.length){
    series.push({
      key: config.yKey || chartCfg.yField || ((config.yAxis || {}).key) || 'value',
      label: { vi: 'Giá trị', en: 'Value' },
      color: _chartColor(0),
      type: mode === 'area' ? 'area' : (mode === 'combo' ? 'bar' : mode),
      axis: 'left'
    });
  }
  return series;
}

function _chartResolveCartesianMeta(config){
  var chartCfg = config.chart || {};
  var seriesList = Array.isArray(chartCfg.series) ? chartCfg.series : [];
  var stackMode = chartCfg.stackMode || (config.stacked ? 'normal' : 'none');
  var labelRotation = _chartNumber(chartCfg.labelRotation || 0);
  var hasSeriesStack = seriesList.some(function(series){
    return !!(series && series.stack);
  });
  return {
    xKey: (config.xAxis && config.xAxis.key) || config.xKey || chartCfg.xField || chartCfg.categoryField || 'label',
    xType: (config.xAxis && config.xAxis.type) || chartCfg.xType || 'category',
    xLabel: (config.xAxis && (config.xAxis.label || config.xAxis.title)) || config.xLabel || chartCfg.xLabel || '',
    yLabel: (config.yAxis && config.yAxis.label) || config.yLabel || chartCfg.yLabel || '',
    yFormat: (config.yAxis && config.yAxis.format) || chartCfg.yFormat || (stackMode === 'percent' ? 'percent' : ''),
    yRightLabel: (config.yAxisRight && config.yAxisRight.label) || '',
    yRightFormat: (config.yAxisRight && config.yAxisRight.format) || '',
    showLegend: chartCfg.showLegend !== false,
    showGrid: chartCfg.showGrid !== false,
    stackMode: stackMode,
    labelRotation: _chartClamp(labelRotation, -90, 90),
    showDataLabels: !!chartCfg.showDataLabels,
    stacked: !!(config.stacked || chartCfg.stacked || stackMode === 'normal' || stackMode === 'percent' || hasSeriesStack)
  };
}

function _chartResolveXLabel(value, xType){
  return xType === 'date' ? _chartDateLabel(value) : String(value == null ? '' : value);
}

function renderCartesianBarChart(config, data, state, blockId){
  return _renderCartesianChart(config, data, state, blockId, 'bar');
}

function _chartQuantile(values, q){
  var sorted = values.slice().sort(function(a, b){ return a - b; });
  var pos;
  var base;
  var rest;
  if(!sorted.length) return 0;
  pos = (sorted.length - 1) * q;
  base = Math.floor(pos);
  rest = pos - base;
  if(sorted[base + 1] !== undefined){
    return sorted[base] + (rest * (sorted[base + 1] - sorted[base]));
  }
  return sorted[base];
}

function renderHeatmapChart(config, data, state, blockId){
  var chartCfg = config && config.chart ? config.chart : {};
  var rows = _chartRows(config, data);
  var xKey = chartCfg.xField || chartCfg.categoryField || 'x';
  var yKey = chartCfg.yField || chartCfg.seriesField || 'y';
  var valueKey = chartCfg.colorField || chartCfg.valueField || chartCfg.zField || 'value';
  var scale = chartCfg.heatScale || 'amber';
  var xValues = [];
  var yValues = [];
  var matrix = {};
  var min = Infinity;
  var max = -Infinity;
  var width = 720;
  var height = 320;
  var left = 110;
  var right = 20;
  var top = 20;
  var bottom = 54;
  var plotWidth;
  var plotHeight;
  var cellWidth;
  var cellHeight;
  var svg = '';
  if(!rows.length) return _chartEmpty(_t('Không có dữ liệu', 'No data'));
  rows.forEach(function(row){
    var xVal = row[xKey] == null ? _t('Unknown', 'Unknown') : String(row[xKey]);
    var yVal = row[yKey] == null ? _t('Unknown', 'Unknown') : String(row[yKey]);
    var value = _chartNumber(row[valueKey]);
    if(xValues.indexOf(xVal) < 0) xValues.push(xVal);
    if(yValues.indexOf(yVal) < 0) yValues.push(yVal);
    matrix[yVal + '::' + xVal] = value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  if(!xValues.length || !yValues.length) return _chartEmpty(_t('Không đủ trường để vẽ heatmap', 'Heatmap fields are missing'));
  plotWidth = width - left - right;
  plotHeight = height - top - bottom;
  cellWidth = plotWidth / Math.max(xValues.length, 1);
  cellHeight = plotHeight / Math.max(yValues.length, 1);
  svg += '<div class="hm-chart-card hm-chart-card-heatmap"><div class="hm-chart-shell" role="img" aria-label="' + _chartAttrText('Heatmap chart') + '" data-chart-block-id="' + _esc(blockId || '') + '"><svg class="hm-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">';
  yValues.forEach(function(yVal, rowIndex){
    var y = top + (rowIndex * cellHeight);
    svg += '<text x="' + (left - 10) + '" y="' + (y + (cellHeight / 2) + 4).toFixed(2) + '" class="hm-chart-axis-label hm-chart-axis-label-y">' + _esc(yVal) + '</text>';
    xValues.forEach(function(xVal, colIndex){
      var x = left + (colIndex * cellWidth);
      var value = matrix[yVal + '::' + xVal];
      var fill = _chartHeatColor(value, min, max, scale);
      var tip = yVal + ' • ' + xVal + ': ' + _chartFormatValue(value, chartCfg.yFormat || config.format || '');
      svg += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + Math.max(cellWidth - 4, 8).toFixed(2) + '" height="' + Math.max(cellHeight - 4, 8).toFixed(2) + '" rx="10" fill="' + fill + '"' + _chartTooltipAttrs(tip) + '><title>' + _esc(tip) + '</title></rect>';
      if(chartCfg.showLabels){
        svg += '<text x="' + (x + (cellWidth / 2)).toFixed(2) + '" y="' + (y + (cellHeight / 2) + 4).toFixed(2) + '" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">' + _esc(_chartFormatValue(value, chartCfg.yFormat || config.format || '')) + '</text>';
      }
    });
  });
  xValues.forEach(function(xVal, colIndex){
    var x = left + (colIndex * cellWidth) + (cellWidth / 2);
    svg += '<text x="' + x.toFixed(2) + '" y="' + (top + plotHeight + 18) + '" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">' + _esc(xVal) + '</text>';
  });
  svg += '</svg></div></div>';
  return svg;
}

function renderDistributionChart(config, data, state, blockId, block){
  var distCfg = config.distribution || {};
  var variant = block && block.type ? String(block.type) : '';
  var rows = _chartRows(config, data);
  var categoryKey = distCfg.categoryField || config.categoryKey || 'category';
  var valueKey = distCfg.valueField || config.valueKey || 'value';
  var showLabels = distCfg.showLabels !== false;
  var width = 720;
  var height = 320;
  var left = 54;
  var right = 24;
  var top = 18;
  var bottom = 56;
  var plotWidth;
  var plotHeight;
  var svg = '';
  if(!rows.length) return _chartEmpty(_t('Không có dữ liệu', 'No data'));
  plotWidth = width - left - right;
  plotHeight = height - top - bottom;
  if(variant === 'chart-histogram'){
    var values = rows.map(function(row){ return _chartNumber(row[valueKey]); }).filter(function(value){ return isFinite(value); });
    var bins = Math.max(Number(distCfg.binCount || 12), 1);
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var step = (max - min) / bins || 1;
    var buckets = [];
    var maxCount = 1;
    values.forEach(function(value){
      var idx = Math.min(Math.floor((value - min) / step), bins - 1);
      if(!buckets[idx]) buckets[idx] = { label:min + (idx * step), count:0 };
      buckets[idx].count += 1;
      maxCount = Math.max(maxCount, buckets[idx].count);
    });
    svg += '<div class="hm-chart-card hm-chart-card-histogram"><div class="hm-chart-shell" role="img" aria-label="' + _chartAttrText('Histogram chart') + '" data-chart-block-id="' + _esc(blockId || '') + '"><svg class="hm-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">';
    buckets.forEach(function(bucket, index){
      var band = plotWidth / Math.max(buckets.length, 1);
      var barHeight = (bucket.count / maxCount) * plotHeight;
      var x = left + (band * index) + 6;
      var y = top + plotHeight - barHeight;
      svg += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + Math.max(band - 12, 12).toFixed(2) + '" height="' + barHeight.toFixed(2) + '" rx="8" fill="#2563eb"></rect>';
      svg += '<text x="' + (x + ((Math.max(band - 12, 12)) / 2)).toFixed(2) + '" y="' + (top + plotHeight + 18) + '" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">' + _esc(_chartFormatValue(bucket.label, 'number')) + '</text>';
      if(showLabels) svg += '<text x="' + (x + ((Math.max(band - 12, 12)) / 2)).toFixed(2) + '" y="' + (y - 8).toFixed(2) + '" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">' + _esc(String(bucket.count)) + '</text>';
    });
    svg += '</svg></div></div>';
    return svg;
  }
  if(variant === 'chart-boxplot'){
    var grouped = {};
    var groups = [];
    rows.forEach(function(row){
      var key = row[categoryKey] == null ? _t('Data', 'Data') : String(row[categoryKey]);
      if(!grouped[key]){
        grouped[key] = [];
        groups.push(key);
      }
      grouped[key].push(_chartNumber(row[valueKey]));
    });
    svg += '<div class="hm-chart-card hm-chart-card-boxplot"><div class="hm-chart-shell" role="img" aria-label="' + _chartAttrText('Box plot chart') + '" data-chart-block-id="' + _esc(blockId || '') + '"><svg class="hm-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">';
    groups.forEach(function(groupKey, index){
      var values = grouped[groupKey].slice().sort(function(a, b){ return a - b; });
      var q1 = _chartQuantile(values, 0.25);
      var median = _chartQuantile(values, 0.5);
      var q3 = _chartQuantile(values, 0.75);
      var minV = values[0];
      var maxV = values[values.length - 1];
      var globalMin = Math.min.apply(null, values);
      var globalMax = Math.max.apply(null, values);
      var band = plotWidth / Math.max(groups.length, 1);
      var cx = left + (band * index) + (band / 2);
      var yMin = _chartScaleY(minV, globalMin, globalMax, top, plotHeight);
      var yQ1 = _chartScaleY(q1, globalMin, globalMax, top, plotHeight);
      var yMedian = _chartScaleY(median, globalMin, globalMax, top, plotHeight);
      var yQ3 = _chartScaleY(q3, globalMin, globalMax, top, plotHeight);
      var yMax = _chartScaleY(maxV, globalMin, globalMax, top, plotHeight);
      svg += '<line x1="' + cx.toFixed(2) + '" y1="' + yMin.toFixed(2) + '" x2="' + cx.toFixed(2) + '" y2="' + yMax.toFixed(2) + '" class="hm-chart-axis"></line>';
      svg += '<rect x="' + (cx - 24).toFixed(2) + '" y="' + yQ3.toFixed(2) + '" width="48" height="' + Math.max(yQ1 - yQ3, 4).toFixed(2) + '" rx="10" fill="rgba(37,99,235,0.16)" stroke="#2563eb" stroke-width="2"></rect>';
      svg += '<line x1="' + (cx - 24).toFixed(2) + '" y1="' + yMedian.toFixed(2) + '" x2="' + (cx + 24).toFixed(2) + '" y2="' + yMedian.toFixed(2) + '" stroke="#0f172a" stroke-width="2"></line>';
      svg += '<text x="' + cx.toFixed(2) + '" y="' + (top + plotHeight + 18) + '" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">' + _esc(groupKey) + '</text>';
    });
    svg += '</svg></div></div>';
    return svg;
  }
  var ordered = rows.map(function(row, index){
    return {
      key: row[categoryKey] == null ? ('Item ' + (index + 1)) : String(row[categoryKey]),
      value: _chartNumber(row[valueKey])
    };
  });
  var running = 0;
  var maxAbs = 1;
  ordered.forEach(function(item){
    running += item.value;
    item.running = running;
    maxAbs = Math.max(maxAbs, Math.abs(running));
  });
  svg += '<div class="hm-chart-card hm-chart-card-waterfall"><div class="hm-chart-shell" role="img" aria-label="' + _chartAttrText('Waterfall chart') + '" data-chart-block-id="' + _esc(blockId || '') + '"><svg class="hm-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">';
  ordered.forEach(function(item, index){
    var band = plotWidth / Math.max(ordered.length, 1);
    var x = left + (band * index) + 8;
    var barWidth = Math.max(band - 16, 18);
    var startValue = item.running - item.value;
    var endValue = item.running;
    var y1 = _chartScaleY(Math.max(startValue, endValue), -maxAbs, maxAbs, top, plotHeight);
    var y2 = _chartScaleY(Math.min(startValue, endValue), -maxAbs, maxAbs, top, plotHeight);
    var color = item.value >= 0 ? '#16a34a' : '#ef4444';
    svg += '<rect x="' + x.toFixed(2) + '" y="' + Math.min(y1, y2).toFixed(2) + '" width="' + barWidth.toFixed(2) + '" height="' + Math.max(Math.abs(y2 - y1), 4).toFixed(2) + '" rx="8" fill="' + color + '"></rect>';
    svg += '<text x="' + (x + (barWidth / 2)).toFixed(2) + '" y="' + (top + plotHeight + 18) + '" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">' + _esc(item.key) + '</text>';
    if(showLabels) svg += '<text x="' + (x + (barWidth / 2)).toFixed(2) + '" y="' + (Math.min(y1, y2) - 8).toFixed(2) + '" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">' + _esc(_chartFormatValue(item.value, config.format || 'number')) + '</text>';
  });
  svg += '</svg></div></div>';
  return svg;
}

/**
 * Render a production-ready bar chart with accessible tooltips.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderBarChart(config, data, state, blockId, reactiveCtx, block){
  var chartCfg = config && config.chart ? config.chart : {};
  var type = block && block.type ? String(block.type) : '';
  var items;
  var labelKey;
  var valueKey;
  var colorKey;
  var max;
  var html;
  try{
    if(type === 'chart-control') return renderControlChart(config, data, state, blockId, reactiveCtx, block);
    if(type === 'chart-heatmap') return renderHeatmapChart(config, data, state, blockId, reactiveCtx, block);
    if(type === 'chart-waterfall' || type === 'chart-histogram' || type === 'chart-boxplot') return renderDistributionChart(config, data, state, blockId, block);
    if(type === 'chart-bubble') return renderScatterChart(config, data, state, blockId, reactiveCtx, block);
    if(type === 'chart-sparkline'){
      var sparklineConfig = _clone(config || {});
      sparklineConfig.chart = _clone(chartCfg);
      if(sparklineConfig.chart.showLegend == null) sparklineConfig.chart.showLegend = false;
      if(sparklineConfig.chart.showGrid == null) sparklineConfig.chart.showGrid = false;
      return renderLineChart(sparklineConfig, data, state, blockId, reactiveCtx, block);
    }
    if(type === 'chart-stacked-bar' || (chartCfg.series && chartCfg.series.length) || chartCfg.xField || chartCfg.stackMode === 'normal' || chartCfg.stackMode === 'percent'){
      return renderCartesianBarChart(config, data, state, blockId, reactiveCtx, block);
    }
    items = _chartRows(config, data);
    labelKey = chartCfg.labelField || chartCfg.categoryField || chartCfg.xField || config.labelKey || 'label';
    valueKey = chartCfg.valueField || chartCfg.yField || config.valueKey || 'value';
    colorKey = chartCfg.colorField || config.colorKey || '';
    if(!items.length) return _chartEmpty(_t('Không có dữ liệu','No data'));

    max = 0;
    items.forEach(function(item){
      var value = _chartNumber(item.value != null ? item.value : item[valueKey]);
      if(value > max) max = value;
    });
    if(max === 0) max = 1;

    html = '<div class="hm-bar-chart" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ cột so sánh dữ liệu', 'Bar chart comparing values'))+'" data-chart-block-id="'+_esc(blockId || '')+'">';
    items.forEach(function(item, index){
      var label = item[labelKey] != null ? String(item[labelKey]) : _chartText(item, item.label || item.name || ('Item ' + (index + 1)), item.labelEn || item.name || ('Item ' + (index + 1)));
      var value = _chartNumber(item.value != null ? item.value : item[valueKey]);
      var pct = Math.round((value / max) * 100);
      var color = item.color || (colorKey && item[colorKey]) || _chartColor(index, 'var(--brand-2)');
      var tip = label + ': ' + _chartFormatValue(value, config.format || '');
      html += '<div class="hm-bar-row">';
      html += '<span class="hm-bar-label">'+_esc(label)+'</span>';
      html += '<div class="hm-bar-track"><div class="hm-bar-fill" style="width:'+pct+'%;background:'+color+'"'+_chartTooltipAttrs(tip)+'><span class="hm-sr-only">'+_esc(tip)+'</span></div></div>';
      html += '<span class="hm-bar-value">'+_esc(_chartFormatValue(value, config.format || ''))+'</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  } catch(err){
    return _chartError('bar', err);
  }
}

function _renderCartesianChart(config, data, state, blockId, mode){
  var rows;
  var chartState;
  var meta;
  var seriesList;
  var visibleSeries;
  var width = 720;
  var height = 320;
  var left = 62;
  var right = mode === 'combo' ? 62 : 24;
  var top = 18;
  var bottom = 64;
  var plotWidth;
  var plotHeight;
  var labels = [];
  var seriesValues = {};
  var stackTotals = [];
  var stackBases = { left: [], right: [] };
  var barGroupKeys = { left: [], right: [] };
  var minLeft = 0;
  var maxLeft = 0;
  var minRight = 0;
  var maxRight = 0;
  var ticksLeft;
  var ticksRight;
  var legendHtml = '';
  var svg = '';
  try{
    rows = _chartRows(config, data);
    if(!rows.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
    chartState = _chartState(state, blockId);
    meta = _chartResolveCartesianMeta(config);
    seriesList = _chartResolveCartesianSeries(config, mode);
    visibleSeries = seriesList.filter(function(series, index){
      return !chartState.hiddenSeries[_chartSeriesKey(series, index)];
    });
    if(!visibleSeries.length) visibleSeries = seriesList.slice(0, 1);
    visibleSeries.forEach(function(series, index){
      if(series.type === 'bar'){
        barGroupKeys[series.axis === 'right' ? 'right' : 'left'].push(_chartSeriesKey(series, index));
      }
    });
    plotWidth = width - left - right;
    plotHeight = height - top - bottom;

    rows.forEach(function(row, rowIndex){
      labels.push(_chartResolveXLabel(row[meta.xKey], meta.xType));
      if(meta.stacked) stackTotals[rowIndex] = 0;
    });
    visibleSeries.forEach(function(series, seriesIndex){
      var key = _chartSeriesKey(series, seriesIndex);
      seriesValues[key] = [];
      rows.forEach(function(row, rowIndex){
        var rawValue = row[series.field || series.key || series.yKey || series.valueField || 'value'];
        var value = _chartNumber(rawValue);
        seriesValues[key].push(value);
        if(series.axis === 'right'){
          minRight = Math.min(minRight, value);
          maxRight = Math.max(maxRight, value);
        } else if(meta.stacked && (series.type === 'area' || series.type === 'bar' || mode === 'area')){
          stackTotals[rowIndex] += value;
          maxLeft = Math.max(maxLeft, stackTotals[rowIndex]);
        } else {
          minLeft = Math.min(minLeft, value);
          maxLeft = Math.max(maxLeft, value);
        }
      });
    });
    if(meta.stackMode === 'percent' && meta.stacked){
      minLeft = 0;
      maxLeft = 100;
    }
    if(maxLeft === minLeft) maxLeft = minLeft + 1;
    if(mode === 'combo' && maxRight === minRight) maxRight = minRight + 1;
    ticksLeft = _chartAxisTicks(minLeft, maxLeft, 5);
    ticksRight = mode === 'combo' ? _chartAxisTicks(minRight, maxRight, 5) : [];
    legendHtml = meta.showLegend ? _chartLegend(seriesList, chartState, blockId, _t('Chú giải chuỗi dữ liệu', 'Series legend')) : '';

    svg += '<div class="hm-chart-shell" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ dữ liệu nhiều chuỗi', 'Multi-series chart'))+'" data-chart-block-id="'+_esc(blockId || '')+'">';
    svg += '<svg class="hm-chart-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none">';
    svg += '<defs>';
    visibleSeries.forEach(function(series, index){
      var gid = 'hm_chart_fill_' + _safeBlockBindingKey((blockId || 'chart') + '_' + _chartSeriesKey(series, index));
      svg += '<linearGradient id="'+_esc(gid)+'" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="'+_esc(series.color || _chartColor(index))+'" stop-opacity="0.38"></stop><stop offset="100%" stop-color="'+_esc(series.color || _chartColor(index))+'" stop-opacity="0.04"></stop></linearGradient>';
    });
    svg += '</defs>';
    if(meta.showGrid){
      ticksLeft.forEach(function(tick){
        var gy = _chartScaleY(tick, ticksLeft[0], ticksLeft[ticksLeft.length - 1], top, plotHeight);
        svg += '<line x1="'+left+'" y1="'+gy.toFixed(2)+'" x2="'+(width - right)+'" y2="'+gy.toFixed(2)+'" class="hm-chart-gridline"></line>';
        svg += '<text x="'+(left - 10)+'" y="'+(gy + 4).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-y">'+_esc(_chartFormatValue(tick, meta.yFormat))+'</text>';
      });
      if(mode === 'combo'){
        ticksRight.forEach(function(tick){
          var gry = _chartScaleY(tick, ticksRight[0], ticksRight[ticksRight.length - 1], top, plotHeight);
          svg += '<text x="'+(width - right + 10)+'" y="'+(gry + 4).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-y">'+_esc(_chartFormatValue(tick, meta.yRightFormat))+'</text>';
        });
      }
    }
    svg += '<line x1="'+left+'" y1="'+(top + plotHeight)+'" x2="'+(width - right)+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    svg += '<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    if(mode === 'combo'){
      svg += '<line x1="'+(width - right)+'" y1="'+top+'" x2="'+(width - right)+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis hm-chart-axis-right"></line>';
    }
    if(meta.yLabel){
      svg += '<text x="16" y="'+(top + (plotHeight / 2))+'" class="hm-chart-axis-title" transform="rotate(-90 16 '+(top + (plotHeight / 2))+')">'+_esc(meta.yLabel)+'</text>';
    }
    if(meta.yRightLabel && mode === 'combo'){
      svg += '<text x="'+(width - 10)+'" y="'+(top + (plotHeight / 2))+'" class="hm-chart-axis-title" transform="rotate(90 '+(width - 10)+' '+(top + (plotHeight / 2))+')">'+_esc(meta.yRightLabel)+'</text>';
    }
    if(meta.xLabel){
      svg += '<text x="'+(left + (plotWidth / 2))+'" y="'+(height - 12)+'" class="hm-chart-axis-title">'+_esc(meta.xLabel)+'</text>';
    }
    labels.forEach(function(label, labelIndex){
      var lx = _chartScaleX(labelIndex, labels.length, left, plotWidth);
      var labelY = top + plotHeight + 18;
      var labelAttrs = meta.labelRotation ? ' transform="rotate(' + meta.labelRotation + ' ' + lx.toFixed(2) + ' ' + labelY + ')" text-anchor="' + (meta.labelRotation < 0 ? 'end' : 'start') + '"' : '';
      svg += '<text x="'+lx.toFixed(2)+'" y="'+labelY+'" class="hm-chart-axis-label hm-chart-axis-label-x"'+labelAttrs+'>'+_esc(label)+'</text>';
    });
    visibleSeries.forEach(function(series, seriesIndex){
      var key = _chartSeriesKey(series, seriesIndex);
      var points = [];
      var fillId = 'hm_chart_fill_' + _safeBlockBindingKey((blockId || 'chart') + '_' + key);
      var axisTicks = series.axis === 'right' && mode === 'combo' ? ticksRight : ticksLeft;
      var axisMin = axisTicks[0];
      var axisMax = axisTicks[axisTicks.length - 1];
      rows.forEach(function(row, rowIndex){
        var rawValue = seriesValues[key][rowIndex];
        var displayValue = rawValue;
        var plottedValue = rawValue;
        var lowerValue = 0;
        if(meta.stacked && series.axis !== 'right'){
          if(meta.stackMode === 'percent'){
            displayValue = stackTotals[rowIndex] ? ((rawValue / stackTotals[rowIndex]) * 100) : 0;
          }
          lowerValue = stackBases.left[rowIndex] || 0;
          plottedValue = displayValue + lowerValue;
        } else {
          plottedValue = displayValue;
        }
        points.push({
          x: _chartScaleX(rowIndex, labels.length, left, plotWidth),
          y: _chartScaleY(plottedValue, axisMin, axisMax, top, plotHeight),
          value: displayValue,
          rawValue: rawValue,
          plottedValue: plottedValue,
          lowerValue: lowerValue,
          label: labels[rowIndex]
        });
        if(meta.stacked && series.axis !== 'right'){
          stackBases.left[rowIndex] = plottedValue;
        }
      });
      if(series.type === 'bar'){
        var band = plotWidth / Math.max(labels.length, 1);
        var axisKey = series.axis === 'right' ? 'right' : 'left';
        var groupedKeys = meta.stacked && axisKey === 'left' ? [key] : barGroupKeys[axisKey];
        var groupCount = Math.max(groupedKeys.length || 1, 1);
        var groupIndex = Math.max(groupedKeys.indexOf(key), 0);
        var gap = groupCount > 1 ? Math.min(6, band * 0.08) : 0;
        var barWidth = groupCount > 1 ? Math.max(Math.min(((band * 0.74) - (gap * (groupCount - 1))) / groupCount, 28), 8) : Math.max(Math.min((band * 0.56), 34), 10);
        points.forEach(function(point){
          var barStart = point.x - (((barWidth * groupCount) + (gap * (groupCount - 1))) / 2);
          var barX = groupCount > 1 ? (barStart + (groupIndex * (barWidth + gap))) : (point.x - (barWidth / 2));
          var baseValue = meta.stacked && axisKey === 'left' ? point.lowerValue : 0;
          var baseY = _chartScaleY(baseValue, axisMin, axisMax, top, plotHeight);
          var tipValue = _chartFormatValue(point.value, meta.stackMode === 'percent' && meta.stacked && axisKey === 'left' ? 'percent' : (series.format || meta.yFormat));
          var tip = _chartText(series, key, key) + ' • ' + point.label + ': ' + _chartFormatValue(point.value, series.format || meta.yFormat);
          svg += '<rect x="'+barX.toFixed(2)+'" y="'+Math.min(point.y, baseY).toFixed(2)+'" width="'+barWidth.toFixed(2)+'" height="'+Math.max(Math.abs(baseY - point.y), 1).toFixed(2)+'" rx="6" fill="'+_esc(series.color || _chartColor(seriesIndex))+'" class="hm-chart-bar"'+_chartTooltipAttrs(tip)+'><title>'+_esc(tip)+'</title></rect>';
          if(meta.showDataLabels){
            svg += '<text x="'+(barX + (barWidth / 2)).toFixed(2)+'" y="'+(Math.min(point.y, baseY) - 6).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">'+_esc(tipValue)+'</text>';
          }
        });
        return;
      }
      if((mode === 'area' || series.type === 'area') && points.length){
        var areaPoints = points.map(function(point){
          return { x: point.x, y: point.y };
        });
        var lowerPoints = points.slice().reverse().map(function(point){
          return { x: point.x, y: _chartScaleY(point.lowerValue || 0, axisMin, axisMax, top, plotHeight) };
        });
        areaPoints = areaPoints.concat(lowerPoints);
        svg += '<polygon points="'+_chartPointsToString(areaPoints)+'" fill="url(#'+_esc(fillId)+')" class="hm-chart-area-fill"></polygon>';
      }
      if(points.length){
        var lineLength = _chartLineLength(points);
        svg += '<polyline points="'+_chartPointsToString(points)+'" fill="none" stroke="'+_esc(series.color || _chartColor(seriesIndex))+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="hm-chart-line-path" style="--hm-line-length:'+lineLength.toFixed(2)+'"></polyline>';
        points.forEach(function(point){
          var pointTip = _chartText(series, key, key) + ' • ' + point.label + ': ' + _chartFormatValue(point.value, series.format || meta.yFormat);
          svg += '<circle cx="'+point.x.toFixed(2)+'" cy="'+point.y.toFixed(2)+'" r="4.5" fill="'+_esc(series.color || _chartColor(seriesIndex))+'" class="hm-chart-point"'+_chartTooltipAttrs(pointTip)+'><title>'+_esc(pointTip)+'</title></circle>';
          if(meta.showDataLabels){
            svg += '<text x="'+point.x.toFixed(2)+'" y="'+(point.y - 10).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-x" text-anchor="middle">'+_esc(_chartFormatValue(point.value, series.format || meta.yFormat))+'</text>';
          }
        });
      }
    });
    svg += '</svg></div>';
    return '<div class="hm-chart-card hm-chart-card-'+_esc(mode)+'">' + legendHtml + svg + '</div>';
  } catch(err){
    return _chartError(mode, err);
  }
}

/**
 * Render a responsive line chart with legend toggles and tooltip support.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderLineChart(config, data, state, blockId){
  return _renderCartesianChart(config, data, state, blockId, 'line');
}

/**
 * Render an area chart with gradient fills and optional stacked mode.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderAreaChart(config, data, state, blockId){
  return _renderCartesianChart(config, data, state, blockId, 'area');
}

/**
 * Render a scatter chart with optional size/color encoding and zoom controls.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderScatterChart(config, data, state, blockId, reactiveCtx, block){
  var rows;
  var chartCfg;
  var chartState;
  var xKey;
  var yKey;
  var sizeKey;
  var colorKey;
  var seriesKey;
  var labelKey;
  var markerSize;
  var points = [];
  var categories = [];
  var categoryColors = {};
  var legendSeries = [];
  var domainX;
  var domainY;
  var zoomX;
  var zoomY;
  var width = 720;
  var height = 320;
  var left = 58;
  var right = 22;
  var top = 20;
  var bottom = 58;
  var plotWidth;
  var plotHeight;
  var svg = '';
  try{
    var compatRows = _chartRows(config, data);
    var compatCfg = config && config.chart ? config.chart : {};
    if(compatRows.length){
      var compatState = _chartState(state, blockId);
      var compatXKey = config.xKey || compatCfg.xField || 'x';
      var compatYKey = config.yKey || compatCfg.yField || 'y';
      var compatSizeKey = config.sizeKey || compatCfg.zField || '';
      var compatColorKey = config.colorKey || compatCfg.colorField || '';
      var compatSeriesKey = compatCfg.seriesField || '';
      var compatLabelKey = compatCfg.categoryField || compatCfg.labelField || '';
      var compatMarkerSize = _chartClamp(_chartNumber(compatCfg.markerSize || 8), 2, 40);
      var compatPoints = [];
      var compatCategories = [];
      var compatCategoryColors = {};
      var compatLegend = [];
      var compatDomainX;
      var compatDomainY;
      var compatZoomX;
      var compatZoomY;
      var compatRegression = null;
      plotWidth = width - left - right;
      plotHeight = height - top - bottom;
      compatRows.forEach(function(row){
        var rawSeries = compatSeriesKey ? row[compatSeriesKey] : null;
        var rawColor = compatColorKey ? row[compatColorKey] : '';
        var resolvedColor = (rawColor != null && /^#|^rgb|^hsl|^var\(/i.test(String(rawColor))) ? String(rawColor) : '';
        var cat = rawSeries != null && rawSeries !== '' ? String(rawSeries) : (!resolvedColor && rawColor != null && rawColor !== '' ? String(rawColor) : _t('Dữ liệu', 'Data'));
        if(compatCategories.indexOf(cat) < 0) compatCategories.push(cat);
        if(resolvedColor && !compatCategoryColors[cat]) compatCategoryColors[cat] = resolvedColor;
        compatPoints.push({
          rawX: _chartNumber(row[compatXKey]),
          rawY: _chartNumber(row[compatYKey]),
          size: compatSizeKey ? _chartNumber(row[compatSizeKey]) : compatMarkerSize,
          category: cat,
          color: resolvedColor,
          label: compatLabelKey && row[compatLabelKey] != null ? String(row[compatLabelKey]) : ''
        });
      });
      if(!compatPoints.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
      compatLegend = compatCategories.map(function(cat, index){
        return { key: cat, label: { vi: cat, en: cat }, color: compatCategoryColors[cat] || _chartColor(index) };
      });
      compatPoints = compatPoints.filter(function(point){
        return !compatState.hiddenSeries[point.category];
      });
      if(!compatPoints.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
      compatDomainX = { min: compatPoints[0].rawX, max: compatPoints[0].rawX };
      compatDomainY = { min: compatPoints[0].rawY, max: compatPoints[0].rawY };
      compatPoints.forEach(function(point){
        compatDomainX.min = Math.min(compatDomainX.min, point.rawX);
        compatDomainX.max = Math.max(compatDomainX.max, point.rawX);
        compatDomainY.min = Math.min(compatDomainY.min, point.rawY);
        compatDomainY.max = Math.max(compatDomainY.max, point.rawY);
      });
      compatZoomX = _chartWindow(compatDomainX.min, compatDomainX.max, compatState.zoom || 1, compatState.panX);
      compatZoomY = _chartWindow(compatDomainY.min, compatDomainY.max, compatState.zoom || 1, compatState.panY);
      if(compatCfg.showRegression && compatPoints.length > 1){
        var sumX = 0;
        var sumY = 0;
        var sumXY = 0;
        var sumXX = 0;
        var count = 0;
        compatPoints.forEach(function(point){
          if(point.rawX < compatZoomX.min || point.rawX > compatZoomX.max || point.rawY < compatZoomY.min || point.rawY > compatZoomY.max) return;
          sumX += point.rawX;
          sumY += point.rawY;
          sumXY += point.rawX * point.rawY;
          sumXX += point.rawX * point.rawX;
          count += 1;
        });
        if(count > 1){
          var denom = (count * sumXX) - (sumX * sumX);
          if(denom){
            var slope = ((count * sumXY) - (sumX * sumY)) / denom;
            var intercept = (sumY - (slope * sumX)) / count;
            compatRegression = {
              x1: compatZoomX.min,
              y1: (slope * compatZoomX.min) + intercept,
              x2: compatZoomX.max,
              y2: (slope * compatZoomX.max) + intercept
            };
          }
        }
      }

      svg += '<div class="hm-chart-card hm-chart-card-scatter">';
      svg += '<div class="hm-chart-toolbar" role="toolbar" aria-label="'+_chartAttrText(_t('Điều khiển biểu đồ scatter', 'Scatter chart controls'))+'">';
      svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-zoom" data-block-id="'+_esc(blockId || '')+'" data-delta="-1">-</button>';
      svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-zoom" data-block-id="'+_esc(blockId || '')+'" data-delta="1">+</button>';
      svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-pan" data-block-id="'+_esc(blockId || '')+'" data-axis="x" data-delta="-0.1">â—€</button>';
      svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-pan" data-block-id="'+_esc(blockId || '')+'" data-axis="x" data-delta="0.1">â–¶</button>';
      svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-reset-view" data-block-id="'+_esc(blockId || '')+'">'+_t('Reset','Reset')+'</button>';
      svg += '</div>';
      if(compatCfg.showLegend !== false){
        svg += _chartLegend(compatLegend, compatState, blockId, _t('Chú giải scatter', 'Scatter legend'));
      }
      svg += '<div class="hm-chart-shell" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ scatter tương quan dữ liệu', 'Scatter chart showing data correlation'))+'" data-chart-block-id="'+_esc(blockId || '')+'">';
      svg += '<svg class="hm-chart-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none">';
      _chartAxisTicks(compatZoomY.min, compatZoomY.max, 5).forEach(function(tick){
        var y = _chartScaleY(tick, compatZoomY.min, compatZoomY.max, top, plotHeight);
        svg += '<line x1="'+left+'" y1="'+y.toFixed(2)+'" x2="'+(width - right)+'" y2="'+y.toFixed(2)+'" class="hm-chart-gridline"></line>';
        svg += '<text x="'+(left - 10)+'" y="'+(y + 4).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-y">'+_esc(_chartFormatValue(tick, compatCfg.yFormat || ''))+'</text>';
      });
      _chartAxisTicks(compatZoomX.min, compatZoomX.max, 5).forEach(function(tick){
        var x = left + (((tick - compatZoomX.min) / Math.max(compatZoomX.max - compatZoomX.min, 1)) * plotWidth);
        svg += '<line x1="'+x.toFixed(2)+'" y1="'+top+'" x2="'+x.toFixed(2)+'" y2="'+(top + plotHeight)+'" class="hm-chart-gridline"></line>';
        svg += '<text x="'+x.toFixed(2)+'" y="'+(top + plotHeight + 18)+'" class="hm-chart-axis-label hm-chart-axis-label-x">'+_esc(_chartFormatValue(tick, compatCfg.xFormat || ''))+'</text>';
      });
      svg += '<line x1="'+left+'" y1="'+(top + plotHeight)+'" x2="'+(width - right)+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
      svg += '<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
      if(compatRegression && isFinite(compatRegression.y1) && isFinite(compatRegression.y2)){
        var regX1 = left + (((compatRegression.x1 - compatZoomX.min) / Math.max(compatZoomX.max - compatZoomX.min, 1)) * plotWidth);
        var regX2 = left + (((compatRegression.x2 - compatZoomX.min) / Math.max(compatZoomX.max - compatZoomX.min, 1)) * plotWidth);
        var regY1 = _chartScaleY(compatRegression.y1, compatZoomY.min, compatZoomY.max, top, plotHeight);
        var regY2 = _chartScaleY(compatRegression.y2, compatZoomY.min, compatZoomY.max, top, plotHeight);
        svg += '<line x1="'+regX1.toFixed(2)+'" y1="'+regY1.toFixed(2)+'" x2="'+regX2.toFixed(2)+'" y2="'+regY2.toFixed(2)+'" stroke="#f97316" stroke-width="2.5" stroke-dasharray="6 4"></line>';
      }
      compatPoints.forEach(function(point){
        var px;
        var py;
        var radius;
        var color;
        var tip;
        if(point.rawX < compatZoomX.min || point.rawX > compatZoomX.max || point.rawY < compatZoomY.min || point.rawY > compatZoomY.max) return;
        px = left + (((point.rawX - compatZoomX.min) / Math.max(compatZoomX.max - compatZoomX.min, 1)) * plotWidth);
        py = _chartScaleY(point.rawY, compatZoomY.min, compatZoomY.max, top, plotHeight);
        radius = compatSizeKey ? _chartClamp((point.size / 10), 4, 18) : compatMarkerSize;
        color = point.color || compatCategoryColors[point.category] || _chartColor(compatCategories.indexOf(point.category));
        tip = point.category + ' • X: ' + _chartFormatValue(point.rawX, compatCfg.xFormat || '') + ' • Y: ' + _chartFormatValue(point.rawY, compatCfg.yFormat || '');
        svg += '<circle cx="'+px.toFixed(2)+'" cy="'+py.toFixed(2)+'" r="'+radius.toFixed(2)+'" fill="'+_esc(color)+'" fill-opacity="0.56" stroke="'+_esc(color)+'" stroke-width="1.5" class="hm-chart-scatter-point"'+_chartTooltipAttrs(tip)+'><title>'+_esc(tip)+'</title></circle>';
        if(compatCfg.showLabels && point.label){
          svg += '<text x="'+(px + radius + 4).toFixed(2)+'" y="'+(py - 4).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-x">'+_esc(point.label)+'</text>';
        }
      });
      if(config.xLabel || compatCfg.xLabel){
        svg += '<text x="'+(left + (plotWidth / 2))+'" y="'+(height - 12)+'" class="hm-chart-axis-title">'+_esc(config.xLabel || compatCfg.xLabel)+'</text>';
      }
      if(config.yLabel || compatCfg.yLabel){
        svg += '<text x="16" y="'+(top + (plotHeight / 2))+'" class="hm-chart-axis-title" transform="rotate(-90 16 '+(top + (plotHeight / 2))+')">'+_esc(config.yLabel || compatCfg.yLabel)+'</text>';
      }
      svg += '</svg></div></div>';
      return svg;
    }
    rows = _chartRows(config, data);
    if(!rows.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
    chartCfg = config.chart || {};
    chartState = _chartState(state, blockId);
    xKey = config.xKey || chartCfg.xField || 'x';
    yKey = config.yKey || chartCfg.yField || 'y';
    sizeKey = config.sizeKey || chartCfg.zField || '';
    colorKey = config.colorKey || chartCfg.colorField || '';
    seriesKey = chartCfg.seriesField || colorKey || '';
    labelKey = chartCfg.categoryField || chartCfg.labelField || '';
    markerSize = _chartClamp(_chartNumber(chartCfg.markerSize || 8), 2, 40);
    plotWidth = width - left - right;
    plotHeight = height - top - bottom;
    rows.forEach(function(row){
      var cat = colorKey ? (row[colorKey] == null ? _t('Không xác định', 'Unknown') : String(row[colorKey])) : _t('Dữ liệu', 'Data');
      if(categories.indexOf(cat) < 0) categories.push(cat);
      points.push({
        rawX: _chartNumber(row[xKey]),
        rawY: _chartNumber(row[yKey]),
        size: sizeKey ? _chartNumber(row[sizeKey]) : 8,
        category: cat
      });
    });
    if(!points.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
    legendSeries = categories.map(function(cat, index){
      return { key: cat, label: { vi: cat, en: cat }, color: _chartColor(index) };
    });
    points = points.filter(function(point){ return !chartState.hiddenSeries[point.category]; });
    domainX = { min: points[0].rawX, max: points[0].rawX };
    domainY = { min: points[0].rawY, max: points[0].rawY };
    points.forEach(function(point){
      domainX.min = Math.min(domainX.min, point.rawX);
      domainX.max = Math.max(domainX.max, point.rawX);
      domainY.min = Math.min(domainY.min, point.rawY);
      domainY.max = Math.max(domainY.max, point.rawY);
    });
    zoomX = _chartWindow(domainX.min, domainX.max, chartState.zoom || 1, chartState.panX);
    zoomY = _chartWindow(domainY.min, domainY.max, chartState.zoom || 1, chartState.panY);

    svg += '<div class="hm-chart-card hm-chart-card-scatter">';
    svg += '<div class="hm-chart-toolbar" role="toolbar" aria-label="'+_chartAttrText(_t('Điều khiển biểu đồ scatter', 'Scatter chart controls'))+'">';
    svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-zoom" data-block-id="'+_esc(blockId || '')+'" data-delta="-1">-</button>';
    svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-zoom" data-block-id="'+_esc(blockId || '')+'" data-delta="1">+</button>';
    svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-pan" data-block-id="'+_esc(blockId || '')+'" data-axis="x" data-delta="-0.1">◀</button>';
    svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-pan" data-block-id="'+_esc(blockId || '')+'" data-axis="x" data-delta="0.1">▶</button>';
    svg += '<button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-chart-reset-view" data-block-id="'+_esc(blockId || '')+'">'+_t('Reset','Reset')+'</button>';
    svg += '</div>';
    svg += _chartLegend(legendSeries, chartState, blockId, _t('Chú giải scatter', 'Scatter legend'));
    svg += '<div class="hm-chart-shell" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ scatter tương quan dữ liệu', 'Scatter chart showing data correlation'))+'" data-chart-block-id="'+_esc(blockId || '')+'">';
    svg += '<svg class="hm-chart-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none">';
    _chartAxisTicks(zoomY.min, zoomY.max, 5).forEach(function(tick){
      var y = _chartScaleY(tick, zoomY.min, zoomY.max, top, plotHeight);
      svg += '<line x1="'+left+'" y1="'+y.toFixed(2)+'" x2="'+(width - right)+'" y2="'+y.toFixed(2)+'" class="hm-chart-gridline"></line>';
      svg += '<text x="'+(left - 10)+'" y="'+(y + 4).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-y">'+_esc(_chartFormatValue(tick, chartCfg.yFormat || ''))+'</text>';
    });
    _chartAxisTicks(zoomX.min, zoomX.max, 5).forEach(function(tick){
      var x = left + (((tick - zoomX.min) / Math.max(zoomX.max - zoomX.min, 1)) * plotWidth);
      svg += '<line x1="'+x.toFixed(2)+'" y1="'+top+'" x2="'+x.toFixed(2)+'" y2="'+(top + plotHeight)+'" class="hm-chart-gridline"></line>';
      svg += '<text x="'+x.toFixed(2)+'" y="'+(top + plotHeight + 18)+'" class="hm-chart-axis-label hm-chart-axis-label-x">'+_esc(_chartFormatValue(tick, chartCfg.xFormat || ''))+'</text>';
    });
    svg += '<line x1="'+left+'" y1="'+(top + plotHeight)+'" x2="'+(width - right)+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    svg += '<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    points.forEach(function(point){
      var px;
      var py;
      var radius;
      var tip;
      if(point.rawX < zoomX.min || point.rawX > zoomX.max || point.rawY < zoomY.min || point.rawY > zoomY.max) return;
      px = left + (((point.rawX - zoomX.min) / Math.max(zoomX.max - zoomX.min, 1)) * plotWidth);
      py = _chartScaleY(point.rawY, zoomY.min, zoomY.max, top, plotHeight);
      radius = sizeKey ? _chartClamp((point.size / 10), 4, 14) : 6;
      tip = point.category + ' • X: ' + _chartFormatValue(point.rawX, chartCfg.xFormat || '') + ' • Y: ' + _chartFormatValue(point.rawY, chartCfg.yFormat || '');
      svg += '<circle cx="'+px.toFixed(2)+'" cy="'+py.toFixed(2)+'" r="'+radius.toFixed(2)+'" fill="'+_esc(_chartColor(categories.indexOf(point.category)))+'" fill-opacity="0.56" stroke="'+_esc(_chartColor(categories.indexOf(point.category)))+'" stroke-width="1.5" class="hm-chart-scatter-point"'+_chartTooltipAttrs(tip)+'><title>'+_esc(tip)+'</title></circle>';
    });
    if(config.xLabel || chartCfg.xLabel){
      svg += '<text x="'+(left + (plotWidth / 2))+'" y="'+(height - 12)+'" class="hm-chart-axis-title">'+_esc(config.xLabel || chartCfg.xLabel)+'</text>';
    }
    if(config.yLabel || chartCfg.yLabel){
      svg += '<text x="16" y="'+(top + (plotHeight / 2))+'" class="hm-chart-axis-title" transform="rotate(-90 16 '+(top + (plotHeight / 2))+')">'+_esc(config.yLabel || chartCfg.yLabel)+'</text>';
    }
    svg += '</svg></div></div>';
    return svg;
  } catch(err){
    return _chartError('scatter', err);
  }
}

/**
 * Render a radar chart for multi-dimension comparisons.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderRadarChart(config, data, state, blockId){
  var dims;
  var seriesList;
  var chartState;
  var width = 420;
  var height = 320;
  var cx = 170;
  var cy = 156;
  var radius = 108;
  var svg = '';
  try{
    var compatCfg = config && config.chart ? config.chart : {};
    var compatRows = _chartRows(config, data);
    var compatDims = ((config.dimensions || compatCfg.dimensions) || []).slice();
    var compatSeries = ((config.series || compatCfg.series) || []).slice();
    if(!compatDims.length && compatRows.length){
      var compatCategoryKey = compatCfg.categoryField || compatCfg.xField || 'category';
      var compatValueKey = compatCfg.yField || compatCfg.valueField || 'value';
      var compatSeriesKey = compatCfg.seriesField || '';
      var compatColorKey = compatCfg.colorField || '';
      var compatDimOrder = [];
      var compatDimMax = {};
      var compatSeriesMap = {};
      var compatSeriesOrder = [];
      if(compatSeriesKey && compatRows[0] && compatRows[0][compatCategoryKey] != null && compatRows[0][compatValueKey] != null){
        compatRows.forEach(function(row){
          var dimKey = row[compatCategoryKey] == null ? _t('Không xác định', 'Unknown') : String(row[compatCategoryKey]);
          var seriesKeyValue = row[compatSeriesKey] == null ? _t('Dữ liệu', 'Data') : String(row[compatSeriesKey]);
          var rawColor = compatColorKey ? row[compatColorKey] : '';
          var resolvedColor = (rawColor != null && /^#|^rgb|^hsl|^var\(/i.test(String(rawColor))) ? String(rawColor) : '';
          var value = _chartNumber(row[compatValueKey]);
          if(compatDimOrder.indexOf(dimKey) < 0) compatDimOrder.push(dimKey);
          compatDimMax[dimKey] = Math.max(compatDimMax[dimKey] || 0, value);
          if(!compatSeriesMap[seriesKeyValue]){
            compatSeriesMap[seriesKeyValue] = {
              key: seriesKeyValue,
              label: { vi: seriesKeyValue, en: seriesKeyValue },
              color: resolvedColor || _chartColor(compatSeriesOrder.length),
              values: {}
            };
            compatSeriesOrder.push(seriesKeyValue);
          }
          compatSeriesMap[seriesKeyValue].values[dimKey] = value;
          if(resolvedColor) compatSeriesMap[seriesKeyValue].color = resolvedColor;
        });
        compatDims = compatDimOrder.map(function(dimKey){
          return {
            key: dimKey,
            label: { vi: dimKey, en: dimKey },
            max: Math.max(compatDimMax[dimKey] || 0, 1)
          };
        });
        compatSeries = compatSeriesOrder.map(function(seriesKeyValue){
          return compatSeriesMap[seriesKeyValue];
        });
      }
    }
    if(!compatDims.length && compatRows.length && typeof compatRows[0] === 'object'){
      Object.keys(compatRows[0]).forEach(function(key){
        if(typeof compatRows[0][key] === 'number') compatDims.push({ key:key, label:{ vi:key, en:key }, max:Math.max(_chartNumber(compatRows[0][key]), 1) });
      });
    }
    if(!compatSeries.length && compatRows.length){
      compatRows.slice(0, 6).forEach(function(row, index){
        compatSeries.push({
          key: row.id || ('series_' + index),
          label: { vi: row.name || row.label || ('Series ' + (index + 1)), en: row.name || row.label || ('Series ' + (index + 1)) },
          color: _chartColor(index),
          values: row
        });
      });
    }
    if(compatDims.length && compatSeries.length){
      var compatState = _chartState(state, blockId);
      var compatLegend = compatCfg.showLegend === false ? '' : _chartLegend(compatSeries, compatState, blockId, _t('Chú giải radar', 'Radar legend'));
      svg += '<div class="hm-chart-card hm-chart-card-radar">';
      svg += compatLegend;
      svg += '<div class="hm-chart-shell" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ radar so sánh đa tiêu chí', 'Radar chart comparing multiple dimensions'))+'" data-chart-block-id="'+_esc(blockId || '')+'">';
      svg += '<svg class="hm-chart-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet">';
      [0.2,0.4,0.6,0.8,1].forEach(function(level){
        var ringPoints = [];
        compatDims.forEach(function(dim, dimIndex){
          var angle = (-Math.PI / 2) + ((Math.PI * 2 * dimIndex) / compatDims.length);
          ringPoints.push({ x: cx + (Math.cos(angle) * radius * level), y: cy + (Math.sin(angle) * radius * level) });
        });
        svg += '<polygon points="'+_chartPointsToString(ringPoints)+'" class="hm-chart-radar-ring"></polygon>';
      });
      compatDims.forEach(function(dim, dimIndex){
        var angle = (-Math.PI / 2) + ((Math.PI * 2 * dimIndex) / compatDims.length);
        var lx = cx + (Math.cos(angle) * radius);
        var ly = cy + (Math.sin(angle) * radius);
        var tx = cx + (Math.cos(angle) * (radius + 20));
        var ty = cy + (Math.sin(angle) * (radius + 20));
        svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+lx.toFixed(2)+'" y2="'+ly.toFixed(2)+'" class="hm-chart-axis"></line>';
        svg += '<text x="'+tx.toFixed(2)+'" y="'+ty.toFixed(2)+'" class="hm-chart-axis-label">'+_esc(_chartText(dim, dim.key, dim.key))+'</text>';
      });
      compatSeries.forEach(function(series, seriesIndex){
        var hidden = !!compatState.hiddenSeries[_chartSeriesKey(series, seriesIndex)];
        var polygonPoints = [];
        if(hidden) return;
        compatDims.forEach(function(dim, dimIndex){
          var rawValue = series.values && typeof series.values === 'object' ? series.values[dim.key] : (Array.isArray(series.values) ? series.values[dimIndex] : 0);
          var maxValue = _chartNumber(dim.max || 100) || 100;
          var pct = _chartClamp(_chartNumber(rawValue) / maxValue, 0, 1);
          var angle = (-Math.PI / 2) + ((Math.PI * 2 * dimIndex) / compatDims.length);
          var px = cx + (Math.cos(angle) * radius * pct);
          var py = cy + (Math.sin(angle) * radius * pct);
          var tip = _chartText(series, series.key || ('Series ' + (seriesIndex + 1)), series.key || ('Series ' + (seriesIndex + 1))) + ' • ' + _chartText(dim, dim.key, dim.key) + ': ' + _chartFormatValue(rawValue, config.format || compatCfg.yFormat || '');
          polygonPoints.push({ x:px, y:py });
          svg += '<circle cx="'+px.toFixed(2)+'" cy="'+py.toFixed(2)+'" r="4" fill="'+_esc(series.color || _chartColor(seriesIndex))+'" class="hm-chart-point"'+_chartTooltipAttrs(tip)+'><title>'+_esc(tip)+'</title></circle>';
          if(compatCfg.showLabels){
            svg += '<text x="'+(px + 6).toFixed(2)+'" y="'+(py - 4).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-x">'+_esc(_chartFormatValue(rawValue, config.format || compatCfg.yFormat || ''))+'</text>';
          }
        });
        svg += '<polygon points="'+_chartPointsToString(polygonPoints)+'" fill="'+_esc(series.color || _chartColor(seriesIndex))+'" fill-opacity="'+(compatCfg.radarFill === false ? '0.08' : '0.18')+'" stroke="'+_esc(series.color || _chartColor(seriesIndex))+'" stroke-width="2.5" class="hm-chart-radar-polygon"></polygon>';
      });
      svg += '</svg></div></div>';
      return svg;
    }
    dims = (config.dimensions || []).slice();
    if(!dims.length){
      var radarRows = _chartRows(config, data);
      if(radarRows.length && typeof radarRows[0] === 'object'){
        Object.keys(radarRows[0]).forEach(function(key){
          if(typeof radarRows[0][key] === 'number') dims.push({ key:key, label:key, max:100 });
        });
      }
    }
    if(!dims.length) return _chartEmpty(_t('Chưa cấu hình trục radar', 'Radar axes are not configured'));
    seriesList = (config.series || []).slice();
    if(!seriesList.length){
      _chartRows(config, data).slice(0, 3).forEach(function(row, index){
        seriesList.push({
          key: row.id || ('series_' + index),
          label: row.name || row.label || ('Series ' + (index + 1)),
          color: _chartColor(index),
          values: row
        });
      });
    }
    if(!seriesList.length) return _chartEmpty(_t('Không có dữ liệu', 'No data'));
    chartState = _chartState(state, blockId);
    svg += '<div class="hm-chart-card hm-chart-card-radar">';
    svg += _chartLegend(seriesList, chartState, blockId, _t('Chú giải radar', 'Radar legend'));
    svg += '<div class="hm-chart-shell" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ radar so sánh đa tiêu chí', 'Radar chart comparing multiple dimensions'))+'" data-chart-block-id="'+_esc(blockId || '')+'">';
    svg += '<svg class="hm-chart-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet">';
    [0.2,0.4,0.6,0.8,1].forEach(function(level){
      var ringPoints = [];
      dims.forEach(function(dim, dimIndex){
        var angle = (-Math.PI / 2) + ((Math.PI * 2 * dimIndex) / dims.length);
        ringPoints.push({ x: cx + (Math.cos(angle) * radius * level), y: cy + (Math.sin(angle) * radius * level) });
      });
      svg += '<polygon points="'+_chartPointsToString(ringPoints)+'" class="hm-chart-radar-ring"></polygon>';
    });
    dims.forEach(function(dim, dimIndex){
      var angle = (-Math.PI / 2) + ((Math.PI * 2 * dimIndex) / dims.length);
      var lx = cx + (Math.cos(angle) * radius);
      var ly = cy + (Math.sin(angle) * radius);
      var tx = cx + (Math.cos(angle) * (radius + 20));
      var ty = cy + (Math.sin(angle) * (radius + 20));
      svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+lx.toFixed(2)+'" y2="'+ly.toFixed(2)+'" class="hm-chart-axis"></line>';
      svg += '<text x="'+tx.toFixed(2)+'" y="'+ty.toFixed(2)+'" class="hm-chart-axis-label">'+_esc(_chartText(dim, dim.key, dim.key))+'</text>';
    });
    seriesList.forEach(function(series, seriesIndex){
      var hidden = !!chartState.hiddenSeries[_chartSeriesKey(series, seriesIndex)];
      var polygonPoints = [];
      if(hidden) return;
      dims.forEach(function(dim, dimIndex){
        var rawValue = series.values && typeof series.values === 'object' ? series.values[dim.key] : (Array.isArray(series.values) ? series.values[dimIndex] : 0);
        var maxValue = _chartNumber(dim.max || 100) || 100;
        var pct = _chartClamp(_chartNumber(rawValue) / maxValue, 0, 1);
        var angle = (-Math.PI / 2) + ((Math.PI * 2 * dimIndex) / dims.length);
        var px = cx + (Math.cos(angle) * radius * pct);
        var py = cy + (Math.sin(angle) * radius * pct);
        var tip = _chartText(series, series.key || ('Series ' + (seriesIndex + 1)), series.key || ('Series ' + (seriesIndex + 1))) + ' • ' + _chartText(dim, dim.key, dim.key) + ': ' + _chartFormatValue(rawValue, config.format || '');
        polygonPoints.push({ x:px, y:py });
        svg += '<circle cx="'+px.toFixed(2)+'" cy="'+py.toFixed(2)+'" r="4" fill="'+_esc(series.color || _chartColor(seriesIndex))+'" class="hm-chart-point"'+_chartTooltipAttrs(tip)+'><title>'+_esc(tip)+'</title></circle>';
      });
      svg += '<polygon points="'+_chartPointsToString(polygonPoints)+'" fill="'+_esc(series.color || _chartColor(seriesIndex))+'" fill-opacity="'+(config.radarFill === false ? '0.08' : '0.18')+'" stroke="'+_esc(series.color || _chartColor(seriesIndex))+'" stroke-width="2.5" class="hm-chart-radar-polygon"></polygon>';
    });
    svg += '</svg></div></div>';
    return svg;
  } catch(err){
    return _chartError('radar', err);
  }
}

/**
 * Render a mixed combo chart with bar and line series plus dual Y axes.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderComboChart(config, data, state, blockId){
  return _renderCartesianChart(config, data, state, blockId, 'combo');
}

function _spcMean(values){
  if(!values || !values.length) return 0;
  return values.reduce(function(sum, value){ return sum + _chartNumber(value); }, 0) / values.length;
}

function _spcStddev(values){
  var mean;
  if(!values || values.length < 2) return 0;
  mean = _spcMean(values);
  return Math.sqrt(values.reduce(function(sum, value){
    return sum + Math.pow(_chartNumber(value) - mean, 2);
  }, 0) / (values.length - 1));
}

function _spcRange(values){
  if(!values || !values.length) return 0;
  return Math.max.apply(null, values) - Math.min.apply(null, values);
}

function _spcSubgroups(rows, valueKey, subgroupSize, subgroupField, timestampField){
  var groups = [];
  var map = {};
  if(subgroupField){
    rows.forEach(function(row){
      var key = row[subgroupField];
      if(map[key] == null){
        map[key] = { key:key, values:[], rows:[] };
        groups.push(map[key]);
      }
      map[key].values.push(_chartNumber(row[valueKey]));
      map[key].rows.push(row);
    });
  } else {
    rows.forEach(function(row, index){
      var bucket = Math.floor(index / Math.max(subgroupSize || 1, 1));
      if(!groups[bucket]) groups[bucket] = { key: bucket + 1, values:[], rows:[] };
      groups[bucket].values.push(_chartNumber(row[valueKey]));
      groups[bucket].rows.push(row);
    });
  }
  return groups.filter(function(group){ return group && group.values && group.values.length; }).map(function(group, index){
    return {
      key: group.key != null ? group.key : (index + 1),
      values: group.values,
      rows: group.rows,
      mean: _spcMean(group.values),
      range: _spcRange(group.values),
      stddev: _spcStddev(group.values),
      timestamp: group.rows[0] && timestampField ? group.rows[0][timestampField] : ''
    };
  });
}

function _spcResolveLimits(values, limits){
  var mean = _spcMean(values);
  var sigma = _spcStddev(values);
  var cl = limits && limits.cl !== undefined && limits.cl !== 'auto' ? _chartNumber(limits.cl) : mean;
  var ucl = limits && limits.ucl !== undefined && limits.ucl !== 'auto' ? _chartNumber(limits.ucl) : (cl + (3 * sigma));
  var lcl = limits && limits.lcl !== undefined && limits.lcl !== 'auto' ? _chartNumber(limits.lcl) : (cl - (3 * sigma));
  return {
    cl: cl,
    ucl: ucl,
    lcl: lcl,
    sigma: sigma
  };
}

function _spcRuleViolations(values, limits, preset){
  var status = {};
  var messages = {};
  var rulePreset = preset || 'western-electric';
  var runThreshold = rulePreset === 'nelson' ? 9 : 7;
  var runSide = [];
  var i;
  for(i = 0; i < values.length; i++){
    if(values[i] > limits.ucl || values[i] < limits.lcl){
      status[i] = 'critical';
      messages[i] = _t('Điểm vượt giới hạn kiểm soát', 'Point is outside the control limits');
    }
    runSide[i] = values[i] >= limits.cl ? 1 : -1;
  }
  for(i = runThreshold - 1; i < runSide.length; i++){
    var start = i - runThreshold + 1;
    var sameSide = true;
    var j;
    for(j = start + 1; j <= i; j++){
      if(runSide[j] !== runSide[start]){
        sameSide = false;
        break;
      }
    }
    if(sameSide){
      for(j = start; j <= i; j++){
        if(status[j] !== 'critical'){
          status[j] = 'warning';
          messages[j] = _t('Chuỗi điểm liên tiếp cùng một phía center line', 'Run of points on the same side of the center line');
        }
      }
    }
  }
  return { status: status, messages: messages };
}

function _spcNormalizeChartMode(mode){
  var normalized = String(mode || 'individual').toLowerCase();
  if(normalized === 'xbar-r' || normalized === 'xbar-s' || normalized === 'xbar') return 'xbar';
  if(normalized === 'moving-range' || normalized === 'moving_range' || normalized === 'mr') return 'moving_range';
  if(normalized === 'range' || normalized === 'r') return 'range';
  if(normalized === 'np' || normalized === 'p') return normalized;
  return 'individual';
}

function _spcFirstNumericField(rows, fieldName, fallback){
  var i;
  if(!fieldName) return fallback;
  for(i = 0; i < rows.length; i++){
    if(rows[i] && rows[i][fieldName] != null && rows[i][fieldName] !== ''){
      var value = Number(rows[i][fieldName]);
      if(!isNaN(value)) return value;
    }
  }
  return fallback;
}

function _spcSeriesFromConfig(config, rows){
  var spcCfg = config.spc || {};
  var rawChartType = config.chartType || spcCfg.chartMode || 'individual';
  var chartType = _spcNormalizeChartMode(rawChartType);
  var valueKey = config.measurementKey || spcCfg.valueField || 'measured_value';
  var sampleField = config.sampleKey || spcCfg.sampleField || '';
  var subgroupSize = Number(config.subgroupSize || spcCfg.subgroupSize || 5);
  var subgroupField = config.subgroupKey || spcCfg.subgroupField || '';
  var timestampField = config.timestampKey || spcCfg.timestampField || 'measured_at';
  var subgroups = _spcSubgroups(rows, valueKey, subgroupSize, subgroupField, timestampField);
  var values = [];
  var labels = [];
  var tooltips = [];
  var limitSourceRows = rows;
  if(chartType === 'xbar'){
    limitSourceRows = subgroups.map(function(group){ return group.rows[0] || {}; });
    subgroups.forEach(function(group){
      values.push(group.mean);
      labels.push(String(group.key));
      tooltips.push(_t('Subgroup', 'Subgroup') + ' #' + group.key + ' • Mean: ' + _chartFormatValue(group.mean, config.format || '') + ' • Range: ' + _chartFormatValue(group.range, config.format || ''));
    });
  } else if(chartType === 'range'){
    limitSourceRows = subgroups.map(function(group){ return group.rows[0] || {}; });
    subgroups.forEach(function(group){
      values.push(group.range);
      labels.push(String(group.key));
      tooltips.push(_t('Subgroup', 'Subgroup') + ' #' + group.key + ' • Range: ' + _chartFormatValue(group.range, config.format || ''));
    });
  } else if(chartType === 'moving_range'){
    rows.forEach(function(row, index){
      if(index === 0) return;
      var current = _chartNumber(row[valueKey]);
      var previous = _chartNumber(rows[index - 1][valueKey]);
      values.push(Math.abs(current - previous));
      labels.push(String(index + 1));
      tooltips.push(_t('Moving range', 'Moving range') + ': ' + _chartFormatValue(Math.abs(current - previous), config.format || ''));
    });
  } else if(chartType === 'np' || chartType === 'p'){
    rows.forEach(function(row, index){
      values.push(_chartNumber(row[valueKey]));
      labels.push(String(sampleField && row[sampleField] != null ? row[sampleField] : (row[subgroupField] != null ? row[subgroupField] : (index + 1))));
      tooltips.push((row[timestampField] ? _chartDateLabel(row[timestampField]) + ' • ' : '') + _chartFormatValue(row[valueKey], config.format || ''));
    });
  } else {
    rows.forEach(function(row, index){
      values.push(_chartNumber(row[valueKey]));
      labels.push(String(sampleField && row[sampleField] != null ? row[sampleField] : (row[subgroupField] != null ? row[subgroupField] : (index + 1))));
      tooltips.push((row[timestampField] ? _chartDateLabel(row[timestampField]) + ' • ' : '') + _chartFormatValue(row[valueKey], config.format || ''));
    });
  }
  return {
    chartType: chartType,
    rawChartType: rawChartType,
    values: values,
    labels: labels,
    tooltips: tooltips,
    subgroups: subgroups,
    valueKey: valueKey,
    limitsFromFields: {
      ucl: _spcFirstNumericField(limitSourceRows, spcCfg.uclField, null),
      lcl: _spcFirstNumericField(limitSourceRows, spcCfg.lclField, null),
      cl: _spcFirstNumericField(limitSourceRows, spcCfg.centerLineField, null),
      target: _spcFirstNumericField(limitSourceRows, spcCfg.targetField, null),
      lsl: _spcFirstNumericField(limitSourceRows, spcCfg.lslField, null),
      usl: _spcFirstNumericField(limitSourceRows, spcCfg.uslField, null)
    }
  };
}

/**
 * Render an SPC chart with control limits, sigma zones, and rule highlighting.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderSpcChart(config, data, state, blockId){
  var rows;
  var series;
  var spcCfg;
  var limits;
  var limitSeed;
  var fieldLimits;
  var targetValue;
  var lslValue;
  var uslValue;
  var violations;
  var width = 720;
  var height = 320;
  var left = 58;
  var right = 24;
  var top = 20;
  var bottom = 56;
  var plotWidth;
  var plotHeight;
  var ticks;
  var svg = '';
  try{
    rows = _chartRows(config, data);
    spcCfg = config.spc || {};
    if(!rows.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
    series = _spcSeriesFromConfig(config, rows);
    if(!series.values.length) return _chartEmpty(_t('Không có dữ liệu đo SPC', 'No SPC measurements available'));
    fieldLimits = series.limitsFromFields || {};
    limitSeed = _clone(config.limits || spcCfg.limits || {});
    if(fieldLimits.ucl != null && (limitSeed.ucl == null || limitSeed.ucl === 'auto')) limitSeed.ucl = fieldLimits.ucl;
    if(fieldLimits.lcl != null && (limitSeed.lcl == null || limitSeed.lcl === 'auto')) limitSeed.lcl = fieldLimits.lcl;
    if(fieldLimits.cl != null && (limitSeed.cl == null || limitSeed.cl === 'auto')) limitSeed.cl = fieldLimits.cl;
    limits = _spcResolveLimits(series.values, limitSeed);
    targetValue = fieldLimits.target != null ? fieldLimits.target : _spcFirstNumericField(rows, spcCfg.targetField, null);
    lslValue = fieldLimits.lsl != null ? fieldLimits.lsl : _spcFirstNumericField(rows, spcCfg.lslField, null);
    uslValue = fieldLimits.usl != null ? fieldLimits.usl : _spcFirstNumericField(rows, spcCfg.uslField, null);
    violations = spcCfg.highlightViolations === false ? { status:{}, messages:{} } : _spcRuleViolations(series.values, limits, (config.rules && config.rules[0]) || spcCfg.rulePreset || 'western-electric');
    plotWidth = width - left - right;
    plotHeight = height - top - bottom;
    ticks = _chartAxisTicks(
      Math.min(limits.lcl, Math.min.apply(null, series.values), lslValue != null ? lslValue : limits.lcl, targetValue != null ? targetValue : limits.lcl),
      Math.max(limits.ucl, Math.max.apply(null, series.values), uslValue != null ? uslValue : limits.ucl, targetValue != null ? targetValue : limits.ucl),
      5
    );

    svg += '<div class="hm-chart-card hm-chart-card-spc">';
    svg += '<div class="hm-chart-shell" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ SPC với giới hạn kiểm soát', 'SPC chart with control limits'))+'" data-chart-block-id="'+_esc(blockId || '')+'">';
    svg += '<svg class="hm-chart-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none">';
    if(spcCfg.showSigmaBands !== false){
      [3,2,1,-1,-2,-3].forEach(function(zone){
        var from = limits.cl + (Math.max(zone - 1, 0) * limits.sigma * (zone > 0 ? 1 : -1));
        var to = limits.cl + (Math.abs(zone) * limits.sigma * (zone > 0 ? 1 : -1));
        var y1 = _chartScaleY(Math.max(from, to), ticks[0], ticks[ticks.length - 1], top, plotHeight);
        var y2 = _chartScaleY(Math.min(from, to), ticks[0], ticks[ticks.length - 1], top, plotHeight);
        svg += '<rect x="'+left+'" y="'+Math.min(y1, y2).toFixed(2)+'" width="'+plotWidth+'" height="'+Math.abs(y2 - y1).toFixed(2)+'" fill="'+(Math.abs(zone) === 3 ? 'rgba(239,68,68,0.05)' : Math.abs(zone) === 2 ? 'rgba(245,158,11,0.05)' : 'rgba(37,99,235,0.04)')+'"></rect>';
      });
    }
    ticks.forEach(function(tick){
      var y = _chartScaleY(tick, ticks[0], ticks[ticks.length - 1], top, plotHeight);
      svg += '<line x1="'+left+'" y1="'+y.toFixed(2)+'" x2="'+(width - right)+'" y2="'+y.toFixed(2)+'" class="hm-chart-gridline"></line>';
      svg += '<text x="'+(left - 10)+'" y="'+(y + 4).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-y">'+_esc(_chartFormatValue(tick, config.format || ''))+'</text>';
    });
    svg += '<line x1="'+left+'" y1="'+_chartScaleY(limits.ucl, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" x2="'+(width - right)+'" y2="'+_chartScaleY(limits.ucl, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 4"></line>';
    svg += '<line x1="'+left+'" y1="'+_chartScaleY(limits.cl, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" x2="'+(width - right)+'" y2="'+_chartScaleY(limits.cl, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" stroke="#64748b" stroke-width="2" stroke-dasharray="3 3"></line>';
    svg += '<line x1="'+left+'" y1="'+_chartScaleY(limits.lcl, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" x2="'+(width - right)+'" y2="'+_chartScaleY(limits.lcl, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 4"></line>';
    if(targetValue != null){
      svg += '<line x1="'+left+'" y1="'+_chartScaleY(targetValue, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" x2="'+(width - right)+'" y2="'+_chartScaleY(targetValue, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="2 4"></line>';
    }
    if(lslValue != null){
      svg += '<line x1="'+left+'" y1="'+_chartScaleY(lslValue, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" x2="'+(width - right)+'" y2="'+_chartScaleY(lslValue, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" stroke="#b91c1c" stroke-width="1.5" stroke-dasharray="8 4"></line>';
    }
    if(uslValue != null){
      svg += '<line x1="'+left+'" y1="'+_chartScaleY(uslValue, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" x2="'+(width - right)+'" y2="'+_chartScaleY(uslValue, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2)+'" stroke="#b91c1c" stroke-width="1.5" stroke-dasharray="8 4"></line>';
    }
    svg += '<line x1="'+left+'" y1="'+(top + plotHeight)+'" x2="'+(width - right)+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    svg += '<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    svg += '<polyline points="'+series.values.map(function(value, index){
      return _chartScaleX(index, series.values.length, left, plotWidth).toFixed(2) + ',' + _chartScaleY(value, ticks[0], ticks[ticks.length - 1], top, plotHeight).toFixed(2);
    }).join(' ')+'" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>';
    series.values.forEach(function(value, index){
      var x = _chartScaleX(index, series.values.length, left, plotWidth);
      var y = _chartScaleY(value, ticks[0], ticks[ticks.length - 1], top, plotHeight);
      var fill = violations.status[index] === 'critical' ? '#ef4444' : (violations.status[index] === 'warning' ? '#f59e0b' : '#2563eb');
      var tip = series.tooltips[index] + (violations.messages[index] ? ' • ' + violations.messages[index] : '');
      svg += '<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="5" fill="'+fill+'" stroke="#fff" stroke-width="1.5"'+_chartTooltipAttrs(tip)+'><title>'+_esc(tip)+'</title></circle>';
      svg += '<text x="'+x.toFixed(2)+'" y="'+(top + plotHeight + 18)+'" class="hm-chart-axis-label hm-chart-axis-label-x">'+_esc(series.labels[index])+'</text>';
    });
    svg += '</svg>';
    svg += '<div class="hm-chart-legend"><span class="hm-chart-legend-btn"><span class="hm-chart-legend-swatch" style="background:var(--red-light,#ef4444)"></span><span>UCL / LCL</span></span><span class="hm-chart-legend-btn"><span class="hm-chart-legend-swatch" style="background:var(--text-secondary,#64748b)"></span><span>CL</span></span><span class="hm-chart-legend-btn"><span class="hm-chart-legend-swatch" style="background:var(--amber-light,#f59e0b)"></span><span>'+_esc(_t('Chuỗi cảnh báo', 'Run warning'))+'</span></span></div>';
    svg += '</div></div>';
    return svg;
  } catch(err){
    return _chartError('spc', err);
  }
}

/**
 * Render a dual X-bar / R control chart with Cp and Cpk metrics.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderControlChart(config, data, state, blockId){
  var rows;
  var spcCfg = config.spc || {};
  var chartMode = String(spcCfg.chartMode || config.chartType || 'xbar-r').toLowerCase();
  var valueKey = config.measurementKey || spcCfg.valueField || 'measured_value';
  var subgroupSize = Number(config.subgroupSize || spcCfg.subgroupSize || 5);
  var subgroupField = config.subgroupKey || spcCfg.subgroupField || '';
  var groups;
  var means;
  var spreads;
  var spreadKey = chartMode === 'xbar-s' ? 'stddev' : 'range';
  var spreadLabel = chartMode === 'xbar-s' ? 'stddev' : 'range';
  var meanLimits;
  var spreadLimits;
  var allValues = [];
  var sigma;
  var target = null;
  var usl = _chartNumber(config.usl || config.quality && config.quality.usl || 0);
  var lsl = _chartNumber(config.lsl || config.quality && config.quality.lsl || 0);
  var cp = 0;
  var cpk = 0;
  try{
    rows = _chartRows(config, data);
    target = _spcFirstNumericField(rows, spcCfg.targetField, null);
    if(spcCfg.uslField) usl = _spcFirstNumericField(rows, spcCfg.uslField, usl);
    if(spcCfg.lslField) lsl = _spcFirstNumericField(rows, spcCfg.lslField, lsl);
    if(!rows.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
    groups = _spcSubgroups(rows, valueKey, subgroupSize, subgroupField, config.timestampKey || spcCfg.timestampField || 'measured_at');
    means = groups.map(function(group){ return group.mean; });
    spreads = groups.map(function(group){ return group[spreadKey]; });
    meanLimits = _spcResolveLimits(means, config.xbarLimits || { ucl:_spcFirstNumericField(rows, spcCfg.uclField, null), lcl:_spcFirstNumericField(rows, spcCfg.lclField, null), cl:_spcFirstNumericField(rows, spcCfg.centerLineField, null) });
    spreadLimits = _spcResolveLimits(spreads, config.rangeLimits || {});
    groups.forEach(function(group){ allValues = allValues.concat(group.values); });
    sigma = _spcStddev(allValues);
    if(usl && lsl && sigma){
      cp = (usl - lsl) / (6 * sigma);
      cpk = Math.min((usl - _spcMean(allValues)) / (3 * sigma), (_spcMean(allValues) - lsl) / (3 * sigma));
    }
    return '<div class="hm-chart-card hm-chart-card-control">' +
      '<div class="hm-chart-toolbar"><span class="hm-chart-legend-btn">'+_esc('Cp ' + (cp ? cp.toFixed(2) : '0.00'))+'</span><span class="hm-chart-legend-btn">'+_esc('Cpk ' + (cpk ? cpk.toFixed(2) : '0.00'))+'</span></div>' +
      renderSpcChart({
        chartType: 'xbar',
        limits: meanLimits,
        spc: {
          targetField: target != null ? 'target' : '',
          lslField: lsl ? 'lsl' : '',
          uslField: usl ? 'usl' : '',
          showSigmaBands: spcCfg.showSigmaBands,
          highlightViolations: spcCfg.highlightViolations,
          rulePreset: spcCfg.rulePreset
        },
        measurementKey: 'measured_value',
        subgroupSize: subgroupSize,
        subgroupKey: subgroupField,
        format: config.format || '',
        items: groups.map(function(group){ return { subgroup: group.key, measured_value: group.mean, target: target, lsl: lsl, usl: usl }; }),
        dataKey: 'items'
      }, groups.map(function(group){ return { subgroup: group.key, measured_value: group.mean, target: target, lsl: lsl, usl: usl }; }), state, blockId + '_xbar') +
      renderSpcChart({
        chartType: spreadKey === 'stddev' ? 'xbar' : 'range',
        limits: spreadLimits,
        measurementKey: spreadLabel,
        spc: {
          showSigmaBands: spcCfg.showSigmaBands,
          highlightViolations: spcCfg.highlightViolations,
          rulePreset: spcCfg.rulePreset
        },
        subgroupSize: subgroupSize,
        subgroupKey: subgroupField,
        format: config.format || '',
        items: groups.map(function(group){ var item = { subgroup: group.key }; item[spreadLabel] = group[spreadKey]; return item; }),
        dataKey: 'items'
      }, groups.map(function(group){ var item = { subgroup: group.key }; item[spreadLabel] = group[spreadKey]; return item; }), state, blockId + '_' + spreadLabel) +
      '</div>';
  } catch(err){
    return _chartError('control-chart', err);
  }
}

/**
 * Render a Pareto chart with descending bars and cumulative line.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderParetoChart(config, data, state, blockId){
  var rows;
  var distCfg = config.distribution || {};
  var categoryKey = config.categoryKey || distCfg.categoryField || 'category';
  var valueKey = config.valueKey || distCfg.valueField || 'value';
  var topN = Number(config.top || distCfg.topN || 10);
  var totals = {};
  var ordered;
  var cumulative = 0;
  var total = 0;
  var width = 720;
  var height = 320;
  var left = 48;
  var right = 48;
  var top = 18;
  var bottom = 58;
  var plotWidth;
  var plotHeight;
  var maxValue = 1;
  var svg = '';
  try{
    rows = _chartRows(config, data);
    if(!rows.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
    rows.forEach(function(row){
      var key = row[categoryKey] == null ? _t('Khác', 'Other') : String(row[categoryKey]);
      totals[key] = (totals[key] || 0) + _chartNumber(row[valueKey]);
    });
    ordered = Object.keys(totals).map(function(key){
      return { key:key, value:totals[key] };
    }).sort(function(a, b){ return b.value - a.value; });
    if(topN > 0) ordered = ordered.slice(0, topN);
    ordered.forEach(function(item){
      total += item.value;
      if(item.value > maxValue) maxValue = item.value;
    });
    plotWidth = width - left - right;
    plotHeight = height - top - bottom;
    svg += '<div class="hm-chart-card hm-chart-card-pareto"><div class="hm-chart-shell" role="img" aria-label="'+_chartAttrText(_t('Biểu đồ Pareto lỗi và phần trăm lũy kế', 'Pareto chart with cumulative percentage'))+'" data-chart-block-id="'+_esc(blockId || '')+'"><svg class="hm-chart-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none">';
    svg += '<line x1="'+left+'" y1="'+(top + plotHeight)+'" x2="'+(width - right)+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    svg += '<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top + plotHeight)+'" class="hm-chart-axis"></line>';
    svg += '<line x1="'+left+'" y1="'+(top + (plotHeight * 0.2))+'" x2="'+(width - right)+'" y2="'+(top + (plotHeight * 0.2))+'" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 4"></line>';
    ordered.forEach(function(item, index){
      var band = plotWidth / Math.max(ordered.length, 1);
      var barWidth = Math.max(Math.min((band * 0.62), 48), 18);
      var x = left + (band * index) + ((band - barWidth) / 2);
      var h = (item.value / maxValue) * plotHeight;
      var y = top + plotHeight - h;
      cumulative += item.value;
      item.cumulativePct = total ? ((cumulative / total) * 100) : 0;
      svg += '<rect x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" width="'+barWidth.toFixed(2)+'" height="'+h.toFixed(2)+'" rx="6" fill="rgba(37,99,235,'+(0.92 - (index * 0.06))+')" class="hm-chart-bar"'+_chartTooltipAttrs(item.key + ': ' + _chartFormatValue(item.value, config.format || ''))+'><title>'+_esc(item.key + ': ' + _chartFormatValue(item.value, config.format || ''))+'</title></rect>';
      svg += '<text x="'+(x + (barWidth / 2)).toFixed(2)+'" y="'+(top + plotHeight + 18)+'" class="hm-chart-axis-label hm-chart-axis-label-x">'+_esc(item.key)+'</text>';
      svg += '<text x="'+(x + (barWidth / 2)).toFixed(2)+'" y="'+(y - 8).toFixed(2)+'" class="hm-chart-axis-label hm-chart-axis-label-x">'+_esc(Math.round(item.cumulativePct) + '%')+'</text>';
    });
    svg += '<polyline points="'+ordered.map(function(item, index){
      var band = plotWidth / Math.max(ordered.length, 1);
      var x = left + (band * index) + (band / 2);
      var y = top + plotHeight - ((item.cumulativePct / 100) * plotHeight);
      return x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ')+'" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>';
    svg += '</svg><div class="hm-chart-legend"><span class="hm-chart-legend-btn"><span class="hm-chart-legend-swatch" style="background:var(--blue-light,#2563eb)"></span><span>'+_esc(_t('Giá trị lỗi', 'Defect value'))+'</span></span><span class="hm-chart-legend-btn"><span class="hm-chart-legend-swatch" style="background:var(--amber-light,#f97316)"></span><span>'+_esc(_t('Tỷ lệ lũy kế', 'Cumulative %'))+'</span></span></div></div></div>';
    return svg;
  } catch(err){
    return _chartError('pareto', err);
  }
}

function _checksheetState(moduleId, blockId, config, data){
  var ms = getModuleState(moduleId || '_');
  var matrix;
  if(!ms.checksheetStates[blockId]){
    matrix = {};
    if(data && !Array.isArray(data) && typeof data === 'object'){
      Object.keys(data).forEach(function(rowId){
        if(data[rowId] && typeof data[rowId] === 'object') matrix[rowId] = _clone(data[rowId]);
      });
    } else if(Array.isArray(data)){
      data.forEach(function(item){
        if(item && item.rowId != null && item.colId != null){
          if(!matrix[item.rowId]) matrix[item.rowId] = {};
          matrix[item.rowId][item.colId] = item.value;
        }
      });
    }
    ms.checksheetStates[blockId] = matrix;
  }
  return ms.checksheetStates[blockId];
}

function _checksheetNumericValue(type, value){
  if(type === 'check') return value ? 1 : 0;
  if(type === 'pass_fail') return value === 'pass' ? 1 : 0;
  return _chartNumber(value);
}

/**
 * Render an interactive checksheet grid for quality inspections.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderChecksheet(config, data, state, blockId){
  var rows = config.rows || (config.checklist && config.checklist.items) || [];
  var columns = config.columns || [];
  var matrix;
  var html = '';
  var moduleId = _chartModuleId(state);
  if(!rows.length || !columns.length) return _chartEmpty(_t('Chưa cấu hình checksheet', 'Checksheet is not configured'));
  matrix = _checksheetState(moduleId, blockId, config, data);
  html += '<div class="hm-checksheet-wrap"><table class="hm-checksheet" role="table" aria-label="'+_chartAttrText(_t('Bảng checksheet kiểm tra chất lượng', 'Quality checksheet grid'))+'"><thead><tr><th scope="col">'+_esc(_t('Hạng mục', 'Item'))+'</th>';
  columns.forEach(function(column){
    html += '<th scope="col">'+_esc(_chartText(column, column.id || column.key, column.id || column.key))+'</th>';
  });
  html += '<th scope="col">'+_esc(_t('Tổng', 'Total'))+'</th></tr></thead><tbody>';
  rows.forEach(function(row){
    var rowId = row.id || row.key;
    var rowTotal = 0;
    html += '<tr><th scope="row">'+_esc(_chartText(row, rowId, rowId))+'</th>';
    columns.forEach(function(column){
      var colId = column.id || column.key;
      var type = column.type || 'check';
      var value = matrix[rowId] && matrix[rowId][colId] !== undefined ? matrix[rowId][colId] : (type === 'count' || type === 'measurement' ? 0 : (type === 'pass_fail' ? '' : false));
      rowTotal += _checksheetNumericValue(type, value);
      html += '<td class="'+(type === 'pass_fail' && value === 'fail' ? ' hm-checksheet-cell-fail' : '')+'">';
      if(type === 'check'){
        html += '<button type="button" class="hm-checksheet-btn'+(value ? ' is-on' : '')+'" data-action="hm-checksheet-toggle" data-block-id="'+_esc(blockId || '')+'" data-row="'+_esc(rowId)+'" data-col="'+_esc(colId)+'" aria-pressed="'+(value ? 'true' : 'false')+'">'+(value ? '&#10003;' : '&#9633;')+'</button>';
      } else if(type === 'count'){
        html += '<button type="button" class="hm-checksheet-btn hm-checksheet-btn-count" data-action="hm-checksheet-increment" data-block-id="'+_esc(blockId || '')+'" data-row="'+_esc(rowId)+'" data-col="'+_esc(colId)+'">'+_esc(String(value))+'</button>';
      } else if(type === 'pass_fail'){
        html += '<div class="hm-checksheet-passfail">';
        html += '<button type="button" class="hm-checksheet-btn'+(value === 'pass' ? ' is-pass' : '')+'" data-action="hm-checksheet-passfail" data-block-id="'+_esc(blockId || '')+'" data-row="'+_esc(rowId)+'" data-col="'+_esc(colId)+'" data-value="pass">&#10003;</button>';
        html += '<button type="button" class="hm-checksheet-btn'+(value === 'fail' ? ' is-fail' : '')+'" data-action="hm-checksheet-passfail" data-block-id="'+_esc(blockId || '')+'" data-row="'+_esc(rowId)+'" data-col="'+_esc(colId)+'" data-value="fail">&#10005;</button>';
        html += '</div>';
      } else {
        html += '<input type="number" class="hm-input hm-input-xs" data-action="hm-checksheet-measure" data-block-id="'+_esc(blockId || '')+'" data-row="'+_esc(rowId)+'" data-col="'+_esc(colId)+'" value="'+_esc(String(value))+'" aria-label="'+_chartAttrText(_chartText(row, rowId, rowId) + ' ' + _chartText(column, colId, colId))+'">';
      }
      html += '</td>';
    });
    html += '<td class="hm-checksheet-total">'+_esc(_chartFormatValue(rowTotal, 'number'))+'</td></tr>';
  });
  html += '</tbody><tfoot><tr><th scope="row">'+_esc(_t('Tổng', 'Total'))+'</th>';
  columns.forEach(function(column){
    var colId = column.id || column.key;
    var total = 0;
    rows.forEach(function(row){
      var rowId = row.id || row.key;
      var value = matrix[rowId] && matrix[rowId][colId] !== undefined ? matrix[rowId][colId] : 0;
      total += _checksheetNumericValue(column.type || 'check', value);
    });
    html += '<td class="hm-checksheet-total">'+_esc(_chartFormatValue(total, 'number'))+'</td>';
  });
  html += '<td></td></tr></tfoot></table></div>';
  return html;
}

function _runtimeRowsRef(blockData, config){
  var dataKey = config.dataKey || (config.dataSource && config.dataSource.dataKey) || 'items';
  if(Array.isArray(blockData)) return blockData;
  if(blockData && Array.isArray(blockData[dataKey])) return blockData[dataKey];
  if(blockData && Array.isArray(blockData.items)) return blockData.items;
  if(blockData && Array.isArray(blockData.rows)) return blockData.rows;
  if(blockData && Array.isArray(blockData.machines)) return blockData.machines;
  if(blockData && Array.isArray(blockData.assets)) return blockData.assets;
  return [];
}

function _templateText(template, row, extra){
  var ctx = {};
  if(extra) Object.keys(extra).forEach(function(key){ ctx[key] = extra[key]; });
  ctx.row = row || {};
  ctx.record = row || {};
  ctx.data = row || {};
  if(template == null) return '';
  if(typeof template !== 'string') return String(template);
  if(template.indexOf('{{') >= 0) return resolveBindings(template, ctx);
  if(row && row[template] !== undefined) return row[template];
  return template;
}

/**
 * Render a kanban board with WIP limits and drag-ready cards.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderKanban(config, data, state, blockId){
  var rows = _chartRows(config, data);
  var kanbanCfg = config.kanban || {};
  var statusKey = config.statusKey || kanbanCfg.laneField || 'status';
  var rowKey = config.rowKey || 'id';
  var columns = (config.columns || kanbanCfg.lanes || []).slice();
  var html = '<div class="hm-kanban-board" data-block-id="'+_esc(blockId || '')+'" role="listbox" aria-label="'+_chartAttrText(_t('Bảng Kanban trạng thái', 'Kanban status board'))+'">';
  if(!rows.length) return _chartEmpty(_t('Không có dữ liệu','No data'));
  if(!columns.length){
    rows.forEach(function(row){
      var value = row[statusKey] == null ? _t('Chưa phân loại', 'Unassigned') : String(row[statusKey]);
      if(!columns.some(function(column){ return (column.value || column.key || column) === value; })){
        columns.push({ value:value, label:{ vi:value, en:value }, color:_chartColor(columns.length) });
      }
    });
  }
  columns.forEach(function(column, columnIndex){
    var columnValue = column.value || column.key || column;
    var columnRows = rows.filter(function(row){ return String(row[statusKey] || '') === String(columnValue); });
    var wipLimit = Number(column.wipLimit || column.limit || 0);
    html += '<section class="hm-kanban-column'+(wipLimit && columnRows.length > wipLimit ? ' is-over-limit' : '')+'" data-kanban-column="'+_esc(columnValue)+'" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_chartAttrText(_chartText(column, columnValue, columnValue))+'">';
    html += '<header class="hm-kanban-column-head" style="--hm-kanban-color:'+(column.color || _chartColor(columnIndex))+'">';
    html += '<div><h3>'+_esc(_chartText(column, columnValue, columnValue))+'</h3></div>';
    html += '<div class="hm-kanban-count">'+_esc(String(columnRows.length))+(wipLimit ? '/' + _esc(String(wipLimit)) : '')+'</div>';
    html += '</header>';
    if(!columnRows.length){
      html += '<div class="hm-kanban-empty">'+_esc(_t('Không có mục nào', 'No items'))+'</div>';
    }
    columnRows.forEach(function(row, rowIndex){
      var title = _templateText(config.cardTitle || (kanbanCfg.card && kanbanCfg.card.titleField) || 'title', row, {});
      var subtitle = _templateText(config.cardSubtitle || (kanbanCfg.card && kanbanCfg.card.subtitleField) || '', row, {});
      var badgeCfg = config.cardBadge || {};
      var badgeValue = badgeCfg.key ? row[badgeCfg.key] : (kanbanCfg.card && kanbanCfg.card.priorityField ? row[kanbanCfg.card.priorityField] : '');
      var badgeColor = badgeCfg.colors && badgeCfg.colors[badgeValue] ? badgeCfg.colors[badgeValue] : '';
      html += '<article class="hm-kanban-card" draggable="'+((config.draggable !== false && kanbanCfg.allowDrag !== false) ? 'true' : 'false')+'" data-card-id="'+_esc(String(row[rowKey] != null ? row[rowKey] : rowIndex))+'" data-row-key="'+_esc(String(row[rowKey] != null ? row[rowKey] : rowIndex))+'" data-block-id="'+_esc(blockId || '')+'" role="option" aria-label="'+_chartAttrText(title)+'">';
      html += '<div class="hm-kanban-card-head">';
      html += '<strong>'+_esc(title)+'</strong>';
      if(badgeValue !== undefined && badgeValue !== '') html += '<span class="hm-badge" style="'+(badgeColor ? ('background:'+badgeColor+'22;color:'+badgeColor+';') : '')+'">'+_esc(String(badgeValue))+'</span>';
      html += '</div>';
      if(subtitle) html += '<div class="hm-kanban-card-subtitle">'+_esc(subtitle)+'</div>';
      html += '</article>';
    });
    html += '</section>';
  });
  html += '</div>';
  return html;
}

function _ganttDate(value){
  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Render a gantt view with timeline zoom controls.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderGantt(config, data, state, blockId){
  var rows = _chartRows(config, data);
  var scheduleCfg = config.schedule || {};
  var taskKey = config.taskKey || scheduleCfg.titleField || 'task_name';
  var startKey = config.startKey || scheduleCfg.startField || 'start_date';
  var endKey = config.endKey || scheduleCfg.endField || 'end_date';
  var progressKey = config.progressKey || scheduleCfg.progressField || 'percent_complete';
  var groupKey = config.groupKey || scheduleCfg.groupByField || '';
  var chartState = _chartState(state, blockId);
  var zoom = chartState.zoomLevel || config.zoomLevel || 'day';
  var tasks = [];
  var minDate;
  var maxDate;
  var html = '';
  rows.forEach(function(row){
    var start = _ganttDate(row[startKey]);
    var end = _ganttDate(row[endKey] || row[startKey]);
    if(!start || !end) return;
    tasks.push({ row: row, start: start, end: end < start ? start : end });
  });
  if(!tasks.length) return _chartEmpty(_t('Không có dữ liệu tiến độ', 'No schedule data'));
  minDate = tasks[0].start;
  maxDate = tasks[0].end;
  tasks.forEach(function(task){
    if(task.start < minDate) minDate = task.start;
    if(task.end > maxDate) maxDate = task.end;
  });
  html += '<div class="hm-gantt" data-block-id="'+_esc(blockId || '')+'">';
  html += '<div class="hm-gantt-toolbar"><div class="hm-chart-toolbar"><button type="button" class="hm-btn hm-btn-ghost hm-btn-sm'+(zoom === 'day' ? ' is-active' : '')+'" data-action="hm-gantt-zoom" data-block-id="'+_esc(blockId || '')+'" data-zoom="day">Day</button><button type="button" class="hm-btn hm-btn-ghost hm-btn-sm'+(zoom === 'week' ? ' is-active' : '')+'" data-action="hm-gantt-zoom" data-block-id="'+_esc(blockId || '')+'" data-zoom="week">Week</button><button type="button" class="hm-btn hm-btn-ghost hm-btn-sm'+(zoom === 'month' ? ' is-active' : '')+'" data-action="hm-gantt-zoom" data-block-id="'+_esc(blockId || '')+'" data-zoom="month">Month</button></div></div>';
  html += '<div class="hm-gantt-grid"><div class="hm-gantt-list">';
  tasks.forEach(function(task){
    html += '<div class="hm-gantt-row-label"><strong>'+_esc(String(task.row[taskKey] || 'Task'))+'</strong>';
    if(groupKey && task.row[groupKey]) html += '<small>'+_esc(String(task.row[groupKey]))+'</small>';
    html += '</div>';
  });
  html += '</div><div class="hm-gantt-timeline"><div class="hm-gantt-header">';
  (function(){
    var current = new Date(minDate.getTime());
    var cells = [];
    while(current <= maxDate){
      cells.push(new Date(current.getTime()));
      if(zoom === 'month') current.setMonth(current.getMonth() + 1);
      else if(zoom === 'week') current.setDate(current.getDate() + 7);
      else current.setDate(current.getDate() + 1);
    }
    cells.forEach(function(cell){
      html += '<div class="hm-gantt-header-cell">'+_esc(zoom === 'month' ? cell.toLocaleDateString('en-US', { month:'short', year:'2-digit' }) : zoom === 'week' ? ('W' + Math.ceil(cell.getDate() / 7) + ' ' + cell.toLocaleDateString('en-US', { month:'short' })) : cell.toLocaleDateString('en-US', { day:'2-digit', month:'short' }))+'</div>';
    });
  }());
  html += '</div><div class="hm-gantt-body">';
  tasks.forEach(function(task){
    var totalMs = Math.max(maxDate.getTime() - minDate.getTime(), 86400000);
    var leftPct = ((task.start.getTime() - minDate.getTime()) / totalMs) * 100;
    var widthPct = ((task.end.getTime() - task.start.getTime() + 86400000) / totalMs) * 100;
    var todayPct = ((Date.now() - minDate.getTime()) / totalMs) * 100;
    html += '<div class="hm-gantt-row">';
    if(config.showToday) html += '<div class="hm-gantt-today" style="left:'+todayPct.toFixed(2)+'%"></div>';
    html += '<div class="hm-gantt-bar" style="left:'+leftPct.toFixed(2)+'%;width:'+Math.max(widthPct, 1).toFixed(2)+'%" title="'+_chartAttrText(String(task.row[taskKey] || 'Task'))+'"><span class="hm-gantt-bar-fill" style="width:'+_chartClamp(_chartNumber(task.row[progressKey]), 0, 100)+'%"></span><span class="hm-gantt-bar-label">'+_esc(String(task.row[taskKey] || 'Task'))+'</span></div></div>';
  });
  html += '</div></div></div></div>';
  return html;
}

function _detailRecord(data){
  if(Array.isArray(data)) return data[0] || null;
  if(data && Array.isArray(data.items)) return data.items[0] || null;
  return data || null;
}

function _humanizeKey(key){
  var text = String(key || '').replace(/[_\-]+/g, ' ').trim();
  if(!text) return '';
  return text.replace(/\b([a-z])/g, function(all, ch){ return ch.toUpperCase(); });
}

function _modalFocusables(modal){
  return Array.prototype.slice.call(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
}

function _trapModalFocus(e, modal){
  var nodes = _modalFocusables(modal);
  var first;
  var last;
  if(!nodes.length) return;
  first = nodes[0];
  last = nodes[nodes.length - 1];
  if(e.shiftKey && document.activeElement === first){
    e.preventDefault();
    last.focus();
  } else if(!e.shiftKey && document.activeElement === last){
    e.preventDefault();
    first.focus();
  }
}

function _managedFormData(moduleId, blockId, seed){
  var ms = getModuleState(moduleId);
  var data = {};
  Object.keys(seed && typeof seed === 'object' ? seed : {}).forEach(function(key){
    data[key] = seed[key];
  });
  if(ms.formDrafts[blockId]){
    Object.keys(ms.formDrafts[blockId]).forEach(function(key){
      data[key] = ms.formDrafts[blockId][key];
    });
  }
  return data;
}

function _managedFieldId(blockId, fieldKey){
  return 'hm_' + _safeBlockBindingKey(blockId || 'block') + '_' + _safeBlockBindingKey(fieldKey || 'field');
}

function _managedFieldSpan(field){
  var span = String(field && field.span || 'half').toLowerCase();
  if(span === 'full') return '1 / -1';
  if(span === 'third') return 'span 4';
  if(span === 'quarter') return 'span 3';
  if(span === 'half') return 'span 6';
  if(/^\d+$/.test(span)) return 'span ' + span;
  return 'span 6';
}

function _managedFieldType(field){
  var type = String(field && field.type || 'text').toLowerCase();
  if(type === 'string' || type === 'badge' || type === 'lookup' || type === 'link') return 'text';
  if(type === 'integer' || type === 'currency' || type === 'percent' || type === 'percentage') return 'number';
  if(type === 'datetime') return 'datetime-local';
  if(type === 'boolean') return 'checkbox';
  if(type === 'phone') return 'tel';
  return type;
}

function _managedFieldPlaceholder(field){
  if(field && field.placeholder && typeof field.placeholder === 'object'){
    return _t(field.placeholder.vi || '', field.placeholder.en || field.placeholder.vi || '');
  }
  return _t(field && field.placeholder || '', field && (field.placeholderEn || field.placeholder) || '');
}

function _fieldSelectOptions(field, currentValue, context){
  var opts = [];
  var normalizedValue = currentValue == null ? '' : String(currentValue);
  var registryMeta;
  if(window.HmRegistry && typeof HmRegistry.selectOptions === 'function'){
    registryMeta = {
      field: field || {},
      table: (context && context.table) || (field && (field.table || field.dbTable)) || ''
    };
    opts = HmRegistry.selectOptions(registryMeta) || [];
  }
  if((!opts || !opts.length) && field && Array.isArray(field.options)){
    opts = field.options.map(function(opt){
      return opt && typeof opt === 'object'
        ? opt
        : { value: opt, label: opt, labelEn: opt };
    });
  }
  if(normalizedValue && opts && opts.length){
    var found = false;
    opts.forEach(function(opt){
      var value = opt && typeof opt === 'object' ? opt.value : opt;
      if(String(value) === normalizedValue) found = true;
    });
    if(!found){
      opts = opts.slice();
      opts.push({ value: normalizedValue, label: normalizedValue, labelEn: normalizedValue });
    }
  }
  return opts || [];
}

function _managedFieldOptions(field, currentValue){
  return _fieldSelectOptions(field, currentValue, null);
}

function _renderManagedField(field, value, error, blockId){
  var label = _getFieldLabel(field) || _humanizeKey(field.key || '');
  var fieldId = _managedFieldId(blockId, field.key);
  var errorId = fieldId + '_error';
  var type = _managedFieldType(field);
  var required = field.required || field.validation && field.validation.required;
  var invalid = !!error;
  var attrs = ' id="'+_esc(fieldId)+'" name="'+_esc(field.key || '')+'" aria-label="'+_esc(label)+'" aria-required="'+(required ? 'true' : 'false')+'" aria-invalid="'+(invalid ? 'true' : 'false')+'"'+(invalid ? ' aria-describedby="'+_esc(errorId)+'"' : '');
  var placeholder = _managedFieldPlaceholder(field);
  var html = '<div class="hm-form-group hm-managed-field" style="grid-column:'+_managedFieldSpan(field)+'">';
  html += '<label class="hm-label" for="'+_esc(fieldId)+'">'+_esc(label)+(required ? ' <span class="hm-required">*</span>' : '')+'</label>';
  if(type === 'textarea'){
    html += '<textarea class="hm-input hm-textarea'+(invalid ? ' hm-field-invalid' : '')+'" rows="'+_esc(String(field.rows || 3))+'" role="textbox"'+attrs+(placeholder ? ' placeholder="'+_esc(placeholder)+'"' : '')+'>'+_esc(value == null ? '' : String(value))+'</textarea>';
  } else if(type === 'select'){
    html += '<select class="hm-input hm-select'+(invalid ? ' hm-field-invalid' : '')+'" role="combobox"'+attrs+'>';
    html += '<option value="">'+_t('Chọn...', 'Select...')+'</option>';
    _managedFieldOptions(field, value).forEach(function(opt){
      var optionValue = opt && typeof opt === 'object' ? opt.value : opt;
      var optionLabel = opt && typeof opt === 'object' ? _t(opt.label && opt.label.vi || opt.label || String(optionValue), opt.label && opt.label.en || opt.labelEn || opt.label || String(optionValue)) : String(opt);
      html += '<option value="'+_esc(optionValue)+'"'+(String(value) === String(optionValue) ? ' selected' : '')+'>'+_esc(optionLabel)+'</option>';
    });
    html += '</select>';
  } else if(type === 'checkbox'){
    html += '<label class="hm-checkbox-label"><input type="checkbox" class="'+(invalid ? 'hm-field-invalid ' : '')+'" role="checkbox"'+attrs+(value ? ' checked' : '')+' aria-checked="'+(value ? 'true' : 'false')+'"> '+_esc(field.checkLabel ? _t(field.checkLabel, field.checkLabelEn || field.checkLabel) : label)+'</label>';
  } else {
    html += '<input type="'+_esc(type)+'" class="hm-input'+(invalid ? ' hm-field-invalid' : '')+'"'+attrs+' value="'+_esc(value == null ? '' : String(value))+'"'+(placeholder ? ' placeholder="'+_esc(placeholder)+'"' : '')+'>';
  }
  if(error){
    html += '<div class="hm-field-error hm-field-error-'+_esc((error.severity || 'error').toLowerCase())+'" id="'+_esc(errorId)+'" role="alert">'+_esc(error.message || error)+'</div>';
  }
  html += '</div>';
  return html;
}

function _renderManagedFieldGrid(fields, formData, errors, blockId){
  var html = '<div class="hm-managed-grid">';
  (fields || []).forEach(function(field){
    html += _renderManagedField(field, formData[field.key], errors[field.key], blockId);
  });
  html += '</div>';
  return html;
}

function _normalizeSubmitConfig(config, mode){
  var submit = Object.assign({}, config && config.submit || {});
  var extra = null;
  if(mode === 'wizard' && config && config.wizard && config.wizard.submit) extra = config.wizard.submit;
  if(mode === 'modal' && config && config.modal && config.modal.submitApi) extra = config.modal.submitApi;
  if((!submit.api && !submit.action) && config && config.submitApi) extra = config.submitApi;
  if(extra) submit = Object.assign({}, extra, submit);
  if(submit.action && !submit.api) submit.api = submit.action;
  return submit;
}

function _wizardConfig(config){
  return config && config.wizard ? config.wizard : (config || {});
}

function _wizardFieldCatalog(config){
  var fields = [];
  var map = {};
  function addField(field){
    if(!field || !field.key || map[field.key]) return;
    map[field.key] = true;
    fields.push(field);
  }
  (config.fields || []).forEach(addField);
  (_wizardConfig(config).steps || []).forEach(function(step){
    (step.fields || []).forEach(addField);
    String(step.fieldsCsv || '').split(',').forEach(function(key){
      var trimmed = String(key || '').replace(/^\s+|\s+$/g, '');
      if(!trimmed || map[trimmed]) return;
      addField({ key:trimmed, label:{ vi:_humanizeKey(trimmed), en:_humanizeKey(trimmed) }, type:'string', span:'half' });
    });
  });
  return fields;
}

function _wizardVisibleSteps(config, context){
  return (_wizardConfig(config).steps || []).filter(function(step){
    if(!step.visibleWhen) return true;
    try { return !!evaluateExpression(step.visibleWhen, context || {}); } catch(err){ return true; }
  });
}

function _wizardStepFields(step, fields){
  var map = {};
  (fields || []).forEach(function(field){ map[field.key] = field; });
  if(step && Array.isArray(step.fields) && step.fields.length) return step.fields;
  return String(step && step.fieldsCsv || '').split(',').map(function(key){
    var trimmed = String(key || '').replace(/^\s+|\s+$/g, '');
    if(!trimmed) return null;
    return map[trimmed] || { key:trimmed, label:{ vi:_humanizeKey(trimmed), en:_humanizeKey(trimmed) }, type:'string', span:'half' };
  }).filter(Boolean);
}

function _wizardIsSummaryStep(step, config, index, total){
  var wizard = _wizardConfig(config);
  if(!step) return false;
  if(step.summary) return true;
  if(wizard.summaryStepKey && (step.key === wizard.summaryStepKey || step.id === wizard.summaryStepKey)) return true;
  if(index === total - 1 && !String(step.fieldsCsv || '').trim() && !(step.fields && step.fields.length)) return true;
  return false;
}

function _wizardState(moduleId, blockId){
  var ms = getModuleState(moduleId);
  if(!ms.wizardStates[blockId]) ms.wizardStates[blockId] = { step:0, direction:'forward' };
  return ms.wizardStates[blockId];
}

function _modalState(moduleId, blockId){
  var ms = getModuleState(moduleId);
  if(!ms.modalStates[blockId]) ms.modalStates[blockId] = { open:false, focused:false, restoreFocus:false };
  return ms.modalStates[blockId];
}

function _modalConfig(config){
  var modal = Object.assign({}, config && config.modal || {});
  if(!modal.trigger) modal.trigger = config && config.trigger ? config.trigger : {};
  if(!modal.title){
    if(config && config.title && typeof config.title === 'object') modal.title = config.title;
    else modal.title = { vi:config && config.title || '', en:config && (config.titleEn || config.title) || '' };
  }
  if(modal.closeOnOverlay === undefined && config && config.closeOnOverlay !== undefined) modal.closeOnOverlay = config.closeOnOverlay;
  if(modal.closeOnSubmit === undefined && config && config.closeOnSubmit !== undefined) modal.closeOnSubmit = config.closeOnSubmit;
  if(!modal.size) modal.size = config && config.size || 'md';
  return modal;
}

function _machineConfig(config){
  var machine = config && config.machine ? config.machine : {};
  var cardFields = config && config.cardFields ? config.cardFields : {};
  var statusColors = Object.assign({}, config && config.statusColors || {});
  (machine.statusMap || []).forEach(function(item){
    if(item && item.key && item.color && !statusColors[item.key]) statusColors[item.key] = item.color;
  });
  return {
    columns: config.columns || machine.columns || 4,
    refreshInterval: config.refreshInterval || machine.refreshInterval || 30000,
    nameKey: cardFields.name || machine.assetField || 'machine_name',
    codeKey: cardFields.code || machine.lineField || 'machine_id',
    statusKey: cardFields.status || machine.statusField || 'status',
    reasonKey: cardFields.reason || machine.reasonField || 'alarm_code',
    currentJobKey: cardFields.currentJob || machine.currentJobField || 'current_jo',
    oeeKey: cardFields.oee || machine.oeeField || 'oee_percent',
    operatorKey: cardFields.operator || machine.operatorField || 'operator_name',
    lastUpdateKey: cardFields.lastUpdate || machine.updatedAtField || 'last_heartbeat',
    navigateUrl: config.navigateUrl || machine.navigateUrl || '',
    detailTab: config.detailTab || machine.detailTab || '',
    statusColors: statusColors
  };
}

function _focusModalFirstField(container, blockId){
  var modal = container.querySelector('.hm-form-modal[data-block-id="'+blockId+'"]');
  var first;
  if(!modal) return;
  first = _modalFocusables(modal)[0];
  if(first && first.focus) first.focus();
}

function _handleWizardPrev(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ws = _wizardState(moduleId, blockId);
  var ms = getModuleState(moduleId);
  ws.step = Math.max(0, (ws.step || 0) - 1);
  ws.direction = 'backward';
  renderModuleFromSchema(container, ms._schema);
}

function _handleWizardNext(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var block = _findBlockById(ms._schema, blockId);
  var formEl = container.querySelector('form[data-hm-form-block="'+blockId+'"]');
  var formData = formEl ? _storeFormDraftFromElement(moduleId, formEl) : _managedFormData(moduleId, blockId, ms.blockData[blockId] || {});
  var ctx = _buildReactiveContext(moduleId);
  var wizard = _wizardConfig(block && block.config || {});
  var steps;
  var ws;
  var currentStep;
  var fields;
  var validationResult;
  var saveDraftConfig;
  if(!block) return;
  ctx.block = block;
  ctx.formData = formData;
  ctx.row = formData;
  ctx.data = formData;
  steps = _wizardVisibleSteps(block.config || {}, ctx);
  ws = _wizardState(moduleId, blockId);
  ws.step = _chartClamp(ws.step || 0, 0, Math.max(steps.length - 1, 0));
  currentStep = steps[ws.step];
  if(!currentStep) return;
  if(btn.getAttribute('data-skip') !== '1' && !_wizardIsSummaryStep(currentStep, block.config || {}, ws.step, steps.length)){
    fields = _wizardStepFields(currentStep, _wizardFieldCatalog(block.config || {}));
    validationResult = validateForm(fields, formData, ctx);
    ms.formErrors[blockId] = validationResult.errors || {};
    if(formEl) showValidationErrors(formEl, ms.formErrors[blockId]);
    if(!validationResult.valid){
      toast(_t('Vui lòng hoàn tất các trường bắt buộc của bước hiện tại.', 'Please complete the required fields for the current step.'), 'warning');
      return;
    }
  }
  saveDraftConfig = wizard.saveDraft && wizard.saveDraft.api ? wizard.saveDraft : null;
  if(saveDraftConfig){
    _api(saveDraftConfig.api, formData, saveDraftConfig.method || 'POST').catch(function(err){
      console.warn('[BlockEngine] wizard save-draft failed', err);
    });
  }
  ws.step = Math.min(ws.step + 1, steps.length - 1);
  ws.direction = 'forward';
  renderModuleFromSchema(container, ms._schema);
}

function _handleWizardSubmit(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var block = _findBlockById(ms._schema, blockId);
  var formEl = container.querySelector('form[data-hm-form-block="'+blockId+'"]');
  var formData = formEl ? _storeFormDraftFromElement(moduleId, formEl) : _managedFormData(moduleId, blockId, ms.blockData[blockId] || {});
  var ctx = _buildReactiveContext(moduleId);
  var submitConfig;
  var allFields;
  var validationResult;
  var wizard;
  if(!block) return;
  wizard = _wizardConfig(block.config || {});
  submitConfig = _normalizeSubmitConfig(block.config || {}, 'wizard');
  ctx.block = block;
  ctx.formData = formData;
  ctx.row = formData;
  ctx.data = formData;
  allFields = _wizardFieldCatalog(block.config || {});
  validationResult = validateForm(allFields, formData, ctx);
  ms.formErrors[blockId] = validationResult.errors || {};
  if(formEl) showValidationErrors(formEl, ms.formErrors[blockId]);
  if(!validationResult.valid){
    toast(_t('Biểu mẫu wizard còn trường chưa hợp lệ.', 'The wizard still has invalid fields.'), 'danger');
    return;
  }
  function finish(payload){
    ms.blockData[blockId] = payload && payload.data ? payload.data : payload;
    ms.formErrors[blockId] = {};
    refreshDependents(moduleId, blockId);
    if(wizard.successRoute) window.location.hash = resolveBindings(String(wizard.successRoute), ctx);
    renderModuleFromSchema(container, ms._schema);
  }
  if(!submitConfig.api){
    toast(_t('Đã lưu dữ liệu wizard trong phiên làm việc.', 'Wizard data saved in the current session.'), 'success');
    finish(formData);
    return;
  }
  _api(submitConfig.api, formData, submitConfig.method || 'POST').then(function(resp){
    toast(_t('Đã gửi wizard thành công.', 'Wizard submitted successfully.'), 'success');
    invalidateCache(submitConfig.api);
    finish(resp && resp.data ? resp : formData);
  }).catch(function(err){
    toast(_t('Gửi wizard thất bại.', 'Wizard submission failed.'), 'danger');
    console.warn('[BlockEngine] wizard submit failed', err);
  });
}

function _handleModalOpen(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var state = _modalState(moduleId, blockId);
  state.open = true;
  state.focused = false;
  state.restoreFocus = false;
  renderModuleFromSchema(container, getModuleState(moduleId)._schema);
}

function _handleModalClose(container, moduleId, target){
  var blockId = typeof target === 'string' ? target : target.getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var block = _findBlockById(ms._schema, blockId);
  var modalCfg = _modalConfig(block && block.config || {});
  var state = _modalState(moduleId, blockId);
  if(typeof target !== 'string' && target.className && String(target.className).indexOf('hm-form-modal-overlay') >= 0 && modalCfg.closeOnOverlay === false){
    return;
  }
  state.open = false;
  state.focused = false;
  state.restoreFocus = true;
  renderModuleFromSchema(container, ms._schema);
}

function _handleMachineCard(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowIndex = parseInt(btn.getAttribute('data-row-index'), 10);
  var ms = getModuleState(moduleId);
  var block = _findBlockById(ms._schema, blockId);
  var rows = _runtimeRowsRef(ms.blockData[blockId], block && block.config || {});
  var row = rows[rowIndex] || null;
  var cfg = _machineConfig(block && block.config || {});
  var ctx;
  if(!block || !row) return;
  ctx = _buildReactiveContext(moduleId);
  ctx.row = row;
  ctx.machine = row;
  if(cfg.navigateUrl){
    window.location.href = resolveBindings(String(cfg.navigateUrl), ctx);
    return;
  }
  if(cfg.detailTab){
    ms.activeTab = cfg.detailTab;
    ms.customState.selectedMachine = row;
    renderModuleFromSchema(container, ms._schema);
  }
}

function _initFormModals(container, moduleId){
  var ms = getModuleState(moduleId);
  container.querySelectorAll('.hm-form-modal[data-block-id]').forEach(function(modal){
    var blockId = modal.getAttribute('data-block-id');
    var state = _modalState(moduleId, blockId);
    if(state.open && !state.focused){
      _focusModalFirstField(container, blockId);
      state.focused = true;
    }
  });
  Object.keys(ms.modalStates || {}).forEach(function(blockId){
    var state = ms.modalStates[blockId];
    var trigger;
    if(state && state.restoreFocus && !state.open){
      trigger = container.querySelector('[data-action="hm-modal-open"][data-block-id="'+blockId+'"]');
      if(trigger && trigger.focus) trigger.focus();
      state.restoreFocus = false;
    }
  });
}

function _initMachineStatusBoards(container, moduleId){
  var ms = getModuleState(moduleId);
  var liveBlocks = {};
  container.querySelectorAll('.hm-machine-status-grid[data-block-id]').forEach(function(grid){
    var blockId = grid.getAttribute('data-block-id');
    var block = _findBlockById(ms._schema, blockId);
    var cfg = _machineConfig(block && block.config || {});
    var refreshMs = Math.max(parseInt(cfg.refreshInterval, 10) || 0, 0);
    liveBlocks[blockId] = true;
    if(!refreshMs) return;
    if(ms.machineTimers[blockId] && ms.machineTimers[blockId].interval === refreshMs) return;
    if(ms.machineTimers[blockId] && ms.machineTimers[blockId].handle) clearInterval(ms.machineTimers[blockId].handle);
    ms.machineTimers[blockId] = {
      interval: refreshMs,
      handle: setInterval(function(){
        if(!document.body.contains(container)){
          if(ms.machineTimers[blockId] && ms.machineTimers[blockId].handle) clearInterval(ms.machineTimers[blockId].handle);
          delete ms.machineTimers[blockId];
          return;
        }
        if(block && block.config && block.config.dataSource && block.config.dataSource.api){
          invalidateCache(block.config.dataSource.api);
        }
        renderModuleFromSchema(container, ms._schema);
      }, refreshMs)
    };
  });
  Object.keys(ms.machineTimers || {}).forEach(function(blockId){
    if(liveBlocks[blockId]) return;
    if(ms.machineTimers[blockId] && ms.machineTimers[blockId].handle) clearInterval(ms.machineTimers[blockId].handle);
    delete ms.machineTimers[blockId];
  });
}

function _handleFormSubmit(container, moduleId, formEl){
  var ms = getModuleState(moduleId);
  var blockId = formEl.getAttribute('data-hm-form-block');
  var block = _findBlockById(ms._schema, blockId);
  var formData = _storeFormDraftFromElement(moduleId, formEl);
  var context = _buildReactiveContext(moduleId);
  var validationResult = { valid:true, errors:{} };
  var submitConfig;
  function finalizeSubmit(payload){
    var modalCfg = _modalConfig(block && block.config || {});
    ms.blockData[blockId] = payload && payload.data ? payload.data : payload;
    ms.formErrors[blockId] = {};
    if(block && block.type === 'form-modal' && modalCfg.closeOnSubmit !== false){
      _modalState(moduleId, blockId).open = false;
      _modalState(moduleId, blockId).focused = false;
      _modalState(moduleId, blockId).restoreFocus = true;
    }
    refreshDependents(moduleId, blockId);
    renderModuleFromSchema(container, ms._schema);
  }
  if(!block) return;
  context._moduleId = moduleId;
  context._container = container;
  context.block = block;
  context.formData = formData;
  if(!(block.config && block.config.validation && block.config.validation.autoApply === false)){
    validationResult = validateForm(block.config.fields || [], formData, context);
  }
  ms.formErrors[blockId] = validationResult.errors || {};
  showValidationErrors(formEl, validationResult.errors || {});
  if(!validationResult.valid){
    toast(_t('Biểu mẫu còn lỗi validation.', 'The form still has validation errors.'), 'danger');
    return;
  }
  submitConfig = _normalizeSubmitConfig(block.config || {}, block.type === 'form-modal' ? 'modal' : '');
  if(!submitConfig.api){
    toast(_t('Biểu mẫu hợp lệ và đã được lưu trong phiên làm việc.', 'The form is valid and has been stored in the current session.'), 'success');
    finalizeSubmit(formData);
    return;
  }
  _api(submitConfig.api, formData, submitConfig.method || 'POST').then(function(resp){
    toast(_t('Đã gửi biểu mẫu thành công.', 'Form submitted successfully.'), 'success');
    invalidateCache(submitConfig.api);
    finalizeSubmit(resp && resp.data ? resp : formData);
  }).catch(function(err){
    toast(_t('Gửi biểu mẫu thất bại.', 'Form submission failed.'), 'danger');
    console.warn('[BlockEngine] form submit failed', err);
  });
}

function _recordDetailFieldKeys(section){
  var keys = [];
  if(section && Array.isArray(section.fieldKeys) && section.fieldKeys.length){
    keys = section.fieldKeys;
  } else if(section && Array.isArray(section.field_keys) && section.field_keys.length){
    keys = section.field_keys;
  } else if(section && typeof section.fieldsCsv === 'string'){
    keys = String(section.fieldsCsv).split(',');
  }
  return keys.map(function(key){
    return String(key || '').replace(/^\s+|\s+$/g, '');
  }).filter(Boolean);
}

function _recordDetailRuntimeFields(config){
  var detail = config && config.detail ? config.detail : {};
  var fields = Array.isArray(config && config.fields) ? config.fields.slice() : [];
  var map = {};
  function addField(field){
    if(!field || !field.key || map[field.key]) return;
    map[field.key] = field;
    fields.push(field);
  }
  if(fields.length) return fields;
  [
    { key: detail.titleField, label:_t('Tiêu đề', 'Title'), type:'string', span:'full' },
    { key: detail.subtitleField, label:_t('Phụ đề', 'Subtitle'), type:'string', span:'full' },
    { key: detail.statusField, label:_t('Trạng thái', 'Status'), type:'badge', span:'half' },
    { key: detail.ownerField, label:_t('Phụ trách', 'Owner'), type:'string', span:'half' },
    { key: detail.updatedAtField, label:_t('Cập nhật', 'Updated'), type:'datetime', span:'half' },
    { key: detail.heroImageField, label:_t('Ảnh đại diện', 'Hero image'), type:'string', span:'full' }
  ].forEach(function(item){
    if(!item.key) return;
    addField({
      key: item.key,
      label: { vi:item.label, en:item.label },
      type: item.type,
      span: item.span
    });
  });
  (detail.sections || []).forEach(function(section){
    _recordDetailFieldKeys(section).forEach(function(key){
      var lower = String(key || '').toLowerCase();
      addField({
        key: key,
        label: { vi:_humanizeKey(key), en:_humanizeKey(key) },
        type: lower.indexOf('status') >= 0 ? 'badge' : ((lower.indexOf('date') >= 0 || lower.indexOf('time') >= 0) ? 'datetime' : 'string'),
        span: 'half'
      });
    });
  });
  return fields;
}

function _recordDetailSections(config){
  var detail = config && config.detail ? config.detail : {};
  var sections = Array.isArray(detail.sections) ? detail.sections : [];
  var fields = _recordDetailRuntimeFields(config);
  var fieldMap = {};
  var summaryKeys = {};
  fields.forEach(function(field){ fieldMap[field.key] = field; });
  [detail.titleField, detail.subtitleField, detail.statusField, detail.ownerField, detail.updatedAtField, detail.heroImageField].forEach(function(key){
    if(key) summaryKeys[key] = true;
  });
  if(!sections.length){
    return [{
      key: 'details',
      label: { vi:'Thông tin chi tiết', en:'Details' },
      fields: fields.filter(function(field){ return !summaryKeys[field.key]; })
    }];
  }
  return sections.map(function(section, index){
    return {
      key: section.key || ('section_' + index),
      label: section.label || { vi:_humanizeKey(section.key || ('section_' + index)), en:_humanizeKey(section.key || ('section_' + index)) },
      fields: _recordDetailFieldKeys(section).map(function(key){
        return fieldMap[key] || { key:key, label:{ vi:_humanizeKey(key), en:_humanizeKey(key) }, type:'string', span:'half' };
      }).filter(Boolean)
    };
  }).filter(function(section){ return section.fields.length; });
}

/**
 * Render a record detail view with inline-edit support.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderRecordDetail(config, data, state, blockId){
  var record = _detailRecord(data);
  var detailCfg = config && config.detail ? config.detail : {};
  var fields = _recordDetailRuntimeFields(config || {});
  var sections = _recordDetailSections(config || {});
  var moduleId = _chartModuleId(state);
  var ms = getModuleState(moduleId);
  var detailState = ms.detailStates[blockId] || { editing:'' };
  var html = '';
  var statusValue;
  var ownerValue;
  var updatedValue;
  if(state && state.loading && state.loading[blockId]){
    return '<div class="hm-skeleton"><div class="hm-skeleton-line"></div><div class="hm-skeleton-line"></div><div class="hm-skeleton-line hm-skeleton-short"></div></div>';
  }
  if(!record) return _chartEmpty(_t('Không tìm thấy bản ghi', 'Record not found'));
  statusValue = detailCfg.statusField ? record[detailCfg.statusField] : null;
  ownerValue = detailCfg.ownerField ? record[detailCfg.ownerField] : null;
  updatedValue = detailCfg.updatedAtField ? record[detailCfg.updatedAtField] : null;
  html += '<div class="hm-record-detail" data-block-id="'+_esc(blockId || '')+'">';
  if(detailCfg.titleField || detailCfg.subtitleField || detailCfg.statusField || detailCfg.ownerField || detailCfg.updatedAtField){
    html += '<div class="hm-record-detail-header">';
    html += '<div class="hm-record-detail-copy">';
    if(detailCfg.titleField) html += '<div class="hm-record-detail-title">'+_esc(record[detailCfg.titleField] == null ? '' : String(record[detailCfg.titleField]))+'</div>';
    if(detailCfg.subtitleField) html += '<div class="hm-record-detail-subtitle">'+_esc(record[detailCfg.subtitleField] == null ? '' : String(record[detailCfg.subtitleField]))+'</div>';
    html += '</div>';
    html += '<div class="hm-record-detail-meta">';
    if(statusValue != null && statusValue !== '') html += '<span class="hm-record-detail-chip">'+_esc(String(statusValue))+'</span>';
    if(ownerValue != null && ownerValue !== '') html += '<span class="hm-record-detail-chip">'+_esc(String(ownerValue))+'</span>';
    if(updatedValue != null && updatedValue !== '') html += '<span class="hm-record-detail-chip">'+_esc(_chartDateLabel(updatedValue))+'</span>';
    html += '</div></div>';
  }
  function renderField(field){
    var key = field.key;
    var label = _chartText(field, key, key);
    var value = record[key];
    var editing = detailState.editing === key && config.editable !== false;
    html += '<div class="hm-record-field hm-record-field-'+_esc(field.span || 'half')+'"><div class="hm-record-label">'+_esc(label)+'</div>';
    if(editing){
      html += '<input type="'+(field.type === 'number' || field.type === 'currency' ? 'number' : (field.type === 'date' ? 'date' : 'text'))+'" class="hm-input" data-action="hm-detail-input" data-block-id="'+_esc(blockId || '')+'" data-field="'+_esc(key)+'" value="'+_esc(value == null ? '' : String(value))+'">';
    } else {
      html += '<button type="button" class="hm-record-value" data-action="hm-detail-edit" data-block-id="'+_esc(blockId || '')+'" data-field="'+_esc(key)+'">'+_esc(field.type === 'currency' ? _chartFormatValue(value, 'currency') : (field.type === 'date' || field.type === 'datetime') ? _chartDateLabel(value) : value == null ? '' : String(value))+'</button>';
    }
    html += '</div>';
  }
  sections.forEach(function(section){
    html += '<section class="hm-record-detail-section">';
    html += '<div class="hm-record-detail-section-title">'+_esc(_chartText(section.label, section.key || 'section', section.key || 'section'))+'</div>';
    (section.fields || []).forEach(renderField);
    html += '</section>';
  });
  if(!sections.length){
    fields.forEach(renderField);
  }
  html += '</div>';
  return html;
}

/**
 * Render a step-by-step form wizard with validation and summary support.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @param {Object} reactiveCtx
 * @returns {string}
 */
function renderFormWizard(config, data, state, blockId, reactiveCtx){
  try {
    var moduleId = reactiveCtx && reactiveCtx._moduleId ? reactiveCtx._moduleId : _chartModuleId(state);
    var ms = getModuleState(moduleId);
    var wizard = _wizardConfig(config || {});
    var formData = _managedFormData(moduleId, blockId, _detailRecord(data) || {});
    var ctx = Object.assign({}, reactiveCtx || {}, { formData:formData, row:formData, data:formData });
    var steps = _wizardVisibleSteps(config || {}, ctx);
    var allFields = _wizardFieldCatalog(config || {});
    var ws = _wizardState(moduleId, blockId);
    var errors = ms.formErrors[blockId] || {};
    var html = '';
    if(!steps.length){
      steps = [{ key:'info', label:{ vi:'Thông tin', en:'Information' }, fields:allFields }];
    }
    ws.step = _chartClamp(ws.step || 0, 0, Math.max(steps.length - 1, 0));
    html += '<div class="hm-form-wizard hm-form-wizard-'+_esc(ws.direction || 'forward')+'" data-block-id="'+_esc(blockId || '')+'">';
    if(wizard.showProgress !== false){
      html += '<div class="hm-form-wizard-progressbar" aria-hidden="true"><span style="width:'+(((ws.step + 1) / steps.length) * 100).toFixed(2)+'%"></span></div>';
      html += '<ol class="hm-form-wizard-steps" role="list" aria-label="'+_esc(_t('Tiến độ biểu mẫu', 'Form progress'))+'">';
      steps.forEach(function(step, index){
        var stepTitle = step.label != null ? step.label : step.title;
        var label = stepTitle && typeof stepTitle === 'object' ? _t(stepTitle.vi || stepTitle.en || ('Bước ' + (index + 1)), stepTitle.en || stepTitle.vi || ('Step ' + (index + 1))) : _t(stepTitle || ('Bước ' + (index + 1)), step.labelEn || step.titleEn || stepTitle || ('Step ' + (index + 1)));
        var status = index < ws.step ? 'done' : (index === ws.step ? 'active' : 'pending');
        html += '<li class="hm-form-wizard-step hm-form-wizard-step-'+status+'">';
        html += '<span class="hm-form-wizard-marker" aria-hidden="true">'+(index < ws.step ? '&#10003;' : String(index + 1))+'</span>';
        html += '<span class="hm-form-wizard-label">'+_esc(label)+'</span>';
        html += '</li>';
      });
      html += '</ol>';
    }
    (function(){
      var currentStep = steps[ws.step];
      var currentTitle = currentStep.label != null ? currentStep.label : currentStep.title;
      var currentLabel = currentTitle && typeof currentTitle === 'object' ? _t(currentTitle.vi || currentTitle.en || 'Bước hiện tại', currentTitle.en || currentTitle.vi || 'Current step') : _t(currentTitle || 'Bước hiện tại', currentStep.labelEn || currentStep.titleEn || currentTitle || 'Current step');
      var isSummary = _wizardIsSummaryStep(currentStep, config || {}, ws.step, steps.length);
      var currentFields = isSummary ? [] : _wizardStepFields(currentStep, allFields);
      html += '<div class="hm-form-wizard-panel">';
      html += '<div class="hm-form-wizard-header"><div><h3>'+_esc(currentLabel)+'</h3><p>'+_esc(_t('Bước ' + (ws.step + 1) + ' / ' + steps.length, 'Step ' + (ws.step + 1) + ' / ' + steps.length))+'</p></div></div>';
      html += '<form class="hm-form hm-form-wizard-form" data-hm-form-block="'+_esc(blockId || '')+'" onsubmit="return false" novalidate aria-label="'+_esc(currentLabel)+'">';
      if(isSummary){
        html += '<div class="hm-form-wizard-summary" role="region" aria-label="'+_esc(_t('Tóm tắt thông tin đã nhập', 'Entered information summary'))+'">';
        allFields.forEach(function(field){
          var rawValue = formData[field.key];
          var formatted = rawValue == null ? '' : String(rawValue);
          if(field.type === 'currency') formatted = _chartFormatValue(rawValue, 'currency');
          else if(field.type === 'date' || field.type === 'datetime') formatted = _chartDateLabel(rawValue);
          else if(field.type === 'checkbox' || field.type === 'boolean') formatted = rawValue ? _t('Có', 'Yes') : _t('Không', 'No');
          html += '<div class="hm-form-wizard-summary-item"><small>'+_esc(_getFieldLabel(field) || field.key)+'</small><strong>'+_esc(formatted || '—')+'</strong></div>';
        });
        html += '</div>';
      } else {
        html += _renderManagedFieldGrid(currentFields, formData, errors, blockId);
      }
      html += '<div class="hm-form-wizard-actions">';
      html += '<button type="button" class="hm-btn hm-btn-ghost" data-action="hm-wizard-prev" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_esc(_t('Quay lại bước trước', 'Go to previous step'))+'" role="button"'+(ws.step <= 0 ? ' disabled' : '')+'>'+_t('Quay lại', 'Back')+'</button>';
      if(ws.step < steps.length - 1){
        if(wizard.allowSkip){
          html += '<button type="button" class="hm-btn hm-btn-secondary" data-action="hm-wizard-next" data-skip="1" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_esc(_t('Bỏ qua bước hiện tại', 'Skip current step'))+'" role="button">'+_t('Bỏ qua', 'Skip')+'</button>';
        }
        html += '<button type="button" class="hm-btn hm-btn-primary" data-action="hm-wizard-next" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_esc(_t('Tiếp tục sang bước tiếp theo', 'Continue to the next step'))+'" role="button">'+_t('Tiếp tục', 'Continue')+'</button>';
      } else {
        html += '<button type="button" class="hm-btn hm-btn-primary" data-action="hm-wizard-submit" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_esc(_t('Gửi biểu mẫu wizard', 'Submit wizard form'))+'" role="button">'+_t('Gửi', 'Submit')+'</button>';
      }
      html += '</div></form></div>';
    }());
    html += '</div>';
    return html;
  } catch(err){
    console.warn('[BlockEngine] renderFormWizard failed', err);
    return _chartError(_t('Không thể hiển thị form wizard', 'Unable to render form wizard'));
  }
}

/**
 * Render an inline modal trigger and managed modal form surface.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @param {Object} reactiveCtx
 * @returns {string}
 */
function renderFormModal(config, data, state, blockId, reactiveCtx){
  try {
    var moduleId = reactiveCtx && reactiveCtx._moduleId ? reactiveCtx._moduleId : _chartModuleId(state);
    var ms = getModuleState(moduleId);
    var modal = _modalConfig(config || {});
    var modalState = _modalState(moduleId, blockId);
    var formData = _managedFormData(moduleId, blockId, _detailRecord(data) || {});
    var fields = config.fields || modal.fields || [];
    var errors = ms.formErrors[blockId] || {};
    var trigger = modal.trigger || {};
    var triggerLabel = trigger.label && typeof trigger.label === 'object' ? _t(trigger.label.vi || 'Tạo mới', trigger.label.en || trigger.label.vi || 'Create new') : _t(trigger.label || 'Tạo mới', trigger.labelEn || trigger.label || 'Create new');
    var titleId = _managedFieldId(blockId, 'modal_title');
    var titleText = modal.title && typeof modal.title === 'object' ? _t(modal.title.vi || 'Tạo bản ghi mới', modal.title.en || modal.title.vi || 'Create new record') : _t(modal.title || 'Tạo bản ghi mới', modal.titleEn || modal.title || 'Create new record');
    var html = '<div class="hm-form-modal-wrap" data-block-id="'+_esc(blockId || '')+'">';
    html += '<button type="button" class="hm-btn hm-btn-'+_esc(trigger.style || 'primary')+'" data-action="hm-modal-open" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_esc(triggerLabel)+'" aria-expanded="'+(modalState.open ? 'true' : 'false')+'" aria-haspopup="dialog" role="button">';
    if(trigger.icon) html += '<span class="hm-btn-icon" aria-hidden="true">'+_esc(trigger.icon)+'</span>';
    html += _esc(triggerLabel) + '</button>';
    if(modalState.open){
      html += '<div class="hm-form-modal-overlay'+(modal.closeOnOverlay === false ? ' is-locked' : '')+'">';
      html += '<div class="hm-form-modal-backdrop"'+(modal.closeOnOverlay !== false ? ' data-action="hm-modal-close"' : '')+' data-block-id="'+_esc(blockId || '')+'"></div>';
      html += '<div class="hm-form-modal hm-form-modal-'+_esc(modal.size || 'md')+'" data-block-id="'+_esc(blockId || '')+'" role="dialog" aria-modal="true" aria-labelledby="'+_esc(titleId)+'">';
      html += '<div class="hm-form-modal-header"><h3 id="'+_esc(titleId)+'">'+_esc(titleText)+'</h3><button type="button" class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-modal-close" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_esc(_t('Đóng hộp thoại', 'Close dialog'))+'" role="button">&times;</button></div>';
      html += '<form class="hm-form hm-form-modal-form" data-hm-form-block="'+_esc(blockId || '')+'" onsubmit="return false" novalidate aria-label="'+_esc(titleText)+'">';
      html += fields.length ? _renderManagedFieldGrid(fields, formData, errors, blockId) : _chartEmpty(_t('Chưa cấu hình trường cho modal', 'No modal fields configured'));
      html += '<div class="hm-form-modal-actions">';
      html += '<button type="button" class="hm-btn hm-btn-ghost" data-action="hm-modal-close" data-block-id="'+_esc(blockId || '')+'" aria-label="'+_esc(_t('Hủy và đóng hộp thoại', 'Cancel and close dialog'))+'" role="button">'+_t('Hủy', 'Cancel')+'</button>';
      html += '<button type="submit" class="hm-btn hm-btn-primary" aria-label="'+_esc(_t('Lưu biểu mẫu modal', 'Save modal form'))+'">'+_t(config.submitLabel || 'Lưu', config.submitLabelEn || 'Save')+'</button>';
      html += '</div></form></div></div>';
    }
    html += '</div>';
    return html;
  } catch(err){
    console.warn('[BlockEngine] renderFormModal failed', err);
    return _chartError(_t('Không thể hiển thị form modal', 'Unable to render form modal'));
  }
}

/**
 * Render a live machine status board with OEE mini gauges.
 * @param {Object} config
 * @param {*} data
 * @param {Object} state
 * @param {string} blockId
 * @returns {string}
 */
function renderMachineStatus(config, data, state, blockId){
  try {
    var rows = _chartRows(config || {}, data);
    var machine = _machineConfig(config || {});
    var html = '';
    if(!rows.length && data && Array.isArray(data.machines)) rows = data.machines;
    if(!rows.length && data && Array.isArray(data.assets)) rows = data.assets;
    if(!rows.length) return _chartEmpty(_t('Không có dữ liệu máy', 'No machine data'));
    html += '<div class="hm-machine-status-grid" data-block-id="'+_esc(blockId || '')+'" style="grid-template-columns:repeat('+Math.max(parseInt(machine.columns, 10) || 4, 1)+', minmax(0, 1fr))">';
    rows.forEach(function(row, index){
      var status = String(row[machine.statusKey] || 'idle').toLowerCase();
      var color = machine.statusColors[status] || 'var(--gray-400)';
      var oee = _chartClamp(_chartNumber(row[machine.oeeKey]), 0, 100);
      var label = String(row[machine.nameKey] || row[machine.codeKey] || ('MC-' + (index + 1)));
      var code = String(row[machine.codeKey] || '');
      var job = row[machine.currentJobKey] == null ? '' : String(row[machine.currentJobKey]);
      var operatorName = row[machine.operatorKey] == null ? '' : String(row[machine.operatorKey]);
      var reason = row[machine.reasonKey] == null ? '' : String(row[machine.reasonKey]);
      var updated = row[machine.lastUpdateKey] == null ? '' : String(row[machine.lastUpdateKey]).replace('T', ' ').slice(0, 16);
      html += '<button type="button" class="hm-machine-card hm-machine-card-'+_esc(status)+(status === 'running' ? ' is-running' : '')+'" style="--hm-machine-color:'+_esc(color)+'" data-action="hm-machine-card" data-block-id="'+_esc(blockId || '')+'" data-row-index="'+index+'" aria-label="'+_esc(_t('Máy ' + label + ' trạng thái ' + status, 'Machine ' + label + ' status ' + status))+'" role="button">';
      html += '<div class="hm-machine-card-top"><div><strong>'+_esc(label)+'</strong>'+(code ? '<small>'+_esc(code)+'</small>' : '')+'</div><span class="hm-machine-card-status" style="background:'+_esc(color)+'" role="status" aria-live="polite">'+_esc(status)+'</span></div>';
      html += '<div class="hm-machine-card-body"><div class="hm-machine-card-gauge" aria-hidden="true"><span class="hm-machine-card-ring" style="background:conic-gradient('+_esc(color)+' 0 '+oee+'%, rgba(148,163,184,0.18) '+oee+'% 100%)"></span><span class="hm-machine-card-ring-center">'+_esc(String(Math.round(oee)))+'%</span></div>';
      html += '<div class="hm-machine-card-fields">';
      html += '<div><small>'+_t('Công việc hiện tại', 'Current job')+'</small><strong>'+_esc(job || '—')+'</strong></div>';
      html += '<div><small>'+_t('Vận hành', 'Operator')+'</small><strong>'+_esc(operatorName || '—')+'</strong></div>';
      html += '<div><small>'+_t('Cập nhật', 'Last update')+'</small><strong>'+_esc(updated || '—')+'</strong></div>';
      if(reason) html += '<div><small>'+_t('Lý do / cảnh báo', 'Reason / alarm')+'</small><strong>'+_esc(reason)+'</strong></div>';
      html += '</div></div></button>';
    });
    html += '</div>';
    return html;
  } catch(err){
    console.warn('[BlockEngine] renderMachineStatus failed', err);
    return _chartError(_t('Không thể hiển thị trạng thái máy', 'Unable to render machine status'));
  }
}

/* --- Toolbar --- */
function renderToolbar(config, data){
  var buttons = config.buttons || [];
  var html = '<div class="hm-toolbar">';
  buttons.forEach(function(btn){
    var cls = 'hm-btn hm-btn-'+(btn.variant||'secondary');
    if(btn.size) cls += ' hm-btn-'+btn.size;
    html += '<button class="'+cls+'" data-action="'+_esc(btn.action||'')+'"'+(btn.tab ? ' data-tab="'+_esc(btn.tab)+'"' : '')+'>';
    if(btn.icon) html += '<span class="hm-btn-icon">'+btn.icon+'</span> ';
    html += _esc(_textLabel(btn.label, btn.labelEn));
    html += '</button>';
  });
  html += '</div>';
  return html;
}

function renderStatusFlow(config, data, state, blockId, reactiveCtx){
  var workflow = config.workflow || {};
  var stateField = workflow.stateField || config.statusField || 'status';
  var transitions = workflow.transitions || [];
  var states = workflow.states || [];
  var moduleId = state && state._schema ? state._schema.moduleId : '';
  var ms = moduleId ? getModuleState(moduleId) : null;
  var companionForm = moduleId ? _findCompanionFormBlock(moduleId, workflow.entity) : null;
  var formData = companionForm && ms ? (ms.formDrafts[companionForm.id] || ms.blockData[companionForm.id] || {}) : {};
  var currentState = formData[stateField] || (data && data[stateField]) || (states[0] && (states[0].id || states[0].value)) || '';
  if(!transitions.length && config.transitions){
    transitions = ((config.transitions[currentState] || []) || []).map(function(to){
      return { from: currentState, to: to, label: to };
    });
    if(!states.length){
      var seen = {};
      Object.keys(config.transitions || {}).forEach(function(from){
        if(!seen[from]){ states.push({ id: from, label: from }); seen[from] = true; }
        (config.transitions[from] || []).forEach(function(to){
          if(!seen[to]){ states.push({ id: to, label: to }); seen[to] = true; }
        });
      });
    }
  }
  var html = '<div class="hm-status-flow" style="display:grid;gap:14px">';
  if(!transitions.length){
    return '<div class="hm-empty">'+_t('Chưa cấu hình workflow cho block này', 'No workflow has been configured for this block')+'</div>';
  }
  if(config.workflow && config.workflow.showDiagram !== false && states.length){
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
    states.forEach(function(item, idx){
      var stateId = item.id || item.value || '';
      var active = stateId === currentState;
      html += '<div style="padding:8px 12px;border-radius:999px;border:1px solid '+(active ? 'var(--brand-2,#2563eb)' : 'var(--border,#cbd5e1)')+';background:'+(active ? 'rgba(37,99,235,0.08)' : '#fff')+';font-weight:'+(active ? '700' : '600')+'">'+_esc(_t(item.label || stateId, item.labelEn || item.label || stateId))+'</div>';
      if(idx < states.length - 1) html += '<span style="color:var(--text-tertiary)">→</span>';
    });
    html += '</div>';
  }
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  transitions.forEach(function(transition, idx){
    var reasons = _workflowGuardReasons(transition, formData, reactiveCtx || {});
    var disabled = currentState && transition.from && transition.from !== currentState;
    var title = '';
    if(disabled){
      title = _t('Chỉ khả dụng khi trạng thái hiện tại là ', 'Only available when the current state is ') + transition.from;
    } else if(reasons.length){
      disabled = true;
      title = reasons.join(' • ');
    }
    html += '<button class="hm-btn hm-btn-'+_esc(transition.variant || 'secondary')+'" data-action="hm-status-transition" data-block-id="'+_esc(blockId)+'" data-transition-index="'+idx+'"'+(disabled ? ' disabled' : '')+(title ? ' title="'+_esc(title)+'"' : '')+'>';
    if(transition.icon) html += '<span class="hm-btn-icon">'+_esc(transition.icon)+'</span> ';
    html += _esc(_t(transition.label && transition.label.vi || transition.label || transition.to, transition.label && transition.label.en || transition.labelEn || transition.label || transition.to));
    html += '</button>';
  });
  html += '</div>';
  if(config.workflow && config.workflow.showSla !== false && workflow.sla && Object.keys(workflow.sla).length){
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">';
    Object.keys(workflow.sla).slice(0, 4).forEach(function(key){
      var item = workflow.sla[key] || {};
      html += '<div style="padding:10px 12px;border:1px solid var(--border,#cbd5e1);border-radius:14px;background:#fff"><div style="font-size:11px;color:var(--text-tertiary)">'+_esc(key)+'</div><div style="font-size:18px;font-weight:700">'+_esc(String(item.hours || 0))+'h</div><div style="font-size:12px;color:var(--text-secondary)">'+_esc(item.escalateTo || '')+'</div></div>';
    });
    html += '</div>';
  }
  if(config.workflow && config.workflow.showDigitalThread !== false && workflow.digitalThread){
    html += '<div style="padding:12px 14px;border:1px solid rgba(15,118,110,0.22);border-radius:16px;background:rgba(15,118,110,0.05)">';
    html += '<div style="font-weight:var(--font-display-weight,700);color:var(--green-dark,#0f766e);margin-bottom:var(--space-2,6px)">'+_t('Digital thread', 'Digital thread')+'</div>';
    if((workflow.digitalThread.upstreamTriggers || []).length){
      html += '<div style="font-size:12px;color:var(--text-secondary)"><strong>'+_t('Upstream', 'Upstream')+':</strong> '+_esc(workflow.digitalThread.upstreamTriggers.join(', '))+'</div>';
    }
    if((workflow.digitalThread.downstreamEffects || []).length){
      html += '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px"><strong>'+_t('Downstream', 'Downstream')+':</strong> '+_esc(workflow.digitalThread.downstreamEffects.join(', '))+'</div>';
    }
    html += '</div>';
  }
  return html + '</div>';
}

/* --- Card Grid --- */
function renderCardGrid(config, data){
  var items = (data && data[config.dataKey]) || [];
  if(!items.length) return '<div class="hm-empty">'+_t('Không có dữ liệu','No data')+'</div>';

  var cols = config.columns || 3;
  var html = '<div class="hm-card-grid" style="grid-template-columns:repeat('+cols+',1fr)">';
  items.forEach(function(item){
    html += '<div class="hm-card">';
    if(config.titleKey) html += '<div class="hm-card-title">'+_esc(item[config.titleKey]||'')+'</div>';
    if(config.subtitleKey) html += '<div class="hm-card-subtitle">'+_esc(item[config.subtitleKey]||'')+'</div>';
    if(config.badgeKey) html += '<span class="hm-badge hm-badge-'+_esc(item[config.badgeKey]||'draft')+'">'+_esc(item[config.badgeKey]||'')+'</span>';
    if(config.bodyKeys){
      config.bodyKeys.forEach(function(bk){
        html += '<div class="hm-card-field"><span class="hm-card-field-label">'+_esc(_t(bk.label||'',bk.labelEn||''))+':</span> '+_esc(item[bk.key]||'')+'</div>';
      });
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* --- Timeline --- */
function renderTimeline(config, data){
  var items = (data && data[config.dataKey]) || config.items || [];
  if(!items.length) return '<div class="hm-empty">'+_t('Không có dữ liệu','No data')+'</div>';

  var html = '<div class="hm-timeline">';
  items.forEach(function(item, idx){
    var isLast = idx === items.length-1;
    html += '<div class="hm-timeline-item'+(isLast?' hm-timeline-last':'')+'">';
    html += '<div class="hm-timeline-dot" style="background:'+(item.color||'var(--brand-2)')+'"></div>';
    if(!isLast) html += '<div class="hm-timeline-line"></div>';
    html += '<div class="hm-timeline-content">';
    if(item.date) html += '<div class="hm-timeline-date">'+_esc(item.date)+'</div>';
    html += '<div class="hm-timeline-title">'+_esc(_t(item.title||'',item.titleEn||''))+'</div>';
    if(item.desc) html += '<div class="hm-timeline-desc">'+_esc(_t(item.desc||'',item.descEn||''))+'</div>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

/* --- Form Standard --- */
function renderFormStandard(config, data, reactiveCtx, block){
  var fields = config.fields || [];
  var cols = config.columns || 2;
  var moduleId = reactiveCtx && reactiveCtx._moduleId ? reactiveCtx._moduleId : '';
  var blockId = block ? (block.id || block.blockId || '') : '';
  var ms = moduleId ? getModuleState(moduleId) : null;
  var formData = {};
  var errors = ms && blockId ? (ms.formErrors[blockId] || {}) : {};
  var html;
  Object.keys(data || {}).forEach(function(key){ formData[key] = data[key]; });
  if(ms && blockId && ms.formDrafts[blockId]){
    Object.keys(ms.formDrafts[blockId]).forEach(function(key){ formData[key] = ms.formDrafts[blockId][key]; });
  }
  html = '<form class="hm-form" data-hm-form-block="'+_esc(blockId)+'" data-entity="'+_esc(config.entity || '')+'" style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:var(--space-4)" onsubmit="return false" novalidate>';
  fields.forEach(function(f){
    var span = f.span === 'full' ? '1 / -1' : ('span ' + (f.span === 'half' ? 1 : (parseInt(f.span, 10) || 1)));
    var validation = config.validation && config.validation.autoApply === false ? {} : (f.validation || {});
    var val = formData[f.key] != null ? formData[f.key] : (f.defaultValue != null ? f.defaultValue : (f.default || ''));
    var placeholder = '';
    var attrs = '';
    var error = errors[f.key];
    if(f.placeholder && typeof f.placeholder === 'object') placeholder = _t(f.placeholder.vi || '', f.placeholder.en || f.placeholder.vi || '');
    else placeholder = _t(f.placeholder || '', f.placeholderEn || f.placeholder || '');
    if(f.required || validation.required) attrs += ' required';
    if(validation.min != null) attrs += ' min="'+_esc(String(validation.min))+'"';
    if(validation.max != null) attrs += ' max="'+_esc(String(validation.max))+'"';
    if(validation.minLength != null) attrs += ' minlength="'+_esc(String(validation.minLength))+'"';
    if(validation.maxLength != null) attrs += ' maxlength="'+_esc(String(validation.maxLength))+'"';
    if(validation.pattern) attrs += ' pattern="'+_esc(validation.pattern)+'"';
    html += '<div class="hm-form-group" style="grid-column:'+span+'">';
    html += '<label class="hm-label">'+_esc(_getFieldLabel(f))+(f.required || validation.required ? ' <span class="hm-required">*</span>' : '')+'</label>';
    if(f.type==='textarea'){
      html += '<textarea class="hm-input hm-textarea'+(error ? ' hm-field-invalid' : '')+'" name="'+_esc(f.key)+'" rows="'+(f.rows||3)+'"'+attrs+(placeholder ? ' placeholder="'+_esc(placeholder)+'"' : '')+'>'+_esc(val)+'</textarea>';
    } else if(f.type==='select'){
      var resolvedOptions = _fieldSelectOptions(f, val, { table: config && config.table });
      html += '<select class="hm-input hm-select'+(error ? ' hm-field-invalid' : '')+'" name="'+_esc(f.key)+'"'+attrs+'>';
      html += '<option value="">'+_t('Chon...','Select...')+'</option>';
      resolvedOptions.forEach(function(opt){
        var sel = String(val)===String(opt.value) ? ' selected' : '';
        html += '<option value="'+_esc(opt.value)+'"'+sel+'>'+_esc(_t(opt.label && opt.label.vi || opt.label || '', opt.label && opt.label.en || opt.labelEn || opt.label || ''))+'</option>';
      });
      html += '</select>';
    } else if(f.type==='checkbox'){
      html += '<label class="hm-checkbox-label"><input type="checkbox" name="'+_esc(f.key)+'"'+(val?' checked':'')+'> '+_esc(_t(f.checkLabel||'',f.checkLabelEn||''))+'</label>';
    } else {
      var inputType = f.type || 'text';
      if(inputType === 'string' || inputType === 'badge') inputType = 'text';
      if(inputType === 'integer') inputType = 'number';
      if(inputType === 'currency' || inputType === 'percent' || inputType === 'percentage') inputType = 'number';
      if(inputType === 'datetime') inputType = 'datetime-local';
      html += '<input type="'+inputType+'" class="hm-input'+(error ? ' hm-field-invalid' : '')+'" name="'+_esc(f.key)+'" value="'+_esc(val)+'"'+attrs+(placeholder ? ' placeholder="'+_esc(placeholder)+'"' : '')+'>';
    }
    if(error){
      html += '<div class="hm-field-error hm-field-error-'+_esc((error.severity || _fieldSeverity(f)).toLowerCase())+'" role="alert">'+_esc(error.message || error)+'</div>';
    }
    html += '</div>';
  });
  if(config.showSubmit!==false){
    html += '<div class="hm-form-group" style="grid-column:1/-1;display:flex;gap:var(--space-2);justify-content:flex-end">';
    html += '<button type="reset" class="hm-btn hm-btn-ghost">'+_t('Huy','Cancel')+'</button>';
    html += '<button type="submit" class="hm-btn hm-btn-primary" data-action="'+(config.submitAction||'form-submit')+'">'+_t(config.submitLabel||'Lưu',config.submitLabelEn||'Save')+'</button>';
    html += '</div>';
  }
  html += '</form>';
  return html;
}

/* --- Section Header --- */
function renderSectionHeader(config){
  var tag = config.level==='h2' ? 'h2' : 'h3';
  var html = '<'+tag+' class="hm-section-header">'+_esc(_t(config.text||'',config.textEn||''))+'</'+tag+'>';
  if(config.divider!==false) html += '<hr class="hm-divider">';
  return html;
}

/* --- Info Banner --- */
function renderInfoBanner(config){
  var type = config.type || 'info'; // info, success, warning, danger
  var html = '<div class="hm-banner hm-banner-'+_esc(type)+'">';
  if(config.icon) html += '<span class="hm-banner-icon">'+config.icon+'</span>';
  html += '<div class="hm-banner-text">'+_esc(_t(config.text||'',config.textEn||''))+'</div>';
  if(config.dismissible) html += '<button class="hm-banner-close" data-action="hm-dismiss">&times;</button>';
  html += '</div>';
  return html;
}

/* ── Edit Mode System ────────────────────────────────────────────────── */

function toggleEditMode(moduleId){
  var state = getModuleState(moduleId);
  state.editMode = !state.editMode;
  if(!state.editMode) state.selectedBlock = null;
  document.body.classList.toggle('hm-edit-mode', state.editMode);
  return state.editMode;
}

function moveBlockUp(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  var idx = tab.blocks.findIndex(function(b){ return b.id===blockId; });
  if(idx <= 0) return;
  var tmp = tab.blocks[idx-1];
  tab.blocks[idx-1] = tab.blocks[idx];
  tab.blocks[idx] = tmp;
}

function moveBlockDown(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  var idx = tab.blocks.findIndex(function(b){ return b.id===blockId; });
  if(idx < 0 || idx >= tab.blocks.length-1) return;
  var tmp = tab.blocks[idx+1];
  tab.blocks[idx+1] = tab.blocks[idx];
  tab.blocks[idx] = tmp;
}

function toggleBlockVisibility(moduleId, blockId){
  var block = _findBlockById(getModuleState(moduleId)._schema, blockId);
  if(block) block.visible = block.visible===false ? true : false;
}

function deleteBlock(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  tab.blocks = tab.blocks.filter(function(b){ return b.id!==blockId; });
}

function _duplicateBlock(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  var idx = tab.blocks.findIndex(function(b){ return b.id===blockId; });
  if(idx < 0) return;
  var original = tab.blocks[idx];
  var dup = _clone(original);
  dup.id = _uid();
  if(dup.title){
    if(typeof dup.title === 'object'){
      if(dup.title.vi) dup.title.vi += ' (ban sao)';
      if(dup.title.en) dup.title.en += ' (copy)';
    }
  }
  tab.blocks.splice(idx+1, 0, dup);
}

function addBlock(moduleId, tabKey, afterBlockId, blockType){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;

  var newBlock = {
    id: _uid(),
    type: blockType,
    title: { vi: BLOCK_CATALOG[blockType]?BLOCK_CATALOG[blockType].label:blockType,
             en: BLOCK_CATALOG[blockType]?BLOCK_CATALOG[blockType].labelEn:blockType },
    visible: true,
    config: _defaultConfigForType(blockType),
  };

  if(!afterBlockId){
    tab.blocks.unshift(newBlock);
  } else {
    var idx = tab.blocks.findIndex(function(b){ return b.id===afterBlockId; });
    if(idx < 0) tab.blocks.push(newBlock);
    else tab.blocks.splice(idx+1, 0, newBlock);
  }
}

function _addBlockFromTemplate(moduleId, tabKey, afterBlockId, templateKey){
  var tpl = BLOCK_TEMPLATES[templateKey];
  if(!tpl) return;
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;

  var newBlock = _clone(tpl);
  newBlock.id = _uid();
  newBlock.visible = true;

  if(!afterBlockId){
    tab.blocks.unshift(newBlock);
  } else {
    var idx = tab.blocks.findIndex(function(b){ return b.id===afterBlockId; });
    if(idx < 0) tab.blocks.push(newBlock);
    else tab.blocks.splice(idx+1, 0, newBlock);
  }
}

function _schemaCloneDefault(value){
  if(Array.isArray(value) || (value && typeof value === 'object')) return _clone(value);
  return value;
}

function _schemaSetPath(target, path, value){
  if(!path) return;
  var parts = path.split('.');
  var ctx = target;
  var i;
  for(i = 0; i < parts.length - 1; i++){
    if(!ctx[parts[i]] || typeof ctx[parts[i]] !== 'object') ctx[parts[i]] = {};
    ctx = ctx[parts[i]];
  }
  ctx[parts[parts.length - 1]] = _schemaCloneDefault(value);
}

function _collectSchemaDefaults(type){
  var blockDefaults = {};
  var tabs = BLOCK_PROPERTIES_SCHEMA[type] || [];

  tabs.forEach(function(tab){
    (tab.sections || []).forEach(function(section){
      (section.fields || []).forEach(function(field){
        if(field.default === undefined) return;
        _schemaSetPath(blockDefaults, field.path, field.default);
      });
    });
  });

  return blockDefaults.config || {};
}

function _defaultConfigForType(type){
  var schemaConfig = _collectSchemaDefaults(type);
  if(schemaConfig && Object.keys(schemaConfig).length) return schemaConfig;
  switch(type){
    case 'section-header': return { text:'', textEn:'', level:'h3' };
    case 'info-banner':    return { text:'', textEn:'', type:'info' };
    case 'spacer':         return { height:16 };
    case 'two-column':     return { ratio:'50-50' };
    case 'card-container': return {};
    default:               return {};
  }
}

/* ── Block Library Popup ─────────────────────────────────────────────── */

function showBlockLibrary(callback){
  var overlay = document.createElement('div');
  overlay.className = 'hm-modal-overlay';

  var modal = document.createElement('div');
  modal.className = 'hm-modal hm-block-library';

  var html = '<div class="hm-modal-header">';
  html += '<h3 class="hm-modal-title">'+_t('Thu vien block','Block Library')+'</h3>';
  html += '<button class="hm-modal-close" data-action="close">&times;</button>';
  html += '</div>';
  html += '<div class="hm-modal-body">';

  // Block catalog (by category)
  BLOCK_CATEGORIES.forEach(function(cat){
    html += '<div class="hm-lib-category">';
    html += '<h4 class="hm-lib-cat-title" style="color:'+cat.color+'">'+_esc(_t(cat.label,cat.labelEn))+'</h4>';
    html += '<div class="hm-lib-grid">';
    Object.keys(BLOCK_CATALOG).forEach(function(key){
      var b = BLOCK_CATALOG[key];
      if(b.category !== cat.key) return;
      html += '<div class="hm-lib-item" data-block-type="'+_esc(key)+'">';
      html += '<span class="hm-lib-icon">'+b.icon+'</span>';
      html += '<span class="hm-lib-name">'+_esc(_t(b.label,b.labelEn))+'</span>';
      html += '<span class="hm-lib-desc">'+_esc(_t(b.desc||'',b.descEn||''))+'</span>';
      html += '</div>';
    });
    html += '</div></div>';
  });

  // Templates section
  var templateKeys = Object.keys(BLOCK_TEMPLATES);
  if(templateKeys.length){
    html += '<div class="hm-lib-category">';
    html += '<h4 class="hm-lib-cat-title" style="color:var(--purple-light,#6366f1)">'+_t('Mau co san','Templates')+'</h4>';
    html += '<div class="hm-lib-grid">';
    templateKeys.forEach(function(key){
      var tpl = BLOCK_TEMPLATES[key];
      var catInfo = BLOCK_CATALOG[tpl.type];
      html += '<div class="hm-lib-item hm-lib-template" data-template="'+_esc(key)+'">';
      html += '<span class="hm-lib-icon">'+(catInfo?catInfo.icon:'&#128230;')+'</span>';
      html += '<span class="hm-lib-name">'+_esc(key)+'</span>';
      html += '<span class="hm-lib-desc">'+_esc(_t(tpl.title?tpl.title.vi||'':'', tpl.title?tpl.title.en||'':''))+'</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  html += '</div>';
  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Events
  function close(){ if(overlay.parentNode) overlay.remove(); }
  overlay.addEventListener('click', function(e){
    if(e.target===overlay) close();
    var closeBtn = e.target.closest('[data-action="close"]');
    if(closeBtn) close();
    var item = e.target.closest('[data-block-type]');
    if(item){
      var type = item.getAttribute('data-block-type');
      close();
      if(callback) callback(type);
    }
    var tplItem = e.target.closest('[data-template]');
    if(tplItem){
      var tplKey = tplItem.getAttribute('data-template');
      close();
      // Add template block
      if(_currentModuleId){
        var ms = getModuleState(_currentModuleId);
        pushUndo(_currentModuleId, 'add-template', ms._schema);
        _addBlockFromTemplate(_currentModuleId, ms.activeTab, null, tplKey);
        if(_currentContainer && ms._schema) renderModuleFromSchema(_currentContainer, ms._schema);
      }
    }
  });
}

/* ── Properties Panel Renderer ───────────────────────────────────────── */

function renderPropertiesPanel(block, moduleId){
  if(!block) return '';

  var html = '<div class="hm-props-panel">';
  html += '<div class="hm-props-header">';
  html += '<h4>'+_t('Thuoc tinh','Properties')+'</h4>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-select-block" data-block-id="">&times;</button>';
  html += '</div>';
  html += '<div class="hm-props-body">';

  // Title
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Tiêu đề','Title')+'</label>';
  html += '<input class="hm-input" id="hm-prop-title-vi" value="'+_esc(block.title?block.title.vi||'':'')+'" placeholder="Tieng Viet">';
  html += '<input class="hm-input" id="hm-prop-title-en" value="'+_esc(block.title?block.title.en||'':'')+'" placeholder="English" style="margin-top:4px">';
  html += '</div>';

  // Block type (read-only)
  var catalog = BLOCK_CATALOG[block.type];
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Loai','Type')+'</label>';
  html += '<div class="hm-prop-readonly">'+(catalog?catalog.icon+' ':'')+_esc(block.type)+'</div>';
  html += '</div>';

  // Conditional visibility
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Điều kiện hiển thị','Visible When')+'</label>';
  html += '<input class="hm-input hm-input-sm" id="hm-prop-visible-when" value="'+_esc(block.visibleWhen||'')+'" placeholder="{{ expression }}">';
  html += '<small class="hm-hint">'+_t('VD: {{ state.activeTab === &quot;overview&quot; }}','E.g.: {{ state.activeTab === &quot;overview&quot; }}')+'</small>';
  html += '</div>';

  // Variant
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Kieu hien thi','Variant')+'</label>';
  html += '<select class="hm-input hm-select hm-input-sm" id="hm-prop-variant">';
  ['default','compact','spacious','mobile'].forEach(function(v){
    var sel = (block.config && block.config.variant === v) ? ' selected' : (!block.config||!block.config.variant) && v==='default' ? ' selected' : '';
    html += '<option value="'+v+'"'+sel+'>'+v+'</option>';
  });
  html += '</select>';
  html += '</div>';

  // Color scheme
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Phoi mau','Color Scheme')+'</label>';
  html += '<select class="hm-input hm-select hm-input-sm" id="hm-prop-color-scheme">';
  ['light','dark','brand','transparent'].forEach(function(v){
    var sel = (block.config && block.config.colorScheme === v) ? ' selected' : (!block.config||!block.config.colorScheme) && v==='light' ? ' selected' : '';
    html += '<option value="'+v+'"'+sel+'>'+v+'</option>';
  });
  html += '</select>';
  html += '</div>';

  // API endpoint selector
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Nguồn dữ liệu','Data Source')+'</label>';
  html += '<select class="hm-input hm-select" id="hm-prop-api">';
  html += '<option value="">'+_t('Không','None')+'</option>';
  var currentApi = (block.config && block.config.dataSource) ? block.config.dataSource.api : '';
  // Group by module
  var grouped = {};
  API_CATALOG.forEach(function(a){
    if(!grouped[a.module]) grouped[a.module] = [];
    grouped[a.module].push(a);
  });
  Object.keys(grouped).forEach(function(mod){
    html += '<optgroup label="'+_esc(mod)+'">';
    grouped[mod].forEach(function(a){
      var sel = currentApi===a.action ? ' selected' : '';
      html += '<option value="'+_esc(a.action)+'"'+sel+'>'+_esc(a.label)+' ('+a.method+')</option>';
    });
    html += '</optgroup>';
  });
  html += '</select>';
  html += '</div>';

  // Type-specific config
  if(block.type==='data-table'){
    html += _renderColumnEditor(block.config);
  } else if(block.type==='kpi-row'){
    html += _renderKpiEditor(block.config);
  } else if(block.type==='filter-bar'){
    html += _renderFilterEditor(block.config);
  }

  // Events section
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Sự kiện','Events')+'</label>';
  html += '<small class="hm-hint">'+_t('Cấu hình sự kiện qua JSON','Configure events via JSON')+'</small>';
  html += '<textarea class="hm-input hm-textarea hm-input-sm" id="hm-prop-events" rows="4" placeholder=\'{"onClick":{"type":"navigate","tab":"detail"}}\'>';
  html += _esc(block.events ? JSON.stringify(block.events, null, 2) : '');
  html += '</textarea>';
  html += '</div>';

  html += '</div>'; // .hm-props-body

  // Save / Cancel
  html += '<div class="hm-props-footer">';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-select-block" data-block-id="">'+_t('Huy','Cancel')+'</button>';
  html += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="hm-save-schema">'+_t('Lưu','Save')+'</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

function _renderColumnEditor(config){
  var cols = (config && config.columns) || [];
  var html = '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Cac cot','Columns')+' ('+cols.length+')</label>';
  html += '<div class="hm-prop-list">';
  cols.forEach(function(c,i){
    html += '<div class="hm-prop-list-item">';
    html += '<span>'+_esc(c.key)+' <small>('+_esc(c.type||'text')+')</small></span>';
    html += '<span class="hm-prop-list-label">'+_esc(_t(c.label||c.key,c.labelEn||c.key))+'</span>';
    if(c.formula) html += '<small class="hm-hint">fx: '+_esc(c.formula)+'</small>';
    if(c.aggregate) html += '<small class="hm-hint">agg: '+_esc(c.aggregate)+'</small>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function _renderKpiEditor(config){
  var items = (config && config.items) || [];
  var html = '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Chi so KPI','KPI Items')+' ('+items.length+')</label>';
  html += '<div class="hm-prop-list">';
  items.forEach(function(item){
    html += '<div class="hm-prop-list-item">';
    html += '<span>'+_esc(item.dataKey||'')+'</span>';
    html += '<span class="hm-prop-list-label">'+_esc(_t(item.label||'',item.labelEn||''))+'</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function _renderFilterEditor(config){
  var filters = (config && config.filters) || [];
  var html = '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Bộ lọc','Filters')+' ('+filters.length+')</label>';
  html += '<div class="hm-prop-list">';
  filters.forEach(function(f){
    html += '<div class="hm-prop-list-item">';
    html += '<span>'+_esc(f.key)+' <small>('+_esc(f.type)+')</small></span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

/* ── Utility Functions ───────────────────────────────────────────────── */

function badge(status){
  return '<span class="hm-badge hm-badge-'+_esc(String(status||'draft'))+'">'+_esc(String(status||''))+'</span>';
}

function progressBar(value, max, colorClass){
  var pct = max > 0 ? Math.min(Math.round((value/max)*100),100) : 0;
  var cls = colorClass || (pct>=90?'green':pct>=70?'amber':'red');
  return '<div class="hm-progress hm-progress-'+cls+'"><div class="hm-progress-fill" style="width:'+pct+'%"></div></div>';
}

function toast(msg, type){
  var el = document.createElement('div');
  el.className = 'hm-toast hm-toast-'+(type||'info');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  setTimeout(function(){
    el.classList.remove('show');
    setTimeout(function(){ if(el.parentNode) el.remove(); }, 200);
  }, 3500);
}

/* ── Legacy Compatibility ────────────────────────────────────────────── */
/* Keep registerModule / getModuleLayout for existing code that uses them */

var _moduleLayouts = {};

function registerModule(moduleId, layout){
  _moduleLayouts[moduleId] = _clone(layout);
}

function getModuleLayout(moduleId){
  var base = _moduleLayouts[moduleId];
  if(!base) return null;
  return _applyOverrides(moduleId, _clone(base));
}

function resetModuleLayout(moduleId){
  try{ localStorage.removeItem('hesem_layout_'+moduleId); }catch(e){}
}

function moveBlock(moduleId, tabKey, blockId, direction){
  if(direction==='up') moveBlockUp(moduleId, tabKey, blockId);
  else moveBlockDown(moduleId, tabKey, blockId);
}

function isEditMode(moduleId){
  if(moduleId) return getModuleState(moduleId).editMode;
  // Fallback: check body class
  return document.body.classList.contains('hm-edit-mode');
}

/* ── Export ───────────────────────────────────────────────────────────── */
window.HmBlockEngine = {
  // Catalog
  BLOCK_CATALOG: BLOCK_CATALOG,
  BLOCK_CATEGORIES: BLOCK_CATEGORIES,
  BLOCK_PROPERTIES_SCHEMA: BLOCK_PROPERTIES_SCHEMA,
  API_CATALOG: API_CATALOG,

  // Schema operations
  renderModuleFromSchema: renderModuleFromSchema,
  loadModuleSchema: loadModuleSchema,
  saveModuleSchema: saveModuleSchema,
  resetModuleSchema: resetModuleSchema,
  createNewModule: createNewModule,

  // Edit mode
  toggleEditMode: toggleEditMode,
  showBlockLibrary: showBlockLibrary,

  // Block renderers (v2 compat)
  renderBlock: renderBlock,
  renderAdvancedTable: renderAdvancedTable,
  renderKpiRow: renderKpiRow,
  renderFilterBar: renderFilterBar,
  renderBarChart: renderBarChart,
  renderLineChart: renderLineChart,
  renderAreaChart: renderAreaChart,
  renderScatterChart: renderScatterChart,
  renderRadarChart: renderRadarChart,
  renderComboChart: renderComboChart,
  renderDonutChart: renderDonutChart,
  renderSpcChart: renderSpcChart,
  renderControlChart: renderControlChart,
  renderParetoChart: renderParetoChart,
  renderChecksheet: renderChecksheet,
  renderKanban: renderKanban,
  renderGantt: renderGantt,
  renderRecordDetail: renderRecordDetail,
  renderToolbar: renderToolbar,
  renderStatusFlow: renderStatusFlow,
  renderCardGrid: renderCardGrid,
  renderTimeline: renderTimeline,
  renderFormStandard: renderFormStandard,
  renderFormWizard: renderFormWizard,
  renderFormModal: renderFormModal,
  renderMachineStatus: renderMachineStatus,
  renderSectionHeader: renderSectionHeader,
  renderInfoBanner: renderInfoBanner,

  // v3 Block renderers
  renderAdvancedTableV3: renderAdvancedTableV3,
  renderTwoColumn: renderTwoColumn,
  renderCardContainer: renderCardContainer,

  // Properties
  renderPropertiesPanel: renderPropertiesPanel,

  // Reactive data binding (v3)
  evaluateExpression: evaluateExpression,
  resolveBindings: resolveBindings,
  evaluateFormula: evaluateFormula,
  _evalExpr: _evalExpr,
  _resolveBindings: _resolveBindings,

  // Conditional visibility (v3)
  isBlockVisible: isBlockVisible,

  // Event system (v3)
  executeEvent: executeEvent,
  EVENT_TYPES: EVENT_TYPES,

  // Undo/redo (v3)
  undo: undo,
  redo: redo,
  pushUndo: pushUndo,

  // Drag-drop (v3)
  initDragDrop: initDragDrop,

  // Dependency graph (v3)
  buildDependencyGraph: buildDependencyGraph,
  refreshDependents: refreshDependents,

  // Block templates (v3)
  BLOCK_TEMPLATES: BLOCK_TEMPLATES,

  // Theme (v3)
  getBlockClasses: getBlockClasses,

  // Keyboard shortcuts (v3)
  SHORTCUTS: SHORTCUTS,

  // Utilities
  badge: badge,
  progressBar: progressBar,
  toast: toast,
  _t: _t,
  _esc: _esc,
  _fmt: _fmt,

  // State
  getModuleState: getModuleState,
  invalidateCache: invalidateCache,
  fetchBlockData: fetchBlockData,

  // Legacy compat
  registerModule: registerModule,
  getModuleLayout: getModuleLayout,
  moveBlock: moveBlock,
  toggleBlockVisibility: toggleBlockVisibility,
  resetModuleLayout: resetModuleLayout,
  isEditMode: isEditMode,
};

/* ================================================================
 *  V4 — ADVANCED FEATURES
 *  Query Chaining · Validation · Conditional Format · Auto-Refresh
 *  Virtual Scroll · Clipboard · Block Search · Schema Versioning
 *  Accessibility (WCAG 2.1 AA)
 * ================================================================ */

// ─── 1. QUERY CHAINING ────────────────────────────────────────────
// Execute a sequential chain of actions (api → refresh → toast …).
// Each result is merged into context._lastResult for the next step.

function executeChain(actions, context, index) {
  index = index || 0;
  if (!actions || index >= actions.length) return Promise.resolve();
  return new Promise(function (resolve, reject) {
    var action = actions[index];
    var resolved = _resolveActionConfig(action, context);
    _executeSingleAction(resolved, context).then(function (result) {
      context._lastResult = result;
      executeChain(actions, context, index + 1).then(resolve).catch(reject);
    }).catch(function (err) {
      // Chain stops on first error
      if (action.onError) toast(resolveBindings(action.onError, context), 'error');
      reject(err);
    });
  });
}

function _resolveActionConfig(action, context) {
  var str = JSON.stringify(action);
  str = resolveBindings(str, context);
  try { return JSON.parse(str); } catch (e) { return action; }
}

function _executeSingleAction(action, context) {
  switch (action.type) {
    case 'api':
      return _api(action.action, action.body || {}, action.method || 'POST').then(function (r) {
        if (r && !r.ok && action.onError) {
          toast(resolveBindings(action.onError, context), 'error');
        }
        return r;
      });

    case 'refresh':
      (action.blocks || []).forEach(function (bid) {
        if(context && context._moduleId){
          var ms = getModuleState(context._moduleId);
          var block = _findBlockById(ms._schema, bid);
          if(block && block.config && block.config.dataSource && block.config.dataSource.api){
            invalidateCache(block.config.dataSource.api);
          } else {
            invalidateCache(bid);
          }
        } else {
          invalidateCache(bid);
        }
      });
      if (context && context._container && context._moduleId) {
        renderModuleFromSchema(context._container, getModuleState(context._moduleId)._schema);
      }
      return Promise.resolve();

    case 'toast':
      toast(resolveBindings(action.message || '', context), action.toastType || 'success');
      return Promise.resolve();

    case 'navigate':
      if (action.tab && context && context._moduleId) {
        EVENT_TYPES.navigate({ tab: action.tab, pass: action.pass || null }, context);
      } else if (action.url) {
        var url = resolveBindings(action.url, context);
        window.location.href = url;
      }
      return Promise.resolve();

    case 'setContext':
      if (action.key && action.value !== undefined) {
        context[action.key] = resolveBindings(String(action.value), context);
      }
      return Promise.resolve();

    case 'delay':
      return new Promise(function (resolve) {
        setTimeout(resolve, (action.ms || 500));
      });

    default:
      console.warn('[BlockEngine] Unknown chain action type:', action.type);
      return Promise.resolve();
  }
}

// ─── 2. DATA VALIDATION ENGINE ────────────────────────────────────
// Per-field validation: required, minLength, maxLength, pattern,
// min/max (numeric), and custom expression rules.

function validateField(value, rules, context) {
  if (!rules) return { valid: true };

  // Required
  if (rules.required && (value === '' || value === null || value === undefined)) {
    return { valid: false, message: _t('Trường bắt buộc', 'Required field') };
  }

  // Skip further checks for empty non-required fields
  if (value === '' || value === null || value === undefined) return { valid: true };

  var strVal = String(value);

  // String length
  if (rules.minLength && strVal.length < rules.minLength) {
    return { valid: false, message: _t('Tối thiểu ' + rules.minLength + ' ký tự', 'Minimum ' + rules.minLength + ' characters') };
  }
  if (rules.maxLength && strVal.length > rules.maxLength) {
    return { valid: false, message: _t('Tối đa ' + rules.maxLength + ' ký tự', 'Maximum ' + rules.maxLength + ' characters') };
  }

  // Regex pattern
  if (rules.pattern && !new RegExp(rules.pattern).test(strVal)) {
    return { valid: false, message: rules.patternMessage || _t('Định dạng không đúng', 'Invalid format') };
  }

  if (rules.enum && Array.isArray(rules.enum) && rules.enum.length && rules.enum.indexOf(value) < 0) {
    return { valid: false, message: _t('Giá trị không nằm trong danh sách hợp lệ', 'Value is not in the allowed list') };
  }

  // Numeric range
  if (rules.min !== undefined && Number(value) < rules.min) {
    return { valid: false, message: _t('Tối thiểu ' + rules.min, 'Minimum ' + rules.min) };
  }
  if (rules.max !== undefined && Number(value) > rules.max) {
    return { valid: false, message: _t('Tối đa ' + rules.max, 'Maximum ' + rules.max) };
  }

  // Custom expression — evaluated with { value } in context
  if (rules.custom) {
    var ctx = Object.assign({}, context, { value: value });
    var result = evaluateExpression(rules.custom, ctx);
    if (!result) {
      return { valid: false, message: rules.customMessage || _t('Không hợp lệ', 'Invalid') };
    }
  }

  return { valid: true };
}

function validateForm(fields, formData, context) {
  var errors = {};
  var valid = true;
  (fields || []).forEach(function (field) {
    var rules = Object.assign({}, field.validation || {});
    if(field.required && rules.required === undefined) rules.required = true;
    if(Object.keys(rules).length === 0) return;
    var result = validateField(formData[field.key], rules, context);
    if (!result.valid) {
      errors[field.key] = { message: result.message, severity: _fieldSeverity(field) };
      valid = false;
    }
  });
  return { valid: valid, errors: errors };
}

/** Apply validation error UI to a form container */
function showValidationErrors(container, errors) {
  // Clear previous
  var prev = container.querySelectorAll('.hm-field-error');
  for (var i = 0; i < prev.length; i++) prev[i].remove();

  var prevHighlight = container.querySelectorAll('.hm-field-invalid');
  for (var j = 0; j < prevHighlight.length; j++) prevHighlight[j].classList.remove('hm-field-invalid');

  if (!errors) return;
  Object.keys(errors).forEach(function (key) {
    var input = container.querySelector('[name="' + key + '"]');
    var errorInfo = errors[key];
    var message = errorInfo && typeof errorInfo === 'object' ? errorInfo.message : errorInfo;
    var severity = errorInfo && typeof errorInfo === 'object' ? (errorInfo.severity || 'error') : 'error';
    if (!input) return;
    input.classList.add('hm-field-invalid');
    var errEl = document.createElement('div');
    errEl.className = 'hm-field-error hm-field-error-' + severity;
    errEl.setAttribute('role', 'alert');
    errEl.textContent = message;
    input.parentNode.insertBefore(errEl, input.nextSibling);
  });
}

// ─── 3. CONDITIONAL FORMATTING (tables) ───────────────────────────
// Cell-level: column.conditionalFormat = [{ condition, style }]
// Row-level:  config.rowConditionalFormat = [{ condition, style }]

function resolveConditionalFormat(rules, value, row, context) {
  if (!rules || !rules.length) return '';
  var ctx = Object.assign({}, context, { value: value, row: row });
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (evaluateExpression(rule.condition, ctx)) {
      return _buildStyleAttr(rule.style);
    }
  }
  return '';
}

function resolveRowConditionalFormat(rules, row, context) {
  if (!rules || !rules.length) return '';
  var ctx = Object.assign({}, context, { row: row });
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (evaluateExpression(rule.condition, ctx)) {
      return _buildStyleAttr(rule.style);
    }
  }
  return '';
}

function _buildStyleAttr(styleObj) {
  if (!styleObj) return '';
  var parts = [];
  Object.keys(styleObj).forEach(function (prop) {
    var kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
    parts.push(kebab + ':' + styleObj[prop]);
  });
  return parts.length ? ' style="' + _esc(parts.join(';')) + '"' : '';
}

// ─── 4. AUTO-REFRESH (Polling) ────────────────────────────────────
// block.config.autoRefresh = { enabled: true, intervalSeconds: 30 }

var _autoRefreshTimers = {};

function startAutoRefresh(moduleId, blockId, intervalSeconds) {
  var key = moduleId + ':' + blockId;
  stopAutoRefresh(moduleId, blockId);
  _autoRefreshTimers[key] = setInterval(function () {
    invalidateCache(blockId);
    var state = getModuleState(moduleId);
    // Only refresh if module is not in edit mode and tab is active
    if (state && !state.editMode && !document.hidden) {
      var block = _findBlockInSchema(moduleId, blockId);
      if (block) {
        fetchBlockData(block, moduleId).then(function () { _rerender(); });
      }
    }
  }, (intervalSeconds || 60) * 1000);
}

function stopAutoRefresh(moduleId, blockId) {
  var key = moduleId + ':' + blockId;
  if (_autoRefreshTimers[key]) {
    clearInterval(_autoRefreshTimers[key]);
    delete _autoRefreshTimers[key];
  }
}

function stopAllAutoRefresh(moduleId) {
  Object.keys(_autoRefreshTimers).forEach(function (key) {
    if (!moduleId || key.indexOf(moduleId + ':') === 0) {
      clearInterval(_autoRefreshTimers[key]);
      delete _autoRefreshTimers[key];
    }
  });
}

function _findBlockInSchema(moduleId, blockId) {
  var schema = _loadSchemaLocal(moduleId);
  if (!schema || !schema.tabs) return null;
  for (var t = 0; t < schema.tabs.length; t++) {
    var blocks = schema.tabs[t].blocks || [];
    for (var b = 0; b < blocks.length; b++) {
      if (blocks[b].blockId === blockId) return blocks[b];
    }
  }
  return null;
}

// Pause polling when tab is hidden, resume when visible
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    // Timers keep running but the interval callbacks check document.hidden
    return;
  }
  // On return, force one immediate refresh for all active timers
  Object.keys(_autoRefreshTimers).forEach(function (key) {
    var parts = key.split(':');
    if (parts.length === 2) {
      var bid = parts[1];
      invalidateCache(bid);
    }
  });
});

// ─── 5. VIRTUAL SCROLL (1 000+ rows) ─────────────────────────────
// When row count exceeds threshold, render only visible rows + buffer.

var VIRTUAL_ROW_HEIGHT = 44;
var VIRTUAL_BUFFER     = 10;
var VIRTUAL_THRESHOLD  = 200;

function renderVirtualTable(config, allRows, state, blockId, container) {
  var visibleHeight = 500;
  var scrollTop = 0;

  var tableEl = container
    ? container.querySelector('[data-virtual-table="' + blockId + '"]')
    : null;
  if (tableEl) {
    scrollTop     = tableEl.scrollTop;
    visibleHeight = tableEl.clientHeight || visibleHeight;
  }

  var totalHeight = allRows.length * VIRTUAL_ROW_HEIGHT;
  var startIdx    = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_BUFFER);
  var endIdx      = Math.min(allRows.length, Math.ceil((scrollTop + visibleHeight) / VIRTUAL_ROW_HEIGHT) + VIRTUAL_BUFFER);
  var visibleRows = allRows.slice(startIdx, endIdx);
  var paddingTop    = startIdx * VIRTUAL_ROW_HEIGHT;
  var paddingBottom = Math.max(0, (allRows.length - endIdx) * VIRTUAL_ROW_HEIGHT);

  return {
    visibleRows:   visibleRows,
    paddingTop:    paddingTop,
    paddingBottom: paddingBottom,
    totalHeight:   totalHeight,
    startIdx:      startIdx,
    endIdx:        endIdx,
    isVirtual:     allRows.length > VIRTUAL_THRESHOLD
  };
}

/** Attach scroll listener that triggers debounced re-render */
function initVirtualScroll(container, blockId, renderFn) {
  var el = container
    ? container.querySelector('[data-virtual-table="' + blockId + '"]')
    : null;
  if (!el) return;

  var _raf = null;
  el.addEventListener('scroll', function () {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(function () {
      if (typeof renderFn === 'function') renderFn(el.scrollTop);
      _raf = null;
    });
  }, { passive: true });
}

// ─── 6. CLIPBOARD & PASTE (Block Copy) ───────────────────────────

function copyBlockToClipboard(moduleId, blockId) {
  var schema = _loadSchemaLocal(moduleId);
  if (!schema) return;
  var block = null;
  (schema.tabs || []).forEach(function (tab) {
    (tab.blocks || []).forEach(function (b) {
      if (b.blockId === blockId) block = _clone(b);
    });
  });
  if (!block) { toast(_t('Không tìm thấy block', 'Block not found'), 'warning'); return; }
  block.blockId = _uid();
  block._copied = true;
  try {
    localStorage.setItem('hm_clipboard_block', JSON.stringify(block));
    toast(_t('Đã copy block', 'Block copied'), 'success');
  } catch (e) {
    toast(_t('Lỗi copy', 'Copy error'), 'error');
  }
}

function pasteBlockFromClipboard(moduleId, tabKey, afterBlockId) {
  try {
    var raw = localStorage.getItem('hm_clipboard_block');
    if (!raw) { toast(_t('Clipboard trống', 'Clipboard empty'), 'warning'); return; }
    var block = JSON.parse(raw);
    block.blockId = _uid(); // Ensure unique ID
    delete block._copied;
    addBlock(moduleId, tabKey, afterBlockId, block.type, block);
    toast(_t('Đã paste block', 'Block pasted'), 'success');
  } catch (e) {
    toast(_t('Lỗi paste', 'Paste error'), 'error');
  }
}

function hasClipboardBlock() {
  try { return !!localStorage.getItem('hm_clipboard_block'); } catch (e) { return false; }
}

// ─── 7. BLOCK SEARCH (Fuzzy) ─────────────────────────────────────

function _fuzzyMatch(needle, haystack) {
  needle   = String(needle).toLowerCase();
  haystack = String(haystack).toLowerCase();
  if (haystack.indexOf(needle) >= 0) return true;
  // All chars of needle appear in order in haystack
  var ni = 0;
  for (var hi = 0; hi < haystack.length && ni < needle.length; hi++) {
    if (haystack[hi] === needle[ni]) ni++;
  }
  return ni === needle.length;
}

/** Filter a list of block templates by search query */
function searchBlockTemplates(query, templates) {
  if (!query) return templates || [];
  return (templates || []).filter(function (tpl) {
    var label = (tpl.label && (tpl.label.vi || tpl.label.en)) || tpl.type || '';
    var desc  = (tpl.description && (tpl.description.vi || tpl.description.en)) || '';
    return _fuzzyMatch(query, label) || _fuzzyMatch(query, desc) || _fuzzyMatch(query, tpl.type || '');
  });
}

// ─── 8. SCHEMA VERSIONING ─────────────────────────────────────────

var SCHEMA_VERSION_LIMIT = 20;

function getSchemaVersions(moduleId) {
  try {
    var raw = localStorage.getItem('hm_schema_versions_' + moduleId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function pushSchemaVersion(moduleId, schema) {
  var versions = getSchemaVersions(moduleId);
  versions.push({
    version:   schema.version || versions.length + 1,
    timestamp: new Date().toISOString(),
    schema:    _clone(schema)
  });
  if (versions.length > SCHEMA_VERSION_LIMIT) {
    versions = versions.slice(-SCHEMA_VERSION_LIMIT);
  }
  try {
    localStorage.setItem('hm_schema_versions_' + moduleId, JSON.stringify(versions));
  } catch (e) {
    console.warn('[BlockEngine] Could not persist schema version:', e.message);
  }
}

function rollbackSchema(moduleId, versionIndex) {
  var versions = getSchemaVersions(moduleId);
  if (versionIndex < 0 || versionIndex >= versions.length) {
    toast(_t('Phiên bản không tồn tại', 'Version not found'), 'error');
    return false;
  }
  var target = versions[versionIndex];
  if (!target || !target.schema) return false;
  saveModuleSchema(moduleId, target.schema);
  toast(
    _t('Đã rollback về phiên bản ' + target.version,
       'Rolled back to version ' + target.version),
    'success'
  );
  return true;
}

function clearSchemaVersions(moduleId) {
  try { localStorage.removeItem('hm_schema_versions_' + moduleId); } catch (e) {}
}

// ─── 9. ACCESSIBILITY (WCAG 2.1 AA) ──────────────────────────────

function _ariaAttrs(block) {
  var attrs = ' role="region"';
  var label = _t(
    (block.title && block.title.vi) || block.type || '',
    (block.title && block.title.en) || block.type || ''
  );
  attrs += ' aria-label="' + _esc(label) + '"';
  if (block.visible === false) attrs += ' aria-hidden="true"';
  return attrs;
}

function _tableAriaAttrs(config) {
  var rowCount = config._totalRows || 0;
  var colCount = (config.columns || []).length;
  return ' role="grid" aria-rowcount="' + rowCount + '" aria-colcount="' + colCount + '"';
}

/** Keyboard navigation within table cells (Arrow keys + Enter) */
function _initTableKeyNav(container, blockId) {
  var table = container
    ? container.querySelector('[data-block-id="' + blockId + '"] table')
    : null;
  if (!table) return;
  table.setAttribute('tabindex', '0');

  // Make cells focusable
  var cells = table.querySelectorAll('td, th');
  for (var c = 0; c < cells.length; c++) {
    if (!cells[c].hasAttribute('tabindex')) cells[c].setAttribute('tabindex', '-1');
  }

  table.addEventListener('keydown', function (e) {
    var cell = document.activeElement;
    if (!cell || !cell.closest('td,th')) return;
    var row = cell.closest('tr');
    if (!row) return;
    var idx = Array.from(row.cells).indexOf(cell.closest('td,th'));

    switch (e.key) {
      case 'ArrowRight':
        if (cell.nextElementSibling) { cell.nextElementSibling.focus(); e.preventDefault(); }
        break;
      case 'ArrowLeft':
        if (cell.previousElementSibling) { cell.previousElementSibling.focus(); e.preventDefault(); }
        break;
      case 'ArrowDown':
        var nextRow = row.nextElementSibling;
        if (nextRow && nextRow.cells[idx]) { nextRow.cells[idx].focus(); e.preventDefault(); }
        break;
      case 'ArrowUp':
        var prevRow = row.previousElementSibling;
        if (prevRow && prevRow.cells[idx]) { prevRow.cells[idx].focus(); e.preventDefault(); }
        break;
      case 'Enter':
        if (cell.closest('td')) {
          cell.closest('td').dispatchEvent(new Event('dblclick', { bubbles: true }));
          e.preventDefault();
        }
        break;
      case 'Home':
        if (row.cells[0]) { row.cells[0].focus(); e.preventDefault(); }
        break;
      case 'End':
        if (row.cells[row.cells.length - 1]) { row.cells[row.cells.length - 1].focus(); e.preventDefault(); }
        break;
    }
  });
}

/** Live-region announcer for dynamic content updates */
function _announce(message) {
  var el = document.getElementById('hm-aria-live');
  if (!el) {
    el = document.createElement('div');
    el.id = 'hm-aria-live';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'hm-sr-only';
    document.body.appendChild(el);
  }
  el.textContent = message;
}

// ─── 10. EXPORT v4 features ───────────────────────────────────────

Object.assign(window.HmBlockEngine, {
  // Query chaining
  executeChain:             executeChain,

  // Validation
  validateField:            validateField,
  validateForm:             validateForm,
  showValidationErrors:     showValidationErrors,

  // Conditional formatting
  resolveConditionalFormat:    resolveConditionalFormat,
  resolveRowConditionalFormat: resolveRowConditionalFormat,

  // Auto-refresh
  startAutoRefresh:   startAutoRefresh,
  stopAutoRefresh:    stopAutoRefresh,
  stopAllAutoRefresh: stopAllAutoRefresh,

  // Virtual scroll
  renderVirtualTable:  renderVirtualTable,
  initVirtualScroll:   initVirtualScroll,
  VIRTUAL_THRESHOLD:   VIRTUAL_THRESHOLD,

  // Clipboard
  copyBlockToClipboard:    copyBlockToClipboard,
  pasteBlockFromClipboard: pasteBlockFromClipboard,
  hasClipboardBlock:       hasClipboardBlock,

  // Block search
  searchBlockTemplates: searchBlockTemplates,

  // Schema versioning
  getSchemaVersions:    getSchemaVersions,
  pushSchemaVersion:    pushSchemaVersion,
  rollbackSchema:       rollbackSchema,
  clearSchemaVersions:  clearSchemaVersions,

  // Accessibility
  _ariaAttrs:         _ariaAttrs,
  _tableAriaAttrs:    _tableAriaAttrs,
  _initTableKeyNav:   _initTableKeyNav,
  _announce:          _announce,
});

/* ═══════════════════════════════════════════════════════════════════════════
   ADVANCED FEATURES — IoT Connectors, Transformer, Extra Templates,
   Responsive Breakpoints, Block States, Undo History
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── 1. IoT CONNECTOR REGISTRY ──────────────────────────────────────────────
var IOT_CONNECTORS = {
  'mtconnect': {
    label: 'MTConnect',
    labelVi: 'MTConnect (CNC)',
    icon: '🔌',
    desc: 'Read-only streaming from CNC machines via MTConnect agent',
    descVi: 'Đọc dữ liệu máy CNC qua MTConnect agent',
    protocol: 'HTTP/XML',
    direction: 'inbound',
    config: {
      agentUrl: { type:'text', label:'Agent URL', placeholder:'http://192.168.1.100:5000' },
      deviceId: { type:'text', label:'Device ID', placeholder:'CNC-05' },
      pollIntervalMs: { type:'number', label:'Poll interval (ms)', default: 1000 },
      dataItems: { type:'tags', label:'Data items', placeholder:'Xact, Yact, Zact, spindle_speed, feed_rate' }
    }
  },
  'opcua': {
    label: 'OPC-UA',
    labelVi: 'OPC-UA (Tự động hóa)',
    icon: '🏭',
    desc: 'Read/write industrial automation data via OPC-UA protocol',
    descVi: 'Đọc/ghi dữ liệu tự động hóa qua giao thức OPC-UA',
    protocol: 'OPC-UA Binary/JSON',
    direction: 'bidirectional',
    config: {
      endpointUrl: { type:'text', label:'Endpoint URL', placeholder:'opc.tcp://192.168.1.100:4840' },
      securityMode: { type:'select', label:'Security', options:['None','Sign','SignAndEncrypt'] },
      nodeIds: { type:'tags', label:'Node IDs', placeholder:'ns=2;s=Temperature, ns=2;s=Pressure' }
    }
  },
  'mqtt': {
    label: 'MQTT',
    labelVi: 'MQTT (IoT)',
    icon: '📡',
    desc: 'Pub/sub messaging for IoT sensors and edge devices',
    descVi: 'Nhắn tin pub/sub cho cảm biến IoT và thiết bị biên',
    protocol: 'MQTT 3.1.1 / 5.0',
    direction: 'bidirectional',
    config: {
      brokerUrl: { type:'text', label:'Broker URL', placeholder:'mqtt://broker.hesem.local:1883' },
      topic: { type:'text', label:'Topic', placeholder:'factory/cnc-05/telemetry' },
      qos: { type:'select', label:'QoS', options:['0','1','2'], default:'1' },
      username: { type:'text', label:'Username' },
      password: { type:'password', label:'Password' }
    }
  },
  'mqtt-sparkplug': {
    label: 'MQTT Sparkplug B',
    labelVi: 'Sparkplug B (Công nghiệp)',
    icon: '⚡',
    desc: 'Industrial IoT standard on MQTT with birth/death certificates',
    descVi: 'Chuẩn IoT công nghiệp trên MQTT với chứng chỉ sinh/tử',
    protocol: 'Sparkplug B / MQTT',
    direction: 'bidirectional',
    config: {
      brokerUrl: { type:'text', label:'Broker URL' },
      groupId: { type:'text', label:'Group ID', placeholder:'HESEM' },
      edgeNodeId: { type:'text', label:'Edge Node ID', placeholder:'CNC-Shop-01' },
      deviceId: { type:'text', label:'Device ID', placeholder:'CNC-05' }
    }
  },
  'rest-api': {
    label: 'REST API',
    labelVi: 'REST API (HTTP)',
    icon: '🌐',
    desc: 'Connect to any REST API endpoint (GET/POST/PUT/DELETE)',
    descVi: 'Kết nối bất kỳ API REST nào (GET/POST/PUT/DELETE)',
    protocol: 'HTTP/HTTPS JSON',
    direction: 'bidirectional',
    config: {
      baseUrl: { type:'text', label:'Base URL', placeholder:'https://api.example.com/v1' },
      method: { type:'select', label:'Method', options:['GET','POST','PUT','DELETE'] },
      headers: { type:'json', label:'Headers', placeholder:'{"Authorization":"Bearer xxx"}' },
      body: { type:'json', label:'Body template', placeholder:'{"key":"{{value}}"}' },
      authType: { type:'select', label:'Auth type', options:['none','bearer','basic','api-key','oauth2'] }
    }
  },
  'webhook': {
    label: 'Webhook',
    labelVi: 'Webhook (Nhận sự kiện)',
    icon: '🪝',
    desc: 'Receive real-time events via HTTP POST from external systems',
    descVi: 'Nhận sự kiện thời gian thực qua HTTP POST từ hệ thống bên ngoài',
    protocol: 'HTTP POST',
    direction: 'inbound',
    config: {
      path: { type:'text', label:'Webhook path', placeholder:'/webhook/machine-alarm' },
      secret: { type:'password', label:'Signing secret' },
      eventTypes: { type:'tags', label:'Event types', placeholder:'alarm, status_change, cycle_complete' }
    }
  },
  'modbus': {
    label: 'Modbus TCP',
    labelVi: 'Modbus TCP (PLC)',
    icon: '🔧',
    desc: 'Read/write PLC registers via Modbus TCP protocol',
    descVi: 'Đọc/ghi thanh ghi PLC qua giao thức Modbus TCP',
    protocol: 'Modbus TCP/IP',
    direction: 'bidirectional',
    config: {
      host: { type:'text', label:'PLC IP', placeholder:'192.168.1.50' },
      port: { type:'number', label:'Port', default: 502 },
      unitId: { type:'number', label:'Unit ID', default: 1 },
      registers: { type:'tags', label:'Registers', placeholder:'HR100, HR101, IR200' }
    }
  },
  'database': {
    label: 'Database',
    labelVi: 'Cơ sở dữ liệu',
    icon: '🗄️',
    desc: 'Direct SQL query to PostgreSQL, MySQL, SQLite',
    descVi: 'Truy vấn SQL trực tiếp PostgreSQL, MySQL, SQLite',
    protocol: 'SQL',
    direction: 'bidirectional',
    config: {
      type: { type:'select', label:'DB Type', options:['postgresql','mysql','sqlite'] },
      host: { type:'text', label:'Host' },
      port: { type:'number', label:'Port' },
      database: { type:'text', label:'Database' },
      username: { type:'text', label:'Username' },
      password: { type:'password', label:'Password' },
      query: { type:'code', label:'SQL Query', placeholder:'SELECT * FROM table WHERE ...' }
    }
  },
  'epicor-kinetic': {
    label: 'Epicor Kinetic',
    labelVi: 'Epicor Kinetic (ERP)',
    icon: '🏢',
    desc: 'Bidirectional sync with Epicor Kinetic ERP via REST API',
    descVi: 'Đồng bộ hai chiều với Epicor Kinetic ERP qua REST API',
    protocol: 'REST / OAuth2',
    direction: 'bidirectional',
    config: {
      baseUrl: { type:'text', label:'Epicor API URL' },
      company: { type:'text', label:'Company ID' },
      apiKey: { type:'password', label:'API Key' },
      syncDomains: { type:'tags', label:'Sync domains', placeholder:'sales_orders, job_orders, parts, inventory' }
    }
  }
};

// Render IoT connector config form
function renderConnectorConfig(connectorType) {
  var conn = IOT_CONNECTORS[connectorType];
  if (!conn) return '';
  var h = '<div class="hm-card" style="border-left:4px solid var(--brand-2)">';
  h += '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">';
  h += '<span style="font-size:1.5rem">' + (conn.icon||'🔌') + '</span>';
  h += '<div><div style="font-weight:var(--font-bold)">' + _esc(conn.label) + '</div>';
  h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">' + _esc(conn.protocol) + ' — ' + _esc(conn.direction) + '</div></div>';
  h += '</div>';
  var config = conn.config || {};
  Object.keys(config).forEach(function(key) {
    var field = config[key];
    h += '<div style="margin-bottom:var(--space-3)">';
    h += '<label class="hm-label">' + _esc(field.label || key) + '</label>';
    switch(field.type) {
      case 'select':
        h += '<select class="hm-input hm-select" data-conn-field="' + _esc(key) + '">';
        (field.options||[]).forEach(function(opt) {
          h += '<option value="' + _esc(opt) + '"' + (opt===field.default?' selected':'') + '>' + _esc(opt) + '</option>';
        });
        h += '</select>';
        break;
      case 'password':
        h += '<input type="password" class="hm-input" data-conn-field="' + _esc(key) + '" placeholder="' + _esc(field.placeholder||'') + '">';
        break;
      case 'number':
        h += '<input type="number" class="hm-input" data-conn-field="' + _esc(key) + '" value="' + (field.default||'') + '">';
        break;
      case 'json':
      case 'code':
        h += '<textarea class="hm-input hm-textarea" data-conn-field="' + _esc(key) + '" rows="3" style="font-family:var(--font-mono);font-size:var(--text-xs)" placeholder="' + _esc(field.placeholder||'') + '"></textarea>';
        break;
      case 'tags':
        h += '<input type="text" class="hm-input" data-conn-field="' + _esc(key) + '" placeholder="' + _esc(field.placeholder||'') + '">';
        h += '<div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px">' + _t('Phân cách bằng dấu phẩy','Comma separated') + '</div>';
        break;
      default:
        h += '<input type="text" class="hm-input" data-conn-field="' + _esc(key) + '" placeholder="' + _esc(field.placeholder||'') + '">';
    }
    h += '</div>';
  });
  h += '<button class="hm-btn hm-btn-primary" data-action="test-connector" data-type="' + _esc(connectorType) + '">' + _t('🔗 Kiểm tra kết nối','🔗 Test Connection') + '</button>';
  h += '</div>';
  return h;
}

// List all available connectors
function renderConnectorLibrary() {
  var h = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-3)">';
  Object.keys(IOT_CONNECTORS).forEach(function(key) {
    var conn = IOT_CONNECTORS[key];
    var dirBadge = conn.direction === 'bidirectional' ? 'hm-badge-approved' : 'hm-badge-planned';
    h += '<div class="hm-card" style="cursor:pointer" data-action="select-connector" data-type="' + _esc(key) + '">';
    h += '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">';
    h += '<span style="font-size:1.5rem">' + (conn.icon||'🔌') + '</span>';
    h += '<div><div style="font-weight:var(--font-bold)">' + _esc(conn.label) + '</div>';
    h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">' + _esc(_t(conn.labelVi, conn.label)) + '</div></div>';
    h += '</div>';
    h += '<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-2)">' + _esc(_t(conn.descVi, conn.desc)) + '</div>';
    h += '<div style="display:flex;gap:var(--space-2)">';
    h += '<span class="hm-badge hm-badge-draft">' + _esc(conn.protocol) + '</span>';
    h += '<span class="hm-badge ' + dirBadge + '">' + _esc(conn.direction) + '</span>';
    h += '</div></div>';
  });
  h += '</div>';
  return h;
}

// ─── 2. DATA TRANSFORMER (Code Mode) ────────────────────────────────────────

// Safe transformer config using bindings / JSON templates
// Examples:
//   {{ data }}
//   { "mode":"pick", "path":"items" }
//   { "mode":"map", "template":{ "total":"{{ record.qty * record.unit_price }}" } }

function _buildTransformerContext(data, context, record) {
  var ctx = {};
  var source = context || {};
  Object.keys(source).forEach(function(key){
    ctx[key] = source[key];
  });
  ctx.data = data;
  ctx.record = record == null ? data : record;
  ctx.user = source.user || source.currentUser || {};
  ctx.currentUser = ctx.user;
  ctx.module = source.module || {};
  ctx.filters = source.filters || {};
  ctx.state = source.state || {};
  ctx.Math = Math;
  return ctx;
}

function _getTransformerByPath(obj, path) {
  var parts = String(path || '').split('.');
  var ctx = obj;
  var i;
  for (i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    if (ctx == null) return undefined;
    ctx = ctx[parts[i]];
  }
  return ctx;
}

function _containsUnsafeTransformerSyntax(code) {
  return /(function\s*\(|=>|\bnew\b|\bwhile\b|\bfor\b|\beval\b|\bwindow\b|\bdocument\b|;)/.test(code || '');
}

function executeTransformer(code, data, context) {
  var trimmed;
  var parsed;
  if (!code || typeof code !== 'string') return data;
  trimmed = code.replace(/^\s+|\s+$/g, '');
  if (!trimmed) return data;
  if (_containsUnsafeTransformerSyntax(trimmed)) {
    console.warn('[Transformer] Unsafe syntax is no longer supported. Use bindings or JSON config instead.');
    return data;
  }
  if (trimmed.indexOf('{{') === 0 && trimmed.lastIndexOf('}}') === trimmed.length - 2) {
    return evaluateExpression(trimmed, _buildTransformerContext(data, context, data));
  }
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    console.warn('[Transformer] Invalid safe transformer config:', e.message);
    return data;
  }
  if (parsed && parsed.mode === 'pick' && parsed.path) {
    return _getTransformerByPath(data, parsed.path);
  }
  if (parsed && parsed.mode === 'map' && Array.isArray(data) && parsed.template) {
    return data.map(function(row){
      return _resolveBindings(parsed.template, _buildTransformerContext(data, context, row));
    });
  }
  if (parsed && parsed.mode === 'wrap') {
    return _resolveBindings(parsed.value, _buildTransformerContext(data, context, data));
  }
  return _resolveBindings(parsed, _buildTransformerContext(data, context, data));
}

// Render code editor for safe transformer config
function renderTransformerEditor(currentCode) {
  var h = '<div style="border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);background:var(--gray-800);color:var(--text-inverse);font-size:var(--text-xs)">';
  h += '<span>'+_t('Safe Transformer', 'Safe Transformer')+'</span>';
  h += '<div style="display:flex;gap:var(--space-2)">';
  h += '<button class="hm-btn hm-btn-sm" style="background:rgba(255,255,255,0.1);color:#fff;border:none" data-action="format-code">'+_t('Định dạng', 'Format')+'</button>';
  h += '<button class="hm-btn hm-btn-sm" style="background:var(--green);color:#fff;border:none" data-action="run-transformer">'+_t('▶ Kiểm tra', '▶ Validate')+'</button>';
  h += '</div></div>';
  h += '<textarea id="hm-transformer-code" style="width:100%;min-height:120px;padding:var(--space-3);font-family:var(--font-mono);font-size:var(--text-sm);border:none;background:var(--gray-900);color:#e2e8f0;resize:vertical;outline:none;line-height:1.6" spellcheck="false" placeholder=\'{ "mode":"map", "template": { "total":"{{ record.qty * record.unit_price }}", "status":"{{ record.status || \\\'draft\\\' }}" } }\'>' + _esc(currentCode || '') + '</textarea>';
  h += '<div id="hm-transformer-output" style="padding:var(--space-2) var(--space-3);background:var(--gray-50);border-top:1px solid var(--border);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-secondary);max-height:80px;overflow-y:auto;display:none"></div>';
  h += '</div>';
  return h;
}

// ─── 3. ENHANCED BLOCK TEMPLATES (30+ manufacturing-specific presets) ────────

var EXTRA_TEMPLATES = {
  // Production
  'dispatch-gantt': { type:'data-gantt', title:{vi:'Gantt phân công',en:'Dispatch Gantt'}, config:{ dataSource:{api:'dispatch_timeline',method:'GET',dataKey:'timeline'}, rowKey:'machine_id', startKey:'start_time', endKey:'end_time', labelKey:'wo_number' } },
  'shift-summary-kpi': { type:'kpi-row', title:{vi:'Tổng hợp ca',en:'Shift Summary'}, config:{ items:[ {label:{vi:'Tổng lệnh',en:'Total Tasks'},dataSource:{api:'dispatch_dashboard',field:'total_tasks'},color:'var(--brand-2)'}, {label:{vi:'Sản lượng',en:'Output'},dataSource:{api:'dispatch_dashboard',field:'total_good'},color:'var(--green)'}, {label:{vi:'NG',en:'NG'},dataSource:{api:'dispatch_dashboard',field:'total_ng'},color:'var(--red)'}, {label:{vi:'Đạt %',en:'Achievement'},dataSource:{api:'dispatch_dashboard',field:'achievement_pct'},color:'var(--brand-2)',suffix:'%'} ] } },
  'machine-status-cards': { type:'data-cards', title:{vi:'Trạng thái máy',en:'Machine Status'}, config:{ dataSource:{api:'mobile_shop_overview',method:'GET',dataKey:'machines'}, columns:3, titleKey:'machine_id', subtitleKey:'status', badgeKey:'status' } },
  // Quality
  'ncr-capa-table': { type:'data-table', title:{vi:'Danh sách NCR/CAPA',en:'NCR/CAPA List'}, config:{ dataSource:{api:'exception_list',method:'GET',dataKey:'exceptions'}, columns:[ {key:'id',label:{vi:'Mã',en:'ID'},sortable:true}, {key:'type',label:{vi:'Loại',en:'Type'},type:'badge'}, {key:'severity',label:{vi:'Mức độ',en:'Severity'},type:'badge'}, {key:'subject',label:{vi:'Tiêu đề',en:'Subject'}}, {key:'status',label:{vi:'Trạng thái',en:'Status'},type:'badge',sortable:true}, {key:'created_at',label:{vi:'Ngày tạo',en:'Created'},type:'date',sortable:true} ], pagination:true, pageSize:20 } },
  'copq-breakdown': { type:'chart-stacked-bar', title:{vi:'Chi phí chất lượng kém',en:'COPQ Breakdown'}, config:{ dataSource:{api:'exception_copq_summary',method:'GET',dataKey:'breakdown'} } },
  'fmea-worksheet': { type:'data-table', title:{vi:'FMEA Worksheet',en:'FMEA Worksheet'}, config:{ dataSource:{api:'fmea_list',method:'GET',dataKey:'fmeas'}, columns:[ {key:'fmea_number',label:{vi:'Số FMEA',en:'FMEA#'}}, {key:'type',label:{vi:'Loại',en:'Type'},type:'badge'}, {key:'title',label:{vi:'Tiêu đề',en:'Title'}}, {key:'status',label:{vi:'Trạng thái',en:'Status'},type:'badge'} ] } },
  // Supplier
  'supplier-scorecard-chart': { type:'chart-bar', title:{vi:'Điểm NCC',en:'Supplier Scores'}, config:{ dataSource:{api:'supplier_scorecard_list',method:'GET',dataKey:'scorecards'}, labelKey:'vendor_id', valueKey:'overall_score' } },
  'incoming-inspection-table': { type:'data-table', title:{vi:'Kiểm tra nhận hàng',en:'Incoming Inspection'}, config:{ dataSource:{api:'supplier_incoming_list',method:'GET',dataKey:'inspections'}, columns:[ {key:'inspection_number',label:{vi:'Số IQC',en:'IQC#'}}, {key:'vendor_id',label:{vi:'NCC',en:'Vendor'}}, {key:'item_id',label:{vi:'Part',en:'Part'}}, {key:'result',label:{vi:'Kết quả',en:'Result'},type:'badge'} ], pagination:true } },
  // Orders
  'so-list-table': { type:'data-table', title:{vi:'Danh sách đơn hàng',en:'Sales Orders'}, config:{ dataSource:{api:'order_so_list',method:'GET',dataKey:'sales_orders'}, columns:[ {key:'so_number',label:{vi:'Số SO',en:'SO#'},sortable:true}, {key:'customer_name',label:{vi:'Khách hàng',en:'Customer'},sortable:true}, {key:'due_date',label:{vi:'Hạn giao',en:'Due'},type:'date',sortable:true}, {key:'status',label:{vi:'Trạng thái',en:'Status'},type:'badge'} ], pagination:true, pageSize:25 } },
  'order-hierarchy-tree': { type:'data-tree', title:{vi:'Cây SO→JO→WO',en:'SO→JO→WO Tree'}, config:{ dataSource:{api:'order_hierarchy',method:'GET',dataKey:'hierarchy'}, childrenKey:'job_orders', expandLevel:2 } },
  'quote-pipeline-kpi': { type:'kpi-row', title:{vi:'KPI báo giá',en:'Quote KPIs'}, config:{ items:[ {label:{vi:'Pipeline',en:'Pipeline'},dataSource:{api:'quote_dashboard',field:'pipeline_value'},color:'var(--brand-2)',suffix:' USD'}, {label:{vi:'Win Rate',en:'Win Rate'},dataSource:{api:'quote_dashboard',field:'win_rate'},color:'var(--green)',suffix:'%'} ] } },
  // Evidence & Records
  'evidence-vault-table': { type:'data-table', title:{vi:'Kho chứng cứ',en:'Evidence Vault'}, config:{ dataSource:{api:'evidence_list',method:'GET',dataKey:'evidence'}, columns:[ {key:'evidence_number',label:{vi:'Mã',en:'ID'}}, {key:'evidence_type',label:{vi:'Loại',en:'Type'},type:'badge'}, {key:'title',label:{vi:'Tiêu đề',en:'Title'}}, {key:'uploaded_at',label:{vi:'Ngày tải',en:'Uploaded'},type:'date'} ], pagination:true } },
  // Reports
  'ci-kanban': { type:'data-kanban', title:{vi:'Bảng cải tiến PDCA',en:'CI PDCA Board'}, config:{ dataSource:{api:'ci_project_list',method:'GET',dataKey:'projects'}, columnKey:'status', columns:['plan','do','check','act','closed'] } },
  'compliance-report-list': { type:'data-cards', title:{vi:'Báo cáo tuân thủ',en:'Compliance Reports'}, config:{ dataSource:{api:'compliance_report_types',method:'GET',dataKey:'report_types'}, columns:2, titleKey:'label', subtitleKey:'description' } },
  // Master data
  'machine-list': { type:'data-table', title:{vi:'Danh sách máy',en:'Machine List'}, config:{ dataSource:{api:'master_data_list',method:'GET',dataKey:'machines',params:{entity:'machines'}}, columns:[ {key:'machine_id',label:{vi:'Mã máy',en:'ID'}}, {key:'machine_name',label:{vi:'Tên máy',en:'Name'}}, {key:'machine_type',label:{vi:'Loại',en:'Type'}}, {key:'status',label:{vi:'Trạng thái',en:'Status'},type:'badge'} ] } },
  'operator-list': { type:'data-table', title:{vi:'Danh sách công nhân',en:'Operator List'}, config:{ dataSource:{api:'master_data_list',method:'GET',dataKey:'operators',params:{entity:'operators'}}, columns:[ {key:'operator_id',label:{vi:'Mã NV',en:'ID'}}, {key:'operator_name',label:{vi:'Họ tên',en:'Name'}}, {key:'role',label:{vi:'Vai trò',en:'Role'}}, {key:'shift',label:{vi:'Ca',en:'Shift'}} ] } },
  // IoT blocks
  'iot-machine-telemetry': { type:'kpi-row', title:{vi:'Telemetry máy',en:'Machine Telemetry'}, config:{ items:[ {label:{vi:'Tốc độ trục chính',en:'Spindle Speed'},color:'var(--brand-2)',suffix:' RPM'}, {label:{vi:'Tải trục chính',en:'Spindle Load'},color:'var(--amber)',suffix:'%'}, {label:{vi:'Feed Rate',en:'Feed Rate'},color:'var(--green)',suffix:' mm/min'}, {label:{vi:'Nhiệt độ',en:'Temperature'},color:'var(--red)',suffix:'°C'} ] } },
  'iot-alarm-timeline': { type:'data-timeline', title:{vi:'Lịch sử cảnh báo máy',en:'Machine Alarm History'}, config:{ dataSource:{api:'mobile_shop_overview',method:'GET'}, dateKey:'timestamp', titleKey:'alarm_code', descKey:'description' } },
};

// Merge extra templates into existing BLOCK_TEMPLATES
if (window.HmBlockEngine && window.HmBlockEngine.BLOCK_TEMPLATES) {
  Object.keys(EXTRA_TEMPLATES).forEach(function(key) {
    window.HmBlockEngine.BLOCK_TEMPLATES[key] = EXTRA_TEMPLATES[key];
  });
}

// ─── 4. RESPONSIVE BREAKPOINTS ──────────────────────────────────────────────

var BREAKPOINTS = {
  mobile: { maxWidth: 768, label: 'Di động', labelEn: 'Mobile' },
  tablet: { maxWidth: 1024, label: 'Máy tính bảng', labelEn: 'Tablet' },
  desktop: { maxWidth: 99999, label: 'Máy tính', labelEn: 'Desktop' }
};

function getCurrentBreakpoint() {
  var w = window.innerWidth;
  if (w <= 768) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}

// Block can have: config.responsive = { mobile: { visible: false }, tablet: { columns: 1 } }
function applyResponsiveConfig(config, breakpoint) {
  if (!config || !config.responsive || !config.responsive[breakpoint]) return config;
  return Object.assign({}, config, config.responsive[breakpoint]);
}

function renderBreakpointToggle(currentBreakpoint) {
  var h = '<div style="display:flex;gap:var(--space-1);padding:var(--space-2);background:var(--gray-100);border-radius:var(--radius-md)">';
  Object.keys(BREAKPOINTS).forEach(function(bp) {
    var b = BREAKPOINTS[bp];
    var active = currentBreakpoint === bp;
    h += '<button class="hm-btn hm-btn-sm ' + (active ? 'hm-btn-primary' : 'hm-btn-ghost') + '" data-action="set-breakpoint" data-bp="' + _esc(bp) + '" title="' + _esc(_t(b.label, b.labelEn)) + '">';
    h += bp === 'mobile' ? '📱' : bp === 'tablet' ? '📟' : '🖥️';
    h += '</button>';
  });
  h += '</div>';
  return h;
}

// ─── 5. BLOCK STATES (loading, error, empty, disabled) ──────────────────────

var BLOCK_STATES = {
  'default': { class: '', label: 'Mặc định', labelEn: 'Default' },
  'loading': { class: 'hm-block-loading', label: 'Đang tải', labelEn: 'Loading' },
  'error':   { class: 'hm-block-error', label: 'Lỗi', labelEn: 'Error' },
  'empty':   { class: 'hm-block-empty', label: 'Trống', labelEn: 'Empty' },
  'disabled':{ class: 'hm-block-disabled', label: 'Vô hiệu', labelEn: 'Disabled' },
};

function setBlockState(container, blockId, stateName) {
  var el = container.querySelector('[data-block-id="' + blockId + '"]');
  if (!el) return;
  // Remove all state classes
  Object.keys(BLOCK_STATES).forEach(function(s) {
    if (BLOCK_STATES[s].class) el.classList.remove(BLOCK_STATES[s].class);
  });
  // Add new state
  var state = BLOCK_STATES[stateName];
  if (state && state.class) el.classList.add(state.class);
}

// Loading skeleton for blocks
function renderBlockSkeleton(type) {
  var h = '<div class="hm-skeleton" style="animation:hm-shimmer 1.5s infinite">';
  switch(type) {
    case 'kpi-row':
      h += '<div style="display:flex;gap:var(--space-3)">';
      for(var i=0;i<4;i++) h += '<div style="flex:1;height:80px;background:var(--gray-100);border-radius:var(--radius-md)"></div>';
      h += '</div>';
      break;
    case 'data-table':
      h += '<div style="height:36px;background:var(--gray-100);border-radius:var(--radius-md);margin-bottom:var(--space-2)"></div>';
      for(var j=0;j<5;j++) h += '<div style="height:44px;background:var(--gray-50);border-radius:var(--radius-sm);margin-bottom:var(--space-1)"></div>';
      break;
    case 'chart-bar':
    case 'chart-donut':
      h += '<div style="height:200px;background:var(--gray-100);border-radius:var(--radius-md)"></div>';
      break;
    default:
      h += '<div style="height:100px;background:var(--gray-100);border-radius:var(--radius-md)"></div>';
  }
  h += '</div>';
  return h;
}

// ─── 6. UNDO HISTORY PANEL ──────────────────────────────────────────────────

function renderUndoHistoryPanel(moduleId) {
  var undoStack = window.HmBlockEngine._undoStack || [];
  var redoStack = window.HmBlockEngine._redoStack || [];
  var moduleUndos = undoStack.filter(function(e) { return e.moduleId === moduleId; });
  var moduleRedos = redoStack.filter(function(e) { return e.moduleId === moduleId; });

  var h = '<div class="hm-card" style="max-height:300px;overflow-y:auto">';
  h += '<h4 style="margin:0 0 var(--space-3);font-size:var(--text-sm);font-weight:var(--font-bold)">' + _t('Lịch sử thay đổi','Change History') + '</h4>';

  if (!moduleUndos.length && !moduleRedos.length) {
    h += '<div style="color:var(--text-tertiary);font-size:var(--text-sm)">' + _t('Chưa có thay đổi','No changes yet') + '</div>';
  } else {
    // Redo items (future)
    moduleRedos.reverse().forEach(function(entry) {
      h += '<div style="padding:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary);opacity:0.5">';
      h += '↪️ ' + _esc(entry.action) + ' <span style="float:right">' + new Date(entry.timestamp).toLocaleTimeString() + '</span>';
      h += '</div>';
    });
    // Current marker
    h += '<div style="padding:var(--space-2);font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--brand-2);border-left:2px solid var(--brand-2)">⬤ ' + _t('Hiện tại','Current') + '</div>';
    // Undo items (past)
    moduleUndos.reverse().forEach(function(entry) {
      h += '<div style="padding:var(--space-2);font-size:var(--text-xs);color:var(--text-secondary);border-left:2px solid var(--border)">';
      h += '↩️ ' + _esc(entry.action) + ' <span style="float:right">' + new Date(entry.timestamp).toLocaleTimeString() + '</span>';
      h += '</div>';
    });
  }
  h += '</div>';
  return h;
}

// ─── 7. EXPORT ALL NEW FUNCTIONS ────────────────────────────────────────────

Object.assign(window.HmBlockEngine, {
  // IoT
  IOT_CONNECTORS: IOT_CONNECTORS,
  renderConnectorConfig: renderConnectorConfig,
  renderConnectorLibrary: renderConnectorLibrary,
  // Transformer
  executeTransformer: executeTransformer,
  renderTransformerEditor: renderTransformerEditor,
  // Templates
  EXTRA_TEMPLATES: EXTRA_TEMPLATES,
  // Responsive
  BREAKPOINTS: BREAKPOINTS,
  getCurrentBreakpoint: getCurrentBreakpoint,
  applyResponsiveConfig: applyResponsiveConfig,
  renderBreakpointToggle: renderBreakpointToggle,
  // Block states
  BLOCK_STATES: BLOCK_STATES,
  setBlockState: setBlockState,
  renderBlockSkeleton: renderBlockSkeleton,
  // Undo history
  renderUndoHistoryPanel: renderUndoHistoryPanel,
});


/* ─── 8. MODULE BUILDER NEXTGEN SCHEMA PATCH (2026-04-07) ───────────────── */
(function(){
  function _ngFindTab(tabs, key){
    var found = null;
    (tabs || []).forEach(function(tab){
      if(tab && tab.key === key) found = tab;
    });
    return found;
  }

  function _ngEnsureTab(tabs, key, label, labelEn, icon){
    var tab = _ngFindTab(tabs, key);
    if(tab) return tab;
    tab = _blockTab(key, label, labelEn, [], icon || '');
    tabs.push(tab);
    return tab;
  }

  function _ngEnsureSection(tab, key, label, labelEn){
    var section = null;
    (tab.sections || []).forEach(function(item){
      if(item && item.key === key) section = item;
    });
    if(section) return section;
    section = _blockSection(key, label, labelEn, []);
    if(!Array.isArray(tab.sections)) tab.sections = [];
    tab.sections.push(section);
    return section;
  }

  function _ngEnsureField(section, field){
    if(!section || !field) return;
    if(!Array.isArray(section.fields)) section.fields = [];
    if(section.fields.some(function(item){
      return item && ((field.path && item.path === field.path) || (field.key && item.key === field.key));
    })) return;
    section.fields.push(field);
  }

  function _ngAppendFields(section, fields){
    (fields || []).forEach(function(field){
      _ngEnsureField(section, field);
    });
  }

  function _ngApplySectionOrder(tab, sectionKeys){
    if(!tab || !Array.isArray(tab.sections)) return;
    tab.sections.sort(function(a, b){
      var ai = sectionKeys.indexOf(a.key);
      var bi = sectionKeys.indexOf(b.key);
      if(ai < 0) ai = 999;
      if(bi < 0) bi = 999;
      return ai - bi;
    });
  }

  function _ngGovernanceFields(){
    return [
      _blockField('domain', 'Miền nghiệp vụ', 'Business domain', 'select', 'config.governance.domain', {
        default:'quality',
        options:['quality','manufacturing','planning','procurement','warehouse','sales','supplier','customer','maintenance','energy','documents','admin']
      }),
      _blockField('boundedContext', 'Bounded context', 'Bounded context', 'text', 'config.governance.boundedContext', { default:'', placeholder:'quality.ncr' }),
      _blockField('entityKey', 'Entity key', 'Entity key', 'text', 'config.governance.entityKey', { default:'', placeholder:'ncr_case' }),
      _blockField('ownerTeam', 'Nhóm phụ trách', 'Owner team', 'text', 'config.governance.ownerTeam', { default:'', placeholder:'QMS / Operations' }),
      _blockField('processOwner', 'Process owner', 'Process owner', 'text', 'config.governance.processOwner', { default:'' }),
      _blockField('lifecycle', 'Vòng đời', 'Lifecycle', 'select', 'config.governance.lifecycle', {
        default:'draft',
        options:['draft','review','pilot','active','deprecated']
      }),
      _blockField('criticality', 'Mức độ quan trọng', 'Criticality', 'select', 'config.governance.criticality', {
        default:'medium',
        options:['low','medium','high','mission-critical']
      }),
      _blockField('packRef', 'Field pack chuẩn', 'Standard field pack', 'text', 'config.governance.packRef', { default:'', placeholder:'chat_luong.ncr_header' }),
      _blockField('tagsText', 'Tags', 'Tags', 'text', 'config.governance.tagsText', { default:'', placeholder:'ncr,capa,8d' }),
      _blockField('auditRequired', 'Bắt buộc audit trail', 'Audit trail required', 'toggle', 'config.governance.auditRequired', { default:false }),
      _blockField('governanceNote', 'Ghi chú governance', 'Governance note', 'textarea', 'config.governance.note', { default:'', rows:2 })
    ];
  }

  function _ngPipelineFields(){
    return [
      _blockField('sourceMode', 'Chế độ nguồn dữ liệu', 'Data source mode', 'select', 'config.dataSource.mode', {
        default:'api',
        options:['api','query-pipeline','registry','manual','stream']
      }),
      _blockField('queryProfile', 'Kiểu pipeline', 'Pipeline profile', 'select', 'config.dataPipeline.profile', {
        default:'list',
        options:['list','detail','analytics','transaction','timeline','kanban','monitoring']
      }),
      _blockField('primaryKey', 'Primary key', 'Primary key', 'field-select', 'config.dataPipeline.primaryKey', { default:'id' }),
      _blockField('labelField', 'Label field', 'Label field', 'field-select', 'config.dataPipeline.labelField', { default:'name' }),
      _blockField('cacheStrategy', 'Chiến lược cache', 'Cache strategy', 'select', 'config.dataSource.cacheStrategy', {
        default:'memory',
        options:['none','memory','session','edge','server']
      }),
      _blockField('offlineReady', 'Sẵn sàng offline', 'Offline ready', 'toggle', 'config.dataSource.offlineReady', { default:false }),
      _blockField('joins', 'Data joins', 'Data joins', 'collection', 'config.dataPipeline.joins', {
        default:[],
        addLabel:'Thêm join',
        itemLabel:'Join',
        itemFields:[
          _blockField('entity', 'Entity / API', 'Entity / API', 'text', 'entity', { default:'' }),
          _blockField('joinType', 'Kiểu join', 'Join type', 'select', 'joinType', { default:'left', options:['left','inner','right','full'] }),
          _blockField('sourceField', 'Field nguồn', 'Source field', 'field-select', 'sourceField', { default:'' }),
          _blockField('targetField', 'Field đích', 'Target field', 'text', 'targetField', { default:'' }),
          _blockField('alias', 'Alias', 'Alias', 'text', 'alias', { default:'' }),
          _blockField('enabled', 'Kích hoạt', 'Enabled', 'toggle', 'enabled', { default:true })
        ]
      }),
      _blockField('pipelineSteps', 'Data pipeline', 'Data pipeline', 'collection', 'config.dataPipeline.steps', {
        default:[],
        addLabel:'Thêm bước',
        itemLabel:'Bước',
        itemFields:[
          _blockField('stepType', 'Loại bước', 'Step type', 'select', 'stepType', {
            default:'filter',
            options:['filter','sort','group','aggregate','join','map','compute','window','pivot','deduplicate','limit']
          }),
          _blockField('sourceField', 'Field nguồn', 'Source field', 'field-select', 'sourceField', { default:'' }),
          _blockField('operator', 'Toán tử', 'Operator', 'select', 'operator', {
            default:'=',
            options:['=','!=','>','>=','<','<=','contains','startsWith','in','between','sum','avg','count','min','max','custom']
          }),
          _blockField('targetField', 'Field đích', 'Target field', 'text', 'targetField', { default:'' }),
          _blockField('expression', 'Biểu thức', 'Expression', 'expression', 'expression', { default:'' }),
          _blockField('enabled', 'Kích hoạt', 'Enabled', 'toggle', 'enabled', { default:true })
        ]
      }),
      _blockField('contracts', 'Data contract', 'Data contract', 'collection', 'config.dataPipeline.contracts', {
        default:[],
        addLabel:'Thêm field contract',
        itemLabel:'Field',
        itemFields:[
          _blockField('fieldKey', 'Field key', 'Field key', 'text', 'fieldKey', { default:'' }),
          _blockField('fieldType', 'Kiểu dữ liệu', 'Data type', 'field-type-select', 'fieldType', { default:'string' }),
          _blockField('required', 'Bắt buộc', 'Required', 'toggle', 'required', { default:false }),
          _blockField('nullable', 'Cho phép null', 'Nullable', 'toggle', 'nullable', { default:true }),
          _blockField('defaultValue', 'Giá trị mặc định', 'Default value', 'text', 'defaultValue', { default:'' })
        ]
      })
    ];
  }

  function _ngStreamingFields(){
    return [
      _blockField('streamEnabled', 'Bật luồng realtime', 'Enable realtime stream', 'toggle', 'config.stream.enabled', { default:false }),
      _blockField('connector', 'Connector', 'Connector', 'iot-connector-select', 'config.stream.connector', { default:'' }),
      _blockField('topic', 'Topic / channel', 'Topic / channel', 'text', 'config.stream.topic', { default:'', placeholder:'machine/+/state' }),
      _blockField('snapshotField', 'Snapshot field', 'Snapshot field', 'field-select', 'config.stream.snapshotField', { default:'' }),
      _blockField('refreshMs', 'Refresh (ms)', 'Refresh (ms)', 'number', 'config.stream.refreshMs', { default:1000, min:100, step:100 }),
      _blockField('bufferSize', 'Kích thước buffer', 'Buffer size', 'number', 'config.stream.bufferSize', { default:200, min:10, step:10 })
    ];
  }

  function _ngDesignFields(){
    return [
      _blockField('themePreset', 'Preset giao diện', 'Theme preset', 'select', 'config.design.themePreset', {
        default:'inherit',
        options:['inherit','enterprise','industrial','executive','shopfloor','lab','dark-ops']
      }),
      _blockField('density', 'Mật độ UI', 'UI density', 'select', 'config.design.density', {
        default:'inherit',
        options:['inherit','comfortable','compact','dense']
      }),
      _blockField('shellPreset', 'Shell preset', 'Shell preset', 'select', 'config.design.shellPreset', {
        default:'inherit',
        options:['inherit','page','workspace','ops-center','executive-board']
      }),
      _blockField('surfaceVariant', 'Surface variant', 'Surface variant', 'select', 'config.design.surfaceVariant', {
        default:'default',
        options:['default','elevated','outlined','tinted','glass','solid']
      }),
      _blockField('semanticTone', 'Semantic tone', 'Semantic tone', 'select', 'config.design.semanticTone', {
        default:'default',
        options:['default','brand','info','success','warning','danger']
      }),
      _blockField('motionPreset', 'Motion preset', 'Motion preset', 'select', 'config.design.motionPreset', {
        default:'inherit',
        options:['inherit','none','subtle','standard','expressive']
      }),
      _blockField('className', 'CSS class', 'CSS class', 'text', 'config.design.className', { default:'' }),
      _blockField('cssVars', 'CSS vars', 'CSS vars', 'json', 'config.design.cssVars', { default:{} })
    ];
  }

  function _ngBreakpointFields(){
    return [
      _blockField('mobileSpan', 'Span mobile', 'Mobile span', 'number', 'config.responsive.mobile.span', { default:12, min:1, max:12 }),
      _blockField('tabletSpan', 'Span tablet', 'Tablet span', 'number', 'config.responsive.tablet.span', { default:6, min:1, max:12 }),
      _blockField('desktopSpan', 'Span desktop', 'Desktop span', 'number', 'config.responsive.desktop.span', { default:12, min:1, max:12 }),
      _blockField('wideSpan', 'Span wide', 'Wide span', 'number', 'config.responsive.wide.span', { default:12, min:1, max:12 }),
      _blockField('mobileHide', 'Ẩn trên mobile', 'Hide on mobile', 'toggle', 'config.responsive.mobile.hide', { default:false }),
      _blockField('tabletHide', 'Ẩn trên tablet', 'Hide on tablet', 'toggle', 'config.responsive.tablet.hide', { default:false }),
      _blockField('desktopHide', 'Ẩn trên desktop', 'Hide on desktop', 'toggle', 'config.responsive.desktop.hide', { default:false }),
      _blockField('overflowMode', 'Overflow mode', 'Overflow mode', 'select', 'config.responsive.overflowMode', {
        default:'wrap',
        options:['wrap','scroll','stack','grid']
      }),
      _blockField('stickyPriority', 'Ưu tiên sticky', 'Sticky priority', 'select', 'config.responsive.stickyPriority', {
        default:'none',
        options:['none','low','medium','high']
      }),
      _blockField('printPreset', 'Preset khi in', 'Print preset', 'select', 'config.responsive.print.preset', {
        default:'standard',
        options:['standard','condensed','executive','a4-form']
      })
    ];
  }

  function _ngActionFlowFields(){
    return [
      _blockField('steps', 'Action flow', 'Action flow', 'collection', 'config.eventFlow.steps', {
        default:[],
        addLabel:'Thêm bước',
        itemLabel:'Bước',
        itemFields:[
          _blockField('trigger', 'Trigger', 'Trigger', 'select', 'trigger', {
            default:'click',
            options:['load','click','change','submit','select','row-click','schedule','stream']
          }),
          _blockField('actionType', 'Loại action', 'Action type', 'select', 'actionType', {
            default:'navigate',
            options:['navigate','api-call','open-modal','set-state','emit-event','refresh-block','run-workflow','download','approve','reject','custom']
          }),
          _blockField('api', 'API', 'API', 'api-select', 'api', { default:'' }),
          _blockField('workflowId', 'Workflow', 'Workflow', 'workflow-select', 'workflowId', { default:'' }),
          _blockField('target', 'Target', 'Target', 'text', 'target', { default:'' }),
          _blockField('payload', 'Payload', 'Payload', 'expression', 'payload', { default:'' }),
          _blockField('condition', 'Điều kiện', 'Condition', 'expression', 'condition', { default:'' }),
          _blockField('async', 'Async', 'Async', 'toggle', 'async', { default:true }),
          _blockField('timeoutMs', 'Timeout (ms)', 'Timeout (ms)', 'number', 'timeoutMs', { default:15000, min:0, step:100 }),
          _blockField('confirmText', 'Xác nhận', 'Confirmation', 'text', 'confirmText', { default:'' }),
          _blockField('auditTag', 'Audit tag', 'Audit tag', 'text', 'auditTag', { default:'' }),
          _blockField('enabled', 'Kích hoạt', 'Enabled', 'toggle', 'enabled', { default:true })
        ]
      })
    ];
  }

  function _ngAutomationPolicyFields(){
    return [
      _blockField('requireComment', 'Bắt buộc comment', 'Require comment', 'toggle', 'config.eventFlow.requireComment', { default:false }),
      _blockField('requireESign', 'Bắt buộc e-sign', 'Require e-sign', 'toggle', 'config.eventFlow.requireESign', { default:false }),
      _blockField('requireApproval', 'Bắt buộc phê duyệt', 'Require approval', 'toggle', 'config.eventFlow.requireApproval', { default:false }),
      _blockField('approvalWorkflow', 'Workflow phê duyệt', 'Approval workflow', 'workflow-select', 'config.eventFlow.approvalWorkflow', { default:'' }),
      _blockField('rollbackOnError', 'Rollback khi lỗi', 'Rollback on error', 'toggle', 'config.eventFlow.rollbackOnError', { default:false }),
      _blockField('concurrencyKey', 'Concurrency key', 'Concurrency key', 'text', 'config.eventFlow.concurrencyKey', { default:'' }),
      _blockField('namespace', 'Event namespace', 'Event namespace', 'text', 'config.eventFlow.namespace', { default:'' }),
      _blockField('approvalNote', 'Ghi chú điều phối', 'Orchestration note', 'textarea', 'config.eventFlow.note', { default:'', rows:2 })
    ];
  }

  function _applyNextGenSchemaPatch(){
    Object.keys(BLOCK_PROPERTIES_SCHEMA || {}).forEach(function(type){
      var tabs = BLOCK_PROPERTIES_SCHEMA[type] || [];
      var general = _ngEnsureTab(tabs, 'general', 'Tổng quan', 'General', '⚙️');
      var data = _ngEnsureTab(tabs, 'data', 'Dữ liệu', 'Data', '🗄️');
      var style = _ngEnsureTab(tabs, 'style', 'Giao diện', 'Style', '🎨');
      var events = _ngEnsureTab(tabs, 'events', 'Sự kiện', 'Events', '⚡');
      var governance = _ngEnsureSection(general, 'governance', 'Governance', 'Governance');
      var queryPipeline = _ngEnsureSection(data, 'queryPipeline', 'Query pipeline', 'Query pipeline');
      var stream = _ngEnsureSection(data, 'stream', 'Realtime / Stream', 'Realtime / Stream');
      var designSystem = _ngEnsureSection(style, 'designSystem', 'Design system', 'Design system');
      var responsiveGrid = _ngEnsureSection(style, 'responsiveGrid', 'Breakpoints & span', 'Breakpoints & span');
      var eventFlow = _ngEnsureSection(events, 'actionFlow', 'Action flow', 'Action flow');
      var automationPolicy = _ngEnsureSection(events, 'automationPolicy', 'Automation policy', 'Automation policy');
      _ngAppendFields(governance, _ngGovernanceFields());
      _ngAppendFields(queryPipeline, _ngPipelineFields());
      _ngAppendFields(stream, _ngStreamingFields());
      _ngAppendFields(designSystem, _ngDesignFields());
      _ngAppendFields(responsiveGrid, _ngBreakpointFields());
      _ngAppendFields(eventFlow, _ngActionFlowFields());
      _ngAppendFields(automationPolicy, _ngAutomationPolicyFields());
      _ngApplySectionOrder(general, ['identity','behavior','governance']);
      _ngApplySectionOrder(data, ['source','refresh','queryPipeline','stream']);
      _ngApplySectionOrder(style, ['layout','surface','typography','responsive','designSystem','responsiveGrid']);
      _ngApplySectionOrder(events, ['actions','lifecycle','advanced','actionFlow','automationPolicy']);
    });
    if(window.HmBlockEngine){
      window.HmBlockEngine.BLOCK_PROPERTIES_SCHEMA = BLOCK_PROPERTIES_SCHEMA;
      window.HmBlockEngine.MODULE_BUILDER_NEXTGEN_SCHEMA_VERSION = '2026-04-07';
    }
  }

  _applyNextGenSchemaPatch();
})();

})();


/* ─── 9. MODULE BUILDER ULTRA SCHEMA PATCH (2026-04-07 R2) ───────────────── */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_ULTRA_SCHEMA_VERSION === '2026-04-07-r2') return;
  var BE = window.HmBlockEngine;
  var SCHEMA = BE.BLOCK_PROPERTIES_SCHEMA || {};

  function ensureTab(tabs, key, label, labelEn, icon){
    var found = null;
    (tabs || []).forEach(function(tab){
      if(tab && tab.key === key) found = tab;
    });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, icon:icon || '', sections:[] };
    tabs.push(found);
    return found;
  }

  function ensureSection(tab, key, label, labelEn){
    var found = null;
    if(!tab.sections) tab.sections = [];
    tab.sections.forEach(function(section){
      if(section && section.key === key) found = section;
    });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, fields:[] };
    tab.sections.push(found);
    return found;
  }

  function field(key, label, labelEn, type, path, extra){
    var out = { key:key, label:label, labelEn:labelEn || label, type:type, path:path };
    Object.keys(extra || {}).forEach(function(name){ out[name] = extra[name]; });
    return out;
  }

  function ensureField(section, def){
    var exists = false;
    if(!section.fields) section.fields = [];
    section.fields.forEach(function(item){
      if(item && ((def.path && item.path === def.path) || (def.key && item.key === def.key))) exists = true;
    });
    if(!exists) section.fields.push(def);
  }

  function append(section, defs){
    (defs || []).forEach(function(def){ ensureField(section, def); });
  }

  Object.keys(SCHEMA).forEach(function(type){
    var tabs = SCHEMA[type] || [];
    var dataTab = ensureTab(tabs, 'data', 'Dữ liệu', 'Data', '🗄️');
    var styleTab = ensureTab(tabs, 'style', 'Giao diện', 'Style', '🎨');
    var eventsTab = ensureTab(tabs, 'events', 'Sự kiện', 'Events', '⚡');

    var dataOps = ensureSection(dataTab, 'dataOps', 'Data experience', 'Data experience');
    var designPolish = ensureSection(styleTab, 'designPolish', 'Visual polish', 'Visual polish');
    var responsiveAdvanced = ensureSection(styleTab, 'responsiveAdvanced', 'Responsive advanced', 'Responsive advanced');
    var executionResilience = ensureSection(eventsTab, 'executionResilience', 'Execution resilience', 'Execution resilience');

    append(dataOps, [
      field('emptyStateTitle', 'Tiêu đề empty state', 'Empty state title', 'text', 'config.dataSource.emptyStateTitle', { default:'', placeholder:'Không có dữ liệu' }),
      field('emptyStateNote', 'Mô tả empty state', 'Empty state note', 'textarea', 'config.dataSource.emptyStateNote', { default:'', rows:2 }),
      field('prefetch', 'Prefetch trước khi mở', 'Prefetch on load', 'toggle', 'config.dataSource.prefetch', { default:false }),
      field('timeoutMs', 'Timeout dữ liệu (ms)', 'Data timeout (ms)', 'number', 'config.dataSource.timeoutMs', { default:15000, min:0, step:100 }),
      field('queryTag', 'Query tag', 'Query tag', 'text', 'config.dataPipeline.queryTag', { default:'', placeholder:'qms.builder.table.header' }),
      field('telemetryDataset', 'Telemetry dataset', 'Telemetry dataset', 'text', 'config.dataPipeline.telemetryDataset', { default:'', placeholder:'machine_status_live' })
    ]);

    append(designPolish, [
      field('visualLanguage', 'Visual language', 'Visual language', 'select', 'config.design.visualLanguage', {
        default:'inherit',
        options:['inherit','industrial-glass','executive-premium','dark-ops','precision-clean','warehouse-neon']
      }),
      field('accentTone', 'Accent tone', 'Accent tone', 'select', 'config.design.accentTone', {
        default:'inherit',
        options:['inherit','blue','indigo','emerald','amber','teal','rose']
      }),
      field('heroMood', 'Hero mood', 'Hero mood', 'select', 'config.design.heroMood', {
        default:'inherit',
        options:['inherit','aurora','cinematic','night-shift','clear-day','focused']
      }),
      field('cardRadius', 'Card radius', 'Card radius', 'select', 'config.design.cardRadius', {
        default:'inherit',
        options:['inherit','md','lg','xl']
      }),
      field('iconStyle', 'Icon style', 'Icon style', 'select', 'config.design.iconStyle', {
        default:'inherit',
        options:['inherit','outlined','filled','duotone']
      }),
      field('chartStyle', 'Chart style', 'Chart style', 'select', 'config.design.chartStyle', {
        default:'inherit',
        options:['inherit','balanced','executive','realtime','clean-room']
      }),
      field('panelGlass', 'Glass panel', 'Glass panel', 'toggle', 'config.design.panelGlass', { default:false }),
      field('microcopy', 'Caption / microcopy', 'Caption / microcopy', 'textarea', 'config.design.caption', { default:'', rows:2 })
    ]);

    append(responsiveAdvanced, [
      field('breakpointStrategy', 'Breakpoint strategy', 'Breakpoint strategy', 'select', 'config.responsive.strategy', {
        default:'inherit',
        options:['inherit','desktop-first','mobile-first','operator-screen']
      }),
      field('mobileOrder', 'Thứ tự mobile', 'Mobile order', 'number', 'config.responsive.mobile.order', { default:0, step:1 }),
      field('tabletOrder', 'Thứ tự tablet', 'Tablet order', 'number', 'config.responsive.tablet.order', { default:0, step:1 }),
      field('desktopOrder', 'Thứ tự desktop', 'Desktop order', 'number', 'config.responsive.desktop.order', { default:0, step:1 }),
      field('minHeight', 'Min height', 'Min height', 'text', 'config.responsive.minHeight', { default:'', placeholder:'160px' }),
      field('maxHeight', 'Max height', 'Max height', 'text', 'config.responsive.maxHeight', { default:'', placeholder:'480px' }),
      field('stickyOffset', 'Sticky offset', 'Sticky offset', 'text', 'config.responsive.stickyOffset', { default:'', placeholder:'64px' })
    ]);

    append(executionResilience, [
      field('retryPolicy', 'Retry policy', 'Retry policy', 'select', 'config.eventFlow.retryPolicy', {
        default:'none',
        options:['none','immediate','exponential','manual']
      }),
      field('retryCount', 'Retry count', 'Retry count', 'number', 'config.eventFlow.retryCount', { default:0, min:0, step:1 }),
      field('retryBackoffMs', 'Retry backoff (ms)', 'Retry backoff (ms)', 'number', 'config.eventFlow.retryBackoffMs', { default:300, min:0, step:50 }),
      field('successToast', 'Toast khi thành công', 'Success toast', 'text', 'config.eventFlow.successToast', { default:'', placeholder:'Lưu thành công' }),
      field('errorToast', 'Toast khi lỗi', 'Error toast', 'text', 'config.eventFlow.errorToast', { default:'', placeholder:'Có lỗi xảy ra' }),
      field('telemetryEvent', 'Telemetry event', 'Telemetry event', 'text', 'config.eventFlow.telemetryEvent', { default:'', placeholder:'module.save.click' }),
      field('failSafeMode', 'Fail-safe mode', 'Fail-safe mode', 'select', 'config.eventFlow.failSafeMode', {
        default:'none',
        options:['none','disable-block','soft-warning','fallback-view']
      })
    ]);

    SCHEMA[type] = tabs;
  });

  BE.BLOCK_PROPERTIES_SCHEMA = SCHEMA;
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r2';
})();


/* ═══════════════════════════════════════════════════════════════════════════
   MODULE BUILDER ULTRA ROUND 3 PATCH — 2026-04-07
   Deep schema, new archetypes, storytelling/a11y/observability fields
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_ULTRA_SCHEMA_VERSION === '2026-04-07-r3') return;

  var BE = window.HmBlockEngine;
  var SCHEMA = BE.BLOCK_PROPERTIES_SCHEMA || {};
  var clone = function(value){ return value == null ? value : JSON.parse(JSON.stringify(value)); };
  var extraCatalog = {
    'ops-control-tower': {
      label:'Control Tower',
      labelEn:'Control Tower',
      category:'insight',
      icon:'🛰️',
      desc:'Trung tâm điều hành đa tín hiệu cho KPI, ngoại lệ và trạng thái điều phối',
      descEn:'Multi-signal control tower for KPI, exceptions and orchestration state',
      renderer:'data-cards'
    },
    'quality-warroom-kpi': {
      label:'Quality War Room',
      labelEn:'Quality War Room',
      category:'quality',
      icon:'🧪',
      desc:'Băng KPI chất lượng dành cho NCR, CAPA, audit và escalation',
      descEn:'Quality KPI band for NCR, CAPA, audit and escalation',
      renderer:'kpi-row'
    },
    'audit-evidence-stage': {
      label:'Evidence Stage',
      labelEn:'Evidence Stage',
      category:'quality',
      icon:'🧾',
      desc:'Sân khấu chứng cứ, chain-of-custody và mốc review',
      descEn:'Evidence stage for chain-of-custody and review milestones',
      renderer:'data-timeline'
    },
    'flow-command-lane': {
      label:'Command Lane',
      labelEn:'Command Lane',
      category:'action',
      icon:'🧭',
      desc:'Lane điều phối workflow, approval và escalation',
      descEn:'Workflow, approval and escalation command lane',
      renderer:'action-status-flow'
    },
    'release-readiness-board': {
      label:'Release Readiness',
      labelEn:'Release Readiness',
      category:'automation',
      icon:'🚀',
      desc:'Bảng readiness cho publish, signoff và rollback',
      descEn:'Readiness board for publish, signoff and rollback',
      renderer:'data-table'
    },
    'story-hero-banner': {
      label:'Story Hero',
      labelEn:'Story Hero',
      category:'media',
      icon:'🌌',
      desc:'Banner kể chuyện cho module, campaign và operational narrative',
      descEn:'Narrative hero banner for modules, campaigns and operations',
      renderer:'info-banner'
    }
  };

  Object.keys(extraCatalog).forEach(function(key){
    if(!BE.BLOCK_CATALOG[key]) BE.BLOCK_CATALOG[key] = clone(extraCatalog[key]);
  });

  var extraTemplates = {
    'tpl-r3-executive-control-tower-kpi': {
      type:'quality-warroom-kpi',
      title:{ vi:'KPI Control Tower', en:'Control Tower KPIs' },
      config:{
        dataSource:{ api:'report_dashboard', method:'GET' },
        items:[
          { label:{vi:'Doanh thu dự phóng', en:'Projected Revenue'}, dataSource:{ api:'report_dashboard', field:'projected_revenue' }, color:'var(--brand-2)', suffix:' VND' },
          { label:{vi:'Rủi ro đỏ', en:'Red Risks'}, dataSource:{ api:'report_dashboard', field:'critical_risks' }, color:'var(--red)' },
          { label:{vi:'Luồng trễ SLA', en:'SLA Breaches'}, dataSource:{ api:'report_dashboard', field:'sla_breaches' }, color:'var(--amber)' },
          { label:{vi:'Hành động hôm nay', en:'Actions Today'}, dataSource:{ api:'report_dashboard', field:'actions_today' }, color:'var(--green)' }
        ],
        design:{ caption:'Một dải KPI cấp điều hành cho control tower đa domain' }
      }
    },
    'tpl-r3-shopfloor-signal-wall': {
      type:'ops-control-tower',
      title:{ vi:'Signal Wall xưởng', en:'Shopfloor Signal Wall' },
      config:{
        dataSource:{ api:'mobile_shop_overview', method:'GET', dataKey:'machines' },
        columns:4,
        titleKey:'machine_id',
        subtitleKey:'status',
        badgeKey:'status',
        design:{ caption:'Signal wall realtime cho production, andon và downtime' }
      }
    },
    'tpl-r3-audit-evidence-stage': {
      type:'audit-evidence-stage',
      title:{ vi:'Evidence Stage', en:'Evidence Stage' },
      config:{
        dataSource:{ api:'evidence_event_list', method:'GET', dataKey:'events' },
        dateKey:'event_at',
        titleKey:'event_title',
        descKey:'event_note',
        design:{ caption:'Timeline chain-of-custody, signoff và checkpoint điều tra' }
      }
    },
    'tpl-r3-release-readiness-board': {
      type:'release-readiness-board',
      title:{ vi:'Release Readiness', en:'Release Readiness' },
      config:{
        dataSource:{ api:'system_health', method:'GET', dataKey:'checks' },
        dataKey:'checks',
        pageSize:10,
        columns:[
          { key:'domain', label:{vi:'Miền', en:'Domain'}, type:'text' },
          { key:'status', label:{vi:'Trạng thái', en:'Status'}, type:'badge' },
          { key:'owner', label:{vi:'Phụ trách', en:'Owner'}, type:'text' },
          { key:'updated_at', label:{vi:'Cập nhật', en:'Updated'}, type:'date' }
        ],
        design:{ caption:'Board readiness cho publish, signoff, runbook và rollback' }
      }
    },
    'tpl-r3-command-lane': {
      type:'flow-command-lane',
      title:{ vi:'Lane điều phối', en:'Command Lane' },
      config:{
        workflow:{
          id:'release_readiness',
          label:{vi:'Release readiness', en:'Release readiness'},
          currentStatus:'review',
          states:[
            { key:'draft', label:{vi:'Draft', en:'Draft'} },
            { key:'review', label:{vi:'Review', en:'Review'} },
            { key:'approved', label:{vi:'Approved', en:'Approved'} },
            { key:'released', label:{vi:'Released', en:'Released'} }
          ]
        }
      }
    },
    'tpl-r3-story-hero': {
      type:'story-hero-banner',
      title:{ vi:'Operational Narrative', en:'Operational Narrative' },
      config:{
        tone:'info',
        title:{ vi:'Điều phối end-to-end trong một bức tranh', en:'End-to-end orchestration in one view' },
        description:{ vi:'Banner hero cho control tower, war room và release narrative.', en:'Hero banner for control tower, war room and release narrative.' },
        design:{ caption:'Hero story giúp module có mở đầu rõ ràng và giàu ngữ cảnh' }
      }
    }
  };

  Object.keys(extraTemplates).forEach(function(key){
    BE.BLOCK_TEMPLATES[key] = clone(extraTemplates[key]);
  });

  function ensureTab(tabs, key, label, labelEn, icon){
    var found = null;
    if(!tabs) return null;
    tabs.forEach(function(tab){
      if(tab && tab.key === key) found = tab;
    });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, icon:icon || '•', sections:[] };
    tabs.push(found);
    return found;
  }

  function ensureSection(tab, key, label, labelEn){
    var found = null;
    if(!tab) return null;
    if(!tab.sections) tab.sections = [];
    tab.sections.forEach(function(section){
      if(section && section.key === key) found = section;
    });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, fields:[] };
    tab.sections.push(found);
    return found;
  }

  function field(key, label, labelEn, type, path, extra){
    var out = { key:key, label:label, labelEn:labelEn || label, type:type, path:path };
    Object.keys(extra || {}).forEach(function(name){ out[name] = extra[name]; });
    return out;
  }

  function append(section, defs){
    (defs || []).forEach(function(def){
      var exists = false;
      (section.fields || []).forEach(function(item){
        if(item && ((def.path && item.path === def.path) || (def.key && item.key === def.key))) exists = true;
      });
      if(!exists) section.fields.push(def);
    });
  }

  Object.keys(extraCatalog).forEach(function(type){
    var sourceType = extraCatalog[type].renderer || 'data-cards';
    if(!SCHEMA[type]) SCHEMA[type] = clone(SCHEMA[sourceType] || []);
  });

  Object.keys(SCHEMA).forEach(function(type){
    var tabs = SCHEMA[type] || [];
    var generalTab = ensureTab(tabs, 'general', 'Tổng quan', 'General', '🧩');
    var dataTab = ensureTab(tabs, 'data', 'Dữ liệu', 'Data', '🗄️');
    var styleTab = ensureTab(tabs, 'style', 'Giao diện', 'Style', '🎨');
    var eventsTab = ensureTab(tabs, 'events', 'Sự kiện', 'Events', '⚡');

    var narrative = ensureSection(generalTab, 'narrative', 'Narrative & guidance', 'Narrative & guidance');
    var observability = ensureSection(dataTab, 'observability', 'Observability', 'Observability');
    var experience = ensureSection(styleTab, 'experience', 'Experience modes', 'Experience modes');
    var accessibility = ensureSection(styleTab, 'accessibility', 'Accessibility & ergonomics', 'Accessibility & ergonomics');
    var collaboration = ensureSection(eventsTab, 'collaboration', 'Collaboration & signoff', 'Collaboration & signoff');

    append(narrative, [
      field('eyebrow', 'Eyebrow', 'Eyebrow', 'text', 'config.story.eyebrow', { default:'', placeholder:'QUALITY / CONTROL TOWER' }),
      field('headline', 'Headline', 'Headline', 'text', 'config.story.headline', { default:'', placeholder:'From detection to closure in one canvas' }),
      field('supportingText', 'Supporting text', 'Supporting text', 'textarea', 'config.story.supportingText', { default:'', rows:2 }),
      field('priorityTag', 'Priority tag', 'Priority tag', 'text', 'config.story.priorityTag', { default:'', placeholder:'High risk / executive review' })
    ]);

    append(observability, [
      field('cachePolicy', 'Cache policy', 'Cache policy', 'select', 'config.observability.cachePolicy', {
        default:'inherit',
        options:['inherit','none','memory','session','edge']
      }),
      field('staleAfterSec', 'Stale after (sec)', 'Stale after (sec)', 'number', 'config.observability.staleAfterSec', { default:0, min:0, step:5 }),
      field('queryBudgetMs', 'Query budget (ms)', 'Query budget (ms)', 'number', 'config.observability.queryBudgetMs', { default:0, min:0, step:50 }),
      field('skeletonPreset', 'Skeleton preset', 'Skeleton preset', 'select', 'config.observability.skeletonPreset', {
        default:'inherit',
        options:['inherit','none','card','table','chart','detail']
      }),
      field('traceTag', 'Trace tag', 'Trace tag', 'text', 'config.observability.traceTag', { default:'', placeholder:'quality.ncr.table' })
    ]);

    append(experience, [
      field('chromeLevel', 'Chrome level', 'Chrome level', 'select', 'config.design.chromeLevel', {
        default:'inherit',
        options:['inherit','minimal','balanced','immersive']
      }),
      field('glancePriority', 'Glance priority', 'Glance priority', 'select', 'config.design.glancePriority', {
        default:'inherit',
        options:['inherit','balanced','kpi-first','workflow-first','evidence-first']
      }),
      field('operatorDistance', 'Operator distance', 'Operator distance', 'select', 'config.design.operatorDistance', {
        default:'inherit',
        options:['inherit','desk','arm-length','wallboard']
      }),
      field('motionPreset', 'Motion preset', 'Motion preset', 'select', 'config.design.motionPreset', {
        default:'inherit',
        options:['inherit','none','subtle','guided','cinematic']
      }),
      field('audiencePrimary', 'Primary audience', 'Primary audience', 'select', 'config.design.audiencePrimary', {
        default:'inherit',
        options:['inherit','operator','supervisor','quality','auditor','executive','cross-functional']
      })
    ]);

    append(accessibility, [
      field('ariaLabel', 'ARIA label', 'ARIA label', 'text', 'config.accessibility.ariaLabel', { default:'' }),
      field('contrastMode', 'Contrast mode', 'Contrast mode', 'select', 'config.accessibility.contrastMode', {
        default:'inherit',
        options:['inherit','standard','high','night']
      }),
      field('touchTarget', 'Touch target', 'Touch target', 'select', 'config.accessibility.touchTarget', {
        default:'inherit',
        options:['inherit','md','lg','xl']
      }),
      field('keyboardOrder', 'Keyboard order', 'Keyboard order', 'number', 'config.accessibility.keyboardOrder', { default:0, step:1 }),
      field('screenReaderNote', 'Screen reader note', 'Screen reader note', 'textarea', 'config.accessibility.screenReaderNote', { default:'', rows:2 })
    ]);

    append(collaboration, [
      field('approvalChannel', 'Approval channel', 'Approval channel', 'text', 'config.collaboration.approvalChannel', { default:'', placeholder:'quality.review.board' }),
      field('notifyRoles', 'Notify roles (CSV)', 'Notify roles (CSV)', 'text', 'config.collaboration.notifyRoles', { default:'', placeholder:'quality_manager, process_owner' }),
      field('esignRequired', 'Require e-sign', 'Require e-sign', 'toggle', 'config.collaboration.esignRequired', { default:false }),
      field('handoverTemplate', 'Handover template', 'Handover template', 'text', 'config.collaboration.handoverTemplate', { default:'', placeholder:'warroom_handover_v1' }),
      field('reviewCadence', 'Review cadence', 'Review cadence', 'select', 'config.collaboration.reviewCadence', {
        default:'inherit',
        options:['inherit','shift','daily','weekly','release']
      })
    ]);

    SCHEMA[type] = tabs;
  });

  if(BE.BREAKPOINTS && !BE.BREAKPOINTS.wide){
    BE.BREAKPOINTS.wide = { maxWidth: 1600, label:'Màn hình rộng', labelEn:'Wide' };
  }

  BE.EXTRA_TEMPLATES_ROUND3 = extraTemplates;
  BE.BLOCK_PROPERTIES_SCHEMA = SCHEMA;
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r3';
})();


/* ─── 10. MODULE BUILDER ULTIMATE SCHEMA + TEMPLATE PATCH (2026-04-07 R4) ─ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION === '2026-04-07-r4') return;
  var BE = window.HmBlockEngine;
  var SCHEMA = BE.BLOCK_PROPERTIES_SCHEMA || {};
  var TEMPLATES = BE.BLOCK_TEMPLATES || {};

  function ensureTab(tabs, key, label, labelEn, icon){
    var found = null;
    (tabs || []).forEach(function(tab){
      if(tab && tab.key === key) found = tab;
    });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, icon:icon || '', sections:[] };
    tabs.push(found);
    return found;
  }

  function ensureSection(tab, key, label, labelEn){
    var found = null;
    if(!tab.sections) tab.sections = [];
    (tab.sections || []).forEach(function(section){
      if(section && section.key === key) found = section;
    });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, fields:[] };
    tab.sections.push(found);
    return found;
  }

  function field(key, label, labelEn, type, path, extra){
    var out = { key:key, label:label, labelEn:labelEn || label, type:type, path:path };
    Object.keys(extra || {}).forEach(function(name){ out[name] = extra[name]; });
    return out;
  }

  function ensureField(section, def){
    var exists = false;
    if(!section.fields) section.fields = [];
    (section.fields || []).forEach(function(item){
      if(item && ((def.path && item.path === def.path) || (def.key && item.key === def.key))) exists = true;
    });
    if(!exists) section.fields.push(def);
  }

  function append(section, defs){
    (defs || []).forEach(function(def){ ensureField(section, def); });
  }

  Object.keys(SCHEMA).forEach(function(type){
    var tabs = SCHEMA[type] || [];
    var dataTab = ensureTab(tabs, 'data', 'Dữ liệu', 'Data', '🗄️');
    var styleTab = ensureTab(tabs, 'style', 'Giao diện', 'Style', '🎨');
    var eventsTab = ensureTab(tabs, 'events', 'Sự kiện', 'Events', '⚡');

    var observability = ensureSection(dataTab, 'observability', 'Signal & observability', 'Signal & observability');
    var storytelling = ensureSection(styleTab, 'storytelling', 'Storytelling', 'Storytelling');
    var accessibility = ensureSection(styleTab, 'accessibilityErgonomics', 'Accessibility & ergonomics', 'Accessibility & ergonomics');
    var collaboration = ensureSection(eventsTab, 'collaborationOps', 'Collaboration & signoff', 'Collaboration & signoff');
    var operatorOps = ensureSection(eventsTab, 'operatorOps', 'Operator interaction', 'Operator interaction');

    append(observability, [
      field('signalClass', 'Nhóm tín hiệu', 'Signal class', 'select', 'config.observability.signalClass', {
        default:'status',
        options:['status','command','warning','critical','evidence','release']
      }),
      field('refreshCadenceSec', 'Chu kỳ refresh (giây)', 'Refresh cadence (sec)', 'number', 'config.observability.refreshCadenceSec', { default:30, min:0, step:5 }),
      field('alertChannel', 'Kênh cảnh báo', 'Alert channel', 'text', 'config.observability.alertChannel', { default:'', placeholder:'andon.wall / slack.quality / email.audit' }),
      field('signalOwner', 'Chủ tín hiệu', 'Signal owner', 'text', 'config.observability.signalOwner', { default:'', placeholder:'quality_manager' }),
      field('logContext', 'Log context', 'Log context', 'text', 'config.observability.logContext', { default:'', placeholder:'quality.ncr.review' }),
      field('traceKey', 'Trace key', 'Trace key', 'text', 'config.observability.traceKey', { default:'', placeholder:'ncr_number / work_order' })
    ]);

    append(storytelling, [
      field('sceneRole', 'Vai trò scene', 'Scene role', 'select', 'config.story.sceneRole', {
        default:'observe',
        options:['entry','observe','analyze','act','decide','review','prove','handoff']
      }),
      field('sceneTitle', 'Tiêu đề scene', 'Scene title', 'text', 'config.story.sceneTitle', { default:'', placeholder:'Detect, decide and close with evidence' }),
      field('sceneNarrative', 'Narrative', 'Narrative', 'textarea', 'config.story.sceneNarrative', { default:'', rows:3 }),
      field('callToAction', 'Call to action', 'Call to action', 'text', 'config.story.callToAction', { default:'', placeholder:'Escalate now / Review exceptions / Confirm release' }),
      field('heroBadge', 'Hero badge', 'Hero badge', 'text', 'config.story.heroBadge', { default:'', placeholder:'LIVE / CONTROL / EVIDENCE' }),
      field('priorityWeight', 'Trọng số ưu tiên', 'Priority weight', 'number', 'config.story.priorityWeight', { default:50, min:0, max:100, step:5 })
    ]);

    append(accessibility, [
      field('ariaLabel', 'ARIA label', 'ARIA label', 'text', 'config.accessibility.ariaLabel', { default:'', placeholder:'Action lane for NCR review' }),
      field('operatorDistance', 'Khoảng cách người dùng', 'Operator distance', 'select', 'config.accessibility.operatorDistance', {
        default:'desk',
        options:['desk','arm-length','wallboard']
      }),
      field('touchTarget', 'Kích thước touch', 'Touch target', 'select', 'config.accessibility.touchTarget', {
        default:'md',
        options:['sm','md','lg','xl']
      }),
      field('highContrast', 'High contrast', 'High contrast', 'toggle', 'config.accessibility.highContrast', { default:false }),
      field('screenReaderNote', 'Ghi chú screen reader', 'Screen reader note', 'textarea', 'config.accessibility.screenReaderNote', { default:'', rows:2 }),
      field('keyboardHint', 'Gợi ý phím tắt', 'Keyboard hint', 'text', 'config.accessibility.keyboardHint', { default:'', placeholder:'Ctrl+Enter / Alt+S' })
    ]);

    append(collaboration, [
      field('reviewMode', 'Chế độ review', 'Review mode', 'select', 'config.collaboration.reviewMode', {
        default:'optional',
        options:['optional','mandatory','four-eyes','esign']
      }),
      field('reviewOwner', 'Người review', 'Review owner', 'text', 'config.collaboration.reviewOwner', { default:'', placeholder:'quality_manager' }),
      field('handoverQueue', 'Hàng đợi handover', 'Handover queue', 'text', 'config.collaboration.handoverQueue', { default:'', placeholder:'quality-war-room / plant-daily-tier2' }),
      field('evidenceRequired', 'Yêu cầu chứng cứ', 'Evidence required', 'toggle', 'config.collaboration.evidenceRequired', { default:false }),
      field('commentPrompt', 'Prompt bình luận', 'Comment prompt', 'text', 'config.collaboration.commentPrompt', { default:'', placeholder:'Explain rationale and residual risk' }),
      field('esignRole', 'Vai trò ký số', 'E-sign role', 'text', 'config.collaboration.esignRole', { default:'', placeholder:'qa_manager / plant_head' })
    ]);

    append(operatorOps, [
      field('mode', 'Operator mode', 'Operator mode', 'select', 'config.operatorMode.mode', {
        default:'default',
        options:['default','focus','gloves','handheld','wallboard']
      }),
      field('confirmationStyle', 'Kiểu xác nhận', 'Confirmation style', 'select', 'config.operatorMode.confirmationStyle', {
        default:'toast',
        options:['toast','modal','double-confirm','scan']
      }),
      field('safetyPrompt', 'Safety prompt', 'Safety prompt', 'text', 'config.operatorMode.safetyPrompt', { default:'', placeholder:'Verify machine safe state before override' }),
      field('offlineHint', 'Offline hint', 'Offline hint', 'text', 'config.operatorMode.offlineHint', { default:'', placeholder:'Sync will resume when network is back' }),
      field('barcodeIntent', 'Barcode intent', 'Barcode intent', 'text', 'config.operatorMode.barcodeIntent', { default:'', placeholder:'scan work order / batch / pallet' }),
      field('attentionStyle', 'Attention style', 'Attention style', 'select', 'config.operatorMode.attentionStyle', {
        default:'calm',
        options:['calm','assertive','critical']
      })
    ]);

    SCHEMA[type] = tabs;
  });

  var ROUND4_TEMPLATES = {
    'tpl-r4-story-hero': {
      type:'insight-scorecard',
      title:{ vi:'Story Hero', en:'Story Hero' },
      description:'Narrative-first hero tile for executive, quality and industrial control surfaces.',
      module:'experience',
      config:{
        title:'Story Hero',
        caption:'Lead operators and leaders from awareness to action in one glance.',
        items:[
          { label:'Audience', value:'Cross-functional', tone:'neutral' },
          { label:'Mode', value:'Control plane', tone:'info' },
          { label:'Next move', value:'Review / Decide / Act', tone:'success' }
        ],
        design:{ caption:'Use this hero to frame the module mission, next move and control context.' },
        story:{ sceneRole:'entry', sceneTitle:'Enter with context', sceneNarrative:'Set intent, confidence and next action in one block.', callToAction:'Review the command surface now', heroBadge:'CONTROL' }
      }
    },
    'tpl-r4-control-tower-kpi': {
      type:'kpi-row',
      title:{ vi:'Control Tower KPIs', en:'Control Tower KPIs' },
      description:'Boardroom KPI stack for top-level orchestration.',
      module:'executive',
      config:{
        dataSource:{ api:'executive_control_tower', method:'GET', dataKey:'kpis' },
        items:[
          { label:{ vi:'Doanh thu rủi ro', en:'Revenue at risk' }, dataSource:{ api:'executive_control_tower', field:'revenue_at_risk' }, color:'var(--red)', prefix:'$' },
          { label:{ vi:'Lệnh trễ', en:'Delayed work orders' }, dataSource:{ api:'executive_control_tower', field:'delayed_work_orders' }, color:'var(--amber)' },
          { label:{ vi:'CAPA mở', en:'Open CAPA' }, dataSource:{ api:'executive_control_tower', field:'open_capa' }, color:'var(--brand-2)' },
          { label:{ vi:'OTD', en:'OTD' }, dataSource:{ api:'executive_control_tower', field:'otd_pct' }, color:'var(--green)', suffix:'%' }
        ],
        design:{ caption:'Escalate revenue, delivery and quality risk from one executive strip.' },
        story:{ sceneRole:'observe', sceneTitle:'See the plant pulse', sceneNarrative:'Track risk, delivery and quality pulse before drilling into details.', heroBadge:'LIVE KPI' },
        observability:{ signalClass:'critical', refreshCadenceSec:60, alertChannel:'executive.board' }
      }
    },
    'tpl-r4-war-room-readiness': {
      type:'data-cards',
      title:{ vi:'Readiness Board', en:'Readiness Board' },
      description:'Status wall for containment, CAPA, signoff and closure readiness.',
      module:'quality',
      config:{
        dataSource:{ api:'quality_readiness_board', method:'GET', dataKey:'items' },
        columns:2,
        titleKey:'title',
        subtitleKey:'owner',
        badgeKey:'status',
        design:{ caption:'Use this board to surface red readiness gaps and unblock signoff.' },
        story:{ sceneRole:'analyze', sceneTitle:'See readiness at a glance', sceneNarrative:'Focus on containment, evidence and closure readiness before release.', heroBadge:'READY?' },
        observability:{ signalClass:'warning', refreshCadenceSec:45, alertChannel:'quality.war-room' }
      }
    },
    'tpl-r4-command-lane': {
      type:'action-toolbar',
      title:{ vi:'Command Lane', en:'Command Lane' },
      description:'High-clarity action lane for escalation, approval and workflow control.',
      module:'operations',
      config:{
        actions:[
          { key:'refresh', label:{ vi:'Làm mới', en:'Refresh' }, style:'ghost' },
          { key:'escalate', label:{ vi:'Escalate', en:'Escalate' }, style:'danger' },
          { key:'assign', label:{ vi:'Giao việc', en:'Assign' }, style:'primary' },
          { key:'approve', label:{ vi:'Duyệt', en:'Approve' }, style:'success' }
        ],
        design:{ caption:'Put the most critical next actions in one operator-safe command lane.' },
        story:{ sceneRole:'act', sceneTitle:'Act without hunting for buttons', sceneNarrative:'Shorten time-to-action with a focused high-clarity toolbar.', callToAction:'Escalate or approve now', heroBadge:'ACTION' },
        accessibility:{ ariaLabel:'Command lane for high priority workflow actions', touchTarget:'xl' },
        collaboration:{ reviewMode:'mandatory', evidenceRequired:true }
      }
    },
    'tpl-r4-live-signal-wall': {
      type:'mfg-machine-status',
      title:{ vi:'Live Signal Wall', en:'Live Signal Wall' },
      description:'Realtime signal wall for machine, line or workflow pulse.',
      module:'production',
      config:{
        dataSource:{ api:'live_signal_wall', method:'GET', dataKey:'machines' },
        titleKey:'machine_name',
        statusKey:'status',
        metrics:[
          { key:'oee', label:{ vi:'OEE', en:'OEE' } },
          { key:'downtime_min', label:{ vi:'Downtime', en:'Downtime' } }
        ],
        design:{ caption:'Show green/yellow/red pulse for lines, cells or machines with zero scroll.' },
        story:{ sceneRole:'observe', sceneTitle:'Watch live signals', sceneNarrative:'Use the wallboard to detect loss, downtime and escalation conditions immediately.', heroBadge:'LIVE' },
        observability:{ signalClass:'critical', refreshCadenceSec:15, alertChannel:'andon.wall' },
        operatorMode:{ mode:'wallboard', attentionStyle:'critical' }
      }
    },
    'tpl-r4-evidence-stage': {
      type:'audit-log',
      title:{ vi:'Evidence Stage', en:'Evidence Stage' },
      description:'Evidence and chain-of-custody stream for audits and investigations.',
      module:'evidence',
      config:{
        dataSource:{ api:'evidence_stage', method:'GET', dataKey:'events' },
        dateKey:'created_at',
        actorKey:'actor',
        actionKey:'action',
        detailKey:'detail',
        design:{ caption:'Tell the evidence story with time, actor, action and proof context.' },
        story:{ sceneRole:'prove', sceneTitle:'Prove with evidence', sceneNarrative:'Track chain of custody, approvals and integrity events in one timeline.', heroBadge:'EVIDENCE' },
        collaboration:{ evidenceRequired:true, reviewMode:'esign', esignRole:'qa_manager' },
        observability:{ signalClass:'evidence', refreshCadenceSec:120, alertChannel:'audit.evidence' }
      }
    },
    'tpl-r4-review-matrix': {
      type:'matrix-grid',
      title:{ vi:'Review Matrix', en:'Review Matrix' },
      description:'Cross-check matrix for signoff, residual risk and evidence completeness.',
      module:'governance',
      config:{
        rows:['Containment','Root cause','CAPA','Validation','Release'],
        columns:['Owner','Reviewer','Evidence','Residual risk','Status'],
        design:{ caption:'Use a matrix when signoff and evidence need to be crystal clear.' },
        story:{ sceneRole:'review', sceneTitle:'Review with structure', sceneNarrative:'Expose signoff gaps and evidence status without opening multiple views.', heroBadge:'4-EYES' },
        collaboration:{ reviewMode:'four-eyes', evidenceRequired:true, commentPrompt:'Describe remaining risk before release.' }
      }
    },
    'tpl-r4-handoff-board': {
      type:'data-kanban',
      title:{ vi:'Handoff Board', en:'Handoff Board' },
      description:'Kanban lane for handoff between functions and shifts.',
      module:'handoff',
      config:{
        dataSource:{ api:'handoff_board', method:'GET', dataKey:'items' },
        columnKey:'lane',
        columns:['incoming','doing','review','ready','done'],
        design:{ caption:'Coordinate handoff across roles, shifts and exception queues.' },
        story:{ sceneRole:'handoff', sceneTitle:'Handover without losing context', sceneNarrative:'Surface ownership, readiness and blockers in one handoff board.', heroBadge:'HANDOFF' },
        collaboration:{ reviewMode:'mandatory', handoverQueue:'handoff.board', commentPrompt:'Confirm what changed and what still blocks completion.' }
      }
    },
    'tpl-r4-warehouse-wave': {
      type:'data-table',
      title:{ vi:'Warehouse Wave', en:'Warehouse Wave' },
      description:'Wave release and handheld-friendly execution grid.',
      module:'warehouse',
      config:{
        dataSource:{ api:'warehouse_wave_execution', method:'GET', dataKey:'items' },
        columns:[
          { key:'wave_id', label:{ vi:'Wave', en:'Wave' }, type:'text' },
          { key:'priority', label:{ vi:'Ưu tiên', en:'Priority' }, type:'badge' },
          { key:'zone', label:{ vi:'Zone', en:'Zone' }, type:'text' },
          { key:'status', label:{ vi:'Trạng thái', en:'Status' }, type:'badge' },
          { key:'owner', label:{ vi:'Người xử lý', en:'Owner' }, type:'text' }
        ],
        pagination:true,
        pageSize:10,
        design:{ caption:'Release and monitor warehouse waves in a handheld-friendly table.' },
        story:{ sceneRole:'act', sceneTitle:'Release and execute waves', sceneNarrative:'Keep wave execution, priority and readiness visible for handheld operators.', heroBadge:'WAVE' },
        operatorMode:{ mode:'handheld', barcodeIntent:'scan pallet / tote / task', touchTarget:'xl' },
        observability:{ signalClass:'command', refreshCadenceSec:20, alertChannel:'warehouse.wave' }
      }
    },
    'tpl-r4-release-pulse': {
      type:'data-timeline',
      title:{ vi:'Release Pulse', en:'Release Pulse' },
      description:'Release timeline for rollout, signoff and rollback visibility.',
      module:'release',
      config:{
        dataSource:{ api:'release_pulse', method:'GET', dataKey:'events' },
        dateKey:'event_at',
        titleKey:'title',
        descKey:'detail',
        design:{ caption:'Make release state, approvals and rollback cues visible on one line.' },
        story:{ sceneRole:'review', sceneTitle:'Control the release pulse', sceneNarrative:'Show signoff, rollout, rollback and evidence milestones in one timeline.', heroBadge:'RELEASE' },
        collaboration:{ reviewMode:'esign', evidenceRequired:true, esignRole:'release_manager' },
        observability:{ signalClass:'release', refreshCadenceSec:300, alertChannel:'release.control' }
      }
    },
    'tpl-r4-machine-signal': {
      type:'mfg-machine-status',
      title:{ vi:'Machine Signal', en:'Machine Signal' },
      description:'Machine and asset pulse for maintenance response.',
      module:'maintenance',
      config:{
        dataSource:{ api:'maintenance_signal_wall', method:'GET', dataKey:'assets' },
        titleKey:'asset_name',
        statusKey:'status',
        metrics:[
          { key:'mttr', label:{ vi:'MTTR', en:'MTTR' } },
          { key:'overdue_pm', label:{ vi:'PM trễ', en:'Overdue PM' } }
        ],
        design:{ caption:'Expose maintenance risk and response urgency without leaving the command view.' },
        story:{ sceneRole:'observe', sceneTitle:'Spot assets at risk', sceneNarrative:'Use the signal board to detect overdue PM and failure escalation conditions.', heroBadge:'ASSET' },
        observability:{ signalClass:'warning', refreshCadenceSec:30, alertChannel:'maintenance.ops' }
      }
    },
    'tpl-r4-maintenance-response': {
      type:'data-table',
      title:{ vi:'Maintenance Response', en:'Maintenance Response' },
      description:'Response queue for maintenance action and escalation.',
      module:'maintenance',
      config:{
        dataSource:{ api:'maintenance_response_queue', method:'GET', dataKey:'items' },
        columns:[
          { key:'ticket_no', label:{ vi:'Phiếu', en:'Ticket' }, type:'text' },
          { key:'asset', label:{ vi:'Thiết bị', en:'Asset' }, type:'text' },
          { key:'severity', label:{ vi:'Mức độ', en:'Severity' }, type:'badge' },
          { key:'owner', label:{ vi:'Owner', en:'Owner' }, type:'text' },
          { key:'status', label:{ vi:'Trạng thái', en:'Status' }, type:'badge' }
        ],
        pagination:true,
        pageSize:12,
        design:{ caption:'Prioritize response by severity, owner and asset criticality.' },
        story:{ sceneRole:'act', sceneTitle:'Respond and close fast', sceneNarrative:'Put the response queue next to the live asset wall for faster closeout.', heroBadge:'RESPONSE' },
        collaboration:{ reviewMode:'mandatory', handoverQueue:'maintenance.response' },
        observability:{ signalClass:'command', refreshCadenceSec:30, alertChannel:'maintenance.response' }
      }
    }
  };

  Object.keys(ROUND4_TEMPLATES).forEach(function(key){
    TEMPLATES[key] = ROUND4_TEMPLATES[key];
  });

  BE.BLOCK_TEMPLATES = TEMPLATES;
  BE.BLOCK_PROPERTIES_SCHEMA = SCHEMA;
  BE.ROUND4_TEMPLATES = ROUND4_TEMPLATES;
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r4';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-07-r4';

  /* ─── 11. MODULE BUILDER COSMOS PATCH (2026-04-07 R5) ──────────────────── */
  Object.keys(SCHEMA).forEach(function(type){
    var tabs = SCHEMA[type] || [];
    var dataTab = ensureTab(tabs, 'data', 'Dữ liệu', 'Data', '🗄️');
    var styleTab = ensureTab(tabs, 'style', 'Giao diện', 'Style', '🎨');
    var eventsTab = ensureTab(tabs, 'events', 'Sự kiện', 'Events', '⚡');

    var flowGraph = ensureSection(dataTab, 'flowGraph', 'Flow graph & canvas', 'Flow graph & canvas');
    var motionSystem = ensureSection(styleTab, 'motionSystem', 'Motion & stagecraft', 'Motion & stagecraft');
    var releaseGov = ensureSection(eventsTab, 'governanceRelease', 'Release governance', 'Release governance');

    append(flowGraph, [
      field('nodeRole', 'Vai trò node', 'Node role', 'select', 'config.flowGraph.nodeRole', {
        default:'step',
        options:['entry','step','decision','service','handoff','approval','evidence','release']
      }),
      field('swimlane', 'Swimlane', 'Swimlane', 'text', 'config.flowGraph.swimlane', { default:'', placeholder:'intake / review / execute / release' }),
      field('edgeTo', 'Edge tới', 'Edge to', 'text', 'config.flowGraph.edgeTo', { default:'', placeholder:'review.stage / release.orbit / api.service' }),
      field('serviceRef', 'Service ref', 'Service ref', 'text', 'config.flowGraph.serviceRef', { default:'', placeholder:'quality.ncr / release.package / scada.machine' }),
      field('evidenceSignal', 'Tín hiệu bằng chứng', 'Evidence signal', 'text', 'config.flowGraph.evidenceSignal', { default:'', placeholder:'approval.signoff / evidence.chain' })
    ]);

    append(motionSystem, [
      field('preset', 'Motion preset', 'Motion preset', 'select', 'config.motion.preset', {
        default:'subtle',
        options:['none','subtle','guided','cinematic','focus-pulse']
      }),
      field('speed', 'Tốc độ chuyển động', 'Motion speed', 'select', 'config.motion.speed', {
        default:'normal',
        options:['slow','normal','fast','expressive']
      }),
      field('depth', 'Chiều sâu sân khấu', 'Stage depth', 'select', 'config.motion.depth', {
        default:'medium',
        options:['flat','medium','deep']
      }),
      field('emphasis', 'Trọng tâm motion', 'Motion emphasis', 'select', 'config.motion.emphasis', {
        default:'focus',
        options:['focus','signal','guidance','celebration']
      }),
      field('reducedSafe', 'An toàn reduced motion', 'Reduced-motion safe', 'toggle', 'config.motion.reducedSafe', { default:true })
    ]);

    append(releaseGov, [
      field('releaseStage', 'Giai đoạn release', 'Release stage', 'select', 'config.governance.releaseStage', {
        default:'draft',
        options:['draft','review','signoff','ready','released','rollback']
      }),
      field('approvalRole', 'Vai trò duyệt', 'Approval role', 'text', 'config.governance.approvalRole', { default:'', placeholder:'release_manager / qa_manager' }),
      field('versionTag', 'Version tag', 'Version tag', 'text', 'config.governance.versionTag', { default:'', placeholder:'1.4.0 / rel-2026.04' }),
      field('changeWindow', 'Change window', 'Change window', 'text', 'config.governance.changeWindow', { default:'', placeholder:'Thu 22:00-23:00 ICT' }),
      field('rollbackCue', 'Cue rollback', 'Rollback cue', 'text', 'config.governance.rollbackCue', { default:'', placeholder:'Revert feature flag and restore prior stable package' })
    ]);

    SCHEMA[type] = tabs;
  });

  var ROUND5_TEMPLATES = {
    'tpl-r5-release-orbit': {
      type:'insight-scorecard',
      title:{ vi:'Release Orbit', en:'Release Orbit' },
      description:'Hero board for semantic version, release train and control-gate awareness.',
      module:'release',
      config:{
        title:'Release Orbit',
        caption:'Version, train, signoff and rollback confidence in one control surface.',
        items:[
          { label:'Version', value:'1.0.0', tone:'info' },
          { label:'Train', value:'core-main', tone:'neutral' },
          { label:'Channel', value:'enterprise', tone:'success' },
          { label:'Rollback', value:'Ready', tone:'success' }
        ],
        design:{ caption:'Use this hero to anchor semantic version, train, signoff and rollback confidence.' },
        story:{ sceneRole:'review', sceneTitle:'Review release orbit', sceneNarrative:'Give leaders and release owners a clear orbital view of version, gates and package confidence.', callToAction:'Review gates before rollout', heroBadge:'RELEASE' },
        observability:{ signalClass:'release', refreshCadenceSec:180, alertChannel:'release.orbit' },
        governance:{ releaseStage:'review', approvalRole:'release_manager', versionTag:'1.0.0' }
      }
    },
    'tpl-r5-flow-canvas': {
      type:'data-tree',
      title:{ vi:'Flow Canvas', en:'Flow Canvas' },
      description:'Directed story-lane flow for handoff, service hops and release path.',
      module:'orchestration',
      config:{
        dataSource:{ api:'module_flow_canvas', method:'GET', dataKey:'nodes' },
        dataKey:'nodes',
        childrenKey:'children',
        titleField:'title',
        subtitleField:'owner',
        design:{ caption:'Render orchestration, handoff and release hops in a visual story lane.' },
        story:{ sceneRole:'analyze', sceneTitle:'See the directed flow', sceneNarrative:'Make handoff, service calls and release path visible before people act.', heroBadge:'FLOW' },
        flowGraph:{ nodeRole:'step', swimlane:'review', edgeTo:'release.orbit', serviceRef:'module.flow' },
        observability:{ signalClass:'command', refreshCadenceSec:60, alertChannel:'flow.canvas' }
      }
    },
    'tpl-r5-governance-gate': {
      type:'matrix-grid',
      title:{ vi:'Governance Gate Matrix', en:'Governance Gate Matrix' },
      description:'Cross-check matrix for semver, signoff, rollback and release train readiness.',
      module:'governance',
      config:{
        rows:['Semver','Smoke','Signoff','Rollback','Package'],
        columns:['Owner','Evidence','Gate','Status','Next move'],
        design:{ caption:'Keep release gates and proof visible without opening separate screens.' },
        story:{ sceneRole:'review', sceneTitle:'Prove release readiness', sceneNarrative:'Use a matrix when you need to show version, signoff, rollback and package proof side by side.', heroBadge:'GATE' },
        collaboration:{ reviewMode:'esign', evidenceRequired:true, esignRole:'release_manager' },
        governance:{ releaseStage:'signoff', approvalRole:'release_manager', versionTag:'1.0.0' }
      }
    },
    'tpl-r5-package-shelf': {
      type:'data-cards',
      title:{ vi:'Package Shelf', en:'Package Shelf' },
      description:'Module package shelf with tiers, compatibility and rollout intent.',
      module:'platform',
      config:{
        dataSource:{ api:'module_package_shelf', method:'GET', dataKey:'packages' },
        columns:3,
        titleKey:'package_name',
        subtitleKey:'tier',
        badgeKey:'share_mode',
        design:{ caption:'Present package catalog, compatibility and rollout intent as a clean gallery.' },
        story:{ sceneRole:'observe', sceneTitle:'See package fit', sceneNarrative:'Expose package tier, compatibility and rollout intent before teams adopt the module.', heroBadge:'PACKAGE' },
        flowGraph:{ nodeRole:'service', swimlane:'package', serviceRef:'release.package' }
      }
    },
    'tpl-r5-journey-filmstrip': {
      type:'data-timeline',
      title:{ vi:'Journey Filmstrip', en:'Journey Filmstrip' },
      description:'Step-by-step user journey and operator walkthrough filmstrip.',
      module:'experience',
      config:{
        dataSource:{ api:'module_journey_filmstrip', method:'GET', dataKey:'steps' },
        dateKey:'sequence',
        titleKey:'title',
        descKey:'detail',
        statusKey:'status',
        design:{ caption:'Explain the ideal task path with a filmstrip instead of a dense SOP.' },
        story:{ sceneRole:'handoff', sceneTitle:'Walk the user journey', sceneNarrative:'Use a filmstrip to align operator, reviewer and release owner on the happy path.', heroBadge:'JOURNEY' },
        flowGraph:{ nodeRole:'handoff', swimlane:'journey', edgeTo:'package.shelf', evidenceSignal:'journey.confirmed' }
      }
    },
    'tpl-r5-command-pulse': {
      type:'action-toolbar',
      title:{ vi:'Command Pulse', en:'Command Pulse' },
      description:'Focused toolbar for bump version, export package, approve and rollback.',
      module:'release',
      config:{
        actions:[
          { key:'bump_patch', label:{ vi:'Bump patch', en:'Bump patch' }, style:'primary' },
          { key:'export_package', label:{ vi:'Xuất package', en:'Export package' }, style:'success' },
          { key:'approve_release', label:{ vi:'Duyệt release', en:'Approve release' }, style:'primary' },
          { key:'rollback_ready', label:{ vi:'Rollback ready', en:'Rollback ready' }, style:'ghost' }
        ],
        design:{ caption:'Keep release owner actions together in a high-clarity command pulse.' },
        story:{ sceneRole:'act', sceneTitle:'Act on release with confidence', sceneNarrative:'Bring versioning, export, approval and rollback controls into one pulse lane.', callToAction:'Bump version or export package now', heroBadge:'PULSE' },
        accessibility:{ ariaLabel:'Release command pulse for versioning and package actions', touchTarget:'xl' },
        governance:{ releaseStage:'ready', approvalRole:'release_manager', versionTag:'1.0.0' }
      }
    }
  };

  Object.keys(ROUND5_TEMPLATES).forEach(function(key){
    TEMPLATES[key] = ROUND5_TEMPLATES[key];
  });

  BE.ROUND5_TEMPLATES = ROUND5_TEMPLATES;
  BE.BLOCK_TEMPLATES = TEMPLATES;
  BE.BLOCK_PROPERTIES_SCHEMA = SCHEMA;
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r5';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-07-r5';

})();


/* ─── 12. MODULE BUILDER SUPREME SCHEMA + TEMPLATE PATCH (2026-04-07 R5) ── */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_SUPREME_SCHEMA_VERSION === '2026-04-07-r5') return;
  var BE = window.HmBlockEngine;
  var SCHEMA = BE.BLOCK_PROPERTIES_SCHEMA || {};
  var TEMPLATES = BE.BLOCK_TEMPLATES || {};

  function ensureTab(tabs, key, label, labelEn, icon){
    var found = null;
    (tabs || []).forEach(function(tab){ if(tab && tab.key === key) found = tab; });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, icon:icon || '', sections:[] };
    tabs.push(found);
    return found;
  }

  function ensureSection(tab, key, label, labelEn){
    var found = null;
    if(!tab.sections) tab.sections = [];
    (tab.sections || []).forEach(function(section){ if(section && section.key === key) found = section; });
    if(found) return found;
    found = { key:key, label:label, labelEn:labelEn || label, fields:[] };
    tab.sections.push(found);
    return found;
  }

  function field(key, label, labelEn, type, path, extra){
    var out = { key:key, label:label, labelEn:labelEn || label, type:type, path:path };
    Object.keys(extra || {}).forEach(function(name){ out[name] = extra[name]; });
    return out;
  }

  function ensureField(section, def){
    var exists = false;
    if(!section.fields) section.fields = [];
    (section.fields || []).forEach(function(item){
      if(item && ((def.path && item.path === def.path) || (def.key && item.key === def.key))) exists = true;
    });
    if(!exists) section.fields.push(def);
  }

  function append(section, defs){
    (defs || []).forEach(function(def){ ensureField(section, def); });
  }

  Object.keys(SCHEMA).forEach(function(type){
    var tabs = SCHEMA[type] || [];
    var dataTab = ensureTab(tabs, 'data', 'Dữ liệu', 'Data', '🗄️');
    var styleTab = ensureTab(tabs, 'style', 'Giao diện', 'Style', '🎨');
    var eventsTab = ensureTab(tabs, 'events', 'Sự kiện', 'Events', '⚡');

    var workflowStudio = ensureSection(dataTab, 'workflowStudio', 'Workflow studio', 'Workflow studio');
    var motionSystem = ensureSection(styleTab, 'motionSystem', 'Motion system', 'Motion system');
    var publishOps = ensureSection(eventsTab, 'publishOps', 'Publish control', 'Publish control');
    var packageOps = ensureSection(eventsTab, 'packageOps', 'Package & version', 'Package & version');
    var aiCopilot = ensureSection(eventsTab, 'aiCopilot', 'AI copilot', 'AI copilot');

    append(workflowStudio, [
      field('mode', 'Workflow mode', 'Workflow mode', 'select', 'config.workflowStudio.mode', { default:'observe', options:['observe','queue','kanban','constellation','timeline','storyboard'] }),
      field('laneKey', 'Lane key', 'Lane key', 'text', 'config.workflowStudio.laneKey', { default:'', placeholder:'stage / owner / line / shift' }),
      field('decisionKey', 'Decision key', 'Decision key', 'text', 'config.workflowStudio.decisionKey', { default:'', placeholder:'decision / risk / disposition' }),
      field('handoffKey', 'Handoff key', 'Handoff key', 'text', 'config.workflowStudio.handoffKey', { default:'', placeholder:'next_owner / next_station' }),
      field('serviceAlias', 'Service alias', 'Service alias', 'text', 'config.workflowStudio.serviceAlias', { default:'', placeholder:'quality.ncr.review / warehouse.wave' }),
      field('constellationGroup', 'Constellation group', 'Constellation group', 'text', 'config.workflowStudio.constellationGroup', { default:'', placeholder:'control / evidence / action / publish' }),
      field('slaMinutes', 'SLA (minutes)', 'SLA (minutes)', 'number', 'config.workflowStudio.slaMinutes', { default:0, min:0, step:5 })
    ]);

    append(motionSystem, [
      field('preset', 'Motion preset', 'Motion preset', 'select', 'config.motionSystem.preset', { default:'subtle', options:['none','subtle','guided','cinematic','kinetic-glass','precision-flow','night-ops','handheld-fast'] }),
      field('tempo', 'Motion tempo', 'Motion tempo', 'select', 'config.motionSystem.tempo', { default:'balanced', options:['calm','balanced','fast'] }),
      field('entryFx', 'Entry effect', 'Entry effect', 'select', 'config.motionSystem.entryFx', { default:'fade', options:['fade','slide-up','zoom-soft','signal-rise','none'] }),
      field('hoverFx', 'Hover effect', 'Hover effect', 'select', 'config.motionSystem.hoverFx', { default:'lift', options:['lift','outline','glow','tilt-soft','none'] }),
      field('alertFx', 'Alert effect', 'Alert effect', 'select', 'config.motionSystem.alertFx', { default:'pulse', options:['pulse','signal-ring','shake-soft','flash-soft','none'] }),
      field('depthMode', 'Depth mode', 'Depth mode', 'select', 'config.motionSystem.depthMode', { default:'layered', options:['flat','layered','immersive'] }),
      field('glowLevel', 'Glow level', 'Glow level', 'select', 'config.motionSystem.glowLevel', { default:'soft', options:['none','soft','medium','high'] }),
      field('reduceMotionRespect', 'Respect reduced motion', 'Respect reduced motion', 'toggle', 'config.motionSystem.reduceMotionRespect', { default:true })
    ]);

    append(publishOps, [
      field('versionTag', 'Version tag', 'Version tag', 'text', 'config.publishOps.versionTag', { default:'', placeholder:'1.0.0 / 0.9.0-beta.2' }),
      field('releaseStrategy', 'Release strategy', 'Release strategy', 'select', 'config.publishOps.releaseStrategy', { default:'manual', options:['manual','canary','ring','wave','big-bang'] }),
      field('gatePolicy', 'Gate policy', 'Gate policy', 'select', 'config.publishOps.gatePolicy', { default:'standard', options:['light','standard','strict','gxp'] }),
      field('approvalBoard', 'Approval board', 'Approval board', 'text', 'config.publishOps.approvalBoard', { default:'', placeholder:'qa_board / release_board / plant_review' }),
      field('rollbackOwner', 'Rollback owner', 'Rollback owner', 'text', 'config.publishOps.rollbackOwner', { default:'', placeholder:'it_admin / quality_manager' }),
      field('releaseWindow', 'Release window', 'Release window', 'text', 'config.publishOps.releaseWindow', { default:'', placeholder:'Fri 19:00-21:00 / shift handover' }),
      field('channel', 'Release channel', 'Release channel', 'text', 'config.publishOps.channel', { default:'', placeholder:'pilot / plant / enterprise / internal' })
    ]);

    append(packageOps, [
      field('packageId', 'Package ID', 'Package ID', 'text', 'config.packageOps.packageId', { default:'', placeholder:'hesem.quality.war-room' }),
      field('packageVersion', 'Package version', 'Package version', 'text', 'config.packageOps.packageVersion', { default:'', placeholder:'1.0.0' }),
      field('packageVisibility', 'Visibility', 'Visibility', 'select', 'config.packageOps.packageVisibility', { default:'private', options:['private','team','enterprise','marketplace'] }),
      field('compatibility', 'Compatibility', 'Compatibility', 'text', 'config.packageOps.compatibility', { default:'', placeholder:'erp,mes,qms,eqms' }),
      field('dependencies', 'Dependencies', 'Dependencies', 'text', 'config.packageOps.dependencies', { default:'', placeholder:'ncr,capa,audit,evidence' }),
      field('releaseTrack', 'Release track', 'Release track', 'select', 'config.packageOps.releaseTrack', { default:'pilot', options:['experimental','pilot','stable','lts'] })
    ]);

    append(aiCopilot, [
      field('goal', 'AI goal', 'AI goal', 'text', 'config.ai.goal', { default:'', placeholder:'Make the workflow clearer and more governable' }),
      field('persona', 'AI persona', 'AI persona', 'select', 'config.ai.persona', { default:'cross-functional', options:['cross-functional','executive','quality','operator','auditor','planner','warehouse','maintenance'] }),
      field('suggestionMode', 'Suggestion mode', 'Suggestion mode', 'select', 'config.ai.suggestionMode', { default:'guided', options:['guided','aggressive','conservative'] }),
      field('guardrails', 'Guardrails', 'Guardrails', 'textarea', 'config.ai.guardrails', { default:'', rows:3 }),
      field('promptSeed', 'Prompt seed', 'Prompt seed', 'textarea', 'config.ai.promptSeed', { default:'', rows:5 })
    ]);

    SCHEMA[type] = tabs;
  });

  var ROUND5_SUPREME_TEMPLATES = {
    'tpl-r5-orchestration-board': {
      type:'data-kanban',
      title:{ vi:'Orchestration Board', en:'Orchestration Board' },
      description:'Cross-functional workflow board for detection, action and verification.',
      module:'operations',
      config:{
        dataSource:{ api:'orchestration_board', method:'GET', dataKey:'items' },
        columnKey:'lane',
        columns:['signal','triage','action','verify','ready'],
        design:{ caption:'Make ownership, lane flow and bottlenecks visible in one orchestration board.' },
        story:{ sceneRole:'act', sceneTitle:'Orchestrate actions across roles', sceneNarrative:'Show what needs triage, who owns it and what is ready for verification.', heroBadge:'FLOW' },
        workflowStudio:{ mode:'kanban', laneKey:'lane', decisionKey:'risk_level', handoffKey:'next_owner', constellationGroup:'action', slaMinutes:120 },
        collaboration:{ reviewMode:'mandatory', handoverQueue:'orchestration.board' },
        observability:{ signalClass:'command', refreshCadenceSec:30, alertChannel:'ops.orchestrator' },
        motionSystem:{ preset:'precision-flow', tempo:'balanced', entryFx:'slide-up', hoverFx:'lift', alertFx:'signal-ring', depthMode:'layered', glowLevel:'soft', reduceMotionRespect:true },
        publishOps:{ versionTag:'0.9.0-beta', releaseStrategy:'wave', gatePolicy:'standard', approvalBoard:'ops_review', rollbackOwner:'ops_admin', channel:'plant' },
        packageOps:{ packageId:'hesem.ops.orchestration-board', packageVersion:'0.9.0-beta', packageVisibility:'team', releaseTrack:'pilot' },
        ai:{ goal:'Clarify handoffs and reduce stalled items', persona:'cross-functional', suggestionMode:'guided' }
      }
    },
    'tpl-r5-governance-gate-plus': {
      type:'matrix-grid',
      title:{ vi:'Governance Gate+', en:'Governance Gate+' },
      description:'Gate matrix for release, quality and signoff readiness.',
      module:'governance',
      config:{
        rows:['Scope freeze','Evidence ready','Smoke pass','Signoff complete','Rollback verified'],
        columns:['Owner','Board','Evidence','Risk','Status'],
        design:{ caption:'Expose gate state, owner and remaining risk without opening separate checklists.' },
        story:{ sceneRole:'review', sceneTitle:'Gate the release with confidence', sceneNarrative:'Use one structured matrix to see what still blocks the release decision.', heroBadge:'GATE' },
        collaboration:{ reviewMode:'four-eyes', evidenceRequired:true, esignRole:'release_manager' },
        workflowStudio:{ mode:'storyboard', constellationGroup:'publish', slaMinutes:240 },
        publishOps:{ versionTag:'1.0.0', releaseStrategy:'ring', gatePolicy:'strict', approvalBoard:'release_board', rollbackOwner:'it_admin', channel:'enterprise' },
        packageOps:{ packageId:'hesem.release.governance-gate', packageVersion:'1.0.0', packageVisibility:'enterprise', releaseTrack:'stable' },
        ai:{ goal:'Tighten release governance and signoff clarity', persona:'executive', suggestionMode:'conservative' }
      }
    },
    'tpl-r5-version-trace-plus': {
      type:'data-timeline',
      title:{ vi:'Version Trace+', en:'Version Trace+' },
      description:'Version, rollout and rollback trace for controlled deployments.',
      module:'release',
      config:{
        dataSource:{ api:'version_trace', method:'GET', dataKey:'events' },
        dateKey:'event_at',
        titleKey:'title',
        descKey:'detail',
        design:{ caption:'Trace who approved, deployed, rolled back and verified each release wave.' },
        story:{ sceneRole:'prove', sceneTitle:'Trace every rollout step', sceneNarrative:'Keep approval, deployment and rollback history visible in one evidence line.', heroBadge:'TRACE' },
        observability:{ signalClass:'release', refreshCadenceSec:300, alertChannel:'release.trace' },
        workflowStudio:{ mode:'timeline', constellationGroup:'publish', serviceAlias:'release.trace', slaMinutes:180 },
        publishOps:{ versionTag:'1.0.0', releaseStrategy:'ring', gatePolicy:'strict', approvalBoard:'release_board', rollbackOwner:'platform_lead', channel:'enterprise' },
        packageOps:{ packageId:'hesem.release.version-trace', packageVersion:'1.0.0', packageVisibility:'enterprise', releaseTrack:'stable' },
        ai:{ goal:'Summarize release history with audit context', persona:'auditor', suggestionMode:'guided' }
      }
    },
    'tpl-r5-package-spotlight': {
      type:'insight-scorecard',
      title:{ vi:'Package Spotlight', en:'Package Spotlight' },
      description:'Package identity, version and compatibility at a glance.',
      module:'platform',
      config:{
        title:'Package Spotlight',
        caption:'Show package identity, release track and compatibility on one premium card.',
        items:[
          { label:'Package', value:'hesem.module.supreme', tone:'info' },
          { label:'Version', value:'1.0.0', tone:'success' },
          { label:'Track', value:'stable', tone:'neutral' },
          { label:'Visibility', value:'enterprise', tone:'warning' }
        ],
        design:{ caption:'Make package ID, version, visibility and track impossible to miss.' },
        story:{ sceneRole:'entry', sceneTitle:'Enter with package clarity', sceneNarrative:'Lead with package identity before discussing release or governance.', heroBadge:'PACKAGE' },
        workflowStudio:{ mode:'observe', constellationGroup:'publish' },
        motionSystem:{ preset:'kinetic-glass', tempo:'calm', entryFx:'fade', hoverFx:'glow', alertFx:'none', depthMode:'layered', glowLevel:'soft', reduceMotionRespect:true },
        packageOps:{ packageId:'hesem.platform.package-spotlight', packageVersion:'1.0.0', packageVisibility:'enterprise', compatibility:'erp,mes,qms,eqms', dependencies:'identity,notification,audit', releaseTrack:'stable' },
        ai:{ goal:'Summarize package identity for humans and AI', persona:'cross-functional', suggestionMode:'guided' }
      }
    },
    'tpl-r5-operator-coach': {
      type:'action-toolbar',
      title:{ vi:'Operator Coach', en:'Operator Coach' },
      description:'Guided operator command strip with safe confirmations.',
      module:'operator',
      config:{
        actions:[
          { key:'scan', label:{ vi:'Scan', en:'Scan' }, style:'primary' },
          { key:'ack', label:{ vi:'Xác nhận', en:'Acknowledge' }, style:'success' },
          { key:'hold', label:{ vi:'Hold', en:'Hold' }, style:'warning' },
          { key:'escalate', label:{ vi:'Escalate', en:'Escalate' }, style:'danger' }
        ],
        design:{ caption:'Create a clean operator-safe command strip with next actions and confirmations.' },
        story:{ sceneRole:'act', sceneTitle:'Coach the next safe action', sceneNarrative:'Guide the operator toward the right next move with strong confirm patterns.', heroBadge:'COACH' },
        operatorMode:{ mode:'handheld', confirmationStyle:'double-confirm', touchTarget:'xl', attentionStyle:'assertive', barcodeIntent:'scan task / pallet / machine' },
        accessibility:{ ariaLabel:'Operator coach action strip', touchTarget:'xl', highContrast:true },
        workflowStudio:{ mode:'queue', constellationGroup:'action', slaMinutes:30 },
        motionSystem:{ preset:'handheld-fast', tempo:'fast', entryFx:'slide-up', hoverFx:'outline', alertFx:'signal-ring', depthMode:'flat', glowLevel:'medium', reduceMotionRespect:true },
        ai:{ goal:'Reduce hesitation and error at point of action', persona:'operator', suggestionMode:'aggressive' }
      }
    },
    'tpl-r5-process-radar': {
      type:'kpi-row',
      title:{ vi:'Process Radar', en:'Process Radar' },
      description:'Multi-domain process radar for flow, risk and handoff health.',
      module:'executive',
      config:{
        items:[
          { label:{ vi:'Flow health', en:'Flow health' }, value:'92%', color:'var(--green)' },
          { label:{ vi:'Blocked lanes', en:'Blocked lanes' }, value:'3', color:'var(--red)' },
          { label:{ vi:'Gate risk', en:'Gate risk' }, value:'Medium', color:'var(--amber)' },
          { label:{ vi:'Package drift', en:'Package drift' }, value:'1', color:'var(--blue)' }
        ],
        design:{ caption:'Balance flow, gate and package signals in one high-clarity radar row.' },
        story:{ sceneRole:'observe', sceneTitle:'Read the process radar', sceneNarrative:'Watch flow health, blocked lanes and release risk before they escalate.', heroBadge:'RADAR' },
        workflowStudio:{ mode:'constellation', constellationGroup:'control', slaMinutes:60 },
        observability:{ signalClass:'warning', refreshCadenceSec:60, alertChannel:'process.radar' },
        motionSystem:{ preset:'cinematic', tempo:'balanced', entryFx:'signal-rise', hoverFx:'glow', alertFx:'pulse', depthMode:'immersive', glowLevel:'soft', reduceMotionRespect:true },
        publishOps:{ versionTag:'0.9.0-beta', releaseStrategy:'manual', gatePolicy:'standard', approvalBoard:'process_council', rollbackOwner:'process_owner', channel:'enterprise' },
        ai:{ goal:'Surface flow risk and governance drift in one glance', persona:'executive', suggestionMode:'guided' }
      }
    }
  };

  Object.keys(ROUND5_SUPREME_TEMPLATES).forEach(function(key){ TEMPLATES[key] = ROUND5_SUPREME_TEMPLATES[key]; });

  BE.BLOCK_TEMPLATES = TEMPLATES;
  BE.BLOCK_PROPERTIES_SCHEMA = SCHEMA;
  BE.ROUND5_SUPREME_TEMPLATES = ROUND5_SUPREME_TEMPLATES;
  BE.MODULE_BUILDER_SUPREME_SCHEMA_VERSION = '2026-04-07-r5';
})();


/* ============================================================================
 * HESEM MOM — Module Builder Ultra Round 6 Block Engine Patch
 * Adds supreme experience templates, governance surfaces, AI boards, and version markers.
 * ============================================================================ */
(function(){
  'use strict';
  var BE = window.HmBlockEngine || {};
  if(!BE || BE.__MODULE_BUILDER_R6_PATCH__) return;
  BE.__MODULE_BUILDER_R6_PATCH__ = '2026-04-07-r6';

  function _clone(obj){ return obj == null ? obj : JSON.parse(JSON.stringify(obj)); }
  function _mergeTemplates(target, source){
    target = target || {};
    Object.keys(source || {}).forEach(function(key){
      if(!target[key]) target[key] = _clone(source[key]);
    });
    return target;
  }

  var ROUND6_TEMPLATES = {
    'r6-mission-hero': {
      type:'info-banner',
      title:{ vi:'Round 6 Mission Hero', en:'Round 6 Mission Hero' },
      config:{ text:'ROUND 6 · Experience OS · Flow Studio · Governance Matrix · Theme Atelier · AI Prompt Lab', textEn:'ROUND 6 · Experience OS · Flow Studio · Governance Matrix · Theme Atelier · AI Prompt Lab', type:'info' },
      meta:{ module:'builder-round6', category:'hero' }
    },
    'r6-control-ribbon': {
      type:'kpi-row',
      title:{ vi:'Round 6 Control Ribbon', en:'Round 6 Control Ribbon' },
      config:{ dataSource:{ api:'module_round6_summary', method:'GET' }, items:[ { label:'Flow', labelEn:'Flow', dataKey:'flow_orchestration', color:'var(--brand-2)', suffix:'%' }, { label:'Governance', labelEn:'Governance', dataKey:'governance_maturity', color:'var(--green)', suffix:'%' }, { label:'AI', labelEn:'AI', dataKey:'ai_leverage', color:'var(--amber)', suffix:'%' }, { label:'Runtime', labelEn:'Runtime', dataKey:'runtime_confidence', color:'var(--red)', suffix:'%' } ] },
      meta:{ module:'builder-round6', category:'kpi' }
    },
    'r6-flow-lane-board': {
      type:'data-cards',
      title:{ vi:'Flow Lane Board', en:'Flow Lane Board' },
      config:{ columns:3, titleKey:'lane', subtitleKey:'summary', badgeKey:'status', dataSource:{ api:'module_flow_lane_board', method:'GET', dataKey:'lanes' } },
      meta:{ module:'builder-round6', category:'flow' }
    },
    'r6-governance-gate-matrix': {
      type:'data-table',
      title:{ vi:'Governance Gate Matrix', en:'Governance Gate Matrix' },
      config:{ pageSize:12, dataSource:{ api:'module_governance_gates', method:'GET', dataKey:'gates' }, dataKey:'gates', columns:[ { key:'gate', label:{vi:'Gate',en:'Gate'}, type:'text' }, { key:'owner', label:{vi:'Owner',en:'Owner'}, type:'text' }, { key:'policy', label:{vi:'Policy',en:'Policy'}, type:'text' }, { key:'status', label:{vi:'Status',en:'Status'}, type:'badge' }, { key:'sla_hours', label:{vi:'SLA(h)',en:'SLA(h)'}, type:'number' } ] },
      meta:{ module:'builder-round6', category:'governance' }
    },
    'r6-approval-command-board': {
      type:'data-cards',
      title:{ vi:'Approval Command Board', en:'Approval Command Board' },
      config:{ columns:3, titleKey:'approver', subtitleKey:'scope', badgeKey:'status', dataSource:{ api:'module_approval_command_board', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round6', category:'governance' }
    },
    'r6-event-mesh-timeline': {
      type:'data-timeline',
      title:{ vi:'Event Mesh Timeline', en:'Event Mesh Timeline' },
      config:{ dataSource:{ api:'module_event_mesh_stream', method:'GET', dataKey:'events' }, dateKey:'occurred_at', titleKey:'event_name', descKey:'description' },
      meta:{ module:'builder-round6', category:'observability' }
    },
    'r6-package-diff-table': {
      type:'data-table',
      title:{ vi:'Package Diff Table', en:'Package Diff Table' },
      config:{ pageSize:20, dataSource:{ api:'module_package_diff', method:'GET', dataKey:'diff' }, dataKey:'diff', columns:[ { key:'path', label:{vi:'Path',en:'Path'}, type:'text' }, { key:'before', label:{vi:'Before',en:'Before'}, type:'text' }, { key:'after', label:{vi:'After',en:'After'}, type:'text' }, { key:'impact', label:{vi:'Impact',en:'Impact'}, type:'badge' } ] },
      meta:{ module:'builder-round6', category:'package' }
    },
    'r6-risk-command-table': {
      type:'data-table',
      title:{ vi:'Risk Command Table', en:'Risk Command Table' },
      config:{ pageSize:12, dataSource:{ api:'module_risk_command', method:'GET', dataKey:'risks' }, dataKey:'risks', columns:[ { key:'risk_id', label:{vi:'Risk',en:'Risk'}, type:'text' }, { key:'title', label:{vi:'Tiêu đề',en:'Title'}, type:'text' }, { key:'severity', label:{vi:'Severity',en:'Severity'}, type:'badge' }, { key:'owner', label:{vi:'Owner',en:'Owner'}, type:'text' }, { key:'mitigation', label:{vi:'Mitigation',en:'Mitigation'}, type:'text' } ] },
      meta:{ module:'builder-round6', category:'risk' }
    },
    'r6-design-token-gallery': {
      type:'data-cards',
      title:{ vi:'Design Token Gallery', en:'Design Token Gallery' },
      config:{ columns:4, titleKey:'token', subtitleKey:'value', badgeKey:'group', dataSource:{ api:'module_design_tokens', method:'GET', dataKey:'tokens' } },
      meta:{ module:'builder-round6', category:'design' }
    },
    'r6-operator-guidance-stream': {
      type:'data-timeline',
      title:{ vi:'Operator Guidance Stream', en:'Operator Guidance Stream' },
      config:{ dataSource:{ api:'module_operator_guidance', method:'GET', dataKey:'steps' }, dateKey:'sequence', titleKey:'headline', descKey:'instruction' },
      meta:{ module:'builder-round6', category:'operator' }
    },
    'r6-ai-brief-board': {
      type:'data-cards',
      title:{ vi:'AI Brief Board', en:'AI Brief Board' },
      config:{ columns:3, titleKey:'headline', subtitleKey:'detail', badgeKey:'priority', dataSource:{ api:'module_ai_brief', method:'GET', dataKey:'brief' } },
      meta:{ module:'builder-round6', category:'ai' }
    },
    'r6-dependency-trace-table': {
      type:'data-table',
      title:{ vi:'Dependency Trace Table', en:'Dependency Trace Table' },
      config:{ pageSize:20, dataSource:{ api:'module_dependency_trace', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'artifact', label:{vi:'Artifact',en:'Artifact'}, type:'text' }, { key:'dependency', label:{vi:'Dependency',en:'Dependency'}, type:'text' }, { key:'relation', label:{vi:'Relation',en:'Relation'}, type:'badge' }, { key:'owner', label:{vi:'Owner',en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status',en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round6', category:'traceability' }
    },
    'r6-release-wave-kpi': {
      type:'kpi-row',
      title:{ vi:'Release Wave KPIs', en:'Release Wave KPIs' },
      config:{ dataSource:{ api:'module_release_wave_summary', method:'GET' }, items:[ { label:'Sites', labelEn:'Sites', dataKey:'sites', color:'var(--brand-2)' }, { label:'Ready', labelEn:'Ready', dataKey:'ready_sites', color:'var(--green)' }, { label:'Blocked', labelEn:'Blocked', dataKey:'blocked_sites', color:'var(--red)' }, { label:'Rollout', labelEn:'Rollout', dataKey:'rollout_pct', color:'var(--amber)', suffix:'%' } ] },
      meta:{ module:'builder-round6', category:'release' }
    }
  };

  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  _mergeTemplates(BE.BLOCK_TEMPLATES, ROUND6_TEMPLATES);
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  _mergeTemplates(BE.EXTRA_TEMPLATES, ROUND6_TEMPLATES);
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r6';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-07-r6';
  BE.MODULE_BUILDER_ROUND6_TEMPLATES = Object.keys(ROUND6_TEMPLATES);
})();


/* ============================================================================
 * HESEM MOM — Module Builder Ultra Round 7 Block Engine Patch
 * Experience Director · Scenario Studio · Accessibility Ops · Market Lens
 * ============================================================================ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_CINEMA_SCHEMA_VERSION === '2026-04-07-r7') return;
  var BE = window.HmBlockEngine;
  function _mergeRound7(target, source){ Object.keys(source || {}).forEach(function(key){ target[key] = source[key]; }); }
  var ROUND7_TEMPLATES = {
    'r7-experience-command-hub': {
      type:'kpi-row',
      title:{ vi:'Experience Command Hub', en:'Experience Command Hub' },
      config:{ dataSource:{ api:'module_experience_director', method:'GET' }, items:[ { label:'Craft', labelEn:'Craft', dataKey:'visual_craft', color:'var(--brand-2)', suffix:'%' }, { label:'Access', labelEn:'Access', dataKey:'accessibility_ready', color:'var(--green)', suffix:'%' }, { label:'Scenario', labelEn:'Scenario', dataKey:'scenario_readiness', color:'var(--amber)', suffix:'%' }, { label:'Clarity', labelEn:'Clarity', dataKey:'operator_clarity', color:'var(--red)', suffix:'%' } ] },
      meta:{ module:'builder-round7', category:'director' }
    },
    'r7-scenario-simulator-board': {
      type:'data-cards',
      title:{ vi:'Scenario Simulator Board', en:'Scenario Simulator Board' },
      config:{ columns:3, titleKey:'scenario', subtitleKey:'summary', badgeKey:'impact', dataSource:{ api:'module_scenario_simulator', method:'GET', dataKey:'scenarios' } },
      meta:{ module:'builder-round7', category:'scenario' }
    },
    'r7-layout-harmony-table': {
      type:'data-table',
      title:{ vi:'Layout Harmony Table', en:'Layout Harmony Table' },
      config:{ pageSize:12, dataSource:{ api:'module_layout_harmony', method:'GET', dataKey:'tabs' }, dataKey:'tabs', columns:[ { key:'tab', label:{vi:'Tab', en:'Tab'}, type:'text' }, { key:'blocks', label:{vi:'Blocks', en:'Blocks'}, type:'number' }, { key:'density', label:{vi:'Density', en:'Density'}, type:'text' }, { key:'balance', label:{vi:'Balance', en:'Balance'}, type:'badge' }, { key:'recommendation', label:{vi:'Recommendation', en:'Recommendation'}, type:'text' } ] },
      meta:{ module:'builder-round7', category:'layout' }
    },
    'r7-accessibility-ops-board': {
      type:'data-cards',
      title:{ vi:'Accessibility Ops Board', en:'Accessibility Ops Board' },
      config:{ columns:3, titleKey:'area', subtitleKey:'status', badgeKey:'priority', dataSource:{ api:'module_accessibility_ops', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round7', category:'accessibility' }
    },
    'r7-story-ribbon': {
      type:'info-banner',
      title:{ vi:'Story Ribbon', en:'Story Ribbon' },
      config:{ type:'info', icon:'🎬', text:'Scenario-led narrative ribbon for operators, reviewers, and auditors.', textEn:'Scenario-led narrative ribbon for operators, reviewers, and auditors.' },
      meta:{ module:'builder-round7', category:'story' }
    },
    'r7-market-lens-grid': {
      type:'data-cards',
      title:{ vi:'Market Lens Grid', en:'Market Lens Grid' },
      config:{ columns:3, titleKey:'value_prop', subtitleKey:'evidence', badgeKey:'grade', dataSource:{ api:'module_market_lens', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round7', category:'market' }
    },
    'r7-release-choreography-timeline': {
      type:'data-timeline',
      title:{ vi:'Release Choreography Timeline', en:'Release Choreography Timeline' },
      config:{ dataSource:{ api:'module_release_choreography', method:'GET', dataKey:'events' }, dateKey:'stage', titleKey:'title', descKey:'description' },
      meta:{ module:'builder-round7', category:'release' }
    },
    'r7-issue-radar-table': {
      type:'data-table',
      title:{ vi:'Issue Radar Table', en:'Issue Radar Table' },
      config:{ pageSize:15, dataSource:{ api:'module_issue_radar', method:'GET', dataKey:'issues' }, dataKey:'issues', columns:[ { key:'issue_id', label:{vi:'Issue', en:'Issue'}, type:'text' }, { key:'headline', label:{vi:'Headline', en:'Headline'}, type:'text' }, { key:'priority', label:{vi:'Priority', en:'Priority'}, type:'badge' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round7', category:'issue' }
    },
    'r7-shift-readiness-kpi': {
      type:'kpi-row',
      title:{ vi:'Shift Readiness KPIs', en:'Shift Readiness KPIs' },
      config:{ dataSource:{ api:'module_shift_readiness', method:'GET' }, items:[ { label:'Ready', labelEn:'Ready', dataKey:'ready_pct', color:'var(--green)', suffix:'%' }, { label:'Blocked', labelEn:'Blocked', dataKey:'blocked_pct', color:'var(--red)', suffix:'%' }, { label:'Guided', labelEn:'Guided', dataKey:'guided_steps', color:'var(--brand-2)' }, { label:'Escalations', labelEn:'Escalations', dataKey:'escalations', color:'var(--amber)' } ] },
      meta:{ module:'builder-round7', category:'operator' }
    },
    'r7-design-command-gallery': {
      type:'data-cards',
      title:{ vi:'Design Command Gallery', en:'Design Command Gallery' },
      config:{ columns:4, titleKey:'token', subtitleKey:'value', badgeKey:'group', dataSource:{ api:'module_design_command_gallery', method:'GET', dataKey:'tokens' } },
      meta:{ module:'builder-round7', category:'design' }
    },
    'r7-package-value-table': {
      type:'data-table',
      title:{ vi:'Package Value Table', en:'Package Value Table' },
      config:{ pageSize:12, dataSource:{ api:'module_package_value', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'package', label:{vi:'Package', en:'Package'}, type:'text' }, { key:'value', label:{vi:'Value', en:'Value'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'reuse_score', label:{vi:'Reuse', en:'Reuse'}, type:'number' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round7', category:'package' }
    }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  _mergeRound7(BE.BLOCK_TEMPLATES, ROUND7_TEMPLATES);
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  _mergeRound7(BE.EXTRA_TEMPLATES, ROUND7_TEMPLATES);
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r7';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-07-r7';
  BE.MODULE_BUILDER_SUPREME_SCHEMA_VERSION = '2026-04-07-r7';
  BE.MODULE_BUILDER_CINEMA_SCHEMA_VERSION = '2026-04-07-r7';
  BE.MODULE_BUILDER_ROUND7_TEMPLATES = Object.keys(ROUND7_TEMPLATES);
})();


/* ============================================================================
 * HESEM MOM — Module Builder Ultra Round 9 Block Engine Patch
 * Glass Pro · Contrast Board · Structure Lens · Professional Executive Surfaces
 * ============================================================================ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_GLASS_SCHEMA_VERSION === '2026-04-08-r9') return;
  var BE = window.HmBlockEngine;
  function _mergeRound9(target, source){ Object.keys(source || {}).forEach(function(key){ target[key] = source[key]; }); }
  var ROUND9_TEMPLATES = {
    'r9-glass-executive-kpi': {
      type:'kpi-row',
      title:{ vi:'Glass Executive KPIs', en:'Glass Executive KPIs' },
      config:{ dataSource:{ api:'module_glass_executive_summary', method:'GET' }, items:[ { label:'Contrast', labelEn:'Contrast', dataKey:'contrast_score', color:'var(--brand-2)', suffix:'%' }, { label:'Readability', labelEn:'Readability', dataKey:'readability_score', color:'var(--green)', suffix:'%' }, { label:'Craft', labelEn:'Craft', dataKey:'glass_craft', color:'var(--amber)', suffix:'%' }, { label:'Approval', labelEn:'Approval', dataKey:'approval_ready', color:'var(--red)', suffix:'%' } ] },
      meta:{ module:'builder-round9', category:'glass' }
    },
    'r9-contrast-readiness-board': {
      type:'data-cards',
      title:{ vi:'Contrast Readiness Board', en:'Contrast Readiness Board' },
      config:{ columns:4, titleKey:'area', subtitleKey:'detail', badgeKey:'status', dataSource:{ api:'module_contrast_readiness', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round9', category:'contrast' }
    },
    'r9-approval-glass-board': {
      type:'data-cards',
      title:{ vi:'Approval Glass Board', en:'Approval Glass Board' },
      config:{ columns:3, titleKey:'gate', subtitleKey:'owner', badgeKey:'status', dataSource:{ api:'module_approval_glass', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round9', category:'governance' }
    },
    'r9-structure-lens-table': {
      type:'data-table',
      title:{ vi:'Structure Lens Table', en:'Structure Lens Table' },
      config:{ pageSize:12, dataSource:{ api:'module_structure_lens', method:'GET', dataKey:'tabs' }, dataKey:'tabs', columns:[ { key:'tab', label:{vi:'Tab', en:'Tab'}, type:'text' }, { key:'blocks', label:{vi:'Blocks', en:'Blocks'}, type:'number' }, { key:'density', label:{vi:'Density', en:'Density'}, type:'text' }, { key:'empty_state', label:{vi:'Empty state', en:'Empty state'}, type:'badge' }, { key:'recommendation', label:{vi:'Recommendation', en:'Recommendation'}, type:'text' } ] },
      meta:{ module:'builder-round9', category:'structure' }
    },
    'r9-professional-command-table': {
      type:'data-table',
      title:{ vi:'Professional Command Table', en:'Professional Command Table' },
      config:{ pageSize:10, dataSource:{ api:'module_professional_command', method:'GET', dataKey:'actions' }, dataKey:'actions', columns:[ { key:'action', label:{vi:'Action', en:'Action'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'sla', label:{vi:'SLA', en:'SLA'}, type:'text' }, { key:'risk', label:{vi:'Risk', en:'Risk'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round9', category:'command' }
    },
    'r9-operator-focus-banner': {
      type:'info-banner',
      title:{ vi:'Operator Focus Banner', en:'Operator Focus Banner' },
      config:{ type:'info', icon:'🎯', text:'Focus the operator on the next safe action with a high-contrast, glare-controlled message ribbon.', textEn:'Focus the operator on the next safe action with a high-contrast, glare-controlled message ribbon.' },
      meta:{ module:'builder-round9', category:'operator' }
    },
    'r9-palette-rack-gallery': {
      type:'data-cards',
      title:{ vi:'Palette Rack Gallery', en:'Palette Rack Gallery' },
      config:{ columns:4, titleKey:'token', subtitleKey:'value', badgeKey:'group', dataSource:{ api:'module_palette_rack', method:'GET', dataKey:'tokens' } },
      meta:{ module:'builder-round9', category:'design' }
    },
    'r9-supplier-radar-table': {
      type:'data-table',
      title:{ vi:'Supplier Radar Table', en:'Supplier Radar Table' },
      config:{ pageSize:15, dataSource:{ api:'module_supplier_radar', method:'GET', dataKey:'suppliers' }, dataKey:'suppliers', columns:[ { key:'supplier', label:{vi:'Supplier', en:'Supplier'}, type:'text' }, { key:'issue', label:{vi:'Issue', en:'Issue'}, type:'text' }, { key:'risk', label:{vi:'Risk', en:'Risk'}, type:'badge' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'eta', label:{vi:'ETA', en:'ETA'}, type:'text' } ] },
      meta:{ module:'builder-round9', category:'supplier' }
    },
    'r9-audit-evidence-glass': {
      type:'data-table',
      title:{ vi:'Audit Evidence Glass', en:'Audit Evidence Glass' },
      config:{ pageSize:12, dataSource:{ api:'module_audit_evidence_glass', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'evidence_id', label:{vi:'Evidence', en:'Evidence'}, type:'text' }, { key:'headline', label:{vi:'Headline', en:'Headline'}, type:'text' }, { key:'trace', label:{vi:'Trace', en:'Trace'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round9', category:'audit' }
    },
    'r9-release-assurance-timeline': {
      type:'data-timeline',
      title:{ vi:'Release Assurance Timeline', en:'Release Assurance Timeline' },
      config:{ dataSource:{ api:'module_release_assurance', method:'GET', dataKey:'events' }, dateKey:'stage', titleKey:'title', descKey:'description' },
      meta:{ module:'builder-round9', category:'release' }
    }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  _mergeRound9(BE.BLOCK_TEMPLATES, ROUND9_TEMPLATES);
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  _mergeRound9(BE.EXTRA_TEMPLATES, ROUND9_TEMPLATES);
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-08-r9';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-08-r9';
  BE.MODULE_BUILDER_SUPREME_SCHEMA_VERSION = '2026-04-08-r9';
  BE.MODULE_BUILDER_CINEMA_SCHEMA_VERSION = '2026-04-08-r9';
  BE.MODULE_BUILDER_GLASS_SCHEMA_VERSION = '2026-04-08-r9';
  BE.MODULE_BUILDER_ROUND9_TEMPLATES = Object.keys(ROUND9_TEMPLATES);
})();


/* ============================================================================
 * HESEM MOM — Module Builder Ultra Round 10 Block Engine Patch
 * Glass Executive · Workflow Atlas · Typography Discipline · Governance Boardroom
 * ============================================================================ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_GLASS_SCHEMA_VERSION === '2026-04-08-r10') return;
  var BE = window.HmBlockEngine;
  function _mergeRound10(target, source){ Object.keys(source || {}).forEach(function(key){ target[key] = source[key]; }); }
  var ROUND10_TEMPLATES = {
    'r10-boardroom-command-kpi': {
      type:'kpi-row',
      title:{ vi:'Boardroom Command KPIs', en:'Boardroom Command KPIs' },
      config:{ dataSource:{ api:'module_boardroom_command', method:'GET' }, items:[ { label:'Contrast', labelEn:'Contrast', dataKey:'contrast', color:'var(--brand-2)', suffix:'%' }, { label:'Hierarchy', labelEn:'Hierarchy', dataKey:'hierarchy', color:'var(--green)', suffix:'%' }, { label:'Governance', labelEn:'Governance', dataKey:'governance', color:'var(--amber)', suffix:'%' }, { label:'Operate', labelEn:'Operate', dataKey:'operability', color:'var(--red)', suffix:'%' } ] },
      meta:{ module:'builder-round10', category:'boardroom' }
    },
    'r10-governance-signoff-wall': {
      type:'data-cards',
      title:{ vi:'Governance Signoff Wall', en:'Governance Signoff Wall' },
      config:{ columns:4, titleKey:'gate', subtitleKey:'owner', badgeKey:'status', dataSource:{ api:'module_governance_signoff', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round10', category:'governance' }
    },
    'r10-workflow-atlas-table': {
      type:'data-table',
      title:{ vi:'Workflow Atlas Table', en:'Workflow Atlas Table' },
      config:{ pageSize:12, dataSource:{ api:'module_workflow_atlas', method:'GET', dataKey:'rows' }, dataKey:'rows', columns:[ { key:'lane', label:{vi:'Lane', en:'Lane'}, type:'text' }, { key:'focus', label:{vi:'Focus', en:'Focus'}, type:'text' }, { key:'blocks', label:{vi:'Blocks', en:'Blocks'}, type:'number' }, { key:'risk', label:{vi:'Risk', en:'Risk'}, type:'badge' }, { key:'recommendation', label:{vi:'Recommendation', en:'Recommendation'}, type:'text' } ] },
      meta:{ module:'builder-round10', category:'workflow' }
    },
    'r10-typography-discipline-gallery': {
      type:'data-cards',
      title:{ vi:'Typography Discipline Gallery', en:'Typography Discipline Gallery' },
      config:{ columns:3, titleKey:'token', subtitleKey:'value', badgeKey:'impact', dataSource:{ api:'module_typography_discipline', method:'GET', dataKey:'tokens' } },
      meta:{ module:'builder-round10', category:'typography' }
    },
    'r10-decision-desk-banner': {
      type:'info-banner',
      title:{ vi:'Decision Desk Banner', en:'Decision Desk Banner' },
      config:{ type:'info', icon:'🏛️', text:'Decision desk ribbon for release rhythm, signoff ownership, and boardroom next actions.', textEn:'Decision desk ribbon for release rhythm, signoff ownership, and boardroom next actions.' },
      meta:{ module:'builder-round10', category:'decision' }
    },
    'r10-readability-assurance-table': {
      type:'data-table',
      title:{ vi:'Readability Assurance Table', en:'Readability Assurance Table' },
      config:{ pageSize:10, dataSource:{ api:'module_readability_assurance', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'area', label:{vi:'Area', en:'Area'}, type:'text' }, { key:'issue', label:{vi:'Issue', en:'Issue'}, type:'text' }, { key:'contrast', label:{vi:'Contrast', en:'Contrast'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round10', category:'readability' }
    },
    'r10-professional-palette-gallery': {
      type:'data-cards',
      title:{ vi:'Professional Palette Gallery', en:'Professional Palette Gallery' },
      config:{ columns:4, titleKey:'token', subtitleKey:'hex', badgeKey:'role', dataSource:{ api:'module_professional_palette', method:'GET', dataKey:'tokens' } },
      meta:{ module:'builder-round10', category:'palette' }
    },
    'r10-release-clarity-timeline': {
      type:'data-timeline',
      title:{ vi:'Release Clarity Timeline', en:'Release Clarity Timeline' },
      config:{ dataSource:{ api:'module_release_clarity', method:'GET', dataKey:'events' }, dateKey:'stage', titleKey:'title', descKey:'description' },
      meta:{ module:'builder-round10', category:'release' }
    },
    'r10-operator-precision-grid': {
      type:'data-cards',
      title:{ vi:'Operator Precision Grid', en:'Operator Precision Grid' },
      config:{ columns:3, titleKey:'task', subtitleKey:'guidance', badgeKey:'status', dataSource:{ api:'module_operator_precision', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round10', category:'operator' }
    },
    'r10-executive-decision-table': {
      type:'data-table',
      title:{ vi:'Executive Decision Table', en:'Executive Decision Table' },
      config:{ pageSize:12, dataSource:{ api:'module_executive_decisions', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'decision', label:{vi:'Decision', en:'Decision'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'window', label:{vi:'Window', en:'Window'}, type:'text' }, { key:'risk', label:{vi:'Risk', en:'Risk'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round10', category:'executive' }
    }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  _mergeRound10(BE.BLOCK_TEMPLATES, ROUND10_TEMPLATES);
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  _mergeRound10(BE.EXTRA_TEMPLATES, ROUND10_TEMPLATES);
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-08-r10';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-08-r10';
  BE.MODULE_BUILDER_SUPREME_SCHEMA_VERSION = '2026-04-08-r10';
  BE.MODULE_BUILDER_CINEMA_SCHEMA_VERSION = '2026-04-08-r10';
  BE.MODULE_BUILDER_GLASS_SCHEMA_VERSION = '2026-04-08-r10';
  BE.MODULE_BUILDER_ROUND10_TEMPLATES = Object.keys(ROUND10_TEMPLATES);
})();


/* ============================================================================
 * HESEM MOM — Module Builder Ultra Round 11 Block Engine Patch
 * Glass Boardroom Pro · Navigator Board · Signal Matrix · Composition Discipline
 * ============================================================================ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_GLASS_SCHEMA_VERSION === '2026-04-07-r11') return;
  var BE = window.HmBlockEngine;
  function _mergeRound11(target, source){ Object.keys(source || {}).forEach(function(key){ target[key] = source[key]; }); }
  var ROUND11_TEMPLATES = {
    'r11-precision-command-kpi': {
      type:'kpi-row',
      title:{ vi:'Precision Command KPIs', en:'Precision Command KPIs' },
      config:{ dataSource:{ api:'module_precision_command', method:'GET' }, items:[ { label:'Contrast', labelEn:'Contrast', dataKey:'contrast', color:'var(--brand-2)', suffix:'%' }, { label:'Scan', labelEn:'Scan', dataKey:'scan_path', color:'var(--green)', suffix:'%' }, { label:'Focus', labelEn:'Focus', dataKey:'task_focus', color:'var(--amber)', suffix:'%' }, { label:'Decision', labelEn:'Decision', dataKey:'decision_confidence', color:'var(--red)', suffix:'%' } ] },
      meta:{ module:'builder-round11', category:'precision' }
    },
    'r11-navigator-board': {
      type:'data-cards',
      title:{ vi:'Navigator Board', en:'Navigator Board' },
      config:{ columns:4, titleKey:'tab', subtitleKey:'focus', badgeKey:'status', dataSource:{ api:'module_navigator_board', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round11', category:'navigator' }
    },
    'r11-signal-matrix-table': {
      type:'data-table',
      title:{ vi:'Signal Matrix Table', en:'Signal Matrix Table' },
      config:{ pageSize:12, dataSource:{ api:'module_signal_matrix', method:'GET', dataKey:'rows' }, dataKey:'rows', columns:[ { key:'signal', label:{vi:'Signal', en:'Signal'}, type:'text' }, { key:'ratio', label:{vi:'Ratio', en:'Ratio'}, type:'text' }, { key:'count', label:{vi:'Count', en:'Count'}, type:'number' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round11', category:'signal' }
    },
    'r11-composition-swatch-gallery': {
      type:'data-cards',
      title:{ vi:'Composition Swatch Gallery', en:'Composition Swatch Gallery' },
      config:{ columns:4, titleKey:'token', subtitleKey:'value', badgeKey:'role', dataSource:{ api:'module_composition_swatch_gallery', method:'GET', dataKey:'tokens' } },
      meta:{ module:'builder-round11', category:'composition' }
    },
    'r11-focus-task-lane': {
      type:'data-cards',
      title:{ vi:'Focus Task Lane', en:'Focus Task Lane' },
      config:{ columns:3, titleKey:'task', subtitleKey:'guidance', badgeKey:'priority', dataSource:{ api:'module_focus_task_lane', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round11', category:'focus' }
    },
    'r11-decision-confidence-table': {
      type:'data-table',
      title:{ vi:'Decision Confidence Table', en:'Decision Confidence Table' },
      config:{ pageSize:10, dataSource:{ api:'module_decision_confidence', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'decision', label:{vi:'Decision', en:'Decision'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'window', label:{vi:'Window', en:'Window'}, type:'text' }, { key:'risk', label:{vi:'Risk', en:'Risk'}, type:'badge' }, { key:'confidence', label:{vi:'Confidence', en:'Confidence'}, type:'text' } ] },
      meta:{ module:'builder-round11', category:'decision' }
    },
    'r11-audit-clarity-banner': {
      type:'info-banner',
      title:{ vi:'Audit Clarity Banner', en:'Audit Clarity Banner' },
      config:{ type:'info', icon:'🛡️', text:'Audit clarity ribbon for signoff ownership, evidence trace, and release discipline.', textEn:'Audit clarity ribbon for signoff ownership, evidence trace, and release discipline.' },
      meta:{ module:'builder-round11', category:'audit' }
    },
    'r11-release-bridge-timeline': {
      type:'data-timeline',
      title:{ vi:'Release Bridge Timeline', en:'Release Bridge Timeline' },
      config:{ dataSource:{ api:'module_release_bridge', method:'GET', dataKey:'events' }, dateKey:'stage', titleKey:'title', descKey:'description' },
      meta:{ module:'builder-round11', category:'release' }
    },
    'r11-operator-guidance-grid': {
      type:'data-cards',
      title:{ vi:'Operator Guidance Grid', en:'Operator Guidance Grid' },
      config:{ columns:3, titleKey:'station', subtitleKey:'next_action', badgeKey:'status', dataSource:{ api:'module_operator_guidance', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round11', category:'operator' }
    },
    'r11-visual-contract-table': {
      type:'data-table',
      title:{ vi:'Visual Contract Table', en:'Visual Contract Table' },
      config:{ pageSize:12, dataSource:{ api:'module_visual_contract', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'surface', label:{vi:'Surface', en:'Surface'}, type:'text' }, { key:'rule', label:{vi:'Rule', en:'Rule'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'severity', label:{vi:'Severity', en:'Severity'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round11', category:'visual' }
    },
    'r11-executive-scan-cards': {
      type:'data-cards',
      title:{ vi:'Executive Scan Cards', en:'Executive Scan Cards' },
      config:{ columns:4, titleKey:'headline', subtitleKey:'insight', badgeKey:'status', dataSource:{ api:'module_executive_scan_cards', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round11', category:'executive' }
    }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  _mergeRound11(BE.BLOCK_TEMPLATES, ROUND11_TEMPLATES);
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  _mergeRound11(BE.EXTRA_TEMPLATES, ROUND11_TEMPLATES);
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r11';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-07-r11';
  BE.MODULE_BUILDER_SUPREME_SCHEMA_VERSION = '2026-04-07-r11';
  BE.MODULE_BUILDER_CINEMA_SCHEMA_VERSION = '2026-04-07-r11';
  BE.MODULE_BUILDER_GLASS_SCHEMA_VERSION = '2026-04-07-r11';
  BE.MODULE_BUILDER_ROUND11_TEMPLATES = Object.keys(ROUND11_TEMPLATES);
})();

/* ============================================================================
 * HESEM MOM — Module Builder Ultra Round 12 Block Engine Patch
 * Glass Command Atelier · Contrast Guard · Surface QA · Command Atlas
 * ============================================================================ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_GLASS_SCHEMA_VERSION === '2026-04-07-r12') return;
  var BE = window.HmBlockEngine;
  function _mergeRound12(target, source){ Object.keys(source || {}).forEach(function(key){ target[key] = source[key]; }); }
  var ROUND12_TEMPLATES = {
    'r12-contrast-guard-kpis': {
      type:'kpi-row',
      title:{ vi:'Contrast Guard KPIs', en:'Contrast Guard KPIs' },
      config:{ dataSource:{ api:'module_contrast_guard', method:'GET' }, items:[ { label:'Contrast', labelEn:'Contrast', dataKey:'contrast', color:'var(--brand-2)', suffix:'%' }, { label:'Glare', labelEn:'Glare', dataKey:'glare_discipline', color:'var(--green)', suffix:'%' }, { label:'Toolbar', labelEn:'Toolbar', dataKey:'toolbar_legibility', color:'var(--amber)', suffix:'%' }, { label:'Calm', labelEn:'Calm', dataKey:'canvas_calm', color:'var(--red)', suffix:'%' } ] },
      meta:{ module:'builder-round12', category:'contrast' }
    },
    'r12-command-atlas-board': {
      type:'data-cards',
      title:{ vi:'Command Atlas Board', en:'Command Atlas Board' },
      config:{ columns:4, titleKey:'tab', subtitleKey:'focus', badgeKey:'status', dataSource:{ api:'module_command_atlas', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round12', category:'atlas' }
    },
    'r12-surface-qa-table': {
      type:'data-table',
      title:{ vi:'Surface QA Table', en:'Surface QA Table' },
      config:{ pageSize:12, dataSource:{ api:'module_surface_qa', method:'GET', dataKey:'rows' }, dataKey:'rows', columns:[ { key:'surface', label:{vi:'Surface', en:'Surface'}, type:'text' }, { key:'recipe', label:{vi:'Recipe', en:'Recipe'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'severity', label:{vi:'Severity', en:'Severity'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round12', category:'surface' }
    },
    'r12-glass-token-gallery': {
      type:'data-cards',
      title:{ vi:'Glass Token Gallery', en:'Glass Token Gallery' },
      config:{ columns:4, titleKey:'token', subtitleKey:'value', badgeKey:'role', dataSource:{ api:'module_glass_tokens', method:'GET', dataKey:'tokens' } },
      meta:{ module:'builder-round12', category:'tokens' }
    },
    'r12-decision-ladder-timeline': {
      type:'data-timeline',
      title:{ vi:'Decision Ladder Timeline', en:'Decision Ladder Timeline' },
      config:{ dataSource:{ api:'module_decision_ladder', method:'GET', dataKey:'events' }, dateKey:'stage', titleKey:'title', descKey:'description' },
      meta:{ module:'builder-round12', category:'decision' }
    },
    'r12-operator-scan-grid': {
      type:'data-cards',
      title:{ vi:'Operator Scan Grid', en:'Operator Scan Grid' },
      config:{ columns:3, titleKey:'station', subtitleKey:'next_action', badgeKey:'priority', dataSource:{ api:'module_operator_scan', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round12', category:'operator' }
    },
    'r12-quiet-command-banner': {
      type:'info-banner',
      title:{ vi:'Quiet Command Banner', en:'Quiet Command Banner' },
      config:{ type:'info', icon:'🪶', text:'Quiet chrome guidance for lower glare, tighter contrast discipline, and faster decision scanning.', textEn:'Quiet chrome guidance for lower glare, tighter contrast discipline, and faster decision scanning.' },
      meta:{ module:'builder-round12', category:'quiet' }
    },
    'r12-module-search-table': {
      type:'data-table',
      title:{ vi:'Module Search Table', en:'Module Search Table' },
      config:{ pageSize:10, dataSource:{ api:'module_search_table', method:'GET', dataKey:'rows' }, dataKey:'rows', columns:[ { key:'target', label:{vi:'Target', en:'Target'}, type:'text' }, { key:'lane', label:{vi:'Lane', en:'Lane'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'next_action', label:{vi:'Next action', en:'Next action'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round12', category:'search' }
    },
    'r12-visual-qa-violations': {
      type:'data-table',
      title:{ vi:'Visual QA Violations', en:'Visual QA Violations' },
      config:{ pageSize:12, dataSource:{ api:'module_visual_qa_violations', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'zone', label:{vi:'Zone', en:'Zone'}, type:'text' }, { key:'issue', label:{vi:'Issue', en:'Issue'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'impact', label:{vi:'Impact', en:'Impact'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round12', category:'qa' }
    },
    'r12-release-control-wall': {
      type:'data-cards',
      title:{ vi:'Release Control Wall', en:'Release Control Wall' },
      config:{ columns:4, titleKey:'gate', subtitleKey:'owner', badgeKey:'status', dataSource:{ api:'module_release_control_wall', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round12', category:'release' }
    },
    'r12-boardroom-readout-cards': {
      type:'data-cards',
      title:{ vi:'Boardroom Readout Cards', en:'Boardroom Readout Cards' },
      config:{ columns:4, titleKey:'headline', subtitleKey:'insight', badgeKey:'status', dataSource:{ api:'module_boardroom_readout', method:'GET', dataKey:'items' } },
      meta:{ module:'builder-round12', category:'boardroom' }
    },
    'r12-accessibility-ops-table': {
      type:'data-table',
      title:{ vi:'Accessibility Ops Table', en:'Accessibility Ops Table' },
      config:{ pageSize:10, dataSource:{ api:'module_accessibility_ops', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'check', label:{vi:'Check', en:'Check'}, type:'text' }, { key:'result', label:{vi:'Result', en:'Result'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'priority', label:{vi:'Priority', en:'Priority'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] },
      meta:{ module:'builder-round12', category:'accessibility' }
    }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  _mergeRound12(BE.BLOCK_TEMPLATES, ROUND12_TEMPLATES);
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  _mergeRound12(BE.EXTRA_TEMPLATES, ROUND12_TEMPLATES);
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-07-r12';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-07-r12';
  BE.MODULE_BUILDER_SUPREME_SCHEMA_VERSION = '2026-04-07-r12';
  BE.MODULE_BUILDER_CINEMA_SCHEMA_VERSION = '2026-04-07-r12';
  BE.MODULE_BUILDER_GLASS_SCHEMA_VERSION = '2026-04-07-r12';
  BE.MODULE_BUILDER_ROUND12_TEMPLATES = Object.keys(ROUND12_TEMPLATES);
})();


/* ============================================================================
 * HESEM MOM — Module Builder Ultra Round 13 Block Engine Patch
 * Glass Command Theater · Contrast Sentinel · Professional Glass Discipline
 * ============================================================================ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_GLASS_SCHEMA_VERSION === '2026-04-08-r13') return;
  var BE = window.HmBlockEngine;
  function _mergeRound13(target, source){ Object.keys(source || {}).forEach(function(key){ target[key] = source[key]; }); }
  var ROUND13_TEMPLATES = {
    'r13-glass-command-kpi': { type:'kpi-row', title:{ vi:'Glass Command KPIs', en:'Glass Command KPIs' }, config:{ dataSource:{ api:'module_glass_command', method:'GET' }, items:[ { label:'Clarity', labelEn:'Clarity', dataKey:'clarity', color:'var(--brand-2)', suffix:'%' }, { label:'Command', labelEn:'Command', dataKey:'command', color:'var(--green)', suffix:'%' }, { label:'Governance', labelEn:'Governance', dataKey:'governance', color:'var(--amber)', suffix:'%' }, { label:'Comfort', labelEn:'Comfort', dataKey:'comfort', color:'var(--red)', suffix:'%' } ] }, meta:{ module:'builder-round13', category:'glass' } },
    'r13-contrast-sentinel-table': { type:'data-table', title:{ vi:'Contrast Sentinel Table', en:'Contrast Sentinel Table' }, config:{ pageSize:12, dataSource:{ api:'module_contrast_sentinel', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'surface', label:{vi:'Surface', en:'Surface'}, type:'text' }, { key:'contrast', label:{vi:'Contrast', en:'Contrast'}, type:'text' }, { key:'glare', label:{vi:'Glare', en:'Glare'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round13', category:'contrast' } },
    'r13-atlas-command-board': { type:'data-cards', title:{ vi:'Atlas Command Board', en:'Atlas Command Board' }, config:{ columns:4, titleKey:'tab', subtitleKey:'focus', badgeKey:'status', dataSource:{ api:'module_atlas_command_board', method:'GET', dataKey:'items' } }, meta:{ module:'builder-round13', category:'atlas' } },
    'r13-palette-discipline-gallery': { type:'data-cards', title:{ vi:'Palette Discipline Gallery', en:'Palette Discipline Gallery' }, config:{ columns:4, titleKey:'token', subtitleKey:'value', badgeKey:'role', dataSource:{ api:'module_palette_discipline_gallery', method:'GET', dataKey:'tokens' } }, meta:{ module:'builder-round13', category:'palette' } },
    'r13-command-rail-table': { type:'data-table', title:{ vi:'Command Rail Table', en:'Command Rail Table' }, config:{ pageSize:10, dataSource:{ api:'module_command_rail_r13', method:'GET', dataKey:'actions' }, dataKey:'actions', columns:[ { key:'action', label:{vi:'Action', en:'Action'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'window', label:{vi:'Window', en:'Window'}, type:'text' }, { key:'priority', label:{vi:'Priority', en:'Priority'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round13', category:'action' } },
    'r13-workflow-theater-timeline': { type:'data-timeline', title:{ vi:'Workflow Theater Timeline', en:'Workflow Theater Timeline' }, config:{ dataSource:{ api:'module_workflow_theater', method:'GET', dataKey:'events' }, dateKey:'stage', titleKey:'title', descKey:'description' }, meta:{ module:'builder-round13', category:'workflow' } },
    'r13-audit-closing-ledger': { type:'data-table', title:{ vi:'Audit Closing Ledger', en:'Audit Closing Ledger' }, config:{ pageSize:12, dataSource:{ api:'module_audit_closing_ledger', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'trace_id', label:{vi:'Trace', en:'Trace'}, type:'text' }, { key:'headline', label:{vi:'Headline', en:'Headline'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'severity', label:{vi:'Severity', en:'Severity'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round13', category:'audit' } },
    'r13-operator-clearpath-grid': { type:'data-cards', title:{ vi:'Operator Clearpath Grid', en:'Operator Clearpath Grid' }, config:{ columns:3, titleKey:'task', subtitleKey:'guidance', badgeKey:'status', dataSource:{ api:'module_operator_clearpath', method:'GET', dataKey:'items' } }, meta:{ module:'builder-round13', category:'operator' } },
    'r13-release-discipline-table': { type:'data-table', title:{ vi:'Release Discipline Table', en:'Release Discipline Table' }, config:{ pageSize:12, dataSource:{ api:'module_release_discipline', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'gate', label:{vi:'Gate', en:'Gate'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'window', label:{vi:'Window', en:'Window'}, type:'text' }, { key:'risk', label:{vi:'Risk', en:'Risk'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round13', category:'release' } },
    'r13-executive-story-cards': { type:'data-cards', title:{ vi:'Executive Story Cards', en:'Executive Story Cards' }, config:{ columns:4, titleKey:'headline', subtitleKey:'insight', badgeKey:'status', dataSource:{ api:'module_executive_story_cards', method:'GET', dataKey:'items' } }, meta:{ module:'builder-round13', category:'executive' } },
    'r13-supplier-command-radar': { type:'data-table', title:{ vi:'Supplier Command Radar', en:'Supplier Command Radar' }, config:{ pageSize:12, dataSource:{ api:'module_supplier_command_radar', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'supplier', label:{vi:'Supplier', en:'Supplier'}, type:'text' }, { key:'issue', label:{vi:'Issue', en:'Issue'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'risk', label:{vi:'Risk', en:'Risk'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round13', category:'supplier' } },
    'r13-surface-qa-table': { type:'data-table', title:{ vi:'Surface QA Table', en:'Surface QA Table' }, config:{ pageSize:12, dataSource:{ api:'module_surface_qa', method:'GET', dataKey:'items' }, dataKey:'items', columns:[ { key:'surface', label:{vi:'Surface', en:'Surface'}, type:'text' }, { key:'rule', label:{vi:'Rule', en:'Rule'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'severity', label:{vi:'Severity', en:'Severity'}, type:'badge' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round13', category:'quality' } },
    'r13-typography-command-cards': { type:'data-cards', title:{ vi:'Typography Command Cards', en:'Typography Command Cards' }, config:{ columns:4, titleKey:'token', subtitleKey:'value', badgeKey:'group', dataSource:{ api:'module_typography_command_cards', method:'GET', dataKey:'items' } }, meta:{ module:'builder-round13', category:'typography' } }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  _mergeRound13(BE.BLOCK_TEMPLATES, ROUND13_TEMPLATES);
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  _mergeRound13(BE.EXTRA_TEMPLATES, ROUND13_TEMPLATES);
  BE.MODULE_BUILDER_ULTRA_SCHEMA_VERSION = '2026-04-08-r13';
  BE.MODULE_BUILDER_ULTIMATE_SCHEMA_VERSION = '2026-04-08-r13';
  BE.MODULE_BUILDER_SUPREME_SCHEMA_VERSION = '2026-04-08-r13';
  BE.MODULE_BUILDER_CINEMA_SCHEMA_VERSION = '2026-04-08-r13';
  BE.MODULE_BUILDER_GLASS_SCHEMA_VERSION = '2026-04-08-r13';
  BE.MODULE_BUILDER_ROUND13_TEMPLATES = Object.keys(ROUND13_TEMPLATES);
})();


/* ============================================================================
 * HESEM MOM — Module Runtime Design System Patch (Round 14 Serious)
 * Focus: real runtime graphics for generated modules, not builder chrome.
 * ============================================================================ */
(function(){
  if(!window.HmBlockEngine || window.HmBlockEngine.MODULE_BUILDER_RUNTIME_DESIGN_VERSION === '2026-04-08-r14-serious') return;
  var BE = window.HmBlockEngine;
  var _r14PrevRenderModuleFromSchema = typeof renderModuleFromSchema === 'function' ? renderModuleFromSchema : BE.renderModuleFromSchema;
  function _r14Clone(value){
    if(value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch(err){ return value; }
  }
  function _r14IsObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }
  function _r14Merge(target, source){
    target = _r14IsObject(target) ? target : {};
    Object.keys(source || {}).forEach(function(key){
      var src = source[key];
      if(_r14IsObject(src)){
        if(!_r14IsObject(target[key])) target[key] = {};
        _r14Merge(target[key], src);
      } else if(src !== undefined){
        target[key] = src;
      }
    });
    return target;
  }
  function _r14Slug(text){ return String(text == null ? '' : text).replace(/[^a-zA-Z0-9_-]+/g, '-'); }

  var _r14AccentMap = {
    blue:{ accent:'#2563eb', strong:'#1d4ed8', soft:'rgba(37,99,235,.14)', soft2:'rgba(37,99,235,.24)', text:'#dbeafe', focus:'rgba(37,99,235,.26)' },
    cyan:{ accent:'#0891b2', strong:'#0e7490', soft:'rgba(8,145,178,.14)', soft2:'rgba(8,145,178,.24)', text:'#cffafe', focus:'rgba(8,145,178,.26)' },
    emerald:{ accent:'#059669', strong:'#047857', soft:'rgba(5,150,105,.14)', soft2:'rgba(5,150,105,.24)', text:'#d1fae5', focus:'rgba(5,150,105,.26)' },
    violet:{ accent:'#7c3aed', strong:'#6d28d9', soft:'rgba(124,58,237,.14)', soft2:'rgba(124,58,237,.24)', text:'#ede9fe', focus:'rgba(124,58,237,.26)' },
    amber:{ accent:'#d97706', strong:'#b45309', soft:'rgba(217,119,6,.14)', soft2:'rgba(217,119,6,.24)', text:'#fef3c7', focus:'rgba(217,119,6,.26)' }
  };
  var _r14SurfaceMap = {
    glass:{
      tone:'light',
      stageBg:'linear-gradient(180deg,#f7fbff 0%,#eef4f9 52%,#e8eff7 100%)',
      stageBorder:'rgba(148,163,184,.28)',
      stageAura:'radial-gradient(circle at 0% 0%,rgba(37,99,235,.10),transparent 30%),radial-gradient(circle at 100% 0%,rgba(8,145,178,.08),transparent 32%)',
      stageShadow:'0 18px 50px rgba(15,23,42,.08)',
      surfaceBg:'linear-gradient(180deg,rgba(255,255,255,.80),rgba(255,255,255,.66))',
      surfaceStrong:'linear-gradient(180deg,rgba(255,255,255,.94),rgba(248,250,252,.88))',
      headerBg:'linear-gradient(135deg,rgba(255,255,255,.78),rgba(248,250,252,.60))',
      border:'rgba(148,163,184,.24)',
      borderStrong:'rgba(148,163,184,.36)',
      text:'#0f172a',
      textMuted:'#334155',
      textSoft:'#64748b',
      tabBar:'rgba(255,255,255,.68)',
      tableHead:'rgba(241,245,249,.92)',
      tableStripe:'rgba(248,250,252,.88)',
      tableHover:'rgba(239,246,255,.95)',
      inputBg:'rgba(255,255,255,.94)',
      chipBg:'rgba(255,255,255,.88)',
      blur:'18px'
    },
    solid:{
      tone:'light',
      stageBg:'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)',
      stageBorder:'rgba(148,163,184,.26)',
      stageAura:'none',
      stageShadow:'0 10px 28px rgba(15,23,42,.06)',
      surfaceBg:'linear-gradient(180deg,#ffffff,#f8fafc)',
      surfaceStrong:'linear-gradient(180deg,#ffffff,#f8fafc)',
      headerBg:'linear-gradient(180deg,#ffffff,#f8fafc)',
      border:'rgba(148,163,184,.22)',
      borderStrong:'rgba(100,116,139,.30)',
      text:'#0f172a',
      textMuted:'#334155',
      textSoft:'#64748b',
      tabBar:'rgba(241,245,249,.98)',
      tableHead:'rgba(241,245,249,.98)',
      tableStripe:'rgba(248,250,252,.94)',
      tableHover:'rgba(241,245,249,.98)',
      inputBg:'#ffffff',
      chipBg:'rgba(241,245,249,.98)',
      blur:'0px'
    },
    paper:{
      tone:'light',
      stageBg:'linear-gradient(180deg,#fcfbf8 0%,#f7f4ee 100%)',
      stageBorder:'rgba(161,98,7,.18)',
      stageAura:'radial-gradient(circle at 100% 0%,rgba(217,119,6,.05),transparent 28%)',
      stageShadow:'0 12px 30px rgba(71,46,15,.05)',
      surfaceBg:'linear-gradient(180deg,#fffdf8,#f8f4eb)',
      surfaceStrong:'linear-gradient(180deg,#fffefa,#f9f6ef)',
      headerBg:'linear-gradient(180deg,#fffefb,#f7f2e9)',
      border:'rgba(161,98,7,.18)',
      borderStrong:'rgba(146,64,14,.28)',
      text:'#1f2937',
      textMuted:'#4b5563',
      textSoft:'#6b7280',
      tabBar:'rgba(255,250,240,.98)',
      tableHead:'rgba(250,245,236,.98)',
      tableStripe:'rgba(255,252,245,.96)',
      tableHover:'rgba(254,243,199,.26)',
      inputBg:'#fffef8',
      chipBg:'rgba(255,248,235,.96)',
      blur:'0px'
    },
    night:{
      tone:'dark',
      stageBg:'linear-gradient(180deg,#06101f 0%,#0b1628 48%,#0f1e36 100%)',
      stageBorder:'rgba(96,165,250,.18)',
      stageAura:'radial-gradient(circle at 0% 0%,rgba(59,130,246,.14),transparent 30%),radial-gradient(circle at 100% 0%,rgba(16,185,129,.10),transparent 32%)',
      stageShadow:'0 20px 52px rgba(2,6,23,.30)',
      surfaceBg:'linear-gradient(180deg,rgba(15,23,42,.84),rgba(15,23,42,.72))',
      surfaceStrong:'linear-gradient(180deg,rgba(15,23,42,.96),rgba(15,23,42,.88))',
      headerBg:'linear-gradient(135deg,rgba(15,23,42,.95),rgba(15,23,42,.78))',
      border:'rgba(148,163,184,.22)',
      borderStrong:'rgba(96,165,250,.28)',
      text:'#eff6ff',
      textMuted:'#dbeafe',
      textSoft:'#93c5fd',
      tabBar:'rgba(15,23,42,.74)',
      tableHead:'rgba(15,23,42,.94)',
      tableStripe:'rgba(15,23,42,.62)',
      tableHover:'rgba(30,41,59,.86)',
      inputBg:'rgba(15,23,42,.92)',
      chipBg:'rgba(15,23,42,.90)',
      blur:'12px'
    }
  };
  var _r14PresetMap = {
    'executive-glass': { surface:'glass', accent:'blue', density:'comfortable', radius:'xl', depth:'medium', header:'hero', tabs:'pill', card:'glass', maxWidth:'1360', gap:'18', table:'clean' },
    'operator-command': { surface:'solid', accent:'emerald', density:'compact', radius:'lg', depth:'flat', header:'banner', tabs:'segment', card:'solid', maxWidth:'fluid', gap:'12', table:'grid' },
    'audit-ledger': { surface:'paper', accent:'amber', density:'comfortable', radius:'md', depth:'flat', header:'minimal', tabs:'underline', card:'outline', maxWidth:'1280', gap:'16', table:'striped' },
    'quality-cleanroom': { surface:'glass', accent:'cyan', density:'comfortable', radius:'xl', depth:'soft', header:'banner', tabs:'pill', card:'glass', maxWidth:'1360', gap:'16', table:'clean' },
    'night-ops': { surface:'night', accent:'violet', density:'compact', radius:'lg', depth:'medium', header:'hero', tabs:'segment', card:'glass', maxWidth:'1440', gap:'14', table:'grid' }
  };
  function _r14InferPreset(schema){
    var domain = ((((schema || {}).meta || {}).domain) || '').toLowerCase();
    if(domain === 'production' || domain === 'warehouse') return 'operator-command';
    if(domain === 'quality' || domain === 'audit' || domain === 'compliance') return 'audit-ledger';
    if(domain === 'maintenance' || domain === 'mes') return 'night-ops';
    return 'executive-glass';
  }
  function _r14ResolveRuntimeDesign(schema){
    var raw = _r14IsObject(schema && schema.runtimeDesign) ? _r14Clone(schema.runtimeDesign) : {};
    var preset = raw.preset || _r14InferPreset(schema);
    var design = _r14Merge(_r14Clone(_r14PresetMap[preset] || _r14PresetMap['executive-glass']), raw);
    var surface = _r14SurfaceMap[design.surface] || _r14SurfaceMap.glass;
    var accent = _r14AccentMap[design.accent] || _r14AccentMap.blue;
    var densityMap = {
      compact:{ block:'12px', header:'14px 16px', title:'26px', gap:'12px', input:'10px 12px' },
      comfortable:{ block:'16px', header:'18px 20px', title:'30px', gap:'18px', input:'11px 13px' },
      spacious:{ block:'20px', header:'22px 24px', title:'34px', gap:'24px', input:'13px 15px' }
    };
    var depthMap = {
      flat:{ stage:'0 8px 18px rgba(15,23,42,.05)', card:'0 2px 8px rgba(15,23,42,.04)' },
      soft:{ stage:'0 16px 38px rgba(15,23,42,.07)', card:'0 10px 24px rgba(15,23,42,.06)' },
      medium:{ stage:surface.stageShadow, card:'0 14px 34px rgba(15,23,42,.09)' },
      deep:{ stage:'0 24px 60px rgba(15,23,42,.12)', card:'0 18px 42px rgba(15,23,42,.12)' }
    };
    var density = densityMap[design.density] || densityMap.comfortable;
    var depth = depthMap[design.depth] || depthMap.medium;
    var radiusPx = { md:'16px', lg:'20px', xl:'24px' }[design.radius] || '20px';
    var maxWidth = design.maxWidth === 'fluid' ? 'none' : ((parseInt(design.maxWidth, 10) || 1360) + 'px');
    return {
      preset:preset,
      surface:design.surface || 'glass',
      accent:design.accent || 'blue',
      density:design.density || 'comfortable',
      radius:design.radius || 'lg',
      depth:design.depth || 'medium',
      header:design.header || 'hero',
      tabs:design.tabs || 'pill',
      card:design.card || 'glass',
      table:design.table || 'clean',
      tone:surface.tone,
      stageBg:surface.stageBg,
      stageAura:surface.stageAura,
      stageBorder:surface.stageBorder,
      stageShadow:depth.stage,
      surfaceBg:surface.surfaceBg,
      surfaceStrong:surface.surfaceStrong,
      headerBg:surface.headerBg,
      border:surface.border,
      borderStrong:surface.borderStrong,
      text:surface.text,
      textMuted:surface.textMuted,
      textSoft:surface.textSoft,
      tabBar:surface.tabBar,
      tableHead:surface.tableHead,
      tableStripe:surface.tableStripe,
      tableHover:surface.tableHover,
      inputBg:surface.inputBg,
      chipBg:surface.chipBg,
      blur:surface.blur,
      accentColor:accent.accent,
      accentStrong:accent.strong,
      accentSoft:accent.soft,
      accentSoft2:accent.soft2,
      accentText:accent.text,
      focus:accent.focus,
      blockPadding:density.block,
      headerPadding:density.header,
      titleSize:density.title,
      gap:((parseInt(design.gap,10) || parseInt(density.gap,10) || 18) + 'px'),
      inputPadding:density.input,
      radiusPx:radiusPx,
      maxWidth:maxWidth,
      cardShadow:depth.card
    };
  }
  function _r14StageStyleText(vars){
    return [
      '--hmrt-stage-bg:' + vars.stageBg,
      '--hmrt-stage-aura:' + vars.stageAura,
      '--hmrt-stage-border:' + vars.stageBorder,
      '--hmrt-stage-shadow:' + vars.stageShadow,
      '--hmrt-surface-bg:' + vars.surfaceBg,
      '--hmrt-surface-strong:' + vars.surfaceStrong,
      '--hmrt-header-bg:' + vars.headerBg,
      '--hmrt-border:' + vars.border,
      '--hmrt-border-strong:' + vars.borderStrong,
      '--hmrt-text:' + vars.text,
      '--hmrt-text-muted:' + vars.textMuted,
      '--hmrt-text-soft:' + vars.textSoft,
      '--hmrt-tabbar-bg:' + vars.tabBar,
      '--hmrt-table-head:' + vars.tableHead,
      '--hmrt-table-stripe:' + vars.tableStripe,
      '--hmrt-table-hover:' + vars.tableHover,
      '--hmrt-input-bg:' + vars.inputBg,
      '--hmrt-chip-bg:' + vars.chipBg,
      '--hmrt-chip-text:' + vars.textMuted,
      '--hmrt-blur:' + vars.blur,
      '--hmrt-accent:' + vars.accentColor,
      '--hmrt-accent-strong:' + vars.accentStrong,
      '--hmrt-accent-soft:' + vars.accentSoft,
      '--hmrt-accent-soft-2:' + vars.accentSoft2,
      '--hmrt-accent-text:' + vars.accentText,
      '--hmrt-focus:' + vars.focus,
      '--hmrt-block-padding:' + vars.blockPadding,
      '--hmrt-header-padding:' + vars.headerPadding,
      '--hmrt-title-size:' + vars.titleSize,
      '--hmrt-gap:' + vars.gap,
      '--hmrt-input-padding:' + vars.inputPadding,
      '--hmrt-radius:' + vars.radiusPx,
      '--hmrt-card-shadow:' + vars.cardShadow,
      '--hmrt-max-width:' + vars.maxWidth,
      '--hmrt-font: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ].join(';');
  }
  function _r14EnsureRuntimeDesignStyle(){
    var style;
    if(typeof document === 'undefined' || !document.createElement || document.getElementById('hm-runtime-design-round14-style')) return;
    style = document.createElement('style');
    style.id = 'hm-runtime-design-round14-style';
    style.textContent = [
      '.hm-runtime-design-stage{position:relative;padding:20px;border-radius:28px;background:var(--hmrt-stage-bg);border:1px solid var(--hmrt-stage-border);box-shadow:var(--hmrt-stage-shadow);overflow:hidden;color:var(--hmrt-text);font-family:var(--hmrt-font)}',
      '.hm-runtime-design-stage:before{content:"";position:absolute;inset:0;background:var(--hmrt-stage-aura);pointer-events:none}',
      '.hm-runtime-design-stage>*{position:relative;z-index:1}',
      '.hm-runtime-design-inner{width:100%;max-width:var(--hmrt-max-width);margin:0 auto}',
      '.hm-runtime-design-stage .hm-page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:var(--hmrt-header-padding);border-radius:calc(var(--hmrt-radius) + 2px);background:var(--hmrt-header-bg);border:1px solid var(--hmrt-border);backdrop-filter:blur(var(--hmrt-blur));-webkit-backdrop-filter:blur(var(--hmrt-blur));box-shadow:var(--hmrt-card-shadow);margin-bottom:var(--hmrt-gap)}',
      '.hm-runtime-design-stage[data-rt-header="minimal"] .hm-page-header{padding:0;background:none;border:0;box-shadow:none;border-radius:0}',
      '.hm-runtime-design-stage[data-rt-header="banner"] .hm-page-header{background:linear-gradient(90deg,var(--hmrt-accent-soft),rgba(255,255,255,0));}',
      '.hm-runtime-design-stage .hm-page-title{margin:0;font-size:var(--hmrt-title-size);line-height:1.08;font-weight:800;letter-spacing:-.02em;color:var(--hmrt-text)}',
      '.hm-runtime-design-stage .hm-page-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:14px;background:var(--hmrt-accent-soft);margin-right:10px}',
      '.hm-runtime-design-stage .hm-page-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.hm-runtime-design-stage .hm-tab-bar{display:flex;flex-wrap:wrap;gap:10px;padding:8px;border-radius:999px;background:var(--hmrt-tabbar-bg);border:1px solid var(--hmrt-border);backdrop-filter:blur(calc(var(--hmrt-blur) * .75));-webkit-backdrop-filter:blur(calc(var(--hmrt-blur) * .75));margin-bottom:var(--hmrt-gap)}',
      '.hm-runtime-design-stage[data-rt-tabs="underline"] .hm-tab-bar{padding:0;border:0;border-radius:0;background:none;backdrop-filter:none;-webkit-backdrop-filter:none}',
      '.hm-runtime-design-stage .hm-tab{padding:10px 14px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--hmrt-text-muted);cursor:pointer;transition:all .16s ease}',
      '.hm-runtime-design-stage[data-rt-tabs="segment"] .hm-tab{background:var(--hmrt-surface-bg);border-color:var(--hmrt-border)}',
      '.hm-runtime-design-stage[data-rt-tabs="underline"] .hm-tab{padding:10px 4px;border-radius:0;border:0;border-bottom:2px solid transparent}',
      '.hm-runtime-design-stage .hm-tab-active{background:linear-gradient(135deg,var(--hmrt-accent-soft),rgba(255,255,255,.25));border-color:var(--hmrt-accent-soft-2);color:var(--hmrt-text);box-shadow:0 10px 22px rgba(15,23,42,.08)}',
      '.hm-runtime-design-stage[data-rt-tabs="underline"] .hm-tab-active{background:none;box-shadow:none;border-bottom-color:var(--hmrt-accent);color:var(--hmrt-text)}',
      '.hm-runtime-design-stage .hm-blocks-container{display:grid;gap:var(--hmrt-gap)}',
      '.hm-runtime-design-stage .hm-block,.hm-runtime-design-stage .hm-card,.hm-runtime-design-stage .hm-kpi-card,.hm-runtime-design-stage .hm-chart-shell,.hm-runtime-design-stage .hm-record-detail,.hm-runtime-design-stage .hm-machine-card,.hm-runtime-design-stage .hm-gantt,.hm-runtime-design-stage .hm-kanban-column,.hm-runtime-design-stage .hm-kanban-card,.hm-runtime-design-stage .hm-filter-bar,.hm-runtime-design-stage .hm-form,.hm-runtime-design-stage .hm-banner,.hm-runtime-design-stage .hm-table-wrapper{position:relative;border-radius:var(--hmrt-radius);background:var(--hmrt-surface-bg);border:1px solid var(--hmrt-border);box-shadow:var(--hmrt-card-shadow);backdrop-filter:blur(calc(var(--hmrt-blur) * .75));-webkit-backdrop-filter:blur(calc(var(--hmrt-blur) * .75));overflow:hidden}',
      '.hm-runtime-design-stage[data-rt-card="solid"] .hm-block,.hm-runtime-design-stage[data-rt-card="solid"] .hm-card,.hm-runtime-design-stage[data-rt-card="solid"] .hm-kpi-card,.hm-runtime-design-stage[data-rt-card="solid"] .hm-chart-shell,.hm-runtime-design-stage[data-rt-card="solid"] .hm-record-detail,.hm-runtime-design-stage[data-rt-card="solid"] .hm-machine-card,.hm-runtime-design-stage[data-rt-card="solid"] .hm-gantt,.hm-runtime-design-stage[data-rt-card="solid"] .hm-kanban-column,.hm-runtime-design-stage[data-rt-card="solid"] .hm-kanban-card,.hm-runtime-design-stage[data-rt-card="solid"] .hm-filter-bar,.hm-runtime-design-stage[data-rt-card="solid"] .hm-form,.hm-runtime-design-stage[data-rt-card="solid"] .hm-banner,.hm-runtime-design-stage[data-rt-card="solid"] .hm-table-wrapper{background:var(--hmrt-surface-strong);backdrop-filter:none;-webkit-backdrop-filter:none}',
      '.hm-runtime-design-stage[data-rt-card="outline"] .hm-block,.hm-runtime-design-stage[data-rt-card="outline"] .hm-card,.hm-runtime-design-stage[data-rt-card="outline"] .hm-kpi-card,.hm-runtime-design-stage[data-rt-card="outline"] .hm-chart-shell,.hm-runtime-design-stage[data-rt-card="outline"] .hm-record-detail,.hm-runtime-design-stage[data-rt-card="outline"] .hm-machine-card,.hm-runtime-design-stage[data-rt-card="outline"] .hm-gantt,.hm-runtime-design-stage[data-rt-card="outline"] .hm-kanban-column,.hm-runtime-design-stage[data-rt-card="outline"] .hm-kanban-card,.hm-runtime-design-stage[data-rt-card="outline"] .hm-filter-bar,.hm-runtime-design-stage[data-rt-card="outline"] .hm-form,.hm-runtime-design-stage[data-rt-card="outline"] .hm-banner,.hm-runtime-design-stage[data-rt-card="outline"] .hm-table-wrapper{background:transparent;box-shadow:none}',
      '.hm-runtime-design-stage .hm-block-header,.hm-runtime-design-stage .hm-card-header,.hm-runtime-design-stage .hm-table-titlebar,.hm-runtime-design-stage .hm-record-detail-head,.hm-runtime-design-stage .hm-machine-card-head,.hm-runtime-design-stage .hm-kanban-column-head,.hm-runtime-design-stage .hm-modal-header,.hm-runtime-design-stage .hm-form-modal-header,.hm-runtime-design-stage .hm-form-wizard-header{padding:14px 16px;border-bottom:1px solid var(--hmrt-border);background:var(--hmrt-header-bg);color:var(--hmrt-text)}',
      '.hm-runtime-design-stage .hm-block-title,.hm-runtime-design-stage .hm-card-title,.hm-runtime-design-stage .hm-record-detail-title,.hm-runtime-design-stage .hm-machine-card-top,.hm-runtime-design-stage .hm-tab,.hm-runtime-design-stage strong,.hm-runtime-design-stage h1,.hm-runtime-design-stage h2,.hm-runtime-design-stage h3,.hm-runtime-design-stage h4{color:var(--hmrt-text)}',
      '.hm-runtime-design-stage .hm-block-content,.hm-runtime-design-stage .hm-card-body,.hm-runtime-design-stage .hm-filter-bar,.hm-runtime-design-stage .hm-form,.hm-runtime-design-stage .hm-banner,.hm-runtime-design-stage .hm-record-detail-body,.hm-runtime-design-stage .hm-machine-status-grid,.hm-runtime-design-stage .hm-gantt{padding:var(--hmrt-block-padding)}',
      '.hm-runtime-design-stage .hm-table{width:100%;border-collapse:separate;border-spacing:0;color:var(--hmrt-text)}',
      '.hm-runtime-design-stage .hm-table th{background:var(--hmrt-table-head);color:var(--hmrt-text-muted);font-weight:700;border-bottom:1px solid var(--hmrt-border);padding:12px 14px;text-align:left}',
      '.hm-runtime-design-stage .hm-table td{padding:12px 14px;border-bottom:1px solid var(--hmrt-border)}',
      '.hm-runtime-design-stage[data-rt-table="striped"] .hm-table tbody tr:nth-child(even){background:var(--hmrt-table-stripe)}',
      '.hm-runtime-design-stage .hm-table tbody tr:hover{background:var(--hmrt-table-hover)}',
      '.hm-runtime-design-stage[data-rt-table="grid"] .hm-table th,.hm-runtime-design-stage[data-rt-table="grid"] .hm-table td{border-right:1px solid var(--hmrt-border)}',
      '.hm-runtime-design-stage[data-rt-table="grid"] .hm-table th:last-child,.hm-runtime-design-stage[data-rt-table="grid"] .hm-table td:last-child{border-right:0}',
      '.hm-runtime-design-stage .hm-btn{border-radius:14px;border:1px solid var(--hmrt-border);background:var(--hmrt-surface-strong);color:var(--hmrt-text);padding:10px 14px;transition:all .16s ease}',
      '.hm-runtime-design-stage .hm-btn-primary{background:linear-gradient(135deg,var(--hmrt-accent),var(--hmrt-accent-strong));border-color:transparent;color:#fff}',
      '.hm-runtime-design-stage .hm-btn-secondary,.hm-runtime-design-stage .hm-btn-ghost{background:var(--hmrt-surface-bg)}',
      '.hm-runtime-design-stage .hm-input,.hm-runtime-design-stage .hm-select,.hm-runtime-design-stage .hm-textarea, .hm-runtime-design-stage input[type="text"],.hm-runtime-design-stage input[type="number"],.hm-runtime-design-stage input[type="date"],.hm-runtime-design-stage select,.hm-runtime-design-stage textarea{border-radius:14px;border:1px solid var(--hmrt-border);background:var(--hmrt-input-bg);color:var(--hmrt-text);padding:var(--hmrt-input-padding)}',
      '.hm-runtime-design-stage .hm-input:focus,.hm-runtime-design-stage .hm-select:focus,.hm-runtime-design-stage .hm-textarea:focus,.hm-runtime-design-stage input:focus,.hm-runtime-design-stage select:focus,.hm-runtime-design-stage textarea:focus{outline:2px solid var(--hmrt-focus);outline-offset:1px;border-color:var(--hmrt-accent)}',
      '.hm-runtime-design-stage .hm-badge,.hm-runtime-design-stage .hm-record-detail-chip,.hm-runtime-design-stage .hm-record-detail-meta>span{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px;background:var(--hmrt-chip-bg);border:1px solid var(--hmrt-border);color:var(--hmrt-chip-text)}',
      '.hm-runtime-design-stage .hm-empty,.hm-runtime-design-stage .hm-empty-icon,.hm-runtime-design-stage .hm-hint,.hm-runtime-design-stage .hm-kpi-label,.hm-runtime-design-stage .hm-card-subtitle,.hm-runtime-design-stage .hm-record-detail-subtitle,.hm-runtime-design-stage .hm-kanban-count,.hm-runtime-design-stage .hm-table-rowcount,.hm-runtime-design-stage .hm-table-info,.hm-runtime-design-stage .hm-block-caption{color:var(--hmrt-text-soft)}',
      '.hm-runtime-design-stage .hm-kpi-value,.hm-runtime-design-stage .hm-record-value,.hm-runtime-design-stage .hm-machine-label,.hm-runtime-design-stage .hm-record-detail-value{color:var(--hmrt-text)}',
      '.hm-runtime-design-stage[data-rt-tone="dark"] .hm-btn,.hm-runtime-design-stage[data-rt-tone="dark"] .hm-input,.hm-runtime-design-stage[data-rt-tone="dark"] .hm-select,.hm-runtime-design-stage[data-rt-tone="dark"] .hm-textarea{color:var(--hmrt-text)}',
      '.hm-runtime-design-stage[data-rt-density="compact"] .hm-block-content{padding:12px}.hm-runtime-design-stage[data-rt-density="compact"] .hm-page-header{padding:14px 16px}.hm-runtime-design-stage[data-rt-density="compact"] .hm-tab{padding:8px 12px}.hm-runtime-design-stage[data-rt-density="compact"] .hm-table th,.hm-runtime-design-stage[data-rt-density="compact"] .hm-table td{padding:10px 12px}',
      '.hm-runtime-design-stage[data-rt-density="spacious"] .hm-block-content{padding:20px}.hm-runtime-design-stage[data-rt-density="spacious"] .hm-page-header{padding:24px}.hm-runtime-design-stage[data-rt-density="spacious"] .hm-tab{padding:12px 16px}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="solid"]{background:var(--hmrt-surface-strong);backdrop-filter:none;-webkit-backdrop-filter:none}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="outline"]{background:transparent;box-shadow:none}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="ghost"]{background:transparent;border-style:dashed;box-shadow:none}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="contrast"]{background:linear-gradient(135deg,var(--hmrt-accent-soft),var(--hmrt-surface-strong));border-color:var(--hmrt-accent-soft-2)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="positive"]{border-color:rgba(5,150,105,.30)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="warning"]{border-color:rgba(217,119,6,.30)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="critical"]{border-color:rgba(220,38,38,.30)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="info"]{border-color:var(--hmrt-accent-soft-2)}',
      '.hm-runtime-design-stage .hm-block[data-rt-density="compact"] .hm-block-content{padding:10px!important}',
      '.hm-runtime-design-stage .hm-block[data-rt-density="spacious"] .hm-block-content{padding:22px!important}',
      '.hm-runtime-design-stage .hm-block-caption{margin:10px 0 0;font-size:12px;line-height:1.5}',
      '@media (max-width: 920px){.hm-runtime-design-stage{padding:16px}.hm-runtime-design-stage .hm-page-header{flex-direction:column}.hm-runtime-design-stage .hm-tab-bar{border-radius:20px}}'
    ].join('');
    document.head.appendChild(style);
  }
  function _r14EnsureHost(container){
    var stage, inner;
    if(typeof document === 'undefined' || !container || !document.createElement) return { stage:null, inner:container };
    stage = container.querySelector ? container.querySelector('.hm-runtime-design-stage[data-hm-runtime-stage="1"]') : null;
    if(!stage){
      while(container.firstChild) container.removeChild(container.firstChild);
      stage = document.createElement('div');
      stage.className = 'hm-runtime-design-stage';
      stage.setAttribute('data-hm-runtime-stage', '1');
      inner = document.createElement('div');
      inner.className = 'hm-runtime-design-inner';
      stage.appendChild(inner);
      container.appendChild(stage);
    }
    inner = stage.querySelector('.hm-runtime-design-inner');
    if(!inner){
      inner = document.createElement('div');
      inner.className = 'hm-runtime-design-inner';
      stage.appendChild(inner);
    }
    return { stage:stage, inner:inner };
  }
  function _r14ApplyStage(stage, vars){
    if(!stage) return;
    stage.setAttribute('data-rt-preset', vars.preset || 'executive-glass');
    stage.setAttribute('data-rt-surface', vars.surface || 'glass');
    stage.setAttribute('data-rt-tone', vars.tone || 'light');
    stage.setAttribute('data-rt-density', vars.density || 'comfortable');
    stage.setAttribute('data-rt-header', vars.header || 'hero');
    stage.setAttribute('data-rt-tabs', vars.tabs || 'pill');
    stage.setAttribute('data-rt-card', vars.card || 'glass');
    stage.setAttribute('data-rt-table', vars.table || 'clean');
    stage.setAttribute('data-rt-radius', vars.radius || 'lg');
    stage.setAttribute('data-rt-max-width', vars.maxWidth || '1360');
    stage.style.cssText = _r14StageStyleText(vars);
  }
  function _r14WalkBlocks(list, out){
    out = out || [];
    (list || []).forEach(function(block){
      out.push(block);
      if(block && block.slots){
        Object.keys(block.slots).forEach(function(slotKey){ _r14WalkBlocks(block.slots[slotKey] || [], out); });
      }
    });
    return out;
  }
  function _r14BlockMap(schema){
    var map = {};
    (schema && schema.tabs ? schema.tabs : []).forEach(function(tab){
      _r14WalkBlocks(tab.blocks || [], []).forEach(function(block){ map[String(block.id || block.blockId || '')] = block; });
    });
    return map;
  }
  function _r14ApplyBlockDesign(stage, schema){
    var map = _r14BlockMap(schema || {});
    if(!stage || !stage.querySelectorAll) return;
    Array.prototype.forEach.call(stage.querySelectorAll('.hm-block[data-block-id]'), function(node){
      var block = map[String(node.getAttribute('data-block-id') || '')] || {};
      var design = (((block || {}).config || {}).design) || {};
      var caption, headerEl, contentEl;
      if(design.surfaceVariant) node.setAttribute('data-rt-surface-variant', String(design.surfaceVariant));
      if(design.semanticTone) node.setAttribute('data-rt-tone', String(design.semanticTone));
      if(design.density) node.setAttribute('data-rt-density', String(design.density));
      if(design.themePreset) node.setAttribute('data-rt-theme-preset', _r14Slug(design.themePreset));
      if(design.cardRadius){
        if(design.cardRadius === 'md') node.style.setProperty('--hmrt-radius','16px');
        else if(design.cardRadius === 'lg') node.style.setProperty('--hmrt-radius','20px');
        else if(design.cardRadius === 'xl') node.style.setProperty('--hmrt-radius','24px');
        else if(design.cardRadius === 'sm') node.style.setProperty('--hmrt-radius','12px');
      }
      if(_r14IsObject(design.cssVars)){
        Object.keys(design.cssVars).forEach(function(key){
          if(/^--[a-zA-Z0-9_-]+$/.test(key)) node.style.setProperty(key, String(design.cssVars[key]));
        });
      }
      if(design.className && node.classList){
        String(design.className).split(/\s+/).filter(Boolean).forEach(function(cls){ node.classList.add(cls); });
      }
      caption = design.caption;
      if(caption){
        headerEl = node.querySelector('.hm-block-header');
        contentEl = node.querySelector('.hm-block-content');
        if(contentEl && !node.querySelector('.hm-block-caption')){
          var p = document.createElement('div');
          p.className = 'hm-block-caption';
          p.textContent = String(caption);
          if(headerEl && headerEl.nextSibling) node.insertBefore(p, contentEl);
          else if(contentEl.parentNode) contentEl.parentNode.insertBefore(p, contentEl);
        }
      }
    });
  }

  renderModuleFromSchema = function(container, schema, options){
    var host, vars, result;
    _r14EnsureRuntimeDesignStyle();
    host = _r14EnsureHost(container);
    vars = _r14ResolveRuntimeDesign(schema || {});
    _r14ApplyStage(host.stage, vars);
    result = _r14PrevRenderModuleFromSchema(host.inner, schema, options);
    _r14ApplyBlockDesign(host.stage, schema || {});
    return result;
  };
  BE.renderModuleFromSchema = renderModuleFromSchema;
  BE.resolveRuntimeDesign = _r14ResolveRuntimeDesign;
  BE.getRuntimeDesignTokens = _r14ResolveRuntimeDesign;

  var ROUND14_TEMPLATES = {
    'r14-executive-hero-banner': { type:'info-banner', title:{ vi:'Executive Hero Banner', en:'Executive Hero Banner' }, config:{ type:'info', icon:'🧭', text:'Overview with decision context, confidence and next action.', textEn:'Overview with decision context, confidence and next action.' }, meta:{ module:'builder-round14', category:'presentation' } },
    'r14-command-kpi-strip': { type:'kpi-row', title:{ vi:'Command KPI Strip', en:'Command KPI Strip' }, config:{ items:[ { label:{vi:'Signal', en:'Signal'}, color:'var(--brand-2)' }, { label:{vi:'Action', en:'Action'}, color:'var(--green)' }, { label:{vi:'Risk', en:'Risk'}, color:'var(--amber)' }, { label:{vi:'Review', en:'Review'}, color:'var(--red)' } ] }, meta:{ module:'builder-round14', category:'presentation' } },
    'r14-operator-filter-bar': { type:'filter-bar', title:{ vi:'Operator Filter Bar', en:'Operator Filter Bar' }, config:{ filters:[ { key:'keyword', type:'search', placeholder:{ vi:'Tìm lệnh / mã / máy', en:'Search order / code / machine' } }, { key:'status', type:'select' }, { key:'owner', type:'select' } ] }, meta:{ module:'builder-round14', category:'presentation' } },
    'r14-evidence-ledger-table': { type:'data-table', title:{ vi:'Evidence Ledger Table', en:'Evidence Ledger Table' }, config:{ pageSize:8, columns:[ { key:'trace_id', label:{vi:'Trace', en:'Trace'}, type:'text' }, { key:'headline', label:{vi:'Headline', en:'Headline'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round14', category:'presentation' } },
    'r14-review-action-table': { type:'data-table', title:{ vi:'Review Action Table', en:'Review Action Table' }, config:{ pageSize:8, columns:[ { key:'action', label:{vi:'Action', en:'Action'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'window', label:{vi:'Window', en:'Window'}, type:'text' }, { key:'priority', label:{vi:'Priority', en:'Priority'}, type:'badge' } ] }, meta:{ module:'builder-round14', category:'presentation' } },
    'r14-night-ops-kpi-strip': { type:'kpi-row', title:{ vi:'Night Ops KPI Strip', en:'Night Ops KPI Strip' }, config:{ items:[ { label:{vi:'Ready', en:'Ready'}, color:'var(--green)' }, { label:{vi:'Blocked', en:'Blocked'}, color:'var(--red)' }, { label:{vi:'Escalation', en:'Escalation'}, color:'var(--amber)' }, { label:{vi:'Telemetry', en:'Telemetry'}, color:'var(--brand-2)' } ] }, meta:{ module:'builder-round14', category:'presentation' } }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  Object.keys(ROUND14_TEMPLATES).forEach(function(key){
    BE.BLOCK_TEMPLATES[key] = ROUND14_TEMPLATES[key];
    BE.EXTRA_TEMPLATES[key] = ROUND14_TEMPLATES[key];
  });
  BE.MODULE_BUILDER_RUNTIME_DESIGN_VERSION = '2026-04-08-r14-serious';
  BE.MODULE_BUILDER_ROUND14_TEMPLATES = Object.keys(ROUND14_TEMPLATES);
  window.__HM_BE_R14_TEST__ = {
    version:'2026-04-08-r14-serious',
    resolveRuntimeDesign:function(schema){ return _r14ResolveRuntimeDesign(schema || {}); },
    stageStyleText:function(schema){ return _r14StageStyleText(_r14ResolveRuntimeDesign(schema || {})); }
  };
})();


/* ============================================================================
 * HESEM MOM — Runtime Preset Library (Round 15 Serious)
 * Presets and block styling for generated modules.
 * ============================================================================ */
(function(){
  if(window.__HM_BE_R15_RUNTIME_PRESETS__) return;
  window.__HM_BE_R15_RUNTIME_PRESETS__ = true;

  var BE = window.HmBlockEngine || {};
  var _r15PrevRenderModuleFromSchema = renderModuleFromSchema;
  var _r15PrevResolveRuntimeDesign = BE.resolveRuntimeDesign || BE.getRuntimeDesignTokens || function(){ return {}; };

  function _r15Clone(value){ return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function _r15IsObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }
  function _r15Merge(target, source){
    target = _r15IsObject(target) ? target : {};
    Object.keys(source || {}).forEach(function(key){
      var src = source[key];
      if(_r15IsObject(src)){
        if(!_r15IsObject(target[key])) target[key] = {};
        _r15Merge(target[key], src);
      } else if(src !== undefined){
        target[key] = src;
      }
    });
    return target;
  }
  function _r15Slug(value){ return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'default'; }
  function _r15WalkBlocks(list, out){
    out = out || [];
    (list || []).forEach(function(block){
      if(!block) return;
      out.push(block);
      if(block.slots){ Object.keys(block.slots).forEach(function(slotKey){ _r15WalkBlocks(block.slots[slotKey] || [], out); }); }
    });
    return out;
  }
  function _r15BlockMap(schema){
    var map = {};
    (schema && schema.tabs ? schema.tabs : []).forEach(function(tab){
      _r15WalkBlocks(tab.blocks || [], []).forEach(function(block){ map[String(block.id || block.blockId || '')] = block; });
    });
    return map;
  }

  var _r15AccentMap = {
    blue:{ accent:'#2563eb', strong:'#1d4ed8', soft:'rgba(37,99,235,.14)', soft2:'rgba(37,99,235,.24)', text:'#dbeafe', focus:'rgba(37,99,235,.28)' },
    cyan:{ accent:'#0891b2', strong:'#0e7490', soft:'rgba(8,145,178,.14)', soft2:'rgba(8,145,178,.24)', text:'#cffafe', focus:'rgba(8,145,178,.28)' },
    emerald:{ accent:'#059669', strong:'#047857', soft:'rgba(5,150,105,.14)', soft2:'rgba(5,150,105,.24)', text:'#d1fae5', focus:'rgba(5,150,105,.28)' },
    violet:{ accent:'#7c3aed', strong:'#6d28d9', soft:'rgba(124,58,237,.14)', soft2:'rgba(124,58,237,.24)', text:'#ede9fe', focus:'rgba(124,58,237,.28)' },
    amber:{ accent:'#d97706', strong:'#b45309', soft:'rgba(217,119,6,.14)', soft2:'rgba(217,119,6,.24)', text:'#fef3c7', focus:'rgba(217,119,6,.28)' },
    indigo:{ accent:'#4f46e5', strong:'#4338ca', soft:'rgba(79,70,229,.14)', soft2:'rgba(79,70,229,.24)', text:'#e0e7ff', focus:'rgba(79,70,229,.28)' },
    teal:{ accent:'#0f766e', strong:'#115e59', soft:'rgba(15,118,110,.14)', soft2:'rgba(15,118,110,.24)', text:'#ccfbf1', focus:'rgba(15,118,110,.28)' },
    slate:{ accent:'#334155', strong:'#1e293b', soft:'rgba(51,65,85,.12)', soft2:'rgba(51,65,85,.22)', text:'#e2e8f0', focus:'rgba(51,65,85,.24)' },
    rose:{ accent:'#e11d48', strong:'#be123c', soft:'rgba(225,29,72,.14)', soft2:'rgba(225,29,72,.24)', text:'#ffe4e6', focus:'rgba(225,29,72,.28)' }
  };
  var _r15DensityMap = {
    compact:{ block:'12px', header:'14px 16px', gap:'12', input:'10px 12px', title:'28px', kpiValue:'24px' },
    comfortable:{ block:'16px', header:'18px 20px', gap:'18', input:'11px 13px', title:'30px', kpiValue:'28px' },
    dense:{ block:'10px', header:'12px 14px', gap:'10', input:'8px 10px', title:'26px', kpiValue:'22px' },
    relaxed:{ block:'20px', header:'22px 24px', gap:'22', input:'13px 15px', title:'34px', kpiValue:'30px' },
    spacious:{ block:'20px', header:'22px 24px', gap:'22', input:'13px 15px', title:'34px', kpiValue:'30px' }
  };
  var _r15FontScaleMap = {
    compact:{ base:'13px', titleMul:0.94, line:'1.45' },
    comfortable:{ base:'14px', titleMul:1, line:'1.5' },
    relaxed:{ base:'15px', titleMul:1.06, line:'1.58' }
  };
  var _r15MotionDuration = { none:'0ms', subtle:'120ms', standard:'180ms', expressive:'240ms' };
  var _r15PresetLibrary = {
    'executive-glass': { basePreset:'executive-glass', family:'executive', labelVi:'Executive Glass', labelEn:'Executive Glass', summaryVi:'Glass điều hành cho dashboard tổng quan', summaryEn:'Executive glass for overview dashboards', schema:{ surface:'glass', accent:'blue', density:'comfortable', radius:'xl', depth:'medium', header:'hero', tabs:'pill', card:'glass', table:'clean', button:'glass-primary', badge:'soft', kpi:'executive', form:'glass', frame:'air', motion:'subtle', fontScale:'comfortable', titleWeight:'700', maxWidth:'1360', gap:'18', themeFamily:'executive' } },
    'boardroom-crystal': { basePreset:'executive-glass', family:'executive', labelVi:'Boardroom Crystal', labelEn:'Boardroom Crystal', summaryVi:'Boardroom sáng, rõ, kỷ luật và sang', summaryEn:'Bright, disciplined boardroom finish', schema:{ surface:'glass', accent:'indigo', density:'comfortable', radius:'xl', depth:'soft', header:'split', tabs:'cardbar', card:'glass', table:'clean', button:'clean', badge:'outline', kpi:'executive', form:'glass', frame:'board', motion:'subtle', fontScale:'comfortable', titleWeight:'700', maxWidth:'1360', gap:'18', themeFamily:'executive' } },
    'planning-tower': { basePreset:'executive-glass', family:'enterprise', labelVi:'Planning Tower', labelEn:'Planning Tower', summaryVi:'Tower planning với tab card và KPI rõ', summaryEn:'Planning tower with card tabs and structured KPIs', schema:{ surface:'glass', accent:'indigo', density:'comfortable', radius:'xl', depth:'medium', header:'split', tabs:'cardbar', card:'tinted', table:'clean', button:'glass-primary', badge:'soft', kpi:'executive', form:'clean', frame:'board', motion:'subtle', fontScale:'comfortable', titleWeight:'700', maxWidth:'1440', gap:'18', themeFamily:'enterprise' } },
    'quality-cleanroom': { basePreset:'quality-cleanroom', family:'lab', labelVi:'Quality Cleanroom', labelEn:'Quality Cleanroom', summaryVi:'Sạch, sáng, tương phản cao cho QMS', summaryEn:'Clean high-clarity mode for QMS', schema:{ surface:'glass', accent:'cyan', density:'comfortable', radius:'xl', depth:'soft', header:'banner', tabs:'underline', card:'glass', table:'clean', button:'clean', badge:'outline', kpi:'clean', form:'clean', frame:'board', motion:'subtle', fontScale:'comfortable', titleWeight:'700', maxWidth:'1360', gap:'16', themeFamily:'lab' } },
    'supplier-radar': { basePreset:'quality-cleanroom', family:'lab', labelVi:'Supplier Radar', labelEn:'Supplier Radar', summaryVi:'Theo dõi supplier với table, badge và radar rõ', summaryEn:'Supplier tracking with clear tables and badges', schema:{ surface:'glass', accent:'rose', density:'comfortable', radius:'lg', depth:'soft', header:'split', tabs:'cardbar', card:'glass', table:'striped', button:'clean', badge:'soft', kpi:'clean', form:'clean', frame:'board', motion:'subtle', fontScale:'comfortable', titleWeight:'700', maxWidth:'1440', gap:'18', themeFamily:'lab' } },
    'audit-ledger': { basePreset:'audit-ledger', family:'enterprise', labelVi:'Audit Ledger', labelEn:'Audit Ledger', summaryVi:'Ledger giấy cho audit, traceability, evidence', summaryEn:'Paper ledger for audit, traceability, and evidence', schema:{ surface:'paper', accent:'amber', density:'comfortable', radius:'md', depth:'flat', header:'minimal', tabs:'underline', card:'outline', table:'ledger', button:'ledger', badge:'solid', kpi:'ledger', form:'lined', frame:'paper', motion:'none', fontScale:'comfortable', titleWeight:'700', maxWidth:'1280', gap:'16', themeFamily:'enterprise' } },
    'finance-ledger': { basePreset:'audit-ledger', family:'enterprise', labelVi:'Finance Ledger', labelEn:'Finance Ledger', summaryVi:'Ledger tài chính gọn, nghiêm túc, rõ số liệu', summaryEn:'Focused finance ledger with disciplined data emphasis', schema:{ surface:'paper', accent:'slate', density:'comfortable', radius:'md', depth:'flat', header:'split', tabs:'underline', card:'outline', table:'ledger', button:'ledger', badge:'outline', kpi:'ledger', form:'lined', frame:'paper', motion:'none', fontScale:'comfortable', titleWeight:'700', maxWidth:'1280', gap:'16', themeFamily:'enterprise' } },
    'compliance-paper': { basePreset:'audit-ledger', family:'enterprise', labelVi:'Compliance Paper', labelEn:'Compliance Paper', summaryVi:'Paper mode trung tính cho compliance và signoff', summaryEn:'Neutral paper mode for compliance and signoff', schema:{ surface:'paper', accent:'amber', density:'comfortable', radius:'md', depth:'flat', header:'minimal', tabs:'underline', card:'outline', table:'ledger', button:'ledger', badge:'outline', kpi:'ledger', form:'lined', frame:'paper', motion:'none', fontScale:'comfortable', titleWeight:'700', maxWidth:'1280', gap:'16', themeFamily:'enterprise' } },
    'operator-command': { basePreset:'operator-command', family:'industrial', labelVi:'Operator Command', labelEn:'Operator Command', summaryVi:'Gọn, rõ, ưu tiên thao tác và tốc độ', summaryEn:'Compact and operationally clear', schema:{ surface:'solid', accent:'emerald', density:'compact', radius:'lg', depth:'flat', header:'controlbar', tabs:'segment', card:'solid', table:'grid', button:'signal', badge:'solid', kpi:'signal', form:'compact', frame:'console', motion:'standard', fontScale:'compact', titleWeight:'700', maxWidth:'fluid', gap:'12', themeFamily:'industrial' } },
    'shopfloor-signal': { basePreset:'operator-command', family:'shopfloor', labelVi:'Shopfloor Signal', labelEn:'Shopfloor Signal', summaryVi:'Shopfloor mạnh, tín hiệu rõ, hành động nhanh', summaryEn:'Shopfloor-forward signals and fast action cues', schema:{ surface:'solid', accent:'amber', density:'dense', radius:'lg', depth:'soft', header:'banner', tabs:'segment', card:'elevated', table:'grid', button:'signal', badge:'solid', kpi:'signal', form:'compact', frame:'console', motion:'expressive', fontScale:'compact', titleWeight:'800', maxWidth:'1440', gap:'12', themeFamily:'shopfloor' } },
    'warehouse-handheld': { basePreset:'operator-command', family:'shopfloor', labelVi:'Warehouse Handheld', labelEn:'Warehouse Handheld', summaryVi:'Tối ưu handheld với spacing gọn và nút rõ', summaryEn:'Handheld-first density and touch clarity', schema:{ surface:'solid', accent:'teal', density:'dense', radius:'lg', depth:'soft', header:'banner', tabs:'pill', card:'solid', table:'grid', button:'signal', badge:'solid', kpi:'signal', form:'compact', frame:'board', motion:'standard', fontScale:'compact', titleWeight:'700', maxWidth:'fluid', gap:'12', themeFamily:'shopfloor' } },
    'customer-portal': { basePreset:'executive-glass', family:'enterprise', labelVi:'Customer Portal', labelEn:'Customer Portal', summaryVi:'Portal sáng, thân thiện, có glass nhẹ', summaryEn:'Friendly portal with restrained glass surfaces', schema:{ surface:'glass', accent:'blue', density:'comfortable', radius:'xl', depth:'soft', header:'banner', tabs:'pill', card:'glass', table:'clean', button:'clean', badge:'soft', kpi:'clean', form:'clean', frame:'air', motion:'subtle', fontScale:'comfortable', titleWeight:'700', maxWidth:'1360', gap:'18', themeFamily:'enterprise' } },
    'night-ops': { basePreset:'night-ops', family:'dark-ops', labelVi:'Night Ops', labelEn:'Night Ops', summaryVi:'Control tower đêm, tương phản cao', summaryEn:'High-contrast night control tower', schema:{ surface:'night', accent:'violet', density:'compact', radius:'lg', depth:'medium', header:'hero', tabs:'segment', card:'glass', table:'grid', button:'signal', badge:'soft', kpi:'signal', form:'solid', frame:'console', motion:'standard', fontScale:'comfortable', titleWeight:'700', maxWidth:'1440', gap:'14', themeFamily:'dark-ops' } },
    'maintenance-night': { basePreset:'night-ops', family:'dark-ops', labelVi:'Maintenance Night', labelEn:'Maintenance Night', summaryVi:'Night mode cho maintenance và incident response', summaryEn:'Night mode for maintenance and incident response', schema:{ surface:'night', accent:'cyan', density:'compact', radius:'lg', depth:'medium', header:'split', tabs:'segment', card:'glass', table:'grid', button:'signal', badge:'solid', kpi:'signal', form:'solid', frame:'console', motion:'standard', fontScale:'comfortable', titleWeight:'700', maxWidth:'1440', gap:'14', themeFamily:'dark-ops' } }
  };

  function _r15CanonicalAccent(accent){ return /^(blue|cyan|emerald|violet|amber)$/.test(String(accent || '')) ? String(accent) : 'blue'; }
  function _r15CanonicalDensity(density){ density = String(density || 'comfortable'); if(density === 'dense') return 'compact'; if(density === 'relaxed') return 'spacious'; return density; }
  function _r15CanonicalHeader(header){ return header === 'split' ? 'hero' : (header === 'controlbar' ? 'banner' : header); }
  function _r15CanonicalTabs(tabs){ return tabs === 'cardbar' ? 'segment' : tabs; }
  function _r15CanonicalCard(card){ return card === 'tinted' || card === 'elevated' ? 'glass' : card; }
  function _r15CanonicalTable(table){ return table === 'ledger' ? 'striped' : table; }
  function _r15InferPreset(schema){
    var raw = (((schema || {}).runtimeDesign) || {}).preset;
    if(raw && _r15PresetLibrary[raw]) return raw;
    var domain = ((((schema || {}).meta || {}).domain) || '').toLowerCase();
    if(domain === 'production' || domain === 'warehouse') return 'operator-command';
    if(domain === 'quality') return 'quality-cleanroom';
    if(domain === 'audit' || domain === 'compliance') return 'audit-ledger';
    if(domain === 'maintenance' || domain === 'mes') return 'maintenance-night';
    return 'executive-glass';
  }
  function _r15PresetSchema(key){
    var preset = _r15PresetLibrary[key] || _r15PresetLibrary['executive-glass'];
    var schema = _r15Clone(preset.schema || {});
    schema.preset = key in _r15PresetLibrary ? key : 'executive-glass';
    return schema;
  }
  function _r15ResolveRuntimeDesign(schema){
    var raw = _r15IsObject(schema && schema.runtimeDesign) ? _r15Clone(schema.runtimeDesign) : {};
    var presetKey = raw.preset || _r15InferPreset(schema || {});
    var preset = _r15PresetLibrary[presetKey] || _r15PresetLibrary['executive-glass'];
    var design = _r15Merge(_r15PresetSchema(presetKey), raw);
    if(design.density === 'spacious') design.density = 'relaxed';
    var canonicalSchema = {
      meta:_r15Clone(((schema || {}).meta) || {}),
      runtimeDesign:{
        preset:preset.basePreset || 'executive-glass',
        surface:design.surface || 'glass',
        accent:_r15CanonicalAccent(design.accent),
        density:_r15CanonicalDensity(design.density),
        radius:design.radius || 'lg',
        depth:design.depth || 'medium',
        header:_r15CanonicalHeader(design.header || 'hero'),
        tabs:_r15CanonicalTabs(design.tabs || 'pill'),
        card:_r15CanonicalCard(design.card || 'glass'),
        table:_r15CanonicalTable(design.table || 'clean'),
        maxWidth:design.maxWidth || '1360',
        gap:design.gap || '18'
      }
    };
    var base = _r15Clone(_r15PrevResolveRuntimeDesign(canonicalSchema) || {});
    var accent = _r15AccentMap[design.accent] || _r15AccentMap.blue;
    var density = _r15DensityMap[design.density] || _r15DensityMap.comfortable;
    var fontScale = _r15FontScaleMap[design.fontScale] || _r15FontScaleMap.comfortable;
    var titleBase = parseFloat(String(base.titleSize || '').replace('px','')) || 30;
    base.preset = presetKey;
    base.surface = design.surface || base.surface || 'glass';
    base.accent = design.accent || base.accent || 'blue';
    base.density = design.density || 'comfortable';
    base.radius = design.radius || base.radius || 'lg';
    base.depth = design.depth || base.depth || 'medium';
    base.header = design.header || base.header || 'hero';
    base.tabs = design.tabs || base.tabs || 'pill';
    base.card = design.card || base.card || 'glass';
    base.table = design.table || base.table || 'clean';
    base.button = design.button || 'glass-primary';
    base.badge = design.badge || 'soft';
    base.kpi = design.kpi || 'executive';
    base.form = design.form || 'glass';
    base.frame = design.frame || 'air';
    base.motion = design.motion || 'subtle';
    base.fontScale = design.fontScale || 'comfortable';
    base.titleWeight = String(design.titleWeight || '700');
    base.themeFamily = design.themeFamily || preset.schema.themeFamily || preset.family || 'enterprise';
    base.presetLabelVi = preset.labelVi || '';
    base.presetLabelEn = preset.labelEn || '';
    base.presetSummaryVi = preset.summaryVi || '';
    base.presetSummaryEn = preset.summaryEn || '';
    base.accentColor = accent.accent;
    base.accentStrong = accent.strong;
    base.accentSoft = accent.soft;
    base.accentSoft2 = accent.soft2;
    base.accentText = accent.text;
    base.focus = accent.focus;
    base.blockPadding = density.block;
    base.headerPadding = density.header;
    base.titleSize = Math.round(titleBase * fontScale.titleMul) + 'px';
    base.gap = ((parseInt(design.gap, 10) || parseInt(density.gap, 10) || 18) + 'px');
    base.inputPadding = density.input;
    base.fontBase = fontScale.base;
    base.lineHeight = fontScale.line;
    base.kpiValueSize = density.kpiValue;
    base.motionDuration = _r15MotionDuration[design.motion] || _r15MotionDuration.subtle;
    if(design.radius === 'md') base.radiusPx = '16px';
    else if(design.radius === 'lg') base.radiusPx = '20px';
    else if(design.radius === 'xl') base.radiusPx = '24px';
    if(design.frame === 'paper') base.blur = '0px';
    if(design.frame === 'console'){ base.stageShadow = '0 22px 62px rgba(2,6,23,.32)'; }
    if(design.frame === 'board'){ base.stageShadow = '0 18px 48px rgba(15,23,42,.10)'; }
    return base;
  }

  function _r15SetStageVar(stage, key, value){ if(stage && stage.style && value != null) stage.style.setProperty(key, String(value)); }
  function _r15ApplyStage(stage, vars){
    if(!stage) return;
    stage.setAttribute('data-rt-header', vars.header || 'hero');
    stage.setAttribute('data-rt-tabs', vars.tabs || 'pill');
    stage.setAttribute('data-rt-card', vars.card || 'glass');
    stage.setAttribute('data-rt-table', vars.table || 'clean');
    stage.setAttribute('data-rt-density', vars.density || 'comfortable');
    stage.setAttribute('data-rt-button', vars.button || 'glass-primary');
    stage.setAttribute('data-rt-badge', vars.badge || 'soft');
    stage.setAttribute('data-rt-kpi', vars.kpi || 'executive');
    stage.setAttribute('data-rt-form', vars.form || 'glass');
    stage.setAttribute('data-rt-frame', vars.frame || 'air');
    stage.setAttribute('data-rt-motion', vars.motion || 'subtle');
    stage.setAttribute('data-rt-theme-family', vars.themeFamily || 'enterprise');
    _r15SetStageVar(stage, '--hmrt-accent', vars.accentColor);
    _r15SetStageVar(stage, '--hmrt-accent-strong', vars.accentStrong);
    _r15SetStageVar(stage, '--hmrt-accent-soft', vars.accentSoft);
    _r15SetStageVar(stage, '--hmrt-accent-soft-2', vars.accentSoft2);
    _r15SetStageVar(stage, '--hmrt-accent-text', vars.accentText);
    _r15SetStageVar(stage, '--hmrt-focus', vars.focus);
    _r15SetStageVar(stage, '--hmrt-block-padding', vars.blockPadding);
    _r15SetStageVar(stage, '--hmrt-header-padding', vars.headerPadding);
    _r15SetStageVar(stage, '--hmrt-title-size', vars.titleSize);
    _r15SetStageVar(stage, '--hmrt-gap', vars.gap);
    _r15SetStageVar(stage, '--hmrt-input-padding', vars.inputPadding);
    _r15SetStageVar(stage, '--hmrt-radius', vars.radiusPx);
    _r15SetStageVar(stage, '--hmrt-font-base', vars.fontBase);
    _r15SetStageVar(stage, '--hmrt-line-height', vars.lineHeight);
    _r15SetStageVar(stage, '--hmrt-kpi-value-size', vars.kpiValueSize);
    _r15SetStageVar(stage, '--hmrt-title-weight', vars.titleWeight || '700');
    _r15SetStageVar(stage, '--hmrt-motion-duration', vars.motionDuration || '120ms');
  }

  function _r15NormalizeBlockDensity(value){
    value = String(value || '').toLowerCase();
    if(value === 'inherit' || value === 'default') return '';
    if(value === 'dense') return 'dense';
    if(value === 'compact') return 'compact';
    if(value === 'comfortable') return 'comfortable';
    if(value === 'spacious' || value === 'relaxed') return 'relaxed';
    return '';
  }
  function _r15NormalizeSurfaceVariant(value){
    value = String(value || '').toLowerCase();
    if(value === 'default' || value === 'inherit') return '';
    if(value === 'elevated') return 'elevated';
    if(value === 'outlined') return 'outlined';
    if(value === 'tinted') return 'tinted';
    if(value === 'glass') return 'glass';
    if(value === 'solid') return 'solid';
    if(value === 'ghost') return 'outlined';
    if(value === 'contrast') return 'tinted';
    return '';
  }
  function _r15NormalizeTone(value){
    value = String(value || '').toLowerCase();
    if(value === 'default' || value === 'inherit') return '';
    if(value === 'brand') return 'brand';
    if(value === 'info') return 'info';
    if(value === 'success' || value === 'positive') return 'success';
    if(value === 'warning') return 'warning';
    if(value === 'danger' || value === 'critical') return 'danger';
    return '';
  }
  function _r15NormalizeMotion(value){
    value = String(value || '').toLowerCase();
    if(value === 'inherit' || value === 'default') return '';
    if(value === 'none' || value === 'subtle' || value === 'standard' || value === 'expressive') return value;
    return '';
  }
  function _r15NormalizeThemePreset(value){
    value = String(value || '').toLowerCase();
    if(value === 'inherit' || value === 'default') return '';
    if(/^(enterprise|industrial|executive|shopfloor|lab|dark-ops)$/.test(value)) return value;
    return '';
  }
  function _r15NormalizeShellPreset(value){
    value = String(value || '').toLowerCase();
    if(value === 'inherit' || value === 'default') return '';
    if(/^(page|workspace|ops-center|executive-board)$/.test(value)) return value;
    return '';
  }
  function _r15RecommendBlockDesign(block, vars){
    var type = String((block && block.type) || '').toLowerCase();
    var rec = {
      themePreset: vars.themeFamily || 'enterprise',
      motionPreset: vars.motion || 'subtle',
      cardRadius: vars.radius || 'lg'
    };
    function cardToSurface(card){
      if(card === 'outline') return 'outlined';
      if(card === 'solid') return 'solid';
      if(card === 'tinted') return 'tinted';
      if(card === 'elevated') return 'elevated';
      return 'glass';
    }
    rec.surfaceVariant = cardToSurface(vars.card || 'glass');
    rec.semanticTone = vars.surface === 'night' ? 'info' : 'brand';
    if(vars.density === 'dense') rec.density = 'dense';
    else if(vars.density === 'compact') rec.density = 'compact';
    else rec.density = 'comfortable';
    if(type === 'info-banner' || type === 'alert-banner' || type === 'banner'){
      rec.surfaceVariant = 'tinted';
      rec.semanticTone = vars.surface === 'paper' ? 'warning' : 'brand';
      rec.shellPreset = 'page';
    } else if(type === 'kpi-row' || type === 'kpi-grid' || type === 'kpi-card'){
      rec.surfaceVariant = vars.kpi === 'ledger' ? 'outlined' : (vars.kpi === 'signal' ? 'elevated' : 'glass');
      rec.semanticTone = 'brand';
      rec.shellPreset = 'workspace';
      rec.density = vars.density === 'dense' ? 'compact' : rec.density;
    } else if(type === 'data-table' || type === 'table' || type === 'record-detail'){
      rec.surfaceVariant = vars.table === 'ledger' ? 'outlined' : (vars.card === 'solid' ? 'solid' : 'elevated');
      rec.semanticTone = vars.surface === 'paper' ? 'warning' : 'info';
      rec.shellPreset = vars.frame === 'board' ? 'executive-board' : 'workspace';
      rec.density = vars.density === 'dense' ? 'compact' : rec.density;
    } else if(type === 'filter-bar' || type === 'toolbar' || type === 'action-lane'){
      rec.surfaceVariant = vars.form === 'lined' ? 'outlined' : (vars.form === 'solid' || vars.form === 'compact' ? 'solid' : 'glass');
      rec.semanticTone = 'info';
      rec.shellPreset = 'workspace';
      rec.density = vars.density === 'relaxed' ? 'comfortable' : (vars.density || 'compact');
    } else if(type.indexOf('form') >= 0){
      rec.surfaceVariant = vars.form === 'lined' ? 'outlined' : (vars.form === 'solid' || vars.form === 'compact' ? 'solid' : 'glass');
      rec.semanticTone = 'brand';
      rec.shellPreset = vars.frame === 'console' ? 'ops-center' : 'workspace';
      rec.density = vars.density === 'dense' ? 'compact' : rec.density;
    } else if(type.indexOf('chart') >= 0 || type === 'heatmap' || type === 'timeline' || type === 'data-timeline'){
      rec.surfaceVariant = vars.card === 'outline' ? 'outlined' : 'elevated';
      rec.semanticTone = 'info';
      rec.shellPreset = 'executive-board';
    } else if(type.indexOf('kanban') >= 0 || type.indexOf('gantt') >= 0 || type.indexOf('workflow') >= 0){
      rec.surfaceVariant = vars.card === 'solid' ? 'solid' : 'elevated';
      rec.semanticTone = 'brand';
      rec.shellPreset = 'ops-center';
    }
    return rec;
  }
  function _r15ApplyBlockDesign(stage, schema, vars){
    var map = _r15BlockMap(schema || {});
    if(!stage || !stage.querySelectorAll) return;
    Array.prototype.forEach.call(stage.querySelectorAll('.hm-block[data-block-id]'), function(node){
      var block = map[String(node.getAttribute('data-block-id') || '')] || {};
      var design = (((block || {}).config || {}).design) || {};
      var rec = _r15RecommendBlockDesign(block, vars || {});
      var surfaceVariant = _r15NormalizeSurfaceVariant(design.surfaceVariant || rec.surfaceVariant);
      var tone = _r15NormalizeTone(design.semanticTone || rec.semanticTone);
      var density = _r15NormalizeBlockDensity(design.density || rec.density);
      var themePreset = _r15NormalizeThemePreset(design.themePreset || rec.themePreset);
      var shellPreset = _r15NormalizeShellPreset(design.shellPreset || rec.shellPreset);
      var motionPreset = _r15NormalizeMotion(design.motionPreset || rec.motionPreset || vars.motion);
      if(surfaceVariant) node.setAttribute('data-rt-surface-variant', surfaceVariant); else node.removeAttribute('data-rt-surface-variant');
      if(tone) node.setAttribute('data-rt-tone', tone); else node.removeAttribute('data-rt-tone');
      if(density) node.setAttribute('data-rt-density', density); else node.removeAttribute('data-rt-density');
      if(themePreset) node.setAttribute('data-rt-theme-preset', _r15Slug(themePreset)); else node.removeAttribute('data-rt-theme-preset');
      if(shellPreset) node.setAttribute('data-rt-shell-preset', shellPreset); else node.removeAttribute('data-rt-shell-preset');
      if(motionPreset) node.setAttribute('data-rt-motion', motionPreset); else node.removeAttribute('data-rt-motion');
      if(design.visualLanguage && String(design.visualLanguage).toLowerCase() !== 'inherit') node.setAttribute('data-rt-visual-language', _r15Slug(design.visualLanguage));
      if(design.heroMood && String(design.heroMood).toLowerCase() !== 'inherit') node.setAttribute('data-rt-hero-mood', _r15Slug(design.heroMood));
      if(design.iconStyle && String(design.iconStyle).toLowerCase() !== 'inherit') node.setAttribute('data-rt-icon-style', _r15Slug(design.iconStyle));
      if(design.chartStyle && String(design.chartStyle).toLowerCase() !== 'inherit') node.setAttribute('data-rt-chart-style', _r15Slug(design.chartStyle));
      if(design.accentTone && String(design.accentTone).toLowerCase() !== 'inherit'){
        var accentKey = _r15Slug(design.accentTone);
        var accentVars = _r15AccentMap[accentKey];
        node.setAttribute('data-rt-accent-tone', accentKey);
        if(accentVars){
          node.style.setProperty('--hmrt-accent', accentVars.accent);
          node.style.setProperty('--hmrt-accent-strong', accentVars.strong);
          node.style.setProperty('--hmrt-accent-soft', accentVars.soft);
          node.style.setProperty('--hmrt-accent-soft-2', accentVars.soft2);
          node.style.setProperty('--hmrt-focus', accentVars.focus);
        }
      }
      if(design.cardRadius && String(design.cardRadius).toLowerCase() !== 'inherit'){
        if(design.cardRadius === 'md') node.style.setProperty('--hmrt-radius','16px');
        else if(design.cardRadius === 'lg') node.style.setProperty('--hmrt-radius','20px');
        else if(design.cardRadius === 'xl') node.style.setProperty('--hmrt-radius','24px');
        else if(design.cardRadius === 'sm') node.style.setProperty('--hmrt-radius','12px');
      }
      if(design.panelGlass === true) node.setAttribute('data-rt-panel-glass', '1');
      if(_r15IsObject(design.cssVars)){
        Object.keys(design.cssVars).forEach(function(key){
          if(/^--[a-zA-Z0-9_-]+$/.test(key)) node.style.setProperty(key, String(design.cssVars[key]));
        });
      }
    });
  }

  function _r15EnsureRuntimeStyle(){
    var style;
    if(typeof document === 'undefined' || !document.createElement || document.getElementById('hm-runtime-design-round15-style')) return;
    style = document.createElement('style');
    style.id = 'hm-runtime-design-round15-style';
    style.textContent = [
      '.hm-runtime-design-stage{font-size:var(--hmrt-font-base,14px);line-height:var(--hmrt-line-height,1.5)}',
      '.hm-runtime-design-stage .hm-page-title{font-weight:var(--hmrt-title-weight,700)}',
      '.hm-runtime-design-stage .hm-runtime-design-inner{display:grid;gap:var(--hmrt-gap)}',
      '.hm-runtime-design-stage[data-rt-frame="board"]{padding:24px;background:linear-gradient(180deg,var(--hmrt-stage-bg),rgba(255,255,255,.64));}',
      '.hm-runtime-design-stage[data-rt-frame="paper"]{padding:22px;background:linear-gradient(180deg,#fffcf5,#f7f1e7)}',
      '.hm-runtime-design-stage[data-rt-frame="console"]{padding:18px;border-color:var(--hmrt-border-strong)}',
      '.hm-runtime-design-stage[data-rt-header="split"] .hm-page-header{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end}',
      '.hm-runtime-design-stage[data-rt-header="controlbar"] .hm-page-header{align-items:center;padding:12px 14px}.hm-runtime-design-stage[data-rt-header="controlbar"] .hm-page-title{font-size:calc(var(--hmrt-title-size) * .76)}',
      '.hm-runtime-design-stage[data-rt-tabs="cardbar"] .hm-tab-bar{padding:0;border:0;background:none;backdrop-filter:none;-webkit-backdrop-filter:none}',
      '.hm-runtime-design-stage[data-rt-tabs="cardbar"] .hm-tab{background:var(--hmrt-surface-bg);border:1px solid var(--hmrt-border);border-radius:16px;box-shadow:0 8px 18px rgba(15,23,42,.06)}',
      '.hm-runtime-design-stage[data-rt-card="tinted"] .hm-block,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-card,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-kpi-card,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-chart-shell,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-record-detail,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-machine-card,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-gantt,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-kanban-column,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-kanban-card,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-filter-bar,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-form,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-banner,.hm-runtime-design-stage[data-rt-card="tinted"] .hm-table-wrapper{background:linear-gradient(180deg,var(--hmrt-accent-soft),var(--hmrt-surface-bg))}',
      '.hm-runtime-design-stage[data-rt-card="elevated"] .hm-block,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-card,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-kpi-card,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-chart-shell,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-record-detail,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-machine-card,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-gantt,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-kanban-column,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-kanban-card,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-filter-bar,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-form,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-banner,.hm-runtime-design-stage[data-rt-card="elevated"] .hm-table-wrapper{box-shadow:0 18px 36px rgba(15,23,42,.10)}',
      '.hm-runtime-design-stage[data-rt-table="ledger"] .hm-table{border-collapse:collapse}.hm-runtime-design-stage[data-rt-table="ledger"] .hm-table th{background:transparent;border-bottom:2px solid var(--hmrt-border-strong);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.hm-runtime-design-stage[data-rt-table="ledger"] .hm-table td{border-bottom:1px solid var(--hmrt-border)}',
      '.hm-runtime-design-stage[data-rt-button="glass-primary"] .hm-btn-primary{background:linear-gradient(135deg,var(--hmrt-accent-soft),var(--hmrt-accent));color:#fff;box-shadow:0 12px 24px rgba(15,23,42,.12)}',
      '.hm-runtime-design-stage[data-rt-button="clean"] .hm-btn{border-radius:12px;background:#fff}.hm-runtime-design-stage[data-rt-button="clean"] .hm-btn-primary{background:var(--hmrt-accent);color:#fff}',
      '.hm-runtime-design-stage[data-rt-button="ledger"] .hm-btn{border-radius:10px;background:transparent;box-shadow:none}.hm-runtime-design-stage[data-rt-button="ledger"] .hm-btn-primary{background:transparent;color:var(--hmrt-accent);border-color:var(--hmrt-accent)}',
      '.hm-runtime-design-stage[data-rt-button="signal"] .hm-btn{font-weight:700}.hm-runtime-design-stage[data-rt-button="signal"] .hm-btn-primary{background:linear-gradient(135deg,var(--hmrt-accent),var(--hmrt-accent-strong));box-shadow:0 10px 22px rgba(15,23,42,.18)}',
      '.hm-runtime-design-stage[data-rt-badge="outline"] .hm-badge,.hm-runtime-design-stage[data-rt-badge="outline"] .hm-record-detail-chip,.hm-runtime-design-stage[data-rt-badge="outline"] .hm-record-detail-meta>span{background:transparent}',
      '.hm-runtime-design-stage[data-rt-badge="solid"] .hm-badge,.hm-runtime-design-stage[data-rt-badge="solid"] .hm-record-detail-chip,.hm-runtime-design-stage[data-rt-badge="solid"] .hm-record-detail-meta>span{background:var(--hmrt-accent-soft);border-color:transparent}',
      '.hm-runtime-design-stage[data-rt-kpi="executive"] .hm-kpi-card{background:linear-gradient(180deg,var(--hmrt-surface-bg),rgba(255,255,255,.92));box-shadow:0 18px 36px rgba(15,23,42,.08)}.hm-runtime-design-stage[data-rt-kpi="executive"] .hm-kpi-value{font-size:var(--hmrt-kpi-value-size);font-weight:800}',
      '.hm-runtime-design-stage[data-rt-kpi="signal"] .hm-kpi-card{background:linear-gradient(180deg,var(--hmrt-surface-strong),var(--hmrt-surface-bg));border-color:var(--hmrt-accent-soft-2)}.hm-runtime-design-stage[data-rt-kpi="signal"] .hm-kpi-value{font-size:var(--hmrt-kpi-value-size);font-weight:800}',
      '.hm-runtime-design-stage[data-rt-kpi="ledger"] .hm-kpi-card{background:transparent;box-shadow:none;border-style:dashed}.hm-runtime-design-stage[data-rt-kpi="ledger"] .hm-kpi-value{font-size:var(--hmrt-kpi-value-size);font-weight:700}',
      '.hm-runtime-design-stage[data-rt-kpi="clean"] .hm-kpi-card{background:#fff;box-shadow:0 8px 18px rgba(15,23,42,.05)}',
      '.hm-runtime-design-stage[data-rt-form="glass"] .hm-form,.hm-runtime-design-stage[data-rt-form="glass"] .hm-filter-bar{backdrop-filter:blur(calc(var(--hmrt-blur) * .75));-webkit-backdrop-filter:blur(calc(var(--hmrt-blur) * .75))}',
      '.hm-runtime-design-stage[data-rt-form="lined"] .hm-form,.hm-runtime-design-stage[data-rt-form="lined"] .hm-filter-bar{background:transparent;box-shadow:none}.hm-runtime-design-stage[data-rt-form="lined"] .hm-input,.hm-runtime-design-stage[data-rt-form="lined"] .hm-select,.hm-runtime-design-stage[data-rt-form="lined"] .hm-textarea,.hm-runtime-design-stage[data-rt-form="lined"] input,.hm-runtime-design-stage[data-rt-form="lined"] select,.hm-runtime-design-stage[data-rt-form="lined"] textarea{background:transparent;border-color:var(--hmrt-border-strong)}',
      '.hm-runtime-design-stage[data-rt-form="clean"] .hm-form,.hm-runtime-design-stage[data-rt-form="clean"] .hm-filter-bar{background:#fff}.hm-runtime-design-stage[data-rt-form="clean"] .hm-input,.hm-runtime-design-stage[data-rt-form="clean"] .hm-select,.hm-runtime-design-stage[data-rt-form="clean"] .hm-textarea,.hm-runtime-design-stage[data-rt-form="clean"] input,.hm-runtime-design-stage[data-rt-form="clean"] select,.hm-runtime-design-stage[data-rt-form="clean"] textarea{background:#fff}',
      '.hm-runtime-design-stage[data-rt-form="solid"] .hm-form,.hm-runtime-design-stage[data-rt-form="solid"] .hm-filter-bar,.hm-runtime-design-stage[data-rt-form="compact"] .hm-form,.hm-runtime-design-stage[data-rt-form="compact"] .hm-filter-bar{background:var(--hmrt-surface-strong);backdrop-filter:none;-webkit-backdrop-filter:none}',
      '.hm-runtime-design-stage[data-rt-form="compact"] .hm-input,.hm-runtime-design-stage[data-rt-form="compact"] .hm-select,.hm-runtime-design-stage[data-rt-form="compact"] .hm-textarea,.hm-runtime-design-stage[data-rt-form="compact"] input,.hm-runtime-design-stage[data-rt-form="compact"] select,.hm-runtime-design-stage[data-rt-form="compact"] textarea{padding:8px 10px}',
      '.hm-runtime-design-stage[data-rt-density="dense"] .hm-block-content{padding:10px}.hm-runtime-design-stage[data-rt-density="dense"] .hm-page-header{padding:12px 14px}.hm-runtime-design-stage[data-rt-density="dense"] .hm-tab{padding:7px 10px}.hm-runtime-design-stage[data-rt-density="dense"] .hm-table th,.hm-runtime-design-stage[data-rt-density="dense"] .hm-table td{padding:8px 10px}',
      '.hm-runtime-design-stage[data-rt-density="relaxed"] .hm-block-content{padding:22px}.hm-runtime-design-stage[data-rt-density="relaxed"] .hm-page-header{padding:24px 26px}.hm-runtime-design-stage[data-rt-density="relaxed"] .hm-tab{padding:12px 16px}.hm-runtime-design-stage[data-rt-density="relaxed"] .hm-table th,.hm-runtime-design-stage[data-rt-density="relaxed"] .hm-table td{padding:14px 16px}',
      '.hm-runtime-design-stage[data-rt-motion="none"] .hm-block,.hm-runtime-design-stage[data-rt-motion="none"] .hm-card,.hm-runtime-design-stage[data-rt-motion="none"] .hm-btn,.hm-runtime-design-stage[data-rt-motion="none"] .hm-tab{transition:none!important}',
      '.hm-runtime-design-stage[data-rt-motion="subtle"] .hm-block,.hm-runtime-design-stage[data-rt-motion="subtle"] .hm-card,.hm-runtime-design-stage[data-rt-motion="subtle"] .hm-btn,.hm-runtime-design-stage[data-rt-motion="subtle"] .hm-tab,.hm-runtime-design-stage[data-rt-motion="standard"] .hm-block,.hm-runtime-design-stage[data-rt-motion="standard"] .hm-card,.hm-runtime-design-stage[data-rt-motion="standard"] .hm-btn,.hm-runtime-design-stage[data-rt-motion="standard"] .hm-tab,.hm-runtime-design-stage[data-rt-motion="expressive"] .hm-block,.hm-runtime-design-stage[data-rt-motion="expressive"] .hm-card,.hm-runtime-design-stage[data-rt-motion="expressive"] .hm-btn,.hm-runtime-design-stage[data-rt-motion="expressive"] .hm-tab{transition:transform var(--hmrt-motion-duration) ease,box-shadow var(--hmrt-motion-duration) ease,border-color var(--hmrt-motion-duration) ease,background var(--hmrt-motion-duration) ease}',
      '.hm-runtime-design-stage[data-rt-motion="standard"] .hm-block:hover,.hm-runtime-design-stage[data-rt-motion="standard"] .hm-card:hover,.hm-runtime-design-stage[data-rt-motion="standard"] .hm-btn:hover{transform:translateY(-1px)}',
      '.hm-runtime-design-stage[data-rt-motion="expressive"] .hm-block:hover,.hm-runtime-design-stage[data-rt-motion="expressive"] .hm-card:hover,.hm-runtime-design-stage[data-rt-motion="expressive"] .hm-btn:hover{transform:translateY(-2px);box-shadow:0 20px 42px rgba(15,23,42,.16)}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="elevated"]{box-shadow:0 18px 36px rgba(15,23,42,.10);background:var(--hmrt-surface-bg)}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="outlined"]{background:transparent;box-shadow:none;border-color:var(--hmrt-border-strong)}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="tinted"]{background:linear-gradient(180deg,var(--hmrt-accent-soft),var(--hmrt-surface-bg));border-color:var(--hmrt-accent-soft-2)}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="glass"]{background:var(--hmrt-surface-bg);backdrop-filter:blur(calc(var(--hmrt-blur) * .9));-webkit-backdrop-filter:blur(calc(var(--hmrt-blur) * .9))}',
      '.hm-runtime-design-stage .hm-block[data-rt-surface-variant="solid"]{background:var(--hmrt-surface-strong);backdrop-filter:none;-webkit-backdrop-filter:none}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="brand"]{border-color:var(--hmrt-accent-soft-2)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="info"]{border-color:rgba(14,165,233,.32)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="success"]{border-color:rgba(5,150,105,.32)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="warning"]{border-color:rgba(217,119,6,.32)}',
      '.hm-runtime-design-stage .hm-block[data-rt-tone="danger"]{border-color:rgba(220,38,38,.32)}',
      '.hm-runtime-design-stage .hm-block[data-rt-density="dense"] .hm-block-content{padding:8px!important}.hm-runtime-design-stage .hm-block[data-rt-density="compact"] .hm-block-content{padding:10px!important}.hm-runtime-design-stage .hm-block[data-rt-density="relaxed"] .hm-block-content{padding:22px!important}',
      '.hm-runtime-design-stage .hm-block[data-rt-shell-preset="workspace"] .hm-block-header{background:linear-gradient(180deg,var(--hmrt-header-bg),rgba(255,255,255,0))}',
      '.hm-runtime-design-stage .hm-block[data-rt-shell-preset="ops-center"]{border-top:3px solid var(--hmrt-accent)}',
      '.hm-runtime-design-stage .hm-block[data-rt-shell-preset="executive-board"]{background:linear-gradient(180deg,var(--hmrt-accent-soft),var(--hmrt-surface-bg))}',
      '.hm-runtime-design-stage .hm-block[data-rt-theme-preset="industrial"]{--hmrt-accent:var(--hmrt-accent-strong);--hmrt-border-strong:rgba(217,119,6,.34)}',
      '.hm-runtime-design-stage .hm-block[data-rt-theme-preset="executive"]{--hmrt-border-strong:rgba(79,70,229,.32)}',
      '.hm-runtime-design-stage .hm-block[data-rt-theme-preset="shopfloor"]{--hmrt-border-strong:rgba(5,150,105,.34)}',
      '.hm-runtime-design-stage .hm-block[data-rt-theme-preset="lab"]{--hmrt-border-strong:rgba(8,145,178,.34)}',
      '.hm-runtime-design-stage .hm-block[data-rt-theme-preset="dark-ops"]{background:linear-gradient(180deg,rgba(15,23,42,.94),rgba(15,23,42,.82));color:#eff6ff}',
      '.hm-runtime-design-stage .hm-block[data-rt-visual-language="precision-clean"]{backdrop-filter:none;-webkit-backdrop-filter:none;background:#fff}',
      '.hm-runtime-design-stage .hm-block[data-rt-visual-language="industrial-glass"]{background:linear-gradient(180deg,var(--hmrt-accent-soft),var(--hmrt-surface-bg))}',
      '.hm-runtime-design-stage .hm-block[data-rt-visual-language="executive-premium"]{background:linear-gradient(180deg,var(--hmrt-accent-soft),rgba(255,255,255,.92));box-shadow:0 18px 36px rgba(15,23,42,.12)}',
      '.hm-runtime-design-stage .hm-block[data-rt-visual-language="dark-ops"]{background:linear-gradient(180deg,rgba(15,23,42,.94),rgba(15,23,42,.82));color:#eff6ff}',
      '.hm-runtime-design-stage .hm-block[data-rt-visual-language="warehouse-neon"]{border-color:var(--hmrt-accent);box-shadow:0 0 0 1px var(--hmrt-accent-soft-2),0 14px 30px rgba(15,23,42,.10)}',
      '.hm-runtime-design-stage .hm-block[data-rt-hero-mood="aurora"] .hm-block-header{background:linear-gradient(135deg,var(--hmrt-accent-soft),rgba(255,255,255,0))}',
      '.hm-runtime-design-stage .hm-block[data-rt-hero-mood="cinematic"] .hm-block-header{background:linear-gradient(135deg,rgba(15,23,42,.08),var(--hmrt-accent-soft))}',
      '.hm-runtime-design-stage .hm-block[data-rt-hero-mood="clear-day"] .hm-block-header{background:linear-gradient(135deg,rgba(255,255,255,.94),var(--hmrt-accent-soft))}',
      '.hm-runtime-design-stage .hm-block[data-rt-hero-mood="focused"] .hm-block-header{background:linear-gradient(180deg,var(--hmrt-surface-strong),var(--hmrt-surface-bg))}',
      '.hm-runtime-design-stage .hm-block[data-rt-hero-mood="night-shift"] .hm-block-header{background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(15,23,42,.78));color:#eff6ff}',
      '.hm-runtime-design-stage .hm-block[data-rt-icon-style="filled"] .hm-banner-icon{background:var(--hmrt-accent-soft);border-radius:10px;padding:6px}',
      '.hm-runtime-design-stage .hm-block[data-rt-icon-style="duotone"] .hm-banner-icon{filter:drop-shadow(0 6px 14px rgba(15,23,42,.10))}',
      '.hm-runtime-design-stage .hm-block[data-rt-chart-style="balanced"] .hm-chart-shell{background:var(--hmrt-surface-bg)}',
      '.hm-runtime-design-stage .hm-block[data-rt-chart-style="executive"] .hm-chart-shell{background:linear-gradient(180deg,var(--hmrt-accent-soft),var(--hmrt-surface-bg))}',
      '.hm-runtime-design-stage .hm-block[data-rt-chart-style="realtime"] .hm-chart-shell{box-shadow:0 0 0 1px var(--hmrt-accent-soft-2),0 16px 32px rgba(15,23,42,.12)}',
      '.hm-runtime-design-stage .hm-block[data-rt-chart-style="clean-room"] .hm-chart-shell{background:#fff;box-shadow:none}',
      '.hm-runtime-design-stage .hm-block[data-rt-motion="none"]{transition:none!important}',
      '.hm-runtime-design-stage .hm-block[data-rt-motion="subtle"],.hm-runtime-design-stage .hm-block[data-rt-motion="standard"],.hm-runtime-design-stage .hm-block[data-rt-motion="expressive"]{transition:transform var(--hmrt-motion-duration) ease,box-shadow var(--hmrt-motion-duration) ease,border-color var(--hmrt-motion-duration) ease,background var(--hmrt-motion-duration) ease}',
      '.hm-runtime-design-stage .hm-block[data-rt-motion="standard"]:hover{transform:translateY(-1px)}',
      '.hm-runtime-design-stage .hm-block[data-rt-motion="expressive"]:hover{transform:translateY(-2px);box-shadow:0 20px 42px rgba(15,23,42,.16)}',
      '.hm-runtime-design-stage .hm-block[data-rt-panel-glass="1"]{backdrop-filter:blur(calc(var(--hmrt-blur) * 1.1));-webkit-backdrop-filter:blur(calc(var(--hmrt-blur) * 1.1))}',
      '@media (max-width: 920px){.hm-runtime-design-stage[data-rt-header="split"] .hm-page-header{grid-template-columns:1fr}.hm-runtime-design-stage[data-rt-tabs="cardbar"] .hm-tab{width:auto}}'
    ].join('');
    document.head.appendChild(style);
  }

  renderModuleFromSchema = function(container, schema, options){
    var result = _r15PrevRenderModuleFromSchema(container, schema, options);
    var stage = container && container.querySelector ? container.querySelector('.hm-runtime-design-stage[data-hm-runtime-stage="1"]') : null;
    var vars = _r15ResolveRuntimeDesign(schema || {});
    _r15EnsureRuntimeStyle();
    _r15ApplyStage(stage, vars);
    _r15ApplyBlockDesign(stage, schema || {}, vars);
    return result;
  };
  BE.renderModuleFromSchema = renderModuleFromSchema;
  BE.resolveRuntimeDesign = _r15ResolveRuntimeDesign;
  BE.getRuntimeDesignTokens = _r15ResolveRuntimeDesign;
  BE.RUNTIME_PRESET_LIBRARY = _r15PresetLibrary;

  var ROUND15_TEMPLATES = {
    'r15-boardroom-hero-banner': { type:'info-banner', title:{ vi:'Boardroom Hero Banner', en:'Boardroom Hero Banner' }, config:{ type:'info', icon:'🧭', text:'Boardroom headline with decision context and confidence.', textEn:'Boardroom headline with decision context and confidence.' }, meta:{ module:'builder-round15', category:'presentation' } },
    'r15-command-filter-lane': { type:'filter-bar', title:{ vi:'Command Filter Lane', en:'Command Filter Lane' }, config:{ filters:[ { key:'keyword', type:'search', placeholder:{ vi:'Tìm mã / lệnh / khách hàng', en:'Search code / order / customer' } }, { key:'status', type:'select' }, { key:'owner', type:'select' }, { key:'window', type:'select' } ] }, meta:{ module:'builder-round15', category:'presentation' } },
    'r15-ledger-table': { type:'data-table', title:{ vi:'Ledger Table', en:'Ledger Table' }, config:{ pageSize:8, columns:[ { key:'trace_id', label:{vi:'Trace', en:'Trace'}, type:'text' }, { key:'headline', label:{vi:'Headline', en:'Headline'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'status', label:{vi:'Status', en:'Status'}, type:'badge' } ] }, meta:{ module:'builder-round15', category:'presentation' } },
    'r15-signal-kpi-strip': { type:'kpi-row', title:{ vi:'Signal KPI Strip', en:'Signal KPI Strip' }, config:{ items:[ { label:{vi:'Ready', en:'Ready'}, color:'var(--green)' }, { label:{vi:'Risk', en:'Risk'}, color:'var(--amber)' }, { label:{vi:'Escalation', en:'Escalation'}, color:'var(--red)' }, { label:{vi:'Flow', en:'Flow'}, color:'var(--brand-2)' } ] }, meta:{ module:'builder-round15', category:'presentation' } },
    'r15-customer-touch-table': { type:'data-table', title:{ vi:'Customer Touch Table', en:'Customer Touch Table' }, config:{ pageSize:6, columns:[ { key:'customer', label:{vi:'Khách hàng', en:'Customer'}, type:'text' }, { key:'journey', label:{vi:'Journey', en:'Journey'}, type:'text' }, { key:'owner', label:{vi:'Owner', en:'Owner'}, type:'text' }, { key:'sla', label:{vi:'SLA', en:'SLA'}, type:'badge' } ] }, meta:{ module:'builder-round15', category:'presentation' } },
    'r15-compliance-note-banner': { type:'info-banner', title:{ vi:'Compliance Note Banner', en:'Compliance Note Banner' }, config:{ type:'warning', icon:'🧾', text:'Evidence, signoff and expiry windows are visible on this page.', textEn:'Evidence, signoff and expiry windows are visible on this page.' }, meta:{ module:'builder-round15', category:'presentation' } }
  };
  BE.BLOCK_TEMPLATES = BE.BLOCK_TEMPLATES || {};
  BE.EXTRA_TEMPLATES = BE.EXTRA_TEMPLATES || {};
  Object.keys(ROUND15_TEMPLATES).forEach(function(key){
    BE.BLOCK_TEMPLATES[key] = ROUND15_TEMPLATES[key];
    BE.EXTRA_TEMPLATES[key] = ROUND15_TEMPLATES[key];
  });

  BE.MODULE_BUILDER_RUNTIME_DESIGN_VERSION = '2026-04-08-r15-runtime-presets';
  BE.MODULE_BUILDER_ROUND15_TEMPLATES = Object.keys(ROUND15_TEMPLATES);
  window.__HM_BE_R15_TEST__ = {
    version:'2026-04-08-r15-runtime-presets',
    listPresets:function(){ return Object.keys(_r15PresetLibrary); },
    presetSchema:function(key){ return _r15PresetSchema(key || 'executive-glass'); },
    resolveRuntimeDesign:function(schema){ return _r15ResolveRuntimeDesign(schema || {}); },
    recommendBlockDesign:function(block, vars){ return _r15RecommendBlockDesign(block || {}, vars || _r15ResolveRuntimeDesign({})); },
    runtimeTemplates:function(){ return Object.keys(ROUND15_TEMPLATES); }
  };
})();
