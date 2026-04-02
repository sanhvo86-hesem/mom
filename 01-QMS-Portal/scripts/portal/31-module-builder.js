/* ============================================================================
   HESEM QMS — Module Builder v1.0
   Trang trắng: Người dùng xây module từ đầu bằng block library.
   Click "➕ Tạo Module mới" trên sidebar → vào đây.
   ============================================================================ */
(function(){
'use strict';

var BE = window.HmBlockEngine || {};
var MR = window.HmModuleRouter || {};
function _t(vi,en){ return BE._t ? BE._t(vi,en) : vi; }
function _esc(v){ return BE._esc ? BE._esc(v) : String(v==null?'':v); }
function _uid(){ return 'blk-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

var ICONS = ['📦','📋','🏭','🔴','🚚','💰','📊','⚙','🔍','📱','🎯','💡','🔒','🤖','⚡','📝','🌐','🔗','🔄','📈'];

/* ── State ────────────────────────────────────────────────────────────────── */
var state = {
  container: null,
  step: 'setup',        // 'setup' | 'build' | 'preview'
  schema: null,          // The module schema being built
  activeTab: null,
  selectedBlock: null,   // Block being configured in properties panel
  showLibrary: false,
  librarySearch: '',
  insertAfter: null,     // blockId to insert after (or null for beginning)
  insertTab: null,       // tabId to insert into
  savedModules: [],      // List of user-created modules
};

/* ── Render Entry ─────────────────────────────────────────────────────────── */
function render(container){
  state.container = container;
  _loadSavedModules();
  _paint();
}

function _paint(){
  var c = state.container;
  if(!c) return;

  switch(state.step){
    case 'setup':   c.innerHTML = _renderSetup(); break;
    case 'build':   c.innerHTML = _renderBuilder(); break;
    case 'preview': c.innerHTML = _renderPreview(); break;
  }

  c.onclick = _handleClick;
  c.oninput = _handleInput;
}

/* ── STEP 1: SETUP — Tên module, icon, route ─────────────────────────────── */
function _renderSetup(){
  var h = '';

  /* Header */
  h += '<div style="max-width:700px;margin:0 auto;padding:var(--space-8) var(--space-4)">';
  h += '<div style="text-align:center;margin-bottom:var(--space-8)">';
  h += '<div style="font-size:3rem;margin-bottom:var(--space-3)">🧩</div>';
  h += '<h1 style="margin:0;font-size:var(--text-2xl);font-weight:var(--font-bold)">'+_t('Tạo Module Mới','Create New Module')+'</h1>';
  h += '<p style="color:var(--text-secondary);margin-top:var(--space-2)">'+_t('Bắt đầu với trang trắng — thêm blocks, gắn API, xây dựng module theo ý bạn.','Start with a blank page — add blocks, bind APIs, build your module your way.')+'</p>';
  h += '</div>';

  /* Hoặc mở module đã lưu */
  if(state.savedModules.length){
    h += '<div class="hm-card" style="margin-bottom:var(--space-6)">';
    h += '<h3 style="margin:0 0 var(--space-3);font-size:var(--text-md)">'+_t('Modules đã tạo','Your Modules')+'</h3>';
    h += '<div style="display:grid;gap:var(--space-2)">';
    state.savedModules.forEach(function(m){
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer" data-action="open-module" data-id="'+_esc(m.moduleId)+'">';
      h += '<div><span style="font-size:1.2rem;margin-right:var(--space-2)">'+_esc(m.icon||'📦')+'</span><strong>'+_esc(_t(m.title.vi,m.title.en))+'</strong><span style="color:var(--text-secondary);margin-left:var(--space-2);font-size:var(--text-sm)">'+_esc(m.route)+'</span></div>';
      h += '<div style="display:flex;gap:var(--space-2)">';
      h += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="open-module" data-id="'+_esc(m.moduleId)+'">'+_t('Mở','Open')+'</button>';
      h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" style="color:var(--red)" data-action="delete-module" data-id="'+_esc(m.moduleId)+'">🗑</button>';
      h += '</div></div>';
    });
    h += '</div></div>';
    h += '<div style="text-align:center;color:var(--text-tertiary);margin-bottom:var(--space-4)">— '+_t('hoặc tạo mới','or create new')+' —</div>';
  }

  /* Form tạo mới */
  h += '<div class="hm-card">';
  h += '<h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg)">'+_t('Thông tin module','Module Info')+'</h3>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">';

  h += '<div>';
  h += '<label class="hm-label hm-label-required">'+_t('Tên module','Module Name')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-name" placeholder="'+_t('Ví dụ: Quản lý đơn hàng','E.g.: Order Management')+'">';
  h += '</div>';

  h += '<div>';
  h += '<label class="hm-label hm-label-required">'+_t('Tên tiếng Anh','English Name')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-name-en" placeholder="E.g.: Order Management">';
  h += '</div>';

  h += '<div>';
  h += '<label class="hm-label">'+_t('Route (URL)','Route (URL)')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-route" placeholder="/my-module" value="/new-module">';
  h += '</div>';

  h += '<div>';
  h += '<label class="hm-label">'+_t('Chọn icon','Choose Icon')+'</label>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">';
  ICONS.forEach(function(icon, i){
    h += '<button class="hm-btn hm-btn-ghost" style="font-size:1.2rem;width:40px;height:40px;padding:0;'+(i===0?'border:2px solid var(--brand-2);':'')+'" data-action="pick-icon" data-icon="'+_esc(icon)+'" id="mb-icon-'+i+'">'+icon+'</button>';
  });
  h += '</div>';
  h += '<input type="hidden" id="mb-icon" value="📦">';
  h += '</div>';

  h += '</div>'; // grid

  /* Tabs khởi tạo */
  h += '<div style="margin-top:var(--space-5)">';
  h += '<label class="hm-label">'+_t('Tabs ban đầu (phân cách bằng dấu phẩy)','Initial Tabs (comma separated)')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-tabs" value="'+_t('Tổng quan, Danh sách, Tạo mới','Overview, List, Create')+'" placeholder="Tab 1, Tab 2, Tab 3">';
  h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:var(--space-1)">'+_t('Bạn có thể thêm/xóa tabs sau khi tạo','You can add/remove tabs after creation')+'</div>';
  h += '</div>';

  h += '<div style="margin-top:var(--space-6);display:flex;justify-content:flex-end">';
  h += '<button class="hm-btn hm-btn-primary hm-btn-lg" data-action="create-blank">'+_t('🚀 Tạo Module Trắng','🚀 Create Blank Module')+'</button>';
  h += '</div>';

  h += '</div></div>';
  return h;
}

/* ── STEP 2: BUILD — Trang trắng + Edit Mode ─────────────────────────────── */
function _renderBuilder(){
  var schema = state.schema;
  if(!schema) return '<div class="hm-empty">No schema</div>';

  var h = '';

  /* Header */
  h += '<div style="background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 100%);color:#fff;padding:var(--space-4) var(--space-6);border-radius:var(--radius-xl);margin-bottom:var(--space-4);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">';
  h += '<div>';
  h += '<div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.1em;opacity:0.7">MODULE BUILDER</div>';
  h += '<h1 style="margin:var(--space-1) 0 0;font-size:var(--text-xl)">'+_esc(schema.icon||'')+ ' '+_esc(_t(schema.title.vi, schema.title.en))+'</h1>';
  h += '</div>';
  h += '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap">';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,0.15);color:#fff" data-action="preview-module">👁 '+_t('Xem trước','Preview')+'</button>';
  h += '<button class="hm-btn" style="background:var(--green);color:#fff" data-action="save-module">💾 '+_t('Lưu','Save')+'</button>';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,0.1);color:#fff" data-action="back-setup">← '+_t('Quay lại','Back')+'</button>';
  h += '</div></div>';

  /* Tabs */
  h += '<div class="hm-tabs">';
  (schema.tabs||[]).forEach(function(tab){
    h += '<button class="hm-tab'+(state.activeTab===tab.tabId?' active':'')+'" data-action="switch-tab" data-tab="'+_esc(tab.tabId)+'">';
    h += (tab.icon||'') + ' ' + _esc(_t(tab.title.vi, tab.title.en));
    h += '</button>';
  });
  h += '<button class="hm-tab" style="opacity:0.5;border:1px dashed var(--border)" data-action="add-tab">+ '+_t('Thêm tab','Add Tab')+'</button>';
  h += '</div>';

  /* Active tab content — TRANG TRẮNG với blocks */
  var activeTab = (schema.tabs||[]).find(function(t){ return t.tabId === state.activeTab; });
  if(activeTab){
    h += '<div style="min-height:300px;border:2px dashed var(--border);border-radius:var(--radius-xl);padding:var(--space-4)">';

    var blocks = (activeTab.blocks||[]).sort(function(a,b){ return (a.order||0)-(b.order||0); });

    if(!blocks.length){
      /* Trang trắng — prompt thêm block */
      h += '<div style="text-align:center;padding:var(--space-10)">';
      h += '<div style="font-size:3rem;margin-bottom:var(--space-3);opacity:0.3">📄</div>';
      h += '<h3 style="color:var(--text-secondary);margin:0 0 var(--space-2)">'+_t('Trang trắng','Blank Page')+'</h3>';
      h += '<p style="color:var(--text-tertiary);margin:0 0 var(--space-5);max-width:400px;margin-left:auto;margin-right:auto">'+_t('Bắt đầu xây module bằng cách thêm blocks từ thư viện. Mỗi block là một thành phần UI: bảng dữ liệu, biểu đồ, form, KPI...','Start building by adding blocks from the library. Each block is a UI component: data table, chart, form, KPI...')+'</p>';
      h += '<button class="hm-btn hm-btn-primary hm-btn-lg" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-after="">➕ '+_t('Thêm Block đầu tiên','Add First Block')+'</button>';
      h += '</div>';
    } else {
      /* Render each block with edit toolbar */
      blocks.forEach(function(block, idx){
        /* Add block button before first block */
        if(idx === 0){
          h += '<div style="display:flex;justify-content:center;padding:var(--space-1)"><button class="hm-btn hm-btn-ghost hm-btn-sm" style="border:1px dashed var(--border);color:var(--text-tertiary);font-size:var(--text-xs)" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-after="">+ '+_t('Thêm block','Add block')+'</button></div>';
        }

        var isSelected = state.selectedBlock === block.blockId;

        h += '<div style="border:2px solid '+(isSelected?'var(--brand-2)':'var(--border)')+';border-radius:var(--radius-lg);margin-bottom:var(--space-3);overflow:hidden;transition:border-color 0.15s" data-block-wrapper="'+_esc(block.blockId)+'">';

        /* Block toolbar */
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);background:'+(isSelected?'var(--blue-bg)':'var(--gray-50)')+';border-bottom:1px solid var(--border);font-size:var(--text-xs)">';
        h += '<div style="display:flex;align-items:center;gap:var(--space-2)">';
        h += '<span style="font-weight:var(--font-bold);color:var(--text-secondary)">'+_esc(_getCatalogLabel(block.type))+'</span>';
        if(block.title) h += '<span style="color:var(--text-tertiary)">— '+_esc(_t(block.title.vi||'',block.title.en||''))+'</span>';
        h += '</div>';
        h += '<div style="display:flex;gap:2px">';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="move-up" data-block="'+_esc(block.blockId)+'" title="▲">▲</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="move-down" data-block="'+_esc(block.blockId)+'" title="▼">▼</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="config-block" data-block="'+_esc(block.blockId)+'" title="⚙">⚙</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="duplicate-block" data-block="'+_esc(block.blockId)+'" title="📋">📋</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" style="color:var(--red)" data-action="delete-block" data-block="'+_esc(block.blockId)+'" title="🗑">🗑</button>';
        h += '</div></div>';

        /* Block preview */
        h += '<div style="padding:var(--space-3);min-height:60px">';
        h += _renderBlockPreview(block);
        h += '</div>';

        h += '</div>';

        /* Add block button after each block */
        h += '<div style="display:flex;justify-content:center;padding:var(--space-1)"><button class="hm-btn hm-btn-ghost hm-btn-sm" style="border:1px dashed var(--border);color:var(--text-tertiary);font-size:var(--text-xs)" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-after="'+_esc(block.blockId)+'">+ '+_t('Thêm block','Add block')+'</button></div>';
      });
    }

    h += '</div>';
  }

  /* Block Library Sidebar (right panel when open) */
  if(state.showLibrary){
    h += _renderLibraryPanel();
  }

  /* Properties Panel (when block selected) */
  if(state.selectedBlock && !state.showLibrary){
    h += _renderPropertiesPanel();
  }

  return h;
}

