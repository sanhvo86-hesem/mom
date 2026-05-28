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
    activeSection: 'connection',
    saving: false,
    loadingAllowlist: false,
  };

  /* ── Section tab labels ──────────────────────────────────────────────── */
  var SECTIONS = [
    { id:'connection',   label:'Kết nối M365',       icon:'🔗' },
    { id:'mailboxes',    label:'Mailbox & Folder',    icon:'📬' },
    { id:'allowlist',    label:'Email cho phép',      icon:'✅' },
    { id:'header_rules', label:'Header Rules',         icon:'📑' },
    { id:'templates',    label:'Template KH',          icon:'🎯' },
    { id:'workers',      label:'Worker Tokens',        icon:'🔑' },
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
    var cfg = STATE.config || {};
    var enabled = !!cfg.enabled;

    var html = '<div class="aeoi-root" style="font-size:13px;color:var(--text-1,#111)">';

    // ── Header bar
    html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">'
          + '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">'
          + '<span style="font-size:22px">📥</span>'
          + '<div><div style="font-size:15px;font-weight:700;color:var(--text-1,#111)">AI Order Intake — Tiếp Nhận Đơn Hàng Tự Động</div>'
          + '<div style="font-size:11px;color:var(--text-3,#6b7280)">Đọc email Outlook → trích xuất SO/WO/PO/part number → tạo đơn hàng tự động</div>'
          + '</div></div>'
          + '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">'
          + '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;'
          + (enabled ? 'background:var(--green-bg,#d1fae5);color:var(--green-1,#065f46)' : 'background:var(--surface-2,#f3f4f6);color:var(--text-3,#6b7280)')
          + '">' + (enabled ? '● Đang hoạt động' : '○ Đã tắt') + '</span>'
          + '<button onclick="aeoi.triggerPoll()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none" title="Kích hoạt quét email thủ công">▶ Chạy ngay</button>'
          + '<button onclick="aeoi.openTestParse()" class="hm-btn hm-btn-sm" style="background:var(--surface-2,#f3f4f6);color:var(--text-1,#111)" title="Kiểm tra phân tích email mẫu">🧪 Test phân tích</button>'
          + '</div>'
          + '</div>';

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
      case 'connection':   return _sectionConnection();
      case 'mailboxes':    return _sectionMailboxes();
      case 'allowlist':    return _sectionAllowlist();
      case 'header_rules': return _sectionHeaderRules();
      case 'templates':    return _sectionTemplates();
      case 'workers':      return _sectionWorkers();
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

  /* ── 1. Kết nối M365 ─────────────────────────────────────────────────── */
  function _sectionConnection(){
    var cfg = STATE.config || {};
    return '<div class="aeoi-card">'
      + _cardHead('🔗 Kết nối Microsoft 365 (Outlook)', 'Thông tin xác thực Graph API để đọc shared mailbox')
      + '<div class="aeoi-grid2">'
      + _field('M365 Tenant ID', 'aeoi-tenant-id', cfg.m365_tenant_id||'', 'Tenant ID của organisation trong Azure AD', 'text')
      + _field('Client ID (App ID)', 'aeoi-client-id', cfg.m365_client_id||'', 'App registration client_id trong Azure', 'text')
      + _fieldPw('Client Secret', 'aeoi-client-secret', cfg.secret_configured ? '(đã lưu — nhập mới để đổi)' : '', 'Client secret của App registration. Được mã hóa AES-256 khi lưu.')
      + _field('Shared Mailbox', 'aeoi-mailbox', cfg.intake_mailbox||'', 'VD: orders@hesemeng.com — tất cả email vào hộp thư này sẽ được xử lý', 'email')
      + '</div>'
      + '<div class="aeoi-grid2" style="margin-top:10px">'
      + _fieldNum('Chu kỳ quét (phút)', 'aeoi-poll-interval', cfg.poll_interval_minutes||120, 'Mặc định 120 phút (2 tiếng). Min 15, max 1440.', 15, 1440)
      + _fieldSelect('Phạm vi trích xuất', 'aeoi-extraction-scope', [['both','Email + Đính kèm'],['body','Chỉ nội dung email'],['attachments','Chỉ file đính kèm']], cfg.extraction_scope||'both')
      + '</div>'
      + '<div style="margin-top:10px">'
      + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">'
      + '<input type="checkbox" id="aeoi-enabled" ' + (cfg.enabled ? 'checked' : '') + ' style="width:16px;height:16px"> '
      + '<span><b>Bật module AI Order Intake</b> — khi bật, cron job sẽ tự động quét mailbox theo chu kỳ đã cấu hình</span>'
      + '</label></div>'
      + '<div style="margin-top:12px">'
      + '<label style="font-size:12px;font-weight:600;color:var(--text-2,#374151);display:block;margin-bottom:6px">Loại file đính kèm được phép</label>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap">'
      + ['pdf','xlsx','docx','csv','eml'].map(function(t){
          var chk = (cfg.allowed_attachment_types||[]).indexOf(t)>=0;
          return '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px"><input type="checkbox" class="aeoi-att-type" data-type="' + t + '" ' + (chk?'checked':'') + '> ' + t.toUpperCase() + '</label>';
        }).join('')
      + '</div></div>'
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
      + _cardHead('⚙️ Cơ chế xử lý & vận hành', 'Kiểm soát cách AI tạo đơn hàng từ email đã trích xuất')
      + '<div class="aeoi-grid2">'

      + _fieldSelect('Chế độ tạo đơn hàng', 'aeoi-auto-create-mode',
          [['draft','Draft — tạo SO ở trạng thái nháp, cần xác nhận thủ công'],
           ['confirmed','Confirmed — tạo SO đã xác nhận ngay lập tức'],
           ['review_queue','Review queue — không tạo, chờ admin duyệt']],
          cfg.auto_create_mode||'draft')

      + _fieldNum('Ngưỡng tin cậy AI (0.00–1.00)', 'aeoi-confidence', cfg.confidence_threshold||0.95,
          'Độ tin cậy tối thiểu để tạo draft order. Dưới ngưỡng → review_queue.', 0, 1, 0.05)

      + _fieldSelect('Khớp part number', 'aeoi-part-match',
          [['exact','Exact — phải khớp chính xác với items table'],
           ['fuzzy','Fuzzy — cho phép gần đúng (Levenshtein ≤2)'],
           ['review_if_no_match','Review nếu không khớp — tạo SO nhưng đánh dấu cần xem lại']],
          cfg.part_match_mode||'exact')

      + _fieldSelect('Xử lý trường thiếu', 'aeoi-missing-field',
          [['block','Block — không tạo SO nếu thiếu trường bắt buộc'],
           ['flag','Flag — tạo SO nhưng đánh dấu cần bổ sung'],
           ['create_with_blanks','Tạo với trường trống — điền sau']],
          cfg.missing_field_action||'flag')

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
    var html = '<div class="aeoi-card">'
      + _cardHead('📬 Mailbox & Folder', 'Danh sách mailbox/folder AI worker được phép đọc. Worker chỉ scan các row enabled bên dưới.')
      + '<div style="display:flex;gap:8px;margin-bottom:10px">'
      + '<button onclick="aeoi.openMailboxForm()" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;border:none">+ Thêm Mailbox</button>'
      + '<button onclick="aeoi.loadMailboxes()" class="hm-btn hm-btn-sm">🔄 Tải lại</button>'
      + '</div>';
    if(rows.length===0){
      html += '<div class="hm-empty">Chưa có mailbox nào. Bấm "Thêm Mailbox" để cấu hình.</div>';
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
          + '<td><span style="font-size:10px;padding:1px 6px;background:var(--surface-2,#f3f4f6);border-radius:4px">' + escHtml(m.provider) + '</span></td>'
          + '<td style="font-family:monospace;font-size:11px">' + escHtml(m.folder_path) + '</td>'
          + '<td>' + (m.read_body ? '✓' : '—') + '</td>'
          + '<td>' + (m.read_attachments ? '✓' : '—') + '</td>'
          + '<td>' + active + '</td>'
          + '<td style="font-size:11px;color:var(--text-3,#6b7280)">' + fmtDt(m.last_scan_at) + (m.last_status ? '<br>'+escHtml(m.last_status) : '') + '</td>'
          + '<td style="white-space:nowrap">'
          + '<button onclick="aeoi.openMailboxForm('+m.id+')" class="hm-btn hm-btn-xs" title="Sửa">✏</button> '
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
    var html = '<div class="aeoi-card">'
      + _cardHead('📦 Intake Cases', 'Các case đã tạo từ AI. Tab "AI Intake Queue" trong M2-Orders module là nơi sales/planning xử lý chi tiết. Đây là view tổng quát của admin.')
      + '<div style="display:flex;gap:8px;margin-bottom:10px">'
      + '<button onclick="aeoi.loadCases(0)" class="hm-btn hm-btn-sm">🔄 Tải lại</button>'
      + '<a href="?module=M2-orders&tab=ai-intake-queue" class="hm-btn hm-btn-sm" style="background:var(--brand-primary,#2563eb);color:#fff;text-decoration:none">Mở Intake Queue đầy đủ →</a>'
      + '</div>';
    if(data.items.length===0){
      html += '<div class="hm-empty">Chưa có case nào.</div>';
    } else {
      html += '<div class="aeoi-table-wrap"><table class="aeoi-table"><thead><tr>'
        + '<th>#</th><th>Intake</th><th>Trạng thái</th><th>Khách</th><th>PO khách</th><th>Confidence</th><th>Tạo lúc</th>'
        + '</tr></thead><tbody>';
      data.items.forEach(function(c,i){
        html += '<tr>'
          + '<td>'+(data.offset+i+1)+'</td>'
          + '<td style="font-family:monospace;font-weight:600">' + escHtml(c.intake_no) + '</td>'
          + '<td><span style="font-size:10px;padding:1px 6px;background:var(--surface-2,#f3f4f6);border-radius:4px">' + escHtml(c.status) + '</span></td>'
          + '<td>' + escHtml(c.customer_id||'—') + '</td>'
          + '<td style="font-family:monospace">' + escHtml(c.customer_po_number||'—') + '</td>'
          + '<td style="text-align:right">' + (c.overall_confidence!=null ? Number(c.overall_confidence).toFixed(2) : '—') + '</td>'
          + '<td style="font-size:11px">' + fmtDt(c.created_at) + '</td>'
          + '</tr>';
      });
      html += '</tbody></table></div>';
      html += _pager(data.offset, 50, data.total, 'aeoi.loadCases');
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
      // Lazy-load each section's data
      if(id==='mailboxes'    && !STATE.mailboxes)    aeoi.loadMailboxes();
      if(id==='header_rules' && !STATE.headerRules)  aeoi.loadHeaderRules();
      if(id==='templates'    && !STATE.templates)    aeoi.loadTemplates();
      if(id==='workers'      && !STATE.workerTokens) aeoi.loadWorkers();
      if(id==='cases'        && !STATE.cases)        aeoi.loadCases(0);
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

    /* Test parse */
    /* Navigate from admin AEOI to the M2-orders ai-intake-queue tab.
     * The portal uses navigateTo(page) for module routing; a plain
     * <a href> with ?module= bypasses the SPA router and forces a
     * full page reload, which drops the auth session and bounces the
     * user back to login. Use the JS API instead. */
    openOrdersAiQueue: function(){
      try {
        if (typeof window.navigateTo === 'function') {
          // template-demo page hosts the M2-orders module
          window.navigateTo('template-demo');
          // Defer tab activation a tick so the module schema mounts first.
          setTimeout(function(){
            if (window.HmModuleRouter && typeof window.HmModuleRouter.setActiveTab === 'function') {
              window.HmModuleRouter.setActiveTab('ai-intake-queue');
            }
          }, 300);
          return;
        }
      } catch(e) { /* fall through */ }
      // Last-resort fallback: open in a new tab so we don't kill the
      // current session in the active tab.
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
    openMailboxForm: function(id){
      var existing = id ? (STATE.mailboxes||[]).find(function(m){return m.id===id;}) : null;
      var addr   = prompt('Mailbox address (vd: orders@hesemeng.com):', existing ? existing.mailbox_address : '');
      if(addr==null) return;
      var folder = prompt('Folder path (vd: Inbox/AI-Order-Intake):', existing ? existing.folder_path : 'Inbox/AI-Order-Intake');
      if(folder==null) return;
      var provider = prompt('Provider (outlook_local | microsoft_graph | manual_upload):', existing ? existing.provider : 'outlook_local');
      if(provider==null) return;
      var payload = {
        mailbox_address: addr, folder_path: folder, provider: provider,
        enabled: true, read_body: true, read_attachments: true,
      };
      if(id){ payload.id = id; }
      var action = id ? 'admin_email_intake_mailbox_update' : 'admin_email_intake_mailbox_create';
      apiCall(action, payload, function(res){
        if(res.ok) aeoi.loadMailboxes();
        else alert('Lỗi: ' + (res.error||''));
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
    openWorkerForm: function(){
      var workerId = prompt('Worker ID (vd: AIW-LOCAL-001):', '');
      if(!workerId) return;
      var workerName = prompt('Worker name (mô tả ngắn):', '');
      if(workerName===null) return;
      apiCall('admin_email_intake_worker_token_create', {
        worker_id: workerId, worker_name: workerName, enabled: true,
      }, function(res){
        if(!res.ok){ alert('Lỗi: ' + (res.error||'')); return; }
        // Show raw secret ONCE
        alert('Token created!\n\nWorker ID: ' + res.token.worker_id +
              '\n\nRAW SECRET (lưu ngay, sẽ không xem lại được):\n\n' + res.raw_secret +
              '\n\nSecret notice: ' + (res.secret_notice||''));
        aeoi.loadWorkers();
      });
    },
    rotateWorker: function(id){
      if(!confirm('Rotate secret? Worker hiện tại sẽ KHÔNG dùng được cho đến khi cập nhật secret file.')) return;
      apiCall('admin_email_intake_worker_token_rotate', {id:id}, function(res){
        if(!res.ok){ alert('Lỗi: ' + (res.error||'')); return; }
        alert('Token rotated!\n\nNEW SECRET (lưu ngay):\n\n' + res.raw_secret);
        aeoi.loadWorkers();
      });
    },
    toggleWorker: function(id, enable){
      var action = enable ? 'admin_email_intake_worker_token_enable' : 'admin_email_intake_worker_token_disable';
      apiCall(action, {id:id}, function(res){
        if(res.ok) aeoi.loadWorkers();
        else alert('Lỗi: ' + (res.error||''));
      });
    },

    loadCases: function(offset){
      // The case_list endpoint reads limit/offset from $_GET query string.
      // The apiCall shim doesn't append query params for GET, so we use
      // the raw window.apiCall (Promise) with the action including the
      // pagination — server-side AdminController routes parse the action
      // before the '?' anyway.
      offset = offset || 0;
      if(typeof window.apiCall === 'function'){
        window.apiCall('ai_order_intake_case_list&limit=50&offset=' + offset, null, 'GET')
          .then(function(res){
            if(res && res.ok){
              STATE.cases = {items:res.cases||[], total:res.total||0, offset:offset};
            }
            _refreshSection();
          }).catch(function(err){
            STATE.cases = {items:[], total:0, offset:0};
            _refreshSection();
          });
      }
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
