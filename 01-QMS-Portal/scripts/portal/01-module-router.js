/* ============================================================================
   HESEM QMS — Module Router v1.0
   Reads module JSON schemas → renders via Block Engine.
   This replaces all hardcoded module JS files with schema-driven rendering.
   ============================================================================ */
(function(){
'use strict';

var BE = window.HmBlockEngine;
if (!BE) { console.error('[ModuleRouter] Block Engine not loaded'); return; }

var _t = BE._t || function(v,e){ return v; };
var _esc = BE._esc || function(v){ return String(v); };

/* ── Schema Cache ────────────────────────────────────────────────────────── */
var _schemaCache = {};
var _loading = {};

/* ── Render Module by ID ─────────────────────────────────────────────────── */
function renderModuleById(container, moduleId) {
  if (!container) return;

  // Show loading
  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-secondary)"><div style="text-align:center"><div style="font-size:2rem;margin-bottom:var(--space-3)">⏳</div><div>'+_t('Đang tải module...','Loading module...')+'</div></div></div>';

  // Check cache first
  if (_schemaCache[moduleId]) {
    _renderFromSchema(container, _schemaCache[moduleId]);
    return;
  }

  // Prevent duplicate loads
  if (_loading[moduleId]) return;
  _loading[moduleId] = true;

  // Try loading from API
  _loadSchema(moduleId).then(function(schema) {
    _loading[moduleId] = false;
    if (schema) {
      _schemaCache[moduleId] = schema;
      _renderFromSchema(container, schema);
    } else {
      container.innerHTML = '<div class="hm-empty"><div class="hm-empty-icon">❌</div>'+_t('Không tìm thấy module: ','Module not found: ')+_esc(moduleId)+'</div>';
    }
  }).catch(function(err) {
    _loading[moduleId] = false;
    container.innerHTML = '<div class="hm-empty"><div class="hm-empty-icon">⚠️</div>'+_t('Lỗi tải module','Error loading module')+'<br><small>'+_esc(String(err))+'</small></div>';
  });
}

/* ── Load Schema (API → localStorage → embedded) ────────────────────────── */
function _loadSchema(moduleId) {
  // Try API first
  return _apiGet('module_schema_get', { id: moduleId }).then(function(r) {
    if (r && r.ok && r.schema) return r.schema;
    // Fallback: try localStorage
    return _loadLocal(moduleId);
  }).catch(function() {
    return _loadLocal(moduleId);
  });
}

function _loadLocal(moduleId) {
  try {
    var raw = localStorage.getItem('hm_module_schema_' + moduleId);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function _apiGet(action, params) {
  if (typeof apiCall === 'function') {
    return apiCall(action, params || {}, 'GET', 15000);
  }
  var qs = Object.keys(params || {}).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  return fetch('api.php?action=' + encodeURIComponent(action) + (qs ? '&' + qs : ''), {
    credentials: 'include'
  }).then(function(r) { return r.json(); });
}

function _apiPost(action, body) {
  if (typeof apiCall === 'function') {
    return apiCall(action, body || {}, 'POST', 30000);
  }
  return fetch('api.php?action=' + encodeURIComponent(action), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '')
    },
    body: JSON.stringify(body || {})
  }).then(function(r) { return r.json(); });
}

