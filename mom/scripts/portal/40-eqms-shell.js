/**
 * EQMS Shell — World-Class Quality Management Hub
 * HESEM MOM Portal · 40-eqms-shell.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Provides: Module registry, navigation, 17 shared components
 * Load order: AFTER 00a-registry, 00b-theme, 00-block-engine
 */
(function() {
  'use strict';

  // =========================================================================
  // MODULE REGISTRY — All 22 EQMS modules
  // =========================================================================
  var MODULES = [
    // --- Quality Events ---
    { id: 'quality-tower',      label: { vi: 'Tháp chất lượng', en: 'Quality Control Tower' },       icon: '\u{1F3EF}', group: 'quality-events', archetype: 'control-tower' },
    { id: 'complaints',         label: { vi: 'Khiếu nại khách hàng', en: 'Customer Complaints' },    icon: '\u{1F4E2}', group: 'quality-events', archetype: 'exception-hub' },
    { id: 'deviations',         label: { vi: 'Sự kiện chất lượng', en: 'Deviations / Quality Events' }, icon: '\u26A0\uFE0F', group: 'quality-events', archetype: 'exception-hub' },
    { id: 'ncr',                label: { vi: 'NCR / MRB', en: 'NCR / MRB' },                         icon: '\u{1F6AB}', group: 'quality-events', archetype: 'exception-hub' },
    { id: 'capa',               label: { vi: 'CAPA', en: 'CAPA' },                                   icon: '\u{1F527}', group: 'quality-events', archetype: 'evidence-workspace' },

    // --- Documents & Change ---
    { id: 'change-control',     label: { vi: 'Kiểm soát thay đổi', en: 'Change Control' },           icon: '\u{1F504}', group: 'docs-change', archetype: 'evidence-workspace' },
    { id: 'engineering-change', label: { vi: 'Thay đổi kỹ thuật', en: 'Engineering Change' },        icon: '\u2699\uFE0F', group: 'docs-change', archetype: 'evidence-workspace' },
    { id: 'documents',          label: { vi: 'Kiểm soát tài liệu', en: 'Document Control' },         icon: '\u{1F4C4}', group: 'docs-change', archetype: 'evidence-workspace' },
    { id: 'training',           label: { vi: 'Đào tạo & Năng lực', en: 'Training & Competency' },    icon: '\u{1F393}', group: 'docs-change', archetype: 'list-report' },
    { id: 'audits',             label: { vi: 'Quản lý đánh giá', en: 'Audit Management' },           icon: '\u{1F50D}', group: 'docs-change', archetype: 'list-report' },

    // --- Supplier Quality ---
    { id: 'suppliers',          label: { vi: 'Mạng lưới nhà cung cấp', en: 'Supplier Quality Network' }, icon: '\u{1F310}', group: 'supplier', archetype: 'analytical-list' },
    { id: 'supplier-audits',    label: { vi: 'Đánh giá NCC & SCAR', en: 'Supplier Audits & SCAR' },  icon: '\u{1F4CB}', group: 'supplier', archetype: 'evidence-workspace' },

    // --- Risk & Compliance ---
    { id: 'risks',              label: { vi: 'Quản lý rủi ro & FMEA', en: 'Risk Management & FMEA' }, icon: '\u{1F6E1}\uFE0F', group: 'risk-compliance', archetype: 'analytical-list' },
    { id: 'calibration',        label: { vi: 'Hiệu chuẩn / MSA', en: 'Calibration / MSA' },          icon: '\u{1F4CF}', group: 'risk-compliance', archetype: 'evidence-workspace' },
    { id: 'lab-investigations', label: { vi: 'OOS/OOT / Điều tra', en: 'Lab Investigations' },        icon: '\u{1F52C}', group: 'risk-compliance', archetype: 'exception-hub' },

    // --- Inspection & Testing ---
    { id: 'inspection',         label: { vi: 'IQC / Kiểm tra', en: 'IQC / In-Process Inspection' },  icon: '\u2705', group: 'inspection', archetype: 'operator-execution' },
    { id: 'spc',                label: { vi: 'SPC Analytics', en: 'SPC Analytics' },                  icon: '\u{1F4C8}', group: 'inspection', archetype: 'analytical-list' },
    { id: 'batch-release',      label: { vi: 'Giải phóng lô', en: 'Batch Release' },                 icon: '\u{1F4E6}', group: 'inspection', archetype: 'approval-queue' },

    // --- Advanced ---
    { id: 'validation',         label: { vi: 'Quản lý xác nhận', en: 'Validation Management' },      icon: '\u{1F9EA}', group: 'advanced', archetype: 'evidence-workspace' },
    { id: 'field-actions',      label: { vi: 'Hành động thực địa', en: 'Field Actions / Recall' },    icon: '\u{1F6A8}', group: 'advanced', archetype: 'exception-hub' },
    { id: 'genealogy',          label: { vi: 'Truy xuất nguồn gốc', en: 'Genealogy / Traceability' }, icon: '\u{1F333}', group: 'advanced', archetype: 'object-page' },
    { id: 'quality-agreements', label: { vi: 'Thoả thuận chất lượng', en: 'Quality Agreements' },     icon: '\u{1F91D}', group: 'advanced', archetype: 'evidence-workspace' }
  ];

  var GROUPS = [
    { id: 'quality-events',   label: { vi: 'Sự kiện chất lượng', en: 'Quality Events' } },
    { id: 'docs-change',      label: { vi: 'Tài liệu & Thay đổi', en: 'Documents & Change' } },
    { id: 'supplier',         label: { vi: 'Chất lượng nhà cung cấp', en: 'Supplier Quality' } },
    { id: 'risk-compliance',  label: { vi: 'Rủi ro & Tuân thủ', en: 'Risk & Compliance' } },
    { id: 'inspection',       label: { vi: 'Kiểm tra & Thử nghiệm', en: 'Inspection & Testing' } },
    { id: 'advanced',         label: { vi: 'Nâng cao', en: 'Advanced' } }
  ];

  // =========================================================================
  // HELPERS
  // =========================================================================
  var _lang = function() { return (window.lang === 'en') ? 'en' : 'vi'; };
  var T = function(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[_lang()] || obj.en || obj.vi || '';
  };
  var esc = function(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };
  var fmt = function(n) { if (n == null) return '—'; return Number(n).toLocaleString(); };
  var fmtDate = function(d) {
    if (!d) return '—';
    try { var dt = new Date(d); return dt.toLocaleDateString(_lang() === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch(e) { return String(d); }
  };
  var fmtDateTime = function(d) {
    if (!d) return '—';
    try { var dt = new Date(d); return dt.toLocaleString(_lang() === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch(e) { return String(d); }
  };
  var slugify = function(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var initials = function(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };

  // API wrapper
  function apiCall(action, payload, method, timeout) {
    method = method || 'POST';
    var url = 'api.php?action=' + encodeURIComponent(action);
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (window.csrfToken) opts.headers['X-CSRF-Token'] = window.csrfToken;
    if (method !== 'GET' && payload) opts.body = JSON.stringify(payload);
    if (method === 'GET' && payload) {
      var qs = Object.keys(payload).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]); }).join('&');
      if (qs) url += '&' + qs;
    }
    return fetch(url, opts).then(function(r) { return r.json(); });
  }

  // =========================================================================
  // SHELL STATE
  // =========================================================================
  var shell = {
    container: null,
    activeModule: null,   // module id or null (landing)
    navCollapsed: false,
    mobileNavOpen: false,
    moduleContext: {}      // passed to active module render
  };

  // =========================================================================
  // SHARED COMPONENT 1: renderIdentityHeader
  // =========================================================================
  function renderIdentityHeader(record, config) {
    config = config || {};
    var statusClass = slugify(record.status || record.state || 'draft');
    var html = '<div class="eqms-identity-header">';
    html += '<div class="eqms-identity-row">';
    html += '<span class="eqms-identity-id">' + esc(record.record_id || record.id || '') + '</span>';
    if (record.title || record.description) {
      html += '<span class="eqms-identity-title">' + esc(record.title || record.description || '') + '</span>';
    }
    html += '<span class="eqms-badge ' + statusClass + '">' + esc(record.status_label || record.status || record.state || 'Draft') + '</span>';
    html += '<div class="eqms-identity-actions">';
    if (config.actions) {
      config.actions.forEach(function(a) {
        html += '<button class="eqms-btn ' + (a.style || 'secondary') + ' sm" data-action="' + esc(a.action) + '"';
        if (a.disabled) html += ' disabled';
        html += '>' + esc(T(a.label)) + '</button>';
      });
    }
    html += '</div></div>';
    // Meta row
    html += '<div class="eqms-identity-meta">';
    var metaFields = [
      { label: { vi: 'Chủ sở hữu', en: 'Owner' }, value: record.owner || record.assigned_to },
      { label: { vi: 'Tạo bởi', en: 'Created by' }, value: record.created_by },
      { label: { vi: 'Ngày tạo', en: 'Created' }, value: fmtDate(record.created_at) },
      { label: { vi: 'Cập nhật', en: 'Updated' }, value: fmtDate(record.updated_at) },
      { label: { vi: 'Phiên bản', en: 'Version' }, value: record.version },
      { label: { vi: 'Ưu tiên', en: 'Priority' }, value: record.priority },
      { label: { vi: 'Ngày hiệu lực', en: 'Effective' }, value: fmtDate(record.effective_date) }
    ];
    if (config.extraMeta) metaFields = metaFields.concat(config.extraMeta);
    metaFields.forEach(function(m) {
      if (m.value) {
        html += '<span class="eqms-identity-meta-item">';
        html += '<span class="eqms-identity-meta-label">' + esc(T(m.label)) + ':</span>';
        html += '<span class="eqms-identity-meta-value">' + esc(String(m.value)) + '</span>';
        html += '</span>';
      }
    });
    html += '</div></div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 2: renderStateTimeline
  // =========================================================================
  function renderStateTimeline(states, currentState) {
    if (!states || !states.length) return '';
    var currentIdx = states.indexOf(currentState);
    var html = '<div class="eqms-state-timeline">';
    states.forEach(function(s, i) {
      if (i > 0) {
        var connClass = (i <= currentIdx) ? 'completed' : '';
        html += '<span class="eqms-state-connector ' + connClass + '"></span>';
      }
      var dotClass = '';
      var labelClass = '';
      if (i < currentIdx) { dotClass = 'completed'; labelClass = 'completed'; }
      else if (i === currentIdx) { dotClass = 'current'; labelClass = 'current'; }
      if (s === 'voided' || s === 'cancelled') { dotClass = 'voided'; }
      var label = s.replace(/_/g, ' ').replace(/-/g, ' ');
      label = label.charAt(0).toUpperCase() + label.slice(1);
      html += '<span class="eqms-state-node">';
      html += '<span class="eqms-state-dot ' + dotClass + '"></span>';
      html += '<span class="eqms-state-label ' + labelClass + '">' + esc(label) + '</span>';
      html += '</span>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 3: renderAuditTrail
  // =========================================================================
  function renderAuditTrail(events) {
    if (!events || !events.length) {
      return renderEmptyState({ icon: '\u{1F4DC}', title: { vi: 'Chưa có sự kiện', en: 'No audit events' } });
    }
    var html = '<div class="eqms-audit-trail">';
    events.forEach(function(e) {
      html += '<div class="eqms-audit-event">';
      html += '<span class="eqms-audit-time">' + esc(fmtDateTime(e.timestamp || e.created_at)) + '</span>';
      html += '<span class="eqms-audit-user">' + esc(e.user || e.performed_by || '') + '</span>';
      html += '<span class="eqms-audit-action">';
      html += esc(e.action || e.event_type || '');
      if (e.field) {
        html += ' <span class="field-name">' + esc(e.field) + '</span>';
        if (e.previous != null) html += ': <span class="old-value">' + esc(String(e.previous)) + '</span>';
        if (e.current != null) html += ' \u2192 <span class="new-value">' + esc(String(e.current)) + '</span>';
      }
      if (e.reason) html += ' (' + esc(e.reason) + ')';
      html += '</span></div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 4: renderSignaturePanel
  // =========================================================================
  function renderSignaturePanel(signatures, requiredRoles) {
    signatures = signatures || [];
    requiredRoles = requiredRoles || [];
    var signedMap = {};
    signatures.forEach(function(s) { signedMap[s.role || s.meaning] = s; });
    var roles = requiredRoles.length ? requiredRoles : signatures.map(function(s) { return s.role || s.meaning; });
    if (!roles.length) roles = [{ vi: 'Phê duyệt', en: 'Approved' }, { vi: 'Xem xét', en: 'Reviewed' }];

    var html = '<div class="eqms-signature-panel">';
    roles.forEach(function(role) {
      var roleKey = typeof role === 'string' ? role : (role.en || role.vi);
      var sig = signedMap[roleKey];
      var signed = sig && sig.signer_name;
      html += '<div class="eqms-signature-block ' + (signed ? 'signed' : 'pending') + '">';
      html += '<div class="eqms-signature-meaning">' + esc(T(role)) + '</div>';
      if (signed) {
        html += '<div class="eqms-signature-name">' + esc(sig.signer_name) + '</div>';
        html += '<div class="eqms-signature-date">' + esc(fmtDateTime(sig.signed_at || sig.timestamp)) + '</div>';
      } else {
        html += '<div class="eqms-signature-name" style="color:var(--hm-text-tertiary,#94a3b8);font-style:italic">' + T({ vi: 'Chưa ký', en: 'Not signed' }) + '</div>';
        html += '<button class="eqms-btn primary sm eqms-sign-btn" data-action="sign" data-role="' + esc(roleKey) + '">' + T({ vi: 'Ký', en: 'Sign' }) + '</button>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 5: renderCommentsThread
  // =========================================================================
  function renderCommentsThread(comments, config) {
    config = config || {};
    var html = '<div class="eqms-comments">';
    if (!comments || !comments.length) {
      html += '<div class="eqms-empty-state" style="min-height:80px"><span>' + T({ vi: 'Chưa có bình luận', en: 'No comments yet' }) + '</span></div>';
    } else {
      comments.forEach(function(c) {
        html += '<div class="eqms-comment">';
        html += '<div class="eqms-comment-avatar">' + initials(c.author || c.user) + '</div>';
        html += '<div class="eqms-comment-body">';
        html += '<div class="eqms-comment-header">';
        html += '<span class="eqms-comment-author">' + esc(c.author || c.user) + '</span>';
        html += '<span class="eqms-comment-time">' + esc(fmtDateTime(c.created_at || c.timestamp)) + '</span>';
        html += '</div>';
        html += '<div class="eqms-comment-text">' + esc(c.text || c.content || c.body) + '</div>';
        html += '</div></div>';
      });
    }
    if (config.readonly !== true) {
      html += '<div class="eqms-comment-input">';
      html += '<textarea placeholder="' + T({ vi: 'Thêm bình luận...', en: 'Add a comment...' }) + '" data-field="new-comment"></textarea>';
      html += '<button class="eqms-btn primary sm" data-action="add-comment">' + T({ vi: 'Gửi', en: 'Post' }) + '</button>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 6: renderAttachmentsGrid
  // =========================================================================
  function renderAttachmentsGrid(attachments, config) {
    config = config || {};
    var fileIcons = { pdf: '\u{1F4D5}', xlsx: '\u{1F4CA}', xls: '\u{1F4CA}', doc: '\u{1F4DD}', docx: '\u{1F4DD}', jpg: '\u{1F5BC}\uFE0F', jpeg: '\u{1F5BC}\uFE0F', png: '\u{1F5BC}\uFE0F' };
    var html = '<div class="eqms-attachments">';
    if (attachments && attachments.length) {
      attachments.forEach(function(a) {
        var ext = (a.filename || '').split('.').pop().toLowerCase();
        var icon = fileIcons[ext] || '\u{1F4CE}';
        html += '<div class="eqms-attachment" data-action="open-attachment" data-id="' + esc(a.id || '') + '">';
        html += '<span class="eqms-attachment-icon">' + icon + '</span>';
        html += '<div class="eqms-attachment-info">';
        html += '<div class="eqms-attachment-name">' + esc(a.filename || a.name) + '</div>';
        html += '<div class="eqms-attachment-meta">' + esc(a.size || '') + (a.uploaded_by ? ' \u00B7 ' + esc(a.uploaded_by) : '') + '</div>';
        html += '</div></div>';
      });
    }
    if (config.readonly !== true) {
      html += '</div>';
      html += '<div class="eqms-dropzone" data-action="upload-attachment">';
      html += T({ vi: 'Kéo thả tệp vào đây hoặc nhấp để tải lên', en: 'Drag files here or click to upload' });
      html += '</div>';
    } else {
      if (!attachments || !attachments.length) {
        html += '<div class="eqms-empty-state" style="min-height:80px"><span>' + T({ vi: 'Không có tệp đính kèm', en: 'No attachments' }) + '</span></div>';
      }
      html += '</div>';
    }
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 7: renderRelationshipsPanel
  // =========================================================================
  function renderRelationshipsPanel(links, config) {
    config = config || {};
    var html = '<div class="eqms-relationships">';
    if (!links || !links.length) {
      html += renderEmptyState({ icon: '\u{1F517}', title: { vi: 'Chưa có liên kết', en: 'No linked records' } });
    } else {
      links.forEach(function(l) {
        html += '<div class="eqms-relationship" data-action="open-record" data-type="' + esc(l.type || l.entity_type || '') + '" data-id="' + esc(l.target_id || l.id || '') + '">';
        html += '<span class="eqms-relationship-type">' + esc(l.type || l.entity_type || '') + '</span>';
        html += '<span class="eqms-relationship-id">' + esc(l.target_id || l.record_id || l.id || '') + '</span>';
        html += '<span class="eqms-relationship-title">' + esc(l.title || l.description || '') + '</span>';
        if (l.status) html += '<span class="eqms-badge ' + slugify(l.status) + '" style="margin-left:auto">' + esc(l.status) + '</span>';
        html += '</div>';
      });
    }
    if (config.readonly !== true) {
      html += '<button class="eqms-btn ghost sm" data-action="link-record" style="margin-top:var(--eqms-gap-sm)">';
      html += '+ ' + T({ vi: 'Liên kết bản ghi', en: 'Link Record' });
      html += '</button>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 8: renderFilterBar
  // =========================================================================
  function renderFilterBar(filters, config) {
    config = config || {};
    var html = '<div class="eqms-filter-bar">';
    (config.fields || []).forEach(function(f) {
      html += '<div class="eqms-filter-group">';
      if (f.label) html += '<span class="eqms-filter-label">' + esc(T(f.label)) + '</span>';
      if (f.type === 'select') {
        html += '<select class="eqms-filter-select" data-filter="' + esc(f.key) + '">';
        html += '<option value="">' + T({ vi: 'Tất cả', en: 'All' }) + '</option>';
        (f.options || []).forEach(function(o) {
          var val = typeof o === 'string' ? o : (o.value || o.id);
          var lbl = typeof o === 'string' ? o : T(o.label || o);
          var sel = (filters[f.key] === val) ? ' selected' : '';
          html += '<option value="' + esc(val) + '"' + sel + '>' + esc(lbl) + '</option>';
        });
        html += '</select>';
      } else if (f.type === 'date') {
        html += '<input type="date" class="eqms-filter-input" data-filter="' + esc(f.key) + '" value="' + esc(filters[f.key] || '') + '" style="width:140px">';
      } else {
        html += '<input type="text" class="eqms-filter-input" data-filter="' + esc(f.key) + '" value="' + esc(filters[f.key] || '') + '" placeholder="' + esc(T(f.placeholder || { vi: 'Tìm kiếm...', en: 'Search...' })) + '" style="width:' + (f.width || '160px') + '">';
      }
      html += '</div>';
    });
    html += '<div class="eqms-filter-actions">';
    if (config.savedViews) {
      html += '<button class="eqms-btn ghost sm" data-action="saved-views">' + T({ vi: 'Chế độ xem', en: 'Views' }) + '</button>';
    }
    html += '<button class="eqms-btn ghost sm" data-action="reset-filters">' + T({ vi: 'Xoá bộ lọc', en: 'Clear' }) + '</button>';
    html += '<button class="eqms-btn secondary sm" data-action="apply-filters">' + T({ vi: 'Áp dụng', en: 'Apply' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 9: renderDataGrid
  // =========================================================================
  function renderDataGrid(columns, data, config) {
    config = config || {};
    var html = '<div class="eqms-grid-wrapper">';
    html += '<table class="eqms-grid">';
    html += '<thead><tr>';
    if (config.selectable) html += '<th style="width:32px"><input type="checkbox" data-action="select-all"></th>';
    columns.forEach(function(col) {
      var sorted = config.sortKey === col.key;
      var sortIcon = sorted ? (config.sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u25B4';
      html += '<th data-sort="' + esc(col.key) + '"' + (sorted ? ' class="sorted"' : '') + '>';
      html += esc(T(col.label));
      if (col.sortable !== false) html += ' <span class="sort-icon">' + sortIcon + '</span>';
      html += '</th>';
    });
    html += '</tr></thead><tbody>';
    if (!data || !data.length) {
      html += '<tr><td colspan="' + (columns.length + (config.selectable ? 1 : 0)) + '">';
      html += renderEmptyState({ icon: '\u{1F4CB}', title: { vi: 'Không có dữ liệu', en: 'No records found' }, desc: { vi: 'Thử thay đổi bộ lọc', en: 'Try adjusting your filters' } });
      html += '</td></tr>';
    } else {
      data.forEach(function(row) {
        html += '<tr data-id="' + esc(row.id || row.record_id || '') + '">';
        if (config.selectable) html += '<td><input type="checkbox" data-action="select-row" data-id="' + esc(row.id || '') + '"></td>';
        columns.forEach(function(col) {
          var val = row[col.key];
          var cls = '';
          if (col.type === 'id') cls = 'eqms-cell-id';
          else if (col.type === 'date') cls = 'eqms-cell-date';
          else if (col.type === 'truncate') cls = 'eqms-cell-truncate';

          html += '<td' + (cls ? ' class="' + cls + '"' : '') + '>';
          if (col.type === 'badge') {
            html += '<span class="eqms-badge ' + slugify(val || '') + '">' + esc(val || '—') + '</span>';
          } else if (col.type === 'priority') {
            html += '<span class="eqms-priority-dot ' + slugify(val || '') + '"></span> ' + esc(val || '—');
          } else if (col.type === 'date') {
            html += esc(fmtDate(val));
          } else if (col.type === 'datetime') {
            html += esc(fmtDateTime(val));
          } else if (col.type === 'number') {
            html += fmt(val);
          } else if (col.render) {
            html += col.render(val, row);
          } else {
            html += esc(val != null ? String(val) : '—');
          }
          html += '</td>';
        });
        html += '</tr>';
      });
    }
    html += '</tbody></table></div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 10: renderKpiRow
  // =========================================================================
  function renderKpiRow(items) {
    if (!items || !items.length) return '';
    var html = '<div class="eqms-kpi-row">';
    items.forEach(function(kpi) {
      var accent = kpi.accent || '';
      html += '<div class="eqms-kpi-card ' + accent + '">';
      html += '<div class="eqms-kpi-label">' + esc(T(kpi.label)) + '</div>';
      html += '<div class="eqms-kpi-value">' + esc(kpi.value != null ? String(kpi.value) : '—') + '</div>';
      if (kpi.trend) {
        var trendClass = kpi.trend > 0 ? 'up' : (kpi.trend < 0 ? 'down' : 'neutral');
        var arrow = kpi.trend > 0 ? '\u2191' : (kpi.trend < 0 ? '\u2193' : '\u2192');
        html += '<div class="eqms-kpi-trend ' + trendClass + '">' + arrow + ' ' + esc(kpi.trendLabel || Math.abs(kpi.trend) + '%') + '</div>';
      }
      if (kpi.freshness) {
        html += '<div class="eqms-freshness ' + kpi.freshness + '"><span class="eqms-freshness-dot"></span>' + esc(kpi.freshness) + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 11: renderExportMenu
  // =========================================================================
  function renderExportMenu(options) {
    options = options || {};
    var formats = options.formats || ['pdf', 'excel', 'csv'];
    var html = '<div class="eqms-export-menu">';
    html += '<button class="eqms-btn secondary sm" data-action="toggle-export">\u{1F4E5} ' + T({ vi: 'Xuất', en: 'Export' }) + '</button>';
    html += '<div class="eqms-export-dropdown">';
    formats.forEach(function(f) {
      var labels = { pdf: 'PDF', excel: 'Excel (.xlsx)', csv: 'CSV', controlled: T({ vi: 'Bản kiểm soát', en: 'Controlled Copy' }) };
      var icons = { pdf: '\u{1F4D5}', excel: '\u{1F4CA}', csv: '\u{1F4C3}', controlled: '\u{1F512}' };
      html += '<div class="eqms-export-option" data-action="export" data-format="' + esc(f) + '">';
      html += '<span>' + (icons[f] || '\u{1F4E5}') + '</span>';
      html += '<span>' + esc(labels[f] || f) + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 12: renderEmptyState
  // =========================================================================
  function renderEmptyState(config) {
    config = config || {};
    var html = '<div class="eqms-empty-state">';
    if (config.icon) html += '<div class="eqms-empty-state-icon">' + config.icon + '</div>';
    if (config.title) html += '<div class="eqms-empty-state-title">' + esc(T(config.title)) + '</div>';
    if (config.desc) html += '<div class="eqms-empty-state-desc">' + esc(T(config.desc)) + '</div>';
    if (config.action) {
      html += '<button class="eqms-btn primary sm" data-action="' + esc(config.action.key || 'retry') + '">' + esc(T(config.action.label)) + '</button>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 13: renderLoadingState
  // =========================================================================
  function renderLoadingState(message) {
    return '<div class="eqms-loading"><div class="eqms-spinner"></div>' +
      (message ? '<span style="margin-left:12px;font-size:13px;color:var(--hm-text-secondary)">' + esc(T(message)) + '</span>' : '') +
      '</div>';
  }

  // =========================================================================
  // SHARED COMPONENT 14: renderErrorState
  // =========================================================================
  function renderErrorState(error, retryAction) {
    var html = '<div class="eqms-error-state">';
    html += '<div class="eqms-error-state-icon">\u26A0\uFE0F</div>';
    html += '<div class="eqms-error-state-title">' + T({ vi: 'Đã xảy ra lỗi', en: 'An error occurred' }) + '</div>';
    html += '<div class="eqms-error-state-desc">' + esc(typeof error === 'string' ? error : (error && error.message) || 'Unknown error') + '</div>';
    if (retryAction) {
      html += '<button class="eqms-btn primary sm" data-action="' + esc(retryAction) + '">' + T({ vi: 'Thử lại', en: 'Retry' }) + '</button>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 15: renderWizardShell
  // =========================================================================
  function renderWizardShell(steps, currentStep, bodyHtml, config) {
    config = config || {};
    var html = '<div class="eqms-wizard">';
    // Step header
    html += '<div class="eqms-wizard-header">';
    steps.forEach(function(s, i) {
      if (i > 0) {
        html += '<span class="eqms-wizard-connector ' + (i <= currentStep ? 'completed' : '') + '"></span>';
      }
      var cls = i < currentStep ? 'completed' : (i === currentStep ? 'current' : '');
      html += '<span class="eqms-wizard-step ' + cls + '">';
      html += '<span class="eqms-wizard-step-number">' + (i < currentStep ? '\u2713' : (i + 1)) + '</span>';
      html += '<span class="eqms-wizard-step-label">' + esc(T(s.label || s)) + '</span>';
      html += '</span>';
    });
    html += '</div>';
    // Body
    html += '<div class="eqms-wizard-body">' + (bodyHtml || '') + '</div>';
    // Footer
    html += '<div class="eqms-wizard-footer">';
    html += '<button class="eqms-btn secondary" data-action="wizard-back"' + (currentStep === 0 ? ' disabled' : '') + '>' + T({ vi: 'Quay lại', en: 'Back' }) + '</button>';
    html += '<div style="display:flex;gap:8px">';
    if (config.saveDraft) {
      html += '<button class="eqms-btn ghost" data-action="wizard-save-draft">' + T({ vi: 'Lưu nháp', en: 'Save Draft' }) + '</button>';
    }
    if (currentStep === steps.length - 1) {
      html += '<button class="eqms-btn primary" data-action="wizard-submit">' + T({ vi: 'Gửi', en: 'Submit' }) + '</button>';
    } else {
      html += '<button class="eqms-btn primary" data-action="wizard-next">' + T({ vi: 'Tiếp theo', en: 'Next' }) + '</button>';
    }
    html += '</div></div></div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 16: renderTabs
  // =========================================================================
  function renderTabs(tabs, activeTab) {
    var html = '<div class="eqms-tabs">';
    tabs.forEach(function(tab) {
      var id = tab.id || tab;
      var label = tab.label || tab;
      var badge = tab.badge;
      html += '<div class="eqms-tab ' + (id === activeTab ? 'active' : '') + '" data-tab="' + esc(id) + '">';
      html += esc(T(label));
      if (badge != null) html += '<span class="eqms-tab-badge">' + esc(String(badge)) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED COMPONENT 17: renderChartWithTableFallback
  // =========================================================================
  function renderChartWithTableFallback(chartId, chartRenderFn, tableColumns, tableData, config) {
    config = config || {};
    var mode = config.defaultMode || 'chart';
    var html = '<div class="eqms-chart-container" data-chart-id="' + esc(chartId) + '">';
    html += '<div class="eqms-chart-toggle">';
    html += '<button class="eqms-chart-toggle-btn ' + (mode === 'chart' ? 'active' : '') + '" data-action="chart-mode" data-mode="chart">\u{1F4CA}</button>';
    html += '<button class="eqms-chart-toggle-btn ' + (mode === 'table' ? 'active' : '') + '" data-action="chart-mode" data-mode="table">\u{1F4CB}</button>';
    html += '</div>';
    html += '<div class="eqms-chart-view" style="' + (mode === 'chart' ? '' : 'display:none') + '">';
    html += '<div id="' + esc(chartId) + '" style="width:100%;min-height:280px"></div>';
    html += '</div>';
    html += '<div class="eqms-table-view" style="' + (mode === 'table' ? '' : 'display:none') + '">';
    html += renderDataGrid(tableColumns || [], tableData || [], { selectable: false });
    html += '</div></div>';
    return html;
  }

  // =========================================================================
  // SHARED: Pagination renderer
  // =========================================================================
  function renderPagination(pagination) {
    if (!pagination || !pagination.total) return '';
    var pages = Math.ceil(pagination.total / (pagination.limit || 25));
    var current = Math.floor((pagination.offset || 0) / (pagination.limit || 25)) + 1;
    var start = (pagination.offset || 0) + 1;
    var end = Math.min(start + (pagination.limit || 25) - 1, pagination.total);
    var html = '<div class="eqms-pagination">';
    html += '<span class="eqms-pagination-info">' + fmt(start) + '\u2013' + fmt(end) + ' / ' + fmt(pagination.total) + '</span>';
    html += '<div class="eqms-pagination-btns">';
    html += '<button class="eqms-pagination-btn" data-action="page" data-page="1"' + (current <= 1 ? ' disabled' : '') + '>\u00AB</button>';
    html += '<button class="eqms-pagination-btn" data-action="page" data-page="' + (current - 1) + '"' + (current <= 1 ? ' disabled' : '') + '>\u2039</button>';
    var startPage = Math.max(1, current - 2);
    var endPage = Math.min(pages, current + 2);
    for (var p = startPage; p <= endPage; p++) {
      html += '<button class="eqms-pagination-btn ' + (p === current ? 'active' : '') + '" data-action="page" data-page="' + p + '">' + p + '</button>';
    }
    html += '<button class="eqms-pagination-btn" data-action="page" data-page="' + (current + 1) + '"' + (current >= pages ? ' disabled' : '') + '>\u203A</button>';
    html += '<button class="eqms-pagination-btn" data-action="page" data-page="' + pages + '"' + (current >= pages ? ' disabled' : '') + '>\u00BB</button>';
    html += '</div></div>';
    return html;
  }

  // =========================================================================
  // SHARED: Section wrapper
  // =========================================================================
  function renderSection(title, bodyHtml, config) {
    config = config || {};
    var html = '<div class="eqms-section">';
    html += '<div class="eqms-section-header">';
    html += '<span>' + esc(T(title)) + '</span>';
    if (config.headerActions) html += '<div style="display:flex;gap:6px">' + config.headerActions + '</div>';
    html += '</div>';
    html += '<div class="eqms-section-body">' + (bodyHtml || '') + '</div>';
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED: Field grid for detail view
  // =========================================================================
  function renderFieldGrid(fields) {
    var html = '<div class="eqms-field-grid">';
    fields.forEach(function(f) {
      html += '<div class="eqms-field">';
      html += '<div class="eqms-field-label">' + esc(T(f.label)) + '</div>';
      var val = f.value;
      var cls = 'eqms-field-value';
      if (f.mono) cls += ' mono';
      if (val == null || val === '') { cls += ' empty'; val = '—'; }
      if (f.badge) {
        html += '<div class="' + cls + '"><span class="eqms-badge ' + slugify(String(val)) + '">' + esc(String(val)) + '</span></div>';
      } else {
        html += '<div class="' + cls + '">' + esc(String(val)) + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SHARED: Form group renderer
  // =========================================================================
  function renderFormField(field) {
    var html = '<div class="eqms-form-group">';
    html += '<label class="eqms-form-label">' + esc(T(field.label));
    if (field.required) html += '<span class="required">*</span>';
    html += '</label>';
    if (field.type === 'select') {
      html += '<select class="eqms-form-select" data-field="' + esc(field.key) + '"' + (field.required ? ' required' : '') + '>';
      html += '<option value="">' + T({ vi: 'Chọn...', en: 'Select...' }) + '</option>';
      (field.options || []).forEach(function(o) {
        var val = typeof o === 'string' ? o : (o.value || o.id);
        var lbl = typeof o === 'string' ? o : T(o.label || o);
        var sel = field.value === val ? ' selected' : '';
        html += '<option value="' + esc(val) + '"' + sel + '>' + esc(lbl) + '</option>';
      });
      html += '</select>';
    } else if (field.type === 'textarea') {
      html += '<textarea class="eqms-form-textarea" data-field="' + esc(field.key) + '" placeholder="' + esc(T(field.placeholder || '')) + '"' + (field.required ? ' required' : '') + '>' + esc(field.value || '') + '</textarea>';
    } else if (field.type === 'date') {
      html += '<input type="date" class="eqms-form-input" data-field="' + esc(field.key) + '" value="' + esc(field.value || '') + '"' + (field.required ? ' required' : '') + '>';
    } else if (field.type === 'number') {
      html += '<input type="number" class="eqms-form-input" data-field="' + esc(field.key) + '" value="' + esc(field.value || '') + '"' + (field.min != null ? ' min="' + field.min + '"' : '') + (field.max != null ? ' max="' + field.max + '"' : '') + (field.required ? ' required' : '') + '>';
    } else {
      html += '<input type="' + (field.type || 'text') + '" class="eqms-form-input" data-field="' + esc(field.key) + '" value="' + esc(field.value || '') + '" placeholder="' + esc(T(field.placeholder || '')) + '"' + (field.required ? ' required' : '') + '>';
    }
    if (field.error) html += '<div class="eqms-form-error">' + esc(T(field.error)) + '</div>';
    if (field.hint) html += '<div class="eqms-form-hint">' + esc(T(field.hint)) + '</div>';
    html += '</div>';
    return html;
  }

  // =========================================================================
  // NAVIGATION RENDERING
  // =========================================================================
  function renderNav() {
    var html = '<div class="eqms-nav-header">';
    html += '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7 3.5v7.64l-7 3.5-7-3.5V7.68l7-3.5z"/></svg>';
    html += '<span>EQMS Suite</span>';
    html += '</div>';
    GROUPS.forEach(function(g) {
      html += '<div class="eqms-nav-group">';
      html += '<div class="eqms-nav-group-label">' + esc(T(g.label)) + '</div>';
      MODULES.filter(function(m) { return m.group === g.id; }).forEach(function(m) {
        var active = shell.activeModule === m.id;
        html += '<div class="eqms-nav-item ' + (active ? 'active' : '') + '" data-module="' + esc(m.id) + '">';
        html += '<span class="eqms-nav-item-icon">' + m.icon + '</span>';
        html += '<span>' + esc(T(m.label)) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '<div class="eqms-nav-toggle" data-action="toggle-nav">';
    html += shell.navCollapsed ? '\u276F' : '\u276E';
    html += '</div>';
    return html;
  }

  // =========================================================================
  // LANDING PAGE
  // =========================================================================
  function renderLanding() {
    var html = '<div class="eqms-landing">';
    html += '<div class="eqms-landing-title">' + T({ vi: 'Hệ thống Quản lý Chất lượng Doanh nghiệp', en: 'Enterprise Quality Management System' }) + '</div>';
    html += '<div class="eqms-landing-subtitle">' + T({ vi: 'Quản lý toàn diện chất lượng sản phẩm, quy trình và nhà cung cấp theo tiêu chuẩn ISO 9001, AS9100D, 21 CFR Part 11', en: 'Comprehensive quality management for products, processes and suppliers — ISO 9001, AS9100D, 21 CFR Part 11' }) + '</div>';
    GROUPS.forEach(function(g) {
      var groupModules = MODULES.filter(function(m) { return m.group === g.id; });
      html += '<div class="eqms-category-title">' + esc(T(g.label)) + '</div>';
      html += '<div class="eqms-module-cards">';
      groupModules.forEach(function(m) {
        html += '<div class="eqms-module-card" data-module="' + esc(m.id) + '">';
        html += '<div class="eqms-module-card-header">';
        html += '<div class="eqms-module-card-icon">' + m.icon + '</div>';
        html += '<div class="eqms-module-card-title">' + esc(T(m.label)) + '</div>';
        html += '</div>';
        html += '<div class="eqms-module-card-desc">' + esc(getModuleDescription(m.id)) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function getModuleDescription(id) {
    var descs = {
      'quality-tower':      T({ vi: 'Tổng quan KPI chất lượng, hàng đợi sự kiện, xu hướng', en: 'Quality KPI overview, event queue, trends' }),
      'complaints':         T({ vi: 'Tiếp nhận, điều tra, phản hồi khiếu nại khách hàng', en: 'Intake, investigate, respond to customer complaints' }),
      'deviations':         T({ vi: 'Quản lý sự kiện chất lượng và sai lệch', en: 'Quality event and deviation management' }),
      'ncr':                T({ vi: 'Báo cáo không phù hợp, MRB, xử lý', en: 'Nonconformance reports, MRB, disposition' }),
      'capa':               T({ vi: 'Hành động khắc phục và phòng ngừa', en: 'Corrective and preventive actions' }),
      'change-control':     T({ vi: 'Kiểm soát thay đổi quy trình, sản phẩm, tài liệu', en: 'Process, product, document change control' }),
      'engineering-change': T({ vi: 'ECO/ECR, thay đổi thiết kế kỹ thuật', en: 'ECO/ECR, engineering design changes' }),
      'documents':          T({ vi: 'Tài liệu kiểm soát, SOP, bản sao, xác nhận', en: 'Controlled documents, SOPs, copies, acknowledgements' }),
      'training':           T({ vi: 'Ma trận đào tạo, năng lực, đánh giá hiệu quả', en: 'Training matrix, competency, effectiveness' }),
      'audits':             T({ vi: 'Lịch đánh giá, checklist, phát hiện, đóng', en: 'Audit schedule, checklists, findings, closure' }),
      'suppliers':          T({ vi: 'Hồ sơ NCC, thẻ điểm, đánh giá, thoả thuận', en: 'Supplier profiles, scorecards, qualifications, agreements' }),
      'supplier-audits':    T({ vi: 'Đánh giá nhà cung cấp và SCAR', en: 'Supplier audits and SCAR' }),
      'risks':              T({ vi: 'Sổ rủi ro, bản đồ nhiệt, FMEA, kiểm soát', en: 'Risk register, heatmap, FMEA, controls' }),
      'calibration':        T({ vi: 'Hiệu chuẩn, MSA, Gauge R&R, OOT', en: 'Calibration, MSA, Gauge R&R, OOT' }),
      'lab-investigations': T({ vi: 'Điều tra OOS/OOT, pha 1 & 2, CAPA', en: 'OOS/OOT investigation, phase 1 & 2, CAPA linkage' }),
      'inspection':         T({ vi: 'IQC, kiểm tra trong quá trình, quét barcode', en: 'IQC, in-process inspection, barcode scan' }),
      'spc':                T({ vi: 'Biểu đồ kiểm soát, Cp/Cpk, vi phạm quy tắc', en: 'Control charts, Cp/Cpk, rule violations' }),
      'batch-release':      T({ vi: 'Gói giải phóng lô, ngoại lệ, quyết định thị trường', en: 'Batch release package, exceptions, market-ship decision' }),
      'validation':         T({ vi: 'Dự án xác nhận IQ/OQ/PQ/CSV, ma trận truy xuất', en: 'Validation projects IQ/OQ/PQ/CSV, trace matrix' }),
      'field-actions':      T({ vi: 'Thu hồi, hành động thực địa, giám sát sản phẩm', en: 'Recall, field actions, product surveillance' }),
      'genealogy':          T({ vi: 'Đồ thị phả hệ, truy xuất ngược/xuôi', en: 'Genealogy graph, upstream/downstream traceability' }),
      'quality-agreements': T({ vi: 'Thoả thuận chất lượng, hợp tác đối tác', en: 'Quality agreements, partner collaboration' })
    };
    return descs[id] || '';
  }

  // =========================================================================
  // BREADCRUMB
  // =========================================================================
  function renderBreadcrumb() {
    var html = '<div class="eqms-breadcrumb">';
    html += '<a data-action="go-home">EQMS</a>';
    if (shell.activeModule) {
      var mod = MODULES.find(function(m) { return m.id === shell.activeModule; });
      html += '<span class="eqms-breadcrumb-sep">/</span>';
      html += '<a data-module="' + esc(shell.activeModule) + '">' + esc(mod ? T(mod.label) : shell.activeModule) + '</a>';
      if (shell.moduleContext && shell.moduleContext.recordId) {
        html += '<span class="eqms-breadcrumb-sep">/</span>';
        html += '<span>' + esc(shell.moduleContext.recordId) + '</span>';
      }
    }
    html += '</div>';
    return html;
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  function render(container) {
    shell.container = container;
    var html = '<div class="eqms-shell">';
    // Nav sidebar
    html += '<nav class="eqms-nav ' + (shell.navCollapsed ? 'collapsed' : '') + (shell.mobileNavOpen ? ' open' : '') + '">';
    html += renderNav();
    html += '</nav>';
    if (shell.mobileNavOpen) html += '<div class="eqms-nav-backdrop" data-action="close-nav"></div>';
    // Content
    html += '<div class="eqms-content">';
    html += renderBreadcrumb();
    html += '<div class="eqms-module-content">';
    if (shell.activeModule) {
      var mod = window.EqmsModules && window.EqmsModules[shell.activeModule];
      if (mod && mod.render) {
        html += '<div id="eqms-active-module"></div>';
      } else {
        html += renderEmptyState({
          icon: '\u{1F6A7}',
          title: { vi: 'Module đang được xây dựng', en: 'Module under construction' },
          desc: { vi: 'Module ' + shell.activeModule + ' sẽ sớm có', en: 'Module ' + shell.activeModule + ' coming soon' }
        });
      }
    } else {
      html += renderLanding();
    }
    html += '</div></div></div>';
    container.innerHTML = html;

    // If active module, render into its container
    if (shell.activeModule) {
      var modContainer = container.querySelector('#eqms-active-module');
      var mod = window.EqmsModules && window.EqmsModules[shell.activeModule];
      if (mod && mod.render && modContainer) {
        mod.render(modContainer, shell.moduleContext);
      }
    }

    // Bind events
    bindShellEvents(container);
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindShellEvents(container) {
    container.addEventListener('click', function(e) {
      var target = e.target.closest('[data-module]');
      if (target) {
        e.preventDefault();
        navigateToModule(target.getAttribute('data-module'));
        return;
      }
      var action = e.target.closest('[data-action]');
      if (action) {
        var act = action.getAttribute('data-action');
        if (act === 'go-home') { navigateToModule(null); }
        else if (act === 'toggle-nav') { shell.navCollapsed = !shell.navCollapsed; render(shell.container); }
        else if (act === 'close-nav') { shell.mobileNavOpen = false; render(shell.container); }
        else if (act === 'toggle-export') {
          var dd = action.closest('.eqms-export-menu');
          if (dd) { var dropdown = dd.querySelector('.eqms-export-dropdown'); if (dropdown) dropdown.classList.toggle('open'); }
        }
        else if (act === 'chart-mode') {
          var mode = action.getAttribute('data-mode');
          var chartContainer = action.closest('.eqms-chart-container');
          if (chartContainer) {
            chartContainer.querySelectorAll('.eqms-chart-toggle-btn').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-mode') === mode); });
            var cv = chartContainer.querySelector('.eqms-chart-view');
            var tv = chartContainer.querySelector('.eqms-table-view');
            if (cv) cv.style.display = mode === 'chart' ? '' : 'none';
            if (tv) tv.style.display = mode === 'table' ? '' : 'none';
          }
        }
      }
    });
  }

  function navigateToModule(moduleId, context) {
    shell.activeModule = moduleId;
    shell.moduleContext = context || {};
    if (shell.container) render(shell.container);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsShell = {
    render: render,
    navigate: navigateToModule,
    modules: MODULES,
    groups: GROUPS,
    // Shared components for use by child modules
    ui: {
      renderIdentityHeader: renderIdentityHeader,
      renderStateTimeline: renderStateTimeline,
      renderAuditTrail: renderAuditTrail,
      renderSignaturePanel: renderSignaturePanel,
      renderCommentsThread: renderCommentsThread,
      renderAttachmentsGrid: renderAttachmentsGrid,
      renderRelationshipsPanel: renderRelationshipsPanel,
      renderFilterBar: renderFilterBar,
      renderDataGrid: renderDataGrid,
      renderKpiRow: renderKpiRow,
      renderExportMenu: renderExportMenu,
      renderEmptyState: renderEmptyState,
      renderLoadingState: renderLoadingState,
      renderErrorState: renderErrorState,
      renderWizardShell: renderWizardShell,
      renderTabs: renderTabs,
      renderChartWithTableFallback: renderChartWithTableFallback,
      renderPagination: renderPagination,
      renderSection: renderSection,
      renderFieldGrid: renderFieldGrid,
      renderFormField: renderFormField,
      renderBreadcrumb: renderBreadcrumb
    },
    // Utility functions for use by child modules
    util: {
      T: T,
      esc: esc,
      fmt: fmt,
      fmtDate: fmtDate,
      fmtDateTime: fmtDateTime,
      slugify: slugify,
      initials: initials,
      apiCall: apiCall,
      lang: _lang
    }
  };

  // Register with portal router
  window._renderEqmsSuite = render;
})();
