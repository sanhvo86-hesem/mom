/* ════════════════════════════════════════════════════════════════════════
 * Orders v3 — API client + permission service + i18n
 *
 * One fetch path. One error envelope. Centralised CSRF. Never hits the
 * legacy api.php monolith. Logs every error to console with the action
 * name so audit is trivial.
 *
 * Permission cache is bootstrapped at shell mount; workspaces use
 * .perm.can(action) for UX gating only — server enforces.
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // ── i18n ────────────────────────────────────────────────────────────
  var i18nStrings = {};

  function lang(){
    // Inherit from the global portal language. Fallback to 'vi' since
    // HESEM's primary audience is Vietnamese.
    return (window.lang === 'en' || window.lang === 'vi')
      ? window.lang
      : 'vi';
  }

  function t(viOrKey, en){
    // Two call forms:
    //  t('Văn bản', 'Text')          — inline pair
    //  t('intake.empty')             — registered key
    if (en === undefined) {
      var bag = i18nStrings[lang()] || {};
      return bag[viOrKey] !== undefined ? bag[viOrKey] : viOrKey;
    }
    return lang() === 'en' ? en : viOrKey;
  }

  function registerI18n(map){
    // map = { vi: { key: 'Văn bản' }, en: { key: 'Text' } }
    ['vi','en'].forEach(function(loc){
      if (!i18nStrings[loc]) i18nStrings[loc] = {};
      if (map[loc]) Object.keys(map[loc]).forEach(function(k){
        i18nStrings[loc][k] = map[loc][k];
      });
    });
  }

  // ── HTML escape (used by components) ────────────────────────────────
  function esc(s){
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── API client ──────────────────────────────────────────────────────
  var DEFAULT_TIMEOUT_MS = 30000;

  function buildUrl(action, payload, method){
    var url = 'api/index.php?action=' + encodeURIComponent(action);
    if (method === 'GET' && payload && typeof payload === 'object') {
      var qs = [];
      Object.keys(payload).forEach(function(k){
        var v = payload[k];
        if (v === undefined || v === null || v === '') return;
        if (typeof v === 'object') v = JSON.stringify(v);
        qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
      });
      if (qs.length) url += '&' + qs.join('&');
    }
    return url;
  }

  function csrfHeader(){
    var tok = (window.csrfToken || (window.OrdersV3 && window.OrdersV3._csrf)) || '';
    return tok ? { 'X-CSRF-Token': tok } : {};
  }

  function request(action, payload, opts){
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var timeout = opts.timeout || DEFAULT_TIMEOUT_MS;

    var url = buildUrl(action, payload, method);
    var headers = Object.assign({}, csrfHeader());
    var init = { method: method, credentials: 'include', headers: headers };
    if (method !== 'GET' && payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(payload || {});
    }

    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    if (ctrl) init.signal = ctrl.signal;
    var timer = ctrl ? setTimeout(function(){
      try { ctrl.abort(); } catch(e){}
    }, timeout) : null;

    return fetch(url, init).then(function(res){
      if (timer) clearTimeout(timer);
      return res.text().then(function(txt){
        var data = null;
        try { data = JSON.parse(txt); } catch (e) {}
        var envelope = {
          ok:    !!(data && (data.ok === true || data.success === true)),
          data:  data,
          raw:   txt,
          error: (data && (data.error || data.message)) || null,
          detail:(data && data.detail) || null,
          http_status: res.status
        };
        // Normalize: if HTTP not in 2xx and body didn't say {ok:false}, still mark not-ok.
        if (!envelope.ok && (res.status < 200 || res.status >= 300)) {
          if (!envelope.error) envelope.error = 'http_' + res.status;
        }
        if (!envelope.ok && opts.debug !== false) {
          console.warn('[OrdersV3.api]', action, 'failed', {
            http: res.status, error: envelope.error, detail: envelope.detail
          });
        }
        return envelope;
      });
    }).catch(function(err){
      if (timer) clearTimeout(timer);
      var isAbort = err && (err.name === 'AbortError');
      console.warn('[OrdersV3.api]', action, isAbort ? 'timeout' : 'network_error', err);
      return {
        ok: false,
        data: null,
        raw: '',
        error: isAbort ? 'timeout' : 'network_error',
        detail: String(err && err.message || err),
        http_status: 0
      };
    });
  }

  var api = {
    request: request,
    get:  function(a,p,o){ return request(a, p, Object.assign({}, o||{}, { method:'GET'  })); },
    post: function(a,p,o){ return request(a, p, Object.assign({}, o||{}, { method:'POST' })); }
  };

  // ── Permissions ─────────────────────────────────────────────────────
  var permState = { ready: false, actions: {}, roles: [], org_id: '', is_superuser: false, user: null };

  function isAdminRole(role){
    var r = String(role || '').toLowerCase();
    return r === 'admin' || r === 'it_admin' || r === 'ceo' || r === 'general_director';
  }

  function bootstrap(){
    // Best-effort: ask the server. Fall back to client-side heuristic so
    // the shell never blocks on a 500 from a brand-new endpoint that
    // hasn't been deployed yet.
    return api.get('orders_v3_my_permissions').then(function(r){
      var user = (window.currentUser && typeof window.currentUser === 'object') ? window.currentUser : null;
      if (r.ok && r.data) {
        permState = {
          ready: true,
          actions: r.data.actions || {},
          roles:   r.data.roles   || (user ? [user.role] : []),
          org_id:  r.data.org_id  || '',
          is_superuser: !!r.data.is_superuser,
          user:    user
        };
      } else {
        // Fallback heuristic based on the locally cached user record.
        var role = (user && user.role) || '';
        permState = {
          ready: true,
          actions: { 'orders.read': true, 'orders.write': isAdminRole(role) },
          roles:   user ? [role] : [],
          org_id:  '',
          is_superuser: isAdminRole(role),
          user:    user
        };
        console.info('[OrdersV3.perm] using fallback (server endpoint not available yet)');
      }
      return permState;
    });
  }

  function can(action){
    if (!permState.ready) return true;        // optimistic before bootstrap completes
    if (permState.is_superuser) return true;
    if (permState.actions && permState.actions[action] === true) return true;
    return false;
  }

  function isRole(role){
    if (!permState.ready) return false;
    return (permState.roles || []).indexOf(role) >= 0;
  }

  function user(){ return permState.user; }
  function orgId(){ return permState.org_id; }

  var perm = {
    bootstrap: bootstrap,
    can:       can,
    isRole:    isRole,
    user:      user,
    orgId:     orgId,
    // For workspaces that want to decide their own default layout
    primaryRole: function(){
      var u = permState.user;
      return (u && u.role) || (permState.roles && permState.roles[0]) || '';
    }
  };

  // ── Format helpers (used everywhere — keep here so they share i18n) ─
  function fmtDate(s){
    if (!s) return '-';
    try {
      var d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleDateString(lang()==='en' ? 'en-US' : 'vi-VN', {
        day:'2-digit', month:'2-digit', year:'numeric'
      });
    } catch (e) { return String(s); }
  }
  function fmtDateTime(s){
    if (!s) return '-';
    try {
      var d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleString(lang()==='en' ? 'en-US' : 'vi-VN', {
        day:'2-digit', month:'2-digit', year:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
    } catch (e) { return String(s); }
  }
  function fmtMoney(v, currency){
    var n = Number(v || 0);
    if (!isFinite(n)) return '-';
    var sym = currency === 'VND' ? '₫' : '$';
    return sym + n.toLocaleString(lang()==='en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 2 });
  }
  function fmtRelative(ts){
    // returns "x phút trước" / "x mins ago"
    if (!ts) return '-';
    try {
      var d = new Date(ts).getTime();
      if (isNaN(d)) return ts;
      var diff = Math.floor((Date.now() - d) / 1000);
      var L = lang();
      if (diff < 60)        return L==='en' ? diff + 's ago'        : diff + ' giây trước';
      if (diff < 3600)      return L==='en' ? Math.floor(diff/60)  + 'm ago' : Math.floor(diff/60)  + ' phút trước';
      if (diff < 86400)     return L==='en' ? Math.floor(diff/3600)+ 'h ago' : Math.floor(diff/3600)+ ' giờ trước';
      if (diff < 86400 * 7) return L==='en' ? Math.floor(diff/86400)+ 'd ago' : Math.floor(diff/86400)+ ' ngày trước';
      return fmtDate(ts);
    } catch (e) { return String(ts); }
  }

  // ── Export ──────────────────────────────────────────────────────────
  window.OrdersV3 = window.OrdersV3 || {};
  window.OrdersV3.api  = api;
  window.OrdersV3.perm = perm;
  window.OrdersV3.i18n = {
    t: t,
    lang: lang,
    register: registerI18n
  };
  window.OrdersV3.fmt = {
    date:     fmtDate,
    datetime: fmtDateTime,
    money:    fmtMoney,
    relative: fmtRelative,
    esc:      esc
  };
})();
