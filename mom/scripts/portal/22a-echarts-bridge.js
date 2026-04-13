/* ===================================================================
   22a-echarts-bridge.js
   HESEM MOM Portal — ECharts Bridge & Fallback Renderer
   Unified chart API with HESEM design token theming.
   Provides window.HmChart namespace for all chart types.
   Must load AFTER hesem-design-tokens.css, BEFORE 22-ai-quality-scheduling.js.
   =================================================================== */

(function(){
'use strict';

/* ── Helpers ──────────────────────────────────────────── */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }

/* ── Color palette for series ────────────────────────── */
var SERIES_PALETTE = [
  '#1565c0', '#e53935', '#43a047', '#fb8c00', '#8e24aa',
  '#00acc1', '#d81b60', '#3949ab', '#7cb342', '#f4511e'
];

/* ── Namespace ───────────────────────────────────────── */
window.HmChart = {

  _instances: [],   // { container, chart, type }
  _fallback: false, // true if ECharts CDN failed to load
  _themeCache: null,

  /* ── theme: read CSS custom properties ─────────────── */
  theme: function(){
    var cs = getComputedStyle(document.documentElement);
    var get = function(prop, fallback){
      var v = cs.getPropertyValue(prop).trim();
      return v || fallback;
    };
    return {
      brand:      get('--brand', '#0c2d48'),
      brand2:     get('--brand-2', '#1565c0'),
      text:       get('--text-primary', '#0f172a'),
      textMuted:  get('--text-secondary', '#64748b'),
      textTertiary: get('--text-tertiary', '#94a3b8'),
      surface:    get('--bg-surface', '#ffffff'),
      surfaceAlt: get('--bg-surface-alt', '#f1f5f9'),
      border:     get('--border', '#e2e8f0'),
      success:    get('--green', '#22c55e'),
      warning:    get('--amber', '#f59e0b'),
      danger:     get('--red', '#ef4444'),
      info:       get('--blue', '#3b82f6'),
      purple:     get('--purple', '#7c3aed'),
      cyan:       get('--cyan', '#0891b2'),
      font:       get('--font', '-apple-system, Segoe UI, sans-serif'),
      fontMono:   get('--font-mono', 'JetBrains Mono, monospace')
    };
  },

  /* ── _echartsTheme: build ECharts theme object ─────── */
  _echartsTheme: function(){
    var t = this.theme();
    return {
      color: SERIES_PALETTE,
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: t.font,
        color: t.text
      },
      title: {
        textStyle: { color: t.text, fontWeight: 600, fontSize: 14 },
        subtextStyle: { color: t.textMuted }
      },
      legend: {
        textStyle: { color: t.textMuted, fontSize: 11 }
      },
      tooltip: {
        backgroundColor: t.surface,
        borderColor: t.border,
        textStyle: { color: t.text, fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 6px;'
      },
      grid: {
        borderColor: t.border
      },
      categoryAxis: {
        axisLine: { lineStyle: { color: t.border } },
        axisTick: { lineStyle: { color: t.border } },
        axisLabel: { color: t.textMuted, fontSize: 11 },
        splitLine: { lineStyle: { color: t.surfaceAlt } }
      },
      valueAxis: {
        axisLine: { lineStyle: { color: t.border } },
        axisTick: { lineStyle: { color: t.border } },
        axisLabel: { color: t.textMuted, fontSize: 11 },
        splitLine: { lineStyle: { color: t.surfaceAlt, type: 'dashed' } }
      },
      dataZoom: {
        backgroundColor: t.surfaceAlt,
        dataBackgroundColor: t.border,
        fillerColor: 'rgba(21,101,192,0.12)',
        handleColor: t.brand2,
        textStyle: { color: t.textMuted }
      }
    };
  },

  /* ── create: main entry point ──────────────────────── */
  create: function(container, type, options){
    if(!container) return null;
    options = options || {};

    // Check if ECharts loaded
    if(typeof echarts === 'undefined'){
      this._fallback = true;
      return this._createFallback(container, type, options);
    }

    // Dispose existing chart on same container
    this.dispose(container);

    // Register HESEM theme if not done
    if(!echarts.getMap || !this._themeRegistered){
      echarts.registerTheme('hesem', this._echartsTheme());
      this._themeRegistered = true;
    }

    var chart = echarts.init(container, 'hesem', {
      renderer: options.renderer || 'canvas'
    });

    // Build option based on type
    var optObj = this._buildOption(type, options);
    if(optObj) chart.setOption(optObj);

    // Track instance
    this._instances.push({ container: container, chart: chart, type: type });

    return chart;
  },

  /* ── _buildOption: dispatch to type-specific builders ── */
  _buildOption: function(type, opts){
    switch(type){
      case 'spc':        return this._optSpc(opts);
      case 'timeseries': return this._optTimeseries(opts);
      case 'gantt':      return this._optGantt(opts);
      case 'heatmap':    return this._optHeatmap(opts);
      case 'gauge':      return this._optGauge(opts);
      case 'donut':      return this._optDonut(opts);
      case 'bar':        return this._optBar(opts);
      case 'scatter':    return this._optScatter(opts);
      case 'radar':      return this._optRadar(opts);
      default:           return opts.option || null;
    }
  },

  /* ── SPC: X-bar control chart ──────────────────────── */
  _optSpc: function(opts){
    var t = this.theme();
    var data     = opts.data || [];
    var ucl      = opts.ucl != null ? opts.ucl : null;
    var lcl      = opts.lcl != null ? opts.lcl : null;
    var cl       = opts.cl  != null ? opts.cl  : null;
    var sigma1   = opts.sigma1 || null;
    var sigma2   = opts.sigma2 || null;
    var anomalies = opts.anomalies || []; // array of indices

    var xData = data.map(function(d, i){ return opts.labels ? opts.labels[i] : (i + 1); });

    var series = [];
    var markAreaData = [];

    // Zone shading (A, B, C) if sigma levels provided
    if(ucl != null && cl != null && sigma1 != null && sigma2 != null){
      // Zone C: cl +/- 1sigma (green)
      markAreaData.push([
        { yAxis: cl - sigma1, itemStyle: { color: 'rgba(34,197,94,0.06)' } },
        { yAxis: cl + sigma1 }
      ]);
      // Zone B: 1sigma to 2sigma (yellow)
      markAreaData.push([
        { yAxis: cl + sigma1, itemStyle: { color: 'rgba(245,158,11,0.06)' } },
        { yAxis: cl + sigma2 }
      ]);
      markAreaData.push([
        { yAxis: cl - sigma2, itemStyle: { color: 'rgba(245,158,11,0.06)' } },
        { yAxis: cl - sigma1 }
      ]);
      // Zone A: 2sigma to 3sigma (red)
      markAreaData.push([
        { yAxis: cl + sigma2, itemStyle: { color: 'rgba(239,68,68,0.06)' } },
        { yAxis: ucl }
      ]);
      markAreaData.push([
        { yAxis: lcl, itemStyle: { color: 'rgba(239,68,68,0.06)' } },
        { yAxis: cl - sigma2 }
      ]);
    }

    // Main data line
    var mainData = data.map(function(v, i){
      var isAnomaly = anomalies.indexOf(i) !== -1;
      return {
        value: v,
        itemStyle: isAnomaly ? { color: t.danger, borderColor: t.danger, borderWidth: 2 } : undefined,
        symbolSize: isAnomaly ? 10 : 4
      };
    });

    series.push({
      name: opts.seriesName || _t('Gia tri do', 'Measured Value'),
      type: 'line',
      data: mainData,
      smooth: false,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2, color: t.brand2 },
      itemStyle: { color: t.brand2 },
      markArea: markAreaData.length ? { silent: true, data: markAreaData } : undefined,
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          ucl != null ? { yAxis: ucl, name: 'UCL', lineStyle: { color: t.danger, type: 'dashed', width: 1.5 }, label: { formatter: 'UCL', position: 'end', fontSize: 10, color: t.danger } } : null,
          lcl != null ? { yAxis: lcl, name: 'LCL', lineStyle: { color: t.danger, type: 'dashed', width: 1.5 }, label: { formatter: 'LCL', position: 'end', fontSize: 10, color: t.danger } } : null,
          cl != null  ? { yAxis: cl,  name: 'CL',  lineStyle: { color: t.success, type: 'solid', width: 1.5 }, label: { formatter: 'CL',  position: 'end', fontSize: 10, color: t.success } } : null
        ].filter(Boolean)
      }
    });

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 40, top: opts.title ? 50 : 20, bottom: 40, containLabel: false },
      xAxis: { type: 'category', data: xData, boundaryGap: false },
      yAxis: { type: 'value', name: opts.yAxisName || '', scale: true },
      series: series,
      animation: true
    };
  },

  /* ── Timeseries: line with dataZoom + optional forecast ─ */
  _optTimeseries: function(opts){
    var t = this.theme();
    var series = [];

    // Main series
    series.push({
      name: opts.seriesName || _t('Du lieu', 'Data'),
      type: 'line',
      data: opts.data || [],
      smooth: opts.smooth !== false,
      symbol: 'none',
      lineStyle: { width: 2 },
      areaStyle: opts.area ? { opacity: 0.08 } : undefined
    });

    // Forecast overlay (dashed)
    if(opts.forecast && opts.forecast.length){
      series.push({
        name: opts.forecastName || _t('Du bao', 'Forecast'),
        type: 'line',
        data: opts.forecast,
        smooth: opts.smooth !== false,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed', color: t.purple }
      });

      // Confidence band
      if(opts.confidenceUpper && opts.confidenceLower){
        series.push({
          name: _t('Khoang tin cay', 'Confidence Band'),
          type: 'line',
          data: opts.confidenceUpper,
          lineStyle: { opacity: 0 },
          symbol: 'none',
          stack: 'confidence',
          areaStyle: { opacity: 0 }
        });
        series.push({
          name: '',
          type: 'line',
          data: opts.confidenceLower,
          lineStyle: { opacity: 0 },
          symbol: 'none',
          stack: 'confidence',
          areaStyle: { opacity: 0.1, color: t.purple }
        });
      }
    }

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: { trigger: 'axis' },
      legend: series.length > 1 ? { bottom: 0 } : undefined,
      grid: { left: 60, right: 30, top: opts.title ? 50 : 20, bottom: series.length > 1 ? 80 : 50, containLabel: false },
      xAxis: {
        type: opts.xType || 'time',
        data: opts.xType === 'category' ? opts.labels : undefined,
        boundaryGap: false
      },
      yAxis: { type: 'value', name: opts.yAxisName || '', scale: true },
      dataZoom: [
        { type: 'inside', start: opts.zoomStart || 0, end: opts.zoomEnd || 100 },
        { type: 'slider', start: opts.zoomStart || 0, end: opts.zoomEnd || 100, height: 24 }
      ],
      toolbox: opts.brush !== false ? {
        feature: {
          brush: { type: ['lineX', 'clear'] }
        }
      } : undefined,
      brush: opts.brush !== false ? {
        xAxisIndex: 'all',
        brushLink: 'all',
        outOfBrush: { colorAlpha: 0.1 }
      } : undefined,
      series: series,
      animation: true
    };
  },

  /* ── Gantt: custom render, Y=machines, X=datetime ──── */
  _optGantt: function(opts){
    var t = this.theme();
    var machines = opts.machines || [];
    var tasks    = opts.tasks || [];

    // Status color mapping
    var statusColors = opts.statusColors || {
      production:  t.info,
      setup:       t.warning,
      maintenance: t.textMuted,
      idle:        t.border,
      completed:   t.success,
      delayed:     t.danger
    };

    // Build render items from tasks
    var renderData = [];
    tasks.forEach(function(task){
      var yIdx = machines.indexOf(task.machine);
      if(yIdx < 0) return;
      renderData.push({
        name: task.name || task.wo || '',
        value: [yIdx, task.start, task.end, task.status || 'production'],
        itemStyle: { color: statusColors[task.status] || t.info }
      });
    });

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: {
        formatter: function(params){
          if(!params.data) return '';
          var d = params.data;
          return '<strong>' + (d.name || '') + '</strong><br/>' +
            (machines[d.value[0]] || '') + '<br/>' +
            new Date(d.value[1]).toLocaleString() + ' - ' +
            new Date(d.value[2]).toLocaleString();
        }
      },
      grid: { left: 120, right: 30, top: opts.title ? 50 : 20, bottom: 40 },
      xAxis: {
        type: 'time',
        min: opts.xMin || undefined,
        max: opts.xMax || undefined,
        splitLine: { show: true, lineStyle: { type: 'dashed', color: t.surfaceAlt } }
      },
      yAxis: {
        type: 'category',
        data: machines,
        inverse: true,
        axisLabel: { fontSize: 11, width: 100, overflow: 'truncate' }
      },
      series: [{
        type: 'custom',
        renderItem: function(params, api){
          var yIdx    = api.value(0);
          var start   = api.coord([api.value(1), yIdx]);
          var end     = api.coord([api.value(2), yIdx]);
          var barH    = api.size([0, 1])[1] * 0.6;
          var rectX   = start[0];
          var rectY   = start[1] - barH / 2;
          var rectW   = Math.max(end[0] - start[0], 2);

          var rectShape = echarts.graphic.clipRectByRect(
            { x: rectX, y: rectY, width: rectW, height: barH },
            { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height }
          );
          return rectShape && {
            type: 'rect',
            transition: ['shape'],
            shape: rectShape,
            style: api.style({ fill: api.visual('color') }),
            styleEmphasis: api.styleEmphasis()
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: renderData,
        clip: true
      }],
      animation: true
    };
  },

  /* ── Heatmap: calendar/matrix with color scale ─────── */
  _optHeatmap: function(opts){
    var t = this.theme();
    var xLabels = opts.xLabels || [];
    var yLabels = opts.yLabels || [];
    var data    = opts.data || []; // [[xIdx, yIdx, value], ...]

    // Color range: grey -> green -> yellow -> red
    var colorStops = opts.colorStops || [
      { offset: 0,   color: t.surfaceAlt },
      { offset: 0.3, color: t.success },
      { offset: 0.6, color: t.warning },
      { offset: 1,   color: t.danger }
    ];

    var minVal = opts.min != null ? opts.min : 0;
    var maxVal = opts.max != null ? opts.max : 100;

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: {
        position: 'top',
        formatter: function(params){
          return (xLabels[params.data[0]] || '') + ' / ' +
            (yLabels[params.data[1]] || '') + ': ' +
            params.data[2] + (opts.unit || '%');
        }
      },
      grid: { left: 80, right: 40, top: opts.title ? 50 : 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: xLabels,
        splitArea: { show: true },
        axisLabel: { fontSize: 10, rotate: opts.xRotate || 0 }
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        splitArea: { show: true },
        axisLabel: { fontSize: 10 }
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: colorStops.map(function(s){ return s.color; })
        },
        textStyle: { color: t.textMuted, fontSize: 10 }
      },
      series: [{
        type: 'heatmap',
        data: data,
        label: { show: opts.showLabel !== false, fontSize: 10, color: t.text },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' }
        }
      }],
      animation: true
    };
  },

  /* ── Gauge: circular gauge with color zones ────────── */
  _optGauge: function(opts){
    var t = this.theme();
    var value = opts.value != null ? opts.value : 0;
    var maxVal = opts.max != null ? opts.max : 100;

    // Default zones: red(0-40), yellow(40-70), green(70-90), blue(90-100)
    var zones = opts.zones || [
      [0.4,  t.danger],
      [0.7,  t.warning],
      [0.9,  t.success],
      [1.0,  t.info]
    ];

    return {
      title: opts.title ? { text: opts.title, left: 'center', top: 'bottom', textStyle: { fontSize: 12 } } : undefined,
      series: [{
        type: 'gauge',
        min: opts.min || 0,
        max: maxVal,
        progress: { show: true, width: 14 },
        axisLine: {
          lineStyle: {
            width: 14,
            color: zones
          }
        },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { width: 2, color: t.textMuted } },
        axisLabel: { distance: 20, color: t.textMuted, fontSize: 10 },
        pointer: { itemStyle: { color: 'auto' }, width: 5, length: '60%' },
        anchor: { show: true, size: 12, itemStyle: { borderWidth: 2, borderColor: t.border } },
        detail: {
          valueAnimation: true,
          formatter: function(v){ return v + (opts.unit || '%'); },
          fontSize: 20,
          fontWeight: 700,
          color: 'auto',
          offsetCenter: [0, '70%']
        },
        data: [{ value: value, name: opts.label || '' }]
      }],
      animation: true
    };
  },

  /* ── Donut: donut/pie chart ────────────────────────── */
  _optDonut: function(opts){
    var data = opts.data || [];

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: opts.radius || ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: { borderRadius: 4, borderColor: this.theme().surface, borderWidth: 2 },
        label: opts.showLabel !== false ? {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 11
        } : { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' }
        },
        data: data
      }],
      animation: true
    };
  },

  /* ── Bar: horizontal/vertical bar chart ────────────── */
  _optBar: function(opts){
    var t = this.theme();
    var horizontal = opts.horizontal === true;
    var categories = opts.categories || [];
    var seriesArr  = opts.series || [{ name: '', data: opts.data || [] }];

    var echartsSeriesArr = seriesArr.map(function(s, i){
      return {
        name: s.name || '',
        type: 'bar',
        data: s.data || [],
        barMaxWidth: opts.barMaxWidth || 32,
        itemStyle: { borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        stack: opts.stack ? 'total' : undefined,
        label: opts.showLabel ? { show: true, position: horizontal ? 'right' : 'top', fontSize: 10 } : undefined
      };
    });

    var catAxis = { type: 'category', data: categories };
    var valAxis = { type: 'value', name: opts.yAxisName || '' };

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: seriesArr.length > 1 ? { bottom: 0 } : undefined,
      grid: {
        left: horizontal ? 100 : 50,
        right: 30,
        top: opts.title ? 50 : 20,
        bottom: seriesArr.length > 1 ? 50 : 30,
        containLabel: false
      },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: echartsSeriesArr,
      animation: true
    };
  },

  /* ── Scatter: scatter plot + optional regression ───── */
  _optScatter: function(opts){
    var t = this.theme();
    var series = [{
      name: opts.seriesName || _t('Du lieu', 'Data'),
      type: 'scatter',
      data: opts.data || [],
      symbolSize: opts.symbolSize || 8,
      itemStyle: { opacity: 0.7 }
    }];

    // Optional regression line
    if(opts.regression && opts.regression.length){
      series.push({
        name: _t('Hoi quy', 'Regression'),
        type: 'line',
        data: opts.regression,
        smooth: false,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed', color: t.danger },
        silent: true
      });
    }

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'item',
        formatter: function(params){
          if(!params.data) return '';
          return params.seriesName + '<br/>' + params.data[0] + ', ' + params.data[1];
        }
      },
      legend: series.length > 1 ? { bottom: 0 } : undefined,
      grid: { left: 60, right: 30, top: opts.title ? 50 : 20, bottom: series.length > 1 ? 50 : 30 },
      xAxis: { type: 'value', name: opts.xAxisName || '', scale: true },
      yAxis: { type: 'value', name: opts.yAxisName || '', scale: true },
      series: series,
      animation: true
    };
  },

  /* ── Radar: radar/spider chart ─────────────────────── */
  _optRadar: function(opts){
    var t = this.theme();
    var indicators = opts.indicators || [];
    var seriesData = opts.series || [{ name: '', data: opts.data || [] }];

    return {
      title: opts.title ? { text: opts.title, left: 'center' } : undefined,
      tooltip: { trigger: 'item' },
      legend: seriesData.length > 1 ? { bottom: 0 } : undefined,
      radar: {
        indicator: indicators.map(function(ind){
          if(typeof ind === 'string') return { name: ind, max: opts.max || 100 };
          return { name: ind.name, max: ind.max || opts.max || 100 };
        }),
        shape: opts.shape || 'polygon',
        splitNumber: 5,
        axisName: { color: t.textMuted, fontSize: 11 },
        splitArea: { areaStyle: { color: ['transparent', t.surfaceAlt] } },
        splitLine: { lineStyle: { color: t.border } },
        axisLine: { lineStyle: { color: t.border } }
      },
      series: [{
        type: 'radar',
        data: seriesData.map(function(s, i){
          return {
            name: s.name || '',
            value: s.data || s.value || [],
            areaStyle: { opacity: 0.15 },
            lineStyle: { width: 2 },
            symbol: 'circle',
            symbolSize: 5
          };
        })
      }],
      animation: true
    };
  },

  /* ── resize: resize all active chart instances ─────── */
  resize: function(){
    this._instances.forEach(function(inst){
      if(inst.chart && typeof inst.chart.resize === 'function'){
        try{ inst.chart.resize(); } catch(e){}
      }
    });
  },

  /* ── dispose: cleanup chart instance ───────────────── */
  dispose: function(container){
    if(!container) return;
    var remaining = [];
    this._instances.forEach(function(inst){
      if(inst.container === container){
        if(inst.chart && typeof inst.chart.dispose === 'function'){
          try{ inst.chart.dispose(); } catch(e){}
        }
      } else {
        remaining.push(inst);
      }
    });
    this._instances = remaining;
  },

  /* ── updateAllThemes: re-apply theme (dark mode toggle) */
  updateAllThemes: function(){
    // Re-register theme with current CSS values
    this._themeCache = null;
    if(typeof echarts !== 'undefined'){
      echarts.registerTheme('hesem', this._echartsTheme());
      this._themeRegistered = true;
    }

    // Recreate each chart with current options
    var self = this;
    var snapshot = this._instances.slice();
    snapshot.forEach(function(inst){
      if(inst.chart && typeof inst.chart.getOption === 'function'){
        var currentOpt;
        try{ currentOpt = inst.chart.getOption(); } catch(e){ return; }

        try{ inst.chart.dispose(); } catch(e){}

        if(typeof echarts !== 'undefined'){
          var newChart = echarts.init(inst.container, 'hesem', { renderer: 'canvas' });
          newChart.setOption(currentOpt);
          inst.chart = newChart;
        }
      }
    });
  },

  /* ── disposeAll: cleanup all instances ──────────────── */
  disposeAll: function(){
    this._instances.forEach(function(inst){
      if(inst.chart && typeof inst.chart.dispose === 'function'){
        try{ inst.chart.dispose(); } catch(e){}
      }
    });
    this._instances = [];
  },

  /* ── Fallback SVG renderer (when ECharts CDN fails) ── */
  _createFallback: function(container, type, options){
    container.innerHTML = '';

    // Info banner
    var banner = document.createElement('div');
    banner.style.cssText = 'padding:8px 12px;background:var(--amber-bg,rgba(217,119,6,0.08));color:var(--amber,#d97706);font-size:11px;font-weight:600;border-radius:6px;margin-bottom:8px;text-align:center;';
    banner.textContent = _t('Dang dung che do bieu do don gian', 'Using simplified chart mode');
    container.appendChild(banner);

    switch(type){
      case 'bar':        return this._fallbackBar(container, options);
      case 'donut':      return this._fallbackDonut(container, options);
      case 'gauge':      return this._fallbackGauge(container, options);
      case 'timeseries': return this._fallbackLine(container, options);
      case 'spc':        return this._fallbackLine(container, options);
      default:           return this._fallbackPlaceholder(container, type, options);
    }
  },

  _fallbackBar: function(container, opts){
    var data = opts.data || (opts.series && opts.series[0] ? opts.series[0].data : []) || [];
    var categories = opts.categories || data.map(function(d, i){ return i + 1; });
    var maxVal = Math.max.apply(null, data.map(function(v){ return typeof v === 'number' ? v : 0; })) || 1;
    var barH = 180;

    var svg = '<svg width="100%" height="' + (barH + 30) + '" viewBox="0 0 ' + (categories.length * 50 + 20) + ' ' + (barH + 30) + '" xmlns="http://www.w3.org/2000/svg">';
    data.forEach(function(v, i){
      var val = typeof v === 'number' ? v : 0;
      var h = Math.max((val / maxVal) * barH, 2);
      var x = i * 50 + 20;
      var y = barH - h;
      svg += '<rect x="' + x + '" y="' + y + '" width="36" height="' + h + '" rx="3" fill="' + SERIES_PALETTE[i % SERIES_PALETTE.length] + '" opacity="0.85"/>';
      svg += '<text x="' + (x + 18) + '" y="' + (barH + 16) + '" text-anchor="middle" font-size="10" fill="currentColor">' + categories[i] + '</text>';
      svg += '<text x="' + (x + 18) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="9" fill="currentColor">' + val + '</text>';
    });
    svg += '</svg>';

    var div = document.createElement('div');
    div.innerHTML = svg;
    container.appendChild(div);
    return { _fallback: true, dispose: function(){} };
  },

  _fallbackLine: function(container, opts){
    var data = opts.data || [];
    if(!data.length){
      return this._fallbackPlaceholder(container, 'line', opts);
    }
    var w = 400, h = 160, pad = 30;
    var vals = data.map(function(v){ return typeof v === 'number' ? v : (v && v[1] != null ? v[1] : 0); });
    var minV = Math.min.apply(null, vals);
    var maxV = Math.max.apply(null, vals);
    if(maxV === minV) maxV = minV + 1;
    var scaleX = (w - 2 * pad) / Math.max(vals.length - 1, 1);
    var scaleY = (h - 2 * pad) / (maxV - minV);

    var points = vals.map(function(v, i){
      return (pad + i * scaleX) + ',' + (h - pad - (v - minV) * scaleY);
    }).join(' ');

    var svg = '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';
    svg += '<polyline points="' + points + '" fill="none" stroke="' + SERIES_PALETTE[0] + '" stroke-width="2" stroke-linejoin="round"/>';

    // UCL/LCL for SPC
    if(opts.ucl != null){
      var uclY = h - pad - (opts.ucl - minV) * scaleY;
      svg += '<line x1="' + pad + '" y1="' + uclY + '" x2="' + (w - pad) + '" y2="' + uclY + '" stroke="#ef4444" stroke-width="1" stroke-dasharray="4,3"/>';
      svg += '<text x="' + (w - pad + 4) + '" y="' + (uclY + 3) + '" font-size="9" fill="#ef4444">UCL</text>';
    }
    if(opts.lcl != null){
      var lclY = h - pad - (opts.lcl - minV) * scaleY;
      svg += '<line x1="' + pad + '" y1="' + lclY + '" x2="' + (w - pad) + '" y2="' + lclY + '" stroke="#ef4444" stroke-width="1" stroke-dasharray="4,3"/>';
      svg += '<text x="' + (w - pad + 4) + '" y="' + (lclY + 3) + '" font-size="9" fill="#ef4444">LCL</text>';
    }
    if(opts.cl != null){
      var clY = h - pad - (opts.cl - minV) * scaleY;
      svg += '<line x1="' + pad + '" y1="' + clY + '" x2="' + (w - pad) + '" y2="' + clY + '" stroke="#22c55e" stroke-width="1"/>';
      svg += '<text x="' + (w - pad + 4) + '" y="' + (clY + 3) + '" font-size="9" fill="#22c55e">CL</text>';
    }

    svg += '</svg>';

    var div = document.createElement('div');
    div.innerHTML = svg;
    container.appendChild(div);
    return { _fallback: true, dispose: function(){} };
  },

  _fallbackDonut: function(container, opts){
    var data = opts.data || [];
    var total = data.reduce(function(s, d){ return s + (d.value || 0); }, 0) || 1;
    var r = 60, cx = 80, cy = 80, inner = 35;
    var svg = '<svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">';

    var angle = -Math.PI / 2;
    data.forEach(function(d, i){
      var slice = (d.value / total) * Math.PI * 2;
      var x1 = cx + r * Math.cos(angle);
      var y1 = cy + r * Math.sin(angle);
      var x2 = cx + r * Math.cos(angle + slice);
      var y2 = cy + r * Math.sin(angle + slice);
      var ix1 = cx + inner * Math.cos(angle + slice);
      var iy1 = cy + inner * Math.sin(angle + slice);
      var ix2 = cx + inner * Math.cos(angle);
      var iy2 = cy + inner * Math.sin(angle);
      var large = slice > Math.PI ? 1 : 0;
      var path = 'M' + x1 + ',' + y1 +
        ' A' + r + ',' + r + ' 0 ' + large + ',1 ' + x2 + ',' + y2 +
        ' L' + ix1 + ',' + iy1 +
        ' A' + inner + ',' + inner + ' 0 ' + large + ',0 ' + ix2 + ',' + iy2 + ' Z';
      svg += '<path d="' + path + '" fill="' + SERIES_PALETTE[i % SERIES_PALETTE.length] + '" opacity="0.85"/>';
      angle += slice;
    });
    svg += '</svg>';

    var div = document.createElement('div');
    div.innerHTML = svg;
    container.appendChild(div);
    return { _fallback: true, dispose: function(){} };
  },

  _fallbackGauge: function(container, opts){
    var value = opts.value != null ? opts.value : 0;
    var maxVal = opts.max || 100;
    var pct = Math.min(value / maxVal, 1);
    var r = 60, cx = 80, cy = 80;
    var startAngle = Math.PI * 0.75;
    var sweep = Math.PI * 1.5;
    var endAngle = startAngle + sweep * pct;

    var svg = '<svg width="160" height="140" viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">';
    // Background arc
    var bgEndAngle = startAngle + sweep;
    svg += '<path d="M' + (cx + r * Math.cos(startAngle)) + ',' + (cy + r * Math.sin(startAngle)) +
      ' A' + r + ',' + r + ' 0 1,1 ' + (cx + r * Math.cos(bgEndAngle)) + ',' + (cy + r * Math.sin(bgEndAngle)) + '"' +
      ' fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round"/>';
    // Value arc
    var large = (sweep * pct) > Math.PI ? 1 : 0;
    var color = pct < 0.4 ? '#ef4444' : pct < 0.7 ? '#f59e0b' : '#22c55e';
    svg += '<path d="M' + (cx + r * Math.cos(startAngle)) + ',' + (cy + r * Math.sin(startAngle)) +
      ' A' + r + ',' + r + ' 0 ' + large + ',1 ' + (cx + r * Math.cos(endAngle)) + ',' + (cy + r * Math.sin(endAngle)) + '"' +
      ' fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round"/>';
    // Value text
    svg += '<text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" font-size="20" font-weight="700" fill="' + color + '">' + value + (opts.unit || '%') + '</text>';
    if(opts.label){
      svg += '<text x="' + cx + '" y="' + (cy + 28) + '" text-anchor="middle" font-size="10" fill="currentColor">' + opts.label + '</text>';
    }
    svg += '</svg>';

    var div = document.createElement('div');
    div.innerHTML = svg;
    container.appendChild(div);
    return { _fallback: true, dispose: function(){} };
  },

  _fallbackPlaceholder: function(container, type, opts){
    var div = document.createElement('div');
    div.style.cssText = 'padding:24px;text-align:center;color:var(--text-secondary,#64748b);font-size:12px;border:1px dashed var(--border,#e2e8f0);border-radius:8px;';
    div.innerHTML = '<div style="font-size:24px;margin-bottom:8px">📊</div>' +
      _t('Bieu do "' + type + '" can ECharts de hien thi day du.', 'Chart type "' + type + '" requires ECharts for full display.') +
      '<br/><span style="font-size:11px;opacity:0.7">' +
      _t('Tai lai trang de thu ket noi CDN.', 'Reload to retry CDN connection.') + '</span>';
    container.appendChild(div);
    return { _fallback: true, dispose: function(){} };
  }
};

/* ── Global event listeners ──────────────────────────── */
var resizeTimer;
window.addEventListener('resize', function(){
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function(){ HmChart.resize(); }, 150);
});

document.documentElement.addEventListener('theme-changed', function(){
  HmChart.updateAllThemes();
});

})();
