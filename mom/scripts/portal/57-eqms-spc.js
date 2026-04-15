/**
 * EQMS SPC Analytics Module — Statistical Process Control
 * HESEM MOM Portal · 57-eqms-spc.js
 *
 * Archetype: Analytical List + Chart/Table
 * Authority: IATF 16949 ss9.1.1.2, AS9100D ss9.1.1, Western Electric Rules
 * Load order: AFTER 40-eqms-shell.js
 *
 * 4 screens: Dashboard, Chart Detail, Capability Summary, Analytics
 * Chart types: X-bar, R, S, p, np, c, u
 * Process Capability: Cp, Cpk, Pp, Ppk
 */
(function() {
  'use strict';

  /* ── Shell references ─────────────────────────────────────────────────── */
  var UI   = window.EqmsShell.ui;
  var UTIL = window.EqmsShell.util;
  var T    = UTIL.T, esc = UTIL.esc, fmt = UTIL.fmt, fmtDate = UTIL.fmtDate;
  var fmtDateTime = UTIL.fmtDateTime, slugify = UTIL.slugify;

  /* ── API paths ────────────────────────────────────────────────────────── */
  var API = {
    query:    '/api/v1/mes/quality/spc/query',
    detail:   '/api/v1/mes/quality/spc/',       // + {id}
    metrics:  '/api/v1/mes/quality/spc/metrics',
    export:   '/api/v1/mes/quality/spc/',        // + {id}/export
    action:   '/api/v1/mes/quality/spc/'         // + {id}/actions/{action}
  };

  function restCall(url, payload, method) {
    method = method || 'POST';
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (window.csrfToken) opts.headers['X-CSRF-Token'] = window.csrfToken;
    if (method !== 'GET' && payload) opts.body = JSON.stringify(payload);
    return fetch(url, opts).then(function(r) { return r.json(); });
  }

  /* ── Constants ────────────────────────────────────────────────────────── */
  var CHART_TYPES = [
    { value: 'xbar',  label: 'X-bar' },
    { value: 'r',     label: 'R' },
    { value: 's',     label: 'S' },
    { value: 'p',     label: 'p' },
    { value: 'np',    label: 'np' },
    { value: 'c',     label: 'c' },
    { value: 'u',     label: 'u' }
  ];

  var WESTERN_ELECTRIC_RULES = {
    rule1: { vi: 'Quy tắc 1: 1 điểm ngoài 3-sigma', en: 'Rule 1: 1 point beyond 3-sigma' },
    rule2: { vi: 'Quy tắc 2: 9 điểm liên tiếp cùng phía CL', en: 'Rule 2: 9 consecutive points on same side of CL' },
    rule3: { vi: 'Quy tắc 3: 6 điểm liên tiếp tăng/giảm', en: 'Rule 3: 6 consecutive increasing or decreasing' },
    rule4: { vi: 'Quy tắc 4: 14 điểm liên tiếp xen kẽ lên/xuống', en: 'Rule 4: 14 consecutive alternating up/down' },
    rule5: { vi: 'Quy tắc 5: 2/3 điểm ngoài 2-sigma', en: 'Rule 5: 2 of 3 points beyond 2-sigma' },
    rule6: { vi: 'Quy tắc 6: 4/5 điểm ngoài 1-sigma', en: 'Rule 6: 4 of 5 points beyond 1-sigma' },
    rule7: { vi: 'Quy tắc 7: 15 điểm trong 1-sigma', en: 'Rule 7: 15 consecutive within 1-sigma' },
    rule8: { vi: 'Quy tắc 8: 8 điểm ngoài 1-sigma', en: 'Rule 8: 8 consecutive beyond 1-sigma' }
  };

  var CAPABILITY_LEVELS = {
    excellent: { min: 1.67, color: '#059669', vi: 'Xuất sắc', en: 'Excellent' },
    capable:   { min: 1.33, color: '#10b981', vi: 'Đủ năng lực', en: 'Capable' },
    marginal:  { min: 1.0,  color: '#f59e0b', vi: 'Biên', en: 'Marginal' },
    incapable: { min: 0,    color: '#ef4444', vi: 'Không đủ năng lực', en: 'Incapable' }
  };

  /* ── Module metadata ──────────────────────────────────────────────────── */
  var MOD = {
    id: 'spc',
    label: { vi: 'SPC Analytics', en: 'SPC Analytics' },
    icon: '\u{1F4C8}',
    group: 'inspection'
  };

  /* ── Local state ──────────────────────────────────────────────────────── */
  var state = {
    activeTab: 'dashboard',
    // Dashboard
    filters: { product: '', process: '', work_center: '', characteristic: '', date_from: '', date_to: '' },
    chartList: [], listTotal: 0, listPage: 1, listLoading: false,
    // Chart detail
    selectedChart: null, selectedChartType: 'xbar',
    chartData: null, violations: [], detailLoading: false,
    // Capability
    capabilityData: [], capFilter: { level: '' }, capLoading: false,
    // Metrics
    metrics: null, metricsLoading: false,
    // Container
    container: null
  };

  var TABS = [
    { id: 'dashboard',  label: { vi: 'Bảng điều khiển', en: 'Dashboard' } },
    { id: 'detail',     label: { vi: 'Chi tiết biểu đồ', en: 'Chart Detail' } },
    { id: 'capability', label: { vi: 'Năng lực quy trình', en: 'Capability Summary' } },
    { id: 'analytics',  label: { vi: 'Phân tích', en: 'Analytics' } }
  ];

  /* ── Data fetching ────────────────────────────────────────────────────── */
  function loadChartList() {
    state.listLoading = true;
    rerender();
    restCall(API.query, {
      offset: (state.listPage - 1) * 25, limit: 25,
      search: '', sort_by: 'created_at', sort_dir: 'DESC',
      filters: state.filters
    }).then(function(res) {
      state.chartList = (res.data && (res.data.charts || res.data.spc_records)) || res.data || [];
      state.listTotal = (res.pagination && res.pagination.total) || state.chartList.length;
      state.listLoading = false;
      rerender();
    }).catch(function() {
      state.listLoading = false;
      state.chartList = [];
      rerender();
    });
  }

  function loadChartDetail(id) {
    state.detailLoading = true;
    state.activeTab = 'detail';
    rerender();
    restCall(API.detail + encodeURIComponent(id), null, 'GET').then(function(res) {
      state.selectedChart = res.data || res;
      state.chartData = state.selectedChart;
      state.violations = (state.selectedChart && state.selectedChart.violations) || [];
      state.detailLoading = false;
      rerender();
      renderSvgChart();
    }).catch(function() {
      state.detailLoading = false;
      rerender();
    });
  }

  function loadCapabilityData() {
    state.capLoading = true;
    rerender();
    restCall(API.query, {
      offset: 0, limit: 200, search: '', sort_by: 'characteristic', sort_dir: 'ASC', filters: {}
    }).then(function(res) {
      state.capabilityData = (res.data && (res.data.charts || res.data.spc_records)) || res.data || [];
      state.capLoading = false;
      rerender();
    }).catch(function() {
      state.capLoading = false;
      rerender();
    });
  }

  function loadMetrics() {
    state.metricsLoading = true;
    rerender();
    restCall(API.metrics, null, 'GET').then(function(res) {
      state.metrics = (res.data && res.data.metrics) || res.data || {};
      state.metricsLoading = false;
      rerender();
    }).catch(function() {
      state.metricsLoading = false;
      rerender();
    });
  }

  function executeAction(id, action, payload) {
    restCall(API.action + encodeURIComponent(id) + '/actions/' + action, payload || {}).then(function(res) {
      if (res.success !== false) {
        loadChartDetail(id);
      }
    }).catch(function() { rerender(); });
  }

  /* ── Rendering ────────────────────────────────────────────────────────── */
  function render(container) {
    state.container = container;
    var html = '<div class="eqms-module eqms-spc">';
    html += UI.renderTabs(TABS, state.activeTab);
    html += '<div class="eqms-module-body">';

    switch (state.activeTab) {
      case 'dashboard':  html += renderDashboard(); break;
      case 'detail':     html += renderChartDetailScreen(); break;
      case 'capability': html += renderCapabilitySummary(); break;
      case 'analytics':  html += renderAnalytics(); break;
      default:           html += renderDashboard();
    }

    html += '</div></div>';
    container.innerHTML = html;
    bindEvents(container);

    if (state.activeTab === 'dashboard' && !state.chartList.length && !state.listLoading) {
      loadChartList();
    }
    if (state.activeTab === 'capability' && !state.capabilityData.length && !state.capLoading) {
      loadCapabilityData();
    }
    if (state.activeTab === 'analytics' && !state.metrics && !state.metricsLoading) {
      loadMetrics();
    }
    if (state.activeTab === 'detail' && state.selectedChart) {
      renderSvgChart();
    }
  }

  function rerender() {
    if (state.container) render(state.container);
  }

  /* ── Screen 1: Dashboard — Control Chart Thumbnails ───────────────────── */
  function renderDashboard() {
    var html = '';

    // Filter bar
    html += UI.renderFilterBar(state.filters, {
      fields: [
        { key: 'product', label: { vi: 'Sản phẩm', en: 'Product' }, type: 'text', placeholder: { vi: 'Mã SP...', en: 'Product...' } },
        { key: 'process', label: { vi: 'Quy trình', en: 'Process' }, type: 'text', placeholder: { vi: 'Quy trình...', en: 'Process...' } },
        { key: 'work_center', label: { vi: 'Trung tâm SX', en: 'Work Center' }, type: 'text', placeholder: { vi: 'WC...', en: 'WC...' } },
        { key: 'characteristic', label: { vi: 'Đặc tính', en: 'Characteristic' }, type: 'text', placeholder: { vi: 'Đặc tính...', en: 'Characteristic...' } },
        { key: 'date_from', label: { vi: 'Từ', en: 'From' }, type: 'date' },
        { key: 'date_to', label: { vi: 'Đến', en: 'To' }, type: 'date' }
      ]
    });

    if (state.listLoading) {
      return html + UI.renderLoadingState({ vi: 'Đang tải biểu đồ kiểm soát...', en: 'Loading control charts...' });
    }

    if (!state.chartList.length) {
      return html + UI.renderEmptyState({
        icon: '\u{1F4C8}',
        title: { vi: 'Chưa có biểu đồ kiểm soát', en: 'No control charts found' },
        desc: { vi: 'Thử thay đổi bộ lọc hoặc thêm dữ liệu SPC', en: 'Try adjusting filters or add SPC data' }
      });
    }

    // Thumbnail grid
    html += '<div class="eqms-spc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px">';
    state.chartList.forEach(function(chart) {
      html += renderChartThumbnail(chart);
    });
    html += '</div>';

    html += UI.renderPagination({ total: state.listTotal, offset: (state.listPage - 1) * 25, limit: 25 });

    return html;
  }

  function renderChartThumbnail(chart) {
    var cpk = chart.cpk != null ? Number(chart.cpk).toFixed(2) : '—';
    var capLevel = getCapabilityLevel(chart.cpk);
    var hasViolation = chart.active_violations > 0 || chart.has_violation;

    var html = '<div class="eqms-spc-thumbnail" data-action="open-chart" data-id="' + esc(chart.id || chart.spc_id || '') + '" ';
    html += 'style="border:1px solid var(--hm-border);border-radius:8px;padding:16px;cursor:pointer;position:relative;';
    html += 'background:var(--hm-bg-card);transition:box-shadow 0.15s">';

    // Violation indicator
    if (hasViolation) {
      html += '<div style="position:absolute;top:8px;right:8px;width:12px;height:12px;border-radius:50%;background:var(--hm-danger);';
      html += 'box-shadow:0 0 6px rgba(239,68,68,0.5)" title="' + T({ vi: 'Vi phạm quy tắc', en: 'Rule Violation' }) + '"></div>';
    }

    // Characteristic name
    html += '<div style="font-weight:600;font-size:14px;margin-bottom:4px;padding-right:20px">' + esc(chart.characteristic || chart.name || '') + '</div>';

    // Chart type + product
    html += '<div style="font-size:12px;color:var(--hm-text-secondary);margin-bottom:8px">';
    html += esc(chart.chart_type || 'X-bar') + ' \u00B7 ' + esc(chart.product || chart.process || '');
    html += '</div>';

    // Mini SVG chart placeholder
    html += '<div style="height:60px;background:var(--hm-bg-secondary);border-radius:4px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--hm-text-tertiary)">';
    html += renderMiniChart(chart);
    html += '</div>';

    // Cpk value
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span style="font-size:12px;color:var(--hm-text-secondary)">Cpk</span>';
    html += '<span style="font-size:18px;font-weight:700;color:' + (capLevel ? capLevel.color : 'inherit') + '">' + cpk + '</span>';
    html += '</div>';

    // Capability indicator
    if (capLevel) {
      html += '<div style="font-size:11px;color:' + capLevel.color + ';text-align:right">' + T(capLevel) + '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderMiniChart(chart) {
    var points = chart.recent_values || chart.data_points || [];
    if (!points.length) return T({ vi: 'Chưa có dữ liệu', en: 'No data' });

    var vals = points.slice(-20).map(function(p) { return typeof p === 'number' ? p : (p.value || 0); });
    if (!vals.length) return T({ vi: 'Chưa có dữ liệu', en: 'No data' });

    var minV = Math.min.apply(null, vals);
    var maxV = Math.max.apply(null, vals);
    var range = maxV - minV || 1;
    var w = 240, h = 50;
    var stepX = w / Math.max(vals.length - 1, 1);

    var pathParts = vals.map(function(v, i) {
      var x = i * stepX;
      var y = h - ((v - minV) / range) * h;
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    });

    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:100%">';
    // CL line
    var cl = chart.cl || chart.center_line;
    if (cl != null) {
      var cy = h - ((cl - minV) / range) * h;
      svg += '<line x1="0" y1="' + cy.toFixed(1) + '" x2="' + w + '" y2="' + cy.toFixed(1) + '" stroke="#10b981" stroke-width="1" stroke-dasharray="4,2"/>';
    }
    // UCL/LCL
    if (chart.ucl != null) {
      var uy = h - ((chart.ucl - minV) / range) * h;
      svg += '<line x1="0" y1="' + uy.toFixed(1) + '" x2="' + w + '" y2="' + uy.toFixed(1) + '" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,3"/>';
    }
    if (chart.lcl != null) {
      var ly = h - ((chart.lcl - minV) / range) * h;
      svg += '<line x1="0" y1="' + ly.toFixed(1) + '" x2="' + w + '" y2="' + ly.toFixed(1) + '" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,3"/>';
    }
    // Data line
    svg += '<path d="' + pathParts.join('') + '" fill="none" stroke="#3b82f6" stroke-width="1.5"/>';
    svg += '</svg>';
    return svg;
  }

  /* ── Screen 2: Chart Detail ───────────────────────────────────────────── */
  function renderChartDetailScreen() {
    if (state.detailLoading) {
      return UI.renderLoadingState({ vi: 'Đang tải biểu đồ...', en: 'Loading chart...' });
    }

    if (!state.selectedChart) {
      return UI.renderEmptyState({
        icon: '\u{1F4C8}',
        title: { vi: 'Chưa chọn biểu đồ', en: 'No chart selected' },
        desc: { vi: 'Chọn biểu đồ từ bảng điều khiển', en: 'Select a chart from the dashboard' }
      });
    }

    var chart = state.selectedChart;
    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="back-dashboard">';
    html += '\u2190 ' + T({ vi: 'Quay lại bảng điều khiển', en: 'Back to Dashboard' });
    html += '</button>';
    html += '</div>';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">';
    html += '<div>';
    html += '<h3 style="margin:0;font-size:18px">' + esc(chart.characteristic || chart.name || '') + '</h3>';
    html += '<div style="font-size:13px;color:var(--hm-text-secondary);margin-top:4px">';
    html += esc(chart.product || '') + ' \u00B7 ' + esc(chart.process || '') + ' \u00B7 ' + esc(chart.work_center || '');
    html += '</div></div>';

    // Chart type selector
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
    CHART_TYPES.forEach(function(ct) {
      var active = state.selectedChartType === ct.value;
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="set-chart-type" data-type="' + ct.value + '">';
      html += ct.label;
      html += '</button>';
    });
    html += '</div></div>';

    // SVG chart area
    html += '<div class="eqms-section">';
    html += '<div class="eqms-section-header"><span>' + T({ vi: 'Biểu đồ kiểm soát', en: 'Control Chart' }) + '</span></div>';
    html += '<div class="eqms-section-body">';
    html += '<div id="spc-control-chart" style="width:100%;min-height:320px;background:var(--hm-bg-secondary);border-radius:6px;padding:16px"></div>';
    html += '</div></div>';

    // Violations table
    html += UI.renderSection({ vi: 'Danh sách vi phạm', en: 'Violations' }, renderViolationsTable());

    // Process capability
    html += UI.renderSection({ vi: 'Năng lực quy trình', en: 'Process Capability' }, renderCapabilityDetail(chart));

    // Raw data table
    html += UI.renderSection({ vi: 'Dữ liệu thô', en: 'Raw Data' }, renderRawDataTable(chart),
      { headerActions: UI.renderExportMenu({ formats: ['excel', 'csv', 'pdf'] }) }
    );

    return html;
  }

  /* ── SVG Control Chart Renderer ───────────────────────────────────────── */
  function renderSvgChart() {
    var chartEl = state.container && state.container.querySelector('#spc-control-chart');
    if (!chartEl || !state.selectedChart) return;

    var chart = state.selectedChart;
    var points = chart.data_points || chart.values || [];
    if (!points.length) {
      chartEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--hm-text-tertiary)">' +
        T({ vi: 'Chưa có dữ liệu', en: 'No data points' }) + '</div>';
      return;
    }

    renderControlChart(chartEl, {
      data: points,
      ucl: chart.ucl,
      cl: chart.cl || chart.center_line,
      lcl: chart.lcl,
      violations: state.violations || [],
      chartType: state.selectedChartType,
      title: chart.characteristic || ''
    });
  }

  function renderControlChart(container, config) {
    var data = config.data || [];
    var vals = data.map(function(d) { return typeof d === 'number' ? d : (d.value || d.y || 0); });
    var labels = data.map(function(d, i) { return d.label || d.sample_number || (i + 1); });
    if (!vals.length) return;

    var pad = { top: 30, right: 60, bottom: 40, left: 70 };
    var w = container.clientWidth || 700;
    var h = 320;
    var plotW = w - pad.left - pad.right;
    var plotH = h - pad.top - pad.bottom;

    var allVals = vals.slice();
    if (config.ucl != null) allVals.push(config.ucl);
    if (config.lcl != null) allVals.push(config.lcl);
    var minY = Math.min.apply(null, allVals);
    var maxY = Math.max.apply(null, allVals);
    var rangeY = maxY - minY || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;
    rangeY = maxY - minY;

    var scaleX = function(i) { return pad.left + (i / Math.max(vals.length - 1, 1)) * plotW; };
    var scaleY = function(v) { return pad.top + plotH - ((v - minY) / rangeY) * plotH; };

    // Violation point set for quick lookup
    var violationPoints = {};
    (config.violations || []).forEach(function(v) {
      var idx = v.point_number || v.sample_number;
      if (idx != null) violationPoints[idx] = v;
    });

    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;font-family:inherit">';

    // Background
    svg += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="var(--hm-bg-card,#fff)" rx="6"/>';

    // Grid lines
    var yTicks = 5;
    for (var t = 0; t <= yTicks; t++) {
      var yVal = minY + (rangeY / yTicks) * t;
      var yPos = scaleY(yVal);
      svg += '<line x1="' + pad.left + '" y1="' + yPos.toFixed(1) + '" x2="' + (w - pad.right) + '" y2="' + yPos.toFixed(1) + '" stroke="var(--hm-border,#e2e8f0)" stroke-width="0.5"/>';
      svg += '<text x="' + (pad.left - 8) + '" y="' + (yPos + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--hm-text-secondary,#64748b)">' + yVal.toFixed(2) + '</text>';
    }

    // UCL line (red dashed)
    if (config.ucl != null) {
      var uclY = scaleY(config.ucl);
      svg += '<line x1="' + pad.left + '" y1="' + uclY.toFixed(1) + '" x2="' + (w - pad.right) + '" y2="' + uclY.toFixed(1) + '" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6,3"/>';
      svg += '<text x="' + (w - pad.right + 4) + '" y="' + (uclY + 4).toFixed(1) + '" font-size="10" fill="#ef4444" font-weight="600">UCL ' + Number(config.ucl).toFixed(2) + '</text>';
    }

    // CL line (green)
    if (config.cl != null) {
      var clY = scaleY(config.cl);
      svg += '<line x1="' + pad.left + '" y1="' + clY.toFixed(1) + '" x2="' + (w - pad.right) + '" y2="' + clY.toFixed(1) + '" stroke="#10b981" stroke-width="1.5"/>';
      svg += '<text x="' + (w - pad.right + 4) + '" y="' + (clY + 4).toFixed(1) + '" font-size="10" fill="#10b981" font-weight="600">CL ' + Number(config.cl).toFixed(2) + '</text>';
    }

    // LCL line (red dashed)
    if (config.lcl != null) {
      var lclY = scaleY(config.lcl);
      svg += '<line x1="' + pad.left + '" y1="' + lclY.toFixed(1) + '" x2="' + (w - pad.right) + '" y2="' + lclY.toFixed(1) + '" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6,3"/>';
      svg += '<text x="' + (w - pad.right + 4) + '" y="' + (lclY + 4).toFixed(1) + '" font-size="10" fill="#ef4444" font-weight="600">LCL ' + Number(config.lcl).toFixed(2) + '</text>';
    }

    // Data line
    var pathParts = vals.map(function(v, i) {
      return (i === 0 ? 'M' : 'L') + scaleX(i).toFixed(1) + ',' + scaleY(v).toFixed(1);
    });
    svg += '<path d="' + pathParts.join('') + '" fill="none" stroke="#3b82f6" stroke-width="2"/>';

    // Data points
    vals.forEach(function(v, i) {
      var x = scaleX(i);
      var y = scaleY(v);
      var sampleNum = labels[i];
      var isViolation = violationPoints[sampleNum] || violationPoints[i + 1];
      var ooc = false;
      if (config.ucl != null && v > config.ucl) ooc = true;
      if (config.lcl != null && v < config.lcl) ooc = true;

      if (isViolation || ooc) {
        // Out-of-control: red dot with halo
        svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" fill="rgba(239,68,68,0.2)" stroke="none"/>';
        svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="#ef4444" stroke="#fff" stroke-width="1"/>';
      } else {
        // Normal point
        svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="#3b82f6" stroke="#fff" stroke-width="1"/>';
      }
    });

    // X-axis labels (sparse)
    var xLabelInterval = Math.max(1, Math.floor(vals.length / 10));
    vals.forEach(function(v, i) {
      if (i % xLabelInterval === 0 || i === vals.length - 1) {
        svg += '<text x="' + scaleX(i).toFixed(1) + '" y="' + (h - pad.bottom + 20) + '" text-anchor="middle" font-size="10" fill="var(--hm-text-secondary,#64748b)">' + esc(String(labels[i])) + '</text>';
      }
    });

    // Axis labels
    svg += '<text x="' + (pad.left + plotW / 2) + '" y="' + (h - 4) + '" text-anchor="middle" font-size="11" fill="var(--hm-text-secondary)">' + T({ vi: 'Mẫu #', en: 'Sample #' }) + '</text>';

    // Title
    if (config.title) {
      svg += '<text x="' + (pad.left + plotW / 2) + '" y="16" text-anchor="middle" font-size="13" fill="var(--hm-text-primary,#1e293b)" font-weight="600">' + esc(config.title) + ' (' + (state.selectedChartType || 'xbar').toUpperCase() + ')</text>';
    }

    svg += '</svg>';
    container.innerHTML = svg;
  }

  /* ── Violations table ─────────────────────────────────────────────────── */
  function renderViolationsTable() {
    if (!state.violations.length) {
      return '<div style="padding:12px;color:var(--hm-text-secondary);font-size:13px">' +
        T({ vi: 'Chưa phát hiện vi phạm quy tắc', en: 'No rule violations detected' }) + '</div>';
    }

    var html = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
    html += '<thead><tr>';
    html += '<th>' + T({ vi: 'Điểm #', en: 'Point #' }) + '</th>';
    html += '<th>' + T({ vi: 'Ngày', en: 'Date' }) + '</th>';
    html += '<th>' + T({ vi: 'Giá trị', en: 'Value' }) + '</th>';
    html += '<th>' + T({ vi: 'Quy tắc vi phạm', en: 'Rule Violated' }) + '</th>';
    html += '<th>' + T({ vi: 'Trạng thái', en: 'Status' }) + '</th>';
    html += '<th>' + T({ vi: 'Hành động', en: 'Action' }) + '</th>';
    html += '</tr></thead><tbody>';

    state.violations.forEach(function(v) {
      var ruleLabel = WESTERN_ELECTRIC_RULES[v.rule] || v.rule || v.rule_violated || '';
      html += '<tr>';
      html += '<td class="mono">' + esc(v.point_number || v.sample_number || '') + '</td>';
      html += '<td>' + esc(fmtDate(v.date || v.timestamp || '')) + '</td>';
      html += '<td class="mono" style="font-weight:600">' + esc(v.value != null ? Number(v.value).toFixed(4) : '—') + '</td>';
      html += '<td style="font-size:12px">' + esc(T(ruleLabel)) + '</td>';
      html += '<td><span class="eqms-badge ' + slugify(v.status || 'new') + '">' + esc(v.status || 'new') + '</span></td>';
      html += '<td style="white-space:nowrap">';
      if (v.status === 'new' || !v.status) {
        html += '<button class="eqms-btn ghost sm" data-action="acknowledge-violation" data-vid="' + esc(v.id || '') + '">' + T({ vi: 'Xác nhận', en: 'Acknowledge' }) + '</button>';
        html += '<button class="eqms-btn ghost sm" data-action="create-deviation" data-vid="' + esc(v.id || '') + '" style="margin-left:4px">' + T({ vi: 'Tạo sai lệch', en: 'Create Deviation' }) + '</button>';
      }
      html += '</td></tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  /* ── Process Capability Detail ────────────────────────────────────────── */
  function renderCapabilityDetail(chart) {
    var cp = chart.cp, cpk = chart.cpk, pp = chart.pp, ppk = chart.ppk;

    var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">';

    var indices = [
      { key: 'Cp', value: cp },
      { key: 'Cpk', value: cpk },
      { key: 'Pp', value: pp },
      { key: 'Ppk', value: ppk }
    ];

    indices.forEach(function(idx) {
      var val = idx.value != null ? Number(idx.value) : null;
      var level = getCapabilityLevel(val);
      var color = level ? level.color : 'var(--hm-text-tertiary)';
      var label = level ? T(level) : '—';

      html += '<div style="text-align:center;padding:16px;border:1px solid var(--hm-border);border-radius:8px;background:var(--hm-bg-secondary)">';
      html += '<div style="font-size:12px;color:var(--hm-text-secondary);margin-bottom:4px">' + idx.key + '</div>';
      html += '<div style="font-size:28px;font-weight:700;color:' + color + '">' + (val != null ? val.toFixed(2) : '—') + '</div>';
      html += '<div style="font-size:11px;color:' + color + ';margin-top:4px">' + label + '</div>';
      html += '</div>';
    });

    html += '</div>';

    // Interpretation
    html += '<div style="margin-top:16px;padding:12px;background:var(--hm-bg-secondary);border-radius:6px;font-size:13px">';
    html += '<div style="font-weight:600;margin-bottom:8px">' + T({ vi: 'Diễn giải', en: 'Interpretation' }) + '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">';
    html += '<div><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#059669;margin-right:6px"></span>' + T({ vi: 'Xuất sắc (>1.67)', en: 'Excellent (>1.67)' }) + '</div>';
    html += '<div><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#10b981;margin-right:6px"></span>' + T({ vi: 'Đủ năng lực (>1.33)', en: 'Capable (>1.33)' }) + '</div>';
    html += '<div><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#f59e0b;margin-right:6px"></span>' + T({ vi: 'Biên (1.0-1.33)', en: 'Marginal (1.0-1.33)' }) + '</div>';
    html += '<div><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#ef4444;margin-right:6px"></span>' + T({ vi: 'Không đủ năng lực (<1.0)', en: 'Incapable (<1.0)' }) + '</div>';
    html += '</div></div>';

    return html;
  }

  function renderRawDataTable(chart) {
    var points = chart.data_points || chart.values || [];
    var cols = [
      { key: 'sample_number', label: { vi: 'Mẫu #', en: 'Sample #' }, type: 'number' },
      { key: 'value', label: { vi: 'Giá trị', en: 'Value' },
        render: function(v) { return '<span class="mono">' + (v != null ? Number(v).toFixed(4) : '—') + '</span>'; }
      },
      { key: 'date', label: { vi: 'Ngày', en: 'Date' }, type: 'date' },
      { key: 'subgroup', label: { vi: 'Nhóm con', en: 'Subgroup' } },
      { key: 'operator', label: { vi: 'Người vận hành', en: 'Operator' } }
    ];

    var rows = points.map(function(p, i) {
      if (typeof p === 'number') return { sample_number: i + 1, value: p };
      return Object.assign({ sample_number: p.sample_number || i + 1 }, p);
    });

    return UI.renderDataGrid(cols, rows, {});
  }

  /* ── Screen 3: Capability Summary ─────────────────────────────────────── */
  function renderCapabilitySummary() {
    var html = '';

    // Filter by capability level
    html += UI.renderFilterBar(state.capFilter, {
      fields: [
        { key: 'level', label: { vi: 'Mức năng lực', en: 'Capability Level' }, type: 'select', options: [
          { value: 'excellent', label: { vi: 'Xuất sắc (>1.67)', en: 'Excellent (>1.67)' } },
          { value: 'capable', label: { vi: 'Đủ năng lực (>1.33)', en: 'Capable (>1.33)' } },
          { value: 'marginal', label: { vi: 'Biên (1.0-1.33)', en: 'Marginal (1.0-1.33)' } },
          { value: 'incapable', label: { vi: 'Không đủ (<1.0)', en: 'Incapable (<1.0)' } }
        ]}
      ]
    });

    if (state.capLoading) {
      return html + UI.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' });
    }

    // Filter data
    var filtered = state.capabilityData;
    if (state.capFilter.level) {
      filtered = filtered.filter(function(c) {
        var level = getCapabilityLevelKey(c.cpk);
        return level === state.capFilter.level;
      });
    }

    var cols = [
      { key: 'characteristic', label: { vi: 'Đặc tính', en: 'Characteristic' } },
      { key: 'product', label: { vi: 'Sản phẩm', en: 'Product' } },
      { key: 'process', label: { vi: 'Quy trình', en: 'Process' } },
      { key: 'cp', label: 'Cp',
        render: function(v) { return renderCpkCell(v); }
      },
      { key: 'cpk', label: 'Cpk',
        render: function(v) { return renderCpkCell(v); }
      },
      { key: 'pp', label: 'Pp',
        render: function(v) { return renderCpkCell(v); }
      },
      { key: 'ppk', label: 'Ppk',
        render: function(v) { return renderCpkCell(v); }
      },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' },
        render: function(v, row) {
          var level = getCapabilityLevel(row.cpk);
          if (!level) return '—';
          return '<span style="color:' + level.color + ';font-weight:600;font-size:12px">' + esc(T(level)) + '</span>';
        }
      }
    ];

    html += UI.renderDataGrid(cols, filtered, {});
    html += UI.renderPagination({ total: filtered.length, offset: 0, limit: 200 });

    return html;
  }

  function renderCpkCell(val) {
    if (val == null) return '<span style="color:var(--hm-text-tertiary)">—</span>';
    var n = Number(val);
    var level = getCapabilityLevel(n);
    var color = level ? level.color : 'var(--hm-text-secondary)';
    return '<span class="mono" style="color:' + color + ';font-weight:600">' + n.toFixed(2) + '</span>';
  }

  /* ── Screen 4: Analytics ──────────────────────────────────────────────── */
  function renderAnalytics() {
    if (state.metricsLoading) {
      return UI.renderLoadingState({ vi: 'Đang tải phân tích...', en: 'Loading analytics...' });
    }
    if (!state.metrics) {
      return UI.renderEmptyState({
        icon: '\u{1F4CA}',
        title: { vi: 'Chưa có dữ liệu phân tích', en: 'No analytics data' },
        action: { key: 'load-metrics', label: { vi: 'Tải dữ liệu', en: 'Load Data' } }
      });
    }

    var html = '';
    var m = state.metrics;

    // KPI row
    html += UI.renderKpiRow([
      { label: { vi: 'Tổng đặc tính SPC', en: 'Total SPC Characteristics' }, value: fmt(m.total_characteristics || 0) },
      { label: { vi: 'Cpk trung bình', en: 'Average Cpk' }, value: m.avg_cpk != null ? Number(m.avg_cpk).toFixed(2) : '—' },
      { label: { vi: 'Vi phạm hoạt động', en: 'Active Violations' }, value: fmt(m.active_violations || 0), accent: (m.active_violations || 0) > 0 ? 'danger' : '' },
      { label: { vi: 'Đặc tính Cpk<1.0', en: 'Cpk < 1.0' }, value: fmt(m.incapable_count || 0), accent: (m.incapable_count || 0) > 0 ? 'danger' : '' },
      { label: { vi: 'Đặc tính Cpk>1.33', en: 'Cpk > 1.33' }, value: fmt(m.capable_count || 0), accent: 'success' }
    ]);

    // Cpk trend by characteristic
    html += UI.renderSection({ vi: 'Xu hướng Cpk theo đặc tính', en: 'Cpk Trend by Characteristic' },
      UI.renderChartWithTableFallback('cpk-trend', null,
        [
          { key: 'characteristic', label: { vi: 'Đặc tính', en: 'Characteristic' } },
          { key: 'period', label: { vi: 'Kỳ', en: 'Period' } },
          { key: 'cpk', label: 'Cpk', type: 'number' },
          { key: 'trend', label: { vi: 'Xu hướng', en: 'Trend' } }
        ],
        [], { defaultMode: 'table' }
      )
    );

    // Violation frequency by rule
    html += UI.renderSection({ vi: 'Tần suất vi phạm theo quy tắc', en: 'Violation Frequency by Rule' },
      UI.renderChartWithTableFallback('violation-freq', null,
        [
          { key: 'rule', label: { vi: 'Quy tắc', en: 'Rule' } },
          { key: 'count', label: { vi: 'Số lần', en: 'Count' }, type: 'number' },
          { key: 'pct', label: '%', type: 'number' }
        ],
        [], { defaultMode: 'table' }
      )
    );

    // Process capability comparison
    html += UI.renderSection({ vi: 'So sánh năng lực quy trình', en: 'Process Capability Comparison' },
      UI.renderChartWithTableFallback('cap-comparison', null,
        [
          { key: 'product', label: { vi: 'Sản phẩm', en: 'Product' } },
          { key: 'process', label: { vi: 'Quy trình', en: 'Process' } },
          { key: 'avg_cpk', label: 'Avg Cpk', type: 'number' },
          { key: 'min_cpk', label: 'Min Cpk', type: 'number' },
          { key: 'max_cpk', label: 'Max Cpk', type: 'number' }
        ],
        [], { defaultMode: 'table' }
      )
    );

    // Improvement trend
    html += UI.renderSection({ vi: 'Xu hướng cải thiện', en: 'Improvement Trend' },
      UI.renderChartWithTableFallback('improvement-trend', null,
        [
          { key: 'period', label: { vi: 'Kỳ', en: 'Period' } },
          { key: 'avg_cpk', label: 'Avg Cpk', type: 'number' },
          { key: 'pct_capable', label: { vi: '% >= 1.33', en: '% >= 1.33' }, type: 'number' },
          { key: 'violations', label: { vi: 'Vi phạm', en: 'Violations' }, type: 'number' }
        ],
        [], { defaultMode: 'table' }
      )
    );

    return html;
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function getCapabilityLevel(cpk) {
    if (cpk == null) return null;
    var n = Number(cpk);
    if (isNaN(n)) return null;
    if (n >= 1.67) return CAPABILITY_LEVELS.excellent;
    if (n >= 1.33) return CAPABILITY_LEVELS.capable;
    if (n >= 1.0) return CAPABILITY_LEVELS.marginal;
    return CAPABILITY_LEVELS.incapable;
  }

  function getCapabilityLevelKey(cpk) {
    if (cpk == null) return null;
    var n = Number(cpk);
    if (isNaN(n)) return null;
    if (n >= 1.67) return 'excellent';
    if (n >= 1.33) return 'capable';
    if (n >= 1.0) return 'marginal';
    return 'incapable';
  }

  /* ── Event binding ────────────────────────────────────────────────────── */
  function bindEvents(container) {
    container.addEventListener('click', function(e) {
      // Tab switching
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        state.activeTab = tab.getAttribute('data-tab');
        rerender();
        return;
      }

      var action = e.target.closest('[data-action]');
      if (!action) return;
      var act = action.getAttribute('data-action');

      switch (act) {
        case 'open-chart':
          var id = action.getAttribute('data-id');
          if (id) loadChartDetail(id);
          break;

        case 'back-dashboard':
          state.activeTab = 'dashboard';
          state.selectedChart = null;
          state.chartData = null;
          state.violations = [];
          rerender();
          break;

        case 'set-chart-type':
          state.selectedChartType = action.getAttribute('data-type') || 'xbar';
          rerender();
          break;

        case 'acknowledge-violation':
          var vid = action.getAttribute('data-vid');
          if (state.selectedChart && vid) {
            var chartId = state.selectedChart.id || state.selectedChart.spc_id;
            executeAction(chartId, 'acknowledge-violation', { violation_id: vid });
          }
          break;

        case 'create-deviation':
          var dvid = action.getAttribute('data-vid');
          if (state.selectedChart && dvid) {
            var cid = state.selectedChart.id || state.selectedChart.spc_id;
            executeAction(cid, 'create-deviation', { violation_id: dvid });
          }
          break;

        case 'apply-filters':
          if (state.activeTab === 'dashboard') {
            readFilters(container, state.filters);
            state.listPage = 1;
            loadChartList();
          } else if (state.activeTab === 'capability') {
            readFilters(container, state.capFilter);
            rerender();
          }
          break;

        case 'reset-filters':
          if (state.activeTab === 'dashboard') {
            state.filters = { product: '', process: '', work_center: '', characteristic: '', date_from: '', date_to: '' };
            state.listPage = 1;
            loadChartList();
          } else if (state.activeTab === 'capability') {
            state.capFilter = { level: '' };
            rerender();
          }
          break;

        case 'page':
          var page = Number(action.getAttribute('data-page')) || 1;
          state.listPage = page;
          loadChartList();
          break;

        case 'load-metrics':
          loadMetrics();
          break;

        case 'export':
          var format = action.getAttribute('data-format');
          if (state.selectedChart) {
            var eid = state.selectedChart.id || state.selectedChart.spc_id;
            restCall(API.export + encodeURIComponent(eid) + '/export', { format: format });
          }
          break;

        case 'recalculate-limits':
          if (state.selectedChart) {
            var rid = state.selectedChart.id || state.selectedChart.spc_id;
            executeAction(rid, 'recalculate-limits', {});
          }
          break;
      }
    });
  }

  function readFilters(container, filterObj) {
    container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      if (key in filterObj) {
        filterObj[key] = el.value;
      }
    });
  }

  /* ── Register module ──────────────────────────────────────────────────── */
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['spc'] = { render: render, meta: MOD };

})();