/* ── Render From Schema ──────────────────────────────────────────────────── */
function _renderFromSchema(container, schema) {
  var moduleId = schema.moduleId;
  var state = BE.getModuleState(moduleId);

  // Set default active tab
  if (!state.activeTab && schema.tabs && schema.tabs.length) {
    state.activeTab = schema.tabs[0].tabId;
  }

  var h = '';

  /* ── Page Header (gradient) ────────────────────────────────────────── */
  h += '<div style="background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 100%);color:#fff;padding:var(--space-5) var(--space-6) var(--space-4);border-radius:var(--radius-xl);margin-bottom:var(--space-5)">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-3)">';
  h += '<div>';
  h += '<h1 style="margin:0;font-size:var(--text-xl);font-weight:var(--font-bold)">'+_esc(_t(schema.title.vi, schema.title.en))+'</h1>';
  if (schema.subtitle) {
    h += '<p style="margin:var(--space-1) 0 0;opacity:0.85;font-size:var(--text-sm)">'+_esc(_t(schema.subtitle.vi, schema.subtitle.en))+'</p>';
  }
  h += '</div>';
  h += '<div style="display:flex;gap:var(--space-2)">';
  if (!state.editMode) {
    h += '<button class="hm-btn" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3)" data-mr-action="edit-module">✏️ '+_t('Chỉnh sửa','Edit')+'</button>';
  } else {
    h += '<button class="hm-btn" style="background:var(--green);color:#fff" data-mr-action="save-module">💾 '+_t('Lưu','Save')+'</button>';
    h += '<button class="hm-btn" style="background:rgba(255,255,255,0.15);color:#fff" data-mr-action="cancel-edit">❌ '+_t('Hủy','Cancel')+'</button>';
    h += '<button class="hm-btn" style="background:rgba(255,255,255,0.1);color:#fff" data-mr-action="undo">↩️</button>';
    h += '<button class="hm-btn" style="background:rgba(255,255,255,0.1);color:#fff" data-mr-action="redo">↪️</button>';
  }
  h += '</div></div></div>';

  /* ── Tabs ──────────────────────────────────────────────────────────── */
  if (schema.tabs && schema.tabs.length > 1) {
    h += '<div class="hm-tabs">';
    schema.tabs.forEach(function(tab) {
      var isActive = state.activeTab === tab.tabId;
      h += '<button class="hm-tab'+(isActive?' active':'')+'" data-mr-action="switch-tab" data-tab="'+_esc(tab.tabId)+'">';
      h += (tab.icon || '') + ' ' + _esc(_t(tab.title.vi, tab.title.en));
      h += '</button>';
    });
    if (state.editMode) {
      h += '<button class="hm-tab" style="opacity:0.5;border:1px dashed var(--border)" data-mr-action="add-tab">+ '+_t('Thêm tab','Add Tab')+'</button>';
    }
    h += '</div>';
  }

  /* ── Active Tab Blocks ─────────────────────────────────────────────── */
  var activeTab = null;
  (schema.tabs || []).forEach(function(tab) {
    if (tab.tabId === state.activeTab) activeTab = tab;
  });

  if (activeTab) {
    h += '<div class="hm-tab-content" data-tab="'+_esc(activeTab.tabId)+'">';

    var blocks = (activeTab.blocks || []).slice().sort(function(a, b) {
      return (a.order || 0) - (b.order || 0);
    });

    // Build reactive context
    var reactiveCtx = {
      state: state,
      currentUser: (typeof currentUser !== 'undefined') ? currentUser : {},
      filters: state.filters || {},
      blocks: state.blockData || {},
      data: {}
    };

    blocks.forEach(function(block, idx) {
      // Check visibility
      if (block.visibleWhen && !BE.isBlockVisible(block, reactiveCtx)) return;
      if (block.visible === false && !state.editMode) return;

      // Edit mode: add block button before each block
      if (state.editMode && idx === 0) {
        h += _renderAddBtn(moduleId, activeTab.tabId, null);
      }

      // Block wrapper
      var blockData = state.blockData[block.blockId] || {};
      var opacity = (block.visible === false && state.editMode) ? 'opacity:0.4;' : '';

      h += '<div class="hm-block" data-block-id="'+_esc(block.blockId)+'" style="margin-bottom:var(--space-4);'+opacity+'">';

      // Edit mode toolbar
      if (state.editMode) {
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);background:var(--gray-50);border:1px dashed var(--border);border-radius:var(--radius-md) var(--radius-md) 0 0;font-size:var(--text-xs);color:var(--text-secondary)">';
        h += '<span>'+_esc(block.type)+' — '+_esc(block.blockId)+'</span>';
        h += '<div style="display:flex;gap:var(--space-1)">';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-mr-action="move-up" data-block="'+_esc(block.blockId)+'" title="'+_t('Di lên','Move up')+'">▲</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-mr-action="move-down" data-block="'+_esc(block.blockId)+'" title="'+_t('Di xuống','Move down')+'">▼</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-mr-action="toggle-visible" data-block="'+_esc(block.blockId)+'" title="'+_t('Ẩn/Hiện','Toggle')+'">'+(block.visible===false?'👁‍🗨':'👁')+'</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-mr-action="copy-block" data-block="'+_esc(block.blockId)+'" title="'+_t('Copy','Copy')+'">📋</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" style="color:var(--red)" data-mr-action="delete-block" data-block="'+_esc(block.blockId)+'" title="'+_t('Xóa','Delete')+'">🗑</button>';
        h += '</div></div>';
      }

      // Block title
      if (block.title && block.type !== 'kpi-row' && block.type !== 'filter-bar' && block.type !== 'action-toolbar' && block.type !== 'info-banner') {
        h += '<h3 style="margin:0 0 var(--space-3);font-size:var(--text-md);font-weight:var(--font-bold)">'+_esc(_t(block.title.vi||'', block.title.en||''))+'</h3>';
      }

      // Render block content
      h += _renderBlockContent(block, blockData, state, reactiveCtx);

      h += '</div>';

      // Edit mode: add block button after each block
      if (state.editMode) {
        h += _renderAddBtn(moduleId, activeTab.tabId, block.blockId);
      }
    });

    if (!blocks.length) {
      h += '<div class="hm-empty"><div class="hm-empty-icon">📭</div>'+_t('Tab trống. ','Empty tab. ');
      if (state.editMode) h += _t('Click + để thêm block.','Click + to add blocks.');
      h += '</div>';
      if (state.editMode) {
        h += _renderAddBtn(moduleId, activeTab.tabId, null);
      }
    }

    h += '</div>';
  }

  container.innerHTML = h;

  /* ── Fetch data for blocks ─────────────────────────────────────────── */
  if (activeTab) {
    (activeTab.blocks || []).forEach(function(block) {
      if (block.config && block.config.dataSource && block.config.dataSource.api) {
        _fetchAndRender(container, moduleId, block);
      }
    });
  }

  /* ── Attach events ─────────────────────────────────────────────────── */
  _attachEvents(container, moduleId, schema);
}

