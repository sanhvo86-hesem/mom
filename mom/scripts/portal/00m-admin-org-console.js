/* ============================================================================
 * Admin: Organization Console — Phòng ban & Chức danh + Sơ đồ tổ chức
 * ----------------------------------------------------------------------------
 * Replaces fragmented prompt()-driven dept/title rendering with two
 * world-class consoles wired to the authoritative HCM runtime tables:
 *
 *   Phòng ban & Chức danh (renderOrgUnits):
 *     • Three-pane workbench: outline tree | unit detail | position panel
 *     • Inline rename, retype, recolor, reparent
 *     • Position cards with role-icon auto-derived from title
 *     • Headcount + filled/open KPI per unit
 *     • Filter chips by type & status, search across units + positions
 *
 *   Sơ đồ tổ chức (renderOrgChart):
 *     • Full SVG canvas (vector → perfect for SVG/PDF export)
 *     • Reingold-Tilford-style layered tree, supports TB / LR
 *     • Pan with mouse drag, zoom with wheel (cursor-centred)
 *     • Drag node → drop on another node = reparent (PUT runtime)
 *     • Export: SVG, PNG, Print (browser → PDF), JSON snapshot
 *
 * Backend (no new endpoints needed — uses GenericCrudController):
 *   GET    /api/v1/runtime/hcm_workforce/hcm_org_units
 *   POST   /api/v1/runtime/hcm_workforce/hcm_org_units
 *   PUT    /api/v1/runtime/hcm_workforce/hcm_org_units/{id}
 *   DELETE /api/v1/runtime/hcm_workforce/hcm_org_units/{id}
 *   (same shape for hcm_positions, hcm_employees)
 *
 * Optimistic concurrency via row_version (If-Match header) — handled by
 * AdminUI.runtime.update.
 * ========================================================================== */

