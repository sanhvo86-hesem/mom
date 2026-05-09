/* ============================================================================
 * Admin Content & Security Tabs — Effective Docs / Retention / MFA Security
 * ----------------------------------------------------------------------------
 * Lazy-loaded by 02-state-auth-ui.js. Reads from the new schema introduced
 * by migrations 165-168 via:
 *   * GET /api/v1/documents/in-force                        (v_documents_in_force)
 *   * GET /api/v1/retention/due-for-disposal                (v_retention_due_for_disposal)
 *   * GET /api/v1/runtime/core_system/retention_policy
 *   * GET /api/v1/mfa/factors                               (admin or self)
 *   * GET /api/v1/runtime/core_system/mfa_policy
 *   * GET /api/v1/runtime/core_system/users                 (for MFA compliance roster)
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
    var bg = ({
      block:'var(--red-light,#fee2e2)', warn:'var(--yellow-light,#fef3c7)',
      info:'var(--blue-light,#dbeafe)', ok:'var(--green-light,#dcfce7)',
      muted:'var(--gray-100,#f3f4f6)'
    })[tone || 'muted'] || 'var(--gray-100,#f3f4f6)';
    var fg = ({
      block:'var(--red-dark,#991b1b)', warn:'var(--yellow-dark,#92400e)',
      info:'var(--blue-dark,#1e40af)', ok:'var(--green-dark,#166534)',
      muted:'var(--text-2,#4b5563)'
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

  function kpiCard(label, value, tone){
    var border = tone === 'block' ? 'var(--red-light,#fecaca)'
                : tone === 'warn'  ? 'var(--yellow-light,#fde68a)'
                : tone === 'ok'    ? 'var(--green-light,#bbf7d0)'
                : 'var(--border)';
    var labelColor = tone === 'block' ? 'var(--red-dark,#991b1b)'
                   : tone === 'warn'  ? 'var(--yellow-dark,#92400e)'
                   : tone === 'ok'    ? 'var(--green-dark,#166534)'
                   : 'var(--text-3)';
    return '<div style="background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid '+border+'">'
      + '<div style="font-size:11px;color:'+labelColor+';text-transform:uppercase;letter-spacing:.5px">'+escapeHtml(label)+'</div>'
      + '<div style="font-size:20px;font-weight:600">'+escapeHtml(String(value))+'</div>'
      + '</div>';
  }

  function fmtDate(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', {year:'numeric',month:'short',day:'numeric'}); }
    catch(e){ return String(iso).slice(0,10); }
  }

  // ── 1. Tài liệu hiệu lực (Effective Documents) ───────────────────────────

  function renderEffectiveDocs(el){
    el.innerHTML = loadingHtml();
    Promise.all([
      fetch('/api/v1/documents/in-force?limit=500', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/documents/pending-acknowledgement?limit=200', {credentials:'include'}).then(function(r){ return r.json(); })
    ]).then(function(out){
      var inForceRes = out[0]; var pendingRes = out[1];
      if(!(inForceRes && inForceRes.ok)){
        el.innerHTML = errorHtml(inForceRes && inForceRes.error || 'effective_docs_load_failed', function(){ window._renderAdminContentTab(document.getElementById('admin-content'), 'effective_docs'); });
        return;
      }
      var docs = inForceRes.data || [];
      var pending = (pendingRes && pendingRes.ok && pendingRes.data) || [];

      var ackRequiredCount = docs.filter(function(d){ return d.acknowledgement_required; }).length;
      var legalHoldCount   = docs.filter(function(d){ return d.legal_hold_active; }).length;
      var byType = {};
      docs.forEach(function(d){
        var k = String(d.doc_type || 'other');
        byType[k] = (byType[k] || 0) + 1;
      });

      var html = panelHeader(
        t('Effective Documents','Tài liệu hiệu lực'),
        t(
          'Documents currently in force (status=approved + within effective window + not superseded). 21 CFR Part 11 §11.10(d) acknowledgement tracking enabled.',
          'Tài liệu đang hiệu lực (status=approved + trong khoảng effective + chưa bị thay thế). Theo dõi xác nhận đã đọc theo 21 CFR Part 11 §11.10(d).'
        ),
        ''
      );

      html += '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
      html += kpiCard(t('In force','Đang hiệu lực'), docs.length, 'ok');
      html += kpiCard(t('Acknowledgement required','Cần xác nhận đọc'), ackRequiredCount, ackRequiredCount > 0 ? 'warn' : 'muted');
      html += kpiCard(t('My pending acknowledgements','Tôi cần xác nhận'), pending.length, pending.length > 0 ? 'warn' : 'ok');
      html += kpiCard(t('On legal hold','Đang giữ pháp lý'), legalHoldCount, legalHoldCount > 0 ? 'block' : 'muted');
      html += kpiCard(t('Doc types','Loại tài liệu'), Object.keys(byType).length);
      html += '</div>';

      if(pending.length > 0){
        html += '<div style="background:var(--yellow-light,#fef3c7);border:1px solid var(--yellow-light,#fde68a);border-radius:12px;padding:16px;margin-bottom:20px">';
        html += '<div style="font-weight:600;color:var(--yellow-dark,#92400e);margin-bottom:8px">⏰ '+escapeHtml(t('Documents awaiting your acknowledgement','Tài liệu chờ bạn xác nhận đã đọc'))+'</div>';
        html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr><th style="text-align:left;padding:6px 8px">'+escapeHtml(t('Doc','Tài liệu'))+'</th>'
              + '<th style="text-align:left;padding:6px 8px">'+escapeHtml(t('Rev','Phiên bản'))+'</th>'
              + '<th style="text-align:left;padding:6px 8px">'+escapeHtml(t('Effective','Hiệu lực từ'))+'</th>'
              + '<th style="text-align:left;padding:6px 8px">'+escapeHtml(t('Due','Hạn'))+'</th>'
              + '<th style="text-align:left;padding:6px 8px">'+escapeHtml(t('State','Trạng thái'))+'</th>'
              + '</tr></thead><tbody>';
        pending.slice(0, 20).forEach(function(p){
          var titleLocal = lang === 'en' ? (p.title || p.title_vi) : (p.title_vi || p.title);
          var stateTone = p.due_state === 'overdue' ? 'block' : (p.due_state === 'due_soon' ? 'warn' : 'ok');
          html += '<tr style="border-top:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:6px 8px"><code style="font-family:monospace;font-size:11px">'+escapeHtml(p.doc_id)+'</code> ' + escapeHtml(titleLocal || '') + '</td>'
            + '<td style="padding:6px 8px">'+escapeHtml(p.current_rev || '')+'</td>'
            + '<td style="padding:6px 8px">'+escapeHtml(fmtDate(p.effective_from))+'</td>'
            + '<td style="padding:6px 8px">'+escapeHtml(fmtDate(p.due_at))+'</td>'
            + '<td style="padding:6px 8px">'+badge(p.due_state || '—', stateTone)+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
        if(pending.length > 20){
          html += '<div style="font-size:11px;color:var(--text-3);margin-top:8px">'+escapeHtml(t('Showing 20 of ','Hiện 20 trên ')) + pending.length + ' '+escapeHtml(t('pending acknowledgements','xác nhận chờ'))+'</div>';
        }
        html += '</div>';
      }

      html += '<div>';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('All effective documents','Tất cả tài liệu hiệu lực'))+'</div>';
      if(docs.length === 0){
        html += emptyHtml(t('No documents currently in force.','Chưa có tài liệu nào đang hiệu lực.'));
      } else {
        html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr style="background:var(--surface-2)">'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Code','Mã'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Title','Tiêu đề'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Type','Loại'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Rev','Phiên bản'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Effective','Hiệu lực'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Ack required','Cần xác nhận'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Retention','Lưu giữ'))+'</th>'
          + '</tr></thead><tbody>';
        docs.slice(0, 100).forEach(function(d){
          var titleLocal = lang === 'en' ? (d.title || d.title_vi) : (d.title_vi || d.title);
          html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:12px;color:var(--brand-primary,#1565c0)">'+escapeHtml(d.doc_id)+'</code></td>'
            + '<td style="padding:8px 12px">'+escapeHtml(titleLocal || '')+'</td>'
            + '<td style="padding:8px 12px;color:var(--text-3)">'+escapeHtml(d.doc_type || '')+'</td>'
            + '<td style="padding:8px 12px">'+escapeHtml(d.current_rev || '')+'</td>'
            + '<td style="padding:8px 12px;font-size:12px">'+escapeHtml(fmtDate(d.effective_from))+(d.effective_until ? ' → '+escapeHtml(fmtDate(d.effective_until)) : '')+'</td>'
            + '<td style="padding:8px 12px">'+(d.acknowledgement_required ? badge(t('Yes','Có'),'warn') : badge('—','muted'))+'</td>'
            + '<td style="padding:8px 12px">'+(d.retention_policy_code ? '<code style="font-size:11px;color:var(--text-3)">'+escapeHtml(d.retention_policy_code)+'</code>' : '<span style="color:var(--text-3)">—</span>')+(d.legal_hold_active ? ' '+badge(t('Hold','Giữ'),'block') : '')+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
        if(docs.length > 100){
          html += '<div style="font-size:11px;color:var(--text-3);margin-top:8px">'+escapeHtml(t('Showing 100 of ','Hiện 100 trên ')) + docs.length + '</div>';
        }
      }
      html += '</div>';

      el.innerHTML = html;
    }).catch(function(e){
      el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminContentTab(document.getElementById('admin-content'), 'effective_docs'); });
    });
  }

  // ── 2. Lưu giữ (Retention) ────────────────────────────────────────────────

  function renderRetention(el){
    el.innerHTML = loadingHtml();
    Promise.all([
      fetch('/api/v1/runtime/core_system/retention_policy?limit=200&direction=asc&sort=policy_code', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/retention/due-for-disposal?limit=200', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/runtime/core_system/retention_legal_hold?limit=50', {credentials:'include'}).then(function(r){ return r.json(); })
    ]).then(function(out){
      var policiesRes = out[0]; var dueRes = out[1]; var holdsRes = out[2];
      if(!(policiesRes && policiesRes.ok)){
        el.innerHTML = errorHtml(policiesRes && policiesRes.error || 'retention_policies_load_failed', function(){ window._renderAdminContentTab(document.getElementById('admin-content'), 'retention'); });
        return;
      }
      var policies = policiesRes.records || [];
      var dueDocs  = (dueRes && dueRes.ok && dueRes.data) || [];
      var holds    = (holdsRes && holdsRes.ok && holdsRes.records) || [];
      var blockedCount = dueDocs.filter(function(d){ return d.hold_blocks_disposal; }).length;
      var freeToDispose = dueDocs.length - blockedCount;

      var html = panelHeader(
        t('Records Retention','Lưu giữ hồ sơ'),
        t(
          'Document/record retention lifecycle — ISO 9001 §7.5.3.2 / AS9100D §7.5.3 / 21 CFR Part 11 §11.10(c) / GDPR Art. 5(1)(e) / Vietnam Archives Law 2011.',
          'Vòng đời lưu giữ tài liệu/hồ sơ — ISO 9001 §7.5.3.2 / AS9100D §7.5.3 / 21 CFR Part 11 §11.10(c) / GDPR Điều 5(1)(e) / Luật Lưu trữ Việt Nam 2011.'
        ),
        ''
      );

      html += '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">';
      html += kpiCard(t('Policies','Chính sách'), policies.length);
      html += kpiCard(t('Due ≤ 60d','Đến hạn ≤ 60 ngày'), dueDocs.length, dueDocs.length > 0 ? 'warn' : 'ok');
      html += kpiCard(t('Ready to dispose','Sẵn sàng huỷ'), freeToDispose, freeToDispose > 0 ? 'warn' : 'muted');
      html += kpiCard(t('Blocked by legal hold','Bị giữ pháp lý'), blockedCount, blockedCount > 0 ? 'block' : 'muted');
      html += kpiCard(t('Active legal holds','Lệnh giữ pháp lý'), holds.filter(function(h){return h.is_active;}).length, holds.length > 0 ? 'block' : 'muted');
      html += '</div>';

      html += '<div style="margin-bottom:24px">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Retention policies','Chính sách lưu giữ'))+'</div>';
      if(policies.length === 0){
        html += emptyHtml(t('No retention policies defined yet.','Chưa có chính sách lưu giữ nào.'));
      } else {
        html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr style="background:var(--surface-2)">'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Code','Mã'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Label','Tên'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Pattern','Mẫu tài liệu'))+'</th>'
          + '<th style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Years','Số năm'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Trigger','Bắt đầu tính'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Disposition','Cách xử lý'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Compliance','Tuân thủ'))+'</th>'
          + '</tr></thead><tbody>';
        policies.forEach(function(p){
          var labelLocal = lang === 'en' ? (p.label || p.label_vi) : (p.label_vi || p.label);
          var compRefs = Array.isArray(p.compliance_refs) ? p.compliance_refs : [];
          html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:12px;color:var(--brand-primary,#1565c0)">'+escapeHtml(p.policy_code)+'</code></td>'
            + '<td style="padding:8px 12px">'+escapeHtml(labelLocal || '')+'</td>'
            + '<td style="padding:8px 12px"><code style="font-size:11px;color:var(--text-3)">'+escapeHtml(p.doc_pattern || '')+'</code></td>'
            + '<td style="padding:8px 12px;text-align:right;font-weight:500">'+escapeHtml(String(p.retention_period_years || ''))+'</td>'
            + '<td style="padding:8px 12px;color:var(--text-3);font-size:11px">'+escapeHtml(p.retention_trigger || '')+'</td>'
            + '<td style="padding:8px 12px">'+badge(p.disposition_method || '—', p.disposition_method === 'destroy' ? 'block' : (p.disposition_method === 'archive' ? 'info' : 'muted'))+'</td>'
            + '<td style="padding:8px 12px;color:var(--text-3);font-size:11px">'+escapeHtml(compRefs.join(' · '))+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';

      html += '<div>';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Documents due for disposal (next 60 days)','Tài liệu đến hạn huỷ (60 ngày tới)'))+'</div>';
      if(dueDocs.length === 0){
        html += '<div style="padding:24px;text-align:center;color:var(--green-dark,#166534);background:var(--green-light,#dcfce7);border-radius:8px;border:1px solid var(--green-light,#bbf7d0)">✓ '+escapeHtml(t('No documents due for retention disposal in the next 60 days.','Không có tài liệu nào đến hạn huỷ trong 60 ngày tới.'))+'</div>';
      } else {
        html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr style="background:var(--surface-2)">'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Doc','Tài liệu'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Policy','Chính sách'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Due at','Đến hạn'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Disposition','Cách xử lý'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Status','Trạng thái'))+'</th>'
          + '</tr></thead><tbody>';
        dueDocs.slice(0,50).forEach(function(d){
          var titleLocal = lang === 'en' ? (d.title || d.title_vi) : (d.title_vi || d.title);
          html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:11px">'+escapeHtml(d.doc_id)+'</code> '+escapeHtml(titleLocal || '')+'</td>'
            + '<td style="padding:8px 12px"><code style="font-size:11px;color:var(--text-3)">'+escapeHtml(d.retention_policy_code || '—')+'</code></td>'
            + '<td style="padding:8px 12px">'+escapeHtml(fmtDate(d.due_at))+'</td>'
            + '<td style="padding:8px 12px">'+badge(d.disposition_method || '—', d.disposition_method === 'destroy' ? 'block' : 'info')+'</td>'
            + '<td style="padding:8px 12px">'+(d.hold_blocks_disposal ? badge(t('Held','Đang giữ'),'block') : badge(t('Ready','Sẵn sàng'),'warn'))+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';

      el.innerHTML = html;
    }).catch(function(e){
      el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminContentTab(document.getElementById('admin-content'), 'retention'); });
    });
  }

  // ── 3. Bảo mật MFA ────────────────────────────────────────────────────────

  function renderMfa(el){
    el.innerHTML = loadingHtml();
    Promise.all([
      fetch('/api/v1/runtime/core_system/mfa_policy?limit=200&direction=asc&sort=role_id', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/runtime/core_system/roles?limit=200&direction=asc&sort=role_code', {credentials:'include'}).then(function(r){ return r.json(); }),
      fetch('/api/v1/runtime/core_system/mfa_factor?limit=500&direction=desc&sort=enrolled_at', {credentials:'include'}).then(function(r){ return r.json(); })
    ]).then(function(out){
      var policiesRes = out[0]; var rolesRes = out[1]; var factorsRes = out[2];
      if(!(policiesRes && policiesRes.ok)){
        el.innerHTML = errorHtml(policiesRes && policiesRes.error || 'mfa_policy_load_failed', function(){ window._renderAdminContentTab(document.getElementById('admin-content'), 'mfa'); });
        return;
      }
      var policies = policiesRes.records || [];
      var roles    = (rolesRes && rolesRes.ok && rolesRes.records) || [];
      var factors  = (factorsRes && factorsRes.ok && factorsRes.records) || [];

      var rolesById = {};
      roles.forEach(function(r){ rolesById[String(r.role_id)] = r; });

      var stats = {
        total_policies:    policies.length,
        required:          policies.filter(function(p){ return p.required; }).length,
        aal3:              policies.filter(function(p){ return Number(p.required_aal_level) === 3; }).length,
        active_factors:    factors.filter(function(f){ return f.status === 'active'; }).length,
        pending_factors:   factors.filter(function(f){ return f.status === 'pending_verify'; }).length,
        revoked_factors:   factors.filter(function(f){ return f.status === 'revoked'; }).length
      };

      var html = panelHeader(
        t('MFA Security','Bảo mật MFA'),
        t(
          'Multi-factor authentication policy and enrollment — NIST 800-63B (AAL 1/2/3) / FIDO2 / ISO 27001 A.9.4.2 / 21 CFR Part 11 §11.10(d).',
          'Chính sách MFA và trạng thái ghi danh — NIST 800-63B (AAL 1/2/3) / FIDO2 / ISO 27001 A.9.4.2 / 21 CFR Part 11 §11.10(d).'
        ),
        ''
      );

      html += '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">';
      html += kpiCard(t('Policies','Chính sách'), stats.total_policies);
      html += kpiCard(t('Required','Bắt buộc'), stats.required, stats.required > 0 ? 'info' : 'muted');
      html += kpiCard(t('AAL 3 (hardware)','AAL 3 (khoá phần cứng)'), stats.aal3, stats.aal3 > 0 ? 'block' : 'muted');
      html += kpiCard(t('Active factors','Yếu tố đang hoạt động'), stats.active_factors, stats.active_factors > 0 ? 'ok' : 'muted');
      html += kpiCard(t('Pending verify','Chờ xác minh'), stats.pending_factors, stats.pending_factors > 0 ? 'warn' : 'muted');
      html += kpiCard(t('Revoked','Đã thu hồi'), stats.revoked_factors);
      html += '</div>';

      html += '<div style="margin-bottom:24px">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Per-role MFA policy','Chính sách MFA theo vai trò'))+'</div>';
      if(policies.length === 0){
        html += emptyHtml(t('No MFA policies defined yet.','Chưa có chính sách MFA nào.'));
      } else {
        html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr style="background:var(--surface-2)">'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Role','Vai trò'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Required','Bắt buộc'))+'</th>'
          + '<th style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Min factors','Số yếu tố tối thiểu'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Required AAL','AAL yêu cầu'))+'</th>'
          + '<th style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Grace days','Ngày ân hạn'))+'</th>'
          + '<th style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Re-auth (min)','Tái xác thực (phút)'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Allowed types','Loại cho phép'))+'</th>'
          + '</tr></thead><tbody>';
        policies.forEach(function(p){
          var role = rolesById[String(p.role_id)] || {};
          var roleLabelLocal = lang === 'en' ? (role.role_label || role.role_label_vi) : (role.role_label_vi || role.role_label);
          var allowedTypes = Array.isArray(p.allowed_factor_types) ? p.allowed_factor_types : [];
          var aal = Number(p.required_aal_level || 1);
          html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:8px 12px">'
            +   (role.icon_emoji ? '<span style="margin-right:6px">'+escapeHtml(role.icon_emoji)+'</span>' : '')
            +   '<div style="display:inline-block"><div style="font-weight:500">'+escapeHtml(roleLabelLocal || role.role_code || '—')+'</div>'
            +   '<div style="font-size:11px;color:var(--text-3)"><code>'+escapeHtml(role.role_code || '')+'</code>'+(role.is_admin_tier ? ' '+badge(t('Admin tier','Tầng admin'),'block') : '')+'</div></div>'
            + '</td>'
            + '<td style="padding:8px 12px">'+(p.required ? badge(t('Yes','Có'),'info') : badge(t('Optional','Tuỳ chọn'),'muted'))+'</td>'
            + '<td style="padding:8px 12px;text-align:right;font-weight:500">'+escapeHtml(String(p.min_factors || 1))+'</td>'
            + '<td style="padding:8px 12px">'+badge('AAL '+aal, aal === 3 ? 'block' : (aal === 2 ? 'warn' : 'muted'))+'</td>'
            + '<td style="padding:8px 12px;text-align:right">'+escapeHtml(String(p.grace_period_days || 0))+'</td>'
            + '<td style="padding:8px 12px;text-align:right">'+escapeHtml(String(p.reauth_after_minutes || 0))+'</td>'
            + '<td style="padding:8px 12px;font-size:11px;color:var(--text-3)">'+escapeHtml(allowedTypes.join(' · '))+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';

      html += '<div>';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+escapeHtml(t('Enrolled MFA factors','Yếu tố MFA đã ghi danh'))+'</div>';
      if(factors.length === 0){
        html += '<div style="padding:24px;text-align:center;color:var(--text-3);background:var(--surface-2);border:1px dashed var(--border);border-radius:8px">'
          + escapeHtml(t('No MFA factors enrolled yet. Users will be prompted on next login.','Chưa có yếu tố MFA nào được ghi danh. Người dùng sẽ được yêu cầu khi đăng nhập tiếp theo.'))
          + '</div>';
      } else {
        html += '<div style="overflow-x:auto"><table class="admin-table" style="width:100%;border-collapse:collapse;font-size:13px">';
        html += '<thead><tr style="background:var(--surface-2)">'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('User','Người dùng'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Factor','Yếu tố'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('AAL','AAL'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Status','Trạng thái'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Enrolled','Ghi danh'))+'</th>'
          + '<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border)">'+escapeHtml(t('Last used','Lần dùng cuối'))+'</th>'
          + '</tr></thead><tbody>';
        factors.slice(0, 100).forEach(function(f){
          var aal = Number(f.aal_level || 1);
          var stTone = f.status === 'active' ? 'ok' : (f.status === 'pending_verify' ? 'warn' : (f.status === 'revoked' ? 'block' : 'muted'));
          html += '<tr style="border-bottom:1px solid var(--border-faint,rgba(0,0,0,.06))">'
            + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:11px">'+escapeHtml(String(f.user_id || '').slice(0,8))+'…</code></td>'
            + '<td style="padding:8px 12px"><code style="font-family:monospace;font-size:12px">'+escapeHtml(f.factor_type || '')+'</code> '+escapeHtml(f.factor_label || '')+'</td>'
            + '<td style="padding:8px 12px">'+badge('AAL '+aal, aal === 3 ? 'block' : (aal === 2 ? 'warn' : 'muted'))+'</td>'
            + '<td style="padding:8px 12px">'+badge(f.status || '—', stTone)+'</td>'
            + '<td style="padding:8px 12px;font-size:11px;color:var(--text-3)">'+escapeHtml(fmtDate(f.enrolled_at))+'</td>'
            + '<td style="padding:8px 12px;font-size:11px;color:var(--text-3)">'+escapeHtml(fmtDate(f.last_used_at))+'</td>'
            + '</tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</div>';

      el.innerHTML = html;
    }).catch(function(e){
      el.innerHTML = errorHtml(e && e.message || e, function(){ window._renderAdminContentTab(document.getElementById('admin-content'), 'mfa'); });
    });
  }

  // ── Public dispatcher ────────────────────────────────────────────────────

  window._renderAdminContentTab = function(el, slug){
    if(!el) return;
    if(slug === 'effective_docs') return renderEffectiveDocs(el);
    if(slug === 'retention')      return renderRetention(el);
    if(slug === 'mfa')            return renderMfa(el);
    el.innerHTML = '<div class="hm-empty">'+escapeHtml(t('Unknown content tab','Tab không xác định'))+': '+escapeHtml(String(slug))+'</div>';
  };

})();