/* ── Render Block Content ────────────────────────────────────────────────── */
function _renderBlockContent(block, data, state, ctx) {
  var config = block.config || {};

  switch (block.type) {
    case 'kpi-row':       return BE.renderKpiRow ? BE.renderKpiRow(config, data) : '';
    case 'filter-bar':    return BE.renderFilterBar ? BE.renderFilterBar(config, data) : '';
    case 'data-table':    return BE.renderAdvancedTable ? BE.renderAdvancedTable(config, data, state, block.blockId) : '';
    case 'action-toolbar':return BE.renderToolbar ? BE.renderToolbar(config, data) : '';
    case 'chart-bar':     return BE.renderBarChart ? BE.renderBarChart(config, data) : '';
    case 'chart-donut':   return BE.renderDonutChart ? BE.renderDonutChart(config, data) : '';
    case 'data-cards':    return BE.renderCardGrid ? BE.renderCardGrid(config, data) : '';
    case 'data-timeline': return BE.renderTimeline ? BE.renderTimeline(config, data) : '';
    case 'form-standard': return _renderForm(block, data, state);
    case 'section-header':return BE.renderSectionHeader ? BE.renderSectionHeader(config) : '';
    case 'info-banner':   return BE.renderInfoBanner ? BE.renderInfoBanner(config) : '';
    case 'data-detail':   return _renderDetail(block, data, state);
    case 'data-tree':     return _renderTree(block, data);
    case 'action-status-flow': return _renderStatusFlow(block, data, state);
    default:
      return '<div class="hm-empty" style="padding:var(--space-4)">'+_t('Block type chưa hỗ trợ: ','Unsupported block type: ')+_esc(block.type)+'</div>';
  }
}

