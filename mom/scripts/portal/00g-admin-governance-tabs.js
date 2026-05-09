/* ============================================================================
 * Admin Governance Tabs — Permission Catalog / SoD Matrix / Access Reviews
 * (v2 — full CRUD)
 * ----------------------------------------------------------------------------
 *  ▸ permission_catalog — add/edit permissions with danger flag + AAL,
 *                         search/filter, dependency hint, in-use check.
 *  ▸ sod_matrix         — conflict editor + waiver workflow + violations
 *                         viewer (current users in violation, with waivers).
 *  ▸ access_review      — campaign list, open new campaign, attestation
 *                         workspace per reviewer, close campaign with audit.
 * ========================================================================== */

(function(){
  'use strict';
  if (!window.AdminUI) { console.error('[admin-governance] AdminUI not loaded'); return; }
  var UI = window.AdminUI;
  var t = UI.t, esc = UI.escapeHtml, badge = UI.badge;

  var state = {
    permissionCatalog: [],
    roles: [],
    sodConflicts: [],
    sodViolations: [],
    sodWaivers: [],
    campaigns: [],
    reviewItems: [],
    users: []
  };

  function fetchPermissions(){ return UI.runtime.list('core_system','permission_catalog',{ limit:500 }).then(function(r){ state.permissionCatalog = (r&&r.data)||r||[]; }); }
  function fetchRoles(){ return UI.runtime.list('core_system','roles',{ limit:500 }).then(function(r){ state.roles = (r&&r.data)||r||[]; }); }
  function fetchSodConflicts(){ return UI.runtime.list('core_system','role_sod_conflict',{ limit:500 }).then(function(r){ state.sodConflicts = (r&&r.data)||r||[]; }).catch(function(){ state.sodConflicts = []; }); }
  function fetchSodViolations(){ return UI.fetchJson('/api/v1/rbac/sod-violations').then(function(r){ state.sodViolations = (r&&r.data)||r||[]; }).catch(function(){ state.sodViolations = []; }); }
  function fetchSodWaivers(){ return UI.runtime.list('core_system','role_sod_waiver',{ limit:500 }).then(function(r){ state.sodWaivers = (r&&r.data)||r||[]; }).catch(function(){ state.sodWaivers = []; }); }
  function fetchCampaigns(){ return UI.runtime.list('core_system','access_review_campaign',{ limit:200 }).then(function(r){ state.campaigns = (r&&r.data)||r||[]; }).catch(function(){ state.campaigns = []; }); }
  function fetchReviewItems(campaignId){ return UI.runtime.list('core_system','access_review_item',{ 'filter[campaign_id]': campaignId, limit:5000 }).then(function(r){ state.reviewItems = (r&&r.data)||r||[]; }).catch(function(){ state.reviewItems = []; }); }
  function fetchUsers(){ return UI.runtime.list('core_system','users',{ limit:1000 }).then(function(r){ state.users = (r&&r.data)||r||[]; }).catch(function(){
    state.users = (window.USERS||[]).map(function(u){ return { id:u.id, username:u.username, full_name:u.name, role_code:u.role, dept_code:u.dept, is_active:u.active!==false }; });
  }); }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab — Permission catalog
  // ════════════════════════════════════════════════════════════════════════════
  function renderPermissionCatalog(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchPermissions(), fetchRoles()]).then(function(){
      var search = '';
      var groupFilter = '';
      var dangerFilter = 'all';

      function rerender(){
        var groups = Array.from(new Set(state.permissionCatalog.map(function(p){ return (p.permission_code||'').split('.')[0]; }).filter(Boolean))).sort();
        var rows = state.permissionCatalog.filter(function(p){
          if (groupFilter && (p.permission_code||'').split('.')[0] !== groupFilter) return false;
          if (dangerFilter === 'danger' && !p.is_dangerous) return false;
          if (dangerFilter === 'aal2' && (p.required_aal_level || p.required_aal || 1) < 2) return false;
          if (!search) return true;
          var hay = ((p.permission_code||'')+' '+(p.label_vi||'')+' '+(p.label_en||'')+' '+(p.description_vi||'')).toLowerCase();
          return hay.indexOf(search.toLowerCase()) >= 0;
        });
        var head = UI.panelHeader(
          t('Permission catalog','Catalog quyền hệ thống'),
          t('Defines every fine-grained permission. Mark dangerous permissions and require AAL≥2/3 where appropriate (NIST 800-63B).',
            'Định nghĩa từng quyền chi tiết. Đánh dấu quyền nguy hiểm và yêu cầu AAL≥2/3 nếu cần (NIST 800-63B).'),
          UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'pc-refresh' })
          + UI.btn(t('Export CSV','Xuất CSV'),{ icon:'📤', kind:'secondary', id:'pc-export' })
          + UI.btn(t('New permission','Quyền mới'),{ icon:'＋', id:'pc-new' })
        );
        var kpi = UI.kpiRow([
          UI.kpiCard(t('Permissions','Quyền'), state.permissionCatalog.length, '', 'info'),
          UI.kpiCard(t('Dangerous','Nguy hiểm'), state.permissionCatalog.filter(function(p){ return p.is_dangerous; }).length, t('Marked is_dangerous','Đánh dấu nguy hiểm'), 'warn'),
          UI.kpiCard('AAL≥2', state.permissionCatalog.filter(function(p){ return (p.required_aal_level || p.required_aal || 1) >= 2; }).length, '', 'block'),
          UI.kpiCard(t('Groups','Nhóm'), groups.length, '', 'muted')
        ]);
        var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
          + '<input type="search" id="pc-search" placeholder="'+esc(t('Search code / label / description…','Tìm mã / nhãn / mô tả…'))+'" value="'+UI.escapeAttr(search)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:300px">'
          + '<select id="pc-group" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          +   '<option value="">'+esc(t('All groups','Tất cả nhóm'))+'</option>'
          +   groups.map(function(g){ return '<option value="'+UI.escapeAttr(g)+'"'+(groupFilter===g?' selected':'')+'>'+esc(g)+'</option>'; }).join('')
          + '</select>'
          + '<select id="pc-danger" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          +   '<option value="all">'+esc(t('All','Tất cả'))+'</option>'
          +   '<option value="danger"'+(dangerFilter==='danger'?' selected':'')+'>'+esc(t('Dangerous only','Chỉ nguy hiểm'))+'</option>'
          +   '<option value="aal2"'+(dangerFilter==='aal2'?' selected':'')+'>AAL≥2</option>'
          + '</select>'
          + '<div style="margin-left:auto;font-size:11px;color:var(--text-3);align-self:center">'+rows.length+' / '+state.permissionCatalog.length+' '+esc(t('shown','được hiển thị'))+'</div>'
          + '</div>';
        var columns = [
          { key:'permission_code', label:'Code', width:'220px', render:function(p){
              return '<code style="font-size:12px;color:var(--text-1)">'+esc(p.permission_code||'')+'</code>'+(p.is_dangerous?' <span title="Dangerous" style="color:var(--red-dark,#991b1b)">⚠</span>':'');
            } },
          { key:'label_vi', label:t('Label','Nhãn'), render:function(p){
              return '<div style="font-weight:500">'+esc(p.label_vi||p.label||'')+'</div>'
                + '<div style="font-size:11px;color:var(--text-3)">'+esc(p.label||'')+'</div>'
                + (p.description_vi ? '<div style="font-size:11px;color:var(--text-3);margin-top:2px;line-height:1.4">'+esc(p.description_vi)+'</div>' : '');
            } },
          { key:'required_aal_level', label:'AAL', width:'70px', render:function(p){
              var aal = p.required_aal_level||p.required_aal||1;
              return badge('AAL'+aal, aal>=3?'block':(aal===2?'warn':'muted'));
            } },
          { key:'is_dangerous', label:t('Danger','Nguy hiểm'), width:'90px', render:function(p){ return p.is_dangerous ? badge('⚠ '+t('yes','có'),'warn') : badge(t('no','không'),'muted'); } },
          { key:'actions', label:'', width:'140px', render:function(p){
              return '<div style="display:flex;gap:4px"><button class="btn-admin secondary sm" data-edit-perm="'+UI.escapeAttr(p.permission_code)+'">'+esc(t('Edit','Sửa'))+'</button>'
                + '<button class="btn-admin secondary sm" data-del-perm="'+UI.escapeAttr(p.permission_code)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Remove','Xoá'))+'</button></div>';
            } }
        ];
        rootEl.innerHTML = head + kpi + toolbar;
        rootEl.appendChild(UI.buildTable(columns, rows, { rowKey:'permission_code', emptyMessage:t('No permissions match','Không có quyền nào khớp') }));

        rootEl.querySelector('#pc-refresh').addEventListener('click', function(){ fetchPermissions().then(rerender); });
        rootEl.querySelector('#pc-new').addEventListener('click', function(){ openPermissionEditor(null, rerender); });
        rootEl.querySelector('#pc-export').addEventListener('click', function(){
          var csv = 'permission_code,label,label_vi,description_vi,required_aal_level,is_dangerous\n' + state.permissionCatalog.map(function(p){
            return [p.permission_code,p.label,p.label_vi,p.description_vi,p.required_aal_level||p.required_aal,p.is_dangerous?'true':'false'].map(function(x){ return '"'+String(x||'').replace(/"/g,'""')+'"'; }).join(',');
          }).join('\n');
          var blob = new Blob([csv],{type:'text/csv'});
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='permission-catalog.csv'; a.click();
        });
        rootEl.querySelector('#pc-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 220));
        rootEl.querySelector('#pc-group').addEventListener('change', function(e){ groupFilter = e.target.value; rerender(); });
        rootEl.querySelector('#pc-danger').addEventListener('change', function(e){ dangerFilter = e.target.value; rerender(); });
        Array.prototype.forEach.call(rootEl.querySelectorAll('[data-edit-perm]'), function(b){
          b.addEventListener('click', function(){ openPermissionEditor(state.permissionCatalog.find(function(p){ return p.permission_code===b.getAttribute('data-edit-perm'); }), rerender); });
        });
        Array.prototype.forEach.call(rootEl.querySelectorAll('[data-del-perm]'), function(b){
          b.addEventListener('click', function(){
            var code = b.getAttribute('data-del-perm');
            var p = state.permissionCatalog.find(function(x){ return x.permission_code===code; });
            UI.confirmDestructive({
              title:t('Remove permission','Xoá quyền'),
              message:t('This permission may be referenced by role grants. Removing it will revoke those grants.',
                        'Quyền này có thể được dùng trong cấp quyền vai trò. Xoá sẽ thu hồi tất cả các cấp đó.'),
              requireText: code, requireReason:true
            }).then(function(r){
              if (!r||!r.confirmed) return;
              UI.runtime.delete('core_system','permission_catalog', code, p && p.row_version).then(function(){
                UI.audit('permission_catalog.delete', { permission_code: code, reason: r.reason });
                UI.toast(t('Removed','Đã xoá'),'ok');
                fetchPermissions().then(rerender);
              }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
            });
          });
        });
      }
      rerender();
    }).catch(function(err){ rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderPermissionCatalog(rootEl); }); });
  }

  function openPermissionEditor(existing, refresh){
    var fields = [
      { key:'permission_code', label:t('Permission code (group.action)','Mã quyền (group.action)'), required:true, disabled:!!existing,
        value: existing ? existing.permission_code : '', placeholder:'docs.approve, finance.po.approve' },
      { key:'label', label:t('Label (English)','Nhãn (English)'), required:true,
        value: existing ? (existing.label||existing.label_en||'') : '' },
      { key:'label_vi', label:t('Label (Vietnamese with diacritics)','Nhãn (Tiếng Việt có dấu)'), required:true,
        value: existing ? (existing.label_vi||'') : '' },
      { key:'description_vi', label:t('Description (Vietnamese)','Mô tả (Tiếng Việt)'), type:'textarea', rows:3,
        value: existing ? (existing.description_vi||'') : '' },
      { key:'required_aal_level', label:t('Required AAL','AAL bắt buộc'), type:'select', value: existing ? (existing.required_aal_level||existing.required_aal||1) : 1,
        options:[{ value:1, label:'AAL1' },{ value:2, label:'AAL2' },{ value:3, label:'AAL3' }] },
      { key:'is_dangerous', label:t('Dangerous permission','Quyền nguy hiểm'), type:'checkbox',
        value: existing ? !!existing.is_dangerous : false,
        checkboxLabel:t('Mark as dangerous (UI shows ⚠ and forces extra confirm)','Đánh dấu nguy hiểm (UI hiện ⚠ và buộc xác nhận thêm)') }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: existing ? t('Edit permission','Sửa quyền') : t('New permission','Tạo quyền'),
      bodyEl: form.el, width:'600px',
      footerHtml:'<button class="btn-admin secondary" id="pe-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="pe-save">'+esc(t('Save','Lưu'))+'</button>'
    });
    modal.card.querySelector('#pe-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#pe-save').addEventListener('click', function(){
      var v = form.getValues();
      form.clearErrors();
      if (!v.permission_code || !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(v.permission_code)){
        form.setError('permission_code', t('Use group.action format (lowercase, dot-separated)','Định dạng group.action (chữ thường, ngăn cách bằng dấu chấm)')); return;
      }
      if (!v.label_en) { form.setError('label_en', t('Required','Bắt buộc')); return; }
      if (!v.label_vi) { form.setError('label_vi', t('Required','Bắt buộc')); return; }
      var p = existing
        ? UI.runtime.update('core_system','permission_catalog', existing.permission_code, v, existing.row_version)
        : UI.runtime.create('core_system','permission_catalog', v);
      p.then(function(){
        UI.audit(existing?'permission_catalog.update':'permission_catalog.create', v);
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        fetchPermissions().then(refresh);
      }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab — SoD Matrix
  // ════════════════════════════════════════════════════════════════════════════
  function renderSodMatrix(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchRoles(), fetchSodConflicts(), fetchSodViolations(), fetchSodWaivers(), fetchUsers()]).then(function(){
      UI.renderSubTabs(rootEl, [
        { key:'conflicts', label:t('Conflicts','Định nghĩa xung đột'), render:renderSodConflicts },
        { key:'violations', label:t('Active violations','Vi phạm hiện tại'), render:renderSodViolations },
        { key:'waivers', label:t('Waivers','Waiver đã cấp'), render:renderSodWaivers }
      ], {});
    }).catch(function(err){ rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderSodMatrix(rootEl); }); });
  }

  function renderSodConflicts(el){
    var head = UI.panelHeader(
      t('SoD conflict definitions','Định nghĩa xung đột tách trách nhiệm'),
      t('Pairs of roles that cannot be held by the same user. Severity "block" refuses assignment; "warn" only warns.',
        'Các cặp vai trò không được cấp đồng thời cho cùng một user. Mức "block" chặn cấp; "warn" chỉ cảnh báo.'),
      UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'sc-refresh' })
      + UI.btn(t('New conflict','Thêm xung đột'),{ icon:'＋', id:'sc-new' })
    );
    var rolesById = {}; state.roles.forEach(function(r){ rolesById[r.role_id] = r; });
    var columns = [
      { key:'pair', label:t('Conflict pair','Cặp xung đột'), render:function(c){
          var ra = rolesById[c.role_a_id], rb = rolesById[c.role_b_id];
          return '<div style="font-weight:500">'+esc(c.label_vi||c.label||((ra&&ra.role_label_vi)||c.role_a_id)+' ↔ '+((rb&&rb.role_label_vi)||c.role_b_id))+'</div>'
            + '<div style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-3)">'+esc((ra&&ra.role_code)||'?')+' ↔ '+esc((rb&&rb.role_code)||'?')+'</div>';
        } },
      { key:'severity', label:t('Severity','Mức độ'), width:'100px', render:function(c){
          return badge(c.severity||'block', c.severity==='block'?'block':(c.severity==='warn'?'warn':'muted'));
        } },
      { key:'rationale', label:t('Rationale','Lý do'), render:function(c){ return esc(c.rationale_vi||c.rationale||c.description||''); } },
      { key:'control_basis', label:t('Control basis','Căn cứ kiểm soát'), width:'170px', render:function(c){ return esc(c.control_basis||'COBIT 5 DSS06.03'); } },
      { key:'actions', label:'', width:'140px', render:function(c){
          var pk = c.conflict_id || c.id;
          return '<div style="display:flex;gap:4px"><button class="btn-admin secondary sm" data-edit-sod="'+UI.escapeAttr(pk)+'">'+esc(t('Edit','Sửa'))+'</button>'
            + '<button class="btn-admin secondary sm" data-del-sod="'+UI.escapeAttr(pk)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Remove','Xoá'))+'</button></div>';
        } }
    ];
    el.innerHTML = head;
    el.appendChild(UI.buildTable(columns, state.sodConflicts, { rowKey:'id', emptyMessage:t('No SoD conflicts defined','Chưa có xung đột nào') }));
    el.querySelector('#sc-refresh').addEventListener('click', function(){ fetchSodConflicts().then(function(){ renderSodConflicts(el); }); });
    el.querySelector('#sc-new').addEventListener('click', function(){ openSodConflictEditor(null, el); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-edit-sod]'), function(b){
      b.addEventListener('click', function(){ openSodConflictEditor(state.sodConflicts.find(function(c){ return String(c.conflict_id||c.id)===b.getAttribute('data-edit-sod'); }), el); });
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-del-sod]'), function(b){
      b.addEventListener('click', function(){
        var pk = b.getAttribute('data-del-sod');
        var c = state.sodConflicts.find(function(x){ return String(x.conflict_id||x.id)===pk; });
        UI.confirmDestructive({ title:t('Remove SoD conflict','Xoá xung đột SoD'), requireReason:true }).then(function(r){
          if (!r||!r.confirmed) return;
          UI.runtime.delete('core_system','role_sod_conflict', pk, c && c.row_version).then(function(){
            UI.audit('rbac.sod.delete', { id: id, reason: r.reason });
            UI.toast(t('Removed','Đã xoá'),'ok');
            fetchSodConflicts().then(function(){ renderSodConflicts(el); });
          }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
        });
      });
    });
  }

  function openSodConflictEditor(existing, hostEl){
    // role_a_id / role_b_id are UUIDs in the schema; use role_id as option value, show role_code+label.
    var roleOpts = state.roles.map(function(r){ return { value:r.role_id, label:(r.role_label_vi||r.role_label||r.role_code)+' ('+r.role_code+')' }; });
    var fields = [
      { key:'role_a_id', label:t('Role A','Vai trò A'), type:'select', required:true,
        value: existing ? existing.role_a_id : '', options: roleOpts },
      { key:'role_b_id', label:t('Role B','Vai trò B'), type:'select', required:true,
        value: existing ? existing.role_b_id : '', options: roleOpts },
      { key:'severity', label:t('Severity','Mức độ'), type:'select', required:true,
        value: existing ? (existing.severity||'block') : 'block',
        options:[{ value:'block', label:t('block — refuse assignment','block — chặn cấp') },{ value:'warn', label:t('warn — warning only','warn — chỉ cảnh báo') }] },
      { key:'label', label:t('Label (English)','Nhãn (English)'), required:true,
        value: existing ? (existing.label||'') : '' },
      { key:'label_vi', label:t('Label (VI with diacritics)','Nhãn (Tiếng Việt có dấu)'), required:true,
        value: existing ? (existing.label_vi||'') : '' },
      { key:'rationale_vi', label:t('Rationale (VI)','Lý do (Tiếng Việt)'), type:'textarea', rows:3, required:true,
        value: existing ? (existing.rationale_vi||existing.description||'') : '' },
      { key:'control_basis', label:t('Control basis (citation)','Căn cứ kiểm soát'),
        value: existing ? (existing.control_basis||'') : 'COBIT 5 DSS06.03',
        placeholder: 'COBIT 5 DSS06.03, ISO 27001 A.6.1.2, SOX §404' }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title: existing ? t('Edit SoD conflict','Sửa xung đột SoD') : t('New SoD conflict','Thêm xung đột SoD'),
      bodyEl: form.el, width:'600px',
      footerHtml:'<button class="btn-admin secondary" id="se-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="se-save">'+esc(t('Save','Lưu'))+'</button>'
    });
    modal.card.querySelector('#se-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#se-save').addEventListener('click', function(){
      var v = form.getValues();
      if (v.role_a_id === v.role_b_id){ UI.toast(t('Pair must be two different roles','Cặp phải là 2 vai trò khác nhau'),'warn'); return; }
      var pk = existing && (existing.conflict_id || existing.id);
      var p = existing
        ? UI.runtime.update('core_system','role_sod_conflict', pk, v, existing.row_version)
        : UI.runtime.create('core_system','role_sod_conflict', v);
      p.then(function(){
        UI.audit(existing?'rbac.sod.update':'rbac.sod.create', v);
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        fetchSodConflicts().then(function(){ renderSodConflicts(hostEl); });
      }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
    });
  }

  function renderSodViolations(el){
    var head = UI.panelHeader(
      t('Active SoD violations','Vi phạm SoD đang hoạt động'),
      t('Users currently holding conflicting roles. Cells in red are unwaived; in amber have an active waiver.',
        'User đang giữ các vai trò xung đột. Đỏ = chưa có waiver; vàng = có waiver hiệu lực.'),
      UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'sv-refresh' })
    );
    var columns = [
      { key:'user_id', label:t('User','User'), render:function(v){
          var u = state.users.find(function(x){ return String(x.id)===String(v.user_id) || x.username === v.user_id; });
          return '<div style="font-weight:500">'+esc((u&&(u.full_name||u.username))||v.user_id)+'</div>'
            + '<div style="font-size:11px;color:var(--text-3)">'+esc(v.user_id)+'</div>';
        } },
      { key:'roles', label:t('Conflicting roles','Vai trò xung đột'), render:function(v){ return badge(v.role_code_a||'','info')+' ↔ '+badge(v.role_code_b||'','info'); } },
      { key:'severity', label:t('Severity','Mức độ'), width:'90px', render:function(v){ return badge(v.severity||'block', v.severity==='block'?'block':(v.severity==='warn'?'warn':'muted')); } },
      { key:'waiver', label:t('Waiver','Waiver'), width:'130px', render:function(v){
          return v.waiver_id ? badge(t('Active','Có hiệu lực'),'warn') : badge(t('None','Không có'),'block');
        } },
      { key:'detected_at', label:t('Detected','Phát hiện'), width:'140px', render:function(v){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc((v.detected_at||'').slice(0,10))+'</span>'; } }
    ];
    el.innerHTML = head;
    el.appendChild(UI.buildTable(columns, state.sodViolations, { rowKey:function(v){ return v.user_id+'_'+v.role_code_a+'_'+v.role_code_b; }, emptyMessage:t('No active violations','Không có vi phạm') }));
    el.querySelector('#sv-refresh').addEventListener('click', function(){ fetchSodViolations().then(function(){ renderSodViolations(el); }); });
  }

  function renderSodWaivers(el){
    var head = UI.panelHeader(
      t('SoD waivers','Waiver SoD'),
      t('Approved exceptions to SoD policy. Each waiver carries an expiry, justification, and approver identity.',
        'Ngoại lệ đã được phê duyệt. Mỗi waiver có hạn, lý do và danh tính người phê duyệt.'),
      UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'sw-refresh' })
    );
    var columns = [
      { key:'user_id', label:t('User','User'), render:function(w){ return esc(w.user_id||'—'); } },
      { key:'pair', label:t('Pair','Cặp'), render:function(w){ return badge(w.role_code_a||'','info')+' ↔ '+badge(w.role_code_b||'','info'); } },
      { key:'reason', label:t('Reason','Lý do'), render:function(w){ return esc(w.reason||''); } },
      { key:'approved_by', label:t('Approved by','Người duyệt'), width:'160px', render:function(w){ return esc(w.approved_by||'—'); } },
      { key:'expires_at', label:t('Expires','Hết hạn'), width:'130px', render:function(w){
          if (!w.expires_at) return badge(t('No expiry','Vĩnh viễn'),'warn');
          var expired = new Date(w.expires_at) <= new Date();
          return '<span style="font-family:ui-monospace,monospace;font-size:11px;color:'+(expired?'var(--red-dark,#991b1b)':'var(--text-2)')+'">'+esc(w.expires_at.slice(0,10))+'</span>';
        } },
      { key:'actions', label:'', width:'130px', render:function(w){
          return w.is_revoked ? badge(t('Revoked','Đã thu hồi'),'block') : '<button class="btn-admin secondary sm" data-revoke-waiver="'+UI.escapeAttr(w.id)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Revoke','Thu hồi'))+'</button>';
        } }
    ];
    el.innerHTML = head;
    el.appendChild(UI.buildTable(columns, state.sodWaivers, { rowKey:'id', emptyMessage:t('No waivers issued','Chưa có waiver nào') }));
    el.querySelector('#sw-refresh').addEventListener('click', function(){ fetchSodWaivers().then(function(){ renderSodWaivers(el); }); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-revoke-waiver]'), function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-revoke-waiver');
        var w = state.sodWaivers.find(function(x){ return String(x.id)===id; });
        UI.confirmDestructive({ title:t('Revoke waiver','Thu hồi waiver'), requireReason:true }).then(function(r){
          if (!r||!r.confirmed) return;
          UI.runtime.update('core_system','role_sod_waiver', id, { is_revoked:true, revoke_reason: r.reason, revoked_at: new Date().toISOString() }, w && w.row_version)
            .then(function(){
              UI.audit('rbac.sod.waiver.revoke', { id: id, reason: r.reason });
              UI.toast(t('Revoked','Đã thu hồi'),'ok');
              fetchSodWaivers().then(function(){ renderSodWaivers(el); });
            }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
        });
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Tab — Access Reviews
  // ════════════════════════════════════════════════════════════════════════════
  function renderAccessReviews(rootEl){
    rootEl.innerHTML = UI.loadingHtml();
    Promise.all([fetchCampaigns(), fetchRoles(), fetchUsers()]).then(function(){
      var search = '';
      var statusFilter = 'all';
      function rerender(){
        var rows = state.campaigns.filter(function(c){
          var st = c.status || 'scheduled';
          if (statusFilter !== 'all' && st !== statusFilter) return false;
          if (!search) return true;
          var hay = ((c.name||c.title||'')+' '+(c.name_vi||'')+' '+(c.campaign_code||'')+' '+(c.description||'')).toLowerCase();
          return hay.indexOf(search.toLowerCase()) >= 0;
        });
        var head = UI.panelHeader(
          t('Access review campaigns','Chiến dịch đánh giá phân quyền'),
          t('Periodic re-certification of user-role assignments. Reviewers attest each item; closed campaigns are immutable evidence.',
            'Tái xác nhận định kỳ việc cấp vai trò. Người đánh giá xác nhận từng mục; chiến dịch đã đóng là bằng chứng bất biến.'),
          UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'ac-refresh' })
          + UI.btn(t('Open campaign','Mở chiến dịch'),{ icon:'＋', id:'ac-new' })
        );
        var kpi = UI.kpiRow([
          UI.kpiCard(t('Active','Đang chạy'), state.campaigns.filter(function(c){ var s=c.status||''; return s==='in_progress'||s==='active'||s==='open'; }).length, '', 'info'),
          UI.kpiCard(t('Scheduled','Lên lịch'), state.campaigns.filter(function(c){ return c.status==='scheduled'; }).length, '', 'muted'),
          UI.kpiCard(t('Closed','Đã đóng'), state.campaigns.filter(function(c){ return c.status==='closed'||c.status==='completed'; }).length, '', 'ok'),
          UI.kpiCard(t('Overdue','Quá hạn'), state.campaigns.filter(function(c){ return c.status!=='closed' && c.status!=='completed' && (c.deadline_at||c.deadline) && new Date(c.deadline_at||c.deadline) < new Date(); }).length, '', 'warn')
        ]);
        var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
          + '<input type="search" id="ar-search" placeholder="'+esc(t('Search campaign…','Tìm chiến dịch…'))+'" value="'+UI.escapeAttr(search)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:280px">'
          + '<select id="ar-status" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          +   '<option value="all">'+esc(t('All status','Tất cả'))+'</option>'
          +   '<option value="open"'+(statusFilter==='open'?' selected':'')+'>'+esc(t('Open','Đang chạy'))+'</option>'
          +   '<option value="closed"'+(statusFilter==='closed'?' selected':'')+'>'+esc(t('Closed','Đã đóng'))+'</option>'
          + '</select>'
          + '</div>';
        var columns = [
          { key:'name', label:t('Campaign','Chiến dịch'), render:function(c){
              return '<div style="font-weight:500">'+esc(c.name_vi||c.name||c.title||c.campaign_code||'')+'</div>'
                + '<div style="font-size:11px;color:var(--text-3)">'+esc(c.campaign_code||'')+(c.description?' · '+esc(c.description.slice(0,60)):'')+'</div>';
            } },
          { key:'scheduled_for', label:t('Scheduled','Lịch bắt đầu'), width:'120px', render:function(c){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc((c.scheduled_for||c.opened_at||'').slice(0,10))+'</span>'; } },
          { key:'deadline_at', label:t('Deadline','Hạn chót'), width:'120px', render:function(c){
              var dl = c.deadline_at || c.deadline;
              if (!dl) return '—';
              var late = c.status!=='closed' && c.status!=='completed' && new Date(dl) < new Date();
              return '<span style="font-family:ui-monospace,monospace;font-size:11px;color:'+(late?'var(--red-dark,#991b1b)':'var(--text-2)')+'">'+esc(dl.slice(0,10))+'</span>';
            } },
          { key:'progress', label:t('Progress','Tiến độ'), width:'170px', render:function(c){
              var done = c.items_completed || c.attested_items || 0, total = c.items_total || c.target_items || 0;
              var pct = total ? Math.round(done*100/total) : 0;
              return '<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:6px;border-radius:3px;background:var(--surface-2,#f9fafb);overflow:hidden;border:1px solid var(--border-1,#e5e7eb)"><div style="height:100%;width:'+pct+'%;background:var(--brand-primary,#4f46e5)"></div></div><span style="font-size:11px;color:var(--text-3);font-family:ui-monospace,monospace">'+done+'/'+total+'</span></div>';
            } },
          { key:'status', label:t('Status','Trạng thái'), width:'120px', render:function(c){
              var s = c.status||'scheduled';
              var tone = (s==='closed'||s==='completed')?'ok':(s==='in_progress'||s==='active'?'info':(s==='scheduled'?'warn':'muted'));
              return badge(s, tone);
            } },
          { key:'actions', label:'', width:'190px', render:function(c){
              var s = c.status || 'scheduled';
              var pk = c.campaign_id || c.id;
              var open = (s==='scheduled'||s==='in_progress'||s==='active'||s==='open');
              if (open){
                return '<div style="display:flex;gap:4px"><button class="btn-admin secondary sm" data-open-camp="'+UI.escapeAttr(pk)+'">'+esc(t('Workspace','Mở workspace'))+'</button>'
                  + '<button class="btn-admin secondary sm" data-close-camp="'+UI.escapeAttr(pk)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Close','Đóng'))+'</button></div>';
              }
              return '<button class="btn-admin secondary sm" data-open-camp="'+UI.escapeAttr(pk)+'">'+esc(t('View','Xem'))+'</button>';
            } }
        ];
        rootEl.innerHTML = head + kpi + toolbar;
        rootEl.appendChild(UI.buildTable(columns, rows, { rowKey:'id', emptyMessage:t('No campaigns','Chưa có chiến dịch nào') }));
        rootEl.querySelector('#ac-refresh').addEventListener('click', function(){ fetchCampaigns().then(rerender); });
        rootEl.querySelector('#ac-new').addEventListener('click', function(){ openNewCampaignDialog(rerender); });
        rootEl.querySelector('#ar-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 220));
        rootEl.querySelector('#ar-status').addEventListener('change', function(e){ statusFilter = e.target.value; rerender(); });
        Array.prototype.forEach.call(rootEl.querySelectorAll('[data-open-camp]'), function(b){
          b.addEventListener('click', function(){ openCampaignWorkspace(state.campaigns.find(function(c){ return String(c.campaign_id||c.id)===b.getAttribute('data-open-camp'); })); });
        });
        Array.prototype.forEach.call(rootEl.querySelectorAll('[data-close-camp]'), function(b){
          b.addEventListener('click', function(){
            var pk = b.getAttribute('data-close-camp');
            var c = state.campaigns.find(function(x){ return String(x.campaign_id||x.id)===pk; });
            var id = pk;
            UI.confirmDestructive({
              title: t('Close campaign','Đóng chiến dịch'),
              message: t('Closing locks the campaign. Pending items will be marked as "no decision" and counted as audit findings.',
                         'Đóng sẽ khoá chiến dịch. Mục chưa quyết sẽ tính là "không quyết định" và ghi vào finding.'),
              requireReason: true
            }).then(function(r){
              if (!r||!r.confirmed) return;
              UI.fetchJson('/api/v1/access-review/campaigns/'+encodeURIComponent(id)+':close', {
                method:'POST', body: { reason: r.reason }
              }).then(function(){
                UI.audit('access_review.close', { campaign_id: id, reason: r.reason });
                UI.toast(t('Closed','Đã đóng'),'ok');
                fetchCampaigns().then(rerender);
              }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
            });
          });
        });
      }
      rerender();
    }).catch(function(err){ rootEl.innerHTML = UI.errorHtml(err && err.message, function(){ renderAccessReviews(rootEl); }); });
  }

  function openNewCampaignDialog(refresh){
    var fields = [
      { key:'campaign_code', label:t('Campaign code','Mã chiến dịch'), required:true, placeholder:'ARV-2026-Q2',
        hint:t('Short unique code','Mã ngắn duy nhất') },
      { key:'name', label:t('Name (English)','Tên (English)'), required:true, placeholder:'Q2 2026 access review' },
      { key:'name_vi', label:t('Name (Vietnamese with diacritics)','Tên (Tiếng Việt có dấu)'), required:true, placeholder:'Đánh giá phân quyền Q2/2026' },
      { key:'description_vi', label:t('Scope description (VI)','Mô tả phạm vi (Tiếng Việt)'), type:'textarea', rows:2, required:true,
        placeholder: 'vd: tất cả vai trò thuộc QA, tài chính, vận hành' },
      { key:'target_dept_codes', label:t('Department filter (comma-separated, blank=all)','Lọc phòng ban (ngăn cách bằng dấu phẩy, để trống = tất cả)') },
      { key:'scheduled_for', label:t('Scheduled start','Ngày bắt đầu'), required:true, value: new Date().toISOString().slice(0,10), placeholder:'2026-05-15' },
      { key:'deadline_at', label:t('Deadline','Hạn chót'), required:true, value: new Date(Date.now()+30*86400000).toISOString().slice(0,10), placeholder:'2026-06-30' }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title:t('Open access review campaign','Mở chiến dịch đánh giá phân quyền'), bodyEl: form.el, width:'600px',
      footerHtml:'<button class="btn-admin secondary" id="nc-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="nc-go">'+esc(t('Open','Mở'))+'</button>'
    });
    modal.card.querySelector('#nc-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#nc-go').addEventListener('click', function(){
      var v = form.getValues();
      var depts = (v.target_dept_codes || '').trim();
      var payload = {
        campaign_code: v.campaign_code,
        name: v.name, name_vi: v.name_vi,
        description: v.description_vi, description_vi: v.description_vi,
        target_dept_codes: depts ? depts.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : [],
        target_role_codes: [],
        scope_filter: {},
        scheduled_for: v.scheduled_for + 'T00:00:00Z',
        deadline_at: v.deadline_at + 'T23:59:59Z',
        status: 'scheduled'
      };
      UI.runtime.create('core_system','access_review_campaign', payload).then(function(saved){
        UI.audit('access_review.open', payload);
        UI.toast(t('Campaign opened','Đã mở chiến dịch'),'ok');
        modal.close();
        fetchCampaigns().then(refresh);
      }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
    });
  }

  function openCampaignWorkspace(camp){
    var drawer = UI.openDrawer({ title: (camp.title || camp.id) + (camp.status==='closed' ? ' · '+t('CLOSED','ĐÃ ĐÓNG') : ''), width:'820px' });
    drawer.bodyEl.innerHTML = UI.loadingHtml();
    fetchReviewItems(camp.id).then(function(){
      var items = state.reviewItems;
      var search = '';
      var decisionFilter = 'all';

      function rerender(){
        var rows = items.filter(function(it){
          if (decisionFilter !== 'all' && (it.decision||'pending') !== decisionFilter) return false;
          if (!search) return true;
          var hay = ((it.user_id||'')+' '+(it.role_code||'')+' '+(it.reviewer_id||'')+' '+(it.notes||'')).toLowerCase();
          return hay.indexOf(search.toLowerCase()) >= 0;
        });
        var summary = '<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">'
          + badge(t('Total: ','Tổng: ')+items.length,'info')
          + badge(t('Pending: ','Chờ: ')+items.filter(function(i){ return (i.decision||'pending')==='pending'; }).length,'warn')
          + badge(t('Confirmed: ','Xác nhận: ')+items.filter(function(i){ return i.decision==='confirm'; }).length,'ok')
          + badge(t('Revoked: ','Thu hồi: ')+items.filter(function(i){ return i.decision==='revoke'; }).length,'block')
          + '</div>';
        var toolbar = '<div style="display:flex;gap:8px;margin-bottom:10px">'
          + '<input type="search" id="cw-search" placeholder="'+esc(t('Search…','Tìm…'))+'" value="'+UI.escapeAttr(search)+'" style="padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;flex:1">'
          + '<select id="cw-decision" style="padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px">'
          +   '<option value="all">'+esc(t('All','Tất cả'))+'</option>'
          +   '<option value="pending"'+(decisionFilter==='pending'?' selected':'')+'>'+esc(t('Pending','Chờ'))+'</option>'
          +   '<option value="confirm"'+(decisionFilter==='confirm'?' selected':'')+'>'+esc(t('Confirmed','Xác nhận'))+'</option>'
          +   '<option value="revoke"'+(decisionFilter==='revoke'?' selected':'')+'>'+esc(t('Revoked','Thu hồi'))+'</option>'
          + '</select>'
          + '</div>';
        var listHtml = '<div style="display:flex;flex-direction:column;gap:6px">';
        if (!rows.length) listHtml += UI.emptyHtml(t('No items','Không có mục'));
        else rows.forEach(function(it){
          var u = state.users.find(function(x){ return String(x.id)===String(it.user_id) || x.username===it.user_id; });
          var d = it.decision || 'pending';
          listHtml += '<div style="padding:10px;background:var(--surface-2,#f9fafb);border:1px solid var(--border-1,#e5e7eb);border-radius:6px">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'
            +   '<div style="flex:1">'
            +     '<div style="font-weight:500;font-size:13px">'+esc((u&&(u.full_name||u.username))||it.user_id||'—')+' · '+esc(it.role_code||'')+'</div>'
            +     '<div style="font-size:11px;color:var(--text-3)">'+esc(t('Reviewer: ','Người đánh giá: '))+esc(it.reviewer_id||'—')+(it.notes ? ' · '+esc(it.notes) : '')+'</div>'
            +   '</div>'
            +   badge(d, d==='confirm'?'ok':(d==='revoke'?'block':'warn'))
            + '</div>'
            + (camp.status === 'open' && d === 'pending' ? '<div style="margin-top:8px;display:flex;gap:6px">'
                + '<button class="btn-admin sm" data-confirm="'+UI.escapeAttr(it.id)+'">'+esc(t('Confirm','Xác nhận'))+'</button>'
                + '<button class="btn-admin secondary sm" data-revoke-it="'+UI.escapeAttr(it.id)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Revoke','Thu hồi'))+'</button>'
              + '</div>' : '')
            + '</div>';
        });
        listHtml += '</div>';
        drawer.bodyEl.innerHTML = summary + toolbar + listHtml;

        drawer.bodyEl.querySelector('#cw-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 220));
        drawer.bodyEl.querySelector('#cw-decision').addEventListener('change', function(e){ decisionFilter = e.target.value; rerender(); });
        Array.prototype.forEach.call(drawer.bodyEl.querySelectorAll('[data-confirm]'), function(b){
          b.addEventListener('click', function(){ attestItem(b.getAttribute('data-confirm'), 'confirm', null, rerender); });
        });
        Array.prototype.forEach.call(drawer.bodyEl.querySelectorAll('[data-revoke-it]'), function(b){
          b.addEventListener('click', function(){
            UI.confirmDestructive({ title:t('Revoke role assignment','Thu hồi cấp vai trò'), requireReason:true }).then(function(r){
              if (!r||!r.confirmed) return;
              attestItem(b.getAttribute('data-revoke-it'), 'revoke', r.reason, rerender);
            });
          });
        });
      }

      function attestItem(itemId, decision, notes, refresh){
        var item = items.find(function(x){ return String(x.id)===itemId; });
        UI.runtime.update('core_system','access_review_item', itemId, {
          decision: decision, notes: notes, decided_at: new Date().toISOString()
        }, item && item.row_version).then(function(){
          UI.audit('access_review.attest', { item_id: itemId, decision: decision, notes: notes });
          UI.toast(t('Recorded','Đã ghi'),'ok');
          fetchReviewItems(camp.id).then(function(){ items = state.reviewItems; refresh(); });
        }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
      }

      rerender();
    }).catch(function(err){ drawer.bodyEl.innerHTML = UI.errorHtml(err && err.message); });
  }

  // ── Public dispatcher ───────────────────────────────────────────────────────
  window._renderAdminGovernanceTab = function(rootEl, slug){
    if (slug === 'permission_catalog') return renderPermissionCatalog(rootEl);
    if (slug === 'sod_matrix') return renderSodMatrix(rootEl);
    if (slug === 'access_review') return renderAccessReviews(rootEl);
    rootEl.innerHTML = UI.errorHtml(t('Unknown tab: '+slug,'Tab không xác định: '+slug));
  };
})();
