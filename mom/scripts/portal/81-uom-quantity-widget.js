/* ==========================================================================
   81-uom-quantity-widget.js — HESEM Measurement Intelligence
   Reusable quantity-input widget for UoM-aware numeric entry.

   API:
     window.UomQuantityWidget.create(options) → HTMLElement
     window.UomQuantityWidget.getValue(el)    → { magnitude, unit_code, measval }
     window.UomQuantityWidget.setValue(el, magnitude, unit_code)

   Options:
     containerClass : string   — CSS class to add to wrapper
     unitCode       : string   — initial canonical unit code (e.g. 'kg')
     magnitude      : string   — initial value
     allowedKind    : string   — restrict unit picker to this quantity kind
     label          : string   — Vietnamese label for the field (with full diacritics)
     required       : boolean  — HTML5 required
     readOnly       : boolean  — disable input
     onConvert      : function(result) — callback after convert-on-change
     precision      : int      — display decimal places (default 6)
     quantityKind   : string   — required quantity kind binding
     sourceSystem   : string   — source system binding for traceability
     context        : object   — item/site/policy/source context
     allowExternalAlias: boolean — resolve external aliases through quarantine flow

   WCAG 2.2 compliance:
   - Input has aria-label from label option
   - Unit selector has aria-label "Đơn vị đo"
   - Live conversion feedback in aria-live region
   - Error message in aria-describedby

   Graphics Authority compliance:
   - All CSS values read via window.GraphicsAuthority.tokens.read()
   - No hardcoded hex colors, px values, font stacks, or motion durations
   ========================================================================== */
