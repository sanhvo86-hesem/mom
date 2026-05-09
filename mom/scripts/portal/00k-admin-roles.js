/* ============================================================================
 * Admin: Vai trò (Roles) — full CRUD + drawer detail + 5 sub-tabs
 * ----------------------------------------------------------------------------
 * Preserves the original grid features (filters, dept, status, members,
 * activate/deactivate, edit) and adds:
 *   - Modal-based create/edit (replaces prompt() chains)
 *   - Click-to-open drawer with 5 sub-tabs:
 *       1. Thành viên          — users assigned, add/remove
 *       2. Quyền (Permissions) — effective permissions matrix
 *       3. Tách trách nhiệm    — SoD conflicts + waivers
 *       4. Bảo mật MFA         — required factors per role
 *       5. Nhật ký              — recent role mutation audit trail
 *   - Bulk actions: clone role, copy permissions from another role
 *
 * Backend tables: core_system.roles, role_permission, role_sod_conflict,
 * role_mfa_policy, audit_log. RBAC service endpoints used for assignments
 * and SoD checks.
 * ========================================================================== */

(function(){
  'use strict';
  if (!window.AdminUI) { console.error('[admin-roles] AdminUI not loaded'); return; }
  var UI = window.AdminUI;
  var t = UI.t, esc = UI.escapeHtml, badge = UI.badge;

  // ── Local state cache ───────────────────────────────────────────────────────
  var state = {
    roles: [],
    rolesById: {},
    permissionCatalog: [],
    rolePermissionsByRole: {},
    sodConflicts: [],
    mfaPolicy: [],
    users: [],
    filters: { search:'', dept:'', status:'all' }
  };

  // Unpack permissions JSONB on each role row into convenient view fields.
  // The legacy schema stores icon/color/level/admin inside permissions JSONB,
  // not as separate columns. Newer roles also have icon_emoji/badge_color_token
  // dedicated columns — we prefer those when present, fall back to the JSON.
  function decorateRole(r){
    var perms = r.permissions || {};
    if (typeof perms === 'string'){ try { perms = JSON.parse(perms); } catch(e){ perms = {}; } }
    r.permissions = perms;
    r._icon  = r.icon_emoji || perms.icon || '👤';
    r._color = r.badge_color_token || perms.color || 'var(--text-3,#9ca3af)';
    r._level = r.rank_level != null ? r.rank_level : (perms.level != null ? perms.level : null);
    r._admin = r.is_admin_tier != null ? r.is_admin_tier : !!perms.admin;
    return r;
  }
  function fetchAll(force){
    var p = [];
    if (force || !state.roles.length) p.push(UI.runtime.list('core_system','roles',{ limit:500 }).then(function(r){
      state.roles = ((r && r.data) || r || []).map(decorateRole);
      state.rolesById = {};
      state.roles.forEach(function(r){ state.rolesById[r.role_code] = r; });
    }));
    if (force || !state.permissionCatalog.length) p.push(UI.runtime.list('core_system','permission_catalog',{ limit:500 }).then(function(r){
      state.permissionCatalog = (r && r.data) || r || [];
    }));
    if (force || !state.sodConflicts.length) p.push(UI.runtime.list('core_system','role_sod_conflict',{ limit:500 }).then(function(r){
      state.sodConflicts = (r && r.data) || r || [];
    }).catch(function(){ state.sodConflicts = []; }));
    if (force || !state.mfaPolicy.length) p.push(UI.runtime.list('core_system','role_mfa_policy',{ limit:500 }).then(function(r){
      state.mfaPolicy = (r && r.data) || r || [];
    }).catch(function(){ state.mfaPolicy = []; }));
    // users — try runtime then fallback to existing global USERS
    if (force || !state.users.length){
      p.push(UI.runtime.list('core_system','users',{ limit:1000 }).then(function(r){
        state.users = (r && r.data) || r || [];
      }).catch(function(){
        state.users = (window.USERS || []).map(function(u){
          return { id:u.id, username:u.username, full_name:u.name, role_code:u.role, is_active:u.active!==false };
        });
      }));
    }
    return Promise.all(p);
  }

  // Roles store permissions as wildcard-aware pattern arrays:
  //   permissions.permissions: ["*.read","production.*"]   (grants)
  //   permissions.denies:      ["*.delete","core_system.*"] (denies — override)
  // We match catalog permission_code against patterns; clicking a cell adds
  // the EXACT code to the appropriate array (leaves wildcards intact).
  function patternMatch(pattern, code){
    if (!pattern || !code) return false;
    if (pattern === code || pattern === '*' || pattern === '*.*') return true;
    if (pattern.endsWith('.*')){
      var prefix = pattern.slice(0, -2);
      return code === prefix || code.indexOf(prefix + '.') === 0;
    }
    if (pattern.indexOf('*') >= 0){
      var re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*') + '$');
      return re.test(code);
    }
    return false;
  }
  function effectiveEffectForRole(role, code){
    var p = role && role.permissions || {};
    var denies = Array.isArray(p.denies) ? p.denies : [];
    var grants = Array.isArray(p.permissions) ? p.permissions : [];
    for (var i=0; i<denies.length; i++) if (patternMatch(denies[i], code)) return 'deny';
    for (var j=0; j<grants.length; j++) if (patternMatch(grants[j], code)) return 'grant';
    return null;
  }
  function loadRolePermissions(roleCode){
    var role = state.rolesById[roleCode];
    if (!role) return Promise.resolve([]);
    var rows = (state.permissionCatalog || []).map(function(p){
      return { permission_code: p.permission_code, effect: effectiveEffectForRole(role, p.permission_code), id: roleCode+'|'+p.permission_code };
    }).filter(function(r){ return r.effect; });
    state.rolePermissionsByRole[roleCode] = rows;
    return Promise.resolve(rows);
  }

  // Apply a single grant/deny/clear by mutating roles.permissions JSONB.
  // Auto-retry once on 409 (stale row_version) by re-fetching the role.
  function applyRolePermission(roleCode, permCode, effect /* 'grant' | 'deny' | null */){
    function attempt(role){
      var p = role.permissions || {};
      if (typeof p === 'string'){ try { p = JSON.parse(p); } catch(e){ p = {}; } }
      var grants = Array.isArray(p.permissions) ? p.permissions.slice() : [];
      var denies = Array.isArray(p.denies) ? p.denies.slice() : [];
      grants = grants.filter(function(x){ return x !== permCode; });
      denies = denies.filter(function(x){ return x !== permCode; });
      if (effect === 'grant') grants.push(permCode);
      else if (effect === 'deny') denies.push(permCode);
      var newPerms = Object.assign({}, p, { permissions: grants, denies: denies });
      var pk = role.role_id || role.role_code;
      return UI.runtime.update('core_system','roles', pk, { permissions: newPerms }, role.row_version)
        .then(function(resp){
          // GenericCrudController returns { ok, record: {...} }; sync local copy
          var rec = (resp && resp.record) || resp || {};
          var saved = rec.permissions;
          if (typeof saved === 'string'){ try { saved = JSON.parse(saved); } catch(e){ saved = newPerms; } }
          role.permissions = saved || newPerms;
          if (rec.row_version != null) role.row_version = rec.row_version;
          else if (role.row_version != null) role.row_version += 1;
          delete state.rolePermissionsByRole[roleCode];
          UI.audit('role.permissions.update', { role_code: roleCode, permission_code: permCode, effect: effect });
        });
    }
    var role = state.rolesById[roleCode];
    if (!role) return Promise.reject(new Error('Role not loaded'));
    return attempt(role).catch(function(err){
      var msg = String((err && err.message) || err);
      // 409 = optimistic concurrency conflict → re-fetch this role only and retry
      if (err && (err.status === 409 || /409|conflict|concurrency/i.test(msg))){
        return UI.runtime.list('core_system','roles', { limit: 500 }).then(function(r){
          var rows = r.data || [];
          var fresh = rows.find(function(x){ return x.role_code === roleCode; });
          if (fresh){
            // copy fresh data into in-memory role (preserve identity)
            role.permissions = fresh.permissions;
            if (typeof role.permissions === 'string'){ try { role.permissions = JSON.parse(role.permissions); } catch(e){} }
            role.row_version = fresh.row_version;
            return attempt(role);
          }
          throw err;
        });
      }
      throw err;
    });
  }

  // ── Filters ─────────────────────────────────────────────────────────────────
  function filteredRoles(){
    var f = state.filters;
    var needle = (f.search || '').toLowerCase().trim();
    return state.roles.filter(function(r){
      if (f.status === 'active' && r.is_active === false) return false;
      if (f.status === 'inactive' && r.is_active !== false) return false;
      if (f.dept && String(r.dept_code || '') !== String(f.dept)) return false;
      if (!needle) return true;
      var hay = [r.role_code, r.role_label, r.role_label_vi, r.dept_code, r.description].join(' ').toLowerCase();
      return hay.indexOf(needle) >= 0;
    });
  }

  function memberCount(roleCode){
    return state.users.filter(function(u){ return String(u.role_code||u.role) === String(roleCode) && u.is_active !== false; }).length;
  }

  function sodCountFor(roleCode){
    return state.sodConflicts.filter(function(c){
      return c.role_code_a === roleCode || c.role_code_b === roleCode;
    }).length;
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  function render(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    fetchAll(false).then(function(){
      var rows = filteredRoles();
      var depts = Array.from(new Set(state.roles.map(function(r){ return r.dept_code; }).filter(Boolean))).sort();
      var headerActions = ''
        + UI.btn(t('Refresh','Làm mới'), { icon:'🔄', kind:'secondary', id:'roles-refresh-btn' })
        + UI.btn(t('Clone role','Sao chép vai trò'), { icon:'⎘', kind:'secondary', id:'roles-clone-btn' })
        + UI.btn(t('Create role','Tạo vai trò'), { icon:'＋', id:'roles-create-btn' });
      var head = UI.panelHeader(
        t('Authoritative role catalog','Danh mục vai trò chính thống'),
        t('Sourced from core_system.roles. Click a row to open the role drawer.','Lấy từ core_system.roles. Bấm vào dòng để mở chi tiết vai trò.'),
        headerActions
      );

      var kpi = UI.kpiRow([
        UI.kpiCard(t('Roles','Vai trò'), state.roles.length, '', 'info'),
        UI.kpiCard(t('Active','Đang dùng'), state.roles.filter(function(r){ return r.is_active !== false; }).length, '', 'ok'),
        UI.kpiCard(t('Departments','Phòng ban'), depts.length, '', 'muted'),
        UI.kpiCard(t('SoD conflicts','Xung đột SoD'), state.sodConflicts.length, t('Across all roles','Tổng các vai trò'), state.sodConflicts.length ? 'warn' : 'muted')
      ]);

      var toolbar = ''
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
        +   UI.searchInput({ placeholder: t('Search role / code / member…','Tìm vai trò / mã / thành viên…') }).replace('class="adminui-search"', 'class="adminui-search" id="roles-search"')
        +   '<select id="roles-dept-filter" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;background:var(--surface-1,#fff)">'
        +     '<option value="">'+esc(t('All departments','Tất cả phòng ban'))+'</option>'
        +     depts.map(function(d){ return '<option value="'+UI.escapeAttr(d)+'"'+(state.filters.dept===d?' selected':'')+'>'+esc(d)+'</option>'; }).join('')
        +   '</select>'
        +   '<select id="roles-status-filter" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;background:var(--surface-1,#fff)">'
        +     '<option value="all">'+esc(t('All status','Tất cả trạng thái'))+'</option>'
        +     '<option value="active"'+(state.filters.status==='active'?' selected':'')+'>'+esc(t('Active','Đang dùng'))+'</option>'
        +     '<option value="inactive"'+(state.filters.status==='inactive'?' selected':'')+'>'+esc(t('Inactive','Ngừng dùng'))+'</option>'
        +   '</select>'
        +   '<div style="display:flex;align-items:center;font-size:11px;color:var(--text-3);margin-left:auto">'+rows.length+' / '+state.roles.length+' '+esc(t('roles shown','vai trò'))+'</div>'
        + '</div>';

      var columns = [
        { key:'icon', label:'', width:'44px', render:function(r){
            return '<div style="font-size:20px;text-align:center;line-height:1">'+esc(r._icon)+'</div>';
          } },
        { key:'role_label_vi', label:t('Role','Vai trò'), render:function(r){
            var nameStyle = r._color ? 'color:'+UI.escapeAttr(r._color)+';font-weight:600' : 'font-weight:600;color:var(--text-1)';
            return '<div style="'+nameStyle+'">'+esc(r.role_label_vi || r.role_label || r.role_code)+'</div>'
              + '<div style="font-size:11px;color:var(--text-3)">'+esc(r.role_label || r.role_code)+'</div>'
              + (r.description ? '<div style="font-size:11px;color:var(--text-3);margin-top:2px">'+esc(r.description)+'</div>' : '');
          } },
        { key:'role_code', label:'Code', width:'140px', render:function(r){
            return '<code style="font-size:11px;background:var(--surface-2,#f9fafb);padding:1px 6px;border-radius:3px;border:1px solid var(--border-1,#e5e7eb)">'+esc(r.role_code)+'</code>';
          } },
        { key:'dept_code', label:t('Dept','Phòng ban'), width:'90px', render:function(r){ return r.dept_code ? badge(r.dept_code,'info') : '<span style="color:var(--text-3)">—</span>'; } },
        { key:'rank_level', label:t('Level','Cấp'), width:'60px', render:function(r){
            return '<div style="text-align:center;font-weight:600">'+esc(String(r._level != null ? r._level : '—'))+'</div>';
          } },
        { key:'members', label:t('Members','Thành viên'), width:'90px', render:function(r){
            var n = memberCount(r.role_code);
            return '<div style="text-align:center">'+badge(String(n), n ? 'info' : 'muted')+'</div>';
          } },
        { key:'sod', label:t('SoD','Tách'), width:'70px', render:function(r){
            var n = sodCountFor(r.role_code);
            return '<div style="text-align:center">'+(n ? badge(String(n),'warn') : '<span style="color:var(--text-3)">—</span>')+'</div>';
          } },
        { key:'admin', label:t('Backend admin','Admin BE'), width:'90px', render:function(r){
            return '<div style="text-align:center">'+(r._admin ? '<span title="Immutable" style="font-size:14px">🔒</span>' : '<span style="color:var(--text-3)">—</span>')+'</div>';
          } },
        { key:'is_active', label:t('Status','Trạng thái'), width:'100px', render:function(r){
            return r.is_active !== false ? badge(t('active','đang dùng'),'ok') : badge(t('inactive','ngừng dùng'),'warn');
          } }
      ];

      var tableEl = UI.buildTable(columns, rows, {
        rowKey:'role_code',
        emptyMessage: t('No roles match the filter','Không có vai trò khớp bộ lọc'),
        onRowClick: function(row){ openRoleDrawer(row); }
      });

      rootEl.innerHTML = head + kpi + toolbar;
      rootEl.appendChild(tableEl);

      // wire up
      var search = rootEl.querySelector('#roles-search');
      var deptF = rootEl.querySelector('#roles-dept-filter');
      var statusF = rootEl.querySelector('#roles-status-filter');
      var rerender = UI.debounce(function(){ render(rootEl); }, 220);
      if (search) search.addEventListener('input', function(){ state.filters.search = search.value; rerender(); });
      if (deptF) deptF.addEventListener('change', function(){ state.filters.dept = deptF.value; render(rootEl); });
      if (statusF) statusF.addEventListener('change', function(){ state.filters.status = statusF.value; render(rootEl); });
      rootEl.querySelector('#roles-refresh-btn').addEventListener('click', function(){ fetchAll(true).then(function(){ render(rootEl); }); });
      rootEl.querySelector('#roles-create-btn').addEventListener('click', function(){ openRoleEditor(null, rootEl); });
      rootEl.querySelector('#roles-clone-btn').addEventListener('click', function(){ openCloneDialog(rootEl); });
    }).catch(function(err){
      rootEl.innerHTML = UI.errorHtml(err && err.message || err, function(){ render(rootEl); });
    });
  }

  // ── Role editor modal ───────────────────────────────────────────────────────
  function openRoleEditor(existing, hostEl){
    var isCreate = !existing;
    var fields = [
      { key:'role_code', label:t('Role code','Mã vai trò'), required:true, disabled:!isCreate, value: existing ? existing.role_code : '', placeholder:'qa_manager', hint:t('Lowercase, snake_case','Chữ thường, snake_case') },
      { key:'role_label_vi', label:t('Label (Vietnamese, with diacritics)','Tên hiển thị (Tiếng Việt có dấu)'), required:true, value: existing ? (existing.role_label_vi||'') : '' },
      { key:'role_label', label:t('Label (English)','Tên hiển thị (English)'), required:true, value: existing ? (existing.role_label||'') : '' },
      { key:'dept_code', label:t('Department code','Mã phòng ban'), value: existing ? (existing.dept_code||'') : '', placeholder:'QA, FIN, OPS…' },
      { key:'rank_level', label:t('Rank level (1=highest)','Cấp bậc (1=cao nhất)'), type:'number', min:1, max:9, value: existing ? (existing.rank_level || (existing.permissions && existing.permissions.level) || 4) : 4 },
      { key:'description', label:t('Description','Mô tả'), type:'textarea', rows:2, value: existing ? (existing.description||'') : '' },
      { key:'icon_emoji', label:t('Icon (emoji)','Biểu tượng (emoji)'),
        value: existing ? (existing._icon || existing.icon_emoji || (existing.permissions && existing.permissions.icon) || '👤') : '👤',
        hint:t('Single emoji character','Một ký tự emoji') },
      { key:'badge_color_token', label:t('Badge color (CSS variable)','Màu badge (biến CSS)'), type:'color',
        value: existing ? (existing._color || existing.badge_color_token || (existing.permissions && existing.permissions.color) || 'var(--brand-primary)') : 'var(--brand-primary)',
        hint:t('e.g. var(--brand-primary), var(--blue-dark)','ví dụ var(--brand-primary), var(--blue-dark)') },
      { key:'is_active', label:t('Active','Đang dùng'), type:'checkbox', value: existing ? (existing.is_active !== false) : true, checkboxLabel: t('Role is active','Vai trò đang được dùng') }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: isCreate ? t('Create role','Tạo vai trò') : (t('Edit role: ','Sửa vai trò: ') + (existing.role_label_vi || existing.role_code)),
      bodyEl: form.el,
      width:'620px',
      footerHtml: ''
        + '<button class="btn-admin secondary" id="role-editor-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="role-editor-save">'+esc(isCreate ? t('Create','Tạo') : t('Save changes','Lưu thay đổi'))+'</button>'
    });
    modal.card.querySelector('#role-editor-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#role-editor-save').addEventListener('click', function(){
      form.clearErrors();
      var v = form.getValues();
      if (!v.role_code || !/^[a-z][a-z0-9_]*$/.test(v.role_code)){
        form.setError('role_code', t('Use lowercase letters, digits and underscore only','Chỉ dùng chữ thường, số, gạch dưới'));
        return;
      }
      if (!v.role_label_vi) { form.setError('role_label_vi', t('Required','Bắt buộc')); return; }
      if (!v.role_label) { form.setError('role_label', t('Required','Bắt buộc')); return; }
      var btn = modal.card.querySelector('#role-editor-save');
      btn.disabled = true; btn.textContent = t('Saving…','Đang lưu…');
      // Mirror icon/color into permissions JSONB so legacy readers (perms.icon)
      // also see the change and the role icon stays consistent across views.
      if (existing && existing.permissions){
        var legacyPerms = Object.assign({}, existing.permissions);
        if (v.icon_emoji) legacyPerms.icon = v.icon_emoji;
        if (v.badge_color_token) legacyPerms.color = v.badge_color_token;
        if (v.rank_level != null) legacyPerms.level = v.rank_level;
        v.permissions = legacyPerms;
      }
      var p = isCreate
        ? UI.runtime.create('core_system','roles', v)
        : UI.runtime.update('core_system','roles', existing.role_id || existing.role_code, v, existing.row_version);
      p.then(function(saved){
        UI.toast(isCreate ? t('Role created','Đã tạo vai trò') : t('Role updated','Đã cập nhật vai trò'), 'ok');
        UI.audit(isCreate ? 'role.create' : 'role.update', { role_code: v.role_code, before: existing || null, after: v });
        modal.close();
        fetchAll(true).then(function(){ render(hostEl); });
      }).catch(function(err){
        UI.toast((err && err.message) || t('Save failed','Lưu thất bại'), 'block');
        btn.disabled = false; btn.textContent = isCreate ? t('Create','Tạo') : t('Save changes','Lưu thay đổi');
      });
    });
  }

  // ── Clone role dialog ───────────────────────────────────────────────────────
  function openCloneDialog(hostEl){
    var fields = [
      { key:'source_role', label:t('Copy from role','Sao chép từ vai trò'), type:'select', required:true,
        options: state.roles.map(function(r){ return { value:r.role_code, label:(r.role_label_vi||r.role_code)+' ('+r.role_code+')' }; }) },
      { key:'new_code', label:t('New role code','Mã vai trò mới'), required:true, placeholder:'qa_manager_v2' },
      { key:'new_label_vi', label:t('New label (VI with diacritics)','Tên mới (Tiếng Việt có dấu)'), required:true },
      { key:'new_label', label:t('New label (EN)','Tên mới (EN)'), required:true },
      { key:'copy_permissions', label:t('Copy permissions','Sao chép quyền'), type:'checkbox', value:true, checkboxLabel:t('Include all RBAC permissions','Bao gồm tất cả quyền RBAC') }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: t('Clone role','Sao chép vai trò'),
      bodyEl: form.el,
      width:'560px',
      footerHtml:
        '<button class="btn-admin secondary" id="clone-cancel">'+esc(t('Cancel','Huỷ'))+'</button>' +
        '<button class="btn-admin" id="clone-go">'+esc(t('Clone','Sao chép'))+'</button>'
    });
    modal.card.querySelector('#clone-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#clone-go').addEventListener('click', function(){
      var v = form.getValues();
      var source = state.rolesById[v.source_role];
      if (!source) { UI.toast(t('Source role not found','Không tìm thấy vai trò gốc'), 'block'); return; }
      var btn = modal.card.querySelector('#clone-go');
      btn.disabled = true; btn.textContent = t('Cloning…','Đang sao chép…');
      var payload = {
        role_code: v.new_code,
        role_label_vi: v.new_label_vi,
        role_label: v.new_label,
        dept_code: source.dept_code,
        rank_level: source.rank_level,
        description: source.description,
        icon_emoji: source.icon_emoji,
        badge_color_token: source.badge_color_token,
        is_active: true
      };
      // Carry source.permissions JSONB over to the new role on clone (if requested),
      // because permissions live on the roles row itself — not in a junction table.
      if (v.copy_permissions && source && source.permissions){
        var srcPerms = source.permissions;
        if (typeof srcPerms === 'string'){ try { srcPerms = JSON.parse(srcPerms); } catch(e){ srcPerms = {}; } }
        payload.permissions = srcPerms;
      }
      UI.runtime.create('core_system','roles', payload).then(function(){
        UI.audit('role.clone', { source: v.source_role, target: v.new_code, copy_permissions: !!v.copy_permissions });
        UI.toast(t('Role cloned','Đã sao chép vai trò'), 'ok');
        modal.close();
        fetchAll(true).then(function(){ render(hostEl); });
      }).catch(function(err){
        UI.toast((err && err.message) || t('Clone failed','Sao chép thất bại'), 'block');
        btn.disabled = false; btn.textContent = t('Clone','Sao chép');
      });
    });
  }

  // ── Drawer: role detail with 5 sub-tabs ─────────────────────────────────────
  function openRoleDrawer(role){
    decorateRole(role); // ensure _icon/_color/_level/_admin populated
    var titleHtml = role._icon + '  ' + (role.role_label_vi || role.role_code);
    var drawer = UI.openDrawer({ title: titleHtml, width:'720px' });
    drawer.bodyEl.innerHTML = ''
      + '<div style="margin-bottom:12px">'
      +   '<div style="font-size:14px;color:'+UI.escapeAttr(role._color || 'var(--text-1)')+';font-weight:600;margin-bottom:8px">'+esc(role.role_label || role.role_code)+'</div>'
      +   '<div style="display:flex;gap:6px;flex-wrap:wrap">'
      +     badge(role.role_code,'muted')
      +     (role.dept_code ? badge(role.dept_code,'info') : '')
      +     badge(t('Level ','Cấp ')+(role._level != null ? role._level : '—'),'muted')
      +     (role.is_active === false ? badge(t('inactive','ngừng dùng'),'warn') : badge(t('active','đang dùng'),'ok'))
      +     (role._admin ? badge('🔒 '+t('Admin tier','Cấp admin'),'block') : '')
      +   '</div>'
      +   (role.description ? '<div style="margin-top:8px;font-size:13px;color:var(--text-2);line-height:1.5">'+esc(role.description)+'</div>' : '')
      +   '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">'
      +     UI.btn(t('Edit role','Sửa vai trò'), { id:'drawer-edit-role', icon:'✎', kind:'secondary' })
      +     UI.btn(role.is_active === false ? t('Reactivate','Kích hoạt') : t('Deactivate','Ngừng dùng'), { id:'drawer-toggle-active', kind:'secondary' })
      +     (!role.is_admin_tier ? UI.btn(t('Delete','Xoá'), { id:'drawer-delete', kind:'danger' }) : '')
      +   '</div>'
      + '</div>'
      + '<div id="role-subtabs-host"></div>';

    drawer.bodyEl.querySelector('#drawer-edit-role').addEventListener('click', function(){
      drawer.close(); openRoleEditor(role, document.getElementById('admin-content'));
    });
    var toggleBtn = drawer.bodyEl.querySelector('#drawer-toggle-active');
    toggleBtn.addEventListener('click', function(){
      var now = role.is_active === false;
      UI.confirmDestructive({
        title: now ? t('Reactivate role','Kích hoạt vai trò') : t('Deactivate role','Ngừng sử dụng vai trò'),
        message: t(('You are about to '+(now?'reactivate':'deactivate')+' the role "'+ (role.role_label_vi||role.role_code) +'".'),
                   'Bạn sắp '+(now?'kích hoạt':'ngừng sử dụng')+' vai trò "'+(role.role_label_vi||role.role_code)+'".'),
        confirmLabel: now ? t('Reactivate','Kích hoạt') : t('Deactivate','Ngừng dùng'),
        requireReason: !now
      }).then(function(res){
        if (!res || !res.confirmed) return;
        UI.runtime.update('core_system','roles', role.role_id || role.role_code, { is_active: now }, role.row_version)
          .then(function(){
            UI.audit(now ? 'role.reactivate':'role.deactivate', { role_code: role.role_code, reason: res.reason || null });
            UI.toast(now ? t('Reactivated','Đã kích hoạt') : t('Deactivated','Đã ngừng dùng'), 'ok');
            drawer.close();
            fetchAll(true).then(function(){ render(document.getElementById('admin-content')); });
          })
          .catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'), 'block'); });
      });
    });
    var delBtn = drawer.bodyEl.querySelector('#drawer-delete');
    if (delBtn) delBtn.addEventListener('click', function(){
      var members = memberCount(role.role_code);
      if (members > 0){
        UI.toast(t('Cannot delete: '+members+' active member(s)','Không thể xoá: còn '+members+' thành viên đang hoạt động'), 'block');
        return;
      }
      UI.confirmDestructive({
        title: t('Delete role','Xoá vai trò'),
        message: t('This permanently deletes the role and its permission grants. This cannot be undone.',
                   'Sẽ xoá vĩnh viễn vai trò và các quyền đã cấp. Không thể hoàn tác.'),
        requireText: role.role_code,
        requireReason: true,
        confirmLabel: t('Delete','Xoá')
      }).then(function(res){
        if (!res || !res.confirmed) return;
        UI.runtime.delete('core_system','roles', role.role_id || role.role_code, role.row_version)
          .then(function(){
            UI.audit('role.delete', { role_code: role.role_code, reason: res.reason });
            UI.toast(t('Role deleted','Đã xoá vai trò'),'ok');
            drawer.close();
            fetchAll(true).then(function(){ render(document.getElementById('admin-content')); });
          })
          .catch(function(err){ UI.toast((err && err.message) || t('Delete failed','Xoá thất bại'), 'block'); });
      });
    });

    var subtabHost = drawer.bodyEl.querySelector('#role-subtabs-host');
    UI.renderSubTabs(subtabHost, [
      { key:'members', label:t('Members','Thành viên'), render:function(el){ renderMembersTab(el, role); } },
      { key:'perms', label:t('Permissions','Quyền'), render:function(el){ renderPermissionsTab(el, role); } },
      { key:'sod', label:t('SoD','Tách trách nhiệm'), render:function(el){ renderSodTab(el, role); } },
      { key:'mfa', label:t('MFA','Bảo mật MFA'), render:function(el){ renderMfaTab(el, role); } },
      { key:'audit', label:t('Audit','Nhật ký'), render:function(el){ renderAuditTab(el, role); } }
    ]);
  }

  // ── Sub-tab: Members ────────────────────────────────────────────────────────
  function renderMembersTab(el, role){
    var members = state.users.filter(function(u){ return String(u.role_code||u.role) === String(role.role_code); });
    var nonMembers = state.users.filter(function(u){ return String(u.role_code||u.role) !== String(role.role_code) && u.is_active !== false; });
    var html = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      +   '<div style="font-size:13px;color:var(--text-2)">'+members.length+' '+esc(t('member(s)','thành viên'))+'</div>'
      +   UI.btn(t('Assign user','Thêm thành viên'), { id:'add-member-btn', icon:'＋', kind:'secondary' })
      + '</div>';
    if (!members.length) html += UI.emptyHtml(t('No members assigned to this role','Vai trò này chưa có thành viên'));
    else {
      html += '<div style="display:flex;flex-direction:column;gap:6px">';
      members.forEach(function(u){
        html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--surface-2,#f9fafb);border:1px solid var(--border-1,#e5e7eb);border-radius:6px">'
          + '<div>'
          +   '<div style="font-weight:500;color:var(--text-1);font-size:13px">'+esc(u.full_name || u.username || u.id)+'</div>'
          +   '<div style="font-size:11px;color:var(--text-3)">'+esc(u.username || '')+(u.email ? ' · '+esc(u.email) : '')+'</div>'
          + '</div>'
          + '<div style="display:flex;gap:6px">'
          +   (u.is_active === false ? badge(t('inactive','ngừng'),'warn') : badge(t('active','active'),'ok'))
          +   '<button class="btn-admin secondary sm" data-revoke="'+UI.escapeAttr(u.id || u.username)+'">'+esc(t('Revoke','Thu hồi'))+'</button>'
          + '</div>'
          + '</div>';
      });
      html += '</div>';
    }
    el.innerHTML = html;
    var addBtn = el.querySelector('#add-member-btn');
    if (addBtn) addBtn.addEventListener('click', function(){ openAssignDialog(role, nonMembers, el); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-revoke]'), function(b){
      b.addEventListener('click', function(){
        var uid = b.getAttribute('data-revoke');
        UI.confirmDestructive({
          title: t('Revoke role','Thu hồi vai trò'),
          message: t('Remove user from this role?','Gỡ user khỏi vai trò này?'),
          requireReason: true
        }).then(function(res){
          if (!res || !res.confirmed) return;
          UI.fetchJson('/api/v1/rbac/role-assignments', {
            method:'DELETE',
            body:{ user_id: uid, role_code: role.role_code, reason: res.reason }
          }).then(function(){
            UI.audit('role.revoke', { user_id: uid, role_code: role.role_code, reason: res.reason });
            UI.toast(t('Revoked','Đã thu hồi'),'ok');
            fetchAll(true).then(function(){ renderMembersTab(el, role); });
          }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
        });
      });
    });
  }

  function openAssignDialog(role, candidates, hostEl){
    var fields = [
      { key:'user_id', label:t('User','Người dùng'), type:'select', required:true,
        options: candidates.map(function(u){ return { value:u.id || u.username, label:(u.full_name||u.username) + ' ('+(u.username||u.id)+')' }; }) },
      { key:'reason', label:t('Reason (audit)','Lý do (nhật ký)'), type:'textarea', rows:2 }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: t('Assign user to role','Thêm thành viên vào vai trò'),
      bodyEl: form.el,
      width:'480px',
      footerHtml:
        '<button class="btn-admin secondary" id="assign-cancel">'+esc(t('Cancel','Huỷ'))+'</button>' +
        '<button class="btn-admin" id="assign-ok">'+esc(t('Assign','Gán'))+'</button>'
    });
    modal.card.querySelector('#assign-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#assign-ok').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.user_id) { form.setError('user_id', t('Required','Bắt buộc')); return; }
      var btn = modal.card.querySelector('#assign-ok');
      btn.disabled = true; btn.textContent = t('Checking SoD…','Đang kiểm tra SoD…');
      UI.fetchJson('/api/v1/rbac/role-assignments', {
        method:'POST',
        body:{ user_id: v.user_id, role_code: role.role_code, reason: v.reason || null }
      }).then(function(res){
        if (res && res.sod_violation && !res.waived){
          // SoD blocked — show waiver flow
          btn.disabled = false; btn.textContent = t('Assign','Gán');
          var conflictMsg = (res.conflicts || []).map(function(c){ return c.role_code_a+' ↔ '+c.role_code_b+': '+c.description; }).join('\n');
          UI.confirmDestructive({
            title: t('SoD conflict — request waiver','Xung đột SoD — yêu cầu waiver'),
            message: t('Assigning this role triggers SoD conflict(s):\n','Gán vai trò này gây xung đột SoD:\n')+conflictMsg+t('\n\nProceed with waiver?','\n\nVẫn gán và ghi waiver?'),
            requireReason: true,
            confirmLabel: t('Waive & assign','Cấp waiver & gán')
          }).then(function(w){
            if (!w || !w.confirmed) return;
            UI.fetchJson('/api/v1/rbac/role-assignments', {
              method:'POST',
              body:{ user_id: v.user_id, role_code: role.role_code, reason: w.reason, waiveSod: true }
            }).then(function(){
              UI.audit('role.assign.waived', { user_id: v.user_id, role_code: role.role_code, reason: w.reason });
              UI.toast(t('Assigned with SoD waiver','Đã gán kèm waiver SoD'),'warn');
              modal.close(); fetchAll(true).then(function(){ renderMembersTab(hostEl, role); });
            }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
          });
          return;
        }
        UI.audit('role.assign', { user_id: v.user_id, role_code: role.role_code });
        UI.toast(t('Assigned','Đã gán'),'ok');
        modal.close(); fetchAll(true).then(function(){ renderMembersTab(hostEl, role); });
      }).catch(function(err){
        UI.toast((err && err.message) || t('Failed','Thất bại'),'block');
        btn.disabled = false; btn.textContent = t('Assign','Gán');
      });
    });
  }

  // ── Sub-tab: Permissions ────────────────────────────────────────────────────
  function renderPermissionsTab(el, role){
    el.innerHTML = UI.loadingHtml();
    loadRolePermissions(role.role_code).then(function(perms){
      var byCode = {}; perms.forEach(function(p){ byCode[p.permission_code] = p; });
      var groupBy = {};
      state.permissionCatalog.forEach(function(p){
        var grp = (p.permission_code || '').split('.')[0] || 'other';
        (groupBy[grp] = groupBy[grp] || []).push(p);
      });
      var groups = Object.keys(groupBy).sort();
      var html = ''
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +   '<div style="font-size:13px;color:var(--text-2)">'+perms.filter(function(p){ return (p.effect||'grant')==='grant'; }).length+' '+esc(t('granted','được cấp'))+' / '+state.permissionCatalog.length+' '+esc(t('total','tổng'))+'</div>'
        +   '<div style="display:flex;gap:6px">'
        +     UI.btn(t('Grant all','Cấp tất cả'), { id:'perm-grant-all', kind:'secondary' })
        +     UI.btn(t('Revoke all','Thu hồi tất cả'), { id:'perm-revoke-all', kind:'secondary' })
        +   '</div>'
        + '</div>';
      groups.forEach(function(grp){
        html += '<div style="margin-bottom:14px">'
          + '<div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-3);letter-spacing:0.04em;margin-bottom:6px">'+esc(grp)+'</div>'
          + '<div style="display:flex;flex-direction:column;gap:4px">';
        groupBy[grp].forEach(function(p){
          var current = byCode[p.permission_code];
          var effect = current && current.effect || null;
          var isGranted = effect === 'grant';
          var isDenied = effect === 'deny';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:'+(isGranted?'var(--green-light,#dcfce7)':(isDenied?'var(--red-light,#fee2e2)':'var(--surface-2,#f9fafb)'))+';border:1px solid var(--border-1,#e5e7eb);border-radius:6px">'
            +   '<div style="flex:1;min-width:0">'
            +     '<div style="font-size:12px;font-weight:500;color:var(--text-1)">'+esc(p.label_vi || p.label_en || p.permission_code)
            +       (p.is_dangerous ? ' <span title="Dangerous permission" style="color:var(--red-dark,#991b1b)">⚠</span>' : '')+'</div>'
            +     '<div style="font-size:11px;color:var(--text-3);font-family:ui-monospace,monospace">'+esc(p.permission_code)+(p.required_aal ? ' · AAL'+p.required_aal : '')+'</div>'
            +   '</div>'
            +   '<div style="display:flex;gap:4px">'
            +     '<button class="btn-admin sm'+(isGranted?'':' secondary')+'" data-perm-grant="'+UI.escapeAttr(p.permission_code)+'" '+(isGranted?'disabled':'')+'>✓ '+esc(t('Grant','Cấp'))+'</button>'
            +     '<button class="btn-admin sm'+(isDenied?'':' secondary')+'" data-perm-deny="'+UI.escapeAttr(p.permission_code)+'" '+(isDenied?'disabled':'')+'style="'+(isDenied?'background:var(--red-dark,#991b1b);color:#fff':'')+'">✗ '+esc(t('Deny','Từ chối'))+'</button>'
            +     '<button class="btn-admin secondary sm" data-perm-clear="'+UI.escapeAttr(p.permission_code)+'" '+(!effect?'disabled':'')+'>—</button>'
            +   '</div>'
            + '</div>';
        });
        html += '</div></div>';
      });
      el.innerHTML = html;
      function applyEffect(permCode, effect){
        return applyRolePermission(role.role_code, permCode, effect)
          .then(function(){ renderPermissionsTab(el, role); })
          .catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
      }
      Array.prototype.forEach.call(el.querySelectorAll('[data-perm-grant]'), function(b){
        b.addEventListener('click', function(){ applyEffect(b.getAttribute('data-perm-grant'),'grant'); });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-perm-deny]'), function(b){
        b.addEventListener('click', function(){ applyEffect(b.getAttribute('data-perm-deny'),'deny'); });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-perm-clear]'), function(b){
        b.addEventListener('click', function(){ applyEffect(b.getAttribute('data-perm-clear'), null); });
      });
      el.querySelector('#perm-grant-all').addEventListener('click', function(){
        UI.confirmDestructive({ title:t('Grant all permissions','Cấp tất cả quyền'),
          message:t('This will grant every permission in the catalog to this role. Use with caution.','Sẽ cấp toàn bộ quyền trong catalog cho vai trò này. Thận trọng.'),
          requireReason:true
        }).then(function(r){ if (!r||!r.confirmed) return;
          Promise.all(state.permissionCatalog.map(function(p){ return applyEffect(p.permission_code,'grant').catch(function(){}); }));
        });
      });
      el.querySelector('#perm-revoke-all').addEventListener('click', function(){
        UI.confirmDestructive({ title:t('Revoke all permissions','Thu hồi tất cả quyền'),
          message:t('Remove all permission grants from this role?','Gỡ tất cả quyền của vai trò này?'),
          requireReason:true
        }).then(function(r){ if (!r||!r.confirmed) return;
          Promise.all(perms.map(function(p){ return applyEffect(p.permission_code, null).catch(function(){}); }));
        });
      });
    }).catch(function(err){
      el.innerHTML = UI.errorHtml(err && err.message, function(){ renderPermissionsTab(el, role); });
    });
  }

  // ── Sub-tab: SoD ────────────────────────────────────────────────────────────
  function renderSodTab(el, role){
    var conflicts = state.sodConflicts.filter(function(c){
      return c.role_code_a === role.role_code || c.role_code_b === role.role_code;
    });
    var html = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      +   '<div style="font-size:13px;color:var(--text-2)">'+conflicts.length+' '+esc(t('conflict(s) defined','xung đột định nghĩa'))+'</div>'
      +   UI.btn(t('Add conflict','Thêm xung đột'), { id:'sod-add-btn', icon:'＋', kind:'secondary' })
      + '</div>';
    if (!conflicts.length) html += UI.emptyHtml(t('No SoD conflicts defined for this role','Không có xung đột SoD nào với vai trò này'));
    else {
      html += '<div style="display:flex;flex-direction:column;gap:6px">';
      conflicts.forEach(function(c){
        var other = c.role_code_a === role.role_code ? c.role_code_b : c.role_code_a;
        var sev = c.severity || 'block';
        html += '<div style="padding:10px;background:var(--surface-2,#f9fafb);border:1px solid var(--border-1,#e5e7eb);border-radius:6px">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
          +   '<div style="font-weight:600;color:var(--text-1);font-size:13px">'+esc(role.role_code)+' ↔ '+esc(other)+'</div>'
          +   badge(sev, sev === 'block' ? 'block' : (sev === 'warn' ? 'warn' : 'muted'))
          + '</div>'
          + '<div style="font-size:12px;color:var(--text-2);line-height:1.5">'+esc(c.description || '')+'</div>'
          + '<div style="margin-top:6px;display:flex;gap:6px">'
          +   '<button class="btn-admin secondary sm" data-sod-edit="'+UI.escapeAttr(c.id||'')+'">'+esc(t('Edit','Sửa'))+'</button>'
          +   '<button class="btn-admin secondary sm" data-sod-delete="'+UI.escapeAttr(c.id||'')+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Remove','Xoá'))+'</button>'
          + '</div>'
          + '</div>';
      });
      html += '</div>';
    }
    el.innerHTML = html;
    el.querySelector('#sod-add-btn').addEventListener('click', function(){ openSodEditor(null, role, el); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-sod-edit]'), function(b){
      b.addEventListener('click', function(){
        var c = state.sodConflicts.find(function(x){ return String(x.id) === b.getAttribute('data-sod-edit'); });
        if (c) openSodEditor(c, role, el);
      });
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-sod-delete]'), function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-sod-delete');
        var c = state.sodConflicts.find(function(x){ return String(x.id) === id; });
        UI.confirmDestructive({ title: t('Remove SoD conflict','Xoá xung đột SoD'), requireReason:true }).then(function(r){
          if (!r||!r.confirmed) return;
          UI.runtime.delete('core_system','role_sod_conflict', id, c && c.row_version).then(function(){
            UI.audit('rbac.sod.delete', { id: id, reason: r.reason });
            UI.toast(t('Removed','Đã xoá'),'ok');
            fetchAll(true).then(function(){ renderSodTab(el, role); });
          }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
        });
      });
    });
  }

  function openSodEditor(existing, role, hostEl){
    var others = state.roles.filter(function(r){ return r.role_code !== role.role_code; });
    var fields = [
      { key:'role_code_a', value: role.role_code, type:'text', label:t('Role A','Vai trò A'), disabled:true },
      { key:'role_code_b', label:t('Role B','Vai trò B'), type:'select', required:true,
        value: existing ? (existing.role_code_a === role.role_code ? existing.role_code_b : existing.role_code_a) : '',
        options: others.map(function(r){ return { value:r.role_code, label:(r.role_label_vi||r.role_code)+' ('+r.role_code+')' }; }) },
      { key:'severity', label:t('Severity','Mức độ'), type:'select', required:true,
        value: existing ? (existing.severity || 'block') : 'block',
        options: [
          { value:'block', label:t('block — assignment refused','block — chặn cấp quyền') },
          { value:'warn', label:t('warn — warning only','warn — chỉ cảnh báo') }
        ]},
      { key:'description', label:t('Description','Mô tả'), type:'textarea', rows:3, required:true,
        value: existing ? (existing.description||'') : '',
        hint: t('Why this combination is forbidden','Vì sao tổ hợp vai trò này bị cấm') }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: existing ? t('Edit SoD conflict','Sửa xung đột SoD') : t('Add SoD conflict','Thêm xung đột SoD'),
      bodyEl: form.el, width:'560px',
      footerHtml: '<button class="btn-admin secondary" id="sod-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="sod-save">'+esc(existing ? t('Save','Lưu') : t('Add','Thêm'))+'</button>'
    });
    modal.card.querySelector('#sod-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#sod-save').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.role_code_b) { form.setError('role_code_b', t('Required','Bắt buộc')); return; }
      if (!v.description) { form.setError('description', t('Required','Bắt buộc')); return; }
      var p = existing
        ? UI.runtime.update('core_system','role_sod_conflict', existing.id, v, existing.row_version)
        : UI.runtime.create('core_system','role_sod_conflict', v);
      p.then(function(){
        UI.audit(existing?'rbac.sod.update':'rbac.sod.create', v);
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        fetchAll(true).then(function(){ renderSodTab(hostEl, role); });
      }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
    });
  }

  // ── Sub-tab: MFA ────────────────────────────────────────────────────────────
  function renderMfaTab(el, role){
    var policy = state.mfaPolicy.find(function(p){ return p.role_code === role.role_code; }) || null;
    var fields = [
      { key:'required_aal', label:t('Required AAL (NIST 800-63B)','AAL bắt buộc (NIST 800-63B)'), type:'select', required:true,
        value: policy ? (policy.required_aal||1) : 1,
        options:[
          { value:1, label:t('AAL1 — single-factor','AAL1 — một yếu tố') },
          { value:2, label:t('AAL2 — two-factor (TOTP/SMS/Push)','AAL2 — hai yếu tố') },
          { value:3, label:t('AAL3 — hardware-bound (FIDO2/WebAuthn)','AAL3 — phần cứng (FIDO2/WebAuthn)') }
        ] },
      { key:'reauth_minutes', label:t('Re-auth interval (minutes, 0=never)','Khoảng tái xác thực (phút, 0=không yêu cầu)'), type:'number', min:0, max:1440,
        value: policy ? (policy.reauth_minutes != null ? policy.reauth_minutes : 60) : 60 },
      { key:'allow_remembered_device', label:t('Allow remembered device','Cho phép thiết bị đã ghi nhớ'), type:'checkbox',
        value: policy ? (policy.allow_remembered_device !== false) : true,
        checkboxLabel: t('Skip second factor on previously enrolled device','Bỏ qua yếu tố thứ 2 trên thiết bị đã đăng ký') },
      { key:'webauthn_required', label:t('Require WebAuthn factor','Bắt buộc yếu tố WebAuthn'), type:'checkbox',
        value: policy ? !!policy.webauthn_required : false,
        checkboxLabel: t('User must enroll a hardware key (FIDO2)','User phải đăng ký khoá phần cứng (FIDO2)') }
    ];
    var form = UI.buildForm(fields);
    el.innerHTML = '';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'margin-bottom:10px;font-size:13px;color:var(--text-2)';
    hdr.innerHTML = policy
      ? esc(t('Policy in effect since ','Chính sách áp dụng từ '))+esc(policy.effective_from || policy.created_at || '—')
      : esc(t('No MFA policy defined yet — defaults will apply','Chưa định nghĩa MFA — dùng mặc định'));
    el.appendChild(hdr);
    el.appendChild(form.el);
    var actions = document.createElement('div');
    actions.style.cssText = 'margin-top:14px;display:flex;gap:8px';
    actions.innerHTML = '<button class="btn-admin" id="mfa-save">'+esc(t('Save policy','Lưu chính sách'))+'</button>'
      + (policy ? '<button class="btn-admin secondary" id="mfa-clear" style="color:var(--red-dark,#991b1b)">'+esc(t('Clear policy','Xoá chính sách'))+'</button>' : '');
    el.appendChild(actions);
    actions.querySelector('#mfa-save').addEventListener('click', function(){
      var v = form.getValues();
      v.role_code = role.role_code;
      var p = policy
        ? UI.runtime.update('core_system','role_mfa_policy', policy.id, v, policy.row_version)
        : UI.runtime.create('core_system','role_mfa_policy', v);
      p.then(function(){
        UI.audit('mfa.policy.save', { role_code: role.role_code, payload: v });
        UI.toast(t('Policy saved','Đã lưu chính sách'),'ok');
        fetchAll(true).then(function(){ renderMfaTab(el, role); });
      }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
    });
    var clrBtn = actions.querySelector('#mfa-clear');
    if (clrBtn) clrBtn.addEventListener('click', function(){
      UI.confirmDestructive({ title: t('Clear MFA policy','Xoá chính sách MFA'), requireReason:true }).then(function(r){
        if (!r || !r.confirmed) return;
        UI.runtime.delete('core_system','role_mfa_policy', policy.id, policy.row_version).then(function(){
          UI.audit('mfa.policy.clear', { role_code: role.role_code, reason: r.reason });
          UI.toast(t('Cleared','Đã xoá'),'ok');
          fetchAll(true).then(function(){ renderMfaTab(el, role); });
        }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
      });
    });
  }

  // ── Sub-tab: Audit (uses real audit_events with hash-chained tamper-evident log) ──
  function renderAuditTab(el, role){
    el.innerHTML = UI.loadingHtml();
    UI.runtime.list('core_system','audit_events', {
      'filter[aggregate_type]':'role',
      'filter[aggregate_id]': role.role_code,
      sort:'-recorded_at',
      limit: 100
    }).then(function(r){
      var rows = (r && r.data) || r || [];
      if (!rows.length){
        // Also try without aggregate filter if no events tagged on this role
        return UI.runtime.list('core_system','audit_events', {
          search: role.role_code, sort:'-recorded_at', limit: 50
        }).then(function(r2){
          var rows2 = (r2 && r2.data) || r2 || [];
          if (!rows2.length){ el.innerHTML = UI.emptyHtml(t('No audit events for this role','Chưa có sự kiện kiểm tra cho vai trò này')); return; }
          renderAuditRows(el, rows2);
        });
      }
      renderAuditRows(el, rows);
    }).catch(function(err){
      el.innerHTML = UI.errorHtml(err && err.message, function(){ renderAuditTab(el, role); });
    });
  }
  function renderAuditRows(el, rows){
    var columns = [
      { key:'recorded_at', label:t('When','Thời điểm'), width:'150px', render:function(r){
          return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc((r.recorded_at||'').replace('T',' ').slice(0,19))+'</span>';
        } },
      { key:'event_type', label:t('Event','Sự kiện'), width:'150px', render:function(r){ return badge(r.event_type || '—','info'); } },
      { key:'actor', label:t('Actor','Người thao tác'), width:'140px', render:function(r){ return esc(r.actor_name || r.actor_id || '—'); } },
      { key:'payload', label:t('Detail','Chi tiết'), render:function(r){
          var d = r.payload || {};
          try { return '<pre style="font-size:11px;font-family:ui-monospace,monospace;white-space:pre-wrap;margin:0;color:var(--text-2);max-height:60px;overflow:hidden">'+esc(JSON.stringify(d).slice(0,200))+'</pre>'; }
          catch(e){ return esc(String(d)); }
        } },
      { key:'event_hash', label:t('Hash','Hash'), width:'90px', render:function(r){
          if (!r.event_hash) return '<span style="color:var(--text-3)">—</span>';
          return '<span title="'+UI.escapeAttr(r.event_hash)+'" style="font-family:ui-monospace,monospace;font-size:10px;color:var(--green-dark,#166534)">🔗 '+esc(r.event_hash.slice(0,8))+'</span>';
        } }
    ];
    el.innerHTML = '<div style="font-size:11px;color:var(--text-3);margin-bottom:8px">🔒 '+esc(t('Tamper-evident audit log (SHA-256 hash chain)','Nhật ký chống giả mạo (chuỗi hash SHA-256)'))+'</div>';
    el.appendChild(UI.buildTable(columns, rows, { rowKey:'event_id', maxHeight:'460px' }));
  }

  // ── Public hook ─────────────────────────────────────────────────────────────
  window._renderAdminRolesV2 = function(rootEl){ render(rootEl); };
})();
