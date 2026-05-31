/* ════════════════════════════════════════════════════════════════════════════
 * Blocks L3 Equivalence Map — strangler migration layer (Phase 2.2 Stage 1)
 *
 * Maps a legacy Block-Engine type (dashed key, e.g. `kpi-row`) to a curated L3
 * BlockKit block (dotted key, e.g. `kpi.grid`) plus an ADAPTER that converts the
 * engine block's `config`/`data` into the L3 block's `slots`. When
 * `window.Blocks.preferL3` is ON and a published L3 equivalent exists, the facade
 * renders the engine type through its L3 block instead.
 *
 * DEFAULT OFF (`Blocks.preferL3 = false`): production rendering is byte-identical
 * to before this file. Each block is flipped ON only after a Chrome before/after
 * sign-off (per-block, reversible) — see the Phase 2.2 plan §7.
 *
 * Only FAITHFUL 1:1 pairs live here. Engine types whose L3 counterpart would lose
 * information (e.g. `filter-bar`'s selects/dates vs the simpler `toolbar.filtered`)
 * are intentionally NOT mapped — they wait for a richer L3 block (Stage 3) rather
 * than a lossy adapter.
 *
 * Load AFTER 00bh-blocks-facade.js. Augments window.Blocks; touches no registry.
 * ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var Blocks = global && global.Blocks;
  if (!Blocks || typeof Blocks.render !== 'function') return;

  /* Minimal {vi,en}|string label resolver (mirrors the engine's _textLabel
     without importing it — adapters must be self-contained). */
  function textLabel(label, labelEn) {
    if (label && typeof label === 'object') {
      return label.vi || label.en || labelEn || '';
    }
    return (label != null && label !== '') ? String(label) : (labelEn || '');
  }

  /* ── Adapters: engine (config,data) → L3 slots ─────────────────────────────── */

  /* kpi-row → kpi.grid
     engine: { items:[{label,labelEn,dataKey,default,suffix,color,trend}] } + data{dataKey:val}
     L3:     { tiles:[{label,value,sub?,tone?}] } */
  function adapt_kpiRow(config, data) {
    config = config || {}; data = data || {};
    var tiles = (config.items || []).map(function (it) {
      var raw = (it.dataKey != null && data[it.dataKey] !== undefined)
        ? data[it.dataKey]
        : (it.default != null ? it.default : '');
      var value = String(raw) + (it.suffix || '');
      var tone = (typeof it.trend === 'number')
        ? (it.trend > 0 ? 'success' : (it.trend < 0 ? 'danger' : 'info'))
        : undefined;
      var sub = (typeof it.trend === 'number')
        ? (it.trend > 0 ? '+' : '') + it.trend + '%'
        : undefined;
      return { label: textLabel(it.label, it.labelEn), value: value, sub: sub, tone: tone };
    });
    return { tiles: tiles };
  }

  var EQUIVALENCE = {
    'kpi-row': { l3: 'kpi.grid', adapt: adapt_kpiRow }
    // future faithful pairs flip in here after Chrome sign-off
  };

  /* Per-block opt-in (NOT a global switch) so each block is flipped after its
     own Chrome before/after sign-off. A key set true here renders through its
     L3 equivalent everywhere; absent/false keeps the engine renderer.
     kpi-row → kpi.grid: approved 2026-05-31 (label-on-top, tone-colored values,
     left-aligned o3-kpi). */
  Blocks.l3Enabled = Object.assign({ 'kpi-row': true }, Blocks.l3Enabled || {});
  Blocks._equivalence = EQUIVALENCE;

  function isFlipped(type) {
    return !!(Blocks.l3Enabled && Blocks.l3Enabled[type]
      && EQUIVALENCE[type] && Blocks.source(EQUIVALENCE[type].l3) === 'blockkit');
  }
  Blocks.isFlipped = isFlipped;

  /* List which dashed keys CAN be served by L3 (have a faithful adapter +
     a published L3 block right now). Drives the flip checklist. */
  Blocks.l3Candidates = function () {
    var out = [];
    Object.keys(EQUIVALENCE).forEach(function (k) {
      var e = EQUIVALENCE[k];
      if (Blocks.source(e.l3) === 'blockkit') out.push({ from: k, to: e.l3 });
    });
    return out;
  };

  /* Adapt an engine payload to L3 slots for a flipped type (used by the facade
     wrap below AND by the engine's per-block dispatch hook in
     00-block-engine.js, which is what makes the flip take effect in real
     modules — they render through the engine, not through window.Blocks). */
  Blocks.renderL3 = function (type, config, data) {
    var e = EQUIVALENCE[type];
    if (!e || Blocks.source(e.l3) !== 'blockkit') return null;
    try { return global.BlockKit.render(e.l3, e.adapt(config || {}, data || {})); }
    catch (err) { return null; } // caller falls back to the engine renderer
  };

  /* Wrap the facade render too, for callers that use window.Blocks directly. */
  var baseRender = Blocks.render.bind(Blocks);
  Blocks.render = function (type, payload, ctx) {
    if (isFlipped(type)) {
      var config = (payload && payload.config) ? payload.config : (payload || {});
      var data = (payload && payload.data) ? payload.data : {};
      var out = Blocks.renderL3(type, config, data);
      if (out != null) return out;
    }
    return baseRender(type, payload, ctx);
  };

  /* expose the adapter table for tests */
  Blocks._adapters = { 'kpi-row': adapt_kpiRow };
})(typeof window !== 'undefined' ? window : this);
