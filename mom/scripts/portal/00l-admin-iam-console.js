/* ============================================================================
 * Admin: IAM Control Console — unified governance & security hub
 * ----------------------------------------------------------------------------
 * Replaces 5 fragmented tabs (Permission Catalog, SoD Matrix, Access Review,
 * Effective Docs, Retention) with ONE control plane wired to real backend
 * tables. Sub-tabs:
 *   1. Tổng Quan (Overview)         — KPI dashboard
 *   2. Phiên Đăng Nhập (Sessions)   — portal_sessions: live + revoke
 *   3. Quyền Hệ Thống (Permissions) — permission_catalog × roles.permissions
 *   4. Tách Trách Nhiệm (SoD)       — role_sod_conflict + violations view
 *   5. Đánh Giá Định Kỳ (Review)    — access_review_campaign + items
 *   6. Lưu Trữ & Tuân Thủ           — retention_policies + disposal queue
 *   7. Audit Trail                  — audit_events (86K+ rows, hash-chained)
 *
 * Data sources are REAL (not stubs):
 *   - audit_events: 86K rows, SHA-256 prev_hash/event_hash chain (tamper-evident)
 *   - portal_sessions: live login sessions
 *   - permission_catalog: 28 atomic permissions
 *   - roles.permissions JSONB: actual permission grants per role
 *   - role_sod_conflict: 4 SoD pairs
 *   - retention_policy: 10 record-class policies
 *   - mfa_factor: per-user MFA enrolment (when populated)
 * ========================================================================== */

