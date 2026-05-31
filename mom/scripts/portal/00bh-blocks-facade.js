/* ════════════════════════════════════════════════════════════════════════════
 * Blocks Facade — unified render dispatch (Lego-SSOT strangler seam)
 *
 * window.Blocks.render(type, payload, ctx) is the SINGLE entry point for
 * rendering any block, regardless of which system owns it. It dispatches:
 *
 *   1. L3 BlockKit (window.BlockKit) — curated, class-only, registry-governed
 *      blocks (toolbar.filtered, panel.standard, kpi.grid, …). PREFERRED.
 *   2. Legacy Block Engine (window.HmBlockEngine.renderBlock) — the ~196-type
 *      config-driven catalog (BLOCK_CATALOG). FALLBACK while blocks migrate
 *      up to the L3 class-only layer.
 *
 * This is the strangler seam in the Lego stack (L1 token → L2 o3-* component →
 * L3 block → L4 archetype): callers depend on ONE API, and a block can move
 * from the Engine to L3 one at a time without touching any call site — when a
 * published L3 renderer appears for a key, the facade routes through it
 * automatically; until then the Engine serves it.
 *
 * Discovery (list/has/meta/source) is a READ-ONLY union of the two systems.
 * The facade NEVER mutates either registry, so the curated 00bc L3 registry
 * and its CI gate stay pristine — no legacy types are injected into it.
 *
 * Load AFTER 00bd-blockkit.js and 00-block-engine.js (it resolves both lazily
 * at call time, so strict ordering only matters before the first render).
 * ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function bk() { return (typeof global !== 'undefined') ? global.BlockKit : null; }
  function be() { return (typeof global !== 'undefined') ? global.HmBlockEngine : null; }

  /* A type is owned by L3 only when it is a PUBLISHED BlockKit block with a
     renderer — draft/legacy registry rows do not capture the dispatch. */
  function bkPublished(type) {
    var k = bk();
    if (!k || typeof k.get !== 'function') return false;
    var b = k.get(type);
    return !!(b && b.status === 'published');
  }

  function engineCatalog() {
    var e = be();
    return (e && e.BLOCK_CATALOG) ? e.BLOCK_CATALOG : null;
  }

  var Blocks = {
    version: '1.0.0',

    /* Which system renders this type: 'blockkit' | 'engine' | null. */
    source: function (type) {
      if (bkPublished(type)) return 'blockkit';
      var cat = engineCatalog();
      if (cat && cat[type]) return 'engine';
      return null;
    },

    has: function (type) { return Blocks.source(type) !== null; },

    /* Render a block to an HTML string.
       - For L3 blocks, `payload` is the BlockKit slots object.
       - For Engine blocks, `payload` is the block config (or {config,data,blockId}).
       Returns an HTML string; never throws (errors become an HTML comment). */
    render: function (type, payload, ctx) {
      payload = payload || {};
      if (bkPublished(type)) {
        try { return bk().render(type, payload); }
        catch (e) { return '<!-- Blocks(blockkit) ' + type + ': ' + (e && e.message) + ' -->'; }
      }
      var engine = be();
      if (engine && typeof engine.renderBlock === 'function') {
        var block = {
          type: type,
          config: (payload && payload.config) ? payload.config : (payload || {})
        };
        if (payload && payload.blockId) block.blockId = payload.blockId;
        if (payload && payload.title) block.title = payload.title;
        var data = (payload && payload.data) ? payload.data : {};
        var state = (ctx && ctx.state) ? ctx.state : {};
        try { return engine.renderBlock(block, data, state); }
        catch (e) { return '<!-- Blocks(engine) ' + type + ': ' + (e && e.message) + ' -->'; }
      }
      return '<!-- Blocks: no renderer for "' + type + '" -->';
    },

    /* Render directly into a DOM element. */
    mount: function (el, type, payload, ctx) {
      if (!el) return;
      el.innerHTML = Blocks.render(type, payload, ctx);
    },

    /* Read-only union of L3 published keys + Engine catalog types. */
    list: function () {
      var out = [], seen = {};
      var k = bk();
      if (k && typeof k.list === 'function') {
        k.list().forEach(function (key) { if (!seen[key]) { seen[key] = 1; out.push(key); } });
      }
      var cat = engineCatalog();
      if (cat) {
        Object.keys(cat).forEach(function (key) { if (!seen[key]) { seen[key] = 1; out.push(key); } });
      }
      return out;
    },

    /* Normalized metadata for a type, from whichever system owns it. */
    meta: function (type) {
      if (bkPublished(type)) {
        var b = bk().get(type);
        return {
          key: type, source: 'blockkit', category: b.category || null,
          display: { en: b.display_name_en || type, vi: b.display_name_vi || type },
          slots: b.slots || null
        };
      }
      var cat = engineCatalog();
      if (cat && cat[type]) {
        var c = cat[type];
        return {
          key: type, source: 'engine', category: c.category || null,
          display: { en: c.labelEn || c.label || type, vi: c.label || c.labelEn || type },
          icon: c.icon || null, renderer: c.renderer || type
        };
      }
      return null;
    },

    /* Coverage snapshot — how far the strangler migration has progressed. */
    coverage: function () {
      var k = bk(), cat = engineCatalog();
      var l3 = (k && typeof k.list === 'function') ? k.list().length : 0;
      var engine = cat ? Object.keys(cat).length : 0;
      return { blockkitPublished: l3, engineCatalog: engine, total: Blocks.list().length };
    }
  };

  if (typeof global !== 'undefined') global.Blocks = Blocks;
})(typeof window !== 'undefined' ? window : this);
