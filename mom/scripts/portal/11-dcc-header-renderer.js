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
 *        data-dcc-locale="vi"></div>
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
var DEFAULT_LOCALE = 'vi';

function _disableBrowserTranslation(){
    try {
        if (document.documentElement) {
            document.documentElement.setAttribute('translate', 'no');
            if (document.documentElement.classList) document.documentElement.classList.add('notranslate');
        }
        var head = document.head || document.querySelector('head');
        if (head && !head.querySelector('meta[name="google"][content="notranslate"]')) {
            var meta = document.createElement('meta');
            meta.setAttribute('name', 'google');
            meta.setAttribute('content', 'notranslate');
            head.appendChild(meta);
        }
    } catch(e) {}
}

_disableBrowserTranslation();

/* ── Canonical doc-code extractor (mirrors backend scan_extract_code) ─────
 * Derive the SHORT canonical doc code from the current document URL's
 * basename. Used as the authoritative source for which DCC row to fetch,
 * so a file rename (e.g. qms-man-001-qms-manual.html → qms-man-0012-...)
 * self-heals the ribbon on next load without needing to rewrite the HTML
 * body's data-dcc-doc-code attribute. */
var _DOC_CODE_PATTERNS = [
    /^(sop-\d{3})/i,
    /^(frm-\d{3})/i,
    /^(wi-\d{3})/i,
    /^(annex-\d{3})/i,
    /^(ref-\d{3})/i,
    /^(qms-man-\d+)/i,
    /^(qms-gdl-\d+)/i,
    /^(pol-qms-\d+)/i,
    /^(frm-hr-jd-[a-z]+-\d+)/i,
    /^(frm-hr-trn-\d+)/i,
    /^(annex-dep-[a-z]+-\d+)/i,
    /^(annex-(?:job|org)-\d+)/i,
    /^(annex-hr-lab-\d+)/i,
    /^((?:sop|proc|wi|frm|annex|pol|qms|dept)-[a-z]+-\d+)/i,
    /^(jd-[a-z0-9-]+)/i,
    /^(dept-[a-z0-9-]+)/i,
    /^(raci-[a-z0-9-]+)/i,
    /^(authority-[a-z0-9-]+)/i
];

function _docCodeFromUrl(){
    try {
        var path = (window.location && window.location.pathname) || '';
        var basename = (path.split('/').pop() || '').replace(/\.[^.]+$/, '');
        if (!basename) return '';
        for (var i = 0; i < _DOC_CODE_PATTERNS.length; i++) {
            var m = basename.match(_DOC_CODE_PATTERNS[i]);
            if (m && m[1]) return String(m[1]).toUpperCase();
        }
    } catch(e) {}
    return '';
}

/* ── Self-discovery: derive base paths from our own script URL ────────── */
var _scriptUrl = (function(){
    try {
        if (document.currentScript && document.currentScript.src) {
            return document.currentScript.src;
        }
    } catch (e) {}
    try {
        var list = document.querySelectorAll('script[src*="11-dcc-header-renderer.js"]');
        if (list.length) return list[list.length - 1].src;
    } catch (e) {}
    return '';
})();

function _appBase(){
    // Renderer URL looks like `<origin><appBase>/scripts/portal/11-dcc-header-renderer.js`.
    // Strip the known suffix to recover the application base, which is the
    // deployment-specific prefix the browser needs for assets and the API.
    // Local preview: appBase = ''. VPS deployment: appBase = '/mom'.
    var match = _scriptUrl.match(/^(.*?)\/scripts\/portal\/11-dcc-header-renderer\.js/);
    if (match && match[1]) {
        try {
            return new URL(match[1]).pathname.replace(/\/$/, '');
        } catch (e) {
            return match[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '');
        }
    }
    return '';
}

var APP_BASE = _appBase();

function _assetUrl(relative){
    var clean = String(relative || '').replace(/^\/+/, '');
    return APP_BASE + '/' + clean;
}