(function(){
  'use strict';
  if (!window.AdminUI) { console.error('[admin-iam] AdminUI not loaded'); return; }
  var UI = window.AdminUI;
  var t = UI.t, esc = UI.escapeHtml, badge = UI.badge;

  function decorateRole(r){
    var perms = r.permissions || {};
    if (typeof perms === 'string'){ try { perms = JSON.parse(perms); } catch(e){ perms = {}; } }
    r.permissions = perms;
    r._icon = r.icon_emoji || perms.icon || '👤';
    r._color = r.badge_color_token || perms.color || 'var(--text-3,#9ca3af)';
    return r;
  }

  function sharedAdminUsers(){
    var loader = typeof window.loadSharedAdminUsers === 'function'
      ? window.loadSharedAdminUsers
      : function(){ return Promise.resolve(window.USERS || []); };
    return loader().then(function(users){
      return (users || []).map(function(u){
        return {
          id: u.id || u.employee_id || u.username,
          username: u.username,
          full_name: u.name || u.full_name,
          role_code: u.role,
          dept_code: u.dept,
          is_active: u.active !== false
        };
      });
    });
  }

  function render(rootEl){
    rootEl.innerHTML = ''
      + '<div style="margin-bottom:14px">'
      +   '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
      +     '<div style="font-size:20px;font-weight:700;color:var(--text-1)">🛡️ '+esc(t('IAM Control Console','Trung Tâm Kiểm Soát Vận Hành'))+'</div>'
      +     badge('NIST 800-53 · ISO 27001 · SOX 404','accent')
      +     badge('21 CFR Part 11','muted')
      +   '</div>'
      +   '<div style="font-size:13px;color:var(--text-3);margin-top:4px;line-height:1.5">'+esc(t(
            'Identity, access, separation-of-duties and audit — controlled from one place. Every action writes a tamper-evident audit event.',
            'Danh tính, quyền truy cập, tách trách nhiệm và audit — kiểm soát từ một nơi. Mọi hành động đều ghi sự kiện audit chống giả mạo.'))+'</div>'
      + '</div>'
      + '<div id="iam-subtabs"></div>';
    var host = rootEl.querySelector('#iam-subtabs');
    UI.renderSubTabs(host, [
      { key:'overview',   label:'📊 '+t('Overview','Tổng Quan'),         render: renderOverview },
      { key:'activity',   label:'👁 '+t('Activity','Hành Vi'),           render: renderActivity },
      { key:'sessions',   label:'🔓 '+t('Sessions','Phiên Đăng Nhập'),   render: renderSessions },
      { key:'mfa',        label:'🔐 '+t('MFA','Bảo Mật MFA'),            render: renderMfa },
      { key:'permissions',label:'🔑 '+t('Permissions','Quyền Hệ Thống'), render: renderPermissions },
      { key:'sod',        label:'⚖️ '+t('SoD','Tách Trách Nhiệm'),       render: renderSoD },
      { key:'review',     label:'🧐 '+t('Access Review','Đánh Giá Định Kỳ'), render: renderReview },
      { key:'retention',  label:'📋 '+t('Retention','Lưu Trữ & Tuân Thủ'), render: renderRetention },
      { key:'errorcodes', label:'🛑 '+t('Error Codes','Mã Lỗi'),         render: renderErrorCodes },
      { key:'audit',      label:'📜 '+t('Audit Trail','Audit Trail'),    render: renderAudit }
    ], {});
  }

  // ── MFA (delegates to legacy rich renderAdminMfa with apiCall backend) ─────
  function renderMfa(el){
    if (typeof window.renderAdminMfa !== 'function'){
      el.innerHTML = UI.errorHtml(t('Legacy renderAdminMfa not available','Không tìm thấy renderAdminMfa legacy'));
      return;
    }
    var orig = document.getElementById('admin-content');
    var shim = document.createElement('div');
    shim.id = 'admin-content';
    shim.style.cssText = 'min-height:400px';
    if (orig) orig.id = '__iam-orig-admin-content';
    el.innerHTML = '';
    el.appendChild(shim);
    try { window.renderAdminMfa(); }
    catch(e){ el.innerHTML = UI.errorHtml(e && e.message); }
    finally {
      setTimeout(function(){
        if (orig) orig.id = 'admin-content';
        if (shim && shim.id === 'admin-content') shim.id = 'iam-mfa-shim';
      }, 50);
    }
  }

  // ── Activity (delegates to legacy rich renderAdminActivity) ─────────────────
  function renderActivity(el){
    if (typeof window.renderAdminActivity !== 'function'){
      el.innerHTML = UI.errorHtml(t('Legacy renderAdminActivity not available','Không tìm thấy renderAdminActivity legacy'));
      return;
    }
    // The legacy renderer writes into #admin-content. We temporarily mount a
    // shim with that id so the legacy function paints into our sub-tab body.
    var orig = document.getElementById('admin-content');
    var shim = document.createElement('div');
    shim.id = 'admin-content';
    shim.style.cssText = 'min-height:400px';
    if (orig) orig.id = '__iam-orig-admin-content';
    el.innerHTML = '';
    el.appendChild(shim);
    try {
      window.renderAdminActivity();
    } catch(e){
      el.innerHTML = UI.errorHtml(e && e.message);
    } finally {
      // Restore the original outer admin-content id once legacy painting is done.
      // We delay slightly so any post-render handlers that look up by id still work.
      setTimeout(function(){
        if (orig) orig.id = 'admin-content';
        if (shim && shim.id === 'admin-content') shim.id = 'iam-activity-shim';
      }, 50);
    }
  }

  // ── 1. Overview KPIs ────────────────────────────────────────────────────────
  function renderOverview(el){
    el.innerHTML = UI.loadingHtml();
    Promise.all([
      UI.runtime.list('core_system','roles', { limit: 500 }).catch(function(){ return { data: [] }; }),
      UI.runtime.list('core_system','permission_catalog', { limit: 500 }).catch(function(){ return { data: [] }; }),
      UI.runtime.list('core_system','role_sod_conflict', { limit: 100 }).catch(function(){ return { data: [] }; }),
      // Use /api/v1/sessions/active (audit_events-derived, internal portal) instead of
      // customer_portal.portal_sessions (which is for external customer portal users).
      UI.fetchJson('/api/v1/sessions/active').catch(function(){ return { data: [] }; }),
      UI.runtime.list('core_system','audit_events', { sort:'-recorded_at', limit: 1, include_total: 1 }).catch(function(){ return { raw: { total: 0 } }; }),
      UI.runtime.list('master_data_governance','retention_policy', { limit: 100 }).catch(function(){ return { data: [] }; }),
      sharedAdminUsers().then(function(users){ return { data: users }; }).catch(function(){ return { data: [] }; })
    ]).then(function(results){
      var roles = results[0].data || [];
      var perms = results[1].data || [];
      var sods = results[2].data || [];
      var sessions = results[3].data || [];
      var auditTotal = (results[4].raw && (results[4].raw.total != null) ? results[4].raw.total : (results[4].total != null ? results[4].total : 'n/a'));
      var retentions = results[5].data || [];
      var users = results[6].data || [];
      // /api/v1/sessions/active rows carry status: 'active' | 'idle' | 'stale' (last 8h).
      // Count only 'active' for the KPI; idle/stale are background.
      var activeSessions = sessions.filter(function(s){ return s && (s.status === 'active' || s.status === undefined); }).length;
      var dangerous = perms.filter(function(p){ return p.is_dangerous; }).length;
      var aalRequired = perms.filter(function(p){ return (p.required_aal_level||1) >= 2; }).length;
      el.innerHTML = ''
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(190px,1fr));gap:12px;margin-bottom:18px">'
        +   UI.kpiCard(t('Active users','User đang hoạt động'), users.filter(function(u){ return u.is_active !== false; }).length, t('of '+users.length+' total','/ tổng '+users.length), 'info')
        +   UI.kpiCard(t('Roles','Vai trò'), roles.length, t('Defined in catalog','Định nghĩa trong catalog'), 'info')
        +   UI.kpiCard(t('Active sessions','Phiên đang hoạt động'), activeSessions, t('Currently logged in','Đang đăng nhập'), activeSessions ? 'ok' : 'muted')
        +   UI.kpiCard(t('Permissions','Quyền hệ thống'), perms.length, t(dangerous+' dangerous, '+aalRequired+' AAL≥2', dangerous+' nguy hiểm, '+aalRequired+' AAL≥2'), 'info')
        +   UI.kpiCard(t('SoD conflicts','Xung đột SoD'), sods.length, t('Block + warn rules','Quy tắc block + warn'), sods.length ? 'warn' : 'muted')
        +   UI.kpiCard(t('Retention policies','Chính sách lưu trữ'), retentions.length, t('Per record class','Theo loại hồ sơ'), 'muted')
        +   UI.kpiCard(t('Audit events','Sự kiện audit'), typeof auditTotal === 'number' ? auditTotal.toLocaleString() : auditTotal, t('Hash-chained, tamper-evident','Hash-chain, chống giả mạo'), 'accent')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
        +   '<div style="background:var(--surface-1,#fff);border:1px solid var(--border-1,#e5e7eb);border-radius:8px;padding:14px">'
        +     '<div style="font-weight:600;margin-bottom:8px;color:var(--text-1)">'+esc(t('Recent audit events','Sự kiện audit gần nhất'))+'</div>'
        +     '<div id="overview-audit-recent" style="font-size:12px;color:var(--text-3)">'+UI.loadingHtml()+'</div>'
        +   '</div>'
        +   '<div style="background:var(--surface-1,#fff);border:1px solid var(--border-1,#e5e7eb);border-radius:8px;padding:14px">'
        +     '<div style="font-weight:600;margin-bottom:8px;color:var(--text-1)">'+esc(t('Compliance posture','Tình trạng tuân thủ'))+'</div>'
        +     '<ul style="margin:0;padding-left:20px;font-size:12px;color:var(--text-2);line-height:1.7">'
        +       '<li>'+esc(t('NIST 800-63B AAL'+(aalRequired?'2':'1')+' — '+(aalRequired?'multi-factor required for '+aalRequired+' permissions':'single-factor only'),
                              'NIST 800-63B AAL'+(aalRequired?'2':'1')+' — '+(aalRequired?'đa yếu tố bắt buộc cho '+aalRequired+' quyền':'một yếu tố')))+'</li>'
        +       '<li>'+esc(t('SoD model: '+sods.length+' conflict pair(s) defined (COBIT 5 DSS06.03)','Mô hình SoD: '+sods.length+' cặp xung đột (COBIT 5 DSS06.03)'))+'</li>'
        +       '<li>'+esc(t('Audit chain: '+(typeof auditTotal === 'number' ? auditTotal.toLocaleString() : '?')+' events, SHA-256 prev_hash linkage (21 CFR Part 11 §11.10(e))',
                              'Chuỗi audit: '+(typeof auditTotal === 'number' ? auditTotal.toLocaleString() : '?')+' sự kiện, liên kết SHA-256 (21 CFR Part 11)'))+'</li>'
        +       '<li>'+esc(t('Retention: '+retentions.length+' record-class policies (Vietnam Archives Law 2011 / GDPR Art. 5(1)(e))','Lưu trữ: '+retentions.length+' chính sách (Luật Lưu trữ 2011 / GDPR)'))+'</li>'
        +     '</ul>'
        +   '</div>'
        + '</div>';
      // Load recent audit
      UI.runtime.list('core_system','audit_events', { sort:'-recorded_at', limit: 10 }).then(function(r){
        var rows = r.data || [];
        var box = el.querySelector('#overview-audit-recent');
        if (!rows.length){ box.innerHTML = UI.emptyHtml(t('No events','Không có sự kiện')); return; }
        box.innerHTML = rows.map(function(e){
          return '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px dashed var(--border-1,#e5e7eb);font-size:11px">'
            + '<div style="flex:1;min-width:0">'+badge(e.event_type||'event','info')+' <span style="color:var(--text-2)">'+esc((e.actor_name||e.actor_id||'system').slice(0,20))+'</span></div>'
            + '<div style="font-family:ui-monospace,monospace;color:var(--text-3)">'+esc((e.recorded_at||'').slice(11,19))+'</div>'
            + '</div>';
        }).join('');
      }).catch(function(){});
    }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, function(){ renderOverview(el); }); });
  }

  // ── 2. Sessions — derived from audit_events stream ──────────────────────────
  // Real-time view of every actor with at least one audit event in the last
  // 8 hours. Each session_id is a row with idle/status/event-count/IP/UA, the
  // caller's own session is highlighted, "Force logout" deletes the PHP
  // session file via /api/v1/sessions/{id}:revoke.
  function uaLabel(ua){
    ua = ua || '';
    if (/iPhone|iPad|iPod/.test(ua)) return { icon:'📱', label:'iOS', kind:'mobile' };
    if (/Android/.test(ua)) return { icon:'📱', label:'Android', kind:'mobile' };
    if (/Mac OS X|Macintosh/.test(ua)) return { icon:'💻', label:'macOS', kind:'desktop' };
    if (/Windows/.test(ua)) return { icon:'💻', label:'Windows', kind:'desktop' };
    if (/Linux/.test(ua)) return { icon:'🐧', label:'Linux', kind:'desktop' };
    if (!ua) return { icon:'🌐', label:t('Unknown','Không rõ'), kind:'unknown' };
    return { icon:'🌐', label:'Other', kind:'other' };
  }
  function browserLabel(ua){
    ua = ua || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    if (/curl/i.test(ua)) return 'curl';
    return ua ? 'Browser' : '';
  }
  function fmtDuration(s){
    s = Math.max(0, Math.round(s||0));
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s/60) + 'm ' + (s%60) + 's';
    return Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm';
  }
  function renderSessions(el){
    el.innerHTML = UI.loadingHtml();
    UI.fetchJson('/api/v1/sessions/active').then(function(resp){
      var rows = resp.data || [];
      var currentSid = resp.current_session_id || '';
      var head = UI.panelHeader(
        '🔓 '+t('Active sessions','Phiên đang hoạt động'),
        t('Live view derived from audit_events (last 8h). Every authenticated request creates an event — your own session is highlighted. Force-logout deletes the PHP session file and the user is signed out on next request.',
          'Live từ audit_events (8 giờ gần nhất). Mỗi request đã xác thực = 1 sự kiện. Phiên của bạn được tô sáng. Buộc đăng xuất xoá session file → user bị logout lần request kế.'),
        UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'sess-refresh' })
        + UI.btn(t('Auto 30s','Tự động 30s'),{ kind:'secondary', id:'sess-auto' })
      );
      var byStatus = { active:0, idle:0, stale:0 };
      rows.forEach(function(r){ byStatus[r.status] = (byStatus[r.status]||0) + 1; });
      var uniqueUsers = new Set(rows.map(function(r){ return r.actor_name; })).size;
      var kpi = UI.kpiRow([
        UI.kpiCard(t('Active','Đang hoạt động'), byStatus.active||0, t('Activity within 5 min','Hoạt động <5 phút'), 'ok'),
        UI.kpiCard(t('Idle','Chờ'), byStatus.idle||0, t('5–30 min ago','5–30 phút trước'), 'warn'),
        UI.kpiCard(t('Stale','Cũ'), byStatus.stale||0, t('>30 min, may have logged out','>30 phút, có thể đã thoát'), 'muted'),
        UI.kpiCard(t('Unique users','User khác nhau'), uniqueUsers, t('Across all sessions','Tổng các phiên'), 'info')
      ]);
      var columns = [
        { key:'actor', label:t('User','Người dùng'), render:function(s){
            var dev = uaLabel(s.user_agent);
            var br = browserLabel(s.user_agent);
            return '<div style="display:flex;gap:10px;align-items:flex-start">'
              +   '<div style="font-size:22px;line-height:1">'+esc(dev.icon)+'</div>'
              +   '<div style="min-width:0">'
              +     '<div style="font-weight:600;color:var(--text-1)">'+esc(s.actor_name||'<unknown>')
              +       (s.is_current ? ' '+badge(''+t('YOU','BẠN'),'accent') : '') + '</div>'
              +     '<div style="font-size:11px;color:var(--text-3)">'+esc(dev.label)+(br?' · '+esc(br):'')+'</div>'
              +   '</div>'
              + '</div>';
          } },
        { key:'ip_address', label:'IP', width:'150px', render:function(s){
            var ip = (s.ip_address||'').replace(/\/\d+$/,'');
            return '<code style="font-size:12px">'+esc(ip||'—')+'</code>';
          } },
        { key:'idle', label:t('Idle / Last action','Nhàn / Hành động cuối'), width:'200px', render:function(s){
            var tone = s.status==='active'?'ok':(s.status==='idle'?'warn':'muted');
            return '<div style="display:flex;flex-direction:column;gap:2px">'
              +   '<div>'+badge(fmtDuration(s.idle_seconds), tone)+'</div>'
              +   '<div style="font-family:ui-monospace,monospace;font-size:10px;color:var(--text-3)">'+esc(s.last_event_type||'')+'</div>'
              + '</div>';
          } },
        { key:'duration', label:t('Logged in','Đã đăng nhập'), width:'130px', render:function(s){
            var first = s.first_event_at ? new Date(s.first_event_at).getTime() : null;
            var last = s.last_event_at ? new Date(s.last_event_at).getTime() : Date.now();
            var dur = first ? (last - first)/1000 : 0;
            return '<div style="font-family:ui-monospace,monospace;font-size:11px">'+esc(fmtDuration(dur))+'</div>'
              + '<div style="font-size:10px;color:var(--text-3)">'+esc((s.first_event_at||'').slice(11,19))+' →</div>';
          } },
        { key:'event_count', label:t('Events','Sự kiện'), width:'90px', render:function(s){
            return '<div style="text-align:center;font-family:ui-monospace,monospace;font-size:13px;font-weight:600">'+esc(String(s.event_count||0))+'</div>';
          } },
        { key:'session_id', label:t('Session ID','ID phiên'), width:'150px', render:function(s){
            var sid = String(s.session_id||'');
            return '<span title="'+UI.escapeAttr(sid)+'" style="font-family:ui-monospace,monospace;font-size:10px;color:var(--text-3)">'+esc(sid.slice(0,8))+'…'+esc(sid.slice(-4))+'</span>';
          } },
        { key:'actions', label:'', width:'140px', render:function(s){
            if (s.is_current) return '<span style="color:var(--text-3);font-size:11px;font-style:italic">'+esc(t('current session','phiên hiện tại'))+'</span>';
            return '<button class="btn-admin sm" data-kick="'+UI.escapeAttr(s.session_id)+'" style="background:var(--red-dark,#991b1b);color:#fff;border-color:var(--red-dark,#991b1b)">'+esc(t('Force logout','Buộc thoát'))+'</button>';
          } }
      ];
      el.innerHTML = head + kpi;
      if (!rows.length){
        el.innerHTML += ''
          + '<div style="margin-top:10px;padding:24px;background:var(--surface-1,#fff);border:1px solid var(--border-1,#e5e7eb);border-radius:8px;text-align:center">'
          +   '<div style="font-size:32px;margin-bottom:8px">🔒</div>'
          +   '<div style="font-weight:600;color:var(--text-1)">'+esc(t('No activity in the last 8 hours','Không có hoạt động nào trong 8 giờ qua'))+'</div>'
          + '</div>';
      } else {
        var tableEl = UI.buildTable(columns, rows, { rowKey:'session_id', maxHeight:'560px' });
        // Highlight current session row with accent border
        Array.prototype.forEach.call(tableEl.querySelectorAll('tbody tr'), function(tr){
          var key = tr.getAttribute('data-row-key') || '';
          var row = rows.find(function(r){ return String(r.session_id)===key; });
          if (row && row.is_current){
            tr.style.background = 'var(--brand-tint, #eef2ff)';
            tr.style.borderLeft = '3px solid var(--brand-primary,#4f46e5)';
          }
        });
        el.appendChild(tableEl);
      }
      // Wire actions
      el.querySelector('#sess-refresh').addEventListener('click', function(){ renderSessions(el); });
      var autoBtn = el.querySelector('#sess-auto');
      autoBtn.addEventListener('click', function(){
        if (window._iamSessAuto){
          clearInterval(window._iamSessAuto);
          window._iamSessAuto = null;
          autoBtn.style.background = '';
          UI.toast(t('Auto-refresh stopped','Đã tắt tự động'),'muted');
        } else {
          window._iamSessAuto = setInterval(function(){ if (document.body.contains(el)) renderSessions(el); else { clearInterval(window._iamSessAuto); window._iamSessAuto = null; } }, 30000);
          autoBtn.style.background = 'var(--green-light,#dcfce7)';
          UI.toast(t('Auto-refresh every 30s','Tự động làm mới mỗi 30s'),'ok');
        }
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-kick]'), function(b){
        b.addEventListener('click', function(){
          var sid = b.getAttribute('data-kick');
          var row = rows.find(function(r){ return String(r.session_id)===sid; });
          UI.confirmDestructive({
            title: t('Force logout session','Buộc đăng xuất phiên'),
            message: t('Force-logout '+ (row && row.actor_name) +'? The user will be signed out on next request and must re-authenticate.',
                       'Buộc đăng xuất ' + (row && row.actor_name) + '? User sẽ bị logout lần request kế và phải đăng nhập lại.'),
            requireText:'LOGOUT', requireReason:true,
            confirmLabel: t('Force logout','Buộc thoát')
          }).then(function(r){
            if (!r||!r.confirmed) return;
            UI.fetchJson('/api/v1/sessions/'+encodeURIComponent(sid)+':revoke', {
              method:'POST', body: { reason: r.reason }
            }).then(function(){
              UI.audit('session.revoke', { session_id: sid, target_user: row && row.actor_name, reason: r.reason });
              UI.toast(t('User signed out','Đã đăng xuất user'),'ok');
              renderSessions(el);
            }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
          });
        });
      });
    }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, function(){ renderSessions(el); }); });
  }

  // ── 3. Permissions (catalog × roles.permissions JSONB matrix) ──────────────
  // Roles store permissions as pattern arrays (wildcard-aware):
  //   permissions: ["*.read", "production.*"]   ← grants
  //   denies:      ["*.delete", "core_system.*"] ← denies (override grants)
  // A permission_code "production.create" matches "production.*" via wildcard.
  // When user toggles a cell we add/remove the EXACT permission_code to the
  // appropriate array (we do not delete pattern entries the catalog can't see).
  function patternMatch(pattern, code){
    if (!pattern || !code) return false;
    if (pattern === code) return true;
    if (pattern === '*.' + code.split('.').pop()) return true;
    if (pattern.endsWith('.*')){
      var prefix = pattern.slice(0, -2);
      return code === prefix || code.indexOf(prefix + '.') === 0;
    }
    if (pattern === '*') return true;
    if (pattern === '*.*') return true;
    if (pattern.indexOf('*') >= 0){
      // generic glob → regex
      var re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*') + '$');
      return re.test(code);
    }
    return false;
  }
  function effectiveEffect(role, code){
    var p = role.permissions || {};
    var denies = Array.isArray(p.denies) ? p.denies : [];
    var grants = Array.isArray(p.permissions) ? p.permissions : [];
    // deny wins
    for (var i=0; i<denies.length; i++) if (patternMatch(denies[i], code)) return { effect:'deny', via: denies[i] };
    for (var j=0; j<grants.length; j++) if (patternMatch(grants[j], code)) return { effect:'grant', via: grants[j] };
    return { effect:null, via:null };
  }

  // One-time stylesheet for the prettier permission matrix.
  function injectPermMatrixStyles(){
    if (document.getElementById('iam-perm-matrix-styles')) return;
    var s = document.createElement('style');
    s.id = 'iam-perm-matrix-styles';
    s.textContent = ''
      + '.iam-perm-matrix{font-feature-settings:"tnum" 1}'
      + '.iam-perm-matrix table{border-collapse:separate;border-spacing:0}'
      + '.iam-perm-matrix th,.iam-perm-matrix td{box-shadow:inset -1px 0 0 var(--border-2,#f1f5f9)}'
      + '.iam-perm-matrix th.dept-start,.iam-perm-matrix td.dept-start{box-shadow:inset 2px 0 0 var(--brand-tint,#c7d2fe), inset -1px 0 0 var(--border-2,#f1f5f9)}'
      + '.iam-perm-matrix th.dept-head{background:var(--surface-2,#f9fafb);border-bottom:1px solid var(--border-1,#e5e7eb);padding:4px 6px;text-align:center;font-size:9px;font-weight:600;letter-spacing:.08em;color:var(--text-3,#6b7280);text-transform:uppercase;position:sticky;top:0;z-index:2}'
      + '.iam-perm-matrix th.role-head{background:var(--surface-2,#f9fafb);border-bottom:1px solid var(--border-1,#e5e7eb);padding:6px 2px;text-align:center;font-size:11px;font-weight:500;color:var(--text-3,#6b7280);min-width:42px;max-width:42px;position:sticky;top:22px;z-index:2;cursor:default;transition:background 120ms ease}'
      + '.iam-perm-matrix th.role-head:hover{background:var(--brand-tint,#eef2ff)}'
      + '.iam-perm-matrix th.role-head .role-icon{font-size:18px;line-height:1;display:block;filter:saturate(1.05)}'
      + '.iam-perm-matrix th.perm-head{position:sticky;left:0;background:var(--surface-1,#fff);padding:6px 10px 6px 12px;border-bottom:1px solid var(--border-1,#e5e7eb);text-align:left;font-weight:500;font-size:12px;z-index:1;border-right:1px solid var(--border-1,#e5e7eb)}'
      + '.iam-perm-matrix tr:hover .perm-head{background:var(--brand-tint,#eef2ff)}'
      + '.iam-perm-matrix td.cell{padding:3px 0;border-bottom:1px solid var(--border-2,#f3f4f6);text-align:center;vertical-align:middle;width:42px;height:32px}'
      + '.iam-perm-matrix tr:hover td.cell:not(.dept-start){background:rgba(99,102,241,.04)}'
      + '.iam-perm-matrix .perm-cell{width:30px;height:26px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--text-3,#9ca3af);font-size:13px;font-weight:700;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:transform 120ms ease,background 120ms ease,box-shadow 120ms ease,border-color 120ms ease}'
      + '.iam-perm-matrix .perm-cell:hover{transform:scale(1.12);border-color:var(--brand-primary,#4f46e5);box-shadow:0 1px 6px rgba(79,70,229,.18)}'
      + '.iam-perm-matrix .perm-cell:active{transform:scale(0.96)}'
      + '.iam-perm-matrix .perm-cell.empty{opacity:.25}'
      + '.iam-perm-matrix .perm-cell.empty:hover{opacity:1;background:rgba(99,102,241,.06);color:var(--brand-primary,#4f46e5)}'
      + '.iam-perm-matrix .perm-cell.grant{background:linear-gradient(180deg,#ecfccb 0%,#bbf7d0 100%);color:#15803d;border-color:#86efac}'
      + '.iam-perm-matrix .perm-cell.grant:hover{background:linear-gradient(180deg,#bbf7d0 0%,#86efac 100%)}'
      + '.iam-perm-matrix .perm-cell.deny{background:linear-gradient(180deg,#fee2e2 0%,#fecaca 100%);color:#991b1b;border-color:#fca5a5}'
      + '.iam-perm-matrix .perm-cell.deny:hover{background:linear-gradient(180deg,#fecaca 0%,#fca5a5 100%)}'
      + '.iam-perm-matrix .perm-cell.wild{font-style:italic;font-weight:600}'
      + '.iam-perm-matrix .perm-cell.dangerous-row{box-shadow:inset 0 -2px 0 rgba(220,38,38,.18)}'
      + '@media (prefers-color-scheme: dark){'
      +   '.iam-perm-matrix th,.iam-perm-matrix td{box-shadow:inset -1px 0 0 rgba(255,255,255,.06)}'
      +   '.iam-perm-matrix .perm-cell.grant{background:linear-gradient(180deg,#14532d 0%,#166534 100%);color:#bbf7d0;border-color:#15803d}'
      +   '.iam-perm-matrix .perm-cell.deny{background:linear-gradient(180deg,#7f1d1d 0%,#991b1b 100%);color:#fecaca;border-color:#b91c1c}'
      + '}';
    document.head.appendChild(s);
  }

  function renderPermissions(el){
    injectPermMatrixStyles();
    el.innerHTML = UI.loadingHtml();
    Promise.all([
      UI.runtime.list('core_system','permission_catalog', { limit: 500, sort:'sort_order' }),
      UI.runtime.list('core_system','roles', { limit: 500 })
    ]).then(function(r){
      var perms = r[0].data || [];
      var roles = (r[1].data || []).map(decorateRole);
      // Sort roles by dept_code then by role_code so dept groups are contiguous
      // and we can draw subtle vertical separators between groups.
      roles.sort(function(a,b){
        var da = (a.dept_code||'ZZZ'), db = (b.dept_code||'ZZZ');
        if (da !== db) return da < db ? -1 : 1;
        return (a.role_code||'') < (b.role_code||'') ? -1 : 1;
      });
      var prevDept = null;
      roles.forEach(function(r){ r._deptStart = (r.dept_code !== prevDept); prevDept = r.dept_code; });
      var search = '';
      var groupFilter = '';

      function rerender(){
        var groups = Array.from(new Set(perms.map(function(p){ return p.module_code || (p.permission_code||'').split('.')[0]; }).filter(Boolean))).sort();
        var permsShown = perms.filter(function(p){
          if (groupFilter && (p.module_code || (p.permission_code||'').split('.')[0]) !== groupFilter) return false;
          if (!search) return true;
          var hay = ((p.permission_code||'')+' '+(p.label||'')+' '+(p.label_vi||'')+' '+(p.description_vi||'')).toLowerCase();
          return hay.indexOf(search.toLowerCase()) >= 0;
        });

        var head = UI.panelHeader(
          t('Permission catalog × roles','Catalog quyền × vai trò'),
          t('Click any cell to grant (✓), deny (✗) or clear. Writes through to roles.permissions JSONB with optimistic concurrency. Each click writes one audit_events row.',
            'Bấm vào ô để Cấp (✓), Từ chối (✗) hoặc Xoá. Ghi vào roles.permissions JSONB với khoá lạc quan. Mỗi click ghi 1 audit_events.'),
          UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'pm-refresh' })
          + UI.btn(t('Test grant','Kiểm tra quyền user'),{ icon:'🔍', kind:'secondary', id:'pm-test' })
          + UI.btn(t('Apply canonical seed','Áp seed chuẩn'),{ icon:'🛡️', kind:'secondary', id:'pm-seed' })
        );
        var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
          + '<input type="search" id="pm-search" value="'+UI.escapeAttr(search)+'" placeholder="'+esc(t('Search permission…','Tìm quyền…'))+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:240px">'
          + '<select id="pm-group" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          + '<option value="">'+esc(t('All groups','Tất cả nhóm'))+'</option>'
          + groups.map(function(g){ return '<option value="'+UI.escapeAttr(g)+'"'+(groupFilter===g?' selected':'')+'>'+esc(g)+'</option>'; }).join('')
          + '</select>'
          + '<div style="margin-left:auto;font-size:11px;color:var(--text-3);align-self:center">'+permsShown.length+' '+esc(t('permissions × ','quyền × '))+roles.length+' '+esc(t('roles','vai trò'))+'</div>'
          + '</div>';

        // Matrix: rows=permissions, cols=roles. roles are pre-sorted by dept so
        // we can draw a thin brand-tinted vertical separator at every dept
        // boundary (subtle column dividers between groups).
        var deptGroups = [];
        var lastDept = null;
        roles.forEach(function(r){
          if (r.dept_code !== lastDept){
            deptGroups.push({ dept: r.dept_code || '—', count: 1 });
            lastDept = r.dept_code;
          } else {
            deptGroups[deptGroups.length-1].count += 1;
          }
        });

        var thead = '<thead>';
        // Row 0 — dept group banner
        thead += '<tr><th class="dept-head" style="text-align:left;padding-left:12px">'+esc(t('DEPT','PHÒNG'))+'</th>';
        deptGroups.forEach(function(g, idx){
          thead += '<th class="dept-head'+(idx>0?' dept-start':'')+'" colspan="'+g.count+'">'+esc(g.dept)+'</th>';
        });
        thead += '</tr>';
        // Row 1 — role icon header
        thead += '<tr>'
          + '<th class="perm-head" style="top:22px;z-index:3;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-3)">'+esc(t('PERMISSION','QUYỀN'))+'</th>';
        roles.forEach(function(r){
          thead += '<th class="role-head'+(r._deptStart?' dept-start':'')+'" title="'+UI.escapeAttr((r.role_label_vi||r.role_code)+'\n'+r.role_code+'\n'+(r.dept_code||''))+'">'
            + '<span class="role-icon">'+esc(r._icon)+'</span>'
            + '</th>';
        });
        thead += '</tr></thead>';

        var tbody = '<tbody>';
        permsShown.forEach(function(p){
          tbody += '<tr><th class="perm-head">'
            + '<div>'+esc(p.label_vi||p.label||p.permission_code)+(p.is_dangerous?' <span style="color:var(--red-dark,#991b1b)" title="Dangerous">⚠</span>':'')+'</div>'
            + '<div style="font-family:ui-monospace,monospace;font-size:10px;color:var(--text-3)">'+esc(p.permission_code)+(p.required_aal_level>=2?' · AAL'+p.required_aal_level:'')+'</div>'
            + '</th>';
          roles.forEach(function(r){
            var ee = effectiveEffect(r, p.permission_code);
            var current = ee.effect;
            var via = ee.via;
            var isWild = via && via !== p.permission_code;
            var stateClass = current === 'grant' ? 'grant' : (current === 'deny' ? 'deny' : 'empty');
            var cellChar = current === 'grant' ? (isWild ? '◎' : '✓') : (current === 'deny' ? (isWild ? '◍' : '✗') : '·');
            var titleText = (current === 'grant' ? 'GRANT' : (current === 'deny' ? 'DENY' : '—'))
              + ' — ' + (r.role_label_vi||r.role_code) + ' × ' + p.permission_code
              + (via ? '  (via pattern: '+via+')' : '');
            tbody += '<td class="cell'+(r._deptStart?' dept-start':'')+'">'
              + '<button type="button" class="perm-cell '+stateClass+(isWild?' wild':'')+'"'
              + ' data-perm="'+UI.escapeAttr(p.permission_code)+'"'
              + ' data-role="'+UI.escapeAttr(r.role_code)+'"'
              + ' title="'+UI.escapeAttr(titleText)+'" aria-label="'+UI.escapeAttr(titleText)+'">'
              + esc(cellChar)
              + '</button>'
              + '</td>';
          });
          tbody += '</tr>';
        });
        tbody += '</tbody>';
        el.innerHTML = head + toolbar + '<div class="iam-perm-matrix" style="border:1px solid var(--border-1,#e5e7eb);border-radius:8px;overflow:auto;max-height:640px;background:var(--surface-1,#fff)"><table style="width:100%">'+thead+tbody+'</table></div>';

        el.querySelector('#pm-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 220));
        el.querySelector('#pm-group').addEventListener('change', function(e){ groupFilter = e.target.value; rerender(); });
        el.querySelector('#pm-refresh').addEventListener('click', function(){ renderPermissions(el); });
        el.querySelector('#pm-test').addEventListener('click', function(){ openTestGrantDialog(roles); });
        el.querySelector('#pm-seed').addEventListener('click', function(){
          UI.confirmDestructive({
            title: t('Apply canonical seed','Áp seed chuẩn quốc tế'),
            message: t('Re-apply the canonical least-privilege seed (NIST 800-53 AC-6 + SOX 404 SoD) to all 38 catalog roles. Existing custom grants on those roles will be overwritten with the canonical baseline; custom roles outside the catalog are left untouched.','Áp lại bộ phân quyền chuẩn (least-privilege NIST + SoD SOX) cho cả 38 vai trò trong catalog. Mọi cấu hình tuỳ chỉnh hiện tại sẽ bị ghi đè bằng chuẩn; vai trò ngoài catalog không bị động.'),
            requireText: 'SEED',
            requireReason: true,
            confirmLabel: t('Apply seed','Áp seed')
          }).then(function(r){
            if (!r || !r.confirmed) return;
            UI.fetchJson('/api/v1/rbac/canonical-seed:apply', {
              method: 'POST',
              body: { reason: r.reason }
            }).then(function(resp){
              UI.audit('rbac.canonical_seed.apply', { reason: r.reason, applied: resp && resp.applied });
              UI.toast(t('Seed applied to '+(resp && resp.applied ? resp.applied : '38')+' roles','Đã áp seed cho '+(resp && resp.applied ? resp.applied : '38')+' vai trò'),'ok');
              renderPermissions(el);
            }).catch(function(err){ UI.toast((err && err.message) || t('Seed failed','Áp seed thất bại'),'block'); });
          });
        });

        // Click cell → cycle through current effective state.
        // Pattern entries (e.g. "production.*") are LEFT ALONE; we only ever
        // touch the EXACT permission_code in the grants/denies arrays so an
        // admin can override a wildcard for one specific permission.
        Array.prototype.forEach.call(el.querySelectorAll('button.perm-cell[data-perm][data-role]'), function(cell){
          cell.addEventListener('click', function(){
            var permCode = cell.getAttribute('data-perm');
            var roleCode = cell.getAttribute('data-role');
            var role = roles.find(function(x){ return x.role_code === roleCode; });
            if (!role) return;
            var ee = effectiveEffect(role, permCode);
            var cur = ee.effect; // null | 'grant' | 'deny'
            var next = cur === 'grant' ? 'deny' : (cur === 'deny' ? null : 'grant');
            var p = role.permissions || {};
            var grants = Array.isArray(p.permissions) ? p.permissions.slice() : [];
            var denies = Array.isArray(p.denies) ? p.denies.slice() : [];
            // Always strip the EXACT code from both arrays first
            grants = grants.filter(function(x){ return x !== permCode; });
            denies = denies.filter(function(x){ return x !== permCode; });
            if (next === 'grant') grants.push(permCode);
            else if (next === 'deny') denies.push(permCode);
            // If the previous cur came from a wildcard, we may need to add a
            // counter-entry to actually flip the effective result. Detect that:
            if (next === null && ee.via && ee.via !== permCode){
              // user wanted to clear, but a wildcard still grants/denies it.
              // Add an explicit 'unset' override: if the wildcard was a grant,
              // add to denies; vice-versa. We treat this as a deny-by-clear
              // for grants (safer) and clear-on-deny for denies.
              if (cur === 'grant') denies.push(permCode);
              // for deny→clear via wildcard, we add to grants to override
              else if (cur === 'deny') grants.push(permCode);
            }
            var newPerms = Object.assign({}, p, { permissions: grants, denies: denies });
            cell.style.opacity = '0.5';
            var rolePk = role.role_id || role.role_code;
            function doPut(){
              return UI.runtime.update('core_system','roles', rolePk, { permissions: newPerms }, role.row_version)
                .then(function(resp){
                  var rec = (resp && resp.record) || resp || {};
                  var saved = rec.permissions;
                  if (typeof saved === 'string'){ try { saved = JSON.parse(saved); } catch(e){ saved = newPerms; } }
                  role.permissions = saved || newPerms;
                  if (rec.row_version != null) role.row_version = rec.row_version;
                  else if (role.row_version != null) role.row_version += 1;
                  UI.audit('role.permissions.update', { role_code: roleCode, permission_code: permCode, effect: next });
                  rerender();
                });
            }
            doPut().catch(function(err){
              if (err && (err.status === 409 || /409|conflict|concurrency/i.test(String(err.message||'')))){
                // refetch this role and retry once
                return UI.runtime.list('core_system','roles', { limit: 500 }).then(function(r){
                  var fresh = (r.data||[]).find(function(x){ return x.role_code === roleCode; });
                  if (fresh){
                    role.permissions = typeof fresh.permissions === 'string' ? JSON.parse(fresh.permissions) : fresh.permissions;
                    role.row_version = fresh.row_version;
                    // recompute newPerms from refreshed state
                    var p2 = role.permissions || {};
                    var grants2 = Array.isArray(p2.permissions) ? p2.permissions.slice() : [];
                    var denies2 = Array.isArray(p2.denies) ? p2.denies.slice() : [];
                    grants2 = grants2.filter(function(x){ return x !== permCode; });
                    denies2 = denies2.filter(function(x){ return x !== permCode; });
                    if (next === 'grant') grants2.push(permCode);
                    else if (next === 'deny') denies2.push(permCode);
                    newPerms = Object.assign({}, p2, { permissions: grants2, denies: denies2 });
                    return doPut();
                  }
                  throw err;
                });
              }
              throw err;
            }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); cell.style.opacity = '1'; });
          });
        });
      }
      rerender();
    }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, function(){ renderPermissions(el); }); });
  }

  function openTestGrantDialog(roles){
    var fields = [
      { key:'role_code', label:t('Role','Vai trò'), type:'select', required:true,
        options: roles.map(function(r){ return { value:r.role_code, label:(r.role_label_vi||r.role_code)+' ('+r.role_code+')' }; }) }
    ];
    var form = UI.buildForm(fields);
    var resultBox = document.createElement('div');
    resultBox.style.cssText = 'margin-top:14px;padding:12px;border-radius:6px;border:1px solid var(--border-1,#e5e7eb);background:var(--surface-2,#f9fafb);min-height:60px;font-size:13px';
    form.el.appendChild(resultBox);
    var modal = UI.openModal({
      title:t('Effective permissions for role','Quyền hiệu lực của vai trò'),
      bodyEl:form.el, width:'620px',
      footerHtml:'<button class="btn-admin secondary" id="tg-close">'+esc(t('Close','Đóng'))+'</button>'
        +'<button class="btn-admin" id="tg-go">'+esc(t('Run','Chạy'))+'</button>'
    });
    modal.card.querySelector('#tg-close').addEventListener('click', modal.close);
    modal.card.querySelector('#tg-go').addEventListener('click', function(){
      var v = form.getValues();
      var role = roles.find(function(x){ return x.role_code === v.role_code; });
      if (!role) return;
      var p = role.permissions || {};
      var grants = Array.isArray(p.permissions) ? p.permissions : [];
      var denies = Array.isArray(p.denies) ? p.denies : [];
      var flags = [];
      ['admin','approve','canEditDocs','canCreateDocs','canViewActivity','canExportUsers'].forEach(function(k){
        if (p[k]) flags.push(k);
      });
      resultBox.innerHTML = '<div style="font-weight:600;margin-bottom:6px">'+esc(role._icon)+' '+esc(role.role_label_vi||role.role_code)+' <span style="color:var(--text-3);font-weight:400">— level '+(p.level!=null?p.level:'?')+'</span></div>'
        + '<div style="margin-bottom:6px">'+badge(t('GRANT patterns','MẪU CẤP'),'ok')+' '+grants.length+'</div>'
        + (grants.length ? '<div style="font-family:ui-monospace,monospace;font-size:11px;color:var(--green-dark,#166534);margin-bottom:8px">'+grants.map(esc).join(' · ')+'</div>' : '<div style="font-style:italic;color:var(--text-3);margin-bottom:8px">none</div>')
        + '<div style="margin-bottom:6px">'+badge(t('DENY patterns','MẪU TỪ CHỐI'),'block')+' '+denies.length+'</div>'
        + (denies.length ? '<div style="font-family:ui-monospace,monospace;font-size:11px;color:var(--red-dark,#991b1b);margin-bottom:8px">'+denies.map(esc).join(' · ')+'</div>' : '<div style="font-style:italic;color:var(--text-3);margin-bottom:8px">none</div>')
        + '<div style="margin-bottom:6px">'+badge(t('Capability flags','Khả năng'),'info')+' '+flags.length+'</div>'
        + (flags.length ? '<div style="font-size:12px;color:var(--text-2)">'+flags.map(function(f){ return badge(f,'info'); }).join(' ')+'</div>' : '<div style="font-style:italic;color:var(--text-3)">none</div>');
    });
  }

  // ── 4. SoD ──────────────────────────────────────────────────────────────────
  function renderSoD(el){
    el.innerHTML = UI.loadingHtml();
    Promise.all([
      UI.runtime.list('core_system','role_sod_conflict', { limit: 200 }),
      UI.runtime.list('core_system','roles', { limit: 500 })
    ]).then(function(r){
      var conflicts = r[0].data || [];
      var roles = (r[1].data || []).map(decorateRole);
      var rolesById = {}; roles.forEach(function(r){ rolesById[r.role_id] = r; });
      var head = UI.panelHeader(
        t('Separation-of-Duties matrix','Ma trận tách trách nhiệm'),
        t('Pairs of roles that cannot be assigned to the same user. block = refuse; warn = allow with audit. Backend pre-checks every user-role assignment against this matrix.',
          'Cặp vai trò không cấp đồng thời. block = chặn; warn = cho phép nhưng cảnh báo. Backend kiểm tra trước mọi lần cấp vai trò.'),
        UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'sd-refresh' })
        + UI.btn(t('Add conflict','Thêm xung đột'),{ icon:'＋', id:'sd-new' })
      );
      var columns = [
        { key:'pair', label:t('Conflict pair','Cặp xung đột'), render:function(c){
            var ra = rolesById[c.role_a_id], rb = rolesById[c.role_b_id];
            return '<div style="font-weight:600;font-size:13px">'+esc(c.label_vi||c.label||'')+'</div>'
              + '<div style="font-size:12px;color:var(--text-2);margin-top:2px">'
              +   esc((ra&&ra._icon)||'•')+' '+esc((ra&&(ra.role_label_vi||ra.role_code))||c.role_a_id)
              +   ' <span style="color:var(--text-3)">↔</span> '
              +   esc((rb&&rb._icon)||'•')+' '+esc((rb&&(rb.role_label_vi||rb.role_code))||c.role_b_id)
              + '</div>';
          } },
        { key:'severity', label:t('Severity','Mức độ'), width:'100px', render:function(c){
            return badge(c.severity||'block', c.severity==='block'?'block':(c.severity==='warn'?'warn':'muted'));
          } },
        { key:'rationale', label:t('Rationale','Lý do'), render:function(c){
            return '<div style="font-size:12px;color:var(--text-2);line-height:1.5">'+esc(c.rationale_vi||c.rationale||'')+'</div>';
          } },
        { key:'compliance_refs', label:t('Compliance','Căn cứ'), width:'160px', render:function(c){
            var r = c.compliance_refs;
            if (typeof r === 'string'){ try { r = JSON.parse(r); } catch(e){ r = {}; } }
            var refs = r && Object.keys(r).length ? Object.values(r).join(', ') : 'COBIT 5 DSS06.03';
            return '<span style="font-size:11px;color:var(--text-3)">'+esc(String(refs).slice(0,60))+'</span>';
          } },
        { key:'actions', label:'', width:'120px', render:function(c){
            var pk = c.conflict_id || c.id;
            return '<button class="btn-admin secondary sm" data-del-sod="'+UI.escapeAttr(pk)+'" style="color:var(--red-dark,#991b1b)">'+esc(t('Remove','Xoá'))+'</button>';
          } }
      ];
      el.innerHTML = head;
      if (!conflicts.length) el.innerHTML += UI.emptyHtml(t('No SoD conflicts defined','Chưa định nghĩa xung đột nào'));
      else el.appendChild(UI.buildTable(columns, conflicts, { rowKey:'conflict_id' }));
      el.querySelector('#sd-refresh').addEventListener('click', function(){ renderSoD(el); });
      el.querySelector('#sd-new').addEventListener('click', function(){ openSodEditor(null, roles, el); });
      Array.prototype.forEach.call(el.querySelectorAll('[data-del-sod]'), function(b){
        b.addEventListener('click', function(){
          var pk = b.getAttribute('data-del-sod');
          var c = conflicts.find(function(x){ return String(x.conflict_id||x.id)===pk; });
          UI.confirmDestructive({ title:t('Remove SoD conflict','Xoá xung đột SoD'), requireReason:true }).then(function(r){
            if (!r||!r.confirmed) return;
            UI.runtime.delete('core_system','role_sod_conflict', pk, c && c.row_version).then(function(){
              UI.audit('rbac.sod.delete', { conflict_id: pk, reason: r.reason });
              UI.toast(t('Removed','Đã xoá'),'ok'); renderSoD(el);
            }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
          });
        });
      });
    }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, function(){ renderSoD(el); }); });
  }

  function openSodEditor(existing, roles, hostEl){
    var roleOpts = roles.map(function(r){ return { value:r.role_id, label:r._icon+' '+(r.role_label_vi||r.role_code)+' ('+r.role_code+')' }; });
    var fields = [
      { key:'role_a_id', label:t('Role A','Vai trò A'), type:'select', required:true, value: existing ? existing.role_a_id : '', options: roleOpts },
      { key:'role_b_id', label:t('Role B','Vai trò B'), type:'select', required:true, value: existing ? existing.role_b_id : '', options: roleOpts },
      { key:'severity', label:t('Severity','Mức độ'), type:'select', required:true, value: existing ? (existing.severity||'block') : 'block',
        options:[{ value:'block', label:t('block — refuse assignment','block — chặn cấp') },{ value:'warn', label:t('warn — warning only','warn — chỉ cảnh báo') }] },
      { key:'label', label:t('Label (English)','Nhãn (English)'), required:true, value: existing ? (existing.label||'') : '' },
      { key:'label_vi', label:t('Label (Vietnamese, with diacritics)','Nhãn (Tiếng Việt có dấu)'), required:true, value: existing ? (existing.label_vi||'') : '' },
      { key:'rationale', label:t('Rationale (English)','Lý do (English)'), type:'textarea', rows:2, required:true, value: existing ? (existing.rationale||'') : '' },
      { key:'rationale_vi', label:t('Rationale (VI)','Lý do (Tiếng Việt)'), type:'textarea', rows:2, required:true, value: existing ? (existing.rationale_vi||'') : '' }
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
      if (v.role_a_id === v.role_b_id){ UI.toast(t('Pair must be two different roles','Cặp phải khác nhau'),'warn'); return; }
      UI.runtime.create('core_system','role_sod_conflict', v).then(function(){
        UI.audit('rbac.sod.create', v);
        UI.toast(t('Saved','Đã lưu'),'ok');
        modal.close();
        renderSoD(hostEl);
      }).catch(function(err){ UI.toast((err && err.message) || t('Save failed','Lưu thất bại'),'block'); });
    });
  }

  // ── 5. Access Review ───────────────────────────────────────────────────────
  function renderReview(el){
    el.innerHTML = UI.loadingHtml();
    UI.runtime.list('core_system','access_review_campaign', { sort:'-scheduled_for', limit: 100 }).then(function(r){
      var campaigns = r.data || [];
      var head = UI.panelHeader(
        t('Periodic access review','Đánh giá phân quyền định kỳ'),
        t('Campaign-based re-certification (ISO 27001 A.9.2.5 / SOX 404). Closed campaigns are immutable evidence.',
          'Tái xác nhận theo chiến dịch (ISO 27001 A.9.2.5 / SOX 404). Chiến dịch đã đóng = bằng chứng bất biến.'),
        UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'rv-refresh' })
        + UI.btn(t('New campaign','Chiến dịch mới'),{ icon:'＋', id:'rv-new' })
      );
      var columns = [
        { key:'name', label:t('Campaign','Chiến dịch'), render:function(c){
            return '<div style="font-weight:500">'+esc(c.name_vi||c.name||c.campaign_code||'')+'</div>'
              + '<div style="font-size:11px;color:var(--text-3)">'+esc(c.campaign_code||'')+'</div>';
          } },
        { key:'scheduled_for', label:t('Scheduled','Lịch'), width:'130px', render:function(c){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc((c.scheduled_for||'').slice(0,10))+'</span>'; } },
        { key:'deadline_at', label:t('Deadline','Hạn'), width:'130px', render:function(c){ return c.deadline_at ? '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc(c.deadline_at.slice(0,10))+'</span>' : '—'; } },
        { key:'status', label:t('Status','Trạng thái'), width:'130px', render:function(c){
            var s = c.status||'scheduled';
            var tone = (s==='closed'||s==='completed')?'ok':(s==='in_progress'||s==='active'?'info':'warn');
            return badge(s, tone);
          } }
      ];
      el.innerHTML = head;
      if (!campaigns.length) el.innerHTML += UI.emptyHtml(t('No campaigns yet — create the first one','Chưa có chiến dịch nào — tạo chiến dịch đầu tiên'));
      else el.appendChild(UI.buildTable(columns, campaigns, { rowKey:'campaign_id' }));
      el.querySelector('#rv-refresh').addEventListener('click', function(){ renderReview(el); });
      el.querySelector('#rv-new').addEventListener('click', function(){ openReviewEditor(el); });
    }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, function(){ renderReview(el); }); });
  }
  function openReviewEditor(hostEl){
    var fields = [
      { key:'campaign_code', label:t('Campaign code','Mã chiến dịch'), required:true, placeholder:'ARV-2026-Q2' },
      { key:'name', label:t('Name (English)','Tên (English)'), required:true },
      { key:'name_vi', label:t('Name (Vietnamese with diacritics)','Tên (Tiếng Việt có dấu)'), required:true },
      { key:'description_vi', label:t('Scope description (VI)','Mô tả phạm vi (VI)'), type:'textarea', rows:2, required:true },
      { key:'scheduled_for', label:t('Scheduled start','Ngày bắt đầu'), required:true, value: new Date().toISOString().slice(0,10) },
      { key:'deadline_at', label:t('Deadline','Hạn chót'), required:true, value: new Date(Date.now()+30*86400000).toISOString().slice(0,10) }
    ];
    var form = UI.buildForm(fields);
    var modal = UI.openModal({
      title:t('New access review campaign','Mở chiến dịch đánh giá phân quyền'),
      bodyEl: form.el, width:'600px',
      footerHtml:'<button class="btn-admin secondary" id="rc-cancel">'+esc(t('Cancel','Huỷ'))+'</button>'
        + '<button class="btn-admin" id="rc-go">'+esc(t('Open','Mở'))+'</button>'
    });
    modal.card.querySelector('#rc-cancel').addEventListener('click', modal.close);
    modal.card.querySelector('#rc-go').addEventListener('click', function(){
      var v = form.getValues();
      // Note: scope_filter / target_role_codes / target_dept_codes are text[]
      // columns; the GenericCrudController rejects arrays for non-JSONB columns,
      // so we omit them and rely on the DB defaults (empty arrays).
      var payload = {
        campaign_code: v.campaign_code,
        name: v.name, name_vi: v.name_vi,
        description: v.description_vi, description_vi: v.description_vi,
        scheduled_for: v.scheduled_for + 'T00:00:00Z',
        deadline_at: v.deadline_at + 'T23:59:59Z',
        status: 'scheduled'
      };
      UI.runtime.create('core_system','access_review_campaign', payload).then(function(){
        UI.audit('access_review.open', payload);
        UI.toast(t('Campaign opened','Đã mở chiến dịch'),'ok');
        modal.close();
        renderReview(hostEl);
      }).catch(function(err){ UI.toast((err && err.message) || t('Failed','Thất bại'),'block'); });
    });
  }

  // ── 6. Retention ────────────────────────────────────────────────────────────
  // ── 8. Error Codes — bilingual error catalogue (restored 2026-05-20) ──────
  // Every API controller can look up an operator-friendly bilingual message
  // for a stable code (e.g. AUTH-001) via /api/v1/error-codes/{code}. This
  // tab is the admin CRUD over those rows. Data: 33+ rows on live VPS.
  function renderErrorCodes(el){
    el.innerHTML = UI.loadingHtml();
    UI.fetchJson('/api/v1/admin/error-codes').then(function(payload){
      var rows = (payload && payload.error_codes) || [];
      var grouped = (payload && payload.grouped_by_domain) || {};
      var domains = Object.keys(grouped).sort();
      var head = UI.panelHeader(
        t('Error Code Registry','Sổ Mã Lỗi'),
        t('Bilingual catalogue of API error codes. Modules call /api/v1/error-codes/{code} to render friendly messages. Activate / deactivate keeps history intact; delete is destructive.',
          'Danh mục mã lỗi song ngữ. Mỗi module gọi /api/v1/error-codes/{code} để hiển thị thông báo thân thiện. Tắt giữ lịch sử; xoá là không phục hồi.'),
        UI.btn(t('+ New code','+ Thêm mã'),{ icon:'➕', kind:'primary', id:'ec-new' })
          + ' ' + UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'ec-refresh' })
      );
      var columns = [
        { key:'code', label:t('Code','Mã'), width:'120px', render:function(r){
            return '<code style="font-family:ui-monospace,monospace;font-size:12.5px;background:var(--bg-2,#f5f7fb);padding:2px 6px;border-radius:3px">'+esc(r.code||'')+'</code>';
          } },
        { key:'domain', label:t('Domain','Miền'), width:'110px', render:function(r){
            return '<span style="font-size:11px;color:var(--text-2);font-family:ui-monospace,monospace">'+esc(r.domain||'')+'</span>';
          } },
        { key:'http_status', label:'HTTP', width:'70px', render:function(r){
            var s = String(r.http_status||'');
            var tone = (s.charAt(0)==='5') ? 'block' : (s.charAt(0)==='4' ? 'warn' : 'info');
            return badge(s, tone);
          } },
        { key:'severity', label:t('Severity','Mức'), width:'90px', render:function(r){
            var sev = r.severity || 'error';
            var tone = sev==='error' ? 'block' : (sev==='warning' ? 'warn' : 'info');
            return badge(sev, tone);
          } },
        { key:'title_vi', label:t('Title (VI / EN)','Tiêu đề (VI / EN)'), render:function(r){
            return '<div style="font-size:13px;color:var(--text-1)">'+esc(r.title_vi||'')+'</div>'
              + (r.title_en ? '<div style="font-size:11.5px;color:var(--text-3);margin-top:2px">'+esc(r.title_en)+'</div>' : '');
          } },
        { key:'is_active', label:t('Status','Trạng thái'), width:'110px', render:function(r){
            return r.is_active ? badge(t('Active','Đang dùng'),'success') : badge(t('Disabled','Tắt'),'muted');
          } },
        { key:'_actions', label:'', width:'200px', render:function(r){
            var act = r.is_active
              ? '<button class="btn-admin secondary ec-toggle" data-code="'+esc(r.code)+'" data-target="deactivate" style="font-size:11px;padding:3px 9px;margin-right:3px">'+t('Disable','Tắt')+'</button>'
              : '<button class="btn-admin secondary ec-toggle" data-code="'+esc(r.code)+'" data-target="activate" style="font-size:11px;padding:3px 9px;margin-right:3px">'+t('Enable','Bật')+'</button>';
            return act
              + '<button class="btn-admin secondary ec-edit"   data-code="'+esc(r.code)+'" style="font-size:11px;padding:3px 9px;margin-right:3px">'+t('Edit','Sửa')+'</button>'
              + '<button class="btn-admin danger    ec-delete" data-code="'+esc(r.code)+'" style="font-size:11px;padding:3px 9px">'+t('Delete','Xoá')+'</button>';
          } }
      ];
      var meta = ''
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--text-3);margin-bottom:10px">'
        +   '<span>'+esc(t('Total codes','Tổng số mã'))+': <b style="color:var(--text-1)">'+rows.length+'</b></span>'
        +   '<span>·</span>'
        +   '<span>'+esc(t('Domains','Miền nghiệp vụ'))+': <b style="color:var(--text-1)">'+domains.length+'</b></span>'
        +   '<span>·</span>'
        +   '<span>'+esc(t('Active','Đang dùng'))+': <b style="color:var(--text-1)">'+rows.filter(function(x){return x.is_active;}).length+'</b></span>'
        + '</div>';
      el.innerHTML = head + meta;
      if (!rows.length) {
        el.innerHTML += UI.emptyHtml(t('No error codes registered yet','Chưa có mã lỗi nào'));
      } else {
        el.appendChild(UI.buildTable(columns, rows, { rowKey:'code' }));
      }
      el.querySelector('#ec-refresh').addEventListener('click', function(){ renderErrorCodes(el); });
      el.querySelector('#ec-new').addEventListener('click', function(){ openErrorCodeEditor(null, function(){ renderErrorCodes(el); }); });
      Array.prototype.forEach.call(el.querySelectorAll('.ec-toggle'), function(btn){
        btn.addEventListener('click', function(){
          var code = btn.getAttribute('data-code');
          var op = btn.getAttribute('data-target');
          UI.fetchJson('/api/v1/admin/error-codes/'+encodeURIComponent(code)+'/'+op, { method:'POST' })
            .then(function(){ renderErrorCodes(el); })
            .catch(function(err){ alert((err && err.message) || op + ' failed'); });
        });
      });
      Array.prototype.forEach.call(el.querySelectorAll('.ec-edit'), function(btn){
        btn.addEventListener('click', function(){
          var code = btn.getAttribute('data-code');
          var row = rows.filter(function(x){ return x.code === code; })[0];
          openErrorCodeEditor(row, function(){ renderErrorCodes(el); });
        });
      });
      Array.prototype.forEach.call(el.querySelectorAll('.ec-delete'), function(btn){
        btn.addEventListener('click', function(){
          var code = btn.getAttribute('data-code');
          if (!confirm(t('Delete '+code+' permanently? Disable is usually safer.','Xoá vĩnh viễn '+code+'? Nên dùng Tắt để giữ lịch sử.'))) return;
          UI.fetchJson('/api/v1/admin/error-codes/'+encodeURIComponent(code), { method:'DELETE' })
            .then(function(){ renderErrorCodes(el); })
            .catch(function(err){ alert((err && err.message) || 'delete failed'); });
        });
      });
    }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, function(){ renderErrorCodes(el); }); });
  }

  function openErrorCodeEditor(row, onSaved){
    var isNew = !row;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,20,28,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
    var rec = row || { code:'', domain:'', http_status:400, severity:'error', title_vi:'', title_en:'', description_vi:'', hint_vi:'', is_active:true };
    function fld(label, key, value, opts){
      opts = opts || {};
      var input = opts.area
        ? '<textarea id="ec-fld-'+key+'" rows="2" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#e3e6ec);border-radius:4px;font-family:inherit;font-size:13px">'+esc(value||'')+'</textarea>'
        : '<input id="ec-fld-'+key+'" type="'+(opts.type||'text')+'" value="'+esc(value||'')+'" '+(opts.disabled?'disabled':'')+' placeholder="'+esc(opts.placeholder||'')+'" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#e3e6ec);border-radius:4px;font-size:13px'+(opts.mono?';font-family:ui-monospace,monospace':'')+(opts.disabled?';background:var(--bg-2,#f5f7fb)':'')+'">';
      return '<label style="display:block'+(opts.span===2?';grid-column:span 2':'')+'"><div style="font-size:11px;color:var(--text-2);margin-bottom:3px">'+esc(label)+'</div>'+input+'</label>';
    }
    function sel(label, key, value, options){
      var opts = options.map(function(o){ return '<option value="'+esc(o[0])+'" '+(o[0]===value?'selected':'')+'>'+esc(o[1])+'</option>'; }).join('');
      return '<label style="display:block"><div style="font-size:11px;color:var(--text-2);margin-bottom:3px">'+esc(label)+'</div><select id="ec-fld-'+key+'" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#e3e6ec);border-radius:4px;font-size:13px">'+opts+'</select></label>';
    }
    overlay.innerHTML = ''
      + '<div style="background:var(--bg,#fff);border-radius:10px;max-width:620px;width:100%;border:1px solid var(--ln,#e3e6ec);box-shadow:0 12px 40px rgba(0,0,0,.25)">'
      +   '<div style="padding:14px 20px;border-bottom:1px solid var(--ln,#e3e6ec);display:flex;justify-content:space-between;align-items:center">'
      +     '<strong>'+esc(isNew ? t('New error code','Thêm mã lỗi') : t('Edit '+rec.code,'Sửa '+rec.code))+'</strong>'
      +     '<button class="ec-close" style="border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer">×</button>'
      +   '</div>'
      +   '<div style="padding:16px 20px;display:grid;gap:10px;grid-template-columns:1fr 1fr;font-size:13px">'
      +     fld(t('Code','Mã'), 'code', rec.code, { mono:true, disabled:!isNew, placeholder:'AUTH-001' })
      +     fld(t('Domain','Miền'), 'domain', rec.domain, { placeholder:'auth / user / system / …' })
      +     fld('HTTP', 'http_status', String(rec.http_status||400), { type:'number' })
      +     sel(t('Severity','Mức'), 'severity', rec.severity, [['error','error'],['warning','warning'],['info','info']])
      +     fld(t('Title (VI) — required','Tiêu đề VI (bắt buộc)'), 'title_vi', rec.title_vi||'', { span:2 })
      +     fld(t('Title (EN)','Tiêu đề EN'), 'title_en', rec.title_en||'', { span:2 })
      +     fld(t('Description (VI)','Mô tả VI'), 'description_vi', rec.description_vi||'', { span:2, area:true })
      +     fld(t('Hint (VI)','Gợi ý VI'), 'hint_vi', rec.hint_vi||'', { span:2 })
      +     '<label style="grid-column:span 2;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-2)"><input type="checkbox" id="ec-fld-is_active" '+(rec.is_active!==false?'checked':'')+'> '+esc(t('Active (modules can fetch this code)','Đang dùng (module được phép gọi mã này)'))+'</label>'
      +   '</div>'
      +   '<div style="padding:12px 20px;border-top:1px solid var(--ln,#e3e6ec);display:flex;justify-content:flex-end;gap:8px">'
      +     '<button class="ec-cancel btn-admin secondary">'+esc(t('Cancel','Hủy'))+'</button>'
      +     '<button class="ec-save btn-admin primary">'+esc(isNew ? t('Create','Tạo') : t('Save','Lưu'))+'</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(overlay);
    var close = function(){ overlay.remove(); };
    overlay.querySelector('.ec-close').addEventListener('click', close);
    overlay.querySelector('.ec-cancel').addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    overlay.querySelector('.ec-save').addEventListener('click', function(){
      var v = function(k){ var el2 = overlay.querySelector('#ec-fld-'+k); return el2 ? el2.value : ''; };
      var body = {
        code: v('code'),
        domain: v('domain'),
        http_status: parseInt(v('http_status'),10) || 400,
        severity: v('severity'),
        title_vi: v('title_vi'),
        title_en: v('title_en'),
        description_vi: v('description_vi'),
        hint_vi: v('hint_vi'),
        is_active: overlay.querySelector('#ec-fld-is_active').checked,
      };
      var url = isNew ? '/api/v1/admin/error-codes' : '/api/v1/admin/error-codes/'+encodeURIComponent(rec.code);
      var method = isNew ? 'POST' : 'PUT';
      UI.fetchJson(url, { method: method, body: body })
        .then(function(){ close(); if (typeof onSaved === 'function') onSaved(); })
        .catch(function(err){ alert((err && err.message) || 'save failed'); });
    });
  }

  function renderRetention(el){
    el.innerHTML = UI.loadingHtml();
    UI.runtime.list('master_data_governance','retention_policy', { limit: 100 }).then(function(r){
      var policies = r.data || [];
      var head = UI.panelHeader(
        t('Retention policies','Chính sách lưu trữ hồ sơ'),
        t('Per record-class retention requirements (Vietnam Archives Law 2011, GDPR Art. 5(1)(e), 21 CFR §11.10(c)).',
          'Yêu cầu lưu trữ theo loại hồ sơ (Luật Lưu trữ 2011, GDPR Điều 5, 21 CFR §11.10(c)).'),
        UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'rt-refresh' })
      );
      var columns = [
        { key:'policy_code', label:t('Record class','Loại hồ sơ'), render:function(p){
            return '<div style="font-weight:500">'+esc(p.label_vi||p.label||p.policy_code||'')+'</div>'
              + '<div style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-3)">'+esc(p.policy_code||'')+'</div>';
          } },
        { key:'retention_period_years', label:t('Retain','Lưu trữ'), width:'120px', render:function(p){
            var y = p.retention_period_years || p.retention_years;
            return '<span style="font-family:ui-monospace,monospace;font-size:13px;font-weight:600">'+esc(String(y||'—'))+t(' years',' năm')+'</span>';
          } },
        { key:'disposition_method', label:t('Disposal method','Phương pháp tiêu huỷ'), width:'160px', render:function(p){
            var m = p.disposition_method;
            return badge(m||'—', m==='shred'?'block':(m==='archive'?'info':'muted'));
          } },
        { key:'disposition_witness_required', label:t('Witness','Chứng kiến'), width:'110px', render:function(p){
            return p.disposition_witness_required ? badge(t('Required','Bắt buộc'),'warn') : badge(t('Optional','Không'),'muted');
          } },
        { key:'retention_basis', label:t('Basis','Căn cứ'), render:function(p){ return '<span style="font-size:12px;color:var(--text-2)">'+esc(p.retention_basis||'—')+'</span>'; } }
      ];
      el.innerHTML = head;
      if (!policies.length) el.innerHTML += UI.emptyHtml(t('No retention policies seeded','Chưa có chính sách lưu trữ'));
      else el.appendChild(UI.buildTable(columns, policies, { rowKey:'policy_code' }));
      el.querySelector('#rt-refresh').addEventListener('click', function(){ renderRetention(el); });
    }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, function(){ renderRetention(el); }); });
  }

  // ── 7. Audit Trail (audit_events with hash chain) ──────────────────────────
  function renderAudit(el){
    var search = '';
    var typeFilter = '';
    var dateFrom = '';
    var dateTo = '';
    function rerender(){
      el.innerHTML = UI.loadingHtml();
      var params = { sort:'-recorded_at', limit: 200 };
      if (search) params.search = search;
      if (typeFilter) params['filter[event_type]'] = typeFilter;
      if (dateFrom) params['filter[recorded_at__gte]'] = dateFrom;
      if (dateTo) params['filter[recorded_at__lte]'] = dateTo;
      UI.runtime.list('core_system','audit_events', params).then(function(r){
        var rows = r.data || [];
        var total = r.raw && r.raw.total;
        var head = UI.panelHeader(
          '🔒 '+t('Tamper-evident audit trail','Nhật ký chống giả mạo'),
          t('Every event linked by SHA-256 hash chain (prev_hash → event_hash). Modifying any historical event invalidates the chain. Total: '+(total||'?')+' events.',
            'Mọi sự kiện liên kết qua chuỗi hash SHA-256 (prev_hash → event_hash). Sửa bất kỳ sự kiện nào sẽ phá chuỗi. Tổng: '+(total||'?')+' sự kiện.'),
          UI.btn(t('Refresh','Làm mới'),{ icon:'🔄', kind:'secondary', id:'au-refresh' })
          + UI.btn(t('Export CSV','Xuất CSV'),{ icon:'📤', kind:'secondary', id:'au-export' })
        );
        var toolbar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
          + '<input type="search" id="au-search" value="'+UI.escapeAttr(search)+'" placeholder="'+esc(t('Search…','Tìm event_type / actor / payload…'))+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;flex:1;min-width:220px">'
          + '<input type="text" id="au-type" value="'+UI.escapeAttr(typeFilter)+'" placeholder="'+esc(t('Event type filter','Lọc event_type'))+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;width:200px">'
          + '<input type="date" id="au-from" value="'+UI.escapeAttr(dateFrom)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          + '<input type="date" id="au-to" value="'+UI.escapeAttr(dateTo)+'" style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
          + '</div>';
        var columns = [
          { key:'recorded_at', label:t('When','Thời điểm'), width:'160px', render:function(e){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc((e.recorded_at||'').replace('T',' ').slice(0,19))+'</span>'; } },
          { key:'event_type', label:t('Event','Sự kiện'), width:'180px', render:function(e){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+badge(e.event_type||'—','info')+'</span>'; } },
          { key:'aggregate', label:t('Target','Đối tượng'), width:'180px', render:function(e){
              return '<div style="font-size:11px;color:var(--text-2)">'+esc(e.aggregate_type||'')+'</div>'
                + '<div style="font-family:ui-monospace,monospace;font-size:10px;color:var(--text-3)">'+esc((e.aggregate_id||'').slice(0,28))+'</div>';
            } },
          { key:'actor_name', label:t('Actor','Người thao tác'), width:'140px', render:function(e){ return esc(e.actor_name||e.actor_id||'system'); } },
          { key:'ip_address', label:'IP', width:'110px', render:function(e){ return '<span style="font-family:ui-monospace,monospace;font-size:11px">'+esc(e.ip_address||'—')+'</span>'; } },
          { key:'event_hash', label:t('Chain','Hash'), width:'110px', render:function(e){
              if (!e.event_hash) return '—';
              return '<span title="'+UI.escapeAttr(e.event_hash)+'" style="font-family:ui-monospace,monospace;font-size:10px;color:var(--green-dark,#166534)">🔗 '+esc(e.event_hash.slice(0,10))+'</span>';
            } }
        ];
        el.innerHTML = head + toolbar;
        if (!rows.length) el.innerHTML += UI.emptyHtml(t('No events match','Không có sự kiện nào khớp'));
        else el.appendChild(UI.buildTable(columns, rows, { rowKey:'event_id', maxHeight:'520px' }));
        el.querySelector('#au-refresh').addEventListener('click', rerender);
        el.querySelector('#au-search').addEventListener('input', UI.debounce(function(e){ search = e.target.value; rerender(); }, 350));
        el.querySelector('#au-type').addEventListener('input', UI.debounce(function(e){ typeFilter = e.target.value; rerender(); }, 350));
        el.querySelector('#au-from').addEventListener('change', function(e){ dateFrom = e.target.value; rerender(); });
        el.querySelector('#au-to').addEventListener('change', function(e){ dateTo = e.target.value; rerender(); });
        el.querySelector('#au-export').addEventListener('click', function(){
          var csv = 'recorded_at,event_type,aggregate_type,aggregate_id,actor_id,actor_name,ip_address,event_hash,prev_hash\n' + rows.map(function(e){
            return [e.recorded_at,e.event_type,e.aggregate_type,e.aggregate_id,e.actor_id,e.actor_name,e.ip_address,e.event_hash,e.prev_hash].map(function(x){ return '"'+String(x||'').replace(/"/g,'""')+'"'; }).join(',');
          }).join('\n');
          var blob = new Blob([csv],{type:'text/csv'});
          var a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='audit-events-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
          UI.audit('audit.export', { row_count: rows.length, filters:{ search:search, event_type:typeFilter, from:dateFrom, to:dateTo } });
        });
      }).catch(function(err){ el.innerHTML = UI.errorHtml(err && err.message, rerender); });
    }
    rerender();
  }

  window._renderAdminIamConsole = function(rootEl){ render(rootEl); };
})();