/* ── Block Preview (simplified render for builder) ───────────────────────── */
function _renderBlockPreview(block){
  var type = block.type;
  var config = block.config || {};
  var h = '';

  switch(type){
    case 'kpi-row':
      h += '<div style="display:flex;gap:var(--space-3);flex-wrap:wrap">';
      (config.items||[{},{},{}]).forEach(function(item){
        h += '<div style="flex:1;min-width:120px;padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md);text-align:center">';
        h += '<div style="font-size:var(--text-xl);font-weight:var(--font-bold);color:'+(item.color||'var(--brand-2)')+'">--</div>';
        h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">'+_esc(item.label?_t(item.label.vi||'KPI',item.label.en||'KPI'):'KPI Item')+'</div>';
        h += '</div>';
      });
      h += '</div>';
      break;

    case 'data-table':
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden">';
      h += '<div style="display:flex;background:var(--gray-50);border-bottom:1px solid var(--border)">';
      (config.columns||[{label:{vi:'Cột 1'}},{label:{vi:'Cột 2'}},{label:{vi:'Cột 3'}}]).forEach(function(col){
        h += '<div style="flex:1;padding:var(--space-2) var(--space-3);font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--text-secondary)">'+_esc(col.label?_t(col.label.vi||'',col.label.en||''):'Column')+'</div>';
      });
      h += '</div>';
      for(var r=0;r<3;r++){
        h += '<div style="display:flex;border-bottom:1px solid var(--border)">';
        (config.columns||[{},{},{}]).forEach(function(){
          h += '<div style="flex:1;padding:var(--space-2) var(--space-3);font-size:var(--text-sm);color:var(--text-tertiary)">---</div>';
        });
        h += '</div>';
      }
      h += '</div>';
      if(config.dataSource && config.dataSource.api){
        h += '<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">API: <code style="background:var(--gray-50);padding:1px 4px;border-radius:3px">'+_esc(config.dataSource.api)+'</code></div>';
      }
      break;

    case 'filter-bar':
      h += '<div style="display:flex;gap:var(--space-2);padding:var(--space-2);background:var(--gray-50);border-radius:var(--radius-md);flex-wrap:wrap">';
      (config.filters||[{}]).forEach(function(f){
        if(f.type==='search') h += '<div style="flex:1;min-width:150px;height:32px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);display:flex;align-items:center;padding:0 var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">🔍 '+_esc(f.placeholder?_t(f.placeholder.vi||'',f.placeholder.en||''):'Search...')+'</div>';
        else h += '<div style="height:32px;min-width:120px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);display:flex;align-items:center;padding:0 var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">'+_esc(f.key||'filter')+' ▾</div>';
      });
      h += '<div style="height:32px;padding:0 var(--space-3);background:var(--brand-2);color:#fff;border-radius:var(--radius-md);display:flex;align-items:center;font-size:var(--text-xs);font-weight:var(--font-semibold)">'+_t('Tìm','Search')+'</div>';
      h += '</div>';
      break;

    case 'form-standard':
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md)">';
      (config.fields||[{label:{vi:'Trường 1'}},{label:{vi:'Trường 2'}},{label:{vi:'Trường 3'}},{label:{vi:'Trường 4'}}]).slice(0,6).forEach(function(f){
        var span = f.span==='full'?'grid-column:1/-1;':'';
        h += '<div style="'+span+'"><div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:2px">'+_esc(f.label?_t(f.label.vi||'',f.label.en||''):'Field')+'</div><div style="height:32px;background:var(--gray-50);border:1px solid var(--border);border-radius:var(--radius-md)"></div></div>';
      });
      h += '</div>';
      break;

    case 'chart-bar':
      h += '<div style="display:flex;flex-direction:column;gap:4px;padding:var(--space-2)">';
      [75,60,45,30].forEach(function(w){
        h += '<div style="display:flex;align-items:center;gap:var(--space-2)"><span style="font-size:var(--text-xs);color:var(--text-secondary);min-width:40px">Item</span><div style="height:16px;width:'+w+'%;background:var(--brand-2);border-radius:var(--radius-sm);opacity:0.6"></div></div>';
      });
      h += '</div>';
      break;

    case 'chart-donut':
      h += '<div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-2)">';
      h += '<div style="width:80px;height:80px;border-radius:50%;background:conic-gradient(var(--green) 0% 40%,var(--amber) 40% 70%,var(--red) 70% 85%,var(--gray-200) 85% 100%);display:flex;align-items:center;justify-content:center"><div style="width:48px;height:48px;border-radius:50%;background:#fff"></div></div>';
      h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">Donut Chart Preview</div>';
      h += '</div>';
      break;

    case 'action-toolbar':
      h += '<div style="display:flex;gap:var(--space-2)">';
      (config.buttons||[{label:{vi:'Nút 1'},variant:'primary'},{label:{vi:'Nút 2'},variant:'secondary'}]).forEach(function(btn){
        h += '<div style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:var(--font-semibold);'+(btn.variant==='primary'?'background:var(--brand-2);color:#fff':'border:1px solid var(--border);color:var(--text-secondary)')+'">'+_esc(btn.label?_t(btn.label.vi||'',btn.label.en||''):'Button')+'</div>';
      });
      h += '</div>';
      break;

    case 'info-banner':
      var bannerColor = config.type==='warning'?'var(--amber)':config.type==='error'?'var(--red)':config.type==='success'?'var(--green)':'var(--brand-2)';
      h += '<div style="padding:var(--space-3);border-left:4px solid '+bannerColor+';background:var(--gray-50);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--text-secondary)">'+_esc(config.text?_t(config.text.vi||'',config.text.en||''):'Info banner')+'</div>';
      break;

    case 'data-timeline':
      h += '<div style="padding:var(--space-2)">';
      [1,2,3].forEach(function(i){
        h += '<div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-2)"><div style="width:10px;height:10px;border-radius:50%;background:var(--brand-2);margin-top:4px;flex-shrink:0"></div><div><div style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--text-secondary)">Event '+i+'</div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">Description...</div></div></div>';
      });
      h += '</div>';
      break;

    default:
      h += '<div style="padding:var(--space-4);text-align:center;color:var(--text-tertiary);font-size:var(--text-sm)">'+_esc(_getCatalogLabel(type))+' — '+_t('Click ⚙ để cấu hình','Click ⚙ to configure')+'</div>';
  }

  return h;
}

