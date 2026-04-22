/* ============================================================================
 * DCC Header Renderer — HESEM Portal
 * ----------------------------------------------------------------------------
 * Renders the Document Change Control (DCC) header ribbon at the top of every
 * controlled QMS document. Values are ALWAYS fetched live from the backend
 * API (/api/v1/dcc/documents/{doc_code}/header). Nothing is hardcoded:
 *   - Label text comes from dcc_document_header_label (i18n registry)
 *   - Metadata values come from dcc_document_header
 *   - Visual parameters come from Graphics Authority tokens (--dcc-* vars)
 *
 * Usage — drop a placeholder inside an HTML document:
 *   <div class="dcc-header"
 *        data-dcc-doc-code="QMS-MAN-001"
 *        data-dcc-locale="en"></div>
 *
 * The renderer auto-boots on DOMContentLoaded; you may also call
 *   window.DccHeader.render(container)  — for late-added nodes.
 *
 * Standards: ISO 9001:2015 §7.5, AS9100D §7.5, FDA 21 CFR Part 820.40.
 *
 * @since 4.1.0
 * @exposes window.DccHeader
 * ========================================================================== */
(function(){
'use strict';

var API_PREFIX = '/api/v1/dcc';
var DEFAULT_LOCALE = 'en';

/* ── Label-registry cache (per-locale) ─────────────────────────────────── */
var _labelsCache = {}; // locale -> {label_key: {short, long, sort}}
var _labelsPending = {}; // locale -> Promise

function _portalBaseHref(){
    if (window.HmRuntimePaths && typeof window.HmRuntimePaths.api === 'function') {
        return window.HmRuntimePaths.api('');
    }
    // Fallback: assume the portal is mounted at site root.
    return '';
}

function _apiUrl(path){
    return _portalBaseHref() + path;
}

function _fetchJson(url, opts){
    var options = Object.assign({
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
    }, opts || {});
    return fetch(url, options).then(function(res){
        if (!res.ok) {
            var err = new Error('dcc_api_error_' + res.status);
            err.status = res.status;
            throw err;
        }
        return res.json();
    });
}

function _loadLabels(locale){
    var key = (locale || DEFAULT_LOCALE).toLowerCase();
    if (_labelsCache[key]) {
        return Promise.resolve(_labelsCache[key]);
    }
    if (_labelsPending[key]) {
        return _labelsPending[key];
    }
    var url = _apiUrl(API_PREFIX + '/labels?locale=' + encodeURIComponent(key));
    _labelsPending[key] = _fetchJson(url)
        .then(function(body){
            var map = {};
            var list = (body && body.labels) || [];
            for (var i = 0; i < list.length; i++) {
                var row = list[i];
                map[row.label_key] = {
                    short: String(row.short_label || ''),
                    long: String(row.long_label || ''),
                    sort: Number(row.sort_order || 0)
                };
            }
            _labelsCache[key] = map;
            delete _labelsPending[key];
            return map;
        })
        .catch(function(err){
            delete _labelsPending[key];
            throw err;
        });
    return _labelsPending[key];
}

function _loadHeader(docCode, locale){
    var url = _apiUrl(
        API_PREFIX + '/documents/' + encodeURIComponent(docCode) +
        '/header?locale=' + encodeURIComponent(locale || DEFAULT_LOCALE)
    );
    return _fetchJson(url).then(function(body){
        if (!body || !body.header) {
            throw new Error('dcc_header_missing_in_response');
        }
        return body.header;
    });
}

/* ── Rendering helpers ─────────────────────────────────────────────────── */

function _el(tag, className, text){
    var n = document.createElement(tag);
    if (className) { n.className = className; }
    if (text !== undefined && text !== null) { n.textContent = String(text); }
    return n;
}

function _labelText(labels, key){
    var row = labels && labels[key];
    return (row && row.short) || key;
}

function _cell(labels, key, valueNode){
    var cell = _el('div', 'dcc-header__cell');
    cell.setAttribute('data-dcc-cell', key);
    var label = _el('span', 'dcc-header__label', _labelText(labels, key));
    label.setAttribute('title', (labels && labels[key] && labels[key].long) || key);
    cell.appendChild(label);
    var value = _el('span', 'dcc-header__value');
    if (valueNode instanceof Node) {
        value.appendChild(valueNode);
    } else {
        value.textContent = String(valueNode == null ? '' : valueNode);
    }
    cell.appendChild(value);
    return cell;
}

function _roleBadge(role){
    var badge = _el('span', 'dcc-header__role');
    var clean = String(role || '').trim();
    // Defensive: the backend forbids dual-role strings, but if one ever slips
    // through (e.g. a migration bug), show only the first token.
    if (/[\/|,;\s]/.test(clean)) {
        clean = clean.split(/[\/|,;\s]+/)[0];
    }
    badge.textContent = clean;
    return badge;
}

function _codeBadge(code){
    var badge = _el('span', 'dcc-header__code', code);
    return badge;
}

function _renderInto(container, header, labels){
    // Clear prior content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Title block (logo + titles)
    var titleBlock = _el('div', 'dcc-header__title-block');
    var logo = _el('div', 'dcc-header__logo');
    var logoSrc = container.getAttribute('data-dcc-logo') || '/mom/assets/hesem-logo.svg';
    var img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'HESEM';
    img.onerror = function(){ logo.removeChild(img); };
    logo.appendChild(img);
    titleBlock.appendChild(logo);

    var titles = _el('div', 'dcc-header__titles');
    titles.appendChild(_el('h2', 'dcc-header__title', header.title || ''));
    if (header.subtitle) {
        titles.appendChild(_el('p', 'dcc-header__subtitle', header.subtitle));
    }
    titleBlock.appendChild(titles);
    container.appendChild(titleBlock);

    // Ribbon (ID | Rev | Eff | Owner | Appr)
    var ribbon = _el('div', 'dcc-header__ribbon');
    ribbon.appendChild(_cell(labels, 'doc_id',         _codeBadge(header.doc_code)));
    ribbon.appendChild(_cell(labels, 'revision',        header.revision));
    ribbon.appendChild(_cell(labels, 'effective_date',  header.effective_date));
    ribbon.appendChild(_cell(labels, 'owner',           _roleBadge(header.owner_role_code)));
    ribbon.appendChild(_cell(labels, 'approver',        _roleBadge(header.approver_role_code)));
    container.appendChild(ribbon);

    container.setAttribute('data-dcc-state', 'ready');
    container.setAttribute('data-dcc-status', String(header.status || ''));
}

function _renderError(container, err){
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    var box = _el('div', 'dcc-header__error');
    box.textContent = 'DCC header unavailable: ' + (err && err.message ? err.message : 'unknown_error');
    box.style.padding = '12px 16px';
    box.style.color = 'var(--status-error, #dc2626)';
    box.style.fontSize = '12px';
    container.appendChild(box);
    container.setAttribute('data-dcc-state', 'error');
}

function _readBootstrap(container){
    /* Optional bootstrap payload embedded as a JSON attribute. Used only for
     * first-paint before the API responds — the API always overrides when
     * the backend is reachable. NOT a source of truth; the DB is. Safe to
     * omit once the DCC migration has populated dcc_document_header. */
    var raw = container.getAttribute('data-dcc-bootstrap');
    if (!raw) { return null; }
    try {
        var parsed = JSON.parse(raw);
        return (parsed && parsed.header) ? parsed : { header: parsed, labels: null };
    } catch (e) {
        return null;
    }
}

function render(container){
    if (!container || !(container instanceof Element)) {
        return Promise.reject(new Error('dcc_invalid_container'));
    }
    var docCode = container.getAttribute('data-dcc-doc-code');
    var locale = container.getAttribute('data-dcc-locale') || DEFAULT_LOCALE;
    if (!docCode) {
        _renderError(container, new Error('missing_data_dcc_doc_code_attribute'));
        return Promise.reject(new Error('missing_data_dcc_doc_code_attribute'));
    }

    // Immediate bootstrap paint (if present) so the ribbon doesn't flicker
    // while we fetch the authoritative payload from the backend.
    var bootstrap = _readBootstrap(container);
    if (bootstrap && bootstrap.header) {
        var seedLabels = bootstrap.labels || {};
        try { _renderInto(container, bootstrap.header, seedLabels); } catch(e){}
        container.setAttribute('data-dcc-state', 'bootstrap');
    } else {
        container.setAttribute('data-dcc-state', 'loading');
    }

    return Promise.all([
        _loadHeader(docCode, locale),
        _loadLabels(locale)
    ]).then(function(results){
        var header = results[0];
        var labels = results[1];
        _renderInto(container, header, labels);
        return header;
    }).catch(function(err){
        // If we already painted from bootstrap, keep that on-screen rather
        // than blanking the header when the backend is offline.
        if (bootstrap && bootstrap.header) {
            container.setAttribute('data-dcc-state', 'bootstrap-only');
            console.warn('[DccHeader] API unreachable; rendered from bootstrap seed', err);
            return bootstrap.header;
        }
        _renderError(container, err);
        throw err;
    });
}

function renderAll(root){
    var scope = root || document;
    var nodes = scope.querySelectorAll('.dcc-header[data-dcc-doc-code]');
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
        out.push(render(nodes[i]));
    }
    return Promise.allSettled ? Promise.allSettled(out) : Promise.all(out.map(function(p){
        return p.then(function(v){ return {status:'fulfilled', value:v}; },
                      function(e){ return {status:'rejected', reason:e}; });
    }));
}

function bootstrap(){
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ renderAll(document); });
    } else {
        renderAll(document);
    }
}

window.DccHeader = {
    render: render,
    renderAll: renderAll,
    _clearCache: function(){ _labelsCache = {}; _labelsPending = {}; }
};

bootstrap();
})();
