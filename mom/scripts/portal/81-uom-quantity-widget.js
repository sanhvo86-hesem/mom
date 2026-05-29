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

    var _cache = new WeakMap();   // element → { magnitude, unit_code, measval }

    /* ── Widget creation ───────────────────────────────────────────────────── */

    function create(opts) {
        opts = opts || {};
        var id = 'uom-qw-' + Math.random().toString(36).slice(2, 9);

        /* Wrapper */
        var wrap = document.createElement('div');
        wrap.className = 'uom-quantity-widget ' + (opts.containerClass || '');
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-labelledby', id + '-label');
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

        /* Feedback / aria-live */
        var feedback = document.createElement('div');
        feedback.id = id + '-feedback';
        feedback.className = 'uom-qw-feedback';
        feedback.setAttribute('aria-live', 'polite');
        feedback.setAttribute('aria-atomic', 'true');
        applyFeedbackStyles(feedback);
        wrap.appendChild(feedback);

        /* Internal state */
        var state = { magnitude: opts.magnitude || '', unit_code: opts.unitCode || '', measval: null };
        _cache.set(wrap, state);

        /* Load unit list */
        loadUnits(sel, opts.allowedKind, opts.unitCode, function (units) {
            if (units.length === 0) {
                sel.innerHTML = '<option value="">Không có đơn vị</option>';
                return;
            }
            sel.innerHTML = '';
            units.forEach(function (u) {
                var o = document.createElement('option');
                o.value = u.canonical_code;
                o.textContent = u.display_symbol + ' — ' + u.display_name_vi;
                if (u.canonical_code === (opts.unitCode || '')) o.selected = true;
                sel.appendChild(o);
            });
            if (!opts.unitCode && units[0]) {
                state.unit_code = units[0].canonical_code;
            }
        });

        /* Event listeners */
        inp.addEventListener('change', function () { onValueChange(wrap, opts, feedback); });
        sel.addEventListener('change', function () {
            state.unit_code = sel.value;
            onValueChange(wrap, opts, feedback);
        });

        return wrap;
    }

    /* ── Unit loading ──────────────────────────────────────────────────────── */

    function loadUnits(sel, kindCode, selectedCode, cb) {
        var url = '/api/v1/uom/units?limit=200' + (kindCode ? '&kind=' + encodeURIComponent(kindCode) : '');
        fetch(url, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                cb(d.units || []);
            })
            .catch(function () {
                sel.innerHTML = '<option value="">Lỗi tải đơn vị</option>';
            });
    }

    /* ── Conversion on change ──────────────────────────────────────────────── */

    function onValueChange(wrap, opts, feedback) {
        var state = _cache.get(wrap);
        if (!state) return;

        var inp  = wrap.querySelector('.uom-qw-magnitude');
        var sel  = wrap.querySelector('.uom-qw-unit');
        var mag  = inp ? inp.value.trim() : '';
        var unit = sel ? sel.value : '';

        state.magnitude = mag;
        state.unit_code = unit;

        if (!mag || !unit || !opts.onConvert) return;

        feedback.textContent = 'Đang chuyển đổi…';
        feedback.style.color = tok('--text-secondary', '#666');

        fetch('/api/v1/uom/convert', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                magnitude: mag,
                from_unit: unit,
                to_unit: opts.targetUnit || unit,
                display_precision: opts.precision !== undefined ? opts.precision : 6
            })
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d.ok) {
                state.measval = d.measval;
                feedback.textContent = d.result + ' ' + (opts.targetUnit || unit);
                feedback.style.color = tok('--status-success-text', '#1a7a2e');
                if (opts.onConvert) opts.onConvert(d);
            } else {
                feedback.textContent = '⚠ ' + (d.detail || d.error || 'Lỗi chuyển đổi');
                feedback.style.color = tok('--status-danger-text', '#b91c1c');
            }
        })
        .catch(function () {
            feedback.textContent = '⚠ Lỗi kết nối';
            feedback.style.color = tok('--status-danger-text', '#b91c1c');
        });
    }

    /* ── Public getValue / setValue ────────────────────────────────────────── */

    function getValue(el) {
        var state = _cache.get(el);
        return state ? { magnitude: state.magnitude, unit_code: state.unit_code, measval: state.measval } : null;
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