/* ── Form Renderer ───────────────────────────────────────────────────────── */
function _renderForm(block, data, state) {
  var config = block.config || {};
  var fields = config.fields || [];
  var cols = config.columns || 2;
  var h = '';

  h += '<div class="hm-card" style="max-width:960px">';
  h += '<div style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:var(--space-4)">';

  fields.forEach(function(field) {
    var span = field.span === 'full' ? 'grid-column:1/-1;' : '';
    h += '<div style="'+span+'">';
    h += '<label class="hm-label'+(field.validation && field.validation.required ? ' hm-label-required' : '')+'">'+_esc(_t(field.label.vi||'', field.label.en||''))+'</label>';

    var val = (data && data[field.key]) || field.defaultValue || '';

    switch (field.type) {
      case 'textarea':
        h += '<textarea class="hm-input hm-textarea" name="'+_esc(field.key)+'" rows="3" placeholder="'+_esc(_t(field.placeholder&&field.placeholder.vi||'', field.placeholder&&field.placeholder.en||''))+'">'+_esc(val)+'</textarea>';
        break;
      case 'select':
        h += '<select class="hm-input hm-select" name="'+_esc(field.key)+'">';
        h += '<option value="">-- '+_t('Chọn','Select')+' --</option>';
        (field.options || []).forEach(function(opt) {
          var optVal = typeof opt === 'string' ? opt : opt.value;
          var optLabel = typeof opt === 'string' ? opt : opt.label;
          h += '<option value="'+_esc(optVal)+'"'+(optVal===val?' selected':'')+'>'+_esc(optLabel)+'</option>';
        });
        h += '</select>';
        break;
      case 'date':
        h += '<input type="date" class="hm-input" name="'+_esc(field.key)+'" value="'+_esc(val)+'">';
        break;
      case 'number':
        h += '<input type="number" class="hm-input" name="'+_esc(field.key)+'" value="'+_esc(val)+'" min="'+(field.validation&&field.validation.min||'')+'" max="'+(field.validation&&field.validation.max||'')+'">';
        break;
      default:
        h += '<input type="text" class="hm-input" name="'+_esc(field.key)+'" value="'+_esc(val)+'" placeholder="'+_esc(_t(field.placeholder&&field.placeholder.vi||'', field.placeholder&&field.placeholder.en||''))+'">';
    }

    // Validation error placeholder
    h += '<div class="hm-field-error" data-field-error="'+_esc(field.key)+'" style="color:var(--red);font-size:var(--text-xs);margin-top:2px;display:none"></div>';
    h += '</div>';
  });

  h += '</div>';

  // Buttons
  h += '<div style="display:flex;justify-content:flex-end;gap:var(--space-3);margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--border)">';
  if (config.cancelAction) {
    h += '<button class="hm-btn hm-btn-secondary" data-mr-action="form-cancel" data-block="'+_esc(block.blockId)+'">'+_t('Hủy','Cancel')+'</button>';
  }
  h += '<button class="hm-btn hm-btn-primary" data-mr-action="form-submit" data-block="'+_esc(block.blockId)+'">'+_t('Lưu','Save')+'</button>';
  h += '</div></div>';

  return h;
}

/* ── Detail Renderer ─────────────────────────────────────────────────────── */
function _renderDetail(block, data, state) {
  if (!data || Object.keys(data).length === 0) {
    return '<div class="hm-empty"><div class="hm-empty-icon">🔍</div>'+_t('Chọn một mục để xem chi tiết','Select an item to view details')+'</div>';
  }
  var config = block.config || {};
  var fields = config.fields || [];
  var h = '<div class="hm-card">';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">';
  fields.forEach(function(field) {
    var val = data[field.key];
    h += '<div style="padding:var(--space-2) 0;border-bottom:1px solid var(--border)">';
    h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">'+_esc(_t(field.label.vi||'', field.label.en||''))+'</div>';
    if (field.type === 'badge') {
      h += '<div style="margin-top:4px">'+BE.badge(val)+'</div>';
    } else if (field.type === 'date') {
      h += '<div style="margin-top:4px;font-weight:var(--font-medium)">'+_esc(val ? new Date(val).toLocaleDateString('vi-VN') : '-')+'</div>';
    } else {
      h += '<div style="margin-top:4px;font-weight:var(--font-medium)">'+_esc(String(val||'-'))+'</div>';
    }
    h += '</div>';
  });
  h += '</div></div>';
  return h;
}

/* ── Tree Renderer ───────────────────────────────────────────────────────── */
function _renderTree(block, data) {
  var config = block.config || {};
  var items = data || [];
  if (!items.length) return '<div class="hm-empty">'+_t('Không có dữ liệu','No data')+'</div>';

  function renderNode(node, level) {
    var children = node[config.childrenKey || 'children'] || [];
    var indent = level * 24;
    var h = '<div style="padding:var(--space-2) var(--space-3);padding-left:'+(indent+12)+'px;border-bottom:1px solid var(--border);font-size:var(--text-sm)">';
    h += '<span style="color:var(--text-secondary);margin-right:var(--space-2)">'+(children.length?'▼':'•')+'</span>';
    h += _esc(node.so_number || node.jo_number || node.wo_number || node.name || '') + ' ';
    if (node.status) h += BE.badge(node.status);
    h += '</div>';
    children.forEach(function(child) {
      // child might have nested children too (JO → WO)
      var subChildren = child.work_orders || child[config.childrenKey || 'children'] || [];
      h += renderNode(child, level + 1);
      subChildren.forEach(function(sub) { h += renderNode(sub, level + 2); });
    });
    return h;
  }

  var h = '<div class="hm-card">';
  items.forEach(function(item) { h += renderNode(item, 0); });
  h += '</div>';
  return h;
}

