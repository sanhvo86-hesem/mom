/* ============================================================================
 * Admin Permissions Tabs — Module / Document / Portal Display
 * ----------------------------------------------------------------------------
 * Lazy-loaded by 02-state-auth-ui.js. Reads from the new RBAC schema
 * (migrations 160, 161, 167) via:
 *   * GET /api/v1/runtime/core_system/module_permission
 *   * GET /api/v1/runtime/core_system/modules_catalog
 *   * GET /api/v1/runtime/core_system/roles
 *   * GET /api/v1/runtime/core_system/document_permission_grant
 *   * GET /api/v1/runtime/core_system/portal_widget_catalog
 *   * GET /api/v1/runtime/core_system/portal_layout_template
 * No hardcoded colors — every visual token comes from existing CSS vars.
 * ========================================================================== */

(function(){
  'use strict';

  var t = (typeof window.lang === 'string' && window.lang === 'en')
    ? function(en, vi){ return en; }
    : function(en, vi){ return vi || en; };

  function escapeHtml(s){
    s = String(s == null ? '' : s);
    return s.replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function badge(label, tone){
    var bg = ({block:'var(--red-light,#fee2e2)',warn:'var(--yellow-light,#fef3c7)',info:'var(--blue-light,#dbeafe)',ok:'var(--green-light,#dcfce7)',muted:'var(--gray-100,#f3f4f6)'})[tone || 'muted'] || 'var(--gray-100,#f3f4f6)';
    var fg = ({block:'var(--red-dark,#991b1b)',warn:'var(--yellow-dark,#92400e)',info:'var(--blue-dark,#1e40af)',ok:'var(--green-dark,#166534)',muted:'var(--text-2,#4b5563)'})[tone || 'muted'] || 'var(--text-2,#4b5563)';
    return '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:'+bg+';color:'+fg+';white-space:nowrap">'+escapeHtml(label)+'</span>';
  }

  function loadingHtml(){
    return '<div class="hm-empty" style="padding:40px;text-align:center;color:var(--text-3)"><div style="font-size:24px;margin-bottom:8px">⏳</div>'+escapeHtml(t('Loading…','Đang tải…'))+'</div>';
  }

  function emptyHtml(message){
    return '<div class="hm-empty" style="padding:40px;text-align:center;color:var(--text-3)"><div style="font-size:32px;margin-bottom:8px">∅</div>'+escapeHtml(message)+'</div>';
  }

  function errorHtml(detail, retry){
    return '<div class="hm-empty" style="padding:40px;text-align:center">'
      + '<div style="font-size:32px;margin-bottom:8px;color:var(--red-dark,#991b1b)">⚠</div>'
      + '<div style="color:var(--text-1);margin-bottom:8px">'+escapeHtml(t('Failed to load','Không tải được'))+'</div>'
      + '<div style="font-size:12px;color:var(--text-3);margin-bottom:16px">'+escapeHtml(String(detail || ''))+'</div>'
      + (retry ? '<button class="btn-admin secondary" onclick="('+retry.toString()+')()">🔄 '+escapeHtml(t('Retry','Thử lại'))+'</button>' : '')
      + '</div>';
  }

  function panelHeader(title, subtitle, actionsHtml){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">'
      + '<div><div style="font-size:18px;font-weight:600;color:var(--text-1)">'+escapeHtml(title)+'</div>'
      + (subtitle ? '<div style="font-size:13px;color:var(--text-3);margin-top:2px">'+escapeHtml(subtitle)+'</div>' : '')
      + '</div><div style="display:flex;gap:8px;flex-wrap:wrap">'+(actionsHtml || '')+'</div></div>';
  }

  function kpiCard(label, value, tone){
    var border = ({block:'var(--red-light,#fecaca)',warn:'var(--yellow-light,#fde68a)',ok:'var(--green-light,#bbf7d0)'})[tone] || 'var(--border)';
    var labelColor = ({block:'var(--red-dark,#991b1b)',warn:'var(--yellow-dark,#92400e)',ok:'var(--green-dark,#166534)'})[tone] || 'var(--text-3)';
    return '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid '+border+'">'
      + '<div style="font-size:11px;color:'+labelColor+';text-transform:uppercase;letter-spacing:.5px">'+escapeHtml(label)+'</div>'
      + '<div style="font-size:20px;font-weight:600">'+escapeHtml(String(value))+'</div></div>';
  }

  function flagDot(value){
    return value
      ? '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:var(--green-dark,#166534);color:#fff;text-align:center;font-size:10px;line-height:14px">✓</span>'
      : '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:var(--gray-100,#f3f4f6);border:1px solid var(--border)"></span>';
  }

  function fmtDate(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', {year:'numeric',month:'short',day:'numeric'}); }
    catch(e){ return String(iso).slice(0,10); }
  }

  // ── 1. Phân quyền module — matrix view ─────────────────────────────────

  function renderModulePermissions(el){
    el.innerHTML = loadingHtml();
    Promise.all([
      fetch('/api/v1/runtime/core_system/module_permission?limit=1000', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/runtime/core_system/modules_catalog?limit=200&direction=asc&sort=sort_order', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/runtime/core_system/roles?limit=200&direction=asc&sort=rank_level', {credentials:'include'}).then(function(r){ return r.json(); })
    ]).then(function(out){
      var permsRes = out[0]; var modulesRes = out[1]; var rolesRes = out[2];
      if(!(permsRes && permsRes.ok && modulesRes && modulesRes.ok && rolesRes && rolesRes.ok)){
        el.innerHTML = errorHtml('module_permission_load_failed', function(){ window._renderAdminPermTab(document.getElementById('admin-content'), 'module_perms'); });
        return;
      }
      var perms = permsRes.records || [];
      var modules = (modulesRes.records || []).filter(function(m){ return !m.deleted_at; });
      var roles = (rolesRes.records || []).filter(function(r){ return r.is_active !== false; });

      // Index perms by (role_id, module_code)
      var permIndex = {};
      perms.forEach(function(p){
        permIndex[p.role_id + '|' + p.module_code] = p;
      });

      // Stats
      var stats = {
        total_grants: perms.length,
        full_grants:  perms.filter(function(p){ return p.can_view && p.can_create && p.can_update && p.can_delete && p.can_approve && p.can_export; }).length,
        view_only:    perms.filter(function(p){ return p.can_view && !p.can_create && !p.can_update && !p.can_delete; }).length,
        empty_cells:  perms.filter(function(p){ return !p.can_view && !p.can_create && !p.can_update && !p.can_delete && !p.can_approve && !p.can_export; }).length
      };

      var html = panelHeader(
        t('Module Permissions','Phân quyền module'),
        t(
          'Per-role module CRUD/approve/export matrix — replaces module_access_config.json. Sourced from module_permission table (NIST 800-162 ABAC scope envelope per row).',
          'Ma trận CRUD/duyệt/xuất theo vai trò × module — thay thế module_access_config.json. Lấy từ bảng module_permission (envelope ABAC NIST 800-162 mỗi dòng).'
        ),
        ''
      );

      html += '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">';
      html += kpiCard(t('Roles × Modules','Vai trò × Module'), roles.length + ' × ' + modules.length);
      html += kpiCard(t('Total grants','Tổng quyền cấp'), stats.total_grants);
      html += kpiCard(t('Full grants','Toàn quyền'), stats.full_grants, stats.full_grants > 0 ? 'block' : 'muted');
      html += kpiCard(t('View only','Chỉ xem'), stats.view_only, 'info');
      html += kpiCard(t('Empty cells','Ô trống'), stats.empty_cells, 'muted');
      html += '</div>';

      html += '<div style="font-size:12px;color:var(--text-3);margin-bottom:8px">'+escapeHtml(t('Legend: V=View, C=Create, U=Update, D=Delete, A=Approve, X=Export','Chú thích: V=Xem, C=Tạo, U=Sửa, D=Xoá, A=Duyệt, X=Xuất'))+'</div>';

      // Matrix table
      html += '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:11px">';
      html += '<thead><tr style="background:var(--surface-2);position:sticky;top:0">';
      html += '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border);position:sticky;left:0;background:var(--surface-2);z-index:1;min-width:200px">'+escapeHtml(t('Role','Vai trò'))+'</th>';
      modules.forEach(function(m){
        var labelLocal = lang === 'en' ? (m.label || m.label_vi) : (m.label_vi || m.label);
        html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid var(--border);min-width:90px;font-size:10px"><div style="font-weight:600">'+escapeHtml(labelLocal)+'</div><div style="color:var(--text-3);font-weight:400;font-family:monospace">'+escapeHtml(m.module_code)+'</div></th>';
      });
      html += '</tr></thead><tbody>';

      roles.slice(0, 50).forEach(function(r){
        var roleLabelLocal = lang === 'en' ? (r.role_label || r.role_label_vi) : (r.role_label_vi || r.role_label);
        html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">';
        html += '<td style="padding:6px 12px;position:sticky;left:0;background:var(--surface);border-right:1px solid var(--border)">'
              + (r.icon_emoji ? '<span style="margin-right:4px">'+escapeHtml(r.icon_emoji)+'</span>' : '')
              + '<span style="font-weight:500">'+escapeHtml(roleLabelLocal || r.role_code)+'</span>'
              + (r.is_admin_tier ? ' '+badge(t('Admin','Admin'),'block') : '')
              + '<div style="font-size:10px;color:var(--text-3);font-family:monospace">'+escapeHtml(r.role_code)+'</div>'
              + '</td>';
        modules.forEach(function(m){
          var p = permIndex[r.role_id + '|' + m.module_code];
          if(!p){
            html += '<td style="padding:4px;text-align:center;color:var(--text-3)">—</td>';
          } else {
            html += '<td style="padding:4px;text-align:center"><div style="display:flex;gap:2px;justify-content:center" title="V/C/U/D/A/X">'
                  + flagDot(p.can_view) + flagDot(p.can_create) + flagDot(p.can_update)
                  + flagDot(p.can_delete) + flagDot(p.can_approve) + flagDot(p.can_export)
                  + '</div></td>';
          }
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';

      if(roles.length > 50){
        html += '<div style="font-size:11px;color:var(--text-3);margin-top:8px">'+escapeHtml(t('Showing 50 of ','Hiện 50 trên ')) + roles.length + ' '+escapeHtml(t('roles','vai trò'))+'</div>';
      }

      el.innerHTML = html;
    }).catch(function(e){
      el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminPermTab(document.getElementById('admin-content'), 'module_perms'); });
    });
  }

  // ── 2. Phân quyền tài liệu — grant timeline ─────────────────────────────

  function renderDocPermissions(el){
    el.innerHTML = loadingHtml();
    fetch('/api/v1/runtime/core_system/document_permission_grant?limit=200&direction=desc&sort=granted_at', {credentials:'include'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(!(j && j.ok)){
          el.innerHTML = errorHtml(j && j.error || 'doc_grant_load_failed', function(){ window._renderAdminPermTab(document.getElementById('admin-content'), 'doc_perms'); });
          return;
        }
        var grants = j.records || [];

        var stats = {
          total: grants.length,
          grant: grants.filter(function(g){ return g.effect === 'grant'; }).length,
          deny:  grants.filter(function(g){ return g.effect === 'deny'; }).length,
          emergency: grants.filter(function(g){ return g.is_emergency; }).length,
          expiring: grants.filter(function(g){ return g.expires_at && new Date(g.expires_at) < new Date(Date.now() + 30*86400000); }).length
        };

        var html = panelHeader(
          t('Document Permission Grants','Phân quyền tài liệu'),
          t(
            'Per-document grant/deny ACL (subject × pattern × action × effect). Deny takes precedence — AWS IAM convention. Replaces user_doc_overrides.json blob.',
            'ACL tài liệu cấp nhân/tài liệu (chủ thể × mẫu × hành động × hiệu lực). Deny ưu tiên hơn grant — quy ước AWS IAM. Thay thế blob user_doc_overrides.json.'
          ),
          ''
        );

        html += '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">';
        html += kpiCard(t('Total grants','Tổng phân quyền'), stats.total);
        html += kpiCard(t('Grant','Cho phép'), stats.grant, stats.grant > 0 ? 'ok' : 'muted');
        html += kpiCard(t('Deny','Từ chối'), stats.deny, stats.deny > 0 ? 'block' : 'muted');
        html += kpiCard(t('Emergency','Khẩn cấp'), stats.emergency, stats.emergency > 0 ? 'block' : 'muted');
        html += kpiCard(t('Expiring 30d','Hết hạn ≤ 30 ngày'), stats.expiring, stats.expiring > 0 ? 'warn' : 'muted');
        html += '</div>';

        if(grants.length === 0){
          html += emptyHtml(t('No document permission grants yet. Use the runtime API or admin UI to add per-doc/per-user overrides.','Chưa có phân quyền tài liệu nào. Dùng runtime API hoặc giao diện admin để thêm override theo tài liệu/người dùng.'));
        } else {
          html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
          html += '<thead><tr style="background:var(--surface-2)">'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Subject','Chủ thể'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Pattern','Mẫu tài liệu'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Action','Hành động'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Effect','Hiệu lực'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Reason','Lý do'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Granted at','Cấp lúc'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Expires','Hết hạn'))+'</th>'
            + '</tr></thead><tbody>';
          grants.forEach(function(g){
            html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
              + '<td style="padding:8px 12px"><span style="font-size:11px;color:var(--text-3)">'+escapeHtml(g.subject_type)+':</span> <code style="font-family:monospace;font-size:12px">'+escapeHtml(g.subject_id)+'</code></td>'
              + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:12px;color:var(--brand-primary,#1565c0)">'+escapeHtml(g.doc_pattern)+'</code></td>'
              + '<td style="padding:8px 12px">'+escapeHtml(g.action || '—')+'</td>'
              + '<td style="padding:8px 12px">'+badge(g.effect || '—', g.effect === 'deny' ? 'block' : 'ok')+(g.is_emergency ? ' '+badge(t('Emergency','Khẩn cấp'),'block') : '')+'</td>'
              + '<td style="padding:8px 12px;color:var(--text-2);max-width:240px;font-size:11px">'+escapeHtml(g.reason || '')+'</td>'
              + '<td style="padding:8px 12px;font-size:11px;color:var(--text-3)">'+escapeHtml(fmtDate(g.granted_at))+'</td>'
              + '<td style="padding:8px 12px;font-size:11px;color:var(--text-3)">'+(g.expires_at ? escapeHtml(fmtDate(g.expires_at)) : '<span style="color:var(--text-3)">∞</span>')+'</td>'
              + '</tr>';
          });
          html += '</tbody></table></div>';
        }

        el.innerHTML = html;
      })
      .catch(function(e){
        el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminPermTab(document.getElementById('admin-content'), 'doc_perms'); });
      });
  }

  // ── 3. Hiển thị portal — widget catalog + layouts ────────────────────────

  function renderPortalDisplay(el){
    el.innerHTML = loadingHtml();
    Promise.all([
      fetch('/api/v1/runtime/core_system/portal_widget_catalog?limit=200&direction=asc&sort=widget_code', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/runtime/core_system/portal_layout_template?limit=50&direction=asc&sort=scope_kind', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/portal-display/effective-layout', {credentials:'include'}).then(function(r){ return r.json(); })
    ]).then(function(out){
      var widgetsRes = out[0]; var layoutsRes = out[1]; var meRes = out[2];
      if(!(widgetsRes && widgetsRes.ok)){
        el.innerHTML = errorHtml(widgetsRes && widgetsRes.error || 'portal_widget_load_failed', function(){ window._renderAdminPermTab(document.getElementById('admin-content'), 'portal_display'); });
        return;
      }
      var widgets = widgetsRes.records || [];
      var layouts = (layoutsRes && layoutsRes.ok && layoutsRes.records) || [];
      var myLayout = (meRes && meRes.ok && meRes.data) || null;

      var byKind = {};
      widgets.forEach(function(w){
        var k = String(w.render_kind || 'other');
        byKind[k] = (byKind[k] || 0) + 1;
      });

      var html = panelHeader(
        t('Portal Display','Hiển thị portal'),
        t(
          'Widget catalogue + layout templates — replaces portal_display_config.json. RBAC-aware: each widget declares required_permissions[] and is hidden from users lacking them. Layout resolution: user > role > dept > plant > global.',
          'Catalog widget + bố cục — thay thế portal_display_config.json. Nhận biết RBAC: mỗi widget khai báo required_permissions[] và ẩn khỏi người dùng không đủ quyền. Thứ tự bố cục: user > role > dept > plant > global.'
        ),
        ''
      );

      html += '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">';
      html += kpiCard(t('Widgets','Widget'), widgets.length);
      html += kpiCard(t('Active','Đang hoạt động'), widgets.filter(function(w){ return w.is_active; }).length, 'ok');
      html += kpiCard(t('Layout templates','Bố cục lưu sẵn'), layouts.length);
      html += kpiCard(t('Default layouts','Bố cục mặc định'), layouts.filter(function(l){ return l.is_default; }).length, 'info');
      html += kpiCard(t('Render kinds','Loại render'), Object.keys(byKind).length);
      html += '</div>';

      if(myLayout){
        var myLabelLocal = lang === 'en' ? (myLayout.label || myLayout.label_vi) : (myLayout.label_vi || myLayout.label);
        html += '<div style="background:var(--blue-light,#dbeafe);border:1px solid var(--blue-light,#bfdbfe);border-radius:8px;padding:12px;margin-bottom:20px">';
        html += '<div style="font-weight:600;color:var(--blue-dark,#1e40af);margin-bottom:4px">📐 '+escapeHtml(t('Your effective layout','Bố cục đang áp dụng cho bạn'))+'</div>';
        html += '<div style="font-size:13px;color:var(--text-1)"><strong>'+escapeHtml(myLabelLocal || myLayout.layout_code || '—')+'</strong> — '+escapeHtml(t('scope','phạm vi'))+': '+escapeHtml(myLayout.scope_kind || 'global')+(myLayout.scope_id ? ' = '+escapeHtml(myLayout.scope_id) : '')+'</div>';
        html += '</div>';
      }

      html += '<div style="margin-bottom:24px">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Widget catalogue','Catalog widget'))+'</div>';
      html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
      html += '<thead><tr style="background:var(--surface-2)">'
        + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Code','Mã'))+'</th>'
        + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Label','Nhãn'))+'</th>'
        + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Render','Loại render'))+'</th>'
        + '<th style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Refresh (s)','Làm mới (s)'))+'</th>'
        + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Required perms','Quyền yêu cầu'))+'</th>'
        + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Status','Trạng thái'))+'</th>'
        + '</tr></thead><tbody>';
      widgets.forEach(function(w){
        var labelLocal = lang === 'en' ? (w.label || w.label_vi) : (w.label_vi || w.label);
        var requiredPerms = Array.isArray(w.required_permissions) ? w.required_permissions : [];
        html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
          + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:12px;color:var(--brand-primary,#1565c0)">'+escapeHtml(w.widget_code)+'</code></td>'
          + '<td style="padding:8px 12px">'+escapeHtml(labelLocal || '')+'</td>'
          + '<td style="padding:8px 12px">'+badge(w.render_kind || '—','info')+'</td>'
          + '<td style="padding:8px 12px;text-align:right;color:var(--text-3)">'+escapeHtml(String(w.refresh_seconds || ''))+'</td>'
          + '<td style="padding:8px 12px;font-size:11px;color:var(--text-3)">'+(requiredPerms.length ? escapeHtml(requiredPerms.join(' · ')) : '<span style="color:var(--text-3)">'+escapeHtml(t('public','công khai'))+'</span>')+'</td>'
          + '<td style="padding:8px 12px">'+(w.is_active ? badge(t('Active','Hoạt động'),'ok') : badge(t('Inactive','Tắt'),'muted'))+'</td>'
          + '</tr>';
      });
      html += '</tbody></table></div></div>';

      html += '<div>';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Layout templates','Bố cục lưu sẵn'))+'</div>';
      if(layouts.length === 0){
        html += emptyHtml(t('No saved layouts.','Chưa có bố cục nào.'));
      } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">';
        layouts.forEach(function(l){
          var labelLocal = lang === 'en' ? (l.label || l.label_vi) : (l.label_vi || l.label);
          var widgetCount = Array.isArray(l.layout_json) ? l.layout_json.length : (typeof l.layout_json === 'string' ? (l.layout_json.match(/widget_code/g) || []).length : 0);
          html += '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:14px">';
          html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">'
              +     '<div style="font-weight:600">'+escapeHtml(labelLocal || l.layout_code)+'</div>'
              +     (l.is_default ? badge(t('Default','Mặc định'),'info') : '')
              +   '</div>';
          html += '<div style="font-size:11px;color:var(--text-3);margin-bottom:6px"><code>'+escapeHtml(l.layout_code)+'</code> — '+escapeHtml(l.scope_kind || 'global')+(l.scope_id ? ' = '+escapeHtml(l.scope_id) : '')+'</div>';
          html += '<div style="font-size:12px;color:var(--text-2)">'+escapeHtml(t('Grid: ','Lưới: '))+(l.grid_cols || 12)+' '+escapeHtml(t('cols, row height: ','cột, chiều cao dòng: '))+(l.grid_row_height_px || 80)+'px</div>';
          html += '<div style="font-size:12px;color:var(--text-2)">'+widgetCount+' '+escapeHtml(t('widgets','widget'))+'</div>';
          html += '</div>';
        });
        html += '</div>';
      }
      html += '</div>';

      el.innerHTML = html;
    }).catch(function(e){
      el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminPermTab(document.getElementById('admin-content'), 'portal_display'); });
    });
  }

  // ── Public dispatcher ────────────────────────────────────────────────────

  window._renderAdminPermTab = function(el, slug){
    if(!el) return;
    if(slug === 'module_perms')   return renderModulePermissions(el);
    if(slug === 'doc_perms')      return renderDocPermissions(el);
    if(slug === 'portal_display') return renderPortalDisplay(el);
    el.innerHTML = '<div class="hm-empty">'+escapeHtml(t('Unknown permissions tab','Tab phân quyền không xác định'))+': '+escapeHtml(String(slug))+'</div>';
  };

})();
