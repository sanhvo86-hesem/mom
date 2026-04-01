/* ============================================================================
   HESEM QMS Block Engine v1.0
   Hệ thống LEGO: Xây dựng module từ các block có thể sắp xếp, ẩn hiện,
   tùy chỉnh. Mỗi module = danh sách tabs, mỗi tab = danh sách blocks.
   ============================================================================ */
(function(){
'use strict';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function _t(vi,en){ return (typeof lang!=='undefined'&&lang==='en')?en:vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(v==null?'':String(v))); return d.innerHTML; }

/* ── Block Registry: tất cả loại block có thể dùng ──────────────────────── */
var BLOCK_CATALOG = {
  /* LAYOUT */
  'page-header':    { label:'Tiêu đề trang',    labelEn:'Page Header',    category:'layout',  icon:'📄' },
  'kpi-row':        { label:'Dãy KPI',           labelEn:'KPI Row',        category:'layout',  icon:'📊' },
  'tab-bar':        { label:'Thanh tab',          labelEn:'Tab Bar',        category:'layout',  icon:'📑' },
  'filter-bar':     { label:'Bộ lọc',            labelEn:'Filter Bar',     category:'layout',  icon:'🔍' },
  'section-header': { label:'Tiêu đề mục',       labelEn:'Section Header', category:'layout',  icon:'📝' },
  'spacer':         { label:'Khoảng cách',        labelEn:'Spacer',         category:'layout',  icon:'↕️' },

  /* DATA */
  'data-table':     { label:'Bảng dữ liệu',      labelEn:'Data Table',     category:'data',    icon:'📋' },
  'data-cards':     { label:'Lưới thẻ',           labelEn:'Card Grid',      category:'data',    icon:'🗂️' },
  'data-list':      { label:'Danh sách',           labelEn:'List',           category:'data',    icon:'📃' },
  'data-tree':      { label:'Cây phân cấp',       labelEn:'Tree View',      category:'data',    icon:'🌳' },
  'data-timeline':  { label:'Dòng thời gian',     labelEn:'Timeline',       category:'data',    icon:'📅' },
  'data-gantt':     { label:'Biểu đồ Gantt',      labelEn:'Gantt Chart',    category:'data',    icon:'📊' },

  /* FORM */
  'form-standard':  { label:'Biểu mẫu',           labelEn:'Form',           category:'form',    icon:'📝' },
  'form-wizard':    { label:'Biểu mẫu từng bước', labelEn:'Step Wizard',    category:'form',    icon:'🧙' },
  'form-inline':    { label:'Chỉnh sửa nhanh',    labelEn:'Inline Edit',    category:'form',    icon:'✏️' },

  /* CHART */
  'chart-bar':      { label:'Biểu đồ cột',        labelEn:'Bar Chart',      category:'chart',   icon:'📊' },
  'chart-donut':    { label:'Biểu đồ tròn',       labelEn:'Donut Chart',    category:'chart',   icon:'🍩' },
  'chart-line':     { label:'Biểu đồ đường',      labelEn:'Line Chart',     category:'chart',   icon:'📈' },
  'chart-heatmap':  { label:'Bản đồ nhiệt',       labelEn:'Heatmap',        category:'chart',   icon:'🗺️' },

  /* ACTION */
  'action-toolbar': { label:'Thanh công cụ',       labelEn:'Toolbar',        category:'action',  icon:'🔧' },
  'action-summary': { label:'Tóm tắt',             labelEn:'Summary',        category:'action',  icon:'📋' },
};

var BLOCK_CATEGORIES = [
  { key:'layout', label:'Bố cục',      labelEn:'Layout',  color:'#3b82f6' },
  { key:'data',   label:'Dữ liệu',     labelEn:'Data',    color:'#16a34a' },
  { key:'form',   label:'Biểu mẫu',    labelEn:'Form',    color:'#7c3aed' },
  { key:'chart',  label:'Biểu đồ',     labelEn:'Chart',   color:'#d97706' },
  { key:'action', label:'Hành động',    labelEn:'Action',  color:'#dc2626' },
];

/* ── Module Layout Store ─────────────────────────────────────────────────── */
var _moduleLayouts = {};  // moduleId → layout config
var _userOverrides = {};  // moduleId → user customization

/**
 * Đăng ký layout cho 1 module.
 * @param {string} moduleId
 * @param {object} layout { title:{vi,en}, icon, tabs:[{key,title:{vi,en},blocks:[]}] }
 */
function registerModule(moduleId, layout) {
  _moduleLayouts[moduleId] = JSON.parse(JSON.stringify(layout));
}

/**
 * Lấy layout hiện tại cho module (áp dụng user overrides nếu có).
 */
function getModuleLayout(moduleId) {
  var base = _moduleLayouts[moduleId];
  if (!base) return null;
  var layout = JSON.parse(JSON.stringify(base));

  // Áp dụng user overrides từ localStorage
  var overrides = _loadUserOverrides(moduleId);
  if (overrides) {
    // Áp dụng tab order
    if (overrides.tabOrder && Array.isArray(overrides.tabOrder)) {
      var ordered = [];
      overrides.tabOrder.forEach(function(key) {
        var tab = layout.tabs.find(function(t) { return t.key === key; });
        if (tab) ordered.push(tab);
      });
      // Thêm tabs mới chưa có trong override
      layout.tabs.forEach(function(t) {
        if (!ordered.find(function(o) { return o.key === t.key; })) ordered.push(t);
      });
      layout.tabs = ordered;
    }

    // Áp dụng block visibility
    if (overrides.hiddenBlocks) {
      layout.tabs.forEach(function(tab) {
        tab.blocks = tab.blocks.map(function(b) {
          if (overrides.hiddenBlocks.indexOf(b.id) >= 0) b.visible = false;
          return b;
        });
      });
    }

    // Áp dụng block order per tab
    if (overrides.blockOrder) {
      Object.keys(overrides.blockOrder).forEach(function(tabKey) {
        var tab = layout.tabs.find(function(t) { return t.key === tabKey; });
        if (tab && Array.isArray(overrides.blockOrder[tabKey])) {
          var orderedBlocks = [];
          overrides.blockOrder[tabKey].forEach(function(bId) {
            var block = tab.blocks.find(function(b) { return b.id === bId; });
            if (block) orderedBlocks.push(block);
          });
          tab.blocks.forEach(function(b) {
            if (!orderedBlocks.find(function(o) { return o.id === b.id; })) orderedBlocks.push(b);
          });
          tab.blocks = orderedBlocks;
        }
      });
    }
  }

  return layout;
}

/* ── Render Engine ───────────────────────────────────────────────────────── */

/**
 * Render 1 block thành HTML.
 * @param {object} block Block definition
 * @param {object} data Data đã load từ API
 * @returns {string} HTML
 */
function renderBlock(block, data) {
  if (!block || block.visible === false) return '';

  var catalog = BLOCK_CATALOG[block.type];
  var html = '';

  html += '<div class="hm-block" data-block-id="' + _esc(block.id) + '" data-block-type="' + _esc(block.type) + '">';

  // Block header (có nút ẩn/hiện trong edit mode)
  if (block.title) {
    html += '<div class="hm-block-header">';
    html += '<span class="hm-block-title">' + _esc(_t(block.title.vi || block.title, block.title.en || block.title)) + '</span>';
    html += '<span class="hm-block-actions">';
    html += '<button class="hm-block-btn" data-action="toggle-block" data-block-id="' + _esc(block.id) + '" title="' + _t('Ẩn block', 'Hide block') + '">👁</button>';
    html += '<button class="hm-block-btn" data-action="move-up" data-block-id="' + _esc(block.id) + '" title="' + _t('Di lên', 'Move up') + '">▲</button>';
    html += '<button class="hm-block-btn" data-action="move-down" data-block-id="' + _esc(block.id) + '" title="' + _t('Di xuống', 'Move down') + '">▼</button>';
    html += '</span>';
    html += '</div>';
  }

  // Block content
  html += '<div class="hm-block-content">';

  switch (block.type) {
    case 'kpi-row':
      html += renderKpiRow(block.config, data);
      break;
    case 'data-table':
      html += renderDataTable(block.config, data);
      break;
    case 'filter-bar':
      html += renderFilterBar(block.config, data);
      break;
    case 'section-header':
      html += '<h3 style="margin:0;font-size:var(--text-lg);font-weight:var(--font-bold)">' + _esc(_t(block.config.text || '', block.config.textEn || '')) + '</h3>';
      break;
    case 'spacer':
      html += '<div style="height:' + (block.config.height || 16) + 'px"></div>';
      break;
    case 'chart-bar':
      html += renderBarChart(block.config, data);
      break;
    case 'chart-donut':
      html += renderDonutChart(block.config, data);
      break;
    case 'action-toolbar':
      html += renderToolbar(block.config, data);
      break;
    case 'data-cards':
      html += renderCardGrid(block.config, data);
      break;
    default:
      html += '<div class="hm-empty">' + _t('Block chưa có nội dung', 'Block has no content') + '</div>';
  }

  html += '</div></div>';
  return html;
}

/* ── Block Renderers ─────────────────────────────────────────────────────── */

function renderKpiRow(config, data) {
  var items = config.items || [];
  var html = '<div class="hm-kpi-row">';
  items.forEach(function(item) {
    var val = data && data[item.dataKey] !== undefined ? data[item.dataKey] : (item.default || 0);
    var color = item.color || 'var(--text-primary)';
    html += '<div class="hm-kpi-card">';
    html += '<div class="hm-kpi-value" style="color:' + color + '">' + _esc(String(val)) + (item.suffix || '') + '</div>';
    html += '<div class="hm-kpi-label">' + _esc(_t(item.label || '', item.labelEn || '')) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function renderDataTable(config, data) {
  var columns = config.columns || [];
  var rows = (data && data[config.dataKey]) || [];
  if (!rows.length) return '<div class="hm-empty">' + _t('Không có dữ liệu', 'No data') + '</div>';

  var html = '<div style="overflow-x:auto"><table class="hm-table"><thead><tr>';
  columns.forEach(function(col) {
    html += '<th>' + _esc(_t(col.label || col.key, col.labelEn || col.key)) + '</th>';
  });
  html += '</tr></thead><tbody>';

  rows.forEach(function(row) {
    html += '<tr>';
    columns.forEach(function(col) {
      var val = row[col.key] !== undefined ? row[col.key] : '';
      if (col.type === 'badge') {
        html += '<td><span class="hm-badge hm-badge-' + _esc(String(val)) + '">' + _esc(String(val)) + '</span></td>';
      } else if (col.type === 'number') {
        html += '<td style="text-align:right;font-variant-numeric:tabular-nums">' + _esc(String(val)) + '</td>';
      } else {
        html += '<td>' + _esc(String(val)) + '</td>';
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

function renderFilterBar(config, data) {
  var filters = config.filters || [];
  var html = '<div class="hm-filter-bar">';
  filters.forEach(function(f) {
    if (f.type === 'search') {
      html += '<input type="text" class="hm-input" placeholder="' + _esc(_t(f.placeholder || 'Tìm kiếm...', f.placeholderEn || 'Search...')) + '" data-filter="' + _esc(f.key) + '">';
    } else if (f.type === 'select') {
      html += '<select class="hm-input hm-select" data-filter="' + _esc(f.key) + '">';
      html += '<option value="">' + _esc(_t(f.allLabel || 'Tất cả', f.allLabelEn || 'All')) + '</option>';
      (f.options || []).forEach(function(opt) {
        html += '<option value="' + _esc(opt.value) + '">' + _esc(_t(opt.label, opt.labelEn || opt.label)) + '</option>';
      });
      html += '</select>';
    } else if (f.type === 'date') {
      html += '<input type="date" class="hm-input" data-filter="' + _esc(f.key) + '" style="width:auto">';
    }
  });
  if (config.showRefresh !== false) {
    html += '<button class="hm-btn hm-btn-primary" data-action="refresh">' + _t('Làm mới', 'Refresh') + '</button>';
  }
  html += '</div>';
  return html;
}

function renderBarChart(config, data) {
  var items = (data && data[config.dataKey]) || config.items || [];
  if (!items.length) return '<div class="hm-empty">' + _t('Không có dữ liệu', 'No data') + '</div>';

  var max = 0;
  items.forEach(function(i) { if ((i.value || 0) > max) max = i.value || 0; });
  if (max === 0) max = 1;

  var html = '<div style="display:flex;flex-direction:column;gap:var(--space-2)">';
  items.forEach(function(item) {
    var pct = Math.round(((item.value || 0) / max) * 100);
    var color = item.color || 'var(--brand-2)';
    html += '<div style="display:flex;align-items:center;gap:var(--space-3)">';
    html += '<span style="min-width:80px;font-size:var(--text-xs);color:var(--text-secondary);text-align:right">' + _esc(_t(item.label || '', item.labelEn || '')) + '</span>';
    html += '<div style="flex:1;height:20px;background:var(--gray-100);border-radius:var(--radius-sm);overflow:hidden">';
    html += '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:var(--radius-sm);transition:width 0.3s"></div>';
    html += '</div>';
    html += '<span style="min-width:40px;font-size:var(--text-xs);font-weight:var(--font-semibold)">' + _esc(String(item.value || 0)) + '</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function renderDonutChart(config, data) {
  var items = (data && data[config.dataKey]) || config.items || [];
  var total = 0;
  items.forEach(function(i) { total += (i.value || 0); });
  if (total === 0) return '<div class="hm-empty">' + _t('Không có dữ liệu', 'No data') + '</div>';

  // CSS conic-gradient donut
  var gradientParts = [];
  var cumPct = 0;
  items.forEach(function(item) {
    var pct = ((item.value || 0) / total) * 100;
    gradientParts.push((item.color || '#94a3b8') + ' ' + cumPct + '% ' + (cumPct + pct) + '%');
    cumPct += pct;
  });

  var html = '<div style="display:flex;align-items:center;gap:var(--space-6);flex-wrap:wrap">';
  html += '<div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(' + gradientParts.join(',') + ');display:flex;align-items:center;justify-content:center;flex-shrink:0">';
  html += '<div style="width:72px;height:72px;border-radius:50%;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;font-size:var(--text-xl);font-weight:var(--font-bold)">' + total + '</div>';
  html += '</div>';

  // Legend
  html += '<div style="display:flex;flex-direction:column;gap:var(--space-2)">';
  items.forEach(function(item) {
    html += '<div style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm)">';
    html += '<span style="width:10px;height:10px;border-radius:2px;background:' + (item.color || '#94a3b8') + ';flex-shrink:0"></span>';
    html += '<span>' + _esc(_t(item.label || '', item.labelEn || '')) + ': <b>' + (item.value || 0) + '</b></span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function renderToolbar(config, data) {
  var buttons = config.buttons || [];
  var html = '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap">';
  buttons.forEach(function(btn) {
    var cls = 'hm-btn hm-btn-' + (btn.variant || 'secondary');
    if (btn.size) cls += ' hm-btn-' + btn.size;
    html += '<button class="' + cls + '" data-action="' + _esc(btn.action || '') + '">';
    if (btn.icon) html += btn.icon + ' ';
    html += _esc(_t(btn.label || '', btn.labelEn || ''));
    html += '</button>';
  });
  html += '</div>';
  return html;
}

function renderCardGrid(config, data) {
  var items = (data && data[config.dataKey]) || [];
  if (!items.length) return '<div class="hm-empty">' + _t('Không có dữ liệu', 'No data') + '</div>';

  var cols = config.columns || 3;
  var html = '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:var(--space-3)">';
  items.forEach(function(item) {
    html += '<div class="hm-card">';
    if (config.titleKey) html += '<div style="font-weight:var(--font-semibold);margin-bottom:var(--space-2)">' + _esc(item[config.titleKey] || '') + '</div>';
    if (config.subtitleKey) html += '<div style="font-size:var(--text-sm);color:var(--text-secondary)">' + _esc(item[config.subtitleKey] || '') + '</div>';
    if (config.badgeKey) html += '<span class="hm-badge hm-badge-' + _esc(item[config.badgeKey] || 'draft') + '">' + _esc(item[config.badgeKey] || '') + '</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* ── User Override Persistence ────────────────────────────────────────────── */

function _loadUserOverrides(moduleId) {
  try {
    var key = 'hesem_layout_' + moduleId;
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function _saveUserOverrides(moduleId, overrides) {
  try {
    var key = 'hesem_layout_' + moduleId;
    localStorage.setItem(key, JSON.stringify(overrides));
  } catch (e) {}
}

function toggleBlockVisibility(moduleId, blockId) {
  var overrides = _loadUserOverrides(moduleId) || {};
  if (!overrides.hiddenBlocks) overrides.hiddenBlocks = [];
  var idx = overrides.hiddenBlocks.indexOf(blockId);
  if (idx >= 0) overrides.hiddenBlocks.splice(idx, 1);
  else overrides.hiddenBlocks.push(blockId);
  _saveUserOverrides(moduleId, overrides);
}

function moveBlock(moduleId, tabKey, blockId, direction) {
  var overrides = _loadUserOverrides(moduleId) || {};
  if (!overrides.blockOrder) overrides.blockOrder = {};

  var layout = getModuleLayout(moduleId);
  if (!layout) return;
  var tab = layout.tabs.find(function(t) { return t.key === tabKey; });
  if (!tab) return;

  var order = tab.blocks.map(function(b) { return b.id; });
  var idx = order.indexOf(blockId);
  if (idx < 0) return;

  if (direction === 'up' && idx > 0) {
    var tmp = order[idx - 1]; order[idx - 1] = order[idx]; order[idx] = tmp;
  } else if (direction === 'down' && idx < order.length - 1) {
    var tmp2 = order[idx + 1]; order[idx + 1] = order[idx]; order[idx] = tmp2;
  }

  overrides.blockOrder[tabKey] = order;
  _saveUserOverrides(moduleId, overrides);
}

function resetModuleLayout(moduleId) {
  try { localStorage.removeItem('hesem_layout_' + moduleId); } catch (e) {}
}

/* ── Edit Mode Toggle ────────────────────────────────────────────────────── */

var _editMode = false;

function toggleEditMode() {
  _editMode = !_editMode;
  document.body.classList.toggle('hm-edit-mode', _editMode);
  return _editMode;
}

function isEditMode() { return _editMode; }

/* ── Utility: Create Standard Status Badge ───────────────────────────────── */
function badge(status) {
  return '<span class="hm-badge hm-badge-' + _esc(String(status || 'draft')) + '">' + _esc(String(status || '')) + '</span>';
}

/* ── Utility: Create Progress Bar ────────────────────────────────────────── */
function progressBar(value, max, colorClass) {
  var pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  var cls = colorClass || (pct >= 90 ? 'green' : pct >= 70 ? 'amber' : 'red');
  return '<div class="hm-progress hm-progress-' + cls + '"><div class="hm-progress-fill" style="width:' + pct + '%"></div></div>';
}

/* ── Utility: Standard Toast ─────────────────────────────────────────────── */
function toast(msg, type) {
  var el = document.createElement('div');
  el.className = 'hm-toast hm-toast-' + (type || 'info');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(function() { el.classList.add('show'); });
  setTimeout(function() { el.classList.remove('show'); setTimeout(function() { if (el.parentNode) el.remove(); }, 200); }, 3500);
}

/* ── Export ───────────────────────────────────────────────────────────────── */
window.HmBlockEngine = {
  BLOCK_CATALOG: BLOCK_CATALOG,
  BLOCK_CATEGORIES: BLOCK_CATEGORIES,
  registerModule: registerModule,
  getModuleLayout: getModuleLayout,
  renderBlock: renderBlock,
  toggleBlockVisibility: toggleBlockVisibility,
  moveBlock: moveBlock,
  resetModuleLayout: resetModuleLayout,
  toggleEditMode: toggleEditMode,
  isEditMode: isEditMode,
  badge: badge,
  progressBar: progressBar,
  toast: toast,
  _t: _t,
  _esc: _esc,
};

})();
