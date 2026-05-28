/**
 * 00p-admin-email-intake.js
 * Admin UI for the AI Email Order Intake (AEOI) module.
 * Loaded on-demand when admin navigates to the "AI Order Intake" tab.
 *
 * Sections:
 *   1. Kết nối M365         — tenant/client/mailbox, test connection, enable toggle
 *   2. Danh sách cho phép   — sender allowlist CRUD table
 *   3. Cơ chế vận hành      — processing logic options
 *   4. Bảo mật              — security options
 *   5. Thông báo & leo thang — notification roles + escalation
 *   6. Nhật ký poll         — paginated poll run log
 *   7. Nhật ký email        — paginated message log with status filter
 *   8. Kiểm duyệt bảo mật  — quarantine queue
 *   ── Manual trigger + Test parse buttons in header
 */

(function(){
  'use strict';

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  /* Wrap window.apiCall (async, returns Promise) into callback-style.
   * Detects GET vs POST: actions ending in _get / _list / _log / _queue / _check use GET. */
  function apiCall(action, data, cb){
    if(typeof window.apiCall !== 'function'){ return cb({ok:false, error:'apiCall not available'}); }
    var isGet = /(_get|_list|_log|_queue|_check)$/.test(action);
    var method = isGet ? 'GET' : 'POST';
    var payload = isGet ? null : (data || {});
    var p;
    try { p = window.apiCall(action, payload, method); }
    catch(e){ return cb({ok:false, error:String(e && e.message || e)}); }
    if(!p || typeof p.then !== 'function'){ return cb({ok:false, error:'apiCall did not return a Promise'}); }
    p.then(function(res){ cb(res || {ok:false, error:'empty_response'}); })
     .catch(function(err){ cb({ok:false, error:String(err && err.message || err)}); });
  }
  var escHtml = window.escapeHtml || function(s){ return String(s||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);}); };
  var fmtDt   = function(s){ if(!s) return '—'; try{ return new Date(s).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour12:false}); } catch(e){ return s; } };
  var fmtDate = function(s){ if(!s) return '—'; try{ return new Date(s).toLocaleDateString('vi-VN'); } catch(e){ return s; } };

  var STATE = {
    config: null,
    allowlist: [],
    pollLog: { items:[], total:0, offset:0 },
    msgLog:  { items:[], total:0, offset:0, status:'' },
    quarantine: { items:[], total:0, offset:0 },
    activeSection: 'mailboxes',
    saving: false,
    loadingAllowlist: false,
  };

  /* ── Section tab labels ──────────────────────────────────────────────── */
  // Tabs are ordered by the daily admin journey:
  //   1. configure a source                                 → mailboxes
  //   2. allow who can send to it                           → allowlist
  //   3. fine-tune the parser (header rules, templates)
  //   4. fine-tune the AI extraction (LLM Model)
  //   5. wire workers, validation, security, notifications
  //   6. operate (cases, logs, quarantine)
  //
  // The legacy "Kết nối M365" tab is GONE. Module-wide settings
  // (cron interval, file types, master enable) plus provider-specific
  // credentials (M365 tenant, IMAP host) now live inside the Mailbox
  // & Folder tab as a single "Cài đặt module" card + per-provider
  // wizard. This eliminates the false impression that AEOI is
  // M365-only and removes the duplicate-config trap where M365 creds
  // existed both globally and per-mailbox.
  var SECTIONS = [
    { id:'mailboxes',    label:'Mailbox & Folder',    icon:'📬' },
    { id:'allowlist',    label:'Email cho phép',      icon:'✅' },
    { id:'header_rules', label:'Header Rules',         icon:'📑' },
    { id:'templates',    label:'Template KH',          icon:'🎯' },
    { id:'workers',      label:'Worker Tokens',        icon:'🔑' },
    { id:'llm_model',    label:'LLM Model',           icon:'🤖' },
    { id:'logic',        label:'Cơ chế vận hành',     icon:'⚙️' },
    { id:'security',     label:'Bảo mật',             icon:'🔒' },
    { id:'notify',       label:'Thông báo',           icon:'🔔' },
    { id:'cases',        label:'Intake Cases',         icon:'📦' },
    { id:'poll_log',     label:'Nhật ký poll',        icon:'📋' },
    { id:'msg_log',      label:'Nhật ký email',       icon:'📨' },
    { id:'quarantine',   label:'Kiểm duyệt',          icon:'🚨' },
  ];

  /* ── Role options (mirrors portal role catalog) ─────────────────────── */
  var ROLE_OPTIONS = [
    {v:'admin',         l:'Admin hệ thống'},
    {v:'sales_manager', l:'Trưởng phòng kinh doanh'},
    {v:'planner',       l:'Nhân viên lập kế hoạch'},
    {v:'production_manager', l:'Quản lý sản xuất'},
    {v:'ceo',           l:'Tổng giám đốc'},
    {v:'gm',            l:'Giám đốc điều hành'},
  ];

  /* ── Main render entry ───────────────────────────────────────────────── */
  window._renderAdminEmailIntake = function(container, lang){
    container.innerHTML = '<div class="hm-empty">Đang tải cấu hình...</div>';
    apiCall('admin_email_intake_config_get', {}, function(res){
      if(!res.ok){ container.innerHTML = '<div class="hm-empty" style="color:var(--danger-1,#ef4444)">Lỗi tải cấu hình: ' + escHtml(res.error||'unknown') + '</div>'; return; }
      STATE.config = res.config || {};
      _loadAllowlist(function(){
        _render(container);
      });
    });
  };

  function _loadAllowlist(cb){
    apiCall('admin_email_intake_allowlist_get', {}, function(res){
      STATE.allowlist = (res.ok && res.entries) ? res.entries : [];
      if(cb) cb();
    });
  }

  /* ── Full re-render ──────────────────────────────────────────────────── */
  function _render(container){
    // Cache the container DOM node so callbacks like toggleMaster can
    // re-render without needing the caller to pass it back in.
    if (container) {
      STATE.container = container;
    } else if (STATE.container) {
      container = STATE.container;
    } else {
      return;
    }
    var cfg = STATE.config || {};
    var enabled = !!cfg.enabled;
    // Migration 212 — master kill-switch defaults TRUE so legacy installs
    // (where the column was missing) read as enabled.
    var masterEnabled = (cfg.aeoi_master_enabled === undefined || cfg.aeoi_master_enabled === null)
      ? true
      : !!cfg.aeoi_master_enabled;

    var html = '<div class="aeoi-root" style="font-size:13px;color:var(--text-1,#111)">';

    // ── Header bar
    html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">'
          + '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">'
          + '<span style="font-size:22px">📥</span>'
          + '<div><div style="font-size:15px;font-weight:700;color:var(--text-1,#111)">AI Order Intake — Tiếp nhận PO khách hàng có kiểm soát</div>'
          + '<div style="font-size:11px;color:var(--text-3,#6b7280)">Đọc email/folder được cấp phép, trích xuất Customer PO, tạo Intake Case và chờ review trước khi commit CPO/SO.</div>'
          + '</div></div>'
          + '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">'
          + '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;'
          + (enabled ? 'background:var(--green-bg,#d1fae5);color:var(--green-1,#065f46)' : 'background:var(--surface-2,#f3f4f6);color:var(--text-3,#6b7280)')
          + '">' + (enabled ? '● Cron poll bật' : '○ Cron poll tắt') + '</span>'
          + '<button onclick="aeoi.triggerPoll()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none" title="Kích hoạt quét email thủ công" ' + (masterEnabled ? '' : 'disabled') + '>▶ Chạy ngay</button>'
          + '<button onclick="aeoi.openTestParse()" class="hm-btn hm-btn-sm" style="background:var(--surface-2,#f3f4f6);color:var(--text-1,#111)" title="Kiểm tra phân tích email mẫu" ' + (masterEnabled ? '' : 'disabled') + '>🧪 Test phân tích</button>'
          + '</div>'
          + '</div>';

    // ── Master kill-switch banner (Migration 212)
    // Prominent ON/OFF toggle for the entire AEOI module. When OFF: cron
    // poll skips, frontend Orders queue (PR #2-3) disables operator
    // actions, this admin page still allows settings edits.
    html += _masterToggleBanner(masterEnabled);

    // ── Section tabs
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--border-1,#e5e7eb);margin-bottom:16px;padding-bottom:0">';
    SECTIONS.forEach(function(s){
      var active = STATE.activeSection === s.id;
      html += '<button onclick="aeoi.switchSection(\'' + s.id + '\')" style="padding:6px 12px;border:none;border-bottom:' + (active?'2px solid var(--brand-primary,#2563eb)':'2px solid transparent') + ';background:none;cursor:pointer;font-size:12px;font-weight:' + (active?'700':'400') + ';color:' + (active?'var(--brand-primary,#2563eb)':'var(--text-2,#374151)') + ';white-space:nowrap">'
            + s.icon + ' ' + escHtml(s.label) + '</button>';
    });
    html += '</div>';

    // ── Section content
    html += '<div id="aeoi-section-content">' + _renderSection(STATE.activeSection) + '</div>';
    html += '</div>';

    container.innerHTML = html;
    _bindGlobal(container);
  }

  function _renderSection(id){
    switch(id){
      case 'mailboxes':    return _sectionMailboxes();
      case 'allowlist':    return _sectionAllowlist();
      case 'header_rules': return _sectionHeaderRules();
      case 'templates':    return _sectionTemplates();
      case 'workers':      return _sectionWorkers();
      case 'llm_model':    return _sectionLlmModel();
      case 'logic':        return _sectionLogic();
      case 'security':     return _sectionSecurity();
      case 'notify':       return _sectionNotify();
      case 'cases':        return _sectionCases();
      case 'poll_log':     return _sectionPollLog();
      case 'msg_log':      return _sectionMsgLog();
      case 'quarantine':   return _sectionQuarantine();
      default: return '';
    }
  }

  function _refreshSection(){
    var el = document.getElementById('aeoi-section-content');
    if(el) el.innerHTML = _renderSection(STATE.activeSection);
    _bindSection();
  }

  /* ── Global module settings card ─────────────────────────────────────
   * Used to be its own "Kết nối M365" tab. Now lives inside Mailbox &
   * Folder because the actual M365 connection lives per-mailbox (via
   * the add-mailbox wizard), and the remaining fields here are truly
   * MODULE-WIDE: the cron interval, the file-type allowlist, the
   * master enable toggle, and the legacy global M365 tenant config
   * kept for backward compatibility with mailboxes that still point
   * at the singleton intake_mailbox. */
  /* Migration 212 — master kill-switch banner.
   * Rendered immediately after the header bar so it's the first thing
   * the admin sees. Big visual on/off pill, big toggle button. When OFF
   * the banner is amber (warning), explains downstream impact, and the
   * "Chạy ngay" / "Test phân tích" buttons above are already disabled
   * via the masterEnabled check in _render(). */
  function _masterToggleBanner(masterEnabled){
    var on = !!masterEnabled;
    var bg     = on ? 'var(--green-bg,#d1fae5)' : 'var(--warning-bg,#fef3c7)';
    var border = on ? 'var(--green-1,#10b981)' : 'var(--warning-1,#f59e0b)';
    var ico    = on ? '🟢' : '🟡';
    var title  = on ? 'Module đang BẬT' : 'Module đang TẮT (paused)';
    var subtxt = on
      ? 'Cron poll quét email theo chu kỳ. Worker push được chấp nhận. Reviewer có thể approve / commit case.'
      : 'Cron poll bị tắt. Worker push bị reject. Case hiện có trong queue KHÔNG approve / commit được. Bật lại để tiếp tục vận hành.';
    var btnLabel = on ? '⏸ Tắt module' : '▶ Bật module';
    var btnBg    = on ? 'var(--warning-1,#f59e0b)' : 'var(--green-1,#10b981)';
    var confirmMsg = on
      ? 'Tắt module AI Order Intake? Cron poll sẽ dừng + reviewer không approve được case mới đến khi bật lại.'
      : 'Bật lại module AI Order Intake? Cron poll sẽ chạy theo chu kỳ đã cấu hình.';
    return '<div style="display:flex;align-items:center;gap:14px;padding:12px 16px;'
      + 'border:1px solid ' + border + ';border-left:4px solid ' + border + ';'
      + 'background:' + bg + ';border-radius:6px;margin-bottom:16px">'
      + '<div style="font-size:24px;line-height:1">' + ico + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:700;color:var(--text-1,#111)">' + title + '</div>'
      + '<div style="font-size:11px;color:var(--text-2,#374151);margin-top:2px">' + subtxt + '</div>'
      + '</div>'
      + '<button onclick="if(confirm(' + JSON.stringify(confirmMsg) + ')){aeoi.toggleMaster(' + (!on) + ')}" '
      + 'class="hm-btn hm-btn-sm" '
      + 'style="background:' + btnBg + ';color:#fff;border:none;font-weight:600;padding:6px 14px">'
      + btnLabel
      + '</button>'
      + '</div>';
  }

  function _moduleSettingsCard(){
    var cfg = STATE.config || {};
    return '<div class="aeoi-card">'
      + _cardHead('⚙️ Cài đặt module', 'Cài đặt áp dụng cho toàn bộ AI Order Intake (cron, allowlist file type, master toggle). Credential M365 / IMAP cụ thể được nhập khi tạo Mailbox bên dưới.')
      + '<div style="margin-bottom:10px">'
      + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">'
      + '<input type="checkbox" id="aeoi-enabled" ' + (cfg.enabled ? 'checked' : '') + ' style="width:16px;height:16px"> '
      + '<span><b>Bật module AI Order Intake</b> — khi bật, cron job sẽ tự động quét mailbox theo chu kỳ đã cấu hình</span>'
      + '</label></div>'
      + '<div class="aeoi-grid2">'
      + _fieldNum('Chu kỳ quét (phút)', 'aeoi-poll-interval', cfg.poll_interval_minutes||120, 'Mặc định 120 phút (2 tiếng). Min 15, max 1440.', 15, 1440)
      + _fieldSelect('Phạm vi trích xuất', 'aeoi-extraction-scope', [['both','Email + Đính kèm'],['body','Chỉ nội dung email'],['attachments','Chỉ file đính kèm']], cfg.extraction_scope||'both')
      + '</div>'
      + '<div style="margin-top:12px">'
      + '<label style="font-size:12px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:6px">Loại file đính kèm được phép</label>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap">'
      + ['pdf','xlsx','docx','csv','eml'].map(function(t){
          var chk = (cfg.allowed_attachment_types||[]).indexOf(t)>=0;
          return '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px"><input type="checkbox" class="aeoi-att-type" data-type="' + t + '" ' + (chk?'checked':'') + '> ' + t.toUpperCase() + '</label>';
        }).join('')
      + '</div></div>'
      + '<details style="margin-top:12px;padding:8px 10px;background:var(--surface-2,#f3f4f6);border-radius:6px"><summary style="cursor:pointer;font-size:12px;font-weight:600">🪟 Cấu hình Microsoft 365 (Outlook) — tenant chung (advanced)</summary>'
      + '<div style="margin-top:10px;font-size:11px;color:var(--text-3,#6b7280);margin-bottom:8px">Dùng cho provider <code>microsoft_graph</code>. Chỉ một tenant trên toàn module. Mailbox cá nhân vẫn cấu hình theo wizard bên dưới.</div>'
      + '<div class="aeoi-grid2">'
      + _field('M365 Tenant ID', 'aeoi-tenant-id', cfg.m365_tenant_id||'', 'Tenant ID của organisation trong Azure AD', 'text')
      + _field('Client ID (App ID)', 'aeoi-client-id', cfg.m365_client_id||'', 'App registration client_id trong Azure', 'text')
      + _fieldPw('Client Secret', 'aeoi-client-secret', cfg.secret_configured ? '(đã lưu — nhập mới để đổi)' : '', 'Client secret của App registration. Được mã hóa AES-256 khi lưu.')
      + _field('Shared Mailbox (legacy)', 'aeoi-mailbox', cfg.intake_mailbox||'', 'Single shared mailbox cũ. Hiện nên dùng wizard tạo nhiều mailbox bên dưới.', 'email')
      + '</div></details>'
      + _saveBtn('aeoi.saveConnection()')
      + '</div>';
  }

  /* ── 2. Danh sách email cho phép ──────────────────────────────────────── */
  function _sectionAllowlist(){
    var list = STATE.allowlist;
    var active = list.filter(function(e){ return e.active; });
    var inactive = list.filter(function(e){ return !e.active; });

    var html = '<div class="aeoi-card">'
      + _cardHead('✅ Danh sách email / domain được phép', active.length + ' mục đang hoạt động · ' + inactive.length + ' đã tắt')
      + '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">'
      + '<button onclick="aeoi.openAddEntry()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">+ Thêm email / domain</button>'
      + '<span style="font-size:11px;color:var(--text-3,#6b7280);line-height:32px">Chỉ email/domain trong danh sách này mới được AI đọc (chế độ <b>strict</b>)</span>'
      + '</div>';

    if(list.length === 0){
      html += '<div class="hm-empty">Chưa có mục nào. Thêm email hoặc domain của khách hàng để bắt đầu.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="admin-table" style="width:100%">'
        + '<thead><tr>'
        + '<th style="width:36px">#</th>'
        + '<th>Loại</th>'
        + '<th>Email / Domain</th>'
        + '<th>Tên / Ghi chú</th>'
        + '<th>Khách hàng</th>'
        + '<th style="width:70px">Trạng thái</th>'
        + '<th style="width:90px">Thao tác</th>'
        + '</tr></thead><tbody>';

      list.forEach(function(e, i){
        var typeBadge = e.entry_type === 'email'
          ? '<span style="background:var(--blue-bg,#eff6ff);color:var(--blue-1,#1d4ed8);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">EMAIL</span>'
          : '<span style="background:var(--purple-bg,#f5f3ff);color:var(--purple-1,#5b21b6);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">DOMAIN</span>';
        var activeBadge = e.active
          ? '<span style="color:var(--green-1,#065f46);font-size:11px">● Hoạt động</span>'
          : '<span style="color:var(--text-3,#6b7280);font-size:11px">○ Tắt</span>';
        html += '<tr style="' + (!e.active ? 'opacity:0.5' : '') + '">'
          + '<td style="color:var(--text-3,#6b7280);font-size:11px">' + (i+1) + '</td>'
          + '<td>' + typeBadge + '</td>'
          + '<td style="font-family:monospace;font-size:12px;font-weight:600">' + escHtml(e.value) + '</td>'
          + '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">'
            + escHtml(e.label||'') + (e.notes ? '<br><span style="font-size:10px;color:var(--text-3,#6b7280)">' + escHtml(e.notes) + '</span>' : '')
          + '</td>'
          + '<td style="font-size:11px;color:var(--text-2,#374151)">' + escHtml(e.customer_id||'—') + '</td>'
          + '<td>' + activeBadge + '</td>'
          + '<td style="white-space:nowrap">'
            + '<button onclick="aeoi.toggleEntry(' + e.id + ',' + (e.active?'false':'true') + ')" class="hm-btn hm-btn-xs" title="' + (e.active?'Tắt':'Bật') + '">' + (e.active ? '⏸' : '▶') + '</button> '
            + '<button onclick="aeoi.deleteEntry(' + e.id + ')" data-aeoi-value="' + escHtml(e.value) + '" class="hm-btn hm-btn-xs" style="color:var(--danger-1,#ef4444)" title="Xóa">🗑</button>'
          + '</td>'
          + '</tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '</div>';

    // Add-entry modal placeholder
    html += '<div id="aeoi-add-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center">'
      + '<div style="background:var(--surface-0,#fff);border-radius:12px;padding:24px;width:420px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.18)">'
      + '<div style="font-size:14px;font-weight:700;margin-bottom:16px">Thêm email / domain được phép</div>'
      + '<div style="margin-bottom:10px">'
      + '<label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Loại</label>'
      + '<select id="aeoi-new-type" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">'
      + '<option value="email">Email cụ thể (vd: buyer@acme.com)</option>'
      + '<option value="domain">Toàn bộ domain (vd: acme.com)</option>'
      + '</select></div>'
      + '<div style="margin-bottom:10px">' + _fieldInline('Email / Domain', 'aeoi-new-value', '', 'buyer@acme.com hoặc acme.com') + '</div>'
      + '<div style="margin-bottom:10px">' + _fieldInline('Tên khách hàng / ghi chú', 'aeoi-new-label', '', 'VD: Acme Corp — Phòng mua hàng') + '</div>'
      + '<div style="margin-bottom:10px">' + _fieldInline('Customer ID (tùy chọn)', 'aeoi-new-customer', '', 'Link với bảng customers nếu có') + '</div>'
      + '<div style="margin-bottom:16px">' + _fieldInline('Ghi chú nội bộ', 'aeoi-new-notes', '', 'Ghi chú thêm') + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
      + '<button onclick="aeoi.closeAddModal()" class="hm-btn hm-btn-sm">Hủy</button>'
      + '<button onclick="aeoi.submitAddEntry()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">Thêm</button>'
      + '</div></div></div>';

    return html;
  }

  /* ── 2.5. LLM Model routing ──────────────────────────────────────────── */
  function _sectionLlmModel(){
    if(!STATE.llm){ aeoi.loadLlmConfig(); return '<div class="hm-empty">Đang tải cấu hình LLM...</div>'; }
    var rules     = STATE.llm.rules || [];
    var providers = STATE.llm.providers || [];
    var health    = STATE.llm.health || {};

    // Provider health summary cards
    var healthHtml = '';
    providers.forEach(function(p){
      var h = health[p.provider_key] || {};
      var ok = !!h.ok;
      var dot = ok ? '🟢' : (h.message ? '🔴' : '⚪');
      healthHtml += '<div style="background:var(--surface-2,#f3f4f6);border-radius:8px;padding:10px;font-size:11px">'
        + '<div style="font-weight:600">' + dot + ' ' + escHtml(p.display_name) + '</div>'
        + '<div style="color:var(--text-3,#6b7280);margin-top:2px">' + escHtml(p.provider_kind) + ' • ' + (p.models ? p.models.length : 0) + ' model(s)</div>'
        + '<div style="color:' + (ok?'#10b981':'#dc2626') + ';margin-top:4px;font-size:10px">' + escHtml((h.message||'no health probe').substring(0,120)) + '</div>'
        + '</div>';
    });

    var rulesHtml = '<table class="aeoi-tbl" style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px">'
      + '<thead><tr style="background:var(--surface-2,#f3f4f6)">'
      + '<th style="padding:6px;text-align:left;font-weight:600">Scope</th>'
      + '<th style="padding:6px;text-align:left;font-weight:600">Primary Provider</th>'
      + '<th style="padding:6px;text-align:left;font-weight:600">Primary Model</th>'
      + '<th style="padding:6px;text-align:left;font-weight:600">Fallback chain</th>'
      + '<th style="padding:6px;text-align:left;font-weight:600">Priority</th>'
      + '<th style="padding:6px;text-align:left;font-weight:600">Status</th>'
      + '<th style="padding:6px;text-align:left;font-weight:600">Hành động</th>'
      + '</tr></thead><tbody>';

    rules.forEach(function(r){
      var chain = (r.fallback_chain || []).map(function(s){ return s.provider + (s.model ? ':' + s.model : ''); }).join(' → ');
      rulesHtml += '<tr style="border-bottom:1px solid var(--border-1,#e5e7eb)">'
        + '<td style="padding:6px"><span style="font-family:monospace;background:var(--surface-2,#f3f4f6);padding:2px 6px;border-radius:4px">' + escHtml(r.scope_type) + '</span><br><span style="font-size:11px">' + escHtml(r.scope_value) + '</span></td>'
        + '<td style="padding:6px;font-family:monospace">' + escHtml(r.primary_provider) + '</td>'
        + '<td style="padding:6px;font-family:monospace">' + escHtml(r.primary_model || '—') + '</td>'
        + '<td style="padding:6px;font-size:11px;color:var(--text-3,#6b7280)">' + escHtml(chain || '—') + '</td>'
        + '<td style="padding:6px">' + r.priority + '</td>'
        + '<td style="padding:6px">' + (r.is_enabled ? '<span style="color:#10b981">● Bật</span>' : '<span style="color:#9ca3af">○ Tắt</span>') + '</td>'
        + '<td style="padding:6px">'
        +   '<button onclick="aeoi.editLlmRule(' + r.routing_id + ')" class="hm-btn hm-btn-sm" title="Sửa">✏️</button> '
        +   '<button onclick="aeoi.deleteLlmRule(' + r.routing_id + ', \'' + escHtml(r.scope_type) + ':' + escHtml(r.scope_value) + '\')" class="hm-btn hm-btn-sm" style="color:#dc2626" title="Xóa">🗑️</button>'
        + '</td></tr>';
    });
    rulesHtml += '</tbody></table>';
    if(rules.length === 0){
      rulesHtml = '<div style="padding:20px;text-align:center;color:var(--text-3,#6b7280);font-size:12px;background:var(--surface-2,#f3f4f6);border-radius:8px;margin-top:10px">Chưa có rule nào. Hệ thống sẽ fall back về Anthropic API nếu được cấu hình.</div>';
    }

    return '<div class="aeoi-card">'
      + _cardHead('🤖 LLM Model Routing', 'Định tuyến extraction qua nhiều LLM. Resolution order: doc_code > doc_pattern > tier > global_default. Mỗi rule có chain fallback nếu primary fail.')
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:14px">' + healthHtml + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">'
      +   '<button onclick="aeoi.openLlmRuleForm()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">+ Thêm Rule</button>'
      +   '<button onclick="aeoi.loadLlmConfig(true)" class="hm-btn hm-btn-sm">🔄 Tải lại + Health probe</button>'
      +   '<span style="font-size:11px;color:var(--text-3,#6b7280)">' + rules.length + ' rule(s)</span>'
      + '</div>'
      + rulesHtml
      + '<div style="margin-top:14px;padding:10px;background:#dbeafe;border-left:3px solid #2563eb;border-radius:4px;font-size:11px;color:#1e3a8a">'
      +   'ℹ <strong>Tier scopes:</strong>'
      +   '<br>• <code>extraction_default</code> — email body when deterministic header parser empty'
      +   '<br>• <code>extraction_pdf</code> — email có PDF attachment cần pdftotext + LLM extract'
      +   '<br>• <code>extraction_complex</code> — multi-page PO, change orders, expedites'
      + '</div>'
      + '</div>';
  }

  /* ── 3. Cơ chế vận hành ──────────────────────────────────────────────── */
  function _sectionLogic(){
    var cfg = STATE.config || {};
    return '<div class="aeoi-card">'
      + _cardHead('⚙️ Cơ chế xử lý & vận hành', 'Production khuyến nghị: chế độ Review queue, ngưỡng tin cậy ≥0.95, part match Exact, missing field Block. Các option khác chỉ dùng cho dev/lab.')
      + '<div class="aeoi-grid2">'

      + _fieldSelect('Chế độ tạo đơn hàng', 'aeoi-auto-create-mode',
          [['review_queue','Review queue — không tạo gì, chờ admin duyệt (KHUYẾN NGHỊ — production)'],
           ['draft','Draft — tạo SO ở trạng thái nháp, cần xác nhận thủ công (advanced)']],
          cfg.auto_create_mode||'review_queue')

      + _fieldNum('Ngưỡng tin cậy AI (0.00–1.00)', 'aeoi-confidence', cfg.confidence_threshold||0.95,
          'Độ tin cậy tối thiểu để case không bị blocker low_confidence. Khuyến nghị ≥0.95.', 0.50, 1, 0.05)

      + _fieldSelect('Khớp part number', 'aeoi-part-match',
          [['exact','Exact — phải khớp chính xác với master data (KHUYẾN NGHỊ)'],
           ['review_if_no_match','Review nếu không khớp — case sẽ giữ ở needs_review']],
          cfg.part_match_mode||'exact')

      + _fieldSelect('Xử lý trường thiếu', 'aeoi-missing-field',
          [['block','Block — case không thể approve khi thiếu trường bắt buộc (KHUYẾN NGHỊ)'],
           ['flag','Flag — cho approve nhưng đánh dấu cần bổ sung']],
          cfg.missing_field_action||'block')

      + _fieldNum('Cửa sổ kiểm tra trùng (ngày)', 'aeoi-dup-days', cfg.duplicate_check_days||30,
          'Nếu đã có SO với customer_po_number giống nhau trong N ngày → bỏ qua như trùng lặp.', 0, 365)

      + _fieldNum('Số file đính kèm tối đa/email', 'aeoi-max-att', cfg.max_attachments_per_email||3,
          'Giới hạn số file AI xử lý mỗi email. File thứ N+1 trở đi bỏ qua.', 1, 10)

      + '</div>'
      + '<div style="margin-top:10px;padding:8px 12px;border-left:3px solid var(--warning-1,#f59e0b);background:var(--warning-bg,#fef3c7);font-size:11px;color:var(--text-2,#374151)">'
      + '⚠ <strong>Quan trọng:</strong> AI chỉ tạo Customer PO / draft Sales Order. JO/WO phải được tạo qua workflow gốc khi SO đạt trạng thái <code>engineering_ready</code> / <code>in_production</code> và part/revision đã release. Không có chế độ auto-cascade JO từ email.'
      + '</div>'
      + '<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + _checkbox('aeoi-biz-hours', 'Chỉ xử lý trong giờ làm việc', !!cfg.business_hours_only)
      + '</div>'
      + '<div id="aeoi-biz-hours-detail" style="margin-top:10px;' + (!cfg.business_hours_only ? 'display:none' : '') + ';display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + _field('Giờ bắt đầu', 'aeoi-biz-start', cfg.business_hours_start||'07:00', '', 'time')
      + _field('Giờ kết thúc', 'aeoi-biz-end', cfg.business_hours_end||'18:00', '', 'time')
      + _field('Timezone', 'aeoi-biz-tz', cfg.business_hours_timezone||'Asia/Ho_Chi_Minh', '', 'text')
      + '</div>'
      + _saveBtn('aeoi.saveLogic()')
      + '</div>';
  }

  /* ── 4. Bảo mật ──────────────────────────────────────────────────────── */
  function _sectionSecurity(){
    var cfg = STATE.config || {};
    return '<div class="aeoi-card">'
      + _cardHead('🔒 Kiểm soát bảo mật', 'Quy tắc lọc người gửi, chống giả mạo và giới hạn tải')
      + '<div class="aeoi-grid2">'

      + _fieldSelect('Chế độ kiểm tra allowlist', 'aeoi-allowlist-enforcement',
          [['strict','Strict — chỉ email/domain trong danh sách mới được xử lý (KHUYẾN NGHỊ)'],
           ['domain_only','Domain only — chỉ cần @domain khớp là đủ']],
          cfg.allowlist_enforcement||'strict')

      + _fieldNum('Giới hạn đơn hàng/chu kỳ', 'aeoi-max-orders', cfg.max_orders_per_poll||50,
          'Số SO tối đa được tạo trong một lần quét. Phòng chống spam.', 1, 500)

      + _fieldSelect('Hành động khi PO vượt ngưỡng giá trị', 'aeoi-hv-action',
          [['review_queue','Chuyển sang review queue'],
           ['block','Block — không xử lý'],
           ['notify_only','Chỉ gửi cảnh báo, vẫn xử lý']],
          cfg.high_value_action||'review_queue')

      + _fieldNum('Ngưỡng giá trị cao (để trống = tắt)', 'aeoi-hv-threshold',
          cfg.high_value_threshold||'',
          'PO có tổng giá trị vượt mức này → kích hoạt hành động ở trên. Để trống để tắt.', 0, 99999999)

      + _fieldSelect('Đơn vị tiền ngưỡng giá trị', 'aeoi-hv-currency',
          [['USD','USD'],['VND','VND'],['EUR','EUR']],
          cfg.high_value_currency||'USD')

      + _fieldNum('Lưu trữ audit log (ngày)', 'aeoi-audit-days', cfg.audit_retention_days||90,
          'Sau N ngày, bản ghi poll run và message log cũ sẽ được xóa tự động.', 30, 730)

      + '</div>'
      + '<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
      + _checkbox('aeoi-spf-dkim', 'Yêu cầu SPF/DKIM pass', !!cfg.require_spf_dkim)
      + _checkbox('aeoi-quarantine-unknown', 'Cách ly email người gửi lạ', !!cfg.quarantine_unknown_senders)
      + _checkbox('aeoi-quarantine-alert', 'Cảnh báo khi có email cách ly', !!cfg.quarantine_review_alert)
      + _checkbox('aeoi-mask-prices', 'Ẩn giá trong log/audit trail', !!cfg.mask_prices_in_log)
      + '</div>'
      + '<div style="margin-top:12px;padding:10px 12px;background:var(--yellow-bg,#fffbeb);border:1px solid var(--yellow-border,#fde68a);border-radius:8px;font-size:11px;color:var(--yellow-1,#92400e)">'
      + '⚠️ <b>Lưu ý bảo mật:</b> Chế độ <b>strict</b> + <b>SPF/DKIM</b> + <b>Cách ly email lạ</b> được khuyến nghị cho môi trường production. '
      + 'Chế độ <b>off</b> chỉ dùng để test nội bộ.'
      + '</div>'
      + _saveBtn('aeoi.saveSecurity()')
      + '</div>';
  }

  /* ── 5. Thông báo & leo thang ─────────────────────────────────────────── */
  function _sectionNotify(){
    var cfg = STATE.config || {};
    var onCreate  = cfg.notify_roles_on_create  || [];
    var onReview  = cfg.notify_roles_on_review  || [];
    var onError   = cfg.notify_roles_on_error   || [];
    return '<div class="aeoi-card">'
      + _cardHead('🔔 Thông báo & Leo thang', 'Chọn vai trò nhận cảnh báo cho từng sự kiện')
      + _roleCheckGroup('aeoi-notify-create', 'Khi tạo SO mới thành công', onCreate, 'Gửi thông báo cho vai trò nào khi hệ thống tự động tạo đơn hàng mới')
      + _roleCheckGroup('aeoi-notify-review', 'Khi có email chờ duyệt (review_queue)', onReview, 'Email có độ tin cậy thấp hoặc part number chưa khớp → cần duyệt thủ công')
      + _roleCheckGroup('aeoi-notify-error', 'Khi có lỗi xử lý', onError, 'Lỗi kết nối M365, lỗi AI extraction, lỗi tạo SO')
      + '<div class="aeoi-grid2" style="margin-top:14px">'
      + _fieldNum('Thời gian leo thang review (giờ)', 'aeoi-escalation-hours', cfg.escalation_review_hours||24,
          'Nếu email review_queue chưa được xử lý sau N giờ → leo thang cảnh báo lên manager', 1, 168)
      + '</div>'
      + _saveBtn('aeoi.saveNotify()')
      + '</div>';
  }

  /* ── 6. Nhật ký poll ─────────────────────────────────────────────────── */
  function _sectionPollLog(){
    var log = STATE.pollLog;
    var html = '<div class="aeoi-card">'
      + _cardHead('📋 Nhật ký chu kỳ quét', log.total + ' bản ghi tổng')
      + '<div style="margin-bottom:10px;display:flex;gap:8px">'
      + '<button onclick="aeoi.loadPollLog(0)" class="hm-btn hm-btn-sm">🔄 Làm mới</button>'
      + '</div>';

    if(log.items.length === 0){
      html += '<div class="hm-empty">Chưa có chu kỳ quét nào. Nhấn "Chạy ngay" để bắt đầu.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="admin-table" style="width:100%;font-size:11px">'
        + '<thead><tr><th>Thời gian</th><th>Kích hoạt</th><th>Trạng thái</th><th>Tìm thấy</th><th>Xử lý</th><th>Tạo SO</th><th>Chờ duyệt</th><th>Cách ly</th><th>Lỗi</th><th>Thời lượng</th></tr></thead><tbody>';
      log.items.forEach(function(r){
        var st = _statusBadge(r.status);
        html += '<tr>'
          + '<td>' + fmtDt(r.started_at) + '</td>'
          + '<td>' + escHtml(r.triggered_by + (r.triggered_user ? ' / ' + r.triggered_user : '')) + '</td>'
          + '<td>' + st + '</td>'
          + '<td>' + r.messages_found + '</td>'
          + '<td>' + r.messages_processed + '</td>'
          + '<td style="font-weight:' + (r.orders_created>0?'700':'400') + ';color:' + (r.orders_created>0?'var(--green-1,#065f46)':'inherit') + '">' + r.orders_created + '</td>'
          + '<td style="color:' + (r.review_items_added>0?'var(--orange-1,#b45309)':'inherit') + '">' + r.review_items_added + '</td>'
          + '<td style="color:' + (r.messages_quarantined>0?'var(--danger-1,#ef4444)':'inherit') + '">' + r.messages_quarantined + '</td>'
          + '<td style="color:' + (r.parse_errors>0?'var(--danger-1,#ef4444)':'inherit') + '">' + r.parse_errors + '</td>'
          + '<td>' + (r.duration_ms!=null ? r.duration_ms + 'ms' : '—') + '</td>'
          + '</tr>';
      });
      html += '</tbody></table></div>'
        + _pagination(log.offset, log.total, 50, 'aeoi.loadPollLog');
    }
    html += '</div>';
    return html;
  }

  /* ── 7. Nhật ký email ─────────────────────────────────────────────────── */
  function _sectionMsgLog(){
    var log = STATE.msgLog;
    var statusOpts = [
      ['','Tất cả'],['pending','Đang chờ'],['extracted','Đã trích xuất'],
      ['created','Đã tạo SO'],['review_queue','Chờ duyệt'],
      ['quarantined','Đã cách ly'],['failed','Lỗi'],['duplicate','Trùng lặp'],['skipped','Bỏ qua']
    ];
    var html = '<div class="aeoi-card">'
      + _cardHead('📨 Nhật ký email', log.total + ' bản ghi · lọc theo trạng thái')
      + '<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center">'
      + '<label style="font-size:12px">Lọc:</label>'
      + '<select id="aeoi-msg-status-filter" onchange="aeoi.filterMsgLog(this.value)" style="padding:4px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px">'
      + statusOpts.map(function(o){ return '<option value="' + o[0] + '" ' + (log.status===o[0]?'selected':'') + '>' + o[1] + '</option>'; }).join('')
      + '</select>'
      + '<button onclick="aeoi.loadMsgLog(0,aeoi._msgStatus)" class="hm-btn hm-btn-sm">🔄</button>'
      + '</div>';

    if(log.items.length === 0){
      html += '<div class="hm-empty">Không có bản ghi nào' + (log.status ? ' với trạng thái "' + escHtml(log.status) + '"' : '') + '.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="admin-table" style="width:100%;font-size:11px">'
        + '<thead><tr><th>Nhận lúc</th><th>Từ</th><th>Tiêu đề</th><th>Đính kèm</th><th>Người gửi</th><th>Trạng thái</th><th>SO tạo ra</th></tr></thead><tbody>';
      log.items.forEach(function(m){
        var attNames = m.attachment_names ? JSON.parse(m.attachment_names) : [];
        html += '<tr>'
          + '<td style="white-space:nowrap">' + fmtDt(m.received_at) + '</td>'
          + '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis" title="' + escHtml(m.from_email) + '">' + escHtml(m.from_name||m.from_email) + '</td>'
          + '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">' + escHtml(m.subject||'(không có tiêu đề)') + '</td>'
          + '<td>' + (m.has_attachments ? '📎 ' + m.attachment_count : '—') + '</td>'
          + '<td>' + _allowlistBadge(m.allowlist_match) + '</td>'
          + '<td>' + _statusBadge(m.status) + (m.skip_reason ? '<br><span style="color:var(--text-3,#6b7280);font-size:10px">' + escHtml(m.skip_reason) + '</span>' : '') + '</td>'
          + '<td style="font-weight:600;color:var(--brand-primary,#2563eb)">' + (m.so_number ? escHtml(m.so_number) : '—') + '</td>'
          + '</tr>';
      });
      html += '</tbody></table></div>'
        + _pagination(log.offset, log.total, 50, 'aeoi.loadMsgLog', ', aeoi._msgStatus');
    }
    html += '</div>';
    return html;
  }

  /* ── 8. Kiểm duyệt bảo mật (quarantine) ────────────────────────────── */
  function _sectionQuarantine(){
    var q = STATE.quarantine;
    var html = '<div class="aeoi-card">'
      + _cardHead('🚨 Hàng chờ kiểm duyệt bảo mật', q.total + ' mục cần xem xét')
      + '<div style="margin-bottom:10px;display:flex;gap:8px">'
      + '<button onclick="aeoi.loadQuarantine(0)" class="hm-btn hm-btn-sm">🔄 Làm mới</button>'
      + '<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" id="aeoi-q-showall" onchange="aeoi.toggleQShowAll(this.checked)"> Hiển thị đã xử lý</label>'
      + '</div>';

    if(q.items.length === 0){
      html += '<div class="hm-empty" style="color:var(--green-1,#065f46)">✅ Không có email nào cần kiểm duyệt.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="admin-table" style="width:100%;font-size:11px">'
        + '<thead><tr><th>Nhận lúc</th><th>Từ</th><th>Tiêu đề</th><th>Lý do</th><th>Mức độ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>';
      q.items.forEach(function(item){
        var reviewed = item.reviewed;
        var sevColor = {high:'var(--danger-1,#ef4444)', medium:'var(--orange-1,#b45309)', low:'var(--text-2,#374151)'}[item.severity] || 'inherit';
        html += '<tr style="' + (reviewed?'opacity:0.6':'') + '">'
          + '<td style="white-space:nowrap">' + fmtDt(item.created_at) + '</td>'
          + '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">' + escHtml(item.from_email||'—') + '</td>'
          + '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">' + escHtml(item.subject||'—') + '</td>'
          + '<td><span style="background:var(--surface-2,#f3f4f6);padding:2px 6px;border-radius:6px;font-size:10px">' + escHtml(item.reason_code) + '</span>'
            + (item.reason_detail ? '<br><span style="color:var(--text-3,#6b7280);font-size:10px">' + escHtml(item.reason_detail) + '</span>' : '') + '</td>'
          + '<td style="color:' + sevColor + ';font-weight:600;text-transform:uppercase;font-size:10px">' + escHtml(item.severity) + '</td>'
          + '<td>' + (reviewed
              ? '<span style="color:var(--text-3,#6b7280);font-size:10px">✔ ' + escHtml(item.review_action||'') + ' / ' + escHtml(item.reviewed_by||'') + '</span>'
              : '<span style="color:var(--orange-1,#b45309);font-size:11px">⏳ Chờ</span>')
          + '</td>'
          + '<td style="white-space:nowrap">'
          + (!reviewed
              ? '<button onclick="aeoi.reviewItem(' + item.id + ',\'allow\')" class="hm-btn hm-btn-xs" style="color:var(--green-1,#065f46)" title="Cho phép">✅</button> '
                + '<button onclick="aeoi.reviewItem(' + item.id + ',\'block\')" class="hm-btn hm-btn-xs" style="color:var(--danger-1,#ef4444)" title="Chặn">🚫</button> '
                + '<button onclick="aeoi.reviewItem(' + item.id + ',\'ignore\')" class="hm-btn hm-btn-xs" title="Bỏ qua">🗑</button>'
              : '—')
          + '</td>'
          + '</tr>';
      });
      html += '</tbody></table></div>'
        + _pagination(q.offset, q.total, 50, 'aeoi.loadQuarantine');
    }
    html += '</div>';
    return html;
  }

  /* ── Worker create modal ──────────────────────────────────────────────── */
  function _workerCreateModal(){
    return '<div id="aeoi-worker-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center" data-modal-display="flex">'
      + '<div style="background:var(--surface-0,#fff);border-radius:12px;padding:24px;width:480px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.2)">'
      + '<div style="font-size:14px;font-weight:700;margin-bottom:12px">🔑 Tạo Worker Token</div>'
      + '<div style="display:grid;gap:10px">'
      + '<div><label style="font-size:11px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:3px">Worker ID <span style="color:#dc2626">*</span></label>'
      + '<input id="aeoi-worker-id" placeholder="vd: AIW-LOCAL-001" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;box-sizing:border-box;font-family:monospace">'
      + '<div style="font-size:10px;color:var(--text-3,#6b7280);margin-top:2px">3-80 ký tự alphanumeric / underscore / dash. Duy nhất toàn hệ thống.</div></div>'
      + '<div><label style="font-size:11px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:3px">Worker name (mô tả)</label>'
      + '<input id="aeoi-worker-name" placeholder="vd: Outlook desktop laptop của Bích" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;box-sizing:border-box"></div>'
      + '</div>'
      + '<div id="aeoi-worker-err" style="display:none;color:#dc2626;font-size:12px;margin-top:8px"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">'
      + '<button onclick="aeoi.closeWorkerForm()" class="hm-btn hm-btn-sm">Hủy</button>'
      + '<button onclick="aeoi.submitWorkerForm()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">Tạo</button>'
      + '</div></div></div>';
  }

  /* ── Worker secret display modal (shows raw secret ONCE after create/rotate) */
  function _workerSecretModal(){
    return '<div id="aeoi-worker-secret-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center" data-modal-display="flex">'
      + '<div style="background:var(--surface-0,#fff);border-radius:12px;padding:24px;width:540px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.25)">'
      + '<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#92400e">⚠ Raw secret — HIỂN THỊ MỘT LẦN DUY NHẤT</div>'
      + '<div style="font-size:12px;color:var(--text-2,#374151);margin-bottom:10px">Lưu ngay vào secret file của worker. Sau khi đóng modal sẽ KHÔNG xem lại được. '
      + 'Nếu mất, phải rotate qua nút 🔄 trong bảng worker tokens.</div>'
      + '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px;margin-bottom:8px">'
      + '<div style="font-size:11px;font-weight:600;color:#78350f;margin-bottom:4px">Worker ID</div>'
      + '<div id="aeoi-worker-secret-id" style="font-family:monospace;font-size:13px;color:#78350f"></div></div>'
      + '<div style="background:#fee2e2;border:1px solid #dc2626;border-radius:6px;padding:10px">'
      + '<div style="font-size:11px;font-weight:600;color:#7f1d1d;margin-bottom:4px">Raw secret</div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<code id="aeoi-worker-secret-val" style="flex:1;font-family:monospace;font-size:13px;color:#7f1d1d;background:#fff;padding:6px 8px;border-radius:4px;word-break:break-all"></code>'
      + '<button onclick="aeoi.copyWorkerSecret()" class="hm-btn hm-btn-sm" style="background:#dc2626;color:#fff;border:none;white-space:nowrap">📋 Copy</button>'
      + '</div></div>'
      + '<div id="aeoi-worker-secret-msg" style="font-size:11px;color:#10b981;margin-top:6px;height:14px"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">'
      + '<button onclick="aeoi.closeWorkerSecret()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">Đã lưu, đóng</button>'
      + '</div></div></div>';
  }

  /* ── LLM rule create/edit modal ───────────────────────────────────────── */
  function _llmRuleModal(){
    return '<div id="aeoi-llm-rule-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center" data-modal-display="flex">'
      + '<div style="background:var(--surface-0,#fff);border-radius:12px;padding:24px;width:640px;max-width:95vw;max-height:90vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)">'
      + '<div style="font-size:14px;font-weight:700;margin-bottom:12px" id="aeoi-llm-rule-title">🤖 Thêm LLM Routing Rule</div>'
      + '<div style="display:grid;gap:10px">'

      + '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">'
      +   '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Scope type</label>'
      +   '<select id="aeoi-llm-scope-type" onchange="aeoi._llmOnScopeTypeChange()" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px">'
      +     '<option value="global_default">global_default</option>'
      +     '<option value="tier">tier</option>'
      +     '<option value="doc_pattern">doc_pattern</option>'
      +     '<option value="doc_code">doc_code</option>'
      +   '</select></div>'
      +   '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Scope value</label>'
      +   '<input id="aeoi-llm-scope-value" placeholder="*" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;font-family:monospace">'
      +   '<div id="aeoi-llm-scope-hint" style="font-size:10px;color:var(--text-3,#6b7280);margin-top:2px">global_default: "*". tier: extraction_default | extraction_pdf | extraction_complex.</div></div>'
      + '</div>'

      + '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Primary provider <span style="color:#dc2626">*</span></label>'
      +   '<select id="aeoi-llm-primary-provider" onchange="aeoi._llmOnProviderChange(\'primary\')" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px"></select></div>'

      + '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Primary model</label>'
      +   '<select id="aeoi-llm-primary-model" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px"></select></div>'

      + '<div>'
      +   '<div style="display:flex;justify-content:space-between;align-items:center">'
      +     '<label style="font-size:11px;font-weight:600">Fallback chain (thử theo thứ tự nếu primary fail)</label>'
      +     '<button onclick="aeoi._llmAddFallback()" class="hm-btn hm-btn-sm">+ Thêm fallback</button>'
      +   '</div>'
      +   '<div id="aeoi-llm-fallback-rows" style="margin-top:6px"></div>'
      + '</div>'

      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +   '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Priority</label>'
      +     '<input id="aeoi-llm-priority" type="number" value="100" min="0" max="9999" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px"></div>'
      +   '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Trạng thái</label>'
      +     '<label style="display:flex;align-items:center;gap:6px;padding:6px 0;font-size:12px"><input type="checkbox" id="aeoi-llm-enabled" checked> Enabled</label></div>'
      + '</div>'

      + '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Mô tả</label>'
      +   '<textarea id="aeoi-llm-description" rows="2" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;resize:vertical" placeholder="Vì sao chọn provider+model này..."></textarea></div>'

      + '<input type="hidden" id="aeoi-llm-routing-id" value="">'
      + '</div>'

      + '<div id="aeoi-llm-rule-err" style="display:none;color:#dc2626;font-size:12px;margin-top:8px"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">'
      +   '<button onclick="aeoi.closeLlmRuleForm()" class="hm-btn hm-btn-sm">Hủy</button>'
      +   '<button onclick="aeoi.submitLlmRuleForm()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">Lưu</button>'
      + '</div></div></div>';
  }

  /* ── Test parse modal ─────────────────────────────────────────────────── */
  /* ── Case detail modal ─────────────────────────────────────────────── */
  // CASE_DETAIL is the state bag for the currently-open case viewer.
  // null when closed.
  var CASE_DETAIL = null;

  function _caseDetailModal(){
    return '<div id="aeoi-case-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:flex-start;justify-content:center;overflow-y:auto" data-modal-display="flex">'
      + '<div style="background:var(--surface-0,#fff);border-radius:12px;padding:0;width:900px;max-width:96vw;margin:20px;box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;flex-direction:column;max-height:95vh">'
      + '<div style="padding:14px 22px;border-bottom:1px solid var(--border-1,#e5e7eb);display:flex;justify-content:space-between;align-items:center">'
      + '<div id="aeoi-case-title" style="font-size:15px;font-weight:700">Đang tải...</div>'
      + '<button onclick="aeoi.closeCaseDetail()" class="hm-btn hm-btn-sm">✕ Đóng</button>'
      + '</div>'
      + '<div id="aeoi-case-body" style="padding:18px 22px;overflow-y:auto;flex:1"></div>'
      + '<div id="aeoi-case-footer" style="padding:12px 22px;border-top:1px solid var(--border-1,#e5e7eb);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"></div>'
      + '</div></div>';
  }

  function _renderCaseDetail(){
    var titleEl  = document.getElementById('aeoi-case-title');
    var bodyEl   = document.getElementById('aeoi-case-body');
    var footerEl = document.getElementById('aeoi-case-footer');
    if(!titleEl || !bodyEl || !footerEl) return;
    if(!CASE_DETAIL){
      bodyEl.innerHTML = '<div class="hm-empty">Đang tải...</div>';
      return;
    }
    var c = CASE_DETAIL.case || {};
    var lines       = CASE_DETAIL.lines || [];
    var attachments = CASE_DETAIL.attachments || [];
    var checks      = CASE_DETAIL.checks || [];
    var message     = CASE_DETAIL.message || {};

    titleEl.textContent = '📦 ' + (c.intake_no || '(no intake_no)') + ' — ' + (c.status || '?');

    // ── Header section ──
    var blockers = Array.isArray(c.blocking_codes) ? c.blocking_codes : [];
    var warnings = Array.isArray(c.warning_codes)  ? c.warning_codes  : [];
    var header = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;background:var(--surface-2,#f3f4f6);padding:12px;border-radius:8px;font-size:12px;margin-bottom:14px">'
      + '<div><div style="color:var(--text-3,#6b7280);font-size:10px">Customer</div><div style="font-weight:600">' + escHtml(c.customer_id||'—') + (c.customer_name ? ' — ' + escHtml(c.customer_name) : '') + '</div></div>'
      + '<div><div style="color:var(--text-3,#6b7280);font-size:10px">Customer PO #</div><div style="font-family:monospace;font-weight:600">' + escHtml(c.customer_po_number||'—') + '</div></div>'
      + '<div><div style="color:var(--text-3,#6b7280);font-size:10px">Document type / Action</div><div>' + escHtml(c.document_type||'—') + ' / ' + escHtml(c.action_type||'—') + '</div></div>'
      + '<div><div style="color:var(--text-3,#6b7280);font-size:10px">PO date / Terms</div><div>' + escHtml(c.po_date||'—') + ' / ' + escHtml(c.payment_term_code||'—') + '</div></div>'
      + '<div><div style="color:var(--text-3,#6b7280);font-size:10px">Currency / Incoterm</div><div>' + escHtml(c.currency_code||'—') + ' / ' + escHtml(c.incoterm_code||'—') + '</div></div>'
      + '<div><div style="color:var(--text-3,#6b7280);font-size:10px">Overall confidence</div><div>' + (c.overall_confidence!=null ? Number(c.overall_confidence).toFixed(2) : '—') + '</div></div>'
      + '</div>';

    // ── Blockers / Warnings banner ──
    if(blockers.length > 0){
      header += '<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:10px;border-radius:4px;font-size:12px;margin-bottom:10px">'
        + '<b style="color:#991b1b">✗ ' + blockers.length + ' blocker(s):</b> ' + escHtml(blockers.join(', '))
        + '<div style="font-size:10px;color:#7f1d1d;margin-top:4px">Approval và Commit bị chặn cho đến khi giải quyết hết blockers.</div>'
        + '</div>';
    }
    if(warnings.length > 0){
      header += '<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:10px;border-radius:4px;font-size:12px;margin-bottom:10px">'
        + '<b style="color:#92400e">⚠ ' + warnings.length + ' warning(s):</b> ' + escHtml(warnings.join(', '))
        + '<div style="font-size:10px;color:#78350f;margin-top:4px">Approve được nhưng phải nhập lý do.</div>'
        + '</div>';
    }
    if(blockers.length === 0 && warnings.length === 0 && c.status !== 'extraction_pending'){
      header += '<div style="background:#d1fae5;border-left:4px solid #10b981;padding:10px;border-radius:4px;font-size:12px;margin-bottom:10px;color:#065f46">✓ Không có blocker hay warning.</div>';
    }

    // ── Lines ──
    var linesHtml = '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;margin-bottom:6px">📦 Lines (' + lines.length + ')</div>';
    if(lines.length === 0){
      linesHtml += '<div class="hm-empty" style="font-size:11px">Không có line nào.</div>';
    } else {
      linesHtml += '<div class="aeoi-table-wrap"><table class="aeoi-table" style="width:100%;font-size:11px">'
        + '<thead><tr><th>#</th><th>Part</th><th>Rev</th><th>Qty</th><th>UOM</th><th>Due</th><th>Ship-to</th><th>Unit price</th></tr></thead><tbody>';
      lines.forEach(function(l, idx){
        linesHtml += '<tr>'
          + '<td>' + escHtml(l.line_no || (idx+1)) + '</td>'
          + '<td style="font-family:monospace;font-weight:600">' + escHtml(l.part_number||'—') + '</td>'
          + '<td>' + escHtml(l.revision_number||'—') + '</td>'
          + '<td style="text-align:right">' + (l.quantity != null ? Number(l.quantity).toFixed(2) : '—') + '</td>'
          + '<td>' + escHtml(l.uom||'EA') + '</td>'
          + '<td>' + escHtml(l.requested_delivery_date||'—') + '</td>'
          + '<td style="font-size:10px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(l.delivery_address||'—') + '</td>'
          + '<td style="text-align:right">' + (l.unit_price != null ? Number(l.unit_price).toFixed(4) : '—') + '</td>'
          + '</tr>';
      });
      linesHtml += '</tbody></table></div>';
    }
    linesHtml += '</div>';

    // ── Attachments ──
    var attachHtml = '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;margin-bottom:6px">📎 Attachments (' + attachments.length + ')</div>';
    if(attachments.length === 0){
      attachHtml += '<div class="hm-empty" style="font-size:11px">Không có attachment.</div>';
    } else {
      attachHtml += '<ul style="list-style:none;padding:0;margin:0">';
      attachments.forEach(function(a){
        attachHtml += '<li style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border-1,#e5e7eb)">'
          + escHtml(a.original_filename||'') + ' <span style="color:var(--text-3,#6b7280)">— ' + (a.file_size_bytes ? Math.round(a.file_size_bytes/1024) + ' KB' : '') + ' · ' + escHtml(a.mime_type||'') + (a.pdf_text_chars ? ' · pdf_text=' + a.pdf_text_chars + ' chars' : '') + '</span>'
          + '</li>';
      });
      attachHtml += '</ul>';
    }
    attachHtml += '</div>';

    // ── Email ──
    var emailHtml = '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;margin-bottom:6px">📨 Email gốc</div>';
    if(message && (message.from_email || message.subject)){
      emailHtml += '<div style="font-size:11px;background:var(--surface-2,#f3f4f6);padding:10px;border-radius:6px">'
        + '<div><b>From:</b> ' + escHtml(message.from_email||'—') + '</div>'
        + '<div><b>Subject:</b> ' + escHtml(message.subject||'—') + '</div>'
        + '<div><b>Received:</b> ' + fmtDt(message.received_at) + '</div>'
        + (message.body_preview ? '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:11px">▶ Body preview</summary><pre style="margin-top:6px;max-height:200px;overflow:auto;background:#fff;padding:8px;border-radius:4px;font-size:10px;white-space:pre-wrap">' + escHtml(message.body_preview) + '</pre></details>' : '')
        + '</div>';
    } else {
      emailHtml += '<div class="hm-empty" style="font-size:11px">Không có thông tin email gốc.</div>';
    }
    emailHtml += '</div>';

    // ── Validation checks ──
    var checksHtml = '<div style="margin-bottom:14px"><details><summary style="cursor:pointer;font-size:12px;font-weight:600">✅ Validation checks (' + checks.length + ')</summary>';
    if(checks.length === 0){
      checksHtml += '<div class="hm-empty" style="font-size:11px;margin-top:6px">Chưa chạy validation. Bấm "Re-validate" bên dưới.</div>';
    } else {
      checksHtml += '<ul style="list-style:none;padding:0;margin:6px 0 0 0;font-size:11px">';
      checks.forEach(function(ck){
        var icon = ck.severity === 'blocker' ? '✗' : (ck.severity === 'warning' ? '⚠' : '✓');
        var col  = ck.severity === 'blocker' ? '#dc2626' : (ck.severity === 'warning' ? '#f59e0b' : '#10b981');
        checksHtml += '<li style="padding:3px 0;color:' + col + '">' + icon + ' <code>' + escHtml(ck.check_code||'') + '</code> — ' + escHtml(ck.message||'') + '</li>';
      });
      checksHtml += '</ul>';
    }
    checksHtml += '</details></div>';

    bodyEl.innerHTML = header + linesHtml + attachHtml + emailHtml + checksHtml;

    // ── Footer action buttons ──
    var hasBlockers = blockers.length > 0;
    var status = c.status || '';
    var canApprove = !hasBlockers && !['security_hold','duplicate_hold','error','rejected','committed_cpo','committed_so'].includes(status);
    var canCommitCpo = !hasBlockers && ['approved','commit_ready'].includes(status);
    var canCommitSo  = !hasBlockers && ['approved','commit_ready','committed_cpo'].includes(status);

    footerEl.innerHTML = '<button onclick="aeoi.caseRevalidate()" class="hm-btn hm-btn-sm">🔄 Re-validate</button>'
      + '<button onclick="aeoi.caseReject()" class="hm-btn hm-btn-sm" style="color:#dc2626" ' + (['rejected','committed_cpo','committed_so'].includes(status) ? 'disabled' : '') + '>✗ Reject</button>'
      + '<button onclick="aeoi.caseApprove()" class="hm-btn hm-btn-sm" style="background:#10b981;color:#fff;border:none" ' + (canApprove ? '' : 'disabled') + '>✓ Approve</button>'
      + '<button onclick="aeoi.caseCommitCpo()" class="hm-btn hm-btn-sm" style="background:#2563eb;color:#fff;border:none" ' + (canCommitCpo ? '' : 'disabled') + '>📝 Commit CPO</button>'
      + '<button onclick="aeoi.caseCommitSo()" class="hm-btn hm-btn-sm" style="background:#7c3aed;color:#fff;border:none" ' + (canCommitSo ? '' : 'disabled') + '>📝 Commit SO</button>';
  }

  /* ── Mailbox provider-first wizard ─────────────────────────────────── */
  // WIZARD is a module-level state bag for the open mailbox wizard.
  // null when the wizard is closed.
  var WIZARD = null;

  function _wizardModal(){
    return '<div id="aeoi-wizard-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center" data-modal-display="flex">'
      + '<div style="background:var(--surface-0,#fff);border-radius:12px;padding:0;width:640px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;flex-direction:column">'
      + '<div style="padding:18px 24px;border-bottom:1px solid var(--border-1,#e5e7eb);display:flex;justify-content:space-between;align-items:center">'
      + '<div><div id="aeoi-wz-title" style="font-size:15px;font-weight:700">📬 Thêm Mailbox mới</div>'
      + '<div id="aeoi-wz-steps" style="font-size:11px;color:var(--text-3,#6b7280);margin-top:4px"></div></div>'
      + '<button onclick="aeoi.closeMailboxWizard()" class="hm-btn hm-btn-sm">✕ Đóng</button>'
      + '</div>'
      + '<div id="aeoi-wz-body" style="padding:20px 24px;overflow-y:auto;flex:1"></div>'
      + '<div id="aeoi-wz-footer" style="padding:14px 24px;border-top:1px solid var(--border-1,#e5e7eb);display:flex;gap:8px;justify-content:flex-end"></div>'
      + '</div></div>';
  }

  // Render is "innerHTML the body + footer based on WIZARD.step".
  function _renderWizard(){
    var el = document.getElementById('aeoi-wizard-modal');
    if(!el){
      document.body.insertAdjacentHTML('beforeend', _wizardModal());
      el = document.getElementById('aeoi-wizard-modal');
    }
    var titleEl  = document.getElementById('aeoi-wz-title');
    var stepsEl  = document.getElementById('aeoi-wz-steps');
    var bodyEl   = document.getElementById('aeoi-wz-body');
    var footerEl = document.getElementById('aeoi-wz-footer');
    if(!WIZARD || !bodyEl || !footerEl) return;

    titleEl.textContent = WIZARD.id ? ('✏ Sửa Mailbox #' + WIZARD.id) : '📬 Thêm Mailbox mới';
    var stepNames = ['Provider','Mailbox info','Credential','Test & Save'];
    stepsEl.innerHTML = stepNames.map(function(n,i){
      var idx = i + 1, active = idx === WIZARD.step, done = idx < WIZARD.step;
      var col = active ? 'var(--brand-primary,#2563eb)' : (done ? '#10b981' : 'var(--text-3,#6b7280)');
      var weight = active ? '700' : '400';
      return '<span style="color:' + col + ';font-weight:' + weight + '">' + (done?'✓ ':'') + 'Bước ' + idx + ': ' + n + '</span>';
    }).join('  →  ');

    bodyEl.innerHTML = _renderWizardStep(WIZARD.step);
    footerEl.innerHTML = _renderWizardFooter();
  }

  function _renderWizardStep(step){
    if(step === 1){
      // Provider selection — 4 cards
      var providers = [
        { id:'gmail_imap',      title:'Gmail IMAP',         desc:'Gmail / Google Workspace với App Password. Khuyến nghị cho khách dùng Gmail.', icon:'📧' },
        { id:'generic_imap',    title:'Generic IMAP',       desc:'Bất kỳ IMAP server: Zoho, Fastmail, cPanel mail, Yahoo, Microsoft 365 IMAP.', icon:'📨' },
        { id:'outlook_local',   title:'Outlook (Local Worker)', desc:'PowerShell worker chạy trên máy có Outlook desktop — không cần expose mailbox.', icon:'🖥' },
        { id:'microsoft_graph', title:'Microsoft 365 Graph',desc:'Tenant chung (Azure AD App). Cần app registration + admin consent. Đang ở giai đoạn beta.', icon:'🪟' },
      ];
      return '<div style="font-size:13px;color:var(--text-2,#374151);margin-bottom:14px">Chọn loại nguồn email AI sẽ đọc. Mỗi loại có credential riêng — wizard sẽ hỏi đúng field cần thiết.</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + providers.map(function(p){
            var selected = WIZARD.provider === p.id;
            return '<button onclick="aeoi.wizardSelectProvider(\'' + p.id + '\')" style="text-align:left;padding:14px;border:2px solid ' + (selected ? 'var(--brand-primary,#2563eb)' : 'var(--border-1,#e5e7eb)') + ';background:' + (selected ? '#eff6ff' : '#fff') + ';border-radius:8px;cursor:pointer;font-family:inherit">'
              + '<div style="font-size:20px">' + p.icon + '</div>'
              + '<div style="font-size:13px;font-weight:700;margin-top:6px">' + escHtml(p.title) + (selected ? ' ✓' : '') + '</div>'
              + '<div style="font-size:11px;color:var(--text-3,#6b7280);margin-top:4px">' + escHtml(p.desc) + '</div>'
              + '</button>';
          }).join('')
        + '</div>';
    }
    if(step === 2){
      // Mailbox info
      var note = '';
      if(WIZARD.provider==='gmail_imap')      note = 'Gmail: dùng full email (vd: orders@hesemeng.com). Folder mặc định INBOX. Dùng tên Gmail label (đổi / thành "INBOX/My-Label").';
      else if(WIZARD.provider==='generic_imap')   note = 'Bất kỳ IMAP server. Folder tùy theo server (vd: INBOX, INBOX.Orders).';
      else if(WIZARD.provider==='outlook_local')  note = 'Mailbox + folder phải tồn tại trên Outlook desktop của user. Worker đọc theo COM API.';
      else if(WIZARD.provider==='microsoft_graph')note = 'Dùng UPN (vd: orders@yourcompany.onmicrosoft.com). Folder mặc định Inbox.';

      return '<div style="font-size:12px;color:var(--text-3,#6b7280);margin-bottom:10px">' + escHtml(note) + '</div>'
        + '<div class="aeoi-grid2">'
        + _fieldInline('Mailbox address *', 'aeoi-wz-mailbox', WIZARD.mailbox, 'orders@hesemeng.com')
        + _fieldInline('Folder / Label', 'aeoi-wz-folder',  WIZARD.folder,  'INBOX')
        + '</div>'
        + '<div style="margin-top:12px;display:flex;gap:14px;font-size:12px">'
        + '<label style="cursor:pointer"><input type="checkbox" id="aeoi-wz-read-body" ' + (WIZARD.read_body?'checked':'') + '> Đọc nội dung email (body)</label>'
        + '<label style="cursor:pointer"><input type="checkbox" id="aeoi-wz-read-attachments" ' + (WIZARD.read_attachments?'checked':'') + '> Đọc file đính kèm</label>'
        + '</div>';
    }
    if(step === 3){
      // Credential — per-provider
      if(WIZARD.provider==='gmail_imap' || WIZARD.provider==='generic_imap'){
        var hint = WIZARD.provider==='gmail_imap'
          ? 'Gmail dùng App Password 16 ký tự. Vào myaccount.google.com → Security → 2-Step Verification → App passwords để tạo.'
          : 'Nhập IMAP host / port / encryption / username / password của server bạn dùng.';
        return '<div style="font-size:12px;color:var(--text-3,#6b7280);margin-bottom:10px">' + escHtml(hint) + '</div>'
          + '<div class="aeoi-grid2">'
          + _fieldInline('IMAP host *', 'aeoi-wz-host', WIZARD.imap_host, WIZARD.provider==='gmail_imap' ? 'imap.gmail.com' : 'imap.example.com')
          + _fieldInline('Port', 'aeoi-wz-port', String(WIZARD.imap_port||993), '993')
          + '</div>'
          + '<div class="aeoi-grid2" style="margin-top:10px">'
          + '<div><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Encryption</label>'
          + '<select id="aeoi-wz-encryption" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px">'
          + '<option value="ssl" ' + (WIZARD.imap_encryption==='ssl'?'selected':'') + '>SSL/TLS (port 993)</option>'
          + '<option value="starttls" ' + (WIZARD.imap_encryption==='starttls'?'selected':'') + '>STARTTLS (port 143)</option>'
          + '<option value="none" ' + (WIZARD.imap_encryption==='none'?'selected':'') + '>None (không khuyến nghị)</option>'
          + '</select></div>'
          + _fieldInline('Username', 'aeoi-wz-username', WIZARD.imap_username || WIZARD.mailbox, 'Mặc định = mailbox address')
          + '</div>'
          + '<div style="margin-top:10px"><label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">App Password / IMAP password *</label>'
          + '<input type="password" id="aeoi-wz-password" placeholder="' + (WIZARD.id ? '(đã lưu — nhập mới để đổi)' : 'xxxx yyyy zzzz wwww') + '" autocomplete="new-password" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;font-family:monospace">'
          + '</div>'
          + '<div style="margin-top:12px;font-size:12px">'
          + '<label style="cursor:pointer"><input type="checkbox" id="aeoi-wz-validate-cert" ' + (WIZARD.imap_validate_cert?'checked':'') + '> Validate TLS certificate (khuyến nghị bật trên production)</label>'
          + '</div>';
      }
      if(WIZARD.provider==='microsoft_graph'){
        var cfg = STATE.config || {};
        var hasTenant = !!cfg.m365_tenant_id;
        var hasClient = !!cfg.m365_client_id;
        var hasSecret = !!cfg.secret_configured;
        var ready = hasTenant && hasClient && hasSecret;
        return '<div style="font-size:13px;color:var(--text-2,#374151);margin-bottom:12px">'
          + 'Microsoft 365 dùng <b>tenant chung</b> (Azure AD App registration) ở cấp module.<br>Cấu hình ở: <b>📬 Mailbox & Folder</b> → <b>⚙️ Cài đặt module</b> → <i>Cấu hình Microsoft 365 (advanced)</i>.'
          + '</div>'
          + '<div style="padding:12px;background:' + (ready ? '#d1fae5' : '#fef3c7') + ';border-left:4px solid ' + (ready ? '#10b981' : '#f59e0b') + ';border-radius:4px;font-size:12px">'
          + (ready
              ? '✓ Tenant + Client ID + Secret đã có. Sang bước 4 để Test.'
              : '⚠ Cần nhập M365 tenant config trước. Đóng wizard, mở phần "Cấu hình Microsoft 365 (advanced)" trong card Cài đặt module, lưu Tenant + Client ID + Secret, rồi mở wizard lại.')
          + '<ul style="margin:8px 0 0 18px;font-size:11px">'
          + '<li>Tenant ID: ' + (hasTenant ? '✓' : '— chưa nhập') + '</li>'
          + '<li>Client ID: ' + (hasClient ? '✓' : '— chưa nhập') + '</li>'
          + '<li>Client Secret: ' + (hasSecret ? '✓' : '— chưa nhập') + '</li>'
          + '</ul></div>';
      }
      if(WIZARD.provider==='outlook_local'){
        return '<div style="font-size:13px;color:var(--text-2,#374151);margin-bottom:12px">Outlook local worker không cần credential trong portal — worker chạy trên máy desktop của user và dùng COM API trực tiếp.</div>'
          + '<div style="padding:12px;background:#dbeafe;border-left:4px solid #2563eb;border-radius:4px;font-size:12px">'
          + 'Cần: tạo Worker Token (tab Worker Tokens) → cấu hình script PowerShell trên máy user → tick "Allow worker to read this mailbox" trong row này sau khi tạo.'
          + '</div>';
      }
      return '<div style="font-size:12px;color:var(--text-3,#6b7280)">Provider chưa biết — không cần credential.</div>';
    }
    if(step === 4){
      // Test & Save
      return '<div style="font-size:13px;color:var(--text-2,#374151);margin-bottom:12px">Bước cuối — review + test connection trước khi mailbox lên production.</div>'
        + '<div style="background:var(--surface-2,#f3f4f6);border-radius:8px;padding:12px;font-family:monospace;font-size:11px;margin-bottom:12px">'
        + '<div><b>Provider:</b> ' + escHtml(WIZARD.provider) + '</div>'
        + '<div><b>Mailbox:</b> ' + escHtml(WIZARD.mailbox) + '</div>'
        + '<div><b>Folder:</b> ' + escHtml(WIZARD.folder) + '</div>'
        + '<div><b>Đọc body:</b> ' + (WIZARD.read_body ? '✓' : '—') + '   <b>Đính kèm:</b> ' + (WIZARD.read_attachments ? '✓' : '—') + '</div>'
        + ((WIZARD.provider==='gmail_imap' || WIZARD.provider==='generic_imap')
            ? '<div><b>IMAP:</b> ' + escHtml(WIZARD.imap_host) + ':' + WIZARD.imap_port + ' (' + escHtml(WIZARD.imap_encryption) + ')</div>'
              + '<div><b>Username:</b> ' + escHtml(WIZARD.imap_username || WIZARD.mailbox) + '</div>'
            : '')
        + '</div>'
        + ((WIZARD.provider==='gmail_imap' || WIZARD.provider==='generic_imap')
            ? '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><button id="aeoi-wz-test-btn" onclick="aeoi.wizardTest()" class="hm-btn hm-btn-sm">▶ Test connection (poll thử)</button><span style="font-size:11px;color:var(--text-3,#6b7280)">Sẽ lưu mailbox + chạy poll thật để kiểm tra credential.</span></div>'
            : '')
        + '<div id="aeoi-wz-test-result"></div>';
    }
    return '<div>Step không hợp lệ.</div>';
  }

  function _renderWizardFooter(){
    var step = WIZARD.step;
    var buttons = '';
    if(step > 1){
      buttons += '<button onclick="aeoi.wizardPrev()" class="hm-btn hm-btn-sm">← Quay lại</button>';
    }
    buttons += '<button onclick="aeoi.closeMailboxWizard()" class="hm-btn hm-btn-sm">Hủy</button>';
    if(step < 4){
      buttons += '<button onclick="aeoi.wizardNext()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">Tiếp →</button>';
    } else {
      buttons += '<button onclick="aeoi.wizardSubmit()" class="hm-btn hm-btn-sm" style="background:#10b981;color:#fff;border:none">💾 Lưu Mailbox</button>';
    }
    return buttons;
  }

  /* ── Test parse modal ─────────────────────────────────────────────────── */
  function _testParseModal(){
    return '<div id="aeoi-test-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center" data-modal-display="flex">'
      + '<div style="background:var(--surface-0,#fff);border-radius:12px;padding:24px;width:600px;max-width:95vw;max-height:90vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)">'
      + '<div style="font-size:14px;font-weight:700;margin-bottom:12px">🧪 Test phân tích email (dry run — không tạo đơn hàng)</div>'
      + '<label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Nội dung email</label>'
      + '<textarea id="aeoi-test-body" style="width:100%;height:160px;padding:8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;font-family:monospace;resize:vertical" placeholder="Dán nội dung email vào đây..."></textarea>'
      + '<label style="font-size:12px;font-weight:600;display:block;margin-top:10px;margin-bottom:4px">Văn bản từ file đính kèm PO (tùy chọn)</label>'
      + '<textarea id="aeoi-test-att" style="width:100%;height:100px;padding:8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;font-family:monospace;resize:vertical" placeholder="Dán text từ PDF PO (nếu có)..."></textarea>'
      + '<div id="aeoi-test-result" style="margin-top:12px"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
      + '<button onclick="aeoi.closeTestModal()" class="hm-btn hm-btn-sm">Đóng</button>'
      + '<button onclick="aeoi.submitTestParse()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">Phân tích</button>'
      + '</div></div></div>';
  }

  /* ── Shared field builders ────────────────────────────────────────────── */
  function _field(label, id, val, hint, type){
    type = type||'text';
    return '<div><label style="font-size:11px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:3px">' + escHtml(label) + '</label>'
      + '<input type="' + type + '" id="' + id + '" value="' + escHtml(String(val||'')) + '" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;box-sizing:border-box">'
      + (hint ? '<div style="font-size:10px;color:var(--text-3,#6b7280);margin-top:2px">' + escHtml(hint) + '</div>' : '')
      + '</div>';
  }
  function _fieldPw(label, id, placeholder, hint){
    return '<div><label style="font-size:11px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:3px">' + escHtml(label) + '</label>'
      + '<input type="password" id="' + id + '" placeholder="' + escHtml(placeholder) + '" autocomplete="new-password" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;box-sizing:border-box">'
      + (hint ? '<div style="font-size:10px;color:var(--text-3,#6b7280);margin-top:2px">' + escHtml(hint) + '</div>' : '')
      + '</div>';
  }
  function _fieldNum(label, id, val, hint, min, max, step){
    return '<div><label style="font-size:11px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:3px">' + escHtml(label) + '</label>'
      + '<input type="number" id="' + id + '" value="' + (val!==''&&val!=null?val:'') + '" min="' + (min||0) + '" max="' + (max||9999) + '" ' + (step?'step="'+step+'"':'') + ' style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;box-sizing:border-box">'
      + (hint ? '<div style="font-size:10px;color:var(--text-3,#6b7280);margin-top:2px">' + escHtml(hint) + '</div>' : '')
      + '</div>';
  }
  function _fieldSelect(label, id, options, selected){
    var opts = options.map(function(o){ return '<option value="' + escHtml(o[0]) + '" ' + (selected===o[0]?'selected':'') + '>' + escHtml(o[1]) + '</option>'; }).join('');
    return '<div><label style="font-size:11px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:3px">' + escHtml(label) + '</label>'
      + '<select id="' + id + '" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;box-sizing:border-box">' + opts + '</select>'
      + '</div>';
  }
  function _fieldInline(label, id, val, placeholder){
    return '<label style="font-size:11px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:3px">' + escHtml(label) + '</label>'
      + '<input type="text" id="' + id + '" value="' + escHtml(String(val||'')) + '" placeholder="' + escHtml(placeholder||'') + '" style="width:100%;padding:6px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:12px;box-sizing:border-box">';
  }
  function _checkbox(id, label, checked){
    return '<label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:12px;padding:6px">'
      + '<input type="checkbox" id="' + id + '" ' + (checked?'checked':'') + ' style="margin-top:2px;width:14px;height:14px;flex-shrink:0"> '
      + '<span>' + escHtml(label) + '</span></label>';
  }
  function _roleCheckGroup(idPrefix, title, selected, hint){
    var html = '<div style="margin-bottom:14px">'
      + '<div style="font-size:12px;font-weight:600;color:var(--text-1,#111);margin-bottom:2px">' + escHtml(title) + '</div>'
      + (hint ? '<div style="font-size:11px;color:var(--text-3,#6b7280);margin-bottom:6px">' + escHtml(hint) + '</div>' : '')
      + '<div style="display:flex;gap:10px;flex-wrap:wrap">';
    ROLE_OPTIONS.forEach(function(r){
      var chk = selected.indexOf(r.v) >= 0;
      html += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:4px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;background:' + (chk?'var(--blue-bg,#eff6ff)':'var(--surface-0,#fff)') + '">'
        + '<input type="checkbox" class="' + idPrefix + '-role" data-role="' + escHtml(r.v) + '" ' + (chk?'checked':'') + '> ' + escHtml(r.l) + '</label>';
    });
    html += '</div></div>';
    return html;
  }
  function _saveBtn(onclick){
    return '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-1,#e5e7eb);display:flex;gap:8px;align-items:center">'
      + '<button onclick="' + onclick + '" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">💾 Lưu thay đổi</button>'
      + '<span id="aeoi-save-msg" style="font-size:12px;color:var(--green-1,#065f46)"></span>'
      + '</div>';
  }
  function _cardHead(title, sub){
    return '<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:700">' + escHtml(title) + '</div>'
      + (sub ? '<div style="font-size:11px;color:var(--text-3,#6b7280);margin-top:2px">' + escHtml(sub) + '</div>' : '')
      + '</div>';
  }
  function _statusBadge(s){
    var map = {
      running:     ['var(--blue-bg,#eff6ff)',    'var(--blue-1,#1d4ed8)',  '⏳ Đang chạy'],
      completed:   ['var(--green-bg,#d1fae5)',   'var(--green-1,#065f46)', '✅ Hoàn tất'],
      failed:      ['var(--red-bg,#fee2e2)',      'var(--danger-1,#ef4444)','❌ Lỗi'],
      skipped:     ['var(--surface-2,#f3f4f6)',  'var(--text-3,#6b7280)',  '⏭ Bỏ qua'],
      pending:     ['var(--yellow-bg,#fffbeb)',   'var(--yellow-1,#92400e)','⏳ Chờ'],
      extracted:   ['var(--blue-bg,#eff6ff)',    'var(--blue-1,#1d4ed8)',  '🔍 Đã trích xuất'],
      created:     ['var(--green-bg,#d1fae5)',   'var(--green-1,#065f46)', '✅ Đã tạo SO'],
      review_queue:['var(--yellow-bg,#fffbeb)',  'var(--yellow-1,#92400e)','⏳ Chờ duyệt'],
      quarantined: ['var(--red-bg,#fee2e2)',     'var(--danger-1,#ef4444)','🚨 Cách ly'],
      duplicate:   ['var(--surface-2,#f3f4f6)', 'var(--text-3,#6b7280)',  '♻️ Trùng lặp'],
    };
    var m = map[s] || ['var(--surface-2,#f3f4f6)','var(--text-2,#374151)', escHtml(s||'—')];
    return '<span style="background:' + m[0] + ';color:' + m[1] + ';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;white-space:nowrap">' + m[2] + '</span>';
  }
  function _allowlistBadge(t){
    if(t==='email')  return '<span style="color:var(--green-1,#065f46);font-size:10px">✅ email</span>';
    if(t==='domain') return '<span style="color:var(--blue-1,#1d4ed8);font-size:10px">✅ domain</span>';
    return '<span style="color:var(--danger-1,#ef4444);font-size:10px">✗ lạ</span>';
  }
  function _pagination(offset, total, limit, fnName, extraArg){
    var page  = Math.floor(offset/limit) + 1;
    var pages = Math.ceil(total/limit) || 1;
    if(pages <= 1) return '';
    var ex = extraArg || '';
    return '<div style="display:flex;gap:6px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12px">'
      + '<span style="color:var(--text-3,#6b7280)">Trang ' + page + '/' + pages + ' (' + total + ' mục)</span>'
      + (offset > 0 ? '<button onclick="' + fnName + '(' + (offset-limit) + ex + ')" class="hm-btn hm-btn-xs">‹ Trước</button>' : '')
      + (offset + limit < total ? '<button onclick="' + fnName + '(' + (offset+limit) + ex + ')" class="hm-btn hm-btn-xs">Sau ›</button>' : '')
      + '</div>';
  }

  /* ── Sprint A-D new sections ──────────────────────────────────────────── */

  function _sectionMailboxes(){
    var rows = STATE.mailboxes || [];

    // Renders one "(provider) badge" with friendly label + colour.
    var providerLabel = function(prov){
      var map = {
        'gmail_imap':      { l:'Gmail IMAP',           bg:'#fde7c2', fg:'#9a3412' },
        'generic_imap':    { l:'IMAP',                 bg:'#dbeafe', fg:'#1e40af' },
        'outlook_local':   { l:'Outlook (worker)',     bg:'#e9d5ff', fg:'#6b21a8' },
        'microsoft_graph': { l:'Microsoft 365',        bg:'#dcfce7', fg:'#166534' },
        'exchange_ews':    { l:'Exchange (EWS)',       bg:'#fee2e2', fg:'#991b1b' },
        'manual_upload':   { l:'Upload tay',           bg:'#f1f5f9', fg:'#334155' },
      };
      var m = map[prov] || { l:prov||'unknown', bg:'#f3f4f6', fg:'#374151' };
      return '<span style="font-size:10px;padding:2px 8px;background:' + m.bg + ';color:' + m.fg + ';border-radius:10px;font-weight:600">' + escHtml(m.l) + '</span>';
    };

    // Card 1: module-wide settings (was the Kết nối M365 tab)
    var html = _moduleSettingsCard();

    // Card 2: list of mailboxes + add wizard launcher
    html += '<div class="aeoi-card" style="margin-top:14px">'
      + _cardHead('📬 Danh sách Mailbox', 'Worker chỉ scan các mailbox enabled bên dưới. Mỗi mailbox khai báo provider riêng (Gmail / IMAP / Outlook local / M365).')
      + '<div style="display:flex;gap:8px;margin-bottom:10px">'
      + '<button onclick="aeoi.openMailboxWizard()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">+ Thêm Mailbox</button>'
      + '<button onclick="aeoi.loadMailboxes()" class="hm-btn hm-btn-sm">🔄 Tải lại</button>'
      + '<span style="font-size:11px;color:var(--text-3,#6b7280);line-height:32px">' + rows.length + ' mailbox · ' + rows.filter(function(m){return m.enabled;}).length + ' đang bật</span>'
      + '</div>';
    if(rows.length===0){
      html += '<div class="hm-empty">Chưa có mailbox nào. Bấm "+ Thêm Mailbox" để bắt đầu (sẽ hỏi từng bước: provider → mailbox → credential → test).</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="aeoi-table"><thead><tr>'
        + '<th>#</th><th>Mailbox</th><th>Provider</th><th>Folder</th><th>Đọc body</th><th>Đính kèm</th><th>Trạng thái</th><th>Scan gần nhất</th><th>Hành động</th>'
        + '</tr></thead><tbody>';
      rows.forEach(function(m,i){
        var active = m.enabled
          ? '<span style="color:var(--green-1,#065f46);font-size:11px">● Bật</span>'
          : '<span style="color:var(--text-3,#6b7280);font-size:11px">○ Tắt</span>';
        html += '<tr style="' + (!m.enabled ? 'opacity:0.5' : '') + '">'
          + '<td>'+(i+1)+'</td>'
          + '<td style="font-family:monospace;font-weight:600">' + escHtml(m.mailbox_address) + '</td>'
          + '<td>' + providerLabel(m.provider) + '</td>'
          + '<td style="font-family:monospace;font-size:11px">' + escHtml(m.folder_path) + '</td>'
          + '<td>' + (m.read_body ? '✓' : '—') + '</td>'
          + '<td>' + (m.read_attachments ? '✓' : '—') + '</td>'
          + '<td>' + active + '</td>'
          + '<td style="font-size:11px;color:var(--text-3,#6b7280)">' + fmtDt(m.last_scan_at) + (m.last_status ? '<br>'+escHtml(m.last_status) : '') + '</td>'
          + '<td style="white-space:nowrap">'
          + ((m.provider==='gmail_imap' || m.provider==='generic_imap')
              ? '<button onclick="aeoi.pollMailbox('+m.id+')" class="hm-btn hm-btn-xs" title="Quét IMAP ngay" style="background:var(--brand-primary,#2563eb);color:#fff">▶ Poll</button> '
              : '')
          + '<button onclick="aeoi.openMailboxWizard('+m.id+')" class="hm-btn hm-btn-xs" title="Sửa">✏</button> '
          + '<button onclick="aeoi.toggleMailbox('+m.id+','+(m.enabled?'false':'true')+')" class="hm-btn hm-btn-xs" title="' + (m.enabled?'Tắt':'Bật') + '">' + (m.enabled?'⏸':'▶') + '</button> '
          + '<button onclick="aeoi.deleteMailbox('+m.id+')" class="hm-btn hm-btn-xs" style="color:var(--danger-1,#ef4444)" title="Xóa">🗑</button>'
          + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    return html;
  }

  function _sectionHeaderRules(){
    var rows = STATE.headerRules || [];
    var html = '<div class="aeoi-card">'
      + _cardHead('📑 Header Rules', 'Quy tắc nhận diện email đầu vào. Worker prefilter theo subject_prefix; backend revalidate body markers + required fields.')
      + '<div style="display:flex;gap:8px;margin-bottom:10px">'
      + '<button onclick="aeoi.openHeaderRuleForm()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">+ Thêm Rule</button>'
      + '<button onclick="aeoi.loadHeaderRules()" class="hm-btn hm-btn-sm">🔄 Tải lại</button>'
      + '</div>';
    if(rows.length===0){
      html += '<div class="hm-empty">Chưa có header rule.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="aeoi-table"><thead><tr>'
        + '<th>#</th><th>Tên rule</th><th>Subject prefix</th><th>Markers</th><th>Doc types</th><th>Actions</th><th>Trạng thái</th><th>Thiếu header → </th><th>Hành động</th>'
        + '</tr></thead><tbody>';
      rows.forEach(function(r,i){
        html += '<tr style="'+(!r.enabled?'opacity:0.5':'')+'">'
          + '<td>'+(i+1)+'</td>'
          + '<td style="font-weight:600">' + escHtml(r.rule_name) + '</td>'
          + '<td style="font-family:monospace;font-size:11px">' + escHtml(r.subject_prefix||'—') + '</td>'
          + '<td style="font-family:monospace;font-size:10px">' + escHtml(r.body_start_marker) + '<br>' + escHtml(r.body_end_marker) + '</td>'
          + '<td style="font-size:10px">' + (r.allowed_doc_types||[]).map(escHtml).join(', ') + '</td>'
          + '<td style="font-size:10px">' + (r.allowed_actions||[]).map(escHtml).join(', ') + '</td>'
          + '<td>' + (r.enabled?'● Bật':'○ Tắt') + '</td>'
          + '<td style="font-size:10px">' + escHtml(r.missing_header_action) + '</td>'
          + '<td style="white-space:nowrap">'
          + '<button onclick="aeoi.openHeaderRuleForm('+r.id+')" class="hm-btn hm-btn-xs">✏</button> '
          + '<button onclick="aeoi.deleteHeaderRule('+r.id+')" class="hm-btn hm-btn-xs" style="color:var(--danger-1,#ef4444)">🗑</button>'
          + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    return html;
  }

  function _sectionTemplates(){
    var rows = STATE.templates || [];
    var html = '<div class="aeoi-card">'
      + _cardHead('🎯 Template Khách hàng', 'Field hints AI dùng để định vị PO number, part number, revision, qty, ngày giao... theo từng khách + định dạng file.')
      + '<div style="display:flex;gap:8px;margin-bottom:10px">'
      + '<button onclick="aeoi.openTemplateForm()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">+ Thêm Template</button>'
      + '<button onclick="aeoi.loadTemplates()" class="hm-btn hm-btn-sm">🔄 Tải lại</button>'
      + '</div>';
    if(rows.length===0){
      html += '<div class="hm-empty">Chưa có template.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="aeoi-table"><thead><tr>'
        + '<th>#</th><th>Khách</th><th>Tên template</th><th>Doc type</th><th>File</th><th>Min confidence</th><th>Trạng thái</th><th>Hành động</th>'
        + '</tr></thead><tbody>';
      rows.forEach(function(t,i){
        html += '<tr style="'+(!t.enabled?'opacity:0.5':'')+'">'
          + '<td>'+(i+1)+'</td>'
          + '<td style="font-weight:600">' + escHtml(t.customer_id) + '</td>'
          + '<td>' + escHtml(t.template_name) + '</td>'
          + '<td><span style="font-size:10px;padding:1px 6px;background:var(--surface-2,#f3f4f6);border-radius:4px">' + escHtml(t.document_type) + '</span></td>'
          + '<td>' + escHtml(t.file_type) + '</td>'
          + '<td style="font-size:11px">overall ≥ ' + t.min_confidence_overall + '<br>field ≥ ' + t.min_confidence_required_field + '</td>'
          + '<td>' + (t.enabled?'● Bật':'○ Tắt') + '</td>'
          + '<td style="white-space:nowrap">'
          + '<button onclick="aeoi.openTemplateForm('+t.id+')" class="hm-btn hm-btn-xs">✏</button> '
          + '<button onclick="aeoi.deleteTemplate('+t.id+')" class="hm-btn hm-btn-xs" style="color:var(--danger-1,#ef4444)">🗑</button>'
          + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    return html;
  }

  function _sectionWorkers(){
    var rows = STATE.workerTokens || [];
    var html = '<div class="aeoi-card">'
      + _cardHead('🔑 Worker Tokens (HMAC)', 'Credentials cho local Outlook worker. Secret hiển thị 1 LẦN duy nhất khi tạo hoặc rotate — lưu ngay vào file C:\\HESEM\\secrets\\.')
      + '<div style="padding:8px 12px;border-left:3px solid var(--warning-1,#f59e0b);background:var(--warning-bg,#fef3c7);margin-bottom:10px;font-size:11px">'
      + '⚠ Tải PowerShell worker từ <code>tools/ai-order-intake/outlook-order-intake-worker.ps1</code> và làm theo <code>windows-task-scheduler-setup.md</code>.'
      + '</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:10px">'
      + '<button onclick="aeoi.openWorkerForm()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">+ Tạo Worker Token</button>'
      + '<button onclick="aeoi.loadWorkers()" class="hm-btn hm-btn-sm">🔄 Tải lại</button>'
      + '</div>';
    if(rows.length===0){
      html += '<div class="hm-empty">Chưa có worker token.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="aeoi-table"><thead><tr>'
        + '<th>#</th><th>Worker ID</th><th>Tên</th><th>Trạng thái</th><th>IP allowlist</th><th>Lần dùng cuối</th><th>Hành động</th>'
        + '</tr></thead><tbody>';
      rows.forEach(function(w,i){
        html += '<tr style="'+(!w.enabled?'opacity:0.5':'')+'">'
          + '<td>'+(i+1)+'</td>'
          + '<td style="font-family:monospace;font-weight:600">' + escHtml(w.worker_id) + '</td>'
          + '<td>' + escHtml(w.worker_name||'—') + '</td>'
          + '<td>' + (w.enabled?'● Bật':'○ Tắt') + '</td>'
          + '<td style="font-size:10px;font-family:monospace">' + ((w.ip_allowlist||[]).length ? (w.ip_allowlist||[]).map(escHtml).join(', ') : '—') + '</td>'
          + '<td style="font-size:11px;color:var(--text-3,#6b7280)">' + fmtDt(w.last_used_at) + (w.last_used_ip ? '<br>'+escHtml(w.last_used_ip) : '') + '</td>'
          + '<td style="white-space:nowrap">'
          + '<button onclick="aeoi.rotateWorker('+w.id+')" class="hm-btn hm-btn-xs" title="Rotate secret">🔄</button> '
          + '<button onclick="aeoi.toggleWorker('+w.id+','+(w.enabled?'false':'true')+')" class="hm-btn hm-btn-xs" title="' + (w.enabled?'Tắt':'Bật') + '">' + (w.enabled?'⏸':'▶') + '</button>'
          + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    return html;
  }

  function _sectionCases(){
    var data = STATE.cases || { items:[], total:0, offset:0 };
    var canOpenFullQueue = (typeof window.canUserAccessModule === 'function')
      ? !!window.canUserAccessModule('template-demo')
      : false;
    // Status → colour map for badges (mirrors GPT Pro audit recommendation).
    var statusColor = {
      'new':                    {bg:'#f3f4f6', fg:'#374151'},
      'extraction_pending':     {bg:'#f3f4f6', fg:'#374151'},
      'extraction_running':     {bg:'#fef3c7', fg:'#92400e'},
      'extracted':              {bg:'#dbeafe', fg:'#1e40af'},
      'validation_pending':     {bg:'#fef3c7', fg:'#92400e'},
      'validation_running':     {bg:'#fef3c7', fg:'#92400e'},
      'needs_review':           {bg:'#fef3c7', fg:'#92400e'},
      'engineering_review':     {bg:'#f5d0fe', fg:'#86198f'},
      'commercial_review':      {bg:'#bfdbfe', fg:'#1e3a8a'},
      'planning_review':        {bg:'#c7d2fe', fg:'#3730a3'},
      'quality_review':         {bg:'#bbf7d0', fg:'#166534'},
      'security_hold':          {bg:'#fee2e2', fg:'#991b1b'},
      'duplicate_hold':         {bg:'#fed7aa', fg:'#9a3412'},
      'approved':               {bg:'#d1fae5', fg:'#065f46'},
      'commit_ready':           {bg:'#a7f3d0', fg:'#065f46'},
      'committed_cpo':          {bg:'#6ee7b7', fg:'#064e3b'},
      'committed_so':           {bg:'#6ee7b7', fg:'#064e3b'},
      'rejected':               {bg:'#e5e7eb', fg:'#4b5563'},
      'error':                  {bg:'#fee2e2', fg:'#991b1b'},
    };
    var statusBadge = function(s){
      var c = statusColor[s] || {bg:'#f3f4f6', fg:'#374151'};
      return '<span style="font-size:10px;padding:2px 8px;background:' + c.bg + ';color:' + c.fg + ';border-radius:10px;font-weight:600">' + escHtml(s) + '</span>';
    };
    var html = '<div class="aeoi-card">'
      + _cardHead('📦 Intake Cases', 'Click vào hàng để mở chi tiết, duyệt/từ chối, hoặc commit thành Customer PO / Sales Order. ' + (canOpenFullQueue ? 'Tab "AI Intake Queue" trong M2-Orders là full view dành cho sales/planning.' : ''))
      + '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'
      + '<button onclick="aeoi.loadCases(0)" class="hm-btn hm-btn-sm">🔄 Tải lại</button>'
      + (canOpenFullQueue
          ? '<button onclick="aeoi.openOrdersAiQueue()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">Mở Intake Queue đầy đủ →</button>'
          : '')
      + '<span style="font-size:11px;color:var(--text-3,#6b7280);line-height:32px">' + data.total + ' case · ' + data.items.filter(function(c){return c.status==='needs_review'||c.status==='security_hold';}).length + ' cần xử lý</span>'
      + '</div>';
    if(data.items.length===0){
      html += '<div class="hm-empty">Chưa có case nào. Sau khi cron poll hoặc admin "Chạy ngay" → các email khớp allowlist sẽ thành case ở đây.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="aeoi-table"><thead><tr>'
        + '<th>#</th><th>Intake</th><th>Trạng thái</th><th>Khách</th><th>PO khách</th><th>Lines</th><th>Confidence</th><th>Tạo lúc</th><th>Hành động</th>'
        + '</tr></thead><tbody>';
      data.items.forEach(function(c,i){
        var blockerCount = Array.isArray(c.blocking_codes) ? c.blocking_codes.length : 0;
        var warnCount    = Array.isArray(c.warning_codes)  ? c.warning_codes.length  : 0;
        var flags = blockerCount > 0 ? '<span style="color:#dc2626;font-size:10px">✗' + blockerCount + '</span> ' : '';
        flags += warnCount > 0 ? '<span style="color:#f59e0b;font-size:10px">⚠' + warnCount + '</span>' : '';
        html += '<tr style="cursor:pointer" onclick="aeoi.openCaseDetail(' + c.id + ')">'
          + '<td>'+(data.offset+i+1)+'</td>'
          + '<td style="font-family:monospace;font-weight:600">' + escHtml(c.intake_no) + (flags ? ' ' + flags : '') + '</td>'
          + '<td>' + statusBadge(c.status) + '</td>'
          + '<td>' + escHtml(c.customer_id||'—') + (c.customer_name ? '<br><span style="font-size:10px;color:var(--text-3,#6b7280)">' + escHtml(c.customer_name) + '</span>' : '') + '</td>'
          + '<td style="font-family:monospace">' + escHtml(c.customer_po_number||'—') + '</td>'
          + '<td style="text-align:center;font-size:11px">' + (c.line_count || 0) + (c.attachment_count ? ' · ' + c.attachment_count + ' 📎' : '') + '</td>'
          + '<td style="text-align:right">' + (c.overall_confidence!=null ? Number(c.overall_confidence).toFixed(2) : '—') + '</td>'
          + '<td style="font-size:11px">' + fmtDt(c.created_at) + '</td>'
          + '<td onclick="event.stopPropagation()"><button onclick="aeoi.openCaseDetail(' + c.id + ')" class="hm-btn hm-btn-xs" style="background:var(--brand-primary,#2563eb);color:#fff">📂 Mở</button></td>'
          + '</tr>';
      });
      html += '</tbody></table></div>';
      html += _pagination(data.offset, data.total, 50, 'aeoi.loadCases');
    }
    html += '</div>';
    return html;
  }

  /* ── Public API (window.aeoi) ─────────────────────────────────────────── */
  window.aeoi = {
    _msgStatus: '',

    switchSection: function(id){
      STATE.activeSection = id;
      var el = document.getElementById('aeoi-section-content');
      if(!el) return;
      // Lazy-load log sections
      if(id==='poll_log' && STATE.pollLog.items.length===0) aeoi.loadPollLog(0);
      if(id==='msg_log'  && STATE.msgLog.items.length===0)  aeoi.loadMsgLog(0,'');
      if(id==='quarantine' && STATE.quarantine.items.length===0) aeoi.loadQuarantine(0);
      if(id==='llm_model'  && !STATE.llm)            aeoi.loadLlmConfig();
      el.innerHTML = _renderSection(id);
      _bindSection();
      // Update tab highlight
      var root = document.querySelector('.aeoi-root');
      if(root){
        root.querySelectorAll('[onclick^="aeoi.switchSection"]').forEach(function(btn){
          var match = btn.getAttribute('onclick').indexOf("'"+id+"'") >= 0;
          btn.style.borderBottomColor = match ? 'var(--brand-primary,#2563eb)' : 'transparent';
          btn.style.fontWeight = match ? '700' : '400';
          btn.style.color = match ? 'var(--brand-primary,#2563eb)' : 'var(--text-2,#374151)';
        });
      }
    },

    /* Save helpers */
    _val: function(id, def){ var el = document.getElementById(id); return el ? el.value : (def||''); },
    _checked: function(id){ var el = document.getElementById(id); return el ? el.checked : false; },
    _collectRoles: function(cls){
      var roles = [];
      document.querySelectorAll('.' + cls + '-role:checked').forEach(function(el){ roles.push(el.dataset.role); });
      return roles;
    },
    _collectAttTypes: function(){
      var types = [];
      document.querySelectorAll('.aeoi-att-type:checked').forEach(function(el){ types.push(el.dataset.type); });
      return types;
    },
    _showSaveMsg: function(msg, isError){
      var el = document.getElementById('aeoi-save-msg');
      if(!el) return;
      el.textContent = msg;
      el.style.color = isError ? 'var(--danger-1,#ef4444)' : 'var(--green-1,#065f46)';
      setTimeout(function(){ if(el) el.textContent = ''; }, 3000);
    },

    saveConnection: function(){
      var payload = {
        m365_tenant_id: aeoi._val('aeoi-tenant-id'),
        m365_client_id: aeoi._val('aeoi-client-id'),
        intake_mailbox: aeoi._val('aeoi-mailbox'),
        enabled:        aeoi._checked('aeoi-enabled'),
        poll_interval_minutes: parseInt(aeoi._val('aeoi-poll-interval'))||120,
        extraction_scope: aeoi._val('aeoi-extraction-scope'),
        allowed_attachment_types: aeoi._collectAttTypes(),
      };
      var secret = aeoi._val('aeoi-client-secret');
      if(secret && secret.indexOf('(đã lưu') < 0) payload.m365_client_secret = secret;
      aeoi._doSave(payload);
    },

    saveLogic: function(){
      var payload = {
        auto_create_mode:       aeoi._val('aeoi-auto-create-mode'),
        confidence_threshold:   parseFloat(aeoi._val('aeoi-confidence'))||0.95,
        part_match_mode:        aeoi._val('aeoi-part-match'),
        missing_field_action:   aeoi._val('aeoi-missing-field'),
        duplicate_check_days:   parseInt(aeoi._val('aeoi-dup-days'))||30,
        max_attachments_per_email: parseInt(aeoi._val('aeoi-max-att'))||3,
        auto_cascade_jo:        false,  // forbidden per migration 204; UI no longer exposes
        business_hours_only:    aeoi._checked('aeoi-biz-hours'),
        business_hours_start:   aeoi._val('aeoi-biz-start'),
        business_hours_end:     aeoi._val('aeoi-biz-end'),
        business_hours_timezone: aeoi._val('aeoi-biz-tz'),
      };
      aeoi._doSave(payload);
    },

    saveSecurity: function(){
      var hvThresh = aeoi._val('aeoi-hv-threshold');
      var payload = {
        allowlist_enforcement:     aeoi._val('aeoi-allowlist-enforcement'),
        max_orders_per_poll:       parseInt(aeoi._val('aeoi-max-orders'))||50,
        high_value_action:         aeoi._val('aeoi-hv-action'),
        high_value_threshold:      hvThresh !== '' ? parseFloat(hvThresh) : null,
        high_value_currency:       aeoi._val('aeoi-hv-currency'),
        audit_retention_days:      parseInt(aeoi._val('aeoi-audit-days'))||90,
        require_spf_dkim:          aeoi._checked('aeoi-spf-dkim'),
        quarantine_unknown_senders: aeoi._checked('aeoi-quarantine-unknown'),
        quarantine_review_alert:   aeoi._checked('aeoi-quarantine-alert'),
        mask_prices_in_log:        aeoi._checked('aeoi-mask-prices'),
      };
      aeoi._doSave(payload);
    },

    saveNotify: function(){
      var payload = {
        notify_roles_on_create: aeoi._collectRoles('aeoi-notify-create'),
        notify_roles_on_review: aeoi._collectRoles('aeoi-notify-review'),
        notify_roles_on_error:  aeoi._collectRoles('aeoi-notify-error'),
        escalation_review_hours: parseInt(aeoi._val('aeoi-escalation-hours'))||24,
      };
      aeoi._doSave(payload);
    },

    _doSave: function(payload){
      var btn = document.querySelector('[onclick*="aeoi.save"]');
      apiCall('admin_email_intake_config_save', payload, function(res){
        if(res.ok){ STATE.config = res.config; aeoi._showSaveMsg('✓ Đã lưu'); }
        else { aeoi._showSaveMsg('✗ ' + (res.error||'Lỗi lưu'), true); }
      });
    },

    /* Allowlist */
    openAddEntry: function(){
      var el = document.getElementById('aeoi-add-modal');
      if(!el) return;
      ['aeoi-new-value','aeoi-new-label','aeoi-new-customer','aeoi-new-notes'].forEach(function(id){
        var f = document.getElementById(id); if(f) f.value = '';
      });
      var typeSel = document.getElementById('aeoi-new-type'); if(typeSel) typeSel.value = 'email';
      el.style.display = 'flex';
      var first = document.getElementById('aeoi-new-value'); if(first) first.focus();
    },
    closeAddModal: function(){
      var el = document.getElementById('aeoi-add-modal');
      if(el) el.style.display = 'none';
    },
    submitAddEntry: function(){
      var payload = {
        entry_type:  aeoi._val('aeoi-new-type'),
        value:       aeoi._val('aeoi-new-value').trim(),
        label:       aeoi._val('aeoi-new-label').trim()||null,
        customer_id: aeoi._val('aeoi-new-customer').trim()||null,
        notes:       aeoi._val('aeoi-new-notes').trim()||null,
      };
      if(!payload.value){ alert('Vui lòng nhập email hoặc domain.'); return; }
      apiCall('admin_email_intake_allowlist_add', payload, function(res){
        if(res.ok){
          aeoi.closeAddModal();
          _loadAllowlist(function(){ STATE.activeSection='allowlist'; _refreshSection(); });
        } else {
          alert('Lỗi: ' + (res.error||'Không thể thêm'));
        }
      });
    },
    toggleEntry: function(id, active){
      apiCall('admin_email_intake_allowlist_update', {id:id, active:active}, function(res){
        if(res.ok) _loadAllowlist(function(){ _refreshSection(); });
        else alert('Lỗi: ' + (res.error||''));
      });
    },
    deleteEntry: function(id, value){
      if(!confirm('Xóa "' + value + '" khỏi danh sách cho phép?')) return;
      apiCall('admin_email_intake_allowlist_delete', {id:id}, function(res){
        if(res.ok) _loadAllowlist(function(){ _refreshSection(); });
        else alert('Lỗi: ' + (res.error||''));
      });
    },

    /* Poll trigger */
    triggerPoll: function(){
      if(!confirm('Kích hoạt quét email thủ công ngay bây giờ?')) return;
      apiCall('admin_email_intake_trigger', {}, function(res){
        if(res.ok) alert('✓ ' + (res.message || 'Đã kích hoạt. Xem nhật ký poll để theo dõi.'));
        else alert('✗ ' + (res.error||'Lỗi kích hoạt'));
      });
    },

    /* Master kill-switch toggle (Migration 212).
     * Confirmation already handled by the banner button onclick. */
    toggleMaster: function(enabled){
      apiCall('admin_email_intake_master_toggle', { enabled: !!enabled }, function(res){
        if (res && res.ok) {
          // Refresh config + full re-render so the banner colour + the
          // "Chạy ngay" / "Test phân tích" buttons re-evaluate disabled.
          apiCall('admin_email_intake_config_get', {}, function(getRes){
            if (getRes && getRes.ok) {
              STATE.config = getRes.config || {};
              if (STATE.container) _render(STATE.container);
            }
          });
        } else {
          alert('✗ ' + ((res && res.error) || 'Lỗi cập nhật master toggle'));
        }
      });
    },

    /* Test parse */
    /* Navigate from admin AEOI to the M2-orders ai-intake-queue tab.
     * The portal uses navigateTo(page) for module routing; a plain
     * <a href> with ?module= bypasses the SPA router and forces a full
     * page reload, which drops the auth session and bounces the user
     * back to login. Use the JS API instead so navigation stays inside
     * the SPA. */
    openOrdersAiQueue: function(){
      try {
        if (typeof window.navigateTo === 'function') {
          window.navigateTo('template-demo'); // template-demo page hosts M2-orders
          setTimeout(function(){
            if (window.HmModuleRouter && typeof window.HmModuleRouter.setActiveTab === 'function') {
              window.HmModuleRouter.setActiveTab('ai-intake-queue');
            }
          }, 300);
          return;
        }
      } catch(e) { /* fall through */ }
      // Last-resort: open in a new tab so we don't kill the current session.
      window.open(window.location.pathname + '#template-demo', '_blank');
    },

    openTestParse: function(){
      var el = document.getElementById('aeoi-test-modal');
      if(!el){
        document.body.insertAdjacentHTML('beforeend', _testParseModal());
        el = document.getElementById('aeoi-test-modal');
      }
      el.style.display = 'flex';
    },
    closeTestModal: function(){
      var el = document.getElementById('aeoi-test-modal');
      if(el) el.style.display = 'none';
    },
    submitTestParse: function(){
      var body = aeoi._val('aeoi-test-body');
      if(!body.trim()){ alert('Vui lòng nhập nội dung email.'); return; }
      var resEl = document.getElementById('aeoi-test-result');
      if(resEl) resEl.innerHTML = '<div style="color:var(--text-3,#6b7280);font-size:12px">Đang phân tích...</div>';
      apiCall('admin_email_intake_test_parse', {email_body: body, attachment_text: aeoi._val('aeoi-test-att')}, function(res){
        if(!resEl) return;
        if(!res.ok){
          resEl.innerHTML = '<div style="color:var(--danger-1,#ef4444);font-size:12px">Lỗi: ' + escHtml(res.error||'') + '</div>';
          return;
        }
        var html = '';
        var claudeErr = String(res.claude_error || '');
        if(claudeErr.indexOf('credit balance is too low') >= 0){
          html += '<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:10px;margin-bottom:8px;font-size:12px;color:#78350f;border-radius:4px">'
            + '<strong>⚠ Anthropic API hết credit.</strong> Header parser deterministic vẫn hoạt động bình thường, nhưng phần Claude fallback cho email không có block <code>[HESEM-ORDER-INTAKE]</code> sẽ bị disable cho đến khi nạp credit. '
            + 'Nạp tại <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener" style="color:#b45309;text-decoration:underline">console.anthropic.com/settings/billing</a>.'
            + '</div>';
        } else if(claudeErr && res.claude_configured){
          html += '<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:10px;margin-bottom:8px;font-size:12px;color:#7f1d1d;border-radius:4px">'
            + '<strong>⚠ Claude API lỗi:</strong> ' + escHtml(claudeErr.substring(0, 300))
            + '</div>';
        } else if(!res.claude_configured){
          html += '<div style="background:#dbeafe;border-left:4px solid #2563eb;padding:10px;margin-bottom:8px;font-size:12px;color:#1e3a8a;border-radius:4px">'
            + 'ℹ <strong>Claude API chưa cấu hình</strong> — set <code>ANTHROPIC_API_KEY</code> env var trong php-fpm pool để bật fallback.'
            + '</div>';
        }
        html += '<div style="background:var(--surface-2,#f3f4f6);border-radius:8px;padding:10px;font-size:11px;font-family:monospace;white-space:pre-wrap;max-height:400px;overflow:auto">'
          + escHtml(JSON.stringify(res, null, 2)) + '</div>';
        resEl.innerHTML = html;
      });
    },

    /* Logs */
    loadPollLog: function(offset){
      apiCall('admin_email_intake_poll_log', {limit:50, offset:offset||0}, function(res){
        if(res.ok){ STATE.pollLog = {items: res.items||[], total: res.total||0, offset: offset||0}; }
        _refreshSection();
      });
    },
    loadMsgLog: function(offset, status){
      aeoi._msgStatus = status||'';
      apiCall('admin_email_intake_message_log', {limit:50, offset:offset||0, status:status||''}, function(res){
        if(res.ok){ STATE.msgLog = {items:res.items||[], total:res.total||0, offset:offset||0, status:status||''}; }
        _refreshSection();
      });
    },
    filterMsgLog: function(status){ aeoi.loadMsgLog(0, status); },

    /* Quarantine */
    loadQuarantine: function(offset){
      var all = document.getElementById('aeoi-q-showall');
      apiCall('admin_email_intake_quarantine_get', {limit:50, offset:offset||0, all:(all&&all.checked)?'1':'0'}, function(res){
        if(res.ok){ STATE.quarantine = {items:res.items||[], total:res.total||0, offset:offset||0}; }
        _refreshSection();
      });
    },
    toggleQShowAll: function(){ aeoi.loadQuarantine(0); },
    reviewItem: function(id, action){
      var notes = action==='block' ? (prompt('Lý do chặn (tùy chọn):')||null) : null;
      apiCall('admin_email_intake_quarantine_action', {id:id, action:action, notes:notes}, function(res){
        if(res.ok) aeoi.loadQuarantine(STATE.quarantine.offset||0);
        else alert('Lỗi: ' + (res.error||''));
      });
    },

    // ── Sprint A-D loaders ──────────────────────────────────────────────
    loadMailboxes: function(){
      apiCall('admin_email_intake_mailbox_list', {}, function(res){
        STATE.mailboxes = (res.ok && res.mailboxes) ? res.mailboxes : [];
        _refreshSection();
      });
    },
    /* Mailbox wizard — replaces the prompt() based form with a proper
     * 4-step modal: Provider → Mailbox info → Credential → Test & Save.
     * Per-provider field set: Gmail wants host/port/app-pwd; M365 wants
     * tenant/client/secret (read from global config); Outlook local just
     * needs the worker-token claim. */
    openMailboxWizard: function(id){
      var existing = id ? (STATE.mailboxes||[]).find(function(m){return m.id===id;}) : null;
      WIZARD = {
        id: id || null,
        step: 1,
        provider:  existing ? existing.provider          : '',
        mailbox:   existing ? existing.mailbox_address   : '',
        folder:    existing ? existing.folder_path       : 'INBOX',
        read_body: existing ? !!existing.read_body       : true,
        read_attachments: existing ? !!existing.read_attachments : true,
        imap_host:        existing ? (existing.imap_host || '')        : '',
        imap_port:        existing ? (existing.imap_port || 993)       : 993,
        imap_encryption:  existing ? (existing.imap_encryption || 'ssl') : 'ssl',
        imap_username:    existing ? (existing.imap_username || '')    : '',
        imap_password:    '',
        imap_validate_cert: existing ? !!existing.imap_validate_cert : true,
        test_result: null,
      };
      _renderWizard();
      var el = document.getElementById('aeoi-wizard-modal');
      if(el) el.style.display = 'flex';
    },
    closeMailboxWizard: function(){
      var el = document.getElementById('aeoi-wizard-modal');
      if(el) el.style.display = 'none';
      WIZARD = null;
    },
    wizardSelectProvider: function(p){
      if(!WIZARD) return;
      WIZARD.provider = p;
      // Provider-specific defaults
      if(p==='gmail_imap'){
        WIZARD.imap_host = 'imap.gmail.com';
        WIZARD.imap_port = 993;
        WIZARD.imap_encryption = 'ssl';
        WIZARD.folder = 'INBOX';
      } else if(p==='generic_imap'){
        if(!WIZARD.imap_host) WIZARD.imap_host = '';
        if(!WIZARD.imap_port) WIZARD.imap_port = 993;
        WIZARD.imap_encryption = WIZARD.imap_encryption || 'ssl';
        WIZARD.folder = WIZARD.folder || 'INBOX';
      } else if(p==='outlook_local'){
        WIZARD.folder = WIZARD.folder || 'Inbox/AI-Order-Intake';
      } else if(p==='microsoft_graph'){
        WIZARD.folder = WIZARD.folder || 'Inbox';
      }
      _renderWizard();
    },
    wizardNext: function(){
      if(!WIZARD) return;
      // Per-step validation
      if(WIZARD.step===1 && !WIZARD.provider){
        alert('Vui lòng chọn 1 provider để tiếp tục.');
        return;
      }
      if(WIZARD.step===2){
        WIZARD.mailbox = (aeoi._val('aeoi-wz-mailbox')||'').trim();
        WIZARD.folder  = (aeoi._val('aeoi-wz-folder')||'').trim() || 'INBOX';
        WIZARD.read_body        = aeoi._checked('aeoi-wz-read-body');
        WIZARD.read_attachments = aeoi._checked('aeoi-wz-read-attachments');
        if(!WIZARD.mailbox){ alert('Mailbox address là bắt buộc.'); return; }
      }
      if(WIZARD.step===3){
        if(WIZARD.provider==='gmail_imap' || WIZARD.provider==='generic_imap'){
          WIZARD.imap_host       = (aeoi._val('aeoi-wz-host')||'').trim();
          WIZARD.imap_port       = parseInt(aeoi._val('aeoi-wz-port')||'993') || 993;
          WIZARD.imap_encryption = aeoi._val('aeoi-wz-encryption') || 'ssl';
          WIZARD.imap_username   = (aeoi._val('aeoi-wz-username')||'').trim() || WIZARD.mailbox;
          var pwd = aeoi._val('aeoi-wz-password');
          if(pwd) WIZARD.imap_password = pwd;
          WIZARD.imap_validate_cert = aeoi._checked('aeoi-wz-validate-cert');
          if(!WIZARD.imap_host){ alert('IMAP host là bắt buộc.'); return; }
          if(!WIZARD.id && !WIZARD.imap_password){ alert('App password / IMAP password là bắt buộc khi tạo mới.'); return; }
        }
        if(WIZARD.provider==='microsoft_graph'){
          // Falls back to global config — no per-mailbox fields yet.
        }
      }
      WIZARD.step = Math.min(4, WIZARD.step + 1);
      _renderWizard();
    },
    wizardPrev: function(){
      if(!WIZARD) return;
      WIZARD.step = Math.max(1, WIZARD.step - 1);
      _renderWizard();
    },
    wizardSubmit: function(){
      if(!WIZARD) return;
      var payload = {
        mailbox_address: WIZARD.mailbox,
        folder_path:     WIZARD.folder,
        provider:        WIZARD.provider,
        enabled:         true,
        read_body:        WIZARD.read_body,
        read_attachments: WIZARD.read_attachments,
      };
      if(WIZARD.provider==='gmail_imap' || WIZARD.provider==='generic_imap'){
        payload.imap_host       = WIZARD.imap_host;
        payload.imap_port       = WIZARD.imap_port;
        payload.imap_encryption = WIZARD.imap_encryption;
        payload.imap_username   = WIZARD.imap_username;
        payload.imap_validate_cert = WIZARD.imap_validate_cert;
        if(WIZARD.imap_password) payload.imap_password = WIZARD.imap_password;
      }
      if(WIZARD.id){ payload.id = WIZARD.id; }
      var action = WIZARD.id ? 'admin_email_intake_mailbox_update' : 'admin_email_intake_mailbox_create';
      apiCall(action, payload, function(res){
        if(res.ok){
          aeoi.closeMailboxWizard();
          aeoi.loadMailboxes();
        } else {
          alert('Lỗi lưu mailbox: ' + (res.error||'unknown') + ' — ' + (res.detail||''));
        }
      });
    },
    /* Test connection (step 4) — for IMAP providers we hit a mock probe
     * by triggering the existing poll endpoint. Real "test only" endpoint
     * is a follow-up; for now we just save then offer a poll. */
    wizardTest: function(){
      var btn = document.getElementById('aeoi-wz-test-btn');
      var out = document.getElementById('aeoi-wz-test-result');
      if(out){ out.innerHTML = '<div style="font-size:12px;color:var(--text-3,#6b7280)">Đang lưu mailbox + chạy poll thử...</div>'; }
      if(btn) btn.disabled = true;
      // Step 1: save the mailbox (so we have an id to poll)
      var payload = {
        mailbox_address: WIZARD.mailbox,
        folder_path:     WIZARD.folder,
        provider:        WIZARD.provider,
        enabled:         true,
        read_body:        WIZARD.read_body,
        read_attachments: WIZARD.read_attachments,
      };
      if(WIZARD.provider==='gmail_imap' || WIZARD.provider==='generic_imap'){
        payload.imap_host       = WIZARD.imap_host;
        payload.imap_port       = WIZARD.imap_port;
        payload.imap_encryption = WIZARD.imap_encryption;
        payload.imap_username   = WIZARD.imap_username;
        payload.imap_validate_cert = WIZARD.imap_validate_cert;
        if(WIZARD.imap_password) payload.imap_password = WIZARD.imap_password;
      }
      if(WIZARD.id){ payload.id = WIZARD.id; }
      var action = WIZARD.id ? 'admin_email_intake_mailbox_update' : 'admin_email_intake_mailbox_create';
      apiCall(action, payload, function(res){
        if(!res.ok){
          if(out){ out.innerHTML = '<div style="color:#dc2626;font-size:12px">Lỗi lưu: ' + escHtml(res.error||'unknown') + '</div>'; }
          if(btn) btn.disabled = false;
          return;
        }
        WIZARD.id = res.mailbox && res.mailbox.id || WIZARD.id;
        // Step 2: actually poll to verify the credential works
        apiCall('admin_email_intake_mailbox_poll', {id: WIZARD.id}, function(poll){
          if(btn) btn.disabled = false;
          WIZARD.test_result = poll;
          if(poll.ok){
            if(out){ out.innerHTML = '<div style="color:#10b981;font-size:12px;background:#d1fae5;padding:8px;border-radius:6px">✓ Kết nối thành công. Fetched=' + (poll.fetched||0) + ' Created=' + (poll.created||0) + ' Skipped=' + (poll.skipped||0) + '</div>'; }
          } else {
            if(out){ out.innerHTML = '<div style="color:#dc2626;font-size:12px;background:#fee2e2;padding:8px;border-radius:6px">✗ Test failed: ' + escHtml(poll.error||'unknown') + '<br><br>Mailbox đã được lưu — có thể sửa và Test lại.</div>'; }
          }
        });
      });
    },
    toggleMailbox: function(id, enabled){
      apiCall('admin_email_intake_mailbox_update', {id:id, enabled:enabled}, function(res){
        if(res.ok) aeoi.loadMailboxes();
        else alert('Lỗi: ' + (res.error||''));
      });
    },
    deleteMailbox: function(id){
      if(!confirm('Xóa mailbox này? Không thể hoàn tác.')) return;
      apiCall('admin_email_intake_mailbox_delete', {id:id}, function(res){
        if(res.ok) aeoi.loadMailboxes();
        else alert('Lỗi: ' + (res.error||''));
      });
    },

    loadHeaderRules: function(){
      apiCall('admin_email_intake_header_rule_list', {}, function(res){
        STATE.headerRules = (res.ok && res.header_rules) ? res.header_rules : [];
        _refreshSection();
      });
    },
    openHeaderRuleForm: function(id){
      var existing = id ? (STATE.headerRules||[]).find(function(r){return r.id===id;}) : null;
      var name = prompt('Tên rule:', existing ? existing.rule_name : 'HESEM Standard Order Intake Header');
      if(name==null) return;
      var subject = prompt('Subject prefix (rỗng = bỏ qua):', existing ? (existing.subject_prefix||'') : '[HESEM-ORDER-INTAKE]');
      if(subject==null) return;
      var payload = {
        rule_name: name, subject_prefix: subject||null, enabled: true,
        body_start_marker: '[HESEM-ORDER-INTAKE]',
        body_end_marker:   '[/HESEM-ORDER-INTAKE]',
      };
      if(id){ payload.id = id; }
      var action = id ? 'admin_email_intake_header_rule_update' : 'admin_email_intake_header_rule_create';
      apiCall(action, payload, function(res){
        if(res.ok) aeoi.loadHeaderRules();
        else alert('Lỗi: ' + (res.error||''));
      });
    },
    deleteHeaderRule: function(id){
      if(!confirm('Xóa header rule?')) return;
      apiCall('admin_email_intake_header_rule_delete', {id:id}, function(res){
        if(res.ok) aeoi.loadHeaderRules();
        else alert('Lỗi: ' + (res.error||''));
      });
    },

    loadTemplates: function(){
      apiCall('admin_email_intake_template_list', {}, function(res){
        STATE.templates = (res.ok && res.templates) ? res.templates : [];
        _refreshSection();
      });
    },
    openTemplateForm: function(id){
      var existing = id ? (STATE.templates||[]).find(function(t){return t.id===id;}) : null;
      var custId = prompt('Customer ID:', existing ? existing.customer_id : '');
      if(custId==null) return;
      var name = prompt('Template name:', existing ? existing.template_name : '');
      if(name==null) return;
      var docType = prompt('Document type (CUSTOMER_PO | PO_CHANGE | PO_CANCEL | EXPEDITE):', existing ? existing.document_type : 'CUSTOMER_PO');
      if(docType==null) return;
      var fileType = prompt('File type (pdf | xlsx | docx):', existing ? existing.file_type : 'pdf');
      if(fileType==null) return;
      var payload = {
        customer_id: custId, template_name: name,
        document_type: docType, file_type: fileType, enabled: true,
      };
      if(id){ payload.id = id; }
      var action = id ? 'admin_email_intake_template_update' : 'admin_email_intake_template_create';
      apiCall(action, payload, function(res){
        if(res.ok) aeoi.loadTemplates();
        else alert('Lỗi: ' + (res.error||''));
      });
    },
    deleteTemplate: function(id){
      if(!confirm('Xóa template?')) return;
      apiCall('admin_email_intake_template_delete', {id:id}, function(res){
        if(res.ok) aeoi.loadTemplates();
        else alert('Lỗi: ' + (res.error||''));
      });
    },

    loadWorkers: function(){
      apiCall('admin_email_intake_worker_token_list', {}, function(res){
        STATE.workerTokens = (res.ok && res.tokens) ? res.tokens : [];
        _refreshSection();
      });
    },

    /* LLM Model routing */
    loadLlmConfig: function(forceProbe){
      STATE.llm = STATE.llm || {providers: [], rules: [], health: {}};
      var pending = 2 + (forceProbe ? 1 : 0);
      function done(){ if(--pending === 0) _refreshSection(); }
      apiCall('admin_email_intake_llm_providers_list', {}, function(res){
        STATE.llm.providers = (res.ok && res.providers) ? res.providers : [];
        done();
      });
      apiCall('admin_email_intake_llm_rules_list', {}, function(res){
        STATE.llm.rules = (res.ok && res.rules) ? res.rules : [];
        done();
      });
      if(forceProbe){
        apiCall('admin_email_intake_llm_health', {}, function(res){
          STATE.llm.health = (res.ok && res.health) ? res.health : {};
          done();
        });
      } else if(!STATE.llm.healthLoaded){
        // fetch in background, then refresh
        apiCall('admin_email_intake_llm_health', {}, function(res){
          STATE.llm.health = (res.ok && res.health) ? res.health : {};
          STATE.llm.healthLoaded = true;
          if(STATE.activeSection === 'llm_model') _refreshSection();
        });
      }
    },

    openLlmRuleForm: function(){
      var el = document.getElementById('aeoi-llm-rule-modal');
      if(!el){
        document.body.insertAdjacentHTML('beforeend', _llmRuleModal());
        el = document.getElementById('aeoi-llm-rule-modal');
      }
      // Populate provider dropdown
      var provSel = document.getElementById('aeoi-llm-primary-provider');
      provSel.innerHTML = (STATE.llm.providers || []).map(function(p){
        return '<option value="' + escHtml(p.provider_key) + '">' + escHtml(p.display_name) + '</option>';
      }).join('');
      document.getElementById('aeoi-llm-rule-title').textContent = '🤖 Thêm LLM Routing Rule';
      document.getElementById('aeoi-llm-routing-id').value = '';
      document.getElementById('aeoi-llm-scope-type').value = 'global_default';
      document.getElementById('aeoi-llm-scope-value').value = '*';
      document.getElementById('aeoi-llm-priority').value = '100';
      document.getElementById('aeoi-llm-enabled').checked = true;
      document.getElementById('aeoi-llm-description').value = '';
      document.getElementById('aeoi-llm-fallback-rows').innerHTML = '';
      document.getElementById('aeoi-llm-rule-err').style.display = 'none';
      aeoi._llmOnProviderChange('primary');
      el.style.display = 'flex';
    },

    editLlmRule: function(routingId){
      var rule = (STATE.llm.rules || []).find(function(r){ return r.routing_id == routingId; });
      if(!rule) return;
      aeoi.openLlmRuleForm();
      document.getElementById('aeoi-llm-rule-title').textContent = '🤖 Sửa LLM Routing Rule #' + routingId;
      document.getElementById('aeoi-llm-routing-id').value = routingId;
      document.getElementById('aeoi-llm-scope-type').value = rule.scope_type;
      document.getElementById('aeoi-llm-scope-value').value = rule.scope_value;
      document.getElementById('aeoi-llm-priority').value = rule.priority || 100;
      document.getElementById('aeoi-llm-enabled').checked = !!rule.is_enabled;
      document.getElementById('aeoi-llm-description').value = rule.description || '';
      document.getElementById('aeoi-llm-primary-provider').value = rule.primary_provider;
      aeoi._llmOnProviderChange('primary');
      setTimeout(function(){
        document.getElementById('aeoi-llm-primary-model').value = rule.primary_model || '';
      }, 30);
      var rowsEl = document.getElementById('aeoi-llm-fallback-rows');
      rowsEl.innerHTML = '';
      (rule.fallback_chain || []).forEach(function(step){ aeoi._llmAddFallback(step.provider, step.model); });
    },

    closeLlmRuleForm: function(){
      var el = document.getElementById('aeoi-llm-rule-modal');
      if(el) el.style.display = 'none';
    },

    _llmOnScopeTypeChange: function(){
      var st  = aeoi._val('aeoi-llm-scope-type');
      var val = document.getElementById('aeoi-llm-scope-value');
      var hint = document.getElementById('aeoi-llm-scope-hint');
      if(st === 'global_default'){
        val.value = '*'; val.disabled = true;
        hint.textContent = 'global_default scope is fixed to "*".';
      } else {
        val.disabled = false;
        if(st === 'tier'){
          if(['extraction_default','extraction_pdf','extraction_complex'].indexOf(val.value) < 0) val.value = 'extraction_default';
          hint.textContent = 'tier: extraction_default | extraction_pdf | extraction_complex';
        } else if(st === 'doc_pattern'){
          hint.textContent = 'Glob: e.g. PO_CHANGE* (use * and ? wildcards)';
        } else {
          hint.textContent = 'Exact doc_type code: CUSTOMER_PO | PO_CHANGE | PO_CANCEL | EXPEDITE';
        }
      }
    },

    _llmOnProviderChange: function(which){
      var providerKey = aeoi._val('aeoi-llm-primary-provider');
      var prov = (STATE.llm.providers || []).find(function(p){ return p.provider_key === providerKey; });
      var modelSel = document.getElementById('aeoi-llm-primary-model');
      if(!modelSel) return;
      var models = prov ? (prov.models || []) : [];
      modelSel.innerHTML = models.length === 0
        ? '<option value="">(default)</option>'
        : models.map(function(m){ return '<option value="' + escHtml(m) + '">' + escHtml(m) + '</option>'; }).join('');
    },

    _llmAddFallback: function(provider, model){
      var rowsEl = document.getElementById('aeoi-llm-fallback-rows');
      var idx = rowsEl.children.length;
      var rowId = 'aeoi-llm-fb-' + idx;
      var providerOptions = (STATE.llm.providers || []).map(function(p){
        return '<option value="' + escHtml(p.provider_key) + '"' + (p.provider_key === provider ? ' selected' : '') + '>' + escHtml(p.display_name) + '</option>';
      }).join('');
      var row = document.createElement('div');
      row.id = rowId;
      row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;margin-bottom:4px';
      row.innerHTML = ''
        + '<select class="aeoi-llm-fb-provider" style="padding:5px;border:1px solid var(--border-1,#e5e7eb);border-radius:4px;font-size:12px">' + providerOptions + '</select>'
        + '<input type="text" class="aeoi-llm-fb-model" placeholder="model id" value="' + escHtml(model||'') + '" style="padding:5px;border:1px solid var(--border-1,#e5e7eb);border-radius:4px;font-size:12px;font-family:monospace">'
        + '<button onclick="document.getElementById(\'' + rowId + '\').remove()" class="hm-btn hm-btn-sm" style="color:#dc2626">✕</button>';
      rowsEl.appendChild(row);
    },

    submitLlmRuleForm: function(){
      var routingId = aeoi._val('aeoi-llm-routing-id');
      var payload = {
        scope_type:       aeoi._val('aeoi-llm-scope-type'),
        scope_value:      aeoi._val('aeoi-llm-scope-value').trim() || '*',
        primary_provider: aeoi._val('aeoi-llm-primary-provider'),
        primary_model:    aeoi._val('aeoi-llm-primary-model').trim() || null,
        priority:         parseInt(aeoi._val('aeoi-llm-priority')) || 100,
        is_enabled:       aeoi._checked('aeoi-llm-enabled'),
        description:      aeoi._val('aeoi-llm-description').trim() || null,
        fallback_chain:   []
      };
      if(routingId) payload.routing_id = parseInt(routingId);
      var rows = document.querySelectorAll('#aeoi-llm-fallback-rows > div');
      rows.forEach(function(row){
        var p = row.querySelector('.aeoi-llm-fb-provider').value;
        var m = row.querySelector('.aeoi-llm-fb-model').value.trim();
        if(p) payload.fallback_chain.push({provider: p, model: m});
      });
      var errEl = document.getElementById('aeoi-llm-rule-err');
      apiCall('admin_email_intake_llm_rule_save', payload, function(res){
        if(!res.ok){
          if(errEl){ errEl.textContent = 'Lỗi: ' + (res.error||'unknown') + ' — ' + (res.detail||''); errEl.style.display = 'block'; }
          return;
        }
        aeoi.closeLlmRuleForm();
        STATE.llm = null;
        aeoi.loadLlmConfig();
      });
    },

    deleteLlmRule: function(routingId, label){
      if(!confirm('Xóa rule "' + label + '"?')) return;
      apiCall('admin_email_intake_llm_rule_delete', {routing_id: routingId}, function(res){
        if(!res.ok){ alert('Lỗi: ' + (res.error||'')); return; }
        STATE.llm = null;
        aeoi.loadLlmConfig();
      });
    },

    openWorkerForm: function(){
      var el = document.getElementById('aeoi-worker-modal');
      if(!el){
        document.body.insertAdjacentHTML('beforeend', _workerCreateModal());
        el = document.getElementById('aeoi-worker-modal');
      }
      var wid  = document.getElementById('aeoi-worker-id');
      var wnm  = document.getElementById('aeoi-worker-name');
      var werr = document.getElementById('aeoi-worker-err');
      if(wid)  wid.value = '';
      if(wnm)  wnm.value = '';
      if(werr){ werr.style.display = 'none'; werr.textContent = ''; }
      el.style.display = 'flex';
      if(wid) wid.focus();
    },
    closeWorkerForm: function(){
      var el = document.getElementById('aeoi-worker-modal');
      if(el) el.style.display = 'none';
    },
    submitWorkerForm: function(){
      var wid = (aeoi._val('aeoi-worker-id')||'').trim();
      var wnm = (aeoi._val('aeoi-worker-name')||'').trim();
      var werr = document.getElementById('aeoi-worker-err');
      if(!wid || !/^[A-Za-z0-9_\-]{3,80}$/.test(wid)){
        if(werr){ werr.textContent = 'Worker ID phải là 3-80 ký tự alphanumeric / _ / -'; werr.style.display='block'; }
        return;
      }
      apiCall('admin_email_intake_worker_token_create', {
        worker_id: wid, worker_name: wnm, enabled: true,
      }, function(res){
        if(!res.ok){
          if(werr){ werr.textContent = 'Lỗi: ' + (res.error||'unknown'); werr.style.display='block'; }
          return;
        }
        aeoi.closeWorkerForm();
        aeoi._showWorkerSecret(res.token && res.token.worker_id ? res.token.worker_id : wid, res.raw_secret||'');
        aeoi.loadWorkers();
      });
    },
    rotateWorker: function(id){
      if(!confirm('Rotate secret? Worker hiện tại sẽ KHÔNG dùng được cho đến khi cập nhật secret file.')) return;
      apiCall('admin_email_intake_worker_token_rotate', {id:id}, function(res){
        if(!res.ok){ alert('Lỗi: ' + (res.error||'')); return; }
        aeoi._showWorkerSecret(res.token && res.token.worker_id ? res.token.worker_id : ('id='+id), res.raw_secret||'');
        aeoi.loadWorkers();
      });
    },
    _showWorkerSecret: function(workerId, secret){
      var el = document.getElementById('aeoi-worker-secret-modal');
      if(!el){
        document.body.insertAdjacentHTML('beforeend', _workerSecretModal());
        el = document.getElementById('aeoi-worker-secret-modal');
      }
      var idEl  = document.getElementById('aeoi-worker-secret-id');
      var valEl = document.getElementById('aeoi-worker-secret-val');
      var msgEl = document.getElementById('aeoi-worker-secret-msg');
      if(idEl)  idEl.textContent  = workerId;
      if(valEl) valEl.textContent = secret;
      if(msgEl) msgEl.textContent = '';
      el.style.display = 'flex';
    },
    closeWorkerSecret: function(){
      var el = document.getElementById('aeoi-worker-secret-modal');
      if(el) el.style.display = 'none';
      // Wipe the secret from DOM after close so it can't be re-read via devtools
      var valEl = document.getElementById('aeoi-worker-secret-val');
      if(valEl) valEl.textContent = '';
    },
    copyWorkerSecret: function(){
      var valEl = document.getElementById('aeoi-worker-secret-val');
      var msgEl = document.getElementById('aeoi-worker-secret-msg');
      var secret = valEl ? valEl.textContent : '';
      if(!secret){ if(msgEl) msgEl.textContent = 'Không có secret để copy'; return; }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(secret).then(function(){
          if(msgEl) msgEl.textContent = '✓ Đã copy vào clipboard';
        }, function(){
          if(msgEl) msgEl.textContent = '✗ Không copy được (browser block)';
        });
      } else {
        if(msgEl) msgEl.textContent = '✗ Browser không hỗ trợ clipboard API';
      }
    },
    toggleWorker: function(id, enable){
      var action = enable ? 'admin_email_intake_worker_token_enable' : 'admin_email_intake_worker_token_disable';
      apiCall(action, {id:id}, function(res){
        if(res.ok) aeoi.loadWorkers();
        else alert('Lỗi: ' + (res.error||''));
      });
    },

    loadCases: function(offset){
      // window.apiCall URL-encodes the action, so we can't smuggle &-delimited
      // query params through the `action` argument. For the admin-tab overview
      // we just fetch the first 50 (server default) and let the full
      // Orders > AI Intake Queue tab handle real pagination.
      apiCall('ai_order_intake_case_list', {}, function(res){
        if(res && res.ok){
          STATE.cases = {items:res.cases||[], total:res.total||0, offset:0};
        } else {
          STATE.cases = {items:[], total:0, offset:0};
        }
        _refreshSection();
      });
    },

    /* Case detail + action methods (P1 — order review UI) */
    openCaseDetail: function(caseId){
      var el = document.getElementById('aeoi-case-modal');
      if(!el){
        document.body.insertAdjacentHTML('beforeend', _caseDetailModal());
        el = document.getElementById('aeoi-case-modal');
      }
      el.style.display = 'flex';
      CASE_DETAIL = { id: caseId, case:null, lines:[], attachments:[], checks:[], message:{}, loading:true };
      _renderCaseDetail();
      // The local apiCall() wrapper derives GET/POST from the action
      // suffix and case_detail doesn't match the GET regex. Call the
      // global window.apiCall directly with explicit GET so jsonBody()
      // can read the id (POST body parsing is unreliable on some FPM
      // configs without the right Content-Type header).
      var p = window.apiCall('ai_order_intake_case_detail', {id: caseId}, 'GET');
      p.then(function(res){
        if(!res || !res.ok){
          var bodyEl = document.getElementById('aeoi-case-body');
          if(bodyEl) bodyEl.innerHTML = '<div style="color:#dc2626">Lỗi tải case: ' + escHtml(res && res.error || 'unknown') + '</div>';
          return;
        }
        // case_detail returns {ok, case} where case has lines,
        // attachments, validation_checks as nested arrays.
        var c = res.case || (res.detail && res.detail.case) || res;
        CASE_DETAIL = {
          id:          caseId,
          case:        c,
          lines:       Array.isArray(c.lines) ? c.lines : [],
          attachments: Array.isArray(c.attachments) ? c.attachments : [],
          checks:      Array.isArray(c.validation_checks) ? c.validation_checks
                          : (Array.isArray(c.checks) ? c.checks : []),
          message:     c.message || c.email_message || {},
          loading:     false,
        };
        _renderCaseDetail();
      }).catch(function(e){
        var bodyEl = document.getElementById('aeoi-case-body');
        if(bodyEl) bodyEl.innerHTML = '<div style="color:#dc2626">Lỗi: ' + escHtml(String(e && e.message || e)) + '</div>';
      });
    },
    closeCaseDetail: function(){
      var el = document.getElementById('aeoi-case-modal');
      if(el) el.style.display = 'none';
      CASE_DETAIL = null;
    },
    caseRevalidate: function(){
      if(!CASE_DETAIL || !CASE_DETAIL.id) return;
      var id = CASE_DETAIL.id;
      apiCall('ai_order_intake_case_validate', {id: id}, function(res){
        if(!res || !res.ok){ alert('Validation lỗi: ' + (res && res.error || 'unknown') + (res && res.detail ? '\n' + res.detail : '')); return; }
        // Reload detail + parent list
        aeoi.openCaseDetail(id);
        aeoi.loadCases(0);
      });
    },
    caseApprove: function(){
      if(!CASE_DETAIL || !CASE_DETAIL.case) return;
      var c = CASE_DETAIL.case;
      var warnings = Array.isArray(c.warning_codes) ? c.warning_codes : [];
      var reason = '';
      if(warnings.length > 0){
        reason = prompt('Có ' + warnings.length + ' warning. Nhập lý do approve (bắt buộc):\n\n' + warnings.join(', '));
        if(reason == null || reason.trim() === ''){ return; }
      } else {
        reason = prompt('Approve case ' + c.intake_no + ' — lý do (tùy chọn):', '') || '';
      }
      apiCall('ai_order_intake_case_approve', {id: c.id, reason: reason}, function(res){
        if(!res || !res.ok){ alert('Approve lỗi: ' + (res && res.error || 'unknown') + (res && res.detail ? '\n' + res.detail : '')); return; }
        aeoi.openCaseDetail(c.id);
        aeoi.loadCases(0);
      });
    },
    caseReject: function(){
      if(!CASE_DETAIL || !CASE_DETAIL.case) return;
      var c = CASE_DETAIL.case;
      var reason = prompt('Reject case ' + c.intake_no + ' — lý do:', '');
      if(reason == null || reason.trim() === ''){ return; }
      apiCall('ai_order_intake_case_reject', {id: c.id, reason: reason}, function(res){
        if(!res || !res.ok){ alert('Reject lỗi: ' + (res && res.error || 'unknown')); return; }
        aeoi.openCaseDetail(c.id);
        aeoi.loadCases(0);
      });
    },
    caseCommitCpo: function(){
      if(!CASE_DETAIL || !CASE_DETAIL.case) return;
      var c = CASE_DETAIL.case;
      if(!confirm('Commit Customer PO từ case ' + c.intake_no + '?\n\nCPO sẽ được tạo trong master data. Không thể hoàn tác.')) return;
      apiCall('ai_order_intake_commit_cpo', {id: c.id}, function(res){
        if(!res || !res.ok){ alert('Commit CPO lỗi: ' + (res && res.error || 'unknown') + (res && res.detail ? '\n' + res.detail : '')); return; }
        alert('✓ Customer PO đã được tạo. ID: ' + (res.customer_po && (res.customer_po.customer_po_id || res.customer_po.id) || '(see master data)'));
        aeoi.openCaseDetail(c.id);
        aeoi.loadCases(0);
      });
    },
    caseCommitSo: function(){
      if(!CASE_DETAIL || !CASE_DETAIL.case) return;
      var c = CASE_DETAIL.case;
      if(!confirm('Commit Sales Order từ case ' + c.intake_no + '?\n\nSO sẽ được tạo qua workflow Orders. Yêu cầu mỗi line có part_number + revision_number + quantity > 0.')) return;
      apiCall('ai_order_intake_commit_so', {id: c.id}, function(res){
        if(!res || !res.ok){ alert('Commit SO lỗi: ' + (res && res.error || 'unknown') + (res && res.detail ? '\n' + res.detail : '')); return; }
        alert('✓ Sales Order đã được tạo. SO number: ' + (res.sales_order && res.sales_order.so_number || '(see Orders module)'));
        aeoi.openCaseDetail(c.id);
        aeoi.loadCases(0);
      });
    },
  };

  /* ── Bind dynamic checkbox watchers ─────────────────────────────────── */
  function _bindGlobal(container){
    // Business hours toggle
    container.addEventListener('change', function(e){
      if(e.target && e.target.id === 'aeoi-biz-hours'){
        var detail = document.getElementById('aeoi-biz-hours-detail');
        if(detail) detail.style.display = e.target.checked ? 'grid' : 'none';
      }
    });
  }
  function _bindSection(){
    // no extra bindings needed — all handled via onclick/onchange attrs
  }

  /* ── CSS injection ───────────────────────────────────────────────────── */
  if(!document.getElementById('aeoi-styles')){
    var style = document.createElement('style');
    style.id = 'aeoi-styles';
    style.textContent = [
      '.aeoi-root{max-width:1100px}',
      '.aeoi-card{background:var(--surface-0,#fff);border:1px solid var(--border-1,#e5e7eb);border-radius:10px;padding:18px;margin-bottom:16px}',
      '.aeoi-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.aeoi-table-wrap{overflow-x:auto;border-radius:8px;border:1px solid var(--border-1,#e5e7eb)}',
      '.aeoi-table-wrap table{border-radius:8px;overflow:hidden}',
      '@media(max-width:640px){.aeoi-grid2{grid-template-columns:1fr}}',
    ].join('');
    document.head.appendChild(style);
  }

})();
