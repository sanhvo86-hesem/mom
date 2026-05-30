/* ════════════════════════════════════════════════════════════════════════
 * Orders v3 — Workspace: Unified intake
 *
 * Single stream of AI Email Order Intake cases + Customer POs +
 * manual SO origins. Filterable by status group (waiting / committed
 * / rejected / duplicate) and source (AI vs manual). Free-text search.
 *
 * Backend: GET orders_v3_intake_list returns
 *   { items, total, offset, limit, counts: {all, waiting, committed, rejected, duplicate} }
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var O3 = window.OrdersV3 = window.OrdersV3 || {};

  function mount(root, ctx){
    var ui  = ctx.ui;
    var t   = function(vi, en){ return ctx.i18n.t(vi, en); };
    var esc = ctx.fmt.esc;

    root.innerHTML = ui.Loading({ label: t('Đang tải tiếp nhận…','Loading intake…') }).html;

    var state = {
      filters:  { status_group: 'waiting', source: 'all', q: '', limit: 200, offset: 0 },
      payload:  null,
      teardown: function(){}
    };

    function refresh(){
      ctx.api.get('orders_v3_intake_list', state.filters).then(function(r){
        if (!r.ok) {
          root.innerHTML = ui.EmptyState({
            icon: '⚠️',
            title: t('Không thể tải tiếp nhận','Could not load intake'),
            hint:  (r.error || '') + (r.detail ? ' — ' + r.detail : '')
          }).html;
          return;
        }
        state.payload = r.data;
        render();
      });
    }

    function render(){
      var p = state.payload || { items: [], counts: { all:0, waiting:0, committed:0, rejected:0, duplicate:0 } };
      try { state.teardown(); } catch (e) {}

      var counts = p.counts || {};

      // Toolbar: status chips + source dropdown + search + refresh
      var statusChips = [
        { label: t('Chờ duyệt','Waiting')   + ' · ' + (counts.waiting || 0),   value: 'waiting',   active: state.filters.status_group === 'waiting' },
        { label: t('Đã commit','Committed') + ' · ' + (counts.committed || 0), value: 'committed', active: state.filters.status_group === 'committed' },
        { label: t('Từ chối','Rejected')    + ' · ' + (counts.rejected || 0),  value: 'rejected',  active: state.filters.status_group === 'rejected' },
        { label: t('Trùng lặp','Duplicate') + ' · ' + (counts.duplicate || 0), value: 'duplicate', active: state.filters.status_group === 'duplicate' },
        { label: t('Tất cả','All')          + ' · ' + (counts.all || 0),       value: 'all',       active: state.filters.status_group === 'all' }
      ];

      var refreshBtn = ui.Button({ label: t('Làm mới','Refresh'), icon: '🔄', size:'sm', variant:'ghost', onClick: refresh });

      var newPoBtn = ui.Button({
        label: t('Tạo PO thủ công','+ Manual PO'), size:'sm', variant:'primary',
        onClick: function(){
          ui.Toast.show({
            message: t('Tạo PO thủ công sẽ có trong phiên bản kế tiếp.','Manual PO creation lands in the next iteration.'),
            variant: 'info'
          });
        }
      });

      var toolbar = ui.Toolbar({
        chips: statusChips,
        onChipClick: function(v){
          state.filters.status_group = v;
          state.filters.offset = 0;
          refresh();
        },
        search: {
          placeholder: t('Tìm PO, khách hàng, mã ca…','Search PO, customer, case…'),
          value: state.filters.q,
          onInput: function(v){
            state.filters.q = v;
            state.filters.offset = 0;
            refresh();
          }
        },
        rightActions: [refreshBtn, newPoBtn]
      });

      // Source pill row (separate from status chips because they're orthogonal)
      var srcChips = ['all', 'ai', 'manual'].map(function(key){
        var label = key === 'all'
          ? t('Tất cả nguồn','All sources')
          : (key === 'ai' ? '🤖 ' + t('AI Intake','AI Intake') : '👤 ' + t('Thủ công','Manual'));
        return '<button type="button" class="o3-chip o3-chip--button'
          + (state.filters.source === key ? ' o3-chip--active' : '')
          + '" data-o3-src="' + esc(key) + '">' + esc(label) + '</button>';
      }).join(' ');

      // Table
      var table = ui.Table({
        columns: [
          { key: 'id',          label: 'ID',                                width: '170px', mono: true,
            render: function(r){ return esc(r.id || '-'); } },
          { key: 'source',      label: t('Nguồn','Source'),                 width: '110px',
            render: function(r){ return ui.SourceChip(r.source).html; } },
          { key: 'customer',    label: t('Khách hàng','Customer'),
            render: function(r){
              var cid = r.customer_id ? '<div class="o3-cell--mono o3-cell--muted">' + esc(r.customer_id) + '</div>' : '';
              return '<div style="font-weight:600">' + esc(r.customer_name || r.customer_id || '-') + '</div>' + cid;
            } },
          { key: 'po_number',   label: 'PO #',                              mono: true,
            render: function(r){ return esc(r.po_number || '-'); } },
          { key: 'lines',       label: t('Dòng','Lines'),                   align: 'right',
            render: function(r){ return String(r.lines_count || 0); } },
          { key: 'value',       label: t('Giá trị','Value'),                align: 'right',
            render: function(r){ return ctx.fmt.money(r.value || 0, r.currency); } },
          { key: 'received',    label: t('Nhận','Received'),                muted: true,
            render: function(r){ return ctx.fmt.relative(r.received_at); } },
          { key: 'status',      label: t('Trạng thái','Status'),
            render: function(r){
              var tone = ({ waiting:'warning', committed:'success', rejected:'danger', duplicate:'neutral' })[r.status_group] || 'neutral';
              return '<span class="o3-chip o3-chip--' + tone + '">' + esc(r.status_raw || r.status_group || '-') + '</span>';
            } }
        ],
        rows: p.items || [],
        getRowId: function(r, idx){ return (r.kind || 'x') + ':' + (r.id || idx); },
        onRowClick: function(row){ openDrawer(row); },
        emptyState: {
          icon: state.filters.status_group === 'waiting' ? '✨' : '📭',
          title: state.filters.status_group === 'waiting'
            ? t('Không có gì chờ duyệt','Nothing waiting for review')
            : t('Không có dữ liệu phù hợp','No matching records'),
          hint: state.filters.status_group === 'waiting'
            ? t('Email đơn hàng mới sẽ tự động xuất hiện ở đây.','New order emails appear here automatically.')
            : ''
        }
      });

      var tablePanel = ui.Panel({
        title: t('Danh sách tiếp nhận','Intake list'),
        count: (p.items || []).length,
        flush: true,
        body:  table.html
      });

      root.innerHTML =
        toolbar.html
        + '<div style="margin-top:12px;display:flex;gap:6px;align-items:center;color:var(--o3-text-muted);font-size:var(--o3-font-size-xs)">'
        +   '<span>' + esc(t('Nguồn:','Source:')) + '</span>'
        +   srcChips
        + '</div>'
        + '<div style="margin-top:12px"></div>'
        + tablePanel.html;

      // Bind
      var teardowns = [toolbar.bind(root), table.bind(root)];
      Array.prototype.forEach.call(root.querySelectorAll('[data-o3-src]'), function(el){
        var h = function(){
          state.filters.source = el.getAttribute('data-o3-src');
          state.filters.offset = 0;
          refresh();
        };
        el.addEventListener('click', h);
        teardowns.push(function(){ el.removeEventListener('click', h); });
      });

      state.teardown = function(){ teardowns.forEach(function(fn){ try { fn(); } catch (e) {} }); };
    }

    // Drawer for row click — shows full details + actions
    function openDrawer(row){
      var existing = document.querySelector('[id^="o3drw-"]');
      if (existing) { try { existing.remove(); } catch (e) {} }
      var existingOv = document.querySelector('.o3-drawer-overlay');
      if (existingOv) { try { existingOv.remove(); } catch (e) {} }

      var body = renderDrawerBody(row);
      var footer = renderDrawerFooter(row);

      var drawer = ui.Drawer({
        title: (row.kind === 'aeoi_case' ? '🤖 ' : '📋 ') + (row.id || ''),
        body:  body,
        footer: footer
      });

      var mount = document.createElement('div');
      mount.innerHTML = drawer.html;
      document.body.appendChild(mount.firstChild);
      document.body.appendChild(mount.firstChild || mount); // overlay was first
      // The two siblings were already appended; bind on document
      drawer.bind(document);
      setTimeout(function(){ drawer.open(); }, 10);

      bindDrawerActions(document, row, drawer);
    }

    function renderDrawerBody(row){
      var rows = [
        [t('Loại','Kind'),         row.kind === 'aeoi_case' ? t('Email AEOI','AEOI Email') : t('Customer PO','Customer PO')],
        [t('Nguồn','Source'),       row.source === 'ai_order_intake' ? '🤖 AI Intake' : '👤 Manual'],
        [t('Mã','ID'),              row.id || '-'],
        [t('Khách hàng','Customer'),(row.customer_name || '') + (row.customer_id ? ' · ' + row.customer_id : '')],
        [t('PO #','PO #'),          row.po_number || '-'],
        [t('Số dòng','Lines'),      String(row.lines_count || 0)],
        [t('Giá trị','Value'),      ctx.fmt.money(row.value || 0, row.currency)],
        [t('Nhận lúc','Received'),  ctx.fmt.datetime(row.received_at)]
      ];
      if (row.committed_cpo) rows.push([t('CPO đã commit','Committed CPO'), row.committed_cpo]);
      if (row.committed_so)  rows.push([t('SO đã commit','Committed SO'),   row.committed_so]);
      if (row.overall_confidence !== null && row.overall_confidence !== undefined) {
        rows.push([t('Confidence','Confidence'), Math.round(row.overall_confidence * 100) + '%']);
      }

      var grid = '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:6px 12px;margin:0">';
      rows.forEach(function(pair){
        grid += '<dt style="color:var(--o3-text-muted);font-size:var(--o3-font-size-xs);text-transform:uppercase;letter-spacing:.04em">' + esc(pair[0]) + '</dt>';
        grid += '<dd style="margin:0;color:var(--o3-text-strong);font-size:var(--o3-font-size-sm)">' + esc(pair[1] || '-') + '</dd>';
      });
      grid += '</dl>';
      return grid;
    }

    function renderDrawerFooter(row){
      var html = '';
      if (row.kind === 'aeoi_case' && row.status_group === 'waiting') {
        html =
          ui.Button({ label: t('Mở chi tiết AEOI','Open AEOI detail'), variant: 'ghost' }).html
          + ui.Button({ label: t('Duyệt','Approve'), variant: 'success' }).html;
      } else if (row.kind === 'aeoi_case' && (row.committed_cpo || row.committed_so)) {
        html = ui.Button({ label: t('Mở chuỗi đơn','Open chain'), variant: 'primary' }).html;
      } else if (row.kind === 'cpo') {
        html = ui.Button({ label: t('Mở Order Book','Open Order Book'), variant: 'primary' }).html;
      }
      return html || ui.Button({ label: t('Đóng','Close'), variant: 'ghost' }).html;
    }

    function bindDrawerActions(root, row, drawer){
      // Wire buttons in the footer to navigate
      var footer = document.querySelector('.o3-drawer__footer');
      if (!footer) return;
      Array.prototype.forEach.call(footer.querySelectorAll('button'), function(btn){
        btn.addEventListener('click', function(){
          var label = btn.textContent.trim();
          if (label.indexOf('AEOI') >= 0 || label.indexOf('Approve') >= 0 || label.indexOf('Duyệt') >= 0) {
            // Future: send to legacy AEOI admin tab or trigger orders_v3_intake_action
            ui.Toast.show({
              message: t('Hành động AEOI sẽ wire qua orders_v3_intake_action trong slice tiếp.',
                         'AEOI action wires through orders_v3_intake_action in the next slice.'),
              variant: 'info'
            });
          } else if (label.indexOf('Order Book') >= 0 || label.indexOf('chuỗi') >= 0 || label.indexOf('chain') >= 0) {
            drawer.close();
            ctx.navigate('orderbook');
          } else {
            drawer.close();
          }
        });
      });
    }

    refresh();
    return { teardown: function(){ try { state.teardown(); } catch (e) {} } };
  }

  function tryRegister(){
    if (window.OrdersV3 && window.OrdersV3.shell && typeof window.OrdersV3.shell.register === 'function') {
      window.OrdersV3.shell.register({
        id: 'intake',
        icon: '📥',
        label: { vi: 'Tiếp nhận đơn', en: 'Intake' },
        mount: mount
      });
    } else {
      setTimeout(tryRegister, 50);
    }
  }
  tryRegister();
})();