/* ── Status Flow Renderer ────────────────────────────────────────────────── */
function _renderStatusFlow(block, data, state) {
  var config = block.config || {};
  var currentStatus = data && data[config.statusField || 'status'];
  if (!currentStatus) return '';
  var transitions = (config.transitions || {})[currentStatus] || [];
  if (!transitions.length) return '<div style="color:var(--text-secondary);font-size:var(--text-sm)">'+_t('Không có chuyển đổi khả dụng','No transitions available')+'</div>';

  var h = '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3)">';
  h += '<span style="font-size:var(--text-sm);color:var(--text-secondary);align-self:center">'+_t('Chuyển sang:','Transition to:')+'</span>';
  transitions.forEach(function(target) {
    var variant = target === 'cancelled' ? 'danger' : 'primary';
    h += '<button class="hm-btn hm-btn-'+variant+' hm-btn-sm" data-mr-action="status-transition" data-target="'+_esc(target)+'" data-block="'+_esc(block.blockId)+'">'+_esc(target)+'</button>';
  });
  h += '</div>';
  return h;
}

/* ── Add Block Button (edit mode) ────────────────────────────────────────── */
function _renderAddBtn(moduleId, tabId, afterBlockId) {
  return '<div style="display:flex;justify-content:center;padding:var(--space-2) 0"><button class="hm-btn hm-btn-ghost hm-btn-sm" style="border:1px dashed var(--border);color:var(--text-tertiary)" data-mr-action="add-block" data-tab="'+_esc(tabId)+'" data-after="'+_esc(afterBlockId||'')+'">+ '+_t('Thêm block','Add Block')+'</button></div>';
}

/* ── Fetch Data and Re-render Block ──────────────────────────────────────── */
function _fetchAndRender(container, moduleId, block) {
  var ds = block.config && block.config.dataSource;
  if (!ds || !ds.api) return;

  var state = BE.getModuleState(moduleId);
  var params = Object.assign({}, ds.params || {}, state.filters || {});

  // Resolve bindings in params
  var ctx = { state: state, currentUser: (typeof currentUser !== 'undefined' ? currentUser : {}) };
  Object.keys(params).forEach(function(k) {
    if (typeof params[k] === 'string' && params[k].indexOf('{{') >= 0) {
      params[k] = BE.evaluateExpression(params[k].replace(/\{\{|\}\}/g, ''), ctx);
    }
  });

  // Add pagination params
  var ts = state.tableStates && state.tableStates[block.blockId];
  if (ts) {
    params.offset = ts.page * (ts.pageSize || 25);
    params.limit = ts.pageSize || 25;
  }

  _apiGet(ds.api, params).then(function(r) {
    if (!r || !r.ok) return;

    // Extract data by key
    var data = ds.dataKey ? r[ds.dataKey] : r;
    state.blockData[block.blockId] = data;

    // Update total for pagination
    if (r.total !== undefined && ts) {
      ts.total = r.total;
    }

    // Re-render just this block
    var blockEl = container.querySelector('[data-block-id="'+block.blockId+'"]');
    if (blockEl) {
      // Find the content area (skip edit toolbar and title)
      var lastChild = blockEl.lastElementChild;
      if (lastChild) {
        var ctx2 = { state: state, currentUser: (typeof currentUser !== 'undefined' ? currentUser : {}), data: data };
        lastChild.outerHTML = '<div>'+_renderBlockContent(block, data, state, ctx2)+'</div>';
      }
    }
  }).catch(function(err) {
    console.warn('[ModuleRouter] Fetch failed for', block.blockId, err);
  });
}

