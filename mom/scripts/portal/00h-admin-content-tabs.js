/* ============================================================================
 * Admin Content Tabs — MFA / Effective Documents / Retention (v2 — full CRUD)
 * ----------------------------------------------------------------------------
 *  ▸ mfa             — 2-pane: role policies (NIST 800-63B AAL) + user
 *                      compliance with revoke/reset factor actions
 *  ▸ effective_docs  — list draft/effective documents, promote draft→effective,
 *                      acknowledgement flow with HMAC sign (21 CFR Part 11)
 *  ▸ retention       — 3-pane: policies / disposal queue / legal holds, with
 *                      witness signature + chain-of-custody on disposal
 * ========================================================================== */

(function(){
  'use strict';
  if (!window.AdminUI) { console.error('[admin-content] AdminUI not loaded'); return; }
  var UI = window.AdminUI;
  var t = UI.t, esc = UI.escapeHtml, badge = UI.badge;

  var state = {
    roles: [],
    users: [],
    rolePolicies: [],
    userFactors: [],
    docs: [],
    acknowledgements: [],
    retentionPolicies: [],
    legalHolds: [],
    disposalQueue: []
  };

  function fetchRoles(){ return UI.runtime.list('core_system','roles',{ limit:500 }).then(function(r){ state.roles = (r&&r.data)||r||[]; }); }
  function fetchUsers(){
    var loader = typeof window.loadSharedAdminUsers === 'function'
      ? window.loadSharedAdminUsers
      : function(){ return Promise.resolve(window.USERS || []); };
    return loader().then(function(users){
      state.users = (users || []).map(function(u){ return { id:u.id || u.employee_id || u.username, username:u.username, full_name:u.name || u.full_name, role_code:u.role, dept_code:u.dept, is_active:u.active!==false }; });
    });
  }
  function fetchRolePolicies(){ return UI.runtime.list('core_system','mfa_policy',{ limit:500 }).then(function(r){ state.rolePolicies = (r&&r.data)||r||[]; }).catch(function(){ state.rolePolicies = []; }); }
  function fetchUserFactors(){ return UI.fetchJson('/api/v1/mfa/factors').then(function(r){ state.userFactors = (r&&r.data)||r||[]; }).catch(function(){ state.userFactors = []; }); }
  function fetchDocs(){
    // DCC document control system holds the authoritative document register
    // (387 rows on prod). status='approved' = effective; 'draft' = unreleased.
    return UI.runtime.list('document_control','dcc_document_header',{ limit:500, sort:'-effective_date' })
      .then(function(r){
        var rows = (r && r.data) || r || [];
        state.docs = rows.map(function(d){
          return {
            id: d.header_id || d.id,
            doc_code: d.doc_code,
            title: d.title,
            title_vi: d.title || d.subtitle,
            revision: d.revision,
            effective_date: d.effective_date,
            owner_role: d.owner_role_code,
            approver_role: d.approver_role_code,
            // map DCC status → admin tab status
            status: d.status === 'approved' ? 'effective' : (d.status === 'retired' ? 'retired' : 'draft'),
            row_version: d.row_version,
            __raw: d
          };
        });
      }).catch(function(e){ console.warn('[admin-content] fetchDocs failed', e); state.docs = []; });
  }
  function fetchAcknowledgements(){ return UI.runtime.list('core_system','document_acknowledgement',{ limit:1000 }).then(function(r){ state.acknowledgements = (r&&r.data)||r||[]; }).catch(function(){ state.acknowledgements = []; }); }
  function fetchRetentionPolicies(){ return UI.runtime.list('master_data_governance','retention_policy',{ limit:200 }).then(function(r){ state.retentionPolicies = (r&&r.data)||r||[]; }).catch(function(){ state.retentionPolicies = []; }); }
  function fetchLegalHolds(){ return UI.runtime.list('core_system','legal_hold',{ limit:500 }).then(function(r){ state.legalHolds = (r&&r.data)||r||[]; }).catch(function(){ state.legalHolds = []; }); }
  function fetchDisposalQueue(){ return UI.fetchJson('/api/v1/retention/due-for-disposal').then(function(r){ state.disposalQueue = (r&&r.data)||r||[]; }).catch(function(){ state.disposalQueue = []; }); }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab — MFA
  // ════════════════════════════════════════════════════════════════════════════
  function renderMfa(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchRoles(), fetchUsers(), fetchRolePolicies(), fetchUserFactors()]).then(function(){
      UI.renderSubTabs(rootEl, [
        { key:'policy', label:t('Role policies','Chính sách theo vai trò'), render:renderMfaPolicies },
        { key:'compliance', label:t('User compliance','Tình trạng tuân thủ'), render:renderMfaCompliance }
      ], {});
    }).catch(function(err){ rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderMfa(rootEl); }); });
  }

  function renderMfaPolicies(el){
    var head = UI.panelHeader(
      t('MFA policies per role','Chính sách MFA theo vai trò'),
      t('NIST 800-63B AAL levels. Higher AAL forces stronger factors and shorter session lifetimes.',
        'Mức AAL theo NIST 800-63B. AAL cao buộc dùng yếu tố mạnh hơn và phiên ngắn hơn.'),
      UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'mfa-pol-refresh' })
      + UI.btn(t('New policy','Chính sách mới'),{ icon:'＋', id:'mfa-pol-new' })
    );
    // Index roles by both role_id and role_code so policy rows from the real
    // mfa_policy table (PK=role_id) can resolve their human label.
    var rolesById = {}, rolesByCode = {};
    state.roles.forEach(function(r){
      if (r.role_id) rolesById[r.role_id] = r;
      if (r.role_code) rolesByCode[r.role_code] = r;
    });
    var rows = state.rolePolicies.slice();
    var columns = [
      { key:'role_id', label:t('Role','Vai trò'), render:function(p){
          var r = rolesById[p.role_id] || rolesByCode[p.role_code];
          return '<div style="font-weight:500">'+esc((r&&r.role_label_vi)||(r&&r.role_code)||p.role_id||'?')+'</div>'
            + '<div style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-3)">'+esc((r&&r.role_code)||p.role_id||'')+'</div>';
        } },
      { key:'required_aal_level', label:'AAL', width:'80px', render:function(p){
          var aal = p.required_aal_level || 1;
          var tone = aal >= 3 ? 'block' : (aal === 2 ? 'warn' : 'info');
          return badge('AAL'+aal, tone);
        } },
      { key:'webauthn_required', label:t('WebAuthn','WebAuthn'), width:'100px', render:function(p){
          var allowed = Array.isArray(p.allowed_factor_types) ? p.allowed_factor_types : [];
          var meta = (p.metadata && typeof p.metadata === 'object') ? p.metadata : {};
          var req = meta.webauthn_required === true || (allowed.length === 1 && allowed[0] === 'webauthn');
          return req ? badge(t('Required','Bắt buộc'),'block') : badge(t('Optional','Tuỳ chọn'),'muted');
        } },
      { key:'reauth_after_minutes', label:t('Re-auth','Tái xác thực'), width:'120px', render:function(p){
          if (!p.reauth_after_minutes) return badge(t('Never','Không yêu cầu'),'muted');
          return '<span style="font-family:ui-monospace,monospace;font-size:12px">'+esc(p.reauth_after_minutes)+t(' min',' phút')+'</span>';
        } },
      { key:'apply_to_admin_only', label:t('Scope','Phạm vi'), width:'140px', render:function(p){ return p.apply_to_admin_only ? badge(t('Admin actions only','Chỉ thao tác admin'),'warn') : badge(t('All actions','Mọi thao tác'),'ok'); } },
      { key:'actions', label:'', width:'150px', render:function(p){
          return '<div style="display:flex;gap:4px">'
            + '<button class="btn-admin secondary sm" data-edit-pol="'+UI.escapeAttr(p.role_id)+'">'+esc(t('Edit','Sửa'))+'</button>'
            + '<button class="btn-admin secondary sm" data-del-pol="'+UI.escapeAttr(p.role_id)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Remove','Xoá'))+'</button>'
            + '</div>';
        } }
    ];
    el.innerHTML = head;
    el.appendChild(UI.buildTable(columns, rows, { rowKey:'role_id', emptyMessage:t('No MFA policies defined — defaults will apply','Chưa có chính sách MFA — dùng mặc định') }));
    el.querySelector('#mfa-pol-refresh').addEventListener('click', function(){ fetchRolePolicies().then(function(){ renderMfaPolicies(el); }); });
    el.querySelector('#mfa-pol-new').addEventListener('click', function(){ openMfaPolicyEditor(null, el); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-edit-pol]'), function(b){
      b.addEventListener('click', function(){ var p = state.rolePolicies.find(function(x){ return String(x.role_id)===b.getAttribute('data-edit-pol'); }); openMfaPolicyEditor(p, el); });
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-del-pol]'), function(b){
      b.addEventListener('click', function(){
        var rid = b.getAttribute('data-del-pol');
        var p = state.rolePolicies.find(function(x){ return String(x.role_id)===rid; });
        UI.confirmDestructive({ title:t('Remove MFA policy','Xoá chính sách MFA'), requireReason:true }).then(function(r){
          if (!r||!r.confirmed) return;
          UI.runtime.delete('core_system','mfa_policy', rid, p && p.row_version).then(function(){
            UI.audit('mfa.policy.delete', { role_id:rid, reason:r.reason });
            UI.toast(t('Removed','Đã xoá'),'ok');
            fetchRolePolicies().then(function(){ renderMfaPolicies(el); });
          }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
        });
      });
    });
  }

  function openMfaPolicyEditor(existing, hostEl){
    var usedRoleIds = state.rolePolicies.map(function(p){ return p.role_id; });
    var availableRoles = state.roles.filter(function(r){
      if (!r.role_id) return false;
      return existing ? true : usedRoleIds.indexOf(r.role_id) < 0;
    });
    var existingMeta = (existing && existing.metadata && typeof existing.metadata === 'object') ? existing.metadata : {};
    // Distinguish "field absent → use safe defaults" from "explicit empty array → respect it".
    var existingAllowed = (existing && Array.isArray(existing.allowed_factor_types))
      ? existing.allowed_factor_types
      : (existing ? [] : ['totp','webauthn','backup_code']);
    var fields = [
      { key:'role_id', label:t('Role','Vai trò'), type:'select', required:true,
        value: existing ? existing.role_id : '',
        disabled: !!existing,
        options: availableRoles.map(function(r){ return { value:r.role_id, label:(r.role_label_vi||r.role_code)+' ('+r.role_code+')' }; }) },
      { key:'required', label:t('MFA required','Bắt buộc MFA'), type:'checkbox',
        value: existing ? existing.required !== false : true,
        checkboxLabel: t('Block sign-in until enrolled (subject to grace period)','Chặn đăng nhập tới khi đăng ký xong (theo grace period)') },
      { key:'required_aal_level', label:t('Required AAL','AAL bắt buộc'), type:'select', required:true,
        value: existing ? (existing.required_aal_level||2) : 2,
        options:[
          { value:1, label:'AAL1 — '+t('single-factor','một yếu tố') },
          { value:2, label:'AAL2 — '+t('two-factor (TOTP/SMS/Push)','hai yếu tố') },
          { value:3, label:'AAL3 — '+t('hardware-bound (FIDO2/WebAuthn)','phần cứng FIDO2/WebAuthn') }
        ] },
      { key:'min_factors', label:t('Minimum factors','Số yếu tố tối thiểu'), type:'number', min:1, max:4,
        value: existing ? (existing.min_factors||1) : 1 },
      { key:'reauth_after_minutes', label:t('Re-auth interval (min, 0=never)','Khoảng tái xác thực (phút, 0=không)'), type:'number', min:0, max:10080,
        value: existing ? (existing.reauth_after_minutes != null ? existing.reauth_after_minutes : 480) : 480 },
      { key:'grace_period_days', label:t('Grace period (days)','Ân hạn (ngày)'), type:'number', min:0, max:90,
        value: existing ? (existing.grace_period_days != null ? existing.grace_period_days : 7) : 7 },
      { key:'apply_to_admin_only', label:t('Admin actions only','Chỉ thao tác admin'), type:'checkbox',
        value: existing ? !!existing.apply_to_admin_only : false,
        checkboxLabel: t('Step-up only when performing privileged operations','Chỉ yêu cầu khi thực hiện thao tác đặc quyền') },
      { key:'allow_remembered_device', label:t('Allow remembered device','Thiết bị đã nhớ'), type:'checkbox',
        value: existingMeta.allow_remembered_device !== false,
        checkboxLabel: t('Skip second factor on previously enrolled device','Bỏ qua yếu tố thứ 2 trên thiết bị đã đăng ký') },
      { key:'webauthn_required', label:t('Require WebAuthn','Bắt buộc WebAuthn'), type:'checkbox',
        value: existingAllowed.indexOf('webauthn') >= 0 && (existingMeta.webauthn_required === true || (existingAllowed.length === 1 && existingAllowed[0] === 'webauthn')),
        checkboxLabel: t('User must enroll a hardware key (FIDO2)','Phải đăng ký khoá phần cứng (FIDO2)') }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: existing ? t('Edit MFA policy','Sửa chính sách MFA') : t('New MFA policy','Tạo chính sách MFA'),
      bodyEl: form.el, width:'560px',
      footerHtml:'<button class="btn-admin secondary" id="mfa-pol-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="mfa-pol-save">'+esc(t('Save','Lưu'))+'</button>'
    });
    modal.card.querySelector('#mfa-pol-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#mfa-pol-save').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.role_id) { form.setError('role_id', t('Required','Bắt buộc')); return; }
      // Build payload matching real mfa_policy columns; non-column UI flags
      // (webauthn_required + allow_remembered_device) are tucked into metadata.
      var newAllowed = existingAllowed.slice();
      if (v.webauthn_required && newAllowed.indexOf('webauthn') < 0) newAllowed.push('webauthn');
      if (!newAllowed.length) newAllowed = ['totp','webauthn','backup_code'];
      var newMeta = Object.assign({}, existingMeta, {
        webauthn_required: !!v.webauthn_required,
        allow_remembered_device: !!v.allow_remembered_device
      });
      var payload = {
        role_id: existing ? existing.role_id : v.role_id,
        required: !!v.required,
        required_aal_level: parseInt(v.required_aal_level,10) || 2,
        min_factors: parseInt(v.min_factors,10) || 1,
        reauth_after_minutes: parseInt(v.reauth_after_minutes,10) || 0,
        grace_period_days: parseInt(v.grace_period_days,10) || 0,
        apply_to_admin_only: !!v.apply_to_admin_only,
        allowed_factor_types: newAllowed,
        metadata: newMeta
      };
      var p = existing
        ? UI.runtime.update('core_system','mfa_policy', existing.role_id, payload, existing.row_version)
        : UI.runtime.create('core_system','mfa_policy', payload);
      p.then(function(){
        UI.audit(existing ? 'mfa.policy.update':'mfa.policy.create', { role_id: payload.role_id, required_aal_level: payload.required_aal_level });
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        fetchRolePolicies().then(function(){ renderMfaPolicies(hostEl); });
      }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
    });
  }

  function renderMfaCompliance(el){
    var search = '';
    var statusFilter = 'all';
    function rerender(){
      var byUser = {};
      state.userFactors.forEach(function(f){ (byUser[f.user_id] = byUser[f.user_id] || []).push(f); });
      // mfa_policy is keyed by role_id; we still join via role_code for users so
      // build a role_code → policy map by joining through state.roles.
      var rolesByIdLocal = {};
      state.roles.forEach(function(r){ if (r.role_id) rolesByIdLocal[r.role_id] = r; });
      var policiesByRole = {};
      state.rolePolicies.forEach(function(p){
        var r = rolesByIdLocal[p.role_id];
        var code = r ? r.role_code : (p.role_code || p.role_id);
        if (code) policiesByRole[code] = p;
      });
      var rows = state.users.map(function(u){
        var policy = policiesByRole[u.role_code] || policiesByRole[u.role];
        var requiredAal = policy ? (policy.required_aal_level||1) : 1;
        var factors = byUser[u.id] || byUser[u.username] || [];
        var maxAal = factors.reduce(function(m,f){ return Math.max(m, f.aal||1); }, factors.length ? 1 : 0);
        var compliant = maxAal >= requiredAal;
        return { user:u, factors:factors, requiredAal:requiredAal, maxAal:maxAal, compliant:compliant };
      });
      rows = rows.filter(function(r){
        if (statusFilter === 'compliant' && !r.compliant) return false;
        if (statusFilter === 'noncompliant' && r.compliant) return false;
        if (!search) return true;
        var hay = ((r.user.full_name||'')+' '+(r.user.username||'')+' '+(r.user.email||'')+' '+(r.user.role_code||'')).toLowerCase();
        return hay.indexOf(search.toLowerCase()) >= 0;
      });
      var head = UI.panelHeader(
        t('User MFA compliance','Tình trạng tuân thủ MFA'),
        t('Each user is checked against their role policy.','Đối chiếu mỗi user với chính sách của vai trò.'),
        UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'mfa-comp-refresh' })
      );
      var kpi = UI.kpiRow([
        UI.kpiCard(t('Users','User'), rows.length, '', 'info'),
        UI.kpiCard(t('Compliant','Đạt'), rows.filter(function(r){ return r.compliant; }).length, '', 'ok'),
        UI.kpiCard(t('Non-compliant','Chưa đạt'), rows.filter(function(r){ return !r.compliant; }).length, '', rows.filter(function(r){ return !r.compliant; }).length ? 'warn' : 'muted'),
        UI.kpiCard(t('Total factors','Tổng yếu tố'), state.userFactors.length, '', 'muted')
      ]);
      var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
        + '<input type="search" id="mfa-c-search" placeholder="'+esc(t('Search user / role…','Tìm user / vai trò…'))+'" value="'+UI.escapeAttr(search)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:240px">'
        + '<select id="mfa-c-status" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
        +   '<option value="all">'+esc(t('All status','Tất cả'))+'</option>'
        +   '<option value="compliant"'+(statusFilter==='compliant'?' selected':'')+'>'+esc(t('Compliant','Đạt'))+'</option>'
        +   '<option value="noncompliant"'+(statusFilter==='noncompliant'?' selected':'')+'>'+esc(t('Non-compliant','Chưa đạt'))+'</option>'
        + '</select>'
        + '</div>';
      var columns = [
        { key:'user', label:t('User','Người dùng'), render:function(r){
            return '<div style="font-weight:500">'+esc(r.user.full_name||r.user.username||'')+'</div>'
              + '<div style="font-size:11px;color:var(--text-3)">'+esc(r.user.username||'')+(r.user.email?' · '+esc(r.user.email):'')+'</div>';
          } },
        { key:'role', label:t('Role','Vai trò'), width:'140px', render:function(r){ return esc(r.user.role_code||r.user.role||'—'); } },
        { key:'factors', label:t('Factors enrolled','Yếu tố đã đăng ký'), render:function(r){
            if (!r.factors.length) return '<span style="color:var(--text-3)">—</span>';
            return r.factors.map(function(f){
              var tone = f.is_active === false ? 'muted' : (f.aal>=3?'block':(f.aal===2?'warn':'info'));
              return badge((f.factor_type||'totp').toUpperCase()+' AAL'+(f.aal||1), tone);
            }).join(' ');
          } },
        { key:'compliance', label:t('Compliance','Tuân thủ'), width:'140px', render:function(r){
            return r.compliant ? badge(t('Compliant','Đạt'),'ok')
              : badge(t('Below AAL'+r.requiredAal,'Dưới AAL'+r.requiredAal),'block');
          } },
        { key:'actions', label:'', width:'170px', render:function(r){
            return '<div style="display:flex;gap:4px;flex-wrap:wrap">'
              + (r.factors.length ? '<button class="btn-admin secondary sm" data-revoke-factor="'+UI.escapeAttr(r.user.id||r.user.username)+'">'+esc(t('Revoke factor','Thu hồi'))+'</button>' : '')
              + (r.factors.length ? '<button class="btn-admin secondary sm" data-reset-factors="'+UI.escapeAttr(r.user.id||r.user.username)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Reset all','Reset tất cả'))+'</button>' : '')
              + '</div>';
          } }
      ];
      el.innerHTML = head + kpi + toolbar;
      el.appendChild(UI.buildTable(columns, rows, { rowKey:function(r){ return r.user.id||r.user.username; }, emptyMessage:t('No users match','Không có user khớp') }));
      el.querySelector('#mfa-comp-refresh').addEventListener('click', function(){ Promise.all([fetchUsers(),fetchUserFactors(),fetchRolePolicies()]).then(rerender); });
      el.querySelector('#mfa-c-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 220));
      el.querySelector('#mfa-c-status').addEventListener('change', function(e){ statusFilter = e.target.value; rerender(); });
      Array.prototype.forEach.call(el.querySelectorAll('[data-revoke-factor]'), function(b){
        b.addEventListener('click', function(){
          var uid = b.getAttribute('data-revoke-factor');
          var userFactors = state.userFactors.filter(function(f){ return String(f.user_id) === uid; });
          if (!userFactors.length){ UI.toast(t('No factor to revoke','Không có yếu tố nào'),'info'); return; }
          openRevokeFactorDialog(uid, userFactors, rerender);
        });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-reset-factors]'), function(b){
        b.addEventListener('click', function(){
          var uid = b.getAttribute('data-reset-factors');
          UI.confirmDestructive({
            title: t('Reset all MFA factors','Reset toàn bộ yếu tố MFA'),
            message: t('User will be forced to re-enroll. Use this for lost-device recovery.',
                       'User sẽ phải đăng ký lại. Dùng khi mất thiết bị.'),
            requireReason: true,
            confirmLabel: t('Reset all','Reset tất cả'),
            requireText: 'RESET'
          }).then(function(r){
            if (!r||!r.confirmed) return;
            UI.fetchJson('/api/v1/mfa/factors:reset', { method:'POST', body:{ user_id: uid, reason: r.reason } })
              .then(function(){
                UI.audit('mfa.factor.reset_all', { user_id: uid, reason: r.reason });
                UI.toast(t('All factors reset','Đã reset tất cả'),'warn');
                fetchUserFactors().then(rerender);
              }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
          });
        });
      });
    }
    rerender();
  }

  function openRevokeFactorDialog(userId, factors, refresh){
    var fields = [
      { key:'factor_id', label:t('Factor to revoke','Yếu tố cần thu hồi'), type:'select', required:true,
        options: factors.map(function(f){ return { value:f.id, label:(f.factor_type||'').toUpperCase()+' · AAL'+(f.aal||1)+' · '+(f.label||f.id) }; }) },
      { key:'reason', label:t('Reason (audit)','Lý do (nhật ký)'), type:'textarea', rows:3, required:true }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title:t('Revoke MFA factor','Thu hồi yếu tố MFA'), bodyEl:form.el, width:'520px',
      footerHtml:'<button class="btn-admin secondary" id="rf-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="rf-go" style="background:var(--red-dark,#991b1b);color:#fff">'+esc(t('Revoke','Thu hồi'))+'</button>'
    });
    modal.card.querySelector('#rf-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#rf-go').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.factor_id || !v.reason) return;
      UI.fetchJson('/api/v1/mfa/factors/'+encodeURIComponent(v.factor_id)+':revoke', {
        method:'POST', body:{ user_id:userId, reason:v.reason }
      }).then(function(){
        UI.audit('mfa.factor.revoke', { user_id:userId, factor_id:v.factor_id, reason:v.reason });
        UI.toast(t('Factor revoked','Đã thu hồi yếu tố'),'ok');
        modal.close();
        fetchUserFactors().then(refresh);
      }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab — Effective documents
  // ════════════════════════════════════════════════════════════════════════════
  function renderEffectiveDocs(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchDocs(), fetchAcknowledgements(), fetchUsers()]).then(function(){
      UI.renderSubTabs(rootEl, [
        { key:'list', label:t('Document list','Danh sách tài liệu'), render:renderEffectiveDocList },
        { key:'ack', label:t('Acknowledgements','Xác nhận đọc'), render:renderAcknowledgements }
      ], {});
    }).catch(function(err){ rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderEffectiveDocs(rootEl); }); });
  }

  function renderEffectiveDocList(el){
    var statusFilter = 'all';
    var search = '';
    function rerender(){
      var rows = state.docs.filter(function(d){
        if (statusFilter !== 'all' && (d.status||d.lifecycle_state) !== statusFilter) return false;
        if (!search) return true;
        var hay = ((d.doc_code||'')+' '+(d.title_vi||'')+' '+(d.title||'')+' '+(d.owner_role||'')).toLowerCase();
        return hay.indexOf(search.toLowerCase()) >= 0;
      });
      var head = UI.panelHeader(
        t('Effective documents','Tài liệu hiệu lực'),
        t('Promote draft → effective and trigger acknowledgement campaigns (21 CFR Part 11 §11.10).',
          'Phát hành tài liệu draft → effective và mở chiến dịch xác nhận đọc (21 CFR Part 11).'),
        UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'ed-refresh' })
      );
      var kpi = UI.kpiRow([
        UI.kpiCard(t('Total','Tổng'), state.docs.length, '', 'info'),
        UI.kpiCard(t('Effective','Hiệu lực'), state.docs.filter(function(d){ return (d.status||d.lifecycle_state)==='effective'; }).length, '', 'ok'),
        UI.kpiCard(t('Draft','Bản nháp'), state.docs.filter(function(d){ return (d.status||d.lifecycle_state)==='draft'; }).length, '', 'warn'),
        UI.kpiCard(t('Retired','Thu hồi'), state.docs.filter(function(d){ return (d.status||d.lifecycle_state)==='retired'; }).length, '', 'muted')
      ]);
      var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
        + '<input type="search" id="ed-search" placeholder="'+esc(t('Search code / title / owner…','Tìm mã / tiêu đề / chủ sở hữu…'))+'" value="'+UI.escapeAttr(search)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:280px">'
        + '<select id="ed-status" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
        +   '<option value="all">'+esc(t('All status','Tất cả trạng thái'))+'</option>'
        +   '<option value="draft"'+(statusFilter==='draft'?' selected':'')+'>'+esc(t('Draft','Nháp'))+'</option>'
        +   '<option value="effective"'+(statusFilter==='effective'?' selected':'')+'>'+esc(t('Effective','Hiệu lực'))+'</option>'
        +   '<option value="retired"'+(statusFilter==='retired'?' selected':'')+'>'+esc(t('Retired','Thu hồi'))+'</option>'
        + '</select>'
        + '</div>';
      var columns = [
        { key:'doc_code', label:t('Code','Mã'), width:'180px', render:function(d){ return '<code style="font-size:12px">'+esc(d.doc_code||'')+'</code>'+(d.revision?' <span style="color:var(--text-3);font-size:11px">v'+esc(d.revision)+'</span>':''); } },
        { key:'title', label:t('Title','Tiêu đề'), render:function(d){
            return '<div style="font-weight:500">'+esc(d.title_vi||d.title||'')+'</div>'
              + '<div style="font-size:11px;color:var(--text-3)">'+esc(d.title||'')+'</div>';
          } },
        { key:'owner_role', label:t('Owner','Chủ sở hữu'), width:'140px', render:function(d){ return esc(d.owner_role||'—'); } },
        { key:'effective_date', label:t('Effective','Có hiệu lực'), width:'120px', render:function(d){ return d.effective_date ? '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc(d.effective_date.slice(0,10))+'</span>' : '<span style="color:var(--text-3)">—</span>'; } },
        { key:'status', label:t('Status','Trạng thái'), width:'120px', render:function(d){
            var s = d.status||d.lifecycle_state||'draft';
            return badge(s, s==='effective'?'ok':(s==='draft'?'warn':(s==='retired'?'muted':'info')));
          } },
        { key:'actions', label:'', width:'200px', render:function(d){
            var s = d.status||d.lifecycle_state;
            var actions = [];
            if (s === 'draft') actions.push('<button class="btn-admin sm" data-promote="'+UI.escapeAttr(d.id)+'">'+esc(t('Promote','Phát hành'))+'</button>');
            if (s === 'effective') actions.push('<button class="btn-admin secondary sm" data-ack-campaign="'+UI.escapeAttr(d.id)+'">'+esc(t('Open ack campaign','Mở xác nhận'))+'</button>');
            if (s === 'effective') actions.push('<button class="btn-admin secondary sm" data-retire="'+UI.escapeAttr(d.id)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Retire','Thu hồi'))+'</button>');
            return '<div style="display:flex;gap:4px;flex-wrap:wrap">'+actions.join('')+'</div>';
          } }
      ];
      el.innerHTML = head + kpi + toolbar;
      el.appendChild(UI.buildTable(columns, rows, { rowKey:'id', emptyMessage:t('No documents match','Không có tài liệu khớp') }));
      el.querySelector('#ed-refresh').addEventListener('click', function(){ fetchDocs().then(rerender); });
      el.querySelector('#ed-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 220));
      el.querySelector('#ed-status').addEventListener('change', function(e){ statusFilter = e.target.value; rerender(); });
      Array.prototype.forEach.call(el.querySelectorAll('[data-promote]'), function(b){
        b.addEventListener('click', function(){ openPromoteDialog(state.docs.find(function(d){ return String(d.id)===b.getAttribute('data-promote'); }), rerender); });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-retire]'), function(b){
        b.addEventListener('click', function(){
          var d = state.docs.find(function(x){ return String(x.id)===b.getAttribute('data-retire'); });
          UI.confirmDestructive({
            title:t('Retire document','Thu hồi tài liệu'),
            message:t('This document will become inactive. New users will not see it.',
                      'Tài liệu sẽ ngừng hiệu lực. User mới sẽ không thấy.'),
            requireText: d.doc_code, requireReason:true
          }).then(function(r){
            if (!r||!r.confirmed) return;
            UI.runtime.update('document_control','dcc_document_header', d.id, { status:'retired' }, d.row_version)
              .then(function(){
                UI.audit('document.retire', { id:d.id, doc_code:d.doc_code, reason:r.reason });
                UI.toast(t('Retired','Đã thu hồi'),'ok');
                fetchDocs().then(rerender);
              }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
          });
        });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-ack-campaign]'), function(b){
        b.addEventListener('click', function(){ openAckCampaignDialog(state.docs.find(function(d){ return String(d.id)===b.getAttribute('data-ack-campaign'); })); });
      });
    }
    rerender();
  }

  function openPromoteDialog(doc, refresh){
    var fields = [
      { key:'effective_date', label:t('Effective date','Ngày có hiệu lực'), required:true, placeholder:'2026-05-15',
        value: new Date().toISOString().slice(0,10) },
      { key:'revision', label:t('Revision (e.g. 1.0, 2.1)','Phiên bản (vd 1.0, 2.1)'), required:true, value:doc.revision || '1.0' },
      { key:'training_required', label:t('Require acknowledgement','Bắt buộc xác nhận'), type:'checkbox', value:true,
        checkboxLabel:t('Open acknowledgement campaign immediately','Mở chiến dịch xác nhận ngay sau khi phát hành') },
      { key:'reason', label:t('Promotion reason / change summary','Căn cứ phát hành / tóm tắt thay đổi'), type:'textarea', rows:3, required:true }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: t('Promote draft → effective','Phát hành: nháp → hiệu lực') + ' · ' + (doc.doc_code||''),
      bodyEl: form.el, width:'560px',
      footerHtml:'<button class="btn-admin secondary" id="pr-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="pr-go">'+esc(t('Promote','Phát hành'))+'</button>'
    });
    modal.card.querySelector('#pr-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#pr-go').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.effective_date || !v.revision || !v.reason) return;
      // Map back to DCC schema: status='approved' (= effective in DCC vocab)
      var payload = { status:'approved', effective_date: v.effective_date, revision: v.revision };
      UI.runtime.update('document_control','dcc_document_header', doc.id, payload, doc.row_version).then(function(){
        UI.audit('document.promote', { id:doc.id, doc_code:doc.doc_code, payload:payload });
        UI.toast(t('Promoted','Đã phát hành'),'ok');
        modal.close();
        fetchDocs().then(refresh);
        if (v.training_required) openAckCampaignDialog(doc);
      }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
    });
  }

  function openAckCampaignDialog(doc){
    var fields = [
      { key:'audience_kind', label:t('Audience','Đối tượng'), type:'select', required:true, value:'role',
        options:[
          { value:'role', label:t('Role(s)','Vai trò') },
          { value:'dept', label:t('Department(s)','Phòng ban') },
          { value:'all', label:t('All active users','Tất cả user đang hoạt động') }
        ] },
      { key:'audience_value', label:t('Audience value (comma-separated codes)','Mã đối tượng (cách nhau dấu phẩy)'),
        placeholder:'qa_manager, qa_engineer', hint:t('Leave blank if "all"','Để trống nếu chọn "tất cả"') },
      { key:'deadline', label:t('Deadline (ISO date)','Hạn chót (ISO date)'), required:true,
        placeholder:'2026-06-30', value:new Date(Date.now()+30*86400000).toISOString().slice(0,10) },
      { key:'message', label:t('Message to recipients (VN)','Thông điệp tới user (Tiếng Việt có dấu)'), type:'textarea', rows:3, required:true }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title:t('Open acknowledgement campaign','Mở chiến dịch xác nhận đọc')+' · '+(doc.doc_code||''),
      bodyEl: form.el, width:'600px',
      footerHtml:'<button class="btn-admin secondary" id="ac-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="ac-go">'+esc(t('Open campaign','Mở chiến dịch'))+'</button>'
    });
    modal.card.querySelector('#ac-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#ac-go').addEventListener('click', function(){
      var v = form.getValues();
      var payload = {
        doc_id: doc.id, doc_code: doc.doc_code,
        audience_kind: v.audience_kind,
        audience_value: v.audience_value || '*',
        deadline: v.deadline,
        message: v.message,
        opened_at: new Date().toISOString()
      };
      UI.runtime.create('core_system','document_ack_campaign', payload).then(function(){
        UI.audit('document.ack_campaign.open', payload);
        UI.toast(t('Campaign opened','Đã mở chiến dịch'),'ok');
        modal.close();
      }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
    });
  }

  function renderAcknowledgements(el){
    var search = '';
    function rerender(){
      var rows = state.acknowledgements.filter(function(a){
        if (!search) return true;
        var hay = ((a.doc_code||'')+' '+(a.user_id||'')+' '+(a.signature_method||'')).toLowerCase();
        return hay.indexOf(search.toLowerCase()) >= 0;
      });
      var head = UI.panelHeader(
        t('Document acknowledgements','Xác nhận đọc tài liệu'),
        t('Records of users acknowledging effective documents (HMAC-signed, 21 CFR Part 11 §11.10(c)).',
          'Lưu vết user xác nhận đã đọc tài liệu hiệu lực (ký HMAC, 21 CFR Part 11).'),
        UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'ack-refresh' })
        + UI.btn(t('Export CSV','Xuất CSV'),{ icon:'📤', kind:'secondary', id:'ack-export' })
      );
      var columns = [
        { key:'created_at', label:t('Signed at','Thời điểm ký'), width:'160px', render:function(a){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc((a.created_at||'').slice(0,19).replace('T',' '))+'</span>'; } },
        { key:'doc_code', label:t('Document','Tài liệu'), width:'200px', render:function(a){ return '<code style="font-size:11px">'+esc(a.doc_code||'')+'</code>'+(a.revision?' v'+esc(a.revision):''); } },
        { key:'user', label:t('User','User'), render:function(a){
            var u = state.users.find(function(x){ return String(x.id)===String(a.user_id) || x.username===a.user_id; });
            return esc((u && (u.full_name||u.username)) || a.user_id || '—');
          } },
        { key:'signature_method', label:t('Method','Phương thức'), width:'120px', render:function(a){ return badge(a.signature_method || 'hmac', 'info'); } },
        { key:'hmac', label:t('Signature (truncated)','Chữ ký (rút gọn)'), render:function(a){
            var sig = a.signature_hmac || a.hmac || '';
            return '<span style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-3)">'+esc(sig.slice(0,32))+(sig.length > 32 ? '…' : '')+'</span>';
          } }
      ];
      el.innerHTML = head + '<div style="margin-bottom:12px"><input type="search" id="ack-search" placeholder="'+esc(t('Search…','Tìm…'))+'" value="'+UI.escapeAttr(search)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:280px"></div>';
      el.appendChild(UI.buildTable(columns, rows, { rowKey:'id', emptyMessage:t('No acknowledgements','Chưa có xác nhận nào') }));
      el.querySelector('#ack-refresh').addEventListener('click', function(){ fetchAcknowledgements().then(rerender); });
      el.querySelector('#ack-export').addEventListener('click', function(){
        var csv = 'created_at,doc_code,revision,user_id,signature_method,signature_hmac\n' + rows.map(function(a){
          return [a.created_at,a.doc_code,a.revision,a.user_id,a.signature_method,a.signature_hmac].map(function(x){ return '"'+String(x||'').replace(/"/g,'""')+'"'; }).join(',');
        }).join('\n');
        var blob = new Blob([csv],{type:'text/csv'});
        var a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='document-acknowledgements-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
        UI.audit('document.ack.export', { count: rows.length });
      });
      el.querySelector('#ack-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 220));
    }
    rerender();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab — Retention
  // ════════════════════════════════════════════════════════════════════════════
  function renderRetention(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchRetentionPolicies(), fetchLegalHolds(), fetchDisposalQueue(), fetchUsers()]).then(function(){
      UI.renderSubTabs(rootEl, [
        { key:'policies', label:t('Policies','Chính sách lưu trữ'), render:renderRetentionPolicies },
        { key:'queue', label:t('Disposal queue','Hàng đợi tiêu huỷ'), render:renderDisposalQueue },
        { key:'holds', label:t('Legal holds','Lệnh giữ pháp lý'), render:renderLegalHolds }
      ], {});
    }).catch(function(err){ rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderRetention(rootEl); }); });
  }

  function renderRetentionPolicies(el){
    var head = UI.panelHeader(
      t('Retention policies','Chính sách lưu trữ'),
      t('Per-record-class retention requirements (Vietnam Archives Law 2011, GDPR Art. 5(1)(e)).',
        'Yêu cầu lưu trữ theo từng loại hồ sơ (Luật Lưu trữ 2011, GDPR Điều 5).'),
      UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'rp-refresh' })
      + UI.btn(t('New policy','Chính sách mới'),{ icon:'＋', id:'rp-new' })
    );
    var columns = [
      { key:'policy_code', label:t('Record class','Loại hồ sơ'), render:function(p){
          return '<div style="font-weight:500">'+esc(p.label_vi||p.label||p.policy_code||'')+'</div>'
            + '<div style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-3)">'+esc(p.policy_code||p.record_class||'')+'</div>';
        } },
      { key:'retention_period_years', label:t('Retain for','Thời gian lưu'), width:'140px', render:function(p){
          var yrs = p.retention_period_years || p.retention_years;
          return '<span style="font-family:ui-monospace,monospace;font-size:13px;font-weight:600">'+esc(String(yrs||'—'))+t(' years',' năm')+'</span>';
        } },
      { key:'disposition_method', label:t('Disposal method','Phương pháp tiêu huỷ'), width:'160px', render:function(p){
          var m = p.disposition_method || p.disposal_method;
          return badge(m||'—', m==='shred'?'block':(m==='archive'?'info':'muted'));
        } },
      { key:'disposition_witness_required', label:t('Witness','Chứng kiến'), width:'110px', render:function(p){
          var w = p.disposition_witness_required != null ? p.disposition_witness_required : p.witness_required;
          return w ? badge(t('Required','Bắt buộc'),'warn') : badge(t('Optional','Không'),'muted');
        } },
      { key:'retention_basis', label:t('Basis','Căn cứ'), render:function(p){ return esc(p.retention_basis||p.legal_basis||'—'); } },
      { key:'actions', label:'', width:'150px', render:function(p){
          var pk = p.policy_code || p.id;
          return '<div style="display:flex;gap:4px"><button class="btn-admin secondary sm" data-edit-rp="'+UI.escapeAttr(pk)+'">'+esc(t('Edit','Sửa'))+'</button>'
            + '<button class="btn-admin secondary sm" data-del-rp="'+UI.escapeAttr(pk)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Remove','Xoá'))+'</button></div>';
        } }
    ];
    el.innerHTML = head;
    el.appendChild(UI.buildTable(columns, state.retentionPolicies, { rowKey:'policy_code', emptyMessage:t('No retention policies defined','Chưa có chính sách lưu trữ') }));
    el.querySelector('#rp-refresh').addEventListener('click', function(){ fetchRetentionPolicies().then(function(){ renderRetentionPolicies(el); }); });
    el.querySelector('#rp-new').addEventListener('click', function(){ openRetentionPolicyEditor(null, el); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-edit-rp]'), function(b){
      b.addEventListener('click', function(){ openRetentionPolicyEditor(state.retentionPolicies.find(function(p){ return String(p.policy_code||p.id)===b.getAttribute('data-edit-rp'); }), el); });
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-del-rp]'), function(b){
      b.addEventListener('click', function(){
        var pk = b.getAttribute('data-del-rp');
        var p = state.retentionPolicies.find(function(x){ return String(x.policy_code||x.id)===pk; });
        UI.confirmDestructive({ title:t('Remove retention policy','Xoá chính sách lưu trữ'), requireReason:true }).then(function(r){
          if (!r||!r.confirmed) return;
          UI.runtime.delete('master_data_governance','retention_policy', pk, p && p.row_version).then(function(){
            UI.audit('retention.policy.delete', { id:id, reason:r.reason });
            UI.toast(t('Removed','Đã xoá'),'ok');
            fetchRetentionPolicies().then(function(){ renderRetentionPolicies(el); });
          }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
        });
      });
    });
  }

  function openRetentionPolicyEditor(existing, hostEl){
    var fields = [
      { key:'record_class', label:t('Record class code','Mã loại hồ sơ'), required:true, disabled:!!existing,
        value: existing ? existing.record_class : '', placeholder:'qms.records.production' },
      { key:'label_vi', label:t('Label (VI with diacritics)','Tên hiển thị (Tiếng Việt có dấu)'), required:true,
        value: existing ? (existing.label_vi||'') : '' },
      { key:'retention_years', label:t('Retention years','Số năm lưu'), type:'number', min:1, max:50, required:true,
        value: existing ? (existing.retention_years||5) : 5 },
      { key:'disposal_method', label:t('Disposal method','Phương pháp tiêu huỷ'), type:'select', required:true,
        value: existing ? (existing.disposal_method||'shred') : 'shred',
        options:[
          { value:'shred', label:t('Shred — destroy beyond reconstruction','Cắt huỷ — không thể phục dựng') },
          { value:'archive', label:t('Archive — move to long-term storage','Lưu trữ — chuyển sang kho dài hạn') },
          { value:'anonymize', label:t('Anonymize — strip PII, keep aggregate','Ẩn danh — bỏ PII, giữ tổng hợp') }
        ] },
      { key:'witness_required', label:t('Witness signature required','Cần chữ ký chứng kiến'), type:'checkbox',
        value: existing ? !!existing.witness_required : true,
        checkboxLabel: t('Disposal must be witnessed by a second authorized actor','Tiêu huỷ phải có người thứ hai chứng kiến') },
      { key:'legal_basis', label:t('Legal basis (citation)','Căn cứ pháp lý (trích dẫn)'),
        value: existing ? (existing.legal_basis||'') : '', placeholder:'Vietnam Archives Law 2011 Art. 14, GDPR Art. 5(1)(e)' },
      { key:'description', label:t('Description','Mô tả'), type:'textarea', rows:2,
        value: existing ? (existing.description||'') : '' }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: existing ? t('Edit retention policy','Sửa chính sách lưu trữ') : t('New retention policy','Tạo chính sách lưu trữ'),
      bodyEl: form.el, width:'620px',
      footerHtml:'<button class="btn-admin secondary" id="rp-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="rp-save">'+esc(t('Save','Lưu'))+'</button>'
    });
    modal.card.querySelector('#rp-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#rp-save').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.record_class || !v.label_vi || !v.retention_years) return;
      var p = existing
        ? UI.runtime.update('master_data_governance','retention_policy', existing.id, v, existing.row_version)
        : UI.runtime.create('master_data_governance','retention_policy', v);
      p.then(function(){
        UI.audit(existing?'retention.policy.update':'retention.policy.create', v);
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        fetchRetentionPolicies().then(function(){ renderRetentionPolicies(hostEl); });
      }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
    });
  }

  function renderDisposalQueue(el){
    var head = UI.panelHeader(
      t('Disposal queue','Hàng đợi tiêu huỷ'),
      t('Records past their retention deadline. Disposal requires a witness signature and writes a chain-of-custody entry.',
        'Hồ sơ đã quá hạn lưu trữ. Tiêu huỷ phải có chứng kiến và ghi chuỗi giám hộ (chain-of-custody).'),
      UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'dq-refresh' })
    );
    var columns = [
      { key:'record_id', label:t('Record','Hồ sơ'), render:function(r){
          return '<div style="font-family:ui-monospace,monospace;font-size:11px">'+esc(r.record_id||r.id||'—')+'</div>'
            + '<div style="font-size:11px;color:var(--text-3)">'+esc(r.title_vi||r.title||r.label||'')+'</div>';
        } },
      { key:'record_class', label:t('Class','Loại'), width:'160px', render:function(r){ return esc(r.record_class||'—'); } },
      { key:'retention_until', label:t('Retain until','Đến hạn'), width:'140px', render:function(r){
          return '<span style="font-family:ui-monospace,monospace;font-size:11px;color:var(--red-dark,#991b1b)">'+esc((r.retention_until||'').slice(0,10))+'</span>';
        } },
      { key:'on_hold', label:t('Status','Trạng thái'), width:'140px', render:function(r){
          return r.on_hold ? badge(t('Legal hold','Bị giữ pháp lý'),'block') : badge(t('Eligible','Đủ điều kiện huỷ'),'warn');
        } },
      { key:'actions', label:'', width:'170px', render:function(r){
          if (r.on_hold) return '<span style="color:var(--text-3);font-size:11px">'+esc(t('Cannot dispose while on hold','Không thể huỷ khi đang giữ'))+'</span>';
          return '<button class="btn-admin sm" data-dispose="'+UI.escapeAttr(r.record_id||r.id)+'" style="background:var(--red-dark,#991b1b);color:#fff">'+esc(t('Dispose','Tiêu huỷ'))+'</button>';
        } }
    ];
    el.innerHTML = head;
    el.appendChild(UI.buildTable(columns, state.disposalQueue, { rowKey:'record_id', emptyMessage:t('Queue is empty','Không có hồ sơ nào đến hạn') }));
    el.querySelector('#dq-refresh').addEventListener('click', function(){ fetchDisposalQueue().then(function(){ renderDisposalQueue(el); }); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-dispose]'), function(b){
      b.addEventListener('click', function(){
        var rid = b.getAttribute('data-dispose');
        var rec = state.disposalQueue.find(function(x){ return String(x.record_id||x.id)===rid; });
        openDisposalDialog(rec);
      });
    });
  }

  function openDisposalDialog(rec){
    var fields = [
      { key:'method_used', label:t('Method used','Phương pháp dùng'), type:'select', required:true, value:'shred',
        options:[
          { value:'shred', label:t('Shred','Cắt huỷ') },
          { value:'archive', label:t('Archive','Lưu trữ dài hạn') },
          { value:'anonymize', label:t('Anonymize','Ẩn danh') }
        ] },
      { key:'witness_user', label:t('Witness user','User chứng kiến'), type:'select', required:true,
        options: state.users.filter(function(u){ return u.is_active !== false; }).map(function(u){ return { value:u.id||u.username, label:(u.full_name||u.username) }; }) },
      { key:'location', label:t('Location of disposal','Địa điểm tiêu huỷ'), placeholder:t('Office shredder, Hanoi','Máy huỷ giấy, văn phòng Hà Nội') },
      { key:'notes', label:t('Notes (chain-of-custody)','Ghi chú (chuỗi giám hộ)'), type:'textarea', rows:3, required:true }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: t('Dispose record','Tiêu huỷ hồ sơ') + ' · ' + (rec.record_id||rec.id||''),
      bodyEl: form.el, width:'600px',
      footerHtml:'<button class="btn-admin secondary" id="dz-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="dz-go" style="background:var(--red-dark,#991b1b);color:#fff">'+esc(t('Confirm disposal','Xác nhận tiêu huỷ'))+'</button>'
    });
    modal.card.querySelector('#dz-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#dz-go').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.witness_user || !v.notes) return;
      UI.confirmDestructive({
        title:t('Final confirmation','Xác nhận lần cuối'),
        message:t('This action permanently disposes the record. A chain-of-custody entry will be created with the witness signature.',
                  'Hồ sơ sẽ bị tiêu huỷ vĩnh viễn. Chuỗi giám hộ sẽ được ghi kèm chữ ký chứng kiến.'),
        requireText:'DISPOSE', requireReason:true
      }).then(function(r){
        if (!r||!r.confirmed) return;
        var payload = {
          record_id: rec.record_id||rec.id,
          method_used: v.method_used,
          witness_user_id: v.witness_user,
          location: v.location,
          notes: v.notes,
          actor_reason: r.reason,
          disposed_at: new Date().toISOString()
        };
        UI.fetchJson('/api/v1/retention/'+encodeURIComponent(payload.record_id)+':dispose', {
          method:'POST', body: payload
        }).then(function(){
          UI.audit('retention.dispose', payload);
          UI.toast(t('Disposed — chain-of-custody recorded','Đã tiêu huỷ — đã ghi chuỗi giám hộ'),'ok');
          modal.close();
          fetchDisposalQueue();
        }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
      });
    });
  }

  function renderLegalHolds(el){
    var head = UI.panelHeader(
      t('Legal holds','Lệnh giữ pháp lý'),
      t('Active holds suspend retention disposal until released by counsel.',
        'Lệnh giữ làm tạm dừng tiêu huỷ cho đến khi luật sư giải toả.'),
      UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'lh-refresh' })
      + UI.btn(t('Place hold','Đặt lệnh giữ'),{ icon:'＋', id:'lh-new' })
    );
    var columns = [
      { key:'case_ref', label:t('Case reference','Mã vụ việc'), render:function(h){ return '<code>'+esc(h.case_ref||'—')+'</code>'; } },
      { key:'description', label:t('Description','Mô tả'), render:function(h){ return esc(h.description||''); } },
      { key:'placed_at', label:t('Placed','Đặt lúc'), width:'140px', render:function(h){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc((h.placed_at||'').slice(0,10))+'</span>'; } },
      { key:'released_at', label:t('Released','Giải toả'), width:'140px', render:function(h){
          return h.released_at ? '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc(h.released_at.slice(0,10))+'</span>' : badge(t('active','đang giữ'),'block');
        } },
      { key:'actions', label:'', width:'150px', render:function(h){
          if (h.released_at) return '<span style="color:var(--text-3);font-size:11px">'+esc(t('Released','Đã giải toả'))+'</span>';
          return '<button class="btn-admin secondary sm" data-release="'+UI.escapeAttr(h.id)+'">'+esc(t('Release hold','Giải toả'))+'</button>';
        } }
    ];
    el.innerHTML = head;
    el.appendChild(UI.buildTable(columns, state.legalHolds, { rowKey:'id', emptyMessage:t('No legal holds active','Không có lệnh giữ nào đang hoạt động') }));
    el.querySelector('#lh-refresh').addEventListener('click', function(){ fetchLegalHolds().then(function(){ renderLegalHolds(el); }); });
    el.querySelector('#lh-new').addEventListener('click', function(){ openLegalHoldEditor(null, el); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-release]'), function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-release');
        var h = state.legalHolds.find(function(x){ return String(x.id)===id; });
        UI.confirmDestructive({ title:t('Release legal hold','Giải toả lệnh giữ'), requireReason:true }).then(function(r){
          if (!r||!r.confirmed) return;
          UI.runtime.update('core_system','legal_hold', id, { released_at: new Date().toISOString(), release_reason: r.reason }, h && h.row_version)
            .then(function(){
              UI.audit('legal_hold.release', { id:id, reason:r.reason });
              UI.toast(t('Released','Đã giải toả'),'ok');
              fetchLegalHolds().then(function(){ renderLegalHolds(el); });
            }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
        });
      });
    });
  }

  function openLegalHoldEditor(existing, hostEl){
    var fields = [
      { key:'case_ref', label:t('Case reference','Mã vụ việc'), required:true, value: existing ? existing.case_ref : '' },
      { key:'description', label:t('Description / scope','Mô tả / phạm vi'), type:'textarea', rows:3, required:true,
        value: existing ? (existing.description||'') : '' },
      { key:'record_class_filter', label:t('Record class filter (comma-separated)','Lọc loại hồ sơ (cách nhau dấu phẩy)'),
        value: existing ? (existing.record_class_filter||'') : '',
        hint: t('Leave blank to hold all records','Để trống = giữ tất cả loại hồ sơ') },
      { key:'placed_by', label:t('Placed by (legal counsel)','Người đặt (luật sư)'), required:true,
        value: existing ? (existing.placed_by||'') : '' }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: existing ? t('Edit legal hold','Sửa lệnh giữ') : t('Place legal hold','Đặt lệnh giữ'),
      bodyEl: form.el, width:'600px',
      footerHtml:'<button class="btn-admin secondary" id="lh-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="lh-save">'+esc(t('Save','Lưu'))+'</button>'
    });
    modal.card.querySelector('#lh-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#lh-save').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.case_ref || !v.description || !v.placed_by) return;
      v.placed_at = existing ? existing.placed_at : new Date().toISOString();
      var p = existing
        ? UI.runtime.update('core_system','legal_hold', existing.id, v, existing.row_version)
        : UI.runtime.create('core_system','legal_hold', v);
      p.then(function(){
        UI.audit(existing?'legal_hold.update':'legal_hold.place', v);
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        fetchLegalHolds().then(function(){ renderLegalHolds(hostEl); });
      }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
    });
  }

  // ── Public dispatcher ───────────────────────────────────────────────────────
  window._renderAdminContentTab = function(rootEl, slug){
    if (slug === 'mfa') return renderMfa(rootEl);
    if (slug === 'effective_docs') return renderEffectiveDocs(rootEl);
    if (slug === 'retention') return renderRetention(rootEl);
    rootEl.innerHTML = UI.errorHtml(t('Unknown tab: '+slug,'Tab không xác định: '+slug));
  };
})();