/* ── Block Library Panel ─────────────────────────────────────────────────── */
function _renderLibraryPanel(){
  var h = '';
  h += '<div style="position:fixed;right:0;top:0;bottom:0;width:380px;background:var(--bg-surface);border-left:1px solid var(--border);z-index:var(--z-modal);box-shadow:var(--shadow-xl);display:flex;flex-direction:column">';

  /* Header */
  h += '<div style="padding:var(--space-4);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">';
  h += '<h3 style="margin:0;font-size:var(--text-lg)">'+_t('Thư viện Block','Block Library')+'</h3>';
  h += '<button class="hm-btn hm-btn-ghost" data-action="close-library" style="font-size:1.2rem">×</button>';
  h += '</div>';

  /* Search */
  h += '<div style="padding:var(--space-3)">';
  h += '<input type="text" class="hm-input" id="mb-lib-search" placeholder="'+_t('Tìm block...','Search blocks...')+'" value="'+_esc(state.librarySearch)+'">';
  h += '</div>';

  /* Categories + blocks */
  h += '<div style="flex:1;overflow-y:auto;padding:0 var(--space-3) var(--space-3)">';
  var catalog = BE.BLOCK_CATALOG || {};
  var categories = BE.BLOCK_CATEGORIES || [];
  var search = (state.librarySearch||'').toLowerCase();

  categories.forEach(function(cat){
    var blocks = Object.keys(catalog).filter(function(key){
      var entry = catalog[key];
      if(entry.category !== cat.key) return false;
      if(search && entry.label.toLowerCase().indexOf(search)<0 && (entry.labelEn||'').toLowerCase().indexOf(search)<0 && key.indexOf(search)<0) return false;
      return true;
    });
    if(!blocks.length) return;

    h += '<div style="margin-bottom:var(--space-4)">';
    h += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:'+cat.color+';text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2)">'+_esc(_t(cat.label,cat.labelEn||cat.label))+' ('+blocks.length+')</div>';

    blocks.forEach(function(key){
      var entry = catalog[key];
      h += '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:var(--space-2);cursor:pointer;transition:background 0.1s" data-action="add-block-type" data-type="'+_esc(key)+'" onmouseover="this.style.background=\'var(--gray-50)\'" onmouseout="this.style.background=\'\'">';
      h += '<div style="font-size:1.3rem;width:36px;text-align:center">'+_esc(entry.icon||'📦')+'</div>';
      h += '<div>';
      h += '<div style="font-weight:var(--font-semibold);font-size:var(--text-sm)">'+_esc(entry.label)+'</div>';
      h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">'+_esc(entry.labelEn||'')+'</div>';
      if(entry.desc) h += '<div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px">'+_esc(entry.desc)+'</div>';
      h += '</div></div>';
    });

    h += '</div>';
  });

  /* Block Templates */
  var templates = BE.BLOCK_TEMPLATES || {};
  var templateKeys = Object.keys(templates);
  if(templateKeys.length){
    h += '<div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:2px solid var(--border)">';
    h += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--amber);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2)">⭐ '+_t('Block Templates','Block Templates')+' ('+templateKeys.length+')</div>';
    templateKeys.forEach(function(key){
      var tpl = templates[key];
      h += '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--amber);border-radius:var(--radius-md);margin-bottom:var(--space-2);cursor:pointer;background:var(--amber-bg)" data-action="add-template" data-key="'+_esc(key)+'">';
      h += '<div style="font-size:1rem">⭐</div>';
      h += '<div style="font-weight:var(--font-semibold);font-size:var(--text-sm)">'+_esc(key)+'</div>';
      h += '</div>';
    });
    h += '</div>';
  }

  h += '</div></div>';

  /* Overlay */
  h = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.2);z-index:'+(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--z-modal'))||1300 - 1)+'" data-action="close-library"></div>' + h;

  return h;
}

