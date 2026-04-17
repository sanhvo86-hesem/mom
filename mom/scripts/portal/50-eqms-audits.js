/**
 * EQMS Audit Management — Worklist/Calendar + Object Page
 * HESEM MOM Portal · 50-eqms-audits.js
 *
 * Authority: ISO 9001 §9.2, AS9100D §9.2, IATF 16949 §9.2
 * Workflow:  planned → scheduled → in_progress → report_issued → response_pending → closed | cancelled
 * Screens:  Calendar, Worklist, Detail (8 tabs), Create Wizard, Analytics
 *
 * @since 4.0.0
 */
(function() {
  'use strict';

  var ui   = window.EqmsShell.ui;
  var util = window.EqmsShell.util;
  var T    = util.T, esc = util.esc, fmt = util.fmt, fmtDate = util.fmtDate;
  var fmtDateTime = util.fmtDateTime, slugify = util.slugify;

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var MOD = {
    id:    'audits',
    label: { vi: 'Quản lý đánh giá', en: 'Audit Management' },
    icon:  '\uD83D\uDD0D'
  };

  var API_BASE = 'api/v1/eqms/audits';

  var STATES = ['planned', 'scheduled', 'in_progress', 'report_issued', 'response_pending', 'closed', 'cancelled'];

  var STATUS_LABELS = {
    planned:            { vi: 'Kế hoạch',          en: 'Planned' },
    scheduled:          { vi: 'Đã lên lịch',       en: 'Scheduled' },
    in_progress:        { vi: 'Đang thực hiện',    en: 'In Progress' },
    report_issued:      { vi: 'Đã phát hành BC',   en: 'Report Issued' },
    response_pending:   { vi: 'Chờ phản hồi',      en: 'Response Pending' },
    closed:             { vi: 'Đã đóng',            en: 'Closed' },
    cancelled:          { vi: 'Đã huỷ',             en: 'Cancelled' }
  };

  var AUDIT_TYPES = [
    { value: 'internal',   label: { vi: 'Nội bộ',     en: 'Internal' },   color: '#3b82f6' },
    { value: 'external',   label: { vi: 'Bên ngoài',  en: 'External' },   color: '#22c55e' },
    { value: 'supplier',   label: { vi: 'Nhà cung cấp', en: 'Supplier' }, color: '#f97316' },
    { value: 'regulatory', label: { vi: 'Pháp quy',   en: 'Regulatory' }, color: '#ef4444' }
  ];

  var AUDIT_TYPE_COLORS = {};
  AUDIT_TYPES.forEach(function(t) { AUDIT_TYPE_COLORS[t.value] = t.color; });

  var STANDARDS = [
    { value: 'ISO 9001',        label: 'ISO 9001' },
    { value: 'AS9100D',         label: 'AS9100D' },
    { value: 'IATF 16949',     label: 'IATF 16949' },
    { value: 'ISO 13485',      label: 'ISO 13485' },
    { value: 'ISO 14001',      label: 'ISO 14001' },
    { value: 'ISO 45001',      label: 'ISO 45001' },
    { value: 'internal_sop',   label: { vi: 'SOP nội bộ', en: 'Internal SOP' } }
  ];

  var FINDING_CATEGORIES = [
    { value: 'major',       label: { vi: 'Không phù hợp lớn', en: 'Major NC' },    color: '#ef4444' },
    { value: 'minor',       label: { vi: 'Không phù hợp nhỏ', en: 'Minor NC' },    color: '#f97316' },
    { value: 'observation', label: { vi: 'Quan sát',           en: 'Observation' },  color: '#eab308' },
    { value: 'opportunity', label: { vi: 'Cơ hội cải tiến',   en: 'Opportunity for Improvement' }, color: '#3b82f6' }
  ];

  var CHECKLIST_RATINGS = [
    { value: 'conforming',  label: { vi: 'Phù hợp',     en: 'Conforming' },  color: '#22c55e' },
    { value: 'minor_nc',    label: { vi: 'NC nhỏ',       en: 'Minor NC' },    color: '#f97316' },
    { value: 'major_nc',    label: { vi: 'NC lớn',       en: 'Major NC' },    color: '#ef4444' },
    { value: 'observation', label: { vi: 'Quan sát',     en: 'Observation' },  color: '#eab308' },
    { value: 'na',          label: { vi: 'N/A',          en: 'N/A' },          color: '#94a3b8' }
  ];

  var DETAIL_TABS = [
    { id: 'summary',      label: { vi: 'Tổng quan',            en: 'Summary' } },
    { id: 'checklist',    label: { vi: 'Checklist',             en: 'Checklist Execution' } },
    { id: 'findings',     label: { vi: 'Phát hiện',             en: 'Findings' } },
    { id: 'response',     label: { vi: 'Theo dõi phản hồi',    en: 'Response Tracking' } },
    { id: 'report',       label: { vi: 'Báo cáo',              en: 'Audit Report' } },
    { id: 'related',      label: { vi: 'Liên kết',              en: 'Related Records' } },
    { id: 'closure',      label: { vi: 'Tổng kết đóng',        en: 'Closure Dashboard' } },
    { id: 'audit-trail',  label: { vi: 'Nhật ký',               en: 'Audit Trail' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Loại đánh giá',      en: 'Audit Type' } },
    { label: { vi: 'Phạm vi & Tiêu chuẩn', en: 'Scope & Standard' } },
    { label: { vi: 'Đoàn đánh giá',       en: 'Audit Team' } },
    { label: { vi: 'Lịch trình',           en: 'Schedule' } },
    { label: { vi: 'Checklist',             en: 'Checklist Selection' } }
  ];

  var DAY_NAMES = {
    vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };

  var MONTH_NAMES = {
    vi: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December']
  };

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: 'worklist',    // calendar | worklist | detail | create | analytics
    // List
    filters: {},
    sortKey: 'planned_date',
    sortDir: 'asc',
    items: [],
    pagination: { total: 0, offset: 0, limit: 25 },
    metrics: null,
    // Calendar
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    // Detail
    recordId: null,
    record: null,
    activeTab: 'summary',
    auditEvents: [],
    comments: [],
    attachments: [],
    signatures: [],
    relationships: [],
    checklistItems: [],
    findings: [],
    // Create wizard
    wizardStep: 0,
    wizardData: {},
    // General
    loading: false,
    error: null
  };

  // =========================================================================
  // API HELPERS
  // =========================================================================
  function api(path, payload, method, timeout) {
    method = method || 'POST';
    timeout = timeout || 30000;
    var url = API_BASE + (path ? '/' + path : '');
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    return fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.csrfToken || '' },
      credentials: 'include',
      body: method !== 'GET' ? JSON.stringify(payload || {}) : undefined,
      signal: controller.signal
    }).then(function(r) {
      clearTimeout(timer);
      return r.json().then(function(data) {
        return util.normalizeApiResponse ? util.normalizeApiResponse(data, r.status) : data;
      });
    })
      .catch(function(err) { clearTimeout(timer); if (err.name === 'AbortError') return { ok: false, error: 'timeout' }; throw err; });
  }

  function apiGet(path, timeout) {
    timeout = timeout || 30000;
    var url = API_BASE + '/' + path;
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    return fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.csrfToken || '' },
      credentials: 'include',
      signal: controller.signal
    }).then(function(r) {
      clearTimeout(timer);
      return r.json().then(function(data) {
        return util.normalizeApiResponse ? util.normalizeApiResponse(data, r.status) : data;
      });
    })
      .catch(function(err) { clearTimeout(timer); if (err.name === 'AbortError') return { ok: false, error: 'timeout' }; throw err; });
  }

  // =========================================================================
  // DATA LOADERS
  // =========================================================================
  function loadWorklist(container) {
    state.loading = true;
    renderInto(container);

    api('query', {
      filters: state.filters,
      sort_by: state.sortKey,
      sort_dir: state.sortDir,
      offset: state.pagination.offset,
      limit: state.pagination.limit
    }).then(function(res) {
      state.loading = false;
      if (res.ok) {
        state.items = res.audits || res.data || [];
        state.pagination.total = res.total || 0;
      } else {
        state.error = res.error || 'load_failed';
      }
      renderInto(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  function loadCalendar(container) {
    state.loading = true;
    renderInto(container);

    // Fetch all audits for the visible month range
    var startDate = new Date(state.calYear, state.calMonth, 1);
    var endDate = new Date(state.calYear, state.calMonth + 1, 0);

    api('query', {
      filters: {},
      sort_by: 'planned_date',
      sort_dir: 'asc',
      offset: 0,
      limit: 200
    }).then(function(res) {
      state.loading = false;
      if (res.ok) {
        state.items = res.audits || res.data || [];
      } else {
        state.error = res.error || 'load_failed';
      }
      renderInto(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  function loadDetail(container, id) {
    state.loading = true;
    state.recordId = id;
    renderInto(container);

    Promise.all([
      apiGet(id),
      apiGet(id + '/audit'),
      apiGet(id + '/comments'),
      apiGet(id + '/attachments'),
      apiGet(id + '/signatures'),
      api(id + '/checklists/query', { offset: 0, limit: 200 }),
      api(id + '/findings/query', { offset: 0, limit: 200 })
    ]).then(function(results) {
      state.loading = false;
      var detail = results[0];
      if (detail.ok) {
        state.record = detail.audit || detail.data || {};
        state.record.status_label = T(STATUS_LABELS[state.record.status] || {});
      } else {
        state.error = detail.error || 'load_failed';
      }
      state.auditEvents    = (results[1].ok ? results[1].events || results[1].data : []) || [];
      state.comments       = (results[2].ok ? results[2].comments || results[2].data : []) || [];
      state.attachments    = (results[3].ok ? results[3].attachments || results[3].data : []) || [];
      state.signatures     = (results[4].ok ? results[4].signatures || results[4].data : []) || [];
      state.checklistItems = (results[5].ok ? results[5].checklist_items || results[5].data : []) || [];
      state.findings       = (results[6].ok ? results[6].findings || results[6].data : []) || [];
      // Load relationships separately (no special endpoint in current routes, using generic pattern)
      state.relationships  = [];

      renderInto(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  function loadMetrics(container) {
    state.loading = true;
    renderInto(container);

    apiGet('metrics').then(function(res) {
      state.loading = false;
      if (res.ok) {
        state.metrics = res.metrics || {};
      } else {
        state.error = res.error || 'metrics_failed';
      }
      renderInto(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  function tryParseJson(val) {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch(e) { return null; }
  }

  // =========================================================================
  // ACTION HANDLERS
  // =========================================================================
  function getAvailableActions(status) {
    var map = {
      planned:          [
        { action: 'schedule', label: { vi: 'Lên lịch', en: 'Schedule' }, style: 'primary' },
        { action: 'cancel',   label: { vi: 'Huỷ', en: 'Cancel' }, style: 'ghost' }
      ],
      scheduled:        [
        { action: 'start', label: { vi: 'Bắt đầu', en: 'Start Audit' }, style: 'primary' },
        { action: 'cancel', label: { vi: 'Huỷ', en: 'Cancel' }, style: 'ghost' }
      ],
      in_progress:      [
        { action: 'record-finding', label: { vi: 'Ghi nhận phát hiện', en: 'Record Finding' }, style: 'secondary' },
        { action: 'issue-report',   label: { vi: 'Phát hành BC', en: 'Issue Report' }, style: 'primary' }
      ],
      report_issued:    [
        { action: 'assign-response', label: { vi: 'Phân công phản hồi', en: 'Assign Response' }, style: 'secondary' },
        { action: 'close-finding',   label: { vi: 'Đóng phát hiện', en: 'Close Finding' }, style: 'secondary' },
        { action: 'close-audit',     label: { vi: 'Đóng đánh giá', en: 'Close Audit' }, style: 'primary' }
      ],
      response_pending: [
        { action: 'close-finding',   label: { vi: 'Đóng phát hiện', en: 'Close Finding' }, style: 'secondary' },
        { action: 'assign-response', label: { vi: 'Phân công phản hồi', en: 'Assign Response' }, style: 'secondary' },
        { action: 'close-audit',     label: { vi: 'Đóng đánh giá', en: 'Close Audit' }, style: 'primary' }
      ]
    };
    return map[status] || [];
  }

  function executeAction(container, actionKey) {
    if (!state.record) return;
    var id = state.recordId;
    var version = state.record.version;

    api(id + '/actions/' + actionKey, { version: version }).then(function(res) {
      if (res.ok) {
        loadDetail(container, id);
      } else {
        alert(T({ vi: 'Lỗi: ', en: 'Error: ' }) + (res.error || 'action_failed'));
      }
    }).catch(function() {
      alert(T({ vi: 'Lỗi kết nối', en: 'Connection error' }));
    });
  }

  // =========================================================================
  // RENDER: CALENDAR SCREEN
  // =========================================================================
  function renderCalendar() {
    var html = '';
    var lang = util.lang();

    // Header
    html += '<div class="eqms-screen-header">';
    html += '<h2>' + T({ vi: 'Lịch đánh giá', en: 'Audit Calendar' }) + '</h2>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="eqms-btn ghost sm" data-action="go-worklist">' + T({ vi: 'Danh sách', en: 'Worklist' }) + '</button>';
    html += '<button class="eqms-btn secondary sm" data-action="go-analytics">' + T({ vi: 'Phân tích', en: 'Analytics' }) + '</button>';
    html += '<button class="eqms-btn primary sm" data-action="go-create">+ ' + T({ vi: 'Tạo đánh giá', en: 'New Audit' }) + '</button>';
    html += '</div></div>';

    // Month navigation
    html += '<div class="eqms-calendar-nav" style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
    html += '<button class="eqms-btn ghost sm" data-action="cal-prev">\u2039</button>';
    html += '<span style="font-size:16px;font-weight:600">' +
      esc(MONTH_NAMES[lang][state.calMonth]) + ' ' + state.calYear +
      '</span>';
    html += '<button class="eqms-btn ghost sm" data-action="cal-next">\u203A</button>';
    html += '<button class="eqms-btn ghost sm" data-action="cal-today">' + T({ vi: 'Hôm nay', en: 'Today' }) + '</button>';
    html += '</div>';

    // Type legend
    html += '<div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">';
    AUDIT_TYPES.forEach(function(t) {
      html += '<span style="display:flex;align-items:center;gap:4px;font-size:12px">';
      html += '<span style="width:10px;height:10px;border-radius:50%;background:' + t.color + ';display:inline-block"></span>';
      html += esc(T(t.label));
      html += '</span>';
    });
    html += '</div>';

    // Calendar grid
    var year = state.calYear;
    var month = state.calMonth;
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    // Build audit lookup by date
    var auditsByDate = {};
    (state.items || []).forEach(function(a) {
      var d = a.planned_date || a.actual_start;
      if (!d) return;
      var dateKey = d.substring(0, 10);
      if (!auditsByDate[dateKey]) auditsByDate[dateKey] = [];
      auditsByDate[dateKey].push(a);
    });

    html += '<table class="eqms-calendar-grid" style="width:100%;border-collapse:collapse;table-layout:fixed">';
    html += '<thead><tr>';
    DAY_NAMES[lang].forEach(function(d) {
      html += '<th style="padding:8px 4px;text-align:center;font-size:12px;font-weight:600;color:var(--hm-text-secondary,#64748b);border-bottom:1px solid var(--hm-border,#e2e8f0)">' + esc(d) + '</th>';
    });
    html += '</tr></thead><tbody>';

    var cellDay = 1;
    var started = false;
    for (var w = 0; w < 6; w++) {
      if (cellDay > daysInMonth) break;
      html += '<tr>';
      for (var d = 0; d < 7; d++) {
        if (!started && d < firstDay) {
          html += '<td style="padding:4px;vertical-align:top;height:90px;border:1px solid var(--hm-border,#e2e8f0);background:var(--hm-bg-secondary,#f8fafc)"></td>';
          continue;
        }
        started = true;
        if (cellDay > daysInMonth) {
          html += '<td style="padding:4px;vertical-align:top;height:90px;border:1px solid var(--hm-border,#e2e8f0);background:var(--hm-bg-secondary,#f8fafc)"></td>';
          continue;
        }

        var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(cellDay).padStart(2, '0');
        var isToday = dateStr === todayStr;
        var auditsOnDay = auditsByDate[dateStr] || [];
        var overdue = auditsOnDay.some(function(a) {
          return (a.status === 'planned' || a.status === 'scheduled') && dateStr < todayStr;
        });

        html += '<td style="padding:4px;vertical-align:top;height:90px;border:1px solid var(--hm-border,#e2e8f0);cursor:pointer" data-action="cal-day" data-date="' + dateStr + '">';
        html += '<div style="font-size:12px;font-weight:' + (isToday ? '700' : '500') + ';margin-bottom:2px;' +
          (isToday ? 'color:var(--hm-accent,#3b82f6);background:var(--hm-accent,#3b82f6);color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center' : '') +
          '">' + cellDay + '</div>';

        if (overdue) {
          html += '<div style="font-size:9px;color:#ef4444;font-weight:600;margin-bottom:1px">' + T({ vi: 'Quá hạn', en: 'OVERDUE' }) + '</div>';
        }

        auditsOnDay.slice(0, 3).forEach(function(a) {
          var color = AUDIT_TYPE_COLORS[a.audit_type] || '#94a3b8';
          html += '<div class="eqms-cal-event" style="font-size:10px;line-height:1.3;padding:1px 4px;margin-bottom:1px;border-radius:3px;background:' + color + '20;border-left:2px solid ' + color + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer" data-action="open-audit" data-id="' + esc(a.audit_id || '') + '">';
          html += esc(a.audit_number || '') + ' ' + esc((a.scope || '').substring(0, 20));
          html += '</div>';
        });
        if (auditsOnDay.length > 3) {
          html += '<div style="font-size:10px;color:var(--hm-text-tertiary,#94a3b8)">+' + (auditsOnDay.length - 3) + ' ' + T({ vi: 'thêm', en: 'more' }) + '</div>';
        }

        html += '</td>';
        cellDay++;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    return html;
  }

  // =========================================================================
  // RENDER: WORKLIST SCREEN
  // =========================================================================
  function renderWorklist() {
    var html = '';

    // Header
    html += '<div class="eqms-screen-header">';
    html += '<h2>' + T({ vi: 'Danh sách đánh giá', en: 'Audit Worklist' }) + '</h2>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="eqms-btn ghost sm" data-action="go-calendar">' + T({ vi: 'Lịch', en: 'Calendar' }) + '</button>';
    html += '<button class="eqms-btn secondary sm" data-action="go-analytics">' + T({ vi: 'Phân tích', en: 'Analytics' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['excel', 'csv', 'pdf'] });
    html += '<button class="eqms-btn primary sm" data-action="go-create">+ ' + T({ vi: 'Tạo đánh giá', en: 'New Audit' }) + '</button>';
    html += '</div></div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm kiếm...', en: 'Search...' }, width: '200px' },
        { key: 'audit_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: AUDIT_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' },
          options: STATES.map(function(s) { return { value: s, label: STATUS_LABELS[s] }; })
        },
        { key: 'standard', type: 'select', label: { vi: 'Tiêu chuẩn', en: 'Standard' }, options: STANDARDS }
      ]
    });

    // Grid
    var columns = [
      { key: 'audit_number',  label: { vi: 'Mã đánh giá', en: 'Audit ID' }, type: 'id', sortable: true },
      { key: 'audit_type',    label: { vi: 'Loại', en: 'Type' }, sortable: true,
        render: function(v) {
          var color = AUDIT_TYPE_COLORS[v] || '#94a3b8';
          return '<span class="eqms-badge" style="background:' + color + '20;color:' + color + ';border:1px solid ' + color + '40">' + esc(v || '\u2014') + '</span>';
        }
      },
      { key: 'scope',         label: { vi: 'Phạm vi', en: 'Scope' }, type: 'truncate', sortable: true },
      { key: 'lead_auditor',  label: { vi: 'Trưởng đoàn', en: 'Lead Auditor' }, sortable: true },
      { key: 'status',        label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge', sortable: true },
      { key: 'planned_date',  label: { vi: 'Ngày kế hoạch', en: 'Scheduled Date' }, type: 'date', sortable: true },
      { key: 'finding_count', label: { vi: 'Phát hiện', en: 'Finding Count' }, type: 'number', sortable: false,
        render: function(v, row) {
          var count = v || 0;
          return '<span>' + fmt(count) + '</span>';
        }
      },
      { key: 'closure_rate', label: { vi: 'Tỷ lệ đóng', en: 'Closure Rate' }, sortable: false,
        render: function(v) {
          if (v == null) return '\u2014';
          var pct = parseInt(v, 10);
          var color = pct >= 80 ? '#22c55e' : (pct >= 50 ? '#f97316' : '#ef4444');
          return '<span style="color:' + color + ';font-weight:600">' + pct + '%</span>';
        }
      }
    ];

    html += ui.renderDataGrid(columns, state.items, {
      selectable: true,
      sortKey: state.sortKey,
      sortDir: state.sortDir
    });

    html += ui.renderPagination(state.pagination);
    return html;
  }

  // =========================================================================
  // RENDER: DETAIL SCREEN
  // =========================================================================
  function renderDetail() {
    var rec = state.record;
    if (!rec) return (ui.renderRichErrorState || ui.renderErrorState)(T({ vi: 'Không tìm thấy bản ghi', en: 'Record not found' }), 'retry-detail');

    var html = '';

    // Back
    html += '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="go-worklist">\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to list' }) + '</button>';
    html += '</div>';

    // Identity header
    html += ui.renderIdentityHeader(rec, {
      actions: getAvailableActions(rec.status),
      extraMeta: [
        { label: { vi: 'Loại đánh giá', en: 'Audit Type' }, value: rec.audit_type },
        { label: { vi: 'Tiêu chuẩn', en: 'Standard' }, value: rec.standard },
        { label: { vi: 'Trưởng đoàn', en: 'Lead Auditor' }, value: rec.lead_auditor },
        { label: { vi: 'Ngày kế hoạch', en: 'Planned Date' }, value: fmtDate(rec.planned_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(STATES, rec.status);

    // Tabs with badges
    var tabs = DETAIL_TABS.map(function(tab) {
      var copy = { id: tab.id, label: tab.label };
      if (tab.id === 'findings') copy.badge = state.findings.length || null;
      if (tab.id === 'checklist') copy.badge = state.checklistItems.length || null;
      return copy;
    });
    html += ui.renderTabs(tabs, state.activeTab);

    // Tab content
    html += '<div class="eqms-tab-content">';
    html += renderDetailTab();
    html += '</div>';

    return html;
  }

  function renderDetailTab() {
    switch (state.activeTab) {
      case 'summary':     return renderTabSummary();
      case 'checklist':   return renderTabChecklist();
      case 'findings':    return renderTabFindings();
      case 'response':    return renderTabResponse();
      case 'report':      return renderTabReport();
      case 'related':     return renderTabRelated();
      case 'closure':     return renderTabClosure();
      case 'audit-trail': return renderTabAuditTrail();
      default:            return '';
    }
  }

  // --- Tab: Summary ---
  function renderTabSummary() {
    var rec = state.record || {};
    var team = tryParseJson(rec.team_members) || [];

    var fields = [
      { label: { vi: 'Mã đánh giá',     en: 'Audit ID' },       value: rec.audit_number, mono: true },
      { label: { vi: 'Loại đánh giá',    en: 'Audit Type' },     value: rec.audit_type, badge: true },
      { label: { vi: 'Phạm vi',          en: 'Scope' },          value: rec.scope },
      { label: { vi: 'Tiêu chuẩn',       en: 'Standard' },       value: rec.standard },
      { label: { vi: 'Trưởng đoàn',      en: 'Lead Auditor' },   value: rec.lead_auditor },
      { label: { vi: 'Bên được đánh giá', en: 'Auditee' },       value: rec.auditee_dept },
      { label: { vi: 'Bộ phận',          en: 'Department' },      value: rec.auditee_dept },
      { label: { vi: 'Ngày kế hoạch',    en: 'Planned Date' },    value: fmtDate(rec.planned_date) },
      { label: { vi: 'Ngày thực tế bắt đầu', en: 'Actual Start' }, value: fmtDate(rec.actual_start) },
      { label: { vi: 'Ngày thực tế kết thúc', en: 'Actual End' },  value: fmtDate(rec.actual_end) },
      { label: { vi: 'Trạng thái',       en: 'Status' },          value: T(STATUS_LABELS[rec.status] || {}), badge: true }
    ];

    var html = ui.renderSection({ vi: 'Thông tin chung', en: 'General Information' }, ui.renderFieldGrid(fields));

    // Team members
    if (team.length) {
      var teamHtml = '<div class="eqms-tag-list">';
      team.forEach(function(m) {
        teamHtml += '<span class="eqms-badge">' + esc(typeof m === 'string' ? m : (m.name || m)) + '</span>';
      });
      teamHtml += '</div>';
      html += ui.renderSection({ vi: 'Thành viên đoàn đánh giá', en: 'Audit Team Members' }, teamHtml);
    }

    // Objective
    if (rec.objective) {
      html += ui.renderSection({ vi: 'Mục tiêu', en: 'Objective' },
        '<div class="eqms-field-value" style="white-space:pre-wrap">' + esc(rec.objective) + '</div>'
      );
    }

    // Criteria
    if (rec.criteria) {
      html += ui.renderSection({ vi: 'Tiêu chí', en: 'Criteria' },
        '<div class="eqms-field-value" style="white-space:pre-wrap">' + esc(rec.criteria) + '</div>'
      );
    }

    return html;
  }

  // --- Tab: Checklist Execution ---
  function renderTabChecklist() {
    var items = state.checklistItems || [];
    var total = items.length;
    var completed = items.filter(function(i) { return i.response && i.response !== ''; }).length;
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    var html = '';

    // Progress
    html += '<div style="margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px">';
    html += '<span>' + T({ vi: 'Tiến độ checklist', en: 'Checklist Progress' }) + '</span>';
    html += '<span>' + completed + ' / ' + total + ' (' + pct + '%)</span>';
    html += '</div>';
    html += '<div style="height:8px;background:var(--hm-bg-secondary,#e2e8f0);border-radius:4px;overflow:hidden">';
    html += '<div style="height:100%;width:' + pct + '%;background:var(--hm-accent,#3b82f6);border-radius:4px;transition:width 0.3s"></div>';
    html += '</div></div>';

    // Checklist table with color-coded rows
    if (!items.length) {
      html += ui.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Chưa có mục checklist', en: 'No checklist items' },
        desc: { vi: 'Checklist sẽ được tạo khi đánh giá bắt đầu', en: 'Checklist will be created when audit starts' }
      });
    } else {
      html += '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
      html += '<thead><tr>';
      html += '<th>' + T({ vi: 'Mục / Điều khoản', en: 'Clause / Requirement' }) + '</th>';
      html += '<th style="width:140px">' + T({ vi: 'Đánh giá', en: 'Rating' }) + '</th>';
      html += '<th>' + T({ vi: 'Bằng chứng', en: 'Evidence' }) + '</th>';
      html += '<th>' + T({ vi: 'Ghi chú', en: 'Notes' }) + '</th>';
      html += '</tr></thead><tbody>';

      items.forEach(function(item) {
        var ratingColor = '#f8fafc';
        var rating = (item.response || '').toLowerCase();
        CHECKLIST_RATINGS.forEach(function(r) {
          if (rating === r.value || rating === T(r.label).toLowerCase()) ratingColor = r.color + '12';
        });

        html += '<tr style="background:' + ratingColor + '">';
        html += '<td>';
        if (item.section) html += '<div style="font-size:11px;color:var(--hm-text-tertiary,#94a3b8)">' + esc(item.section) + '</div>';
        html += '<div>' + esc(item.clause_reference || item.question || '') + '</div>';
        html += '</td>';
        html += '<td>';
        if (item.response) {
          var badgeColor = '';
          CHECKLIST_RATINGS.forEach(function(r) {
            if (rating === r.value) badgeColor = 'style="background:' + r.color + '20;color:' + r.color + '"';
          });
          html += '<span class="eqms-badge" ' + badgeColor + '>' + esc(item.response) + '</span>';
        } else {
          html += '<span style="color:var(--hm-text-tertiary,#94a3b8)">\u2014</span>';
        }
        html += '</td>';
        html += '<td>' + esc(item.evidence_ref || '\u2014') + '</td>';
        html += '<td>' + esc(item.notes || '\u2014') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    return html;
  }

  // --- Tab: Findings ---
  function renderTabFindings() {
    var findings = state.findings || [];
    var html = '';

    // Summary KPIs
    var majorCount = findings.filter(function(f) { return f.category === 'major'; }).length;
    var minorCount = findings.filter(function(f) { return f.category === 'minor'; }).length;
    var obsCount   = findings.filter(function(f) { return f.category === 'observation'; }).length;
    var openCount  = findings.filter(function(f) { return f.status !== 'closed'; }).length;

    html += ui.renderKpiRow([
      { label: { vi: 'NC lớn',    en: 'Major NC' },     value: majorCount, accent: 'danger' },
      { label: { vi: 'NC nhỏ',    en: 'Minor NC' },     value: minorCount, accent: 'warning' },
      { label: { vi: 'Quan sát',  en: 'Observations' }, value: obsCount },
      { label: { vi: 'Còn mở',    en: 'Open' },         value: openCount, accent: 'info' }
    ]);

    // Finding cards
    if (!findings.length) {
      html += ui.renderEmptyState({
        icon: '\uD83D\uDD0E',
        title: { vi: 'Chưa có phát hiện', en: 'No findings recorded' },
        desc: { vi: 'Phát hiện sẽ được ghi nhận trong quá trình đánh giá', en: 'Findings will be recorded during audit execution' }
      });
    } else {
      findings.forEach(function(f) {
        var catColor = '#94a3b8';
        FINDING_CATEGORIES.forEach(function(c) {
          if (c.value === f.category) catColor = c.color;
        });

        html += '<div class="eqms-section" style="border-left:4px solid ' + catColor + ';margin-bottom:12px">';
        html += '<div class="eqms-section-header" style="display:flex;justify-content:space-between;align-items:center">';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<span class="eqms-badge" style="background:' + catColor + '20;color:' + catColor + '">' + esc(f.category || '') + '</span>';
        html += '<span style="font-weight:600">' + esc(f.finding_number || '') + '</span>';
        html += '</div>';
        html += '<span class="eqms-badge ' + slugify(f.status || '') + '">' + esc(f.status || 'open') + '</span>';
        html += '</div>';
        html += '<div class="eqms-section-body">';
        html += '<div style="margin-bottom:8px">' + esc(f.description || '') + '</div>';
        if (f.clause_reference) {
          html += '<div style="font-size:12px;color:var(--hm-text-secondary,#64748b)">';
          html += T({ vi: 'Điều khoản: ', en: 'Clause: ' }) + esc(f.clause_reference);
          html += '</div>';
        }
        if (f.evidence) {
          html += '<div style="font-size:12px;color:var(--hm-text-secondary,#64748b);margin-top:4px">';
          html += T({ vi: 'Bằng chứng: ', en: 'Evidence: ' }) + esc(f.evidence);
          html += '</div>';
        }
        if (f.response_required_by) {
          html += '<div style="font-size:12px;margin-top:4px">';
          html += T({ vi: 'Hạn phản hồi: ', en: 'Response due: ' }) + esc(fmtDate(f.response_required_by));
          html += '</div>';
        }
        html += '</div></div>';
      });
    }

    // Add finding button
    if (state.record && (state.record.status === 'in_progress' || state.record.status === 'report_issued')) {
      html += '<button class="eqms-btn secondary sm" data-action="record-finding" style="margin-top:12px">+ ' +
        T({ vi: 'Ghi nhận phát hiện', en: 'Add Finding' }) + '</button>';
    }

    return html;
  }

  // --- Tab: Response Tracking ---
  function renderTabResponse() {
    var findings = state.findings || [];
    var columns = [
      { key: 'finding_number', label: { vi: 'Mã phát hiện', en: 'Finding ID' }, type: 'id', sortable: false },
      { key: 'description',    label: { vi: 'Phát hiện', en: 'Finding' }, type: 'truncate', sortable: false },
      { key: 'category',       label: { vi: 'Mức độ', en: 'Severity' }, sortable: false,
        render: function(v) {
          var color = '#94a3b8';
          FINDING_CATEGORIES.forEach(function(c) { if (c.value === v) color = c.color; });
          return '<span class="eqms-badge" style="background:' + color + '20;color:' + color + '">' + esc(v || '\u2014') + '</span>';
        }
      },
      { key: 'response_by',         label: { vi: 'Phân công', en: 'Assigned To' }, sortable: false },
      { key: 'response_required_by', label: { vi: 'Hạn', en: 'Due Date' }, type: 'date', sortable: false },
      { key: 'status',              label: { vi: 'Trạng thái phản hồi', en: 'Response Status' }, type: 'badge', sortable: false },
      { key: 'closed_at',           label: { vi: 'Ngày xác nhận', en: 'Verification Date' }, type: 'date', sortable: false }
    ];

    return ui.renderSection({ vi: 'Theo dõi phản hồi phát hiện', en: 'Finding Response Pipeline' },
      ui.renderDataGrid(columns, findings, { selectable: false })
    );
  }

  // --- Tab: Audit Report ---
  function renderTabReport() {
    var rec = state.record || {};
    var html = '';

    html += ui.renderSection({ vi: 'Trạng thái báo cáo', en: 'Report Status' }, ui.renderFieldGrid([
      { label: { vi: 'Tham chiếu BC', en: 'Report Reference' }, value: rec.audit_report_ref, mono: true },
      { label: { vi: 'Trạng thái', en: 'Status' }, value: rec.status === 'report_issued' || rec.status === 'response_pending' || rec.status === 'closed'
        ? T({ vi: 'Đã phát hành', en: 'Issued' })
        : T({ vi: 'Chưa phát hành', en: 'Not Issued' }),
        badge: true
      },
      { label: { vi: 'Ngày phát hành', en: 'Issue Date' }, value: fmtDate(rec.report_issued_at) }
    ]));

    // Export actions
    html += ui.renderSection({ vi: 'Xuất báo cáo', en: 'Export Report' },
      '<div style="display:flex;gap:8px">' +
      '<button class="eqms-btn secondary sm" data-action="export" data-format="pdf">\uD83D\uDCD5 PDF</button>' +
      '<button class="eqms-btn secondary sm" data-action="export" data-format="excel">\uD83D\uDCCA Excel</button>' +
      '<button class="eqms-btn secondary sm" data-action="export" data-format="controlled">\uD83D\uDD12 ' + T({ vi: 'Bản kiểm soát', en: 'Controlled Copy' }) + '</button>' +
      '</div>'
    );

    return html;
  }

  // --- Tab: Related Records ---
  function renderTabRelated() {
    // Build relationships from findings that generated CAPAs/NCRs
    var links = state.relationships || [];
    return ui.renderSection({ vi: 'Bản ghi liên quan', en: 'Related Records' },
      (ui.renderLinkedRecordGraph || ui.renderRelationshipsPanel)(links)
    );
  }

  // --- Tab: Closure Dashboard ---
  function renderTabClosure() {
    var findings = state.findings || [];
    var total = findings.length;
    var closed = findings.filter(function(f) { return f.status === 'closed'; }).length;
    var open = total - closed;
    var pct = total > 0 ? Math.round((closed / total) * 100) : 0;
    var majorOpen = findings.filter(function(f) { return f.category === 'major' && f.status !== 'closed'; }).length;

    var html = '';

    // KPIs
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng phát hiện', en: 'Total Findings' },  value: total },
      { label: { vi: 'Đã đóng',        en: 'Closed' },          value: closed, accent: 'success' },
      { label: { vi: 'Còn mở',         en: 'Outstanding' },     value: open, accent: open > 0 ? 'warning' : '' },
      { label: { vi: 'NC lớn còn mở',  en: 'Open Major NC' },   value: majorOpen, accent: majorOpen > 0 ? 'danger' : 'success' }
    ]);

    // Closure rate progress
    html += ui.renderSection({ vi: 'Tỷ lệ đóng', en: 'Closure Rate' }, (function() {
      var inner = '<div style="margin-bottom:8px;display:flex;justify-content:space-between">';
      inner += '<span>' + T({ vi: 'Tiến độ đóng phát hiện', en: 'Finding Closure Progress' }) + '</span>';
      inner += '<span style="font-weight:700;font-size:18px;' + (pct >= 100 ? 'color:#22c55e' : '') + '">' + pct + '%</span>';
      inner += '</div>';
      inner += '<div style="height:12px;background:var(--hm-bg-secondary,#e2e8f0);border-radius:6px;overflow:hidden">';
      var barColor = pct >= 100 ? '#22c55e' : (pct >= 70 ? '#3b82f6' : (pct >= 40 ? '#f97316' : '#ef4444'));
      inner += '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:6px;transition:width 0.3s"></div>';
      inner += '</div>';
      if (majorOpen > 0) {
        inner += '<div style="margin-top:12px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#dc2626;font-size:13px">';
        inner += '\u26A0 ' + T({ vi: 'Không thể đóng đánh giá khi còn NC lớn chưa đóng', en: 'Cannot close audit while open major findings remain' });
        inner += '</div>';
      }
      return inner;
    })());

    // Outstanding items table
    var openFindings = findings.filter(function(f) { return f.status !== 'closed'; });
    if (openFindings.length) {
      var columns = [
        { key: 'finding_number', label: { vi: 'Mã', en: 'ID' }, type: 'id', sortable: false },
        { key: 'category',       label: { vi: 'Mức độ', en: 'Severity' }, type: 'badge', sortable: false },
        { key: 'description',    label: { vi: 'Mô tả', en: 'Description' }, type: 'truncate', sortable: false },
        { key: 'status',         label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge', sortable: false },
        { key: 'response_required_by', label: { vi: 'Hạn phản hồi', en: 'Response Due' }, type: 'date', sortable: false }
      ];
      html += ui.renderSection({ vi: 'Mục còn mở', en: 'Outstanding Items' },
        ui.renderDataGrid(columns, openFindings, { selectable: false })
      );
    }

    return html;
  }

  // --- Tab: Audit Trail ---
  function renderTabAuditTrail() {
    var html = '';

    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' },
      ui.renderAuditTrail(state.auditEvents)
    );

    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Trưởng đoàn đánh giá', en: 'Lead Auditor' },
        { vi: 'Đại diện lãnh đạo', en: 'Management Representative' },
        { vi: 'Phê duyệt chất lượng', en: 'Quality Approval' }
      ])
    );

    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    );

    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );

    return html;
  }

  // =========================================================================
  // RENDER: CREATE WIZARD
  // =========================================================================
  function renderCreate() {
    var bodyHtml = '';

    switch (state.wizardStep) {
      case 0: bodyHtml = renderWizardType(); break;
      case 1: bodyHtml = renderWizardScope(); break;
      case 2: bodyHtml = renderWizardTeam(); break;
      case 3: bodyHtml = renderWizardSchedule(); break;
      case 4: bodyHtml = renderWizardChecklist(); break;
    }

    var html = '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="go-worklist">\u2190 ' + T({ vi: 'Quay lại', en: 'Back to list' }) + '</button>';
    html += '</div>';

    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, bodyHtml, { saveDraft: true });
    return html;
  }

  function renderWizardType() {
    var html = '<h3>' + T({ vi: 'Chọn loại đánh giá', en: 'Select Audit Type' }) + '</h3>';
    html += ui.renderFormField({
      key: 'audit_type', type: 'select', required: true,
      label: { vi: 'Loại đánh giá', en: 'Audit Type' },
      options: AUDIT_TYPES,
      value: state.wizardData.audit_type || ''
    });
    return html;
  }

  function renderWizardScope() {
    var html = '<h3>' + T({ vi: 'Phạm vi & Tiêu chuẩn', en: 'Scope & Standard' }) + '</h3>';
    html += ui.renderFormField({
      key: 'scope', type: 'textarea', required: true,
      label: { vi: 'Phạm vi đánh giá', en: 'Audit Scope' },
      placeholder: { vi: 'Mô tả phạm vi đánh giá...', en: 'Describe the audit scope...' },
      value: state.wizardData.scope || ''
    });
    html += ui.renderFormField({
      key: 'standard', type: 'select',
      label: { vi: 'Tiêu chuẩn áp dụng', en: 'Applicable Standard' },
      options: STANDARDS,
      value: state.wizardData.standard || ''
    });
    html += ui.renderFormField({
      key: 'auditee_dept', type: 'text',
      label: { vi: 'Bộ phận được đánh giá', en: 'Auditee Department' },
      value: state.wizardData.auditee_dept || ''
    });
    html += ui.renderFormField({
      key: 'objective', type: 'textarea',
      label: { vi: 'Mục tiêu', en: 'Objective' },
      placeholder: { vi: 'Mục tiêu đánh giá...', en: 'Audit objective...' },
      value: state.wizardData.objective || ''
    });
    html += ui.renderFormField({
      key: 'criteria', type: 'textarea',
      label: { vi: 'Tiêu chí', en: 'Audit Criteria' },
      placeholder: { vi: 'Tiêu chí đánh giá...', en: 'Audit criteria...' },
      value: state.wizardData.criteria || ''
    });
    return html;
  }

  function renderWizardTeam() {
    var html = '<h3>' + T({ vi: 'Đoàn đánh giá', en: 'Audit Team' }) + '</h3>';
    html += ui.renderFormField({
      key: 'lead_auditor', type: 'text', required: true,
      label: { vi: 'Trưởng đoàn', en: 'Lead Auditor' },
      value: state.wizardData.lead_auditor || ''
    });
    html += ui.renderFormField({
      key: 'team_members_text', type: 'textarea',
      label: { vi: 'Thành viên đoàn (mỗi người một dòng)', en: 'Team Members (one per line)' },
      placeholder: { vi: 'Nguyễn Văn A\nTrần Thị B', en: 'John Smith\nJane Doe' },
      value: state.wizardData.team_members_text || ''
    });
    return html;
  }

  function renderWizardSchedule() {
    var html = '<h3>' + T({ vi: 'Lịch trình', en: 'Schedule' }) + '</h3>';
    html += ui.renderFormField({
      key: 'planned_date', type: 'date', required: true,
      label: { vi: 'Ngày dự kiến', en: 'Planned Date' },
      value: state.wizardData.planned_date || ''
    });
    html += ui.renderFormField({
      key: 'duration_days', type: 'number',
      label: { vi: 'Thời lượng (ngày)', en: 'Duration (days)' },
      value: state.wizardData.duration_days || '',
      min: 1, max: 30
    });
    html += ui.renderFormField({
      key: 'audit_report_ref', type: 'text',
      label: { vi: 'Tham chiếu báo cáo', en: 'Report Reference' },
      placeholder: { vi: 'VD: AUD-RPT-2026-001', en: 'E.g.: AUD-RPT-2026-001' },
      value: state.wizardData.audit_report_ref || ''
    });
    return html;
  }

  function renderWizardChecklist() {
    var html = '<h3>' + T({ vi: 'Chọn Checklist', en: 'Checklist Selection' }) + '</h3>';
    html += '<p style="color:var(--hm-text-secondary,#64748b);font-size:13px;margin-bottom:16px">' +
      T({ vi: 'Checklist sẽ được tạo tự động dựa trên tiêu chuẩn và phạm vi đã chọn. Bạn có thể tuỳ chỉnh sau khi tạo.',
          en: 'Checklist will be auto-generated based on the selected standard and scope. You can customize after creation.' }) +
      '</p>';

    // Summary review
    html += ui.renderSection({ vi: 'Tóm tắt đánh giá', en: 'Audit Summary' }, (function() {
      var d = state.wizardData;
      return ui.renderFieldGrid([
        { label: { vi: 'Loại',          en: 'Type' },          value: d.audit_type, badge: true },
        { label: { vi: 'Phạm vi',       en: 'Scope' },         value: d.scope },
        { label: { vi: 'Tiêu chuẩn',    en: 'Standard' },      value: d.standard },
        { label: { vi: 'Trưởng đoàn',   en: 'Lead Auditor' },  value: d.lead_auditor },
        { label: { vi: 'Ngày dự kiến',  en: 'Planned Date' },  value: d.planned_date },
        { label: { vi: 'Bộ phận',       en: 'Department' },     value: d.auditee_dept }
      ]);
    })());

    html += ui.renderFormField({
      key: 'checklist_template', type: 'select',
      label: { vi: 'Mẫu checklist', en: 'Checklist Template' },
      options: [
        { value: 'auto',     label: { vi: 'Tự động theo tiêu chuẩn', en: 'Auto (based on standard)' } },
        { value: 'iso9001',  label: 'ISO 9001 Full Audit' },
        { value: 'as9100d',  label: 'AS9100D Compliance' },
        { value: 'process',  label: { vi: 'Đánh giá quy trình', en: 'Process Audit' } },
        { value: 'custom',   label: { vi: 'Tuỳ chỉnh', en: 'Custom' } }
      ],
      value: state.wizardData.checklist_template || 'auto'
    });

    return html;
  }

  function submitCreate(container) {
    var d = state.wizardData;
    if (!d.audit_type || !d.scope) {
      alert(T({ vi: 'Vui lòng điền đầy đủ thông tin bắt buộc', en: 'Please fill in all required fields' }));
      return;
    }

    // Parse team members from text
    var teamMembers = [];
    if (d.team_members_text) {
      teamMembers = d.team_members_text.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    }

    var payload = {
      audit_type: d.audit_type,
      scope: d.scope,
      standard: d.standard || '',
      lead_auditor: d.lead_auditor || '',
      team_members: teamMembers,
      auditee_dept: d.auditee_dept || '',
      planned_date: d.planned_date || '',
      audit_report_ref: d.audit_report_ref || ''
    };

    state.loading = true;
    renderInto(container);

    api('', payload).then(function(res) {
      state.loading = false;
      if (res.ok) {
        var audit = res.audit || res.data || {};
        var newId = audit.audit_id || '';
        state.screen = 'detail';
        state.wizardStep = 0;
        state.wizardData = {};
        if (newId) {
          loadDetail(container, newId);
        } else {
          state.screen = 'worklist';
          loadWorklist(container);
        }
      } else {
        state.error = res.error || 'create_failed';
        renderInto(container);
      }
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  // =========================================================================
  // RENDER: ANALYTICS SCREEN
  // =========================================================================
  function renderAnalytics() {
    var m = state.metrics || {};
    var html = '';

    // Header
    html += '<div class="eqms-screen-header">';
    html += '<h2>' + T({ vi: 'Phân tích đánh giá', en: 'Audit Analytics' }) + '</h2>';
    html += '<button class="eqms-btn ghost sm" data-action="go-worklist">\u2190 ' + T({ vi: 'Quay lại', en: 'Back to list' }) + '</button>';
    html += '</div>';

    // KPIs
    html += ui.renderKpiRow([
      { label: { vi: 'Đang thực hiện', en: 'In Progress' },      value: m.in_progress || 0, accent: 'info' },
      { label: { vi: 'Quá hạn kế hoạch', en: 'Overdue Planned' }, value: m.overdue_planned || 0, accent: (m.overdue_planned || 0) > 0 ? 'danger' : '' },
      { label: { vi: 'Phát hiện mở', en: 'Open Findings' },       value: m.open_findings || 0, accent: 'warning' },
      { label: { vi: 'NC lớn mở', en: 'Open Major NC' },          value: m.open_major_findings || 0, accent: (m.open_major_findings || 0) > 0 ? 'danger' : 'success' },
      { label: { vi: 'Đóng năm nay', en: 'Closed This Year' },    value: m.closed_this_year || 0, accent: 'success' }
    ]);

    // Schedule Adherence (calculated from available data)
    html += ui.renderSection({ vi: 'Tuân thủ lịch trình', en: 'Schedule Adherence' },
      '<div style="text-align:center;padding:24px;color:var(--hm-text-secondary,#64748b);font-size:13px">' +
      T({ vi: 'Biểu đồ tuân thủ lịch trình sẽ hiển thị khi có đủ dữ liệu lịch sử', en: 'Schedule adherence chart will display when sufficient historical data is available' }) +
      '</div>'
    );

    // Finding trend by type (table fallback)
    html += ui.renderSection({ vi: 'Xu hướng phát hiện theo loại', en: 'Finding Trend by Type' },
      '<div style="text-align:center;padding:24px;color:var(--hm-text-secondary,#64748b);font-size:13px">' +
      T({ vi: 'Biểu đồ xu hướng phát hiện sẽ hiển thị khi có đủ dữ liệu', en: 'Finding trend chart will display when sufficient data is available' }) +
      '</div>'
    );

    // Coverage heatmap placeholder
    html += ui.renderSection({ vi: 'Bản đồ phạm vi đánh giá theo bộ phận', en: 'Audit Coverage Heatmap by Department' },
      '<div style="text-align:center;padding:24px;color:var(--hm-text-secondary,#64748b);font-size:13px">' +
      T({ vi: 'Bản đồ nhiệt phạm vi đánh giá sẽ hiển thị khi có đủ dữ liệu', en: 'Coverage heatmap will display when sufficient data is available' }) +
      '</div>'
    );

    return html;
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  var _container = null;

  function renderInto(container) {
    if (!container) return;
    _container = container;

    if (state.loading) {
      container.innerHTML = ui.renderLoadingState({ vi: 'Đang tải dữ liệu đánh giá...', en: 'Loading audit data...' });
      return;
    }

    if (state.error && state.screen !== 'detail') {
      container.innerHTML = (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry');
      return;
    }

    var html = '';
    switch (state.screen) {
      case 'calendar':  html = renderCalendar(); break;
      case 'worklist':  html = renderWorklist(); break;
      case 'detail':    html = renderDetail(); break;
      case 'create':    html = renderCreate(); break;
      case 'analytics': html = renderAnalytics(); break;
    }

    container.innerHTML = html;
    bindEvents(container);
  }

  function render(container, context) {
    _container = container;
    context = context || {};

    // Reset
    state.error = null;

    if (context.recordId) {
      state.screen = 'detail';
      state.activeTab = 'summary';
      loadDetail(container, context.recordId);
    } else {
      state.screen = 'worklist';
      loadWorklist(container);
    }
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents(container) {
    container.addEventListener('click', function handler(e) {
      var actionEl = e.target.closest('[data-action]');
      var tabEl    = e.target.closest('[data-tab]');
      var rowEl    = e.target.closest('tr[data-id]');
      var sortEl   = e.target.closest('th[data-sort]');
      var pageEl   = e.target.closest('[data-action="page"]');
      var filterEl = e.target.closest('[data-action="apply-filters"]');
      var resetEl  = e.target.closest('[data-action="reset-filters"]');

      if (actionEl) {
        var act = actionEl.getAttribute('data-action');

        // Navigation
        if (act === 'go-worklist')  { state.screen = 'worklist'; state.error = null; loadWorklist(container); return; }
        if (act === 'go-calendar')  { state.screen = 'calendar'; state.error = null; loadCalendar(container); return; }
        if (act === 'go-create')    { state.screen = 'create'; state.wizardStep = 0; state.wizardData = {}; renderInto(container); return; }
        if (act === 'go-analytics') { state.screen = 'analytics'; loadMetrics(container); return; }
        if (act === 'retry')        { state.error = null; loadWorklist(container); return; }
        if (act === 'retry-detail') { state.error = null; loadDetail(container, state.recordId); return; }

        // Calendar navigation
        if (act === 'cal-prev') {
          state.calMonth--;
          if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
          loadCalendar(container);
          return;
        }
        if (act === 'cal-next') {
          state.calMonth++;
          if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
          loadCalendar(container);
          return;
        }
        if (act === 'cal-today') {
          var now = new Date();
          state.calYear = now.getFullYear();
          state.calMonth = now.getMonth();
          loadCalendar(container);
          return;
        }

        // Open audit from calendar
        if (act === 'open-audit') {
          var auditId = actionEl.getAttribute('data-id');
          if (auditId) {
            state.screen = 'detail';
            state.activeTab = 'summary';
            loadDetail(container, auditId);
          }
          return;
        }

        // Wizard
        if (act === 'wizard-next') {
          collectWizardFields(container);
          if (state.wizardStep < WIZARD_STEPS.length - 1) { state.wizardStep++; renderInto(container); }
          return;
        }
        if (act === 'wizard-back') {
          collectWizardFields(container);
          if (state.wizardStep > 0) { state.wizardStep--; renderInto(container); }
          return;
        }
        if (act === 'wizard-submit') {
          collectWizardFields(container);
          submitCreate(container);
          return;
        }
        if (act === 'wizard-save-draft') {
          collectWizardFields(container);
          return;
        }

        // Comments
        if (act === 'add-comment') {
          var textarea = container.querySelector('[data-field="new-comment"]');
          if (textarea && textarea.value.trim()) {
            api(state.recordId + '/comments', { text: textarea.value.trim() }).then(function() {
              loadDetail(container, state.recordId);
            });
          }
          return;
        }

        // Workflow actions
        var workflowActions = ['schedule', 'start', 'record-finding', 'issue-report', 'assign-response', 'close-finding', 'close-audit', 'cancel'];
        if (workflowActions.indexOf(act) !== -1) {
          executeAction(container, act);
          return;
        }

        // Export
        if (act === 'export') {
          var format = actionEl.getAttribute('data-format');
          if (state.screen === 'detail' && state.recordId) {
            api(state.recordId + '/export', { format: format });
          } else {
            api('export', { format: format, filters: state.filters });
          }
          return;
        }
      }

      // Tab switching
      if (tabEl) {
        state.activeTab = tabEl.getAttribute('data-tab');
        renderInto(container);
        return;
      }

      // Row click → detail
      if (rowEl && state.screen === 'worklist') {
        var id = rowEl.getAttribute('data-id');
        if (id) {
          state.screen = 'detail';
          state.activeTab = 'summary';
          loadDetail(container, id);
        }
        return;
      }

      // Sort
      if (sortEl && state.screen === 'worklist') {
        var key = sortEl.getAttribute('data-sort');
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
        }
        state.pagination.offset = 0;
        loadWorklist(container);
        return;
      }

      // Pagination
      if (pageEl) {
        var page = parseInt(pageEl.getAttribute('data-page'), 10);
        if (page > 0) {
          state.pagination.offset = (page - 1) * state.pagination.limit;
          loadWorklist(container);
        }
        return;
      }

      // Filters
      if (filterEl) {
        collectFilters(container);
        state.pagination.offset = 0;
        loadWorklist(container);
        return;
      }
      if (resetEl) {
        state.filters = {};
        state.pagination.offset = 0;
        loadWorklist(container);
        return;
      }
    });
  }

  function collectFilters(container) {
    var selects = container.querySelectorAll('[data-filter]');
    var filters = {};
    selects.forEach(function(el) {
      var key = el.getAttribute('data-filter');
      var val = el.value;
      if (val) filters[key] = val;
    });
    state.filters = filters;
  }

  function collectWizardFields(container) {
    var fields = container.querySelectorAll('[data-field]');
    fields.forEach(function(el) {
      var key = el.getAttribute('data-field');
      if (key && key !== 'new-comment') {
        state.wizardData[key] = el.value || '';
      }
    });
  }

  // =========================================================================
  // REGISTER
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['audits'] = {
    render: render,
    meta: MOD
  };

})();