(function(){
  'use strict';
  if (!window.AdminUI) { console.error('[admin-org] AdminUI not loaded'); return; }
  var UI = window.AdminUI;
  var t = UI.t, esc = UI.escapeHtml, badge = UI.badge;

  /* ──────────────────────────────────────────────────────────────────────── *
   * Type metadata — single source of truth for icons + colors per org level
   * ──────────────────────────────────────────────────────────────────────── */
  var TYPE_META = {
    company:    { icon:'🏢', label:'Công ty',  labelEn:'Company',    color:'#0ea5e9', order:0 },
    division:   { icon:'🏛️', label:'Khối',     labelEn:'Division',   color:'#8b5cf6', order:1 },
    department: { icon:'🏬', label:'Phòng',    labelEn:'Department', color:'#f59e0b', order:2 },
    section:    { icon:'🧩', label:'Bộ phận',  labelEn:'Section',    color:'#10b981', order:3 },
    team:       { icon:'🤝', label:'Nhóm',     labelEn:'Team',       color:'#ef4444', order:4 }
  };
  function typeMeta(type){ return TYPE_META[String(type||'department')] || TYPE_META.department; }
  function typeOrder(type){ return typeMeta(type).order; }

  // Department palette (10 distinct hues) — used when metadata.color absent
  var DEPT_PALETTE = ['#2563eb','#16a34a','#dc2626','#7c3aed','#0f766e','#d97706','#0891b2','#a21caf','#65a30d','#475569'];
  function defaultDeptColor(code){
    var s = String(code||'GEN');
    var seed = 0;
    for (var i = 0; i < s.length; i++) seed += s.charCodeAt(i);
    return DEPT_PALETTE[seed % DEPT_PALETTE.length];
  }
  function unitColor(unit){
    var meta = safeJson(unit && unit.metadata);
    return String(meta.color || defaultDeptColor(unit && unit.org_unit_code));
  }

  /* Position icon — derived from title keyword. Maps Vietnamese + English. */
  function positionIcon(title){
    var s = String(title || '').toLowerCase();
    if (/giám đốc điều hành|chief executive|^ceo\b/.test(s)) return '🏆';
    if (/giám đốc|director|cto|cfo|coo|cio/.test(s))         return '👑';
    if (/phó giám đốc|deputy director|deputy gm|vice president/.test(s)) return '🎖️';
    if (/trưởng phòng|head of|chief of|leader|lead\b/.test(s))           return '🎯';
    if (/phó phòng|deputy head|assistant head/.test(s))                  return '🥈';
    if (/quản đốc|production manager|plant manager/.test(s))             return '🏭';
    if (/quản lý|manager|supervisor/.test(s))                            return '📋';
    if (/kỹ sư|engineer/.test(s))                                        return '🔧';
    if (/lập trình|developer|programmer/.test(s))                        return '💻';
    if (/chuyên viên|specialist|analyst|consultant/.test(s))             return '📊';
    if (/kỹ thuật viên|technician|maintenance/.test(s))                  return '🛠️';
    if (/kế toán|accountant|finance/.test(s))                            return '💰';
    if (/nhân sự|hr|human resources|recruiter/.test(s))                  return '👥';
    if (/mua hàng|purchasing|procurement|buyer/.test(s))                 return '🛒';
    if (/bán hàng|sales|marketing|account exec/.test(s))                 return '📈';
    if (/kho|warehouse|logistics|shipping/.test(s))                      return '📦';
    if (/kiểm tra|inspector|qc|quality|qa\b/.test(s))                    return '🔍';
    if (/an toàn|safety|hse|ehs/.test(s))                                return '🦺';
    if (/đào tạo|training|trainer/.test(s))                              return '🎓';
    if (/it\b|system admin|sysadmin|devops/.test(s))                     return '🖥️';
    if (/thiết kế|designer|cad/.test(s))                                 return '🎨';
    if (/lái xe|driver/.test(s))                                         return '🚗';
    if (/bảo vệ|security guard/.test(s))                                 return '🛡️';
    if (/lễ tân|receptionist|admin assist/.test(s))                      return '☎️';
    if (/công nhân|operator|worker|technician/.test(s))                  return '⚙️';
    if (/thực tập|intern|apprentice/.test(s))                            return '🌱';
    if (/nhân viên|staff|officer|associate|clerk/.test(s))               return '👤';
    return '💼';
  }

  function safeJson(v){
    if (!v) return {};
    if (typeof v === 'object') return v || {};
    try { return JSON.parse(String(v)) || {}; } catch(e){ return {}; }
  }
  function lang(){ return UI.isEn() ? 'en' : 'vi'; }

  /* Thin modal wrapper. AdminUI.openModal expects {bodyEl|bodyHtml, footerHtml}
   * — we accept {body: domNode|string, buttons:[{label,variant,onClick}]} and
   * wire up the footer buttons after the modal mounts.
   *
   * onClick contract: receives a `close` function. If onClick returns a Promise,
   * the modal stays open until the promise resolves to a truthy value
   * (auto-close). If onClick returns nothing/sync, behaviour is unchanged —
   * caller must call close() themselves. */
  function modal(opts){
    var bodyEl = null, bodyHtml = '';
    if (opts.body instanceof Element) bodyEl = opts.body;
    else if (typeof opts.body === 'string') bodyHtml = opts.body;
    var btns = opts.buttons || [];
    var footerHtml = btns.map(function(b, i){
      var cls = 'btn-admin' + (b.variant === 'primary' ? '' : ' secondary');
      var style = '';
      if (b.variant === 'primary') style = 'background:var(--brand-primary,#4f46e5);color:#fff;border-color:var(--brand-primary,#4f46e5)';
      if (b.variant === 'danger')  style = 'background:var(--red-dark,#991b1b);color:#fff;border-color:var(--red-dark,#991b1b)';
      return '<button class="'+cls+'" data-mb="'+i+'" type="button"'+(style?' style="'+style+'"':'')+'>'+esc(b.label||'')+'</button>';
    }).join('');
    var m = UI.openModal({
      title: opts.title || '',
      width: opts.width || '480px',
      bodyEl: bodyEl,
      bodyHtml: bodyHtml,
      footerHtml: footerHtml
    });
    // Capture overlay+close locally so the close action does not depend on
    // `m.close` lookup at click time (defensive against any prototype/this
    // weirdness — directly close via DOM removal as a fallback).
    var overlay = m.overlay;
    var hardClose = function(){
      try { m.close && m.close(); } catch(e){}
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
    btns.forEach(function(b, i){
      var btn = m.card.querySelector('[data-mb="'+i+'"]');
      if (!btn || typeof b.onClick !== 'function') return;
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        try {
          var ret = b.onClick(hardClose);
          if (ret && typeof ret.then === 'function'){
            ret.then(function(keep){ if (keep !== false) hardClose(); }, function(){ /* keep open on error */ });
          }
        } catch(e){
          console.error('[admin-org] modal button error', e);
          UI.toast(String(e && e.message || e), 'error');
        }
      });
    });
    return m;
  }
  /* Inline confirm (cannot use AdminUI.confirmDestructive — it has a race where
   * modal.close() fires onClose → resolve(null) BEFORE resolve(result), so the
   * promise always resolves to null even on confirm). Returns Promise<boolean>. */
  function confirm(opts){
    opts = opts || {};
    return new Promise(function(resolve){
      var body = document.createElement('div');
      body.style.cssText = 'font-size:13px;color:var(--text-2);line-height:1.6';
      body.textContent = opts.message || t('Are you sure?','Bạn có chắc chắn?');
      var settled = false;
      var settle = function(v){ if (settled) return; settled = true; resolve(v); };
      var m = modal({
        title: opts.title || t('Confirm action','Xác nhận thao tác'),
        body: body,
        width: '460px',
        buttons: [
          { label: t('Cancel','Hủy'),     variant:'secondary', onClick: function(close){ settle(false); close(); } },
          { label: opts.confirmLabel || t('Confirm','Xác nhận'), variant: opts.danger === false ? 'primary' : 'danger', onClick: function(close){ settle(true);  close(); } }
        ]
      });
      // If user dismisses via × or backdrop, treat as cancel.
      m.overlay.addEventListener('click', function(ev){ if (ev.target === m.overlay) settle(false); });
      m.card.querySelector('.adminui-modal-close').addEventListener('click', function(){ settle(false); });
    });
  }

  /* Tolerant JSON parser. GenericCrudController sometimes appends a spurious
   * {"ok":false,"error":"server_error"} body after a SUCCESSFUL create/update
   * (a post-response shutdown handler in mom/api/index.php fires even though
   * the real response was already echoed). Without tolerance, the second
   * object makes JSON.parse choke and the success is lost. We accept the
   * first complete top-level object/array and ignore the rest. */
  function tolerantParseJson(text){
    if (!text) return null;
    text = String(text).replace(/^﻿/, '').replace(/^\s+/, '');
    if (text[0] !== '{' && text[0] !== '[') return JSON.parse(text);
    var depth = 0, inStr = false, esc = false;
    for (var i = 0; i < text.length; i++){
      var c = text[i];
      if (esc) { esc = false; continue; }
      if (c === '\\' && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') {
        depth--;
        if (depth === 0) return JSON.parse(text.substring(0, i+1));
      }
    }
    return JSON.parse(text);
  }

  /* Resilient mutation wrapper (POST/PUT/DELETE). Hand-rolled fetch so we can:
   *   - tolerate the server's double-body bug via tolerantParseJson
   *   - send X-CSRF-Token + If-Match (for optimistic concurrency)
   *   - retry once on 409 conflict by re-fetching detail for fresh row_version
   *   - retry once on csrf_failed/csrf_expired by refreshing the token first
   * Returns the parsed body (e.g. {ok:true, record:{…}}). */
  function _refreshCsrfToken(){
    return fetch('/mom/api.php?action=status', {
      method: 'GET', credentials: 'same-origin', cache: 'no-store'
    }).then(function(r){ return r.json(); }).then(function(s){
      if (s && s.csrf_token) {
        window.csrfToken = s.csrf_token;
        if (window.AppState) window.AppState.csrfToken = s.csrf_token;
      }
    }).catch(function(){});
  }
  function mutate(method, domain, table, id, payload, rowVersion, _isRetry){
    var url = '/api/v1/runtime/'+encodeURIComponent(domain)+'/'+encodeURIComponent(table)
      + (id ? ('/'+encodeURIComponent(id)) : '');
    var headers = { 'Accept':'application/json', 'Content-Type':'application/json' };
    var tok = window.csrfToken || (window.AppState && window.AppState.csrfToken);
    if (tok) headers['X-CSRF-Token'] = tok;
    if (rowVersion != null){
      headers['If-Match'] = String(rowVersion);
      if (payload && typeof payload === 'object' && payload.row_version == null) payload.row_version = rowVersion;
    }
    return fetch(url, {
      method: method, credentials:'same-origin', cache:'no-store',
      headers: headers, body: JSON.stringify(payload || {})
    }).then(function(r){
      return r.text().then(function(txt){
        var body;
        try { body = tolerantParseJson(txt); }
        catch(e){ var pe = new Error('parse_failed'); pe.status = r.status; pe.raw = txt; throw pe; }
        // Trust body.ok over HTTP status: the server's shutdown handler can
        // emit a stray 500/server_error AFTER a successful 2xx body. The first
        // (parsed) object is the truth.
        var bodyOk = body && body.ok === true;
        if (!bodyOk && (!r.ok || (body && body.ok === false))){
          var errCode = (body && (body.error || (body.error && body.error.message))) || '';
          // Auto-refresh CSRF token and retry once on stale-token errors
          if (!_isRetry && (errCode === 'csrf_failed' || errCode === 'csrf_expired')){
            return _refreshCsrfToken().then(function(){
              return mutate(method, domain, table, id, payload, rowVersion, true);
            });
          }
          var msg = (body && body.error && (body.error.message || body.error)) || (body && body.message) || ('HTTP '+r.status);
          var err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
          err.status = r.status;
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }
  // Notify other admin tabs (Users tab in particular) that the org/HCM
  // catalog changed so their cached dropdowns refresh on next render.
  function notifyOrgChanged(){
    try { window.dispatchEvent(new CustomEvent('admin:org:invalidated')); } catch(_){}
  }

  function safeCreate(domain, table, payload){
    return mutate('POST', domain, table, null, payload, null).then(function(r){ notifyOrgChanged(); return r; });
  }
  function safeUpdate(domain, table, id, payload, currentRv){
    return mutate('PUT', domain, table, id, payload, currentRv).catch(function(err){
      if (err && err.status === 409 && err.body && (err.body.error === 'conflict' || err.body.error === 'stale_row_version')){
        return UI.runtime.get(domain, table, id).then(function(detail){
          var freshRv = detail && detail.record && detail.record.row_version;
          if (freshRv == null) throw err;
          return mutate('PUT', domain, table, id, payload, freshRv);
        });
      }
      throw err;
    }).then(function(r){ notifyOrgChanged(); return r; });
  }
  function safeDelete(domain, table, id, currentRv){
    return mutate('DELETE', domain, table, id, {}, currentRv).catch(function(err){
      if (err && err.status === 409 && err.body && (err.body.error === 'conflict' || err.body.error === 'stale_row_version')){
        return UI.runtime.get(domain, table, id).then(function(detail){
          var freshRv = detail && detail.record && detail.record.row_version;
          if (freshRv == null) throw err;
          return mutate('DELETE', domain, table, id, {}, freshRv);
        });
      }
      throw err;
    }).then(function(r){ notifyOrgChanged(); return r; });
  }
  /* Status transitions go through a dedicated endpoint, not generic update —
   * `status` is a controlled column. POST /…/{id}/transition with body {to}. */
  function safeTransition(domain, table, id, toStatus, currentRv){
    var url = '/api/v1/runtime/'+encodeURIComponent(domain)+'/'+encodeURIComponent(table)+'/'+encodeURIComponent(id)+'/transition';
    var headers = { 'Accept':'application/json', 'Content-Type':'application/json' };
    var tok = window.csrfToken || (window.AppState && window.AppState.csrfToken);
    if (tok) headers['X-CSRF-Token'] = tok;
    if (currentRv != null) headers['If-Match'] = String(currentRv);
    return fetch(url, {
      method:'POST', credentials:'same-origin', cache:'no-store',
      headers: headers, body: JSON.stringify({ to: toStatus, row_version: currentRv })
    }).then(function(r){
      return r.text().then(function(txt){
        var body;
        try { body = tolerantParseJson(txt); }
        catch(e){ var pe = new Error('parse_failed'); pe.status = r.status; pe.raw = txt; throw pe; }
        var bodyOk = body && body.ok === true;
        if (!bodyOk && (!r.ok || (body && body.ok === false))){
          var msg = (body && body.error && (body.error.message || body.error)) || ('HTTP '+r.status);
          var err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
          err.status = r.status; err.body = body; throw err;
        }
        return body;
      });
    }).catch(function(err){
      if (err && err.status === 409 && err.body && (err.body.error === 'conflict' || err.body.error === 'stale_row_version')){
        return UI.runtime.get(domain, table, id).then(function(detail){
          var freshRv = detail && detail.record && detail.record.row_version;
          if (freshRv == null) throw err;
          return safeTransition(domain, table, id, toStatus, freshRv);
        });
      }
      throw err;
    }).then(function(r){ notifyOrgChanged(); return r; });
  }

  /* ──────────────────────────────────────────────────────────────────────── *
   * Shared state
   * ──────────────────────────────────────────────────────────────────────── */
  var S = {
    units: [], positions: [], employees: [], hcmEmployees: [], assignments: [], users: [], employeeProfiles: [],
    loaded: false, loading: false, error: '',
    selectedUnitId: null, selectedPositionId: null,
    filter: { search:'', type:'all', status:'active' },
    chart: {
      mode:'positions',      // 'units' | 'positions'
      layout:'TB',           // 'TB' | 'LR'
      zoom:1, panX:0, panY:0,
      collapsedPositions:{},
      editing:false,
      manualPositions:{ units:{}, positions:{} },
      dirtyManualPositions:{ units:{}, positions:{} }
    }
  };

  function indexData(){
    S.byUnitId = {};
    S.byPositionId = {};
    S.byEmployeeId = {};
    S.peopleById = {};
    S.rawEmployeeById = {};
    S.employeeProfileById = {};
    S.childrenOfUnit = {};
    S.positionsByUnit = {};
    S.employeesByPosition = {};
    S.employeesByUnit = {};
    S.units.forEach(function(u){
      S.byUnitId[u.hcm_org_unit_id] = u;
      var p = String(u.parent_org_unit_id || '');
      (S.childrenOfUnit[p] = S.childrenOfUnit[p] || []).push(u);
    });
    S.positions.forEach(function(p){
      S.byPositionId[p.hcm_position_id] = p;
      var k = String(p.hcm_org_unit_id || '');
      (S.positionsByUnit[k] = S.positionsByUnit[k] || []).push(p);
    });
    (S.hcmEmployees || []).forEach(function(e){
      var eid = employeeIdentity(e);
      if (!eid) return;
      S.rawEmployeeById[eid] = e;
      S.peopleById[eid] = e;
    });
    (S.employeeProfiles || []).forEach(function(profile){
      if (profile && profile.role && !profile.role_label &&
          typeof ROLES !== 'undefined' && ROLES) {
        var rc = ROLES[profile.role];
        if (rc) profile.role_label = String(rc.labelEn || rc.label || profile.role);
      }
      profileIdentityKeys(profile).forEach(function(id){
        S.employeeProfileById[id] = profile;
        S.peopleById[id] = profile;
      });
    });

    S.employees = buildAssignmentRows();
    S.employees.forEach(function(e){
      var eid = employeeIdentity(e);
      if (eid && !S.byEmployeeId[eid]) S.byEmployeeId[eid] = e;
      if (eid && !S.peopleById[eid]) S.peopleById[eid] = e;
      var pk = String(e.hcm_position_id || '');
      var uk = String(e.hcm_org_unit_id || '');
      if (pk) (S.employeesByPosition[pk] = S.employeesByPosition[pk] || []).push(e);
      if (uk) (S.employeesByUnit[uk] = S.employeesByUnit[uk] || []).push(e);
    });
    // sort children by org_unit_type weight then code
    Object.keys(S.childrenOfUnit).forEach(function(k){
      S.childrenOfUnit[k].sort(function(a,b){
        var w = typeOrder(a.org_unit_type) - typeOrder(b.org_unit_type);
        if (w) return w;
        return String(a.org_unit_code||'').localeCompare(String(b.org_unit_code||''));
      });
    });
    Object.keys(S.positionsByUnit).forEach(function(k){
      S.positionsByUnit[k].sort(function(a,b){
        return String(a.position_code||'').localeCompare(String(b.position_code||''));
      });
    });
    Object.keys(S.employeesByPosition).forEach(function(k){
      S.employeesByPosition[k].sort(compareEmployeesByDisplayName);
    });
    Object.keys(S.employeesByUnit).forEach(function(k){
      S.employeesByUnit[k].sort(compareEmployeesByDisplayName);
    });
  }

  function profileIdentityKeys(profile){
    var keys = [];
    ['employee_id','hcm_employee_id','id','user_id_code','username','source_record_id'].forEach(function(k){
      var v = String((profile && profile[k]) || '').trim();
      if (v && keys.indexOf(v) < 0) keys.push(v);
    });
    return keys;
  }

  function buildAssignmentRows(){
    var byKey = {};
    var today = new Date().toISOString().slice(0, 10);
    // The assignments table is the source of truth for "who is currently
    // assigned to which position". When any row exists in S.assignments
    // for (employee_id, hcm_position_id) — whether active or soft-ended —
    // it dictates the outcome. The hcm_employees + users.json fallbacks
    // below must NOT resurrect a (eid, posId) pair the assignment table
    // already covers; otherwise stale users.json[user].hcm_position_id
    // brings back rows the user just clicked "Xóa" on. This is exactly
    // the bug we hit on Engineering Lead / Manager (Phú & Dương stayed
    // visible after soft-end because users.json still pointed there).
    var assignmentSeen = {};
    function put(row, priority){
      var eid = employeeIdentity(row);
      var posId = String(row && row.hcm_position_id || '').trim();
      if (!eid || !posId) return;
      var key = eid + '|' + posId;
      if (byKey[key] && byKey[key]._priority > priority) return;
      var base = S.rawEmployeeById[eid] || {};
      byKey[key] = Object.assign({}, base, row, {
        employee_id: eid,
        _priority: priority
      });
    }

    (S.assignments || []).forEach(function(a){
      var eid = String(a.employee_id || '').trim();
      var posId = String(a.hcm_position_id || '').trim();
      if (eid && posId) assignmentSeen[eid + '|' + posId] = true;
      var position = S.byPositionId[posId] || {};
      var status = String(a.assignment_status || 'active');
      // Hide ended/inactive/terminated assignments from every consumer, and
      // treat the soft-end pattern (status=active but effective_to<=today)
      // the same way — Xóa should make the row disappear, not just relabel
      // it to "Đã kết thúc".
      if (status === 'ended' || status === 'inactive' || status === 'terminated') return;
      var effTo = String(a.effective_to || '').slice(0, 10);
      if (effTo && effTo <= today) return;
      put(Object.assign({}, a, {
        employee_id: eid,
        hcm_position_id: posId,
        hcm_org_unit_id: String(a.hcm_org_unit_id || position.hcm_org_unit_id || ''),
        employment_status: status === 'active' ? 'active' : status,
        assignment_status: status,
        assignment_type: String(a.assignment_type || 'concurrent')
      }), 40);
    });

    (S.hcmEmployees || []).forEach(function(e){
      var eid = employeeIdentity(e);
      var posId = String(e && e.hcm_position_id || '').trim();
      if (!eid || !posId) return;
      if (assignmentSeen[eid + '|' + posId]) return;
      var position = S.byPositionId[posId] || {};
      put(Object.assign({}, e, {
        employee_id: eid,
        hcm_position_id: posId,
        hcm_org_unit_id: String(e.hcm_org_unit_id || position.hcm_org_unit_id || ''),
        assignment_status: String(e.employment_status || 'active') === 'terminated' ? 'ended' : 'active',
        assignment_type: 'primary',
        is_primary: true,
        source_system: firstText(e.source_system, 'HCM_EMPLOYEE_PRIMARY')
      }), 30);
    });

    (S.users || []).forEach(function(user){
      var eid = employeeIdentity(user);
      var posId = String(user && user.hcm_position_id || '').trim();
      if (!eid || !posId) return;
      if (assignmentSeen[eid + '|' + posId]) return;
      var position = S.byPositionId[posId] || {};
      put(Object.assign({}, user, {
        employee_id: eid,
        hcm_position_id: posId,
        hcm_org_unit_id: String(user.hcm_org_unit_id || position.hcm_org_unit_id || ''),
        assignment_status: user.active === false ? 'inactive' : 'active',
        employment_status: user.active === false ? 'inactive' : 'active',
        assignment_type: 'primary',
        is_primary: true,
        source_system: firstText(user.source_system, 'ADMIN_USER_PRIMARY')
      }), 20);
    });

    return Object.keys(byKey).map(function(k){
      var row = byKey[k];
      delete row._priority;
      return row;
    });
  }

  function uniqueStrings(values){
    var out = [];
    values.forEach(function(v){
      v = String(v || '').trim();
      if (v && out.indexOf(v) < 0) out.push(v);
    });
    return out;
  }

  function employeeIdentity(e){
    return String((e && (e.employee_id || e.hcm_employee_id || e.user_id_code || e.username)) || '').trim();
  }

  function employeeIdentityKeys(e){
    return profileIdentityKeys(e);
  }

  function employeeProfile(e){
    var keys = employeeIdentityKeys(e);
    for (var i = 0; i < keys.length; i++){
      if (S.employeeProfileById && S.employeeProfileById[keys[i]]) return S.employeeProfileById[keys[i]];
    }
    return null;
  }

  function firstText(){
    for (var i = 0; i < arguments.length; i++){
      var v = arguments[i];
      if (v == null) continue;
      v = String(v).trim();
      if (v) return v;
    }
    return '';
  }

  function employeeDisplayName(e){
    var profile = employeeProfile(e) || {};
    var meta = safeJson(e && e.metadata);
    var profileMeta = safeJson(profile.metadata);
    var identityKeys = employeeIdentityKeys(e).concat(employeeIdentityKeys(profile));
    function nonIdentity(v){
      v = String(v || '').trim();
      if (!v) return '';
      if (identityKeys.indexOf(v) >= 0) return '';
      if (/^EMP[A-Z0-9]{8,}$/i.test(v)) return '';
      return v;
    }
    return firstText(
      nonIdentity(profile.name),
      nonIdentity(profile.full_name),
      nonIdentity(profile.display_name),
      nonIdentity(profile.preferred_name),
      nonIdentity(profile.employee_name),
      nonIdentity(profileMeta.name),
      nonIdentity(profileMeta.full_name),
      nonIdentity(profileMeta.employee_name),
      nonIdentity(e && e.name),
      nonIdentity(e && e.full_name),
      nonIdentity(e && e.display_name),
      nonIdentity(e && e.preferred_name),
      nonIdentity(e && e.employee_name),
      nonIdentity(meta.name),
      nonIdentity(meta.full_name),
      nonIdentity(meta.employee_name)
    ) || t('Unnamed person','Nhân sự chưa có tên');
  }

  function employeeSecondaryLabel(e){
    var profile = employeeProfile(e) || {};
    var meta = safeJson(e && e.metadata);
    function humanDetail(v){
      v = String(v || '').trim();
      if (!v) return '';
      if (/^EMP[A-Z0-9]{8,}$/i.test(v)) return '';
      if (/^[A-Z0-9]{2,8}$/.test(v)) return '';
      if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(v)) return '';
      return v;
    }
    var details = [
      assignmentTypeLabel(e && e.assignment_type),
      profile.title,
      profile.jd_title,
      meta.title,
      profile.role_label,
      meta.dept
    ].map(humanDetail).filter(Boolean);
    return uniqueStrings(details).slice(0, 3).join(' · ');
  }

  function activeEmployees(employees){
    return (employees || []).filter(function(e){ return assignmentStatus(e) === 'active'; });
  }

  function compareEmployeesByDisplayName(a, b){
    return employeeDisplayName(a).localeCompare(employeeDisplayName(b), undefined, { sensitivity:'base' });
  }

  function statusLabel(status){
    var s = String(status || 'active');
    var labels = {
      active:      { en:'Active',      vi:'Đang làm' },
      inactive:    { en:'Inactive',    vi:'Ngừng dùng' },
      ended:       { en:'Ended',       vi:'Đã kết thúc' },
      leave:       { en:'Leave',       vi:'Nghỉ phép' },
      suspended:   { en:'Suspended',   vi:'Tạm đình chỉ' },
      terminated:  { en:'Terminated',  vi:'Chấm dứt' }
    };
    var item = labels[s] || { en:s, vi:s };
    return lang() === 'en' ? item.en : item.vi;
  }

  function employeeStatusClass(status){
    status = String(status || 'active');
    if (status === 'active') return 'is-active';
    if (status === 'leave') return 'is-warn';
    if (status === 'inactive' || status === 'ended' || status === 'suspended' || status === 'terminated') return 'is-bad';
    return '';
  }

  function assignmentStatus(e){
    var status = String((e && (e.assignment_status || e.employment_status)) || 'active');
    if (status === 'terminated') status = 'ended';
    // Soft-end fallback: backend governance forbids hard-delete on
    // hcm_employee_position_assignments, so the Remove flow sets
    // effective_to <= today instead of changing assignment_status. Treat
    // those rows as ended so they drop out of activeEmployees() filters.
    if (status === 'active' && e && e.effective_to){
      var effTo = String(e.effective_to).slice(0, 10);
      var today = new Date().toISOString().slice(0, 10);
      if (effTo && effTo <= today) status = 'ended';
    }
    return status;
  }

  function assignmentTypeLabel(type){
    type = String(type || '').trim();
    var labels = {
      primary: { en:'Primary', vi:'Chính' },
      role: { en:'Role', vi:'Vai trò' },
      concurrent: { en:'Concurrent', vi:'Kiêm nhiệm' },
      acting: { en:'Acting', vi:'Phụ trách' },
      backup: { en:'Backup', vi:'Dự phòng' },
      temporary: { en:'Temporary', vi:'Tạm thời' }
    };
    var item = labels[type];
    return item ? (lang() === 'en' ? item.en : item.vi) : '';
  }

  function isPrimaryAssignment(e){
    if (!e) return false;
    if (e.is_primary === true || e.is_primary === 't' || e.is_primary === 'true' || e.is_primary === 1) return true;
    return String(e.assignment_type || '') === 'primary';
  }

  function assignmentPrimaryBadgeHtml(e){
    var primary = isPrimaryAssignment(e);
    var label = primary
      ? (lang() === 'en' ? 'Primary' : 'Chính')
      : (lang() === 'en' ? 'Concurrent' : 'Kiêm nhiệm');
    var icon = primary ? '🎯' : '➕';
    var tip = primary
      ? (lang() === 'en' ? 'Primary appointment — shown as this employee’s main title' : 'Bổ nhiệm chính — chức danh hiển thị trên sơ đồ tổ chức')
      : (lang() === 'en' ? 'Concurrent appointment — secondary to the employee’s primary title' : 'Bổ nhiệm kiêm nhiệm — chức danh phụ bên cạnh chức danh chính');
    var cls = primary ? 'is-active' : 'is-warn';
    return '<span class="org-assignee-status '+cls+'" title="'+esc(tip)+'">'+icon+' '+esc(label)+'</span>';
  }

  function employeeInitials(name){
    var words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    var picked = words.length > 1 ? words.slice(-2) : words.slice(0, 1);
    return picked.map(function(w){ return w.charAt(0); }).join('').toUpperCase();
  }

  function employeeSingleAssigneePositionVisual(e, kind){
    var id = employeeIdentity(e);
    if (!id || !S || !S.employeesByPosition) return '';
    var values = [];
    Object.keys(S.employeesByPosition).forEach(function(positionId){
      var rows = S.employeesByPosition[positionId] || [];
      var active = activeEmployees(rows);
      if (active.length !== 1 || employeeIdentity(active[0]) !== id) return;
      var p = S.byPositionId[positionId] || {};
      var meta = safeJson(p.metadata);
      values.push(kind === 'icon'
        ? firstText(meta.org_chart_icon, meta.icon)
        : firstText(meta.org_chart_image, meta.image_url, meta.image_data_url, meta.photo_url));
    });
    return firstText.apply(null, values);
  }

  function employeeAvatarUrl(e){
    var profile = employeeProfile(e) || {};
    var meta = safeJson(e && e.metadata);
    var profileMeta = safeJson(profile.metadata);
    return firstText(
      profile.avatar_image,
      profile.avatar_url,
      profile.photo_url,
      profile.image_url,
      profile.avatar_image_url,
      profileMeta.avatar_url,
      profileMeta.photo_url,
      profileMeta.image_url,
      profileMeta.image_data_url,
      profileMeta.avatar_image,
      meta.avatar_url,
      meta.photo_url,
      meta.image_url,
      meta.image_data_url,
      meta.avatar_image,
      employeeSingleAssigneePositionVisual(e, 'image')
    );
  }

  function employeeAvatarLabel(e, name){
    var profile = employeeProfile(e) || {};
    var meta = safeJson(e && e.metadata);
    var profileMeta = safeJson(profile.metadata);
    return firstText(
      profile.avatar_icon,
      profile.avatar,
      profileMeta.avatar_icon,
      profileMeta.avatar,
      meta.avatar_icon,
      meta.avatar,
      employeeSingleAssigneePositionVisual(e, 'icon'),
      employeeInitials(name)
    );
  }

  function positionVisual(p, employees){
    var meta = safeJson(p && p.metadata);
    var active = activeEmployees(employees || []);
    var groupImage = firstText(meta.org_chart_image, meta.image_url, meta.image_data_url, meta.photo_url);
    var groupIcon = firstText(meta.org_chart_icon, meta.icon, positionIcon(p && p.position_title));
    var single = active.length === 1 ? active[0] : null;
    var personImage = single ? employeeAvatarUrl(single) : '';
    var personIcon = single ? employeeAvatarLabel(single, employeeDisplayName(single)) : '';
    return {
      icon: single ? firstText(personIcon, groupIcon) : groupIcon,
      image: active.length === 1 ? personImage : groupImage
    };
  }

  function visualHtml(imageUrl, fallbackText, className, color){
    var style = 'background:color-mix(in srgb,'+color+' 16%,#fff);color:'+color;
    return '<span class="'+esc(className || 'org-photo')+'" style="'+style+'">'
      + (imageUrl
          ? '<img src="'+esc(imageUrl)+'" alt="">'
          : '<span>'+esc(fallbackText || '?')+'</span>')
      + '</span>';
  }

  function positionAssigneeLabel(employees){
    var active = activeEmployees(employees);
    if (active.length === 1){
      var name = employeeDisplayName(active[0]);
      // Surface concurrent appointments on the card meta so a single-person
      // position card does not look identical when filled by a primary vs. by
      // a kiêm-nhiệm holder. The detail modal still shows the full primary
      // count separately.
      if (!isPrimaryAssignment(active[0])){
        return name + ' (' + (lang() === 'en' ? 'concurrent' : 'kiêm nhiệm') + ')';
      }
      return name;
    }
    if (active.length > 1){
      var primaryCount = active.filter(isPrimaryAssignment).length;
      var concurrentCount = active.length - primaryCount;
      if (concurrentCount > 0 && primaryCount > 0){
        return (lang() === 'en'
          ? primaryCount + ' primary · ' + concurrentCount + ' concurrent'
          : primaryCount + ' chính · ' + concurrentCount + ' kiêm');
      }
      if (concurrentCount > 0 && primaryCount === 0){
        return concurrentCount + ' ' + (lang() === 'en' ? 'concurrent' : 'kiêm nhiệm');
      }
      return active.length + ' ' + (lang() === 'en' ? 'people assigned' : 'người được bổ nhiệm');
    }
    if ((employees || []).length > 0) return lang() === 'en' ? 'No active assignee' : 'Chưa có người đang làm';
    return lang() === 'en' ? 'Unassigned' : 'Chưa bổ nhiệm';
  }

  function mergeEmployeeProfiles(){
    var byId = {};
    Array.prototype.slice.call(arguments).forEach(function(list){
      (list || []).forEach(function(profile){
        if (!profile || typeof profile !== 'object') return;
        var keys = profileIdentityKeys(profile);
        if (!keys.length) return;
        var primary = keys[0];
        var existing = byId[primary] || {};
        byId[primary] = Object.assign({}, existing, profile);
        keys.forEach(function(k){ byId[k] = byId[primary]; });
      });
    });
    return uniqueStrings(Object.keys(byId)).map(function(k){ return byId[k]; });
  }

  function loadAll(force){
    if (S.loading) return S._loadingPromise || Promise.resolve();
    if (S.loaded && !force) return Promise.resolve();
    S.loading = true; S.error = '';
    // Cache-bust with _t param + no-store fetch — runtime list responses are
    // cached by upstream layers (browser HTTP cache + possible CDN) and serve
    // stale row_version, which causes 409 conflict on save.
    var _t = Date.now();
    var noCache = { cache:'no-store', headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'} };
    function freshRuntimeList(domain, table, params){
      var url = '/api/v1/runtime/'+encodeURIComponent(domain)+'/'+encodeURIComponent(table)+
        '?'+Object.keys(params).filter(function(k){return params[k]!=null && params[k]!=='';})
            .map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}).join('&');
      return UI.fetchJson(url, noCache).then(function(r){
        return Array.isArray(r) ? {data:r,total:r.length,raw:r}
             : (r && Array.isArray(r.records)) ? {data:r.records,total:r.total!=null?r.total:r.records.length,raw:r}
             : (r && Array.isArray(r.data))    ? {data:r.data,total:r.total!=null?r.total:r.data.length,raw:r}
             : {data:[],total:0,raw:r};
      });
    }
    function freshList(table, params){
      return freshRuntimeList('hcm_workforce', table, params);
    }
    function optionalList(domain, table, params){
      return freshRuntimeList(domain, table, params).catch(function(err){
        console.warn('[admin-org] optional employee profile load failed', err);
        return { data:[], total:0, raw:{ ok:false, error:(err && err.message) || 'optional_load_failed' } };
      });
    }
    function optionalUsers(){
      if (typeof window.loadSharedAdminUsers === 'function') {
        return window.loadSharedAdminUsers(true).then(function(users){
          users = Array.isArray(users) ? users : [];
          return { data: users, total: users.length, raw:{ source:'loadSharedAdminUsers' } };
        }).catch(function(err){
          console.warn('[admin-org] shared admin user load failed', err);
          return optionalUsersFromApi();
        });
      }
      if (Array.isArray(window.USERS) && window.USERS.length) {
        return Promise.resolve({ data: window.USERS, total: window.USERS.length, raw:{ source:'window.USERS' } });
      }
      return optionalUsersFromApi();
    }
    function optionalUsersFromApi(){
      var request = (typeof window.apiCall === 'function')
        ? window.apiCall('admin_users_list', { _t:_t }, 'GET')
        : UI.fetchJson('api.php?action=admin_users_list&_t='+encodeURIComponent(_t), noCache);
      return request
        .then(function(r){
          var users = r && Array.isArray(r.users) ? r.users
            : r && r.data && Array.isArray(r.data.users) ? r.data.users
            : r && Array.isArray(r.data) ? r.data
            : Array.isArray(r) ? r : [];
          return { data: users, total: users.length, raw: r };
        }).catch(function(err){
          console.warn('[admin-org] optional admin user load failed', err);
          return { data:[], total:0, raw:{ ok:false, error:(err && err.message) || 'optional_user_load_failed' } };
        });
    }
    var p = optionalUsers().then(function(userResult){
      return Promise.all([
        freshList('hcm_org_units', {limit:500, sort:'org_unit_code', direction:'asc', _t:_t}),
        freshList('hcm_positions', {limit:500, sort:'position_code', direction:'asc', _t:_t}),
        freshList('hcm_employees', {limit:500, sort:'employee_id',   direction:'asc', _t:_t}),
        optionalList('hcm_workforce', 'hcm_employee_position_assignments', {limit:1000, sort:'employee_id', direction:'asc', _t:_t})
      ]).then(function(results){ return { results:results, userResult:userResult }; });
    }).then(function(bundle){
      var results = bundle.results || [];
      var userResult = bundle.userResult || {};
      S.units        = (results[0] && results[0].data) || [];
      S.positions    = (results[1] && results[1].data) || [];
      S.hcmEmployees = (results[2] && results[2].data) || [];
      S.assignments  = (results[3] && results[3].data) || [];
      S.users        = userResult.data || [];
      S.employeeProfiles = mergeEmployeeProfiles(
        S.users,
        Array.isArray(window.USERS) ? window.USERS : []
      );
      S.loaded = true;
      indexData();
      hydrateManualPositionsFromMetadata();
    }).catch(function(err){
      S.error = (err && err.message) || 'org_load_failed';
    }).then(function(){
      S.loading = false;
      S._loadingPromise = null;
    });
    S._loadingPromise = p;
    return p;
  }

  /* ──────────────────────────────────────────────────────────────────────── *
   * One-time CSS injection
   * ──────────────────────────────────────────────────────────────────────── */
  function injectCss(){
    if (document.getElementById('admin-org-console-css')) return;
    var css = ''
      + '.org-console{display:flex;flex-direction:column;gap:14px;font-family:inherit;color:var(--text-1);min-height:0}'
      + '.org-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}'
      + '.org-kpi{position:relative;padding:12px 14px 12px 18px;border:1px solid var(--border-1,#e5e7eb);border-radius:12px;background:var(--surface-1,#fff);overflow:hidden}'
      + '.org-kpi-band{position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:12px 0 0 12px}'
      + '.org-kpi-label{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-3,#9ca3af)}'
      + '.org-kpi-value{font-size:22px;font-weight:800;line-height:1.15;margin-top:4px;color:var(--text-1)}'
      + '.org-kpi-hint{font-size:11px;color:var(--text-3);margin-top:4px}'
      + '.org-toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:12px;background:var(--surface-1,#fff)}'
      + '.org-toolbar input[type="search"]{flex:1;min-width:220px;height:34px;padding:0 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:8px;font-size:12px;background:var(--surface-1,#fff);color:var(--text-1)}'
      + '.org-toolbar select{height:34px;padding:0 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:8px;font-size:12px;background:var(--surface-1,#fff);color:var(--text-1)}'
      + '.org-chip{height:34px;padding:0 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:10px;background:var(--surface-1,#fff);color:var(--text-1);cursor:pointer;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;transition:all .15s}'
      + '.org-chip:hover{border-color:var(--brand-primary,#4f46e5)}'
      + '.org-chip.is-active{background:var(--brand-primary,#4f46e5);color:#fff;border-color:var(--brand-primary,#4f46e5)}'
      + '.org-chip.is-active:hover{filter:brightness(.96)}'
      + '.org-grid{display:grid;grid-template-columns:280px minmax(0,1fr) 340px;gap:14px;min-height:0;height:min(760px,calc(100vh - 260px));flex:1 1 auto}'
      + '.admin-panel.is-scoped-scroll>.org-console{height:100%;overflow:hidden}'
      + '.admin-panel.is-scoped-scroll>.org-console .org-grid{height:auto;min-height:0}'
      + '@media(max-width:1180px){.org-grid{grid-template-columns:240px minmax(0,1fr)}.org-pane-right{grid-column:1/-1}}'
      + '.org-pane{border:1px solid var(--border-1,#e5e7eb);border-radius:14px;background:var(--surface-1,#fff);display:flex;flex-direction:column;min-height:0;overflow:hidden}'
      + '.org-pane-head{padding:10px 14px;border-bottom:1px solid var(--border-1,#e5e7eb);font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--surface-2,#f9fafb)}'
      + '.org-pane-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:8px}'
      + '.org-tree{padding:4px 6px;font-size:13px}'
      + '.org-tree-node{margin:1px 0}'
      + '.org-tree-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;cursor:pointer;border:1px solid transparent;line-height:1.25}'
      + '.org-tree-row:hover{background:var(--surface-2,#f9fafb)}'
      + '.org-tree-row.is-selected{background:color-mix(in srgb,var(--brand-primary,#4f46e5) 14%,transparent);border-color:var(--brand-primary,#4f46e5)}'
      + '.org-tree-row.is-inactive{opacity:.55}'
      + '.org-tree-toggle{width:18px;text-align:center;color:var(--text-3);user-select:none;cursor:pointer}'
      + '.org-tree-name{flex:1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.org-tree-code{font-size:10px;color:var(--text-3);font-family:ui-monospace,monospace}'
      + '.org-tree-count{font-size:10px;background:var(--surface-2,#f9fafb);border:1px solid var(--border-1,#e5e7eb);border-radius:9999px;padding:1px 7px;color:var(--text-2);font-weight:700}'
      + '.org-tree-children{margin-left:14px;border-left:1px dashed var(--border-1,#e5e7eb);padding-left:6px}'
      + '.org-unit-card{margin:8px;border-radius:14px;border:1px solid var(--border-1,#e5e7eb);background:var(--surface-1,#fff);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.02)}'
      + '.org-unit-head{padding:14px 16px;display:flex;flex-direction:column;gap:4px;border-bottom:1px solid var(--border-1,#e5e7eb);position:relative}'
      + '.org-unit-head::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px}'
      + '.org-unit-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--text-3);font-size:12px}'
      + '.org-unit-title{font-size:18px;font-weight:800;color:var(--text-1);display:flex;align-items:center;gap:8px}'
      + '.org-unit-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;padding:10px 16px;background:var(--surface-2,#f9fafb);border-bottom:1px solid var(--border-1,#e5e7eb)}'
      + '.org-unit-stat-l{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-3)}'
      + '.org-unit-stat-v{font-size:18px;font-weight:800;color:var(--text-1);line-height:1.2;margin-top:2px}'
      + '.org-position-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:12px}'
      + '.org-position-card{position:relative;border:1px solid var(--border-1,#e5e7eb);border-radius:12px;background:var(--surface-1,#fff);padding:12px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:8px}'
      + '.org-position-card:hover{border-color:var(--brand-primary,#4f46e5);transform:translateY(-1px);box-shadow:0 4px 14px rgba(15,23,42,.06)}'
      + '.org-position-card.is-selected{border-color:var(--brand-primary,#4f46e5);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand-primary,#4f46e5) 18%,transparent)}'
      + '.org-position-card.is-inactive{opacity:.55}'
      + '.org-position-head{display:flex;align-items:center;gap:10px}'
      + '.org-position-icon{flex-shrink:0;width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;overflow:hidden}'
      + '.org-position-visual-trigger{border:0;background:transparent;padding:0;margin:0;cursor:pointer;display:inline-flex;border-radius:10px}'
      + '.org-position-visual-trigger:hover{outline:2px solid var(--brand-primary,#4f46e5);outline-offset:2px}'
      + '.org-position-icon img,.org-photo img{width:100%;height:100%;object-fit:cover;display:block}'
      + '.org-photo{flex-shrink:0;width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;overflow:hidden}'
      + '.org-position-hero{display:flex;align-items:center;gap:12px;min-width:0}'
      + '.org-position-hero-main{flex:1;min-width:0}'
      + '.org-position-title{font-weight:700;font-size:13.5px;line-height:1.25;color:var(--text-1)}'
      + '.org-position-code{font-size:10px;color:var(--text-3);font-family:ui-monospace,monospace}'
      + '.org-position-foot{display:flex;flex-wrap:wrap;gap:6px;font-size:11px;color:var(--text-2)}'
      + '.org-pos-pill{padding:2px 8px;border-radius:9999px;background:var(--surface-2,#f9fafb);border:1px solid var(--border-1,#e5e7eb);font-weight:600}'
      + '.org-pos-pill.is-warn{background:color-mix(in srgb,#f59e0b 14%,#fff);border-color:#f59e0b;color:#92400e}'
      + '.org-pos-pill.is-ok{background:color-mix(in srgb,#10b981 14%,#fff);border-color:#10b981;color:#065f46}'
      + '.org-pos-pill.is-bad{background:color-mix(in srgb,#ef4444 14%,#fff);border-color:#ef4444;color:#991b1b}'
      + '.org-detail-section{padding:10px 14px;border-bottom:1px solid var(--border-1,#e5e7eb)}'
      + '.org-detail-section:last-child{border-bottom:0}'
      + '.org-detail-l{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-3);margin-bottom:6px}'
      + '.org-detail-v{font-size:13.5px;color:var(--text-1);font-weight:600;line-height:1.4;word-break:break-word}'
      + '.org-empty{padding:24px;text-align:center;color:var(--text-3);font-size:13px}'
      + '.org-actions{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px}'
      + '.org-btn{min-height:34px;padding:0 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:8px;background:var(--surface-1,#fff);color:var(--text-1);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .12s;line-height:1}'
      + '.org-btn:hover{border-color:var(--brand-primary,#4f46e5);color:var(--brand-primary,#4f46e5)}'
      + '.org-btn.is-primary{background:var(--brand-primary,#4f46e5);color:#fff;border-color:var(--brand-primary,#4f46e5)}'
      + '.org-btn.is-primary:hover{filter:brightness(.95);color:#fff}'
      + '.org-btn.is-danger{color:#dc2626}'
      + '.org-btn.is-danger:hover{background:#fef2f2;border-color:#dc2626;color:#dc2626}'
      /* Sơ đồ tổ chức (canvas) */
      + '.org-canvas-wrap{position:relative;border:1px solid var(--border-1,#e5e7eb);border-radius:14px;background:var(--surface-1,#fff);overflow:hidden;height:calc(100vh - 220px);min-height:520px}'
      + '.org-canvas-toolbar{position:absolute;top:8px;left:8px;right:8px;z-index:5;display:flex;flex-wrap:wrap;gap:6px;align-items:center;pointer-events:none}'
      + '.org-canvas-toolbar > *{pointer-events:auto}'
      + '.org-canvas-tools{display:flex;gap:4px;padding:4px 6px;border:1px solid var(--border-1,#e5e7eb);border-radius:10px;background:var(--surface-1,#fff);box-shadow:0 2px 8px rgba(15,23,42,.06)}'
      + '.org-canvas-svg{width:100%;height:100%;display:block;cursor:grab;background:var(--surface-1,#fff);user-select:none;-webkit-user-select:none}'
      + '.org-canvas-svg.is-panning{cursor:grabbing}'
      + '.org-canvas-svg.is-dragging-node{cursor:move}'
      + '.org-canvas-svg [data-node-id]{user-select:none;-webkit-user-select:none}'
      + '.org-grid-bg{fill:var(--surface-2,#f9fafb);stroke:var(--border-1,#e5e7eb);stroke-width:.5}'
      + '.org-node-rect{fill:var(--surface-1,#fff);stroke:var(--border-1,#e5e7eb);stroke-width:1.2;rx:14;ry:14;transition:filter .15s}'
      + '.org-node-rect.is-hover{filter:drop-shadow(0 2px 8px rgba(15,23,42,.18))}'
      + '.org-node-rect.is-selected{stroke:var(--brand-primary,#4f46e5);stroke-width:2.4}'
      + '.org-node-rect.is-drop-target{stroke:#10b981;stroke-width:3;stroke-dasharray:6 3}'
      + '.org-node-rect.is-drop-illegal{stroke:#ef4444;stroke-width:3;stroke-dasharray:6 3}'
      + '.org-node-band{pointer-events:none}'
      + '.org-node-title{font-family:inherit;font-weight:800;fill:var(--text-1)}'
      + '.org-node-person{font-family:inherit;font-weight:800;fill:var(--text-1);font-size:11px}'
      + '.org-node-sub{font-family:inherit;fill:var(--text-3);font-size:10.5px}'
      + '.org-node-code{font-family:ui-monospace,monospace;fill:var(--text-3);font-size:9.5px}'
      + '.org-node-icon{font-size:18px}'
      + '.org-position-fold{opacity:0;pointer-events:none;transition:opacity .14s ease}'
      + '.org-position-node:hover .org-position-fold,.org-position-node:focus-within .org-position-fold{opacity:1;pointer-events:auto}'
      + '.org-chart-editing{background:color-mix(in srgb,var(--brand-primary,#4f46e5) 12%,#fff);border-color:var(--brand-primary,#4f46e5);color:var(--brand-primary,#4f46e5)}'
      + '.org-edge{fill:none;stroke:#64748b;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;opacity:.85}'
      + '.org-edge.is-highlight{stroke:var(--brand-primary,#4f46e5);stroke-width:2.4;opacity:1}'
      + '.org-mini{position:absolute;bottom:10px;right:10px;width:200px;height:140px;border:1px solid var(--border-1,#e5e7eb);border-radius:10px;background:var(--surface-1,#fff);overflow:hidden;z-index:5;box-shadow:0 2px 8px rgba(15,23,42,.06)}'
      + '.org-mini svg{width:100%;height:100%;display:block;background:var(--surface-2,#f9fafb)}'
      + '.org-mini-vp{fill:none;stroke:var(--brand-primary,#4f46e5);stroke-width:2}'
      + '.org-zoom-pill{height:32px;min-width:48px;padding:0 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:8px;background:var(--surface-1,#fff);font-size:11px;font-weight:800;color:var(--text-2);font-family:ui-monospace,monospace;display:inline-flex;align-items:center;justify-content:center}'
      /* Modals/forms */
      + '.org-form-row{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}'
      + '.org-form-row label{font-size:12px;font-weight:600;color:var(--text-2)}'
      + '.org-form-row input,.org-form-row select,.org-form-row textarea{padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:8px;font-size:13px;background:var(--surface-1,#fff);color:var(--text-1);font-family:inherit}'
      + '.org-form-row input:focus,.org-form-row select:focus,.org-form-row textarea:focus{outline:0;border-color:var(--brand-primary,#4f46e5);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand-primary,#4f46e5) 18%,transparent)}'
      + '.org-color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(36px,1fr));gap:6px}'
      + '.org-color-swatch{width:32px;height:32px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:transform .12s}'
      + '.org-color-swatch:hover{transform:scale(1.08)}'
      + '.org-color-swatch.is-selected{border-color:var(--text-1);transform:scale(1.08)}'
      + '.org-assignee-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:8px 0 12px}'
      + '.org-assignee-metric{border:1px solid var(--border-1,#e5e7eb);border-radius:10px;background:var(--surface-2,#f9fafb);padding:8px 10px}'
      + '.org-assignee-metric b{display:block;font-size:17px;color:var(--text-1);line-height:1.15}'
      + '.org-assignee-metric span{display:block;margin-top:3px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-3);letter-spacing:.04em}'
      + '.org-assignee-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed var(--border-1,#e5e7eb)}'
      + '.org-assignee-row:last-child{border-bottom:0}'
      + '.org-assignee-avatar{width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:color-mix(in srgb,var(--brand-primary,#4f46e5) 12%,transparent);color:var(--brand-primary,#4f46e5);font-size:11px;font-weight:800;overflow:hidden}'
      + '.org-assignee-avatar img{width:100%;height:100%;object-fit:cover;display:block}'
      + '.org-assignee-main{flex:1;min-width:0}'
      + '.org-assignee-name{font-size:13px;font-weight:800;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.org-assignee-meta{margin-top:2px;font-size:11px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.org-assignee-status{font-size:10.5px;font-weight:800;border-radius:9999px;padding:2px 8px;border:1px solid var(--border-1,#e5e7eb);background:var(--surface-2,#f9fafb);color:var(--text-2);white-space:nowrap}'
      + '.org-assignee-status.is-active{border-color:var(--hm-success,#10b981);background:color-mix(in srgb,var(--hm-success,#10b981) 14%,transparent);color:var(--hm-success-text,#065f46)}'
      + '.org-assignee-status.is-warn{border-color:var(--hm-warning,#f59e0b);background:color-mix(in srgb,var(--hm-warning,#f59e0b) 14%,transparent);color:var(--hm-warning-text,#92400e)}'
      + '.org-assignee-status.is-bad{border-color:var(--hm-danger,#ef4444);background:color-mix(in srgb,var(--hm-danger,#ef4444) 12%,transparent);color:var(--hm-danger-text,#991b1b)}'
      + '.org-assignment-picker{display:grid;grid-template-columns:1fr 180px;gap:8px;margin-bottom:8px}'
      + '.org-assignment-picker input,.org-assignment-picker select{height:36px;padding:0 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:8px;font-size:13px;background:var(--surface-1,#fff);color:var(--text-1)}'
      + '.org-assignment-count{font-size:11px;color:var(--text-3);margin:-2px 0 8px}'
      + '.org-visual-form{display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;align-items:start}'
      + '.org-visual-preview{width:96px;height:96px;border:1px solid var(--border-1,#e5e7eb);border-radius:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--surface-2,#f9fafb);font-size:38px}'
      + '.org-visual-preview img{width:100%;height:100%;object-fit:cover;display:block}'
      ;
    var s = document.createElement('style');
    s.id = 'admin-org-console-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ──────────────────────────────────────────────────────────────────────── *
   * Common toolbar
   * ──────────────────────────────────────────────────────────────────────── */
  function renderTypeChips(){
    var current = S.filter.type;
    var html = '<button type="button" class="org-chip '+(current==='all'?'is-active':'')+'" data-act="set-type" data-val="all">'+
               (lang()==='en'?'All types':'Tất cả')+'</button>';
    Object.keys(TYPE_META).forEach(function(k){
      var m = TYPE_META[k];
      var on = current === k;
      html += '<button type="button" class="org-chip '+(on?'is-active':'')+'" data-act="set-type" data-val="'+k+'">'
            + '<span>'+m.icon+'</span>' + (lang()==='en'?m.labelEn:m.label) + '</button>';
    });
    return html;
  }

  /* ──────────────────────────────────────────────────────────────────────── *
   * Phòng ban & Chức danh — three-pane workbench
   * ──────────────────────────────────────────────────────────────────────── */
  function renderOrgUnits(host){
    injectCss();
    if (!host) return;
    if (S.loading || !S.loaded){
      host.innerHTML = UI.loadingHtml(t('Loading workforce catalog…','Đang tải danh mục tổ chức…'));
      loadAll().then(function(){ renderOrgUnits(host); });
      return;
    }
    if (S.error){
      host.innerHTML = UI.errorHtml(S.error, function(){ S.loaded=false; renderOrgUnits(host); });
      return;
    }
    if (!S.units.length){
      host.innerHTML = ''
        + '<div class="org-console">'
        +   '<div class="org-empty">'+esc(t('No org units yet. Start by creating the root company node.','Chưa có đơn vị nào. Tạo công ty gốc để bắt đầu.'))+'<br>'
        +     '<button class="org-btn is-primary" style="margin-top:12px" data-act="create-unit-root">'+esc(t('+ Create root unit','+ Tạo đơn vị gốc'))+'</button>'
        +   '</div>'
        + '</div>';
      bindOrgUnitsEvents(host);
      return;
    }

    // Auto-select root if nothing selected
    if (!S.selectedUnitId || !S.byUnitId[S.selectedUnitId]){
      var roots = S.childrenOfUnit[''] || [];
      if (roots.length) S.selectedUnitId = roots[0].hcm_org_unit_id;
    }

    var totalUnits = S.units.length;
    var activeUnits = S.units.filter(function(u){ return String(u.status||'active')!=='inactive'; }).length;
    var totalPositions = S.positions.length;
    var activePositions = S.positions.filter(function(p){ return String(p.status||'active')!=='inactive'; }).length;
    var totalHc = S.positions.reduce(function(s,p){ return s + (parseInt(p.required_headcount,10)||0); }, 0);
    var filledHc = activeEmployees(S.employees).length;
    var openHc = Math.max(0, totalHc - filledHc);
    var fillPct = totalHc ? Math.round(filledHc * 100 / totalHc) : 0;

    var kpiHtml = ''
      + '<div class="org-kpi-row">'
      +   kpiCard('🏢', t('Org units','Đơn vị'),     activeUnits+' / '+totalUnits, '#0ea5e9', t('active / total','đang dùng / tổng'))
      +   kpiCard('💼', t('Positions','Vị trí'),     activePositions+' / '+totalPositions, '#8b5cf6', t('active / total','đang dùng / tổng'))
      +   kpiCard('🪑', t('Headcount','Định biên'),  filledHc+' / '+totalHc, '#10b981', fillPct+'% '+t('filled','đã điền'))
      +   kpiCard('📭', t('Open seats','Chỗ trống'), openHc+'',              '#f59e0b', openHc>0 ? t('positions to recruit','vị trí đang trống') : t('fully staffed','đã đầy đủ'))
      + '</div>';

    var toolbarHtml = ''
      + '<div class="org-toolbar">'
      +   '<input type="search" data-act="search" value="'+esc(S.filter.search||'')+'" placeholder="'+esc(t('Search unit, position, code…','Tìm đơn vị, vị trí, mã…'))+'">'
      +   '<select data-act="set-status">'
      +     '<option value="active"'  + (S.filter.status==='active'?' selected':'')   + '>'+esc(t('Active only','Đang hoạt động'))+'</option>'
      +     '<option value="inactive"'+ (S.filter.status==='inactive'?' selected':'') + '>'+esc(t('Inactive only','Ngừng dùng'))+'</option>'
      +     '<option value="all"'     + (S.filter.status==='all'?' selected':'')      + '>'+esc(t('All','Tất cả'))+'</option>'
      +   '</select>'
      +   renderTypeChips()
      +   '<span style="flex:1"></span>'
      +   '<button class="org-btn" data-act="reload">🔄 '+esc(t('Reload','Tải lại'))+'</button>'
      +   '<button class="org-btn is-primary" data-act="create-unit-root">'+esc(t('+ Unit','+ Đơn vị'))+'</button>'
      + '</div>';

    var treeHtml = renderTree();
    var detailHtml = renderUnitDetail(S.selectedUnitId);
    var positionPaneHtml = renderPositionPane(S.selectedPositionId);

    host.innerHTML = ''
      + '<div class="org-console">'
      +   kpiHtml
      +   toolbarHtml
      +   '<div class="org-grid">'
      +     '<div class="org-pane">'
      +       '<div class="org-pane-head">'
      +         '<span>'+esc(t('Org outline','Cây tổ chức'))+'</span>'
      +         '<button class="org-btn" data-act="expand-all" title="'+esc(t('Expand all','Mở rộng tất cả'))+'">⇲</button>'
      +       '</div>'
      +       '<div class="org-pane-body">'+treeHtml+'</div>'
      +     '</div>'
      +     '<div class="org-pane">'
      +       '<div class="org-pane-head">'
      +         '<span>'+esc(t('Unit detail','Chi tiết đơn vị'))+'</span>'
      +         '<span class="org-tree-code" id="orgu-bc"></span>'
      +       '</div>'
      +       '<div class="org-pane-body">'+detailHtml+'</div>'
      +     '</div>'
      +     '<div class="org-pane org-pane-right">'
      +       '<div class="org-pane-head">'
      +         '<span>'+esc(t('Position','Vị trí'))+'</span>'
      +       '</div>'
      +       '<div class="org-pane-body" id="orgu-pos-pane">'+positionPaneHtml+'</div>'
      +     '</div>'
      +   '</div>'
      + '</div>';

    bindOrgUnitsEvents(host);
    updateBreadcrumb();
  }

  function kpiCard(icon, label, value, color, hint){
    return ''
      + '<div class="org-kpi">'
      +   '<div class="org-kpi-band" style="background:'+color+'"></div>'
      +   '<div class="org-kpi-label">'+icon+' '+esc(label)+'</div>'
      +   '<div class="org-kpi-value">'+esc(String(value))+'</div>'
      +   (hint ? '<div class="org-kpi-hint">'+esc(hint)+'</div>' : '')
      + '</div>';
  }

  function unitMatchesFilter(u){
    if (S.filter.type !== 'all' && String(u.org_unit_type||'') !== S.filter.type) return false;
    var active = String(u.status||'active') !== 'inactive';
    if (S.filter.status === 'active'   && !active) return false;
    if (S.filter.status === 'inactive' &&  active) return false;
    if (S.filter.search){
      var needle = S.filter.search.toLowerCase();
      var fields = [u.org_unit_code, u.org_unit_name, u.org_unit_type];
      var positionsHere = S.positionsByUnit[u.hcm_org_unit_id] || [];
      positionsHere.forEach(function(p){ fields.push(p.position_code); fields.push(p.position_title); });
      var hay = fields.filter(Boolean).join(' ').toLowerCase();
      if (hay.indexOf(needle) < 0) return false;
    }
    return true;
  }
  function unitOrAncestorMatches(u){
    if (unitMatchesFilter(u)) return true;
    var children = S.childrenOfUnit[u.hcm_org_unit_id] || [];
    return children.some(unitOrAncestorMatches);
  }

  function renderTree(){
    var roots = S.childrenOfUnit[''] || [];
    if (!roots.length){
      return '<div class="org-empty">'+esc(t('No root unit','Chưa có đơn vị gốc'))+'</div>';
    }
    return '<div class="org-tree">' + roots.map(function(r){ return renderTreeNode(r, 0); }).join('') + '</div>';
  }
  function renderTreeNode(unit, depth){
    if (!unitOrAncestorMatches(unit)) return '';
    var meta = typeMeta(unit.org_unit_type);
    var color = unitColor(unit);
    var children = S.childrenOfUnit[unit.hcm_org_unit_id] || [];
    var positions = S.positionsByUnit[unit.hcm_org_unit_id] || [];
    var selected = S.selectedUnitId === unit.hcm_org_unit_id;
    var inactive = String(unit.status||'active') === 'inactive';
    var hasKids = children.length > 0;
    var nodeKey = String(unit.hcm_org_unit_id);
    var collapsed = S._collapsed && S._collapsed[nodeKey];
    var rowHtml = ''
      + '<div class="org-tree-row '+(selected?'is-selected':'')+' '+(inactive?'is-inactive':'')+'" data-act="select-unit" data-unit-id="'+esc(nodeKey)+'" title="'+esc(unit.org_unit_name||'')+'">'
      +   (hasKids
            ? '<span class="org-tree-toggle" data-act="toggle-tree" data-unit-id="'+esc(nodeKey)+'">'+(collapsed?'▶':'▼')+'</span>'
            : '<span class="org-tree-toggle">·</span>')
      +   '<span style="font-size:14px">'+meta.icon+'</span>'
      +   '<span class="org-tree-name" style="color:'+color+'">'+esc(unit.org_unit_name || unit.org_unit_code || '?')+'</span>'
      +   '<span class="org-tree-code">'+esc(unit.org_unit_code||'')+'</span>'
      +   (positions.length ? '<span class="org-tree-count">'+positions.length+'</span>' : '')
      + '</div>';
    var childHtml = '';
    if (hasKids && !collapsed){
      childHtml = '<div class="org-tree-children">'
                + children.map(function(c){ return renderTreeNode(c, depth+1); }).join('')
                + '</div>';
    }
    return '<div class="org-tree-node">'+rowHtml+childHtml+'</div>';
  }

  function renderUnitDetail(unitId){
    var u = S.byUnitId[unitId];
    if (!u){
      return '<div class="org-empty">'+esc(t('Select a unit from the tree on the left.','Chọn một đơn vị từ cây bên trái.'))+'</div>';
    }
    var meta = typeMeta(u.org_unit_type);
    var color = unitColor(u);
    var positions = (S.positionsByUnit[u.hcm_org_unit_id] || []).slice();
    var employeesHere = S.employeesByUnit[u.hcm_org_unit_id] || [];
    var totalHc = positions.reduce(function(s,p){ return s + (parseInt(p.required_headcount,10)||0); }, 0);
    var filledHc = activeEmployees(employeesHere).length;
    var openHc = Math.max(0, totalHc - filledHc);
    var managerEmployeeId = String(u.manager_employee_id || '');
    var manager = S.peopleById[managerEmployeeId] || S.byEmployeeId[managerEmployeeId];
    var unitMeta = safeJson(u.metadata);
    var inactive = String(u.status||'active') === 'inactive';
    var parent = u.parent_org_unit_id ? S.byUnitId[u.parent_org_unit_id] : null;

    var posHtml = positions.length
      ? positions.map(function(p){ return renderPositionCard(p, u); }).join('')
      : '<div class="org-empty" style="grid-column:1/-1">'+esc(t('No positions yet. Click + Position to add one.','Chưa có vị trí nào. Bấm + Vị trí để thêm.'))+'</div>';

    return ''
      + '<article class="org-unit-card">'
      +   '<div class="org-unit-head">'
      +     '<style>.org-unit-head::before{background:'+color+'}</style>'
      +     '<div class="org-unit-meta">'
      +       '<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:9999px;background:color-mix(in srgb,'+color+' 14%,transparent);color:'+color+';font-weight:700">'+meta.icon+' '+(lang()==='en'?meta.labelEn:meta.label)+'</span>'
      +       (parent ? '<span>↑ '+esc(parent.org_unit_name||parent.org_unit_code||'?')+'</span>' : '<span>'+esc(t('(root)','(gốc)'))+'</span>')
      +       (inactive ? UI.badge(t('Inactive','Ngừng dùng'),'danger') : UI.badge(t('Active','Đang hoạt động'),'success'))
      +       (unitMeta.cost_center ? '<span>💳 '+esc(String(unitMeta.cost_center))+'</span>' : '')
      +     '</div>'
      +     '<div class="org-unit-title"><span style="font-size:24px">'+meta.icon+'</span><span style="color:'+color+'">'+esc(u.org_unit_name||'?')+'</span><span class="org-tree-code">'+esc(u.org_unit_code||'')+'</span></div>'
      +     (manager ? '<div style="font-size:12px;color:var(--text-3);margin-top:2px">👑 '+esc(t('Manager','Trưởng đơn vị'))+': <b style="color:var(--text-1)">'+esc(employeeDisplayName(manager))+'</b></div>' : '')
      +   '</div>'
      +   '<div class="org-unit-stats">'
      +     '<div><div class="org-unit-stat-l">'+esc(t('Positions','Vị trí'))+'</div><div class="org-unit-stat-v">'+positions.length+'</div></div>'
      +     '<div><div class="org-unit-stat-l">'+esc(t('Headcount','Định biên'))+'</div><div class="org-unit-stat-v">'+totalHc+'</div></div>'
      +     '<div><div class="org-unit-stat-l">'+esc(t('Filled','Đã điền'))+'</div><div class="org-unit-stat-v" style="color:#10b981">'+filledHc+'</div></div>'
      +     '<div><div class="org-unit-stat-l">'+esc(t('Open','Còn trống'))+'</div><div class="org-unit-stat-v" style="color:'+(openHc>0?'#f59e0b':'#10b981')+'">'+openHc+'</div></div>'
      +     '<div><div class="org-unit-stat-l">'+esc(t('Children','Đơn vị con'))+'</div><div class="org-unit-stat-v">'+(S.childrenOfUnit[u.hcm_org_unit_id]||[]).length+'</div></div>'
      +   '</div>'
      +   '<div class="org-actions">'
      +     '<button class="org-btn is-primary" data-act="add-position" data-unit-id="'+esc(u.hcm_org_unit_id)+'">'+esc(t('+ Position','+ Vị trí'))+'</button>'
      +     '<button class="org-btn" data-act="add-child-unit" data-unit-id="'+esc(u.hcm_org_unit_id)+'">'+esc(t('+ Child unit','+ Đơn vị con'))+'</button>'
      +     '<button class="org-btn" data-act="edit-unit" data-unit-id="'+esc(u.hcm_org_unit_id)+'">✏️ '+esc(t('Edit','Sửa'))+'</button>'
      +     '<button class="org-btn" data-act="recolor-unit" data-unit-id="'+esc(u.hcm_org_unit_id)+'">🎨 '+esc(t('Color','Màu'))+'</button>'
      +     '<button class="org-btn" data-act="reparent-unit" data-unit-id="'+esc(u.hcm_org_unit_id)+'">🔗 '+esc(t('Reparent','Chuyển cha'))+'</button>'
      +     '<button class="org-btn '+(inactive?'is-primary':'is-danger')+'" data-act="toggle-unit" data-unit-id="'+esc(u.hcm_org_unit_id)+'">'+esc(inactive?t('Activate','Kích hoạt'):t('Archive','Ngừng dùng'))+'</button>'
      +     '<button class="org-btn" data-act="open-chart" data-unit-id="'+esc(u.hcm_org_unit_id)+'">'+esc(t('View on chart','Xem trên sơ đồ'))+' ↗</button>'
      +   '</div>'
      +   '<div class="org-position-grid">'+posHtml+'</div>'
      + '</article>';
  }

  function renderPositionCard(p, unit){
    var color = unitColor(unit);
    var employees = S.employeesByPosition[p.hcm_position_id] || [];
    var filled = activeEmployees(employees).length;
    var hc = parseInt(p.required_headcount,10) || 1;
    var open = Math.max(0, hc - filled);
    var inactive = String(p.status||'active') === 'inactive';
    var fillCls = open>0 ? 'is-warn' : 'is-ok';
    var selected = S.selectedPositionId === p.hcm_position_id;
    var visual = positionVisual(p, employees);
    var assignee = positionAssigneeLabel(employees);
    var typeBadge = p.employment_type ? '<span class="org-pos-pill">'+esc(p.employment_type)+'</span>' : '';
    var gradeBadge = p.grade_code ? '<span class="org-pos-pill">'+esc(p.grade_code)+'</span>' : '';
    var hover = [
      p.position_title || '',
      unit ? (t('Org unit','Đơn vị') + ': ' + (unit.org_unit_name || '')) : '',
      hc ? (t('Headcount','Định biên') + ': ' + hc) : '',
      p.employment_type ? (t('Type','Loại') + ': ' + p.employment_type) : '',
      p.grade_code ? (t('Grade','Bậc') + ': ' + p.grade_code) : ''
    ].filter(Boolean).join('\n');
    return ''
      + '<div class="org-position-card '+(selected?'is-selected':'')+' '+(inactive?'is-inactive':'')+'" data-act="select-position" data-pos-id="'+esc(p.hcm_position_id)+'" title="'+esc(hover)+'">'
      +   '<div class="org-position-head">'
      +     visualHtml(visual.image, visual.icon, 'org-position-icon', color)
      +     '<div style="flex:1;min-width:0">'
      +       '<div class="org-position-title">'+esc(p.position_title||'?')+'</div>'
      +       '<div class="org-assignee-meta">'+esc(assignee)+'</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="org-position-foot">'
      +     '<span class="org-pos-pill '+fillCls+'">'+filled+'/'+hc+' '+esc(t('filled','đã điền'))+'</span>'
      +     (open>0 ? '<span class="org-pos-pill is-warn">+'+open+' '+esc(t('open','trống'))+'</span>' : '')
      +     (inactive ? '<span class="org-pos-pill is-bad">'+esc(t('inactive','ngừng dùng'))+'</span>' : '')
      +   '</div>'
      + '</div>';
  }

  function renderPositionPane(positionId){
    var p = positionId ? S.byPositionId[positionId] : null;
    if (!p){
      return '<div class="org-empty">'+esc(t('Select a position card to see its detail and assigned people.','Chọn một thẻ vị trí để xem chi tiết và nhân sự được giao.'))+'</div>';
    }
    var u = S.byUnitId[p.hcm_org_unit_id];
    var employees = (S.employeesByPosition[p.hcm_position_id] || []).slice();
    var reportsTo = p.reports_to_position_id ? S.byPositionId[p.reports_to_position_id] : null;
    var hc = parseInt(p.required_headcount,10) || 1;
    var filled = activeEmployees(employees).length;
    var open = Math.max(0, hc - filled);
    var visual = positionVisual(p, employees);
    var inactive = String(p.status||'active') === 'inactive';

    var employeeRows = employees.length ? employees.map(function(e){
      var status = assignmentStatus(e);
      var name = employeeDisplayName(e);
      var secondary = employeeSecondaryLabel(e);
      var avatar = employeeAvatarUrl(e);
      return '<div class="org-assignee-row"'+(secondary ? ' title="'+esc(secondary)+'"' : '')+'>'
           +   visualHtml(avatar, employeeAvatarLabel(e, name), 'org-assignee-avatar', '#4f46e5')
           +   '<span class="org-assignee-main">'
           +     '<span class="org-assignee-name">'+esc(name)+'</span>'
           +   '</span>'
           +   assignmentPrimaryBadgeHtml(e)
           +   '<span class="org-assignee-status '+employeeStatusClass(status)+'">'+esc(statusLabel(status))+'</span>'
           +   '<button class="org-btn is-danger" data-act="remove-assignee" data-pos-id="'+esc(p.hcm_position_id)+'" data-assignment-id="'+esc(e.hcm_assignment_id||'')+'" data-employee-id="'+esc(employeeIdentity(e))+'">'+esc(t('Remove','Xóa'))+'</button>'
           + '</div>';
    }).join('') : '<div class="org-empty" style="padding:14px">'+esc(t('No employees assigned to this position yet.','Chưa có nhân sự nào được giao vào vị trí này.'))+'</div>';

    return ''
      + '<div class="org-detail-section">'
      +   '<div class="org-position-hero">'
      +     '<button type="button" class="org-position-visual-trigger" data-act="edit-position-visual" data-pos-id="'+esc(p.hcm_position_id)+'" title="'+esc(t('Edit position icon/image','Sửa icon / hình chức danh'))+'">'
      +       visualHtml(visual.image, visual.icon, 'org-position-icon', (u?unitColor(u):'#4f46e5'))
      +     '</button>'
      +     '<div class="org-position-hero-main">'
      +       '<div style="font-weight:800;font-size:15px;color:var(--text-1)">'+esc(p.position_title||'?')+'</div>'
      +       '<div class="org-assignee-meta">'+esc(positionAssigneeLabel(employees))+'</div>'
      +     '</div>'
      +     (inactive ? UI.badge(t('Inactive','Ngừng dùng'),'danger') : UI.badge(t('Active','Đang hoạt động'),'success'))
      +   '</div>'
      + '</div>'
      + '<div class="org-detail-section">'
      +   '<div class="org-detail-l">'+esc(t('Org unit','Đơn vị'))+'</div>'
      +   '<div class="org-detail-v">'+(u ? esc(u.org_unit_name||'—') : '—')+'</div>'
      + '</div>'
      + '<div class="org-detail-section">'
      +   '<div class="org-detail-l">'+esc(t('Reports to','Báo cáo cho'))+'</div>'
      +   '<div class="org-detail-v">'+(reportsTo ? esc(reportsTo.position_title||'—') : '—')+'</div>'
      + '</div>'
      + '<div class="org-detail-section" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +   '<div><div class="org-detail-l">'+esc(t('Type','Loại'))+'</div><div class="org-detail-v">'+esc(p.employment_type||'—')+'</div></div>'
      +   '<div><div class="org-detail-l">'+esc(t('Grade','Bậc'))+'</div><div class="org-detail-v">'+esc(p.grade_code||'—')+'</div></div>'
      +   '<div><div class="org-detail-l">'+esc(t('Headcount','Định biên'))+'</div><div class="org-detail-v">'+hc+'</div></div>'
      +   '<div><div class="org-detail-l">'+esc(t('Filled','Đã điền'))+'</div><div class="org-detail-v" style="color:#10b981">'+filled+'</div></div>'
      +   '<div><div class="org-detail-l">'+esc(t('Open','Còn trống'))+'</div><div class="org-detail-v" style="color:'+(open>0?'#f59e0b':'#10b981')+'">'+open+'</div></div>'
      + '</div>'
      + '<div class="org-detail-section">'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">'
      +     '<div class="org-detail-l" style="margin-bottom:0">'+esc(t('Assigned employees','Nhân sự được giao'))+' ('+employees.length+')</div>'
      +     '<button class="org-btn is-primary" data-act="add-assignee" data-pos-id="'+esc(p.hcm_position_id)+'">'+esc(t('+ Person','+ Nhân sự'))+'</button>'
      +   '</div>'
      +   employeeRows
      + '</div>'
      + '<div class="org-actions" style="border-top:1px solid var(--border-1,#e5e7eb)">'
      +   '<button class="org-btn is-primary" data-act="add-assignee" data-pos-id="'+esc(p.hcm_position_id)+'">'+esc(t('+ Person','+ Nhân sự'))+'</button>'
      +   '<button class="org-btn" data-act="edit-position" data-pos-id="'+esc(p.hcm_position_id)+'">✏️ '+esc(t('Edit','Sửa'))+'</button>'
      +   '<button class="org-btn" data-act="reparent-position" data-pos-id="'+esc(p.hcm_position_id)+'">🔗 '+esc(t('Move to dept','Chuyển phòng'))+'</button>'
      +   '<button class="org-btn is-danger" data-act="delete-position" data-pos-id="'+esc(p.hcm_position_id)+'">🗑️ '+esc(t('Delete','Xóa'))+'</button>'
      + '</div>';
  }

  function openPositionAssignmentsModal(positionId, host){
    var p = positionId ? S.byPositionId[positionId] : null;
    if (!p) return;
    var u = S.byUnitId[p.hcm_org_unit_id] || null;
    var employees = (S.employeesByPosition[p.hcm_position_id] || []).slice().sort(compareEmployeesByDisplayName);
    var active = activeEmployees(employees);
    var hc = parseInt(p.required_headcount, 10) || 1;
    var open = Math.max(0, hc - active.length);
    var over = Math.max(0, active.length - hc);
    var visual = positionVisual(p, employees);
    var rows = employees.length ? employees.map(function(e){
      var status = assignmentStatus(e);
      var name = employeeDisplayName(e);
      var secondary = employeeSecondaryLabel(e);
      var avatar = employeeAvatarUrl(e);
      return '<div class="org-assignee-row"'+(secondary ? ' title="'+esc(secondary)+'"' : '')+'>'
           +   visualHtml(avatar, employeeAvatarLabel(e, name), 'org-assignee-avatar', '#4f46e5')
           +   '<span class="org-assignee-main">'
           +     '<span class="org-assignee-name">'+esc(name)+'</span>'
           +   '</span>'
           +   assignmentPrimaryBadgeHtml(e)
           +   '<span class="org-assignee-status '+employeeStatusClass(status)+'">'+esc(statusLabel(status))+'</span>'
           +   '<button class="org-btn is-danger" data-act="remove-assignee" data-pos-id="'+esc(p.hcm_position_id)+'" data-assignment-id="'+esc(e.hcm_assignment_id||'')+'" data-employee-id="'+esc(employeeIdentity(e))+'">'+esc(t('Remove','Xóa'))+'</button>'
           + '</div>';
    }).join('') : '<div class="org-empty" style="padding:18px">'+esc(t('No employees assigned to this position yet.','Chưa có nhân sự nào được bổ nhiệm vào vị trí này.'))+'</div>';
    var singleAssigneeId = active.length === 1 ? employeeIdentity(active[0]) : '';
    var groupVisualAction = active.length === 1
      ? '<div class="org-detail-section" style="padding:10px 0;border-bottom:0">'
        + '<button class="org-btn" data-act="edit-user-visual" data-employee-id="'+esc(singleAssigneeId)+'">🖼️ '+esc(t('Edit user image','Sửa hình nhân sự'))+'</button>'
        + '<span class="org-assignment-count" style="margin-left:8px">'+esc(t('Single-person positions use the assigned user profile image.','Vị trí 1 người dùng hình hồ sơ user được bổ nhiệm.'))+'</span>'
        + '</div>'
      : '<div class="org-detail-section" style="padding:10px 0;border-bottom:0">'
        + '<button class="org-btn" data-act="edit-group-visual" data-pos-id="'+esc(p.hcm_position_id)+'">🖼️ '+esc(t('Position icon / image','Icon / hình chức danh'))+'</button>'
        + '<span class="org-assignment-count" style="margin-left:8px">'+esc(t('Used when the position has no assignee or multiple assignees.','Dùng khi vị trí chưa có nhân sự hoặc có nhiều nhân sự.'))+'</span>'
        + '</div>';
    var body = document.createElement('div');

    body.innerHTML = ''
      + '<div class="org-position-hero" style="margin-bottom:10px">'
      +   visualHtml(visual.image, visual.icon, 'org-position-icon', (u?unitColor(u):'#4f46e5'))
      +   '<div class="org-position-hero-main">'
      +     '<div style="font-size:15px;font-weight:800;color:var(--text-1)">'+esc(p.position_title || '?')+'</div>'
      +     '<div style="font-size:12px;color:var(--text-3);margin-top:2px">'+esc(u ? (u.org_unit_name || '') : '')+'</div>'
      +   '</div>'
      + '</div>'
      + '<div class="org-assignee-summary">'
      +   '<div class="org-assignee-metric"><b>'+active.length+'</b><span>'+esc(t('Active assigned','Đang làm'))+'</span></div>'
      +   '<div class="org-assignee-metric"><b>'+employees.length+'</b><span>'+esc(t('Assignment records','Hồ sơ bổ nhiệm'))+'</span></div>'
      +   '<div class="org-assignee-metric"><b>'+hc+'</b><span>'+esc(t('Required headcount','Định biên'))+'</span></div>'
      +   '<div class="org-assignee-metric"><b>'+open+'</b><span>'+esc(t('Open seats','Còn trống'))+'</span></div>'
      +   '<div class="org-assignee-metric"><b>'+over+'</b><span>'+esc(t('Over headcount','Vượt định biên'))+'</span></div>'
      + '</div>'
      + groupVisualAction
      + '<div class="org-detail-l">'+esc(t('Assigned people','Danh sách người được bổ nhiệm'))+'</div>'
      + rows;

    var modalRef = modal({
      title: t('Position assignments','Chi tiết bổ nhiệm vị trí'),
      body: body,
      width: '620px',
      buttons: [
        { label: t('+ Add person','+ Thêm nhân sự'), variant:'primary', onClick:function(close){ close(); openAssignmentModal(positionId, host); return false; } },
        { label: t('Close','Đóng'), variant:'secondary', onClick:function(close){ close(); } }
      ]
    });
    body.addEventListener('click', function(ev){
      var groupBtn = ev.target.closest('[data-act="edit-group-visual"]');
      if (groupBtn){
        try { modalRef && modalRef.close && modalRef.close(); } catch(_){}
        openPositionVisualModal(positionId, host);
        return;
      }
      var userVisualBtn = ev.target.closest('[data-act="edit-user-visual"]');
      if (userVisualBtn){
        try { modalRef && modalRef.close && modalRef.close(); } catch(_){}
        openAssignedUserModal(userVisualBtn.getAttribute('data-employee-id') || '');
        return;
      }
      var btn = ev.target.closest('[data-act="remove-assignee"]');
      if (!btn) return;
      removeAssigneeFromAttrs(btn, host, function(){
        try { modalRef && modalRef.close && modalRef.close(); } catch(_){}
        openPositionAssignmentsModal(positionId, host);
      });
    });
  }

  function assignmentPeopleCandidates(){
    var byId = {};
    function add(person){
      var id = employeeIdentity(person);
      if (!id) return;
      byId[id] = Object.assign({}, byId[id] || {}, person, { employee_id: id });
    }
    (S.employeeProfiles || []).forEach(add);
    (S.users || []).forEach(add);
    (S.hcmEmployees || []).forEach(add);
    if (Array.isArray(window.USERS)) window.USERS.forEach(add);
    // Dedup: hcm_employees stores canonical EMP... ids; users.json creates duplicate entries
    // keyed by username. Merge username-keyed entries into their canonical EMP... entries
    // using hcm_employees.source_record_id (which holds the username) as the link key.
    (S.hcmEmployees || []).forEach(function(hcme){
      var empId = String(hcme.employee_id || '').trim();
      var altKey = String(hcme.source_record_id || '').trim();
      if (!empId || !altKey || altKey === empId) return;
      if (!byId[altKey] || !byId[empId]) return;
      // Merge user-profile display data into the canonical entry, keep EMP id
      byId[empId] = Object.assign({}, byId[altKey], byId[empId], { employee_id: empId });
      delete byId[altKey];
    });
    return Object.keys(byId).map(function(id){ return byId[id]; }).sort(compareEmployeesByDisplayName);
  }

  function assignmentPersonSearchText(person){
    var profile = employeeProfile(person) || {};
    var meta = safeJson(person && person.metadata);
    return [
      employeeIdentity(person),
      employeeDisplayName(person),
      employeeSecondaryLabel(person),
      person && person.username,
      person && person.user_id_code,
      person && person.dept,
      person && person.title,
      profile.username,
      profile.dept,
      profile.title,
      profile.role_label,
      meta.dept,
      meta.title
    ].map(function(v){ return String(v || '').toLowerCase(); }).join(' ');
  }

  function openAssignmentModal(positionId, host){
    var p = positionId ? S.byPositionId[positionId] : null;
    if (!p) return;
    var people = assignmentPeopleCandidates();
    if (!people.length){
      UI.toast(t('No employee/user catalog available','Chưa có danh mục nhân sự để chọn'), 'error');
      return;
    }
    var body = document.createElement('div');
    var today = new Date().toISOString().slice(0, 10);
    body.innerHTML = ''
      + '<div class="org-form-row"><label>'+esc(t('Person','Nhân sự'))+'</label>'
      +   '<div class="org-assignment-picker">'
      +     '<input type="search" data-f="employee_search" placeholder="'+esc(t('Search name, username, employee ID, role...','Tìm tên, username, mã nhân viên, vai trò...'))+'">'
      +     '<select data-f="employee_scope">'
      +       '<option value="all">'+esc(t('All people','Tất cả nhân sự'))+'</option>'
      +       '<option value="unassigned">'+esc(t('Not assigned here','Chưa gán vị trí này'))+'</option>'
      +     '</select>'
      +   '</div>'
      +   '<select data-f="employee_id"></select>'
      +   '<div class="org-assignment-count" data-role="people-count"></div>'
      + '</div>'
      + '<div class="org-form-row"><label>'+esc(t('Assignment type','Loại bổ nhiệm'))+'</label><select data-f="assignment_type">'
      +   ['concurrent','role','primary','acting','backup','temporary'].map(function(v){
            return '<option value="'+v+'">'+esc(assignmentTypeLabel(v) || v)+'</option>';
          }).join('')
      + '</select></div>'
      + '<div class="org-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +   '<div><label>'+esc(t('FTE','FTE'))+'</label><input type="number" step="0.05" min="0.05" max="1.50" data-f="fte_fraction" value="1.00"></div>'
      +   '<div><label>'+esc(t('Effective from','Hiệu lực từ'))+'</label><input type="date" data-f="effective_from" value="'+today+'"></div>'
      + '</div>'
      + '<div class="org-form-row"><label>'+esc(t('Note','Ghi chú'))+'</label><textarea data-f="note" rows="3" placeholder="'+esc(t('Reason or scope of the appointment','Lý do hoặc phạm vi bổ nhiệm'))+'"></textarea></div>';
    var assignedHere = {};
    (S.employeesByPosition[p.hcm_position_id] || []).forEach(function(row){
      var id = employeeIdentity(row);
      if (id && assignmentStatus(row) === 'active') assignedHere[id] = true;
    });
    function refreshPeopleOptions(){
      var search = String((body.querySelector('[data-f="employee_search"]') || {}).value || '').toLowerCase().trim();
      var scope = String((body.querySelector('[data-f="employee_scope"]') || {}).value || 'all');
      var select = body.querySelector('[data-f="employee_id"]');
      var count = body.querySelector('[data-role="people-count"]');
      var previous = select ? select.value : '';
      var filtered = people.filter(function(person){
        var id = employeeIdentity(person);
        if (!id) return false;
        if (scope === 'unassigned' && assignedHere[id]) return false;
        if (!search) return true;
        return assignmentPersonSearchText(person).indexOf(search) >= 0;
      });
      if (select) {
        select.innerHTML = filtered.slice(0, 80).map(function(person){
          var id = employeeIdentity(person);
          var name = employeeDisplayName(person);
          var subtitle = employeeSecondaryLabel(person);
          var assigned = assignedHere[id] ? ' · ' + t('already assigned here','đã gán tại đây') : '';
          return '<option value="'+esc(id)+'">'+esc(name)+(subtitle ? ' · '+esc(subtitle) : '')+esc(assigned)+'</option>';
        }).join('');
        if (previous && filtered.some(function(person){ return employeeIdentity(person) === previous; })) select.value = previous;
      }
      if (count) {
        count.textContent = filtered.length
          ? t('Showing','Đang hiển thị') + ' ' + Math.min(filtered.length, 80) + ' / ' + filtered.length
          : t('No matching person','Không có nhân sự khớp bộ lọc');
      }
    }
    body.addEventListener('input', function(ev){
      if (ev.target && ev.target.getAttribute('data-f') === 'employee_search') refreshPeopleOptions();
    });
    body.addEventListener('change', function(ev){
      if (ev.target && ev.target.getAttribute('data-f') === 'employee_scope') refreshPeopleOptions();
    });
    refreshPeopleOptions();

    modal({
      title: t('Add assigned person','Thêm nhân sự được giao'),
      body: body,
      width: '520px',
      buttons: [
        { label: t('Cancel','Hủy'), variant:'secondary', onClick:function(close){ close(); } },
        { label: t('Add','Thêm'), variant:'primary', onClick:function(close){
            var get = function(f){ var n = body.querySelector('[data-f="'+f+'"]'); return n ? String(n.value||'').trim() : ''; };
            var employeeId = get('employee_id');
            var assignmentType = get('assignment_type') || 'concurrent';
            var fte = parseFloat(get('fte_fraction'));
            if (!employeeId){
              UI.toast(t('Person is required','Bắt buộc chọn nhân sự'), 'error');
              return false;
            }
            if (assignedHere[employeeId]){
              UI.toast(t('This person is already assigned to this position','Nhân sự này đã được gán vào vị trí này'), 'error');
              return false;
            }
            if (!isFinite(fte) || fte <= 0 || fte > 1.5){
              UI.toast(t('FTE must be between 0.05 and 1.50','FTE phải từ 0.05 đến 1.50'), 'error');
              return false;
            }
            var sourceRecordId = 'admin:' + employeeId + ':' + p.hcm_position_id + ':' + assignmentType;
            var payload = {
              employee_id: employeeId,
              hcm_position_id: p.hcm_position_id,
              hcm_org_unit_id: p.hcm_org_unit_id,
              assignment_type: assignmentType,
              assignment_status: 'active',
              is_primary: assignmentType === 'primary',
              fte_fraction: fte,
              effective_from: get('effective_from') || today,
              source_system: 'ADMIN_ORG_CONSOLE',
              source_record_id: sourceRecordId,
              payload_schema_version: '1.0',
              metadata: {
                note: get('note'),
                position_title: p.position_title || '',
                created_from: 'admin_org_console'
              }
            };
            // The Xóa flow soft-ends an assignment by setting effective_to=today
            // but leaves assignment_status='active' (governance won't let us
            // touch the managed status column). The partial unique index
            // uq_hcm_emp_pos_assign_active_source covers all active rows, so a
            // straight INSERT for the same (employee, position, type,
            // source_system, source_record_id) tuple hits 409/400. Detect a
            // soft-ended row up front and revive it via PUT instead of INSERT.
            var resurrectableRow = (S.assignments || []).find(function(a){
              if (!a) return false;
              if (String(a.employee_id || '') !== employeeId) return false;
              if (String(a.hcm_position_id || '') !== String(p.hcm_position_id || '')) return false;
              if (String(a.assignment_type || '') !== assignmentType) return false;
              if (String(a.source_system || '') !== 'ADMIN_ORG_CONSOLE') return false;
              if (String(a.source_record_id || '') !== sourceRecordId) return false;
              return String(a.assignment_status || 'active') === 'active';
            });
            var savePromise;
            if (resurrectableRow){
              savePromise = safeUpdate('hcm_workforce', 'hcm_employee_position_assignments', resurrectableRow.hcm_assignment_id, {
                effective_to: null,
                effective_from: payload.effective_from,
                fte_fraction: fte,
                is_primary: payload.is_primary,
                metadata: Object.assign({}, safeJson(resurrectableRow.metadata) || {}, payload.metadata)
              }, resurrectableRow.row_version);
            } else {
              savePromise = safeCreate('hcm_workforce','hcm_employee_position_assignments', payload);
            }
            savePromise
              .then(function(){
                UI.toast(t('Person assigned','Đã thêm nhân sự'), 'success');
                close();
                loadAll(true).then(function(){
                  S.selectedPositionId = p.hcm_position_id;
                  if (host) renderOrgUnits(host);
                  else if (S.selectedUnitId && typeof window._renderAdminOrgUnits === 'function') {
                    var currentHost = document.querySelector('[data-admin-panel="org_units"], #admin-content, .admin-panel');
                    if (currentHost) renderOrgUnits(currentHost);
                  }
                });
              }).catch(function(err){ UI.toast((err && err.message) || 'assign_failed','error'); });
            return false;
          } }
      ]
    });
  }

  function assigneeRecordForAttrs(el){
    var posId = String(el.getAttribute('data-pos-id') || '');
    var assignmentId = String(el.getAttribute('data-assignment-id') || '');
    var employeeId = String(el.getAttribute('data-employee-id') || '');
    var rows = S.employeesByPosition[posId] || [];
    var row = null;
    if (assignmentId){
      row = rows.filter(function(e){ return String(e.hcm_assignment_id || '') === assignmentId; })[0] || null;
    }
    if (!row && employeeId){
      row = rows.filter(function(e){ return employeeIdentity(e) === employeeId; })[0] || null;
    }
    return { positionId:posId, assignmentId:assignmentId, employeeId:employeeId, row:row };
  }

  function removeAssigneeFromAttrs(el, host, afterReload){
    var info = assigneeRecordForAttrs(el);
    var p = S.byPositionId[info.positionId];
    var row = info.row;
    if (!p || !row){
      UI.toast(t('Cannot find this assigned person','Không tìm thấy nhân sự được bổ nhiệm này'), 'error');
      return;
    }
    var name = employeeDisplayName(row);
    confirm({
      title: t('Remove assigned person?','Xóa nhân sự khỏi vị trí?'),
      message: t('Remove "'+name+'" from "'+p.position_title+'"?','Xóa "'+name+'" khỏi vị trí "'+p.position_title+'"?'),
      confirmLabel: t('Remove','Xóa'),
      danger: true
    }).then(function(ok){
      if (!ok) return;
      var ops = [];
      var raw = S.rawEmployeeById[employeeIdentity(row)] || row;
      if (row.hcm_assignment_id){
        // Governance forbids hard-delete on hcm_employee_position_assignments
        // (table-governance-overlay.json deletionMode=archive_only). Generic
        // PUT also strips assignment_status (managed status column) and the
        // transition workflow has no active→ended target, so the only writable
        // field that ends the assignment is effective_to. Setting it to today
        // makes assignmentStatus() return 'ended' and the row drops out of
        // activeEmployees(). Once a soft-delete column lands (deleted_at or a
        // transition target), this can move back to safeDelete.
        var today = new Date().toISOString().slice(0, 10);
        ops.push(safeUpdate('hcm_workforce','hcm_employee_position_assignments', row.hcm_assignment_id, { effective_to: today }, row.row_version));
      }
      if (raw && raw.employee_id && String(raw.hcm_position_id || '') === String(p.hcm_position_id || '')){
        ops.push(safeUpdate('hcm_workforce','hcm_employees', raw.employee_id, { hcm_position_id:null, hcm_org_unit_id:null }, raw.row_version));
      }
      if (!ops.length){
        UI.toast(t('This assignment is not persisted in the HCM assignment table. Refresh the org catalog and try again.','Bổ nhiệm này không nằm trong bảng bổ nhiệm HCM. Hãy làm mới danh mục tổ chức rồi thử lại.'), 'error');
        return;
      }
      Promise.all(ops).then(function(){
        UI.toast(t('Assigned person removed','Đã xóa nhân sự khỏi vị trí'), 'success');
        return loadAll(true);
      }).then(function(){
        S.selectedPositionId = p.hcm_position_id;
        if (typeof afterReload === 'function') afterReload();
        else if (host) renderOrgUnits(host);
      }).catch(function(err){
        UI.toast((err && err.message) || 'remove_failed', 'error');
      });
    });
  }

  function rerenderOrgSurface(host, preferChart){
    if (!host){
      var svg = document.querySelector('[data-canvas-svg]');
      if (svg) {
        var consoleEl = svg.closest('.org-console');
        host = (consoleEl && consoleEl.parentElement) || svg.closest('.admin-panel') || svg.closest('[data-admin-panel]') || null;
      }
    }
    if (host && (preferChart || host.querySelector('[data-canvas-svg]'))) renderOrgChart(host);
    else if (host) renderOrgUnits(host);
  }

  function openAssignedUserModal(employeeId){
    var id = String(employeeId || '').trim();
    if (!id){
      UI.toast(t('Cannot find assigned user','Không tìm thấy user được bổ nhiệm'), 'error');
      return;
    }
    if (typeof window.showUserModal === 'function'){
      var matched = null;
      (S.users || []).concat(Array.isArray(window.USERS) ? window.USERS : []).some(function(user){
        var keys = profileIdentityKeys(user);
        if (keys.indexOf(id) >= 0){
          matched = user;
          return true;
        }
        return false;
      });
      window.showUserModal(String((matched && (matched.id || matched.employee_id || matched.username)) || id));
      return;
    }
    UI.toast(t('User editor is not available','Chưa tải được hộp thoại sửa user'), 'error');
  }

  function openPositionVisualModal(positionId, host){
    var p = positionId ? S.byPositionId[positionId] : null;
    if (!p) return;
    var employees = S.employeesByPosition[p.hcm_position_id] || [];
    var active = activeEmployees(employees);
    if (active.length === 1){
      openAssignedUserModal(employeeIdentity(active[0]));
      return;
    }
    var meta = safeJson(p.metadata);
    var currentIcon = firstText(meta.org_chart_icon, meta.icon, positionIcon(p.position_title));
    var imageValue = firstText(meta.org_chart_image, meta.image_url, meta.image_data_url);
    var body = document.createElement('div');
    body.innerHTML = ''
      + '<div class="org-visual-form">'
      +   '<div class="org-visual-preview" data-preview></div>'
      +   '<div>'
      +     '<div class="org-form-row"><label>'+esc(t('Icon','Icon'))+'</label><input data-f="icon" maxlength="4" value="'+esc(currentIcon)+'" placeholder="👑"></div>'
      +     '<div class="org-form-row"><label>'+esc(t('Upload image','Tải hình lên'))+'</label><input data-f="image_file" type="file" accept="image/*"></div>'
      +     '<button type="button" class="org-btn" data-act="remove-position-image">'+esc(t('Remove image','Xóa hình'))+'</button>'
      +   '</div>'
      + '</div>';
    var preview = body.querySelector('[data-preview]');
    function refreshPreview(){
      var iconInput = body.querySelector('[data-f="icon"]');
      var icon = firstText(iconInput && iconInput.value, currentIcon);
      var v = positionVisual(Object.assign({}, p, { metadata:Object.assign({}, meta, { org_chart_icon:icon, org_chart_image:imageValue }) }), employees);
      preview.innerHTML = imageValue ? '<img src="'+esc(imageValue)+'" alt="">' : '<span>'+esc(v.icon)+'</span>';
    }
    refreshPreview();
    body.addEventListener('input', function(ev){
      if (ev.target && ev.target.getAttribute('data-f') === 'icon') refreshPreview();
    });
    body.addEventListener('click', function(ev){
      var btn = ev.target.closest('[data-act="remove-position-image"]');
      if (!btn) return;
      imageValue = '';
      var file = body.querySelector('[data-f="image_file"]');
      if (file) file.value = '';
      refreshPreview();
    });
    body.addEventListener('change', function(ev){
      var fileInput = ev.target && ev.target.getAttribute('data-f') === 'image_file' ? ev.target : null;
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      var file = fileInput.files[0];
      if (!/^image\//.test(file.type || '')){
        UI.toast(t('Please choose an image file','Vui lòng chọn file hình ảnh'), 'error');
        return;
      }
      if (file.size > 1024 * 1024){
        UI.toast(t('Image must be 1 MB or smaller','Hình phải từ 1 MB trở xuống'), 'error');
        fileInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function(){
        imageValue = String(reader.result || '');
        refreshPreview();
      };
      reader.onerror = function(){ UI.toast(t('Cannot read image','Không đọc được hình'), 'error'); };
      reader.readAsDataURL(file);
    });

    modal({
      title: t('Position icon and image','Icon và hình chức danh'),
      body: body,
      width: '520px',
      buttons: [
        { label: t('Cancel','Hủy'), variant:'secondary', onClick:function(close){ close(); } },
        { label: t('Save','Lưu'), variant:'primary', onClick:function(close){
            var iconInput = body.querySelector('[data-f="icon"]');
            var icon = firstText(iconInput && iconInput.value, positionIcon(p.position_title));
            var nextMeta = Object.assign({}, safeJson(p.metadata));
            nextMeta.org_chart_icon = icon;
            if (imageValue) nextMeta.org_chart_image = imageValue;
            else delete nextMeta.org_chart_image;
            nextMeta.org_chart_visual_updated_at = new Date().toISOString();
            safeUpdate('hcm_workforce','hcm_positions', p.hcm_position_id, { metadata: nextMeta }, p.row_version)
              .then(function(){
                UI.toast(t('Visual saved','Đã lưu icon / hình'), 'success');
                close();
                return loadAll(true);
              }).then(function(){
                S.selectedPositionId = p.hcm_position_id;
                rerenderOrgSurface(host, host && host.querySelector && !!host.querySelector('[data-canvas-svg]'));
              }).catch(function(err){
                UI.toast((err && err.message) || 'save_failed', 'error');
              });
            return false;
          } }
      ]
    });
  }

  function updateBreadcrumb(){
    var bc = document.getElementById('orgu-bc');
    if (!bc) return;
    var u = S.selectedUnitId ? S.byUnitId[S.selectedUnitId] : null;
    if (!u){ bc.textContent = ''; return; }
    var trail = [];
    var cur = u;
    var safety = 0;
    while (cur && safety++ < 50){
      trail.unshift(cur.org_unit_code || cur.org_unit_name || '?');
      cur = cur.parent_org_unit_id ? S.byUnitId[cur.parent_org_unit_id] : null;
    }
    bc.textContent = trail.join(' / ');
  }

  /* ── Phòng ban events ─────────────────────────────────────────────────── */
  function bindOrgUnitsEvents(host){
    if (host._bound) return;
    host._bound = true;
    host.addEventListener('click', function(ev){
      var el = ev.target.closest('[data-act]'); if (!el) return;
      var act = el.getAttribute('data-act');
      var unitId = el.getAttribute('data-unit-id');
      var posId = el.getAttribute('data-pos-id');

      if (act === 'select-unit'){
        S.selectedUnitId = unitId;
        S.selectedPositionId = null;
        renderOrgUnits(host);
      } else if (act === 'toggle-tree'){
        ev.stopPropagation();
        S._collapsed = S._collapsed || {};
        S._collapsed[unitId] = !S._collapsed[unitId];
        renderOrgUnits(host);
      } else if (act === 'select-position'){
        S.selectedPositionId = posId;
        // Only re-render the right pane + re-mark selected card
        var pane = document.getElementById('orgu-pos-pane');
        if (pane) pane.innerHTML = renderPositionPane(posId);
        host.querySelectorAll('.org-position-card.is-selected').forEach(function(c){ c.classList.remove('is-selected'); });
        host.querySelectorAll('.org-position-card[data-pos-id="'+posId+'"]').forEach(function(c){ c.classList.add('is-selected'); });
      } else if (act === 'set-type'){
        S.filter.type = el.getAttribute('data-val') || 'all';
        renderOrgUnits(host);
      } else if (act === 'reload'){
        loadAll(true).then(function(){ renderOrgUnits(host); });
      } else if (act === 'create-unit-root'){
        openUnitModal(null, null, host);
      } else if (act === 'add-child-unit'){
        openUnitModal(null, unitId, host);
      } else if (act === 'add-position'){
        openPositionModal(null, unitId, host);
      } else if (act === 'add-assignee'){
        openAssignmentModal(posId, host);
      } else if (act === 'remove-assignee'){
        removeAssigneeFromAttrs(el, host);
      } else if (act === 'edit-position-visual'){
        openPositionVisualModal(posId, host);
      } else if (act === 'edit-unit'){
        openUnitModal(unitId, null, host);
      } else if (act === 'edit-position'){
        openPositionModal(posId, null, host);
      } else if (act === 'recolor-unit'){
        openColorModal(unitId, host);
      } else if (act === 'reparent-unit'){
        openReparentUnitModal(unitId, host);
      } else if (act === 'reparent-position'){
        openReparentPositionModal(posId, host);
      } else if (act === 'toggle-unit'){
        toggleUnit(unitId, host);
      } else if (act === 'delete-position'){
        deletePosition(posId, host);
      } else if (act === 'open-chart'){
        // Trigger sibling Sơ đồ tổ chức tab via the legacy global pattern.
        if (typeof window.switchAdminTab === 'function'){
          window.switchAdminTab('orgchart');
        } else {
          try { window.adminTab = 'orgchart'; if (typeof window.renderAdmin === 'function') window.renderAdmin(); }
          catch(_){ if (typeof window.showToast === 'function') window.showToast(t('Switch to Sơ đồ tổ chức tab','Chuyển sang tab Sơ đồ tổ chức')); }
        }
      } else if (act === 'expand-all'){
        S._collapsed = {};
        renderOrgUnits(host);
      }
    });
    host.addEventListener('input', function(ev){
      var el = ev.target.closest('[data-act]'); if (!el) return;
      var act = el.getAttribute('data-act');
      if (act === 'search'){
        S.filter.search = String(el.value || '').trim();
        clearTimeout(host._searchT);
        host._searchT = setTimeout(function(){ renderOrgUnits(host); }, 180);
      } else if (act === 'set-status'){
        S.filter.status = String(el.value || 'active');
        renderOrgUnits(host);
      }
    });
    host.addEventListener('change', function(ev){
      var el = ev.target.closest('[data-act]'); if (!el) return;
      if (el.getAttribute('data-act') === 'set-status'){
        S.filter.status = String(el.value || 'active');
        renderOrgUnits(host);
      }
    });
  }

  /* ── Org-unit CRUD modals ─────────────────────────────────────────────── */
  function openUnitModal(unitId, parentUnitId, host){
    var existing = unitId ? S.byUnitId[unitId] : null;
    var meta = existing ? safeJson(existing.metadata) : {};
    var body = document.createElement('div');
    body.innerHTML = ''
      + '<div class="org-form-row"><label>'+esc(t('Code','Mã'))+'</label><input data-f="org_unit_code" value="'+esc(existing ? (existing.org_unit_code||'') : '')+'" '+(existing?'readonly':'')+' placeholder="ENG, QA, PROD…"></div>'
      + '<div class="org-form-row"><label>'+esc(t('Name','Tên'))+'</label><input data-f="org_unit_name" value="'+esc(existing ? (existing.org_unit_name||'') : '')+'" placeholder="'+esc(t('Engineering','Kỹ thuật'))+'"></div>'
      + '<div class="org-form-row"><label>'+esc(t('Type','Loại'))+'</label><select data-f="org_unit_type">'
      +   Object.keys(TYPE_META).map(function(k){
            var sel = (existing ? existing.org_unit_type : 'department') === k;
            return '<option value="'+k+'"'+(sel?' selected':'')+'>'+TYPE_META[k].icon+' '+(lang()==='en'?TYPE_META[k].labelEn:TYPE_META[k].label)+'</option>';
          }).join('')
      + '</select></div>'
      + '<div class="org-form-row"><label>'+esc(t('Parent unit','Đơn vị cha'))+'</label><select data-f="parent_org_unit_id">'
      +   '<option value="">— '+esc(t('(root level)','(cấp gốc)'))+' —</option>'
      +   S.units.filter(function(u){ return !existing || u.hcm_org_unit_id !== existing.hcm_org_unit_id; }).map(function(u){
            var sel = (parentUnitId && u.hcm_org_unit_id === parentUnitId) || (existing && u.hcm_org_unit_id === existing.parent_org_unit_id);
            return '<option value="'+esc(u.hcm_org_unit_id)+'"'+(sel?' selected':'')+'>'+typeMeta(u.org_unit_type).icon+' '+esc(u.org_unit_name||u.org_unit_code||'?')+'</option>';
          }).join('')
      + '</select></div>'
      + '<div class="org-form-row"><label>'+esc(t('Cost center','Mã chi phí'))+'</label><input data-f="cost_center" value="'+esc(existing ? (existing.cost_center||'') : '')+'" placeholder="CC-001"></div>'
      + (function(){
          var currentMgr = existing ? (existing.manager_employee_id||'') : '';
          // Build a real dropdown from the shared admin user list so org
          // ownership follows the same people directory as the Users tab.
          var opts = '<option value="">— '+esc(t('(none)','(không có)'))+' —</option>'
            + assignmentPeopleCandidates().map(function(emp){
                var val = employeeIdentity(emp);
                var name = employeeDisplayName(emp);
                var sel = currentMgr && val === currentMgr;
                if (!val) return '';
                return '<option value="'+esc(val)+'"'+(sel?' selected':'')+'>'+esc(name)+'</option>';
              }).filter(Boolean).join('');
          // If the saved manager is not in the employees list (legacy/imported data),
          // append it so we don't lose the existing reference on save.
          if (currentMgr && assignmentPeopleCandidates().every(function(e){ return employeeIdentity(e) !== currentMgr; })){
            opts += '<option value="'+esc(currentMgr)+'" selected>'+esc(t('Selected person','Nhân sự đã chọn'))+'</option>';
          }
          return '<div class="org-form-row"><label>'+esc(t('Manager','Trưởng đơn vị'))+'</label><select data-f="manager_employee_id">'+opts+'</select></div>';
        })()
      ;
    modal({
      title: existing ? t('Edit unit','Sửa đơn vị') : t('Create unit','Tạo đơn vị'),
      body: body,
      width: '480px',
      buttons: [
        { label: t('Cancel','Hủy'), variant:'secondary', onClick:function(close){ close(); } },
        { label: existing ? t('Save','Lưu') : t('Create','Tạo'), variant:'primary', onClick: function(close){
            var get = function(f){ var n = body.querySelector('[data-f="'+f+'"]'); return n ? String(n.value||'').trim() : ''; };
            var payload = {
              org_unit_code: get('org_unit_code').toUpperCase(),
              org_unit_name: get('org_unit_name'),
              org_unit_type: get('org_unit_type'),
              parent_org_unit_id: get('parent_org_unit_id') || null,
              cost_center: get('cost_center') || null,
              manager_employee_id: get('manager_employee_id') || null
            };
            if (!payload.org_unit_code || !payload.org_unit_name){
              UI.toast(t('Code and name are required','Mã và tên không được để trống'),'error');
              return;
            }
            // Always use the freshest row_version from state in case the
            // background cache invalidated between modal-open and click.
            var current = existing ? (S.byUnitId[existing.hcm_org_unit_id] || existing) : null;
            var op = existing
              ? safeUpdate('hcm_workforce','hcm_org_units', existing.hcm_org_unit_id, payload, current.row_version)
              : safeCreate('hcm_workforce','hcm_org_units', payload);
            op.then(function(res){
              UI.toast(existing?t('Unit saved','Đã lưu đơn vị'):t('Unit created','Đã tạo đơn vị'),'success');
              close();
              loadAll(true).then(function(){
                if (!existing && res && res.record) S.selectedUnitId = res.record.hcm_org_unit_id;
                renderOrgUnits(host);
              });
            }).catch(function(err){
              UI.toast((err && err.message) || 'save_failed','error');
            });
          } }
      ]
    });
  }

  function openPositionModal(positionId, defaultUnitId, host){
    var existing = positionId ? S.byPositionId[positionId] : null;
    var unitId = existing ? existing.hcm_org_unit_id : defaultUnitId;
    var body = document.createElement('div');
    body.innerHTML = ''
      + '<div class="org-form-row"><label>'+esc(t('Position code','Mã vị trí'))+'</label><input data-f="position_code" value="'+esc(existing ? (existing.position_code||'') : '')+'" '+(existing?'readonly':'')+' placeholder="ENG-MGR-001"></div>'
      + '<div class="org-form-row"><label>'+esc(t('Title','Chức danh'))+'</label><input data-f="position_title" value="'+esc(existing ? (existing.position_title||'') : '')+'" placeholder="'+esc(t('Engineering Manager','Trưởng phòng kỹ thuật'))+'"></div>'
      + '<div class="org-form-row"><label>'+esc(t('Org unit','Đơn vị'))+'</label><select data-f="hcm_org_unit_id">'
      +   S.units.map(function(u){
            var sel = u.hcm_org_unit_id === unitId;
            return '<option value="'+esc(u.hcm_org_unit_id)+'"'+(sel?' selected':'')+'>'+typeMeta(u.org_unit_type).icon+' '+esc(u.org_unit_name||u.org_unit_code||'?')+'</option>';
          }).join('')
      + '</select></div>'
      + '<div class="org-form-row"><label>'+esc(t('Reports to (position)','Báo cáo cho (vị trí)'))+'</label><select data-f="reports_to_position_id">'
      +   '<option value="">— '+esc(t('none','không'))+' —</option>'
      +   S.positions.filter(function(p){ return !existing || p.hcm_position_id !== existing.hcm_position_id; }).map(function(p){
            var sel = existing && p.hcm_position_id === existing.reports_to_position_id;
            return '<option value="'+esc(p.hcm_position_id)+'"'+(sel?' selected':'')+'>'+esc(p.position_title||'?')+'</option>';
          }).join('')
      + '</select></div>'
      + '<div class="org-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +   '<div><label>'+esc(t('Employment type','Loại'))+'</label><select data-f="employment_type">'
      +     ['full_time','part_time','contractor','intern'].map(function(v){
              var sel = (existing ? existing.employment_type : 'full_time') === v;
              return '<option value="'+v+'"'+(sel?' selected':'')+'>'+v+'</option>';
            }).join('')
      +   '</select></div>'
      +   '<div><label>'+esc(t('Headcount','Định biên'))+'</label><input type="number" min="1" data-f="required_headcount" value="'+esc(existing ? (existing.required_headcount||1) : 1)+'"></div>'
      + '</div>'
      + '<div class="org-form-row"><label>'+esc(t('Grade code','Bậc'))+'</label><input data-f="grade_code" value="'+esc(existing ? (existing.grade_code||'') : '')+'" placeholder="GR-05"></div>'
      ;
    modal({
      title: existing ? t('Edit position','Sửa vị trí') : t('Create position','Tạo vị trí'),
      body: body,
      width: '500px',
      buttons: [
        { label: t('Cancel','Hủy'), variant:'secondary', onClick:function(close){ close(); } },
        { label: existing ? t('Save','Lưu') : t('Create','Tạo'), variant:'primary', onClick: function(close){
            var get = function(f){ var n = body.querySelector('[data-f="'+f+'"]'); return n ? String(n.value||'').trim() : ''; };
            var payload = {
              position_code: get('position_code').toUpperCase(),
              position_title: get('position_title'),
              hcm_org_unit_id: get('hcm_org_unit_id'),
              reports_to_position_id: get('reports_to_position_id') || null,
              employment_type: get('employment_type') || 'full_time',
              required_headcount: parseInt(get('required_headcount'),10) || 1,
              grade_code: get('grade_code') || null
            };
            if (!payload.position_code || !payload.position_title || !payload.hcm_org_unit_id){
              UI.toast(t('Code, title, and unit are required','Mã, chức danh, đơn vị bắt buộc'),'error');
              return;
            }
            var op = existing
              ? safeUpdate('hcm_workforce','hcm_positions', existing.hcm_position_id, payload, existing.row_version)
              : safeCreate('hcm_workforce','hcm_positions', payload);
            op.then(function(res){
              UI.toast(existing?t('Position saved','Đã lưu vị trí'):t('Position created','Đã tạo vị trí'),'success');
              close();
              loadAll(true).then(function(){
                if (!existing && res && res.record) S.selectedPositionId = res.record.hcm_position_id;
                renderOrgUnits(host);
              });
            }).catch(function(err){
              UI.toast((err && err.message) || 'save_failed','error');
            });
          } }
      ]
    });
  }

  function openColorModal(unitId, host){
    var u = S.byUnitId[unitId]; if (!u) return;
    var current = unitColor(u);
    var body = document.createElement('div');
    body.innerHTML = ''
      + '<div style="margin-bottom:10px;font-size:13px;color:var(--text-2)">'+esc(t('Pick a color band for this org unit. Used in tree, cards, and the org chart.','Chọn dải màu cho đơn vị. Dùng trong cây, thẻ và sơ đồ tổ chức.'))+'</div>'
      + '<div class="org-color-grid">'
      +   DEPT_PALETTE.concat(['#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#06b6d4']).map(function(c){
            return '<div class="org-color-swatch '+(c===current?'is-selected':'')+'" data-color="'+c+'" style="background:'+c+'"></div>';
          }).join('')
      + '</div>'
      ;
    modal({
      title: t('Unit color','Màu đơn vị'),
      body: body,
      width: '380px',
      buttons: [
        { label: t('Cancel','Hủy'), variant:'secondary', onClick:function(close){ close(); } },
        { label: t('Save','Lưu'), variant:'primary', onClick: function(close){
            var sel = body.querySelector('.org-color-swatch.is-selected');
            var color = sel ? sel.getAttribute('data-color') : current;
            var nextMeta = Object.assign({}, safeJson(u.metadata), { color: color });
            safeUpdate('hcm_workforce','hcm_org_units', u.hcm_org_unit_id, { metadata: nextMeta }, u.row_version)
              .then(function(){
                UI.toast(t('Color saved','Đã lưu màu'),'success');
                close();
                loadAll(true).then(function(){ renderOrgUnits(host); });
              }).catch(function(err){ UI.toast(err && err.message || 'save_failed','error'); });
          } }
      ]
    });
    body.addEventListener('click', function(ev){
      var sw = ev.target.closest('.org-color-swatch'); if (!sw) return;
      body.querySelectorAll('.org-color-swatch.is-selected').forEach(function(s){ s.classList.remove('is-selected'); });
      sw.classList.add('is-selected');
    });
  }

  function openReparentUnitModal(unitId, host){
    var u = S.byUnitId[unitId]; if (!u) return;
    // Build descendant id set so user can't pick a descendant as parent
    var descendants = new Set();
    (function walk(id){
      (S.childrenOfUnit[id]||[]).forEach(function(c){
        descendants.add(c.hcm_org_unit_id);
        walk(c.hcm_org_unit_id);
      });
    })(u.hcm_org_unit_id);
    var body = document.createElement('div');
    body.innerHTML = ''
      + '<div style="margin-bottom:10px;font-size:13px;color:var(--text-2)">'+esc(t('Choose a new parent unit. Cannot be a descendant of the moving unit.','Chọn đơn vị cha mới. Không được là con cháu của đơn vị đang chuyển.'))+'</div>'
      + '<div class="org-form-row"><label>'+esc(t('New parent','Cha mới'))+'</label><select data-f="parent">'
      +   '<option value="">— '+esc(t('(root level)','(cấp gốc)'))+' —</option>'
      +   S.units.filter(function(x){ return x.hcm_org_unit_id !== u.hcm_org_unit_id && !descendants.has(x.hcm_org_unit_id); }).map(function(x){
            var sel = x.hcm_org_unit_id === u.parent_org_unit_id;
            return '<option value="'+esc(x.hcm_org_unit_id)+'"'+(sel?' selected':'')+'>'+typeMeta(x.org_unit_type).icon+' '+esc(x.org_unit_name||x.org_unit_code||'?')+'</option>';
          }).join('')
      + '</select></div>';
    modal({
      title: t('Reparent unit','Chuyển đơn vị cha'),
      body: body,
      width: '420px',
      buttons: [
        { label: t('Cancel','Hủy'), variant:'secondary', onClick:function(close){ close(); } },
        { label: t('Move','Chuyển'), variant:'primary', onClick:function(close){
            var sel = body.querySelector('[data-f="parent"]');
            var newParent = sel ? sel.value : null;
            safeUpdate('hcm_workforce','hcm_org_units', u.hcm_org_unit_id, { parent_org_unit_id: newParent || null }, u.row_version)
              .then(function(){
                UI.toast(t('Unit moved','Đã chuyển đơn vị'),'success');
                close();
                loadAll(true).then(function(){ renderOrgUnits(host); });
              }).catch(function(err){ UI.toast(err && err.message || 'move_failed','error'); });
          } }
      ]
    });
  }

  function openReparentPositionModal(posId, host){
    var p = S.byPositionId[posId]; if (!p) return;
    var body = document.createElement('div');
    body.innerHTML = ''
      + '<div class="org-form-row"><label>'+esc(t('Move to org unit','Chuyển sang đơn vị'))+'</label><select data-f="unit">'
      +   S.units.map(function(x){
            var sel = x.hcm_org_unit_id === p.hcm_org_unit_id;
            return '<option value="'+esc(x.hcm_org_unit_id)+'"'+(sel?' selected':'')+'>'+typeMeta(x.org_unit_type).icon+' '+esc(x.org_unit_name||x.org_unit_code||'?')+'</option>';
          }).join('')
      + '</select></div>';
    modal({
      title: t('Move position','Chuyển vị trí'),
      body: body,
      width: '420px',
      buttons: [
        { label: t('Cancel','Hủy'), variant:'secondary', onClick:function(close){ close(); } },
        { label: t('Move','Chuyển'), variant:'primary', onClick:function(close){
            var sel = body.querySelector('[data-f="unit"]');
            var newUnit = sel ? sel.value : null;
            if (!newUnit) return;
            safeUpdate('hcm_workforce','hcm_positions', p.hcm_position_id, { hcm_org_unit_id: newUnit }, p.row_version)
              .then(function(){
                UI.toast(t('Position moved','Đã chuyển vị trí'),'success');
                close();
                loadAll(true).then(function(){ renderOrgUnits(host); });
              }).catch(function(err){ UI.toast(err && err.message || 'move_failed','error'); });
          } }
      ]
    });
  }

  function toggleUnit(unitId, host){
    var u = S.byUnitId[unitId]; if (!u) return;
    var willInactivate = String(u.status||'active') !== 'inactive';
    confirm({
      title: willInactivate ? t('Archive unit?','Ngừng dùng đơn vị?') : t('Activate unit?','Kích hoạt đơn vị?'),
      message: willInactivate
        ? t('Existing positions and employees keep their links. Archived units are hidden from the active filter but can be restored.','Vị trí và nhân sự liên quan vẫn giữ liên kết. Đơn vị ngừng dùng sẽ bị ẩn khỏi bộ lọc Đang hoạt động nhưng có thể khôi phục.')
        : t('Make this unit visible in the active list again.','Đưa đơn vị này trở lại danh sách hoạt động.'),
      confirmLabel: willInactivate ? t('Archive','Ngừng dùng') : t('Activate','Kích hoạt')
    }).then(function(ok){
      if (!ok) return;
      safeTransition('hcm_workforce','hcm_org_units', u.hcm_org_unit_id, willInactivate ? 'inactive' : 'active', u.row_version)
        .then(function(){
          UI.toast(t('Saved','Đã lưu'),'success');
          loadAll(true).then(function(){ renderOrgUnits(host); });
        }).catch(function(err){ UI.toast(err && err.message || 'save_failed','error'); });
    });
  }

  function deletePosition(posId, host){
    var p = S.byPositionId[posId]; if (!p) return;
    var employees = (S.employeesByPosition[p.hcm_position_id] || []);
    var active = activeEmployees(employees);
    if (active.length > 0){
      UI.toast(t('Cannot delete: position has assigned employees. Remove all assignments first.','Không thể xóa: vị trí đang có nhân sự. Hãy gỡ nhân sự trước.'),'error');
      return;
    }
    confirm({
      title: t('Delete position?','Xóa vị trí vĩnh viễn?'),
      message: t('This permanently deletes "'+p.position_title+'". This cannot be undone.','Xóa vĩnh viễn "'+p.position_title+'". Không thể hoàn tác.'),
      confirmLabel: t('Delete','Xóa')
    }).then(function(ok){
      if (!ok) return;
      safeDelete('hcm_workforce','hcm_positions', p.hcm_position_id, p.row_version)
        .then(function(){
          UI.toast(t('Position deleted','Đã xóa vị trí'),'success');
          loadAll(true).then(function(){ renderOrgUnits(host); });
        }).catch(function(err){ UI.toast(err && err.message || 'delete_failed','error'); });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────── *
   * Sơ đồ tổ chức — SVG canvas
   * ──────────────────────────────────────────────────────────────────────── */
  // Layered tree layout (Walker-style: bottom-up subtree-width, top-down
  // absolute placement). Returns map nodeId → {x,y,w,h,depth}.
  // Layout direction: 'TB' (top-bottom) or 'LR' (left-right).
  function layoutTree(rootIds, getChildren, getDimensions, dir){
    dir = dir || 'TB';
    var H_GAP = 32;            // sibling gap (horizontal in TB)
    var ROW_GAP = 70;          // vertical gap between depth levels in TB
    // We use the FIRST root's dims as a row-height baseline; each layer is
    // dim.h + ROW_GAP. Mixing wildly-different sizes is uncommon for orgs.
    var firstDims = rootIds.length ? getDimensions(rootIds[0]) : {w:200, h:130};
    var ROW_HEIGHT = firstDims.h + ROW_GAP;
    var COL_WIDTH  = firstDims.w + 90; // for LR: each depth is one "column"

    // Step 1 — build nodes & compute each subtree's required width (bottom-up).
    // Defensive: track visited ids to break any accidental cycle in the
    // parent/reports-to graph. A cycle would otherwise blow the stack and
    // freeze the page (this manifested as "treo" when switching to Vị trí
    // mode if a position pointed reports_to_position_id back to an ancestor).
    var visited = new Set();
    function build(id, depth){
      if (visited.has(id) || depth > 32){
        // skip — already placed in another branch, or guard against pathological depth
        return null;
      }
      visited.add(id);
      var d = getDimensions(id);
      var n = { id:id, depth:depth, w:d.w, h:d.h, children:[], subW:d.w };
      n.children = (getChildren(id) || [])
        .map(function(cid){ return build(cid, depth+1); })
        .filter(function(c){ return c !== null; });
      if (n.children.length){
        var total = 0;
        n.children.forEach(function(c, i){ if (i>0) total += H_GAP; total += c.subW; });
        n.subW = Math.max(n.w, total);
      }
      return n;
    }

    // Step 2 — assign absolute x by walking left→right; parent centered on its
    // children's bounding span. Cursor parameter is the leftmost x for this
    // subtree.
    var positions = {};
    function place(n, cursorX){
      if (!n.children.length){
        n.x = cursorX + (n.subW - n.w) / 2;
      } else {
        var x = cursorX;
        var firstCx, lastCx;
        n.children.forEach(function(c, i){
          if (i > 0) x += H_GAP;
          place(c, x);
          var cCx = c.x + c.w / 2;
          if (i === 0) firstCx = cCx;
          lastCx = cCx;
          x += c.subW;
        });
        var centerX = (firstCx + lastCx) / 2;
        n.x = centerX - n.w / 2;
      }
      n.y = n.depth * ROW_HEIGHT;
      positions[n.id] = { x:n.x, y:n.y, w:n.w, h:n.h, depth:n.depth };
    }

    // Step 3 — lay out the forest. Roots placed side-by-side with double gap.
    var trees = rootIds.map(function(r){ return build(r, 0); }).filter(function(t){ return t !== null; });
    var cursor = 0;
    trees.forEach(function(tree){
      place(tree, cursor);
      cursor += tree.subW + H_GAP * 2;
    });

    // Step 4 — for LR, project onto columns (depth → x) and rows (original x → y)
    if (dir === 'LR'){
      var swapped = {};
      Object.keys(positions).forEach(function(k){
        var p = positions[k];
        swapped[k] = { x: p.depth * COL_WIDTH, y: p.x * 0.55, w: p.w, h: p.h, depth: p.depth };
      });
      positions = swapped;
    }
    return positions;
  }

  function renderOrgChart(host){
    injectCss();
    if (!host) return;
    if (S.loading || !S.loaded){
      host.innerHTML = UI.loadingHtml(t('Loading workforce catalog…','Đang tải danh mục tổ chức…'));
      loadAll().then(function(){ renderOrgChart(host); });
      return;
    }
    if (S.error){
      host.innerHTML = UI.errorHtml(S.error, function(){ S.loaded=false; renderOrgChart(host); });
      return;
    }
    // Detach window pan listeners from the previous SVG before innerHTML wipes
    // it (otherwise stale closures accumulate and slow the page over time).
    var prevSvg = host.querySelector('[data-canvas-svg]');
    if (prevSvg && typeof prevSvg._panCleanup === 'function') prevSvg._panCleanup();

    host.innerHTML = ''
      + '<div class="org-console">'
      +   '<div class="org-toolbar">'
      +     '<span style="font-weight:700">'+esc(t('Display','Hiển thị'))+':</span>'
      +     '<button class="org-chip '+(S.chart.mode==='units'?'is-active':'')+'"     data-act="chart-mode" data-val="units">🏢 '+esc(t('Units','Đơn vị'))+'</button>'
      +     '<button class="org-chip '+(S.chart.mode==='positions'?'is-active':'')+'" data-act="chart-mode" data-val="positions">💼 '+esc(t('Roles','Vai trò'))+'</button>'
      +     '<span style="width:1px;height:24px;background:var(--border-1,#e5e7eb)"></span>'
      +     '<span style="font-weight:700">'+esc(t('Layout','Bố cục'))+':</span>'
      +     '<button class="org-chip '+(S.chart.layout==='TB'?'is-active':'')+'" data-act="chart-layout" data-val="TB">↓ '+esc(t('Top-down','Dọc'))+'</button>'
      +     '<button class="org-chip '+(S.chart.layout==='LR'?'is-active':'')+'" data-act="chart-layout" data-val="LR">→ '+esc(t('Left-right','Ngang'))+'</button>'
      +     '<span style="width:1px;height:24px;background:var(--border-1,#e5e7eb)"></span>'
      +     '<span style="font-weight:700">'+esc(t('Status','Trạng thái'))+':</span>'
      +     '<select class="org-btn" data-act="chart-status-filter" style="padding:6px 10px">'
      +       '<option value="active"'  + (S.filter.status==='active'?' selected':'')   + '>'+esc(t('Active only','Đang hoạt động'))+'</option>'
      +       '<option value="inactive"'+ (S.filter.status==='inactive'?' selected':'') + '>'+esc(t('Inactive only','Ngừng dùng'))+'</option>'
      +       '<option value="all"'     + (S.filter.status==='all'?' selected':'')      + '>'+esc(t('All','Tất cả'))+'</option>'
      +     '</select>'
      +     '<span style="flex:1"></span>'
      +     (S.chart.editing
              ? '<span class="org-btn org-chart-editing">'+esc(t('Editing','Đang sửa'))+(chartHasDirtyLayout()?' *':'')+'</span>'
                + '<button class="org-btn is-primary" data-act="chart-save-layout">💾 '+esc(t('Save','Lưu'))+'</button>'
                + '<button class="org-btn" data-act="chart-cancel-layout">'+esc(t('Cancel','Hủy'))+'</button>'
              : '<button class="org-btn" data-act="chart-edit-layout">✏️ '+esc(t('Edit','Sửa'))+'</button>')
      +     '<button class="org-btn" data-act="chart-fit" title="'+esc(t('Fit to screen','Vừa khung'))+'">⛶ '+esc(t('Fit','Vừa khung'))+'</button>'
      +     '<button class="org-btn" data-act="chart-reload">🔄 '+esc(t('Reload','Tải lại'))+'</button>'
      +     '<div style="position:relative" data-export-menu>'
      +       '<button class="org-btn" data-act="chart-export-menu">⤓ '+esc(t('Export','Xuất'))+' ▾</button>'
      +       '<div data-export-dropdown style="display:none;position:absolute;top:calc(100% + 4px);right:0;min-width:180px;background:var(--surface-1,#fff);border:1px solid var(--border-1,#e5e7eb);border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.12);z-index:30;padding:4px">'
      +         '<button class="org-btn" style="width:100%;justify-content:flex-start;border:0;background:transparent" data-act="chart-export" data-format="svg">📐 '+esc(t('SVG vector','SVG vector'))+'</button>'
      +         '<button class="org-btn" style="width:100%;justify-content:flex-start;border:0;background:transparent" data-act="chart-export" data-format="png">🖼️ '+esc(t('PNG image','Ảnh PNG'))+'</button>'
      +         '<button class="org-btn" style="width:100%;justify-content:flex-start;border:0;background:transparent" data-act="chart-export" data-format="print">🖨️ '+esc(t('Print / Save as PDF','In / Lưu PDF'))+'</button>'
      +         '<button class="org-btn" style="width:100%;justify-content:flex-start;border:0;background:transparent" data-act="chart-export" data-format="json">{ } '+esc(t('JSON snapshot','JSON snapshot'))+'</button>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="org-canvas-wrap" data-canvas-wrap>'
      +     '<div class="org-canvas-toolbar">'
      +       '<div class="org-canvas-tools">'
      +         '<button class="org-btn" data-act="chart-zoom" data-val="-1" title="'+esc(t('Zoom out','Thu nhỏ'))+'">−</button>'
      +         '<span class="org-zoom-pill" data-zoom-display>100%</span>'
      +         '<button class="org-btn" data-act="chart-zoom" data-val="1" title="'+esc(t('Zoom in','Phóng to'))+'">+</button>'
      +         '<button class="org-btn" data-act="chart-zoom" data-val="0" title="'+esc(t('Reset zoom','Khôi phục'))+'">100%</button>'
      +       '</div>'
      +     '</div>'
      +     '<svg class="org-canvas-svg" data-canvas-svg xmlns="http://www.w3.org/2000/svg"></svg>'
      +   '</div>'
      + '</div>';

    bindOrgChartHostEvents(host);
    bindOrgChartSvgEvents(host);
    drawOrgChart(host);
  }

  /* Toolbar/button click delegation on the panel — bound ONCE. Looks up the
   * current SVG via querySelector at click time so the handlers always operate
   * on the live DOM (the SVG element gets recreated on every renderOrgChart). */
  function bindOrgChartHostEvents(host){
    if (host._chartHostBound) return;
    host._chartHostBound = true;
    // Status dropdown lives on the chart toolbar but writes to the SAME
    // S.filter.status used by the cards view, so toggling here also affects
    // the next visit to "Phòng ban & Chức danh".
    host.addEventListener('change', function(ev){
      var sel = ev.target.closest('[data-act="chart-status-filter"]');
      if (!sel) return;
      S.filter.status = String(sel.value || 'active');
      S.chart.zoom = 1; S.chart.panX = 0; S.chart.panY = 0;
      renderOrgChart(host);
    });
    host.addEventListener('click', function(ev){
      var dropdown = host.querySelector('[data-export-dropdown]');
      var menu = host.querySelector('[data-export-menu]');
      if (menu && !menu.contains(ev.target) && dropdown){ dropdown.style.display = 'none'; }

      var el = ev.target.closest('[data-act]'); if (!el) return;
      var svg = host.querySelector('[data-canvas-svg]');
      var canvasWrap = host.querySelector('[data-canvas-wrap]');
      var zoomDisplay = host.querySelector('[data-zoom-display]');
      var act = el.getAttribute('data-act');
      if (act === 'chart-mode'){
        S.chart.mode = el.getAttribute('data-val');
        // Reset transform so the new mode auto-fits — the previous mode's
        // pan/zoom is sized for a different node count and hierarchy depth,
        // leaving the new chart partly off-screen (looks like the page froze).
        S.chart.zoom = 1; S.chart.panX = 0; S.chart.panY = 0;
        renderOrgChart(host);
      } else if (act === 'chart-layout'){
        S.chart.layout = el.getAttribute('data-val');
        S.chart.zoom = 1; S.chart.panX = 0; S.chart.panY = 0;
        renderOrgChart(host);
      } else if (act === 'chart-edit-layout'){
        S.chart.editing = true;
        S.chart.dirtyManualPositions = emptyManualPositionState();
        renderOrgChart(host);
      } else if (act === 'chart-save-layout'){
        persistChartLayout(host);
      } else if (act === 'chart-cancel-layout'){
        cancelChartLayoutEdit(host);
      } else if (act === 'chart-zoom'){
        var v = parseInt(el.getAttribute('data-val'),10);
        if (v === 0) S.chart.zoom = 1;
        else S.chart.zoom = Math.max(0.2, Math.min(3, S.chart.zoom * (v>0?1.2:1/1.2)));
        applyTransform(svg, zoomDisplay);
      } else if (act === 'chart-fit'){
        fitToScreen(svg, canvasWrap, zoomDisplay);
      } else if (act === 'chart-reload'){
        loadAll(true).then(function(){ renderOrgChart(host); });
      } else if (act === 'chart-export-menu'){
        ev.stopPropagation();
        if (dropdown) dropdown.style.display = (dropdown.style.display === 'none' || !dropdown.style.display) ? 'block' : 'none';
      } else if (act === 'chart-export'){
        var fmt = el.getAttribute('data-format');
        if (dropdown) dropdown.style.display = 'none';
        exportChart(svg, fmt);
      }
    });
  }

  /* Pan + wheel-zoom on the SVG itself — bound EVERY render because the SVG
   * element is recreated by renderOrgChart's innerHTML rewrite. Without this
   * re-bind, switching modes/layouts left pan/zoom dead and the chart felt
   * frozen ("bị treo") on interaction. */
  function bindOrgChartSvgEvents(host){
    var svg = host.querySelector('[data-canvas-svg]');
    if (!svg || svg._svgBound) return;
    svg._svgBound = true;
    var zoomDisplay = host.querySelector('[data-zoom-display]');
    var panning = false, panStart = null;

    svg.addEventListener('mousedown', function(ev){
      if (ev.target.closest('[data-node-id]')) return; // node has its own drag handler
      panning = true;
      panStart = { x: ev.clientX, y: ev.clientY, panX: S.chart.panX, panY: S.chart.panY };
      svg.classList.add('is-panning');
      ev.preventDefault();
    });

    function onPanMove(ev){
      if (!panning) return;
      S.chart.panX = panStart.panX + (ev.clientX - panStart.x);
      S.chart.panY = panStart.panY + (ev.clientY - panStart.y);
      applyTransform(svg, zoomDisplay);
    }
    function onPanUp(){
      if (panning){
        panning = false;
        svg.classList.remove('is-panning');
      }
    }
    // Window listeners survive SVG replacement; tracked on the SVG so that if
    // a stale SVG is gc'd its closures are also cleared by removeEventListener
    // on the next render's cleanup hook below.
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanUp);
    svg._panCleanup = function(){
      window.removeEventListener('mousemove', onPanMove);
      window.removeEventListener('mouseup', onPanUp);
    };

    svg.addEventListener('wheel', function(ev){
      ev.preventDefault();
      var rect = svg.getBoundingClientRect();
      var cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;
      var delta = ev.deltaY < 0 ? 1.12 : 1/1.12;
      var nextZoom = Math.max(0.2, Math.min(3, S.chart.zoom * delta));
      var ratio = nextZoom / S.chart.zoom;
      S.chart.panX = cx - (cx - S.chart.panX) * ratio;
      S.chart.panY = cy - (cy - S.chart.panY) * ratio;
      S.chart.zoom = nextZoom;
      applyTransform(svg, zoomDisplay);
    }, { passive:false });
  }

  function applyTransform(svg, zoomDisplay){
    if (!svg) return;
    var g = svg.querySelector('[data-svg-root]');
    if (g) g.setAttribute('transform', 'translate('+S.chart.panX+','+S.chart.panY+') scale('+S.chart.zoom+')');
    if (zoomDisplay) zoomDisplay.textContent = Math.round(S.chart.zoom * 100) + '%';
  }

  function fitToScreen(svg, wrap, zoomDisplay){
    var g = svg.querySelector('[data-svg-root]'); if (!g) return;
    var bbox = g.getBBox();
    if (!bbox.width || !bbox.height) return;
    var rect = wrap.getBoundingClientRect();
    var pad = 60;
    var sx = (rect.width - pad) / bbox.width;
    var sy = (rect.height - pad) / bbox.height;
    var z = Math.min(sx, sy, 1.5);
    S.chart.zoom = Math.max(0.2, z);
    S.chart.panX = (rect.width - bbox.width * z) / 2 - bbox.x * z;
    S.chart.panY = (rect.height - bbox.height * z) / 2 - bbox.y * z;
    applyTransform(svg, zoomDisplay);
  }

  function buildPositionChildrenMap(){
    var childrenMap = {};
    S.positions.forEach(function(p){
      var pid = String(p.reports_to_position_id || '');
      (childrenMap[pid] = childrenMap[pid] || []).push(String(p.hcm_position_id || ''));
    });
    return childrenMap;
  }

  function collectSubtreeIds(rootId, childrenMap){
    rootId = String(rootId || '');
    var ids = [rootId];
    (childrenMap[rootId] || []).forEach(function(childId){
      ids = ids.concat(collectSubtreeIds(childId, childrenMap));
    });
    return ids;
  }

  function readTranslate(el){
    var m = /translate\(([^,\s]+)[ ,]\s*([^)\s]+)\)/.exec(el.getAttribute('transform') || '');
    return m ? { x:parseFloat(m[1]), y:parseFloat(m[2]) } : { x:0, y:0 };
  }

  function setTranslate(el, x, y){
    if (el) el.setAttribute('transform', 'translate('+x+','+y+')');
  }

  var CHART_GRID_SIZE = 24;

  function snapChartCoord(value){
    return Math.round(value / CHART_GRID_SIZE) * CHART_GRID_SIZE;
  }

  function snapPoint(x, y){
    return { x:snapChartCoord(x), y:snapChartCoord(y) };
  }

  function snapLayoutPositions(positions){
    Object.keys(positions || {}).forEach(function(id){
      var p = positions[id];
      if (!p) return;
      p.x = snapChartCoord(p.x);
      p.y = snapChartCoord(p.y);
    });
    return positions;
  }

  function emptyManualPositionState(){
    return { units:{}, positions:{} };
  }

  function manualBucket(state, group, layout){
    state = state || emptyManualPositionState();
    state[group] = state[group] || {};
    state[group][layout] = state[group][layout] || {};
    return state[group][layout];
  }

  function normalizedManualPoint(point){
    if (!point || point.x == null || point.y == null) return null;
    var x = Number(point.x), y = Number(point.y);
    if (!isFinite(x) || !isFinite(y)) return null;
    return snapPoint(x, y);
  }

  function hydrateManualPositionsFromMetadata(){
    var next = emptyManualPositionState();
    function applyRecord(record, group, idField){
      var id = String(record && record[idField] || '');
      if (!id) return;
      var meta = safeJson(record.metadata);
      var layouts = safeJson(meta.org_chart_layout);
      Object.keys(layouts || {}).forEach(function(layout){
        var point = normalizedManualPoint(layouts[layout]);
        if (!point) return;
        manualBucket(next, group, layout)[id] = point;
      });
    }
    (S.units || []).forEach(function(u){ applyRecord(u, 'units', 'hcm_org_unit_id'); });
    (S.positions || []).forEach(function(p){ applyRecord(p, 'positions', 'hcm_position_id'); });
    S.chart.manualPositions = next;
    S.chart.dirtyManualPositions = emptyManualPositionState();
  }

  function markManualChartPositionsDirty(kind, positions){
    if (!S.chart.editing) return;
    var group = kind === 'unit' ? 'units' : 'positions';
    var layout = S.chart.layout || 'TB';
    S.chart.dirtyManualPositions = S.chart.dirtyManualPositions || emptyManualPositionState();
    var dirty = manualBucket(S.chart.dirtyManualPositions, group, layout);
    Object.keys(positions || {}).forEach(function(id){
      var p = positions[id];
      if (!p) return;
      dirty[id] = snapPoint(p.x, p.y);
    });
  }

  function chartHasDirtyLayout(){
    var dirty = S.chart.dirtyManualPositions || {};
    return ['units','positions'].some(function(group){
      return Object.keys(dirty[group] || {}).some(function(layout){
        return Object.keys((dirty[group] || {})[layout] || {}).length > 0;
      });
    });
  }

  function chartManualPositions(kind){
    var group = kind === 'unit' ? 'units' : 'positions';
    var layout = S.chart.layout || 'TB';
    S.chart.manualPositions = S.chart.manualPositions || emptyManualPositionState();
    return manualBucket(S.chart.manualPositions, group, layout);
  }

  function applyManualChartPositions(positions, kind){
    var saved = chartManualPositions(kind);
    Object.keys(positions || {}).forEach(function(id){
      var p = positions[id];
      var manual = saved[id];
      if (!p || !manual) return;
      p.x = snapChartCoord(manual.x);
      p.y = snapChartCoord(manual.y);
    });
    return positions;
  }

  function saveManualChartPositions(kind, positions){
    var saved = chartManualPositions(kind);
    Object.keys(positions || {}).forEach(function(id){
      var p = positions[id];
      if (!p) return;
      saved[id] = snapPoint(p.x, p.y);
    });
    markManualChartPositionsDirty(kind, positions);
  }

  function clearManualChartPositions(kind, ids){
    var saved = chartManualPositions(kind);
    (ids || []).forEach(function(id){ delete saved[id]; });
  }

  function chartLayoutPayload(record, layout, point){
    var meta = Object.assign({}, safeJson(record && record.metadata));
    var layouts = Object.assign({}, safeJson(meta.org_chart_layout));
    layouts[layout] = snapPoint(point.x, point.y);
    meta.org_chart_layout = layouts;
    return { metadata: meta };
  }

  function persistChartLayout(host){
    var dirty = S.chart.dirtyManualPositions || emptyManualPositionState();
    var ops = [];
    Object.keys(dirty.units || {}).forEach(function(layout){
      Object.keys(dirty.units[layout] || {}).forEach(function(id){
        var u = S.byUnitId[id];
        var point = dirty.units[layout][id];
        if (!u || !point) return;
        ops.push(safeUpdate('hcm_workforce','hcm_org_units', id, chartLayoutPayload(u, layout, point), u.row_version));
      });
    });
    Object.keys(dirty.positions || {}).forEach(function(layout){
      Object.keys(dirty.positions[layout] || {}).forEach(function(id){
        var p = S.byPositionId[id];
        var point = dirty.positions[layout][id];
        if (!p || !point) return;
        ops.push(safeUpdate('hcm_workforce','hcm_positions', id, chartLayoutPayload(p, layout, point), p.row_version));
      });
    });
    if (!ops.length){
      S.chart.editing = false;
      UI.toast(t('No layout changes to save','Không có thay đổi bố cục để lưu'), 'success');
      renderOrgChart(host);
      return;
    }
    Promise.all(ops).then(function(){
      UI.toast(t('Layout saved','Đã lưu bố cục'), 'success');
      S.chart.editing = false;
      return loadAll(true);
    }).then(function(){
      renderOrgChart(host);
    }).catch(function(err){
      UI.toast((err && err.message) || 'save_failed', 'error');
    });
  }

  function cancelChartLayoutEdit(host){
    S.chart.editing = false;
    S.chart.dirtyManualPositions = emptyManualPositionState();
    hydrateManualPositionsFromMetadata();
    renderOrgChart(host);
  }

  function restoreOpacity(el, value){
    if (!el) return;
    if (value === null || value === undefined || value === '') el.removeAttribute('opacity');
    else el.setAttribute('opacity', value);
  }

  function refreshUnitEdges(host, overrides){
    overrides = overrides || {};
    var state = host._unitChartState;
    if (!state) return;
    host.querySelectorAll('[data-edge-kind="unit"]').forEach(function(path){
      var parentId = path.getAttribute('data-edge-parent');
      var childId = path.getAttribute('data-edge-child');
      var p1 = overrides[parentId] || state.positions[parentId];
      var p2 = overrides[childId] || state.positions[childId];
      if (!p1 || !p2) return;
      path.setAttribute('d', orthoEdgePath(p1, p2, state.W, state.H, state.layout));
    });
  }

  function refreshPositionEdges(host, overrides){
    overrides = overrides || {};
    var state = host._positionChartState;
    if (!state) return;
    host.querySelectorAll('[data-edge-kind="position"]').forEach(function(path){
      var parentId = path.getAttribute('data-edge-parent');
      var childId = path.getAttribute('data-edge-child');
      var p1 = overrides[parentId] || state.positions[parentId];
      var p2 = overrides[childId] || state.positions[childId];
      if (!p1 || !p2) return;
      path.setAttribute('d', orthoEdgePath(p1, p2, state.W, state.H, state.layout));
    });
  }

  function drawOrgChart(host){
    var svg = host.querySelector('[data-canvas-svg]');
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var defs = document.createElementNS(SVG_NS, 'defs');
    // Grid pattern + arrow markers (open & filled). Markers are referenced by
    // edge paths via marker-end="url(#org-arrow)" to draw professional
    // parent → child arrowheads typical of corporate org charts.
    defs.innerHTML = ''
      + '<pattern id="org-grid" width="24" height="24" patternUnits="userSpaceOnUse">'
      +   '<path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(120,120,120,.06)" stroke-width="1"/>'
      + '</pattern>'
      + '<marker id="org-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
      +   '<path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>'
      + '</marker>'
      + '<marker id="org-arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">'
      +   '<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--brand-primary,#4f46e5)"/>'
      + '</marker>';
    svg.appendChild(defs);
    var bg = document.createElementNS(SVG_NS,'rect');
    bg.setAttribute('width','100%'); bg.setAttribute('height','100%');
    bg.setAttribute('fill','url(#org-grid)');
    svg.appendChild(bg);

    var rootG = document.createElementNS(SVG_NS,'g');
    rootG.setAttribute('data-svg-root','');
    svg.appendChild(rootG);

    if (S.chart.mode === 'positions'){
      drawPositionsTree(rootG, host);
    } else {
      drawUnitsTree(rootG, host);
    }

    // Apply current transform; if first time, fit
    if (S.chart.zoom === 1 && S.chart.panX === 0 && S.chart.panY === 0){
      var wrap = host.querySelector('[data-canvas-wrap]');
      var zoomDisplay = host.querySelector('[data-zoom-display]');
      // Slight delay so getBBox sees the rendered nodes
      requestAnimationFrame(function(){ fitToScreen(svg, wrap, zoomDisplay); });
    } else {
      applyTransform(svg, host.querySelector('[data-zoom-display]'));
    }
  }

  // Status filter shared with the cards view (S.filter.status). The chart was
  // iterating S.units / S.positions directly, so archived / inactive entries
  // (including soft-archived test units) still rendered on the canvas even
  // though the cards view honored S.filter.status. Both views must reflect
  // the same source of truth: an inactive unit/position is hidden from BOTH
  // when status='active', visible in BOTH when status='all'.
  function chartUnitPassesStatus(u){
    if (!u) return false;
    var active = String(u.status || 'active') !== 'inactive';
    if (S.filter.status === 'active'   && !active) return false;
    if (S.filter.status === 'inactive' &&  active) return false;
    return true;
  }
  function chartPositionPassesStatus(p){
    if (!p) return false;
    var active = String(p.status || 'active') !== 'inactive';
    if (S.filter.status === 'active'   && !active) return false;
    if (S.filter.status === 'inactive' &&  active) return false;
    return true;
  }

  function drawUnitsTree(rootG, host){
    host._positionChartState = null;
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var W = 230, H = 130;
    var visibleByParent = {};
    S.units.forEach(function(u){
      if (!chartUnitPassesStatus(u)) return;
      // Reparent to '' when the unit's parent itself is hidden, so the
      // surviving children still attach somewhere instead of becoming
      // orphan-floating in the canvas.
      var parentId = String(u.parent_org_unit_id || '');
      var parent = parentId ? S.byUnitId[parentId] : null;
      var rerouted = parent && !chartUnitPassesStatus(parent) ? '' : parentId;
      (visibleByParent[rerouted] = visibleByParent[rerouted] || []).push(u);
    });
    var rootIds = (visibleByParent['']||[]).map(function(u){ return u.hcm_org_unit_id; });
    var positions = layoutTree(
      rootIds,
      function(id){ return (visibleByParent[id]||[]).map(function(c){ return c.hcm_org_unit_id; }); },
      function(){ return { w:W, h:H }; },
      S.chart.layout
    );
    snapLayoutPositions(positions);
    applyManualChartPositions(positions, 'unit');
    host._unitChartState = { positions:positions, W:W, H:H, layout:S.chart.layout };

    // Edges first (orthogonal connectors with arrow markers, like corporate
    // org charts). Each edge consists of: bus stub down from parent, horizontal
    // shoulder, vertical drop into child top — classic three-segment join.
    Object.keys(positions).forEach(function(id){
      var u = S.byUnitId[id]; if (!u) return;
      var children = (visibleByParent[id]||[]);
      children.forEach(function(c){
        var p1 = positions[id], p2 = positions[c.hcm_org_unit_id];
        if (!p2) return;
        var path = document.createElementNS(SVG_NS,'path');
        path.setAttribute('class','org-edge');
        path.setAttribute('d', orthoEdgePath(p1, p2, W, H, S.chart.layout));
        path.setAttribute('marker-end','url(#org-arrow)');
        path.setAttribute('data-edge-kind','unit');
        path.setAttribute('data-edge-parent', id);
        path.setAttribute('data-edge-child', c.hcm_org_unit_id);
        rootG.appendChild(path);
      });
    });

    // Nodes
    Object.keys(positions).forEach(function(id){
      var u = S.byUnitId[id]; if (!u) return;
      var p = positions[id];
      drawUnitNode(rootG, u, p.x, p.y, W, H, host);
    });
  }

  function drawPositionsTree(rootG, host){
    host._unitChartState = null;
    // Build virtual tree from reports_to_position_id
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var W = 286, H = 104;
    var fullChildrenMap = buildPositionChildrenMap();
    // Apply the same S.filter.status gate that the cards view uses, so the
    // role chart and the position cards always render the same dataset.
    var visibleSet = {};
    S.positions.forEach(function(p){
      if (chartPositionPassesStatus(p)) visibleSet[String(p.hcm_position_id || '')] = true;
    });
    var childrenMap = {};
    S.positions.forEach(function(p){
      var pid = String(p.hcm_position_id || '');
      if (!visibleSet[pid]) return;
      var parentId = String(p.reports_to_position_id || '');
      var rerouted = parentId && !visibleSet[parentId] ? '' : parentId;
      (childrenMap[rerouted] = childrenMap[rerouted] || []).push(pid);
    });
    var collapsed = S.chart.collapsedPositions || (S.chart.collapsedPositions = {});
    function visibleChildren(id){
      return collapsed[id] ? [] : (childrenMap[id] || []);
    }
    var rootIds = (childrenMap['']||[]);
    if (!rootIds.length){
      host._positionChartState = null;
      var msg = document.createElementNS(SVG_NS,'text');
      msg.setAttribute('x',60); msg.setAttribute('y',60);
      msg.setAttribute('fill','currentColor');
      msg.textContent = t('No reporting lines configured. Set "Reports to" on positions to see this view.','Chưa có line báo cáo. Thiết lập "Báo cáo cho" trên vị trí để xem chế độ này.');
      rootG.appendChild(msg);
      return;
    }
    var positions = layoutTree(
      rootIds,
      visibleChildren,
      function(){ return { w:W, h:H }; },
      S.chart.layout
    );
    snapLayoutPositions(positions);
    applyManualChartPositions(positions, 'position');
    host._positionChartState = { positions:positions, childrenMap:childrenMap, W:W, H:H, layout:S.chart.layout };
    Object.keys(positions).forEach(function(id){
      visibleChildren(id).forEach(function(cid){
        var p1 = positions[id], p2 = positions[cid];
        if (!p2) return;
        var path = document.createElementNS(SVG_NS,'path');
        path.setAttribute('class','org-edge');
        path.setAttribute('d', orthoEdgePath(p1, p2, W, H, S.chart.layout));
        path.setAttribute('marker-end','url(#org-arrow)');
        path.setAttribute('data-edge-kind','position');
        path.setAttribute('data-edge-parent', id);
        path.setAttribute('data-edge-child', cid);
        rootG.appendChild(path);
      });
    });
    Object.keys(positions).forEach(function(id){
      var p = S.byPositionId[id]; if (!p) return;
      var pos = positions[id];
      drawPositionNode(rootG, p, pos.x, pos.y, W, H, host);
    });
  }

  /* Orthogonal three-segment connector with rounded corners and an arrowhead
   * at the child end. Looks like classic corporate org charts:
   *   ┃ stub down from parent
   *   ┗━━━━━┓ horizontal shoulder
   *         ┃ vertical drop into child (with arrow)
   * Uses rounded quadratic-bezier corners (R) for a polished look. */
  function orthoEdgePath(p1, p2, W, H, dir){
    var R = 8; // corner radius
    if (dir === 'LR'){
      // parent right-edge → horizontal stub → vertical shoulder → arrow into child left-edge
      var x1 = p1.x + W,        y1 = p1.y + H/2;
      var x2 = p2.x - 4,        y2 = p2.y + H/2; // -4 so arrow tip lands on edge
      var mx = (x1 + x2) / 2;
      var dy = y2 > y1 ? 1 : -1;
      // Rounded right-angle bends at (mx, y1) and (mx, y2)
      return 'M'+x1+' '+y1
           +' L'+(mx-R)+' '+y1
           +' Q'+mx+' '+y1+' '+mx+' '+(y1 + dy*R)
           +' L'+mx+' '+(y2 - dy*R)
           +' Q'+mx+' '+y2+' '+(mx+R)+' '+y2
           +' L'+x2+' '+y2;
    }
    // TB: parent bottom-center → vertical stub → horizontal shoulder → vertical drop → arrow into child top
    var x1t = p1.x + W/2, y1t = p1.y + H;
    var x2t = p2.x + W/2, y2t = p2.y - 4; // -4 so arrow tip lands on top edge
    var my  = (y1t + y2t) / 2;
    var dx  = x2t > x1t ? 1 : (x2t < x1t ? -1 : 0);
    if (dx === 0){
      // straight vertical (child directly under parent)
      return 'M'+x1t+' '+y1t+' L'+x2t+' '+y2t;
    }
    return 'M'+x1t+' '+y1t
         +' L'+x1t+' '+(my - R)
         +' Q'+x1t+' '+my+' '+(x1t + dx*R)+' '+my
         +' L'+(x2t - dx*R)+' '+my
         +' Q'+x2t+' '+my+' '+x2t+' '+(my + R)
         +' L'+x2t+' '+y2t;
  }

  function svgEl(name, attrs){
    var el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs||{}).forEach(function(k){ el.setAttribute(k, attrs[k]); });
    return el;
  }

  function appendSvgVisual(g, x, y, size, visual, color){
    var bg = svgEl('rect', { x:x, y:y, width:size, height:size, rx:10, ry:10, fill:'color-mix(in srgb,'+color+' 14%,#fff)' });
    g.appendChild(bg);
    if (visual && visual.image){
      var img = svgEl('image', { x:x, y:y, width:size, height:size, preserveAspectRatio:'xMidYMid slice' });
      img.setAttribute('href', visual.image);
      try { img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', visual.image); } catch(_){}
      g.appendChild(img);
      return;
    }
    var iconText = svgEl('text', { x:x + size/2, y:y + size/2 + 8, 'text-anchor':'middle', class:'org-node-icon', 'font-size':22 });
    iconText.textContent = (visual && visual.icon) || '?';
    g.appendChild(iconText);
  }

  function nodeBandPath(width, height, radius, bandWidth){
    var r = Math.max(0, Math.min(radius || 0, width / 2, height / 2));
    var b = Math.max(0, Math.min(bandWidth || 0, width));
    if (!b) return '';
    if (!r) return 'M0 0 H'+b+' V'+height+' H0 Z';
    if (b >= r){
      return 'M'+r+' 0 H'+b+' V'+height+' H'+r
        +' A'+r+' '+r+' 0 0 1 0 '+(height-r)
        +' V'+r
        +' A'+r+' '+r+' 0 0 1 '+r+' 0 Z';
    }
    var insetY = r - Math.sqrt(Math.max(0, r * r - Math.pow(r - b, 2)));
    return 'M'+b+' '+insetY
      +' A'+r+' '+r+' 0 0 0 0 '+r
      +' V'+(height-r)
      +' A'+r+' '+r+' 0 0 0 '+b+' '+(height-insetY)
      +' Z';
  }

  function appendNodeBand(g, width, height, radius, bandWidth, color){
    var path = nodeBandPath(width, height, radius, bandWidth);
    if (!path) return;
    g.appendChild(svgEl('path', { d:path, fill:color, class:'org-node-band' }));
  }

  function drawUnitNode(rootG, u, x, y, W, H, host){
    var meta = typeMeta(u.org_unit_type);
    var color = unitColor(u);
    var positions = S.positionsByUnit[u.hcm_org_unit_id] || [];
    var totalHc = positions.reduce(function(s,p){ return s + (parseInt(p.required_headcount,10)||0); }, 0);
    var employeesHere = S.employeesByUnit[u.hcm_org_unit_id] || [];
    var filledHc = activeEmployees(employeesHere).length;
    var inactive = String(u.status||'active') === 'inactive';
    var g = svgEl('g', { transform:'translate('+x+','+y+')', 'data-node-id': u.hcm_org_unit_id, 'data-node-kind':'unit', style:S.chart.editing?'cursor:move':'cursor:pointer' });
    if (inactive) g.setAttribute('opacity','.55');
    var rect = svgEl('rect', { x:0, y:0, width:W, height:H, 'class':'org-node-rect', rx:14, ry:14, fill:'var(--surface-1,#fff)', stroke:'#e5e7eb' });
    if (S.selectedUnitId === u.hcm_org_unit_id) rect.classList.add('is-selected');
    g.appendChild(rect);
    appendNodeBand(g, W, H, 14, 8, color);
    var iconBg = svgEl('rect', { x:18, y:14, width:36, height:36, rx:10, ry:10, fill:'color-mix(in srgb,'+color+' 14%,#fff)' });
    g.appendChild(iconBg);
    var iconText = svgEl('text', { x:36, y:38, 'text-anchor':'middle', class:'org-node-icon' });
    iconText.textContent = meta.icon;
    g.appendChild(iconText);
    var title = svgEl('text', { x:64, y:30, class:'org-node-title', 'font-size':14, fill:color });
    title.textContent = ellipsize(u.org_unit_name||u.org_unit_code||'?', 22);
    g.appendChild(title);
    var sub = svgEl('text', { x:64, y:46, class:'org-node-sub', 'font-size':10.5 });
    sub.textContent = (lang()==='en'?meta.labelEn:meta.label) + ' · ' + (u.org_unit_code||'');
    g.appendChild(sub);
    // KPI strip
    var kpiBg = svgEl('rect', { x:18, y:62, width:W-36, height:50, rx:10, ry:10, fill:'#f9fafb', stroke:'#e5e7eb' });
    g.appendChild(kpiBg);
    var kpis = [
      { l: lang()==='en'?'Pos.':'Vị trí',  v: positions.length, c: '#6366f1' },
      { l: lang()==='en'?'HC':'Định biên', v: totalHc, c: '#0ea5e9' },
      { l: lang()==='en'?'Filled':'Có',    v: filledHc, c: '#10b981' }
    ];
    var kw = (W-36) / kpis.length;
    kpis.forEach(function(k, i){
      var cx = 18 + i*kw + kw/2;
      var v = svgEl('text', { x:cx, y:88, 'text-anchor':'middle', 'font-size':18, 'font-weight':800, fill:k.c });
      v.textContent = String(k.v);
      g.appendChild(v);
      var l = svgEl('text', { x:cx, y:104, 'text-anchor':'middle', 'font-size':9.5, fill:'#6b7280' });
      l.textContent = k.l;
      g.appendChild(l);
    });
    // Click → select. Double-click → open edit modal.
    g.addEventListener('click', function(ev){ ev.stopPropagation(); selectChartNode(host, 'unit', u.hcm_org_unit_id); });
    g.addEventListener('dblclick', function(ev){ ev.stopPropagation(); openUnitModal(u.hcm_org_unit_id, null, host); });
    // Drag-reparent
    enableNodeDrag(g, host, 'unit', u.hcm_org_unit_id, x, y, W, H);
    rootG.appendChild(g);
  }

  function drawPositionNode(rootG, p, x, y, W, H, host){
    var u = S.byUnitId[p.hcm_org_unit_id];
    var color = u ? unitColor(u) : '#4f46e5';
    var employees = S.employeesByPosition[p.hcm_position_id] || [];
    var active = activeEmployees(employees);
    var filled = active.length;
    var hc = parseInt(p.required_headcount,10) || 1;
    var open = Math.max(0, hc - filled);
    var over = Math.max(0, filled - hc);
    var visual = positionVisual(p, employees);
    var inactive = String(p.status||'active') === 'inactive';
    var assigneeLabel = positionAssigneeLabel(employees);
    var state = host._positionChartState || {};
    var childCount = state.childrenMap && state.childrenMap[p.hcm_position_id] ? state.childrenMap[p.hcm_position_id].length : 0;
    var isCollapsed = !!((S.chart.collapsedPositions || {})[p.hcm_position_id]);
    var detailNames = employees.length
      ? employees.map(function(e){ return employeeDisplayName(e); }).join('\n')
      : (lang() === 'en' ? 'No assigned employee' : 'Chưa có nhân sự được bổ nhiệm');
    var g = svgEl('g', { transform:'translate('+x+','+y+')', 'class':'org-position-node', 'data-node-id': p.hcm_position_id, 'data-node-kind':'position', style:S.chart.editing?'cursor:move':'cursor:pointer' });
    if (inactive) g.setAttribute('opacity','.55');
    var tooltip = svgEl('title', {});
    tooltip.textContent = [
      p.position_title || '',
      u ? (t('Org unit','Đơn vị') + ': ' + (u.org_unit_name || '')) : '',
      t('Headcount','Định biên') + ': ' + filled + '/' + hc,
      detailNames
    ].filter(Boolean).join('\n');
    g.appendChild(tooltip);
    var rect = svgEl('rect', { x:0, y:0, width:W, height:H, 'class':'org-node-rect', rx:12, ry:12, fill:'var(--surface-1,#fff)', stroke:over>0?'#ef4444':'#e5e7eb' });
    if (S.selectedPositionId === p.hcm_position_id) rect.classList.add('is-selected');
    g.appendChild(rect);
    appendNodeBand(g, W, H, 12, 6, color);
    appendSvgVisual(g, 16, 20, 56, visual, color);
    var title = svgEl('text', { x:86, y:32, class:'org-node-title', 'font-size':14 });
    title.textContent = ellipsize(p.position_title||'?', 27);
    g.appendChild(title);
    if (childCount > 0){
      var fold = svgEl('g', { 'class':'org-position-fold', 'data-role':'position-fold', style:'cursor:pointer' });
      var foldTitle = svgEl('title', {});
      foldTitle.textContent = isCollapsed
        ? t('Expand direct reports','Mở cấp dưới trực tiếp')
        : t('Collapse direct reports','Thu gọn cấp dưới trực tiếp');
      fold.appendChild(foldTitle);
      var foldRect = svgEl('rect', { x:W-43, y:12, width:30, height:22, rx:11, ry:11, fill:isCollapsed?'#eef2ff':'#f8fafc', stroke:isCollapsed?'#6366f1':'#cbd5e1' });
      fold.appendChild(foldRect);
      var foldText = svgEl('text', { x:W-28, y:27, 'text-anchor':'middle', 'font-size':11, 'font-weight':800, fill:isCollapsed?'#4338ca':'#475569' });
      foldText.textContent = isCollapsed ? ('+' + childCount) : '−';
      fold.appendChild(foldText);
      fold.addEventListener('click', function(ev){
        ev.stopPropagation();
        S.chart.collapsedPositions = S.chart.collapsedPositions || {};
        if (S.chart.collapsedPositions[p.hcm_position_id]) delete S.chart.collapsedPositions[p.hcm_position_id];
        else S.chart.collapsedPositions[p.hcm_position_id] = true;
        renderOrgChart(host);
      });
      fold.addEventListener('dblclick', function(ev){ ev.stopPropagation(); });
      g.appendChild(fold);
    }
    var assigneeText = svgEl('text', { x:86, y:56, class:'org-node-person', 'font-size':12 });
    assigneeText.textContent = ellipsize(assigneeLabel, 30);
    g.appendChild(assigneeText);
    // Filled / open pill
    var pillFg = over>0 ? '#991b1b' : (open>0 ? '#92400e' : '#065f46');
    var pillBg = over>0 ? '#fee2e2' : (open>0 ? '#fef3c7' : '#d1fae5');
    var pillStroke = over>0 ? '#ef4444' : (open>0 ? '#f59e0b' : '#10b981');
    var pill = svgEl('rect', { x:86, y:72, width:116, height:20, rx:10, ry:10, fill:pillBg, stroke:pillStroke });
    g.appendChild(pill);
    var pillText = svgEl('text', { x:144, y:86, 'text-anchor':'middle', 'font-size':11, 'font-weight':700, fill:pillFg });
    pillText.textContent = filled+'/'+hc + (over>0?' (+'+over+')':(open>0?' (+'+open+')':''));
    g.appendChild(pillText);
    g.addEventListener('click', function(ev){ ev.stopPropagation(); selectChartNode(host, 'position', p.hcm_position_id); });
    g.addEventListener('dblclick', function(ev){ ev.stopPropagation(); openPositionAssignmentsModal(p.hcm_position_id, host); });
    enablePositionDrag(g, host, p.hcm_position_id, x, y, W, H);
    rootG.appendChild(g);
  }

  /* Drag a position card onto another position to set reports_to_position_id. */
  function enablePositionDrag(g, host, id, origX, origY, W, H){
    g.addEventListener('mousedown', function(downEv){
      if (downEv.button !== 0) return;
      if (!S.chart.editing) return;
      if (downEv.target.closest('[data-role="position-fold"]')) return;
      var nodeId = String(id || '');
      var startX = downEv.clientX, startY = downEv.clientY;
      var dragging = false, dropTargetId = null, dropLegal = false;
      var svg = host.querySelector('[data-canvas-svg]');
      var state = host._positionChartState || {};
      var childrenMap = state.childrenMap || buildPositionChildrenMap();
      var subtreeIds = collectSubtreeIds(nodeId, childrenMap);
      var subtreeSet = new Set(subtreeIds);
      var visibleNodes = [];
      var lastOverrides = {};

      function findPositionNode(nodeId){
        var found = null;
        host.querySelectorAll('[data-node-id][data-node-kind="position"]').forEach(function(node){
          if (node.getAttribute('data-node-id') === String(nodeId)) found = node;
        });
        return found;
      }

      subtreeIds.forEach(function(nodeId){
        var node = findPositionNode(nodeId);
        if (!node) return;
        var pos = readTranslate(node);
        visibleNodes.push({
          id: nodeId,
          node: node,
          x: pos.x,
          y: pos.y,
          opacity: node.getAttribute('opacity')
        });
      });

      function onMove(ev){
        var ddx = ev.clientX - startX, ddy = ev.clientY - startY;
        if (!dragging){
          if (ddx*ddx + ddy*ddy < 16) return;
          dragging = true;
          downEv.stopPropagation();
          if (svg) svg.classList.add('is-dragging-node');
          visibleNodes.forEach(function(item){
            item.node.setAttribute('opacity', item.id === nodeId ? '.9' : '.72');
          });
        }
        var rawDx = ddx / S.chart.zoom;
        var rawDy = ddy / S.chart.zoom;
        var snappedRoot = snapPoint(origX + rawDx, origY + rawDy);
        var dx = snappedRoot.x - origX;
        var dy = snappedRoot.y - origY;
        var rootPos = snappedRoot;
        var overrides = {};
        visibleNodes.forEach(function(item){
          var nx = item.x + dx;
          var ny = item.y + dy;
          setTranslate(item.node, nx, ny);
          overrides[item.id] = { x:nx, y:ny };
          if (item.id === nodeId) rootPos = overrides[item.id];
        });
        lastOverrides = overrides;
        refreshPositionEdges(host, overrides);
        dropTargetId = null;
        var cx = rootPos.x + W/2, cy = rootPos.y + H/2;
        host.querySelectorAll('[data-node-id][data-node-kind="position"]').forEach(function(other){
          var otherId = other.getAttribute('data-node-id');
          if (subtreeSet.has(otherId)) return;
          var otherPos = readTranslate(other);
          var ox = otherPos.x, oy = otherPos.y;
          if (cx >= ox && cx <= ox + W && cy >= oy && cy <= oy + H){
            dropTargetId = otherId;
          }
        });
        host.querySelectorAll('.org-node-rect.is-drop-target,.org-node-rect.is-drop-illegal').forEach(function(r){
          r.classList.remove('is-drop-target'); r.classList.remove('is-drop-illegal');
        });
        if (dropTargetId){
          dropLegal = !subtreeSet.has(dropTargetId);
          var rectEl = host.querySelector('[data-node-id="'+dropTargetId+'"] .org-node-rect');
          if (rectEl) rectEl.classList.add(dropLegal ? 'is-drop-target' : 'is-drop-illegal');
        }
      }
      function onUp(){
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (svg) svg.classList.remove('is-dragging-node');
        host.querySelectorAll('.org-node-rect.is-drop-target,.org-node-rect.is-drop-illegal').forEach(function(r){
          r.classList.remove('is-drop-target'); r.classList.remove('is-drop-illegal');
        });
        if (!dragging) return;
        var newParentId = dropTargetId;
        var p = S.byPositionId[nodeId];
        if (!p) return;
        if (!newParentId){
          visibleNodes.forEach(function(item){
            var manual = lastOverrides[item.id] || { x:item.x, y:item.y };
            restoreOpacity(item.node, item.opacity);
            setTranslate(item.node, manual.x, manual.y);
            if (host._positionChartState && host._positionChartState.positions){
              host._positionChartState.positions[item.id] = { x:manual.x, y:manual.y };
            }
          });
          saveManualChartPositions('position', lastOverrides);
          refreshPositionEdges(host, {});
          return;
        }
        visibleNodes.forEach(function(item){
          restoreOpacity(item.node, item.opacity);
          setTranslate(item.node, item.x, item.y);
        });
        refreshPositionEdges(host, {});
        if (newParentId === nodeId || subtreeSet.has(newParentId)){
          UI.toast(t('Cannot report to self or own subordinate','Không thể báo cáo cho chính mình hoặc cấp dưới'),'error');
          return;
        }
        if (newParentId === String(p.reports_to_position_id || '')) return;
        var parent = S.byPositionId[newParentId];
        confirm({
          title: t('Set reports-to?','Đặt báo cáo cho?'),
          message: t('Make "'+p.position_title+'" report to "'+parent.position_title+'"?','Đặt "'+p.position_title+'" báo cáo cho "'+parent.position_title+'"?'),
          confirmLabel: t('Set','Đặt')
        }).then(function(ok){
          if (!ok) return;
          safeUpdate('hcm_workforce','hcm_positions', id, { reports_to_position_id: newParentId }, p.row_version)
            .then(function(){ clearManualChartPositions('position', subtreeIds); UI.toast(t('Position moved','Đã cập nhật'),'success'); loadAll(true).then(function(){ renderOrgChart(host); }); })
            .catch(function(err){ UI.toast(err && err.message || 'move_failed','error'); });
        });
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  function ellipsize(s, n){
    s = String(s||'');
    return s.length > n ? s.substring(0, n-1) + '…' : s;
  }

  function selectChartNode(host, kind, id){
    if (kind === 'unit'){
      S.selectedUnitId = id;
      // Visual feedback
      host.querySelectorAll('.org-node-rect.is-selected').forEach(function(r){ r.classList.remove('is-selected'); });
      var node = host.querySelector('[data-node-id="'+id+'"] .org-node-rect');
      if (node) node.classList.add('is-selected');
    } else if (kind === 'position'){
      S.selectedPositionId = id;
      host.querySelectorAll('.org-node-rect.is-selected').forEach(function(r){ r.classList.remove('is-selected'); });
      var n2 = host.querySelector('[data-node-id="'+id+'"] .org-node-rect');
      if (n2) n2.classList.add('is-selected');
    }
  }

  /* Drag-reparent on a unit node. Click-and-hold over a node, drag to another
   * unit node, drop. The drop target is highlighted green if the move is
   * legal, red if it would create a cycle (self/descendant). Click without
   * movement just selects (no drag). */
  function enableNodeDrag(g, host, kind, id, origX, origY, W, H){
    if (kind !== 'unit') return;
    g.addEventListener('mousedown', function(downEv){
      if (downEv.button !== 0) return;
      if (!S.chart.editing) return;
      var nodeId = String(id || '');
      // Allow native click for selection if user just clicks; only start drag
      // after a small movement threshold (4px).
      var startX = downEv.clientX, startY = downEv.clientY;
      var dragging = false, dropTargetId = null, dropLegal = false;
      var svg = host.querySelector('[data-canvas-svg]');
      var lastPos = { x:origX, y:origY };
      // Pre-compute descendants so we can mark illegal drops red.
      var descendants = new Set();
      (function walk(uid){
        (S.childrenOfUnit[uid] || []).forEach(function(c){
          var childId = String(c.hcm_org_unit_id || '');
          descendants.add(childId);
          walk(childId);
        });
      })(nodeId);

      function onMove(ev){
        var ddx = ev.clientX - startX, ddy = ev.clientY - startY;
        if (!dragging){
          if (ddx*ddx + ddy*ddy < 16) return; // 4px threshold
          dragging = true;
          downEv.stopPropagation();
          if (svg) svg.classList.add('is-dragging-node');
          g.setAttribute('opacity','.85');
        }
        var snapped = snapPoint(origX + ddx / S.chart.zoom, origY + ddy / S.chart.zoom);
        var nx = snapped.x;
        var ny = snapped.y;
        lastPos = { x:nx, y:ny };
        g.setAttribute('transform', 'translate('+nx+','+ny+')');
        refreshUnitEdges(host, (function(){ var o = {}; o[id] = lastPos; return o; })());
        // Hit-test other unit nodes for drop target
        dropTargetId = null;
        var cx = nx + W/2, cy = ny + H/2;
        host.querySelectorAll('[data-node-id][data-node-kind="unit"]').forEach(function(other){
          if (other === g) return;
          var ot = other.getAttribute('transform') || '';
          var m = /translate\(([^,\s]+)[ ,]\s*([^)\s]+)\)/.exec(ot);
          if (!m) return;
          var ox = parseFloat(m[1]), oy = parseFloat(m[2]);
          if (cx >= ox && cx <= ox + W && cy >= oy && cy <= oy + H){
            dropTargetId = other.getAttribute('data-node-id');
          }
        });
        // Update highlight (green=legal, red=illegal)
        host.querySelectorAll('.org-node-rect.is-drop-target,.org-node-rect.is-drop-illegal').forEach(function(r){
          r.classList.remove('is-drop-target'); r.classList.remove('is-drop-illegal');
        });
        if (dropTargetId){
          dropLegal = dropTargetId !== nodeId && !descendants.has(dropTargetId);
          var rectEl = host.querySelector('[data-node-id="'+dropTargetId+'"] .org-node-rect');
          if (rectEl) rectEl.classList.add(dropLegal ? 'is-drop-target' : 'is-drop-illegal');
        }
      }
      function onUp(){
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (svg) svg.classList.remove('is-dragging-node');
        host.querySelectorAll('.org-node-rect.is-drop-target,.org-node-rect.is-drop-illegal').forEach(function(r){
          r.classList.remove('is-drop-target'); r.classList.remove('is-drop-illegal');
        });
        if (!dragging) return; // pure click — let the click handler run
        g.setAttribute('opacity','1');
        var newParentId = dropTargetId;
        if (!newParentId){
          setTranslate(g, lastPos.x, lastPos.y);
          if (host._unitChartState && host._unitChartState.positions){
            host._unitChartState.positions[id] = { x:lastPos.x, y:lastPos.y };
          }
          saveManualChartPositions('unit', (function(){ var o = {}; o[id] = lastPos; return o; })());
          refreshUnitEdges(host, {});
          return;
        }
        g.setAttribute('transform', 'translate('+origX+','+origY+')');
        refreshUnitEdges(host, {});
        var u = S.byUnitId[nodeId];
        if (newParentId === nodeId || descendants.has(newParentId)){
          UI.toast(t('Cannot move under self or descendant','Không thể chuyển vào chính mình hoặc đơn vị con'),'error');
          return;
        }
        if (newParentId === String(u.parent_org_unit_id || '')) return; // no change
        var parent = S.byUnitId[newParentId];
        confirm({
          title: t('Reparent unit?','Chuyển đơn vị cha?'),
          message: t('Move "'+u.org_unit_name+'" under "'+parent.org_unit_name+'"?','Chuyển "'+u.org_unit_name+'" vào dưới "'+parent.org_unit_name+'"?'),
          confirmLabel: t('Move','Chuyển')
        }).then(function(ok){
          if (!ok) return;
          safeUpdate('hcm_workforce','hcm_org_units', id, { parent_org_unit_id: newParentId }, u.row_version)
            .then(function(){ clearManualChartPositions('unit', [id]); UI.toast(t('Unit moved','Đã chuyển đơn vị'),'success'); loadAll(true).then(function(){ renderOrgChart(host); }); })
            .catch(function(err){ UI.toast(err && err.message || 'move_failed','error'); });
        });
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      // Don't preventDefault — we want native click to still fire if no drag
    });
  }

  /* ── Export ──────────────────────────────────────────────────────────── */
  function exportChart(svg, format){
    if (!svg) return;
    if (format === 'json'){
      var snapshot = {
        generated_at: new Date().toISOString(),
        mode: S.chart.mode,
        layout: S.chart.layout,
        units: S.units, positions: S.positions
      };
      downloadBlob(new Blob([JSON.stringify(snapshot, null, 2)], { type:'application/json' }), 'org-chart-snapshot.json');
      return;
    }
    var serialized = serializeSvgForExport(svg);
    if (format === 'svg'){
      downloadBlob(new Blob([serialized], { type:'image/svg+xml' }), 'org-chart.svg');
      return;
    }
    if (format === 'png'){
      svgToPng(serialized, function(blob){
        downloadBlob(blob, 'org-chart.png');
      });
      return;
    }
    if (format === 'print'){
      printSvg(serialized);
      return;
    }
  }

  function serializeSvgForExport(svg){
    var clone = svg.cloneNode(true);
    // Compute true bounding box of content
    var rootG = svg.querySelector('[data-svg-root]');
    var bbox = rootG ? rootG.getBBox() : { x:0, y:0, width:1200, height:800 };
    var pad = 40;
    var width  = Math.ceil(bbox.width  + pad*2);
    var height = Math.ceil(bbox.height + pad*2);
    // Reset transforms in clone so the raw vector is exported (not the panned/zoomed view)
    var cloneRoot = clone.querySelector('[data-svg-root]');
    if (cloneRoot){
      cloneRoot.setAttribute('transform', 'translate('+(pad - bbox.x)+','+(pad - bbox.y)+')');
    }
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    clone.setAttribute('viewBox', '0 0 '+width+' '+height);
    // Remove the SVG-class (cursor styles not relevant in a static export)
    clone.removeAttribute('class');
    // Inline minimal styles so the file renders standalone
    var style = document.createElementNS('http://www.w3.org/2000/svg','style');
    style.textContent = ''
      + '.org-node-rect{fill:#fff;stroke:#e5e7eb;stroke-width:1.2}'
      + '.org-node-title{font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-weight:800}'
      + '.org-node-sub{font-family:-apple-system,Segoe UI,Roboto,sans-serif;fill:#6b7280}'
      + '.org-node-code{font-family:ui-monospace,monospace;fill:#6b7280}'
      + '.org-edge{fill:none;stroke:#9ca3af;stroke-width:1.4;opacity:.7}';
    clone.insertBefore(style, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  }

  function svgToPng(svgString, cb){
    var img = new Image();
    var blobUrl = URL.createObjectURL(new Blob([svgString], { type:'image/svg+xml' }));
    img.onload = function(){
      var canvas = document.createElement('canvas');
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function(b){ URL.revokeObjectURL(blobUrl); cb(b); }, 'image/png');
    };
    img.onerror = function(){ UI.toast(t('PNG export failed','Xuất PNG thất bại'),'error'); };
    img.src = blobUrl;
  }

  function printSvg(svgString){
    var w = window.open('', '_blank');
    if (!w){ UI.toast(t('Popup blocked','Popup bị chặn'),'error'); return; }
    w.document.write('<!DOCTYPE html><html><head><title>'+esc(t('Organization Chart','Sơ đồ tổ chức'))+'</title>'
      + '<style>@page{size:A3 landscape;margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#111827}'
      + 'header{padding:12px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}'
      + 'h1{font-size:16px;margin:0}.meta{font-size:11px;color:#6b7280}'
      + 'svg{width:100%;height:auto;display:block;margin:0 auto;page-break-inside:avoid;break-inside:avoid}text{paint-order:stroke;stroke:#fff;stroke-width:.35px;stroke-linejoin:round}</style></head>'
      + '<body><header><h1>'+esc(t('HESEM — Organization Chart','HESEM — Sơ đồ tổ chức'))+'</h1>'
      + '<div class="meta">'+esc(new Date().toISOString())+' · '+S.units.length+' '+esc(t('units','đơn vị'))+' · '+S.positions.length+' '+esc(t('positions','vị trí'))+'</div></header>'
      + svgString
      + '<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script>'
      + '</body></html>');
    w.document.close();
  }

  function downloadBlob(blob, filename){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 100);
  }

  /* ──────────────────────────────────────────────────────────────────────── *
   * Public exports
   * ──────────────────────────────────────────────────────────────────────── */
  window._renderAdminOrgUnits = renderOrgUnits;
  window._renderAdminOrgChart = renderOrgChart;
  window._adminOrgConsole = {
    state: S,
    reload: function(){ return loadAll(true); },
    _internals: { safeCreate: safeCreate, safeUpdate: safeUpdate, safeDelete: safeDelete, mutate: mutate, tolerantParseJson: tolerantParseJson }
  };
  window.addEventListener('admin:users:updated', function(ev){
    S.users = ev && ev.detail && Array.isArray(ev.detail.users) ? ev.detail.users : (Array.isArray(window.USERS) ? window.USERS : []);
    S.employeeProfiles = mergeEmployeeProfiles(S.users, Array.isArray(window.USERS) ? window.USERS : []);
    if (S.loaded) indexData();
  });
})();
