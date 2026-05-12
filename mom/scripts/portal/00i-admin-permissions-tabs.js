/* ============================================================================
 * Admin Permissions Tabs — Module / Document / Portal Display (v2 — full CRUD)
 * ----------------------------------------------------------------------------
 * Replaces the prior read-only dashboards with a workable admin surface:
 *
 *  ▸ module_perms   — interactive matrix; click V/C/U/D/A/X dots to toggle.
 *                     Bulk preset (Read-only / Editor / Admin / None), copy
 *                     permissions from another role, search & filters.
 *
 *  ▸ doc_perms      — per-document ACL grid with grant editor, emergency
 *                     override (reason + expiry), test-grant preview.
 *
 *  ▸ portal_display — per-scope (role / dept / user) widget visibility editor
 *                     with reorder controls.
 *
 * Every action is mediated through window.AdminUI (00j-admin-shared.js).
 * Backend EN, frontend VN with diacritics.
 * ========================================================================== */

(function(){
  'use strict';
  if (!window.AdminUI) { console.error('[admin-permissions] AdminUI not loaded'); return; }
  var UI = window.AdminUI;
  var t = UI.t, esc = UI.escapeHtml, badge = UI.badge;

  // ── State ──────────────────────────────────────────────────────────────────
  var state = {
    roles: [],
    modules: [],
    modulePerms: [],
    documentGrants: [],
    documents: [],
    portalWidgets: [],
    portalLayouts: [],
    users: [],
    permissionCatalog: []
  };

  function fetchRoles(){
    return UI.runtime.list('core_system','roles',{ limit:500 }).then(function(r){
      state.roles = (r && r.data) || r || [];
    });
  }
  function fetchModules(){
    return UI.runtime.list('core_system','modules_catalog',{ limit:500 }).then(function(r){
      state.modules = (r && r.data) || r || [];
    });
  }
  function fetchModulePerms(){
    return UI.runtime.list('core_system','module_permission',{ limit:5000 }).then(function(r){
      state.modulePerms = (r && r.data) || r || [];
    });
  }
  function fetchDocumentGrants(){
    return UI.runtime.list('core_system','document_permission_grant',{ limit:2000 }).then(function(r){
      state.documentGrants = (r && r.data) || r || [];
    }).catch(function(){ state.documentGrants = []; });
  }
  function fetchDocuments(){
    return UI.runtime.list('quality_improvement','dcc_document_header',{ limit:1000 }).then(function(r){
      state.documents = (r && r.data) || r || [];
    }).catch(function(){ state.documents = []; });
  }
  function fetchPortalWidgets(){
    return UI.runtime.list('core_system','portal_widget_catalog',{ limit:200 }).then(function(r){
      state.portalWidgets = (r && r.data) || r || [];
    }).catch(function(){ state.portalWidgets = []; });
  }
  function fetchPortalLayouts(){
    return UI.runtime.list('core_system','portal_layout_template',{ limit:500 }).then(function(r){
      state.portalLayouts = (r && r.data) || r || [];
    }).catch(function(){ state.portalLayouts = []; });
  }
  function fetchUsers(){
    var loader = typeof window.loadSharedAdminUsers === 'function'
      ? window.loadSharedAdminUsers
      : function(){ return Promise.resolve(window.USERS || []); };
    return loader().then(function(users){
      state.users = (users || []).map(function(u){
        return { id:u.id || u.employee_id || u.username, username:u.username, full_name:u.name || u.full_name, role_code:u.role, dept_code:u.dept, is_active:u.active!==false };
      });
    });
  }
  function fetchPermissionCatalog(){
    return UI.runtime.list('core_system','permission_catalog',{ limit:500 }).then(function(r){
      state.permissionCatalog = (r && r.data) || r || [];
    }).catch(function(){ state.permissionCatalog = []; });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab 1 — Module permissions matrix (V/C/U/D/A/X)
  // ════════════════════════════════════════════════════════════════════════════
  var FLAGS = ['V','C','U','D','A','X'];
  var FLAG_LABELS = {
    V:{en:'View',vi:'Xem'},C:{en:'Create',vi:'Tạo'},U:{en:'Update',vi:'Sửa'},
    D:{en:'Delete',vi:'Xoá'},A:{en:'Approve',vi:'Duyệt'},X:{en:'Export',vi:'Xuất'}
  };
  var PRESETS = {
    none:    { V:false,C:false,U:false,D:false,A:false,X:false },
    readonly:{ V:true, C:false,U:false,D:false,A:false,X:true  },
    editor:  { V:true, C:true, U:true, D:false,A:false,X:true  },
    admin:   { V:true, C:true, U:true, D:true, A:true, X:true  }
  };

  function modulePermLookup(){
    var m = {};
    state.modulePerms.forEach(function(p){
      m[p.role_code+'|'+p.module_code] = p;
    });
    return m;
  }

  function renderModulePerms(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchRoles(), fetchModules(), fetchModulePerms()]).then(function(){
      var perms = modulePermLookup();
      var roleSearch = '';
      var modSearch = '';
      var deptFilter = '';

      function rerender(){
        var depts = Array.from(new Set(state.roles.map(function(r){ return r.dept_code; }).filter(Boolean))).sort();
        var rolesShown = state.roles.filter(function(r){
          if (deptFilter && r.dept_code !== deptFilter) return false;
          if (!roleSearch) return true;
          var hay = (r.role_code+' '+(r.role_label_vi||'')+' '+(r.role_label||'')).toLowerCase();
          return hay.indexOf(roleSearch.toLowerCase()) >= 0;
        });
        var modsShown = state.modules.filter(function(m){
          if (!modSearch) return true;
          var hay = (m.module_code+' '+(m.label_vi||'')+' '+(m.label_en||'')).toLowerCase();
          return hay.indexOf(modSearch.toLowerCase()) >= 0;
        });

        var head = UI.panelHeader(
          t('Module permissions matrix','Ma trận phân quyền module'),
          t('Click any V/C/U/D/A/X dot to toggle. Each cell writes through the runtime API with optimistic concurrency.',
            'Bấm vào ô V/C/U/D/A/X để đảo trạng thái. Ghi qua runtime API với khoá lạc quan.'),
          UI.btn(t('Refresh','Làm mới'),{icon:'🔄',kind:'secondary',id:'mp-refresh'})
          + UI.btn(t('Bulk preset','Áp preset'),{icon:'⚡',kind:'secondary',id:'mp-preset'})
          + UI.btn(t('Copy from role','Sao chép từ vai trò'),{icon:'⎘',kind:'secondary',id:'mp-copy'})
        );
        var kpi = UI.kpiRow([
          UI.kpiCard(t('Roles','Vai trò'), rolesShown.length, '', 'info'),
          UI.kpiCard(t('Modules','Module'), modsShown.length, '', 'info'),
          UI.kpiCard(t('Cells set','Ô đã cấp'), state.modulePerms.length, '', 'ok'),
          UI.kpiCard(t('Coverage','Độ phủ'),
            ((state.modulePerms.length / Math.max(1, rolesShown.length*modsShown.length))*100).toFixed(0)+'%',
            '', 'muted')
        ]);

        var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
          + '<input type="search" id="mp-role-search" placeholder="'+esc(t('Search role…','Tìm vai trò…'))+'" value="'+UI.escapeAttr(roleSearch)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:200px">'
          + '<input type="search" id="mp-mod-search" placeholder="'+esc(t('Search module…','Tìm module…'))+'" value="'+UI.escapeAttr(modSearch)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:200px">'
          + '<select id="mp-dept-filter" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          + '<option value="">'+esc(t('All departments','Tất cả phòng ban'))+'</option>'
          + depts.map(function(d){ return '<option value="'+UI.escapeAttr(d)+'"'+(deptFilter===d?' selected':'')+'>'+esc(d)+'</option>'; }).join('')
          + '</select>'
          + '</div>';

        // Build matrix table
        var thead = '<thead><tr>'
          + '<th style="position:sticky;left:0;top:0;z-index:3;background:var(--surface-2,#f9fafb);padding:8px 10px;border-bottom:1px solid var(--border-1,#e5e7eb);text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-3);min-width:200px">'+esc(t('Role','Vai trò'))+'</th>';
        modsShown.forEach(function(m){
          thead += '<th style="position:sticky;top:0;z-index:2;background:var(--surface-2,#f9fafb);padding:8px 6px;border-bottom:1px solid var(--border-1,#e5e7eb);text-align:center;font-size:11px;font-weight:600;color:var(--text-3);min-width:130px">'
            + '<div style="font-size:13px">'+esc(m.icon_emoji || '')+'</div>'
            + '<div title="'+UI.escapeAttr(m.label_vi || m.label_en || m.module_code)+'">'+esc((m.label_vi || m.module_code).slice(0,16))+'</div>'
            + '<div style="font-family:ui-monospace,monospace;font-weight:400;font-size:9px;color:var(--text-3)">'+esc(m.module_code)+'</div>'
            + '</th>';
        });
        thead += '</tr></thead>';

        var tbody = '<tbody>';
        rolesShown.forEach(function(r){
          tbody += '<tr><th style="position:sticky;left:0;background:var(--surface-1,#fff);padding:6px 10px;border-bottom:1px solid var(--border-1,#e5e7eb);text-align:left;font-weight:500;color:var(--text-1);font-size:13px;min-width:200px;z-index:1">'
            + '<div>'+esc(r.icon_emoji||'👤')+' '+esc(r.role_label_vi || r.role_code)+'</div>'
            + '<div style="font-family:ui-monospace,monospace;font-size:10px;color:var(--text-3)">'+esc(r.role_code)+(r.dept_code?' · '+esc(r.dept_code):'')+'</div>'
            + '</th>';
          modsShown.forEach(function(m){
            var p = perms[r.role_code+'|'+m.module_code];
            var dots = FLAGS.map(function(f){
              return { flag:f, on: !!(p && p[('flag_'+f).toLowerCase()]), label: t(FLAG_LABELS[f].en, FLAG_LABELS[f].vi) };
            });
            tbody += '<td style="padding:4px 6px;border-bottom:1px solid var(--border-1,#e5e7eb);text-align:center;vertical-align:middle">'
              + UI.matrixCell(dots, { editable:true, dataAttrs:'data-role="'+UI.escapeAttr(r.role_code)+'" data-module="'+UI.escapeAttr(m.module_code)+'"' })
              + '</td>';
          });
          tbody += '</tr>';
        });
        tbody += '</tbody>';

        var matrix = '<div style="border:1px solid var(--border-1,#e5e7eb);border-radius:8px;overflow:auto;max-height:640px;background:var(--surface-1,#fff)"><table style="width:100%;border-collapse:collapse">'+thead+tbody+'</table></div>';

        rootEl.innerHTML = head + kpi + toolbar + matrix;

        // Wire toolbar
        rootEl.querySelector('#mp-refresh').addEventListener('click', function(){ fetchModulePerms().then(function(){ perms = modulePermLookup(); rerender(); }); });
        rootEl.querySelector('#mp-preset').addEventListener('click', function(){ openPresetDialog(rootEl, rerender); });
        rootEl.querySelector('#mp-copy').addEventListener('click', function(){ openCopyFromRoleDialog(rootEl, rerender); });
        var rs = rootEl.querySelector('#mp-role-search');
        var ms = rootEl.querySelector('#mp-mod-search');
        var df = rootEl.querySelector('#mp-dept-filter');
        var deb = UI.debounce(function(){ rerender(); }, 220);
        rs.addEventListener('input', function(){ roleSearch = rs.value; deb(); });
        ms.addEventListener('input', function(){ modSearch = ms.value; deb(); });
        df.addEventListener('change', function(){ deptFilter = df.value; rerender(); });

        // Wire dot toggles
        Array.prototype.forEach.call(rootEl.querySelectorAll('.adminui-matrix-cell'), function(cellEl){
          var roleCode = cellEl.getAttribute('data-role');
          var moduleCode = cellEl.getAttribute('data-module');
          Array.prototype.forEach.call(cellEl.querySelectorAll('.adminui-matrix-dot'), function(dot){
            dot.addEventListener('click', function(){
              var flag = dot.getAttribute('data-flag');
              var currentlyOn = dot.getAttribute('data-on') === '1';
              toggleModulePerm(roleCode, moduleCode, flag, !currentlyOn).then(function(){
                return fetchModulePerms();
              }).then(function(){
                perms = modulePermLookup();
                rerender();
              }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
            });
          });
        });
      }
      rerender();
    }).catch(function(err){
      rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderModulePerms(rootEl); });
    });
  }

  function toggleModulePerm(roleCode, moduleCode, flag, on){
    var existing = state.modulePerms.find(function(p){ return p.role_code === roleCode && p.module_code === moduleCode; });
    var col = ('flag_'+flag).toLowerCase();
    if (existing){
      var patch = {}; patch[col] = on;
      return UI.runtime.update('core_system','module_permission', existing.id, patch, existing.row_version)
        .then(function(){ UI.audit('module_permission.toggle', { role_code: roleCode, module_code: moduleCode, flag: flag, on: on }); });
    } else {
      var payload = { role_code: roleCode, module_code: moduleCode };
      FLAGS.forEach(function(f){ payload['flag_'+f.toLowerCase()] = (f === flag) ? on : false; });
      return UI.runtime.create('core_system','module_permission', payload)
        .then(function(){ UI.audit('module_permission.create', { role_code: roleCode, module_code: moduleCode, flag: flag, on: on }); });
    }
  }

  function openPresetDialog(hostEl, refresh){
    var fields = [
      { key:'preset', label:t('Preset','Mẫu'), type:'select', required:true,
        options:[
          { value:'none', label:t('None — clear all flags','Không — xoá hết quyền') },
          { value:'readonly', label:t('Read-only — V + X (export)','Chỉ đọc — V + X (xuất)') },
          { value:'editor', label:t('Editor — V/C/U/X','Biên tập — V/C/U/X') },
          { value:'admin', label:t('Admin — V/C/U/D/A/X','Quản trị — V/C/U/D/A/X') }
        ] },
      { key:'role_code', label:t('Apply to role(s)','Áp lên vai trò'), type:'select', required:true,
        options: [{ value:'__ALL__', label:t('All roles','Tất cả vai trò') }].concat(state.roles.map(function(r){ return { value:r.role_code, label:r.role_label_vi || r.role_code }; })) },
      { key:'module_code', label:t('Apply to module(s)','Áp lên module'), type:'select', required:true,
        options: [{ value:'__ALL__', label:t('All modules','Tất cả module') }].concat(state.modules.map(function(m){ return { value:m.module_code, label:m.label_vi || m.module_code }; })) }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title:t('Bulk preset','Áp preset hàng loạt'), bodyEl:form.el, width:'520px',
      footerHtml:
        '<button class="btn-admin secondary" id="preset-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'+
        '<button class="btn-admin" id="preset-apply">'+esc(t('Apply','Áp dụng'))+'</button>'
    });
    modal.card.querySelector('#preset-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#preset-apply').addEventListener('click', function(){
      var v = form.getValues();
      UI.confirmDestructive({
        title:t('Apply preset','Áp preset'),
        message:t('This will overwrite the V/C/U/D/A/X flags of every selected role × module cell. Proceed?',
                  'Sẽ ghi đè các flag V/C/U/D/A/X cho mọi ô đã chọn. Tiếp tục?'),
        requireReason:true, confirmLabel:t('Apply','Áp dụng')
      }).then(function(r){
        if (!r || !r.confirmed) return;
        var roles = v.role_code === '__ALL__' ? state.roles.map(function(r){ return r.role_code; }) : [v.role_code];
        var mods = v.module_code === '__ALL__' ? state.modules.map(function(m){ return m.module_code; }) : [v.module_code];
        var preset = PRESETS[v.preset];
        var btn = modal.card.querySelector('#preset-apply');
        btn.disabled = true; btn.textContent = t('Applying…','Đang áp…');
        var ops = [];
        roles.forEach(function(rc){
          mods.forEach(function(mc){
            var existing = state.modulePerms.find(function(p){ return p.role_code === rc && p.module_code === mc; });
            var payload = { role_code: rc, module_code: mc };
            FLAGS.forEach(function(f){ payload['flag_'+f.toLowerCase()] = !!preset[f]; });
            if (existing) ops.push(UI.runtime.update('core_system','module_permission', existing.id, payload, existing.row_version).catch(function(){}));
            else ops.push(UI.runtime.create('core_system','module_permission', payload).catch(function(){}));
          });
        });
        Promise.all(ops).then(function(){
          UI.audit('module_permission.preset', { preset: v.preset, role_code: v.role_code, module_code: v.module_code, reason: r.reason });
          UI.toast(t('Preset applied','Đã áp preset'),'ok');
          modal.close();
          fetchModulePerms().then(refresh);
        });
      });
    });
  }

  function openCopyFromRoleDialog(hostEl, refresh){
    var fields = [
      { key:'source_role', label:t('Copy from','Sao chép từ'), type:'select', required:true,
        options: state.roles.map(function(r){ return { value:r.role_code, label:r.role_label_vi || r.role_code }; }) },
      { key:'target_role', label:t('Copy to','Sao chép đến'), type:'select', required:true,
        options: state.roles.map(function(r){ return { value:r.role_code, label:r.role_label_vi || r.role_code }; }) }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title:t('Copy module permissions','Sao chép quyền module'), bodyEl:form.el, width:'520px',
      footerHtml:'<button class="btn-admin secondary" id="cp-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        +'<button class="btn-admin" id="cp-go">'+esc(t('Copy','Sao chép'))+'</button>'
    });
    modal.card.querySelector('#cp-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#cp-go').addEventListener('click', function(){
      var v = form.getValues();
      if (v.source_role === v.target_role){ UI.toast(t('Source and target must differ','Nguồn và đích phải khác nhau'),'warn'); return; }
      UI.confirmDestructive({
        title: t('Overwrite target permissions?','Ghi đè quyền của đích?'),
        message: t('This will overwrite all module flags of '+v.target_role+' with the flags of '+v.source_role+'.',
                   'Sẽ ghi đè toàn bộ flag module của '+v.target_role+' bằng flag của '+v.source_role+'.'),
        requireReason:true
      }).then(function(r){
        if (!r || !r.confirmed) return;
        var sourcePerms = state.modulePerms.filter(function(p){ return p.role_code === v.source_role; });
        var ops = sourcePerms.map(function(sp){
          var existing = state.modulePerms.find(function(p){ return p.role_code === v.target_role && p.module_code === sp.module_code; });
          var payload = { role_code: v.target_role, module_code: sp.module_code };
          FLAGS.forEach(function(f){ payload['flag_'+f.toLowerCase()] = !!sp['flag_'+f.toLowerCase()]; });
          return existing
            ? UI.runtime.update('core_system','module_permission', existing.id, payload, existing.row_version).catch(function(){})
            : UI.runtime.create('core_system','module_permission', payload).catch(function(){});
        });
        Promise.all(ops).then(function(){
          UI.audit('module_permission.copy_role', { source: v.source_role, target: v.target_role, reason: r.reason });
          UI.toast(t('Copied','Đã sao chép'),'ok');
          modal.close();
          fetchModulePerms().then(refresh);
        });
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab 2 — Document permissions
  // ════════════════════════════════════════════════════════════════════════════
  function renderDocPerms(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchRoles(), fetchUsers(), fetchDocumentGrants(), fetchDocuments()]).then(function(){
      var search = '';
      var subjectFilter = 'all'; // all | role | user
      var statusFilter = 'all';

      function rerender(){
        var rows = state.documentGrants.filter(function(g){
          if (subjectFilter === 'role' && !g.role_code) return false;
          if (subjectFilter === 'user' && !g.user_id) return false;
          if (statusFilter === 'active' && g.is_revoked) return false;
          if (statusFilter === 'revoked' && !g.is_revoked) return false;
          if (statusFilter === 'expired'){
            if (!g.expires_at) return false;
            if (new Date(g.expires_at) > new Date()) return false;
          }
          if (!search) return true;
          var hay = [g.doc_code, g.role_code, g.user_id, g.permission_code, g.reason].join(' ').toLowerCase();
          return hay.indexOf(search.toLowerCase()) >= 0;
        });

        var head = UI.panelHeader(
          t('Document permission grants','Phân quyền tài liệu'),
          t('Per-document ACL with optional emergency overrides (reason + expiry).',
            'ACL theo từng tài liệu, có thể cấp khẩn cấp kèm lý do và hạn hết hiệu lực.'),
          UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'dp-refresh' })
          + UI.btn(t('Test grant','Kiểm tra quyền'),{ icon:'🔍', kind:'secondary', id:'dp-test' })
          + UI.btn(t('New grant','Cấp quyền mới'),{ icon:'＋', id:'dp-new' })
        );
        var kpi = UI.kpiRow([
          UI.kpiCard(t('Total grants','Tổng cấp quyền'), state.documentGrants.length, '', 'info'),
          UI.kpiCard(t('Active','Đang hiệu lực'), state.documentGrants.filter(function(g){ return !g.is_revoked && (!g.expires_at || new Date(g.expires_at) > new Date()); }).length, '', 'ok'),
          UI.kpiCard(t('Emergency overrides','Cấp khẩn cấp'), state.documentGrants.filter(function(g){ return g.is_emergency; }).length, '', 'warn'),
          UI.kpiCard(t('Expired','Đã hết hạn'), state.documentGrants.filter(function(g){ return g.expires_at && new Date(g.expires_at) <= new Date(); }).length, '', 'muted')
        ]);
        var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
          + '<input type="search" id="dp-search" placeholder="'+esc(t('Search doc / role / user / reason…','Tìm tài liệu / vai trò / user / lý do…'))+'" value="'+UI.escapeAttr(search)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:280px">'
          + '<select id="dp-subj" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          +   '<option value="all">'+esc(t('All subjects','Tất cả đối tượng'))+'</option>'
          +   '<option value="role"'+(subjectFilter==='role'?' selected':'')+'>'+esc(t('Role grants','Cấp theo vai trò'))+'</option>'
          +   '<option value="user"'+(subjectFilter==='user'?' selected':'')+'>'+esc(t('User grants','Cấp theo user'))+'</option>'
          + '</select>'
          + '<select id="dp-status" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          +   '<option value="all">'+esc(t('All status','Tất cả trạng thái'))+'</option>'
          +   '<option value="active"'+(statusFilter==='active'?' selected':'')+'>'+esc(t('Active','Đang hiệu lực'))+'</option>'
          +   '<option value="expired"'+(statusFilter==='expired'?' selected':'')+'>'+esc(t('Expired','Hết hạn'))+'</option>'
          +   '<option value="revoked"'+(statusFilter==='revoked'?' selected':'')+'>'+esc(t('Revoked','Đã thu hồi'))+'</option>'
          + '</select>'
          + '<div style="margin-left:auto;font-size:11px;color:var(--text-3);align-self:center">'+rows.length+' / '+state.documentGrants.length+' '+esc(t('shown','được hiển thị'))+'</div>'
          + '</div>';

        var columns = [
          { key:'doc_code', label:t('Document','Tài liệu'), render:function(g){
              return '<div style="font-family:ui-monospace,monospace;font-size:12px;color:var(--text-1)">'+esc(g.doc_code||'—')+'</div>';
            } },
          { key:'subject', label:t('Subject','Đối tượng'), render:function(g){
              if (g.role_code) return badge(t('Role','Vai trò'),'info')+' '+esc(g.role_code);
              if (g.user_id){
                var u = state.users.find(function(u){ return String(u.id)===String(g.user_id) || u.username===g.user_id; });
                return badge(t('User','User'),'accent')+' '+esc((u && (u.full_name||u.username)) || g.user_id);
              }
              return '—';
            } },
          { key:'permission_code', label:t('Permission','Quyền'), render:function(g){ return '<code style="font-size:11px">'+esc(g.permission_code||'—')+'</code>'; } },
          { key:'effect', label:t('Effect','Hiệu ứng'), render:function(g){
              return g.effect === 'deny' ? badge(t('Deny','Từ chối'),'block') : badge(t('Grant','Cấp'),'ok');
            } },
          { key:'is_emergency', label:t('Mode','Chế độ'), render:function(g){
              return g.is_emergency ? badge('🚨 '+t('Emergency','Khẩn cấp'),'warn') : badge(t('Standard','Chuẩn'),'muted');
            } },
          { key:'expires_at', label:t('Expires','Hết hạn'), render:function(g){
              if (!g.expires_at) return '<span style="color:var(--text-3)">—</span>';
              var expired = new Date(g.expires_at) <= new Date();
              return '<span style="font-family:ui-monospace,monospace;font-size:11px;color:'+(expired?'var(--red-dark,#991b1b)':'var(--text-2)')+'">'+esc(g.expires_at.slice(0,16).replace('T',' '))+'</span>';
            } },
          { key:'status', label:t('Status','Trạng thái'), render:function(g){
              if (g.is_revoked) return badge(t('Revoked','Thu hồi'),'block');
              if (g.expires_at && new Date(g.expires_at) <= new Date()) return badge(t('Expired','Hết hạn'),'muted');
              return badge(t('Active','Hiệu lực'),'ok');
            } },
          { key:'actions', label:'', width:'120px', render:function(g){
              return '<div style="display:flex;gap:4px">'
                + '<button class="btn-admin secondary sm" data-edit="'+UI.escapeAttr(g.id)+'">'+esc(t('Edit','Sửa'))+'</button>'
                + (g.is_revoked ? '' : '<button class="btn-admin secondary sm" data-revoke="'+UI.escapeAttr(g.id)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Revoke','Thu hồi'))+'</button>')
                + '</div>';
            } }
        ];

        rootEl.innerHTML = head + kpi + toolbar;
        rootEl.appendChild(UI.buildTable(columns, rows, { rowKey:'id', emptyMessage:t('No grants match','Không có quyền nào khớp') }));

        rootEl.querySelector('#dp-refresh').addEventListener('click', function(){ fetchDocumentGrants().then(rerender); });
        rootEl.querySelector('#dp-new').addEventListener('click', function(){ openGrantEditor(null, rerender); });
        rootEl.querySelector('#dp-test').addEventListener('click', function(){ openTestGrantDialog(); });
        var sb = rootEl.querySelector('#dp-search'), sj = rootEl.querySelector('#dp-subj'), st2 = rootEl.querySelector('#dp-status');
        var deb = UI.debounce(function(){ rerender(); }, 220);
        sb.addEventListener('input', function(){ search = sb.value; deb(); });
        sj.addEventListener('change', function(){ subjectFilter = sj.value; rerender(); });
        st2.addEventListener('change', function(){ statusFilter = st2.value; rerender(); });
        Array.prototype.forEach.call(rootEl.querySelectorAll('[data-edit]'), function(b){
          b.addEventListener('click', function(){ var g = state.documentGrants.find(function(x){ return String(x.id)===b.getAttribute('data-edit'); }); if (g) openGrantEditor(g, rerender); });
        });
        Array.prototype.forEach.call(rootEl.querySelectorAll('[data-revoke]'), function(b){
          b.addEventListener('click', function(){
            var id = b.getAttribute('data-revoke');
            var g = state.documentGrants.find(function(x){ return String(x.id)===id; });
            UI.confirmDestructive({ title:t('Revoke grant','Thu hồi cấp quyền'), requireReason:true }).then(function(r){
              if (!r||!r.confirmed) return;
              UI.runtime.update('core_system','document_permission_grant', id, { is_revoked:true, revoke_reason: r.reason, revoked_at: new Date().toISOString() }, g && g.row_version).then(function(){
                UI.audit('document_grant.revoke', { id:id, reason:r.reason });
                UI.toast(t('Revoked','Đã thu hồi'),'ok');
                fetchDocumentGrants().then(rerender);
              }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
            });
          });
        });
      }
      rerender();
    }).catch(function(err){
      rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderDocPerms(rootEl); });
    });
  }

  function openGrantEditor(existing, refresh){
    var docOpts = state.documents.length
      ? state.documents.map(function(d){ return { value: d.doc_code, label: d.doc_code+' — '+(d.title_vi||d.title||'') }; })
      : [];
    var fields = [
      { key:'doc_code', label:t('Document code','Mã tài liệu'), required:true, value: existing ? existing.doc_code : '',
        type: docOpts.length ? 'select' : 'text', options: docOpts, placeholder:'qms-sop-001…' },
      { key:'subject_kind', label:t('Subject kind','Loại đối tượng'), type:'select', required:true,
        value: existing ? (existing.role_code ? 'role' : 'user') : 'role',
        options:[ { value:'role', label:t('Role','Vai trò') }, { value:'user', label:t('User','Người dùng') } ] },
      { key:'role_code', label:t('Role','Vai trò'), type:'select',
        value: existing ? (existing.role_code||'') : '',
        options: state.roles.map(function(r){ return { value:r.role_code, label:r.role_label_vi||r.role_code }; }) },
      { key:'user_id', label:t('User','Người dùng'), type:'select',
        value: existing ? (existing.user_id||'') : '',
        options: state.users.map(function(u){ return { value:u.id||u.username, label:(u.full_name||u.username) }; }) },
      { key:'permission_code', label:t('Permission','Quyền'), type:'select', required:true,
        value: existing ? (existing.permission_code||'docs.view') : 'docs.view',
        options:[
          { value:'docs.view', label:'docs.view — '+t('View document','Xem tài liệu') },
          { value:'docs.edit', label:'docs.edit — '+t('Edit document','Sửa tài liệu') },
          { value:'docs.approve', label:'docs.approve — '+t('Approve document','Duyệt tài liệu') },
          { value:'docs.retire', label:'docs.retire — '+t('Retire document','Thu hồi tài liệu') },
          { value:'docs.export', label:'docs.export — '+t('Export document','Xuất tài liệu') }
        ] },
      { key:'effect', label:t('Effect','Hiệu ứng'), type:'select', required:true,
        value: existing ? (existing.effect||'grant') : 'grant',
        options:[
          { value:'grant', label:t('Grant — allow this permission','Cấp — cho phép') },
          { value:'deny', label:t('Deny — explicitly deny (overrides grants)','Từ chối — chặn (ưu tiên hơn cấp)') }
        ] },
      { key:'is_emergency', label:t('Emergency override','Cấp khẩn cấp'), type:'checkbox',
        value: existing ? !!existing.is_emergency : false,
        checkboxLabel: t('Bypass standard approval flow (audit trail enforced)','Bỏ qua quy trình duyệt thường (bắt buộc ghi nhật ký)') },
      { key:'expires_at', label:t('Expires at (ISO datetime, blank = never)','Hết hạn (ISO datetime, để trống = không hết hạn)'), placeholder:'2026-12-31T23:59',
        value: existing && existing.expires_at ? existing.expires_at.slice(0,16) : '' },
      { key:'reason', label:t('Reason / justification (audit log)','Lý do / căn cứ (ghi nhật ký)'), type:'textarea', rows:3, required:true,
        value: existing ? (existing.reason||'') : '' }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: existing ? t('Edit grant','Sửa cấp quyền') : t('New document grant','Cấp quyền tài liệu mới'),
      bodyEl: form.el, width:'620px',
      footerHtml: '<button class="btn-admin secondary" id="g-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="g-save">'+esc(existing?t('Save','Lưu'):t('Create grant','Cấp quyền'))+'</button>'
    });
    modal.card.querySelector('#g-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#g-save').addEventListener('click', function(){
      var v = form.getValues();
      form.clearErrors();
      var payload = {
        doc_code: v.doc_code,
        permission_code: v.permission_code,
        effect: v.effect,
        is_emergency: !!v.is_emergency,
        reason: v.reason,
        expires_at: v.expires_at ? v.expires_at + ':00Z' : null
      };
      if (v.subject_kind === 'role'){
        if (!v.role_code) { form.setError('role_code', t('Required','Bắt buộc')); return; }
        payload.role_code = v.role_code; payload.user_id = null;
      } else {
        if (!v.user_id) { form.setError('user_id', t('Required','Bắt buộc')); return; }
        payload.user_id = v.user_id; payload.role_code = null;
      }
      if (!v.doc_code){ form.setError('doc_code', t('Required','Bắt buộc')); return; }
      if (!v.reason || v.reason.length < 5){ form.setError('reason', t('Reason required (min 5 chars)','Bắt buộc lý do (≥ 5 ký tự)')); return; }
      var p = existing
        ? UI.runtime.update('core_system','document_permission_grant', existing.id, payload, existing.row_version)
        : UI.runtime.create('core_system','document_permission_grant', payload);
      p.then(function(){
        UI.audit(existing?'document_grant.update':'document_grant.create', payload);
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        fetchDocumentGrants().then(refresh);
      }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
    });
  }

  function openTestGrantDialog(){
    var fields = [
      { key:'user_id', label:t('Test user','User cần kiểm tra'), type:'select', required:true,
        options: state.users.map(function(u){ return { value:u.id||u.username, label:(u.full_name||u.username) }; }) },
      { key:'doc_code', label:t('Document code','Mã tài liệu'), required:true, placeholder:'qms-sop-001' }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title:t('Test grant — what can a user do on a document?','Kiểm tra — user có thể làm gì với tài liệu?'),
      bodyEl: form.el, width:'600px',
      footerHtml: '<button class="btn-admin secondary" id="tg-close">'+esc(t('Close','Đóng'))+'</button>'
        + '<button class="btn-admin" id="tg-go">'+esc(t('Run check','Chạy kiểm tra'))+'</button>'
    });
    var resultBox = document.createElement('div');
    resultBox.style.cssText = 'margin-top:14px;padding:12px;border-radius:6px;border:1px solid var(--border-1,#e5e7eb);background:var(--surface-2,#f9fafb);min-height:60px;font-size:13px;color:var(--text-2)';
    resultBox.innerHTML = '<em>'+esc(t('No check run yet','Chưa chạy kiểm tra'))+'</em>';
    form.el.appendChild(resultBox);
    modal.card.querySelector('#tg-close').addEventListener('click', modal.close);
    modal.card.querySelector('#tg-go').addEventListener('click', function(){
      var v = form.getValues();
      if (!v.user_id || !v.doc_code) return;
      resultBox.innerHTML = UI.loadingHtml();
      UI.fetchJson('/api/v1/rbac/effective-permissions/'+encodeURIComponent(v.user_id)+'?doc_code='+encodeURIComponent(v.doc_code))
        .then(function(r){
          var perms = (r && r.permissions) || [];
          var html = '<div style="font-weight:600;margin-bottom:6px">'+esc(t('Effective permissions','Quyền hiệu lực'))+'</div>';
          if (!perms.length) html += '<em>'+esc(t('No permissions','Không có quyền nào'))+'</em>';
          else html += perms.map(function(p){
            return '<div style="padding:6px 0;border-bottom:1px dashed var(--border-1,#e5e7eb)">'
              + badge(p.effect||'grant', p.effect==='deny'?'block':'ok')+' <code>'+esc(p.permission_code)+'</code> '
              + (p.source ? '<span style="color:var(--text-3);font-size:11px">via '+esc(p.source)+'</span>' : '')
              + (p.expires_at ? ' <span style="color:var(--text-3);font-size:11px">→ '+esc(p.expires_at.slice(0,16))+'</span>' : '')
              + '</div>';
          }).join('');
          resultBox.innerHTML = html;
        })
        .catch(function(err){ resultBox.innerHTML = UI.errorHtml(err && err.message); });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab 3 — Portal display (widget visibility per scope)
  // ════════════════════════════════════════════════════════════════════════════
  function renderPortalDisplay(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchRoles(), fetchUsers(), fetchPortalWidgets(), fetchPortalLayouts()]).then(function(){
      var scopeKind = 'role';
      var scopeKey = state.roles.length ? state.roles[0].role_code : '';

      function rerender(){
        var layout = state.portalLayouts.find(function(l){ return l.scope_kind===scopeKind && l.scope_key===scopeKey; });
        var assignments = (layout && layout.widget_assignments) || [];
        // Build effective list: each widget either present (with order/visible) or default
        var effective = state.portalWidgets.map(function(w){
          var a = assignments.find(function(x){ return x.widget_code === w.widget_code; });
          return {
            widget: w,
            visible: a ? !!a.visible : (w.default_visible !== false),
            order: a ? a.order : (w.default_order || 999)
          };
        }).sort(function(a,b){ return a.order - b.order; });

        var head = UI.panelHeader(
          t('Portal display layout','Bố cục hiển thị portal'),
          t('Per-scope widget visibility & ordering. Empty layout = use widget defaults.',
            'Cấu hình hiển thị widget theo phạm vi. Không có cấu hình = dùng mặc định widget.'),
          UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'pd-refresh' })
          + UI.btn(t('Reset to defaults','Đặt lại mặc định'),{ kind:'secondary', id:'pd-reset' })
          + UI.btn(t('Save layout','Lưu bố cục'),{ icon:'💾', id:'pd-save' })
        );

        var scopeOpts = '';
        if (scopeKind === 'role') scopeOpts = state.roles.map(function(r){ return '<option value="'+UI.escapeAttr(r.role_code)+'"'+(r.role_code===scopeKey?' selected':'')+'>'+esc(r.role_label_vi||r.role_code)+'</option>'; }).join('');
        else if (scopeKind === 'user') scopeOpts = state.users.map(function(u){ return '<option value="'+UI.escapeAttr(u.id||u.username)+'"'+((u.id||u.username)===scopeKey?' selected':'')+'>'+esc(u.full_name||u.username)+'</option>'; }).join('');
        else { /* dept */
          var depts = Array.from(new Set(state.users.map(function(u){ return u.dept_code; }).filter(Boolean))).sort();
          scopeOpts = depts.map(function(d){ return '<option value="'+UI.escapeAttr(d)+'"'+(d===scopeKey?' selected':'')+'>'+esc(d)+'</option>'; }).join('');
        }

        var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">'
          + '<label style="font-size:12px;color:var(--text-2)">'+esc(t('Scope kind:','Loại phạm vi:'))+'</label>'
          + '<select id="pd-scope-kind" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          +   '<option value="role"'+(scopeKind==='role'?' selected':'')+'>'+esc(t('Role','Vai trò'))+'</option>'
          +   '<option value="dept"'+(scopeKind==='dept'?' selected':'')+'>'+esc(t('Department','Phòng ban'))+'</option>'
          +   '<option value="user"'+(scopeKind==='user'?' selected':'')+'>'+esc(t('User','User cá nhân'))+'</option>'
          + '</select>'
          + '<label style="font-size:12px;color:var(--text-2)">'+esc(t('Scope key:','Phạm vi:'))+'</label>'
          + '<select id="pd-scope-key" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:240px">'+scopeOpts+'</select>'
          + '<div style="margin-left:auto;font-size:11px;color:var(--text-3)">'+(layout ? esc(t('Custom layout active','Có cấu hình tuỳ chỉnh')) : esc(t('Using widget defaults','Đang dùng mặc định')))+'</div>'
          + '</div>';

        var listHtml = '<div id="pd-widget-list" style="display:flex;flex-direction:column;gap:6px">';
        effective.forEach(function(it, idx){
          listHtml += '<div class="pd-widget-row" data-code="'+UI.escapeAttr(it.widget.widget_code)+'" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface-2,#f9fafb);border:1px solid var(--border-1,#e5e7eb);border-radius:6px">'
            + '<div style="font-size:16px">'+esc(it.widget.icon_emoji||'📦')+'</div>'
            + '<div style="flex:1;min-width:0">'
            +   '<div style="font-weight:500;font-size:13px;color:var(--text-1)">'+esc(it.widget.label_vi || it.widget.widget_code)+'</div>'
            +   '<div style="font-size:11px;color:var(--text-3)"><code>'+esc(it.widget.widget_code)+'</code> · '+esc(it.widget.category||'')+'</div>'
            + '</div>'
            + '<button class="btn-admin secondary sm" data-up '+(idx===0?'disabled':'')+'>↑</button>'
            + '<button class="btn-admin secondary sm" data-down '+(idx===effective.length-1?'disabled':'')+'>↓</button>'
            + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-2);margin-left:6px">'
            +   '<input type="checkbox" data-vis '+(it.visible?'checked':'')+'> '+esc(t('Visible','Hiển thị'))
            + '</label>'
            + '</div>';
        });
        listHtml += '</div>';

        rootEl.innerHTML = head + toolbar + listHtml;

        rootEl.querySelector('#pd-refresh').addEventListener('click', function(){ fetchPortalLayouts().then(rerender); });
        rootEl.querySelector('#pd-scope-kind').addEventListener('change', function(e){
          scopeKind = e.target.value;
          if (scopeKind==='role' && state.roles.length) scopeKey = state.roles[0].role_code;
          else if (scopeKind==='user' && state.users.length) scopeKey = state.users[0].id||state.users[0].username;
          else { var ds = Array.from(new Set(state.users.map(function(u){ return u.dept_code; }).filter(Boolean))).sort(); scopeKey = ds[0] || ''; }
          rerender();
        });
        rootEl.querySelector('#pd-scope-key').addEventListener('change', function(e){ scopeKey = e.target.value; rerender(); });

        rootEl.querySelector('#pd-reset').addEventListener('click', function(){
          if (!layout) { UI.toast(t('Already using defaults','Đang dùng mặc định'), 'info'); return; }
          UI.confirmDestructive({ title:t('Reset to defaults','Đặt lại mặc định'), requireReason:true }).then(function(r){
            if (!r || !r.confirmed) return;
            UI.runtime.delete('core_system','portal_layout_template', layout.id, layout.row_version).then(function(){
              UI.audit('portal_layout.reset', { scope_kind:scopeKind, scope_key:scopeKey, reason:r.reason });
              UI.toast(t('Reset','Đã đặt lại'),'ok');
              fetchPortalLayouts().then(rerender);
            }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
          });
        });

        rootEl.querySelector('#pd-save').addEventListener('click', function(){
          var rows = Array.prototype.slice.call(rootEl.querySelectorAll('.pd-widget-row'));
          var widget_assignments = rows.map(function(row, i){
            return {
              widget_code: row.getAttribute('data-code'),
              order: i+1,
              visible: row.querySelector('[data-vis]').checked
            };
          });
          var payload = { scope_kind: scopeKind, scope_key: scopeKey, widget_assignments: widget_assignments };
          var p = layout
            ? UI.runtime.update('core_system','portal_layout_template', layout.id, payload, layout.row_version)
            : UI.runtime.create('core_system','portal_layout_template', payload);
          p.then(function(){
            UI.audit('portal_layout.save', payload);
            UI.toast(t('Layout saved','Đã lưu bố cục'),'ok');
            fetchPortalLayouts().then(rerender);
          }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
        });

        // up/down handlers
        Array.prototype.forEach.call(rootEl.querySelectorAll('.pd-widget-row'), function(row){
          row.querySelector('[data-up]').addEventListener('click', function(){
            var prev = row.previousElementSibling;
            if (prev) row.parentNode.insertBefore(row, prev);
          });
          row.querySelector('[data-down]').addEventListener('click', function(){
            var next = row.nextElementSibling;
            if (next) row.parentNode.insertBefore(next, row);
          });
        });
      }
      rerender();
    }).catch(function(err){
      rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderPortalDisplay(rootEl); });
    });
  }

  // ── Public dispatcher ───────────────────────────────────────────────────────
  window._renderAdminPermTab = function(rootEl, slug){
    if (slug === 'module_perms') return renderModulePerms(rootEl);
    if (slug === 'doc_perms') return renderDocPerms(rootEl);
    if (slug === 'portal_display') return renderPortalDisplay(rootEl);
    rootEl.innerHTML = UI.errorHtml(t('Unknown tab: '+slug, 'Tab không xác định: '+slug));
  };
})();
