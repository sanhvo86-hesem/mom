/* ════════════════════════════════════════════════════════════════════════
 * Orders v3 — Component library
 *
 * Pure functions: `function Component(props) → { html, bind?, mount? }`
 * - html: string to insert into the DOM
 * - bind(root): wire event handlers; returns teardown fn
 * - mount(parentEl): convenience that does insert + bind in one call
 *
 * Components rely ONLY on tokens + i18n + fmt + esc from window.OrdersV3.
 * Zero hex literals. Zero inline magic numbers.
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var O3 = window.OrdersV3 = window.OrdersV3 || {};
  var esc = function(s){ return O3.fmt ? O3.fmt.esc(s) : String(s||''); };
  var t   = function(vi, en){ return O3.i18n ? O3.i18n.t(vi, en) : (vi || en || ''); };

  /* ── KpiTile ───────────────────────────────────────────────────────
   * props = { label, value, tone?: 'brand'|'success'|'warning'|'danger'|'info', sub?, onClick? }
   * ────────────────────────────────────────────────────────────────── */
  function KpiTile(props){
    props = props || {};
    var toneClass = props.tone ? ' o3-kpi__value--' + props.tone : '';
    var clickable = typeof props.onClick === 'function';
    var clickClass = clickable ? ' o3-kpi--clickable' : '';
    var html =
      '<div class="o3-kpi' + clickClass + '" '
        + (clickable ? 'role="button" tabindex="0"' : '')
        + ' data-o3="kpi">'
      +   '<div class="o3-kpi__label">' + esc(props.label || '') + '</div>'
      +   '<div class="o3-kpi__value' + toneClass + '">' + esc(props.value != null ? props.value : '0') + '</div>'
      +   (props.sub ? '<div class="o3-kpi__sub">' + esc(props.sub) + '</div>' : '')
      + '</div>';
    function bind(root){
      if (!clickable) return function(){};
      var el = root.querySelector('[data-o3="kpi"]');
      if (!el) return function(){};
      var handler = function(e){
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        props.onClick();
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', handler);
      return function(){
        el.removeEventListener('click', handler);
        el.removeEventListener('keydown', handler);
      };
    }
    return { html: html, bind: bind };
  }

  /* ── KpiGrid ───────────────────────────────────────────────────────
   * props = { tiles: KpiTile[] }   — auto-fit grid wrapper
   * ────────────────────────────────────────────────────────────────── */
  function KpiGrid(props){
    var tiles = (props && props.tiles) || [];
    var html = '<div class="o3-kpi-grid">' + tiles.map(function(t){ return t.html; }).join('') + '</div>';
    function bind(root){
      var teardowns = tiles.map(function(t){
        return t.bind ? t.bind(root) : function(){};
      });
      return function(){ teardowns.forEach(function(t){ t(); }); };
    }
    return { html: html, bind: bind };
  }

  /* ── Panel ─────────────────────────────────────────────────────────
   * props = { title, count?, actions?: HTML-array, body: HTML, flush?: bool }
   * ────────────────────────────────────────────────────────────────── */
  function Panel(props){
    props = props || {};
    var actionsHtml = (props.actions && props.actions.length)
      ? '<div class="o3-panel__actions">' + props.actions.join('') + '</div>'
      : '';
    var countHtml = (props.count !== undefined && props.count !== null)
      ? '<span class="o3-panel__count">' + esc(String(props.count)) + '</span>'
      : '';
    var bodyClass = props.flush ? 'o3-panel__body o3-panel__body--flush' : 'o3-panel__body';
    var html =
      '<section class="o3-panel">'
      +   '<header class="o3-panel__head">'
      +     '<h3 class="o3-panel__title">' + esc(props.title || '') + countHtml + '</h3>'
      +     actionsHtml
      +   '</header>'
      +   '<div class="' + bodyClass + '">' + (props.body || '') + '</div>'
      + '</section>';
    return { html: html };
  }

  /* ── Chip / Badge ──────────────────────────────────────────────────
   * Chip is the multi-purpose pill (status, filter, source).
   * props = { label, tone?, icon?, active?, onClick? }
   * ────────────────────────────────────────────────────────────────── */
  function Chip(props){
    props = props || {};
    var toneClass = props.tone ? ' o3-chip--' + props.tone : '';
    var activeClass = props.active ? ' o3-chip--active' : '';
    var btnClass = typeof props.onClick === 'function' ? ' o3-chip--button' : '';
    var iconHtml = props.icon ? esc(props.icon) + ' ' : '';
    return {
      html: '<span class="o3-chip' + toneClass + activeClass + btnClass + '" data-o3-chip="' + esc(props.value || '') + '">'
              + iconHtml + esc(props.label || '')
            + '</span>',
      bind: function(root){
        if (typeof props.onClick !== 'function') return function(){};
        var el = root.querySelector('[data-o3-chip="' + esc(props.value || '') + '"]');
        if (!el) return function(){};
        var handler = function(){ props.onClick(props.value); };
        el.addEventListener('click', handler);
        return function(){ el.removeEventListener('click', handler); };
      }
    };
  }

  /* ── SourceChip — semantic helper for AEOI vs manual ─────────────── */
  function SourceChip(source){
    var isAi = source === 'ai_order_intake' || source === 'AEOI';
    return Chip({
      label: isAi ? t('AI Intake', 'AI Intake') : t('Thủ công','Manual'),
      icon:  isAi ? '🤖' : '👤',
      tone:  isAi ? 'info' : 'neutral'
    });
  }

  /* ── Button ────────────────────────────────────────────────────────
   * props = { label, variant?: 'primary'|'success'|'danger'|'ghost', size?: 'sm', icon?, onClick, disabled? }
   * ────────────────────────────────────────────────────────────────── */
  var _btnSeq = 0;
  function Button(props){
    props = props || {};
    var id = 'o3btn-' + (++_btnSeq);
    var classes = 'o3-btn';
    if (props.variant) classes += ' o3-btn--' + props.variant;
    if (props.size)    classes += ' o3-btn--' + props.size;
    var disabled = props.disabled ? ' disabled' : '';
    var iconHtml = props.icon ? '<span aria-hidden="true">' + esc(props.icon) + '</span>' : '';
    return {
      html: '<button type="button" id="' + id + '" class="' + classes + '"' + disabled + '>'
              + iconHtml + esc(props.label || '')
            + '</button>',
      bind: function(root){
        var el = root.querySelector('#' + id);
        if (!el || typeof props.onClick !== 'function') return function(){};
        var handler = function(e){ e.preventDefault(); props.onClick(e); };
        el.addEventListener('click', handler);
        return function(){ el.removeEventListener('click', handler); };
      }
    };
  }

  /* ── Toolbar ───────────────────────────────────────────────────────
   * props = {
   *   chips: [{ label, value, active }],
   *   onChipClick(value),
   *   search?: { placeholder, value, onInput(value) },
   *   rightActions?: Button[]
   * }
   * ────────────────────────────────────────────────────────────────── */
  var _tbSeq = 0;
  function Toolbar(props){
    props = props || {};
    var id = 'o3tb-' + (++_tbSeq);
    var chipsHtml = (props.chips || []).map(function(c){
      var activeClass = c.active ? ' o3-chip--active' : '';
      return '<button type="button" class="o3-chip o3-chip--button' + activeClass + '" data-o3-chip-val="' + esc(c.value) + '">' + esc(c.label) + '</button>';
    }).join('');

    var searchHtml = '';
    if (props.search) {
      searchHtml =
        '<div class="o3-toolbar__search">'
        +   '<span aria-hidden="true">🔍</span>'
        +   '<input type="search" data-o3-search="' + id + '" placeholder="'
        +     esc(props.search.placeholder || t('Tìm kiếm…','Search…'))
        +     '" value="' + esc(props.search.value || '') + '">'
        + '</div>';
    }

    var rightHtml = (props.rightActions || []).map(function(b){ return b.html; }).join('');

    var html =
      '<div class="o3-toolbar" id="' + id + '">'
      +   '<div class="o3-toolbar__chips">' + chipsHtml + '</div>'
      +   '<div class="o3-toolbar__spacer"></div>'
      +   searchHtml
      +   rightHtml
      + '</div>';

    function bind(root){
      var teardowns = [];
      var tb = root.querySelector('#' + id);
      if (!tb) return function(){};

      if (typeof props.onChipClick === 'function') {
        Array.prototype.forEach.call(tb.querySelectorAll('[data-o3-chip-val]'), function(el){
          var v = el.getAttribute('data-o3-chip-val');
          var h = function(){ props.onChipClick(v); };
          el.addEventListener('click', h);
          teardowns.push(function(){ el.removeEventListener('click', h); });
        });
      }

      if (props.search && typeof props.search.onInput === 'function') {
        var input = tb.querySelector('[data-o3-search="' + id + '"]');
        if (input) {
          var debounceTimer = null;
          var h = function(e){
            if (debounceTimer) clearTimeout(debounceTimer);
            var v = e.target.value;
            debounceTimer = setTimeout(function(){ props.search.onInput(v); }, 200);
          };
          input.addEventListener('input', h);
          teardowns.push(function(){
            if (debounceTimer) clearTimeout(debounceTimer);
            input.removeEventListener('input', h);
          });
        }
      }

      (props.rightActions || []).forEach(function(b){
        if (b.bind) teardowns.push(b.bind(root));
      });

      return function(){ teardowns.forEach(function(t){ t(); }); };
    }

    return { html: html, bind: bind };
  }

  /* ── Table ─────────────────────────────────────────────────────────
   * props = {
   *   columns: [{ key, label, align?, width?, render?(row, idx) }],
   *   rows: object[],
   *   getRowId?(row): string,
   *   onRowClick?(row),
   *   selectedRowId?,
   *   emptyState?: { icon, title, hint }
   * }
   * ────────────────────────────────────────────────────────────────── */
  var _tblSeq = 0;
  function Table(props){
    props = props || {};
    var id = 'o3tbl-' + (++_tblSeq);
    var cols = props.columns || [];
    var rows = props.rows || [];
    var getId = props.getRowId || function(r, idx){ return r.id || r._id || String(idx); };
    var selId = props.selectedRowId;

    var headHtml = '<tr>' + cols.map(function(c){
      var styles = [];
      if (c.width) styles.push('width:' + c.width);
      if (c.align) styles.push('text-align:' + c.align);
      var styleAttr = styles.length ? ' style="' + styles.join(';') + '"' : '';
      return '<th' + styleAttr + '>' + esc(c.label || '') + '</th>';
    }).join('') + '</tr>';

    var bodyHtml;
    if (!rows.length) {
      var empty = props.emptyState || { icon: '📭', title: t('Không có dữ liệu','No data') };
      bodyHtml = '<tr><td colspan="' + cols.length + '">'
        + '<div class="o3-empty">'
        +   '<div class="o3-empty__icon" aria-hidden="true">' + esc(empty.icon || '📭') + '</div>'
        +   '<div class="o3-empty__title">' + esc(empty.title || '') + '</div>'
        +   (empty.hint ? '<div class="o3-empty__hint">' + esc(empty.hint) + '</div>' : '')
        + '</div></td></tr>';
    } else {
      bodyHtml = rows.map(function(row, idx){
        var rid = getId(row, idx);
        var rowClass = 'o3-table__row';
        if (props.onRowClick) rowClass += ' o3-table__row--clickable';
        if (selId !== undefined && selId !== null && rid === selId) rowClass += ' o3-table__row--selected';
        var cells = cols.map(function(c){
          var alignClass = '';
          if (c.align === 'right') alignClass = 'o3-cell--num';
          var content = '';
          if (typeof c.render === 'function') content = c.render(row, idx);
          else content = esc(row[c.key] != null ? row[c.key] : '-');
          var extra = c.mono ? ' o3-cell--mono' : '';
          if (c.muted) extra += ' o3-cell--muted';
          return '<td class="' + alignClass + extra + '">' + content + '</td>';
        }).join('');
        return '<tr class="' + rowClass + '" data-o3-row="' + esc(rid) + '">' + cells + '</tr>';
      }).join('');
    }

    var html =
      '<div class="o3-table-wrap" id="' + id + '">'
      +   '<table class="o3-table" role="table">'
      +     '<thead>' + headHtml + '</thead>'
      +     '<tbody>' + bodyHtml + '</tbody>'
      +   '</table>'
      + '</div>';

    function bind(root){
      if (typeof props.onRowClick !== 'function') return function(){};
      var teardowns = [];
      var tbl = root.querySelector('#' + id);
      if (!tbl) return function(){};
      Array.prototype.forEach.call(tbl.querySelectorAll('[data-o3-row]'), function(tr){
        var rid = tr.getAttribute('data-o3-row');
        var row = rows[parseInt(rid, 10)] || rows.find(function(r, idx){ return getId(r, idx) === rid; });
        if (!row) return;
        var h = function(){ props.onRowClick(row); };
        tr.addEventListener('click', h);
        teardowns.push(function(){ tr.removeEventListener('click', h); });
      });
      return function(){ teardowns.forEach(function(t){ t(); }); };
    }

    return { html: html, bind: bind };
  }

  /* ── Drawer (right-side slide-in) ──────────────────────────────────
   * props = { title, body: HTML, footer?: HTML, onClose? }
   * Returns { open(), close(), html, bind(root) }
   * ────────────────────────────────────────────────────────────────── */
  var _drwSeq = 0;
  function Drawer(props){
    props = props || {};
    var id = 'o3drw-' + (++_drwSeq);
    var html =
      '<div class="o3-drawer-overlay" id="' + id + '-ov" aria-hidden="true"></div>'
      + '<aside class="o3-drawer" id="' + id + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title">'
      +   '<header class="o3-drawer__head">'
      +     '<h2 class="o3-drawer__title" id="' + id + '-title">' + esc(props.title || '') + '</h2>'
      +     '<button type="button" class="o3-drawer__close" aria-label="' + esc(t('Đóng','Close')) + '">×</button>'
      +   '</header>'
      +   '<div class="o3-drawer__body" id="' + id + '-body">' + (props.body || '') + '</div>'
      +   (props.footer ? '<footer class="o3-drawer__footer">' + props.footer + '</footer>' : '')
      + '</aside>';

    var els = {};
    function bind(root){
      els.ov  = root.querySelector('#' + id + '-ov');
      els.drw = root.querySelector('#' + id);
      els.close = els.drw && els.drw.querySelector('.o3-drawer__close');
      els.body  = root.querySelector('#' + id + '-body');

      var teardowns = [];
      var closeFn = function(){
        if (els.drw) els.drw.classList.remove('is-open');
        if (els.ov)  els.ov.classList.remove('is-open');
        if (typeof props.onClose === 'function') props.onClose();
      };
      if (els.close) {
        els.close.addEventListener('click', closeFn);
        teardowns.push(function(){ els.close.removeEventListener('click', closeFn); });
      }
      if (els.ov) {
        els.ov.addEventListener('click', closeFn);
        teardowns.push(function(){ els.ov.removeEventListener('click', closeFn); });
      }
      var keyH = function(e){ if (e.key === 'Escape') closeFn(); };
      document.addEventListener('keydown', keyH);
      teardowns.push(function(){ document.removeEventListener('keydown', keyH); });
      return function(){ teardowns.forEach(function(t){ t(); }); };
    }

    function open(){ if (els.drw) { els.drw.classList.add('is-open'); els.ov.classList.add('is-open'); } }
    function close(){ if (els.drw) { els.drw.classList.remove('is-open'); els.ov.classList.remove('is-open'); } }
    function setBody(htmlStr){ if (els.body) els.body.innerHTML = htmlStr || ''; }

    return { html: html, bind: bind, open: open, close: close, setBody: setBody };
  }

  /* ── EmptyState ────────────────────────────────────────────────────
   * props = { icon, title, hint?, action?: Button }
   * ────────────────────────────────────────────────────────────────── */
  function EmptyState(props){
    props = props || {};
    var html =
      '<div class="o3-empty">'
      +   '<div class="o3-empty__icon" aria-hidden="true">' + esc(props.icon || '📭') + '</div>'
      +   '<div class="o3-empty__title">' + esc(props.title || '') + '</div>'
      +   (props.hint ? '<div class="o3-empty__hint">' + esc(props.hint) + '</div>' : '')
      +   (props.action ? props.action.html : '')
      + '</div>';
    return {
      html: html,
      bind: function(root){
        return props.action && props.action.bind ? props.action.bind(root) : function(){};
      }
    };
  }

  /* ── Loading ───────────────────────────────────────────────────────
   * props = { label? }
   * ────────────────────────────────────────────────────────────────── */
  function Loading(props){
    props = props || {};
    return {
      html: '<div class="o3-loading"><span class="o3-spinner" aria-hidden="true"></span>'
            + esc(props.label || t('Đang tải…','Loading…')) + '</div>'
    };
  }

  /* ── Toast (one-shot notifier; manages its own stack on document) ──
   * usage: Toast.show({ message, variant: 'success'|'warning'|'danger'|'info', durationMs?: 3500 })
   * ────────────────────────────────────────────────────────────────── */
  function ensureToastStack(){
    var stack = document.querySelector('.o3-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'o3-toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }
  var Toast = {
    show: function(props){
      props = props || {};
      var stack = ensureToastStack();
      var el = document.createElement('div');
      var v = props.variant || 'info';
      el.className = 'o3-toast o3-toast--' + v;
      el.textContent = props.message || '';
      stack.appendChild(el);
      var timeout = props.durationMs || 3500;
      setTimeout(function(){
        el.style.opacity = '0';
        setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 300);
      }, timeout);
    }
  };

  /* ── Exception list item (used by Today's queue) ───────────────────
   * props = { severity: 'critical'|'warning'|'info', title, msg, time, onClick }
   * ────────────────────────────────────────────────────────────────── */
  function ExceptionItem(props){
    props = props || {};
    var sevClass = ' o3-exception__severity--' + (props.severity || 'info');
    var id = 'o3exc-' + Math.random().toString(36).slice(2, 8);
    var html =
      '<div class="o3-exception" id="' + id + '" tabindex="0" role="button">'
      +   '<span class="o3-exception__severity' + sevClass + '" aria-hidden="true"></span>'
      +   '<div class="o3-exception__main">'
      +     '<div class="o3-exception__title">' + esc(props.title || '') + '</div>'
      +     (props.msg ? '<div class="o3-exception__msg">' + esc(props.msg) + '</div>' : '')
      +   '</div>'
      +   (props.time ? '<div class="o3-exception__time">' + esc(props.time) + '</div>' : '')
      + '</div>';
    function bind(root){
      if (typeof props.onClick !== 'function') return function(){};
      var el = root.querySelector('#' + id);
      if (!el) return function(){};
      var h = function(e){
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        props.onClick();
      };
      el.addEventListener('click', h);
      el.addEventListener('keydown', h);
      return function(){ el.removeEventListener('click', h); el.removeEventListener('keydown', h); };
    }
    return { html: html, bind: bind };
  }

  // ── Export ──────────────────────────────────────────────────────
  O3.ui = {
    KpiTile:       KpiTile,
    KpiGrid:       KpiGrid,
    Panel:         Panel,
    Chip:          Chip,
    SourceChip:    SourceChip,
    Button:        Button,
    Toolbar:       Toolbar,
    Table:         Table,
    Drawer:        Drawer,
    EmptyState:    EmptyState,
    Loading:       Loading,
    Toast:         Toast,
    ExceptionItem: ExceptionItem
  };
})();
