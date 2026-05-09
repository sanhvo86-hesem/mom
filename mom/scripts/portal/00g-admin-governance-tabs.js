/* ============================================================================
 * Admin Governance Tabs — Permission Catalog / SoD Matrix / Access Reviews
 * ----------------------------------------------------------------------------
 * Lazy-loaded by 02-state-auth-ui.js when the user clicks one of these tabs.
 * Reads from the new RBAC schema (migrations 159, 162, 164) via:
 *   * GET /api/v1/runtime/core_system/permission_catalog
 *   * GET /api/v1/runtime/core_system/role_sod_conflict
 *   * GET /api/v1/rbac/sod-violations               (currently-violating users)
 *   * GET /api/v1/runtime/core_system/access_review_campaign
 *   * GET /api/v1/access-review/progress            (per-campaign KPI)
 * No hardcoded values — all colors come from existing CSS vars.
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
    var bg = ({
      block: 'var(--red-light, #fee2e2)',
      warn:  'var(--yellow-light, #fef3c7)',
      info:  'var(--blue-light, #dbeafe)',
      ok:    'var(--green-light, #dcfce7)',
      muted: 'var(--gray-100, #f3f4f6)'
    })[tone || 'muted'] || 'var(--gray-100,#f3f4f6)';
    var fg = ({
      block: 'var(--red-dark, #991b1b)',
      warn:  'var(--yellow-dark, #92400e)',
      info:  'var(--blue-dark, #1e40af)',
      ok:    'var(--green-dark, #166534)',
      muted: 'var(--text-2, #4b5563)'
    })[tone || 'muted'] || 'var(--text-2,#4b5563)';
    return '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:'+bg+';color:'+fg+';white-space:nowrap">'+escapeHtml(label)+'</span>';
  }

  function loadingHtml(){
    return '<div class="hm-empty" style="padding:40px;text-align:center;color:var(--text-3)">'
      + '<div style="font-size:24px;margin-bottom:8px">⏳</div>'
      + escapeHtml(t('Loading…','Đang tải…'))
      + '</div>';
  }

  function emptyHtml(message){
    return '<div class="hm-empty" style="padding:40px;text-align:center;color:var(--text-3)">'
      + '<div style="font-size:32px;margin-bottom:8px">∅</div>'
      + escapeHtml(message)
      + '</div>';
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
      + '<div>'
      +   '<div style="font-size:18px;font-weight:600;color:var(--text-1)">'+escapeHtml(title)+'</div>'
      +   (subtitle ? '<div style="font-size:13px;color:var(--text-3);margin-top:2px">'+escapeHtml(subtitle)+'</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'+(actionsHtml || '')+'</div>'
      + '</div>';
  }

  // ── 1. Permission Catalog ─────────────────────────────────────────────────

  function renderPermissionCatalog(el){
    el.innerHTML = loadingHtml();
    fetch('/api/v1/runtime/core_system/permission_catalog?limit=500&direction=asc&sort=sort_order', {credentials:'include'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(!(j && j.ok && Array.isArray(j.records))){
          el.innerHTML = errorHtml(j && j.error || 'permission_catalog_load_failed', function(){ window._renderAdminGovernanceTab(document.getElementById('admin-content'), 'permission_catalog'); });
          return;
        }
        var rows = j.records;
        var groups = {};
        rows.forEach(function(r){
          var g = String(r.module_code || 'misc');
          (groups[g] = groups[g] || []).push(r);
        });
        var moduleKeys = Object.keys(groups).sort();

        var totals = {
          all:        rows.length,
          dangerous:  rows.filter(function(r){ return r.is_dangerous; }).length,
          aal3:       rows.filter(function(r){ return Number(r.required_aal_level) === 3; }).length,
          aal2:       rows.filter(function(r){ return Number(r.required_aal_level) === 2; }).length,
          aal1:       rows.filter(function(r){ return Number(r.required_aal_level) === 1; }).length
        };

        var html = panelHeader(
          t('Permission Catalog','Catalog quyền nguyên tử'),
          t(
            'Atomic permission codes — NIST 800-162 / SAP authorization-object compatible. Source of truth for canCreateDocs, canApprove, finance.po.approve, etc.',
            'Mã quyền nguyên tử — chuẩn NIST 800-162 / SAP authorization-object. Nguồn dữ liệu cho canCreateDocs, canApprove, finance.po.approve…'
          ),
          ''
        );

        html += '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
        html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--border)"><div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">'+escapeHtml(t('Total','Tổng'))+'</div><div style="font-size:20px;font-weight:600">'+totals.all+'</div></div>';
        html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--red-light,#fecaca)"><div style="font-size:11px;color:var(--red-dark,#991b1b);text-transform:uppercase;letter-spacing:.5px">'+escapeHtml(t('Dangerous','Nguy hiểm'))+'</div><div style="font-size:20px;font-weight:600">'+totals.dangerous+'</div></div>';
        html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--border)"><div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">AAL 3 / 2 / 1</div><div style="font-size:20px;font-weight:600">'+totals.aal3+' · '+totals.aal2+' · '+totals.aal1+'</div></div>';
        html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--border)"><div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">'+escapeHtml(t('Modules','Module'))+'</div><div style="font-size:20px;font-weight:600">'+moduleKeys.length+'</div></div>';
        html += '</div>';

        moduleKeys.forEach(function(modKey){
          var bucket = groups[modKey];
          html += '<div style="margin-bottom:20px">';
          html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(modKey)+' <span style="color:var(--text-3);font-weight:400">('+bucket.length+')</span></div>';
          html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
          html += '<thead><tr style="background:var(--surface-2)">'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Code','Mã'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Label','Nhãn'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">SAP</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">AAL</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Risk','Rủi ro'))+'</th>'
            + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Compliance','Tuân thủ'))+'</th>'
            + '</tr></thead><tbody>';
          bucket.forEach(function(r){
            var labelLocal = lang === 'en' ? (r.label || r.label_vi) : (r.label_vi || r.label);
            var compRefs = Array.isArray(r.compliance_refs) ? r.compliance_refs : [];
            html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
              + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:12px;color:var(--brand-primary,#1565c0)">'+escapeHtml(r.permission_code)+'</code></td>'
              + '<td style="padding:8px 12px">'+escapeHtml(labelLocal)+'</td>'
              + '<td style="padding:8px 12px;color:var(--text-3)">'+escapeHtml(r.activity_code || '—')+'</td>'
              + '<td style="padding:8px 12px">'+badge('AAL '+(r.required_aal_level || 1), Number(r.required_aal_level)===3?'block':(Number(r.required_aal_level)===2?'warn':'muted'))+'</td>'
              + '<td style="padding:8px 12px">'+(r.is_dangerous ? badge(t('Dangerous','Nguy hiểm'),'block') : badge(t('Standard','Thường'),'muted'))+'</td>'
              + '<td style="padding:8px 12px;color:var(--text-3);font-size:11px">'+escapeHtml(compRefs.join(' · '))+'</td>'
              + '</tr>';
          });
          html += '</tbody></table></div></div>';
        });

        el.innerHTML = html;
      })
      .catch(function(e){
        el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminGovernanceTab(document.getElementById('admin-content'), 'permission_catalog'); });
      });
  }

  // ── 2. SoD Matrix ─────────────────────────────────────────────────────────

  function renderSodMatrix(el){
    el.innerHTML = loadingHtml();
    Promise.all([
      fetch('/api/v1/runtime/core_system/role_sod_conflict?limit=200&direction=asc&sort=severity', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/rbac/sod-violations', {credentials:'include'}).then(function(r){ return r.json(); })
    ]).then(function(out){
      var conflictRes = out[0]; var violRes = out[1];
      if(!(conflictRes && conflictRes.ok)){
        el.innerHTML = errorHtml(conflictRes && conflictRes.error || 'sod_conflict_load_failed', function(){ window._renderAdminGovernanceTab(document.getElementById('admin-content'), 'sod_matrix'); });
        return;
      }
      var conflicts = conflictRes.records || [];
      var violations = (violRes && violRes.ok && violRes.data) || [];

      var counts = {
        block: conflicts.filter(function(c){ return c.severity === 'block'; }).length,
        warn:  conflicts.filter(function(c){ return c.severity === 'warn'; }).length,
        info:  conflicts.filter(function(c){ return c.severity === 'info'; }).length
      };

      var html = panelHeader(
        t('Separation of Duties Matrix','Ma trận Tách trách nhiệm'),
        t(
          'Role pairs that cannot be held simultaneously — COBIT 5 DSS06.03 / SOX §404 / ISO 27001 A.6.1.2 / NIST 800-53 AC-5.',
          'Cặp vai trò không được giữ đồng thời — COBIT 5 DSS06.03 / SOX §404 / ISO 27001 A.6.1.2 / NIST 800-53 AC-5.'
        ),
        ''
      );

      html += '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
      html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--red-light,#fecaca)"><div style="font-size:11px;color:var(--red-dark,#991b1b);text-transform:uppercase">'+escapeHtml(t('Block','Chặn'))+'</div><div style="font-size:20px;font-weight:600">'+counts.block+'</div></div>';
      html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--yellow-light,#fde68a)"><div style="font-size:11px;color:var(--yellow-dark,#92400e);text-transform:uppercase">'+escapeHtml(t('Warn','Cảnh báo'))+'</div><div style="font-size:20px;font-weight:600">'+counts.warn+'</div></div>';
      html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--blue-light,#bfdbfe)"><div style="font-size:11px;color:var(--blue-dark,#1e40af);text-transform:uppercase">'+escapeHtml(t('Info','Thông báo'))+'</div><div style="font-size:20px;font-weight:600">'+counts.info+'</div></div>';
      html += '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid '+(violations.length?'var(--red-light,#fecaca)':'var(--green-light,#bbf7d0)')+'"><div style="font-size:11px;color:'+(violations.length?'var(--red-dark,#991b1b)':'var(--green-dark,#166534)')+';text-transform:uppercase">'+escapeHtml(t('Active violations','Vi phạm hiện tại'))+'</div><div style="font-size:20px;font-weight:600">'+violations.length+'</div></div>';
      html += '</div>';

      html += '<div style="margin-bottom:24px">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Conflict definitions','Định nghĩa xung đột'))+'</div>';
      if(conflicts.length === 0){
        html += emptyHtml(t('No SoD conflicts defined yet.','Chưa có xung đột SoD nào.'));
      } else {
        html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr style="background:var(--surface-2)">'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Severity','Mức độ'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Conflict','Xung đột'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Rationale','Lý do'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Compliance','Tuân thủ'))+'</th>'
          + '</tr></thead><tbody>';
        conflicts.forEach(function(c){
          var labelLocal = lang === 'en' ? (c.label || c.label_vi) : (c.label_vi || c.label);
          var rationaleLocal = lang === 'en' ? (c.rationale || c.rationale_vi) : (c.rationale_vi || c.rationale);
          var compRefs = Array.isArray(c.compliance_refs) ? c.compliance_refs : [];
          html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:8px 12px">'+badge(c.severity || 'info', c.severity)+'</td>'
            + '<td style="padding:8px 12px;font-weight:500">'+escapeHtml(labelLocal || '—')+'</td>'
            + '<td style="padding:8px 12px;color:var(--text-2);max-width:480px">'+escapeHtml(rationaleLocal || '')+'</td>'
            + '<td style="padding:8px 12px;color:var(--text-3);font-size:11px">'+escapeHtml(compRefs.join(' · '))+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';

      html += '<div>';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Active violations (users currently holding conflicting roles)','Vi phạm hiện tại (người dùng đang giữ vai trò xung đột)'))+'</div>';
      if(violations.length === 0){
        html += '<div style="padding:24px;text-align:center;color:var(--green-dark,#166534);background:var(--green-light,#dcfce7);border-radius:8px;border:1px solid var(--green-light,#bbf7d0)">✓ '+escapeHtml(t('No active SoD violations. All users are compliant.','Không có vi phạm SoD nào. Tất cả người dùng đều tuân thủ.'))+'</div>';
      } else {
        html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr style="background:var(--surface-2)">'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Severity','Mức độ'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('User','Người dùng'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Roles in conflict','Vai trò xung đột'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Issue','Vấn đề'))+'</th>'
          + '</tr></thead><tbody>';
        violations.forEach(function(v){
          var labelLocal = lang === 'en' ? (v.label || v.label_vi) : (v.label_vi || v.label);
          html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:8px 12px">'+badge(v.severity || 'info', v.severity)+'</td>'
            + '<td style="padding:8px 12px"><div style="font-weight:500">'+escapeHtml(v.full_name || v.username)+'</div><div style="font-size:11px;color:var(--text-3)">@'+escapeHtml(v.username)+'</div></td>'
            + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:12px">'+escapeHtml(v.role_a_code)+'</code> + <code style="font-family:monospace;font-size:12px">'+escapeHtml(v.role_b_code)+'</code></td>'
            + '<td style="padding:8px 12px;color:var(--text-2)">'+escapeHtml(labelLocal || '')+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';

      el.innerHTML = html;
    }).catch(function(e){
      el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminGovernanceTab(document.getElementById('admin-content'), 'sod_matrix'); });
    });
  }

  // ── 3. Access Reviews ─────────────────────────────────────────────────────

  function renderAccessReviews(el){
    el.innerHTML = loadingHtml();
    fetch('/api/v1/access-review/progress', {credentials:'include'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(!(j && j.ok)){
          el.innerHTML = errorHtml(j && j.error || 'access_review_load_failed', function(){ window._renderAdminGovernanceTab(document.getElementById('admin-content'), 'access_review'); });
          return;
        }
        var rows = Array.isArray(j.data) ? j.data : [];

        var html = panelHeader(
          t('Access Reviews','Đánh giá phân quyền định kỳ'),
          t(
            'Periodic attestation campaigns — ISO 27001 A.9.2.5 / SOX §404 / SOC 2 CC6.3. Each campaign reviews user × role/grant tuples and produces attest / revoke / escalate decisions.',
            'Chu kỳ chứng thực định kỳ — ISO 27001 A.9.2.5 / SOX §404 / SOC 2 CC6.3. Mỗi chu kỳ rà soát các cặp người dùng × vai trò/quyền và đưa ra quyết định chứng thực / thu hồi / leo thang.'
          ),
          '<button class="btn-admin primary" disabled title="'+escapeHtml(t('Campaign creation UI ships in next iteration','UI tạo chu kỳ sẽ có ở bản sau'))+'">＋ '+escapeHtml(t('New campaign','Tạo chu kỳ mới'))+'</button>'
        );

        if(rows.length === 0){
          html += '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:32px;text-align:center">'
            + '<div style="font-size:36px;margin-bottom:12px">📅</div>'
            + '<div style="font-size:16px;font-weight:600;margin-bottom:8px">'+escapeHtml(t('No access-review campaigns yet','Chưa có chu kỳ đánh giá nào'))+'</div>'
            + '<div style="font-size:13px;color:var(--text-3);max-width:520px;margin:0 auto">'+escapeHtml(t(
              'Recommended cadence per ISO 27001 A.9.2.5: review all admin-tier roles every 90 days, all other roles every 180 days, and any user with SoD waivers every 30 days.',
              'Tần suất khuyến nghị theo ISO 27001 A.9.2.5: rà soát mọi vai trò admin tier mỗi 90 ngày, các vai trò khác mỗi 180 ngày, và mọi người dùng có waiver SoD mỗi 30 ngày.'
            ))+'</div>'
            + '</div>';
        } else {
          html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px">';
          rows.forEach(function(c){
            var pct = Number(c.completion_percent || 0);
            var pctColor = pct >= 90 ? 'var(--green-dark,#166534)' : (pct >= 50 ? 'var(--blue-dark,#1e40af)' : 'var(--yellow-dark,#92400e)');
            html += '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:16px">';
            html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'
              +     '<div style="font-weight:600">'+escapeHtml((lang==='en'?c.name:c.name_vi) || c.campaign_code)+'</div>'
              +     badge(c.campaign_status || 'scheduled', c.campaign_status === 'completed' ? 'ok' : (c.campaign_status === 'in_progress' ? 'info' : 'muted'))
              +   '</div>';
            html += '<div style="font-size:11px;color:var(--text-3);margin-bottom:8px"><code>'+escapeHtml(c.campaign_code)+'</code></div>';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
              +     '<div style="flex:1;height:6px;background:var(--gray-100,#f3f4f6);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+pctColor+'"></div></div>'
              +     '<div style="font-size:13px;font-weight:600;color:'+pctColor+'">'+pct+'%</div>'
              +   '</div>';
            html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px;color:var(--text-3)">'
              +     '<div><div style="color:var(--text-2);font-weight:600">'+(c.pending_items||0)+'</div>'+escapeHtml(t('pending','chờ'))+'</div>'
              +     '<div><div style="color:var(--green-dark,#166534);font-weight:600">'+(c.attested_items||0)+'</div>'+escapeHtml(t('attested','đã chứng'))+'</div>'
              +     '<div><div style="color:var(--red-dark,#991b1b);font-weight:600">'+(c.revoked_items||0)+'</div>'+escapeHtml(t('revoked','thu hồi'))+'</div>'
              +   '</div>';
            if(c.sod_violations){
              html += '<div style="margin-top:8px;padding:6px 10px;background:var(--red-light,#fee2e2);color:var(--red-dark,#991b1b);border-radius:6px;font-size:11px">⚠ '+(c.sod_violations)+' '+escapeHtml(t('SoD violations to resolve','vi phạm SoD cần giải quyết'))+'</div>';
            }
            html += '</div>';
          });
          html += '</div>';
        }

        el.innerHTML = html;
      })
      .catch(function(e){
        el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminGovernanceTab(document.getElementById('admin-content'), 'access_review'); });
      });
  }

  // ── Public dispatcher ─────────────────────────────────────────────────────

  window._renderAdminGovernanceTab = function(el, slug){
    if(!el) return;
    if(slug === 'permission_catalog') return renderPermissionCatalog(el);
    if(slug === 'sod_matrix')         return renderSodMatrix(el);
    if(slug === 'access_review')      return renderAccessReviews(el);
    el.innerHTML = '<div class="hm-empty">'+escapeHtml(t('Unknown governance tab','Tab quản trị không xác định'))+': '+escapeHtml(String(slug))+'</div>';
  };

})();
