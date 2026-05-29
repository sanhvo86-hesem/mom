/* ==========================================================================
   80-uom-control-center.js — HESEM Measurement Intelligence Control Center

   Admin workspace for UoM governance:
   - Conversion calculator with MEASVAL evidence
   - Unit catalog browser (filterable by quantity kind)
   - Quantity kind tree
   - Conversion rules viewer
   - Alias resolution tool
   - Engine health dashboard

   Feature flag: localStorage.getItem('uom_admin') === '1'
   (or window.UOM_ADMIN_ENABLED = true set by server-side config)

   Graphics Authority compliance: ALL visual tokens via
   window.GraphicsAuthority.tokens.read() — no hardcoded colors or sizes.

   Vietnamese labels WITH full diacritics throughout.
   ========================================================================== */
(function (global) {
    'use strict';

    /* ── Feature flag guard ─────────────────────────────────────────────────── */

    if (!global.UOM_ADMIN_ENABLED && global.localStorage &&
        localStorage.getItem('uom_admin') !== '1') {
        return;
    }

    /* ── Token helper ───────────────────────────────────────────────────────── */

    function tok(key, fallback) {
        if (global.GraphicsAuthority && global.GraphicsAuthority.tokens) {
            var v = global.GraphicsAuthority.tokens.read(key, fallback);
            return (v !== null && v !== undefined) ? String(v) : String(fallback || '');
        }
        return String(fallback || '');
    }

    /* ── Module registration ────────────────────────────────────────────────── */

    var MODULE_KEY = 'uom_control_center';

    if (global.ModuleRegistry && global.ModuleRegistry.register) {
        global.ModuleRegistry.register(MODULE_KEY, {
            labelVi   : 'Quản lý Đơn vị Đo',
            labelEn   : 'Unit of Measure Control Center',
            icon      : 'ruler',
            category  : 'admin',
            render    : renderControlCenter,
        });
    }

    /* ── Main render entry ──────────────────────────────────────────────────── */

    function renderControlCenter(container) {
        container.innerHTML = '';

        var wrapper = el('div', { className: 'uom-cc' });
        applyPageStyles(wrapper);

        /* Header */
        var hdr = buildHeader();
        wrapper.appendChild(hdr);

        /* Tab bar */
        var tabs = buildTabs([
            { id: 'calc',    label: 'Máy tính chuyển đổi' },
            { id: 'units',   label: 'Danh mục đơn vị' },
            { id: 'kinds',   label: 'Loại đại lượng' },
            { id: 'rules',   label: 'Quy tắc chuyển đổi' },
            { id: 'alias',   label: 'Phân giải bí danh' },
            { id: 'health',  label: 'Trạng thái hệ thống' },
        ], 'calc');
        wrapper.appendChild(tabs.nav);

        /* Content area */
        var content = el('div', { className: 'uom-cc-content' });
        applyContentStyles(content);
        wrapper.appendChild(content);

        /* Render default tab */
        renderTab('calc', content);

        /* Tab click handler */
        tabs.nav.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-tab]');
            if (!btn) return;
            var tabId = btn.getAttribute('data-tab');
            tabs.nav.querySelectorAll('[data-tab]').forEach(function (b) {
                b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
                applyTabBtnStyles(b, b === btn);
            });
            renderTab(tabId, content);
        });

        container.appendChild(wrapper);
    }

    /* ── Header ─────────────────────────────────────────────────────────────── */

    function buildHeader() {
        var hdr = el('div', { className: 'uom-cc-header' });
        hdr.style.padding         = tok('--space-6', '24px') + ' ' + tok('--space-8', '32px');
        hdr.style.borderBottom    = '1px solid ' + tok('--border-subtle', '#e5e7eb');
        hdr.style.background      = tok('--surface-elevated', '#fff');

        var title = el('h1', { className: 'uom-cc-title' });
        title.textContent = 'Trung tâm Quản lý Đơn vị Đo';
        title.style.fontSize   = tok('--text-2xl', '1.5rem');
        title.style.fontWeight = tok('--font-weight-semibold', '600');
        title.style.color      = tok('--text-primary', '#111827');
        title.style.margin     = '0 0 ' + tok('--space-1', '4px') + ' 0';

        var sub = el('p', { className: 'uom-cc-subtitle' });
        sub.textContent = 'HESEM Measurement Intelligence — BCMath + UCUM + QUDT';
        sub.style.fontSize  = tok('--text-sm', '0.875rem');
        sub.style.color     = tok('--text-secondary', '#6b7280');
        sub.style.margin    = '0';

        hdr.appendChild(title);
        hdr.appendChild(sub);
        return hdr;
    }

    /* ── Tab navigation ─────────────────────────────────────────────────────── */

    function buildTabs(defs, activeId) {
        var nav = el('nav', { className: 'uom-cc-tabs', role: 'tablist' });
        nav.style.display       = 'flex';
        nav.style.gap           = tok('--space-1', '4px');
        nav.style.padding       = tok('--space-3', '12px') + ' ' + tok('--space-8', '32px') + ' 0';
        nav.style.borderBottom  = '1px solid ' + tok('--border-subtle', '#e5e7eb');
        nav.style.overflowX     = 'auto';
        nav.style.background    = tok('--surface-base', '#f9fafb');

        defs.forEach(function (d) {
            var btn = el('button', { type: 'button', className: 'uom-cc-tab-btn' });
            btn.setAttribute('role', 'tab');
            btn.setAttribute('data-tab', d.id);
            var isActive = d.id === activeId;
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.textContent = d.label;
            applyTabBtnStyles(btn, isActive);
            nav.appendChild(btn);
        });

        return { nav: nav };
    }

    function applyTabBtnStyles(btn, active) {
        btn.style.padding       = tok('--space-2', '8px') + ' ' + tok('--space-4', '16px');
        btn.style.border        = 'none';
        btn.style.borderBottom  = active ? ('2px solid ' + tok('--brand-primary', '#2563eb')) : '2px solid transparent';
        btn.style.background    = 'transparent';
        btn.style.fontSize      = tok('--text-sm', '0.875rem');
        btn.style.fontWeight    = active ? tok('--font-weight-semibold', '600') : tok('--font-weight-normal', '400');
        btn.style.color         = active ? tok('--brand-primary', '#2563eb') : tok('--text-secondary', '#6b7280');
        btn.style.cursor        = 'pointer';
        btn.style.whiteSpace    = 'nowrap';
        btn.style.paddingBottom = tok('--space-3', '12px');
        btn.style.transition    = 'color ' + tok('--motion-duration-short', '150ms') + ' ease';
    }

    /* ── Tab routing ────────────────────────────────────────────────────────── */

    function renderTab(id, container) {
        container.innerHTML = '';
        var fn = {
            calc   : renderCalcTab,
            units  : renderUnitsTab,
            kinds  : renderKindsTab,
            rules  : renderRulesTab,
            alias  : renderAliasTab,
            health : renderHealthTab,
        }[id];
        if (fn) fn(container);
    }

    /* ── Calculator tab ─────────────────────────────────────────────────────── */

    function renderCalcTab(container) {
        var card = buildCard('Máy tính Chuyển đổi Đơn vị Đo');
        var body = card.querySelector('.uom-cc-card-body');

        /* Form grid */
        var grid = el('div');
        grid.style.display             = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        grid.style.gap                 = tok('--space-4', '16px');
        grid.style.marginBottom        = tok('--space-4', '16px');

        /* Magnitude input */
        var magWrap = buildField('Giá trị', 'Nhập số lượng…', 'calc-magnitude', 'text');
        magWrap.querySelector('input').setAttribute('inputmode', 'decimal');

        /* From unit */
        var fromWrap = buildSelectField('Đơn vị nguồn', 'calc-from-unit');

        /* To unit */
        var toWrap = buildSelectField('Đơn vị đích', 'calc-to-unit');

        /* Precision */
        var precWrap = buildField('Số chữ số thập phân', '6', 'calc-precision', 'number');
        var precInp  = precWrap.querySelector('input');
        precInp.min  = '0';
        precInp.max  = '20';
        precInp.value= '6';

        grid.appendChild(magWrap);
        grid.appendChild(fromWrap);
        grid.appendChild(toWrap);
        grid.appendChild(precWrap);
        body.appendChild(grid);

        /* Convert button */
        var btn = buildPrimaryButton('Chuyển đổi');
        body.appendChild(btn);

        /* Result area */
        var result = el('div', { className: 'uom-calc-result', role: 'status', 'aria-live': 'polite' });
        result.style.marginTop   = tok('--space-6', '24px');
        result.style.display     = 'none';
        body.appendChild(result);

        /* Load unit options */
        loadUnitsIntoSelect(fromWrap.querySelector('select'), null, function () {});
        loadUnitsIntoSelect(toWrap.querySelector('select'), null, function () {});

        /* Button click */
        btn.addEventListener('click', function () {
            var mag      = card.querySelector('#calc-magnitude').value.trim();
            var fromUnit = card.querySelector('#calc-from-unit').value;
            var toUnit   = card.querySelector('#calc-to-unit').value;
            var prec     = parseInt(card.querySelector('#calc-precision').value, 10) || 6;

            if (!mag || !fromUnit || !toUnit) {
                showError(result, 'Vui lòng điền đầy đủ: giá trị, đơn vị nguồn, đơn vị đích.');
                return;
            }

            result.style.display = 'block';
            result.innerHTML = '<span style="color:' + tok('--text-secondary', '#6b7280') + '">Đang tính toán…</span>';

            fetch('/api/v1/uom/convert', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ magnitude: mag, from_unit: fromUnit, to_unit: toUnit, display_precision: prec })
            })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.ok) {
                    showCalcResult(result, d);
                } else {
                    showError(result, d.detail || d.title || 'Lỗi không xác định.');
                }
            })
            .catch(function (e) {
                showError(result, 'Lỗi kết nối: ' + e.message);
            });
        });

        container.appendChild(card);
    }

    function showCalcResult(container, d) {
        var measval = d.measval || {};
        var digital = measval.digital_thread || {};
        var evidence= measval.evidence || {};

        container.style.display  = 'block';
        container.style.padding  = tok('--space-4', '16px');
        container.style.background = tok('--surface-success-light', '#f0fdf4');
        container.style.border   = '1px solid ' + tok('--status-success-border', '#86efac');
        container.style.borderRadius = tok('--radius-md', '6px');

        container.innerHTML = '';

        /* Result headline */
        var hl = el('div');
        hl.style.fontSize   = tok('--text-xl', '1.25rem');
        hl.style.fontWeight = tok('--font-weight-semibold', '600');
        hl.style.color      = tok('--status-success-text', '#15803d');
        hl.style.marginBottom= tok('--space-3', '12px');
        hl.textContent = d.result + ' ' + d.to_unit;
        container.appendChild(hl);

        /* Evidence row */
        buildEvidenceRow(container, 'Quy tắc', evidence.rule_code || '(SI base hop)');
        buildEvidenceRow(container, 'Danh mục', evidence.category || '—');
        buildEvidenceRow(container, 'Hệ số', evidence.factor || '—');
        buildEvidenceRow(container, 'Đảo chiều', evidence.reversed ? 'Có' : 'Không');

        /* Digital thread */
        var hashTrunc = (digital.audit_hash || '').slice(0, 16) + '…';
        buildEvidenceRow(container, 'SHA-256 (16c)', hashTrunc);
        buildEvidenceRow(container, 'Thời điểm', digital.recorded_at ? digital.recorded_at.replace('T', ' ').slice(0, 19) : '—');
    }

    function buildEvidenceRow(container, label, value) {
        var row = el('div');
        row.style.display       = 'flex';
        row.style.gap           = tok('--space-2', '8px');
        row.style.fontSize      = tok('--text-sm', '0.875rem');
        row.style.marginBottom  = tok('--space-1', '4px');

        var lbl = el('span');
        lbl.style.color      = tok('--text-secondary', '#6b7280');
        lbl.style.minWidth   = '120px';
        lbl.style.fontWeight = tok('--font-weight-medium', '500');
        lbl.textContent      = label + ':';

        var val = el('span');
        val.style.color      = tok('--text-primary', '#111827');
        val.style.fontFamily = 'monospace';
        val.textContent      = String(value);

        row.appendChild(lbl);
        row.appendChild(val);
        container.appendChild(row);
    }

    function showError(container, msg) {
        container.style.display     = 'block';
        container.style.padding     = tok('--space-4', '16px');
        container.style.background  = tok('--surface-danger-light', '#fef2f2');
        container.style.border      = '1px solid ' + tok('--status-danger-border', '#fca5a5');
        container.style.borderRadius= tok('--radius-md', '6px');
        container.style.color       = tok('--status-danger-text', '#b91c1c');
        container.style.fontSize    = tok('--text-sm', '0.875rem');
        container.innerHTML = '<strong>Lỗi:</strong> ' + escapeHtml(msg);
    }

    /* ── Units tab ──────────────────────────────────────────────────────────── */

    function renderUnitsTab(container) {
        var card = buildCard('Danh mục Đơn vị Đo (79 đơn vị giai đoạn 1)');
        var body = card.querySelector('.uom-cc-card-body');

        /* Filter row */
        var filterRow = el('div');
        filterRow.style.display        = 'flex';
        filterRow.style.gap            = tok('--space-3', '12px');
        filterRow.style.marginBottom   = tok('--space-4', '16px');
        filterRow.style.flexWrap       = 'wrap';

        var kindSel = buildSelectField('Lọc theo loại đại lượng', 'units-kind-filter');
        var opt0 = el('option'); opt0.value = ''; opt0.textContent = '— Tất cả loại —';
        kindSel.querySelector('select').prepend(opt0);
        loadKindsIntoSelect(kindSel.querySelector('select'));

        filterRow.appendChild(kindSel);
        body.appendChild(filterRow);

        /* Table */
        var tableWrap = el('div');
        tableWrap.style.overflowX = 'auto';
        var table = buildTable(
            ['Mã đơn vị', 'Ký hiệu', 'Tên tiếng Việt', 'UCUM', 'Loại đại lượng', 'Rủi ro', 'Trạng thái'],
            'units-table'
        );
        tableWrap.appendChild(table);
        body.appendChild(tableWrap);

        /* Load */
        loadUnitsTable(table, null);

        /* Filter change */
        kindSel.querySelector('select').addEventListener('change', function () {
            var kind = this.value || null;
            loadUnitsTable(table, kind);
        });

        container.appendChild(card);
    }

    function loadUnitsTable(table, kindCode) {
        var url = '/api/v1/uom/units?limit=200' + (kindCode ? '&kind=' + encodeURIComponent(kindCode) : '');
        var tbody = table.querySelector('tbody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:' + tok('--text-secondary', '#6b7280') + '">Đang tải…</td></tr>';

        fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var units = d.units || [];
                tbody.innerHTML = '';
                if (!units.length) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">Không có đơn vị</td></tr>';
                    return;
                }
                units.forEach(function (u) {
                    var tr = el('tr');
                    [u.canonical_code, u.display_symbol, u.display_name_vi,
                     u.ucum_code, u.quantity_kind_code,
                     buildRiskBadge(u.risk_level),
                     buildStatusBadge(u.lifecycle_status)
                    ].forEach(function (val, i) {
                        var td = el('td');
                        td.style.padding     = tok('--space-2', '8px') + ' ' + tok('--space-3', '12px');
                        td.style.fontSize    = tok('--text-sm', '0.875rem');
                        td.style.borderBottom= '1px solid ' + tok('--border-subtle', '#f3f4f6');
                        if (typeof val === 'string' && !val.includes('<')) {
                            td.textContent = val;
                        } else {
                            td.innerHTML = String(val);
                        }
                        if (i === 0) { td.style.fontFamily = 'monospace'; td.style.fontWeight = tok('--font-weight-medium', '500'); }
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            })
            .catch(function () {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red">Lỗi tải dữ liệu</td></tr>';
            });
    }

    /* ── Kinds tab ──────────────────────────────────────────────────────────── */

    function renderKindsTab(container) {
        var card = buildCard('Loại Đại lượng (58 loại giai đoạn 1)');
        var body = card.querySelector('.uom-cc-card-body');

        var tableWrap = el('div');
        tableWrap.style.overflowX = 'auto';
        var table = buildTable(
            ['Mã loại', 'Vectơ thứ nguyên', 'Tên tiếng Việt', 'Không thứ nguyên', 'Nguồn'],
            'kinds-table'
        );
        tableWrap.appendChild(table);
        body.appendChild(tableWrap);

        fetch('/api/v1/uom/kinds?limit=200', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var kinds = d.kinds || [];
                var tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
                kinds.forEach(function (k) {
                    var tr = el('tr');
                    [k.kind_code, k.dimension_vector, k.label_vi,
                     k.is_dimensionless ? 'Có' : 'Không',
                     k.source
                    ].forEach(function (val, i) {
                        var td = el('td');
                        td.style.padding     = tok('--space-2', '8px') + ' ' + tok('--space-3', '12px');
                        td.style.fontSize    = tok('--text-sm', '0.875rem');
                        td.style.borderBottom= '1px solid ' + tok('--border-subtle', '#f3f4f6');
                        td.textContent       = String(val || '—');
                        if (i === 0 || i === 1) { td.style.fontFamily = 'monospace'; }
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            });

        container.appendChild(card);
    }

    /* ── Rules tab ──────────────────────────────────────────────────────────── */

    function renderRulesTab(container) {
        var card = buildCard('Quy tắc Chuyển đổi (đã phê duyệt)');
        var body = card.querySelector('.uom-cc-card-body');

        var tableWrap = el('div');
        tableWrap.style.overflowX = 'auto';
        var table = buildTable(
            ['Mã quy tắc', 'Từ', 'Đến', 'Danh mục', 'Hệ số', 'Hai chiều', 'Rủi ro'],
            'rules-table'
        );
        tableWrap.appendChild(table);
        body.appendChild(tableWrap);

        fetch('/api/v1/uom/rules?limit=100', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var rules = d.rules || [];
                var tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
                rules.forEach(function (r) {
                    var tr = el('tr');
                    [r.rule_code, r.from_unit_code, r.to_unit_code,
                     r.category, String(r.factor || '—'),
                     r.bidirectional ? 'Có' : 'Không',
                     buildRiskBadge(r.risk_level)
                    ].forEach(function (val, i) {
                        var td = el('td');
                        td.style.padding     = tok('--space-2', '8px') + ' ' + tok('--space-3', '12px');
                        td.style.fontSize    = tok('--text-sm', '0.875rem');
                        td.style.borderBottom= '1px solid ' + tok('--border-subtle', '#f3f4f6');
                        if (typeof val === 'string' && !val.includes('<')) {
                            td.textContent = val;
                        } else { td.innerHTML = String(val); }
                        if (i === 0) { td.style.fontFamily = 'monospace'; td.style.fontSize = tok('--text-xs', '0.75rem'); }
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            });

        container.appendChild(card);
    }

    /* ── Alias tab ──────────────────────────────────────────────────────────── */

    function renderAliasTab(container) {
        var card = buildCard('Phân giải Bí danh Đơn vị');
        var body = card.querySelector('.uom-cc-card-body');

        var grid = el('div');
        grid.style.display             = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        grid.style.gap                 = tok('--space-4', '16px');
        grid.style.marginBottom        = tok('--space-4', '16px');

        var aliasWrap = buildField('Bí danh (alias)', 'Ví dụ: KGM, lb, kilogram', 'alias-input', 'text');
        var scopeWrap = buildSelectField('Phạm vi (context)', 'alias-scope');
        var scopeSel  = scopeWrap.querySelector('select');
        ['SYSTEM', 'SUPPLIER', 'CUSTOMER'].forEach(function (s) {
            var o = el('option'); o.value = s; o.textContent = s; scopeSel.appendChild(o);
        });

        grid.appendChild(aliasWrap);
        grid.appendChild(scopeWrap);
        body.appendChild(grid);

        var btn = buildPrimaryButton('Phân giải');
        body.appendChild(btn);

        var result = el('div', { role: 'status', 'aria-live': 'polite' });
        result.style.marginTop = tok('--space-4', '16px');
        result.style.display   = 'none';
        body.appendChild(result);

        btn.addEventListener('click', function () {
            var alias = card.querySelector('#alias-input').value.trim();
            var scope = card.querySelector('#alias-scope').value;
            if (!alias) return;

            result.style.display  = 'block';
            result.textContent    = 'Đang phân giải…';
            result.style.color    = tok('--text-secondary', '#6b7280');

            fetch('/api/v1/uom/aliases/resolve', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias: alias, context_scope: scope })
            })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.ok) {
                    result.style.color = tok('--status-success-text', '#15803d');
                    result.textContent = '✓ Mã chuẩn: ' + d.canonical_code;
                } else {
                    result.style.color = tok('--status-danger-text', '#b91c1c');
                    result.textContent = '✗ ' + (d.detail || 'Không tìm thấy — đã gửi vào hàng đợi kiểm duyệt');
                }
            })
            .catch(function () {
                result.style.color   = tok('--status-danger-text', '#b91c1c');
                result.textContent   = 'Lỗi kết nối';
            });
        });

        container.appendChild(card);
    }

    /* ── Health tab ─────────────────────────────────────────────────────────── */

    function renderHealthTab(container) {
        var card = buildCard('Trạng thái Hệ thống Đo lường');
        var body = card.querySelector('.uom-cc-card-body');

        var grid = el('div');
        grid.style.display             = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
        grid.style.gap                 = tok('--space-4', '16px');
        body.appendChild(grid);

        fetch('/api/v1/uom/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d.ok) { grid.textContent = 'Lỗi tải trạng thái'; return; }
                var cat    = d.catalog || {};
                var prec   = d.precision || {};

                buildStatCard(grid, 'Đơn vị đang hoạt động', cat.active_units || 0, '--brand-primary', '#2563eb');
                buildStatCard(grid, 'Loại đại lượng', cat.quantity_kinds || 0, '--status-info-text', '#1d4ed8');
                buildStatCard(grid, 'Quy tắc phê duyệt', cat.approved_rules || 0, '--status-success-text', '#15803d');
                buildStatCard(grid, 'Độ chính xác BCMath', prec.bcmath_scale || 30, '--text-primary', '#111827');
            })
            .catch(function () {
                grid.textContent = 'Lỗi kết nối đến API';
            });

        container.appendChild(card);
    }

    function buildStatCard(container, label, value, tokenKey, fallback) {
        var card = el('div');
        card.style.padding      = tok('--space-6', '24px');
        card.style.background   = tok('--surface-elevated', '#fff');
        card.style.border       = '1px solid ' + tok('--border-subtle', '#e5e7eb');
        card.style.borderRadius = tok('--radius-lg', '8px');
        card.style.textAlign    = 'center';

        var num = el('div');
        num.style.fontSize   = tok('--text-3xl', '1.875rem');
        num.style.fontWeight = tok('--font-weight-bold', '700');
        num.style.color      = tok(tokenKey, fallback);
        num.textContent      = String(value);

        var lbl = el('div');
        lbl.style.fontSize  = tok('--text-sm', '0.875rem');
        lbl.style.color     = tok('--text-secondary', '#6b7280');
        lbl.style.marginTop = tok('--space-1', '4px');
        lbl.textContent     = label;

        card.appendChild(num);
        card.appendChild(lbl);
        container.appendChild(card);
    }

    /* ── Helpers ────────────────────────────────────────────────────────────── */

    function loadUnitsIntoSelect(sel, kindCode, cb) {
        var url = '/api/v1/uom/units?limit=200' + (kindCode ? '&kind=' + encodeURIComponent(kindCode) : '');
        fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var units = d.units || [];
                var prev  = sel.innerHTML;
                sel.innerHTML = '';
                var opt0 = el('option'); opt0.value = ''; opt0.textContent = '— Chọn đơn vị —'; sel.appendChild(opt0);
                units.forEach(function (u) {
                    var o = el('option');
                    o.value       = u.canonical_code;
                    o.textContent = u.display_symbol + ' (' + u.canonical_code + ') — ' + u.display_name_vi;
                    sel.appendChild(o);
                });
                cb(units);
            });
    }

    function loadKindsIntoSelect(sel) {
        fetch('/api/v1/uom/kinds?limit=200', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                (d.kinds || []).forEach(function (k) {
                    var o = el('option');
                    o.value       = k.kind_code;
                    o.textContent = k.label_vi + ' (' + k.kind_code + ')';
                    sel.appendChild(o);
                });
            });
    }

    function buildCard(title) {
        var card = el('div', { className: 'uom-cc-card' });
        card.style.background   = tok('--surface-elevated', '#fff');
        card.style.border       = '1px solid ' + tok('--border-subtle', '#e5e7eb');
        card.style.borderRadius = tok('--radius-lg', '8px');
        card.style.overflow     = 'hidden';
        card.style.margin       = tok('--space-6', '24px');

        var hdr = el('div', { className: 'uom-cc-card-header' });
        hdr.style.padding      = tok('--space-4', '16px') + ' ' + tok('--space-6', '24px');
        hdr.style.borderBottom = '1px solid ' + tok('--border-subtle', '#e5e7eb');
        hdr.style.background   = tok('--surface-base', '#f9fafb');

        var h = el('h2');
        h.style.fontSize   = tok('--text-base', '1rem');
        h.style.fontWeight = tok('--font-weight-semibold', '600');
        h.style.color      = tok('--text-primary', '#111827');
        h.style.margin     = '0';
        h.textContent      = title;
        hdr.appendChild(h);

        var body = el('div', { className: 'uom-cc-card-body' });
        body.style.padding = tok('--space-6', '24px');

        card.appendChild(hdr);
        card.appendChild(body);
        return card;
    }

    function buildField(label, placeholder, inputId, type) {
        var wrap = el('div');
        var lbl  = el('label');
        lbl.setAttribute('for', inputId);
        lbl.textContent    = label;
        lbl.style.display  = 'block';
        lbl.style.fontSize = tok('--text-sm', '0.875rem');
        lbl.style.fontWeight = tok('--font-weight-medium', '500');
        lbl.style.color    = tok('--text-primary', '#111827');
        lbl.style.marginBottom = tok('--space-1', '4px');

        var inp = el('input', { type: type || 'text', id: inputId });
        inp.placeholder = placeholder || '';
        inp.style.width  = '100%';
        inp.style.padding= tok('--space-2', '8px') + ' ' + tok('--space-3', '12px');
        inp.style.border = '1px solid ' + tok('--border-default', '#d1d5db');
        inp.style.borderRadius = tok('--radius-md', '6px');
        inp.style.fontSize = tok('--text-sm', '0.875rem');
        inp.style.boxSizing= 'border-box';
        inp.style.color    = tok('--text-primary', '#111827');
        inp.style.background = tok('--surface-input', '#fff');

        wrap.appendChild(lbl);
        wrap.appendChild(inp);
        return wrap;
    }

    function buildSelectField(label, selId) {
        var wrap = el('div');
        var lbl  = el('label');
        lbl.setAttribute('for', selId);
        lbl.textContent      = label;
        lbl.style.display    = 'block';
        lbl.style.fontSize   = tok('--text-sm', '0.875rem');
        lbl.style.fontWeight = tok('--font-weight-medium', '500');
        lbl.style.color      = tok('--text-primary', '#111827');
        lbl.style.marginBottom = tok('--space-1', '4px');

        var sel = el('select', { id: selId });
        sel.style.width    = '100%';
        sel.style.padding  = tok('--space-2', '8px') + ' ' + tok('--space-3', '12px');
        sel.style.border   = '1px solid ' + tok('--border-default', '#d1d5db');
        sel.style.borderRadius = tok('--radius-md', '6px');
        sel.style.fontSize = tok('--text-sm', '0.875rem');
        sel.style.boxSizing= 'border-box';
        sel.style.color    = tok('--text-primary', '#111827');
        sel.style.background = tok('--surface-input', '#fff');
        sel.style.cursor   = 'pointer';

        var opt0 = el('option'); opt0.value = ''; opt0.textContent = 'Đang tải…'; sel.appendChild(opt0);
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        return wrap;
    }

    function buildTable(headers, tableId) {
        var table = el('table', { id: tableId });
        table.style.width       = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize    = tok('--text-sm', '0.875rem');

        var thead = el('thead');
        var trh   = el('tr');
        trh.style.background = tok('--surface-base', '#f9fafb');
        headers.forEach(function (h) {
            var th = el('th');
            th.textContent    = h;
            th.style.padding  = tok('--space-3', '12px');
            th.style.borderBottom = '2px solid ' + tok('--border-subtle', '#e5e7eb');
            th.style.textAlign= 'left';
            th.style.fontWeight = tok('--font-weight-semibold', '600');
            th.style.color    = tok('--text-secondary', '#6b7280');
            th.style.whiteSpace = 'nowrap';
            trh.appendChild(th);
        });
        thead.appendChild(trh);
        table.appendChild(thead);

        var tbody = el('tbody');
        tbody.innerHTML = '<tr><td colspan="' + headers.length + '" style="text-align:center;padding:20px;color:' + tok('--text-secondary', '#6b7280') + '">Đang tải…</td></tr>';
        table.appendChild(tbody);

        return table;
    }

    function buildPrimaryButton(label) {
        var btn = el('button', { type: 'button' });
        btn.textContent        = label;
        btn.style.padding      = tok('--space-2', '8px') + ' ' + tok('--space-6', '24px');
        btn.style.background   = tok('--brand-primary', '#2563eb');
        btn.style.color        = tok('--text-on-brand', '#fff');
        btn.style.border       = 'none';
        btn.style.borderRadius = tok('--radius-md', '6px');
        btn.style.fontSize     = tok('--text-sm', '0.875rem');
        btn.style.fontWeight   = tok('--font-weight-semibold', '600');
        btn.style.cursor       = 'pointer';
        btn.style.transition   = 'opacity ' + tok('--motion-duration-short', '150ms') + ' ease';
        return btn;
    }

    function buildRiskBadge(risk) {
        var colors = {
            low:    [tok('--status-success-bg',  '#d1fae5'), tok('--status-success-text', '#065f46')],
            medium: [tok('--status-warning-bg',  '#fef3c7'), tok('--status-warning-text', '#92400e')],
            high:   [tok('--status-danger-bg',   '#fee2e2'), tok('--status-danger-text',  '#991b1b')],
        };
        var c   = colors[risk] || colors.low;
        var lbl = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' }[risk] || risk;
        return '<span style="padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:600;background:' +
               c[0] + ';color:' + c[1] + '">' + escapeHtml(lbl) + '</span>';
    }

    function buildStatusBadge(status) {
        var c = status === 'active'
            ? [tok('--status-success-bg', '#d1fae5'), tok('--status-success-text', '#065f46')]
            : [tok('--surface-muted', '#f3f4f6'), tok('--text-secondary', '#6b7280')];
        var lbl = status === 'active' ? 'Đang hoạt động' : escapeHtml(status);
        return '<span style="padding:2px 6px;border-radius:4px;font-size:0.7rem;background:' +
               c[0] + ';color:' + c[1] + '">' + lbl + '</span>';
    }

    function el(tag, attrs) {
        var e = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (k) {
                if (k === 'className') { e.className = attrs[k]; }
                else { e.setAttribute(k, attrs[k]); }
            });
        }
        return e;
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function applyPageStyles(el) {
        el.style.fontFamily = tok('--font-family-base', 'inherit');
        el.style.color      = tok('--text-primary', '#111827');
        el.style.background = tok('--surface-base', '#f9fafb');
        el.style.minHeight  = '100%';
    }

    function applyContentStyles(el) {
        el.style.flex      = '1';
        el.style.overflowY = 'auto';
    }

    global.UomControlCenter = { render: renderControlCenter };

}(window));