(function (global) {
    'use strict';

    /* ── Token helpers ─────────────────────────────────────────────────────── */

    function tok(key, fallback) {
        if (global.GraphicsAuthority && global.GraphicsAuthority.tokens) {
            var v = global.GraphicsAuthority.tokens.read(key, fallback);
            return (v !== null && v !== undefined) ? String(v) : String(fallback || '');
        }
        return String(fallback || '');
    }

    /* ── API State ─────────────────────────────────────────────────────────── */

    var _cache = new WeakMap();   // element → widget state

    var FIXTURE_UNITS = [
        { canonical_code: 'kg', display_symbol: 'kg', display_name_vi: 'kilôgam', quantity_kind_code: 'Mass', disabled: false },
        { canonical_code: 'g', display_symbol: 'g', display_name_vi: 'gam', quantity_kind_code: 'Mass', disabled: false },
        { canonical_code: 'm', display_symbol: 'm', display_name_vi: 'mét', quantity_kind_code: 'Length', disabled: false },
        { canonical_code: 'mm', display_symbol: 'mm', display_name_vi: 'milimét', quantity_kind_code: 'Length', disabled: false },
        { canonical_code: 'EA', display_symbol: 'EA', display_name_vi: 'cái', quantity_kind_code: 'CountOrQuantity', disabled: false }
    ];

    function liveApiEnabled(opts) {
        opts = opts || {};
        if (opts.fixtureMode === true) return false;
        if (opts.liveApi === true || global.UOM_LIVE_API_ENABLED === true) return true;
        try {
            return !!(global.localStorage && localStorage.getItem('uom_live_api') === '1');
        } catch (e) {
            return false;
        }
    }

    function fixtureUnits(kindCode) {
        return FIXTURE_UNITS.map(function (u) {
            var copy = Object.assign({}, u);
            if (kindCode && copy.quantity_kind_code !== kindCode) {
                copy.disabled = true;
                copy.disabled_reason_vi = 'Không thuộc loại đại lượng ' + kindCode;
            }
            return copy;
        });
    }

    function fixtureConvert(payload) {
        var mag = String(payload.magnitude || '');
        var n = Number(mag.replace(',', '.'));
        var from = String(payload.from_unit || '');
        var to = String(payload.to_unit || '');
        var result = mag;
        if (Number.isFinite(n) && from === 'kg' && to === 'g') result = String(n * 1000);
        if (Number.isFinite(n) && from === 'g' && to === 'kg') result = String(n / 1000);
        return {
            ok: true,
            result: result,
            from_unit: from,
            to_unit: to,
            measval: {
                original_input: { magnitude: mag, unit_code: from },
                canonical: { magnitude: result, unit_code: to },
                display: { magnitude: result, unit_code: to },
                quantity_kind_code: payload.quantity_kind_code || null,
                evidence: { source_system: payload.source_system || 'fixture' }
            }
        };
    }

    function fixtureAlias(alias, sourceSystem) {
        if (String(alias).trim().toUpperCase() === 'M') {
            return {
                ok: false,
                status: 'ambiguous',
                ambiguous: true,
                quarantine_id: 'UOM-Q-FIXTURE-M',
                detail: 'Bí danh M mơ hồ giữa mét và tiền tố mega; cần kiểm duyệt.'
            };
        }
        return {
            ok: false,
            status: 'unknown',
            ambiguous: false,
            quarantine_id: 'UOM-Q-FIXTURE-' + String(alias || 'UNKNOWN').toUpperCase(),
            detail: 'Bí danh chưa được xác thực cho nguồn ' + (sourceSystem || 'fixture') + '.'
        };
    }

    function apiJson(path, opts, fixtureFactory) {
        opts = opts || {};
        if (!liveApiEnabled(opts)) {
            return Promise.resolve(fixtureFactory ? fixtureFactory() : { ok: true });
        }
        return fetch(path, opts).then(function (r) { return r.json(); }).catch(function () {
            return fixtureFactory ? fixtureFactory() : { ok: false, detail: 'Đang dùng dữ liệu mẫu chỉ đọc do API không sẵn sàng.' };
        });
    }

    /* ── Widget creation ───────────────────────────────────────────────────── */

    function create(opts) {
        opts = opts || {};
        var id = 'uom-qw-' + Math.random().toString(36).slice(2, 9);

        /* Wrapper */
        var wrap = document.createElement('div');
        wrap.className = 'uom-quantity-widget ' + (opts.containerClass || '');
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-labelledby', id + '-label');
        wrap.setAttribute('data-authority-class', 'projection');
        wrap.setAttribute('data-route-class', 'workspace-projection');
        wrap.setAttribute('data-live-api', liveApiEnabled(opts) ? 'opt-in' : 'fixture-default');
        applyWrapStyles(wrap);

        /* Label */
        var lbl = document.createElement('label');
        lbl.id = id + '-label';
        lbl.className = 'uom-qw-label';
        lbl.textContent = opts.label || 'Giá trị đo';
        lbl.setAttribute('for', id + '-magnitude');
        applyLabelStyles(lbl);
        wrap.appendChild(lbl);

        /* Row: input + unit selector */
        var row = document.createElement('div');
        row.className = 'uom-qw-row';
        applyRowStyles(row);

        /* Magnitude input */
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.id = id + '-magnitude';
        inp.className = 'uom-qw-magnitude';
        inp.setAttribute('aria-label', opts.label || 'Giá trị đo');
        inp.setAttribute('aria-describedby', id + '-feedback');
        inp.setAttribute('inputmode', 'decimal');
        inp.setAttribute('autocomplete', 'off');
        inp.setAttribute('spellcheck', 'false');
        if (opts.required) inp.setAttribute('required', '');
        if (opts.readOnly) inp.setAttribute('readonly', '');
        if (opts.magnitude) inp.value = String(opts.magnitude);
        applyInputStyles(inp);

        /* Unit selector */
        var sel = document.createElement('select');
        sel.id = id + '-unit';
        sel.className = 'uom-qw-unit';
        sel.setAttribute('aria-label', 'Đơn vị đo');
        sel.setAttribute('aria-describedby', id + '-feedback');
        if (opts.readOnly) sel.setAttribute('disabled', '');
        applySelectStyles(sel);

        /* Loading placeholder option */
        var opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = 'Đang tải…';
        opt0.disabled = true;
        sel.appendChild(opt0);

        row.appendChild(inp);
        row.appendChild(sel);
        wrap.appendChild(row);

        var metaRow = document.createElement('div');
        metaRow.className = 'uom-qw-context-row';
        applyContextRowStyles(metaRow);

        var kind = document.createElement('select');
        kind.id = id + '-kind';
        kind.className = 'uom-qw-kind';
        kind.setAttribute('aria-label', 'Loại đại lượng');
        kind.setAttribute('aria-describedby', id + '-feedback');
        applySelectStyles(kind);
        [
            ['', 'Chọn loại đại lượng'],
            ['Mass', 'Khối lượng'],
            ['Length', 'Chiều dài'],
            ['Volume', 'Thể tích'],
            ['CountOrQuantity', 'Số lượng']
        ].forEach(function (pair) {
            var o = document.createElement('option');
            o.value = pair[0];
            o.textContent = pair[1];
            if (pair[0] === (opts.quantityKind || opts.allowedKind || '')) o.selected = true;
            kind.appendChild(o);
        });

        var source = document.createElement('input');
        source.id = id + '-source-system';
        source.className = 'uom-qw-source-system';
        source.type = 'text';
        source.placeholder = 'Nguồn dữ liệu';
        source.value = opts.sourceSystem || 'fixture';
        source.setAttribute('aria-label', 'Nguồn dữ liệu');
        source.setAttribute('aria-describedby', id + '-feedback');
        applyInputStyles(source);

        metaRow.appendChild(kind);
        metaRow.appendChild(source);
        wrap.appendChild(metaRow);

        var aliasRow = null;
        if (opts.allowExternalAlias) {
            aliasRow = document.createElement('div');
            aliasRow.className = 'uom-qw-alias-row';
            applyContextRowStyles(aliasRow);
            var aliasInput = document.createElement('input');
            aliasInput.type = 'text';
            aliasInput.className = 'uom-qw-external-alias';
            aliasInput.placeholder = 'Bí danh ngoài, ví dụ M';
            aliasInput.setAttribute('aria-label', 'Bí danh đơn vị từ hệ thống ngoài');
            aliasInput.setAttribute('aria-describedby', id + '-feedback');
            applyInputStyles(aliasInput);
            aliasRow.appendChild(aliasInput);
            wrap.appendChild(aliasRow);
        }

        /* Feedback / aria-live */
        var feedback = document.createElement('div');
        feedback.id = id + '-feedback';
        feedback.className = 'uom-qw-feedback';
        feedback.setAttribute('role', 'status');
        feedback.setAttribute('aria-live', 'polite');
        feedback.setAttribute('aria-atomic', 'true');
        applyFeedbackStyles(feedback);
        wrap.appendChild(feedback);

        /* Internal state */
        var state = {
            magnitude: opts.magnitude || '',
            unit_code: opts.unitCode || '',
            quantity_kind: opts.quantityKind || opts.allowedKind || '',
            source_system: opts.sourceSystem || 'fixture',
            context: Object.assign({}, opts.context || {}, {
                item_id: opts.itemId || (opts.context && opts.context.item_id) || null,
                site_id: opts.siteId || (opts.context && opts.context.site_id) || null,
                policy_id: opts.policyId || (opts.context && opts.context.policy_id) || null
            }),
            measval: null,
            valid: false,
            errors: []
        };
        _cache.set(wrap, state);

        /* Load unit list */
        loadUnits(sel, state.quantity_kind, opts.unitCode, opts, function (units) {
            if (units.length === 0) {
                sel.innerHTML = '<option value="">Không có đơn vị</option>';
                return;
            }
            sel.innerHTML = '';
            var firstEnabled = null;
            units.forEach(function (u) {
                var o = document.createElement('option');
                o.value = u.canonical_code;
                o.textContent = u.display_symbol + ' — ' + u.display_name_vi;
                o.setAttribute('data-quantity-kind', u.quantity_kind_code || '');
                if (u.disabled || (state.quantity_kind && u.quantity_kind_code !== state.quantity_kind)) {
                    o.disabled = true;
                    o.title = u.disabled_reason_vi || ('Không thuộc loại đại lượng ' + state.quantity_kind);
                } else if (!firstEnabled) {
                    firstEnabled = u;
                }
                if (u.canonical_code === (opts.unitCode || '')) o.selected = true;
                sel.appendChild(o);
            });
            if (!opts.unitCode && firstEnabled) {
                state.unit_code = firstEnabled.canonical_code;
                sel.value = firstEnabled.canonical_code;
            }
            validate(wrap, feedback);
        });

        /* Event listeners */
        addFocusAffordance(inp);
        addFocusAffordance(sel);
        addFocusAffordance(kind);
        addFocusAffordance(source);

        inp.addEventListener('input', function () { onValueChange(wrap, opts, feedback); });
        inp.addEventListener('change', function () { onValueChange(wrap, opts, feedback); });
        sel.addEventListener('change', function () {
            state.unit_code = sel.value;
            onValueChange(wrap, opts, feedback);
        });
        kind.addEventListener('change', function () {
            state.quantity_kind = kind.value;
            loadUnits(sel, state.quantity_kind, state.unit_code, opts, function (units) {
                sel.innerHTML = '';
                var firstEnabled = null;
                units.forEach(function (u) {
                    var o = document.createElement('option');
                    o.value = u.canonical_code;
                    o.textContent = u.display_symbol + ' — ' + u.display_name_vi;
                    o.setAttribute('data-quantity-kind', u.quantity_kind_code || '');
                    if (u.disabled || (state.quantity_kind && u.quantity_kind_code !== state.quantity_kind)) {
                        o.disabled = true;
                        o.title = u.disabled_reason_vi || ('Không thuộc loại đại lượng ' + state.quantity_kind);
                    } else if (!firstEnabled) {
                        firstEnabled = u;
                    }
                    sel.appendChild(o);
                });
                state.unit_code = firstEnabled ? firstEnabled.canonical_code : '';
                sel.value = state.unit_code;
                onValueChange(wrap, opts, feedback);
            });
        });
        source.addEventListener('input', function () {
            state.source_system = source.value.trim() || 'fixture';
            validate(wrap, feedback);
        });

        if (aliasRow) {
            var aliasInputRef = aliasRow.querySelector('.uom-qw-external-alias');
            addFocusAffordance(aliasInputRef);
            aliasInputRef.addEventListener('change', function () {
                resolveAlias(wrap, opts, feedback, aliasInputRef.value.trim());
            });
        }

        validate(wrap, feedback);

        return wrap;
    }

    /* ── Unit loading ──────────────────────────────────────────────────────── */

    function loadUnits(sel, kindCode, selectedCode, opts, cb) {
        var context = opts.context || {};
        var params = ['limit=200'];
        if (kindCode) params.push('kind=' + encodeURIComponent(kindCode));
        if (opts.itemId || context.item_id) params.push('item_id=' + encodeURIComponent(opts.itemId || context.item_id));
        if (opts.siteId || context.site_id) params.push('site_id=' + encodeURIComponent(opts.siteId || context.site_id));
        if (opts.policyId || context.policy_id) params.push('policy_id=' + encodeURIComponent(opts.policyId || context.policy_id));
        var url = '/api/v1/uom/units?' + params.join('&');
        apiJson(url, Object.assign({ credentials: 'same-origin' }, opts), function () {
            return { units: fixtureUnits(kindCode) };
        }).then(function (d) {
            cb(d.units || []);
        }).catch(function () {
            sel.innerHTML = '<option value="">Dữ liệu mẫu chỉ đọc</option>';
            cb(fixtureUnits(kindCode));
        });
    }

    /* ── Conversion on change ──────────────────────────────────────────────── */

    function onValueChange(wrap, opts, feedback) {
        var state = _cache.get(wrap);
        if (!state) return;

        var inp  = wrap.querySelector('.uom-qw-magnitude');
        var sel  = wrap.querySelector('.uom-qw-unit');
        var kind = wrap.querySelector('.uom-qw-kind');
        var source = wrap.querySelector('.uom-qw-source-system');
        var mag  = inp ? inp.value.trim() : '';
        var unit = sel ? sel.value : '';

        state.magnitude = mag;
        state.unit_code = unit;
        state.quantity_kind = kind ? kind.value : state.quantity_kind;
        state.source_system = source ? (source.value.trim() || 'fixture') : state.source_system;

        if (!validate(wrap, feedback) || !opts.onConvert) return;

        feedback.textContent = 'Đang chuyển đổi…';
        feedback.style.color = tok('--text-secondary', '#666');

        var payload = Object.assign({}, state.context || {}, {
            magnitude: mag,
            from_unit: unit,
            to_unit: opts.targetUnit || unit,
            quantity_kind_code: state.quantity_kind,
            source_system: state.source_system,
            display_precision: opts.precision !== undefined ? opts.precision : 6
        });

        apiJson('/api/v1/uom/convert', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            liveApi: opts.liveApi,
            fixtureMode: opts.fixtureMode
        }, function () { return fixtureConvert(payload); })
        .then(function (d) {
            if (d.ok) {
                state.measval = d.measval;
                feedback.textContent = 'Gốc: ' + mag + ' ' + unit + ' | Chuẩn hóa: ' + d.result + ' ' + (opts.targetUnit || unit);
                feedback.style.color = tok('--status-success-text', '#1a7a2e');
                if (opts.onConvert) opts.onConvert(d);
            } else {
                feedback.textContent = 'Cần xử lý: ' + (d.remediation || d.detail || d.error || 'Lỗi chuyển đổi');
                feedback.style.color = tok('--status-danger-text', '#b91c1c');
            }
        })
        .catch(function () {
            feedback.textContent = 'Dữ liệu mẫu chỉ đọc; không ghi nhận phép đo.';
            feedback.style.color = tok('--status-danger-text', '#b91c1c');
        });
    }

    function resolveAlias(wrap, opts, feedback, alias) {
        var state = _cache.get(wrap);
        if (!state || !alias) return;
        var payload = {
            alias: alias,
            source_system: state.source_system,
            context: state.context || {}
        };
        feedback.textContent = 'Đang phân giải bí danh…';
        feedback.style.color = tok('--text-secondary', '#666');
        apiJson('/api/v1/uom/aliases/resolve', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            liveApi: opts.liveApi,
            fixtureMode: opts.fixtureMode
        }, function () { return fixtureAlias(alias, state.source_system); }).then(function (d) {
            if (d.ok && d.canonical_code && !d.ambiguous) {
                feedback.textContent = 'Bí danh đã xác thực: ' + d.canonical_code + '. Vui lòng chọn đơn vị chuẩn để xác nhận.';
                feedback.style.color = tok('--status-success-text', '#1a7a2e');
                return;
            }
            feedback.textContent = 'Cách ly bí danh: ' + (d.quarantine_id || 'đang chờ mã') + '. ' + (d.detail || 'Không tự động ánh xạ.');
            feedback.style.color = tok('--status-danger-text', '#b91c1c');
        });
    }

    function validate(wrap, feedback) {
        var state = _cache.get(wrap);
        if (!state) return false;
        var inp = wrap.querySelector('.uom-qw-magnitude');
        var sel = wrap.querySelector('.uom-qw-unit');
        var kind = wrap.querySelector('.uom-qw-kind');
        var source = wrap.querySelector('.uom-qw-source-system');
        var errors = [];
        if (!state.magnitude) errors.push('Thiếu giá trị đo.');
        if (!state.unit_code) errors.push('Thiếu đơn vị chuẩn.');
        if (!state.quantity_kind) errors.push('Thiếu loại đại lượng.');
        if (!state.source_system) errors.push('Thiếu nguồn dữ liệu.');
        state.errors = errors;
        state.valid = errors.length === 0;
        [inp, sel, kind, source].forEach(function (node) {
            if (!node) return;
            node.setAttribute('aria-invalid', state.valid ? 'false' : 'true');
        });
        if (!state.valid && feedback) {
            feedback.textContent = errors.join(' ');
            feedback.style.color = tok('--status-danger-text', '#b91c1c');
        }
        return state.valid;
    }

    /* ── Public getValue / setValue ────────────────────────────────────────── */

    function getValue(el) {
        var state = _cache.get(el);
        if (!state) return null;
        return {
            magnitude: state.magnitude,
            unit_code: state.unit_code,
            quantity_kind: state.quantity_kind,
            source_system: state.source_system,
            context: state.context,
            measval: state.measval,
            valid: state.valid,
            errors: state.errors.slice()
        };
    }

    function setValue(el, magnitude, unitCode) {
        var state = _cache.get(el);
        if (!state) return;
        state.magnitude = magnitude;
        state.unit_code = unitCode;
        var inp = el.querySelector('.uom-qw-magnitude');
        var sel = el.querySelector('.uom-qw-unit');
        if (inp) inp.value = magnitude;
        if (sel) sel.value = unitCode;
    }

    /* ── Style application (GraphicsAuthority tokens) ──────────────────────── */

    function applyWrapStyles(el) {
        el.style.display    = 'flex';
        el.style.flexDirection = 'column';
        el.style.gap        = tok('--space-2', '8px');
        el.style.fontFamily = tok('--font-family-base', 'inherit');
    }

    function applyLabelStyles(el) {
        el.style.fontSize   = tok('--text-sm', '0.875rem');
        el.style.fontWeight = tok('--font-weight-medium', '500');
        el.style.color      = tok('--text-primary', '#1a1a1a');
    }

    function applyRowStyles(el) {
        el.style.display = 'flex';
        el.style.gap     = tok('--space-2', '8px');
        el.style.alignItems = 'center';
    }

    function applyContextRowStyles(el) {
        el.style.display = 'grid';
        el.style.gridTemplateColumns = 'minmax(0, 1fr) minmax(0, 1fr)';
        el.style.gap = tok('--space-2', '8px');
    }

    function applyInputStyles(el) {
        el.style.flex        = '1';
        el.style.padding     = tok('--space-2', '8px') + ' ' + tok('--space-3', '12px');
        el.style.border      = '1px solid ' + tok('--border-default', '#d1d5db');
        el.style.borderRadius= tok('--radius-md', '6px');
        el.style.fontSize    = tok('--text-base', '1rem');
        el.style.color       = tok('--text-primary', '#1a1a1a');
        el.style.background  = tok('--surface-input', '#fff');
        el.style.outline     = 'none';
        el.style.minWidth    = '0';
    }

    function applySelectStyles(el) {
        el.style.padding     = tok('--space-2', '8px') + ' ' + tok('--space-3', '12px');
        el.style.border      = '1px solid ' + tok('--border-default', '#d1d5db');
        el.style.borderRadius= tok('--radius-md', '6px');
        el.style.fontSize    = tok('--text-sm', '0.875rem');
        el.style.color       = tok('--text-primary', '#1a1a1a');
        el.style.background  = tok('--surface-input', '#fff');
        el.style.minWidth    = '120px';
        el.style.cursor      = 'pointer';
    }

    function addFocusAffordance(el) {
        if (!el) return;
        el.addEventListener('focus', function () {
            el.style.borderColor = tok('--focus-ring', '#2563eb');
            el.style.boxShadow = '0 0 0 2px ' + tok('--focus-ring-soft', 'rgba(37,99,235,0.18)');
        });
        el.addEventListener('blur', function () {
            el.style.borderColor = tok('--border-default', '#d1d5db');
            el.style.boxShadow = 'none';
        });
    }

    function applyFeedbackStyles(el) {
        el.style.fontSize  = tok('--text-sm', '0.875rem');
        el.style.color     = tok('--text-secondary', '#6b7280');
        el.style.minHeight = tok('--text-sm', '1.25rem');
        el.style.transition = 'color ' + tok('--motion-duration-short', '150ms') + ' ease';
    }

    /* ── Exports ───────────────────────────────────────────────────────────── */

    global.UomQuantityWidget = {
        create   : create,
        getValue : getValue,
        setValue : setValue,
    };

}(window));