/* ── Properties Panel ────────────────────────────────────────────────────── */
function _renderPropertiesPanel(){
  var block = _findBlock(state.selectedBlock);
  if(!block) return '';

  var h = '';
  h += '<div style="position:fixed;right:0;top:0;bottom:0;width:400px;background:var(--bg-surface);border-left:1px solid var(--border);z-index:var(--z-modal);box-shadow:var(--shadow-xl);display:flex;flex-direction:column">';

  h += '<div style="padding:var(--space-4);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">';
  h += '<h3 style="margin:0;font-size:var(--text-lg)">⚙ '+_t('Cấu hình Block','Block Config')+'</h3>';
  h += '<button class="hm-btn hm-btn-ghost" data-action="close-props" style="font-size:1.2rem">×</button>';
  h += '</div>';

  h += '<div style="flex:1;overflow-y:auto;padding:var(--space-4)">';

  /* Block type */
  h += '<div style="padding:var(--space-2) var(--space-3);background:var(--gray-50);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--text-sm)"><strong>'+_esc(_getCatalogLabel(block.type))+'</strong> <span style="color:var(--text-tertiary);font-size:var(--text-xs)">'+_esc(block.blockId)+'</span></div>';

  /* Title */
  h += '<label class="hm-label">'+_t('Tiêu đề (VI)','Title (VI)')+'</label>';
  h += '<input type="text" class="hm-input" data-prop="title.vi" value="'+_esc(block.title?block.title.vi||'':'')+'" style="margin-bottom:var(--space-3)">';
  h += '<label class="hm-label">'+_t('Tiêu đề (EN)','Title (EN)')+'</label>';
  h += '<input type="text" class="hm-input" data-prop="title.en" value="'+_esc(block.title?block.title.en||'':'')+'" style="margin-bottom:var(--space-3)">';

  /* API Binding */
  h += '<label class="hm-label">'+_t('API Endpoint','API Endpoint')+'</label>';
  var currentApi = (block.config&&block.config.dataSource&&block.config.dataSource.api)||'';
  h += '<select class="hm-input hm-select" data-prop="api" style="margin-bottom:var(--space-3)">';
  h += '<option value="">-- '+_t('Không có API','No API')+' --</option>';
  var apiCatalog = BE.API_CATALOG || [];
  var lastModule = '';
  apiCatalog.forEach(function(api){
    if(api.module !== lastModule){
      if(lastModule) h += '</optgroup>';
      h += '<optgroup label="'+_esc(api.module)+'">';
      lastModule = api.module;
    }
    h += '<option value="'+_esc(api.action)+'"'+(currentApi===api.action?' selected':'')+'>'+_esc(api.action)+' — '+_esc(api.label)+'</option>';
  });
  if(lastModule) h += '</optgroup>';
  h += '</select>';

  /* Data Key */
  h += '<label class="hm-label">'+_t('Data Key (field trong response)','Data Key (response field)')+'</label>';
  h += '<input type="text" class="hm-input" data-prop="dataKey" value="'+_esc(block.config&&block.config.dataSource?block.config.dataSource.dataKey||'':'')+'" placeholder="e.g. sales_orders" style="margin-bottom:var(--space-3)">';

  /* Visibility condition */
  h += '<label class="hm-label">'+_t('Điều kiện hiển thị','Visibility Condition')+'</label>';
  h += '<input type="text" class="hm-input" data-prop="visibleWhen" value="'+_esc(block.visibleWhen||'')+'" placeholder="{{ currentUser.role === \'admin\' }}" style="margin-bottom:var(--space-3)">';

  /* Save button */
  h += '<div style="margin-top:var(--space-4)"><button class="hm-btn hm-btn-primary" data-action="save-props">'+_t('Áp dụng','Apply')+'</button></div>';

  h += '</div></div>';

  h = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.2);z-index:'+(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--z-modal'))||1300 - 1)+'" data-action="close-props"></div>' + h;

  return h;
}

