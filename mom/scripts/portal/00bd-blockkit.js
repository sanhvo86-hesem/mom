/* ════════════════════════════════════════════════════════════════════════════
 * BlockKit — L3 Block Registry renderer (Lego-SSOT)
 *
 * window.BlockKit.render(blockKey, slots) → HTML string assembled from
 * orders-v3 component classes (L2) and filled with caller-supplied slot data.
 *
 *   const html = BlockKit.render('toolbar.filtered', {
 *     title: 'Đơn hàng',
 *     filters: [{label:'Tất cả', active:true}, {label:'Chờ duyệt'}],
 *     search: 'Tìm đơn…',
 *     actions: [{label:'Tạo mới', variant:'primary'}]
 *   });
 *
 * Rules enforced at render time:
 *   - Only PUBLISHED blocks render. Unknown / draft block → console.error +
 *     a visible .o3-empty fallback (never silent, never raw HTML injection).
 *   - Output uses ONLY the block's composed_of classes — no inline colour/px
 *     literals (so the no-hardcode CI gate stays green).
 *   - All caller text is HTML-escaped. Slot data is data, not markup, except
 *     the explicit `html` slot types (body) which the caller owns.
 *
 * The registry JSON is the runtime SSOT; this renderer is a pure function over
 * it. Sibling of ControlKit (admin edit widgets) — BlockKit builds real module
 * surfaces. Load AFTER 00bb-graphics-authority.js.
 * ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var REGISTRY = null;          // loaded block registry (lazy)
  var REGISTRY_URL = './data/config/graphics-block-registry.json';

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fallback(msg) {
    // Visible, accessible failure — never silent, never inject caller HTML.
    return '<div class="o3-empty" role="status">'
      + '<div class="o3-empty__icon">⚠️</div>'
      + '<div class="o3-empty__title">' + esc(msg) + '</div>'
      + '<div class="o3-empty__hint">BlockKit: kiểm tra block_key + trạng thái published trong graphics-block-registry.json</div>'
      + '</div>';
  }

  /* ── registry access ─────────────────────────────────────────────────────── */
  var BlockKit = {
    /** Load + cache the registry. Returns a Promise<registry>. */
    load: function (force) {
      if (REGISTRY && !force) return Promise.resolve(REGISTRY);
      return fetch(REGISTRY_URL, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (json) { REGISTRY = json; return json; });
    },
    /** Synchronous lookup (registry must already be loaded). */
    get: function (blockKey) {
      if (!REGISTRY || !Array.isArray(REGISTRY.blocks)) return null;
      for (var i = 0; i < REGISTRY.blocks.length; i++) {
        if (REGISTRY.blocks[i].block_key === blockKey) return REGISTRY.blocks[i];
      }
      return null;
    },
    /** List published block keys (for discovery / Module Sample). */
    list: function (category) {
      if (!REGISTRY || !Array.isArray(REGISTRY.blocks)) return [];
      return REGISTRY.blocks
        .filter(function (b) { return b.status === 'published' && (!category || b.category === category); })
        .map(function (b) { return b.block_key; });
    },

    /** Render a block to an HTML string. Pure over (registry, slots). */
    render: function (blockKey, slots) {
      slots = slots || {};
      var b = BlockKit.get(blockKey);
      if (!b) return fallback('Block không tồn tại: ' + blockKey);
      if (b.status !== 'published') return fallback('Block chưa published: ' + blockKey);
      var fn = RENDERERS[blockKey];
      if (!fn) return fallback('Block chưa có renderer: ' + blockKey);
      try {
        return fn(slots, b);
      } catch (e) {
        return fallback('Lỗi render block ' + blockKey + ': ' + (e && e.message));
      }
    },

    /** Convenience: render directly into a DOM element. */
    mount: function (el, blockKey, slots) {
      if (!el) return;
      el.innerHTML = BlockKit.render(blockKey, slots);
    }
  };

  /* ── per-block renderers (token-bound, class-only, escaped) ────────────────── */
  var RENDERERS = {
    'toolbar.filtered': function (s) {
      var parts = ['<div class="o3-toolbar" role="toolbar">'];
      if (s.title) parts.push('<span class="o3-toolbar__title">' + esc(s.title) + '</span>');
      if (Array.isArray(s.filters) && s.filters.length) {
        parts.push('<div class="o3-toolbar__chips">');
        s.filters.forEach(function (f) {
          var cls = 'o3-chip o3-chip--button' + (f.active ? ' o3-chip--active' : '');
          parts.push('<button type="button" class="' + cls + '">' + esc(f.label) + '</button>');
        });
        parts.push('</div>');
      }
      parts.push('<span class="o3-toolbar__spacer"></span>');
      if (s.search) {
        var ph = (typeof s.search === 'string') ? s.search : 'Tìm…';
        parts.push('<input type="search" class="o3-toolbar__search" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '">');
      }
      if (Array.isArray(s.actions)) {
        s.actions.forEach(function (a) {
          var v = a.variant ? (' o3-btn--' + esc(a.variant)) : '';
          parts.push('<button type="button" class="o3-btn' + v + '">' + esc(a.label) + '</button>');
        });
      }
      parts.push('</div>');
      return parts.join('');
    },

    'panel.standard': function (s) {
      var parts = ['<section class="o3-panel" role="region"' + (s.title ? ' aria-label="' + esc(s.title) + '"' : '') + '>'];
      parts.push('<header class="o3-panel__head">');
      parts.push('<span class="o3-panel__title">' + esc(s.title) + '</span>');
      if (s.count) parts.push('<span class="o3-panel__count">' + esc(s.count) + '</span>');
      if (Array.isArray(s.actions) && s.actions.length) {
        parts.push('<div class="o3-panel__actions">');
        s.actions.forEach(function (a) {
          var v = a.variant ? (' o3-btn--' + esc(a.variant)) : '';
          parts.push('<button type="button" class="o3-btn' + v + '">' + esc(a.label) + '</button>');
        });
        parts.push('</div>');
      }
      parts.push('</header>');
      var bodyCls = 'o3-panel__body' + (s.flush ? ' o3-panel__body--flush' : '');
      parts.push('<div class="' + bodyCls + '">' + (s.body || '') + '</div>');
      parts.push('</section>');
      return parts.join('');
    },

    'kpi.grid': function (s) {
      var parts = ['<div class="o3-kpi-grid" role="group">'];
      (s.tiles || []).forEach(function (t) {
        var clickable = t.clickable ? ' o3-kpi--clickable' : '';
        var tag = t.clickable ? 'button' : 'div';
        var attrs = t.clickable ? ' type="button"' : '';
        var toneCls = t.tone ? (' o3-kpi__value--' + esc(t.tone)) : '';
        parts.push('<' + tag + attrs + ' class="o3-kpi' + clickable + '">');
        parts.push('<div class="o3-kpi__label">' + esc(t.label) + '</div>');
        parts.push('<div class="o3-kpi__value' + toneCls + '">' + esc(t.value) + '</div>');
        if (t.sub) parts.push('<div class="o3-kpi__sub">' + esc(t.sub) + '</div>');
        parts.push('</' + tag + '>');
      });
      parts.push('</div>');
      return parts.join('');
    },

    'table.data': function (s) {
      var cols = s.columns || [];
      var rows = s.rows || [];
      var parts = ['<div class="o3-table-wrap"><table class="o3-table" role="table"><thead><tr>'];
      cols.forEach(function (c) { parts.push('<th scope="col">' + esc(c) + '</th>'); });
      parts.push('</tr></thead><tbody>');
      rows.forEach(function (row) {
        var cells = row, meta = {};
        if (row && !Array.isArray(row) && row.cells) { cells = row.cells; meta = row; }
        var rc = '';
        if (meta.clickable) rc += ' o3-table__row--clickable';
        if (meta.selected) rc += ' o3-table__row--selected';
        parts.push('<tr' + (rc ? ' class="' + rc.trim() + '"' : '') + '>');
        (cells || []).forEach(function (cell) {
          // cells may be pre-built html (e.g. a chip) — caller owns table cell html
          parts.push('<td>' + (cell == null ? '' : cell) + '</td>');
        });
        parts.push('</tr>');
      });
      parts.push('</tbody></table></div>');
      return parts.join('');
    },

    'empty.state': function (s) {
      var parts = ['<div class="o3-empty" role="status">'];
      if (s.icon) parts.push('<div class="o3-empty__icon">' + esc(s.icon) + '</div>');
      parts.push('<div class="o3-empty__title">' + esc(s.title) + '</div>');
      if (s.hint) parts.push('<div class="o3-empty__hint">' + esc(s.hint) + '</div>');
      parts.push('</div>');
      return parts.join('');
    },

    'shell.workspace': function (s) {
      var parts = ['<div class="o3-shell" role="region"' + (s.title ? ' aria-label="' + esc(s.title) + '"' : '') + '>'];
      parts.push('<div class="o3-shell__topbar">');
      parts.push('<div class="o3-shell__title">' + esc(s.title) + '</div>');
      if (s.subtitle) parts.push('<div class="o3-shell__subtitle">' + esc(s.subtitle) + '</div>');
      parts.push('</div>');
      if (Array.isArray(s.tabs) && s.tabs.length) {
        parts.push('<div class="o3-shell__tabs" role="tablist">');
        s.tabs.forEach(function (t) {
          var active = t.active ? ' o3-shell__tab--active' : '';
          parts.push('<button type="button" role="tab" aria-selected="' + (t.active ? 'true' : 'false') + '" class="o3-shell__tab' + active + '">'
            + esc(t.label)
            + (t.badge ? '<span class="o3-shell__tab-badge">' + esc(t.badge) + '</span>' : '')
            + '</button>');
        });
        parts.push('</div>');
      }
      parts.push('<div class="o3-shell__body">' + (s.body || '') + '</div>');
      parts.push('</div>');
      return parts.join('');
    }
  };

  window.BlockKit = BlockKit;
})();