/* ── Event Handler ───────────────────────────────────────────────────────── */
function _attachEvents(container, moduleId, schema) {
  container.onclick = function(e) {
    var btn = e.target.closest('[data-mr-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-mr-action');
    var state = BE.getModuleState(moduleId);

    switch (action) {
      case 'switch-tab':
        state.activeTab = btn.getAttribute('data-tab');
        _renderFromSchema(container, schema);
        break;

      case 'edit-module':
        state.editMode = true;
        _renderFromSchema(container, schema);
        break;

      case 'save-module':
        state.editMode = false;
        BE.saveModuleSchema(moduleId, schema);
        BE.pushSchemaVersion(moduleId, schema);
        BE.toast(_t('Đã lưu module','Module saved'), 'success');
        _renderFromSchema(container, schema);
        break;

      case 'cancel-edit':
        state.editMode = false;
        _renderFromSchema(container, schema);
        break;

      case 'undo':
        BE.undo(moduleId);
        _renderFromSchema(container, schema);
        break;

      case 'redo':
        BE.redo(moduleId);
        _renderFromSchema(container, schema);
        break;

      case 'move-up':
      case 'move-down':
        var blockId = btn.getAttribute('data-block');
        var tabKey = state.activeTab;
        if (action === 'move-up') BE.moveBlockUp(moduleId, tabKey, blockId);
        else BE.moveBlockDown(moduleId, tabKey, blockId);
        // Reorder in schema
        var tab = schema.tabs.find(function(t){ return t.tabId === tabKey; });
        if (tab) {
          var idx = tab.blocks.findIndex(function(b){ return b.blockId === blockId; });
          if (idx >= 0) {
            var swap = action === 'move-up' ? idx-1 : idx+1;
            if (swap >= 0 && swap < tab.blocks.length) {
              var tmp = tab.blocks[idx];
              tab.blocks[idx] = tab.blocks[swap];
              tab.blocks[swap] = tmp;
              // Update order
              tab.blocks.forEach(function(b, i){ b.order = i+1; });
            }
          }
        }
        _renderFromSchema(container, schema);
        break;

      case 'toggle-visible':
        var bid = btn.getAttribute('data-block');
        schema.tabs.forEach(function(t) {
          t.blocks.forEach(function(b) {
            if (b.blockId === bid) b.visible = !(b.visible !== false);
          });
        });
        _renderFromSchema(container, schema);
        break;

      case 'delete-block':
        var delId = btn.getAttribute('data-block');
        if (!confirm(_t('Xóa block này?','Delete this block?'))) return;
        schema.tabs.forEach(function(t) {
          t.blocks = t.blocks.filter(function(b){ return b.blockId !== delId; });
        });
        _renderFromSchema(container, schema);
        break;

      case 'copy-block':
        BE.copyBlockToClipboard(moduleId, btn.getAttribute('data-block'));
        break;

      case 'add-block':
        var tabId = btn.getAttribute('data-tab');
        var afterId = btn.getAttribute('data-after');
        BE.showBlockLibrary(function(blockType) {
          var newBlock = {
            blockId: 'blk-' + Date.now().toString(36),
            type: blockType,
            visible: true,
            order: 99,
            title: { vi: BE.BLOCK_CATALOG[blockType] ? BE.BLOCK_CATALOG[blockType].label : blockType, en: BE.BLOCK_CATALOG[blockType] ? BE.BLOCK_CATALOG[blockType].labelEn : blockType },
            config: {}
          };
          var targetTab = schema.tabs.find(function(t){ return t.tabId === tabId; });
          if (targetTab) {
            if (afterId) {
              var afterIdx = targetTab.blocks.findIndex(function(b){ return b.blockId === afterId; });
              targetTab.blocks.splice(afterIdx + 1, 0, newBlock);
            } else {
              targetTab.blocks.unshift(newBlock);
            }
            targetTab.blocks.forEach(function(b, i){ b.order = i+1; });
          }
          _renderFromSchema(container, schema);
        });
        break;

      case 'form-submit':
        var formBlockId = btn.getAttribute('data-block');
        var formBlock = null;
        schema.tabs.forEach(function(t) {
          t.blocks.forEach(function(b) { if (b.blockId === formBlockId) formBlock = b; });
        });
        if (formBlock) _handleFormSubmit(container, moduleId, formBlock, schema);
        break;

      case 'form-cancel':
        var cancelBlock = null;
        schema.tabs.forEach(function(t) {
          t.blocks.forEach(function(b) { if (b.blockId === btn.getAttribute('data-block')) cancelBlock = b; });
        });
        if (cancelBlock && cancelBlock.config.cancelAction) {
          if (cancelBlock.config.cancelAction.type === 'navigate') {
            state.activeTab = cancelBlock.config.cancelAction.tab;
            _renderFromSchema(container, schema);
          }
        }
        break;

      case 'status-transition':
        var target = btn.getAttribute('data-target');
        var stBlock = null;
        schema.tabs.forEach(function(t) {
          t.blocks.forEach(function(b) { if (b.blockId === btn.getAttribute('data-block')) stBlock = b; });
        });
        if (stBlock && stBlock.config.transitionApi) {
          var body = JSON.parse(JSON.stringify(stBlock.config.transitionApi.bodyTemplate || {}));
          // Resolve bindings
          var ctx = { state: state, targetStatus: target };
          var bodyStr = JSON.stringify(body);
          bodyStr = bodyStr.replace(/\{\{\s*state\.selectedId\s*\}\}/g, state.selectedId || '');
          bodyStr = bodyStr.replace(/\{\{\s*targetStatus\s*\}\}/g, target);
          body = JSON.parse(bodyStr);

          _apiPost(stBlock.config.transitionApi.action, body).then(function(r) {
            if (r && r.ok) {
              BE.toast(_t('Đã chuyển trạng thái','Status changed'), 'success');
              _renderFromSchema(container, schema);
            } else {
              BE.toast((r && r.error) || _t('Lỗi','Error'), 'error');
            }
          });
        }
        break;
    }
  };

  // Handle table row clicks
  container.addEventListener('click', function(e) {
    var row = e.target.closest('tr[data-row-click]');
    if (!row) return;
    var clickConfig = null;
    try { clickConfig = JSON.parse(row.getAttribute('data-row-click')); } catch(ex) {}
    if (clickConfig && clickConfig.action === 'navigate-tab') {
      var state = BE.getModuleState(moduleId);
      state.activeTab = clickConfig.tab;
      state.selectedId = clickConfig.value;
      _renderFromSchema(container, schema);
    }
  });
}

