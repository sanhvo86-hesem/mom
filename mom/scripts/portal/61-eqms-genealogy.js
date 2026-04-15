/**
 * EQMS Genealogy / Traceability — Graph + Table + Object Page
 * HESEM MOM Portal · 61-eqms-genealogy.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: genealogy
 * Archetype: object-page
 * Load order: AFTER 40-eqms-shell.js
 *
 * Screens: Search | Graph View | Analytics
 * Actions: expand-upstream, expand-downstream, freeze-trace-report
 */
(function() {
  'use strict';

  var ui   = window.EqmsShell.ui;
  var util = window.EqmsShell.util;
  var T    = util.T;
  var esc  = util.esc;
  var fmt  = util.fmt;
  var fmtDate     = util.fmtDate;
  var fmtDateTime = util.fmtDateTime;
  var slugify     = util.slugify;
  var apiCall     = util.apiCall;

  // =========================================================================
  // META
  // =========================================================================
  var MOD = {
    id:        'genealogy',
    version:   '1.0.0',
    archetype: 'object-page',
    endpoints: [
      'eqms_genealogy_query', 'eqms_genealogy_detail',
      'eqms_genealogy_lookup', 'eqms_genealogy_metrics',
      'eqms_genealogy_expand_upstream', 'eqms_genealogy_expand_downstream',
      'eqms_genealogy_freeze_trace_report', 'eqms_genealogy_export'
    ]
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var NODE_TYPES = [
    { value: 'raw_material',   label: { vi: 'Nguyen lieu',       en: 'Raw Material' },    icon: '\uD83E\uDDEA', col: 0 },
    { value: 'component',      label: { vi: 'Linh kien',         en: 'Component' },        icon: '\u2699\uFE0F', col: 0 },
    { value: 'wip',            label: { vi: 'Ban thanh pham',    en: 'WIP' },              icon: '\uD83D\uDD27', col: 1 },
    { value: 'sub_assembly',   label: { vi: 'Cum chi tiet',      en: 'Sub-Assembly' },     icon: '\uD83D\uDEE0\uFE0F', col: 1 },
    { value: 'finished_good',  label: { vi: 'Thanh pham',        en: 'Finished Good' },    icon: '\uD83D\uDCE6', col: 2 },
    { value: 'customer',       label: { vi: 'Khach hang',        en: 'Customer' },         icon: '\uD83C\uDFE2', col: 3 }
  ];

  var NODE_TYPE_MAP = {};
  NODE_TYPES.forEach(function(t) { NODE_TYPE_MAP[t.value] = t; });

  var QUALITY_STATUS_OPTIONS = [
    { value: 'conforming',     label: { vi: 'Phu hop',           en: 'Conforming' } },
    { value: 'non_conforming', label: { vi: 'Khong phu hop',     en: 'Non-Conforming' } },
    { value: 'on_hold',        label: { vi: 'Tam giu',           en: 'On Hold' } },
    { value: 'released',       label: { vi: 'Da giai phong',     en: 'Released' } },
    { value: 'quarantined',    label: { vi: 'Cach ly',           en: 'Quarantined' } }
  ];

  var DIRECTION_OPTIONS = [
    { value: 'upstream',   label: { vi: 'Nguoc dong',  en: 'Upstream' } },
    { value: 'downstream', label: { vi: 'Xuoi dong',   en: 'Downstream' } }
  ];

  var SCREENS = { SEARCH: 'search', GRAPH: 'graph', ANALYTICS: 'analytics' };

  // =========================================================================
  // GRAPH LAYOUT CONSTANTS
  // =========================================================================
  var GRAPH = {
    NODE_W: 180,
    NODE_H: 70,
    COL_GAP: 240,
    ROW_GAP: 100,
    PAD_X: 60,
    PAD_Y: 40
  };

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: SCREENS.SEARCH,
    // Search
    scanValue: '',
    recentLookups: [],
    searchResults: [],
    searchLoading: false,
    searchError: null,
    // Graph
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedNode: null,
    nodeDetail: null,
    linkedRecords: [],
    graphViewMode: 'graph',  // 'graph' | 'table'
    expandLoading: false,
    // Analytics
    metrics: null,
    loading: false,
    error: null
  };

  var _container = null;

  // =========================================================================
  // RENDER ENTRY POINT
  // =========================================================================
  function render(container, context) {
    _container = container;
    context = context || {};

    if (context.recordId) {
      state.screen = SCREENS.GRAPH;
      state.scanValue = context.recordId;
      performLookup(context.recordId);
    } else if (context.screen === 'analytics') {
      state.screen = SCREENS.ANALYTICS;
      loadMetrics();
    } else {
      state.screen = SCREENS.SEARCH;
      loadRecentLookups();
    }

    paint();
  }

  function paint() {
    if (!_container) return;
    var html = '';
    switch (state.screen) {
      case SCREENS.SEARCH:    html = renderSearch();    break;
      case SCREENS.GRAPH:     html = renderGraphView(); break;
      case SCREENS.ANALYTICS: html = renderAnalytics(); break;
    }
    _container.innerHTML = html;
    bindEvents();
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  function loadRecentLookups() {
    try {
      var stored = localStorage.getItem('eqms_genealogy_recent');
      state.recentLookups = stored ? JSON.parse(stored) : [];
    } catch (e) {
      state.recentLookups = [];
    }
  }

  function saveRecentLookup(value) {
    if (!value) return;
    var list = state.recentLookups.filter(function(r) { return r.value !== value; });
    list.unshift({ value: value, timestamp: new Date().toISOString() });
    if (list.length > 10) list = list.slice(0, 10);
    state.recentLookups = list;
    try { localStorage.setItem('eqms_genealogy_recent', JSON.stringify(list)); } catch (e) { /* noop */ }
  }

  function performLookup(value) {
    if (!value || !value.trim()) return;
    value = value.trim();
    state.searchLoading = true;
    state.searchError = null;
    paint();

    apiCall('eqms_genealogy_lookup', { identifier: value }).then(function(res) {
      state.searchLoading = false;
      if (res.success && res.data) {
        saveRecentLookup(value);
        state.nodes = res.data.nodes || [];
        state.edges = res.data.edges || [];
        state.selectedNodeId = res.data.root_id || (state.nodes.length ? state.nodes[0].id : null);
        state.selectedNode = findNode(state.selectedNodeId);
        state.screen = SCREENS.GRAPH;
        if (state.selectedNodeId) loadNodeDetail(state.selectedNodeId);
      } else {
        state.searchError = res.message || T({ vi: 'Khong tim thay ban ghi', en: 'No record found' });
      }
      paint();
    }).catch(function(err) {
      state.searchLoading = false;
      state.searchError = err.message || 'Network error';
      paint();
    });
  }

  function performSearch(value) {
    if (!value || !value.trim()) return;
    state.searchLoading = true;
    state.searchError = null;
    paint();

    apiCall('eqms_genealogy_query', { search: value.trim() }).then(function(res) {
      state.searchLoading = false;
      if (res.success) {
        state.searchResults = res.data || [];
      } else {
        state.searchError = res.message || T({ vi: 'Loi tim kiem', en: 'Search error' });
      }
      paint();
    }).catch(function(err) {
      state.searchLoading = false;
      state.searchError = err.message || 'Network error';
      paint();
    });
  }

  function loadNodeDetail(id) {
    apiCall('eqms_genealogy_detail', { id: id }).then(function(res) {
      if (res.success) {
        state.nodeDetail = res.data || {};
        state.linkedRecords = res.data.linked_quality_records || [];
        paint();
      }
    });
  }

  function expandUpstream(nodeId) {
    state.expandLoading = true;
    paint();
    apiCall('eqms_genealogy_expand_upstream', { id: nodeId }).then(function(res) {
      state.expandLoading = false;
      if (res.success && res.data) {
        mergeGraphData(res.data.nodes || [], res.data.edges || []);
      }
      paint();
    }).catch(function() {
      state.expandLoading = false;
      paint();
    });
  }

  function expandDownstream(nodeId) {
    state.expandLoading = true;
    paint();
    apiCall('eqms_genealogy_expand_downstream', { id: nodeId }).then(function(res) {
      state.expandLoading = false;
      if (res.success && res.data) {
        mergeGraphData(res.data.nodes || [], res.data.edges || []);
      }
      paint();
    }).catch(function() {
      state.expandLoading = false;
      paint();
    });
  }

  function mergeGraphData(newNodes, newEdges) {
    var nodeMap = {};
    state.nodes.forEach(function(n) { nodeMap[n.id] = true; });
    newNodes.forEach(function(n) {
      if (!nodeMap[n.id]) { state.nodes.push(n); nodeMap[n.id] = true; }
    });
    var edgeMap = {};
    state.edges.forEach(function(e) { edgeMap[e.source + '->' + e.target] = true; });
    newEdges.forEach(function(e) {
      var key = e.source + '->' + e.target;
      if (!edgeMap[key]) { state.edges.push(e); edgeMap[key] = true; }
    });
  }

  function freezeTraceReport() {
    if (!state.nodes.length) return;
    var rootId = state.selectedNodeId || (state.nodes.length ? state.nodes[0].id : null);
    apiCall('eqms_genealogy_freeze_trace_report', {
      root_id: rootId,
      node_ids: state.nodes.map(function(n) { return n.id; })
    }).then(function(res) {
      if (res.success && res.data && res.data.url) {
        window.open(res.data.url, '_blank');
      }
    });
  }

  function loadMetrics() {
    state.loading = true;
    state.error = null;
    paint();

    apiCall('eqms_genealogy_metrics', {}).then(function(res) {
      state.loading = false;
      if (res.success) { state.metrics = res.data || {}; }
      else { state.error = res.message || 'Failed to load metrics'; }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  function findNode(id) {
    if (!id) return null;
    for (var i = 0; i < state.nodes.length; i++) {
      if (state.nodes[i].id === id) return state.nodes[i];
    }
    return null;
  }

  // =========================================================================
  // SCREEN: SEARCH
  // =========================================================================
  function renderSearch() {
    var html = '';

    // Top toolbar with analytics link
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left"></div>';
    html += '<div class="eqms-toolbar-right">';
    html += '<button class="eqms-btn ghost sm" data-action="go-analytics">';
    html += T({ vi: 'Phan tich', en: 'Analytics' });
    html += '</button>';
    html += '</div></div>';

    // Large centered scan area
    html += '<div class="eqms-scan-first">';
    html += '<div style="font-size:48px;margin-bottom:8px">\uD83C\uDF33</div>';
    html += '<h2 style="margin:0 0 8px;font-size:22px;font-weight:600;text-align:center">';
    html += T({ vi: 'Truy xuat nguon goc', en: 'Genealogy / Traceability' });
    html += '</h2>';
    html += '<p style="margin:0 0 24px;color:var(--hm-text-secondary,#64748b);text-align:center;max-width:480px">';
    html += T({ vi: 'Nhap ma lo, barcode hoac serial de truy xuat chuoi cung ung nguoc/xuoi dong', en: 'Enter a lot, barcode, or serial number to trace the supply chain upstream/downstream' });
    html += '</p>';

    // Scan input
    html += '<div class="eqms-scan-input" style="display:flex;gap:8px;max-width:520px;margin:0 auto;width:100%">';
    html += '<input type="text" class="eqms-form-input" data-field="scan-value" value="' + esc(state.scanValue) + '" ';
    html += 'placeholder="' + T({ vi: 'Ma lo / barcode / serial...', en: 'Lot ID / barcode / serial...' }) + '" ';
    html += 'style="font-size:18px;padding:12px 16px;flex:1;font-family:var(--hm-font-mono,monospace)" autofocus>';
    html += '<button class="eqms-btn primary" data-action="scan-lookup" style="padding:12px 24px;font-size:16px">';
    html += '\uD83D\uDD0D ' + T({ vi: 'Tra cuu', en: 'Lookup' });
    html += '</button></div>';

    html += '<span class="eqms-scan-hint">';
    html += T({ vi: 'Quet ma vach hoac nhap thu cong', en: 'Scan barcode or type manually' });
    html += '</span>';
    html += '</div>';

    // Loading / error
    if (state.searchLoading) {
      html += ui.renderLoadingState({ vi: 'Dang tim kiem...', en: 'Searching...' });
    } else if (state.searchError) {
      html += ui.renderErrorState(state.searchError, 'retry-search');
    }

    // Search results as cards
    if (state.searchResults.length > 0) {
      html += '<div style="margin-top:24px">';
      html += ui.renderSection({ vi: 'Ket qua tim kiem', en: 'Search Results' }, renderSearchResultCards());
      html += '</div>';
    }

    // Recent lookups
    if (state.recentLookups.length > 0 && !state.searchResults.length) {
      html += '<div style="margin-top:32px;max-width:520px;margin-left:auto;margin-right:auto">';
      html += ui.renderSection({ vi: 'Tra cuu gan day', en: 'Recent Lookups' }, renderRecentLookups());
      html += '</div>';
    }

    return html;
  }

  function renderSearchResultCards() {
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
    state.searchResults.forEach(function(r) {
      var typeInfo = NODE_TYPE_MAP[r.type] || {};
      html += '<div class="eqms-module-card" data-action="open-result" data-id="' + esc(r.id || r.identifier) + '" style="cursor:pointer">';
      html += '<div class="eqms-module-card-header">';
      html += '<div class="eqms-module-card-icon">' + (typeInfo.icon || '\uD83D\uDCE6') + '</div>';
      html += '<div class="eqms-module-card-title">' + esc(r.identifier || r.id) + '</div>';
      html += '</div>';
      html += '<div style="font-size:13px;color:var(--hm-text-secondary,#64748b)">';
      html += esc(r.name || r.description || '') + '<br>';
      html += '<span class="eqms-badge ' + slugify(r.type || '') + '">' + esc(T(typeInfo.label) || r.type || '') + '</span>';
      if (r.quality_status) html += ' <span class="eqms-badge ' + slugify(r.quality_status) + '">' + esc(r.quality_status) + '</span>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderRecentLookups() {
    var html = '<div style="display:flex;flex-direction:column;gap:6px">';
    state.recentLookups.forEach(function(r) {
      html += '<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:6px;cursor:pointer;background:var(--hm-bg-secondary,#f8fafc)" ';
      html += 'data-action="recent-lookup" data-value="' + esc(r.value) + '">';
      html += '<span style="font-family:var(--hm-font-mono,monospace);font-weight:500">' + esc(r.value) + '</span>';
      html += '<span style="margin-left:auto;font-size:12px;color:var(--hm-text-tertiary,#94a3b8)">' + esc(fmtDateTime(r.timestamp)) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SCREEN: GRAPH VIEW
  // =========================================================================
  function renderGraphView() {
    var html = '';

    // Back + toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn ghost sm" data-action="go-search">';
    html += '\u2190 ' + T({ vi: 'Tim kiem moi', en: 'New Search' });
    html += '</button>';
    html += '</div>';
    html += '<div class="eqms-toolbar-right">';

    // Graph / Table toggle
    html += '<div class="eqms-chart-toggle">';
    html += '<button class="eqms-chart-toggle-btn ' + (state.graphViewMode === 'graph' ? 'active' : '') + '" data-action="view-mode" data-mode="graph">';
    html += '\uD83C\uDF33 ' + T({ vi: 'Do thi', en: 'Graph' });
    html += '</button>';
    html += '<button class="eqms-chart-toggle-btn ' + (state.graphViewMode === 'table' ? 'active' : '') + '" data-action="view-mode" data-mode="table">';
    html += '\uD83D\uDCCB ' + T({ vi: 'Bang', en: 'Table' });
    html += '</button></div>';

    // Freeze report + Export
    html += '<button class="eqms-btn secondary sm" data-action="freeze-trace-report">';
    html += '\uD83D\uDCCB ' + T({ vi: 'Dong bang bao cao', en: 'Freeze Trace Report' });
    html += '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div></div>';

    // Expand loading indicator
    if (state.expandLoading) {
      html += '<div style="padding:8px 0;text-align:center;font-size:13px;color:var(--hm-text-secondary)">';
      html += T({ vi: 'Dang mo rong do thi...', en: 'Expanding graph...' });
      html += '</div>';
    }

    // Main content: graph/table + detail panel
    html += '<div style="display:flex;gap:16px;min-height:500px">';

    // Left: Graph or table
    html += '<div style="flex:1;min-width:0">';
    if (state.graphViewMode === 'graph') {
      html += renderGenealogyGraph();
    } else {
      html += renderGenealogyTable();
    }
    html += '</div>';

    // Right: Selected node detail panel
    if (state.selectedNodeId) {
      html += '<div style="width:360px;flex-shrink:0;overflow-y:auto;max-height:700px">';
      html += renderNodeDetailPanel();
      html += '</div>';
    }

    html += '</div>';

    return html;
  }

  // =========================================================================
  // SVG GENEALOGY GRAPH
  // =========================================================================
  function renderGenealogyGraph() {
    if (!state.nodes.length) {
      return ui.renderEmptyState({
        icon: '\uD83C\uDF33',
        title: { vi: 'Khong co du lieu do thi', en: 'No graph data' },
        desc: { vi: 'Thu tra cuu mot ma lo khac', en: 'Try looking up a different lot ID' }
      });
    }

    // Compute layout: assign columns and rows
    var layout = computeGraphLayout(state.nodes, state.edges);
    var svgW = layout.width;
    var svgH = layout.height;

    var html = '<div class="eqms-graph" style="min-height:' + Math.max(400, svgH + 20) + 'px">';

    // SVG for edges
    html += '<svg class="eqms-graph-edge" style="position:absolute;top:0;left:0;width:' + svgW + 'px;height:' + svgH + 'px;pointer-events:none">';
    state.edges.forEach(function(edge) {
      var srcPos = layout.positions[edge.source];
      var tgtPos = layout.positions[edge.target];
      if (!srcPos || !tgtPos) return;

      var x1 = srcPos.x + GRAPH.NODE_W;
      var y1 = srcPos.y + GRAPH.NODE_H / 2;
      var x2 = tgtPos.x;
      var y2 = tgtPos.y + GRAPH.NODE_H / 2;

      // Bezier curve for smooth connectors
      var cx1 = x1 + (x2 - x1) * 0.4;
      var cx2 = x2 - (x2 - x1) * 0.4;

      html += '<path d="M' + x1 + ',' + y1 + ' C' + cx1 + ',' + y1 + ' ' + cx2 + ',' + y2 + ' ' + x2 + ',' + y2 + '" ';
      html += 'fill="none" stroke="var(--hm-border-primary,#cbd5e1)" stroke-width="2" />';

      // Quantity label on edge midpoint
      if (edge.quantity) {
        var mx = (x1 + x2) / 2;
        var my = (y1 + y2) / 2 - 8;
        html += '<text x="' + mx + '" y="' + my + '" text-anchor="middle" fill="var(--hm-text-tertiary,#94a3b8)" font-size="11">';
        html += esc(String(edge.quantity) + (edge.uom ? ' ' + edge.uom : ''));
        html += '</text>';
      }
    });
    html += '</svg>';

    // Node divs
    layout.ordered.forEach(function(item) {
      var node = item.node;
      var pos = item.pos;
      var typeInfo = NODE_TYPE_MAP[node.type] || {};
      var isSelected = node.id === state.selectedNodeId;
      var statusClass = slugify(node.quality_status || node.status || '');

      html += '<div class="eqms-graph-node' + (isSelected ? ' selected' : '') + '" ';
      html += 'style="left:' + pos.x + 'px;top:' + pos.y + 'px;width:' + GRAPH.NODE_W + 'px;min-height:' + GRAPH.NODE_H + 'px" ';
      html += 'data-action="select-node" data-id="' + esc(node.id) + '">';

      // Type icon + ID
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
      html += '<span style="font-size:16px">' + (typeInfo.icon || '\uD83D\uDCE6') + '</span>';
      html += '<span style="font-family:var(--hm-font-mono,monospace);font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(node.identifier || node.id) + '</span>';
      html += '</div>';

      // Name
      html += '<div style="font-size:12px;color:var(--hm-text-secondary,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">';
      html += esc(node.name || '');
      html += '</div>';

      // Status badge
      html += '<div style="margin-top:4px">';
      html += '<span class="eqms-badge ' + statusClass + '" style="font-size:10px">';
      html += esc(node.quality_status || node.status || '');
      html += '</span>';
      html += '</div>';

      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  // =========================================================================
  // GRAPH LAYOUT COMPUTATION
  // =========================================================================
  function computeGraphLayout(nodes, edges) {
    // Build adjacency: child -> parents, parent -> children
    var childrenOf = {};
    var parentOf = {};
    edges.forEach(function(e) {
      if (!childrenOf[e.source]) childrenOf[e.source] = [];
      childrenOf[e.source].push(e.target);
      if (!parentOf[e.target]) parentOf[e.target] = [];
      parentOf[e.target].push(e.source);
    });

    // Assign levels via BFS from roots (nodes with no parents)
    var levelOf = {};
    var maxLevel = 0;
    var queue = [];

    nodes.forEach(function(n) {
      if (!parentOf[n.id] || parentOf[n.id].length === 0) {
        levelOf[n.id] = 0;
        queue.push(n.id);
      }
    });

    // If no roots found (cycles), assign all as level 0
    if (queue.length === 0) {
      nodes.forEach(function(n) {
        levelOf[n.id] = 0;
        queue.push(n.id);
      });
    }

    while (queue.length > 0) {
      var current = queue.shift();
      var children = childrenOf[current] || [];
      children.forEach(function(childId) {
        var newLevel = (levelOf[current] || 0) + 1;
        if (levelOf[childId] === undefined || levelOf[childId] < newLevel) {
          levelOf[childId] = newLevel;
          if (newLevel > maxLevel) maxLevel = newLevel;
          queue.push(childId);
        }
      });
    }

    // Assign any orphans
    nodes.forEach(function(n) {
      if (levelOf[n.id] === undefined) levelOf[n.id] = 0;
    });

    // Group nodes by column level
    var columns = {};
    nodes.forEach(function(n) {
      var col = levelOf[n.id];
      if (!columns[col]) columns[col] = [];
      columns[col].push(n);
    });

    // Compute positions
    var positions = {};
    var ordered = [];

    for (var col = 0; col <= maxLevel; col++) {
      var colNodes = columns[col] || [];
      colNodes.forEach(function(n, rowIdx) {
        var x = GRAPH.PAD_X + col * (GRAPH.NODE_W + GRAPH.COL_GAP);
        var y = GRAPH.PAD_Y + rowIdx * (GRAPH.NODE_H + GRAPH.ROW_GAP);
        positions[n.id] = { x: x, y: y };
        ordered.push({ node: n, pos: { x: x, y: y } });
      });
    }

    // Calculate total dimensions
    var width = GRAPH.PAD_X * 2 + (maxLevel + 1) * GRAPH.NODE_W + maxLevel * GRAPH.COL_GAP;
    var maxRows = 0;
    for (var c = 0; c <= maxLevel; c++) {
      var cnt = (columns[c] || []).length;
      if (cnt > maxRows) maxRows = cnt;
    }
    var height = GRAPH.PAD_Y * 2 + maxRows * GRAPH.NODE_H + Math.max(0, maxRows - 1) * GRAPH.ROW_GAP;

    return {
      positions: positions,
      ordered: ordered,
      width: Math.max(width, 600),
      height: Math.max(height, 400)
    };
  }

  // =========================================================================
  // GENEALOGY TABLE (FALLBACK)
  // =========================================================================
  function renderGenealogyTable() {
    // Flatten graph data into table rows
    var rows = state.nodes.map(function(n) {
      var typeInfo = NODE_TYPE_MAP[n.type] || {};
      // Determine direction relative to root
      var direction = '—';
      if (state.selectedNodeId) {
        if (n.id === state.selectedNodeId) direction = T({ vi: 'Goc', en: 'Root' });
        else {
          var rootLevel = getNodeLevel(state.selectedNodeId);
          var nodeLevel = getNodeLevel(n.id);
          if (nodeLevel < rootLevel) direction = T({ vi: 'Nguoc dong', en: 'Upstream' });
          else if (nodeLevel > rootLevel) direction = T({ vi: 'Xuoi dong', en: 'Downstream' });
        }
      }
      return {
        id: n.id,
        level: getNodeLevel(n.id),
        direction: direction,
        type: T(typeInfo.label) || n.type || '—',
        identifier: n.identifier || n.id,
        name: n.name || '—',
        quantity: n.quantity,
        date: n.date || n.created_at,
        quality_status: n.quality_status || n.status || '—'
      };
    });

    var columns = [
      { key: 'level',          label: { vi: 'Cap',            en: 'Level' },           type: 'number', sortable: true },
      { key: 'direction',      label: { vi: 'Huong',          en: 'Direction' } },
      { key: 'type',           label: { vi: 'Loai',           en: 'Type' },            type: 'badge' },
      { key: 'identifier',     label: { vi: 'Ma dinh danh',   en: 'ID' },              type: 'id', sortable: true },
      { key: 'name',           label: { vi: 'Ten',            en: 'Name' },            sortable: true },
      { key: 'quantity',       label: { vi: 'So luong',       en: 'Qty' },             type: 'number' },
      { key: 'date',           label: { vi: 'Ngay',           en: 'Date' },            type: 'date', sortable: true },
      { key: 'quality_status', label: { vi: 'Trang thai CL',  en: 'Quality Status' },  type: 'badge' }
    ];

    return ui.renderDataGrid(columns, rows, { selectable: false });
  }

  function getNodeLevel(nodeId) {
    // Simplified: use edge traversal to compute level from root nodes
    var parentOf = {};
    state.edges.forEach(function(e) {
      if (!parentOf[e.target]) parentOf[e.target] = [];
      parentOf[e.target].push(e.source);
    });

    var visited = {};
    var level = 0;
    var current = nodeId;
    while (current && !visited[current]) {
      visited[current] = true;
      var parents = parentOf[current];
      if (parents && parents.length > 0) {
        current = parents[0];
        level++;
      } else {
        break;
      }
    }
    return level;
  }

  // =========================================================================
  // NODE DETAIL PANEL
  // =========================================================================
  function renderNodeDetailPanel() {
    var node = state.selectedNode;
    if (!node) {
      return ui.renderEmptyState({ icon: '\uD83D\uDC49', title: { vi: 'Chon mot nut de xem chi tiet', en: 'Select a node to view details' } });
    }

    var detail = state.nodeDetail || node;
    var typeInfo = NODE_TYPE_MAP[node.type] || {};
    var html = '';

    // Panel header
    html += '<div class="eqms-section" style="margin-bottom:12px">';
    html += '<div class="eqms-section-header">';
    html += '<span>' + (typeInfo.icon || '\uD83D\uDCE6') + ' ' + esc(node.identifier || node.id) + '</span>';
    html += '</div>';
    html += '<div class="eqms-section-body">';

    // Action buttons for expand
    html += '<div style="display:flex;gap:6px;margin-bottom:12px">';
    html += '<button class="eqms-btn secondary sm" data-action="expand-upstream" data-id="' + esc(node.id) + '">';
    html += '\u2B06 ' + T({ vi: 'Mo rong nguoc', en: 'Upstream' });
    html += '</button>';
    html += '<button class="eqms-btn secondary sm" data-action="expand-downstream" data-id="' + esc(node.id) + '">';
    html += '\u2B07 ' + T({ vi: 'Mo rong xuoi', en: 'Downstream' });
    html += '</button>';
    html += '</div>';

    // Node fields
    html += ui.renderFieldGrid([
      { label: { vi: 'Ma dinh danh',      en: 'Identifier' },      value: detail.identifier || detail.id,   mono: true },
      { label: { vi: 'Ten',               en: 'Name' },            value: detail.name },
      { label: { vi: 'Loai',              en: 'Type' },            value: T(typeInfo.label) || detail.type,  badge: true },
      { label: { vi: 'Trang thai CL',     en: 'Quality Status' },  value: detail.quality_status,            badge: true },
      { label: { vi: 'So luong',          en: 'Quantity' },        value: detail.quantity },
      { label: { vi: 'Don vi tinh',       en: 'UOM' },             value: detail.uom },
      { label: { vi: 'Ma lo',             en: 'Lot/Batch' },       value: detail.lot_number,                mono: true },
      { label: { vi: 'Serial',            en: 'Serial' },          value: detail.serial_number,             mono: true },
      { label: { vi: 'Ngay san xuat',     en: 'Production Date' }, value: fmtDate(detail.production_date) },
      { label: { vi: 'Ngay het han',      en: 'Expiry Date' },     value: fmtDate(detail.expiry_date) },
      { label: { vi: 'Nha cung cap',      en: 'Supplier' },        value: detail.supplier_name },
      { label: { vi: 'Khach hang',        en: 'Customer' },        value: detail.customer_name },
      { label: { vi: 'Vi tri',            en: 'Location' },        value: detail.location },
      { label: { vi: 'Lenh san xuat',     en: 'Work Order' },      value: detail.work_order_id,             mono: true }
    ]);

    html += '</div></div>';

    // Linked quality records
    html += renderLinkedQualityRecords();

    return html;
  }

  function renderLinkedQualityRecords() {
    var records = state.linkedRecords;
    var html = '<div class="eqms-section">';
    html += '<div class="eqms-section-header">';
    html += '<span>' + T({ vi: 'Ban ghi chat luong lien ket', en: 'Linked Quality Records' }) + '</span>';
    html += '</div>';
    html += '<div class="eqms-section-body">';

    if (!records || records.length === 0) {
      html += ui.renderEmptyState({
        icon: '\uD83D\uDD17',
        title: { vi: 'Khong co ban ghi lien ket', en: 'No linked records' },
        desc: { vi: 'Khong co NCR, CAPA, sai lech, khieu nai hoac giai phong lo nao', en: 'No NCRs, CAPAs, deviations, complaints, or batch releases found' }
      });
    } else {
      // Group by type
      var grouped = {};
      records.forEach(function(r) {
        var type = r.type || r.entity_type || 'other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(r);
      });

      var typeLabels = {
        ncr:            { vi: 'NCR',            en: 'NCR' },
        capa:           { vi: 'CAPA',           en: 'CAPA' },
        deviation:      { vi: 'Sai lech',       en: 'Deviation' },
        complaint:      { vi: 'Khieu nai',      en: 'Complaint' },
        batch_release:  { vi: 'Giai phong lo',  en: 'Batch Release' },
        other:          { vi: 'Khac',           en: 'Other' }
      };

      Object.keys(grouped).forEach(function(type) {
        var items = grouped[type];
        var label = typeLabels[type] || { vi: type, en: type };
        html += '<div style="margin-bottom:12px">';
        html += '<div style="font-size:12px;font-weight:600;color:var(--hm-text-secondary,#64748b);margin-bottom:6px;text-transform:uppercase">';
        html += esc(T(label)) + ' (' + items.length + ')';
        html += '</div>';
        items.forEach(function(r) {
          html += '<div class="eqms-relationship" data-action="open-record" data-type="' + esc(type) + '" data-id="' + esc(r.id || r.record_id) + '">';
          html += '<span class="eqms-relationship-id">' + esc(r.record_id || r.id) + '</span>';
          html += '<span class="eqms-relationship-title">' + esc(r.title || r.description || '') + '</span>';
          if (r.status) html += '<span class="eqms-badge ' + slugify(r.status) + '" style="margin-left:auto;font-size:10px">' + esc(r.status) + '</span>';
          html += '</div>';
        });
        html += '</div>';
      });
    }

    html += '</div></div>';
    return html;
  }

  // =========================================================================
  // SCREEN: ANALYTICS
  // =========================================================================
  function renderAnalytics() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Dang tai phan tich...', en: 'Loading analytics...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-analytics');

    var m = state.metrics || {};
    var html = '';

    // Back
    html += '<button class="eqms-btn ghost sm" data-action="go-search" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lai tim kiem', en: 'Back to search' });
    html += '</button>';

    html += '<h2 style="margin:0 0 16px;font-size:18px;font-weight:600">';
    html += T({ vi: 'Phan tich truy xuat nguon goc', en: 'Genealogy Analytics' });
    html += '</h2>';

    // KPIs
    html += ui.renderKpiRow([
      { label: { vi: 'Tong truy xuat',         en: 'Total Traces' },          value: fmt(m.total_traces || 0) },
      { label: { vi: 'Do sau TB',              en: 'Avg Trace Depth' },       value: fmt(m.avg_depth || 0) + ' ' + T({ vi: 'cap', en: 'levels' }) },
      { label: { vi: 'Mat do lien ket CL',     en: 'Quality Linkage Density' }, value: (m.linkage_density || 0) + '%', accent: (m.linkage_density || 0) >= 50 ? 'success' : 'warning' },
      { label: { vi: 'Bao cao dong bang',       en: 'Frozen Reports' },        value: fmt(m.frozen_reports || 0) }
    ]);

    // Trace depth distribution
    var depthData = m.depth_distribution || [];
    var depthColumns = [
      { key: 'depth',   label: { vi: 'Do sau (cap)',   en: 'Depth (levels)' }, type: 'number' },
      { key: 'count',   label: { vi: 'So luong',       en: 'Count' },          type: 'number' },
      { key: 'percent', label: { vi: 'Ti le',          en: 'Percent' },        render: function(v) { return esc((v || 0) + '%'); } }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Phan bo do sau truy xuat', en: 'Trace Depth Distribution' },
      ui.renderChartWithTableFallback('gen-depth-chart', null, depthColumns, depthData, { defaultMode: 'table' })
    );
    html += '</div>';

    // Most-traced products
    var topProducts = m.most_traced_products || [];
    var productColumns = [
      { key: 'product',      label: { vi: 'San pham',       en: 'Product' } },
      { key: 'trace_count',  label: { vi: 'So lan truy xuat', en: 'Trace Count' }, type: 'number' },
      { key: 'last_traced',  label: { vi: 'Lan cuoi',       en: 'Last Traced' },  type: 'date' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'San pham truy xuat nhieu nhat', en: 'Most-Traced Products' },
      ui.renderDataGrid(productColumns, topProducts, { selectable: false })
    );
    html += '</div>';

    // Quality linkage density over time
    var linkageTrend = m.linkage_trend || [];
    var linkageColumns = [
      { key: 'period',   label: { vi: 'Giai doan',            en: 'Period' } },
      { key: 'density',  label: { vi: 'Mat do lien ket (%)',  en: 'Linkage Density (%)' }, type: 'number' },
      { key: 'records',  label: { vi: 'Ban ghi CL',           en: 'Quality Records' },     type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Mat do lien ket chat luong theo thoi gian', en: 'Quality Linkage Density Over Time' },
      ui.renderChartWithTableFallback('gen-linkage-chart', null, linkageColumns, linkageTrend, { defaultMode: 'table' })
    );
    html += '</div>';

    return html;
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents() {
    if (!_container) return;

    // Focus scan input on search screen
    if (state.screen === SCREENS.SEARCH) {
      var scanInput = _container.querySelector('[data-field="scan-value"]');
      if (scanInput) scanInput.focus();
    }

    _container.addEventListener('click', function(e) {
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) {
        // Check for double-click handled separately
        return;
      }
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'scan-lookup':
          collectScanValue();
          performLookup(state.scanValue);
          break;
        case 'go-search':
          state.screen = SCREENS.SEARCH;
          state.searchResults = [];
          state.searchError = null;
          loadRecentLookups();
          paint();
          break;
        case 'go-analytics':
          state.screen = SCREENS.ANALYTICS;
          loadMetrics();
          break;
        case 'retry-search':
          if (state.scanValue) performLookup(state.scanValue);
          break;
        case 'retry-analytics':
          loadMetrics();
          break;
        case 'recent-lookup':
          var val = actionEl.getAttribute('data-value');
          if (val) { state.scanValue = val; performLookup(val); }
          break;
        case 'open-result':
          var resultId = actionEl.getAttribute('data-id');
          if (resultId) { state.scanValue = resultId; performLookup(resultId); }
          break;
        case 'select-node':
          var nodeId = actionEl.getAttribute('data-id');
          if (nodeId) {
            state.selectedNodeId = nodeId;
            state.selectedNode = findNode(nodeId);
            state.nodeDetail = null;
            state.linkedRecords = [];
            loadNodeDetail(nodeId);
            paint();
          }
          break;
        case 'expand-upstream':
          var upId = actionEl.getAttribute('data-id');
          if (upId) expandUpstream(upId);
          break;
        case 'expand-downstream':
          var downId = actionEl.getAttribute('data-id');
          if (downId) expandDownstream(downId);
          break;
        case 'freeze-trace-report':
          freezeTraceReport();
          break;
        case 'view-mode':
          var mode = actionEl.getAttribute('data-mode');
          if (mode) { state.graphViewMode = mode; paint(); }
          break;
        case 'export':
          handleExport(actionEl.getAttribute('data-format'));
          break;
      }
    });

    // Double-click to expand node
    _container.addEventListener('dblclick', function(e) {
      var nodeEl = e.target.closest('.eqms-graph-node');
      if (!nodeEl) return;
      var nodeId = nodeEl.getAttribute('data-id');
      if (!nodeId) return;

      // Select and expand both directions
      state.selectedNodeId = nodeId;
      state.selectedNode = findNode(nodeId);
      loadNodeDetail(nodeId);
      expandUpstream(nodeId);
      expandDownstream(nodeId);
    });

    // Enter key on scan input
    _container.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var scanField = e.target.closest('[data-field="scan-value"]');
        if (scanField) {
          collectScanValue();
          performLookup(state.scanValue);
        }
      }
    });
  }

  // =========================================================================
  // DATA COLLECTION
  // =========================================================================
  function collectScanValue() {
    if (!_container) return;
    var el = _container.querySelector('[data-field="scan-value"]');
    if (el) state.scanValue = el.value;
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================
  function handleExport(format) {
    var payload = { format: format };
    if (state.nodes.length > 0) {
      payload.root_id = state.selectedNodeId || state.nodes[0].id;
      payload.node_ids = state.nodes.map(function(n) { return n.id; });
    }
    apiCall('eqms_genealogy_export', payload).then(function(res) {
      if (res.success && res.data && res.data.url) { window.open(res.data.url, '_blank'); }
    });
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['genealogy'] = { render: render, meta: MOD };

})();