/* ── STEP 3: PREVIEW ─────────────────────────────────────────────────────── */
function _renderPreview(){
  var h = '';
  h += '<div style="margin-bottom:var(--space-4);display:flex;justify-content:space-between;align-items:center">';
  h += '<h2 style="margin:0;font-size:var(--text-lg)">👁 '+_t('Xem trước Module','Module Preview')+'</h2>';
  h += '<div style="display:flex;gap:var(--space-2)">';
  h += '<button class="hm-btn hm-btn-secondary" data-action="back-build">← '+_t('Quay lại Builder','Back to Builder')+'</button>';
  h += '<button class="hm-btn hm-btn-primary" data-action="save-module">💾 '+_t('Lưu & Xuất bản','Save & Publish')+'</button>';
  h += '</div></div>';
  h += '<div id="mb-preview-container" style="border:1px solid var(--border);border-radius:var(--radius-xl);padding:var(--space-4);min-height:400px;background:var(--bg-page)"></div>';

  // Render preview via Module Router after DOM update
  setTimeout(function(){
    var previewEl = document.getElementById('mb-preview-container');
    if(previewEl && state.schema){
      // Use Module Router to render with real API
      if(MR.renderModuleById){
        // Save schema to localStorage so router can find it
        try{ localStorage.setItem('hm_module_schema_'+state.schema.moduleId, JSON.stringify(state.schema)); }catch(e){}
        MR.renderModuleById(previewEl, state.schema.moduleId);
      }
    }
  }, 100);

  return h;
}