/* ── Self-inject the stylesheet (path-independent) ─────────────────────── */
(function _ensureStylesheet(){
    try {
        if (document.querySelector('link[data-dcc-header-stylesheet]')) return;
        var correctHref = _assetUrl('styles/dcc-header.css');
        // If a plain <link> exists from legacy markup, REPLACE its href —
        // pre-4.1 HTML shipped a relative path that breaks once the document
        // is served through the portal's streaming pipeline.
        var existing = document.querySelector('link[rel="stylesheet"][href*="dcc-header"]');
        if (existing) {
            existing.href = correctHref;
            existing.setAttribute('data-dcc-header-stylesheet', '1');
            return;
        }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = correctHref;
        link.setAttribute('data-dcc-header-stylesheet', '1');
        (document.head || document.documentElement).appendChild(link);
    } catch (e) {}
})();

/* ── Companion widget: RACI / Authority sidebar ─────────────────────────────
 * Loaded here so every controlled document that renders the DCC header also
 * receives the RACI sidebar, with no per-document markup change. The widget
 * itself decides whether to display (it shows only on SOP and JD documents). */
(function _loadRaciSidebar(){
    try {
        if (document.querySelector('script[data-raci-sidebar-js]')) return;
        var s = document.createElement('script');
        s.src = _assetUrl('scripts/portal/12-raci-authority-sidebar.js');
        s.defer = true;
        s.setAttribute('data-raci-sidebar-js', '1');
        (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
})();

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
        cache: 'no-store',
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

    /* ── Per-doc header cache ─────────────────────────────────────────────────
     * Header metadata is fetched from the backend API and cached by code+locale.
     * The latest per-code payload remains exposed for callers that only need
     * locale-neutral fields such as owner/approver/revision.
     */
    var _headerCache = Object.create(null);
    var _latestHeaderByDoc = Object.create(null);

    function _cacheKey(docCode, locale){
        return String(docCode || '').toUpperCase() + '|' + String(locale || DEFAULT_LOCALE).toLowerCase();
    }

    function _cachedHeader(docCode, locale){
        var code = String(docCode || '').toUpperCase();
        if (!code) return null;
        return _headerCache[_cacheKey(code, locale)] || null;
    }

    function _cachedHeaderAnyLocale(docCode){
        var code = String(docCode || '').toUpperCase();
        if (!code) return null;
        return _latestHeaderByDoc[code] || null;
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
            var code = String(docCode).toUpperCase();
            _headerCache[_cacheKey(code, locale)] = body.header;
            _latestHeaderByDoc[code] = body.header;
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
    // Expose the FULL code via title so long JD/DEPT codes that get
    // CSS-truncated to 280px with an ellipsis are still readable on hover.
    if (code) badge.setAttribute('title', String(code));
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
    /* IGNORE the per-doc data-dcc-logo attribute. Different docs were
     * authored at different folder depths and ship inconsistent relative
     * paths (../../../ vs ../../../../../) that resolve differently under
     * the portal's doc_stream pipeline, leading to broken/missing logos.
     * The renderer ALWAYS computes the absolute URL itself so every doc
     * loads the same logo from the same place — `<APP_BASE>/assets/hesem-logo.svg`. */
    var logoSrc = _assetUrl('assets/hesem-logo.svg');
    var img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'HESEM';
    img.width = 100;     // intrinsic hint; CSS still wins
    img.height = 32;
    /* On load failure, leave the .dcc-header__logo div EMPTY (don't remove
     * the slot). The CSS `:empty::before` rule renders a styled "HESEM"
     * text fallback so the title block stays correctly aligned and the
     * brand identity is preserved. */
    img.onerror = function(){
        try { if (img.parentNode) img.parentNode.removeChild(img); } catch(e){}
    };
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
    /* URL-derived code is authoritative. The static data attribute is only a
     * fallback for cases where the filename doesn't match any known pattern.
     * This prevents the ribbon from showing stale data after a rename: the
     * DB row is keyed by doc_code, and rename_doc updates the filename but
     * not the inline data attribute, so the URL is the only reliable anchor. */
    var urlCode = _docCodeFromUrl();
    var attrCode = container.getAttribute('data-dcc-doc-code') || '';
    var docCode = urlCode || attrCode;
    if (urlCode && attrCode && urlCode !== attrCode) {
        // Heal the attribute for any downstream consumer that still reads it.
        try { container.setAttribute('data-dcc-doc-code', urlCode); } catch(e){}
    }
    var locale = container.getAttribute('data-dcc-locale')
        || document.documentElement.getAttribute('data-qms-view-lang')
        || document.documentElement.lang
        || DEFAULT_LOCALE;
    if (!docCode) {
        _renderError(container, new Error('missing_data_dcc_doc_code_attribute'));
        return Promise.reject(new Error('missing_data_dcc_doc_code_attribute'));
    }

    var renderToken = String(Date.now()) + ':' + Math.random().toString(36).slice(2);
    container.__dccRenderToken = renderToken;

    // Never repaint a visible header from static bootstrap during normal
    // runtime. Many controlled-doc HTML files carry old V0 bootstrap seeds;
    // painting those on every retry causes the English header to flash between
    // stale HTML metadata and the DB/API projection. Bootstrap is retained only
    // as an offline fallback when no API payload has ever been fetched.
    var bootstrap = _readBootstrap(container);
    if (bootstrap && bootstrap.header && urlCode && attrCode && urlCode !== attrCode) {
        bootstrap = null;
    }
    var cached = _cachedHeader(docCode, locale);
    // Do not first-paint cached metadata. Owner, approver, revision, title, and
    // locale can change independently of the HTML artifact, and repainting cache
    // before the no-store API response is the visible header flicker users saw.
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.setAttribute('data-dcc-state', 'loading');

    return Promise.all([
        _loadHeader(docCode, locale),
        _loadLabels(locale)
    ]).then(function(results){
        if (container.__dccRenderToken !== renderToken) {
            return results[0];
        }
        var header = results[0];
        var labels = results[1];
        _renderInto(container, header, labels);
        return header;
    }).catch(function(err){
        if (container.__dccRenderToken !== renderToken) {
            return cached || (bootstrap && bootstrap.header) || null;
        }
        if (cached) {
            try { _renderInto(container, cached, _labelsCache[String(locale || DEFAULT_LOCALE).toLowerCase()] || {}); } catch(e){}
            container.setAttribute('data-dcc-state', 'cached-offline');
            return cached;
        }
        // Offline-only fallback. Do not use this path during successful API
        // renders because static seeds are not the DCC source of truth.
        if (bootstrap && bootstrap.header) {
            var seedLabels = bootstrap.labels || {};
            try { _renderInto(container, bootstrap.header, seedLabels); } catch(e){}
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
    try {
        console.log('[DccHeader] renderer loaded at', new Date().toISOString(),
                    'readyState=', document.readyState,
                    'placeholders=', document.querySelectorAll('.dcc-header[data-dcc-doc-code]').length);
    } catch(e){}
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ renderAll(document); });
    } else {
        renderAll(document);
    }
}

window.DccHeader = {
    render: render,
    renderAll: renderAll,
    /**
     * Read the last-fetched header payload for a doc_code. Returns null if
     * the renderer has not yet fetched that doc. Callers must treat a null
     * result as "use your fallback chain"; never synthesize a default.
     */
        getCached: function(docCode, locale){
            if (!docCode) return null;
            if (locale) return _cachedHeader(docCode, locale);
            return _cachedHeaderAnyLocale(docCode);
        },
        clearCache: function(docCode, locale){
            var code = String(docCode || '').toUpperCase();
            if (!code) {
                _headerCache = Object.create(null);
                _latestHeaderByDoc = Object.create(null);
                return;
            }
            if (locale) {
                delete _headerCache[_cacheKey(code, locale)];
            } else {
                Object.keys(_headerCache).forEach(function(key){
                    if (key.indexOf(code + '|') === 0) delete _headerCache[key];
                });
            }
            delete _latestHeaderByDoc[code];
        },
        _clearCache: function(){
            _labelsCache = {};
            _labelsPending = {};
            _headerCache = Object.create(null);
            _latestHeaderByDoc = Object.create(null);
        }
    };

bootstrap();
})();
