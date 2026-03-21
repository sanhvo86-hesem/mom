(function () {
  'use strict';
  var _qmsApplyingTables = false;
  var _qmsTableDebounce = null;
  var _qmsResizeDebounce = null;
  var _qmsTranslateReady = null;
  var _qmsTranslateComboWait = null;
  var _qmsDocLang = 'vi';
  var _qmsReloadingForVietnamese = false;

  function setGoogTransCookieValue(raw) {
    var host = String(window.location.hostname || '').trim();
    var attrs = '; path=/; SameSite=Lax';
    document.cookie = 'googtrans=' + raw + attrs;
    if (host && host.indexOf('.') > -1) {
      document.cookie = 'googtrans=' + raw + attrs + '; domain=' + host;
      var bare = host.replace(/^www\./i, '');
      if (bare && bare !== host) {
        document.cookie = 'googtrans=' + raw + attrs + '; domain=' + bare;
      }
    }
  }

  function clearGoogTransCookie() {
    setGoogTransCookieValue('; expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }

  function ensureTranslateHost() {
    var host = document.getElementById('qms-google-translate');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'qms-google-translate';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    document.body.appendChild(host);
    return host;
  }

  function ensureGoogleTranslateReady() {
    if (_qmsTranslateReady) return _qmsTranslateReady;
    _qmsTranslateReady = new Promise(function (resolve, reject) {
      var timeoutId = 0;

      function fail(err) {
        if (timeoutId) clearTimeout(timeoutId);
        reject(err instanceof Error ? err : new Error(String(err || 'translate_init_failed')));
      }

      function boot() {
        try {
          ensureTranslateHost();
          if (!(window.google && window.google.translate && window.google.translate.TranslateElement)) {
            fail(new Error('translate_api_missing'));
            return;
          }
          if (!window._qmsGoogleTranslateInstance) {
            window._qmsGoogleTranslateInstance = new window.google.translate.TranslateElement({
              pageLanguage: 'vi',
              includedLanguages: 'en,vi',
              autoDisplay: false,
              multilanguagePage: false
            }, 'qms-google-translate');
          }
          if (timeoutId) clearTimeout(timeoutId);
          resolve(window._qmsGoogleTranslateInstance);
        } catch (err) {
          fail(err);
        }
      }

      timeoutId = window.setTimeout(function () {
        fail(new Error('translate_init_timeout'));
      }, 15000);

      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        boot();
        return;
      }

      var prevInit = window.googleTranslateElementInit;
      window.googleTranslateElementInit = function () {
        try { if (typeof prevInit === 'function') prevInit(); } catch (_e) {}
        boot();
      };

      var script = document.querySelector('script[data-qms-google-translate="1"]');
      if (script) return;

      script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-qms-google-translate', '1');
      script.onerror = function () {
        fail(new Error('translate_script_load_failed'));
      };
      document.head.appendChild(script);
    });
    _qmsTranslateReady = _qmsTranslateReady.catch(function (err) {
      _qmsTranslateReady = null;
      throw err;
    });
    return _qmsTranslateReady;
  }

  function waitForTranslateCombo() {
    if (_qmsTranslateComboWait) return _qmsTranslateComboWait;
    _qmsTranslateComboWait = new Promise(function (resolve, reject) {
      var started = Date.now();
      (function poll() {
        var combo = document.querySelector('select.goog-te-combo');
        if (combo) {
          resolve(combo);
          return;
        }
        if ((Date.now() - started) > 12000) {
          reject(new Error('translate_combo_missing'));
          return;
        }
        setTimeout(poll, 120);
      })();
    });
    _qmsTranslateComboWait = _qmsTranslateComboWait.catch(function (err) {
      _qmsTranslateComboWait = null;
      throw err;
    });
    return _qmsTranslateComboWait;
  }

  function dispatchNativeChange(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (_e) {
      var evt = document.createEvent('HTMLEvents');
      evt.initEvent('change', true, false);
      el.dispatchEvent(evt);
    }
  }

  function postCurrentContent() {
    var dc = document.getElementById('docContent');
    var html = dc ? dc.innerHTML : (document.body ? document.body.innerHTML : '');
    try {
      window.parent && window.parent.postMessage({ type: 'docContent', html: html }, '*');
    } catch (_e) {}
  }

  function applyEnglishView() {
    setGoogTransCookieValue('/vi/en');
    return ensureGoogleTranslateReady()
      .then(waitForTranslateCombo)
      .then(function (combo) {
        if (combo.value !== 'en') {
          combo.value = 'en';
          dispatchNativeChange(combo);
        }
        document.documentElement.lang = 'en';
        document.documentElement.setAttribute('data-qms-view-lang', 'en');
        return true;
      });
  }

  function applyVietnameseView() {
    clearGoogTransCookie();
    document.documentElement.lang = 'vi';
    document.documentElement.setAttribute('data-qms-view-lang', 'vi');
    var combo = document.querySelector('select.goog-te-combo');
    var translated = document.documentElement.classList.contains('translated-ltr')
      || document.body.classList.contains('translated-ltr')
      || !!(combo && combo.value && combo.value !== 'vi');
    if (translated && !_qmsReloadingForVietnamese) {
      _qmsReloadingForVietnamese = true;
      window.location.reload();
    }
    return Promise.resolve(true);
  }

  function applyDocumentLanguage(nextLang) {
    var target = nextLang === 'en' ? 'en' : 'vi';
    _qmsDocLang = target;
    if (target === 'vi') return applyVietnameseView();
    return applyEnglishView().catch(function (err) {
      try { console.warn('[QMS][translate]', err && err.message ? err.message : err); } catch (_e) {}
      return false;
    });
  }

  function initMessageBridge() {
    window.addEventListener('message', function (evt) {
      var data = evt && evt.data;
      if (!data) return;
      if (data === 'getContent') {
        postCurrentContent();
        return;
      }
      if (typeof data === 'object' && data.type === 'setLang') {
        applyDocumentLanguage(data.lang);
      }
    });
  }

  function initDocumentLanguage() {
    var stored = 'vi';
    try { stored = String(localStorage.getItem('hesem_lang') || 'vi').toLowerCase(); } catch (_e) {}
    _qmsDocLang = stored === 'en' ? 'en' : 'vi';
    if (_qmsDocLang === 'en') {
      setTimeout(function () {
        applyDocumentLanguage('en');
      }, 60);
    } else {
      clearGoogTransCookie();
      document.documentElement.lang = 'vi';
      document.documentElement.setAttribute('data-qms-view-lang', 'vi');
    }
  }

  function initCurrentYear() {
    document.querySelectorAll('[data-current-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function initExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
      var rel = String(a.rel || '').toLowerCase();
      var out = rel.split(/\s+/).filter(Boolean);
      if (out.indexOf('noopener') < 0) out.push('noopener');
      if (out.indexOf('noreferrer') < 0) out.push('noreferrer');
      a.rel = out.join(' ').trim();
    });
  }

  function initPrintDisclaimers() {
    document.querySelectorAll('.print-disclaimer').forEach(function (el) {
      if (window.matchMedia && window.matchMedia('print').matches) {
        el.style.display = 'block';
      }
    });
  }

  function parseSpan(raw) {
    var n = parseInt(raw == null ? '1' : String(raw), 10);
    return isFinite(n) && n > 0 ? n : 1;
  }

  function tableColCount(table) {
    if (!table || !table.rows) return 0;
    var maxCols = 0;
    Array.prototype.forEach.call(table.rows, function (row) {
      var total = 0;
      Array.prototype.forEach.call(row.cells || [], function (cell) {
        total += parseSpan(cell.getAttribute('colspan') || cell.colSpan || 1);
      });
      if (total > maxCols) maxCols = total;
    });
    return Math.max(0, maxCols);
  }

  function buildTableAnchors(table) {
    var rows = Array.prototype.slice.call((table && table.rows) || []);
    var grid = [];
    var anchors = [];
    rows.forEach(function (row, rowIdx) {
      if (!grid[rowIdx]) grid[rowIdx] = [];
      var col = 0;
      Array.prototype.forEach.call(row.cells || [], function (cell) {
        while (grid[rowIdx][col]) col++;
        var rs = parseSpan(cell.getAttribute('rowspan') || cell.rowSpan || 1);
        var cs = parseSpan(cell.getAttribute('colspan') || cell.colSpan || 1);
        anchors.push({ cell: cell, row: rowIdx, col: col, rowspan: rs, colspan: cs });
        for (var r = rowIdx; r < rowIdx + rs; r++) {
          if (!grid[r]) grid[r] = [];
          for (var c = col; c < col + cs; c++) grid[r][c] = cell;
        }
        col += cs;
      });
    });
    return { anchors: anchors, grid: grid };
  }

  function cellWeight(cell) {
    if (!cell) return 1;
    var txt = String(cell.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    var len = txt.length;
    var longest = 0;
    if (len) {
      txt.split(' ').forEach(function (tok) {
        if (tok.length > longest) longest = tok.length;
      });
    }
    var weight = 1 + (Math.min(260, len) / 30) + (Math.min(180, longest) / 45);
    if (cell.tagName === 'TH') weight *= 1.1;
    if (cell.querySelector('img,svg,canvas,video,iframe,table')) weight += 3;
    if (cell.querySelector('input,select,textarea,.blank,.check,.chk')) weight += 1.5;
    return Math.max(0.25, weight);
  }

  function balancedPercents(table, colCount) {
    var count = Math.max(1, parseInt(colCount || 0, 10) || 1);
    var weights = new Array(count).fill(1);
    var info = buildTableAnchors(table);
    info.anchors.forEach(function (a) {
      var start = Math.max(0, Math.min(count - 1, a.col));
      var span = Math.max(1, Math.min(count - start, a.colspan || 1));
      var part = cellWeight(a.cell) / span;
      for (var i = 0; i < span; i++) {
        var idx = start + i;
        if (idx >= 0 && idx < count) weights[idx] += part;
      }
    });

    var sum = weights.reduce(function (acc, val) { return acc + val; }, 0);
    if (!sum || sum < 0.0001) return new Array(count).fill(100 / count);

    var minPct = (count >= 10) ? 3.5 : (count >= 8 ? 4.5 : (count >= 6 ? 6 : 8));
    var maxPct = (count <= 3) ? 72 : (count <= 5 ? 52 : (count <= 8 ? 40 : 30));
    var pct = weights.map(function (w) { return (w / sum) * 100; });
    for (var pass = 0; pass < 2; pass++) {
      for (var j = 0; j < pct.length; j++) {
        pct[j] = Math.max(minPct, Math.min(maxPct, pct[j]));
      }
      var pSum = pct.reduce(function (acc, val) { return acc + val; }, 0) || 100;
      pct = pct.map(function (v) { return (v / pSum) * 100; });
    }

    var out = pct.map(function (v) { return Math.max(0.1, Math.round(v * 100) / 100); });
    var outSum = out.reduce(function (acc, val) { return acc + val; }, 0) || 100;
    var diff = Math.round((100 - outSum) * 100) / 100;
    out[out.length - 1] = Math.max(0.1, Math.round((out[out.length - 1] + diff) * 100) / 100);
    return out;
  }

  function ensureColgroup(table, colCount) {
    var cg = null;
    for (var i = 0; i < table.children.length; i++) {
      if (table.children[i].tagName === 'COLGROUP') { cg = table.children[i]; break; }
    }
    if (!cg) {
      cg = document.createElement('colgroup');
      table.insertBefore(cg, table.firstChild);
    }
    while (cg.children.length < colCount) cg.appendChild(document.createElement('col'));
    while (cg.children.length > colCount) cg.removeChild(cg.lastChild);
    return Array.prototype.slice.call(cg.querySelectorAll('col'));
  }

  function sanitizeCellSizing(cell) {
    var w = String(cell.style.width || '').trim().toLowerCase();
    var mw = String(cell.style.maxWidth || '').trim().toLowerCase();
    var minw = String(cell.style.minWidth || '').trim().toLowerCase();
    if (/(px|pt|cm|mm|in)$/.test(w)) cell.style.width = '';
    if (/(px|pt|cm|mm|in)$/.test(mw)) cell.style.maxWidth = '';
    if (/(px|pt|cm|mm|in)$/.test(minw)) cell.style.minWidth = '';
    if (cell.hasAttribute('width')) cell.removeAttribute('width');
    if (cell.hasAttribute('nowrap')) cell.removeAttribute('nowrap');
    if (String(cell.style.whiteSpace || '').trim().toLowerCase() === 'nowrap') {
      cell.style.whiteSpace = '';
    }
    cell.style.overflowWrap = 'anywhere';
    cell.style.wordBreak = 'break-word';
  }

  function applyTableAutoFit(table, opts) {
    if (!table || table.nodeType !== 1) return false;
    if (table.closest('.ed-modal-overlay,.ed-tbl-float-bar')) return false;
    opts = opts || {};
    var force = !!opts.force;
    var lock = table.getAttribute('data-qms-autofit-lock') === '1' || table.getAttribute('data-ed-autofit-lock') === '1';
    if (!force && lock) return false;

    var colCount = tableColCount(table);
    if (!colCount) return false;

    table.removeAttribute('width');
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.minWidth = '0';
    table.style.tableLayout = 'fixed';
    table.setAttribute('data-qms-autofit', 'balanced');

    table.querySelectorAll('td,th').forEach(sanitizeCellSizing);

    var cols = ensureColgroup(table, colCount);
    var percents = balancedPercents(table, colCount);
    cols.forEach(function (col, idx) {
      var p = percents[idx];
      if (!(isFinite(p) && p > 0)) p = 100 / colCount;
      if (col.hasAttribute('width')) col.removeAttribute('width');
      col.style.width = p.toFixed(2) + '%';
    });
    return true;
  }

  function applyGlobalTablePolicy(root, opts) {
    if (_qmsApplyingTables) return { total: 0, changed: 0 };
    _qmsApplyingTables = true;
    try {
      var ctx = root || document;
      var tables = [];
      if (ctx.querySelectorAll) tables = Array.from(ctx.querySelectorAll('table'));
      else if (ctx.getElementsByTagName) tables = Array.from(ctx.getElementsByTagName('table'));
      var changed = 0;
      tables.forEach(function (table) {
        if (applyTableAutoFit(table, opts)) changed++;
      });
      return { total: tables.length, changed: changed };
    } finally {
      _qmsApplyingTables = false;
    }
  }

  function scheduleGlobalTablePolicy() {
    if (_qmsTableDebounce) clearTimeout(_qmsTableDebounce);
    _qmsTableDebounce = setTimeout(function () {
      _qmsTableDebounce = null;
      applyGlobalTablePolicy(document, { force: false });
    }, 80);
  }

  function initTablePolicy() {
    applyGlobalTablePolicy(document, { force: false });
    if (window.MutationObserver) {
      var mo = new MutationObserver(function (muts) {
        if (_qmsApplyingTables) return;
        var hit = false;
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'childList') {
            if ((m.addedNodes && m.addedNodes.length) || (m.removedNodes && m.removedNodes.length)) {
              hit = true;
              break;
            }
          } else if (m.type === 'attributes') {
            var t = m.target;
            if (t && t.nodeType === 1 && (t.tagName === 'TABLE' || t.tagName === 'TD' || t.tagName === 'TH' || t.tagName === 'COL')) {
              hit = true;
              break;
            }
          }
        }
        if (hit) scheduleGlobalTablePolicy();
      });
      mo.observe(document.documentElement || document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'width', 'colspan', 'rowspan']
      });
    }
    window.addEventListener('resize', function () {
      if (_qmsResizeDebounce) clearTimeout(_qmsResizeDebounce);
      _qmsResizeDebounce = setTimeout(function () {
        _qmsResizeDebounce = null;
        applyGlobalTablePolicy(document, { force: false });
      }, 160);
    });
  }

  function init() {
    initCurrentYear();
    initExternalLinks();
    initPrintDisclaimers();
    initTablePolicy();
    initMessageBridge();
    initDocumentLanguage();
    document.documentElement.classList.add('js-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HesemApp = {
    version: 'stable',
    init: init,
    applyDocumentLanguage: applyDocumentLanguage,
    applyGlobalTablePolicy: applyGlobalTablePolicy,
    applyTableAutoFit: applyTableAutoFit,
    postCurrentContent: postCurrentContent
  };
})();