/* ── Event Handlers ──────────────────────────────────────────────────────── */
function _handleClick(e){
  var btn = e.target.closest('[data-action]');
  if(!btn) return;
  var action = btn.getAttribute('data-action');

  switch(action){
    case 'pick-icon':
      var icon = btn.getAttribute('data-icon');
      document.getElementById('mb-icon').value = icon;
      state.container.querySelectorAll('[data-action="pick-icon"]').forEach(function(b){ b.style.border=''; });
      btn.style.border = '2px solid var(--brand-2)';
      break;

    case 'create-blank':
      _createBlankModule();
      break;

    case 'open-module':
      var mid = btn.getAttribute('data-id');
      _openSavedModule(mid);
      break;

    case 'delete-module':
      var did = btn.getAttribute('data-id');
      if(confirm(_t('Xóa module này?','Delete this module?'))){
        _deleteSavedModule(did);
        _paint();
      }
      break;

    case 'switch-tab':
      state.activeTab = btn.getAttribute('data-tab');
      state.selectedBlock = null;
      state.showLibrary = false;
      _paint();
      break;

    case 'add-tab':
      var tabName = prompt(_t('Tên tab mới:','New tab name:'));
      if(tabName){
        state.schema.tabs.push({
          tabId: 'tab-'+Date.now().toString(36),
          title: { vi: tabName, en: tabName },
          icon: '',
          blocks: []
        });
        state.activeTab = state.schema.tabs[state.schema.tabs.length-1].tabId;
        _paint();
      }
      break;

    case 'open-library':
      state.showLibrary = true;
      state.insertTab = btn.getAttribute('data-tab');
      state.insertAfter = btn.getAttribute('data-after') || null;
      _paint();
      break;

    case 'close-library':
      state.showLibrary = false;
      _paint();
      break;

    case 'add-block-type':
      var blockType = btn.getAttribute('data-type');
      _addBlockToSchema(blockType);
      state.showLibrary = false;
      _paint();
      break;

    case 'add-template':
      var tplKey = btn.getAttribute('data-key');
      var tpl = (BE.BLOCK_TEMPLATES||{})[tplKey];
      if(tpl) _addBlockToSchema(tpl.type, tpl.config);
      state.showLibrary = false;
      _paint();
      break;

    case 'config-block':
      state.selectedBlock = btn.getAttribute('data-block');
      _paint();
      break;

    case 'close-props':
      state.selectedBlock = null;
      _paint();
      break;

    case 'save-props':
      _saveBlockProps();
      state.selectedBlock = null;
      _paint();
      break;

    case 'delete-block':
      var delId = btn.getAttribute('data-block');
      if(confirm(_t('Xóa block này?','Delete this block?'))){
        _removeBlock(delId);
        _paint();
      }
      break;

    case 'duplicate-block':
      _duplicateBlock(btn.getAttribute('data-block'));
      _paint();
      break;

    case 'move-up':
    case 'move-down':
      _moveBlock(btn.getAttribute('data-block'), action==='move-up'?-1:1);
      _paint();
      break;

    case 'save-module':
      _saveModule();
      break;

    case 'preview-module':
      state.step = 'preview';
      _paint();
      break;

    case 'back-build':
      state.step = 'build';
      _paint();
      break;

    case 'back-setup':
      state.step = 'setup';
      _paint();
      break;
  }
}