/* ── Form Submit Handler ─────────────────────────────────────────────────── */
function _handleFormSubmit(container, moduleId, formBlock, schema) {
  var config = formBlock.config || {};
  var fields = config.fields || [];

  // Collect form data
  var formData = {};
  fields.forEach(function(field) {
    var el = container.querySelector('[name="'+field.key+'"]');
    if (el) formData[field.key] = el.value;
  });

  // Validate
  if (BE.validateForm) {
    var validation = BE.validateForm(fields, formData, {});
    if (!validation.valid) {
      // Show errors
      Object.keys(validation.errors).forEach(function(key) {
        var errEl = container.querySelector('[data-field-error="'+key+'"]');
        if (errEl) {
          errEl.textContent = validation.errors[key];
          errEl.style.display = 'block';
        }
      });
      BE.toast(_t('Vui lòng kiểm tra lại','Please check the form'), 'warning');
      return;
    }
  }

  // Clear previous errors
  container.querySelectorAll('.hm-field-error').forEach(function(el) { el.style.display = 'none'; });

  // Submit
  if (config.submitApi) {
    _apiPost(config.submitApi.action, formData).then(function(r) {
      if (r && r.ok) {
        // Execute onSuccess chain
        if (config.onSuccess) {
          var ctx = { state: BE.getModuleState(moduleId), formData: formData, result: r };
          if (config.onSuccess.type === 'chain' && BE.executeChain) {
            BE.executeChain(config.onSuccess.actions, ctx).then(function() {
              // Re-render if navigated
              var state = BE.getModuleState(moduleId);
              if (config.onSuccess.actions.some(function(a){ return a.type === 'navigate'; })) {
                config.onSuccess.actions.forEach(function(a) {
                  if (a.type === 'navigate') state.activeTab = a.tab;
                });
              }
              _renderFromSchema(container, schema);
            });
          } else {
            BE.toast(_t('Thành công','Success'), 'success');
            _renderFromSchema(container, schema);
          }
        } else {
          BE.toast(_t('Thành công','Success'), 'success');
        }
      } else {
        BE.toast((r && r.detail) || (r && r.error) || _t('Lỗi','Error'), 'error');
      }
    }).catch(function() {
      BE.toast(_t('Lỗi kết nối','Connection error'), 'error');
    });
  }
}

/* ── Export ───────────────────────────────────────────────────────────────── */
window.HmModuleRouter = {
  renderModuleById: renderModuleById,
  clearCache: function(moduleId) { if (moduleId) delete _schemaCache[moduleId]; else _schemaCache = {}; },
};

})();