function _handleInput(e){
  if(e.target.id === 'mb-lib-search'){
    state.librarySearch = e.target.value;
    // Don't full repaint, just filter
  }
}

/* ── Schema Operations ───────────────────────────────────────────────────── */
function _createBlankModule(){
  var nameVi = (document.getElementById('mb-name')||{}).value || 'Module mới';
  var nameEn = (document.getElementById('mb-name-en')||{}).value || 'New Module';
  var route = (document.getElementById('mb-route')||{}).value || '/new-module';
  var icon = (document.getElementById('mb-icon')||{}).value || '📦';
  var tabsStr = (document.getElementById('mb-tabs')||{}).value || 'Tab 1';

  var tabs = tabsStr.split(',').map(function(t, i){
    return {
      tabId: 'tab-'+i+'-'+Date.now().toString(36),
      title: { vi: t.trim(), en: t.trim() },
      icon: '',
      blocks: []
    };
  });

  state.schema = {
    moduleId: 'custom-'+Date.now().toString(36),
    title: { vi: nameVi, en: nameEn },
    subtitle: { vi: '', en: '' },
    icon: icon,
    route: route,
    roles: ['ceo','it_admin'],
    version: 1,
    createdBy: (typeof currentUser!=='undefined' && currentUser) ? currentUser.username : 'admin',
    createdAt: new Date().toISOString(),
    tabs: tabs
  };

  state.activeTab = tabs[0].tabId;
  state.step = 'build';
  _paint();
}

function _addBlockToSchema(blockType, preConfig){
  if(!state.schema) return;
  var tab = state.schema.tabs.find(function(t){ return t.tabId === state.insertTab; });
  if(!tab) tab = state.schema.tabs.find(function(t){ return t.tabId === state.activeTab; });
  if(!tab && state.schema.tabs.length) tab = state.schema.tabs[0];
  if(!tab) return;

  var newBlock = {
    blockId: _uid(),
    type: blockType,
    visible: true,
    order: (tab.blocks||[]).length + 1,
    title: { vi: (BE.BLOCK_CATALOG[blockType]||{}).label||blockType, en: (BE.BLOCK_CATALOG[blockType]||{}).labelEn||blockType },
    config: preConfig ? JSON.parse(JSON.stringify(preConfig)) : {}
  };

  if(state.insertAfter){
    var idx = tab.blocks.findIndex(function(b){ return b.blockId === state.insertAfter; });
    tab.blocks.splice(idx+1, 0, newBlock);
  } else {
    tab.blocks.push(newBlock);
  }
  tab.blocks.forEach(function(b,i){ b.order = i+1; });
}

function _removeBlock(blockId){
  if(!state.schema) return;
  state.schema.tabs.forEach(function(tab){
    tab.blocks = (tab.blocks||[]).filter(function(b){ return b.blockId !== blockId; });
    tab.blocks.forEach(function(b,i){ b.order = i+1; });
  });
}

function _duplicateBlock(blockId){
  if(!state.schema) return;
  state.schema.tabs.forEach(function(tab){
    var idx = (tab.blocks||[]).findIndex(function(b){ return b.blockId === blockId; });
    if(idx >= 0){
      var clone = JSON.parse(JSON.stringify(tab.blocks[idx]));
      clone.blockId = _uid();
      tab.blocks.splice(idx+1, 0, clone);
      tab.blocks.forEach(function(b,i){ b.order = i+1; });
    }
  });
}

function _moveBlock(blockId, direction){
  if(!state.schema) return;
  state.schema.tabs.forEach(function(tab){
    var idx = (tab.blocks||[]).findIndex(function(b){ return b.blockId === blockId; });
    if(idx < 0) return;
    var swap = idx + direction;
    if(swap < 0 || swap >= tab.blocks.length) return;
    var tmp = tab.blocks[idx];
    tab.blocks[idx] = tab.blocks[swap];
    tab.blocks[swap] = tmp;
    tab.blocks.forEach(function(b,i){ b.order = i+1; });
  });
}

function _findBlock(blockId){
  if(!state.schema) return null;
  var found = null;
  state.schema.tabs.forEach(function(tab){
    (tab.blocks||[]).forEach(function(b){ if(b.blockId === blockId) found = b; });
  });
  return found;
}

function _saveBlockProps(){
  var block = _findBlock(state.selectedBlock);
  if(!block) return;
  var c = state.container;

  // Title
  var titleVi = (c.querySelector('[data-prop="title.vi"]')||{}).value;
  var titleEn = (c.querySelector('[data-prop="title.en"]')||{}).value;
  if(titleVi !== undefined){ if(!block.title) block.title = {}; block.title.vi = titleVi; block.title.en = titleEn||titleVi; }

  // API
  var api = (c.querySelector('[data-prop="api"]')||{}).value;
  var dataKey = (c.querySelector('[data-prop="dataKey"]')||{}).value;
  if(api){
    if(!block.config) block.config = {};
    block.config.dataSource = { api: api, method: 'GET', dataKey: dataKey };
  }

  // Visibility
  var visibleWhen = (c.querySelector('[data-prop="visibleWhen"]')||{}).value;
  if(visibleWhen) block.visibleWhen = visibleWhen;
  else delete block.visibleWhen;
}

function _saveModule(){
  if(!state.schema) return;
  state.schema.version = (state.schema.version||0) + 1;
  state.schema.updatedAt = new Date().toISOString();

  // Save to localStorage
  try{
    localStorage.setItem('hm_module_schema_'+state.schema.moduleId, JSON.stringify(state.schema));
  }catch(e){}

  // Save to saved modules list
  _addToSavedModules(state.schema);

  // Try save to backend
  if(typeof apiCall === 'function'){
    apiCall('module_schema_save', { schema: state.schema }, 'POST', 10000).catch(function(){});
  }

  BE.toast(_t('Đã lưu module: ','Module saved: ')+_t(state.schema.title.vi, state.schema.title.en), 'success');
}

function _loadSavedModules(){
  try{
    var raw = localStorage.getItem('hm_saved_modules');
    state.savedModules = raw ? JSON.parse(raw) : [];
  }catch(e){ state.savedModules = []; }
}

function _addToSavedModules(schema){
  _loadSavedModules();
  var idx = state.savedModules.findIndex(function(m){ return m.moduleId === schema.moduleId; });
  var summary = {
    moduleId: schema.moduleId,
    title: schema.title,
    icon: schema.icon,
    route: schema.route,
    version: schema.version,
    updatedAt: schema.updatedAt
  };
  if(idx >= 0) state.savedModules[idx] = summary;
  else state.savedModules.push(summary);
  try{ localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); }catch(e){}
}

function _openSavedModule(moduleId){
  try{
    var raw = localStorage.getItem('hm_module_schema_'+moduleId);
    if(raw){
      state.schema = JSON.parse(raw);
      state.activeTab = state.schema.tabs && state.schema.tabs.length ? state.schema.tabs[0].tabId : null;
      state.step = 'build';
      _paint();
    }
  }catch(e){}
}

function _deleteSavedModule(moduleId){
  try{ localStorage.removeItem('hm_module_schema_'+moduleId); }catch(e){}
  state.savedModules = state.savedModules.filter(function(m){ return m.moduleId !== moduleId; });
  try{ localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); }catch(e){}
}

function _getCatalogLabel(type){
  var entry = (BE.BLOCK_CATALOG||{})[type];
  return entry ? _t(entry.label, entry.labelEn||entry.label) : type;
}

/* ── Export ───────────────────────────────────────────────────────────────── */
window._renderModuleBuilder = render;

})();
